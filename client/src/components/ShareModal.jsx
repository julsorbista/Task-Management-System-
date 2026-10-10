// ShareModal.jsx
// Share a board: invite people by email, copy a shared link,
// change a person's role (Viewer or Editor) or remove them.
// Only the owner of the page can invite, change roles and remove people.

import { useState } from 'react'
import Icon from './Icon.jsx'
import ConfirmDelete from './ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import { inviteMember, updateMemberRole, removeMember } from '../api/api.js'
import { getInitials, isValidEmail } from '../utils/helpers.js'
import './ShareModal.css'

function ShareModal({ page, users, currentUser, onClose, onChanged }) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteError, setInviteError] = useState('')
  const [message, setMessage] = useState('') // small text when copying fails
  const [memberToRemove, setMemberToRemove] = useState(null)

  const isOwner = page.owner === currentUser._id
  const shareLink = window.location.origin + '/pages/' + page._id + '/list'

  // Invite a person by email
  async function handleInvite() {
    if (inviteEmail.trim() === '') {
      setInviteError('Enter an email address.')
      return
    }
    if (!isValidEmail(inviteEmail)) {
      setInviteError('Enter a valid email address.')
      return
    }
    try {
      await inviteMember(page._id, inviteEmail, inviteRole)
      showToast('Member invited')
      setInviteEmail('')
      setInviteError('')
      onChanged() // the page reloads its data
    } catch (error) {
      setInviteError(error.message)
    }
  }

  // Copy the shared link
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setMessage('')
      showToast('Share link copied')
    } catch {
      setMessage('Could not copy. Select the link and copy it yourself.')
    }
  }

  // Change a person's role
  async function handleRoleChange(userId, newRole) {
    await updateMemberRole(page._id, userId, newRole)
    onChanged()
  }

  // Remove a person (after the confirmation)
  async function confirmRemove() {
    await removeMember(page._id, memberToRemove._id)
    setMemberToRemove(null)
    onChanged()
  }

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-label="Share board">
        <div className="modal-header">
          <h2 className="modal-title">Share &quot;{page.name}&quot;</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {/* Invite by email (owner only) */}
        {isOwner ? (
          <div className="field">
            <label className="label" htmlFor="share-email">
              Invite by email
            </label>
            <div className="share-line">
              <input
                id="share-email"
                type="email"
                className={inviteError ? 'input has-error' : 'input'}
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value)
                  setInviteError('')
                }}
              />
              <select
                className="share-role"
                aria-label="Role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" className="btn btn-primary" onClick={handleInvite}>
                Invite
              </button>
            </div>
            {inviteError && <div className="error-text">{inviteError}</div>}
          </div>
        ) : (
          <p className="muted share-note">
            Only the board owner can invite people or change roles.
          </p>
        )}

        {/* Shared link */}
        <div className="field">
          <span className="label">Shared link</span>
          <div className="share-line">
            <input type="text" className="input" readOnly aria-label="Shared link" value={shareLink} />
            <button type="button" className="btn" onClick={handleCopyLink}>
              Copy link
            </button>
          </div>
        </div>

        {message && <p className="small-text">{message}</p>}

        {/* People with access */}
        <span className="label share-people-label">
          People with access
        </span>
        {page.members.map((member) => {
          const user = users.find((u) => u._id === member.user)
          if (!user) return null
          const isThisTheOwner = member.role === 'owner'
          const canChange = isOwner && !isThisTheOwner

          return (
            <div className="share-member" key={member.user}>
              <span className="avatar">{user.photo ? <img src={user.photo} alt="" /> : getInitials(user.name)}</span>
              <span className="share-member-name">
                <span className="one-line share-member-title">
                  {user.name}
                  {user._id === currentUser._id ? ' (you)' : ''}
                </span>
                <span className="one-line small-text share-member-email">
                  {user.email}
                </span>
              </span>

              {canChange ? (
                <>
                  <select
                    className="share-role"
                    aria-label={'Role of ' + user.name}
                    value={member.role}
                    onChange={(event) => handleRoleChange(user._id, event.target.value)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={'Remove ' + user.name}
                    title="Remove"
                    onClick={() => setMemberToRemove(user)}
                  >
                    <Icon name="close" />
                  </button>
                </>
              ) : (
                <span className="muted share-member-role">{member.role}</span>
              )}
            </div>
          )
        })}
      </div>

      {memberToRemove && (
        <ConfirmDelete
          title={'Remove ' + memberToRemove.name + '?'}
          message={memberToRemove.name + ' will lose access to "' + page.name + '".'}
          confirmLabel="Remove"
          onConfirm={confirmRemove}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  )
}

export default ShareModal
