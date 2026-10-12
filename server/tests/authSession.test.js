const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const User = require('../models/User')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const mailer = require('../utils/mailer')
const { hashPassword, verifyPassword } = require('../utils/password')

test('password hashes are salted and reject wrong passwords or malformed hashes', async () => {
  const first = await hashPassword('ExamplePassword123')
  const second = await hashPassword('ExamplePassword123')
  assert.notEqual(first, second)
  assert.equal(await verifyPassword('ExamplePassword123', first), true)
  assert.equal(await verifyPassword('wrong', first), false)
  assert.equal(await verifyPassword('ExamplePassword123', 'plain-password'), false)
})

test('register → OTP → MongoDB current-user stays authenticated; invalid/replayed OTP fails', async (t) => {
  process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex')
  let savedUser, deliveredOtp, savedBoard, ownerMember
  const stub = (object, key, replacement) => {
    const original = object[key]
    object[key] = replacement
    t.after(() => { object[key] = original })
  }
  stub(mongoose.connection, 'transaction', async (callback) => callback({}))
  stub(User, 'exists', async (query) => {
    if (!savedUser) return null
    return query._id || query.email === savedUser.email || query.username === savedUser.username
      ? { _id: savedUser._id } : null
  })
  stub(User, 'create', async ([data]) => {
    savedUser = new User(data)
    await savedUser.validate()
    return [savedUser]
  })
  stub(Board, 'create', async ([data]) => { savedBoard = new Board(data); return [savedBoard] })
  stub(BoardMember, 'create', async ([data]) => { ownerMember = data; return [new BoardMember(data)] })
  stub(User, 'findOne', (query) => ({
    select: async () => savedUser && query.$or.some((item) =>
      item.email === savedUser.email || item.username === savedUser.username) ? savedUser : null,
  }))
  stub(User, 'findById', (id) => {
    const value = savedUser && String(savedUser._id) === String(id) ? savedUser : null
    return { select: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) }
  })
  stub(mailer, 'sendLoginOtpEmail', async ({ otp }) => { deliveredOtp = otp; return { sent: true } })
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', require('../routes/authRoutes'))
  app.use('/api/users', require('../routes/userRoutes'))
  app.use((error, req, res, next) => res.status(500).json({ message: error.name }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const post = (path, body, cookie) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
  let response = await post('/api/auth/register', {
    name: 'Test User', username: 'testuser', email: 'test@example.com',
    password: 'ExamplePassword123', confirmPassword: 'ExamplePassword123',
  })
  assert.equal(response.status, 201)
  const registered = (await response.json()).user
  assert(mongoose.isObjectIdOrHexString(registered._id))
  assert(!('password' in registered))
  assert(savedUser.password.startsWith('scrypt:'))
  assert.equal(String(savedBoard.owner), registered._id)
  assert.equal(ownerMember.role, 'owner')
  response = await post('/api/auth/login', { identifier: 'testuser', password: 'wrongpassword' })
  assert.equal(response.status, 401)
  response = await post('/api/auth/login', { identifier: 'testuser', password: 'ExamplePassword123' })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('set-cookie'), null)
  const challenge = await response.json()
  const wrongOtp = deliveredOtp === '000000' ? '000001' : '000000'
  response = await post('/api/auth/login/verify-otp', { challengeId: challenge.challengeId, otp: wrongOtp })
  assert.equal(response.status, 401)
  response = await post('/api/auth/login/verify-otp', { challengeId: challenge.challengeId, otp: deliveredOtp })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  for (let visit = 0; visit < 2; visit++) {
    response = await fetch(base + '/api/users/me', { headers: { Cookie: cookie } })
    assert.equal(response.status, 200)
    assert.equal((await response.json())._id, registered._id)
  }
  response = await post('/api/auth/login/verify-otp', { challengeId: challenge.challengeId, otp: deliveredOtp })
  assert.equal(response.status, 401)
  response = await post('/api/auth/logout', {}, cookie)
  assert.equal(response.status, 200)
  assert(response.headers.get('set-cookie').includes('access_token=;'))
  savedUser = null
  response = await fetch(base + '/api/users/me', { headers: { Cookie: cookie } })
  assert.equal(response.status, 401)
})
