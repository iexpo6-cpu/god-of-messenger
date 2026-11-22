/**
 * 쯔꾸르(RPG Maker) 스타일 2D 도시 타일맵 V2 엔진
 * - 도시 등급별 동적 크기:
 *   * Capital (수도): 36x26 초대형 맵 + 4칸 왕궁 중앙대로 + 대형 광장 + NPC 7명
 *   * City (대도시):  28x20 표준 맵 + 십자 도로 + 표준 광장 + NPC 5명
 *   * Town/Village:   22x16 아담한 마을 맵 + 아늑한 광장 + NPC 3명
 * - 14개 문화권(korea/japan/china 포함) 세분화 + 특수 건물 6종 스프라이트 키 매핑
 */

import { CityTier, DistrictType } from '../types';
import { DISTRICT_CONFIG } from '../constants';
import {
    HUMAN_GLOBAL_REGION_KEYS,
    mapRegionToSpriteKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from './rpgSpriteManifest';
import {
    BaseCultureKey,
    BuildingSpriteKind,
    CityCultureKey,
    getParentCultureKey,
    PropPackKey,
    resolveCityCultureKey
} from './cityAssetManifest';

export const CITY_TILE_SIZE = 40;

export const getMapDimensionsByTier = (tier: CityTier): { cols: number; rows: number } => {
    if (tier === 'Capital') return { cols: 36, rows: 26 };
    if (tier === 'City') return { cols: 28, rows: 20 };
    return { cols: 22, rows: 16 };
};

export type CityTileKind =
    | 'grass'
    | 'road'
    | 'royal_road'
    | 'plaza'
    | 'water'
    | 'wall'
    | 'tree'
    | 'flower'
    | 'lamp'
    | 'fountain'
    | 'building_wall'
    | 'building_roof'
    | 'door'
    | 'portal';

export type PortalActionType =
    | 'district'
    | 'dungeon'
    | 'world_map'
    | 'base'
    | 'elf_city'
    | 'beast_city'
    | 'demon_city'
    | 'transcendent_arena'
    | 'abyss_tower';

export interface CityPortalNode {
    id: string;
    label: string;
    subLabel: string;
    actionType: PortalActionType;
    spriteKind: BuildingSpriteKind;
    district?: DistrictType | 'Gate';
    openHuntMap?: boolean;
    doorX: number;
    doorY: number;
    buildingX: number;
    buildingY: number;
    buildingW: number;
    buildingH: number;
    roofColor: string;
    accentColor: string;
    iconText: string;
}

export interface CityNpcEntity {
    id: string;
    name: string;
    role: string;
    regionKey: RpgSpriteRegionKey;
    gender: 'male' | 'female';
    x: number;
    y: number;
    homeX: number;
    homeY: number;
    dir: SpriteDirection;
    dialogues: string[];
}

export interface CityTilePalette {
    grass1: string;
    grass2: string;
    road1: string;
    road2: string;
    royalRoad: string;
    plaza1: string;
    plaza2: string;
    water1: string;
    water2: string;
    wall: string;
    wallTop: string;
    treeTrunk: string;
    treeLeaf1: string;
    treeLeaf2: string;
    buildingWall: string;
    buildingTrim: string;
    lampGlow: string;
}

export interface CityPropNode {
    id: string;
    x: number;
    y: number;
    pack: PropPackKey;
    part: string;
    drawW: number;
    drawH: number;
    walkable?: boolean;
}

export interface CityTilemapData {
    cols: number;
    rows: number;
    tier: CityTier;
    regionKey: RpgSpriteRegionKey;
    cultureKey: CityCultureKey;
    palette: CityTilePalette;
    tiles: CityTileKind[][];
    solid: boolean[][];
    portals: CityPortalNode[];
    npcs: CityNpcEntity[];
    props: CityPropNode[];
    spawnPos: { x: number; y: number };
    lamps: Array<{ x: number; y: number }>;
    fountainCenter: { x: number; y: number };
}

const CULTURE_PALETTES: Record<BaseCultureKey, CityTilePalette> = {
    korea: {
        grass1: '#2f5e3d', grass2: '#376d47',
        road1: '#9c9282', road2: '#8d8374', royalRoad: '#b91c1c',
        plaza1: '#c4bab0', plaza2: '#b5aba1',
        water1: '#1d6f8a', water2: '#2989a8',
        wall: '#57534e', wallTop: '#78716c',
        treeTrunk: '#5c3a21', treeLeaf1: '#f472b6', treeLeaf2: '#fbcfe8',
        buildingWall: '#f5f5f4', buildingTrim: '#7c2d12',
        lampGlow: 'rgba(251, 146, 60, 0.42)'
    },
    japan: {
        grass1: '#2d5c3b', grass2: '#356c45',
        road1: '#8b8579', road2: '#7d776c', royalRoad: '#991b1b',
        plaza1: '#b8b2a6', plaza2: '#a8a296',
        water1: '#1e40af', water2: '#2563eb',
        wall: '#334155', wallTop: '#475569',
        treeTrunk: '#4a2e1b', treeLeaf1: '#f9a8d4', treeLeaf2: '#fce7f3',
        buildingWall: '#fafaf9', buildingTrim: '#1e293b',
        lampGlow: 'rgba(253, 224, 71, 0.4)'
    },
    china: {
        grass1: '#2a5a38', grass2: '#326942',
        road1: '#a6947c', road2: '#96846d', royalRoad: '#b91c1c',
        plaza1: '#cbb89d', plaza2: '#bca98e',
        water1: '#0f766e', water2: '#14b8a6',
        wall: '#7f1d1d', wallTop: '#d97706',
        treeTrunk: '#3f6212', treeLeaf1: '#4d7c0f', treeLeaf2: '#84cc16',
        buildingWall: '#fef2f2', buildingTrim: '#b91c1c',
        lampGlow: 'rgba(248, 113, 113, 0.48)'
    },
    asia: {
        grass1: '#2f613b', grass2: '#377045',
        road1: '#9b8d79', road2: '#8c7e6c', royalRoad: '#b45309',
        plaza1: '#bfb29e', plaza2: '#b0a38f',
        water1: '#0e7490', water2: '#06b6d4',
        wall: '#57534e', wallTop: '#78716c',
        treeTrunk: '#5c3a21', treeLeaf1: '#16a34a', treeLeaf2: '#4ade80',
        buildingWall: '#f5f5f4', buildingTrim: '#78350f',
        lampGlow: 'rgba(253, 224, 71, 0.38)'
    },
    europe: {
        grass1: '#2d5a34', grass2: '#35693d',
        road1: '#7c8491', road2: '#6e7682', royalRoad: '#1d4ed8',
        plaza1: '#9ca3af', plaza2: '#8b93a0',
        water1: '#1d4ed8', water2: '#3b82f6',
        wall: '#4b5563', wallTop: '#6b7280',
        treeTrunk: '#4a321d', treeLeaf1: '#15803d', treeLeaf2: '#22c55e',
        buildingWall: '#e7e5e4', buildingTrim: '#44403c',
        lampGlow: 'rgba(251, 191, 36, 0.38)'
    },
    north_america: {
        grass1: '#35663e', grass2: '#3d7447',
        road1: '#52525b', road2: '#474750', royalRoad: '#3b82f6',
        plaza1: '#a1a1aa', plaza2: '#8e8e98',
        water1: '#0284c7', water2: '#0ea5e9',
        wall: '#3f3f46', wallTop: '#52525b',
        treeTrunk: '#57361e', treeLeaf1: '#16a34a', treeLeaf2: '#f59e0b',
        buildingWall: '#cbd5e1', buildingTrim: '#334155',
        lampGlow: 'rgba(254, 240, 138, 0.38)'
    },
    south_america: {
        grass1: '#266937', grass2: '#2f7c42',
        road1: '#a88d68', road2: '#987e5b', royalRoad: '#0f766e',
        plaza1: '#c7ae87', plaza2: '#b79e78',
        water1: '#0d9488', water2: '#14b8a6',
        wall: '#78563c', wallTop: '#926b4c',
        treeTrunk: '#5c3a1f', treeLeaf1: '#15803d', treeLeaf2: '#84cc16',
        buildingWall: '#fef3c7', buildingTrim: '#92400e',
        lampGlow: 'rgba(251, 146, 60, 0.4)'
    },
    oceania: {
        grass1: '#367546', grass2: '#408652',
        road1: '#c9b38c', road2: '#b9a37d', royalRoad: '#0284c7',
        plaza1: '#e0cca7', plaza2: '#d2bd97',
        water1: '#06b6d4', water2: '#22d3ee',
        wall: '#64748b', wallTop: '#94a3b8',
        treeTrunk: '#6b4423', treeLeaf1: '#16a34a', treeLeaf2: '#2dd4bf',
        buildingWall: '#f1f5f9', buildingTrim: '#0284c7',
        lampGlow: 'rgba(125, 211, 252, 0.4)'
    },
    africa: {
        grass1: '#b89458', grass2: '#c7a265',
        road1: '#9c7844', road2: '#8d6b3b', royalRoad: '#d97706',
        plaza1: '#d9bc84', plaza2: '#caa972',
        water1: '#0284c7', water2: '#38bdf8',
        wall: '#855830', wallTop: '#a16b3b',
        treeTrunk: '#6b4226', treeLeaf1: '#4d7c0f', treeLeaf2: '#65a30d',
        buildingWall: '#fde68a', buildingTrim: '#92400e',
        lampGlow: 'rgba(251, 191, 36, 0.45)'
    },
    shingye: {
        grass1: '#cbd5e1', grass2: '#e2e8f0',
        road1: '#f8fafc', road2: '#e2e8f0', royalRoad: '#f59e0b',
        plaza1: '#fef3c7', plaza2: '#fde68a',
        water1: '#38bdf8', water2: '#7dd3fc',
        wall: '#94a3b8', wallTop: '#f59e0b',
        treeTrunk: '#d4af37', treeLeaf1: '#fef08a', treeLeaf2: '#fde047',
        buildingWall: '#ffffff', buildingTrim: '#d97706',
        lampGlow: 'rgba(254, 240, 138, 0.55)'
    },
    magye: {
        grass1: '#271722', grass2: '#331d2c',
        road1: '#3f2e3a', road2: '#352630', royalRoad: '#991b1b',
        plaza1: '#4c2c3c', plaza2: '#3d2230',
        water1: '#dc2626', water2: '#f97316',
        wall: '#18181b', wallTop: '#7f1d1d',
        treeTrunk: '#1f161c', treeLeaf1: '#991b1b', treeLeaf2: '#ef4444',
        buildingWall: '#27272a', buildingTrim: '#b91c1c',
        lampGlow: 'rgba(248, 113, 113, 0.48)'
    },
    sylvanar: {
        grass1: '#1e4d33', grass2: '#256040',
        road1: '#6c7c59', road2: '#5f6f4e', royalRoad: '#059669',
        plaza1: '#7d926b', plaza2: '#6e825d',
        water1: '#059669', water2: '#34d399',
        wall: '#2c4c34', wallTop: '#4ade80',
        treeTrunk: '#4c3220', treeLeaf1: '#10b981', treeLeaf2: '#34d399',
        buildingWall: '#d1fae5', buildingTrim: '#047857',
        lampGlow: 'rgba(110, 231, 183, 0.48)'
    },
    feraldia: {
        grass1: '#7c4d2b', grass2: '#8c5832',
        road1: '#a16c42', road2: '#915f38', royalRoad: '#b45309',
        plaza1: '#b88255', plaza2: '#a87449',
        water1: '#0369a1', water2: '#0284c7',
        wall: '#57361e', wallTop: '#b45309',
        treeTrunk: '#4a2c16', treeLeaf1: '#65a30d', treeLeaf2: '#84cc16',
        buildingWall: '#fed7aa', buildingTrim: '#9a3412',
        lampGlow: 'rgba(251, 146, 60, 0.45)'
    },
    abyssalon: {
        grass1: '#1e1b33', grass2: '#262242',
        road1: '#373054', road2: '#2e2847', royalRoad: '#6d28d9',
        plaza1: '#433868', plaza2: '#392f59',
        water1: '#6d28d9', water2: '#8b5cf6',
        wall: '#1e1b4b', wallTop: '#6d28d9',
        treeTrunk: '#1f1633', treeLeaf1: '#7c3aed', treeLeaf2: '#a855f7',
        buildingWall: '#312e81', buildingTrim: '#c084fc',
        lampGlow: 'rgba(192, 132, 252, 0.48)'
    }
};

export interface BuildCityTilemapParams {
    region: string;
    nation: string;
    city: string;
    tier: CityTier;
    activeDistricts: DistrictType[];
    hasBaseInCurrentLocation: boolean;
    isElfNation: boolean;
    isBeastNation: boolean;
    isDemonNation: boolean;
    canOpenTranscendentArena?: boolean;
    canOpenAbyssTower?: boolean;
    timeLabel: string;
    isMythicBoss: boolean;
    bossName?: string;
}

export const buildCityTilemap = (params: BuildCityTilemapParams): CityTilemapData => {
    const { cols, rows } = getMapDimensionsByTier(params.tier);
    const isCapital = params.tier === 'Capital';
    const isSmall = params.tier === 'Town' || params.tier === 'Village';

    const regionKey = mapRegionToSpriteKey(params.region, params.nation);
    const cultureKey = resolveCityCultureKey(params.region, params.nation, params.city);
    const parentCultureKey = getParentCultureKey(cultureKey);
    const palette = CULTURE_PALETTES[parentCultureKey] || CULTURE_PALETTES.asia;

    const tiles: CityTileKind[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 'grass' as CityTileKind)
    );
    const solid: boolean[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
    );

    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    // 1. 외곽 성벽 테두리
    for (let x = 0; x < cols; x++) {
        tiles[0][x] = 'wall';
        solid[0][x] = true;
        tiles[rows - 1][x] = 'wall';
        solid[rows - 1][x] = true;
    }
    for (let y = 0; y < rows; y++) {
        tiles[y][0] = 'wall';
        solid[y][0] = true;
        tiles[y][cols - 1] = 'wall';
        solid[y][cols - 1] = true;
    }

    // 2. 메인 도로 & 중앙 광장 (수도는 4칸 폭 왕궁 중앙대로 + 8x6 대형 광장)
    const hRoadY = cy;
    const southRoadY = rows - 5;
    for (let x = 2; x < cols - 2; x++) {
        tiles[hRoadY - 1][x] = 'road';
        tiles[hRoadY][x] = 'road';
        if (southRoadY > hRoadY + 1) {
            tiles[southRoadY][x] = 'road';
        }
    }

    for (let y = 2; y < rows - 1; y++) {
        tiles[y][cx - 1] = isCapital ? 'royal_road' : 'road';
        tiles[y][cx] = isCapital ? 'royal_road' : 'road';
        if (isCapital) {
            tiles[y][cx - 2] = 'road';
            tiles[y][cx + 1] = 'road';
        }
    }

    const plazaHalfW = isCapital ? 4 : isSmall ? 2 : 3;
    const plazaHalfH = isCapital ? 3 : isSmall ? 2 : 3;
    for (let y = Math.max(2, cy - plazaHalfH); y <= Math.min(rows - 3, cy + plazaHalfH - 1); y++) {
        for (let x = Math.max(2, cx - plazaHalfW); x <= Math.min(cols - 3, cx + plazaHalfW - 1); x++) {
            tiles[y][x] = 'plaza';
        }
    }

    // 중앙 분수대/기념비
    tiles[cy - 1][cx - 1] = 'fountain';
    tiles[cy - 1][cx] = 'fountain';
    solid[cy - 1][cx - 1] = true;
    solid[cy - 1][cx] = true;
    const fountainCenter = { x: cx, y: cy - 1 };

    // 3. 장식 수로/연못 (대도시·수도)
    if (!isSmall) {
        const pondY = cy + 2;
        for (let y = pondY; y <= Math.min(rows - 6, pondY + 1); y++) {
            for (let x = 2; x <= 4; x++) {
                tiles[y][x] = 'water';
                solid[y][x] = true;
            }
            for (let x = cols - 5; x <= cols - 3; x++) {
                tiles[y][x] = 'water';
                solid[y][x] = true;
            }
        }
    }

    // 4. 건물 & 포탈 배치 헬퍼
    const portals: CityPortalNode[] = [];
    const placeBuilding = (node: CityPortalNode) => {
        const bx = Math.max(1, Math.min(cols - 1 - node.buildingW, node.buildingX));
        const by = Math.max(1, Math.min(rows - 2 - node.buildingH, node.buildingY));
        const dx = Math.max(bx, Math.min(bx + node.buildingW - 1, node.doorX));
        const dy = by + node.buildingH - 1;

        const adjusted: CityPortalNode = {
            ...node,
            buildingX: bx,
            buildingY: by,
            doorX: dx,
            doorY: dy
        };

        for (let y = by; y < by + adjusted.buildingH; y++) {
            for (let x = bx; x < bx + adjusted.buildingW; x++) {
                tiles[y][x] = y === by ? 'building_roof' : 'building_wall';
                solid[y][x] = true;
            }
        }
        tiles[dy][dx] =
            adjusted.actionType === 'dungeon' || adjusted.actionType === 'abyss_tower'
                ? 'portal'
                : 'door';
        solid[dy][dx] = false;

        if (dy + 1 < rows - 1 && !solid[dy + 1][dx]) {
            tiles[dy + 1][dx] = 'road';
        }
        portals.push(adjusted);
    };

    const isShingye = params.region === '신계';
    const isMagye = params.region === '마계' || params.nation === '임페리얼 제국';
    const hasDistrict = (d: DistrictType) => !isShingye && !isMagye && params.activeDistricts.includes(d);
    const northW = isCapital ? 8 : isSmall ? 4 : 6;
    const northH = isCapital ? 4 : 3;
    const northX = cx - Math.floor(northW / 2);
    const sideW = isSmall ? 4 : 5;
    const sideH = isSmall ? 2 : 3;
    const botY = rows - 4;
    const botW = isSmall ? 3 : 4;

    if (isShingye) {
        // === 신계 전용 시설만 배치 (상업지구·학교·용병길드·군사구역·심연의 탑 없음!) ===
        // 1. 북쪽 중앙: 신의 사자 신전
        placeBuilding({
            id: 'shingye_temple', label: '신의 사자 신전', subLabel: `${params.city} 성전 진입`,
            actionType: 'district', district: 'Imperial', spriteKind: 'landmark',
            buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
            doorX: cx, doorY: 2 + northH - 1, roofColor: '#d97706', accentColor: '#fde047', iconText: '✨'
        });

        // 2. 북서쪽: 신성 던전 (보스 토벌)
        placeBuilding({
            id: 'shingye_dungeon',
            label: params.isMythicBoss ? `차원의 틈새 (${params.bossName || '시즌 보스'})` : '신성 던전',
            subLabel: '신계 보스 토벌',
            actionType: 'dungeon', spriteKind: 'special_dungeon',
            buildingX: 2, buildingY: 2, buildingW: sideW, buildingH: sideH,
            doorX: 2 + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
            roofColor: params.isMythicBoss ? '#7e22ce' : '#4338ca',
            accentColor: params.isMythicBoss ? '#e879f9' : '#a5b4fc',
            iconText: params.isMythicBoss ? '🌀' : '⚔️'
        });

        // 3. 북동쪽: 성스러운 필드 (사냥터)
        const rx = cols - 2 - sideW;
        placeBuilding({
            id: 'shingye_field', label: '성스러운 필드', subLabel: '신계 구역 탐색',
            actionType: 'district', district: 'Outskirts', openHuntMap: true, spriteKind: 'house',
            buildingX: rx, buildingY: 2, buildingW: sideW, buildingH: sideH,
            doorX: rx + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
            roofColor: '#059669', accentColor: '#6ee7b7', iconText: '🌿'
        });

        // 4. 초월 그랜드 아레나 (오직 '신의 거처' 전용!)
        if (params.canOpenTranscendentArena && params.city === '신의 거처') {
            const arenaX = Math.max(2, cx - plazaHalfW - 4);
            const arenaY = Math.max(2, cy - plazaHalfH - 1);
            placeBuilding({
                id: 'transcendent_arena', label: '초월 그랜드 아레나', subLabel: '신의 거처 초월 투기장',
                actionType: 'transcendent_arena', spriteKind: 'special_beast',
                buildingX: arenaX, buildingY: arenaY, buildingW: 3, buildingH: 2,
                doorX: arenaX + 1, doorY: arenaY + 1,
                roofColor: '#b45309', accentColor: '#fbbf24', iconText: '🏆'
            });
        }
    } else if (isMagye) {
        // === 마계 전용 시설만 배치 (상업지구·학교·용병길드·군사구역 없음, 무한 심연 탑은 '임페리얼' 전용!) ===
        // 1. 북쪽 중앙: 마신황의 궁궐
        placeBuilding({
            id: 'magye_palace', label: '마신황의 궁궐', subLabel: `${params.city} 궁궐 진입`,
            actionType: 'district', district: 'Imperial', spriteKind: 'landmark',
            buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
            doorX: cx, doorY: 2 + northH - 1, roofColor: '#991b1b', accentColor: '#f87171', iconText: '👑'
        });

        // 2. 북서쪽: 지옥의 나락 (던전)
        placeBuilding({
            id: 'magye_dungeon',
            label: params.isMythicBoss ? `차원의 틈새 (${params.bossName || '시즌 보스'})` : '지옥의 나락',
            subLabel: '마계 나락 공략',
            actionType: 'dungeon', spriteKind: 'special_dungeon',
            buildingX: 2, buildingY: 2, buildingW: sideW, buildingH: sideH,
            doorX: 2 + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
            roofColor: params.isMythicBoss ? '#7e22ce' : '#7f1d1d',
            accentColor: params.isMythicBoss ? '#e879f9' : '#f87171',
            iconText: params.isMythicBoss ? '🌀' : '💀'
        });

        // 3. 북동쪽: 심연의 경계 (사냥터)
        const rx = cols - 2 - sideW;
        placeBuilding({
            id: 'magye_field', label: '심연의 경계', subLabel: '마계 심연 탐색',
            actionType: 'district', district: 'Outskirts', openHuntMap: true, spriteKind: 'house',
            buildingX: rx, buildingY: 2, buildingW: sideW, buildingH: sideH,
            doorX: rx + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
            roofColor: '#7f1d1d', accentColor: '#fca5a5', iconText: '🔥'
        });

        // 4. 무한 심연 탑 (오직 마계 수도 '임페리얼' 전용!)
        if (params.canOpenAbyssTower && params.city === '임페리얼') {
            const abX = Math.max(2, cx - plazaHalfW - 4);
            const abY = Math.max(2, cy - plazaHalfH - 1);
            placeBuilding({
                id: 'abyss_tower', label: '무한 심연 탑', subLabel: '임페리얼 전용 초월 등반',
                actionType: 'abyss_tower', spriteKind: 'special_abyss',
                buildingX: abX, buildingY: abY, buildingW: 3, buildingH: 2,
                doorX: abX + 1, doorY: abY + 1,
                roofColor: '#4c1d95', accentColor: '#c084fc', iconText: '🗼'
            });
        }
    } else {
        // === 지상 인간계 & 이종족 도시 (실제 개방된 구역만 배치) ===
        // 북쪽 중앙: 종족 특수 도시 또는 수도 왕궁 또는 도시 행정 광장
        if (params.isElfNation) {
            placeBuilding({
                id: 'elf_city', label: '엘프 교류소', subLabel: '실바나르 세계수 성소',
                actionType: 'elf_city', spriteKind: 'special_elf',
                buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
                doorX: cx, doorY: 2 + northH - 1, roofColor: '#059669', accentColor: '#34d399', iconText: '🌿'
            });
        } else if (params.isBeastNation) {
            placeBuilding({
                id: 'beast_city', label: '수인 투기광장', subLabel: '페랄디아 대투기장',
                actionType: 'beast_city', spriteKind: 'special_beast',
                buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
                doorX: cx, doorY: 2 + northH - 1, roofColor: '#c2410c', accentColor: '#fb923c', iconText: '🦁'
            });
        } else if (params.isDemonNation) {
            placeBuilding({
                id: 'demon_city', label: '마인 계약소', subLabel: '아비살론 암흑 성채',
                actionType: 'demon_city', spriteKind: 'special_demon',
                buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
                doorX: cx, doorY: 2 + northH - 1, roofColor: '#6d28d9', accentColor: '#c084fc', iconText: '🦇'
            });
        } else if (hasDistrict('RoyalCourt')) {
            placeBuilding({
                id: 'royal_court', label: DISTRICT_CONFIG.RoyalCourt.label, subLabel: '수도 왕궁 알현',
                actionType: 'district', district: 'RoyalCourt', spriteKind: 'landmark',
                buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
                doorX: cx, doorY: 2 + northH - 1, roofColor: '#b45309', accentColor: '#fbbf24', iconText: '👑'
            });
        } else {
            placeBuilding({
                id: 'city_hall', label: '도시 행정 광장', subLabel: `${params.city} 중심부`,
                actionType: 'district', district: 'Residential', spriteKind: 'landmark',
                buildingX: northX, buildingY: 2, buildingW: northW, buildingH: northH,
                doorX: cx, doorY: 2 + northH - 1, roofColor: '#475569', accentColor: '#94a3b8', iconText: '🏛️'
            });
        }

        // 북서쪽: 상업 지구
        if (hasDistrict('Commercial')) {
            placeBuilding({
                id: 'commercial', label: DISTRICT_CONFIG.Commercial.label, subLabel: '상점 · 대장간 · 거래소',
                actionType: 'district', district: 'Commercial', spriteKind: 'shop',
                buildingX: 2, buildingY: 2, buildingW: sideW, buildingH: sideH,
                doorX: 2 + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
                roofColor: '#d97706', accentColor: '#fcd34d', iconText: '🏪'
            });
        }

        // 북동쪽: 거주 지구
        if (hasDistrict('Residential')) {
            const rx = cols - 2 - sideW;
            placeBuilding({
                id: 'residential', label: DISTRICT_CONFIG.Residential.label, subLabel: '여관 · 주택 · 암시장',
                actionType: 'district', district: 'Residential', spriteKind: 'house',
                buildingX: rx, buildingY: 2, buildingW: sideW, buildingH: sideH,
                doorX: rx + Math.floor(sideW / 2), doorY: 2 + sideH - 1,
                roofColor: '#15803d', accentColor: '#86efac', iconText: '🏠'
            });
        }

        const midY = cy + 1;
        const midW = isSmall ? 3 : 4;
        const midH = isSmall ? 2 : 3;

        // 서쪽 중하단: 용병 길드
        if (hasDistrict('Mercenary')) {
            const mx = isSmall ? 2 : 6;
            placeBuilding({
                id: 'mercenary', label: DISTRICT_CONFIG.Mercenary.label, subLabel: '의뢰 · 파티 모집',
                actionType: 'district', district: 'Mercenary', spriteKind: 'shop',
                buildingX: mx, buildingY: midY, buildingW: midW, buildingH: midH,
                doorX: mx + Math.floor(midW / 2), doorY: midY + midH - 1,
                roofColor: '#b91c1c', accentColor: '#fca5a5', iconText: '⚔️'
            });
        }

        // 동쪽 중하단: 레귤러스 학교
        if (hasDistrict('Academic')) {
            const ax = isSmall ? cols - 2 - midW : cols - 6 - midW;
            placeBuilding({
                id: 'academic', label: DISTRICT_CONFIG.Academic.label, subLabel: '학교 · 도서관',
                actionType: 'district', district: 'Academic', spriteKind: 'house',
                buildingX: ax, buildingY: midY, buildingW: midW, buildingH: midH,
                doorX: ax + Math.floor(midW / 2), doorY: midY + midH - 1,
                roofColor: '#0e7490', accentColor: '#67e8f9', iconText: '📚'
            });
        }

        // 남서쪽: 군사 구역
        if (hasDistrict('Military')) {
            placeBuilding({
                id: 'military', label: DISTRICT_CONFIG.Military.label, subLabel: '병영 · 군사 훈련',
                actionType: 'district', district: 'Military', spriteKind: 'house',
                buildingX: 2, buildingY: botY, buildingW: botW, buildingH: 2,
                doorX: 2 + Math.floor(botW / 2), doorY: botY + 1,
                roofColor: '#334155', accentColor: '#94a3b8', iconText: '🛡️'
            });
        }

        // 남동쪽: 도시 외곽(사냥터) + 시험 던전
        if (hasDistrict('Outskirts')) {
            const ox = cols - 2 - botW * 2 - 1;
            placeBuilding({
                id: 'outskirts', label: '야외 사냥터', subLabel: '필드 몬스터 토벌',
                actionType: 'district', district: 'Outskirts', openHuntMap: true, spriteKind: 'house',
                buildingX: Math.max(cx + 2, ox), buildingY: botY, buildingW: botW, buildingH: 2,
                doorX: Math.max(cx + 2, ox) + Math.floor(botW / 2), doorY: botY + 1,
                roofColor: '#c2410c', accentColor: '#fdba74', iconText: '🏕️'
            });
        }

        const dunX = cols - 2 - botW;
        placeBuilding({
            id: 'dungeon',
            label: params.isMythicBoss ? `차원의 틈새 (${params.bossName || '시즌 보스'})` : '시험 던전',
            subLabel: '2D 미궁 탐험 진입',
            actionType: 'dungeon',
            spriteKind: 'special_dungeon',
            buildingX: dunX, buildingY: botY, buildingW: botW, buildingH: 2,
            doorX: dunX + Math.floor(botW / 2), doorY: botY + 1,
            roofColor: params.isMythicBoss ? '#7e22ce' : '#7f1d1d',
            accentColor: params.isMythicBoss ? '#e879f9' : '#f87171',
            iconText: params.isMythicBoss ? '🌀' : '💀'
        });
    }

    // 내 기지 (현재 도시에 보유 중인 경우에만 표시)
    if (params.hasBaseInCurrentLocation) {
        const baseX = Math.min(cols - 5, cx + plazaHalfW + 1);
        const baseY = Math.max(2, cy - plazaHalfH - 1);
        placeBuilding({
            id: 'my_base', label: '내 거점 (기지)', subLabel: '시설 관리 · 동료 배치',
            actionType: 'base', spriteKind: 'special_base',
            buildingX: baseX, buildingY: baseY, buildingW: 3, buildingH: 2,
            doorX: baseX + 1, doorY: baseY + 1,
            roofColor: '#047857', accentColor: '#34d399', iconText: '🏰'
        });
    }

    // 남쪽 중앙 성문 (월드맵 이동)
    tiles[rows - 1][cx - 1] = 'door';
    tiles[rows - 1][cx] = 'door';
    solid[rows - 1][cx - 1] = false;
    solid[rows - 1][cx] = false;
    portals.push({
        id: 'world_gate', label: '성문 / 월드맵', subLabel: '다른 도시·대륙으로 이동',
        actionType: 'world_map', spriteKind: 'landmark',
        buildingX: cx - 2, buildingY: rows - 1, buildingW: 4, buildingH: 1,
        doorX: cx - 1, doorY: rows - 1, roofColor: '#1e40af', accentColor: '#60a5fa', iconText: '🗺️'
    });

    // 문 앞 도로 연결
    portals.forEach(p => {
        if (p.doorY < rows - 1) {
            for (let y = p.doorY + 1; y <= Math.min(rows - 2, p.doorY + 2); y++) {
                if (!solid[y][p.doorX] && tiles[y][p.doorX] === 'grass') {
                    tiles[y][p.doorX] = 'road';
                }
            }
        }
    });

    // 5. 가로등 & 나무 & 꽃밭 배치
    const lamps: Array<{ x: number; y: number }> = [
        { x: Math.max(2, cx - plazaHalfW), y: Math.max(2, cy - plazaHalfH) },
        { x: Math.min(cols - 3, cx + plazaHalfW - 1), y: Math.max(2, cy - plazaHalfH) },
        { x: Math.max(2, cx - plazaHalfW), y: Math.min(rows - 3, cy + plazaHalfH - 1) },
        { x: Math.min(cols - 3, cx + plazaHalfW - 1), y: Math.min(rows - 3, cy + plazaHalfH - 1) },
        { x: cx - 2, y: southRoadY + 1 },
        { x: cx + 1, y: southRoadY + 1 }
    ];
    if (isCapital) {
        lamps.push(
            { x: cx - 3, y: 7 }, { x: cx + 2, y: 7 },
            { x: 8, y: hRoadY - 2 }, { x: cols - 9, y: hRoadY - 2 }
        );
    }
    const validLamps: Array<{ x: number; y: number }> = [];
    lamps.forEach(l => {
        if (
            l.x > 0 && l.x < cols - 1 && l.y > 0 && l.y < rows - 1 &&
            !solid[l.y][l.x] && tiles[l.y][l.x] !== 'door' && tiles[l.y][l.x] !== 'portal'
        ) {
            tiles[l.y][l.x] = 'lamp';
            solid[l.y][l.x] = true;
            validLamps.push(l);
        }
    });

    // 나무 (외곽 및 여백 자연 배치)
    const treeCandidates: Array<[number, number]> = [
        [2, cy - 3], [cols - 3, cy - 3],
        [2, cy + 1], [cols - 3, cy + 1],
        [cx - plazaHalfW - 2, 2], [cx + plazaHalfW + 1, 2],
        [cx - 4, rows - 3], [cx + 3, rows - 3]
    ];
    if (isCapital) {
        treeCandidates.push(
            [10, 4], [cols - 11, 4],
            [4, 7], [cols - 5, 7],
            [11, rows - 3], [cols - 12, rows - 3],
            [2, rows - 6], [cols - 3, rows - 6]
        );
    }
    treeCandidates.forEach(([tx, ty]) => {
        if (tx > 0 && tx < cols - 1 && ty > 0 && ty < rows - 1 && tiles[ty][tx] === 'grass' && !solid[ty][tx]) {
            tiles[ty][tx] = 'tree';
            solid[ty][tx] = true;
        }
    });

    // 꽃밭
    const flowerCandidates: Array<[number, number]> = [
        [cx - plazaHalfW - 1, cy - 2], [cx + plazaHalfW, cy - 2],
        [cx - plazaHalfW - 1, cy + 1], [cx + plazaHalfW, cy + 1]
    ];
    flowerCandidates.forEach(([fx, fy]) => {
        if (fx > 0 && fx < cols - 1 && fy > 0 && fy < rows - 1 && tiles[fy][fx] === 'grass' && !solid[fy][fx]) {
            tiles[fy][fx] = 'flower';
        }
    });

    // 6. 국가·지역별 현지화 이름 & 규모별 NPC 스폰 (수도 7명 / 대도시 5명 / 소도시 3명)
    const pickLocalNamePool = (): { male: string[]; female: string[]; roles: string[] } => {
        switch (parentCultureKey) {
            case 'korea':
                return {
                    male: ['도현', '지훈', '태양', '서준', '민호', '강산', '현우', '시우'],
                    female: ['서연', '지유', '하은', '수아', '다인', '유진', '채원', '소율'],
                    roles: ['수비대장', '행상인', '길드 안내원', '견습 학자', '모험가', '왕궁 호위', '꽃장수']
                };
            case 'japan':
                return {
                    male: ['렌', '하루토', '소라', '카즈키', '타쿠미', '유우토'],
                    female: ['유이', '사쿠라', '히나', '미오', '아야', '코하루'],
                    roles: ['수비대장', '상인', '길드 안내원', '학자', '낭인 검사', '무사', '무녀']
                };
            case 'china':
                return {
                    male: ['웨이', '하오', '린', '천', '진', '페이'],
                    female: ['메이', '링', '샤오', '옌', '란', '수이'],
                    roles: ['수비대장', '객상', '길드 안내원', '서생', '협객', '금군 무관', '다원 주인']
                };
            case 'africa':
                return {
                    male: ['타리크', '코피', '자이드', '아마르', '말릭', '카림'],
                    female: ['아미나', '자라', '니아', '레이나', '사미라', '나디아'],
                    roles: ['수비대장', '대상인', '길드 안내원', '별의 학자', '사막 전사', '태양 호위', '향신료 상인']
                };
            case 'europe':
                return {
                    male: ['루카스', '아르투르', '레온', '율리안', '알렉스', '헨리'],
                    female: ['클라라', '엘레나', '소피아', '아이리스', '클로에', '마리'],
                    roles: ['기사대장', '행상인', '길드 안내원', '왕립 학자', '방랑 기사', '근위 기사', '음유시인']
                };
            case 'north_america':
                return {
                    male: ['이든', '노아', '리암', '케일럽', '잭', '메이슨'],
                    female: ['엠마', '올리비아', '헤일리', '조이', '마야', '클레어'],
                    roles: ['보안관', '상인', '길드 안내원', '연구원', '헌터', '특수 요원', '기자']
                };
            case 'south_america':
                return {
                    male: ['마테오', '디에고', '티아고', '가브리엘', '루이스', '라파엘'],
                    female: ['카밀라', '발렌티나', '이사벨라', '루나', '소피', '마리아'],
                    roles: ['수비대장', '무역상', '길드 안내원', '고고학자', '탐험가', '축제 악사', '보석상']
                };
            case 'oceania':
                return {
                    male: ['올리버', '핀', '헌터', '라클란', '리암', '노아'],
                    female: ['샬럿', '아일라', '루비', '미아', '윌로우', '클로이'],
                    roles: ['항구 대장', '해양 상인', '길드 안내원', '항해 학자', '모험가', '선장', '조타수']
                };
            case 'shingye':
                return {
                    male: ['우리엘', '라파엘', '카시엘', '루미엘', '세라핌', '가브리엘'],
                    female: ['아우리엘', '세레스', '루시아', '에스텔', '아리아', '셀레스티아'],
                    roles: ['성전 수호기사', '성물 관리인', '신성 안내자', '신학자', '빛의 순례자', '천사장 보좌', '성가대원']
                };
            case 'magye':
                return {
                    male: ['카인', '벨리알', '드라켄', '녹스', '발록', '루시안'],
                    female: ['릴리스', '베라', '카르밀라', '셀레네', '나르샤', '이사벨'],
                    roles: ['제국 근위장', '암흑 상인', '제국 안내원', '마도 학자', '마계 기사', '흑마도사', '제국 서기관']
                };
            case 'sylvanar':
                return {
                    male: ['실반', '엘론', '페아노르', '리안', '아엘린', '탈리온'],
                    female: ['아르웬', '실비아', '리리아', '에이라', '세레나', '이실리아'],
                    roles: ['숲의 파수꾼', '약초 상인', '정령 안내원', '세계수 학자', '엘프 순찰자', '숲의 궁수', '정령사']
                };
            case 'feraldia':
                return {
                    male: ['가르', '레오', '볼프', '티그리스', '라크', '바르크'],
                    female: ['페라', '키라', '나야', '루나', '아리아', '시안'],
                    roles: ['투기장 경비장', '무기 상인', '투기 안내원', '전술가', '야수 투사', '챔피언 후보', '대장장이']
                };
            case 'abyssalon':
                return {
                    male: ['모르드', '아자젤', '제로스', '블라드', '카론', '녹턴'],
                    female: ['모르가나', '비비안', '에리스', '라미아', '벨라', '세라피나'],
                    roles: ['심연 수비장', '골동품 상인', '성채 안내원', '금서 학자', '암흑 검사', '그림자 감시자', '마력 연금술사']
                };
            default:
                return {
                    male: ['아르준', '라비', '바트', '남', '카말', '키란'],
                    female: ['프리야', '마이', '아이나', '타라', '사리', '리나'],
                    roles: ['수비대장', '행상인', '길드 안내원', '견습 학자', '모험가', '호위병', '약초상']
                };
        }
    };

    const isHumanWorld = HUMAN_GLOBAL_REGION_KEYS.includes(regionKey);
    const cityHash = Array.from(params.city || 'city').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
    const namePool = pickLocalNamePool();
    const pickMale = (offset: number) => namePool.male[(cityHash + offset) % namePool.male.length];
    const pickFemale = (offset: number) => namePool.female[(cityHash + offset) % namePool.female.length];
    const roles = namePool.roles;

    const allNpcSpecs: Array<{
        id: string; name: string; role: string; gender: 'male' | 'female';
        x: number; y: number; dialogues: string[];
    }> = [
        {
            id: 'npc_guard', name: `${roles[0]} ${pickMale(0)}`, role: roles[0], gender: 'male',
            x: cx - 2, y: southRoadY,
            dialogues: [
                `${params.nation} ${params.city}${isCapital ? ' 수도' : ''}에 오신 것을 환영합니다! 성문 남쪽으로 나가면 월드맵으로 이동할 수 있습니다.`,
                params.isMythicBoss
                    ? `경계 태세! 남동쪽 던전 부근에서 차원의 틈새(${params.bossName || '강력한 보스'}) 기운이 감지되고 있습니다!`
                    : `현재 시간대는 [${params.timeLabel}]입니다. 밤 22시 이후에는 거주 지구 뒷골목 암시장이 열립니다.`
            ]
        },
        {
            id: 'npc_merchant', name: `${roles[1]} ${pickMale(2)}`, role: roles[1], gender: 'male',
            x: Math.max(3, cx - plazaHalfW - 2), y: hRoadY,
            dialogues: [
                `어서 오세요! 북서쪽 상업 지구에서 희귀 장비와 강화 재료를 구경해 보세요.`,
                `요즘 차원 경매장에서도 다른 세계 모험가들의 명품 장비가 자주 올라온다더군요!`
            ]
        },
        {
            id: 'npc_guide', name: `${roles[2]} ${pickFemale(1)}`, role: roles[2], gender: 'female',
            x: cx - plazaHalfW + 1, y: cy,
            dialogues: [
                `반가워요, 모험가님! 건물 문 앞에서 [Space / E]를 누르거나 직접 클릭하면 바로 입장할 수 있어요.`,
                `동료들과 함께 걸어 다니면 든든하죠? ${params.city}의 여러 구역을 자유롭게 둘러보세요!`
            ]
        },
        {
            id: 'npc_scholar', name: `${roles[3]} ${pickFemale(3)}`, role: roles[3], gender: 'female',
            x: Math.min(cols - 4, cx + plazaHalfW + 2), y: hRoadY,
            dialogues: [
                `동쪽 거주 지구와 레귤러스 학교에서는 휴식과 훈련, 정보 수집을 할 수 있어요.`,
                `${params.region} 대륙만의 독특한 신력 흐름이 이 도시 광장 분수대에도 흐르고 있답니다.`
            ]
        },
        {
            id: 'npc_adventurer', name: `${roles[4]} ${pickMale(4)}`, role: roles[4], gender: 'male',
            x: cx + 2, y: southRoadY,
            dialogues: [
                `남동쪽 던전 입구에는 강한 마물들이 도사리고 있지. 준비가 끝나면 도전해 보라고!`,
                `탐험 관측소를 세우고 던전 지리 정찰을 보내두면 미궁 지도가 한눈에 펼쳐져서 훨씬 편해.`
            ]
        },
        {
            id: 'npc_capital_guard', name: `${roles[5]} ${pickMale(5)}`, role: roles[5], gender: 'male',
            x: cx - 2, y: Math.min(cy - 2, 7),
            dialogues: [
                `역시 ${params.nation}의 수도 ${params.city}답게 북쪽 왕궁 대로는 언제 봐도 웅장하지 않습니까?`,
                `수도의 명예를 지키기 위해 오늘도 중앙 광장을 순찰하고 있습니다.`
            ]
        },
        {
            id: 'npc_capital_citizen', name: `${roles[6]} ${pickFemale(5)}`, role: roles[6], gender: 'female',
            x: cx + plazaHalfW - 1, y: cy,
            dialogues: [
                `수도 광장은 세계 각지에서 모인 모험가들로 늘 활기가 넘쳐요!`,
                `오늘도 좋은 여정이 되시길 바랄게요, 사자님!`
            ]
        }
    ];

    const npcLimit = isCapital ? 7 : isSmall ? 3 : 5;
    const npcs: CityNpcEntity[] = allNpcSpecs.slice(0, npcLimit).map((t, idx) => {
        // 안전한 비충돌 좌표 보정
        let nx = Math.max(2, Math.min(cols - 3, t.x));
        let ny = Math.max(2, Math.min(rows - 3, t.y));
        if (solid[ny][nx]) {
            nx = cx;
            ny = cy + 1;
        }
        const npcRegionKey: RpgSpriteRegionKey = isHumanWorld
            ? (idx === 0 ? regionKey : HUMAN_GLOBAL_REGION_KEYS[(cityHash + idx * 2) % HUMAN_GLOBAL_REGION_KEYS.length])
            : regionKey;
        return {
            ...t,
            x: nx,
            y: ny,
            regionKey: npcRegionKey,
            homeX: nx,
            homeY: ny,
            dir: 'down'
        };
    });

    // --- 7. 마을 오브젝트·소품(Props) 배치 (도로·문·스폰을 절대 막지 않는 잔디/꽃/가장자리 배치) ---
    const props: CityPropNode[] = [];
    const propOccupied = new Set<string>();
    const isNearDoorOrSpawn = (tx: number, ty: number) => {
        if (Math.abs(tx - cx) <= 1 && Math.abs(ty - cy) <= 1) return true;
        return portals.some(pt => Math.abs(tx - pt.doorX) <= 1 && Math.abs(ty - pt.doorY) <= 1);
    };
    const tryPlaceProp = (
        id: string,
        tx: number,
        ty: number,
        pack: PropPackKey,
        part: string,
        drawW: number,
        drawH: number,
        walkable: boolean = false
    ) => {
        const rx = Math.round(tx);
        const ry = Math.round(ty);
        if (rx < 2 || rx > cols - 3 || ry < 2 || ry > rows - 3) return false;
        const key = `${rx},${ry}`;
        if (propOccupied.has(key)) return false;
        if (isNearDoorOrSpawn(rx, ry)) return false;
        const tile = tiles[ry][rx];
        if (tile !== 'grass' && tile !== 'flower') return false;
        if (solid[ry][rx]) return false;
        // 주변에 이미 인접한 다른 소품이 너무 겹치지 않도록 체크
        propOccupied.add(key);
        props.push({ id, x: rx, y: ry, pack, part, drawW, drawH, walkable });
        if (!walkable) solid[ry][rx] = true;
        return true;
    };

    const isEastAsia = cultureKey === 'korea' || cultureKey === 'japan' || cultureKey === 'china' || cultureKey === 'asia';
    const isFantasyRealm = cultureKey.startsWith('shingye') || cultureKey.startsWith('magye') || cultureKey === 'sylvanar' || cultureKey === 'abyssalon';

    // 광장 외곽 포인트 소품 (길드 게시판, 벤치, 화단, 석상/해태, 우물, 마차, 노점)
    const plazaTopY = cy - plazaHalfH - 1;
    const plazaBotY = cy + plazaHalfH + 1;
    const plazaLeftX = cx - plazaHalfW - 1;
    const plazaRightX = cx + plazaHalfW + 1;

    // 1) 길드 게시판 & 벤치 (광장 남쪽 좌우)
    tryPlaceProp('prop_notice', plazaLeftX, plazaBotY, 'market', 'notice_board', 46, 52);
    tryPlaceProp('prop_bench_r', plazaRightX, plazaBotY, 'market', 'bench', 46, 36);
    tryPlaceProp('prop_bench_l', plazaLeftX, plazaTopY, 'market', 'bench', 46, 36);

    // 2) 문화권 특화 상징 조형물 (동양: 해태/연등/홍살문 / 판타지: 크리스탈/비석/화로 / 일반: 기사 석상/우물)
    if (isEastAsia) {
        tryPlaceProp('prop_ea_guard_l', cx - 3, plazaTopY, 'east_asia', 'guardian', 46, 62);
        tryPlaceProp('prop_ea_guard_r', cx + 3, plazaTopY, 'east_asia', 'guardian', 46, 62);
        tryPlaceProp('prop_ea_stall', plazaLeftX - 2, hRoadY - 2, 'east_asia', 'east_stall', 64, 58);
        tryPlaceProp('prop_ea_lantern', plazaRightX + 1, plazaTopY, 'east_asia', 'lantern_rack', 56, 54);
        tryPlaceProp('prop_ea_palanquin', plazaRightX + 2, hRoadY + 2, 'east_asia', 'palanquin', 62, 50);
        tryPlaceProp('prop_ea_arch', cx + 3, southRoadY, 'east_asia', 'archway', 68, 64);
    } else if (isFantasyRealm) {
        tryPlaceProp('prop_fa_crystal_l', cx - 3, plazaTopY, 'fantasy', 'crystal', 46, 58);
        tryPlaceProp('prop_fa_crystal_r', cx + 3, plazaTopY, 'fantasy', 'crystal', 46, 58);
        tryPlaceProp('prop_fa_obelisk', plazaRightX + 1, plazaTopY, 'fantasy', 'obelisk', 46, 66);
        tryPlaceProp('prop_fa_brazier_l', cx - 3, southRoadY, 'fantasy', 'brazier', 42, 54);
        tryPlaceProp('prop_fa_brazier_r', cx + 3, southRoadY, 'fantasy', 'brazier', 42, 54);
        tryPlaceProp('prop_fa_rune', plazaLeftX - 1, plazaBotY + 1, 'fantasy', 'rune_pad', 56, 46, true);
    } else {
        tryPlaceProp('prop_nat_statue', cx - 3, plazaTopY, 'nature', 'statue', 48, 66);
        tryPlaceProp('prop_fa_banner', cx + 3, plazaTopY, 'fantasy', 'banner', 40, 66);
        tryPlaceProp('prop_mk_stall', plazaLeftX - 2, hRoadY - 2, 'market', 'stall', 64, 58);
        tryPlaceProp('prop_mk_well', plazaRightX + 1, plazaTopY, 'market', 'well', 52, 56);
        tryPlaceProp('prop_mk_cart', plazaRightX + 2, hRoadY + 2, 'market', 'cart', 58, 48);
    }

    // 3) 시장 상자·술통, 보물상자(장식), 화단, 바위, 화분으로 빈 잔디밭 풍성하게 채우기
    tryPlaceProp('prop_mk_crates', plazaLeftX - 1, hRoadY + 2, 'market', 'crates', 46, 44);
    tryPlaceProp('prop_fa_chest', cols - 4, rows - 4, 'fantasy', 'chest', 42, 38);
    tryPlaceProp('prop_nat_flower_1', plazaLeftX - 2, plazaBotY, 'nature', 'flowerbed', 52, 42, true);
    tryPlaceProp('prop_nat_flower_2', plazaRightX + 2, plazaBotY, 'nature', 'flowerbed', 52, 42, true);
    tryPlaceProp('prop_nat_planter_1', plazaLeftX - 1, plazaTopY - 1, 'nature', 'planter', 40, 52);
    tryPlaceProp('prop_nat_planter_2', plazaRightX + 1, plazaBotY + 1, 'nature', 'planter', 40, 52);
    tryPlaceProp('prop_nat_boulder_1', 3, rows - 4, 'nature', 'boulders', 48, 42);
    tryPlaceProp('prop_nat_boulder_2', cols - 5, 3, 'nature', 'boulders', 48, 42);
    tryPlaceProp('prop_nat_fence_1', 4, hRoadY + 2, isEastAsia ? 'east_asia' : 'nature', isEastAsia ? 'clay_wall' : 'fence', 52, 38);
    tryPlaceProp('prop_nat_fence_2', cols - 5, hRoadY - 2, isEastAsia ? 'east_asia' : 'nature', isEastAsia ? 'clay_wall' : 'fence', 52, 38);

    // 수도(Capital)일 경우 추가 왕실 깃발 & 화로 장식
    if (isCapital) {
        tryPlaceProp('prop_cap_banner_1', cx - 3, 5, 'fantasy', 'banner', 40, 66);
        tryPlaceProp('prop_cap_banner_2', cx + 3, 5, 'fantasy', 'banner', 40, 66);
        tryPlaceProp('prop_cap_brazier_1', cx - 3, 8, 'fantasy', 'brazier', 42, 54);
        tryPlaceProp('prop_cap_brazier_2', cx + 3, 8, 'fantasy', 'brazier', 42, 54);
        tryPlaceProp('prop_cap_well', 5, rows - 5, 'market', 'well', 52, 56);
    }

    return {
        cols,
        rows,
        tier: params.tier,
        regionKey,
        cultureKey,
        palette,
        tiles,
        solid,
        portals,
        npcs,
        props,
        spawnPos: { x: cx, y: cy },
        lamps: validLamps,
        fountainCenter
    };
};

