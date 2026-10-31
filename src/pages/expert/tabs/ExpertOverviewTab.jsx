import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { NotificationDialog, ConfirmDialog } from '@/components/ui/notification-dialog'
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

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam' },
  CHAT: { label: 'Nhắn tin', icon: 'chat' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call' },
}

const STATUS_MAP = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning' },
  AWAITING_EXPERT_APPROVAL: { label: 'Chờ duyệt', variant: 'orange' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  IN_PROGRESS: { label: 'Đang tư vấn', variant: 'warning' },
  COMPLETED: { label: 'Đã hoàn thành', variant: 'default' },
  SETTLED: { label: 'Đã giải ngân', variant: 'success' },
  REJECTED_BY_EXPERT: { label: 'Đã từ chối', variant: 'destructive' },
  CANCELLED_BY_USER: { label: 'Khách đã hủy', variant: 'muted' },
  CANCELLED_BY_EXPERT: { label: 'Chuyên gia hủy', variant: 'muted' },
  EXPIRED_NO_RESPONSE: { label: 'Hết hạn phản hồi', variant: 'destructive' },
  EXPIRED_UNPAID: { label: 'Hết hạn thanh toán', variant: 'muted' },
}

// Countdown component for remaining SLA time
function SlaCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (!deadline) return
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Đã hết hạn')
        setIsUrgent(true)
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setIsUrgent(diff < 30 * 60 * 1000) // Dưới 30 phút -> khẩn cấp
      setTimeLeft(
        `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`
      )
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  if (!deadline) return <span>—</span>

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
        isUrgent
          ? 'bg-red-100 text-red-700 animate-pulse border border-red-300'
          : 'bg-amber-100 text-amber-800 border border-amber-300'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">timer</span>
      {timeLeft}
    </span>
  )
}

