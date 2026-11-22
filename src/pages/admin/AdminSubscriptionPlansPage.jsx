import { useState, useEffect } from 'react'
import { subscriptionPlanService } from '@/services/subscriptionPlanService'
import { SubscriptionPlanModal } from '@/components/admin/SubscriptionPlanModal'
import { SubscriptionUsersTab } from '@/components/admin/SubscriptionUsersTab'
import { SubscriptionRevenueTab } from '@/components/admin/SubscriptionRevenueTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog, NotificationDialog } from '@/components/ui/notification-dialog'

const UNLIMITED = -1

const formatVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`
const formatPrice = (n) => (Number(n) > 0 ? formatVnd(n) : 'Miễn phí')
const formatLimit = (v, unit = '') => (v === UNLIMITED ? 'Không giới hạn' : `${v}${unit ? ` ${unit}` : ''}`)

const freeMonthsOf = (plan) =>
  plan.priceMonthly > 0 && plan.priceYearly > 0 ? Math.round(12 - plan.priceYearly / plan.priceMonthly) : 0

const bookingBenefit = (plan) => {
  const parts = []
  if (plan.bookingDiscountPercent > 0) parts.push(`Giảm ${plan.bookingDiscountPercent}%`)
  if (plan.freeConsultationsPerYear > 0) parts.push(`${plan.freeConsultationsPerYear} ca/năm miễn phí`)
  return parts.length ? parts.join(', ') : 'Giá gốc'
}

const isBasicPlan = (plan) => plan?.slug === 'basic'

function StatusBadge({ active }) {
  return (
    <Badge variant="secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-600' : 'bg-stone-400'}`} />
      {active ? 'Đang mở bán' : 'Ngừng bán'}
    </Badge>
  )
}

