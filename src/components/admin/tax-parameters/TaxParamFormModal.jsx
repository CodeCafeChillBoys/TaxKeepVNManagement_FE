import { useState } from 'react'
import { TaxParamValueEditor } from './TaxParamValueEditor'
import {
  ConfigType,
  TYPE_LABELS,
  KEY_TEMPLATES,
  getConfigMeta,
  normalizeKeyInput,
  validateKey,
  validateValue,
  parseAppliesFromYearInput,
} from '@/utils/taxConfigMeta'

const fieldKey = (name) => name.charAt(0).toLowerCase() + name.slice(1)

export function TaxParamFormModal({ mode, initialData, isSubmitting, onClose, onSubmit }) {
  const isEdit = mode === 'edit'

  const [key, setKey] = useState(initialData?.configKey ?? '')
  const [value, setValue] = useState(initialData?.configValue ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  // '' = dòng mặc định (appliesFromYear = null)
  const [yearInput, setYearInput] = useState(
    initialData?.appliesFromYear != null ? String(initialData.appliesFromYear) : ''
  )
  // Giá trị đã sai định dạng trong DB → mở thẳng chế độ sửa thô để admin sửa được.
  const [rawMode, setRawMode] = useState(() => {
    if (!isEdit) return false
    const m = getConfigMeta(initialData?.configKey)
    return m.type !== ConfigType.TEXT && validateValue(m.type, initialData?.configValue) !== ''
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const parsedYear = parseAppliesFromYearInput(yearInput)
  const meta = getConfigMeta(key, parsedYear.value)
  const useRaw = rawMode || meta.type === ConfigType.TEXT

  const changeKey = (input) => {
    const next = normalizeKeyInput(input)
    if (getConfigMeta(next).type !== meta.type) {
      setValue('')
      setRawMode(false)
    }
    setKey(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const keyErr = isEdit ? '' : validateKey(key)
    const valueErr = validateValue(meta.type, value)
    const yearErr = parsedYear.error
    if (keyErr || valueErr || yearErr) {
      setFieldErrors({ configKey: keyErr, configValue: valueErr, appliesFromYear: yearErr })
      setError('')
      return
    }
    setFieldErrors({})
    setError('')
    try {
      await onSubmit({
        configKey: key,
        configValue: value.trim(),
        description,
        appliesFromYear: parsedYear.value,
        isActive,
      })
    } catch (err) {
      setError(err?.message || 'Không thể lưu tham số.')
      const mapped = {}
      if (err?.errors && typeof err.errors === 'object') {
        for (const [name, messages] of Object.entries(err.errors)) {
          if (name === 'errorCode') continue
          mapped[fieldKey(name)] = Array.isArray(messages) ? messages.join(' ') : String(messages)
        }
      }
      setFieldErrors(mapped)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-xl w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{isEdit ? 'tune' : 'add_task'}</span>
            </div>
            <div>
              <h3 className="text-title-sm font-bold text-on-surface">
                {isEdit ? 'Chỉnh sửa tham số thuế' : 'Thêm tham số thuế'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {isEdit ? `Cập nhật giá trị cho: ${meta.title}` : 'Tạo tham số mới dùng trong tính thuế và nhắc hạn quyết toán'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Mã tham số */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">
                Mã tham số {!isEdit && <span className="text-error">*</span>}
              </label>
              {!isEdit && <span className="text-[10px] text-on-surface-variant">Chữ in hoa, số và gạch dưới</span>}
            </div>

            {!isEdit && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant">Mẫu nhanh:</span>
                {KEY_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => changeKey(t.key)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 cursor-pointer transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={key}
              disabled={isEdit}
              placeholder="Ví dụ: PIT_DEDUCTION_PERSONAL_MONTHLY"
              maxLength={100}
              onChange={(e) => changeKey(e.target.value)}
              className={`h-10 px-3 rounded-lg border font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all ${
                isEdit
                  ? 'opacity-75 cursor-not-allowed bg-surface-container-high/40 text-on-surface font-bold border-outline-variant/40'
                  : fieldErrors.configKey
                  ? 'border-error'
                  : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
              }`}
            />
            {fieldErrors.configKey && <span className="text-[11px] text-error">{fieldErrors.configKey}</span>}
            {!isEdit && key && (
              <span className="text-[11px] text-on-surface-variant">
                Nhận diện: <strong className="text-on-surface">{meta.title}</strong>
                {meta.year ? ` · ${meta.year}` : ''} · {TYPE_LABELS[meta.type]}
                {meta.required ? ' · tham số bắt buộc' : ''}
              </span>
            )}
          </div>

          {/* Năm hiệu lực */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">Áp dụng từ năm</label>
              <span className="text-[10px] text-on-surface-variant">Để trống = mặc định cho mọi năm</span>
            </div>
            <input
              type="number"
              min={1900}
              max={2200}
              value={yearInput}
              placeholder="Ví dụ: 2026 (luật mới)"
              onChange={(e) => setYearInput(e.target.value)}
              className={`h-10 px-3 rounded-lg border font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.appliesFromYear ? 'border-error' : 'border-outline-variant/40 focus:border-primary'
              }`}
            />
            {fieldErrors.appliesFromYear && (
              <span className="text-[11px] text-error">{fieldErrors.appliesFromYear}</span>
            )}
            {isEdit && parsedYear.value !== (initialData?.appliesFromYear ?? null) && !parsedYear.error && (
              <span className="text-[11px] text-amber-700">
                Đang đổi năm hiệu lực của dòng này. Nếu đã có dòng cùng mã và cùng năm, hệ thống sẽ từ chối lưu.
              </span>
            )}
          </div>

          {/* Giá trị */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">
                Giá trị <span className="text-error">*</span>
                {meta.unit && <span className="ml-1 font-normal text-on-surface-variant">({meta.unit})</span>}
              </label>
              {meta.type !== ConfigType.TEXT && (
                <button
                  type="button"
                  onClick={() => setRawMode((v) => !v)}
                  className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
                >
                  {rawMode ? 'Dùng ô nhập theo kiểu' : 'Sửa dạng thô'}
                </button>
              )}
            </div>

            {useRaw ? (
              <textarea
                rows={meta.type === ConfigType.BRACKETS ? 8 : 3}
                value={value}
                placeholder="Nhập giá trị..."
                onChange={(e) => setValue(e.target.value)}
                className={`w-full p-3 rounded-lg border text-xs font-mono bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary resize-y ${
                  fieldErrors.configValue ? 'border-error' : 'border-outline-variant/40 focus:border-primary'
                }`}
              />
            ) : (
              <TaxParamValueEditor
                key={meta.type}
                type={meta.type}
                value={value}
                onChange={setValue}
                hasError={Boolean(fieldErrors.configValue)}
              />
            )}
            {fieldErrors.configValue && <span className="text-[11px] text-error">{fieldErrors.configValue}</span>}
          </div>

          {/* Mô tả */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              placeholder="Ý nghĩa của tham số và căn cứ pháp lý (nếu có)..."
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
            {isEdit && <span className="text-[10px] text-on-surface-variant">Để trống = giữ mô tả hiện tại.</span>}
          </div>

          {/* Trạng thái */}
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs font-semibold text-on-surface">Áp dụng ngay vào hệ thống</span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></span>
            </span>
          </label>

          {error && (
            <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">{isEdit ? 'check' : 'add'}</span>
              )}
              <span>{isEdit ? 'Lưu thay đổi' : 'Tạo tham số'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
