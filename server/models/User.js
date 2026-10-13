
const mongoose = require('mongoose')

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => emailPattern.test(value),
        message: 'Email must be a valid email address.',
      },
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: /^[a-z0-9_]{4,}$/,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    photo: {
      type: String,
      default: '',
    },
    firstLoginVerifiedAt: {
      type: Date,
      default: null,
    },
    lastOtpSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'users',
  }
)

module.exports = mongoose.model('User', userSchema)

