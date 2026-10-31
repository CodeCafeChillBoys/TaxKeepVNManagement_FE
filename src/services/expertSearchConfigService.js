import { apiClient } from './apiClient'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res.data : res
  if (body?.success === false) {
    throw new Error(body?.message || body?.errorCode || fallbackMsg)
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service quản trị cấu hình tìm kiếm & thuật toán đề xuất chuyên gia (Admin)
 * Kết nối Controller: AdminExpertSearchConfigController (/api/v1/admin/expert-search-configs)
 */
export const expertSearchConfigService = {
  /**
   * Lấy cấu hình tiêu chí tìm kiếm, sắp xếp và trọng số xếp hạng hiện tại
   * GET /api/v1/admin/expert-search-configs
   */
  getConfig: async () => {
    const res = await apiClient.get('/api/v1/admin/expert-search-configs')
    return unwrap(res, 'Không thể tải cấu hình tìm kiếm và đề xuất chuyên gia.')
  },

  /**
   * Cập nhật cấu hình tiêu chí tìm kiếm và trọng số đề xuất
   * PUT /api/v1/admin/expert-search-configs
   */
  updateConfig: async (payload) => {
    const res = await apiClient.put('/api/v1/admin/expert-search-configs', payload)
    return unwrap(res, 'Không thể cập nhật cấu hình tìm kiếm và đề xuất chuyên gia.')
  },

  /**
   * Khôi phục cấu hình về giá trị mặc định của hệ thống
   * POST /api/v1/admin/expert-search-configs/reset-defaults
   */
  resetDefaults: async () => {
    const res = await apiClient.post('/api/v1/admin/expert-search-configs/reset-defaults')
    return unwrap(res, 'Không thể khôi phục cấu hình mặc định.')
  },
}
