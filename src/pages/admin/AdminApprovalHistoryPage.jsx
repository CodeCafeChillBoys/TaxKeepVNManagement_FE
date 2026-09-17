import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { taxRuleService } from '@/services/taxRuleService'
import { profileService } from '@/services/profileService'
import { authService } from '@/services/authService'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Trích xuất họ và tên người dùng trực tiếp từ JWT payload (nếu có)
function getJwtUserName() {
  try {
    const token =
      localStorage.getItem('taxkeep_token') ||
      sessionStorage.getItem('taxkeep_token')
    if (token) {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        )
        return (
          payload.fullName ||
          payload.FullName ||
          payload.name ||
          payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
          null
        )
      }
    }
  } catch {
    // Bỏ qua nếu token không giải mã được
  }
  return null
}

export function AdminApprovalHistoryPage({ initialYear, onNavigateToReview }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Thông tin chuyên viên quản trị đăng nhập từ phiên làm việc và API hồ sơ
  const { user: authUser } = useAuth()
  const [userProfile, setUserProfile] = useState(() => authService.getUser() || null)

  // Tải thông tin hồ sơ chuyên viên từ API để lấy họ và tên chính thức
  useEffect(() => {
    let mounted = true
    profileService
      .getProfile()
      .then((res) => {
        if (!mounted) return
        const data = res?.data || res
        if (data?.fullName) {
          setUserProfile(data)
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải thông tin chuyên viên phê duyệt:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Năm tính thuế lọc: ưu tiên từ query param, props, hoặc mặc định là năm 2026
  const queryYear = searchParams.get('year') || searchParams.get('taxYear') || initialYear || '2026'
  const [selectedYear, setSelectedYear] = useState(queryYear)

  // Danh mục tất cả bộ quy tắc thuế từ hồ sơ lưu trữ
  const [allRuleSets, setAllRuleSets] = useState([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  // Dữ liệu chi tiết của năm đang chọn từ GET /api/tax-rules/year/{taxYear}
  const [yearDetailData, setYearDetailData] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState(null)

  // Bộ lọc tìm kiếm (tối ưu hóa bằng debounce)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // 1. Tải danh sách tất cả các bộ quy tắc đã phê duyệt có hiệu lực
  useEffect(() => {
    let mounted = true
    setIsLoadingList(true)

    taxRuleService
      .getAllRuleSets()
      .then((res) => {
        if (!mounted) return
        const list = Array.isArray(res) ? res : (res?.data || [])
        // Chỉ lấy những bộ quy tắc có trạng thái có hiệu lực thi hành
        const activeOnly = list.filter(
          (item) => String(item.status || '').toUpperCase() === 'ACTIVE'
        )
        setAllRuleSets(activeOnly)
      })
      .catch((err) => {
        console.warn('Lỗi khi tải danh mục lịch sử phê duyệt:', err)
      })
      .finally(() => {
        if (mounted) setIsLoadingList(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // 2. Tải toàn bộ thông tin quy tắc thuế theo năm tính thuế từ GET /api/tax-rules/year/{taxYear}
  useEffect(() => {
    if (!selectedYear || selectedYear === 'ALL') {
      setYearDetailData(null)
      setDetailError(null)
      return
    }

    let mounted = true
    setIsLoadingDetail(true)
    setDetailError(null)

    taxRuleService
      .getRuleSetByYear(selectedYear)
      .then((res) => {
        if (!mounted) return
        const resData = res?.data || res || {}
        const actual = resData.taxRuleSet
          ? resData
          : (resData.data?.taxRuleSet ? resData.data : resData)

        // Chỉ lấy bộ quy tắc có trạng thái có hiệu lực
        const isAct = String(actual.taxRuleSet?.status || '').toUpperCase() === 'ACTIVE'
        if (actual.taxRuleSet && isAct) {
          setYearDetailData(actual)
        } else if (actual.taxRuleSet && !isAct) {
          setYearDetailData(null)
          setDetailError(`Bộ quy tắc thuế năm ${selectedYear} chưa được phê duyệt ban hành có hiệu lực.`)
        } else {
          setYearDetailData(null)
          setDetailError(`Chưa có dữ liệu quy tắc thuế được phê duyệt cho năm ${selectedYear}.`)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setYearDetailData(null)
        if (err.status === 404 || err.message?.includes('404')) {
          setDetailError(`Chưa tìm thấy bộ quy tắc thuế nào có hiệu lực thi hành cho năm ${selectedYear}.`)
        } else {
          setDetailError(`Chưa thể tải dữ liệu quy tắc thuế cho năm ${selectedYear}.`)
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingDetail(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedYear])

  // Cập nhật URL khi đổi năm lọc
  const handleYearChange = (year) => {
    setSelectedYear(year)
    if (year === 'ALL') {
      const next = new URLSearchParams(searchParams)
      next.delete('year')
      next.delete('taxYear')
      setSearchParams(next, { replace: true })
    } else {
      setSearchParams({ year: String(year) }, { replace: true })
    }
  }

  // Danh sách các năm có bộ quy tắc đang có hiệu lực
  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    allRuleSets
      .filter((item) => String(item.status || '').toUpperCase() === 'ACTIVE')
      .forEach((item) => {
        if (item.taxYear) yearsSet.add(Number(item.taxYear))
      })
    if (yearsSet.size === 0) yearsSet.add(2026)
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [allRuleSets])

  // Lấy họ và tên thực tế của chuyên viên phê duyệt từ dữ liệu hệ thống (hoàn toàn không dùng hard-code)
  const formatApprover = (docOrApprover) => {
    // 1. Phân giải giá trị đầu vào (có thể truyền vào chuỗi string hoặc object bộ quy tắc)
    const val =
      typeof docOrApprover === 'object' && docOrApprover !== null
        ? docOrApprover.approvedByName ||
          docOrApprover.adminName ||
          docOrApprover.approvedBy ||
          docOrApprover.adminId
        : docOrApprover

    // 2. Lấy họ và tên thực tế của quản trị viên từ dữ liệu phiên động
    const currentAdminName =
      userProfile?.fullName ||
      authUser?.fullName ||
      authService.getUser()?.fullName ||
      getJwtUserName()

    if (!val || val === '—') {
      return currentAdminName || '—'
    }

    const trimmed = String(val).trim()
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)

    // Nếu giá trị đã là họ và tên văn bản (không phải chuỗi GUID định danh kỹ thuật)
    if (!isGuid) {
      return trimmed
    }

    // Nếu là chuỗi GUID định danh chuyên viên, phân giải sang họ tên thực tế từ phiên làm việc
    return currentAdminName || '—'
  }

  // Lọc danh sách lịch sử theo năm và từ khóa tìm kiếm (chỉ lấy status có hiệu lực, tối ưu hóa qua debounce)
  const filteredRuleSets = useMemo(() => {
    return allRuleSets.filter((item) => {
      if (String(item.status || '').toUpperCase() !== 'ACTIVE') {
        return false
      }
      if (selectedYear !== 'ALL' && Number(item.taxYear) !== Number(selectedYear)) {
        return false
      }
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase().trim()
        const matchName = item.name?.toLowerCase().includes(q)
        const matchYear = String(item.taxYear).includes(q)
        const approverName = formatApprover(item.approvedBy || item.adminId)
        const matchAdmin =
          approverName?.toLowerCase().includes(q) ||
          item.approvedBy?.toLowerCase().includes(q) ||
          item.adminId?.toLowerCase().includes(q)
        return matchName || matchYear || matchAdmin
      }
      return true
    })
  }, [allRuleSets, selectedYear, debouncedSearchQuery, userProfile, authUser])

  // Dữ liệu chi tiết của năm hiện tại
  const currentSet = yearDetailData?.taxRuleSet || null
  const currentRules = yearDetailData?.taxRules || []
  const currentDependents = yearDetailData?.dependentRules || []

  const brackets = currentRules.filter((r) => r.ruleType === 'BRACKET')
  const deductions = currentRules.filter((r) => r.ruleType === 'DEDUCTION')
  const ratesExemptions = currentRules.filter(
    (r) => r.ruleType === 'RATE' || r.ruleType === 'EXEMPTION'
  )

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return num.toLocaleString('vi-VN') + ' đ'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const handleOpenReview = (ruleSetId) => {
    if (onNavigateToReview) {
      onNavigateToReview(ruleSetId)
    } else {
      navigate(`/admin/quy-tac-thue?id=${ruleSetId}`)
    }
  }

  return (
    <div className="relative w-full p-space-xl flex flex-col gap-space-lg overflow-hidden">
      {/* Background Watermark */}
      <div className="pointer-events-none absolute right-4 top-8 w-96 h-96 opacity-[0.035] select-none text-primary">
        <svg fill="currentColor" viewBox="0 0 800 800">
          <circle cx="400" cy="400" fill="none" r="390" stroke="currentColor" strokeWidth="8"></circle>
          <circle cx="400" cy="400" fill="none" r="360" stroke="currentColor" strokeWidth="4"></circle>
          <circle cx="400" cy="400" fill="none" r="280" stroke="currentColor" strokeWidth="6"></circle>
        </svg>
      </div>

      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
              BẢNG LƯU TRỮ VĂN BẢN & PHÊ DUYỆT
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            LỊCH SỬ PHÊ DUYỆT QUY TẮC THUẾ
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Tra cứu thông tin chuẩn hóa và các quyết định phê duyệt bộ quy tắc thuế áp dụng theo từng năm tính thuế.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/40 shadow-2xs text-xs font-bold cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Tải văn bản mới</span>
          </button>

          <button
            onClick={() => {
              if (currentSet?.ruleSetId) {
                handleOpenReview(currentSet.ruleSetId)
              } else {
                navigate('/admin/quy-tac-thue')
              }
            }}
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container shadow-sm text-xs font-bold cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>Mở thẩm tra quy tắc</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Dropdown Năm (Shadcn UI Select) & Ô tìm kiếm */}
      <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-space-md">
        {/* Bộ chọn Năm sử dụng Dropdown Shadcn UI */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
            Năm:
          </span>
          <Select
            value={selectedYear}
            onValueChange={(val) => handleYearChange(val)}
          >
            <SelectTrigger className="w-[170px] h-9 bg-surface-container-low border-outline-variant/40 font-semibold text-primary">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-lowest border-outline-variant/40 shadow-md">
              <SelectItem value="ALL">Tất cả các năm</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  Năm {yr} {yr === 2026 ? '(Hiện hành)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm văn bản, chuyên viên phê duyệt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none"
          />
        </div>
      </div>

      {/* Highlight Box: Chi tiết quy tắc thuế theo năm tính thuế đã chọn */}
      {selectedYear !== 'ALL' && (
        <div className="flex flex-col gap-space-md">
          {isLoadingDetail ? (
            <div className="p-space-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex flex-col items-center justify-center min-h-[220px] text-center gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin"></div>
              <p className="text-sm font-bold text-on-surface">
                Đang truy xuất dữ liệu quy tắc thuế cho năm {selectedYear}...
              </p>
            </div>
          ) : detailError ? (
            <div className="p-space-lg rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-700 text-[26px] mt-0.5 shrink-0">
                  info
                </span>
                <div>
                  <h4 className="font-title-sm text-title-sm font-bold text-amber-950">
                    Chưa có bộ quy tắc thuế được phê duyệt cho năm {selectedYear}
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                    {detailError} Bạn có thể tải lên văn bản quy phạm pháp luật của năm này để hệ thống tiến hành tiếp nhận và xử lý.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
                className="px-4 py-2 rounded-lg bg-amber-800 text-amber-50 text-xs font-bold hover:bg-amber-900 transition-colors shrink-0 cursor-pointer"
              >
                Tải văn bản năm {selectedYear}
              </button>
            </div>
          ) : currentSet ? (
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm flex flex-col gap-space-md animate-in fade-in duration-200">
              {/* Top Row: Quyết định phê duyệt & Văn bản quy phạm */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md border-b border-outline-variant/30">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <span className="material-symbols-outlined text-[26px]">gavel</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-title-md text-title-md font-bold text-on-surface">
                        {currentSet.name || `Luật thuế thu nhập cá nhân năm ${currentSet.taxYear}`}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          String(currentSet.status).toUpperCase() === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25'
                            : 'bg-amber-500/10 text-amber-800 border border-amber-500/25'
                        }`}
                      >
                        {String(currentSet.status).toUpperCase() === 'ACTIVE'
                          ? 'ĐÃ PHÊ DUYỆT & CÓ HIỆU LỰC'
                          : 'BẢN LƯU NHÁP'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap mt-1">
                      <span>Năm tính thuế: <strong className="text-primary font-bold">{currentSet.taxYear}</strong></span>
                      <span>•</span>
                      <span>Ngày bắt đầu áp dụng: <strong>{formatDate(currentSet.effectiveFrom)}</strong></span>
                      {currentSet.effectiveTo && (
                        <>
                          <span>•</span>
                          <span>Đến ngày: <strong>{formatDate(currentSet.effectiveTo)}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                  <button
                    onClick={() => handleOpenReview(currentSet.ruleSetId)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Xem chi tiết quy tắc</span>
                  </button>
                </div>
              </div>

              {/* Middle Row: Thông tin thẩm định & Cán bộ phê duyệt */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md p-space-md rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">person_check</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant uppercase font-bold">Chuyên viên phê duyệt</span>
                    <span className="text-xs font-bold text-on-surface truncate max-w-[220px]" title={formatApprover(currentSet.approvedBy || currentSet.adminId)}>
                      {formatApprover(currentSet.approvedBy || currentSet.adminId)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">event_available</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant uppercase font-bold">Thời gian phê duyệt</span>
                    <span className="text-xs font-semibold text-on-surface">
                      {formatDateTime(currentSet.approvedAt || currentSet.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">link</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-on-surface-variant uppercase font-bold">Nguồn văn bản pháp quy</span>
                    {currentRules[0]?.sourceUrl ? (
                      <a
                        href={currentRules[0].sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                        title={currentRules[0].sourceUrl}
                      >
                        <span className="truncate">Văn bản quy chuẩn nguồn</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant">Văn bản lưu trữ nội bộ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Tóm tắt 4 nhóm quy tắc áp dụng cho năm này */}
              <div className="flex flex-col gap-space-sm pt-1">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
                  <span>Tóm tắt nội dung quy tắc thuế áp dụng năm {currentSet.taxYear}:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {/* Bậc thuế lũy tiến */}
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Biểu thuế lũy tiến</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {brackets.length} bậc
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
                      {brackets.slice(0, 3).map((b, i) => (
                        <div key={b.ruleId || i} className="flex items-center justify-between">
                          <span>{b.ruleName || `Bậc ${i + 1}`}</span>
                          <strong className="text-primary font-mono">{b.value}%</strong>
                        </div>
                      ))}
                      {brackets.length > 3 && (
                        <span className="text-[10px] text-primary cursor-pointer hover:underline" onClick={() => handleOpenReview(currentSet.ruleSetId)}>
                          + {brackets.length - 3} bậc thuế tiếp theo...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Giảm trừ gia cảnh */}
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Giảm trừ gia cảnh</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
                        {deductions.length} mức
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
                      {deductions.map((d, i) => (
                        <div key={d.ruleId || i} className="flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{d.ruleName || 'Mức giảm trừ'}</span>
                          <strong className="text-secondary font-mono">{formatCurrency(d.value)}</strong>
                        </div>
                      ))}
                      {deductions.length === 0 && <span>Chưa có quy định</span>}
                    </div>
                  </div>

                  {/* Quy tắc người phụ thuộc */}
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Người phụ thuộc</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-800">
                        {currentDependents.length} nhóm
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
                      {currentDependents.slice(0, 3).map((dep, i) => (
                        <div key={dep.id || i} className="flex items-center justify-between">
                          <span className="truncate max-w-[140px]">{dep.name || dep.dependentType}</span>
                          <span className="text-[10px] font-semibold text-emerald-700">Đạt chuẩn</span>
                        </div>
                      ))}
                      {currentDependents.length > 3 && (
                        <span className="text-[10px] text-emerald-800 cursor-pointer hover:underline" onClick={() => handleOpenReview(currentSet.ruleSetId)}>
                          + {currentDependents.length - 3} nhóm đối tượng khác...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Miễn thuế & Khác */}
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Miễn & Tỷ lệ khác</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800">
                        {ratesExemptions.length} quy định
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
                      {ratesExemptions.slice(0, 2).map((r, i) => (
                        <div key={r.ruleId || i} className="flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{r.ruleName || 'Miễn thuế'}</span>
                          <span className="font-mono text-amber-800">{r.value ? `${r.value}%` : 'Miễn 100%'}</span>
                        </div>
                      ))}
                      {ratesExemptions.length === 0 && <span>Theo luật định</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Bảng Danh mục Lịch sử Phê duyệt qua các năm */}
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/50 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              Danh mục hồ sơ văn bản quy phạm theo năm
            </h3>
            <p className="text-xs text-on-surface-variant">
              Tất cả các bộ quy tắc đã ban hành và lưu trữ trong hồ sơ.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
            {filteredRuleSets.length} văn bản
          </span>
        </div>

        {isLoadingList ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
            <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin"></div>
            <span className="text-xs">Đang tải hồ sơ lưu trữ...</span>
          </div>
        ) : filteredRuleSets.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant/50">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/60">
              folder_off
            </span>
            <p className="font-title-sm text-title-sm font-bold text-on-surface">
              Không tìm thấy văn bản phù hợp
            </p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Không có bộ quy tắc thuế nào khớp với tiêu chí tìm kiếm hoặc năm tính thuế đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-3">Năm</th>
                  <th className="py-3 px-3">Tên văn bản quy phạm</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3">Ngày bắt đầu hiệu lực</th>
                  <th className="py-3 px-3">Thời gian phê duyệt</th>
                  <th className="py-3 px-3">Chuyên viên phê duyệt</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {filteredRuleSets.map((doc) => {
                  const isAct = String(doc.status).toUpperCase() === 'ACTIVE'
                  return (
                    <tr
                      key={doc.ruleSetId}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-bold text-primary font-mono text-sm">
                        {doc.taxYear}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-on-surface max-w-[280px]">
                        <div className="truncate font-medium">{doc.name || `Quy tắc thuế năm ${doc.taxYear}`}</div>
                        <div className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5">
                          Hồ sơ quy tắc thuế năm {doc.taxYear}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            isAct
                              ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25'
                              : 'bg-amber-500/10 text-amber-800 border border-amber-500/25'
                          }`}
                        >
                          {isAct ? 'Đã hiệu lực' : 'Bản lưu nháp'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-on-surface">
                        {formatDate(doc.effectiveFrom)}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant">
                        {formatDateTime(doc.approvedAt || doc.createdAt)}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant max-w-[160px] truncate" title={doc.approvedBy || doc.adminId}>
                        {formatApprover(doc.approvedBy || doc.adminId)}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleOpenReview(doc.ruleSetId)}
                            className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-2xs transition-all flex items-center gap-1"
                          >
                            <span>Thẩm tra</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
