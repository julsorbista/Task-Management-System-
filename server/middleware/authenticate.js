const { verifyToken } = require('../utils/jwt')

// Token verification only. Add the shared User lookup when its model is ready.
function authenticate(req, res, next) {
  const token = req.cookies?.access_token

  if (!token) {
    return res.status(401).json({ message: 'Please log in.' })
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' })
    }
    return next(error)
  }

  if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
    return res.status(401).json({ message: 'Invalid session. Please log in again.' })
  }

  req.user = { id: payload.sub }
  return next()
}

module.exports = authenticate
