export const workspaceSnapshot = { user: null, pages: [], tasks: [], unreadCount: 0 }
export function clearWorkspaceSnapshot() {
  Object.assign(workspaceSnapshot, { user: null, pages: [], tasks: [], unreadCount: 0 })
}
