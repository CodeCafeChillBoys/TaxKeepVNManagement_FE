import { apiClient } from './apiClient'

/**
 * Danh mục nhóm & quan hệ người phụ thuộc (bảng catalog của BE).
 * - GET /api/v1/dependents/catalog: chỉ nhóm/quan hệ đang active (app người dùng).
 * - /api/v1/admin/dependent-groups, /api/v1/admin/dependent-relationships: CRUD cho Admin,
 *   trả cả nhóm chờ duyệt (source = AI, isActive = false).
 */
const GROUPS = '/api/v1/admin/dependent-groups'
const RELATIONSHIPS = '/api/v1/admin/dependent-relationships'

const code = (c) => encodeURIComponent(String(c).trim())
const toIntOrNull = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10))

// Mã do BE chuẩn hóa A-Z, 0-9, _ nên gửi sẵn chữ hoa
const groupFields = (form) => ({
  name: form.name?.trim(),
  relationshipCode: form.relationshipCode?.trim() || null,
  minAge: toIntOrNull(form.minAge),
  maxAge: toIntOrNull(form.maxAge),
  requireDisabled: Boolean(form.requireDisabled),
  requireStudying: Boolean(form.requireStudying),
  level: toIntOrNull(form.level) ?? 0,
  displayOrder: toIntOrNull(form.displayOrder) ?? 0,
})

export const dependentCatalogService = {
  getCatalog: async () => {
    const res = await apiClient.get('/api/v1/dependents/catalog')
    return res?.data || { relationships: [], groups: [] }
  },

  /** @param {boolean} [isActive] bỏ trống = lấy cả nhóm chờ duyệt */
  listGroups: async (isActive) => {
    const res = await apiClient.get(GROUPS, { params: isActive === undefined ? {} : { isActive } })
    return res?.data || []
  },

  createGroup: async (form) => {
    const res = await apiClient.post(GROUPS, {
      code: form.code.trim().toUpperCase(),
      ...groupFields(form),
      isActive: form.isActive !== undefined ? Boolean(form.isActive) : true,
    })
    return res?.data
  },

  updateGroup: async (groupCode, form) => {
    const res = await apiClient.put(`${GROUPS}/${code(groupCode)}`, {
      ...groupFields(form),
      isActive: form.isActive !== undefined ? Boolean(form.isActive) : undefined,
    })
    return res?.data
  },

  deleteGroup: async (groupCode) => {
    await apiClient.delete(`${GROUPS}/${code(groupCode)}`)
  },

  /** Bật nhóm do AI đề xuất; BE bắt buộc relationshipCode */
  activateGroup: async (groupCode, form) => {
    const res = await apiClient.patch(`${GROUPS}/${code(groupCode)}/activate`, groupFields(form))
    return res?.data
  },

  listRelationships: async (isActive) => {
    const res = await apiClient.get(RELATIONSHIPS, { params: isActive === undefined ? {} : { isActive } })
    return res?.data || []
  },

  createRelationship: async (form) => {
    const res = await apiClient.post(RELATIONSHIPS, {
      code: form.code.trim().toUpperCase(),
      name: form.name?.trim(),
      displayOrder: toIntOrNull(form.displayOrder) ?? 0,
      isActive: form.isActive !== undefined ? Boolean(form.isActive) : true,
    })
    return res?.data
  },

  updateRelationship: async (relCode, form) => {
    const res = await apiClient.put(`${RELATIONSHIPS}/${code(relCode)}`, {
      name: form.name?.trim(),
      displayOrder: toIntOrNull(form.displayOrder) ?? 0,
      isActive: form.isActive !== undefined ? Boolean(form.isActive) : undefined,
    })
    return res?.data
  },

  deleteRelationship: async (relCode) => {
    await apiClient.delete(`${RELATIONSHIPS}/${code(relCode)}`)
  },
}
