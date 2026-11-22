import { useState, useEffect, useMemo } from 'react'
import { dependentRuleService } from '@/services/dependentRuleService'
import { useDebounce } from '@/hooks/useDebounce'
import { TableLoadingRow } from '@/components/ui/loading'

export const TARGET_GROUP_LABELS = {
  CHILD_UNDER_18: 'Con dưới 18 tuổi',
  CHILD_OVER_18_STUDYING: 'Con từ 18 tuổi trở lên đang đi học',
  CHILD_OVER_18_DISABLED: 'Con từ 18 tuổi trở lên bị khuyết tật, không có khả năng lao động',
  CHILD_DISABLED: 'Con bị khuyết tật, không có khả năng lao động',
  CHILD: 'Con dưới 18 tuổi',
  ADULT_CHILD: 'Con từ 18 tuổi trở lên đang đi học',
  SPOUSE_DISABLED: 'Vợ hoặc chồng không có khả năng lao động',
  SPOUSE_UNABLE_TO_WORK: 'Vợ hoặc chồng không có khả năng lao động',
  SPOUSE: 'Vợ hoặc chồng',
  PARENT_RETIRED: 'Cha mẹ đã hết tuổi lao động',
  PARENT_OVER_WORKING_AGE: 'Cha mẹ ngoài độ tuổi lao động',
  PARENT_DISABLED: 'Cha mẹ trong độ tuổi lao động bị khuyết tật, không có khả năng lao động',
  PARENT_WORKING_AGE_DISABLED: 'Cha mẹ trong độ tuổi lao động bị khuyết tật, không có khả năng lao động',
  PARENT_UNDER_WORKING_AGE_DISABLED: 'Cha mẹ trong độ tuổi lao động bị khuyết tật, không có khả năng lao động',
  PARENT: 'Cha đẻ, mẹ đẻ, cha mẹ vợ/chồng, cha dượng, mẹ kế',
  PARENT_IN_LAW: 'Cha mẹ vợ/chồng, cha dượng, mẹ kế',
  OTHER_HELPLESS: 'Cá nhân khác không nơi nương tựa mà người nộp thuế trực tiếp nuôi dưỡng',
  OTHER_DEPENDENT: 'Cá nhân khác không nơi nương tựa',
  OTHER: 'Người phụ thuộc khác',
}

export const DEFAULT_TARGET_GROUP_OPTIONS = [
  { value: 'CHILD_UNDER_18', label: 'Con dưới 18 tuổi' },
  { value: 'CHILD_OVER_18_STUDYING', label: 'Con từ 18 tuổi trở lên đang đi học' },
  { value: 'CHILD_OVER_18_DISABLED', label: 'Con từ 18 tuổi trở lên bị khuyết tật, không có khả năng lao động' },
  { value: 'SPOUSE_DISABLED', label: 'Vợ hoặc chồng không có khả năng lao động' },
  { value: 'PARENT_RETIRED', label: 'Cha mẹ đã hết tuổi lao động' },
  { value: 'PARENT_DISABLED', label: 'Cha mẹ trong độ tuổi lao động bị khuyết tật, không có khả năng lao động' },
  { value: 'OTHER_HELPLESS', label: 'Cá nhân khác không nơi nương tựa mà người nộp thuế trực tiếp nuôi dưỡng' },
]

