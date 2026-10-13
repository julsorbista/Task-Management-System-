const mongoose = require('mongoose')
const User = require('../models/User')
const PasswordReset = require('../models/PasswordReset')
const OtpChallenge = require('../models/OtpChallenge')
const { hashPassword, verifyPassword } = require('../utils/password')

async function changePassword(req, res, next) {
  const { currentPassword, newPassword, confirmPassword } = req.body || {}
  const errors = {}
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128) errors.currentPassword = 'Enter your current password.'
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) errors.newPassword = 'Use between 8 and 128 characters.'
  if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please check your password fields.', errors })
  try {
    const user = await User.findById(req.user.id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (!(await verifyPassword(currentPassword, user.password))) return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } })
    const password = await hashPassword(newPassword)
    const updated = await mongoose.connection.transaction(async (session) => {
      const result = await User.updateOne({ _id: user._id, password: user.password }, { $set: { password } }, { session, runValidators: true })
      if (!result.modifiedCount) return false
      await PasswordReset.updateMany({ user: user._id, usedAt: null }, { $set: { usedAt: new Date() } }, { session })
      await OtpChallenge.deleteMany({ user: user._id }, { session })
      return true
    })
    if (!updated) return res.status(409).json({ message: 'Your password changed during this request. Please try again.' })
    return res.json({ message: 'Password updated.' })
  } catch (error) { return next(error) }
}

module.exports = { changePassword }
