import { useState, useEffect, useCallback, useRef } from 'react'
import { expertService } from '@/services/expertService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// ═══════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════

const ALL = '__ALL__'

const APPLICATION_STATUS_MAP = {
  Draft: { label: 'Bản nháp', variant: 'muted', icon: 'edit_note' },
  PendingReview: { label: 'Chờ duyệt', variant: 'warning', icon: 'hourglass_top' },
  NeedSupplement: { label: 'Cần bổ sung', variant: 'orange', icon: 'warning' },
  Rejected: { label: 'Từ chối', variant: 'destructive', icon: 'cancel' },
  Approved: { label: 'Đã duyệt', variant: 'success', icon: 'check_circle' },
}

const CERT_STATUS_MAP = {
  PendingVerification: { label: 'Chờ xác minh', variant: 'warning' },
  Verified: { label: 'Hợp lệ', variant: 'success' },
  Rejected: { label: 'Không hợp lệ', variant: 'destructive' },
  Expired: { label: 'Hết hạn', variant: 'muted' },
}

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam' },
  CHAT: { label: 'Nhắn tin', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call' },
}

const REVIEWABLE = ['PendingReview', 'NeedSupplement']

function formatCurrency(val) {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)
}

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? String(d) : dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt)
    ? String(d)
    : dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function extractItems(data) {
  if (Array.isArray(data)) return data
  return data?.items || data?.data || []
}

function Icon({ name, className = 'text-[18px]' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function StatusBadge({ status }) {
  const s = APPLICATION_STATUS_MAP[status] || { label: status || '—', variant: 'outline', icon: 'help' }
  return (
    <Badge variant={s.variant}>
      <Icon name={s.icon} className="text-[14px]" />
      {s.label}
    </Badge>
  )
}

function ActiveBadge({ active }) {
  return <Badge variant={active ? 'success' : 'muted'}>{active ? 'Hoạt động' : 'Vô hiệu'}</Badge>
}

function ErrorAlert({ message, onClose }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
      <Icon name="error" className="text-[20px] mt-0.5" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-red-500 hover:text-red-700 cursor-pointer" aria-label="Đóng">
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}

function LoadingState({ text }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-16 pt-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Icon name={icon} className="text-[48px] text-outline" />
        <p className="text-sm">{text}</p>
      </CardContent>
    </Card>
  )
}

function SectionCard({ icon, title, children, className = '' }) {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-on-surface">
          <Icon name={icon} className="text-[20px] text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="min-w-[140px] text-xs text-on-surface-variant">{label}:</span>
      <span className="text-sm font-medium text-on-surface">{value || '—'}</span>
    </div>
  )
}

