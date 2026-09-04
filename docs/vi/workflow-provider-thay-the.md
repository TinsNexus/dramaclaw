# Workflow sản xuất: ai làm khâu nào

Bản đồ đầy đủ một tập phim, với provider thay thế cho từng khâu. Nguyên tắc: **chỉ trả tiền ở khâu không có đường thay thế.**

Tài liệu liên quan: [chế độ ít tốn tiền](zero-cost-setup.md).

---

## 1. Sơ đồ luồng

```
Truyện (.txt/.docx)
   │
   ├─▶ [Claude]  đọc truyện → story bible, hồ sơ nhân vật, phân tập, phân cảnh, lời thoại
   │              → nạp vào project qua /ingest/upload + UI
   │
   ├─▶ [Claude]  viết prompt ảnh tiếng Anh cho từng nhân vật / bối cảnh / shot
   │              │
   │              └─▶ [ChatGPT]  bạn dán prompt, gen ảnh, tải về đúng quy ước tên
   │                              │
   │                              └─▶ [script upload]  đẩy vào DramaClaw qua endpoint
   │
   ├─▶ [ComfyUI local]  ảnh → video từng shot (Wan2.2)     ‖  hoặc [Seedance] nếu chấp nhận trả tiền
   │
   ├─▶ [VieNeu-TTS]  lời thoại → giọng Việt, clone giọng riêng cho từng nhân vật
   │
   └─▶ [ffmpeg]  ghép shot, mix âm, burn phụ đề, xuất 16:9 + cắt 9:16
```

---

## 2. Bảng provider

| # | Khâu | Provider | Chi phí | Ai chạy |
|---|---|---|---|---|
| 1 | Nạp truyện, dựng story bible | Claude | Trong subscription | Claude viết, bạn nạp |
| 2 | Kịch bản, phân tập, phân cảnh, lời thoại | Claude | Trong subscription | Claude viết, bạn nạp |
| 3 | Prompt ảnh (nhân vật, đạo cụ, bối cảnh, shot) | Claude | Trong subscription | Claude |
| 4 | Sinh ảnh | **ChatGPT** | Gói ChatGPT của bạn | Bạn, thủ công |
| 5 | Đưa ảnh vào project | script upload | 0 | Bạn chạy 1 lệnh |
| 6 | Ảnh → video từng shot | **ComfyUI local** (Wan2.2) | 0, cần GPU | Bạn |
| 6b | — nếu không có GPU | Seedance qua NewAPI | **Trả tiền** | Bạn |
| 7 | Lồng tiếng + clone giọng | **VieNeu-TTS** | 0, Apache 2.0 | Bạn |
| 8 | Ghép, phụ đề, nhạc, đa tỉ lệ | ffmpeg | 0 | Claude viết script, bạn chạy |

Chỉ còn **một** ô có chữ "trả tiền", và chỉ khi bạn không có GPU.

---

## 3. Khâu 4–5: ảnh từ ChatGPT vào DramaClaw

### Quy ước đặt tên file

Đặt tất cả ảnh tải về vào một thư mục. Script đọc tên file để biết đẩy vào đâu — đặt sai tên thì script bỏ qua chứ không đoán bừa.

| Tên file | Vào đâu |
|---|---|
| `char__<tên-nhân-vật>__portrait.png` | Ảnh chân dung nhân vật |
| `char__<tên>__identity__<identity_id>.png` | Ảnh một identity (tạo hình) của nhân vật |
| `char__<tên>__costume__<identity_id>.png` | Ảnh trang phục của identity đó |
| `scene__<tên-cảnh>__master.png` | Ảnh chính của bối cảnh |
| `scene__<tên-cảnh>__pano.png` | Ảnh toàn cảnh |
| `beat__<tập>__<beat>__render.png` | **First-frame của một shot** — dùng nhiều nhất |
| `beat__<tập>__<beat>__sketch.png` | Sketch của shot |
| `voice__<tên-nhân-vật>__<slot>.wav` | Mẫu giọng cho nhân vật |
| `narrator.wav` | Giọng người dẫn truyện |

Tên nhân vật/cảnh có dấu cách thì thay bằng `-`. Script tự chuyển lại.

### Chạy

```bash
# xem trước, không gửi gì
uv run python docs/vi/upload_manual_assets.py --project <project-id> --dir ~/Downloads/assets

# gửi thật
uv run python docs/vi/upload_manual_assets.py --project <project-id> --dir ~/Downloads/assets --apply
```

Script dùng thư viện chuẩn của Python, không cần cài thêm gì. CE tin request từ loopback là chủ sở hữu nên thường không cần token; nếu nhận 401 thì lấy cookie phiên từ trình duyệt và truyền qua `--cookie`.

### Endpoint tương ứng (nếu bạn muốn tự gọi)