export function ExpertOverviewTab({ onNavigate, onSelectBooking }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingBookings, setPendingBookings] = useState([])
  const [confirmedBookings, setConfirmedBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    totalRevenue: 0,
  })
  const [upcomingReminder, setUpcomingReminder] = useState(null)
  const [joiningMeeting, setJoiningMeeting] = useState(false)

  // Dialog states
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })
  const [slaModalOpen, setSlaModalOpen] = useState(false)
  const [revenueInfoOpen, setRevenueInfoOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const [pendingRes, allRes, reminderRes] = await Promise.all([
      expertPortalService.getPendingBookings({ page: 1, size: 5 }).catch(() => ({ items: [] })),
      expertPortalService.getExpertBookings({ page: 1, size: 50 }).catch(() => ({ items: [] })),
      expertPortalService.getUpcomingReminder().catch(() => null),
    ])

    const pendingItems = pendingRes?.items || []
    const allItems = allRes?.items || []

    const confirmedItems = allItems.filter((b) => b.status === 'CONFIRMED')
    const completedItems = allItems.filter((b) => b.status === 'COMPLETED')

    // Doanh thu tạm tính từ các ca đã chốt hoặc đã hoàn thành
    const revenue = [...confirmedItems, ...completedItems].reduce(
      (sum, b) => sum + (Number(b.fee) || 0),
      0
    )

    setPendingBookings(pendingItems)
    setConfirmedBookings(confirmedItems.slice(0, 5))
    setAllBookings(allItems)
    setUpcomingReminder(reminderRes?.hasUpcomingMeeting ? reminderRes : null)
    setStats({
      pending: pendingRes?.pagination?.totalItems ?? pendingItems.length,
      confirmed: confirmedItems.length,
      completed: completedItems.length,
      totalRevenue: revenue,
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchData()
      .catch((err) => {
        console.error('Lỗi khi tải dữ liệu tổng quan:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [fetchData])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchData()
      setNotice({
        open: true,
        type: 'success',
        title: 'Đã cập nhật dữ liệu mới nhất',
        description: 'Số liệu tổng quan về các ca tư vấn và doanh thu đã được đồng bộ với máy chủ.',
      })
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Không thể làm mới dữ liệu',
        description: err.message || 'Lỗi kết nối khi đồng bộ dữ liệu mới nhất.',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleJoinUpcomingMeeting = async () => {
    if (!upcomingReminder?.bookingId) return
    setJoiningMeeting(true)
    try {
      const res = await expertPortalService.joinConsultation(upcomingReminder.bookingId)
      if (res?.roomUrl) {
        window.open(res.roomUrl, '_blank')
        setNotice({
          open: true,
          type: 'success',
          title: 'Đang mở phòng tư vấn trực tuyến',
          description: 'Hệ thống đã kết nối và mở phòng tư vấn Jitsi Meet thành công.',
        })
        fetchData()
      } else {
        throw new Error('Chưa nhận được đường dẫn phòng họp từ hệ thống.')
      }
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: 'Chưa thể vào phòng tư vấn',
        description: err.message || 'Lỗi khi kết nối tới phòng tư vấn.',
      })
    } finally {
      setJoiningMeeting(false)
    }
  }

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#182747] via-[#213555] to-[#2c4066] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <span className="material-symbols-outlined text-[200px]">support_agent</span>
        </div>

        <div className="flex flex-col gap-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold w-fit">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>BẢNG ĐIỀU KHIỂN CHUYÊN GIA TƯ VẤN THUẾ</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Chào mừng trở lại phiên làm việc!
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            Theo dõi danh sách ca tư vấn, phê duyệt yêu cầu trong hạn SLA 2 giờ và quản lý lịch hẹn tư vấn thuế với người nộp thuế.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <Button
            onClick={() => onNavigate('cho-tiep-nhan')}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            <span>Xử lý ca chờ ({stats.pending})</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('lich-hen')}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            <span>Xem toàn bộ lịch hẹn</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5"
            title="Đồng bộ dữ liệu mới nhất"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </Button>
        </div>
      </div>

      {/* Upcoming Meeting Alert Banner */}
      {upcomingReminder && (
        <div className={`rounded-2xl p-6 border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
          upcomingReminder.isRoomOpen || upcomingReminder.canJoinRoom
            ? 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-teal-950/90 border-emerald-500/50 text-white ring-2 ring-emerald-400/40'
            : 'bg-gradient-to-r from-amber-950/90 via-stone-900/90 to-amber-950/80 border-amber-500/40 text-white'
        }`}>
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              upcomingReminder.isRoomOpen || upcomingReminder.canJoinRoom
                ? 'bg-emerald-500 text-white animate-pulse'
                : 'bg-amber-500 text-stone-950'
            }`}>
              <span className="material-symbols-outlined text-[28px]">videocam</span>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  upcomingReminder.isRoomOpen || upcomingReminder.canJoinRoom
                    ? 'bg-emerald-400 text-stone-950'
                    : 'bg-amber-400 text-stone-950'
                }`}>
                  <span className="material-symbols-outlined text-[13px]">
                    {upcomingReminder.isRoomOpen ? 'meeting_room' : 'schedule'}
                  </span>
                  <span>{upcomingReminder.isRoomOpen ? 'PHÒNG HỌP ĐÃ MỞ' : 'LỊCH HẸN SẮP TỚI'}</span>
                </span>

                <span className="text-xs text-white/70">
                  Mã: <span className="font-mono font-bold text-amber-300">{upcomingReminder.bookingCode || '—'}</span>
                </span>
              </div>

              <h3 className="text-lg font-bold tracking-tight text-white">
                {upcomingReminder.topicTitle || 'Buổi tư vấn thuế'}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-amber-300">person</span>
                  <span>Khách hàng: <strong className="text-white">{upcomingReminder.partnerName || 'Khách hàng'}</strong></span>
                </span>

                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-amber-300">event</span>
                  <span>{upcomingReminder.slotDate}</span>
                </span>

                <span className="flex items-center gap-1 font-mono font-semibold">
                  <span className="material-symbols-outlined text-[15px] text-amber-300">schedule</span>
                  <span>
                    {upcomingReminder.startTime ? String(upcomingReminder.startTime).slice(0, 5) : ''} -{' '}
                    {upcomingReminder.endTime ? String(upcomingReminder.endTime).slice(0, 5) : ''}
                  </span>
                </span>
              </div>

              {upcomingReminder.reminderMessage && (
                <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                  {upcomingReminder.reminderMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            {upcomingReminder.canJoinRoom || upcomingReminder.isRoomOpen ? (
              <Button
                onClick={handleJoinUpcomingMeeting}
                disabled={joiningMeeting}
                className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold gap-2 shadow-lg shadow-emerald-400/20 px-5 py-2.5 text-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">videocam</span>
                <span>{joiningMeeting ? 'Đang kết nối...' : 'Vào phòng họp ngay'}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  if (onSelectBooking && upcomingReminder.bookingId) {
                    onSelectBooking(upcomingReminder.bookingId)
                  }
                  onNavigate('lich-hen')
                }}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5 text-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Xem chi tiết lịch hẹn</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chờ tiếp nhận (SLA 2h) */}
        <Card
          onClick={() => setSlaModalOpen(true)}
          className={`border shadow-sm transition-all hover:shadow-md cursor-pointer ${
            stats.pending > 0 ? 'border-amber-400/60 bg-amber-50/40 ring-1 ring-amber-400/30' : 'border-outline-variant/30'
          }`}
          title="Nhấn để xem quy chế phản hồi trong 2 giờ"
        >
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span>Ca chờ duyệt</span>
              <span className="material-symbols-outlined text-[14px] text-amber-600">help</span>
            </CardTitle>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              stats.pending > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-surface-container text-on-surface-variant'
            }`}>
              <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-on-surface">{stats.pending}</div>
            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
              {stats.pending > 0 ? (
                <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Cần phản hồi trong 2 giờ
                </span>
              ) : (
                <span>Không có ca nào đang chờ</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Lịch đã xác nhận */}
        <Card className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Lịch đã xác nhận
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">event_available</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700">{stats.confirmed}</div>
            <p className="text-xs text-on-surface-variant mt-1">
              Ca tư vấn đã chốt với khách hàng
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Ca đã hoàn thành */}
        <Card className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ca đã hoàn thành
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-800">{stats.completed}</div>
            <p className="text-xs text-on-surface-variant mt-1">
              Phiên tư vấn kết thúc thành công
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Doanh thu tạm tính */}
        <Card
          onClick={() => setRevenueInfoOpen(true)}
          className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-amber-50/20 cursor-pointer"
          title="Nhấn để xem thông tin cơ chế tính phí"
        >
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span>Phí tư vấn ước tính</span>
              <span className="material-symbols-outlined text-[14px] text-amber-600">info</span>
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-300">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-black text-amber-800">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Từ các ca đã duyệt & hoàn tất
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Alert Section if pending > 0 */}
      {pendingBookings.length > 0 && (
        <Card className="border-2 border-amber-400 bg-amber-50/50 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-bounce">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              </div>
              <div>
                <CardTitle className="text-base text-amber-900 font-extrabold flex items-center gap-2">
                  <span>YÊU CẦU TƯ VẤN CẦN PHẢN HỒI GẤP</span>
                  <Badge variant="warning">{pendingBookings.length} ca chờ</Badge>
                </CardTitle>
                <CardDescription className="text-amber-800/80 text-xs">
                  Quy định SLA: Quá 2 giờ kể từ khi khách thanh toán mà chuyên gia không tiếp nhận, hệ thống sẽ tự động hoàn tiền 100% cho khách.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onNavigate('cho-tiep-nhan')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Xem toàn bộ ca chờ
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBooking?.(b.id)
                    onNavigate('cho-tiep-nhan')
                  }}
                  className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-800">#{b.bookingCode}</span>
                    <SlaCountdown deadline={b.approvalDeadline} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900 truncate">{b.topicTitle || 'Tư vấn quyết toán thuế'}</span>
                    <span className="text-sm font-extrabold text-amber-800">{formatCurrency(b.fee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span className="flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                      {b.userFullName}
                    </span>
                    <span>{formatDate(b.slotDate)} ({b.durationMinutes}p)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split Section: Next Upcoming Bookings & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Upcoming Confirmed Sessions */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">schedule</span>
              <CardTitle className="text-base font-bold text-on-surface">Lịch hẹn sắp tới</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('lich-hen')}
              className="text-xs text-primary font-bold"
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent>
            {confirmedBookings.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {confirmedBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBooking?.(b.id)
                      onNavigate('lich-hen')
                    }}
                    className="p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low hover:border-primary/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">videocam</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {b.topicTitle || 'Tư vấn thuế'}
                        </span>
                        <span className="text-xs text-on-surface-variant truncate">
                          Khách hàng: <b>{b.userFullName}</b> • #{b.bookingCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs font-bold text-primary font-mono">
                        {formatDate(b.slotDate)}
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] text-outline">event_busy</span>
                <p className="text-xs">Chưa có lịch hẹn nào sắp tới.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Bookings Table Preview */}
        <Card className="shadow-sm border border-outline-variant/30">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">history</span>
              <CardTitle className="text-base font-bold text-on-surface">Hoạt động gần đây</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('lich-hen')}
              className="text-xs text-primary font-bold"
            >
              Xem chi tiết
            </Button>
          </CardHeader>
          <CardContent>
            {allBookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã ca</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Phí</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBookings.slice(0, 5).map((b) => {
                    const st = STATUS_MAP[b.status] || { label: b.status, variant: 'outline' }
                    return (
                      <TableRow
                        key={b.id}
                        onClick={() => {
                          onSelectBooking?.(b.id)
                          onNavigate('lich-hen')
                        }}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          #{b.bookingCode}
                        </TableCell>
                        <TableCell className="font-medium text-xs max-w-[120px] truncate">
                          {b.userFullName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant} className="text-[10px] px-2 py-0">
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs font-mono text-primary">
                          {formatCurrency(b.fee)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] text-outline">history</span>
                <p className="text-xs">Chưa có hoạt động nào được ghi nhận.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thông báo chung (Notification Dialog) */}
      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />

      {/* Hướng dẫn / Cảnh báo SLA 2 giờ (Dialog) */}
      <ConfirmDialog
        open={slaModalOpen}
        onOpenChange={setSlaModalOpen}
        type="warning"
        title="Quy chế tiếp nhận ca tư vấn"
        description={
          stats.pending > 0
            ? `Hiện tại bạn có ${stats.pending} ca tư vấn đang chờ xử lý. Theo quy chế của TaxKeep VN, chuyên gia cần tiếp nhận hoặc từ chối trong vòng 2 giờ kể từ khi khách hàng hoàn tất thanh toán. Quá thời gian này, hệ thống sẽ tự động hoàn trả 100% chi phí cho khách hàng.`
            : "Chính sách phản hồi trong 2 giờ đảm bảo người nộp thuế được hỗ trợ kịp thời. Khi có khách hàng đặt lịch và thanh toán thành công, bạn sẽ nhận được thông báo và có đúng 2 giờ để duyệt hoặc từ chối ca."
        }
        confirmText="Đi đến ca chờ tiếp nhận"
        cancelText="Đóng"
        onConfirm={() => {
          setSlaModalOpen(false)
          onNavigate('cho-tiep-nhan')
        }}
      />

      {/* Thông tin giải thích phí ước tính (Dialog) */}
      <NotificationDialog
        open={revenueInfoOpen}
        onOpenChange={setRevenueInfoOpen}
        type="info"
        title="Cơ chế tính phí tư vấn ước tính"
        description="Mức phí tư vấn ước tính được tổng hợp tự động từ các ca tư vấn có trạng thái 'Đã xác nhận' và 'Đã hoàn thành'. Thu nhập thực tế sẽ được nền tảng đối soát và quyết toán theo chu kỳ thanh toán định kỳ."
        confirmText="Đã hiểu"
      />
    </div>
  )
}
