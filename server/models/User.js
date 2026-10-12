
const mongoose = require('mongoose')

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[A-Za-z0-9_]{4,}$/

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => usernamePattern.test(value),
        message: 'Username must be at least 4 characters and use letters, numbers, or underscores.',
      },
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
    password: {
      type: String,
      required: true,
      select: false,
    },
    photo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
)

module.exports = mongoose.model('User', userSchema)

