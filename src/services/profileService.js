import { apiClient } from './apiClient'

/**
 * Service thao tác với Hồ sơ cá nhân (Profile)
 * Routing qua ApiGateway: http://localhost:5000/api/profile
 */
export const profileService = {
  /**
   * Lấy thông tin hồ sơ cá nhân người dùng đang đăng nhập
   */
  getProfile: async () => {
    const res = await apiClient.get('/api/profile')
    return res?.data || res
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân
   * @param {Object} data - { fullName, phoneNumber, address, dateOfBirth, taxIdNumber, taxCode, isTaxRegisteredConfirmed }
   */
  updateProfile: async (data) => {
    const taxId = data.taxIdNumber || data.taxCode || null
    const is12DigitCccdTaxId = taxId && String(taxId).trim().length === 12

    const payload = {
      fullName: data.fullName?.trim(),
      phoneNumber: data.phoneNumber?.trim() || null,
      address: data.address?.trim() || null,
      dateOfBirth: data.dateOfBirth || null,
      taxIdNumber: taxId ? String(taxId).trim() : null,
      isTaxRegisteredConfirmed:
        data.isTaxRegisteredConfirmed !== undefined
          ? data.isTaxRegisteredConfirmed
          : is12DigitCccdTaxId
          ? true
          : null,
    }

    const res = await apiClient.put('/api/profile', payload)
    return res?.data || res
  },
}
