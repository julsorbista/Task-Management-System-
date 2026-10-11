const express = require('express')
const authenticate = require('../middleware/authenticate')
const { canManageBoard } = require('../middleware/boardPermissions')
const {
  createShareLink,
  getShareLinks,
  revokeShareLink,
} = require('../controllers/shareLinkController')

const router = express.Router({ mergeParams: true })
router.use(authenticate)
router.use(canManageBoard)

function requireWriteRequest(req, res, next) {
  if (!req.is('application/json') || req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({
      message: 'Send JSON with X-Requested-With: XMLHttpRequest.',
    })
  }
  return next()
}

router.get('/', getShareLinks)
router.post('/', requireWriteRequest, createShareLink)
router.patch('/:linkId/revoke', requireWriteRequest, revokeShareLink)

module.exports = router
