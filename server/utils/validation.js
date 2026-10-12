function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function isValidPassword(password = '') {
  return password.length >= 8
}

function validateLogin(body) {
  const errors = {}
  const email = body.email || body.identifier || ''

  if (email.trim() === '') errors.email = 'Email address is required.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'

  if (!body.password) errors.password = 'Password is required.'
  else if (!isValidPassword(body.password)) errors.password = 'Password must be at least 8 characters.'

  return { errors, email }
}

function validateRegistration(body) {
  const errors = {}

  if (!body.name?.trim()) errors.name = 'Full name is required.'
  if (!body.email?.trim()) errors.email = 'Email address is required.'
  else if (!isValidEmail(body.email)) errors.email = 'Enter a valid email address.'
  if (!body.password) errors.password = 'Password is required.'
  else if (!isValidPassword(body.password)) errors.password = 'Password must be at least 8 characters.'
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function validateProfile(body) {
  const errors = {}

  if (body.name !== undefined && !body.name.trim()) errors.name = 'Full name is required.'
  if (body.email !== undefined) {
    if (!body.email.trim()) errors.email = 'Email address is required.'
    else if (!isValidEmail(body.email)) errors.email = 'Enter a valid email address.'
  }
  if (body.newPassword !== undefined) {
    if (!isValidPassword(body.newPassword)) errors.newPassword = 'Password must be at least 8 characters.'
    if (body.confirmPassword !== undefined && body.confirmPassword !== body.newPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
  }

  return errors
}

module.exports = { validateLogin, validateProfile, validateRegistration }
