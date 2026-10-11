const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')

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
    const members = await BoardMember.find({ board: req.board._id })
      .select('user role')
      .lean()

    const board = req.board.toObject()
    board.members = members.map((member) => ({
      user: String(member.user),
      role: member.role,
    }))

    return res.json(board)
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
  updateBoard,
  deleteBoard,
}
