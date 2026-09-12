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
  let title = `Lỗi hệ thống (${status || 'Network'})`
  let suggestion = ''

  if (!error.response) {
    title = 'Không thể kết nối máy chủ Backend AI'
    friendlyMessage =
      'Không thể gửi yêu cầu tới máy chủ AI Service tại ' +
      API_BASE_URL +
      '. Vui lòng kiểm tra lại dịch vụ Backend.'
    suggestion = 'Đảm bảo terminal backend đang chạy: python -m uvicorn app.main:app --reload'
  } else if (status === 409) {
    title = 'Xung đột dữ liệu (Mã lỗi 409 - Conflict)'
    if (
      rawMsg.includes('tax year already exists') ||
      rawMsg.includes('TAX_RULE_SET_EXISTS')
    ) {
      field = 'taxYear'
      friendlyMessage =
        'Năm tính thuế này đã có bộ quy tắc thuế tồn tại trong cơ sở dữ liệu hệ thống.'
      suggestion =
        'Khắc phục: Vui lòng thay đổi Năm tính thuế sang năm khác (ví dụ: 2025, 2027) hoặc xóa bộ quy tắc trùng lặp trong CSDL trước khi gửi lại.'
    } else if (
      rawMsg.includes('rule code already exists') ||
      rawMsg.includes('ruleCode') ||
      rawMsg.includes('Duplicate ruleCode')
    ) {
      friendlyMessage =
        'Mã quy tắc thuế trích xuất từ văn bản bị trùng lặp với quy tắc đã có trong cơ sở dữ liệu.'
      suggestion =
        'Khắc phục: Kiểm tra lại các điều khoản trong văn bản hoặc cập nhật cơ sở dữ liệu.'
    } else if (rawMsg.includes('name already exists')) {
      field = 'name'
      friendlyMessage = 'Tên bộ quy tắc thuế này đã tồn tại trong hệ thống.'
      suggestion = 'Khắc phục: Vui lòng nhập tên văn bản quy phạm khác để phân biệt.'
    } else {
      friendlyMessage =
        'Dữ liệu văn bản hoặc quy tắc gửi lên bị xung đột với dữ liệu hiện có trong CSDL.'
      suggestion = 'Khắc phục: Vui lòng kiểm tra lại thông tin gửi lên hoặc chọn năm khác.'
    }
  } else if (status === 400) {
    title = 'Yêu cầu không hợp lệ (Mã lỗi 400 - Bad Request)'
    if (rawMsg.includes('adminId')) {
      field = 'adminId'
      friendlyMessage = 'Mã định danh Admin (adminId) không đúng định dạng UUID hợp lệ.'
      suggestion = 'Khắc phục: Đảm bảo tài khoản Quản trị viên đăng nhập có UUID hợp lệ.'
    } else if (
      data.TaxYear ||
      rawMsg.includes('TaxYear') ||
      rawMsg.includes('Tax year must be a valid year')
    ) {
      field = 'taxYear'
      friendlyMessage =
        'Năm tính thuế không hợp lệ. Vui lòng nhập số nguyên hợp lệ từ 1900 đến 2100.'
    } else if (data.SourceUrl || rawMsg.includes('SourceUrl')) {
      field = 'sourceUrl'
      friendlyMessage =
        'Nguồn văn bản không đúng định dạng URL (phải bắt đầu bằng http:// hoặc https://).'
    } else if (rawMsg.includes('PDF') || rawMsg.includes('file')) {
      field = 'file'
      friendlyMessage = rawMsg.includes('exceed')
        ? 'Dung lượng tệp PDF vượt quá giới hạn tối đa 20 MB.'
        : 'Tệp tải lên không hợp lệ hoặc không đúng định dạng PDF.'
    } else if (rawMsg.includes('No tax rule information could be extracted')) {
      friendlyMessage =
        'Không thể trích xuất quy tắc thuế nào từ văn bản PDF. Tệp có thể là trang trắng, scan mờ hoặc không chứa điều khoản thuế.'
      suggestion = 'Khắc phục: Thử lại với tài liệu PDF có nội dung văn bản rõ ràng.'
    } else if (rawMsg.includes('Some required tax rule fields could not be extracted')) {
      friendlyMessage =
        'AI không trích xuất đủ các trường quy tắc thuế bắt buộc từ văn bản.'
      suggestion = 'Khắc phục: Kiểm tra lại văn bản có đầy đủ biểu thuế hoặc điều kiện người phụ thuộc không.'
    }
  } else if (status === 404) {
    title = 'Không tìm thấy tài nguyên (Mã lỗi 404 - Not Found)'
    friendlyMessage = 'Bộ quy tắc thuế hoặc tài nguyên yêu cầu không tồn tại trong hệ thống.'
  } else if (status === 500) {
    title = 'Lỗi máy chủ nội bộ (Mã lỗi 500 - Server Error)'
    friendlyMessage =
      'Máy chủ Backend AI gặp sự cố trong quá trình phân tích văn bản hoặc truy vấn CSDL.'
    suggestion = 'Khắc phục: Kiểm tra terminal uvicorn để xem chi tiết log traceback.'
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

    // Tự động phân giải adminId nếu caller không truyền trực tiếp
    let resolvedAdminId = adminId
    if (!resolvedAdminId) {
      try {
        const rawUser =
          localStorage.getItem('taxkeep_user') ||
          sessionStorage.getItem('taxkeep_user')
        if (rawUser) {
          const parsed = JSON.parse(rawUser)
          resolvedAdminId = parsed.userId || parsed.id || null
        }
      } catch {
        // bỏ qua nếu parse lỗi
      }
    }

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
   * Phê duyệt TaxRuleSet sang Active
   * @param {string} ruleSetId - UUID của bộ quy tắc thuế
   */
  approveRuleSet: async (ruleSetId) => {
    try {
      const response = await api.post(`/api/tax-rules/${ruleSetId}/approve`)
      return response.data
    } catch (error) {
      throw parseApiError(error)
    }
  },
}
