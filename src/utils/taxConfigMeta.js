// Nhận diện tham số hệ thống theo tên key, định dạng và kiểm tra giá trị.
// Module thuần JS (không React) để dễ test. Backend chỉ lưu key/value dạng chuỗi,
// nên "kiểu" của giá trị được suy ra từ tên key.

export const ConfigType = Object.freeze({
  MONEY: 'MONEY',
  RATE: 'RATE',
  BRACKETS: 'BRACKETS',
  DAY_LIST: 'DAY_LIST',
  MONTH: 'MONTH',
  DAY: 'DAY',
  YEAR: 'YEAR',
  TEXT: 'TEXT',
})

export const TYPE_LABELS = Object.freeze({
  MONEY: 'Tiền (VNĐ)',
  RATE: 'Tỷ lệ (%)',
  BRACKETS: 'Biểu thuế',
  DAY_LIST: 'Danh sách ngày',
  MONTH: 'Tháng',
  DAY: 'Ngày',
  YEAR: 'Năm',
  TEXT: 'Văn bản',
})

// Key chung; năm hiệu lực nhập ở ô "Áp dụng từ năm" (appliesFromYear), không nằm trong tên key.
export const KEY_TEMPLATES = [
  { label: 'Giảm trừ bản thân', key: 'PIT_DEDUCTION_PERSONAL_MONTHLY' },
  { label: 'Giảm trừ người phụ thuộc', key: 'PIT_DEDUCTION_DEPENDENT_MONTHLY' },
  { label: 'Biểu thuế', key: 'PIT_BRACKETS_JSON' },
]

const T = ConfigType

const KEY_RULES = [
  { re: /^PIT_NEW_LAW_FROM_YEAR$/, title: 'Năm bắt đầu áp dụng luật mới', group: 'Luật áp dụng', icon: 'gavel', type: T.YEAR, unit: '' },
  { re: /^PIT_DEDUCTION_PERSONAL_MONTHLY(?:_(\d{4}))?$/, title: 'Giảm trừ bản thân', group: 'Giảm trừ gia cảnh', icon: 'person', type: T.MONEY, unit: '/tháng' },
  { re: /^PIT_DEDUCTION_DEPENDENT_MONTHLY(?:_(\d{4}))?$/, title: 'Giảm trừ người phụ thuộc', group: 'Giảm trừ gia cảnh', icon: 'family_restroom', type: T.MONEY, unit: '/người/tháng' },
  { re: /^PIT_BRACKETS_JSON(?:_(\d{4}))?$/, title: 'Biểu thuế lũy tiến', group: 'Biểu thuế', icon: 'stacked_bar_chart', type: T.BRACKETS, unit: '' },
  { re: /^PIT_INSURANCE_BHXH_RATE$/, title: 'Tỷ lệ BHXH', group: 'Bảo hiểm', icon: 'shield', type: T.RATE, unit: '' },
  { re: /^PIT_INSURANCE_BHYT_RATE$/, title: 'Tỷ lệ BHYT', group: 'Bảo hiểm', icon: 'medical_services', type: T.RATE, unit: '' },
  { re: /^PIT_INSURANCE_BHTN_RATE$/, title: 'Tỷ lệ BHTN', group: 'Bảo hiểm', icon: 'work', type: T.RATE, unit: '' },
  { re: /^PIT_SMALL_AMOUNT_EXEMPTION$/, title: 'Ngưỡng miễn nộp bù', group: 'Quyết toán', icon: 'price_check', type: T.MONEY, unit: '' },
  { re: /^PIT_MEDICAL_MAX_YEARLY$/, title: 'Trần giảm trừ y tế', group: 'Trần giảm trừ', icon: 'medical_services', type: T.MONEY, unit: '/năm' },
  { re: /^PIT_EDUCATION_MAX_YEARLY$/, title: 'Trần giảm trừ giáo dục', group: 'Trần giảm trừ', icon: 'school', type: T.MONEY, unit: '/năm' },
  { re: /^TAX_SETTLEMENT_REMINDER_DAYS$/, title: 'Mốc nhắc hạn quyết toán', group: 'Hạn & nhắc nhở', icon: 'notifications_active', type: T.DAY_LIST, unit: 'ngày' },
  { re: /^TAX_SETTLEMENT_DEADLINE_MONTH$/, title: 'Tháng hạn chót', group: 'Hạn & nhắc nhở', icon: 'event', type: T.MONTH, unit: '' },
  { re: /^TAX_SETTLEMENT_DEADLINE_DAY$/, title: 'Ngày hạn chót', group: 'Hạn & nhắc nhở', icon: 'today', type: T.DAY, unit: '' },
]

