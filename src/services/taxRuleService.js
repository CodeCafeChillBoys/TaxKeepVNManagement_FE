import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s cho xử lý PDF và Gemini 2.5 Flash
})

// Request Interceptor: Tự động đính kèm JWT Bearer Token nếu có
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('taxkeep_token') ||
      sessionStorage.getItem('taxkeep_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Phân tích và chuẩn hóa lỗi trả về từ Backend AI Service
 * @param {any} error - Đối tượng lỗi từ axios hoặc mạng
 * @returns {Error} - Đối tượng Error mở rộng chứa title, status, rawMessage, field, suggestion
 */
export function parseApiError(error) {
  const status = error.response?.status || 0
  const data = error.response?.data || {}
  const rawMsg =
    data.message ||
    data.TaxYear ||
    data.SourceUrl ||
    (typeof data.detail === 'string'
      ? data.detail
      : Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join('; ')
      : null) ||
    error.message ||
    'Đã có lỗi xảy ra khi kết nối máy chủ.'

  let friendlyMessage = rawMsg
  let field = null
  let title = 'Thông báo hệ thống'
  let suggestion = ''

  if (!error.response) {
    title = 'Không thể kết nối máy chủ'
    friendlyMessage =
      'Không thể gửi yêu cầu tới máy chủ xử lý văn bản. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.'
    suggestion = 'Vui lòng liên hệ quản trị viên để kiểm tra trạng thái dịch vụ.'
  } else if (status === 409) {
    title = 'Trùng lặp dữ liệu năm tính thuế'
    if (
      rawMsg.includes('tax year already exists') ||
      rawMsg.includes('TAX_RULE_SET_EXISTS')
    ) {
      field = 'taxYear'
      friendlyMessage =
        'Năm tính thuế này đã có bộ quy tắc thuế tồn tại trên hệ thống.'
      suggestion =
        'Khắc phục: Vui lòng thay đổi Năm tính thuế sang năm khác (ví dụ: 2025, 2027) hoặc cập nhật bộ quy tắc hiện có.'
    } else if (
      rawMsg.includes('rule code already exists') ||
      rawMsg.includes('ruleCode') ||
      rawMsg.includes('Duplicate ruleCode')
    ) {
      friendlyMessage =
        'Mã quy tắc thuế trích xuất từ văn bản bị trùng lặp với quy tắc đã có trên hệ thống.'
      suggestion =
        'Khắc phục: Kiểm tra lại các điều khoản trong văn bản hoặc cập nhật quy tắc hiện có.'
    } else if (rawMsg.includes('name already exists')) {
      field = 'name'
      friendlyMessage = 'Tên bộ quy tắc thuế này đã tồn tại trên hệ thống.'
      suggestion = 'Khắc phục: Vui lòng nhập tên văn bản quy phạm khác để phân biệt.'
    } else {
      friendlyMessage =
        'Dữ liệu văn bản hoặc quy tắc gửi lên bị trùng lặp với dữ liệu hiện có trên hệ thống.'
      suggestion = 'Khắc phục: Vui lòng kiểm tra lại thông tin gửi lên hoặc chọn năm khác.'
    }
  } else if (status === 400) {
    title = 'Thông tin chưa hợp lệ'
    if (rawMsg.includes('adminId')) {
      field = 'adminId'
      friendlyMessage = 'Mã định danh quản trị viên không hợp lệ.'
      suggestion = 'Khắc phục: Vui lòng đăng nhập lại tài khoản quản trị viên.'
    } else if (
      data.TaxYear ||
      rawMsg.includes('TaxYear') ||
      rawMsg.includes('Tax year must be a valid year')
    ) {
      field = 'taxYear'
      friendlyMessage =
        'Năm tính thuế không hợp lệ. Vui lòng nhập số năm hợp lệ từ 1900 đến 2100.'
    } else if (data.SourceUrl || rawMsg.includes('SourceUrl')) {
      field = 'sourceUrl'
      friendlyMessage =
        'Nguồn văn bản không đúng định dạng liên kết (phải bắt đầu bằng http:// hoặc https://).'
    } else if (rawMsg.includes('PDF') || rawMsg.includes('file')) {
      field = 'file'
      friendlyMessage = rawMsg.includes('exceed')
        ? 'Dung lượng tệp PDF vượt quá giới hạn tối đa 20 MB.'
        : 'Tệp tải lên không hợp lệ hoặc không đúng định dạng PDF.'
    } else if (rawMsg.includes('No tax rule information could be extracted')) {
      friendlyMessage =
        'Không thể trích xuất quy tắc thuế nào từ văn bản PDF. Tệp có thể là trang trắng, bản quét mờ hoặc không chứa điều khoản thuế.'
      suggestion = 'Khắc phục: Thử lại với tài liệu PDF có nội dung văn bản rõ ràng.'
    } else if (rawMsg.includes('Some required tax rule fields could not be extracted')) {
      friendlyMessage =
        'Hệ thống không trích xuất đủ các trường quy tắc thuế bắt buộc từ văn bản.'
      suggestion = 'Khắc phục: Kiểm tra lại văn bản có đầy đủ biểu thuế hoặc điều kiện người phụ thuộc không.'
    } else if (
      rawMsg.includes('StringDataRightTruncation') ||
      rawMsg.includes('value too long for type character varying') ||
      rawMsg.includes('character varying')
    ) {
      title = 'Dữ liệu văn bản vượt quá quy định'
      friendlyMessage =
        'Tên hoặc nội dung một quy tắc do hệ thống trích xuất từ văn bản dài hơn quy định chuẩn.'
      suggestion =
        'Khắc phục: Vui lòng kiểm tra lại văn bản nguồn hoặc liên hệ quản trị viên để chuẩn hóa cấu trúc dữ liệu.'
    }
  } else if (status === 404) {
    title = 'Không tìm thấy dữ liệu'
    friendlyMessage = 'Bộ quy tắc thuế hoặc tài liệu yêu cầu không tồn tại trên hệ thống.'
  } else if (status === 500) {
    title = 'Sự cố xử lý hệ thống'
    friendlyMessage =
      'Hệ thống gặp sự cố trong quá trình phân tích văn bản hoặc cập nhật quy tắc thuế.'
    suggestion = 'Khắc phục: Vui lòng thử lại sau giây lát hoặc kiểm tra tính hợp lệ của tệp văn bản.'
  }

  const err = new Error(friendlyMessage, { cause: error })
  err.title = title
  err.status = status
  err.rawMessage = rawMsg
  err.field = field
  err.suggestion = suggestion
  err.data = data
  return err
}

/**
 * Phân giải adminId từ bộ nhớ cục bộ hoặc JWT token
 * @returns {string|null}
 */
export function getStoredAdminId() {
  try {
    const rawUser =
      localStorage.getItem('taxkeep_user') ||
      sessionStorage.getItem('taxkeep_user')
    if (rawUser) {
      const parsed = JSON.parse(rawUser)
      if (parsed.userId || parsed.id) return parsed.userId || parsed.id
    }
    const token =
      localStorage.getItem('taxkeep_token') ||
      sessionStorage.getItem('taxkeep_token')
    if (token) {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        )
        return (
          payload.nameid ||
          payload.sub ||
          payload.adminId ||
          payload.userId ||
          null
        )
      }
    }
  } catch {
    // Bỏ qua nếu giải mã thất bại
  }
  return null
}

