import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Icon from './Icon.jsx'
import WorkspacePlaceholder from './WorkspacePlaceholder.jsx'
import { getCurrentUser, getPages, getTasks, getNotifications, getUsers } from '../api/api.js'
import './Layout.css'
import { workspaceSnapshot, clearWorkspaceSnapshot } from '../utils/workspaceSnapshot.js'
import { startNotificationRefresh } from '../utils/notificationRefresh.js'

function Layout({ children, reloadSignal }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(workspaceSnapshot.user)
  const [pages, setPages] = useState(workspaceSnapshot.pages)
  const [tasks, setTasks] = useState(workspaceSnapshot.tasks)
  const [unreadCount, setUnreadCount] = useState(workspaceSnapshot.unreadCount)
  const [loadError, setLoadError] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 760)
  const [theme, setTheme] = useState(localStorage.getItem('morrow-theme') || 'light')
  const [reloadCount, setReloadCount] = useState(0)
  const boardWriteRevision = useRef(0)

  useEffect(() => {
    function syncNotifications() { setUnreadCount(workspaceSnapshot.unreadCount) }
    window.addEventListener('morrow-notifications-changed', syncNotifications)
    const stop = startNotificationRefresh(getNotifications)
    return () => {
      stop()
      window.removeEventListener('morrow-notifications-changed', syncNotifications)
    }
  }, [])

  useEffect(() => {
    function syncWorkspace() {
      boardWriteRevision.current++
      setUser(workspaceSnapshot.user)
      setPages(workspaceSnapshot.pages)
      setTasks(workspaceSnapshot.tasks)
      setUnreadCount(workspaceSnapshot.unreadCount)
    }
    window.addEventListener('morrow-workspace-changed', syncWorkspace)
    return () => window.removeEventListener('morrow-workspace-changed', syncWorkspace)
  }, [])

  const refreshSignal = typeof reloadSignal === 'number' ? reloadSignal : 0

  useEffect(() => {
    let active = true
    const revision = boardWriteRevision.current
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
      if (!active || revision !== boardWriteRevision.current) return
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
  }, [location.pathname, refreshSignal, reloadCount, navigate])


  function handleSidebarChanged(change) {
    if (change) boardWriteRevision.current++
    if (change?.type === 'create') {
      const page = { ...change.page, members: change.page.members || [{ user: user._id, role: 'owner' }] }
      workspaceSnapshot.pages = [page, ...workspaceSnapshot.pages.filter((item) => item._id !== page._id)]
      workspaceSnapshot.boards[page._id] = { page, tasks: [], users: workspaceSnapshot.users, currentUser: user }
    } else if (change?.type === 'rename') {
      workspaceSnapshot.pages = workspaceSnapshot.pages.map((page) => page._id === change.page._id ? { ...page, ...change.page } : page)
      const cached = workspaceSnapshot.boards[change.page._id]
      if (cached) cached.page = { ...cached.page, ...change.page }
    } else if (change?.type === 'delete') {
      workspaceSnapshot.pages = workspaceSnapshot.pages.filter((page) => page._id !== change.pageId)
      workspaceSnapshot.tasks = workspaceSnapshot.tasks.filter((task) => task.page !== change.pageId)
      delete workspaceSnapshot.boards[change.pageId]
    }
    if (change) {
      setPages(workspaceSnapshot.pages)
      setTasks(workspaceSnapshot.tasks)
      window.dispatchEvent(new CustomEvent('morrow-board-changed', { detail: { boardId: change.page?._id || change.pageId } }))
    }
    setReloadCount((count) => count + 1)
  }

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('morrow-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  function closeSidebarOnPhone() {
    if (window.innerWidth <= 760) setIsSidebarOpen(false)
  }

  const isOnNotifications = location.pathname === '/notifications'

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
        onDataChanged={handleSidebarChanged}
      />
      {isSidebarOpen && <div className="layout-veil" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="layout-main">
        <header className="topbar">
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
