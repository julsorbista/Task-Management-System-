const crypto = require('crypto')

let users = [
  {
    _id: 'u1',
    name: 'Maya Reyes',
    username: 'maya',
    email: 'maya@morrow.app',
    password: 'morrow123',
    photo: '',
  },
]

function hidePassword(user) {
  if (!user) return null
  const { password, ...safeUser } = user
  return safeUser
}

function findById(userId) {
  return users.find((user) => user._id === userId)
}

function findByIdentifier(identifier) {
  const value = identifier.trim().toLowerCase()
  return users.find((user) => user.email.toLowerCase() === value || user.username.toLowerCase() === value)
}

function isUsernameTaken(username, currentUserId = '') {
  return users.some(
    (user) => user._id !== currentUserId && user.username.toLowerCase() === username.trim().toLowerCase()
  )
}

function isEmailTaken(email, currentUserId = '') {
  return users.some((user) => user._id !== currentUserId && user.email.toLowerCase() === email.trim().toLowerCase())
}

function createUser({ name, username, email, password }) {
  const user = {
    _id: crypto.randomUUID(),
    name: name.trim(),
    username: username.trim(),
    email: email.trim(),
    password,
    photo: '',
  }

  users.push(user)
  return user
}

function updateUser(userId, changes) {
  const user = findById(userId)
  if (!user) return null

  if (changes.name !== undefined) user.name = changes.name.trim()
  if (changes.username !== undefined) user.username = changes.username.trim()
  if (changes.email !== undefined) user.email = changes.email.trim()
  if (changes.photo !== undefined) user.photo = changes.photo
  if (changes.password !== undefined) user.password = changes.password

  return user
}

module.exports = {
  createUser,
  findById,
  findByIdentifier,
  hidePassword,
  isEmailTaken,
  isUsernameTaken,
  updateUser,
}
