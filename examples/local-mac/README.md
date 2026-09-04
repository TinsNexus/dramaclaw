# DramaClaw CE — Local Model Stack trên Mac M2 (16GB)

Hướng dẫn tự host toàn bộ provider model cho DramaClaw CE trên Mac Apple Silicon,
**giữ nguyên kiến trúc ComfyUI + NewAPI**, chỉ thay các upstream trả phí (OpenRouter,
VolcEngine, fal.ai, DoubaoAudio) bằng model local — giải bài toán kinh tế khi chạy
pipeline truyện → video thường xuyên.

> ⚠️ **Ràng buộc phần cứng (đọc trước):** Mac M2 16GB có ~10–12GB thực dùng được
> cho model (macOS chiếm 4–6GB). Đây là cấu hình **dev/test/preview**: video chất
> lượng cao nên render batch trên GPU cloud thuê giờ (xem mục *Kinh tế*).

## Kiến trúc

```
Host (native, MPS):   Ollama (:11434)  +  ComfyUI (:8188)  +  Kokoro TTS (:8880)
                                │  host.docker.internal
Docker (CPU-only):    api (:8780)  +  NewAPI (:3000)  +  web (:8080)
```

Docker trên Mac **không có GPU** (đã ghi rõ trong `docker-compose.selfhosted.yml`),
nên mọi model chạy native trên host; container chỉ chạy API + NewAPI + web.

| Nhu cầu | Model | Ghi chú trên M2 16GB |
|---|---|---|
| Text / truyện (`DC-*-LLM`) | `qwen3:8b` | ~5.2GB, 25–40 tok/s ✅ |
| Vision (`DC-freezone-vision-LLM`, sketch gate) | `qwen2.5vl:7b` | ~5.5GB ✅ |
| Embedding (`DC-cognee-embedding`) | `bge-m3` | **bắt buộc 1024 dim** (repo fix cứng) ✅ |
| Video (I2V) | **Wan 2.1 Fun 1.3B** (MPS, ~3GB) + UMT5 GGUF Q4 | ⚠️ chạy được nhưng chậm (xem "Hiệu năng đo được") |
| TTS | **Kokoro** (54 giọng) / **Piper** (vi) | ✅ test OK, 2–4s/lượt |

## Hiệu năng đo được (test thật trên máy này, 16GB)

| Cấu hình | Kết quả đo | Kết luận |
|---|---|---|
| Wan 2.2 5B **GGUF Q4** (GGML) | 470–560s/step (30 steps → ~4.5h/clip) | ❌ GGUF chạy **CPU** trên Mac (GGML không Metal) |
| Wan 2.2 5B **fp16** (MPS) | 245s/step — swap 16GB (UNET 9.5GB + UMT5 4.6GB + VAE + macOS > 16GB) | ❌ RAM 16GB không đủ cho 5B |
| Wan 2.1 **Fun 1.3B** (MPS) | ~20–45s/step nếu RAM trống; **đứng hình 0% CPU nếu đang mở Chrome/PhpStorm/VM** | ⚠️ khả thi preview khi giải phóng RAM |

**Kết luận trung thực:** Mac M2 16GB chỉ làm được **preview rất chậm** cho video gen. Toàn bộ phần text/vision/embedding/TTS chạy tốt; riêng video nên render trên **GPU cloud thuê giờ** (cùng workflow, chạy 10–50× nhanh hơn — xem mục 6).

**Vì sao Wan 2.1 Fun 1.3B là mặc định trên Mac?** Đã test thực tế (xem bảng hiệu năng
trên): Wan 2.2 5B (GGUF lẫn fp16) không chạy nổi trên 16GB — GGUF chạy CPU (không
Metal), fp16 tràn RAM gây swap. **Wan 2.1 Fun Inpaint 1.3B** (I2V qua first-frame,
~3GB, node `WanFunInpaintToVideo` có sẵn trong core ComfyUI) là model duy nhất vừa
RAM. Workflow Wan 2.2 5B vẫn giữ trong thư mục để dùng trên **GPU cloud** (mục 6).

## 1. Cài stack (một lệnh)

```bash
bash examples/local-mac/setup-mac.sh
```

