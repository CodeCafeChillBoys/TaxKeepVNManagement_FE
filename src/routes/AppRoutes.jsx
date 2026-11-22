import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { PaymentResultPage } from '@/pages/PaymentResultPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { useAuth } from '@/hooks/useAuth'
import { PageLoading } from '@/components/ui/loading'

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoading title="Đang chuyển hướng hệ thống..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to="/admin" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Điều hướng trang chủ căn cứ vào trạng thái đăng nhập */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />
      <Route path="/payments/vnpay-return" element={<PaymentResultPage />} />
      <Route path="/subscription/vnpay-return" element={<PaymentResultPage />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/:section"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/:section/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
