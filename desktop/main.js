// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
//
// Minimal Electron shell for DramaClaw CE.
//
// The web frontend talks to the backend with SAME-ORIGIN relative paths
// (`/api/v1/...`, `/static/...`, WS `/api/v1/chat/ws`) and expects its own
// static assets (`/version.json`, `/docs/...`, `/locales/...`) from that same
// origin — exactly what the Vite dev proxy provides at dev time. There is no
// StaticFiles mount on the Python backend, so in a packaged/desktop context we
// reproduce that single origin ourselves: an in-process Express server serves
// the built `frontend/dist` AND proxies `/api/v1` (with WebSocket upgrade) and
// `/static` to the local backend. The Electron window then loads that origin.
//
// Scope: this is a *thin wrapper*. It assumes the repo + `uv` are present and
// spawns the existing backend (`uv run novelvideo api`); it does NOT freeze
// Python / ffmpeg / the model gateway into a standalone installer. See README.
const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(REPO_ROOT, "frontend", "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

const BACKEND_PORT = Number(process.env.DRAMACLAW_BACKEND_PORT || 8780);
const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`;
const SHELL_PORT = Number(process.env.DRAMACLAW_SHELL_PORT || 5178);
const SHELL_ORIGIN = `http://127.0.0.1:${SHELL_PORT}`;
// Optional: point the window at an already-running Vite dev server instead of
// the built dist (e.g. DRAMACLAW_DEV_URL=http://localhost:5173).
const DEV_URL = process.env.DRAMACLAW_DEV_URL || "";

let backendProc = null; // non-null ONLY when we spawned it (so we never kill a backend we merely reused)
let shellServer = null;
let mainWindow = null;

function log(msg) {
  process.stdout.write(`[desktop] ${msg}\n`);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// A backend is "up" if the config endpoint answers with anything short of a
// server error — 200 (no-auth CE) and 401/403 (auth-required) both mean alive.
function probeBackend(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_ORIGIN}/api/v1/config`, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBackend() {
  if (await probeBackend()) {
    log(`backend already listening on ${BACKEND_ORIGIN} — reusing it (won't spawn or kill)`);
    return;
  }
  log(`spawning backend: uv run novelvideo api --port ${BACKEND_PORT} (cwd=${REPO_ROOT})`);
  // detached:true → the child leads its own process group, so on quit we can
  // signal the WHOLE group (`uv` + the uvicorn grandchild) and not orphan the
  // process holding the port. stdio piped so backend logs surface in our console.
  backendProc = spawn("uv", ["run", "novelvideo", "api", "--port", String(BACKEND_PORT)], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  backendProc.on("error", (err) => {
    log(`failed to spawn backend (is 'uv' on PATH?): ${err.message}`);
  });
  backendProc.stdout.on("data", (d) => process.stdout.write(`[backend] ${d}`));
  backendProc.stderr.on("data", (d) => process.stderr.write(`[backend] ${d}`));
  backendProc.on("exit", (code, sig) => log(`backend process exited (code=${code}, signal=${sig})`));

  await waitForBackend();
}

async function waitForBackend(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await probeBackend()) {
      log(`backend ready after ${Math.round((Date.now() - start) / 1000)}s`);
      return;
    }
    await delay(1000);
  }
  throw new Error(
    `Backend không phản hồi tại ${BACKEND_ORIGIN} sau ${timeoutMs / 1000}s.\n` +
      `Thử chạy tay: uv run novelvideo api --port ${BACKEND_PORT}`,
  );
}

function startShellServer() {
  const server = express();

  // Single proxy for both backend path groups. pathFilter (not path-mounting)
  // so the FULL path reaches the backend unchanged (/api/v1/... and /static/...).
  // No Set-Cookie rewriting: unlike the Vite dev proxy's HTTPS-backend case,
  // both ends here are plain http://127.0.0.1, so cookies stick as-is.
  const backendProxy = createProxyMiddleware({
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    ws: true, // superchat lives at /api/v1/chat/ws
    // Function form (not glob strings): http-proxy-middleware v3's glob
    // pathFilter did not match nested paths reliably; a predicate is exact.
    pathFilter: (pathname) => pathname.startsWith("/api/v1") || pathname.startsWith("/static"),
  });
  server.use(backendProxy);

  // Everything else is a built static asset (index.html, JS/CSS, version.json,
  // /docs/user-manual-vi.md, /locales/**, ...).
  server.use(express.static(DIST_DIR, { index: false }));
  // SPA fallback for client-side routes.
  server.get("*", (_req, res) => res.sendFile(INDEX_HTML));

  return new Promise((resolve, reject) => {
    shellServer = http.createServer(server);
    // Route WebSocket upgrades (superchat) through the same proxy.
    shellServer.on("upgrade", backendProxy.upgrade);
    shellServer.on("error", reject);
    shellServer.listen(SHELL_PORT, "127.0.0.1", () => {
      log(`shell server serving ${DIST_DIR} at ${SHELL_ORIGIN} (proxy → ${BACKEND_ORIGIN})`);
      resolve();
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "DramaClaw",
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open target=_blank / external links in the system browser, not a new window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SHELL_ORIGIN)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const target = DEV_URL || SHELL_ORIGIN;
  log(`loading window: ${target}`);
  await mainWindow.loadURL(target);
}

function stopBackend() {
  // Only if WE spawned it. A reused backend belongs to the user's own session.
  if (backendProc && backendProc.pid && !backendProc.killed) {
    log(`stopping spawned backend (process group ${backendProc.pid})`);
    try {
      process.kill(-backendProc.pid, "SIGTERM"); // negative pid → whole group
    } catch (err) {
      log(`could not signal backend group: ${err.message}`);
      try {
        backendProc.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
  backendProc = null;
  if (shellServer) {
    shellServer.close();
    shellServer = null;
  }
}

async function boot() {
  if (!DEV_URL && !fs.existsSync(INDEX_HTML)) {
    dialog.showErrorBox(
      "Chưa build frontend",
      `Không tìm thấy:\n${INDEX_HTML}\n\n` +
        `Hãy build frontend trước rồi mở lại ứng dụng:\n\n` +
        `  pnpm -C desktop build:frontend\n\n` +
        `(hoặc: pnpm -C frontend build)`,
    );
    app.quit();
    return;
  }

  try {
    await ensureBackend();
    if (!DEV_URL) await startShellServer();
    await createWindow();
  } catch (err) {
    log(`boot failed: ${err && err.stack ? err.stack : err}`);
    dialog.showErrorBox("Không khởi động được DramaClaw", String((err && err.message) || err));
    app.quit();
  }
}

app.whenReady().then(boot);

// Quit fully when the window closes (also on macOS) so the spawned backend is
// always torn down — this is a single-window local app, not a dock-resident one.
app.on("window-all-closed", () => {
  app.quit();
});

app.on("will-quit", stopBackend);
// Belt-and-suspenders: also clean up if the main process is signalled.
process.on("SIGINT", () => app.quit());
process.on("SIGTERM", () => app.quit());
