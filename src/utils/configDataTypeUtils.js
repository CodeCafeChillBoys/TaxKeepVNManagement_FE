/**
 * Tiện ích phân loại và hiển thị dữ liệu cấu hình hệ thống & tiêu chuẩn kiểm tra hóa đơn
 * Không sử dụng thuật ngữ thuần IT, thân thiện với người dùng quản trị / kế toán thuế
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
  THRESHOLD_MEDICAL_EXPENSE_INVOICE: 2,
  THRESHOLD_EDUCATION_EXPENSE_INVOICE: 3,
  THRESHOLD_DONATION_VOUCHER: 4,
  CRUCIAL_EXTRACTION_FIELDS: 5,
  AUTO_CONFIRM_ON_PASSED: 6,
}

/**
 * Tự động nhận diện phân loại giá trị khi người dùng nhập liệu
 * @param {string} value - Chuỗi giá trị nhập vào
 * @returns {string} - Tên phân loại (ConfigDataType)
 */
export function detectDataType(value) {
  if (value === undefined || value === null) return ConfigDataType.STRING
  const val = String(value).trim()
  const lower = val.toLowerCase()

  // 1. Bật / Tắt: true / false
  if (lower === 'true' || lower === 'false') {
    return ConfigDataType.BOOLEAN
  }

  // 2. Số lượng nguyên (dương hoặc âm)
  if (/^-?\d+$/.test(val)) {
    return ConfigDataType.INT
  }

  // 3. Số thập phân / Tỷ lệ (hỗ trợ cả dấu chấm . và dấu phẩy ,)
  const normalizedFloat = val.replace(',', '.')
  if (/^-?\d+\.\d+$/.test(normalizedFloat)) {
    return ConfigDataType.FLOAT
  }

  // 4. Định dạng nâng cao (JSON)
  if (
    (val.startsWith('{') && val.endsWith('}')) ||
    (val.startsWith('[') && val.endsWith(']'))
  ) {
    try {
      JSON.parse(val)
      return ConfigDataType.JSON
    } catch {
      // Bỏ qua nếu không đúng cú pháp JSON
    }
  }

  // 5. Danh sách mục phân tách bằng dấu phẩy
  if (val.includes(',')) {
    return ConfigDataType.LIST_STRING
  }

  // 6. Mặc định là Văn bản
  return ConfigDataType.STRING
}

/**
 * Thông tin định danh thân thiện cho các phân loại thiết lập (thay cho thuật ngữ IT như FLOAT, BOOLEAN, JSON...)
 */
export const DATA_TYPE_META = {
  [ConfigDataType.FLOAT]: {
    label: 'Độ chính xác / Tỷ lệ',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    icon: 'percent',
    hint: 'Mức độ chính xác khi quét hóa đơn (từ 0 đến 1, ví dụ 0.85 = 85%)',
  },
  [ConfigDataType.BOOLEAN]: {
    label: 'Bật / Tắt',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
    icon: 'toggle_on',
    hint: 'Kích hoạt hoặc ngắt áp dụng tính năng (Bật hoặc Tắt)',
  },
  [ConfigDataType.LIST_STRING]: {
    label: 'Danh sách mục kiểm tra',
    badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
    icon: 'checklist',
    hint: 'Danh mục các trường thông tin cần kiểm tra, phân tách bởi dấu phẩy',
  },
  [ConfigDataType.INT]: {
    label: 'Số lượng / Chỉ số',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25',
    icon: 'tag',
    hint: 'Số lượng hoặc chỉ số nguyên (Ví dụ: 1, 5, 2026)',
  },
  [ConfigDataType.STRING]: {
    label: 'Văn bản',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25',
    icon: 'short_text',
    hint: 'Văn bản hướng dẫn hoặc ghi chú thông thường',
  },
  [ConfigDataType.JSON]: {
    label: 'Thiết lập chi tiết',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25',
    icon: 'dataset',
    hint: 'Cấu hình chi tiết có cấu trúc',
  },
}

/**
 * Từ điển dịch các trường thông tin trên chứng từ sang tiếng Việt ngắn gọn, chuyên nghiệp
 */
