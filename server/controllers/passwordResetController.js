const crypto = require('node:crypto')
const mongoose = require('mongoose')
const User = require('../models/User')
const PasswordReset = require('../models/PasswordReset')
const OtpChallenge = require('../models/OtpChallenge')
const { hashPassword } = require('../utils/password')
const { sendPasswordResetEmail } = require('../utils/mailer')
const { clearAuthCookie } = require('../utils/authCookie')

const digest = (token) => crypto.createHash('sha256').update(token).digest('hex')

async function requestReset(req, res, next) {
  const email = req.body?.email
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: 'Enter a valid email address.' })
  }
  try {
    const origin = new URL(process.env.APP_URL || 'http://localhost:5173')
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Invalid APP_URL')
    if (process.env.NODE_ENV === 'production' && (!process.env.APP_URL || origin.protocol !== 'https:')) throw new Error('APP_URL must use HTTPS')
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('_id email')
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      const record = await PasswordReset.create({
        user: user._id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      const link = new URL('/reset-password', origin)
      link.searchParams.set('token', token)
      try {
        await sendPasswordResetEmail({ to: user.email, link: link.toString() })
      } catch (error) {
        await PasswordReset.deleteOne({ _id: record._id })
        throw error
      }
    }
    res.set('Cache-Control', 'no-store')
    return res.json({ message: 'If an account exists for that email, a reset link will be sent.' })
  } catch (error) {
    return next(error)
  }
}

async function resetPassword(req, res, next) {
  const { token, password, confirmPassword } = req.body || {}
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: 'Invalid or expired reset link. Request a new link.' })
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Use a password of 8 to 128 characters.' })
  }
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' })
  try {
    const passwordHash = await hashPassword(password)
    const reset = await mongoose.connection.transaction(async (session) => {
      const record = await PasswordReset.findOneAndUpdate({
        tokenHash: digest(token), usedAt: null, expiresAt: { $gt: new Date() },
      }, { $set: { usedAt: new Date() } }, { new: true, session })
      if (!record) return false
      const result = await User.updateOne({ _id: record.user }, { $set: { password: passwordHash } }, { session, runValidators: true })
      if (!result.matchedCount) return false
      await PasswordReset.updateMany({ user: record.user, usedAt: null }, { $set: { usedAt: new Date() } }, { session })
      await OtpChallenge.deleteMany({ user: record.user }, { session })
      return true
    })
    if (!reset) return res.status(400).json({ message: 'Invalid or expired reset link. Request a new link.' })
    clearAuthCookie(res)
    return res.json({ message: 'Password updated. Please log in.' })
  } catch (error) {
    return next(error)
  }
}

module.exports = { requestReset, resetPassword }
