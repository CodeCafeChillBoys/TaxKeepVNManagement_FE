import { useState, useEffect, useCallback, useMemo } from 'react'
import { rolePermissionService } from '@/services/rolePermissionService'
import { PermissionModal } from '@/components/admin/PermissionModal'
import { ConfirmDialog, NotificationDialog } from '@/components/ui/notification-dialog'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { SectionLoading, TableLoadingRow } from '@/components/ui/loading'
import { TablePagination, useClientPagination } from '@/components/ui/table-pagination'
import {
  MANAGE_PERMISSION_CODE,
  isLockedPermission,
  groupPermissions,
  sameIdSet,
} from '@/utils/rolePermissionUtils'

const TABS = [
  { id: 'roles', label: 'Phân quyền theo vai trò', icon: 'admin_panel_settings' },
  { id: 'catalog', label: 'Danh mục quyền', icon: 'list_alt' },
]

const grantedIds = (perms = []) => new Set(perms.filter((p) => p.granted).map((p) => p.id))

export function AdminRolePermissionsPage() {
  const { user } = useAuth()
  const currentUserRole = user?.userRole || user?.role || ''
  const [tab, setTab] = useState('roles')
  const [notice, setNotice] = useState(null)
  const showError = (err, title = 'Không thực hiện được') =>
    setNotice({ type: 'error', title, description: err?.message || 'Vui lòng thử lại sau.' })

  // ── Tab 1: phân quyền theo vai trò ──
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [pendingRoleId, setPendingRoleId] = useState(null)
  const [rolePerms, setRolePerms] = useState([])
  const [original, setOriginal] = useState(new Set())
  const [granted, setGranted] = useState(new Set())
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadedKey, setLoadedKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const debouncedRoleId = useDebounce(selectedRoleId, 120)
  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null
  const permsKey = `${debouncedRoleId}:${reloadKey}`
  const loadingPerms = debouncedRoleId != null && loadedKey !== permsKey
  const dirty = !sameIdSet(original, granted)

  useEffect(() => {
    rolePermissionService
      .getRoles()
      .then((list) => {
        setRoles(list)
        setSelectedRoleId((id) => id ?? list[0]?.id ?? null)
      })
      .catch((err) => showError(err, 'Không tải được danh sách vai trò'))
      .finally(() => setLoadingRoles(false))
  }, [])

  useEffect(() => {
    if (debouncedRoleId == null) return
    let mounted = true
    const key = `${debouncedRoleId}:${reloadKey}`
    rolePermissionService
      .getRolePermissions(debouncedRoleId)
      .then((res) => {
        if (!mounted) return
        const perms = res?.permissions || []
        setRolePerms(perms)
        setOriginal(grantedIds(perms))
        setGranted(grantedIds(perms))
      })
      .catch((err) => mounted && showError(err, 'Không tải được quyền của vai trò'))
      .finally(() => mounted && setLoadedKey(key))
    return () => {
      mounted = false
    }
  }, [debouncedRoleId, reloadKey])

  const groups = useMemo(() => groupPermissions(rolePerms, debouncedSearch), [rolePerms, debouncedSearch])

  const chooseRole = (id) => {
    if (id === selectedRoleId) return
    if (dirty) setPendingRoleId(id)
    else setSelectedRoleId(id)
  }

  const toggle = (perm, on) => {
    if (isLockedPermission(selectedRole, perm, currentUserRole)) return
    setGranted((prev) => {
      const next = new Set(prev)
      on ? next.add(perm.id) : next.delete(perm.id)
      return next
    })
  }

  const toggleGroup = (items, on) => {
    setGranted((prev) => {
      const next = new Set(prev)
      for (const p of items) {
        if (isLockedPermission(selectedRole, p, currentUserRole)) continue
        on ? next.add(p.id) : next.delete(p.id)
      }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await rolePermissionService.updateRolePermissions(selectedRoleId, [...granted])
      const perms = res?.permissions || rolePerms
      setRolePerms(perms)
      setOriginal(grantedIds(perms))
      setGranted(grantedIds(perms))
      setNotice({
        type: 'success',
        title: 'Đã lưu phân quyền',
        description: `Vai trò "${selectedRole?.name}" hiện có ${grantedIds(perms).size} quyền. Thay đổi áp dụng ngay cho người dùng thuộc vai trò này.`,
      })
    } catch (err) {
      showError(err, 'Không lưu được phân quyền')
    } finally {
      setSaving(false)
    }
  }

  // ── Tab 2: danh mục quyền ──
  const [catalog, setCatalog] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [modal, setModal] = useState(null) // { mode, data }
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const debouncedCatalogSearch = useDebounce(catalogSearch, 300)

  const loadCatalog = useCallback(() => {
    setLoadingCatalog(true)
    rolePermissionService
      .getPermissions()
      .then(setCatalog)
      .catch((err) => showError(err, 'Không tải được danh mục quyền'))
      .finally(() => setLoadingCatalog(false))
  }, [])

  const openTab = (id) => {
    setTab(id)
    if (id === 'catalog') loadCatalog()
  }

  const catalogGroups = useMemo(() => groupPermissions(catalog, debouncedCatalogSearch), [catalog, debouncedCatalogSearch])
  const catalogItems = useMemo(() => catalogGroups.flatMap(({ items }) => items), [catalogGroups])
  const catalogPagination = useClientPagination(catalogItems, 10)
  const groupSuggestions = useMemo(() => [...new Set(catalog.map((p) => p.groupName).filter(Boolean))], [catalog])

  const afterCatalogChange = () => {
    loadCatalog()
    setReloadKey((k) => k + 1) // tab vai trò cần thấy quyền mới/đã xóa
  }

  const submitPermission = async (form) => {
    setSubmitting(true)
    try {
      if (modal.mode === 'create') await rolePermissionService.createPermission(form)
      else await rolePermissionService.updatePermission(modal.data.id, form)
      setModal(null)
      afterCatalogChange()
      setNotice({
        type: 'success',
        title: modal.mode === 'create' ? 'Đã thêm quyền' : 'Đã cập nhật quyền',
        description:
          modal.mode === 'create'
            ? 'Quyền mới chưa được gán cho vai trò nào. Hãy sang tab "Phân quyền theo vai trò" để gán.'
            : 'Tên và nhóm quyền đã được cập nhật.',
      })
    } catch (err) {
      showError(err, 'Không lưu được quyền')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await rolePermissionService.deletePermission(deleteTarget.id)
      setDeleteTarget(null)
      afterCatalogChange()
    } catch (err) {
      setDeleteTarget(null)
      showError(err, 'Không xóa được quyền')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-space-xl flex flex-col gap-space-lg">
      <div className="flex flex-col gap-1">
        <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">QUẢN TRỊ TRUY CẬP</span>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Phân quyền hệ thống</h2>
        <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
          Chọn vai trò rồi tick các quyền được phép. Thay đổi áp dụng ngay sau khi lưu cho mọi tài khoản thuộc vai trò đó.
        </p>
      </div>

      <div className="flex gap-2 border-b border-outline-variant/30 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => openTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px cursor-pointer whitespace-nowrap shrink-0 ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-space-lg items-start">
          {/* Danh sách vai trò */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs p-2 flex flex-col gap-1">
            {loadingRoles && (
              <SectionLoading title="Đang tải vai trò..." minHeight="min-h-[120px]" size="sm" />
            )}
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => chooseRole(r.id)}
                className={`text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer ${
                  r.id === selectedRoleId ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="text-sm font-bold">{r.name}</span>
                {!r.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                    Tạm tắt
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Ma trận quyền của vai trò đang chọn */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container-high/60">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">{selectedRole?.name || 'Chưa chọn vai trò'}</span>
                <span className="text-xs text-on-surface-variant">
                  Đang bật {granted.size}/{rolePerms.length} quyền{dirty ? ' · có thay đổi chưa lưu' : ''}
                </span>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm tên hoặc nhóm quyền..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[18px]">search</span>
                </div>
                <button
                  disabled={!dirty || saving}
                  onClick={() => setGranted(new Set(original))}
                  className="h-9 px-3 rounded-lg border border-outline-variant/50 text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Hoàn tác
                </button>
                <button
                  disabled={!dirty || saving}
                  onClick={save}
                  className="h-9 px-4 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
                </button>
              </div>
            </div>

            {loadingPerms ? (
              <SectionLoading title="Đang tải quyền của vai trò..." minHeight="min-h-[200px]" />
            ) : groups.length === 0 ? (
              <p className="p-space-lg text-xs text-on-surface-variant">Không có quyền nào khớp từ khóa.</p>
            ) : (
              <div className="divide-y divide-surface-container-high/50">
                {groups.map(({ group, items }) => {
                  const onCount = items.filter((p) => granted.has(p.id)).length
                  return (
                    <div key={group} className="p-space-md">
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-700"
                          checked={onCount === items.length}
                          ref={(el) => el && (el.indeterminate = onCount > 0 && onCount < items.length)}
                          onChange={(e) => toggleGroup(items, e.target.checked)}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">{group}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          ({onCount}/{items.length})
                        </span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pl-6">
                        {items.map((p) => {
                          const locked = isLockedPermission(selectedRole, p, currentUserRole)
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 py-1 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              title={locked ? 'Không thể gỡ quyền quản trị phân quyền khỏi vai trò của chính bạn' : p.name}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 mt-0.5 accent-brand-700"
                                checked={granted.has(p.id)}
                                disabled={locked}
                                onChange={(e) => toggle(p, e.target.checked)}
                              />
                              <span className="flex flex-col">
                                <span className="text-sm text-on-surface">{p.name}</span>
                                {locked && (
                                  <span className="text-[11px] text-on-surface-variant">
                                    Khóa để tránh mất quyền truy cập trang này
                                  </span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'catalog' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container-high/60">
            <div className="relative w-full md:w-80">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Tìm tên hoặc nhóm quyền..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:outline-none"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[18px]">search</span>
            </div>
            <button
              onClick={() => setModal({ mode: 'create', data: null })}
              className="h-9 px-4 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Thêm quyền
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container-low/70 text-secondary font-bold text-xs uppercase tracking-wider border-b border-surface-container-high">
                  <th className="py-3 px-4">Tên quyền</th>
                  <th className="py-3 px-4">Nhóm</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {catalogPagination.paginatedItems.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/30">
                    <td className="py-2.5 px-4 font-medium text-on-surface">{p.name}</td>
                    <td className="py-2.5 px-4 text-xs text-on-surface-variant">{p.groupName}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModal({ mode: 'edit', data: p })}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 cursor-pointer"
                        title="Sửa tên, nhóm"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {p.code !== MANAGE_PERMISSION_CODE && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 cursor-pointer"
                          title="Xóa quyền"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {loadingCatalog && (
                  <TableLoadingRow colSpan={3} title="Đang tải danh mục quyền..." />
                )}
                {!loadingCatalog && catalogGroups.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-xs text-on-surface-variant">
                      Không có quyền nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!loadingCatalog && catalogItems.length > 0 && (
            <TablePagination
              page={catalogPagination.page}
              totalPages={catalogPagination.totalPages}
              totalItems={catalogPagination.totalItems}
              pageSize={catalogPagination.pageSize}
              onPageChange={catalogPagination.setPage}
              itemLabel="quyền"
            />
          )}
        </div>
      )}

      {modal && (
        <PermissionModal
          key={modal.data?.id ?? 'new'}
          mode={modal.mode}
          initialData={modal.data}
          groupSuggestions={groupSuggestions}
          isSubmitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={submitPermission}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        type="destructive"
        title="Xóa quyền"
        description={`Xóa quyền "${deleteTarget?.name}"? Quyền đang được gán cho vai trò nào thì phải thu hồi trước mới xóa được.`}
        confirmText="Xóa quyền"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={pendingRoleId != null}
        onOpenChange={(o) => !o && setPendingRoleId(null)}
        type="warning"
        title="Bỏ thay đổi chưa lưu?"
        description={`Vai trò "${selectedRole?.name}" có thay đổi chưa lưu. Chuyển sang vai trò khác sẽ bỏ các thay đổi này.`}
        confirmText="Bỏ thay đổi"
        cancelText="Ở lại"
        onConfirm={() => {
          setSelectedRoleId(pendingRoleId)
          setPendingRoleId(null)
        }}
        onCancel={() => setPendingRoleId(null)}
      />

      <NotificationDialog
        open={!!notice}
        onOpenChange={(o) => !o && setNotice(null)}
        type={notice?.type}
        title={notice?.title}
        description={notice?.description}
        onConfirm={() => setNotice(null)}
      />
    </div>
  )
}
