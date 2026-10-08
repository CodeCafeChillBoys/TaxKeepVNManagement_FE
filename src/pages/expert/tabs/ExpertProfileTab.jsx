import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { expertPortalService } from '@/services/expertPortalService'

function formatCurrency(val) {
  if (val === null || val === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)
}

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? String(d) : dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const APPLICATION_STATUS_MAP = {
  Draft: { label: 'Bản nháp', variant: 'muted', color: 'bg-stone-100 text-stone-700', icon: 'edit_note' },
  PendingReview: { label: 'Chờ thẩm định', variant: 'warning', color: 'bg-amber-100 text-amber-800', icon: 'hourglass_top' },
  NeedSupplement: { label: 'Yêu cầu bổ sung hồ sơ', variant: 'orange', color: 'bg-orange-100 text-orange-800', icon: 'warning' },
  Rejected: { label: 'Bị từ chối', variant: 'destructive', color: 'bg-red-100 text-red-700', icon: 'cancel' },
  Approved: { label: 'Đã phê duyệt chính thức', variant: 'success', color: 'bg-emerald-100 text-emerald-800', icon: 'verified' },
}

const CERT_STATUS_MAP = {
  PendingVerification: { label: 'Chờ xác minh', variant: 'warning' },
  Verified: { label: 'Đã thẩm định hợp lệ', variant: 'success' },
  Rejected: { label: 'Không hợp lệ', variant: 'destructive' },
  Expired: { label: 'Hết hạn', variant: 'muted' },
}

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam' },
  CHAT: { label: 'Nhắn tin', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call' },
}

