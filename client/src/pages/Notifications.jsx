// Notifications.jsx
// The Notifications view. It opens from the bell icon in the top bar
// (it is not a tab in the sidebar).

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import {
  getNotifications,
  getTasks,
  getPages,
  setNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from '../api/api.js'
import './Notifications.css'

// Which icon to show for each type of notification
const TYPE_ICONS = { 'due-soon': 'clock', overdue: 'alert', assigned: 'user', shared: 'users' }

function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [tasks, setTasks] = useState([])
  const [pages, setPages] = useState([])
  const [reloadCount, setReloadCount] = useState(0)

  // 'all' or 'unread'
  const [filter, setFilter] = useState('all')
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  useEffect(() => {
    async function loadData() {
      setNotifications(await getNotifications())
      setTasks(await getTasks())
      setPages(await getPages())
    }
    loadData()
  }, [reloadCount])

  function reloadData() {
    setReloadCount(reloadCount + 1)
  }

  // Name of the task or page a notification is about
  function getRelatedName(notification) {
    const task = tasks.find((t) => t._id === notification.task)
    if (task) return task.title
    const page = pages.find((p) => p._id === notification.page)
    if (page) return page.name
    return ''
  }

  // Clicking a notification marks it as read and opens the related task (or page)
  async function handleOpen(notification) {
    await setNotificationRead(notification._id, true)
    const task = tasks.find((t) => t._id === notification.task)
    if (task) navigate('/pages/' + task.page + '/list?task=' + task._id)
    else if (pages.some((p) => p._id === notification.page)) navigate('/pages/' + notification.page + '/list')
    else reloadData()
  }

  // "Mark as read" on one notification (read ones cannot be marked unread again)
  async function handleMarkRead(notification) {
    const updatedNotification = await setNotificationRead(notification._id, true)
    setNotifications((currentNotifications) =>
      currentNotifications.map((item) =>
        item._id === updatedNotification._id ? updatedNotification : item
      )
    )
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      showToast('Notifications marked as read')
      reloadData()
    } catch (error) {
      showToast(error.message || 'Failed to mark notifications as read')
    }
  }

  async function handleClearRead() {
    try {
      await clearReadNotifications()
      setIsConfirmingClear(false)
      showToast('Read notifications cleared')
      reloadData()
    } catch (error) {
      showToast(error.message || 'Failed to clear read notifications')
    }
  }

  const visibleNotifications = notifications.filter((n) => filter === 'all' || !n.isRead)
  const readCount = notifications.filter((n) => n.isRead).length

  return (
    <Layout reloadSignal={notifications}>
      <div className="notifications">
        <div className="notifications-head">
          <div className="notifications-head-left">
            <h1 className="notifications-title">Notifications</h1>

            {/* All / Unread toggle */}
            <div className="notifications-toggle">
              <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                All
              </button>
              <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
                Unread
              </button>
            </div>
          </div>

          {/* Text actions at the top right */}
          <div className="notifications-actions">
            <button type="button" className="link" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
            <button
              type="button"
              className="link"
              disabled={readCount === 0}
              onClick={() => setIsConfirmingClear(true)}
            >
              Clear read
            </button>
          </div>
        </div>

        {/* The list */}
        {visibleNotifications.length > 0 && (
          <div className="notifications-list">
            {visibleNotifications.map((notification) => (
              <div className="notification" key={notification._id}>
                {/* Small dot for unread ones */}
                <span className={notification.isRead ? 'notification-dot read' : 'notification-dot'}></span>

                <span className="notification-icon">
                  <Icon name={TYPE_ICONS[notification.type]} />
                </span>

                <button type="button" className="notification-open" onClick={() => handleOpen(notification)}>
                  <span className={notification.isRead ? 'notification-message' : 'notification-message unread'}>
                    {notification.message}
                  </span>
                  <span className="one-line small-text notification-related">{getRelatedName(notification)}</span>
                </button>

                <span className="small-text notification-time">{notification.timeLabel}</span>

                {/* Unread: "Mark as read", shown when the mouse is over the row.
                    Read: an empty cell, so the column keeps its space. */}
                {notification.isRead ? (
                  <span className="notification-mark"></span>
                ) : (
                  <button type="button" className="link notification-mark" onClick={() => handleMarkRead(notification)}>
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {visibleNotifications.length === 0 && (
          <div className="empty-state notifications-empty">
            <svg className="notifications-drawing" viewBox="0 0 96 96" aria-hidden="true">
              <path d="M30 44a18 18 0 1 1 36 0c0 16 6 20 6 20H24s6-4 6-20" />
              <path d="M42 72a6 6 0 0 0 12 0" />
              <path d="M48 20v-6M18 30l-5-3M78 30l5-3M14 48H8M88 48h-6" />
            </svg>
            <strong>Stay in the loop</strong>
            Notifications for your tasks and shared pages will appear here.
          </div>
        )}
      </div>

      {isConfirmingClear && (
        <ConfirmDelete
          title="Clear read notifications?"
          message={
            readCount + (readCount === 1 ? ' read notification' : ' read notifications') + ' will be removed. This cannot be undone.'
          }
          confirmLabel="Clear read"
          onConfirm={handleClearRead}
          onCancel={() => setIsConfirmingClear(false)}
        />
      )}
    </Layout>
  )
}

export default Notifications
