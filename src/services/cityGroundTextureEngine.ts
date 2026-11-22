/**
 * 쯔꾸르 2D 도시 필드 V2 — 16-bit 픽셀아트 바닥/성벽/수로 오프스크린 타일 텍스처 생성기
 * - 단색 체커보드를 완전히 제거하고, 오프스크린 캔버스에 40x40 픽셀아트 타일(풀잎·조약돌·판석·벽돌·물결)을
 *   문화권 팔레트에 맞춰 1회 생성·캐싱하여 60fps 성능을 유지하면서 상용 쯔꾸르급 바닥 질감을 구현합니다.
 */

import { CityCultureKey } from './cityAssetManifest';
import { CityTilePalette, CITY_TILE_SIZE } from './cityTilemapEngine';

export interface GroundTileTextureSet {
    grassVariants: HTMLCanvasElement[]; // 4종 자연스러운 변형
    road: HTMLCanvasElement;
    plaza: HTMLCanvasElement;
    royalRoad: HTMLCanvasElement;
    wall: HTMLCanvasElement;
    waterFrames: HTMLCanvasElement[];   // 3프레임 물결 애니메이션
    flower: HTMLCanvasElement;
}

const textureCache = new Map<string, GroundTileTextureSet>();

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const shadeHex = (hex: string, factor: number): string => {
    const [r, g, b] = hexToRgb(hex);
    const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
    const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
    const nb = Math.max(0, Math.min(255, Math.round(b * factor)));
    return `rgb(${nr},${ng},${nb})`;
};

const seededRand = (seed: number) => {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
};

const createCanvas = (w = CITY_TILE_SIZE, h = CITY_TILE_SIZE): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
};

/**
 * 1. 잔디 / 사막 / 대리석 / 마계 지면 (4종 변형 타일)
 */
const buildGrassVariant = (pal: CityTilePalette, culture: CityCultureKey, variant: number): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const rand = seededRand(variant * 997 + culture.charCodeAt(0) * 31);
    const ts = CITY_TILE_SIZE;

    // 베이스 그라데이션 없는 깔끔한 픽셀 베이스
    ctx.fillStyle = pal.grass1;
    ctx.fillRect(0, 0, ts, ts);

    // 미세한 픽셀 질감 도트 (2x2 픽셀)
    const dark = shadeHex(pal.grass1, 0.88);
    const mid = pal.grass2;
    const light = shadeHex(pal.grass2, 1.14);

    for (let i = 0; i < 28; i++) {
        const px = Math.floor(rand() * (ts / 2)) * 2;
        const py = Math.floor(rand() * (ts / 2)) * 2;
        ctx.fillStyle = rand() > 0.5 ? mid : dark;
        ctx.fillRect(px, py, 2, 2);
    }

    if (culture === 'africa' || culture === 'feraldia') {
        // 사막/황토 모래결 물결 & 잔돌
        ctx.fillStyle = light;
        for (let i = 0; i < 4; i++) {
            const x = Math.floor(rand() * 24) + 4;
            const y = Math.floor(rand() * 32) + 4;
            ctx.fillRect(x, y, 8, 2);
            ctx.fillStyle = dark;
            ctx.fillRect(x + 2, y + 2, 6, 2);
            ctx.fillStyle = light;
        }
    } else if (culture === 'shingye') {
        // 신계 백색 대리석 미세 결 + 황금 반짝임
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 10 + variant * 6);
        ctx.lineTo(ts, 16 + variant * 4);
        ctx.stroke();
        if (variant === 1 || variant === 3) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
            ctx.fillRect(18, 18, 2, 2);
        }
    } else if (culture === 'magye' || culture === 'abyssalon') {
        // 마계/아비살론 균열 흑요석 지면
        ctx.fillStyle = dark;
        ctx.fillRect(6 + variant * 5, 10, 2, 10);
        ctx.fillRect(8 + variant * 5, 18, 8, 2);
        ctx.fillStyle = culture === 'magye' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(168, 85, 247, 0.35)';
        ctx.fillRect(7 + variant * 5, 11, 2, 6);
    } else {
        // 일반 초원/숲 풀잎 뭉치 (2~3개)
        const tufts = 2 + (variant % 3);
        for (let i = 0; i < tufts; i++) {
            const tx = Math.floor(rand() * 28) + 4;
            const ty = Math.floor(rand() * 28) + 6;
            ctx.fillStyle = dark;
            ctx.fillRect(tx, ty + 2, 6, 2);
            ctx.fillStyle = light;
            ctx.fillRect(tx, ty, 2, 3);
            ctx.fillRect(tx + 3, ty - 1, 2, 4);
            ctx.fillRect(tx + 6, ty + 1, 2, 2);
        }
        // 가끔 작은 돌멩이
        if (variant === 2) {
            ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
            ctx.fillRect(26, 28, 4, 3);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
            ctx.fillRect(26, 31, 4, 1);
        }
    }

    return c;
};

