const mongoose = require('mongoose')

// A task container used by List, Board, and Calendar views.
const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['private', 'shared'],
      default: 'private',
      required: true,
    },
    // The controller must take this ID from the authenticated user.
    // Assumes the shared User model will use MongoDB ObjectId IDs.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'boards',
  },
)

module.exports = mongoose.model('Board', boardSchema)
