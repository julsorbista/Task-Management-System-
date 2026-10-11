const mongoose = require('mongoose')

const boardMemberSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'boardMembers',
  },
)


boardMemberSchema.index({ board: 1, user: 1 }, { unique: true })

module.exports = mongoose.model('BoardMember', boardMemberSchema)
