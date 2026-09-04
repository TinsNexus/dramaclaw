#!/usr/bin/env python3
"""OpenAI-compatible image server backed by local ComfyUI + SDXL.

Lets DramaClaw CE / NewAPI use local image generation through the standard
OpenAI images API (POST /v1/images/generations), which new-api's own ComfyUI
channel (type 63) does not implement for images in this fork.

Endpoints:
    GET  /health               -> {"status": "ok"}
    GET  /v1/models            -> OpenAI-style model list
    POST /v1/images/generations-> {"data": [{"b64_json": "..."}]}
                                 body: {model, prompt, size?, n?, seed?}

Run:
    ~/ComfyUI/venv/bin/python examples/local-mac/comfyui_image_server.py --port 8890
"""

from __future__ import annotations

import argparse
import base64
import json
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_COMFY = "http://127.0.0.1:8188"
DEFAULT_WORKFLOW = str(
    Path(__file__).parent / "workflows" / "sdxl-txt2img.json"
)
# node ids in the SDXL workflow
NODE_PROMPT = "2"      # CLIPTextEncode (positive)
NODE_LATENT = "4"      # EmptyLatentImage
NODE_SAMPLER = "5"     # KSampler (seed)
NODE_SAVE = "7"        # SaveImage

_MODEL_ALIASES = {
    "gpt-image-2": "sdxl",
    "nano-banana-2": "sdxl",
    "sdxl-local": "sdxl",
    "sdxl": "sdxl",
}


def _parse_size(size: str) -> tuple[int, int]:
    try:
        w, h = (int(x) for x in str(size or "").lower().split("x"))
        return w, h
    except Exception:
        return 832, 1216


def _generate(comfy: str, workflow_path: str, prompt: str, size: str, seed: int | None) -> bytes:
    wf = json.loads(Path(workflow_path).read_text())
    wf[NODE_PROMPT]["inputs"]["text"] = prompt
    w, h = _parse_size(size)
    wf[NODE_LATENT]["inputs"]["width"] = w
    wf[NODE_LATENT]["inputs"]["height"] = h
    if seed is not None:
        wf[NODE_SAMPLER]["inputs"]["seed"] = int(seed)

    req = urllib.request.Request(
        f"{comfy}/prompt",
        data=json.dumps({"prompt": wf}).encode(),
        headers={"Content-Type": "application/json"},
    )
    prompt_id = json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]

    deadline = time.time() + 60 * 60  # SDXL on M2 can be slow under load
    while time.time() < deadline:
        time.sleep(5)
        try:
            history = json.load(urllib.request.urlopen(f"{comfy}/history/{prompt_id}", timeout=10))
        except Exception:
            continue
        if prompt_id not in history:
            continue
        status = history[prompt_id]["status"]
        if status.get("status_str") == "success":
            for out in history[prompt_id].get("outputs", {}).values():
                for img in out.get("images", []):
                    sub = img.get("subfolder", "")
                    typ = img.get("type", "output")
                    view = (
                        f"{comfy}/view?filename={urllib.parse.quote(img['filename'])}"
                        f"&subfolder={urllib.parse.quote(sub)}&type={urllib.parse.quote(typ)}"
                    )
                    return urllib.request.urlopen(view, timeout=60).read()
            raise RuntimeError("no image in ComfyUI output")
        if status.get("status_str") == "error":
            raise RuntimeError("ComfyUI execution error")
    raise TimeoutError("ComfyUI render timed out")


def _make_handler(comfy: str, workflow: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "ComfyImageLocal/1.0"

        def _json(self, status: int, payload: dict):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _read_json(self) -> dict:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            try:
                data = json.loads(raw.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = {}
            return data if isinstance(data, dict) else {}

        def do_GET(self):  # noqa: N802
            if self.path == "/health":
                self._json(200, {"status": "ok", "backend": "comfyui-sdxl"})
            elif self.path == "/v1/models":
                self._json(
                    200,
                    {
                        "object": "list",
                        "data": [
                            {"id": m, "object": "model", "owned_by": "local"}
                            for m in sorted(set(_MODEL_ALIASES))
                        ],
                    },
                )
            else:
                self._json(404, {"error": {"message": f"not found: {self.path}", "type": "invalid_request_error"}})

        def do_POST(self):  # noqa: N802
            if self.path not in ("/v1/images/generations", "/images/generations"):
                self._json(404, {"error": {"message": f"not found: {self.path}", "type": "invalid_request_error"}})
                return
            data = self._read_json()
            prompt = str(data.get("prompt") or "").strip()
            if not prompt:
                self._json(400, {"error": {"message": "missing required field 'prompt'", "type": "invalid_request_error"}})
                return
            model = str(data.get("model") or "sdxl-local")
            if _MODEL_ALIASES.get(model) is None:
                self._json(400, {"error": {"message": f"unknown model '{model}'", "type": "invalid_request_error"}})
                return
            size = str(data.get("size") or "832x1216")
            n = int(data.get("n") or 1)
            seed = data.get("seed")
            images = []
            try:
                for i in range(n):
                    raw = _generate(comfy, workflow, prompt, size, seed)
                    images.append({"b64_json": base64.b64encode(raw).decode(), "index": i})
            except Exception as exc:  # noqa: BLE001
                self._json(500, {"error": {"message": str(exc), "type": "server_error"}})
                return
            self._json(200, {"created": int(time.time()), "data": images})

        def log_message(self, fmt: str, *args):
            print(f"[comfyimg] {self.address_string()} - {fmt % args}")

    return Handler


def main():
    parser = argparse.ArgumentParser(description="OpenAI-compatible image server (ComfyUI/SDXL)")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8890)
    parser.add_argument("--comfy", default=DEFAULT_COMFY)
    parser.add_argument("--workflow", default=DEFAULT_WORKFLOW)
    args = parser.parse_args()

    if not Path(args.workflow).exists():
        raise SystemExit(f"workflow not found: {args.workflow}")
    server = ThreadingHTTPServer((args.host, args.port), _make_handler(args.comfy, args.workflow))
    print(f"[comfyimg] OpenAI-compatible image server on http://{args.host}:{args.port} -> {args.comfy}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
