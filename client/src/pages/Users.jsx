import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Icon from '../components/Icon.jsx'
import { getUsers } from '../api/api.js'
import { getInitials } from '../utils/helpers.js'
import './Users.css'

function Users() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      try {
        setError('')
        const loadedUsers = await getUsers()
        if (isMounted) setUsers(loadedUsers)
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Failed to load users.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Layout>
      <div className="users-page">
        <div className="users-head">
          <div>
            <div className="small-text">User Management</div>
            <h1 className="users-title">Users</h1>
          </div>
          <div className="users-count">{users.length} visible</div>
        </div>

        {isLoading && (
          <div className="empty-state users-state">
            <strong>Loading users</strong>
            Fetching the people you can work with.
          </div>
        )}

        {!isLoading && error && (
          <div className="empty-state users-state">
            <strong>Could not load users</strong>
            {error}
          </div>
        )}

        {!isLoading && !error && users.length === 0 && (
          <div className="empty-state users-state">
            <strong>No users found</strong>
            Users will appear here when your account can access them.
          </div>
        )}

        {!isLoading && !error && users.length > 0 && (
          <div className="users-list" aria-label="Users">
            {users.map((user) => (
              <div className="user-row" key={user._id}>
                <span className="avatar">
                  {user.photo ? <img src={user.photo} alt="" /> : getInitials(user.name)}
                </span>
                <div className="user-main">
                  <div className="user-name">{user.name}</div>
                  <div className="small-text">{user.email}</div>
                </div>
                <div className="user-safe">
                  <Icon name="lock" />
                  Safe fields only
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Users
