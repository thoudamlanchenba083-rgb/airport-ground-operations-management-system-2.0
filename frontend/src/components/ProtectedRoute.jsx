import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAccessPage } from '../utils/roleAccess'

export default function ProtectedRoute({ children, page }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (page && !canAccessPage(user, page)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}