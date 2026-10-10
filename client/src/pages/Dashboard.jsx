// Dashboard.jsx
// Report charts for all Private and Shared tasks, plus the Export button.
// The charts are plain <div> bars styled with CSS, so no chart library is needed.

import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import ExportModal from '../components/ExportModal.jsx'
import Icon from '../components/Icon.jsx'
import { getTasks, getPages, getUsers } from '../api/api.js'
import { isOverdue, todayString, addDays, toDate, formatDate } from '../utils/helpers.js'
import './Dashboard.css'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [pages, setPages] = useState([])
  const [users, setUsers] = useState([])
  const [isExportOpen, setIsExportOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      setTasks(await getTasks())
      setPages(await getPages())
      setUsers(await getUsers())
    }
    loadData()
  }, [])

  // ---------- Numbers for the four tiles ----------
  const completedTasks = tasks.filter((task) => task.status === 'done')
  const overdueTasks = tasks.filter((task) => isOverdue(task))
  const openCount = tasks.length - completedTasks.length
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  // Turn a count into a bar width (percent of the biggest count)
  function toPercent(count, biggest) {
    if (biggest === 0) return 0
    return Math.round((count / biggest) * 100)
  }

  // ---------- Chart 1: tasks completed per week, last six weeks ----------
  const today = todayString()
  const weekday = toDate(today).getDay() // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7
  const thisMonday = addDays(today, -daysSinceMonday)

  const weeks = []
  for (let weeksAgo = 5; weeksAgo >= 0; weeksAgo--) {
    const weekStart = addDays(thisMonday, -7 * weeksAgo)
    const weekEnd = addDays(weekStart, 6)
    const count = completedTasks.filter((task) => task.completedAt >= weekStart && task.completedAt <= weekEnd).length
    weeks.push({ label: weeksAgo === 0 ? 'This week' : formatDate(weekStart), count })
  }
  const biggestWeek = Math.max(1, ...weeks.map((week) => week.count))

  // ---------- Chart 2: completed vs. overdue, per page ----------
  const pageStats = pages
    .map((page) => ({
      name: page.name,
      total: tasks.filter((task) => task.page === page._id).length,
      completed: completedTasks.filter((task) => task.page === page._id).length,
      overdue: overdueTasks.filter((task) => task.page === page._id).length,
    }))
    .filter((stat) => stat.total > 0)
  const biggestPageNumber = Math.max(1, ...pageStats.map((stat) => Math.max(stat.completed, stat.overdue)))

  // ---------- Chart 3: by priority ----------
  const priorityStats = [
    { label: 'High', barClass: 'bar-high', count: tasks.filter((task) => task.priority === 'high').length },
    { label: 'Medium', barClass: 'bar-medium', count: tasks.filter((task) => task.priority === 'medium').length },
    { label: 'Low', barClass: 'bar-low', count: tasks.filter((task) => task.priority === 'low').length },
  ]
  const biggestPriority = Math.max(1, ...priorityStats.map((stat) => stat.count))

  // ---------- Chart 4: by status ----------
  const statusStats = [
    { label: 'To Do', barClass: 'bar-muted', count: tasks.filter((task) => task.status === 'todo').length },
    { label: 'In Progress', barClass: '', count: tasks.filter((task) => task.status === 'in-progress').length },
    { label: 'Done', barClass: 'bar-muted', count: completedTasks.length },
  ]
  const biggestStatus = Math.max(1, ...statusStats.map((stat) => stat.count))

  return (
    <Layout>
      <div className="dashboard-head">
        <div className="dashboard-head-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="muted dashboard-subtitle">All Private and Shared tasks, as of today.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsExportOpen(true)}>
          <Icon name="download" />
          Export
        </button>
      </div>

      {/* Four number tiles */}
      <div className="dashboard-tiles">
        <div className="panel">
          <div className="small-text">Completed</div>
          <div className="dashboard-number">{completedTasks.length}</div>
        </div>
        <div className="panel">
          <div className="small-text">Open</div>
          <div className="dashboard-number">{openCount}</div>
        </div>
        <div className="panel">
          <div className="small-text">Overdue</div>
          <div className="dashboard-number">{overdueTasks.length}</div>
        </div>
        <div className="panel">
          <div className="small-text">Completion rate</div>
          <div className="dashboard-number">{completionRate}%</div>
        </div>
      </div>

      <div className="two-columns dashboard-charts">
        {/* Chart 1: standing bars */}
        <div className="panel">
          <div className="section-title">Tasks completed over time</div>
          <div className="small-text dashboard-chart-note">Per week, last six weeks</div>
          <div className="week-bars">
            {weeks.map((week) => (
              <div className="week-bar" key={week.label}>
                <span>{week.count}</span>
                {/* The bar is 120px tall for the biggest week */}
                <div className="week-bar-fill" style={{ height: Math.round((week.count / biggestWeek) * 120) }}></div>
              </div>
            ))}
          </div>
          <div className="week-labels">
            {weeks.map((week) => (
              <span key={week.label}>{week.label}</span>
            ))}
          </div>
        </div>

        {/* Chart 2: completed vs. overdue */}
        <div className="panel">
          <div className="section-title">Completed vs. overdue</div>
          <div className="small-text">By page</div>
          {pageStats.map((stat) => (
            <div className="page-stat" key={stat.name}>
              <div className="page-stat-name">{stat.name}</div>
              <div className="bar-row">
                <span className="muted">Completed</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: toPercent(stat.completed, biggestPageNumber) + '%' }}></span>
                </span>
                <span>{stat.completed}</span>
              </div>
              <div className="bar-row">
                <span className="muted">Overdue</span>
                <span className="bar-track">
                  <span
                    className="bar-fill bar-overdue"
                    style={{ width: toPercent(stat.overdue, biggestPageNumber) + '%' }}
                  ></span>
                </span>
                <span>{stat.overdue}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart 3: by priority */}
        <div className="panel">
          <div className="section-title">By priority</div>
          {priorityStats.map((stat) => (
            <div className="bar-row bar-row-gap" key={stat.label}>
              <span>{stat.label}</span>
              <span className="bar-track">
                <span
                  className={'bar-fill ' + stat.barClass}
                  style={{ width: toPercent(stat.count, biggestPriority) + '%' }}
                ></span>
              </span>
              <span>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* Chart 4: by status */}
        <div className="panel">
          <div className="section-title">By status</div>
          {statusStats.map((stat) => (
            <div className="bar-row bar-row-gap" key={stat.label}>
              <span>{stat.label}</span>
              <span className="bar-track">
                <span
                  className={'bar-fill ' + stat.barClass}
                  style={{ width: toPercent(stat.count, biggestStatus) + '%' }}
                ></span>
              </span>
              <span>{stat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {isExportOpen && <ExportModal tasks={tasks} pages={pages} users={users} onClose={() => setIsExportOpen(false)} />}
    </Layout>
  )
}

export default Dashboard