export function AdminSubscriptionPlansPage() {
  const [tab, setTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingPlan, setEditingPlan] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [viewingPlan, setViewingPlan] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [deactivatingPlan, setDeactivatingPlan] = useState(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [reactivatingId, setReactivatingId] = useState(null)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const notify = (title, description, type = 'success') => setNotice({ open: true, type, title, description })

  // setState chỉ chạy trong callback của promise để effect lần đầu không render dây chuyền
  const loadPlans = () =>
    subscriptionPlanService
      .getAll()
      .then((data) => setPlans([...data].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))))
      .catch((err) => setLoadError(err?.message || 'Không thể tải danh sách gói dịch vụ.'))
      .finally(() => setIsLoading(false))

  const fetchPlans = () => {
    setIsLoading(true)
    setLoadError(null)
    return loadPlans()
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const activeCount = plans.filter((p) => p.isActive).length
  const paidActiveCount = plans.filter((p) => p.isActive && p.priceMonthly > 0).length

  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingPlan(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (plan) => {
    setModalMode('edit')
    setEditingPlan(plan)
    setIsModalOpen(true)
  }

  // Xem chi tiết lấy bản mới nhất từ BE, không dùng dữ liệu cũ trong bảng
  const handleView = async (plan) => {
    setViewingPlan(plan)
    setIsLoadingDetail(true)
    try {
      setViewingPlan(await subscriptionPlanService.getById(plan.id))
    } catch (err) {
      setViewingPlan(null)
      notify('Lỗi tải chi tiết', err?.message || 'Không thể tải chi tiết gói.', 'error')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleSave = async (payload) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        await subscriptionPlanService.create(payload)
        notify('Đã tạo gói', `Gói "${payload.name}" đã được tạo.`)
      } else if (editingPlan) {
        await subscriptionPlanService.update(editingPlan.id, payload)
        notify('Đã lưu thay đổi', `Cấu hình gói "${payload.name}" đã được cập nhật cho các lượt mua sau.`)
      }
      setIsModalOpen(false)
      fetchPlans()
    } catch (err) {
      notify('Không lưu được gói', err?.message || 'Không thể lưu gói dịch vụ.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!deactivatingPlan) return
    setIsDeactivating(true)
    try {
      await subscriptionPlanService.deactivate(deactivatingPlan.id)
      notify('Đã ngừng bán', `Gói "${deactivatingPlan.name}" không còn hiển thị trên app.`)
      setDeactivatingPlan(null)
      fetchPlans()
    } catch (err) {
      notify('Không ngừng bán được', err?.message || 'Không thể ngừng cung cấp gói.', 'error')
    } finally {
      setIsDeactivating(false)
    }
  }

  // BE không có API mở bán lại riêng: dùng PUT isActive = true
  const handleReactivate = async (plan) => {
    setReactivatingId(plan.id)
    try {
      await subscriptionPlanService.update(plan.id, { isActive: true })
      notify('Đã mở bán lại', `Gói "${plan.name}" đã hiển thị lại trên app.`)
      fetchPlans()
    } catch (err) {
      notify('Không mở bán được', err?.message || 'Không thể mở bán lại gói.', 'error')
    } finally {
      setReactivatingId(null)
    }
  }

  return (
    <div className="p-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Gói dịch vụ</h2>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            Cấu hình giá và quyền lợi các gói người nộp thuế mua trên app, theo dõi người dùng từng gói và doanh thu.
          </p>
        </div>
        {tab === 'plans' && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchPlans}>
              Làm mới
            </Button>
            <Button type="button" size="sm" onClick={handleOpenCreate}>
              Tạo gói
            </Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-surface-container-low border border-outline-variant/40 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="plans">Gói và giá</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <SubscriptionUsersTab plans={plans} />
        </TabsContent>

        <TabsContent value="revenue">
          <SubscriptionRevenueTab />
        </TabsContent>

        <TabsContent value="plans" className="flex flex-col gap-space-lg">
          <p className="text-[11px] text-on-surface-variant">
            Thay đổi giá và quyền lợi chỉ áp dụng cho lượt mua sau. Người đang dùng giữ quyền lợi cũ đến khi hết hạn.
          </p>

          {/* Thống kê gọn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] font-medium text-on-surface-variant">Tổng số gói</p>
                <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{plans.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] font-medium text-on-surface-variant">Đang mở bán</p>
                <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] font-medium text-on-surface-variant">Gói trả phí đang bán</p>
                <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{paidActiveCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Bảng gói */}
          <Card>
            {isLoading ? (
              <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Đang tải danh sách gói...</span>
              </CardContent>
            ) : loadError ? (
              <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-sm font-semibold text-red-600">{loadError}</p>
                <Button type="button" size="sm" variant="outline" onClick={fetchPlans}>
                  Tải lại
                </Button>
              </CardContent>
            ) : plans.length === 0 ? (
              <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-sm font-semibold text-on-surface">Chưa có gói dịch vụ nào</p>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Tạo gói đầu tiên để người nộp thuế chọn mua trên app.
                </p>
                <Button type="button" size="sm" onClick={handleOpenCreate} className="mt-1">
                  Tạo gói
                </Button>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Thứ tự</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead className="text-right w-32">Giá tháng</TableHead>
                    <TableHead className="text-right w-40">Giá năm</TableHead>
                    <TableHead className="w-56">Hạn mức chính</TableHead>
                    <TableHead className="text-center w-32">Trạng thái</TableHead>
                    <TableHead className="text-right w-52">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => {
                    const freeMonths = freeMonthsOf(plan)
                    return (
                      <TableRow key={plan.id} className={plan.isActive ? '' : 'opacity-60'}>
                        <TableCell className="text-center font-mono text-on-surface-variant tabular-nums">
                          {plan.displayOrder ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-on-surface">{plan.name}</span>
                            <span className="font-mono text-[11px] text-on-surface-variant">{plan.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatPrice(plan.priceMonthly)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold">{formatPrice(plan.priceYearly)}</span>
                            {freeMonths > 0 && (
                              <span className="text-[11px] text-emerald-700">Tặng {freeMonths} tháng</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-on-surface-variant leading-relaxed">
                          <div>AI: {formatLimit(plan.maxAiQuestionsPerMonth, 'câu/tháng')}</div>
                          <div>OCR: {formatLimit(plan.maxOcrScansPerMonth, 'lượt/tháng')}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge active={plan.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(plan)}
                              className="h-7 px-2 text-[11px]"
                            >
                              Chi tiết
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(plan)}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              Sửa
                            </Button>
                            {isBasicPlan(plan) ? null : plan.isActive ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeactivatingPlan(plan)}
                                className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50/60"
                              >
                                Ngừng bán
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={reactivatingId === plan.id}
                                onClick={() => handleReactivate(plan)}
                                className="h-7 px-2 text-[11px]"
                              >
                                {reactivatingId === plan.id ? 'Đang mở...' : 'Mở bán lại'}
                              </Button>
                            )}
                          </div>
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

      <SubscriptionPlanModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingPlan}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
      />

      {/* Chi tiết gói (GET /{id}) */}
      <Dialog open={Boolean(viewingPlan)} onOpenChange={(open) => !open && setViewingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết gói</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-on-surface-variant">{viewingPlan.slug}</span>
                  <StatusBadge active={viewingPlan.isActive} />
                </div>
                <p className="text-sm font-bold text-on-surface mt-1">{viewingPlan.name}</p>
                {viewingPlan.description && (
                  <p className="text-on-surface-variant leading-relaxed">{viewingPlan.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg border border-outline-variant/40">
                  <span className="text-[11px] text-on-surface-variant">Giá tháng</span>
                  <p className="font-semibold text-on-surface mt-0.5">{formatPrice(viewingPlan.priceMonthly)}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-outline-variant/40">
                  <span className="text-[11px] text-on-surface-variant">Giá năm</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {formatPrice(viewingPlan.priceYearly)}
                    {freeMonthsOf(viewingPlan) > 0 && (
                      <span className="font-normal text-emerald-700"> (tặng {freeMonthsOf(viewingPlan)} tháng)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-outline-variant/40 divide-y divide-outline-variant/30">
                {[
                  ['Câu hỏi trợ lý AI', formatLimit(viewingPlan.maxAiQuestionsPerMonth, 'câu/tháng')],
                  [
                    'Lưu lịch sử chat AI',
                    viewingPlan.chatHistoryRetentionDays === UNLIMITED
                      ? 'Vĩnh viễn'
                      : `${viewingPlan.chatHistoryRetentionDays} ngày`,
                  ],
                  ['Lượt quét OCR', formatLimit(viewingPlan.maxOcrScansPerMonth, 'lượt/tháng')],
                  ['Xuất PDF Mẫu 02/QTT-TNCN', viewingPlan.canExportPdf ? 'Có' : 'Chỉ xem'],
                  ['Xuất ZIP chứng từ', viewingPlan.canExportZip ? 'Có' : 'Không'],
                  ['Đặt lịch chuyên gia', bookingBenefit(viewingPlan)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 px-2.5 py-2">
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="font-semibold text-on-surface text-right">{value}</span>
                  </div>
                ))}
              </div>
              {isLoadingDetail && <p className="text-[11px] text-on-surface-variant">Đang tải bản mới nhất...</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewingPlan(null)}>
              Đóng
            </Button>
            {viewingPlan && (
              <Button
                type="button"
                disabled={isLoadingDetail}
                onClick={() => {
                  const plan = viewingPlan
                  setViewingPlan(null)
                  handleOpenEdit(plan)
                }}
              >
                Chỉnh sửa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận ngừng bán (DELETE = soft-delete) */}
      <ConfirmDialog
        open={Boolean(deactivatingPlan)}
        onOpenChange={(open) => !open && setDeactivatingPlan(null)}
        type="destructive"
        title={`Ngừng bán ${deactivatingPlan?.name || 'gói'}?`}
        description="Gói sẽ ẩn khỏi app, người dùng không mua mới được. Người đang dùng vẫn giữ gói đến khi hết hạn. Bạn có thể mở bán lại sau."
        confirmText="Ngừng bán"
        cancelText="Giữ lại"
        loading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
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
