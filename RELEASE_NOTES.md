# DN Assistant 0.3.2 - The Performance & Experience Engine Update ⚡

## Tiếng Việt (Vietnamese)

Phiên bản **0.3.2** tập trung tối ưu hóa chuyên sâu toàn diện về **Hiệu năng hệ thống (Performance)**, **Kiến trúc tải mô-đun (Code-Splitting)** và **Nâng tầm trải nghiệm người dùng (UX)**, mang lại tốc độ khởi chạy tức thì, mượt mà ở mức 120fps và tiết kiệm tối đa tài nguyên phần cứng.

### 🌟 Cải tiến & Tối ưu hóa nổi bật:

1. **Kiến trúc Tải Mô-đun & Giảm 77.5% Dung lượng Initial Bundle**:
   - Chuyển đổi toàn bộ 21 trang thứ cấp sang cơ chế **React Code-splitting (Lazy Loading)** với `React.lazy()` và `<Suspense>`.
   - Dung lượng gói JavaScript khởi đầu (`index.js`) giảm mạnh từ **1,122.62 kB** xuống chỉ còn **252.42 kB** (76.7 kB sau khi nén gzip).
   - Tách các thư viện nền tảng thành vendor chunks ổn định (`vendor-react`, `vendor-radix`, `vendor-tauri`) giúp webview cache vĩnh viễn và triệt tiêu hoàn toàn các cảnh báo bundle kích thước lớn.
   - Thêm component khung xương tải trang thanh lịch **PageSkeleton** với hiệu ứng shimmer tiệp màu với Accent Theme đang chọn, loại bỏ 100% hiện tượng giật nháy layout khi chuyển tab.

2. **Khởi động Widget Nổi Siêu Tốc (Giảm 99.6% dung lượng nạp)**:
   - Các cửa sổ tiện ích nổi trên màn hình Desktop (`WidgetPage`: Ghi chú tạm Sticky Note, Đồng hồ, Bộ đếm tập trung Focus, Giám sát CPU) nay chỉ cần tải chunk độc lập **4.13 kB** thay vì phải nạp toàn bộ 1.12 MB của ứng dụng.
   - Cô lập hoàn toàn cửa sổ widget khỏi các background worker của cửa sổ chính, giúp widget khởi động trong chớp mắt và tiêu tốn cực ít RAM.

3. **Tối ưu hóa Tài nguyên Đồ họa (Giảm 96.5% kích thước Logo)**:
   - Thay thế tệp ảnh logo chưa nén 659.7 KB bằng phiên bản icon sắc nét tối ưu 23.0 KB, tiết kiệm hơn 630 KB dung lượng bộ nhớ.

4. **Sửa lỗi Quan trọng: Bắt Lịch sử Clipboard Toàn Cục (Global Clipboard Watcher)**:
   - Trích xuất việc lắng nghe sự kiện IPC `clipboard-changed` từ cấp thẻ giao diện ra thành hook toàn cục `useClipboardWatcher`.
   - Khắc phục hoàn toàn lỗi lịch sử clipboard không ghi nhận khi người dùng chuyển sang trang khác; đảm bảo mọi nội dung văn bản và hình ảnh sao chép ngoài desktop đều được ghi nhận liên tục vào cơ sở dữ liệu SQLite.

5. **Triệt tiêu Render lặp mỗi giây trên Trang Chủ (HomePage)**:
   - Tách riêng component đồng hồ Bento `HomeClockCard` tự quản lý chu kỳ đếm giây độc lập.
   - Giữ cho toàn bộ các thẻ Bento còn lại (Agenda, Lịch sự kiện, Thống kê hệ thống CPU/RAM, Thời tiết, Danh sách việc cần làm Todo, Ghi chú Notes, Chuỗi TikTok, Thói quen Habits) hoàn toàn tĩnh, giảm hơn 95% mức sử dụng CPU lúc nghỉ (idle).

6. **Loại bỏ gián đoạn I/O khi gõ Scratchpad**:
   - Ô nhập Scratchpad trên Trang Chủ và Widget Sticky Note áp dụng local state với cơ chế tự động lưu debounce 400ms.
   - Bộ quản lý cài đặt `settings.ts` bổ sung hàng đợi debounce 350ms khi lưu tệp `settings.json`, chấm dứt hoàn toàn hiện tượng nghẽn I/O ổ đĩa và lag bàn phím khi gõ văn bản nhanh.

7. **Bộ nhớ đệm Thời tiết 10 phút (In-Memory Weather Cache)**:
   - Bổ sung bộ nhớ đệm 10 phút cho API thời tiết `fetchWeather`. Chuyển đổi qua lại giữa Trang Chủ, tab Thời tiết và các phân hệ khác phản hồi tức thì (<1ms), không bị chớp giật giao diện và không lãng phí hạn ngạch gọi mạng.

