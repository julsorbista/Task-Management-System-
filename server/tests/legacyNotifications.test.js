const test = require('node:test')
const assert = require('node:assert/strict')
const resolve = require('../utils/legacyNotificationDestination')

test('restores old task, board and invitation destinations only from unique exact matches', () => {
  const board = { _id: 'board-1', name: 'IT', owner: 'owner', accessible: true }
  const task = { _id: 'task-1', title: 'Collaboration Testing 1', board: board._id }
  const context = { boards: [board], tasks: [task] }
  const assigned = { type: 'assigned', message: 'You were assigned to "Collaboration Testing 1".' }
  const shared = { type: 'shared', message: 'You were invited to "IT".' }
  assert.deepEqual(resolve(assigned, context), { task: task._id, page: board._id })
  assert.deepEqual(resolve(shared, context), { page: board._id })
  assert.deepEqual(resolve({ type: 'shared', message: 'Julia accepted your invitation to "IT".' }, context), { page: board._id })
  assert.deepEqual(resolve(shared, { ...context, invitations: [{ _id: 'invite-1', board: board._id, invitedBy: board.owner }] }), { invitation: 'invite-1' })
  assert.equal(resolve(assigned, { ...context, tasks: [task, { ...task, _id: 'task-2' }] }), null)
  assert.equal(resolve(shared, { ...context, boards: [board, { ...board, _id: 'board-2' }] }), null)
  assert.equal(resolve(assigned, { ...context, tasks: [] }), null)
  assert.equal(resolve(shared, { ...context, boards: [{ ...board, accessible: false }] }), null)
  assert.equal(resolve({ ...assigned, task: 'existing-id' }, context), null)
})

test('repairs stored notifications within the recipient account and accessible boards', async (t) => {
  const mongoose = require('mongoose')
  const Board = require('../models/Board')
  const Member = require('../models/BoardMember')
  const Task = require('../models/Task')
  const User = require('../models/User')
  const Invitation = require('../models/BoardInvitation')
  const Notification = require('../models/Notification')
  const repair = require('../utils/repairLegacyNotifications')
  const userId = new mongoose.Types.ObjectId()
  const boardId = new mongoose.Types.ObjectId()
  const taskId = new mongoose.Types.ObjectId()
  const query = (data) => ({ select() { return this }, lean: async () => data })
  t.mock.method(Member, 'find', (filter) => { assert.equal(String(filter.user), String(userId)); return query([]) })
  t.mock.method(User, 'findById', () => query({ email: 'user@example.com' }))
  t.mock.method(Invitation, 'find', (filter) => { assert.equal(filter.email, 'user@example.com'); return query([]) })
  t.mock.method(Board, 'find', () => query([{ _id: boardId, owner: userId, name: 'IT', type: 'shared' }]))
  t.mock.method(Task, 'find', (filter) => {
    assert.deepEqual(filter.board.$in.map(String), [String(boardId)])
    return query([{ _id: taskId, board: boardId, title: 'Collaboration Testing 1' }])
  })
  let writes
  t.mock.method(Notification, 'bulkWrite', async (updates) => { writes = updates })
  const notification = new Notification({ user: userId, type: 'assigned', title: 'Task assigned', message: 'You were assigned to "Collaboration Testing 1".' })
  await repair([notification], userId)
  assert.equal(writes.length, 1)
  assert.equal(String(writes[0].updateOne.filter.user), String(userId))
  assert.equal(writes[0].updateOne.filter.page, null)
  assert.equal(String(notification.toObject().task), String(taskId))
  assert.equal(String(notification.toObject().page), String(boardId))
})
