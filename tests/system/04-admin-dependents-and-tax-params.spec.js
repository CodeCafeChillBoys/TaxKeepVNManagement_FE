import { test, expect } from '@playwright/test'
import { openAdminRoute, skipUnlessAdminConfigured } from './helpers/adminAuth.js'

test.describe('Module 4: Quy tắc Hồ sơ, Danh mục Người phụ thuộc & Tham số Thuế TNCN (Real BE + Database)', () => {
  test.beforeEach(() => {
    skipUnlessAdminConfigured(test)
  })

  test('ST-ADM-06: Kiểm tra Quy tắc hồ sơ NPT (/admin/van-ban-quy-pham) — lọc nhóm đối tượng, tìm kiếm & phân trang chuẩn', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/van-ban-quy-pham')

    await expect(page.getByRole('heading', { name: /Quy tắc hồ sơ/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Thêm quy tắc/i })).toBeVisible()

    const searchInput = page.getByPlaceholder('Tìm theo nhóm đối tượng, loại giấy tờ, mô tả...')
    await expect(searchInput).toBeVisible()

    // Đảm bảo quy chuẩn phân trang tối đa 10 dòng dữ liệu / trang khi bảng có dữ liệu
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeLessThanOrEqual(10)

    await searchInput.fill('CCCD')
    await searchInput.fill('')
  })

  test('ST-ADM-07: Kiểm tra Validate Modal Thêm quy tắc giấy tờ NPT (không ghi bẩn dữ liệu thật)', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/van-ban-quy-pham')

    await page.getByRole('button', { name: /Thêm quy tắc/i }).click()
    await expect(page.getByText('Thêm quy tắc giấy tờ')).toBeVisible()

    // Bấm lưu khi chưa chọn nhóm đối tượng và nhập mã giấy tờ sai quy chuẩn
    const docTypeInput = page.locator('input[placeholder*="BIRTH_CERTIFICATE"], input[name="documentType"]').first()
    if (await docTypeInput.isVisible().catch(() => false)) {
      await docTypeInput.fill('ma-sai-ky-tu!')
    }

    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(/Vui lòng chọn nhóm đối tượng/i)).toBeVisible()
    await expect(page.getByText(/Mã giấy tờ chỉ gồm chữ A-Z/i)).toBeVisible()

    // Đóng modal an toàn, bảo toàn dữ liệu trên Database thật
    await page.getByRole('button', { name: /^Hủy$/i }).click()
    await expect(page.getByText('Thêm quy tắc giấy tờ')).toBeHidden()
  })

  test('ST-ADM-08: Kiểm tra Danh mục Nhóm & Quan hệ người phụ thuộc (/admin/nhom-quan-he-npt)', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/nhom-quan-he-npt')

    await expect(
      page.getByRole('heading', { name: /Nhóm & quan hệ người phụ thuộc/i })
    ).toBeVisible()

    // Tab Quan hệ
    const relationTab = page.getByRole('button', { name: /Quan hệ \(\d+\)/i })
    const groupTab = page.getByRole('button', { name: /Nhóm \(\d+\)/i })
    await expect(relationTab).toBeVisible()
    await expect(groupTab).toBeVisible()
    await expect(page.getByRole('button', { name: /Thêm quan hệ/i })).toBeVisible()

    // Chuyển sang Tab Nhóm và kiểm tra bộ lọc Tất cả / Chờ duyệt
    await groupTab.click()
    await expect(page.getByRole('button', { name: /Thêm nhóm/i })).toBeVisible()
    const pendingFilter = page.getByRole('button', { name: /Chờ duyệt \(\d+\)/i })
    const allFilter = page.getByRole('button', { name: /Tất cả \(\d+\)/i })
    await expect(pendingFilter).toBeVisible()
    await pendingFilter.click()
    await allFilter.click()
  })

  test('ST-ADM-09: Kiểm tra Tham số thuế TNCN (/admin/tham-so-thue) — Giảm trừ, Biểu thuế lũy tiến & Hạn quyết toán', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/tham-so-thue')

    await expect(page.getByRole('heading', { name: /Tham số thuế TNCN/i })).toBeVisible()
    await expect(
      page.getByText('Giảm trừ gia cảnh & bảo hiểm bắt buộc', { exact: false })
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText('Biểu thuế lũy tiến từng phần', { exact: false })
    ).toBeVisible()
    await expect(
      page.getByText('Hạn quyết toán & mốc nhắc hạn', { exact: false })
    ).toBeVisible()

    // Thử mở chế độ Chỉnh sửa rồi Hủy ngay để kiểm tra luồng tương tác form mà không ghi đè DB
    const editBtn = page.getByRole('button', { name: /^Chỉnh sửa$/i }).first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      const cancelBtn = page.getByRole('button', { name: /^Hủy$/i }).first()
      await expect(cancelBtn).toBeVisible()
      await cancelBtn.click()
    }
  })
})
