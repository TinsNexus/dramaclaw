#!/usr/bin/env bash
# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 ClaymoreLab
#
# Freeze a self-contained Python backend into desktop/resources/pybackend for
# packaging. Strategy: copy a relocatable python-build-standalone interpreter
# (managed by uv) and pip-install the repo (supertale-ce) + imageio-ffmpeg into
# it. We deliberately do NOT use PyInstaller — cognee/lancedb/pyarrow/litellm do
# dynamic imports and ship data files that PyInstaller mishandles.
#
# macOS/Linux only. Windows needs the python.exe layout + a .ps1 port.
# The produced bundle is platform+arch specific (native wheels) — build it on
# each target OS/arch you intend to ship.
set -euo pipefail

PYVER="3.11"
HERE="$(cd "$(dirname "$0")/.." && pwd)"   # desktop/
REPO="$(cd "$HERE/.." && pwd)"
DEST="$HERE/resources/pybackend"

command -v uv >/dev/null 2>&1 || { echo "error: 'uv' not found on PATH"; exit 1; }

echo "==> ensuring standalone CPython $PYVER"
uv python install "$PYVER"

# Resolve the install root of the managed interpreter (…/bin/python3.11 → root).
PY_BIN="$(uv python find --managed-python "$PYVER" 2>/dev/null || uv python find "$PYVER")"
SRC="$(cd "$(dirname "$PY_BIN")/.." && pwd)"
echo "==> standalone python: $SRC"
case "$SRC" in
  *"/uv/python/"*) : ;;
  *) echo "warning: '$SRC' does not look like a managed standalone python; the bundle may not be relocatable" ;;
esac

echo "==> copying interpreter into $DEST"
rm -rf "$DEST"
mkdir -p "$HERE/resources"
cp -R "$SRC" "$DEST"

# python-build-standalone marks itself externally-managed; drop the marker so we
# can install packages into the copied tree.
find "$DEST/lib" -name EXTERNALLY-MANAGED -delete 2>/dev/null || true

echo "==> installing backend (supertale-ce) + imageio-ffmpeg"
uv pip install --python "$DEST/bin/python$PYVER" "$REPO" imageio-ffmpeg

echo "==> trimming caches"
find "$DEST" -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
find "$DEST" -type d -name tests -prune -exec rm -rf {} + 2>/dev/null || true

# Sanity: the backend must import from the bundle.
"$DEST/bin/python$PYVER" -c "import novelvideo, imageio_ffmpeg; print('bundle OK:', novelvideo.__file__)"

echo "==> backend bundled → $(du -sh "$DEST" | cut -f1)"
