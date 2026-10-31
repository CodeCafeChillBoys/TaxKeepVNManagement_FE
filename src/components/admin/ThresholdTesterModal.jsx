import { useState } from 'react'
import { systemConfigService } from '@/services/systemConfigService'

export function ThresholdTesterModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('MEDICAL_EXPENSE_INVOICE')
  const [customCategory, setCustomCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const standardCategories = [
    { code: 'MEDICAL_EXPENSE_INVOICE', name: 'Hóa đơn viện phí - y tế' },
    { code: 'EDUCATION_EXPENSE_INVOICE', name: 'Hóa đơn học phí - giáo dục' },
    { code: 'DONATION_VOUCHER', name: 'Chứng từ từ thiện - đóng góp nhân đạo' },
    { code: 'SALES_INVOICE', name: 'Hóa đơn bán hàng thông thường' },
    { code: 'VAT_INVOICE', name: 'Hóa đơn giá trị gia tăng (GTGT)' },
    { code: '__CUSTOM__', name: 'Kiểm tra theo mã loại chứng từ khác...' },
  ]

  const handleTest = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    const codeToTest =
      selectedCategory === '__CUSTOM__'
        ? customCategory.trim().toUpperCase()
        : selectedCategory

    try {
      const data = await systemConfigService.testResolveThreshold(codeToTest || null)
      setResult(data)
    } catch (err) {
      console.error('Lỗi khi kiểm tra quy tắc xét duyệt:', err)
      setError(err?.message || 'Không thể kết nối máy chủ để kiểm tra quy tắc xét duyệt.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Kiểm tra quy tắc xét duyệt theo loại chứng từ
              </h3>
              <p className="text-xs text-on-surface-variant">
                Xác định mức độ chính xác mà hệ thống yêu cầu khi quét từng loại chứng từ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Giải thích quy tắc ưu tiên */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">schema</span>
            Nguyên tắc xác định mức độ chính xác áp dụng:
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center">
              <span className="font-bold text-primary">Bước 1: Ưu tiên</span>
              <span className="text-on-surface font-medium mt-0.5">Theo loại chứng từ</span>
              <span className="text-[10px] text-on-surface-variant/80 mt-1">Ví dụ: Viện phí, Học phí</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center">
              <span className="font-bold text-secondary">Bước 2: Mức chung</span>
              <span className="text-on-surface font-medium mt-0.5">Toàn hệ thống</span>
              <span className="text-[10px] text-on-surface-variant/80 mt-1">Đang thiết lập: 80%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center">
              <span className="font-bold text-slate-600">Bước 3: Dự phòng</span>
              <span className="text-on-surface font-medium mt-0.5">Mặc định tối thiểu</span>
              <span className="text-[10px] text-on-surface-variant/80 mt-1">Mức an toàn: 80%</span>
            </div>
          </div>
        </div>

        {/* Chọn loại chứng từ test */}
        <div className="flex flex-col gap-space-sm">
          <label className="text-xs font-bold text-on-surface">Chọn loại chứng từ cần kiểm tra quy tắc:</label>
          <div className="flex flex-col gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer"
            >
              {standardCategories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedCategory === '__CUSTOM__' && (
              <input
                type="text"
                placeholder="Nhập mã chứng từ (Ví dụ: HOTEL_INVOICE, FUEL_VOUCHER)..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value.toUpperCase())}
                className="h-10 px-3 rounded-lg border border-outline-variant/40 font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none uppercase"
              />
            )}
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={isLoading}
            className="mt-1 h-10 px-4 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary-container hover:text-on-secondary-container cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                <span>Đang kiểm tra quy tắc...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>Kiểm tra quy tắc áp dụng</span>
              </>
            )}
          </button>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="p-3 rounded-xl bg-error-container/30 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>{error}</span>
          </div>
        )}

        {/* Kết quả */}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-3 animate-in fade-in-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                Mức độ chính xác yêu cầu:
              </span>
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-xs flex items-center gap-1">
                <span>{(result.resolved_threshold * 100).toFixed(0)}%</span>
                <span className="text-[11px] opacity-80 font-normal">({result.resolved_threshold})</span>
              </div>
            </div>

            <div className="text-xs text-on-surface-variant font-medium leading-relaxed bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
              <p className="text-on-surface">{result.note}</p>
              <div className="mt-2.5 pt-2.5 border-t border-surface-container-high/40 text-[11px] text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">verified_user</span>
                <span>
                  <strong className="text-on-surface">Lưu ý kiểm soát an toàn thông tin:</strong> Kể cả khi điểm quét tổng thể đạt mức yêu cầu &ge;{' '}
                  <strong className="text-primary font-bold">{(result.resolved_threshold * 100).toFixed(0)}%</strong>, các mục thông tin bắt buộc gồm: <strong>Tổng tiền</strong>, <strong>Mã số thuế bên bán</strong>, <strong>CCCD/MST người mua</strong> và <strong>Số hóa đơn</strong> phải đạt độ nét và chính xác cao. Nếu có bất kỳ trường nào mờ hoặc thiếu, hệ thống sẽ tự động chuyển sang trạng thái chờ chuyên viên kiểm tra trực tiếp.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-space-xs border-t border-surface-container-high/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
