import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Icon from '../components/Icon.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import { getCurrentUser, updateProfile, changePassword, deleteAccount } from '../api/api.js'
import { getInitials, isValidEmail, isValidPassword, isValidUsername } from '../utils/helpers.js'
import './Profile.css'
import { workspaceSnapshot } from '../utils/workspaceSnapshot.js'

function Profile() {
  const navigate = useNavigate()
  const [name, setName] = useState(workspaceSnapshot.user?.name || '')
  const [username, setUsername] = useState(workspaceSnapshot.user?.username || '')
  const [email, setEmail] = useState(workspaceSnapshot.user?.email || '')
  const [photo, setPhoto] = useState(workspaceSnapshot.user?.photo || '')
  const [newPhoto, setNewPhoto] = useState('') 
  const [profileErrors, setProfileErrors] = useState({})
  const [savedName, setSavedName] = useState(workspaceSnapshot.user?.name || '')
  const [savedUsername, setSavedUsername] = useState(workspaceSnapshot.user?.username || '')
  const [savedEmail, setSavedEmail] = useState(workspaceSnapshot.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState({})
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isConfirmingRemovePhoto, setIsConfirmingRemovePhoto] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser()
      if (!user) return
      setName(user.name)
      setUsername(user.username)
      setEmail(user.email)
      setSavedName(user.name)
      setSavedUsername(user.username)
      setSavedEmail(user.email)
      setPhoto(user.photo)
    }
    loadUser()
  }, [])

  function handlePhotoPicked(event) {
    const file = event.target.files[0]
    event.target.value = '' 
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setNewPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleRemovePhoto() {
    setIsConfirmingRemovePhoto(false)
    setPhoto('')
    setNewPhoto('') 
    await updateProfile({ photo: '' })
    showToast('Photo removed')
    setSavedCount(savedCount + 1)
  }

  const hasProfileChanges = newPhoto !== '' || name !== savedName || username !== savedUsername || email !== savedEmail

  async function handleSaveProfile() {
    const newErrors = {}
    if (name.trim() === '') newErrors.name = 'Enter your name.'
    if (username.trim() === '') newErrors.username = 'Enter your username.'
    else if (!isValidUsername(username)) {
      newErrors.username = 'Username must be at least 4 characters and use letters, numbers, or underscores.'
    }
    if (email.trim() === '') newErrors.email = 'Enter your email.'
    if (!isValidEmail(email)) newErrors.email = 'Enter a valid email address.'

    setProfileErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await updateProfile({ name: name.trim(), username: username.trim(), email: email.trim() })
    } catch (error) {
      if (error.message.toLowerCase().includes('username')) setProfileErrors({ username: error.message })
      else setProfileErrors({ email: error.message })
      return
    }

    if (newPhoto !== '') {
      await updateProfile({ photo: newPhoto })
      setPhoto(newPhoto)
      setNewPhoto('')
    }

    setName(name.trim())
    setUsername(username.trim())
    setEmail(email.trim())
    setSavedName(name.trim())
    setSavedUsername(username.trim())
    setSavedEmail(email.trim())
    showToast('Profile saved')
    setSavedCount(savedCount + 1)
  }

  async function handleSavePassword() {
    if (isSavingPassword) return
    const newErrors = {}
    if (currentPassword === '') newErrors.currentPassword = 'Enter your current password.'
    if (newPassword === '') newErrors.newPassword = 'Enter your new password.'
    else if (!isValidPassword(newPassword)) newErrors.newPassword = 'Use at least 8 characters.'
    if (confirmPassword === '') newErrors.confirmPassword = 'Confirm your new password.'
    if (confirmPassword !== newPassword) newErrors.confirmPassword = 'Passwords do not match.'

    setPasswordErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password changed')
    } catch (error) {
      setPasswordErrors(error.errors || { currentPassword: error.message })
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount()
                                                                                       
      navigate('/login', { replace: true, state: { toast: 'Your account has been deleted' } })
    } catch (error) {
      setIsConfirmingDelete(false)
      showToast(error.message, 'error')
    }
  }


  return (
    <Layout reloadSignal={savedCount}>
      <div className="profile">
        <h1 className="page-title profile-title">Profile</h1>
        <div className="panel">
          <div className="profile-photo-row">
            <span className="avatar profile-avatar">
              {                                                        }
              {newPhoto || photo ? <img src={newPhoto || photo} alt="Profile" /> : getInitials(name)}
            </span>
            <label className="btn">
              Change photo
              <input type="file" accept="image/*" className="visually-hidden" onChange={handlePhotoPicked} />
            </label>
            {(photo || newPhoto) && (
              <button type="button" className="link" onClick={() => setIsConfirmingRemovePhoto(true)}>
                Remove
              </button>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              className={profileErrors.name ? 'input has-error' : 'input'}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {profileErrors.name && <div className="error-text">{profileErrors.name}</div>}
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-username">
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              className={profileErrors.username ? 'input has-error' : 'input'}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            {profileErrors.username && <div className="error-text">{profileErrors.username}</div>}
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              className={profileErrors.email ? 'input has-error' : 'input'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {profileErrors.email && <div className="error-text">{profileErrors.email}</div>}
          </div>
          {hasProfileChanges && (
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={handleSaveProfile}>
                Save changes
              </button>
            </div>
          )}
        </div>

        {              }
        <div className="panel profile-panel">
          <div className="section-title profile-section-title">Password</div>

          <div className="field">
            <label className="label" htmlFor="profile-current">
              Current password
            </label>
            <div className="password-field">
              <input
                id="profile-current"
                type={showCurrentPassword ? 'text' : 'password'}
                className={passwordErrors.currentPassword ? 'input has-error' : 'input'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Icon name={showCurrentPassword ? 'eye-off' : 'eye'} />
              </button>
            </div>
            {passwordErrors.currentPassword && <div className="error-text">{passwordErrors.currentPassword}</div>}
          </div>

          <div className="two-columns">
            <div className="field">
              <label className="label" htmlFor="profile-new">
                New password
              </label>
              <div className="password-field">
                <input
                  id="profile-new"
                  type={showNewPassword ? 'text' : 'password'}
                  className={passwordErrors.newPassword ? 'input has-error' : 'input'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <Icon name={showNewPassword ? 'eye-off' : 'eye'} />
                </button>
              </div>
              {passwordErrors.newPassword && <div className="error-text">{passwordErrors.newPassword}</div>}
            </div>
            <div className="field">
              <label className="label" htmlFor="profile-confirm">
                Confirm new password
              </label>
              <div className="password-field">
                <input
                  id="profile-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={passwordErrors.confirmPassword ? 'input has-error' : 'input'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} />
                </button>
              </div>
              {passwordErrors.confirmPassword && <div className="error-text">{passwordErrors.confirmPassword}</div>}
            </div>
          </div>

          <div className="row">
            <button type="button" className="btn" disabled={isSavingPassword} onClick={handleSavePassword}>
              {isSavingPassword ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </div>
        
        <div className="panel profile-panel">
          <div className="section-title">Delete account</div>
          <p className="muted profile-delete-text">
            Permanently removes your account, private tasks and board memberships.
          </p>
          <button type="button" className="btn btn-danger" onClick={() => setIsConfirmingDelete(true)}>
            Delete account
          </button>
        </div>

      </div>

      {isConfirmingDelete && (
        <ConfirmDelete
          title="Delete your account?"
          message="Your account, private tasks and board memberships will be permanently deleted. This cannot be undone."
          confirmLabel="Delete account"
          onConfirm={handleDeleteAccount}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}

      {isConfirmingRemovePhoto && (
        <ConfirmDelete
          title="Remove your profile photo?"
          message="Your photo will be removed and replaced with your initials. You can upload a new one anytime."
          confirmLabel="Remove"
          onConfirm={handleRemovePhoto}
          onCancel={() => setIsConfirmingRemovePhoto(false)}
        />
      )}
    </Layout>
  )
}

export default Profile
