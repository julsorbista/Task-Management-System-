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
import { getCurrentUser, getPages, getTasks, getNotifications } from '../api/api.js'
import './Layout.css'

function Layout({ children, reloadSignal }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Data shown in the sidebar and top bar
  const [user, setUser] = useState(null)
  const [pages, setPages] = useState([])
  const [tasks, setTasks] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // The sidebar starts open on a computer and closed on a phone
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 760)

  // 'light' or 'dark'
  const [theme, setTheme] = useState(localStorage.getItem('morrow-theme') || 'light')

  // Goes up by one each time the sidebar changes something, to load the data again
  const [reloadCount, setReloadCount] = useState(0)

  // Load the data when the screen opens, when the URL changes,
  // and whenever a page or the sidebar says something changed
  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        navigate('/login') // nobody is logged in
        return
      }
      const allNotifications = await getNotifications()
      setUser(currentUser)
      setPages(await getPages())
      setTasks(await getTasks())
      setUnreadCount(allNotifications.filter((n) => !n.isRead).length)
    }
    loadData()
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
  if (!user) return null

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

        <main className="content">{children}</main>
      </div>
    </div>
  )
}

export default Layout
