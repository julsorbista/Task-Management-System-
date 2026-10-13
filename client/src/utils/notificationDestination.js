export function notificationDestination(notification, tasks = []) {
  if (notification.invitation) return `/invitations?id=${encodeURIComponent(notification.invitation)}`
  const task = tasks.find((item) => item._id === notification.task)
  const page = notification.page || task?.page
  if (page && notification.task) return `/pages/${encodeURIComponent(page)}/list?task=${encodeURIComponent(notification.task)}`
  if (page) return `/pages/${encodeURIComponent(page)}/list`
  return null
}