export function ExpertProfileTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [application, setApplication] = useState(null)
  const [specializationsList, setSpecializationsList] = useState([])
  const [feeConfigsList, setFeeConfigsList] = useState([])

  // Edit form state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    companyName: '',
    bio: '',
    yearsOfExperience: 3,
    currentPosition: '',
    experienceDescription: '',
    specializationIds: [],
    feeProposals: [],
  })

  // Upload cert dialog
  const [showUploadCert, setShowUploadCert] = useState(false)
  const [certForm, setCertForm] = useState({
    file: null,
    certificateType: 'TAX_AGENT',
    certificateName: '',
    certificateNumber: '',
    issuingAuthority: '',
    issueDate: '',
    hasExpiry: false,
    expiryDate: '',
  })
  const [certUploading, setCertUploading] = useState(false)

  // Upload avatar
  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Submitting application
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [app, specs, fees] = await Promise.all([
        expertPortalService.getMyApplication().catch(() => null),
        expertPortalService.getSpecializations().catch(() => []),
        expertPortalService.getFeeConfigs().catch(() => []),
      ])

      setApplication(app)
      setSpecializationsList(specs)
      setFeeConfigsList(fees)

      if (app) {
        setFormData({
          fullName: app.fullName || '',
          jobTitle: app.jobTitle || '',
          companyName: app.companyName || '',
          bio: app.bio || '',
          yearsOfExperience: app.yearsOfExperience || 0,
          currentPosition: app.currentPosition || '',
          experienceDescription: app.experienceDescription || '',
          specializationIds: app.specializations?.map((s) => s.id || s.specializationId) || [],
          feeProposals: app.feeProposals?.map((f) => ({
            sessionType: f.sessionType,
            durationMinutes: f.durationMinutes,
            proposedFee: f.proposedFee,
          })) || [],
        })
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tải thông tin hồ sơ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploading(true)
    try {
      const res = await expertPortalService.uploadAvatar(file)
      setSuccessMsg('Tải lên ảnh đại diện thành công!')
      await loadData()
    } catch (err) {
      alert(err.message || 'Lỗi khi tải lên ảnh đại diện.')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveDraft = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await expertPortalService.saveDraft(formData)
      setSuccessMsg('Lưu bản nháp hồ sơ thành công!')
      setIsEditing(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu bản nháp.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitApplication = async () => {
    if (!confirm('Bạn có chắc chắn muốn nộp hồ sơ này để thẩm định?')) return
    setSubmitting(true)
    setError(null)
    try {
      await expertPortalService.submitApplication()
      setSuccessMsg('Hồ sơ của bạn đã được gửi thành công và đang chờ xét duyệt!')
      await loadData()
    } catch (err) {
      setError(err.message || 'Lỗi khi nộp hồ sơ.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadCertSubmit = async (e) => {
    e.preventDefault()
    if (!certForm.file) {
      alert('Vui lòng chọn tệp chứng chỉ.')
      return
    }

    setCertUploading(true)
    try {
      await expertPortalService.uploadCertificate(certForm)
      setShowUploadCert(false)
      setCertForm({
        file: null,
        certificateType: 'TAX_AGENT',
        certificateName: '',
        certificateNumber: '',
        issuingAuthority: '',
        issueDate: '',
        hasExpiry: false,
        expiryDate: '',
      })
      setSuccessMsg('Tải lên chứng chỉ thành công!')
      await loadData()
    } catch (err) {
      alert(err.message || 'Lỗi khi tải lên chứng chỉ.')
    } finally {
      setCertUploading(false)
    }
  }

  const handleDeleteCert = async (certId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chứng chỉ này?')) return
    try {
      await expertPortalService.deleteCertificate(certId)
      setSuccessMsg('Xóa chứng chỉ thành công.')
      await loadData()
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa chứng chỉ.')
    }
  }

  const handleToggleSpec = (id) => {
    setFormData((prev) => {
      const exists = prev.specializationIds.includes(id)
      return {
        ...prev,
        specializationIds: exists
          ? prev.specializationIds.filter((x) => x !== id)
          : [...prev.specializationIds, id],
      }
    })
  }

  const handleFeeChange = (sessionType, durationMinutes, fee) => {
    setFormData((prev) => {
      const current = [...prev.feeProposals]
      const idx = current.findIndex(
        (f) => f.sessionType === sessionType && f.durationMinutes === durationMinutes
      )
      if (idx >= 0) {
        current[idx].proposedFee = Number(fee)
      } else {
        current.push({
          sessionType,
          durationMinutes,
          proposedFee: Number(fee),
        })
      }
      return { ...prev, feeProposals: current }
    })
  }

  const statusInfo = APPLICATION_STATUS_MAP[application?.status] || APPLICATION_STATUS_MAP.Draft
  const isApproved = application?.status === 'Approved'
  const isNeedSupplement = application?.status === 'NeedSupplement'
  const canEdit = !application || application.status === 'Draft' || application.status === 'NeedSupplement'

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Đang tải hồ sơ chuyên gia...</span>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Alert Banners */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Need Supplement Alert */}
      {isNeedSupplement && (
        <div className="p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 text-orange-900 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-orange-800 font-extrabold text-base">
            <span className="material-symbols-outlined text-[22px]">warning</span>
            <span>HỘI ĐỒNG YÊU CẦU BỔ SUNG HỒ SƠ</span>
          </div>
          <p className="text-sm leading-relaxed font-medium">
            {application.supplementRequestReason || 'Vui lòng bổ sung thêm thông tin hoặc tài liệu chứng chỉ hành nghề hợp lệ.'}
          </p>
          <div className="mt-2 flex gap-3">
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Cập nhật hồ sơ ngay
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmitApplication}
              disabled={submitting}
              className="border-orange-400 text-orange-800"
            >
              {submitting ? 'Đang gửi...' : 'Nộp lại hồ sơ sau khi bổ sung'}
            </Button>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <Card className="border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#182747] via-[#213555] to-[#2c4066] relative" />
        <CardContent className="px-8 pb-8 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16">
            <div className="relative group">
              {application?.avatarUrl ? (
                <img
                  src={application.avatarUrl}
                  alt={application.fullName}
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl bg-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-amber-500/20 border-4 border-white shadow-xl flex items-center justify-center text-amber-600 font-bold">
                  <span className="material-symbols-outlined text-[54px]">person</span>
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-3xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                >
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                  <span className="text-[10px] font-bold mt-1">Đổi ảnh</span>
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-extrabold text-on-surface">
                  {application?.fullName || 'Chuyên gia tư vấn'}
                </h1>
                {isApproved && (
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]" title="Chuyên gia chính thức">
                    verified
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant font-medium">
                {application?.jobTitle || 'Chuyên viên tư vấn thuế'}
                {application?.companyName ? ` • ${application.companyName}` : ''}
              </p>
              <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
                  <span className="material-symbols-outlined text-[14px]">{statusInfo.icon}</span>
                  {statusInfo.label}
                </span>
                {application?.applicationNumber && (
                  <span className="font-mono text-xs text-on-surface-variant font-medium">
                    #{application.applicationNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-center md:self-end">
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Chỉnh sửa thông tin</span>
              </Button>
            )}

            {canEdit && (application?.status === 'Draft' || application?.status === 'NeedSupplement') && (
              <Button
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{submitting ? 'Đang gửi...' : 'Nộp hồ sơ xét duyệt'}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Details or Edit Form */}
      {isEditing ? (
        <Card className="border border-outline-variant/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Chỉnh sửa thông tin hồ sơ chuyên gia</CardTitle>
            <CardDescription>
              Cập nhật thông tin chi tiết về kinh nghiệm làm việc, năng lực và lĩnh vực tư vấn
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-fullname">Họ và tên *</Label>
                <Input
                  id="prof-fullname"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-jobtitle">Chức danh / Nghề nghiệp *</Label>
                <Input
                  id="prof-jobtitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="Chuyên gia tư vấn thuế cao cấp"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-company">Đơn vị công tác</Label>
                <Input
                  id="prof-company"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Công ty TNHH Tư vấn Thuế ABC"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-position">Chức vụ hiện tại</Label>
                <Input
                  id="prof-position"
                  value={formData.currentPosition}
                  onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                  placeholder="Trưởng phòng Tư vấn Doanh nghiệp"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-experience">Số năm kinh nghiệm *</Label>
                <Input
                  id="prof-experience"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-bio">Giới thiệu bản thân (Bio)</Label>
              <Textarea
                id="prof-bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Giới thiệu tóm tắt về năng lực chuyên môn, phong cách tư vấn và thành tích nổi bật..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-expdesc">Mô tả chi tiết quá trình công tác & kinh nghiệm *</Label>
              <Textarea
                id="prof-expdesc"
                rows={4}
                value={formData.experienceDescription}
                onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                placeholder="Mô tả các dự án, ca tư vấn quyết toán thuế thu nhập cá nhân/doanh nghiệp tiêu biểu đã thực hiện..."
              />
            </div>

            {/* Specializations Picker */}
            <div className="flex flex-col gap-2">
              <Label>Lĩnh vực chuyên môn tư vấn</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {specializationsList.map((spec) => {
                  const selected = formData.specializationIds.includes(spec.id)
                  return (
                    <div
                      key={spec.id}
                      onClick={() => handleToggleSpec(spec.id)}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                        selected
                          ? 'bg-primary/10 border-primary text-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary/40'
                      }`}
                    >
                      <span>{spec.name}</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {selected ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Fee Proposals configuration */}
            {feeConfigsList.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Đề xuất mức phí tư vấn theo hình thức</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feeConfigsList.map((cfg) => {
                    const session = SESSION_TYPE_MAP[cfg.sessionType] || { label: cfg.sessionType, icon: 'help' }
                    const currentProp = formData.feeProposals.find(
                      (f) => f.sessionType === cfg.sessionType && f.durationMinutes === cfg.durationMinutes
                    )?.proposedFee ?? cfg.minFee

                    return (
                      <div
                        key={cfg.id}
                        className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1 text-on-surface">
                            <span className="material-symbols-outlined text-[16px] text-primary">{session.icon}</span>
                            {session.label} ({cfg.durationMinutes}p)
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            Khung: {formatCurrency(cfg.minFee)} - {formatCurrency(cfg.maxFee)}
                          </span>
                        </div>
                        <Input
                          type="number"
                          min={cfg.minFee}
                          max={cfg.maxFee}
                          step={50000}
                          value={currentProp}
                          onChange={(e) =>
                            handleFeeChange(cfg.sessionType, cfg.durationMinutes, e.target.value)
                          }
                          className="h-10 text-xs font-mono font-bold"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t border-outline-variant/20 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="bg-primary text-on-primary font-bold"
            >
              {submitting ? 'Đang lưu...' : 'Lưu bản nháp'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* Readonly Overview Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="border border-outline-variant/30 shadow-sm">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                  Thông tin chuyên môn
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-surface-container-low">
                  <div>
                    <span className="text-on-surface-variant block">Chức vụ hiện tại:</span>
                    <span className="font-bold text-on-surface">{application?.currentPosition || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Kinh nghiệm:</span>
                    <span className="font-bold text-primary">{application?.yearsOfExperience ?? 0} năm</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Đơn vị công tác:</span>
                    <span className="font-bold text-on-surface">{application?.companyName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Ngày nộp hồ sơ:</span>
                    <span className="font-medium text-on-surface">{formatDate(application?.submittedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-on-surface text-xs uppercase tracking-wider">
                    Giới thiệu bản thân
                  </span>
                  <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {application?.bio || 'Chưa cung cấp phần giới thiệu.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-on-surface text-xs uppercase tracking-wider">
                    Kinh nghiệm & Năng lực tư vấn
                  </span>
                  <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {application?.experienceDescription || 'Chưa cung cấp mô tả kinh nghiệm.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Specializations & Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-outline-variant/30 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-primary">category</span>
                    Lĩnh vực chuyên môn ({application?.specializations?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {application?.specializations?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {application.specializations.map((spec, i) => (
                        <Badge key={spec.id || i} variant="secondary" className="text-xs">
                          {spec.name || spec.specializationName}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant">Chưa chọn lĩnh vực.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-outline-variant/30 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                    Mức phí đề xuất ({application?.feeProposals?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {application?.feeProposals?.length > 0 ? (
                    application.feeProposals.map((fee, i) => {
                      const session = SESSION_TYPE_MAP[fee.sessionType] || { label: fee.sessionType, icon: 'help' }
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low text-xs"
                        >
                          <span className="flex items-center gap-1.5 font-bold text-on-surface">
                            <span className="material-symbols-outlined text-[16px] text-primary">{session.icon}</span>
                            {session.label} ({fee.durationMinutes}p)
                          </span>
                          <span className="font-mono font-extrabold text-amber-800">
                            {formatCurrency(fee.proposedFee)}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-on-surface-variant">Chưa đề xuất mức phí.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Certificates */}
          <div className="flex flex-col gap-6">
            <Card className="border border-outline-variant/30 shadow-sm">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
                  Chứng chỉ hành nghề ({application?.certificates?.length || 0})
                </CardTitle>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUploadCert(true)}
                    className="gap-1 text-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Thêm</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {application?.certificates?.length > 0 ? (
                  application.certificates.map((cert) => {
                    const cstatus = CERT_STATUS_MAP[cert.verificationStatus] || CERT_STATUS_MAP.PendingVerification
                    return (
                      <div
                        key={cert.id}
                        className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest flex flex-col gap-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-on-surface block">{cert.certificateName}</span>
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              Số: {cert.certificateNumber}
                            </span>
                          </div>
                          <Badge variant={cstatus.variant} className="text-[10px] shrink-0">
                            {cstatus.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[11px] text-on-surface-variant">
                          <div>Cơ quan cấp: <b>{cert.issuingAuthority}</b></div>
                          <div>Ngày cấp: <b>{formatDate(cert.issueDate)}</b></div>
                          {cert.hasExpiry && <div>Hạn: <b>{formatDate(cert.expiryDate)}</b></div>}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 mt-1">
                          {cert.fileUrl && (
                            <a
                              href={cert.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5 text-[11px]"
                            >
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              Xem chứng chỉ
                            </a>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => handleDeleteCert(cert.id)}
                              className="text-red-500 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-outline-variant/40 text-center text-on-surface-variant text-xs">
                    Chưa có chứng chỉ hành nghề nào được đính kèm.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Upload Certificate Dialog */}
      <Dialog open={showUploadCert} onOpenChange={setShowUploadCert}>
        <DialogContent as="form" onSubmit={handleUploadCertSubmit}>
          <DialogHeader>
            <DialogTitle>Tải lên chứng chỉ hành nghề</DialogTitle>
            <DialogDescription>
              Đính kèm chứng chỉ CPA, Đại lý thuế, Chứng chỉ hành nghề kế toán để hội đồng thẩm định
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-file">Tệp chứng chỉ (PDF, JPG, PNG) *</Label>
              <Input
                id="cert-file"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setCertForm({ ...certForm, file: e.target.files?.[0] || null })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-name">Tên chứng chỉ *</Label>
              <Input
                id="cert-name"
                value={certForm.certificateName}
                onChange={(e) => setCertForm({ ...certForm, certificateName: e.target.value })}
                placeholder="Chứng chỉ hành nghề dịch vụ làm thủ tục về thuế"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-number">Số hiệu chứng chỉ *</Label>
                <Input
                  id="cert-number"
                  value={certForm.certificateNumber}
                  onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                  placeholder="VD: 1234/TCT"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-authority">Đơn vị cấp *</Label>
                <Input
                  id="cert-authority"
                  value={certForm.issuingAuthority}
                  onChange={(e) => setCertForm({ ...certForm, issuingAuthority: e.target.value })}
                  placeholder="Tổng cục Thuế"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-date">Ngày cấp *</Label>
                <Input
                  id="cert-date"
                  type="date"
                  value={certForm.issueDate}
                  onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-expiry">Hạn sử dụng</Label>
                <Input
                  id="cert-expiry"
                  type="date"
                  disabled={!certForm.hasExpiry}
                  value={certForm.expiryDate}
                  onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-on-surface">
              <input
                type="checkbox"
                checked={certForm.hasExpiry}
                onChange={(e) => setCertForm({ ...certForm, hasExpiry: e.target.checked })}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span>Chứng chỉ có thời hạn hiệu lực</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUploadCert(false)}
              disabled={certUploading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={certUploading}
              className="bg-primary text-on-primary font-bold"
            >
              {certUploading ? 'Đang tải lên...' : 'Tải lên chứng chỉ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
