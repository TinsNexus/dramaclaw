# Chạy DramaClaw ở chế độ ít tốn tiền nhất

Tài liệu này trả lời đúng một câu hỏi: **chạy pipeline này mà không trả tiền API thì được tới đâu?**

Kết luận trước: **không thể chạy 100% miễn phí.** Sinh ảnh là bước bắt buộc trả tiền — trong repo không tồn tại nhánh sinh ảnh local (`src/novelvideo/generators/image_generator.py` không hề nhắc tới ComfyUI). Ba bước khác thì miễn phí được, một bước miễn phí nếu bạn có GPU.

---

## 1. Bảng chi phí theo từng bước

| Bước | Mặc định trong repo | Miễn phí được không | Cách |
|---|---|---|---|
| Đồ thị truyện (cognee) | `COGNEE_LLM_PROVIDER=newapi`, `DC-cognee-embedding` | Không, trừ khi thay | Trỏ NewAPI về LLM/embedding local, hoặc bỏ qua bước này |
| Kịch bản, phân tập, phân cảnh, planner nhân vật/đạo cụ | ~20 biến `*_MODEL` qua gateway | **Có** | Để Claude viết thẳng theo schema, không gọi gateway |
| Ảnh nhân vật, đạo cụ, scene, first-frame | `CHARACTER_IMAGE_MODEL=nanobanana`, `NANOBANANA_PROVIDER=openrouter`, `NEWAPI_IMAGE_MODEL=LingShan-G2` | **Không** | Sinh ảnh ở ComfyUI riêng rồi upload vào (xem mục 4) |
| Sinh video từ ảnh | `VIDEO_BACKEND=newapi_<seedance>` | **Có, nếu có GPU** | Chuyển sang ComfyUI local (mục 3) |
| Lồng tiếng (TTS) | `TTS_PROVIDER=cosyvoice` → DashScope, tính tiền | **Có** | Đổi sang Edge TTS giọng Việt (mục 2) |
| Ghép, phụ đề, xuất MP4 | ffmpeg chạy máy bạn | **Có** | Không cần làm gì |
| Media relay (OSS/Cloudinary) | `MEDIA_RELAY_PROVIDER` | Có điều kiện | Chỉ cần khi upstream phải đọc file của bạn. Toàn bộ local thì bỏ được; Cloudinary có gói free |

---

## 2. Lồng tiếng miễn phí — Edge TTS giọng Việt

Đây là thay đổi đáng giá nhất và không mất gì.

`src/novelvideo/config.py:664` đặt mặc định `TTS_PROVIDER=cosyvoice` (DashScope, tính tiền). Nhánh `edge` có sẵn trong `src/novelvideo/generators/tts_generator.py:823`, gọi thư viện `edge-tts` **trực tiếp, không qua gateway, không cần API key**.

```bash
TTS_PROVIDER=edge
EDGE_TTS_VOICE=vi-VN-HoaiMyNeural   # nữ; giọng nam: vi-VN-NamMinhNeural
TTS_RATE=+0%
TTS_PITCH=+0Hz
```

Điểm cộng lớn: code dùng `edge_tts.SubMaker` (`tts_generator.py:319`), tức là **trả về mốc thời gian từng câu**. Phụ đề khớp giọng chính xác tuyệt đối, không phải dò khoảng lặng.

Các provider TTS còn lại đều tính tiền: CosyVoice (DashScope), Volcengine, Fish Audio, IndexTTS2 (qua fal/NewAPI). Riêng IndexTTS2 là đường duy nhất dùng **giọng mẫu của bạn** — mỗi nhân vật có trường `reference_audio_path` (`api/routes/characters.py:411`) để clone giọng. Muốn giọng thật của bạn cho nhân vật thì phải trả tiền ở đây.

---

## 3. Video miễn phí — ComfyUI local

Có **hai đường** chạy ComfyUI, đừng nhầm:

**Đường A — ComfyUI channel qua NewAPI (được tài liệu hoá, nên dùng).** Chế độ *Local + Official Hybrid* hoặc *Custom*: Settings → Models & Channels → Manage Channels → thêm ComfyUI → nạp template. Định tuyến theo model ID; model local trùng ID sẽ ghi đè model official. Xem `docs/en/getting-started/configuring-models.md` mục 5.

**Đường B — biến môi trường (đường code cũ, trực tiếp).**

```bash
VIDEO_BACKEND=comfyui
COMFYUI_ADDRESS=127.0.0.1:8188
COMFYUI_USE_SSL=false
COMFYUI_WORKFLOW=gguf        # gguf ~8GB VRAM, fp8 ~16GB VRAM
```

**Cảnh báo quan trọng:** `video_generator.py:3811` đặt sẵn `DEFAULT_ADDRESS = "u864639-....seetacloud.com:8443"` — đó là **GPU thuê theo giờ của nhóm phát triển**, không phải máy bạn. Nếu không set `COMFYUI_ADDRESS`, code sẽ trỏ ra server đó. Luôn khai báo địa chỉ local.

