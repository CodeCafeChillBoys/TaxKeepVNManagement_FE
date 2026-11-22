/** Quyền mở trang phân quyền; gỡ khỏi vai trò của chính mình là tự khóa mình ngoài trang */
export const MANAGE_PERMISSION_CODE = 'admin.role_permission.manage'

/** Giống regex của BE (CreatePermissionDto): chữ thường, phân đoạn bằng dấu chấm, ví dụ document.create */
export const PERMISSION_CODE_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/

const norm = (s) => String(s || '').trim().toLowerCase()

/** Quyền không được bỏ tick: quyền quản trị phân quyền trên vai trò của người đang đăng nhập */
export function isLockedPermission(role, permission, currentUserRole) {
  return (
    !!role &&
    norm(role.code) === norm(currentUserRole) &&
    norm(permission?.code) === MANAGE_PERMISSION_CODE
  )
}

/** Gom quyền theo nhóm, lọc theo từ khóa trên mã/tên/nhóm; giữ thứ tự nhóm như BE trả */
export function groupPermissions(permissions = [], keyword = '') {
  const k = norm(keyword)
  const groups = new Map()
  for (const p of permissions) {
    if (k && ![p.code, p.name, p.groupName].some((v) => norm(v).includes(k))) continue
    const g = p.groupName || 'Khác'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(p)
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }))
}

export function sameIdSet(a, b) {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

export function validatePermissionForm({ code, name, groupName }, isCreate) {
  const errors = {}
  if (isCreate) {
    const c = norm(code)
    if (!c) errors.code = 'Vui lòng nhập mã quyền.'
    else if (c.length > 100) errors.code = 'Mã quyền tối đa 100 ký tự.'
    else if (!PERMISSION_CODE_PATTERN.test(c))
      errors.code = 'Mã quyền gồm chữ thường không dấu và số, ngăn cách bằng dấu chấm (VD: document.create).'
  }
  if (!String(name || '').trim()) errors.name = 'Vui lòng nhập tên quyền.'
  else if (name.trim().length > 150) errors.name = 'Tên quyền tối đa 150 ký tự.'
  if (!String(groupName || '').trim()) errors.groupName = 'Vui lòng nhập nhóm quyền.'
  else if (groupName.trim().length > 100) errors.groupName = 'Nhóm quyền tối đa 100 ký tự.'
  return errors
}
