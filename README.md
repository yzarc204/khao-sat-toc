# Khao Sat Toc - Hair Survey Platform

Website khảo sát mẫu tóc yêu thích với 2 vai trò:

- `User`: nhập tên theo thiết bị, chọn ảnh mẫu tóc, gửi kết quả và có thể quay lại chỉnh sửa.
- `Admin`: đăng nhập bằng PIN 6 chữ số, quản lý cấu hình khảo sát, kéo-thả thứ tự lựa chọn, xem biểu đồ và quản lý kết quả.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- SQLite (`better-sqlite3`)
- `@dnd-kit` (drag and drop)
- `recharts` (charts)
- `qrcode.react` (QR code)

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`

- Trang user: `/`
- Trang admin login: `/admin/login`
- Trang admin dashboard: `/admin`

## Biến môi trường

Tạo file `.env.local`:

```bash
ADMIN_PIN=123456
ADMIN_SECRET=your-super-secret-key
```

- `ADMIN_PIN`: bắt buộc đúng 6 chữ số.
- `ADMIN_SECRET`: khóa ký cookie session cho admin.

## Tính năng chính

### User

- Thiết bị mới bắt buộc nhập tên trước khi khảo sát.
- Chọn mẫu tóc bằng cách chạm ảnh.
- Validate theo `min/max` do admin cấu hình.
- Gửi kết quả và sửa lại khi truy cập lần sau trên cùng thiết bị.

### Admin

- Đăng nhập bằng PIN 6 chữ số.
- Thiết lập:
  - Tiêu đề câu hỏi.
  - Số chọn tối thiểu / tối đa.
  - Trạng thái mở / tạm đóng khảo sát.
- Quản lý lựa chọn mẫu tóc:
  - Thêm theo tên + URL ảnh.
  - Sửa / xóa lựa chọn.
  - Kéo-thả để sắp xếp thứ tự hiển thị.
- Theo dõi kết quả:
  - Danh sách người tham gia + lựa chọn.
  - Xóa từng kết quả hoặc xóa toàn bộ.
- Dashboard tổng quan:
  - KPI số lượng người tham gia, lượt khảo sát, trung bình lựa chọn.
  - Bar chart và pie chart.
- QR code dẫn đến URL khảo sát hiện tại.

## Database

File SQLite nằm tại:

- `data/survey.sqlite`

Schema tự khởi tạo khi app chạy runtime. Trong pha `next build`, hệ thống dùng DB in-memory để tránh lock khi build song song.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```
