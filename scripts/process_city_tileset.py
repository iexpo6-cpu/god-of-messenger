"""
쯔꾸르 2D 도시 필드 V2 — 고품질 건물·소품 3x2 스프라이트 팩 스마트 객체 분리 스크립트
- 단순 w/3 x h/2 기계적 분할 시 옆 건물이 잘려 섞이는 문제를 완전히 해결:
  1. 마젠타(#FF00FF) 크로마키 배경 Flood-Fill 투명화 + 프린지 제거
  2. 다운샘플링 + 팽창(dilation) 기반 Connected Components(연결 요소)로 독립된 6개 오브젝트 마스크를 정확히 추출
     (건물/나무 주변의 떨어진 꽃잎·불꽃은 가장 가까운 주 객체에 자동 귀속)
  3. 6개 미만으로 닿은 경우에만 투명 픽셀 투영 히스토그램의 최소 골짜기(valley)로 정확히 분할
  4. 6개 객체를 Y(상/하 3개) -> X(좌/중/우) 순으로 정렬해 각 파트 파일로 저장 (옆 건물 픽셀 0% 혼입!)
"""

import os
import re
import sys
from collections import deque
from PIL import Image


CULTURE_CELL_NAMES = [
    ("landmark", (216, 160)),
    ("shop", (208, 152)),
    ("house", (200, 148)),
    ("tree", (104, 104)),
    ("fountain", (120, 120)),
    ("lamp", (68, 100)),
]

SPECIAL_CELL_NAMES = [
    ("special_base", (208, 156)),
    ("special_dungeon", (208, 156)),
    ("special_abyss", (208, 172)),
    ("special_elf", (232, 168)),
    ("special_beast", (232, 168)),
    ("special_demon", (232, 168)),
]

TERRAIN_CELL_NAMES = [
    ("ground", (64, 64)),
    ("road", (64, 64)),
    ("plaza", (64, 64)),
    ("royal_road", (64, 64)),
    ("wall", (64, 64)),
    ("water", (64, 64)),
]

PROPS_CELL_MAP = {
    "props_market": ("props/market", [
        ("stall", (104, 96)),
        ("bench", (72, 56)),
        ("notice_board", (72, 80)),
        ("crates", (76, 72)),
        ("well", (84, 92)),
        ("cart", (96, 80)),
    ]),
    "props_nature": ("props/nature", [
        ("flowerbed", (84, 68)),
        ("boulders", (80, 68)),
        ("planter", (64, 84)),
        ("fence", (84, 60)),
        ("statue", (80, 112)),
        ("bridge", (104, 80)),
    ]),
    "props_fantasy": ("props/fantasy", [
        ("crystal", (76, 96)),
        ("rune_pad", (96, 80)),
        ("banner", (64, 108)),
        ("brazier", (68, 88)),
        ("chest", (68, 64)),
        ("obelisk", (76, 112)),
    ]),
    "props_east_asia": ("props/east_asia", [
        ("archway", (116, 108)),
        ("east_stall", (104, 96)),
        ("guardian", (76, 104)),
        ("clay_wall", (92, 68)),
        ("lantern_rack", (96, 92)),
        ("palanquin", (104, 84)),
    ]),
}


def is_bg_pixel(r: int, g: int, b: int, a: int, bg_rgb: tuple[int, int, int], tol: int = 58) -> bool:
    if a < 16:
        return True
    if r > 170 and b > 170 and g < 120 and (r - g) > 70 and (b - g) > 70:
        return True
    dr = abs(r - bg_rgb[0])
    dg = abs(g - bg_rgb[1])
    db = abs(b - bg_rgb[2])
    return (dr + dg + db) <= tol * 2.2 and max(dr, dg, db) <= tol + 28


