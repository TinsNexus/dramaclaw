# DramaHub — Sổ tay sử dụng sản phẩm (bản mã nguồn mở / CE) — tiếng Việt

> Dịch từ: [DramaClaw 产品使用手册（开源版）](https://neo-flying.feishu.cn/docx/JGNTdsjJuo748TxJkxecoYs2nth) — v1.0, cập nhật 06/2026
> **CE — Bản mã nguồn mở** | Dùng cục bộ đơn máy & triển khai riêng (self-host)
> *Make Your Own DC. — Nền tảng sản xuất công nghiệp hóa nội dung AIGC*

**Về thuật ngữ:** Toàn bộ tên module, nút bấm và khái niệm trong tài liệu này được lấy trực tiếp từ file i18n của sản phẩm — `frontend/public/locales/vi/translation.json` (đối chiếu key với `zh`) — để khớp đúng những gì hiển thị trên giao diện tiếng Việt. Xem [Bảng thuật ngữ](#bảng-thuật-ngữ-đối-chiếu-với-i18n) ở cuối.

**Về phiên bản:** Đây là bản dịch của **manual bản mã nguồn mở (CE)** — khớp với repo này (chạy cục bộ/self-host). Bản CE **không có** đăng nhập tài khoản, chia sẻ dự án, phân quyền theo vai trò (RBAC) hay cộng tác đa người dùng qua cloud; mọi thứ chạy ở chế độ đơn người dùng trên máy cục bộ. (Bản thương mại/cloud có thêm các tính năng đó là tài liệu riêng.)

**Về tên sản phẩm:** Manual gốc trên Feishu mang tên *DramaClaw*; repo/locale (`vi`/`en`/`zh`) dùng **DramaHub** — bản dịch này theo tên **DramaHub**.

> ℹ️ *Ghi chú biên dịch:* các chương mô tả module (Ch.1, 3–10, 12) khớp nguyên văn bản thương mại đã dịch; các mục đặc thù CE (Ch.2 khởi động cục bộ & chế độ đơn người dùng, Ch.11 dùng cục bộ/nhóm nhỏ) đã được viết lại theo bản CE. Mục 2.4 và Ch.11 nên rà lại nhẹ với bản gốc khi tiện (doc nguồn bị treo khi trích, không lấy được toàn văn 2 mục này).

---

## PHẦN I — TÓM TẮT NHANH (đọc trong 3 phút)

### DramaHub là gì
Nền tảng sáng tạo AI cho **phim ngắn (short drama), phim hoạt hình ngắn, video review tiểu thuyết, phim thuyết minh**. Điểm khác biệt: không phải "công cụ sinh ảnh đơn lẻ" mà là **dây chuyền sản xuất theo dự án** — quản lý được từ văn bản gốc tới thành phẩm.

### Luồng chính cần nhớ
```
Văn bản  →  Tài sản  →  Kịch bản  →  Beat  →  Video  →  Thành phẩm
```
| Bước | Văn bản | Tài sản | Kịch bản → Beat → Video | Thành phẩm |
|---|---|---|---|---|
| Module | Story Source | Asset Library | Episode Studio | Dựng video |

Nguyên tắc vàng: **Văn bản quyết định câu chuyện, tài sản quyết định độ ổn định, Beat quyết định biểu đạt, xuất bản quyết định bàn giao.**

### 7 module chính (tên trong sidebar tiếng Việt)

| Module | Gốc 中文 | Vai trò |
|---|---|---|
| **Story Source** *(Nguồn truyện)* | 虾料 | Nhập tiểu thuyết/kịch bản, chọn thể loại & phong cách |
| **Asset Library** | 虾塘 | Kho tài sản: Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc |
| **Episode Studio** | 虾镜 | Bàn làm việc chính: Kịch bản → Beat → Dựng video |
| **Freezone** | 虾画 | Canvas vô hạn, tinh chỉnh sâu các Beat then chốt |
| **Xia Director** | 虾导 | Trợ lý AI: hỏi tiến độ, gợi ý bước tiếp theo |
| **Visual Style** | 虾格 | Mẫu phong cách hình ảnh của dự án |
| **Task Center** *(Trung tâm tác vụ)* | 虾条 | Tác vụ nền: trạng thái, log, huỷ/xoá |

### Hai con đường sáng tạo
1. **Luồng chính (cho người mới / sản xuất hàng loạt):** Story Source → Asset Library → Episode Studio → Dựng video. Quy trình cố định, ổn định, dễ theo dõi.
2. **Canvas tự do (cho đạo diễn / team có kinh nghiệm):** dùng Freezone, không bị ràng buộc thứ tự, tự do kết hợp ảnh/video/âm thanh/kịch bản/Toàn cảnh 360/Director World.
   > Dự án thực tế thường **kết hợp cả hai**: Beat đơn giản đi Episode Studio, Beat khó vào Freezone.

### 3 khái niệm dễ nhầm — cần nắm chắc
- **Nhân vật vs. Danh tính / tạo hình:** Nhân vật = "người này là ai"; Danh tính/tạo hình = "ở giai đoạn này mặc gì, trạng thái gì" (đồ hiện đại / đồ công chúa / đồ rách nát sau trận chiến). **Không tạo Nhân vật mới cho mỗi bộ đồ.**
- **Biến thể bối cảnh (plate):** cùng một địa điểm ở trạng thái khác nhau (cung điện lúc bình thường vs. sau chiến tranh). Kế thừa cấu trúc không gian, chỉ chồng thêm khác biệt.
- **Ghi về luồng chính:** Kết quả trong Freezone **mặc định chỉ là Ứng viên**, không tự động ghi đè. Chỉ khi bấm *ghi về* và chọn **ô đích** thì mới vào tài sản chính thức.

### Cảnh báo quan trọng
- **Thứ tự:** Nếu Lời thoại / Nhân vật / Bối cảnh / Khung đầu sai thì video sinh ra cũng sai. **Đừng vội tạo video** — kiểm tra tài sản và Kịch bản trước.
- **Thể loại dự án bị khoá sau khi nhập** — muốn đổi thường phải nhập lại hoặc tạo dự án mới.
- **Ghi về tài sản toàn cục** (Nhân vật/Bối cảnh/Đạo cụ) có thể ảnh hưởng nhiều Beat cùng lúc.

---

## PHẦN II — BẢN DỊCH ĐẦY ĐỦ

### Mục lục
1. Nhận biết DramaHub
2. Khởi động cục bộ, quản lý dự án và thiết lập cơ bản
3. Hai con đường sáng tạo
4. Chạy thông một Tập đầu tiên
5. Story Source — Nhập tiểu thuyết/kịch bản
6. Asset Library — Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc
7. Director World và 3GS
8. Episode Studio — Kịch bản, Beat, Dựng video
9. Freezone — Canvas vô hạn và sáng tạo chuyên sâu
10. Xia Director, Visual Style, Task Center
11. Khuyến nghị dùng cục bộ đơn máy & nhóm nhỏ
12. Kiểm tra chất lượng và câu hỏi thường gặp

---

## Chương 1: Nhận biết DramaHub

DramaHub là nền tảng sáng tạo AI hướng tới nhiều thể loại video: phim ngắn AI, phim hoạt hình ngắn, video review tiểu thuyết, phim thuyết minh.

Nền tảng chia quá trình sáng tạo thành quy trình dự án có thể quản lý được: **trước tiên thiết lập nguồn văn bản, sau đó tích luỹ tài sản tái sử dụng được, tiếp theo tạo Kịch bản và Beat, cuối cùng dựng thành phim.**

Với người dùng lần đầu, điều quan trọng nhất không phải nhớ từng nút bấm, mà là hiểu luồng chính này:

> **Văn bản quyết định câu chuyện, tài sản quyết định độ ổn định, Beat quyết định biểu đạt, xuất bản quyết định bàn giao.**

Beat thông thường có thể đẩy ổn định theo luồng chính; Beat phức tạp có thể vào Freezone, Director World hoặc 3GS để khám phá chi tiết hơn.

**Hiểu trong một câu:** Trước tiên biến văn bản thành dự án quản lý được, sau đó sắp xếp Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc thành tài sản, cuối cùng tạo Kịch bản, Beat, Âm thanh, Video theo từng Tập và dựng thành phim.

### 1.1 DramaHub có thể làm gì

| Mục tiêu sáng tạo | Người dùng phù hợp | Lộ trình đề xuất |
|---|---|---|
| Phim thuyết minh / review tiểu thuyết | Team làm review tiểu thuyết, team phim ngắn, cá nhân | Story Source nhập tiểu thuyết → Asset Library xác nhận tài sản → Episode Studio tạo Kịch bản & Beat → Dựng video & xuất |
| Phim tinh phẩm / phim ngắn chất lượng cao | Team phim ngắn cao cấp, team video AI, người cần tinh chỉnh Beat | Hoàn thiện tài sản Asset Library trước → Episode Studio đẩy luồng chính → Beat then chốt vào Freezone tinh chỉnh → quay lại Episode Studio dựng |
| Video quảng cáo / đào tạo giáo dục | Team marketing nội dung, blogger tri thức trả phí | Story Source nhập kịch bản → Asset Library xác nhận tài sản → vào Freezone thêm Node tham chiếu tài sản → tạo ảnh/video/âm thanh → xuất & dựng |
| Sản xuất cộng tác nhóm | Team B2B, MCN, studio | Trung tâm quản lý dự án chia sẻ dự án → nhiều người phân công xử lý tài sản, Kịch bản, Beat, QC & dựng |

---

## Chương 2: Khởi động cục bộ, quản lý dự án và thiết lập cơ bản

### 2.1 Khởi động cục bộ và vào dự án
1. Khởi động DramaHub CE theo hướng dẫn triển khai mã nguồn mở.
2. Mở địa chỉ truy cập cục bộ; hệ thống mặc định vào không gian làm việc **đơn người dùng trên máy này**.
3. CE **không bật** đăng nhập, mật khẩu, phiên, tài khoản/ảnh đại diện hay giới hạn tần suất đăng nhập; `auth_required=false`.
4. Bấm vào dự án có sẵn để vào bàn làm việc, hoặc bấm **"Tạo dự án mới"** để bắt đầu Tập phim mới.

### 2.2 Trung tâm quản lý dự án
Trung tâm quản lý dự án là cổng vào của mọi tác phẩm. Mỗi dự án là một không gian độc lập, bao gồm văn bản, Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc, Tập, Beat, video và kết quả dựng/xuất.

- Xem dự án theo: Đang thực hiện / **Lưu trữ** / **Thùng rác**.
- Sắp xếp theo thời gian cập nhật hoặc tên — phù hợp team nhiều dự án cần định vị nhanh.
- **Đề xuất đặt tên: `Tên tác phẩm_Đợt_Người phụ trách`.**
- Dự án có thể Lưu trữ, chuyển vào Thùng rác, khôi phục hoặc xoá vĩnh viễn; **trước khi xoá vĩnh viễn hãy xác nhận phạm vi ảnh hưởng.**

> **📋 Vì sao nên thống nhất quy tắc đặt tên dự án:**
> Khi team đồng thời test nhiều dự án, nếu chỉ dùng tên kiểu "Test 1", "Dự án mới" thì về sau rất khó biết nội dung, người phụ trách và phiên bản.
> Nên dùng `Tên tác phẩm_Đợt_Người phụ trách`, ví dụ `TEST_EP01_Eric` — dễ định vị trong Trung tâm quản lý dự án, Trung tâm tác vụ và khi trao đổi nhóm.

### 2.3 Chế độ đơn máy — đơn người dùng (CE)
DramaHub CE **chỉ giữ chế độ owner đơn người dùng trên máy cục bộ**. Người dùng hiện tại có toàn quyền thao tác với các dự án trên máy này.

- CE **không cung cấp**: chia sẻ dự án, mời thành viên, phân quyền theo vai trò, quản trị dự án xuyên người dùng và RBAC nhóm.
- Mọi dữ liệu dự án được quản lý trong phạm vi **dự án cục bộ**.
- Nếu cần nhiều người cùng làm: thống nhất phân công qua quy trình bên ngoài, rồi để owner trên máy tổng hợp và thực thi.

> **👥 Vì sao CE bỏ chia sẻ/phân quyền:**
> CE hướng tới chạy cục bộ/self-host đơn người dùng — đơn giản, không phụ thuộc tài khoản cloud. Các tính năng cộng tác theo tài khoản (chia sẻ, RBAC, quản trị đa người dùng) thuộc bản thương mại/cloud.

### 2.4 Dùng lượng cục bộ và giới hạn sinh nội dung
Thanh trên cùng có thể hiển thị thông tin dùng lượng của model gateway đang cấu hình; một số nút tạo nội dung hiển thị mức tiêu hao dự kiến. Không thuộc luồng sáng tạo chính, nhưng giúp ước lượng trước khi tạo ảnh/video/lồng tiếng/dựng hàng loạt.

- CE là bản self-host: chi phí và giới hạn phụ thuộc **model gateway / API key bạn tự cấu hình** (không có hệ thống Điểm trả phí như bản cloud).
- Tạo ảnh, video, TTS, nhạc, kịch bản văn bản… có thể hiển thị mức tiêu hao dự kiến tuỳ nhà cung cấp model.
- Khi nhà cung cấp báo hết hạn mức hoặc lỗi khoá, tác vụ tạo nội dung sẽ dừng — kiểm tra cấu hình model gateway / API key trong phần Cài đặt.

> *(Mục này bị treo khi trích từ doc nguồn — nội dung trên viết theo định vị CE; nên rà lại nhẹ với bản gốc khi tiện.)*

### 2.5 Piko / Bạn đồng hành
Piko dùng để tăng phản hồi thao tác và cảm giác đồng hành, **không thay đổi chức năng tạo nội dung và luồng chính**. Có thể hiểu là trợ lý nhắc việc nhẹ trên trang.

- Hình ảnh bạn đồng hành mặc định là Piko, có thể đổi trong thư viện hình tượng.
- Khi tác vụ chạy, thành công hoặc thất bại sẽ có bong bóng ngắn giúp bạn cảm nhận trạng thái nền.
- Có thể kéo thả vị trí, tuỳ chọn được lưu trong trình duyệt hiện tại.
- Động tác, xem trước dịp lễ, xem trước Đạo cụ là tính năng cá nhân hoá, không ảnh hưởng kết quả tạo nội dung.

---

## Chương 3: Hai con đường sáng tạo

DramaHub có thể sử dụng theo hai lộ trình:
- **Luồng chính** — phù hợp người mới hoặc cần sản xuất công nghiệp hàng loạt, đảm bảo sản xuất ổn định.
- **Canvas vô hạn tự do** — phù hợp đạo diễn, người sáng tạo lâu năm hoặc team, phục vụ khám phá tự do.

Dự án chính thức thường **kết hợp cả hai**: Beat đơn giản đi Episode Studio, Beat khó vào Freezone.

### 3.1 Luồng chính cho người mới
Người chưa có kinh nghiệm làm phim nên đi theo luồng **Story Source → Asset Library → Episode Studio → Dựng video**. Hệ thống sẽ tổ chức văn bản, tài sản, Kịch bản, Beat, video thành quy trình cố định, giảm tình trạng không biết bước tiếp theo làm gì.

| Bạn muốn làm gì | Vào module | Mô tả một câu |
|---|---|---|
| Tải tiểu thuyết/kịch bản lên | **Story Source** | Cổng nội dung dự án: tải lên/dán văn bản, chọn thể loại dự án & phong cách cơ bản, tạo xem trước cấu trúc |
| Quản lý Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc | **Asset Library** | Kho tài sản dự án, quyết định độ ổn định của các bước tạo nội dung sau |
| Lên kế hoạch tập, tạo Kịch bản, làm Beat, dựng video | **Episode Studio** | Bàn làm việc chính hay dùng nhất, đẩy theo "Kịch bản → Beat → Dựng video" |
| Xem tác vụ nền | **Task Center** | Theo dõi, huỷ, xử lý sự cố tác vụ tạo nội dung |

### 3.2 Luồng Canvas tự do cho đạo diễn/team
Với đạo diễn, biên kịch, người làm phân cảnh hoặc team video AI có kinh nghiệm, có thể dùng Canvas vô hạn **Freezone** để sáng tạo tự do hơn.

Freezone không bị ràng buộc chặt bởi quy tắc luồng chính — có thể tự do kết hợp ảnh, video, âm thanh, kịch bản, Toàn cảnh 360, Director World và Node kỹ năng để khám phá bất kỳ Beat nào bạn muốn.

> **Hiểu quan trọng:** Luồng chính giống "dây chuyền sản xuất", phù hợp đẩy ổn định; Freezone giống "bàn làm việc của đạo diễn", phù hợp khám phá tự do.
> Team có thể cùng sáng tạo chung trong một dự án: người phụ trách một Tập, người tạo ảnh, người làm video, người làm Bối cảnh & Đạo cụ.
> Tài sản đã xác nhận trong Freezone sẽ được **ghi về luồng chính**; đạo diễn hoặc người phụ trách vẫn thấy tiến độ dự án và tổng tài sản trong Episode Studio.

| Bạn muốn làm gì | Cổng vào đề xuất | Diễn giải |
|---|---|---|
| Tạo tự do / sửa Beat then chốt | **Freezone** | Không giới hạn thứ tự luồng chính; dùng đa Node, đa tham chiếu, đa phiên bản để khám phá Beat; cũng dùng để tinh chỉnh Beat từ Episode Studio |
| Đưa kết quả Canvas tự do vào dự án chính thức | **Freezone ghi về luồng chính** | Ghi kết quả Ứng viên về Nhân vật, Bối cảnh, Đạo cụ, Phác thảo Beat, Ảnh render/Khung đầu hoặc video |
| Thống nhất phong cách hình ảnh | **Visual Style** | Thiết lập mẫu phong cách dự án, Prompt và chỉ thị loại trừ trước khi sáng tạo |
| Để AI hỗ trợ xem tiến độ hoặc đẩy tác vụ | **Xia Director** | Tra tiến độ, kiểm tra thiếu sót, gợi ý bước tiếp; cũng dùng được ở panel bên phải trong Freezone |

---

## Chương 4: Chạy thông một Tập đầu tiên

Chương này là lộ trình ngắn nhất. **Lần đầu không cần mọi Beat hoàn hảo** — chỉ cần cốt truyện hiểu được, Nhân vật không lộn xộn rõ rệt, âm thanh & video dựng xuất được là đã coi như chạy thông. Hoàn thành vòng khép kín trước, rồi nâng dần chất lượng hình ảnh.

1. **Tạo dự án:** Vào Trung tâm quản lý dự án, bấm "Tạo dự án mới".
2. **Tải kịch bản lên:** Vào **Story Source**, chọn thể loại dự án, tải kịch bản lên, kiểm tra không lỗi rồi bắt đầu nhập.
3. **Thiết lập tài sản:** Vào **Asset Library**, trích xuất tự động hoặc tạo thủ công Nhân vật, Bối cảnh, Đạo cụ, và cấu hình Giọng đọc.
4. **Lên kế hoạch tập:** Vào **Episode Studio**, bấm **"Lên kế hoạch tập"**, lên kế hoạch Danh tính, Bối cảnh và Đạo cụ cho Tập mục tiêu.
5. **Tạo Kịch bản:** Vào chi tiết một Tập, ở trang **Kịch bản** kiểm tra nguyên văn / bản sao nguyên văn, cần thì **AI viết lại**, rồi tạo Kịch bản.
6. **Làm Beat:** Vào trang **Beat**, xử lý từng Beat theo thứ tự: Lời thoại → Phác thảo → Ảnh render/Khung đầu → Âm thanh → Video.
7. **Dựng & xuất:** Vào trang **Dựng video**, xác nhận mọi Beat đã sẵn sàng, chọn Độ phân giải và tuỳ chọn Phụ đề, dựng thành phim và tải về.

> **⚠️ Nhắc về thứ tự:** Nếu Lời thoại, Nhân vật, Bối cảnh hoặc Khung đầu ở bước trước sai thì video ở bước sau thường cũng sai theo. **Đừng vội tạo video ngay từ đầu** — hãy kiểm tra kỹ tài sản và Kịch bản trước.

---

## Chương 5: Story Source — Nhập tiểu thuyết/kịch bản

Story Source (*Nguồn truyện*) là nguồn nội dung của dự án. Mọi dự án phim thuyết minh hoặc phim tinh phẩm đều cần thiết lập nguồn văn bản trước.

### 5.1 Tải file lên hoặc Dán văn bản
1. Vào dự án, bấm **Story Source** ở menu trái.
2. **Chọn thể loại dự án và phong cách:** Thể loại (phim tinh phẩm hoặc phim thuyết minh), phong cách hình ảnh (cổ trang, anime, v.v.), chủng tộc (hướng ngoại hình mặc định khi Nhân vật chưa được mô tả rõ). **Thể loại dự án sẽ bị khoá sau khi tải lên; muốn đổi thường phải nhập lại.**
3. Chọn **"Tải tiểu thuyết lên"** rồi kéo thả/bấm để tải file (hỗ trợ **txt, md, docx**); để test nhanh có thể chuyển sang **Dán văn bản**.
4. Kiểm tra cấu trúc văn bản đã phân tích: số chữ, đoạn, chương… xác nhận không lỗi rồi bấm **"Nhập"**.

> **📖 Cần chỉnh sửa nguyên văn trước khi nhập:**
> Story Source nhận diện chương, Nhân vật và mạch truyện dựa trên cấu trúc văn bản.
> Nếu tiêu đề lộn xộn, chương bị đứt đoạn hoặc có nhiều nội dung không liên quan, thì việc trích xuất Nhân vật, Lên kế hoạch tập và tách Kịch bản sau đó đều có thể bị ảnh hưởng.
> **Chỉnh tiêu đề chương và định dạng nội dung trước khi nhập thường tiết kiệm thời gian hơn nhiều so với sửa đi sửa lại sau khi nhập.**

**Mẹo — định dạng chuẩn để nhập:**
```
第X集  (Tập X)
1-X Bối cảnh: 【Trong/Ngoài  Địa điểm  Ngày/Đêm】
Nhân vật:
△ Mô tả khung hình: [Hành động rõ ràng, không tô vẽ thừa, mô tả thẳng]
Nhân vật A (biểu cảm/hành động): Nội dung lời thoại
△ Mô tả khung hình:
Nhân vật B (biểu cảm/hành động): Nội dung lời thoại
Nhân vật A OS: Nội dung độc thoại nội tâm
```

### 5.2 Kiểm tra sau khi nhập
Sau khi nhập xong, trang sẽ hiển thị bản xem trước cấu trúc tiểu thuyết: tên file, tổng số chữ, số chương phát hiện, số Tập dự kiến, cấu hình dự án và danh sách chương. Khi tác vụ nhập đang chạy còn hiển thị log.

| Mục kiểm tra | Xem thế nào | Có vấn đề thì làm gì |
|---|---|---|
| Tổng số chữ | Xác nhận khớp đại thể với nguyên văn | Chênh lệch lớn → kiểm tra file có đầy đủ/đúng không |
| Số chương phát hiện | Xác nhận số lượng và tiêu đề chương hợp lý | Nhận diện chương sai → chỉnh tiêu đề chương rồi nhập lại |
| Số Tập dự kiến | Có phù hợp độ dài nội dung và kế hoạch sản xuất không | Quá nhiều/quá ít → có thể điều chỉnh khi **Lên kế hoạch tập** trong Episode Studio |
| Cấu hình dự án | Xác nhận thể loại, phong cách hình ảnh, phong cách thuyết minh và nhóm người mặc định | Thể loại bị khoá sau khi nhập → phải nhập đè lại hoặc tạo dự án mới |

---

## Chương 6: Asset Library — Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc

Asset Library là kho tài sản của dự án, hiện gồm 4 tab: **Nhân vật, Bối cảnh, Đạo cụ, Giọng đọc**.

> Tài sản càng rõ ràng thì càng đỡ việc về sau; tài sản càng lộn xộn thì giai đoạn làm Beat càng dễ phải làm lại nhiều lần.

### 6.1 Quản lý Nhân vật
Tab Nhân vật quản lý các nhân vật trong dự án: thông tin cơ bản, chân dung, **Danh tính / tạo hình**, Giọng đọc, lịch sử tài sản.

1. Vào **Asset Library**, chuyển sang tab **Nhân vật**.
2. Nếu chưa có Nhân vật, bấm **"Trích xuất tự động"** để nhận diện Nhân vật từ knowledge graph; hoặc thêm thủ công.
3. Tìm/lọc Nhân vật ở menu trái, chọn Nhân vật rồi bổ sung: họ tên, biệt danh, định vị vai, giới tính, độ tuổi, vóc dáng, ngoại hình và Prompt khuôn mặt.
4. Ở khu vực chân dung, tạo hoặc tải lên chân dung Nhân vật và giữ lại phiên bản ưng ý.
5. Tạo **Danh tính / tạo hình** cho các giai đoạn cốt truyện, trang phục hoặc độ tuổi khác nhau.
   *(Lưu ý: cũng có thể vào Episode Studio, sau khi Lên kế hoạch tập thì bấm **"Lên kế hoạch danh tính"** để AI tự nhận diện Danh tính/tạo hình trong Tập.)*
6. Ở khu vực giọng nói: tải lên, ghi âm hoặc cắt Giọng đọc Nhân vật.
7. Khi cần tinh chỉnh, bấm cổng vào **Freezone** tương ứng để vào Canvas tài sản.

| Trường / Nút | Tác dụng | Gợi ý cho người mới |
|---|---|---|
| Họ tên / Biệt danh | Khớp cách gọi trong nguyên văn và tham chiếu trong Beat | Ghi đủ các biệt danh thường gặp, tránh một Nhân vật bị tách thành nhiều người |
| Prompt khuôn mặt | Ảnh hưởng độ ổn định của chân dung và ảnh Danh tính | Ghi tuổi, dáng mặt, ngũ quan, kiểu tóc, khí chất — **không chỉ ghi trang phục** |
| Danh tính / tạo hình | Kiểm soát trang phục & hình tượng ở các giai đoạn cốt truyện | Khi trang phục thay đổi rõ rệt thì tạo Danh tính mới (hoặc để AI nhận diện), đừng chỉ sửa mô tả Nhân vật |
| Lịch sử | Thuận tiện rollback về tài sản ưng ý | Sau nhiều lần tạo, kịp thời khôi phục hoặc đánh dấu phiên bản dùng được |

> **👗 Phân biệt Nhân vật và Danh tính / tạo hình:**
> Nhân vật là **"người này là ai"**; Danh tính/tạo hình là **"người này ở giai đoạn nào mặc gì, trạng thái ra sao"**. Ví dụ cùng một nữ chính có thể có đồ hiện đại, đồ công chúa, đồ rách nát sau trận chiến.
> **Đừng tạo Nhân vật mới cho mỗi bộ trang phục**, nếu không các Beat về sau rất khó giữ nhất quán nhân vật.

### 6.2 Quản lý Bối cảnh
Tab Bối cảnh quản lý địa điểm và không gian nơi câu chuyện diễn ra. Tài sản Bối cảnh hiện không chỉ gồm mô tả văn bản, mà còn có **Ảnh gốc, Mặt sau, Toàn cảnh 360, Director World, và Biến thể bối cảnh** của cùng một địa điểm. Phim tinh phẩm và phim dài tập đặc biệt cần chú trọng tài sản Bối cảnh.

1. Vào **Asset Library**, chuyển sang tab **Bối cảnh**.
2. Bấm **"Dựng từ knowledge graph"** để trích xuất Bối cảnh tự động, hoặc **"Tạo bối cảnh mới"** để tạo thủ công.
3. Điền tên, loại, Prompt mô tả môi trường và mô tả dạng tường thuật cho Bối cảnh.
4. Bối cảnh cốt lõi nên ưu tiên bổ sung **Ảnh gốc**; khi cần quay đối diện (chính/phản) hoặc đổi góc thì bổ sung **Mặt sau**; địa điểm xuất hiện lặp lại thì nên tạo **Toàn cảnh 360** hoặc **Director World**.
5. Nếu cùng một địa điểm có nhiều trạng thái khác nhau, dùng **"Thêm biến thể bối cảnh"** để tạo **Biến thể bối cảnh**, thể hiện "cùng một địa điểm ở trạng thái khác nhau". Ví dụ: đại điện hoàng cung bình thường thì lộng lẫy, sau chiến tranh thì đổ nát; phố nhỏ ở Tập 3 là chợ ngày nắng, Tập 8 thì tuyết rơi lớn.
6. Khi cần nhất quán không gian, tạo hoặc tải lên **Director World**, rồi vào **"Mở Director World"** để lấy khung hình, đặt Nhân vật/Đạo cụ/vật thế chỗ *(chi tiết ở Chương 7)*.

### 6.3 Quản lý Đạo cụ
Tab Đạo cụ quản lý các vật thể then chốt xuất hiện lặp lại hoặc thúc đẩy cốt truyện. Đạo cụ có thể được tham chiếu từ Beat, cũng có thể vào Freezone để tinh chỉnh.

1. Vào **Asset Library**, chuyển sang tab **Đạo cụ**.
2. Bấm **"Tạo đạo cụ mới"** để tạo vật thể, điền tên, loại, Nhân vật sở hữu và Prompt hình ảnh; khi cần AI phân tích Đạo cụ thì phải trích xuất theo Tập trong Episode Studio.
3. Bấm **"Tạo ảnh tham chiếu"** hoặc **"Tải đạo cụ lên"** để bổ sung ảnh tham chiếu.
4. Khi nhiều Đạo cụ thiếu ảnh tham chiếu, có thể dùng **"Tạo hàng loạt ảnh tham chiếu"** và xem tiến độ tác vụ trên trang.
5. Sau khi chọn **Đạo cụ xuất hiện** ở khu Lời thoại của Beat, các bước Phác thảo / Ảnh render / Video sau đó sẽ tham chiếu Đạo cụ tương ứng.

### 6.4 Quản lý Giọng đọc
Tab Giọng đọc quản lý **giọng thuyết minh** mặc định của dự án. Trong chi tiết Nhân vật cũng có thể duy trì Giọng đọc theo giọng mặc định và biến thể độ tuổi.

1. Vào **Asset Library**, chuyển sang tab **Giọng đọc**.
2. Phim thuyết minh ngôi thứ ba thường cấu hình giọng thuyết minh mặc định của dự án trước.
3. Phim thuyết minh ngôi thứ nhất cần đặt nhân vật chính thuyết minh trước, rồi vào phần quản lý Giọng đọc của Nhân vật đó để cấu hình giọng mặc định hoặc giọng theo Danh tính.
4. Giọng đọc hỗ trợ tải audio lên, ghi âm bằng trình duyệt và cắt.
5. **Nếu thiếu Giọng đọc hiện tại, việc lồng tiếng hàng loạt hoặc đối thoại Nhân vật có thể không tạo được bình thường.**

---

## Chương 7: Director World và 3GS

Phim thuyết minh thông thường có thể chỉ dùng Ảnh gốc và ít tham chiếu; nhưng nếu cùng một căn phòng, con phố, toa xe hay cung điện xuất hiện lặp đi lặp lại, thì nên dùng **Biến thể bối cảnh, Director World và 3GS** để kiểm soát tính nhất quán không gian.

### 7.1 Biến thể bối cảnh
Biến thể bối cảnh dùng để thể hiện "cùng một địa điểm trông như thế nào ở thời điểm hoặc trạng thái cốt truyện khác nhau". Ví dụ: văn phòng ban ngày, văn phòng ban đêm, cung điện sau chiến tranh, thị trấn ngày tuyết. Biến thể **treo dưới Bối cảnh gốc, kế thừa cấu trúc không gian, chỉ chồng thêm khác biệt trạng thái**.

> **🌲 Vì sao phải dùng Biến thể bối cảnh:** Nếu tạo một Bối cảnh độc lập cho mỗi trạng thái thì bố cục không gian và cấu trúc kiến trúc rất dễ không khớp nhau. Biến thể treo dưới Bối cảnh gốc, kế thừa cấu trúc và ảnh tham chiếu của Bối cảnh gốc, chỉ chồng thêm khác biệt — nên nhìn vào luôn thấy đó vẫn là cùng một nơi.

### 7.2 Director World
Director World có thể hiểu là **phim trường có thể lấy khung hình**. Nó giúp bạn cố định cấu trúc không gian, vị trí Nhân vật, vị trí Đạo cụ và vị trí máy quay; chất lượng mỹ thuật cuối cùng vẫn hoàn thành ở giai đoạn Phác thảo, Khung đầu và Video.

| Tầng | Chịu trách nhiệm gì | Không chịu trách nhiệm gì |
|---|---|---|
| Bối cảnh / Biến thể | Danh tính địa điểm, thời đại, không khí, khác biệt trạng thái | Vị trí máy quay chính xác và vị trí đứng Nhân vật |
| Director World / 3GS | Quan hệ không gian, phạm vi nhìn thấy, vị trí Nhân vật/Đạo cụ, lấy khung máy quay | Màu da, chất liệu trang phục, ánh sáng cấp điện ảnh cuối cùng |
| Phác thảo | Hành động, diễn xuất, độ dễ đọc của bố cục | Quyết định lại cấu trúc phòng |
| Khung đầu | Chất cảm hình ảnh, ngoại hình Nhân vật, ánh sáng và điểm khởi đầu video | Thay đổi lớn vị trí không gian và quan hệ máy quay |

### 7.3 Dùng 3GS thế nào
- **3GS mặt chính:** Dựng phim trường góc nhìn chính diện dựa trên Ảnh gốc Bối cảnh.
- **3GS mặt sau:** Dùng cho quay phản, đổi góc và bổ sung không gian phía sau.
- **3GS 360:** Tạo không gian xoay quanh được từ ảnh Toàn cảnh.
- **3GS tuỳ chỉnh:** Nhập tài sản 3D/scan bên ngoài mà team đã có.
- **Ảnh điều khiển / Ảnh dựng đạo diễn:** Mang kết quả lấy khung 3D quay về để tạo Phác thảo hoặc Khung đầu.

### 7.4 Gợi ý cho người mới
1. Bổ sung đủ Ảnh gốc Bối cảnh cơ bản trước, cần thì bổ sung Mặt sau hoặc Toàn cảnh 360.
2. Bấm cổng vào để tạo hoặc mở Director World / 3GS.
3. Trong Director World, chọn Beat mục tiêu, xác nhận không gian có phù hợp cốt truyện không.
4. Đặt Nhân vật, Đạo cụ hoặc vật thế chỗ, xác nhận vị trí đứng và hướng khung hình.
5. Điều chỉnh vị trí máy quay, xuất **Ảnh điều khiển** hoặc **Ảnh dựng đạo diễn**.
6. Quay lại Episode Studio hoặc Freezone, dùng kết quả xuất ra để tạo Phác thảo, Khung đầu hoặc Video.

> **🥖 Vì sao phải "hạ cấp trước rồi nâng cấp sau":**
> Thực chất là để tách các nhiệm vụ ở các giai đoạn khác nhau. Director World lo không gian, vị trí đứng và vị trí máy quay; Ảnh điều khiển/ảnh vị trí xuất ra nén không gian 3D thành bố cục 2D mà AI dễ hiểu hơn; Phác thảo lo xác nhận hành động, diễn xuất và cấu trúc hình ảnh; Ảnh render/Khung đầu bổ sung ngoại hình Nhân vật, trang phục, ánh sáng và chất cảm.
> Nhờ vậy khi bước vào tạo video, hệ thống đã có quan hệ không gian và điểm khởi đầu hình ảnh rõ ràng, **giảm đáng kể xác suất Nhân vật trôi vị trí, Bối cảnh không liên tục và Beat mất kiểm soát.**

---

## Chương 8: Episode Studio — Kịch bản, Beat, Dựng video

Episode Studio là module sản xuất được dùng nhiều nhất. Cấu trúc hiện tại: **Danh sách Tập → Bàn làm việc từng Tập**. Bàn làm việc từng Tập có 3 giai đoạn chính ở trên cùng: **Kịch bản, Beat, Dựng video**; trong Beat lại chia tiếp: **Lời thoại, Phác thảo, Ảnh render/Khung đầu, Âm thanh, Video**.

### 8.1 Lên kế hoạch tập
1. Sau khi vào **Episode Studio**, trước tiên xem đã có Tập chưa. Nếu chưa có, bấm **"Lên kế hoạch tập"** để tạo Tập từ cấu trúc chương.
2. Mỗi Tập có thể xem số dòng nguyên văn, số Beat, Danh tính, Bối cảnh, Đạo cụ và trạng thái Kịch bản.
3. Trước khi vào một Tập, nên **Lên kế hoạch danh tính**, Bối cảnh và Đạo cụ trước. **Thiếu tài sản sẽ ảnh hưởng việc tạo Kịch bản và Beat.**
4. Bấm **"Xem chi tiết"** để vào bàn làm việc của Tập.

### 8.2 Giai đoạn Kịch bản
Giai đoạn Kịch bản dùng để biến văn bản của Tập thành **Beat** có thể sản xuất. Phim thuyết minh có thể dùng **AI viết lại** để tạo bản thuyết minh; phim tinh phẩm có thể tạo Kịch bản trực tiếp từ **bản sao nguyên văn**.

1. Vào Tập mục tiêu, mở **Kịch bản**; kiểm tra nguyên văn có đầy đủ không; văn bản nguồn phân cảnh sẽ tự động lưu.
2. Phim thuyết minh nếu cần bản đọc: đặt số dòng mục tiêu và khoảng số chữ mỗi dòng, bấm **"AI viết lại"**.
3. Kiểm tra Danh tính, Bối cảnh và Đạo cụ trong kế hoạch tài sản có hợp lý không.
4. Bấm **"Tạo kịch bản"** hoặc **"Tạo theo từng dòng"** để tạo Beat.
5. Ở bản xem trước Beat bên phải, kiểm tra Lời thoại/lời thuyết minh, Mô tả khung hình, Người nói, Bối cảnh, Danh tính và Đạo cụ.

| Mục kiểm tra | Người mới đánh giá thế nào |
|---|---|
| Lời thoại / lời thuyết minh | Đọc có trôi không, có phù hợp Danh tính Nhân vật và thể loại dự án không |
| Người nói | Đối thoại có được gán đúng Nhân vật không; lời dẫn có đi theo nhân vật chính thuyết minh hoặc giọng mặc định không |
| Mô tả khung hình | Có thể hiện được trọng tâm cốt truyện không, có thuận tiện để tạo hình ảnh không |
| Danh tính xuất hiện | Nhân vật có dùng đúng biến thể trang phục/thời kỳ/độ tuổi không |
| Bối cảnh & Biến thể | Địa điểm có liên tục không, có chọn đúng Bối cảnh gốc, plate và thời gian không |
| Đạo cụ | Vật thể then chốt có bị bỏ sót không |

### 8.3 Giai đoạn Beat
Đây là nơi thực sự sản xuất Beat. Bên trái là lưới thẻ Beat và thanh **Thao tác hàng loạt**, bên phải là panel chỉnh sửa chi tiết của Beat hiện tại.

1. Vào **Beat**, chọn một Beat ở bên trái.
2. Trên cùng có thể đặt: Model phác thảo, Model render, **Tỉ lệ khung hình** và engine video. **Đổi Tỉ lệ khung hình chỉ ảnh hưởng tài sản tạo mới; nội dung đã tạo phải tạo lại mới cập nhật.**
3. Xử lý theo thứ tự: **Lời thoại → Phác thảo → Ảnh render/Khung đầu → Âm thanh → Video.**
4. Có thể chọn nhiều Beat để lên kế hoạch Phác thảo hoặc kế hoạch render.
5. Beat thủ công có thể chèn trước/sau một Beat, cũng có thể xoá; **sau khi xoá, số thứ tự sẽ được đánh lại.**

#### 8.3.1 Khu Lời thoại
Khu Lời thoại dùng để chỉnh sửa của Beat hiện tại: loại, Lời thoại/lời thuyết minh, Bối cảnh, Biến thể bối cảnh, thời gian, Mô tả khung hình, **Danh tính xuất hiện** và **Đạo cụ xuất hiện**. Sau khi lưu sẽ ảnh hưởng Phác thảo, lồng tiếng và Prompt video phía sau.

| Trường | Tác dụng | Gợi ý |
|---|---|---|
| Lời thoại / lời thuyết minh | Câu nói của Beat hiện tại | Đối thoại kiểm tra Người nói; lời thuyết minh kiểm tra ngữ khí và nhịp |
| Loại | Loại Beat hoặc loại âm thanh | Lời dẫn, đối thoại, im lặng… chọn theo lựa chọn thực tế |
| Bối cảnh / Biến thể / Thời gian | Kiểm soát địa điểm, trạng thái và ánh sáng | Cùng địa điểm khác trạng thái thì chọn Biến thể, đừng tạo Bối cảnh mới không liên quan |
| Mô tả khung hình | Trong Beat xảy ra chuyện gì | Viết hành động Nhân vật, bố cục, cảm xúc, môi trường |
| Danh tính / Đạo cụ xuất hiện | Kiểm soát trang phục Nhân vật và vật thể then chốt | Khi Nhân vật hoặc Đạo cụ sai thì kiểm tra ở đây trước |

> **✍️ Khu Lời thoại rất quan trọng:**
> Thông tin ở khu Lời thoại sẽ ảnh hưởng Phác thảo, lồng tiếng, Khung đầu và Prompt video. Nếu Lời thoại, Người nói, Bối cảnh hoặc Đạo cụ xuất hiện bị viết sai thì dù tạo ra đẹp đến đâu cũng có thể sai hướng.
> **Trước khi vào Phác thảo và Video, hãy xác nhận lại một lượt thông tin Lời thoại của Beat hiện tại.**

#### 8.3.2 Khu Phác thảo
Phác thảo dùng để xác định trước bố cục, vị trí Nhân vật, hành động và hướng chính của Beat — **không theo đuổi chất lượng hình ảnh cuối cùng.**

- Mở **Phác thảo**, xem phác thảo hiện tại có khớp với Lời thoại và Mô tả khung hình không.
- Kiểm tra không lỗi rồi bấm **"Tạo"**, chờ tác vụ phác thảo hoàn thành.
- Nếu không hài lòng: tạo lại, tải lên, chỉnh tư thế, cắt, chọn nền, hoặc chuyển **Ảnh điều khiển** đạo diễn thành phác thảo.
- Cần chỉnh sâu hơn thì mở bàn làm việc **Freezone** của Beat hiện tại.

> **🖼️ Phác thảo không cần theo đuổi chất cảm cuối cùng:**
> Phác thảo chủ yếu lo bố cục, hành động, vị trí đứng và thông tin Beat — không phải hình ảnh cuối. Ở giai đoạn phác thảo, trước tiên hãy xác nhận **"hình ảnh có kể rõ được không"**, đừng sa đà quá sớm vào ánh sáng và chất liệu; những thứ đó phù hợp giải quyết ở giai đoạn Ảnh render/Khung đầu hơn.

#### 8.3.3 Ảnh render
Ảnh render/Khung đầu là **ảnh tham chiếu then chốt cho việc tạo video**. Backend sẽ lưu Khung đầu dùng được cho tạo video làm tham chiếu video chính thức của Beat hiện tại.

- Mở **Ảnh render**, kiểm tra điểm neo nền có đúng không — ví dụ Ảnh gốc, Mặt sau, nền thuần của Director World hoặc nền do người dùng tải lên; cũng có thể lấy khung từ 360/Director World rồi gửi làm nền hiện tại hoặc tài sản dựng đạo diễn.
- Kiểm tra không lỗi rồi chọn Model và bấm **"Tạo"**, xem Ảnh render/Khung đầu hiện tại đã tạo chưa.

| Trọng tâm kiểm tra | Tiêu chuẩn đạt |
|---|---|
| Mặt Nhân vật | Nhất quán với chân dung/ảnh Danh tính, không bị "đổi mặt" rõ rệt |
| Trang phục Danh tính | Phù hợp Danh tính xuất hiện hiện tại, không lẫn trang phục |
| Bối cảnh | Không gian, ánh sáng, bối cảnh thời đại nhất quán |
| Đạo cụ | Đạo cụ then chốt xuất hiện và ở vị trí hợp lý |
| Chữ thừa | Trong hình không được có chữ thừa, watermark hoặc nhãn sai |
| Khả năng dùng cho video | Bố cục đủ sức chống đỡ chuyển động sau đó, không quá chật chội |

> **🎬 Vì sao phải tạo keyframe:**
> Tác dụng quan trọng nhất của keyframe là **quyết định chất cảm tạo video**.
> Nếu không có keyframe mà đi thẳng Văn bản tạo video, Prompt không đủ chi tiết thì phong cách video rất dễ lệch. Làm thế này chủ yếu để việc tạo video **bám chặt vào phong cách thị giác và chất cảm ánh sáng của keyframe.**
> Nếu keyframe làm Khung đầu, thì trước khi tạo video bạn cũng có thể dùng nó để xác nhận mặt Nhân vật, trang phục, Bối cảnh hoặc Đạo cụ, giúp tạo ra chính xác hơn.

#### 8.3.4 Khu Video
Khu Video dùng để tạo đoạn video của một Beat từ Khung đầu, tư liệu tham chiếu, Prompt và cấu hình Model.

- Mở **Video**, chọn Model video — **Model khác nhau cần tư liệu khác nhau.**
- Xem chi tiết tư liệu tham chiếu, xác nhận trạng thái Nhân vật, Bối cảnh, Đạo cụ, Khung đầu, âm thanh…
- Chọn chế độ tạo, thời lượng, **Độ phân giải**, **Tỉ lệ khung hình** và các tuỳ chọn nâng cao khác.
- Kiểm tra Prompt video; cần thì dùng AI tối ưu.
- Bấm **"Tạo video"**, sau khi tạo xong phát xem trước, xác nhận hành động, Nhân vật, Bối cảnh và chuyển động máy quay; không hài lòng thì bấm **"Tạo lại"**.

### 8.4 Xuất thành phẩm
Khi mọi Beat của một Tập đã sẵn sàng, vào giai đoạn **Dựng video**.

- Xem còn Beat nào chưa sẵn sàng không; thẻ chưa sẵn sàng sẽ hiển thị thiếu Phác thảo, Âm thanh hay Video.
- Chọn **Độ phân giải**: dự án dọc chọn quy cách dọc tương ứng; dự án ngang chọn quy cách ngang tương ứng.
- Chọn có thêm **Phụ đề** không *(nếu máy chưa cài plugin phụ đề thì có thể dựng phụ đề thất bại)*.
- Bấm **"Dựng tập phim"** hoặc **"Xuất ZIP"**, xác nhận để bắt đầu tác vụ.

---

## Chương 9: Freezone — Canvas vô hạn và sáng tạo chuyên sâu

Freezone không phải bộ sinh ảnh đơn giản, mà là một **bàn làm việc sáng tạo trực quan**. Bạn có thể tải tư liệu lên, kéo tài sản dự án vào, tạo ảnh và video, xử lý âm thanh, mở Director World, và **ghi về luồng chính** các Ứng viên ưng ý.

> **Hai kiểu người dùng Freezone thế nào:** Người mới có thể chưa cần đụng đến Node phức tạp — chỉ vào Freezone khi Beat then chốt cần tinh chỉnh. Đạo diễn hoặc team có kinh nghiệm có thể lấy Freezone làm sân chơi sáng tạo chính, nhiều người song song lo tạo ảnh, tạo video, kịch bản, Bối cảnh và Đạo cụ, cuối cùng ghi tài sản đã chốt về **mạch chính** trong Episode Studio.

### 9.1 Khái niệm cốt lõi

| Khái niệm | Diễn giải | Hiểu đơn giản |
|---|---|---|
| **Canvas** | Khu làm việc chính của Freezone, đặt được Node ảnh, video, âm thanh, văn bản, thế giới 3D… | Như một tấm bảng trắng đạo diễn vô hạn |
| **Node** | Tư liệu hoặc công cụ trên Canvas: Node ảnh, Node video, Node âm thanh, Node văn bản | Mỗi Node là một khối tư liệu hoặc một bộ tạo |
| **Đường nối** | Thể hiện Node này tham chiếu Node kia | Ai ảnh hưởng ai, nhìn là thấy |
| **Ứng viên** | Tư liệu tạo/tải lên trong Freezone **mặc định không ghi đè luồng chính** | Thử phương án trước, ưng rồi mới dùng |
| **Ghi về luồng chính** | Gửi kết quả Ứng viên vào vị trí chính thức: Nhân vật, Bối cảnh, Đạo cụ, Phác thảo Beat, Phân cảnh, Khung đầu hoặc Video | Xác nhận rồi mới vào tài sản dự án chính thức |
| **Hình chiếu mạch chính** | Chiếu tài sản chính thức từ Episode Studio/Asset Library vào Canvas để tiếp tục sáng tạo | Cầu nối giữa tài sản chính thức và sáng tạo tự do |

### 9.2 Khi nào nên dùng Freezone
- Beat thông thường, số lượng lớn → ưu tiên hoàn thành ở Episode Studio.
- Beat then chốt, Beat khó, chốt bản Nhân vật/Bối cảnh/Đạo cụ → phù hợp vào Freezone.
- Xử lý video lần 2, nâng **Nét cao**, phân tích, xoá phụ đề, tách âm thanh hoặc dựng → có thể làm ở Freezone.
- Khi team sản xuất song song, có thể chia Canvas theo Tập, theo loại tài sản hoặc theo khâu.

### 9.3 Vào Freezone từ luồng chính
Freezone có nhiều cổng vào; mỗi cổng tự động mang theo ngữ cảnh khác nhau.

| Cổng vào | Mang theo gì | Dùng cho việc gì |
|---|---|---|
| Module **Freezone** bên trái | Canvas mặc định của dự án hoặc Canvas gần nhất | Khám phá tự do, đồng sáng tạo nhóm, kho tư liệu cấp dự án |
| Cổng Nhân vật ở Asset Library | Chân dung, ảnh Danh tính, Giọng đọc… | Tinh chỉnh Nhân vật, tạo ảnh Danh tính, **Ba hình chiếu khuôn mặt nhân vật** |
| Cổng Bối cảnh ở Asset Library | Ảnh gốc Bối cảnh, Mặt sau, 360, Director World | Mở rộng Bối cảnh, làm 360, tạo Director World |
| Cổng Đạo cụ ở Asset Library | Mô tả và ảnh tham chiếu Đạo cụ | Tạo **Ba hình chiếu sản phẩm**, tham chiếu Nét cao |
| Cổng Beat ở Episode Studio | Lời thoại, Phác thảo, Ảnh render, Video, Nhân vật, Bối cảnh và Đạo cụ của Beat hiện tại | Sửa một Beat đơn lẻ, tạo **Phác thảo ứng viên**/**Phân cảnh ứng viên**/video |

### 9.4 Các loại Node và tác dụng

| Loại Node | Có thể làm gì |
|---|---|
| Tải tư liệu lên | Tải ảnh, video, âm thanh hoặc tư liệu khác làm tham chiếu |
| Node ảnh / Ảnh AI | Văn bản tạo ảnh, Ảnh tạo ảnh, sửa ảnh, **Nét cao**, **Tách nền**, **Vẽ lại**, **Mở rộng ảnh**, **Đánh sáng** |
| Ảnh kết quả | Nhận kết quả tạo, có thể tiếp tục làm đầu vào hạ nguồn hoặc gửi ghi về luồng chính |
| **Ngữ cảnh beat** | Lưu Lời thoại, Bối cảnh, Danh tính, Đạo cụ, Phác thảo, nền… của Beat hiện tại |
| Node văn bản | Nhập chữ, dịch Prompt, suy ngược Prompt từ ảnh, tạo kịch bản truyện |
| Nhóm / Phân cảnh / Lưới đa phiên bản | Sắp xếp nhiều tư liệu, trích ô, tạo nhiều phiên bản Ứng viên |
| Node video | Tải video lên, **Văn bản tạo video**, **Ảnh tạo video**, **Khung đầu/cuối**, video tham chiếu đa năng, Nét cao video, phân tích video |
| Node âm thanh | Tải âm thanh lên, Văn bản tạo giọng nói, tách âm thanh |
| **Dựng video** | Sắp xếp và xuất nhiều tư liệu video cùng track âm thanh tuỳ chọn |
| Bộ tạo kịch bản | Tạo kịch bản Beat hoặc tách Beat dựa trên tư liệu thượng nguồn |
| Trình xem **Toàn cảnh 360°** | Xem toàn cảnh, chỉnh góc nhìn, xuất ảnh chụp |
| Thế giới 3D / **Director World** | Nạp thế giới Bối cảnh, đặt Nhân vật/Đạo cụ/**Thế chỗ AI**, xuất nền thuần hoặc **Ảnh dựng đạo diễn** |
| Node kỹ năng | Chạy các kỹ năng liên quan mạch chính: Danh tính Nhân vật, Bối cảnh ứng viên, tham chiếu Đạo cụ, sửa Phác thảo… |

### 9.5 Năng lực hình ảnh

| Năng lực | Diễn giải |
|---|---|
| Văn bản tạo ảnh | Nhập Prompt để tạo ảnh, chọn được tỉ lệ, kích thước, Model và chất lượng |
| Ảnh tạo ảnh / Sửa ảnh | Lấy một ảnh gốc làm tham chiếu chính, kết hợp Prompt và ảnh tham chiếu phụ để tạo ảnh mới |
| **Phác thảo ứng viên** | Kết hợp Ngữ cảnh beat, ảnh nền hoặc Ảnh dựng đạo diễn để tạo Phác thảo Beat ứng viên |
| **Phân cảnh ứng viên** | Tạo Phân cảnh chính thức từ Phác thảo, nền, Nhân vật và tham chiếu Đạo cụ |
| Toàn cảnh 360 | Tạo ảnh 360 tỉ lệ 2:1 từ Ảnh gốc của Bối cảnh |
| Đa góc / Đa view | Tạo góc nhìn khác, cỡ cảnh khác, đa view Nhân vật hoặc **Ba hình chiếu sản phẩm** từ Ảnh gốc |
| Chỉnh sửa theo Mẫu | Hỗ trợ lưới 9 ô đa máy quay, lưới 4 ô đẩy cốt truyện, phân cảnh liền mạch 25 ô, hiệu chỉnh ánh sáng cấp điện ảnh, suy diễn hình ảnh 3 giây sau/5 giây trước… |
| **Đánh sáng** | Tái tạo ánh sáng theo tham chiếu ánh sáng, độ sáng, nhiệt độ màu, hướng đèn chính, đèn viền… |
| **Nét cao** | Phóng to và phục hồi ảnh ở độ nét cao |
| **Mở rộng ảnh** | Giữ chủ thể và bố cục, vẽ thêm ra ngoài đến tỉ lệ mục tiêu |
| **Vẽ lại** / Xoá cục bộ | Vẽ lại toàn bộ, hoặc kết hợp mask để vẽ lại/xoá cục bộ |
| Suy ngược Prompt từ ảnh | Suy ra Prompt từ ảnh để tiếp tục dùng cho việc tạo |
| Ảnh → Thế giới 3D | Lấy ảnh làm đầu vào, tạo tư liệu thế giới 3D dùng cho workflow Bối cảnh |

### 9.6 Năng lực video

| Năng lực | Diễn giải |
|---|---|
| **Văn bản tạo video** | Nhập mô tả nội dung video để tạo video |
| **Ảnh tạo video** | Dùng 1 ảnh làm Khung đầu để tạo video |
| Video tham chiếu đa ảnh | Dùng nhiều ảnh làm tham chiếu để tạo video |
| **Khung đầu/cuối** | Chỉ định Khung đầu và/hoặc khung cuối để kiểm soát hình ảnh mở đầu & kết thúc |
| Video tham chiếu đa năng | Đồng thời dùng văn bản, ảnh, video, âm thanh làm tham chiếu để tạo video |
| Mẫu chuyển động máy | Chọn Mẫu cho vị trí máy cố định, bám theo, xoay quanh, đẩy/kéo… |
| Đánh dấu cục bộ | Bấm hoặc khoanh chọn chủ thể trên ảnh để giữ trọng tâm phần tử chỉ định khi tạo |
| Trích frame / Phân tích video | Trích keyframe từ video, phân tích cấu trúc câu chuyện của video |
| **Xoá phụ đề thông minh** / Xoá vùng khoanh | Tự ước lượng vùng phụ đề, hoặc xoá nội dung video theo vùng khoanh chọn |
| Nét cao video | Xử lý nâng độ nét cơ bản cho video |
| **Dựng video** | Cắt & ghép các đoạn video theo timeline, trộn track âm thanh và xuất thành phẩm |

### 9.7 Năng lực âm thanh và văn bản

| Năng lực | Diễn giải |
|---|---|
| Danh sách Giọng đọc | Xem giọng thuyết minh của dự án, giọng mặc định Nhân vật, giọng theo độ tuổi, giọng theo Danh tính và giọng của tôi |
| Văn bản tạo giọng nói | Nhập Lời thoại hoặc lời dẫn, chọn Giọng đọc và Prompt cảm xúc để tạo giọng nói |
| Tách âm thanh | Trích âm thanh thuần từ video, đồng thời xuất video không tiếng |
| Dịch Trung–Anh | Dịch Prompt theo ngữ cảnh ảnh, video, âm thanh hoặc văn bản |
| Tạo kịch bản truyện | Tạo bảng Beat có cấu trúc từ văn bản dán vào hoặc file kịch bản tải lên |

### 9.8 Toàn cảnh 360, Thế giới 3D và Director World
Toàn cảnh 360 và Thế giới 3D dùng để giải quyết hai vấn đề khó nhất của phim tinh phẩm: **"nhất quán không gian"** và **"liên tục vị trí máy quay"**. Chúng giúp đạo diễn chọn nhiều góc nhìn khác nhau **từ cùng một Bối cảnh**, thay vì mỗi Beat lại tạo ra một căn phòng khác nhau.

1. Tạo Toàn cảnh 360 từ Ảnh gốc hoặc ảnh gốc đảo ngược của Bối cảnh.
2. Mở trình xem Toàn cảnh 360, chỉnh các tham số góc nhìn FOV, roll, pitch, yaw…
3. Sau khi chốt góc nhìn phù hợp thì chụp ảnh, dùng làm nền Beat hoặc nền hiện tại.
4. Nếu cần kiểm soát không gian mạnh hơn, có thể tạo Thế giới 3D / Director World.
5. Trong Director World, đặt Nhân vật, Đạo cụ hoặc **Thế chỗ AI**, xuất nền thuần hoặc **Ảnh dựng đạo diễn**.
6. Ghi kết quả xuất ra về Phác thảo Beat, Ảnh render/Khung đầu hoặc tài sản Bối cảnh.

### 9.9 Ghi về luồng chính
Ghi về là **ranh giới an toàn** giữa Freezone và luồng chính. Kết quả Ứng viên trong Freezone **không tự động ghi đè** mạch chính dự án; chỉ khi bạn bấm *ghi về* một cách rõ ràng và chọn **ô đích** thì mới đi vào tài sản dự án chính thức.

| Ô đích | Diễn giải |
|---|---|
| Chân dung / ảnh Danh tính / ảnh trang phục Danh tính Nhân vật | Cập nhật tài sản Nhân vật trong Asset Library |
| Ảnh gốc Bối cảnh / 360 Bối cảnh / tư liệu Director World | Cập nhật tài sản Bối cảnh trong Asset Library |
| Ảnh tham chiếu Đạo cụ | Cập nhật tài sản Đạo cụ trong Asset Library |
| Phác thảo Beat | Thay thế Phác thảo của Beat hiện tại |
| Phân cảnh / Ảnh render / Khung đầu của Beat | Thay thế ảnh tham chiếu video của Beat hiện tại |
| Video Beat | Thay thế kết quả video của Beat hiện tại |
| Nền đã chọn / Ảnh dựng đạo diễn | Dùng làm nền Beat hiện tại hoặc Ảnh điều khiển beat |

> **👀 Trước khi ghi về nhất định phải xác nhận:** Nhân vật, Bối cảnh, Đạo cụ là **tài sản toàn cục** — sau khi ghi về có thể ảnh hưởng nhiều Beat. Phác thảo Beat, Khung đầu và Video thường chỉ ảnh hưởng Beat hiện tại.
> Trước khi ghi về chính thức, nên xem thumbnail, ô đích và cảnh báo phạm vi ảnh hưởng.

### 9.10 Workflow đề xuất cho Freezone

| Mục tiêu | Lộ trình thao tác |
|---|---|
| Sửa Phác thảo của một Beat | Mở Canvas Freezone của Beat đó → xem Ngữ cảnh beat → kéo vào nền/phác thảo/Ảnh dựng đạo diễn → tạo nhiều Phác thảo ứng viên → ghi về Phác thảo Beat hiện tại |
| Tạo ảnh Danh tính Nhân vật | Kéo vào chân dung Nhân vật hoặc ảnh tham chiếu → dùng Văn bản tạo ảnh/Ảnh tạo ảnh/Ba hình chiếu khuôn mặt để tạo Ứng viên → Nét cao/Đánh sáng/Vẽ lại cục bộ → ghi về ảnh Danh tính Nhân vật |
| Làm 360 cho Bối cảnh | Kéo vào Ảnh gốc hoặc Mặt sau của Bối cảnh → tạo Ứng viên Toàn cảnh 360 → kiểm tra không gian → ghi về 360 Bối cảnh |
| Tạo đoạn video | Chuẩn bị Khung đầu, tham chiếu Nhân vật, ảnh Bối cảnh hoặc video có sẵn → chọn Văn bản tạo video/Ảnh tạo video/Khung đầu-cuối/tham chiếu đa năng → tạo Ứng viên → ghi về Video Beat |
| Tạo kế hoạch video từ kịch bản | Tải lên/dán văn bản kịch bản → tạo bảng Beat có cấu trúc → dùng Mô tả khung hình và Prompt chuyển động video làm đầu vào cho Node ảnh/video hạ nguồn |
| Team sáng tạo tự do | Phân công theo Tập hoặc theo khâu, mỗi người tạo Ứng viên trên Canvas của mình; đạo diễn duyệt xong thì ghi về luồng chính, Episode Studio tiếp tục dựng thống nhất |

### 9.11 Gợi ý cộng tác nhóm
- Bắt đầu từ **Hình chiếu mạch chính**, để Canvas mang sẵn tài sản chính thức vào.
- Sắp xếp tư liệu theo nhóm: Nhân vật, Bối cảnh, Phác thảo, Khung đầu, video Ứng viên.
- Dùng **Đường nối** để lưu lại căn cứ tạo ra Ứng viên.
- Cùng một Beat nên giữ **3–5 Ứng viên** đặt cạnh nhau để so sánh.
- Đạo diễn hoặc người phụ trách duyệt xong rồi mới ghi về luồng chính.
- Sau khi tài sản mạch chính được cập nhật, đồng bộ lại Hình chiếu mạch chính theo nhắc nhở.

---

## Chương 10: Xia Director, Visual Style, Task Center

### 10.1 Xia Director — Trợ lý đạo diễn AI
Xia Director có thể hiểu là **trợ lý sản xuất AI** của nền tảng. Nó giúp tra tiến độ dự án, xem tác vụ, tạo hoặc đẩy tác vụ Kịch bản/Beat, kiểm tra tính đầy đủ của sản phẩm bàn giao, và đưa ra gợi ý cho bước tiếp theo.

- Vào trang Xia Director độc lập từ menu trái của dự án.
- Trong Freezone cũng có thể mở panel Xia Director bên phải để làm việc cùng ngữ cảnh Canvas.
- **Câu hỏi phù hợp:** Dự án hiện tại đang đến đâu? Bước tiếp theo làm gì? Tài sản nào còn thiếu? Tập nào, Beat nào chưa sẵn sàng?

### 10.2 Visual Style — Mẫu phong cách
Visual Style quản lý phong cách của dự án. Một phong cách thường gồm: nhãn UI, chỉ thị phong cách, chỉ thị loại trừ, tag phong cách và JSON cấu hình.

- Vào **Visual Style**, chọn phong cách preset hoặc tuỳ chỉnh ở menu trái. Preset thường chỉ đọc; phong cách tuỳ chỉnh có thể sửa hoặc xoá.
- Khi tạo phong cách tuỳ chỉnh, có thể tải ảnh tham chiếu lên để AI phân tích tham số phong cách, hoặc điền thủ công.
- Bấm **"Áp dụng cho dự án"** để đặt làm phong cách mặc định của dự án.

### 10.3 Task Center — Trung tâm tác vụ
Task Center dùng để xem trạng thái tác vụ nền. Khi tạo ảnh, video, lồng tiếng, tác vụ hàng loạt, tác vụ dựng — nếu trang tạm thời chưa có kết quả, hãy vào Task Center kiểm tra xem tác vụ có còn đang chạy không.

- Vào **Task Center**, xem trạng thái: **Đang gửi → Trong hàng đợi → Đang chờ → Đang khởi động → Đang chạy → Hoàn thành / Thất bại / Đã huỷ.**
- Tác vụ đang chạy có thể xem bước hiện tại và tiến độ.
- Mở rộng tác vụ để xem log, lỗi và kết quả.
- Bấm nút nhảy để quay về trang tương ứng của tác vụ.
- Tác vụ đang chạy có thể huỷ; tác vụ ở trạng thái cuối có thể xoá; cũng có thể dọn các tác vụ đã hoàn thành.

---

## Chương 11: Khuyến nghị dùng cục bộ đơn máy & nhóm nhỏ

> *(Bản CE chạy đơn người dùng trên máy cục bộ — không có chia sẻ/RBAC trong ứng dụng. Nhóm nhỏ phối hợp bằng cách phân công qua quy trình bên ngoài rồi hợp nhất trên máy owner. Chương này bám định vị CE; nên rà lại nhẹ với bản gốc khi tiện.)*

### 11.1 Mô hình sản xuất đề xuất cho bản mã nguồn mở

| Mô hình | Phù hợp | Làm thế nào |
|---|---|---|
| **Dây chuyền luồng chính** | Người mới, phim thuyết minh số lượng lớn, quy trình chuẩn hoá | Bám Story Source → Asset Library → Episode Studio; làm nghiêm theo thứ tự Kịch bản → Beat → Dựng video, dễ theo dõi tiến độ |
| **Canvas vô hạn (Freezone)** | Phim tinh phẩm, người dùng mạnh về mỹ thuật/video | Tự do sáng tạo Nhân vật, Bối cảnh, Beat và video Ứng viên trong Freezone; xác nhận xong ghi về luồng chính, Episode Studio quản lý tiến độ & dựng thống nhất |
| **Mô hình hỗn hợp** | **Đa số dự án** | Beat thường đi Episode Studio, Beat then chốt vào Freezone; Asset Library giữ tài sản thống nhất, Episode Studio lo tổng tiến độ, Freezone lo sáng tạo & chất lượng |

**Nhóm nhỏ (self-host):** vì CE không có cộng tác theo tài khoản, hãy phân công theo Tập/khâu qua thoả thuận bên ngoài (ai lo Nhân vật, ai lo Bối cảnh/Đạo cụ, ai lo Beat, ai duyệt cuối), rồi hợp nhất tài sản trên máy owner. Đặt tên dự án `Tên tác phẩm_Đợt_Người phụ trách` để dễ truy vết.

### 11.2 Cách làm đề xuất cho người sáng tạo cá nhân
- Test bằng văn bản ngắn hoặc nội dung một chương trước, **đừng tải cả cuốn tiểu thuyết siêu dài lên ngay từ đầu.**
- Tập đầu tiên nên giới hạn số Beat ở mức quản lý được — **chạy thông trước rồi mới theo đuổi tinh chỉnh.**
- Ưu tiên đảm bảo chân dung nhân vật chính, Danh tính cốt lõi, Bối cảnh cốt lõi và Giọng đọc mặc định.
- Beat thường làm ở Episode Studio, Beat then chốt mới vào Freezone.
- **Đừng mù quáng "rút thẻ" lặp đi lặp lại;** hãy phán đoán vấn đề nằm ở Lời thoại, Phác thảo, Ảnh render/Khung đầu, Âm thanh hay Prompt video.

---

## Chương 12: Kiểm tra chất lượng và câu hỏi thường gặp

### 12.1 Checklist cho từng giai đoạn

| Giai đoạn | Bắt buộc kiểm tra | Tiêu chuẩn đạt |
|---|---|---|
| **Story Source** | Văn bản có đầy đủ, chương có nhận diện được, thể loại dự án có đúng không | Không lỗi font, chương và cấu hình hợp lý |
| **Asset Library – Nhân vật** | Chân dung, Danh tính, biệt danh, Giọng đọc | Nhân vật chính ổn định, nhân vật quan trọng không thiếu chân dung & Danh tính |
| **Asset Library – Bối cảnh** | Ảnh gốc, Mặt sau, 360, Director World, Biến thể bối cảnh | Bối cảnh cốt lõi đủ tham chiếu, trạng thái Bối cảnh quản bằng plate |
| **Asset Library – Đạo cụ** | Đạo cụ tần suất cao đã lập kho chưa | Vật thể then chốt tham chiếu được trong Beat |
| **Episode Studio – Kịch bản** | Beat, Người nói, Bối cảnh, Biến thể, Danh tính, Đạo cụ | Cốt truyện trôi, Nhân vật & Bối cảnh không loạn |
| **Episode Studio – Phác thảo** | Bố cục, vị trí đứng, hành động, gán màu | Beat hiểu được, vị trí Nhân vật đúng |
| **Episode Studio – Ảnh render/Khung đầu** | Mặt, trang phục, Bối cảnh, Đạo cụ, chữ thừa | Hình ảnh dùng được làm Khung đầu video |
| **Episode Studio – Âm thanh** | Giọng đọc, văn bản, thời lượng, độ rõ | Không thiếu Giọng đọc, lời đọc/đối thoại nghe rõ |
| **Episode Studio – Video** | Hành động, chuyển động máy, Nhân vật, Bối cảnh, quan hệ hình–tiếng | Beat đơn lẻ dùng được |
| **Dựng video** | Mọi Beat đã sẵn sàng chưa, Phụ đề & Độ phân giải có đúng không | Thành phẩm xem trước được, tải về được |

### 12.2 Câu hỏi thường gặp

| Vấn đề | Nguyên nhân có thể | Cách xử lý |
|---|---|---|
| Sau khi nhập chương bị sai | Tiêu đề nguyên văn không chuẩn hoặc định dạng file lộn xộn | Chỉnh lại tiêu đề chương rồi nhập lại |
| Nhận diện Nhân vật không đầy đủ | Nhân vật có nhiều biệt danh hoặc thông tin văn bản chưa đủ | Bổ sung thủ công biệt danh và mô tả ở tab Nhân vật |
| Ngoại hình Nhân vật không ổn định | Chân dung, ảnh Danh tính hoặc Prompt khuôn mặt chưa thống nhất | Thống nhất tài sản Nhân vật ở Asset Library trước, rồi mới tạo Beat |
| Cùng một Bối cảnh trước sau không nhất quán | Chưa lập Ảnh gốc, Mặt sau, 360, Director World hoặc Biến thể bối cảnh | Bổ sung tham chiếu Bối cảnh ở Asset Library; cùng địa điểm khác trạng thái thì dùng plate |
| Trong Beat thiếu Đạo cụ | Beat chưa chọn Đạo cụ xuất hiện, hoặc thiếu ảnh tham chiếu Đạo cụ | Quay lại khu Lời thoại chọn Đạo cụ, bổ sung tham chiếu rồi tạo lại |
| Phác thảo dùng được nhưng Khung đầu sai | Tham chiếu render chưa đủ hoặc điểm neo nền sai | Kiểm tra tham chiếu Danh tính/Bối cảnh/Đạo cụ, cần thì vào Freezone tinh chỉnh |
| Chuyển động video không như mong đợi | Prompt video không rõ, nền tảng hành động ở Khung đầu chưa đúng | Sửa Khung đầu hoặc Prompt trước, rồi tạo lại video |
| Nút Dựng video không dùng được | Một số Beat thiếu Âm thanh hoặc Video | Ở trang Dựng video, bấm vào thẻ chưa sẵn sàng để nhảy về Beat bổ sung |
| Kết quả Freezone không xuất hiện trong luồng chính | Kết quả mới chỉ là Ứng viên, chưa ghi về | Bấm *ghi về* trong Freezone và chọn đúng ô đích |
| Tác vụ mãi không có kết quả | Tác vụ vẫn trong hàng đợi/đang chạy, hoặc đã thất bại | Vào Task Center xem tiến độ, log và lỗi; cần thì huỷ và thử lại |

---

> **💡 Nhắc nhở cuối:** Mục tiêu của DramaHub **không phải** để người dùng bấm hết mọi nút trong một lần, mà là để người dùng **đẩy tiến độ ổn định theo thứ tự "Văn bản → Tài sản → Kịch bản → Beat → Video → Thành phẩm"**.
> Người mới hãy chạy thông một Tập trước, rồi thiết lập chuẩn; phim tinh phẩm thì sau đó mới vào Freezone tinh chỉnh.

---

## Bảng thuật ngữ (đối chiếu với i18n)

Nguồn: `frontend/public/locales/{zh,vi}/translation.json` — cùng key, đối chiếu giá trị.

| 中文 (bản gốc) | Tiếng Việt (UI) | i18n key |
|---|---|---|
| 虾料 | Story Source *(tiêu đề trang: Nguồn truyện)* | `nav.ingest` / `ingest.title` |
| 虾塘 | Asset Library | `nav.assets` |
| 虾镜 | Episode Studio | `nav.episodes` |
| 虾画 | Freezone | `nav.freezone` |
| 虾导 | Xia Director | `nav.aiAssistant` |
| 虾格 | Visual Style | `nav.styles` |
| 虾条 / 任务中心 | Task Center / Trung tâm tác vụ | `nav.tasks` / `nav.taskCenter` |
| 角色 | Nhân vật | `nav.characters` |
| 场景 | Bối cảnh | `characters.assetTabs.scenes` |
| 道具 | Đạo cụ | `characters.assetTabs.props` |
| 声线 | Giọng đọc | `characters.assetTabs.voices` |
| 身份 / 身份造型 | Danh tính / tạo hình | `episode.script.identities`, `characters.tabs.identities` |
| 出场身份 | Danh tính xuất hiện | `episode.workbench.text.identities` |
| 出场道具 | Đạo cụ xuất hiện | `episode.workbench.text.props` |
| 场景变体 | Biến thể bối cảnh | `episode.workbench.text.sceneVariant` |
| 源图 | Ảnh gốc | `assets.scenes.master` |
| 背面 | Mặt sau | `assets.scenes.reverse` |
| 全景 | Toàn cảnh | `nodeToolbar.panorama` |
| 导演世界 | Director World | `assets.scenes.stage.title` |
| 导演合成图 | Ảnh dựng đạo diễn | `viewer.threeD.directorCombinedDirectorWorldDetail` |
| 镜头控制图 | Ảnh điều khiển beat | `viewer.threeD.exportControlLayer` |
| AI 占位 | Thế chỗ AI | `viewer.threeD.actionStagingTitle` |
| 剧集 | Tập | `nav.sectionEpisode` |
| **镜头** | **Beat** | `episode.nav.shots` |
| 镜头上下文 | Ngữ cảnh beat | `node.beatContextNode.heading` |
| 分镜 | Phân cảnh | `node.beatContextNode.assets.frame` |
| 草图 | Phác thảo | `nav.sketches` |
| 草图候选 / 分镜候选 | Phác thảo ứng viên / Phân cảnh ứng viên | `viewer.threeD.skillOutputLabels.*` |
| 渲染图 | Ảnh render | `episode.nav.render` |
| 首帧 | Khung đầu | `episode.workbench.text.firstFrame` |
| 脚本 | Kịch bản | `nav.script` |
| 合成 / 视频合成 | Dựng video | `nav.compose`, `tasks.types.compose_episode` |
| 音频 | Âm thanh | `nav.audio` |
| 台词 | Lời thoại | `episode.workbench.text.narration` |
| 解说词 | Lời thuyết minh | `episode.workbench.video.noteNarration` |
| 说话人 | Người nói | `episode.script.previewSpeaker` |
| 画面描述 | Mô tả khung hình | `episode.script.previewVisualDescription` |
| 规划剧集 | Lên kế hoạch tập | `tasks.types.build_episodes` |
| 规划身份 | Lên kế hoạch danh tính | `episode.script.planIdentities` |
| AI 改写 | AI viết lại | `episode.script.aiRewrite` |
| 候选 | Ứng viên | `aiAssistant.mediaCandidates` |
| 写回 (主流程) | Ghi về (luồng chính) | `landing.eleventh.faqs.f4.answer` |
| 目标槽位 | Ô đích | `landing.eleventh.faqs.f4.answer` |
| 主线 | Mạch chính | `freezone.canvases.sourceCanvas` |
| 主线投影 | Hình chiếu mạch chính | `freezone.projections.activeCount` |
| 画布 | Canvas | `freezone.canvases.defaultSection` |
| 节点 | Node | `project.nodes` |
| 连线 | Đường nối | `settings.edgeRoutingMode` |
| 提示词 | Prompt | `canvas.history.promptTitle` |
| 模型 | Model | `aiAssistant.model` |
| 分辨率 | Độ phân giải | `episode.workbench.video.resolution` |
| 画幅 | Tỉ lệ khung hình | `episode.workbench.video.ratio` |
| 字幕 | Phụ đề | `episode.workbench.video.seedance2OverlayKindSubtitle` |
| 智能去字幕 | Xoá phụ đề thông minh | `nodeToolbar.video.subtitleRemoval` |
| 高清 | Nét cao | `nodeToolbar.hd` |
| 扩图 | Mở rộng ảnh | `nodeToolbar.outpaint` |
| 重绘 | Vẽ lại | `nodeToolbar.repaint` |
| 抠图 | Tách nền | `nodeToolbar.matting` |
| 打光 | Đánh sáng | `nodeToolbar.relight` |
| 文生视频 | Văn bản tạo video | `node.videoNode.tabs.textToVideo` |
| 图生视频 | Ảnh tạo video | `node.videoNode.tabs.imageToVideo` |
| 首尾帧 | Khung đầu/cuối | `node.videoNode.tabs.firstLastFrame` |
| 角色脸部三视图 | Ba hình chiếu khuôn mặt nhân vật | `nodeToolbar.gridMenu.faceThreeView` |
| 产品三视图 | Ba hình chiếu sản phẩm | `nodeToolbar.gridMenu.productThreeView` |
| 项目管理中心 | Trung tâm quản lý dự án | `project.dashboardTitle` |
| 积分 | Điểm | `credits.short` |
| 归档 | Lưu trữ | `project.statusArchived` |
| 回收站 | Thùng rác | `project.statusDeleted` |
| 查看者 | Người xem | `project.roleLabel.viewer` |
| 编辑者 | Người biên tập | `project.roleLabel.editor` |
| 管理员 | Quản trị viên | `project.roleLabel.admin` |
| 所有者 | Chủ sở hữu | `project.roleLabel.owner` |
| 粘贴文本 | Dán văn bản | `ingest.inputMode.paste` |
| 批量操作 | Thao tác hàng loạt | `characters.batchOps` |
| 模板 | Mẫu | `canvas.emptyHintChips.templates` |
