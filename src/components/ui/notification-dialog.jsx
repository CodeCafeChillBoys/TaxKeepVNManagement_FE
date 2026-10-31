import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'
import { Button } from './button'

/**
 * Reusable modal for alerts and notices (Success, Error, Warning, Info)
 * Replaces window.alert() with professional branded UX.
 */
export function NotificationDialog({
  open,
  onOpenChange,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  description,
  confirmText = 'Đã hiểu',
  onConfirm,
}) {
  const iconConfig = {
    success: {
      icon: 'check_circle',
      bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
    },
    error: {
      icon: 'error',
      bg: 'bg-red-100 text-red-700 border-red-200',
      btn: 'bg-red-600 hover:bg-red-700 text-white font-bold',
    },
    warning: {
      icon: 'warning',
      bg: 'bg-amber-100 text-amber-800 border-amber-200',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white font-bold',
    },
    info: {
      icon: 'info',
      bg: 'bg-blue-100 text-blue-700 border-blue-200',
      btn: 'bg-primary text-on-primary font-bold',
    },
  }[type] || {
    icon: 'info',
    bg: 'bg-blue-100 text-blue-700 border-blue-200',
    btn: 'bg-primary text-on-primary font-bold',
  }

  const handleClose = () => {
    onConfirm?.()
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconConfig.bg}`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {iconConfig.icon}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
            <DialogTitle className="text-lg font-bold text-on-surface">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-on-surface-variant leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 sm:justify-end">
          <Button
            onClick={handleClose}
            className={`w-full sm:w-auto px-6 ${iconConfig.btn}`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Reusable modal for action confirmations (Delete, Submit, Cancel, etc.)
 * Replaces window.confirm() with clean dialog UX.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  type = 'primary', // 'primary' | 'destructive' | 'warning' | 'success'
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const typeConfig = {
    destructive: {
      icon: 'delete_forever',
      bg: 'bg-red-100 text-red-700 border-red-200',
      btn: 'bg-red-600 hover:bg-red-700 text-white font-bold',
    },
    warning: {
      icon: 'warning',
      bg: 'bg-amber-100 text-amber-800 border-amber-200',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white font-bold',
    },
    primary: {
      icon: 'help',
      bg: 'bg-primary/10 text-primary border-primary/20',
      btn: 'bg-primary text-on-primary font-bold',
    },
    success: {
      icon: 'verified',
      bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
    },
  }[type] || {
    icon: 'help',
    bg: 'bg-primary/10 text-primary border-primary/20',
    btn: 'bg-primary text-on-primary font-bold',
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${typeConfig.bg}`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {typeConfig.icon}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
            <DialogTitle className="text-lg font-bold text-on-surface">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-on-surface-variant leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 flex-col-reverse sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto font-medium"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-5 ${typeConfig.btn}`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
