import { apiClient } from './apiClient'

const TOKEN_KEY = 'taxkeep_token'
const USER_KEY = 'taxkeep_user'

export const authService = {
  /**
   * Đăng nhập hệ thống bằng số CCCD và mật khẩu
   * @param {Object} credentials
   * @param {string} credentials.citizenId - Số CCCD (12 chữ số)
   * @param {string} credentials.password - Mật khẩu
   * @param {boolean} [rememberMe=false] - Ghi nhớ đăng nhập
   * @returns {Promise<{ token: string, userId: string, fullName: string, email: string, citizenId: string, userRole: string, isVerified: boolean }>}
   */
  login: async ({ citizenId, password, rememberMe = false }) => {
    const payload = {
      citizenId: citizenId.trim(),
      password,
    }

    const response = await apiClient.post('/api/auth/login', payload)

    // Chuẩn hóa dữ liệu trả về từ ApiResponse<AuthResponse>
    const rawData = response?.data || response
    const token = rawData?.token || response?.token

    const authData = {
      ...rawData,
      token,
      userId: rawData?.userId || rawData?.id,
      id: rawData?.userId || rawData?.id,
      role: rawData?.userRole || rawData?.role,
    }

    if (token) {
      authService.saveAuthData(token, authData, rememberMe)
    }

    return authData
  },

  /**
   * Đăng ký tài khoản người nộp thuế mới
   * @param {Object} registerData
   * @param {string} registerData.citizenId - Số CCCD (12 số)
   * @param {string} registerData.fullName - Họ và tên
   * @param {string} registerData.email - Email
   * @param {string} registerData.password - Mật khẩu (ít nhất 8 ký tự)
   * @param {string} [registerData.phoneNumber] - Số điện thoại
   * @param {string} [registerData.address] - Địa chỉ
   * @param {string} [registerData.dateOfBirth] - Ngày sinh (YYYY-MM-DD)
   */
  register: async (registerData) => {
    const payload = {
      citizenId: registerData.citizenId?.trim(),
      fullName: registerData.fullName?.trim(),
      email: registerData.email?.trim(),
      password: registerData.password,
      phoneNumber: registerData.phoneNumber?.trim() || null,
      address: registerData.address?.trim() || null,
      dateOfBirth: registerData.dateOfBirth || null,
    }

    const response = await apiClient.post('/api/auth/register', payload)
    return response?.data || response
  },

  /**
   * Đăng xuất khỏi hệ thống & thu hồi JWT token trên BE
   */
  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout')
    } catch (err) {
      console.warn('Lỗi khi gọi API logout trên server:', err)
    } finally {
      authService.clearAuth()
    }
  },

  /**
   * Đổi mật khẩu người dùng (yêu cầu ConfirmNewPassword theo DTO BE)
   * @param {Object} data
   * @param {string} data.currentPassword
   * @param {string} data.newPassword
   * @param {string} [data.confirmNewPassword]
   */
  changePassword: async ({ currentPassword, newPassword, confirmNewPassword }) => {
    const payload = {
      currentPassword,
      newPassword,
      confirmNewPassword: confirmNewPassword || newPassword,
    }
    const response = await apiClient.put('/api/auth/change-password', payload)
    return response?.data || response
  },

  /**
   * Lấy thông tin hồ sơ cá nhân của người dùng đang đăng nhập
   */
  getProfile: async () => {
    const response = await apiClient.get('/api/profile')
    return response.data
  },

  /**
   * Cập nhật hồ sơ cá nhân
   * @param {Object} profileData
   */
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/api/profile', profileData)
    return response.data
  },

  /**
   * Lưu token và user info vào Storage (localStorage hoặc sessionStorage)
   */
  saveAuthData: (token, user, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage
    // Xóa ở storage đối diện để tránh xung đột
    const altStorage = rememberMe ? sessionStorage : localStorage
    altStorage.removeItem(TOKEN_KEY)
    altStorage.removeItem(USER_KEY)

    storage.setItem(TOKEN_KEY, token)
    storage.setItem(USER_KEY, JSON.stringify(user))
  },

  /**
   * Lấy JWT token hiện tại
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null
  },

  /**
   * Lấy dữ liệu user hiện tại đã lưu
   */
  getUser: () => {
    const rawUser =
      localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    if (!rawUser) return null
    try {
      return JSON.parse(rawUser)
    } catch {
      return null
    }
  },

  /**
   * Kiểm tra xem user đã đăng nhập chưa
   */
  isAuthenticated: () => {
    return Boolean(authService.getToken())
  },

  /**
   * Xóa thông tin đăng nhập khỏi tất cả Storage
   */
  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  },
}
