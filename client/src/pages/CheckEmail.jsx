import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import { requestPasswordReset } from '../api/api.js'

function CheckEmail() {
  // The email was passed along by the Forgot password screen
  const location = useLocation()
  const email = location.state && location.state.email ? location.state.email : 'your email address'

  const [wasResent, setWasResent] = useState(false)

  async function handleResend() {
    await requestPasswordReset(email)
    setWasResent(true)
  }

  return (
    <AuthCard
      title="Check your email"
      text={'We sent a password reset link to ' + email + '. It expires in 30 minutes.'}
    >
      {/* There is no real email yet, so this button stands in for the link in the email */}
      <Link className="btn btn-wide" to="/reset-password">
        Open the reset link
      </Link>

      <p className="auth-bottom">
        Nothing arrived?{' '}
        <button type="button" className="link" onClick={handleResend}>
          Resend
        </button>{' '}
        or{' '}
        <Link className="link" to="/login">
          back to log in
        </Link>
      </p>
      {wasResent && <p className="auth-bottom">Reset link sent again.</p>}
    </AuthCard>
  )
}

export default CheckEmail
