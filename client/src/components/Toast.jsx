import { useState, useEffect } from 'react'
import Icon from './Icon.jsx'
import { connectToastList } from '../utils/toast.js'
import './Toast.css'

              
function Toast({ text, type, onClose }) {
                          
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={type === 'error' ? 'toast toast-error' : 'toast'} role={type === 'error' ? 'alert' : 'status'}>
      <span className="toast-check">
        <Icon name={type === 'error' ? 'close' : 'check'} />
      </span>
      <span className="toast-text">{text}</span>
      <button type="button" className="toast-close" aria-label="Close message" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  )
}

function ToastList() {

  const [toasts, setToasts] = useState([])
  useEffect(() => {
    let nextId = 1
    connectToastList((text, type) => {
      const newToast = { id: nextId, text: text, type: type }
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
        <Toast key={toast.id} text={toast.text} type={toast.type} onClose={() => closeToast(toast.id)} />
      ))}
    </div>
  )
}

export default ToastList
