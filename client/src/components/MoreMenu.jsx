// MoreMenu.jsx
// The three-dot "more" button. Clicking it opens a small menu.
//
// Use it like this:
//   <MoreMenu
//     label="More actions"
//     items={[
//       { label: 'Edit', onClick: handleEdit },
//       { label: 'Delete', onClick: handleDelete, isDanger: true },
//     ]}
//   />

import { useState } from 'react'
import Icon from './Icon.jsx'
import './MoreMenu.css'

function MoreMenu({ label, items, buttonClass }) {
  // Where to draw the menu on the screen. null means the menu is closed.
  const [position, setPosition] = useState(null)

  function openMenu(event) {
    // Put the menu just under the button, lined up with its right edge
    const box = event.currentTarget.getBoundingClientRect()
    setPosition({ top: box.bottom + 4, left: Math.max(8, box.right - 140) })
  }

  function closeMenu() {
    setPosition(null)
  }

  return (
    <>
      <button
        type="button"
        className={'icon-btn ' + (buttonClass || '')}
        aria-label={label}
        title={label}
        onClick={openMenu}
      >
        <Icon name="more" />
      </button>

      {position && (
        <>
          {/* Invisible layer: clicking anywhere outside closes the menu */}
          <div className="more-menu-backdrop" onClick={closeMenu}></div>

          <div className="more-menu" style={{ top: position.top, left: position.left }}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.isDanger ? 'more-menu-item danger' : 'more-menu-item'}
                onClick={() => {
                  closeMenu()
                  item.onClick()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export default MoreMenu
