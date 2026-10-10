// ForgotPassword.jsx
// Enter your email to get a password reset link.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import { requestPasswordReset } from '../api/api.js'
import { isValidEmail } from '../utils/helpers.js'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (email.trim() === '') {
      setEmailError('Enter your email.')
      return
    }
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }

    await requestPasswordReset(email)
    // Go to the "check your email" screen and tell it which email was used
    navigate('/check-email', { state: { email: email.trim() } })
  }

  return (
    <AuthCard title="Forgot password" text="Enter your email and we will send you a reset link.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            className={emailError ? 'input has-error' : 'input'}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError('')
            }}
          />
          {emailError && <div className="error-text">{emailError}</div>}
        </div>

        <button type="submit" className="btn btn-primary btn-wide">
          Send reset link
        </button>
      </form>

      <p className="auth-bottom">
        <Link className="link" to="/login">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  )
}

export default ForgotPassword
