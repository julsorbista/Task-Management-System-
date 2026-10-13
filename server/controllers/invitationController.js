const crypto = require('node:crypto')
const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Invitation = require('../models/BoardInvitation')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { sendBoardInvitationEmail } = require('../utils/mailer')

const digest = (token) => crypto.createHash('sha256').update(token).digest('hex')

async function sendInvitation(req, res, next) {
  const { email, role } = req.body || {}
  if (req.board.type !== 'shared') return res.status(400).json({ message: 'Only shared boards can be shared.' })
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'Enter a valid email address.' })
  if (!['editor', 'viewer'].includes(role)) return res.status(400).json({ message: 'Choose Viewer or Editor.' })
  try {
    const address = email.trim().toLowerCase()
    const recipient = await User.findOne({ email: address })
    if (!recipient) return res.status(404).json({ message: 'Only registered Morrow users can be invited. Ask this person to create an account first.' })
    if (recipient && (String(recipient._id) === String(req.board.owner) || await BoardMember.exists({ board: req.board._id, user: recipient._id }))) {
      return res.status(409).json({ message: 'This person already has access.' })
    }
    const origin = new URL(process.env.APP_URL || 'http://localhost:5173')
    if (!['http:', 'https:'].includes(origin.protocol) || (process.env.NODE_ENV === 'production' && (!process.env.APP_URL || origin.protocol !== 'https:'))) throw new Error('Invalid APP_URL')
    await Invitation.updateMany({ board: req.board._id, email: address, status: 'pending', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } })
    const sender = await User.findById(req.user.id)
    const token = crypto.randomBytes(32).toString('hex')
    const invitation = await Invitation.create({ board: req.board._id, invitedBy: req.user.id, email: address, role,
      tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
    const link = new URL('/invitations', origin)
    link.searchParams.set('token', token)
    try {
      await sendBoardInvitationEmail({ to: address, boardName: req.board.name, senderName: sender?.name || 'A teammate', role, link: link.toString() })
    } catch {
      await Invitation.deleteOne({ _id: invitation._id, status: 'pending' })
      return res.status(502).json({ message: 'Invitation email could not be sent. Please try again.' })
    }
    if (recipient) {
      try {
        await Notification.create({ user: recipient._id, title: 'Board invitation', type: 'shared', invitation: invitation._id,
          message: `You were invited to "${req.board.name}" as ${role}. Check your email to accept or decline.` })
      } catch (error) { console.error('Invitation notification failed:', error.name) }
    }
    return res.status(201).json({ message: 'Invitation email sent. Access starts after acceptance.', invitation: { _id: invitation._id, email: address, role, status: 'pending', expiresAt: invitation.expiresAt } })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An invitation is already pending for this email.' })
    return next(error)
  }
}

async function findInvitation(req, res) {
  const token = req.params.token
  if (!/^(?:[a-f0-9]{64}|[a-f0-9]{24})$/.test(token || '')) { res.status(400).json({ message: 'Invalid invitation link.' }); return null }
  const invitation = await Invitation.findOne(token.length === 24 ? { _id: token } : { tokenHash: digest(token) })
  if (!invitation) { res.status(404).json({ message: 'Invitation not found.' }); return null }
  const user = await User.findById(req.user.id)
  if (!user || user.email.toLowerCase() !== invitation.email) { res.status(403).json({ message: 'Log in with the email address that received this invitation.' }); return null }
  const board = await Board.findById(invitation.board)
  if (!board || board.type !== 'shared' || String(board.owner) !== String(invitation.invitedBy)) { res.status(410).json({ message: 'This board invitation is no longer available.' }); return null }
  if (invitation.status === 'pending' && invitation.expiresAt <= new Date()) { res.status(410).json({ message: 'Invitation expired. Ask the owner to invite you again.' }); return null }
  return { invitation, board, user }
}

async function getInvitation(req, res, next) {
  res.set('Cache-Control', 'no-store')
  try {
    const result = await findInvitation(req, res)
    if (!result) return
    const { invitation, board } = result
    const sender = await User.findById(invitation.invitedBy)
    return res.json({ boardId: String(board._id), boardName: board.name, senderName: sender?.name || 'A teammate', email: invitation.email,
      role: invitation.role, status: invitation.status, expiresAt: invitation.expiresAt })
  } catch (error) { return next(error) }
}

async function respondToInvitation(req, res, next) {
  const action = req.body?.action
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ message: 'Choose accept or decline.' })
  try {
    const result = await findInvitation(req, res)
    if (!result) return
    const { invitation, board, user } = result
    const status = action === 'accept' ? 'accepted' : 'declined'
    const updated = await mongoose.connection.transaction(async (session) => {
      const claimed = await Invitation.findOneAndUpdate({ _id: invitation._id, status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status } }, { new: true, session })
      if (!claimed) return false
      if (action === 'accept') await BoardMember.updateOne({ board: board._id, user: req.user.id },
        { $setOnInsert: { role: invitation.role } }, { upsert: true, session, runValidators: true })
      await Notification.create([{
        user: invitation.invitedBy,
        title: action === 'accept' ? 'Invitation accepted' : 'Invitation declined',
        message: `${user.name || user.email} ${status} your invitation to "${board.name}".`,
        type: 'shared',
        page: board._id,
      }], { session })
      return true
    })
    if (!updated) return res.status(409).json({ message: 'This invitation has already been answered or expired.' })
    return res.json({ status, boardId: String(board._id) })
  } catch (error) { return next(error) }
}

module.exports = { sendInvitation, getInvitation, respondToInvitation }
