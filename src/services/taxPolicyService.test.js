import { describe, it, expect } from 'vitest'
import {
  bracketsApiToJson,
  bracketsJsonToPayload,
  bracketsAppliesFromYear,
  effectiveBrackets,
  deductionsToForm,
  deductionsFormToPayload,
  validateDeductionsForm,
} from './taxPolicyService'

const apiBrackets = [
  { id: 'b', bracketNo: 2, fromMonthly: 10000000, toMonthly: 30000000, rate: 0.1, quickDeduct: 500000, appliesFromYear: 2026 },
  { id: 'a', bracketNo: 1, fromMonthly: 0, toMonthly: 10000000, rate: 0.05, quickDeduct: 0, appliesFromYear: 2026 },
  { id: 'c', bracketNo: 3, fromMonthly: 30000000, toMonthly: null, rate: 0.2, quickDeduct: 3500000, appliesFromYear: 2026 },
]

describe('biểu thuế', () => {
  it('sắp theo bậc, giữ "không giới hạn" và dựng lại body PUT', () => {
    const json = bracketsApiToJson(apiBrackets)
    const rows = JSON.parse(json)
    expect(rows.map((r) => r.bracketNo)).toEqual([1, 2, 3])
    expect(rows[2].toMonthly).toBeNull()
    expect(bracketsJsonToPayload(json, '2027')).toEqual({ taxYear: 2027, brackets: rows })
  })

  it('BE trả lẫn nhiều năm thì chỉ giữ năm đầu tiên', () => {
    const mixed = [
      { bracketNo: 1, appliesFromYear: 2025 },
      { bracketNo: 2, appliesFromYear: 2025 },
      { bracketNo: 1, appliesFromYear: 2026 },
    ]
    expect(effectiveBrackets(mixed)).toHaveLength(2)
    expect(effectiveBrackets(undefined)).toEqual([])
  })

  it('đọc năm áp dụng thực tế, rỗng thì null', () => {
    expect(bracketsAppliesFromYear(apiBrackets)).toBe(2026)
    expect(bracketsAppliesFromYear([])).toBeNull()
  })
})

describe('chính sách giảm trừ', () => {
  const policy = {
    appliesFromYear: 2026,
    personalMonthly: 15500000,
    dependentMonthly: 6200000,
    bhxhRate: 0.08,
    bhytRate: 0.015,
    bhtnRate: 0.01,
    smallAmountExemption: 50000,
  }

  it('đổi tỷ lệ thập phân sang % và ngược lại', () => {
    const form = deductionsToForm(policy)
    expect(form).toMatchObject({ personalMonthly: '15500000', bhxhRate: '8', bhytRate: '1.5' })
    expect(validateDeductionsForm(form)).toBe('')
    expect(deductionsFormToPayload(form, 2026)).toEqual({
      taxYear: 2026,
      personalMonthly: 15500000,
      dependentMonthly: 6200000,
      bhxhRate: 0.08,
      bhytRate: 0.015,
      bhtnRate: 0.01,
      smallAmountExemption: 50000,
    })
  })

  it('chặn tiền không phải số nguyên và tỷ lệ ngoài 0–100', () => {
    expect(validateDeductionsForm({ ...deductionsToForm(policy), personalMonthly: '15.5tr' })).not.toBe('')
    expect(validateDeductionsForm({ ...deductionsToForm(policy), bhxhRate: '120' })).not.toBe('')
  })
})
