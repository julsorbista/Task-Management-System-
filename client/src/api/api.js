// api.js
// EVERY data function of the app lives in this file.
//
// Right now there is no backend, so these functions read and change
// arrays kept in the browser's memory (they start as copies of mockData.js).
// Refreshing the browser resets the data.
//
// FOR THE BACKEND DEVELOPER:
// Each function is "async" and returns the same shape a real API would.
// Replace the body of each function with a fetch call, for example:
//
//   export async function getTasks() {
//     const response = await fetch('/api/tasks')
//     return response.json()
//   }
//
// The pages only call these functions, so nothing else needs to change.

import { mockUsers, mockPages, mockTasks, mockNotifications } from '../data/mockData.js'

// ---------- The fake database (kept in memory) ----------
let users = makeCopy(mockUsers)
let pages = makeCopy(mockPages)
let tasks = makeCopy(mockTasks)
let notifications = makeCopy(mockNotifications)

// The logged-in user's id is saved in the browser so a refresh keeps you logged in
let currentUserId = localStorage.getItem('morrow-user-id') || ''
let loginOtpChallenges = []

// ---------- Small helpers used only inside this file ----------

// Make a full copy, so pages can never change the "database" by accident
function makeCopy(value) {
  return JSON.parse(JSON.stringify(value))
}

// Make a new unique id (the real database will do this itself)
function makeId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function removeExpiredOtpChallenges() {
  loginOtpChallenges = loginOtpChallenges.filter((challenge) => challenge.expiresAt > Date.now())
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.')
  }
  return data
}

function isNetworkError(error) {
  return error instanceof TypeError
}

// Remove the password before sending a user to the screen
function hidePassword(user) {
  const copy = makeCopy(user)
  delete copy.password
  return copy
}

// =====================================================
// AUTH
// =====================================================

// Start login. Throws an error when the username/email or password is wrong.
export async function login(identifier, password) {
  try {
    return await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
  } catch (error) {
    if (!isNetworkError(error)) throw error
  }

  const value = identifier.trim().toLowerCase()
  const user = users.find((u) => u.email.toLowerCase() === value || u.username.toLowerCase() === value)
  if (!user || user.password !== password) {
    throw new Error('Incorrect username/email or password.')
  }

  removeExpiredOtpChallenges()
  const otp = makeOtp()
  const challenge = {
    _id: makeId('otp'),
    userId: user._id,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  }
  loginOtpChallenges.push(challenge)

  return {
    otpRequired: true,
    challengeId: challenge._id,
    delivery: 'email',
    destination: user.email,
    demoOtp: otp,
  }
}

// Finish login after the OTP has been entered.
export async function verifyLoginOtp(challengeId, otp) {
  try {
    const data = await apiRequest('/api/auth/login/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp }),
    })
    if (data.user?._id) {
      currentUserId = data.user._id
      localStorage.setItem('morrow-user-id', data.user._id)
    }
    return data.user
  } catch (error) {
    if (!isNetworkError(error)) throw error
  }

  removeExpiredOtpChallenges()
  const challenge = loginOtpChallenges.find((item) => item._id === challengeId)
  if (!challenge) {
    throw new Error('The OTP expired. Please log in again.')
  }
  if (challenge.otp !== otp.trim()) {
    throw new Error('Incorrect OTP code.')
  }

  loginOtpChallenges = loginOtpChallenges.filter((item) => item._id !== challengeId)
  currentUserId = challenge.userId
  localStorage.setItem('morrow-user-id', challenge.userId)
  const user = users.find((u) => u._id === challenge.userId)
  return hidePassword(user)
}

// Create an account and log in. Throws an error when the username or email is taken.
export async function register(name, username, email, password) {
  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password, confirmPassword: password }),
    })

    if (!users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) {
      const user = {
        _id: data.user?._id || makeId('u'),
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        photo: '',
      }
      users.push(user)
      pages.push({
        _id: makeId('p'),
        name: 'My tasks',
        type: 'private',
        owner: user._id,
        members: [{ user: user._id, role: 'owner' }],
      })
    }

    return data.user
  } catch (error) {
    if (!isNetworkError(error)) throw error
  }

  const usernameTaken = users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())
  const emailTaken = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (usernameTaken) {
    throw new Error('This username is already taken.')
  }
  if (emailTaken) {
    throw new Error('An account with this email already exists.')
  }
  const newUser = { _id: makeId('u'), name: name.trim(), username: username.trim(), email: email.trim(), password, photo: '' }
  users.push(newUser)

  // Every new user starts with one private page
  pages.push({
    _id: makeId('p'),
    name: 'My tasks',
    type: 'private',
    owner: newUser._id,
    members: [{ user: newUser._id, role: 'owner' }],
  })

  return hidePassword(newUser)
}

