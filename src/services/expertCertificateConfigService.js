import { apiClient } from './apiClient'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res.data : res
  if (body?.success === false) {
    throw new Error(body?.message || body?.errorCode || fallbackMsg)
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service quản trị danh mục và cấu hình loại chứng chỉ chuyên gia (Admin)
 * Kết nối Controller: ExpertCertificateConfigController (/api/v1/admin/expert-certificate-configs)
 */
export const expertCertificateConfigService = {
  /**
   * Lấy danh sách cấu hình loại chứng chỉ
   * GET /api/v1/admin/expert-certificate-configs
   */
  getAll: async ({ keyword, isActive, page, size } = {}) => {
    const params = {}
    if (keyword?.trim()) params.keyword = keyword.trim()
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      params.isActive = isActive === 'true' || isActive === true
    }
    if (page) params.page = page
    if (size) params.size = size

    const res = await apiClient.get('/api/v1/admin/expert-certificate-configs', { params })
    const data = unwrap(res, 'Không thể tải danh sách cấu hình loại chứng chỉ.')
    return Array.isArray(data) ? data : (data?.items || [])
  },

  /**
   * Lấy chi tiết một loại chứng chỉ
   * GET /api/v1/admin/expert-certificate-configs/{id}
   */
  getById: async (id) => {
    const res = await apiClient.get(`/api/v1/admin/expert-certificate-configs/${id}`)
    return unwrap(res, 'Không thể tải chi tiết loại chứng chỉ.')
  },

  /**
   * Tạo mới loại chứng chỉ hành nghề
   * POST /api/v1/admin/expert-certificate-configs
   */
  create: async (payload) => {
    const res = await apiClient.post('/api/v1/admin/expert-certificate-configs', payload)
    return unwrap(res, 'Không thể tạo mới loại chứng chỉ.')
  },

  /**
   * Cập nhật thông tin loại chứng chỉ
   * PUT /api/v1/admin/expert-certificate-configs/{id}
   */
  update: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/admin/expert-certificate-configs/${id}`, payload)
    return unwrap(res, 'Không thể cập nhật loại chứng chỉ.')
  },

  /**
   * Bật/tắt trạng thái kích hoạt loại chứng chỉ
   * PATCH /api/v1/admin/expert-certificate-configs/{id}/toggle-active
   */
  toggleActive: async (id) => {
    const res = await apiClient.patch(`/api/v1/admin/expert-certificate-configs/${id}/toggle-active`)
    return unwrap(res, 'Không thể thay đổi trạng thái loại chứng chỉ.')
  },

  /**
   * Xóa loại chứng chỉ
   * DELETE /api/v1/admin/expert-certificate-configs/{id}
   */
  delete: async (id) => {
    const res = await apiClient.delete(`/api/v1/admin/expert-certificate-configs/${id}`)
    return unwrap(res, 'Không thể xóa loại chứng chỉ.')
  },
}
