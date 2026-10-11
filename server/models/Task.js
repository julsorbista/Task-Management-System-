const mongoose = require('mongoose')

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidDate(value) {
  if (value === '') return true
  if (!datePattern.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function dateField() {
  return {
    type: String,
    default: '',
    validate: {
      validator: isValidDate,
      message: 'Date must be empty or a valid YYYY-MM-DD date.',
    },
  }
}

function timeField() {
  return {
    type: String,
    default: '',
    validate: {
      validator: (value) => value === '' || timePattern.test(value),
      message: 'Time must be empty or use HH:MM format.',
    },
  }
}

const taskSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
      required: true,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },

    dueDate: dateField(),
    dueTime: timeField(),

    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reminder: {
      type: String,
      enum: [
        'none',
        'at-time',
        '10-min',
        '1-hour',
        '1-day',
        'custom',
      ],
      default: 'none',
      required: true,
    },

    reminderDate: dateField(),
    reminderTime: timeField(),
    completedAt: dateField(),

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'tasks',
  },
)

module.exports = mongoose.model('Task', taskSchema)