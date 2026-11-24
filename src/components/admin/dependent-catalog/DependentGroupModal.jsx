import { useState } from 'react'
import { validateGroupForm } from '@/utils/dependentCatalogUtils'

const inputBase =
  'w-full h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none'

const TITLES = {
  create: { text: 'Thêm nhóm người phụ thuộc', icon: 'group_add', submit: 'Thêm nhóm' },
  edit: { text: 'Sửa nhóm người phụ thuộc', icon: 'edit', submit: 'Lưu thay đổi' },
  activate: { text: 'Duyệt nhóm do AI đề xuất', icon: 'task_alt', submit: 'Duyệt & kích hoạt' },
}

const str = (v) => (v === null || v === undefined ? '' : String(v))

/**
 * mode: 'create' | 'edit' | 'activate'. Chỉ render khi mở (cha gắn key) nên form lấy giá trị ban đầu từ props.
 * relationships: danh sách quan hệ từ API để chọn.
 */
export function DependentGroupModal({ mode = 'create', initialData = null, relationships = [], onClose, onSubmit, isSubmitting = false }) {
  const isCreate = mode === 'create'
  const copy = TITLES[mode] ?? TITLES.create
  const [form, setForm] = useState(() => ({
    code: initialData?.code || '',
    name: initialData?.name || '',
    relationshipCode: initialData?.relationshipCode || '',
    minAge: str(initialData?.minAge),
    maxAge: str(initialData?.maxAge),
    requireDisabled: Boolean(initialData?.requireDisabled),
    requireStudying: Boolean(initialData?.requireStudying),
    level: str(initialData?.level ?? 0),
    displayOrder: str(initialData?.displayOrder ?? 0),
    isActive: initialData ? Boolean(initialData.isActive) : true,
  }))
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateGroupForm(form, mode)
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
  const relRequired = mode === 'activate' || form.isActive

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-xl w-full p-space-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{copy.icon}</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-title-md text-title-md font-bold text-on-surface">{copy.text}</h3>
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

        {mode === 'activate' && (
          <p className="text-xs text-on-surface-variant bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
            Nhóm này do AI đề xuất khi bóc tách văn bản. Chọn quan hệ và kiểm tra điều kiện trước khi kích hoạt; sau khi duyệt,
            nhóm sẽ hiện trên ứng dụng người nộp thuế.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md pt-1">
          <div className={`grid grid-cols-1 ${isCreate ? 'md:grid-cols-2' : ''} gap-space-md`}>
            {isCreate && (
              <div className="flex flex-col gap-1.5">
                {label('Mã nhóm', true)}
                <input
                  autoFocus
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="VD: CON_NUOI"
                  className={`${inputBase} font-mono ${border('code')}`}
                />
                {err('code')}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {label('Quan hệ', relRequired)}
              <select
                value={form.relationshipCode}
                onChange={set('relationshipCode')}
                className={`${inputBase} cursor-pointer ${border('relationshipCode')}`}
              >
                <option value="">-- Chọn quan hệ --</option>
                {relationships.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                    {r.isActive === false ? ' (đang tắt)' : ''}
                  </option>
                ))}
              </select>
              {err('relationshipCode')}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Tên nhóm', true)}
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Tên hiển thị trên ứng dụng"
              className={`${inputBase} ${border('name')}`}
            />
            {err('name')}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
            {[
              ['minAge', 'Tuổi tối thiểu'],
              ['maxAge', 'Tuổi tối đa'],
              ['level', 'Cấp (level)'],
              ['displayOrder', 'Thứ tự hiển thị'],
            ].map(([key, text]) => (
              <div key={key} className="flex flex-col gap-1.5">
                {label(text)}
                <input inputMode="numeric" value={form[key]} onChange={set(key)} className={`${inputBase} ${border(key)}`} />
                {err(key)}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-on-surface-variant -mt-2">
            Để trống tuổi nếu không giới hạn. Người dùng chỉ được chuyển sang nhóm có cấp bằng hoặc cao hơn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 p-3 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" checked={form.requireDisabled} onChange={setBool('requireDisabled')} className="w-4 h-4" />
              Yêu cầu khuyết tật / mất khả năng lao động
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" checked={form.requireStudying} onChange={setBool('requireStudying')} className="w-4 h-4" />
              Yêu cầu đang đi học
            </label>
          </div>

          {mode !== 'activate' && (
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={setBool('isActive')} className="w-4 h-4" />
              Đang áp dụng (hiện trên ứng dụng)
            </label>
          )}

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
              {isSubmitting ? 'Đang lưu...' : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