Script cài: Ollama + 3 model, ComfyUI + node `ComfyUI-GGUF` + model Wan 2.2 5B
(UNET GGUF + UMT5 GGUF + VAE), Kokoro TTS (`pip install kokoro-onnx` + model
trong `~/.kokoro/`).

## 2. Khởi động 3 service (3 terminal)

```bash
# 1) Ollama — mở 0.0.0.0 để container NewAPI truy cập được qua host.docker.internal
OLLAMA_HOST=0.0.0.0 ollama serve

# 2) ComfyUI
cd ~/ComfyUI && ./venv/bin/python main.py --listen 0.0.0.0 --port 8188

# 3) Kokoro TTS (OpenAI-compatible /v1/audio/speech)
~/kokoro-fastapi-venv/bin/python examples/local-mac/kokoro_server.py --port 8880

# 4) [Nếu cần tiếng Việt] Piper TTS — Kokoro v1.0 không có giọng vi
~/piper-venv/bin/python examples/local-mac/piper_server.py --port 8881
```

Kiểm tra nhanh:

```bash
curl -s http://localhost:11434/api/tags | head -c 200     # Ollama
curl -s http://localhost:8188/system_stats | head -c 200  # ComfyUI
curl -s http://localhost:8880/health | head -c 200        # Kokoro
curl -s http://localhost:8881/health | head -c 200        # Piper (vi)
curl -s -X POST http://localhost:8881/v1/audio/speech -H "Content-Type: application/json" \
  -d '{"model":"vi_VN-vais1000-medium","input":"Xin chào, đây là giọng đọc tiếng Việt.","voice":"vi_VN-vais1000-medium"}' \
  -o /tmp/tts-vi.wav && file /tmp/tts-vi.wav
```

> ⚠️ **Kokoro v1.0 không có giọng tiếng Việt** (54 giọng: en/zh/ja/es/fr/hi/it/pt/ko/nl/ru/pl).
> **Piper** (`vi_VN-vais1000-medium`, port 8881) phủ phần này — xem mục 4b.

## 3. Test workflow video trước (quan trọng)

> ⚠️ **Trước khi render trên Mac**: đóng Chrome/PhpStorm/VM — máy 16GB đang thiếu
> RAM sẽ làm render **đứng hình** (đã đo: 0% CPU, kẹt swap). Cần ≥ 4GB RAM trống.

1. Copy 1 ảnh first-frame vào `~/ComfyUI/input/` và đổi tên thành `beat_12.png`
   (hoặc sửa tên file trong node `LoadImage` của workflow).
2. Mở browser `http://localhost:8188`, dán nội dung
   `examples/local-mac/workflows/wan2.1-1.3b-fun-i2v.json` vào **Default → Load (API
   format)** hoặc dùng nút "Load" trong tab workflow, rồi **Queue**.
3. Chờ video 704×480 (~121 frame, 16fps ≈ 7.5s). Trên M2 16GB: **~30–60 phút/clip**
   — muốn nhanh hơn, giảm `length` (node 63) xuống 41 (~2.5s) và `steps` (node 57)
   xuống 12 → ~5–10 phút/clip preview.

> Workflow dùng node-id mà `ComfyUIVideoGenerator` (đường GGUF trong
> `video_generator.py`) patch (`62` LoadImage, `63` latent node `.length`, `6`
> positive, `7` negative, `57` seed, `61` SaveVideo) — tương thích đường gọi trực
> tiếp của sản phẩm (xem mục 6).

## 4. Nối vào DramaClaw CE

```bash
docker compose -f docker-compose.selfhosted.yml up -d --build
```

Mở `http://localhost:8080` → **Settings → Models & Channels**:

1. Chọn **Custom** → **Initialize Local NewAPI** (đặt mật khẩu root ≥ 8 ký tự).
2. Mở **My Config**, dán toàn bộ nội dung `examples/local-mac/ce-local-profile.json`
   → **Save & Apply All**.
3. Khi UI hỏi key từng channel: với **Ollama** và **tts-local** điền key giả
   (vd `ollama` / `local`) — backend yêu cầu `upstreamKey` không rỗng cho mọi
   provider (trừ ComfyUI), nhưng endpoint local bỏ qua key.
