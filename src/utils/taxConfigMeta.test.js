import { describe, it, expect } from 'vitest'
import {
  ConfigType,
  getConfigMeta,
  groupThousands,
  formatPercent,
  formatValue,
  validateValue,
  parseDayList,
  rateToPercentInput,
  percentInputToRate,
  normalizeKeyInput,
  validateKey,
  formatDateTime,
  validateBrackets,
  summarizeBrackets,
  parseBrackets,
  bracketsToRows,
  rowsToBracketsJson,
  KEY_TEMPLATES,
  formatAppliesFromYear,
  parseAppliesFromYearInput,
  getTaxYearOptions,
} from './taxConfigMeta'

const T = ConfigType

describe('getConfigMeta', () => {
  const cases = [
    ['PIT_NEW_LAW_FROM_YEAR', 'Năm bắt đầu áp dụng luật mới', 'Luật áp dụng', T.YEAR, null],
    ['PIT_DEDUCTION_PERSONAL_MONTHLY_2026', 'Giảm trừ bản thân', 'Giảm trừ gia cảnh', T.MONEY, 2026],
    ['PIT_DEDUCTION_PERSONAL_MONTHLY_2025', 'Giảm trừ bản thân', 'Giảm trừ gia cảnh', T.MONEY, 2025],
    ['PIT_DEDUCTION_DEPENDENT_MONTHLY_2026', 'Giảm trừ người phụ thuộc', 'Giảm trừ gia cảnh', T.MONEY, 2026],
    ['PIT_BRACKETS_JSON_2026', 'Biểu thuế lũy tiến', 'Biểu thuế', T.BRACKETS, 2026],
    ['PIT_INSURANCE_BHXH_RATE', 'Tỷ lệ BHXH', 'Bảo hiểm', T.RATE, null],
    ['PIT_INSURANCE_BHYT_RATE', 'Tỷ lệ BHYT', 'Bảo hiểm', T.RATE, null],
    ['PIT_INSURANCE_BHTN_RATE', 'Tỷ lệ BHTN', 'Bảo hiểm', T.RATE, null],
    ['PIT_SMALL_AMOUNT_EXEMPTION', 'Ngưỡng miễn nộp bù', 'Quyết toán', T.MONEY, null],
    ['PIT_MEDICAL_MAX_YEARLY', 'Trần giảm trừ y tế', 'Trần giảm trừ', T.MONEY, null],
    ['PIT_EDUCATION_MAX_YEARLY', 'Trần giảm trừ giáo dục', 'Trần giảm trừ', T.MONEY, null],
    ['TAX_SETTLEMENT_REMINDER_DAYS', 'Mốc nhắc hạn quyết toán', 'Hạn & nhắc nhở', T.DAY_LIST, null],
    ['TAX_SETTLEMENT_DEADLINE_MONTH', 'Tháng hạn chót', 'Hạn & nhắc nhở', T.MONTH, null],
    ['TAX_SETTLEMENT_DEADLINE_DAY', 'Ngày hạn chót', 'Hạn & nhắc nhở', T.DAY, null],
  ]

  it.each(cases)('nhận diện %s', (key, title, group, type, year) => {
    const m = getConfigMeta(key)
    expect(m.title).toBe(title)
    expect(m.group).toBe(group)
    expect(m.type).toBe(type)
    expect(m.year).toBe(year)
    expect(m.required).toBe(true)
    expect(m.known).toBe(true)
  })

  it('đơn vị của giảm trừ theo tháng và trần theo năm', () => {
    expect(getConfigMeta('PIT_DEDUCTION_PERSONAL_MONTHLY_2026').unit).toBe('/tháng')
    expect(getConfigMeta('PIT_DEDUCTION_DEPENDENT_MONTHLY_2026').unit).toBe('/người/tháng')
    expect(getConfigMeta('PIT_MEDICAL_MAX_YEARLY').unit).toBe('/năm')
  })

  it('key lạ rơi vào nhóm Khác kiểu TEXT, không bắt buộc', () => {
    const m = getConfigMeta('ABC_SOMETHING')
    expect(m).toMatchObject({ title: 'ABC_SOMETHING', group: 'Khác', type: T.TEXT, year: null, required: false, known: false })
  })

  it('key viết thường không bị nhận nhầm', () => {
    const m = getConfigMeta('pit_deduction_personal_monthly_2026')
    expect(m.known).toBe(false)
    expect(m.type).toBe(T.TEXT)
    expect(m.required).toBe(false)
  })

  it('key PIT_ lạ vẫn coi là bắt buộc nhưng kiểu TEXT', () => {
    const m = getConfigMeta('PIT_SOMETHING_NEW')
    expect(m.known).toBe(false)
    expect(m.required).toBe(true)
  })

  it('chịu được giá trị rỗng/null', () => {
    expect(getConfigMeta('').group).toBe('Khác')
    expect(getConfigMeta(null).group).toBe('Khác')
  })
})

