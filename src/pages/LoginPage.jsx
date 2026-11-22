import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  IdCard,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'

export function LoginPage({ onNavigateToRegister, onLoginSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, logout } = useAuth()

  const [citizenId, setCitizenId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errors = {}
    const trimmedId = citizenId.trim()

    if (!trimmedId) {
      errors.citizenId = 'Vui lòng nhập số Căn cước công dân.'
    } else if (!/^\d{12}$/.test(trimmedId)) {
      errors.citizenId = 'Số CCCD phải gồm đúng 12 chữ số theo quy định.'
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu truy cập.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setEmailNotVerified(false)
    setResendMessage('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const authData = await login({
        citizenId: citizenId.trim(),
        password,
        rememberMe,
      })

      const role = (authData?.userRole || authData?.role || '').toLowerCase()
      if (role !== 'admin') {
        await logout()
        setErrorMessage(
          'Cổng thông tin này chỉ dành riêng cho Quản trị viên hệ thống. Tài khoản của bạn không có quyền truy cập.'
        )
        return
      }

      if (onLoginSuccess) {
        onLoginSuccess(authData)
      } else {
        const fromPath = location.state?.from?.pathname
        const redirectPath =
          fromPath && fromPath.startsWith('/admin') ? fromPath : '/admin'
        navigate(redirectPath, { replace: true })
      }
    } catch (error) {
      const beErrors = error.errors || error.data?.errors
      const errorCode = String(
        beErrors?.errorCode || error.errorCode || error.data?.errorCode || ''
      ).toUpperCase()

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true)
        setErrorMessage(
          error.message ||
            'Tài khoản chưa được xác minh email. Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác minh.'
        )
        return
      }

      if (beErrors && typeof beErrors === 'object') {
        const mappedErrors = {}
        for (const [key, val] of Object.entries(beErrors)) {
          if (key === 'errorCode') continue
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1)
          mappedErrors[lowerKey] = Array.isArray(val) ? val[0] : String(val)
        }
        setFieldErrors((prev) => ({ ...prev, ...mappedErrors }))
      }
      setErrorMessage(
        error.message || 'Số CCCD hoặc mật khẩu không chính xác. Vui lòng thử lại.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    const cleanEmail = resendEmail.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setResendMessage('Vui lòng nhập địa chỉ email đã đăng ký.')
      return
    }
    setResending(true)
    setResendMessage('')
    try {
      const res = await authService.resendVerification(cleanEmail)
      setResendMessage(
        res?.message ||
          'Nếu email tồn tại và chưa được xác minh, chúng tôi đã gửi lại email xác minh.'
      )
    } catch (err) {
      setResendMessage(
        err?.message ||
          'Nếu email tồn tại và chưa được xác minh, chúng tôi đã gửi lại email xác minh.'
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen overflow-y-auto lg:overflow-hidden flex flex-col justify-between bg-[#FAF8F0]">
      <main className="flex-1 min-h-0 flex items-center justify-center max-w-[1440px] mx-auto w-full p-2 sm:p-4 lg:p-6 lg:overflow-hidden">
        <div className="w-full lg:h-full lg:max-h-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl border border-cream-300/80 bg-white">
          {/* Cột trái: Giới thiệu Bảng điều khiển quản trị viên */}
          <section className="lg:col-span-5 relative bg-brand-700 text-white flex flex-col p-6 sm:p-8 lg:p-10 overflow-hidden justify-between lg:h-full">
            <div className="absolute inset-0 bg-dong-son opacity-30 pointer-events-none"></div>
            <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full border border-gold-500/20 pointer-events-none"></div>
            <div className="absolute -right-12 -bottom-12 w-72 h-72 rounded-full border border-gold-500/30 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="TaxKeep VN Logo"
                  className="w-10 h-10 object-contain drop-shadow-sm shrink-0"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                    TaxKeep VN
                  </div>
                  <div className="text-[11px] text-stone-200/80 font-medium">
                    Bảng điều khiển hệ thống
                  </div>
                </div>
              </div>

              <div className="space-y-3 my-auto">
                <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-gold-400">
                  CỔNG QUẢN TRỊ NỘI BỘ
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-3xl font-black tracking-tight leading-snug uppercase text-white">
                  BẢNG ĐIỀU KHIỂN
                  <br />
                  QUẢN TRỊ VIÊN
                </h1>
                <p className="text-xs text-cream-200/90 leading-relaxed max-w-sm">
                  Hệ thống quản trị tập trung phục vụ thẩm định văn bản quy phạm, phê duyệt quy tắc thuế, quản lý hồ sơ chuyên gia và giám sát vận hành toàn hệ thống.
                </p>
              </div>

              <div className="text-[11px] text-cream-200/70">
                Chỉ dành cho tài khoản Quản trị viên được cấp quyền.
              </div>
            </div>
          </section>

          {/* Cột phải: Form Đăng nhập */}
          <section className="lg:col-span-7 bg-[#FAF8F0] p-6 sm:p-8 lg:p-10 flex flex-col justify-between lg:overflow-hidden bg-pattern-subtle lg:h-full">
            <div className="w-full max-w-md mx-auto my-auto py-2 flex flex-col justify-center">
              <div className="space-y-1.5 mb-5 text-left">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900">
                  Đăng nhập Quản trị viên
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Vui lòng nhập số Căn cước công dân (12 số) và mật khẩu tài khoản quản trị để truy cập Bảng điều khiển hệ thống.
                </p>
              </div>

              {/* Thông báo lỗi khi đăng nhập thất bại */}
              {errorMessage && (
                <div
                  role="alert"
                  className={`mb-4 p-3 rounded-xl border flex flex-col gap-2.5 text-xs animate-in fade-in duration-200 ${
                    emailNotVerified
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        emailNotVerified ? 'text-amber-600' : 'text-red-600'
                      }`}
                    />
                    <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                  </div>
                  {emailNotVerified && (
                    <div className="pt-2 border-t border-amber-200/80 space-y-2">
                      <Input
                        type="email"
                        placeholder="Nhập email đã đăng ký để nhận lại liên kết..."
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                      <Button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="w-full h-8 text-xs font-semibold cursor-pointer"
                      >
                        {resending ? 'Đang gửi...' : 'Gửi lại email kích hoạt'}
                      </Button>
                      {resendMessage && (
                        <p className="text-[11px] font-medium text-emerald-700">
                          {resendMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}



              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="citizen-id" className="text-[11px]">
                    Căn cước công dân <span className="text-brand-700">*</span>
                  </Label>
                  <Input
                    id="citizen-id"
                    type="text"
                    maxLength={12}
                    placeholder="Nhập số Căn cước công dân (12 số)..."
                    value={citizenId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setCitizenId(val)
                      if (fieldErrors.citizenId) {
                        setFieldErrors((prev) => ({ ...prev, citizenId: null }))
                      }
                    }}
                    leftIcon={<IdCard className="h-4 w-4" />}
                    className={`tracking-wide h-10 text-xs py-2 ${
                      fieldErrors.citizenId ? 'border-red-500 focus-visible:ring-red-400' : ''
                    }`}
                  />
                  {fieldErrors.citizenId && (
                    <p className="text-[11px] text-red-600 font-medium">
                      {fieldErrors.citizenId}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[11px]">
                      Mật khẩu <span className="text-brand-700">*</span>
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] font-medium text-brand-700 hover:text-brand-800 hover:underline shrink-0 whitespace-nowrap"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu truy cập"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: null }))
                      }
                    }}
                    leftIcon={<Lock className="h-4 w-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Ẩn hoặc hiện mật khẩu"
                        className="text-stone-400 hover:text-stone-700 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    className={`h-10 text-xs py-2 ${
                      fieldErrors.password ? 'border-red-500 focus-visible:ring-red-400' : ''
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 font-medium">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center text-xs font-medium text-stone-600 cursor-pointer select-none">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    />
                    <span className="ml-2 text-xs">Ghi nhớ trên thiết bị này</span>
                  </label>
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 text-xs py-2 transition-all font-semibold flex items-center justify-center cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang xác thực tài khoản...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Đăng nhập Bảng điều khiển
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            <div className="pt-3 mt-auto border-t border-stone-200 flex items-center justify-center text-center text-[11px] text-stone-500">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="hover:text-stone-800 underline underline-offset-4 decoration-stone-300 transition-colors"
              >
                Chính sách quyền riêng tư & bảo mật thông tin thuế
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full bg-[#FAF8F0] border-t border-cream-300 py-2 shrink-0 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-1 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center space-x-5 font-medium mx-auto text-[11px] sm:text-xs">
            <a href="#" className="hover:text-brand-700 transition-colors">
              Điều khoản sử dụng
            </a>
            <span className="text-stone-300">•</span>
            <a href="#" className="hover:text-brand-700 transition-colors">
              Hướng dẫn xác thực
            </a>
            <span className="text-stone-300">•</span>
            <a href="#" className="hover:text-brand-700 transition-colors">
              Hỗ trợ kỹ thuật (1900 6868)
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
