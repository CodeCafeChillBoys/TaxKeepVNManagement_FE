import { apiClient } from './apiClient'

/**
 * Service quản trị chuyên gia tư vấn thuế — Admin Expert Management
 * Kết nối các API:
 * ─── Hồ sơ đăng ký chuyên gia (Admin) ───
 * - GET    /api/v1/admin/expert-applications                                : Danh sách hồ sơ (phân trang, lọc status, search)
 * - GET    /api/v1/admin/expert-applications/{id}                           : Chi tiết hồ sơ
 * - PUT    /api/v1/admin/expert-applications/{id}/certificates/{certId}/verify : Thẩm định chứng chỉ
 * - POST   /api/v1/admin/expert-applications/{id}/approve                   : Phê duyệt hồ sơ
 * - POST   /api/v1/admin/expert-applications/{id}/reject                    : Từ chối hồ sơ
 * - POST   /api/v1/admin/expert-applications/{id}/request-supplement        : Yêu cầu bổ sung
 *
 * ─── Lĩnh vực chuyên môn ───
 * - GET    /api/v1/specializations                    : Danh sách (lọc search, isActive)
 * - GET    /api/v1/specializations/{id}               : Chi tiết
 * - POST   /api/v1/specializations                    : Tạo mới (Admin)
 * - PUT    /api/v1/specializations/{id}               : Cập nhật (Admin)
 * - DELETE /api/v1/specializations/{id}               : Xóa (Admin)
 *
 * ─── Cấu hình mức phí tư vấn ───
 * - GET    /api/v1/consultation-fee-configs            : Danh sách (lọc sessionType, isActive)
 * - GET    /api/v1/consultation-fee-configs/{id}       : Chi tiết
 * - POST   /api/v1/consultation-fee-configs            : Tạo mới (Admin)
 * - PUT    /api/v1/consultation-fee-configs/{id}       : Cập nhật (Admin)
 * - DELETE /api/v1/consultation-fee-configs/{id}       : Xóa (Admin)
 */

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res : res
  if (body?.success === false) {
    throw new Error(body?.message || body?.errorCode || fallbackMsg)
  }
  return body?.data !== undefined ? body.data : body
}

