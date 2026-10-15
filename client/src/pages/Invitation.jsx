import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'
import { clearWorkspaceSnapshot } from '../utils/workspaceSnapshot.js'
import './Invitation.css'

export default function Invitation() {
  const [params] = useSearchParams()
  const token = params.get('token') || params.get('id') || ''
  const navigate = useNavigate()
  const [invitation, setInvitation] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    async function load() {
      if (!/^(?:[a-f0-9]{64}|[a-f0-9]{24})$/.test(token)) { if (active) setError('Invalid invitation link.'); return }
      try {

        const response = await fetch(`/api/invitations/${token}`, { credentials: 'include' })
        const data = await response.json()
        if (!active) return
        if (response.status === 401) {
          setInvitation(null)
          setError('')
          setNeedsLogin(true)
          return
        }
        setNeedsLogin(false)
        if (!response.ok) throw new Error(data.message)
        setError('')
        setInvitation(data)
      } catch (failure) { if (active) setError(failure.message || 'Could not open invitation.') }
    }
    load()
    return () => { active = false }
  }, [token])

  function rememberInvitation() {
    sessionStorage.setItem('morrow-invitation-return', `/invitations?${params.toString()}`)
  }
  async function respond(action) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/invitations/${token}`, { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ action }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      clearWorkspaceSnapshot()
      setInvitation((current) => ({ ...current, status: data.status }))
      if (action === 'accept') navigate(`/pages/${data.boardId}/list`)
    } catch (failure) { setError(failure.message || 'Could not respond to invitation.') }
    finally { setBusy(false) }
  }
  return <AuthCard title="Board invitation" text="Accept or decline access to a shared board.">
    {needsLogin && <>
      <p>Sign in with the email that received this invitation to accept or decline.</p>
      <div className="invitation-actions invitation-actions-single">
        <Link className="btn btn-primary" to="/login" onClick={rememberInvitation}>Log in</Link>
      </div>
    </>}
    {invitation && <>
      <p><strong>{invitation.senderName}</strong> invited you to <strong>{invitation.boardName}</strong> as <strong>{invitation.role}</strong>.</p>
      {invitation.status === 'pending' ? <>
        <p>Choose whether to join this board.</p>
        <div className="invitation-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => respond('accept')}>Accept invitation</button>
          <button type="button" className="btn" disabled={busy} onClick={() => respond('decline')}>Decline invitation</button>
        </div>
      </> : <p>This invitation was {invitation.status}.</p>}
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {!needsLogin && error && <p className="auth-bottom">
      <Link className="link" to="/login" onClick={rememberInvitation}>Sign in with another account</Link>
    </p>}
  </AuthCard>
}
