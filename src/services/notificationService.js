import { apiClient } from './apiClient'

/**
 * Service thao tác với Thông báo (Notifications)
 * Routing qua ApiGateway: http://localhost:5000/api/v1/notifications
 */
export const notificationService = {
  /**
   * Lấy danh sách thông báo của người dùng
   * @param {Object} [params] - { page, size, search, sort, isRead }
   */
  getMyNotifications: async (params = {}) => {
    const res = await apiClient.get('/api/v1/notifications', { params })
    return res?.data || res
  },

  /**
   * Đánh dấu một thông báo đã đọc
   * @param {string} id - UUID thông báo
   */
  markAsRead: async (id) => {
    const res = await apiClient.patch(`/api/v1/notifications/${id}/read`)
    return res?.data || res
  },
}
