# TÀI LIỆU KIỂM THỬ HỆ THỐNG (SYSTEM TEST REPORT) — TAXKEEP VN ADMIN PORTAL

## 1. Tổng quan Môi trường & Công cụ Kiểm thử Hệ thống

| Hạng mục | Cấu hình sử dụng |
| :--- | :--- |
| **Phân hệ kiểm thử** | Hệ thống Quản trị Web TaxKeep VN (`taxkeepvn`) tích hợp trực tiếp Backend API Gateway & PostgreSQL |
| **Framework kiểm thử E2E** | **Playwright Test** (`@playwright/test` — trình duyệt thực **Desktop Chromium** `1440x900`, `vi-VN`) |
| **Chế độ kết nối dữ liệu** | Kết nối **trực tiếp Backend API Gateway & Cơ sở dữ liệu thật** (`VITE_API_GATEWAY_URL`) — **không mock API** |
| **Nguyên tắc an toàn dữ liệu** | Kiểm thử toàn diện luồng đọc dữ liệu thật, bộ lọc, tìm kiếm, chuyển tab, phân trang (≤ 10 dòng/trang), kiểm tra ràng buộc biểu mẫu (validation) và thu hồi phiên đăng nhập; **tuyệt đối không xóa hoặc ghi bẩn dữ liệu thật trên máy chủ** |
| **Bằng chứng kiểm thử tự động** | Tự động chụp ảnh màn hình (`screenshot: 'on'`), lưu vết lỗi (`trace: 'retain-on-failure'`), xuất báo cáo HTML trực quan (`playwright-report/index.html`) và JSON (`test-results/system-test-summary.json`) |

---

## 2. Cấu trúc Bộ Kịch bản Kiểm thử Tự động (`tests/system/`)

| Tệp kịch bản | Nhóm chức năng kiểm thử | Mã kịch bản | Số lượng TC |
| :--- | :--- | :---: | :---: |
| `01-backend-api-gateway.spec.js` | Cổng liên thông Backend API Gateway, PostgreSQL & Bảo mật JWT/RBAC | `ST-API-01` → `ST-API-05` | **5** |
| `02-auth-and-public-flows.spec.js` | Trang công khai, Xác thực định danh, Đăng ký eKYC & Route Guard | `ST-AUTH-01` → `ST-AUTH-06` | **6** |
| `03-admin-dashboard-and-tax-rules.spec.js` | Tổng quan hệ thống, Tải lên văn bản thuế AI, Thẩm định quy tắc & Lịch sử phê duyệt | `ST-ADM-01` → `ST-ADM-05` | **5** |
| `04-admin-dependents-and-tax-params.spec.js` | Quy tắc hồ sơ NPT, Danh mục Nhóm & Quan hệ NPT, Tham số thuế TNCN | `ST-ADM-06` → `ST-ADM-09` | **4** |
| `05-admin-experts-fund-and-subscriptions.spec.js` | Quản trị Chuyên gia tư vấn (7 tab), Quỹ hệ thống & Gói dịch vụ Subscription | `ST-ADM-10` → `ST-ADM-13` | **4** |
| `06-admin-rbac-settings-and-profile.spec.js` | Phân quyền RBAC, Cấu hình hệ thống (7 tab), Hồ sơ bảo mật & Đăng xuất thu hồi JWT | `ST-ADM-14` → `ST-ADM-19` | **6** |
| **Tổng cộng** | **Bao phủ toàn bộ 13/13 phân hệ cốt lõi trên cổng Quản trị viên** | **`ST-API` / `ST-AUTH` / `ST-ADM`** | **30** |

---

## 3. Đặc tả Chi tiết Kịch bản Kiểm thử Hệ thống (Dùng cho Báo cáo Đồ án)

