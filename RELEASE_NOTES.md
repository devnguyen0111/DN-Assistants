# DN Assistant 0.2.1

## Tiếng Việt (Vietnamese)

Bản phát hành **0.2.1** tập trung tối ưu hóa cơ chế kiểm tra và cập nhật phiên bản, đảm bảo ứng dụng hoạt động ổn định và an toàn:

### Điểm mới & Cải tiến:
- **Tự động kiểm tra bản cập nhật khi khởi động**: Sau khi ứng dụng mở 2.5 giây, hệ thống tự động kiểm tra phiên bản mới từ GitHub Releases. Người dùng có thể bật/tắt tính năng này trong phần Cài đặt.
- **Hộp thoại cập nhật mới (Interactive Update Dialog)**: Khi phát hiện bản mới, ứng dụng chỉ hiển thị thông báo/dialog nhắc nhở kèm nội dung cập nhật, **tuyệt đối không tự động tải hoặc cài đặt ngầm** làm ảnh hưởng đến dữ liệu đang thao tác.
- **Tiến trình tải trực quan**: Hiển thị phần trăm `%` và dung lượng `MB / MB` thời gian thực khi người dùng chủ động bấm cập nhật.
- **Khắc phục lỗi thoát / crash trên Windows**: Sửa lỗi xung đột tiến trình do gọi thừa `relaunch()` khi trình cài đặt NSIS đang chạy, loại bỏ hoàn toàn mã lỗi `0xc0000409`.
- **Hỗ trợ tải an toàn thủ công từ GitHub**: Thêm nút mở thẳng trang GitHub Releases trên trình duyệt để người dùng có thể tự tải file cài đặt `.exe` trực tiếp nếu muốn.
- **Kiểm tra nhanh từ trang Giới thiệu**: Bổ sung nút kiểm tra cập nhật trực tiếp tại trang Giới thiệu (About).

---

## English

Release **0.2.1** improves the application updater mechanism, focusing on stability, user control, and smooth version transitions:

### Highlights & Changes:
- **Automatic Startup Version Check**: Silently checks for updates 2.5 seconds after launch (can be toggled in Settings).
- **Interactive Update Dialog**: Prompts user when an update is available with full release notes, preventing unexpected background auto-installations.
- **Real-time Download Progress**: Visual progress bar tracking download percentage and transferred MB.
- **Windows Process Fix**: Eliminated `relaunch()` race condition with the NSIS installer on Windows that caused file lock errors and crashes (`0xc0000409`).
- **Direct GitHub Releases Link**: One-click action to open browser and download setup installer directly.
- **Quick Check on About Page**: Added a manual update check button directly on the About page.
