const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const { getInvitation, respondToInvitation } = require('../controllers/invitationController')
router.use(authenticate)
router.get('/:token', getInvitation)
router.post('/:token', (req, res, next) => {
  if (!req.is('application/json') || req.get('X-Requested-With') !== 'XMLHttpRequest') return res.status(403).json({ message: 'Send a JSON request.' })
  next()
}, respondToInvitation)
module.exports = router