function ConfirmDialog({ open, title, description, confirmText = 'Xác nhận', loading, onConfirm, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button variant="destructive" size="sm" disabled={loading} onClick={onConfirm}>
            {loading ? 'Đang xử lý...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function AdminExpertManagementPage() {
  const [activeTab, setActiveTab] = useState('applications')

  return (
    <div className="p-space-xl flex flex-col gap-space-lg">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-container p-space-xl text-on-primary flex flex-col gap-space-xs shadow-md">
        <span className="font-label-sm uppercase tracking-widest text-secondary-fixed font-bold">
          QUẢN LÝ TƯ VẤN CHUYÊN GIA
        </span>
        <h1 className="font-headline-lg text-headline-lg font-bold">Hệ thống Chuyên gia Tư vấn Thuế</h1>
        <p className="font-body-md text-on-primary/80 max-w-xl">
          Quản lý hồ sơ đăng ký chuyên gia, lĩnh vực chuyên môn và cấu hình mức phí tư vấn.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications" id="tab-expert-applications">
            <Icon name="badge" className="text-[20px]" />
            <span className="hidden sm:inline">Hồ sơ chuyên gia</span>
          </TabsTrigger>
          <TabsTrigger value="specializations" id="tab-expert-specializations">
            <Icon name="category" className="text-[20px]" />
            <span className="hidden sm:inline">Lĩnh vực chuyên môn</span>
          </TabsTrigger>
          <TabsTrigger value="fee-configs" id="tab-expert-fee-configs">
            <Icon name="payments" className="text-[20px]" />
            <span className="hidden sm:inline">Cấu hình mức phí</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications"><ApplicationsTab /></TabsContent>
        <TabsContent value="specializations"><SpecializationsTab /></TabsContent>
        <TabsContent value="fee-configs"><FeeConfigsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 1: APPLICATIONS
// ═══════════════════════════════════════════════════════════

function ApplicationsTab() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedApp, setSelectedApp] = useState(null)
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const searchTimeoutRef = useRef(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertService.getApplications({
        status: statusFilter === ALL ? undefined : statusFilter,
        search: searchTerm || undefined,
        page,
        size: 10,
      })
      const items = extractItems(data)
      setApplications(items)
      setTotalPages(data?.totalPages || 1)
      setTotalItems(data?.totalItems ?? data?.totalCount ?? items.length)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách hồ sơ.')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm, page])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), [])

  const handleSearch = (value) => {
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value.trim())
      setPage(1)
    }, 400)
  }

  const handleViewDetail = async (id) => {
    setDetailLoadingId(id)
    setError(null)
    try {
      const data = await expertService.getApplicationById(id)
      setSelectedApp(data)
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết hồ sơ.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  if (selectedApp) {
    return (
      <ApplicationDetail
        app={selectedApp}
        onBack={() => setSelectedApp(null)}
        onRefresh={async () => {
          const updated = await expertService.getApplicationById(selectedApp.id)
          setSelectedApp(updated)
          fetchApplications()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
            <Input
              id="expert-app-search"
              placeholder="Tìm theo tên, mã hồ sơ..."
              onChange={(e) => handleSearch(e.target.value)}
              leftIcon={<Icon name="search" className="text-[20px]" />}
            />
          </div>
          <div className="sm:w-52">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger id="expert-app-status-filter" className="h-11 text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                {Object.entries(APPLICATION_STATUS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button id="expert-app-refresh" onClick={fetchApplications} disabled={loading} className="gap-1">
            <Icon name="refresh" />
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="px-3 py-1 text-xs">Tổng: {totalItems} hồ sơ</Badge>
        <Badge variant="outline" className="px-3 py-1 text-xs">Trang {page}/{totalPages}</Badge>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {loading && <LoadingState text="Đang tải danh sách hồ sơ..." />}

      {!loading && applications.length > 0 && (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mã hồ sơ</TableHead>
                <TableHead>Ứng viên</TableHead>
                <TableHead>Chức danh</TableHead>
                <TableHead className="text-center">KN (năm)</TableHead>
                <TableHead className="text-center">Chứng chỉ</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-center">Ngày gửi</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-xs text-primary font-bold">
                    {app.applicationNumber || app.id?.substring(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {app.avatarUrl ? (
                        <img src={app.avatarUrl} alt={app.fullName} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                          <Icon name="person" className="text-[16px] text-on-primary-container" />
                        </div>
                      )}
                      <span className="text-sm font-bold text-on-surface">{app.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-on-surface-variant max-w-[160px] truncate">{app.jobTitle || '—'}</TableCell>
                  <TableCell className="text-center font-bold text-primary">{app.yearsOfExperience ?? '—'}</TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {app.verifiedCertificateCount ?? 0}/{app.certificateCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center"><StatusBadge status={app.status} /></TableCell>
                  <TableCell className="text-center text-xs text-on-surface-variant">{formatDate(app.submittedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      id={`expert-app-view-${app.id}`}
                      onClick={() => handleViewDetail(app.id)}
                      disabled={detailLoadingId !== null}
                    >
                      {detailLoadingId === app.id ? 'Đang tải...' : 'Xem chi tiết'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <CardFooter className="p-4 border-t border-outline-variant/20 justify-between">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ← Trước
              </Button>
              <span className="text-xs text-on-surface-variant">Trang {page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Sau →
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {!loading && applications.length === 0 && !error && (
        <EmptyState icon="folder_open" text="Không tìm thấy hồ sơ chuyên gia nào." />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// APPLICATION DETAIL VIEW
// ═══════════════════════════════════════════════════════════

function ApplicationDetail({ app, onBack, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [dialog, setDialog] = useState(null) // 'approve' | 'reject' | 'supplement'
  const [certToVerify, setCertToVerify] = useState(null)

  const canReview = REVIEWABLE.includes(app.status)

  const runAction = async (fn, onDone) => {
    setActionLoading(true)
    setActionError(null)
    try {
      await fn()
      onDone?.()
      await onRefresh()
    } catch (err) {
      setActionError(err.message || 'Thao tác thất bại.')
    } finally {
      setActionLoading(false)
    }
  }

  const dialogConfig = {
    approve: {
      title: 'Phê duyệt hồ sơ chuyên gia',
      description: `Phê duyệt hồ sơ của ${app.fullName}? Tài khoản sẽ được nâng quyền thành chuyên gia.`,
      inputLabel: 'Ghi chú (không bắt buộc)',
      required: false,
      confirmText: 'Xác nhận phê duyệt',
      confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      action: (v) => expertService.approveApplication(app.id, v),
    },
    reject: {
      title: 'Từ chối hồ sơ chuyên gia',
      description: `Từ chối hồ sơ của ${app.fullName}?`,
      inputLabel: 'Lý do từ chối (bắt buộc)',
      required: true,
      confirmText: 'Xác nhận từ chối',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      action: (v) => expertService.rejectApplication(app.id, v),
    },
    supplement: {
      title: 'Yêu cầu bổ sung hồ sơ',
      description: `Yêu cầu ${app.fullName} bổ sung thông tin hoặc giấy tờ.`,
      inputLabel: 'Nội dung yêu cầu bổ sung (bắt buộc)',
      required: true,
      confirmText: 'Gửi yêu cầu bổ sung',
      confirmClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      action: (v) => expertService.requestSupplement(app.id, v),
    },
  }

  const current = dialog ? dialogConfig[dialog] : null

  return (
    <div className="flex flex-col gap-space-md">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start gap-1 text-primary" id="expert-detail-back">
        <Icon name="arrow_back" className="text-[20px]" />
        Quay lại danh sách
      </Button>

      <ErrorAlert message={actionError} onClose={() => setActionError(null)} />

      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col md:flex-row gap-6">
          <div className="flex items-start gap-4 flex-1">
            {app.avatarUrl ? (
              <img src={app.avatarUrl} alt={app.fullName} className="w-20 h-20 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary-container flex items-center justify-center shadow-md">
                <Icon name="person" className="text-[36px] text-on-primary-container" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-on-surface">{app.fullName}</h2>
              <p className="text-sm text-on-surface-variant">{app.jobTitle}</p>
              {app.companyName && (
                <p className="text-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="business" className="text-[16px]" />
                  {app.companyName}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={app.status} />
                {app.applicationNumber && (
                  <span className="text-[11px] text-on-surface-variant font-mono">#{app.applicationNumber}</span>
                )}
              </div>
            </div>
          </div>

          {canReview && (
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Button id="expert-approve" size="sm" disabled={actionLoading} onClick={() => setDialog('approve')}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Icon name="check_circle" /> Phê duyệt
              </Button>
              <Button id="expert-reject" size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDialog('reject')} className="gap-1">
                <Icon name="cancel" /> Từ chối
              </Button>
              <Button id="expert-supplement" size="sm" disabled={actionLoading} onClick={() => setDialog('supplement')}
                className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                <Icon name="note_add" /> Yêu cầu bổ sung
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <div className="flex flex-col gap-space-md">
          <SectionCard icon="info" title="Thông tin cá nhân">
            <InfoRow label="Chức vụ hiện tại" value={app.currentPosition} />
            <InfoRow label="Số năm kinh nghiệm" value={app.yearsOfExperience != null ? `${app.yearsOfExperience} năm` : null} />
            <InfoRow label="Ngày tạo hồ sơ" value={formatDateTime(app.createdAt)} />
            <InfoRow label="Ngày gửi" value={formatDateTime(app.submittedAt)} />
            {app.reviewedAt && <InfoRow label="Ngày xét duyệt" value={formatDateTime(app.reviewedAt)} />}
            {app.rejectionReason && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-xs text-red-700 font-bold">Lý do từ chối:</span>
                <p className="text-sm text-red-600 mt-1">{app.rejectionReason}</p>
              </div>
            )}
            {app.supplementRequestReason && (
              <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-xs text-orange-700 font-bold">Yêu cầu bổ sung:</span>
                <p className="text-sm text-orange-600 mt-1">{app.supplementRequestReason}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard icon="work_history" title="Mô tả kinh nghiệm">
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
              {app.experienceDescription || 'Chưa cung cấp mô tả kinh nghiệm.'}
            </p>
          </SectionCard>

          {app.bio && (
            <SectionCard icon="description" title="Giới thiệu bản thân">
              <p className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">{app.bio}</p>
            </SectionCard>
          )}
        </div>

        <div className="flex flex-col gap-space-md">
          <SectionCard icon="category" title={`Lĩnh vực chuyên môn (${app.specializations?.length || 0})`}>
            {app.specializations?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {app.specializations.map((spec, i) => (
                  <Badge key={spec.id || i} variant="secondary" className="px-3 py-1 text-xs text-primary">
                    {spec.name || spec.specializationName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Chưa chọn lĩnh vực chuyên môn.</p>
            )}
          </SectionCard>

          <SectionCard icon="payments" title={`Mức phí đề xuất (${app.feeProposals?.length || 0})`}>
            {app.feeProposals?.length > 0 ? (
              app.feeProposals.map((fee, i) => {
                const s = SESSION_TYPE_MAP[fee.sessionType] || { label: fee.sessionType, icon: 'help' }
                return (
                  <div key={fee.id || i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon name={s.icon} className="text-[18px] text-primary" />
                      <span className="text-sm font-bold">{s.label}</span>
                      <span className="text-[11px] text-on-surface-variant">• {fee.durationMinutes} phút</span>
                    </div>
                    <span className="text-sm text-primary font-bold">{formatCurrency(fee.proposedFee)}</span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-on-surface-variant">Chưa đề xuất mức phí.</p>
            )}
          </SectionCard>

          <SectionCard icon="verified" title={`Chứng chỉ (${app.certificates?.length || 0})`}>
            {app.certificates?.length > 0 ? (
              app.certificates.map((cert) => {
                const cs = CERT_STATUS_MAP[cert.verificationStatus] || CERT_STATUS_MAP.PendingVerification
                return (
                  <div key={cert.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-on-surface">{cert.certificateName}</span>
                        <span className="text-[11px] text-on-surface-variant">{cert.certificateType}</span>
                      </div>
                      <Badge variant={cs.variant}>{cs.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-on-surface-variant">Số chứng chỉ:</span> <b>{cert.certificateNumber || '—'}</b></div>
                      <div><span className="text-on-surface-variant">Cơ quan cấp:</span> <b>{cert.issuingAuthority || '—'}</b></div>
                      <div><span className="text-on-surface-variant">Ngày cấp:</span> <b>{formatDate(cert.issueDate)}</b></div>
                      {cert.hasExpiry && (
                        <div><span className="text-on-surface-variant">Hạn:</span> <b>{formatDate(cert.expiryDate)}</b></div>
                      )}
                    </div>
                    {cert.fileUrl && (
                      <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                        <Icon name="open_in_new" className="text-[14px]" />
                        Xem tệp chứng chỉ
                      </a>
                    )}
                    {cert.verificationNote && (
                      <p className="text-[11px] text-on-surface-variant italic">Ghi chú: {cert.verificationNote}</p>
                    )}
                    {cert.verificationStatus === 'PendingVerification' && canReview && (
                      <Button size="sm" variant="secondary" className="self-start gap-1 mt-1" disabled={actionLoading}
                        onClick={() => setCertToVerify(cert)} id={`expert-cert-verify-${cert.id}`}>
                        <Icon name="fact_check" className="text-[16px]" /> Thẩm định
                      </Button>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-on-surface-variant">Chưa tải lên chứng chỉ.</p>
            )}
          </SectionCard>

          {app.audits?.length > 0 && (
            <SectionCard icon="history" title="Lịch sử xét duyệt">
              {app.audits.map((audit, i) => (
                <div key={audit.id || i} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                  <Icon name="radio_button_checked" className="text-[18px] text-outline mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-on-surface">{audit.action || audit.description}</span>
                    <span className="text-[11px] text-on-surface-variant">{formatDateTime(audit.createdAt || audit.timestamp)}</span>
                    {audit.note && <span className="text-[11px] text-on-surface-variant italic">{audit.note}</span>}
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      </div>

      {current && (
        <ReasonDialog
          key={dialog}
          open
          config={current}
          loading={actionLoading}
          onOpenChange={(o) => !o && setDialog(null)}
          onConfirm={(val) => runAction(() => current.action(val), () => setDialog(null))}
        />
      )}

      {certToVerify && (
        <CertVerifyDialog
          cert={certToVerify}
          loading={actionLoading}
          onOpenChange={(o) => !o && setCertToVerify(null)}
          onVerify={(payload) =>
            runAction(() => expertService.verifyCertificate(app.id, certToVerify.id, payload), () => setCertToVerify(null))
          }
        />
      )}
    </div>
  )
}

function ReasonDialog({ open, config, loading, onConfirm, onOpenChange }) {
  const [value, setValue] = useState('')
  const MIN = 5
  const trimmed = value.trim()
  const isValid = !config.required || trimmed.length >= MIN

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expert-reason-input">{config.inputLabel}</Label>
          <Textarea id="expert-reason-input" rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nhập nội dung..." />
          {config.required && trimmed.length > 0 && trimmed.length < MIN && (
            <span className="text-[11px] text-red-500">Tối thiểu {MIN} ký tự</span>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button size="sm" className={config.confirmClass} disabled={loading || !isValid} onClick={() => onConfirm(trimmed)}>
            {loading ? 'Đang xử lý...' : config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CertVerifyDialog({ cert, loading, onVerify, onOpenChange }) {
  const [status, setStatus] = useState('Verified')
  const [source, setSource] = useState('')
  const [note, setNote] = useState('')

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thẩm định chứng chỉ</DialogTitle>
          <DialogDescription>
            Chứng chỉ: <strong>{cert.certificateName}</strong> ({cert.certificateNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>Kết quả xác minh</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="cert-verify-status" className="h-11 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="Verified">Hợp lệ (Verified)</SelectItem>
              <SelectItem value="Rejected">Không hợp lệ (Rejected)</SelectItem>
              <SelectItem value="Expired">Hết hạn (Expired)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cert-verify-source">Nguồn xác minh</Label>
          <Input id="cert-verify-source" value={source} onChange={(e) => setSource(e.target.value)}
            placeholder="VD: Tra cứu cổng thông tin Tổng cục Thuế..." />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cert-verify-note">Ghi chú</Label>
          <Textarea id="cert-verify-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm..." />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button size="sm" disabled={loading} onClick={() => onVerify({
            verificationStatus: status,
            verificationSource: source.trim() || null,
            verificationNote: note.trim() || null,
          })}>
            {loading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 2: SPECIALIZATIONS
// ═══════════════════════════════════════════════════════════

function SpecializationsTab() {
  const [specializations, setSpecializations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(null) // { item: null | object }
  const [formLoading, setFormLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertService.getSpecializations({ search: search || undefined })
      setSpecializations(extractItems(data))
    } catch (err) {
      setError(err.message || 'Không thể tải lĩnh vực chuyên môn.')
      setSpecializations([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (payload) => {
    setFormLoading(true)
    try {
      if (formState?.item) {
        await expertService.updateSpecialization(formState.item.id, payload)
      } else {
        await expertService.createSpecialization(payload)
      }
      setFormState(null)
      await fetchData()
    } catch (err) {
      return err.message || 'Lưu thất bại.'
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await expertService.deleteSpecialization(deleteTarget.id)
      setDeleteTarget(null)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Xóa thất bại.')
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
            <Input id="spec-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm lĩnh vực..." leftIcon={<Icon name="search" className="text-[20px]" />} />
          </div>
          <Button id="spec-add" onClick={() => setFormState({ item: null })} className="gap-1">
            <Icon name="add" /> Thêm lĩnh vực
          </Button>
        </CardContent>
      </Card>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {loading && <LoadingState text="Đang tải danh sách lĩnh vực..." />}

      {!loading && specializations.length > 0 && (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mã</TableHead>
                <TableHead>Tên lĩnh vực</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specializations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-primary font-bold">{item.code}</TableCell>
                  <TableCell className="text-sm font-bold text-on-surface">{item.name}</TableCell>
                  <TableCell className="text-sm text-on-surface-variant max-w-[280px] truncate">{item.description || '—'}</TableCell>
                  <TableCell className="text-center"><ActiveBadge active={item.isActive} /></TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setFormState({ item })} id={`spec-edit-${item.id}`}>Sửa</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(item)} id={`spec-delete-${item.id}`}>Xóa</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!loading && specializations.length === 0 && !error && (
        <EmptyState icon="category" text="Chưa có lĩnh vực chuyên môn nào." />
      )}

      {formState && (
        <SpecializationFormDialog
          editItem={formState.item}
          loading={formLoading}
          onSave={handleSave}
          onOpenChange={(o) => !o && setFormState(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa lĩnh vực chuyên môn"
        description={deleteTarget ? `Bạn có chắc chắn muốn xóa "${deleteTarget.name}"?` : ''}
        confirmText="Xóa"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      />
    </div>
  )
}

function SpecializationFormDialog({ editItem, loading, onSave, onOpenChange }) {
  const [code, setCode] = useState(editItem?.code || '')
  const [name, setName] = useState(editItem?.name || '')
  const [description, setDescription] = useState(editItem?.description || '')
  const [isActive, setIsActive] = useState(editItem?.isActive ?? true)
  const [formError, setFormError] = useState(null)

  const isValid = code.trim().length >= 2 && name.trim().length >= 2

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setFormError(null)
    const payload = { name: name.trim(), description: description.trim() || null, isActive }
    if (!editItem) payload.code = code.trim().toUpperCase()
    const err = await onSave(payload)
    if (err) setFormError(err)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent as="form" onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{editItem ? 'Chỉnh sửa lĩnh vực' : 'Thêm lĩnh vực mới'}</DialogTitle>
          <DialogDescription>Lĩnh vực hiển thị cho ứng viên khi đăng ký làm chuyên gia.</DialogDescription>
        </DialogHeader>

        <ErrorAlert message={formError} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-code">Mã lĩnh vực</Label>
          <Input id="spec-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!editItem} placeholder="VD: TAX_AGENT" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-name">Tên lĩnh vực</Label>
          <Input id="spec-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Đại lý thuế" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-desc">Mô tả</Label>
          <Textarea id="spec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả lĩnh vực chuyên môn..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
          <Checkbox id="spec-active" checked={isActive} onCheckedChange={setIsActive} />
          Kích hoạt (hiển thị cho ứng viên)
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" size="sm" disabled={loading || !isValid} id="spec-submit">
            {loading ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 3: FEE CONFIGS
// ═══════════════════════════════════════════════════════════

function FeeConfigsTab() {
  const [feeConfigs, setFeeConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sessionFilter, setSessionFilter] = useState(ALL)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertService.getFeeConfigs({
        sessionType: sessionFilter === ALL ? undefined : sessionFilter,
      })
      setFeeConfigs(extractItems(data))
    } catch (err) {
      setError(err.message || 'Không thể tải cấu hình mức phí.')
      setFeeConfigs([])
    } finally {
      setLoading(false)
    }
  }, [sessionFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (payload) => {
    setFormLoading(true)
    try {
      if (formState?.item) {
        await expertService.updateFeeConfig(formState.item.id, payload)
      } else {
        await expertService.createFeeConfig(payload)
      }
      setFormState(null)
      await fetchData()
    } catch (err) {
      return err.message || 'Lưu thất bại.'
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await expertService.deleteFeeConfig(deleteTarget.id)
      setDeleteTarget(null)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Xóa thất bại.')
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="sm:w-60">
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger id="fee-session-filter" className="h-11 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả hình thức</SelectItem>
                {Object.entries(SESSION_TYPE_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button id="fee-add" onClick={() => setFormState({ item: null })} className="gap-1">
            <Icon name="add" /> Thêm cấu hình
          </Button>
        </CardContent>
      </Card>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {loading && <LoadingState text="Đang tải cấu hình mức phí..." />}

      {!loading && feeConfigs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {feeConfigs.map((item) => {
            const s = SESSION_TYPE_MAP[item.sessionType] || { label: item.sessionType, icon: 'help' }
            return (
              <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/40 flex items-center justify-center">
                      <Icon name={s.icon} className="text-[22px] text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-on-surface">{s.label}</CardTitle>
                      <CardDescription className="text-xs">{item.durationMinutes} phút</CardDescription>
                    </div>
                  </div>
                  <ActiveBadge active={item.isActive} />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Phí sàn</span>
                    <span className="text-sm text-primary font-bold">{formatCurrency(item.minFee)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Phí trần</span>
                    <span className="text-sm text-primary font-bold">{formatCurrency(item.maxFee)}</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setFormState({ item })} id={`fee-edit-${item.id}`}>
                    Chỉnh sửa
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(item)} id={`fee-delete-${item.id}`}>
                    Xóa
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && feeConfigs.length === 0 && !error && (
        <EmptyState icon="payments" text="Chưa có cấu hình mức phí nào." />
      )}

      {formState && (
        <FeeConfigFormDialog
          editItem={formState.item}
          loading={formLoading}
          onSave={handleSave}
          onOpenChange={(o) => !o && setFormState(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa cấu hình mức phí"
        description={deleteTarget
          ? `Xóa cấu hình ${SESSION_TYPE_MAP[deleteTarget.sessionType]?.label || deleteTarget.sessionType} - ${deleteTarget.durationMinutes} phút?`
          : ''}
        confirmText="Xóa"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      />
    </div>
  )
}

function FeeConfigFormDialog({ editItem, loading, onSave, onOpenChange }) {
  const [sessionType, setSessionType] = useState(editItem?.sessionType || 'ONLINE_MEETING')
  const [durationMinutes, setDurationMinutes] = useState(editItem?.durationMinutes ?? 60)
  const [minFee, setMinFee] = useState(editItem?.minFee ?? 0)
  const [maxFee, setMaxFee] = useState(editItem?.maxFee ?? 0)
  const [isActive, setIsActive] = useState(editItem?.isActive ?? true)
  const [formError, setFormError] = useState(null)

  const d = Number(durationMinutes)
  const min = Number(minFee)
  const max = Number(maxFee)
  const rangeError = min > max ? 'Phí sàn không được lớn hơn phí trần.' : null
  const isValid = d >= 15 && d <= 240 && min >= 0 && max >= 0 && !rangeError

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setFormError(null)
    const err = await onSave({ sessionType, durationMinutes: d, minFee: min, maxFee: max, isActive })
    if (err) setFormError(err)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent as="form" onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{editItem ? 'Chỉnh sửa mức phí' : 'Thêm mức phí mới'}</DialogTitle>
          <DialogDescription>Khung phí sàn/trần áp dụng cho đề xuất phí của chuyên gia.</DialogDescription>
        </DialogHeader>

        <ErrorAlert message={formError} />

        <div className="flex flex-col gap-2">
          <Label>Hình thức tư vấn</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger id="fee-session-type" className="h-11 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[110]">
              {Object.entries(SESSION_TYPE_MAP).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fee-duration">Thời lượng (phút)</Label>
          <Input id="fee-duration" type="number" min={15} max={240} value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)} />
          {(d < 15 || d > 240) && <span className="text-[11px] text-red-500">Thời lượng từ 15 đến 240 phút</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fee-min">Phí sàn (VNĐ)</Label>
            <Input id="fee-min" type="number" min={0} max={100000000} value={minFee} onChange={(e) => setMinFee(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fee-max">Phí trần (VNĐ)</Label>
            <Input id="fee-max" type="number" min={0} max={100000000} value={maxFee} onChange={(e) => setMaxFee(e.target.value)} />
          </div>
        </div>
        {rangeError && <span className="text-[11px] text-red-500 -mt-2">{rangeError}</span>}

        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
          <Checkbox id="fee-active" checked={isActive} onCheckedChange={setIsActive} />
          Kích hoạt
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" size="sm" disabled={loading || !isValid} id="fee-submit">
            {loading ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