8. **Điều tiết Timer & Background Polling**:
   - Cơ chế tự động khóa kho mật khẩu `useVaultAutoLock` được throttle sự kiện chuột `mousemove` tối đa 1 lần mỗi 4 giây, xóa bỏ hàng trăm lời gọi timer thừa mỗi giây khi di chuột.
   - Điều tiết chu kỳ polling SQLite định kỳ của bộ nhắc lịch hẹn và chuỗi TikTok lên 60 giây, giảm thiểu tần suất truy vấn cơ sở dữ liệu nền.
   - Bổ sung keyframes CSS `.page-enter` được tăng tốc phần cứng (GPU) cho hiệu ứng chuyển tab êm ái, mượt mà.

---

## English

Release **0.3.2** delivers a comprehensive architectural upgrade focused on **High Performance**, **Modular Code-Splitting**, and **Polished User Experience (UX)** — ensuring instantaneous launch, 120fps fluid responsiveness, and minimal hardware resource footprints.

### 🌟 Key Improvements & Optimizations:

1. **Modular Architecture & 77.5% Initial Bundle Reduction**:
   - Converted all 21 secondary views to on-demand **React Code-Splitting** using `React.lazy()` and `<Suspense>`.
   - Entry JavaScript bundle (`index.js`) plummeted from **1,122.62 kB** down to **252.42 kB** (76.7 kB gzipped).
   - Extracted stable core vendor chunks (`vendor-react`, `vendor-radix`, `vendor-tauri`) for permanent webview caching and eliminated large chunk warnings.
   - Introduced **PageSkeleton** shimmer placeholders styled to match the active accent theme, eliminating layout shifts during route transitions.

2. **Ultra-Fast Widget Startup (99.6% Load Reduction)**:
   - Floating desktop widgets (`WidgetPage`: Sticky Note, Clock, Focus Timer, CPU Monitor) now load an isolated **4.13 kB** chunk instead of the full 1.12 MB application.
   - Background main-window worker hooks are bypassed in widget mode for instant launch and negligible memory usage.

3. **Asset Optimization (96.5% Smaller Logo)**:
   - Replaced the uncompressed 659.7 KB logo file with an optimized 23.0 KB retina-ready asset, saving over 630 KB in bundle and memory.

4. **Critical Fix: System-Wide Clipboard History Tracking**:
   - Extracted `clipboard-changed` IPC listening into an application-wide `useClipboardWatcher` hook.
   - Solved the issue where clipboard history stopped recording when navigating away from the Clipboard view; all text and image clips are now reliably captured into SQLite throughout the entire session.

5. **Eliminated Idle 1-Second Re-Renders on Dashboard**:
   - Isolated the 1-second clock timer into a dedicated `HomeClockCard` component.
   - The remaining Bento dashboard widgets (Agenda, CPU/RAM Stats, Weather, Todos, Notes, TikTok Streaks, Habits) remain completely static, reducing idle CPU usage by over 95%.

6. **Lag-Free Scratchpad Typing with Debounced Disk I/O**:
   - Scratchpad on both Dashboard and Floating Sticky Note now uses local state with a 400ms debounced autosave.
   - Added a 350ms disk write debounce queue for `settings.json`, eliminating disk I/O thrashing and keyboard latency during rapid typing.

7. **10-Minute In-Memory Weather Cache**:
   - Added a 10-minute cache with TTL in `fetchWeather`. Switching between Dashboard, Weather, and other tabs responds in under 1ms with zero layout flicker and no redundant API requests.

8. **Throttled Timers & Background Polling**:
   - Vault auto-lock `mousemove` listener is throttled to once every 4 seconds, stopping hundreds of redundant timer allocations per second.
   - Relaxed background event and TikTok streak reminder polling intervals to 60 seconds.
   - Added GPU-accelerated `.page-enter` CSS keyframes for silky-smooth tab navigation.

---

# DN Assistant 0.3.1 - The Currency & Developer Toolkit Update ⚡

## Tiếng Việt (Vietnamese)

Phiên bản **0.3.1** nâng cấp chuyên sâu cho 2 phân hệ công cụ cốt lõi: **Đổi tiền tệ (Currency)** và **Công cụ lập trình (Dev Tools)** với hàng loạt tính năng cao cấp, trực quan và tiện dụng.

### 🌟 Tính năng mới nổi bật:

1. **Phân hệ Đổi tiền tệ (Advanced Currency Suite)**:
   - **Bộ chọn tiền tệ tìm kiếm thông minh**: Hiển thị cờ quốc gia (🇺🇸, 🇻🇳, 🇪🇺, 🇯🇵,...), ký hiệu tiền tệ ($, ₫, €, ¥,...), mã ISO và tên đầy đủ song ngữ (Việt - Anh).
   - **Bảng theo dõi đa tiền tệ (Watchlist)**: Quy đổi đồng thời ra 10+ đồng tiền lớn trên thế giới trong một bảng tổng hợp, hỗ trợ thêm/bớt đồng tiền yêu thích.
   - **Công cụ tính phí & chênh lệch chuyển đổi (Fee & Spread Calculator)**: Tính phí thẻ tín dụng / ngân hàng quốc tế (0%, 1.5%, 2.5%, 3.5% hoặc tùy chỉnh), hiển thị số tiền thực nhận và tỷ giá thực tế sau phí.
   - **Phím chọn nhanh số tiền**: Thanh bấm số tiền thông minh theo thang mệnh giá (`50k`, `100k`, `500k`, `1M`, `5M`, `10M` hoặc `10`, `50`, `100`, `500`, `1k`), các phím toán học `×10`, `÷10`, `+100k`, `Clear`.
   - **Bảng quy đổi mốc chuẩn hai chiều**: Tra cứu nhanh 1, 5, 10, 25, 50, 100, 500, 1.000 giữa 2 đồng tiền.
   - **Nhận diện ngôn ngữ tự nhiên trong Command Palette**: Hỗ trợ ký hiệu (`$100 to vnd`, `€50 to usd`) và số lượng viết tắt (`500k vnd to usd`, `2tr vnd sang jpy`).

