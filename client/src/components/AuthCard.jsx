
import Icon from './Icon.jsx'
import './AuthCard.css'

function AuthCard({ title, text, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Icon name="logo" />
          Morrow
        </div>
        <h1 className="page-title">{title}</h1>
        <p className="auth-text">{text}</p>
        {children}
      </div>
    </div>
  )
}

export default AuthCard
