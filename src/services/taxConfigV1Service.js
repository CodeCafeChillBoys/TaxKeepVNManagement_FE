import { apiClient } from './apiClient'

/**
 * Service cho tham số hệ thống v1 (role admin).
 * Routing qua ApiGateway: /api/v1/system-configs → backend chính.
 * Tách riêng, KHÔNG dùng chung với systemConfigService (bộ /api/admin/system-configs của AI/OCR).
 */
const BASE = '/api/v1/system-configs'

const isBlank = (v) => v === undefined || v === null || v === ''

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => !isBlank(v)))
}

export const taxConfigV1Service = {
  /**
   * @param {Object} [params] - { page, size, search, sort, isActive, taxYear }
   *   taxYear: chỉ lấy bộ cấu hình đang hiệu lực trong năm tính thuế đó (mỗi key 1 dòng).
   * @returns {Promise<{ items: Array, pagination: Object }>}
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get(BASE, { params: cleanParams(params) })
    return res?.data || res
  },

  /** Lấy theo id: trả cả cấu hình đang tắt. Một key có thể có nhiều dòng (theo năm) nên không gọi theo key. */
  getById: async (id) => {
    const res = await apiClient.get(`${BASE}/id/${encodeURIComponent(id)}`)
    return res?.data || res
  },

  /**
   * appliesFromYear: null = dòng mặc định; 2026 = hiệu lực từ năm 2026.
   * Trùng (configKey, appliesFromYear) → backend trả 409.
   * @returns {Promise<{ data: Object, message: string }>}
   */
  create: async (dto) => {
    const payload = {
      configKey: dto.configKey?.trim(),
      configValue: dto.configValue,
      description: dto.description?.trim() || null,
      appliesFromYear: dto.appliesFromYear ?? null,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    }
    const res = await apiClient.post(BASE, payload)
    return { data: res?.data, message: res?.message }
  },

  /**
   * Cập nhật theo id. LUÔN gửi appliesFromYear: backend coi giá trị khác với dòng hiện tại là
   * đổi năm hiệu lực (thiếu = null = biến dòng theo năm thành dòng mặc định).
   * description rỗng/null = giữ nguyên mô tả cũ (backend không cho xóa mô tả).
   * @returns {Promise<{ data: Object, message: string }>}
   */
  updateById: async (id, dto) => {
    const payload = {
      configValue: dto.configValue,
      description: dto.description?.trim() || null,
      appliesFromYear: dto.appliesFromYear ?? null,
    }
    if (dto.isActive !== undefined) payload.isActive = Boolean(dto.isActive)
    const res = await apiClient.put(`${BASE}/id/${encodeURIComponent(id)}`, payload)
    return { data: res?.data, message: res?.message }
  },
}
