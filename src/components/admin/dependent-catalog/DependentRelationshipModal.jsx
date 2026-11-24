import { useState } from 'react'
import { validateRelationshipForm } from '@/utils/dependentCatalogUtils'

const inputBase =
  'w-full h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none'

/** Chỉ render khi mở (cha gắn key) nên form lấy giá trị ban đầu từ props. */
export function DependentRelationshipModal({ mode = 'create', initialData = null, onClose, onSubmit, isSubmitting = false }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState(() => ({
    code: initialData?.code || '',
    name: initialData?.name || '',
    displayOrder: String(initialData?.displayOrder ?? 0),
    isActive: initialData ? Boolean(initialData.isActive) : true,
  }))
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateRelationshipForm(form, mode)
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
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{isCreate ? 'diversity_3' : 'edit'}</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                {isCreate ? 'Thêm quan hệ người phụ thuộc' : 'Sửa quan hệ người phụ thuộc'}
              </h3>
              {!isCreate && <span className="font-mono text-[11px] text-on-surface-variant">{initialData?.code}</span>}
            </div>
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
          {isCreate && (
            <div className="flex flex-col gap-1.5">
              {label('Mã quan hệ', true)}
              <input
                autoFocus
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="VD: GRANDCHILD"
                className={`${inputBase} font-mono ${border('code')}`}
              />
              {err('code')}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {label('Tên quan hệ', true)}
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tên hiển thị trên ứng dụng"
              className={`${inputBase} ${border('name')}`}
            />
            {err('name')}
          </div>
          <div className="flex flex-col gap-1.5">
            {label('Thứ tự hiển thị')}
            <input
              inputMode="numeric"
              value={form.displayOrder}
              onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              className={`${inputBase} ${border('displayOrder')}`}
            />
            {err('displayOrder')}
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4"
            />
            Đang áp dụng
          </label>

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
              {isSubmitting ? 'Đang lưu...' : isCreate ? 'Thêm quan hệ' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
