const express = require('express')
const crypto = require('node:crypto')
const { promisify } = require('node:util')

const User = require('../models/User')
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie')
const { sendLoginOtpEmail } = require('../utils/mailer')
const { createOtpChallenge, verifyOtpChallenge } = require('../utils/otpStore')
const { validateLogin, validateRegistration } = require('../utils/validation')

const router = express.Router()
const scrypt = promisify(crypto.scrypt)
const PASSWORD_KEY_LENGTH = 64

function isDuplicateKey(error, field) {
  return error?.code === 11000 && error?.keyPattern?.[field]
}

function hidePassword(user) {
  if (!user) return null
  const data = typeof user.toObject === 'function' ? user.toObject() : { ...user }
  delete data.password
  return data
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  return `scrypt$${salt}$${key.toString('hex')}`
}

async function verifyPassword(password, passwordHash) {
  const [method, salt, savedKey] = String(passwordHash || '').split('$')
  if (method !== 'scrypt' || !salt || !savedKey) return false

  const savedBuffer = Buffer.from(savedKey, 'hex')
  const key = await scrypt(password, salt, savedBuffer.length)

  return savedBuffer.length === key.length && crypto.timingSafeEqual(savedBuffer, key)
}

router.post('/register', async (req, res, next) => {
  const errors = validateRegistration(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  try {
    const user = await User.create({
      name: req.body.name.trim(),
      username: req.body.username.trim().toLowerCase(),
      email: req.body.email.trim().toLowerCase(),
      password: await hashPassword(req.body.password),
      photo: '',
    })

    return res.status(201).json({ user: hidePassword(user), message: 'Account created. Please log in.' })
  } catch (error) {
    if (isDuplicateKey(error, 'username')) {
      return res.status(400).json({
        message: 'This username is already taken.',
        errors: { username: 'This username is already taken.' },
      })
    }

    if (isDuplicateKey(error, 'email')) {
      return res.status(400).json({
        message: 'An account with this email already exists.',
        errors: { email: 'An account with this email already exists.' },
      })
    }

    return next(error)
  }
})

router.post('/login', async (req, res, next) => {
  const { errors, identifier } = validateLogin(req.body)
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  try {
    const value = identifier.trim().toLowerCase()
    const user = await User.findOne({
      $or: [{ email: value }, { username: value }],
    }).select('+password')

    if (!user || !(await verifyPassword(req.body.password, user.password))) {
      return res.status(401).json({ message: 'Incorrect username/email or password.' })
    }

    const challenge = createOtpChallenge(String(user._id))
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
  } catch (error) {
    return next(error)
  }
})

router.post('/login/verify-otp', async (req, res, next) => {
  const result = verifyOtpChallenge(req.body.challengeId, req.body.otp)
  if (!result.ok) {
    const message =
      result.reason === 'expired' ? 'The OTP expired. Please log in again.' : 'Incorrect OTP code.'
    return res.status(401).json({ message })
  }

  try {
    const user = await User.findById(result.userId)
    if (!user) {
      return res.status(401).json({ message: 'Account not found.' })
    }

    setAuthCookie(res, user._id)
    return res.json({ user: hidePassword(user) })
  } catch (error) {
    return next(error)
  }
})

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  return res.json({ message: 'Logged out.' })
})

module.exports = router
