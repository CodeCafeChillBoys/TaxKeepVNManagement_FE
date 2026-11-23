import { useState } from 'react'
import { bracketsToRows, rowsToBracketsJson, validateBrackets } from '@/utils/taxConfigMeta'

const cellCls =
  'w-full h-9 px-2 rounded-lg border border-outline-variant/40 text-xs font-mono bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function BracketsEditor({ value, onChange }) {
  const [rows, setRows] = useState(() => bracketsToRows(value))
  const error = validateBrackets(rowsToBracketsJson(rows))

  const commit = (next) => {
    setRows(next)
    onChange(rowsToBracketsJson(next))
  }

  const setCell = (index, field, text) => {
    commit(rows.map((r, i) => (i === index ? { ...r, [field]: text } : r)))
  }

  const addRow = () => {
    const last = rows[rows.length - 1]
    const nextFrom = last && last.to.trim() !== '' ? last.to : ''
    // Bậc cuối cũ phải có "Đến" thì mới thêm bậc mới được; nếu trống thì để người dùng tự điền.
    commit([...rows, { from: nextFrom, to: '', rate: '', quick: '' }])
  }

  const removeRow = (index) => commit(rows.filter((_, i) => i !== index))

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-outline-variant/40 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-surface-container-low/60">
            <tr className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
              <th className="py-2 px-2 w-10 text-center">Bậc</th>
              <th className="py-2 px-2 text-left">Từ (₫/tháng)</th>
              <th className="py-2 px-2 text-left">Đến (₫/tháng)</th>
              <th className="py-2 px-2 text-left w-24">Thuế suất %</th>
              <th className="py-2 px-2 text-left">Số trừ nhanh (₫)</th>
              <th className="py-2 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/40">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-on-surface-variant">
                  Chưa có bậc nào. Nhấn "Thêm bậc" để bắt đầu.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1.5 px-2 text-center font-mono font-bold text-on-surface-variant">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <input inputMode="numeric" value={r.from} onChange={(e) => setCell(i, 'from', e.target.value)} className={cellCls} />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    inputMode="numeric"
                    value={r.to}
                    placeholder="Không giới hạn"
                    onChange={(e) => setCell(i, 'to', e.target.value)}
                    className={cellCls}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input inputMode="decimal" value={r.rate} onChange={(e) => setCell(i, 'rate', e.target.value)} className={cellCls} />
                </td>
                <td className="py-1.5 px-2">
                  <input inputMode="numeric" value={r.quick} onChange={(e) => setCell(i, 'quick', e.target.value)} className={cellCls} />
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Xóa bậc này"
                    className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-[11px] font-bold border border-secondary/20 cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Thêm bậc
        </button>
        <span className="text-[10px] text-on-surface-variant">Công thức: Thuế = Thu nhập tính thuế × Thuế suất − Số trừ nhanh</span>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
