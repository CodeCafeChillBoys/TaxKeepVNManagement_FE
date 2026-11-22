import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoading } from '@/components/ui/loading'

export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoading title="Đang khởi tạo hệ thống..." />
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return children ? children : <Outlet />
}
