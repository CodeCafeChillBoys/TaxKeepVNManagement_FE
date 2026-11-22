import { apiClient } from './apiClient'
import { pickApiErrorMessage } from '@/utils/apiErrorCatalog'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res.data : res
  if (body?.success === false) {
    throw new Error(pickApiErrorMessage(body?.errorCode, body?.message, fallbackMsg))
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service quản trị gói dịch vụ (Admin)
 * Kết nối Controller: AdminSubscriptionController (/api/v1/admin/subscription/plans)
 * Giới hạn = -1 nghĩa là không giới hạn
 */
export const subscriptionPlanService = {
  /**
   * Lấy tất cả các gói (gồm cả gói đã ngừng bán)
   * GET /api/v1/admin/subscription/plans
   */
  getAll: async () => {
    const res = await apiClient.get('/api/v1/admin/subscription/plans')
    const data = unwrap(res, 'Không thể tải danh sách gói dịch vụ.')
    return Array.isArray(data) ? data : data?.items || []
  },

  /**
   * Xem chi tiết cấu hình một gói
   * GET /api/v1/admin/subscription/plans/{id}
   */
  getById: async (id) => {
    const res = await apiClient.get(`/api/v1/admin/subscription/plans/${id}`)
    return unwrap(res, 'Không thể tải chi tiết gói dịch vụ.')
  },

  /**
   * Tạo gói mới
   * POST /api/v1/admin/subscription/plans
   */
  create: async (payload) => {
    const res = await apiClient.post('/api/v1/admin/subscription/plans', payload)
    return unwrap(res, 'Không thể tạo gói dịch vụ.')
  },

  /**
   * Thay đổi giá, hạn mức, quyền lợi của gói (không đổi được slug)
   * PUT /api/v1/admin/subscription/plans/{id}
   */
  update: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/admin/subscription/plans/${id}`, payload)
    return unwrap(res, 'Không thể cập nhật gói dịch vụ.')
  },

  /**
   * Ngừng cung cấp gói (soft-delete: isActive = false). Gói Basic không ngừng được.
   * DELETE /api/v1/admin/subscription/plans/{id}
   */
  deactivate: async (id) => {
    const res = await apiClient.delete(`/api/v1/admin/subscription/plans/${id}`)
    return unwrap(res, 'Không thể ngừng cung cấp gói dịch vụ.')
  },
}
