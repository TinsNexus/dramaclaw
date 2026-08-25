#!/usr/bin/env python3
"""Fetch a private Feishu docx using cookies decrypted from the Chrome profile.

Usage:
  python3 feishu_fetch.py <doc_token>
  python3 feishu_fetch.py T2UgdVA4Fo1A5KxCh0vckDz3nTg

Outputs:
  tmp/feishu_<token>/doc.json        — raw blocks JSON
  tmp/feishu_<token>/doc.md          — markdown-ish text dump
  tmp/feishu_<token>/images/         — downloaded images
"""
import base64
import json
import os
import re
import sqlite3
import subprocess
import sys
import urllib.request
from pathlib import Path

TOKEN = sys.argv[1] if len(sys.argv) > 1 else "T2UgdVA4Fo1A5KxCh0vckDz3nTg"
HOME = Path.home()
OUT = Path("/Users/trungtin/WorkSpace/Projects/dramaclaw/tmp") / f"feishu_{TOKEN}"
OUT.mkdir(parents=True, exist_ok=True)
IMG_DIR = OUT / "images"
IMG_DIR.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def chrome_safe_storage_key() -> bytes:
    # Try a provided key file first (written by `security` in the shell).
    key_file = Path("/tmp/chrome_key.txt")
    if key_file.exists() and key_file.stat().st_size >= 32:
        raw = key_file.read_text().strip()
        return raw.encode() if len(raw) >= 32 else base64.b64decode(raw)
    # Fall back to running security ourselves.
    out = subprocess.run(
        ["security", "find-generic-password", "-w", "-s", "Chrome Safe Storage", "-a", "Chrome"],
        capture_output=True, text=True, timeout=120,
    )
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError("could not read Chrome Safe Storage key: " + out.stderr.strip())
    return out.stdout.strip().encode()


def decrypt_value(enc: bytes, key: bytes) -> str:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    if enc[:3] == b"v10":
        nonce, ct, tag = enc[3:15], enc[15:-16], enc[-16:]
        dec = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
        return dec.update(ct) + dec.finalize()
    if enc[:3] == b"v11":
        # v11: header, then key_id (16 bytes?), nonce 12, ct+tag
        # Layout: 'v11' + 16-byte key_id + 12-byte nonce + ct + 16-byte tag
        nonce, ct, tag = enc[19:31], enc[31:-16], enc[-16:]
        dec = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
        return dec.update(ct) + dec.finalize()
    raise RuntimeError(f"unsupported cookie version: {enc[:3]!r}")


def load_cookies() -> dict:
    key = chrome_safe_storage_key()
    db = HOME / "Library/Application Support/Google/Chrome/Default/Cookies"
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    cur = con.cursor()
    rows = cur.execute(
        "SELECT host_key, name, encrypted_value, path, expires_utc FROM cookies "
        "WHERE (host_key LIKE '%feishu.cn' OR host_key LIKE '%larksuite%' OR host_key LIKE '%bytedance%')"
    ).fetchall()
    con.close()
    cookies = {}
    for host, name, enc, path, exp in rows:
        if not enc or enc[:3] not in (b"v10", b"v11"):
            continue
        try:
            val = decrypt_value(bytes(enc), key)
        except Exception as e:
            print(f"[warn] skip cookie {name}: {e}")
            continue
        cookies[name] = val
    print(f"[cookies] decrypted {len(cookies)} feishu cookies")
    return cookies


def http_get(url: str, cookies: dict, referer: str = None) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Cookie": "; ".join(f"{k}={v}" for k, v in cookies.items()),
    })
    if referer:
        req.add_header("Referer", referer)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def main():
    cookies = load_cookies()
    if not cookies:
        print("[error] no cookies decrypted — keychain prompt may have been denied")
        sys.exit(1)

    base = "https://neo-flying.feishu.cn"
    # 1) document meta
    meta_url = (f"{base}/space/api/obj/get_obj_meta/?token={TOKEN}&obj_type=docx"
                f"&with_security_info=true&lang=zh-CN")
    try:
        meta_raw = http_get(meta_url, cookies, referer=f"{base}/docx/{TOKEN}")
    except Exception as e:
        print("[error] meta request failed:", e)
        sys.exit(1)
    try:
        meta = json.loads(meta_raw)
    except Exception:
        meta = {"raw": meta_raw.decode("utf-8", "replace")[:5000]}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print("[meta]", json.dumps(meta.get("data", meta), ensure_ascii=False)[:800])

    # 2) document blocks via the open docx API used by the SPA
    doc_url = (f"{base}/space/api/obj/get_obj_blocks/?token={TOKEN}&obj_type=docx"
               f"&container_type=13&container_id={TOKEN}&lang=zh-CN")
    try:
        blocks_raw = http_get(doc_url, cookies, referer=f"{base}/docx/{TOKEN}")
    except Exception as e:
        print("[error] blocks request failed:", e)
        sys.exit(1)
    try:
        data = json.loads(blocks_raw)
    except Exception:
        data = {"raw": blocks_raw.decode("utf-8", "replace")[:5000]}
    (OUT / "doc.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print("[blocks] response keys:", list(data.keys()) if isinstance(data, dict) else type(data))

    # 3) extract text + images
    texts = []
    img_urls = []
    if isinstance(data, dict) and data.get("code") == 0:
        payload = data.get("data", {})
        items = payload.get("items") or payload.get("blocks") or []
        for it in items:
            node = it.get("node") or it
            # text runs
            for key in ("text", "title", "body", "heading1", "heading2", "heading3"):
                if isinstance(node.get(key), dict):
                    runs = node[key].get("elements") or []
                    t = "".join(r.get("text_run", {}).get("content", "") or
                                r.get("mention_doc", {}).get("title", "") or
                                r.get("equation", {}).get("content", "") or ""
                                for r in runs)
                    if t.strip():
                        texts.append(f"{key}: {t}")
            # image / file
            for key in ("image", "file"):
                if isinstance(node.get(key), dict):
                    tok = node[key].get("token")
                    if tok:
                        img_urls.append(
                            f"https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/image/?token={tok}"
                        )
    (OUT / "doc.md").write_text("\n".join(texts), encoding="utf-8")
    print(f"[text] extracted {len(texts)} lines")

    # 4) download images
    for i, url in enumerate(img_urls):
        try:
            raw = http_get(url, cookies)
            ext = "png"
            if raw[:3] == b"\xff\xd8\xff":
                ext = "jpg"
            elif raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
                ext = "webp"
            elif raw[:4] == b"GIF8":
                ext = "gif"
            (IMG_DIR / f"img-{i:03d}.{ext}").write_bytes(raw)
            print(f"[img] {i}: {ext} {len(raw)} bytes")
        except Exception as e:
            print(f"[img] {i}: FAILED {e}")
    print("[done] output dir:", OUT)


if __name__ == "__main__":
    main()
