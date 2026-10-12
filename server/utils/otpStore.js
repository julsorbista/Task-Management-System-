const crypto = require('crypto')

const OtpChallenge = require('../models/OtpChallenge')
const OTP_TTL_MS = 5 * 60 * 1000

function hashOtp(id, otp) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required')
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${otp}`).digest('hex')
}

async function createOtpChallenge(userId) {

  const otp = String(crypto.randomInt(100000, 1000000))
  const challenge = {
    id: crypto.randomUUID(),
    userId,
    otp,
  }

  await OtpChallenge.create({
    _id: challenge.id, user: userId, otpHash: hashOtp(challenge.id, otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })
  return challenge
}

async function verifyOtpChallenge(challengeId, otp) {
  if (typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId)) return { ok: false, reason: 'expired' }
  if (typeof otp !== 'string' && typeof otp !== 'number') return { ok: false, reason: 'invalid' }
  const challenge = await OtpChallenge.findOneAndUpdate({
    _id: challengeId, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 },
  }, { $inc: { attempts: 1 } }, { new: true })
  if (!challenge) return { ok: false, reason: 'expired' }
  const otpHash = hashOtp(challengeId, String(otp).trim())
  if (!crypto.timingSafeEqual(Buffer.from(challenge.otpHash, 'hex'), Buffer.from(otpHash, 'hex'))) return { ok: false, reason: 'invalid' }
  // Atomic consumption prevents reuse, including concurrent verification requests.
  const consumed = await OtpChallenge.findOneAndDelete({
    _id: challengeId, otpHash, expiresAt: { $gt: new Date() }, attempts: { $lte: 5 },
  })
  return consumed ? { ok: true, userId: String(consumed.user) } : { ok: false, reason: 'expired' }
}

module.exports = { createOtpChallenge, verifyOtpChallenge }
