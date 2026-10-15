import { useState } from 'react'
import Icon from './Icon.jsx'
import './MoreMenu.css'

function MoreMenu({ label, items, buttonClass }) {
  const [position, setPosition] = useState(null)

  function openMenu(event) {
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
