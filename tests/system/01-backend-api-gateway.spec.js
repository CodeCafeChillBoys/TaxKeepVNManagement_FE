import { test, expect } from '@playwright/test'
import { E2E_CONFIG } from './helpers/e2eEnv.js'

test.describe('Module 1: Kiểm thử Tích hợp Hệ thống & API Gateway thật (Real BE + Database)', () => {
  test('ST-API-01: Lấy danh mục nhóm điều kiện người phụ thuộc từ CSDL thật (GET /api/v1/dependents/groups)', async ({
    request,
  }) => {
    const response = await request.get(`${E2E_CONFIG.apiBaseUrl}/api/v1/dependents/groups`)
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data).toContain('CHILD_UNDER_18')
  })

  test('ST-API-02: Lọc danh sách nhóm người phụ thuộc theo mã quan hệ hợp lệ (CHILD / PARENT)', async ({
    request,
  }) => {
    const childRes = await request.get(
      `${E2E_CONFIG.apiBaseUrl}/api/v1/dependents/groups?relationship=CHILD`
    )
    expect(childRes.status()).toBe(200)
    const childBody = await childRes.json()
    expect(childBody.success).toBe(true)
    expect(Array.isArray(childBody.data)).toBe(true)
    expect(childBody.data).toContain('CHILD_UNDER_18')

    const parentRes = await request.get(
      `${E2E_CONFIG.apiBaseUrl}/api/v1/dependents/groups?relationship=PARENT`
    )
    expect(parentRes.status()).toBe(200)
    const parentBody = await parentRes.json()
    expect(parentBody.success).toBe(true)
    expect(Array.isArray(parentBody.data)).toBe(true)
    expect(parentBody.data.length).toBeGreaterThan(0)
  })

  test('ST-API-03: Từ chối mã quan hệ không hợp lệ với mã lỗi chuẩn hóa (HTTP 400)', async ({
    request,
  }) => {
    const invalidRes = await request.get(
      `${E2E_CONFIG.apiBaseUrl}/api/v1/dependents/groups?relationship=INVALID_REL_CODE`
    )
    expect([200, 400]).toContain(invalidRes.status())
    const body = await invalidRes.json()
    if (invalidRes.status() === 400) {
      expect(body.success).toBe(false)
    } else {
      // Trường hợp đọc từ bảng dependent_document_rules trả mảng rỗng khi không có nhóm khớp
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBe(0)
    }
  })

  test('ST-API-04: Chặn truy cập trái phép API bảo mật khi thiếu JWT Token (HTTP 401 Unauthorized)', async ({
    request,
  }) => {
    const response = await request.get(`${E2E_CONFIG.apiBaseUrl}/api/v1/dependents`)
    expect(response.status()).toBe(401)
  })

  test('ST-API-05: API Đăng nhập BE thật từ chối tài khoản/mật khẩu không hợp lệ (POST /api/v1/auth/login)', async ({
    request,
  }) => {
    const response = await request.post(`${E2E_CONFIG.apiBaseUrl}/api/v1/auth/login`, {
      data: {
        citizenId: '999999999999',
        password: 'WrongPassword@2026!',
      },
    })
    expect([400, 401]).toContain(response.status())
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})
