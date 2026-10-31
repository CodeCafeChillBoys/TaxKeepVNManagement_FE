import { useState, useEffect, useCallback } from 'react'
import { expertService } from '@/services/expertService'
import { expertCertificateConfigService } from '@/services/expertCertificateConfigService'
import { ExpertSearchConfigTab } from '@/components/admin/ExpertSearchConfigTab'
import { ExpertCertificateConfigTab } from '@/components/admin/ExpertCertificateConfigTab'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NotificationDialog, ConfirmDialog } from '@/components/ui/notification-dialog'

const POPULAR_BANKS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'BIDV',
  'VietinBank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'Agribank',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS & STATUS METADATA (TỐI GIẢN, KHÔNG MÀU MÈ, KHÔNG THUẬT NGỮ IT)
// ─────────────────────────────────────────────────────────────────────────────

const APP_STATUS_MAP = {
  Draft: { label: 'Bản nháp', dot: 'bg-stone-400' },
  DRAFT: { label: 'Bản nháp', dot: 'bg-stone-400' },
  PendingReview: { label: 'Chờ thẩm định', dot: 'bg-amber-500' },
  PENDING_REVIEW: { label: 'Chờ thẩm định', dot: 'bg-amber-500' },
  NeedSupplement: { label: 'Cần bổ sung', dot: 'bg-amber-600' },
  NEED_SUPPLEMENT: { label: 'Cần bổ sung', dot: 'bg-amber-600' },
  Approved: { label: 'Đã phê duyệt', dot: 'bg-emerald-600' },
  APPROVED: { label: 'Đã phê duyệt', dot: 'bg-emerald-600' },
  Rejected: { label: 'Từ chối', dot: 'bg-red-600' },
  REJECTED: { label: 'Từ chối', dot: 'bg-red-600' },
}

const CERT_STATUS_MAP = {
  PendingVerification: { label: 'Chờ xác minh', dot: 'bg-amber-500' },
  PENDING_VERIFICATION: { label: 'Chờ xác minh', dot: 'bg-amber-500' },
  Verified: { label: 'Hợp lệ', dot: 'bg-emerald-600' },
  VERIFIED: { label: 'Hợp lệ', dot: 'bg-emerald-600' },
  Rejected: { label: 'Không hợp lệ', dot: 'bg-red-600' },
  REJECTED: { label: 'Không hợp lệ', dot: 'bg-red-600' },
  Expired: { label: 'Hết hạn', dot: 'bg-stone-400' },
  EXPIRED: { label: 'Hết hạn', dot: 'bg-stone-400' },
}

const CERT_TYPE_FALLBACK = {
  CPA: 'Chứng chỉ Kiểm toán viên',
  TAX_AGENT: 'Chứng chỉ Hành nghề dịch vụ làm thủ tục về thuế',
  OTHER: 'Chứng chỉ chuyên môn khác',
}

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: 'Tư vấn trực tuyến 1-1',
  OnlineMeeting: 'Tư vấn trực tuyến 1-1',
  CHAT: 'Tư vấn qua tin nhắn',
  Chat: 'Tư vấn qua tin nhắn',
  VOICE_CALL: 'Tư vấn qua cuộc gọi',
  VoiceCall: 'Tư vấn qua cuộc gọi',
}

