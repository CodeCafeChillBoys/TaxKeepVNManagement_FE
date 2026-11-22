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
 * Service vận hành gói của người dùng (Admin)
 * Kết nối Controller: AdminUserSubscriptionController (/api/v1/admin/subscriptions)
 */
export const adminSubscriptionService = {
  /**
   * Danh sách lượt đăng ký gói của người dùng (PagedResult)
   * GET /api/v1/admin/subscriptions
   * @param {{page?, pageSize?, search?, planId?, status?, billingCycle?, expiringInDays?}} filter
   */
  getUserSubscriptions: async ({
    page = 1,
    pageSize = 10,
    search,
    planId,
    status,
    billingCycle,
    expiringInDays,
  } = {}) => {
    const params = { page, pageSize }
    if (search?.trim()) params.search = search.trim()
    if (planId) params.planId = planId
    if (status) params.status = status
    if (billingCycle) params.billingCycle = billingCycle
    if (expiringInDays) params.expiringInDays = expiringInDays

    const res = await apiClient.get('/api/v1/admin/subscriptions', { params })
    const data = unwrap(res, 'Không thể tải danh sách gói của người dùng.')
    const p = data?.pagination || {}
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      page: p.page ?? page,
      pageSize: p.pageSize ?? pageSize,
      totalItems: p.totalItems ?? 0,
      totalPages: p.totalPages ?? 0,
    }
  },

  /**
   * Thống kê doanh thu gói (lọc theo ngày tạo đơn)
   * GET /api/v1/admin/subscriptions/analytics/revenue
   * @param {{fromDate?: string, toDate?: string}} range ISO date-time
   */
  getRevenueAnalytics: async ({ fromDate, toDate } = {}) => {
    const params = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const res = await apiClient.get('/api/v1/admin/subscriptions/analytics/revenue', { params })
    return unwrap(res, 'Không thể tải thống kê doanh thu gói.')
  },

  /**
   * Chi tiết một lượt đăng ký (kèm lượt AI/OCR đã dùng tháng này)
   * GET /api/v1/admin/subscriptions/{id}
   */
  getById: async (id) => {
    const res = await apiClient.get(`/api/v1/admin/subscriptions/${id}`)
    return unwrap(res, 'Không thể tải chi tiết gói đăng ký.')
  },

  /**
   * Tặng gói cho người dùng: gói đang dùng của họ kết thúc ngay
   * POST /api/v1/admin/subscriptions/gift
   * @param {{userId: string, planId: string, durationDays: number, reason: string}} payload
   */
  gift: async (payload) => {
    const res = await apiClient.post('/api/v1/admin/subscriptions/gift', payload)
    return unwrap(res, 'Không thể tặng gói cho người dùng.')
  },

  /**
   * Gia hạn thêm ngày cho gói trả phí đang hoạt động
   * POST /api/v1/admin/subscriptions/{id}/extend
   * @param {{extensionDays: number, reason: string}} payload
   */
  extend: async (id, payload) => {
    const res = await apiClient.post(`/api/v1/admin/subscriptions/${id}/extend`, payload)
    return unwrap(res, 'Không thể gia hạn gói.')
  },

  /**
   * Hoàn tiền vào ví người dùng và chuyển về Basic
   * POST /api/v1/admin/subscriptions/{id}/refund
   * @param {{refundAmount?: number, reason: string}} payload refundAmount trống = hoàn toàn bộ
   */
  refund: async (id, payload) => {
    const res = await apiClient.post(`/api/v1/admin/subscriptions/${id}/refund`, payload)
    return unwrap(res, 'Không thể hoàn tiền gói.')
  },
}
