import { useState, useEffect } from 'react'

export function TaxDocumentTypeModal({
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
    isTaxEligible: true,
  })

  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          code: initialData.code || '',
          name: initialData.name || '',
          description: initialData.description || '',
          isTaxEligible: initialData.isTaxEligible !== undefined ? Boolean(initialData.isTaxEligible) : true,
        })
      } else {
        setFormData({
          code: '',
          name: '',
          description: '',
          isTaxEligible: true,
        })
      }
      setValidationErrors({})
    }
  }, [isOpen, mode, initialData])

  if (!isOpen) return null

  const validateForm = () => {
    const errors = {}

    if (mode === 'create') {
      const trimmedCode = formData.code.trim().toUpperCase()
      if (!trimmedCode) {
        errors.code = 'Vui lòng nhập mã loại chứng từ.'
      } else if (trimmedCode.length < 2 || trimmedCode.length > 50) {
        errors.code = 'Mã loại chứng từ phải từ 2 đến 50 ký tự.'
      } else if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
        errors.code = 'Mã chỉ được chứa chữ in hoa không dấu, số và dấu gạch dưới (VD: MEDICAL_EXPENSE_INVOICE).'
      }
    }

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      errors.name = 'Vui lòng nhập tên loại chứng từ.'
    } else if (trimmedName.length < 2 || trimmedName.length > 255) {
      errors.name = 'Tên loại chứng từ phải từ 2 đến 255 ký tự.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return

    onSubmit({
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      isTaxEligible: formData.isTaxEligible,
    })
  }

  const sampleCodes = [
    { code: 'MEDICAL_EXPENSE_INVOICE', name: 'Hóa đơn viện phí khám chữa bệnh' },
    { code: 'CHARITY_DONATION_RECEIPT', name: 'Biên lai quyên góp từ thiện, nhân đạo' },
    { code: 'TUITION_FEE_RECEIPT', name: 'Biên lai nộp học phí' },
    { code: 'INSURANCE_PREMIUM_RECEIPT', name: 'Biên lai đóng bảo hiểm tự nguyện' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">
                {mode === 'create' ? 'receipt_long' : 'edit_document'}
              </span>
            </div>
            <div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                {mode === 'create' ? 'Thêm mới loại chứng từ thuế' : 'Cập nhật loại chứng từ thuế'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {mode === 'create'
                  ? 'Đăng ký loại chứng từ để AI phân loại và tính giảm trừ thuế TNCN'
                  : `Chỉnh sửa thông tin định danh: ${formData.code}`}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md pt-1">
          {/* Mã loại chứng từ (Code) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                <span>Mã loại chứng từ (Code)</span>
                <span className="text-error">*</span>
              </label>
              {mode === 'edit' && (
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Khóa cố định</span>
                </span>
              )}
            </div>

            {mode === 'create' ? (
              <>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/\s+/g, '_')
                    setFormData((prev) => ({ ...prev, code: val }))
                    if (validationErrors.code) {
                      setValidationErrors((prev) => ({ ...prev, code: null }))
                    }
                  }}
                  placeholder="VD: MEDICAL_EXPENSE_INVOICE"
                  maxLength={50}
                  className={`h-10 px-3 rounded-xl border text-xs font-mono tracking-wide bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all ${
                    validationErrors.code
                      ? 'border-error ring-1 ring-error'
                      : 'border-outline-variant/50 focus:border-primary'
                  }`}
                />
                {validationErrors.code ? (
                  <p className="text-[11px] text-error font-medium">{validationErrors.code}</p>
                ) : (
                  <p className="text-[11px] text-on-surface-variant">
                    Chỉ gồm chữ cái in hoa không dấu, chữ số và gạch dưới (VD: INVOICE_VAT, DONATION_RECEIPT).
                  </p>
                )}

                {/* Gợi ý mẫu */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-on-surface-variant font-medium">Gợi ý nhanh:</span>
                  {sampleCodes.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          code: s.code,
                          name: prev.name || s.name,
                        }))
                        setValidationErrors({})
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      {s.code}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-10 px-3 rounded-xl border border-outline-variant/30 bg-surface-container/60 flex items-center">
                <span className="font-mono text-xs font-bold text-primary tracking-wide">
                  {formData.code}
                </span>
              </div>
            )}
          </div>

          {/* Tên loại chứng từ (Name) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1">
              <span>Tên mô tả loại chứng từ</span>
              <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }))
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: null }))
                }
              }}
              placeholder="VD: Hóa đơn viện phí khám chữa bệnh hợp pháp"
              maxLength={255}
              className={`h-10 px-3 rounded-xl border text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all ${
                validationErrors.name
                  ? 'border-error ring-1 ring-error'
                  : 'border-outline-variant/50 focus:border-primary'
              }`}
            />
            {validationErrors.name ? (
              <p className="text-[11px] text-error font-medium">{validationErrors.name}</p>
            ) : (
              <p className="text-[11px] text-on-surface-variant">
                Tên hiển thị rõ ràng trên giao diện người dùng và biên bản quyết toán thuế.
              </p>
            )}
          </div>

          {/* Đặc điểm nhận diện cho AI (Description) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1">
              <span>Đặc điểm nhận diện cho AI</span>
              <span className="text-on-surface-variant font-normal">(AI Prompt)</span>
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="VD: Hóa đơn khám chữa bệnh, viện phí, tiền thuốc tại bệnh viện, phòng khám (kể cả khi biểu mẫu ghi tiêu đề là Hóa đơn bán hàng hoặc Hóa đơn GTGT)..."
              className="p-3 rounded-xl border text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all border-outline-variant/50 focus:border-primary resize-none"
            />
            <p className="text-[11px] text-on-surface-variant">
              Mô tả chi tiết để AI Gemini đọc và phân loại chính xác các loại chứng từ thực tế (kể cả khi mẫu ghi "Hóa đơn bán hàng").
            </p>
          </div>

          {/* Tính đủ điều kiện giảm trừ thuế (isTaxEligible) */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">Đủ điều kiện giảm trừ thuế TNCN</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    formData.isTaxEligible
                      ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                      : 'bg-stone-500/10 text-stone-600 border border-stone-500/20'
                  }`}
                >
                  {formData.isTaxEligible ? 'Đủ điều kiện' : 'Không tính giảm trừ'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Khi kích hoạt, hóa đơn thuộc loại này được AI và hệ thống tính vào các khoản giảm trừ hợp lệ khi quyết toán.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.isTaxEligible}
                onChange={(e) => setFormData((prev) => ({ ...prev, isTaxEligible: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-space-sm border-t border-surface-container-high/40 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/50 text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {mode === 'create' ? 'add_circle' : 'save'}
                  </span>
                  <span>{mode === 'create' ? 'Tạo loại chứng từ' : 'Lưu thay đổi'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
