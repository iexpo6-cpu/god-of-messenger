"""
쯔꾸르(RPG Maker) 3x4 캐릭터 스프라이트 시트 후처리 & 미생성분 16-bit 픽셀아트 자동 생성 스크립트
1. AI 생성 원본(10종): 마젠타(#FF00FF) 크로마키 투명화 + 3x4 144x192 정규화 + 좌/우 방향 일관성 자동 보정
2. 쿼터 소진 미생성분(12종): 지역별 고유 복식/특징(수인 귀·꼬리, 신계 날개, 아비살론 암흑 뿔 등)을 반영한
   16-bit JRPG 픽셀아트 3x4 스프라이트 시트(144x192 PNG) 자동 생성
3. src/public/assets/visuals/sprites/ 및 public/assets/visuals/sprites/에 22종 동시 저장
"""

import json
import os
import sys
from collections import deque
from PIL import Image, ImageDraw


CELL_W = 48
CELL_H = 48
COLS = 3
ROWS = 4
SHEET_W = CELL_W * COLS  # 144
SHEET_H = CELL_H * ROWS  # 192


def is_bg_pixel(r: int, g: int, b: int, a: int, bg_rgb: tuple[int, int, int], tol: int = 58) -> bool:
    if a < 16:
        return True
    if r > 170 and b > 170 and g < 120 and (r - g) > 70 and (b - g) > 70:
        return True
    dr = abs(r - bg_rgb[0])
    dg = abs(g - bg_rgb[1])
    db = abs(b - bg_rgb[2])
    return (dr + dg + db) <= tol * 2.2 and max(dr, dg, db) <= tol + 28


def remove_background_floodfill(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    sample_coords = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)
    ]
    samples = [pixels[x, y][:3] for x, y in sample_coords]
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

    for c in range(1, COLS):
        gx = int(w * c / COLS)
        for y in range(h):
            q.append((gx, y))
    for r_idx in range(1, ROWS):
        gy = int(h * r_idx / ROWS)
        for x in range(w):
            q.append((x, gy))

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

    is_magenta_bg = bg_rgb[0] > 175 and bg_rgb[2] > 175 and bg_rgb[1] < 110
    if is_magenta_bg:
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