describe('groupThousands / formatPercent', () => {
  it('nhóm hàng nghìn bằng dấu chấm', () => {
    expect(groupThousands('15500000')).toBe('15.500.000')
    expect(groupThousands('0')).toBe('0')
    expect(groupThousands('999')).toBe('999')
    expect(groupThousands('1000')).toBe('1.000')
    expect(groupThousands('007')).toBe('7')
    expect(groupThousands('')).toBe('')
  })

  it('định dạng % không lệch số thực', () => {
    expect(formatPercent(0.08)).toBe('8%')
    expect(formatPercent(0.015)).toBe('1,5%')
    expect(formatPercent(0.01)).toBe('1%')
    expect(formatPercent(0.07)).toBe('7%')
    expect(formatPercent(0.35)).toBe('35%')
  })
})

describe('formatValue', () => {
  it('MONEY', () => {
    expect(formatValue(T.MONEY, '15500000')).toEqual({ valid: true, text: '15.500.000 ₫' })
    expect(formatValue(T.MONEY, '0')).toEqual({ valid: true, text: '0 ₫' })
    expect(formatValue(T.MONEY, 'abc').valid).toBe(false)
    expect(formatValue(T.MONEY, '1e7').valid).toBe(false)
    expect(formatValue(T.MONEY, '-5').valid).toBe(false)
    expect(formatValue(T.MONEY, '').valid).toBe(false)
  })

  it('RATE', () => {
    expect(formatValue(T.RATE, '0.08')).toEqual({ valid: true, text: '8%' })
    expect(formatValue(T.RATE, '0.015').text).toBe('1,5%')
    expect(formatValue(T.RATE, '1').valid).toBe(true)
    expect(formatValue(T.RATE, '1.5').valid).toBe(false)
    expect(formatValue(T.RATE, '-0.1').valid).toBe(false)
    expect(formatValue(T.RATE, '').valid).toBe(false)
    expect(formatValue(T.RATE, '   ').valid).toBe(false)
  })

  it('MONTH / DAY / YEAR', () => {
    expect(formatValue(T.MONTH, '4')).toEqual({ valid: true, text: 'Tháng 4' })
    expect(formatValue(T.MONTH, '13').valid).toBe(false)
    expect(formatValue(T.MONTH, '0').valid).toBe(false)
    expect(formatValue(T.DAY, '30')).toEqual({ valid: true, text: 'Ngày 30' })
    expect(formatValue(T.DAY, '32').valid).toBe(false)
    expect(formatValue(T.YEAR, '2026')).toEqual({ valid: true, text: '2026' })
    expect(formatValue(T.YEAR, '26').valid).toBe(false)
  })

  it('DAY_LIST', () => {
    expect(formatValue(T.DAY_LIST, '60,30,15')).toEqual({ valid: true, text: '60, 30, 15 ngày' })
    expect(formatValue(T.DAY_LIST, '60,x').valid).toBe(false)
    expect(formatValue(T.DAY_LIST, '').valid).toBe(false)
  })

  it('TEXT cắt ngắn ở 60 ký tự', () => {
    const long = 'a'.repeat(80)
    expect(formatValue(T.TEXT, long).text).toBe('a'.repeat(60) + '…')
    expect(formatValue(T.TEXT, 'ngắn')).toEqual({ valid: true, text: 'ngắn' })
  })
})

describe('parseDayList', () => {
  it('đọc danh sách số nguyên dương, bỏ phần tử rỗng', () => {
    expect(parseDayList('60,30,15,7,3,1')).toEqual([60, 30, 15, 7, 3, 1])
    expect(parseDayList(' 60 , 30 ,')).toEqual([60, 30])
  })
  it('trả null khi sai', () => {
    expect(parseDayList('')).toBeNull()
    expect(parseDayList(',')).toBeNull()
    expect(parseDayList('0,5')).toBeNull()
    expect(parseDayList('5,-1')).toBeNull()
    expect(parseDayList('5,a')).toBeNull()
  })
})

