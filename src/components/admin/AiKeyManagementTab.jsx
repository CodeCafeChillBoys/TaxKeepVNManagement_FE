import { useState, useEffect, useMemo } from 'react'
import { adminAiKeyService } from '@/services/adminAiKeyService'
import { AiKeyModal } from './AiKeyModal'
import { useDebounce } from '@/hooks/useDebounce'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog, NotificationDialog } from '@/components/ui/notification-dialog'

export function AiKeyManagementTab({ onShowToast }) {
  const [keys, setKeys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'ACTIVE' | 'COOLDOWN' | 'EXHAUSTED' | 'RATE_LIMITED' | 'REVOKED'
  const [filterActive, setFilterActive] = useState('all') // 'all' | 'active' | 'inactive'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingKey, setEditingKey] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirm Delete State
  const [deletingKey, setDeletingKey] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Quick Action Toggling Id
  const [togglingId, setTogglingId] = useState(null)
  const [copiedKeyId, setCopiedKeyId] = useState(null)

  // Notification Modal Fallback
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const notify = (title, message, type = 'success') => {
    if (onShowToast) {
      onShowToast(title, message, type)
    } else {
      setNotice({ open: true, type, title, description: message })
    }
  }

  const fetchKeys = async () => {
    setIsLoading(true)
    try {
      const data = await adminAiKeyService.getAllKeys()
      setKeys(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('Lỗi tải API Keys', err?.message || 'Không thể kết nối máy chủ để tải danh sách API Key.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtered keys
  const filteredKeys = useMemo(() => {
    return keys
      .filter((k) => {
        if (filterStatus !== 'all' && (k.status || '').toUpperCase() !== filterStatus) {
          return false
        }
        if (filterActive === 'active' && !k.is_active) return false
        if (filterActive === 'inactive' && k.is_active) return false

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase()
          const matchName = (k.key_name || '').toLowerCase().includes(q)
          const matchProvider = (k.provider || '').toLowerCase().includes(q)
          const matchMasked = (k.masked_api_key || '').toLowerCase().includes(q)
          return matchName || matchProvider || matchMasked
        }
        return true
      })
      .sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1))
  }, [keys, filterStatus, filterActive, debouncedSearch])

  // Stats calculation
  const totalKeysCount = keys.length
  const activeCount = keys.filter((k) => k.is_active && k.status === 'ACTIVE').length
  const issueCount = keys.filter(
    (k) => !k.is_active || ['COOLDOWN', 'EXHAUSTED', 'RATE_LIMITED', 'REVOKED'].includes(k.status)
  ).length
  const totalRequests = keys.reduce((sum, k) => sum + (Number(k.request_count) || 0), 0)

  // Handlers
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingKey(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (keyItem) => {
    setModalMode('edit')
    setEditingKey(keyItem)
    setIsModalOpen(true)
  }

  const handleSaveModal = async (payload) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        const result = await adminAiKeyService.createKey(payload)
        notify('Thêm mới thành công', `API Key "${result?.key_name || payload.key_name}" đã được xác thực và lưu vào hệ thống.`)
      } else if (editingKey) {
        await adminAiKeyService.updateKey(editingKey.id, payload)
        notify('Cập nhật thành công', `Đã cập nhật cấu hình API Key "${payload.key_name || editingKey.key_name}".`)
      }
      setIsModalOpen(false)
      await fetchKeys()
    } catch (err) {
      notify('Lỗi thao tác', err?.message || 'Không thể lưu thông tin API Key.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (keyItem) => {
    setTogglingId(keyItem.id)
    try {
      await adminAiKeyService.toggleActive(keyItem.id, keyItem.is_active)
      notify(
        'Đổi trạng thái thành công',
        `API Key "${keyItem.key_name}" đã ${!keyItem.is_active ? 'được kích hoạt' : 'tạm dừng sử dụng'}.`
      )
      await fetchKeys()
    } catch (err) {
      notify('Lỗi đổi trạng thái', err?.message || 'Không thể thay đổi trạng thái kích hoạt.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingKey) return
    setIsDeleting(true)
    try {
      await adminAiKeyService.deleteKey(deletingKey.id)
      notify('Đã xóa', `Đã xóa vĩnh viễn API Key "${deletingKey.key_name}".`)
      setDeletingKey(null)
      await fetchKeys()
    } catch (err) {
      notify('Không thể xóa', err?.message || 'Đã có lỗi xảy ra khi xóa API Key.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyMaskedKey = (keyItem) => {
    if (!keyItem.masked_api_key) return
    navigator.clipboard.writeText(keyItem.masked_api_key)
    setCopiedKeyId(keyItem.id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status, isActive) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          Tạm dừng (Disabled)
        </span>
      )
    }

    switch ((status || '').toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hoạt động (Active)
          </span>
        )
      case 'COOLDOWN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Tạm nghỉ (Cooldown)
          </span>
        )
      case 'EXHAUSTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-300">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Hết hạn ngạch (Exhausted)
          </span>
        )
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Bị giới hạn tốc độ (Rate Limited)
          </span>
        )
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Đã thu hồi (Revoked)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {status || 'Unknown'}
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Thẻ Thống kê Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng số API Key</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{totalKeysCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">vpn_key</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Sẵn sàng điều phối</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Cần kiểm tra / Giới hạn</p>
              <p className="text-2xl font-bold text-amber-700 tabular-nums mt-0.5">{issueCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng Request đã phục vụ</p>
              <p className="text-2xl font-bold text-primary tabular-nums mt-0.5">
                {totalRequests.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">data_thresholding</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner lưu ý bảo mật */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/60 flex items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div>
            <span className="font-bold">Bảo mật API Key:</span> Tất cả API Key đều được mã hóa lưu trữ và mask trên giao diện (chỉ hiển thị 6 ký tự đầu & 4 ký tự cuối). Quá trình xoay vòng (Key Rotation) tự động chuyển sang key kế tiếp khi một key chạm ngưỡng Quota hoặc bị Cooldown.
          </div>
        </div>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút Thêm mới */}
      <Card className="border border-outline-variant/40 shadow-xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <Input
                placeholder="Tìm theo tên key, provider, masked..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE (Hoạt động)</SelectItem>
                <SelectItem value="COOLDOWN">COOLDOWN (Tạm nghỉ)</SelectItem>
                <SelectItem value="EXHAUSTED">EXHAUSTED (Hết hạn mức)</SelectItem>
                <SelectItem value="RATE_LIMITED">RATE_LIMITED (Giới hạn tốc độ)</SelectItem>
                <SelectItem value="REVOKED">REVOKED (Thu hồi)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <SelectValue placeholder="Kích hoạt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang áp dụng</SelectItem>
                <SelectItem value="inactive">Đang tạm dừng</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || filterStatus !== 'all' || filterActive !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterStatus('all')
                  setFilterActive('all')
                }}
                className="text-xs text-on-surface-variant hover:text-on-surface h-9 px-2"
              >
                Xóa lọc
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchKeys}
              disabled={isLoading}
              className="text-xs h-9 flex items-center gap-1.5"
              title="Tải lại danh sách"
            >
              <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="text-xs h-9 font-bold bg-primary text-on-primary shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Thêm API Key mới</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách API Key */}
      <Card className="border border-outline-variant/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-container-low/70">
              <TableRow className="border-b border-outline-variant/40 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                <TableHead className="py-3 px-4">Tên gợi nhớ & Nhà cung cấp</TableHead>
                <TableHead className="py-3 px-4">Khóa bảo mật (Masked Key)</TableHead>
                <TableHead className="py-3 px-4 text-center">Độ ưu tiên</TableHead>
                <TableHead className="py-3 px-4 text-center">Lượt gọi (Requests)</TableHead>
                <TableHead className="py-3 px-4">Lần dùng cuối / Cooldown</TableHead>
                <TableHead className="py-3 px-4 text-center">Trạng thái vận hành</TableHead>
                <TableHead className="py-3 px-4 text-center">Áp dụng</TableHead>
                <TableHead className="py-3 px-4 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách API Key AI từ hệ thống...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                        key_off
                      </span>
                      <p className="font-medium text-sm text-on-surface">Không tìm thấy API Key nào phù hợp</p>
                      <p className="text-xs text-on-surface-variant">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc nhấn "Thêm API Key mới" để khai báo.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredKeys.map((keyItem) => {
                  const isToggling = togglingId === keyItem.id
                  const isCopied = copiedKeyId === keyItem.id

                  return (
                    <TableRow
                      key={keyItem.id}
                      className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors"
                    >
                      {/* Tên & Provider */}
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-on-surface">
                              {keyItem.key_name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-1.5 py-0 border-primary/30 text-primary bg-primary/5"
                            >
                              {keyItem.provider || 'GEMINI'}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-on-surface-variant">
                            Tạo: {formatDateTime(keyItem.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Masked Key */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-bold bg-surface-container-high px-2 py-0.5 rounded text-on-surface">
                            {keyItem.masked_api_key || '••••••••••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyMaskedKey(keyItem)}
                            className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded hover:bg-surface-container-high cursor-pointer"
                            title="Sao chép masked key"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </TableCell>

                      {/* Độ ưu tiên Priority */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container-high font-bold text-xs text-on-surface border border-outline-variant/40">
                          {keyItem.priority}
                        </span>
                      </TableCell>

                      {/* Lượt gọi Requests */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="font-semibold text-xs text-on-surface tabular-nums">
                          {(keyItem.request_count || 0).toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Lần dùng cuối / Cooldown */}
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-on-surface">
                            {formatDateTime(keyItem.last_used_at)}
                          </span>
                          {keyItem.cooldown_until && (
                            <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">timer</span>
                              Cooldown đến: {formatDateTime(keyItem.cooldown_until)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Trạng thái vận hành */}
                      <TableCell className="py-3 px-4 text-center">
                        {getStatusBadge(keyItem.status, keyItem.is_active)}
                      </TableCell>

                      {/* Bật/Tắt Is Active */}
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(keyItem)}
                          disabled={isToggling}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            keyItem.is_active ? 'bg-primary' : 'bg-surface-container-highest'
                          }`}
                          title={keyItem.is_active ? 'Nhấn để tạm dừng key' : 'Nhấn để kích hoạt key'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              keyItem.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </TableCell>

                      {/* Thao tác Sửa / Xóa */}
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Sửa */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(keyItem)}
                            className="h-8 px-2 text-xs text-primary hover:bg-primary/10 font-bold flex items-center gap-1"
                            title="Sửa cấu hình API Key"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>Sửa</span>
                          </Button>

                          {/* Nút Xóa */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingKey(keyItem)}
                            className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1"
                            title="Xóa API Key"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
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

      {/* Modal Thêm mới / Sửa API Key */}
      {isModalOpen && (
        <AiKeyModal
          isOpen={isModalOpen}
          mode={modalMode}
          initialData={editingKey}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveModal}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal Xác nhận Xóa Key */}
      <ConfirmDialog
        open={Boolean(deletingKey)}
        onOpenChange={(open) => !open && setDeletingKey(null)}
        title="Xác nhận xóa API Key"
        description={`Bạn có chắc chắn muốn xóa API Key "${deletingKey?.key_name || ''}" (${deletingKey?.masked_api_key || ''})? Thao tác này sẽ gỡ bỏ key khỏi danh sách điều phối của hệ thống AI.`}
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Notification Dialog Fallback */}
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

