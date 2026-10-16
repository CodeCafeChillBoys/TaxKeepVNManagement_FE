import { useState, useEffect, useCallback } from 'react'
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

export function ExpertSlotsTab() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [filterSessionType, setFilterSessionType] = useState('ALL')
  const [filterIsBooked, setFilterIsBooked] = useState('ALL')
  const [filterIsActive, setFilterIsActive] = useState('ALL')
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterToDate, setFilterToDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })

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

  const fetchSlots = useCallback(async () => {
    try {
      const params = {}
      if (filterFromDate) params.fromDate = filterFromDate
      if (filterToDate) params.toDate = filterToDate
      if (filterSessionType !== 'ALL') params.sessionType = filterSessionType
      if (filterIsBooked === 'BOOKED') params.isBooked = true
      if (filterIsBooked === 'AVAILABLE') params.isBooked = false
      if (filterIsActive === 'ACTIVE') params.isActive = true
      if (filterIsActive === 'INACTIVE') params.isActive = false

      const data = await expertPortalService.getMySlots(params)
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
  }, [filterFromDate, filterToDate, filterSessionType, filterIsBooked, filterIsActive])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchSlots().finally(() => {
      if (isMounted) setLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [fetchSlots])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSlots()
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

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = tomorrow.toISOString().split('T')[0]

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
      fetchSlots()
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
          fetchSlots()
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
          fetchSlots()
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

  // Statistics
  const totalSlotsCount = slots.length
  const availableSlotsCount = slots.filter((s) => s.isActive && !s.isBooked && !s.isHolding).length
  const bookedSlotsCount = slots.filter((s) => s.isBooked).length
  const holdingSlotsCount = slots.filter((s) => s.isHolding && !s.isBooked).length
  const inactiveSlotsCount = slots.filter((s) => !s.isActive && !s.isBooked).length

  return (
    <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#182747] via-[#213555] to-[#2c4066] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <span className="material-symbols-outlined text-[200px]">more_time</span>
        </div>

        <div className="flex flex-col gap-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold w-fit">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>QUẢN LÝ LỊCH RẢNH TƯ VẤN</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Khung giờ làm việc của chuyên gia
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            Thiết lập các khung thời gian rảnh để người nộp thuế có thể đặt lịch hẹn tư vấn. Hệ thống tự động khóa tạm thời 10 phút khi có người tiến hành thanh toán ký quỹ.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <Button
            onClick={handleOpenCreateModal}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số khung giờ */}
        <Card className="border border-outline-variant/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Tổng khung giờ
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">calendar_view_week</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-on-surface">{totalSlotsCount}</div>
            <p className="text-xs text-on-surface-variant mt-1">Trong khoảng ngày đã chọn</p>
          </CardContent>
        </Card>

        {/* Card 2: Sẵn sàng nhận hẹn */}
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
            <div className="text-3xl font-black text-emerald-700">{availableSlotsCount}</div>
            <p className="text-xs text-emerald-800/80 mt-1">Khách hàng có thể đặt ngay</p>
          </CardContent>
        </Card>

        {/* Card 3: Đã có khách đặt */}
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
            <div className="text-3xl font-black text-blue-700">{bookedSlotsCount}</div>
            <p className="text-xs text-blue-800/80 mt-1">
              {holdingSlotsCount > 0 ? `+ ${holdingSlotsCount} ca đang giữ chỗ tạm thời` : 'Ca tư vấn đã chốt lịch'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Đang tạm tắt */}
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
            <div className="text-3xl font-black text-stone-600">{inactiveSlotsCount}</div>
            <p className="text-xs text-on-surface-variant mt-1">Khách hàng không thể thấy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border border-outline-variant/30 shadow-sm">
        <CardContent className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            {/* Từ ngày */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold text-on-surface-variant">Từ ngày</Label>
              <Input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Đến ngày */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold text-on-surface-variant">Đến ngày</Label>
              <Input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Hình thức tư vấn */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold text-on-surface-variant">Hình thức tư vấn</Label>
              <Select value={filterSessionType} onValueChange={setFilterSessionType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tất cả hình thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả hình thức</SelectItem>
                  <SelectItem value="ONLINE_MEETING">Họp trực tuyến</SelectItem>
                  <SelectItem value="CHAT">Nhắn tin</SelectItem>
                  <SelectItem value="VOICE_CALL">Gọi thoại</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trạng thái đặt */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold text-on-surface-variant">Tình trạng lịch</Label>
              <Select value={filterIsBooked} onValueChange={setFilterIsBooked}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tất cả tình trạng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả tình trạng</SelectItem>
                  <SelectItem value="AVAILABLE">Còn trống (Chưa đặt)</SelectItem>
                  <SelectItem value="BOOKED">Đã có người đặt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <Select value={filterIsActive} onValueChange={setFilterIsActive}>
              <SelectTrigger className="h-9 text-xs w-[150px]">
                <SelectValue placeholder="Kích hoạt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang kích hoạt</SelectItem>
                <SelectItem value="INACTIVE">Đang tạm tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Slots Table */}
      <Card className="border border-outline-variant/30 shadow-sm overflow-hidden">
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
                      <span>Đang tải danh sách khung giờ làm việc...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-on-surface-variant text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40">
                        event_busy
                      </span>
                      <span className="font-semibold text-on-surface">Không tìm thấy khung giờ nào</span>
                      <span className="text-xs max-w-md">
                        Bạn chưa mở khung giờ nào trong khoảng thời gian này hoặc không có khung giờ thỏa mãn bộ lọc.
                      </span>
                      <Button
                        size="sm"
                        onClick={handleOpenCreateModal}
                        className="mt-2 bg-primary hover:bg-primary/90 text-on-primary font-bold gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Mở khung giờ ngay</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => {
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
                min={new Date().toISOString().split('T')[0]}
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
                    // Tự động gợi ý giờ kết thúc sau 60 phút
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
