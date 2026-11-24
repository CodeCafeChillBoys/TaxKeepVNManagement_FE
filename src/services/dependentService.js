import { apiClient } from './apiClient'

/**
 * Service thao tác với Người phụ thuộc (Dependents & Documents)
 * Routing qua ApiGateway: http://localhost:5000/api/v1/dependents
 */
export const dependentService = {
  /**
   * Đăng ký người phụ thuộc mới
   * @param {Object} data - { fullName, relationship, currentGroup, birthDate, citizenId, birthCertNumber, taxIdNumber, effectiveFromMonth, effectiveToMonth, note }
   */
  create: async (data) => {
    // Tự động chuẩn hóa format tháng YYYY-MM
    const currentYear = new Date().getFullYear()
    const fromMonth =
      data.effectiveFromMonth ||
      (data.deductionStartDate ? String(data.deductionStartDate).substring(0, 7) : `${currentYear}-01`)
    const toMonth =
      data.effectiveToMonth ||
      (data.deductionEndDate ? String(data.deductionEndDate).substring(0, 7) : `${currentYear}-12`)

    const payload = {
      fullName: data.fullName?.trim(),
      relationship: data.relationship || 'CHILD',
      // Mã nhóm lấy từ catalog (GET /api/v1/dependents/catalog) do caller chọn; không đoán theo quan hệ
      currentGroup: data.currentGroup || null,
      birthDate: data.birthDate || data.dateOfBirth,
      citizenId: data.citizenId?.trim() || null,
      birthCertNumber: data.birthCertNumber?.trim() || null,
      taxIdNumber: data.taxIdNumber?.trim() || data.taxCode?.trim() || null,
      effectiveFromMonth: fromMonth,
      effectiveToMonth: toMonth,
      note: data.note?.trim() || null,
    }

    const res = await apiClient.post('/api/v1/dependents', payload)
    return res?.data || res
  },

  /**
   * Lấy danh sách nhắc nhở chuyển nhóm tuổi người phụ thuộc
   * @param {number} [taxYear] - Năm tính thuế
   * @param {Object} [params] - { page, size, search, sort }
   */
  getAgeTransitionReminders: async (taxYear = new Date().getFullYear(), params = {}) => {
    return apiClient.get('/api/v1/dependents/reminders/age-transitions', {
      params: { taxYear, ...params },
    })
  },

  /**
   * Upload giấy tờ chứng minh người phụ thuộc
   * @param {string} dependentId - UUID của người phụ thuộc
   * @param {File} file - Tệp chứng từ (PDF hoặc ảnh)
   * @param {string} docType - Loại chứng từ (BIRTH_CERTIFICATE, STUDENT_CARD, DISABILITY_CERT, ...)
   */
  uploadDocument: async (dependentId, file, docType) => {
    const formData = new FormData()
    formData.append('File', file)
    formData.append('DocType', docType)

    return apiClient.post(`/api/v1/dependents/${dependentId}/documents`, formData, {
      headers: {
        'Content-Type': undefined,
      },
    })
  },
}
