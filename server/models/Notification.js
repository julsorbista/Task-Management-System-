
const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
    },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    reminderKey: { type: String },
    invitation: { type: mongoose.Schema.Types.ObjectId, ref: 'BoardInvitation' },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['due-soon', 'overdue', 'assigned', 'shared'],
      default: 'assigned',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  },
)

notificationSchema.index({ reminderKey: 1 }, { unique: true, partialFilterExpression: { reminderKey: { $type: 'string' } } })

module.exports = mongoose.model('Notification', notificationSchema)
