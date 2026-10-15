import { useState } from 'react'
import useBoardData from '../utils/useBoardData.js'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import WorkspacePlaceholder from '../components/WorkspacePlaceholder.jsx'
import TaskHeader from '../components/TaskHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import ShareModal from '../components/ShareModal.jsx'
import { showToast } from '../utils/toast.js'
import Icon from '../components/Icon.jsx'
import { createTask, updateTask } from '../api/api.js'
import { DEFAULT_FILTERS, filterAndSortTasks, formatTime, isOverdue, toDateString, todayString } from '../utils/helpers.js'
import './TaskCalendar.css'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function TaskCalendar() {
  const { pageId } = useParams()
  const [reloadCount, setReloadCount] = useState(0)
  const { page, tasks, users, currentUser, setTasks, hasLoaded, loadError } = useBoardData(pageId, reloadCount)
  const canEditTasks = Boolean(currentUser && page && (
    page.owner === currentUser._id ||
    page.members?.some((member) => member.user === currentUser._id && member.role === 'editor')
  ))

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [formTask, setFormTask] = useState(null)
  const [isShareOpen, setIsShareOpen] = useState(false)

  function reloadData() {
    setReloadCount((count) => count + 1)
  }

  function goToPreviousMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  function goToToday() {
    setYear(new Date().getFullYear())
    setMonth(new Date().getMonth())
  }

  // ---------- Update ----------
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
  const today = todayString()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysBeforeFirst = firstOfMonth.getDay() // 0 = Sunday
  const numberOfCells = daysBeforeFirst + daysInMonth > 35 ? 42 : 35

  const days = []
  for (let i = 0; i < numberOfCells; i++) {
    const date = new Date(year, month, 1 - daysBeforeFirst + i)
    const dateString = toDateString(date)
    const dayTasks = visibleTasks.filter((task) => task.dueDate === dateString)
    dayTasks.sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'))

    days.push({
      dateString,
      dayNumber: date.getDate(),
      isOtherMonth: date.getMonth() !== month,
      isToday: dateString === today,
      tasks: dayTasks,
    })
  }

  const tasksWithoutDate = visibleTasks.filter((task) => task.dueDate === '').length

  return (
    <Layout reloadSignal={tasks}>
      <TaskHeader
        page={page}
        users={users}
        filters={filters}
        onFiltersChange={setFilters}
        onShareClick={() => setIsShareOpen(true)}
      />

      <div className="row calendar-bar">
        <span className="section-title calendar-month">
          {MONTH_NAMES[month]} {year}
        </span>
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={goToPreviousMonth}>
          <Icon name="left" />
        </button>
        <button type="button" className="icon-btn" aria-label="Next month" onClick={goToNextMonth}>
          <Icon name="right" />
        </button>
        <button type="button" className="btn" onClick={goToToday}>
          Today
        </button>
        {tasksWithoutDate > 0 && (
          <span className="small-text calendar-note">
            {tasksWithoutDate === 1
              ? '1 task has no due date and is not shown'
              : tasksWithoutDate + ' tasks have no due date and are not shown'}
          </span>
        )}
      </div>

      <div className="calendar-box">
        <div className="calendar">
          {WEEKDAY_NAMES.map((name) => (
            <div className="calendar-weekday" key={name}>
              {name}
            </div>
          ))}

          {days.map((day) => (
            <div className={day.isOtherMonth ? 'calendar-day other-month' : 'calendar-day'} key={day.dateString}>
              <span className={day.isToday ? 'calendar-number today' : 'calendar-number'}>{day.dayNumber}</span>

              {day.tasks.map((task) => {
                let taskClass = 'calendar-task'
                if (isOverdue(task)) taskClass += ' overdue'
                if (task.status === 'done') taskClass += ' done'

                return (
                  <button
                    type="button"
                    className={taskClass}
                    key={task._id}
                    title={task.title}
                    onClick={() => setFormTask(task)}
                  >
                    {task.dueTime && <span className="calendar-time">{formatTime(task.dueTime)}</span>}
                    {task.title}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="empty-state">
          <strong>No tasks yet</strong>
          Add tasks in the List or Board view and they will appear on their due dates.
        </div>
      )}

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

      {isShareOpen && (
        <ShareModal
          page={page}
          users={users}
          currentUser={currentUser}
          onClose={() => setIsShareOpen(false)}
          onChanged={reloadData}
        />
      )}
    </Layout>
  )
}

export default TaskCalendar
