export const workspaceSnapshot = { user: null, pages: [], tasks: [], notifications: [], unreadCount: 0, users: [], boards: {}, loaded: false }
export function clearWorkspaceSnapshot() {
  Object.assign(workspaceSnapshot, { user: null, pages: [], tasks: [], notifications: [], unreadCount: 0, users: [], boards: {}, loaded: false })
}

export function publishWorkspaceChange() {
  window.dispatchEvent(new Event('morrow-workspace-changed'))
}
