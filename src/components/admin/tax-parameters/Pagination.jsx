import { getPageNumbers } from '@/utils/pagination'

const SIZE_OPTIONS = [10, 20, 50]

export function Pagination({ page, size, totalItems, totalPages, onPageChange, onSizeChange }) {
  const from = totalItems === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, totalItems)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-t border-surface-container-high/40 px-4 py-3 text-xs">
      <span className="text-on-surface-variant">
        Hiển thị <strong className="text-on-surface">{from}–{to}</strong> / {totalItems} tham số
      </span>

      <div className="flex items-center gap-space-md">
        <label className="flex items-center gap-2 text-on-surface-variant">
          <span>Số dòng</span>
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer"
          >
            {SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title="Trang trước"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {getPageNumbers(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-on-surface-variant">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  n === page
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {n}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title="Trang sau"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}
