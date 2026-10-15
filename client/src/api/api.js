// api.js
// EVERY data function of the app lives in this file.
//
// Auth, boards, tasks, and notifications use the backend.
// Some remaining account operations still use mock data.
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

import { mockUsers, mockPages, mockTasks } from '../data/mockData.js'
import { clearWorkspaceSnapshot, workspaceSnapshot, publishWorkspaceChange, publishNotifications } from '../utils/workspaceSnapshot.js'

// ---------- The fake database (kept in memory) ----------
let users = makeCopy(mockUsers)
let pages = makeCopy(mockPages)
let tasks = makeCopy(mockTasks)

// The logged-in user's id is saved in the browser so a refresh keeps you logged in
let currentUserId = localStorage.getItem('morrow-user-id') || ''

// ---------- Small helpers used only inside this file ----------

// Make a full copy, so pages can never change the "database" by accident
function makeCopy(value) {
  return JSON.parse(JSON.stringify(value))
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

export async function login(identifier, password) {
  clearWorkspaceSnapshot()
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export async function verifyLoginOtp(challengeId, otp) {
  clearWorkspaceSnapshot()
  const data = await apiRequest('/api/auth/login/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ challengeId, otp }),
  })
  if (data.user?._id) {
    currentUserId = data.user._id
    localStorage.setItem('morrow-user-id', data.user._id)
  }
  return data.user
}

export async function register(name, username, email, password) {
  const data = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, username, email, password, confirmPassword: password }),
  })

  return data.user
}

export async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' })
  clearWorkspaceSnapshot()
  currentUserId = ''
  localStorage.removeItem('morrow-user-id')
}

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

export async function requestPasswordReset(email) {
  return apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function resetPassword(newPassword, token, confirmPassword) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ password: newPassword, token, confirmPassword }),
  })
}

export async function getUsers() {
  const response = await fetch('/api/users', {
    credentials: 'include',
  })

  return readApiJson(response, 'Failed to load users.')
}
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

  workspaceSnapshot.user = data
  workspaceSnapshot.users = workspaceSnapshot.users.map((user) => user._id === data._id ? data : user)
  publishWorkspaceChange()
  return data
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const response = await fetch('/api/users/me/password', {
    method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Could not update password.')
    error.errors = data.errors
    throw error
  }
  return data
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

export async function getPages() {
  const response = await fetch('/api/boards', {
    credentials: 'include',
  })

  return readApiJson(response, 'Failed to load pages.')
}

export async function getPage(pageId) {
  const response = await fetch(`/api/boards/${pageId}`, {
    credentials: 'include',
  })

  if (response.status === 404) {
    return null
  }

  return readApiJson(response, 'Failed to load page.')
}

export async function createPage(name, type) {
  const response = await fetch('/api/boards', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ name, type }),
  })

  return readApiJson(response, 'Failed to create page.')
}

export async function renamePage(pageId, newName) {
  const response = await fetch(`/api/boards/${pageId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ name: newName }),
  })

  return readApiJson(response, 'Failed to rename page.')
}
export async function deletePage(pageId) {
  const response = await fetch(`/api/boards/${pageId}`, {
    method: 'DELETE',
    body: '{}',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete page.')
  }
}

export async function inviteMember(pageId, email, role) {
  const response = await fetch(`/api/boards/${pageId}/members`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ email, role }),
  })

  return readApiJson(response, 'Failed to invite member.')
}

export async function updateMemberRole(pageId, userId, role) {
  const response = await fetch(`/api/boards/${pageId}/members/${userId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ role }),
  })
  return readApiJson(response, 'Failed to change member role.')
}