describe('validateValue', () => {
  it('ô trống không bao giờ hợp lệ', () => {
    for (const t of Object.values(T)) {
      expect(validateValue(t, '')).toBe('Giá trị không được để trống.')
      expect(validateValue(t, '   ')).toBe('Giá trị không được để trống.')
    }
  })
  it('hợp lệ trả chuỗi rỗng', () => {
    expect(validateValue(T.MONEY, '15500000')).toBe('')
    expect(validateValue(T.RATE, '0.08')).toBe('')
    expect(validateValue(T.DAY_LIST, '60,30')).toBe('')
    expect(validateValue(T.MONTH, '4')).toBe('')
    expect(validateValue(T.TEXT, 'x')).toBe('')
  })
  it('báo lỗi tiếng Việt', () => {
    expect(validateValue(T.MONEY, '12a')).toMatch(/số nguyên không âm/)
    expect(validateValue(T.RATE, '2')).toMatch(/0–100%/)
    expect(validateValue(T.MONTH, '13')).toMatch(/1 đến 12/)
    expect(validateValue(T.DAY, '0')).toMatch(/1 đến 31/)
    expect(validateValue(T.YEAR, '12')).toMatch(/năm/i)
    expect(validateValue(T.DAY_LIST, '5,a')).toMatch(/số nguyên dương/)
  })
})

describe('đổi qua lại tỷ lệ ↔ phần trăm', () => {
  it('rate → ô nhập %', () => {
    expect(rateToPercentInput('0.08')).toBe('8')
    expect(rateToPercentInput('0.015')).toBe('1.5')
    expect(rateToPercentInput('0.07')).toBe('7')
    expect(rateToPercentInput('')).toBe('')
    expect(rateToPercentInput('abc')).toBe('abc')
  })
  it('ô nhập % → rate', () => {
    expect(percentInputToRate('8')).toBe('0.08')
    expect(percentInputToRate('1.5')).toBe('0.015')
    expect(percentInputToRate('1,5')).toBe('0.015')
    expect(percentInputToRate('7')).toBe('0.07')
    expect(percentInputToRate('100')).toBe('1')
    expect(percentInputToRate('')).toBe('')
    expect(percentInputToRate('abc')).toBe('abc')
  })
})

