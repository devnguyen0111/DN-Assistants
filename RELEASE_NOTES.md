# DN Assistant 0.3.0 - The Productivity Powerhouse Update 🚀

## Tiếng Việt (Vietnamese)

Phiên bản **0.3.0** là bước nhảy vọt quan trọng nhất của **DN Assistant**, mang đến một hệ sinh thái tiện ích cá nhân hoàn chỉnh, offline 100%, bảo mật cục bộ và thiết kế giao diện Bento glassmorphism tinh tế.

### 🌟 Tính năng & Hệ thống mới nổi bật:

1. **Theo dõi Thói quen & Xây dựng Lộ trình (Habit Tracker & Routine Builder)**:
   - Quản lý và duy trì thói quen hàng ngày, các ngày trong tuần hoặc lịch tùy chỉnh.
   - Thống kê chuỗi liên tục (Streaks), kỷ lục cá nhân, tỷ lệ hoàn thành 30 ngày gần nhất và bản đồ nhiệt đóng dấu (Activity Heatmap).
   - Tích hợp widget điểm danh thói quen nhanh ngay trên màn hình chính (Dashboard Bento Grid).

2. **Thư viện Gõ tắt & Văn bản Mẫu Động (Snippets & Dynamic Templates)**:
   - Lưu trữ kho văn bản mẫu, email, đoạn mã và cú pháp gõ tắt thường dùng.
   - Hỗ trợ các thẻ biến động tự động sinh: `{{date}}`, `{{time}}`, `{{datetime}}`, `{{year}}`, `{{uuid}}`, `{{clipboard}}`.
   - Tìm kiếm và dán nhanh qua phím tắt toàn cục `Ctrl+K` (Command Palette) với 1 thao tác.

3. **Phòng thí nghiệm Màu sắc (Color Studio & Palette Extractor)**:
   - Chuyển đổi và sao chép đa định dạng màu: HEX, RGB, HSL, HSV, CMYK.
   - 6 sơ đồ phối màu hòa sắc thông minh: Bổ túc (Complementary), Liền kề (Analogous), Tam giác (Triadic), Tứ giác (Tetradic), Đơn sắc (Monochromatic) và Bổ túc kép (Split).
   - Trích xuất bảng màu chủ đạo (Color Palette Extractor) thông minh từ ảnh tải lên hoặc trực tiếp từ clipboard (`Ctrl+V`).
   - Bộ thẩm định độ tương phản chuẩn trợ năng WCAG 2.1 (AA / AAA) cho thiết kế UI/UX.

4. **Âm thanh Tập trung & Thư giãn Ngoại tuyến (Focus Soundscapes)**:
   - Phát âm thanh thiên nhiên nền 100% bằng Web Audio API, không cần tải file ngoài, hoàn toàn ngoại tuyến và siêu tiết kiệm tài nguyên.
   - 8 kênh âm thanh độc lập: Mưa rào (Rain), Gió rừng thông (Forest Wind), Sóng biển (Ocean Waves), Lửa trại (Campfire), Sóng não Alpha 10Hz kích thích tập trung, Tiếng ồn Trắng (White Noise), Tiếng ồn Hồng (Pink Noise), Tiếng ồn Nâu (Brown Noise).
   - Bàn mixer hòa âm đa tầng tích hợp trực tiếp trong Bộ đếm thời gian Tập trung (Focus Card).

5. **Widget Ghi chú Nổi Màn hình (Desktop Sticky Note)**:
   - Cửa sổ widget nổi độc lập, nhẹ và hỗ trợ Always-on-Top (luôn trên cùng).
   - Tự động lưu tức thì vào Scratchpad, không lo mất dữ liệu.
   - Nút chuyển đổi nhanh ghi chú nổi thành ghi chú chính trong hệ thống chỉ với 1 cú click.

