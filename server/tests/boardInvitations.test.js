const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const Invitation = require('../models/BoardInvitation')
const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const User = require('../models/User')
const Notification = require('../models/Notification')
const mailer = require('../utils/mailer')

test('email invitations require recipient consent and do not immediately grant access', async (t) => {
  const owner = new mongoose.Types.ObjectId()
  const recipient = new mongoose.Types.ObjectId()
  const board = new Board({ name: 'Team board', type: 'shared', owner })
  const email = 'recipient@example.com'
  let invitation, emailMessage, memberships = [], notifications = [], failMail = false, registered = false
  const originalUrl = process.env.APP_URL
  process.env.APP_URL = 'https://morrow.example.com'
  t.after(() => { if (originalUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = originalUrl })
  t.mock.method(mailer, 'sendBoardInvitationEmail', async (message) => {
    if (failMail) throw new Error('SMTP unavailable')
    emailMessage = message
  })
  // Load after replacing the mail transport; no real emails or database writes.
  delete require.cache[require.resolve('../controllers/invitationController')]
  const controller = require('../controllers/invitationController')
  t.mock.method(User, 'findOne', async () => registered ? { _id: recipient, email } : null)
  t.mock.method(User, 'findById', async (id) => String(id) === String(owner) ? { name: 'Owner', email: 'owner@example.com' } : { email })
  t.mock.method(Board, 'findById', async () => board)
  t.mock.method(BoardMember, 'exists', async () => false)
  t.mock.method(BoardMember, 'updateOne', async (filter, update, options) => {
    assert.equal(String(filter.user), String(recipient))
    assert.equal(options.upsert, true)
    memberships.push(update.$setOnInsert.role)
  })
  t.mock.method(Invitation, 'updateMany', async () => ({}))
  t.mock.method(Invitation, 'create', async (data) => {
    invitation = { _id: new mongoose.Types.ObjectId(), ...data, status: 'pending' }
    return invitation
  })
  t.mock.method(Invitation, 'deleteOne', async () => { invitation = null })
  t.mock.method(Invitation, 'findOne', async (filter) => invitation && (filter._id ? String(invitation._id) === String(filter._id) : invitation.tokenHash === filter.tokenHash) ? invitation : null)
  t.mock.method(Invitation, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.status, 'pending')
    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= filter.expiresAt.$gt) return null
    invitation.status = update.$set.status
    return invitation
  })
  t.mock.method(Notification, 'create', async (data) => { notifications.push(...(Array.isArray(data) ? data : [data])) })
  t.mock.method(mongoose.connection, 'transaction', async (callback) => callback({}))
  function response() {
    return { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, set() { return this } }
  }
  async function send(role = 'viewer') {
    const res = response()
    await controller.sendInvitation({ board, user: { id: String(owner) }, body: { email, role } }, res, (error) => { throw error })
    return res
  }
  async function respond(action, token, userId = recipient) {
    const res = response()
    await controller.respondToInvitation({ params: { token }, user: { id: String(userId) }, body: { action } }, res, (error) => { throw error })
    return res
  }

  assert.equal((await send()).code, 404)
  assert.equal(invitation, undefined)
  assert.equal(emailMessage, undefined)
  assert.equal(notifications.length, 0)
  assert.deepEqual(memberships, [])
  registered = true
  assert.equal((await send()).code, 201)
  assert.deepEqual(memberships, [])
  assert.equal(notifications.length, 1)
  assert.equal(String(notifications[0].invitation), String(invitation._id))
  const token = new URL(emailMessage.link).searchParams.get('token')
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.equal(invitation.tokenHash, crypto.createHash('sha256').update(token).digest('hex'))
  assert.notEqual(invitation.tokenHash, token)
  assert.equal(new URL(emailMessage.link).origin, 'https://morrow.example.com')
  assert.equal((await respond('accept', token, owner)).code, 403)
  assert.deepEqual(memberships, [])
  const read = response()
  await controller.getInvitation({ params: { token }, user: { id: String(recipient) } }, read, (error) => { throw error })
  assert.equal(read.data.status, 'pending') // GET from email scanners never accepts.
  assert.deepEqual(memberships, [])
  const fromNotification = response()
  await controller.getInvitation({ params: { token: String(invitation._id) }, user: { id: String(recipient) } }, fromNotification, (error) => { throw error })
  assert.equal(fromNotification.data.status, 'pending')
  assert.equal((await respond('accept', String(invitation._id), owner)).code, 403)
  assert.equal((await respond('accept', token)).data.status, 'accepted')
  assert.equal(notifications.length, 2)
  assert.equal(String(notifications[1].user), String(owner))
  assert.equal(notifications[1].title, 'Invitation accepted')
  assert.match(notifications[1].message, /recipient@example.com accepted.*Team board/)
  assert.equal(String(notifications[1].page), String(board._id))
  assert.deepEqual(memberships, ['viewer'])
  assert.equal((await respond('accept', token)).code, 409)
  assert.equal(notifications.length, 2)
  assert.deepEqual(memberships, ['viewer'])

  await send('editor')
  const secondToken = new URL(emailMessage.link).searchParams.get('token')
  assert.equal((await respond('decline', secondToken)).data.status, 'declined')
  assert.equal(notifications.length, 4)
  assert.equal(String(notifications[3].user), String(owner))
  assert.equal(notifications[3].title, 'Invitation declined')
  assert.match(notifications[3].message, /declined.*Team board/)
  assert.deepEqual(memberships, ['viewer'])
  assert.equal((await respond('accept', secondToken)).code, 409)
  await send('editor')
  const thirdToken = new URL(emailMessage.link).searchParams.get('token')
  assert.equal((await respond('accept', thirdToken)).code, 200)
  assert.deepEqual(memberships, ['viewer', 'editor'])
  await send()
  const expiredToken = new URL(emailMessage.link).searchParams.get('token')
  invitation.expiresAt = new Date(Date.now() - 1)
  assert.equal((await respond('accept', expiredToken)).code, 410)
  assert.equal((await respond('accept', 'bad-token')).code, 400)
  failMail = true
  assert.equal((await send()).code, 502)
  assert.equal(invitation, null)
})
