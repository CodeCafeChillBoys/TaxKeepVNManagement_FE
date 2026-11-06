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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AiKeyModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    key_name: '',
    api_key: '',
    provider: 'GEMINI',
    priority: 1,
    is_active: true,
    status: 'ACTIVE',
  })
  const [showRawKey, setShowRawKey] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    setShowRawKey(false)

    if (mode === 'edit' && initialData) {
      setFormData({
        key_name: initialData.key_name || '',
        api_key: '', // Không cho xem lại raw key vì bảo mật (masked)
        provider: initialData.provider || 'GEMINI',
        priority: Number(initialData.priority ?? 1),
        is_active: Boolean(initialData.is_active ?? true),
        status: initialData.status || 'ACTIVE',
      })
    } else {
      setFormData({
        key_name: '',
        api_key: '',
        provider: 'GEMINI',
        priority: 1,
        is_active: true,
        status: 'ACTIVE',
      })
    }
  }, [isOpen, mode, initialData])

  const validate = () => {
    const errs = {}
    if (!formData.key_name.trim()) {
      errs.key_name = 'Vui lòng nhập tên gợi nhớ cho API Key.'
    }
    if (mode === 'create') {
      if (!formData.api_key.trim()) {
        errs.api_key = 'Vui lòng nhập mã API Key.'
      } else if (formData.api_key.trim().length < 10) {
        errs.api_key = 'Độ dài API Key không hợp lệ.'
      }
    }
    if (formData.priority === '' || Number(formData.priority) < 1) {
      errs.priority = 'Độ ưu tiên phải là số nguyên >= 1.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'create') {
      onSubmit({
        key_name: formData.key_name.trim(),
        api_key: formData.api_key.trim(),
        provider: formData.provider,
        priority: Number(formData.priority),
      })
    } else {
      onSubmit({
        key_name: formData.key_name.trim(),
        priority: Number(formData.priority),
        is_active: formData.is_active,
        status: formData.status,
      })
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Chưa sử dụng'
    try {
      const d = new Date(dateStr)
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-surface-container-low border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                {mode === 'create' ? 'add_moderator' : 'vpn_key'}
              </span>
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-on-surface">
                {mode === 'create'
                  ? 'Thêm API Key AI mới'
                  : `Cập nhật API Key: ${initialData?.key_name || ''}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-on-surface-variant mt-0.5">
                {mode === 'create'
                  ? 'Khai báo API Key của nhà cung cấp LLM (Gemini, etc.) phục vụ vận hành AI hệ thống.'
                  : 'Chỉnh sửa tên hiển thị, độ ưu tiên định tuyến, trạng thái và bật/tắt kích hoạt.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Thông tin hiện tại khi Edit */}
          {mode === 'edit' && initialData && (
            <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-outline-variant/30 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Khóa bảo mật:</span>
                <span className="font-mono font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded">
                  {initialData.masked_api_key || '••••••••••••••••'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Nhà cung cấp:</span>
                <Badge variant="outline" className="font-bold text-[11px]">
                  {initialData.provider || 'GEMINI'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Lượt request đã gọi:</span>
                <span className="font-semibold text-primary">
                  {(initialData.request_count || 0).toLocaleString()} lượt
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Lần sử dụng gần nhất:</span>
                <span className="text-on-surface">
                  {formatDateTime(initialData.last_used_at)}
                </span>
              </div>
              {initialData.cooldown_until && (
                <div className="flex items-center justify-between text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                  <span className="font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Cooldown đến:
                  </span>
                  <span className="font-bold">{formatDateTime(initialData.cooldown_until)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tên gợi nhớ */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key_name" className="text-xs font-bold text-on-surface">
              Tên gợi nhớ API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="key_name"
              placeholder="VD: Google Gemini 2.5 Flash - Key Chính 01"
              value={formData.key_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, key_name: e.target.value }))}
              className={`h-9 text-xs ${errors.key_name ? 'border-red-500' : ''}`}
            />
            {errors.key_name && (
              <p className="text-[11px] text-red-500 font-medium">{errors.key_name}</p>
            )}
          </div>

          {/* Khi Create: Nhà cung cấp & Mã API Key */}
          {mode === 'create' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider" className="text-xs font-bold text-on-surface">
                    Nhà cung cấp (Provider)
                  </Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, provider: val }))}
                  >
                    <SelectTrigger id="provider" className="h-9 text-xs">
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEMINI">Google Gemini</SelectItem>
                      <SelectItem value="OPENAI">OpenAI</SelectItem>
                      <SelectItem value="ANTHROPIC">Anthropic Claude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority" className="text-xs font-bold text-on-surface">
                    Độ ưu tiên định tuyến (Priority) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    className={`h-9 text-xs ${errors.priority ? 'border-red-500' : ''}`}
                  />
                  {errors.priority && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.priority}</p>
                  )}
                </div>
              </div>

              {/* API Key Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api_key" className="text-xs font-bold text-on-surface">
                  Khóa API Key bí mật <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showRawKey ? 'text' : 'password'}
                    placeholder="Nhập API Key (ví dụ: AIzaSy...)"
                    value={formData.api_key}
                    onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                    className={`h-9 text-xs pr-10 font-mono ${errors.api_key ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRawKey((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title={showRawKey ? 'Ẩn API Key' : 'Hiện API Key'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showRawKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.api_key && (
                  <p className="text-[11px] text-red-500 font-medium">{errors.api_key}</p>
                )}
                <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/60 text-blue-900 text-[11px] flex items-start gap-2 mt-1">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <span>
                    Backend sẽ <strong>tự động gọi thử nghiệm tới Google API</strong> để kiểm tra tính hợp lệ trước khi lưu trữ.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Khi Edit: Sửa Priority, Status, IsActive */}
          {mode === 'edit' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-priority" className="text-xs font-bold text-on-surface">
                  Độ ưu tiên định tuyến (Priority) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-priority"
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                  className={`h-9 text-xs ${errors.priority ? 'border-red-500' : ''}`}
                />
                {errors.priority && (
                  <p className="text-[11px] text-red-500 font-medium">{errors.priority}</p>
                )}
                <span className="text-[10px] text-on-surface-variant">
                  Số nhỏ hơn (vd: 1) sẽ được gọi trước số lớn hơn.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status" className="text-xs font-bold text-on-surface">
                  Trạng thái vận hành (Status)
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger id="edit-status" className="h-9 text-xs">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE (Sẵn sàng hoạt động)</SelectItem>
                    <SelectItem value="COOLDOWN">COOLDOWN (Đang tạm nghỉ)</SelectItem>
                    <SelectItem value="EXHAUSTED">EXHAUSTED (Hết hạn mức Quota)</SelectItem>
                    <SelectItem value="RATE_LIMITED">RATE_LIMITED (Bị giới hạn tần suất)</SelectItem>
                    <SelectItem value="REVOKED">REVOKED (Đã bị thu hồi / Hủy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Checkbox Is Active */}
          <div className="flex items-center gap-2.5 pt-1">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: Boolean(checked) }))
              }
            />
            <Label htmlFor="is_active" className="text-xs font-medium text-on-surface cursor-pointer">
              Kích hoạt sử dụng API Key này trong chuỗi xoay vòng (Key Rotation Pool)
            </Label>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-bold bg-primary text-on-primary flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{mode === 'create' ? 'Kiểm tra & Lưu Key' : 'Cập nhật Key'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

