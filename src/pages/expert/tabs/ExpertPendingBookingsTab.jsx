import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NotificationDialog } from '@/components/ui/notification-dialog'
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

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam' },
  CHAT: { label: 'Nhắn tin', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call' },
}

function SlaLiveCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState('normal') // normal | warning | danger

  useEffect(() => {
    if (!deadline) return
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Đã quá thời hạn 2 giờ')
        setUrgencyLevel('danger')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (diff < 30 * 60 * 1000) {
        setUrgencyLevel('danger')
      } else if (diff < 60 * 60 * 1000) {
        setUrgencyLevel('warning')
      } else {
        setUrgencyLevel('normal')
      }

      setTimeLeft(
        `${hours > 0 ? `${hours} giờ ` : ''}${minutes} phút ${seconds < 10 ? '0' : ''}${seconds} giây`
      )
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  if (!deadline) return <span>—</span>

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-colors ${
        urgencyLevel === 'danger'
          ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
          : urgencyLevel === 'warning'
          ? 'bg-amber-50 text-amber-800 border-amber-300'
          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {urgencyLevel === 'danger' ? 'alarm' : 'timer'}
      </span>
      <span>Hạn duyệt còn: {timeLeft}</span>
    </div>
  )
}

export function ExpertPendingBookingsTab({ initialBookingId, onRefreshStats }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Action states
  const [acceptingId, setAcceptingId] = useState(null)
  const [rejectingBooking, setRejectingBooking] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Detail Modal
  const [detailBooking, setDetailBooking] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [downloadingAttId, setDownloadingAttId] = useState(null)

  // Notification dialog
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  // Auto-refresh interval
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  const fetchPendingBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await expertPortalService.getPendingBookings({ page, size: 10 })
      const items = data?.items || []
      setBookings(items)
      setTotalPages(data?.pagination?.totalPages || 1)
      setTotalItems(data?.pagination?.totalItems ?? items.length)
      onRefreshStats?.(data?.pagination?.totalItems ?? items.length)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách ca tư vấn chờ tiếp nhận.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [page, onRefreshStats])

  useEffect(() => {
    fetchPendingBookings()
  }, [fetchPendingBookings])

  // Open initial booking if passed
  useEffect(() => {
    if (initialBookingId) {
      handleOpenDetail(initialBookingId)
    }
  }, [initialBookingId])

  // 30-sec Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchPendingBookings()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchPendingBookings])

  const handleOpenDetail = async (id) => {
    setDetailLoading(true)
    try {
      const data = await expertPortalService.getBookingDetail(id)
      setDetailBooking(data)
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Không thể xem chi tiết ca tư vấn',
        description: err.message || 'Lỗi khi tải thông tin chi tiết.',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAccept = async (id) => {
    setActionLoading(true)
    setActionError(null)
    try {
      await expertPortalService.acceptBooking(id)
      setAcceptingId(null)
      if (detailBooking?.id === id) {
        setDetailBooking(null)
      }
      setNotice({
        open: true,
        type: 'success',
        title: 'Tiếp nhận ca tư vấn thành công!',
        description: 'Lịch hẹn đã được xác nhận chính thức và chuyển sang danh mục "Quản lý lịch hẹn". Khách hàng đã được gửi thông báo xác nhận.',
      })
      await fetchPendingBookings()
    } catch (err) {
      const msg = err.message || 'Lỗi khi tiếp nhận ca tư vấn.'
      setActionError(msg)
      setNotice({
        open: true,
        type: 'error',
        title: 'Tiếp nhận ca tư vấn thất bại',
        description: msg,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectingBooking || rejectReason.trim().length < 5) return
    setActionLoading(true)
    setActionError(null)
    try {
      await expertPortalService.rejectBooking(rejectingBooking.id, rejectReason.trim())
      setRejectingBooking(null)
      setRejectReason('')
      if (detailBooking?.id === rejectingBooking.id) {
        setDetailBooking(null)
      }
      setNotice({
        open: true,
        type: 'success',
        title: 'Đã từ chối ca tư vấn',
        description: 'Hệ thống đã ghi nhận việc từ chối ca tư vấn và tự động hoàn tiền 100% cho khách hàng.',
      })
      await fetchPendingBookings()
    } catch (err) {
      const msg = err.message || 'Lỗi khi từ chối ca tư vấn.'
      setActionError(msg)
      setNotice({
        open: true,
        type: 'error',
        title: 'Từ chối ca tư vấn thất bại',
        description: msg,
      })
    } finally {
      setActionLoading(false)
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

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Ca tư vấn chờ tiếp nhận</h2>
            <p className="text-xs text-on-surface-variant">
              Khách hàng đã thanh toán. Chuyên gia có 2 giờ để xem xét tiếp nhận hoặc từ chối.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-outline-variant/40 p-0.5 bg-surface-container-low">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span>Dạng bảng</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Dạng thẻ</span>
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span>Tự động cập nhật (30s)</span>
          </label>
          <Button
            size="sm"
            onClick={fetchPendingBookings}
            disabled={loading}
            className="gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </Button>
        </div>
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
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Đang kiểm tra hàng đợi ca tư vấn...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && bookings.length === 0 && !error && (
        <Card className="border border-outline-variant/30 shadow-sm">
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Không có ca nào đang chờ duyệt</h3>
            <p className="text-xs text-on-surface-variant max-w-md text-center">
              Hiện tại bạn đã phản hồi toàn bộ các yêu cầu tư vấn. Hệ thống sẽ tự động cập nhật ngay khi có khách hàng mới đặt lịch và thanh toán thành công.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {!loading && bookings.length > 0 && viewMode === 'table' && (
        <Card className="border border-outline-variant/30 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã ca</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Chủ đề tư vấn</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead className="text-center">Lịch hẹn</TableHead>
                <TableHead className="text-right">Mức phí</TableHead>
                <TableHead className="text-center">Thời gian chờ duyệt</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const session = SESSION_TYPE_MAP[b.sessionType] || { label: b.sessionType, icon: 'help' }
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
                            <span className="material-symbols-outlined text-[12px] text-primary">attach_file</span>
                            {b.attachmentCount} tệp
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs font-medium text-on-surface">
                      {b.topicTitle || 'Yêu cầu tư vấn'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[14px]">{session.icon}</span>
                        {session.label} ({b.durationMinutes}p)
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      <div>{formatDate(b.slotDate)}</div>
                      <div className="text-on-surface-variant text-[11px] font-bold text-primary">
                        {b.startTime} - {b.endTime}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-primary">
                      {formatCurrency(b.fee)}
                    </TableCell>
                    <TableCell className="text-center">
                      <SlaLiveCountdown deadline={b.approvalDeadline} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs gap-1 cursor-pointer font-bold"
                          onClick={() => setAcceptingId(b.id)}
                          disabled={actionLoading}
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Tiếp nhận</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                          onClick={() => {
                            setRejectingBooking(b)
                            setRejectReason('')
                            setActionError(null)
                          }}
                          disabled={actionLoading}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Từ chối</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs cursor-pointer"
                          onClick={() => handleOpenDetail(b.id)}
                          title="Xem chi tiết & tài liệu"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Cards Grid */}
      {!loading && bookings.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {bookings.map((b) => {
            const session = SESSION_TYPE_MAP[b.sessionType] || { label: b.sessionType, icon: 'help' }
            return (
              <Card
                key={b.id}
                className="border-2 border-amber-300/80 hover:border-amber-500 hover:shadow-lg transition-all rounded-2xl flex flex-col bg-surface-container-lowest"
              >
                <CardHeader className="pb-3 border-b border-outline-variant/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                          #{b.bookingCode}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {formatDateTime(b.createdAt)}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-on-surface truncate">
                        {b.topicTitle || 'Yêu cầu tư vấn quyết toán thuế'}
                      </CardTitle>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-primary font-mono block">
                        {formatCurrency(b.fee)}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">Phí tư vấn</span>
                    </div>
                  </div>

                  {/* Countdown banner */}
                  <div className="mt-2 flex items-center justify-between">
                    <SlaLiveCountdown deadline={b.approvalDeadline} />
                    {b.attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                        <span className="material-symbols-outlined text-[16px] text-primary">attach_file</span>
                        {b.attachmentCount} tài liệu
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="py-4 flex flex-col gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{b.userFullName}</span>
                        <span className="text-on-surface-variant text-[11px]">Người nộp thuế</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-primary">{session.icon}</span>
                      <span>{session.label}</span>
                      <span className="text-on-surface-variant font-normal">({b.durationMinutes} phút)</span>
                    </div>
                  </div>

                  {/* Scheduled Slot */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-outline-variant/30">
                    <div>
                      <span className="text-on-surface-variant text-[11px] block">Ngày hẹn tư vấn:</span>
                      <span className="font-bold text-on-surface font-mono text-sm">{formatDate(b.slotDate)}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant text-[11px] block">Khung thời gian:</span>
                      <span className="font-bold text-primary font-mono text-sm">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>
                  </div>

                  {b.specializationName && (
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant text-[11px]">Lĩnh vực:</span>
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        {b.specializationName}
                      </Badge>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2 pb-4 px-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(b.id)}
                    className="gap-1 text-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Xem hồ sơ & tài liệu</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setRejectingBooking(b)
                        setRejectReason('')
                        setActionError(null)
                      }}
                      className="gap-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Từ chối</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setAcceptingId(b.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs shadow-md shadow-emerald-600/20"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Tiếp nhận ca</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog: Tiếp nhận ca tư vấn */}
      <Dialog open={Boolean(acceptingId)} onOpenChange={(open) => !open && setAcceptingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tiếp nhận ca tư vấn</DialogTitle>
            <DialogDescription>
              Bạn đồng ý tiếp nhận buổi tư vấn này. Lịch hẹn sẽ chính thức được chốt và thông báo xác nhận sẽ được gửi tới khách hàng.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAcceptingId(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(acceptingId)}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {actionLoading ? 'Đang xác nhận...' : 'Đồng ý tiếp nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog: Từ chối ca tư vấn */}
      <Dialog open={Boolean(rejectingBooking)} onOpenChange={(open) => !open && setRejectingBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Từ chối ca tư vấn</DialogTitle>
            <DialogDescription>
              Khi từ chối, hệ thống sẽ tự động kích hoạt hoàn tiền 100% cho khách hàng và giải phóng khung giờ. Vui lòng nêu rõ lý do.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              {actionError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason">Lý do từ chối (bắt buộc, từ 5 - 500 ký tự)</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Chuyên gia có việc đột xuất trong khung giờ này / Chủ đề vượt quá phạm vi chuyên môn..."
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
              <span className="text-[11px] text-red-500">Lý do phải có ít nhất 5 ký tự</span>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingBooking(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading || rejectReason.trim().length < 5}
              onClick={handleReject}
            >
              {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối & Hoàn tiền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail & Attachments Dialog */}
      <Dialog open={Boolean(detailBooking)} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <DialogContent className="max-w-2xl">
          {detailBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="orange" className="text-xs">
                    #{detailBooking.bookingCode}
                  </Badge>
                  <span className="text-xs text-on-surface-variant">
                    {formatDateTime(detailBooking.createdAt)}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-on-surface mt-1">
                  {detailBooking.topicTitle || 'Yêu cầu tư vấn'}
                </DialogTitle>
                <DialogDescription>
                  Thông tin chi tiết từ người nộp thuế và hồ sơ tệp đính kèm
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                {/* Customer Information */}
                <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Thông tin khách hàng
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-on-surface-variant block">Họ và tên:</span>
                      <span className="font-bold text-on-surface">{detailBooking.userFullName}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Email:</span>
                      <span className="font-medium text-on-surface">{detailBooking.userEmail || '—'}</span>
                    </div>
                    {detailBooking.userPhoneNumber && (
                      <div>
                        <span className="text-on-surface-variant block">Số điện thoại:</span>
                        <span className="font-medium text-on-surface">{detailBooking.userPhoneNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-on-surface-variant block">Lĩnh vực tư vấn:</span>
                      <span className="font-bold text-primary">{detailBooking.specializationName}</span>
                    </div>
                  </div>
                </div>

                {/* Session Information */}
                <div className="p-3.5 rounded-xl border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Thời gian & Chi phí
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-on-surface-variant block">Ngày hẹn:</span>
                      <span className="font-bold text-on-surface font-mono">{formatDate(detailBooking.slotDate)}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Khung giờ:</span>
                      <span className="font-bold text-primary font-mono">
                        {detailBooking.startTime} - {detailBooking.endTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Mức phí:</span>
                      <span className="font-extrabold text-amber-800 font-mono text-sm">
                        {formatCurrency(detailBooking.fee)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-surface-container-low">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Mô tả vấn đề từ khách hàng
                  </span>
                  <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {detailBooking.problemDescription || 'Khách hàng không cung cấp thêm mô tả.'}
                  </p>
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">attach_file</span>
                    <span>Tài liệu đính kèm ({detailBooking.attachments?.length || 0})</span>
                  </span>

                  {detailBooking.attachments?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {detailBooking.attachments.map((att) => (
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
                            onClick={() => handleDownloadAttachment(detailBooking.id, att)}
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
                      Khách hàng không đính kèm tệp chứng từ nào cho ca tư vấn này.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailBooking(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setRejectingBooking(detailBooking)
                    setRejectReason('')
                  }}
                >
                  Từ chối ca
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAcceptingId(detailBooking.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Tiếp nhận ca
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
    </div>
  )
}
