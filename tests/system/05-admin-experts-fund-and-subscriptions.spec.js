import { test, expect } from '@playwright/test'
import { openAdminRoute, skipUnlessAdminConfigured } from './helpers/adminAuth.js'

test.describe('Module 5: Quản trị Chuyên gia, Quỹ Hệ thống & Gói Dịch vụ Subscription (Real BE + Database)', () => {
  test.beforeEach(() => {
    skipUnlessAdminConfigured(test)
  })

  test('ST-ADM-10: Kiểm tra Quản lý chuyên gia (/admin/quan-ly-chuyen-gia) — Xét duyệt hồ sơ & Giải quyết khiếu nại', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/quan-ly-chuyen-gia')

    await expect(
      page.getByRole('heading', { name: /Quản trị Chuyên gia & Dịch vụ Tư vấn/i })
    ).toBeVisible()

    const applicationsTab = page.getByRole('tab', { name: /Hồ sơ chuyên gia/i })
    const disputesTab = page.getByRole('tab', { name: /Khiếu nại/i })
    await expect(applicationsTab).toBeVisible()
    await expect(disputesTab).toBeVisible()

    await disputesTab.click()
    await expect(disputesTab).toHaveAttribute('data-state', 'active')

    await applicationsTab.click()
    await expect(applicationsTab).toHaveAttribute('data-state', 'active')
  })

  test('ST-ADM-11: Kiểm tra cấu hình Dịch vụ tư vấn Chuyên gia — Lĩnh vực, Khung phí, Chứng chỉ, Đề xuất & Chính sách', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/quan-ly-chuyen-gia')

    const tabNames = [
      /Lĩnh vực tư vấn/i,
      /Khung phí dịch vụ/i,
      /Loại chứng chỉ/i,
      /Đề xuất & Tìm kiếm/i,
      /Chính sách vận hành/i,
    ]

    for (const namePattern of tabNames) {
      const tab = page.getByRole('tab', { name: namePattern })
      await expect(tab).toBeVisible()
      await tab.click()
      await expect(tab).toHaveAttribute('data-state', 'active')
    }
  })

  test('ST-ADM-12: Kiểm tra Quỹ hệ thống & Doanh thu sàn (/admin/quy-he-thong) — Sổ cái ví sàn & Lệnh rút tiền', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/quy-he-thong')

    await expect(
      page.getByRole('heading', { name: /Quỹ hệ thống & Doanh thu sàn/i })
    ).toBeVisible()

    const walletTab = page.getByRole('tab', { name: /Quỹ & Doanh thu sàn/i })
    const withdrawalsTab = page.getByRole('tab', { name: /Lệnh rút tiền/i })
    await expect(walletTab).toBeVisible()
    await expect(withdrawalsTab).toBeVisible()

    await withdrawalsTab.click()
    await expect(withdrawalsTab).toHaveAttribute('data-state', 'active')

    await walletTab.click()
    await expect(walletTab).toHaveAttribute('data-state', 'active')
  })

  test('ST-ADM-13: Kiểm tra Gói dịch vụ Subscription (/admin/goi-dich-vu) — Danh sách gói, Người dùng & Báo cáo Doanh thu', async ({
    page,
    request,
  }) => {
    await openAdminRoute(page, request, '/admin/goi-dich-vu')

    await expect(page.getByRole('heading', { name: 'Gói dịch vụ' })).toBeVisible()
    await expect(page.getByText('Tổng số gói', { exact: false })).toBeVisible()
    await expect(page.getByText('Đang mở bán', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tạo gói/i })).toBeVisible()

    const plansTab = page.getByRole('tab', { name: /Gói và giá/i })
    const usersTab = page.getByRole('tab', { name: /Người dùng/i })
    const revenueTab = page.getByRole('tab', { name: /Doanh thu/i })

    await usersTab.click()
    await expect(usersTab).toHaveAttribute('data-state', 'active')

    await revenueTab.click()
    await expect(revenueTab).toHaveAttribute('data-state', 'active')

    await plansTab.click()
    await expect(plansTab).toHaveAttribute('data-state', 'active')
  })
})