4. Profile đã đăng ký sẵn: channel Ollama (text/vision/embedding), channel ComfyUI
   kèm workflow Wan 2.2 5B (media model `wan2.2-5b-i2v-local`), channel TTS local
   (media model `index-tts-2` → `kokoro`).

> Lưu ý: **ComfyUI channel** trong profile dùng `host.docker.internal:8188` vì
> NewAPI chạy trong container. Nếu chạy API native (`uv run novelvideo api --port
> 8780` — tiết kiệm RAM) thì đổi về `http://127.0.0.1:8188` / `:11434`.

## 5. Feature / media model mapping (đã có trong profile)

- `DC-*-LLM` → `qwen3:8b` (kênh ollama); muốn override riêng từng logical name,
  thêm vào `featureModels.overrides`, vd:
  ```json
  "overrides": {
    "DC-hermes-LLM": { "channel": "ollama", "model": "qwen3:8b" },
    "DC-scene-builder-LLM": { "channel": "ollama", "model": "qwen3:14b" }
  }
  ```
- `DC-cognee-embedding` → `bge-m3`, dimension **1024** (không đổi được — repo fix
  cứng `COGNEE_EMBEDDING_DIMENSIONS = 1024`; `nomic-embed-text` 768 sẽ lỗi).
- Embedding dimension bị khóa lúc **tạo project** — chọn đúng trước khi tạo project
  mới; project cũ giữ nguyên config cũ.
- Media model video `wan2.1-1.3b-fun-i2v-local` đã gắn workflow; vào **Manage
  Channels → ComfyUI** để xem/sửa capabilities (resolutions `480p/640p`, ratios
  `16:9/1:1`, modes `image_to_video`, `image_reference`).

## 5b. TTS tiếng Việt (Piper)

Profile mặc định trỏ `index-tts-2` → **Kokoro** (port 8880, không có giọng vi).
Muốn TTS tiếng Việt, chạy Piper (đã cài sẵn bởi `setup-mac.sh`) rồi đổi channel:

1. Chạy: `~/piper-venv/bin/python examples/local-mac/piper_server.py --port 8881`
2. Trong **Settings → Models & Channels → Custom → Advanced Settings → Provider
   Channels**: sửa channel `tts-local` → `baseUrl: http://host.docker.internal:8881/v1`,
   và media model `index-tts-2` → `model: vi_VN-vais1000-medium`.
3. Test: `curl -X POST http://localhost:8881/v1/audio/speech -d '{"input":"Xin chào"}'`

## 6. Render video thật trên GPU cloud (khuyến nghị)

Mac M2 16GB không đủ sức cho video production (xem "Hiệu năng đo được"). Cách dùng
đúng: **thuê GPU box theo giờ** (4090/A6000, ~$0.4–1/h) và chạy **cùng workflow
ComfyUI** này — cấu hình sản phẩm không đổi, chỉ đổi địa chỉ ComfyUI.

Trên box GPU (Linux + GPU 16–24GB), dùng:
- `examples/local-mac/workflows/wan2.2-5b-i2v-fp16.json` (Wan 2.2 5B fp16, MPS→CUDA
  chạy ~5–15s/step) — hoặc
- `examples/local-mac/workflows/wan2.2-5b-i2v-gguf.json` (GGUF Q4 — chạy GPU nhanh,
  và là bản node-id tương thích với `ComfyUIVideoGenerator` đường GGUF của sản phẩm;
  copy đè lên `src/novelvideo/generators/wan2-2-I2V-GGUF-LightX2V.json` sau khi backup,
  set trong `.env`: `COMFYUI_ADDRESS=<box-ip>:8188`, `COMFYUI_WORKFLOW=gguf`).

Models cần trên box: Wan 2.2 5B (fp16 hoặc GGUF Q4) + UMT5 GGUF Q4 + `wan2.2_vae` —
tất cả đã ghi trong `setup-mac.sh` (chạy lại trên box, hoặc copy thư mục `models/`).

