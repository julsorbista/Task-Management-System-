import { useState } from 'react'
import useBoardData from '../utils/useBoardData.js'
import { useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import WorkspacePlaceholder from '../components/WorkspacePlaceholder.jsx'
import TaskHeader from '../components/TaskHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import MoreMenu from '../components/MoreMenu.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import ShareModal from '../components/ShareModal.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import { createTask, updateTask, deleteTask } from '../api/api.js'
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
  const { pageId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reloadCount, setReloadCount] = useState(0)
  const { page, tasks, users, currentUser, setTasks, hasLoaded, loadError } = useBoardData(pageId, reloadCount)
  const [savingTaskIds, setSavingTaskIds] = useState([])
  const canEditTasks = Boolean(currentUser && page && (
    page.owner === currentUser._id ||
    page.members?.some((member) => member.user === currentUser._id && member.role === 'editor')
  ))

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newTitleError, setNewTitleError] = useState(false)
  const [addedIds, setAddedIds] = useState([])
  const [formTask, setFormTask] = useState(null)  
  const [taskToDelete, setTaskToDelete] = useState(null) 
  const [isShareOpen, setIsShareOpen] = useState(false)

  function reloadData() {
    setReloadCount((count) => count + 1)
  }

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
    setTasks((items) => [...items, savedTask])
    setAddedIds((ids) => [...ids, savedTask._id])
    setNewTitle('')
    setNewDueDate('')
    setNewPriority('medium')
    document.getElementById('new-task-title').focus()
    showToast('Task added')
  }

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

  async function handleSaveTask(taskData) {
    if (taskData._id) {
      const savedTask = await updateTask(pageId, taskData._id, taskData)
      setTasks((items) => items.map((item) => item._id === savedTask._id ? savedTask : item))
      showToast('Task updated')
    } else {
      const savedTask = await createTask(taskData)
      setTasks((items) => [...items, savedTask])
      setAddedIds((ids) => [...ids, savedTask._id])
      showToast('Task added')
    }
    closeForm()
  }

                                                
  async function handleToggleDone(task) {
    if (!canEditTasks) return
    if (savingTaskIds.includes(task._id)) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    setSavingTaskIds((ids) => [...ids, task._id])
    setTasks((items) => items.map((item) => item._id === task._id
      ? { ...item, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : '' }
      : item))
    try {
      await updateTask(pageId, task._id, { status: newStatus })
      showToast('Task updated')
    } catch (error) {
      setTasks((items) => items.map((item) => item._id === task._id
        ? { ...item, status: task.status, completedAt: task.completedAt }
        : item))
      showToast(error.message || 'Could not update task completion.')
    } finally {
      setSavingTaskIds((ids) => ids.filter((id) => id !== task._id))
    }
  }

  function closeForm() {
    setFormTask(null)
    setSearchParams({}) 
  }

  async function handleConfirmDelete() {
    await deleteTask(pageId, taskToDelete._id)
    setTasks((items) => items.filter((item) => item._id !== taskToDelete._id))
    setTaskToDelete(null)
    showToast('Task deleted')
  }

  if (!hasLoaded) return <Layout><WorkspacePlaceholder pageId={pageId} /></Layout>
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

  const isShared = page.type === 'shared'
  const sortedTasks = filterAndSortTasks(tasks, filters)
  const justAdded = sortedTasks.filter((task) => addedIds.includes(task._id))
  justAdded.sort((a, b) => addedIds.indexOf(a._id) - addedIds.indexOf(b._id))
  const visibleTasks = [...sortedTasks.filter((task) => !addedIds.includes(task._id)), ...justAdded]
  const rowClass = isShared ? 'task-row shared' : 'task-row'
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

      <div className="task-table-box">
        <div className="task-table">
          <div className={rowClass + ' task-row-head'}>
            <span></span>
            <span>Title</span>
            <span>Due</span>
            <span>Status</span>
            {isShared && <span>Assignee</span>}
            <span>Priority</span>
            <span></span>
          </div>

          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            const assignee = users.find((user) => user._id === task.assignee)

            return (
              <div className={rowClass} key={task._id}>
                <button
                  type="button"
                  className={isDone ? 'task-check checked' : 'task-check'}
                  aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
                  title={canEditTasks ? 'Update task completion' : 'Viewers cannot change task completion'}
                  disabled={!canEditTasks || savingTaskIds.includes(task._id)}
                  aria-busy={savingTaskIds.includes(task._id)}
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

                {canEditTasks && <MoreMenu
                  label="More actions"
                  buttonClass="task-more"
                  items={[
                    { label: 'Edit', onClick: () => setFormTask(task) },
                    { label: 'Delete', onClick: () => setTaskToDelete(task), isDanger: true },
                  ]}
                />}
              </div>
            )
          })}

          <div className={rowClass} style={{ display: canEditTasks ? undefined : 'none' }}>
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

      {taskInForm && (
        <TaskForm readOnly={!canEditTasks}
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
