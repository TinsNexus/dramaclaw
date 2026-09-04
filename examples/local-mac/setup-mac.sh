#!/usr/bin/env bash
#
# setup-mac.sh — DramaClaw CE local model stack for macOS (Apple Silicon).
#
# Installs (all native on the host, NOT in Docker — Docker on Mac has no GPU):
#   1. Ollama  + qwen3:8b (text) + qwen2.5vl:7b (vision) + bge-m3 (embedding)
#   2. ComfyUI + ComfyUI-GGUF node + Wan 2.2 5B (GGUF UNET + GGUF UMT5 text encoder + VAE)
#   3. Kokoro TTS server (OpenAI-compatible /v1/audio/speech, port 8880)
#      -> pip install kokoro-onnx + model files in ~/.kokoro, served by kokoro_server.py
#   4. (Optional) Piper Vietnamese TTS (port 8881) — Kokoro has no vi voice
#
# Verified model sources (all public on HuggingFace, ~10GB total on disk):
#   - Wan2.2-TI2V-5B-Q4_K_M.gguf        (QuantStack/Wan2.2-TI2V-5B-GGUF,  ~3.2GB)
#   - umt5-xxl-encoder-Q4_K_M.gguf      (city96/umt5-xxl-encoder-gguf,    ~6.6GB)
#   - wan2.2_vae.safetensors            (Comfy-Org/Wan_2.2_ComfyUI_Repackaged, ~0.25GB)
#
# Usage:  bash setup-mac.sh
# Optional env overrides:
#   COMFYUI_DIR=<path>   ComfyUI install dir (default ~/ComfyUI)
#
set -euo pipefail

COMFYUI_DIR="${COMFYUI_DIR:-$HOME/ComfyUI}"
MODELS_DIR="$COMFYUI_DIR/models"
VENV="$COMFYUI_DIR/venv"

# ---------------------------------------------------------------------------
# 1. Ollama + models
# ---------------------------------------------------------------------------
echo "==> [1/3] Ollama + models"
if ! command -v ollama >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew install ollama
  else
    curl -fsSL https://ollama.com/install.sh | sh
  fi
fi
ollama pull qwen3:8b
ollama pull qwen2.5vl:7b
ollama pull bge-m3
# Optional: better text quality if RAM allows (approx +4GB while loaded):
#   ollama pull qwen3:14b
# Run Ollama reachable from Docker (NewAPI container):
#   OLLAMA_HOST=0.0.0.0 ollama serve

# ---------------------------------------------------------------------------
# 2. ComfyUI + nodes + models
# ---------------------------------------------------------------------------
echo "==> [2/3] ComfyUI + Wan 2.2 5B (GGUF)"
if [ ! -d "$COMFYUI_DIR" ]; then
  git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -U pip
  "$VENV/bin/pip" install -r "$COMFYUI_DIR/requirements.txt"
fi

mkdir -p "$COMFYUI_DIR/custom_nodes"
if [ ! -d "$COMFYUI_DIR/custom_nodes/ComfyUI-GGUF" ]; then
  git clone https://github.com/city96/ComfyUI-GGUF "$COMFYUI_DIR/custom_nodes/ComfyUI-GGUF"
  "$VENV/bin/pip" install -r "$COMFYUI_DIR/custom_nodes/ComfyUI-GGUF/requirements.txt"
fi

mkdir -p "$MODELS_DIR/unet" "$MODELS_DIR/vae" "$MODELS_DIR/text_encoders"

# Wan 2.2 TI2V 5B — does BOTH text-to-video and image-to-video (I2V via first frame).
# GGUF Q4_K_M (~3.2GB) + UMT5-XXL GGUF Q4_K_M (~6.6GB) ≈ 10GB loaded — fits M2 16GB.
if [ ! -f "$MODELS_DIR/unet/Wan2.2-TI2V-5B-Q4_K_M.gguf" ]; then
  echo "    downloading Wan 2.2 TI2V 5B GGUF Q4_K_M (~3.2GB)..."
  curl -L --fail -o "$MODELS_DIR/unet/Wan2.2-TI2V-5B-Q4_K_M.gguf" \
    "https://huggingface.co/QuantStack/Wan2.2-TI2V-5B-GGUF/resolve/main/Wan2.2-TI2V-5B-Q4_K_M.gguf"
fi

# UMT5-XXL text encoder as GGUF (Q4). If the Mac swaps heavily during video gen,
# switch to Q3_K_M (~5GB) instead: umt5-xxl-encoder-Q3_K_M.gguf, same repo.
if [ ! -f "$MODELS_DIR/text_encoders/umt5-xxl-encoder-Q4_K_M.gguf" ]; then
  echo "    downloading UMT5-XXL text encoder GGUF Q4_K_M (~6.6GB)..."
  curl -L --fail -o "$MODELS_DIR/text_encoders/umt5-xxl-encoder-Q4_K_M.gguf" \
    "https://huggingface.co/city96/umt5-xxl-encoder-gguf/resolve/main/umt5-xxl-encoder-Q4_K_M.gguf"
