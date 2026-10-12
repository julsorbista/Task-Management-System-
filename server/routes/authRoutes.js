const express = require('express')
const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const User = require('../models/User')
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie')
const { sendLoginOtpEmail } = require('../utils/mailer')
const { createOtpChallenge, verifyOtpChallenge } = require('../utils/otpStore')
const { hashPassword, verifyPassword } = require('../utils/passwordHash')
const { validateLogin, validateRegistration } = require('../utils/validation')

const router = express.Router()

function hidePassword(user) {
  const data = user.toObject()
  delete data.password
  return data
}

function isDuplicateEmailError(error) {
  return error?.code === 11000 && error?.keyPattern?.email
}

router.post('/register', async (req, res, next) => {
  const errors = validateRegistration(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  try {
    const user = await mongoose.connection.transaction(async (session) => {
      const [newUser] = await User.create(
        [
          {
            name: req.body.name.trim(),
            email: req.body.email.trim().toLowerCase(),
            password: hashPassword(req.body.password),
            photo: '',
          },
        ],
        { session },
      )

      const [board] = await Board.create(
        [
          {
            name: 'My tasks',
            type: 'private',
            owner: newUser._id,
          },
        ],
        { session },
      )

      await BoardMember.create(
        [
          {
            board: board._id,
            user: newUser._id,
            role: 'owner',
          },
        ],
        { session },
      )

      return newUser
    })

    return res.status(201).json({ user: hidePassword(user), message: 'Account created. Please log in.' })
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
        errors: { email: 'An account with this email already exists.' },
      })
    }

    return next(error)
  }
})

router.post('/login', async (req, res) => {
  const { errors, email } = validateLogin(req.body)
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
  if (!user || !verifyPassword(req.body.password, user.password)) {
    return res.status(401).json({ message: 'Incorrect email or password.' })
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

router.post('/login/verify-otp', async (req, res) => {
  const result = verifyOtpChallenge(req.body.challengeId, req.body.otp)
  if (!result.ok) {
    const message =
      result.reason === 'expired' ? 'The OTP expired. Please log in again.' : 'Incorrect OTP code.'
    return res.status(401).json({ message })
  }

  const user = await User.findById(result.userId).select('+password')
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
