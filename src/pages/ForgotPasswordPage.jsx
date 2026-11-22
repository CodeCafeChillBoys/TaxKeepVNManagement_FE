import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/authService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Địa chỉ email không đúng định dạng.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(cleanEmail)
      setSubmitted(true)
    } catch (err) {
      setError(err?.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Quên mật khẩu</h1>
          <p className="text-xs text-stone-600 leading-relaxed">
            Nhập địa chỉ email liên kết với tài khoản của bạn để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu đến hộp thư của bạn. Vui lòng kiểm tra hộp thư (liên kết có hiệu lực trong 15 phút).
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
              <Label htmlFor="forgot-email" className="text-[11px]">
                EMAIL <span className="text-brand-700">*</span>
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="user@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                leftIcon={<Mail className="w-4 h-4" />}
                className="h-10 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-xs font-semibold flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi liên kết đặt lại'
              )}
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