### 3.1. Module 1 — Kiểm thử Tích hợp Hệ thống & API Gateway thật (`01-backend-api-gateway.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-API-01** | Lấy danh mục nhóm điều kiện người phụ thuộc từ CSDL thật (`GET /api/v1/dependents/groups`) | Máy chủ Backend & PostgreSQL hoạt động | Gửi `GET /api/v1/dependents/groups` tới API Gateway | Phản hồi `HTTP 200 OK`, trả về mảng danh mục nhóm người phụ thuộc hợp lệ từ CSDL |
| **ST-API-02** | Lọc danh sách nhóm người phụ thuộc theo mã quan hệ hợp lệ (`CHILD` / `PARENT`) | CSDL có dữ liệu danh mục NPT | Gửi `GET /api/v1/dependents/groups?relationship=CHILD` và `?relationship=PARENT` | Phản hồi `HTTP 200 OK`, mọi phần tử trả về đều khớp chính xác với mã quan hệ đã lọc |
| **ST-API-03** | Từ chối mã quan hệ không hợp lệ với mã lỗi chuẩn hóa (`HTTP 400`) | API kiểm tra tham số đầu vào | Gửi `GET /api/v1/dependents/groups?relationship=INVALID_RELATION` | Máy chủ từ chối yêu cầu với mã `HTTP 400 Bad Request` kèm thông báo lỗi chuẩn hóa |
| **ST-API-04** | Chặn truy cập trái phép API bảo mật khi thiếu JWT Token (`HTTP 401 Unauthorized`) | Không truyền header `Authorization` | Gửi `GET /api/profile` không đính kèm Bearer Token | Máy chủ từ chối truy cập với mã `HTTP 401 Unauthorized` |
| **ST-API-05** | API Đăng nhập BE thật từ chối tài khoản/mật khẩu không hợp lệ (`POST /api/v1/auth/login`) | API Auth hoạt động bình thường | Gửi `POST /api/v1/auth/login` với CCCD `000000000000` và mật khẩu sai | Máy chủ trả về `HTTP 400/401` kèm thông báo lỗi xác thực rõ ràng |

---

### 3.2. Module 2 — Xác thực, Phân quyền Đường dẫn & Giao diện Công khai (`02-auth-and-public-flows.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-AUTH-01** | Truy cập trang gốc `/` khi chưa đăng nhập tự động điều hướng về `/login` | Trình duyệt chưa đăng nhập | Mở URL gốc `/` trên trình duyệt Chromium | Hệ thống tự động điều hướng sang `/login` và hiển thị cổng đăng nhập Quản trị |
| **ST-AUTH-02** | Chặn truy cập trực tiếp các đường dẫn Quản trị (`/admin`, `/admin/quy-tac-thue`) khi chưa đăng nhập | `localStorage` không có phiên JWT | Truy cập trực tiếp `/admin` và `/admin/quy-tac-thue` | `ProtectedRoute` chặn truy cập trái phép và chuyển hướng ngay về `/login` |
| **ST-AUTH-03** | Kiểm tra ràng buộc dữ liệu đầu vào trên Form Đăng nhập (CCCD 12 chữ số & Mật khẩu) | Đang ở trang `/login` | Nhập CCCD chưa đủ 12 số hoặc để trống mật khẩu rồi nhấn *Đăng nhập Bảng điều khiển* | Chặn gửi API, hiển thị thông báo lỗi kiểm tra định dạng tiếng Việt ngay dưới trường nhập |
| **ST-AUTH-04** | Đăng nhập thất bại đối chiếu trực tiếp với Server BE thật và hiển thị cảnh báo lỗi tiếng Việt | Đang ở trang `/login`, kết nối BE thật | Nhập CCCD 12 số không tồn tại + mật khẩu bất kỳ và gửi biểu mẫu | FE gọi `POST /api/v1/auth/login` thật, hiển thị thông báo lỗi tiếng Việt từ máy chủ và giữ nguyên tại `/login` |
| **ST-AUTH-05** | Điều hướng sang trang Quên mật khẩu, kiểm tra ràng buộc Email và quay lại Đăng nhập | Đang ở trang `/login` | Nhấn *Quên mật khẩu?*, gửi thử email sai định dạng, sau đó nhấn quay lại Đăng nhập | Điều hướng sang `/forgot-password`, bắt lỗi định dạng email chuẩn xác và quay về `/login` thành công |
| **ST-AUTH-06** | Truy cập đường dẫn không tồn tại hiển thị trang `404` chuẩn hóa | Trình duyệt hoạt động bình thường | Truy cập đường dẫn bất kỳ không tồn tại (`/duong-dan-khong-ton-tai-404`) | Hiển thị giao diện báo lỗi `404` thân thiện kèm nút điều hướng quay lại an toàn |

---

