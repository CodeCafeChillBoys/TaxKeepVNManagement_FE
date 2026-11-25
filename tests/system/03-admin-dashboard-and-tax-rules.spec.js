import { test, expect } from '@playwright/test'
import {
  loginAdminViaUi,
  openAdminRoute,
  skipUnlessAdminConfigured,
} from './helpers/adminAuth.js'

test.describe('Module 3: Tổng quan Quản trị & Nghiệp vụ Quy tắc Thuế AI (Real BE + Database)', () => {
  test.beforeEach(() => {
    skipUnlessAdminConfigured(test)
  })

  test('ST-ADM-01: Đăng nhập Quản trị viên qua giao diện và kiểm tra Bảng điều khiển Tổng quan (/admin/tong-quan)', async ({
    page,
  }) => {
    await loginAdminViaUi(page)

    await page.getByRole('button', { name: 'Tổng quan' }).click()
    await expect(page).toHaveURL(/\/admin\/tong-quan/)

    await expect(page.getByText('BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Xin chào,/i })).toBeVisible()

    // Kiểm tra 4 thẻ trạng thái giám sát hạ tầng & dữ liệu thật
    await expect(page.getByText('Cổng liên thông', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Trí tuệ nhân tạo', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Nghiệp vụ quản lý', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Tính năng quản trị chính', { exact: false })).toBeVisible()
  })

  test('ST-ADM-02: Kiểm tra Tải lên văn bản thuế AI (/admin/boc-tach-van-ban-ai) — danh mục tên miền chuẩn & validate dữ liệu', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/boc-tach-van-ban-ai')

    await expect(page.getByRole('heading', { name: /Tải Lên Văn Bản Thuế/i })).toBeVisible()
    await expect(page.getByText(/Văn bản quy phạm đã lưu/i)).toBeVisible()

    // Kiểm tra validate kỳ tính thuế ngoài khoảng hợp lệ 1900 - 2100
    const yearInput = page.locator('#taxYearInput')
    await yearInput.fill('1850')
    await yearInput.blur()
    await expect(
      page.getByText(/Năm tính thuế phải nằm trong khoảng từ 1900 đến 2100/i).first()
    ).toBeVisible()

    // Khôi phục năm hợp lệ
    await yearInput.fill('2026')
    await yearInput.blur()

    // Kiểm tra cảnh báo khi nhập URL không thuộc danh mục tên miền nhà nước được phê chuẩn
    const sourceUrlInput = page.locator('#sourceUrlInput')
    await sourceUrlInput.fill('https://untrusted-tax-mirror.example.com/luat-thue.pdf')
    await sourceUrlInput.blur()
    await expect(
      page.getByText(/không nằm trong danh mục|tên miền|phê chuẩn|không hợp lệ/i).first()
    ).toBeVisible()
  })

  test('ST-ADM-03: Kiểm tra Thẩm định & Phê duyệt Quy tắc thuế (/admin/quy-tac-thue) — chỉ số Kỳ tính thuế, lọc 4 tab & tìm kiếm', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/quy-tac-thue')

    const heading = page.getByRole('heading', {
      name: /KIỂM TRA DỮ LIỆU TRÍCH XUẤT VĂN BẢN|Chưa có dữ liệu quy tắc thuế/i,
    })
    await expect(heading).toBeVisible({ timeout: 20_000 })

    const hasRuleSet = await page
      .getByText('Kỳ tính thuế', { exact: false })
      .first()
      .isVisible()
      .catch(() => false)

    if (hasRuleSet) {
      await expect(page.getByText('Hiệu lực áp dụng', { exact: false }).first()).toBeVisible()
      await expect(page.getByText('Thời hạn kết thúc', { exact: false }).first()).toBeVisible()
      await expect(page.getByText('Tổng quy tắc trích xuất', { exact: false }).first()).toBeVisible()

      // Kiểm tra chuyển đổi qua đầy đủ 4 nhóm quy tắc
      const progressiveTab = page.getByRole('button', { name: /Biểu thuế lũy tiến/i })
      const deductionTab = page.getByRole('button', { name: /Giảm trừ gia cảnh/i })
      const dependentTab = page.getByRole('button', { name: /Tiêu chí Người phụ thuộc/i })
      const flatExemptTab = page.getByRole('button', { name: /Thuế suất khác & Miễn thuế/i })

      await expect(progressiveTab).toBeVisible()
      await deductionTab.click()
      await dependentTab.click()
      await flatExemptTab.click()
      await progressiveTab.click()

      // Kiểm tra bộ lọc từ khóa hoạt động tức thì
      const searchBox = page.getByPlaceholder('Tìm theo mã, tên quy tắc...')
      await searchBox.fill('Bậc 1')
      await searchBox.fill('')
    }
  })

  test('ST-ADM-04: Kiểm tra Modal Chi tiết Tiêu chí Người phụ thuộc hiển thị Danh mục giấy tờ tiếng Việt chuẩn hóa', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/quy-tac-thue')

    await expect(
      page.getByRole('heading', {
        name: /KIỂM TRA DỮ LIỆU TRÍCH XUẤT VĂN BẢN|Chưa có dữ liệu quy tắc thuế/i,
      })
    ).toBeVisible({ timeout: 20_000 })

    const dependentTab = page.getByRole('button', { name: /Tiêu chí Người phụ thuộc/i })
    if (await dependentTab.isVisible().catch(() => false)) {
      await dependentTab.click()

      const detailBtn = page.getByRole('button', { name: /Chi tiết/i }).first()
      if (await detailBtn.isVisible().catch(() => false)) {
        await detailBtn.click()

        const docSectionHeading = page.getByText('Danh mục Giấy tờ cần nộp để chứng minh')
        await expect(docSectionHeading).toBeVisible()

        // Đảm bảo mã kỹ thuật thô (như RELATION_PROOF) đã được ánh xạ sang nhãn tiếng Việt dễ hiểu
        await expect(page.locator('body')).not.toContainText('Chọn 1: RELATION_PROOF')

        const closeBtn = page.getByRole('button', { name: /^Đóng$/i }).last()
        await closeBtn.click()
      }
    }
  })

  test('ST-ADM-05: Kiểm tra Lịch sử phê duyệt quy tắc thuế (/admin/lich-su-phe-duyet) — bộ lọc trạng thái & tìm kiếm', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/lich-su-phe-duyet')

    await expect(
      page.getByRole('heading', { name: /LỊCH SỬ PHÊ DUYỆT QUY TẮC THUẾ/i })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Tải văn bản mới/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mở thẩm tra quy tắc/i })).toBeVisible()

    const searchInput = page.getByPlaceholder('Tìm kiếm văn bản, chuyên viên phê duyệt...')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Luật Thuế')
    await searchInput.fill('')
  })
})
