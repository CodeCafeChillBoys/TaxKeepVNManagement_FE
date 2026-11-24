import { useState, useEffect, useMemo } from 'react'
import { medicalCategoryService } from '@/services/medicalCategoryService'
import { MedicalCategoryModal } from '@/components/admin/MedicalCategoryModal'
import { ConfirmDialog } from '@/components/ui/notification-dialog'
import { SECTION_OPTIONS, sectionLabel, splitKeywords, filterCategories } from '@/utils/medicalCategoryUtils'
import { useDebounce } from '@/hooks/useDebounce'
import { TableLoadingRow } from '@/components/ui/loading'
import { TablePagination, useClientPagination } from '@/components/ui/table-pagination'

const selectClass =
  'h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:outline-none cursor-pointer'

export function MedicalCategoryTab({ onShowToast }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: 'active', eligibility: 'all', section: 'all' })
  const [modal, setModal] = useState(null) // { mode, data }
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const toast = (title, message, type = 'success') => onShowToast?.(title, message, type)

  const reload = () =>
    medicalCategoryService
      .getAll()
      .then(setItems)
      .catch((err) => toast('Không tải được danh mục y tế', err?.message, 'error'))
      .finally(() => setIsLoading(false))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tải một lần khi mở tab
  }, [])

  const debouncedSearch = useDebounce(filters.search, 300)
  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  )
  const visible = useMemo(() => filterCategories(items, debouncedFilters), [items, debouncedFilters])
  const categoriesPagination = useClientPagination(visible, 10)
  const activeCount = items.filter((c) => !c.isDeleted).length
  const deletedCodes = useMemo(() => items.filter((c) => c.isDeleted).map((c) => c.categoryCode), [items])
  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (form) => {
    setSubmitting(true)
    try {
      if (modal.mode === 'create') await medicalCategoryService.create(form)
      else await medicalCategoryService.update(modal.data.id, form)
      toast(modal.mode === 'create' ? 'Đã thêm danh mục' : 'Đã cập nhật danh mục', 'Áp dụng cho các bảng kê tải lên từ bây giờ.')
      setModal(null)
      await reload()
    } catch (err) {
      toast('Không lưu được danh mục', err?.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    setBusyId(deleting.id)
    try {
      await medicalCategoryService.delete(deleting.id)
      toast('Đã xóa danh mục', `"${deleting.categoryName}" chuyển sang mục Đã xóa, có thể khôi phục.`)
      setDeleting(null)
      await reload()
    } catch (err) {
      toast('Không xóa được danh mục', err?.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const restore = async (item) => {
    setBusyId(item.id)
    try {
      await medicalCategoryService.restore(item.id)
      toast('Đã khôi phục danh mục', `"${item.categoryName}" được dùng lại khi đọc bảng kê.`)
      await reload()
    } catch (err) {
      toast('Không khôi phục được danh mục', err?.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface-variant text-xs flex items-start gap-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5 shrink-0">info</span>
        <span className="leading-relaxed">
          Khi người nộp thuế tải lên <strong className="text-on-surface">bảng kê chi phí khám chữa bệnh</strong>, hệ thống đối chiếu danh mục này (tên khoản mục, mô tả, từ khóa) để phân loại từng dòng chi phí vào nhóm <strong className="text-on-surface">được giảm trừ</strong> hoặc <strong className="text-on-surface">loại trừ</strong>. Thay đổi áp dụng cho các hồ sơ tải lên tiếp theo.
        </span>
      </div>

      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.status} onChange={setFilter('status')} className={selectClass}>
            <option value="active">Đang áp dụng ({activeCount})</option>
            <option value="deleted">Đã xóa ({items.length - activeCount})</option>
            <option value="all">Tất cả</option>
          </select>
          <select value={filters.eligibility} onChange={setFilter('eligibility')} className={selectClass}>
            <option value="all">Mọi kết quả</option>
            <option value="eligible">Được giảm trừ</option>
            <option value="excluded">Loại trừ</option>
          </select>
          <select value={filters.section} onChange={setFilter('section')} className={selectClass}>
            <option value="all">Mọi mục bảng kê</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>{`Mục ${s.code} · ${s.name}`}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-72">
            <input
              value={filters.search}
              onChange={setFilter('search')}
              placeholder="Tìm tên danh mục, từ khóa..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:outline-none"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[18px]">search</span>
          </div>
          <button
            onClick={() => setModal({ mode: 'create', data: null })}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm danh mục
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-bold text-xs uppercase tracking-wider border-b border-surface-container-high">
                <th className="py-3 px-4">Tên danh mục</th>
                <th className="py-3 px-4">Mục bảng kê</th>
                <th className="py-3 px-4 text-center">Quy định giảm trừ</th>
                <th className="py-3 px-4">Từ khóa nhận diện</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {categoriesPagination.paginatedItems.map((c) => (
                <tr key={c.id} className={`hover:bg-surface-container-low/30 ${c.isDeleted ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-on-surface text-xs">{c.categoryName}</div>
                    {c.description && (
                      <div className="text-[11px] text-on-surface-variant mt-1 line-clamp-2" title={c.description}>
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap text-on-surface">{sectionLabel(c.sectionCode)}</td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.isEligible ? 'bg-emerald-600' : 'bg-stone-400'
                        }`}
                      />
                      {c.isEligible ? 'Được giảm trừ' : 'Loại trừ'}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {splitKeywords(c.keywords).slice(0, 6).map((k) => (
                        <span key={k} className="px-1.5 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant">
                          {k}
                        </span>
                      ))}
                      {splitKeywords(c.keywords).length > 6 && (
                        <span className="text-[11px] text-on-surface-variant">+{splitKeywords(c.keywords).length - 6}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {c.isDeleted ? (
                      <button
                        disabled={busyId === c.id}
                        onClick={() => restore(c)}
                        className="h-8 px-3 rounded-lg border border-outline-variant/50 text-xs font-semibold hover:bg-surface-container disabled:opacity-50 cursor-pointer"
                      >
                        Khôi phục
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setModal({ mode: 'edit', data: c })}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 cursor-pointer"
                          title="Sửa"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 cursor-pointer"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {isLoading && (
                <TableLoadingRow colSpan={5} title="Đang tải danh mục chi phí y tế..." />
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-on-surface-variant">
                    {items.length === 0
                      ? 'Chưa có danh mục nào. Khi danh mục trống, AI dùng danh sách loại chứng từ chung để phân loại.'
                      : 'Không có danh mục nào khớp bộ lọc.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && visible.length > 0 && (
          <TablePagination
            page={categoriesPagination.page}
            totalPages={categoriesPagination.totalPages}
            totalItems={categoriesPagination.totalItems}
            pageSize={categoriesPagination.pageSize}
            onPageChange={categoriesPagination.setPage}
            itemLabel="danh mục"
          />
        )}
      </div>

      {modal && (
        <MedicalCategoryModal
          key={modal.data?.id ?? 'new'}
          mode={modal.mode}
          initialData={modal.data}
          deletedCodes={deletedCodes}
          isSubmitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        type="destructive"
        title="Xóa danh mục chi phí y tế"
        description={`Xóa "${deleting?.categoryName}"? AI sẽ không dùng danh mục này khi đọc bảng kê mới. Bạn có thể khôi phục lại trong mục "Đã xóa".`}
        confirmText="Xóa danh mục"
        loading={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
