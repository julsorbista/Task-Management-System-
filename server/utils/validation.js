function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function isValidUsername(username = '') {
  return /^[A-Za-z0-9_]{4,}$/.test(username.trim())
}

function isValidPassword(password = '') {
  return password.length >= 8
}

function validateLogin(body) {
  const errors = {}
  const identifier = body.identifier || body.email || body.username || ''

  if (identifier.trim() === '') errors.identifier = 'Username or email is required.'
  else if (identifier.includes('@') && !isValidEmail(identifier)) errors.identifier = 'Enter a valid email address.'
  else if (!identifier.includes('@') && !isValidUsername(identifier)) {
    errors.identifier = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
  }

  if (!body.password) errors.password = 'Password is required.'
  else if (!isValidPassword(body.password)) errors.password = 'Password must be at least 8 characters.'

  return { errors, identifier }
}

function validateRegistration(body) {
  const errors = {}

  if (!body.name?.trim()) errors.name = 'Full name is required.'
  if (!body.username?.trim()) errors.username = 'Username is required.'
  else if (!isValidUsername(body.username)) {
    errors.username = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
  }
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
  if (body.username !== undefined) {
    if (!body.username.trim()) errors.username = 'Username is required.'
    else if (!isValidUsername(body.username)) {
      errors.username = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
    }
  }
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
