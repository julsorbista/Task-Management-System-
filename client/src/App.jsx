// App.jsx
// This file only lists the routes: which URL shows which page.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ToastList from './components/Toast.jsx'

// Auth pages (no sidebar)
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import CheckEmail from './pages/CheckEmail.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import PasswordUpdated from './pages/PasswordUpdated.jsx'
import Invitation from './pages/Invitation.jsx'

// Workspace pages (these will get the sidebar in step 3)
import Dashboard from './pages/Dashboard.jsx'
import Notifications from './pages/Notifications.jsx'
import Profile from './pages/Profile.jsx'
import TaskList from './pages/TaskList.jsx'
import TaskBoard from './pages/TaskBoard.jsx'
import TaskCalendar from './pages/TaskCalendar.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Opening the site sends you to the log in screen */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-updated" element={<PasswordUpdated />} />
        <Route path="/invitations" element={<Invitation />} />

        {/* Workspace screens */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

        {/* Tasks: one page (Private or Shared) shown in three views.
            :pageId is the id of the page picked in the sidebar. */}
        <Route path="/pages/:pageId/list" element={<TaskList />} />
        <Route path="/pages/:pageId/board" element={<TaskBoard />} />
        <Route path="/pages/:pageId/calendar" element={<TaskCalendar />} />

        {/* Any unknown URL goes back to log in */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Success messages, shown on top of every screen */}
      <ToastList />
    </BrowserRouter>
  )
}

export default App
