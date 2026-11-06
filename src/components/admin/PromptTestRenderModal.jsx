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
import { adminPromptTemplateService } from '@/services/adminPromptTemplateService'

export function PromptTestRenderModal({
  isOpen,
  prompt = null,
  onClose,
}) {
  const [params, setParams] = useState({})
  const [newParamKey, setNewParamKey] = useState('')
  const [newParamValue, setNewParamValue] = useState('')
  const [isRendering, setIsRendering] = useState(false)
  const [renderResult, setRenderResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen || !prompt) return

    // Tự động khởi tạo các trường tham số từ danh sách variables đã khai báo
    const initialParams = {}
    if (Array.isArray(prompt.variables)) {
      prompt.variables.forEach((v) => {
        initialParams[v] = ''
      })
    }
    setParams(initialParams)
    setRenderResult(null)
    setErrorMessage('')
    setCopied(false)
  }, [isOpen, prompt])

  const handleParamChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddCustomParam = () => {
    const k = newParamKey.trim()
    if (!k) return
    setParams((prev) => ({ ...prev, [k]: newParamValue }))
    setNewParamKey('')
    setNewParamValue('')
  }

  const handleRemoveParam = (key) => {
    setParams((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleFillSampleData = () => {
    const sampleValues = {
      user_name: 'Nguyễn Văn Minh',
      tax_year: '2026',
      tax_id: '0123456789',
      annual_income: '240,000,000 VND',
      dependents_count: '2',
      document_type: 'Chứng từ khấu trừ thuế TNCN',
      policy_reference: 'Thông tư 111/2013/TT-BTC',
      query: 'Tôi muốn tra cứu mức giảm trừ gia cảnh người phụ thuộc',
    }

    setParams((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        next[key] = sampleValues[key] || `Dữ liệu mẫu cho [${key}]`
      })
      return next
    })
  }

  const handleTestRender = async () => {
    if (!prompt?.prompt_key) return
    setIsRendering(true)
    setErrorMessage('')

    try {
      const result = await adminPromptTemplateService.testRenderPrompt({
        prompt_key: prompt.prompt_key,
        params: params,
      })
      setRenderResult(result)
    } catch (err) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi render thử nghiệm prompt.')
    } finally {
      setIsRendering(false)
    }
  }

  const handleCopyRendered = () => {
    if (!renderResult?.rendered_prompt) return
    navigator.clipboard.writeText(renderResult.rendered_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!prompt) return null

  const paramKeys = Object.keys(params)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-surface-container-low border-b border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">terminal</span>
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span>Thử nghiệm Render Prompt</span>
                  <Badge variant="outline" className="font-mono text-[11px] text-primary border-primary/30 bg-primary/5">
                    {prompt.prompt_key}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-on-surface-variant mt-0.5">
                  Kiểm tra xem nội dung prompt được giải mã và điền biến thực tế như thế nào trước khi chạy thật.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSampleData}
              className="text-xs h-8 flex items-center gap-1.5 shrink-0"
              title="Điền dữ liệu giả lập cho tất cả các biến"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>Điền mẫu nhanh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body: 2 Columns Layout */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[72vh] overflow-y-auto">
          {/* Cột trái: Nhập giá trị các biến tham số (5 columns) */}
          <div className="md:col-span-5 flex flex-col gap-3.5 border-r border-outline-variant/30 pr-0 md:pr-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <span>Tham số đầu vào (Params)</span>
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {paramKeys.length} biến
              </span>
            </div>

            {paramKeys.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant">
                Prompt này không có biến tham số nào. Bạn có thể nhấn Render ngay để kiểm tra nguyên mẫu.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paramKeys.map((key) => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-mono font-bold text-primary">
                        {`{${key}}`}
                      </Label>
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(key)}
                        className="text-on-surface-variant hover:text-red-600 text-[10px] cursor-pointer"
                        title="Bỏ biến này khỏi thử nghiệm"
                      >
                        gỡ
                      </button>
                    </div>
                    <Input
                      placeholder={`Giá trị cho ${key}...`}
                      value={params[key]}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Thêm biến tùy biến khác */}
            <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-on-surface-variant">
                Thêm tham số tùy biến:
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Tên biến..."
                  value={newParamKey}
                  onChange={(e) => setNewParamKey(e.target.value)}
                  className="h-7 text-[11px] font-mono flex-1"
                />
                <Input
                  placeholder="Giá trị..."
                  value={newParamValue}
                  onChange={(e) => setNewParamValue(e.target.value)}
                  className="h-7 text-[11px] flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomParam}
                  className="h-7 text-[11px] px-2 shrink-0"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Nút hành động Render */}
            <Button
              type="button"
              onClick={handleTestRender}
              disabled={isRendering}
              className="mt-2 font-bold text-xs bg-primary text-on-primary h-9 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isRendering ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang render thử nghiệm...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  <span>Render Thử Nghiệm</span>
                </>
              )}
            </Button>
          </div>

          {/* Cột phải: Kết quả Render (7 columns) */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">visibility</span>
                <span>Kết quả Render (Rendered Output)</span>
              </span>

              {renderResult?.rendered_prompt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyRendered}
                  className="text-xs h-7 px-2 text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </Button>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {renderResult ? (
              <div className="flex flex-col gap-2">
                {/* Danh sách biến đã dùng */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-on-surface-variant font-medium">Biến đã nội suy:</span>
                  {renderResult.variables_used && renderResult.variables_used.length > 0 ? (
                    renderResult.variables_used.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border-emerald-300"
                      >
                        ✓ {v}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-on-surface-variant italic">Không có biến nào</span>
                  )}
                </div>

                {/* Khung nội dung render */}
                <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/40 font-mono text-xs text-on-surface whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto select-text">
                  {renderResult.rendered_prompt}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-surface-container-low/70 border border-outline-variant/30 flex flex-col items-center justify-center text-center gap-2 h-full min-h-[260px]">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                  smart_toy
                </span>
                <p className="font-semibold text-xs text-on-surface">Chưa thực hiện Render</p>
                <p className="text-[11px] text-on-surface-variant max-w-sm">
                  Nhập các giá trị tham số ở cột bên trái hoặc bấm "Điền mẫu nhanh", sau đó nhấn "Render Thử Nghiệm" để xem kết quả.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

