import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  IdCard,
  Zap,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Info,
  Phone,
  Mail,
  User,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'

export function RegisterPage({ onNavigateToLogin }) {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [citizenId, setCitizenId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errors = {}
    const trimmedCccd = citizenId.trim()

    if (!trimmedCccd) {
      errors.citizenId = 'Vui lòng nhập số Căn cước công dân.'
    } else if (!/^\d{12}$/.test(trimmedCccd)) {
      errors.citizenId = 'Số CCCD phải gồm đúng 12 chữ số theo quy định.'
    }

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên.'
    }

    if (phone.trim() && !/^(0|\+84)[0-9]{9}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0 hoặc +84).'
    }

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Địa chỉ email không đúng định dạng.'
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
    } else if (password.length < 8) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.'
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'Bạn cần đồng ý với điều khoản sử dụng để tiếp tục.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        citizenId: citizenId.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phone.trim() || null,
      })

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển đến trang đăng nhập...')
      setTimeout(() => {
        handleGoToLogin()
      }, 2000)
    } catch (err) {
      console.error('Đăng ký thất bại:', err)
      const beErrors = err.errors || err.data?.errors
      if (beErrors && typeof beErrors === 'object') {
        const mappedErrors = {}
        for (const [key, val] of Object.entries(beErrors)) {
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1)
          const fieldName = lowerKey === 'phoneNumber' ? 'phone' : lowerKey
          mappedErrors[fieldName] = Array.isArray(val) ? val[0] : String(val)
        }
        setFieldErrors((prev) => ({ ...prev, ...mappedErrors }))
      }
      setErrorMessage(
        err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin()
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-[#FAF8F0]">
      <main className="flex-1 min-h-0 flex items-center justify-center max-w-[1440px] mx-auto w-full p-2 sm:p-4 lg:p-6 overflow-hidden">
        <div className="w-full h-full max-h-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl border border-cream-300/80 bg-white">
          {/* Cột trái */}
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

          {/* Cột phải: Form Đăng ký */}
          <section className="lg:col-span-7 bg-[#FCFCFA] p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden bg-pattern-subtle h-full">
            <div className="w-full max-w-lg mx-auto my-auto py-2 flex flex-col justify-center">
              <div className="space-y-1 mb-3 text-left">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900">
                  Đăng ký tài khoản
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Vui lòng nhập thông tin định danh Căn cước công dân và thông tin liên lạc để khởi tạo tài khoản quản lý thuế.
                </p>
              </div>

              {/* Thông báo lỗi */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              {/* Thông báo thành công */}
              {successMessage && (
                <div
                  role="status"
                  className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="cccd" className="text-[11px]">
                      CĂN CƯỚC CÔNG DÂN <span className="text-brand-700">*</span>
                    </Label>
                    <Input
                      id="cccd"
                      type="text"
                      maxLength={12}
                      placeholder="Nhập số CCCD (12 số)..."
                      value={citizenId}
                      onChange={(e) => {
                        setCitizenId(e.target.value.replace(/\D/g, '').slice(0, 12))
                        if (fieldErrors.citizenId) {
                          setFieldErrors((p) => ({ ...p, citizenId: null }))
                        }
                      }}
                      rightIcon={<IdCard className="h-4 w-4" />}
                      className={`h-9 text-xs py-1.5 tracking-wide ${
                        fieldErrors.citizenId ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.citizenId && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.citizenId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="fullname" className="text-[11px]">
                      HỌ VÀ TÊN <span className="text-brand-700">*</span>
                    </Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value)
                        if (fieldErrors.fullName) {
                          setFieldErrors((p) => ({ ...p, fullName: null }))
                        }
                      }}
                      rightIcon={<User className="h-4 w-4" />}
                      className={`h-9 text-xs py-1.5 ${
                        fieldErrors.fullName ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="phone" className="text-[11px]">
                      SỐ ĐIỆN THOẠI
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0912 345 678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        if (fieldErrors.phone) {
                          setFieldErrors((p) => ({ ...p, phone: null }))
                        }
                      }}
                      leftIcon={<Phone className="h-4 w-4" />}
                      className={`h-9 text-xs py-1.5 ${
                        fieldErrors.phone ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="email" className="text-[11px]">
                      EMAIL <span className="text-brand-700">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="diachi@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) {
                          setFieldErrors((p) => ({ ...p, email: null }))
                        }
                      }}
                      leftIcon={<Mail className="h-4 w-4" />}
                      className={`h-9 text-xs py-1.5 ${
                        fieldErrors.email ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="register-password" className="text-[11px]">
                      MẬT KHẨU (TỐI THIỂU 8 KÝ TỰ) <span className="text-brand-700">*</span>
                    </Label>
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors((p) => ({ ...p, password: null }))
                        }
                      }}
                      leftIcon={<Lock className="h-4 w-4" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-stone-400 hover:text-stone-700 focus:outline-none cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      className={`h-9 text-xs py-1.5 ${
                        fieldErrors.password ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.password && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="confirm-password" className="text-[11px]">
                      XÁC NHẬN MẬT KHẨU <span className="text-brand-700">*</span>
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((p) => ({ ...p, confirmPassword: null }))
                        }
                      }}
                      leftIcon={<Lock className="h-4 w-4" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-stone-400 hover:text-stone-700 focus:outline-none cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      className={`h-9 text-xs py-1.5 ${
                        fieldErrors.confirmPassword ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-[10px] text-red-600 font-medium">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center pt-0.5">
                  <label className="flex items-start text-xs font-medium text-stone-600 cursor-pointer select-none">
                    <Checkbox
                      id="agree-terms"
                      checked={agreeTerms}
                      onCheckedChange={(checked) => {
                        setAgreeTerms(Boolean(checked))
                        if (fieldErrors.agreeTerms) {
                          setFieldErrors((p) => ({ ...p, agreeTerms: null }))
                        }
                      }}
                      className="mt-0.5"
                    />
                    <span className="ml-2 text-[11px]">
                      Tôi đồng ý với các điều khoản dịch vụ và chính sách bảo mật thông tin thuế
                    </span>
                  </label>
                </div>
                {fieldErrors.agreeTerms && (
                  <p className="text-[10px] text-red-600 font-medium">
                    {fieldErrors.agreeTerms}
                  </p>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 text-xs py-2 font-semibold flex items-center justify-center cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Đăng ký tài khoản hệ thống
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pt-1">
                  <p className="text-xs text-stone-600 font-medium">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={handleGoToLogin}
                      className="font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-4 transition-colors inline-flex items-center cursor-pointer"
                    >
                      Đăng nhập ngay
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </p>
                </div>
              </form>
            </div>

            <div className="pt-3 mt-auto border-t border-stone-200 flex items-center justify-center text-center text-[11px] text-stone-500">
              <div className="flex items-center space-x-3 text-[11px]">
                <a href="#" className="hover:text-stone-800 transition-colors">
                  Điều khoản sử dụng
                </a>
                <span>•</span>
                <a href="#" className="hover:text-stone-800 transition-colors">
                  Hướng dẫn xác thực
                </a>
                <span>•</span>
                <span>Hỗ trợ kỹ thuật (1900 6868)</span>
              </div>
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
