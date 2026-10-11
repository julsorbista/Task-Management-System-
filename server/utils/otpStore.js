const crypto = require('crypto')

let challenges = []
const OTP_TTL_MS = 5 * 60 * 1000

function removeExpiredChallenges() {
  const now = Date.now()
  challenges = challenges.filter((challenge) => challenge.expiresAt > now)
}

function createOtpChallenge(userId) {
  removeExpiredChallenges()

  const otp = String(crypto.randomInt(100000, 1000000))
  const challenge = {
    id: crypto.randomUUID(),
    userId,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  }

  challenges.push(challenge)
  return challenge
}

function verifyOtpChallenge(challengeId, otp) {
  removeExpiredChallenges()

  const challenge = challenges.find((item) => item.id === challengeId)
  if (!challenge) return { ok: false, reason: 'expired' }
  if (challenge.otp !== String(otp || '').trim()) return { ok: false, reason: 'invalid' }

  challenges = challenges.filter((item) => item.id !== challengeId)
  return { ok: true, userId: challenge.userId }
}

module.exports = { createOtpChallenge, verifyOtpChallenge }