Profile `ce-local-profile.json` hiện nhúng workflow **1.3B Fun** (chạy được trên Mac).
Muốn box GPU xử lý video: thay workflow nhúng trong channel ComfyUI bằng nội dung
file fp16/GGUF 5B tương ứng (cùng node-id, đổi tên model thành `wan2.2-5b-i2v-local`).

## 7. Quản lý RAM (sống còn trên 16GB)

- **Đóng Chrome/PhpStorm/VM trước khi render video** — thiếu RAM làm render đứng
  hình (đã đo: 0% CPU, kẹt swap 16GB). Cần ≥ 4GB RAM trống.
- Không chạy đồng thời: ComfyUI + Ollama 14B + Docker stack đầy đủ.
- Khi render nặng: tắt Docker stack (`docker compose ... down`), chạy API native
  `uv run novelvideo api --port 8780` để tiết kiệm RAM.
- `OLLAMA_KEEP_ALIVE=0` để model rời RAM ngay khi không dùng.
- Muốn video nhanh hơn trên Mac: giảm `length` (node 63) xuống 41 và `steps`
  (node 57) xuống 12; hạ resolution xuống 512×288.

## 8. Troubleshooting

| Triệu chứng | Xử lý |
|---|---|
| NewAPI báo không kết nối được ComfyUI/Ollama | URL phải là `host.docker.internal` (không phải `127.0.0.1`) khi chạy trong Docker; service host phải listen `0.0.0.0` |
| Lỗi "upstreamKey is required" khi lưu channel | Điền key giả (`ollama` / `local`) cho Ollama & TTS; riêng ComfyUI để trống |
| Embedding HTTP 400/422 | Model phải ra đúng **1024 dim** (`bge-m3` ✓); batchSize ≤ 10 |
| Workflow báo thiếu node | Cài `ComfyUI-GGUF` (đã có trong script); thiếu model → đối chiếu tên file trong `models/unet|vae|text_encoders` |
| Workflow báo thiếu model `wan2.1_fun_inp_1.3B_bf16.safetensors` | File UNET nằm trong `models/diffusion_models/`; đúng tên từ `Comfy-Org/Wan_2.1_ComfyUI_repackaged` |
| Video quá chậm / máy đứng (0% CPU) | Đang kẹt swap — đóng Chrome/PhpStorm/VM, giảm `length` (41) + `steps` (12) + resolution (512×288). Muốn nhanh thật sự: render trên GPU cloud (mục 6) |
| `Wan22ImageToVideoLatent`/5B model tràn RAM | Trên Mac 16GB chỉ dùng workflow **1.3B**; các workflow 5B (fp16/GGUF) dành cho GPU cloud |
| TTS không hoạt động | Server: `~/kokoro-fastapi-venv/bin/python examples/local-mac/kokoro_server.py --port 8880`; model phải nằm trong `~/.kokoro/`; test bằng curl POST `/v1/audio/speech`. Channel `tts-local` là best-effort — nếu NewAPI không hỗ trợ audio model với endpoint này, giữ `doubao_audio`/fal.ai cho riêng audio |
| TTS không có tiếng Việt | Kokoro v1.0 chưa hỗ trợ vi — chạy Piper (`~/piper-venv/bin/python examples/local-mac/piper_server.py --port 8881`) và đổi channel `tts-local` sang port 8881 / model `vi_VN-vais1000-medium` (mục 5b) |
| Sketch gate lỗi | `sketch_visual_gate.py` đọc `SKETCH_GATE_PROVIDER` / `SKETCH_GATE_API_KEY` / `SKETCH_GATE_MODEL` — trỏ về local VL model qua endpoint OpenAI-compatible hoặc tắt gate khi preview |

## 9. Kinh tế

- Mac = chi phí biên gần 0 (chỉ điện) → dev, test, storyboard, preview mỗi ngày.
- Render video final chất lượng cao → thuê GPU cloud theo giờ (4090/A6000
  ~$0.4–1/h) chạy batch vài chục clip/đợt, rẻ hơn mua GPU.
- Khi volume đủ lớn (vài chục clip/tuần liên tục) → mua GPU 24GB (3090 cũ ~$500)
  làm box render riêng mới đáng đầu tư.
