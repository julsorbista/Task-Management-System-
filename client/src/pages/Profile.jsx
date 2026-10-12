// Profile.jsx
// View and edit your name, photo, email and password.
// Also: delete your account, and log out.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Icon from '../components/Icon.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import { getCurrentUser, updateProfile, changePassword, deleteAccount, logout } from '../api/api.js'
import { getInitials, isValidEmail, isValidPassword, isValidUsername } from '../utils/helpers.js'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()

  // Profile fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [photo, setPhoto] = useState('')
  const [newPhoto, setNewPhoto] = useState('') // picked but not saved yet ('' = none)
  const [profileErrors, setProfileErrors] = useState({})

  // The name and email as last saved. The "Save changes" button
  // only shows when the fields are different from these.
  const [savedName, setSavedName] = useState('')
  const [savedUsername, setSavedUsername] = useState('')
  const [savedEmail, setSavedEmail] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState({})
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false)
  const [isConfirmingRemovePhoto, setIsConfirmingRemovePhoto] = useState(false)

  // Goes up after a save, so the sidebar shows the new name and photo
  const [savedCount, setSavedCount] = useState(0)

  // Fill the form with the logged-in user's details
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

  // ---------- Photo ----------
  // Read the picked image file as text (a "data URL") and show it as a preview.
  // It is saved only when "Save changes" (below the email field) is clicked.
  function handlePhotoPicked(event) {
    const file = event.target.files[0]
    event.target.value = '' // so the same file can be picked again later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setNewPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Runs after "Remove" is clicked in the confirmation
  async function handleRemovePhoto() {
    setIsConfirmingRemovePhoto(false)
    setPhoto('')
    setNewPhoto('') // also drop a new photo that was not saved yet
    await updateProfile({ photo: '' })
    showToast('Photo removed')
    setSavedCount(savedCount + 1)
  }

  // ---------- Name and email ----------
  // True when a new photo, the name or the email was changed and not saved yet
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

    // Save the new photo too, if one was picked
    if (newPhoto !== '') {
      await updateProfile({ photo: newPhoto })
      setPhoto(newPhoto)
      setNewPhoto('')
    }

    // Remember the saved values, so the button hides again
    setName(name.trim())
    setUsername(username.trim())
    setEmail(email.trim())
    setSavedName(name.trim())
    setSavedUsername(username.trim())
    setSavedEmail(email.trim())
    showToast('Profile saved')
    setSavedCount(savedCount + 1)
  }

  // ---------- Password ----------
  async function handleSavePassword() {
    const newErrors = {}
    if (currentPassword === '') newErrors.currentPassword = 'Enter your current password.'
    if (newPassword === '') newErrors.newPassword = 'Enter your new password.'
    else if (!isValidPassword(newPassword)) newErrors.newPassword = 'Use at least 8 characters.'
    if (confirmPassword === '') newErrors.confirmPassword = 'Confirm your new password.'
    if (confirmPassword !== newPassword) newErrors.confirmPassword = 'Passwords do not match.'

    setPasswordErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password changed')
    } catch (error) {
      setPasswordErrors({ currentPassword: error.message })
    }
  }

  // ---------- Delete account and log out ----------
  async function handleDeleteAccount() {
    await deleteAccount()
    navigate('/login')
  }

  async function handleLogout() {
    setIsConfirmingLogout(false)
    await logout()
    navigate('/login')
  }

  return (
    <Layout reloadSignal={savedCount}>
      <div className="profile">
        <h1 className="page-title profile-title">Profile</h1>

        {/* Photo, name and email */}
        <div className="panel">
          <div className="profile-photo-row">
            <span className="avatar profile-avatar">
              {/* Shows the new photo as a preview until it is saved */}
              {newPhoto || photo ? <img src={newPhoto || photo} alt="Profile" /> : getInitials(name)}
            </span>

            {/* The real file input is hidden; the label looks like a button */}
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

          {/* Shown only after a new photo was picked or the name/email was changed */}
          {hasProfileChanges && (
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={handleSaveProfile}>
                Save changes
              </button>
            </div>
          )}
        </div>

        {/* Password */}
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
            <button type="button" className="btn" onClick={handleSavePassword}>
              Update password
            </button>
          </div>
        </div>

        {/* Delete account */}
        <div className="panel profile-panel">
          <div className="section-title">Delete account</div>
          <p className="muted profile-delete-text">
            Permanently removes your account, private tasks and board memberships.
          </p>
          <button type="button" className="btn btn-danger" onClick={() => setIsConfirmingDelete(true)}>
            Delete account
          </button>
        </div>

        {/* Log out */}
        <div className="profile-logout">
          <button type="button" className="btn" onClick={() => setIsConfirmingLogout(true)}>
            Log out
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

      {isConfirmingLogout && (
        <ConfirmDelete
          title="Log out of Morrow?"
          message="You can log back in anytime."
          confirmLabel="Log out"
          onConfirm={handleLogout}
          onCancel={() => setIsConfirmingLogout(false)}
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
