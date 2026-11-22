import { useState } from 'react'
import { SECTION_OPTIONS, validateCategoryForm } from '@/utils/medicalCategoryUtils'

const inputBase =
  'w-full px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none'

/**
 * Chỉ render khi mở (cha gắn key theo lần mở) nên form lấy giá trị ban đầu từ props.
 * deletedCodes: mã của danh mục đã xóa mềm, để báo trước khi tạo trùng sẽ khôi phục bản cũ.
 */
export function MedicalCategoryModal({ mode = 'create', initialData = null, deletedCodes = [], onClose, onSubmit, isSubmitting = false }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState(() => ({
    categoryCode: initialData?.categoryCode || '',
    categoryName: initialData?.categoryName || '',
    sectionCode: initialData?.sectionCode || '',
    isEligible: initialData ? Boolean(initialData.isEligible) : true,
    description: initialData?.description || '',
    keywords: initialData?.keywords || '',
  }))
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const willRestore = isCreate && deletedCodes.includes(form.categoryCode.trim().toUpperCase())

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateCategoryForm(form, isCreate)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onSubmit(form)
  }

  const label = (text, required) => (
    <label className="text-xs font-bold text-on-surface flex items-center gap-1">
      {text} {required && <span className="text-error">*</span>}
    </label>
  )
  const err = (key) => errors[key] && <p className="text-[11px] text-error font-medium">{errors[key]}</p>
  const border = (key) => (errors[key] ? 'border-error' : 'border-outline-variant/40')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-xl w-full p-space-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{isCreate ? 'medical_services' : 'edit'}</span>
            </div>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              {isCreate ? 'Thêm danh mục chi phí y tế' : 'Sửa danh mục chi phí y tế'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md pt-1">
          <div className={`grid grid-cols-1 ${isCreate ? 'md:grid-cols-2' : ''} gap-space-md`}>
            {isCreate && (
              <div className="flex flex-col gap-1.5">
                {label('Mã định danh danh mục', true)}
                <input
                  autoFocus
                  value={form.categoryCode}
                  onChange={(e) => setForm((f) => ({ ...f, categoryCode: e.target.value.toUpperCase() }))}
                  placeholder="VD: CHI_PHI_THAM_MY"
                  className={`${inputBase} h-10 font-mono ${border('categoryCode')}`}
                />
                {err('categoryCode')}
                {willRestore && (
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    Mã này thuộc một danh mục đã xóa. Lưu sẽ khôi phục danh mục đó với nội dung mới.
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {label('Mục trên bảng kê khám chữa bệnh', true)}
              <input
                value={form.sectionCode}
                onChange={set('sectionCode')}
                list="medical-section-options"
                placeholder="VD: 8 (Thuốc, dịch truyền)"
                className={`${inputBase} h-10 ${border('sectionCode')}`}
              />
              <datalist id="medical-section-options">
                {SECTION_OPTIONS.map((s) => (
                  <option key={s.code} value={s.code}>{`${s.code} · ${s.name}`}</option>
                ))}
              </datalist>
              {err('sectionCode')}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Tên danh mục', true)}
            <input
              value={form.categoryName}
              onChange={set('categoryName')}
              placeholder="VD: Phẫu thuật thẩm mỹ, làm đẹp"
              className={`${inputBase} h-10 ${border('categoryName')}`}
            />
            {err('categoryName')}
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Quy định giảm trừ thuế thu nhập cá nhân', true)}
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: true, text: 'Được giảm trừ', cls: 'border-primary bg-primary/10 text-primary' },
                { v: false, text: 'Loại trừ', cls: 'border-outline-variant bg-surface-container text-on-surface' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isEligible: o.v }))}
                  className={`h-10 rounded-lg border text-sm font-semibold cursor-pointer ${
                    form.isEligible === o.v ? o.cls : 'border-outline-variant/40 text-on-surface-variant'
                  }`}
                >
                  {o.text}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Từ khóa nhận diện')}
            <textarea
              rows={2}
              value={form.keywords}
              onChange={set('keywords')}
              placeholder="Ngăn cách bằng dấu phẩy. VD: nâng mũi, cắt mí, chăm sóc da"
              className={`${inputBase} py-2 border-outline-variant/40`}
            />
            <p className="text-[11px] text-on-surface-variant">
              Hệ thống đối chiếu các từ khóa này để phân loại từng dòng chi phí trên bảng kê.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Mô tả / căn cứ pháp lý')}
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="VD: Chi phí thẩm mỹ không nhằm mục đích chữa bệnh, không được giảm trừ theo Điều 49 NĐ 253/2026."
              className={`${inputBase} py-2 border-outline-variant/40`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-outline-variant/50 text-sm font-semibold hover:bg-surface-container cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : isCreate ? 'Thêm danh mục' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
