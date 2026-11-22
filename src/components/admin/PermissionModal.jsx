import { useState } from 'react'
import { validatePermissionForm } from '@/utils/rolePermissionUtils'

const inputClass =
  'w-full h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none'

/** Chỉ render khi mở (cha gắn key theo lần mở) nên form lấy giá trị ban đầu ngay từ props */
export function PermissionModal({ mode = 'create', initialData = null, groupSuggestions = [], onClose, onSubmit, isSubmitting = false }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState(() => ({
    code: initialData?.code || '',
    name: initialData?.name || '',
    groupName: initialData?.groupName || '',
  }))
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validatePermissionForm(form, isCreate)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onSubmit(form)
  }

  const field = (key, label, placeholder, extra = {}) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-on-surface flex items-center gap-1">
        {label} <span className="text-error">*</span>
      </label>
      <input
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className={`${inputClass} ${errors[key] ? 'border-error' : 'border-outline-variant/40'}`}
        {...extra}
      />
      {errors[key] && <p className="text-[11px] text-error font-medium">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{isCreate ? 'add_moderator' : 'edit'}</span>
            </div>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              {isCreate ? 'Thêm quyền mới' : 'Sửa quyền'}
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
          {isCreate ? (
            field('code', 'Mã quyền', 'VD: document.create', { autoFocus: true })
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                Mã quyền
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">lock</span>
              </label>
              <div className={`${inputClass} border-outline-variant/40 flex items-center font-mono text-on-surface-variant`}>
                {form.code}
              </div>
              <p className="text-[11px] text-on-surface-variant">Mã quyền được dùng trong mã nguồn nên không đổi được.</p>
            </div>
          )}
          {field('name', 'Tên quyền', 'VD: Tạo chứng từ')}
          {field('groupName', 'Nhóm quyền', 'VD: Chứng từ', { list: 'permission-group-options' })}
          <datalist id="permission-group-options">
            {groupSuggestions.map((g) => <option key={g} value={g} />)}
          </datalist>

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
              {isSubmitting ? 'Đang lưu...' : isCreate ? 'Thêm quyền' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
