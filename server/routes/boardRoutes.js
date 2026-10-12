const express = require('express')
const mongoose = require('mongoose')
const authenticate = require('../middleware/authenticate')
const { canViewBoard, canManageBoard } = require('../middleware/boardPermissions')
const { createBoard, getBoards, getBoard, updateBoard, deleteBoard } = require('../controllers/boardController')

const router = express.Router()

router.use(authenticate)

router.use((req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.user.id)) {
    return res.status(401).json({
      message: 'Invalid session. Please log in again.',
    })
  }

  next()
})


function requireWriteRequest(req, res, next) {
  if (
    !req.is('application/json') ||
    req.get('X-Requested-With') !== 'XMLHttpRequest'
  ) {
    return res.status(403).json({
      message: 'Send JSON with X-Requested-With: XMLHttpRequest.',
    })
  }

  next()
}

router.post('/', requireWriteRequest, createBoard)
router.get('/', getBoards)
router.get('/:boardId', canViewBoard, getBoard)
router.patch('/:boardId', requireWriteRequest, canManageBoard, updateBoard)
router.delete('/:boardId', requireWriteRequest, canManageBoard, deleteBoard)

module.exports = router
