/**
 * Tiện ích phân loại và ánh xạ toàn bộ mã kỹ thuật từ Backend sang tiếng Việt chuẩn văn phòng.
 * Không sử dụng thuật ngữ IT và không sử dụng các badge nhiều màu sắc gây rối mắt.
 */

export const ConfigDataType = {
  FLOAT: 'FLOAT',
  BOOLEAN: 'BOOLEAN',
  LIST_STRING: 'LIST_STRING',
  INT: 'INT',
  STRING: 'STRING',
  JSON: 'JSON',
}

/**
 * Thứ tự sắp xếp ưu tiên hiển thị trên bảng
 */
export const CONFIG_SORT_ORDER = {
  AI_CONFIDENCE_THRESHOLD: 1,
  CRUCIAL_EXTRACTION_FIELDS: 2,
  MEDICAL_STATEMENT_AMOUNT_TOLERANCE: 3,
  AUTO_CONFIRM_ON_PASSED: 4,
  THRESHOLD_MEDICAL_RECEIPT: 10,
  CRUCIAL_FIELDS_MEDICAL_RECEIPT: 11,
  THRESHOLD_MEDICAL_COST_STATEMENT: 12,
  THRESHOLD_MEDICAL_EXPENSE_INVOICE: 13,
  THRESHOLD_EDUCATION_RECEIPT: 14,
  CRUCIAL_FIELDS_EDUCATION_RECEIPT: 15,
  THRESHOLD_EDUCATION_EXPENSE_INVOICE: 16,
  THRESHOLD_DONATION_RECEIPT: 17,
  CRUCIAL_FIELDS_DONATION_RECEIPT: 18,
  THRESHOLD_DONATION_VOUCHER: 19,
  THRESHOLD_WITHHOLDING_VOUCHER: 20,
  CRUCIAL_FIELDS_WITHHOLDING_VOUCHER: 21,
  THRESHOLD_VAT_INVOICE: 22,
  CRUCIAL_FIELDS_VAT_INVOICE: 23,
  THRESHOLD_SALES_INVOICE: 24,
  CRUCIAL_FIELDS_SALES_INVOICE: 25,
  THRESHOLD_INSURANCE_PREMIUM_RECEIPT: 26,
  CRUCIAL_FIELDS_INSURANCE_PREMIUM_RECEIPT: 27,
  THRESHOLD_GENERAL_EXPENSE: 28,
  CRUCIAL_FIELDS_GENERAL_EXPENSE: 29,
  THRESHOLD_INCOME_PAYSLIP: 30,
  CRUCIAL_FIELDS_INCOME_PAYSLIP: 31,
  THRESHOLD_CITIZEN_ID: 40,
  CRUCIAL_FIELDS_CITIZEN_ID: 41,
  THRESHOLD_CCCD: 42,
  CRUCIAL_FIELDS_CCCD: 43,
  THRESHOLD_BIRTH_CERTIFICATE: 44,
  CRUCIAL_FIELDS_BIRTH_CERTIFICATE: 45,
  THRESHOLD_STUDENT_CARD: 46,
  CRUCIAL_FIELDS_STUDENT_CARD: 47,
  THRESHOLD_DISABILITY_CERTIFICATE: 48,
  CRUCIAL_FIELDS_DISABILITY_CERTIFICATE: 49,
  THRESHOLD_MARRIAGE_CERTIFICATE: 50,
  CRUCIAL_FIELDS_MARRIAGE_CERTIFICATE: 51,
  THRESHOLD_RELATIONSHIP_CERTIFICATE: 52,
  CRUCIAL_FIELDS_RELATIONSHIP_CERTIFICATE: 53,
  THRESHOLD_RESIDENCE_CT07: 54,
  CRUCIAL_FIELDS_RESIDENCE_CT07: 55,
  THRESHOLD_SUPPORT_COMMITMENT_FORM: 56,
  CRUCIAL_FIELDS_SUPPORT_COMMITMENT_FORM: 57,
  THRESHOLD_EXPERT_CERTIFICATE: 60,
  CRUCIAL_FIELDS_EXPERT_CERTIFICATE: 61,
  THRESHOLD_TAX_AGENT: 62,
  CRUCIAL_FIELDS_TAX_AGENT: 63,
  THRESHOLD_CPA: 64,
  CRUCIAL_FIELDS_CPA: 65,
  THRESHOLD_ACCOUNTANT: 66,
  CRUCIAL_FIELDS_ACCOUNTANT: 67,
  THRESHOLD_CHIEF_ACCOUNTANT: 68,
  CRUCIAL_FIELDS_CHIEF_ACCOUNTANT: 69,
}

