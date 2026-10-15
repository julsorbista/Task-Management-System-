import { useState } from 'react'
import Icon from './Icon.jsx'
import ConfirmDelete from './ConfirmDelete.jsx'
import { showToast } from '../utils/toast.js'
import { inviteMember, updateMemberRole, removeMember } from '../api/api.js'
import { getInitials, isValidEmail } from '../utils/helpers.js'
import './ShareModal.css'

function ShareModal({ page, pageId, users, currentUser, onClose, onChanged }) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteError, setInviteError] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [newInvitations, setNewInvitations] = useState([])
  const [message, setMessage] = useState('') 
  const [memberToRemove, setMemberToRemove] = useState(null)
  const boardId = page._id || page.id || pageId
  const isOwner = page.owner === currentUser._id
  const shareLink = window.location.origin + '/pages/' + boardId + '/list'

  async function handleInvite() {
    if (isInviting) return
    if (inviteEmail.trim() === '') {
      setInviteError('Enter an email address.')
      return
    }
    if (!isValidEmail(inviteEmail)) {
      setInviteError('Enter a valid email address.')
      return
    }
    if (!boardId) {
      setInviteError('Board ID is missing. Refresh the page and try again.')
      return
    }
    setIsInviting(true)
    try {
      const result = await inviteMember(boardId, inviteEmail, inviteRole)
      setNewInvitations((items) => [...items, result.invitation])
      showToast('Invitation email sent')
      setInviteEmail('')
      setInviteError('')
      onChanged() 
    } catch (error) {
      setInviteError(error.message)
    } finally {
      setIsInviting(false)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setMessage('')
      showToast('Share link copied')
    } catch {
      setMessage('Could not copy. Select the link and copy it yourself.')
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await updateMemberRole(boardId, userId, newRole)
      onChanged()
    } catch (error) {
      showToast(error.message || 'Failed to change member role.')
    }
  }

  async function confirmRemove() {
    try {
      await removeMember(boardId, memberToRemove._id)
      setMemberToRemove(null)
      onChanged()
    } catch (error) {
      showToast(error.message || 'Failed to remove member.')
    }
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

        {isOwner ? (
          <div className="field">
            <label className="label" htmlFor="share-email">
              Invite by email
            </label>
            <p className="small-text">Invite someone who already has a Morrow account.</p>
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
              <button type="button" className="btn btn-primary" disabled={isInviting} onClick={handleInvite}>
                {isInviting ? 'Sending invitation…' : 'Invite'}
              </button>
            </div>
            {inviteError && <div className="error-text">{inviteError}</div>}
          </div>
        ) : (
          <p className="muted share-note">
            Only the board owner can invite people or change roles.
          </p>
        )}

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

        {isOwner && <>
          <span className="label share-people-label">Pending invitations</span>
          {[...(page.invitations || []), ...newInvitations.filter((item) => !(page.invitations || []).some((existing) => existing._id === item._id))].map((invitation) => (
            <div className="share-member" key={invitation._id}>
              <span className="share-member-name">{invitation.email}</span>
              <span className="small-text">{invitation.role} · Pending</span>
            </div>
          ))}
          <p className="small-text">Access starts after the recipient accepts the email invitation.</p>
        </>}

        {                        }
        <span className="label share-people-label">
          People with access
        </span>
        {(page.members || []).map((member) => {
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
