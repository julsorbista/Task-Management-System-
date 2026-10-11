const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Task = require('../models/Task')

function todayInManila() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(day, offset) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

async function getDashboard(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.user?.id)) {
    return res.status(401).json({ message: 'Please log in.' })
  }

  try {
    const memberships = await BoardMember.find({
      user: req.user.id, role: { $in: ['editor', 'viewer'] },
    }).select('board').lean()

    const boards = await Board.find({
      $or: [
        { owner: req.user.id },
        { type: 'shared', _id: { $in: memberships.map((member) => member.board) } },
      ],
    }).select('_id name').lean()

    const tasks = await Task.find({ board: { $in: boards.map((board) => board._id) } })
      .select('board status priority dueDate completedAt').lean()

    const today = todayInManila()
    const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7))
    const weeks = []
    for (let weeksAgo = 5; weeksAgo >= 0; weeksAgo--) {
      const start = addDays(monday, -7 * weeksAgo)
      weeks.push({ start, end: addDays(start, 6), count: 0 })
    }

    const byStatus = { todo: 0, 'in-progress': 0, done: 0 }
    const byPriority = { high: 0, medium: 0, low: 0 }
    const boardStats = new Map(boards.map((board) => [String(board._id), {
      _id: String(board._id), name: board.name, total: 0, completed: 0, overdue: 0,
    }]))
    let completed = 0
    let overdue = 0

    for (const task of tasks) {
      if (Object.hasOwn(byStatus, task.status)) byStatus[task.status]++
      if (Object.hasOwn(byPriority, task.priority)) byPriority[task.priority]++
      const stats = boardStats.get(String(task.board))
      stats.total++
      if (task.status === 'done') {
        completed++
        stats.completed++
        const week = weeks.find((item) => task.completedAt >= item.start && task.completedAt <= item.end)
        if (week) week.count++
      } else if (task.dueDate && task.dueDate < today) {
        overdue++
        stats.overdue++
      }
    }

    res.set('Cache-Control', 'no-store')
    return res.json({
      asOf: today,
      timeZone: 'Asia/Manila',
      summary: {
        total: tasks.length,
        completed,
        open: tasks.length - completed,
        overdue,
        completionRate: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
      },
      byStatus,
      byPriority,
      weeks,
      boardStats: [...boardStats.values()].filter((board) => board.total > 0),
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getDashboard }
