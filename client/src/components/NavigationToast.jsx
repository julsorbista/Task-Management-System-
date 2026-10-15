                      
                                                                       
                                                                        
                                                                        
                                                                

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { showToast } from '../utils/toast.js'

function NavigationToast() {
  const location = useLocation()
  const navigate = useNavigate()
                                                                             
  const shownFor = useRef('')

  useEffect(() => {
    const message = location.state?.toast
    if (!message || shownFor.current === location.key) return
    shownFor.current = location.key
    showToast(message)
                                        
    navigate(location.pathname + location.search + location.hash, { replace: true, state: null })
  }, [location, navigate])

  return null
}

export default NavigationToast
