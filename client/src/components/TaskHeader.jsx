// TaskHeader.jsx
// The top part shared by the List, Board and Calendar views:
//   - page name (and for shared pages: member avatars + Share button)
//   - the view switcher
//   - filter and sort controls

import ViewSwitcher from './ViewSwitcher.jsx'
import { getInitials, DEFAULT_FILTERS } from '../utils/helpers.js'
import './TaskHeader.css'

function TaskHeader({ page, users, filters, onFiltersChange, onShareClick }) {
  const isShared = page.type === 'shared'

  // Change one filter and keep the others as they are
  function changeFilter(name, value) {
    onFiltersChange({ ...filters, [name]: value })
  }

  const isFiltered = filters.priority !== 'all' || filters.status !== 'all' || filters.due !== 'all'

  return (
    <>
      <div className="task-header">
        <div className="task-header-title">
          <div className="small-text">{isShared ? 'Shared board' : 'Private'}</div>
          <h1 className="page-title">{page.name}</h1>
        </div>

        {/* Member avatars and the Share button are only for shared pages */}
        {isShared && (
          <div className="row">
            <div className="task-header-avatars">
              {(page.members || []).map((member) => {
                const user = users.find((u) => u._id === member.user)
                if (!user) return null
                return (
                  <span className="avatar" key={member.user} title={user.name + ' · ' + member.role}>
                    {user.photo ? <img src={user.photo} alt="" /> : getInitials(user.name)}
                  </span>
                )
              })}
            </div>
            <button type="button" className="btn" onClick={onShareClick}>
              Share
            </button>
          </div>
        )}
      </div>

      <div className="task-toolbar">
        <div className="task-toolbar-views">
          <ViewSwitcher pageId={page._id} />
        </div>

        <label className="visually-hidden" htmlFor="filter-priority">
          Filter by priority
        </label>
        <select
          id="filter-priority"
          className="task-select"
          value={filters.priority}
          onChange={(event) => changeFilter('priority', event.target.value)}
        >
          <option value="all">Priority: all</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <label className="visually-hidden" htmlFor="filter-status">
          Filter by status
        </label>
        <select
          id="filter-status"
          className="task-select"
          value={filters.status}
          onChange={(event) => changeFilter('status', event.target.value)}
        >
          <option value="all">Status: all</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <label className="visually-hidden" htmlFor="filter-due">
          Filter by due date
        </label>
        <select
          id="filter-due"
          className="task-select"
          value={filters.due}
          onChange={(event) => changeFilter('due', event.target.value)}
        >
          <option value="all">Due: any time</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="week">Next 7 days</option>
          <option value="none">No date</option>
        </select>

        <label className="visually-hidden" htmlFor="filter-sort">
          Sort
        </label>
        <select
          id="filter-sort"
          className="task-select"
          value={filters.sort}
          onChange={(event) => changeFilter('sort', event.target.value)}
        >
          <option value="due-soonest">Sort: due date, soonest</option>
          <option value="due-latest">Sort: due date, latest</option>
          <option value="priority">Sort: priority</option>
          <option value="status">Sort: status</option>
        </select>

        {isFiltered && (
          <button type="button" className="link" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
            Clear
          </button>
        )}
      </div>
    </>
  )
}

export default TaskHeader
