import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
  Calendar,
  CreditCard,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Check,
  Copy,
} from 'lucide-react'
import { expertPortalService } from '@/services/expertPortalService'

function formatVnd(amount) {
  if (amount == null || isNaN(amount)) return '0 đ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatVnDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [escrow, setEscrow] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  // Trích xuất các query parameters từ VNPay
  const vnpParams = useMemo(() => {
    const params = {}
    searchParams.forEach((val, key) => {
      params[key] = val
    })
    return params
  }, [searchParams])

  const responseCode = vnpParams.vnp_ResponseCode
  const orderCode = vnpParams.vnp_TxnRef
  const transactionNo = vnpParams.vnp_TransactionNo
  const bankCode = vnpParams.vnp_BankCode
  const vnpAmount = vnpParams.vnp_Amount ? Number(vnpParams.vnp_Amount) / 100 : null

  // Đã xác nhận thành công trong cơ sở dữ liệu (Database)
  const isConfirmedInDb =
    escrow?.escrowStatus === 'HeldInEscrow' ||
    escrow?.bookingStatus === 'AWAITING_EXPERT_APPROVAL' ||
    escrow?.bookingStatus === 'CONFIRMED' ||
    escrow?.bookingStatus === 'IN_PROGRESS'

  // Chỉ xem là thành công khi DB xác nhận hoặc VNPay báo 00 và không có lỗi backend
  const isSuccess = isConfirmedInDb || (responseCode === '00' && !errorMessage && !loading && escrow !== null)

  // Deep Link mở lại Mobile App: hỗ trợ cả Expo Go (exp://) và Bản cài APK (taxkeep://)
  const { deepLink, expoUrl, standaloneUrl } = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'
    const effectiveBookingId = escrow?.bookingId || vnpParams.bookingId || ''

    const qParams = new URLSearchParams()
    if (effectiveBookingId) qParams.set('bookingId', effectiveBookingId)
    qParams.set('isSuccess', isSuccess ? 'true' : 'false')
    if (responseCode) qParams.set('vnp_ResponseCode', responseCode)
    if (orderCode) qParams.set('vnp_TxnRef', orderCode)

    // Chuyển toàn bộ các tham số vnp_ sang deep link để Mobile App có thể fallback đối soát
    Object.entries(vnpParams).forEach(([k, v]) => {
      if (k.startsWith('vnp_') && !qParams.has(k)) {
        qParams.set(k, v)
      }
    })

    const cleanQuery = qParams.toString() ? `?${qParams.toString()}` : (window.location.search || '')
    const exp = `exp://${host}:8081/--/payments/vnpay-return${cleanQuery}`
    const app = `taxkeep://payments/vnpay-return${cleanQuery}`

    // Mặc định ưu tiên Expo Go nếu đang chạy trên mạng nội bộ / LAN IP
    const isDevHost = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')
    return {
      deepLink: isDevHost ? exp : app,
      expoUrl: exp,
      standaloneUrl: app,
    }
  }, [escrow?.bookingId, isSuccess, responseCode, orderCode, vnpParams])

  const handleOpenApp = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    // Thử mở Expo Go trước, sau đó fallback sang custom scheme
    window.location.href = expoUrl

    setTimeout(() => {
      window.location.href = standaloneUrl
    }, 600)
  }

  // Gọi Backend để xử lý đối soát & kích hoạt cập nhật trạng thái
  const processVnPayReturn = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      if (Object.keys(vnpParams).length > 0) {
        const res = await expertPortalService.handleVnPayReturn(vnpParams)
        if (res) {
          setEscrow(res)
        }
      }
    } catch (err) {
      console.warn('VnPay return verification error:', err)
      setErrorMessage(err?.message || 'Không thể kết nối máy chủ để xác thực kết quả thanh toán.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    processVnPayReturn()
  }, [vnpParams])

  const handleCopyOrder = () => {
    const code = escrow?.bookingCode || orderCode || ''
    if (!code) return
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Diễn giải kết quả nếu không thành công
  const getFailureReason = (code) => {
    if (code === '00') {
      return errorMessage || 'Thanh toán tại VNPay thành công nhưng chưa thể đồng bộ với hệ thống. Vui lòng bấm thử lại.'
    }
    switch (code) {
      case '24':
        return 'Bạn đã hủy giao dịch.'
      case '09':
        return 'Thẻ chưa kích hoạt Internet Banking.'
      case '51':
        return 'Tài khoản không đủ số dư.'
      case '79':
        return 'Nhập sai mật khẩu quá số lần quy định.'
      case '11':
        return 'Hết thời gian chờ thanh toán.'
      default:
        return errorMessage || 'Thanh toán không thành công.'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center py-8 px-4 selection:bg-amber-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* Header Accent Bar */}
          <div
            className={`h-2 w-full ${
              loading
                ? 'bg-amber-400 animate-pulse'
                : isSuccess
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
          />

          <div className="p-6 sm:p-8">
            {/* Loading State */}
            {loading ? (
              <div className="text-center py-10 space-y-3">
                <RefreshCw className="w-9 h-9 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Đang kiểm tra kết quả...
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vui lòng chờ giây lát
                </p>
              </div>
            ) : isSuccess ? (
              /* Success State */
              <div className="space-y-5">
                {/* Hero Icon */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      Thanh toán thành công!
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lịch hẹn đã được xác nhận
                    </p>
                  </div>
                </div>

                {/* Amount Highlight */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-3.5 text-center">
                  <div className="text-xs uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
                    Số tiền thanh toán
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatVnd(escrow?.amount || vnpAmount || 0)}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      Mã lịch hẹn:
                    </span>
                    <button
                      onClick={handleCopyOrder}
                      className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      title="Sao chép"
                    >
                      {escrow?.bookingCode || orderCode || '—'}
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      Phương thức:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Cổng VNPay {bankCode ? `(${bankCode})` : ''}
                    </span>
                  </div>

                  {transactionNo && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Mã giao dịch:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{transactionNo}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Thời gian:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {formatVnDate(escrow?.paidAt || new Date())}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                      ● Đã tạm giữ an toàn
                    </span>
                  </div>
                </div>

                {/* Short Guarantee Note */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Khoản tiền được tạm giữ an toàn cho đến khi hoàn thành buổi tư vấn.</span>
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  <a
                    href={deepLink}
                    onClick={handleOpenApp}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-blue-900 hover:bg-blue-850 active:scale-[0.99] transition shadow-md shadow-blue-900/20 text-sm"
                  >
                    <Smartphone className="w-4 h-4" />
                    Quay lại ứng dụng TaxKeepVN
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
                    Hoặc bạn có thể chuyển lại ứng dụng qua thanh đa nhiệm của điện thoại
                  </p>
                </div>
              </div>
            ) : (
              /* Failure State */
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      {responseCode === '00' ? 'Đang đồng bộ thanh toán' : 'Thanh toán chưa hoàn tất'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {getFailureReason(responseCode)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {orderCode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                    <span className={`font-medium ${responseCode === '00' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {responseCode === '00' ? 'Chưa đồng bộ máy chủ' : (responseCode === '24' ? 'Đã hủy' : 'Chưa hoàn tất')}
                    </span>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  {responseCode === '00' && (
                    <button
                      type="button"
                      onClick={processVnPayReturn}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition text-sm shadow-md"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Thử xác thực lại với máy chủ
                    </button>
                  )}

                  <a
                    href={deepLink}
                    onClick={handleOpenApp}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 transition text-sm"
                  >
                    <Smartphone className="w-4 h-4" />
                    Quay lại ứng dụng TaxKeepVN
                  </a>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
                    Hoặc bạn có thể chuyển lại ứng dụng qua thanh đa nhiệm của điện thoại
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center mt-5 text-xs text-slate-400 dark:text-slate-500">
          TaxKeepVN © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
