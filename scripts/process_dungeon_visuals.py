#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
던전 비주얼 에셋 5종(Gemini_Generated_Image_*.png) 자동 격자 크롭 + 마젠타(#FF00FF) 크로마키 투명화 +
4곳(src/public/assets, public/assets, assets, dist/assets) 동기화 스크립트

추출 대상 (총 28개 PNG):
1. Gemini_Generated_Image_nlawcwnlawcwnlaw.png (2x2 타일셋)
   - tile_floor_stone.png, tile_wall_stone.png, tile_floor_mythic.png, tile_wall_mythic.png
2. Gemini_Generated_Image_3u22sp3u22sp3u22.png (3x2 핵심 오브젝트)
   - entrance_gate.png, stairs_down.png, stairs_up.png, chest_closed.png, chest_open.png, shrine_fountain.png
3. Gemini_Generated_Image_npfzl8npfzl8npfz.png (3x2 전투·봉인 심볼)
   - rune_locked.png, rune_active.png, mystery_wisp.png, enemy_marker.png, miniboss_marker.png, boss_throne.png
4. Gemini_Generated_Image_aqvz3gaqvz3gaqvz.png (3x2 소품·장식)
   - wall_torch.png, stone_pillar.png, barrel_crates.png, skeleton_bones.png, crystal_cluster.png, magic_circle.png
5. Gemini_Generated_Image_t9ud9mt9ud9mt9ud.png (3x2 원소 지형 장판)
   - zone_fire_lava.png, zone_water_puddle.png, zone_ice_frost.png, zone_poison_swamp.png, zone_holy_sanctuary.png, zone_thunder_crack.png
"""

import os
import sys
from collections import deque
from PIL import Image

sys.path.append(os.path.dirname(__file__))
from process_city_tileset import extract_6_objects_smart, fit_to_target, is_bg_pixel


SHEET_SPECS_3X2 = [
    (
        "Gemini_Generated_Image_3u22sp3u22sp3u22.png",
        [
            ("entrance_gate", (128, 128)),
            ("stairs_down", (128, 128)),
            ("stairs_up", (128, 128)),
            ("chest_closed", (112, 112)),
            ("chest_open", (112, 112)),
            ("shrine_fountain", (128, 128)),
        ],
    ),
    (
        "Gemini_Generated_Image_npfzl8npfzl8npfz.png",
        [
            ("rune_locked", (128, 128)),
            ("rune_active", (128, 128)),
            ("mystery_wisp", (112, 112)),
            ("enemy_marker", (120, 120)),
            ("miniboss_marker", (128, 128)),
            ("boss_throne", (144, 144)),
        ],
    ),
    (
        "Gemini_Generated_Image_aqvz3gaqvz3gaqvz.png",
        [
            ("wall_torch", (112, 128)),
            ("stone_pillar", (112, 128)),
            ("barrel_crates", (120, 112)),
            ("skeleton_bones", (120, 112)),
            ("crystal_cluster", (120, 120)),
            ("magic_circle", (144, 144)),
        ],
    ),
    (
        "Gemini_Generated_Image_t9ud9mt9ud9mt9ud.png",
        [
            ("zone_fire_lava", (128, 128)),
            ("zone_water_puddle", (128, 128)),
            ("zone_ice_frost", (128, 128)),
            ("zone_poison_swamp", (128, 128)),
            ("zone_holy_sanctuary", (128, 128)),
            ("zone_thunder_crack", (128, 128)),
        ],
    ),
]

SHEET_SPEC_2X2_TILES = (
    "Gemini_Generated_Image_nlawcwnlawcwnlaw.png",
    [
        ("tile_floor_stone", (0, 0), (128, 128), False),
        ("tile_wall_stone", (1, 0), (128, 128), False),
        ("tile_floor_mythic", (0, 1), (128, 128), False),
        ("tile_wall_mythic", (1, 1), (128, 128), True),  # 우측 하단 워터마크 회피 인셋
    ],
)


def remove_chroma_bg_deep(img: Image.Image) -> Image.Image:
    """
    마젠타(#FF00FF) 크로마키 배경을 완벽히 투명화하고,
    우측 하단 Gemini 워터마크(독립된 작은 별 조각)는 extract_6_objects_smart의 top-6 필터로 자연스럽게 탈락되며,
    내부 닫힌 마젠타 홀(마법진 내부 등)까지 깔끔하게 제거합니다.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    samples = [
        pixels[0, 0][:3],
        pixels[w - 1, 0][:3],
        pixels[0, h - 1][:3],
        pixels[w // 2, 0][:3],
        pixels[w // 2, h - 1][:3],
    ]
    rs = sorted(s[0] for s in samples)
    gs = sorted(s[1] for s in samples)
    bs = sorted(s[2] for s in samples)
    bg_rgb = (rs[len(rs) // 2], gs[len(gs) // 2], bs[len(bs) // 2])

    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    # 촘촘한 격자 시드로 닫힌 내부 구멍(마법진, 사슬 사이 등)의 마젠타도 탐색
    for y in range(0, h, 24):
        for x in range(0, w, 24):
            r, g, b, a = pixels[x, y]
            if r > 210 and b > 210 and g < 65:
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or visited[y][x]:
            continue
        r, g, b, a = pixels[x, y]
        if not is_bg_pixel(r, g, b, a, bg_rgb):
            continue
        visited[y][x] = True
        pixels[x, y] = (0, 0, 0, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))

    # 우측 하단 코너(180x180)에 위치한 Gemini 워터마크(연보라/핑크/흰색 별)만 정밀 제거
    for y in range(max(0, h - 180), h):
        for x in range(max(0, w - 180), w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # 워터마크 별은 밝은 핑크/연보라/흰색 (r>170, b>170, g>95, R과 B가 비슷하고 G보다 높음)
            if r > 170 and b > 170 and g > 95 and abs(r - b) < 42 and (b - g) > 10:
                pixels[x, y] = (0, 0, 0, 0)

    # 마젠타 잔여 픽셀 및 외곽 안티앨리어싱 프린지(fringe) 제거
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r > 180 and b > 180 and g < 110 and (r - g) > 80 and (b - g) > 80:
                pixels[x, y] = (0, 0, 0, 0)
            elif r > 135 and b > 135 and g < 95 and (r - g) > 50 and (b - g) > 50:
                pixels[x, y] = (min(r, g + 25), g, min(b, g + 25), max(0, a - 110))

    return rgba


def resolve_raw_path(root_dir: str, fname: str) -> str | None:
    candidates = [
        os.path.join(root_dir, "assets", "visuals", fname),
        os.path.join(root_dir, "public", "assets", "visuals", fname),
        os.path.join(root_dir, "src", "public", "assets", "visuals", fname),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def save_to_all_targets(img: Image.Image, out_dirs: list[str], filename: str) -> None:
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)
        img.save(os.path.join(d, filename), "PNG", optimize=True)


def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # 3곳(public/assets, assets, dist/assets) + Vite 빌드 원본(src/public/assets)까지 동시 저장
    # props/dungeon 경로와 visuals/dungeon 경로 모두에 동기화하여 어디서든 0ms 로드 보장
    out_dirs = [
        os.path.join(root_dir, "src", "public", "assets", "props", "dungeon"),
        os.path.join(root_dir, "public", "assets", "props", "dungeon"),
        os.path.join(root_dir, "assets", "props", "dungeon"),
        os.path.join(root_dir, "dist", "assets", "props", "dungeon"),
        os.path.join(root_dir, "src", "public", "assets", "visuals", "dungeon"),
        os.path.join(root_dir, "public", "assets", "visuals", "dungeon"),
        os.path.join(root_dir, "assets", "visuals", "dungeon"),
        os.path.join(root_dir, "dist", "assets", "visuals", "dungeon"),
    ]

    total_saved = 0

    # 1. 2x2 바닥/벽 타일 시트 크롭
    tile_fname, tile_specs = SHEET_SPEC_2X2_TILES
    tile_raw = resolve_raw_path(root_dir, tile_fname)
    if tile_raw:
        src = Image.open(tile_raw).convert("RGBA")
        w, h = src.size
        hw, hh = w // 2, h // 2
        for key, (gx, gy), target_size, avoid_wm in tile_specs:
            x0 = gx * hw
            y0 = gy * hh
            x1 = (gx + 1) * hw
            y1 = (gy + 1) * hh
            inset = int(hw * 0.025)
            if avoid_wm:
                # 우측 하단 워터마크(150px)를 완전히 피하면서 상단/좌측 중심의 정사각형 영역 크롭
                side = int(hw * 0.82)
                cropped = src.crop((x0 + inset, y0 + inset, x0 + inset + side, y0 + inset + side))
            else:
                cropped = src.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
            resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
            save_to_all_targets(resized, out_dirs, f"{key}.png")
            total_saved += 1
            print(f"[2x2 TILE OK] {key}.png ({target_size[0]}x{target_size[1]})")
    else:
        print(f"[WARN] Missing 2x2 tile sheet: {tile_fname}")

    # 2. 3x2 오브젝트/심볼/소품/원소장판 시트 4종 스마트 분리 + 마젠타 투명화
    for fname, spec_list in SHEET_SPECS_3X2:
        raw_path = resolve_raw_path(root_dir, fname)
        if not raw_path:
            print(f"[WARN] Missing 3x2 sheet: {fname}")
            continue
        src = Image.open(raw_path)
        clean = remove_chroma_bg_deep(src)
        pieces, mode = extract_6_objects_smart(clean)
        for idx, (key, target_size) in enumerate(spec_list):
            fitted = fit_to_target(pieces[idx], target_size)
            save_to_all_targets(fitted, out_dirs, f"{key}.png")
            total_saved += 1
        print(f"[3x2 SMART OK | {mode}] {fname} -> {[k for k, _ in spec_list]}")

    print(f"\n✅ Total {total_saved} dungeon assets extracted, chroma-cleaned, and synced to all target directories!")


if __name__ == "__main__":
    main()