### 3.3. Module 3 — Tổng quan Quản trị & Nghiệp vụ Quy tắc Thuế AI (`03-admin-dashboard-and-tax-rules.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-ADM-01** | Đăng nhập Quản trị viên qua giao diện & kiểm tra Tổng quan hệ thống (`/admin/tong-quan`) | Có tài khoản Admin hợp lệ trong `.env.e2e` | 1. Đăng nhập tại `/login`<br>2. Mở *Tổng quan*<br>3. Kiểm tra 4 thẻ hạ tầng (*Cổng liên thông*, *Trí tuệ nhân tạo*, *Nghiệp vụ quản lý*, *Quy tắc hồ sơ*) | Đăng nhập thành công vào `/admin/tong-quan`, hiển thị lời chào quản trị viên và số liệu giám sát thực tế từ Backend |
| **ST-ADM-02** | Kiểm tra Tải lên văn bản thuế AI (`/admin/boc-tach-van-ban-ai`) — danh mục tên miền chuẩn & validate | Đã xác thực phiên Admin | 1. Mở `/admin/boc-tach-van-ban-ai`<br>2. Nhập Kỳ tính thuế `1850` và blur<br>3. Nhập URL ngoài danh mục nhà nước phê chuẩn và blur | Báo lỗi *Năm tính thuế phải nằm trong khoảng từ 1900 đến 2100*, cảnh báo nguồn URL không thuộc tên miền được phê chuẩn, hiển thị danh sách *Văn bản quy phạm đã lưu* |
| **ST-ADM-03** | Kiểm tra Thẩm định & Phê duyệt Quy tắc thuế (`/admin/quy-tac-thue`) — chỉ số Kỳ tính thuế, 4 tab & tìm kiếm | Đã xác thực phiên Admin | 1. Mở `/admin/quy-tac-thue`<br>2. Kiểm tra 4 thẻ chỉ số (*Kỳ tính thuế*, *Hiệu lực áp dụng*, *Thời hạn kết thúc*, *Tổng quy tắc trích xuất*)<br>3. Lần lượt chuyển qua 4 tab quy tắc và lọc từ khóa | Dữ liệu bộ quy tắc tải từ DB thật, chuyển đổi mượt giữa 4 tab (*Biểu thuế lũy tiến*, *Giảm trừ gia cảnh*, *Tiêu chí Người phụ thuộc*, *Thuế suất khác & Miễn thuế*) và lọc đúng theo từ khóa |
| **ST-ADM-04** | Kiểm tra Modal Chi tiết Tiêu chí Người phụ thuộc hiển thị Danh mục giấy tờ tiếng Việt | Bộ quy tắc có dữ liệu Tiêu chí NPT | 1. Chọn tab *Tiêu chí Người phụ thuộc*<br>2. Nhấn *Chi tiết* ở dòng đầu tiên<br>3. Đối chiếu mục *Danh mục Giấy tờ cần nộp để chứng minh* rồi nhấn *Đóng* | Hiển thị rõ tên giấy tờ, loại chứng từ, trạng thái bắt buộc và nhóm giấy tờ thay thế bằng tiếng Việt tự nhiên (không còn mã thô `RELATION_PROOF`) |
| **ST-ADM-05** | Kiểm tra Lịch sử phê duyệt quy tắc thuế (`/admin/lich-su-phe-duyet`) | Đã xác thực phiên Admin | Mở `/admin/lich-su-phe-duyet`, kiểm tra bộ lọc Năm, Trạng thái, nút điều hướng và ô tìm kiếm văn bản | Hiển thị tiêu đề *LỊCH SỬ PHÊ DUYỆT QUY TẮC THUẾ*, danh sách lịch sử phê duyệt từ DB và lọc tức thì theo từ khóa |

---

### 3.4. Module 4 — Quy tắc Hồ sơ, Danh mục Người phụ thuộc & Tham số Thuế TNCN (`04-admin-dependents-and-tax-params.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-ADM-06** | Kiểm tra Quy tắc hồ sơ NPT (`/admin/van-ban-quy-pham`) — tìm kiếm & phân trang chuẩn | Đã xác thực phiên Admin | Mở `/admin/van-ban-quy-pham`, đếm số dòng hiển thị trên 1 trang và thử tìm kiếm theo loại giấy tờ `CCCD` | Bảng dữ liệu tải thành công từ BE, đảm bảo quy chuẩn **tối đa 10 dòng/trang**, bộ lọc từ khóa phản hồi chính xác |
| **ST-ADM-07** | Kiểm tra Validate Modal Thêm quy tắc giấy tờ NPT | Đang ở `/admin/van-ban-quy-pham` | Nhấn *Thêm quy tắc*, nhập mã sai định dạng, nhấn Lưu khi chưa chọn nhóm đối tượng, sau đó nhấn *Hủy* | Chặn gửi API, báo lỗi *Vui lòng chọn nhóm đối tượng*, đóng hộp thoại an toàn không tạo bản ghi rác trên DB |
| **ST-ADM-08** | Kiểm tra Danh mục Nhóm & Quan hệ người phụ thuộc (`/admin/nhom-quan-he-npt`) | Đã xác thực phiên Admin | Mở `/admin/nhom-quan-he-npt`, kiểm tra tab *Quan hệ*, chuyển sang tab *Nhóm* và lọc *Chờ duyệt* / *Tất cả* | Hiển thị danh mục quan hệ chuẩn (`CHILD`, `SPOUSE`, `PARENT`, `OTHER_DEPENDENT`) và lọc đúng trạng thái nhóm đối tượng NPT |
| **ST-ADM-09** | Kiểm tra Tham số thuế TNCN (`/admin/tham-so-thue`) — Giảm trừ, Biểu thuế & Hạn quyết toán | Đã xác thực phiên Admin | Mở `/admin/tham-so-thue`, kiểm tra 3 phân mục nghiệp vụ, nhấn *Chỉnh sửa* rồi nhấn *Hủy* | Hiển thị đầy đủ *Giảm trừ gia cảnh & bảo hiểm bắt buộc*, *Biểu thuế lũy tiến từng phần* và *Hạn quyết toán & mốc nhắc hạn*; hủy chỉnh sửa an toàn |

