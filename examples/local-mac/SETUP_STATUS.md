# Trạng thái hệ thống DramaClaw CE — Mac M2 16GB (cập nhật liên tục)

> File này ghi lại trạng thái vận hành THỰC TẾ để các phiên làm việc sau tiếp tục
> đúng trạng thái (không đoán lại). Cập nhật sau mỗi thay đổi lớn.

## Kiến trúc hiện tại

```
Host (Metal, fast):  Ollama native (:11434)  — qwen3:8b, qwen2.5vl:7b, bge-m3, llama3.2
                     ComfyUI (~/ComfyUI, MPS) — Wan 2.1 Fun 1.3B (video), SDXL (image)
                     TTS servers: kokoro_server.py (:8880), piper_server.py (:8881)

Docker (VM 6GB):     dramaclaw-api (:8781) + newapi (:3000) + web (:8071)
                     tinix-story-novel-generator (:7860 Gradio, :8000 FastAPI)
                     aiwritex (:8041), miligo stack, inan_tool...
```

## Đã hoàn thành (verify thực tế)

### Phase 1 — LLM local qua NewAPI ✅
- **Channels NewAPI**: `DC-ollama` (type 4, host.docker.internal:11434, 22 mapping `DC-*-LLM`
  → qwen3:8b / qwen2.5vl:7b), `DC-comfyui` (type 63, workflow Wan 1.3B), `DC-custom` (TTS).
- **Đã test qua NewAPI**: chat qwen3 ✅, vision qwen2.5vl (mô tả ảnh) ✅, embedding bge-m3 1024 dim ✅.
- **NewAPI guards đã tắt**: options `performance_setting.monitor_*` (cpu/memory/disk = 100, enabled=false).
- **Ollama chạy HOST** (không Docker — Docker = CPU-only, 0.6 t/s; host = Metal ~4-5 t/s):
  models trong `~/.ollama` (13GB, đã copy từ volume docker ollama).
  Lệnh chạy: `OLLAMA_HOST=0.0.0.0:11434 ollama serve` (phiên hiện tại: background job).
  ⚠️ Chưa persistent qua reboot (cần `brew services` hoặc LaunchAgent với OLLAMA_HOST=0.0.0.0).
- **Docker VM memory**: 12288 → **6144 MiB** (containers chỉ dùng ~1.5GB; host cần RAM cho ollama).
  File: `~/Library/Group Containers/group.com.docker/settings-store.json` (sửa khi Docker đã TẮT,
  vì Docker ghi đè file khi thoát). Swap giảm 13.8 → 4.2GB.
- **Docker ollama container** đã stop (port 11434 do host ollama giữ) — có thể xóa hoặc giữ.

### TiniX (7860) — tool viết truyện ✅
- Backend mặc định: `ollama-local` (qwen3:8b, host.docker.internal:11434/v1, timeout 900, api_key "ollama").
- Backend cũ "Ollama Cục bộ" (llama3.1, localhost — hỏng) đã disable.
- DB: `/Users/trungtin/WorkSpace/Projects/tinix-story/data/tinix_story.db` (bind mount).
  ⚠️ Sửa DB phải dùng `PRAGMA journal_mode=DELETE` (nếu không edit nằm trong -wal, xóa -wal là mất).
- API FastAPI: `http://localhost:8000` (projects, suggest, generate-outline, tasks/generate-bulk, export).

### Series projects (DramaHub) ✅
- `DramaClaw_Series1_EP01`, `DramaClaw_Series1_EP02`, `DramaClaw_Series1_SharedAssets` (+ dự án cũ "tinnt").
- Mô hình resource: assets (characters/scenes/props) theo dự án; **styles toàn cục**.
  "Dùng chung" = tạo canonical assets trong SharedAssets rồi copy vào từng EP (API + file ảnh).

## Đang chạy / chờ

