import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { systemConfigService } from '@/services/systemConfigService'
import { urlRuleService } from '@/services/urlRuleService'
import { useDebounce } from '@/hooks/useDebounce'
import { SystemConfigModal } from '@/components/admin/SystemConfigModal'
import { ThresholdTesterModal } from '@/components/admin/ThresholdTesterModal'
import { taxDocumentTypeService } from '@/services/taxDocumentTypeService'
import { TaxDocumentTypeModal } from '@/components/admin/TaxDocumentTypeModal'
import {
  DATA_TYPE_META,
  CONFIG_SORT_ORDER,
  getConfigFriendlyInfo,
  FIELD_LABELS,
} from '@/utils/configDataTypeUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AdminSystemSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'ai-configs'

  // Tabs: 'ai-configs' (Cấu hình AI & Ngưỡng OCR) | 'domains' (Nguồn văn bản pháp quy) | 'system' (Tham số vận hành)
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Feedback Toast
  const [toast, setToast] = useState(null)
  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 4000)
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
      })
    } catch {
      return dateStr
    }
  }

  // =========================================================================
  // 1. PHÂN HỆ TIÊU CHUẨN XÉT DUYỆT & NGƯỠNG AI OCR
  // =========================================================================
  const [configs, setConfigs] = useState([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)
  const [configSearchQuery, setConfigSearchQuery] = useState('')
  const debouncedConfigSearch = useDebounce(configSearchQuery, 250)
  const [configFilterStatus, setConfigFilterStatus] = useState('all') // 'all' | 'active' | 'deleted'

  // Modal thêm mới / chỉnh sửa
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [configModalMode, setConfigModalMode] = useState('create') // 'create' | 'edit'
  const [editingConfig, setEditingConfig] = useState(null)
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false)

  // Modal xem chi tiết tiêu chuẩn
  const [viewingConfig, setViewingConfig] = useState(null)

  // Modal kiểm tra quy tắc xét duyệt
  const [isThresholdTesterOpen, setIsThresholdTesterOpen] = useState(false)

  // Modal xác nhận đưa vào lưu trữ
  const [deletingConfig, setDeletingConfig] = useState(null)
  const [isDeletingConfig, setIsDeletingConfig] = useState(false)

  // Modal xác nhận kích hoạt lại
  const [restoringConfig, setRestoringConfig] = useState(null)
  const [isRestoringConfig, setIsRestoringConfig] = useState(false)

  // Tải danh sách cấu hình trực tiếp từ CSDL qua API
  const fetchConfigs = async () => {
    setIsLoadingConfigs(true)
    try {
      const data = await systemConfigService.getConfigs(false)
      setConfigs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Lỗi khi tải cấu hình hệ thống:', err)
      showToast('Lỗi', err?.message || 'Không thể kết nối máy chủ để tải tiêu chuẩn hệ thống.', 'error')
    } finally {
      setIsLoadingConfigs(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // Thêm mới hoặc Cập nhật tiêu chuẩn
  const handleSaveConfig = async (formData) => {
    setIsConfigSubmitting(true)
    try {
      if (configModalMode === 'create') {
        await systemConfigService.createConfig(formData)
        showToast('Thành công', `Đã tạo mới tiêu chuẩn '${formData.config_key}' thành công.`, 'success')
      } else {
        await systemConfigService.updateConfig(formData.config_key, formData)
        showToast('Thành công', `Đã cập nhật tiêu chuẩn '${formData.config_key}' thành công.`, 'success')
      }
      setIsConfigModalOpen(false)
      await fetchConfigs()
    } catch (err) {
      console.error('Lỗi lưu cấu hình:', err)
      showToast('Lỗi', err?.message || 'Không thể lưu tiêu chuẩn xét duyệt.', 'error')
    } finally {
      setIsConfigSubmitting(false)
    }
  }

  // Bật/Tắt nhanh trạng thái áp dụng
  const handleToggleConfigActive = async (config) => {
    const nextStatus = !config.is_active
    try {
      await systemConfigService.updateConfig(config.config_key, { is_active: nextStatus })
      setConfigs((prev) =>
        prev.map((c) => (c.config_key === config.config_key ? { ...c, is_active: nextStatus } : c))
      )
      showToast(
        'Cập nhật trạng thái',
        `Tiêu chuẩn '${config.config_key}' đã ${nextStatus ? 'được áp dụng' : 'tạm dừng'}.`,
        'success'
      )
    } catch (err) {
      console.error('Lỗi toggle config:', err)
      showToast('Lỗi', err?.message || 'Không thể thay đổi trạng thái áp dụng.', 'error')
    }
  }

  // Chuyển vào mục lưu trữ (Tạm dừng áp dụng)
  const handleConfirmDeleteConfig = async () => {
    if (!deletingConfig) return
    setIsDeletingConfig(true)
    try {
      await systemConfigService.deleteConfig(deletingConfig.config_key)
      showToast(
        'Đã đưa vào lưu trữ',
        `Đã chuyển tiêu chuẩn '${deletingConfig.config_key}' vào mục lưu trữ.`,
        'success'
      )
      setDeletingConfig(null)
      await fetchConfigs()
    } catch (err) {
      console.error('Lỗi lưu trữ:', err)
      showToast('Lỗi', err?.message || 'Không thể chuyển vào mục lưu trữ.', 'error')
    } finally {
      setIsDeletingConfig(false)
    }
  }

  // Khôi phục áp dụng lại
  const handleConfirmRestoreConfig = async () => {
    if (!restoringConfig) return
    setIsRestoringConfig(true)
    try {
      await systemConfigService.restoreConfig(restoringConfig.config_key)
      showToast('Kích hoạt lại thành công', `Tiêu chuẩn '${restoringConfig.config_key}' đã hoạt động trở lại.`, 'success')
      setRestoringConfig(null)
      await fetchConfigs()
    } catch (err) {
      console.error('Lỗi khôi phục:', err)
      showToast('Lỗi', err?.message || 'Không thể khôi phục tiêu chuẩn.', 'error')
    } finally {
      setIsRestoringConfig(false)
    }
  }

  // Lọc và sắp xếp danh sách tiêu chuẩn theo thứ tự nghiệp vụ chuẩn
  const filteredConfigs = configs.filter((c) => {
    if (configFilterStatus === 'active') {
      if (c.is_deleted || !c.is_active) return false
    } else if (configFilterStatus === 'deleted') {
      if (!c.is_deleted) return false
    } else {
      if (c.is_deleted) return false
    }

    if (!debouncedConfigSearch.trim()) return true
    const q = debouncedConfigSearch.toLowerCase().trim()
    const friendly = getConfigFriendlyInfo(c.config_key)
    const matchFriendly = friendly.title?.toLowerCase().includes(q)
    const matchCategory = friendly.category?.toLowerCase().includes(q)
    const matchKey = c.config_key?.toLowerCase().includes(q)
    const matchDesc = c.description?.toLowerCase().includes(q)
    const matchVal = String(c.config_value ?? '').toLowerCase().includes(q)
    return matchFriendly || matchCategory || matchKey || matchDesc || matchVal
  })

  // Sắp xếp thứ tự: Ngưỡng chung -> Ngưỡng theo chứng từ -> Thông tin bắt buộc -> Tự động duyệt
  const sortedConfigs = [...filteredConfigs].sort((a, b) => {
    const orderA = CONFIG_SORT_ORDER[a.config_key] || (a.config_key.startsWith('THRESHOLD_') ? 4.5 : 99)
    const orderB = CONFIG_SORT_ORDER[b.config_key] || (b.config_key.startsWith('THRESHOLD_') ? 4.5 : 99)
    return orderA - orderB
  })

  // Thống kê số lượng thực tế
  const totalConfigsCount = configs.filter((c) => !c.is_deleted).length
  const activeConfigsCount = configs.filter((c) => !c.is_deleted && c.is_active).length
  const deletedConfigsCount = configs.filter((c) => c.is_deleted).length
  const globalThresholdConfig = configs.find(
    (c) => c.config_key === 'AI_CONFIDENCE_THRESHOLD' && !c.is_deleted
  )
  const currentGlobalThreshold = globalThresholdConfig ? globalThresholdConfig.config_value : '0.80'

  // =========================================================================
  // 2. PHÂN HỆ NGUỒN VĂN BẢN PHÁP QUY (URL RULES)
  // =========================================================================
  const [domainRules, setDomainRules] = useState([])
  const [isLoadingRules, setIsLoadingRules] = useState(true)
  const [ruleSearchQuery, setRuleSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(ruleSearchQuery, 300)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingRuleId, setEditingRuleId] = useState(null)
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    domain: '',
    description: '',
    is_active: true,
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [viewingRule, setViewingRule] = useState(null)
  const [deletingRule, setDeletingRule] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDomainRules = async () => {
    setIsLoadingRules(true)
    try {
      const res = await urlRuleService.getRules(false)
      const list = Array.isArray(res) ? res : (res?.data || [])
      setDomainRules(list)
    } catch (err) {
      console.warn('Lỗi khi tải danh mục tên miền nguồn qua API:', err)
      showToast('Thông báo', 'Không thể kết nối máy chủ để tải danh mục tên miền.', 'error')
    } finally {
      setIsLoadingRules(false)
    }
  }

  useEffect(() => {
    fetchDomainRules()
  }, [])

  const handleOpenCreateModal = () => {
    setFormMode('create')
    setEditingRuleId(null)
    setRuleFormData({
      name: '',
      domain: '',
      description: '',
      is_active: true,
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (rule) => {
    setFormMode('edit')
    setEditingRuleId(rule.id)
    setRuleFormData({
      name: rule.name || '',
      domain: rule.domain || '',
      description: rule.description || '',
      is_active: rule.isActive ?? rule.is_active ?? true,
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  const handleOpenDetailModal = async (ruleId) => {
    try {
      const rule = await urlRuleService.getRuleById(ruleId)
      setViewingRule(rule)
    } catch (err) {
      console.error('Lỗi khi xem chi tiết quy tắc URL:', err)
      showToast('Lỗi', 'Không thể tải chi tiết quy tắc tên miền.', 'error')
    }
  }

  const validateRuleForm = () => {
    const errs = {}
    if (!ruleFormData.name.trim()) {
      errs.name = 'Vui lòng nhập tên cơ quan hoặc cổng thông tin'
    }
    if (!ruleFormData.domain.trim()) {
      errs.domain = 'Vui lòng nhập tên miền nguồn'
    } else {
      const cleanDomain = ruleFormData.domain.replace(/^https?:\/\//i, '').split('/')[0].trim()
      if (!cleanDomain.includes('.')) {
        errs.domain = 'Tên miền không đúng định dạng (VD: thuvienphapluat.vn)'
      }
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveRule = async (e) => {
    e.preventDefault()
    if (!validateRuleForm()) return

    setIsSubmitting(true)
    const cleanDomain = ruleFormData.domain.replace(/^https?:\/\//i, '').split('/')[0].trim().toLowerCase()

    try {
      if (formMode === 'create') {
        await urlRuleService.createRule({
          name: ruleFormData.name,
          domain: cleanDomain,
          description: ruleFormData.description,
          isActive: ruleFormData.is_active,
        })
        showToast('Thành công', `Đã thêm tên miền ${cleanDomain} vào danh mục nguồn văn bản hợp lệ.`, 'success')
      } else {
        await urlRuleService.updateRule(editingRuleId, {
          name: ruleFormData.name,
          domain: cleanDomain,
          description: ruleFormData.description,
          isActive: ruleFormData.is_active,
        })
        showToast('Thành công', `Đã cập nhật quy tắc kiểm tra cho tên miền ${cleanDomain}.`, 'success')
      }
      setIsFormModalOpen(false)
      await fetchDomainRules()
    } catch (err) {
      showToast('Lỗi xử lý', err.message || 'Thao tác không thành công.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRuleStatus = async (rule) => {
    const nextStatus = !(rule.isActive ?? rule.is_active ?? true)
    try {
      await urlRuleService.updateRule(rule.id, {
        name: rule.name,
        domain: rule.domain,
        description: rule.description,
        isActive: nextStatus,
      })
      showToast(
        'Cập nhật trạng thái',
        `Tên miền ${rule.domain} chuyển sang trạng thái: ${nextStatus ? 'Đang áp dụng' : 'Tạm dừng'}.`,
        'success'
      )
      setDomainRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: nextStatus, is_active: nextStatus } : r))
      )
    } catch (err) {
      showToast('Lỗi', err.message || 'Không thể thay đổi trạng thái tên miền.', 'error')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingRule) return
    setIsDeleting(true)
    try {
      await urlRuleService.deleteRule(deletingRule.id)
      showToast('Đã xóa', `Đã xóa tên miền ${deletingRule.domain} khỏi danh mục hợp lệ.`, 'success')
      setDeletingRule(null)
      await fetchDomainRules()
    } catch (err) {
      showToast('Lỗi khi xóa', err.message || 'Không thể xóa quy tắc tên miền.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredDomainRules = domainRules.filter((rule) => {
    if (!debouncedSearchQuery.trim()) return true
    const q = debouncedSearchQuery.toLowerCase().trim()
    const matchName = rule.name?.toLowerCase().includes(q)
    const matchDomain = rule.domain?.toLowerCase().includes(q)
    const matchDesc = rule.description?.toLowerCase().includes(q)
    return matchName || matchDomain || matchDesc
  })

  // =========================================================================
  // 3. THAM SỐ VẬN HÀNH CHUNG
  // =========================================================================
  const [systemConfig, setSystemConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('taxkeep_system_config')
      if (saved) return JSON.parse(saved)
    } catch {
      // Bỏ qua
    }
    return {
      defaultTaxYear: '2026',
      maxUploadSizeMb: '50',
      strictDomainCheck: true,
      autoActivateRules: true,
    }
  })
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  // =========================================================================
  // 4. PHÂN HỆ QUẢN TRỊ LOẠI CHỨNG TỪ THUẾ (TaxDocumentType)
  // =========================================================================
  const [docTypes, setDocTypes] = useState([])
  const [isLoadingDocTypes, setIsLoadingDocTypes] = useState(true)
  const [docTypeSearchQuery, setDocTypeSearchQuery] = useState('')
  const debouncedDocTypeSearch = useDebounce(docTypeSearchQuery, 250)
  const [docTypeFilterEligible, setDocTypeFilterEligible] = useState('all') // 'all' | 'eligible' | 'ineligible'

  // Modal thêm mới / cập nhật loại chứng từ
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false)
  const [docTypeModalMode, setDocTypeModalMode] = useState('create') // 'create' | 'edit'
  const [editingDocType, setEditingDocType] = useState(null)
  const [isDocTypeSubmitting, setIsDocTypeSubmitting] = useState(false)

  const fetchDocTypes = async () => {
    try {
      setIsLoadingDocTypes(true)
      const params = {}
      if (debouncedDocTypeSearch.trim()) params.search = debouncedDocTypeSearch.trim()
      if (docTypeFilterEligible === 'eligible') params.isTaxEligible = true
      if (docTypeFilterEligible === 'ineligible') params.isTaxEligible = false

      const list = await taxDocumentTypeService.getAll(params)
      setDocTypes(list)
    } catch (err) {
      console.error('Lỗi khi tải danh mục loại chứng từ:', err)
      showToast('Lỗi tải danh mục', err.message || 'Không thể tải danh sách loại chứng từ.', 'error')
    } finally {
      setIsLoadingDocTypes(false)
    }
  }

  useEffect(() => {
    fetchDocTypes()
  }, [debouncedDocTypeSearch, docTypeFilterEligible])

  const handleOpenCreateDocType = () => {
    setDocTypeModalMode('create')
    setEditingDocType(null)
    setIsDocTypeModalOpen(true)
  }

  const handleOpenEditDocType = (item) => {
    setDocTypeModalMode('edit')
    setEditingDocType(item)
    setIsDocTypeModalOpen(true)
  }

  const handleSaveDocType = async (payload) => {
    try {
      setIsDocTypeSubmitting(true)
      if (docTypeModalMode === 'create') {
        const created = await taxDocumentTypeService.create(payload)
        showToast('Thành công', `Đã thêm loại chứng từ ${created.code || payload.code}.`, 'success')
      } else {
        const updated = await taxDocumentTypeService.update(payload.code, {
          name: payload.name,
          isTaxEligible: payload.isTaxEligible,
        })
        showToast('Thành công', `Đã cập nhật loại chứng từ ${payload.code}.`, 'success')
      }
      setIsDocTypeModalOpen(false)
      await fetchDocTypes()
    } catch (err) {
      console.error('Lỗi khi lưu loại chứng từ:', err)
      showToast('Lưu thất bại', err.message || 'Không thể lưu loại chứng từ.', 'error')
    } finally {
      setIsDocTypeSubmitting(false)
    }
  }

  const handleSaveSystemConfig = (e) => {
    e.preventDefault()
    setIsSavingConfig(true)
    try {
      localStorage.setItem('taxkeep_system_config', JSON.stringify(systemConfig))
      setTimeout(() => {
        setIsSavingConfig(false)
        showToast('Thành công', 'Đã lưu cấu hình tham số vận hành hệ thống.', 'success')
      }, 300)
    } catch {
      setIsSavingConfig(false)
      showToast('Lỗi', 'Không thể lưu cấu hình hệ thống.', 'error')
    }
  }

  return (
    <div className="p-space-xl flex flex-col gap-space-lg max-w-6xl">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <div>
            <strong>{toast.title}:</strong> {toast.message}
          </div>
        </div>
      )}

      {/* Header & Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
            QUẢN TRỊ THÔNG SỐ & TIÊU CHUẨN XÉT DUYỆT
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            CẤU HÌNH HỆ THỐNG
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Thiết lập tiêu chuẩn kiểm tra hóa đơn tự động, quản lý nguồn văn bản quy chuẩn và các quy chế vận hành chung.
          </p>
        </div>

        {/* Action Header Button tương ứng theo Tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'ai-configs' && (
            <>
              <button
                type="button"
                onClick={() => setIsThresholdTesterOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-bold transition-all cursor-pointer shrink-0 border border-secondary/20"
                title="Kiểm tra mức độ chính xác hệ thống yêu cầu cho từng loại chứng từ"
              >
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Kiểm tra quy tắc xét duyệt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigModalMode('create')
                  setEditingConfig(null)
                  setIsConfigModalOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Thêm tiêu chuẩn xét duyệt</span>
              </button>
            </>
          )}

          {activeTab === 'domains' && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Thêm tên miền nguồn</span>
            </button>
          )}

          {activeTab === 'document-types' && (
            <button
              type="button"
              onClick={handleOpenCreateDocType}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Thêm loại chứng từ</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1">
        <button
          onClick={() => handleTabChange('ai-configs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ai-configs'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">psychology</span>
          <span>Cấu hình AI & Ngưỡng OCR ({totalConfigsCount || 6})</span>
        </button>

        <button
          onClick={() => handleTabChange('domains')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'domains'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">link</span>
          <span>Nguồn văn bản pháp quy ({domainRules.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('document-types')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'document-types'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Loại chứng từ thuế ({docTypes.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span>Tham số vận hành chung</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIÊU CHUẨN XÉT DUYỆT & NGƯỠNG AI OCR                                 */}
      {/* ========================================================================= */}
      {activeTab === 'ai-configs' && (
        <div className="flex flex-col gap-space-lg">
          {/* Thẻ Thống kê Tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Thẻ 1: Tổng số tiêu chuẩn */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">tune</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Tổng số tiêu chuẩn
                </span>
                <span className="font-headline-sm text-headline-sm font-extrabold text-on-surface">
                  {totalConfigsCount || 6}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 truncate">Đang quản trị trong hệ thống</span>
              </div>
            </div>

            {/* Thẻ 2: Đang có hiệu lực */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Đang có hiệu lực
                </span>
                <span className="font-headline-sm text-headline-sm font-extrabold text-emerald-600">
                  {activeConfigsCount}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 truncate">Áp dụng khi kiểm tra hóa đơn</span>
              </div>
            </div>

            {/* Thẻ 3: Độ chính xác chuẩn */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">percent</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Độ chính xác chuẩn
                </span>
                <span className="font-headline-sm text-headline-sm font-extrabold text-secondary">
                  {currentGlobalThreshold ? `${(Number(currentGlobalThreshold) * 100).toFixed(0)}%` : '80%'}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 truncate">Mức tin cậy tối thiểu chung</span>
              </div>
            </div>

            {/* Thẻ 4: Mục tạm lưu trữ */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Mục tạm lưu trữ
                </span>
                <span className="font-headline-sm text-headline-sm font-extrabold text-rose-600">
                  {deletedConfigsCount}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 truncate">Có thể kích hoạt lại bất cứ lúc nào</span>
              </div>
            </div>
          </div>

          {/* Thanh Công cụ: Tìm kiếm & Lọc */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-space-md">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên tiêu chuẩn, mục đích áp dụng..."
                value={configSearchQuery}
                onChange={(e) => setConfigSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all"
              />
              {configSearchQuery && (
                <button
                  type="button"
                  onClick={() => setConfigSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Buttons & Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto">
              <div className="inline-flex rounded-lg border border-outline-variant/40 p-0.5 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => setConfigFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    configFilterStatus === 'all'
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Tất cả ({totalConfigsCount || 6})
                </button>
                <button
                  type="button"
                  onClick={() => setConfigFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    configFilterStatus === 'active'
                      ? 'bg-surface-container-lowest text-emerald-600 shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Đang áp dụng ({activeConfigsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setConfigFilterStatus('deleted')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    configFilterStatus === 'deleted'
                      ? 'bg-surface-container-lowest text-rose-600 shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Tạm lưu trữ ({deletedConfigsCount})
                </button>
              </div>

              {/* Nút Làm mới */}
              <button
                type="button"
                onClick={fetchConfigs}
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors shrink-0"
                title="Làm mới danh sách"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {/* Bảng Danh sách Tiêu chuẩn */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
            {isLoadingConfigs ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs font-semibold">Đang tải danh sách tiêu chuẩn từ hệ thống...</span>
              </div>
            ) : sortedConfigs.length === 0 ? (
              <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">tune</span>
                <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                  {configFilterStatus === 'deleted'
                    ? 'Không có mục nào đang lưu trữ'
                    : configSearchQuery
                    ? 'Không tìm thấy tiêu chuẩn phù hợp'
                    : 'Chưa có tiêu chuẩn nào'}
                </h4>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  {configFilterStatus === 'deleted'
                    ? 'Hiện tại không có tiêu chuẩn nào bị tạm ngưng lưu trữ trong hệ thống.'
                    : 'Nhấn "Thêm tiêu chuẩn xét duyệt" để tạo quy định mới cho hệ thống.'}
                </p>
                {configFilterStatus !== 'deleted' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfigModalMode('create')
                        setEditingConfig(null)
                        setIsConfigModalOpen(true)
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer transition-all shadow-xs"
                    >
                      Thêm tiêu chuẩn xét duyệt
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-surface-container-low/50">
                    <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4 text-left w-[40%] whitespace-nowrap">Tiêu chuẩn kiểm tra</th>
                      <th className="py-3.5 px-4 text-left w-[28%] whitespace-nowrap">Mức thiết lập / Giá trị</th>
                      <th className="py-3.5 px-4 text-center w-[16%] whitespace-nowrap">Phân loại thiết lập</th>
                      <th className="py-3.5 px-4 text-center w-[10%] whitespace-nowrap">Trạng thái</th>
                      <th className="py-3.5 px-4 text-center w-[100px] whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/40">
                    {sortedConfigs.map((c) => {
                      const meta = DATA_TYPE_META[c.data_type] || DATA_TYPE_META.STRING
                      const isDeleted = Boolean(c.is_deleted)
                      const isAct = Boolean(c.is_active)
                      const friendly = getConfigFriendlyInfo(c.config_key)

                      return (
                        <tr
                          key={c.config_key}
                          className={`hover:bg-surface-container-low/60 transition-colors ${
                            isDeleted ? 'bg-rose-500/5 opacity-80' : ''
                          }`}
                        >
                          {/* Cột 1: Tiêu chuẩn kiểm tra */}
                          <td className="py-4 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl ${friendly.badgeClass} flex items-center justify-center shrink-0`}>
                                <span className="material-symbols-outlined text-[20px]">{friendly.icon}</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-xs text-on-surface leading-snug">
                                  {friendly.title}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium">
                                    {friendly.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Mức thiết lập / Giá trị */}
                          <td className="py-4 px-4 align-middle">
                            {c.data_type === 'FLOAT' ? (
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-extrabold text-primary min-w-[36px]">
                                  {(Number(c.config_value) * 100).toFixed(0)}%
                                </span>
                                <div className="w-24 bg-surface-container-highest h-2 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-primary h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, Number(c.config_value) * 100))}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-on-surface-variant font-medium">
                                  ({c.config_value})
                                </span>
                              </div>
                            ) : c.data_type === 'BOOLEAN' ? (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                  String(c.config_value).toLowerCase() === 'true'
                                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                    : 'bg-stone-500/10 text-stone-600 border border-stone-500/20'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  {String(c.config_value).toLowerCase() === 'true' ? 'check_circle' : 'cancel'}
                                </span>
                                <span>
                                  {String(c.config_value).toLowerCase() === 'true'
                                    ? 'Bật (Tự động duyệt)'
                                    : 'Tắt (Duyệt thủ công)'}
                                </span>
                              </span>
                            ) : c.data_type === 'LIST_STRING' ? (
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {String(c.config_value)
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                                  .map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium"
                                      title={item}
                                    >
                                      <span className="material-symbols-outlined text-[12px] text-amber-700">check</span>
                                      <span>{FIELD_LABELS[item] || item}</span>
                                    </span>
                                  ))}
                              </div>
                            ) : (
                              <span className="px-2 py-1 rounded bg-surface-container font-mono text-xs font-semibold block truncate max-w-xs">
                                {String(c.config_value)}
                              </span>
                            )}
                          </td>

                          {/* Cột 3: Phân loại thiết lập */}
                          <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium ${meta.badgeClass}`}
                              title={meta.hint}
                            >
                              <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                          </td>

                          {/* Cột 4: Trạng thái */}
                          <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                            {isDeleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                <span className="material-symbols-outlined text-[13px]">archive</span>
                                <span>Đã lưu trữ</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleConfigActive(c)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                                  isAct
                                    ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 hover:bg-emerald-500/20'
                                    : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300'
                                }`}
                                title="Bấm để bật hoặc tạm dừng áp dụng tiêu chuẩn này"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isAct ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                                  }`}
                                ></span>
                                <span>{isAct ? 'Đang áp dụng' : 'Tạm dừng'}</span>
                              </button>
                            )}
                          </td>

                          {/* Cột 5: Thao tác (Đã bổ sung action Xem chi tiết) */}
                          <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Action Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() => setViewingConfig(c)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                title="Xem chi tiết tiêu chuẩn"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>

                              {!isDeleted ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfigModalMode('edit')
                                      setEditingConfig(c)
                                      setIsConfigModalOpen(true)
                                    }}
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                    title="Điều chỉnh mức thiết lập"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingConfig(c)}
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 cursor-pointer transition-colors"
                                    title="Đưa vào mục lưu trữ"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">archive</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setRestoringConfig(c)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container cursor-pointer transition-colors shadow-xs"
                                  title="Kích hoạt áp dụng lại tiêu chuẩn"
                                >
                                  <span className="material-symbols-outlined text-[15px]">unarchive</span>
                                  <span>Kích hoạt lại</span>
                                </button>
                              )}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NGUỒN VĂN BẢN PHÁP QUY (URL RULES)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'domains' && (
        <div className="flex flex-col gap-space-md">
          {/* Thanh tìm kiếm & thống kê */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface">Tổng số tên miền hợp lệ:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                {domainRules.length}
              </span>
            </div>

            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên cơ quan, tên miền..."
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none transition-all"
              />
              {ruleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRuleSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Bảng Danh mục Tên miền */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
            {isLoadingRules ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs font-semibold">Đang tải danh mục tên miền nguồn từ máy chủ...</span>
              </div>
            ) : filteredDomainRules.length === 0 ? (
              <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">
                  domain_disabled
                </span>
                <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                  Chưa tìm thấy tên miền phù hợp
                </h4>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Không có tên miền nào khớp với tiêu chí tìm kiếm. Bạn có thể thêm tên miền mới vào danh mục cho phép.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer"
                >
                  Thêm tên miền mới
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold bg-surface-container-low/40">
                      <th className="py-3.5 px-4">Tên cơ quan / Cổng thông tin</th>
                      <th className="py-3.5 px-4">Tên miền được phép (Domain)</th>
                      <th className="py-3.5 px-4">Mô tả chức năng</th>
                      <th className="py-3.5 px-4 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/40">
                    {filteredDomainRules.map((r) => {
                      const isAct = r.isActive ?? r.is_active ?? true
                      return (
                        <tr key={r.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-on-surface">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                              <span>{r.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                            <span className="px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/30">
                              {r.domain}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">
                            {r.description || 'Nguồn văn bản quy chuẩn'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleRuleStatus(r)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                isAct
                                  ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 hover:bg-emerald-500/20'
                                  : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300'
                              }`}
                            >
                              {isAct ? 'Đang áp dụng' : 'Tạm dừng'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenDetailModal(r.id)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                title="Xem chi tiết quy tắc"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                title="Chỉnh sửa tên miền"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeletingRule(r)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 cursor-pointer transition-colors"
                                title="Xóa tên miền"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: THAM SỐ VẬN HÀNH CHUNG                                             */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <form onSubmit={handleSaveSystemConfig} className="flex flex-col gap-space-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Khối 1: Quy chế thẩm tra */}
            <div className="p-space-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex flex-col gap-space-md">
              <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container-high/60">
                <span className="material-symbols-outlined text-primary text-[22px]">verified_user</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Quy chế tiếp nhận văn bản
                </h3>
              </div>

              {/* Bật/Tắt kiểm tra nguồn gốc nghiêm ngặt */}
              <div className="flex items-start justify-between gap-4 py-2 border-b border-surface-container-high/40">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    Kiểm tra nguồn văn bản bắt buộc
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                    Chỉ tiếp nhận các văn bản pháp luật có đường dẫn nguồn thuộc danh mục tên miền hợp lệ đã được phê chuẩn.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={systemConfig.strictDomainCheck}
                    onChange={(e) =>
                      setSystemConfig({ ...systemConfig, strictDomainCheck: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Tự động kích hoạt quy tắc sau khi duyệt */}
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    Tự động đưa quy tắc vào hiệu lực (Active)
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                    Ngay sau khi Admin hoàn tất thẩm định và bấm Phê duyệt, bộ quy tắc sẽ lập tức được áp dụng cho tính thuế.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={systemConfig.autoActivateRules}
                    onChange={(e) =>
                      setSystemConfig({ ...systemConfig, autoActivateRules: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Khối 2: Tham số xử lý tải lên */}
            <div className="p-space-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex flex-col gap-space-md">
              <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container-high/60">
                <span className="material-symbols-outlined text-secondary text-[22px]">tune</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Thông số xử lý văn bản
                </h3>
              </div>

              {/* Năm tính thuế mặc định */}
              <div className="flex flex-col gap-1.5 py-1 border-b border-surface-container-high/40 pb-3">
                <label className="text-xs font-bold text-on-surface">
                  Năm áp dụng mặc định khi tải lên
                </label>
                <div className="w-full">
                  <Select
                    value={systemConfig.defaultTaxYear}
                    onValueChange={(value) =>
                      setSystemConfig({ ...systemConfig, defaultTaxYear: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn năm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">Năm 2024</SelectItem>
                      <SelectItem value="2025">Năm 2025</SelectItem>
                      <SelectItem value="2026">Năm 2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dung lượng tải lên tối đa */}
              <div className="flex flex-col gap-1.5 py-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface">
                    Dung lượng tệp tài liệu tối đa
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    {systemConfig.maxUploadSizeMb} MB
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={systemConfig.maxUploadSizeMb}
                  onChange={(e) =>
                    setSystemConfig({ ...systemConfig, maxUploadSizeMb: e.target.value })
                  }
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
                  <span>5 MB</span>
                  <span>50 MB (Khuyên dùng)</span>
                  <span>100 MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nút lưu cấu hình vận hành */}
          <div className="flex justify-end pt-space-xs">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSavingConfig ? (
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              <span>Lưu tham số vận hành</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUẢN TRỊ LOẠI CHỨNG TỪ THUẾ (TaxDocumentType)                      */}
      {/* ========================================================================= */}
      {activeTab === 'document-types' && (
        <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
          {/* Thẻ Thống kê Tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            {/* Tổng số */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-on-surface-variant font-medium">Tổng loại chứng từ</span>
                <span className="text-xl font-black text-on-surface tracking-tight">{docTypes.length}</span>
              </div>
            </div>

            {/* Đủ điều kiện */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-on-surface-variant font-medium">Đủ điều kiện giảm trừ thuế</span>
                <span className="text-xl font-black text-emerald-600 tracking-tight">
                  {docTypes.filter((d) => d.isTaxEligible).length}
                </span>
              </div>
            </div>

            {/* Không tính giảm trừ */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-stone-500/10 text-stone-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">do_not_disturb_on</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-on-surface-variant font-medium">Không tính giảm trừ</span>
                <span className="text-xl font-black text-stone-600 tracking-tight">
                  {docTypes.filter((d) => !d.isTaxEligible).length}
                </span>
              </div>
            </div>
          </div>

          {/* Thanh Tìm kiếm & Bộ lọc */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 relative min-w-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                value={docTypeSearchQuery}
                onChange={(e) => setDocTypeSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo mã chứng từ (VD: MEDICAL_...) hoặc tên loại chứng từ..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant/50 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none transition-all"
              />
              {docTypeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDocTypeSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={docTypeFilterEligible} onValueChange={(val) => setDocTypeFilterEligible(val)}>
                <SelectTrigger className="w-[190px] h-10 text-xs rounded-xl bg-surface-container-low border-outline-variant/50">
                  <SelectValue placeholder="Trạng thái giảm trừ" />
                </SelectTrigger>
                <SelectContent className="text-xs bg-surface-container-lowest border-outline-variant/50">
                  <SelectItem value="all">Tất cả chứng từ</SelectItem>
                  <SelectItem value="eligible">Đủ điều kiện giảm trừ</SelectItem>
                  <SelectItem value="ineligible">Không tính giảm trừ</SelectItem>
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={fetchDocTypes}
                disabled={isLoadingDocTypes}
                className="h-10 w-10 rounded-xl border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                title="Tải lại danh sách"
              >
                <span className={`material-symbols-outlined text-[20px] ${isLoadingDocTypes ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* Bảng Dữ liệu */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
            {isLoadingDocTypes ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <span className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                <p className="text-xs text-on-surface-variant font-medium">Đang tải danh mục loại chứng từ thuế...</p>
              </div>
            ) : docTypes.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px]">receipt_long</span>
                </div>
                <div className="flex flex-col gap-1 max-w-sm">
                  <h4 className="text-sm font-bold text-on-surface">Không tìm thấy loại chứng từ nào</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {docTypeSearchQuery
                      ? 'Không có kết quả nào khớp với điều kiện tìm kiếm hiện tại.'
                      : 'Hệ thống chưa có loại chứng từ thuế nào được định nghĩa.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateDocType}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-xs cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Thêm loại chứng từ ngay</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-high/60 bg-surface-container/40 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3.5 px-4">Mã loại chứng từ (Code)</th>
                      <th className="py-3.5 px-4">Tên loại chứng từ</th>
                      <th className="py-3.5 px-4 text-center">Tính giảm trừ thuế</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/40 text-xs">
                    {docTypes.map((item) => (
                      <tr key={item.code} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary tracking-wide">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="material-symbols-outlined text-[14px]">receipt</span>
                            <span>{item.code}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          <span>{item.name}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.isTaxEligible ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              <span className="material-symbols-outlined text-[14px]">verified</span>
                              <span>Đủ điều kiện giảm trừ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-500/10 text-stone-600 border border-stone-500/20">
                              <span className="material-symbols-outlined text-[14px]">remove_circle</span>
                              <span>Không tính giảm trừ</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDocType(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs font-semibold text-on-surface hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                            title="Chỉnh sửa loại chứng từ"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit_note</span>
                            <span>Chỉnh sửa</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS TIÊU CHUẨN XÉT DUYỆT                                                */}
      {/* ========================================================================= */}
      {/* Modal Thêm mới / Chỉnh sửa tiêu chuẩn */}
      <SystemConfigModal
        isOpen={isConfigModalOpen}
        mode={configModalMode}
        initialData={editingConfig}
        onClose={() => setIsConfigModalOpen(false)}
        onSubmit={handleSaveConfig}
        isSubmitting={isConfigSubmitting}
      />

      {/* Modal Kiểm tra quy tắc xét duyệt */}
      <ThresholdTesterModal
        isOpen={isThresholdTesterOpen}
        onClose={() => setIsThresholdTesterOpen(false)}
      />

      {/* Modal Xem chi tiết Tiêu chuẩn kiểm tra */}
      {viewingConfig && (() => {
        const friendly = getConfigFriendlyInfo(viewingConfig.config_key)
        const meta = DATA_TYPE_META[viewingConfig.data_type] || DATA_TYPE_META.STRING
        const isDeleted = Boolean(viewingConfig.is_deleted)
        const isAct = Boolean(viewingConfig.is_active)

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${friendly.badgeClass} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[20px]">{friendly.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-title-md font-bold text-on-surface">
                      Chi tiết tiêu chuẩn kiểm tra
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Thông tin thông số và quy tắc xét duyệt hóa đơn
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingConfig(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                {/* Tên tiêu chuẩn */}
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[11px] text-on-surface-variant font-bold">Tên tiêu chuẩn nghiệp vụ</span>
                  <span className="text-sm font-bold text-on-surface">{friendly.title}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium">
                      {friendly.category}
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant/70">
                      Mã: {viewingConfig.config_key}
                    </span>
                  </div>
                </div>

                {/* Mức thiết lập & Phân loại */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container-low">
                    <span className="text-[11px] text-on-surface-variant font-bold">Mức thiết lập / Giá trị</span>
                    {viewingConfig.data_type === 'FLOAT' ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-primary">
                          {(Number(viewingConfig.config_value) * 100).toFixed(0)}%
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          ({viewingConfig.config_value})
                        </span>
                      </div>
                    ) : viewingConfig.data_type === 'BOOLEAN' ? (
                      <span className="font-bold text-emerald-600 text-xs">
                        {String(viewingConfig.config_value).toLowerCase() === 'true'
                          ? 'Bật (Tự động duyệt)'
                          : 'Tắt (Duyệt thủ công)'}
                      </span>
                    ) : viewingConfig.data_type === 'LIST_STRING' ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {String(viewingConfig.config_value)
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((item, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-800 border border-amber-500/20 font-medium"
                            >
                              {FIELD_LABELS[item] || item}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-on-surface">{viewingConfig.config_value}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container-low">
                    <span className="text-[11px] text-on-surface-variant font-bold">Phân loại thiết lập</span>
                    <span className="font-bold text-xs text-on-surface">{meta.label}</span>
                    <span className="text-[10px] text-on-surface-variant/80">{meta.hint}</span>
                  </div>
                </div>

                {/* Mục đích & Hướng dẫn */}
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[11px] text-on-surface-variant font-bold">Mục đích & Hướng dẫn áp dụng</span>
                  <span className="text-on-surface leading-relaxed">
                    {viewingConfig.description || friendly.descriptionGuide}
                  </span>
                </div>

                {/* Trạng thái & Thời gian */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant pt-1">
                  <div>
                    Trạng thái:{' '}
                    <strong className={isDeleted ? 'text-rose-600' : isAct ? 'text-emerald-600' : 'text-stone-500'}>
                      {isDeleted ? 'Đã lưu trữ' : isAct ? 'Đang áp dụng' : 'Tạm dừng'}
                    </strong>
                  </div>
                  <div>
                    Cập nhật: <strong className="text-on-surface">{formatDateTime(viewingConfig.updated_at || viewingConfig.created_at)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={() => setViewingConfig(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Đóng
                </button>
                {!isDeleted && (
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = viewingConfig
                      setViewingConfig(null)
                      setConfigModalMode('edit')
                      setEditingConfig(toEdit)
                      setIsConfigModalOpen(true)
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Xác nhận Chuyển vào Lưu trữ */}
      {deletingConfig && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                  Chuyển vào mục lưu trữ
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Tạm thời ngưng áp dụng tiêu chuẩn <strong className="text-on-surface">{getConfigFriendlyInfo(deletingConfig.config_key).title}</strong> vào quy trình kiểm tra chứng từ? Bạn có thể kích hoạt lại bất kỳ lúc nào.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setDeletingConfig(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConfig}
                disabled={isDeletingConfig}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                {isDeletingConfig ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">archive</span>
                )}
                <span>Đưa vào lưu trữ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Kích hoạt lại */}
      {restoringConfig && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">unarchive</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                  Kích hoạt lại tiêu chuẩn xét duyệt
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Đưa tiêu chuẩn <strong className="text-on-surface">{getConfigFriendlyInfo(restoringConfig.config_key).title}</strong> trở lại trạng thái áp dụng bình thường trong quy trình kiểm tra chứng từ?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setRestoringConfig(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreConfig}
                disabled={isRestoringConfig}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                {isRestoringConfig ? (
                  <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
                <span>Kích hoạt lại ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS PHÂN HỆ NGUỒN VĂN BẢN (URL RULES)                                  */}
      {/* ========================================================================= */}
      {/* Modal Xem chi tiết một quy tắc URL */}
      {viewingRule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">verified</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Chi tiết tên miền hợp lệ
                </h3>
              </div>
              <button
                onClick={() => setViewingRule(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                <span className="text-[11px] text-on-surface-variant font-bold">Cơ quan / Cổng thông tin</span>
                <span className="text-sm font-bold text-on-surface">{viewingRule.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[11px] text-on-surface-variant font-bold">Tên miền được phép</span>
                  <span className="font-mono font-bold text-primary text-xs">{viewingRule.domain}</span>
                </div>
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[11px] text-on-surface-variant font-bold">Trạng thái</span>
                  <span className="font-bold text-xs">
                    {(viewingRule.isActive ?? viewingRule.is_active ?? true) ? (
                      <span className="text-emerald-600">Đang áp dụng</span>
                    ) : (
                      <span className="text-stone-500">Tạm dừng</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-container-low">
                <span className="text-[11px] text-on-surface-variant font-bold">Mô tả</span>
                <span className="text-on-surface leading-relaxed">
                  {viewingRule.description || 'Nguồn văn bản quy chuẩn'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant pt-1">
                <div>Ngày tạo: <strong className="text-on-surface">{formatDateTime(viewingRule.createdAt || viewingRule.created_at)}</strong></div>
                <div>Cập nhật: <strong className="text-on-surface">{formatDateTime(viewingRule.updatedAt || viewingRule.updated_at)}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-space-xs border-t border-surface-container-high/40">
              <button
                onClick={() => setViewingRule(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm mới / Cập nhật Tên miền */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {formMode === 'create' ? 'add_link' : 'edit_document'}
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  {formMode === 'create' ? 'Thêm tên miền nguồn kiểm tra URL' : 'Cập nhật tên miền nguồn kiểm tra URL'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="flex flex-col gap-space-md">
              {/* Tên cơ quan */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Tên cơ quan / Cổng thông tin <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thư Viện Pháp Luật, Bộ Tài Chính..."
                  value={ruleFormData.name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                  className={`h-10 px-3 rounded-lg border text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                    formErrors.name ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                  }`}
                />
                {formErrors.name && <span className="text-[11px] text-error">{formErrors.name}</span>}
              </div>

              {/* Tên miền */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Tên miền nguồn được phép (Domain) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="thuvienphapluat.vn"
                  value={ruleFormData.domain}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, domain: e.target.value })}
                  className={`h-10 px-3 rounded-lg border font-mono text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                    formErrors.domain ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                  }`}
                />
                {formErrors.domain && (
                  <span className="text-[11px] text-error">{formErrors.domain}</span>
                )}
                <span className="text-[10px] text-on-surface-variant">
                  Chỉ nhập tên miền gốc (không cần https:// hoặc đường dẫn phía sau).
                </span>
              </div>

              {/* Mô tả */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Mô tả chức năng</label>
                <textarea
                  rows={2}
                  placeholder="Cổng thông tin điện tử cung cấp văn bản quy phạm pháp luật..."
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  className="p-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none resize-none"
                />
              </div>

              {/* Trạng thái áp dụng */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="form-domain-active-chk"
                  checked={ruleFormData.is_active}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-primary cursor-pointer"
                />
                <label htmlFor="form-domain-active-chk" className="text-xs font-semibold text-on-surface cursor-pointer">
                  Kích hoạt quy tắc kiểm tra URL này
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                  <span>{formMode === 'create' ? 'Lưu tên miền mới' : 'Cập nhật tên miền'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quản trị Loại chứng từ thuế */}
      <TaxDocumentTypeModal
        isOpen={isDocTypeModalOpen}
        mode={docTypeModalMode}
        initialData={editingDocType}
        onClose={() => setIsDocTypeModalOpen(false)}
        onSubmit={handleSaveDocType}
        isSubmitting={isDocTypeSubmitting}
      />

      {/* Modal Xác nhận Xóa Tên miền */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-md w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container/40 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                  Xác nhận xóa quy tắc kiểm tra URL
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Bạn có chắc chắn muốn xóa tên miền <strong className="text-on-surface font-mono">{deletingRule.domain}</strong> khỏi danh mục kiểm tra không?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
              <button
                onClick={() => setDeletingRule(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-error text-on-error text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-on-error border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                )}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