---

### 3.5. Module 5 — Quản trị Chuyên gia, Quỹ Hệ thống & Gói Dịch vụ Subscription (`05-admin-experts-fund-and-subscriptions.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-ADM-10** | Kiểm tra Quản lý chuyên gia (`/admin/quan-ly-chuyen-gia`) — Hồ sơ xét duyệt & Khiếu nại | Đã xác thực phiên Admin | Mở `/admin/quan-ly-chuyen-gia`, kiểm tra và chuyển đổi giữa tab *Hồ sơ chuyên gia* và tab *Khiếu nại* | Cả hai tab kích hoạt đúng trạng thái (`data-state="active"`) và tải danh sách hồ sơ/khiếu nại thực tế từ hệ thống |
| **ST-ADM-11** | Kiểm tra cấu hình Dịch vụ tư vấn Chuyên gia (5 tab cấu hình chuyên sâu) | Đang ở `/admin/quan-ly-chuyen-gia` | Lần lượt mở *Lĩnh vực tư vấn*, *Khung phí dịch vụ*, *Loại chứng chỉ*, *Đề xuất & Tìm kiếm*, *Chính sách vận hành* | Toàn bộ 5 phân mục cấu hình dịch vụ chuyên gia tải thành công, không phát sinh lỗi trắng trang hay lỗi kết nối |
| **ST-ADM-12** | Kiểm tra Quỹ hệ thống & Doanh thu sàn (`/admin/quy-he-thong`) | Đã xác thực phiên Admin | Mở `/admin/quy-he-thong`, chuyển đổi giữa tab *Quỹ & Doanh thu sàn* và tab *Lệnh rút tiền* | Hiển thị số liệu ví sàn, sổ cái giao dịch ký quỹ và danh sách yêu cầu rút tiền của chuyên gia |
| **ST-ADM-13** | Kiểm tra Gói dịch vụ Subscription (`/admin/goi-dich-vu`) | Đã xác thực phiên Admin | Mở `/admin/goi-dich-vu`, kiểm tra thẻ thống kê (*Tổng số gói*, *Đang mở bán*) và chuyển qua 3 tab (*Gói và giá*, *Người dùng*, *Doanh thu*) | Dữ liệu gói cước, thuê bao người dùng và thống kê doanh thu đồng bộ trực tiếp với PostgreSQL |

---

### 3.6. Module 6 — Phân quyền RBAC, Cấu hình Hệ thống, Hồ sơ Bảo mật & Đăng xuất (`06-admin-rbac-settings-and-profile.spec.js`)

