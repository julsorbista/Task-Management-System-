// Register.jsx
// Registration screen: name, email, password, confirm password.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { register } from '../api/api.js'
import { isValidEmail, isValidPassword, isValidUsername } from '../utils/helpers.js'
import { showToast } from '../utils/toast.js'

function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // One object holds the error message of each field
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    // 1. Check every field and collect the error messages
    const newErrors = {}
    if (name.trim() === '') newErrors.name = 'Enter your name.'
    if (username.trim() === '') newErrors.username = 'Enter your username.'
    else if (!isValidUsername(username)) {
      newErrors.username = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
    }
    if (email.trim() === '') newErrors.email = 'Enter your email.'
    else if (!isValidEmail(email)) newErrors.email = 'Enter a valid email address.'
    if (password === '') newErrors.password = 'Enter your password.'
    else if (!isValidPassword(password)) newErrors.password = 'Use at least 8 characters.'
    if (confirmPassword === '') newErrors.confirmPassword = 'Confirm your password.'
    else if (confirmPassword !== password) newErrors.confirmPassword = 'Passwords do not match.'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    // 2. Create the account, then ask the user to log in with OTP
    try {
      await register(name, username, email, password)
      showToast('Account created. Please log in.')
      navigate('/login')
    } catch (error) {
      if (error.message.toLowerCase().includes('username')) setErrors({ username: error.message })
      else setErrors({ email: error.message })
    }
  }

  return (
    <AuthCard title="Create your account" text="Private tasks for you, shared boards for your team.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="register-name">
            Name
          </label>
          <input
            id="register-name"
            type="text"
            className={errors.name ? 'input has-error' : 'input'}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {errors.name && <div className="error-text">{errors.name}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-username">
            Username
          </label>
          <input
            id="register-username"
            type="text"
            className={errors.username ? 'input has-error' : 'input'}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
          {errors.username && <div className="error-text">{errors.username}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className={errors.email ? 'input has-error' : 'input'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-password">
            Password
          </label>
          <div className="password-field">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className={errors.password ? 'input has-error' : 'input'}
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
          {errors.password && <div className="error-text">{errors.password}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-confirm">
            Confirm password
          </label>
          <div className="password-field">
            <input
              id="register-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              className={errors.confirmPassword ? 'input has-error' : 'input'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} />
            </button>
          </div>
          {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
        </div>

        <button type="submit" className="btn btn-primary btn-wide">
          Create account
        </button>
      </form>

      <p className="auth-bottom">
        Already have an account?{' '}
        <Link className="link" to="/login">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}

export default Register
