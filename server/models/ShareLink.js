const mongoose = require('mongoose')

const shareLinkSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-f0-9]{64}$/,
    },

    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer',
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'shareLinks',
  },
)

module.exports = mongoose.model('ShareLink', shareLinkSchema)