import axios from 'axios'

export const MANAGEMENT_API_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_MANAGEMENT_API_URL ||
  'http://localhost:5000'

export const apiClient = axios.create({
  baseURL: MANAGEMENT_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Tự động đính kèm JWT Bearer Token
apiClient.interceptors.request.use(
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

// Response Interceptor: Chuẩn hóa dữ liệu trả về và xử lý lỗi xác thực
apiClient.interceptors.response.use(
  (response) => {
    // Trả về trực tiếp body từ BE (ApiResponse<T>)
    return response.data
  },
  (error) => {
    const status = error.response?.status
    const data = error.response?.data

    let friendlyMessage = 'Đã có lỗi xảy ra khi kết nối máy chủ.'

    if (!error.response) {
      friendlyMessage = `Không thể kết nối tới máy chủ Backend tại ${MANAGEMENT_API_URL}. Vui lòng kiểm tra lại dịch vụ Backend.`
    } else if (data?.message) {
      friendlyMessage = data.message
    } else if (data?.title) {
      friendlyMessage = data.title
    } else if (typeof data === 'string') {
      friendlyMessage = data
    } else if (status === 401) {
      friendlyMessage = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.'
    } else if (status === 403) {
      friendlyMessage = 'Bạn không có quyền thực hiện thao tác này.'
    } else if (status === 404) {
      friendlyMessage = 'Không tìm thấy tài nguyên yêu cầu.'
    } else if (status >= 500) {
      friendlyMessage = 'Máy chủ Backend gặp sự cố nội bộ. Vui lòng thử lại sau.'
    }

    const customError = new Error(friendlyMessage)
    customError.status = status
    customError.data = data
    customError.errors = data?.errors

    // Nếu bị 401 Unauthorized do token hết hạn/bị thu hồi, xóa token lưu cục bộ
    if (status === 401) {
      localStorage.removeItem('taxkeep_token')
      localStorage.removeItem('taxkeep_user')
      sessionStorage.removeItem('taxkeep_token')
      sessionStorage.removeItem('taxkeep_user')
    }

    return Promise.reject(customError)
  }
)
