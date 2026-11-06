import { apiClient } from './apiClient'

function unwrap(res, fallbackMsg) {
  const body = res?.data !== undefined ? res.data : res
  if (body?.success === false) {
    throw new Error(body?.message || body?.errorCode || fallbackMsg)
  }
  return body?.data !== undefined ? body.data : body
}

/**
 * Service quản trị danh sách & cấu hình System Prompt Templates cho AI (Admin)
 * Kết nối Controller: AdminPromptTemplateController (/api/v1/admin/prompt-templates)
 */
export const adminPromptTemplateService = {
  /**
   * Lấy danh sách toàn bộ System Prompt Templates
   * GET /api/v1/admin/prompt-templates?activeOnly={activeOnly}
   * @param {{ activeOnly?: boolean }} [options]
   * @returns {Promise<Array<{
   *   prompt_key: string,
   *   system_prompt: string,
   *   description: string|null,
   *   version: number,
   *   variables: string[]|null,
   *   is_active: boolean,
   *   created_at: string,
   *   updated_at: string
   * }>>}
   */
  getAllPrompts: async ({ activeOnly = false } = {}) => {
    const params = {}
    if (activeOnly) {
      params.activeOnly = true
    }
    const res = await apiClient.get('/api/v1/admin/prompt-templates', { params })
    const data = unwrap(res, 'Không thể tải danh sách System Prompt Templates.')
    return Array.isArray(data) ? data : (data?.items || [])
  },

  /**
   * Lấy thông tin chi tiết một System Prompt theo mã khóa (ví dụ: PROMPT_TAX_CHAT_ADVISORY)
   * GET /api/v1/admin/prompt-templates/{promptKey}
   * @param {string} promptKey
   */
  getPromptByKey: async (promptKey) => {
    const res = await apiClient.get(`/api/v1/admin/prompt-templates/${encodeURIComponent(promptKey)}`)
    return unwrap(res, `Không thể tải chi tiết System Prompt '${promptKey}'.`)
  },

  /**
   * Admin tạo mới một System Prompt
   * POST /api/v1/admin/prompt-templates
   * @param {{
   *   prompt_key: string,
   *   system_prompt: string,
   *   description?: string,
   *   variables?: string[],
   *   is_active?: boolean
   * }} payload
   */
  createPrompt: async (payload) => {
    const body = {
      prompt_key: payload.prompt_key?.trim(),
      system_prompt: payload.system_prompt,
      description: payload.description?.trim() || null,
      variables: Array.isArray(payload.variables) ? payload.variables : [],
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    }
    const res = await apiClient.post('/api/v1/admin/prompt-templates', body)
    return unwrap(res, 'Không thể tạo mới System Prompt.')
  },

  /**
   * Admin cập nhật nội dung System Prompt (Tự tăng version và xóa Cache trên AI Service)
   * PUT /api/v1/admin/prompt-templates/{promptKey}
   * @param {string} promptKey
   * @param {{
   *   system_prompt: string,
   *   description?: string,
   *   variables?: string[],
   *   is_active?: boolean
   * }} payload
   */
  updatePrompt: async (promptKey, payload) => {
    const body = {
      system_prompt: payload.system_prompt,
      description: payload.description !== undefined ? payload.description?.trim() || null : undefined,
      variables: payload.variables !== undefined ? (Array.isArray(payload.variables) ? payload.variables : []) : undefined,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : undefined,
    }
    const res = await apiClient.put(`/api/v1/admin/prompt-templates/${encodeURIComponent(promptKey)}`, body)
    return unwrap(res, `Không thể cập nhật System Prompt '${promptKey}'.`)
  },

  /**
   * Bật/Tắt nhanh trạng thái kích hoạt của Prompt
   * @param {string} promptKey
   * @param {boolean} nextActiveStatus
   * @param {string} currentSystemPrompt
   * @param {string} [currentDescription]
   * @param {string[]} [currentVariables]
   */
  toggleActive: async (promptKey, nextActiveStatus, currentSystemPrompt, currentDescription, currentVariables) => {
    return adminPromptTemplateService.updatePrompt(promptKey, {
      system_prompt: currentSystemPrompt,
      description: currentDescription,
      variables: currentVariables,
      is_active: nextActiveStatus,
    })
  },

  /**
   * Admin xóa một System Prompt khỏi hệ thống
   * DELETE /api/v1/admin/prompt-templates/{promptKey}
   * @param {string} promptKey
   */
  deletePrompt: async (promptKey) => {
    const res = await apiClient.delete(`/api/v1/admin/prompt-templates/${encodeURIComponent(promptKey)}`)
    return unwrap(res, `Không thể xóa System Prompt '${promptKey}'.`)
  },

  /**
   * Thử nghiệm render System Prompt với các biến tham số giả lập
   * POST /api/v1/admin/prompt-templates/test-render
   * @param {{
   *   prompt_key: string,
   *   params: Record<string, any>
   * }} payload
   * @returns {Promise<{
   *   prompt_key: string,
   *   rendered_prompt: string,
   *   variables_used: string[]
   * }>}
   */
  testRenderPrompt: async (payload) => {
    const body = {
      prompt_key: payload.prompt_key?.trim(),
      params: payload.params || {},
    }
    const res = await apiClient.post('/api/v1/admin/prompt-templates/test-render', body)
    return unwrap(res, 'Không thể render thử nghiệm System Prompt.')
  },
}

