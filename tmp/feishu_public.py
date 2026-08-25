#!/usr/bin/env python3
"""Fetch a PUBLIC Feishu docx (text + images) without login.

Usage:
  python3 feishu_public.py <doc_token>
  python3 feishu_public.py T2UgdVA4Fo1A5KxCh0vckDz3nTg

Outputs under tmp/feishu_public_<token>/:
  doc.md    — markdown-ish text with image placeholders
  images/   — downloaded images
  raw.json  — raw API response for reference
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

TOKEN = sys.argv[1] if len(sys.argv) > 1 else "T2UgdVA4Fo1A5KxCh0vckDz3nTg"
OUT = Path("/Users/trungtin/WorkSpace/Projects/dramaclaw/tmp") / f"feishu_public_{TOKEN}"
OUT.mkdir(parents=True, exist_ok=True)
IMG_DIR = OUT / "images"
IMG_DIR.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
BASE = "https://neo-flying.feishu.cn"


def get(url: str, referer: str | None = None) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,vi;q=0.7",
    })
    if referer:
        req.add_header("Referer", referer)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def block_text(node: dict) -> str:
    """Extract text from a docx block node (text/heading/callout etc.)."""
    parts = []
    for key in ("text", "title", "heading1", "heading2", "heading3",
                "heading4", "heading5", "heading6", "bullet", "ordered",
                "callout", "code", "quote", "todo"):
        if isinstance(node.get(key), dict):
            for el in node[key].get("elements", []) or []:
                if "text_run" in el:
                    parts.append(el["text_run"].get("content", ""))
                elif "mention_doc" in el:
                    parts.append(el["mention_doc"].get("title", ""))
                elif "equation" in el:
                    parts.append(el["equation"].get("content", ""))
    return "".join(parts)


def main():
    # 1) document metadata (title)
    meta_url = f"{BASE}/space/api/obj/get_obj_meta/?token={TOKEN}&obj_type=docx&with_security_info=true&lang=zh-CN"
    try:
        meta_raw = get(meta_url, referer=f"{BASE}/docx/{TOKEN}")
        meta = json.loads(meta_raw)
        print("[meta] code:", meta.get("code"), "msg:", meta.get("msg"))
        data = meta.get("data", {})
        print("[meta] title:", data.get("title"), "| owner:", data.get("owner_id"))
    except Exception as e:
        print("[meta] failed:", e)

    # 2) blocks (document content)
    blocks_url = (f"{BASE}/space/api/obj/get_obj_blocks/"
                  f"?token={TOKEN}&obj_type=docx&container_type=13&container_id={TOKEN}&lang=zh-CN")
    try:
        raw = get(blocks_url, referer=f"{BASE}/docx/{TOKEN}")
        data = json.loads(raw)
        (OUT / "raw.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
        print("[blocks] code:", data.get("code"), "msg:", data.get("msg"))
    except Exception as e:
        print("[blocks] failed:", e)
        return

    if data.get("code") != 0:
        print("[blocks] not accessible (code != 0) — doc may still be private")
        return

    payload = data.get("data", {})
    items = payload.get("items") or []
    print("[blocks] item count:", len(items))

    lines: list[str] = []
    img_count = 0
    for idx, it in enumerate(items):
        node = it.get("node") or {}
        # block type + parent
        bt = node.get("block_type")
        # images / files
        img_tok = None
        for key in ("image", "file", "media", "mindnote", "sheet", "chart"):
            if isinstance(node.get(key), dict):
                img_tok = node[key].get("token")
                if img_tok:
                    break
        if img_tok:
            url = (f"https://internal-api-drive-stream.feishu.cn/space/api/box/stream/"
                   f"download/image/?token={img_tok}")
            ext = "png"
            try:
                b = get(url, referer=f"{BASE}/docx/{TOKEN}")
                if b[:3] == b"\xff\xd8\xff":
                    ext = "jpg"
                elif b[:4] == b"RIFF" and b[8:12] == b"WEBP":
                    ext = "webp"
                elif b[:4] == b"GIF8":
                    ext = "gif"
                p = IMG_DIR / f"img-{img_count:03d}.{ext}"
                p.write_bytes(b)
                lines.append(f"\n![Hình {img_count + 1}](images/img-{img_count:03d}.{ext})\n")
                print(f"[img {img_count}] {ext} {len(b)} bytes")
                img_count += 1
            except Exception as e:
                print(f"[img {img_count}] FAILED: {e}")
                lines.append(f"\n[Hình: tải thất bại — token {img_tok}]\n")
                img_count += 1
            continue

        # text
        text = block_text(node)
        if not text.strip():
            continue
        prefix = ""
        if bt == 2:
            prefix = "# "
        elif bt == 3:
            prefix = "## "
        elif bt == 4:
            prefix = "### "
        elif bt == 5:
            prefix = "#### "
        elif bt == 6:
            prefix = "##### "
        elif bt == 7:
            prefix = "###### "
        elif bt == 11:
            prefix = "> "
        elif bt == 12:
            prefix = "```\n"
        lines.append(f"{prefix}{text}")
        if bt == 12:
            lines.append("```")

    (OUT / "doc.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] text lines: {len(lines)}, images: {img_count}")
    print("output:", OUT)


if __name__ == "__main__":
    main()
