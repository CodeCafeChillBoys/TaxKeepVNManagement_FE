import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { E2E_CONFIG, hasRealAdminCredentials } from './e2eEnv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = path.resolve(__dirname, '../../../test-results/.admin-auth-cache.json')

let memorySession = null

function isJwtStillValid(token) {
  if (!token || typeof token !== 'string') return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8')
    const payload = JSON.parse(payloadJson)
    if (!payload.exp) return true
    // Trừ hao 60 giây để tránh hết hạn giữa chừng test
    return Date.now() < (payload.exp - 60) * 1000
  } catch {
    return false
  }
}

function readCachedSession() {
  if (memorySession && isJwtStillValid(memorySession.token)) {
    return memorySession
  }
  if (!fs.existsSync(CACHE_FILE)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
    if (
      parsed?.citizenId === E2E_CONFIG.adminCitizenId &&
      isJwtStillValid(parsed?.token) &&
      parsed?.user
    ) {
      memorySession = parsed
      return parsed
    }
  } catch {
    // Bỏ qua cache lỗi và đăng nhập lại
  }
  return null
}

function writeCachedSession(session) {
  memorySession = session
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(session, null, 2), 'utf8')
  } catch {
    // Không chặn quá trình chạy test nếu không ghi được cache tạm
  }
}

export function skipUnlessAdminConfigured(testInstance) {
  testInstance.skip(
    !hasRealAdminCredentials(),
    'Chưa cấu hình E2E_ADMIN_CITIZEN_ID và E2E_ADMIN_PASSWORD trong tệp .env.e2e để đăng nhập tài khoản Admin thật.'
  )
}

/**
 * Đăng nhập qua Backend API thật 1 lần duy nhất và tái sử dụng JWT hợp lệ
 * cho các test case chức năng nhằm tránh chạm giới hạn rate-limit /api/v1/auth/login.
 */
export async function getCachedAdminSession(request) {
  const cached = readCachedSession()
  if (cached) return cached

  const res = await request.post(`${E2E_CONFIG.apiBaseUrl}/api/v1/auth/login`, {
    data: {
      citizenId: E2E_CONFIG.adminCitizenId,
      password: E2E_CONFIG.adminPassword,
    },
  })

  expect(
    res.ok(),
    `Đăng nhập API Admin thất bại với HTTP ${res.status()}. Kiểm tra lại E2E_ADMIN_CITIZEN_ID / E2E_ADMIN_PASSWORD trong .env.e2e.`
  ).toBeTruthy()

  const body = await res.json()
  const rawData = body?.data || body
  const token = rawData?.token || body?.token
  const role = String(rawData?.userRole || rawData?.role || '').trim()

  expect(token, 'Phản hồi đăng nhập không chứa JWT token hợp lệ.').toBeTruthy()

  const user = {
    ...rawData,
    token,
    userId: rawData?.userId || rawData?.id,
    id: rawData?.userId || rawData?.id,
    userRole: role,
    role,
  }

  const session = {
    citizenId: E2E_CONFIG.adminCitizenId,
    token,
    user,
  }
  writeCachedSession(session)
  return session
}

/**
 * Khởi tạo phiên đăng nhập Admin vào localStorage và mở trực tiếp đường dẫn quản trị cần kiểm thử.
 */
export async function openAdminRoute(page, request, routePath = '/admin/tong-quan') {
  const session = await getCachedAdminSession(request)

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('taxkeep_token', token)
      window.localStorage.setItem('taxkeep_user', JSON.stringify(user))
    },
    { token: session.token, user: session.user }
  )

  await page.goto(routePath)
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
}

/**
 * Đăng nhập trực tiếp trên giao diện /login (dùng riêng cho test E2E Đăng nhập & Đăng xuất thu hồi token).
 */
export async function loginAdminViaUi(page) {
  await page.goto('/login')
  await page.locator('#citizen-id').fill(E2E_CONFIG.adminCitizenId)
  await page.locator('#password').fill(E2E_CONFIG.adminPassword)
  await page.getByRole('button', { name: /Đăng nhập Bảng điều khiển/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 })
}
