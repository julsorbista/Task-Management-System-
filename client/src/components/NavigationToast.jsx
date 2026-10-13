// NavigationToast.jsx
// Shows a toast that was passed along with a page change, for example:
//   navigate('/dashboard', { state: { toast: 'Welcome back, Maya!' } })
// It works on every screen, shows the message once, and then removes it
// from the browser history so a refresh does not show it again.

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { showToast } from '../utils/toast.js'

function NavigationToast() {
  const location = useLocation()
  const navigate = useNavigate()
  // The last page visit we showed a message for (so it is never shown twice)
  const shownFor = useRef('')

  useEffect(() => {
    const message = location.state?.toast
    if (!message || shownFor.current === location.key) return
    shownFor.current = location.key
    showToast(message)
    // Same URL, but without the message
    navigate(location.pathname + location.search + location.hash, { replace: true, state: null })
  }, [location, navigate])

  return null
}

export default NavigationToast
