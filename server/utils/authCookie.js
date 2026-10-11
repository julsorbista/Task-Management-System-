const { createToken, verifyToken } = require('./jwt')

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
}

function setAuthCookie(res, userId) {
  const token = createToken(userId)
  const payload = verifyToken(token)
  res.cookie('access_token', token, {
    ...cookieOptions(),
    expires: new Date(payload.exp * 1000),
  })
}

function clearAuthCookie(res) {
  res.clearCookie('access_token', cookieOptions())
}

module.exports = { setAuthCookie, clearAuthCookie }
