import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AdminLayout({
  children,
  currentRoute: propCurrentRoute,
  onNavigate,
  breadcrumbTitle = 'Tải lên & Trích xuất AI',
  onLogout: propOnLogout
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  // Xác định route hiện tại từ URL pathname hoặc fallback prop
  const pathSegment = location.pathname.replace(/^\/admin\/?/, '')
  const currentRoute = propCurrentRoute || pathSegment || 'boc-tach-van-ban-ai'

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
      navigate(`/admin/${routeId}`)
    }
  }

  const handleLogout = async () => {
    if (propOnLogout) {
      propOnLogout()
    } else {
      await logout()
      navigate('/login')
    }
  }

  const navItems = [
    { id: 'tong-quan', label: 'Tổng quan', icon: 'dashboard' },
    { id: 'van-ban-quy-pham', label: 'Văn bản quy phạm', icon: 'gavel' },
    { id: 'quy-tac-thue', label: 'Quy tắc thuế', icon: 'account_balance' },
    { id: 'boc-tach-van-ban-ai', label: 'Tải lên văn bản thuế', icon: 'document_scanner' },
    { id: 'lich-su-phe-duyet', label: 'Lịch sử phê duyệt', icon: 'history_edu' },
    { id: 'cai-dat', label: 'Cấu hình hệ thống', icon: 'tune' },
  ]

  const userRoleLabel =
    user?.userRole === 'admin'
      ? 'Quản trị viên'
      : user?.userRole === 'taxpayer'
      ? 'Người nộp thuế'
      : user?.userRole || 'Chuyên viên QTT'

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-primary-container text-on-primary z-50 flex flex-col shadow-[0_4px_20px_rgba(45,22,0,0.12)]">
        <div className="px-gutter pt-space-lg pb-space-md flex flex-col gap-space-xs bg-primary">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md tracking-tight text-on-primary font-bold leading-none">
                TAX KEEP VN
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed mt-space-xs">
                QUẢN LÝ THUẾ THU NHẬP CÁ NHÂN
              </span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs"></div>
        </div>

        <div className="px-gutter-sm py-space-sm"></div>

        <nav className="flex-1 px-space-sm flex flex-col gap-space-xs overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-primary-fixed hover:bg-primary hover:text-on-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-title-sm text-title-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User profile footer with Submenu Popover */}
        <div ref={userMenuRef} className="relative p-space-sm m-space-sm mt-auto shrink-0">
          {/* Flyout Submenu Popover */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-container-lowest text-on-surface rounded-2xl shadow-xl border border-outline-variant/40 p-2 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 flex flex-col gap-1">
              {/* Header người dùng */}
              <div className="px-3 py-2.5 border-b border-surface-container-high/60 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {user?.fullName || 'Quản trị viên'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant truncate">
                    {user?.email || 'admin@taxkeep.vn'}
                  </span>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-0.5">
                    {userRoleLabel}
                  </span>
                </div>
              </div>

              {/* Mục menu: Chỉnh sửa hồ sơ cá nhân */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  handleNavigate('ho-so')
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">manage_accounts</span>
                <span>Chỉnh sửa hồ sơ</span>
              </button>

              {/* Mục menu: Đổi mật khẩu */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  handleNavigate('ho-so')
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">lock_reset</span>
                <span>Đổi mật khẩu</span>
              </button>

              <div className="h-px bg-outline-variant/30 my-0.5"></div>

              {/* Mục menu: Đăng xuất */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-container/30 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Đăng xuất hệ thống</span>
              </button>
            </div>
          )}

          {/* Trigger Button hiển thị avatar ở góc dưới màn hình bên trái */}
          <div
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className={`rounded-xl border p-2 flex items-center justify-between gap-space-xs cursor-pointer transition-all ${
              isUserMenuOpen
                ? 'bg-primary border-secondary-fixed/40 shadow-sm'
                : 'bg-primary/70 hover:bg-primary border-primary-fixed/20'
            }`}
            title="Nhấn để mở menu hồ sơ cá nhân"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[14px] shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-title-sm text-[13px] font-semibold text-on-primary truncate leading-tight">
                  {user?.fullName || 'Quản trị viên'}
                </span>
                <span className="font-label-sm text-[11px] text-secondary-fixed truncate">
                  {userRoleLabel}
                </span>
              </div>
            </div>
            <div className="text-secondary-fixed p-1">
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
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-xl">
          <div className="flex items-center gap-space-sm font-label-md text-label-md text-on-surface-variant">
            <button
              onClick={() => handleNavigate('tong-quan')}
              className="hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>Trang chủ</span>
            </button>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <button
              onClick={() => handleNavigate('quy-tac-thue')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Quản lý quy tắc thuế
            </button>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-semibold truncate max-w-xs">{breadcrumbTitle}</span>
          </div>

          <div className="flex items-center gap-space-md">
            <div className="hidden md:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container border border-outline-variant text-[11px] font-mono text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Trực tuyến</span>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <span className="hidden lg:flex items-center gap-1.5 text-label-sm text-secondary font-medium font-mono">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{formattedLiveTime} • {formattedLiveDate}</span>
            </span>
            <button
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Thông báo thẩm định"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="w-full pt-16 bg-surface min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
