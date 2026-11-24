import { useState, useEffect } from 'react'
import { adminSubscriptionService } from '@/services/adminSubscriptionService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CYCLE_LABELS, formatVnd, labelOf } from '@/utils/subscriptionFormat'
import { SectionLoading } from '@/components/ui/loading'
import { TablePagination, useClientPagination } from '@/components/ui/table-pagination'
import { useDebounce } from '@/hooks/useDebounce'

// Ngày trong ô date (yyyy-mm-dd, giờ máy) -> đầu ngày / cuối ngày ISO cho BE
const startOfDayIso = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined)
const endOfDayIso = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined)

const formatYearMonth = (ym) => {
  const [y, m] = (ym || '').split('-')
  return y && m ? `Tháng ${Number(m)}/${y}` : ym || '—'
}

function Stat({ label, value, hint }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-on-surface-variant">{label}</p>
        <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{value}</p>
        {hint && <p className="text-[11px] text-on-surface-variant mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function Section({ title, children }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        <p className="text-xs font-bold text-on-surface">{title}</p>
        {children}
      </CardContent>
    </Card>
  )
}

const Empty = () => (
  <p className="text-xs text-on-surface-variant py-4 text-center">Chưa có dữ liệu trong khoảng này.</p>
)

/** Tab "Doanh thu": GET /analytics/revenue, lọc theo ngày tạo đơn */
export function SubscriptionRevenueTab() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [range, setRange] = useState({ fromDate: '', toDate: '' })
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const debouncedRange = useDebounce(range, 150)

  useEffect(() => {
    let alive = true
    adminSubscriptionService
      .getRevenueAnalytics({
        fromDate: startOfDayIso(debouncedRange.fromDate),
        toDate: endOfDayIso(debouncedRange.toDate),
      })
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoadError(null)
      })
      .catch((err) => alive && setLoadError(err?.message || 'Không thể tải thống kê doanh thu gói.'))
      .finally(() => alive && setIsLoading(false))
    return () => {
      alive = false
    }
  }, [debouncedRange, reloadKey])

  const rangeInvalid = fromDate && toDate && fromDate > toDate

  const apply = () => {
    if (rangeInvalid) return
    setIsLoading(true)
    setRange({ fromDate, toDate })
    setReloadKey((k) => k + 1)
  }

  const clear = () => {
    setFromDate('')
    setToDate('')
    setIsLoading(true)
    setRange({ fromDate: '', toDate: '' })
    setReloadKey((k) => k + 1)
  }

  const byPlan = [...(data?.revenueByPlan || [])].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const byCycle = data?.revenueByCycle || []
  const distribution = [...(data?.userDistribution || [])].sort((a, b) => b.activeUserCount - a.activeUserCount)
  const trends = [...(data?.monthlyTrends || [])].sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : -1))

  const byPlanPagination = useClientPagination(byPlan, 10)
  const byCyclePagination = useClientPagination(byCycle, 10)
  const distributionPagination = useClientPagination(distribution, 10)
  const trendsPagination = useClientPagination(trends, 10)

  return (
    <div className="flex flex-col gap-4">
      {/* Khoảng thời gian */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Từ ngày</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Đến ngày</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-44" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={apply} disabled={Boolean(rangeInvalid)}>
              Xem thống kê
            </Button>
            {(range.fromDate || range.toDate) && (
              <Button type="button" size="sm" variant="outline" onClick={clear}>
                Xem toàn bộ
              </Button>
            )}
          </div>
          <p className={`text-[11px] md:ml-auto ${rangeInvalid ? 'text-red-600' : 'text-on-surface-variant'}`}>
            {rangeInvalid
              ? 'Ngày bắt đầu phải trước ngày kết thúc.'
              : range.fromDate || range.toDate
                ? 'Tính theo ngày tạo đơn mua gói trong khoảng đã chọn.'
                : 'Đang xem toàn bộ thời gian.'}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <SectionLoading title="Đang tải thống kê doanh thu..." minHeight="min-h-[200px]" />
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-semibold text-red-600">{loadError}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsLoading(true)
                setReloadKey((k) => k + 1)
              }}
            >
              Tải lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat
              label="Tổng doanh thu gói"
              value={formatVnd(data?.totalRevenue)}
              hint="Đơn đã thanh toán, trừ đơn đã hoàn tiền"
            />
            <Stat label="Gói đang hoạt động" value={data?.totalActiveSubscriptions ?? 0} hint="Gồm cả gói Basic" />
            <Stat label="Giao dịch thu tiền" value={data?.totalPaidTransactions ?? 0} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="Doanh thu theo gói">
              {byPlan.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gói</TableHead>
                        <TableHead className="text-right">Lượt mua</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byPlanPagination.paginatedItems.map((r) => (
                        <TableRow key={r.planId}>
                          <TableCell className="font-semibold">{r.planName}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.purchaseCount}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {formatVnd(r.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={byPlanPagination.page}
                    totalPages={byPlanPagination.totalPages}
                    totalItems={byPlanPagination.totalItems}
                    pageSize={byPlanPagination.pageSize}
                    onPageChange={byPlanPagination.setPage}
                    itemLabel="gói"
                    className="px-0 pb-0 bg-transparent"
                  />
                </>
              )}
            </Section>

            <Section title="Doanh thu theo chu kỳ">
              {byCycle.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chu kỳ</TableHead>
                        <TableHead className="text-right">Lượt mua</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byCyclePagination.paginatedItems.map((r) => (
                        <TableRow key={r.billingCycle}>
                          <TableCell className="font-semibold">{labelOf(CYCLE_LABELS, r.billingCycle)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.purchaseCount}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {formatVnd(r.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={byCyclePagination.page}
                    totalPages={byCyclePagination.totalPages}
                    totalItems={byCyclePagination.totalItems}
                    pageSize={byCyclePagination.pageSize}
                    onPageChange={byCyclePagination.setPage}
                    itemLabel="chu kỳ"
                    className="px-0 pb-0 bg-transparent"
                  />
                </>
              )}
            </Section>

            <Section title="Người dùng đang hoạt động theo gói">
              {distribution.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gói</TableHead>
                        <TableHead className="text-right">Người dùng</TableHead>
                        <TableHead className="text-right">Tỉ lệ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributionPagination.paginatedItems.map((r) => (
                        <TableRow key={r.planId}>
                          <TableCell className="font-semibold">{r.planName}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.activeUserCount}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(r.percentage || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={distributionPagination.page}
                    totalPages={distributionPagination.totalPages}
                    totalItems={distributionPagination.totalItems}
                    pageSize={distributionPagination.pageSize}
                    onPageChange={distributionPagination.setPage}
                    itemLabel="gói"
                    className="px-0 pb-0 bg-transparent"
                  />
                </>
              )}
            </Section>

            <Section title="Doanh thu theo tháng">
              {trends.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tháng</TableHead>
                        <TableHead className="text-right">Lượt mua</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trendsPagination.paginatedItems.map((r) => (
                        <TableRow key={r.yearMonth}>
                          <TableCell className="font-semibold">{formatYearMonth(r.yearMonth)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.purchaseCount}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatVnd(r.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={trendsPagination.page}
                    totalPages={trendsPagination.totalPages}
                    totalItems={trendsPagination.totalItems}
                    pageSize={trendsPagination.pageSize}
                    onPageChange={trendsPagination.setPage}
                    itemLabel="tháng"
                    className="px-0 pb-0 bg-transparent"
                  />
                </>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