export const expertService = {
  // ═══════════════════════════════════════════
  // HỒ SƠ ĐĂNG KÝ CHUYÊN GIA (ADMIN)
  // ═══════════════════════════════════════════

  /**
   * Lấy danh sách hồ sơ đăng ký chuyên gia (phân trang, lọc, tìm kiếm)
   * GET /api/v1/admin/expert-applications?status=PendingReview&page=1&size=10&search=...
   */
  getApplications: async ({ status, search, page = 1, size = 10 } = {}) => {
    const params = {}
    if (status) params.status = status
    if (search?.trim()) params.search = search.trim()
    params.page = page
    params.size = size

    const res = await apiClient.get('/api/v1/admin/expert-applications', { params })
    return unwrap(res, 'Không thể tải danh sách hồ sơ chuyên gia.')
  },

  /**
   * Xem chi tiết hồ sơ đăng ký chuyên gia
   * GET /api/v1/admin/expert-applications/{id}
   */
  getApplicationById: async (id) => {
    const res = await apiClient.get(`/api/v1/admin/expert-applications/${id}`)
    return unwrap(res, 'Không thể tải chi tiết hồ sơ chuyên gia.')
  },

  /**
   * Thẩm định chứng chỉ trong hồ sơ
   * PUT /api/v1/admin/expert-applications/{id}/certificates/{certificateId}/verify
   */
  verifyCertificate: async (applicationId, certificateId, payload) => {
    const res = await apiClient.put(
      `/api/v1/admin/expert-applications/${applicationId}/certificates/${certificateId}/verify`,
      payload
    )
    return unwrap(res, 'Không thể thẩm định chứng chỉ.')
  },

  /**
   * Phê duyệt hồ sơ chuyên gia
   * POST /api/v1/admin/expert-applications/{id}/approve
   */
  approveApplication: async (id, note) => {
    const res = await apiClient.post(
      `/api/v1/admin/expert-applications/${id}/approve`,
      note ? { note } : {}
    )
    return unwrap(res, 'Không thể phê duyệt hồ sơ chuyên gia.')
  },

  /**
   * Từ chối hồ sơ chuyên gia
   * POST /api/v1/admin/expert-applications/{id}/reject
   */
  rejectApplication: async (id, reason) => {
    const res = await apiClient.post(
      `/api/v1/admin/expert-applications/${id}/reject`,
      { reason }
    )
    return unwrap(res, 'Không thể từ chối hồ sơ chuyên gia.')
  },

  /**
   * Yêu cầu bổ sung hồ sơ
   * POST /api/v1/admin/expert-applications/{id}/request-supplement
   */
  requestSupplement: async (id, reason) => {
    const res = await apiClient.post(
      `/api/v1/admin/expert-applications/${id}/request-supplement`,
      { reason }
    )
    return unwrap(res, 'Không thể gửi yêu cầu bổ sung.')
  },

  // ═══════════════════════════════════════════
  // LĨNH VỰC CHUYÊN MÔN (SPECIALIZATIONS)
  // ═══════════════════════════════════════════

  /**
   * Lấy danh sách lĩnh vực chuyên môn
   * GET /api/v1/specializations?isActive=true&search=thuế
   */
  getSpecializations: async ({ search, isActive } = {}) => {
    const params = {}
    if (search?.trim()) params.search = search.trim()
    if (isActive !== undefined && isActive !== null) params.isActive = isActive
    const res = await apiClient.get('/api/v1/specializations', { params })
    return unwrap(res, 'Không thể tải danh sách lĩnh vực chuyên môn.')
  },

  /**
   * Chi tiết lĩnh vực chuyên môn
   * GET /api/v1/specializations/{id}
   */
  getSpecializationById: async (id) => {
    const res = await apiClient.get(`/api/v1/specializations/${id}`)
    return unwrap(res, 'Không thể tải thông tin lĩnh vực chuyên môn.')
  },

  /**
   * Tạo lĩnh vực chuyên môn mới
   * POST /api/v1/specializations
   */
  createSpecialization: async (payload) => {
    const res = await apiClient.post('/api/v1/specializations', payload)
    return unwrap(res, 'Không thể tạo lĩnh vực chuyên môn mới.')
  },

  /**
   * Cập nhật lĩnh vực chuyên môn
   * PUT /api/v1/specializations/{id}
   */
  updateSpecialization: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/specializations/${id}`, payload)
    return unwrap(res, 'Không thể cập nhật lĩnh vực chuyên môn.')
  },

  /**
   * Xóa lĩnh vực chuyên môn
   * DELETE /api/v1/specializations/{id}
   */
  deleteSpecialization: async (id) => {
    const res = await apiClient.delete(`/api/v1/specializations/${id}`)
    return unwrap(res, 'Không thể xóa lĩnh vực chuyên môn.')
  },

  // ═══════════════════════════════════════════
  // CẤU HÌNH MỨC PHÍ TƯ VẤN (CONSULTATION FEE CONFIGS)
  // ═══════════════════════════════════════════

  /**
   * Lấy danh sách cấu hình mức phí tư vấn
   * GET /api/v1/consultation-fee-configs?sessionType=ONLINE_MEETING&isActive=true
   */
  getFeeConfigs: async ({ sessionType, isActive } = {}) => {
    const params = {}
    if (sessionType) params.sessionType = sessionType
    if (isActive !== undefined && isActive !== null) params.isActive = isActive
    const res = await apiClient.get('/api/v1/consultation-fee-configs', { params })
    return unwrap(res, 'Không thể tải danh sách cấu hình mức phí.')
  },

  /**
   * Chi tiết cấu hình mức phí
   * GET /api/v1/consultation-fee-configs/{id}
   */
  getFeeConfigById: async (id) => {
    const res = await apiClient.get(`/api/v1/consultation-fee-configs/${id}`)
    return unwrap(res, 'Không thể tải thông tin cấu hình mức phí.')
  },

  /**
   * Tạo cấu hình mức phí mới
   * POST /api/v1/consultation-fee-configs
   */
  createFeeConfig: async (payload) => {
    const res = await apiClient.post('/api/v1/consultation-fee-configs', payload)
    return unwrap(res, 'Không thể tạo cấu hình mức phí mới.')
  },

  /**
   * Cập nhật cấu hình mức phí
   * PUT /api/v1/consultation-fee-configs/{id}
   */
  updateFeeConfig: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/consultation-fee-configs/${id}`, payload)
    return unwrap(res, 'Không thể cập nhật cấu hình mức phí.')
  },

  /**
   * Xóa cấu hình mức phí
   * DELETE /api/v1/consultation-fee-configs/{id}
   */
  deleteFeeConfig: async (id) => {
    const res = await apiClient.delete(`/api/v1/consultation-fee-configs/${id}`)
    return unwrap(res, 'Không thể xóa cấu hình mức phí.')
  },

  // ═══════════════════════════════════════════
  // VÍ NỀN TẢNG & SỔ CÁI KÝ QUỸ (ADMIN PLATFORM WALLET & ESCROW LEDGER)
  // ═══════════════════════════════════════════

  /**
   * Lấy tổng quan Ví Nền Tảng & Sổ cái tài chính của Admin
   * GET /api/v1/admin/platform-wallet
   */
  getAdminPlatformWallet: async () => {
    const res = await apiClient.get('/api/v1/admin/platform-wallet')
    return unwrap(res, 'Không thể tải thông tin Ví Nền tảng.')
  },

  /**
   * Lấy danh sách giao dịch ký quỹ Escrow (phân trang, lọc, tìm kiếm, sắp xếp)
   * GET /api/v1/escrow-transactions
   */
  getEscrowTransactions: async ({ page = 1, size = 10, status, search, sort } = {}) => {
    const params = { page, size }
    if (status && status !== '__ALL__') params.status = status
    if (search?.trim()) params.search = search.trim()
    if (sort) params.sort = sort
    const res = await apiClient.get('/api/v1/escrow-transactions', { params })
    return unwrap(res, 'Không thể tải danh sách giao dịch ký quỹ.')
  },

  /**
   * Xem chi tiết ký quỹ của một ca tư vấn
   * GET /api/v1/bookings/{bookingId}/escrow
   */
  getBookingEscrow: async (bookingId) => {
    const res = await apiClient.get(`/api/v1/bookings/${bookingId}/escrow`)
    return unwrap(res, 'Không thể tải thông tin ký quỹ.')
  },

  // ═══════════════════════════════════════════
  // CHÍNH SÁCH SÀN TƯ VẤN & ESCROW (PLATFORM POLICY)
  // ═══════════════════════════════════════════

  /**
   * [Admin] Xem toàn bộ thông số vận hành sàn tư vấn và quy chế Escrow hiện hành
   * GET /api/v1/admin/platform-policy
   */
  getPlatformPolicy: async () => {
    const res = await apiClient.get('/api/v1/admin/platform-policy')
    return unwrap(res, 'Không thể tải thông tin chính sách sàn và Escrow.')
  },

  /**
   * [Admin] Cập nhật các tham số chính sách sàn tư vấn (hoa hồng, thời gian giữ slot, timeout, escrow cooldown...)
   * PUT /api/v1/admin/platform-policy
   */
  updatePlatformPolicy: async (data) => {
    const res = await apiClient.put('/api/v1/admin/platform-policy', data)
    return unwrap(res, 'Không thể cập nhật chính sách sàn tư vấn.')
  },

  // ═══════════════════════════════════════════
  // LỊCH TRÌNH QUYẾT TOÁN THUẾ (TAX SETTLEMENT SCHEDULE)
  // ═══════════════════════════════════════════

  /**
   * [Admin] Lấy cấu hình lịch trình quyết toán thuế TNCN hiện hành
   * GET /api/v1/admin/tax-settlement-schedule?taxYear=...
   */
  getTaxSettlementSchedule: async (taxYear) => {
    const params = taxYear ? { taxYear } : {}
    const res = await apiClient.get('/api/v1/admin/tax-settlement-schedule', { params })
    return unwrap(res, 'Không thể tải lịch trình quyết toán thuế.')
  },

  /**
   * [Admin] Cập nhật hạn chót và các mốc ngày nhắc nhở quyết toán thuế
   * PUT /api/v1/admin/tax-settlement-schedule
   */
  updateTaxSettlementSchedule: async (data) => {
    const res = await apiClient.put('/api/v1/admin/tax-settlement-schedule', data)
    return unwrap(res, 'Không thể cập nhật lịch trình quyết toán thuế.')
  },

  // ═══════════════════════════════════════════
  // XÉT DUYỆT RÚT TIỀN (ADMIN WITHDRAWALS)
  // ═══════════════════════════════════════════

  /**
   * [Admin] Lấy danh sách yêu cầu rút tiền
   * GET /api/v1/admin/withdrawals?status=...&page=1&size=10
   */
  getAdminWithdrawals: async ({ status, page = 1, size = 10 } = {}) => {
    const params = { page, size }
    if (status && status !== '__ALL__') params.status = status
    const res = await apiClient.get('/api/v1/admin/withdrawals', { params })
    return unwrap(res, 'Không thể tải danh sách yêu cầu rút tiền.')
  },

  /**
   * [Admin] Xử lý duyệt hoặc từ chối yêu cầu rút tiền
   * POST /api/v1/admin/withdrawals/{id}/process
   */
  processWithdrawal: async (id, payload) => {
    const res = await apiClient.post(`/api/v1/admin/withdrawals/${id}/process`, payload)
    return unwrap(res, 'Không thể xử lý yêu cầu rút tiền.')
  },

  // ═══════════════════════════════════════════
  // GIẢI QUYẾT KHIẾU NẠI (ADMIN DISPUTES)
  // ═══════════════════════════════════════════

  /**
   * [Admin] Lấy danh sách các vụ khiếu nại tranh chấp
   * GET /api/v1/disputes?status=...&page=1&size=10
   */
  getAdminDisputes: async ({ status, page = 1, size = 10 } = {}) => {
    const params = { page, size }
    if (status && status !== '__ALL__') params.status = status
    const res = await apiClient.get('/api/v1/disputes', { params })
    return unwrap(res, 'Không thể tải danh sách khiếu nại.')
  },

  /**
   * [Admin] Xem chi tiết hồ sơ khiếu nại
   * GET /api/v1/disputes/{id}
   */
  getDisputeDetail: async (id) => {
    const res = await apiClient.get(`/api/v1/disputes/${id}`)
    return unwrap(res, 'Không thể tải chi tiết khiếu nại.')
  },

  /**
   * [Admin] Phán quyết giải quyết tranh chấp
   * POST /api/v1/admin/disputes/{id}/resolve
   */
  resolveDispute: async (id, payload) => {
    const res = await apiClient.post(`/api/v1/admin/disputes/${id}/resolve`, payload)
    return unwrap(res, 'Không thể phán quyết giải quyết khiếu nại.')
  },
}

