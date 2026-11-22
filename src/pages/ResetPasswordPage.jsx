import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionLoading } from '@/components/ui/loading'
import { authService } from '@/services/authService'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [tokenState, setTokenState] = useState('checking') // checking | valid | invalid
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token')
    if (!urlToken) {
      setTokenState('invalid')
      return
    }
    setToken(urlToken)

    let cancelled = false
    authService
      .validateResetToken(urlToken)
      .then((res) => {
        if (!cancelled) {
          if (res?.valid === false || res?.data?.valid === false) {
            setTokenState('invalid')
          } else {
            setTokenState('valid')
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenState('invalid')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await authService.resetPassword({
        token,
        newPassword,
        confirmNewPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      const code = String(
        err?.errors?.errorCode || err?.errorCode || err?.data?.errors?.errorCode || ''
      ).toUpperCase()
      if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'INVALID_OR_EXPIRED_TOKEN') {
        setTokenState('invalid')
      } else {
        setError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-5">
        {tokenState === 'checking' && (
          <SectionLoading
            title="Đang kiểm tra liên kết..."
            description="Hệ thống đang xác thực mã đặt lại mật khẩu của bạn."
            variant="brand"
            minHeight="min-h-[140px]"
          />
        )}

        {tokenState === 'invalid' && (
          <div className="text-center space-y-4">
            <AlertCircle className="w-14 h-14 text-red-600 mx-auto" />
            <h1 className="text-lg font-bold text-stone-900">
              Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Vui lòng gửi lại yêu cầu mới để nhận liên kết đặt lại mật khẩu hợp lệ.
            </p>
            <Button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="w-full h-10 text-xs font-semibold cursor-pointer"
            >
              Yêu cầu liên kết mới
            </Button>
          </div>
        )}

        {tokenState === 'valid' && (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold text-stone-900">Đặt lại mật khẩu</h1>
              <p className="text-xs text-stone-600">
                Nhập mật khẩu mới tối thiểu 8 ký tự cho tài khoản của bạn.
              </p>
            </div>

            {success ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  Đặt lại mật khẩu thành công! Đang chuyển hướng về trang Đăng nhập...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="new-password" className="text-[11px]">
                    MẬT KHẨU MỚI <span className="text-brand-700">*</span>
                  </Label>
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 8 ký tự..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="confirm-new-password" className="text-[11px]">
                    XÁC NHẬN MẬT KHẨU MỚI <span className="text-brand-700">*</span>
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    className="h-10 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 text-xs font-semibold cursor-pointer"
                >
                  {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
