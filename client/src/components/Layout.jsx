// Layout.jsx
// The frame around every workspace screen:
//   - the sidebar on the left
//   - a top bar with the dark/light toggle and the notification bell
//   - the page itself in the middle (the "children")
//
// Use it like this inside a page:
//   <Layout reloadSignal={tasks}> ...the page... </Layout>
//
// reloadSignal: whenever this value changes, the layout loads its data again.
// Pages pass their own data here so the sidebar counts and the bell badge
// stay up to date after a change.

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Icon from './Icon.jsx'
import WorkspacePlaceholder from './WorkspacePlaceholder.jsx'
import { getCurrentUser, getPages, getTasks, getNotifications, getUsers } from '../api/api.js'
import './Layout.css'
import { workspaceSnapshot, clearWorkspaceSnapshot } from '../utils/workspaceSnapshot.js'

function Layout({ children, reloadSignal }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Data shown in the sidebar and top bar
  const [user, setUser] = useState(workspaceSnapshot.user)
  const [pages, setPages] = useState(workspaceSnapshot.pages)
  const [tasks, setTasks] = useState(workspaceSnapshot.tasks)
  const [unreadCount, setUnreadCount] = useState(workspaceSnapshot.unreadCount)
  const [loadError, setLoadError] = useState('')

  // The sidebar starts open on a computer and closed on a phone
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 760)

  // 'light' or 'dark'
  const [theme, setTheme] = useState(localStorage.getItem('morrow-theme') || 'light')

  // Goes up by one each time the sidebar changes something, to load the data again
  const [reloadCount, setReloadCount] = useState(0)

  // Load the data when the screen opens, when the URL changes,
  // and whenever a page or the sidebar says something changed
  useEffect(() => {
    let active = true
    async function loadData() {
      try {
      const currentUser = await getCurrentUser()
      if (!active) return
      if (!currentUser) {
        clearWorkspaceSnapshot()
        navigate('/login', { replace: true })
        return
      }
      setUser(currentUser)
      workspaceSnapshot.user = currentUser
      const [allNotifications, allPages, allUsers] = await Promise.all([getNotifications(), getPages(), getUsers()])
      const allTasks = await getTasks(allPages)
      if (!active) return
      const count = allNotifications.filter((n) => !n.isRead).length
      Object.assign(workspaceSnapshot, { user: currentUser, pages: allPages, tasks: allTasks, notifications: allNotifications, unreadCount: count, users: allUsers, loaded: true })
      for (const id of Object.keys(workspaceSnapshot.boards)) {
        if (!allPages.some((board) => board._id === id)) delete workspaceSnapshot.boards[id]
      }
      setPages(allPages)
      setTasks(allTasks)
      setUnreadCount(count)
      setLoadError('')
      } catch (error) {
        if (active) setLoadError(error.message || 'Failed to load workspace.')
      }
    }
    loadData()
    return () => { active = false }
  }, [location.pathname, reloadSignal, reloadCount, navigate])

  // Switch between light and dark and remember the choice
  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('morrow-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // On a phone the sidebar covers the page, so close it after picking something
  function closeSidebarOnPhone() {
    if (window.innerWidth <= 760) setIsSidebarOpen(false)
  }

  const isOnNotifications = location.pathname === '/notifications'

  // Wait for the user before drawing anything
  if (!user) return <div className="layout">
    <aside className="sidebar" aria-hidden="true"><WorkspacePlaceholder /></aside>
    <div className="layout-main"><header className="topbar" /><div className="workspace-scroll"><main className="content">
      {loadError ? <p role="alert">{loadError}</p> : <WorkspacePlaceholder />}
    </main></div></div>
  </div>

  return (
    <div className="layout">
      <Sidebar
        user={user}
        pages={pages}
        tasks={tasks}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={closeSidebarOnPhone}
        onDataChanged={() => setReloadCount(reloadCount + 1)}
      />

      {/* On a phone: dark layer behind the open sidebar. Clicking it closes the sidebar. */}
      {isSidebarOpen && <div className="layout-veil" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="layout-main">
        <header className="topbar">
          {/* Shown only while the sidebar is closed */}
          {!isSidebarOpen && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Open sidebar"
              title="Open sidebar"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Icon name="sidebar" />
            </button>
          )}

          <div className="topbar-right">
            <button
              type="button"
              className="icon-btn"
              aria-label="Switch light or dark theme"
              title="Switch light or dark theme"
              onClick={toggleTheme}
            >
              <Icon name="theme" />
            </button>

            {/* The bell opens the Notifications view and is highlighted while it is open */}
            <Link
              to="/notifications"
              className={isOnNotifications ? 'icon-btn active' : 'icon-btn'}
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
            </Link>
          </div>
        </header>

        <div className="workspace-scroll" key={location.pathname}>
          <main className="content">{loadError && <p role="alert" className="error-text">{loadError}</p>}{children}</main>
        </div>
      </div>
    </div>
  )
}

export default Layout
