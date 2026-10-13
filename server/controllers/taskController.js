const mongoose = require('mongoose')
const Task = require('../models/Task')
const BoardMember = require('../models/BoardMember')
const Notification = require('../models/Notification')

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

async function createAssignmentNotification(task, assignee, actingUserId) {
  if (!assignee || String(assignee) === String(actingUserId)) return

  await Notification.create({
    task: task._id,
    page: task.board,
    user: assignee,
    title: 'Task assigned',
    message: `You were assigned to "${task.title}".`,
    type: 'assigned',
  })
}

const editableFields = [
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'dueTime',
  'assignee',
  'reminder',
  'reminderDate',
  'reminderTime',
]

const ignoredUpdateFields = ['_id', 'page', 'completedAt']

function collectTaskChanges(body, res) {
  const changes = {}

  for (const field of Object.keys(body)) {
    if (ignoredUpdateFields.includes(field)) continue

    if (!editableFields.includes(field)) {
      res.status(400).json({
        message: `Cannot update ${field}.`,
      })
      return null
    }

    if (typeof body[field] !== 'string') {
      res.status(400).json({
        message: `${field} must be text.`,
      })
      return null
    }

    if (field === 'title') {
      if (!body.title.trim()) {
        res.status(400).json({
          message: 'Task title is required.',
        })
        return null
      }

      changes.title = body.title.trim()
    } else {
      changes[field] = body[field]
    }
  }

  return changes
}

async function validateAssignee(assignee, req, res) {
  if (assignee === undefined) return true

  if (
    assignee !== '' &&
    !mongoose.isObjectIdOrHexString(assignee)
  ) {
    res.status(400).json({
      message: 'Invalid assignee ID.',
    })
    return false
  }

  if (
    assignee !== '' &&
    String(assignee) !== String(req.board.owner)
  ) {
    // Private boards can only assign tasks to their owner.
    if (req.board.type !== 'shared') {
      res.status(400).json({
        message: 'Assignee must have access to this board.',
      })
      return false
    }

    const member = await BoardMember.exists({
      board: req.board._id,
      user: assignee,
      role: { $in: ['editor', 'viewer'] },
    })

    if (!member) {
      res.status(400).json({
        message: 'Assignee must be a board member.',
      })
      return false
    }
  }

  return true
}

function validateTaskRules(task, res) {
  if (task.dueTime && !task.dueDate) {
    res.status(400).json({
      message: 'A due time requires a due date.',
    })
    return false
  }

  if (
    task.reminder === 'custom' &&
    (!task.reminderDate || !task.reminderTime)
  ) {
    res.status(400).json({
      message: 'Custom reminders require a date and time.',
    })
    return false
  }

  if (
    !['none', 'custom'].includes(task.reminder) &&
    !task.dueDate
  ) {
    res.status(400).json({
      message: 'This reminder requires a due date.',
    })
    return false
  }

  return true
}

async function createTask(req, res, next) {
  const body = req.body || {}

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({
      message: 'Task title is required.',
    })
  }

  const changes = {}

  for (const field of editableFields.filter((field) => field !== 'title' && field !== 'assignee')) {
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

  try {
    if (!(await validateAssignee(assignee, req, res))) return

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

    if (!validateTaskRules(task, res)) return

    await task.save()
    await createAssignmentNotification(task, assignee, req.user.id)

    return res.status(201).json(formatTask(task))
  } catch (error) {
    return next(error)
  }
}

async function updateTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({
      message: 'Invalid task ID.',
    })
  }

  const body = req.body || {}
  // Viewers can only tick or untick a task (the checkbox).
  // So the only fields they may send are status and completedAt.
  const isViewer = req.boardRole === 'viewer'
  const viewerFields = ['status', 'completedAt']
  const sentFields = Object.keys(body)
  const onlyStatus = body.status !== undefined && sentFields.every((field) => viewerFields.includes(field))
  if (isViewer && !onlyStatus) {
    return res.status(403).json({ message: 'You do not have permission for this action.' })
  }
  const changes = collectTaskChanges(body, res)

  if (!changes) return

  if (!Object.keys(changes).length) {
    return res.status(400).json({
      message: 'Submit at least one task field to update.',
    })
  }

  try {
    if (!(await validateAssignee(changes.assignee, req, res))) return

    const task = await Task.findOne({
      _id: req.params.taskId,
      board: req.board._id,
    })

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      })
    }

    // Viewers can only tick tasks that are unassigned or assigned to them.
    // The assignee may be just an id or a full (populated) user, so compare both as strings.
    if (isViewer && task.assignee) {
      const assigneeId = String(task.assignee?._id ?? task.assignee)
      const userId = String(req.user._id ?? req.user.id) // authenticate sets req.user.id
      if (assigneeId !== userId) {
        return res.status(403).json({ message: 'You do not have permission for this action.' })
      }
    }

    const previousAssignee = task.assignee ? String(task.assignee) : ''

    Object.assign(task, changes)

    if (changes.assignee !== undefined) {
      task.assignee = changes.assignee || null
    }

    if (changes.status !== undefined) {
      task.completedAt = task.status === 'done' ? task.completedAt || todayString() : ''
    }

    await task.validate()

    if (!validateTaskRules(task, res)) return

    await task.save()
    const newAssignee = task.assignee ? String(task.assignee) : ''

    if (
      changes.assignee !== undefined &&
      newAssignee &&
      newAssignee !== previousAssignee
    ) {
      await createAssignmentNotification(task, newAssignee, req.user.id)
    }

    return res.json(formatTask(task))
  } catch (error) {
    return next(error)
  }
}

async function deleteTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({
      message: 'Invalid task ID.',
    })
  }

  try {
    const result = await Task.deleteOne({
      _id: req.params.taskId,
      board: req.board._id,
    })

    if (!result.deletedCount) {
      return res.status(404).json({
        message: 'Task not found.',
      })
    }

    return res.status(204).end()
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

module.exports = {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
}
