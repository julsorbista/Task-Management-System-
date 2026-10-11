const express = require('express')
const {
  createUser,
  findById,
  findByIdentifier,
  hidePassword,
  isEmailTaken,
  isUsernameTaken,
} = require('../models/userStore')
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie')
const { sendLoginOtpEmail } = require('../utils/mailer')
const { createOtpChallenge, verifyOtpChallenge } = require('../utils/otpStore')
const { validateLogin, validateRegistration } = require('../utils/validation')

const router = express.Router()

router.post('/register', (req, res) => {
  const errors = validateRegistration(req.body)

  if (isUsernameTaken(req.body.username || '')) errors.username = 'This username is already taken.'
  if (isEmailTaken(req.body.email || '')) errors.email = 'An account with this email already exists.'

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  const user = createUser(req.body)
  return res.status(201).json({ user: hidePassword(user), message: 'Account created. Please log in.' })
})

router.post('/login', async (req, res) => {
  const { errors, identifier } = validateLogin(req.body)
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  const user = findByIdentifier(identifier)
  if (!user || user.password !== req.body.password) {
    return res.status(401).json({ message: 'Incorrect username/email or password.' })
  }

  const challenge = createOtpChallenge(user._id)
  let emailResult
  try {
    emailResult = await sendLoginOtpEmail({ to: user.email, otp: challenge.otp })
  } catch (error) {
    console.error(`OTP email failed (${error.name}). Check SMTP settings.`)
    return res.status(502).json({ message: 'Could not send OTP email. Please try again later.' })
  }

  return res.json({
    otpRequired: true,
    challengeId: challenge.id,
    delivery: 'email',
    destination: user.email,
    demoOtp: emailResult.sent ? undefined : challenge.otp,
    message: 'OTP sent. Enter the code to finish logging in.',
  })
})

router.post('/login/verify-otp', (req, res) => {
  const result = verifyOtpChallenge(req.body.challengeId, req.body.otp)
  if (!result.ok) {
    const message =
      result.reason === 'expired' ? 'The OTP expired. Please log in again.' : 'Incorrect OTP code.'
    return res.status(401).json({ message })
  }

  const user = findById(result.userId)
  if (!user) {
    return res.status(401).json({ message: 'Account not found.' })
  }

  setAuthCookie(res, user._id)
  return res.json({ user: hidePassword(user) })
})

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  return res.json({ message: 'Logged out.' })
})

module.exports = router
