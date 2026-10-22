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
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NotificationDialog, ConfirmDialog } from '@/components/ui/notification-dialog'

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
  CHAT: { label: 'Nhắn tin tư vấn', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại trực tiếp', icon: 'call' },
}

const CERT_TYPE_MAP = {
  TAX_AGENT: 'Chứng chỉ hành nghề đại lý thuế',
  CPA: 'Chứng chỉ kiểm toán viên',
  ACCOUNTANT: 'Chứng chỉ hành nghề kế toán',
  CHIEF_ACCOUNTANT: 'Chứng chỉ kế toán trưởng',
  OTHER: 'Chứng chỉ chuyên môn liên quan',
}

const ESCROW_STATUS_MAP = {
  PendingPayment: { label: 'Chờ thanh toán', variant: 'warning' },
  HeldInEscrow: { label: 'Đang giữ cọc', variant: 'success' },
  CoolingDown: { label: 'Chờ hoàn tất (24h)', variant: 'orange' },
  Settled: { label: 'Đã trả chuyên gia', variant: 'default' },
  Refunded: { label: 'Đã hoàn 100%', variant: 'muted' },
  PartiallyRefunded: { label: 'Hoàn một phần', variant: 'orange' },
  Cancelled: { label: 'Đã hủy', variant: 'destructive' },
}

