import { apiClient } from './apiClient'

/**
 * Phân quyền admin: vai trò (api/v1/roles) và danh mục quyền (api/v1/permissions).
 * Cả hai nhóm API đều yêu cầu quyền admin.role_permission.manage.
 */
export const rolePermissionService = {
  /** Danh sách vai trò: [{ id, code, name, isActive }] */
  getRoles: async () => {
    const res = await apiClient.get('/api/v1/roles')
    return res?.data || []
  },

  /** Toàn bộ quyền kèm cờ granted của một vai trò: { roleId, roleName, permissions: [...] } */
  getRolePermissions: async (roleId) => {
    const res = await apiClient.get(`/api/v1/roles/${roleId}/permissions`)
    return res?.data
  },

  /** Ghi đè danh sách quyền của vai trò; mảng rỗng là thu hồi hết */
  updateRolePermissions: async (roleId, permissionIds) => {
    const res = await apiClient.put(`/api/v1/roles/${roleId}/permissions`, { permissionIds })
    return res?.data
  },

  getPermissions: async () => {
    const res = await apiClient.get('/api/v1/permissions')
    return res?.data || []
  },

  createPermission: async ({ code, name, groupName }) => {
    const res = await apiClient.post('/api/v1/permissions', {
      code: code.trim().toLowerCase(),
      name: name.trim(),
      groupName: groupName.trim(),
    })
    return res?.data
  },

  /** BE không cho đổi mã quyền, chỉ đổi tên và nhóm */
  updatePermission: async (id, { name, groupName }) => {
    const res = await apiClient.put(`/api/v1/permissions/${id}`, {
      name: name.trim(),
      groupName: groupName.trim(),
    })
    return res?.data
  },

  deletePermission: async (id) => {
    await apiClient.delete(`/api/v1/permissions/${id}`)
  },
}
