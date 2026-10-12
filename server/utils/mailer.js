const nodemailer = require('nodemailer')

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function sendLoginOtpEmail({ to, otp }) {
  if (!hasSmtpConfig()) {
    console.warn('SMTP is not configured. OTP email was not sent.')
    return { sent: false }
  }

  const transporter = createTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  await transporter.sendMail({
    from,
    to,
    subject: 'Your Morrow login OTP',
    text: `Your Morrow login OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Morrow login OTP</h2>
        <p>Use this code to finish logging in:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 5 minutes.</p>
      </div>
    `,
  })

  return { sent: true }
}

module.exports = { sendLoginOtpEmail }