2. **Phân hệ Công cụ lập trình (Comprehensive DevTools Suite)**:
   - **JSON**: Thêm tính năng **Minify JSON**, **JSON to TypeScript Interface / Type Generator**, **Escape / Unescape JSON String**.
   - **Base64**: Thêm chuyển đổi **File / Ảnh sang Base64 (Data URI)** kèm xem trước ảnh, kích cỡ file và tải ảnh về.
   - **URL**: Trình **URL Inspector** & **Query Parameters Editor** trực tiếp chỉnh sửa, thêm, xóa tham số và tái tạo link động.
   - **JWT**: Trình **Token Status** giám sát thời hạn token (Active / Expired với đếm ngược thời gian hết hạn), phân tích Header/Payload/Claims.
   - **Hash & HMAC**: Thêm thuật toán **MD5** thuần JS tốc độ cao, **SHA-1/256/512**, chế độ **HMAC với Secret Key**, tùy chọn chữ hoa/thường.
   - **UUID & NanoID**: Sinh UUID v4/v7, **Batch Generator** (sinh 5 - 50 UUID hàng loạt, tùy chọn bỏ gạch ngang, chữ hoa, dấu `{}`), và bộ sinh **NanoID / Short ID**.
   - **QR Code**: Tải ảnh PNG trực tiếp, bổ sung preset tạo **Mã QR WiFi** (SSID, Password, WPA2) tự động.
   - **Regex**: Kho **Regex mẫu thông dụng** (Email, URL, IPv4, Phone, Hex, Date,...), tính năng **Regex Replace** với `$1, $2`.
   - **Time**: Timestamp mili-giây / giây, thời gian tương đối, bảng giờ thế giới (UTC, ICT, JST, GMT, EST, PST).
   - **Diff**: Giao diện so sánh trực quan, đổi chỗ A ↔ B, bỏ qua khoảng trắng thừa.
   - **Tab mới - Code & Text Utilities**: Ký tự HTML Entities (Encode/Decode), Đơn vị CSS (px ↔ rem ↔ em ↔ pt), Chuyển đổi kiểu chữ (camelCase, snake_case, PascalCase, CONSTANT_CASE, v.v.), Trình tạo văn bản mẫu Lorem Ipsum.

---

## English

Release **0.3.1** introduces a major upgrade to the **Currency** and **Developer Tools** modules, bringing professional-grade utilities to your desktop.

### 🌟 Key Highlights:

1. **Advanced Currency Suite**:
   - Searchable currency combobox with national flags, currency symbols, and bilingual names.
   - Multi-currency comparison watchlist: convert the current amount across 10+ major world currencies simultaneously with local storage persistence.
   - Fee & Spread Calculator: calculate international credit card / bank exchange fees (0%, 1.5%, 2.5%, 3.5%, or custom %) and view net received amounts with effective exchange rates.
   - Quick amount preset chips and multiplier actions (`×10`, `÷10`, `+100k`, `Clear`).
   - Two-way reference matrix for 1, 5, 10, 25, 50, 100, 500, 1,000 units.
   - Natural language command queries in Command Palette (`$100 to vnd`, `500k vnd to usd`, `2tr vnd to jpy`).

2. **Comprehensive DevTools Suite**:
   - **JSON**: Minify / compact JSON, JSON to TypeScript interface generator, and escape/unescape string tools.
   - **Base64**: File and image to Base64 (Data URI) with live image preview and download.
   - **URL**: Interactive URL inspector and real-time query parameter editor.
   - **JWT**: Token status inspection with active/expired badges and live expiration countdown.
   - **Hash & HMAC**: Pure JS MD5 algorithm, SHA-1/256/512, and HMAC generation with secret keys.
   - **UUID & NanoID**: Batch UUID generation (5-50 IDs with uppercase, no-hyphen, and braces options) plus custom-length NanoID.
   - **QR Code**: WiFi network presets (SSID, Password, Encryption) and instant high-res PNG download.
   - **Regex Tester**: Common regex presets library (Email, URL, IP, Phone, Hex, Date, Slug) and regex string replacement.
   - **Time & Timestamps**: Milliseconds/seconds toggle, friendly local datetime, relative time, and major world timezones preview.
   - **Diff Viewer**: Side-by-side comparison with swap and whitespace toggle.
   - **New Utilities Tab**: HTML Entities encoder/decoder, CSS units converter (px/rem/em/pt), text case switcher, and Lorem Ipsum generator.

---

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