// appliesFromYear (từ API) được ưu tiên; hậu tố _YYYY trong tên key chỉ còn để đọc dữ liệu cũ.
export function getConfigMeta(configKey, appliesFromYear = null) {
  const key = String(configKey ?? '')
  const required = /^(PIT_|TAX_SETTLEMENT_)/.test(key)
  for (const rule of KEY_RULES) {
    const m = key.match(rule.re)
    if (m) {
      return {
        title: rule.title,
        group: rule.group,
        icon: rule.icon,
        type: rule.type,
        unit: rule.unit,
        year: appliesFromYear ?? (m[1] ? Number(m[1]) : null),
        required,
        known: true,
      }
    }
  }
  return { title: key, group: 'Khác', icon: 'settings', type: T.TEXT, unit: '', year: appliesFromYear ?? null, required, known: false }
}

// ── Năm hiệu lực (appliesFromYear) ────────────────────────────────────────────

// null = dòng mặc định: dùng cho mọi năm không có dòng theo năm riêng.
export function formatAppliesFromYear(year) {
  return year == null ? 'Mặc định' : `Từ năm ${year}`
}

export function parseAppliesFromYearInput(input) {
  const s = String(input ?? '').trim()
  if (s === '') return { value: null, error: '' }
  if (!isIntInRange(s, 1900, 2200)) return { value: null, error: 'Năm áp dụng phải gồm 4 chữ số (ví dụ 2026).' }
  return { value: Number(s), error: '' }
}

// Năm cho bộ lọc "Năm tính thuế": từ 2025 đến năm hiện tại + 1, mới nhất trước.
export function getTaxYearOptions(currentYear = new Date().getFullYear()) {
  const last = Math.max(currentYear + 1, 2026)
  const years = []
  for (let y = last; y >= 2025; y--) years.push(y)
  return years
}

// ── Định dạng số ──────────────────────────────────────────────────────────────

