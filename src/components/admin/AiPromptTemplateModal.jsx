import { useState, useEffect, useRef } from 'react'
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
import { Textarea } from '@/components/ui/textarea'

export function AiPromptTemplateModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    prompt_key: '',
    description: '',
    system_prompt: '',
    variables: [],
    is_active: true,
  })
  const [variableInput, setVariableInput] = useState('')
  const [errors, setErrors] = useState({})
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    setVariableInput('')

    if (mode === 'edit' && initialData) {
      setFormData({
        prompt_key: initialData.prompt_key || '',
        description: initialData.description || '',
        system_prompt: initialData.system_prompt || '',
        variables: Array.isArray(initialData.variables) ? [...initialData.variables] : [],
        is_active: Boolean(initialData.is_active ?? true),
      })
    } else {
      setFormData({
        prompt_key: '',
        description: '',
        system_prompt: '',
        variables: [],
        is_active: true,
      })
    }
  }, [isOpen, mode, initialData])

  // Thêm biến vào danh sách variables
  const handleAddVariable = (e) => {
    if (e) e.preventDefault()
    const cleanVar = variableInput.trim().replace(/^\{+|\}+$/g, '').trim()
    if (!cleanVar) return

    if (!formData.variables.includes(cleanVar)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, cleanVar],
      }))
    }
    setVariableInput('')
  }

  // Xóa biến khỏi danh sách variables
  const handleRemoveVariable = (varName) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== varName),
    }))
  }

  // Chèn nhanh biến vào vị trí con trỏ textarea
  const handleInsertVariableAtCursor = (varName) => {
    const textarea = textareaRef.current
    const placeholder = `{${varName}}`
    if (!textarea) {
      setFormData((prev) => ({ ...prev, system_prompt: prev.system_prompt + placeholder }))
      return
    }

    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? textarea.value.length
    const currentVal = formData.system_prompt
    const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end)

    setFormData((prev) => ({ ...prev, system_prompt: newVal }))

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
    }, 50)
  }

  const validate = () => {
    const errs = {}
    if (mode === 'create') {
      if (!formData.prompt_key.trim()) {
        errs.prompt_key = 'Mã khóa Prompt không được để trống.'
      } else if (!/^[A-Z0-9_]+$/.test(formData.prompt_key.trim())) {
        errs.prompt_key = 'Mã khóa chỉ được chứa chữ hoa, số và dấu gạch dưới (VD: PROMPT_TAX_CHAT).'
      }
    }

    if (!formData.system_prompt.trim()) {
      errs.system_prompt = 'Nội dung System Prompt không được để trống.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'create') {
      onSubmit({
        prompt_key: formData.prompt_key.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        system_prompt: formData.system_prompt,
        variables: formData.variables,
        is_active: formData.is_active,
      })
    } else {
      onSubmit({
        description: formData.description.trim() || undefined,
        system_prompt: formData.system_prompt,
        variables: formData.variables,
        is_active: formData.is_active,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-surface-container-low border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                {mode === 'create' ? 'post_add' : 'edit_document'}
              </span>
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-on-surface">
                {mode === 'create'
                  ? 'Tạo mới System Prompt AI'
                  : `Chỉnh sửa Prompt: ${initialData?.prompt_key || ''}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-on-surface-variant mt-0.5">
                {mode === 'create'
                  ? 'Khai báo mẫu chỉ dẫn hệ thống (System Prompt) cho AI với các biến tham số nội suy động.'
                  : 'Cập nhật nội dung chỉ dẫn. Backend sẽ tự động tăng Version và làm mới Cache trên AI Service.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Thông tin Version & Key khi Edit */}
          {mode === 'edit' && initialData && (
            <div className="p-3 rounded-xl bg-surface-container-low/80 border border-outline-variant/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-on-surface-variant">Mã định danh:</span>
                <code className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {initialData.prompt_key}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-on-surface-variant">Phiên bản hiện tại:</span>
                <Badge variant="outline" className="font-bold bg-amber-50 text-amber-800 border-amber-300">
                  Version {initialData.version || 1}
                </Badge>
              </div>
            </div>
          )}

          {/* Prompt Key Input khi Create */}
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prompt_key" className="text-xs font-bold text-on-surface">
                Mã khóa Prompt (Prompt Key) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prompt_key"
                placeholder="VD: PROMPT_TAX_CHAT_ADVISORY hoặc PROMPT_OCR_INCOME"
                value={formData.prompt_key}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prompt_key: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                className={`h-9 text-xs font-mono font-semibold ${errors.prompt_key ? 'border-red-500' : ''}`}
              />
              {errors.prompt_key && (
                <p className="text-[11px] text-red-500 font-medium">{errors.prompt_key}</p>
              )}
              <span className="text-[10px] text-on-surface-variant">
                Quy ước: Viết HOA nối nhau bằng dấu gạch dưới (UPPER_SNAKE_CASE).
              </span>
            </div>
          )}

          {/* Mô tả chức năng */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-xs font-bold text-on-surface">
              Mô tả mục đích sử dụng
            </Label>
            <Input
              id="description"
              placeholder="VD: Chỉ dẫn ngữ cảnh cho AI chuyên gia giải đáp thắc mắc thuế TNCN..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-9 text-xs"
            />
          </div>

          {/* Biến tham số động (Variables) */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
                <span>Các biến tham số động (Variables)</span>
              </Label>
              <span className="text-[11px] text-on-surface-variant">
                Định dạng trong prompt: <code className="text-primary font-bold">{'{tên_biến}'}</code>
              </span>
            </div>

            {/* Input thêm biến */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nhập tên biến (vd: user_name, tax_year) rồi nhấn Enter..."
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddVariable()
                  }
                }}
                className="h-8 text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariable}
                className="h-8 text-xs shrink-0"
              >
                + Thêm biến
              </Button>
            </div>

            {/* Danh sách biến tags */}
            <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] pt-1">
              {formData.variables.length === 0 ? (
                <span className="text-[11px] text-on-surface-variant italic">
                  Chưa khai báo biến tham số nào. Nhập tên biến ở trên và nhấn Enter.
                </span>
              ) : (
                formData.variables.map((varName) => (
                  <span
                    key={varName}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/40 text-xs font-mono font-medium text-on-surface shadow-2xs group"
                  >
                    <span>{`{${varName}}`}</span>
                    <button
                      type="button"
                      onClick={() => handleInsertVariableAtCursor(varName)}
                      className="text-primary hover:text-primary/80 text-[10px] ml-1 underline cursor-pointer"
                      title="Chèn biến vào con trỏ nội dung bên dưới"
                    >
                      chèn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(varName)}
                      className="text-on-surface-variant hover:text-red-600 transition-colors cursor-pointer ml-1"
                      title="Xóa biến này"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Nội dung System Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="system_prompt" className="text-xs font-bold text-on-surface">
                Nội dung System Prompt <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] text-on-surface-variant">
                {formData.system_prompt.length} ký tự
              </span>
            </div>

            {formData.variables.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-on-surface-variant">
                <span className="shrink-0 font-medium">Bấm để chèn:</span>
                {formData.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariableAtCursor(v)}
                    className="shrink-0 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    +{`{${v}}`}
                  </button>
                ))}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              id="system_prompt"
              rows={12}
              placeholder="Nhập nội dung system prompt chi tiết tại đây. Ví dụ:&#10;Bạn là trợ lý tư vấn thuế TAX KEEP VN. Hãy hỗ trợ người dùng {user_name} về các quy định quyết toán thuế năm {tax_year}..."
              value={formData.system_prompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
              className={`font-mono text-xs leading-relaxed p-3.5 rounded-xl ${errors.system_prompt ? 'border-red-500' : ''}`}
            />
            {errors.system_prompt && (
              <p className="text-[11px] text-red-500 font-medium">{errors.system_prompt}</p>
            )}
          </div>

          {/* Checkbox Is Active */}
          <div className="flex items-center gap-2.5 pt-1">
            <Checkbox
              id="prompt_is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: Boolean(checked) }))
              }
            />
            <Label htmlFor="prompt_is_active" className="text-xs font-medium text-on-surface cursor-pointer">
              Kích hoạt áp dụng System Prompt này ngay sau khi lưu
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
              <span>{mode === 'create' ? 'Tạo System Prompt' : 'Cập nhật System Prompt'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

