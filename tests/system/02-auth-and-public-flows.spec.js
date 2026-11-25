import { test, expect } from '@playwright/test'

test.describe('Module 2: Kiểm thử Xác thực, Phân quyền Đường dẫn & Giao diện Công khai (Browser + Real BE)', () => {
  test('ST-AUTH-01: Truy cập trang gốc "/" khi chưa đăng nhập tự động điều hướng về "/login"', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole('heading', { name: /Đăng nhập Quản trị viên/i })
    ).toBeVisible()
    await expect(page.getByText(/CỔNG QUẢN TRỊ NỘI BỘ/i)).toBeVisible()
  })

  test('ST-AUTH-02: Chặn truy cập trực tiếp các đường dẫn Quản trị (/admin, /admin/quy-tac-thue) khi chưa đăng nhập', async ({
    page,
  }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/admin/quy-tac-thue')
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/admin/cai-dat')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('ST-AUTH-03: Kiểm tra ràng buộc dữ liệu đầu vào trên Form Đăng nhập (CCCD 12 chữ số & Mật khẩu)', async ({
    page,
  }) => {
    await page.goto('/login')

    // 1. Bấm đăng nhập khi để trống cả 2 trường
    await page.getByRole('button', { name: /Đăng nhập Bảng điều khiển/i }).click()
    await expect(page.getByText('Vui lòng nhập số Căn cước công dân.')).toBeVisible()
    await expect(page.getByText('Vui lòng nhập mật khẩu truy cập.')).toBeVisible()

    // 2. Kiểm tra ô CCCD tự động lọc ký tự chữ và báo lỗi khi chưa đủ 12 chữ số
    const citizenInput = page.locator('#citizen-id')
    await citizenInput.fill('abc079204')
    await expect(citizenInput).toHaveValue('079204')

    await page.locator('#password').fill('Secret@123')
    await page.getByRole('button', { name: /Đăng nhập Bảng điều khiển/i }).click()
    await expect(
      page.getByText('Số CCCD phải gồm đúng 12 chữ số theo quy định.')
    ).toBeVisible()
  })

  test('ST-AUTH-04: Đăng nhập thất bại đối chiếu trực tiếp với Server BE thật và hiển thị cảnh báo lỗi tiếng Việt', async ({
    page,
  }) => {
    await page.goto('/login')

    await page.locator('#citizen-id').fill('999999999999')
    await page.locator('#password').fill('InvalidPass@2026')
    await page.getByRole('button', { name: /Đăng nhập Bảng điều khiển/i }).click()

    const alertBox = page.getByRole('alert')
    await expect(alertBox).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('ST-AUTH-05: Điều hướng sang trang Quên mật khẩu, kiểm tra ràng buộc Email và quay lại Đăng nhập', async ({
    page,
  }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: /Quên mật khẩu\?/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole('heading', { name: /Quên mật khẩu/i })).toBeVisible()

    // Để trống email và bấm gửi
    await page.getByRole('button', { name: /Gửi liên kết đặt lại/i }).click()
    await expect(page.getByText('Vui lòng nhập địa chỉ email.')).toBeVisible()

    // Quay lại trang Đăng nhập
    await page.getByRole('link', { name: /Quay lại Đăng nhập/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('ST-AUTH-06: Truy cập đường dẫn không tồn tại hiển thị trang 404 chuẩn hóa', async ({
    page,
  }) => {
    await page.goto('/duong-dan-khong-ton-tai-kiem-thu')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Không tìm thấy trang yêu cầu/i })
    ).toBeVisible()
  })
})