| Mã TC | Tên kịch bản kiểm thử | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- | :--- |
| **ST-ADM-14** | Kiểm tra Phân quyền hệ thống RBAC (`/admin/phan-quyen`) | Đã xác thực phiên Admin | 1. Mở `/admin/phan-quyen`, tìm quyền trong ma trận vai trò<br>2. Kiểm tra trạng thái nút *Lưu phân quyền* khi chưa sửa<br>3. Mở tab *Danh mục quyền* | Ma trận quyền lọc tức thì, nút *Lưu phân quyền* bị khóa khi chưa có thay đổi, bảng *Danh mục quyền* phân trang ≤ 10 dòng/trang |
| **ST-ADM-15** | Kiểm tra Cấu hình hệ thống (`/admin/cai-dat`) — Tiêu chuẩn kiểm tra chứng từ AI | Đã xác thực phiên Admin | Mở `/admin/cai-dat?tab=ai-configs`, kiểm tra thống kê tiêu chuẩn và mở hộp thoại *Kiểm tra quy tắc xét duyệt* | Hiển thị danh sách ngưỡng độ tin cậy OCR/AI đang áp dụng và mở công cụ mô phỏng xét duyệt thành công |
| **ST-ADM-16** | Kiểm tra Cấu hình hệ thống — Khóa kết nối AI, Mẫu chỉ dẫn & Nguồn văn bản pháp quy | Đang ở `/admin/cai-dat` | Lần lượt nhấn các tab *Khóa kết nối dịch vụ*, *Mẫu chỉ dẫn nghiệp vụ*, *Nguồn văn bản pháp quy* | Đồng bộ tham số truy vấn URL (`tab=ai-keys`, `tab=ai-prompts`, `tab=domains`) và hiển thị dữ liệu cấu hình tương ứng |
| **ST-ADM-17** | Kiểm tra Cấu hình hệ thống — Loại chứng từ thuế, Danh mục y tế & Tham số vận hành | Đang ở `/admin/cai-dat` | Lần lượt mở *Loại chứng từ thuế*, *Danh mục chi phí y tế*, *Bảng tham số hệ thống* và *Tham số vận hành chung* | Toàn bộ 4 phân mục danh mục nền tảng và cấu hình vận hành tải dữ liệu chuẩn xác từ Backend |
| **ST-ADM-18** | Kiểm tra Hồ sơ cá nhân & Bảo mật Quản trị viên (`/admin/ho-so`) | Đã xác thực phiên Admin | Mở `/admin/ho-so`, kiểm tra vùng *Thông tin người dùng* và nhấn *Cập nhật mật khẩu* khi để trống các trường | Hiển thị thông tin tài khoản Admin, chặn gửi biểu mẫu rỗng và báo lỗi *Vui lòng nhập mật khẩu hiện tại.* |
| **ST-ADM-19** | Đăng xuất hệ thống, thu hồi JWT trên máy chủ & chặn quay lại trang Quản trị | Đăng nhập phiên riêng qua giao diện `/login` | 1. Mở menu hồ sơ góc dưới thanh bên<br>2. Nhấn *Đăng xuất hệ thống*<br>3. Thử truy cập lại `/admin/tong-quan` | Gọi `POST /api/v1/auth/logout`, xóa sạch token lưu trữ, đưa về `/login` và chặn hoàn toàn truy cập ngược vào `/admin/*` |

---

## 4. Hướng dẫn Chạy Kiểm thử & Trích xuất Minh chứng cho Báo cáo

### Bước 1: Khai báo tài khoản Admin kiểm thử
Sao chép tệp `.env.e2e.example` thành `.env.e2e` tại thư mục `taxkeepvn/` và điền thông tin tài khoản Quản trị viên trên môi trường Backend thật:

```env
E2E_API_BASE_URL=http://13.236.166.3:5000
E2E_WEB_BASE_URL=http://localhost:5173
E2E_ADMIN_CITIZEN_ID=001099000001
E2E_ADMIN_PASSWORD=MatKhauAdminThucTeCuaBan
```

> **Cơ chế tối ưu phiên đăng nhập**: Bộ helper `tests/system/helpers/adminAuth.js` tự động đăng nhập qua `POST /api/v1/auth/login` một lần duy nhất và tái sử dụng phiên JWT hợp lệ cho các kịch bản chức năng (`ST-ADM-02` → `ST-ADM-18`), giúp chạy toàn bộ 30 kịch bản nhanh chóng mà không chạm giới hạn chống dò mật khẩu (rate-limit) của máy chủ. Riêng `ST-ADM-01` và `ST-ADM-19` thực hiện đăng nhập/đăng xuất trực tiếp trên giao diện `/login` để kiểm chứng trọn vẹn luồng thu hồi token.

### Bước 2: Chạy toàn bộ 30 kịch bản System Test
```bash
# Chạy tự động toàn bộ System Test và chụp ảnh màn hình minh chứng
npm run test:system

# Mở giao diện trực quan từng bước của Playwright (tiện chụp màn hình đưa vào slide bảo vệ)
npm run test:system:ui

# Xem Báo cáo HTML tổng hợp kết quả Pass/Fail kèm ảnh chụp từng màn hình Admin
npm run test:system:report
```