def fit_cell(cell_img: Image.Image) -> Image.Image:
    out_cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    bbox = cell_img.getbbox()
    if not bbox:
        return out_cell
    cropped = cell_img.crop(bbox)
    cw, ch = cropped.size
    if cw <= 0 or ch <= 0:
        return out_cell
    scale = min((CELL_W - 6) / cw, (CELL_H - 4) / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    dx = (CELL_W - nw) // 2
    dy = max(0, CELL_H - 2 - nh)
    out_cell.paste(resized, (dx, dy), resized)
    return out_cell


def make_walk_variants(base_cell: Image.Image) -> list[Image.Image]:
    """단일 방향 기준 프레임을 미세 걷기 바운스 3프레임(왼발, 정지, 오른발)으로 정규화"""
    f0 = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    f0.paste(base_cell, (-1, -2), base_cell)
    f1 = base_cell.copy()
    f2 = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    f2.paste(base_cell, (1, -2), base_cell)
    return [f0, f1, f2]


def normalize_3x4_sheet(raw_path: str, fix_side_rows: bool = False, fix_up_row: bool = False) -> Image.Image:
    src = Image.open(raw_path)
    clean = remove_background_floodfill(src)
    w, h = clean.size

    cell_src_w = w / COLS
    cell_src_h = h / ROWS

    grid: list[list[Image.Image]] = []
    for row in range(ROWS):
        row_cells = []
        for col in range(COLS):
            x0 = int(round(col * cell_src_w))
            y0 = int(round(row * cell_src_h))
            x1 = int(round((col + 1) * cell_src_w))
            y1 = int(round((row + 1) * cell_src_h))
            row_cells.append(fit_cell(clean.crop((x0, y0, x1, y1))))
        grid.append(row_cells)

    # AI 생성본 중 2행(LEFT)/3행(RIGHT)에 정면/반대방향이 섞인 경우:
    # 2행 1열(왼쪽)을 기준으로 깔끔한 3프레임 LEFT 생성 + 수평 반전으로 완벽 대칭 RIGHT 생성
    if fix_side_rows:
        left_base = grid[1][0]
        grid[1] = make_walk_variants(left_base)
        right_base = left_base.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        grid[2] = make_walk_variants(right_base)

    # 4행(UP)의 2·3열에 정면이 섞인 경우 4행 1열(뒷모습) 기준으로 정규화
    if fix_up_row:
        up_base = grid[3][0]
        grid[3] = make_walk_variants(up_base)

    out = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            out.paste(grid[row][col], (col * CELL_W, row * CELL_H), grid[row][col])
    return out


# ============================================================================
# 16-bit JRPG 픽셀아트 치비 스프라이트 시트 생성기 (쿼터 소진 미생성 12종용)
# ============================================================================

PROCEDURAL_SPECS = {
    "europe_female": {
        "gender": "female", "skin": (252, 225, 203), "hair": (234, 197, 102),
        "outfit": (21, 128, 61), "accent": (245, 198, 66), "cape": (22, 101, 52), "trait": "none"
    },
    "north_america_male": {
        "gender": "male", "skin": (245, 207, 180), "hair": (78, 46, 26),
        "outfit": (120, 53, 15), "accent": (56, 189, 248), "cape": (92, 42, 16), "trait": "scarf"
    },
    "north_america_female": {
        "gender": "female", "skin": (248, 214, 188), "hair": (133, 77, 39),
        "outfit": (37, 99, 235), "accent": (217, 119, 6), "cape": (146, 64, 14), "trait": "ponytail"
    },
    "oceania_male": {
        "gender": "male", "skin": (234, 185, 144), "hair": (113, 63, 18),
        "outfit": (2, 132, 199), "accent": (254, 240, 138), "cape": (241, 245, 249), "trait": "scarf"
    },
    "oceania_female": {
        "gender": "female", "skin": (238, 192, 152), "hair": (161, 98, 42),
        "outfit": (244, 114, 182), "accent": (45, 212, 191), "cape": (14, 165, 233), "trait": "none"
    },
    "africa_male": {
        "gender": "male", "skin": (146, 94, 58), "hair": (24, 24, 27),
        "outfit": (248, 250, 252), "accent": (234, 179, 8), "cape": (185, 28, 28), "trait": "scarf"
    },
    "africa_female": {
        "gender": "female", "skin": (156, 102, 64), "hair": (24, 24, 27),
        "outfit": (217, 119, 6), "accent": (20, 184, 166), "cape": (250, 204, 21), "trait": "none"
    },
    "shingye_male": {
        "gender": "male", "skin": (255, 238, 224), "hair": (250, 232, 150),
        "outfit": (248, 250, 252), "accent": (245, 158, 11), "cape": (251, 191, 36), "trait": "wings"
    },
    "shingye_female": {
        "gender": "female", "skin": (255, 238, 224), "hair": (254, 240, 138),
        "outfit": (255, 255, 255), "accent": (251, 191, 36), "cape": (253, 224, 71), "trait": "wings"
    },
    "feraldia_female": {
        "gender": "female", "skin": (235, 188, 152), "hair": (217, 119, 6),
        "outfit": (185, 28, 28), "accent": (253, 224, 71), "cape": (154, 52, 18), "trait": "beast"
    },
    "abyssalon_male": {
        "gender": "male", "skin": (216, 222, 233), "hair": (167, 139, 250),
        "outfit": (49, 46, 129), "accent": (192, 132, 252), "cape": (30, 27, 75), "trait": "horns"
    },
    "abyssalon_female": {
        "gender": "female", "skin": (216, 222, 233), "hair": (196, 181, 253),
        "outfit": (59, 7, 100), "accent": (216, 180, 254), "cape": (76, 29, 149), "trait": "horns"
    },
}


def shade(rgb: tuple[int, int, int], factor: float) -> tuple[int, int, int, 255]:
    return (
        max(0, min(255, int(rgb[0] * factor))),
        max(0, min(255, int(rgb[1] * factor))),
        max(0, min(255, int(rgb[2] * factor))),
        255
    )


def draw_pixel_chibi_cell(spec: dict, row: int, col: int) -> Image.Image:
    # 24x24 픽셀 도트로 그린 뒤 48x48 NEAREST 확대 -> 진짜 16-bit 쯔꾸르 픽셀아트 감성!
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)

    outline = (22, 20, 32, 255)
    skin = (*spec["skin"], 255)
    skin_sh = shade(spec["skin"], 0.85)
    hair = (*spec["hair"], 255)
    hair_hi = shade(spec["hair"], 1.18)
    hair_sh = shade(spec["hair"], 0.72)
    outfit = (*spec["outfit"], 255)
    outfit_sh = shade(spec["outfit"], 0.75)
    accent = (*spec["accent"], 255)
    cape = (*spec["cape"], 255)
    boot = (42, 36, 48, 255)
    eye = (20, 24, 42, 255)

    is_female = spec["gender"] == "female"
    trait = spec["trait"]
    bob = -1 if col != 1 else 0
    step_l = -1 if col == 0 else (1 if col == 2 else 0)
    step_r = -step_l

    def px(x: int, y: int, c):
        if 0 <= x < 24 and 0 <= y < 24:
            d.point((x, y), fill=c)

    def rect(x0: int, y0: int, x1: int, y1: int, c):
        d.rectangle([x0, y0, x1, y1], fill=c)

    # 날개 (신계)
    if trait == "wings":
        wy = 12 + bob
        rect(3, wy, 6, wy + 4, (255, 252, 230, 255))
        rect(17, wy, 20, wy + 4, (255, 252, 230, 255))
        px(4, wy + 1, accent)
        px(19, wy + 1, accent)

    # 수인 꼬리
    if trait == "beast" and row in (0, 3):
        rect(16, 17 + bob, 19, 19 + bob, hair)
        px(19, 17 + bob, (255, 250, 240, 255))

    # 망토/등 장식
    if row == 3:  # UP (뒷모습 망토 강조)
        rect(7, 13 + bob, 16, 20 + bob, cape)
        rect(8, 13 + bob, 15, 14 + bob, accent)
    elif row == 0:  # DOWN
        rect(6, 14 + bob, 17, 19 + bob, cape)

    # 다리 / 부츠
    if row in (0, 3):
        rect(8, 19 + min(0, step_l), 10, 22 + min(0, step_l), boot)
        rect(13, 19 + min(0, step_r), 15, 22 + min(0, step_r), boot)
    else:  # LEFT(1) / RIGHT(2)
        rect(10 + step_l, 19, 12 + step_l, 22, boot)
        rect(11 + step_r, 19, 13 + step_r, 22, shade((42, 36, 48), 0.7))

    # 몸통 의상
    if row in (0, 3):
        rect(7, 13 + bob, 16, 19 + bob, outline)
        rect(8, 13 + bob, 15, 18 + bob, outfit)
        rect(8, 17 + bob, 15, 18 + bob, outfit_sh)
        rect(8, 16 + bob, 15, 16 + bob, accent)  # 벨트/포인트
        if is_female:
            rect(7, 18 + bob, 16, 19 + bob, outfit)
    else:
        rect(8, 13 + bob, 15, 19 + bob, outline)
        rect(9, 13 + bob, 14, 18 + bob, outfit)
        rect(9, 16 + bob, 14, 16 + bob, accent)

    # 팔
    if row in (0, 3):
        rect(6, 14 + bob + (1 if col == 0 else 0), 7, 17 + bob + (1 if col == 0 else 0), skin_sh)
        rect(16, 14 + bob + (1 if col == 2 else 0), 17, 17 + bob + (1 if col == 2 else 0), skin_sh)

    # 머리 외곽 + 얼굴
    hy = 3 + bob
    rect(6, hy, 17, hy + 9, outline)
    rect(7, hy + 1, 16, hy + 8, skin)
    rect(7, hy + 7, 16, hy + 8, skin_sh)

    # 머리카락
    rect(6, hy, 17, hy + 3, hair)
    rect(7, hy, 16, hy + 1, hair_hi)
    if row == 3:  # 뒷모습 전체 머리카락
        rect(7, hy + 1, 16, hy + 8, hair)
        rect(7, hy + 6, 16, hy + 8, hair_sh)
        if is_female:
            rect(6, hy + 4, 17, hy + 11, hair)
    elif row == 0:  # 앞모습
        rect(6, hy + 2, 7, hy + 7, hair_sh)
        rect(16, hy + 2, 17, hy + 7, hair_sh)
        if is_female:
            rect(6, hy + 3, 7, hy + 11, hair)
            rect(16, hy + 3, 17, hy + 11, hair)
        # 눈
        rect(9, hy + 5, 9, hy + 6, eye)
        rect(14, hy + 5, 14, hy + 6, eye)
        px(9, hy + 5, (255, 255, 255, 255))
        px(14, hy + 5, (255, 255, 255, 255))
    elif row == 1:  # LEFT
        rect(13, hy + 2, 17, hy + 8, hair)
        if is_female:
            rect(14, hy + 4, 17, hy + 11, hair)
        rect(8, hy + 5, 9, hy + 6, eye)
        px(8, hy + 5, (255, 255, 255, 255))
    elif row == 2:  # RIGHT
        rect(6, hy + 2, 10, hy + 8, hair)
        if is_female:
            rect(6, hy + 4, 9, hy + 11, hair)
        rect(14, hy + 5, 15, hy + 6, eye)
        px(15, hy + 5, (255, 255, 255, 255))

    # 종족 특징 (수인 귀 / 마족 뿔)
    if trait == "beast":
        rect(6, hy - 2, 8, hy, hair)
        rect(15, hy - 2, 17, hy, hair)
        px(7, hy - 1, (255, 190, 190, 255))
        px(16, hy - 1, (255, 190, 190, 255))
    elif trait == "horns":
        rect(6, hy - 2, 7, hy, (192, 132, 252, 255))
        rect(16, hy - 2, 17, hy, (192, 132, 252, 255))

    return canvas.resize((CELL_W, CELL_H), Image.Resampling.NEAREST)


