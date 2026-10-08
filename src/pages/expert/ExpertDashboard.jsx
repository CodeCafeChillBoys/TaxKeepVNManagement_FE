import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ExpertLayout } from '@/layouts/ExpertLayout'
import { ExpertOverviewTab } from './tabs/ExpertOverviewTab'
import { ExpertPendingBookingsTab } from './tabs/ExpertPendingBookingsTab'
import { ExpertBookingsTab } from './tabs/ExpertBookingsTab'
import { ExpertProfileTab } from './tabs/ExpertProfileTab'
import { expertPortalService } from '@/services/expertPortalService'

const SECTION_TITLES = {
  'tong-quan': 'Tổng quan & Thống kê',
  'cho-tiep-nhan': 'Ca tư vấn chờ tiếp nhận (SLA 2 giờ)',
  'lich-hen': 'Quản lý lịch hẹn tư vấn',
  'ho-so': 'Hồ sơ chuyên gia & Chứng chỉ',
}

export function ExpertDashboard() {
  const { section, id: paramId } = useParams()
  const navigate = useNavigate()

  const currentRoute = section || 'tong-quan'
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedBookingId, setSelectedBookingId] = useState(paramId || null)

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await expertPortalService.getPendingBookings({ page: 1, size: 1 })
      const count = data?.pagination?.totalItems ?? data?.items?.length ?? 0
      setPendingCount(count)
    } catch {
      // ignore in background
    }
  }, [])

  useEffect(() => {
    fetchPendingCount()
    const timer = setInterval(fetchPendingCount, 45000)
    return () => clearInterval(timer)
  }, [fetchPendingCount])

  useEffect(() => {
    if (paramId) {
      setSelectedBookingId(paramId)
    }
  }, [paramId])

  const handleNavigate = (routeId) => {
    setSelectedBookingId(null)
    navigate(`/expert/${routeId}`)
  }

  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId)
  }

  return (
    <ExpertLayout
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
      breadcrumbTitle={SECTION_TITLES[currentRoute] || 'Cổng chuyên gia'}
      pendingCount={pendingCount}
    >
      {currentRoute === 'tong-quan' && (
        <ExpertOverviewTab
          onNavigate={handleNavigate}
          onSelectBooking={handleSelectBooking}
        />
      )}

      {currentRoute === 'cho-tiep-nhan' && (
        <ExpertPendingBookingsTab
          initialBookingId={selectedBookingId}
          onRefreshStats={(count) => setPendingCount(count)}
        />
      )}

      {currentRoute === 'lich-hen' && (
        <ExpertBookingsTab initialBookingId={selectedBookingId} />
      )}

      {currentRoute === 'ho-so' && <ExpertProfileTab />}
    </ExpertLayout>
  )
}