export function groupThousands(digits) {
  const d = String(digits ?? '').replace(/^0+(?=\d)/, '')
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function rateToPercentNumber(rate) {
  return Number((rate * 100).toFixed(4))
}

export function formatPercent(rate) {
  return `${String(rateToPercentNumber(rate)).replace('.', ',')}%`
}

function isIntInRange(s, min, max) {
  if (!/^\d+$/.test(s)) return false
  const n = Number(s)
  return n >= min && n <= max
}

export function parseDayList(raw) {
  const parts = String(raw ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '')
  if (parts.length === 0) return null
  if (!parts.every((p) => /^\d+$/.test(p) && Number(p) > 0)) return null
  return parts.map(Number)
}

function rateValue(s) {
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null
}

// ── Hiển thị theo kiểu ────────────────────────────────────────────────────────

export function formatValue(type, raw) {
  const s = String(raw ?? '').trim()
  const invalid = { valid: false, text: String(raw ?? '') }
  switch (type) {
    case T.MONEY:
      return /^\d+$/.test(s) ? { valid: true, text: `${groupThousands(s)} ₫` } : invalid
    case T.RATE: {
      const n = rateValue(s)
      return n === null ? invalid : { valid: true, text: formatPercent(n) }
    }
    case T.MONTH:
      return isIntInRange(s, 1, 12) ? { valid: true, text: `Tháng ${Number(s)}` } : invalid
    case T.DAY:
      return isIntInRange(s, 1, 31) ? { valid: true, text: `Ngày ${Number(s)}` } : invalid
    case T.YEAR:
      return isIntInRange(s, 1900, 2200) ? { valid: true, text: String(Number(s)) } : invalid
    case T.DAY_LIST: {
      const list = parseDayList(s)
      return list ? { valid: true, text: `${list.join(', ')} ngày` } : invalid
    }
    case T.BRACKETS:
      return summarizeBrackets(raw)
    default:
      return { valid: true, text: s.length > 60 ? `${s.slice(0, 60)}…` : s }
  }
}

// ── Kiểm tra khi nhập ─────────────────────────────────────────────────────────

export function validateValue(type, raw) {
  const s = String(raw ?? '')
  if (s.trim() === '') return 'Giá trị không được để trống.'
  switch (type) {
    case T.MONEY:
      return /^\d+$/.test(s.trim()) ? '' : 'Số tiền phải là số nguyên không âm (VNĐ).'
    case T.RATE:
      return formatValue(type, s).valid ? '' : 'Tỷ lệ phải nằm trong khoảng 0–100%.'
    case T.MONTH:
      return formatValue(type, s).valid ? '' : 'Tháng phải là số nguyên từ 1 đến 12.'
    case T.DAY:
      return formatValue(type, s).valid ? '' : 'Ngày phải là số nguyên từ 1 đến 31.'
    case T.YEAR:
      return formatValue(type, s).valid ? '' : 'Năm phải gồm 4 chữ số (ví dụ 2026).'
    case T.DAY_LIST:
      return parseDayList(s) ? '' : 'Danh sách ngày phải gồm các số nguyên dương, cách nhau bởi dấu phẩy (ví dụ 60,30,15).'
    case T.BRACKETS:
      return validateBrackets(s)
    default:
      return ''
  }
}

// ── Tỷ lệ ↔ phần trăm (ô nhập RATE) ───────────────────────────────────────────

export function rateToPercentInput(raw) {
  const s = String(raw ?? '').trim()
  const n = Number(s)
  if (s === '' || !Number.isFinite(n)) return s
  return String(rateToPercentNumber(n))
}

export function percentInputToRate(text) {
  const s = String(text ?? '').trim().replace(',', '.')
  if (s === '') return ''
  const n = Number(s)
  if (!Number.isFinite(n)) return String(text)
  return String(Number((n / 100).toFixed(6)))
}

// ── Khóa cấu hình ─────────────────────────────────────────────────────────────

export function normalizeKeyInput(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

export function validateKey(key) {
  const k = String(key ?? '')
  if (k.trim() === '') return 'Vui lòng nhập mã tham số.'
  if (k.length > 100) return 'Mã tham số không được vượt quá 100 ký tự.'
  if (!/^[A-Z0-9_]+$/.test(k)) return 'Mã tham số chỉ gồm chữ in hoa không dấu, chữ số và dấu gạch dưới.'
  return ''
}

// ── Thời gian ─────────────────────────────────────────────────────────────────

export function formatDateTime(iso) {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ── Biểu thuế ─────────────────────────────────────────────────────────────────

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function parseBrackets(raw) {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

export function validateBrackets(raw) {
  let rows
  try {
    rows = JSON.parse(raw)
  } catch {
    return 'Biểu thuế không phải JSON hợp lệ.'
  }
  if (!Array.isArray(rows) || rows.length === 0) return 'Biểu thuế phải có ít nhất 1 bậc.'

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const no = i + 1
    const bad =
      !r ||
      !isNum(r.fromMonthly) || r.fromMonthly < 0 ||
      !isNum(r.rate) || r.rate < 0 || r.rate > 1 ||
      !isNum(r.quickDeduct) || r.quickDeduct < 0 ||
      (r.toMonthly !== null && !isNum(r.toMonthly))
    if (bad) return `Bậc ${no}: dữ liệu không hợp lệ.`

    if (i === 0 && r.fromMonthly !== 0) return 'Bậc 1 phải bắt đầu từ 0.'
    if (i > 0 && r.fromMonthly !== rows[i - 1].toMonthly) {
      return `Bậc ${no} phải bắt đầu đúng chỗ bậc ${i} kết thúc.`
    }
    const isLast = i === rows.length - 1
    if (!isLast && r.toMonthly === null) return 'Chỉ bậc cuối được để trống "Đến".'
    if (r.toMonthly !== null && r.toMonthly <= r.fromMonthly) return `Bậc ${no}: "Đến" phải lớn hơn "Từ".`
    if (i > 0 && r.rate <= rows[i - 1].rate) return `Thuế suất bậc ${no} phải lớn hơn bậc ${i}.`
  }
  return ''
}

export function summarizeBrackets(raw) {
  if (validateBrackets(raw) !== '') return { valid: false, text: String(raw ?? '') }
  const rows = JSON.parse(raw)
  const first = formatPercent(rows[0].rate)
  const last = formatPercent(rows[rows.length - 1].rate)
  return { valid: true, text: `${rows.length} bậc · ${first} → ${last}` }
}

// Dòng trong BracketsEditor luôn là chuỗi: { from, to, rate (đơn vị %), quick }.

export function bracketsToRows(raw) {
  const rows = parseBrackets(raw)
  if (!rows) return []
  return rows.map((r) => ({
    from: String(r?.fromMonthly ?? ''),
    to: r?.toMonthly == null ? '' : String(r.toMonthly),
    rate: isNum(r?.rate) ? String(rateToPercentNumber(r.rate)) : '',
    quick: String(r?.quickDeduct ?? ''),
  }))
}

function parseCell(s) {
  const t = String(s ?? '').trim().replace(',', '.')
  if (t === '') return { empty: true }
  const n = Number(t)
  return Number.isFinite(n) ? { n } : { bad: true }
}

export function rowsToBracketsJson(rows) {
  const out = rows.map((r, i) => {
    const from = parseCell(r.from)
    const to = parseCell(r.to)
    const rate = parseCell(r.rate)
    const quick = parseCell(r.quick)
    return {
      bracketNo: i + 1,
      fromMonthly: from.n ?? null,
      // Ô trống = không giới hạn (null); ô chữ bậy = thiếu trường để validate bắt lỗi.
      toMonthly: to.empty ? null : (to.n ?? undefined),
      rate: rate.n === undefined ? null : Number((rate.n / 100).toFixed(6)),
      quickDeduct: quick.n ?? null,
    }
  })
  return JSON.stringify(out, null, 2)
}