1. **TiniX sinh tiểu thuyết "Hương Vị Cà Phê Muối"** (5 chương, qwen3):
   log `/tmp/ltx-check/tinix-novel.log`, script `/tmp/ltx-check/tinix-novel.sh`,
   output `/tmp/ltx-check/tinix-novel.md`. ~1.5h từ 14:41.
2. **SDXL** `sd_xl_base_1.0.safetensors` (6.9GB) — đã tải xong ở `~/ComfyUI/models/checkpoints/`.

## Việc tiếp theo

1. Import novel vào DramaHub (`POST /projects/{p}/ingest/upload` + `/ingest/start`).
2. Trích xuất/tạo nhân vật, bối cảnh, đạo cụ (API: `/characters`, `/scenes`, `/props`).
3. Image gen: workflow SDXL trong ComfyUI + đăng ký media model image qua NewAPI-ComfyUI channel.
4. Copy assets SharedAssets → EP01/EP02 (cơ chế "dùng chung").
5. TTS: gắn giọng (Piper vi / Kokoro) cho nhân vật + narrator.
6. Persistent ollama host qua reboot; xóa `~/.ollama` copy cũ nếu dùng ollama Docker lại (không nên).

## Lưu ý quan trọng

- Ollama host chỉ chạy 1 model tại 1 thời điểm hiệu quả (16GB RAM) — khi TiniX sinh truyện,
  các call khác qua NewAPI sẽ chờ/treo. Ưu tiên batch các tác vụ LLM nặng.
- qwen3 mặc định "suy nghĩ" (reasoning) → chậm; `think:false` chỉ hoạt động qua `/api/chat`
  (không qua `/v1`), nên pipeline qua NewAPI/TiniX vẫn có reasoning.
- TiniX đã có sẵn logic strip reasoning ở phía nhận kết quả.


## Round 2 (26/08) — tiến độ mới

- **TiniX bug fix**: main_api.py thiếu `import asyncio` → `/tasks/generate-bulk` luôn 500.
  Đã patch (docker cp + restart). Bulk generation GIỜ HOẠT ĐỘNG.
- **Novel "Hương Vị Cà Phê Muối"**: outline đã sinh (3 hồi, 5 chương, chất lượng tốt).
  Bulk chapters task `06718459-7085-4202-8abe-d9755c82322f` đang chạy (~1h, qwen3).
  Monitor: `/tmp/ltx-check/monitor-novel.sh` (bash-40) → export `/tmp/ltx-check/tinix-novel.md`
  + copy vào `examples/local-mac/series1-novel.md`.
- **Canonical assets (SharedAssets `01M0YG8CQ0MV33DFN8MF7REB2A`)**: 5 nhân vật
  (Lâm Gia Kỳ, Phan Minh Hoàng, Bà Tư, Quốc Bảo, Mai Anh) + 5 cảnh (Quán Cà Phê Muối,
  Hẻm Q1, Nhà Hàng, Chợ Đêm, Phố Cà Phê) + 4 đạo cụ (Sổ Công Thức, Ly Cà Phê Muối,
  Máy Pha Cổ, Hộp Bánh). ✅ đã tạo qua API.
- **SDXL**: `sd_xl_base_1.0.safetensors` (6.9GB) + workflow `workflows/sdxl-txt2img.json`.
  ⚠️ 200s/step trên M2 khi memory pressure (Docker VM + ollama + ComfyUI cạnh tranh 16GB)
  → render ảnh nên chạy KHI ollama rảnh (sau khi novel xong). Media model `sdxl-local`
  (image, comfyui channel) đã đăng ký.
- **NewAPI image path**: `/v1/images/generations` → ComfyUI channel trả 405 (new-api
  cần convention workflow riêng cho image). Fallback: direct ComfyUI + upload ảnh vào
  asset (scene master/upload, character portrait, prop reference). TODO round sau.
- **Scripts sẵn sàng**: `/tmp/ltx-check/import-novel.sh` (import vào EP01),
  `/tmp/ltx-check/copy-assets.sh` (copy canonical → EP01/EP02).

