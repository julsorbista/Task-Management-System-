// Toast.jsx
// Success messages ("toasts") at the top center of the screen,
// for example "Task added". Each one slides down from the top,
// closes by itself after 3 seconds, or right away with the X button.
// When there are several, they stack downward.
//
// App.jsx shows <ToastList /> once. To show a message from any file:
//   import { showToast } from '../utils/toast.js'
//   showToast('Task added')

import { useState, useEffect } from 'react'
import Icon from './Icon.jsx'
import { connectToastList } from '../utils/toast.js'
import './Toast.css'

// One message
function Toast({ text, onClose }) {
  // Close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
    // onClose is left out on purpose, so the timer starts only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="toast" role="status">
      <span className="toast-check">
        <Icon name="check" />
      </span>
      <span className="toast-text">{text}</span>
      <button type="button" className="toast-close" aria-label="Close message" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  )
}

// All messages on screen, newest at the bottom of the stack
function ToastList() {
  // Each toast looks like { id: 1, text: 'Task added' }
  const [toasts, setToasts] = useState([])

  // Let showToast() add messages to this list
  useEffect(() => {
    let nextId = 1
    connectToastList((text) => {
      const newToast = { id: nextId, text: text }
      nextId = nextId + 1
      setToasts((oldToasts) => [...oldToasts, newToast])
    })
    return () => connectToastList(null)
  }, [])

  function closeToast(id) {
    setToasts((oldToasts) => oldToasts.filter((toast) => toast.id !== id))
  }

  return (
    <div className="toast-list">
      {toasts.map((toast) => (
        <Toast key={toast.id} text={toast.text} onClose={() => closeToast(toast.id)} />
      ))}
    </div>
  )
}

export default ToastList