/**
 * 2. 조약돌 / 석조 보도블록 도로
 */
const buildRoadTile = (pal: CityTilePalette): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const ts = CITY_TILE_SIZE;
    const mortar = shadeHex(pal.road2, 0.72);
    const stoneA = pal.road1;
    const stoneB = pal.road2;
    const hi = shadeHex(pal.road1, 1.12);

    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, ts, ts);

    // 엇갈린 2x4 픽셀 석판 블록
    const rows = [
        { y: 1, h: 8, splits: [0, 14, 28, 40] },
        { y: 11, h: 8, splits: [0, 8, 22, 35, 40] },
        { y: 21, h: 8, splits: [0, 16, 30, 40] },
        { y: 31, h: 8, splits: [0, 10, 24, 36, 40] },
    ];
    rows.forEach((r, ri) => {
        for (let i = 0; i < r.splits.length - 1; i++) {
            const x0 = r.splits[i] + 1;
            const w = r.splits[i + 1] - r.splits[i] - 2;
            if (w <= 1) continue;
            ctx.fillStyle = (ri + i) % 2 === 0 ? stoneA : stoneB;
            ctx.fillRect(x0, r.y, w, r.h);
            ctx.fillStyle = hi;
            ctx.fillRect(x0, r.y, w, 1);
            ctx.fillRect(x0, r.y, 1, r.h);
        }
    });

    return c;
};

/**
 * 3. 광장 판석 문양 타일
 */
const buildPlazaTile = (pal: CityTilePalette): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const ts = CITY_TILE_SIZE;
    const line = shadeHex(pal.plaza2, 0.78);
    const hi = shadeHex(pal.plaza1, 1.1);

    ctx.fillStyle = pal.plaza1;
    ctx.fillRect(0, 0, ts, ts);

    // 2x2 격자 대리석 판석 + 중앙 마름모 포인트
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, ts / 2 - 1, ts / 2 - 1);
    ctx.strokeRect(ts / 2 + 0.5, 0.5, ts / 2 - 1, ts / 2 - 1);
    ctx.strokeRect(0.5, ts / 2 + 0.5, ts / 2 - 1, ts / 2 - 1);
    ctx.strokeRect(ts / 2 + 0.5, ts / 2 + 0.5, ts / 2 - 1, ts / 2 - 1);

    ctx.fillStyle = hi;
    ctx.fillRect(2, 2, ts / 2 - 4, 2);
    ctx.fillRect(ts / 2 + 2, ts / 2 + 2, ts / 2 - 4, 2);

    ctx.fillStyle = pal.plaza2;
    ctx.beginPath();
    ctx.moveTo(ts / 2, ts / 2 - 4);
    ctx.lineTo(ts / 2 + 4, ts / 2);
    ctx.lineTo(ts / 2, ts / 2 + 4);
    ctx.lineTo(ts / 2 - 4, ts / 2);
    ctx.closePath();
    ctx.fill();

    return c;
};

/**
 * 4. 수도 왕궁 중앙대로 카펫 타일
 */
const buildRoyalRoadTile = (pal: CityTilePalette): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const ts = CITY_TILE_SIZE;
    const roadBase = buildRoadTile(pal);
    ctx.drawImage(roadBase, 0, 0);

    // 중앙 왕실 카펫 + 황금 자수선
    ctx.fillStyle = pal.royalRoad;
    ctx.fillRect(4, 0, ts - 8, ts);
    ctx.fillStyle = shadeHex(pal.royalRoad, 0.8);
    ctx.fillRect(6, 0, ts - 12, ts);
    ctx.fillStyle = pal.royalRoad;
    ctx.fillRect(8, 0, ts - 16, ts);

    ctx.fillStyle = '#fde047';
    ctx.fillRect(5, 0, 2, ts);
    ctx.fillRect(ts - 7, 0, 2, ts);

    // 카펫 중앙 황금 문양 점
    ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
    ctx.fillRect(ts / 2 - 2, 8, 4, 4);
    ctx.fillRect(ts / 2 - 2, 28, 4, 4);

    return c;
};