const ESCROW_STATUS_MAP = {
  PendingPayment: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  PENDING_PAYMENT: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  0: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  HeldInEscrow: { label: 'Đang tạm giữ', dot: 'bg-amber-500' },
  HELD_IN_ESCROW: { label: 'Đang tạm giữ', dot: 'bg-amber-500' },
  1: { label: 'Đang tạm giữ', dot: 'bg-amber-500' },
  CoolingDown: { label: 'Chờ đối soát', dot: 'bg-amber-600' },
  COOLING_DOWN: { label: 'Chờ đối soát', dot: 'bg-amber-600' },
  2: { label: 'Chờ đối soát', dot: 'bg-amber-600' },
  Settled: { label: 'Đã giải ngân', dot: 'bg-emerald-600' },
  SETTLED: { label: 'Đã giải ngân', dot: 'bg-emerald-600' },
  3: { label: 'Đã giải ngân', dot: 'bg-emerald-600' },
  Refunded: { label: 'Đã hoàn tiền', dot: 'bg-stone-500' },
  REFUNDED: { label: 'Đã hoàn tiền', dot: 'bg-stone-500' },
  4: { label: 'Đã hoàn tiền', dot: 'bg-stone-500' },
  PartiallyRefunded: { label: 'Hoàn một phần', dot: 'bg-stone-500' },
  PARTIALLY_REFUNDED: { label: 'Hoàn một phần', dot: 'bg-stone-500' },
  5: { label: 'Hoàn một phần', dot: 'bg-stone-500' },
  Cancelled: { label: 'Đã hủy', dot: 'bg-stone-400' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-stone-400' },
  6: { label: 'Đã hủy', dot: 'bg-stone-400' },
  Disputed: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  DISPUTED: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  UNDER_DISPUTE: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  7: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
}

const BOOKING_STATUS_MAP = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  PendingPayment: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  0: { label: 'Chờ thanh toán', dot: 'bg-stone-400' },
  EXPIRED_UNPAID: { label: 'Hết hạn thanh toán', dot: 'bg-stone-400' },
  ExpiredUnpaid: { label: 'Hết hạn thanh toán', dot: 'bg-stone-400' },
  1: { label: 'Hết hạn thanh toán', dot: 'bg-stone-400' },
  AWAITING_EXPERT_APPROVAL: { label: 'Chờ chuyên gia nhận', dot: 'bg-amber-500' },
  AwaitingExpertApproval: { label: 'Chờ chuyên gia nhận', dot: 'bg-amber-500' },
  2: { label: 'Chờ chuyên gia nhận', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Đã xác nhận lịch', dot: 'bg-emerald-600' },
  Confirmed: { label: 'Đã xác nhận lịch', dot: 'bg-emerald-600' },
  3: { label: 'Đã xác nhận lịch', dot: 'bg-emerald-600' },
  REJECTED_BY_EXPERT: { label: 'Chuyên gia từ chối', dot: 'bg-red-500' },
  RejectedByExpert: { label: 'Chuyên gia từ chối', dot: 'bg-red-500' },
  4: { label: 'Chuyên gia từ chối', dot: 'bg-red-500' },
  EXPIRED_NO_RESPONSE: { label: 'Quá hạn nhận lịch', dot: 'bg-stone-400' },
  ExpiredNoResponse: { label: 'Quá hạn nhận lịch', dot: 'bg-stone-400' },
  EXPIRED_UNCONFIRMED: { label: 'Quá hạn nhận lịch', dot: 'bg-stone-400' },
  ExpiredUnconfirmed: { label: 'Quá hạn nhận lịch', dot: 'bg-stone-400' },
  5: { label: 'Quá hạn nhận lịch', dot: 'bg-stone-400' },
  CANCELLED_BY_USER: { label: 'Khách hủy lịch', dot: 'bg-stone-400' },
  CancelledByUser: { label: 'Khách hủy lịch', dot: 'bg-stone-400' },
  6: { label: 'Khách hủy lịch', dot: 'bg-stone-400' },
  CANCELLED_BY_EXPERT: { label: 'Chuyên gia hủy', dot: 'bg-red-500' },
  CancelledByExpert: { label: 'Chuyên gia hủy', dot: 'bg-red-500' },
  7: { label: 'Chuyên gia hủy', dot: 'bg-red-500' },
  IN_PROGRESS: { label: 'Đang tư vấn', dot: 'bg-primary' },
  InProgress: { label: 'Đang tư vấn', dot: 'bg-primary' },
  8: { label: 'Đang tư vấn', dot: 'bg-primary' },
  COMPLETED: { label: 'Đã hoàn thành', dot: 'bg-emerald-600' },
  Completed: { label: 'Đã hoàn thành', dot: 'bg-emerald-600' },
  9: { label: 'Đã hoàn thành', dot: 'bg-emerald-600' },
  SETTLED: { label: 'Đã quyết toán', dot: 'bg-emerald-600' },
  Settled: { label: 'Đã quyết toán', dot: 'bg-emerald-600' },
  10: { label: 'Đã quyết toán', dot: 'bg-emerald-600' },
  UNDER_DISPUTE: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  UnderDispute: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  DISPUTED: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  Disputed: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  11: { label: 'Đang khiếu nại', dot: 'bg-red-600' },
  NO_SHOW: { label: 'Vắng mặt', dot: 'bg-red-600' },
  NO_SHOW_BY_USER: { label: 'Khách vắng mặt', dot: 'bg-red-600' },
  NO_SHOW_BY_EXPERT: { label: 'Chuyên gia vắng mặt', dot: 'bg-red-600' },
  NO_SHOW_BOTH: { label: 'Hai bên vắng mặt', dot: 'bg-red-600' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-stone-400' },
  Cancelled: { label: 'Đã hủy', dot: 'bg-stone-400' },
}

const WITHDRAWAL_STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', dot: 'bg-amber-500' },
  Pending: { label: 'Chờ xử lý', dot: 'bg-amber-500' },
  APPROVED: { label: 'Đã chuyển khoản', dot: 'bg-emerald-600' },
  Approved: { label: 'Đã chuyển khoản', dot: 'bg-emerald-600' },
  COMPLETED: { label: 'Đã chuyển khoản', dot: 'bg-emerald-600' },
  Completed: { label: 'Đã chuyển khoản', dot: 'bg-emerald-600' },
  REJECTED: { label: 'Từ chối', dot: 'bg-red-600' },
  Rejected: { label: 'Từ chối', dot: 'bg-red-600' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-stone-400' },
  Cancelled: { label: 'Đã hủy', dot: 'bg-stone-400' },
}

const DISPUTE_STATUS_MAP = {
  PENDING_EXPERT_RESPONSE: { label: 'Chờ chuyên gia giải trình', dot: 'bg-amber-500' },
  PendingExpertResponse: { label: 'Chờ chuyên gia giải trình', dot: 'bg-amber-500' },
  AWAITING_ADMIN_RESOLUTION: { label: 'Chờ phán quyết', dot: 'bg-red-600' },
  AwaitingAdminResolution: { label: 'Chờ phán quyết', dot: 'bg-red-600' },
  RESOLVED_FULL_REFUND: { label: 'Đã hoàn 100% cho khách', dot: 'bg-emerald-600' },
  RESOLVED_REFUND_USER: { label: 'Đã hoàn 100% cho khách', dot: 'bg-emerald-600' },
  ResolvedFullRefund: { label: 'Đã hoàn 100% cho khách', dot: 'bg-emerald-600' },
  RESOLVED_SETTLE_EXPERT: { label: 'Đã giải ngân chuyên gia', dot: 'bg-emerald-600' },
  ResolvedSettleExpert: { label: 'Đã giải ngân chuyên gia', dot: 'bg-emerald-600' },
  RESOLVED_PARTIAL: { label: 'Hoàn tiền một phần', dot: 'bg-stone-500' },
  RESOLVED_PARTIAL_SPLIT: { label: 'Hoàn tiền một phần', dot: 'bg-stone-500' },
  ResolvedPartial: { label: 'Hoàn tiền một phần', dot: 'bg-stone-500' },
  CANCELLED: { label: 'Đã rút khiếu nại', dot: 'bg-stone-400' },
  Cancelled: { label: 'Đã rút khiếu nại', dot: 'bg-stone-400' },
}

const DISPUTE_REASON_MAP = {
  WRONG_TAX_LAW_ADVICE: 'Tư vấn sai quy định thuế',
  UNPROFESSIONAL_BEHAVIOR: 'Thái độ thiếu chuyên nghiệp',
  EARLY_DISCONNECT: 'Kết thúc sớm không đủ thời lượng',
  NETWORK_ISSUE: 'Sự cố đường truyền không thể tiếp tục',
  OTHER: 'Lý do khác',
}

const PLATFORM_TX_TYPE_MAP = {
  COMMISSION_EARNED: { label: 'Phí dịch vụ nhận được', isPositive: true },
  PLATFORM_FEE: { label: 'Thu phí nền tảng', isPositive: true },
  WITHDRAWAL: { label: 'Rút doanh thu về ngân hàng', isPositive: false },
  WITHDRAWAL_REFUND: { label: 'Hoàn tiền lệnh rút bị từ chối', isPositive: true },
  DISBURSEMENT: { label: 'Giải ngân chuyên gia', isPositive: false },
  REFUND: { label: 'Hoàn trả khách hàng', isPositive: false },
  TOP_UP: { label: 'Nạp tiền vào ví', isPositive: true },
  BOOKING_PAYMENT: { label: 'Thanh toán đặt lịch', isPositive: false },
}

function StatusBadge({ label, dot = 'bg-stone-400' }) {
  return (
    <Badge variant="secondary">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span>{label}</span>
    </Badge>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(dateStr)
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(dateStr)
  }
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '—'
  const num = Number(val)
  if (isNaN(num)) return String(val)
  return num.toLocaleString('vi-VN') + ' đ'
}

function cleanVerificationNote(note) {
  if (!note) return ''
  return String(note)
    .replace(/\[AI OCR[^\]]*\]\s*/gi, '')
    .replace(/AI OCR/gi, 'Hệ thống')
    .replace(/OCR/gi, 'quét văn bản')
    .trim()
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: ADMIN EXPERT MANAGEMENT PAGE
// ═════════════════════════════════════════════════════════════════════════════

export function AdminExpertManagementPage() {
  const [activeTab, setActiveTab] = useState('applications')
  const [pendingBadges, setPendingBadges] = useState({
    applications: 0,
    withdrawals: 0,
    disputes: 0,
  })

  const refreshBadges = useCallback(async () => {
    try {
      const [appsRes, wdRes, dispRes] = await Promise.allSettled([
        expertService.getApplications({ status: 'PendingReview', page: 1, size: 1 }),
        expertService.getAdminWithdrawals({ status: 'PENDING', page: 1, size: 1 }),
        expertService.getAdminDisputes({ page: 1, size: 50 }),
      ])

      const appsCount =
        appsRes.status === 'fulfilled'
          ? appsRes.value?.pagination?.totalItems ?? (appsRes.value?.items?.length || 0)
          : 0

      const wdCount =
        wdRes.status === 'fulfilled'
          ? wdRes.value?.pagination?.totalItems ?? (wdRes.value?.items?.length || 0)
          : 0

      let dispCount = 0
      if (dispRes.status === 'fulfilled') {
        const list = dispRes.value?.items || []
        dispCount = list.filter(
          (d) =>
            d.status === 'AWAITING_ADMIN_RESOLUTION' ||
            d.status === 'PENDING_EXPERT_RESPONSE'
        ).length
      }

      setPendingBadges({
        applications: appsCount,
        withdrawals: wdCount,
        disputes: dispCount,
      })
    } catch {
      // Bỏ qua lỗi phụ khi tải số đếm
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBadges()
  }, [refreshBadges, activeTab])

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
            Quản trị Chuyên gia & Dịch vụ Tư vấn
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Thẩm định hồ sơ hành nghề, phê duyệt rút tiền, xử lý khiếu nại và cấu hình quy chuẩn vận hành sàn.
          </p>
        </div>
      </div>

      {/* Hệ thống điều hướng phân hệ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-surface-container-low border border-outline-variant/40 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="applications" className="text-xs px-3 py-2 rounded-lg">
            <span>Hồ sơ chuyên gia</span>
            {pendingBadges.applications > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface text-[10px] font-bold tabular-nums">
                {pendingBadges.applications}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="withdrawals" className="text-xs px-3 py-2 rounded-lg">
            <span>Lệnh rút tiền</span>
            {pendingBadges.withdrawals > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface text-[10px] font-bold tabular-nums">
                {pendingBadges.withdrawals}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="disputes" className="text-xs px-3 py-2 rounded-lg">
            <span>Khiếu nại</span>
            {pendingBadges.disputes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface text-[10px] font-bold tabular-nums">
                {pendingBadges.disputes}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="platform-wallet" className="text-xs px-3 py-2 rounded-lg">
            <span>Quỹ & Doanh thu sàn</span>
          </TabsTrigger>

          <TabsTrigger value="specializations" className="text-xs px-3 py-2 rounded-lg">
            <span>Lĩnh vực tư vấn</span>
          </TabsTrigger>

          <TabsTrigger value="fee-configs" className="text-xs px-3 py-2 rounded-lg">
            <span>Khung phí dịch vụ</span>
          </TabsTrigger>

          <TabsTrigger value="expert-certificates" className="text-xs px-3 py-2 rounded-lg">
            <span>Loại chứng chỉ</span>
          </TabsTrigger>

          <TabsTrigger value="expert-search" className="text-xs px-3 py-2 rounded-lg">
            <span>Đề xuất & Tìm kiếm</span>
          </TabsTrigger>

          <TabsTrigger value="platform-policy" className="text-xs px-3 py-2 rounded-lg">
            <span>Chính sách vận hành</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4">
          <ApplicationsTab onBadgeRefresh={refreshBadges} />
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <WithdrawalsTab onBadgeRefresh={refreshBadges} />
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <DisputesTab onBadgeRefresh={refreshBadges} />
        </TabsContent>

        <TabsContent value="platform-wallet" className="mt-4">
          <PlatformWalletTab />
        </TabsContent>

        <TabsContent value="specializations" className="mt-4">
          <SpecializationsTab />
        </TabsContent>

        <TabsContent value="fee-configs" className="mt-4">
          <FeeConfigsTab />
        </TabsContent>

        <TabsContent value="expert-certificates" className="mt-4">
          <ExpertCertificateConfigTab />
        </TabsContent>

        <TabsContent value="expert-search" className="mt-4">
          <ExpertSearchConfigTab />
        </TabsContent>

        <TabsContent value="platform-policy" className="mt-4">
          <PlatformPolicyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1: THẨM ĐỊNH HỒ SƠ CHUYÊN GIA
// ═════════════════════════════════════════════════════════════════════════════

function ApplicationsTab({ onBadgeRefresh }) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('__ALL__')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [certTypeMap, setCertTypeMap] = useState(CERT_TYPE_FALLBACK)

  const [selectedId, setSelectedId] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  useEffect(() => {
    expertCertificateConfigService
      .getAll()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const map = { ...CERT_TYPE_FALLBACK }
          list.forEach((c) => {
            if (c.code && c.name) map[c.code] = c.name
          })
          setCertTypeMap(map)
        }
      })
      .catch(() => {})
  }, [])

  const fetchApplications = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const res = await expertService.getApplications({
          status: statusFilter,
          search: searchQuery,
          page,
          size: 10,
        })
        setItems(res?.items || [])
        if (res?.pagination) {
          setPagination(res.pagination)
        }
      } catch (err) {
        showNotice('error', 'Không thể tải danh sách', err.message)
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, searchQuery]
  )

  useEffect(() => {
    fetchApplications(1)
  }, [fetchApplications])

  const openDetailModal = async (id) => {
    setSelectedId(id)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const data = await expertService.getApplicationById(id)
      setDetailData(data)
    } catch (err) {
      showNotice('error', 'Không thể tải hồ sơ', err.message)
      setSelectedId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetailAndList = async () => {
    if (selectedId) {
      try {
        const updated = await expertService.getApplicationById(selectedId)
        setDetailData(updated)
      } catch {
        // ignore
      }
    }
    fetchApplications(pagination.page)
    onBadgeRefresh?.()
  }

  const pendingCount = items.filter((i) => i.status === 'PendingReview').length
  const supplementCount = items.filter((i) => i.status === 'NeedSupplement').length
  const approvedCount = items.filter((i) => i.status === 'Approved').length

  return (
    <div className="flex flex-col gap-4">
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <Card className="h-full">
          <CardContent className="p-4 h-full flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng số hồ sơ</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-1">
                {pagination.totalItems || items.length}
              </p>
            </div>
            <Badge variant="outline">Toàn hệ thống</Badge>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-4 h-full flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Chờ thẩm định</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-1">{pendingCount}</p>
            </div>
            <StatusBadge label="Cần xử lý" dot="bg-amber-500" />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-4 h-full flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Chờ bổ sung</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-1">
                {supplementCount}
              </p>
            </div>
            <StatusBadge label="Đang chờ" dot="bg-amber-600" />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-4 h-full flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Đã phê duyệt</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-1">
                {approvedCount}
              </p>
            </div>
            <StatusBadge label="Hoạt động" dot="bg-emerald-600" />
          </CardContent>
        </Card>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSearchQuery(searchInput)
            }}
            className="flex flex-1 items-center gap-2"
          >
            <Input
              placeholder="Tìm theo mã hồ sơ, họ tên hoặc chức danh..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 max-w-sm text-xs"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-9 px-3.5 shrink-0">
              Tìm kiếm
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3 shrink-0"
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                }}
              >
                Xóa lọc
              </Button>
            )}
          </form>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Trạng thái hồ sơ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                <SelectItem value="PendingReview">Chờ thẩm định</SelectItem>
                <SelectItem value="NeedSupplement">Cần bổ sung</SelectItem>
                <SelectItem value="Approved">Đã phê duyệt</SelectItem>
                <SelectItem value="Rejected">Từ chối</SelectItem>
                <SelectItem value="Draft">Bản nháp</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3.5 shrink-0"
              onClick={() => fetchApplications(pagination.page)}
            >
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách hồ sơ */}
      <Card>
        {loading ? (
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Đang tải danh sách hồ sơ...</span>
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-1.5">
            <p className="text-sm font-semibold text-on-surface">Không có hồ sơ phù hợp</p>
            <p className="text-xs text-on-surface-variant">
              Chưa có hồ sơ chuyên gia nào khớp với điều kiện lọc hiện tại.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Mã hồ sơ</TableHead>
                <TableHead>Ứng viên & Chức danh</TableHead>
                <TableHead className="text-center w-28">Kinh nghiệm</TableHead>
                <TableHead className="text-center w-32">Chứng chỉ</TableHead>
                <TableHead className="w-36">Ngày gửi</TableHead>
                <TableHead className="w-36">Trạng thái</TableHead>
                <TableHead className="text-right w-28">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((app) => {
                const st = APP_STATUS_MAP[app.status] || {
                  label: app.status,
                  dot: 'bg-stone-400',
                }
                const verifiedCerts =
                  app.verifiedCertificateCount ?? app.verifiedCertificatesCount ?? 0
                const totalCerts = app.certificateCount ?? app.totalCertificatesCount ?? 0
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs font-semibold text-on-surface">
                      {app.applicationNumber || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface text-xs">
                          {app.fullName}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {app.jobTitle || 'Chưa cập nhật chức danh'}
                          {app.companyName ? ` • ${app.companyName}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums">
                      {app.yearsOfExperience ?? 0} năm
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      <Badge variant="outline">
                        {verifiedCerts}/{totalCerts} hợp lệ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-on-surface-variant tabular-nums">
                      {formatDateTime(app.submittedAt || app.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={st.label} dot={st.dot} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => openDetailModal(app.id)}
                      >
                        Thẩm định
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {pagination.totalPages > 1 && (
          <CardFooter className="py-3 px-4 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
            <span>
              Trang <strong className="text-on-surface">{pagination.page}</strong> /{' '}
              {pagination.totalPages} ({pagination.totalItems} hồ sơ)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevious}
                onClick={() => fetchApplications(pagination.page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => fetchApplications(pagination.page + 1)}
              >
                Tiếp
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Dialog thẩm định hồ sơ */}
      <ApplicationDetailDialog
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        loading={detailLoading}
        data={detailData}
        certTypeMap={certTypeMap}
        onUpdated={refreshDetailAndList}
        showNotice={showNotice}
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

function ApplicationDetailDialog({
  open,
  onOpenChange,
  loading,
  data,
  certTypeMap,
  onUpdated,
  showNotice,
}) {
  const [certActionLoading, setCertActionLoading] = useState(null)
  const [certNoteMap, setCertNoteMap] = useState({})
  const [actionMode, setActionMode] = useState(null) // 'approve' | 'supplement' | 'reject'
  const [reasonInput, setReasonInput] = useState('')
  const [reviewNotesInput, setReviewNotesInput] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  useEffect(() => {
    if (data) {
      setActionMode(null)
      setReasonInput('')
      setReviewNotesInput('')
      const notes = {}
      data.certificates?.forEach((c) => {
        notes[c.id] = cleanVerificationNote(c.verificationNote || '')
      })
      setCertNoteMap(notes)
    }
  }, [data])

  const handleVerifyCert = async (certId, status) => {
    if (!data) return
    const note = (certNoteMap[certId] || '').trim()
    if (status === 'Rejected' && !note) {
      showNotice('warning', 'Thiếu lý do', 'Vui lòng nhập ghi chú lý do khi từ chối chứng chỉ.')
      return
    }
    setCertActionLoading(certId)
    try {
      await expertService.verifyCertificate(data.id, certId, {
        verificationStatus: status,
        verificationNote: note || null,
      })
      showNotice('success', 'Đã cập nhật chứng chỉ', 'Trạng thái thẩm định chứng chỉ đã được lưu.')
      await onUpdated()
    } catch (err) {
      showNotice('error', 'Không thể thẩm định chứng chỉ', err.message)
    } finally {
      setCertActionLoading(null)
    }
  }

  const handleFinalSubmit = async () => {
    if (!data || !actionMode) return
    setSubmittingAction(true)
    try {
      if (actionMode === 'approve') {
        await expertService.approveApplication(data.id, reviewNotesInput.trim() || null)
        showNotice(
          'success',
          'Đã phê duyệt hồ sơ',
          `Ứng viên ${data.fullName} đã trở thành chuyên gia.`
        )
      } else if (actionMode === 'supplement') {
        if (!reasonInput.trim() || reasonInput.trim().length < 5) {
          showNotice(
            'warning',
            'Nội dung quá ngắn',
            'Vui lòng nhập nội dung yêu cầu bổ sung tối thiểu 5 ký tự.'
          )
          setSubmittingAction(false)
          return
        }
        await expertService.requestSupplement(data.id, reasonInput.trim())
        showNotice(
          'info',
          'Đã gửi yêu cầu bổ sung',
          'Ứng viên sẽ nhận được thông báo chỉnh sửa hồ sơ.'
        )
      } else if (actionMode === 'reject') {
        if (!reasonInput.trim() || reasonInput.trim().length < 5) {
          showNotice(
            'warning',
            'Nội dung quá ngắn',
            'Vui lòng nhập lý do từ chối tối thiểu 5 ký tự.'
          )
          setSubmittingAction(false)
          return
        }
        await expertService.rejectApplication(data.id, reasonInput.trim())
        showNotice(
          'info',
          'Đã từ chối hồ sơ',
          'Hồ sơ đăng ký đã chuyển sang trạng thái từ chối.'
        )
      }
      await onUpdated()
      onOpenChange(false)
    } catch (err) {
      showNotice('error', 'Thao tác không thành công', err.message)
    } finally {
      setSubmittingAction(false)
    }
  }

  const stInfo = data
    ? APP_STATUS_MAP[data.status] || { label: data.status, dot: 'bg-stone-400' }
    : null

  const hasBioAndExp = Boolean(data?.bio && data?.experienceDescription)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header cố định */}
        <DialogHeader className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-lowest">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-base font-bold text-on-surface">
                Thẩm định hồ sơ chuyên gia {data?.applicationNumber ? `#${data.applicationNumber}` : ''}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-on-surface-variant">
                {data?.submittedAt
                  ? `Ngày nộp hồ sơ: ${formatDateTime(data.submittedAt)}`
                  : 'Kiểm tra văn bằng hành nghề, kinh nghiệm chuyên môn và mức phí đề xuất.'}
              </DialogDescription>
            </div>
            {stInfo && <StatusBadge label={stInfo.label} dot={stInfo.dot} />}
          </div>
        </DialogHeader>

        {loading || !data ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải chi tiết hồ sơ...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. Thông tin ứng viên (Bố cục lưới đồng đều) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  1. Thông tin ứng viên
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/25 flex flex-col justify-between h-full">
                  <span className="text-[11px] font-medium text-on-surface-variant">Họ và tên</span>
                  <p className="font-bold text-on-surface text-sm mt-1 truncate" title={data.fullName}>
                    {data.fullName || '—'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/25 flex flex-col justify-between h-full">
                  <span className="text-[11px] font-medium text-on-surface-variant">Chức danh</span>
                  <p className="font-semibold text-on-surface text-xs mt-1 truncate" title={data.jobTitle}>
                    {data.jobTitle || 'Chưa cập nhật'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/25 flex flex-col justify-between h-full">
                  <span className="text-[11px] font-medium text-on-surface-variant">Đơn vị công tác</span>
                  <p className="font-semibold text-on-surface text-xs mt-1 truncate" title={data.companyName}>
                    {data.companyName || 'Tự do / Cá nhân'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/25 flex flex-col justify-between h-full">
                  <span className="text-[11px] font-medium text-on-surface-variant">Thâm niên</span>
                  <p className="font-bold text-on-surface text-sm mt-1 tabular-nums">
                    {data.yearsOfExperience ?? 0} năm kinh nghiệm
                  </p>
                </div>
              </div>

              {/* Lĩnh vực đăng ký */}
              <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">
                  Lĩnh vực chuyên môn đăng ký
                </span>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {data.specializations?.length > 0 ? (
                    data.specializations.map((sp) => (
                      <Badge key={sp.id} variant="outline">
                        {sp.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-on-surface-variant">Chưa chọn lĩnh vực</span>
                  )}
                </div>
              </div>

              {/* Giới thiệu & Kinh nghiệm thực tế */}
              {(data.bio || data.experienceDescription) && (
                <div
                  className={`grid grid-cols-1 ${
                    hasBioAndExp ? 'md:grid-cols-2' : ''
                  } gap-3 items-stretch`}
                >
                  {data.bio && (
                    <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest flex flex-col gap-1.5 h-full">
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        Giới thiệu bản thân
                      </span>
                      <p className="text-on-surface leading-relaxed whitespace-pre-line">
                        {data.bio}
                      </p>
                    </div>
                  )}
                  {data.experienceDescription && (
                    <div className="p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest flex flex-col gap-1.5 h-full">
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        Kinh nghiệm tư vấn thực tế
                      </span>
                      <p className="text-on-surface leading-relaxed whitespace-pre-line">
                        {data.experienceDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Danh sách văn bằng & chứng chỉ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  2. Văn bằng & Chứng chỉ hành nghề ({data.certificates?.length || 0})
                </h4>
              </div>

              {!data.certificates || data.certificates.length === 0 ? (
                <div className="p-6 rounded-xl border border-outline-variant/40 bg-surface-container-low/20 text-center text-on-surface-variant">
                  Ứng viên chưa đính kèm chứng chỉ hành nghề nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.certificates.map((cert) => {
                    const cst = CERT_STATUS_MAP[cert.verificationStatus] || {
                      label: cert.verificationStatus,
                      dot: 'bg-stone-400',
                    }
                    const isBusy = certActionLoading === cert.id
                    return (
                      <div
                        key={cert.id}
                        className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest overflow-hidden"
                      >
                        {/* Thanh tiêu đề chứng chỉ */}
                        <div className="px-4 py-2.5 bg-surface-container-low/35 border-b border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-on-surface text-xs truncate">
                              {cert.certificateName}
                            </span>
                            <StatusBadge label={cst.label} dot={cst.dot} />
                          </div>

                          {cert.fileUrl && (
                            <a
                              href={cert.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-7 px-3 rounded-md border border-outline-variant/60 bg-white text-[11px] font-semibold text-on-surface hover:bg-surface-container-low transition shrink-0"
                            >
                              Xem bản chụp văn bằng
                            </a>
                          )}
                        </div>

                        {/* Lưới 4 cột thông tin chứng chỉ đồng nhất */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-outline-variant/25">
                          <div>
                            <span className="text-[11px] text-on-surface-variant block">
                              Phân loại
                            </span>
                            <p className="font-semibold text-on-surface mt-0.5 leading-snug">
                              {certTypeMap[cert.certificateType] || cert.certificateType}
                            </p>
                          </div>

                          <div>
                            <span className="text-[11px] text-on-surface-variant block">
                              Số hiệu văn bằng
                            </span>
                            <p className="font-mono font-semibold text-on-surface mt-0.5 tabular-nums">
                              {cert.certificateNumber || '—'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[11px] text-on-surface-variant block">
                              Cơ quan cấp
                            </span>
                            <p className="font-semibold text-on-surface mt-0.5 leading-snug">
                              {cert.issuingAuthority || '—'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[11px] text-on-surface-variant block">
                              Thời hạn hiệu lực
                            </span>
                            <p className="font-semibold text-on-surface mt-0.5 tabular-nums">
                              {formatDate(cert.issueDate)}
                              {cert.expiryDate
                                ? ` → ${formatDate(cert.expiryDate)}`
                                : ' (Vô thời hạn)'}
                            </p>
                          </div>
                        </div>

                        {/* Dòng xác minh chứng chỉ thẳng hàng */}
                        <div className="px-4 py-2.5 bg-surface-container-lowest flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            placeholder="Ghi chú đối soát hoặc lý do từ chối chứng chỉ..."
                            value={certNoteMap[cert.id] ?? ''}
                            onChange={(e) =>
                              setCertNoteMap((prev) => ({ ...prev, [cert.id]: e.target.value }))
                            }
                            className="h-8 text-xs flex-1"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant={cert.verificationStatus === 'Verified' ? 'default' : 'outline'}
                              disabled={isBusy}
                              onClick={() => handleVerifyCert(cert.id, 'Verified')}
                              className="h-8 px-3 text-xs"
                            >
                              Xác nhận hợp lệ
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleVerifyCert(cert.id, 'Rejected')}
                              className="h-8 px-3 text-xs text-red-600 hover:text-red-700"
                            >
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 3. Mức phí đề xuất */}
            {data.feeProposals?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  3. Mức phí tư vấn đề xuất ({data.feeProposals.length})
                </h4>
                <div className="rounded-xl border border-outline-variant/50 overflow-hidden bg-surface-container-lowest">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hình thức dịch vụ</TableHead>
                        <TableHead className="text-center w-44">Thời lượng tiêu chuẩn</TableHead>
                        <TableHead className="text-right w-48">Mức phí đăng ký</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.feeProposals.map((fp) => (
                        <TableRow key={fp.id}>
                          <TableCell className="font-semibold text-xs text-on-surface">
                            {SESSION_TYPE_MAP[fp.sessionType] || fp.sessionType}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-on-surface-variant">
                            {fp.durationMinutes} phút / ca
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-on-surface">
                            {formatCurrency(fp.proposedFee)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Lý do từ chối / yêu cầu bổ sung trước đó (nếu có) */}
            {(data.rejectionReason || data.supplementRequestReason) && (
              <div className="p-3.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/30 space-y-1">
                <span className="text-[11px] font-bold text-on-surface">
                  {data.rejectionReason
                    ? 'Lý do từ chối hồ sơ đã ghi nhận'
                    : 'Nội dung yêu cầu bổ sung đã gửi'}
                </span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {data.rejectionReason || data.supplementRequestReason}
                </p>
              </div>
            )}

            {/* 4. Khung nhập thông tin khi chọn thao tác quyết định */}
            {actionMode && (
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">
                    {actionMode === 'approve' && 'Xác nhận phê duyệt hồ sơ chuyên gia'}
                    {actionMode === 'supplement' && 'Gửi yêu cầu ứng viên bổ sung hồ sơ'}
                    {actionMode === 'reject' && 'Xác nhận từ chối hồ sơ đăng ký'}
                  </span>
                  <Badge variant="outline">
                    {actionMode === 'approve'
                      ? 'Phê duyệt'
                      : actionMode === 'supplement'
                        ? 'Yêu cầu bổ sung'
                        : 'Từ chối'}
                  </Badge>
                </div>

                {actionMode === 'approve' ? (
                  <div className="space-y-1.5">
                    <Label>Ghi chú phê duyệt (tùy chọn)</Label>
                    <Input
                      placeholder="Nhập ghi chú lưu lịch sử xét duyệt..."
                      value={reviewNotesInput}
                      onChange={(e) => setReviewNotesInput(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>
                      {actionMode === 'supplement'
                        ? 'Nội dung yêu cầu ứng viên bổ sung *'
                        : 'Lý do từ chối hồ sơ *'}
                    </Label>
                    <Textarea
                      rows={2}
                      placeholder="Nhập nội dung rõ ràng để thông báo cho ứng viên (tối thiểu 5 ký tự)..."
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Thanh hành động hợp nhất ở chân hộp thoại */}
        <DialogFooter className="px-6 py-3.5 border-t border-outline-variant/40 bg-surface-container-lowest flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-4"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>

          {!loading && data && (
            <div className="flex items-center gap-2">
              {actionMode ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3.5"
                    disabled={submittingAction}
                    onClick={() => setActionMode(null)}
                  >
                    Hủy thao tác
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={actionMode === 'reject' ? 'destructive' : 'default'}
                    className="h-9 px-4"
                    disabled={submittingAction}
                    onClick={handleFinalSubmit}
                  >
                    {submittingAction ? 'Đang xử lý...' : 'Xác nhận quyết định'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-3.5 text-red-600 hover:text-red-700"
                    onClick={() => setActionMode('reject')}
                  >
                    Từ chối hồ sơ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-3.5"
                    onClick={() => setActionMode('supplement')}
                  >
                    Yêu cầu bổ sung
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-9 px-4"
                    onClick={() => setActionMode('approve')}
                  >
                    Phê duyệt hồ sơ
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2: DUYỆT LỆNH RÚT TIỀN
// ═════════════════════════════════════════════════════════════════════════════

function WithdrawalsTab({ onBadgeRefresh }) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('__ALL__')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [processModal, setProcessModal] = useState({
    open: false,
    item: null,
    action: 'APPROVE',
    transactionReference: '',
    rejectionReason: '',
    adminNotes: '',
    submitting: false,
  })
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchWithdrawals = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const res = await expertService.getAdminWithdrawals({
          status: statusFilter,
          page,
          size: 10,
        })
        setItems(res?.items || [])
        if (res?.pagination) setPagination(res.pagination)
      } catch (err) {
        showNotice('error', 'Không thể tải lệnh rút tiền', err.message)
      } finally {
        setLoading(false)
      }
    },
    [statusFilter]
  )

  useEffect(() => {
    fetchWithdrawals(1)
  }, [fetchWithdrawals])

  const filteredItems = items.filter((w) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      (w.userFullName || '').toLowerCase().includes(q) ||
      (w.accountName || '').toLowerCase().includes(q) ||
      (w.accountNumber || '').toLowerCase().includes(q) ||
      (w.bankName || '').toLowerCase().includes(q) ||
      (w.transactionReference || '').toLowerCase().includes(q)
    )
  })

  const handleProcessSubmit = async (e) => {
    e.preventDefault()
    const { item, action, transactionReference, rejectionReason, adminNotes } = processModal
    if (!item) return

    if (action === 'REJECT' && !rejectionReason.trim()) {
      showNotice('warning', 'Thiếu lý do từ chối', 'Vui lòng nhập lý do từ chối để hoàn tiền về ví.')
      return
    }

    setProcessModal((prev) => ({ ...prev, submitting: true }))
    try {
      await expertService.processWithdrawal(item.id, {
        action,
        transactionReference: transactionReference.trim() || null,
        rejectionReason: rejectionReason.trim() || null,
        adminNotes: adminNotes.trim() || null,
      })
      setProcessModal((prev) => ({ ...prev, open: false, submitting: false }))
      showNotice(
        'success',
        action === 'APPROVE' ? 'Đã xác nhận chuyển khoản' : 'Đã từ chối lệnh rút',
        action === 'APPROVE'
          ? 'Lệnh rút tiền đã hoàn tất.'
          : 'Số tiền đã được hoàn trả về số dư khả dụng của người yêu cầu.'
      )
      fetchWithdrawals(pagination.page)
      onBadgeRefresh?.()
    } catch (err) {
      setProcessModal((prev) => ({ ...prev, submitting: false }))
      showNotice('error', 'Xử lý không thành công', err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <Input
            placeholder="Tìm theo tên người rút, ngân hàng, số tài khoản hoặc mã ủy nhiệm chi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="COMPLETED">Đã chuyển khoản</SelectItem>
                <SelectItem value="REJECTED">Đã từ chối</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchWithdrawals(pagination.page)}
            >
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải danh sách lệnh rút tiền...</span>
          </CardContent>
        ) : filteredItems.length === 0 ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-1.5">
            <p className="text-sm font-semibold text-on-surface">Chưa có lệnh rút tiền</p>
            <p className="text-xs text-on-surface-variant">
              Không có yêu cầu rút tiền nào khớp với bộ lọc hiện tại.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người yêu cầu</TableHead>
                <TableHead>Tài khoản thụ hưởng</TableHead>
                <TableHead className="text-right">Số tiền rút</TableHead>
                <TableHead>Thời gian tạo</TableHead>
                <TableHead>Mã tham chiếu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((w) => {
                const st = WITHDRAWAL_STATUS_MAP[w.status] || {
                  label: w.status,
                  dot: 'bg-stone-400',
                }
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-semibold text-on-surface">
                      {w.userFullName || 'Chuyên gia'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">
                          {w.bankName} • {w.accountNumber}
                        </span>
                        <span className="text-[11px] text-on-surface-variant uppercase">
                          {w.accountName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-on-surface tabular-nums">
                      {formatCurrency(w.amount)}
                    </TableCell>
                    <TableCell className="text-on-surface-variant tabular-nums">
                      {formatDateTime(w.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-on-surface-variant">
                      {w.transactionReference || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={st.label} dot={st.dot} />
                    </TableCell>
                    <TableCell className="text-right">
                      {w.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2.5 text-[11px]"
                            onClick={() =>
                              setProcessModal({
                                open: true,
                                item: w,
                                action: 'APPROVE',
                                transactionReference: '',
                                rejectionReason: '',
                                adminNotes: '',
                                submitting: false,
                              })
                            }
                          >
                            Xác nhận chuyển
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] text-red-600 hover:text-red-700"
                            onClick={() =>
                              setProcessModal({
                                open: true,
                                item: w,
                                action: 'REJECT',
                                transactionReference: '',
                                rejectionReason: '',
                                adminNotes: '',
                                submitting: false,
                              })
                            }
                          >
                            Từ chối
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant">
                          {w.processedAt ? formatDate(w.processedAt) : 'Đã xử lý'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog xử lý lệnh rút */}
      <Dialog
        open={processModal.open}
        onOpenChange={(open) => setProcessModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {processModal.action === 'APPROVE'
                ? 'Xác nhận đã chuyển khoản'
                : 'Từ chối lệnh rút tiền'}
            </DialogTitle>
            <DialogDescription>
              {processModal.item &&
                `${processModal.item.userFullName} • ${formatCurrency(processModal.item.amount)} (${processModal.item.bankName} - ${processModal.item.accountNumber})`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProcessSubmit} className="flex flex-col gap-3.5">
            {processModal.action === 'APPROVE' ? (
              <div className="flex flex-col gap-1.5">
                <Label>Mã giao dịch ngân hàng / Ủy nhiệm chi</Label>
                <Input
                  placeholder="VD: FT263019283..."
                  value={processModal.transactionReference}
                  onChange={(e) =>
                    setProcessModal((prev) => ({
                      ...prev,
                      transactionReference: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>
                  Lý do từ chối <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Nhập lý do từ chối (ví dụ: Sai thông tin chủ tài khoản)..."
                  value={processModal.rejectionReason}
                  onChange={(e) =>
                    setProcessModal((prev) => ({ ...prev, rejectionReason: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Ghi chú đối soát</Label>
              <Input
                placeholder="Ghi chú nội bộ (tùy chọn)..."
                value={processModal.adminNotes}
                onChange={(e) =>
                  setProcessModal((prev) => ({ ...prev, adminNotes: e.target.value }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProcessModal((prev) => ({ ...prev, open: false }))}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant={processModal.action === 'REJECT' ? 'destructive' : 'default'}
                disabled={processModal.submitting}
              >
                {processModal.submitting
                  ? 'Đang lưu...'
                  : processModal.action === 'APPROVE'
                  ? 'Xác nhận hoàn tất'
                  : 'Từ chối & Hoàn tiền'}
              </Button>
            </DialogFooter>
          </form>
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3: XỬ LÝ KHIẾU NẠI DỊCH VỤ
// ═════════════════════════════════════════════════════════════════════════════

function DisputesTab({ onBadgeRefresh }) {
  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState('__ALL__')
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [resolveForm, setResolveForm] = useState({
    resolutionType: 'FULL_REFUND',
    refundPercent: 50,
    adminNotes: '',
    penalizeExpert: false,
    submitting: false,
  })
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await expertService.getAdminDisputes({
        status: statusFilter,
        page: 1,
        size: 50,
      })
      setItems(res?.items || [])
    } catch (err) {
      showNotice('error', 'Không thể tải danh sách khiếu nại', err.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const openDisputeDetail = async (id) => {
    setDetailLoading(true)
    setSelectedDispute(null)
    try {
      const detail = await expertService.getDisputeDetail(id)
      setSelectedDispute(detail)
      setResolveForm({
        resolutionType: 'FULL_REFUND',
        refundPercent: 50,
        adminNotes: detail.adminResolution || detail.adminResolutionNotes || '',
        penalizeExpert: false,
        submitting: false,
      })
    } catch (err) {
      showNotice('error', 'Không thể tải chi tiết khiếu nại', err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleResolveSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDispute) return
    if (!resolveForm.adminNotes.trim() || resolveForm.adminNotes.trim().length < 10) {
      showNotice('warning', 'Thiếu kết luận', 'Vui lòng nhập kết luận đối soát tối thiểu 10 ký tự.')
      return
    }

    setResolveForm((prev) => ({ ...prev, submitting: true }))
    try {
      await expertService.resolveDispute(selectedDispute.id, {
        decisionType: resolveForm.resolutionType,
        refundRatePercent:
          resolveForm.resolutionType === 'PARTIAL' ? Number(resolveForm.refundPercent) : null,
        resolution: resolveForm.adminNotes.trim(),
        adminNotes: resolveForm.adminNotes.trim(),
      })
      setSelectedDispute(null)
      showNotice('success', 'Đã ban hành phán quyết', 'Giao dịch tài chính đã được quyết toán theo phán quyết.')
      fetchDisputes()
      onBadgeRefresh?.()
    } catch (err) {
      setResolveForm((prev) => ({ ...prev, submitting: false }))
      showNotice('error', 'Không thể lưu phán quyết', err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-on-surface-variant">
            Danh sách các ca tư vấn phát sinh khiếu nại chất lượng dịch vụ
          </span>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <SelectValue placeholder="Trạng thái khiếu nại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING_EXPERT_RESPONSE">Chờ chuyên gia giải trình</SelectItem>
                <SelectItem value="AWAITING_ADMIN_RESOLUTION">Chờ phán quyết</SelectItem>
                <SelectItem value="RESOLVED_FULL_REFUND">Đã hoàn 100% cho khách</SelectItem>
                <SelectItem value="RESOLVED_SETTLE_EXPERT">Đã giải ngân chuyên gia</SelectItem>
                <SelectItem value="RESOLVED_PARTIAL">Hoàn tiền một phần</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={fetchDisputes}>
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải danh sách khiếu nại...</span>
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-1.5">
            <p className="text-sm font-semibold text-on-surface">Không có vụ việc khiếu nại</p>
            <p className="text-xs text-on-surface-variant">
              Hiện không có ca tư vấn nào đang phát sinh khiếu nại.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã lịch hẹn</TableHead>
                <TableHead>Khách hàng & Chuyên gia</TableHead>
                <TableHead>Lý do khiếu nại</TableHead>
                <TableHead className="text-right">Số tiền tạm giữ</TableHead>
                <TableHead>Ngày gửi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => {
                const st = DISPUTE_STATUS_MAP[d.status] || {
                  label: d.status,
                  dot: 'bg-stone-400',
                }
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono font-semibold text-on-surface">
                      #{d.bookingCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">
                          {d.taxpayerFullName || d.userFullName}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          Chuyên gia: {d.expertFullName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {DISPUTE_REASON_MAP[d.reason] || d.reason}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {formatCurrency(d.totalFee ?? d.disputedAmount ?? d.escrowAmount)}
                    </TableCell>
                    <TableCell className="text-on-surface-variant tabular-nums">
                      {formatDateTime(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={st.label} dot={st.dot} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => openDisputeDetail(d.id)}
                      >
                        Xem & Phán quyết
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog chi tiết & phán quyết khiếu nại */}
      <Dialog
        open={Boolean(selectedDispute) || detailLoading}
        onOpenChange={(open) => !open && setSelectedDispute(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Hồ sơ khiếu nại {selectedDispute?.bookingCode ? `#${selectedDispute.bookingCode}` : ''}
            </DialogTitle>
            <DialogDescription>
              Đối chiếu nội dung phản ánh của khách hàng và giải trình của chuyên gia để quyết toán.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedDispute ? (
            <div className="py-12 flex justify-center">
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40">
                <div>
                  <span className="text-[11px] text-on-surface-variant">Người khiếu nại</span>
                  <p className="font-bold text-on-surface mt-0.5">
                    {selectedDispute.taxpayerFullName || selectedDispute.userFullName}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant">Chuyên gia phụ trách</span>
                  <p className="font-bold text-on-surface mt-0.5">
                    {selectedDispute.expertFullName}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant">Lý do khiếu nại</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {DISPUTE_REASON_MAP[selectedDispute.reason] || selectedDispute.reason}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant">Số tiền đang tạm giữ</span>
                  <p className="font-mono font-bold text-on-surface tabular-nums mt-0.5">
                    {formatCurrency(
                      selectedDispute.totalFee ??
                        selectedDispute.disputedAmount ??
                        selectedDispute.escrowAmount
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-outline-variant/50">
                  <span className="text-[11px] font-bold text-on-surface">
                    Phản ánh từ khách hàng
                  </span>
                  <p className="text-on-surface mt-1.5 leading-relaxed">
                    {selectedDispute.description || 'Không có mô tả.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-outline-variant/50">
                  <span className="text-[11px] font-bold text-on-surface">
                    Giải trình từ chuyên gia
                  </span>
                  <p className="text-on-surface mt-1.5 leading-relaxed">
                    {selectedDispute.expertResponse ||
                      'Chuyên gia chưa gửi nội dung giải trình.'}
                  </p>
                </div>
              </div>

              {selectedDispute.status === 'PENDING_EXPERT_RESPONSE' ||
              selectedDispute.status === 'AWAITING_ADMIN_RESOLUTION' ? (
                <form
                  onSubmit={handleResolveSubmit}
                  className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 flex flex-col gap-3.5"
                >
                  <h4 className="text-xs font-bold text-on-surface">Ban hành phán quyết cuối cùng</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label>Phương án xử lý</Label>
                      <Select
                        value={resolveForm.resolutionType}
                        onValueChange={(val) =>
                          setResolveForm((prev) => ({ ...prev, resolutionType: val }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_REFUND">
                            Hoàn 100% phí cho khách hàng
                          </SelectItem>
                          <SelectItem value="SETTLE_EXPERT">
                            Bác khiếu nại • Giải ngân cho chuyên gia
                          </SelectItem>
                          <SelectItem value="PARTIAL">
                            Hoàn tiền một phần theo tỷ lệ
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {resolveForm.resolutionType === 'PARTIAL' && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Tỷ lệ hoàn cho khách (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={resolveForm.refundPercent}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              refundPercent: Number(e.target.value) || 50,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Kết luận đối soát <span className="text-red-600">*</span>
                    </Label>
                    <Textarea
                      rows={2}
                      placeholder="Nhập căn cứ và kết luận giải quyết tranh chấp (tối thiểu 10 ký tự)..."
                      value={resolveForm.adminNotes}
                      onChange={(e) =>
                        setResolveForm((prev) => ({ ...prev, adminNotes: e.target.value }))
                      }
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedDispute(null)}
                    >
                      Đóng
                    </Button>
                    <Button type="submit" disabled={resolveForm.submitting}>
                      {resolveForm.submitting ? 'Đang thực thi...' : 'Xác nhận phán quyết'}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40">
                  <span className="text-[11px] font-semibold text-on-surface-variant">
                    Kết luận đã ban hành
                  </span>
                  <p className="text-on-surface font-medium mt-1">
                    {selectedDispute.adminResolution ||
                      selectedDispute.adminResolutionNotes ||
                      'Đã hoàn tất xử lý.'}
                  </p>
                </div>
              )}
            </div>
          )}
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB 4: QUỸ & DOANH THU SÀN (ĐỒNG BỘ 100% VỚI BACKEND WALLET & ESCROW)
// ═════════════════════════════════════════════════════════════════════════════

function PlatformWalletTab() {
  const [wallet, setWallet] = useState(null)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [subTab, setSubTab] = useState('platform-tx')

  // Tab 2: Lịch sử rút tiền doanh thu sàn
  const [platformWithdrawals, setPlatformWithdrawals] = useState([])
  const [wdPagination, setWdPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [loadingWd, setLoadingWd] = useState(false)

  // Tab 3: Sổ cái giao dịch tạm giữ
  const [escrowItems, setEscrowItems] = useState([])
  const [escrowPagination, setEscrowPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('__ALL__')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [loadingEscrow, setLoadingEscrow] = useState(true)
  const [selectedTx, setSelectedTx] = useState(null)

  // Modal Admin rút doanh thu sàn
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: 'Techcombank',
    accountNumber: '',
    accountName: '',
    submitting: false,
  })

  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })
  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchWalletSummary = useCallback(async () => {
    setLoadingWallet(true)
    try {
      const data = await expertService.getAdminPlatformWallet()
      setWallet(data)
    } catch (err) {
      showNotice('error', 'Không thể tải báo cáo quỹ sàn', err.message)
    } finally {
      setLoadingWallet(false)
    }
  }, [])

  const fetchPlatformWithdrawals = useCallback(async (page = 1) => {
    setLoadingWd(true)
    try {
      const res = await expertService.getPlatformWithdrawals({ page, size: 10 })
      setPlatformWithdrawals(res?.items || [])
      if (res?.pagination) setWdPagination(res.pagination)
    } catch (err) {
      showNotice('error', 'Không thể tải lịch sử rút doanh thu', err.message)
    } finally {
      setLoadingWd(false)
    }
  }, [])

  const fetchEscrowList = useCallback(
    async (page = 1) => {
      setLoadingEscrow(true)
      try {
        const res = await expertService.getEscrowTransactions({
          page,
          size: 10,
          status: statusFilter,
          search: searchQuery,
          sort: sortBy,
        })
        setEscrowItems(res?.items || [])
        if (res?.pagination) setEscrowPagination(res.pagination)
      } catch (err) {
        showNotice('error', 'Không thể tải sổ cái giao dịch', err.message)
      } finally {
        setLoadingEscrow(false)
      }
    },
    [statusFilter, searchQuery, sortBy]
  )

  useEffect(() => {
    fetchWalletSummary()
    fetchPlatformWithdrawals(1)
  }, [fetchWalletSummary, fetchPlatformWithdrawals])

  useEffect(() => {
    fetchEscrowList(1)
  }, [fetchEscrowList])

  const handleOpenWithdrawModal = () => {
    const avail = Number(wallet?.platformAvailableBalance || 0)
    setWithdrawForm({
      amount: avail >= 50000 ? String(Math.floor(avail)) : '50000',
      bankName: 'Techcombank',
      accountNumber: '',
      accountName: '',
      submitting: false,
    })
    setWithdrawModalOpen(true)
  }

  const handleAdminWithdrawSubmit = async (e) => {
    e.preventDefault()
    const amountNum = Number(String(withdrawForm.amount).replace(/\D/g, ''))
    const avail = Number(wallet?.platformAvailableBalance || 0)

    if (!amountNum || amountNum < 50000) {
      showNotice('warning', 'Số tiền chưa hợp lệ', 'Số tiền rút tối thiểu là 50.000 VNĐ.')
      return
    }
    if (amountNum > avail) {
      showNotice(
        'warning',
        'Vượt quá số dư khả dụng',
        `Số tiền rút không được vượt quá số dư doanh thu khả dụng (${formatCurrency(avail)}).`
      )
      return
    }
    if (!withdrawForm.bankName.trim() || !withdrawForm.accountNumber.trim() || !withdrawForm.accountName.trim()) {
      showNotice('warning', 'Thiếu thông tin ngân hàng', 'Vui lòng nhập đầy đủ ngân hàng, số tài khoản và tên chủ tài khoản.')
      return
    }

    setWithdrawForm((prev) => ({ ...prev, submitting: true }))
    try {
      await expertService.withdrawPlatformRevenue({
        amount: amountNum,
        bankName: withdrawForm.bankName.trim(),
        accountNumber: withdrawForm.accountNumber.trim(),
        accountName: withdrawForm.accountName.trim().toUpperCase(),
      })
      setWithdrawModalOpen(false)
      showNotice('success', 'Rút doanh thu thành công', `Đã ghi nhận lệnh rút ${formatCurrency(amountNum)} về tài khoản ngân hàng.`)
      fetchWalletSummary()
      fetchPlatformWithdrawals(1)
    } catch (err) {
      setWithdrawForm((prev) => ({ ...prev, submitting: false }))
      showNotice('error', 'Không thể rút doanh thu', err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. 6 Chỉ số tài chính vĩ mô */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Tổng dòng tiền qua sàn
              </span>
              <Badge variant="outline">Toàn thời gian</Badge>
            </div>
            <p className="text-xl font-bold text-on-surface font-mono tabular-nums mt-1">
              {loadingWallet ? '...' : formatCurrency(wallet?.totalGrossVolume ?? 0)}
            </p>
            <span className="text-[11px] text-on-surface-variant">
              Tổng phí khách hàng đã thanh toán thực tế
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Tổng tiền đang tạm giữ
              </span>
              <StatusBadge label="Đang bảo đảm" dot="bg-amber-500" />
            </div>
            <p className="text-xl font-bold text-on-surface font-mono tabular-nums mt-1">
              {loadingWallet ? '...' : formatCurrency(wallet?.escrowHoldingBalance ?? 0)}
            </p>
            <span className="text-[11px] text-on-surface-variant tabular-nums">
              Giữ hộ chuyên gia: {formatCurrency(wallet?.pendingExpertReceivable ?? 0)} • Phí sàn chờ:{' '}
              {formatCurrency(wallet?.pendingPlatformCommission ?? 0)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Doanh thu phí dịch vụ thực nhận
              </span>
              <Badge variant="secondary">
                Phí sàn: {wallet?.currentCommissionRatePercent ?? 20}%
              </Badge>
            </div>
            <p className="text-xl font-bold text-on-surface font-mono tabular-nums mt-1">
              {loadingWallet ? '...' : formatCurrency(wallet?.realizedPlatformRevenue ?? 0)}
            </p>
            <span className="text-[11px] text-on-surface-variant">
              Tiền phí dịch vụ từ các ca đã hoàn thành
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">
              Đã giải ngân cho chuyên gia
            </span>
            <p className="text-lg font-bold text-on-surface font-mono tabular-nums mt-0.5">
              {loadingWallet ? '...' : formatCurrency(wallet?.totalSettledToExperts ?? 0)}
            </p>
            <span className="text-[11px] text-on-surface-variant tabular-nums">
              {wallet?.stats?.settledCount ?? 0} ca tư vấn đã tất toán
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">
              Đã hoàn trả người nộp thuế
            </span>
            <p className="text-lg font-bold text-on-surface font-mono tabular-nums mt-0.5">
              {loadingWallet ? '...' : formatCurrency(wallet?.totalRefundedToTaxpayers ?? 0)}
            </p>
            <span className="text-[11px] text-on-surface-variant tabular-nums">
              {(wallet?.stats?.refundedCount ?? 0) + (wallet?.stats?.partiallyRefundedCount ?? 0)} ca hoàn tiền
            </span>
          </CardContent>
        </Card>

        {/* 2. Khối Ví Quỹ Doanh Thu Hệ Thống */}
        <Card className="border-primary/30 bg-surface-container-low/50">
          <CardContent className="p-4 flex flex-col justify-between gap-2 h-full">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-on-surface">
                  Quỹ doanh thu sàn khả dụng
                </span>
                <p className="text-xl font-bold text-primary font-mono tabular-nums mt-0.5">
                  {loadingWallet ? '...' : formatCurrency(wallet?.platformAvailableBalance ?? 0)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenWithdrawModal}
                disabled={loadingWallet || Number(wallet?.platformAvailableBalance || 0) < 50000}
              >
                Rút doanh thu
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/30 tabular-nums">
              <span>Đã rút: {formatCurrency(wallet?.platformTotalWithdrawn ?? 0)}</span>
              <button
                type="button"
                onClick={() => {
                  fetchWalletSummary()
                  fetchPlatformWithdrawals(wdPagination.page)
                  fetchEscrowList(escrowPagination.page)
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Làm mới số liệu
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Các bảng lịch sử đối soát (3 Tabs) */}
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="bg-surface-container-low border border-outline-variant/40 p-1 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="platform-tx" className="text-xs px-3 py-1.5 rounded-lg">
            Biến động doanh thu sàn ({wallet?.recentPlatformTransactions?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="platform-withdrawals" className="text-xs px-3 py-1.5 rounded-lg">
            Lịch sử rút doanh thu ({wdPagination.totalItems || platformWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="escrow-ledger" className="text-xs px-3 py-1.5 rounded-lg">
            Sổ cái giao dịch tạm giữ ({escrowPagination.totalItems || escrowItems.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BIẾN ĐỘNG DOANH THU SÀN */}
        <TabsContent value="platform-tx" className="mt-3">
          <Card>
            {loadingWallet ? (
              <CardContent className="py-14 flex justify-center">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </CardContent>
            ) : !wallet?.recentPlatformTransactions?.length ? (
              <CardContent className="py-12 text-center text-xs text-on-surface-variant">
                Chưa phát sinh biến động doanh thu sàn.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Phân loại</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-right">Số dư sau giao dịch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.recentPlatformTransactions.map((tx) => {
                    const meta = PLATFORM_TX_TYPE_MAP[tx.transactionType] || {
                      label: tx.transactionType,
                      isPositive: Number(tx.amount) >= 0,
                    }
                    const isPos = Number(tx.amount) >= 0
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-on-surface-variant tabular-nums">
                          {formatDateTime(tx.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={meta.label}
                            dot={isPos ? 'bg-emerald-600' : 'bg-stone-500'}
                          />
                        </TableCell>
                        <TableCell className="max-w-md truncate">{tx.description}</TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold tabular-nums ${
                            isPos ? 'text-emerald-700' : 'text-on-surface'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-on-surface-variant tabular-nums">
                          {formatCurrency(tx.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: LỊCH SỬ RÚT DOANH THU SÀN */}
        <TabsContent value="platform-withdrawals" className="mt-3">
          <Card>
            {loadingWd ? (
              <CardContent className="py-14 flex justify-center">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </CardContent>
            ) : platformWithdrawals.length === 0 ? (
              <CardContent className="py-12 text-center text-xs text-on-surface-variant">
                Chưa có lịch sử rút doanh thu sàn về ngân hàng.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Tài khoản nhận</TableHead>
                    <TableHead>Mã tham chiếu</TableHead>
                    <TableHead className="text-right">Số tiền rút</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformWithdrawals.map((w) => {
                    const st = WITHDRAWAL_STATUS_MAP[w.status] || {
                      label: w.status,
                      dot: 'bg-emerald-600',
                    }
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="text-on-surface-variant tabular-nums">
                          {formatDateTime(w.createdAt)}
                        </TableCell>
                        <TableCell className="font-semibold">{w.userFullName || 'Quản trị viên'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {w.bankName} • {w.accountNumber}
                            </span>
                            <span className="text-[11px] text-on-surface-variant uppercase">
                              {w.accountName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-on-surface-variant">
                          {w.transactionReference || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold tabular-nums">
                          {formatCurrency(w.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={st.label} dot={st.dot} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3: SỔ CÁI GIAO DỊCH TẠM GIỮ TOÀN HỆ THỐNG */}
        <TabsContent value="escrow-ledger" className="mt-3 flex flex-col gap-3">
          <Card>
            <CardContent className="p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSearchQuery(searchInput)
                }}
                className="flex flex-1 items-center gap-2 w-full"
              >
                <Input
                  placeholder="Tìm theo mã đặt lịch (VD: BK-2026...)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Tìm kiếm
                </Button>
              </form>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44 h-9 text-xs">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                    <SelectItem value="HeldInEscrow">Đang tạm giữ</SelectItem>
                    <SelectItem value="CoolingDown">Chờ đối soát</SelectItem>
                    <SelectItem value="Settled">Đã giải ngân</SelectItem>
                    <SelectItem value="Refunded">Đã hoàn tiền</SelectItem>
                    <SelectItem value="PartiallyRefunded">Hoàn một phần</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-createdAt">Mới nhất trước</SelectItem>
                    <SelectItem value="createdAt">Cũ nhất trước</SelectItem>
                    <SelectItem value="-amount">Số tiền giảm dần</SelectItem>
                    <SelectItem value="amount">Số tiền tăng dần</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            {loadingEscrow ? (
              <CardContent className="py-14 flex justify-center">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </CardContent>
            ) : escrowItems.length === 0 ? (
              <CardContent className="py-12 text-center text-xs text-on-surface-variant">
                Không có giao dịch nào khớp với điều kiện lọc.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã lịch hẹn</TableHead>
                    <TableHead className="text-right">Tổng thu</TableHead>
                    <TableHead className="text-right">Phí dịch vụ sàn</TableHead>
                    <TableHead className="text-right">Thù lao chuyên gia</TableHead>
                    <TableHead>Trạng thái ca</TableHead>
                    <TableHead>Trạng thái tiền</TableHead>
                    <TableHead>Ngày thanh toán</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrowItems.map((tx) => {
                    const est = ESCROW_STATUS_MAP[tx.escrowStatus] || {
                      label: tx.escrowStatus,
                      dot: 'bg-stone-400',
                    }
                    const bst = BOOKING_STATUS_MAP[tx.bookingStatus] || {
                      label: tx.bookingStatus,
                      dot: 'bg-stone-400',
                    }
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono font-semibold text-on-surface">
                          {tx.bookingCode || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-on-surface-variant tabular-nums">
                          {formatCurrency(tx.commissionAmount)} ({tx.commissionRate}%)
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(tx.expertReceivable)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={bst.label} dot={bst.dot} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={est.label} dot={est.dot} />
                        </TableCell>
                        <TableCell className="text-on-surface-variant tabular-nums">
                          {formatDateTime(tx.paidAt || tx.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setSelectedTx(tx)}
                          >
                            Xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog rút doanh thu sàn */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rút doanh thu sàn về tài khoản ngân hàng</DialogTitle>
            <DialogDescription>
              Số dư doanh thu khả dụng:{' '}
              <strong className="text-on-surface font-mono">
                {formatCurrency(wallet?.platformAvailableBalance ?? 0)}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminWithdrawSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>
                Số tiền rút (VNĐ) <span className="text-red-600">*</span>
              </Label>
              <Input
                type="number"
                min={50000}
                step={50000}
                value={withdrawForm.amount}
                onChange={(e) =>
                  setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="font-mono font-semibold"
              />
              <span className="text-[11px] text-on-surface-variant">
                Tối thiểu 50.000 VNĐ, không vượt quá số dư khả dụng.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ngân hàng thụ hưởng *</Label>
              <Select
                value={withdrawForm.bankName}
                onValueChange={(val) =>
                  setWithdrawForm((prev) => ({ ...prev, bankName: val }))
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Số tài khoản *</Label>
              <Input
                placeholder="Nhập số tài khoản nhận tiền..."
                value={withdrawForm.accountNumber}
                onChange={(e) =>
                  setWithdrawForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tên chủ tài khoản *</Label>
              <Input
                placeholder="VD: CONG TY CP TAXKEEP VN"
                value={withdrawForm.accountName}
                onChange={(e) =>
                  setWithdrawForm((prev) => ({
                    ...prev,
                    accountName: e.target.value.toUpperCase(),
                  }))
                }
                className="uppercase"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={withdrawForm.submitting}>
                {withdrawForm.submitting ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog xem chi tiết giao dịch tạm giữ */}
      <Dialog open={Boolean(selectedTx)} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết giao dịch #{selectedTx?.bookingCode}</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/30">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-on-surface-variant">Trạng thái ca tư vấn</span>
                  <div>
                    <StatusBadge
                      label={
                        (BOOKING_STATUS_MAP[selectedTx.bookingStatus] || {
                          label: selectedTx.bookingStatus,
                        }).label
                      }
                      dot={
                        (BOOKING_STATUS_MAP[selectedTx.bookingStatus] || {
                          dot: 'bg-stone-400',
                        }).dot
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-on-surface-variant">Trạng thái tiền</span>
                  <div>
                    <StatusBadge
                      label={
                        (ESCROW_STATUS_MAP[selectedTx.escrowStatus] || {
                          label: selectedTx.escrowStatus,
                        }).label
                      }
                      dot={
                        (ESCROW_STATUS_MAP[selectedTx.escrowStatus] || {
                          dot: 'bg-stone-400',
                        }).dot
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Tổng thanh toán:</span>
                  <strong className="font-mono">{formatCurrency(selectedTx.amount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Phí dịch vụ sàn ({selectedTx.commissionRate}%):
                  </span>
                  <strong className="font-mono">
                    {formatCurrency(selectedTx.commissionAmount)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Thù lao chuyên gia:</span>
                  <strong className="font-mono">
                    {formatCurrency(selectedTx.expertReceivable)}
                  </strong>
                </div>
                {selectedTx.refundAmount > 0 && (
                  <div className="flex justify-between pt-1 border-t border-outline-variant/30">
                    <span className="text-on-surface-variant">Số tiền đã hoàn trả:</span>
                    <strong className="font-mono">
                      {formatCurrency(selectedTx.refundAmount)}
                    </strong>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant">
                <div>Thanh toán: {formatDateTime(selectedTx.paidAt)}</div>
                <div>Giải ngân: {formatDateTime(selectedTx.settledAt)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedTx(null)}>
              Đóng
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB 5: LĨNH VỰC TƯ VẤN
// ═════════════════════════════════════════════════════════════════════════════

function SpecializationsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ open: false, item: null, loading: false })
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await expertService.getSpecializations(false)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      showNotice('error', 'Không thể tải danh sách lĩnh vực', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const openCreate = () => {
    setEditingItem(null)
    setFormData({ name: '', description: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      description: item.description || '',
      isActive: item.isActive ?? true,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showNotice('warning', 'Thiếu tên lĩnh vực', 'Vui lòng nhập tên lĩnh vực tư vấn.')
      return
    }
    setSaving(true)
    try {
      if (editingItem) {
        await expertService.updateSpecialization(editingItem.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          isActive: Boolean(formData.isActive),
        })
        showNotice('success', 'Đã cập nhật', 'Thông tin lĩnh vực tư vấn đã được lưu.')
      } else {
        await expertService.createSpecialization({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        })
        showNotice('success', 'Đã thêm mới', 'Lĩnh vực tư vấn mới đã được tạo.')
      }
      setDialogOpen(false)
      fetchList()
    } catch (err) {
      showNotice('error', 'Không thể lưu lĩnh vực', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete.item) return
    setConfirmDelete((prev) => ({ ...prev, loading: true }))
    try {
      await expertService.deleteSpecialization(confirmDelete.item.id)
      setConfirmDelete({ open: false, item: null, loading: false })
      showNotice('info', 'Đã ngừng áp dụng', 'Lĩnh vực đã chuyển sang trạng thái tạm ngưng.')
      fetchList()
    } catch (err) {
      setConfirmDelete((prev) => ({ ...prev, loading: false }))
      showNotice('error', 'Không thể thực hiện', err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <span className="text-xs text-on-surface-variant">
            Danh mục các chuyên ngành thuế áp dụng khi chuyên gia đăng ký và khách hàng đặt lịch
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchList}>
              Làm mới
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              Thêm lĩnh vực
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="py-14 flex justify-center">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="py-12 text-center text-xs text-on-surface-variant">
            Chưa có lĩnh vực tư vấn nào.
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Mã</TableHead>
                <TableHead>Tên lĩnh vực</TableHead>
                <TableHead>Mô tả phạm vi</TableHead>
                <TableHead className="w-36">Trạng thái</TableHead>
                <TableHead className="text-right w-40">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-mono text-on-surface-variant tabular-nums">
                    #{sp.id}
                  </TableCell>
                  <TableCell className="font-semibold text-on-surface">{sp.name}</TableCell>
                  <TableCell className="text-on-surface-variant max-w-md truncate">
                    {sp.description || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={sp.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                      dot={sp.isActive ? 'bg-emerald-600' : 'bg-stone-400'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => openEdit(sp)}
                      >
                        Sửa
                      </Button>
                      {sp.isActive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700"
                          onClick={() =>
                            setConfirmDelete({ open: true, item: sp, loading: false })
                          }
                        >
                          Ngừng
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Cập nhật lĩnh vực tư vấn' : 'Thêm lĩnh vực tư vấn'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>
                Tên lĩnh vực <span className="text-red-600">*</span>
              </Label>
              <Input
                placeholder="VD: Quyết toán thuế TNCN"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Mô tả</Label>
              <Textarea
                rows={3}
                placeholder="Mô tả phạm vi tư vấn của lĩnh vực này..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {editingItem && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: Boolean(checked) }))
                  }
                />
                <span className="text-xs font-medium text-on-surface">
                  Đang áp dụng trên hệ thống
                </span>
              </label>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title="Tạm ngưng lĩnh vực tư vấn"
        description={`Tạm ngưng lĩnh vực "${confirmDelete.item?.name}"?`}
        confirmLabel="Xác nhận"
        destructive
        loading={confirmDelete.loading}
        onConfirm={handleConfirmDelete}
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB 6: KHUNG PHÍ DỊCH VỤ
// ═════════════════════════════════════════════════════════════════════════════

function FeeConfigsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    sessionType: 'ONLINE_MEETING',
    durationMinutes: 60,
    minFee: 100000,
    maxFee: 2000000,
    platformFeePercentage: 20,
    description: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ open: false, item: null, loading: false })
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await expertService.getFeeConfigs()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      showNotice('error', 'Không thể tải khung phí', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const openCreate = () => {
    setEditingItem(null)
    setFormData({
      sessionType: 'ONLINE_MEETING',
      durationMinutes: 60,
      minFee: 100000,
      maxFee: 2000000,
      platformFeePercentage: 20,
      description: '',
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFormData({
      sessionType: item.sessionType || 'ONLINE_MEETING',
      durationMinutes: item.durationMinutes ?? 60,
      minFee: item.minFee ?? 100000,
      maxFee: item.maxFee ?? 2000000,
      platformFeePercentage: item.platformFeePercentage ?? 20,
      description: item.description || '',
      isActive: item.isActive ?? true,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (Number(formData.minFee) >= Number(formData.maxFee)) {
      showNotice('warning', 'Khung phí chưa hợp lệ', 'Mức phí sàn phải nhỏ hơn mức phí trần.')
      return
    }
    setSaving(true)
    try {
      if (editingItem) {
        await expertService.updateFeeConfig(editingItem.id, {
          minFee: Number(formData.minFee),
          maxFee: Number(formData.maxFee),
          platformFeePercentage: Number(formData.platformFeePercentage),
          description: formData.description.trim() || null,
          isActive: Boolean(formData.isActive),
        })
        showNotice('success', 'Đã cập nhật khung phí', 'Thông số khung phí đã được lưu.')
      } else {
        await expertService.createFeeConfig({
          sessionType: formData.sessionType,
          durationMinutes: Number(formData.durationMinutes),
          minFee: Number(formData.minFee),
          maxFee: Number(formData.maxFee),
          platformFeePercentage: Number(formData.platformFeePercentage),
          description: formData.description.trim() || null,
        })
        showNotice('success', 'Đã thêm khung phí', 'Khung phí dịch vụ mới đã được tạo.')
      }
      setDialogOpen(false)
      fetchList()
    } catch (err) {
      showNotice('error', 'Không thể lưu khung phí', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete.item) return
    setConfirmDelete((prev) => ({ ...prev, loading: true }))
    try {
      await expertService.deleteFeeConfig(confirmDelete.item.id)
      setConfirmDelete({ open: false, item: null, loading: false })
      showNotice('info', 'Đã ngừng áp dụng', 'Khung phí đã chuyển sang trạng thái tạm ngưng.')
      fetchList()
    } catch (err) {
      setConfirmDelete((prev) => ({ ...prev, loading: false }))
      showNotice('error', 'Không thể thực hiện', err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <span className="text-xs text-on-surface-variant">
            Quy định mức phí tối thiểu, tối đa và tỷ lệ phí dịch vụ cho từng hình thức tư vấn
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchList}>
              Làm mới
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              Thêm khung phí
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="py-14 flex justify-center">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="py-12 text-center text-xs text-on-surface-variant">
            Chưa có cấu hình khung phí nào.
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hình thức dịch vụ</TableHead>
                <TableHead className="text-center">Thời lượng</TableHead>
                <TableHead className="text-right">Phí tối thiểu</TableHead>
                <TableHead className="text-right">Phí tối đa</TableHead>
                <TableHead className="text-center">Tỷ lệ phí sàn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cfg) => (
                <TableRow key={cfg.id}>
                  <TableCell className="font-semibold text-on-surface">
                    {SESSION_TYPE_MAP[cfg.sessionType] || cfg.sessionType}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {cfg.durationMinutes} phút
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(cfg.minFee)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(cfg.maxFee)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <Badge variant="outline">{cfg.platformFeePercentage}%</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={cfg.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                      dot={cfg.isActive ? 'bg-emerald-600' : 'bg-stone-400'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => openEdit(cfg)}
                      >
                        Sửa
                      </Button>
                      {cfg.isActive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700"
                          onClick={() =>
                            setConfirmDelete({ open: true, item: cfg, loading: false })
                          }
                        >
                          Ngừng
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Cập nhật khung phí dịch vụ' : 'Thêm khung phí dịch vụ'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Hình thức tư vấn</Label>
                <Select
                  value={formData.sessionType}
                  disabled={Boolean(editingItem)}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, sessionType: val }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE_MEETING">Tư vấn trực tuyến 1-1</SelectItem>
                    <SelectItem value="CHAT">Tư vấn qua tin nhắn</SelectItem>
                    <SelectItem value="VOICE_CALL">Tư vấn qua cuộc gọi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  disabled={Boolean(editingItem)}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Mức phí tối thiểu (VNĐ)</Label>
                <Input
                  type="number"
                  step={10000}
                  value={formData.minFee}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minFee: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Mức phí tối đa (VNĐ)</Label>
                <Input
                  type="number"
                  step={10000}
                  value={formData.maxFee}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maxFee: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tỷ lệ phí dịch vụ nền tảng (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.platformFeePercentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    platformFeePercentage: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ghi chú</Label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {editingItem && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: Boolean(checked) }))
                  }
                />
                <span className="text-xs font-medium text-on-surface">
                  Đang áp dụng trên hệ thống
                </span>
              </label>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu khung phí'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title="Tạm ngưng khung phí"
        description="Tạm ngưng khung phí dịch vụ này?"
        confirmLabel="Xác nhận"
        destructive
        loading={confirmDelete.loading}
        onConfirm={handleConfirmDelete}
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB 9: CHÍNH SÁCH VẬN HÀNH SÀN (ĐỒNG BỘ ĐỦ 19 THAM SỐ VỚI BACKEND)
// ═════════════════════════════════════════════════════════════════════════════

function PlatformPolicyTab() {
  const [policy, setPolicy] = useState({
    expertMinFeeVnd: 100000,
    expertMaxFeeVnd: 2000000,
    bookingSlotHoldMinutes: 10,
    bookingMinLeadTimeHours: 4,
    expertConfirmTimeoutHours: 2,
    platformCommissionRatePercent: 20,
    sessionOpenBeforeMinutes: 10,
    sessionNoShowMinutes: 15,
    ratingWindowDays: 7,
    escrowCooldownHours: 24,
    cancelFullRefundHours: 24,
    cancelPartialRefundHours: 4,
    cancelPartialRefundPercent: 50,
    expertMaxDailySlots: 6,
    expertMinWithdrawalVnd: 500000,
    expertLateCancelHours: 12,
    expertLateCancelPenaltyVnd: 100000,
    disputeWindowHours: 24,
    disputeExpertReplyHours: 24,
  })
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const showNotice = (type, title, description) => {
    setNotice({ open: true, type, title, description })
  }

  const fetchPolicy = useCallback(async () => {
    setLoading(true)
    try {
      const data = await expertService.getPlatformPolicy()
      if (data) {
        setPolicy({
          expertMinFeeVnd: data.expertMinFeeVnd ?? 100000,
          expertMaxFeeVnd: data.expertMaxFeeVnd ?? 2000000,
          bookingSlotHoldMinutes: data.bookingSlotHoldMinutes ?? 10,
          bookingMinLeadTimeHours: data.bookingMinLeadTimeHours ?? 4,
          expertConfirmTimeoutHours: data.expertConfirmTimeoutHours ?? 2,
          platformCommissionRatePercent: data.platformCommissionRatePercent ?? 20,
          sessionOpenBeforeMinutes: data.sessionOpenBeforeMinutes ?? 10,
          sessionNoShowMinutes: data.sessionNoShowMinutes ?? 15,
          ratingWindowDays: data.ratingWindowDays ?? 7,
          escrowCooldownHours: data.escrowCooldownHours ?? 24,
          cancelFullRefundHours: data.cancelFullRefundHours ?? 24,
          cancelPartialRefundHours: data.cancelPartialRefundHours ?? 4,
          cancelPartialRefundPercent: data.cancelPartialRefundPercent ?? 50,
          expertMaxDailySlots: data.expertMaxDailySlots ?? 6,
          expertMinWithdrawalVnd: data.expertMinWithdrawalVnd ?? 500000,
          expertLateCancelHours: data.expertLateCancelHours ?? 12,
          expertLateCancelPenaltyVnd: data.expertLateCancelPenaltyVnd ?? 100000,
          disputeWindowHours: data.disputeWindowHours ?? 24,
          disputeExpertReplyHours: data.disputeExpertReplyHours ?? 24,
        })
        setUpdatedAt(data.updatedAt)
      }
    } catch (err) {
      showNotice('error', 'Không thể tải chính sách vận hành', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  const handleChange = (key, val) => {
    setPolicy((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Number(policy.expertMinFeeVnd) > Number(policy.expertMaxFeeVnd)) {
      showNotice('warning', 'Thông số chưa hợp lệ', 'Phí tối thiểu không được lớn hơn phí tối đa.')
      return
    }
    if (Number(policy.cancelFullRefundHours) < Number(policy.cancelPartialRefundHours)) {
      showNotice(
        'warning',
        'Thông số chưa hợp lệ',
        'Mốc hủy hoàn tiền 100% phải lớn hơn hoặc bằng mốc hoàn tiền một phần.'
      )
      return
    }

    setSaving(true)
    try {
      const payload = {
        expertMinFeeVnd: Number(policy.expertMinFeeVnd),
        expertMaxFeeVnd: Number(policy.expertMaxFeeVnd),
        bookingSlotHoldMinutes: Number(policy.bookingSlotHoldMinutes),
        bookingMinLeadTimeHours: Number(policy.bookingMinLeadTimeHours),
        expertConfirmTimeoutHours: Number(policy.expertConfirmTimeoutHours),
        platformCommissionRatePercent: Number(policy.platformCommissionRatePercent),
        sessionOpenBeforeMinutes: Number(policy.sessionOpenBeforeMinutes),
        sessionNoShowMinutes: Number(policy.sessionNoShowMinutes),
        ratingWindowDays: Number(policy.ratingWindowDays),
        escrowCooldownHours: Number(policy.escrowCooldownHours),
        cancelFullRefundHours: Number(policy.cancelFullRefundHours),
        cancelPartialRefundHours: Number(policy.cancelPartialRefundHours),
        cancelPartialRefundPercent: Number(policy.cancelPartialRefundPercent),
        expertMaxDailySlots: Number(policy.expertMaxDailySlots),
        expertMinWithdrawalVnd: Number(policy.expertMinWithdrawalVnd),
        expertLateCancelHours: Number(policy.expertLateCancelHours),
        expertLateCancelPenaltyVnd: Number(policy.expertLateCancelPenaltyVnd),
        disputeWindowHours: Number(policy.disputeWindowHours),
        disputeExpertReplyHours: Number(policy.disputeExpertReplyHours),
      }
      const updated = await expertService.updatePlatformPolicy(payload)
      setUpdatedAt(updated?.updatedAt)
      showNotice('success', 'Đã lưu chính sách', 'Các thông số vận hành sàn đã được cập nhật.')
    } catch (err) {
      showNotice('error', 'Không thể lưu chính sách', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 flex justify-center">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Chính sách vận hành sàn tư vấn</h3>
            <p className="text-xs text-on-surface-variant">
              Thiết lập phí dịch vụ, thời hạn đặt lịch, phòng họp, hoàn tiền và giải quyết khiếu nại.
              {updatedAt ? ` Cập nhật: ${formatDateTime(updatedAt)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={fetchPolicy}>
              Tải lại
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu chính sách'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Khối 1: Biểu phí & Hoa hồng */}
        <Card>
          <CardHeader className="pb-3 border-b border-outline-variant/30">
            <CardTitle className="text-sm font-bold">Biểu phí & Hạn mức rút tiền</CardTitle>
            <CardDescription className="text-xs">
              Tỷ lệ phí dịch vụ nền tảng và giới hạn giao dịch của chuyên gia
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Label>Tỷ lệ phí dịch vụ sàn (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={policy.platformCommissionRatePercent}
                onChange={(e) => handleChange('platformCommissionRatePercent', e.target.value)}
              />
              <span className="text-[11px] text-on-surface-variant">
                Chuyên gia nhận {100 - Number(policy.platformCommissionRatePercent || 0)}% phí ca tư vấn
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Mức rút tối thiểu chuyên gia (VNĐ)</Label>
              <Input
                type="number"
                step={50000}
                min={50000}
                value={policy.expertMinWithdrawalVnd}
                onChange={(e) => handleChange('expertMinWithdrawalVnd', e.target.value)}
              />
              <span className="text-[11px] text-on-surface-variant font-mono">
                {formatCurrency(policy.expertMinWithdrawalVnd)} / lần rút
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Phí tư vấn tối thiểu (VNĐ)</Label>
              <Input
                type="number"
                step={10000}
                value={policy.expertMinFeeVnd}
                onChange={(e) => handleChange('expertMinFeeVnd', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Phí tư vấn tối đa (VNĐ)</Label>
              <Input
                type="number"
                step={50000}
                value={policy.expertMaxFeeVnd}
                onChange={(e) => handleChange('expertMaxFeeVnd', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 2: Đặt lịch & Xác nhận */}
        <Card>
          <CardHeader className="pb-3 border-b border-outline-variant/30">
            <CardTitle className="text-sm font-bold">Đặt lịch & Tiếp nhận</CardTitle>
            <CardDescription className="text-xs">
              Thời gian giữ chỗ thanh toán và giới hạn lịch hẹn mỗi ngày
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Label>Thời gian giữ chỗ thanh toán (phút)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={policy.bookingSlotHoldMinutes}
                onChange={(e) => handleChange('bookingSlotHoldMinutes', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Thời hạn chuyên gia xác nhận (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={policy.expertConfirmTimeoutHours}
                onChange={(e) => handleChange('expertConfirmTimeoutHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Đặt trước giờ hẹn tối thiểu (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={policy.bookingMinLeadTimeHours}
                onChange={(e) => handleChange('bookingMinLeadTimeHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Số ca tối đa trong ngày / chuyên gia</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={policy.expertMaxDailySlots}
                onChange={(e) => handleChange('expertMaxDailySlots', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 3: Phòng tư vấn & Khiếu nại */}
        <Card>
          <CardHeader className="pb-3 border-b border-outline-variant/30">
            <CardTitle className="text-sm font-bold">Phòng tư vấn, Đánh giá & Khiếu nại</CardTitle>
            <CardDescription className="text-xs">
              Quy định mở phòng trực tuyến, thời hạn đánh giá và giải trình khiếu nại
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Label>Mở phòng trước giờ hẹn (phút)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={policy.sessionOpenBeforeMinutes}
                onChange={(e) => handleChange('sessionOpenBeforeMinutes', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Thời gian chờ vắng mặt tối đa (phút)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={policy.sessionNoShowMinutes}
                onChange={(e) => handleChange('sessionNoShowMinutes', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Thời hạn gửi khiếu nại sau ca (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={policy.disputeWindowHours}
                onChange={(e) => handleChange('disputeWindowHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Thời hạn chuyên gia giải trình (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={policy.disputeExpertReplyHours}
                onChange={(e) => handleChange('disputeExpertReplyHours', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <Label>Thời hạn khách hàng gửi đánh giá (ngày)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={policy.ratingWindowDays}
                onChange={(e) => handleChange('ratingWindowDays', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 4: Đối soát & Hoàn tiền hủy lịch */}
        <Card>
          <CardHeader className="pb-3 border-b border-outline-variant/30">
            <CardTitle className="text-sm font-bold">Đối soát & Chính sách hủy lịch</CardTitle>
            <CardDescription className="text-xs">
              Thời gian giữ tiền bảo đảm sau ca và tỷ lệ hoàn tiền khi hủy hẹn
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Label>Thời gian chờ đối soát sau ca (giờ)</Label>
              <Input
                type="number"
                min={0}
                max={168}
                value={policy.escrowCooldownHours}
                onChange={(e) => handleChange('escrowCooldownHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Khách hủy hoàn 100% trước (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={policy.cancelFullRefundHours}
                onChange={(e) => handleChange('cancelFullRefundHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Khách hủy hoàn một phần trước (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={policy.cancelPartialRefundHours}
                onChange={(e) => handleChange('cancelPartialRefundHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Tỷ lệ hoàn tiền một phần (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={policy.cancelPartialRefundPercent}
                onChange={(e) => handleChange('cancelPartialRefundPercent', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Mốc tính chuyên gia hủy muộn (giờ)</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={policy.expertLateCancelHours}
                onChange={(e) => handleChange('expertLateCancelHours', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Mức phạt chuyên gia hủy muộn (VNĐ)</Label>
              <Input
                type="number"
                step={20000}
                min={0}
                value={policy.expertLateCancelPenaltyVnd}
                onChange={(e) => handleChange('expertLateCancelPenaltyVnd', e.target.value)}
              />
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
