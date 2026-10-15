import { useState } from 'react'
import Icon from './Icon.jsx'
import { todayString, addDays, toDate, toDateString, formatDate, formatTime } from '../utils/helpers.js'
import './TaskForm.css'

function TaskForm({ task, page, users, onSave, onCancel, readOnly = false }) {
  const isEditing = Boolean(task._id)
  const isShared = page.type === 'shared'
  const [form, setForm] = useState({ ...task })
  const [titleError, setTitleError] = useState('')
  const [reminderError, setReminderError] = useState('')

  function changeField(name, value) {
    setForm({ ...form, [name]: value })
    setReminderError('')
    if (name === 'title') setTitleError('')
  }

  const today = todayString()
  const tomorrow = addDays(today, 1)

  const todayWeekday = toDate(today).getDay() 
  const daysUntilMonday = (8 - todayWeekday) % 7 || 7
  const nextMonday = addDays(today, daysUntilMonday)
  function getReminderText() {
    const minutesBefore = { 'at-time': 0, '10-min': 10, '1-hour': 60, '1-day': 1440 }

    if (form.reminder === 'custom') {
      if (!form.reminderDate || !form.reminderTime) return ''
      return 'You will be reminded ' + formatDate(form.reminderDate) + ' at ' + formatTime(form.reminderTime) + '.'
    }

    if (form.reminder === 'none' || !form.dueDate) return ''
    const timeParts = (form.dueTime || '09:00').split(':')
    const reminderMoment = toDate(form.dueDate)
    reminderMoment.setHours(Number(timeParts[0]), Number(timeParts[1]) - minutesBefore[form.reminder])

    const hours = String(reminderMoment.getHours()).padStart(2, '0')
    const minutes = String(reminderMoment.getMinutes()).padStart(2, '0')
    let text = 'You will be reminded ' + formatDate(toDateString(reminderMoment)) + ' at ' + formatTime(hours + ':' + minutes)
    text += form.dueTime ? '.' : ' (no due time set, so 9:00 AM is used).'
    return text
  }

  function handleSave() {
    let newTitleError = ''
    let newReminderError = ''
    if (form.title.trim() === '') newTitleError = 'Give the task a title.'
    const needsDueDate = ['at-time', '10-min', '1-hour', '1-day'].includes(form.reminder)
    if (needsDueDate && !form.dueDate) newReminderError = 'Set a due date to use this reminder.'
    if (form.reminder === 'custom' && (!form.reminderDate || !form.reminderTime)) {
      newReminderError = 'Pick both a date and a time for the reminder.'
    }

    setTitleError(newTitleError)
    setReminderError(newReminderError)
    if (newTitleError || newReminderError) return

    onSave({
      ...form,
      title: form.title.trim(),
      dueTime: form.dueDate ? form.dueTime : '', 
    })
  }

  const members = (page.members || []).map((member) => users.find((user) => user._id === member.user)).filter(Boolean)

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-label={isEditing ? 'Edit task' : 'New task'}>
        <div className="modal-header">
          <h2 className="modal-title">{readOnly ? 'Task details' : isEditing ? 'Edit task' : 'New task'}</h2>
          <span className="small-text">
            {isShared ? 'Shared' : 'Private'} · {page.name}
          </span>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onCancel}>
            <Icon name="close" />
          </button>
        </div>

        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {/* Title */}
        <div className="field">
          <label className="label" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            className={titleError ? 'input has-error' : 'input'}
            value={form.title}
            onChange={(event) => changeField('title', event.target.value)}
          />
          {titleError && <div className="error-text">{titleError}</div>}
        </div>

        <div className="field">
          <label className="label" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            className="input"
            rows="3"
            value={form.description}
            onChange={(event) => changeField('description', event.target.value)}
          ></textarea>
        </div>

        <div className="two-columns">
          <div className="field task-form-tight">
            <label className="label" htmlFor="task-due-date">
              Due date
            </label>
            <input
              id="task-due-date"
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(event) => changeField('dueDate', event.target.value)}
            />
          </div>
          <div className="field task-form-tight">
            <label className="label" htmlFor="task-due-time">
              Due time (optional)
            </label>
            <input
              id="task-due-time"
              type="time"
              className="input"
              value={form.dueTime}
              onChange={(event) => changeField('dueTime', event.target.value)}
            />
          </div>
        </div>

        <div className="row task-form-quick">
          <button
            type="button"
            className={form.dueDate === today ? 'pill active' : 'pill'}
            onClick={() => changeField('dueDate', today)}
          >
            Today
          </button>
          <button
            type="button"
            className={form.dueDate === tomorrow ? 'pill active' : 'pill'}
            onClick={() => changeField('dueDate', tomorrow)}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className={form.dueDate === nextMonday ? 'pill active' : 'pill'}
            onClick={() => changeField('dueDate', nextMonday)}
          >
            Next week
          </button>
          <button
            type="button"
            className="link small-text task-form-clear"
            onClick={() => setForm({ ...form, dueDate: '', dueTime: '' })}
          >
            Clear date
          </button>
        </div>

        <div className="two-columns">
          <div className="field">
            <label className="label" htmlFor="task-priority">
              Priority
            </label>
            <select
              id="task-priority"
              className="input"
              value={form.priority}
              onChange={(event) => changeField('priority', event.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="task-status">
              Status
            </label>
            <select
              id="task-status"
              className="input"
              value={form.status}
              onChange={(event) => changeField('status', event.target.value)}
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {isShared && (
          <div className="field">
            <span className="label">Assign</span>
            <div className="row">
              <button
                type="button"
                className={form.assignee === '' ? 'pill active' : 'pill'}
                onClick={() => changeField('assignee', '')}
              >
                Unassigned
              </button>
              {members.map((member) => (
                <button
                  type="button"
                  key={member._id}
                  className={form.assignee === member._id ? 'pill active' : 'pill'}
                  onClick={() => changeField('assignee', member._id)}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="task-reminder">
            Reminder
          </label>
          <select
            id="task-reminder"
            className="input"
            value={form.reminder}
            onChange={(event) => changeField('reminder', event.target.value)}
          >
            <option value="none">No reminder</option>
            <option value="at-time">At time due</option>
            <option value="10-min">10 minutes before</option>
            <option value="1-hour">1 hour before</option>
            <option value="1-day">1 day before</option>
            <option value="custom">Pick a date and time</option>
          </select>

          {form.reminder === 'custom' && (
            <div className="two-columns task-form-custom">
              <input
                type="date"
                className="input"
                aria-label="Reminder date"
                value={form.reminderDate}
                onChange={(event) => changeField('reminderDate', event.target.value)}
              />
              <input
                type="time"
                className="input"
                aria-label="Reminder time"
                value={form.reminderTime}
                onChange={(event) => changeField('reminderTime', event.target.value)}
              />
            </div>
          )}

          <div className="small-text task-form-hint">{getReminderText()}</div>
          {reminderError && <div className="error-text">{reminderError}</div>}
        </div>

        </fieldset>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          {!readOnly && <button type="button" className="btn btn-primary" onClick={handleSave}>
            {isEditing ? 'Save changes' : 'Add task'}
          </button>}
        </div>
      </div>
    </div>
  )
}

export default TaskForm