fi

# Wan 2.2 VAE (the 5B model uses wan2.2_vae.safetensors, not the 2.1 VAE).
if [ ! -f "$MODELS_DIR/vae/wan2.2_vae.safetensors" ]; then
  echo "    downloading Wan 2.2 VAE..."
  curl -L --fail -o "$MODELS_DIR/vae/wan2.2_vae.safetensors" \
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan2.2_vae.safetensors"
fi

# Optional: SDXL for local image generation (add an image workflow later).
#   curl -L -o "$MODELS_DIR/checkpoints/sd_xl_base_1.0.safetensors" \
#     "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"

# ---------------------------------------------------------------------------
# 3. Kokoro TTS (OpenAI-compatible /v1/audio/speech, port 8880)
# ---------------------------------------------------------------------------
echo "==> [3/3] Kokoro TTS"
KOKORO_VENV="$HOME/kokoro-fastapi-venv"
if [ ! -d "$KOKORO_VENV" ]; then
  python3 -m venv "$KOKORO_VENV"
  "$KOKORO_VENV/bin/pip" install -U pip
fi
"$KOKORO_VENV/bin/pip" install -q kokoro-onnx || {
  echo "    'kokoro-onnx' install failed. Try: python3 -m venv --clear $KOKORO_VENV && $KOKORO_VENV/bin/pip install kokoro-onnx"
}
mkdir -p "$HOME/.kokoro"
if [ ! -f "$HOME/.kokoro/kokoro-v1.0.onnx" ]; then
  echo "    downloading Kokoro model (~310MB)..."
  curl -L --fail -o "$HOME/.kokoro/kokoro-v1.0.onnx" \
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
fi
if [ ! -f "$HOME/.kokoro/voices-v1.0.bin" ]; then
  echo "    downloading Kokoro voices (~27MB)..."
  curl -L --fail -o "$HOME/.kokoro/voices-v1.0.bin" \
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
fi

# ---------------------------------------------------------------------------
# 4. (Optional) Piper Vietnamese TTS — OpenAI-compatible /v1/audio/speech
#    Kokoro v1.0 has no Vietnamese voice; Piper vi_VN covers it.
# ---------------------------------------------------------------------------
echo "==> [4/4] Piper (Vietnamese TTS, optional)"
PIPER_VENV="$HOME/piper-venv"
if [ ! -d "$PIPER_VENV" ]; then
  (python3.13 -m venv "$PIPER_VENV" 2>/dev/null || python3 -m venv "$PIPER_VENV")
  "$PIPER_VENV/bin/pip" install -U pip
fi
"$PIPER_VENV/bin/pip" install -q piper-tts || echo "    piper-tts install failed (optional — skip if not needed)"
mkdir -p "$HOME/.piper/voices/vi"
if [ ! -f "$HOME/.piper/voices/vi/vi_VN-vais1000-medium.onnx" ]; then
  echo "    downloading Piper Vietnamese voice (vi_VN-vais1000-medium, ~63MB)..."
  curl -L --fail -o "$HOME/.piper/voices/vi/vi_VN-vais1000-medium.onnx" \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx"
  curl -L --fail -o "$HOME/.piper/voices/vi/vi_VN-vais1000-medium.onnx.json" \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx.json"
fi

cat <<'EOF'

=====================================================================
Done. Start the services (each in its own terminal):
  1. Ollama    : OLLAMA_HOST=0.0.0.0 ollama serve
  2. ComfyUI   : cd <COMFYUI_DIR> && ./venv/bin/python main.py --listen 0.0.0.0 --port 8188
  3. Kokoro    : <HOME>/kokoro-fastapi-venv/bin/python examples/local-mac/kokoro_server.py --port 8880
  4. Piper (vi): <HOME>/piper-venv/bin/python examples/local-mac/piper_server.py --port 8881

Then wire DramaClaw CE (see examples/local-mac/README.md):
  - docker compose -f docker-compose.selfhosted.yml up -d --build
  - Settings -> Custom mode -> Initialize Local NewAPI
  - My Config: paste examples/local-mac/ce-local-profile.json
  - Channels need placeholder upstream keys (e.g. "ollama" / "local").
  - For Vietnamese TTS: point the tts-local channel at Piper (port 8881,
    model vi_VN-vais1000-medium) instead of Kokoro (see README section 4b).
=====================================================================
EOF