// Log out
export async function logout() {
  currentUserId = ''
  localStorage.removeItem('morrow-user-id')
}

// The logged-in user, or null when nobody is logged in
export async function getCurrentUser() {
  const response = await fetch('/api/users/me', {
    credentials: 'include',
  })

  const data = await response.json()

  if (response.status === 401 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get current user.')
  }

  return data
}

// Ask for a password reset email. (The real backend sends the email.)
// We remember the email so resetPassword knows which account to change.
export async function requestPasswordReset(email) {
  sessionStorage.setItem('morrow-reset-email', email.trim())
  return { message: 'Reset link sent.' }
}

// Set a new password after following the reset link
export async function resetPassword(newPassword) {
  const email = sessionStorage.getItem('morrow-reset-email') || ''
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (user) {
    user.password = newPassword
  }
  sessionStorage.removeItem('morrow-reset-email')
  return { message: 'Password updated.' }
}

// =====================================================
// USERS AND PROFILE
// =====================================================

// All users (used to show names and avatars)
export async function getUsers() {
  const response = await fetch('/api/users', {
    credentials: 'include',
  })

  return readApiJson(response, 'Failed to load users.')
}

// Change the logged-in user's name, email or photo
export async function updateProfile(changes) {
  const profileChanges = {}
  if (changes.name !== undefined) profileChanges.name = changes.name
  if (changes.email !== undefined) profileChanges.email = changes.email
  if (changes.photo !== undefined) profileChanges.photo = changes.photo

  const response = await fetch('/api/users/me', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(profileChanges),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update profile.')
  }

  return data
}

// Change the password. Throws an error when the current password is wrong.
export async function changePassword(currentPassword, newPassword) {
  const user = users.find((u) => u._id === currentUserId)
  if (user.password !== currentPassword) {
    throw new Error('Current password is incorrect.')
  }
  user.password = newPassword
  return { message: 'Password updated.' }
}

// Delete the logged-in user's account, the pages they own and those pages' tasks
export async function deleteAccount() {
  const ownedPageIds = pages.filter((p) => p.owner === currentUserId).map((p) => p._id)
  tasks = tasks.filter((t) => !ownedPageIds.includes(t.page))
  pages = pages.filter((p) => p.owner !== currentUserId)
  // Also leave the shared pages owned by other people
  pages.forEach((p) => {
    p.members = p.members.filter((m) => m.user !== currentUserId)
  })
  users = users.filter((u) => u._id !== currentUserId)
  await logout()
}

// =====================================================
// PAGES (the Private and Shared lists in the sidebar)
// =====================================================

// Pages the logged-in user can see
export async function getPages() {
  const myPages = pages.filter((p) => p.members.some((m) => m.user === currentUserId))
  return makeCopy(myPages)
}

// One page by id, or null when it does not exist
export async function getPage(pageId) {
  const response = await fetch(`/api/boards/${pageId}`, {
    credentials: 'include',
  })

  if (response.status === 404) {
    return null
  }

  return readApiJson(response, 'Failed to load page.')
}

// Add a page. type is 'private' or 'shared'.
export async function createPage(name, type) {
  const newPage = {
    _id: makeId('p'),
    name,
    type,
    owner: currentUserId,
    members: [{ user: currentUserId, role: 'owner' }],
  }
  pages.push(newPage)
  return makeCopy(newPage)
}

// Rename a page
export async function renamePage(pageId, newName) {
  const page = pages.find((p) => p._id === pageId)
  page.name = newName
  return makeCopy(page)
}

// Delete a page and every task on it
export async function deletePage(pageId) {
  pages = pages.filter((p) => p._id !== pageId)
  tasks = tasks.filter((t) => t.page !== pageId)
}

// =====================================================
// SHARING (members of a shared page)
// =====================================================

