import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { taxRuleService } from '@/services/taxRuleService'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * Trích xuất năm văn bản từ ngày hiệu lực hoặc tên văn bản quy phạm
 */
function extractYearFromTextOrDate(effectiveFrom, name, fallbackRules = []) {
  if (effectiveFrom) {
    const match = String(effectiveFrom).match(/(?:19|20)\d{2}/)
    if (match) return parseInt(match[0], 10)
  }
  if (fallbackRules && fallbackRules.length > 0) {
    for (const rule of fallbackRules) {
      if (rule.effectiveFrom) {
        const match = String(rule.effectiveFrom).match(/(?:19|20)\d{2}/)
        if (match) return parseInt(match[0], 10)
      }
    }
  }
  if (name) {
    const match = String(name).match(/(?:năm|luật|nghị quyết|thông tư|qđ|tt)?\s*([12]\d{3})/i)
    if (match) return parseInt(match[1], 10)
  }
  return null
}

export function TaxRuleReviewPage({
  extractedData,
  ruleSetId: propRuleSetId,
  onBackToUpload,
  onApproveSuccess,
  onDataLoaded,
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { id: paramId } = useParams()

  const currentRuleSetId =
    propRuleSetId ||
    paramId ||
    searchParams.get('id') ||
    searchParams.get('ruleSetId') ||
    extractedData?.ruleSetId ||
    extractedData?.taxRuleSet?.ruleSetId ||
    ''

  const [currentData, setCurrentData] = useState(() => extractedData || null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [availableRuleSets, setAvailableRuleSets] = useState([])
  const [activeTab, setActiveTab] = useState('bracketTab')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [toast, setToast] = useState(null)

  // Trạng thái modal và form chỉnh sửa thông tin bộ quy tắc
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    taxYear: '',
    effectiveFrom: '',
    effectiveTo: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [editErrors, setEditErrors] = useState({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Trạng thái modal và form chỉnh sửa từng quy tắc riêng lẻ
  const [editingRule, setEditingRule] = useState(null)

  // 1. Đồng bộ prop extractedData khi component cha cập nhật
  useEffect(() => {
    if (extractedData && extractedData !== currentData) {
      setCurrentData(extractedData)
    }
    const exId =
      extractedData?.ruleSetId ||
      extractedData?.taxRuleSet?.ruleSetId ||
      extractedData?.id ||
      currentRuleSetId
    if (exId && !searchParams.get('id') && !paramId) {
      setSearchParams({ id: exId }, { replace: true })
    }
  }, [extractedData, currentRuleSetId, searchParams, paramId, setSearchParams])

  // 2. Đồng bộ ngược dữ liệu hiện tại lên AdminDashboard (In-Memory React state)
  useEffect(() => {
    if (currentData && currentData !== extractedData) {
      onDataLoaded?.(currentData)
    }
  }, [currentData, extractedData, onDataLoaded])

  // 3. Tự động đồng bộ danh mục bộ quy tắc từ CSDL và tải chi tiết bộ quy tắc (Active hoặc theo URL/props)
  useEffect(() => {
    let isMounted = true

    const explicitId =
      currentRuleSetId ||
      paramId ||
      searchParams.get('id') ||
      searchParams.get('ruleSetId')

    const explicitYear =
      searchParams.get('year') ||
      searchParams.get('taxYear')

    const currentLoadedId =
      currentData?.taxRuleSet?.ruleSetId ||
      currentData?.ruleSetId ||
      currentData?.id

    const currentLoadedYear =
      currentData?.taxRuleSet?.taxYear ||
      currentData?.taxYear

    const fetchDetail = (targetId, targetYear = null) => {
      if ((!targetId && !targetYear) || !isMounted) return
      setIsLoadingDetail(true)

      const apiCall = targetYear
        ? taxRuleService.getRuleSetByYear(targetYear)
        : taxRuleService.getRuleSetDetail(targetId)

      apiCall
        .then((res) => {
          if (!isMounted) return
          const resData = res?.data || res || {}
          const actual = resData.taxRuleSet
            ? resData
            : (resData.data?.taxRuleSet ? resData.data : resData)
          if (actual.taxRuleSet || actual.taxRules) {
            const ruleSet = actual.taxRuleSet || {}
            const rules = actual.taxRules || []
            const registeredYear = parseInt(ruleSet.taxYear, 10)

            // Bảo toàn verification từ phiên làm việc nếu có
            let mergedVerification =
              actual.verification ||
              currentData?.verification ||
              extractedData?.verification ||
              null

            let mergedWarning =
              actual.warning ||
              currentData?.warning ||
              extractedData?.warning ||
              null

            // Nếu chưa có verification (do CSDL không lưu cột này), tự động đối soát dựa trên văn bản
            if (!mergedVerification && registeredYear) {
              const docYear = extractYearFromTextOrDate(
                ruleSet.effectiveFrom,
                ruleSet.name,
                rules
              )
              if (docYear && docYear !== registeredYear) {
                mergedVerification = {
                  inputTaxYear: registeredYear,
                  extractedTaxYear: docYear,
                  isTaxYearMatched: false,
                  mismatchReason: `Năm áp dụng văn bản nhận diện được là ${docYear}, khác với năm tính thuế đăng ký ${registeredYear}.`,
                  warningMessage: `Văn bản quy định áp dụng từ năm ${docYear}, chưa hoàn toàn khớp với năm tính thuế ${registeredYear}.`,
                }
                mergedWarning = mergedVerification.warningMessage
              } else if (docYear && docYear === registeredYear) {
                mergedVerification = {
                  inputTaxYear: registeredYear,
                  extractedTaxYear: docYear,
                  isTaxYearMatched: true,
                  mismatchReason: null,
                  warningMessage: null,
                }
              }
            }

            const completeData = {
              ...actual,
              verification: mergedVerification,
              warning: mergedWarning || mergedVerification?.warningMessage || null,
            }

            setCurrentData(completeData)
            onDataLoaded?.(completeData)
            const resolvedId = ruleSet.ruleSetId || targetId
            if (resolvedId && !searchParams.get('id') && !paramId) {
              setSearchParams({ id: resolvedId }, { replace: true })
            }
          } else {
            setCurrentData(null)
          }
        })
        .catch((err) => {
          if (!isMounted) return
          setCurrentData(null)
          showToast(
            'Không tìm thấy dữ liệu',
            err.status === 404
              ? 'Không tìm thấy thông tin bộ quy tắc thuế trên hệ thống.'
              : err.message || 'Không thể tải chi tiết bộ quy tắc thuế.',
            'warning'
          )
        })
        .finally(() => {
          if (isMounted) setIsLoadingDetail(false)
        })
    }

    // Luôn tải danh sách tất cả các bộ quy tắc trong CSDL để nạp vào bộ chọn
    taxRuleService
      .getAllRuleSets()
      .then((res) => {
        if (!isMounted) return
        const list = Array.isArray(res) ? res : (res?.data || [])
        setAvailableRuleSets(list)

        // Nếu trên URL không có ID và không có Year và chưa có currentData:
        // Tự động chọn bộ quy tắc Đang áp dụng (Active) hoặc gần nhất từ CSDL
        if (!explicitId && !explicitYear && !currentData) {
          if (list.length > 0) {
            const activeSet =
              list.find((s) => String(s.status).toUpperCase() === 'ACTIVE') || list[0]
            if (activeSet?.ruleSetId) {
              setSearchParams({ id: activeSet.ruleSetId }, { replace: true })
              fetchDetail(activeSet.ruleSetId)
            } else {
              setIsLoadingDetail(false)
            }
          } else {
            setIsLoadingDetail(false)
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải danh mục bộ quy tắc thuế:', err)
        if (!explicitId && !explicitYear && !currentData) {
          setIsLoadingDetail(false)
        }
      })

    // Nếu có explicitYear và không có explicitId
    if (explicitYear && !explicitId && (!currentData || String(currentLoadedYear) !== String(explicitYear))) {
      fetchDetail(null, explicitYear)
    } else if (explicitId && (!currentData || currentLoadedId !== explicitId)) {
      fetchDetail(explicitId)
    }

    return () => {
      isMounted = false
    }
  }, [currentRuleSetId, paramId, searchParams, currentData, extractedData, onDataLoaded, setSearchParams])

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // Tự động bảo toàn và kiểm tra đối soát năm tính thuế (Hooks luôn đặt trên cùng trước return sớm)
  const verification = useMemo(() => {
    if (!currentData) return null
    if (currentData.verification) return currentData.verification
    if (currentData.taxRuleSet?.verification) return currentData.taxRuleSet.verification
    if (extractedData?.verification) return extractedData.verification

    const ruleSet = currentData.taxRuleSet || {}
    const rules = currentData.taxRules || []
    const registeredYear = parseInt(ruleSet.taxYear, 10)
    if (registeredYear) {
      const docYear = extractYearFromTextOrDate(
        ruleSet.effectiveFrom,
        ruleSet.name,
        rules
      )
      if (docYear && docYear !== registeredYear) {
        return {
          inputTaxYear: registeredYear,
          extractedTaxYear: docYear,
          isTaxYearMatched: false,
          mismatchReason: `Năm áp dụng văn bản nhận diện được là ${docYear}, khác với năm tính thuế đăng ký ${registeredYear}.`,
          warningMessage: `Văn bản quy định áp dụng từ năm ${docYear}, không khớp với năm tính thuế đăng ký ${registeredYear}.`,
        }
      } else if (docYear && docYear === registeredYear) {
        return {
          inputTaxYear: registeredYear,
          extractedTaxYear: docYear,
          isTaxYearMatched: true,
          mismatchReason: null,
          warningMessage: null,
        }
      }
    }
    return null
  }, [currentData, extractedData])

  // Đang tải chi tiết bộ quy tắc
  if (isLoadingDetail) {
    return (
      <div className="p-space-xl flex flex-col items-center justify-center min-h-[60vh] text-center gap-space-md animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <h3 className="font-title-md text-title-md font-bold text-on-surface">
          Đang tải dữ liệu bộ quy tắc thuế...
        </h3>
        <p className="font-body-sm text-on-surface-variant max-w-sm">
          Hệ thống đang chuẩn hóa và tải dữ liệu quy tắc thuế từ văn bản.
        </p>
      </div>
    )
  }

  // If no data has been extracted yet from API
  if (!currentData) {
    return (
      <div className="p-space-xl flex flex-col items-center justify-center min-h-[60vh] text-center gap-space-md">
        <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary shadow-sm">
          <span className="material-symbols-outlined text-[36px]">document_scanner</span>
        </div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          Chưa có dữ liệu quy tắc thuế
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md leading-relaxed">
          Hiện tại chưa có bộ quy tắc thuế nào được tải lên hoặc chọn để xem xét. Vui lòng tải lên văn bản thuế dạng PDF để hệ thống tiến hành thẩm định.
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

  // Dữ liệu thực tế từ state currentData
  const taxRuleSet = currentData.taxRuleSet || {}
  const rawTaxRules = currentData.taxRules || []
  const rawDependentRules = currentData.dependentRules || []
  const warning = currentData.warning || verification?.warningMessage || null
  const hasMismatch = verification && verification.isTaxYearMatched === false

  // Extract ruleSetId từ taxRuleSet hoặc fallback từ currentRuleSetId / dependentRules
  const ruleSetId =
    currentRuleSetId ||
    taxRuleSet.ruleSetId ||
    taxRuleSet.id ||
    rawDependentRules[0]?.ruleSetId ||
    currentData.ruleSetId ||
    currentData.id ||
    ''

  // Kiểm tra trạng thái đã phê duyệt dựa trên dữ liệu thực tế từ hệ thống:
  // 1. Từ state isApproved của thao tác phê duyệt hiện tại
  // 2. Từ taxRuleSet.status hoặc currentData.status ('Active' / 'ACTIVE') trả về từ CSDL
  const isSetApproved = Boolean(
    isApproved ||
    String(taxRuleSet.status).toUpperCase() === 'ACTIVE' ||
    String(currentData?.status).toUpperCase() === 'ACTIVE'
  )

  // Filter 4 rule groups from API
  const brackets = rawTaxRules.filter((r) => r.ruleType === 'BRACKET')
  const deductions = rawTaxRules.filter((r) => r.ruleType === 'DEDUCTION')
  const rateExemptions = rawTaxRules.filter(
    (r) => r.ruleType === 'RATE' || r.ruleType === 'EXEMPTION'
  )
  const dependents = rawDependentRules

  const totalRulesCount = rawTaxRules.length

  const validateEditTaxYearValue = (val) => {
    const str = String(val ?? '').trim()
    if (!str) {
      return 'Năm tính thuế bắt buộc nhập (từ 1900 đến 2100).'
    }
    const num = Number(str)
    if (isNaN(num) || !Number.isInteger(num)) {
      return 'Năm tính thuế phải là số nguyên hợp lệ.'
    }
    if (num < 1900 || num > 2100) {
      return 'Năm tính thuế phải nằm trong khoảng từ 1900 đến 2100.'
    }
    return null
  }

  const handleEditYearChange = (e) => {
    const val = e.target.value
    setEditForm((prev) => ({ ...prev, taxYear: val }))
    const err = validateEditTaxYearValue(val)
    if (editErrors.taxYear || (val && String(val).length >= 4)) {
      if (err) {
        setEditErrors((prev) => ({ ...prev, taxYear: err }))
      } else {
        setEditErrors((prev) => ({ ...prev, taxYear: null }))
      }
    } else if (!err) {
      if (editErrors.taxYear) setEditErrors((prev) => ({ ...prev, taxYear: null }))
    }
  }

  const handleEditYearBlur = () => {
    const err = validateEditTaxYearValue(editForm.taxYear)
    if (err) {
      setEditErrors((prev) => ({ ...prev, taxYear: err }))
    } else {
      setEditErrors((prev) => ({ ...prev, taxYear: null }))
    }
  }

  const handleOpenEditModal = () => {
    if (isSetApproved) {
      showToast('Thông báo', 'Bộ quy tắc thuế đã được phê duyệt chính thức, không thể thay đổi thông tin.', 'warning')
      return
    }
    setEditForm({
      name: taxRuleSet.name || '',
      taxYear: taxRuleSet.taxYear || '',
      effectiveFrom: taxRuleSet.effectiveFrom || '',
      effectiveTo: taxRuleSet.effectiveTo || '',
    })
    setEditErrors({})
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    const newErrors = {}
    const yearErr = validateEditTaxYearValue(editForm.taxYear)
    if (yearErr) {
      newErrors.taxYear = yearErr
    }
    const parsedYear = parseInt(editForm.taxYear, 10)
    if (!editForm.name || !editForm.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên bộ quy tắc thuế.'
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors)
      return
    }

    setIsSaving(true)
    setEditErrors({})
    try {
      const payload = {
        name: editForm.name.trim(),
        taxYear: parsedYear,
        effectiveFrom: editForm.effectiveFrom || null,
        effectiveTo: editForm.effectiveTo || null,
      }

      const res = await taxRuleService.updateRuleSet(ruleSetId, payload)
      const resData = res?.data || res || {}
      const newRuleSet = resData.taxRuleSet || {}

      // Luôn kiểm tra và đối soát lại năm tính thuế mới với năm của văn bản
      const docYear =
        currentData?.verification?.extractedTaxYear ||
        verification?.extractedTaxYear ||
        extractYearFromTextOrDate(
          payload.effectiveFrom || taxRuleSet.effectiveFrom,
          payload.name,
          rawTaxRules
        )

      let updatedVerification = null
      if (docYear) {
        const isMatched = parsedYear === docYear
        updatedVerification = {
          inputTaxYear: parsedYear,
          extractedTaxYear: docYear,
          isTaxYearMatched: isMatched,
          mismatchReason: isMatched
            ? null
            : `Năm áp dụng văn bản nhận diện được là ${docYear}, khác với năm tính thuế đăng ký ${parsedYear}.`,
          warningMessage: isMatched
            ? null
            : `Văn bản quy định áp dụng từ năm ${docYear}, không khớp với năm tính thuế đăng ký ${parsedYear}.`,
        }
      } else if (currentData.verification) {
        const isMatched = parsedYear === currentData.verification.extractedTaxYear
        updatedVerification = {
          ...currentData.verification,
          inputTaxYear: parsedYear,
          isTaxYearMatched: isMatched,
          mismatchReason: isMatched ? null : currentData.verification.mismatchReason,
          warningMessage: isMatched ? null : currentData.verification.warningMessage,
        }
      }

      const updatedAll = {
        ...currentData,
        ...resData,
        taxRuleSet: {
          ...taxRuleSet,
          ...newRuleSet,
          name: payload.name,
          taxYear: payload.taxYear,
          effectiveFrom: payload.effectiveFrom,
          effectiveTo: payload.effectiveTo,
        },
        verification: updatedVerification,
        warning: updatedVerification?.isTaxYearMatched
          ? null
          : (updatedVerification?.warningMessage || currentData.warning || null),
      }

      setCurrentData(updatedAll)
      onDataLoaded?.(updatedAll)
      setShowEditModal(false)
      showToast('Thành công', 'Đã cập nhật thông tin bộ quy tắc thuế!', 'success')
    } catch (err) {
      setEditErrors({
        server: err.message || 'Không thể lưu thay đổi. Vui lòng thử lại.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefreshDetail = async () => {
    if (!ruleSetId) return
    setIsRefreshing(true)
    try {
      const res = await taxRuleService.getRuleSetDetail(ruleSetId)
      const resData = res?.data || res || {}
      const actual = resData.taxRuleSet ? resData : (resData.data?.taxRuleSet ? resData.data : resData)
      if (actual.taxRuleSet || actual.taxRules) {
        const merged = {
          ...currentData,
          ...actual,
        }
        setCurrentData(merged)
        showToast('Đã làm mới', 'Đã đồng bộ thông tin mới nhất từ máy chủ.', 'success')
      }
    } catch (err) {
      if (
        err.status === 404 ||
        err.rawMessage?.includes('not found') ||
        err.message?.includes('không tồn tại')
      ) {
        setCurrentData(null)
        showToast(
          'Không tìm thấy dữ liệu',
          'Bộ quy tắc thuế này không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu.',
          'warning'
        )
        return
      }
      showToast('Không thể làm mới', err.message || 'Lỗi khi tải dữ liệu mới nhất.', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleOpenEditRule = (type, item, category) => {
    if (isSetApproved) {
      showToast('Thông báo', 'Bộ quy tắc thuế đã được phê duyệt chính thức, không thể chỉnh sửa quy tắc.', 'warning')
      return
    }

    if (type === 'TAX_RULE') {
      let condText = ''
      if (item.condition) {
        if (typeof item.condition === 'string') {
          condText = item.condition
        } else if (typeof item.condition === 'object') {
          condText = item.condition.description || JSON.stringify(item.condition)
        }
      }

      setEditingRule({
        isOpen: true,
        isNew: false,
        type: 'TAX_RULE',
        category: category || 'Quy tắc thuế',
        original: item,
        form: {
          ruleName: item.ruleName || '',
          ruleCode: item.ruleCode || '',
          ruleType: item.ruleType || 'BRACKET',
          value: item.value !== undefined && item.value !== null ? String(item.value) : '',
          unit: item.unit || '',
          conditionText: condText,
          article: item.article || '',
          clause: item.clause || '',
          point: item.point || '',
          legalDocument: item.legalDocument || '',
          effectiveFrom: item.effectiveFrom || '',
          effectiveTo: item.effectiveTo || '',
        },
        errors: {},
        isSaving: false,
      })
    } else {
      // DEPENDENT_RULE
      let condsText = ''
      if (item.conditions) {
        if (Array.isArray(item.conditions)) {
          condsText = item.conditions.join('\n')
        } else if (typeof item.conditions === 'string') {
          condsText = item.conditions
        }
      }

      const initialReqDocs = parseRequiredDocuments(
        item.requiredDocuments || item.required_documents,
        item.dependentType,
        rawTaxRules
      )

      setEditingRule({
        isOpen: true,
        isNew: false,
        type: 'DEPENDENT_RULE',
        category: category || 'Tiêu chí Người phụ thuộc',
        original: item,
        form: {
          name: item.name || '',
          dependentType: item.dependentType || 'CHILD',
          maxAge: item.maxAge !== undefined && item.maxAge !== null ? String(item.maxAge) : '',
          maxMonthlyIncome:
            item.maxMonthlyIncome !== undefined && item.maxMonthlyIncome !== null
              ? String(item.maxMonthlyIncome)
              : '',
          isStudying: Boolean(item.isStudying),
          isDisabled: Boolean(item.isDisabled),
          conditionsText: condsText,
          requiredDocuments: initialReqDocs,
        },
        errors: {},
        isSaving: false,
      })
    }
  }

  const handleOpenAddRule = (category, defaultRuleType = 'BRACKET') => {
    if (isSetApproved) {
      showToast('Thông báo', 'Bộ quy tắc thuế đã được phê duyệt chính thức, không thể thêm mới quy tắc.', 'warning')
      return
    }

    if (category === 'Tiêu chí Người phụ thuộc') {
      setEditingRule({
        isOpen: true,
        isNew: true,
        type: 'DEPENDENT_RULE',
        category,
        original: null,
        form: {
          name: '',
          dependentType: 'CHILD',
          maxAge: '',
          maxMonthlyIncome: '',
          isStudying: false,
          isDisabled: false,
          conditionsText: '',
          requiredDocuments: [],
        },
        errors: {},
        isSaving: false,
      })
    } else {
      let defaultUnit = '%'
      if (defaultRuleType === 'DEDUCTION') defaultUnit = 'VNĐ/tháng'
      else if (defaultRuleType === 'RATE' || defaultRuleType === 'EXEMPTION') defaultUnit = '%'

      setEditingRule({
        isOpen: true,
        isNew: true,
        type: 'TAX_RULE',
        category,
        original: null,
        form: {
          ruleName: '',
          ruleCode: '',
          ruleType: defaultRuleType,
          value: '',
          unit: defaultUnit,
          conditionText: '',
          article: '',
          clause: '',
          point: '',
          legalDocument: taxRuleSet.name || '',
          effectiveFrom: taxRuleSet.effectiveFrom || '',
          effectiveTo: taxRuleSet.effectiveTo || '',
        },
        errors: {},
        isSaving: false,
      })
    }
  }

  const handleSaveRuleEdit = async () => {
    if (!editingRule || !editingRule.isOpen) return
    const { type, original, form, isNew } = editingRule

    const newErrors = {}
    if (type === 'TAX_RULE') {
      if (!form.ruleName?.trim()) {
        newErrors.ruleName = 'Vui lòng nhập tên quy tắc.'
      }
      if (form.value !== '' && isNaN(Number(form.value))) {
        newErrors.value = 'Giá trị phải là một số hợp lệ.'
      }
    } else {
      if (!form.name?.trim()) {
        newErrors.name = 'Vui lòng nhập tên đối tượng người phụ thuộc.'
      }
      if (form.maxAge !== '' && isNaN(Number(form.maxAge))) {
        newErrors.maxAge = 'Độ tuổi tối đa phải là số.'
      }
      if (form.maxMonthlyIncome !== '' && isNaN(Number(form.maxMonthlyIncome))) {
        newErrors.maxMonthlyIncome = 'Thu nhập tối đa phải là số.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setEditingRule((prev) => ({ ...prev, errors: newErrors }))
      return
    }

    setEditingRule((prev) => ({ ...prev, isSaving: true, errors: {} }))

    try {
      let payload = {}
      if (type === 'TAX_RULE') {
        const ruleItemPayload = {
          ruleName: form.ruleName.trim(),
          ruleCode: form.ruleCode?.trim() || (isNew ? `${form.ruleType}_${Date.now().toString().slice(-6)}` : original?.ruleCode),
          ruleType: form.ruleType || original?.ruleType || 'BRACKET',
          value: form.value !== '' ? Number(form.value) : null,
          unit: form.unit?.trim() || null,
          condition: form.conditionText?.trim() || null,
          article: form.article?.trim() || null,
          clause: form.clause?.trim() || null,
          point: form.point?.trim() || null,
          legalDocument: form.legalDocument?.trim() || null,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
        }
        if (!isNew && original) {
          ruleItemPayload.ruleId = original.ruleId || original.id
        }
        payload = {
          taxRules: [ruleItemPayload],
        }
      } else {
        const condList = form.conditionsText
          ? form.conditionsText.split('\n').map((s) => s.trim()).filter(Boolean)
          : []
        const depItemPayload = {
          name: form.name.trim(),
          dependentType: form.dependentType,
          maxAge: form.maxAge !== '' ? parseInt(form.maxAge, 10) : null,
          maxMonthlyIncome: form.maxMonthlyIncome !== '' ? parseFloat(form.maxMonthlyIncome) : null,
          isStudying: Boolean(form.isStudying),
          isDisabled: Boolean(form.isDisabled),
          conditions: condList.length > 0 ? condList : null,
          requiredDocuments: form.requiredDocuments || [],
          required_documents: form.requiredDocuments || [],
        }
        if (!isNew && original) {
          depItemPayload.id = original.id || original.ruleId
        }
        payload = {
          dependentRules: [depItemPayload],
        }
      }

      const res = await taxRuleService.updateRuleSet(ruleSetId, payload)
      const resData = res?.data || res || {}

      // Cập nhật state in-memory currentData
      setCurrentData((prev) => {
        if (!prev) return prev
        let updatedTaxRules = prev.taxRules || []
        let updatedDepRules = prev.dependentRules || []

        if (resData.taxRules) {
          updatedTaxRules = resData.taxRules
        } else if (type === 'TAX_RULE') {
          if (isNew) {
            updatedTaxRules = [...updatedTaxRules, {
              ...payload.taxRules[0],
              ruleId: `new_${Date.now()}`,
            }]
          } else {
            updatedTaxRules = updatedTaxRules.map((r) => {
              const isMatch =
                (original.ruleId && r.ruleId === original.ruleId) ||
                (original.ruleCode && r.ruleCode === original.ruleCode)
              if (isMatch) {
                return {
                  ...r,
                  ruleName: form.ruleName.trim(),
                  value: form.value !== '' ? Number(form.value) : r.value,
                  unit: form.unit?.trim() || r.unit,
                  condition: form.conditionText?.trim() || r.condition,
                  article: form.article?.trim() || r.article,
                  clause: form.clause?.trim() || r.clause,
                  point: form.point?.trim() || r.point,
                  legalDocument: form.legalDocument?.trim() || r.legalDocument,
                  effectiveFrom: form.effectiveFrom || r.effectiveFrom,
                  effectiveTo: form.effectiveTo || r.effectiveTo,
                }
              }
              return r
            })
          }
        }

        if (resData.dependentRules) {
          updatedDepRules = resData.dependentRules
        } else if (type === 'DEPENDENT_RULE') {
          if (isNew) {
            updatedDepRules = [...updatedDepRules, {
              ...payload.dependentRules[0],
              id: `new_dep_${Date.now()}`,
            }]
          } else {
            const condList = form.conditionsText
              ? form.conditionsText.split('\n').map((s) => s.trim()).filter(Boolean)
              : []
            updatedDepRules = updatedDepRules.map((d) => {
              const isMatch = original.id && d.id === original.id
              if (isMatch) {
                return {
                  ...d,
                  name: form.name.trim(),
                  dependentType: form.dependentType,
                  maxAge: form.maxAge !== '' ? parseInt(form.maxAge, 10) : null,
                  maxMonthlyIncome: form.maxMonthlyIncome !== '' ? parseFloat(form.maxMonthlyIncome) : null,
                  isStudying: Boolean(form.isStudying),
                  isDisabled: Boolean(form.isDisabled),
                  conditions: condList.length > 0 ? condList : d.conditions,
                  requiredDocuments: form.requiredDocuments || d.requiredDocuments || d.required_documents || [],
                  required_documents: form.requiredDocuments || d.required_documents || d.requiredDocuments || [],
                }
              }
              return d
            })
          }
        }

        return {
          ...prev,
          ...resData,
          taxRules: updatedTaxRules,
          dependentRules: updatedDepRules,
        }
      })

      if (
        selectedDetail && !isNew &&
        ((selectedDetail.type === 'TAX_RULE' &&
          (selectedDetail.data.ruleId === original?.ruleId ||
            selectedDetail.data.ruleCode === original?.ruleCode)) ||
          (selectedDetail.type === 'DEPENDENT_RULE' && selectedDetail.data.id === original?.id))
      ) {
        setSelectedDetail(null)
      }

      setEditingRule(null)
      showToast(
        'Thành công',
        isNew ? 'Đã thêm quy tắc mới vào bộ quy tắc thuế!' : 'Đã cập nhật thông tin quy tắc thuế thành công!',
        'success'
      )
    } catch (err) {
      setEditingRule((prev) => ({
        ...prev,
        isSaving: false,
        errors: {
          server: err.message || 'Không thể lưu quy tắc. Vui lòng thử lại.',
        },
      }))
    }
  }

  const handleSwitchRuleSet = (targetId) => {
    if (!targetId || targetId === ruleSetId) return
    setSearchParams({ id: targetId })
  }

  const handleConfirmApprove = async () => {
    if (!ruleSetId) {
      showToast('Lỗi', 'Không tìm thấy thông tin bộ quy tắc thuế để thực hiện phê duyệt.', 'error')
      return
    }

    setIsApproving(true)
    try {
      const adminId = user?.userId || user?.id || null
      const response = await taxRuleService.approveRuleSet(ruleSetId, adminId)
      setIsApproved(true)
      setShowApproveModal(false)

      // Cập nhật trạng thái Active trực tiếp vào đối tượng currentData
      const updatedTaxRuleSet = {
        ...taxRuleSet,
        status: 'Active',
      }
      const updatedExtractedData = {
        ...currentData,
        status: 'Active',
        taxRuleSet: updatedTaxRuleSet,
      }
      setCurrentData(updatedExtractedData)

      // Cập nhật trạng thái trong danh mục bộ quy tắc đã nạp
      setAvailableRuleSets((prev) =>
        prev.map((s) =>
          s.ruleSetId === ruleSetId ? { ...s, status: 'Active' } : s
        )
      )

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

  const parseRequiredDocuments = (docs, dependentType = null, currentTaxRules = null) => {
    let raw = docs
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          raw = JSON.parse(trimmed)
        } catch {
          raw = [{ name: trimmed, docType: 'OTHER', isMandatory: true, description: '' }]
        }
      } else if (trimmed) {
        raw = [{ name: trimmed, docType: 'OTHER', isMandatory: true, description: '' }]
      }
    }

    // Fallback: nếu chưa có docs trực tiếp, lấy từ condition.eligibility của taxRule PIT_DEDUCTION_DEPENDENT
    if ((!raw || (Array.isArray(raw) && raw.length === 0)) && dependentType && Array.isArray(currentTaxRules)) {
      const depRule = currentTaxRules.find(
        (r) => r.ruleCode === 'PIT_DEDUCTION_DEPENDENT' || r.ruleType === 'DEDUCTION'
      )
      if (depRule && depRule.condition) {
        let condObj = depRule.condition
        if (typeof condObj === 'string') {
          try {
            condObj = JSON.parse(condObj)
          } catch {
            condObj = null
          }
        }
        if (condObj && Array.isArray(condObj.eligibility)) {
          const matched = condObj.eligibility.find(
            (e) => String(e.type || e.dependentType).toUpperCase() === String(dependentType).toUpperCase()
          )
          if (matched && (matched.requiredDocuments || matched.required_documents)) {
            raw = matched.requiredDocuments || matched.required_documents
          }
        }
      }
    }

    if (!Array.isArray(raw)) return []

    return raw.map((d) => {
      if (typeof d === 'string') {
        return { name: d, docType: 'OTHER', isMandatory: true, description: '' }
      }
      return {
        name: d.name || d.docType || 'Giấy tờ chứng minh',
        docType: d.docType || 'OTHER',
        isMandatory: d.isMandatory !== false,
        description: d.description || '',
      }
    })
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

            {/* Bộ chọn văn bản quy tắc thuế từ CSDL */}
            {availableRuleSets && availableRuleSets.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container border border-outline-variant/50 shadow-2xs">
                <span className="material-symbols-outlined text-[18px] text-primary">folder_managed</span>
                <span className="text-xs font-bold text-on-surface whitespace-nowrap">Bộ quy tắc:</span>
                <select
                  value={ruleSetId || ''}
                  onChange={(e) => handleSwitchRuleSet(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-primary outline-none cursor-pointer pr-1 max-w-[260px] truncate"
                  title="Chuyển đổi bộ quy tắc thuế"
                >
                  {availableRuleSets.map((s) => (
                    <option
                      key={s.ruleSetId}
                      value={s.ruleSetId}
                      className="text-on-surface bg-surface-container-lowest py-1"
                    >
                      {s.name || `Quy tắc năm ${s.taxYear}`} ({s.taxYear}) — {String(s.status).toUpperCase() === 'ACTIVE' ? 'Đang áp dụng' : 'Bản nháp'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Dữ liệu quy tắc thuế được trích xuất từ văn bản pháp quy, sẵn sàng thẩm định và kích hoạt áp dụng.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-space-sm self-start md:self-auto flex-wrap">
          <button
            onClick={onBackToUpload}
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm transition-all text-label-md font-label-md font-semibold cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span>Tải văn bản khác</span>
          </button>

          <button
            onClick={() => {
              const yr = taxRuleSet?.taxYear || currentData?.taxYear || ''
              navigate(yr ? `/admin/lich-su-phe-duyet?year=${yr}` : '/admin/lich-su-phe-duyet')
            }}
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm transition-all text-label-md font-label-md font-semibold cursor-pointer border border-outline-variant/30"
            title="Tra cứu lịch sử phê duyệt văn bản theo năm"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">history_edu</span>
            <span>Lịch sử phê duyệt</span>
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

      {/* Year Verification & Warning Alert Banner */}
      {(hasMismatch || warning) && (
        <div className="w-full p-space-md rounded-xl bg-amber-500/10 border border-amber-500/35 text-on-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <span className="material-symbols-outlined text-[24px]">rule_folder</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-title-sm text-title-sm font-bold text-amber-900">
                  Cảnh báo đối soát năm áp dụng văn bản quy phạm
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-500/20 text-amber-800">
                  {hasMismatch ? 'Lệch năm tính thuế' : 'Lưu ý từ văn bản'}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface font-medium leading-relaxed">
                {hasMismatch ? (
                  <>
                    Năm tính thuế đăng ký (
                    <strong className="text-amber-900 font-bold">
                      {verification?.inputTaxYear || taxRuleSet.taxYear}
                    </strong>
                    ) không khớp với năm ban hành/hiệu lực nhận diện được trong văn bản (
                    <strong className="text-amber-900 font-bold">
                      {verification?.extractedTaxYear || 'Khác biệt'}
                    </strong>
                    ). {verification?.mismatchReason || warning}
                  </>
                ) : (
                  warning
                )}
              </p>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-0.5 flex-wrap">
                <span>Năm đăng ký: <strong>{verification?.inputTaxYear || taxRuleSet.taxYear || '—'}</strong></span>
                <span>•</span>
                <span>Năm bóc tách từ văn bản: <strong>{verification?.extractedTaxYear || '—'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-space-md py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-title-sm text-title-sm font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
              <span>Điều chỉnh năm &amp; thông tin</span>
            </button>
          </div>
        </div>
      )}

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
            {verification && (
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded text-label-sm font-semibold ${
                  verification.isTaxYearMatched
                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {verification.isTaxYearMatched ? 'verified' : 'warning'}
                </span>
                <span>
                  {verification.isTaxYearMatched
                    ? `Khớp năm văn bản (${verification.extractedTaxYear})`
                    : `Lệch năm văn bản (${verification.extractedTaxYear || '—'})`}
                </span>
              </span>
            )}
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

            {/* Nút Chỉnh sửa thông tin chuyển xuống Căn cứ pháp quy hành chính */}
            {!isSetApproved ? (
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-label-sm text-label-sm font-bold transition-all border border-outline-variant/40 shadow-xs cursor-pointer"
                title="Chỉnh sửa tên văn bản, năm tính thuế hoặc thời hạn áp dụng"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Chỉnh sửa thông tin</span>
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container/60 text-on-surface-variant font-label-sm text-label-sm font-medium border border-outline-variant/30 select-none cursor-not-allowed"
                title="Bộ quy tắc đã được phê duyệt chính thức — Đã khóa chỉnh sửa"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
                <span>Đã khóa chỉnh sửa</span>
              </span>
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
        <div className="flex flex-col w-full gap-space-md">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-space-md px-1">
            <div>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                Biểu thuế lũy tiến từng phần ({brackets.length} bậc thuế)
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Các bậc thuế lũy tiến áp dụng đối với thu nhập tính thuế từ tiền lương, tiền công.
              </p>
            </div>
            {!isSetApproved ? (
              <button
                type="button"
                onClick={() => handleOpenAddRule('Biểu thuế lũy tiến', 'BRACKET')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-sm text-label-sm font-semibold cursor-pointer transition-colors shadow-xs"
                title="Thêm một bậc thuế mới vào biểu thuế lũy tiến"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Thêm bậc thuế mới</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-secondary italic">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Đã khóa thao tác (đã duyệt)
              </span>
            )}
          </div>

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
                    <th className="py-space-md px-space-md font-bold text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {brackets
                    .filter(
                      (b) =>
                        !debouncedSearchQuery ||
                        (b.ruleName || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        (b.ruleCode || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Biểu thuế lũy tiến' })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                              title="Xem chi tiết bậc thuế"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                              <span>Chi tiết</span>
                            </button>
                            {!isSetApproved && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditRule('TAX_RULE', item, 'Biểu thuế lũy tiến')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all text-xs font-semibold cursor-pointer border border-primary/30 shadow-2xs"
                                title="Chỉnh sửa bậc thuế này"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                <span>Sửa</span>
                              </button>
                            )}
                          </div>
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
        <div className="flex flex-col w-full gap-space-md">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-space-md px-1">
            <div>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                Mức giảm trừ gia cảnh ({deductions.length} quy định)
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Quy định mức giảm trừ cho bản thân người nộp thuế và người phụ thuộc.
              </p>
            </div>
            {!isSetApproved ? (
              <button
                type="button"
                onClick={() => handleOpenAddRule('Giảm trừ gia cảnh', 'DEDUCTION')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-sm text-label-sm font-semibold cursor-pointer transition-colors shadow-xs"
                title="Thêm mức giảm trừ gia cảnh mới"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Thêm mức giảm trừ mới</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-secondary italic">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Đã khóa thao tác (đã duyệt)
              </span>
            )}
          </div>

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
                    <th className="py-space-md px-space-md font-bold text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {deductions
                    .filter(
                      (d) =>
                        !debouncedSearchQuery ||
                        (d.ruleName || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        (d.ruleCode || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Giảm trừ gia cảnh' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                            title="Xem chi tiết mức giảm trừ"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Chi tiết</span>
                          </button>
                          {!isSetApproved && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule('TAX_RULE', item, 'Giảm trừ gia cảnh')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all text-xs font-semibold cursor-pointer border border-primary/30 shadow-2xs"
                              title="Chỉnh sửa mức giảm trừ này"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              <span>Sửa</span>
                            </button>
                          )}
                        </div>
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
        <div className="flex flex-col w-full gap-space-md">
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
              {!isSetApproved ? (
                <button
                  type="button"
                  onClick={() => handleOpenAddRule('Tiêu chí Người phụ thuộc', 'DEPENDENT_RULE')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-sm text-label-sm font-semibold cursor-pointer transition-colors shadow-xs shrink-0"
                  title="Thêm tiêu chuẩn người phụ thuộc mới"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Thêm tiêu chí người phụ thuộc</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-secondary italic shrink-0">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Đã khóa thao tác (đã duyệt)
                </span>
              )}
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

                  {/* Danh sách giấy tờ cần chứng minh (required_documents) */}
                  {(() => {
                    const reqDocs = parseRequiredDocuments(
                      dep.requiredDocuments || dep.required_documents,
                      dep.dependentType,
                      rawTaxRules
                    )
                    if (reqDocs.length === 0) return null
                    return (
                      <div className="flex flex-col gap-1.5 pt-space-xs border-t border-surface-container-high/60">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
                          <span className="flex items-center gap-1 text-primary">
                            <span className="material-symbols-outlined text-[15px]">description</span>
                            <span>Giấy tờ cần nộp ({reqDocs.length}):</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {reqDocs.map((doc, dIdx) => (
                            <span
                              key={dIdx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                doc.isMandatory
                                  ? 'bg-primary/5 text-primary border-primary/25'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                              }`}
                              title={doc.description || doc.name}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {doc.isMandatory ? 'check_circle' : 'help_outline'}
                              </span>
                              <span className="truncate max-w-[140px]">{doc.name}</span>
                              {doc.isMandatory ? (
                                <span className="text-[9px] font-bold uppercase text-primary/90 bg-primary/10 px-1 py-0.2 rounded">
                                  Bắt buộc
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium text-on-surface-variant bg-surface-container-high px-1 py-0.2 rounded">
                                  Tùy chọn
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/60">
                    <span className="text-[11px] text-on-surface-variant font-medium">Hồ sơ &amp; Tiêu chuẩn</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDetail({ type: 'DEPENDENT_RULE', data: dep, category: 'Tiêu chí Người phụ thuộc' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary/10 text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Chi tiết</span>
                      </button>
                      {!isSetApproved && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditRule('DEPENDENT_RULE', dep, 'Tiêu chí Người phụ thuộc')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all text-xs font-semibold cursor-pointer border border-primary/30 shadow-2xs"
                          title="Chỉnh sửa tiêu chí người phụ thuộc"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>Sửa</span>
                        </button>
                      )}
                    </div>
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
        <div className="flex flex-col w-full gap-space-md">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-space-md px-1">
            <div>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                Thuế suất khác &amp; Miễn thuế ({rateExemptions.length} quy tắc)
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Các mức thuế suất toàn phần và các trường hợp được miễn, giảm trừ đặc thù.
              </p>
            </div>
            {!isSetApproved ? (
              <button
                type="button"
                onClick={() => handleOpenAddRule('Thuế suất khác & Miễn thuế', 'RATE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-sm text-label-sm font-semibold cursor-pointer transition-colors shadow-xs"
                title="Thêm quy tắc thuế suất hoặc miễn thuế mới"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Thêm quy tắc mới</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-secondary italic">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Đã khóa thao tác (đã duyệt)
              </span>
            )}
          </div>

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
                    <th className="py-space-md px-space-md font-bold text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60 font-body-md text-body-md text-on-surface">
                  {rateExemptions
                    .filter(
                      (r) =>
                        !debouncedSearchQuery ||
                        (r.ruleName || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        (r.ruleCode || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetail({ type: 'TAX_RULE', data: item, category: 'Thuế suất khác & Miễn thuế' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer border border-outline-variant/30 hover:border-primary/40 shadow-2xs"
                            title="Xem chi tiết quy tắc"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Chi tiết</span>
                          </button>
                          {!isSetApproved && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule('TAX_RULE', item, 'Thuế suất khác & Miễn thuế')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all text-xs font-semibold cursor-pointer border border-primary/30 shadow-2xs"
                              title="Chỉnh sửa quy tắc thuế này"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              <span>Sửa</span>
                            </button>
                          )}
                        </div>
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

      {/* Individual Rule Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl p-space-xl flex flex-col gap-space-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-space-md border-b border-outline-variant/30 pb-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">edit_note</span>
                </div>
                <div className="flex flex-col">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-secondary-container/40 text-secondary uppercase tracking-wider w-fit">
                    {editingRule.category}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
                    {editingRule.isNew
                      ? (editingRule.type === 'TAX_RULE' ? 'Thêm quy tắc thuế mới' : 'Thêm tiêu chí người phụ thuộc mới')
                      : (editingRule.type === 'TAX_RULE' ? 'Chỉnh sửa quy tắc thuế' : 'Chỉnh sửa tiêu chí người phụ thuộc')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Server Error Alert */}
            {editingRule.errors?.server && (
              <div className="p-space-sm px-space-md rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{editingRule.errors.server}</span>
              </div>
            )}

            {/* Content for TAX_RULE */}
            {editingRule.type === 'TAX_RULE' ? (
              <div className="flex flex-col gap-space-md">
                {/* Rule Name & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Tên quy tắc thuế <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRule.form.ruleName}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, ruleName: e.target.value },
                          errors: { ...prev.errors, ruleName: null },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                      placeholder="Nhập tên quy tắc..."
                    />
                    {editingRule.errors?.ruleName && (
                      <span className="text-xs text-error">{editingRule.errors.ruleName}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Mã quy tắc (Mã số)
                    </label>
                    <input
                      type="text"
                      disabled={!editingRule.isNew}
                      value={editingRule.form.ruleCode}
                      onChange={(e) =>
                        editingRule.isNew &&
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, ruleCode: e.target.value },
                        }))
                      }
                      className={`w-full h-11 px-3 rounded-lg text-body-md border border-outline-variant/30 font-mono text-xs ${
                        !editingRule.isNew
                          ? 'bg-surface-container-high/60 text-on-surface-variant cursor-not-allowed opacity-80'
                          : 'bg-surface-container-low text-on-surface focus:bg-surface-container-lowest focus:outline-none'
                      }`}
                      placeholder={editingRule.isNew ? 'Hệ thống tự tạo nếu để trống' : 'Mã hệ thống'}
                      title={!editingRule.isNew ? 'Mã hệ thống không chỉnh sửa' : 'Nhập mã quy tắc tùy chọn'}
                    />
                  </div>
                </div>

                {/* Optional ruleType selector when adding new rule */}
                {editingRule.isNew && (
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Phân loại quy tắc
                    </label>
                    <select
                      value={editingRule.form.ruleType}
                      onChange={(e) => {
                        const newType = e.target.value
                        let defUnit = '%'
                        if (newType === 'DEDUCTION') defUnit = 'VNĐ/tháng'
                        else if (newType === 'RATE' || newType === 'EXEMPTION' || newType === 'BRACKET') defUnit = '%'
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, ruleType: newType, unit: defUnit },
                        }))
                      }}
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30 cursor-pointer"
                    >
                      <option value="BRACKET">Biểu thuế lũy tiến từng phần (BRACKET)</option>
                      <option value="DEDUCTION">Giảm trừ gia cảnh (DEDUCTION)</option>
                      <option value="RATE">Thuế suất toàn phần (RATE)</option>
                      <option value="EXEMPTION">Miễn thuế / Giảm thuế đặc thù (EXEMPTION)</option>
                    </select>
                  </div>
                )}

                {/* Value & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      {(editingRule.original?.ruleType || editingRule.form.ruleType) === 'BRACKET' ||
                      (editingRule.original?.ruleType || editingRule.form.ruleType) === 'RATE'
                        ? 'Thuế suất (%)'
                        : 'Mức áp dụng / Giá trị (VNĐ)'}
                    </label>
                    <input
                      type="text"
                      value={editingRule.form.value}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, value: e.target.value },
                          errors: { ...prev.errors, value: null },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30 font-semibold"
                      placeholder="VD: 5 hoặc 11000000"
                    />
                    {editingRule.errors?.value && (
                      <span className="text-xs text-error">{editingRule.errors.value}</span>
                    )}
                    {/* Currency Preview if >= 1000 */}
                    {editingRule.form.value &&
                      !isNaN(Number(editingRule.form.value)) &&
                      Number(editingRule.form.value) >= 1000 && (
                        <span className="text-xs text-primary font-medium">
                          Hiển thị: {Number(editingRule.form.value).toLocaleString('vi-VN')} VNĐ
                        </span>
                      )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Đơn vị tính
                    </label>
                    <input
                      type="text"
                      list="taxRuleUnits"
                      value={editingRule.form.unit}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, unit: e.target.value },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                      placeholder="VD: % hoặc VNĐ/tháng"
                    />
                    <datalist id="taxRuleUnits">
                      <option value="%" />
                      <option value="VNĐ/tháng" />
                      <option value="VNĐ/người/tháng" />
                      <option value="VNĐ/năm" />
                      <option value="VNĐ" />
                    </datalist>
                  </div>
                </div>

                {/* Condition Text */}
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-semibold text-on-surface">
                    Diễn giải điều kiện áp dụng
                  </label>
                  <textarea
                    rows={2}
                    value={editingRule.form.conditionText}
                    onChange={(e) =>
                      setEditingRule((prev) => ({
                        ...prev,
                        form: { ...prev.form, conditionText: e.target.value },
                      }))
                    }
                    className="w-full p-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                    placeholder="VD: Thu nhập tính thuế đến 120 triệu đồng/năm (đến 10 triệu đồng/tháng)..."
                  />
                </div>

                {/* Legal Reference: Article, Clause, Point */}
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-semibold text-on-surface">
                    Căn cứ pháp lý trong văn bản
                  </label>
                  <div className="grid grid-cols-3 gap-space-sm">
                    <div>
                      <input
                        type="text"
                        value={editingRule.form.article}
                        onChange={(e) =>
                          setEditingRule((prev) => ({
                            ...prev,
                            form: { ...prev.form, article: e.target.value },
                          }))
                        }
                        placeholder="Điều (VD: 9)"
                        className="w-full h-10 px-3 rounded-lg text-on-surface text-body-sm bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingRule.form.clause}
                        onChange={(e) =>
                          setEditingRule((prev) => ({
                            ...prev,
                            form: { ...prev.form, clause: e.target.value },
                          }))
                        }
                        placeholder="Khoản (VD: 2)"
                        className="w-full h-10 px-3 rounded-lg text-on-surface text-body-sm bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingRule.form.point}
                        onChange={(e) =>
                          setEditingRule((prev) => ({
                            ...prev,
                            form: { ...prev.form, point: e.target.value },
                          }))
                        }
                        placeholder="Điểm (VD: Bậc 1 hoặc a)"
                        className="w-full h-10 px-3 rounded-lg text-on-surface text-body-sm bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Effective Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-medium text-on-surface-variant">
                      Ngày bắt đầu hiệu lực quy tắc
                    </label>
                    <input
                      type="date"
                      value={editingRule.form.effectiveFrom || ''}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, effectiveFrom: e.target.value },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg text-on-surface text-body-sm bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-medium text-on-surface-variant">
                      Ngày kết thúc hiệu lực quy tắc
                    </label>
                    <input
                      type="date"
                      value={editingRule.form.effectiveTo || ''}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, effectiveTo: e.target.value },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg text-on-surface text-body-sm bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Content for DEPENDENT_RULE */
              <div className="flex flex-col gap-space-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Tên tiêu chí người phụ thuộc <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRule.form.name}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, name: e.target.value },
                          errors: { ...prev.errors, name: null },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                      placeholder="VD: Con dưới 18 tuổi"
                    />
                    {editingRule.errors?.name && (
                      <span className="text-xs text-error">{editingRule.errors.name}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Nhóm đối tượng
                    </label>
                    <select
                      value={editingRule.form.dependentType}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, dependentType: e.target.value },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30 cursor-pointer"
                    >
                      <option value="CHILD">Con dưới 18 tuổi</option>
                      <option value="ADULT_CHILD">Con từ 18 tuổi trở lên đang đi học</option>
                      <option value="SPOUSE">Vợ / Chồng</option>
                      <option value="PARENT">Cha mẹ</option>
                      <option value="OTHER">Người phụ thuộc khác</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Độ tuổi tối đa (tuổi)
                    </label>
                    <input
                      type="number"
                      value={editingRule.form.maxAge}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, maxAge: e.target.value },
                          errors: { ...prev.errors, maxAge: null },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                      placeholder="VD: 18 (để trống nếu không giới hạn)"
                    />
                    {editingRule.errors?.maxAge && (
                      <span className="text-xs text-error">{editingRule.errors.maxAge}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Thu nhập tối đa / tháng (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={editingRule.form.maxMonthlyIncome}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, maxMonthlyIncome: e.target.value },
                          errors: { ...prev.errors, maxMonthlyIncome: null },
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30"
                      placeholder="VD: 1000000 (để trống nếu không quy định)"
                    />
                    {editingRule.errors?.maxMonthlyIncome && (
                      <span className="text-xs text-error">{editingRule.errors.maxMonthlyIncome}</span>
                    )}
                  </div>
                </div>

                {/* Study & Disability Checkboxes */}
                <div className="flex flex-col sm:flex-row gap-4 p-space-md rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
                  <label className="flex items-center gap-2 text-body-sm font-medium text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingRule.form.isStudying}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, isStudying: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Yêu cầu đang theo học tại cơ sở giáo dục</span>
                  </label>

                  <label className="flex items-center gap-2 text-body-sm font-medium text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingRule.form.isDisabled}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: { ...prev.form, isDisabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Khuyết tật / Mất khả năng lao động</span>
                  </label>
                </div>

                {/* Conditions / Documentation */}
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-semibold text-on-surface">
                    Điều kiện chứng minh &amp; Hồ sơ bắt buộc (Mỗi điều kiện một dòng)
                  </label>
                  <textarea
                    rows={3}
                    value={editingRule.form.conditionsText}
                    onChange={(e) =>
                      setEditingRule((prev) => ({
                        ...prev,
                        form: { ...prev.form, conditionsText: e.target.value },
                      }))
                    }
                    className="w-full p-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner border border-outline-variant/30 font-sans"
                    placeholder="Bản sao Giấy khai sinh hoặc Thẻ CCCD&#10;Giấy xác nhận sinh viên đối với con trên 18 tuổi..."
                  />
                </div>

                {/* Danh mục giấy tờ cần chứng minh (required_documents) */}
                <div className="flex flex-col gap-2 p-space-md rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <label className="text-label-md font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">folder_shared</span>
                      <span>Danh mục Giấy tờ cần nộp để chứng minh ({editingRule.form.requiredDocuments?.length || 0})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingRule((prev) => ({
                          ...prev,
                          form: {
                            ...prev.form,
                            requiredDocuments: [
                              ...(prev.form.requiredDocuments || []),
                              {
                                name: '',
                                docType: 'OTHER',
                                isMandatory: true,
                                description: '',
                              },
                            ],
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all text-xs font-semibold cursor-pointer border border-primary/30"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Thêm giấy tờ</span>
                    </button>
                  </div>

                  {(!editingRule.form.requiredDocuments || editingRule.form.requiredDocuments.length === 0) && (
                    <p className="text-xs text-on-surface-variant italic py-1">
                      Chưa có loại giấy tờ nào được cấu hình cho tiêu chí này. Nhấn "Thêm giấy tờ" để bổ sung các loại hồ sơ chứng minh.
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    {(editingRule.form.requiredDocuments || []).map((docItem, dIndex) => (
                      <div
                        key={dIndex}
                        className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2 shadow-2xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-6 flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-on-surface-variant">Tên giấy tờ</span>
                            <input
                              type="text"
                              value={docItem.name}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditingRule((prev) => {
                                  const updated = [...(prev.form.requiredDocuments || [])]
                                  updated[dIndex] = { ...updated[dIndex], name: val }
                                  return { ...prev, form: { ...prev.form, requiredDocuments: updated } }
                                })
                              }}
                              className="w-full h-8 px-2.5 rounded text-xs bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                              placeholder="VD: Giấy khai sinh, CCCD..."
                            />
                          </div>

                          <div className="sm:col-span-4 flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-on-surface-variant">Mã chứng từ (docType)</span>
                            <select
                              value={docItem.docType}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditingRule((prev) => {
                                  const updated = [...(prev.form.requiredDocuments || [])]
                                  updated[dIndex] = { ...updated[dIndex], docType: val }
                                  return { ...prev, form: { ...prev.form, requiredDocuments: updated } }
                                })
                              }}
                              className="w-full h-8 px-2 rounded text-xs bg-surface-container-low border border-outline-variant/30 focus:outline-none cursor-pointer"
                            >
                              <option value="BIRTH_CERTIFICATE">BIRTH_CERTIFICATE (Giấy khai sinh)</option>
                              <option value="CITIZEN_ID">CITIZEN_ID (CCCD/CMND)</option>
                              <option value="STUDENT_CARD">STUDENT_CARD (Thẻ SV/Giấy trường)</option>
                              <option value="DISABILITY_CERTIFICATE">DISABILITY_CERTIFICATE (Khuyết tật/Y tế)</option>
                              <option value="MARRIAGE_CERTIFICATE">MARRIAGE_CERTIFICATE (Kết hôn)</option>
                              <option value="RELATIONSHIP_CERTIFICATE">RELATIONSHIP_CERTIFICATE (Quan hệ)</option>
                              <option value="SUPPORT_COMMITMENT_FORM">SUPPORT_COMMITMENT_FORM (Cam kết)</option>
                              <option value="RESIDENCE_CT07">RESIDENCE_CT07 (Cư trú CT07)</option>
                              <option value="INCOME_DECLARATION">INCOME_DECLARATION (Tờ khai thu nhập)</option>
                              <option value="OTHER">OTHER (Giấy tờ khác)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-4">
                            <label className="flex items-center gap-1 text-[11px] font-semibold text-on-surface cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={docItem.isMandatory}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  setEditingRule((prev) => {
                                    const updated = [...(prev.form.requiredDocuments || [])]
                                    updated[dIndex] = { ...updated[dIndex], isMandatory: checked }
                                    return { ...prev, form: { ...prev.form, requiredDocuments: updated } }
                                  })
                                }}
                                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                              />
                              <span>Bắt buộc</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRule((prev) => {
                                  const updated = (prev.form.requiredDocuments || []).filter((_, idx) => idx !== dIndex)
                                  return { ...prev, form: { ...prev.form, requiredDocuments: updated } }
                                })
                              }}
                              className="text-error hover:bg-error/10 p-1 rounded transition-colors cursor-pointer"
                              title="Xóa loại giấy tờ này"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-on-surface-variant">Mô tả / Hướng dẫn hồ sơ</span>
                          <input
                            type="text"
                            value={docItem.description || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setEditingRule((prev) => {
                                const updated = [...(prev.form.requiredDocuments || [])]
                                updated[dIndex] = { ...updated[dIndex], description: val }
                                return { ...prev, form: { ...prev.form, requiredDocuments: updated } }
                              })
                            }}
                            className="w-full h-8 px-2.5 rounded text-xs bg-surface-container-low border border-outline-variant/30 focus:outline-none"
                            placeholder="VD: Bản sao công chứng, nộp kèm bản chính đối chiếu..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-title-sm text-title-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={editingRule.isSaving}
                onClick={handleSaveRuleEdit}
                className="flex items-center gap-space-xs px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-sm text-title-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-80"
              >
                {editingRule.isSaving ? (
                  <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">
                    {editingRule.isNew ? 'add_circle' : 'save'}
                  </span>
                )}
                <span>
                  {editingRule.isSaving
                    ? 'Đang lưu...'
                    : editingRule.isNew
                    ? 'Thêm quy tắc'
                    : 'Lưu quy tắc'}
                </span>
              </button>
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

                {/* Danh mục giấy tờ cần nộp để chứng minh (requiredDocuments) */}
                <div className="p-space-md rounded-xl bg-surface-container-low/60 flex flex-col gap-2.5 border border-outline-variant/20">
                  <div className="flex items-center justify-between text-secondary font-bold text-title-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                      <span>Danh mục Giấy tờ cần nộp để chứng minh</span>
                    </div>
                    {(() => {
                      const docs = parseRequiredDocuments(
                        selectedDetail.data.requiredDocuments || selectedDetail.data.required_documents,
                        selectedDetail.data.dependentType,
                        rawTaxRules
                      )
                      return (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          {docs.length} loại giấy tờ
                        </span>
                      )
                    })()}
                  </div>

                  {(() => {
                    const docs = parseRequiredDocuments(
                      selectedDetail.data.requiredDocuments || selectedDetail.data.required_documents,
                      selectedDetail.data.dependentType,
                      rawTaxRules
                    )
                    if (docs.length === 0) {
                      return (
                        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-body-sm text-on-surface-variant italic">
                          Chưa có quy định chi tiết về hồ sơ giấy tờ cần nộp cho nhóm này.
                        </div>
                      )
                    }
                    return (
                      <div className="flex flex-col gap-2">
                        {docs.map((doc, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1.5 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                                  {doc.isMandatory ? 'assignment' : 'pending_actions'}
                                </span>
                                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                                  {doc.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-on-surface-variant">
                                  {doc.docType}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    doc.isMandatory
                                      ? 'bg-primary/10 text-primary border border-primary/20'
                                      : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                                  }`}
                                >
                                  {doc.isMandatory ? 'Bắt buộc nộp' : 'Tùy chọn'}
                                </span>
                              </div>
                            </div>
                            {doc.description && (
                              <p className="text-body-sm text-on-surface-variant text-xs leading-relaxed pl-6.5">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  const detail = selectedDetail
                  setSelectedDetail(null)
                  handleOpenEditRule(detail.type, detail.data, detail.category)
                }}
                className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-title-sm text-title-sm font-semibold transition-all cursor-pointer border border-primary/30 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Chỉnh sửa quy tắc này</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-space-xl py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-title-sm text-title-sm font-semibold transition-all cursor-pointer shadow-sm"
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

      {/* Edit Rule Set Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl p-space-xl flex flex-col gap-space-md">
            <div className="flex items-start justify-between gap-space-md border-b border-outline-variant/30 pb-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">edit_note</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                    Chỉnh sửa thông tin Bộ quy tắc
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Điều chỉnh tên văn bản, năm tính thuế và thời hạn áp dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Error banner if server error occurs */}
            {editErrors.server && (
              <div className="p-3 rounded-lg bg-error-container/20 border border-error/40 text-error text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{editErrors.server}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="flex flex-col gap-space-md">
              {/* Rule Set Name */}
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-semibold text-on-surface" htmlFor="editNameInput">
                  Tên bộ quy tắc thuế <span className="text-error">*</span>
                </label>
                <input
                  id="editNameInput"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: null }))
                  }}
                  placeholder="Ví dụ: Luật Thuế Thu Nhập Cá Nhân 2026"
                  className={`w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner ${
                    editErrors.name ? 'border border-error' : 'border border-transparent'
                  }`}
                />
                {editErrors.name && (
                  <span className="text-xs text-error flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    {editErrors.name}
                  </span>
                )}
              </div>

              {/* Tax Year */}
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-semibold text-on-surface" htmlFor="editYearInput">
                  Năm tính thuế áp dụng <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    id="editYearInput"
                    type="number"
                    min="1900"
                    max="2100"
                    value={editForm.taxYear}
                    onChange={handleEditYearChange}
                    onBlur={handleEditYearBlur}
                    placeholder="2026"
                    className={`w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner ${
                      editErrors.taxYear ? 'border border-error' : 'border border-transparent'
                    }`}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-[20px]">
                    calendar_today
                  </span>
                </div>
                {editErrors.taxYear && (
                  <span className="text-xs text-error flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    {editErrors.taxYear}
                  </span>
                )}

                {/* Quick suggestion if year differs from verification.extractedTaxYear */}
                {verification?.extractedTaxYear &&
                  Number(editForm.taxYear) !== verification.extractedTaxYear && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-on-surface-variant">Gợi ý từ văn bản:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, taxYear: verification.extractedTaxYear }))
                          if (editErrors.taxYear) setEditErrors((prev) => ({ ...prev, taxYear: null }))
                        }}
                        className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all cursor-pointer shadow-2xs"
                      >
                        Năm {verification.extractedTaxYear}
                      </button>
                    </div>
                  )}
              </div>

              {/* Effective Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-semibold text-on-surface" htmlFor="editEffectiveFrom">
                    Ngày bắt đầu hiệu lực
                  </label>
                  <input
                    id="editEffectiveFrom"
                    type="date"
                    value={editForm.effectiveFrom || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-semibold text-on-surface" htmlFor="editEffectiveTo">
                    Ngày kết thúc hiệu lực
                  </label>
                  <input
                    id="editEffectiveTo"
                    type="date"
                    value={editForm.effectiveTo || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg text-on-surface text-body-md bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-title-sm text-title-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEdit}
                className="flex items-center gap-space-xs px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-sm text-title-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-80"
              >
                {isSaving ? (
                  <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
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
