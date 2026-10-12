const mongoose = require('mongoose')
const User = require('../models/User')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Notification = require('../models/Notification')
const PasswordReset = require('../models/PasswordReset')
const { hashPassword, verifyPassword } = require('../utils/passwordHash')

function isDuplicateEmailError(error) {
  return error?.code === 11000 && error?.keyPattern?.email
}

function safeUser(user) {
  const data = user.toObject()
  delete data.password
  return data
}

function validateAuthenticatedUser(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.user?.id)) {
    res.status(401).json({ message: 'Invalid session. Please log in again.' })
    return false
  }

  return true
}

function safeUserSummary(user) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    photo: user.photo || '',
  }
}

// Get users who share at least one visible board with the logged-in user.
async function getUsers(req, res, next) {
  if (!validateAuthenticatedUser(req, res)) return

  const userId = new mongoose.Types.ObjectId(req.user.id)

  try {
    const ownedBoards = await Board.find({ owner: userId })
      .select('_id owner')
      .lean()

    const memberships = await BoardMember.find({ user: userId })
      .select('board')
      .lean()

    const memberBoardIds = memberships.map((membership) => membership.board)

    const sharedBoards = memberBoardIds.length
      ? await Board.find({
        _id: { $in: memberBoardIds },
        type: 'shared',
      })
        .select('_id owner')
        .lean()
      : []

    const visibleBoards = [...ownedBoards, ...sharedBoards]
    const visibleBoardIds = visibleBoards.map((board) => board._id)
    const visibleUserIds = new Set([String(userId)])

    for (const board of visibleBoards) {
      visibleUserIds.add(String(board.owner))
    }

    if (visibleBoardIds.length) {
      const visibleMemberships = await BoardMember.find({
        board: { $in: visibleBoardIds },
      })
        .select('user')
        .lean()

      for (const membership of visibleMemberships) {
        visibleUserIds.add(String(membership.user))
      }
    }

    const users = await User.find({
      _id: { $in: Array.from(visibleUserIds) },
    })
      .select('_id name email photo')
      .sort({ name: 1, email: 1 })
      .lean()

    return res.json(users.map(safeUserSummary))
  } catch (error) {
    return next(error)
  }
}

// Get the logged-in user's profile.
async function getCurrentUser(req, res, next) {
  if (!validateAuthenticatedUser(req, res)) return

  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.json(safeUser(user))
  } catch (error) {
    return next(error)
  }
}

// Update only the logged-in user's basic profile fields.
async function updateCurrentUser(req, res, next) {
  if (!validateAuthenticatedUser(req, res)) return

  const body = req.body || {}
  const allowedFields = ['name', 'email', 'photo']
  const unknownField = Object.keys(body).find((field) => !allowedFields.includes(field))

  if (unknownField) {
    return res.status(400).json({
      message: `Cannot update ${unknownField}.`,
    })
  }

  const changes = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ message: 'Name is required.' })
    }

    changes.name = body.name.trim()
  }

  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !body.email.trim()) {
      return res.status(400).json({ message: 'Email is required.' })
    }

    changes.email = body.email.trim().toLowerCase()
  }

  if (body.photo !== undefined) {
    if (typeof body.photo !== 'string') {
      return res.status(400).json({ message: 'Photo must be text.' })
    }

    changes.photo = body.photo
  }

  if (!Object.keys(changes).length) {
    return res.status(400).json({ message: 'Submit at least one profile field to update.' })
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: changes },
      { new: true, runValidators: true },
    )

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.json(safeUser(user))
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ message: 'Email is already in use.' })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid profile data.' })
    }

    return next(error)
  }
}

async function changeCurrentUserPassword(req, res, next) {
  if (!validateAuthenticatedUser(req, res)) return

  const { currentPassword, newPassword } = req.body || {}

  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({
      message: 'Current password is required.',
      errors: { currentPassword: 'Current password is required.' },
    })
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters.',
      errors: { newPassword: 'Password must be at least 8 characters.' },
    })
  }

  try {
    const user = await User.findById(req.user.id).select('+password')

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    if (!verifyPassword(currentPassword, user.password)) {
      return res.status(400).json({
        message: 'Current password is incorrect.',
        errors: { currentPassword: 'Current password is incorrect.' },
      })
    }

    user.password = hashPassword(newPassword)
    await user.save()

    return res.json({ message: 'Password updated.' })
  } catch (error) {
    return next(error)
  }
}

async function deleteCurrentUser(req, res, next) {
  if (!validateAuthenticatedUser(req, res)) return

  const userId = new mongoose.Types.ObjectId(req.user.id)

  try {
    const deleted = await mongoose.connection.transaction(async (session) => {
      const user = await User.findById(userId).select('_id').session(session)
      if (!user) return false

      const ownedBoards = await Board.find({ owner: userId }).select('_id').session(session)
      const ownedBoardIds = ownedBoards.map((board) => board._id)

      if (ownedBoardIds.length) {
        await Board.deleteMany({ _id: { $in: ownedBoardIds } }, { session })
        await BoardMember.deleteMany({ board: { $in: ownedBoardIds } }, { session })
        await mongoose.connection.collection('tasks').deleteMany(
          { board: { $in: ownedBoardIds } },
          { session },
        )
        await mongoose.connection.collection('shareLinks').deleteMany(
          { board: { $in: ownedBoardIds } },
          { session },
        )
      }

      await BoardMember.deleteMany({ user: userId }, { session })
      await mongoose.connection.collection('tasks').updateMany(
        { assignee: userId },
        { $set: { assignee: null } },
        { session },
      )
      await Notification.deleteMany({ user: userId }, { session })
      await PasswordReset.deleteMany({ user: userId }, { session })

      const result = await User.deleteOne({ _id: userId }, { session })
      return Boolean(result.deletedCount)
    })

    if (!deleted) return res.status(404).json({ message: 'User not found.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  changeCurrentUserPassword,
  getCurrentUser,
  getUsers,
  updateCurrentUser,
  deleteCurrentUser,
}
