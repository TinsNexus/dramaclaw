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

## Đóng gói installer (.dmg / .exe)

Khi chạy **đóng gói** (không phải dev), app nhúng sẵn một **trình thông dịch Python
tự chứa** + backend + `frontend/dist`, không cần repo/`uv` trên máy đích. Backend
đông cứng bằng cách copy một CPython relocatable (python-build-standalone do `uv`
quản) rồi cài repo (`supertale-ce`) + `imageio-ffmpeg` vào đó — **không** dùng
PyInstaller (cognee/lancedb/pyarrow/litellm import động + kèm data file, PyInstaller
xử lý kém).

```bash
pnpm -C desktop install
pnpm -C desktop dist:mac    # → desktop/dist-installers/DramaClaw-<ver>-arm64.dmg
# hoặc: pnpm -C desktop dist:win   (chạy TRÊN Windows)
```

`dist:mac` tự chạy `prep` = `build:frontend` + `bundle:backend`
([scripts/bundle-backend.sh](scripts/bundle-backend.sh)) rồi `electron-builder`.
Kết quả kiểm chứng trên máy này: `.app` ~1.6GB, **DMG ~592MB**.

Khi đóng gói, `main.js` (nhánh `app.isPackaged`) tự lo:

- Spawn `resources/pybackend` (python nhúng) chạy `-m novelvideo.cli api`.
- Đặt `NOVELVIDEO_DATA_ROOT` = `app.getPath('userData')/data` (thư mục **ghi được**;
  `resourcesPath` trong `.app` là chỉ-đọc) — SQLite (`data.db`/`settings.db`/
  `projects.db`), kho Cognee và media đều nằm ở đó.
- **Hai cạm bẫy đã xử lý sẵn** (nếu tự đóng gói lại, đừng bỏ):
  1. **`ST_EDITION=ce`** — backend từ chối khởi động nếu thiếu (`ensure_bootstrap`
     yêu cầu `ST_CONTROL_PLANE_DSN` hoặc `ST_EDITION=ce`). Dev lấy từ `.env`; bản
     đóng gói có env sạch nên `main.js` set thẳng.
  2. Xoá **`ANTHROPIC_BASE_URL`** khỏi env backend — nếu người dùng có biến này (ví
     dụ đang dùng Claude Code), nó trỏ SDK Anthropic sang endpoint chặn-auth khiến
     backend **treo** ở lifespan startup. CE định tuyến model qua gateway riêng
     (settings.db / NewAPI), không cần biến này.
- Cognee ghi vào `state/cognee_system` qua `SYSTEM_ROOT_DIRECTORY` (Cognee **không**
  theo `NOVELVIDEO_STATE_DIR`), ffmpeg lấy từ wheel `imageio-ffmpeg`.

### Lưu ý quan trọng khi phát hành

- **Build theo từng nền tảng/kiến trúc.** Wheel native (`numpy`, `Pillow`,
  `psycopg[binary]`, `pyarrow`, `lance`…) gắn với OS+arch. Máy này build được
  **macOS Apple Silicon**; muốn Intel Mac / Windows / Linux phải build **trên đúng
  nền đó** (hoặc CI). `bundle-backend.sh` hiện dành cho macOS/Linux; Windows cần bản
  `.ps1` theo layout `python.exe`.
- **Kích thước ~1.2–1.5GB** (nén DMG ~0.6GB). Muốn nhỏ hơn thì tỉa bundle —
  ứng viên: `claude_agent_sdk` (~207M), `pyarrow` (~122M).
- **Chưa ký (unsigned).** `mac.identity=null` nên DMG sẽ bị Gatekeeper chặn trên máy
  khác. Muốn phát hành rộng cần chứng chỉ Apple Developer để **ký + notarize** (đặt
  `identity` và cấu hình notarize trong `build.mac`).
- **Không bundle NewAPI gateway**: dùng gateway official/BYO từ xa (dán DC key trong
  Settings). Muốn hoàn toàn offline thì phải kèm thêm NewAPI như sidecar — ngoài
  phạm vi bản này.
- (Tùy chọn) auto-update qua `electron-updater` — khớp pipeline desktop chính thức
  (`latest.yml` / `latest-mac.yml`).
