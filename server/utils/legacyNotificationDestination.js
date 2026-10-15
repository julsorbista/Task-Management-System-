                                                                             
function legacyNotificationDestination(notification, { boards, tasks, invitations = [] }) {
  if (notification.task || notification.page || notification.invitation) return null
  const assigned = /^You were assigned to "([\s\S]+)"\.$/.exec(notification.message || '')
  if (assigned && notification.type === 'assigned') {
    const matches = tasks.filter((task) => task.title === assigned[1])
    return matches.length === 1 ? { task: matches[0]._id, page: matches[0].board } : null
  }
  if (notification.type !== 'shared') return null
  const invited = /^You were invited to "([\s\S]+)"(?:\.| as (?:viewer|editor)\.)/.exec(notification.message || '')
  const responded = / (?:accepted|declined) your invitation to "([\s\S]+)"\.$/.exec(notification.message || '')
  const name = invited?.[1] || responded?.[1]
  if (!name) return null
  const matches = boards.filter((board) => board.name === name)
  if (matches.length !== 1) return null
  const board = matches[0]
  if (invited) {
    const pending = invitations.filter((item) => String(item.board) === String(board._id) && String(item.invitedBy) === String(board.owner))
    if (pending.length === 1) return { invitation: pending[0]._id }
  }
  return board.accessible ? { page: board._id } : null
}

module.exports = legacyNotificationDestination
