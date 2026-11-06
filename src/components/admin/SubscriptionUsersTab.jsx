import { useState, useEffect } from 'react'
import { adminSubscriptionService } from '@/services/adminSubscriptionService'
import { SubscriptionActionDialog } from '@/components/admin/SubscriptionActionDialog'
import { useDebounce } from '@/hooks/useDebounce'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { NotificationDialog } from '@/components/ui/notification-dialog'
import {
  canExtend,
  canRefund,
  CYCLE_LABELS,
  formatDate,
  formatDateTime,
  formatLimit,
  formatVnd,
  labelOf,
  METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
} from '@/utils/subscriptionFormat'

const PAGE_SIZE = 10
const ALL = 'all'

const STATUS_DOT = {
  active: 'bg-emerald-600',
  pending: 'bg-amber-500',
  cancelled: 'bg-stone-400',
  expired: 'bg-stone-400',
}

function StatusCell({ sub }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge variant="secondary">
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[sub.status] || 'bg-stone-400'}`} />
        {labelOf(STATUS_LABELS, sub.status)}
      </Badge>
      {sub.paymentStatus === 'refunded' && <span className="text-[11px] text-red-600">Đã hoàn tiền</span>}
      {sub.paymentStatus === 'failed' && <span className="text-[11px] text-red-600">Thanh toán thất bại</span>}
    </div>
  )
}

/** Tab "Người dùng": tra cứu lượt đăng ký gói, xem chi tiết, tặng gói, gia hạn, hoàn tiền */
export function SubscriptionUsersTab({ plans = [] }) {
  const [rows, setRows] = useState([])
  const [paging, setPaging] = useState({ page: 1, totalItems: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [planId, setPlanId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [cycle, setCycle] = useState(ALL)
  const [expiring, setExpiring] = useState(ALL)
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [detail, setDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [action, setAction] = useState({ mode: null, sub: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const notify = (title, description, type = 'success') => setNotice({ open: true, type, title, description })

  // setState chỉ chạy trong callback của promise (quy tắc react-hooks/set-state-in-effect)
  useEffect(() => {
    let alive = true
    adminSubscriptionService
      .getUserSubscriptions({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        planId: planId === ALL ? undefined : planId,
        status: status === ALL ? undefined : status,
        billingCycle: cycle === ALL ? undefined : cycle,
        expiringInDays: expiring === ALL ? undefined : Number(expiring),
      })
      .then((res) => {
        if (!alive) return
        setRows(res.items)
        setPaging({ page: res.page, totalItems: res.totalItems, totalPages: res.totalPages })
        setLoadError(null)
      })
      .catch((err) => alive && setLoadError(err?.message || 'Không thể tải danh sách gói của người dùng.'))
      .finally(() => alive && setIsLoading(false))
    return () => {
      alive = false
    }
  }, [page, debouncedSearch, planId, status, cycle, expiring, reloadKey])

  // Đổi bộ lọc thì quay về trang 1; bảng cũ giữ nguyên tới khi có kết quả mới
  const changeFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const reload = () => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }

  const openDetail = async (sub) => {
    setDetail(sub)
    setIsLoadingDetail(true)
    try {
      setDetail(await adminSubscriptionService.getById(sub.id))
    } catch (err) {
      setDetail(null)
      notify('Lỗi tải chi tiết', err?.message || 'Không thể tải chi tiết gói đăng ký.', 'error')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const startAction = (mode, sub) => {
    setDetail(null)
    setAction({ mode, sub })
  }

  const handleActionSubmit = async (payload) => {
    const { mode, sub } = action
    setIsSubmitting(true)
    try {
      if (mode === 'gift') {
        const res = await adminSubscriptionService.gift(payload)
        notify(
          'Đã tặng gói',
          `${sub.userFullName} đã nhận ${res?.planName || 'gói'} trong ${payload.durationDays} ngày.`
        )
      } else if (mode === 'extend') {
        const res = await adminSubscriptionService.extend(sub.id, payload)
        notify('Đã gia hạn', `Gói của ${sub.userFullName} có hạn mới đến ${formatDate(res?.expiresAt)}.`)
      } else {
        await adminSubscriptionService.refund(sub.id, payload)
        notify(
          'Đã hoàn tiền',
          `Đã hoàn ${formatVnd(payload.refundAmount ?? sub.amountPaid)} vào ví của ${sub.userFullName}. Tài khoản đã về gói Basic.`
        )
      }
      setAction({ mode: null, sub: null })
      reload()
    } catch (err) {
      notify('Không thực hiện được', err?.message || 'Thao tác không thành công.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const rangeStart = paging.totalItems ? (paging.page - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = Math.min(paging.page * PAGE_SIZE, paging.totalItems)

  return (
    <div className="flex flex-col gap-4">
      {/* Bộ lọc */}
      <Card>
        <CardContent className="p-3 flex flex-col lg:flex-row lg:items-center gap-2.5">
          <Input
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => changeFilter(setSearch)(e.target.value)}
            className="lg:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Select value={planId} onValueChange={changeFilter(setPlanId)}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Gói" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả gói</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={changeFilter(setStatus)}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cycle} onValueChange={changeFilter(setCycle)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Chu kỳ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi chu kỳ</SelectItem>
                {Object.entries(CYCLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiring} onValueChange={changeFilter(setExpiring)}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Sắp hết hạn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Không lọc hạn</SelectItem>
                <SelectItem value="3">Hết hạn trong 3 ngày</SelectItem>
                <SelectItem value="7">Hết hạn trong 7 ngày</SelectItem>
                <SelectItem value="30">Hết hạn trong 30 ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <p className="text-[11px] text-on-surface-variant">
        Mỗi dòng là một lượt đăng ký gói, gồm cả lượt đã kết thúc. Lọc trạng thái "Đang dùng" để xem gói hiện tại của
        từng người. Tặng gói thực hiện từ dòng của người dùng đó.
      </p>

      {/* Bảng */}
      <Card>
        {isLoading ? (
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Đang tải danh sách...</span>
          </CardContent>
        ) : loadError ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-semibold text-red-600">{loadError}</p>
            <Button type="button" size="sm" variant="outline" onClick={reload}>
              Tải lại
            </Button>
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-1.5">
            <p className="text-sm font-semibold text-on-surface">Không có lượt đăng ký phù hợp</p>
            <p className="text-xs text-on-surface-variant">Đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm.</p>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead className="w-40">Gói</TableHead>
                  <TableHead className="text-center w-32">Trạng thái</TableHead>
                  <TableHead className="text-right w-36">Đã trả</TableHead>
                  <TableHead className="w-44">Thời hạn</TableHead>
                  <TableHead className="text-right w-64">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-on-surface truncate">{sub.userFullName || '—'}</span>
                        <span className="text-[11px] text-on-surface-variant truncate">
                          {sub.userEmail}
                          {sub.userPhoneNumber ? `, ${sub.userPhoneNumber}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{sub.planName}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {labelOf(CYCLE_LABELS, sub.billingCycle)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusCell sub={sub} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold tabular-nums">
                          {Number(sub.amountPaid) > 0 ? formatVnd(sub.amountPaid) : '0đ'}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {labelOf(METHOD_LABELS, sub.paymentMethod)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-on-surface-variant">
                      <div>Từ {formatDate(sub.startsAt)}</div>
                      <div>{sub.expiresAt ? `Đến ${formatDate(sub.expiresAt)}` : 'Không thời hạn'}</div>
                      {sub.status === 'active' && sub.remainingDays != null && (
                        <div className={sub.remainingDays <= 7 ? 'font-semibold text-amber-700' : ''}>
                          Còn {sub.remainingDays} ngày
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(sub)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Chi tiết
                        </Button>
                        {sub.status === 'active' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startAction('gift', sub)}
                            className="h-7 px-2 text-[11px]"
                          >
                            Tặng gói
                          </Button>
                        )}
                        {canExtend(sub) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startAction('extend', sub)}
                            className="h-7 px-2 text-[11px]"
                          >
                            Gia hạn
                          </Button>
                        )}
                        {canRefund(sub) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startAction('refund', sub)}
                            className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50/60"
                          >
                            Hoàn tiền
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Phân trang */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-outline-variant/30 text-xs">
              <span className="text-on-surface-variant">
                {rangeStart}–{rangeEnd} trên {paging.totalItems} lượt đăng ký
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  disabled={paging.page <= 1}
                  onClick={() => setPage(paging.page - 1)}
                >
                  Trang trước
                </Button>
                <span className="tabular-nums text-on-surface-variant">
                  {paging.page}/{Math.max(1, paging.totalPages)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  disabled={paging.page >= paging.totalPages}
                  onClick={() => setPage(paging.page + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Chi tiết lượt đăng ký (GET /{id}) */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đăng ký gói</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex flex-col gap-0.5">
                <p className="text-sm font-bold text-on-surface">{detail.userFullName}</p>
                <p className="text-on-surface-variant">
                  {detail.userEmail}
                  {detail.userPhoneNumber ? `, ${detail.userPhoneNumber}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Gói', `${detail.planName} (${labelOf(CYCLE_LABELS, detail.billingCycle)})`],
                  ['Trạng thái', labelOf(STATUS_LABELS, detail.status)],
                  ['Thanh toán', `${formatVnd(detail.amountPaid)}, ${labelOf(METHOD_LABELS, detail.paymentMethod)}`],
                  ['Tình trạng tiền', labelOf(PAYMENT_STATUS_LABELS, detail.paymentStatus)],
                  ['Bắt đầu', formatDate(detail.startsAt)],
                  ['Hết hạn', detail.expiresAt ? formatDate(detail.expiresAt) : 'Không thời hạn'],
                  ['Mã giao dịch', detail.paymentReference || '—'],
                  ['Tạo lúc', formatDateTime(detail.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="p-2.5 rounded-lg border border-outline-variant/40 min-w-0">
                    <span className="text-[11px] text-on-surface-variant">{label}</span>
                    <p className="font-semibold text-on-surface mt-0.5 break-words">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-bold text-on-surface mb-1.5">
                  Quyền lợi lúc kích hoạt và lượt đã dùng tháng này
                </p>
                <div className="rounded-lg border border-outline-variant/40 divide-y divide-outline-variant/30">
                  {[
                    [
                      'Câu hỏi trợ lý AI',
                      `${detail.currentMonthAiQuestionsUsed ?? 0} / ${formatLimit(detail.snapshotMaxAiQuestionsPerMonth)}`,
                    ],
                    [
                      'Lượt quét OCR',
                      `${detail.currentMonthOcrScansUsed ?? 0} / ${formatLimit(detail.snapshotMaxOcrScansPerMonth)}`,
                    ],
                    [
                      'Lưu lịch sử chat AI',
                      detail.snapshotChatHistoryRetentionDays === -1
                        ? 'Vĩnh viễn'
                        : `${detail.snapshotChatHistoryRetentionDays} ngày`,
                    ],
                    ['Nguồn thu nhập tối đa', formatLimit(detail.snapshotMaxIncomeSources)],
                    ['Người phụ thuộc tối đa', formatLimit(detail.snapshotMaxDependents)],
                    [
                      'Xuất PDF / ZIP',
                      `${detail.snapshotCanExportPdf ? 'Có' : 'Chỉ xem'} / ${detail.snapshotCanExportZip ? 'Có' : 'Không'}`,
                    ],
                    [
                      'Đặt lịch chuyên gia',
                      [
                        detail.snapshotBookingDiscountPercent > 0 && `Giảm ${detail.snapshotBookingDiscountPercent}%`,
                        detail.snapshotFreeConsultationsPerYear > 0 &&
                          `${detail.snapshotFreeConsultationsPerYear} ca/năm miễn phí`,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Giá gốc',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-2.5 py-2">
                      <span className="text-on-surface-variant">{label}</span>
                      <span className="font-semibold text-on-surface text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {isLoadingDetail && <p className="text-[11px] text-on-surface-variant">Đang tải bản mới nhất...</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Đóng
            </Button>
            {detail && !isLoadingDetail && canExtend(detail) && (
              <Button type="button" variant="outline" onClick={() => startAction('extend', detail)}>
                Gia hạn
              </Button>
            )}
            {detail && !isLoadingDetail && canRefund(detail) && (
              <Button type="button" variant="destructive" onClick={() => startAction('refund', detail)}>
                Hoàn tiền
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubscriptionActionDialog
        mode={action.mode}
        subscription={action.sub}
        plans={plans}
        isSubmitting={isSubmitting}
        onClose={() => setAction({ mode: null, sub: null })}
        onSubmit={handleActionSubmit}
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
