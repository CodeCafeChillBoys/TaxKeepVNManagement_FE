import { useState, useEffect, useMemo } from 'react'
import { adminPromptTemplateService } from '@/services/adminPromptTemplateService'
import { AiPromptTemplateModal } from './AiPromptTemplateModal'
import { PromptTestRenderModal } from './PromptTestRenderModal'
import { PromptDetailModal } from './PromptDetailModal'
import { useDebounce } from '@/hooks/useDebounce'
import { TableLoadingRow } from '@/components/ui/loading'
import { TablePagination, useClientPagination } from '@/components/ui/table-pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatPromptKeyLabel,
  formatPromptVariableLabel,
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

export function AiPromptTemplateTab({ onShowToast }) {
  const [prompts, setPrompts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const [filterActive, setFilterActive] = useState('all') // 'all' | 'active' | 'inactive'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Test Render Modal State
  const [testingPrompt, setTestingPrompt] = useState(null)

  // Detail Modal State
  const [viewingPrompt, setViewingPrompt] = useState(null)

  // Confirm Delete State
  const [deletingPrompt, setDeletingPrompt] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle Action Id
  const [togglingKey, setTogglingKey] = useState(null)

  // Notification Fallback
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const notify = (title, message, type = 'success') => {
    if (onShowToast) {
      onShowToast(title, message, type)
    } else {
      setNotice({ open: true, type, title, description: message })
    }
  }

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const data = await adminPromptTemplateService.getAllPrompts({ activeOnly: false })
      setPrompts(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('Lỗi tải dữ liệu', err?.message || 'Không thể tải danh sách System Prompt Templates.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrompts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    return prompts
      .filter((p) => {
        if (filterActive === 'active' && !p.is_active) return false
        if (filterActive === 'inactive' && p.is_active) return false

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase()
          const matchKey = (p.prompt_key || '').toLowerCase().includes(q)
          const matchDesc = (p.description || '').toLowerCase().includes(q)
          const matchContent = (p.system_prompt || '').toLowerCase().includes(q)
          const matchVars = Array.isArray(p.variables) && p.variables.some((v) => v.toLowerCase().includes(q))
          return matchKey || matchDesc || matchContent || matchVars
        }
        return true
      })
      .sort((a, b) => (a.prompt_key || '').localeCompare(b.prompt_key || ''))
  }, [prompts, filterActive, debouncedSearch])

  const promptsPagination = useClientPagination(filteredPrompts, 10)

  // Stats
  const totalPromptsCount = prompts.length
  const activePromptsCount = prompts.filter((p) => p.is_active).length
  const allUniqueVariables = useMemo(() => {
    const set = new Set()
    prompts.forEach((p) => {
      if (Array.isArray(p.variables)) {
        p.variables.forEach((v) => set.add(v))
      }
    })
    return Array.from(set)
  }, [prompts])

  // Handlers
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingPrompt(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setModalMode('edit')
    setEditingPrompt(item)
    setIsModalOpen(true)
  }

  const handleSaveModal = async (payload) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        const result = await adminPromptTemplateService.createPrompt(payload)
        notify('Tạo mới thành công', `System Prompt "${result?.prompt_key || payload.prompt_key}" đã được tạo.`)
      } else if (editingPrompt) {
        await adminPromptTemplateService.updatePrompt(editingPrompt.prompt_key, payload)
        notify('Cập nhật thành công', `Đã cập nhật System Prompt "${editingPrompt.prompt_key}" (tăng phiên bản).`)
      }
      setIsModalOpen(false)
      await fetchPrompts()
    } catch (err) {
      notify('Lỗi thao tác', err?.message || 'Không thể lưu System Prompt.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (promptItem) => {
    setTogglingKey(promptItem.prompt_key)
    const nextStatus = !promptItem.is_active
    try {
      await adminPromptTemplateService.toggleActive(
        promptItem.prompt_key,
        nextStatus,
        promptItem.system_prompt,
        promptItem.description,
        promptItem.variables
      )
      notify(
        'Đổi trạng thái thành công',
        `Prompt "${promptItem.prompt_key}" đã ${nextStatus ? 'được kích hoạt' : 'tạm dừng'}.`
      )
      await fetchPrompts()
    } catch (err) {
      notify('Lỗi đổi trạng thái', err?.message || 'Không thể thay đổi trạng thái kích hoạt.', 'error')
    } finally {
      setTogglingKey(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingPrompt) return
    setIsDeleting(true)
    try {
      await adminPromptTemplateService.deletePrompt(deletingPrompt.prompt_key)
      notify('Đã xóa', `Đã xóa vĩnh viễn System Prompt "${deletingPrompt.prompt_key}".`)
      setDeletingPrompt(null)
      await fetchPrompts()
    } catch (err) {
      notify('Không thể xóa', err?.message || 'Đã có lỗi xảy ra khi xóa System Prompt.', 'error')
    } finally {
      setIsDeleting(false)
    }
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

  return (
    <div className="flex flex-col gap-5">
      {/* 3 Thẻ Thống kê Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Tổng số mẫu chỉ dẫn</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{totalPromptsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">description</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Đang áp dụng thực tế</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">{activePromptsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-outline-variant/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-on-surface-variant">Thông tin chèn tự động</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums mt-0.5">
                {allUniqueVariables.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">tune</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner giới thiệu */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">info</span>
          <div>
            <span className="font-bold text-on-surface">Quản lý mẫu chỉ dẫn nghiệp vụ:</span> Thiết lập nội dung quy định, căn cứ pháp lý và quy trình xử lý tự động cho tư vấn thuế, phân loại hóa đơn và thẩm định hồ sơ. Hệ thống tự động lưu lịch sử phiên bản và hỗ trợ <strong className="text-on-surface">Kiểm tra mẫu</strong> trước khi áp dụng.
          </div>
        </div>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút Thêm mới */}
      <Card className="border border-outline-variant/40 shadow-xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <Input
                placeholder="Tìm tên mẫu chỉ dẫn, mô tả, nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang áp dụng</SelectItem>
                <SelectItem value="inactive">Đang tạm dừng</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || filterActive !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
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
              onClick={fetchPrompts}
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
              <span>Tạo mẫu chỉ dẫn mới</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách Mẫu chỉ dẫn */}
      <Card className="border border-outline-variant/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-container-low/70">
              <TableRow className="border-b border-outline-variant/40 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                <TableHead className="py-3 px-4">Tên mẫu chỉ dẫn & Phiên bản</TableHead>
                <TableHead className="py-3 px-4">Mô tả công dụng</TableHead>
                <TableHead className="py-3 px-4">Thông tin chèn tự động</TableHead>
                <TableHead className="py-3 px-4">Cập nhật lần cuối</TableHead>
                <TableHead className="py-3 px-4 text-center">Áp dụng</TableHead>
                <TableHead className="py-3 px-4 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow
                  colSpan={6}
                  title="Đang tải danh sách mẫu chỉ dẫn nghiệp vụ..."
                />
              ) : filteredPrompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                        find_in_page
                      </span>
                      <p className="font-medium text-sm text-on-surface">Không tìm thấy mẫu chỉ dẫn nào phù hợp</p>
                      <p className="text-xs text-on-surface-variant">
                        Nhấn "Tạo mẫu chỉ dẫn mới" để khai báo quy định hướng dẫn đầu tiên.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                promptsPagination.paginatedItems.map((promptItem) => {
                  const isToggling = togglingKey === promptItem.prompt_key

                  return (
                    <TableRow
                      key={promptItem.prompt_key}
                      className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors"
                    >
                      {/* Tên mẫu chỉ dẫn & Phiên bản */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-on-surface">
                            {formatPromptKeyLabel(promptItem.prompt_key)}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            Phiên bản {promptItem.version || 1} · Khởi tạo: {formatDateTime(promptItem.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Mô tả */}
                      <TableCell className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-on-surface line-clamp-2" title={promptItem.description || ''}>
                          {(promptItem.description || '—').replace(/System prompt/gi, 'Mẫu chỉ dẫn')}
                        </p>
                      </TableCell>

                      {/* Thông tin chèn tự động */}
                      <TableCell className="py-3.5 px-4 max-w-sm">
                        <div className="flex flex-wrap items-center gap-1">
                          {promptItem.variables && promptItem.variables.length > 0 ? (
                            promptItem.variables.map((v) => (
                              <span
                                key={v}
                                className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-on-surface"
                              >
                                {formatPromptVariableLabel(v)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-on-surface-variant">Cố định</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Cập nhật lần cuối */}
                      <TableCell className="py-3.5 px-4 text-xs text-on-surface whitespace-nowrap">
                        {formatDateTime(promptItem.updated_at || promptItem.created_at)}
                      </TableCell>

                      {/* Áp dụng Switch */}
                      <TableCell className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(promptItem)}
                          disabled={isToggling}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            promptItem.is_active ? 'bg-primary' : 'bg-surface-container-highest'
                          }`}
                          title={promptItem.is_active ? 'Nhấn để tạm dừng mẫu chỉ dẫn' : 'Nhấn để kích hoạt mẫu chỉ dẫn'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              promptItem.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </TableCell>

                      {/* Thao tác */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPrompt(promptItem)}
                            className="h-8 px-2 text-xs text-on-surface hover:bg-surface-container-high"
                            title="Xem chi tiết nội dung chỉ dẫn"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTestingPrompt(promptItem)}
                            className="h-8 px-2 text-xs text-on-surface hover:bg-surface-container font-semibold flex items-center gap-1"
                            title="Kiểm tra ghép dữ liệu mẫu"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                            <span>Kiểm tra</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(promptItem)}
                            className="h-8 px-2 text-xs text-on-surface hover:text-primary hover:bg-surface-container font-semibold flex items-center gap-1"
                            title="Sửa nội dung mẫu chỉ dẫn"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>Sửa</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingPrompt(promptItem)}
                            className="h-8 px-2 text-xs text-on-surface-variant hover:text-error hover:bg-error/10"
                            title="Xóa mẫu chỉ dẫn"
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
        {!isLoading && filteredPrompts.length > 0 && (
          <TablePagination
            page={promptsPagination.page}
            totalPages={promptsPagination.totalPages}
            totalItems={promptsPagination.totalItems}
            pageSize={promptsPagination.pageSize}
            onPageChange={promptsPagination.setPage}
            itemLabel="mẫu chỉ dẫn"
          />
        )}
      </Card>

      {/* Modal Tạo mới / Sửa Mẫu chỉ dẫn */}
      {isModalOpen && (
        <AiPromptTemplateModal
          isOpen={isModalOpen}
          mode={modalMode}
          initialData={editingPrompt}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveModal}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal Kiểm tra Mẫu chỉ dẫn */}
      {Boolean(testingPrompt) && (
        <PromptTestRenderModal
          isOpen={Boolean(testingPrompt)}
          prompt={testingPrompt}
          onClose={() => setTestingPrompt(null)}
        />
      )}

      {/* Modal Xem chi tiết Mẫu chỉ dẫn */}
      {Boolean(viewingPrompt) && (
        <PromptDetailModal
          isOpen={Boolean(viewingPrompt)}
          prompt={viewingPrompt}
          onClose={() => setViewingPrompt(null)}
          onEdit={(p) => handleOpenEdit(p)}
          onTestRender={(p) => setTestingPrompt(p)}
        />
      )}

      {/* Modal Xác nhận Xóa Mẫu chỉ dẫn */}
      <ConfirmDialog
        open={Boolean(deletingPrompt)}
        onOpenChange={(open) => !open && setDeletingPrompt(null)}
        title="Xác nhận xóa mẫu chỉ dẫn"
        description={`Bạn có chắc chắn muốn xóa mẫu chỉ dẫn "${formatPromptKeyLabel(deletingPrompt?.prompt_key)}"? Hành động này sẽ gỡ bỏ chỉ dẫn khỏi hệ thống và không thể khôi phục.`}
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Notification Fallback */}
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

