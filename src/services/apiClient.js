import axios from 'axios'

export const MANAGEMENT_API_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_MANAGEMENT_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
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

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = 'Bearer ' + token 
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
    const isLoginRequest = error.config?.url?.includes('/auth/login')

    let friendlyMessage = 'Đã có lỗi xảy ra khi kết nối máy chủ.'

    if (!error.response) {
      friendlyMessage = 'Không thể kết nối tới máy chủ hệ thống. Vui lòng kiểm tra lại kết nối mạng.'
    } else if (data?.message) {
      friendlyMessage = data.message
    } else if (data?.title) {
      friendlyMessage = data.title
    } else if (typeof data === 'string' && data.trim()) {
      friendlyMessage = data.trim()
    } else if (status === 401) {
      friendlyMessage = isLoginRequest
        ? 'Số CCCD hoặc mật khẩu không chính xác.'
        : 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
    } else if (status === 403) {
      friendlyMessage = 'Bạn không có quyền truy cập vào tài nguyên hoặc chức năng này.'
    } else if (status === 404) {
      friendlyMessage = 'Không tìm thấy tài nguyên yêu cầu trên máy chủ.'
    } else if (status >= 500) {
      friendlyMessage = 'Máy chủ hệ thống gặp sự cố. Vui lòng thử lại sau.'
    }

    const customError = new Error(friendlyMessage)
    customError.status = status
    customError.data = data
    customError.errors = data?.errors
    customError.response = error.response

    // Nếu bị 401 Unauthorized do token hết hạn/bị thu hồi trên phiên đang hoạt động
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('taxkeep_token')
      localStorage.removeItem('taxkeep_user')
      sessionStorage.removeItem('taxkeep_token')
      sessionStorage.removeItem('taxkeep_user')

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taxkeep:unauthorized'))
      }
    }

    return Promise.reject(customError)
  }
)
