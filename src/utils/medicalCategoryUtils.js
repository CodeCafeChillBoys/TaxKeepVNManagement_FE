/** 12 mã mục cố định của bảng kê chi phí KCB (Mẫu 01/KBCB, QĐ 697/QĐ-BYT) */
export const SECTION_OPTIONS = [
  { code: '1', name: 'Khám bệnh' },
  { code: '2', name: 'Ngày giường' },
  { code: '3', name: 'Xét nghiệm' },
  { code: '4', name: 'Chẩn đoán hình ảnh' },
  { code: '5', name: 'Thăm dò chức năng' },
  { code: '6', name: 'Thủ thuật, phẫu thuật' },
  { code: '7', name: 'Máu, chế phẩm máu, vận chuyển máu' },
  { code: '8', name: 'Thuốc, dịch truyền' },
  { code: '9', name: 'Thiết bị y tế' },
  { code: '10', name: 'Gói thiết bị y tế' },
  { code: '11', name: 'Vận chuyển người bệnh' },
  { code: '12', name: 'Dịch vụ khác' },
]

/** "2.1" vẫn ra tên mục cha "Ngày giường"; mã ngoài danh sách thì trả lại chính mã */
export function sectionLabel(code) {
  const c = String(code || '').trim()
  const hit = SECTION_OPTIONS.find((s) => s.code === c.split('.')[0])
  return hit ? `Mục ${c} · ${hit.name}` : c ? `Mục ${c}` : '—'
}

export const CATEGORY_CODE_PATTERN = /^[A-Z0-9_]+$/

export function validateCategoryForm(form, isCreate) {
  const errors = {}
  if (isCreate) {
    const code = String(form.categoryCode || '').trim().toUpperCase()
    if (!code) errors.categoryCode = 'Vui lòng nhập mã danh mục.'
    else if (code.length < 2 || code.length > 50) errors.categoryCode = 'Mã danh mục phải từ 2 đến 50 ký tự.'
    else if (!CATEGORY_CODE_PATTERN.test(code))
      errors.categoryCode = 'Mã chỉ gồm chữ in hoa không dấu, số và dấu gạch dưới (VD: EXCLUDED_COSMETIC).'
  }
  const name = String(form.categoryName || '').trim()
  if (!name) errors.categoryName = 'Vui lòng nhập tên danh mục.'
  else if (name.length < 2 || name.length > 255) errors.categoryName = 'Tên danh mục phải từ 2 đến 255 ký tự.'
  const section = String(form.sectionCode || '').trim()
  if (!section) errors.sectionCode = 'Vui lòng chọn mã mục trên bảng kê.'
  else if (section.length > 20) errors.sectionCode = 'Mã mục tối đa 20 ký tự.'
  return errors
}

/** Tách chuỗi từ khóa "a, b ,c" thành mảng để hiển thị */
export const splitKeywords = (keywords) =>
  String(keywords || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

/**
 * Lọc phía client (danh mục chỉ vài chục dòng).
 * status: 'active' | 'deleted' | 'all'; eligibility: 'all' | 'eligible' | 'excluded'
 */
export function filterCategories(items = [], { search = '', status = 'active', eligibility = 'all', section = 'all' } = {}) {
  const k = search.trim().toLowerCase()
  return items.filter((c) => {
    if (status === 'active' && c.isDeleted) return false
    if (status === 'deleted' && !c.isDeleted) return false
    if (eligibility === 'eligible' && !c.isEligible) return false
    if (eligibility === 'excluded' && c.isEligible) return false
    if (section !== 'all' && String(c.sectionCode).split('.')[0] !== section) return false
    if (!k) return true
    return [c.categoryCode, c.categoryName, c.keywords, c.description].some((v) =>
      String(v || '').toLowerCase().includes(k)
    )
  })
}