Ngoài ra `config.py:805` dùng tên biến khác — `COMFYUI_VIDEO_URL` (mặc định `http://localhost:9527`). Hai tên biến này thuộc hai đường code khác nhau; set cả hai cho chắc.

### File model cần tải về ComfyUI

Workflow GGUF (`wan2-2-I2V-GGUF-LightX2V.json`, máy ~8GB VRAM):

- `HighNoise/Wan2.2-I2V-A14B-HighNoise-Q3_K_S.gguf`
- `LowNoise/Wan2.2-I2V-A14B-LowNoise-Q3_K_S.gguf`
- `umt5_xxl_fp8_e4m3fn_scaled.safetensors`
- `Wan2.1_VAE.safetensors`
- LoRA: `wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors`, `Wan2.2-Lightning_I2V-A14B-4steps-lora_LOW_fp16.safetensors`

Workflow fp8 (`wan2-2-I2V-LightX2V.json`, máy ~16GB VRAM) dùng bản `wan2.2_i2v_A14b_{high,low}_noise_scaled_fp8_e4m3_lightx2v_4step_comfyui.safetensors`, `umt5_xxl_fp16.safetensors`, `wan_2.1_vae.safetensors` và 3 LoRA tương ứng.

Không có GPU rời thì đường này vô nghĩa — thuê GPU theo giờ vẫn rẻ hơn gọi seedance cho khối lượng lớn, nhưng vẫn là tiền.

---

## 4. Ảnh — chỗ bắt buộc trả tiền, và cách né

`image_generator.py` không có nhánh local nào. Mọi ảnh (thiết kế nhân vật, bảng ba hình đạo cụ, scene, sketch, first-frame) đều đi qua nanobanana / OpenRouter / HuiMeng / NewAPI, đều tính tiền.

Cách né, nếu bạn chấp nhận thao tác tay: repo có sẵn endpoint upload ảnh cho nhân vật (`api/routes/characters.py:1280, 1657, 1698, 1751, 1835`) và upload asset trên Freezone (`api/routes/freezone.py:4463`). Bạn sinh ảnh bằng ComfyUI/SD riêng trên máy, rồi upload vào làm identity asset. Đánh đổi: mất tính năng nhất quán nhận dạng tự động — bạn phải tự giữ nhân vật giống nhau giữa các shot, đúng thứ mà `render_identity_guard.py` và `nanobanana_character.py` sinh ra để lo hộ.

---

## 5. Phần chữ — để Claude làm thay gateway

Các biến này đều gọi model text tính tiền, và đều là việc một LLM làm được ngoài pipeline:

`SCENE_BUILD_MODEL`, `EPISODE_SCENE_PLANNER_MODEL`, `EPISODE_PROP_PLANNER_MODEL`, `IDENTITY_PLANNER_CAST_MODEL`, `IDENTITY_PLANNER_ANALYSIS_MODEL`, `IDENTITY_PLANNER_APPEARANCE_MODEL`, `LITERAL_BEAT_META_MODEL`, `CONTENT_REWRITER_MODEL`, `STYLE_ANALYZER_MODEL`, `GLOBAL_VIDEO_OPTIMIZER_MODEL`, `SEEDANCE2_PROMPT_COMPOSER_MODEL`, `FREEZONE_STORY_SCRIPT_MODEL`, `FREEZONE_TRANSLATION_MODEL`.

Cách làm: đưa truyện cho Claude, Claude xuất kịch bản / phân tập / phân cảnh / hồ sơ nhân vật đúng schema của repo, ghi thẳng vào project, pipeline chỉ chạy phần media. Chi phí gateway cho phần chữ về 0.

Hướng thứ hai, chưa kiểm chứng trên máy bạn: NewAPI cho phép thêm channel với Base URL tuỳ ý, nên về nguyên tắc trỏ được về Ollama / LM Studio chạy local rồi map các tên logic `DC-*-LLM` vào đó. Cần thử thực tế mới biết chất lượng có đủ cho các planner hay không.

---

## 6. Hai cái bẫy khi áp dụng

1. **Env có thể bị UI ghi đè.** Tài liệu ghi rõ: *"Model settings are stored in the local CE `settings.db`"*. Sửa `.env` xong vẫn phải xem badge **Active** trong Settings → Models & Channels để biết runtime thật sự đang chạy chế độ nào.
2. **Repo là hàng Trung Quốc.** Giọng mặc định `zh-CN-XiaoxiaoNeural`, prompt hệ thống viết bằng tiếng Trung. Đổi `EDGE_TTS_VOICE` sang `vi-VN-*` là bước tối thiểu; muốn output tiếng Việt sạch còn phải rà lại prompt và font phụ đề có dấu.

---

## 7. Tóm lại

Miễn phí hoàn toàn: kịch bản, lồng tiếng, ghép/phụ đề/xuất file.
Miễn phí nếu có GPU: sinh video từ ảnh.
Không có đường miễn phí: sinh ảnh.

Một tập phim vẫn tốn tiền, nhưng phần tốn giảm xuống chỉ còn bước ảnh thay vì cả bốn bước.
