import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  formatPromptKeyLabel,
  formatPromptVariableLabel,
} from '@/utils/configDataTypeUtils'

export function PromptDetailModal({
  isOpen,
  prompt = null,
  onClose,
  onEdit,
  onTestRender,
}) {
  const [copied, setCopied] = useState(false)

  if (!prompt) return null

  const handleCopy = () => {
    if (!prompt.system_prompt) return
    navigator.clipboard.writeText(prompt.system_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-surface-container-low border-b border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">description</span>
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span>{formatPromptKeyLabel(prompt.prompt_key)}</span>
                  <span className="text-xs font-normal text-on-surface-variant">
                    · Phiên bản {prompt.version || 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface ml-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        prompt.is_active ? 'bg-emerald-600' : 'bg-stone-400'
                      }`}
                    />
                    {prompt.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-on-surface-variant mt-0.5">
                  {(prompt.description || 'Không có mô tả chi tiết.').replace(/System prompt/gi, 'Mẫu chỉ dẫn')}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-8 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/30">
            <div>
              <span className="text-on-surface-variant font-medium">Khởi tạo:</span>{' '}
              <span className="font-semibold text-on-surface">{formatDateTime(prompt.created_at)}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-medium">Cập nhật lần cuối:</span>{' '}
              <span className="font-semibold text-on-surface">{formatDateTime(prompt.updated_at)}</span>
            </div>
          </div>

          {/* Variables defined */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Thông tin chèn tự động ({prompt.variables?.length || 0})
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {prompt.variables && prompt.variables.length > 0 ? (
                prompt.variables.map((v) => (
                  <span
                    key={v}
                    className="text-xs font-medium text-on-surface bg-surface-container border border-outline-variant/40 rounded-md px-2.5 py-1"
                  >
                    {formatPromptVariableLabel(v)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-on-surface-variant italic">
                  Không sử dụng mục thông tin chèn tự động.
                </span>
              )}
            </div>
          </div>

          {/* Full Prompt View */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Nội dung mẫu chỉ dẫn chi tiết
            </span>
            <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/40 text-xs text-on-surface whitespace-pre-wrap leading-relaxed select-text">
              {prompt.system_prompt}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Đóng
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onTestRender?.(prompt)
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>Kiểm tra mẫu</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose()
                onEdit?.(prompt)
              }}
              className="text-xs font-bold bg-primary text-on-primary flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Chỉnh sửa mẫu chỉ dẫn</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

