import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { login, verifyLoginOtp, getPages, getCurrentUser } from '../api/api.js'
import { isValidEmail, isValidPassword, isValidUsername } from '../utils/helpers.js'

function Login() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // Error messages shown under the fields
  const [identifierError, setIdentifierError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function openFirstTaskPage() {
    const pages = await getPages()
    if (pages.length > 0) navigate('/pages/' + pages[0]._id + '/list')
    else navigate('/dashboard')
  }

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    if (isSubmitting) return

    // 1. Check the fields
    let newIdentifierError = ''
    let newPasswordError = ''
    const trimmedIdentifier = identifier.trim()
    if (trimmedIdentifier === '') newIdentifierError = 'Enter your username or email.'
    else if (trimmedIdentifier.includes('@') && !isValidEmail(trimmedIdentifier)) newIdentifierError = 'Enter a valid email address.'
    else if (!trimmedIdentifier.includes('@') && !isValidUsername(trimmedIdentifier)) {
      newIdentifierError = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
    }
    if (password === '') newPasswordError = 'Enter your password.'
    else if (!isValidPassword(password)) newPasswordError = 'Password must be at least 8 characters.'

    setIdentifierError(newIdentifierError)
    setPasswordError(newPasswordError)
    if (newIdentifierError || newPasswordError) return

    // 2. Check the password and request an OTP
    setIsSubmitting(true)
    try {
      const challenge = await login(trimmedIdentifier, password)
      if (challenge.otpRequired === false) {
        if (!(await getCurrentUser())) throw new Error('Login session could not be established. Please try again.')
        await openFirstTaskPage()
        return
      }
      setOtpChallenge(challenge)
      setOtp('')
      setOtpError('')
    } catch (error) {
      setPasswordError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const cleanOtp = otp.trim()
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Enter the 6-digit OTP code.')
      return
    }

    setIsSubmitting(true)
    try {
      await verifyLoginOtp(otpChallenge.challengeId, cleanOtp)
      if (!(await getCurrentUser())) {
        throw new Error('Login session could not be established. Please restart login.')
      }
      await openFirstTaskPage()
    } catch (error) {
      setOtpError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetLogin() {
    setOtpChallenge(null)
    setOtp('')
    setOtpError('')
  }

  if (otpChallenge) {
    return (
      <AuthCard title="Enter OTP" text={'We sent a 6-digit code to ' + otpChallenge.destination + '.'}>
        <form onSubmit={handleOtpSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="login-otp">
              OTP code
            </label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              maxLength="6"
              className={otpError ? 'input otp-input has-error' : 'input otp-input'}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              autoFocus
            />
            {otpError && <div className="error-text">{otpError}</div>}
          </div>

          {otpChallenge.demoOtp && (
            <div className="auth-note">
              Demo OTP: <strong>{otpChallenge.demoOtp}</strong>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-wide" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying…' : 'Verify and log in'}
          </button>
        </form>

        <p className="auth-bottom">
          <button type="button" className="link" onClick={resetLogin} disabled={isSubmitting}>
            Use a different account
          </button>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Log in" text="Welcome back. Pick up where you left off.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-identifier">
            Username or email
          </label>
          <input
            id="login-identifier"
            type="text"
            className={identifierError ? 'input has-error' : 'input'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />
          {identifierError && <div className="error-text">{identifierError}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="login-password">
            Password
          </label>
          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={passwordError ? 'input has-error' : 'input'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} />
            </button>
          </div>
          {passwordError && <div className="error-text">{passwordError}</div>}
          <div className="auth-forgot">
            <Link className="link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-wide" disabled={isSubmitting}>
          {isSubmitting ? 'Sending OTP…' : 'Log in'}
        </button>
      </form>

      <p className="auth-bottom">
        New to Morrow?{' '}
        <Link className="link" to="/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

export default Login
