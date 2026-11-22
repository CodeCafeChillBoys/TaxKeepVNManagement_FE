import { apiClient } from './apiClient'
import { pickApiErrorMessage } from '@/utils/apiErrorCatalog'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res.data : res
  if (body?.success === false) {
    throw new Error(pickApiErrorMessage(body?.errorCode, body?.message, fallbackMsg))
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service quản trị danh sách & cấu hình API Key AI (Gemini, etc.) trên hệ thống (Admin)
 * Kết nối Controller: AdminAiKeyController (/api/v1/admin/ai-keys)
 */
export const adminAiKeyService = {
  /**
   * Lấy danh sách toàn bộ API Key AI trong hệ thống (Đã mask bảo mật)
   * GET /api/v1/admin/ai-keys
   * @returns {Promise<Array<{
   *   id: string,
   *   provider: string,
   *   key_name: string,
   *   masked_api_key: string,
   *   priority: number,
   *   is_active: boolean,
   *   status: string,
   *   request_count: number,
   *   last_used_at: string|null,
   *   cooldown_until: string|null,
   *   created_at: string
   * }>>}
   */
  getAllKeys: async () => {
    const res = await apiClient.get('/api/v1/admin/ai-keys')
    const data = unwrap(res, 'Không thể tải danh sách API Key AI.')
    return Array.isArray(data) ? data : (data?.items || [])
  },

  /**
   * Thêm mới API Key AI vào hệ thống (BE sẽ tự động test key trên Google trước khi lưu)
   * POST /api/v1/admin/ai-keys
   * @param {{
   *   key_name: string,
   *   api_key: string,
   *   provider?: string,
   *   priority?: number
   * }} payload
   */
  createKey: async (payload) => {
    const body = {
      key_name: payload.key_name?.trim(),
      api_key: payload.api_key?.trim(),
      provider: (payload.provider || 'GEMINI').trim().toUpperCase(),
      priority: Number(payload.priority ?? 1),
    }
    const res = await apiClient.post('/api/v1/admin/ai-keys', body)
    return unwrap(res, 'Không thể tạo mới API Key AI.')
  },

  /**
   * Admin cập nhật cấu hình API Key (Tên gợi nhớ, Độ ưu tiên, Bật/Tắt, Trạng thái)
   * PUT /api/v1/admin/ai-keys/{id}
   * @param {string} id
   * @param {{
   *   key_name?: string,
   *   priority?: number,
   *   is_active?: boolean,
   *   status?: string
   * }} payload
   */
  updateKey: async (id, payload) => {
    const body = {}
    if (payload.key_name !== undefined) body.key_name = payload.key_name.trim()
    if (payload.priority !== undefined) body.priority = Number(payload.priority)
    if (payload.is_active !== undefined) body.is_active = Boolean(payload.is_active)
    if (payload.status !== undefined) body.status = payload.status

    const res = await apiClient.put(`/api/v1/admin/ai-keys/${id}`, body)
    return unwrap(res, 'Không thể cập nhật API Key AI.')
  },

  /**
   * Bật/Tắt nhanh trạng thái kích hoạt của API Key
   * @param {string} id
   * @param {boolean} currentStatus
   */
  toggleActive: async (id, currentStatus) => {
    return adminAiKeyService.updateKey(id, { is_active: !currentStatus })
  },

  /**
   * Admin xóa API Key khỏi hệ thống
   * DELETE /api/v1/admin/ai-keys/{id}
   * @param {string} id
   */
  deleteKey: async (id) => {
    const res = await apiClient.delete(`/api/v1/admin/ai-keys/${id}`)
    return unwrap(res, 'Không thể xóa API Key AI.')
  },
}

