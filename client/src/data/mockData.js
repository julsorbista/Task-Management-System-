import { todayString, addDays } from '../utils/helpers.js'
const today = todayString()

function day(offset) {
  return addDays(today, offset)
}

export const mockUsers = [
  { _id: 'u1', name: 'Maya Reyes', username: 'maya', email: 'maya@morrow.app', password: 'morrow123', photo: '' },
  { _id: 'u2', name: 'Daniel Kim', username: 'daniel', email: 'daniel@northfield.co', password: 'password1', photo: '' },
  { _id: 'u3', name: 'Amara Okafor', username: 'amara', email: 'amara@northfield.co', password: 'password1', photo: '' },
  { _id: 'u4', name: 'Lucas Silva', username: 'lucas', email: 'lucas@northfield.co', password: 'password1', photo: '' },
  { _id: 'u5', name: 'Priya Nair', username: 'priya', email: 'priya@northfield.co', password: 'password1', photo: '' },
]

export const mockPages = [
  { _id: 'p1', name: 'My tasks', type: 'private', owner: 'u1', members: [{ user: 'u1', role: 'owner' }] },
  { _id: 'p2', name: 'Someday', type: 'private', owner: 'u1', members: [{ user: 'u1', role: 'owner' }] },
  {
    _id: 'p3',
    name: 'Website relaunch',
    type: 'shared',
    owner: 'u1',
    members: [
      { user: 'u1', role: 'owner' },
      { user: 'u2', role: 'editor' },
      { user: 'u3', role: 'editor' },
      { user: 'u4', role: 'viewer' },
    ],
  },
  {
    _id: 'p4',
    name: 'Q4 planning',
    type: 'shared',
    owner: 'u5',
    members: [
      { user: 'u5', role: 'owner' },
      { user: 'u1', role: 'editor' },
      { user: 'u2', role: 'viewer' },
    ],
  },
]

function makeTask(_id, page, title, description, dueDate, dueTime, priority, status, extra) {
  return {
    _id,
    page,
    title,
    description,
    dueDate,
    dueTime,
    priority,
    status,
    assignee: '',
    reminder: 'none',
    reminderDate: '',
    reminderTime: '',
    completedAt: '',
    ...extra,
  }
}

export const mockTasks = [
  makeTask('t1', 'p1', 'Renew passport', 'Photos are in the blue folder. Bring the old passport to the appointment.', day(-2), '', 'high', 'todo'),
  makeTask('t2', 'p1', 'Book dentist appointment', 'Ask about the Saturday slots.', day(0), '16:00', 'medium', 'todo', { reminder: '1-hour' }),
  makeTask('t3', 'p1', 'Draft October budget', 'Start from last month and adjust rent and utilities.', day(1), '', 'low', 'in-progress'),
  makeTask('t4', 'p1', 'Call landlord about the heater', 'Bedroom radiator does not warm up.', day(4), '09:30', 'high', 'todo', { reminder: 'at-time' }),
  makeTask('t5', 'p1', 'Read chapter 4 for book club', '', day(7), '', 'low', 'todo'),
  makeTask('t6', 'p1', 'Order birthday gift for Dad', 'He mentioned the gardening book.', day(12), '', 'medium', 'todo', { reminder: '1-day' }),
  makeTask('t7', 'p1', 'Back up laptop', '', '', '', 'low', 'todo'),
  makeTask('t8', 'p1', 'Return library books', '', day(-3), '', 'medium', 'done', { completedAt: day(-3) }),
  makeTask('t9', 'p1', 'Cancel gym trial', 'Before the first charge.', day(-8), '', 'high', 'done', { completedAt: day(-9) }),
  makeTask('t10', 'p1', 'File expense receipts', '', day(-15), '', 'medium', 'done', { completedAt: day(-16) }),
  makeTask('t11', 'p3', 'Write homepage copy', 'Hero, three feature blocks and the footer line.', day(-1), '', 'high', 'in-progress', { assignee: 'u1' }),
  makeTask('t12', 'p3', 'Review pricing page design', 'Check the annual toggle and the comparison table.', day(0), '14:00', 'high', 'todo', { assignee: 'u2', reminder: '1-hour' }),
  makeTask('t13', 'p3', 'Compress hero images', 'Target under 200 KB each.', day(1), '', 'low', 'in-progress', { assignee: 'u3' }),
  makeTask('t14', 'p3', 'Set up redirect map', 'Old blog URLs to the new structure.', day(5), '', 'medium', 'todo', { assignee: 'u3' }),
  makeTask('t15', 'p3', 'QA checkout on mobile', 'Test on a small phone and a tablet.', day(6), '11:00', 'high', 'todo', { assignee: 'u1', reminder: '1-day' }),
  makeTask('t16', 'p3', 'Launch checklist sign-off', 'Everyone confirms their section.', day(14), '17:00', 'high', 'todo', { assignee: 'u1', reminder: '1-day' }),
  makeTask('t17', 'p3', 'Migrate blog posts', '', day(-6), '', 'medium', 'done', { assignee: 'u2', completedAt: day(-6) }),
  makeTask('t18', 'p3', 'Agree on sitemap', '', day(-20), '', 'high', 'done', { assignee: 'u1', completedAt: day(-21) }),
  makeTask('t19', 'p3', 'Pick analytics tool', '', day(-27), '', 'low', 'done', { assignee: 'u3', completedAt: day(-28) }),
  makeTask('t20', 'p4', 'Collect team OKR drafts', 'One page per team.', day(-3), '', 'medium', 'todo', { assignee: 'u2' }),
  makeTask('t21', 'p4', 'Budget review with finance', 'Bring the headcount scenarios.', day(8), '10:00', 'high', 'todo', { assignee: 'u5', reminder: '1-hour' }),
  makeTask('t22', 'p4', 'Update hiring plan', '', day(11), '', 'medium', 'todo', { assignee: 'u5' }),
  makeTask('t23', 'p4', 'Plan offsite agenda', 'Two days, keep the second afternoon free.', day(19), '', 'low', 'in-progress', { assignee: 'u1' }),
  makeTask('t24', 'p4', 'Summarize Q3 results', '', day(-2), '', 'high', 'done', { assignee: 'u1', completedAt: day(-2) }),
  makeTask('t25', 'p4', 'Send Q3 survey', '', day(-12), '', 'low', 'done', { assignee: 'u2', completedAt: day(-13) }),
]

export const mockNotifications = [
  { _id: 'n1', user: 'u1', type: 'due-soon', message: 'Due today at 4:00 PM', task: 't2', page: 'p1', isRead: false, timeLabel: '1 hour ago' },
  { _id: 'n2', user: 'u1', type: 'assigned', message: 'Daniel Kim assigned this task to you', task: 't15', page: 'p3', isRead: false, timeLabel: '3 hours ago' },
  { _id: 'n3', user: 'u1', type: 'overdue', message: 'This task is overdue', task: 't1', page: 'p1', isRead: false, timeLabel: 'Yesterday' },
  { _id: 'n4', user: 'u1', type: 'shared', message: 'Priya Nair shared a page with you', task: '', page: 'p4', isRead: true, timeLabel: 'Yesterday' },
  { _id: 'n5', user: 'u1', type: 'due-soon', message: 'Due today at 2:00 PM', task: 't12', page: 'p3', isRead: true, timeLabel: 'Yesterday' },
]
