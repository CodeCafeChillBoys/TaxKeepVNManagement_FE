import { useState, useEffect } from 'react'
import { profileService } from '@/services/profileService'
import { authService } from '@/services/authService'
import { useAuth } from '@/hooks/useAuth'

export function AdminProfileSettings() {
  const { user, updateUser } = useAuth()

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: '',
    citizenId: '',
    taxIdNumber: '',
    email: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    userRole: '',
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Feedback State
  const [toast, setToast] = useState(null)
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load profile on mount
  useEffect(() => {
    let mounted = true
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true)
        const data = await profileService.getProfile()
        if (mounted && data) {
          setProfile({
            fullName: data.fullName || '',
            citizenId: data.citizenId || '',
            taxIdNumber: data.taxIdNumber || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).substring(0, 10) : '',
            userRole: data.userRole || user?.userRole || '',
          })
        }
      } catch {
        // Fallback từ user trong auth context
        if (mounted && user) {
          setProfile((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            citizenId: user.citizenId || '',
            email: user.email || '',
            userRole: user.userRole || '',
          }))
        }
      } finally {
        if (mounted) setIsLoadingProfile(false)
      }
    }

    fetchProfile()
    return () => {
      mounted = false
    }
  }, [user])

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileErrors({})

    const errors = {}
    if (!profile.fullName?.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên.'
    }
    if (profile.phoneNumber && !/^(0|\+84)[0-9]{9}$/.test(profile.phoneNumber.trim())) {
      errors.phoneNumber = 'Số điện thoại không hợp lệ (gồm 10 số bắt đầu bằng 0 hoặc +84).'
    }
    if (profile.taxIdNumber) {
      const trimmedTax = profile.taxIdNumber.trim()
      if (!/^\d{10}$|^\d{12}$/.test(trimmedTax)) {
        errors.taxIdNumber = 'Mã số thuế phải gồm 10 chữ số hoặc 12 chữ số (CCCD).'
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      return
    }

    setIsSavingProfile(true)
    try {
      const updated = await profileService.updateProfile({
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        dateOfBirth: profile.dateOfBirth || null,
        taxIdNumber: profile.taxIdNumber || null,
        isTaxRegisteredConfirmed: true,
      })

      showToast('Thành công', 'Thông tin cá nhân đã được cập nhật thành công.', 'success')
      if (updateUser) {
        updateUser({
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
        })
      }
    } catch (err) {
      const beErrors = err.errors || err.data?.errors
      if (beErrors && typeof beErrors === 'object') {
        const mapped = {}
        for (const [k, v] of Object.entries(beErrors)) {
          const lower = k.charAt(0).toLowerCase() + k.slice(1)
          mapped[lower] = Array.isArray(v) ? v[0] : String(v)
        }
        setProfileErrors(mapped)
      }
      showToast('Cập nhật thất bại', err.message || 'Không thể lưu thông tin hồ sơ.', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordErrors({})

    const errors = {}
    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }
    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.'
    }
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsChangingPassword(true)
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      })
      showToast('Thành công', 'Đổi mật khẩu thành công.', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      showToast('Đổi mật khẩu thất bại', err.message || 'Mật khẩu hiện tại không chính xác.', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="p-space-xl flex flex-col gap-space-lg max-w-5xl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <div>
            <strong>{toast.title}:</strong> {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
          THÔNG TIN TÀI KHOẢN & HỒ SƠ
        </span>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          Hồ sơ cá nhân & Bảo mật
        </h2>
        <p className="font-body-md text-on-surface-variant text-sm">
          Quản lý thông tin định danh chuyên viên quản trị và cập nhật mật khẩu truy cập hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Form Cập nhật Hồ sơ (Col 7) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-space-xl rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-space-md">
          <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container-high/60">
            <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              Thông tin người dùng
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-space-md">
            {/* Họ tên */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">
                Họ và tên <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className={`h-10 px-3 rounded-lg border text-sm font-medium bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                  profileErrors.fullName ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                }`}
                placeholder="Nguyễn Văn A"
              />
              {profileErrors.fullName && (
                <span className="text-xs text-error">{profileErrors.fullName}</span>
              )}
            </div>

            {/* CCCD & MST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Số CCCD (Định danh đăng nhập)
                </label>
                <input
                  type="text"
                  value={profile.citizenId}
                  disabled
                  className="h-10 px-3 rounded-lg border border-outline-variant/30 text-sm font-mono font-semibold bg-surface-container/60 text-on-surface-variant cursor-not-allowed"
                />
                <span className="text-[11px] text-on-surface-variant">Không thể thay đổi số CCCD</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Mã số thuế cá nhân (MST)
                </label>
                <input
                  type="text"
                  value={profile.taxIdNumber}
                  onChange={(e) => setProfile({ ...profile, taxIdNumber: e.target.value })}
                  placeholder="10 hoặc 12 số (CCCD)"
                  className={`h-10 px-3 rounded-lg border text-sm font-mono bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                    profileErrors.taxIdNumber ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                  }`}
                />
                {profileErrors.taxIdNumber && (
                  <span className="text-xs text-error">{profileErrors.taxIdNumber}</span>
                )}
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="h-10 px-3 rounded-lg border border-outline-variant/30 text-sm bg-surface-container/60 text-on-surface-variant cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Số điện thoại</label>
                <input
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  placeholder="0912 345 678"
                  className={`h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                    profileErrors.phoneNumber ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                  }`}
                />
                {profileErrors.phoneNumber && (
                  <span className="text-xs text-error">{profileErrors.phoneNumber}</span>
                )}
              </div>
            </div>

            {/* Ngày sinh & Vai trò */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Ngày sinh</label>
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-outline-variant/40 text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Vai trò tài khoản</label>
                <div className="h-10 px-3 rounded-lg border border-outline-variant/30 bg-surface-container/60 flex items-center">
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-secondary-container/40 text-secondary">
                    {profile.userRole || 'admin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Địa chỉ thường trú</label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                className="p-3 rounded-lg border border-outline-variant/40 text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none resize-none"
              />
            </div>

            <div className="pt-space-sm flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile || isLoadingProfile}
                className="px-space-xl py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                <span>Lưu thay đổi hồ sơ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Form Đổi mật khẩu (Col 5) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-xl rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-space-md h-fit">
          <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container-high/60">
            <span className="material-symbols-outlined text-secondary text-[22px]">lock_reset</span>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              Đổi mật khẩu
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">
                Mật khẩu hiện tại <span className="text-error">*</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                  passwordErrors.currentPassword ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                }`}
              />
              {passwordErrors.currentPassword && (
                <span className="text-xs text-error">{passwordErrors.currentPassword}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">
                Mật khẩu mới (tối thiểu 8 ký tự) <span className="text-error">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                  passwordErrors.newPassword ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                }`}
              />
              {passwordErrors.newPassword && (
                <span className="text-xs text-error">{passwordErrors.newPassword}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">
                Xác nhận mật khẩu mới <span className="text-error">*</span>
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`h-10 px-3 rounded-lg border text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none ${
                  passwordErrors.confirmNewPassword ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                }`}
              />
              {passwordErrors.confirmNewPassword && (
                <span className="text-xs text-error">{passwordErrors.confirmNewPassword}</span>
              )}
            </div>

            <div className="pt-space-sm">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <span className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">key</span>
                )}
                <span>Cập nhật mật khẩu mới</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
