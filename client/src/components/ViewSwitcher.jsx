
import { NavLink } from 'react-router-dom'
import './ViewSwitcher.css'

function ViewSwitcher({ pageId }) {
  return (
    <div className="view-switcher">
      <NavLink to={'/pages/' + pageId + '/list'}>List</NavLink>
      <NavLink to={'/pages/' + pageId + '/board'}>Board</NavLink>
      <NavLink to={'/pages/' + pageId + '/calendar'}>Calendar</NavLink>
    </div>
  )
}

export default ViewSwitcher
