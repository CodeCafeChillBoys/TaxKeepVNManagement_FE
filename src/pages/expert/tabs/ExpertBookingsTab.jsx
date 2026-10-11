import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NotificationDialog } from '@/components/ui/notification-dialog'
import { expertPortalService } from '@/services/expertPortalService'

const ALL = '__ALL__'

const STATUS_MAP = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning', color: 'text-amber-700 bg-amber-50' },
  AWAITING_EXPERT_APPROVAL: { label: 'Chờ duyệt (SLA 2h)', variant: 'orange', color: 'text-orange-700 bg-orange-50' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success', color: 'text-emerald-700 bg-emerald-50' },
  COMPLETED: { label: 'Đã hoàn thành', variant: 'default', color: 'text-blue-700 bg-blue-50' },
  REJECTED_BY_EXPERT: { label: 'Đã từ chối', variant: 'destructive', color: 'text-red-700 bg-red-50' },
  CANCELLED_BY_USER: { label: 'Khách đã hủy', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
  CANCELLED_BY_EXPERT: { label: 'Chuyên gia hủy', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
  EXPIRED_NO_RESPONSE: { label: 'Hết hạn phản hồi', variant: 'destructive', color: 'text-red-700 bg-red-50' },
  EXPIRED_UNPAID: { label: 'Hết hạn thanh toán', variant: 'muted', color: 'text-stone-600 bg-stone-100' },
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetail(b.id)}
                        className="text-xs h-8"
                      >
                        Chi tiết
                      </Button>
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
                </div>

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
    </div>
  )
}
