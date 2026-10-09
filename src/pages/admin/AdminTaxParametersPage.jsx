import { useState, useEffect, useRef } from 'react'
import { taxConfigV1Service } from '@/services/taxConfigV1Service'
import { useDebounce } from '@/hooks/useDebounce'
import { getConfigMeta, getTaxYearOptions } from '@/utils/taxConfigMeta'
import { TaxParamTable } from '@/components/admin/tax-parameters/TaxParamTable'
import { TaxParamDetailDrawer } from '@/components/admin/tax-parameters/TaxParamDetailDrawer'
import { TaxParamFormModal } from '@/components/admin/tax-parameters/TaxParamFormModal'
import { ConfirmDeactivateModal } from '@/components/admin/tax-parameters/ConfirmDeactivateModal'
import { Pagination } from '@/components/admin/tax-parameters/Pagination'

const SORT_OPTIONS = [
  { value: 'configKey', label: 'Mã A → Z' },
  { value: '-configKey', label: 'Mã Z → A' },
  { value: '-updatedAt', label: 'Mới cập nhật' },
  { value: 'updatedAt', label: 'Cập nhật lâu nhất' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả', activeCls: 'text-on-surface' },
  { value: 'active', label: 'Đang áp dụng', activeCls: 'text-emerald-600' },
  { value: 'inactive', label: 'Tạm dừng', activeCls: 'text-stone-600' },
]

const TAX_YEAR_OPTIONS = getTaxYearOptions()

const EMPTY_PAGINATION = { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }

function StatCard({ icon, tone, label, value, hint }) {
  return (
    <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className="text-headline-sm font-extrabold text-on-surface">{value}</span>
        <span className="text-[10px] text-on-surface-variant/80 truncate">{hint}</span>
      </div>
    </div>
  )
}

export function AdminTaxParametersPage() {
  // Danh sách + bộ lọc
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(EMPTY_PAGINATION)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('configKey')
  const [taxYear, setTaxYear] = useState('') // '' = tất cả các năm
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [reloadTick, setReloadTick] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })

  // Tương tác
  const [drawer, setDrawer] = useState(null) // { item, note }
  const [formModal, setFormModal] = useState(null) // { mode, item }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmItem, setConfirmItem] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [toast, setToast] = useState(null)

  const requestRef = useRef(0)
  const toastTimer = useRef(null)

  const reload = () => setReloadTick((t) => t + 1)

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Tải danh sách. Mỗi lần gọi có mã riêng, phản hồi của lần gọi cũ bị bỏ qua.
  useEffect(() => {
    const requestId = ++requestRef.current
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await taxConfigV1Service.getAll({
          page,
          size,
          search: debouncedSearch.trim(),
          sort,
          isActive: status === 'all' ? undefined : status === 'active',
          taxYear: taxYear || undefined,
        })
        if (requestId !== requestRef.current) return
        const pg = data?.pagination ?? EMPTY_PAGINATION
        // Lọc làm hết trang hiện tại → lùi về trang cuối có dữ liệu (kéo theo một lần tải mới).
        if (pg.totalPages > 0 && page > pg.totalPages) {
          setPage(pg.totalPages)
          return
        }
        setItems(data?.items ?? [])
        setPagination(pg)
        setLoadError('')
        setForbidden(false)
      } catch (err) {
        if (requestId !== requestRef.current) return
        if (err?.status === 403) setForbidden(true)
        else setLoadError(err?.message || 'Không thể tải danh sách tham số.')
      } finally {
        if (requestId === requestRef.current) setIsLoading(false)
      }
    }
    load()
  }, [page, size, debouncedSearch, sort, status, taxYear, reloadTick])

  // Số đếm cho thẻ thống kê và bộ lọc (theo năm đang lọc, không phụ thuộc trang đang xem).
  useEffect(() => {
    let alive = true
    const count = (extra) =>
      taxConfigV1Service
        .getAll({ page: 1, size: 1, taxYear: taxYear || undefined, ...extra })
        .then((d) => d?.pagination?.totalItems ?? 0)
    Promise.all([count({}), count({ isActive: true }), count({ isActive: false })])
      .then(([total, active, inactive]) => {
        if (alive) setStats({ total, active, inactive })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [taxYear, reloadTick])

  const applyUpdated = (data) => {
    if (!data?.configId) return
    setItems((prev) => prev.map((i) => (i.configId === data.configId ? data : i)))
    setDrawer((d) => (d && d.item.configId === data.configId ? { ...d, item: data } : d))
  }

  // ── Xem chi tiết ────────────────────────────────────────────────────────────
  const handleView = async (item) => {
    setDrawer({ item, note: '' })
    try {
      // Theo id (một key có thể có nhiều dòng theo năm); trả cả cấu hình đang tắt.
      const fresh = await taxConfigV1Service.getById(item.configId)
      setDrawer((d) => (d && d.item.configId === item.configId ? { item: fresh, note: '' } : d))
    } catch {
      setDrawer((d) =>
        d && d.item.configId === item.configId
          ? { ...d, note: 'Không tải được bản mới nhất, đang hiển thị dữ liệu trong danh sách.' }
          : d
      )
    }
  }

  // ── Bật/tắt ─────────────────────────────────────────────────────────────────
  const doToggle = async (item) => {
    setTogglingId(item.configId)
    try {
      // Backend bắt buộc configValue; gửi lại appliesFromYear hiện tại để không bị đổi năm hiệu lực.
      const { data, message } = await taxConfigV1Service.updateById(item.configId, {
        configValue: item.configValue,
        appliesFromYear: item.appliesFromYear ?? null,
        isActive: !item.isActive,
      })
      applyUpdated(data)
      showToast('success', message || 'Đã cập nhật trạng thái tham số.')
      reload()
    } catch (err) {
      showToast('error', err?.message || 'Không thể thay đổi trạng thái tham số.')
    } finally {
      setTogglingId(null)
      setConfirmItem(null)
    }
  }

  const handleToggle = (item) => {
    if (item.isActive && getConfigMeta(item.configKey).required) {
      setConfirmItem(item)
      return
    }
    doToggle(item)
  }

  // ── Tạo / sửa (lỗi được ném lại cho modal hiển thị) ─────────────────────────
  const handleSubmitForm = async (dto) => {
    setIsSubmitting(true)
    try {
      const result =
        formModal.mode === 'create'
          ? await taxConfigV1Service.create(dto)
          : await taxConfigV1Service.updateById(formModal.item.configId, {
              configValue: dto.configValue,
              description: dto.description,
              appliesFromYear: dto.appliesFromYear,
              isActive: dto.isActive,
            })
      setFormModal(null)
      applyUpdated(result.data)
      showToast('success', result.message || 'Đã lưu tham số.')
      reload()
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasFilter = search.trim() !== '' || status !== 'all' || taxYear !== ''

  return (
    <div className="p-space-xl flex flex-col gap-space-lg max-w-6xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <div>
            <strong>{toast.type === 'error' ? 'Lỗi' : 'Thành công'}:</strong> {toast.message}
          </div>
        </div>
      )}

      {/* Header trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
            THAM SỐ TÍNH THUẾ TNCN
          </span>
          <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">Tham số thuế TNCN</h1>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Các mức giảm trừ, biểu thuế, tỷ lệ bảo hiểm và hạn quyết toán dùng để tính thuế và nhắc hạn. Thay đổi ở đây
            có hiệu lực ngay với toàn hệ thống.
          </p>
        </div>
        {!forbidden && (
          <button
            type="button"
            onClick={() => setFormModal({ mode: 'create', item: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm tham số</span>
          </button>
        )}
      </div>

      {forbidden ? (
        <div className="py-20 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">lock</span>
          <h4 className="text-title-sm font-bold text-on-surface">Bạn không có quyền quản lý tham số thuế</h4>
          <p className="text-xs">Chức năng này chỉ dành cho tài khoản quản trị viên.</p>
        </div>
      ) : (
        <>
          {/* Thẻ thống kê */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <StatCard icon="tune" tone="bg-primary/10 text-primary" label="Tổng tham số" value={stats.total} hint="Đang quản trị trong hệ thống" />
            <StatCard icon="check_circle" tone="bg-emerald-500/10 text-emerald-600" label="Đang áp dụng" value={stats.active} hint="Được dùng khi tính thuế" />
            <StatCard icon="pause_circle" tone="bg-stone-500/10 text-stone-600" label="Tạm dừng" value={stats.inactive} hint="Chưa áp dụng" />
          </div>

          {/* Thanh lọc */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md shadow-xs">
            <div className="relative w-full lg:w-80">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo mã hoặc mô tả..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  title="Xóa từ khóa"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
              <div className="inline-flex rounded-lg border border-outline-variant/40 p-0.5 bg-surface-container-low">
                {STATUS_FILTERS.map((f) => {
                  const count = f.value === 'all' ? stats.total : f.value === 'active' ? stats.active : stats.inactive
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setStatus(f.value)
                        setPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        status === f.value
                          ? `bg-surface-container-lowest shadow-xs ${f.activeCls}`
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {f.label} ({count})
                    </button>
                  )
                })}
              </div>

              <select
                value={taxYear}
                onChange={(e) => {
                  setTaxYear(e.target.value)
                  setPage(1)
                }}
                title="Chỉ hiện bộ tham số đang hiệu lực trong năm tính thuế đã chọn"
                className="h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả các năm</option>
                {TAX_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Năm tính thuế {y}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  setPage(1)
                }}
                title="Sắp xếp"
                className="h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={reload}
                title="Làm mới danh sách"
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {/* Lỗi tải danh sách */}
          {loadError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5 shrink-0">error</span>
              <div className="flex-1">
                <strong>Không tải được danh sách.</strong>
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

          {/* Bảng */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
            <TaxParamTable
              items={items}
              isLoading={isLoading}
              hasFilter={hasFilter}
              togglingId={togglingId}
              onView={handleView}
              onEdit={(item) => setFormModal({ mode: 'edit', item })}
              onToggle={handleToggle}
              onCreate={() => setFormModal({ mode: 'create', item: null })}
            />
            {items.length > 0 && (
              <Pagination
                page={page}
                size={size}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onSizeChange={(n) => {
                  setSize(n)
                  setPage(1)
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Ngăn chi tiết */}
      {drawer && (
        <TaxParamDetailDrawer
          item={drawer.item}
          note={drawer.note}
          isToggling={togglingId === drawer.item.configId}
          onClose={() => setDrawer(null)}
          onEdit={(item) => setFormModal({ mode: 'edit', item })}
          onToggle={handleToggle}
        />
      )}

      {/* Modal tạo / sửa */}
      {formModal && (
        <TaxParamFormModal
          key={`${formModal.mode}-${formModal.item?.configId ?? 'new'}`}
          mode={formModal.mode}
          initialData={formModal.item}
          isSubmitting={isSubmitting}
          onClose={() => setFormModal(null)}
          onSubmit={handleSubmitForm}
        />
      )}

      {/* Xác nhận tạm dừng key bắt buộc */}
      {confirmItem && (
        <ConfirmDeactivateModal
          item={confirmItem}
          isSubmitting={togglingId === confirmItem.configId}
          onConfirm={() => doToggle(confirmItem)}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </div>
  )
}