/**
 * 클릭/터치 자동 이동용 경량 BFS 최단 경로 탐색
 */
export const findPathBFS = (
    solid: boolean[][],
    start: { x: number; y: number },
    goal: { x: number; y: number },
    maxSteps: number = 64
): Array<{ x: number; y: number }> => {
    const rows = solid.length;
    const cols = solid[0]?.length || 0;
    if (goal.x < 0 || goal.x >= cols || goal.y < 0 || goal.y >= rows) return [];
    if (start.x === goal.x && start.y === goal.y) return [];

    let target = goal;
    if (solid[goal.y][goal.x]) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let best: { x: number; y: number } | null = null;
        let bestDist = Infinity;
        for (const [dx, dy] of dirs) {
            const nx = goal.x + dx;
            const ny = goal.y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !solid[ny][nx]) {
                const d = Math.abs(nx - start.x) + Math.abs(ny - start.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = { x: nx, y: ny };
                }
            }
        }
        if (!best) return [];
        target = best;
    }

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent: Array<Array<{ x: number; y: number } | null>> = Array.from({ length: rows }, () => Array(cols).fill(null));
    const queue: Array<{ x: number; y: number }> = [start];
    visited[start.y][start.x] = true;

    const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    let found = false;

    while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.x === target.x && cur.y === target.y) {
            found = true;
            break;
        }
        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx] && !solid[ny][nx]) {
                visited[ny][nx] = true;
                parent[ny][nx] = cur;
                queue.push({ x: nx, y: ny });
            }
        }
    }

    if (!found) return [];

    const path: Array<{ x: number; y: number }> = [];
    let cur: { x: number; y: number } | null = target;
    while (cur && !(cur.x === start.x && cur.y === start.y)) {
        path.push(cur);
        cur = parent[cur.y][cur.x];
    }
    path.reverse();
    return path.slice(0, maxSteps);
};
