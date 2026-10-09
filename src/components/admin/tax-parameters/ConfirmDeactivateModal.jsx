import { getConfigMeta } from '@/utils/taxConfigMeta'

export function ConfirmDeactivateModal({ item, isSubmitting, onConfirm, onCancel }) {
  const meta = getConfigMeta(item.configKey, item.appliesFromYear)
  const name = meta.year ? `${meta.title} (${meta.year})` : meta.title

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-title-sm font-bold text-on-surface">Tạm dừng tham số bắt buộc?</h4>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Tạm dừng <strong className="text-on-surface">{name}</strong>? Tính năng quyết toán thuế và nhắc hạn sẽ báo
              lỗi cấu hình cho tới khi tham số này được áp dụng lại.
            </p>
            <span className="mt-1.5 font-mono text-[10px] text-on-surface-variant/80">{item.configKey}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">pause_circle</span>
            )}
            <span>Vẫn tạm dừng</span>
          </button>
        </div>
      </div>
    </div>
  )
}
