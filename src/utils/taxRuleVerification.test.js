import { describe, it, expect } from 'vitest'
import {
  evaluateApplicabilityByDates,
  normalizeAiVerification,
  resolveTaxRuleVerification,
} from './taxRuleVerification'

describe('taxRuleVerification', () => {
  it('không cảnh báo lệch năm khi văn bản hiệu lực từ 2020 và vẫn áp dụng cho kỳ 2025 (từ AI)', () => {
    const result = resolveTaxRuleVerification({
      taxRuleSet: { name: 'Nghị quyết 954/2020/UBTVQH14', taxYear: 2025, effectiveFrom: '2020-07-01' },
      taxRules: [{ ruleCode: 'PIT_01' }],
      verification: {
        inputTaxYear: 2025,
        extractedTaxYear: 2020,
        isTaxYearMatched: true,
        mismatchReason: null,
      },
    })

    expect(result.status).toBe('APPLICABLE')
    expect(result.isTaxYearMatched).toBe(true)
    expect(result.extractedTaxYear).toBe(2020)
    expect(result.warningMessage).toBeNull()
  })

  it('không cảnh báo lệch năm khi tải từ CSDL (không có verification) nếu văn bản hiệu lực từ 2020 và chọn kỳ 2025', () => {
    const result = resolveTaxRuleVerification({
      taxRuleSet: {
        name: 'Nghị quyết 954/2020/UBTVQH14',
        taxYear: 2025,
        effectiveFrom: '2020-07-01',
        effectiveTo: null,
        status: 'Draft',
      },
      taxRules: [],
    })

    expect(result.status).toBe('APPLICABLE')
    expect(result.isTaxYearMatched).toBe(true)
    expect(result.warningMessage).toBeNull()
  })

  it('báo lý do cụ thể khi có căn cứ văn bản không áp dụng từ AI (isTaxYearMatched = false)', () => {
    const result = resolveTaxRuleVerification({
      taxRuleSet: { name: 'Luật 2025', taxYear: 2026 },
      verification: {
        inputTaxYear: 2026,
        extractedTaxYear: 2025,
        isTaxYearMatched: false,
        mismatchReason: 'Văn bản chỉ áp dụng cho kỳ tính thuế 2025',
      },
    })

    expect(result.status).toBe('NOT_APPLICABLE')
    expect(result.isTaxYearMatched).toBe(false)
    expect(result.mismatchReason).toBe('Văn bản chỉ áp dụng cho kỳ tính thuế 2025')
    expect(result.warningMessage).toContain('Văn bản chỉ áp dụng cho kỳ tính thuế 2025')
  })

  it('báo lý do cụ thể khi ngày hiệu lực bắt đầu sau kỳ tính thuế hoặc kết thúc trước kỳ tính thuế', () => {
    const futureDoc = evaluateApplicabilityByDates({
      taxYear: 2025,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    })
    expect(futureDoc.status).toBe('NOT_APPLICABLE')
    expect(futureDoc.isTaxYearMatched).toBe(false)
    expect(futureDoc.mismatchReason).toContain('2026-01-01')

    const expiredDoc = evaluateApplicabilityByDates({
      taxYear: 2025,
      effectiveFrom: '2020-01-01',
      effectiveTo: '2024-12-31',
    })
    expect(expiredDoc.status).toBe('NOT_APPLICABLE')
    expect(expiredDoc.isTaxYearMatched).toBe(false)
    expect(expiredDoc.mismatchReason).toContain('2024-12-31')
  })

  it('báo "Chưa xác định được" khi tài liệu thiếu căn cứ xác định khả năng áp dụng (isTaxYearMatched = null)', () => {
    const aiNull = normalizeAiVerification(
      { inputTaxYear: 2025, extractedTaxYear: null, isTaxYearMatched: null },
      null,
      2025
    )
    expect(aiNull.status).toBe('UNDETERMINED')
    expect(aiNull.isTaxYearMatched).toBeNull()
    expect(aiNull.warningMessage).toContain('Chưa xác định được')

    const draftNoDates = resolveTaxRuleVerification({
      taxRuleSet: { name: 'Bản thảo chưa rõ ngày', taxYear: 2025, effectiveFrom: null, effectiveTo: null, status: 'Draft' },
      taxRules: [],
    })
    expect(draftNoDates.status).toBe('UNDETERMINED')
    expect(draftNoDates.isTaxYearMatched).toBeNull()
    expect(draftNoDates.warningMessage).toContain('Chưa xác định được')
  })
})
