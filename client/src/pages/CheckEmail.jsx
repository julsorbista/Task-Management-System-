import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import { requestPasswordReset } from '../api/api.js'

function CheckEmail() {
  const location = useLocation()
  const email = location.state && location.state.email ? location.state.email : 'your email address'

  const [wasResent, setWasResent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleResend() {
    if (isSending || !location.state?.email) return
    setIsSending(true)
    setError('')
    try {
      await requestPasswordReset(email)
      setWasResent(true)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AuthCard
      title="Check your email"
      text={<>Check <span style={{ color: 'var(--text)' }}>{email}</span> for your password reset link. It expires in 30 minutes.</>}
    >
      <a
        className="btn btn-wide"
        href="https://mail.google.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open your email
      </a>
      {error && <p role="alert" className="error-text">{error}</p>}

      <p className="auth-bottom">
        Nothing arrived?{' '}
        <button type="button" disabled={isSending || !location.state?.email} className="link" onClick={handleResend}>
          {isSending ? 'Sending…' : 'Resend'}
        </button>{' '}
        or{' '}
        <Link className="link" to="/login">
          back to log in
        </Link>
      </p>
      {wasResent && <p className="auth-bottom">If the account exists, another reset link will be sent.</p>}
    </AuthCard>
  )
}

export default CheckEmail
