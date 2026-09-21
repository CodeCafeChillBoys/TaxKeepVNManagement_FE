import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Star,
  IdCard,
  Zap,
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

export function LoginPage({ onNavigateToRegister, onLoginSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [citizenId, setCitizenId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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

      if (onLoginSuccess) {
        onLoginSuccess(authData)
      } else {
        const redirectPath = location.state?.from?.pathname || '/admin'
        navigate(redirectPath, { replace: true })
      }
    } catch (error) {
      console.error('Đăng nhập thất bại:', error)
      const beErrors = error.errors || error.data?.errors
      if (beErrors && typeof beErrors === 'object') {
        const mappedErrors = {}
        for (const [key, val] of Object.entries(beErrors)) {
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

  const handleGoToRegister = () => {
    if (onNavigateToRegister) {
      onNavigateToRegister()
    } else {
      navigate('/register')
    }
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-[#FAF8F0]">
      <main className="flex-1 min-h-0 flex items-center justify-center max-w-[1440px] mx-auto w-full p-2 sm:p-4 lg:p-6 overflow-hidden">
        <div className="w-full h-full max-h-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl border border-cream-300/80 bg-white">
          {/* Cột trái: Giới thiệu hệ thống */}
          <section className="lg:col-span-5 relative bg-brand-700 text-white flex flex-col p-6 sm:p-8 lg:p-10 overflow-hidden justify-between h-full">
            <div className="absolute inset-0 bg-dong-son opacity-30 pointer-events-none"></div>
            <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full border border-gold-500/20 pointer-events-none"></div>
            <div className="absolute -right-12 -bottom-12 w-72 h-72 rounded-full border border-gold-500/30 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-brand-800 border-2 border-gold-500 flex items-center justify-center shadow-sm shrink-0">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                    TAX KEEP VN
                  </div>
                  <div className="text-[11px] text-stone-200/80 font-medium">
                    Nền tảng quản lý thuế thu nhập cá nhân
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 my-auto">
                <h1 className="text-2xl sm:text-3xl lg:text-3xl font-black tracking-tight leading-snug uppercase text-white">
                  HỆ THỐNG QUẢN LÝ
                  <br />
                  THUẾ THU NHẬP CÁ NHÂN
                </h1>
                <p className="text-xs text-cream-200/90 leading-relaxed max-w-sm">
                  Hệ thống điện tử hỗ trợ người nộp thuế thực hiện kê khai, quyết toán và tra cứu thông tin thuế thu nhập cá nhân minh bạch, bảo mật.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start space-x-3 bg-brand-800/60 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                  <div className="p-2 rounded-lg bg-gold-500/20 text-gold-400 shrink-0 mt-0.5">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                      XÁC THỰC CCCD GẮN CHIP
                    </p>
                    <p className="text-[11px] text-cream-200/80 mt-0.5 leading-relaxed">
                      Tự động đối soát sinh trắc học với Cơ sở dữ liệu quốc gia về dân cư an toàn, bảo mật.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-brand-800/60 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                  <div className="p-2 rounded-lg bg-gold-500/20 text-gold-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                      QUY TẮC TỰ ĐỘNG TÍNH THUẾ ĐIỆN TỬ
                    </p>
                    <p className="text-[11px] text-cream-200/80 mt-0.5 leading-relaxed">
                      Tra cứu nghĩa vụ thuế thu nhập cá nhân, đối soát giảm trừ gia cảnh và hóa đơn điện tử tức thời.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cột phải: Form Đăng nhập */}
          <section className="lg:col-span-7 bg-[#FAF8F0] p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden bg-pattern-subtle h-full">
            <div className="w-full max-w-md mx-auto my-auto py-2 flex flex-col justify-center">
              <div className="space-y-1.5 mb-4 text-left">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900">
                  Đăng nhập hệ thống
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Vui lòng nhập thông tin định danh Căn cước công dân (12 số) hoặc tài khoản chuyên quản để tiếp tục.
                </p>
              </div>

              {/* Thông báo lỗi khi đăng nhập thất bại */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
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
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        alert('Tính năng khôi phục mật khẩu qua VNeID/SMS đang được cập nhật.')
                      }}
                      className="text-[11px] font-medium text-brand-700 hover:text-brand-800 hover:underline shrink-0 whitespace-nowrap"
                    >
                      Quên mật khẩu?
                    </a>
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
                        Đăng nhập hệ thống
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pt-1">
                  <p className="text-xs text-stone-600 font-medium">
                    Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={handleGoToRegister}
                      className="font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
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
