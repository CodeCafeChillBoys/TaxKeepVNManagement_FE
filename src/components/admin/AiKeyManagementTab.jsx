import { useState, useEffect, useMemo } from 'react'
import { adminAiKeyService } from '@/services/adminAiKeyService'
import { AiKeyModal } from './AiKeyModal'
import { useDebounce } from '@/hooks/useDebounce'
import { TableLoadingRow } from '@/components/ui/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatAiProvider,
  getAiKeyStatusInfo,
} from '@/utils/configDataTypeUtils'
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
    (k) =>
      !k.is_active ||
      ['QUOTA_EXCEEDED', 'COOLDOWN', 'EXHAUSTED', 'RATE_LIMITED', 'INVALID', 'REVOKED', 'DISABLED'].includes(
        (k.status || '').toUpperCase()
      )
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
        notify('Thêm mới thành công', `Khóa kết nối "${result?.key_name || payload.key_name}" đã được xác thực và lưu vào hệ thống.`)
      } else if (editingKey) {
        await adminAiKeyService.updateKey(editingKey.id, payload)
        notify('Cập nhật thành công', `Đã cập nhật cấu hình khóa kết nối "${payload.key_name || editingKey.key_name}".`)
      }
      setIsModalOpen(false)
      await fetchKeys()
    } catch (err) {
      notify('Lỗi thao tác', err?.message || 'Không thể lưu thông tin khóa kết nối.', 'error')
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
        `Khóa kết nối "${keyItem.key_name}" đã ${!keyItem.is_active ? 'được kích hoạt' : 'tạm dừng sử dụng'}.`
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
      notify('Đã xóa', `Đã xóa khóa kết nối "${deletingKey.key_name}".`)
      setDeletingKey(null)
      await fetchKeys()
    } catch (err) {
      notify('Không thể xóa', err?.message || 'Đã có lỗi xảy ra khi xóa khóa kết nối.', 'error')
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
    const info = getAiKeyStatusInfo(status, isActive)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface">
        <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
        {info.label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Thẻ Thống kê Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng số khóa kết nối</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{totalKeysCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">vpn_key</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Đang hoạt động</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tạm nghỉ / Giới hạn</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{issueCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">schedule</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng lượt xử lý</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">
                {totalRequests.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">data_thresholding</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner lưu ý bảo mật */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">shield</span>
          <div>
            <span className="font-bold text-on-surface">Bảo mật khóa kết nối:</span> Tất cả khóa kết nối đều được mã hóa lưu trữ và che giấu trên giao diện (chỉ hiển thị 6 ký tự đầu & 4 ký tự cuối). Hệ thống tự động luân chuyển sang khóa dự phòng kế tiếp theo thứ tự ưu tiên khi một khóa chạm hạn mức trong ngày.
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
                placeholder="Tìm theo tên khóa, đơn vị cung cấp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="QUOTA_EXCEEDED">Vượt hạn mức trong ngày</SelectItem>
                <SelectItem value="COOLDOWN">Đang tạm nghỉ chờ</SelectItem>
                <SelectItem value="EXHAUSTED">Đã hết hạn mức</SelectItem>
                <SelectItem value="RATE_LIMITED">Giới hạn tần suất sử dụng</SelectItem>
                <SelectItem value="INVALID">Khóa không hợp lệ</SelectItem>
                <SelectItem value="REVOKED">Đã thu hồi</SelectItem>
                <SelectItem value="DISABLED">Đã tạm dừng</SelectItem>
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
              <span>Thêm khóa kết nối mới</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách Khóa kết nối */}
      <Card className="border border-outline-variant/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-container-low/70">
              <TableRow className="border-b border-outline-variant/40 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                <TableHead className="py-3 px-4">Tên gợi nhớ & Đơn vị cung cấp</TableHead>
                <TableHead className="py-3 px-4">Mã khóa bảo mật</TableHead>
                <TableHead className="py-3 px-4 text-center">Thứ tự ưu tiên</TableHead>
                <TableHead className="py-3 px-4 text-center">Lượt sử dụng</TableHead>
                <TableHead className="py-3 px-4">Lần dùng gần nhất</TableHead>
                <TableHead className="py-3 px-4 text-center">Trạng thái vận hành</TableHead>
                <TableHead className="py-3 px-4 text-center">Áp dụng</TableHead>
                <TableHead className="py-3 px-4 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow
                  colSpan={8}
                  title="Đang tải danh sách khóa kết nối dịch vụ..."
                />
              ) : filteredKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                        key_off
                      </span>
                      <p className="font-medium text-sm text-on-surface">Không tìm thấy khóa kết nối nào phù hợp</p>
                      <p className="text-xs text-on-surface-variant">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc nhấn "Thêm khóa kết nối mới" để khai báo.
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
                      {/* Tên & Đơn vị cung cấp */}
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-on-surface">
                            {keyItem.key_name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {formatAiProvider(keyItem.provider)} · Tạo: {formatDateTime(keyItem.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Mã khóa bảo mật */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold bg-surface-container px-2 py-0.5 rounded text-on-surface">
                            {keyItem.masked_api_key || '••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyMaskedKey(keyItem)}
                            className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded hover:bg-surface-container-high cursor-pointer"
                            title="Sao chép mã khóa đã ẩn"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </TableCell>

                      {/* Thứ tự ưu tiên */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="font-bold text-xs text-on-surface tabular-nums">
                          {keyItem.priority}
                        </span>
                      </TableCell>

                      {/* Lượt sử dụng */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="font-semibold text-xs text-on-surface tabular-nums">
                          {(keyItem.request_count || 0).toLocaleString('vi-VN')}
                        </span>
                      </TableCell>

                      {/* Lần dùng cuối */}
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-on-surface">
                            {formatDateTime(keyItem.last_used_at)}
                          </span>
                          {keyItem.cooldown_until && (
                            <span className="text-[11px] text-on-surface-variant">
                              Tạm nghỉ đến: {formatDateTime(keyItem.cooldown_until)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Trạng thái vận hành */}
                      <TableCell className="py-3 px-4 text-center">
                        {getStatusBadge(keyItem.status, keyItem.is_active)}
                      </TableCell>

                      {/* Bật/Tắt */}
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(keyItem)}
                          disabled={isToggling}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            keyItem.is_active ? 'bg-primary' : 'bg-surface-container-highest'
                          }`}
                          title={keyItem.is_active ? 'Nhấn để tạm dừng khóa' : 'Nhấn để kích hoạt khóa'}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(keyItem)}
                            className="h-8 px-2 text-xs text-on-surface hover:text-primary hover:bg-surface-container font-semibold flex items-center gap-1"
                            title="Sửa cấu hình khóa kết nối"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>Sửa</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingKey(keyItem)}
                            className="h-8 px-2 text-xs text-on-surface-variant hover:text-error hover:bg-error/10 flex items-center gap-1"
                            title="Xóa khóa kết nối"
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

      {/* Modal Thêm mới / Sửa Khóa kết nối */}
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

      {/* Modal Xác nhận Xóa Khóa */}
      <ConfirmDialog
        open={Boolean(deletingKey)}
        onOpenChange={(open) => !open && setDeletingKey(null)}
        title="Xác nhận xóa khóa kết nối"
        description={`Bạn có chắc chắn muốn xóa khóa kết nối "${deletingKey?.key_name || ''}"? Thao tác này sẽ gỡ bỏ khóa khỏi danh sách điều phối của hệ thống.`}
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

