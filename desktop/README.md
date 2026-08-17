# DramaClaw Desktop (Electron shell — tối thiểu)

Vỏ Electron mỏng, mở **web frontend hiện có** trong một cửa sổ desktop và **tự khởi
động backend cục bộ**. Đây là bản wrapper tối thiểu để dùng DramaClaw như một app
desktop trên máy đã có mã nguồn — **không** phải một installer đóng gói đầy đủ.

## Cách hoạt động

Frontend gọi API bằng **đường dẫn tương đối cùng origin** (`/api/v1/...`,
`/static/...`, WebSocket `/api/v1/chat/ws`) và cần các asset tĩnh của chính nó
(`/version.json`, `/docs/...`, `/locales/...`) từ cùng origin đó — giống hệt những
gì Vite dev proxy cung cấp lúc dev. Backend Python **không** serve file tĩnh của SPA,
nên app desktop tự tái tạo một origin duy nhất:

```
┌─────────────── Electron ───────────────┐
│  BrowserWindow → http://127.0.0.1:5178  │
│                                         │
│  Express (cổng 5178):                   │
│    • serve  frontend/dist/  (SPA)       │
│    • proxy  /api/v1  →  :8780  (+ ws)    │
│    • proxy  /static  →  :8780            │
│                                         │
│  Backend: uv run novelvideo api :8780   │  ← spawn nếu chưa chạy, reuse nếu đã chạy
└─────────────────────────────────────────┘
```

Điểm cần biết:

- **Reuse backend**: nếu `:8780` đã có backend (bạn tự chạy `uv run novelvideo api`),
  app **dùng lại** và **không** spawn/không kill nó. Nếu chưa, app tự spawn.
- **Teardown sạch**: backend do app spawn chạy trong process-group riêng; khi thoát,
  app kill cả group (`uv` + uvicorn) để không mồ côi tiến trình giữ cổng 8780.
- **Chờ health**: app poll `/api/v1/config` tới khi backend sẵn sàng (timeout 90s)
  rồi mới mở cửa sổ; lỗi hiện hộp thoại rõ ràng thay vì cửa sổ trắng.

## Yêu cầu

- Đã cài `uv` và chạy được backend: `uv run novelvideo api`
- Node + `pnpm` (để build frontend và cài Electron)
- **Đứng trong repo** — bản wrapper này giả định mã nguồn có sẵn tại chỗ.

## Chạy

```bash
# 1) cài phụ thuộc của desktop (tải Electron)
pnpm -C desktop install

# 2) build frontend (bắt buộc — tạo frontend/dist, kèm bản hướng dẫn sử dụng)
pnpm -C desktop build:frontend

# 3) mở app desktop (tự spawn/tự reuse backend :8780)
pnpm -C desktop start
```

Một lệnh gộp bước 2+3:

```bash
pnpm -C desktop dev
```

Hoặc trỏ cửa sổ vào Vite dev server đang chạy (HMR) thay vì bản build:

```bash
pnpm -C frontend dev            # cửa sổ khác: Vite tại :5173
pnpm -C desktop dev:vite        # Electron trỏ vào http://localhost:5173
```

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DRAMACLAW_BACKEND_PORT` | `8780` | Cổng backend |
| `DRAMACLAW_SHELL_PORT` | `5178` | Cổng server tĩnh + proxy nội bộ |
| `DRAMACLAW_DEV_URL` | *(trống)* | Nếu đặt, cửa sổ load thẳng URL này (bỏ qua dist/proxy) |

## Giới hạn (bản tối thiểu)

- **Chưa đóng gói installer** (`.dmg`/`.exe`). Chưa thêm `electron-builder`, vì một
  installer thật phải **freeze Python + ffmpeg + model gateway (NewAPI) + SQLite**
  vào bản build để chạy trên máy *không* có repo — đó là một hạng mục riêng, đáng
  kể. Bản này cố tình dừng ở mức "vỏ desktop cho máy đã có mã nguồn + `uv`".
- **Không sửa backend**: không thêm StaticFiles mount vào FastAPI (tránh đổi hành vi
  deploy chỉ vì nhu cầu desktop). Việc serve tĩnh nằm hoàn toàn trong Electron.

## Hướng đóng gói đầy đủ (khi cần, làm sau)

1. Freeze backend: PyInstaller (hoặc ship môi trường `uv`) → 1 binary `novelvideo`.
2. Kèm `ffmpeg` và cấu hình model gateway (NewAPI) như sidecar.
3. Thêm `electron-builder` (target `dmg`/`nsis`), đưa binary backend + `frontend/dist`
   vào `extraResources`; sửa `main.js` để spawn binary đã đóng gói thay vì `uv run`.
4. (Tùy chọn) auto-update qua `electron-updater` — khớp với pipeline desktop chính
   thức hiện có (`latest.yml` / `latest-mac.yml`).
