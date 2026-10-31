import { useState, useEffect } from 'react'
import {
  ConfigDataType,
  detectDataType,
  DATA_TYPE_META,
  getConfigFriendlyInfo,
  FIELD_LABELS,
} from '@/utils/configDataTypeUtils'

export function SystemConfigModal({
  isOpen,
  mode = 'create',
  initialData = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    config_key: '',
    config_value: '',
    data_type: ConfigDataType.STRING,
    description: '',
    is_active: true,
  })

  const [autoDetect, setAutoDetect] = useState(true)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          config_key: initialData.config_key || '',
          config_value: initialData.config_value !== undefined ? String(initialData.config_value) : '',
          data_type: initialData.data_type || detectDataType(initialData.config_value),
          description: initialData.description || '',
          is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        })
        setAutoDetect(false)
      } else {
        setFormData({
          config_key: '',
          config_value: '',
          data_type: ConfigDataType.FLOAT,
          description: '',
          is_active: true,
        })
        setAutoDetect(true)
      }
      setValidationError('')
    }
  }, [isOpen, mode, initialData])

  if (!isOpen) return null

  const handleValueChange = (newVal) => {
    let nextType = formData.data_type
    if (autoDetect) {
      nextType = detectDataType(newVal)
    }
    setFormData((prev) => ({
      ...prev,
      config_value: newVal,
      data_type: nextType,
    }))
  }

  const validateForm = () => {
    const key = formData.config_key.trim()
    if (!key) {
      return 'Vui lòng nhập mã định danh quy tắc.'
    }
    if (!/^[A-Z0-9_]+$/.test(key)) {
      return 'Mã quy tắc chỉ gồm chữ in hoa không dấu, chữ số và dấu gạch dưới (VD: THRESHOLD_VIEN_PHI).'
    }
    if (formData.config_value === undefined || formData.config_value === null || formData.config_value === '') {
      return 'Vui lòng nhập giá trị thiết lập.'
    }

    const val = String(formData.config_value).trim()
    if (formData.data_type === ConfigDataType.INT) {
      if (!/^-?\d+$/.test(val)) {
        return 'Giá trị phải là số nguyên (ví dụ: 1, 5, 2026).'
      }
    } else if (formData.data_type === ConfigDataType.FLOAT) {
      const normalized = val.replace(',', '.')
      const num = Number(normalized)
      if (isNaN(num) || !/^-?\d+(\.\d+)?$/.test(normalized)) {
        return 'Giá trị phải là tỷ lệ số thập phân hợp lệ (ví dụ: 0.85).'
      }
      if (num < 0 || num > 1) {
        return 'Độ chính xác / tỷ lệ thường nằm trong khoảng từ 0 đến 1 (ví dụ: 0.80 cho 80%).'
      }
    } else if (formData.data_type === ConfigDataType.BOOLEAN) {
      const lower = val.toLowerCase()
      if (lower !== 'true' && lower !== 'false') {
        return 'Vui lòng chọn trạng thái Bật hoặc Tắt.'
      }
    } else if (formData.data_type === ConfigDataType.JSON) {
      try {
        JSON.parse(val)
      } catch {
        return 'Định dạng cấu trúc chưa đúng cú pháp tiêu chuẩn.'
      }
    }

    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const error = validateForm()
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError('')

    let cleanValue = formData.config_value.trim()
    if (formData.data_type === ConfigDataType.FLOAT) {
      cleanValue = cleanValue.replace(',', '.')
    }

    onSubmit({
      config_key: formData.config_key.trim().toUpperCase(),
      config_value: cleanValue,
      data_type: formData.data_type,
      description: formData.description.trim(),
      is_active: formData.is_active,
    })
  }

  const currentTypeMeta = DATA_TYPE_META[formData.data_type] || DATA_TYPE_META[ConfigDataType.STRING]
  const friendlyInfo = getConfigFriendlyInfo(formData.config_key)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-xl w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">
                {mode === 'create' ? 'add_task' : 'tune'}
              </span>
            </div>
            <div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                {mode === 'create'
                  ? 'Thêm mới tiêu chuẩn xét duyệt hóa đơn'
                  : 'Điều chỉnh thông số xét duyệt'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {mode === 'create'
                  ? 'Thiết lập mức độ chính xác hoặc thông tin bắt buộc khi kiểm tra chứng từ'
                  : `Cập nhật mức thiết lập cho: ${friendlyInfo.title}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Mã quy tắc / Tham số */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">
                Mã định danh quy tắc <span className="text-error">*</span>
              </label>
              {mode === 'create' && (
                <span className="text-[10px] text-on-surface-variant">
                  Chữ in hoa & gạch dưới (VD: THRESHOLD_VIEN_PHI)
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Ví dụ: THRESHOLD_HOA_DON_XANG_DAU"
              value={formData.config_key}
              disabled={mode === 'edit'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config_key: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                })
              }
              className={`h-10 px-3 rounded-lg border font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all ${
                mode === 'edit'
                  ? 'opacity-75 cursor-not-allowed bg-surface-container-high/40 text-on-surface font-bold'
                  : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
              }`}
            />
            {mode === 'edit' && (
              <span className="text-[11px] text-on-surface-variant">
                Tên nghiệp vụ: <strong className="text-on-surface">{friendlyInfo.title}</strong>
              </span>
            )}
          </div>

          {/* Giá trị thiết lập */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">
                Giá trị thiết lập <span className="text-error">*</span>
              </label>
              {formData.data_type === ConfigDataType.FLOAT && formData.config_value && (
                <span className="text-xs font-bold text-primary">
                  Tương đương: {(Number(formData.config_value.replace(',', '.')) * 100).toFixed(0)}% độ chính xác
                </span>
              )}
            </div>

            {/* Điều khiển nhập giá trị theo loại */}
            {formData.data_type === ConfigDataType.BOOLEAN ? (
              <div className="flex items-center gap-3 h-11 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleValueChange('true')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    formData.config_value.toLowerCase() === 'true'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Bật (Tự động duyệt khi đạt chuẩn)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleValueChange('false')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    formData.config_value.toLowerCase() === 'false'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Tắt (Chuyển duyệt thủ công)</span>
                </button>
                <input type="hidden" value={formData.config_value} />
              </div>
            ) : (
              <input
                type="text"
                placeholder={
                  formData.data_type === ConfigDataType.FLOAT
                    ? 'Ví dụ: 0.85 (tương đương 85% độ chính xác)'
                    : formData.data_type === ConfigDataType.INT
                    ? 'Ví dụ: 10'
                    : formData.data_type === ConfigDataType.LIST_STRING
                    ? 'Ví dụ: total_amount, seller_tax_code, invoice_number'
                    : 'Nhập giá trị...'
                }
                value={formData.config_value}
                onChange={(e) => handleValueChange(e.target.value)}
                className="h-10 px-3 rounded-lg border font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary border-outline-variant/40"
              />
            )}

            {/* Phân loại & Chế độ nhận diện */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-on-surface-variant">Phân loại thiết lập:</span>
                <select
                  value={formData.data_type}
                  onChange={(e) => {
                    setAutoDetect(false)
                    setFormData({ ...formData, data_type: e.target.value })
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${currentTypeMeta.badgeClass}`}
                >
                  {Object.keys(ConfigDataType).map((type) => (
                    <option key={type} value={type}>
                      {DATA_TYPE_META[type]?.label || type}
                    </option>
                  ))}
                </select>
              </div>

              {autoDetect && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                  Tự động nhận diện định dạng
                </span>
              )}
            </div>

            {/* Thẻ xem trước trực quan cho danh sách các mục kiểm tra */}
            {formData.data_type === ConfigDataType.LIST_STRING && formData.config_value && (
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 mt-1">
                <span className="text-[10px] text-on-surface-variant font-bold mr-1 self-center">
                  Các trường kiểm tra:
                </span>
                {formData.config_value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item, idx) => {
                    const friendlyName = FIELD_LABELS[item] || item
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium"
                      >
                        <span className="material-symbols-outlined text-[13px]">check</span>
                        <span>{friendlyName}</span>
                        {friendlyName !== item && (
                          <span className="text-[9px] opacity-70 font-mono">({item})</span>
                        )}
                      </span>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Mục đích & Hướng dẫn áp dụng */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Mục đích & Hướng dẫn áp dụng</label>
            <textarea
              rows={2}
              placeholder="Giải thích mục đích của tiêu chuẩn này và phạm vi áp dụng..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="p-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Trạng thái áp dụng */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="form-config-active-chk"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-primary cursor-pointer"
            />
            <label htmlFor="form-config-active-chk" className="text-xs font-semibold text-on-surface cursor-pointer">
              Kích hoạt áp dụng ngay vào quy trình kiểm tra chứng từ
            </label>
          </div>

          {/* Lỗi xác thực */}
          {validationError && (
            <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Footer Actions */}
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
                <span className="material-symbols-outlined text-[16px]">
                  {mode === 'create' ? 'add' : 'check'}
                </span>
              )}
              <span>{mode === 'create' ? 'Lưu tiêu chuẩn mới' : 'Cập nhật tiêu chuẩn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
