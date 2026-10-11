import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F0]">
        <div className="w-12 h-12 rounded-full border-4 border-brand-700/20 border-t-brand-700 animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-stone-600 tracking-wide uppercase">
          Đang xác thực phiên làm việc...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user?.userRole || user?.role || '').toLowerCase()
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole)
    if (!isAllowed) {
      if (userRole === 'expert') {
        return <Navigate to="/expert" replace />
      }
      if (userRole === 'admin') {
        return <Navigate to="/admin" replace />
      }
      return <Navigate to="/login" replace />
    }
  }

  return children ? children : <Outlet />
}
