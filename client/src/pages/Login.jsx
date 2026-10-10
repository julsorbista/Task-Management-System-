import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { login, getPages } from '../api/api.js'
import { isValidEmail } from '../utils/helpers.js'

function Login() {
  const navigate = useNavigate()

  // The demo account is filled in so you can log in right away.
  // Remove these two values when the real backend is connected.
  const [email, setEmail] = useState('maya@morrow.app')
  const [password, setPassword] = useState('morrow123')

  // Error messages shown under the fields
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page

    // 1. Check the fields
    let newEmailError = ''
    let newPasswordError = ''
    if (email.trim() === '') newEmailError = 'Enter your email.'
    else if (!isValidEmail(email)) newEmailError = 'Enter a valid email address.'
    if (password === '') newPasswordError = 'Enter your password.'

    setEmailError(newEmailError)
    setPasswordError(newPasswordError)
    if (newEmailError || newPasswordError) return

    // 2. Try to log in
    try {
      await login(email, password)
      // 3. Open the first page of tasks
      const pages = await getPages()
      if (pages.length > 0) navigate('/pages/' + pages[0]._id + '/list')
      else navigate('/dashboard')
    } catch (error) {
      setPasswordError(error.message)
    }
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
