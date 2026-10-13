const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['viewer', 'editor'], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: 'boardInvitations' })
schema.index({ board: 1, email: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } })
module.exports = mongoose.model('BoardInvitation', schema)
