#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đẩy ảnh/audio làm thủ công (ChatGPT, ComfyUI, thu âm) vào project DramaClaw.

Chỉ dùng thư viện chuẩn của Python — không cần cài thêm gì.
Quy ước đặt tên file: xem docs/vi/workflow-provider-thay-the.md

    python docs/vi/upload_manual_assets.py --project my-project --dir ~/Downloads/assets
    python docs/vi/upload_manual_assets.py --project my-project --dir ~/Downloads/assets --apply
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".wav", ".mp3", ".m4a", ".aac", ".ogg"}


def unslug(value: str) -> str:
    """`nguyen-van-a` -> `nguyen van a`. Tên có dấu giữ nguyên."""
    return value.replace("-", " ").strip()


def route_for(name: str) -> tuple[str, str] | None:
    """Suy ra endpoint từ tên file. Trả về (đường dẫn tương đối, mô tả) hoặc None."""
    stem = Path(name).stem

    m = re.fullmatch(r"char__(.+?)__portrait", stem)
    if m:
        c = unslug(m.group(1))
        return f"/characters/{c}/portrait/upload", f"chân dung · {c}"

    m = re.fullmatch(r"char__(.+?)__identity__(.+)", stem)
    if m:
        c, ident = unslug(m.group(1)), unslug(m.group(2))
        return f"/characters/{c}/identities/{ident}/upload", f"identity {ident} · {c}"

    m = re.fullmatch(r"char__(.+?)__costume__(.+)", stem)
    if m:
        c, ident = unslug(m.group(1)), unslug(m.group(2))
        return f"/characters/{c}/identities/{ident}/costume/upload", f"trang phục {ident} · {c}"

    m = re.fullmatch(r"scene__(.+?)__(master|pano|custom)", stem)
    if m:
        s, kind = unslug(m.group(1)), m.group(2)
        return f"/scenes/{s}/{kind}/upload", f"bối cảnh {kind} · {s}"

    m = re.fullmatch(r"beat__(\d+)__(\d+)__(render|sketch|background-anchor)", stem)
    if m:
        ep, beat, kind = m.group(1), m.group(2), m.group(3)
        return (f"/episodes/{ep}/beats/{beat}/{kind}/upload",
                f"tập {ep} · beat {beat} · {kind}")

    m = re.fullmatch(r"voice__(.+?)__(.+)", stem)
    if m:
        c, slot = unslug(m.group(1)), m.group(2)
        return f"/characters/{c}/voice-samples/{slot}/upload", f"mẫu giọng {slot} · {c}"

    if stem == "narrator":
        return "/narrator-voice/upload", "giọng người dẫn truyện"

    return None


def multipart(path: Path) -> tuple[bytes, str]:
    """Đóng gói một file thành body multipart/form-data với trường tên `file`."""
    boundary = f"----dramaclaw{uuid.uuid4().hex}"
    ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    return head + path.read_bytes() + tail, f"multipart/form-data; boundary={boundary}"


def post(url: str, path: Path, cookie: str | None, token: str | None) -> tuple[bool, str]:
    body, ctype = multipart(path)
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", ctype)
    if cookie:
        req.add_header("Cookie", cookie)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return False, f"HTTP {exc.code} · {exc.read().decode('utf-8', 'replace')[:200]}"
    except urllib.error.URLError as exc:
        return False, f"không kết nối được: {exc.reason}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return True, raw[:200]
    if isinstance(data, dict) and data.get("ok") is False:
        return False, str(data.get("error", raw[:200]))
    return True, "ok"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True, help="project id trong DramaClaw")
    ap.add_argument("--dir", required=True, help="thư mục chứa file đã đặt tên đúng quy ước")
    ap.add_argument("--api", default="http://localhost:8780", help="địa chỉ API")
    ap.add_argument("--cookie", default=None, help="cookie phiên, chỉ cần khi bị 401")
    ap.add_argument("--token", default=None, help="agent bearer token (bản EE)")
    ap.add_argument("--apply", action="store_true", help="gửi thật; mặc định chỉ xem trước")
    args = ap.parse_args()

    folder = Path(args.dir).expanduser()
    if not folder.is_dir():
        print(f"Không thấy thư mục: {folder}")
        return 1

    base = f"{args.api.rstrip('/')}/api/v1/projects/{args.project}"
    files = sorted(p for p in folder.iterdir()
                   if p.is_file() and p.suffix.lower() in MEDIA_SUFFIXES)
    if not files:
        print(f"Thư mục không có file media nào: {folder}")
        return 1

    planned, skipped = [], []
    for p in files:
        route = route_for(p.name)
        (planned if route else skipped).append((p, route))

    for p, _ in skipped:
        print(f"  bỏ qua   {p.name}  (tên không khớp quy ước)")

    if not planned:
        print("\nKhông có file nào khớp quy ước đặt tên. Xem docs/vi/workflow-provider-thay-the.md")
        return 1

    print(f"\n{len(planned)} file sẽ được đẩy lên {base}\n")
    ok = fail = 0
    for p, (route, label) in planned:
        if not args.apply:
            print(f"  [xem trước] {p.name:<48} → {route}")
            continue
        good, msg = post(base + urllib.parse.quote(route, safe="/"), p, args.cookie, args.token)
        mark = "✓" if good else "✗"
        print(f"  {mark} {label:<44} {p.name}" + ("" if good else f"\n      {msg}"))
        ok, fail = (ok + 1, fail) if good else (ok, fail + 1)

    if not args.apply:
        print("\nChưa gửi gì cả. Thêm --apply để gửi thật.")
    else:
        print(f"\nXong: {ok} thành công, {fail} lỗi.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
