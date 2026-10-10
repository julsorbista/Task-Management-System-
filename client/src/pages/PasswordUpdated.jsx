// PasswordUpdated.jsx
// Success message after resetting the password, with a link back to log in.

import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'

function PasswordUpdated() {
  return (
    <AuthCard
      title="Password updated"
      text="Your password has been reset. You can now log in with the new one."
    >
      <Link className="btn btn-primary btn-wide" to="/login">
        Back to log in
      </Link>
    </AuthCard>
  )
}

export default PasswordUpdated
