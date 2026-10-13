const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const User = require('../models/User')
const Reset = require('../models/PasswordReset')
const Otp = require('../models/OtpChallenge')
const { hashPassword, verifyPassword } = require('../utils/password')
const { changePassword } = require('../controllers/profilePasswordController')

test('profile verifies current password and stores a hash that works for subsequent login', async (t) => {
  const id = new mongoose.Types.ObjectId()
  let password = await hashPassword('old-password'), invalidated = 0, clearedOtp = 0, conflict = false
  const originalHash = password
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: id, password }) }))
  t.mock.method(User, 'updateOne', async (filter, update) => {
    assert.equal(String(filter._id), String(id))
    if (conflict || filter.password !== password) return { modifiedCount: 0 }
    password = update.$set.password
    return { modifiedCount: 1 }
  })
  t.mock.method(mongoose.connection, 'transaction', async (callback) => callback({}))
  t.mock.method(Reset, 'updateMany', async (filter) => { assert.equal(String(filter.user), String(id)); invalidated++ })
  t.mock.method(Otp, 'deleteMany', async () => { clearedOtp++ })
  async function request(currentPassword, newPassword, confirmPassword = newPassword) {
    const res = { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
    await changePassword({ user: { id: String(id) }, body: { currentPassword, newPassword, confirmPassword } }, res, (error) => { throw error })
    return res
  }
  assert.equal((await request('wrong-password', 'new-password')).code, 400)
  assert.equal(password, originalHash)
  assert.equal((await request('old-password', 'short')).code, 400)
  assert.equal((await request('old-password', 'new-password', 'mismatch')).code, 400)
  const success = await request('old-password', 'new-password')
  assert.equal(success.code, 200)
  assert.equal(success.data.password, undefined)
  assert.notEqual(password, originalHash)
  assert.notEqual(password, 'new-password')
  assert.equal(await verifyPassword('new-password', password), true)
  assert.equal(await verifyPassword('old-password', password), false)
  assert.equal(invalidated, 1)
  assert.equal(clearedOtp, 1)
  assert.equal((await request('old-password', 'another-password')).code, 400)
  conflict = true
  assert.equal((await request('new-password', 'another-password')).code, 409)
  assert.equal(invalidated, 1)
})
