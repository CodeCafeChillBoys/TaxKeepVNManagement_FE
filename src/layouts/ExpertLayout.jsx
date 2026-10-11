import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ExpertLayout({
  children,
  currentRoute: propCurrentRoute,
  onNavigate,
  breadcrumbTitle = 'Tổng quan',
  pendingCount = 0,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  // Xác định route hiện tại từ URL pathname hoặc fallback prop
  const pathSegment = location.pathname.replace(/^\/expert\/?/, '')
  const currentRoute = propCurrentRoute || pathSegment || 'tong-quan'

  // Quản lý trạng thái mở submenu avatar góc dưới bên trái
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  // Đồng hồ thời gian thực tự động cập nhật liên tục
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedLiveTime = currentDateTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const formattedLiveDate = currentDateTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const handleNavigate = (routeId) => {
    if (onNavigate) {
      onNavigate(routeId)
    } else {
      navigate(`/expert/${routeId}`)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { id: 'tong-quan', label: 'Tổng quan & Thống kê', icon: 'dashboard' },
    {
      id: 'cho-tiep-nhan',
      label: 'Ca chờ duyệt (SLA 2h)',
      icon: 'hourglass_top',
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
    },
    { id: 'lich-hen', label: 'Lịch hẹn tư vấn', icon: 'calendar_month' },
    { id: 'ho-so', label: 'Hồ sơ chuyên gia', icon: 'badge' },
  ]

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-[#182747] via-[#15223e] to-[#0f192e] text-on-primary z-50 flex flex-col shadow-[0_4px_24px_rgba(15,25,46,0.35)] border-r border-white/5">
        {/* Brand Header */}
        <div className="px-6 pt-6 pb-5 flex flex-col gap-1 bg-white/[0.03] border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <span className="material-symbols-outlined text-[24px]">support_agent</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base tracking-tight text-white font-extrabold leading-none">
                TAX KEEP VN
              </span>
              <span className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold mt-1">
                CỔNG CHUYÊN GIA TƯ VẤN
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Hệ thống trực tuyến • Sẵn sàng nhận ca</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 translate-x-1'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-stone-950' : 'text-amber-300/80'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${item.badgeColor || 'bg-red-500 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User profile footer with Submenu Popover */}
        <div ref={userMenuRef} className="relative p-3 m-3 mt-auto shrink-0 border-t border-white/10">
          {/* Flyout Submenu Popover */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1b2b4d] text-white rounded-2xl shadow-2xl border border-white/15 p-2 z-50 animate-in fade-in-0 zoom-in-95 flex flex-col gap-1">
              <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {user?.fullName || 'Chuyên gia tư vấn'}
                  </span>
                  <span className="text-[11px] text-white/60 truncate">
                    {user?.email || 'expert@taxkeep.vn'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mt-0.5">
                    CHUYÊN GIA TƯ VẤN THUẾ
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  handleNavigate('ho-so')
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-300">badge</span>
                <span>Hồ sơ chuyên môn</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Đăng xuất hệ thống</span>
              </button>
            </div>
          )}

          {/* Trigger Button */}
          <div
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className={`rounded-xl border p-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
              isUserMenuOpen
                ? 'bg-white/15 border-amber-400/40 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 border-white/10'
            }`}
            title="Nhấn để mở menu cá nhân"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[14px] shrink-0 border border-amber-400/30">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-white truncate leading-tight">
                  {user?.fullName || 'Chuyên gia tư vấn'}
                </span>
                <span className="text-[11px] text-amber-300 truncate">
                  Chuyên gia thuế
                </span>
              </div>
            </div>
            <div className="text-white/60 p-1">
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                expand_less
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <button
              onClick={() => handleNavigate('tong-quan')}
              className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>Cổng chuyên gia</span>
            </button>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-bold truncate max-w-xs">{breadcrumbTitle}</span>
          </div>

          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <button
                onClick={() => handleNavigate('cho-tiep-nhan')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold animate-pulse cursor-pointer hover:bg-amber-100 transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-600">hourglass_top</span>
                <span>{pendingCount} ca chờ duyệt (SLA 2h)</span>
              </button>
            )}

            <div className="h-4 w-px bg-outline-variant"></div>

            <div className="flex items-center gap-1.5 text-xs text-secondary font-medium font-mono">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{formattedLiveTime} • {formattedLiveDate}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full pt-16 bg-surface min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