const AUDIT_ACTION_MAP = {
  DRAFT_CREATED: 'Khởi tạo hồ sơ',
  DRAFT_SAVED: 'Lưu bản nháp hồ sơ',
  SUBMITTED: 'Nộp hồ sơ xét duyệt',
  UNDER_REVIEW: 'Hội đồng tiếp nhận thẩm định',
  SUPPLEMENT_REQUESTED: 'Yêu cầu bổ sung thông tin/chứng chỉ',
  SUPPLEMENT_SUBMITTED: 'Đã nộp bổ sung hồ sơ',
  APPROVED: 'Phê duyệt hồ sơ chính thức',
  REJECTED: 'Từ chối hồ sơ',
  CERTIFICATE_VERIFIED: 'Thẩm định chứng chỉ: Hợp lệ',
  CERTIFICATE_REJECTED: 'Thẩm định chứng chỉ: Không hợp lệ',
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

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function AdminExpertManagementPage() {
  const [activeTab, setActiveTab] = useState('applications')

  return (
    <div className="p-space-xl flex flex-col gap-space-lg">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-container p-space-xl text-on-primary flex flex-col gap-space-xs shadow-md">
        <span className="font-label-sm uppercase tracking-widest text-secondary-fixed font-bold">
          QUẢN LÝ DỊCH VỤ TƯ VẤN
        </span>
        <h1 className="font-headline-lg text-headline-lg font-bold">Quản lý Chuyên gia Tư vấn Thuế</h1>
        <p className="font-body-md text-on-primary/80 max-w-xl">
          Duyệt hồ sơ hành nghề, xét duyệt rút tiền, giải quyết khiếu nại, quản lý lĩnh vực tư vấn và biểu phí.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="applications" id="tab-expert-applications">
            <Icon name="badge" className="text-[20px]" />
            <span className="hidden sm:inline">Hồ sơ chuyên gia</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawals" id="tab-expert-withdrawals">
            <Icon name="payments" className="text-[20px]" />
            <span className="hidden sm:inline">Duyệt rút tiền</span>
          </TabsTrigger>
          <TabsTrigger value="disputes" id="tab-expert-disputes">
            <Icon name="gavel" className="text-[20px]" />
            <span className="hidden sm:inline">Giải quyết khiếu nại</span>
          </TabsTrigger>
          <TabsTrigger value="specializations" id="tab-expert-specializations">
            <Icon name="category" className="text-[20px]" />
            <span className="hidden sm:inline">Lĩnh vực chuyên môn</span>
          </TabsTrigger>
          <TabsTrigger value="fee-configs" id="tab-expert-fee-configs">
            <Icon name="price_change" className="text-[20px]" />
            <span className="hidden sm:inline">Khung mức phí</span>
          </TabsTrigger>
          <TabsTrigger value="escrow-wallet" id="tab-expert-escrow-wallet">
            <Icon name="account_balance_wallet" className="text-[20px]" />
            <span className="hidden sm:inline">Ví sàn & Tiền cọc</span>
          </TabsTrigger>
          <TabsTrigger value="platform-policy" id="tab-expert-platform-policy">
            <Icon name="tune" className="text-[20px]" />
            <span className="hidden sm:inline">Chính sách & Biểu phí</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications"><ApplicationsTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
        <TabsContent value="disputes"><DisputesTab /></TabsContent>
        <TabsContent value="specializations"><SpecializationsTab /></TabsContent>
        <TabsContent value="fee-configs"><FeeConfigsTab /></TabsContent>
        <TabsContent value="escrow-wallet"><PlatformWalletTab /></TabsContent>
        <TabsContent value="platform-policy"><PlatformPolicyTab /></TabsContent>
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
                <TableHead>Họ tên chuyên gia</TableHead>
                <TableHead>Chức danh nghề nghiệp</TableHead>
                <TableHead className="text-center">Kinh nghiệm</TableHead>
                <TableHead className="text-center">Chứng chỉ hợp lệ</TableHead>
                <TableHead className="text-center">Trạng thái hồ sơ</TableHead>
                <TableHead className="text-center">Ngày gửi</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-xs text-primary font-bold">
                    {app.applicationNumber || `#HS-${(app.id || '').substring(0, 6).toUpperCase()}`}
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
                  <TableCell className="text-center font-bold text-primary">
                    {app.yearsOfExperience != null ? `${app.yearsOfExperience} năm` : '—'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {app.verifiedCertificateCount ?? 0} / {app.certificateCount ?? 0}
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
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const canReview = REVIEWABLE.includes(app.status)

  const runAction = async (fn, onDone, successTitle, successDesc) => {
    setActionLoading(true)
    setActionError(null)
    try {
      await fn()
      onDone?.()
      if (successTitle) {
        setNotice({
          open: true,
          type: 'success',
          title: successTitle,
          description: successDesc,
        })
      }
      await onRefresh()
    } catch (err) {
      const msg = err.message || 'Thao tác không thành công.'
      setActionError(msg)
      setNotice({
        open: true,
        type: 'error',
        title: 'Thao tác thất bại',
        description: msg,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const dialogConfig = {
    approve: {
      title: 'Phê duyệt hồ sơ chuyên gia',
      description: `Bạn có chắc chắn muốn phê duyệt hồ sơ của ${app.fullName}? Tài khoản người dùng sẽ được nâng cấp thành Chuyên gia tư vấn thuế chính thức trên hệ thống.`,
      inputLabel: 'Ghi chú xét duyệt (không bắt buộc)',
      required: false,
      confirmText: 'Xác nhận phê duyệt',
      confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
      successTitle: 'Phê duyệt hồ sơ thành công',
      successDesc: `Đã phê duyệt hồ sơ chuyên gia cho ${app.fullName}. Tài khoản đã được cấp quyền Chuyên gia tư vấn.`,
      action: (v) => expertService.approveApplication(app.id, v),
    },
    reject: {
      title: 'Từ chối hồ sơ chuyên gia',
      description: `Bạn có chắc chắn muốn từ chối hồ sơ của ${app.fullName}? Vui lòng nêu rõ lý do để thông báo phản hồi cho ứng viên.`,
      inputLabel: 'Lý do từ chối hồ sơ (bắt buộc, tối thiểu 5 ký tự)',
      required: true,
      confirmText: 'Xác nhận từ chối',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white font-bold',
      successTitle: 'Đã từ chối hồ sơ',
      successDesc: `Đã gửi thông báo từ chối hồ sơ kèm lý do đến ứng viên ${app.fullName}.`,
      action: (v) => expertService.rejectApplication(app.id, v),
    },
    supplement: {
      title: 'Yêu cầu bổ sung hồ sơ',
      description: `Gửi yêu cầu bổ sung thông tin hoặc giấy tờ chứng chỉ hành nghề đến ứng viên ${app.fullName}.`,
      inputLabel: 'Nội dung yêu cầu bổ sung (bắt buộc, tối thiểu 5 ký tự)',
      required: true,
      confirmText: 'Gửi yêu cầu bổ sung',
      confirmClass: 'bg-orange-500 hover:bg-orange-600 text-white font-bold',
      successTitle: 'Đã gửi yêu cầu bổ sung',
      successDesc: `Hồ sơ đã chuyển sang trạng thái Cần bổ sung và gửi thông báo đến ứng viên ${app.fullName}.`,
      action: (v) => expertService.requestSupplement(app.id, v),
    },
  }

  const current = dialog ? dialogConfig[dialog] : null

  return (
    <div className="flex flex-col gap-space-md">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start gap-1 text-primary font-bold" id="expert-detail-back">
        <Icon name="arrow_back" className="text-[20px]" />
        Quay lại danh sách hồ sơ
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
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <Icon name="check_circle" /> Phê duyệt hồ sơ
              </Button>
              <Button id="expert-reject" size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDialog('reject')} className="gap-1 font-bold">
                <Icon name="cancel" /> Từ chối hồ sơ
              </Button>
              <Button id="expert-supplement" size="sm" disabled={actionLoading} onClick={() => setDialog('supplement')}
                className="gap-1 bg-orange-500 hover:bg-orange-600 text-white font-bold">
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
                        <span className="text-[11px] text-on-surface-variant">{CERT_TYPE_MAP[cert.certificateType] || cert.certificateType}</span>
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
                      <Button size="sm" variant="secondary" className="self-start gap-1 mt-1 font-bold" disabled={actionLoading}
                        onClick={() => setCertToVerify(cert)} id={`expert-cert-verify-${cert.id}`}>
                        <Icon name="fact_check" className="text-[16px]" /> Thẩm định chứng chỉ
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
                    <span className="text-sm font-bold text-on-surface">{AUDIT_ACTION_MAP[audit.action] || audit.action || audit.description || 'Thao tác xét duyệt'}</span>
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
          onConfirm={(val) =>
            runAction(
              () => current.action(val),
              () => setDialog(null),
              current.successTitle,
              current.successDesc
            )
          }
        />
      )}

      {certToVerify && (
        <CertVerifyDialog
          cert={certToVerify}
          loading={actionLoading}
          onOpenChange={(o) => !o && setCertToVerify(null)}
          onVerify={(payload) =>
            runAction(
              () => expertService.verifyCertificate(app.id, certToVerify.id, payload),
              () => setCertToVerify(null),
              'Thẩm định chứng chỉ thành công',
              'Đã cập nhật kết quả thẩm định cho chứng chỉ hành nghề.'
            )
          }
        />
      )}

      {/* Thông báo kết quả thao tác */}
      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />
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
          <DialogTitle>Thẩm định chứng chỉ hành nghề</DialogTitle>
          <DialogDescription>
            Chứng chỉ: <strong>{cert.certificateName}</strong> (Số: {cert.certificateNumber || '—'})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>Kết quả thẩm định</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="cert-verify-status" className="h-11 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="Verified">Hợp lệ</SelectItem>
              <SelectItem value="Rejected">Không hợp lệ</SelectItem>
              <SelectItem value="Expired">Đã hết hạn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cert-verify-source">Nguồn đối soát xác minh</Label>
          <Input id="cert-verify-source" value={source} onChange={(e) => setSource(e.target.value)}
            placeholder="Ví dụ: Tra cứu tại Cổng thông tin Tổng cục Thuế..." />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cert-verify-note">Ghi chú thẩm định</Label>
          <Textarea id="cert-verify-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú chi tiết kết quả thẩm định..." />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button size="sm" disabled={loading} onClick={() => onVerify({
            verificationStatus: status,
            verificationSource: source.trim() || null,
            verificationNote: note.trim() || null,
          })} className="bg-primary text-on-primary font-bold">
            {loading ? 'Đang xử lý...' : 'Xác nhận kết quả thẩm định'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB: XÉT DUYỆT RÚT TIỀN (WITHDRAWALS)
// ═══════════════════════════════════════════════════════════

const WITHDRAWAL_STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt', variant: 'warning', icon: 'hourglass_top' },
  APPROVE: { label: 'Đã chuyển tiền', variant: 'success', icon: 'check_circle' },
  APPROVED: { label: 'Đã chuyển tiền', variant: 'success', icon: 'check_circle' },
  REJECT: { label: 'Đã từ chối', variant: 'destructive', icon: 'cancel' },
  REJECTED: { label: 'Đã từ chối', variant: 'destructive', icon: 'cancel' },
}

function WithdrawalStatusBadge({ status }) {
  const s = WITHDRAWAL_STATUS_MAP[status] || { label: status || '—', variant: 'outline', icon: 'help' }
  return (
    <Badge variant={s.variant} className="gap-1 inline-flex items-center">
      <Icon name={s.icon} className="text-[13px]" />
      <span>{s.label}</span>
    </Badge>
  )
}

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Dialog duyệt / từ chối
  const [actionModal, setActionModal] = useState(null) // { type: 'APPROVE' | 'REJECT', item }
  const [transactionReference, setTransactionReference] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await expertService.getAdminWithdrawals({
        status: statusFilter === ALL ? undefined : statusFilter,
        page,
        size: 10,
      })
      const items = extractItems(res)
      setWithdrawals(items)
      const pagination = res?.pagination || res?.data?.pagination
      setTotalPages(pagination?.totalPages || res?.totalPages || 1)
      setTotalItems(pagination?.totalItems ?? res?.totalItems ?? items.length)
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách yêu cầu rút tiền.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const openApproveModal = (item) => {
    setActionModal({ type: 'APPROVE', item })
    setTransactionReference('')
    setAdminNotes('')
  }

  const openRejectModal = (item) => {
    setActionModal({ type: 'REJECT', item })
    setRejectionReason('')
    setAdminNotes('')
  }

  const handleProcessSubmit = async (e) => {
    e.preventDefault()
    if (!actionModal?.item) return

    const isApprove = actionModal.type === 'APPROVE'
    if (isApprove && !transactionReference.trim()) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập mã giao dịch ngân hàng hoặc số ủy nhiệm chi đã chuyển khoản.',
      })
      return
    }

    if (!isApprove && !rejectionReason.trim()) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập lý do từ chối để thông báo cho người yêu cầu.',
      })
      return
    }

    setActionLoading(true)
    try {
      await expertService.processWithdrawal(actionModal.item.id, {
        action: actionModal.type,
        transactionReference: isApprove ? transactionReference.trim() : undefined,
        rejectionReason: !isApprove ? rejectionReason.trim() : undefined,
        adminNotes: adminNotes.trim() || undefined,
      })

      setActionModal(null)
      setNotice({
        open: true,
        type: 'success',
        title: isApprove ? 'Duyệt thành công' : 'Đã từ chối',
        description: isApprove
          ? 'Đã ghi nhận chuyển tiền thành công.'
          : 'Đã từ chối lệnh rút tiền và hoàn trả số tiền về ví người nhận.',
      })
      fetchWithdrawals()
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Xử lý thất bại',
        description: err?.message || 'Đã có lỗi xảy ra khi xử lý yêu cầu.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Thẻ thống kê trạng thái nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'PENDING' ? 'border-l-amber-500 bg-amber-50/40 shadow-md ring-1 ring-amber-400' : 'border-l-amber-500 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('PENDING'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <Icon name="hourglass_top" className="text-amber-600 text-[18px]" />
              Yêu cầu chờ duyệt
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700">
              {statusFilter === 'PENDING' ? totalItems : 'Xem danh sách'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Các yêu cầu đang chờ quản trị viên chuyển khoản và xác nhận.
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'APPROVED' ? 'border-l-emerald-600 bg-emerald-50/40 shadow-md ring-1 ring-emerald-400' : 'border-l-emerald-600 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('APPROVED'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Icon name="check_circle" className="text-emerald-600 text-[18px]" />
              Đã chuyển tiền
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              {statusFilter === 'APPROVED' ? totalItems : 'Xem lịch sử'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Các lệnh rút tiền đã được chuyển khoản thành công qua ngân hàng.
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'REJECTED' ? 'border-l-red-500 bg-red-50/40 shadow-md ring-1 ring-red-400' : 'border-l-red-500 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('REJECTED'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
              <Icon name="cancel" className="text-red-500 text-[18px]" />
              Đã từ chối
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">
              {statusFilter === 'REJECTED' ? totalItems : 'Xem danh sách'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Các lệnh không hợp lệ đã được hoàn trả số dư về ví.
          </CardContent>
        </Card>
      </div>

      {/* Bảng danh sách yêu cầu rút tiền */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon name="account_balance" className="text-primary text-[22px]" />
              Danh sách yêu cầu rút tiền
            </CardTitle>
            <CardDescription className="text-xs">
              Kiểm tra thông tin tài khoản ngân hàng của người dùng/chuyên gia để thực hiện chuyển khoản và xác nhận.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã chuyển tiền</SelectItem>
                <SelectItem value="REJECTED">Đã từ chối</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchWithdrawals} title="Làm mới">
              <Icon name="refresh" className="text-[18px]" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <LoadingState text="Đang tải danh sách yêu cầu rút tiền..." />
          ) : withdrawals.length === 0 ? (
            <EmptyState icon="savings" text="Không có yêu cầu rút tiền nào." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày gửi</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead className="text-right">Số tiền rút</TableHead>
                    <TableHead>Tài khoản nhận tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Chi tiết xử lý</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((item) => (
                    <TableRow key={item.id} className="hover:bg-surface-container-lowest">
                      <TableCell className="text-xs text-on-surface-variant font-mono whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm text-on-surface block">
                          {item.userFullName || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-bold text-sm text-primary">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-on-surface">{item.bankName || '—'}</div>
                        <div className="font-mono text-primary font-semibold">{item.accountNumber || '—'}</div>
                        <div className="text-on-surface-variant uppercase text-[11px]">{item.accountName || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <WithdrawalStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {item.status === 'APPROVED' || item.status === 'APPROVE' ? (
                          <div className="space-y-0.5">
                            <div className="text-emerald-700 font-medium">
                              Mã GD: <span className="font-mono font-bold">{item.transactionReference || '—'}</span>
                            </div>
                            {item.processedAt && (
                              <div className="text-[11px] text-on-surface-variant">
                                Lúc: {formatDateTime(item.processedAt)}
                              </div>
                            )}
                            {item.adminNotes && (
                              <div className="text-[11px] text-on-surface-variant italic">
                                Ghi chú: {item.adminNotes}
                              </div>
                            )}
                          </div>
                        ) : item.status === 'REJECTED' || item.status === 'REJECT' ? (
                          <div className="space-y-0.5">
                            <div className="text-red-700 font-medium">
                              Lý do: {item.rejectionReason || '—'}
                            </div>
                            {item.adminNotes && (
                              <div className="text-[11px] text-on-surface-variant italic">
                                Ghi chú: {item.adminNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant italic text-[11px]">
                            Đang chờ chuyển tiền
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1"
                              onClick={() => openApproveModal(item)}
                            >
                              <Icon name="check" className="text-[16px]" />
                              Duyệt chuyển tiền
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs h-8 gap-1"
                              onClick={() => openRejectModal(item)}
                            >
                              <Icon name="close" className="text-[16px]" />
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant font-medium">Đã hoàn tất</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t text-xs text-on-surface-variant">
              <span>Trang {page} / {totalPages} (Tổng số {totalItems} yêu cầu)</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hộp thoại Duyệt chuyển tiền */}
      <Dialog
        open={actionModal?.type === 'APPROVE'}
        onOpenChange={(open) => !open && setActionModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Icon name="payments" className="text-[22px]" />
              Xác nhận Đã Chuyển Tiền
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vui lòng chuyển khoản ngân hàng theo thông tin bên dưới, sau đó nhập mã giao dịch để hoàn tất duyệt lệnh rút tiền.
            </DialogDescription>
          </DialogHeader>

          {actionModal?.item && (
            <div className="flex flex-col gap-3 py-2">
              <div className="rounded-xl bg-surface-container-low p-3.5 border border-outline-variant space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Người nhận:</span>
                  <strong className="text-on-surface text-sm">{actionModal.item.userFullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Số tiền cần chuyển:</span>
                  <strong className="text-emerald-700 text-base">{formatCurrency(actionModal.item.amount)}</strong>
                </div>
                <div className="border-t border-outline-variant/30 my-1 pt-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Ngân hàng:</span>
                    <span className="font-semibold text-on-surface">{actionModal.item.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Số tài khoản:</span>
                    <span className="font-mono font-bold text-primary text-sm">{actionModal.item.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tên chủ tài khoản:</span>
                    <span className="font-bold text-on-surface uppercase">{actionModal.item.accountName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Mã giao dịch ngân hàng / Ủy nhiệm chi <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ví dụ: FT24102209876543 hoặc mã UNC..."
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="h-9 text-xs font-mono"
                  autoFocus
                />
                <span className="text-[11px] text-on-surface-variant">
                  Nhập mã tham chiếu từ ứng dụng ngân hàng khi bạn chuyển tiền thành công.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">Ghi chú nội bộ</Label>
                <Textarea
                  placeholder="Ghi chú thêm nếu cần..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
              onClick={handleProcessSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? 'Đang xác nhận...' : 'Xác nhận Đã Chuyển Tiền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại Từ chối */}
      <Dialog
        open={actionModal?.type === 'REJECT'}
        onOpenChange={(open) => !open && setActionModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Icon name="cancel" className="text-[22px]" />
              Từ chối Yêu cầu Rút tiền
            </DialogTitle>
            <DialogDescription className="text-xs">
              Số tiền yêu cầu sẽ được tự động hoàn trả đầy đủ về ví của người nhận.
            </DialogDescription>
          </DialogHeader>

          {actionModal?.item && (
            <div className="flex flex-col gap-3 py-2">
              <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs text-red-900 space-y-1">
                <div className="flex justify-between">
                  <span>Người yêu cầu:</span>
                  <strong>{actionModal.item.userFullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Số tiền hoàn trả về ví:</span>
                  <strong className="text-red-700 text-sm">{formatCurrency(actionModal.item.amount)}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Lý do từ chối <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Ví dụ: Tên tài khoản ngân hàng không khớp với họ tên đăng ký, số tài khoản không tồn tại..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs min-h-[80px]"
                  autoFocus
                />
                <span className="text-[11px] text-on-surface-variant">
                  Lý do này sẽ được hiển thị cho người nhận biết.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">Ghi chú nội bộ</Label>
                <Textarea
                  placeholder="Ghi chú thêm nếu cần..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="text-xs min-h-[50px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="font-semibold"
              onClick={handleProcessSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? 'Đang xử lý...' : 'Xác nhận Từ Chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB: GIẢI QUYẾT KHIẾU NẠI (DISPUTES)
// ═══════════════════════════════════════════════════════════

const DISPUTE_REASON_MAP = {
  WRONG_TAX_LAW_ADVICE: 'Tư vấn sai quy định thuế',
  UNPROFESSIONAL_BEHAVIOR: 'Thái độ thiếu chuẩn mực',
  EARLY_DISCONNECT: 'Chuyên gia rời phòng sớm',
  NETWORK_ISSUE: 'Sự cố kết nối từ chuyên gia',
  OTHER: 'Lý do khác',
}

const DISPUTE_STATUS_MAP = {
  PENDING_EXPERT_RESPONSE: { label: 'Chờ chuyên gia giải trình', variant: 'warning', icon: 'hourglass_top' },
  PENDING_ADMIN_REVIEW: { label: 'Chờ quản trị viên xử lý', variant: 'orange', icon: 'gavel' },
  RESOLVED: { label: 'Đã giải quyết', variant: 'success', icon: 'check_circle' },
  CANCELLED: { label: 'Đã hủy', variant: 'muted', icon: 'cancel' },
}

function DisputeStatusBadge({ status }) {
  const s = DISPUTE_STATUS_MAP[status] || { label: status || '—', variant: 'outline', icon: 'help' }
  return (
    <Badge variant={s.variant} className="gap-1 inline-flex items-center">
      <Icon name={s.icon} className="text-[13px]" />
      <span>{s.label}</span>
    </Badge>
  )
}

function DisputesTab() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('PENDING_ADMIN_REVIEW')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Chi tiết & phán quyết
  const [selectedDisputeId, setSelectedDisputeId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  // Form phán quyết
  const [decisionType, setDecisionType] = useState('FULL_REFUND') // FULL_REFUND | SETTLE_EXPERT | PARTIAL
  const [refundRatePercent, setRefundRatePercent] = useState('50')
  const [resolution, setResolution] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await expertService.getAdminDisputes({
        status: statusFilter === ALL ? undefined : statusFilter,
        page,
        size: 10,
      })
      const items = extractItems(res)
      setDisputes(items)
      const pagination = res?.pagination || res?.data?.pagination
      setTotalPages(pagination?.totalPages || res?.totalPages || 1)
      setTotalItems(pagination?.totalItems ?? res?.totalItems ?? items.length)
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách khiếu nại.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const openDetailModal = async (id) => {
    setSelectedDisputeId(id)
    setDetail(null)
    setDetailLoading(true)
    setDecisionType('FULL_REFUND')
    setRefundRatePercent('50')
    setResolution('')
    setAdminNotes('')
    try {
      const data = await expertService.getDisputeDetail(id)
      setDetail(data)
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Lỗi tải hồ sơ',
        description: err?.message || 'Không thể tải chi tiết vụ việc khiếu nại.',
      })
      setSelectedDisputeId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleResolveSubmit = async (e) => {
    e.preventDefault()
    if (!detail) return

    if (!resolution.trim()) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Thiếu lý do phán quyết',
        description: 'Vui lòng nhập nội dung giải thích căn cứ phán quyết để thông báo cho hai bên.',
      })
      return
    }

    if (decisionType === 'PARTIAL') {
      const rate = Number(refundRatePercent)
      if (isNaN(rate) || rate <= 0 || rate >= 100) {
        setNotice({
          open: true,
          type: 'error',
          title: 'Tỷ lệ không hợp lệ',
          description: 'Tỷ lệ hoàn tiền cho khách phải nằm trong khoảng từ 1% đến 99%.',
        })
        return
      }
    }

    setResolveLoading(true)
    try {
      await expertService.resolveDispute(detail.id, {
        decisionType,
        refundRatePercent: decisionType === 'PARTIAL' ? Number(refundRatePercent) : undefined,
        resolution: resolution.trim(),
        adminNotes: adminNotes.trim() || undefined,
      })

      setNotice({
        open: true,
        type: 'success',
        title: 'Phán quyết thành công',
        description: 'Đã hoàn tất xử lý tranh chấp và tự động điều chuyển số dư ví cho hai bên.',
      })
      setSelectedDisputeId(null)
      fetchDisputes()
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Xử lý thất bại',
        description: err?.message || 'Đã có lỗi xảy ra khi thực thi phán quyết.',
      })
    } finally {
      setResolveLoading(false)
    }
  }

  const totalFee = Number(detail?.totalFee || 0)
  const calcRefundAmount = decisionType === 'FULL_REFUND'
    ? totalFee
    : decisionType === 'SETTLE_EXPERT'
      ? 0
      : Math.round((totalFee * (Number(refundRatePercent) || 0)) / 100)
  const calcExpertAmount = Math.max(0, totalFee - calcRefundAmount)

  return (
    <div className="flex flex-col gap-6">
      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'PENDING_ADMIN_REVIEW' ? 'border-l-orange-500 bg-orange-50/40 shadow-md ring-1 ring-orange-400' : 'border-l-orange-500 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('PENDING_ADMIN_REVIEW'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-orange-800">
              <Icon name="gavel" className="text-orange-600 text-[18px]" />
              Chờ quản trị viên xử lý
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-orange-700">
              {statusFilter === 'PENDING_ADMIN_REVIEW' ? totalItems : 'Xem danh sách'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Các ca đã có giải trình hoặc quá hạn, cần đưa ra phán quyết cuối cùng.
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'PENDING_EXPERT_RESPONSE' ? 'border-l-amber-500 bg-amber-50/40 shadow-md ring-1 ring-amber-400' : 'border-l-amber-500 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('PENDING_EXPERT_RESPONSE'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <Icon name="hourglass_top" className="text-amber-600 text-[18px]" />
              Chờ chuyên gia giải trình
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700">
              {statusFilter === 'PENDING_EXPERT_RESPONSE' ? totalItems : 'Xem danh sách'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Chuyên gia đang trong thời hạn gửi ý kiến phản biện (24h).
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 ${statusFilter === 'RESOLVED' ? 'border-l-emerald-600 bg-emerald-50/40 shadow-md ring-1 ring-emerald-400' : 'border-l-emerald-600 hover:shadow-sm'}`}
          onClick={() => { setStatusFilter('RESOLVED'); setPage(1) }}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Icon name="check_circle" className="text-emerald-600 text-[18px]" />
              Đã giải quyết xong
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              {statusFilter === 'RESOLVED' ? totalItems : 'Xem lịch sử'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Các vụ việc đã có phán quyết và hoàn tất điều phối tiền cọc.
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon name="balance" className="text-primary text-[22px]" />
              Danh sách khiếu nại buổi tư vấn
            </CardTitle>
            <CardDescription className="text-xs">
              Tiếp nhận ý kiến từ khách hàng và chuyên gia để đưa ra phán quyết xử lý công bằng, minh bạch.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING_ADMIN_REVIEW">Chờ quản trị viên xử lý</SelectItem>
                <SelectItem value="PENDING_EXPERT_RESPONSE">Chờ chuyên gia giải trình</SelectItem>
                <SelectItem value="RESOLVED">Đã giải quyết</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchDisputes} title="Làm mới">
              <Icon name="refresh" className="text-[18px]" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <LoadingState text="Đang tải danh sách khiếu nại..." />
          ) : disputes.length === 0 ? (
            <EmptyState icon="gavel" text="Hiện không có vụ việc khiếu nại nào." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày gửi</TableHead>
                    <TableHead>Mã ca hẹn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Chuyên gia</TableHead>
                    <TableHead className="text-right">Tiền cọc</TableHead>
                    <TableHead>Lý do khiếu nại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((item) => (
                    <TableRow key={item.id} className="hover:bg-surface-container-lowest">
                      <TableCell className="text-xs text-on-surface-variant font-mono whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {item.bookingCode || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-on-surface">
                        {item.taxpayerFullName || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-on-surface">
                        {item.expertFullName || '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-bold text-xs text-primary">
                        {formatCurrency(item.totalFee)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-on-surface">
                          {DISPUTE_REASON_MAP[item.reason] || item.reason || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DisputeStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={item.status === 'PENDING_ADMIN_REVIEW' ? 'default' : 'outline'}
                          className={`text-xs h-8 gap-1 font-semibold ${item.status === 'PENDING_ADMIN_REVIEW' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                          onClick={() => openDetailModal(item.id)}
                        >
                          <Icon name="visibility" className="text-[16px]" />
                          {item.status === 'RESOLVED' ? 'Xem biên bản' : 'Xem & Phán quyết'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t text-xs text-on-surface-variant">
              <span>Trang {page} / {totalPages} (Tổng số {totalItems} vụ việc)</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail & Resolution Dialog */}
      <Dialog
        open={Boolean(selectedDisputeId)}
        onOpenChange={(open) => !open && setSelectedDisputeId(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Icon name="gavel" className="text-[22px]" />
              Hồ Sơ Khiếu Nại Buổi Tư Vấn
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mã ca hẹn: <strong className="font-mono text-on-surface">{detail?.bookingCode}</strong> • Tiền cọc: <strong className="text-primary">{formatCurrency(detail?.totalFee)}</strong>
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <LoadingState text="Đang tải hồ sơ khiếu nại..." />
          ) : detail ? (
            <div className="flex flex-col gap-4 py-2 text-xs">
              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Người khiếu nại (Khách hàng):</span>
                  <strong className="text-sm text-on-surface">{detail.taxpayerFullName}</strong>
                  {detail.taxpayerPhone && (
                    <div className="text-on-surface-variant text-[11px] font-mono mt-0.5">SĐT: {detail.taxpayerPhone}</div>
                  )}
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Bên bị khiếu nại (Chuyên gia):</span>
                  <strong className="text-sm text-on-surface">{detail.expertFullName}</strong>
                  <div className="mt-1">
                    <DisputeStatusBadge status={detail.status} />
                  </div>
                </div>
              </div>

              {/* Khối ý kiến khách hàng */}
              <Card className="border border-red-200 bg-red-50/20">
                <CardHeader className="pb-2 pt-3 px-3.5">
                  <CardTitle className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Icon name="report_problem" className="text-red-600 text-[18px]" />
                    Nội dung khiếu nại từ khách hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3.5 pb-3 text-xs space-y-2">
                  <div>
                    <span className="text-on-surface-variant">Lý do chính: </span>
                    <strong className="text-on-surface">{DISPUTE_REASON_MAP[detail.reason] || detail.reason}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Mô tả cụ thể:</span>
                    <p className="p-2.5 bg-white rounded-lg border text-on-surface leading-relaxed mt-1 whitespace-pre-wrap">
                      {detail.description || 'Không có mô tả chi tiết.'}
                    </p>
                  </div>
                  {detail.evidenceUrls && detail.evidenceUrls.length > 0 && (
                    <div>
                      <span className="text-on-surface-variant block mb-1">Tài liệu / Hình ảnh chứng cứ:</span>
                      <div className="flex flex-wrap gap-2">
                        {detail.evidenceUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border text-primary hover:underline text-[11px]"
                          >
                            <Icon name="attachment" className="text-[14px]" />
                            Bằng chứng #{i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Khối giải trình của chuyên gia */}
              <Card className="border border-blue-200 bg-blue-50/20">
                <CardHeader className="pb-2 pt-3 px-3.5">
                  <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Icon name="forum" className="text-blue-600 text-[18px]" />
                    Ý kiến phản biện / Giải trình của chuyên gia
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3.5 pb-3 text-xs space-y-2">
                  {detail.expertResponse ? (
                    <>
                      <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                        <span>Đã gửi lúc: {formatDateTime(detail.expertRespondedAt)}</span>
                      </div>
                      <p className="p-2.5 bg-white rounded-lg border text-on-surface leading-relaxed whitespace-pre-wrap">
                        {detail.expertResponse}
                      </p>
                      {detail.expertEvidenceUrls && detail.expertEvidenceUrls.length > 0 && (
                        <div>
                          <span className="text-on-surface-variant block mb-1">Bằng chứng phản biện:</span>
                          <div className="flex flex-wrap gap-2">
                            {detail.expertEvidenceUrls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border text-primary hover:underline text-[11px]"
                              >
                                <Icon name="attachment" className="text-[14px]" />
                                Bằng chứng #{i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-dashed text-on-surface-variant text-center">
                      <span>Chuyên gia chưa gửi giải trình. Hạn phản hồi: </span>
                      <strong className="text-amber-800">{formatDateTime(detail.expertResponseDeadline)}</strong>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nếu đã phán quyết xong */}
              {detail.status === 'RESOLVED' ? (
                <Card className="border border-emerald-300 bg-emerald-50/30">
                  <CardHeader className="pb-2 pt-3 px-3.5">
                    <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Icon name="verified" className="text-emerald-600 text-[18px]" />
                      Biên bản phán quyết của Quản trị viên
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3.5 pb-3 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border">
                      <div>
                        <span className="text-on-surface-variant block text-[11px]">Khách hàng nhận lại:</span>
                        <strong className="text-sm text-emerald-700">{formatCurrency(detail.userRefundAmount)}</strong>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-[11px]">Chuyên gia nhận thù lao:</span>
                        <strong className="text-sm text-primary">{formatCurrency(detail.expertSettlementAmount)}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Căn cứ & Lý do phán quyết:</span>
                      <p className="p-2.5 bg-white rounded-lg border text-on-surface leading-relaxed mt-1 whitespace-pre-wrap">
                        {detail.adminResolution || '—'}
                      </p>
                    </div>
                    {detail.adminNotes && (
                      <div className="text-[11px] text-on-surface-variant italic">
                        Ghi chú nội bộ: {detail.adminNotes}
                      </div>
                    )}
                    <div className="text-[11px] text-on-surface-variant">
                      Thời gian phán quyết: {formatDateTime(detail.resolvedAt)}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Form phán quyết nếu chưa xong */
                <form onSubmit={handleResolveSubmit} className="flex flex-col gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Icon name="gavel" className="text-primary text-[20px]" />
                    <h3 className="text-sm font-bold text-on-surface">Đưa ra phán quyết xử lý tranh chấp</h3>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-on-surface">
                      Phương án phán quyết <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionType('FULL_REFUND')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${decisionType === 'FULL_REFUND' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant bg-white hover:bg-surface-container-low'}`}
                      >
                        <div className="font-bold text-xs text-on-surface">Hoàn tiền 100% cho khách</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">Khách nhận đủ tiền cọc, chuyên gia 0 ₫.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecisionType('SETTLE_EXPERT')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${decisionType === 'SETTLE_EXPERT' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant bg-white hover:bg-surface-container-low'}`}
                      >
                        <div className="font-bold text-xs text-on-surface">Bác bỏ khiếu nại</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">Trả đủ tiền cho chuyên gia, khách 0 ₫.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecisionType('PARTIAL')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${decisionType === 'PARTIAL' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant bg-white hover:bg-surface-container-low'}`}
                      >
                        <div className="font-bold text-xs text-on-surface">Phân chia theo tỷ lệ (%)</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">Chia tiền theo tỷ lệ hai bên thỏa thuận.</div>
                      </button>
                    </div>
                  </div>

                  {decisionType === 'PARTIAL' && (
                    <div className="flex flex-col gap-1.5 p-3 bg-surface-container-low rounded-xl border">
                      <Label className="text-xs font-semibold text-on-surface">
                        Tỷ lệ hoàn tiền cho khách hàng (%):
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={refundRatePercent}
                          onChange={(e) => setRefundRatePercent(e.target.value)}
                          className="w-28 h-9 text-xs font-bold text-primary"
                        />
                        <span className="text-xs text-on-surface-variant">
                          (Chuyên gia nhận phần còn lại: <strong>{Math.max(0, 100 - (Number(refundRatePercent) || 0))}%</strong>)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bảng tóm tắt số tiền phân bổ */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div>
                      <span className="text-[11px] text-amber-900 block">Khách hàng sẽ nhận lại:</span>
                      <strong className="text-sm text-emerald-700">{formatCurrency(calcRefundAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-amber-900 block">Chuyên gia sẽ nhận thù lao:</span>
                      <strong className="text-sm text-primary">{formatCurrency(calcExpertAmount)}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-on-surface">
                      Căn cứ & Nội dung phán quyết <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Giải thích rõ lý do chấp thuận hoặc bác bỏ khiếu nại (sẽ hiển thị cho cả khách hàng và chuyên gia)..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-on-surface">Ghi chú nội bộ</Label>
                    <Textarea
                      placeholder="Ghi chú nội bộ cho ban quản trị..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="text-xs min-h-[50px]"
                    />
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDisputeId(null)}
                      disabled={resolveLoading}
                    >
                      Đóng
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-primary text-on-primary font-bold"
                      disabled={resolveLoading}
                    >
                      {resolveLoading ? 'Đang thực thi phán quyết...' : 'Xác nhận phán quyết'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />
    </div>
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
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

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
      setError(err.message || 'Không thể tải danh sách lĩnh vực chuyên môn.')
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
        setNotice({
          open: true,
          type: 'success',
          title: 'Cập nhật thành công',
          description: `Đã cập nhật thông tin lĩnh vực tư vấn "${payload.name}".`,
        })
      } else {
        await expertService.createSpecialization(payload)
        setNotice({
          open: true,
          type: 'success',
          title: 'Thêm mới thành công',
          description: `Đã thêm lĩnh vực tư vấn "${payload.name}".`,
        })
      }
      setFormState(null)
      await fetchData()
    } catch (err) {
      return err.message || 'Lưu thông tin thất bại.'
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await expertService.deleteSpecialization(deleteTarget.id)
      const name = deleteTarget.name
      setDeleteTarget(null)
      setNotice({
        open: true,
        type: 'success',
        title: 'Xóa thành công',
        description: `Đã xóa lĩnh vực tư vấn "${name}".`,
      })
      await fetchData()
    } catch (err) {
      const msg = err.message || 'Xóa lĩnh vực tư vấn thất bại.'
      setDeleteTarget(null)
      setNotice({
        open: true,
        type: 'error',
        title: 'Xóa thất bại',
        description: msg,
      })
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
              placeholder="Tìm kiếm lĩnh vực tư vấn..." leftIcon={<Icon name="search" className="text-[20px]" />} />
          </div>
          <Button id="spec-add" onClick={() => setFormState({ item: null })} className="gap-1 font-bold">
            <Icon name="add" /> Thêm lĩnh vực mới
          </Button>
        </CardContent>
      </Card>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {loading && <LoadingState text="Đang tải danh sách lĩnh vực tư vấn..." />}

      {!loading && specializations.length > 0 && (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ký hiệu phân loại</TableHead>
                <TableHead>Tên lĩnh vực chuyên môn</TableHead>
                <TableHead>Mô tả phạm vi tư vấn</TableHead>
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
                      <Button size="sm" variant="outline" onClick={() => setFormState({ item })} id={`spec-edit-${item.id}`}>Chỉnh sửa</Button>
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
        title="Xóa lĩnh vực tư vấn"
        description={deleteTarget ? `Bạn có chắc chắn muốn xóa "${deleteTarget.name}" khỏi hệ thống? Thao tác này không thể hoàn tác.` : ''}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      />

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
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
          <DialogTitle>{editItem ? 'Chỉnh sửa lĩnh vực tư vấn' : 'Thêm lĩnh vực tư vấn mới'}</DialogTitle>
          <DialogDescription>Lĩnh vực chuyên môn hiển thị cho người nộp hồ sơ đăng ký làm chuyên gia.</DialogDescription>
        </DialogHeader>

        <ErrorAlert message={formError} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-code">Ký hiệu phân loại</Label>
          <Input id="spec-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!editItem} placeholder="VD: DAI_LY_THUE, KT_DOANH_NGHIEP" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-name">Tên lĩnh vực chuyên môn</Label>
          <Input id="spec-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Tư vấn đại lý thuế" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="spec-desc">Mô tả phạm vi tư vấn</Label>
          <Textarea id="spec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả phạm vi và nghiệp vụ tư vấn..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
          <Checkbox id="spec-active" checked={isActive} onCheckedChange={setIsActive} />
          Áp dụng ngay trên hệ thống (hiển thị khi nộp hồ sơ)
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy bỏ</Button>
          <Button type="submit" size="sm" disabled={loading || !isValid} id="spec-submit" className="font-bold">
            {loading ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 3: FEE CONFIGS (KHUNG MỨC PHÍ TƯ VẤN)
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
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertService.getFeeConfigs({
        sessionType: sessionFilter === ALL ? undefined : sessionFilter,
      })
      setFeeConfigs(extractItems(data))
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khung mức phí.')
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
        setNotice({
          open: true,
          type: 'success',
          title: 'Cập nhật thành công',
          description: 'Đã cập nhật khung mức phí tư vấn.',
        })
      } else {
        await expertService.createFeeConfig(payload)
        setNotice({
          open: true,
          type: 'success',
          title: 'Thêm mới thành công',
          description: 'Đã thêm khung mức phí tư vấn mới.',
        })
      }
      setFormState(null)
      await fetchData()
    } catch (err) {
      return err.message || 'Lưu khung mức phí thất bại.'
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await expertService.deleteFeeConfig(deleteTarget.id)
      setDeleteTarget(null)
      setNotice({
        open: true,
        type: 'success',
        title: 'Xóa thành công',
        description: 'Đã xóa khung mức phí khỏi hệ thống.',
      })
      await fetchData()
    } catch (err) {
      const msg = err.message || 'Xóa khung mức phí thất bại.'
      setDeleteTarget(null)
      setNotice({
        open: true,
        type: 'error',
        title: 'Xóa thất bại',
        description: msg,
      })
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
                <SelectItem value={ALL}>Tất cả hình thức tư vấn</SelectItem>
                {Object.entries(SESSION_TYPE_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button id="fee-add" onClick={() => setFormState({ item: null })} className="gap-1 font-bold">
            <Icon name="add" /> Thêm khung mức phí
          </Button>
        </CardContent>
      </Card>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {loading && <LoadingState text="Đang tải danh sách khung mức phí tư vấn..." />}

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
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Mức phí sàn tối thiểu</span>
                    <span className="text-sm text-primary font-bold">{formatCurrency(item.minFee)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Mức phí trần tối đa</span>
                    <span className="text-sm text-primary font-bold">{formatCurrency(item.maxFee)}</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1 font-bold" onClick={() => setFormState({ item })} id={`fee-edit-${item.id}`}>
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
        <EmptyState icon="payments" text="Chưa có khung mức phí tư vấn nào." />
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
        title="Xóa khung mức phí tư vấn"
        description={deleteTarget
          ? `Bạn có chắc chắn muốn xóa khung mức phí cho hình thức ${SESSION_TYPE_MAP[deleteTarget.sessionType]?.label || deleteTarget.sessionType} (${deleteTarget.durationMinutes} phút)? Thao tác này không thể hoàn tác.`
          : ''}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      />

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
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
  const rangeError = min > max ? 'Mức phí sàn không được lớn hơn mức phí trần.' : null
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
          <DialogTitle>{editItem ? 'Chỉnh sửa khung mức phí' : 'Thêm khung mức phí mới'}</DialogTitle>
          <DialogDescription>Khung mức phí sàn và trần áp dụng cho đề xuất biểu phí của chuyên gia tư vấn.</DialogDescription>
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
          <Label htmlFor="fee-duration">Thời lượng buổi tư vấn (phút)</Label>
          <Input id="fee-duration" type="number" min={15} max={240} value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)} />
          {(d < 15 || d > 240) && <span className="text-[11px] text-red-500">Thời lượng hợp lệ từ 15 đến 240 phút</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fee-min">Mức phí sàn tối thiểu (VNĐ)</Label>
            <Input id="fee-min" type="number" min={0} max={100000000} value={minFee} onChange={(e) => setMinFee(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fee-max">Mức phí trần tối đa (VNĐ)</Label>
            <Input id="fee-max" type="number" min={0} max={100000000} value={maxFee} onChange={(e) => setMaxFee(e.target.value)} />
          </div>
        </div>
        {rangeError && <span className="text-[11px] text-red-500 -mt-2">{rangeError}</span>}

        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
          <Checkbox id="fee-active" checked={isActive} onCheckedChange={setIsActive} />
          Áp dụng ngay trên hệ thống
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy bỏ</Button>
          <Button type="submit" size="sm" disabled={loading || !isValid} id="fee-submit" className="font-bold">
            {loading ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 4: PLATFORM WALLET & ESCROW LEDGER
// ═══════════════════════════════════════════════════════════

function EscrowStatusBadge({ status }) {
  const s = ESCROW_STATUS_MAP[status] || { label: status || '—', variant: 'outline' }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function PlatformWalletTab() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedTx, setSelectedTx] = useState(null)
  const searchTimeoutRef = useRef(null)

  const fetchWallet = useCallback(async () => {
    try {
      const data = await expertService.getAdminPlatformWallet()
      setWallet(data)
    } catch (err) {
      setError(err?.message || 'Không thể tải tổng quan Ví Nền tảng.')
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setTableLoading(true)
    try {
      const res = await expertService.getEscrowTransactions({
        page,
        size: 10,
        status: statusFilter === ALL ? undefined : statusFilter,
        search: searchTerm || undefined,
      })
      const items = extractItems(res)
      setTransactions(items)
      setTotalPages(res?.totalPages || 1)
      setTotalItems(res?.totalItems ?? res?.totalCount ?? items.length)
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách giao dịch ký quỹ.')
    } finally {
      setTableLoading(false)
    }
  }, [page, statusFilter, searchTerm])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchWallet(), fetchTransactions()])
    setLoading(false)
  }, [fetchWallet, fetchTransactions])

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleSearchChange = (val) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(val)
      setPage(1)
    }, 400)
  }

  if (loading) return <LoadingState text="Đang tải dữ liệu ví sàn..." />

  const stats = wallet?.stats || {}

  return (
    <div className="flex flex-col gap-6">
      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold">
              <Icon name="payments" className="text-primary text-[18px]" />
              Tổng doanh thu dịch vụ
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-on-surface">
              {formatCurrency(wallet?.totalGrossVolume ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Tổng giá trị tất cả các ca tư vấn đã thanh toán thành công.
          </CardContent>
        </Card>

        {/* Escrow Holding */}
        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold">
              <Icon name="lock" className="text-amber-500 text-[18px]" />
              Tiền cọc đang tạm giữ
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {formatCurrency(wallet?.escrowHoldingBalance ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0 space-y-0.5">
            <div>Chờ trả Chuyên gia: <strong className="text-on-surface">{formatCurrency(wallet?.pendingExpertReceivable ?? 0)}</strong></div>
            <div>Hoa hồng sàn tạm giữ: <strong className="text-on-surface">{formatCurrency(wallet?.pendingPlatformCommission ?? 0)}</strong></div>
          </CardContent>
        </Card>

        {/* Realized Revenue */}
        <Card className="shadow-sm border-l-4 border-l-emerald-600">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold">
              <Icon name="trending_up" className="text-emerald-600 text-[18px]" />
              Hoa hồng sàn thực nhận
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {formatCurrency(wallet?.realizedPlatformRevenue ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0">
            Tổng tích lũy: <strong className="text-on-surface">{formatCurrency(wallet?.totalAccumulatedRevenue ?? 0)}</strong> (từ ca đã xong)
          </CardContent>
        </Card>

        {/* Settled & Refunded */}
        <Card className="shadow-sm border-l-4 border-l-blue-600">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold">
              <Icon name="swap_horiz" className="text-blue-600 text-[18px]" />
              Đã chi trả & Hoàn tiền
            </CardDescription>
            <CardTitle className="text-xl font-bold text-on-surface">
              {formatCurrency(wallet?.totalSettledToExperts ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant pt-0 space-y-0.5">
            <div>Đã trả chuyên gia: <strong className="text-on-surface">{formatCurrency(wallet?.totalSettledToExperts ?? 0)}</strong></div>
            <div>Đã hoàn trả khách: <strong className="text-on-surface">{formatCurrency(wallet?.totalRefundedToTaxpayers ?? 0)}</strong></div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status Breakdown */}
      <div className="flex flex-wrap items-center gap-2 text-xs bg-surface-container-low p-3 rounded-xl border border-outline-variant">
        <span className="font-semibold text-on-surface flex items-center gap-1 mr-2">
          <Icon name="query_stats" className="text-[18px] text-primary" />
          Tổng quan trạng thái:
        </span>
        <span className="px-2.5 py-1 rounded-md bg-white border text-on-surface">Tổng đơn: <strong>{stats.totalTransactions ?? 0}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800">Chờ thanh toán: <strong>{stats.pendingPaymentCount ?? 0}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800">Đang giữ cọc: <strong>{stats.heldInEscrowCount ?? 0}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-orange-800">Chờ hoàn tất 24h: <strong>{stats.coolingDownCount ?? 0}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">Đã trả chuyên gia: <strong>{stats.settledCount ?? 0}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-800">Đã hoàn tiền: <strong>{(stats.refundedCount ?? 0) + (stats.partiallyRefundedCount ?? 0)}</strong></span>
        <span className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700">Đã hủy: <strong>{stats.cancelledCount ?? 0}</strong></span>
      </div>

      {/* Ledger Table Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon name="receipt_long" className="text-primary text-[22px]" />
              Lịch sử đặt cọc & thanh toán
            </CardTitle>
            <CardDescription className="text-xs">
              Chi tiết các khoản khách thanh toán, tiền cọc đang giữ và tiền chi trả cho chuyên gia.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-56 sm:w-64">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
              <Input
                placeholder="Tìm mã lịch / mã đơn..."
                className="pl-9 h-9 text-xs"
                defaultValue={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                {Object.entries(ESCROW_STATUS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadAll} title="Tải lại dữ liệu">
              <Icon name="refresh" className="text-[18px]" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {tableLoading ? (
            <LoadingState text="Đang làm mới sổ cái giao dịch..." />
          ) : transactions.length === 0 ? (
            <EmptyState icon="receipt_long" text="Không có giao dịch ký quỹ nào phù hợp với bộ lọc." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đặt lịch</TableHead>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-right">Hoa hồng sàn</TableHead>
                    <TableHead className="text-right">Chuyên gia nhận</TableHead>
                    <TableHead>Trạng thái ký quỹ</TableHead>
                    <TableHead>Cổng thanh toán</TableHead>
                    <TableHead>Thời gian nạp</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-semibold text-primary font-mono text-xs">
                        {tx.bookingCode || tx.bookingId?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-on-surface-variant">
                        #{tx.orderCode || '—'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-on-surface text-sm">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 font-medium">
                        {formatCurrency(tx.commissionAmount)}
                        <span className="text-[10px] text-on-surface-variant ml-1">({tx.commissionRate * 100}%)</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-blue-600 font-medium">
                        {formatCurrency(tx.expertReceivable)}
                      </TableCell>
                      <TableCell>
                        <EscrowStatusBadge status={tx.escrowStatus} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {tx.paymentGateway || 'PAYOS'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-on-surface-variant whitespace-nowrap">
                        {formatDateTime(tx.paidAt || tx.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => setSelectedTx(tx)}
                        >
                          <Icon name="visibility" className="text-[16px] mr-1" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t p-4 text-xs text-on-surface-variant">
            <span>Tổng số {totalItems} giao dịch (Trang {page}/{totalPages})</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Transaction Detail Dialog */}
      {selectedTx && (
        <Dialog open onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon name="receipt" className="text-primary text-[22px]" />
                Chi tiết Giao dịch Ký quỹ #{selectedTx.orderCode}
              </DialogTitle>
              <DialogDescription>
                Bản ghi sổ cái bảo chứng thanh toán ca tư vấn thuế trực tuyến
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 text-sm py-2">
              <div className="p-3 rounded-lg bg-surface-container-low border flex items-center justify-between">
                <div>
                  <span className="text-xs text-on-surface-variant block">Mã đặt lịch tư vấn:</span>
                  <span className="font-bold text-primary font-mono text-base">{selectedTx.bookingCode || selectedTx.bookingId}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-on-surface-variant block">Trạng thái ký quỹ:</span>
                  <EscrowStatusBadge status={selectedTx.escrowStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-white">
                  <span className="text-xs text-on-surface-variant block">Tổng tiền khách thanh toán</span>
                  <span className="text-lg font-bold text-on-surface">{formatCurrency(selectedTx.amount)}</span>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <span className="text-xs text-on-surface-variant block">Hoa hồng Nền tảng ({selectedTx.commissionRate * 100}%)</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(selectedTx.commissionAmount)}</span>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <span className="text-xs text-on-surface-variant block">Số tiền giải ngân cho Chuyên gia</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(selectedTx.expertReceivable)}</span>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <span className="text-xs text-on-surface-variant block">Cổng thanh toán</span>
                  <span className="text-base font-semibold text-on-surface">{selectedTx.paymentGateway || 'PAYOS'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface-container-low border text-xs">
                <InfoRow label="Thời điểm nạp tiền vào quỹ" value={formatDateTime(selectedTx.paidAt)} />
                <InfoRow label="Thời điểm giải ngân ví chuyên gia" value={formatDateTime(selectedTx.settledAt)} />
                {selectedTx.refundAmount > 0 && (
                  <>
                    <InfoRow label="Số tiền đã hoàn trả" value={formatCurrency(selectedTx.refundAmount)} />
                    <InfoRow label="Lý do hoàn trả" value={selectedTx.refundReason} />
                    <InfoRow label="Thời điểm hoàn trả" value={formatDateTime(selectedTx.refundedAt)} />
                  </>
                )}
                <InfoRow label="Mã tham chiếu cổng thanh toán" value={selectedTx.paymentReference} />
              </div>
            </div>

            <DialogFooter>
              {selectedTx.checkoutUrl && selectedTx.escrowStatus === 'PendingPayment' && (
                <Button
                  size="sm"
                  className="font-medium mr-auto"
                  onClick={() => window.open(selectedTx.checkoutUrl, '_blank')}
                >
                  <Icon name="open_in_new" className="text-[16px] mr-1" />
                  Mở liên kết thanh toán
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 5: PLATFORM POLICY (CHÍNH SÁCH SÀN & ESCROW)
// ═══════════════════════════════════════════════════════════

function PlatformPolicyTab() {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const fetchPolicy = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertService.getPlatformPolicy()
      setPolicy(data)
    } catch (err) {
      setError(err?.message || 'Không thể tải chính sách sàn tư vấn.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  const handleChange = (field, value) => {
    setPolicy((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!policy) return

    if (Number(policy.expertMinFeeVnd) > Number(policy.expertMaxFeeVnd)) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Mức phí không hợp lệ',
        description: 'Mức phí tối thiểu không được lớn hơn mức phí tối đa.',
      })
      return
    }

    if (Number(policy.cancelFullRefundHours) < Number(policy.cancelPartialRefundHours)) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Mốc thời gian hủy không hợp lệ',
        description: 'Mốc thời gian hoàn tiền 100% phải lớn hơn hoặc bằng mốc hoàn tiền một phần.',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        expertMinFeeVnd: Number(policy.expertMinFeeVnd) || 100000,
        expertMaxFeeVnd: Number(policy.expertMaxFeeVnd) || 2000000,
        bookingSlotHoldMinutes: Number(policy.bookingSlotHoldMinutes) || 10,
        bookingMinLeadTimeHours: Number(policy.bookingMinLeadTimeHours) || 4,
        expertConfirmTimeoutHours: Number(policy.expertConfirmTimeoutHours) || 2,
        platformCommissionRatePercent: Number(policy.platformCommissionRatePercent) || 20,
        sessionOpenBeforeMinutes: Number(policy.sessionOpenBeforeMinutes) || 10,
        sessionNoShowMinutes: Number(policy.sessionNoShowMinutes) || 15,
        ratingWindowDays: Number(policy.ratingWindowDays) || 7,
        escrowCooldownHours: Number(policy.escrowCooldownHours) || 24,
        cancelFullRefundHours: Number(policy.cancelFullRefundHours) || 24,
        cancelPartialRefundHours: Number(policy.cancelPartialRefundHours) || 4,
        cancelPartialRefundPercent: Number(policy.cancelPartialRefundPercent) || 50,
        expertMaxDailySlots: Number(policy.expertMaxDailySlots) || 6,
        expertMinWithdrawalVnd: Number(policy.expertMinWithdrawalVnd) || 500000,
        expertLateCancelHours: Number(policy.expertLateCancelHours) || 12,
        expertLateCancelPenaltyVnd: Number(policy.expertLateCancelPenaltyVnd) || 100000,
        disputeWindowHours: Number(policy.disputeWindowHours) || 24,
        disputeExpertReplyHours: Number(policy.disputeExpertReplyHours) || 24,
      }

      await expertService.updatePlatformPolicy(payload)
      setNotice({
        open: true,
        type: 'success',
        title: 'Cập nhật chính sách thành công',
        description: 'Các thông số vận hành sàn tư vấn và quy chế ký quỹ bảo đảm đã được cập nhật và có hiệu lực ngay lập tức.',
      })
      fetchPolicy()
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        description: err?.message || 'Không thể lưu chính sách sàn tư vấn.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState text="Đang tải chính sách sàn tư vấn và quy chế ký quỹ bảo đảm..." />

  if (!policy) {
    return (
      <Card className="p-8 text-center">
        <Icon name="error" className="text-destructive text-[36px] mx-auto mb-2" />
        <p className="text-on-surface font-semibold">Chưa có dữ liệu chính sách sàn tư vấn.</p>
        <Button onClick={fetchPolicy} className="mt-4" size="sm">
          Thử lại
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/90 text-white shadow-md border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
            <Icon name="tune" className="text-[24px]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Quy chế vận hành sàn tư vấn & Giữ tiền bảo đảm
            </h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Cấu hình các tham số nghiệp vụ toàn hệ thống: hoa hồng sàn, mốc hoàn tiền, thời gian chờ và hạn mức giao dịch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={fetchPolicy}
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 text-xs font-bold gap-1 cursor-pointer"
          >
            <Icon name="refresh" className="text-[16px]" />
            <span>Tải lại</span>
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {saving ? (
              <>
                <Icon name="progress_activity" className="text-[16px] animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Icon name="save" className="text-[16px]" />
                <span>Lưu chính sách</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Khối 1: Mức phí & Hoa hồng sàn */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 border-b border-surface-container/80">
            <div className="flex items-center gap-2">
              <Icon name="payments" className="text-amber-600 text-[20px]" />
              <CardTitle className="text-sm font-bold text-on-surface">
                Khung mức phí & Hoa hồng sàn
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Giới hạn thù lao tư vấn của chuyên gia và tỷ lệ phần trăm sàn thu
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Phí tư vấn tối thiểu (VNĐ)
                </Label>
                <Input
                  type="number"
                  step="10000"
                  min="0"
                  value={policy.expertMinFeeVnd ?? 100000}
                  onChange={(e) => handleChange('expertMinFeeVnd', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant font-mono">
                  = {formatCurrency(policy.expertMinFeeVnd)}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Phí tư vấn tối đa (VNĐ)
                </Label>
                <Input
                  type="number"
                  step="50000"
                  min="0"
                  value={policy.expertMaxFeeVnd ?? 2000000}
                  onChange={(e) => handleChange('expertMaxFeeVnd', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant font-mono">
                  = {formatCurrency(policy.expertMaxFeeVnd)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Tỷ lệ hoa hồng sàn (%)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={policy.platformCommissionRatePercent ?? 20}
                  onChange={(e) => handleChange('platformCommissionRatePercent', e.target.value)}
                  className="h-9 text-xs font-bold"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Chuyên gia nhận {100 - (Number(policy.platformCommissionRatePercent) || 20)}%
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Mức rút tiền tối thiểu (VNĐ)
                </Label>
                <Input
                  type="number"
                  step="50000"
                  min="0"
                  value={policy.expertMinWithdrawalVnd ?? 500000}
                  onChange={(e) => handleChange('expertMinWithdrawalVnd', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant font-mono">
                  = {formatCurrency(policy.expertMinWithdrawalVnd)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Khối 2: Đặt lịch & Tiếp nhận */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 border-b border-surface-container/80">
            <div className="flex items-center gap-2">
              <Icon name="hourglass_top" className="text-blue-600 text-[20px]" />
              <CardTitle className="text-sm font-bold text-on-surface">
                Quy chế đặt và nhận lịch hẹn
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Quy định thời gian giữ chỗ thanh toán và thời hạn chuyên gia nhận lịch.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Thời gian giữ chỗ thanh toán (Phút)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={policy.bookingSlotHoldMinutes ?? 10}
                  onChange={(e) => handleChange('bookingSlotHoldMinutes', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Tạm giữ chỗ để người dùng thanh toán
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Thời hạn chuyên gia nhận lịch (Giờ)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={policy.expertConfirmTimeoutHours ?? 2}
                  onChange={(e) => handleChange('expertConfirmTimeoutHours', e.target.value)}
                  className="h-9 text-xs font-bold text-amber-700"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Quá giờ tự động hủy và hoàn tiền cho khách
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Thời gian đặt trước tối thiểu (Giờ)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={policy.bookingMinLeadTimeHours ?? 4}
                  onChange={(e) => handleChange('bookingMinLeadTimeHours', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Thời gian đặt trước giờ bắt đầu hẹn
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Số ca tư vấn tối đa trong ngày
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={policy.expertMaxDailySlots ?? 6}
                  onChange={(e) => handleChange('expertMaxDailySlots', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Giới hạn số ca tư vấn mỗi ngày của chuyên gia
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Khối 3: Thực hiện phòng họp & Điểm danh */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 border-b border-surface-container/80">
            <div className="flex items-center gap-2">
              <Icon name="videocam" className="text-emerald-600 text-[20px]" />
              <CardTitle className="text-sm font-bold text-on-surface">
                Thực hiện phòng họp & Điểm danh
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Quy tắc mở phòng trực tuyến và thời gian ghi nhận vắng mặt
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Mở phòng trước giờ hẹn (Phút)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  value={policy.sessionOpenBeforeMinutes ?? 10}
                  onChange={(e) => handleChange('sessionOpenBeforeMinutes', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Cho phép hai bên vào chuẩn bị trước ca
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Thời gian chờ tối đa khi muộn (Phút)
                </Label>
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={policy.sessionNoShowMinutes ?? 15}
                  onChange={(e) => handleChange('sessionNoShowMinutes', e.target.value)}
                  className="h-9 text-xs font-bold text-red-600"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Quá thời gian này sẽ ghi nhận vắng mặt
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/20">
              <Label className="text-xs font-semibold text-on-surface">
                Thời hạn gửi đánh giá (Ngày)
              </Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={policy.ratingWindowDays ?? 7}
                onChange={(e) => handleChange('ratingWindowDays', e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-[11px] text-on-surface-variant">
                Khách hàng được quyền đánh giá sao & nhận xét trong vòng X ngày sau buổi tư vấn
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Khối 4: Tiền cọc & Hủy lịch hoàn tiền */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 border-b border-surface-container/80">
            <div className="flex items-center gap-2">
              <Icon name="shield" className="text-indigo-600 text-[20px]" />
              <CardTitle className="text-sm font-bold text-on-surface">
                Tiền cọc & Hủy lịch hoàn tiền
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Thời gian bảo đảm sau buổi hẹn và chính sách hoàn tiền bảo vệ quyền lợi
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Thời gian chờ bảo đảm sau ca (Giờ)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="168"
                  value={policy.escrowCooldownHours ?? 24}
                  onChange={(e) => handleChange('escrowCooldownHours', e.target.value)}
                  className="h-9 text-xs font-bold text-indigo-700"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Thời gian bảo đảm trước khi cộng tiền vào ví chuyên gia
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Khách hủy hoàn tiền 100% trước (Giờ)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={policy.cancelFullRefundHours ?? 24}
                  onChange={(e) => handleChange('cancelFullRefundHours', e.target.value)}
                  className="h-9 text-xs text-emerald-700 font-bold"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Hủy trước thời gian này được hoàn trả 100%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Hủy hoàn tiền một phần trước (Giờ)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={policy.cancelPartialRefundHours ?? 4}
                  onChange={(e) => handleChange('cancelPartialRefundHours', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Hủy từ {policy.cancelPartialRefundHours}h đến {policy.cancelFullRefundHours}h trước ca
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Tỷ lệ hoàn tiền một phần (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={policy.cancelPartialRefundPercent ?? 50}
                  onChange={(e) => handleChange('cancelPartialRefundPercent', e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Khách nhận {policy.cancelPartialRefundPercent}%, còn lại bù đắp chuyên gia
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Chuyên gia hủy muộn trước (Giờ)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={policy.expertLateCancelHours ?? 12}
                  onChange={(e) => handleChange('expertLateCancelHours', e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Hủy dưới X giờ bị tính là hủy muộn
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-on-surface">
                  Phạt chuyên gia hủy muộn (VNĐ)
                </Label>
                <Input
                  type="number"
                  step="20000"
                  min="0"
                  value={policy.expertLateCancelPenaltyVnd ?? 100000}
                  onChange={(e) => handleChange('expertLateCancelPenaltyVnd', e.target.value)}
                  className="h-9 text-xs text-red-600 font-bold"
                />
                <span className="text-[11px] text-on-surface-variant font-mono">
                  = {formatCurrency(policy.expertLateCancelPenaltyVnd)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />
    </form>
  )
}


