import { apiClient } from './apiClient'

/**
 * Service thao tác với Quy tắc hồ sơ người phụ thuộc (Dependent Rules)
 * Routing qua ApiGateway: http://localhost:5000/api/v1/dependent-rules
 */
export const dependentRuleService = {
  /**
   * Lấy danh sách quy tắc hồ sơ người phụ thuộc (có phân trang, tìm kiếm, lọc)
   * @param {Object} [params] - { targetGroup, isActive, page, size, search, sort }
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get('/api/v1/dependent-rules', { params })
    return res?.data || res
  },

  /**
   * Lấy chi tiết quy tắc hồ sơ người phụ thuộc theo ID
   * @param {string} id - UUID của quy tắc
   */
  getById: async (id) => {
    const res = await apiClient.get(`/api/v1/dependent-rules/${id}`)
    return res?.data || res
  },

  /**
   * Thêm mới quy tắc hồ sơ người phụ thuộc
   * @param {Object} data - { targetGroup, docType, isMandatory, description, isActive }
   */
  create: async (data) => {
    const payload = {
      targetGroup: data.targetGroup?.trim(),
      docType: data.docType?.trim(),
      isMandatory: data.isMandatory !== undefined ? Boolean(data.isMandatory) : true,
      description: data.description?.trim() || null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    }
    const res = await apiClient.post('/api/v1/dependent-rules', payload)
    return res?.data || res
  },

  /**
   * Cập nhật quy tắc hồ sơ người phụ thuộc
   * @param {string} id - UUID của quy tắc
   * @param {Object} data - { isMandatory, description, isActive }
   */
  update: async (id, data) => {
    const payload = {
      isMandatory: data.isMandatory !== undefined ? Boolean(data.isMandatory) : true,
      description: data.description?.trim() || null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    }
    const res = await apiClient.put(`/api/v1/dependent-rules/${id}`, payload)
    return res?.data || res
  },

  /**
   * Xóa quy tắc hồ sơ người phụ thuộc
   * @param {string} id - UUID của quy tắc
   */
  delete: async (id) => {
    const res = await apiClient.delete(`/api/v1/dependent-rules/${id}`)
    return res?.data || res
  },
}
