import { apiClient } from './apiClient'
import { expertService } from './expertService'

/**
 * Tham số tính quyết toán thuế TNCN, đọc/ghi đúng các bảng BE dùng để tính:
 * - tax_deduction_policies  → GET/PUT /api/v1/tax-settlements/admin/deductions
 * - tax_brackets            → GET/PUT /api/v1/tax-settlements/admin/brackets
 * - tax_settlement_schedules → GET/PUT /api/v1/admin/tax-settlement-schedule (dùng lại expertService)
 * BE tự chọn bản ghi hiệu lực cho năm được hỏi (applies_from_year lớn nhất ≤ năm đó).
 */
const BASE = '/api/v1/tax-settlements/admin'

// apiClient đã trả body ApiResponse<T>
const dataOf = (res) => (res?.data !== undefined ? res.data : res)

export const taxPolicyService = {
  getDeductions: async (taxYear) => dataOf(await apiClient.get(`${BASE}/deductions`, { params: { taxYear } })),
  updateDeductions: async (payload) => apiClient.put(`${BASE}/deductions`, payload),
  getBrackets: async (taxYear) => dataOf(await apiClient.get(`${BASE}/brackets`, { params: { taxYear } })) ?? [],
  updateBrackets: async (payload) => apiClient.put(`${BASE}/brackets`, payload),
  getSchedule: (taxYear) => expertService.getTaxSettlementSchedule(taxYear),
  updateSchedule: (payload) => expertService.updateTaxSettlementSchedule(payload),
}

// ── Chuyển đổi giữa dữ liệu API và form (hàm thuần, có test) ─────────────────

/**
 * Chỉ giữ các bậc của một năm áp dụng. Khi năm được hỏi sớm hơn mọi biểu thuế,
 * BE trả toàn bộ bậc đang bật của nhiều năm (xếp theo năm tăng dần), nên lấy năm đầu tiên.
 */
export function effectiveBrackets(list) {
  if (!Array.isArray(list) || list.length === 0) return []
  const year = list[0].appliesFromYear
  return list.filter((b) => b.appliesFromYear === year)
}

/** Biểu thuế từ bảng tax_brackets → chuỗi JSON cho BracketsEditor. */
export function bracketsApiToJson(list) {
  const rows = (Array.isArray(list) ? list : [])
    .slice()
    .sort((a, b) => a.bracketNo - b.bracketNo)
    .map((b) => ({
      bracketNo: b.bracketNo,
      fromMonthly: Number(b.fromMonthly),
      toMonthly: b.toMonthly == null ? null : Number(b.toMonthly),
      rate: Number(b.rate),
      quickDeduct: Number(b.quickDeduct),
    }))
  return JSON.stringify(rows)
}

/** JSON từ BracketsEditor → body PUT admin/brackets. */
export function bracketsJsonToPayload(json, taxYear) {
  return { taxYear: Number(taxYear), brackets: JSON.parse(json) }
}

/** Năm áp dụng thực tế của biểu thuế BE trả về (null nếu chưa có). */
export function bracketsAppliesFromYear(list) {
  return Array.isArray(list) && list.length > 0 ? list[0].appliesFromYear ?? null : null
}

/** Chính sách giảm trừ (tax_deduction_policies) → giá trị form: tiền là chuỗi số, tỷ lệ là chuỗi %. */
export function deductionsToForm(policy) {
  const money = (v) => (v == null ? '' : String(Math.round(Number(v))))
  const pct = (v) => (v == null ? '' : String(Number((Number(v) * 100).toFixed(4))))
  return {
    personalMonthly: money(policy?.personalMonthly),
    dependentMonthly: money(policy?.dependentMonthly),
    bhxhRate: pct(policy?.bhxhRate),
    bhytRate: pct(policy?.bhytRate),
    bhtnRate: pct(policy?.bhtnRate),
    smallAmountExemption: money(policy?.smallAmountExemption),
  }
}

const MONEY_FIELDS = ['personalMonthly', 'dependentMonthly', 'smallAmountExemption']
const RATE_FIELDS = ['bhxhRate', 'bhytRate', 'bhtnRate']

/** Kiểm tra form giảm trừ; trả '' nếu hợp lệ. */
export function validateDeductionsForm(form) {
  for (const f of MONEY_FIELDS) {
    if (!/^\d+$/.test(String(form?.[f] ?? '').trim())) return 'Số tiền phải là số nguyên không âm (VNĐ).'
  }
  for (const f of RATE_FIELDS) {
    const n = Number(String(form?.[f] ?? '').trim().replace(',', '.'))
    if (String(form?.[f] ?? '').trim() === '' || !Number.isFinite(n) || n < 0 || n > 100) {
      return 'Tỷ lệ bảo hiểm phải là số từ 0 đến 100 (%).'
    }
  }
  return ''
}

/** Form giảm trừ → body PUT admin/deductions (tỷ lệ % → thập phân). */
export function deductionsFormToPayload(form, taxYear) {
  const rate = (s) => Number((Number(String(s).trim().replace(',', '.')) / 100).toFixed(6))
  return {
    taxYear: Number(taxYear),
    personalMonthly: Number(form.personalMonthly),
    dependentMonthly: Number(form.dependentMonthly),
    bhxhRate: rate(form.bhxhRate),
    bhytRate: rate(form.bhytRate),
    bhtnRate: rate(form.bhtnRate),
    smallAmountExemption: Number(form.smallAmountExemption),
  }
}
