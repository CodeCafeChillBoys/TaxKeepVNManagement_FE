import { useState } from 'react'
import { systemConfigService } from '@/services/systemConfigService'
import { formatDocTypeCode } from '@/utils/configDataTypeUtils'

export function ThresholdTesterModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('MEDICAL_RECEIPT')
  const [customCategory, setCustomCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const standardCategories = [
    { code: 'MEDICAL_RECEIPT', name: 'Biên lai viện phí khám chữa bệnh' },
    { code: 'MEDICAL_COST_STATEMENT', name: 'Bảng kê chi phí khám chữa bệnh' },
    { code: 'EDUCATION_RECEIPT', name: 'Biên lai học phí - giáo dục đào tạo' },
    { code: 'DONATION_RECEIPT', name: 'Chứng từ đóng góp từ thiện, nhân đạo' },
    { code: 'WITHHOLDING_VOUCHER', name: 'Chứng từ khấu trừ thuế thu nhập cá nhân' },
    { code: 'VAT_INVOICE', name: 'Hóa đơn giá trị gia tăng (GTGT)' },
    { code: 'SALES_INVOICE', name: 'Hóa đơn bán hàng thông thường' },
    { code: 'INSURANCE_PREMIUM_RECEIPT', name: 'Biên lai bảo hiểm nhân thọ / hưu trí tự nguyện' },
    { code: 'INCOME_PAYSLIP', name: 'Phiếu lương & Xác nhận thu nhập' },
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
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-3 animate-in fade-in-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                Mức độ chính xác yêu cầu:
              </span>
              <div className="px-3.5 py-1 rounded-lg bg-primary text-on-primary text-sm font-bold shadow-xs">
                {(result.resolved_threshold * 100).toFixed(0)}%
              </div>
            </div>

            <div className="text-xs text-on-surface-variant font-medium leading-relaxed bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
              <p className="text-on-surface">
                Hệ thống áp dụng mức độ chính xác tối thiểu{' '}
                <strong>{(result.resolved_threshold * 100).toFixed(0)}%</strong> khi kiểm tra{' '}
                <strong>{formatDocTypeCode(result.category_code || selectedCategory)}</strong>.
              </p>
              <div className="mt-2.5 pt-2.5 border-t border-surface-container-high/40 text-[11px] text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-0.5">verified_user</span>
                <span>
                  <strong className="text-on-surface">Lưu ý kiểm soát an toàn thông tin:</strong> Kể cả khi mức độ rõ nét tổng thể đạt &ge;{' '}
                  <strong className="text-on-surface font-bold">{(result.resolved_threshold * 100).toFixed(0)}%</strong>, các mục thông tin bắt buộc gồm: <strong>Tổng số tiền</strong>, <strong>Mã số thuế đơn vị phát hành</strong>, <strong>Số CCCD / Mã số thuế người nộp</strong> và <strong>Số ký hiệu chứng từ</strong> phải đầy đủ và rõ nét. Nếu có mục nào mờ hoặc thiếu, hồ sơ sẽ chuyển sang trạng thái chờ chuyên viên rà soát trực tiếp.
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
