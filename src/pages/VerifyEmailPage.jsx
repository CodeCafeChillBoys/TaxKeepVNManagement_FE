import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionLoading } from '@/components/ui/loading'
import { authService } from '@/services/authService'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | expired | invalid
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendInfo, setResendInfo] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus('invalid')
      setMessage('Liên kết xác minh không hợp lệ hoặc đã được sử dụng.')
      return
    }

    let cancelled = false
    authService
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) {
          setStatus('success')
        }
      })
      .catch((err) => {
        if (cancelled) return
        const code = String(
          err?.errors?.errorCode || err?.errorCode || err?.data?.errors?.errorCode || ''
        ).toUpperCase()
        if (code === 'TOKEN_EXPIRED') {
          setStatus('expired')
          setMessage(err?.message || 'Liên kết xác minh đã hết hạn (quá 24 giờ)')
        } else {
          setStatus('invalid')
          setMessage(err?.message || 'Liên kết xác minh không hợp lệ hoặc đã được sử dụng.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleResend = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setResendInfo('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }
    setResending(true)
    setResendInfo('')
    try {
      const res = await authService.resendVerification(cleanEmail)
      setResendInfo(
        res?.message ||
          'Nếu email tồn tại và chưa được xác minh, chúng tôi đã gửi lại email xác minh.'
      )
    } catch (err) {
      setResendInfo(
        err?.message ||
          'Nếu email tồn tại và chưa được xác minh, chúng tôi đã gửi lại email xác minh.'
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-8 text-center space-y-4">
        {status === 'verifying' && (
          <SectionLoading
            title="Đang xác minh email..."
            description="Vui lòng đợi trong giây lát khi hệ thống kiểm tra liên kết xác minh của bạn."
            variant="brand"
            minHeight="min-h-[160px]"
          />
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <h1 className="text-xl font-bold text-stone-900">
              Kích hoạt tài khoản thành công!
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Địa chỉ email của bạn đã được xác minh. Bây giờ bạn có thể đăng nhập vào hệ thống TaxKeep VN.
            </p>
            <Button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-10 text-xs font-semibold cursor-pointer"
            >
              Đăng nhập ngay
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
            <h1 className="text-lg font-bold text-stone-900">
              Liên kết xác minh đã hết hạn (quá 24 giờ)
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <Input
                type="email"
                placeholder="Nhập địa chỉ email của bạn..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="h-10 text-xs"
              />
              <Button
                type="submit"
                disabled={resending}
                className="w-full h-10 text-xs font-semibold cursor-pointer"
              >
                {resending ? 'Đang gửi...' : 'Gửi lại email xác minh'}
              </Button>
              {resendInfo && (
                <p className="text-xs text-center text-emerald-700 font-medium">{resendInfo}</p>
              )}
            </form>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-brand-700 hover:underline cursor-pointer pt-2"
            >
              Quay lại Đăng nhập
            </button>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="w-14 h-14 text-red-600 mx-auto" />
            <h1 className="text-lg font-bold text-stone-900">
              Liên kết xác minh không hợp lệ hoặc đã được sử dụng.
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
            <Button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-10 text-xs font-semibold cursor-pointer"
            >
              Quay lại Đăng nhập
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