/**
 * Tự động nhận diện phân loại giá trị khi người dùng nhập liệu
 */
export function detectDataType(value) {
  if (value === undefined || value === null) return ConfigDataType.STRING
  const val = String(value).trim()
  const lower = val.toLowerCase()

  if (lower === 'true' || lower === 'false') {
    return ConfigDataType.BOOLEAN
  }

  if (/^-?\d+$/.test(val)) {
    return ConfigDataType.INT
  }

  const normalizedFloat = val.replace(',', '.')
  if (/^-?\d+\.\d+$/.test(normalizedFloat)) {
    return ConfigDataType.FLOAT
  }

  if (
    (val.startsWith('{') && val.endsWith('}')) ||
    (val.startsWith('[') && val.endsWith(']'))
  ) {
    try {
      JSON.parse(val)
      return ConfigDataType.JSON
    } catch {
      // Bỏ qua
    }
  }

  if (val.includes(',')) {
    return ConfigDataType.LIST_STRING
  }

  return ConfigDataType.STRING
}

const NEUTRAL_BADGE_CLASS =
  'bg-surface-container text-on-surface-variant border-outline-variant/40'

/**
 * Thông tin định danh thân thiện cho các phân loại thiết lập (chuẩn văn phòng, đồng bộ màu sắc trung tính)
 */
export const DATA_TYPE_META = {
  [ConfigDataType.FLOAT]: {
    label: 'Tỷ lệ / Định mức',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'percent',
    hint: 'Mức độ chính xác yêu cầu (ví dụ: 0.80 tương ứng 80%) hoặc mức sai số cho phép',
  },
  [ConfigDataType.BOOLEAN]: {
    label: 'Bật / Tắt',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'toggle_on',
    hint: 'Bật hoặc tắt áp dụng quy định',
  },
  [ConfigDataType.LIST_STRING]: {
    label: 'Danh mục thông tin',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'checklist',
    hint: 'Danh sách các mục thông tin bắt buộc cần đối chiếu trên hồ sơ, chứng từ',
  },
  [ConfigDataType.INT]: {
    label: 'Số lượng / Chỉ số',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'tag',
    hint: 'Giá trị số nguyên (ví dụ: 1, 5, 2026)',
  },
  [ConfigDataType.STRING]: {
    label: 'Văn bản',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'short_text',
    hint: 'Nội dung văn bản quy định hoặc hướng dẫn',
  },
  [ConfigDataType.JSON]: {
    label: 'Thiết lập chi tiết',
    badgeClass: NEUTRAL_BADGE_CLASS,
    icon: 'dataset',
    hint: 'Nhóm thông số thiết lập chi tiết',
  },
}

/**
 * Từ điển dịch toàn bộ các trường thông tin chứng từ / hồ sơ trong Backend sang tiếng Việt
 */
export const FIELD_LABELS = {
  total_amount: 'Tổng số tiền',
  seller_tax_code: 'Mã số thuế đơn vị phát hành',
  buyer_id_card: 'Số CCCD / Mã số thuế người nộp',
  invoice_number: 'Số ký hiệu chứng từ',
  invoice_date: 'Ngày lập chứng từ',
  seller_name: 'Tên đơn vị phát hành',
  buyer_name: 'Họ tên người mua',
  tax_amount: 'Tiền thuế',
  total_before_tax: 'Số tiền trước thuế',
  total_income: 'Tổng thu nhập',
  tax_withheld: 'Số thuế đã khấu trừ',
  income_year: 'Năm tính thu nhập',
  total_taxable_income: 'Tổng thu nhập chịu thuế',
  month: 'Tháng',
  year: 'Năm',
  citizen_id: 'Số Căn cước công dân',
  full_name: 'Họ và tên',
  birth_date: 'Ngày sinh',
  father_full_name: 'Họ và tên cha',
  mother_full_name: 'Họ và tên mẹ',
  student_id: 'Mã số học sinh / sinh viên',
  spouse_full_name: 'Họ và tên vợ / chồng',
  certificate_number: 'Số hiệu chứng chỉ',
  issue_date: 'Ngày cấp',
  expiry_date: 'Ngày hết hạn',
  issuing_authority: 'Cơ quan cấp',
  certificate_name: 'Tên chứng chỉ',
  gender: 'Giới tính',
  origin_place: 'Quê quán',
  residence_place: 'Nơi thường trú',
  tax_id_number: 'Mã số thuế',
  organization_name: 'Đơn vị chi trả thu nhập',
  insurance_deducted: 'Bảo hiểm bắt buộc đã đóng',
  tax_already_deducted: 'Thuế đã tạm khấu trừ',
}

