const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto')
const { promisify } = require('node:util')
const deriveKey = promisify(scrypt)

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await deriveKey(password, salt, 64)
  return `scrypt:${salt}:${key.toString('hex')}`
}

async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false
  const parts = storedHash.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt' ||
      !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false
  const actual = await deriveKey(password, parts[1], 64)
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'))
}

module.exports = { hashPassword, verifyPassword }
