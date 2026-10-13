export const workspaceSnapshot = { user: null, pages: [], tasks: [], notifications: [], unreadCount: 0, users: [], boards: {}, loaded: false }
export function clearWorkspaceSnapshot() {
  Object.assign(workspaceSnapshot, { user: null, pages: [], tasks: [], notifications: [], unreadCount: 0, users: [], boards: {}, loaded: false })
}

export function publishWorkspaceChange() {
  window.dispatchEvent(new Event('morrow-workspace-changed'))
}

export function publishNotifications() {
  workspaceSnapshot.unreadCount = workspaceSnapshot.notifications.filter((item) => !item.isRead).length
  window.dispatchEvent(new Event('morrow-notifications-changed'))
}
