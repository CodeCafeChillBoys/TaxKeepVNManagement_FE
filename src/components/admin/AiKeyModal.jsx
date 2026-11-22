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
import { Checkbox } from '@/components/ui/checkbox'
import { formatAiProvider } from '@/utils/configDataTypeUtils'
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
                  ? 'Thêm khóa kết nối dịch vụ mới'
                  : `Cập nhật khóa kết nối: ${initialData?.key_name || ''}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-on-surface-variant mt-0.5">
                {mode === 'create'
                  ? 'Khai báo khóa kết nối của đơn vị cung cấp dịch vụ phục vụ vận hành hệ thống.'
                  : 'Chỉnh sửa tên hiển thị, thứ tự ưu tiên, trạng thái vận hành và bật/tắt áp dụng.'}
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
                <span className="text-on-surface-variant font-medium">Mã khóa bảo mật:</span>
                <span className="font-mono font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded">
                  {initialData.masked_api_key || '••••••••••••••••'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Đơn vị cung cấp:</span>
                <span className="font-bold text-on-surface">
                  {formatAiProvider(initialData.provider)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Số lượt đã xử lý:</span>
                <span className="font-semibold text-on-surface">
                  {(initialData.request_count || 0).toLocaleString('vi-VN')} lượt
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Lần sử dụng gần nhất:</span>
                <span className="text-on-surface">
                  {formatDateTime(initialData.last_used_at)}
                </span>
              </div>
              {initialData.cooldown_until && (
                <div className="flex items-center justify-between text-on-surface-variant bg-surface-container p-1.5 rounded-lg border border-outline-variant/30">
                  <span className="font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Tạm nghỉ đến:
                  </span>
                  <span className="font-bold text-on-surface">{formatDateTime(initialData.cooldown_until)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tên gợi nhớ */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key_name" className="text-xs font-bold text-on-surface">
              Tên gợi nhớ khóa kết nối <span className="text-red-500">*</span>
            </Label>
            <Input
              id="key_name"
              placeholder="VD: Khóa kết nối dịch vụ chính số 01"
              value={formData.key_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, key_name: e.target.value }))}
              className={`h-9 text-xs ${errors.key_name ? 'border-red-500' : ''}`}
            />
            {errors.key_name && (
              <p className="text-[11px] text-red-500 font-medium">{errors.key_name}</p>
            )}
          </div>

          {/* Khi Create: Nhà cung cấp & Mã Khóa */}
          {mode === 'create' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider" className="text-xs font-bold text-on-surface">
                    Đơn vị cung cấp dịch vụ
                  </Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, provider: val }))}
                  >
                    <SelectTrigger id="provider" className="h-9 text-xs">
                      <SelectValue placeholder="Chọn đơn vị cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEMINI">Google Gemini</SelectItem>
                      <SelectItem value="OPENAI">OpenAI</SelectItem>
                      <SelectItem value="CLAUDE">Anthropic Claude</SelectItem>
                      <SelectItem value="DEEPSEEK">DeepSeek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority" className="text-xs font-bold text-on-surface">
                    Thứ tự ưu tiên sử dụng <span className="text-red-500">*</span>
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

              {/* Khóa bảo mật Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api_key" className="text-xs font-bold text-on-surface">
                  Mã khóa bảo mật <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showRawKey ? 'text' : 'password'}
                    placeholder="Nhập mã khóa bảo mật được cấp..."
                    value={formData.api_key}
                    onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                    className={`h-9 text-xs pr-10 font-mono ${errors.api_key ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRawKey((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title={showRawKey ? 'Ẩn mã khóa' : 'Hiện mã khóa'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showRawKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.api_key && (
                  <p className="text-[11px] text-red-500 font-medium">{errors.api_key}</p>
                )}
                <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface-variant text-[11px] flex items-start gap-2 mt-1">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <span>
                    Hệ thống sẽ <strong className="text-on-surface">tự động kiểm tra tính hợp lệ của khóa kết nối</strong> trước khi lưu trữ.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Khi Edit: Sửa Thứ tự ưu tiên, Trạng thái */}
          {mode === 'edit' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-priority" className="text-xs font-bold text-on-surface">
                  Thứ tự ưu tiên sử dụng <span className="text-red-500">*</span>
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
                  Số nhỏ hơn (ví dụ: 1) sẽ được ưu tiên sử dụng trước.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status" className="text-xs font-bold text-on-surface">
                  Trạng thái vận hành
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger id="edit-status" className="h-9 text-xs">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                    <SelectItem value="QUOTA_EXCEEDED">Vượt hạn mức trong ngày</SelectItem>
                    <SelectItem value="COOLDOWN">Đang tạm nghỉ chờ</SelectItem>
                    <SelectItem value="EXHAUSTED">Đã hết hạn mức</SelectItem>
                    <SelectItem value="RATE_LIMITED">Giới hạn tần suất sử dụng</SelectItem>
                    <SelectItem value="INVALID">Khóa không hợp lệ</SelectItem>
                    <SelectItem value="REVOKED">Đã thu hồi</SelectItem>
                    <SelectItem value="DISABLED">Đã tạm dừng</SelectItem>
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
              Kích hoạt sử dụng khóa kết nối này trong danh sách điều phối tự động
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
              <span>{mode === 'create' ? 'Kiểm tra & Lưu khóa' : 'Cập nhật khóa'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

