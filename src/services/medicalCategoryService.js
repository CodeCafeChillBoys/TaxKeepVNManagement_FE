import { apiClient } from './apiClient'

/**
 * Danh mục chi phí y tế (api/v1/medical-eligible-categories).
 * BE gửi danh mục này cho AI khi bóc tách bảng kê KCB để phân loại dòng được/không được giảm trừ.
 */
export const medicalCategoryService = {
  /** Lấy cả danh mục đã xóa mềm để admin khôi phục được */
  getAll: async () => {
    const res = await apiClient.get('/api/v1/medical-eligible-categories', {
      params: { includeDeleted: true },
    })
    return res?.data || []
  },

  /** Tạo mới; nếu mã trùng một danh mục đã xóa mềm thì BE khôi phục và ghi đè nội dung */
  create: async (form) => {
    const res = await apiClient.post('/api/v1/medical-eligible-categories', {
      categoryCode: form.categoryCode.trim().toUpperCase(),
      ...editableFields(form),
    })
    return res?.data
  },

  update: async (id, form) => {
    const res = await apiClient.put(`/api/v1/medical-eligible-categories/${id}`, editableFields(form))
    return res?.data
  },

  /** Xóa mềm: AI không dùng nữa nhưng còn khôi phục được */
  delete: async (id) => {
    await apiClient.delete(`/api/v1/medical-eligible-categories/${id}`)
  },

  restore: async (id) => {
    await apiClient.patch(`/api/v1/medical-eligible-categories/${id}/restore`)
  },
}

// Mô tả/từ khóa gửi chuỗi rỗng (không gửi null) thì BE mới xóa được giá trị cũ
const editableFields = (form) => ({
  categoryName: form.categoryName.trim(),
  sectionCode: form.sectionCode.trim().toUpperCase(),
  isEligible: Boolean(form.isEligible),
  description: (form.description || '').trim(),
  keywords: (form.keywords || '').trim(),
})
