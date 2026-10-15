import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ToastList from './components/Toast.jsx'
import NavigationToast from './components/NavigationToast.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import CheckEmail from './pages/CheckEmail.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import PasswordUpdated from './pages/PasswordUpdated.jsx'
import Invitation from './pages/Invitation.jsx'
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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-updated" element={<PasswordUpdated />} />
        <Route path="/invitations" element={<Invitation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pages/:pageId/list" element={<TaskList />} />
        <Route path="/pages/:pageId/board" element={<TaskBoard />} />
        <Route path="/pages/:pageId/calendar" element={<TaskCalendar />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastList />
      <NavigationToast />
    </BrowserRouter>
  )
}

export default App
