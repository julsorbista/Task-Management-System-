const jwt = require('jsonwebtoken')

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }

  return process.env.JWT_SECRET
}

function createToken(userId) {
  return jwt.sign({}, getSecret(), {
    subject: String(userId),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    algorithm: 'HS256',
  })
}

function verifyToken(token) {
  return jwt.verify(token, getSecret(), {
    algorithms: ['HS256'],
  })
}

module.exports = { createToken, verifyToken }