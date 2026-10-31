import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NotificationDialog } from '@/components/ui/notification-dialog'
import { expertPortalService } from '@/services/expertPortalService'

const ALL = '__ALL__'

const STATUS_MAP = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning', color: 'text-amber-700 bg-amber-50' },
  AWAITING_EXPERT_APPROVAL: { label: 'Chờ duyệt', variant: 'orange', color: 'text-orange-700 bg-orange-50' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success', color: 'text-emerald-700 bg-emerald-50' },
  IN_PROGRESS: { label: 'Đang tư vấn', variant: 'warning', color: 'text-amber-800 bg-amber-100' },
  COMPLETED: { label: 'Đã hoàn thành', variant: 'default', color: 'text-blue-700 bg-blue-50' },
  SETTLED: { label: 'Đã giải ngân', variant: 'success', color: 'text-emerald-800 bg-emerald-100' },
  REJECTED_BY_EXPERT: { label: 'Đã từ chối', variant: 'destructive', color: 'text-red-700 bg-red-50' },
  CANCELLED_BY_USER: { label: 'Khách đã hủy', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
  CANCELLED_BY_EXPERT: { label: 'Chuyên gia hủy', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
  EXPIRED_NO_RESPONSE: { label: 'Hết hạn phản hồi', variant: 'destructive', color: 'text-red-700 bg-red-50' },
  EXPIRED_UNPAID: { label: 'Hết hạn thanh toán', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
}

const ESCROW_STATUS_MAP = {
  PendingPayment: { label: 'Chờ thanh toán', variant: 'warning' },
  HeldInEscrow: { label: 'Đang tạm giữ bảo đảm', variant: 'success' },
  CoolingDown: { label: 'Chờ kết toán (24h)', variant: 'orange' },
  Settled: { label: 'Đã giải ngân về ví', variant: 'default' },
  Refunded: { label: 'Đã hoàn tiền 100%', variant: 'muted' },
  PartiallyRefunded: { label: 'Hoàn tiền một phần', variant: 'orange' },
  Cancelled: { label: 'Đã hủy', variant: 'destructive' },
}

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam' },
  CHAT: { label: 'Nhắn tin', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call' },
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '0 ₫'
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
    : dt.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export function ExpertBookingsTab({ initialBookingId }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Detail dialog
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [downloadingAttId, setDownloadingAttId] = useState(null)

  // Live Consultation & Dossier dialog states
  const [dossierState, setDossierState] = useState({ open: false, loading: false, data: null, booking: null, error: null })
  const [completeState, setCompleteState] = useState({ open: false, loading: false, booking: null, sharedNotes: '', error: null })
  const [noShowState, setNoShowState] = useState({ open: false, loading: false, booking: null, noShowParty: 'CUSTOMER', reason: '', error: null })
  const [escrowState, setEscrowState] = useState({ open: false, loading: false, data: null, booking: null, error: null })

  // Notification dialog
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertPortalService.getExpertBookings({
        status: statusFilter === ALL ? undefined : statusFilter,
        page,
        size: 10,
      })
      const items = data?.items || []
      setBookings(items)
      setTotalPages(data?.pagination?.totalPages || 1)
      setTotalItems(data?.pagination?.totalItems ?? items.length)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách lịch hẹn.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    if (initialBookingId) {
      handleOpenDetail(initialBookingId)
    }
  }, [initialBookingId])

  const handleOpenDetail = async (id) => {
    setDetailLoading(true)
    try {
      const data = await expertPortalService.getBookingDetail(id)
      setSelectedBooking(data)
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Không thể xem chi tiết lịch hẹn',
        description: err.message || 'Lỗi khi tải thông tin lịch hẹn.',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownloadAttachment = async (bookingId, attachment) => {
    setDownloadingAttId(attachment.id)
    try {
      const url = await expertPortalService.getAttachmentDownloadUrl(bookingId, attachment.id)
      if (url) {
        window.open(url, '_blank')
      } else if (attachment.fileUrl) {
        window.open(attachment.fileUrl, '_blank')
      }
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Không thể tải tệp đính kèm',
        description: err.message || 'Lỗi khi tải tài liệu đính kèm.',
      })
    } finally {
      setDownloadingAttId(null)
    }
  }

  // Live Consultation Handlers
  const handleJoinConsultation = async (bookingId) => {
    try {
      const res = await expertPortalService.joinConsultation(bookingId)
      if (res?.roomUrl) {
        window.open(res.roomUrl, '_blank')
        setNotice({
          open: true,
          type: 'success',
          title: 'Đang mở phòng tư vấn trực tuyến',
          description: `Đã mở phòng tư vấn trực tuyến (Jitsi Meet). Hệ thống đã tự động cập nhật trạng thái buổi tư vấn sang "Đang tư vấn".`,
        })
        fetchBookings()
        if (selectedBooking && selectedBooking.id === bookingId) {
          handleOpenDetail(bookingId)
        }
      } else {
        throw new Error('Không nhận được đường dẫn phòng họp từ hệ thống.')
      }
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Chưa thể vào phòng tư vấn',
        description: err.message || 'Lỗi khi kết nối tới phòng tư vấn.',
      })
    }
  }

  const handleOpenDossier = async (booking) => {
    setDossierState({ open: true, loading: true, data: null, booking, error: null })
    try {
      const data = await expertPortalService.getSharedTaxDossier(booking.id)
      setDossierState({ open: true, loading: false, data, booking, error: null })
    } catch (err) {
      setDossierState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Không thể tải hồ sơ thuế chia sẻ của khách hàng.',
      }))
    }
  }

  const handleOpenComplete = (booking) => {
    setCompleteState({
      open: true,
      loading: false,
      booking,
      sharedNotes: booking.sharedNotes || '',
      error: null,
    })
  }

  const handleSubmitComplete = async () => {
    if (!completeState.booking) return
    const notes = completeState.sharedNotes?.trim() || ''
    if (notes.length < 10) {
      setCompleteState((p) => ({ ...p, error: 'Biên bản tóm tắt kết quả tư vấn phải có ít nhất 10 ký tự.' }))
      return
    }
    setCompleteState((p) => ({ ...p, loading: true, error: null }))
    try {
      await expertPortalService.completeConsultation(completeState.booking.id, { sharedNotes: notes })
      setCompleteState({ open: false, loading: false, booking: null, sharedNotes: '', error: null })
      setNotice({
        open: true,
        type: 'success',
        title: 'Hoàn thành ca tư vấn',
        description: 'Ca tư vấn đã được hoàn tất thành công. Số tiền ký quỹ được chuyển sang giai đoạn chờ kết toán 24h (Cooling-down) để bảo vệ quyền lợi hai bên trước khi giải ngân vào ví.',
      })
      fetchBookings()
      if (selectedBooking) setSelectedBooking(null)
    } catch (err) {
      setCompleteState((p) => ({ ...p, loading: false, error: err.message || 'Không thể hoàn tất ca tư vấn.' }))
    }
  }

  const handleOpenNoShow = (booking) => {
    setNoShowState({
      open: true,
      loading: false,
      booking,
      noShowParty: 'CUSTOMER',
      reason: '',
      error: null,
    })
  }

  const handleSubmitNoShow = async () => {
    if (!noShowState.booking) return
    setNoShowState((p) => ({ ...p, loading: true, error: null }))
    try {
      await expertPortalService.reportNoShow(noShowState.booking.id, {
        noShowParty: noShowState.noShowParty,
        reason: noShowState.reason?.trim() || undefined,
      })
      setNoShowState({ open: false, loading: false, booking: null, noShowParty: 'CUSTOMER', reason: '', error: null })
      setNotice({
        open: true,
        type: 'success',
        title: 'Đã ghi nhận vắng mặt (No-Show)',
        description: 'Hệ thống đã tự động xử lý và bảo vệ quyền lợi theo quy định chính sách vắng mặt ca tư vấn.',
      })
      fetchBookings()
      if (selectedBooking) setSelectedBooking(null)
    } catch (err) {
      setNoShowState((p) => ({ ...p, loading: false, error: err.message || 'Không thể báo vắng mặt.' }))
    }
  }

  const handleOpenEscrow = async (booking) => {
    setEscrowState({ open: true, loading: true, data: null, booking, error: null })
    try {
      const data = await expertPortalService.getBookingEscrow(booking.id)
      setEscrowState({ open: true, loading: false, data, booking, error: null })
    } catch (err) {
      setEscrowState((p) => ({ ...p, loading: false, error: err.message || 'Không thể tải thông tin ký quỹ bảo đảm.' }))
    }
  }

  // Client-side search filtering by bookingCode or customer name
  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      b.bookingCode?.toLowerCase().includes(term) ||
      b.userFullName?.toLowerCase().includes(term) ||
      b.topicTitle?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Filters card */}
      <Card className="border border-outline-variant/30 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã lịch hẹn, tên khách hàng, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="sm:w-64">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-11 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, item]) => (
                  <SelectItem key={key} value={key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchBookings} disabled={loading} className="gap-1.5 h-11 shrink-0">
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </Button>
        </CardContent>
      </Card>

      {/* Stats counter */}
      <div className="flex gap-2 flex-wrap items-center">
        <Badge variant="secondary" className="px-3 py-1 text-xs">
          Tổng cộng: {totalItems} lịch hẹn
        </Badge>
        {statusFilter !== ALL && (
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Lọc: {STATUS_MAP[statusFilter]?.label || statusFilter}
          </Badge>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && bookings.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Đang tải danh sách lịch hẹn...</span>
        </div>
      )}

      {/* Table view */}
      {!loading && filteredBookings.length > 0 && (
        <Card className="border border-outline-variant/30 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã ca</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Chủ đề tư vấn</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead className="text-center">Ngày hẹn</TableHead>
                <TableHead className="text-right">Mức phí</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((b) => {
                const session = SESSION_TYPE_MAP[b.sessionType] || { label: b.sessionType, icon: 'help' }
                const st = STATUS_MAP[b.status] || { label: b.status, variant: 'outline' }
                return (
                  <TableRow key={b.id} className="hover:bg-surface-container-low/40">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      #{b.bookingCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-on-surface">{b.userFullName}</span>
                        {b.attachmentCount > 0 && (
                          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">attach_file</span>
                            {b.attachmentCount} tệp
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-on-surface font-medium">
                      {b.topicTitle || 'Tư vấn thuế'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-primary">{session.icon}</span>
                        <span>{session.label}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      <div>{formatDate(b.slotDate)}</div>
                      <div className="text-[11px] text-on-surface-variant">{b.startTime} - {b.endTime}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-primary">
                      {formatCurrency(b.fee)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={st.variant} className="text-[11px]">
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleJoinConsultation(b.id)}
                            className="text-xs h-8 gap-1 bg-primary text-on-primary hover:bg-primary/90 font-medium"
                            title="Vào phòng tư vấn trực tuyến Jitsi Meet"
                          >
                            <span className="material-symbols-outlined text-[15px]">videocam</span>
                            <span>Vào phòng</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(b.id)}
                          className="text-xs h-8"
                        >
                          Chi tiết
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <CardFooter className="p-4 border-t border-outline-variant/20 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Trước
              </Button>
              <span className="text-xs text-on-surface-variant">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sau →
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredBookings.length === 0 && !error && (
        <Card className="border border-outline-variant/30 shadow-sm">
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline">calendar_month</span>
            <p className="text-sm font-medium">Không tìm thấy ca tư vấn nào phù hợp.</p>
          </CardContent>
        </Card>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                      #{selectedBooking.bookingCode}
                    </span>
                    <Badge variant={STATUS_MAP[selectedBooking.status]?.variant || 'outline'}>
                      {STATUS_MAP[selectedBooking.status]?.label || selectedBooking.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    Khởi tạo: {formatDateTime(selectedBooking.createdAt)}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-on-surface mt-2">
                  {selectedBooking.topicTitle || 'Yêu cầu tư vấn'}
                </DialogTitle>
                <DialogDescription>
                  Thông tin đầy đủ của phiên tư vấn giữa chuyên gia và khách hàng
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                {/* Customer Information */}
                <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Khách hàng
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-on-surface-variant block">Họ và tên:</span>
                      <span className="font-bold text-on-surface">{selectedBooking.userFullName}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Email:</span>
                      <span className="font-medium text-on-surface">{selectedBooking.userEmail || '—'}</span>
                    </div>
                    {selectedBooking.userPhoneNumber && (
                      <div>
                        <span className="text-on-surface-variant block">Số điện thoại:</span>
                        <span className="font-medium text-on-surface">{selectedBooking.userPhoneNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-on-surface-variant block">Lĩnh vực:</span>
                      <span className="font-bold text-primary">{selectedBooking.specializationName}</span>
                    </div>
                  </div>
                </div>

                {/* Session Information */}
                <div className="p-3.5 rounded-xl border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Khung giờ & Mức phí
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-on-surface-variant block">Ngày hẹn:</span>
                      <span className="font-bold text-on-surface font-mono">{formatDate(selectedBooking.slotDate)}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Khung giờ:</span>
                      <span className="font-bold text-primary font-mono">
                        {selectedBooking.startTime} - {selectedBooking.endTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Chi phí:</span>
                      <span className="font-extrabold text-amber-800 font-mono text-sm">
                        {formatCurrency(selectedBooking.fee)}
                      </span>
                    </div>
                  </div>

                  {selectedBooking.paidAt && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Đã thanh toán lúc: {formatDateTime(selectedBooking.paidAt)}
                      </span>
                      {selectedBooking.paymentReference && (
                        <span className="font-mono text-on-surface-variant">
                          Mã GD: {selectedBooking.paymentReference}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEscrow(selectedBooking)}
                      className="gap-1.5 text-xs h-8 text-primary font-medium hover:bg-primary/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                      <span>Xem trạng thái ký quỹ bảo đảm Escrow</span>
                    </Button>
                  </div>
                </div>

                {/* Hành động ca tư vấn trực tuyến */}
                {(selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'IN_PROGRESS') && (
                  <div className="p-3.5 rounded-xl border-2 border-primary/20 bg-primary/5 flex flex-col gap-2.5">
                    <span className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">video_chat</span>
                      <span>Thao tác buổi tư vấn trực tuyến</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleJoinConsultation(selectedBooking.id)}
                        className="gap-1.5 text-xs h-9 bg-primary text-on-primary hover:bg-primary/90 font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">videocam</span>
                        <span>Vào phòng tư vấn (Jitsi Meet)</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDossier(selectedBooking)}
                        className="gap-1.5 text-xs h-9 font-medium"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_shared</span>
                        <span>Hồ sơ thuế chia sẻ</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenComplete(selectedBooking)}
                        className="gap-1.5 text-xs h-9 font-medium"
                      >
                        <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                        <span>Biên bản & Kết thúc ca</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenNoShow(selectedBooking)}
                        className="gap-1.5 text-xs h-9 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_off</span>
                        <span>Báo vắng mặt</span>
                      </Button>
                    </div>
                  </div>
                )}

                {(selectedBooking.status === 'COMPLETED' || selectedBooking.status === 'SETTLED') && (
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        <span>Ca tư vấn đã hoàn thành</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDossier(selectedBooking)}
                        className="gap-1 text-xs h-7"
                      >
                        <span className="material-symbols-outlined text-[14px]">folder_shared</span>
                        <span>Xem hồ sơ thuế</span>
                      </Button>
                    </div>
                    {selectedBooking.sharedNotes && (
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-xs text-on-surface">
                        <span className="font-semibold text-on-surface-variant block mb-1">Biên bản kết thúc ca:</span>
                        <p className="whitespace-pre-wrap">{selectedBooking.sharedNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Problem Description */}
                <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Mô tả vấn đề từ khách hàng
                  </span>
                  <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {selectedBooking.problemDescription || 'Khách hàng không cung cấp thêm mô tả.'}
                  </p>
                </div>

                {/* Rejection / Cancellation Notes if any */}
                {selectedBooking.rejectionReason && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col gap-1">
                    <span className="font-bold uppercase tracking-wider text-[11px]">Lý do từ chối:</span>
                    <p className="leading-relaxed">{selectedBooking.rejectionReason}</p>
                    <span className="text-[10px] text-red-600">Từ chối lúc: {formatDateTime(selectedBooking.rejectedAt)}</span>
                  </div>
                )}

                {selectedBooking.cancellationReason && (
                  <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 flex flex-col gap-1">
                    <span className="font-bold uppercase tracking-wider text-[11px]">
                      Lý do hủy lịch ({selectedBooking.cancelledBy === 'EXPERT' ? 'Chuyên gia' : 'Khách hàng'}):
                    </span>
                    <p className="leading-relaxed">{selectedBooking.cancellationReason}</p>
                    <span className="text-[10px] text-stone-500">Hủy lúc: {formatDateTime(selectedBooking.cancelledAt)}</span>
                  </div>
                )}

                {/* Attachments */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">attach_file</span>
                    <span>Tài liệu đính kèm ({selectedBooking.attachments?.length || 0})</span>
                  </span>

                  {selectedBooking.attachments?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedBooking.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="material-symbols-outlined text-[20px] text-primary">description</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-on-surface truncate text-xs">{att.fileName}</span>
                              <span className="text-[10px] text-on-surface-variant">
                                {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''} • {formatDateTime(att.uploadedAt)}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingAttId === att.id}
                            onClick={() => handleDownloadAttachment(selectedBooking.id, att)}
                            className="gap-1 text-xs h-8"
                          >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            <span>{downloadingAttId === att.id ? 'Đang tải...' : 'Tải về'}</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-outline-variant/40 text-center text-on-surface-variant">
                      Không có tệp chứng từ đính kèm.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedBooking?.bookingCode) {
                      navigator.clipboard?.writeText(selectedBooking.bookingCode)
                      setNotice({
                        open: true,
                        type: 'success',
                        title: 'Đã sao chép mã lịch hẹn',
                        description: `Đã sao chép mã #${selectedBooking.bookingCode} vào bộ nhớ tạm.`,
                      })
                    }
                  }}
                  className="gap-1 text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Sao chép mã</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Thông báo chung (Notification Dialog) */}
      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />

      {/* Modal: Hồ sơ thuế chia sẻ (Shared Tax Dossier) */}
      <SharedTaxDossierDialog
        state={dossierState}
        onClose={() => setDossierState((p) => ({ ...p, open: false }))}
      />

      {/* Modal: Biên bản & Kết thúc ca tư vấn */}
      <CompleteConsultationDialog
        state={completeState}
        onChangeNotes={(notes) => setCompleteState((p) => ({ ...p, sharedNotes: notes, error: null }))}
        onSubmit={handleSubmitComplete}
        onClose={() => setCompleteState((p) => ({ ...p, open: false }))}
      />

      {/* Modal: Báo vắng mặt (No-Show) */}
      <NoShowReportDialog
        state={noShowState}
        onChangeParty={(party) => setNoShowState((p) => ({ ...p, noShowParty: party }))}
        onChangeReason={(reason) => setNoShowState((p) => ({ ...p, reason }))}
        onSubmit={handleSubmitNoShow}
        onClose={() => setNoShowState((p) => ({ ...p, open: false }))}
      />

      {/* Modal: Chi tiết Ký quỹ Escrow */}
      <BookingEscrowDialog
        state={escrowState}
        onClose={() => setEscrowState((p) => ({ ...p, open: false }))}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SUB-DIALOGS FOR CONSULTATION FEATURES
// ═══════════════════════════════════════════════════════════

const formatRelationship = (rel) => {
  if (!rel) return '—'
  switch (String(rel).toUpperCase()) {
    case 'CHILD': return 'Con'
    case 'SPOUSE': return 'Vợ / Chồng'
    case 'PARENT': return 'Cha / Mẹ'
    case 'PARENT_IN_LAW': return 'Cha / Mẹ kế'
    case 'OTHER_DEPENDENT':
    case 'OTHER': return 'Cá nhân khác'
    default: return rel
  }
}

function SharedTaxDossierDialog({ state, onClose }) {
  const { open, loading, data, booking, error } = state
  const [activeTab, setActiveTab] = useState('income')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[24px]">folder_shared</span>
            Hồ sơ Thuế Chia sẻ: {booking?.userFullName}
          </DialogTitle>
          <DialogDescription>
            Tài liệu và dữ liệu thuế khách hàng đã đồng ý chia sẻ phục vụ phiên tư vấn #{booking?.bookingCode}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-on-surface-variant">Đang tải hồ sơ thuế...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
        ) : !data ? null : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-xs pr-1">
            {/* Taxpayer Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-surface-container-low border">
              <div>
                <span className="text-on-surface-variant block">Mã số thuế:</span>
                <span className="font-bold font-mono text-on-surface">{data.taxpayerInfo?.taxCode || 'Chưa cung cấp'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Số CMND/CCCD:</span>
                <span className="font-bold font-mono text-on-surface">{data.taxpayerInfo?.idNumber || '—'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Giảm trừ gia cảnh:</span>
                <span className="font-bold text-on-surface">{data.taxpayerInfo?.hasFamilyDeduction ? 'Có đăng ký' : 'Chưa đăng ký'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Email liên hệ:</span>
                <span className="font-medium text-on-surface">{data.taxpayerInfo?.email || '—'}</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-outline-variant/30 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === 'income' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                Nguồn thu nhập ({data.incomeSources?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === 'monthly' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                Kê khai tháng ({data.monthlyIncomes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dependents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === 'dependents' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                Người phụ thuộc TT87 ({data.dependents?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === 'documents' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                Chứng từ y tế / GD ({data.documents?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settlement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === 'settlement' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                Nháp quyết toán
              </button>
            </div>

            {/* Tab: Income Sources */}
            {activeTab === 'income' && (
              <div className="flex flex-col gap-2">
                {(!data.incomeSources || data.incomeSources.length === 0) ? (
                  <p className="text-on-surface-variant p-4 text-center">Khách hàng chưa thêm nguồn thu nhập nào.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Đơn vị chi trả</TableHead>
                        <TableHead>Mã số thuế</TableHead>
                        <TableHead>Loại thu nhập</TableHead>
                        <TableHead className="text-right">Thu nhập ước tính</TableHead>
                        <TableHead className="text-right">Thuế đã khấu trừ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.incomeSources.map((s, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-on-surface">{s.companyName}</TableCell>
                          <TableCell className="font-mono">{s.taxCode || '—'}</TableCell>
                          <TableCell>{s.incomeType || 'Tiền lương, tiền công'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-on-surface">{formatCurrency(s.estimatedAnnualIncome)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-700">{formatCurrency(s.taxWithheld)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Tab: Monthly Incomes */}
            {activeTab === 'monthly' && (
              <div className="flex flex-col gap-2">
                {(!data.monthlyIncomes || data.monthlyIncomes.length === 0) ? (
                  <p className="text-on-surface-variant p-4 text-center">Chưa có dữ liệu kê khai thu nhập hàng tháng.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tháng/Năm</TableHead>
                        <TableHead className="text-right">Tổng thu nhập (Gross)</TableHead>
                        <TableHead className="text-right">Thu nhập tính thuế</TableHead>
                        <TableHead className="text-right">Thuế đã tạm nộp</TableHead>
                        <TableHead className="text-right">BHXH / Trừ bảo hiểm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.monthlyIncomes.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-on-surface">Tháng {m.month}/{m.year}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(m.grossIncome)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(m.taxableIncome)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-700">{formatCurrency(m.taxDeducted)}</TableCell>
                          <TableCell className="text-right font-mono text-on-surface-variant">{formatCurrency(m.insuranceDeduction)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Tab: Dependents */}
            {activeTab === 'dependents' && (
              <div className="flex flex-col gap-2">
                {(!data.dependents || data.dependents.length === 0) ? (
                  <p className="text-on-surface-variant p-4 text-center">Khách hàng chưa đăng ký người phụ thuộc nào.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Họ và tên</TableHead>
                        <TableHead>Quan hệ</TableHead>
                        <TableHead>Ngày sinh</TableHead>
                        <TableHead>MST / CCCD</TableHead>
                        <TableHead>Thời gian tính giảm trừ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dependents.map((dep, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-on-surface">{dep.fullName}</TableCell>
                          <TableCell>{formatRelationship(dep.relationship)}</TableCell>
                          <TableCell>{formatDate(dep.dateOfBirth)}</TableCell>
                          <TableCell className="font-mono">{dep.taxCodeOrId || '—'}</TableCell>
                          <TableCell>{dep.deductionFromMonth || '—'} đến {dep.deductionToMonth || 'Hiện tại'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Tab: Documents */}
            {activeTab === 'documents' && (
              <div className="flex flex-col gap-2">
                {(!data.documents || data.documents.length === 0) ? (
                  <p className="text-on-surface-variant p-4 text-center">Chưa có chứng từ y tế / giáo dục nào được tải lên.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.documents.map((doc, idx) => (
                      <div key={idx} className="p-3 rounded-xl border bg-surface-container-lowest flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
                          <div className="min-w-0">
                            <span className="font-bold text-on-surface block truncate">{doc.title || doc.documentType}</span>
                            <span className="text-[11px] text-on-surface-variant block">
                              Số tiền: {formatCurrency(doc.amount)} • {formatDate(doc.documentDate)}
                            </span>
                          </div>
                        </div>
                        {doc.fileUrl && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(doc.fileUrl, '_blank')}>
                            Xem
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Settlement Draft */}
            {activeTab === 'settlement' && (
              <div className="flex flex-col gap-3">
                {!data.draftSettlement ? (
                  <p className="text-on-surface-variant p-4 text-center">Chưa có bảng nháp quyết toán thuế.</p>
                ) : (
                  <div className="p-4 rounded-xl border bg-surface-container-low space-y-2">
                    <span className="font-bold text-on-surface text-sm block">Quyết toán tạm tính năm {data.draftSettlement.taxYear}</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Tổng thu nhập chịu thuế</span>
                        <span className="font-bold text-on-surface text-sm">{formatCurrency(data.draftSettlement.totalTaxableIncome)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Giảm trừ bản thân & NPT</span>
                        <span className="font-bold text-on-surface text-sm">{formatCurrency((data.draftSettlement.personalDeduction || 0) + (data.draftSettlement.dependentDeductions || 0))}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Thu nhập tính thuế sau giảm trừ</span>
                        <span className="font-bold text-primary text-sm">{formatCurrency(data.draftSettlement.netTaxableIncome)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Thuế TNCN phải nộp cả năm</span>
                        <span className="font-bold text-on-surface text-sm">{formatCurrency(data.draftSettlement.taxPayable)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Thuế đã tạm nộp / khấu trừ</span>
                        <span className="font-bold text-emerald-700 text-sm">{formatCurrency(data.draftSettlement.taxPaid)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border">
                        <span className="text-on-surface-variant block text-[11px]">Chênh lệch (Hoàn lại / Nộp thêm)</span>
                        <span className={`font-bold text-sm ${data.draftSettlement.taxRefundOrDue >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {data.draftSettlement.taxRefundOrDue >= 0 ? `Hoàn lại: ${formatCurrency(data.draftSettlement.taxRefundOrDue)}` : `Nộp thêm: ${formatCurrency(Math.abs(data.draftSettlement.taxRefundOrDue))}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CompleteConsultationDialog({ state, onChangeNotes, onSubmit, onClose }) {
  const { open, loading, booking, sharedNotes, error } = state
  const noteLength = (sharedNotes || '').trim().length
  const isValid = noteLength >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
            Ghi Biên Bản & Hoàn Tất Ca Tư Vấn
          </DialogTitle>
          <DialogDescription>
            Tóm tắt kết luận và hướng dẫn cho khách hàng #{booking?.bookingCode}. Biên bản này sẽ được lưu vào hồ sơ và hiển thị cho khách hàng.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="shared-notes" className="text-xs font-bold text-on-surface">
              Nội dung biên bản tóm tắt kết quả tư vấn <span className="text-red-500">*</span>
            </Label>
            <span className={`text-[11px] ${noteLength < 10 ? 'text-red-500 font-semibold' : 'text-on-surface-variant'}`}>
              {noteLength}/5000 (Tối thiểu 10 ký tự)
            </span>
          </div>
          <Textarea
            id="shared-notes"
            rows={5}
            value={sharedNotes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Ghi rõ tóm tắt buổi làm việc, các điểm lưu ý về nghĩa vụ thuế, tài liệu khách hàng cần bổ sung hoặc các bước tiếp theo..."
            className="text-xs"
          />
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">info</span>
              Quy tắc thanh toán bảo chứng:
            </div>
            <p>
              Sau khi bạn xác nhận hoàn tất ca, tiền ký quỹ sẽ chuyển sang trạng thái <strong>Chờ kết toán 24h (Cooling-down)</strong>. Nếu khách hàng không có khiếu nại trong 24 giờ, tiền thù lao sẽ tự động được giải ngân vào ví chuyên gia.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={loading || !isValid}
            className="font-bold bg-primary text-on-primary"
          >
            {loading ? 'Đang hoàn tất...' : 'Xác nhận hoàn tất ca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoShowReportDialog({ state, onChangeParty, onChangeReason, onSubmit, onClose }) {
  const { open, loading, booking, noShowParty, reason, error } = state

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <span className="material-symbols-outlined text-[24px]">person_off</span>
            Báo Vắng Mặt Ca Tư Vấn (No-Show)
          </DialogTitle>
          <DialogDescription>
            Áp dụng khi một bên không tham gia phòng tư vấn trực tuyến sau 15 phút kể từ giờ bắt đầu #{booking?.bookingCode}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 py-2 text-xs">
          <div className="flex flex-col gap-1.5">
            <Label className="font-bold text-on-surface">Đối tượng vắng mặt</Label>
            <Select value={noShowParty} onValueChange={onChangeParty}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Khách hàng vắng mặt (Customer No-Show)</SelectItem>
                <SelectItem value="EXPERT">Chuyên gia có việc đột xuất không thể dự</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="noshow-reason" className="font-bold text-on-surface">Lý do vắng mặt / ghi chú</Label>
            <Textarea
              id="noshow-reason"
              rows={3}
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="Ghi rõ lý do vắng mặt hoặc thời điểm đã chờ quá 15 phút..."
              className="text-xs"
            />
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low border text-[11px] text-on-surface-variant space-y-1">
            <p>• <strong>Khách vắng mặt:</strong> Chuyên gia vẫn được bảo vệ mức thù lao theo chính sách nền tảng.</p>
            <p>• <strong>Chuyên gia vắng mặt:</strong> Hệ thống hoàn tiền 100% cho người nộp thuế.</p>
            <p className="text-red-600 font-semibold">• Lưu ý: Hệ thống chỉ chấp nhận báo sau khi quá 15 phút so với giờ hẹn bắt đầu.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button size="sm" variant="destructive" onClick={onSubmit} disabled={loading} className="font-bold">
            {loading ? 'Đang gửi...' : 'Xác nhận báo vắng mặt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BookingEscrowDialog({ state, onClose }) {
  const { open, loading, data, booking, error } = state

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
            Ký Quỹ Bảo Đảm (Escrow)
          </DialogTitle>
          <DialogDescription>
            Bản ghi quỹ bảo đảm ca tư vấn #{booking?.bookingCode}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-on-surface-variant">Đang tải thông tin ký quỹ...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
        ) : !data ? null : (
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border">
              <span className="text-on-surface-variant">Trạng thái ký quỹ:</span>
              <Badge variant={ESCROW_STATUS_MAP[data.escrowStatus]?.variant || 'outline'}>
                {ESCROW_STATUS_MAP[data.escrowStatus]?.label || data.escrowStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border bg-white">
                <span className="text-[11px] text-on-surface-variant block">Tổng tiền khách trả</span>
                <span className="font-bold text-base text-on-surface">{formatCurrency(data.amount)}</span>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <span className="text-[11px] text-on-surface-variant block">Chuyên gia thực nhận</span>
                <span className="font-bold text-base text-primary">{formatCurrency(data.expertReceivable)}</span>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <span className="text-[11px] text-on-surface-variant block">Hoa hồng nền tảng</span>
                <span className="font-semibold text-emerald-700 text-sm">
                  {formatCurrency(data.commissionAmount)} ({data.commissionRate * 100}%)
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <span className="text-[11px] text-on-surface-variant block">Cổng thanh toán</span>
                <span className="font-mono text-on-surface text-sm">{data.paymentGateway || 'PAYOS'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border flex flex-col gap-1 text-[11px] text-on-surface-variant">
              <div>Thời gian thanh toán: <strong className="text-on-surface">{formatDateTime(data.paidAt)}</strong></div>
              <div>Thời gian giải ngân: <strong className="text-on-surface">{formatDateTime(data.settledAt)}</strong></div>
              {data.refundAmount > 0 && (
                <div className="text-red-700">
                  Đã hoàn trả: <strong>{formatCurrency(data.refundAmount)}</strong> lúc {formatDateTime(data.refundedAt)}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
