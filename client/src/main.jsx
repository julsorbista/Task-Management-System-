import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Use the theme the user picked last time (light is the default).
// The toggle button that changes it is in components/Layout.jsx.
const savedTheme = localStorage.getItem('morrow-theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
