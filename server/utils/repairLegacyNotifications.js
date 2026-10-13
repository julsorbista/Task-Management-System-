const Board = require('../models/Board')
const BoardMember = require('../models/BoardMember')
const Task = require('../models/Task')
const User = require('../models/User')
const Invitation = require('../models/BoardInvitation')
const Notification = require('../models/Notification')
const destinationFor = require('./legacyNotificationDestination')

module.exports = async function repairLegacyNotifications(notifications, userId) {
  const legacy = notifications.filter((item) => !item.task && !item.page && !item.invitation && ['assigned', 'shared'].includes(item.type))
  if (!legacy.length) return
  const [memberships, user] = await Promise.all([
    BoardMember.find({ user: userId, role: { $in: ['editor', 'viewer'] } }).select('board').lean(),
    User.findById(userId).select('email').lean(),
  ])
  const invitations = user ? await Invitation.find({ email: user.email, status: 'pending', expiresAt: { $gt: new Date() } })
    .select('board invitedBy').lean() : []
  const memberBoardIds = memberships.map((item) => item.board)
  const boards = await Board.find({ $or: [
    { owner: userId }, { type: 'shared', _id: { $in: memberBoardIds } },
    { type: 'shared', _id: { $in: invitations.map((item) => item.board) } },
  ] }).select('name owner type').lean()
  for (const board of boards) board.accessible = String(board.owner) === String(userId) || memberBoardIds.some((id) => String(id) === String(board._id))
  const tasks = await Task.find({ board: { $in: boards.filter((board) => board.accessible).map((board) => board._id) } }).select('title board').lean()
  const changes = legacy.map((notification) => ({ notification, destination: destinationFor(notification, { boards, tasks, invitations }) }))
    .filter((item) => item.destination)
  if (!changes.length) return
  await Notification.bulkWrite(changes.map(({ notification, destination }) => ({ updateOne: {
    filter: { _id: notification._id, user: userId, task: null, page: null, invitation: null },
    update: { $set: destination },
  } })))
  for (const { notification, destination } of changes) Object.assign(notification, destination)
}
