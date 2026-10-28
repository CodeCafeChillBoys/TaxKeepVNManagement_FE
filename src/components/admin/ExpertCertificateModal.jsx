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

export function ExpertCertificateModal({
  isOpen,
  mode = 'create',
  initialData = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    issuingBody: '',
    description: '',
    requiresExpiryDate: false,
    sampleVerificationUrl: '',
    displayOrder: 1,
    isActive: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    if (mode === 'edit' && initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        issuingBody: initialData.issuingBody || '',
        description: initialData.description || '',
        requiresExpiryDate: Boolean(initialData.requiresExpiryDate),
        sampleVerificationUrl: initialData.sampleVerificationUrl || '',
        displayOrder: Number(initialData.displayOrder ?? 1),
        isActive: Boolean(initialData.isActive ?? true),
      })
    } else {
      setFormData({
        code: '',
        name: '',
        issuingBody: '',
        description: '',
        requiresExpiryDate: false,
        sampleVerificationUrl: '',
        displayOrder: 1,
        isActive: true,
      })
    }
  }, [isOpen, mode, initialData])

  const validate = () => {
    const newErrs = {}
    const cleanCode = formData.code.trim().toUpperCase()

    if (mode === 'create') {
      if (!cleanCode) {
        newErrs.code = 'Vui lòng nhập mã viết tắt.'
      } else if (!/^[A-Z0-9_]{2,50}$/.test(cleanCode)) {
        newErrs.code = 'Chỉ gồm chữ in hoa, số và dấu gạch dưới (_).'
      }
    }

    if (!formData.name.trim()) {
      newErrs.name = 'Vui lòng nhập tên loại chứng chỉ.'
    }

    setErrors(newErrs)
    return Object.keys(newErrs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      issuingBody: formData.issuingBody.trim() || null,
      description: formData.description.trim() || null,
      requiresExpiryDate: Boolean(formData.requiresExpiryDate),
      sampleVerificationUrl: formData.sampleVerificationUrl.trim() || null,
      displayOrder: Math.max(0, Number(formData.displayOrder) || 0),
      isActive: Boolean(formData.isActive),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm loại chứng chỉ' : 'Cập nhật loại chứng chỉ'}
          </DialogTitle>
          <DialogDescription>
            Thiết lập thông tin văn bằng được chấp nhận khi chuyên gia nộp hồ sơ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label>
                Mã phân loại <span className="text-red-600">*</span>
              </Label>
              <Input
                placeholder="VD: TAX_AGENT, CPA"
                value={formData.code}
                disabled={mode === 'edit'}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="font-mono uppercase"
              />
              {errors.code && <span className="text-[11px] text-red-600">{errors.code}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Thứ tự hiển thị</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Tên loại chứng chỉ <span className="text-red-600">*</span>
            </Label>
            <Input
              placeholder="VD: Chứng chỉ hành nghề dịch vụ làm thủ tục về thuế"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <span className="text-[11px] text-red-600">{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cơ quan cấp</Label>
            <Input
              placeholder="VD: Tổng cục Thuế - Bộ Tài chính"
              value={formData.issuingBody}
              onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cổng tra cứu văn bằng</Label>
            <Input
              placeholder="https://gdt.gov.vn/..."
              value={formData.sampleVerificationUrl}
              onChange={(e) =>
                setFormData({ ...formData, sampleVerificationUrl: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ghi chú yêu cầu</Label>
            <Textarea
              rows={2}
              placeholder="Mô tả yêu cầu đối với loại chứng chỉ này..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[68px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/40 cursor-pointer">
              <Checkbox
                checked={formData.requiresExpiryDate}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresExpiryDate: Boolean(checked) })
                }
                className="mt-0.5"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">
                  Bắt buộc ngày hết hạn
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Yêu cầu khai báo hạn hiệu lực
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/40 cursor-pointer">
              <Checkbox
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: Boolean(checked) })
                }
                className="mt-0.5"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">Đang áp dụng</span>
                <span className="text-[11px] text-on-surface-variant">
                  Hiển thị trong biểu mẫu đăng ký
                </span>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
