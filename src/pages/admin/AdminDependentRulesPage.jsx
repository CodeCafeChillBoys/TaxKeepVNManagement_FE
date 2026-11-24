import { useState, useEffect, useMemo, useRef } from 'react'
import { dependentRuleService } from '@/services/dependentRuleService'
import { useDebounce } from '@/hooks/useDebounce'
import { useDependentGroups } from '@/hooks/useDependentGroups'
import { TableLoadingRow } from '@/components/ui/loading'
import { DependentRuleModal, ALTERNATIVE_GROUP_NOTE } from '@/components/admin/dependent-catalog/DependentRuleModal'
import { buildGroupOptions, catalogName, findByCode, isPendingGroup, PENDING_SUFFIX } from '@/utils/dependentCatalogUtils'

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

/** Nhãn nhóm NPT lấy `name` từ danh mục; mã chưa có trong danh mục thì hiện nguyên mã */
export function formatTargetGroup(group, groups = []) {
  if (!group) return 'Người phụ thuộc'
  const found = findByCode(groups, group)
  if (!found) return String(group)
  return `${catalogName(groups, group)}${isPendingGroup(found) ? PENDING_SUFFIX : ''}`
}

export function formatDocType(docType, docName) {
  // Tên do admin cấu hình trong DB (doc_name) luôn được ưu tiên hơn nhãn dựng sẵn
  if (docName?.trim()) return docName.trim()
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
  const [reloadTick, setReloadTick] = useState(0)
  const { groups, error: groupsError, reload: reloadGroups } = useDependentGroups()

  const [ruleModal, setRuleModal] = useState(null) // { mode, item }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const handleSubmitRule = async (form) => {
    setIsSubmitting(true)
    try {
      if (ruleModal.mode === 'create') await dependentRuleService.create(form)
      else await dependentRuleService.update(ruleModal.item.ruleId, form)
      showToast('success', ruleModal.mode === 'create' ? 'Đã thêm quy tắc giấy tờ.' : 'Đã cập nhật quy tắc giấy tờ.')
      setRuleModal(null)
      setReloadTick((t) => t + 1)
    } catch (err) {
      showToast('error', err?.message || 'Không lưu được quy tắc giấy tờ.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
  }, [debouncedTargetGroup, debouncedSearch, reloadTick])

  const targetGroupOptions = useMemo(
    () => buildGroupOptions(groups, rules.map((r) => r.targetGroup)),
    [groups, rules]
  )
  const docTypeOptions = useMemo(
    () => [...new Set([...Object.keys(DOC_TYPE_LABELS), ...rules.map((r) => r.docType).filter(Boolean)])].sort(),
    [rules]
  )

  const filteredRules = rules.filter((r) => {
    const matchGroup = targetGroupFilter === 'ALL' || r.targetGroup === targetGroupFilter
    const q = debouncedSearch.trim().toLowerCase()
    const vietGroup = formatTargetGroup(r.targetGroup, groups).toLowerCase()
    const vietDoc = formatDocType(r.docType, r.docName).toLowerCase()
    const matchSearch =
      !q ||
      vietGroup.includes(q) ||
      vietDoc.includes(q) ||
      r.docType?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.targetGroup?.toLowerCase().includes(q) ||
      r.alternativeGroup?.toLowerCase().includes(q)
    return matchGroup && matchSearch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-space-xl flex flex-col gap-space-lg">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] max-w-md px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
            Quy tắc hồ sơ
          </h2>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Các tiêu chuẩn hồ sơ bắt buộc và tùy chọn áp dụng theo từng nhóm đối tượng người phụ thuộc căn cứ theo quy định của Luật Thuế TNCN.
            {' '}{ALTERNATIVE_GROUP_NOTE}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRuleModal({ mode: 'create', item: null })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Thêm quy tắc</span>
        </button>
      </div>

      {groupsError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5 shrink-0">error</span>
          <div className="flex-1">
            <strong>Không tải được danh mục nhóm người phụ thuộc.</strong>
            <span className="block text-[13px] mt-0.5">{groupsError}</span>
          </div>
          <button
            type="button"
            onClick={reloadGroups}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

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
                <th className="py-3 px-4" title={ALTERNATIVE_GROUP_NOTE}>Chọn 1 trong</th>
                <th className="py-3 px-4 text-center">Tính bắt buộc</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center" title="Rule nguồn AI sẽ bị tắt khi đồng bộ lại quy tắc từ AI">Nguồn</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredRules.map((rule, idx) => (
                <tr key={rule.ruleId || idx} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-on-surface-variant font-medium">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface leading-snug">
                    {formatTargetGroup(rule.targetGroup, groups)}
                    <div className="font-mono text-[11px] font-normal text-on-surface-variant mt-0.5">{rule.targetGroup}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-on-surface leading-snug">
                    {formatDocType(rule.docType, rule.docName)}
                    <div className="font-mono text-[11px] text-on-surface-variant mt-0.5">{rule.docType}</div>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant max-w-md leading-relaxed text-xs">
                    {rule.description}
                  </td>
                  <td className="py-3.5 px-4">
                    {rule.alternativeGroup ? (
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[11px] font-semibold whitespace-nowrap">
                        {rule.alternativeGroup}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/50 text-xs">—</span>
                    )}
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
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        String(rule.source).toUpperCase() === 'AI'
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/40'
                      }`}
                    >
                      {rule.source || 'ADMIN'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      title="Sửa quy tắc"
                      onClick={() => setRuleModal({ mode: 'edit', item: rule })}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <TableLoadingRow
                  colSpan={9}
                  title="Đang tải danh mục quy tắc hồ sơ người phụ thuộc..."
                />
              )}
              {!isLoading && filteredRules.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant text-xs">
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

      {ruleModal && (
        <DependentRuleModal
          key={`${ruleModal.mode}-${ruleModal.item?.ruleId ?? 'new'}`}
          mode={ruleModal.mode}
          initialData={ruleModal.item}
          groups={groups}
          rules={rules}
          docTypeOptions={docTypeOptions}
          isSubmitting={isSubmitting}
          onClose={() => setRuleModal(null)}
          onSubmit={handleSubmitRule}
        />
      )}
    </div>
  )
}

