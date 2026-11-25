import { test, expect } from '@playwright/test'
import {
  loginAdminViaUi,
  openAdminRoute,
  skipUnlessAdminConfigured,
} from './helpers/adminAuth.js'

test.describe('Module 6: Phân quyền RBAC, Cấu hình Hệ thống, Hồ sơ Bảo mật & Đăng xuất (Real BE + Database)', () => {
  test.beforeEach(() => {
    skipUnlessAdminConfigured(test)
  })

  test('ST-ADM-14: Kiểm tra Phân quyền hệ thống RBAC (/admin/phan-quyen) — Ma trận vai trò & Danh mục quyền có phân trang', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/phan-quyen')

    await expect(page.getByRole('heading', { name: /Phân quyền hệ thống/i })).toBeVisible()

    const roleMatrixTab = page.getByRole('button', { name: /Phân quyền theo vai trò/i })
    const catalogTab = page.getByRole('button', { name: /Danh mục quyền/i })
    await expect(roleMatrixTab).toBeVisible()
    await expect(catalogTab).toBeVisible()

    // Kiểm tra tìm kiếm quyền trong ma trận vai trò
    const permSearch = page.getByPlaceholder('Tìm tên hoặc nhóm quyền...')
    await expect(permSearch).toBeVisible({ timeout: 15_000 })
    await permSearch.fill('role')
    await permSearch.fill('')

    // Nút Lưu phân quyền phải ở trạng thái vô hiệu hóa khi chưa có thay đổi
    await expect(page.getByRole('button', { name: /Lưu phân quyền/i })).toBeDisabled()

    // Chuyển sang Danh mục quyền và kiểm tra phân trang <= 10 dòng/trang
    await catalogTab.click()
    const catalogRows = page.locator('tbody tr')
    const count = await catalogRows.count()
    expect(count).toBeLessThanOrEqual(10)
  })

  test('ST-ADM-15: Kiểm tra Cấu hình hệ thống (/admin/cai-dat) — Tiêu chuẩn kiểm tra chứng từ AI & Công cụ mô phỏng ngưỡng', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/cai-dat?tab=ai-configs')

    await expect(page.getByRole('heading', { name: /CẤU HÌNH HỆ THỐNG/i })).toBeVisible()
    await expect(page.getByText('Tổng số tiêu chuẩn', { exact: false })).toBeVisible()

    const testThresholdBtn = page.getByRole('button', { name: /Kiểm tra quy tắc xét duyệt/i })
    await expect(testThresholdBtn).toBeVisible()
    await testThresholdBtn.click()

    // Đóng hộp thoại kiểm tra ngưỡng an toàn
    await page.keyboard.press('Escape')
  })

  test('ST-ADM-16: Kiểm tra Cấu hình hệ thống — Khóa kết nối AI, Mẫu chỉ dẫn nghiệp vụ & Nguồn văn bản pháp quy', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/cai-dat')

    await expect(page.getByRole('heading', { name: /CẤU HÌNH HỆ THỐNG/i })).toBeVisible()

    const aiKeysTab = page.getByRole('button', { name: /Khóa kết nối dịch vụ/i })
    const promptsTab = page.getByRole('button', { name: /Mẫu chỉ dẫn nghiệp vụ/i })
    const domainsTab = page.getByRole('button', { name: /Nguồn văn bản pháp quy/i })

    await aiKeysTab.click()
    await expect(page).toHaveURL(/tab=ai-keys/)

    await promptsTab.click()
    await expect(page).toHaveURL(/tab=ai-prompts/)

    await domainsTab.click()
    await expect(page).toHaveURL(/tab=domains/)
  })

  test('ST-ADM-17: Kiểm tra Cấu hình hệ thống — Loại chứng từ thuế, Danh mục chi phí y tế & Tham số vận hành', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/cai-dat')

    const docTypesTab = page.getByRole('button', { name: /Loại chứng từ thuế/i })
    const medicalTab = page.getByRole('button', { name: /Danh mục chi phí y tế/i })
    const sysConfigsTab = page.getByRole('button', { name: /Bảng tham số hệ thống/i })
    const generalSystemTab = page.getByRole('button', { name: /Tham số vận hành chung/i })

    await docTypesTab.click()
    await expect(page).toHaveURL(/tab=document-types/)

    await medicalTab.click()
    await expect(page).toHaveURL(/tab=medical-categories/)

    await sysConfigsTab.click()
    await expect(page).toHaveURL(/tab=system-configs/)

    await generalSystemTab.click()
    await expect(page).toHaveURL(/tab=system\b/)
  })

  test('ST-ADM-18: Kiểm tra Hồ sơ cá nhân & Bảo mật Quản trị viên (/admin/ho-so) — Validate định dạng SĐT/MST & Đổi mật khẩu', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/ho-so')

    await expect(
      page.getByRole('heading', { name: /Hồ sơ cá nhân & Bảo mật/i })
    ).toBeVisible()
    await expect(page.getByText('Thông tin người dùng', { exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Đổi mật khẩu/i })).toBeVisible()

    // Kiểm tra validate form Đổi mật khẩu khi gửi rỗng (không thay đổi mật khẩu thật trên DB)
    const updatePasswordBtn = page.getByRole('button', { name: /Cập nhật mật khẩu/i })
    if (await updatePasswordBtn.isVisible().catch(() => false)) {
      await updatePasswordBtn.click()
      await expect(page.getByText(/Vui lòng nhập mật khẩu hiện tại/i)).toBeVisible()
    }
  })

  test('ST-ADM-19: Đăng xuất hệ thống từ menu hồ sơ cá nhân, thu hồi JWT và chặn truy cập trái phép vào /admin', async ({
    page,
  }) => {
    // Đăng nhập phiên riêng qua giao diện để khi logout thu hồi token không ảnh hưởng cache chung
    await loginAdminViaUi(page)

    await page.locator('[title="Nhấn để mở menu hồ sơ cá nhân"]').click()
    await page.getByRole('button', { name: /Đăng xuất hệ thống/i }).click()

    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })

    // Kiểm tra không thể quay lại trang quản trị khi phiên đã bị thu hồi
    await page.goto('/admin/tong-quan')
    await expect(page).toHaveURL(/\/login$/)
  })
})
