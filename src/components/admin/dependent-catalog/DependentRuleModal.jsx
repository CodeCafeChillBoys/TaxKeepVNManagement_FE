import { useState, useMemo } from 'react'
import { buildGroupOptions, alternativeGroupSuggestions } from '@/utils/dependentCatalogUtils'

const inputBase =
  'w-full h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none'

export const ALTERNATIVE_GROUP_NOTE = 'Các giấy tờ cùng mã trong một nhóm: chỉ cần nộp 1'

/**
 * Form thêm/sửa rule giấy tờ NPT. BE không cho đổi targetGroup/docType khi sửa nên 2 ô này chỉ hiện khi tạo.
 * groups: danh mục nhóm (kể cả chờ duyệt); rules: các rule đang có, để gợi ý alternativeGroup cùng nhóm.
 */
export function DependentRuleModal({ mode = 'create', initialData = null, groups = [], rules = [], docTypeOptions = [], onClose, onSubmit, isSubmitting = false }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState(() => ({
    targetGroup: initialData?.targetGroup || '',
    docType: initialData?.docType || '',
    docName: initialData?.docName || '',
    isMandatory: initialData ? Boolean(initialData.isMandatory) : true,
    description: initialData?.description || '',
    alternativeGroup: initialData?.alternativeGroup || '',
    isActive: initialData ? Boolean(initialData.isActive) : true,
  }))
  const [errors, setErrors] = useState({})

  const groupOptions = useMemo(
    () => buildGroupOptions(groups, initialData?.targetGroup ? [initialData.targetGroup] : []),
    [groups, initialData]
  )
  const suggestions = useMemo(() => alternativeGroupSuggestions(rules, form.targetGroup), [rules, form.targetGroup])
  const groupLabel = groupOptions.find((o) => o.value === form.targetGroup)?.label || form.targetGroup

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (isCreate && !form.targetGroup) errs.targetGroup = 'Vui lòng chọn nhóm đối tượng.'
    if (isCreate && !/^[A-Z0-9_]+$/.test(form.docType.trim().toUpperCase())) errs.docType = 'Mã giấy tờ chỉ gồm chữ A-Z, số và dấu _.'
    if (form.alternativeGroup.trim() && !/^[A-Za-z0-9_ ]+$/.test(form.alternativeGroup.trim()))
      errs.alternativeGroup = 'Mã nhóm "chọn 1" chỉ gồm chữ, số và dấu _.'
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
              <span className="material-symbols-outlined text-[22px]">{isCreate ? 'note_add' : 'edit'}</span>
            </div>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              {isCreate ? 'Thêm quy tắc giấy tờ' : 'Sửa quy tắc giấy tờ'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1.5">
                {label('Nhóm đối tượng', true)}
                <select value={form.targetGroup} onChange={set('targetGroup')} className={`${inputBase} cursor-pointer ${border('targetGroup')}`}>
                  <option value="">-- Chọn nhóm --</option>
                  {groupOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {err('targetGroup')}
              </div>
              <div className="flex flex-col gap-1.5">
                {label('Mã loại giấy tờ', true)}
                <input
                  value={form.docType}
                  onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value.toUpperCase() }))}
                  list="dependent-rule-doc-types"
                  placeholder="VD: BIRTH_CERTIFICATE"
                  className={`${inputBase} font-mono ${border('docType')}`}
                />
                <datalist id="dependent-rule-doc-types">
                  {docTypeOptions.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                {err('docType')}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 text-xs flex flex-col gap-0.5">
              <span className="font-semibold text-on-surface">{groupLabel}</span>
              <span className="font-mono text-on-surface-variant">{form.docType}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {label('Tên giấy tờ hiển thị')}
            <input value={form.docName} onChange={set('docName')} placeholder="VD: Giấy khai sinh" className={`${inputBase} border-outline-variant/40`} />
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Nhóm "chọn 1 trong N" (alternativeGroup)')}
            <input
              value={form.alternativeGroup}
              onChange={set('alternativeGroup')}
              list="dependent-rule-alt-groups"
              placeholder="VD: RELATION_PROOF (để trống nếu bắt buộc riêng)"
              className={`${inputBase} font-mono ${border('alternativeGroup')}`}
            />
            <datalist id="dependent-rule-alt-groups">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {err('alternativeGroup')}
            <p className="text-[11px] text-on-surface-variant">
              {ALTERNATIVE_GROUP_NOTE}.
              {suggestions.length > 0 && ` Đang dùng trong nhóm này: ${suggestions.join(', ')}.`}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {label('Mô tả / điều kiện')}
            <textarea rows={3} value={form.description} onChange={set('description')} className="w-full px-3 py-2 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none border-outline-variant/40" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" checked={form.isMandatory} onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))} className="w-4 h-4" />
              Bắt buộc
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
              Đang hiệu lực
            </label>
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
              {isSubmitting ? 'Đang lưu...' : isCreate ? 'Thêm quy tắc' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