6. **Bộ công cụ Kiểm tra Tệp & Xử lý Ảnh (File & Media Toolkit)**:
   - Tính mã băm SHA-256, SHA-1, SHA-512 kiểm tra tính toàn vẹn tệp tin tức thì mà không gửi tệp lên mạng.
   - Đối soát tự động (Checksum Verifier) với mã băm từ nhà phát hành.
   - Công cụ nén, thay đổi kích thước và chuyển đổi định dạng ảnh hàng loạt (WebP, PNG, JPEG).
   - Bộ chuyển đổi kiểu chữ lập trình (camelCase, snake_case, kebab-case, PascalCase, v.v.).

7. **Nâng cấp Hệ thống Dữ liệu & Sao lưu Mã hóa (SQLite v9 & Backup v2)**:
   - Nâng cấp schema cơ sở dữ liệu SQLite v9 với các bảng `habits`, `habit_logs`, `snippets` được tối ưu hóa chỉ mục.
   - Cơ chế sao lưu mã hóa AES v2 toàn diện: xuất nhập dữ liệu thói quen và mẫu văn bản trọn vẹn, tương thích ngược với các bản backup cũ.

8. **Đồng bộ Song ngữ Toàn diện (Full Bilingual Localization)**:
   - Hỗ trợ hoàn chỉnh 100% tiếng Việt và tiếng Anh trên toàn bộ các trang, widget và thông báo.

---

## English

Release **0.3.0** is the biggest leap forward for **DN Assistant**, establishing an all-in-one, 100% local-first desktop productivity powerhouse wrapped in a sleek glassmorphic Bento interface.

### 🌟 Major Highlights & New Systems:

1. **Habit Tracker & Routine Builder**:
   - Create and maintain positive habits with customizable frequencies (daily, weekdays, custom schedule).
   - Track active streaks, longest personal records, 30-day completion rates, and an interactive GitHub-style activity heatmap.
   - Quick one-click habit check-in widget built directly into the Home Bento Dashboard.

2. **Snippets & Dynamic Template Library**:
   - Maintain a reusable vault of canned responses, email templates, and code snippets.
   - Real-time dynamic macro replacement tags: `{{date}}`, `{{time}}`, `{{datetime}}`, `{{year}}`, `{{uuid}}`, `{{clipboard}}`.
   - Instant search & 1-click clipboard population via global `Ctrl+K` Command Palette.

3. **Color Studio & Palette Extractor**:
   - Seamless color model conversions: HEX, RGB, HSL, HSV, CMYK.
   - 6 color harmony generators: Complementary, Analogous, Triadic, Tetradic, Monochromatic, and Split-Complementary.
   - Smart image dominant color extraction from local file upload or direct clipboard paste (`Ctrl+V`).
   - WCAG 2.1 Contrast Ratio inspector with AA and AAA accessibility badges.

4. **Focus Soundscapes (Procedural Web Audio Engine)**:
   - 100% offline procedural audio synthesizer powered by the Web Audio API — zero external asset downloads or bandwidth usage.
   - 8 ambient tracks: Gentle Rain, Forest Wind, Ocean Waves, Campfire, 10Hz Alpha Binaural Beats, White Noise, Pink Noise, Brown Noise.
   - Multi-channel audio mixer embedded directly into the Focus Timer card.

5. **Desktop Sticky Note Floating Widget**:
   - Ultra-lightweight always-on-top companion window for capturing fleeting thoughts.
   - Real-time auto-saving with instant conversion to permanent notes in one click.

6. **File Checksum & Media Toolkit**:
   - Cryptographic file hashing (SHA-256, SHA-1, SHA-512) for integrity verification with built-in checksum matching.
   - In-browser image resizer and format converter supporting WebP, PNG, and JPEG.
   - Developer case converter (camelCase, snake_case, kebab-case, PascalCase, and more).

7. **Database Migration v9 & Encrypted Backup v2**:
   - SQLite v9 schema migration with indexed `habits`, `habit_logs`, and `snippets` tables.
   - Encrypted backup format v2 ensuring seamless export/import of all routine and snippet data with backward compatibility.

8. **Complete Bilingual Localization**:
   - 100% coverage in both Vietnamese and English across all UI components, error states, and widgets.

---

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