def generate_procedural_sheet(spec: dict) -> Image.Image:
    out = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            cell = draw_pixel_chibi_cell(spec, row, col)
            out.paste(cell, (col * CELL_W, row * CELL_H), cell)
    return out


def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_dirs = [
        os.path.join(root_dir, "src", "public", "assets", "visuals", "sprites"),
        os.path.join(root_dir, "public", "assets", "visuals", "sprites"),
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    ai_mapping: dict[str, dict] = {}
    if len(sys.argv) >= 2 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            ai_mapping = json.load(f)

    ok_ai = 0
    for key, cfg in ai_mapping.items():
        raw_path = cfg["path"] if isinstance(cfg, dict) else cfg
        fix_side = bool(cfg.get("fix_side", False)) if isinstance(cfg, dict) else False
        fix_up = bool(cfg.get("fix_up", False)) if isinstance(cfg, dict) else False
        if not os.path.exists(raw_path):
            print(f"[SKIP] Missing raw file: {key} -> {raw_path}")
            continue
        sheet = normalize_3x4_sheet(raw_path, fix_side_rows=fix_side, fix_up_row=fix_up)
        for d in out_dirs:
            sheet.save(os.path.join(d, f"{key}.png"), "PNG", optimize=True)
        ok_ai += 1
        print(f"[AI OK] {key}.png ({sheet.size[0]}x{sheet.size[1]})")

    ok_proc = 0
    for key, spec in PROCEDURAL_SPECS.items():
        if key in ai_mapping:
            continue
        sheet = generate_procedural_sheet(spec)
        for d in out_dirs:
            sheet.save(os.path.join(d, f"{key}.png"), "PNG", optimize=True)
        ok_proc += 1
        print(f"[PIXEL OK] {key}.png ({sheet.size[0]}x{sheet.size[1]})")

    print(f"All done! AI processed: {ok_ai}, Procedural 16-bit generated: {ok_proc}, Total: {ok_ai + ok_proc}")


if __name__ == "__main__":
    main()
