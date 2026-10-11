const crypto = require('node:crypto')
const mongoose = require('mongoose')
const ShareLink = require('../models/ShareLink')

function formatLink(link) {
  const data = link.toObject()
  delete data.tokenHash
  data._id = String(data._id)
  data.board = String(data.board)
  data.createdBy = String(data.createdBy)
  return data
}

async function createShareLink(req, res, next) {
  if (req.board.type !== 'shared') {
    return res.status(400).json({ message: 'Share links are only available for shared boards.' })
  }

  const { role = 'viewer', expiresInDays = 7 } = req.body || {}
  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be editor or viewer.' })
  }
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    return res.status(400).json({ message: 'Expiry must be a whole number from 1 to 30 days.' })
  }

  try {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const link = await ShareLink.create({
      board: req.board._id,
      tokenHash,
      role,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      createdBy: req.user.id,
    })

    res.set('Cache-Control', 'no-store')
    // Return the secret once. Acceptance and the frontend URL are not wired yet.
    return res.status(201).json({ ...formatLink(link), token })
  } catch (error) {
    return next(error)
  }
}

async function getShareLinks(req, res, next) {
  try {
    const links = await ShareLink.find({ board: req.board._id })
      .select('-tokenHash')
      .sort({ createdAt: -1 })
    res.set('Cache-Control', 'no-store')
    return res.json(links.map(formatLink))
  } catch (error) {
    return next(error)
  }
}

async function revokeShareLink(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.linkId)) {
    return res.status(400).json({ message: 'Invalid share link ID.' })
  }
  try {
    // Atomic and idempotent: preserve the original revocation date.
    const link = await ShareLink.findOneAndUpdate(
      { _id: req.params.linkId, board: req.board._id },
      [{ $set: { revokedAt: { $ifNull: ['$revokedAt', '$$NOW'] } } }],
      { new: true },
    )
    if (!link) return res.status(404).json({ message: 'Share link not found.' })
    res.set('Cache-Control', 'no-store')
    return res.json(formatLink(link))
  } catch (error) {
    return next(error)
  }
}

module.exports = { createShareLink, getShareLinks, revokeShareLink }
