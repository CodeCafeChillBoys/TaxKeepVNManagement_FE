/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const DEFAULT_ADMIN_PAGE_SIZE = 10

/**
 * Hook phân trang phía client (mặc định tối đa 10 dòng/trang).
 * Tự động kẹp trang hợp lệ khi danh sách thay đổi do lọc/tìm kiếm/xóa mà không cần setState trong useEffect.
 */
export function useClientPagination(items = [], pageSize = DEFAULT_ADMIN_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.min(DEFAULT_ADMIN_PAGE_SIZE, Number(pageSize) || DEFAULT_ADMIN_PAGE_SIZE))
  const [rawPage, setRawPage] = useState(1)

  const totalItems = Array.isArray(items) ? items.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const page = Math.min(Math.max(1, rawPage), totalPages)

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return []
    const start = (page - 1) * safePageSize
    return items.slice(start, start + safePageSize)
  }, [items, page, safePageSize])

  const setPage = (nextPage) => {
    setRawPage((prev) => {
      const target = typeof nextPage === 'function' ? nextPage(prev) : nextPage
      const numeric = Number(target)
      if (!Number.isFinite(numeric)) return 1
      return Math.min(Math.max(1, Math.floor(numeric)), totalPages)
    })
  }

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * safePageSize + 1
  const rangeEnd = Math.min(page * safePageSize, totalItems)

  return {
    page,
    setPage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    paginatedItems,
    rangeStart,
    rangeEnd,
  }
}

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('ellipsis-start')
  for (let p = start; p <= end; p += 1) pages.push(p)
  if (end < totalPages - 1) pages.push('ellipsis-end')
  pages.push(totalPages)

  return pages
}

/**
 * Thanh phân trang đồng bộ cho toàn bộ bảng trên Admin Dashboard (tối đa 10 dòng/trang).
 */
export function TablePagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = DEFAULT_ADMIN_PAGE_SIZE,
  onPageChange,
  itemLabel = 'mục',
  className,
}) {
  if (!totalItems || totalItems <= 0) return null

  const safeTotalPages = Math.max(1, Number(totalPages) || 1)
  const safePage = Math.min(Math.max(1, Number(page) || 1), safeTotalPages)
  const safePageSize = Math.max(1, Number(pageSize) || DEFAULT_ADMIN_PAGE_SIZE)
  const rangeStart = (safePage - 1) * safePageSize + 1
  const rangeEnd = Math.min(safePage * safePageSize, totalItems)
  const pageNumbers = buildPageNumbers(safePage, safeTotalPages)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-outline-variant/30 bg-surface-container-low/30 text-xs',
        className
      )}
    >
      <span className="text-on-surface-variant tabular-nums">
        Hiển thị <strong className="text-on-surface font-semibold">{rangeStart}–{rangeEnd}</strong> /{' '}
        <strong className="text-on-surface font-semibold">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[11px]"
          disabled={safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
        >
          Trang trước
        </Button>

        {pageNumbers.map((entry) =>
          typeof entry === 'string' ? (
            <span key={entry} className="px-1.5 text-on-surface-variant select-none">
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant={entry === safePage ? 'default' : 'outline'}
              size="sm"
              className="h-7 min-w-7 px-2 text-[11px] tabular-nums"
              onClick={() => onPageChange?.(entry)}
            >
              {entry}
            </Button>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[11px]"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange?.(safePage + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  )
}
