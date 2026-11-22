import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoading } from '@/components/ui/loading'

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <PageLoading title="Đang xác thực phiên làm việc..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user?.userRole || user?.role || '').toLowerCase()
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole)
    if (!isAllowed) {
      return <Navigate to="/login" replace />
    }
  }

  return children ? children : <Outlet />
}
