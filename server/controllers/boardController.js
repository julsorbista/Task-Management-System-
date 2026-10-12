const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Notification = require('../models/Notification')
const User = require('../models/User')

async function formatBoardWithMembers(board) {
  const members = await BoardMember.find({ board: board._id })
    .select('user role')
    .lean()

  const data = board.toObject()
  data.members = members.map((member) => ({
    user: String(member.user),
    role: member.role,
  }))

  return data
}

async function createBoard(req, res, next) {
  const { name, type = 'private' } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      message: 'Board name is required.',
    })
  }

  if (!['private', 'shared'].includes(type)) {
    return res.status(400).json({
      message: 'Board type must be private or shared.',
    })
  }

  try {
    // Both records succeed together, or neither is saved.
    const board = await mongoose.connection.transaction(
      async (session) => {
        const [newBoard] = await Board.create(
          [
            {
              name: name.trim(),
              type,
              owner: req.user.id,
            },
          ],
          { session },
        )

        await BoardMember.create(
          [
            {
              board: newBoard._id,
              user: req.user.id,
              role: 'owner',
            },
          ],
          { session },
        )

        return newBoard
      },
    )

    return res.status(201).json(board)
  } catch (error) {
    return next(error)
  }
}

async function getBoards(req, res, next) {
  try {
    const memberships = await BoardMember.find({
      user: req.user.id,
      role: { $in: ['editor', 'viewer'] },
    }).select('board')

    const sharedBoardIds = memberships.map(
      (member) => member.board,
    )

    const boards = await Board.find({
      $or: [
        { owner: req.user.id },
        {
          type: 'shared',
          _id: { $in: sharedBoardIds },
        },
      ],
    }).sort({ createdAt: -1 })

    return res.json(boards)
  } catch (error) {
    return next(error)
  }
}

async function getBoard(req, res, next) {
  try {
    return res.json(await formatBoardWithMembers(req.board))
  } catch (error) {
    return next(error)
  }
}

async function inviteBoardMember(req, res, next) {
  const { email, role } = req.body || {}

  if (req.board.type !== 'shared') {
    return res.status(400).json({ message: 'Only shared boards can have invited members.' })
  }

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ message: 'Email is required.' })
  }

  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be editor or viewer.' })
  }

  try {
    const invitedUser = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('_id')

    if (!invitedUser) {
      return res.status(404).json({
        message: 'This user is not registered yet. Ask them to create an account first.',
      })
    }

    if (String(invitedUser._id) === String(req.board.owner)) {
      return res.status(400).json({ message: 'The board owner already has access.' })
    }

    const existingMember = await BoardMember.exists({
      board: req.board._id,
      user: invitedUser._id,
    })

    if (existingMember) {
      return res.status(409).json({ message: 'This person already has access.' })
    }

    await BoardMember.create({
      board: req.board._id,
      user: invitedUser._id,
      role,
    })

    await Notification.create({
      user: invitedUser._id,
      title: 'Board shared',
      message: `You were invited to "${req.board.name}".`,
      type: 'shared',
    })

    return res.status(201).json(await formatBoardWithMembers(req.board))
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This person already has access.' })
    }

    return next(error)
  }
}

async function removeBoardMember(req, res, next) {
  const { userId } = req.params

  if (req.board.type !== 'shared') {
    return res.status(400).json({ message: 'Only shared boards can have members removed.' })
  }

  if (!mongoose.isObjectIdOrHexString(userId)) {
    return res.status(400).json({ message: 'Invalid user ID.' })
  }

  if (String(userId) === String(req.board.owner)) {
    return res.status(400).json({ message: 'The board owner cannot be removed.' })
  }

  try {
    const member = await BoardMember.findOneAndDelete({
      board: req.board._id,
      user: userId,
      role: { $ne: 'owner' },
    })

    if (!member) {
      return res.status(404).json({ message: 'Board member not found.' })
    }

    return res.status(200).json(await formatBoardWithMembers(req.board))
  } catch (error) {
    return next(error)
  }
}

async function updateBoard(req, res, next) {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Board name is required.' })
  }

  try {
    // Only rename; do not accept owner or type changes from the body.
    const board = await Board.findOneAndUpdate(
      { _id: req.board._id, owner: req.user.id },
      { $set: { name: name.trim() } },
      { new: true, runValidators: true },
    )
    if (!board) return res.status(404).json({ message: 'Board not found.' })
    return res.json(board)
  } catch (error) {
    return next(error)
  }
}

async function deleteBoard(req, res, next) {
  try {
    const deleted = await mongoose.connection.transaction(async (session) => {
      const result = await Board.deleteOne(
        { _id: req.board._id, owner: req.user.id },
        { session },
      )
      if (!result.deletedCount) return false

      await BoardMember.deleteMany({ board: req.board._id }, { session })
      // Task and ShareLink models must store `board` as an ObjectId.
      // Use existing collections until those models are implemented.
      await mongoose.connection.collection('tasks').deleteMany(
        { board: req.board._id }, { session },
      )
      await mongoose.connection.collection('shareLinks').deleteMany(
        { board: req.board._id }, { session },
      )
      return true
    })

    if (!deleted) return res.status(404).json({ message: 'Board not found.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createBoard,
  getBoards,
  getBoard,
  inviteBoardMember,
  removeBoardMember,
  updateBoard,
  deleteBoard,
}
