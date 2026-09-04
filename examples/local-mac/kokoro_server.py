#!/usr/bin/env python3
"""OpenAI-compatible Kokoro TTS server (stdlib-only) for DramaClaw CE local stack.

Endpoints:
    GET  /health          -> {"status": "ok", "voices": N}
    GET  /v1/models       -> OpenAI-style model list
    POST /v1/audio/speech -> audio/wav bytes  (body: {model, input, voice, speed, response_format})

Run (after `pip install kokoro-onnx` + downloading model files):
    ~/kokoro-fastapi-venv/bin/python kokoro_server.py --port 8880

Model files (downloaded by setup-mac.sh into ~/.kokoro/):
    https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Note: Kokoro v1.0 has no Vietnamese voice. For Vietnamese TTS use Piper (vi_VN) instead.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

SAMPLE_RATE = 24000  # Kokoro native rate

# voice prefix -> language for phonemization (Kokoro v1.0 voice families)
_LANG_BY_PREFIX = {
    "af": "en-us", "am": "en-us",  # en-US
    "bf": "en-gb", "bm": "en-gb",  # en-GB
    "ef": "es", "em": "es",        # Spanish
    "ff": "fr",                    # French
    "hf": "hi", "hm": "hi",        # Hindi
    "if": "it",                    # Italian
    "jf": "ja", "jm": "ja",        # Japanese
    "kf": "ko", "km": "ko",        # Korean
    "nf": "nl", "nm": "nl",        # Dutch
    "pf": "pt", "pm": "pt",        # Portuguese
    "rf": "ru",                    # Russian
    "sf": "pl",                    # Polish
    "zf": "cmn", "zm": "cmn",      # Chinese (espeak-ng code for Mandarin)
}

_kokoro = None
_kokoro_lock = threading.Lock()


def _default_dir() -> Path:
    return Path(os.environ.get("KOKORO_HOME", str(Path.home() / ".kokoro")))


def _get_kokoro(model_path: str, voices_path: str):
    """Lazily build the Kokoro pipeline (model files must already exist)."""
    global _kokoro
    if _kokoro is None:
        with _kokoro_lock:
            if _kokoro is None:
                from kokoro_onnx import Kokoro

                _kokoro = Kokoro(model_path=model_path, voices_path=voices_path)
    return _kokoro


def _lang_for_voice(voice: str) -> str:
    prefix = voice[:2].lower()
    return _LANG_BY_PREFIX.get(prefix, "en-us")


def _synthesize(text: str, voice: str, speed: float, model_path: str, voices_path: str) -> bytes:
    kokoro = _get_kokoro(model_path, voices_path)
    if voice not in kokoro.get_voices():
        raise ValueError(f"unknown voice '{voice}' (available: {', '.join(kokoro.get_voices())})")
    samples, _ = kokoro.create(text, voice=voice, speed=max(0.5, min(2.0, speed)), lang=_lang_for_voice(voice))
    audio = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())
    return buf.getvalue()


def _make_handler(model_path: str, voices_path: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "KokoroLocal/1.0"

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
                kokoro = _get_kokoro(model_path, voices_path)
                self._json(200, {"status": "ok", "voices": len(kokoro.get_voices())})
            elif self.path == "/v1/models":
                kokoro = _get_kokoro(model_path, voices_path)
                voices = kokoro.get_voices()
                self._json(
                    200,
                    {
                        "object": "list",
                        "data": [
                            {"id": "kokoro", "object": "model", "owned_by": "local"},
                            {"id": "kokoro", "object": "voice", "voices": voices},
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
            voice = str(data.get("voice") or "af_heart")
            speed = float(data.get("speed") or 1.0)
            try:
                wav_bytes = _synthesize(text, voice, speed, model_path, voices_path)
            except Exception as exc:  # noqa: BLE001 - surface as OpenAI-style error
                self._json(500, {"error": {"message": str(exc), "type": "server_error"}})
                return
            self._audio(wav_bytes)

        def log_message(self, fmt: str, *args):  # quieter logs
            print(f"[kokoro] {self.address_string()} - {fmt % args}")

    return Handler


def main():
    default_dir = _default_dir()
    parser = argparse.ArgumentParser(description="OpenAI-compatible Kokoro TTS server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8880)
    parser.add_argument("--model", default=str(default_dir / "kokoro-v1.0.onnx"))
    parser.add_argument("--voices", default=str(default_dir / "voices-v1.0.bin"))
    args = parser.parse_args()

    model = Path(args.model)
    voices = Path(args.voices)
    if not model.exists() or not voices.exists():
        raise SystemExit(
            f"model/voices not found: {model} / {voices}\n"
            "Download them first (see setup-mac.sh), e.g.:\n"
            "  mkdir -p ~/.kokoro\n"
            "  curl -L -o ~/.kokoro/kokoro-v1.0.onnx  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx\n"
            "  curl -L -o ~/.kokoro/voices-v1.0.bin     https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
        )

    server = ThreadingHTTPServer((args.host, args.port), _make_handler(str(model), str(voices)))
    print(f"[kokoro] OpenAI-compatible TTS on http://{args.host}:{args.port} (model={model.name})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
