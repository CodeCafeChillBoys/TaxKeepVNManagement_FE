import { TaxParamValueDisplay } from './TaxParamValueDisplay'
import { getConfigMeta, formatDateTime, formatAppliesFromYear } from '@/utils/taxConfigMeta'

export function TaxParamTable({ items, isLoading, hasFilter, togglingId, onView, onEdit, onToggle, onCreate }) {
  if (isLoading && items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs font-semibold">Đang tải danh sách tham số từ hệ thống...</span>
      </div>
    )
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">request_quote</span>
        <h4 className="text-title-sm font-bold text-on-surface">
          {hasFilter ? 'Không tìm thấy tham số phù hợp' : 'Chưa có tham số nào'}
        </h4>
        <p className="text-xs max-w-sm">
          {hasFilter
            ? 'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'
            : 'Nhấn "Thêm tham số" để tạo tham số tính thuế đầu tiên.'}
        </p>
        {!hasFilter && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer transition-all shadow-xs"
          >
            Thêm tham số
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-surface-container-low/50">
          <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
            <th className="py-3.5 px-4 w-[34%] whitespace-nowrap">Tham số</th>
            <th className="py-3.5 px-4 w-[28%] whitespace-nowrap">Giá trị</th>
            <th className="py-3.5 px-4 whitespace-nowrap">Hiệu lực</th>
            <th className="py-3.5 px-4 whitespace-nowrap">Cập nhật</th>
            <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
            <th className="py-3.5 px-4 text-center w-[90px] whitespace-nowrap">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-high/40">
          {items.map((item) => {
            const meta = getConfigMeta(item.configKey, item.appliesFromYear)
            const isToggling = togglingId === item.configId
            return (
              <tr
                key={item.configId}
                onClick={() => onView(item)}
                className={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                  item.isActive ? '' : 'opacity-80'
                }`}
              >
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-on-surface leading-snug">{meta.title}</span>
                      <span className="mt-1 w-fit text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium">
                        {meta.group}
                      </span>
                      <span className="mt-1 font-mono text-[10px] text-on-surface-variant/80 truncate" title={item.configKey}>
                        {item.configKey}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 align-middle">
                  <TaxParamValueDisplay configKey={item.configKey} value={item.configValue} />
                </td>

                <td className="py-4 px-4 align-middle whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      item.appliesFromYear == null
                        ? 'bg-surface-container text-on-surface-variant border-outline-variant/40'
                        : 'bg-secondary/10 text-secondary border-secondary/20'
                    }`}
                    title={
                      item.appliesFromYear == null
                        ? 'Dùng cho mọi năm không có dòng riêng theo năm'
                        : `Áp dụng cho năm ${item.appliesFromYear} trở đi`
                    }
                  >
                    {formatAppliesFromYear(item.appliesFromYear)}
                  </span>
                </td>

                <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                  {formatDateTime(item.updatedAt)}
                </td>

                <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(item)
                    }}
                    title="Bấm để bật hoặc tạm dừng áp dụng tham số này"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-wait ${
                      item.isActive
                        ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 hover:bg-emerald-500/20'
                        : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300'
                    }`}
                  >
                    {isToggling ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                        }`}
                      ></span>
                    )}
                    <span>{item.isActive ? 'Đang áp dụng' : 'Tạm dừng'}</span>
                  </button>
                </td>

                <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onView(item)
                      }}
                      title="Xem chi tiết tham số"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(item)
                      }}
                      title="Chỉnh sửa tham số"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
