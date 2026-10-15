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
import { workspaceSnapshot } from '../utils/workspaceSnapshot.js'
import { notificationDestination } from '../utils/notificationDestination.js'

const TYPE_ICONS = { 'due-soon': 'clock', overdue: 'alert', assigned: 'user', shared: 'users' }

function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState(workspaceSnapshot.notifications)
  const [tasks, setTasks] = useState(workspaceSnapshot.tasks)
  const [pages, setPages] = useState(workspaceSnapshot.pages)
  const [openError, setOpenError] = useState('')
  const [filter, setFilter] = useState('all')
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  useEffect(() => {
    function syncNotifications() { setNotifications(workspaceSnapshot.notifications) }
    window.addEventListener('morrow-notifications-changed', syncNotifications)
    return () => window.removeEventListener('morrow-notifications-changed', syncNotifications)
  }, [])

  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        const [loadedNotifications, loadedPages] = await Promise.all([getNotifications(), getPages()])
        if (!active) return
        setNotifications(loadedNotifications)
        setPages(loadedPages)
        const loadedTasks = await getTasks(loadedPages)
        if (active) setTasks(loadedTasks)
      } catch (error) {
        if (active) setOpenError(error.message || 'Could not load notifications.')
      }
    }
    loadData()
    return () => { active = false }
  }, [])

  function getRelatedName(notification) {
    const task = tasks.find((t) => t._id === notification.task)
    if (task) return task.title
    const page = pages.find((p) => p._id === notification.page)
    if (page) return page.name
    return ''
  }

  async function handleOpen(notification) {
    setOpenError('')
    const destination = notificationDestination(notification, tasks)
    if (!destination) {
      setOpenError('The related task or board could not be identified. It may have been deleted, renamed, or have a duplicate name.')
      return
    }
    navigate(destination)
    try {
      await setNotificationRead(notification._id, true)
    } catch (error) {
      showToast(error.message || 'Could not mark the notification as read.')
    }
  }

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
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })))
    } catch (error) {
      showToast(error.message || 'Failed to mark notifications as read')
    }
  }

  async function handleClearRead() {
    await clearReadNotifications()
    setIsConfirmingClear(false)
    showToast('Read notifications cleared')
    setNotifications((items) => items.filter((item) => !item.isRead))
  }

  const visibleNotifications = notifications.filter((n) => filter === 'all' || !n.isRead)
  const readCount = notifications.filter((n) => n.isRead).length

  return (
    <Layout reloadSignal={notifications}>
      <div className="notifications">
        <div className="notifications-head">
          <div className="notifications-head-left">
            <h1 className="notifications-title">Notifications</h1>

            <div className="notifications-toggle">
              <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                All
              </button>
              <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
                Unread
              </button>
            </div>
          </div>

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

        {openError && <p className="error-text" role="alert">{openError}</p>}
        {visibleNotifications.length > 0 && (
          <div className="notifications-list">
            {visibleNotifications.map((notification) => (
              <div className="notification" key={notification._id}>
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
