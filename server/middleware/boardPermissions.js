const mongoose = require('mongoose')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')

function requireBoardRole(...allowedRoles) {
  if (!allowedRoles.length || allowedRoles.some((role) => !['owner', 'editor', 'viewer'].includes(role))) {
    throw new Error('Specify valid board roles')
  }

  return async function boardPermissions(req, res, next) {
    if (!mongoose.isObjectIdOrHexString(req.user?.id)) {
      return res.status(401).json({ message: 'Please log in.' })
    }
    const boardId = req.params.boardId
    if (!mongoose.isObjectIdOrHexString(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID.' })
    }

    try {
      const board = await Board.findById(boardId)
      if (!board) {
        return res.status(404).json({ message: 'Board not found.' })
      }

      let role

      if (String(board.owner) === String(req.user.id)) {
        role = 'owner'
      } else if (board.type === 'shared') {
        const member = await BoardMember.findOne({ board: board._id, user: req.user.id })
        if (member && ['editor', 'viewer'].includes(member.role)) role = member.role
      }


      if (!role) {
        return res.status(404).json({ message: 'Board not found.' })
      }
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'You do not have permission for this action.' })
      }

      req.board = board
      req.boardRole = role
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = {
  canViewBoard: requireBoardRole('owner', 'editor', 'viewer'),
  canEditBoardTasks: requireBoardRole('owner', 'editor'),
  canManageBoard: requireBoardRole('owner'),
}