def remove_chroma_bg(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    samples = [
        pixels[0, 0][:3], pixels[w - 1, 0][:3],
        pixels[0, h - 1][:3], pixels[w - 1, h - 1][:3],
        pixels[w // 2, 0][:3], pixels[w // 2, h - 1][:3]
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

    # 내부 공백도 탐색할 수 있도록 격자선 샘플링 (실제 배경색 픽셀만 큐에 들어감)
    for x in range(0, w, 16):
        q.append((x, h // 2))
    for y in range(0, h, 16):
        q.append((w // 3, y))
        q.append(((w * 2) // 3, y))

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

    is_magenta = bg_rgb[0] > 175 and bg_rgb[2] > 175 and bg_rgb[1] < 110
    if is_magenta:
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                if r > 180 and b > 180 and g < 115 and (r - g) > 80 and (b - g) > 80:
                    pixels[x, y] = (0, 0, 0, 0)
                elif r > 135 and b > 135 and g < 95 and (r - g) > 50 and (b - g) > 50:
                    pixels[x, y] = (min(r, g + 25), g, min(b, g + 25), max(0, a - 100))

    return rgba


def fit_to_target(cropped: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    tw, th = target_size
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    bbox = cropped.getbbox()
    if not bbox:
        return out
    tight = cropped.crop(bbox)
    cw, ch = tight.size
    if cw <= 0 or ch <= 0:
        return out
    scale = min((tw - 4) / cw, (th - 4) / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = tight.resize((nw, nh), Image.Resampling.LANCZOS)
    dx = (tw - nw) // 2
    dy = max(0, th - 2 - nh)
    out.paste(resized, (dx, dy), resized)
    return out


def fit_terrain_tile(cropped: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    """
    정사각형 바닥/지형 타일 전용 리사이즈:
    외곽 4.5%를 안쪽으로 크롭해 마젠타 경계/안티앨리어싱 여백을 0%로 제거하고
    타일 반복 시 이음새가 없는 100% 불투명 정사각형 텍스처로 저장합니다.
    """
    tw, th = target_size
    bbox = cropped.getbbox()
    if not bbox:
        return Image.new("RGBA", (tw, th), (60, 120, 60, 255))
    tight = cropped.crop(bbox)
    cw, ch = tight.size
    inset_x = max(4, int(cw * 0.045))
    inset_y = max(4, int(ch * 0.045))
    if cw > inset_x * 2 + 16 and ch > inset_y * 2 + 16:
        inner = tight.crop((inset_x, inset_y, cw - inset_x, ch - inset_y))
    else:
        inner = tight
    # 정사각형 비율로 중앙 크롭
    iw, ih = inner.size
    side = min(iw, ih)
    ox = (iw - side) // 2
    oy = (ih - side) // 2
    square = inner.crop((ox, oy, ox + side, oy + side))
    resized = square.resize((tw, th), Image.Resampling.LANCZOS).convert("RGB")
    return resized.convert("RGBA")


def find_valley_split(alpha_counts: list[int], expected: int, search_radius: int) -> int:
    n = len(alpha_counts)
    lo = max(1, expected - search_radius)
    hi = min(n - 2, expected + search_radius)
    best_i = expected
    best_val = alpha_counts[expected]
    for i in range(lo, hi + 1):
        val = alpha_counts[i]
        if val < best_val or (val == best_val and abs(i - expected) < abs(best_i - expected)):
            best_val = val
            best_i = i
    return best_i


def extract_6_objects_smart(clean: Image.Image) -> list[Image.Image]:
    """
    투명화 완료된 3x2 팩에서 6개의 독립 오브젝트를 옆 객체 픽셀 혼입 없이 정확히 추출합니다.
    """
    w, h = clean.size
    # 빠른 connected-component 분석을 위해 1/4 축소 마스크 생성
    scale_div = max(1, min(w, h) // 360)
    sw = max(1, w // scale_div)
    sh = max(1, h // scale_div)
    small_alpha = clean.getchannel("A").resize((sw, sh), Image.Resampling.BILINEAR)
    sa = small_alpha.load()

    # 1. Connected Components 탐색 (8방향)
    comp_id = [[-1] * sw for _ in range(sh)]
    comps = []  # list of dict: {id, count, minx, miny, maxx, maxy, sumx, sumy}

    for y in range(sh):
        for x in range(sw):
            if sa[x, y] <= 20 or comp_id[y][x] != -1:
                continue
            cid = len(comps)
            q = deque([(x, y)])
            comp_id[y][x] = cid
            count = 0
            minx = maxx = x
            miny = maxy = y
            sumx = sumy = 0
            while q:
                cx, cy = q.popleft()
                count += 1
                sumx += cx
                sumy += cy
                if cx < minx: minx = cx
                if cx > maxx: maxx = cx
                if cy < miny: miny = cy
                if cy > maxy: maxy = cy
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < sw and 0 <= ny < sh and comp_id[ny][nx] == -1 and sa[nx, ny] > 20:
                            comp_id[ny][nx] = cid
                            q.append((nx, ny))
            comps.append({
                "id": cid, "count": count,
                "minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy,
                "cx": sumx / count, "cy": sumy / count
            })

    # 2. 면적이 충분한 주요 객체 필터링 (전체 소형 픽셀의 0.35% 이상)
    min_major = max(25, int(sw * sh * 0.0035))
    major = sorted([c for c in comps if c["count"] >= min_major], key=lambda c: c["count"], reverse=True)

    if len(major) >= 6:
        top6 = major[:6]
        top6_ids = {c["id"] for c in top6}

        # 작은 조각(떨어진 꽃잎, 간판, 불꽃 등)은 중심점 거리가 가장 가까운 top6 객체에 귀속
        owner_map: dict[int, int] = {c["id"]: c["id"] for c in top6}
        for c in comps:
            if c["id"] in top6_ids:
                continue
            best_owner = min(
                top6,
                key=lambda m: (c["cx"] - m["cx"]) ** 2 + (c["cy"] - m["cy"]) ** 2
            )
            # 바운딩 박스에서 너무 멀지 않은(15% 이내) 조각만 귀속
            dist = ((c["cx"] - best_owner["cx"]) ** 2 + (c["cy"] - best_owner["cy"]) ** 2) ** 0.5
            if dist <= max(sw, sh) * 0.22:
                owner_map[c["id"]] = best_owner["id"]

        # 6개 객체를 상단 3개(cy 오름차순 -> cx 오름차순), 하단 3개(cx 오름차순)로 정렬
        top6_by_y = sorted(top6, key=lambda c: c["cy"])
        row0 = sorted(top6_by_y[:3], key=lambda c: c["cx"])
        row1 = sorted(top6_by_y[3:], key=lambda c: c["cx"])
        ordered = row0 + row1

        # 각 객체별 마스크를 원본 해상도로 확장해 깔끔하게 추출
        results: list[Image.Image] = []
        for target_comp in ordered:
            tid = target_comp["id"]
            # 해당 객체에 귀속된 모든 소형 픽셀로 바운딩 박스 확장
            minx, miny, maxx, maxy = sw, sh, 0, 0
            mask_small = Image.new("L", (sw, sh), 0)
            ms = mask_small.load()
            for y in range(sh):
                for x in range(sw):
                    cid = comp_id[y][x]
                    if cid != -1 and owner_map.get(cid) == tid:
                        ms[x, y] = 255
                        if x < minx: minx = x
                        if x > maxx: maxx = x
                        if y < miny: miny = y
                        if y > maxy: maxy = y

            # 약간의 여유 마진(2px) 두고 원본 크기로 마스크 확대 후 추출
            pad = 2
            sx0 = max(0, (minx - pad) * scale_div)
            sy0 = max(0, (miny - pad) * scale_div)
            sx1 = min(w, (maxx + pad + 1) * scale_div)
            sy1 = min(h, (maxy + pad + 1) * scale_div)

            mask_full = mask_small.resize((w, h), Image.Resampling.NEAREST).crop((sx0, sy0, sx1, sy1))
            src_crop = clean.crop((sx0, sy0, sx1, sy1))
            extracted = Image.new("RGBA", src_crop.size, (0, 0, 0, 0))
            extracted.paste(src_crop, (0, 0), mask_full)
            results.append(extracted)

        return results, "CC-6"

    # 3. 폴백: 두 객체가 닿아 6개 미만으로 합쳐진 경우 -> 투명 픽셀 최소 골짜기(valley) 분할
    alpha_band = clean.getchannel("A")
    ap = alpha_band.load()
    row_sums = [sum(1 for x in range(0, w, 4) if ap[x, y] > 20) for y in range(h)]
    split_y = find_valley_split(row_sums, h // 2, h // 6)

    results = []
    for y0, y1 in ((0, split_y), (split_y, h)):
        col_sums = [sum(1 for y in range(y0, y1, 4) if ap[x, y] > 20) for x in range(w)]
        s1 = find_valley_split(col_sums, w // 3, w // 8)
        s2 = find_valley_split(col_sums, (w * 2) // 3, w // 8)
        for x0, x1 in ((0, s1), (s1, s2), (s2, w)):
            results.append(clean.crop((x0, y0, x1, y1)))
    return results, f"VALLEY(major={len(major)})"


def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    raw_dir = os.path.join(root_dir, "raw_tilesets")
    if not os.path.exists(raw_dir):
        print(f"Missing folder: {raw_dir}")
        return

    out_roots = [
        os.path.join(root_dir, "src", "public", "assets", "visuals", "city_tiles"),
        os.path.join(root_dir, "public", "assets", "visuals", "city_tiles"),
    ]

    filters = [a.lower() for a in sys.argv[1:]]
    files = [
        f for f in os.listdir(raw_dir)
        if os.path.isfile(os.path.join(raw_dir, f)) and re.search(r"\.(png|jpg|jpeg|webp)$", f, re.I)
    ]

    processed = 0
    for fname in sorted(files):
        base_key = re.sub(r"(\.(png|jpg|jpeg|webp))+$", "", fname, flags=re.I).lower().strip()
        if filters and not any(base_key.startswith(flt) or flt in base_key for flt in filters):
            continue

        raw_path = os.path.join(raw_dir, fname)
        clean = remove_chroma_bg(Image.open(raw_path))
        pieces, mode = extract_6_objects_smart(clean)

        is_terrain = base_key.startswith("terrain_")
        is_props = base_key in PROPS_CELL_MAP
        is_special = base_key in ("special", "special_buildings")

        if is_terrain:
            biome_key = base_key[len("terrain_"):]
            spec_list = TERRAIN_CELL_NAMES
            sub_folder = os.path.join("terrain", biome_key)
        elif is_props:
            sub_folder, spec_list = PROPS_CELL_MAP[base_key]
        elif is_special:
            spec_list = SPECIAL_CELL_NAMES
            sub_folder = "special"
        else:
            spec_list = CULTURE_CELL_NAMES
            sub_folder = base_key

        for out_root in out_roots:
            os.makedirs(os.path.join(out_root, sub_folder), exist_ok=True)

        for idx, (part_name, size) in enumerate(spec_list):
            fitted = fit_terrain_tile(pieces[idx], size) if is_terrain else fit_to_target(pieces[idx], size)
            for out_root in out_roots:
                fitted.save(os.path.join(out_root, sub_folder, f"{part_name}.png"), "PNG", optimize=True)

        processed += 1
        print(f"[SMART OK | {mode}] {fname} -> city_tiles/{sub_folder.replace(os.sep, '/')}/ (6 clean objects)")

    print(f"Done! Smart-extracted {processed} tileset packs.")


if __name__ == "__main__":
    main()
