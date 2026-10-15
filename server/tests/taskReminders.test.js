const test = require('node:test')
const assert = require('node:assert/strict')
const { reminderAt, deliverTaskReminders } = require('../utils/taskReminders')
const Task = require('../models/Task')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Notification = require('../models/Notification')

test('reminders use Manila time, all offsets, default 9 AM, and custom schedules', () => {
  const task = { status: 'todo', dueDate: '2026-10-16', dueTime: '00:05' }
  const expected = {
    'at-time': '2026-10-15T16:05:00.000Z',
    '10-min': '2026-10-15T15:55:00.000Z',
    '1-hour': '2026-10-15T15:05:00.000Z',
    '1-day': '2026-10-14T16:05:00.000Z',
  }
  for (const [reminder, iso] of Object.entries(expected)) {
    assert.equal(reminderAt({ ...task, reminder }).toISOString(), iso)
  }
  assert.equal(reminderAt({ ...task, dueTime: '', reminder: '1-hour' }).toISOString(), '2026-10-16T00:00:00.000Z')
  assert.equal(reminderAt({ reminder: 'custom', reminderDate: '2026-10-15', reminderTime: '14:30' }).toISOString(), '2026-10-15T06:30:00.000Z')
  for (const value of [
    { ...task, reminder: 'none' }, { ...task, reminder: '10-min', status: 'done' },
    { reminder: '10-min' }, { reminder: 'custom', reminderDate: '2026-10-15' },
  ]) assert.equal(reminderAt(value), null)
})

test('notification refresh delivers once, catches up offline, reschedules, and retries failed writes', async t => {
  const query = data => ({ select() { return this }, lean: async () => data })
  const task = {
    _id: 'task', board: 'board', title: 'Report', createdBy: 'user', assignee: null,
    status: 'todo', reminder: '10-min', dueDate: '2026-10-15', dueTime: '15:00', deliveredReminders: [],
  }
  let hasAccess = true
  t.mock.method(BoardMember, 'find', filter => {
    assert.equal(filter.user, 'user')
    return query([])
  })
  t.mock.method(Board, 'find', filter => {
    assert.deepEqual(filter.$or[0], { owner: 'user' })
    return query(hasAccess ? [{ _id: 'board' }] : [])
  })
  t.mock.method(Task, 'find', filter => {
    assert.deepEqual(filter.board.$in, ['board'])
    assert.deepEqual(filter.$or, [{ assignee: 'user' }, { assignee: null, createdBy: 'user' }])
    assert.equal(filter.status.$ne, 'done')
    return query([task])
  })
  const notifications = new Map()
  let fail = false
  t.mock.method(Notification, 'updateOne', async (filter, update, options) => {
    if (fail) throw Error('write failed')
    assert.equal(options.upsert, true)
    if (!notifications.has(filter.reminderKey)) notifications.set(filter.reminderKey, update.$setOnInsert)
  })
  t.mock.method(Task, 'updateOne', async (filter, update) => {
    assert.equal(filter._id, task._id)
    task.deliveredReminders.push(update.$addToSet.deliveredReminders)
  })
  await deliverTaskReminders('user', new Date('2026-10-15T06:49:59Z'))
  assert.equal(notifications.size, 0)
  await deliverTaskReminders('user', new Date('2026-10-15T06:50:00Z'))
  assert.equal(notifications.size, 1)
  const notification = [...notifications.values()][0]
  assert.equal(notification.type, 'due-soon')
  assert.equal(notification.task, 'task')
  assert.equal(notification.page, 'board')
  await deliverTaskReminders('user', new Date('2026-10-15T06:51:00Z'))
  assert.equal(notifications.size, 1)
  notifications.clear()
  await deliverTaskReminders('user', new Date('2026-10-15T06:52:00Z'))
  assert.equal(notifications.size, 0)
  task.dueTime = '16:00'
  fail = true
  await assert.rejects(deliverTaskReminders('user', new Date('2026-10-15T09:00:00Z')), /write failed/)
  assert.equal(task.deliveredReminders.length, 1)
  fail = false
  await deliverTaskReminders('user', new Date('2026-10-15T09:00:00Z'))
  assert.equal([...notifications.values()][0].type, 'overdue')
  task.dueTime = '17:00'
  hasAccess = false
  await deliverTaskReminders('user', new Date('2026-10-15T10:00:00Z'))
  assert.equal(notifications.size, 1)
})
