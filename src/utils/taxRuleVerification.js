/**
 * Chuẩn hóa chuỗi ngày YYYY-MM-DD hợp lệ từ dữ liệu đầu vào (hoặc trả về null).
 */
export function normalizeIsoDateOnly(raw) {
  if (!raw) return null
  const match = String(raw).trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Rút năm bắt đầu hiệu lực từ ngày effectiveFrom (YYYY-MM-DD) của bộ quy tắc hoặc các quy tắc con.
 * Không suy đoán năm từ tiêu đề văn bản để tránh báo lệch năm sai cho văn bản hiệu lực nhiều năm.
 */
export function extractEffectiveStartYear(effectiveFrom, fallbackRules = []) {
  const iso = normalizeIsoDateOnly(effectiveFrom)
  if (iso) return parseInt(iso.slice(0, 4), 10)

  if (Array.isArray(fallbackRules)) {
    const ruleDates = fallbackRules
      .map((r) => normalizeIsoDateOnly(r?.effectiveFrom))
      .filter(Boolean)
      .sort()
    if (ruleDates.length > 0) {
      return parseInt(ruleDates[0].slice(0, 4), 10)
    }
  }
  return null
}

/**
 * Chuẩn hóa đối tượng `verification` trả về trực tiếp từ TaxAIService / BE.
 * Khớp logic `tax_rule_extraction_service.py`:
 * - isTaxYearMatched === true  -> APPLICABLE (không cảnh báo, kể cả extractedTaxYear < inputTaxYear)
 * - isTaxYearMatched === false -> NOT_APPLICABLE (báo lý do cụ thể từ mismatchReason)
 * - isTaxYearMatched === null  -> UNDETERMINED ("Chưa xác định được")
 */
export function normalizeAiVerification(rawVerification, rawWarning = null, fallbackTaxYear = null) {
  if (!rawVerification || typeof rawVerification !== 'object') return null

  const parsedInputYear = parseInt(rawVerification.inputTaxYear ?? fallbackTaxYear, 10)
  const inputTaxYear = Number.isNaN(parsedInputYear) ? null : parsedInputYear

  const parsedExtracted = parseInt(rawVerification.extractedTaxYear, 10)
  const extractedTaxYear =
    rawVerification.extractedTaxYear !== null &&
    rawVerification.extractedTaxYear !== undefined &&
    !Number.isNaN(parsedExtracted)
      ? parsedExtracted
      : null

  const isMatched = rawVerification.isTaxYearMatched
  const rawReason =
    typeof rawVerification.mismatchReason === 'string' && rawVerification.mismatchReason.trim()
      ? rawVerification.mismatchReason.trim()
      : null

  if (isMatched === true) {
    return {
      status: 'APPLICABLE',
      inputTaxYear,
      extractedTaxYear,
      isTaxYearMatched: true,
      mismatchReason: null,
      warningMessage: null,
    }
  }

  if (isMatched === false) {
    const baseMsg = inputTaxYear
      ? `Văn bản không áp dụng cho kỳ tính thuế ${inputTaxYear}.`
      : 'Văn bản không áp dụng cho kỳ tính thuế đã chọn.'
    const warningMessage =
      (typeof rawVerification.warningMessage === 'string' && rawVerification.warningMessage.trim()) ||
      (typeof rawWarning === 'string' && rawWarning.trim()) ||
      (rawReason ? `${baseMsg} Chi tiết: ${rawReason}` : baseMsg)

    return {
      status: 'NOT_APPLICABLE',
      inputTaxYear,
      extractedTaxYear,
      isTaxYearMatched: false,
      mismatchReason: rawReason,
      warningMessage,
    }
  }

  const undeterminedMsg =
    (typeof rawVerification.warningMessage === 'string' && rawVerification.warningMessage.trim()) ||
    (typeof rawWarning === 'string' && rawWarning.trim()) ||
    (inputTaxYear
      ? `Chưa xác định được văn bản có áp dụng cho kỳ tính thuế ${inputTaxYear}.`
      : 'Chưa xác định được')

  return {
    status: 'UNDETERMINED',
    inputTaxYear,
    extractedTaxYear,
    isTaxYearMatched: null,
    mismatchReason: null,
    warningMessage: undeterminedMsg,
  }
}

/**
 * Đánh giá khả năng áp dụng dựa trên khoảng thời gian hiệu lực [effectiveFrom, effectiveTo]
 * đối với kỳ tính thuế `taxYear` (dùng khi mở bộ quy tắc từ CSDL không kèm `verification` của AI,
 * hoặc khi Admin chỉnh sửa kỳ tính thuế / ngày hiệu lực trên giao diện).
 *
 * Ví dụ: Văn bản có hiệu lực từ 2020-01-01 (effectiveTo = null) và chọn kỳ 2025
 * -> APPLICABLE (isTaxYearMatched = true), KHÔNG cảnh báo lệch năm.
 */
export function evaluateApplicabilityByDates({
  taxYear,
  effectiveFrom,
  effectiveTo,
  taxRules = [],
  extractedTaxYear = null,
  isApproved = false,
} = {}) {
  const yearNum = parseInt(taxYear, 10)
  if (!yearNum || Number.isNaN(yearNum)) return null

  let fromIso = normalizeIsoDateOnly(effectiveFrom)
  let toIso = normalizeIsoDateOnly(effectiveTo)

  if (!fromIso && Array.isArray(taxRules) && taxRules.length > 0) {
    const ruleFromDates = taxRules
      .map((r) => normalizeIsoDateOnly(r?.effectiveFrom))
      .filter(Boolean)
      .sort()
    if (ruleFromDates.length > 0) fromIso = ruleFromDates[0]
  }

  const parsedExtracted = parseInt(extractedTaxYear, 10)
  const startYear =
    (fromIso ? parseInt(fromIso.slice(0, 4), 10) : null) ??
    (!Number.isNaN(parsedExtracted) && parsedExtracted > 0 ? parsedExtracted : null)

  const periodStart = `${yearNum}-01-01`
  const periodEnd = `${yearNum}-12-31`

  if (fromIso && fromIso > periodEnd) {
    const mismatchReason = `Văn bản bắt đầu có hiệu lực từ ${fromIso}, chưa áp dụng cho kỳ tính thuế ${yearNum}.`
    return {
      status: 'NOT_APPLICABLE',
      inputTaxYear: yearNum,
      extractedTaxYear: startYear,
      isTaxYearMatched: false,
      mismatchReason,
      warningMessage: `Văn bản không áp dụng cho kỳ tính thuế ${yearNum}. Chi tiết: ${mismatchReason}`,
    }
  }

  if (toIso && toIso < periodStart) {
    const mismatchReason = `Văn bản hết hiệu lực từ ${toIso}, không còn áp dụng cho kỳ tính thuế ${yearNum}.`
    return {
      status: 'NOT_APPLICABLE',
      inputTaxYear: yearNum,
      extractedTaxYear: startYear,
      isTaxYearMatched: false,
      mismatchReason,
      warningMessage: `Văn bản không áp dụng cho kỳ tính thuế ${yearNum}. Chi tiết: ${mismatchReason}`,
    }
  }

  if (!fromIso && startYear && yearNum < startYear) {
    const mismatchReason = `Văn bản bắt đầu áp dụng từ năm ${startYear}, chưa áp dụng cho kỳ tính thuế ${yearNum}.`
    return {
      status: 'NOT_APPLICABLE',
      inputTaxYear: yearNum,
      extractedTaxYear: startYear,
      isTaxYearMatched: false,
      mismatchReason,
      warningMessage: `Văn bản không áp dụng cho kỳ tính thuế ${yearNum}. Chi tiết: ${mismatchReason}`,
    }
  }

  if (fromIso || toIso) {
    return {
      status: 'APPLICABLE',
      inputTaxYear: yearNum,
      extractedTaxYear: startYear,
      isTaxYearMatched: true,
      mismatchReason: null,
      warningMessage: null,
    }
  }

  if (isApproved) {
    return {
      status: 'APPLICABLE',
      inputTaxYear: yearNum,
      extractedTaxYear: startYear,
      isTaxYearMatched: true,
      mismatchReason: null,
      warningMessage: null,
    }
  }

  return {
    status: 'UNDETERMINED',
    inputTaxYear: yearNum,
    extractedTaxYear: startYear,
    isTaxYearMatched: null,
    mismatchReason: null,
    warningMessage: `Chưa xác định được văn bản có áp dụng cho kỳ tính thuế ${yearNum}.`,
  }
}

/**
 * Hợp nhất kết quả kiểm tra khả năng áp dụng văn bản cho kỳ tính thuế từ payload API/AI.
 */
export function resolveTaxRuleVerification(data, fallbackTaxYear = null) {
  if (!data || typeof data !== 'object') return null

  const ruleSet = data.taxRuleSet || {}
  const rules = Array.isArray(data.taxRules) ? data.taxRules : []
  const taxYear = ruleSet.taxYear ?? data.taxYear ?? fallbackTaxYear
  const rawVerification = data.verification || ruleSet.verification || null
  const rawWarning = data.warning || null

  if (rawVerification && typeof rawVerification === 'object') {
    const normalized = normalizeAiVerification(rawVerification, rawWarning, taxYear)
    if (normalized) {
      if (!normalized.extractedTaxYear) {
        const inferredStart = extractEffectiveStartYear(ruleSet.effectiveFrom, rules)
        if (inferredStart) normalized.extractedTaxYear = inferredStart
      }
      return normalized
    }
  }

  const isApproved =
    String(ruleSet.status || data.status || '').toUpperCase() === 'ACTIVE'

  return evaluateApplicabilityByDates({
    taxYear,
    effectiveFrom: ruleSet.effectiveFrom,
    effectiveTo: ruleSet.effectiveTo,
    taxRules: rules,
    isApproved,
  })
}