/**
 * 5. 외곽 성벽 (벽돌 + 성가퀴 요철 + 그림자)
 */
const buildWallTile = (pal: CityTilePalette): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const ts = CITY_TILE_SIZE;
    const mortar = shadeHex(pal.wall, 0.6);
    const brickHi = shadeHex(pal.wall, 1.15);

    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, ts, ts);

    // 상단 성벽 흉벽(요철)
    ctx.fillStyle = pal.wallTop;
    ctx.fillRect(0, 0, ts, 12);
    ctx.fillStyle = shadeHex(pal.wallTop, 1.18);
    ctx.fillRect(2, 2, 14, 6);
    ctx.fillRect(22, 2, 16, 6);

    // 벽돌 쌓기
    for (let row = 0; row < 3; row++) {
        const y = 14 + row * 8;
        const offset = row % 2 === 0 ? 0 : 10;
        for (let x = -10 + offset; x < ts; x += 20) {
            ctx.fillStyle = pal.wall;
            ctx.fillRect(Math.max(1, x + 1), y, Math.min(18, ts - x - 2), 6);
            ctx.fillStyle = brickHi;
            ctx.fillRect(Math.max(1, x + 1), y, Math.min(18, ts - x - 2), 1);
        }
    }

    // 하단 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, ts - 3, ts, 3);
    return c;
};

/**
 * 6. 물 / 용암 3프레임 애니메이션 타일
 */
const buildWaterFrame = (pal: CityTilePalette, frame: number): HTMLCanvasElement => {
    const [c, ctx] = createCanvas();
    const ts = CITY_TILE_SIZE;
    const deep = shadeHex(pal.water1, 0.85);

    ctx.fillStyle = pal.water1;
    ctx.fillRect(0, 0, ts, ts);

    // 물결 띠
    ctx.fillStyle = pal.water2;
    const shift = frame * 4;
    for (let y = 4; y < ts; y += 12) {
        ctx.fillRect((shift + y) % ts, y, 12, 3);
        ctx.fillRect((shift + y + 20) % ts, y + 6, 10, 2);
    }

    // 반짝임 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fillRect((8 + frame * 6) % (ts - 8), 10, 6, 2);
    ctx.fillRect((22 - frame * 5 + ts) % (ts - 8), 26, 5, 2);

    ctx.fillStyle = deep;
    ctx.fillRect(0, ts - 2, ts, 2);
    return c;
};

/**
 * 7. 꽃밭 타일
 */
const buildFlowerTile = (pal: CityTilePalette, culture: CityCultureKey): HTMLCanvasElement => {
    const base = buildGrassVariant(pal, culture, 1);
    const ctx = base.getContext('2d')!;
    const flowers = [
        { x: 9, y: 11, color: '#fde047' },
        { x: 25, y: 15, color: '#f472b6' },
        { x: 15, y: 27, color: '#38bdf8' },
        { x: 30, y: 29, color: '#fb923c' },
    ];
    flowers.forEach(f => {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(f.x + 1, f.y + 3, 2, 4);
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x, f.y, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(f.x + 1, f.y + 1, 2, 2);
    });
    return base;
};

export const getGroundTileTextures = (
    culture: CityCultureKey,
    pal: CityTilePalette
): GroundTileTextureSet => {
    const cacheKey = `${culture}_${pal.grass1}_${pal.road1}`;
    const existing = textureCache.get(cacheKey);
    if (existing) return existing;

    const set: GroundTileTextureSet = {
        grassVariants: [0, 1, 2, 3].map(v => buildGrassVariant(pal, culture, v)),
        road: buildRoadTile(pal),
        plaza: buildPlazaTile(pal),
        royalRoad: buildRoyalRoadTile(pal),
        wall: buildWallTile(pal),
        waterFrames: [0, 1, 2].map(f => buildWaterFrame(pal, f)),
        flower: buildFlowerTile(pal, culture)
    };
    textureCache.set(cacheKey, set);
    return set;
};
