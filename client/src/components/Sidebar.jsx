// Sidebar.jsx
// The left sidebar: logo, close button, search, Dashboard tab,
// Private and Shared pages, and the user's name with a log out button.

import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import MoreMenu from './MoreMenu.jsx'
import ConfirmDelete from './ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import { createPage, renamePage, deletePage, logout } from '../api/api.js'
import { formatDate, formatTime, getInitials } from '../utils/helpers.js'
import './Sidebar.css'

function Sidebar({ user, pages, tasks, isOpen, onClose, onNavigate, onDataChanged }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Search box
  const [searchText, setSearchText] = useState('')

  // Adding a page: '' (not adding), 'private' or 'shared'
  const [addingType, setAddingType] = useState('')
  const [newPageName, setNewPageName] = useState('')

  // Renaming a page: the id of the page being renamed, or ''
  const [renamingPageId, setRenamingPageId] = useState('')
  const [renameText, setRenameText] = useState('')
  const [pageError, setPageError] = useState('')
  const [isSavingRename, setIsSavingRename] = useState(false)
  const renameInFlight = useRef(false)

  // The page waiting for a delete confirmation, or null
  const [pageToDelete, setPageToDelete] = useState(null)
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false)

  const privatePages = pages.filter((page) => page.type === 'private')
  const sharedPages = pages.filter((page) => page.type === 'shared')

  // ---------- Search ----------
  // Find tasks whose title or description contains the typed text
  const query = searchText.trim().toLowerCase()
  let searchResults = []
  if (query !== '') {
    searchResults = tasks.filter((task) => {
      const text = (task.title + ' ' + task.description).toLowerCase()
      return text.includes(query)
    })
  }

  // Open the task that was clicked in the search results
  function openSearchResult(task) {
    setSearchText('')
    onNavigate()
    navigate('/pages/' + task.page + '/list?task=' + task._id)
  }

  // Text under each search result, for example "Private · My tasks · Today 4:00 PM"
  function describeResult(task) {
    const page = pages.find((p) => p._id === task.page)
    let text = (page.type === 'shared' ? 'Shared' : 'Private') + ' · ' + page.name
    if (task.dueDate) text += ' · ' + formatDate(task.dueDate)
    if (task.dueTime) text += ' ' + formatTime(task.dueTime)
    return text
  }

  // ---------- Add a page ----------
  function startAdding(type) {
    setAddingType(type)
    setNewPageName('')
    setRenamingPageId('')
  }

  async function saveNewPage() {
    const name = newPageName.trim()
    const type = addingType
    setAddingType('')
    if (name === '' || type === '') return // nothing typed: just close the input
    const newPage = await createPage(name, type)
    onDataChanged()
    showToast('Page added')
    navigate('/pages/' + newPage._id + '/list')
  }

  // ---------- Rename a page ----------
  function startRenaming(page) {
    setPageError('')
    setRenamingPageId(page._id)
    setRenameText(page.name)
    setAddingType('')
  }

  async function saveRename() {
    if (renameInFlight.current) return
    const name = renameText.trim()
    const pageId = renamingPageId
    if (name === '' || pageId === '') return
    renameInFlight.current = true
    setIsSavingRename(true)
    setPageError('')
    try {
      const updatedPage = await renamePage(pageId, name)
      onDataChanged({ type: 'rename', page: updatedPage })
      setRenamingPageId('')
      showToast('Page renamed')
    } catch (error) {
      setPageError(error.message || 'Could not rename the page.')
    } finally {
      renameInFlight.current = false
      setIsSavingRename(false)
    }
  }

  // ---------- Delete a page ----------
  async function confirmDeletePage() {
    const deletedId = pageToDelete._id
    await deletePage(deletedId)
    onDataChanged({ type: 'delete', pageId: deletedId })
    setPageToDelete(null)
    showToast('Page deleted')

    // If we were looking at the deleted page, go somewhere else
    if (location.pathname.startsWith('/pages/' + deletedId + '/')) {
      const otherPage = pages.find((page) => page._id !== deletedId)
      if (otherPage) navigate('/pages/' + otherPage._id + '/list')
      else navigate('/dashboard')
    }
  }

  // ---------- Log out ----------
  async function handleLogout() {
    setIsConfirmingLogout(false)
    await logout()
    navigate('/login')
  }

  // How many tasks on a page are not done yet (shown next to the page name)
  function countOpenTasks(pageId) {
    return tasks.filter((task) => task.page === pageId && task.status !== 'done').length
  }

  // Draw the list of pages for one section. Used for both Private and Shared.
  function renderPages(pageList) {
    return pageList.map((page) => {
      // This page is being renamed: show an input instead of the link
      if (renamingPageId === page._id) {
        return (
          <div className="sidebar-page" key={page._id}>
            <input
              type="text"
              className="input sidebar-input"
              aria-label="Page name"
              autoFocus
              disabled={isSavingRename}
              value={renameText}
              onChange={(event) => setRenameText(event.target.value)}
              onBlur={saveRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveRename()
                if (event.key === 'Escape') setRenamingPageId('')
              }}
            />
          </div>
        )
      }

      const isActive = location.pathname.startsWith('/pages/' + page._id + '/')
      const openCount = countOpenTasks(page._id)

      return (
        <div className="sidebar-page" key={page._id}>
          <Link
            to={'/pages/' + page._id + '/list'}
            className={isActive ? 'sidebar-link active' : 'sidebar-link'}
            onClick={onNavigate}
          >
            <span className="one-line">{page.name}</span>
            {openCount > 0 && <span className="sidebar-count">{openCount}</span>}
          </Link>
          {page.owner === user._id && <MoreMenu
            label="Page options"
            buttonClass="sidebar-page-more"
            items={[
              { label: 'Rename', onClick: () => startRenaming(page) },
              { label: 'Delete', onClick: () => setPageToDelete(page), isDanger: true },
            ]}
          />}
        </div>
      )
    })
  }

  // The input shown at the end of a section while adding a page
  function renderNewPageInput() {
    return (
      <div className="sidebar-page">
        <input
          type="text"
          className="input sidebar-input"
          aria-label="New page name"
          placeholder="Page name"
          autoFocus
          value={newPageName}
          onChange={(event) => setNewPageName(event.target.value)}
          onBlur={saveNewPage}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveNewPage()
            if (event.key === 'Escape') setAddingType('')
          }}
        />
      </div>
    )
  }

  const taskCountOnDeletedPage = pageToDelete ? tasks.filter((task) => task.page === pageToDelete._id).length : 0

  return (
    <nav className={isOpen ? 'sidebar' : 'sidebar closed'} aria-label="Workspace">
      {/* Top row: logo and the close button */}
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <Icon name="logo" />
          Morrow
        </div>
        <button type="button" className="icon-btn" aria-label="Close sidebar" title="Close sidebar" onClick={onClose}>
          <Icon name="sidebar" />
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <Icon name="search" />
        <label className="visually-hidden" htmlFor="sidebar-search">
          Search tasks
        </label>
        <input
          id="sidebar-search"
          type="search"
          className="input"
          placeholder="Search tasks"
          autoComplete="off"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />

        {/* Results appear as you type */}
        {query !== '' && (
          <div className="sidebar-results">
            {searchResults.slice(0, 8).map((task) => (
              <button type="button" className="sidebar-result" key={task._id} onClick={() => openSearchResult(task)}>
                <div className="one-line sidebar-result-title">{task.title}</div>
                <div className="one-line small-text">{describeResult(task)}</div>
              </button>
            ))}
            {searchResults.length === 0 && (
              <div className="empty-state sidebar-no-results">
                <strong>No results</strong>
                No task title or description matches &quot;{searchText}&quot;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dashboard tab */}
      <nav className="sidebar-navigation" aria-label="Workspace navigation">
      {pageError && <p className="error-text" role="alert">{pageError}</p>}
      <div className="sidebar-dashboard">
        <Link
          to="/dashboard"
          className={location.pathname === '/dashboard' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={onNavigate}
        >
          <Icon name="chart" />
          Dashboard
        </Link>
      </div>

      <div className="sidebar-divider"></div>

      {/* Private section */}
      <div className="sidebar-section">
        <Icon name="lock" />
        Private
        <button
          type="button"
          className="icon-btn sidebar-add"
          aria-label="Add a private page"
          title="Add a private page"
          onClick={() => startAdding('private')}
        >
          <Icon name="plus" />
        </button>
      </div>
      {renderPages(privatePages)}
      {addingType === 'private' && renderNewPageInput()}

      {/* Shared section */}
      <div className="sidebar-section sidebar-section-gap">
        <Icon name="users" />
        Shared
        <button
          type="button"
          className="icon-btn sidebar-add"
          aria-label="Add a shared page"
          title="Add a shared page"
          onClick={() => startAdding('shared')}
        >
          <Icon name="plus" />
        </button>
      </div>
      {renderPages(sharedPages)}
      {addingType === 'shared' && renderNewPageInput()}
      </nav>

      {/* Bottom row: the user (opens Profile) and the log out button */}
      <div className="sidebar-user">
        <Link
          to="/profile"
          className={location.pathname === '/profile' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={onNavigate}
        >
          <span className="avatar">{user.photo ? <img src={user.photo} alt="" /> : getInitials(user.name)}</span>
          <span className="one-line">{user.name}</span>
        </Link>
        <button
          type="button"
          className="icon-btn"
          aria-label="Log out"
          title="Log out"
          onClick={() => setIsConfirmingLogout(true)}
        >
          <Icon name="logout" />
        </button>
      </div>

      {isConfirmingLogout && (
        <ConfirmDelete
          title="Log out of Morrow?"
          message="You can log back in anytime."
          confirmLabel="Log out"
          onConfirm={handleLogout}
          onCancel={() => setIsConfirmingLogout(false)}
        />
      )}

      {/* Confirmation before a page is deleted */}
      {pageToDelete && (
        <ConfirmDelete
          title={'Delete "' + pageToDelete.name + '"?'}
          message={
            (taskCountOnDeletedPage > 0
              ? 'This page and its ' + taskCountOnDeletedPage + (taskCountOnDeletedPage === 1 ? ' task' : ' tasks')
              : 'This page') + ' will be permanently deleted. This cannot be undone.'
          }
          onConfirm={confirmDeletePage}
          onCancel={() => setPageToDelete(null)}
        />
      )}
    </nav>
  )
}

export default Sidebar
