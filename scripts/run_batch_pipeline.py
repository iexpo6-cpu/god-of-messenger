#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Batch Visual Pipeline for 신의 사자 RPG
Iterates through visual_analysis_targets.json,
generates high-definition RPG artwork using AI,
uploads directly to ko.imgbb.com via image_uploader,
and updates image_mapping.json.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

from image_uploader import upload_to_imgbb, update_mapping_table

TARGETS_FILE = Path(__file__).resolve().parent / "visual_analysis_targets.json"
OUTPUT_DIR = Path(__file__).resolve().parent / "generated_assets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def fetch_image_with_retry(prompt: str, save_path: str, max_retries: int = 6):
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    for attempt in range(1, max_retries + 1):
        try:
            print(f"  [Gen] Attempt {attempt} requesting image from AI generator...")
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
                if len(data) < 1000:
                    raise ValueError(f"Downloaded image too small: {len(data)} bytes")
                with open(save_path, "wb") as f:
                    f.write(data)
                print(f"  [Gen SUCCESS] Saved to {os.path.basename(save_path)} ({len(data)} bytes)")
                return True
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='ignore')
            print(f"  [Gen HTTP {e.code}] Rate limit or cooldown encountered: {body[:150]}")
            # If 402/429 rate limit, sleep 46 seconds for free quota reset
            sleep_time = 46
            if "Retry after" in body:
                import re
                m = re.search(r'Retry after (\d+)s', body)
                if m:
                    sleep_time = int(m.group(1)) + 2
            print(f"  [Gen Cooldown] Waiting {sleep_time}s before retry...")
            time.sleep(sleep_time)
        except Exception as e:
            print(f"  [Gen Error] {e}. Waiting 15s...")
            time.sleep(15)

    return False

def main():
    if not TARGETS_FILE.exists():
        print(f"Error: {TARGETS_FILE} does not exist!")
        sys.exit(1)

    with open(TARGETS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    targets = data.get("targets", [])
    print(f"Loaded {len(targets)} targets from {TARGETS_FILE.name}")

    results = []

    for idx, target in enumerate(targets, start=1):
        tid = target.get("id")
        name = target.get("name")
        category = target.get("category", "Monster")
        prompt = target.get("prompt")
        
        print(f"\n========================================================")
        print(f"[{idx}/{len(targets)}] Processing: {name} ({tid})")
        print(f"Category: {category}")
        print(f"Prompt: {prompt[:80]}...")
        print(f"========================================================")

        filename = f"{tid}.jpg"
        local_path = os.path.join(OUTPUT_DIR, filename)

        # Check if already generated and uploaded
        with open(Path(__file__).resolve().parent / "image_mapping.json", "r", encoding="utf-8") as mf:
            try:
                mapping = json.load(mf)
                existing = next((item for item in mapping if item.get("name") == name), None)
            except Exception:
                existing = None

        if existing and existing.get("imageUrl") and "i.ibb.co" in existing.get("imageUrl"):
            print(f"  [SKIP] Already generated & uploaded: {existing['imageUrl']}")
            results.append(existing)
            continue

        # 1. Generate image if not already on disk
        if not os.path.isfile(local_path) or os.path.getsize(local_path) < 1000:
            ok = fetch_image_with_retry(prompt, local_path)
            if not ok:
                print(f"  [FAIL] Could not generate image for {name}")
                continue
            # Politeness delay for next request
            time.sleep(2)

        # 2. Upload to ImgBB
        print(f"  [Upload] Uploading {filename} to ko.imgbb.com...")
        try:
            upload_res = upload_to_imgbb(local_path, custom_name=name)
            direct_url = upload_res["direct_url"]
            viewer_url = upload_res["viewer_url"]
            print(f"  [Upload SUCCESS] Direct: {direct_url}")

            entry = {
                "name": name,
                "category": category,
                "prompt": prompt,
                "localPath": os.path.abspath(local_path),
                "imageUrl": direct_url,
                "viewerUrl": viewer_url,
                "host": "imgbb"
            }
            update_mapping_table(entry)
            results.append(entry)
            print(f"  [Mapping Updated] Entry recorded in image_mapping.json")

            # Cooldown to respect 45s free limit before next image generation
            if idx < len(targets):
                print(f"  [Cooling down] Waiting 46s for next entity generation quota...")
                time.sleep(46)

        except Exception as e:
            print(f"  [Upload ERROR] Failed to upload {name}: {e}")

    print("\n\n========================================================")
    print("ALL BATCH TASKS COMPLETED!")
    print(f"Total processed/verified: {len(results)} items")
    print("========================================================")

if __name__ == "__main__":
    main()
