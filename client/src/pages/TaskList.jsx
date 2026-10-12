// TaskList.jsx
// List (planner) view: a table of the tasks on one page.
//   - an inline "add task" row at the bottom, below the last task
//   - a three-dot button after Priority with Edit and Delete
//   - clicking a task opens the task form

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import TaskHeader from '../components/TaskHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import MoreMenu from '../components/MoreMenu.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import ShareModal from '../components/ShareModal.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import { getPage, getTasksByPage, getUsers, getCurrentUser, createTask, updateTask, deleteTask } from '../api/api.js'
import {
  DEFAULT_FILTERS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  filterAndSortTasks,
  formatDue,
  isOverdue,
  getInitials,
  makeEmptyTask,
} from '../utils/helpers.js'
import './TaskList.css'

function TaskList() {
  // The page id comes from the URL: /pages/:pageId/list
  const { pageId } = useParams()
  // The sidebar search opens a task by adding ?task=<id> to the URL
  const [searchParams, setSearchParams] = useSearchParams()

  // Data
  const [page, setPage] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [reloadCount, setReloadCount] = useState(0) // add 1 to load the data again

  // Filter and sort choices
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // Inline "add task" row
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newTitleError, setNewTitleError] = useState(false)

  // Ids of tasks added from the bottom row. They are shown last,
  // right above the add field, so you can see what you just added.
  const [addedIds, setAddedIds] = useState([])

  // Pop-up windows
  const [formTask, setFormTask] = useState(null) // task shown in the form, or null
  const [taskToDelete, setTaskToDelete] = useState(null) // task waiting for confirmation, or null
  const [isShareOpen, setIsShareOpen] = useState(false)

  // Load the page, its tasks and the users
  useEffect(() => {
    async function loadData() {
      setPage(await getPage(pageId))
      setTasks(await getTasksByPage(pageId))
      setUsers(await getUsers())
      setCurrentUser(await getCurrentUser())
      setHasLoaded(true)
    }
    loadData()
  }, [pageId, reloadCount])

  function reloadData() {
    setReloadCount(reloadCount + 1)
  }

  // ---------- Create ----------
  // Add a task from the inline row
  async function handleAddInline() {
    if (newTitle.trim() === '') {
      setNewTitleError(true)
      return
    }
    const newTask = makeEmptyTask(pageId)
    newTask.title = newTitle.trim()
    newTask.dueDate = newDueDate
    newTask.priority = newPriority
    const savedTask = await createTask(newTask)
    setAddedIds([...addedIds, savedTask._id])

    // Empty the row and keep the cursor in the field for the next task
    setNewTitle('')
    setNewDueDate('')
    setNewPriority('medium')
    document.getElementById('new-task-title').focus()
    showToast('Task added')
    reloadData()
  }

  // Open the full form, keeping what was typed in the inline row
  function handleMoreFields() {
    const newTask = makeEmptyTask(pageId)
    newTask.title = newTitle
    newTask.dueDate = newDueDate
    newTask.priority = newPriority
    setFormTask(newTask)
    setNewTitle('')
    setNewDueDate('')
    setNewPriority('medium')
  }

  // ---------- Update ----------
  // Save the task form (works for both a new task and an edited one)
  async function handleSaveTask(taskData) {
    if (taskData._id) {
      await updateTask(pageId, taskData._id, taskData)
      showToast('Task updated')
    } else {
      await createTask(taskData)
      showToast('Task added')
    }
    closeForm()
    reloadData()
  }

  // The checkbox: switch between done and to do
  async function handleToggleDone(task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(pageId, task._id, { status: newStatus })
    showToast('Task updated')
    reloadData()
  }

  function closeForm() {
    setFormTask(null)
    setSearchParams({}) // remove ?task=... from the URL
  }

  // ---------- Delete ----------
  async function handleConfirmDelete() {
    await deleteTask(pageId, taskToDelete._id)
    setTaskToDelete(null)
    showToast('Task deleted')
    reloadData()
  }

  // ---------- What to show ----------
  if (!hasLoaded) return <Layout>{null}</Layout>

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

  const isShared = page.type === 'shared'
  // Sorted tasks first, then the ones just added from the bottom row (in the order added)
  const sortedTasks = filterAndSortTasks(tasks, filters)
  const justAdded = sortedTasks.filter((task) => addedIds.includes(task._id))
  justAdded.sort((a, b) => addedIds.indexOf(a._id) - addedIds.indexOf(b._id))
  const visibleTasks = [...sortedTasks.filter((task) => !addedIds.includes(task._id)), ...justAdded]
  const rowClass = isShared ? 'task-row shared' : 'task-row'

  // The task to show in the form: one picked here, or one opened from the search
  const taskFromSearch = tasks.find((task) => task._id === searchParams.get('task'))
  const taskInForm = formTask || taskFromSearch || null

  return (
    <Layout reloadSignal={tasks}>
      <TaskHeader
        page={page}
        users={users}
        filters={filters}
        onFiltersChange={setFilters}
        onShareClick={() => setIsShareOpen(true)}
      />

      {/* The table scrolls sideways on small screens */}
      <div className="task-table-box">
        <div className="task-table">
          {/* Column names. There is no "Actions" column. */}
          <div className={rowClass + ' task-row-head'}>
            <span></span>
            <span>Title</span>
            <span>Due</span>
            <span>Status</span>
            {isShared && <span>Assignee</span>}
            <span>Priority</span>
            <span></span>
          </div>

          {/* One row per task */}
          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            const assignee = users.find((user) => user._id === task.assignee)

            return (
              <div className={rowClass} key={task._id}>
                <button
                  type="button"
                  className={isDone ? 'task-check checked' : 'task-check'}
                  aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
                  onClick={() => handleToggleDone(task)}
                >
                  <span>
                    <Icon name="check" />
                  </span>
                </button>

                <button type="button" className="task-open" onClick={() => setFormTask(task)}>
                  <div className={isDone ? 'task-title done one-line' : 'task-title one-line'}>{task.title}</div>
                  <div className="one-line small-text">{task.description}</div>
                </button>

                <span className={isOverdue(task) ? 'due overdue' : 'due'}>{formatDue(task)}</span>
                <span className={'status status-' + task.status}>{STATUS_LABELS[task.status]}</span>

                {isShared && (
                  <span>
                    {assignee && (
                      <span className="avatar" title={assignee.name}>
                        {assignee.photo ? <img src={assignee.photo} alt="" /> : getInitials(assignee.name)}
                      </span>
                    )}
                  </span>
                )}

                <span>
                  <span className={'chip chip-' + task.priority}>{PRIORITY_LABELS[task.priority]}</span>
                </span>

                {/* Three-dot button right after Priority */}
                <MoreMenu
                  label="More actions"
                  buttonClass="task-more"
                  items={[
                    { label: 'Edit', onClick: () => setFormTask(task) },
                    { label: 'Delete', onClick: () => setTaskToDelete(task), isDanger: true },
                  ]}
                />
              </div>
            )
          })}

          {/* Inline "add task" row, below the last task */}
          <div className={rowClass}>
            <span className="task-add-icon">
              <Icon name="plus" />
            </span>
            <span className="task-add-title">
              <input
                id="new-task-title"
                type="text"
                className={newTitleError ? 'input task-bare-input has-error' : 'input task-bare-input'}
                aria-label="New task title"
                placeholder="Add a task and press Enter"
                value={newTitle}
                onChange={(event) => {
                  setNewTitle(event.target.value)
                  setNewTitleError(false)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddInline()
                }}
              />
              <button type="button" className="link small-text" onClick={handleMoreFields}>
                More fields
              </button>
            </span>
            <span>
              <input
                type="date"
                className="input task-bare-input"
                aria-label="New task due date"
                value={newDueDate}
                onChange={(event) => setNewDueDate(event.target.value)}
              />
            </span>
            <span className="status status-todo">To Do</span>
            {isShared && <span></span>}
            <span>
              <select
                className="input task-bare-input"
                aria-label="New task priority"
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </span>
            <button type="button" className="icon-btn" aria-label="Add task" title="Add task" onClick={handleAddInline}>
              <Icon name="check" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty states */}
      {tasks.length === 0 && (
        <div className="empty-state">
          <strong>No tasks yet</strong>
          Type a title in the row above and press Enter to add your first task.
        </div>
      )}
      {tasks.length > 0 && visibleTasks.length === 0 && (
        <div className="empty-state">
          <strong>No tasks match these filters</strong>
          <button type="button" className="link" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
            Clear filters
          </button>
        </div>
      )}

      {/* Pop-up windows */}
      {taskInForm && (
        <TaskForm
          key={taskInForm._id || 'new'}
          task={taskInForm}
          page={page}
          users={users}
          onSave={handleSaveTask}
          onCancel={closeForm}
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

export default TaskList
