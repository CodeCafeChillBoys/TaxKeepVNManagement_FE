// Helper thuần cho danh mục nhóm/quan hệ NPT. Nhãn luôn lấy `name` từ catalog, không viết cứng theo mã.

const norm = (v) => String(v ?? '').trim().toUpperCase()

export const PENDING_SUFFIX = ' (chờ duyệt)'

/** Nhóm do AI đề xuất, Admin chưa duyệt */
export const isPendingGroup = (g) => norm(g?.source) === 'AI' && !g?.isActive

export const filterPendingGroups = (groups = []) => groups.filter(isPendingGroup)

export const countPendingGroups = (groups = []) => filterPendingGroups(groups).length

export const sortByDisplayOrder = (items = []) =>
  [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || String(a.code).localeCompare(String(b.code)))

export const findByCode = (items = [], code) => {
  const key = norm(code)
  return key ? items.find((i) => norm(i.code) === key) || null : null
}

/** Tên nhóm/quan hệ theo mã; không có trong danh mục thì trả lại chính mã */
export const catalogName = (items = [], code) => findByCode(items, code)?.name || (code ? String(code) : '')

/** Nhãn hiển thị trong dropdown: thêm "(chờ duyệt)" với nhóm AI chưa duyệt */
export const groupOptionLabel = (g) => `${g.name || g.code}${isPendingGroup(g) ? PENDING_SUFFIX : ''}`

/**
 * Option cho dropdown nhóm: mọi nhóm trong danh mục (kể cả chờ duyệt), cộng các mã đang được dùng
 * (ví dụ trong rule) mà danh mục chưa có — để không mất giá trị khi sửa.
 */
export const buildGroupOptions = (groups = [], extraCodes = []) => {
  const options = sortByDisplayOrder(groups).map((g) => ({
    value: g.code,
    label: groupOptionLabel(g),
    isPending: isPendingGroup(g),
    isUnknown: false,
  }))
  const seen = new Set(options.map((o) => norm(o.value)))
  extraCodes.forEach((c) => {
    const key = norm(c)
    if (!key || seen.has(key)) return
    seen.add(key)
    options.push({ value: c, label: String(c), isPending: false, isUnknown: true })
  })
  return options
}

export const NEW_CODE_LABEL = 'Mã mới – sẽ chờ duyệt'

/**
 * Option loại NPT cho màn thẩm định quy tắc AI: danh mục + mã AI đề xuất chưa có trong danh mục
 * (BE sẽ tạo nhóm chờ duyệt khi đồng bộ).
 */
export const buildDependentTypeOptions = (groups = [], currentCode) =>
  buildGroupOptions(groups, currentCode ? [currentCode] : []).map((o) =>
    o.isUnknown ? { ...o, label: `${o.value} – ${NEW_CODE_LABEL}` } : o
  )

/** Các mã alternativeGroup đã dùng trong cùng nhóm, để gợi ý khi nhập */
export const alternativeGroupSuggestions = (rules = [], targetGroup) => {
  const key = norm(targetGroup)
  const values = new Set()
  rules.forEach((r) => {
    const alt = String(r.alternativeGroup ?? '').trim()
    if (alt && (!key || norm(r.targetGroup) === key)) values.add(alt)
  })
  return [...values].sort()
}

/** Gợi ý alternativeGroup trong danh sách giấy tờ của một nhóm (dữ liệu AI) */
export const documentAlternativeSuggestions = (docs = []) =>
  [...new Set(docs.map((d) => String(d?.alternativeGroup ?? '').trim()).filter(Boolean))].sort()

const isBlank = (v) => v === '' || v === null || v === undefined
const isNonNegInt = (v) => /^\d+$/.test(String(v).trim())

/**
 * Kiểm tra form nhóm. mode: 'create' | 'edit' | 'activate'.
 * Trả object lỗi theo field, rỗng = hợp lệ.
 */
export const validateGroupForm = (form, mode = 'create') => {
  const errors = {}
  if (mode === 'create') {
    if (!form.code?.trim()) errors.code = 'Vui lòng nhập mã nhóm.'
    else if (!/^[A-Z0-9_]+$/.test(form.code.trim().toUpperCase())) errors.code = 'Mã chỉ gồm chữ A-Z, số và dấu _.'
  }
  if (!form.name?.trim()) errors.name = 'Vui lòng nhập tên nhóm.'
  const needsRelationship = mode === 'activate' || form.isActive !== false
  if (needsRelationship && !form.relationshipCode?.trim()) errors.relationshipCode = 'Vui lòng chọn quan hệ.'
  ;['minAge', 'maxAge', 'level', 'displayOrder'].forEach((k) => {
    if (!isBlank(form[k]) && !isNonNegInt(form[k])) errors[k] = 'Phải là số nguyên không âm.'
  })
  if (!errors.minAge && !errors.maxAge && !isBlank(form.minAge) && !isBlank(form.maxAge)) {
    if (Number(form.minAge) >= Number(form.maxAge)) errors.maxAge = 'Tuổi tối đa phải lớn hơn tuổi tối thiểu.'
  }
  return errors
}

export const validateRelationshipForm = (form, mode = 'create') => {
  const errors = {}
  if (mode === 'create') {
    if (!form.code?.trim()) errors.code = 'Vui lòng nhập mã quan hệ.'
    else if (!/^[A-Z0-9_]+$/.test(form.code.trim().toUpperCase())) errors.code = 'Mã chỉ gồm chữ A-Z, số và dấu _.'
  }
  if (!form.name?.trim()) errors.name = 'Vui lòng nhập tên quan hệ.'
  if (!isBlank(form.displayOrder) && !isNonNegInt(form.displayOrder)) errors.displayOrder = 'Phải là số nguyên không âm.'
  return errors
}

/** "18–22", "≥ 60", "< 18" hoặc "—" */
export const formatAgeRange = (minAge, maxAge) => {
  const hasMin = !isBlank(minAge)
  const hasMax = !isBlank(maxAge)
  if (hasMin && hasMax) return `${minAge}–${maxAge}`
  if (hasMin) return `≥ ${minAge}`
  if (hasMax) return `< ${maxAge}`
  return '—'
}
