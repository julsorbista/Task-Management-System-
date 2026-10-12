import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { login, verifyLoginOtp, getPages } from '../api/api.js'
import { isValidEmail, isValidPassword } from '../utils/helpers.js'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Error messages shown under the fields
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  async function openFirstTaskPage() {
    const pages = await getPages()
    if (pages.length > 0) navigate('/pages/' + pages[0]._id + '/list')
    else navigate('/dashboard')
  }

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page

    // 1. Check the fields
    let newEmailError = ''
    let newPasswordError = ''
    const trimmedEmail = email.trim()
    if (trimmedEmail === '') newEmailError = 'Enter your email.'
    else if (!isValidEmail(trimmedEmail)) newEmailError = 'Enter a valid email address.'
    if (password === '') newPasswordError = 'Enter your password.'
    else if (!isValidPassword(password)) newPasswordError = 'Password must be at least 8 characters.'

    setEmailError(newEmailError)
    setPasswordError(newPasswordError)
    if (newEmailError || newPasswordError) return

    // 2. Check the password and request an OTP
    try {
      const challenge = await login(trimmedEmail, password)
      setOtpChallenge(challenge)
      setOtp('')
      setOtpError('')
    } catch (error) {
      setPasswordError(error.message)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()

    const cleanOtp = otp.trim()
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Enter the 6-digit OTP code.')
      return
    }

    try {
      await verifyLoginOtp(otpChallenge.challengeId, cleanOtp)
      await openFirstTaskPage()
    } catch (error) {
      setOtpError(error.message)
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

          <button type="submit" className="btn btn-primary btn-wide">
            Verify and log in
          </button>
        </form>

        <p className="auth-bottom">
          <button type="button" className="link" onClick={resetLogin}>
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
          <label className="label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className={emailError ? 'input has-error' : 'input'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          {emailError && <div className="error-text">{emailError}</div>}
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

        <button type="submit" className="btn btn-primary btn-wide">
          Log in
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
