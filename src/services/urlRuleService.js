import { apiClient } from './apiClient'
import { getStoredAdminId } from './taxRuleService'

/**
 * Service quản trị danh mục quy tắc kiểm tra URL (URL Validation Rules)
 * Kết nối theo đúng đặc tả API:
 * - GET    /api/url-rules      : Lấy danh sách các quy tắc kiểm tra URL
 * - POST   /api/url-rules      : Admin thêm tên miền nguồn kiểm tra URL
 * - GET    /api/url-rules/{id} : Xem chi tiết một quy tắc URL
 * - PUT    /api/url-rules/{id} : Admin cập nhật tên miền nguồn kiểm tra URL
 * - DELETE /api/url-rules/{id} : Admin xóa một quy tắc kiểm tra URL
 */

/**
 * Hàm helper thực thi request tới API URL Validation Rules
 * Đảm bảo tương thích qua ApiGateway (route /ai/api/url-rules) và fallback tự động
 */
const makeRequest = async (method, path, data = null, params = null) => {
  const directPath = path.startsWith('/') ? path : `/${path}`
  const aiPrefixPath = directPath.startsWith('/ai') ? directPath : `/ai${directPath}`

  try {
    const res = await apiClient({
      method,
      url: aiPrefixPath,
      data,
      params,
    })
    return res?.data || res
  } catch (err) {
    // Nếu ApiGateway chưa cấu hình prefix /ai hoặc đã map trực tiếp /api/url-rules
    if (err.status === 404 || !err.response) {
      const fallbackRes = await apiClient({
        method,
        url: directPath,
        data,
        params,
      })
      return fallbackRes?.data || fallbackRes
    }
    throw err
  }
}

/**
 * Chuẩn hóa đối tượng quy tắc để luôn có đầy đủ cả 2 trường isActive và is_active
 */
const normalizeRule = (rule) => {
  if (!rule || typeof rule !== 'object') return rule
  const isAct = Boolean(rule.isActive ?? rule.is_active ?? true)
  return {
    ...rule,
    isActive: isAct,
    is_active: isAct,
  }
}

export const urlRuleService = {
  /**
   * GET /api/url-rules
   * Lấy danh sách các quy tắc kiểm tra URL
   * @param {boolean} [activeOnly=false] - Chỉ lấy các quy tắc đang kích hoạt
   * @returns {Promise<Array>}
   */
  getRules: async (activeOnly = false) => {
    const res = await makeRequest('GET', '/api/url-rules', null, { active_only: activeOnly })
    const list = Array.isArray(res) ? res : (res?.data || res?.value || res?.items || [])
    return Array.isArray(list) ? list.map(normalizeRule) : []
  },

  /**
   * GET /api/url-rules/{id}
   * Xem chi tiết một quy tắc URL
   * @param {string} id - Mã định danh quy tắc (UUID)
   * @returns {Promise<Object>}
   */
  getRuleById: async (id) => {
    const res = await makeRequest('GET', `/api/url-rules/${id}`)
    const item = res?.data || res?.value || res
    return normalizeRule(item)
  },

  /**
   * POST /api/url-rules
   * Admin thêm tên miền nguồn kiểm tra URL
   * @param {Object} payload - { name, domain, description, is_active / isActive, createdBy }
   * @returns {Promise<Object>}
   */
  createRule: async (payload) => {
    const adminId = getStoredAdminId()
    const body = {
      name: payload.name?.trim(),
      domain: payload.domain?.trim(),
      description: payload.description?.trim() || null,
      isActive: payload.isActive ?? payload.is_active ?? true,
      createdBy: payload.createdBy || adminId || null,
    }
    const res = await makeRequest('POST', '/api/url-rules', body)
    return normalizeRule(res?.data || res)
  },

  /**
   * PUT /api/url-rules/{id}
   * Admin cập nhật tên miền nguồn kiểm tra URL
   * @param {string} id - Mã định danh quy tắc (UUID)
   * @param {Object} payload - { name, domain, description, is_active / isActive, updatedBy }
   * @returns {Promise<Object>}
   */
  updateRule: async (id, payload) => {
    const adminId = getStoredAdminId()
    const body = {
      name: payload.name?.trim(),
      domain: payload.domain?.trim(),
      description: payload.description?.trim() || null,
      isActive: payload.isActive ?? payload.is_active ?? true,
      updatedBy: payload.updatedBy || adminId || null,
    }
    const res = await makeRequest('PUT', `/api/url-rules/${id}`, body)
    return normalizeRule(res?.data || res)
  },

  /**
   * DELETE /api/url-rules/{id}
   * Admin xóa một quy tắc kiểm tra URL
   * @param {string} id - Mã định danh quy tắc (UUID)
   * @returns {Promise<Object>}
   */
  deleteRule: async (id) => {
    return makeRequest('DELETE', `/api/url-rules/${id}`)
  },
}
