// ResetPassword.jsx
// Choose a new password (new password + confirm password).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { resetPassword } from '../api/api.js'
import { showToast } from '../utils/toast.js'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const newErrors = {}
    if (password.length < 8) newErrors.password = 'Use at least 8 characters.'
    if (confirmPassword === '') newErrors.confirmPassword = 'Confirm your new password.'
    else if (confirmPassword !== password) newErrors.confirmPassword = 'Passwords do not match.'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    await resetPassword(password)
    showToast('Password reset')
    navigate('/password-updated')
  }

  return (
    <AuthCard title="Reset password" text="Choose a new password of at least 8 characters.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="reset-password">
            New password
          </label>
          <div className="password-field">
            <input
              id="reset-password"
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
          <label className="label" htmlFor="reset-confirm">
            Confirm password
          </label>
          <div className="password-field">
            <input
              id="reset-confirm"
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
          Reset password
        </button>
      </form>
    </AuthCard>
  )
}

export default ResetPassword