export const taxRuleService = {
  /**
   * Upload tệp PDF và kích hoạt bóc tách AI
   * @param {File} file - Tệp PDF
   * @param {number|string} taxYear - Năm tính thuế
   * @param {string} [name] - Tên văn bản quy phạm
   * @param {string} [sourceUrl] - Đường dẫn nguồn văn bản
   * @param {string} [adminId] - UUID định danh Admin khởi tạo
   */
  uploadDocument: async (file, taxYear, name, sourceUrl, adminId = null) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taxYear', String(taxYear))
    if (name?.trim()) formData.append('name', name.trim())
    if (sourceUrl?.trim()) formData.append('sourceUrl', sourceUrl.trim())

    const resolvedAdminId = adminId || getStoredAdminId()
    if (resolvedAdminId) {
      formData.append('adminId', String(resolvedAdminId).trim())
    }

    try {
      const response = await api.post('/api/tax-rules/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },

  /**
   * Lấy danh sách tất cả các bộ quy tắc thuế đã lưu trong CSDL
   * @returns {Promise<Array>}
   */
  getAllRuleSets: async () => {
    try {
      const response = await api.get('/api/tax-rules')
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },

  /**
   * Lấy chi tiết bộ quy tắc thuế theo năm tính thuế
   * @param {number|string} taxYear
   * @returns {Promise<Object>}
   */
  getRuleSetByYear: async (taxYear) => {
    try {
      const response = await api.get(`/api/tax-rules/year/${taxYear}`)
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },

  /**
   * Lấy chi tiết toàn bộ nội dung của bộ quy tắc thuế (Tax Rule Set, Rules & Dependent Rules)
   * @param {string} ruleSetId - UUID của bộ quy tắc thuế
   * @returns {Promise<Object>}
   */
  getRuleSetDetail: async (ruleSetId) => {
    try {
      const response = await api.get(`/api/tax-rules/${ruleSetId}`)
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },

  /**
   * Cập nhật thông tin bộ quy tắc thuế, năm tính thuế hoặc các quy tắc con
   * @param {string} ruleSetId - UUID của bộ quy tắc thuế
   * @param {Object} payload - Dữ liệu cập nhật { name, taxYear, effectiveFrom, effectiveTo, status, taxRules, dependentRules }
   * @returns {Promise<Object>}
   */
  updateRuleSet: async (ruleSetId, payload) => {
    try {
      const response = await api.put(`/api/tax-rules/${ruleSetId}`, payload)
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },

  /**
   * Phê duyệt TaxRuleSet sang Active
   * @param {string} ruleSetId - UUID của bộ quy tắc thuế
   * @param {string} [adminId] - UUID của Quản trị viên phê duyệt
   */
  approveRuleSet: async (ruleSetId, adminId = null) => {
    const resolvedAdminId = adminId || getStoredAdminId()
    const payload = resolvedAdminId ? { adminId: resolvedAdminId } : {}
    try {
      const response = await api.post(`/api/tax-rules/${ruleSetId}/approve`, payload)
      return response.data
    } catch (error) {
      if (error.response?.status === 404 || !error.response) {
        try {
          const fallbackRes = await api.post(`/api/admin/tax-rules/${ruleSetId}/approve`, payload)
          return fallbackRes.data
        } catch {
          // Bỏ qua fallback lỗi, tiếp tục ném lỗi gốc
        }
      }
      throw parseApiError(error)
    }
  },
}
