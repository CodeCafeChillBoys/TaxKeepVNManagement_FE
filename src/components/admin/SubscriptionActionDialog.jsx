import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatVnd } from '@/utils/subscriptionFormat'

const DAY_PRESETS = [30, 90, 365]

const DEFAULT_REASON = {
  gift: 'Quà tặng tri ân từ Ban quản trị TaxKeepVN',
  extend: 'Gia hạn dịch vụ từ Ban quản trị TaxKeepVN',
  refund: '',
}

const TITLES = { gift: 'Tặng gói', extend: 'Gia hạn gói', refund: 'Hoàn tiền gói' }
const SUBMIT = { gift: 'Tặng gói', extend: 'Gia hạn', refund: 'Hoàn tiền' }

const addDays = (base, days) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Hộp thoại thao tác trên một lượt đăng ký: tặng gói (gift), gia hạn (extend), hoàn tiền (refund).
 * `subscription` là dòng đang chọn trong bảng (AdminUserSubscriptionResponse).
 */
export function SubscriptionActionDialog({ mode, subscription, plans = [], isSubmitting = false, onClose, onSubmit }) {
  const open = Boolean(mode && subscription)
  const [planId, setPlanId] = useState('')
  const [days, setDays] = useState(30)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})

  // Chỉ tặng gói trả phí đang mở bán (tặng Basic không có ý nghĩa)
  const giftablePlans = plans.filter((p) => p.isActive && p.slug !== 'basic')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    setPlanId('')
    setDays(30)
    setAmount(subscription?.amountPaid ? String(subscription.amountPaid) : '')
    setReason(DEFAULT_REASON[mode] || '')
  }, [open, mode, subscription])

  if (!open) return null

  const daysNum = Math.round(Number(days))
  const amountNum = Number(amount)
  const amountPaid = Number(subscription.amountPaid) || 0
  const isPaidActive =
    subscription.status === 'active' && subscription.billingCycle !== 'free' && Number(subscription.amountPaid) > 0

  const validate = () => {
    const e = {}
    if (mode === 'gift' && !planId) e.planId = 'Chọn gói muốn tặng.'
    if (mode !== 'refund' && (!Number.isFinite(daysNum) || daysNum < 1 || daysNum > 3650)) {
      e.days = 'Nhập số ngày từ 1 đến 3650.'
    }
    if (mode === 'refund') {
      if (!Number.isFinite(amountNum) || amountNum <= 0) e.amount = 'Nhập số tiền lớn hơn 0.'
      else if (amountNum > amountPaid) e.amount = `Không vượt quá số tiền đã trả (${formatVnd(amountPaid)}).`
    }
    if (!reason.trim()) e.reason = 'Vui lòng nhập lý do.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    if (mode === 'gift') {
      onSubmit({ userId: subscription.userId, planId, durationDays: daysNum, reason: reason.trim() })
    } else if (mode === 'extend') {
      onSubmit({ extensionDays: daysNum, reason: reason.trim() })
    } else {
      // Hoàn toàn bộ thì để BE tự lấy amountPaid
      onSubmit({ refundAmount: amountNum === amountPaid ? null : amountNum, reason: reason.trim() })
    }
  }

  // Gia hạn cộng từ ngày hết hạn hiện tại (hoặc hôm nay nếu đã quá hạn), giống BE
  const extendBase =
    subscription.expiresAt && new Date(subscription.expiresAt) > new Date() ? subscription.expiresAt : new Date()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {subscription.userFullName} ({subscription.userEmail}), đang ở {subscription.planName}. Người dùng nhận
            thông báo trong app sau khi bạn xác nhận.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'gift' && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Gói tặng <span className="text-red-600">*</span>
              </Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Chọn gói" />
                </SelectTrigger>
                <SelectContent>
                  {giftablePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.planId && <span className="text-[11px] text-red-600">{errors.planId}</span>}
            </div>
          )}

          {mode !== 'refund' && (
            <div className="flex flex-col gap-1.5">
              <Label>{mode === 'gift' ? 'Thời hạn tặng (ngày)' : 'Số ngày gia hạn thêm'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-28"
                />
                {DAY_PRESETS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={daysNum === d ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-2.5 text-[11px]"
                    onClick={() => setDays(d)}
                  >
                    {d} ngày
                  </Button>
                ))}
              </div>
              {errors.days ? (
                <span className="text-[11px] text-red-600">{errors.days}</span>
              ) : (
                Number.isFinite(daysNum) &&
                daysNum > 0 && (
                  <span className="text-[11px] text-on-surface-variant">
                    Hết hạn mới: {formatDate(addDays(mode === 'gift' ? new Date() : extendBase, daysNum))}
                  </span>
                )
              )}
            </div>
          )}

          {mode === 'refund' && (
            <div className="flex flex-col gap-1.5">
              <Label>Số tiền hoàn (VNĐ)</Label>
              <Input
                type="number"
                min={1}
                max={amountPaid}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount ? (
                <span className="text-[11px] text-red-600">{errors.amount}</span>
              ) : (
                <span className="text-[11px] text-on-surface-variant">
                  Người dùng đã trả {formatVnd(amountPaid)}. Giữ nguyên để hoàn toàn bộ, hoặc nhập số nhỏ hơn để hoàn
                  một phần.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>
              Lý do <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={2}
              value={reason}
              placeholder={mode === 'refund' ? 'VD: Lỗi hệ thống khiến người dùng không dùng được gói' : ''}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[60px]"
            />
            <span className="text-[11px] text-on-surface-variant">
              Lý do được gửi kèm trong thông báo cho người dùng.
            </span>
            {errors.reason && <span className="text-[11px] text-red-600">{errors.reason}</span>}
          </div>

          {mode === 'gift' && isPaidActive && (
            <p className="text-[11px] leading-relaxed p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              Người dùng đang dùng gói trả phí {subscription.planName}
              {subscription.remainingDays != null ? `, còn ${subscription.remainingDays} ngày` : ''}. Tặng gói mới sẽ
              kết thúc gói này ngay và không hoàn tiền phần còn lại.
            </p>
          )}
          {mode === 'refund' && (
            <p className="text-[11px] leading-relaxed p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              Tiền được cộng vào ví TaxKeep của người dùng và trừ khỏi ví doanh thu nền tảng. Gói kết thúc ngay, tài
              khoản chuyển về gói Basic. Mỗi lượt đăng ký chỉ hoàn tiền được một lần.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting} variant={mode === 'refund' ? 'destructive' : 'default'}>
              {isSubmitting ? 'Đang xử lý...' : SUBMIT[mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