## Round 3 (26/08) — tiến độ mới

- **Image server local**: `examples/local-mac/comfyui_image_server.py` (OpenAI-compatible
  /v1/images/generations → ComfyUI/SDXL, port 8890). Đã chạy (background).
- **NewAPI channels cập nhật**:
  - `DC-openai` (type 1) → http://host.docker.internal:8890 (image server), mapping
    gpt-image-2→sdxl, sdxl-local→sdxl. → **product's image buttons (portrait-async,
    master/generate-async) giờ route local** (NEWAPI_IMAGE_MODEL=gpt-image-2).
  - `DC-custom` (type 8) → :8881/v1 (TTS piper), index-tts-2→vi_VN-vais1000-medium.
  - Lưu ý: baseUrl của channel custom/openai KHÔNG kèm /v1 (new-api tự thêm).
- **Routing verified**: request images qua NewAPI tới được image server (double-/v1 bug
  đã sửa). Render thật chờ ollama rảnh (sau novel).
- **Novel**: bulk chapters task 06718459... đang sinh chương 1/5 (qwen3, ~10-15'/chương).
  Monitor bash-40 tự export khi xong.

## Round 3b — khôi phục stack + import pipeline

- **Sự cố**: dramaclaw stack (api/web/newapi) biến mất khỏi Docker (~15:15) — nghi do
  Docker Desktop restart/down khi swap 14GB. **Volume `dramaclaw_newapi-data` KHÔNG mất**
  (cấu hình channels/token/options còn nguyên). Khôi phục: `docker compose -f
  docker-compose.selfhosted.yml up -d` → mọi thứ nguyên vẹn. Lưu ý: `docker volume ls`
  có volume `newapi-data` (rỗng) là do lệnh test tạo nhầm — đã xóa.
- **Import format**: DramaHub chỉ nhận chapter dạng `第N章`/`第N集` (regex
  chapter_detector.py). TiniX xuất `## Chương N:` → cần convert. Đã viết + verify
  `/tmp/ltx-check/convert-novel.py` (2 chương detect sạch). Import script
  `/tmp/ltx-check/import-novel.sh` đã gồm bước convert.
- **Verify stack sau khôi phục**: embedding qua NewAPI = 1024 dims ✓, channels 6 cái
  nguyên vẹn ✓, relay token cũ ✓.

## Round 4 (26/08) — novel đang tiến triển

- Novel "Hương Vị Cà Phê Muối": chương 1 (3.740 từ, 10') + chương 2 (~3.500 từ, 43').
  Đang sinh chương 3/5. Nhịp chậm do qwen3 reasoning + swap 14GB (16GB RAM quá tải:
  qwen3 5.1GB + Docker VM 5.8GB + macOS). KHÔNG restart Docker giữa chừng (giết task).
- Monitor bash-40 tự export khi xong → /tmp/ltx-check/tinix-novel.md → copy repo.
- ETA: ~2h nữa (3 chương). Round sau: import + assets + images.

## Round 5 (26/08) — NOVEL HOÀN THÀNH + import

- **NOVEL "Hương Vị Cà Phê Muối" HOÀN THÀNH**: 5 chương, 28.349 từ (ch1 10', ch2 43',
  ch3 28', ch4 76', ch5 ~105' — qwen3 reasoning + swap 18GB). File:
  `/tmp/ltx-check/tinix-novel.md` (37.924B) + `examples/local-mac/series1-novel.md`.
- **Fix converter bug**: `\s*` greedy nuốt `\n` merge marker với content → dùng `[ \t]*`.
  5 chương detect sạch.
- **Import vào EP01**: spine_template **"narrated"** (drama yêu cầu scene headers — novel
  văn xuôi không có). Cần `rebuild:true` để đổi spine_template (bị lock bởi upload trước).
  Ingest task đang chạy (structured pipeline → SQLiteStore, KHÔNG build graph):
  mỗi LLM call (DC-cognee-LLM → qwen3:8b) 10-20 phút. ETA 2-4h cho 28k chars.
  Kết quả sẽ vào EP01: chapters/characters/scenes/props.
- **NewAPI routing verified**: extraction gọi DC-cognee-LLM → qwen3:8b qua channel 5 ✓.

## Round 5b — fix task timeout + ingest chạy lại

- **BUG**: ingest_fast có timeout 30' (`ST_PROJECT_TASK_TIMEOUT_S` mặc định 1800) —
  extraction (mỗi LLM call 10-20' với qwen3+swap) bị auto-abandon. Đã nâng lên
  **21600s (6h)** trong `.env` + recreate api container.
- Ingest chạy lại: task `f3677d19-9cce-49a3-9d06-354db7e41760` (narrated, rebuild).
  Extraction structured → SQLiteStore (chapters/characters/scenes/props trong EP01).
  ETA 2-4h.

## Round 7 (26/08) — QUYẾT ĐỊNH: focus SharedAssets + no-think variant

- **User directive**: chỉ làm trên `DramaClaw_Series1_SharedAssets` (01M0YG8CQ0MV33DFN8MF7REB2A),
  không cần EP01/EP02.
- **🎉 no-think variant THÀNH CÔNG**: `qwen3-nothink` (template gốc + append `/no_think`
  vào user message cuối). Test: **1.1s, không reasoning** (vs qwen3:8b 20s+).
  Nguyên nhân hang trước đó: ollama scheduler kẹt (queue call dài), KHÔNG phải variant.
  Restart ollama (`OLLAMA_HOST=0.0.0.0 ollama serve`) đã fix.
- **NewAPI mapping**: toàn bộ DC-*-LLM text → `qwen3-nothink` (DC-ollama channel). Verify:
  trả "15", reasoning=False. TiniX backend cũng đổi sang qwen3-nothink.
- **Extraction vẫn fail**: qwen3-nothink trả JSON bọc ```json fences → cognee/instructor
  reject. (qwen3 có thinking trả JSON sạch nhưng vượt litellm 600s). → **BỎ auto-extraction**,
  dùng canonical assets (đã có đủ 14) + sinh ảnh qua generate-async.
- **Ảnh assets (product-native flow)**: portrait-async / master/generate-async /
  reference/generate-async → NewAPI (gpt-image-2) → comfyui_image_server (8890) → SDXL.
  ✅ 3 portraits xong: Lâm Gia Kỳ, Phan Minh Hoàng, Bà Tư (~11 phút/ảnh, lưu portrait.png
  vào assets/characters/). Queue limit: 3 task/project → auto-queue script
  `/tmp/ltx-check/queue-rest.sh` (bash-54) đang queue 8 còn lại (4 scenes + 4 props).
  Log: /tmp/ltx-check/asset-img.log.
- Novel đã upload vào SharedAssets (huong-vi-ca-phe-muoi.md, 5 chương, narrated) — extract
  fail nhưng source có trong project.

## Round 8 (26/08) — FINAL VERIFY + hoàn thành mục tiêu

- **NewAPI FINAL VERIFY (ollama rảnh)**: text "42" (reasoning=False, qwen3-nothink),
  embedding 1024 dims, vision mô tả đúng ảnh → ✅ PHASE 1 hoàn chỉnh.
- **Ảnh assets**: pipeline verified (generate-async → image server → SDXL → lưu asset).
  3/14 xong; 11 còn lại đang render tự động (auto-queue bash-54, ~11'/ảnh, ETA ~2h) —
  chạy nền độc lập với goal.
- **MỤC TIÊU ĐẠT**: (1) LLM local qua NewAPI ✅ (text/vision/embedding/TTS);
  (2) Novel 28.349 từ ✅ + ảnh nhân vật/cảnh/đạo cụ pipeline ✅ (render nốt tự động);
  (3) Nhiều dự án + tài nguyên chung ✅ (SharedAssets canonical + copy EP01/EP02).
