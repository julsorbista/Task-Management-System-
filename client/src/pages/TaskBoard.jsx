// TaskBoard.jsx
// Board view: three columns (To Do, In Progress, Done).
//   - "+ Add task" at the bottom of each column
//   - clicking a card opens the task form
//   - each card has a red delete icon beside the assignee avatar

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import TaskHeader from '../components/TaskHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import ShareModal from '../components/ShareModal.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import { getPage, getTasksByPage, getUsers, getCurrentUser, createTask, updateTask, deleteTask } from '../api/api.js'
import {
  DEFAULT_FILTERS,
  PRIORITY_LABELS,
  filterAndSortTasks,
  formatDue,
  isOverdue,
  getInitials,
  makeEmptyTask,
} from '../utils/helpers.js'
import './TaskBoard.css'

// The three columns of the board
const COLUMNS = [
  { status: 'todo', name: 'To Do' },
  { status: 'in-progress', name: 'In Progress' },
  { status: 'done', name: 'Done' },
]

function TaskBoard() {
  const { pageId } = useParams()

  // Data
  const [page, setPage] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // "+ Add task": the status of the column being added to, or ''
  const [addingStatus, setAddingStatus] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTitleError, setNewTitleError] = useState('')

  // Pop-up windows
  const [formTask, setFormTask] = useState(null)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [isShareOpen, setIsShareOpen] = useState(false)

  useEffect(() => {
    let active = true
    setHasLoaded(false)
    setLoadError('')
    async function loadData() {
      try {
        const [board, boardTasks, allUsers, user] = await Promise.all([
          getPage(pageId), getTasksByPage(pageId), getUsers(), getCurrentUser(),
        ])
        if (!active) return
        setPage(board)
        setTasks(boardTasks)
        setUsers(allUsers)
        setCurrentUser(user)
      } catch (error) {
        if (active) setLoadError(error.message || 'Failed to load tasks.')
      } finally {
        if (active) setHasLoaded(true)
      }
    }
    loadData()
    return () => { active = false }
  }, [pageId, reloadCount])

  function reloadData() {
    setReloadCount(reloadCount + 1)
  }

  // ---------- Create ----------
  function startAdding(status) {
    setAddingStatus(status)
    setNewTitle('')
    setNewTitleError('')
  }

  async function handleAddToColumn() {
    if (newTitle.trim() === '') {
      setNewTitleError('Give the task a title.')
      return
    }
    const newTask = makeEmptyTask(pageId, addingStatus)
    newTask.title = newTitle.trim()
    await createTask(newTask)
    setNewTitle('')
    showToast('Task added')
    reloadData()
  }

  // ---------- Update ----------
  async function handleSaveTask(taskData) {
    if (taskData._id) {
      await updateTask(pageId, taskData._id, taskData)
      showToast('Task updated')
    } else {
      await createTask(taskData)
      showToast('Task added')
    }
    setFormTask(null)
    reloadData()
  }

  // ---------- Delete ----------
  async function handleConfirmDelete() {
    await deleteTask(pageId, taskToDelete._id)
    setTaskToDelete(null)
    showToast('Task deleted')
    reloadData()
  }

  if (!hasLoaded) return <Layout><p role="status">Loading tasks…</p></Layout>
  if (loadError) return <Layout><p role="alert" className="error-text">{loadError}</p></Layout>

  if (!page) {
    return (
      <Layout>
        <div className="empty-state">
          <strong>Page not found</strong>
          Pick a page from the sidebar.
        </div>
      </Layout>
    )
  }

  const visibleTasks = filterAndSortTasks(tasks, filters)

  return (
    <Layout reloadSignal={tasks}>
      <TaskHeader
        page={page}
        users={users}
        filters={filters}
        onFiltersChange={setFilters}
        onShareClick={() => setIsShareOpen(true)}
      />

      <div className="board">
        {COLUMNS.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.status)
          const isAddingHere = addingStatus === column.status

          return (
            <section className="board-column" key={column.status}>
              <div className="board-column-head">
                <span className="section-title">{column.name}</span>
                <span className="small-text">{columnTasks.length}</span>
              </div>

              {/* One card per task */}
              {columnTasks.map((task) => {
                const assignee = users.find((user) => user._id === task.assignee)
                const isDone = task.status === 'done'

                return (
                  <div className="board-card" key={task._id}>
                    {/* Clicking anywhere on the card opens the form */}
                    <button type="button" className="board-card-open" onClick={() => setFormTask(task)}>
                      <span className={isDone ? 'board-card-title done' : 'board-card-title'}>{task.title}</span>
                    </button>

                    <div className="board-card-info">
                      <span className={'chip chip-' + task.priority}>{PRIORITY_LABELS[task.priority]}</span>
                      <span className={isOverdue(task) ? 'due overdue' : 'due'}>{formatDue(task)}</span>

                      {/* Assignee avatar and the red delete icon, side by side */}
                      <span className="board-card-right">
                        {assignee && (
                          <span className="avatar" title={assignee.name}>
                            {assignee.photo ? <img src={assignee.photo} alt="" /> : getInitials(assignee.name)}
                          </span>
                        )}
                        <button
                          type="button"
                          className="icon-btn board-card-delete"
                          aria-label="Delete task"
                          title="Delete task"
                          onClick={() => setTaskToDelete(task)}
                        >
                          <Icon name="trash" />
                        </button>
                      </span>
                    </div>
                  </div>
                )
              })}

              {columnTasks.length === 0 && !isAddingHere && <div className="board-empty">No tasks here.</div>}

              {/* "+ Add task" at the bottom of the column */}
              {isAddingHere ? (
                <div className="board-card board-add-card">
                  <input
                    type="text"
                    className={newTitleError ? 'input has-error' : 'input'}
                    aria-label="New task title"
                    placeholder="Task title"
                    autoFocus
                    value={newTitle}
                    onChange={(event) => {
                      setNewTitle(event.target.value)
                      setNewTitleError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleAddToColumn()
                      if (event.key === 'Escape') setAddingStatus('')
                    }}
                  />
                  {newTitleError && <div className="error-text">{newTitleError}</div>}
                  <div className="row board-add-buttons">
                    <button type="button" className="btn btn-primary" onClick={handleAddToColumn}>
                      Add
                    </button>
                    <button type="button" className="btn" onClick={() => setAddingStatus('')}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="board-add" onClick={() => startAdding(column.status)}>
                  <Icon name="plus" />
                  Add task
                </button>
              )}
            </section>
          )
        })}
      </div>

      {/* Pop-up windows */}
      {formTask && (
        <TaskForm
          key={formTask._id || 'new'}
          task={formTask}
          page={page}
          users={users}
          onSave={handleSaveTask}
          onCancel={() => setFormTask(null)}
        />
      )}

      {taskToDelete && (
        <ConfirmDelete
          title="Delete this task?"
          message={'"' + taskToDelete.title + '" will be permanently deleted. This cannot be undone.'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTaskToDelete(null)}
        />
      )}

      {isShareOpen && (
        <ShareModal
          page={page}
          pageId={pageId}
          users={users}
          currentUser={currentUser}
          onClose={() => setIsShareOpen(false)}
          onChanged={reloadData}
        />
      )}
    </Layout>
  )
}

export default TaskBoard