// Remove a member from a shared page.
export async function removeMember(pageId, userId) {
  const response = await fetch(`/api/boards/${pageId}/members/${userId}`, {
    method: 'DELETE',
    body: '{}',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  return readApiJson(response, 'Failed to remove member.')
}

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

function notificationTimeLabel(notification) {
  if (notification.timeLabel) return notification.timeLabel
  if (!notification.createdAt) return ''

  const createdAt = new Date(notification.createdAt)
  if (Number.isNaN(createdAt.getTime())) return ''

  const secondsAgo = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000))
  if (secondsAgo < 60) return 'Just now'

  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) return minutesAgo + (minutesAgo === 1 ? ' minute ago' : ' minutes ago')

  const hoursAgo = Math.floor(minutesAgo / 60)
  if (hoursAgo < 24) return hoursAgo + (hoursAgo === 1 ? ' hour ago' : ' hours ago')

  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo === 1) return 'Yesterday'
  return daysAgo + ' days ago'
}

function formatNotification(notification) {
  return {
    ...notification,
    _id: String(notification._id),
    user: notification.user ? String(notification.user) : '',
    task: notification.task ? String(notification.task) : '',
    page: notification.page ? String(notification.page) : '',
    invitation: notification.invitation ? String(notification.invitation) : '',
    timeLabel: notificationTimeLabel(notification),
  }
}

async function readApiJson(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage)
  }

  return data
}

export async function getTasks(loadedBoards) {
  const boards = loadedBoards || await getPages()
  const lists = await Promise.all(boards.map((board) => getTasksByPage(board._id)))
  return lists.flat()
}

export async function getTasksByPage(pageId) {
  const response = await fetch(`/api/boards/${pageId}/tasks`, {
    credentials: 'include',
  })

  return readApiJson(response, 'Failed to load tasks.')
}

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
    body: '{}',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete task.')
  }
}

let notificationRevision = 0
let notificationRequest = null
export async function getNotifications() {
  if (notificationRequest) return notificationRequest
  const revision = notificationRevision
  const userId = workspaceSnapshot.user?._id
  notificationRequest = loadNotifications().finally(() => { notificationRequest = null })
  return notificationRequest

  async function loadNotifications() {
  const response = await fetch('/api/users/notifications', {
    credentials: 'include',
    cache: 'no-store',
  })

  const data = await readApiJson(response, 'Failed to load notifications.')
  if (revision !== notificationRevision || userId !== workspaceSnapshot.user?._id) return workspaceSnapshot.notifications
  workspaceSnapshot.notifications = (data.notifications || []).map(formatNotification)
  publishNotifications()
  return workspaceSnapshot.notifications
  }
}

export async function setNotificationRead(notificationId, isRead) {
  if (!isRead) {
    throw new Error('Notifications can only be marked as read right now.')
  }

  const response = await fetch(`/api/users/notifications/${notificationId}/read`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ isRead: true }),
  })

  const data = await readApiJson(response, 'Failed to mark notification as read.')
  const updated = formatNotification(data.notification)
  notificationRevision++
  workspaceSnapshot.notifications = workspaceSnapshot.notifications.map((item) => item._id === updated._id ? updated : item)
  workspaceSnapshot.unreadCount = workspaceSnapshot.notifications.filter((item) => !item.isRead).length
  publishWorkspaceChange()
  publishNotifications()
  return updated
}

export async function markAllNotificationsRead() {
  const response = await fetch('/api/users/notifications/read-all', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({}),
  })

  const result = await readApiJson(response, 'Failed to mark notifications as read.')
  notificationRevision++
  workspaceSnapshot.notifications = workspaceSnapshot.notifications.map((item) => ({ ...item, isRead: true }))
  workspaceSnapshot.unreadCount = 0
  publishWorkspaceChange()
  publishNotifications()
  return result
}

export async function clearReadNotifications() {
  const response = await fetch('/api/users/notifications/read', {
    method: 'DELETE',
    body: '{}',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  const result = await readApiJson(response, 'Failed to clear read notifications.')
  notificationRevision++
  workspaceSnapshot.notifications = workspaceSnapshot.notifications.filter((item) => !item.isRead)
  publishWorkspaceChange()
  publishNotifications()
  return result
}

