/** Định dạng dùng chung cho các tab gói dịch vụ của admin */

export const formatVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`

export const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatLimit = (v, unit = '') => (v === -1 ? 'Không giới hạn' : `${v ?? 0}${unit ? ` ${unit}` : ''}`)

export const CYCLE_LABELS = { free: 'Miễn phí', monthly: 'Theo tháng', yearly: 'Theo năm' }

export const STATUS_LABELS = {
  active: 'Đang dùng',
  pending: 'Chờ thanh toán',
  cancelled: 'Đã kết thúc',
  expired: 'Hết hạn',
}

export const PAYMENT_STATUS_LABELS = {
  paid: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
  free: 'Miễn phí',
}

export const METHOD_LABELS = {
  FREE: 'Miễn phí',
  WALLET: 'Ví TaxKeep',
  VNPAY: 'VNPay',
  VIETQR: 'VietQR',
  ADMIN_GRANT: 'Admin tặng',
}

export const labelOf = (map, key) =>
  map[(key || '').toString()] || map[(key || '').toString().toLowerCase()] || key || '—'

/** Gói trả phí đang hoạt động thì mới gia hạn được (BE chặn gói free / không có ngày hết hạn) */
export const canExtend = (sub) => sub?.status === 'active' && sub?.billingCycle !== 'free' && Boolean(sub?.expiresAt)

/**
 * Chỉ hoàn tiền đơn đã thu tiền thật. BE chỉ chặn "đã hoàn" và "0đ", nên đơn pending/failed
 * vẫn qua được ở BE; FE chặn thêm để không hoàn tiền cho đơn chưa từng thanh toán.
 */
export const canRefund = (sub) =>
  sub?.paymentStatus === 'paid' && Number(sub?.amountPaid) > 0 && sub?.paymentMethod !== 'ADMIN_GRANT'
