import { getConfigMeta } from '@/utils/taxConfigMeta'

// mode 'deactivate': tạm dừng tham số đang dùng; mode 'delete': xóa hẳn dòng khỏi system_configs
const COPY = {
  deactivate: {
    title: 'Tạm dừng tham số?',
    body: 'Các chức năng đang đọc tham số này sẽ dùng giá trị khác (bảng riêng hoặc mặc định) hoặc báo lỗi cấu hình cho tới khi bật lại.',
    confirm: 'Vẫn tạm dừng',
    icon: 'pause_circle',
    tone: 'bg-amber-500/10 text-amber-600',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
  delete: {
    title: 'Xóa tham số?',
    body: 'Dòng cấu hình sẽ bị xóa vĩnh viễn khỏi bảng system_configs và không thể khôi phục. Nếu chỉ muốn ngừng dùng, hãy tạm dừng.',
    confirm: 'Xóa vĩnh viễn',
    icon: 'delete_forever',
    tone: 'bg-red-500/10 text-red-600',
    btn: 'bg-red-600 hover:bg-red-700',
  },
}

export function ConfirmDeactivateModal({ item, isSubmitting, onConfirm, onCancel, mode = 'deactivate' }) {
  const meta = getConfigMeta(item.configKey, item.appliesFromYear)
  const name = meta.year ? `${meta.title} (${meta.year})` : meta.title
  const copy = COPY[mode] ?? COPY.deactivate

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${copy.tone}`}>
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-title-sm font-bold text-on-surface">{copy.title}</h4>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              <strong className="text-on-surface">{name}</strong>: {copy.body}
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
            className={`px-4 py-2 rounded-lg text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all ${copy.btn}`}
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">{copy.icon}</span>
            )}
            <span>{copy.confirm}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
