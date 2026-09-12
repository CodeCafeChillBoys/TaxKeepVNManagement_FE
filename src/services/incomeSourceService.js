import { apiClient } from './apiClient'

/**
 * Service thao tác với Nơi chi trả thu nhập (Income Sources)
 * Routing qua ApiGateway: http://localhost:5000/api/v1/income-sources
 */
export const incomeSourceService = {
  /**
   * Lấy danh sách nơi chi trả thu nhập của người dùng
   * @param {Object} [params] - { taxYear, page, size, search, sort }
   */
  getAll: async (params = {}) => {
    return apiClient.get('/api/v1/income-sources', { params })
  },

  /**
   * Lấy bảng tổng hợp thu nhập năm
   * @param {number} [taxYear] - Năm tính thuế
   */
  getSummary: async (taxYear = new Date().getFullYear()) => {
    return apiClient.get('/api/v1/income-sources/summary', {
      params: { taxYear },
    })
  },

  /**
   * Lấy chi tiết nơi chi trả thu nhập theo ID
   * @param {string} id - UUID nơi chi trả thu nhập
   */
  getById: async (id) => {
    return apiClient.get(`/api/v1/income-sources/${id}`)
  },

  /**
   * Khai báo nơi chi trả thu nhập mới
   * @param {Object} data - { companyName, payerName, companyTaxId, taxCode, taxYear, totalIncome, grossIncome, taxWithheld, withheldTax }
   */
  create: async (data) => {
    const payload = {
      companyName: (data.companyName || data.payerName || '').trim(),
      companyTaxId: (data.companyTaxId || data.companyTaxCode || data.taxCode || '').trim() || null,
      taxYear: Number(data.taxYear) || new Date().getFullYear(),
      totalIncome: Number(data.totalIncome ?? data.grossIncome ?? 0),
      taxWithheld: Number(data.taxWithheld ?? data.withheldTax ?? 0),
    }
    const res = await apiClient.post('/api/v1/income-sources', payload)
    return res?.data || res
  },

  /**
   * Cập nhật thông tin nơi chi trả thu nhập
   * @param {string} id - UUID nơi chi trả thu nhập
   * @param {Object} data - Dữ liệu cập nhật
   */
  update: async (id, data) => {
    const payload = {
      companyName: (data.companyName || data.payerName || '').trim(),
      companyTaxId: (data.companyTaxId || data.companyTaxCode || data.taxCode || '').trim() || null,
      taxYear: Number(data.taxYear) || new Date().getFullYear(),
      totalIncome: Number(data.totalIncome ?? data.grossIncome ?? 0),
      taxWithheld: Number(data.taxWithheld ?? data.withheldTax ?? 0),
      isActive: data.isActive !== undefined ? data.isActive : true,
    }
    const res = await apiClient.put(`/api/v1/income-sources/${id}`, payload)
    return res?.data || res
  },

  /**
   * Xóa nơi chi trả thu nhập
   * @param {string} id - UUID nơi chi trả thu nhập
   */
  delete: async (id) => {
    return apiClient.delete(`/api/v1/income-sources/${id}`)
  },
}
