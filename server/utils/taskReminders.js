const { createHash } = require('node:crypto')
const Task = require('../models/Task')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Notification = require('../models/Notification')

const offsets = { 'at-time': 0, '10-min': 10, '1-hour': 60, '1-day': 1440 }

function reminderAt(task) {
  if (task.status === 'done' || task.reminder === 'none') return null
  const custom = task.reminder === 'custom'
  if (!custom && !Object.hasOwn(offsets, task.reminder)) return null
  const date = custom ? task.reminderDate : task.dueDate
  const time = custom ? task.reminderTime : task.dueTime || '09:00'
  if (!date || !time) return null
  const timestamp = Date.parse(`${date}T${time}:00+08:00`) - (custom ? 0 : offsets[task.reminder] * 60000)
  return Number.isFinite(timestamp) ? new Date(timestamp) : null
}

async function deliverTaskReminders(userId, now = new Date()) {
  const memberships = await BoardMember.find({ user: userId, role: { $in: ['editor', 'viewer'] } }).select('board').lean()
  const boards = await Board.find({ $or: [
    { owner: userId },
    { type: 'shared', _id: { $in: memberships.map(member => member.board) } },
  ] }).select('_id').lean()
  if (!boards.length) return
  const tasks = await Task.find({
    board: { $in: boards.map(board => board._id) },
    status: { $ne: 'done' },
    reminder: { $in: [...Object.keys(offsets), 'custom'] },
    $or: [{ assignee: userId }, { assignee: null, createdBy: userId }],
  }).select('+deliveredReminders').lean()

  for (const task of tasks) {
    const scheduled = reminderAt(task)
    if (!scheduled || scheduled > now) continue
    const reminderKey = createHash('sha256').update(`${task._id}:${userId}:${scheduled.toISOString()}`).digest('hex')
    if (task.deliveredReminders?.includes(reminderKey)) continue
    const due = task.dueDate && new Date(`${task.dueDate}T${task.dueTime || '09:00'}:00+08:00`)
    const overdue = due && due < now
    const dueLabel = due && new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
    }).format(due)
    try {
      await Notification.updateOne({ reminderKey }, { $setOnInsert: {
        user: userId,
        task: task._id,
        page: task.board,
        title: overdue ? 'Task overdue' : 'Task reminder',
        message: dueLabel ? `"${task.title}" ${overdue ? 'was' : 'is'} due ${dueLabel}.` : `Reminder for "${task.title}".`,
        type: overdue ? 'overdue' : 'due-soon',
        reminderKey,
        isRead: false,
      } }, { upsert: true, runValidators: true })
    } catch (error) {
      if (error.code !== 11000) throw error
    }
    await Task.updateOne({ _id: task._id }, { $addToSet: { deliveredReminders: reminderKey } })
  }
}

module.exports = { reminderAt, deliverTaskReminders }
