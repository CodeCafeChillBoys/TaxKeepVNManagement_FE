import { useState, useEffect } from 'react'
import { urlRuleService } from '@/services/urlRuleService'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AdminSystemSettingsPage() {
  // Tabs: 'domains' (Nguồn văn bản pháp quy) | 'system' (Tham số vận hành)
  const [activeTab, setActiveTab] = useState('domains')

  // URL Domain Rules State (GET /api/url-rules)
  const [domainRules, setDomainRules] = useState([])
  const [isLoadingRules, setIsLoadingRules] = useState(true)
  const [ruleSearchQuery, setRuleSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(ruleSearchQuery, 300)

  // Modal State for Adding (POST /api/url-rules) / Editing (PUT /api/url-rules/{id})
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [formMode, setFormMode] = useState('create') // 'create' | 'edit'
  const [editingRuleId, setEditingRuleId] = useState(null)
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    domain: '',
    description: '',
    is_active: true,
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detail Modal State (GET /api/url-rules/{id})
  const [viewingRule, setViewingRule] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Confirm Delete Modal State (DELETE /api/url-rules/{id})
  const [deletingRule, setDeletingRule] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Tham số vận hành chung
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

  // 1. GET /api/url-rules: Lấy danh sách các quy tắc kiểm tra URL
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

  // 2. GET /api/url-rules/{id}: Xem chi tiết một quy tắc URL
  const handleOpenDetailModal = async (ruleId) => {
    setIsLoadingDetail(true)
    try {
      const detail = await urlRuleService.getRuleById(ruleId)
      setViewingRule(detail)
    } catch (err) {
      showToast('Lỗi', err.message || 'Không thể tải chi tiết quy tắc URL.', 'error')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Mở modal Thêm mới
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

  // Mở modal Chỉnh sửa
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

  // 3 & 4. POST /api/url-rules & PUT /api/url-rules/{id}: Thêm hoặc cập nhật tên miền
  const handleSaveRule = async (e) => {
    e.preventDefault()
    setFormErrors({})

    const errors = {}
    if (!ruleFormData.name.trim()) {
      errors.name = 'Vui lòng nhập tên cơ quan hoặc cổng thông tin.'
    }
    if (!ruleFormData.domain.trim()) {
      errors.domain = 'Vui lòng nhập tên miền nguồn.'
    } else {
      let cleanDomain = ruleFormData.domain.trim().toLowerCase()
      cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
        errors.domain = 'Tên miền không hợp lệ (ví dụ đúng: thuvienphapluat.vn, mof.gov.vn).'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    let cleanDomain = ruleFormData.domain.trim().toLowerCase()
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    setIsSubmitting(true)
    try {
      const payload = {
        name: ruleFormData.name.trim(),
        domain: cleanDomain,
        description: ruleFormData.description.trim() || null,
        isActive: Boolean(ruleFormData.is_active),
      }

      if (formMode === 'create') {
        // POST /api/url-rules
        await urlRuleService.createRule(payload)
        showToast('Thành công', `Đã thêm tên miền ${cleanDomain} vào danh mục hợp lệ.`, 'success')
      } else {
        // PUT /api/url-rules/{id}
        await urlRuleService.updateRule(editingRuleId, payload)
        showToast('Thành công', `Đã cập nhật thông tin tên miền ${cleanDomain}.`, 'success')
      }

      setIsFormModalOpen(false)
      await fetchDomainRules()
    } catch (err) {
      showToast('Thao tác thất bại', err.message || 'Không thể lưu tên miền quy chuẩn.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // PUT /api/url-rules/{id}: Bật/Tắt nhanh trạng thái áp dụng
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

  // 5. DELETE /api/url-rules/{id}: Admin xóa một quy tắc kiểm tra URL
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

  // Lưu cấu hình tham số vận hành chung
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

  // Lọc tên miền theo từ khóa tìm kiếm (được tối ưu hóa bằng debounce)
  const filteredDomainRules = domainRules.filter((rule) => {
    if (!debouncedSearchQuery.trim()) return true
    const q = debouncedSearchQuery.toLowerCase().trim()
    const matchName = rule.name?.toLowerCase().includes(q)
    const matchDomain = rule.domain?.toLowerCase().includes(q)
    const matchDesc = rule.description?.toLowerCase().includes(q)
    return matchName || matchDomain || matchDesc
  })

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
            CẤU HÌNH VẬN HÀNH HỆ THỐNG
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            CẤU HÌNH HỆ THỐNG
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm max-w-2xl">
            Quản lý quy chuẩn nguồn văn bản pháp lý hợp lệ, tham số thẩm tra và thiết lập quy chế vận hành dữ liệu thuế.
          </p>
        </div>

        {activeTab === 'domains' && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm tên miền nguồn</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1">
        <button
          onClick={() => setActiveTab('domains')}
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
          onClick={() => setActiveTab('system')}
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

      {/* TAB 1: Danh mục tên miền nguồn văn bản (URL Validation Rules) */}
      {activeTab === 'domains' && (
        <div className="flex flex-col gap-space-md">
          {/* Thanh tìm kiếm & thống kê */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface">Danh mục tên miền hợp lệ</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {filteredDomainRules.length} tên miền
              </span>
            </div>

            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm tên cơ quan, tên miền..."
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/40 text-xs bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none"
              />
            </div>
          </div>

          {/* Bảng danh sách tên miền */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden">
            {isLoadingRules ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin"></div>
                <span className="text-xs font-semibold">Đang tải danh mục tên miền từ hệ thống...</span>
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
                              title="Nhấn để bật/tắt trạng thái áp dụng"
                            >
                              {isAct ? 'Đang áp dụng' : 'Tạm dừng'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Xem chi tiết (GET /api/url-rules/{id}) */}
                              <button
                                onClick={() => handleOpenDetailModal(r.id)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                title="Xem chi tiết quy tắc"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                              {/* Chỉnh sửa (PUT /api/url-rules/{id}) */}
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                                title="Chỉnh sửa tên miền"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {/* Xóa (DELETE /api/url-rules/{id}) */}
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

      {/* TAB 2: Tham số vận hành chung */}
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
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Tự động kích hoạt hiệu lực */}
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    Kích hoạt hiệu lực tức thì sau thẩm định
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                    Tự động chuyển trạng thái bộ quy tắc thuế sang có hiệu lực thi hành ngay khi ký duyệt hoàn tất.
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
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Khối 2: Tham số kỹ thuật & Dung lượng */}
            <div className="p-space-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex flex-col gap-space-md">
              <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container-high/60">
                <span className="material-symbols-outlined text-secondary text-[22px]">tune</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Tham số tiếp nhận dữ liệu
                </h3>
              </div>

              {/* Năm tính thuế mặc định */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">
                  Năm tính thuế mặc định của hệ thống
                </label>
                <Select
                  value={systemConfig.defaultTaxYear}
                  onValueChange={(val) => setSystemConfig({ ...systemConfig, defaultTaxYear: val })}
                >
                  <SelectTrigger className="w-full h-10 bg-surface-container-low border-outline-variant/40 font-semibold text-primary">
                    <SelectValue placeholder="Chọn năm mặc định" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-lowest border-outline-variant/40 shadow-md">
                    <SelectItem value="2026">Năm 2026 (Năm hiện hành)</SelectItem>
                    <SelectItem value="2025">Năm 2025</SelectItem>
                    <SelectItem value="2024">Năm 2024</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-on-surface-variant">
                  Áp dụng làm năm mặc định khi khởi tạo biểu mẫu tải tài liệu văn bản thuế.
                </span>
              </div>

              {/* Dung lượng tải tệp tối đa */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-xs font-bold text-on-surface">
                  Giới hạn dung lượng tệp văn bản quy phạm (PDF)
                </label>
                <Select
                  value={systemConfig.maxUploadSizeMb}
                  onValueChange={(val) => setSystemConfig({ ...systemConfig, maxUploadSizeMb: val })}
                >
                  <SelectTrigger className="w-full h-10 bg-surface-container-low border-outline-variant/40 font-semibold text-primary">
                    <SelectValue placeholder="Chọn dung lượng tối đa" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-lowest border-outline-variant/40 shadow-md">
                    <SelectItem value="25">Tối đa 25 MB</SelectItem>
                    <SelectItem value="50">Tối đa 50 MB (Khuyến nghị)</SelectItem>
                    <SelectItem value="100">Tối đa 100 MB</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-on-surface-variant">
                  Đảm bảo tốc độ truyền tải tài liệu văn bản thuế luôn nhanh chóng và ổn định.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer shadow-sm transition-all flex items-center gap-2"
            >
              {isSavingConfig ? (
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              <span>Lưu cấu hình hệ thống</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Xem chi tiết quy tắc (GET /api/url-rules/{id}) */}
      {viewingRule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">info</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Chi tiết quy tắc tên miền
                </h3>
              </div>
              <button
                onClick={() => setViewingRule(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 py-1 text-xs">
              <div className="flex items-start justify-between py-1.5 border-b border-surface-container-high/30">
                <span className="text-on-surface-variant font-medium">Tên cơ quan / Cổng thông tin:</span>
                <strong className="text-on-surface text-right font-semibold">{viewingRule.name}</strong>
              </div>

              <div className="flex items-start justify-between py-1.5 border-b border-surface-container-high/30">
                <span className="text-on-surface-variant font-medium">Tên miền được phép:</span>
                <span className="font-mono text-primary font-bold px-2 py-0.5 rounded bg-surface-container">
                  {viewingRule.domain}
                </span>
              </div>

              <div className="flex items-start justify-between py-1.5 border-b border-surface-container-high/30">
                <span className="text-on-surface-variant font-medium">Trạng thái áp dụng:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    viewingRule.isActive ?? viewingRule.is_active
                      ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/25'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {viewingRule.isActive ?? viewingRule.is_active ? 'Đang áp dụng' : 'Tạm dừng'}
                </span>
              </div>

              <div className="flex flex-col gap-1 py-1.5 border-b border-surface-container-high/30">
                <span className="text-on-surface-variant font-medium">Mô tả chức năng:</span>
                <p className="text-on-surface leading-relaxed">{viewingRule.description || 'Không có mô tả thêm.'}</p>
              </div>

              <div className="flex items-start justify-between py-1.5 border-b border-surface-container-high/30">
                <span className="text-on-surface-variant font-medium">Thời gian khởi tạo:</span>
                <span className="text-on-surface font-medium">{formatDateTime(viewingRule.createdAt ?? viewingRule.created_at)}</span>
              </div>

              <div className="flex items-start justify-between py-1.5">
                <span className="text-on-surface-variant font-medium">Cập nhật lần cuối:</span>
                <span className="text-on-surface font-medium">{formatDateTime(viewingRule.updatedAt ?? viewingRule.updated_at)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-surface-container-high/40">
              <button
                onClick={() => {
                  const toEdit = viewingRule
                  setViewingRule(null)
                  handleOpenEditModal(toEdit)
                }}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Chỉnh sửa</span>
              </button>
              <button
                onClick={() => setViewingRule(null)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm mới (POST) / Chỉnh sửa (PUT) Tên miền */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/50 max-w-lg w-full p-space-xl flex flex-col gap-space-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
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

      {/* Modal Xác nhận Xóa Tên miền (DELETE /api/url-rules/{id}) */}
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
