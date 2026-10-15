export const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' }
export const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function toDate(dateString) {
  const parts = dateString.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

export function todayString() {
  return toDateString(new Date())
}

export function addDays(dateString, numberOfDays) {
  const date = toDate(dateString)
  date.setDate(date.getDate() + numberOfDays)
  return toDateString(date)
}

export function formatDate(dateString) {
  if (!dateString) return ''
  const today = todayString()
  if (dateString === today) return 'Today'
  if (dateString === addDays(today, 1)) return 'Tomorrow'
  if (dateString === addDays(today, -1)) return 'Yesterday'
  const date = toDate(dateString)
  return MONTH_NAMES[date.getMonth()] + ' ' + date.getDate()
}

export function formatTime(timeString) {
  if (!timeString) return ''
  const parts = timeString.split(':')
  const hour = Number(parts[0])
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return hour12 + ':' + parts[1] + (hour < 12 ? ' AM' : ' PM')
}

export function formatDue(task) {
  if (!task.dueDate) return 'No date'
  if (task.dueTime) return formatDate(task.dueDate) + ' · ' + formatTime(task.dueTime)
  return formatDate(task.dueDate)
}

export function isOverdue(task) {
  return task.status !== 'done' && task.dueDate !== '' && task.dueDate < todayString()
}

                                                                             
export function getId(value) {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || '')
  return String(value)
}

                                                      
export function isAssignedToMe(task, currentUser) {
  const assigneeId = getId(task.assignee)
  const userId = getId(currentUser)
  return assigneeId !== '' && userId !== '' && assigneeId === userId
}

                       
export function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(' ')
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidUsername(username) {
  return /^[A-Za-z0-9_]{4,}$/.test(username.trim())
}

export function isValidPassword(password) {
  return password.length >= 8
}

export function filterAndSortTasks(tasks, filters) {
  const today = todayString()
  const nextWeek = addDays(today, 7)

  const filtered = tasks.filter((task) => {
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.due === 'overdue' && !isOverdue(task)) return false
    if (filters.due === 'today' && task.dueDate !== today) return false
    if (filters.due === 'week' && !(task.dueDate >= today && task.dueDate <= nextWeek)) return false
    if (filters.due === 'none' && task.dueDate !== '') return false
    return true
  })

  function dueKey(task) {
    return (task.dueDate || '9999-99-99') + ' ' + (task.dueTime || '99:99')
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const statusOrder = { todo: 0, 'in-progress': 1, done: 2 }

  filtered.sort((a, b) => {
    if (filters.sort === 'priority' && a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    if (filters.sort === 'status' && a.status !== b.status) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    if (filters.sort === 'due-latest') {
                                           
      if (!a.dueDate && b.dueDate) return 1
      if (a.dueDate && !b.dueDate) return -1
      return dueKey(b).localeCompare(dueKey(a))
    }
    return dueKey(a).localeCompare(dueKey(b))
  })

  return filtered
}

export const DEFAULT_FILTERS = { priority: 'all', status: 'all', due: 'all', sort: 'due-soonest' }
export function makeEmptyTask(pageId, status) {
  return {
    page: pageId,
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium',
    status: status || 'todo',
    assignee: '',
    reminder: 'none',
    reminderDate: '',
    reminderTime: '',
  }
}