Tất cả đều `POST`, base `http://localhost:8780/api/v1`, body `multipart/form-data`, tên trường là `file`:

```
/projects/{project}/characters/{name}/portrait/upload
/projects/{project}/characters/{name}/identities/{identity_name}/upload
/projects/{project}/characters/{name}/identities/{identity_id}/costume/upload
/projects/{project}/characters/{name}/identities/{identity_id}/portrait/upload
/projects/{project}/characters/{name}/voice-samples/{slot}/upload
/projects/{project}/scenes/{name}/master/upload
/projects/{project}/scenes/{name}/pano/upload
/projects/{project}/scenes/{name}/custom/upload
/projects/{project}/episodes/{ep}/beats/{beat}/render/upload
/projects/{project}/episodes/{ep}/beats/{beat}/sketch/upload
/projects/{project}/episodes/{ep}/beats/{beat}/background-anchor/upload
/projects/{project}/narrator-voice/upload
/projects/{project}/freezone/upload
/projects/{project}/ingest/upload
```

### Giữ nhân vật nhất quán khi gen bằng ChatGPT

Đây là chỗ bạn mất nhiều nhất khi bỏ nanobanana — pipeline vốn có `render_identity_guard.py` lo hộ việc này, gen tay thì bạn phải tự kỷ luật:

- **Một nhân vật, một cuộc hội thoại ChatGPT.** Đừng trộn hai nhân vật vào một chat.
- Gen **character sheet** trước: một ảnh nhiều góc (chính diện, nghiêng, sau lưng), ánh sáng phẳng, nền trơn. Đây là ảnh gốc.
- Mọi ảnh sau đó: **đính kèm ảnh gốc** và yêu cầu giữ đúng khuôn mặt, tóc, trang phục.
- Mô tả nhận dạng phải **lặp lại nguyên văn** ở mọi prompt — cùng một câu, không diễn đạt lại. Claude sẽ chuẩn bị sẵn đoạn mô tả cố định này cho từng nhân vật.
- Tránh: nhiều người trong một khung, bàn tay cận cảnh, chữ trong ảnh.
- Kiểm tra ToS của OpenAI về quyền sử dụng ảnh cho mục đích của bạn trước khi phát hành thương mại.

---

## 4. Khâu 7: VieNeu-TTS

Giọng Việt, clone từ clip 3–8 giây, Apache 2.0, chạy offline. Thay thế cả Edge TTS lẫn IndexTTS2 trả phí.

- `style="doc_truyen"` cho phần dẫn truyện, `"tu_nhien"` cho thoại.
- Clone giọng: `tts.add_voice("Tên nhân vật", "mau_giong.wav")` rồi `tts.save_voices()` để dùng lại.
- **Cảnh báo:** README ghi rõ cloning và `add_voice` cần engine PyTorch (`uv sync --group gpu`). Đường ONNX/CPU nhanh nhất **chỉ chạy 14 giọng preset**, không clone được.
- Sinh xong, đẩy vào project qua `narrator-voice/upload` hoặc `voice-samples/{slot}/upload` cho từng nhân vật.

Tích hợp sâu hơn: thêm hẳn nhánh provider `vieneu` vào `src/novelvideo/generators/tts_generator.py`, cạnh `edge` và `cosyvoice`, đọc `reference_audio_path` của nhân vật để tự clone. Khi đó lồng tiếng nằm trong pipeline chính thay vì chạy ngoài.

---

## 5. Điều khiển bằng agent

Repo có sẵn MCP server (`src/novelvideo/chat/dramaclaw_mcp.py`, ~34 tool) và `.mcp.json` đã trỏ `http://localhost:8780` với `DRAMACLAW_CE_OWNER=1`. Chạy Claude Code trên **máy bạn** thì agent gọi được `dramaclaw_plan_episodes`, `dramaclaw_generate_script`, `dramaclaw_render_first_frames`, `dramaclaw_compose_episode`...

Hai giới hạn thật:

- **Bộ tool MCP không có tool upload file.** Ảnh gen tay vẫn phải vào bằng script hoặc UI.
- **Phiên hiện tại không gọi được.** Sandbox của tôi là máy Linux riêng, không thấy `localhost` của bạn, và egress bị chặn. Tôi viết code, bạn chạy.

---

## 6. Việc còn lại của Claude

- Story bible, phân tập, phân cảnh, lời thoại — thay toàn bộ ~13 biến `*_MODEL` đang gọi model tính tiền.
- Prompt ảnh cho từng nhân vật/cảnh/shot, kèm đoạn mô tả nhận dạng cố định.
- Script upload, script ffmpeg hậu kỳ, nhánh provider `vieneu`.
- Không làm được: sinh ảnh, sinh video, chạy lệnh trên máy bạn.
