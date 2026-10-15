import { useState } from 'react'
import useBoardData from '../utils/useBoardData.js'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import WorkspacePlaceholder from '../components/WorkspacePlaceholder.jsx'
import TaskHeader from '../components/TaskHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import ShareModal from '../components/ShareModal.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import { createTask, updateTask, deleteTask } from '../api/api.js'
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

const COLUMNS = [
  { status: 'todo', name: 'To Do' },
  { status: 'in-progress', name: 'In Progress' },
  { status: 'done', name: 'Done' },
]

function TaskBoard() {
  const { pageId } = useParams()
  const [reloadCount, setReloadCount] = useState(0)
  const { page, tasks, users, currentUser, setTasks, hasLoaded, loadError } = useBoardData(pageId, reloadCount)
  const canEditTasks = Boolean(currentUser && page && (
    page.owner === currentUser._id ||
    page.members?.some((member) => member.user === currentUser._id && member.role === 'editor')
  ))

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [addingStatus, setAddingStatus] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTitleError, setNewTitleError] = useState('')
  const [formTask, setFormTask] = useState(null)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [isShareOpen, setIsShareOpen] = useState(false)

  function reloadData() {
    setReloadCount((count) => count + 1)
  }

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
    const savedTask = await createTask(newTask)
    setTasks((items) => [...items, savedTask])
    setNewTitle('')
    showToast('Task added')
  }

  async function handleSaveTask(taskData) {
    if (taskData._id) {
      const savedTask = await updateTask(pageId, taskData._id, taskData)
      setTasks((items) => items.map((item) => item._id === savedTask._id ? savedTask : item))
      showToast('Task updated')
    } else {
      const savedTask = await createTask(taskData)
      setTasks((items) => [...items, savedTask])
      showToast('Task added')
    }
    setFormTask(null)
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
                          style={{ display: canEditTasks ? undefined : 'none' }} onClick={() => setTaskToDelete(task)}
                        >
                          <Icon name="trash" />
                        </button>
                      </span>
                    </div>
                  </div>
                )
              })}

              {columnTasks.length === 0 && !isAddingHere && <div className="board-empty">No tasks here.</div>}
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
                <button type="button" className="board-add" style={{ display: canEditTasks ? undefined : 'none' }} onClick={() => startAdding(column.status)}>
                  <Icon name="plus" />
                  Add task
                </button>
              )}
            </section>
          )
        })}
      </div>

      {formTask && (
        <TaskForm readOnly={!canEditTasks}
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