export const DOC_TYPE_LABELS = {
  BIRTH_CERTIFICATE: 'Giấy khai sinh',
  BIRTH_CERT: 'Giấy khai sinh',
  CITIZEN_ID: 'Căn cước công dân / CMND',
  CCCD: 'Căn cước công dân / CMND',
  ID_CARD: 'Căn cước công dân / CMND',
  STUDENT_CARD: 'Thẻ sinh viên / Giấy xác nhận của nhà trường',
  STUDENT_CERT: 'Giấy xác nhận sinh viên / Học sinh',
  DISABILITY_CERTIFICATE: 'Giấy xác nhận khuyết tật / Hồ sơ giám định y khoa',
  DISABILITY_CERT: 'Giấy xác nhận khuyết tật / Hồ sơ giám định y khoa',
  MEDICAL_RECORD: 'Bệnh án / Giấy xác nhận của cơ quan y tế',
  MEDICAL_CERTIFICATE: 'Giấy xác nhận của cơ quan y tế có thẩm quyền',
  MARRIAGE_CERTIFICATE: 'Giấy chứng nhận đăng ký kết hôn',
  MARRIAGE_CERT: 'Giấy chứng nhận đăng ký kết hôn',
  RELATIONSHIP_CERTIFICATE: 'Giấy tờ xác nhận mối quan hệ gia đình',
  RELATIONSHIP_CERT: 'Giấy tờ xác nhận mối quan hệ gia đình',
  SUPPORT_COMMITMENT_FORM: 'Bản kê khai / Cam kết nuôi dưỡng (Mẫu 09/XN-NPT-TNCN)',
  COMMITMENT_FORM: 'Bản cam kết nuôi dưỡng có xác nhận của UBND cấp xã',
  FORM_09_XN_NPT: 'Bản kê khai về người phải trực tiếp nuôi dưỡng (Mẫu 09/XN-NPT-TNCN)',
  RESIDENCE_CT07: 'Giấy xác nhận thông tin về cư trú (Mẫu CT07) / Sổ hộ khẩu',
  RESIDENCE_CERTIFICATE: 'Giấy xác nhận thông tin về cư trú (Mẫu CT07)',
  HOUSEHOLD_BOOK: 'Sổ hộ khẩu / Giấy xác nhận cư trú',
  INCOME_DECLARATION: 'Tờ khai / Xác nhận thu nhập không quá quy định',
  INCOME_CERT: 'Giấy xác nhận thu nhập',
  LEGAL_GUARDIAN_DOC: 'Giấy tờ xác nhận nghĩa vụ nuôi dưỡng hợp pháp',
  OTHER: 'Giấy tờ chứng minh khác',
}

export function formatTargetGroup(group) {
  if (!group) return 'Người phụ thuộc'
  const key = String(group).trim().toUpperCase()
  if (TARGET_GROUP_LABELS[key]) return TARGET_GROUP_LABELS[key]

  return String(group)
    .replace(/CHILD_UNDER_18/gi, 'Con dưới 18 tuổi')
    .replace(/CHILD_OVER_18_STUDYING/gi, 'Con từ 18 tuổi trở lên đang đi học')
    .replace(/CHILD_OVER_18_DISABLED/gi, 'Con từ 18 tuổi trở lên bị khuyết tật')
    .replace(/SPOUSE_DISABLED/gi, 'Vợ hoặc chồng không có khả năng lao động')
    .replace(/PARENT_RETIRED/gi, 'Cha mẹ đã hết tuổi lao động')
    .replace(/PARENT_DISABLED/gi, 'Cha mẹ trong độ tuổi lao động bị khuyết tật')
    .replace(/OTHER_HELPLESS/gi, 'Cá nhân khác không nơi nương tựa')
    .replace(/ADULT_CHILD/gi, 'Con từ 18 tuổi trở lên đang đi học')
    .replace(/PARENT_IN_LAW/gi, 'Cha mẹ vợ/chồng, cha dượng, mẹ kế')
    .replace(/OTHER_DEPENDENT/gi, 'Cá nhân khác không nơi nương tựa')
    .replace(/CHILD/gi, 'Con')
    .replace(/SPOUSE/gi, 'Vợ hoặc chồng')
    .replace(/PARENT/gi, 'Cha mẹ')
    .replace(/UNDER_18/gi, 'dưới 18 tuổi')
    .replace(/OVER_18/gi, 'từ 18 tuổi trở lên')
    .replace(/STUDYING/gi, 'đang đi học')
    .replace(/DISABLED/gi, 'bị khuyết tật, mất khả năng lao động')
    .replace(/RETIRED/gi, 'đã hết tuổi lao động')
    .replace(/HELPLESS/gi, 'không nơi nương tựa')
    .replace(/OTHER/gi, 'Người phụ thuộc khác')
    .replace(/_/g, ' ')
}

