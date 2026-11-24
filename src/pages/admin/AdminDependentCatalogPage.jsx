import { useState, useEffect, useRef, useMemo } from 'react'
import { dependentCatalogService } from '@/services/dependentCatalogService'
import { ConfirmDeactivateModal } from '@/components/admin/tax-parameters/ConfirmDeactivateModal'
import { DependentGroupModal } from '@/components/admin/dependent-catalog/DependentGroupModal'
import { DependentRelationshipModal } from '@/components/admin/dependent-catalog/DependentRelationshipModal'
import { TableLoadingRow } from '@/components/ui/loading'
import {
  isPendingGroup,
  filterPendingGroups,
  sortByDisplayOrder,
  catalogName,
  formatAgeRange,
} from '@/utils/dependentCatalogUtils'

const thCls = 'py-3.5 px-4 whitespace-nowrap'
const tdCls = 'py-3.5 px-4 align-middle'
const iconBtn =
  'p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors'

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        active
          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25'
          : 'bg-stone-200 text-stone-600 border-stone-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
      {active ? 'Đang áp dụng' : 'Tạm dừng'}
    </span>
  )
}

function Flag({ on }) {
  return on ? (
    <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
  ) : (
    <span className="text-on-surface-variant/50">—</span>
  )
}

export function AdminDependentCatalogPage() {
  const [tab, setTab] = useState('relationships') // 'relationships' | 'groups'
  const [relationships, setRelationships] = useState([])
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [pendingOnly, setPendingOnly] = useState(false)

  const [relModal, setRelModal] = useState(null) // { mode, item }
  const [groupModal, setGroupModal] = useState(null) // { mode: 'create'|'edit'|'activate', item }
  const [deleteTarget, setDeleteTarget] = useState(null) // { kind: 'group'|'relationship', item }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const reload = () => setReloadTick((t) => t + 1)

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setIsLoading(true)
      try {
        const [rels, grps] = await Promise.all([
          dependentCatalogService.listRelationships(),
          dependentCatalogService.listGroups(),
        ])
        if (!alive) return
        setRelationships(sortByDisplayOrder(rels || []))
        setGroups(sortByDisplayOrder(grps || []))
        setLoadError('')
      } catch (err) {
        if (alive) setLoadError(err?.message || 'Không tải được danh mục nhóm & quan hệ người phụ thuộc.')
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [reloadTick])

  const pendingGroups = useMemo(() => filterPendingGroups(groups), [groups])
  const visibleGroups = pendingOnly ? pendingGroups : groups

  // Lỗi được hiển thị bằng thông báo BE (GROUP_HAS_ACTIVE_RULES, DUPLICATE_GROUP, RELATIONSHIP_REQUIRED...)
  const run = async (call, successMessage, onDone) => {
    setIsSubmitting(true)
    try {
      await call()
      showToast('success', successMessage)
      onDone?.()
      reload()
    } catch (err) {
      showToast('error', err?.message || 'Thao tác không thành công.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRelationship = (form) =>
    run(
      () =>
        relModal.mode === 'create'
          ? dependentCatalogService.createRelationship(form)
          : dependentCatalogService.updateRelationship(relModal.item.code, form),
      relModal.mode === 'create' ? 'Đã thêm quan hệ người phụ thuộc.' : 'Đã cập nhật quan hệ người phụ thuộc.',
      () => setRelModal(null)
    )

  const submitGroup = (form) => {
    const { mode, item } = groupModal
    const call =
      mode === 'create'
        ? () => dependentCatalogService.createGroup(form)
        : mode === 'activate'
        ? () => dependentCatalogService.activateGroup(item.code, form)
        : () => dependentCatalogService.updateGroup(item.code, form)
    const message =
      mode === 'create'
        ? 'Đã thêm nhóm người phụ thuộc.'
        : mode === 'activate'
        ? `Đã duyệt và kích hoạt nhóm "${form.name}".`
        : 'Đã cập nhật nhóm người phụ thuộc.'
    return run(call, message, () => setGroupModal(null))
  }

  const confirmDelete = () => {
    const { kind, item } = deleteTarget
    return run(
      () =>
        kind === 'group'
          ? dependentCatalogService.deleteGroup(item.code)
          : dependentCatalogService.deleteRelationship(item.code),
      kind === 'group' ? `Đã xóa nhóm "${item.name}".` : `Đã xóa quan hệ "${item.name}".`
    ).finally(() => setDeleteTarget(null))
  }

  const tabBtn = (id, icon, text, badge) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
        tab === id ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span>{text}</span>
      {badge > 0 && (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-space-xl flex flex-col gap-space-lg">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] max-w-md px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <div>
            <strong>{toast.type === 'error' ? 'Lỗi' : 'Thành công'}:</strong> {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Nhóm &amp; quan hệ người phụ thuộc</h2>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Danh mục quan hệ và nhóm điều kiện người phụ thuộc mà ứng dụng dùng khi đăng ký, đổi nhóm và kiểm tra giấy tờ.
            Nhóm do AI đề xuất cần được duyệt trước khi áp dụng.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            tab === 'relationships' ? setRelModal({ mode: 'create', item: null }) : setGroupModal({ mode: 'create', item: null })
          }
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>{tab === 'relationships' ? 'Thêm quan hệ' : 'Thêm nhóm'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1 overflow-x-auto">
        {tabBtn('relationships', 'diversity_3', `Quan hệ (${relationships.length})`)}
        {tabBtn('groups', 'groups', `Nhóm (${groups.length})`, pendingGroups.length)}
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5 shrink-0">error</span>
          <div className="flex-1">
            <strong>Không tải được danh mục.</strong>
            <span className="block text-[13px] mt-0.5">{loadError}</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {tab === 'groups' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-outline-variant/40 p-0.5 bg-surface-container-low">
            {[
              { value: false, label: `Tất cả (${groups.length})` },
              { value: true, label: `Chờ duyệt (${pendingGroups.length})` },
            ].map((f) => (
              <button
                key={String(f.value)}
                type="button"
                onClick={() => setPendingOnly(f.value)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  pendingOnly === f.value
                    ? `bg-surface-container-lowest shadow-xs ${f.value ? 'text-amber-700' : 'text-on-surface'}`
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={reload} title="Làm mới danh sách" className={iconBtn}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
        <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          {tab === 'relationships' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/50">
                <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                  <th className={thCls}>Mã</th>
                  <th className={thCls}>Tên quan hệ</th>
                  <th className={`${thCls} text-center`}>Thứ tự</th>
                  <th className={`${thCls} text-center`}>Trạng thái</th>
                  <th className={`${thCls} text-center w-[110px]`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {relationships.map((r) => (
                  <tr key={r.code} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className={`${tdCls} font-mono text-[11px] text-on-surface-variant`}>{r.code}</td>
                    <td className={`${tdCls} font-semibold text-on-surface`}>{r.name}</td>
                    <td className={`${tdCls} text-center tabular-nums`}>{r.displayOrder}</td>
                    <td className={`${tdCls} text-center`}>
                      <StatusBadge active={r.isActive} />
                    </td>
                    <td className={`${tdCls} text-center whitespace-nowrap`}>
                      <button type="button" title="Sửa quan hệ" className={iconBtn} onClick={() => setRelModal({ mode: 'edit', item: r })}>
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        title="Xóa quan hệ"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        onClick={() => setDeleteTarget({ kind: 'relationship', item: r })}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {isLoading && relationships.length === 0 && <TableLoadingRow colSpan={5} title="Đang tải danh mục quan hệ..." />}
                {!isLoading && relationships.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-on-surface-variant text-xs">
                      Chưa có quan hệ người phụ thuộc nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/50">
                <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                  <th className={thCls}>Nhóm</th>
                  <th className={thCls}>Quan hệ</th>
                  <th className={`${thCls} text-center`}>Tuổi</th>
                  <th className={`${thCls} text-center`}>Khuyết tật</th>
                  <th className={`${thCls} text-center`}>Đi học</th>
                  <th className={`${thCls} text-center`}>Level</th>
                  <th className={`${thCls} text-center`}>Thứ tự</th>
                  <th className={`${thCls} text-center`}>Trạng thái</th>
                  <th className={`${thCls} text-center w-[150px]`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {visibleGroups.map((g) => {
                  const pending = isPendingGroup(g)
                  return (
                    <tr key={g.code} className={`hover:bg-surface-container-low/60 transition-colors ${pending ? 'bg-amber-50/40' : ''}`}>
                      <td className={tdCls}>
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface leading-snug">{g.name}</span>
                          <span className="font-mono text-[10px] text-on-surface-variant/80">{g.code}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {g.relationshipCode ? (
                          catalogName(relationships, g.relationshipCode)
                        ) : (
                          <span className="text-amber-700 font-semibold">Chưa gán</span>
                        )}
                      </td>
                      <td className={`${tdCls} text-center tabular-nums whitespace-nowrap`}>{formatAgeRange(g.minAge, g.maxAge)}</td>
                      <td className={`${tdCls} text-center`}>
                        <Flag on={g.requireDisabled} />
                      </td>
                      <td className={`${tdCls} text-center`}>
                        <Flag on={g.requireStudying} />
                      </td>
                      <td className={`${tdCls} text-center tabular-nums`}>{g.level}</td>
                      <td className={`${tdCls} text-center tabular-nums`}>{g.displayOrder}</td>
                      <td className={`${tdCls} text-center whitespace-nowrap`}>
                        {pending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                            Chờ duyệt
                          </span>
                        ) : (
                          <StatusBadge active={g.isActive} />
                        )}
                      </td>
                      <td className={`${tdCls} text-center whitespace-nowrap`}>
                        {pending && (
                          <button
                            type="button"
                            onClick={() => setGroupModal({ mode: 'activate', item: g })}
                            className="mr-1 px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container cursor-pointer"
                          >
                            Duyệt
                          </button>
                        )}
                        <button type="button" title="Sửa nhóm" className={iconBtn} onClick={() => setGroupModal({ mode: 'edit', item: g })}>
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          title="Xóa nhóm"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                          onClick={() => setDeleteTarget({ kind: 'group', item: g })}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {isLoading && groups.length === 0 && <TableLoadingRow colSpan={9} title="Đang tải danh mục nhóm..." />}
                {!isLoading && visibleGroups.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-on-surface-variant text-xs">
                      {pendingOnly ? 'Không có nhóm nào đang chờ duyệt.' : 'Chưa có nhóm người phụ thuộc nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {relModal && (
        <DependentRelationshipModal
          key={`${relModal.mode}-${relModal.item?.code ?? 'new'}`}
          mode={relModal.mode}
          initialData={relModal.item}
          isSubmitting={isSubmitting}
          onClose={() => setRelModal(null)}
          onSubmit={submitRelationship}
        />
      )}

      {groupModal && (
        <DependentGroupModal
          key={`${groupModal.mode}-${groupModal.item?.code ?? 'new'}`}
          mode={groupModal.mode}
          initialData={groupModal.item}
          relationships={relationships}
          isSubmitting={isSubmitting}
          onClose={() => setGroupModal(null)}
          onSubmit={submitGroup}
        />
      )}

      {deleteTarget && (
        <ConfirmDeactivateModal
          mode="delete"
          item={deleteTarget.item}
          itemName={deleteTarget.item.name}
          itemCode={deleteTarget.item.code}
          copyOverride={
            deleteTarget.kind === 'group'
              ? {
                  title: 'Xóa nhóm người phụ thuộc?',
                  body: 'Nhóm sẽ bị xóa khỏi danh mục. Không xóa được khi nhóm còn quy tắc giấy tờ đang áp dụng; hãy tắt các quy tắc đó trước.',
                }
              : {
                  title: 'Xóa quan hệ người phụ thuộc?',
                  body: 'Quan hệ sẽ bị xóa khỏi danh mục. Không xóa được khi còn nhóm thuộc quan hệ này.',
                }
          }
          isSubmitting={isSubmitting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
