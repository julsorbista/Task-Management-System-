const crypto = require('node:crypto')

const KEY_LENGTH = 64
const SALT_LENGTH = 16
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
}

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)

  return [
    'scrypt',
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$')
}

function verifyPassword(password, storedHash = '') {
  const [algorithm, n, r, p, salt, hash] = storedHash.split('$')

  if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !hash) {
    return false
  }

  const expectedHash = Buffer.from(hash, 'base64url')
  const actualHash = crypto.scryptSync(password, Buffer.from(salt, 'base64url'), expectedHash.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })

  return expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash)
}

module.exports = { hashPassword, verifyPassword }
