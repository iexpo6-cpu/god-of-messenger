#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Image Pipeline & Uploader Utility for 신의 사자 RPG
Directly uploads to ko.imgbb.com (https://ko.imgbb.com/)
Generates permanent direct i.ibb.co image URLs.
"""

import os
import sys
import json
import time
import re
import argparse
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
from pathlib import Path

DEFAULT_MAPPING_FILE = Path(__file__).resolve().parent / "image_mapping.json"

def upload_to_imgbb(file_path: str, custom_name: str = None) -> dict:
    """
    Directly uploads an image to https://ko.imgbb.com/ using web session.
    Returns full image dict including direct url (https://i.ibb.co/...).
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    filename = os.path.basename(file_path)
    clean_name = custom_name or os.path.splitext(filename)[0]
    ext = os.path.splitext(filename)[1].lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://ko.imgbb.com/',
        'Origin': 'https://ko.imgbb.com'
    }

    # 1. Acquire auth_token from ko.imgbb.com
    req = urllib.request.Request('https://ko.imgbb.com/', headers=headers)
    with opener.open(req, timeout=20) as resp:
        html = resp.read().decode('utf-8', errors='ignore')

    tokens = re.findall(r'PF\.obj\.config\.auth_token\s*=\s*"([^"]+)"', html)
    if not tokens:
        raise RuntimeError("Failed to extract auth_token from ko.imgbb.com")

    auth_token = tokens[0]

    # 2. Build multipart form data
    boundary = "----WebKitFormBoundary" + str(int(time.time() * 1000))
    body = bytearray()

    fields = {
        'type': 'file',
        'action': 'upload',
        'timestamp': str(int(time.time() * 1000)),
        'auth_token': auth_token,
        'category_id': '',
        'nsfw': '0'
    }

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode('utf-8'))
        body.extend(f"{v}\r\n".encode('utf-8'))

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="source"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(f'Content-Type: {mime}\r\n\r\n'.encode('utf-8'))
    body.extend(img_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode('utf-8'))

    upload_req = urllib.request.Request(
        'https://ko.imgbb.com/json',
        data=body,
        headers={
            **headers,
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01'
        }
    )

    with opener.open(upload_req, timeout=60) as resp:
        res = json.loads(resp.read().decode('utf-8'))

    if res.get("status_code") == 200 and "image" in res:
        img_data = res["image"]
        direct_url = img_data.get("url")
        viewer_url = img_data.get("url_viewer")
        return {
            "direct_url": direct_url,
            "viewer_url": viewer_url,
            "raw": img_data
        }
    else:
        raise RuntimeError(f"ImgBB upload returned non-200: {res}")

def update_mapping_table(entry: dict, mapping_file: Path = DEFAULT_MAPPING_FILE):
    data = []
    if mapping_file.exists():
        try:
            with open(mapping_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = []

    # Update or append
    updated = False
    for i, it in enumerate(data):
        if it.get("name") == entry.get("name"):
            data[i] = entry
            updated = True
            break
    if not updated:
        data.append(entry)

    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload images directly to ko.imgbb.com")
    parser.add_argument("file", nargs="?", default=None, help="Path to image file")
    parser.add_argument("--file", dest="file_opt", help="Path to image file as option flag", default=None)
    parser.add_argument("--name", help="Display name of asset", default=None)
    parser.add_argument("--category", help="Category (monster, boss, item, skill, etc.)", default="monster")
    parser.add_argument("--prompt", help="Prompt used", default="")

    args = parser.parse_args()
    target_file = args.file_opt or args.file
    if not target_file:
        parser.error("Target file path must be provided either as positional argument or via --file")

    result = upload_to_imgbb(target_file, args.name)
    print(f"[ImgBB SUCCESS] Direct URL: {result['direct_url']}")
    print(f"[ImgBB SUCCESS] Viewer URL: {result['viewer_url']}")

    entry = {
        "name": args.name or os.path.basename(target_file),
        "category": args.category,
        "prompt": args.prompt,
        "localPath": os.path.abspath(target_file),
        "imageUrl": result["direct_url"],
        "viewerUrl": result["viewer_url"],
        "host": "imgbb"
    }
    update_mapping_table(entry)
