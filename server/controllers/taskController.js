const mongoose = require('mongoose')
const Task = require('../models/Task')
const BoardMember = require('../models/BoardMember')

// Match the field names expected by the existing frontend.
function formatTask(task) {
  const data = task.toObject()

  data._id = String(data._id)
  data.page = String(data.board)
  delete data.board

  data.assignee = data.assignee ? String(data.assignee) : ''
  data.createdBy = String(data.createdBy)

  return data
}

function todayString() {
  // Use the same project timezone for completion dates.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

async function createTask(req, res, next) {
  const body = req.body || {}

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({
      message: 'Task title is required.',
    })
  }

  const fields = [
    'description',
    'status',
    'priority',
    'dueDate',
    'dueTime',
    'reminder',
    'reminderDate',
    'reminderTime',
  ]

  const changes = {}

  for (const field of fields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        return res.status(400).json({
          message: `${field} must be text.`,
        })
      }

      changes[field] = body[field]
    }
  }

  const assignee = body.assignee ?? ''

  if (
    assignee !== '' &&
    !mongoose.isObjectIdOrHexString(assignee)
  ) {
    return res.status(400).json({
      message: 'Invalid assignee ID.',
    })
  }

  try {
    if (
      assignee !== '' &&
      String(assignee) !== String(req.board.owner)
    ) {
      // Private boards can only assign tasks to their owner.
      if (req.board.type !== 'shared') {
        return res.status(400).json({
          message: 'Assignee must have access to this board.',
        })
      }

      const member = await BoardMember.exists({
        board: req.board._id,
        user: assignee,
        role: { $in: ['editor', 'viewer'] },
      })

      if (!member) {
        return res.status(400).json({
          message: 'Assignee must be a board member.',
        })
      }
    }

    const task = new Task({
      ...changes,
      title: body.title.trim(),
      board: req.board._id,
      assignee: assignee || null,
      createdBy: req.user.id,
      completedAt: changes.status === 'done' ? todayString() : '',
    })

    // Validate dates, times, status, and priority first.
    await task.validate()

    if (task.dueTime && !task.dueDate) {
      return res.status(400).json({
        message: 'A due time requires a due date.',
      })
    }

    if (
      task.reminder === 'custom' &&
      (!task.reminderDate || !task.reminderTime)
    ) {
      return res.status(400).json({
        message: 'Custom reminders require a date and time.',
      })
    }

    if (
      !['none', 'custom'].includes(task.reminder) &&
      !task.dueDate
    ) {
      return res.status(400).json({
        message: 'This reminder requires a due date.',
      })
    }

    await task.save()

    return res.status(201).json(formatTask(task))
  } catch (error) {
    return next(error)
  }
}

async function getTasks(req, res, next) {
  try {
    const tasks = await Task.find({
      board: req.board._id,
    }).sort({ createdAt: -1 })

    return res.json(tasks.map(formatTask))
  } catch (error) {
    return next(error)
  }
}

async function updateTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' })
  }

  const body = req.body || {}
  const fields = ['title', 'description', 'status', 'priority', 'dueDate',
    'dueTime', 'reminder', 'reminderDate', 'reminderTime']
  const changes = {}
  for (const field of fields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        return res.status(400).json({ message: `${field} must be text.` })
      }
      changes[field] = field === 'title' ? body[field].trim() : body[field]
    }
  }
  if (body.assignee !== undefined) {
    if (body.assignee !== '' && !mongoose.isObjectIdOrHexString(body.assignee)) {
      return res.status(400).json({ message: 'Invalid assignee ID.' })
    }
    changes.assignee = body.assignee || null
  }
  if (!Object.keys(changes).length) {
    return res.status(400).json({ message: 'Provide at least one editable task field.' })
  }

  try {
    // Scope the lookup to the authorized board, never just the task ID.
    const task = await Task.findOne({ _id: req.params.taskId, board: req.board._id })
    if (!task) return res.status(404).json({ message: 'Task not found.' })

    if (changes.assignee && String(changes.assignee) !== String(req.board.owner)) {
      const member = req.board.type === 'shared' && await BoardMember.exists({
        board: req.board._id,
        user: changes.assignee,
        role: { $in: ['editor', 'viewer'] },
      })
      if (!member) {
        return res.status(400).json({ message: 'Assignee must have access to this board.' })
      }
    }

    task.set(changes)
    task.completedAt = task.status === 'done' ? (task.completedAt || todayString()) : ''
    await task.validate()

    if (task.dueTime && !task.dueDate) {
      return res.status(400).json({ message: 'A due time requires a due date.' })
    }
    if (task.reminder === 'custom' && (!task.reminderDate || !task.reminderTime)) {
      return res.status(400).json({ message: 'Custom reminders require a date and time.' })
    }
    if (!['none', 'custom'].includes(task.reminder) && !task.dueDate) {
      return res.status(400).json({ message: 'This reminder requires a due date.' })
    }

    await task.save()
    return res.json(formatTask(task))
  } catch (error) {
    return next(error)
  }
}

async function deleteTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' })
  }
  try {
    const result = await Task.deleteOne({ _id: req.params.taskId, board: req.board._id })
    if (!result.deletedCount) return res.status(404).json({ message: 'Task not found.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
}
