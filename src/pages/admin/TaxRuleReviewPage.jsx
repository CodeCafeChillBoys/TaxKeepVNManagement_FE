import { useState } from 'react'
import { taxRuleService } from '@/services/taxRuleService'

export function TaxRuleReviewPage({ extractedData, onBackToUpload, onApproveSuccess }) {
  const [activeTab, setActiveTab] = useState('bracketTab')
  const [searchQuery, setSearchQuery] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // If no data has been extracted yet from API
  if (!extractedData) {
    return (
      <div className="p-space-xl flex flex-col items-center justify-center min-h-[60vh] text-center gap-space-md">
        <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary shadow-sm">
          <span className="material-symbols-outlined text-[36px]">document_scanner</span>
        </div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          Chưa có dữ liệu quy tắc thuế
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md leading-relaxed">
          Hiện tại chưa có bộ quy tắc thuế nào được tải lên hoặc trích xuất. Vui lòng tải lên văn bản thuế dạng PDF để hệ thống tiến hành thẩm định.
        </p>
        <button
          onClick={onBackToUpload}
          className="px-space-xl py-3 rounded-lg bg-primary text-on-primary font-title-sm text-title-sm font-semibold hover:bg-primary-container shadow-md transition-all flex items-center gap-space-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          <span>Tải lên văn bản thuế ngay</span>
        </button>
      </div>
    )
  }

  // Real data from API response
  const taxRuleSet = extractedData.taxRuleSet || {}
  const rawTaxRules = extractedData.taxRules || []
  const rawDependentRules = extractedData.dependentRules || []

  // Extract ruleSetId từ taxRuleSet hoặc fallback từ dependentRules
  const ruleSetId =
    taxRuleSet.ruleSetId ||
    taxRuleSet.id ||
    rawDependentRules[0]?.ruleSetId ||
    extractedData.ruleSetId ||
    extractedData.id ||
    ''

  // Kiểm tra trạng thái đã phê duyệt:
  // 1. Từ state isApproved hiện tại
  // 2. Từ taxRuleSet.status hoặc extractedData.status === 'Active' / 'ACTIVE'
  // 3. Từ danh sách taxkeepvn_approved_rulesets trong localStorage
  const isSetApproved = (() => {
    if (isApproved) return true
    if (String(taxRuleSet.status).toUpperCase() === 'ACTIVE') return true
    if (String(extractedData?.status).toUpperCase() === 'ACTIVE') return true
    try {
      const approvedList = JSON.parse(localStorage.getItem('taxkeepvn_approved_rulesets') || '[]')
      if (ruleSetId && approvedList.includes(ruleSetId)) return true
      const currentYear = taxRuleSet.taxYear || extractedData?.taxYear
      if (currentYear && approvedList.includes(String(currentYear))) return true
    } catch {
      // Bỏ qua
    }
    return false
  })()

  // Filter 4 rule groups from API
  const brackets = rawTaxRules.filter((r) => r.ruleType === 'BRACKET')
  const deductions = rawTaxRules.filter((r) => r.ruleType === 'DEDUCTION')
  const rateExemptions = rawTaxRules.filter(
    (r) => r.ruleType === 'RATE' || r.ruleType === 'EXEMPTION'
  )
  const dependents = rawDependentRules

  const totalRulesCount = rawTaxRules.length

  const handleConfirmApprove = async () => {
    if (!ruleSetId) {
      showToast('Lỗi', 'Không tìm thấy ruleSetId để gửi yêu cầu phê duyệt.', 'error')
      return
    }

    setIsApproving(true)
    try {
      const response = await taxRuleService.approveRuleSet(ruleSetId)
      setIsApproved(true)
      setShowApproveModal(false)

      // Cập nhật trạng thái Active trực tiếp vào đối tượng extractedData
      const updatedTaxRuleSet = {
        ...taxRuleSet,
        status: 'Active',
      }
      const updatedExtractedData = {
        ...extractedData,
        status: 'Active',
        taxRuleSet: updatedTaxRuleSet,
      }

      // Lưu vào sessionStorage để khi reload page F5 giữ nguyên trạng thái
      try {
        sessionStorage.setItem('taxkeep_extracted_data', JSON.stringify(updatedExtractedData))
      } catch {
        // Bỏ qua lỗi lưu sessionStorage
      }

      // Lưu ruleSetId và taxYear vào danh sách các bộ quy tắc đã phê duyệt trong localStorage
      try {
        const approvedList = JSON.parse(localStorage.getItem('taxkeepvn_approved_rulesets') || '[]')
        if (ruleSetId && !approvedList.includes(ruleSetId)) {
          approvedList.push(ruleSetId)
        }
        if (taxRuleSet.taxYear && !approvedList.includes(String(taxRuleSet.taxYear))) {
          approvedList.push(String(taxRuleSet.taxYear))
        }
        localStorage.setItem('taxkeepvn_approved_rulesets', JSON.stringify(approvedList))
      } catch {
        // Bỏ qua lỗi lưu localStorage
      }

      // Đồng bộ cập nhật trạng thái của tài liệu này trong danh sách tải lên gần đây (localStorage)
      try {
        const savedDocs = JSON.parse(localStorage.getItem('taxkeepvn_uploaded_documents') || '[]')
        const updatedDocs = savedDocs.map((doc) => {
          const docId = doc.id || doc.ruleSetId || doc.extractedData?.taxRuleSet?.ruleSetId
          const docYear = doc.taxYear || doc.extractedData?.taxRuleSet?.taxYear
          const isMatch =
            (ruleSetId && docId === ruleSetId) ||
            (taxRuleSet.taxYear && String(docYear) === String(taxRuleSet.taxYear))

          if (isMatch) {
            return {
              ...doc,
              status: 'Active',
              extractedData: {
                ...doc.extractedData,
                status: 'Active',
                taxRuleSet: {
                  ...(doc.extractedData?.taxRuleSet || {}),
                  status: 'Active',
                },
              },
            }
          }
          return doc
        })
        localStorage.setItem('taxkeepvn_uploaded_documents', JSON.stringify(updatedDocs))
      } catch {
        // Bỏ qua lỗi cập nhật
      }

      // Thông báo lên component cha
      onApproveSuccess?.(updatedExtractedData)

      showToast(
        'Phê duyệt thành công!',
        response.message || `Bộ quy tắc thuế ${taxRuleSet.taxYear || ''} đã chính thức có hiệu lực thi hành.`,
        'success'
      )
    } catch (err) {
      showToast('Phê duyệt thất bại', err.message || 'Không thể phê duyệt bộ quy tắc thuế.', 'error')
    } finally {
      setIsApproving(false)
    }
  }

  const formatUnit = (unit) => {
    if (!unit) return ''
    const u = String(unit).trim().toLowerCase()
    if (u.includes('person') && u.includes('month')) return 'VNĐ/người/tháng'
    if (u.includes('person') && u.includes('year')) return 'VNĐ/người/năm'
    if (u === 'vnd/month' || u === 'vnđ/month') return 'VNĐ/tháng'
    if (u === 'vnd/year' || u === 'vnđ/year') return 'VNĐ/năm'
    if (u === 'vnd' || u === 'vnđ') return 'VNĐ'
    if (u === 'percent' || u === '%') return '%'
    return unit
      .replace(/VND/gi, 'VNĐ')
      .replace(/person/gi, 'người')
      .replace(/month/gi, 'tháng')
      .replace(/year/gi, 'năm')
  }

  const mapDependentType = (type) => {
    if (!type) return 'Người phụ thuộc'
    const map = {
      CHILD: 'Con dưới 18 tuổi',
      ADULT_CHILD: 'Con từ 18 tuổi trở lên đang đi học',
      SPOUSE: 'Vợ / Chồng',
      PARENT: 'Cha mẹ',
      OTHER: 'Người phụ thuộc khác',
    }
    return map[type] || type
  }

  const mapSubject = (subject) => {
    if (!subject) return ''
    const s = String(subject).trim()
    const map = {
      DEPENDENT: 'Người phụ thuộc',
      TAXPAYER: 'Người nộp thuế (Bản thân)',
      SELF: 'Bản thân người nộp thuế',
      RESIDENT: 'Cá nhân cư trú',
      NON_RESIDENT: 'Cá nhân không cư trú',
      INDIVIDUAL: 'Cá nhân',
      HOUSEHOLD_BUSINESS: 'Hộ, cá nhân kinh doanh',
      BUSINESS_INDIVIDUAL: 'Cá nhân kinh doanh',
      EMPLOYEE: 'Người lao động',
      OTHER: 'Đối tượng khác',
    }
    return map[s.toUpperCase()] || s
  }

  const parseCondition = (cond) => {
    if (!cond) return null
    if (typeof cond === 'object') return cond
    if (typeof cond === 'string') {
      const trimmed = cond.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return JSON.parse(trimmed)
        } catch {
          return trimmed
        }
      }
      return trimmed
    }
    return String(cond)
  }

  const formatCondition = (cond) => {
    const parsed = parseCondition(cond)
    if (!parsed) return 'Theo quy định pháp luật'
    if (typeof parsed === 'string') {
      return parsed
        .replace(/DEPENDENT/gi, 'Người phụ thuộc')
        .replace(/TAXPAYER/gi, 'Người nộp thuế')
        .replace(/RESIDENT/gi, 'Cá nhân cư trú')
        .replace(/NON_RESIDENT/gi, 'Cá nhân không cư trú')
        .replace(/VND\/person\/month/gi, 'VNĐ/người/tháng')
        .replace(/VND\/month/gi, 'VNĐ/tháng')
        .replace(/VND\/year/gi, 'VNĐ/năm')
        .replace(/VND/gi, 'VNĐ')
        .replace(/person/gi, 'người')
        .replace(/month/gi, 'tháng')
        .replace(/year/gi, 'năm')
    }
    if (typeof parsed === 'object') {
      if (parsed.description) {
        return formatCondition(parsed.description)
      }
      if (parsed.subject && parsed.eligibility) return `Đối tượng: ${mapSubject(parsed.subject)}`
      if (parsed.subject) return `Đối tượng: ${mapSubject(parsed.subject)}`
      if (parsed.minIncome !== undefined || parsed.maxIncome !== undefined) {
        const parts = []
        if (parsed.minIncome !== undefined) parts.push(`Từ ${Number(parsed.minIncome).toLocaleString('vi-VN')} đ`)
        if (parsed.maxIncome !== undefined) parts.push(`đến ${Number(parsed.maxIncome).toLocaleString('vi-VN')} đ`)
        return parts.join(' ')
      }
      return 'Theo quy định chi tiết'
    }
    return String(parsed)
  }

  const parseConditionsList = (conds) => {
    if (!conds) return []
    if (Array.isArray(conds)) return conds
    if (typeof conds === 'string') {
      const trimmed = conds.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) return parsed
        } catch {
          // Bỏ qua lỗi parse
        }
      }
      return [trimmed]
    }
    return [String(conds)]
  }

  const formatRateValue = (val) => {
    if (val === null || val === undefined) return '100%'
    if (typeof val === 'number') {
      if (val <= 1 && val > 0) return `${(val * 100).toFixed(1)}%`
      return `${val}%`
    }
    return String(val)
  }

  return (
    <div className="relative w-full p-space-xl flex flex-col gap-space-lg overflow-hidden">
      {/* Subtle Sunburst Watermark */}
      <div className="absolute -right-20 -top-20 w-96 h-96 opacity-[0.035] pointer-events-none text-secondary">
        <svg
          className="w-full h-full animate-[spin_160s_linear_infinite]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 400 400"
        >
          <circle cx="200" cy="200" r="190" strokeDasharray="4 8" strokeWidth="3"></circle>
          <circle cx="200" cy="200" r="160" strokeWidth="1.5"></circle>
          <circle cx="200" cy="200" r="120" strokeDasharray="8 6"></circle>
          <circle cx="200" cy="200" r="75"></circle>
          <polygon
            fill="currentColor"
            points="200,80 209,165 290,120 230,185 320,200 230,215 290,280 209,235 200,320 191,235 110,280 170,215 80,200 170,185 110,120 191,165"
          ></polygon>
        </svg>
      </div>

      {/* Header & Status Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-md mt-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              KIỂM TRA DỮ LIỆU TRÍCH XUẤT VĂN BẢN
            </h1>
            <div
              className={`flex items-center gap-1.5 px-space-md py-1 rounded-lg font-label-sm uppercase tracking-widest font-bold shadow-sm ${
                isSetApproved
                  ? 'bg-surface-container-high text-secondary border border-secondary-container'
                  : 'bg-secondary-container/30 text-secondary border border-secondary-container'
              }`}
            >
              <span className={`w-2 h-2 rounded-full bg-secondary ${!isSetApproved && 'animate-pulse'}`}></span>
              <span>{isSetApproved ? 'ĐÃ HIỆU LỰC' : 'BẢN NHÁP'}</span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Dữ liệu quy tắc thuế được trích xuất từ văn bản pháp quy, sẵn sàng thẩm định và kích hoạt áp dụng.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <button
            onClick={onBackToUpload}
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm transition-all text-label-md font-label-md font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span>Tải văn bản khác</span>
          </button>

          <button
            disabled={isSetApproved}
            onClick={() => setShowApproveModal(true)}
            className={`flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg font-label-md text-label-md font-bold shadow-md transition-all cursor-pointer ${
              isSetApproved
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-75'
                : 'bg-primary text-on-primary hover:bg-primary-container shadow-primary/25'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSetApproved ? 'task_alt' : 'verified'}
            </span>
            <span>{isSetApproved ? 'Đã phê duyệt' : 'Phê duyệt bộ quy tắc'}</span>
          </button>
        </div>
      </div>

      {/* Tax Rule Set Metadata Card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[28px]">policy</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                  Căn cứ pháp quy hành chính
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
              </div>
              <h2 className="font-headline-md text-headline-md text-primary font-bold mt-0.5">
                {taxRuleSet.name || 'Bộ quy tắc thuế'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-low/60 p-space-sm rounded-lg self-start">
            <span className="px-2 py-1 rounded bg-secondary-container/30 text-secondary text-label-sm font-bold">
              {isSetApproved ? 'Đã hiệu lực' : 'Bản nháp'}
            </span>
            {taxRuleSet.adminId && (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container text-on-surface-variant text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">shield_person</span>
                <span>Quản trị viên</span>
              </span>
            )}
            {taxRuleSet.sourceUrl && (
              <a
                href={taxRuleSet.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>Nguồn văn bản gốc</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md pt-space-xs">
          <div className="flex flex-col bg-surface-container-low/50 p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Năm
            </span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                {taxRuleSet.taxYear || '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-col bg-surface-container-low/50 p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Hiệu lực áp dụng
            </span>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="material-symbols-outlined text-secondary text-[18px]">event_available</span>
              <span className="font-title-sm text-title-sm font-bold text-on-surface">
                {taxRuleSet.effectiveFrom || 'Chưa xác định'}
              </span>
            </div>
          </div>

          <div className="flex flex-col bg-surface-container-low/50 p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Thời hạn kết thúc
            </span>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="material-symbols-outlined text-outline text-[18px]">all_inclusive</span>
              <span className="font-title-sm text-title-sm font-medium text-on-surface-variant">
                {taxRuleSet.effectiveTo || 'Chưa xác định'}
              </span>
            </div>
          </div>

          <div className="flex flex-col bg-surface-container-low/50 p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Tổng quy tắc trích xuất
            </span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-headline-md text-headline-md font-bold text-primary">
                {totalRulesCount}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Quy tắc
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-xs rounded-xl shadow-sm">
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('bracketTab')}
            className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-lg transition-all font-title-sm text-title-sm cursor-pointer ${
              activeTab === 'bracketTab'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">stacked_bar_chart</span>
            <span>Biểu thuế lũy tiến</span>
            <span className="px-space-xs py-0.5 rounded text-label-sm bg-surface-container-high text-on-surface-variant font-bold">
              {brackets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deductionTab')}
            className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-lg transition-all font-title-sm text-title-sm cursor-pointer ${
              activeTab === 'deductionTab'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">savings</span>
            <span>Giảm trừ gia cảnh</span>
            <span className="px-space-xs py-0.5 rounded text-label-sm bg-surface-container-high text-on-surface-variant font-bold">
              {deductions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dependentRulesTab')}
            className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-lg transition-all font-title-sm text-title-sm cursor-pointer ${
              activeTab === 'dependentRulesTab'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">family_restroom</span>
            <span>Tiêu chí Người phụ thuộc</span>
            <span className="px-space-xs py-0.5 rounded text-label-sm bg-surface-container-high text-on-surface-variant font-bold">
              {dependents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rateExemptionTab')}
            className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-lg transition-all font-title-sm text-title-sm cursor-pointer ${
              activeTab === 'rateExemptionTab'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">percent</span>
            <span>Thuế suất khác &amp; Miễn thuế</span>
            <span className="px-space-xs py-0.5 rounded text-label-sm bg-surface-container-high text-on-surface-variant font-bold">
              {rateExemptions.length}
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-space-sm px-space-sm">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã, tên quy tắc..."
              className="pl-8 pr-3 py-1.5 rounded bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all w-52 focus:w-64 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: Biểu thuế lũy tiến */}
      {activeTab === 'bracketTab' && (
        <div className="flex flex-col w-full gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/80 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-space-md px-space-md font-bold w-12 text-center">STT</th>
                    <th className="py-space-md px-space-md font-bold">
                      Tên quy tắc &amp; Diễn giải điều kiện (condition)
                    </th>
                    <th className="py-space-md px-space-md font-bold text-right">Thuế suất</th>
                    <th className="py-space-md px-space-md font-bold">Căn cứ pháp lý</th>
                    <th className="py-space-md px-space-md font-bold text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {brackets
                    .filter(
                      (b) =>
                        !searchQuery ||
                        (b.ruleName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.ruleCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, i) => (
                      <tr key={item.ruleCode || i} className="hover:bg-surface-container-low/40 transition-colors group">
                        <td className="py-space-sm px-space-md text-center font-mono text-on-surface-variant font-medium">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="py-space-sm px-space-md font-semibold">
                          <button
                            type="button"
                            onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Biểu thuế lũy tiến' })}
                            className="text-left font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
                          >
                            {item.ruleName}
                          </button>
                          <span className="block text-body-sm text-on-surface-variant font-normal">
                            {formatCondition(item.condition)}
                          </span>
                        </td>
                        <td className="py-space-sm px-space-md text-right font-semibold font-mono tabular-nums">
                          <span className="text-headline-sm font-bold text-secondary">
                            {formatRateValue(item.value)}
                          </span>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <div className="flex items-center gap-1 text-secondary font-medium text-body-sm">
                            <span className="material-symbols-outlined text-[16px]">menu_book</span>
                            <span>{item.article ? `Điều ${item.article}` : ''}{item.clause ? `, Khoản ${item.clause}` : ''}{item.point ? `, Điểm ${item.point}` : ''}</span>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-md text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Biểu thuế lũy tiến' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                            title="Xem chi tiết bậc thuế"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {brackets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant text-body-sm">
                        Không có dữ liệu biểu thuế lũy tiến.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-space-md py-space-sm bg-surface-container-low/40 border-t border-surface-container-high/40">
              <span className="text-body-sm text-on-surface-variant">
                Hiển thị {brackets.length} bậc thuế lũy tiến
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Giảm trừ gia cảnh */}
      {activeTab === 'deductionTab' && (
        <div className="flex flex-col w-full gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/80 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-space-md px-space-md font-bold w-12 text-center">STT</th>
                    <th className="py-space-md px-space-md font-bold">
                      Tên quy tắc &amp; Diễn giải điều kiện (condition)
                    </th>
                    <th className="py-space-md px-space-md font-bold text-right">Mức trích xuất</th>
                    <th className="py-space-md px-space-md font-bold">Căn cứ pháp lý</th>
                    <th className="py-space-md px-space-md font-bold text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {deductions
                    .filter(
                      (d) =>
                        !searchQuery ||
                        (d.ruleName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (d.ruleCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, i) => (
                    <tr key={item.ruleCode || i} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="py-space-sm px-space-md text-center font-mono text-on-surface-variant font-medium">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="py-space-sm px-space-md font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Giảm trừ gia cảnh' })}
                          className="text-left font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
                        >
                          {item.ruleName}
                        </button>
                        <span className="block text-body-sm text-on-surface-variant font-normal">
                          {formatCondition(item.condition)}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-md text-right font-semibold font-mono tabular-nums">
                        <span className="text-headline-sm font-bold text-primary">
                          {item.value ? Number(item.value).toLocaleString('vi-VN') : '—'}
                        </span>
                        <span className="text-body-sm text-on-surface-variant ml-1">{formatUnit(item.unit)}</span>
                      </td>
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-1 text-secondary font-medium text-body-sm">
                          <span className="material-symbols-outlined text-[16px]">menu_book</span>
                          <span>{item.article ? `Điều ${item.article}` : ''}{item.clause ? `, Khoản ${item.clause}` : ''}{item.point ? `, Điểm ${item.point}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Giảm trừ gia cảnh' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                          title="Xem chi tiết mức giảm trừ"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deductions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant text-body-sm">
                        Không có dữ liệu giảm trừ gia cảnh.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Tiêu chí Người phụ thuộc */}
      {activeTab === 'dependentRulesTab' && (
        <div className="flex flex-col w-full gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col p-space-lg">
            <div className="flex items-center justify-between pb-space-md">
              <div>
                <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                  Tiêu chuẩn định danh người phụ thuộc giảm trừ gia cảnh ({dependents.length} đối tượng)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Tiêu chuẩn áp dụng đối với các nhóm đối tượng người phụ thuộc được giảm trừ gia cảnh.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-sm">
              {dependents.map((dep, idx) => (
                <div
                  key={dep.id || idx}
                  className="p-space-md rounded-xl bg-surface-container-low/40 flex flex-col justify-between gap-space-md hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        {dep.dependentType === 'CHILD' ? 'child_care' : dep.dependentType === 'ADULT_CHILD' ? 'school' : dep.dependentType === 'SPOUSE' ? 'favorite' : dep.dependentType === 'PARENT' ? 'elderly' : 'group'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container text-secondary">
                        {mapDependentType(dep.dependentType)}
                      </span>
                    </div>
                    <h4 className="font-title-sm text-title-sm font-bold text-on-surface mt-1">
                      {dep.name}
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {parseConditionsList(dep.conditions).join(', ') || 'Theo quy định pháp luật'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-space-xs pt-space-sm border-t border-surface-container-high/60">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface-variant">Độ tuổi tối đa:</span>
                      <span className="font-bold text-primary">{dep.maxAge ? `Dưới ${dep.maxAge} tuổi` : 'Không áp dụng'}</span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface-variant">Thu nhập tối đa:</span>
                      <span className="font-bold text-secondary">
                        {dep.maxMonthlyIncome ? `≤ ${Number(dep.maxMonthlyIncome).toLocaleString('vi-VN')} đ/tháng` : 'Không quy định'}
                      </span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface-variant">Tình trạng:</span>
                      <span className="font-medium text-on-surface">{dep.isStudying ? 'Đang đi học' : dep.isDisabled ? 'Khuyết tật' : 'Bình thường'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/60">
                    <span className="text-[11px] text-on-surface-variant font-medium">Hồ sơ &amp; Tiêu chuẩn</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDetail({ type: 'DEPENDENT_RULE', data: dep, category: 'Tiêu chí Người phụ thuộc' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary/10 text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Chi tiết</span>
                    </button>
                  </div>
                </div>
              ))}
              {dependents.length === 0 && (
                <div className="col-span-3 py-8 text-center text-on-surface-variant text-body-sm">
                  Không có tiêu chí người phụ thuộc.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Thuế suất khác & Miễn thuế */}
      {activeTab === 'rateExemptionTab' && (
        <div className="flex flex-col w-full gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/80 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-space-md px-space-md font-bold w-12 text-center">STT</th>
                    <th className="py-space-md px-space-md font-bold">
                      Tên quy tắc &amp; Diễn giải điều kiện
                    </th>
                    <th className="py-space-md px-space-md font-bold text-right">Giá trị</th>
                    <th className="py-space-md px-space-md font-bold">Căn cứ pháp lý</th>
                    <th className="py-space-md px-space-md font-bold text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {rateExemptions
                    .filter(
                      (r) =>
                        !searchQuery ||
                        (r.ruleName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.ruleCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, i) => (
                    <tr key={item.ruleCode || i} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="py-space-sm px-space-md text-center font-mono text-on-surface-variant font-medium">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="py-space-sm px-space-md font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Thuế suất khác & Miễn thuế' })}
                          className="text-left font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
                        >
                          {item.ruleName}
                        </button>
                        <div className="text-body-sm text-on-surface-variant font-normal mt-0.5">
                          {formatCondition(item.condition)}
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md text-right font-semibold font-mono tabular-nums">
                        <span className="text-headline-sm font-bold text-secondary">
                          {formatRateValue(item.value)}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-1 text-secondary font-medium text-body-sm">
                          <span className="material-symbols-outlined text-[16px]">menu_book</span>
                          <span>{item.article ? `Điều ${item.article}` : ''}{item.clause ? `, Khoản ${item.clause}` : ''}{item.point ? `, Điểm ${item.point}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Thuế suất khác & Miễn thuế' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                          title="Xem chi tiết quy tắc"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rateExemptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant text-body-sm">
                        Không có dữ liệu thuế suất khác hoặc miễn thuế.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rule Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl p-space-xl flex flex-col gap-space-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-space-md border-b border-outline-variant/30 pb-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">
                    {selectedDetail.type === 'DEPENDENT_RULE'
                      ? 'family_restroom'
                      : selectedDetail.data.ruleType === 'BRACKET'
                      ? 'stacked_bar_chart'
                      : selectedDetail.data.ruleType === 'DEDUCTION'
                      ? 'savings'
                      : 'percent'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-secondary-container/40 text-secondary uppercase tracking-wider">
                      {selectedDetail.category}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
                    {selectedDetail.data.ruleName || selectedDetail.data.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Content based on type */}
            {selectedDetail.type === 'TAX_RULE' ? (
              <div className="flex flex-col gap-space-md">
                {/* Core Values Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Mức áp dụng / Giá trị
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-headline-md font-bold text-primary">
                        {selectedDetail.data.ruleType === 'BRACKET' || selectedDetail.data.ruleType === 'RATE'
                          ? formatRateValue(selectedDetail.data.value)
                          : selectedDetail.data.value
                          ? Number(selectedDetail.data.value).toLocaleString('vi-VN')
                          : 'Theo quy định'}
                      </span>
                      {selectedDetail.data.unit && (
                        <span className="text-body-sm font-medium text-on-surface-variant">
                          {formatUnit(selectedDetail.data.unit)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Năm &amp; Hiệu lực
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-on-surface font-medium text-body-sm">
                      <span className="material-symbols-outlined text-secondary text-[18px]">calendar_today</span>
                      <span>Năm {taxRuleSet.taxYear || selectedDetail?.data?.taxYear || '—'}</span>
                      {selectedDetail.data.effectiveFrom && (
                        <span className="text-on-surface-variant text-xs">
                          (Từ: {selectedDetail.data.effectiveFrom})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Condition Details */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-2 border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-secondary font-bold text-title-sm">
                    <span className="material-symbols-outlined text-[18px]">rule</span>
                    <span>Điều kiện áp dụng chi tiết</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-body-md text-on-surface leading-relaxed">
                    {(() => {
                      const condObj = parseCondition(selectedDetail.data.condition)
                      if (typeof condObj === 'object' && condObj !== null) {
                        return (
                          <div className="flex flex-col gap-1.5 text-sm">
                            {condObj.subject && (
                              <div><strong>Đối tượng áp dụng:</strong> {mapSubject(condObj.subject)}</div>
                            )}
                            {condObj.minIncome !== undefined && (
                              <div><strong>Mức thu nhập tối thiểu:</strong> {Number(condObj.minIncome).toLocaleString('vi-VN')} VNĐ</div>
                            )}
                            {condObj.maxIncome !== undefined && (
                              <div><strong>Mức thu nhập tối đa:</strong> {Number(condObj.maxIncome).toLocaleString('vi-VN')} VNĐ</div>
                            )}
                            {condObj.description && (
                              <div><strong>Diễn giải:</strong> {formatCondition(condObj.description)}</div>
                            )}
                            {Object.entries(condObj)
                              .filter(([k]) => !['subject', 'minIncome', 'maxIncome', 'description', 'eligibility'].includes(k))
                              .map(([k, v]) => (
                                <div key={k}>
                                  <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </div>
                              ))}
                          </div>
                        )
                      }
                      return <p>{formatCondition(selectedDetail.data.condition)}</p>
                    })()}
                  </div>
                </div>

                {/* Legal Reference */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-2 border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-primary font-bold text-title-sm">
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    <span>Căn cứ pháp lý &amp; Trích dẫn văn bản</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                      <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Điều</span>
                      <span className="font-bold text-on-surface text-body-md">
                        {selectedDetail.data.article ? `Điều ${selectedDetail.data.article}` : 'Chưa ghi rõ'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                      <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Khoản</span>
                      <span className="font-bold text-on-surface text-body-md">
                        {selectedDetail.data.clause ? `Khoản ${selectedDetail.data.clause}` : 'Chưa ghi rõ'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                      <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Điểm</span>
                      <span className="font-bold text-on-surface text-body-md">
                        {selectedDetail.data.point ? `Điểm ${selectedDetail.data.point}` : 'Chưa ghi rõ'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                    <span className="truncate">Văn bản: {selectedDetail.data.legalDocument || taxRuleSet.name || '—'}</span>
                    {(selectedDetail.data.sourceUrl || taxRuleSet.sourceUrl) && (
                      <a
                        href={selectedDetail.data.sourceUrl || taxRuleSet.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
                      >
                        <span>Mở văn bản gốc</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* DEPENDENT_RULE Details */
              <div className="flex flex-col gap-space-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Nhóm đối tượng
                    </span>
                    <span className="text-title-sm font-bold text-primary mt-0.5">
                      {mapDependentType(selectedDetail.data.dependentType)}
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Mức thu nhập tối đa
                    </span>
                    <span className="text-title-sm font-bold text-secondary mt-0.5">
                      {selectedDetail.data.maxMonthlyIncome
                        ? `≤ ${Number(selectedDetail.data.maxMonthlyIncome).toLocaleString('vi-VN')} đ/tháng`
                        : 'Không quy định'}
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Độ tuổi tối đa
                    </span>
                    <span className="text-title-sm font-bold text-on-surface mt-0.5">
                      {selectedDetail.data.maxAge ? `Dưới ${selectedDetail.data.maxAge} tuổi` : 'Không giới hạn'}
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-1 border border-outline-variant/20">
                    <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                      Điều kiện học tập &amp; sức khỏe
                    </span>
                    <span className="text-title-sm font-bold text-on-surface mt-0.5">
                      {selectedDetail.data.isStudying ? 'Đang theo học' : selectedDetail.data.isDisabled ? 'Khuyết tật / Mất khả năng LĐ' : 'Bình thường'}
                    </span>
                  </div>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-2 border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-secondary font-bold text-title-sm">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>Điều kiện chứng minh &amp; Hồ sơ</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-body-md text-on-surface leading-relaxed">
                    {(() => {
                      const list = parseConditionsList(selectedDetail.data.conditions)
                      if (list.length > 1) {
                        return (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {list.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        )
                      }
                      return (
                        <p className="text-sm">{list[0] || 'Cung cấp giấy tờ chứng minh theo quy định hiện hành.'}</p>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-space-xl py-2 rounded-lg bg-primary text-on-primary font-title-sm text-title-sm font-semibold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm transition-opacity duration-200 p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-2xl p-space-xl flex flex-col gap-space-lg transform transition-transform duration-200 scale-100">
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[28px]">gavel</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Xác nhận Phê duyệt Bộ quy tắc
                </h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Ban hành áp dụng bộ quy tắc làm căn cứ tính thuế thu nhập cá nhân
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-space-md p-space-md bg-surface-container-low/60 rounded-xl text-body-md text-on-surface">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant">Bộ quy tắc áp dụng:</span>
                <span className="font-bold text-on-surface">{taxRuleSet.name || (taxRuleSet.taxYear ? `Quy tắc thuế năm ${taxRuleSet.taxYear}` : '—')}</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant">Năm:</span>
                <span className="font-bold text-primary">{taxRuleSet.taxYear || '—'}</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant">Số lượng quy tắc:</span>
                <span className="font-bold text-secondary">{totalRulesCount} quy tắc</span>
              </div>
              <div className="mt-space-xs p-space-sm rounded bg-surface-container-high/40 text-secondary text-body-sm leading-relaxed flex items-start gap-space-xs">
                <span className="material-symbols-outlined text-[18px] shrink-0">verified</span>
                <span>
                  Sau khi được phê duyệt, bộ quy tắc sẽ chính thức có{' '}
                  <strong>hiệu lực thi hành</strong> và được áp dụng thống nhất để xác định nghĩa vụ thuế thu nhập cá nhân.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-space-md py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-title-sm text-title-sm font-medium transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isApproving}
                onClick={handleConfirmApprove}
                className="flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-sm text-title-sm font-bold shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-80"
              >
                {isApproving ? (
                  <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                )}
                <span>{isApproving ? 'Đang xử lý phê duyệt...' : 'Xác nhận phê duyệt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-space-md px-space-lg py-space-md rounded-xl bg-surface-container-lowest shadow-2xl border border-secondary-container transition-all">
          <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined text-[22px]">
              {toast.type === 'error' ? 'error' : 'verified'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-title-sm text-title-sm font-bold text-on-surface">
              {toast.title}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
