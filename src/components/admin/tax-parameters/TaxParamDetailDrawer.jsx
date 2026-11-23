import { useState } from 'react'
import { TaxParamValueDisplay } from './TaxParamValueDisplay'
import {
  ConfigType,
  TYPE_LABELS,
  getConfigMeta,
  parseBrackets,
  validateBrackets,
  formatPercent,
  groupThousands,
  formatDateTime,
  formatAppliesFromYear,
} from '@/utils/taxConfigMeta'

function BracketsTable({ raw }) {
  const rows = validateBrackets(raw) === '' ? parseBrackets(raw) : null
  if (!rows) return null
  return (
    <div className="rounded-xl border border-outline-variant/40 overflow-hidden mt-2">
      <table className="w-full text-[11px] border-collapse">
        <thead className="bg-surface-container-low/60">
          <tr className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
            <th className="py-2 px-2 text-center">Bậc</th>
            <th className="py-2 px-2 text-right">Từ</th>
            <th className="py-2 px-2 text-right">Đến</th>
            <th className="py-2 px-2 text-right">Thuế suất</th>
            <th className="py-2 px-2 text-right">Số trừ nhanh</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-high/40 font-mono">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1.5 px-2 text-center font-bold">{i + 1}</td>
              <td className="py-1.5 px-2 text-right">{groupThousands(String(r.fromMonthly))}</td>
              <td className="py-1.5 px-2 text-right">
                {r.toMonthly === null ? 'Không giới hạn' : groupThousands(String(r.toMonthly))}
              </td>
              <td className="py-1.5 px-2 text-right font-bold text-primary">{formatPercent(r.rate)}</td>
              <td className="py-1.5 px-2 text-right">{groupThousands(String(r.quickDeduct))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TaxParamDetailDrawer({ item, note, isToggling, onClose, onEdit, onToggle }) {
  const meta = getConfigMeta(item.configKey, item.appliesFromYear)
  const [copied, setCopied] = useState(false)

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(item.configKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Trình duyệt chặn clipboard: bỏ qua, không ảnh hưởng chức năng khác.
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose}></div>

      <aside className="relative w-full max-w-md h-full bg-surface-container-lowest border-l border-outline-variant/50 shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-space-lg border-b border-surface-container-high/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">{meta.icon}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Chi tiết tham số</span>
              <h3 className="text-title-sm font-bold text-on-surface leading-snug">
                {meta.title}
                {meta.year ? ` · ${meta.year}` : ''}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 overflow-y-auto p-space-lg flex flex-col gap-space-lg">
          {note && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[12px] flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[16px] shrink-0 mt-0.5">info</span>
              <span>{note}</span>
            </div>
          )}

          <section className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Mã tham số</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-on-surface break-all">{item.configKey}</span>
              <button
                type="button"
                onClick={copyKey}
                title="Sao chép mã"
                className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Nhóm</span>
              <span className="text-xs text-on-surface">{meta.group}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Kiểu giá trị</span>
              <span className="text-xs text-on-surface">{TYPE_LABELS[meta.type]}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Hiệu lực</span>
              <span className="text-xs text-on-surface">
                {formatAppliesFromYear(item.appliesFromYear)}
                {item.appliesFromYear == null && (
                  <span className="block text-[10px] text-on-surface-variant">Dùng cho năm không có dòng riêng</span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Trạng thái</span>
              <span
                className={`w-fit inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  item.isActive
                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25'
                    : 'bg-stone-200 text-stone-600 border-stone-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                {item.isActive ? 'Đang áp dụng' : 'Tạm dừng'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Cập nhật lần cuối</span>
              <span className="font-mono text-xs text-on-surface">{formatDateTime(item.updatedAt)}</span>
            </div>
          </section>

          <section className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Giá trị</span>
            <TaxParamValueDisplay configKey={item.configKey} value={item.configValue} />
            {meta.type === ConfigType.BRACKETS && <BracketsTable raw={item.configValue} />}
          </section>

          <section className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Mô tả</span>
            <p className="text-xs text-on-surface leading-relaxed">
              {item.description || <span className="text-on-surface-variant">Chưa có mô tả.</span>}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-space-lg border-t border-surface-container-high/40">
          <button
            type="button"
            onClick={() => onToggle(item)}
            disabled={isToggling}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors disabled:opacity-50"
          >
            {item.isActive ? 'Tạm dừng' : 'Áp dụng lại'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Chỉnh sửa
          </button>
        </div>
      </aside>
    </div>
  )
}
