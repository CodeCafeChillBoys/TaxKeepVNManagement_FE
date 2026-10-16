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

  // ── 7. THANH TOÁN VNPAY / VIETQR & TẠM GIỮ TIỀN BẢO ĐẢM (ESCROW) ───
  createPaymentLink: async (bookingId, returnUrl) => {
    const res = await apiClient.post(
      `/api/v1/bookings/${bookingId}/payment-link`,
      returnUrl ? { returnUrl } : {}
    )
    return unwrap(res, 'Không thể khởi tạo đường dẫn thanh toán.')
  },

  getBookingEscrow: async (bookingId) => {
    const res = await apiClient.get(`/api/v1/bookings/${bookingId}/escrow`)
    return unwrap(res, 'Không thể tải thông tin ký quỹ bảo đảm.')
  },

  // ── 8. PHIÊN TƯ VẤN TRỰC TUYẾN 1-1 (LIVE CONSULTATION EXECUTION) ───
  joinConsultation: async (bookingId) => {
    const res = await apiClient.post(`/api/v1/consultations/${bookingId}/join`)
    return unwrap(res, 'Không thể vào phòng tư vấn trực tuyến.')
  },

  getConsultationSession: async (bookingId) => {
    const res = await apiClient.get(`/api/v1/consultations/${bookingId}/session`)
    return unwrap(res, 'Không thể tải trạng thái phòng tư vấn.')
  },

  getSharedTaxDossier: async (bookingId) => {
    const res = await apiClient.get(`/api/v1/consultations/${bookingId}/shared-dossier`)
    return unwrap(res, 'Không thể tải hồ sơ thuế được chia sẻ.')
  },

  updateConsultationNotes: async (bookingId, notes) => {
    const res = await apiClient.put(`/api/v1/consultations/${bookingId}/notes`, {
      sharedNotes: notes?.trim() || '',
    })
    return unwrap(res, 'Không thể lưu ghi chú kết luận tư vấn.')
  },

  completeConsultation: async (bookingId, notes) => {
    const cleanNotes = notes?.trim() || ''
    if (cleanNotes.length < 10) {
      throw new Error('Nội dung biên bản kết luận tư vấn phải có tối thiểu 10 ký tự.')
    }
    const res = await apiClient.post(`/api/v1/consultations/${bookingId}/complete`, {
      sharedNotes: cleanNotes,
    })
    return unwrap(res, 'Không thể kết thúc phiên tư vấn.')
  },

  reportNoShow: async (bookingId, reason) => {
    const res = await apiClient.post(`/api/v1/consultations/${bookingId}/report-no-show`, {
      reason: reason?.trim() || null,
    })
    return unwrap(res, 'Không thể báo cáo vắng mặt.')
  },

  // ── 9. NHẮC NHỞ LỊCH HẸN SẮP TỚI (UPCOMING MEETING REMINDER) ────────
  getUpcomingReminder: async () => {
    const res = await apiClient.get('/api/v1/consultations/upcoming-reminder')
    return unwrap(res, 'Không thể tải thông tin nhắc nhở lịch hẹn sắp tới.')
  },

  // ── 10. QUẢN LÝ LỊCH RẢNH / KHUNG GIỜ LÀM VIỆC (EXPERT SLOTS CRUD) ───
  getMySlots: async ({ fromDate, toDate, sessionType, isBooked, isActive } = {}) => {
    const params = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (sessionType) params.sessionType = sessionType
    if (isBooked !== undefined && isBooked !== null) params.isBooked = isBooked
    if (isActive !== undefined && isActive !== null) params.isActive = isActive

    const res = await apiClient.get('/api/v1/expert/slots', { params })
    return unwrap(res, 'Không thể tải danh sách khung giờ làm việc.')
  },

  getSlotById: async (id) => {
    const res = await apiClient.get(`/api/v1/expert/slots/${id}`)
    return unwrap(res, 'Không thể tải thông tin chi tiết khung giờ.')
  },

  createSlot: async ({ slotDate, startTime, endTime, sessionType = 'ONLINE_MEETING' }) => {
    const res = await apiClient.post('/api/v1/expert/slots', {
      slotDate,
      startTime,
      endTime,
      sessionType,
    })
    return unwrap(res, 'Không thể tạo mới khung giờ làm việc.')
  },

  updateSlot: async (id, { slotDate, startTime, endTime, sessionType = 'ONLINE_MEETING', isActive = true }) => {
    const res = await apiClient.put(`/api/v1/expert/slots/${id}`, {
      slotDate,
      startTime,
      endTime,
      sessionType,
      isActive,
    })
    return unwrap(res, 'Không thể cập nhật khung giờ làm việc.')
  },

  toggleSlotActive: async (id) => {
    const res = await apiClient.patch(`/api/v1/expert/slots/${id}/toggle-active`)
    return unwrap(res, 'Không thể thay đổi trạng thái khung giờ.')
  },

  deleteSlot: async (id) => {
    const res = await apiClient.delete(`/api/v1/expert/slots/${id}`)
    return unwrap(res, 'Không thể xóa khung giờ làm việc.')
  },
}

