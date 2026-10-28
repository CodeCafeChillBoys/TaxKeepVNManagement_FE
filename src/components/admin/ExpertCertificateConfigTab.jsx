import { useState, useEffect, useMemo } from 'react'
import { expertCertificateConfigService } from '@/services/expertCertificateConfigService'
import { ExpertCertificateModal } from '@/components/admin/ExpertCertificateModal'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog, NotificationDialog } from '@/components/ui/notification-dialog'

export function ExpertCertificateConfigTab({ onShowToast }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const [filterStatus, setFilterStatus] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingItem, setEditingItem] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [viewingItem, setViewingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const notify = (title, message, type = 'success') => {
    if (onShowToast) {
      onShowToast(title, message, type)
    } else {
      setNotice({ open: true, type, title, description: message })
    }
  }

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const data = await expertCertificateConfigService.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('Lỗi tải dữ liệu', err?.message || 'Không thể tải danh mục chứng chỉ.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filterStatus === 'active' && !item.isActive) return false
        if (filterStatus === 'inactive' && item.isActive) return false
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase()
          const matchCode = (item.code || '').toLowerCase().includes(q)
          const matchName = (item.name || '').toLowerCase().includes(q)
          const matchBody = (item.issuingBody || '').toLowerCase().includes(q)
          return matchCode || matchName || matchBody
        }
        return true
      })
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
  }, [items, filterStatus, debouncedSearch])

  const activeCount = items.filter((i) => i.isActive).length
  const requiresExpiryCount = items.filter((i) => i.requiresExpiryDate).length

  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setModalMode('edit')
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSave = async (payload) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        await expertCertificateConfigService.create(payload)
        notify('Đã thêm mới', `Loại chứng chỉ "${payload.name}" đã được tạo.`)
      } else if (editingItem) {
        await expertCertificateConfigService.update(editingItem.id, payload)
        notify('Đã cập nhật', `Loại chứng chỉ "${payload.name}" đã được lưu.`)
      }
      setIsModalOpen(false)
      fetchItems()
    } catch (err) {
      notify('Lỗi lưu dữ liệu', err?.message || 'Không thể lưu loại chứng chỉ.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (item) => {
    setTogglingId(item.id)
    try {
      await expertCertificateConfigService.toggleActive(item.id)
      notify(
        'Đã đổi trạng thái',
        `Loại chứng chỉ "${item.name}" đã chuyển sang ${!item.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}.`
      )
      fetchItems()
    } catch (err) {
      notify('Lỗi thao tác', err?.message || 'Không thể đổi trạng thái.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    try {
      await expertCertificateConfigService.delete(deletingItem.id)
      notify('Đã xóa', `Đã xóa loại chứng chỉ "${deletingItem.name}".`)
      setDeletingItem(null)
      fetchItems()
    } catch (err) {
      notify('Không thể xóa', err?.message || 'Chứng chỉ này đang được sử dụng trong hồ sơ.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thống kê gọn */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng danh mục</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{items.length}</p>
            </div>
            <Badge variant="outline">Loại văn bằng</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Đang áp dụng</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{activeCount}</p>
            </div>
            <Badge variant="secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Hoạt động
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Có thời hạn</p>
              <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">
                {requiresExpiryCount}
              </p>
            </div>
            <Badge variant="outline">Cần ngày hết hạn</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Thanh công cụ */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-1 items-center gap-2 w-full">
            <Input
              placeholder="Tìm theo mã, tên chứng chỉ hoặc cơ quan cấp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ({items.length})</SelectItem>
                <SelectItem value="active">Đang áp dụng ({activeCount})</SelectItem>
                <SelectItem value="inactive">Tạm ngưng ({items.length - activeCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button type="button" variant="outline" size="sm" onClick={fetchItems}>
              Làm mới
            </Button>
            <Button type="button" size="sm" onClick={handleOpenCreate}>
              Thêm loại chứng chỉ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng dữ liệu */}
      <Card>
        {isLoading ? (
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2.5 text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Đang tải danh mục chứng chỉ...</span>
          </CardContent>
        ) : filteredItems.length === 0 ? (
          <CardContent className="py-14 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-semibold text-on-surface">Chưa có loại chứng chỉ phù hợp</p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Thêm loại chứng chỉ hành nghề để chuyên gia lựa chọn khi đăng ký hồ sơ.
            </p>
            <Button type="button" size="sm" onClick={handleOpenCreate} className="mt-1">
              Thêm loại chứng chỉ
            </Button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Thứ tự</TableHead>
                <TableHead className="w-36">Mã</TableHead>
                <TableHead>Tên loại chứng chỉ & Cơ quan cấp</TableHead>
                <TableHead className="text-center w-36">Thời hạn</TableHead>
                <TableHead className="text-center w-32">Trạng thái</TableHead>
                <TableHead className="text-right w-40">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono text-on-surface-variant tabular-nums">
                    {item.displayOrder ?? 1}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-on-surface">
                      {item.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-on-surface">{item.name}</span>
                      {item.issuingBody && (
                        <span className="text-[11px] text-on-surface-variant">
                          Cơ quan cấp: {item.issuingBody}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {item.requiresExpiryDate ? 'Có hạn hiệu lực' : 'Vô thời hạn'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      disabled={togglingId === item.id}
                      onClick={() => handleToggleActive(item)}
                      className="cursor-pointer disabled:opacity-50"
                      title="Nhấn để bật/tắt"
                    >
                      <Badge variant="secondary">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? 'bg-emerald-600' : 'bg-stone-400'
                          }`}
                        />
                        {item.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingItem(item)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Chi tiết
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingItem(item)}
                        className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50/60"
                      >
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal thêm/sửa */}
      <ExpertCertificateModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
      />

      {/* Dialog xem chi tiết */}
      <Dialog open={Boolean(viewingItem)} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết loại chứng chỉ</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-on-surface">
                    {viewingItem.code}
                  </span>
                  <Badge variant="secondary">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        viewingItem.isActive ? 'bg-emerald-600' : 'bg-stone-400'
                      }`}
                    />
                    {viewingItem.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-on-surface mt-1">{viewingItem.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg border border-outline-variant/40">
                  <span className="text-[11px] text-on-surface-variant">Cơ quan cấp</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {viewingItem.issuingBody || 'Chưa quy định'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg border border-outline-variant/40">
                  <span className="text-[11px] text-on-surface-variant">Thời hạn hiệu lực</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {viewingItem.requiresExpiryDate ? 'Bắt buộc ngày hết hạn' : 'Vô thời hạn'}
                  </p>
                </div>
              </div>

              {viewingItem.sampleVerificationUrl && (
                <div className="p-2.5 rounded-lg border border-outline-variant/40">
                  <span className="text-[11px] text-on-surface-variant">Cổng tra cứu</span>
                  <a
                    href={viewingItem.sampleVerificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-medium text-primary hover:underline truncate mt-0.5"
                  >
                    {viewingItem.sampleVerificationUrl}
                  </a>
                </div>
              )}

              <div className="p-2.5 rounded-lg border border-outline-variant/40">
                <span className="text-[11px] text-on-surface-variant">Ghi chú yêu cầu</span>
                <p className="text-on-surface mt-0.5 leading-relaxed">
                  {viewingItem.description || 'Không có ghi chú.'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewingItem(null)}>
              Đóng
            </Button>
            {viewingItem && (
              <Button
                type="button"
                onClick={() => {
                  const item = viewingItem
                  setViewingItem(null)
                  handleOpenEdit(item)
                }}
              >
                Chỉnh sửa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Xóa loại chứng chỉ"
        description={`Xóa loại chứng chỉ "${deletingItem?.name || ''}" khỏi danh mục hệ thống?`}
        confirmLabel={isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
        destructive
        onConfirm={handleConfirmDelete}
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
