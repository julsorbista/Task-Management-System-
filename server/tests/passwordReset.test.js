const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const User = require('../models/User')
const Reset = require('../models/PasswordReset')
const Otp = require('../models/OtpChallenge')
const mailer = require('../utils/mailer')
const { verifyPassword } = require('../utils/password')

test('reset email hides account existence; token expires and can update a hashed password only once', async (t) => {
  let record, link, savedHash, revokedOtp = false
  const user = { _id: new mongoose.Types.ObjectId(), email: 'test@example.com' }
  function stub(target, key, value) {
    const old = target[key]; target[key] = value
    t.after(() => { target[key] = old })
  }
  stub(User, 'findOne', (query) => ({ select: async () => query.email === user.email ? user : null }))
  stub(Reset, 'create', async (data) => { record = { ...data, _id: new mongoose.Types.ObjectId(), usedAt: null }; return record })
  stub(mailer, 'sendPasswordResetEmail', async (data) => { link = data.link })
  stub(mongoose.connection, 'transaction', async (callback) => callback({}))
  stub(Reset, 'findOneAndUpdate', async (query) => {
    if (!record || record.tokenHash !== query.tokenHash || record.usedAt || record.expiresAt <= query.expiresAt.$gt) return null
    record.usedAt = new Date(); return record
  })
  stub(User, 'updateOne', async (query, update) => { savedHash = update.$set.password; return { matchedCount: 1 } })
  stub(Reset, 'updateMany', async () => ({}))
  stub(Otp, 'deleteMany', async () => { revokedOtp = true })
  const controller = require('../controllers/passwordResetController')
  function response() {
    return { code: 200, set() { return this }, status(code) { this.code = code; return this },
      json(body) { this.body = body; return this }, cookie() {}, clearCookie() {} }
  }
  const next = (error) => { throw error }
  let res = response()
  await controller.requestReset({ body: { email: user.email } }, res, next)
  const knownMessage = res.body.message
  const token = new URL(link).searchParams.get('token')
  assert.equal(record.tokenHash, crypto.createHash('sha256').update(token).digest('hex'))
  assert(!JSON.stringify(record).includes(token))
  res = response()
  await controller.requestReset({ body: { email: 'unknown@example.com' } }, res, next)
  assert.equal(res.body.message, knownMessage)
  const body = { token, password: 'NewPassword123', confirmPassword: 'NewPassword123' }
  record.expiresAt = new Date(Date.now() - 1000)
  res = response(); await controller.resetPassword({ body }, res, next)
  assert.equal(res.code, 400); assert.equal(savedHash, undefined)
  record.expiresAt = new Date(Date.now() + 60000)
  res = response(); await controller.resetPassword({ body }, res, next)
  assert.equal(res.code, 200)
  assert.equal(await verifyPassword(body.password, savedHash), true)
  assert.equal(await verifyPassword('oldPassword', savedHash), false)
  assert.equal(revokedOtp, true)
  res = response(); await controller.resetPassword({ body }, res, next)
  assert.equal(res.code, 400)
})
