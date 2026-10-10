// ViewSwitcher.jsx
// The List / Board / Calendar buttons. All three show the same tasks.

import { NavLink } from 'react-router-dom'
import './ViewSwitcher.css'

function ViewSwitcher({ pageId }) {
  // NavLink adds the "active" class by itself when its URL is open
  return (
    <div className="view-switcher">
      <NavLink to={'/pages/' + pageId + '/list'}>List</NavLink>
      <NavLink to={'/pages/' + pageId + '/board'}>Board</NavLink>
      <NavLink to={'/pages/' + pageId + '/calendar'}>Calendar</NavLink>
    </div>
  )
}

export default ViewSwitcher
