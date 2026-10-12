// MongoDB is the shared user store for auth and profile routes.
const mongoose = require('mongoose')
const User = require('./User')
const Board = require('./Board')
const BoardMember = require('./BoardMember')
const { hashPassword } = require('../utils/password')
function hidePassword(user) {
  if (!user) return null
  const data = user.toObject ? user.toObject() : { ...user }
  delete data.password
  data._id = String(data._id)
  return data
}
function findById(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return Promise.resolve(null)
  return User.findById(id).select('+password')
}
function findByIdentifier(identifier) {
  const value = identifier.trim().toLowerCase()
  return User.findOne({ $or: [{ email: value }, { username: value }] }).select('+password')
}
async function isUsernameTaken(username, currentUserId = '') {
  const query = { username: username.trim().toLowerCase() }
  if (currentUserId) query._id = { $ne: currentUserId }
  return Boolean(await User.exists(query))
}
async function isEmailTaken(email, currentUserId = '') {
  const query = { email: email.trim().toLowerCase() }
  if (currentUserId) query._id = { $ne: currentUserId }
  return Boolean(await User.exists(query))
}
async function createUser({ name, username, email, password }) {
  const passwordHash = await hashPassword(password)
  return mongoose.connection.transaction(async (session) => {
    const [user] = await User.create([{
      name: name.trim(), username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(), password: passwordHash,
    }], { session })
    const [board] = await Board.create([{
      name: 'My tasks', type: 'private', owner: user._id,
    }], { session })
    await BoardMember.create([{
      board: board._id, user: user._id, role: 'owner',
    }], { session })
    return user
  })
}
async function updateUser(id, changes) {
  const update = {}
  for (const field of ['name', 'username', 'email', 'photo']) {
    if (changes[field] !== undefined) update[field] = changes[field]
  }
  if (changes.password !== undefined) update.password = await hashPassword(changes.password)
  return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
}
module.exports = { createUser, findById, findByIdentifier, hidePassword,
  isEmailTaken, isUsernameTaken, updateUser }
