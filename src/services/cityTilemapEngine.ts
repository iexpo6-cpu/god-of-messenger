/**
 * 쯔꾸르(RPG Maker) 스타일 2D 도시 타일맵 생성 & NPC / 경로 탐색 엔진
 * - 28x20 타일맵을 현재 도시의 지역 테마, 등급(Capital/City/Town), 특수 시설 보유 여부에 따라 결정적으로 생성합니다.
 */

import { CityTier, DistrictType } from '../types';
import { DISTRICT_CONFIG } from '../constants';
import { mapRegionToSpriteKey, RpgSpriteRegionKey, SpriteDirection } from './rpgSpriteManifest';

export const CITY_MAP_COLS = 28;
export const CITY_MAP_ROWS = 20;
export const CITY_TILE_SIZE = 40;

export type CityTileKind =
    | 'grass'
    | 'road'
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

export interface CityTilemapData {
    cols: number;
    rows: number;
    regionKey: RpgSpriteRegionKey;
    palette: CityTilePalette;
    tiles: CityTileKind[][];
    solid: boolean[][];
    portals: CityPortalNode[];
    npcs: CityNpcEntity[];
    spawnPos: { x: number; y: number };
    lamps: Array<{ x: number; y: number }>;
}

const REGION_PALETTES: Record<RpgSpriteRegionKey, CityTilePalette> = {
    asia: {
        grass1: '#2f5e3d', grass2: '#376d47',
        road1: '#948b7c', road2: '#857c6e',
        plaza1: '#b8afa0', plaza2: '#a89f90',
        water1: '#2563eb', water2: '#3b82f6',
        wall: '#475569', wallTop: '#64748b',
        treeTrunk: '#5c3a21', treeLeaf1: '#e879f9', treeLeaf2: '#f472b6', // 벚꽃 포인트
        buildingWall: '#e7e5e4', buildingTrim: '#78350f',
        lampGlow: 'rgba(253, 224, 71, 0.35)'
    },
    europe: {
        grass1: '#2d5a34', grass2: '#35693d',
        road1: '#7c8491', road2: '#6e7682',
        plaza1: '#9ca3af', plaza2: '#8b93a0',
        water1: '#1d4ed8', water2: '#2563eb',
        wall: '#4b5563', wallTop: '#6b7280',
        treeTrunk: '#4a321d', treeLeaf1: '#15803d', treeLeaf2: '#22c55e',
        buildingWall: '#d6d3d1', buildingTrim: '#44403c',
        lampGlow: 'rgba(251, 191, 36, 0.35)'
    },
    north_america: {
        grass1: '#35663e', grass2: '#3d7447',
        road1: '#52525b', road2: '#474750',
        plaza1: '#a1a1aa', plaza2: '#8e8e98',
        water1: '#0284c7', water2: '#0ea5e9',
        wall: '#3f3f46', wallTop: '#52525b',
        treeTrunk: '#57361e', treeLeaf1: '#16a34a', treeLeaf2: '#4ade80',
        buildingWall: '#cbd5e1', buildingTrim: '#334155',
        lampGlow: 'rgba(254, 240, 138, 0.35)'
    },
    south_america: {
        grass1: '#266937', grass2: '#2f7c42',
        road1: '#a88d68', road2: '#987e5b',
        plaza1: '#c7ae87', plaza2: '#b79e78',
        water1: '#0d9488', water2: '#14b8a6',
        wall: '#78563c', wallTop: '#926b4c',
        treeTrunk: '#5c3a1f', treeLeaf1: '#15803d', treeLeaf2: '#84cc16',
        buildingWall: '#fef3c7', buildingTrim: '#92400e',
        lampGlow: 'rgba(251, 146, 60, 0.38)'
    },
    oceania: {
        grass1: '#367546', grass2: '#408652',
        road1: '#c9b38c', road2: '#b9a37d',
        plaza1: '#e0cca7', plaza2: '#d2bd97',
        water1: '#06b6d4', water2: '#22d3ee',
        wall: '#64748b', wallTop: '#94a3b8',
        treeTrunk: '#6b4423', treeLeaf1: '#16a34a', treeLeaf2: '#2dd4bf',
        buildingWall: '#f1f5f9', buildingTrim: '#0284c7',
        lampGlow: 'rgba(125, 211, 252, 0.35)'
    },
    africa: {
        grass1: '#b89458', grass2: '#c7a265',
        road1: '#9c7844', road2: '#8d6b3b',
        plaza1: '#d9bc84', plaza2: '#caa972',
        water1: '#0284c7', water2: '#38bdf8',
        wall: '#855830', wallTop: '#a16b3b',
        treeTrunk: '#6b4226', treeLeaf1: '#4d7c0f', treeLeaf2: '#65a30d',
        buildingWall: '#fde68a', buildingTrim: '#92400e',
        lampGlow: 'rgba(251, 191, 36, 0.42)'
    },
    shingye: {
        grass1: '#cbd5e1', grass2: '#e2e8f0',
        road1: '#f8fafc', road2: '#e2e8f0',
        plaza1: '#fef3c7', plaza2: '#fde68a',
        water1: '#38bdf8', water2: '#7dd3fc',
        wall: '#94a3b8', wallTop: '#f59e0b',
        treeTrunk: '#d4af37', treeLeaf1: '#fef08a', treeLeaf2: '#fde047',
        buildingWall: '#ffffff', buildingTrim: '#d97706',
        lampGlow: 'rgba(254, 240, 138, 0.5)'
    },
    magye: {
        grass1: '#271722', grass2: '#331d2c',
        road1: '#3f2e3a', road2: '#352630',
        plaza1: '#4c2c3c', plaza2: '#3d2230',
        water1: '#dc2626', water2: '#f97316', // 용암 수로
        wall: '#18181b', wallTop: '#7f1d1d',
        treeTrunk: '#1f161c', treeLeaf1: '#991b1b', treeLeaf2: '#ef4444',
        buildingWall: '#27272a', buildingTrim: '#b91c1c',
        lampGlow: 'rgba(248, 113, 113, 0.45)'
    },
    sylvanar: {
        grass1: '#1e4d33', grass2: '#256040',
        road1: '#6c7c59', road2: '#5f6f4e',
        plaza1: '#7d926b', plaza2: '#6e825d',
        water1: '#059669', water2: '#34d399',
        wall: '#2c4c34', wallTop: '#4ade80',
        treeTrunk: '#4c3220', treeLeaf1: '#10b981', treeLeaf2: '#34d399',
        buildingWall: '#d1fae5', buildingTrim: '#047857',
        lampGlow: 'rgba(110, 231, 183, 0.45)'
    },
    feraldia: {
        grass1: '#7c4d2b', grass2: '#8c5832',
        road1: '#a16c42', road2: '#915f38',
        plaza1: '#b88255', plaza2: '#a87449',
        water1: '#0369a1', water2: '#0284c7',
        wall: '#57361e', wallTop: '#b45309',
        treeTrunk: '#4a2c16', treeLeaf1: '#65a30d', treeLeaf2: '#84cc16',
        buildingWall: '#fed7aa', buildingTrim: '#9a3412',
        lampGlow: 'rgba(251, 146, 60, 0.42)'
    },
    abyssalon: {
        grass1: '#1e1b33', grass2: '#262242',
        road1: '#373054', road2: '#2e2847',
        plaza1: '#433868', plaza2: '#392f59',
        water1: '#6d28d9', water2: '#8b5cf6',
        wall: '#1e1b4b', wallTop: '#6d28d9',
        treeTrunk: '#1f1633', treeLeaf1: '#7c3aed', treeLeaf2: '#a855f7',
        buildingWall: '#312e81', buildingTrim: '#c084fc',
        lampGlow: 'rgba(192, 132, 252, 0.45)'
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
    canOpenTranscendent: boolean;
    timeLabel: string;
    isMythicBoss: boolean;
    bossName?: string;
}

export const buildCityTilemap = (params: BuildCityTilemapParams): CityTilemapData => {
    const cols = CITY_MAP_COLS;
    const rows = CITY_MAP_ROWS;
    const regionKey = mapRegionToSpriteKey(params.region, params.nation);
    const palette = REGION_PALETTES[regionKey] || REGION_PALETTES.asia;

    const tiles: CityTileKind[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 'grass' as CityTileKind)
    );
    const solid: boolean[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
    );

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

    // 2. 중앙 십자 메인 도로 + 중앙 광장
    for (let x = 2; x < cols - 2; x++) {
        tiles[9][x] = 'road';
        tiles[10][x] = 'road';
        tiles[15][x] = 'road';
    }
    for (let y = 2; y < rows - 1; y++) {
        tiles[y][13] = 'road';
        tiles[y][14] = 'road';
    }
    // 중앙 광장 (11..16, 7..12)
    for (let y = 7; y <= 12; y++) {
        for (let x = 11; x <= 16; x++) {
            tiles[y][x] = 'plaza';
        }
    }
    // 중앙 분수대/기념비
    tiles[9][13] = 'fountain';
    tiles[9][14] = 'fountain';
    solid[9][13] = true;
    solid[9][14] = true;

    // 3. 장식 수로 (남서/남동 연못)
    for (let y = 12; y <= 13; y++) {
        for (let x = 2; x <= 4; x++) {
            tiles[y][x] = 'water';
            solid[y][x] = true;
        }
        for (let x = cols - 5; x <= cols - 3; x++) {
            tiles[y][x] = 'water';
            solid[y][x] = true;
        }
    }

    // 4. 건물 & 포탈 배치 헬퍼
    const portals: CityPortalNode[] = [];
    const placeBuilding = (node: CityPortalNode) => {
        for (let y = node.buildingY; y < node.buildingY + node.buildingH; y++) {
            for (let x = node.buildingX; x < node.buildingX + node.buildingW; x++) {
                if (y < 1 || y >= rows - 1 || x < 1 || x >= cols - 1) continue;
                tiles[y][x] = y === node.buildingY ? 'building_roof' : 'building_wall';
                solid[y][x] = true;
            }
        }
        // 문 타일 (진입 가능 + 상호작용 트리거)
        if (node.doorY >= 1 && node.doorY < rows - 1 && node.doorX >= 1 && node.doorX < cols - 1) {
            tiles[node.doorY][node.doorX] = node.actionType === 'dungeon' || node.actionType === 'transcendent_arena' || node.actionType === 'abyss_tower'
                ? 'portal'
                : 'door';
            solid[node.doorY][node.doorX] = false;
            // 문 바로 앞은 도로로 연결
            if (node.doorY + 1 < rows - 1 && !solid[node.doorY + 1][node.doorX]) {
                tiles[node.doorY + 1][node.doorX] = 'road';
            }
        }
        portals.push(node);
    };

    const hasDistrict = (d: DistrictType) => params.activeDistricts.includes(d);

    // 북쪽 중앙: 수도 왕궁 또는 종족 특수 도시 또는 중앙 성소
    if (params.isElfNation) {
        placeBuilding({
            id: 'elf_city', label: '실바나르 세계수 성소', subLabel: '엘프 종족 특수 도시',
            actionType: 'elf_city', buildingX: 11, buildingY: 2, buildingW: 6, buildingH: 3,
            doorX: 14, doorY: 4, roofColor: '#059669', accentColor: '#34d399', iconText: '🌿'
        });
    } else if (params.isBeastNation) {
        placeBuilding({
            id: 'beast_city', label: '페랄디아 대투기장', subLabel: '수인 종족 특수 도시',
            actionType: 'beast_city', buildingX: 11, buildingY: 2, buildingW: 6, buildingH: 3,
            doorX: 14, doorY: 4, roofColor: '#c2410c', accentColor: '#fb923c', iconText: '🦁'
        });
    } else if (params.isDemonNation) {
        placeBuilding({
            id: 'demon_city', label: '아비살론 암흑 성채', subLabel: '마족 종족 특수 도시',
            actionType: 'demon_city', buildingX: 11, buildingY: 2, buildingW: 6, buildingH: 3,
            doorX: 14, doorY: 4, roofColor: '#6d28d9', accentColor: '#c084fc', iconText: '🦇'
        });
    } else if (hasDistrict('RoyalCourt')) {
        placeBuilding({
            id: 'royal_court', label: DISTRICT_CONFIG.RoyalCourt.label, subLabel: '수도 왕궁 알현',
            actionType: 'district', district: 'RoyalCourt', buildingX: 11, buildingY: 2, buildingW: 6, buildingH: 3,
            doorX: 14, doorY: 4, roofColor: '#b45309', accentColor: '#fbbf24', iconText: '👑'
        });
    } else {
        placeBuilding({
            id: 'city_hall', label: '도시 행정 광장', subLabel: `${params.city} 중심부`,
            actionType: 'district', district: 'Residential', buildingX: 12, buildingY: 2, buildingW: 4, buildingH: 3,
            doorX: 14, doorY: 4, roofColor: '#475569', accentColor: '#94a3b8', iconText: '🏛️'
        });
    }

    // 북서쪽: 상업 지구
    if (hasDistrict('Commercial')) {
        placeBuilding({
            id: 'commercial', label: DISTRICT_CONFIG.Commercial.label, subLabel: '상점 · 대장간 · 거래소',
            actionType: 'district', district: 'Commercial', buildingX: 3, buildingY: 3, buildingW: 5, buildingH: 3,
            doorX: 5, doorY: 5, roofColor: '#d97706', accentColor: '#fcd34d', iconText: '🏪'
        });
    }

    // 북동쪽: 거주 지구
    if (hasDistrict('Residential')) {
        placeBuilding({
            id: 'residential', label: DISTRICT_CONFIG.Residential.label, subLabel: '여관 · 주택 · 암시장',
            actionType: 'district', district: 'Residential', buildingX: 20, buildingY: 3, buildingW: 5, buildingH: 3,
            doorX: 22, doorY: 5, roofColor: '#15803d', accentColor: '#86efac', iconText: '🏠'
        });
    }

    // 서쪽 하단: 용병 길드
    if (hasDistrict('Mercenary')) {
        placeBuilding({
            id: 'mercenary', label: DISTRICT_CONFIG.Mercenary.label, subLabel: '의뢰 · 파티 모집',
            actionType: 'district', district: 'Mercenary', buildingX: 6, buildingY: 11, buildingW: 4, buildingH: 3,
            doorX: 8, doorY: 13, roofColor: '#b91c1c', accentColor: '#fca5a5', iconText: '⚔️'
        });
    }

    // 동쪽 하단: 레귤러스 학교
    if (hasDistrict('Academic')) {
        placeBuilding({
            id: 'academic', label: DISTRICT_CONFIG.Academic.label, subLabel: '학교 · 도서관',
            actionType: 'district', district: 'Academic', buildingX: 18, buildingY: 11, buildingW: 4, buildingH: 3,
            doorX: 20, doorY: 13, roofColor: '#0e7490', accentColor: '#67e8f9', iconText: '📚'
        });
    }

    // 남서쪽: 군사 구역
    if (hasDistrict('Military')) {
        placeBuilding({
            id: 'military', label: DISTRICT_CONFIG.Military.label, subLabel: '병영 · 군사 훈련',
            actionType: 'district', district: 'Military', buildingX: 2, buildingY: 16, buildingW: 4, buildingH: 2,
            doorX: 4, doorY: 17, roofColor: '#334155', accentColor: '#94a3b8', iconText: '🛡️'
        });
    }

    // 남동쪽: 도시 외곽(사냥터) + 던전 입구
    if (hasDistrict('Outskirts')) {
        placeBuilding({
            id: 'outskirts', label: '외곽 사냥터', subLabel: '필드 몬스터 토벌',
            actionType: 'district', district: 'Outskirts', openHuntMap: true,
            buildingX: 17, buildingY: 16, buildingW: 4, buildingH: 2,
            doorX: 19, doorY: 17, roofColor: '#c2410c', accentColor: '#fdba74', iconText: '🏕️'
        });
    }
    placeBuilding({
        id: 'dungeon', label: params.isMythicBoss ? `차원의 틈새 (${params.bossName || '시즌 보스'})` : '던전 입구',
        subLabel: '2D 미궁 탐험 진입',
        actionType: 'dungeon',
        buildingX: 22, buildingY: 16, buildingW: 4, buildingH: 2,
        doorX: 24, doorY: 17, roofColor: params.isMythicBoss ? '#7e22ce' : '#7f1d1d',
        accentColor: params.isMythicBoss ? '#e879f9' : '#f87171', iconText: params.isMythicBoss ? '🌀' : '💀'
    });

    // 내 기지 (현재 도시에 보유 중인 경우 북동 광장 옆에 표시)
    if (params.hasBaseInCurrentLocation) {
        placeBuilding({
            id: 'my_base', label: '내 거점 (기지)', subLabel: '시설 관리 · 동료 배치',
            actionType: 'base',
            buildingX: 18, buildingY: 6, buildingW: 3, buildingH: 2,
            doorX: 19, doorY: 7, roofColor: '#047857', accentColor: '#34d399', iconText: '🏰'
        });
    }

    // 초월 콘텐츠 포탈 (Lv.2000+ 해금 시 서쪽 광장 옆)
    if (params.canOpenTranscendent) {
        placeBuilding({
            id: 'abyss_tower', label: '무한 심연 탑', subLabel: '초월 엔드게임 등반',
            actionType: 'abyss_tower',
            buildingX: 7, buildingY: 6, buildingW: 3, buildingH: 2,
            doorX: 8, doorY: 7, roofColor: '#4c1d95', accentColor: '#c084fc', iconText: '🗼'
        });
    }

    // 남쪽 중앙 성문 (월드맵 이동)
    tiles[rows - 1][13] = 'door';
    tiles[rows - 1][14] = 'door';
    solid[rows - 1][13] = false;
    solid[rows - 1][14] = false;
    portals.push({
        id: 'world_gate', label: '성문 / 월드맵', subLabel: '다른 도시·대륙으로 이동',
        actionType: 'world_map',
        buildingX: 12, buildingY: rows - 1, buildingW: 4, buildingH: 1,
        doorX: 13, doorY: rows - 1, roofColor: '#1e40af', accentColor: '#60a5fa', iconText: '🗺️'
    });

    // 문 앞 도로 자동 연결 보장
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
        { x: 11, y: 7 }, { x: 16, y: 7 },
        { x: 11, y: 12 }, { x: 16, y: 12 },
        { x: 5, y: 8 }, { x: 22, y: 8 },
        { x: 12, y: 16 }, { x: 15, y: 16 },
    ];
    lamps.forEach(l => {
        if (!solid[l.y][l.x] && tiles[l.y][l.x] !== 'door' && tiles[l.y][l.x] !== 'portal') {
            tiles[l.y][l.x] = 'lamp';
            solid[l.y][l.x] = true;
        }
    });

    const treeCoords = [
        [2, 2], [9, 2], [18, 2], [25, 2],
        [2, 7], [25, 7], [2, 11], [25, 11],
        [9, 16], [10, 17], [16, 17], [26, 13]
    ];
    treeCoords.forEach(([tx, ty]) => {
        if (tx > 0 && tx < cols - 1 && ty > 0 && ty < rows - 1 && tiles[ty][tx] === 'grass' && !solid[ty][tx]) {
            tiles[ty][tx] = 'tree';
            solid[ty][tx] = true;
        }
    });

    const flowerCoords = [
        [10, 8], [17, 8], [10, 11], [17, 11], [4, 7], [23, 7]
    ];
    flowerCoords.forEach(([fx, fy]) => {
        if (tiles[fy]?.[fx] === 'grass' && !solid[fy][fx]) {
            tiles[fy][fx] = 'flower';
        }
    });

    // 6. 지역 테마 NPC 5명 스폰
    const npcTemplates: Array<{
        id: string; name: string; role: string; gender: 'male' | 'female';
        x: number; y: number; dialogues: string[];
    }> = [
        {
            id: 'npc_guard', name: `${params.city} 수비대장`, role: '경비병', gender: 'male',
            x: 12, y: 15,
            dialogues: [
                `${params.nation} ${params.city}에 오신 것을 환영합니다! 성문 남쪽으로 나가면 월드맵으로 이동할 수 있습니다.`,
                params.isMythicBoss
                    ? `경계 태세! 남동쪽 던전 부근에서 차원의 틈새(${params.bossName || '강력한 보스'}) 기운이 감지되고 있습니다!`
                    : `현재 시간대는 [${params.timeLabel}]입니다. 밤 22시 이후에는 거주 지구 뒷골목 암시장이 열립니다.`
            ]
        },
        {
            id: 'npc_merchant', name: '행상인 마르코', role: '상인', gender: 'male',
            x: 6, y: 9,
            dialogues: [
                `어서 오세요! 북서쪽 상업 지구에서 희귀 장비와 강화 재료를 구경해 보세요.`,
                `요즘 차원 경매장에서도 다른 세계 모험가들의 명품 장비가 자주 올라온다더군요!`
            ]
        },
        {
            id: 'npc_guide', name: '길드 안내원 리나', role: '길드원', gender: 'female',
            x: 10, y: 10,
            dialogues: [
                `반가워요, 모험가님! 건물 문 앞에서 [Space / E]를 누르거나 직접 클릭하면 바로 입장할 수 있어요.`,
                `동료들과 함께 걸어 다니면 든든하죠? ${params.city}의 여러 구역을 자유롭게 둘러보세요!`
            ]
        },
        {
            id: 'npc_scholar', name: '견습 학자 세라', role: '학자', gender: 'female',
            x: 21, y: 9,
            dialogues: [
                `동쪽 거주 지구와 레귤러스 학교에서는 휴식과 훈련, 정보 수집을 할 수 있어요.`,
                `${params.region} 대륙만의 독특한 신력 흐름이 이 도시 광장 분수대에도 흐르고 있답니다.`
            ]
        },
        {
            id: 'npc_adventurer', name: '떠돌이 검사 카이', role: '모험가', gender: 'male',
            x: 16, y: 14,
            dialogues: [
                `남동쪽 던전 입구에는 강한 마물들이 도사리고 있지. 준비가 끝나면 도전해 보라고!`,
                `탐험 관측소를 세우고 던전 지리 정찰을 보내두면 미궁 지도가 한눈에 펼쳐져서 훨씬 편해.`
            ]
        }
    ];

    const npcs: CityNpcEntity[] = npcTemplates.map(t => ({
        ...t,
        regionKey,
        homeX: t.x,
        homeY: t.y,
        dir: 'down'
    }));

    return {
        cols,
        rows,
        regionKey,
        palette,
        tiles,
        solid,
        portals,
        npcs,
        spawnPos: { x: 14, y: 10 },
        lamps
    };
};

/**
 * 클릭/터치 자동 이동용 경량 BFS 최단 경로 탐색
 */
export const findPathBFS = (
    solid: boolean[][],
    start: { x: number; y: number },
    goal: { x: number; y: number },
    maxSteps: number = 48
): Array<{ x: number; y: number }> => {
    const rows = solid.length;
    const cols = solid[0]?.length || 0;
    if (goal.x < 0 || goal.x >= cols || goal.y < 0 || goal.y >= rows) return [];
    if (start.x === goal.x && start.y === goal.y) return [];

    // 목표가 벽/건물인 경우 가장 가까운 인접 이동 가능 타일로 보정
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