// Invite someone by email. role is 'editor' or 'viewer'.
// Throws an error when the person already has access.
export async function inviteMember(pageId, email, role) {
  const page = pages.find((p) => p._id === pageId)
  let user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())

  // If nobody has this email yet, make a simple user from the email address
  if (!user) {
    const nameFromEmail = email.trim().split('@')[0]
    user = { _id: makeId('u'), name: nameFromEmail, username: makeId('guest'), email: email.trim(), password: '', photo: '' }
    users.push(user)
  }

  if (page.members.some((m) => m.user === user._id)) {
    throw new Error('This person already has access.')
  }
  page.members.push({ user: user._id, role })
  return makeCopy(page)
}

// Change a member's role to 'editor' or 'viewer'
export async function updateMemberRole(pageId, userId, role) {
  const page = pages.find((p) => p._id === pageId)
  const member = page.members.find((m) => m.user === userId)
  member.role = role
  return makeCopy(page)
}

// Remove a member from a page. Their tasks on that page become unassigned.
export async function removeMember(pageId, userId) {
  const page = pages.find((p) => p._id === pageId)
  page.members = page.members.filter((m) => m.user !== userId)
  tasks.forEach((t) => {
    if (t.page === pageId && t.assignee === userId) t.assignee = ''
  })
  return makeCopy(page)
}

// =====================================================
// TASKS
// =====================================================

const taskFields = [
  'title',
  'description',
  'dueDate',
  'dueTime',
  'priority',
  'status',
  'assignee',
  'reminder',
  'reminderDate',
  'reminderTime',
]

function taskPayload(taskData) {
  const payload = {}

  for (const field of taskFields) {
    if (taskData[field] !== undefined) {
      payload[field] = taskData[field]
    }
  }

  return payload
}

async function readApiJson(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage)
  }

  return data
}

// Every task on the pages the logged-in user can see
export async function getTasks() {
  const myPageIds = pages.filter((p) => p.members.some((m) => m.user === currentUserId)).map((p) => p._id)
  return makeCopy(tasks.filter((t) => myPageIds.includes(t.page)))
}

// The tasks of one page
export async function getTasksByPage(pageId) {
  const response = await fetch(`/api/boards/${pageId}/tasks`, {
    credentials: 'include',
  })

  return readApiJson(response, 'Failed to load tasks.')
}

// Add a task. taskData holds the task fields (see mockData.js).
export async function createTask(taskData) {
  const response = await fetch(`/api/boards/${taskData.page}/tasks`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(taskPayload(taskData)),
  })

  return readApiJson(response, 'Failed to create task.')
}

// Change a task. changes holds only the fields that changed.
export async function updateTask(pageIdOrTaskId, taskIdOrChanges, maybeChanges) {
  const hasPageId = maybeChanges !== undefined
  const pageId = hasPageId ? pageIdOrTaskId : taskIdOrChanges?.page
  const taskId = hasPageId ? taskIdOrChanges : pageIdOrTaskId
  const changes = hasPageId ? maybeChanges : taskIdOrChanges

  if (!pageId) {
    throw new Error('Task page is required to update a task.')
  }

  const response = await fetch(`/api/boards/${pageId}/tasks/${taskId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(taskPayload(changes)),
  })

  return readApiJson(response, 'Failed to update task.')
}

// Delete a task
export async function deleteTask(pageId, taskId) {
  const response = await fetch(`/api/boards/${pageId}/tasks/${taskId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete task.')
  }
}

// =====================================================
// NOTIFICATIONS
// =====================================================

// The logged-in user's notifications
export async function getNotifications() {
  return makeCopy(notifications.filter((n) => n.user === currentUserId))
}

// Mark one notification as read (true) or unread (false)
export async function setNotificationRead(notificationId, isRead) {
  const notification = notifications.find((n) => n._id === notificationId)
  notification.isRead = isRead
  return makeCopy(notification)
}

// Mark all of the user's notifications as read
export async function markAllNotificationsRead() {
  notifications.forEach((n) => {
    if (n.user === currentUserId) n.isRead = true
  })
}

// Remove every notification that is already read
export async function clearReadNotifications() {
  notifications = notifications.filter((n) => !(n.user === currentUserId && n.isRead))
}