export function formatDocType(docType) {
  if (!docType) return 'Giấy tờ chứng minh'
  const key = String(docType).trim().toUpperCase()
  if (DOC_TYPE_LABELS[key]) return DOC_TYPE_LABELS[key]

  return String(docType)
    .replace(/BIRTH_CERTIFICATE|BIRTH_CERT/gi, 'Giấy khai sinh')
    .replace(/CITIZEN_ID|ID_CARD/gi, 'Căn cước công dân / CMND')
    .replace(/STUDENT_CARD|STUDENT_CERT/gi, 'Thẻ sinh viên / Giấy xác nhận nhà trường')
    .replace(/DISABILITY_CERTIFICATE|DISABILITY_CERT/gi, 'Giấy xác nhận khuyết tật / Y tế')
    .replace(/MARRIAGE_CERTIFICATE|MARRIAGE_CERT/gi, 'Giấy chứng nhận kết hôn')
    .replace(/RELATIONSHIP_CERTIFICATE|RELATIONSHIP_CERT/gi, 'Giấy tờ xác nhận quan hệ')
    .replace(/SUPPORT_COMMITMENT_FORM|COMMITMENT_FORM/gi, 'Bản kê khai cam kết nuôi dưỡng')
    .replace(/RESIDENCE_CT07|RESIDENCE_CERTIFICATE/gi, 'Giấy xác nhận thông tin cư trú (Mẫu CT07)')
    .replace(/INCOME_DECLARATION|INCOME_CERT/gi, 'Tờ khai xác nhận thu nhập')
    .replace(/MEDICAL_RECORD|MEDICAL_CERTIFICATE/gi, 'Hồ sơ bệnh án / Xác nhận y tế')
    .replace(/OTHER/gi, 'Giấy tờ chứng minh khác')
    .replace(/_/g, ' ')
}

export function AdminDependentRulesPage() {
  const [rules, setRules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [targetGroupFilter, setTargetGroupFilter] = useState('ALL')
  const debouncedTargetGroup = useDebounce(targetGroupFilter, 150)
  const [dbNotice, setDbNotice] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchRules = async () => {
      try {
        setIsLoading(true)
        const params = { page: 1, size: 50 }
        if (debouncedTargetGroup !== 'ALL') params.targetGroup = debouncedTargetGroup
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
  }, [debouncedTargetGroup, debouncedSearch])

  const targetGroupOptions = useMemo(() => {
    const map = new Map()
    DEFAULT_TARGET_GROUP_OPTIONS.forEach((opt) => {
      map.set(opt.value, opt.label)
    })
    rules.forEach((r) => {
      if (r.targetGroup && !map.has(r.targetGroup)) {
        map.set(r.targetGroup, formatTargetGroup(r.targetGroup))
      }
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [rules])

  const filteredRules = rules.filter((r) => {
    const matchGroup = targetGroupFilter === 'ALL' || r.targetGroup === targetGroupFilter
    const q = debouncedSearch.trim().toLowerCase()
    const vietGroup = formatTargetGroup(r.targetGroup).toLowerCase()
    const vietDoc = formatDocType(r.docType).toLowerCase()
    const matchSearch =
      !q ||
      vietGroup.includes(q) ||
      vietDoc.includes(q) ||
      r.docType?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.targetGroup?.toLowerCase().includes(q)
    return matchGroup && matchSearch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
            Quy tắc hồ sơ
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
            className="h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">Tất cả nhóm đối tượng</option>
            {targetGroupOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo nhóm đối tượng, loại giấy tờ, mô tả..."
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
                <th className="py-3 px-4">Loại chứng từ / Hồ sơ</th>
                <th className="py-3 px-4">Mô tả quy tắc & Điều kiện</th>
                <th className="py-3 px-4 text-center">Tính bắt buộc</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredRules.map((rule, idx) => (
                <tr key={rule.ruleId || idx} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-on-surface-variant font-medium">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface leading-snug">
                    {formatTargetGroup(rule.targetGroup)}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-on-surface leading-snug">
                    {formatDocType(rule.docType)}
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant max-w-md leading-relaxed text-xs">
                    {rule.description}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-xs whitespace-nowrap ${
                        rule.isMandatory
                          ? 'font-semibold text-on-surface'
                          : 'font-normal text-on-surface-variant'
                      }`}
                    >
                      {rule.isMandatory ? 'Bắt buộc' : 'Tùy chọn'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap ${
                        rule.isActive
                          ? 'text-emerald-700'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rule.isActive ? 'bg-emerald-600' : 'bg-outline-variant'
                        }`}
                      />
                      {rule.isActive ? 'Hiệu lực' : 'Chưa áp dụng'}
                    </span>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <TableLoadingRow
                  colSpan={6}
                  title="Đang tải danh mục quy tắc hồ sơ người phụ thuộc..."
                />
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

