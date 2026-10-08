import { apiClient } from './apiClient'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res : res
  if (body?.success === false) {
    throw new Error(body?.message || body?.errorCode || fallbackMsg)
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service API dành riêng cho Chuyên gia tư vấn thuế (Tax Expert Web Portal)
 * Kết nối các API Backend:
 * - GET    /api/v1/expert/bookings/pending          : Ca tư vấn chờ duyệt (SLA 2h)
 * - GET    /api/v1/expert/bookings                  : Toàn bộ danh sách lịch hẹn của chuyên gia
 * - POST   /api/v1/expert/bookings/{id}/accept      : Chuyên gia đồng ý tiếp nhận ca tư vấn
 * - POST   /api/v1/expert/bookings/{id}/reject      : Chuyên gia từ chối ca tư vấn (kèm lý do)
 * - GET    /api/v1/bookings/{id}                    : Chi tiết ca tư vấn
 * - GET    /api/v1/bookings/{id}/attachments/{attId}/download : Tải tệp đính kèm
 * - GET    /api/v1/expert-applications/my-application : Xem hồ sơ chuyên gia của tôi
 * - POST   /api/v1/expert-applications/draft        : Lưu bản nháp hồ sơ
 * - POST   /api/v1/expert-applications/avatar       : Tải lên avatar chuyên gia
 * - POST   /api/v1/expert-applications/certificates : Tải lên chứng chỉ
 * - DELETE /api/v1/expert-applications/certificates/{id} : Xóa chứng chỉ
 * - POST   /api/v1/expert-applications/submit       : Nộp hồ sơ xét duyệt
 * - GET    /api/v1/specializations                  : Danh mục lĩnh vực chuyên môn
 * - GET    /api/v1/consultation-fee-configs         : Khung cấu hình phí hệ thống
 */
export const expertPortalService = {
  // ── 1. CA TƯ VẤN CHỜ TIẾP NHẬN (SLA 2 GIỜ) ─────────────────────────
  getPendingBookings: async ({ page = 1, size = 10 } = {}) => {
    const res = await apiClient.get('/api/v1/expert/bookings/pending', {
      params: { page, size },
    })
    return unwrap(res, 'Không thể tải danh sách ca tư vấn chờ tiếp nhận.')
  },

  // ── 2. TOÀN BỘ LỊCH HẸN CỦA CHUYÊN GIA ──────────────────────────────
  getExpertBookings: async ({ status, page = 1, size = 10 } = {}) => {
    const params = { page, size }
    if (status) params.status = status
    const res = await apiClient.get('/api/v1/expert/bookings', { params })
    return unwrap(res, 'Không thể tải danh sách lịch hẹn.')
  },

  // ── 3. TIẾP NHẬN HOẶC TỪ CHỐI CA TƯ VẤN ─────────────────────────────
  acceptBooking: async (id) => {
    const res = await apiClient.post(`/api/v1/expert/bookings/${id}/accept`)
    return unwrap(res, 'Không thể tiếp nhận ca tư vấn.')
  },

  rejectBooking: async (id, reason) => {
    const res = await apiClient.post(`/api/v1/expert/bookings/${id}/reject`, {
      reason: reason?.trim(),
    })
    return unwrap(res, 'Không thể từ chối ca tư vấn.')
  },

  // ── 4. XEM CHI TIẾT CA TƯ VẤN & TÀI LIỆU ĐÍNH KÈM ───────────────────
  getBookingDetail: async (id) => {
    const res = await apiClient.get(`/api/v1/bookings/${id}`)
    return unwrap(res, 'Không thể tải thông tin chi tiết ca tư vấn.')
  },

  getAttachmentDownloadUrl: async (bookingId, attachmentId) => {
    const res = await apiClient.get(
      `/api/v1/bookings/${bookingId}/attachments/${attachmentId}/download`
    )
    return unwrap(res, 'Không thể lấy đường dẫn tải tài liệu.')
  },

  // ── 5. HỒ SƠ CHUYÊN GIA CỦA TÔI ─────────────────────────────────────
  getMyApplication: async () => {
    try {
      const res = await apiClient.get('/api/v1/expert-applications/my-application')
      return unwrap(res, 'Không thể tải thông tin hồ sơ chuyên gia.')
    } catch (err) {
      // 404 có nghĩa là tài khoản chưa có hồ sơ
      if (err.status === 404 || err.response?.status === 404) {
        return null
      }
      throw err
    }
  },

  saveDraft: async (data) => {
    const res = await apiClient.post('/api/v1/expert-applications/draft', data)
    return unwrap(res, 'Không thể lưu bản nháp hồ sơ chuyên gia.')
  },

  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post('/api/v1/expert-applications/avatar', formData)
    return unwrap(res, 'Không thể tải lên ảnh đại diện.')
  },

  uploadCertificate: async ({ file, certificateType, certificateName, certificateNumber, issuingAuthority, issueDate, hasExpiry, expiryDate }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('certificateType', certificateType)
    formData.append('certificateName', certificateName)
    formData.append('certificateNumber', certificateNumber)
    formData.append('issuingAuthority', issuingAuthority)
    formData.append('issueDate', issueDate)
    formData.append('hasExpiry', Boolean(hasExpiry))
    if (hasExpiry && expiryDate) {
      formData.append('expiryDate', expiryDate)
    }
    const res = await apiClient.post('/api/v1/expert-applications/certificates', formData)
    return unwrap(res, 'Không thể tải lên chứng chỉ.')
  },

  deleteCertificate: async (certificateId) => {
    const res = await apiClient.delete(`/api/v1/expert-applications/certificates/${certificateId}`)
    return unwrap(res, 'Không thể xóa chứng chỉ.')
  },

  submitApplication: async () => {
    const res = await apiClient.post('/api/v1/expert-applications/submit')
    return unwrap(res, 'Không thể nộp hồ sơ chuyên gia.')
  },

  // ── 6. METADATA DANH MỤC ────────────────────────────────────────────
  getSpecializations: async () => {
    const res = await apiClient.get('/api/v1/specializations', { params: { isActive: true } })
    const data = unwrap(res, 'Không thể tải danh mục lĩnh vực.')
    return Array.isArray(data) ? data : data?.items || []
  },

  getFeeConfigs: async () => {
    const res = await apiClient.get('/api/v1/consultation-fee-configs', { params: { isActive: true } })
    const data = unwrap(res, 'Không thể tải khung phí.')
    return Array.isArray(data) ? data : data?.items || []
  },
}
