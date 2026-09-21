import { apiClient } from './apiClient'
import { getStoredAdminId } from './taxRuleService'

/**
 * Service quản trị cấu hình hệ thống & ngưỡng AI OCR (Dynamic System Configs)
 * Kết nối theo đặc tả SPEC_EXPENSE_OCR_AND_SYSTEM_CONFIGS.md:
 * - GET    /api/admin/system-configs                       : Lấy danh sách cấu hình (active_only)
 * - GET    /api/admin/system-configs/{key}                 : Xem chi tiết cấu hình theo key
 * - POST   /api/admin/system-configs                       : Tạo cấu hình / ngưỡng mới
 * - PUT    /api/admin/system-configs/{key}                 : Cập nhật giá trị, kiểu dữ liệu, trạng thái
 * - DELETE /api/admin/system-configs/{key}                 : Xóa mềm cấu hình (Soft Delete)
 * - PATCH  /api/admin/system-configs/{key}/restore         : Khôi phục cấu hình đã xóa mềm
 * - GET    /api/admin/system-configs/threshold/test-resolve : Kiểm tra phân giải ngưỡng 3 tầng cho danh mục
 */

const BASE_PATH = '/api/admin/system-configs'

export const systemConfigService = {
  /**
   * Lấy danh sách toàn bộ cấu hình hệ thống
   * @param {boolean} [activeOnly=false] - Chỉ lấy các cấu hình đang kích hoạt và chưa xóa mềm
   * @returns {Promise<Array>}
   */
  getConfigs: async (activeOnly = false) => {
    const res = await apiClient.get(BASE_PATH, {
      params: { activeOnly },
    })
    const list = Array.isArray(res) ? res : (res?.data || res?.items || res?.value || [])
    return Array.isArray(list) ? list : []
  },

  /**
   * Xem chi tiết một cấu hình theo khóa
   * @param {string} key - Tên khóa cấu hình (ví dụ: AI_CONFIDENCE_THRESHOLD)
   * @returns {Promise<Object>}
   */
  getConfigByKey: async (key) => {
    const res = await apiClient.get(`${BASE_PATH}/${encodeURIComponent(key.trim().toUpperCase())}`)
    return res?.data || res
  },

  /**
   * Admin tạo mới một cấu hình / ngưỡng động
   * @param {Object} payload - { config_key, config_value, description, admin_id }
   * @returns {Promise<Object>}
   */
  createConfig: async (payload) => {
    const adminId = payload.admin_id || getStoredAdminId()
    const body = {
      config_key: payload.config_key?.trim().toUpperCase(),
      config_value: String(payload.config_value ?? '').trim(),
      description: payload.description?.trim() || null,
      admin_id: adminId || null,
    }
    const res = await apiClient.post(BASE_PATH, body)
    return res?.data || res
  },

  /**
   * Admin cập nhật giá trị hoặc trạng thái cấu hình
   * @param {string} key - Tên khóa cấu hình
   * @param {Object} payload - { config_value, description, is_active, admin_id }
   * @returns {Promise<Object>}
   */
  updateConfig: async (key, payload) => {
    const adminId = payload.admin_id || getStoredAdminId()
    const body = {
      config_value: payload.config_value !== undefined ? String(payload.config_value).trim() : undefined,
      description: payload.description !== undefined ? (payload.description?.trim() || null) : undefined,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : undefined,
      admin_id: adminId || null,
    }
    const res = await apiClient.put(`${BASE_PATH}/${encodeURIComponent(key.trim().toUpperCase())}`, body)
    return res?.data || res
  },

  /**
   * Admin xóa mềm cấu hình (Soft Delete: is_deleted = true)
   * @param {string} key - Tên khóa cấu hình
   * @param {string} [adminId] - ID quản trị viên thực hiện
   * @returns {Promise<Object>}
   */
  deleteConfig: async (key, adminId = null) => {
    const resolvedAdminId = adminId || getStoredAdminId()
    const params = resolvedAdminId ? { adminId: resolvedAdminId } : {}
    return apiClient.delete(`${BASE_PATH}/${encodeURIComponent(key.trim().toUpperCase())}`, { params })
  },

  /**
   * Admin khôi phục cấu hình đã bị xóa mềm
   * @param {string} key - Tên khóa cấu hình
   * @param {string} [adminId] - ID quản trị viên thực hiện
   * @returns {Promise<Object>}
   */
  restoreConfig: async (key, adminId = null) => {
    const resolvedAdminId = adminId || getStoredAdminId()
    const params = resolvedAdminId ? { adminId: resolvedAdminId } : {}
    const res = await apiClient.patch(
      `${BASE_PATH}/${encodeURIComponent(key.trim().toUpperCase())}/restore`,
      null,
      { params }
    )
    return res?.data || res
  },

  /**
   * Kiểm tra trực quan xem AI sẽ áp dụng ngưỡng tin cậy nào cho danh mục này (3-tier resolution test)
   * @param {string} [categoryCode] - Mã danh mục hóa đơn (ví dụ: MEDICAL_EXPENSE_INVOICE)
   * @returns {Promise<Object>} - { category_code, resolved_threshold, note }
   */
  testResolveThreshold: async (categoryCode = null) => {
    const params = categoryCode ? { categoryCode: categoryCode.trim().toUpperCase() } : {}
    const res = await apiClient.get(`${BASE_PATH}/threshold/test-resolve`, { params })
    return res?.data || res
  },
}