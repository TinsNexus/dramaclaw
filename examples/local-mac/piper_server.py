#!/usr/bin/env python3
"""OpenAI-compatible Piper TTS server (Vietnamese) for DramaClaw CE local stack.

Piper has vi_VN voices (Kokoro v1.0 does not), so run this instead of
kokoro_server.py when the pipeline needs Vietnamese narration.

Endpoints:
    GET  /health          -> {"status": "ok", "voices": N}
    GET  /v1/models       -> OpenAI-style model list
    POST /v1/audio/speech -> audio/wav bytes  (body: {model, input, voice, speed})

Setup (done by setup-mac.sh):
    python3.13 -m venv ~/piper-venv
    ~/piper-venv/bin/pip install piper-tts
    ~/.piper/voices/vi/vi_VN-vais1000-medium.onnx   (+ .onnx.json)

Run:
    ~/piper-venv/bin/python piper_server.py --port 8881
"""

from __future__ import annotations

import argparse
import io
import json
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_MODEL = str(Path.home() / ".piper/voices/vi/vi_VN-vais1000-medium.onnx")

_voice = None
_voice_lock = threading.Lock()


def _get_voice(model_path: str):
    global _voice
    if _voice is None:
        with _voice_lock:
            if _voice is None:
                from piper import PiperVoice

                _voice = PiperVoice.load(model_path)  # config auto-detected: <model>.json
    return _voice


def _synthesize(text: str, speed: float, model_path: str) -> bytes:
    from piper.config import SynthesisConfig

    voice = _get_voice(model_path)
    speed = max(0.5, min(2.0, speed))
    cfg = SynthesisConfig(
        length_scale=1.0 / speed,  # piper: lower length_scale = faster speech
        noise_scale=0.667,
        noise_w_scale=0.8,
    )
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)
    return buf.getvalue()


def _make_handler(model_path: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "PiperViLocal/1.0"

        def _json(self, status: int, payload: dict):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _audio(self, wav_bytes: bytes):
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_bytes)))
            self.end_headers()
            self.wfile.write(wav_bytes)

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
                voice = _get_voice(model_path)
                self._json(200, {"status": "ok", "voices": 1, "lang": "vi"})
            elif self.path == "/v1/models":
                self._json(
                    200,
                    {
                        "object": "list",
                        "data": [
                            {"id": "vi_VN-vais1000-medium", "object": "model", "owned_by": "local"},
                            {"id": "vi_VN-vais1000-medium", "object": "voice", "voices": ["vi_VN-vais1000-medium"]},
                        ],
                    },
                )
            else:
                self._json(404, {"error": {"message": f"not found: {self.path}", "type": "invalid_request_error"}})

        def do_POST(self):  # noqa: N802
            if self.path != "/v1/audio/speech":
                self._json(404, {"error": {"message": f"not found: {self.path}", "type": "invalid_request_error"}})
                return
            data = self._read_json()
            text = str(data.get("input") or "").strip()
            if not text:
                self._json(400, {"error": {"message": "missing required field 'input'", "type": "invalid_request_error"}})
                return
            speed = float(data.get("speed") or 1.0)
            try:
                wav_bytes = _synthesize(text, speed, model_path)
            except Exception as exc:  # noqa: BLE001 - surface as OpenAI-style error
                self._json(500, {"error": {"message": str(exc), "type": "server_error"}})
                return
            self._audio(wav_bytes)

        def log_message(self, fmt: str, *args):  # quieter logs
            print(f"[piper] {self.address_string()} - {fmt % args}")

    return Handler


def main():
    parser = argparse.ArgumentParser(description="OpenAI-compatible Piper TTS server (Vietnamese)")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8881)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    model = Path(args.model)
    if not model.exists():
        raise SystemExit(
            f"model not found: {model}\n"
            "Download it first, e.g.:\n"
            "  mkdir -p ~/.piper/voices/vi\n"
            "  curl -L -o ~/.piper/voices/vi/vi_VN-vais1000-medium.onnx \\\n"
            "    https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx\n"
            "  curl -L -o ~/.piper/voices/vi/vi_VN-vais1000-medium.onnx.json \\\n"
            "    https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx.json"
        )

    server = ThreadingHTTPServer((args.host, args.port), _make_handler(str(model)))
    print(f"[piper] OpenAI-compatible Vietnamese TTS on http://{args.host}:{args.port} (voice={model.name})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
