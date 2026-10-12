const express = require('express')
const authenticate = require('../middleware/authenticate')
const {
  findById,
  hidePassword,
  isEmailTaken,
  isUsernameTaken,
  updateUser,
} = require('../models/userStore')
const { validateProfile } = require('../utils/validation')

const router = express.Router()

router.get('/me', authenticate, (req, res) => {
  const user = findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  return res.json({ user: hidePassword(user) })
})

router.put('/me', authenticate, (req, res) => {
  const errors = validateProfile(req.body)

  if (req.body.username !== undefined && isUsernameTaken(req.body.username, req.user.id)) {
    errors.username = 'This username is already taken.'
  }
  if (req.body.email !== undefined && isEmailTaken(req.body.email, req.user.id)) {
    errors.email = 'An account with this email already exists.'
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  const user = findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  if (req.body.currentPassword !== undefined || req.body.newPassword !== undefined) {
    if (user.password !== req.body.currentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } })
    }
    req.body.password = req.body.newPassword
  }

  const updatedUser = updateUser(req.user.id, req.body)
  return res.json({ user: hidePassword(updatedUser) })
})

module.exports = router