export function formatFieldLabel(fieldCode) {
  const raw = String(fieldCode || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  return FIELD_LABELS[lower] || raw.replace(/_/g, ' ')
}

/**
 * Từ điển ánh xạ hậu tố loại chứng từ / giấy tờ trong Backend sang tiếng Việt
 */
export const DOCUMENT_SUFFIX_LABELS = {
  MEDICAL_RECEIPT: 'Biên lai viện phí khám chữa bệnh',
  MEDICAL_COST_STATEMENT: 'Bảng kê chi phí khám chữa bệnh',
  MEDICAL_EXPENSE_INVOICE: 'Hóa đơn viện phí - y tế',
  EDUCATION_RECEIPT: 'Biên lai học phí - đào tạo',
  EDUCATION_EXPENSE_INVOICE: 'Hóa đơn học phí - giáo dục',
  TUITION_FEE_RECEIPT: 'Biên lai nộp học phí',
  DONATION_RECEIPT: 'Chứng từ đóng góp từ thiện, nhân đạo',
  CHARITY_DONATION_RECEIPT: 'Biên lai quyên góp từ thiện, nhân đạo',
  DONATION_VOUCHER: 'Chứng từ từ thiện - đóng góp',
  WITHHOLDING_VOUCHER: 'Chứng từ khấu trừ thuế thu nhập cá nhân',
  PIT_WITHHOLDING_CERT: 'Chứng từ khấu trừ thuế thu nhập cá nhân',
  VAT_INVOICE: 'Hóa đơn giá trị gia tăng',
  INVOICE_VAT: 'Hóa đơn giá trị gia tăng',
  SALES_INVOICE: 'Hóa đơn bán hàng trực tiếp',
  INSURANCE_PREMIUM_RECEIPT: 'Biên lai bảo hiểm nhân thọ / hưu trí tự nguyện',
  GENERAL_EXPENSE: 'Chứng từ chi phí chung',
  INCOME_PAYSLIP: 'Phiếu lương & Xác nhận thu nhập',
  PAYSLIP: 'Phiếu lương hàng tháng',
  CITIZEN_ID: 'Căn cước công dân người phụ thuộc',
  CCCD: 'Thẻ Căn cước công dân',
  BIRTH_CERTIFICATE: 'Giấy khai sinh người phụ thuộc',
  STUDENT_CARD: 'Thẻ học sinh / sinh viên',
  DISABILITY_CERTIFICATE: 'Giấy xác nhận khuyết tật',
  MARRIAGE_CERTIFICATE: 'Giấy chứng nhận kết hôn',
  RELATIONSHIP_CERTIFICATE: 'Giấy xác nhận quan hệ gia đình',
  RESIDENCE_CT07: 'Giấy xác nhận thông tin về cư trú (Mẫu CT07)',
  SUPPORT_COMMITMENT_FORM: 'Bản cam kết nghĩa vụ nuôi dưỡng',
  EXPERT_CERTIFICATE: 'Chứng chỉ hành nghề chuyên gia',
  TAX_AGENT: 'Chứng chỉ hành nghề dịch vụ làm thủ tục về thuế',
  CPA: 'Chứng chỉ Kiểm toán viên',
  ACCOUNTANT: 'Chứng chỉ hành nghề Kế toán viên',
  CHIEF_ACCOUNTANT: 'Chứng chỉ bồi dưỡng Kế toán trưởng',
  OTHER: 'Giấy tờ, chứng từ khác',
}

export function formatDocTypeCode(code) {
  const upper = String(code || '').trim().toUpperCase()
  if (!upper) return '—'
  return DOCUMENT_SUFFIX_LABELS[upper] || upper.replace(/_/g, ' ')
}

const SPECIFIC_CONFIG_MAP = {
  AI_CONFIDENCE_THRESHOLD: {
    title: 'Độ chính xác nhận diện tối thiểu chung',
    category: 'Tiêu chuẩn toàn hệ thống',
    icon: 'verified',
    descriptionGuide:
      'Mức độ rõ nét và chính xác tối thiểu áp dụng cho tất cả các loại hồ sơ, chứng từ chưa có quy định riêng.',
  },
  CRUCIAL_EXTRACTION_FIELDS: {
    title: 'Các thông tin bắt buộc trên hóa đơn chung',
    category: 'Kiểm soát thông tin bắt buộc',
    icon: 'fact_check',
    descriptionGuide:
      'Danh sách các thông tin bắt buộc phải rõ ràng trên chứng từ. Nếu thiếu hoặc mờ, hồ sơ sẽ chuyển sang rà soát trực tiếp.',
  },
  MEDICAL_STATEMENT_AMOUNT_TOLERANCE: {
    title: 'Mức sai số số tiền cho phép khi đối chiếu bảng kê y tế',
    category: 'Tiêu chuẩn toàn hệ thống',
    icon: 'payments',
    isCurrencyAmount: true,
    descriptionGuide:
      'Mức chênh lệch làm tròn tối đa cho phép (tính bằng VNĐ) khi đối chiếu tổng tiền giữa hóa đơn viện phí và bảng kê chi tiết.',
  },
  AUTO_CONFIRM_ON_PASSED: {
    title: 'Tự động phê duyệt chứng từ khi đạt chuẩn',
    category: 'Quy trình xét duyệt',
    icon: 'task_alt',
    descriptionGuide:
      'Tự động ghi nhận chứng từ hợp lệ khi toàn bộ thông tin bắt buộc đều đạt mức độ chính xác theo quy định.',
  },
}

/**
 * Ánh xạ toàn bộ mã cấu hình từ Backend sang tên gọi nghiệp vụ tiếng Việt chuẩn văn phòng
 */
export function getConfigFriendlyInfo(key) {
  const upper = String(key || '').trim().toUpperCase()
  const baseStyle = {
    iconColor: 'text-on-surface-variant',
    badgeClass: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
  }

  if (SPECIFIC_CONFIG_MAP[upper]) {
    return {
      ...baseStyle,
      ...SPECIFIC_CONFIG_MAP[upper],
    }
  }

  if (upper.startsWith('THRESHOLD_')) {
    const suffix = upper.replace(/^THRESHOLD_/, '')
    const docLabel = DOCUMENT_SUFFIX_LABELS[suffix] || suffix.replace(/_/g, ' ')
    const isDependentDoc = [
      'CITIZEN_ID',
      'CCCD',
      'BIRTH_CERTIFICATE',
      'STUDENT_CARD',
      'DISABILITY_CERTIFICATE',
      'MARRIAGE_CERTIFICATE',
      'RELATIONSHIP_CERTIFICATE',
      'RESIDENCE_CT07',
      'SUPPORT_COMMITMENT_FORM',
    ].includes(suffix)
    const isCertDoc = [
      'EXPERT_CERTIFICATE',
      'TAX_AGENT',
      'CPA',
      'ACCOUNTANT',
      'CHIEF_ACCOUNTANT',
    ].includes(suffix)

    return {
      ...baseStyle,
      title: `Độ chính xác yêu cầu: ${docLabel}`,
      category: isDependentDoc
        ? 'Hồ sơ người phụ thuộc'
        : isCertDoc
        ? 'Hồ sơ chứng chỉ chuyên gia'
        : 'Chứng từ thuế & giảm trừ',
      icon: isDependentDoc ? 'badge' : isCertDoc ? 'workspace_premium' : 'receipt_long',
      descriptionGuide: `Mức độ rõ nét và chính xác tối thiểu khi kiểm tra ${docLabel.toLowerCase()}.`,
    }
  }

  if (upper.startsWith('CRUCIAL_FIELDS_')) {
    const suffix = upper.replace(/^CRUCIAL_FIELDS_/, '')
    const docLabel = DOCUMENT_SUFFIX_LABELS[suffix] || suffix.replace(/_/g, ' ')
    return {
      ...baseStyle,
      title: `Thông tin bắt buộc trên: ${docLabel}`,
      category: 'Kiểm soát thông tin bắt buộc',
      icon: 'fact_check',
      descriptionGuide: `Các mục thông tin bắt buộc phải đầy đủ và rõ nét khi kiểm tra ${docLabel.toLowerCase()}.`,
    }
  }

  return {
    ...baseStyle,
    title: DOCUMENT_SUFFIX_LABELS[upper] || 'Thông số kiểm tra bổ sung',
    category: 'Tham số vận hành',
    icon: 'tune',
    descriptionGuide: 'Thông số quy định kiểm tra và vận hành hệ thống.',
  }
}

/**
 * Từ điển ánh xạ mã Nhà cung cấp & Trạng thái khóa kết nối từ Backend (AiProvider, AiKeyStatus)
 */
export const AI_PROVIDER_LABELS = {
  GEMINI: 'Google Gemini',
  OPENAI: 'OpenAI',
  CLAUDE: 'Anthropic Claude',
  ANTHROPIC: 'Anthropic Claude',
  DEEPSEEK: 'DeepSeek',
}

export function formatAiProvider(provider) {
  const upper = String(provider || '').trim().toUpperCase()
  return AI_PROVIDER_LABELS[upper] || provider || 'Google Gemini'
}

export const AI_KEY_STATUS_MAP = {
  ACTIVE: {
    label: 'Đang hoạt động',
    dotClass: 'bg-emerald-600',
  },
  QUOTA_EXCEEDED: {
    label: 'Vượt hạn mức trong ngày',
    dotClass: 'bg-amber-600',
  },
  COOLDOWN: {
    label: 'Đang tạm nghỉ chờ',
    dotClass: 'bg-amber-600',
  },
  EXHAUSTED: {
    label: 'Đã hết hạn mức',
    dotClass: 'bg-amber-600',
  },
  RATE_LIMITED: {
    label: 'Giới hạn tần suất sử dụng',
    dotClass: 'bg-amber-600',
  },
  INVALID: {
    label: 'Khóa không hợp lệ',
    dotClass: 'bg-red-600',
  },
  REVOKED: {
    label: 'Đã thu hồi',
    dotClass: 'bg-red-600',
  },
  DISABLED: {
    label: 'Đã tạm dừng',
    dotClass: 'bg-stone-400',
  },
}

export function getAiKeyStatusInfo(status, isActive = true) {
  if (!isActive) {
    return {
      label: 'Đang tạm dừng',
      dotClass: 'bg-stone-400',
    }
  }
  const upper = String(status || 'ACTIVE').trim().toUpperCase()
  return (
    AI_KEY_STATUS_MAP[upper] || {
      label: 'Chưa xác định',
      dotClass: 'bg-stone-400',
    }
  )
}

/**
 * Từ điển ánh xạ mã Mẫu chỉ dẫn nghiệp vụ (prompt_key) và tham số động (variables) từ Backend
 */
export const PROMPT_KEY_LABELS = {
  PROMPT_TAX_CHAT_ADVISORY: 'Tư vấn quy định thuế thu nhập cá nhân & tiền lương',
  PROMPT_EXPENSE_OCR: 'Phân loại và trích xuất hóa đơn chi phí giảm trừ thuế',
  PROMPT_MEDICAL_STATEMENT_RULES: 'Quy tắc đối chiếu bảng kê chi phí khám chữa bệnh',
  PROMPT_MEDICAL_STATEMENT_OCR: 'Trích xuất chi tiết bảng kê chi phí khám chữa bệnh',
  PROMPT_INCOME_OCR: 'Trích xuất phiếu lương và chứng từ thu nhập chịu thuế',
  PROMPT_DEPENDENT_OCR: 'Thẩm định hồ sơ chứng minh người phụ thuộc',
  PROMPT_CERTIFICATE_OCR: 'Thẩm định văn bằng, chứng chỉ hành nghề chuyên gia',
  PROMPT_TAX_RULE_EXTRACTION: 'Trích xuất quy tắc thuế từ văn bản pháp quy',
}

export function formatPromptKeyLabel(promptKey) {
  const upper = String(promptKey || '').trim().toUpperCase()
  return PROMPT_KEY_LABELS[upper] || 'Mẫu chỉ dẫn nghiệp vụ bổ sung'
}

export const PROMPT_VARIABLE_LABELS = {
  tax_year_label: 'Kỳ tính thuế',
  knowledge_base: 'Cơ sở dữ liệu văn bản luật thuế',
  categories_text: 'Danh mục loại chứng từ hợp lệ',
  medical_statement_rules: 'Quy tắc bảng kê chi phí y tế',
  medical_doc_type_code: 'Phân loại chứng từ y tế',
  medical_categories_guide: 'Danh mục khoản mục chi phí y tế',
  target_year_instruction: 'Năm quyết toán mục tiêu',
  dependent_rules_text: 'Quy định hồ sơ người phụ thuộc',
  allowed_types_guide: 'Danh mục loại chứng chỉ hành nghề',
  tax_year: 'Năm tính thuế',
  default_set_name: 'Tên bộ quy tắc thuế',
  source_url: 'Đường dẫn nguồn văn bản',
  legal_doc_name: 'Tên văn bản pháp quy',
  user_name: 'Họ tên người nộp thuế',
  tax_id: 'Mã số thuế',
  annual_income: 'Thu nhập năm',
  dependents_count: 'Số người phụ thuộc',
  document_type: 'Loại chứng từ',
  policy_reference: 'Căn cứ pháp lý',
  query: 'Nội dung câu hỏi',
}

export function formatPromptVariableLabel(varName) {
  const clean = String(varName || '').trim().replace(/^\{+|\}+$/g, '')
  if (!clean) return ''
  return PROMPT_VARIABLE_LABELS[clean] || clean.replace(/_/g, ' ')
}
