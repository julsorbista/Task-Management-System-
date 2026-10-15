import { useEffect, useState } from 'react'
import './ConfirmDelete.css'

function ConfirmDelete({ title, message, confirmLabel, onConfirm, onCancel }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  async function handleConfirm() {
    if (isDeleting) return
    setIsDeleting(true)
    setError('')
    try {
      await onConfirm()
    } catch (failure) {
      setError(failure.message || 'Could not delete. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isDeleting) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, isDeleting])

  function handleBackgroundClick(event) {
    if (event.target === event.currentTarget && !isDeleting) onCancel()
  }
  return (
    <div className="overlay confirm-overlay" onClick={handleBackgroundClick}>
      <div className="modal modal-small" role="alertdialog" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        {message && <p className="muted confirm-message">{message}</p>}
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="modal-footer">
          <button type="button" disabled={isDeleting} className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" disabled={isDeleting} className="btn btn-danger" onClick={handleConfirm}>
            {isDeleting ? 'Please wait…' : confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDelete
