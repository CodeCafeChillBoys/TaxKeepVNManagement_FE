import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F0]">
        <div className="w-12 h-12 rounded-full border-4 border-brand-700/20 border-t-brand-700 animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-stone-600 tracking-wide uppercase">
          Đang khởi tạo hệ thống...
        </p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return children ? children : <Outlet />
}
