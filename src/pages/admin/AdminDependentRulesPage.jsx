import { useState, useEffect } from 'react'
import { dependentRuleService } from '@/services/dependentRuleService'
import { useDebounce } from '@/hooks/useDebounce'

export function AdminDependentRulesPage() {
  const [rules, setRules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 400)
  const [targetGroupFilter, setTargetGroupFilter] = useState('ALL')
  const [dbNotice, setDbNotice] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchRules = async () => {
      try {
        setIsLoading(true)
        const params = { page: 1, size: 50 }
        if (targetGroupFilter !== 'ALL') params.targetGroup = targetGroupFilter
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

        const res = await dependentRuleService.getAll(params)
        const items = res?.items || (Array.isArray(res) ? res : [])
        if (mounted) {
          setRules(items)
          setDbNotice(null)
        }
      } catch (err) {
        if (mounted) {
          // Xử lý thông báo thân thiện nếu bảng chưa được migration trên DB
          if (err.message && err.message.includes('does not exist')) {
            setDbNotice(
              'Danh mục quy tắc hồ sơ đang được chuẩn bị và cập nhật trên hệ thống.'
            )
          } else {
            setDbNotice(err.message || 'Không thể tải danh sách quy tắc.')
          }
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchRules()
    return () => {
      mounted = false
    }
  }, [targetGroupFilter, debouncedSearch])

  const filteredRules = rules.filter((r) => {
    const matchGroup = targetGroupFilter === 'ALL' || r.targetGroup === targetGroupFilter
    const matchSearch =
      !debouncedSearch.trim() ||
      r.docType?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.targetGroup?.toLowerCase().includes(debouncedSearch.toLowerCase())
    return matchGroup && matchSearch
  })

  return (
    <div className="p-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
            QUY TẮC PHÁP QUY & HỒ SƠ CHỨNG MINH
          </span>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
            Danh mục Quy tắc Hồ sơ Người phụ thuộc
          </h2>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Các tiêu chuẩn hồ sơ bắt buộc và tùy chọn áp dụng theo từng nhóm đối tượng người phụ thuộc căn cứ theo quy định của Luật Thuế TNCN.
          </p>
        </div>
      </div>

      {/* Database Notice if table migration pending */}
      {dbNotice && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-sm flex items-start gap-3 shadow-2xs">
          <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">
            info
          </span>
          <div className="flex flex-col">
            <strong>Thông báo đồng bộ dữ liệu:</strong>
            <span className="text-[13px] text-amber-800/90 leading-relaxed mt-0.5">{dbNotice}</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-md shadow-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider shrink-0">
            Nhóm đối tượng:
          </span>
          <select
            value={targetGroupFilter}
            onChange={(e) => setTargetGroupFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả nhóm</option>
            <option value="CHILD_UNDER_18">Con dưới 18 tuổi</option>
            <option value="CHILD_OVER_18_STUDYING">Con trên 18 tuổi đang học</option>
            <option value="CHILD_OVER_18_DISABLED">Con khuyết tật</option>
            <option value="SPOUSE_DISABLED">Vợ/chồng khuyết tật</option>
            <option value="PARENT_RETIRED">Cha mẹ hết tuổi lao động</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo loại giấy tờ, mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[18px]">
            search
          </span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-low/70 text-secondary font-bold text-xs uppercase tracking-wider border-b border-surface-container-high">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Nhóm đối tượng</th>
                <th className="py-3 px-4">Mã chứng từ (DocType)</th>
                <th className="py-3 px-4">Mô tả quy tắc & Điều kiện</th>
                <th className="py-3 px-4 text-center">Tính bắt buộc</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredRules.map((rule, idx) => (
                <tr key={rule.ruleId || idx} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="py-3 px-4 text-center font-mono text-on-surface-variant font-medium">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary">
                      {rule.targetGroup}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-on-surface">
                    {rule.docType}
                  </td>
                  <td className="py-3 px-4 text-on-surface max-w-md leading-relaxed text-xs">
                    {rule.description}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        rule.isMandatory
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {rule.isMandatory ? 'Bắt buộc' : 'Tùy chọn'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {rule.isActive ? 'Hiệu lực' : 'Chưa áp dụng'}
                    </span>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tải danh mục quy tắc hồ sơ từ API...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filteredRules.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-outline">
                        rule_folder
                      </span>
                      <span>Chưa có quy tắc hồ sơ người phụ thuộc nào từ cơ sở dữ liệu.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