export const FIELD_LABELS = {
  total_amount: 'Tổng tiền',
  seller_tax_code: 'MST bên bán',
  buyer_id_card: 'CCCD / MST mua',
  invoice_number: 'Số hóa đơn',
  invoice_date: 'Ngày hóa đơn',
  seller_name: 'Đơn vị bán',
  buyer_name: 'Người mua',
  tax_amount: 'Tiền thuế',
  total_before_tax: 'Trước thuế',
}

/**
 * Ánh xạ mã tham số kỹ thuật sang tên gọi nghiệp vụ và phân loại thân thiện
 * Giúp giao diện rõ ràng, chuyên nghiệp cho người dùng quản trị và kế toán
 */
export function getConfigFriendlyInfo(key) {
  const upper = String(key || '').trim().toUpperCase()

  if (upper === 'AI_CONFIDENCE_THRESHOLD') {
    return {
      title: 'Độ chính xác nhận diện tối thiểu chung',
      category: 'Tiêu chuẩn toàn hệ thống',
      icon: 'verified',
      iconColor: 'text-secondary',
      badgeClass: 'bg-secondary/10 text-secondary border-secondary/20',
      descriptionGuide: 'Áp dụng cho tất cả các loại chứng từ chưa có quy định độ chính xác riêng.',
    }
  }

  if (upper === 'THRESHOLD_MEDICAL_EXPENSE_INVOICE') {
    return {
      title: 'Độ chính xác hóa đơn viện phí - y tế',
      category: 'Quy định theo loại chứng từ',
      icon: 'local_hospital',
      iconColor: 'text-emerald-600',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      descriptionGuide: 'Ưu tiên áp dụng riêng khi quét hóa đơn viện phí, thuốc và khám chữa bệnh.',
    }
  }

  if (upper === 'THRESHOLD_EDUCATION_EXPENSE_INVOICE') {
    return {
      title: 'Độ chính xác hóa đơn học phí - giáo dục',
      category: 'Quy định theo loại chứng từ',
      icon: 'school',
      iconColor: 'text-blue-600',
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      descriptionGuide: 'Ưu tiên áp dụng riêng khi quét biên lai và hóa đơn học phí đào tạo.',
    }
  }

  if (upper === 'THRESHOLD_DONATION_VOUCHER') {
    return {
      title: 'Độ chính xác chứng từ từ thiện - đóng góp',
      category: 'Quy định theo loại chứng từ',
      icon: 'volunteer_activism',
      iconColor: 'text-amber-600',
      badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      descriptionGuide: 'Ưu tiên áp dụng riêng khi quét chứng từ ủng hộ, đóng góp nhân đạo.',
    }
  }

  if (upper === 'CRUCIAL_EXTRACTION_FIELDS') {
    return {
      title: 'Các thông tin bắt buộc trên chứng từ',
      category: 'Kiểm soát an toàn thuế',
      icon: 'fact_check',
      iconColor: 'text-purple-600',
      badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
      descriptionGuide: 'Bắt buộc các thông tin này phải rõ nét. Nếu có mục nào chưa rõ, hệ thống sẽ yêu cầu kiểm tra thủ công.',
    }
  }

  if (upper === 'AUTO_CONFIRM_ON_PASSED') {
    return {
      title: 'Tự động duyệt chứng từ khi đạt chuẩn',
      category: 'Quy trình tự động hóa',
      icon: 'task_alt',
      iconColor: 'text-teal-600',
      badgeClass: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
      descriptionGuide: 'Tự động chấp thuận chứng từ hợp lệ khi toàn bộ thông tin cốt lõi đều đạt mức độ chính xác.',
    }
  }

  // Trường hợp tham số tùy chỉnh thêm mới
  if (upper.startsWith('THRESHOLD_')) {
    const customSuffix = upper.replace('THRESHOLD_', '').replace(/_/g, ' ')
    return {
      title: `Độ chính xác chứng từ: ${customSuffix}`,
      category: 'Quy định theo loại chứng từ',
      icon: 'rule',
      iconColor: 'text-primary',
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
      descriptionGuide: 'Ngưỡng kiểm tra riêng biệt cho loại chứng từ này.',
    }
  }

  return {
    title: upper.replace(/_/g, ' '),
    category: 'Tham số vận hành',
    icon: 'tune',
    iconColor: 'text-slate-600',
    badgeClass: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    descriptionGuide: 'Thông số cấu hình vận hành hệ thống.',
  }
}
