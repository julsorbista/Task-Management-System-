const express = require('express')
const mongoose = require('mongoose')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

const {
  getNotifications,
  markNotificationAsRead,
} = require('../controllers/notificationController')

const {
  getCurrentUser,
  getUsers,
  updateCurrentUser,
  deleteCurrentUser,
} = require('../controllers/userController')

router.use(authenticate)

router.use((req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.user.id)) {
    return res.status(401).json({
      message: 'Invalid session. Please log in again.',
    })
  }

  next()
})

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

router.get('/', getUsers)
router.get('/me', getCurrentUser)
router.patch('/me', requireWriteRequest, updateCurrentUser)
router.delete('/me', requireWriteRequest, deleteCurrentUser)


router.get('/notifications', getNotifications)

router.patch(
  '/notifications/:notificationId/read',
  requireWriteRequest,
  markNotificationAsRead,
)

module.exports = router
