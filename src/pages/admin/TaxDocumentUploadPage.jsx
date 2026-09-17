import { useState, useRef, useEffect, useMemo } from 'react'
import { taxAdminService } from '@/services/taxAdminService'
import { taxRuleService } from '@/services/taxRuleService'
import { signalrService } from '@/services/signalrService'
import { urlRuleService } from '@/services/urlRuleService'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'

export function TaxDocumentUploadPage({ onUploadSuccess, onCancel }) {
  const { user } = useAuth()
  const [taxYear, setTaxYear] = useState(() => new Date().getFullYear())
  const [name, setName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const debouncedSourceUrl = useDebounce(sourceUrl, 350)
  const [selectedFile, setSelectedFile] = useState(null)

  // Danh mục quy tắc kiểm tra URL (tải từ API GET /api/url-rules)
  const [urlRules, setUrlRules] = useState([])
  const [isLoadingRules, setIsLoadingRules] = useState(false)

  // Danh sách văn bản đã tải lên trong phiên làm việc hiện tại (In-Memory State, không dùng bộ nhớ tạm)
  const [recentDocs, setRecentDocs] = useState([])
  // Danh sách văn bản đã lưu trữ trên cơ sở dữ liệu hệ thống
  const [savedRuleSets, setSavedRuleSets] = useState([])
  const [isLoadingSavedDocs, setIsLoadingSavedDocs] = useState(false)

  // Validation states
  const [errors, setErrors] = useState({})
  const [validationAlert, setValidationAlert] = useState(null)

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Modals & loading states
  const [isProcessing, setIsProcessing] = useState(false)
  const [processStage, setProcessStage] = useState(1)
  const [processProgress, setProcessProgress] = useState(25)
  const [processTitle, setProcessTitle] = useState('Đang tải văn bản lên hệ thống...')
  const [processSubtitle, setProcessSubtitle] = useState(
    'Hệ thống đang chuẩn bị tệp và khởi tạo tác vụ bóc tách...'
  )
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toast, setToast] = useState(null)

  // Khởi động kết nối SignalR Hub khi mount và dọn dẹp listeners khi unmount
  useEffect(() => {
    signalrService.startConnection().catch(() => {
      // Tự động kết nối lại khi người dùng bắt đầu tải tài liệu
    })

    loadUrlRules()
    loadSavedRuleSets()

    return () => {
      signalrService.off('OnTaxExtractionCompleted')
      signalrService.off('OnTaxExtractionFailed')
    }
  }, [])

  const loadUrlRules = async () => {
    try {
      setIsLoadingRules(true)
      const res = await urlRuleService.getRules(false)
      const data = res?.data || res || []
      setUrlRules(Array.isArray(data) ? data : (data.data || []))
    } catch (err) {
      console.error('Lỗi khi tải danh sách tên miền:', err)
    } finally {
      setIsLoadingRules(false)
    }
  }

  const loadSavedRuleSets = async () => {
    try {
      setIsLoadingSavedDocs(true)
      const res = await taxRuleService.getAllRuleSets()
      const list = Array.isArray(res) ? res : (res?.data || [])
      const formatted = list.map((item) => ({
        id: item.ruleSetId,
        ruleSetId: item.ruleSetId,
        name: item.name || `Quy tắc thuế năm ${item.taxYear}`,
        fileName: item.name ? `${item.name}.pdf` : `luat-thue-${item.taxYear}.pdf`,
        taxYear: item.taxYear,
        rulesCount: 'Đầy đủ',
        status: item.status || 'Active',
        uploadedAt: item.approvedAt
          ? new Date(item.approvedAt).toLocaleDateString('vi-VN')
          : 'Đã lưu hệ thống',
        isPersisted: true,
      }))
      setSavedRuleSets(formatted)
    } catch (err) {
      console.warn('Lỗi khi tải danh sách văn bản quy phạm từ máy chủ:', err)
    } finally {
      setIsLoadingSavedDocs(false)
    }
  }

  const allDocs = useMemo(() => {
    const existingIds = new Set(recentDocs.map((d) => d.id || d.ruleSetId))
    const additional = savedRuleSets.filter((s) => !existingIds.has(s.id))
    return [...recentDocs, ...additional]
  }, [recentDocs, savedRuleSets])

  const handleDeleteDoc = (e, docId) => {
    e.stopPropagation()
    setRecentDocs((prev) => prev.filter((d) => d.id !== docId))
    setSavedRuleSets((prev) => prev.filter((d) => d.id !== docId))
  }

  const handleClearDocs = () => {
    setRecentDocs([])
    setSavedRuleSets([])
  }

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleFile = (file) => {
    setErrors((prev) => ({ ...prev, file: null }))
    setValidationAlert(null)

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, file: 'Chỉ hỗ trợ tệp định dạng PDF.' }))
      return
    }

    const maxSize = 20 * 1024 * 1024 // 20 MB
    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, file: 'Dung lượng tệp không được vượt quá 20 MB.' }))
      return
    }

    setSelectedFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemoveFile = (e) => {
    e.stopPropagation()
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCancelClick = () => {
    const hasData = name.trim() !== '' || sourceUrl.trim() !== '' || selectedFile !== null
    if (hasData) {
      setShowCancelModal(true)
    } else {
      onCancel?.()
    }
  }

  const validateTaxYearValue = (value) => {
    const str = String(value ?? '').trim()
    if (!str) {
      return 'Năm tính thuế bắt buộc nhập (từ 1900 đến 2100).'
    }
    const yearNum = Number(str)
    if (isNaN(yearNum) || !Number.isInteger(yearNum)) {
      return 'Năm tính thuế phải là số nguyên hợp lệ.'
    }
    if (yearNum < 1900 || yearNum > 2100) {
      return 'Năm tính thuế phải nằm trong khoảng từ 1900 đến 2100.'
    }
    return null
  }

  const handleTaxYearChange = (e) => {
    const val = e.target.value
    setTaxYear(val)

    const err = validateTaxYearValue(val)
    // Nếu ô nhập trước đó đang có lỗi hoặc người dùng đã nhập chuỗi từ 4 ký tự trở lên:
    if (errors.taxYear || (val && String(val).length >= 4)) {
      if (err) {
        setErrors((prev) => ({ ...prev, taxYear: err }))
        if (validationAlert?.field === 'taxYear') {
          setValidationAlert((prev) => ({
            ...prev,
            message: err,
          }))
        }
      } else {
        setErrors((prev) => ({ ...prev, taxYear: null }))
        if (validationAlert?.field === 'taxYear') {
          setValidationAlert(null)
        }
      }
    } else if (!err) {
      if (errors.taxYear) setErrors((prev) => ({ ...prev, taxYear: null }))
      if (validationAlert?.field === 'taxYear') setValidationAlert(null)
    }
  }

  const handleTaxYearBlur = () => {
    const err = validateTaxYearValue(taxYear)
    if (err) {
      setErrors((prev) => ({ ...prev, taxYear: err }))
      setValidationAlert({
        title: 'Năm tính thuế chưa hợp lệ',
        message: err,
        field: 'taxYear',
        suggestion: `Khắc phục: Vui lòng nhập năm tính thuế hợp lệ từ 1900 đến 2100 (ví dụ: ${new Date().getFullYear()}).`,
      })
    } else {
      setErrors((prev) => ({ ...prev, taxYear: null }))
      if (validationAlert?.field === 'taxYear') {
        setValidationAlert(null)
      }
    }
  }

  const cleanDomainString = (domainStr) => {
    if (!domainStr || typeof domainStr !== 'string') return ''
    let clean = domainStr.trim().toLowerCase()
    clean = clean.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
    if (clean.startsWith('www.')) clean = clean.slice(4)
    return clean
  }

  const checkDomainValidation = (url, rules = urlRules) => {
    if (!url || !url.trim()) return { isValid: true, domain: '', matchedRule: null, error: null }
    const domain = cleanDomainString(url)
    if (!domain) {
      return { isValid: false, domain: '', matchedRule: null, error: 'URL không đúng định dạng.' }
    }

    const activeRules = rules.filter((r) => r.is_active !== false && r.isActive !== false)
    if (!activeRules || activeRules.length === 0) {
      return { isValid: true, domain, matchedRule: null, error: null }
    }

    const matched = activeRules.find((r) => {
      const target = cleanDomainString(r.domain)
      return domain === target || domain.endsWith('.' + target)
    })

    if (matched) {
      return { isValid: true, domain, matchedRule: matched, error: null }
    }

    return {
      isValid: false,
      domain,
      matchedRule: null,
      error: `Tên miền "${domain}" chưa thuộc danh sách nguồn văn bản được phê duyệt trong hệ thống.`,
    }
  }

  const handleSourceUrlChange = (val) => {
    setSourceUrl(val)
    if (!val || !val.trim()) {
      if (errors.sourceUrl) setErrors((prev) => ({ ...prev, sourceUrl: null }))
    }
  }

  // Tự động kiểm tra tính hợp lệ của tên miền nguồn với debounce (tránh giật lag hoặc báo lỗi khi người dùng đang gõ dở)
  useEffect(() => {
    if (!debouncedSourceUrl || !debouncedSourceUrl.trim()) return

    if (/^https?:\/\/.+/i.test(debouncedSourceUrl.trim())) {
      const check = checkDomainValidation(debouncedSourceUrl)
      if (!check.isValid) {
        setErrors((prev) => ({ ...prev, sourceUrl: check.error }))
      } else if (errors.sourceUrl) {
        setErrors((prev) => ({ ...prev, sourceUrl: null }))
      }
    }
  }, [debouncedSourceUrl, urlRules])

  const handleSourceUrlBlur = () => {
    if (!sourceUrl || !sourceUrl.trim()) return
    if (!/^https?:\/\/.+/i.test(sourceUrl.trim())) {
      setErrors((prev) => ({
        ...prev,
        sourceUrl: 'Nguồn văn bản phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.',
      }))
      return
    }
    const check = checkDomainValidation(sourceUrl)
    if (!check.isValid) {
      setErrors((prev) => ({ ...prev, sourceUrl: check.error }))
    } else {
      setErrors((prev) => ({ ...prev, sourceUrl: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    let alertMsg = null

    const yearError = validateTaxYearValue(taxYear)
    if (yearError) {
      newErrors.taxYear = yearError
    }

    if (sourceUrl && sourceUrl.trim()) {
      if (!/^https?:\/\/.+/i.test(sourceUrl.trim())) {
        newErrors.sourceUrl = 'Nguồn văn bản phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.'
      } else {
        const domainCheck = checkDomainValidation(sourceUrl, urlRules)
        if (!domainCheck.isValid) {
          newErrors.sourceUrl = domainCheck.error
        }
      }
    }

    if (!selectedFile) {
      newErrors.file = 'Vui lòng chọn hoặc kéo thả tệp văn bản PDF.'
    } else if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      newErrors.file = 'Tệp tải lên bắt buộc phải có định dạng .PDF.'
    } else if (selectedFile.size > 20 * 1024 * 1024) {
      newErrors.file = 'Dung lượng tệp PDF vượt quá giới hạn tối đa 20 MB.'
    }

    if (Object.keys(newErrors).length > 0) {
      alertMsg = 'Vui lòng kiểm tra lại các trường thông tin trước khi gửi lên hệ thống.'
    }

    setErrors(newErrors)
    setValidationAlert(alertMsg)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsProcessing(true)
    setProcessProgress(20)
    setProcessStage(1)
    setProcessTitle('Đang tải văn bản lên hệ thống...')
    setProcessSubtitle(
      `Đang tải lên tệp "${selectedFile.name}" và khởi tạo tác vụ phân tích...`
    )

    let currentTaskId = null
    let timeoutTimer = null

    try {
      // 1. Đảm bảo kết nối SignalR Hub đã sẵn sàng trước khi gửi request
      await signalrService.startConnection().catch(() => {
        // Tiếp tục gửi yêu cầu bóc tách nếu kết nối thời gian thực gặp độ trễ
      })

      // 2. Gửi tệp PDF tới API quản trị
      const uploadRes = await taxAdminService.uploadTaxDocumentAsync(
        selectedFile,
        taxYear,
        name,
        sourceUrl
      )

      const rawRes = uploadRes?.data || uploadRes
      currentTaskId = rawRes?.taskId || null

      setProcessProgress(45)
      setProcessStage(2)
      setProcessTitle('Đang tiếp nhận và xếp hàng xử lý...')
      setProcessSubtitle(
        'Tài liệu đã được tiếp nhận thành công và chuyển đến hệ thống AI để tiến hành bóc tách...'
      )

      // 3. Gia nhập nhóm lắng nghe tác vụ qua SignalR
      if (currentTaskId) {
        await signalrService.joinTaskGroup(currentTaskId)
      }

      // Tiến độ phân tích quy tắc thuế trong nền
      const stageTimer = setTimeout(() => {
        setProcessProgress(75)
        setProcessStage(3)
        setProcessTitle('AI đang bóc tách và phân loại quy tắc thuế...')
        setProcessSubtitle(
          'Hệ thống đang quét nội dung văn bản và tự động chuẩn hóa các nhóm quy tắc thuế...'
        )
      }, 3500)

      // 4. Lắng nghe phản hồi từ SignalR khi AI bóc tách xong
      const handleCompletion = (response) => {
        // Nếu taskId không khớp thì bỏ qua
        if (currentTaskId && response.taskId && response.taskId !== currentTaskId) {
          return
        }

        clearTimeout(stageTimer)
        clearTimeout(timeoutTimer)

        signalrService.off('OnTaxExtractionCompleted', handleCompletion)
        signalrService.off('OnTaxExtractionFailed', handleFailure)
        if (currentTaskId) signalrService.leaveTaskGroup(currentTaskId)

        setProcessProgress(100)
        setProcessTitle('Bóc tách quy tắc thuế thành công!')
        setProcessSubtitle('Hệ thống đã hoàn tất bóc tách dữ liệu và sẵn sàng để thẩm tra.')

        const extractedData = { ...(response.data || {}) }
        if (response.warning && !extractedData.warning) {
          extractedData.warning = response.warning
        }
        const effectiveRuleSetId = response.ruleSetId || extractedData.ruleSetId || extractedData.taxRuleSet?.ruleSetId
        if (effectiveRuleSetId) {
          extractedData.ruleSetId = effectiveRuleSetId
          if (!extractedData.taxRuleSet) extractedData.taxRuleSet = {}
          extractedData.taxRuleSet.ruleSetId = effectiveRuleSetId
        }

        const rulesCount = extractedData.taxRules?.length || 0
        const verification = extractedData.verification || null
        const warningMsg =
          response.warning ||
          extractedData.warning ||
          verification?.warningMessage ||
          null
        const isYearMismatched = verification?.isTaxYearMatched === false

        if (isYearMismatched || warningMsg) {
          setProcessSubtitle(
            `Đã bóc tách dữ liệu. Phát hiện cảnh báo đối soát năm áp dụng (${verification?.extractedTaxYear || 'văn bản'} so với ${verification?.inputTaxYear || taxYear}). Vui lòng thẩm định kỹ.`
          )
        }

        const newDoc = {
          id: response.ruleSetId || extractedData.taxRuleSet?.ruleSetId || currentTaskId || Date.now().toString(),
          name: name.trim() || extractedData.taxRuleSet?.name || (taxYear ? `Luật thuế năm ${taxYear}` : 'Văn bản thuế'),
          fileName: selectedFile.name,
          taxYear: taxYear,
          rulesCount: rulesCount,
          status: extractedData.taxRuleSet?.status || 'Draft',
          adminName: user?.fullName || 'Quản trị viên',
          uploadedAt:
            new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
            ' • ' +
            new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          extractedData: extractedData,
        }

        setRecentDocs((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)].slice(0, 10))

        setTimeout(() => {
          setIsProcessing(false)
          if (isYearMismatched || warningMsg) {
            showToast(
              'Cảnh báo đối soát năm',
              warningMsg ||
                `Năm trong văn bản (${verification?.extractedTaxYear}) khác năm nhập (${verification?.inputTaxYear}). Vui lòng kiểm tra lại trong bước thẩm tra.`,
              'warning'
            )
          } else {
            showToast(
              'Bóc tách thành công',
              `AI đã bóc tách thành công ${rulesCount} quy tắc thuế từ văn bản PDF!`,
              'success'
            )
          }
          setTimeout(() => {
            onUploadSuccess?.(extractedData)
          }, 800)
        }, 800)
      }

      // 5. Lắng nghe phản hồi khi bóc tách thất bại
      const handleFailure = (response) => {
        if (currentTaskId && response.taskId && response.taskId !== currentTaskId) {
          return
        }

        clearTimeout(stageTimer)
        clearTimeout(timeoutTimer)

        signalrService.off('OnTaxExtractionCompleted', handleCompletion)
        signalrService.off('OnTaxExtractionFailed', handleFailure)
        if (currentTaskId) signalrService.leaveTaskGroup(currentTaskId)

        setIsProcessing(false)
        const errMsg = response.errorMessage || 'Hệ thống gặp sự cố trong quá trình bóc tách văn bản.'

        let alertData = {
          title: 'Thông báo xử lý văn bản',
          message: errMsg,
          status: null,
          suggestion: '',
          field: null,
        }

        if (
          errMsg.includes('StringDataRightTruncation') ||
          errMsg.includes('value too long for type character varying') ||
          errMsg.includes('character varying')
        ) {
          alertData = {
            title: 'Dữ liệu văn bản vượt quá quy định',
            message: 'Tên hoặc nội dung một quy tắc do hệ thống trích xuất từ văn bản dài hơn quy định chuẩn.',
            suggestion: 'Vui lòng kiểm tra lại văn bản nguồn hoặc liên hệ quản trị viên để chuẩn hóa cấu trúc dữ liệu.',
          }
        } else if (
          errMsg.includes('tax year already exists') ||
          errMsg.includes('TAX_RULE_SET_EXISTS') ||
          errMsg.includes('already exists')
        ) {
          alertData = {
            title: 'Trùng lặp năm tính thuế',
            message: `Năm tính thuế ${taxYear} đã có bộ quy tắc thuế tồn tại trên hệ thống.`,
            status: 409,
            field: 'taxYear',
            suggestion:
              'Khắc phục: Vui lòng thay đổi Năm tính thuế sang năm khác hoặc điều chỉnh bộ quy tắc trùng lặp.',
          }
          setErrors((prev) => ({ ...prev, taxYear: alertData.message }))
        } else if (errMsg.includes('Internal error') || errMsg.includes('psycopg') || errMsg.includes('SQL')) {
          alertData = {
            title: 'Thông báo xử lý văn bản',
            message: 'Hệ thống gặp sự cố trong quá trình lưu trữ và phân loại các điều khoản từ văn bản.',
            suggestion: 'Vui lòng thử lại với văn bản chuẩn hoặc liên hệ quản trị viên hệ thống.',
          }
        }

        setValidationAlert(alertData)
        showToast(alertData.title, alertData.message, 'error')
      }

      // Đăng ký listeners
      signalrService.on('OnTaxExtractionCompleted', handleCompletion)
      signalrService.on('OnTaxExtractionFailed', handleFailure)

      // Timeout 180 giây nếu văn bản lớn hoặc hệ thống bận
      timeoutTimer = setTimeout(() => {
        signalrService.off('OnTaxExtractionCompleted', handleCompletion)
        signalrService.off('OnTaxExtractionFailed', handleFailure)
        if (currentTaskId) signalrService.leaveTaskGroup(currentTaskId)
        setIsProcessing(false)

        setValidationAlert({
          title: 'Thời gian xử lý kéo dài hơn dự kiến',
          message:
            'Tài liệu có dung lượng lớn hoặc hệ thống AI đang xử lý nhiều tác vụ cùng lúc.',
          suggestion:
            'Bạn có thể kiểm tra danh sách "Văn bản đã tải lên gần đây" sau vài phút hoặc thử tải lại tài liệu.',
        })
        showToast('Thời gian xử lý kéo dài', 'Hệ thống đang tiếp tục xử lý văn bản trong nền.', 'warning')
      }, 180000)

    } catch (err) {
      setIsProcessing(false)
      clearTimeout(timeoutTimer)

      const alertData = {
        title: err.title || 'Lỗi tải lên văn bản',
        message: err.message || 'Không thể gửi tệp PDF tới hệ thống quản trị.',
        status: err.status || null,
        suggestion: err.suggestion || '',
        field: err.field || null,
      }

      setValidationAlert(alertData)
      if (err.field) {
        setErrors((prev) => ({ ...prev, [err.field]: err.message }))
      }
      showToast(alertData.title, alertData.message, 'error')
    }
  }

  return (
    <div className="relative w-full px-space-xl py-space-lg">
      {/* Subtle Dong Son Watermark in background */}
      <div className="pointer-events-none absolute right-4 top-8 w-96 h-96 opacity-[0.035] select-none text-primary">
        <svg fill="currentColor" viewBox="0 0 800 800">
          <circle cx="400" cy="400" fill="none" r="390" stroke="currentColor" strokeWidth="8"></circle>
          <circle cx="400" cy="400" fill="none" r="360" stroke="currentColor" strokeWidth="4"></circle>
          <circle cx="400" cy="400" fill="none" r="320" stroke="currentColor" strokeDasharray="14 10" strokeWidth="12"></circle>
          <circle cx="400" cy="400" fill="none" r="260" stroke="currentColor" strokeWidth="6"></circle>
          <circle cx="400" cy="400" fill="none" r="180" stroke="currentColor" strokeWidth="4"></circle>
          <circle cx="400" cy="400" fill="none" r="90" stroke="currentColor" strokeWidth="5"></circle>
          <polygon fill="currentColor" points="400,280 408,370 490,340 425,395 480,450 410,425 400,510 390,425 320,450 375,395 310,340 392,370"></polygon>
        </svg>
      </div>

      {/* Main Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm mb-space-md border-b border-outline-variant/50">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            Tải Lên Văn Bản Thuế
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Tải lên nghị quyết, thông tư, luật thuế dạng PDF để AI tự động đề xuất chỉnh sửa các quy tắc thuế.
          </p>
        </div>
      </div>

      {/* Form Grid & Aside */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Main Form Column (8/12) */}
        <section className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col gap-space-lg">
            
            {/* Header section in card */}
            <div className="flex items-center justify-between pb-space-sm bg-surface-container-low -mx-space-xl -mt-space-xl p-space-lg rounded-t-xl">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                <div>
                  <h2 className="font-title-sm text-title-sm font-bold text-on-surface uppercase tracking-wide">
                    Thông tin văn bản &amp; Tệp đính kèm
                  </h2>
                </div>
              </div>
            </div>

            {/* Validation Alert */}
            {validationAlert && (
              <div className="p-space-md rounded-xl bg-error-container/25 border border-error/40 text-on-surface flex flex-col gap-space-sm shadow-xs animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px]">error</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-title-sm text-title-sm font-bold text-error">
                          {typeof validationAlert === 'object' ? validationAlert.title : 'Thông báo hệ thống'}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface mt-1 leading-relaxed font-medium">
                        {typeof validationAlert === 'object' ? validationAlert.message : validationAlert}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationAlert(null)}
                    className="text-on-surface-variant hover:text-error p-1 rounded transition-colors cursor-pointer"
                    title="Đóng thông báo"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                {/* Additional Guidance / Suggestion */}
                {typeof validationAlert === 'object' && validationAlert.suggestion && (
                  <div className="ml-11 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60 flex flex-col gap-1.5 text-body-sm shadow-2xs">
                    <div className="flex items-center gap-1.5 text-secondary font-semibold">
                      <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                      <span>Hướng dẫn xử lý:</span>
                    </div>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed">
                      {validationAlert.suggestion}
                    </p>

                    {/* Quick Action: If 409 Tax Year Conflict */}
                    {validationAlert.status === 409 && validationAlert.field === 'taxYear' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/30 flex-wrap">
                        <span className="text-[12px] font-medium text-on-surface">Đổi nhanh sang năm:</span>
                        {(() => {
                          const baseYear = parseInt(taxYear, 10) || new Date().getFullYear()
                          return [baseYear - 1, baseYear + 1, baseYear + 2].map((suggestedYear) => (
                            <button
                              key={suggestedYear}
                              type="button"
                              onClick={() => {
                                setTaxYear(suggestedYear)
                                setErrors((prev) => ({ ...prev, taxYear: null }))
                                setValidationAlert(null)
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all cursor-pointer shadow-2xs"
                            >
                              Năm {suggestedYear}
                            </button>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                )}


              </div>
            )}

            {/* Tax Year & File Name */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md">
              <div className="md:col-span-4 flex flex-col gap-space-xs">
                <label className="flex items-center justify-between font-label-md text-label-md text-on-surface font-semibold" htmlFor="taxYearInput">
                  <span>Năm tính thuế <span className="text-error">*</span></span>
                </label>
                <div className="relative">
                  <input
                    id="taxYearInput"
                    type="number"
                    min="1900"
                    max="2100"
                    value={taxYear}
                    onChange={handleTaxYearChange}
                    onBlur={handleTaxYearBlur}
                    placeholder={String(new Date().getFullYear())}
                    className={`w-full h-11 px-space-md rounded-lg text-on-surface font-body-md text-body-md focus:outline-none transition-all shadow-inner ${
                      errors.taxYear
                        ? 'bg-error-container/15 border border-error focus:ring-1 focus:ring-error'
                        : 'bg-surface-container-low focus:bg-surface-container-lowest'
                    }`}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-[20px]">
                    calendar_today
                  </span>
                </div>
                {errors.taxYear && (
                  <p className="font-body-sm text-body-sm text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {errors.taxYear}
                  </p>
                )}
              </div>

              <div className="md:col-span-8 flex flex-col gap-space-xs">
                <label className="flex items-center justify-between font-label-md text-label-md text-on-surface font-semibold" htmlFor="fileNameInput">
                  <span>Tên văn bản quy phạm</span>
                </label>
                <div className="relative">
                  <input
                    id="fileNameInput"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Ví dụ: Luật Thuế Thu Nhập Cá Nhân ${new Date().getFullYear()}`}
                    className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-[20px]">
                    menu_book
                  </span>
                </div>
                {errors.name && (
                  <p className="font-body-sm text-body-sm text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {errors.name}
                  </p>
                )}
              </div>
            </div>

            {/* Source URL with Valid Domains Reminder Note */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="sourceUrlInput">
                  <span>Nguồn văn bản / Đường dẫn URL gốc</span>
                </label>
                <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
                  <span>Chỉ chấp thuận nguồn hợp lệ</span>
                </span>
              </div>

              <div className="relative">
                <input
                  id="sourceUrlInput"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => handleSourceUrlChange(e.target.value)}
                  onBlur={handleSourceUrlBlur}
                  placeholder="https://thuvienphapluat.vn/van-ban/..."
                  className={`w-full h-11 px-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner ${
                    errors.sourceUrl ? 'ring-1 ring-error' : ''
                  }`}
                />
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-[20px]">
                  link
                </span>
              </div>

              {/* Note nhắc nhở danh mục URL tên miền hợp lệ */}
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 flex flex-col gap-2 mt-0.5">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">
                    info
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-on-surface">
                      Danh mục tên miền nguồn văn bản được phê chuẩn:
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-relaxed">
                      Hệ thống chỉ tiếp nhận văn bản trích dẫn từ các cổng thông tin pháp luật chính thức. Nhấp để chọn nhanh:
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pl-6">
                  {urlRules
                    .filter((r) => r.isActive ?? r.is_active)
                    .map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSourceUrl(`https://${r.domain}/`)
                          if (errors.sourceUrl) setErrors((prev) => ({ ...prev, sourceUrl: null }))
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-surface-container-lowest hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-outline-variant/50 text-on-surface transition-all cursor-pointer shadow-2xs"
                        title={`Cơ quan ban hành: ${r.name}`}
                      >
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                        <span>{r.domain}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Real-time Domain Validation Feedback */}
              {sourceUrl && sourceUrl.trim().length > 0 && (() => {
                const check = checkDomainValidation(sourceUrl)
                if (check.isValid) {
                  return (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-body-sm text-body-sm animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                      <span>
                        Nguồn hợp lệ: <strong>{check.domain}</strong>
                        {check.matchedRule?.name ? ` — ${check.matchedRule.name}` : ''}
                      </span>
                    </div>
                  )
                }
                if (/^https?:\/\/.+/i.test(sourceUrl.trim())) {
                  return (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-body-sm text-body-sm animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
                      <span>
                        Tên miền <strong>{check.domain || 'chưa xác định'}</strong> chưa thuộc danh mục nguồn được phê duyệt. Vui lòng chọn một trong các tên miền hợp lệ nêu trên.
                      </span>
                    </div>
                  )
                }
                return null
              })()}

              {errors.sourceUrl && (
                <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {errors.sourceUrl}
                </p>
              )}
            </div>


            {/* PDF Upload Dropzone */}
            <div className="flex flex-col gap-space-xs">
              <label className="flex items-center justify-between font-label-md text-label-md text-on-surface font-semibold">
                <span className="flex items-center gap-1">
                  Tệp văn bản pháp quy PDF <span className="text-error">*</span>
                </span>
                <span className="text-secondary font-label-sm text-label-sm">
                  Định dạng: .PDF (Tối đa 20 MB)
                </span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-xl p-space-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'bg-surface-container-high'
                    : 'bg-surface-container-low/60 hover:bg-surface-container-high/40'
                }`}
                style={{
                  backgroundImage: 'radial-gradient(circle, #86530e 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={handleFileInputChange}
                />
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shadow-sm mb-space-sm">
                  <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                </div>
                <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                  {selectedFile ? 'Nhấn để thay đổi tệp PDF khác' : (
                    <>
                      Kéo thả file PDF vào đây hoặc{' '}
                      <span className="text-primary hover:underline font-bold">
                        Nhấn để chọn tệp từ máy tính
                      </span>
                    </>
                  )}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Hệ thống chỉ tiếp nhận tài liệu chuẩn hóa định dạng{' '}
                  <span className="font-semibold text-primary">.PDF</span> có dung lượng ≤ 20 MB
                </p>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-lowest shadow-sm mt-space-xs">
                  <div className="flex items-center gap-space-md min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-title-sm text-title-sm font-semibold text-on-surface truncate">
                          {selectedFile.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-sm text-label-sm font-bold shrink-0">
                          Đã chọn
                        </span>
                      </div>
                      <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        <span>Dung lượng: {formatBytes(selectedFile.size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs shrink-0">
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-colors cursor-pointer"
                      title="Xóa tệp khỏi danh sách"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              )}

              {errors.file && (
                <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>{errors.file}</span>
                </p>
              )}
            </div>


            {/* Action buttons */}
            <div className="flex items-center justify-between pt-space-lg">
              <button
                type="button"
                onClick={handleCancelClick}
                className="px-space-lg py-2.5 rounded-lg bg-surface-container text-on-surface font-title-sm text-title-sm hover:bg-surface-container-high transition-all flex items-center gap-space-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Hủy bỏ</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isProcessing || !selectedFile}
                className="px-space-xl py-3 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm font-semibold hover:bg-primary shadow-md hover:shadow-lg transition-all flex items-center gap-space-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">
                    cloud_upload
                  </span>
                )}
                <span>
                  {isProcessing
                    ? 'Đang phân tích & bóc tách AI...'
                    : 'Tải lên & Bóc tách bằng AI'}
                </span>
              </button>
            </div>

          </div>
        </section>

        {/* Right Column: Recently uploaded documents */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/60 flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">history_edu</span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                    Văn bản quy phạm đã lưu
                  </h3>
                  {allDocs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                      {allDocs.length}
                    </span>
                  )}
                  {isLoadingSavedDocs && (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                  )}
                </div>
              </div>
              {allDocs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearDocs}
                  className="text-xs text-error/80 hover:text-error hover:bg-error/10 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  title="Ẩn danh sách khỏi màn hình"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                  <span>Thu gọn</span>
                </button>
              )}
            </div>

            {/* List or Empty State */}
            {allDocs.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant bg-surface-container-low/40 rounded-lg border border-dashed border-outline-variant/60">
                <div className="w-12 h-12 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant/70 mb-1">
                  <span className="material-symbols-outlined text-[26px]">folder_off</span>
                </div>
                <p className="font-title-sm text-title-sm font-medium text-on-surface">
                  Chưa có văn bản lưu trữ
                </p>
                <p className="text-[12px] text-on-surface-variant max-w-[260px] leading-relaxed">
                  Các tệp văn bản thuế sau khi tải lên và trích xuất thành công qua AI sẽ được lưu trữ tại đây để bạn có thể xem lại hoặc tiếp tục thẩm tra bất cứ lúc nào.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-space-sm max-h-[560px] overflow-y-auto pr-1">
                {allDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (doc.extractedData) {
                        onUploadSuccess?.(doc.extractedData)
                      } else if (doc.ruleSetId || doc.id) {
                        onUploadSuccess?.({ ruleSetId: doc.ruleSetId || doc.id })
                      } else {
                        showToast('Chưa có dữ liệu', 'Tài liệu này chưa có dữ liệu chi tiết.', 'info')
                      }
                    }}
                    className="p-3.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/50 transition-all cursor-pointer group flex flex-col gap-3 shadow-2xs hover:shadow-sm"
                  >
                    {/* Top Row: Icon + Title/Filename + Delete button */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <span className="material-symbols-outlined text-[20px]">description</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-title-sm text-title-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate leading-snug">
                            {doc.name}
                          </h4>
                          <span className="text-[11px] text-on-surface-variant truncate font-mono block mt-0.5">
                            {doc.fileName}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className="p-1 rounded-md text-on-surface-variant/60 hover:text-error hover:bg-error/10 transition-colors shrink-0"
                        title="Xóa khỏi danh sách gần đây"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>

                    {/* Middle Row: Tag Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                        Năm {doc.taxYear}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-medium">
                        {doc.rulesCount} quy tắc
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          doc.status === 'ACTIVE' || doc.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                        }`}
                      >
                        {doc.status === 'ACTIVE' || doc.status === 'Active' ? 'Đã hiệu lực' : 'Bản nháp'}
                      </span>
                      {(doc.extractedData?.verification?.isTaxYearMatched === false ||
                        doc.extractedData?.warning) && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-800 border border-amber-500/30 flex items-center gap-0.5"
                          title="Phát hiện năm tính thuế có thể lệch so với văn bản gốc"
                        >
                          <span className="material-symbols-outlined text-[13px]">warning</span>
                          <span>Lệch năm</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Timestamp & Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{doc.uploadedAt}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                        <span>Mở thẩm tra</span>
                        <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-xl shadow-2xl p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-secondary">
              <div className="w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">help</span>
              </div>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                Dữ liệu chưa gửi
              </h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Bạn có dữ liệu tệp PDF chưa gửi lên hệ thống. Bạn có chắc chắn muốn rời khỏi trang này không?
            </p>
            <div className="flex items-center justify-end gap-space-sm pt-space-sm">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-title-sm text-title-sm hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false)
                  onCancel?.()
                }}
                className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm hover:bg-primary transition-colors cursor-pointer"
              >
                Rời khỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 backdrop-blur-md p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl shadow-2xl p-space-xl flex flex-col items-center text-center gap-space-lg">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-secondary-container/30 animate-ping"></div>
              <div className="relative w-20 h-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[40px] animate-pulse">psychology</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                {processTitle}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {processSubtitle}
              </p>
            </div>

            <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-container h-full transition-all duration-700"
                style={{ width: `${processProgress}%` }}
              ></div>
            </div>

            <div className="flex items-center gap-space-xs font-mono text-body-sm text-secondary">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>Giai đoạn {processStage}/3</span>
            </div>
          </div>
        </div>
      )}



      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-surface-container-lowest shadow-2xl rounded-xl p-space-md flex items-start gap-space-sm border border-secondary-container transition-all">
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
            <span className={`material-symbols-outlined text-[20px] ${toast.type === 'error' ? 'text-error' : 'text-secondary'}`}>
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-sm text-title-sm font-bold text-on-surface">{toast.title}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  )
}
