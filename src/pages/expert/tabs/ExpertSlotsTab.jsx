import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NotificationDialog, ConfirmDialog } from '@/components/ui/notification-dialog'
import { expertPortalService } from '@/services/expertPortalService'

const SESSION_TYPE_MAP = {
  ONLINE_MEETING: { label: 'Họp trực tuyến', icon: 'videocam', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  CHAT: { label: 'Nhắn tin', icon: 'chat', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VOICE_CALL: { label: 'Gọi thoại', icon: 'call', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const COMMON_TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
]

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateVi(dateStr) {
  if (!dateStr) return '—'
  try {
    const [y, m, d] = dateStr.split('-')
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    const dayName = dayNames[dt.getDay()] || ''
    return `${dayName}, ${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days = []

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevDate = new Date(year, month - 1, d)
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      date: prevDate,
    })
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      date: currDate,
    })
  }

  // Next month leading days to complete full grid (multiple of 7)
  const totalCells = days.length <= 35 ? 35 : 42
  const nextDaysNeeded = totalCells - days.length
  for (let d = 1; d <= nextDaysNeeded; d++) {
    const nextDate = new Date(year, month + 1, d)
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      date: nextDate,
    })
  }

  return days
}

export function ExpertSlotsTab() {
  const today = new Date()
  const todayStr = useMemo(() => getTodayStr(), [])

  // Calendar View State: Year and Month
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0 to 11
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr())
  const [showAllMonth, setShowAllMonth] = useState(false)

  // Slots data
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters with Dropdown Select
  const [filterSessionType, setFilterSessionType] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'AVAILABLE' | 'BOOKED' | 'INACTIVE'

  // Modal Create / Edit Slot
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingSlot, setEditingSlot] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    slotDate: '',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'ONLINE_MEETING',
    isActive: true,
  })

  // Dialogs
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Xác nhận',
    variant: 'default',
    onConfirm: () => {},
  })

  // Fetch all slots for current viewing month
  const fetchMonthSlots = useCallback(async () => {
    try {
      const pad = (n) => String(n).padStart(2, '0')
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
      const fromDate = `${viewYear}-${pad(viewMonth + 1)}-01`
      const toDate = `${viewYear}-${pad(viewMonth + 1)}-${pad(daysInMonth)}`

      const data = await expertPortalService.getMySlots({
        fromDate,
        toDate,
      })
      setSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Lỗi tải khung giờ làm việc:', err)
      setNotice({
        open: true,
        type: 'error',
        title: 'Không thể tải lịch làm việc',
        description: err.message || 'Lỗi kết nối khi tải danh sách khung giờ.',
      })
    }
  }, [viewYear, viewMonth])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchMonthSlots().finally(() => {
      if (isMounted) setLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [fetchMonthSlots])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchMonthSlots()
      setNotice({
        open: true,
        type: 'success',
        title: 'Đã cập nhật dữ liệu mới nhất',
        description: 'Danh sách khung giờ làm việc đã được đồng bộ với máy chủ.',
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleGoToday = () => {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setSelectedDate(getTodayStr())
    setShowAllMonth(false)
  }

  // Select day on calendar table
  const handleSelectDay = (day) => {
    setSelectedDate(day.dateStr)
    setShowAllMonth(false)
    if (!day.isCurrentMonth) {
      setViewYear(day.date.getFullYear())
      setViewMonth(day.date.getMonth())
    }
  }

  // Reset filters
  const handleResetFilters = () => {
    setFilterSessionType('ALL')
    setFilterStatus('ALL')
    setShowAllMonth(false)
    setSelectedDate(getTodayStr())
  }

  const hasActiveFilters = filterSessionType !== 'ALL' || filterStatus !== 'ALL' || showAllMonth

  // Calendar days grid calculation
  const calendarDays = useMemo(() => {
    return getCalendarDays(viewYear, viewMonth)
  }, [viewYear, viewMonth])

  // Group slots by date string for fast calendar lookup
  const slotsByDate = useMemo(() => {
    const map = {}
    slots.forEach((s) => {
      if (!map[s.slotDate]) map[s.slotDate] = []
      map[s.slotDate].push(s)
    })
    return map
  }, [slots])

  // Filter slots for list display
  const displayedSlots = useMemo(() => {
    return slots.filter((slot) => {
      // 1. Date filter (if not viewing all month)
      if (!showAllMonth && selectedDate && slot.slotDate !== selectedDate) {
        return false
      }

      // 2. Dropdown: Dịch vụ tư vấn
      if (filterSessionType !== 'ALL' && slot.sessionType !== filterSessionType) {
        return false
      }

      // 3. Dropdown: Trạng thái
      if (filterStatus === 'AVAILABLE' && (!slot.isActive || slot.isBooked || slot.isHolding)) {
        return false
      }
      if (filterStatus === 'BOOKED' && !slot.isBooked) {
        return false
      }
      if (filterStatus === 'INACTIVE' && (slot.isActive || slot.isBooked)) {
        return false
      }

      return true
    })
  }, [slots, showAllMonth, selectedDate, filterSessionType, filterStatus])

  // Statistics for the currently viewed month
  const totalMonthSlots = slots.length
  const availableMonthSlots = slots.filter((s) => s.isActive && !s.isBooked && !s.isHolding).length
  const bookedMonthSlots = slots.filter((s) => s.isBooked).length
  const inactiveMonthSlots = slots.filter((s) => !s.isActive && !s.isBooked).length

  // Open Create Modal
  const handleOpenCreateModal = (prefillDate = null) => {
    const defaultDate = prefillDate || selectedDate || getTodayStr()
    setModalMode('create')
    setEditingSlot(null)
    setFormData({
      slotDate: defaultDate,
      startTime: '09:00',
      endTime: '10:00',
      sessionType: 'ONLINE_MEETING',
      isActive: true,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (slot) => {
    if (slot.isBooked) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Không thể chỉnh sửa',
        description: 'Khung giờ này đã có khách hàng đặt lịch hẹn. Bạn không thể chỉnh sửa thông tin.',
      })
      return
    }

    setModalMode('edit')
    setEditingSlot(slot)
    setFormData({
      slotDate: slot.slotDate,
      startTime: formatTimeDisplay(slot.startTime),
      endTime: formatTimeDisplay(slot.endTime),
      sessionType: slot.sessionType || 'ONLINE_MEETING',
      isActive: slot.isActive ?? true,
    })
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleSubmitSlot = async (e) => {
    e.preventDefault()

    if (!formData.slotDate) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn ngày làm việc.',
      })
      return
    }

    if (formData.startTime >= formData.endTime) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Thời gian không hợp lệ',
        description: 'Giờ kết thúc phải diễn ra sau giờ bắt đầu.',
      })
      return
    }

    // Check not in past
    const selectedDateTime = new Date(`${formData.slotDate}T${formData.startTime}:00`)
    if (selectedDateTime <= new Date()) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Thời gian trong quá khứ',
        description: 'Vui lòng chọn khung giờ trong tương lai để khách hàng có thể đặt lịch.',
      })
      return
    }

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await expertPortalService.createSlot({
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          sessionType: formData.sessionType,
        })
        setNotice({
          open: true,
          type: 'success',
          title: 'Tạo khung giờ thành công',
          description: `Đã mở khung giờ ${formData.startTime} - ${formData.endTime} ngày ${formatDateVi(formData.slotDate)} để khách hàng đặt lịch.`,
        })
      } else {
        await expertPortalService.updateSlot(editingSlot.id, {
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          sessionType: formData.sessionType,
          isActive: formData.isActive,
        })
        setNotice({
          open: true,
          type: 'success',
          title: 'Cập nhật khung giờ thành công',
          description: 'Thông tin khung giờ làm việc đã được cập nhật thành công.',
        })
      }
      setIsModalOpen(false)
      fetchMonthSlots()
    } catch (err) {
      setNotice({
        open: true,
        type: 'error',
        title: modalMode === 'create' ? 'Không thể tạo khung giờ' : 'Không thể cập nhật khung giờ',
        description: err.message || 'Khung giờ này có thể bị trùng lặp hoặc vi phạm quy định sàn.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Toggle Active
  const handleToggleActive = (slot) => {
    if (slot.isBooked) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Không thể thao tác',
        description: 'Khung giờ này đã được khách hàng đặt lịch hẹn.',
      })
      return
    }

    const nextState = !slot.isActive
    setConfirmDialog({
      open: true,
      title: nextState ? 'Mở lại khung giờ nhận lịch' : 'Tạm tắt khung giờ nhận lịch',
      description: nextState
        ? `Bạn có chắc muốn mở lại khung giờ ${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)} ngày ${formatDateVi(slot.slotDate)} để khách hàng tìm kiếm và đặt lịch?`
        : `Bạn có chắc muốn tạm dừng nhận hẹn khung giờ ${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)} ngày ${formatDateVi(slot.slotDate)}? Khách hàng sẽ không thấy khung giờ này nữa.`,
      confirmText: nextState ? 'Mở nhận lịch' : 'Tạm tắt',
      variant: nextState ? 'default' : 'warning',
      onConfirm: async () => {
        try {
          await expertPortalService.toggleSlotActive(slot.id)
          setNotice({
            open: true,
            type: 'success',
            title: nextState ? 'Đã mở nhận lịch' : 'Đã tạm tắt nhận lịch',
            description: `Khung giờ đã được chuyển sang trạng thái ${nextState ? 'Sẵn sàng nhận hẹn' : 'Tạm tắt'}.`,
          })
          fetchMonthSlots()
        } catch (err) {
          setNotice({
            open: true,
            type: 'error',
            title: 'Lỗi thay đổi trạng thái',
            description: err.message || 'Không thể thay đổi trạng thái khung giờ.',
          })
        }
      },
    })
  }

  // Handle Delete Slot
  const handleDeleteSlot = (slot) => {
    if (slot.isBooked) {
      setNotice({
        open: true,
        type: 'warning',
        title: 'Không thể xóa khung giờ',
        description: 'Khung giờ này đã có khách hàng đặt lịch hẹn. Không được phép xóa.',
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: 'Xóa khung giờ làm việc',
      description: `Bạn có chắc chắn muốn xóa khung giờ ${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)} ngày ${formatDateVi(slot.slotDate)}? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa khung giờ',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await expertPortalService.deleteSlot(slot.id)
          setNotice({
            open: true,
            type: 'success',
            title: 'Đã xóa khung giờ',
            description: 'Khung giờ làm việc đã được xóa khỏi hệ thống thành công.',
          })
          fetchMonthSlots()
        } catch (err) {
          setNotice({
            open: true,
            type: 'error',
            title: 'Không thể xóa khung giờ',
            description: err.message || 'Không thể xóa khung giờ vào lúc này.',
          })
        }
      },
    })
  }

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#182747] via-[#213555] to-[#2c4066] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <span className="material-symbols-outlined text-[200px]">calendar_month</span>
        </div>

        <div className="flex flex-col gap-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold w-fit">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>QUẢN LÝ LỊCH RẢNH TƯ VẤN</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Lịch làm việc của chuyên gia
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            Xem lịch trực quan theo bảng tháng ngày, chọn ngày để xem ca làm việc và mở khung giờ nhận hẹn tư vấn người nộp thuế.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <Button
            onClick={() => handleOpenCreateModal()}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Mở khung giờ mới</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1.5 cursor-pointer"
            title="Đồng bộ dữ liệu mới nhất"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (Thống kê theo tháng đang xem) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Tổng ca trong tháng
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">calendar_view_week</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-on-surface">{totalMonthSlots}</div>
            <p className="text-xs text-on-surface-variant mt-1">
              Tháng {viewMonth + 1}/{viewYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-300/60 bg-emerald-50/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Sẵn sàng nhận hẹn
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700">{availableMonthSlots}</div>
            <p className="text-xs text-emerald-800/80 mt-1">Khách hàng có thể đặt ngay</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-300/60 bg-blue-50/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Đã có khách đặt
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">event_seat</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">{bookedMonthSlots}</div>
            <p className="text-xs text-blue-800/80 mt-1">Ca tư vấn đã được chốt lịch</p>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Tạm tắt nhận lịch
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">pause_circle</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-stone-600">{inactiveMonthSlots}</div>
            <p className="text-xs text-on-surface-variant mt-1">Khách hàng không thể thấy</p>
          </CardContent>
        </Card>
      </div>

      {/* Bảng lịch ngày tháng năm (Interactive Monthly Calendar Grid) */}
      <Card className="border border-outline-variant/30 shadow-sm bg-surface overflow-hidden">
        <CardHeader className="p-4 bg-surface-container/40 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-on-surface">
                Bảng lịch ngày tháng: Tháng {viewMonth + 1}, {viewYear}
              </CardTitle>
              <p className="text-xs text-on-surface-variant">
                Bấm vào một ngày trên lịch để xem và quản lý các ca tư vấn của ngày đó
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToday}
              className="h-8 text-xs font-semibold gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">today</span>
              <span>Hôm nay</span>
            </Button>

            <div className="flex items-center rounded-lg border border-outline-variant/30 bg-surface">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0 cursor-pointer text-on-surface hover:bg-surface-container"
                title="Tháng trước"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </Button>
              <span className="text-xs font-extrabold px-3 text-on-surface min-w-[75px] text-center">
                {String(viewMonth + 1).padStart(2, '0')} / {viewYear}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0 cursor-pointer text-on-surface hover:bg-surface-container"
                title="Tháng sau"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex flex-col gap-3">
          {/* Calendar Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs py-2 bg-surface-container/20 rounded-lg">
            <div className="text-stone-600">Thứ 2</div>
            <div className="text-stone-600">Thứ 3</div>
            <div className="text-stone-600">Thứ 4</div>
            <div className="text-stone-600">Thứ 5</div>
            <div className="text-stone-600">Thứ 6</div>
            <div className="text-amber-700">Thứ 7</div>
            <div className="text-red-600">Chủ Nhật</div>
          </div>

          {/* Calendar day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              const isToday = day.dateStr === todayStr
              const isSelected = !showAllMonth && day.dateStr === selectedDate
              const daySlots = slotsByDate[day.dateStr] || []
              const availableCount = daySlots.filter((s) => s.isActive && !s.isBooked && !s.isHolding).length
              const bookedCount = daySlots.filter((s) => s.isBooked).length
              const holdingCount = daySlots.filter((s) => s.isHolding && !s.isBooked).length

              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleSelectDay(day)}
                  className={`min-h-[82px] sm:min-h-[96px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 shadow-md ring-2 ring-amber-400'
                      : isToday
                      ? 'border-blue-400 bg-blue-50/30'
                      : day.isCurrentMonth
                      ? 'border-outline-variant/20 bg-surface hover:bg-surface-container/60 hover:border-outline-variant/40'
                      : 'border-transparent bg-stone-50/40 opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950'
                          : isToday
                          ? 'bg-blue-600 text-white'
                          : day.isCurrentMonth
                          ? 'text-on-surface'
                          : 'text-stone-400'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {daySlots.length > 0 && (
                      <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-md border border-stone-200">
                        {daySlots.length} ca
                      </span>
                    )}
                  </div>

                  {/* Slot badges in cell */}
                  <div className="flex flex-col gap-1 mt-1">
                    {availableCount > 0 && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{availableCount} rảnh</span>
                      </div>
                    )}
                    {bookedCount > 0 && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{bookedCount} đã đặt</span>
                      </div>
                    )}
                    {holdingCount > 0 && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 truncate animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{holdingCount} giữ chỗ</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs">Sẵn sàng nhận hẹn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs">Đã có khách đặt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs">Đang tạm giữ thanh toán (10p)</span>
              </div>
            </div>

            <span className="text-[11px] text-stone-500 italic">
              * Nhấn chọn bất kỳ ô ngày nào trên bảng lịch để xem danh sách ca bên dưới
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Filter Dropdowns Bar */}
      <Card className="border border-outline-variant/30 shadow-sm bg-surface overflow-hidden">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Dropdown 1: Dịch vụ tư vấn */}
            <div className="flex flex-col gap-1 min-w-[220px]">
              <Label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">category</span>
                <span>Dịch vụ tư vấn</span>
              </Label>
              <Select value={filterSessionType} onValueChange={setFilterSessionType}>
                <SelectTrigger className="h-9 text-xs bg-surface-container-low font-medium">
                  <SelectValue placeholder="Tất cả dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả dịch vụ tư vấn</SelectItem>
                  <SelectItem value="ONLINE_MEETING">📹 Họp trực tuyến (1-1)</SelectItem>
                  <SelectItem value="CHAT">💬 Nhắn tin tư vấn</SelectItem>
                  <SelectItem value="VOICE_CALL">📞 Gọi thoại tư vấn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown 2: Trạng thái khung giờ */}
            <div className="flex flex-col gap-1 min-w-[220px]">
              <Label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">tune</span>
                <span>Trạng thái khung giờ</span>
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs bg-surface-container-low font-medium">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="AVAILABLE">🟢 Sẵn sàng nhận hẹn</SelectItem>
                  <SelectItem value="BOOKED">🔵 Đã có khách đặt</SelectItem>
                  <SelectItem value="INACTIVE">⚪ Tạm tắt nhận lịch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nút đặt lại bộ lọc */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="mt-5 text-xs text-on-surface-variant hover:text-red-600 gap-1 h-9 cursor-pointer"
                title="Đặt lại bộ lọc về mặc định"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                <span>Đặt lại</span>
              </Button>
            )}
          </div>

          {/* Chế độ xem: Theo ngày chọn vs Toàn bộ tháng */}
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Button
              variant={!showAllMonth ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowAllMonth(false)
                if (!selectedDate) setSelectedDate(getTodayStr())
              }}
              className="text-xs font-semibold gap-1.5 h-9 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">event</span>
              <span>Theo ngày ({formatDateVi(selectedDate).split(',')[0]})</span>
            </Button>

            <Button
              variant={showAllMonth ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAllMonth(true)}
              className="text-xs font-semibold gap-1.5 h-9 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_view_month</span>
              <span>Cả tháng ({slots.length})</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slots Table & List */}
      <Card className="border border-outline-variant/30 shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-surface-container/30 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-500">
              {showAllMonth ? 'calendar_view_month' : 'event_available'}
            </span>
            <div>
              <CardTitle className="text-sm font-extrabold text-on-surface">
                {showAllMonth
                  ? `Toàn bộ khung giờ làm việc: Tháng ${viewMonth + 1}/${viewYear}`
                  : `Khung giờ làm việc ngày: ${formatDateVi(selectedDate)}`}
              </CardTitle>
              <p className="text-xs text-on-surface-variant">
                Hiển thị {displayedSlots.length} khung giờ phù hợp bộ lọc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showAllMonth && (
              <Button
                size="sm"
                onClick={() => handleOpenCreateModal(selectedDate)}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs gap-1.5 h-8 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Thêm ca ngày này</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-container/60">
              <TableRow>
                <TableHead className="font-bold text-xs">Ngày làm việc</TableHead>
                <TableHead className="font-bold text-xs">Khung giờ</TableHead>
                <TableHead className="font-bold text-xs">Thời lượng</TableHead>
                <TableHead className="font-bold text-xs">Hình thức</TableHead>
                <TableHead className="font-bold text-xs">Tình trạng</TableHead>
                <TableHead className="font-bold text-xs">Hoạt động</TableHead>
                <TableHead className="font-bold text-xs text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-on-surface-variant text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
                        progress_activity
                      </span>
                      <span>Đang tải khung giờ làm việc...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedSlots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-on-surface-variant text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40">
                        event_busy
                      </span>
                      <span className="font-semibold text-on-surface">
                        {showAllMonth
                          ? 'Tháng này chưa có khung giờ làm việc nào'
                          : `Ngày ${formatDateVi(selectedDate)} chưa có khung giờ nào`}
                      </span>
                      <span className="text-xs max-w-md">
                        {showAllMonth
                          ? 'Hãy mở khung giờ để người nộp thuế có thể đặt lịch hẹn tư vấn.'
                          : 'Bạn có thể mở khung giờ ngay bây giờ để nhận hẹn từ người nộp thuế.'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleOpenCreateModal(selectedDate)}
                        className="mt-2 bg-primary hover:bg-primary/90 text-on-primary font-bold gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Mở khung giờ ngày này</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedSlots.map((slot) => {
                  const sInfo = SESSION_TYPE_MAP[slot.sessionType] || SESSION_TYPE_MAP.ONLINE_MEETING

                  // Determine status badge
                  let statusBadge = null
                  if (slot.isBooked) {
                    statusBadge = (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-xs gap-1">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        Đã đặt lịch
                      </Badge>
                    )
                  } else if (slot.isHolding) {
                    statusBadge = (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs gap-1 animate-pulse">
                        <span className="material-symbols-outlined text-[13px]">lock_clock</span>
                        Đang giữ chỗ 10p
                      </Badge>
                    )
                  } else if (slot.isActive) {
                    statusBadge = (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Sẵn sàng nhận hẹn
                      </Badge>
                    )
                  } else {
                    statusBadge = (
                      <Badge className="bg-stone-100 text-stone-600 border-stone-300 font-semibold text-xs gap-1">
                        <span className="material-symbols-outlined text-[13px]">pause</span>
                        Tạm tắt
                      </Badge>
                    )
                  }

                  return (
                    <TableRow key={slot.id} className="hover:bg-surface-container/30 transition-colors">
                      <TableCell className="font-semibold text-xs text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-amber-600">calendar_today</span>
                          <span>{formatDateVi(slot.slotDate)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono font-bold text-xs text-on-surface">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/30">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">schedule</span>
                          <span>{formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-on-surface-variant">
                        {slot.durationMinutes || 60} phút
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sInfo.badgeClass}`}>
                          <span className="material-symbols-outlined text-[14px]">{sInfo.icon}</span>
                          <span>{sInfo.label}</span>
                        </span>
                      </TableCell>

                      <TableCell>{statusBadge}</TableCell>

                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(slot)}
                          disabled={slot.isBooked}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            slot.isBooked
                              ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400'
                              : slot.isActive
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          }`}
                          title={slot.isBooked ? 'Không thể đổi trạng thái slot đã đặt' : slot.isActive ? 'Bấm để tạm tắt' : 'Bấm để kích hoạt'}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {slot.isActive ? 'toggle_on' : 'toggle_off'}
                          </span>
                          <span>{slot.isActive ? 'Đang bật' : 'Đang tắt'}</span>
                        </button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={slot.isBooked}
                            onClick={() => handleOpenEditModal(slot)}
                            className="h-8 px-2 text-xs font-semibold text-on-surface-variant hover:text-primary cursor-pointer"
                            title={slot.isBooked ? 'Không thể chỉnh sửa khung giờ đã đặt' : 'Chỉnh sửa khung giờ'}
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span className="hidden sm:inline">Sửa</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={slot.isBooked}
                            onClick={() => handleDeleteSlot(slot)}
                            className="h-8 px-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                            title={slot.isBooked ? 'Không thể xóa khung giờ đã đặt' : 'Xóa khung giờ'}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span className="hidden sm:inline">Xóa</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Thêm mới / Cập nhật khung giờ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-primary text-[22px]">
                {modalMode === 'create' ? 'add_circle' : 'edit_calendar'}
              </span>
              <span>{modalMode === 'create' ? 'Mở khung giờ làm việc mới' : 'Chỉnh sửa khung giờ làm việc'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-on-surface-variant">
              Chọn ngày, khung giờ và hình thức tư vấn để khách hàng có thể đặt lịch hẹn với bạn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSlot} className="flex flex-col gap-4 py-2">
            {/* Chọn ngày */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-on-surface">
                Ngày làm việc <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={formData.slotDate}
                min={getTodayStr()}
                onChange={(e) => setFormData({ ...formData, slotDate: e.target.value })}
                className="h-10 text-sm"
              />
              {formData.slotDate && (
                <span className="text-xs text-amber-700 font-medium">
                  {formatDateVi(formData.slotDate)}
                </span>
              )}
            </div>

            {/* Giờ bắt đầu & kết thúc */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-on-surface">
                  Giờ bắt đầu <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(val) => {
                    const [h, m] = val.split(':').map(Number)
                    const endH = String(h + 1).padStart(2, '0')
                    const endM = String(m).padStart(2, '0')
                    const endCandidate = `${endH}:${endM}`
                    setFormData({
                      ...formData,
                      startTime: val,
                      endTime: COMMON_TIME_OPTIONS.includes(endCandidate) ? endCandidate : formData.endTime,
                    })
                  }}
                >
                  <SelectTrigger className="h-10 text-sm font-mono font-semibold">
                    <SelectValue placeholder="Chọn giờ bắt đầu" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {COMMON_TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="font-mono">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-on-surface">
                  Giờ kết thúc <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(val) => setFormData({ ...formData, endTime: val })}
                >
                  <SelectTrigger className="h-10 text-sm font-mono font-semibold">
                    <SelectValue placeholder="Chọn giờ kết thúc" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {COMMON_TIME_OPTIONS.filter((t) => t > formData.startTime).map((t) => (
                      <SelectItem key={t} value={t} className="font-mono">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hình thức tư vấn */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-on-surface">
                Hình thức tư vấn <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sessionType}
                onValueChange={(val) => setFormData({ ...formData, sessionType: val })}
              >
                <SelectTrigger className="h-10 text-sm font-semibold">
                  <SelectValue placeholder="Chọn hình thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE_MEETING">Họp trực tuyến (Jitsi Meet 1-1)</SelectItem>
                  <SelectItem value="CHAT">Nhắn tin tư vấn trực tiếp</SelectItem>
                  <SelectItem value="VOICE_CALL">Gọi thoại trực tiếp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modalMode === 'edit' && (
              <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                <input
                  type="checkbox"
                  id="isActiveSlot"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-gray-300"
                />
                <Label htmlFor="isActiveSlot" className="text-xs font-medium cursor-pointer">
                  Mở kích hoạt nhận lịch hẹn ngay sau khi lưu
                </Label>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold gap-1 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>{modalMode === 'create' ? 'Tạo khung giờ' : 'Lưu thay đổi'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Notice Dialog */}
      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText="Hủy bỏ"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}
