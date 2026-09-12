import { apiClient } from './apiClient'

/**
 * Service thao tác với Quản trị viên Luật thuế (Tax Admin)
 * Routing qua ApiGateway: http://localhost:5000/api/admin/tax-rules
 */
export const taxAdminService = {
  /**
   * Tải lên tài liệu luật thuế xử lý bất đồng bộ qua RabbitMQ
   * @param {File} file - Tệp PDF luật thuế
   * @param {number|string} taxYear - Năm tính thuế
   * @param {string} [name] - Tên văn bản luật
   * @param {string} [sourceUrl] - Đường dẫn nguồn
   */
  uploadTaxDocumentAsync: async (file, taxYear, name, sourceUrl) => {
    const formData = new FormData()
    formData.append('File', file)
    formData.append('TaxYear', String(taxYear))
    if (name?.trim()) formData.append('Name', name.trim())
    if (sourceUrl?.trim()) formData.append('SourceUrl', sourceUrl.trim())

    return apiClient.post('/api/admin/tax-rules/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}
