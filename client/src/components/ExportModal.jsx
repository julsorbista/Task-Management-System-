// ExportModal.jsx
// Export options, opened from the Export button on the Dashboard:
//   - CSV or PDF
//   - All tasks or Selected tasks (with a task picker)
//   - Private / Shared scope

import { useState } from 'react'
import Icon from './Icon.jsx'
import { showToast } from '../utils/toast.js'
import { getCurrentUser } from '../api/api.js'
import { exportMetadata } from '../utils/exportMetadata.js'
import { PRIORITY_LABELS, STATUS_LABELS, formatDue, isOverdue } from '../utils/helpers.js'
import './ExportModal.css'

function ExportModal({ tasks, pages, users, onClose }) {

  const [format, setFormat] = useState('csv') // 'csv' or 'pdf'
  const [mode, setMode] = useState('all') // 'all' or 'selected'
  const [scope, setScope] = useState('both') // 'both', 'private' or 'shared'
  const [searchText, setSearchText] = useState('')
  const [selectedIds, setSelectedIds] = useState([]) // ids of the ticked tasks
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  // Find the page of a task (to know if it is Private or Shared)
  function getPageOf(task) {
    return pages.find((page) => page._id === task.page)
  }

  // 1. Tasks that match the scope
  const matchingTasks = tasks.filter((task) => {
    const page = getPageOf(task)
    if (!page) return false
    if (scope === 'private' && page.type !== 'private') return false
    if (scope === 'shared' && page.type !== 'shared') return false
    return true
  })

  // 2. In the picker, the search narrows the list further
  const query = searchText.trim().toLowerCase()
  const listedTasks = matchingTasks.filter((task) => {
    if (query === '') return true
    return (task.title + ' ' + task.description).toLowerCase().includes(query)
  })

  // 3. The tasks that will really be exported
  const selectedTasks = matchingTasks.filter((task) => selectedIds.includes(task._id))
  const tasksToExport = mode === 'selected' ? selectedTasks : matchingTasks
  const exportCount = tasksToExport.length

  const areAllListedSelected = listedTasks.length > 0 && listedTasks.every((task) => selectedIds.includes(task._id))

  // Tick or untick one task
  function toggleTask(taskId) {
    if (selectedIds.includes(taskId)) setSelectedIds(selectedIds.filter((id) => id !== taskId))
    else setSelectedIds([...selectedIds, taskId])
  }

  // "Select all": tick (or untick) every task in the list
  function toggleAll() {
    const listedIds = listedTasks.map((task) => task._id)
    if (areAllListedSelected) {
      setSelectedIds(selectedIds.filter((id) => !listedIds.includes(id)))
    } else {
      const newIds = listedIds.filter((id) => !selectedIds.includes(id))
      setSelectedIds([...selectedIds, ...newIds])
    }
  }

  // ---------- Build the files ----------

  // The rows of the export: one list of text values per task
  function buildRows() {
    return tasksToExport.map((task) => {
      const page = getPageOf(task)
      const assignee = users.find((user) => user._id === task.assignee)
      return [
        task.title,
        task.description,
        task.dueDate,
        task.dueTime,
        PRIORITY_LABELS[task.priority],
        STATUS_LABELS[task.status],
        page.name,
        page.type === 'shared' ? 'Shared' : 'Private',
        assignee ? assignee.name : '',
      ]
    })
  }

  const COLUMN_NAMES = ['Title', 'Description', 'Due date', 'Due time', 'Priority', 'Status', 'Page', 'Scope', 'Assignee']

  // CSV: text with commas between values. The browser downloads it as a file.
  function downloadCsv(user) {
    // Wrap each value in quotes so commas inside a value do not break the file
    function quote(value) {
      let text = String(value ?? '')
      if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text
      return '"' + text.replaceAll('"', '""') + '"'
    }
    const metadata = exportMetadata(user)
    const heading = [
      [metadata.title],
      ['Date and Time:', metadata.dateTime],
      ['Exported by:', metadata.exportedBy],
      [],
    ].map((row) => Array.from({ length: COLUMN_NAMES.length }, (_, index) => row[index] ?? ''))
    const lines = [...heading, COLUMN_NAMES, ...buildRows()].map((row) => row.map(quote).join(','))
    const file = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })

    // Make a temporary link to the file and click it
    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = 'morrow-tasks.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Generate the PDF directly so browser print headers are never included.
  async function handleExport() {
    if (isExporting) return
    setIsExporting(true)
    setExportError('')
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Please log in again before exporting.')
      if (format === 'csv') downloadCsv(user)
      else {
        const { createTaskPdf } = await import('../utils/taskPdf.js')
        const pdf = createTaskPdf({ columns: COLUMN_NAMES, rows: buildRows(), exportedBy: user })
        pdf.save('morrow-tasks.pdf')
      }
      showToast(format === 'csv' ? 'CSV downloaded' : 'PDF downloaded')
      onClose()
    } catch (error) {
      setExportError(error.message || 'Could not export tasks. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Text beside the Export button, for example "5 tasks selected"
  let countText = exportCount + (exportCount === 1 ? ' task' : ' tasks')
  countText += mode === 'selected' ? ' selected' : ' will be exported'

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-label="Export tasks">
        <div className="modal-header">
          <h2 className="modal-title">Export tasks</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {/* Format */}
        <div className="field">
          <span className="label">Format</span>
          <div className="row">
            <button
              type="button"
              className={format === 'csv' ? 'export-format active' : 'export-format'}
              onClick={() => setFormat('csv')}
            >
              <div className="section-title">CSV</div>
              <div className="small-text">Spreadsheet, one row per task</div>
            </button>
            <button
              type="button"
              className={format === 'pdf' ? 'export-format active' : 'export-format'}
              onClick={() => setFormat('pdf')}
            >
              <div className="section-title">PDF</div>
              <div className="small-text">Downloadable task list</div>
            </button>
          </div>
        </div>

        {/* All tasks or Selected tasks */}
        <div className="field">
          <span className="label">Tasks</span>
          <div className="row">
            <button type="button" className={mode === 'all' ? 'pill active' : 'pill'} onClick={() => setMode('all')}>
              All tasks
            </button>
            <button
              type="button"
              className={mode === 'selected' ? 'pill active' : 'pill'}
              onClick={() => setMode('selected')}
            >
              Selected tasks
            </button>
          </div>
        </div>

        {/* Task picker: only when "Selected tasks" is chosen */}
        {mode === 'selected' && (
          <div className="field">
            <div className="export-picker-top">
              <label className="export-task export-select-all">
                <input type="checkbox" checked={areAllListedSelected} onChange={toggleAll} />
                Select all
              </label>
              <input
                type="search"
                className="input"
                aria-label="Search tasks to export"
                placeholder="Search tasks"
                autoComplete="off"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="export-list">
              {listedTasks.map((task) => (
                <label className="export-task" key={task._id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task._id)}
                    onChange={() => toggleTask(task._id)}
                  />
                  <span className="one-line export-task-title">{task.title}</span>
                  <span className={isOverdue(task) ? 'due overdue' : 'due'}>{formatDue(task)}</span>
                  <span className={'chip chip-' + task.priority}>{PRIORITY_LABELS[task.priority]}</span>
                  <span className="small-text export-task-scope">
                    {getPageOf(task).type === 'shared' ? 'Shared' : 'Private'}
                  </span>
                </label>
              ))}
              {listedTasks.length === 0 && (
                <div className="small-text export-none">No tasks match the scope and search.</div>
              )}
            </div>
          </div>
        )}

        {/* Scope */}
        <div className="field">
          <span className="label">Scope</span>
          <div className="row">
            <button type="button" className={scope === 'both' ? 'pill active' : 'pill'} onClick={() => setScope('both')}>
              Private and Shared
            </button>
            <button
              type="button"
              className={scope === 'private' ? 'pill active' : 'pill'}
              onClick={() => setScope('private')}
            >
              Private only
            </button>
            <button
              type="button"
              className={scope === 'shared' ? 'pill active' : 'pill'}
              onClick={() => setScope('shared')}
            >
              Shared only
            </button>
          </div>
        </div>

        {exportError && <p role="alert" className="error-text">{exportError}</p>}

        {/* Footer: count, Cancel, Export */}
        <div className="export-footer">
          <span className="muted export-count">{countText}</span>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isExporting || exportCount === 0}
            onClick={handleExport}
          >
            {isExporting ? 'Exporting...' : 'Export ' + format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
