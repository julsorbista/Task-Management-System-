const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Task = require('../models/Task')

function validDate(value) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function csvCell(value) {
  let text = String(value ?? '')
                                                                  
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

async function exportTasks(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.user?.id)) {
    return res.status(401).json({ message: 'Please log in.' })
  }
  const {
    format = 'csv', scope = 'both', mode = 'all',
    dateFrom = '', dateTo = '', taskIds = '',
  } = req.query

  if (![format, scope, mode, dateFrom, dateTo, taskIds].every((value) => typeof value === 'string')) {
    return res.status(400).json({ message: 'Export options must be text values.' })
  }
  if (format !== 'csv' || !['both', 'private', 'shared'].includes(scope) || !['all', 'selected'].includes(mode)) {
    return res.status(400).json({ message: 'Invalid export format, scope, or mode.' })
  }
  if (!validDate(dateFrom) || !validDate(dateTo) || (dateFrom && dateTo && dateFrom > dateTo)) {
    return res.status(400).json({ message: 'Provide a valid due date range using YYYY-MM-DD.' })
  }

  const selectedIds = taskIds ? taskIds.split(',').map((id) => id.trim()) : []
  if (mode === 'selected' && (!selectedIds.length || !selectedIds.every((id) => mongoose.isObjectIdOrHexString(id)))) {
    return res.status(400).json({ message: 'Selected export requires valid comma-separated task IDs.' })
  }

  try {
    const memberships = await BoardMember.find({
      user: req.user.id, role: { $in: ['editor', 'viewer'] },
    }).select('board').lean()
    const boardQuery = {
      $or: [
        { owner: req.user.id },
        { type: 'shared', _id: { $in: memberships.map((member) => member.board) } },
      ],
    }
    if (scope !== 'both') boardQuery.type = scope
    const boards = await Board.find(boardQuery).select('_id name type').lean()
    const query = { board: { $in: boards.map((board) => board._id) } }
    if (mode === 'selected') query._id = { $in: selectedIds }
    if (dateFrom || dateTo) {
      query.dueDate = { $ne: '' }
      if (dateFrom) query.dueDate.$gte = dateFrom
      if (dateTo) query.dueDate.$lte = dateTo
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean()
    const boardMap = new Map(boards.map((board) => [String(board._id), board]))
    const priorities = { high: 'High', medium: 'Medium', low: 'Low' }
    const statuses = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' }
    const rows = [['Title', 'Description', 'Due date', 'Due time', 'Priority', 'Status', 'Page', 'Scope', 'Assignee ID']]
    for (const task of tasks) {
      const board = boardMap.get(String(task.board))
      rows.push([
        task.title, task.description, task.dueDate, task.dueTime,
        priorities[task.priority], statuses[task.status], board.name,
        board.type === 'shared' ? 'Shared' : 'Private',
        task.assignee ? String(task.assignee) : '',
      ])
    }

    const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
    res.set('Cache-Control', 'no-store')
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', 'attachment; filename="morrow-tasks.csv"')
    return res.send(csv)
  } catch (error) {
    return next(error)
  }
}

module.exports = { exportTasks }
