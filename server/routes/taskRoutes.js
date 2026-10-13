const express = require('express')
const authenticate = require('../middleware/authenticate')
const {
  canViewBoard,
  canEditBoardTasks,
} = require('../middleware/boardPermissions')
const {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} = require('../controllers/taskController')

const router = express.Router({ mergeParams: true })

router.use(authenticate)

function requireWriteRequest(req, res, next) {
  if (
    !req.is('application/json') ||
    req.get('X-Requested-With') !== 'XMLHttpRequest'
  ) {
    return res.status(403).json({
      message: 'Send JSON with X-Requested-With: XMLHttpRequest.',
    })
  }

  next()
}

router.get('/', canViewBoard, getTasks)

router.post(
  '/',
  requireWriteRequest,
  canEditBoardTasks,
  createTask,
)

// Viewers may reach this route too, but updateTask only lets them change
// the status of tasks that are unassigned or assigned to them (the checkbox).
// Owners and editors can still change any field.
router.patch(
  '/:taskId',
  requireWriteRequest,
  canViewBoard,
  updateTask,
)

router.delete(
  '/:taskId',
  requireWriteRequest,
  canEditBoardTasks,
  deleteTask,
)

module.exports = router
