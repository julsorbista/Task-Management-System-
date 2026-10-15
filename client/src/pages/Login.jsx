import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import Icon from '../components/Icon.jsx'
import { login, verifyLoginOtp, getPages, getCurrentUser, getTasks, getUsers, getNotifications } from '../api/api.js'
import { workspaceSnapshot } from '../utils/workspaceSnapshot.js'
import { isValidEmail, isValidPassword, isValidUsername } from '../utils/helpers.js'

                                                   
const OTP_LENGTH = 6
const EMPTY_DIGITS = ['', '', '', '', '', '']

function Login() {
  const navigate = useNavigate()
                                                                                 
                                            

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [identifierError, setIdentifierError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [digits, setDigits] = useState(EMPTY_DIGITS)
  const otp = digits.join('')
  const isOtpComplete = /^\d{6}$/.test(otp)
                                                               
  const boxRefs = useRef([])
  const [otpError, setOtpError] = useState('')
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [otpMessage, setOtpMessage] = useState('')
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds])

  async function handleResendOtp() {
    if (isSubmitting || isResending || resendSeconds > 0) return
    setIsResending(true)
    setOtpError('')
    setOtpMessage('')
    try {
      const challenge = await login(identifier.trim(), password)
      if (challenge.otpRequired === false) {
        await openFirstTaskPage()
        return
      }
      setOtpChallenge(challenge)
      setDigits(EMPTY_DIGITS)
      setResendSeconds(60)
      setOtpMessage('A new code was sent. Use the latest email; the old code no longer works.')
    } catch (error) {
      setOtpError(error.message)
    } finally {
      setIsResending(false)
    }
  }

                                                                                        
  function welcomeMessage(user) {
    const firstName = (user?.name || '').trim().split(' ')[0]
    return { toast: firstName ? 'Welcome back, ' + firstName + '!' : 'Welcome back!' }
  }

                                                              
                                                                       
  async function openFirstTaskPage() {
    const invitationReturn = sessionStorage.getItem('morrow-invitation-return')
    if (invitationReturn && /^\/invitations\?(?:token=[a-f0-9]{64}|id=[a-f0-9]{24})(?:&action=(?:accept|decline))?$/.test(invitationReturn)) {
      sessionStorage.removeItem('morrow-invitation-return')
      navigate(invitationReturn, { state: welcomeMessage(await getCurrentUser()) })
      return
    }
    const [pages, user, users, notifications] = await Promise.all([
      getPages(), getCurrentUser(), getUsers(), getNotifications(),
    ])
    const welcome = welcomeMessage(user)
    const tasks = await getTasks(pages)
    Object.assign(workspaceSnapshot, { pages, user, users, notifications, tasks,
      unreadCount: notifications.filter((item) => !item.isRead).length, loaded: true })
    if (pages.length > 0) navigate('/pages/' + pages[0]._id + '/list', { state: welcome })
    else navigate('/dashboard', { state: welcome })
  }

  async function handleSubmit(event) {
    event.preventDefault() 
    if (isSubmitting) return

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

    setIsSubmitting(true)
    try {
      const challenge = await login(trimmedIdentifier, password)
      if (challenge.otpRequired === false) {
        if (!(await getCurrentUser())) throw new Error('Login session could not be established. Please try again.')
        await openFirstTaskPage()
        return
      }
      setOtpChallenge(challenge)
      setResendSeconds(60)
      setOtpMessage('')
      setDigits(EMPTY_DIGITS)
      setOtpError('')
    } catch (error) {
      setPasswordError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isResending) return

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
      setDigits(EMPTY_DIGITS)
      focusBox(0)
    } finally {
      setIsSubmitting(false)
    }
  }

                                          
  function focusBox(index) {
    const box = boxRefs.current[index]
    if (box) box.focus()
  }

                                                       
  function fillBoxes(start, text) {
    const newDigits = [...digits]
    let index = start
    for (const digit of text) {
      if (index >= OTP_LENGTH) break
      newDigits[index] = digit
      index = index + 1
    }
    setDigits(newDigits)
    focusBox(Math.min(index, OTP_LENGTH - 1))
  }

  function handleBoxChange(index, value) {
    const typed = value.replace(/\D/g, '')                
    if (typed === '') return
                                                                              
    if (typed.length >= OTP_LENGTH) {
      fillBoxes(0, typed)
      return
    }
                                                       
    const newDigits = [...digits]
    newDigits[index] = typed[typed.length - 1]
    setDigits(newDigits)
    if (index < OTP_LENGTH - 1) focusBox(index + 1)
  }

  function handleBoxKeyDown(index, event) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const newDigits = [...digits]
      if (digits[index] !== '') {
                         
        newDigits[index] = ''
      } else if (index > 0) {
                                                            
        newDigits[index - 1] = ''
        focusBox(index - 1)
      }
      setDigits(newDigits)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  function handleBoxPaste(index, event) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (pasted === '') return
                                                                                
    fillBoxes(pasted.length >= OTP_LENGTH ? 0 : index, pasted)
  }

  function resetLogin() {
    setOtpChallenge(null)
    setDigits(EMPTY_DIGITS)
    setOtpError('')
  }

  if (otpChallenge) {
    return (
      <AuthCard title="Enter OTP" text={'We sent a 6-digit code to ' + otpChallenge.destination + '.'}>
        <form onSubmit={handleOtpSubmit} noValidate>
          <div className="field otp-field">
            <div className="label" id="login-otp-label">
              OTP code
            </div>
            {                       }
            <div className="otp-boxes" role="group" aria-labelledby="login-otp-label">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { boxRefs.current[index] = element }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label={'Digit ' + (index + 1) + ' of 6'}
                  aria-invalid={otpError ? 'true' : undefined}
                  className={otpError ? 'input otp-box has-error' : 'input otp-box'}
                  value={digit}
                  onChange={(event) => handleBoxChange(index, event.target.value)}
                  onKeyDown={(event) => handleBoxKeyDown(index, event)}
                  onPaste={(event) => handleBoxPaste(index, event)}
                  onFocus={(event) => event.target.select()}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            {otpError && <div className="error-text">{otpError}</div>}
          </div>

          {otpChallenge.demoOtp && (
            <div className="auth-note">
              Demo OTP: <strong>{otpChallenge.demoOtp}</strong>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-wide" disabled={isSubmitting || !isOtpComplete}>
            {isSubmitting ? 'Verifying…' : 'Verify and log in'}
          </button>
        </form>

        <p className="auth-bottom">
          <button type="button" className="link" onClick={handleResendOtp} disabled={isSubmitting || isResending || resendSeconds > 0}>
            {isResending ? 'Sending…' : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
          </button>
        </p>
        {otpMessage && <p role="status" className="auth-bottom auth-bottom-tight">{otpMessage}</p>}
        <p className="auth-bottom auth-bottom-tight">
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
          {isSubmitting ? 'Logging in…' : 'Log in'}
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
