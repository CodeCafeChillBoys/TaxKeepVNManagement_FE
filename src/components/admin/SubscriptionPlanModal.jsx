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
import { Checkbox } from '@/components/ui/checkbox'

const UNLIMITED = -1

/** Hạn mức có thể đặt "Không giới hạn" (-1) */
const LIMIT_FIELDS = [
  { key: 'maxAiQuestionsPerMonth', label: 'Câu hỏi trợ lý AI', unit: 'câu/tháng' },
  { key: 'chatHistoryRetentionDays', label: 'Lưu lịch sử chat AI', unit: 'ngày', unlimitedLabel: 'Vĩnh viễn' },
  { key: 'maxOcrScansPerMonth', label: 'Lượt quét OCR', unit: 'lượt/tháng' },
]

/** Mặc định khớp CreateSubscriptionPlanRequest của BE */
const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  priceMonthly: 0,
  priceYearly: 0,
  maxAiQuestionsPerMonth: 20,
  chatHistoryRetentionDays: 30,
  maxOcrScansPerMonth: 5,
  canExportPdf: false,
  canExportZip: false,
  bookingDiscountPercent: 0,
  freeConsultationsPerYear: 0,
  displayOrder: 0,
  isActive: true,
}

const toInt = (v) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : 0
}

export function SubscriptionPlanModal({
  isOpen,
  mode = 'create',
  initialData = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Gói Basic là gói mặc định: giữ miễn phí và luôn mở bán
  const isBasic = mode === 'edit' && initialData?.slug === 'basic'

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    if (mode === 'edit' && initialData) {
      const next = { ...EMPTY_FORM }
      Object.keys(EMPTY_FORM).forEach((k) => {
        if (initialData[k] !== undefined && initialData[k] !== null) next[k] = initialData[k]
      })
      setFormData(next)
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [isOpen, mode, initialData])

  const set = (patch) => setFormData((prev) => ({ ...prev, ...patch }))

  const validate = () => {
    const e = {}
    if (!formData.name.trim()) e.name = 'Vui lòng nhập tên gói.'
    if (mode === 'create') {
      const slug = formData.slug.trim().toLowerCase()
      if (!slug) e.slug = 'Vui lòng nhập mã gói.'
      else if (!/^[a-z0-9-]{2,50}$/.test(slug)) e.slug = 'Chỉ gồm chữ thường không dấu, số và dấu gạch ngang (-).'
    }
    if (Number(formData.priceMonthly) < 0) e.priceMonthly = 'Giá tháng phải lớn hơn hoặc bằng 0.'
    if (Number(formData.priceYearly) < 0) e.priceYearly = 'Giá năm phải lớn hơn hoặc bằng 0.'
    LIMIT_FIELDS.forEach(({ key }) => {
      const v = toInt(formData[key])
      if (v !== UNLIMITED && v < 0) e[key] = 'Nhập số từ 0 trở lên, hoặc chọn không giới hạn.'
    })
    const pct = toInt(formData.bookingDiscountPercent)
    if (pct < 0 || pct > 100) e.bookingDiscountPercent = 'Nhập từ 0 đến 100.'
    if (toInt(formData.freeConsultationsPerYear) < 0) e.freeConsultationsPerYear = 'Nhập số từ 0 trở lên.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      priceMonthly: isBasic ? 0 : Math.max(0, Number(formData.priceMonthly) || 0),
      priceYearly: isBasic ? 0 : Math.max(0, Number(formData.priceYearly) || 0),
      canExportPdf: Boolean(formData.canExportPdf),
      canExportZip: Boolean(formData.canExportZip),
      bookingDiscountPercent: toInt(formData.bookingDiscountPercent),
      freeConsultationsPerYear: toInt(formData.freeConsultationsPerYear),
      displayOrder: Math.max(0, toInt(formData.displayOrder)),
      isActive: isBasic ? true : Boolean(formData.isActive),
    }
    LIMIT_FIELDS.forEach(({ key }) => {
      payload[key] = toInt(formData[key])
    })
    // Slug chỉ gửi khi tạo mới (UpdateSubscriptionPlanRequest không có slug)
    if (mode === 'create') payload.slug = formData.slug.trim().toLowerCase()

    onSubmit(payload)
  }

  const monthly = Number(formData.priceMonthly) || 0
  const yearly = Number(formData.priceYearly) || 0
  const freeMonths = monthly > 0 && yearly > 0 ? Math.round(12 - yearly / monthly) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tạo gói dịch vụ' : `Cập nhật ${initialData?.name || 'gói'}`}</DialogTitle>
          <DialogDescription>
            Thay đổi chỉ áp dụng cho lượt mua sau. Người đang dùng gói giữ quyền lợi cũ đến khi hết hạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Thông tin gói */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label>
                Tên gói <span className="text-red-600">*</span>
              </Label>
              <Input
                placeholder="VD: Gói Standard"
                value={formData.name}
                onChange={(e) => set({ name: e.target.value })}
              />
              {errors.name && <span className="text-[11px] text-red-600">{errors.name}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Thứ tự hiển thị</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={formData.displayOrder}
                onChange={(e) => set({ displayOrder: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Mã gói (slug) {mode === 'create' && <span className="text-red-600">*</span>}
            </Label>
            <Input
              placeholder="VD: standard"
              value={formData.slug}
              disabled={mode === 'edit'}
              onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
              className="font-mono"
            />
            {mode === 'edit' ? (
              <span className="text-[11px] text-on-surface-variant">Mã gói không đổi được sau khi tạo.</span>
            ) : (
              errors.slug && <span className="text-[11px] text-red-600">{errors.slug}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Mô tả</Label>
            <Textarea
              rows={2}
              placeholder="Gói phù hợp với ai, hiển thị cho người dùng trên app"
              value={formData.description}
              onChange={(e) => set({ description: e.target.value })}
              className="min-h-[60px]"
            />
          </div>

          {/* Giá */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-on-surface">Giá bán</p>
            {isBasic && (
              <p className="text-[11px] text-on-surface-variant">Gói Basic là gói mặc định nên luôn miễn phí.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Giá tháng (VNĐ)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  disabled={isBasic}
                  value={formData.priceMonthly}
                  onChange={(e) => set({ priceMonthly: e.target.value })}
                />
                {errors.priceMonthly && <span className="text-[11px] text-red-600">{errors.priceMonthly}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Giá năm (VNĐ)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  disabled={isBasic}
                  value={formData.priceYearly}
                  onChange={(e) => set({ priceYearly: e.target.value })}
                />
                {errors.priceYearly ? (
                  <span className="text-[11px] text-red-600">{errors.priceYearly}</span>
                ) : (
                  !isBasic && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                      <span>{freeMonths > 0 ? `App hiển thị: tặng ${freeMonths} tháng` : 'Không có ưu đãi mua năm'}</span>
                      <button
                        type="button"
                        className="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
                        disabled={monthly <= 0}
                        onClick={() => set({ priceYearly: monthly * 10 })}
                      >
                        Đặt bằng 10 tháng
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Hạn mức */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-on-surface">Hạn mức</p>
            <div className="flex flex-col gap-2">
              {LIMIT_FIELDS.map(({ key, label, unit, unlimitedLabel }) => {
                const unlimited = toInt(formData[key]) === UNLIMITED
                return (
                  <div
                    key={key}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] items-center gap-2 sm:gap-3"
                  >
                    <Label className="text-xs">{label}</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        disabled={unlimited}
                        value={unlimited ? '' : formData[key]}
                        placeholder={unlimited ? unlimitedLabel || 'Không giới hạn' : ''}
                        onChange={(e) => set({ [key]: e.target.value })}
                        className="h-8"
                      />
                      <span className="text-[11px] text-on-surface-variant whitespace-nowrap">{unit}</span>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-on-surface cursor-pointer">
                      <Checkbox
                        checked={unlimited}
                        onCheckedChange={(checked) => set({ [key]: checked ? UNLIMITED : 0 })}
                      />
                      {unlimitedLabel || 'Không giới hạn'}
                    </label>
                    {errors[key] && <span className="sm:col-span-3 text-[11px] text-red-600">{errors[key]}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quyền lợi */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-on-surface">Quyền lợi</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/40 cursor-pointer">
                <Checkbox
                  checked={Boolean(formData.canExportPdf)}
                  onCheckedChange={(checked) => set({ canExportPdf: Boolean(checked) })}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">Xuất PDF Mẫu 02/QTT-TNCN</span>
                  <span className="text-[11px] text-on-surface-variant">Tắt thì người dùng chỉ xem được</span>
                </div>
              </label>
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/40 cursor-pointer">
                <Checkbox
                  checked={Boolean(formData.canExportZip)}
                  onCheckedChange={(checked) => set({ canExportZip: Boolean(checked) })}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">Xuất ZIP chứng từ</span>
                  <span className="text-[11px] text-on-surface-variant">Tải toàn bộ chứng từ đã lưu</span>
                </div>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Giảm giá đặt lịch chuyên gia (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.bookingDiscountPercent}
                  onChange={(e) => set({ bookingDiscountPercent: e.target.value })}
                />
                {errors.bookingDiscountPercent && (
                  <span className="text-[11px] text-red-600">{errors.bookingDiscountPercent}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ca tư vấn miễn phí mỗi năm</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.freeConsultationsPerYear}
                  onChange={(e) => set({ freeConsultationsPerYear: e.target.value })}
                />
                {errors.freeConsultationsPerYear && (
                  <span className="text-[11px] text-red-600">{errors.freeConsultationsPerYear}</span>
                )}
              </div>
            </div>
          </div>

          <label
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/40 ${
              isBasic ? 'opacity-60' : 'cursor-pointer'
            }`}
          >
            <Checkbox
              checked={isBasic ? true : Boolean(formData.isActive)}
              disabled={isBasic}
              onCheckedChange={(checked) => set({ isActive: Boolean(checked) })}
              className="mt-0.5"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">Đang mở bán</span>
              <span className="text-[11px] text-on-surface-variant">
                {isBasic ? 'Gói Basic luôn mở bán.' : 'Tắt thì gói ẩn khỏi app, người đang dùng không bị ảnh hưởng.'}
              </span>
            </div>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
