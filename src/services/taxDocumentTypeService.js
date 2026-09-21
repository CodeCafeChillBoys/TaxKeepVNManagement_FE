import { apiClient } from './apiClient'

const BASE_PATH = '/api/v1/tax-document-types'

/**
 * Service quản trị danh mục loại chứng từ thuế (Tax Document Types)
 * Kết nối các API Backend:
 * - GET    /api/v1/tax-document-types        : Lấy danh sách loại chứng từ (hỗ trợ search, isTaxEligible)
 * - GET    /api/v1/tax-document-types/{code} : Xem chi tiết loại chứng từ theo mã code
 * - POST   /api/v1/tax-document-types        : Thêm mới loại chứng từ thuế
 * - PUT    /api/v1/tax-document-types/{code} : Cập nhật thông tin loại chứng từ thuế
 */
export const taxDocumentTypeService = {
  /**
   * Lấy danh sách các loại chứng từ thuế
   * @param {Object} [params]
   * @param {string} [params.search] - Từ khóa tìm kiếm theo mã hoặc tên
   * @param {boolean} [params.isTaxEligible] - Lọc theo tính đủ điều kiện giảm trừ thuế
   * @returns {Promise<Array<{ code: string, name: string, isTaxEligible: boolean }>>}
   */
  getAll: async (params = {}) => {
    const query = {}
    if (params.search?.trim()) query.search = params.search.trim()
    if (params.isTaxEligible !== undefined && params.isTaxEligible !== null && params.isTaxEligible !== '') {
      query.isTaxEligible = Boolean(params.isTaxEligible)
    }

    const res = await apiClient.get(BASE_PATH, { params: query })
    const list = res?.data || (Array.isArray(res) ? res : [])
    return Array.isArray(list) ? list : []
  },

  /**
   * Lấy chi tiết một loại chứng từ theo mã code
   * @param {string} code - Mã loại chứng từ (VD: MEDICAL_EXPENSE_INVOICE)
   * @returns {Promise<{ code: string, name: string, isTaxEligible: boolean }>}
   */
  getByCode: async (code) => {
    if (!code?.trim()) throw new Error('Mã loại chứng từ không hợp lệ.')
    const res = await apiClient.get(`${BASE_PATH}/${encodeURIComponent(code.trim().toUpperCase())}`)
    return res?.data || res
  },

  /**
   * Thêm mới một loại chứng từ thuế
   * @param {Object} payload
   * @param {string} payload.code - Mã loại chứng từ (in hoa, số, gạch dưới)
   * @param {string} payload.name - Tên mô tả loại chứng từ
   * @param {boolean} [payload.isTaxEligible=true] - Đủ điều kiện giảm trừ thuế
   * @returns {Promise<{ code: string, name: string, isTaxEligible: boolean }>}
   */
  create: async (payload) => {
    const body = {
      code: payload.code?.trim().toUpperCase(),
      name: payload.name?.trim(),
      isTaxEligible: payload.isTaxEligible !== undefined ? Boolean(payload.isTaxEligible) : true,
    }

    const res = await apiClient.post(BASE_PATH, body)
    return res?.data || res
  },

  /**
   * Cập nhật loại chứng từ thuế theo mã code
   * @param {string} code - Mã loại chứng từ
   * @param {Object} payload
   * @param {string} payload.name - Tên mới loại chứng từ
   * @param {boolean} [payload.isTaxEligible] - Cập nhật tính đủ điều kiện giảm trừ
   * @returns {Promise<{ code: string, name: string, isTaxEligible: boolean }>}
   */
  update: async (code, payload) => {
    if (!code?.trim()) throw new Error('Mã loại chứng từ không hợp lệ.')
    const body = {
      name: payload.name?.trim(),
      isTaxEligible: payload.isTaxEligible !== undefined ? Boolean(payload.isTaxEligible) : true,
    }

    const res = await apiClient.put(`${BASE_PATH}/${encodeURIComponent(code.trim().toUpperCase())}`, body)
    return res?.data || res
  },
}
