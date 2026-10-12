const express = require('express')



const User = require('../models/User')
const { createUser, hidePassword } = require('../models/userStore')
const { verifyPassword } = require('../utils/password')
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie')
const { sendLoginOtpEmail } = require('../utils/mailer')
const { createOtpChallenge, verifyOtpChallenge } = require('../utils/otpStore')
const { validateLogin, validateRegistration } = require('../utils/validation')

const router = express.Router()
const { requestReset, resetPassword } = require('../controllers/passwordResetController')
router.post('/forgot-password', requestReset)
router.post('/reset-password', resetPassword)



function isDuplicateKey(error, field) {
  return error?.code === 11000 && error?.keyPattern?.[field]
}

router.post('/register', async (req, res, next) => {
  const errors = validateRegistration(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
  }

  try {
    const user = await createUser(req.body)

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

    const challenge = await createOtpChallenge(String(user._id))
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
      demoOtp: emailResult.sent || process.env.NODE_ENV === 'production' ? undefined : challenge.otp,
      message: 'OTP sent. Enter the code to finish logging in.',
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/login/verify-otp', async (req, res, next) => {
  try {
  const result = await verifyOtpChallenge(req.body.challengeId, req.body.otp)
  if (!result.ok) {
    const message =
      result.reason === 'expired' ? 'The OTP expired. Please log in again.' : 'Incorrect OTP code.'
    return res.status(401).json({ message })
  }

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
