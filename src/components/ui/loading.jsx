import * as React from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedLoading } from '@/hooks/useDebounce'

/**
 * Spinner xoay đồng bộ màu sắc thương hiệu TaxKeep VN
 */
export function LoadingSpinner({ size = 'md', variant = 'primary', className }) {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-14 h-14 border-4',
  }

  const variantClasses = {
    primary: 'border-primary/20 border-t-primary',
    brand: 'border-brand-700/20 border-t-brand-700',
    amber: 'border-amber-500/20 border-t-amber-500',
    emerald: 'border-emerald-500/20 border-t-emerald-600',
    white: 'border-white/25 border-t-white',
  }

  return (
    <div
      role="status"
      aria-label="Đang tải"
      className={cn(
        'rounded-full animate-spin shrink-0',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        className
      )}
    />
  )
}

/**
 * Component Loading toàn trang (Full-page / Route Guard / Auth Initialization)
 */
export function PageLoading({
  title = 'Đang tải dữ liệu hệ thống...',
  description = 'Vui lòng chờ trong giây lát khi hệ thống đồng bộ dữ liệu.',
  variant = 'brand',
  className,
}) {
  return (
    <div
      className={cn(
        'min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF8F0] p-4 text-center animate-in fade-in duration-200',
        className
      )}
    >
      <div className="flex flex-col items-center max-w-sm gap-3">
        <LoadingSpinner size="lg" variant={variant} />
        {title && (
          <p className="text-xs sm:text-sm font-bold text-stone-800 tracking-wide uppercase">
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs text-stone-500 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Component Loading cho từng phân khu / thẻ / bảng dữ liệu trên trang.
 * Tích hợp sẵn kỹ thuật debounce loading để chống giật lag khi fetch API.
 */
export function SectionLoading({
  loading = true,
  debounceDelay = 0,
  minDuration = 220,
  title = 'Đang tải dữ liệu...',
  description = '',
  size = 'md',
  variant = 'primary',
  minHeight = 'min-h-[200px]',
  className,
  children,
}) {
  const isVisible = useDebouncedLoading(loading, {
    delay: debounceDelay,
    minDuration,
  })

  if (!isVisible && children !== undefined) {
    return children
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center text-center p-6 sm:p-10 gap-3 text-on-surface-variant animate-in fade-in duration-200',
        minHeight,
        className
      )}
    >
      <LoadingSpinner size={size} variant={variant} />
      <div className="flex flex-col items-center gap-1 max-w-md">
        {title && (
          <p className="text-xs sm:text-sm font-bold text-on-surface">{title}</p>
        )}
        {description && (
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Dòng loading dùng bên trong `<tbody>` hoặc `<TableBody>`
 */
export function TableLoadingRow({
  colSpan = 5,
  title = 'Đang tải dữ liệu từ máy chủ...',
  description = '',
  variant = 'primary',
  className,
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('py-12 px-4 text-center', className)}>
        <div className="flex flex-col items-center justify-center gap-2.5 text-on-surface-variant animate-in fade-in duration-200">
          <LoadingSpinner size="md" variant={variant} />
          {title && <span className="text-xs font-semibold text-on-surface">{title}</span>}
          {description && (
            <span className="text-[11px] text-on-surface-variant max-w-sm">
              {description}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