describe('khóa cấu hình', () => {
  it('normalizeKeyInput in hoa, đổi khoảng trắng, bỏ ký tự lạ', () => {
    expect(normalizeKeyInput('pit new law')).toBe('PIT_NEW_LAW')
    expect(normalizeKeyInput('a-b.c')).toBe('ABC')
    expect(normalizeKeyInput('')).toBe('')
  })
  it('validateKey', () => {
    expect(validateKey('')).toBe('Vui lòng nhập mã tham số.')
    expect(validateKey('A'.repeat(101))).toMatch(/100/)
    expect(validateKey('abc')).toMatch(/chữ in hoa/)
    expect(validateKey('PIT_OK_2027')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('định dạng dd/MM/yyyy HH:mm theo giờ máy', () => {
    const iso = new Date(2026, 8, 26, 14, 21).toISOString()
    expect(formatDateTime(iso)).toBe('26/09/2026 14:21')
  })
  it('giá trị hỏng trả dấu gạch', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('không phải ngày')).toBe('—')
  })
})

const BRACKETS_2026 = JSON.stringify([
  { bracketNo: 1, fromMonthly: 0, toMonthly: 10000000, rate: 0.05, quickDeduct: 0 },
  { bracketNo: 2, fromMonthly: 10000000, toMonthly: 30000000, rate: 0.1, quickDeduct: 500000 },
  { bracketNo: 3, fromMonthly: 30000000, toMonthly: 60000000, rate: 0.2, quickDeduct: 3500000 },
  { bracketNo: 4, fromMonthly: 60000000, toMonthly: 100000000, rate: 0.3, quickDeduct: 9500000 },
  { bracketNo: 5, fromMonthly: 100000000, toMonthly: null, rate: 0.35, quickDeduct: 14500000 },
])

const BRACKETS_2025 = JSON.stringify([
  { bracketNo: 1, fromMonthly: 0, toMonthly: 5000000, rate: 0.05, quickDeduct: 0 },
  { bracketNo: 2, fromMonthly: 5000000, toMonthly: 10000000, rate: 0.1, quickDeduct: 250000 },
  { bracketNo: 3, fromMonthly: 10000000, toMonthly: 18000000, rate: 0.15, quickDeduct: 750000 },
  { bracketNo: 4, fromMonthly: 18000000, toMonthly: 32000000, rate: 0.2, quickDeduct: 1650000 },
  { bracketNo: 5, fromMonthly: 32000000, toMonthly: 52000000, rate: 0.25, quickDeduct: 3250000 },
  { bracketNo: 6, fromMonthly: 52000000, toMonthly: 80000000, rate: 0.3, quickDeduct: 5850000 },
  { bracketNo: 7, fromMonthly: 80000000, toMonthly: null, rate: 0.35, quickDeduct: 9850000 },
])

const mutate = (fn) => {
  const rows = JSON.parse(BRACKETS_2026)
  fn(rows)
  return JSON.stringify(rows)
}

describe('validateBrackets', () => {
  it('chấp nhận biểu thuế 5 bậc và 7 bậc đang dùng', () => {
    expect(validateBrackets(BRACKETS_2026)).toBe('')
    expect(validateBrackets(BRACKETS_2025)).toBe('')
  })

  it('JSON hỏng', () => {
    expect(validateBrackets('không phải json')).toBe('Biểu thuế không phải JSON hợp lệ.')
  })

  it('không phải mảng hoặc mảng rỗng', () => {
    expect(validateBrackets('{}')).toBe('Biểu thuế phải có ít nhất 1 bậc.')
    expect(validateBrackets('[]')).toBe('Biểu thuế phải có ít nhất 1 bậc.')
  })

  it('bậc đầu phải bắt đầu từ 0', () => {
    expect(validateBrackets(mutate((r) => { r[0].fromMonthly = 1 }))).toBe('Bậc 1 phải bắt đầu từ 0.')
  })

  it('các bậc phải liền mạch', () => {
    expect(validateBrackets(mutate((r) => { r[2].fromMonthly = 31000000 }))).toBe('Bậc 3 phải bắt đầu đúng chỗ bậc 2 kết thúc.')
  })

  it('bậc giữa không được để trống "Đến"', () => {
    expect(validateBrackets(mutate((r) => { r[1].toMonthly = null }))).toBe('Chỉ bậc cuối được để trống "Đến".')
  })

  it('"Đến" phải lớn hơn "Từ"', () => {
    expect(validateBrackets(mutate((r) => { r[4].toMonthly = 100000000 }))).toBe('Bậc 5: "Đến" phải lớn hơn "Từ".')
  })

  it('thuế suất phải tăng dần', () => {
    expect(validateBrackets(mutate((r) => { r[2].rate = 0.1 }))).toBe('Thuế suất bậc 3 phải lớn hơn bậc 2.')
  })

  it('thuế suất ngoài 0–100% hoặc thiếu trường', () => {
    expect(validateBrackets(mutate((r) => { r[0].rate = 1.5 }))).toBe('Bậc 1: dữ liệu không hợp lệ.')
    expect(validateBrackets(mutate((r) => { delete r[0].quickDeduct }))).toBe('Bậc 1: dữ liệu không hợp lệ.')
    expect(validateBrackets(mutate((r) => { delete r[1].toMonthly }))).toBe('Bậc 2: dữ liệu không hợp lệ.')
  })
})

describe('summarizeBrackets / parseBrackets', () => {
  it('tóm tắt số bậc và khoảng thuế suất', () => {
    expect(summarizeBrackets(BRACKETS_2026)).toEqual({ valid: true, text: '5 bậc · 5% → 35%' })
    expect(summarizeBrackets(BRACKETS_2025)).toEqual({ valid: true, text: '7 bậc · 5% → 35%' })
  })
  it('giá trị hỏng trả invalid kèm chuỗi gốc', () => {
    expect(summarizeBrackets('abc')).toEqual({ valid: false, text: 'abc' })
  })
  it('formatValue BRACKETS dùng summarizeBrackets', () => {
    expect(formatValue(T.BRACKETS, BRACKETS_2026).text).toBe('5 bậc · 5% → 35%')
  })
  it('validateValue BRACKETS dùng validateBrackets', () => {
    expect(validateValue(T.BRACKETS, 'abc')).toBe('Biểu thuế không phải JSON hợp lệ.')
    expect(validateValue(T.BRACKETS, BRACKETS_2026)).toBe('')
  })
  it('parseBrackets trả mảng hoặc null', () => {
    expect(parseBrackets(BRACKETS_2026)).toHaveLength(5)
    expect(parseBrackets('abc')).toBeNull()
    expect(parseBrackets('{}')).toBeNull()
  })
})

describe('bracketsToRows / rowsToBracketsJson', () => {
  it('đổi qua lại không mất dữ liệu', () => {
    const rows = bracketsToRows(BRACKETS_2026)
    expect(rows[0]).toEqual({ from: '0', to: '10000000', rate: '5', quick: '0' })
    expect(rows[4]).toEqual({ from: '100000000', to: '', rate: '35', quick: '14500000' })
    expect(JSON.parse(rowsToBracketsJson(rows))).toEqual(JSON.parse(BRACKETS_2026))
  })

  it('tự đánh lại bracketNo', () => {
    const rows = bracketsToRows(BRACKETS_2026).slice(1)
    const out = JSON.parse(rowsToBracketsJson(rows))
    expect(out.map((r) => r.bracketNo)).toEqual([1, 2, 3, 4])
  })

  it('ô "Đến" trống = không giới hạn, ô chữ bậy bị validate bắt', () => {
    const rows = bracketsToRows(BRACKETS_2026)
    rows[4].to = ''
    expect(validateBrackets(rowsToBracketsJson(rows))).toBe('')
    rows[4].to = 'abc'
    expect(validateBrackets(rowsToBracketsJson(rows))).toBe('Bậc 5: dữ liệu không hợp lệ.')
  })

  it('ô số trống hoặc chữ ở Từ/Thuế suất/Số trừ bị validate bắt', () => {
    const rows = bracketsToRows(BRACKETS_2026)
    rows[0].rate = ''
    expect(validateBrackets(rowsToBracketsJson(rows))).toBe('Bậc 1: dữ liệu không hợp lệ.')
  })

  it('thuế suất % không lệch số thực', () => {
    const rows = bracketsToRows(BRACKETS_2026)
    rows[1].rate = '7'
    expect(JSON.parse(rowsToBracketsJson(rows))[1].rate).toBe(0.07)
  })

  it('bracketsToRows chịu được JSON hỏng', () => {
    expect(bracketsToRows('abc')).toEqual([])
    expect(bracketsToRows('{}')).toEqual([])
  })
})

describe('key theo năm hiệu lực (appliesFromYear)', () => {
  const cases = [
    ['PIT_DEDUCTION_PERSONAL_MONTHLY', 'Giảm trừ bản thân', T.MONEY],
    ['PIT_DEDUCTION_DEPENDENT_MONTHLY', 'Giảm trừ người phụ thuộc', T.MONEY],
    ['PIT_BRACKETS_JSON', 'Biểu thuế lũy tiến', T.BRACKETS],
  ]

  it.each(cases)('nhận diện key không hậu tố năm %s', (key, title, type) => {
    const m = getConfigMeta(key)
    expect(m).toMatchObject({ title, type, known: true, required: true, year: null })
  })

  it('năm lấy từ appliesFromYear khi có', () => {
    expect(getConfigMeta('PIT_BRACKETS_JSON', 2026).year).toBe(2026)
    expect(getConfigMeta('PIT_BRACKETS_JSON', null).year).toBeNull()
  })

  it('key cũ có hậu tố năm vẫn nhận diện được, ưu tiên appliesFromYear', () => {
    expect(getConfigMeta('PIT_BRACKETS_JSON_2025').year).toBe(2025)
    expect(getConfigMeta('PIT_BRACKETS_JSON_2025', 2026).year).toBe(2026)
  })

  it('mẫu nhanh dùng key chung, không còn hậu tố năm', () => {
    for (const t of KEY_TEMPLATES) {
      expect(t.key).not.toMatch(/_$/)
      expect(getConfigMeta(t.key).known).toBe(true)
    }
  })
})

describe('formatAppliesFromYear', () => {
  it('có năm → "Từ năm …", null → "Mặc định"', () => {
    expect(formatAppliesFromYear(2026)).toBe('Từ năm 2026')
    expect(formatAppliesFromYear(null)).toBe('Mặc định')
    expect(formatAppliesFromYear(undefined)).toBe('Mặc định')
  })
})

describe('parseAppliesFromYearInput', () => {
  it('ô trống = null (tham số mặc định)', () => {
    expect(parseAppliesFromYearInput('')).toEqual({ value: null, error: '' })
    expect(parseAppliesFromYearInput('   ')).toEqual({ value: null, error: '' })
  })
  it('năm hợp lệ', () => {
    expect(parseAppliesFromYearInput('2026')).toEqual({ value: 2026, error: '' })
  })
  it('năm sai báo lỗi', () => {
    expect(parseAppliesFromYearInput('26').error).toMatch(/4 chữ số/)
    expect(parseAppliesFromYearInput('20a6').error).toMatch(/4 chữ số/)
    expect(parseAppliesFromYearInput('1800').error).toMatch(/4 chữ số/)
  })
})

describe('getTaxYearOptions', () => {
  it('từ 2025 đến năm hiện tại + 1, mới nhất trước', () => {
    expect(getTaxYearOptions(2026)).toEqual([2027, 2026, 2025])
  })
  it('năm hiện tại trước 2025 vẫn có 2025, 2026', () => {
    expect(getTaxYearOptions(2024)).toEqual([2026, 2025])
  })
})
