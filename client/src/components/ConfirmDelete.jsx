// ConfirmDelete.jsx
// Small pop-up that asks "are you sure?" before anything is deleted.
// It sits in the center of the screen over a dimmed background.
// Clicking outside it or pressing Escape cancels.
//
// Props:
//   title         the question, for example "Delete this task?"
//   message       one line explaining what will happen (optional)
//   confirmLabel  text of the red button (default: "Delete")
//   onConfirm     runs when the user confirms
//   onCancel      runs when the user cancels

import { useEffect } from 'react'
import './ConfirmDelete.css'

function ConfirmDelete({ title, message, confirmLabel, onConfirm, onCancel }) {
  // Escape key cancels
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // A click on the dimmed background (not on the box itself) cancels
  function handleBackgroundClick(event) {
    if (event.target === event.currentTarget) onCancel()
  }

  return (
    <div className="overlay confirm-overlay" onClick={handleBackgroundClick}>
      <div className="modal modal-small" role="alertdialog" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        {message && <p className="muted confirm-message">{message}</p>}
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDelete
