import { BaseDecorationItem, Character, Companion, CapturedMonster, FacilityInstance } from '../types';
import { BASE_GRID_EXPANSION_COSTS, BASE_UPGRADE_COSTS, FACILITIES_INFO } from '../constants';
import { hasDimensionalLeapEligible, hasDimensionalLeapSkill } from './travelCalculationService';
import {
    CityCultureKey,
    CultureAssetPart,
    getBaseBuildingSpriteUrl,
    getBaseFacilityLevelSpriteUrl,
    getConstructionSpriteUrl,
    getCultureAssetUrl,
    getHousingBuildingUrl,
    getPropAssetUrl,
    HousingBuildingPart,
    PropPackKey,
    resolveBuildingPackKey,
    resolveCityCultureKey
} from './cityAssetManifest';
import { resolveEntityRpgSprite, SpriteDirection } from './rpgSpriteManifest';
import { getTimeOfDay } from './gameTimeService';
import { getConstructionRemainingTime } from './baseConstructionService';

export const BASE_TILE_SIZE = 48;

/** 기지 레벨(Lv.1~5)별 최대 맵 크기 (타일 수, 정사각형 기준) */
export const BASE_MAX_MAP_SIZE_BY_LEVEL: Record<number, number> = {
    1: 40,
    2: 70,
    3: 110,
    4: 150,
    5: 200
};

export interface BaseMapExpansionOption {
    canExpand: boolean;
    nextSize: number;
    maxForLevel: number;
    goldCost: number;
    foodCost: number;
    woodCost: number;
    stoneCost: number;
    ironCost: number;
    manaCrystalCost: number;
    needsHigherBaseLevel: boolean;
}

export const getBaseMapExpansionOption = (
    baseLevel: number,
    curWidth: number,
    curHeight: number
): BaseMapExpansionOption => {
    const lv = Math.max(1, Math.min(5, Math.floor(baseLevel || 1)));
    const maxForLevel = BASE_MAX_MAP_SIZE_BY_LEVEL[lv] || 40;
    const cur = Math.max(curWidth || 30, curHeight || 30);
    if (cur >= maxForLevel) {
        return {
            canExpand: false,
            nextSize: cur,
            maxForLevel,
            goldCost: 0,
            foodCost: 0,
            woodCost: 0,
            stoneCost: 0,
            ironCost: 0,
            manaCrystalCost: 0,
            needsHigherBaseLevel: lv < 5
        };
    }
    const step = lv === 1 ? 10 : lv === 2 ? 15 : lv <= 4 ? 20 : 25;
    const nextSize = Math.min(maxForLevel, cur + step);
    // BaseModal.tsx와 동일한 BASE_GRID_EXPANSION_COSTS 기준 대폭 상향 통일
    const gridTierMap: Record<number, number> = { 1: 7, 2: 8, 3: 8, 4: 9, 5: 10 };
    const gridCost = BASE_GRID_EXPANSION_COSTS[gridTierMap[lv] || 8] || BASE_GRID_EXPANSION_COSTS[8];
    return {
        canExpand: true,
        nextSize,
        maxForLevel,
        goldCost: gridCost?.gold || lv * 50000000,
        foodCost: gridCost?.food || lv * 5000,
        woodCost: gridCost?.wood || lv * 10000,
        stoneCost: gridCost?.stone || lv * 10000,
        ironCost: gridCost?.iron || lv * 1500,
        manaCrystalCost: gridCost?.manaCrystal || lv * 1500,
        needsHigherBaseLevel: false
    };
};

/** 시설 성격 및 레벨별 차지하는 타일 크기 (Footprint — 레벨업할 때마다 +1×+1 증가!) */
export const getFacilityFootprint = (facilityType: string, level: number = 1): { w: number; h: number } => {
    const lv = Math.max(1, Math.floor(level || 1));
    const growth = lv - 1;
    let baseW = 2;
    let baseH = 2;
    if (facilityType === 'hq') {
        baseW = 6;
        baseH = 5;
    } else if (
        facilityType === 'monster_farm' ||
        facilityType === 'monster_ranch' ||
        facilityType === 'monster_arena' ||
        facilityType === 'tactical_training'
    ) {
        baseW = 5;
        baseH = 4;
    } else if (
        facilityType === 'farm' ||
        facilityType === 'mine' ||
        facilityType === 'combat_training' ||
        facilityType === 'training_exp' ||
        facilityType === 'training_stat' ||
        facilityType === 'training_mastery' ||
        facilityType === 'training' ||
        facilityType === 'child_academy' ||
        facilityType === 'defense'
    ) {
        baseW = 4;
        baseH = 3;
    } else if (
        facilityType === 'housing' ||
        facilityType === 'home' ||
        facilityType === 'my_home' ||
        facilityType === 'blacksmith' ||
        facilityType === 'alchemy' ||
        facilityType === 'cooking' ||
        facilityType === 'lab' ||
        facilityType === 'workshop' ||
        facilityType === 'storage' ||
        facilityType === 'dispatch'
    ) {
        baseW = 3;
        baseH = 3;
    }
    return { w: baseW + growth, h: baseH + growth };
};

export type BaseFloorTileId =
    | 'default'
    | 'dirt_road'
    | 'stone_road'
    | 'plaza'
    | 'wood_deck'
    | 'flower_field'
    | 'water'
    | 'royal_marble'
    | 'sand'
    | 'snow'
    | 'elf_moss'
    | 'shingye_jade'
    | 'magye_obsidian';

export interface BaseFloorTileDef {
    id: BaseFloorTileId;
    label: string;
    gold: number;
    wood: number;
    stone: number;
    color: string;
    accentColor: string;
    solid?: boolean;
    terrainPart?: 'ground' | 'road' | 'plaza' | 'royal_road' | 'water';
}

export const BASE_FLOOR_TILE_CATALOG: BaseFloorTileDef[] = [
    { id: 'default', label: '기본 지면 (무료)', gold: 0, wood: 0, stone: 0, color: '#356831', accentColor: '#2f5e2c', terrainPart: 'ground' },
    { id: 'dirt_road', label: '흙길', gold: 50, wood: 0, stone: 0, color: '#9c7c56', accentColor: '#876946' },
    { id: 'stone_road', label: '돌 포장도로', gold: 120, wood: 0, stone: 1, color: '#8d867e', accentColor: '#736d66', terrainPart: 'road' },
    { id: 'plaza', label: '광장 석재', gold: 150, wood: 0, stone: 1, color: '#b4afa6', accentColor: '#9c968d', terrainPart: 'plaza' },
    { id: 'wood_deck', label: '목재 데크', gold: 120, wood: 1, stone: 0, color: '#8b5a2b', accentColor: '#6f451f' },
    { id: 'flower_field', label: '꽃밭 정원', gold: 200, wood: 0, stone: 0, color: '#3f7d3a', accentColor: '#f472b6' },
    { id: 'water', label: '연못 / 수로', gold: 250, wood: 0, stone: 1, color: '#0284c7', accentColor: '#38bdf8', solid: true, terrainPart: 'water' },
    { id: 'royal_marble', label: '왕도 대리석', gold: 400, wood: 0, stone: 2, color: '#e2e8f0', accentColor: '#fbbf24', terrainPart: 'royal_road' },
    { id: 'sand', label: '사막 모래', gold: 80, wood: 0, stone: 0, color: '#d4b483', accentColor: '#c19e67' },
    { id: 'snow', label: '설원 눈길', gold: 100, wood: 0, stone: 0, color: '#e0f2fe', accentColor: '#bae6fd' },
    { id: 'elf_moss', label: '엘프 숲길', gold: 300, wood: 1, stone: 0, color: '#15803d', accentColor: '#4ade80' },
    { id: 'shingye_jade', label: '신계 백옥', gold: 600, wood: 0, stone: 2, color: '#fef9c3', accentColor: '#f59e0b' },
    { id: 'magye_obsidian', label: '마계 흑요석', gold: 600, wood: 0, stone: 2, color: '#2e1065', accentColor: '#a855f7' }
];

export const FLOOR_TILE_MAP: Record<string, BaseFloorTileDef> = Object.fromEntries(
    BASE_FLOOR_TILE_CATALOG.map(t => [t.id, t])
);

export interface BaseDecorationDef {
    key: string;
    label: string;
    pack: 'culture' | PropPackKey;
    part: string;
    gold: number;
    wood: number;
    stone: number;
    solid: boolean;
    category: '자연·정원' | '마을·가구' | '신비·성채';
}

export const BASE_DECORATION_CATALOG: BaseDecorationDef[] = [
    { key: 'culture_tree', label: '지역 조경수', pack: 'culture', part: 'tree', gold: 500, wood: 2, stone: 0, solid: true, category: '자연·정원' },
    { key: 'nature_flowerbed', label: '꽃밭 화단', pack: 'nature', part: 'flowerbed', gold: 400, wood: 1, stone: 0, solid: false, category: '자연·정원' },
    { key: 'nature_planter', label: '대형 화분', pack: 'nature', part: 'planter', gold: 450, wood: 1, stone: 1, solid: true, category: '자연·정원' },
    { key: 'nature_boulders', label: '조경 바위', pack: 'nature', part: 'boulders', gold: 350, wood: 0, stone: 2, solid: true, category: '자연·정원' },
    { key: 'nature_fence', label: '나무 울타리', pack: 'nature', part: 'fence', gold: 300, wood: 2, stone: 0, solid: true, category: '자연·정원' },
    { key: 'nature_bridge', label: '나무 다리', pack: 'nature', part: 'bridge', gold: 800, wood: 4, stone: 0, solid: false, category: '자연·정원' },
    { key: 'culture_lamp', label: '지역 가로등', pack: 'culture', part: 'lamp', gold: 600, wood: 1, stone: 1, solid: true, category: '마을·가구' },
    { key: 'culture_fountain', label: '중앙 분수대', pack: 'culture', part: 'fountain', gold: 2500, wood: 0, stone: 6, solid: true, category: '마을·가구' },
    { key: 'market_bench', label: '휴식 벤치', pack: 'market', part: 'bench', gold: 500, wood: 2, stone: 0, solid: false, category: '마을·가구' },
    { key: 'market_well', label: '돌 우물', pack: 'market', part: 'well', gold: 1200, wood: 1, stone: 4, solid: true, category: '마을·가구' },
    { key: 'market_notice', label: '영지 게시판', pack: 'market', part: 'notice_board', gold: 700, wood: 3, stone: 0, solid: true, category: '마을·가구' },
    { key: 'market_stall', label: '노점 천막', pack: 'market', part: 'stall', gold: 1100, wood: 3, stone: 0, solid: true, category: '마을·가구' },
    { key: 'fantasy_brazier', label: '성채 화톳불', pack: 'fantasy', part: 'brazier', gold: 1000, wood: 1, stone: 3, solid: true, category: '신비·성채' },
    { key: 'fantasy_banner', label: '영지 깃발', pack: 'fantasy', part: 'banner', gold: 900, wood: 2, stone: 0, solid: false, category: '신비·성채' },
    { key: 'fantasy_crystal', label: '마력 크리스탈', pack: 'fantasy', part: 'crystal', gold: 2000, wood: 0, stone: 4, solid: true, category: '신비·성채' },
    { key: 'fantasy_obelisk', label: '고대 오벨리스크', pack: 'fantasy', part: 'obelisk', gold: 3000, wood: 0, stone: 8, solid: true, category: '신비·성채' },
    { key: 'fantasy_rune', label: '룬 마법진', pack: 'fantasy', part: 'rune_pad', gold: 1800, wood: 0, stone: 3, solid: false, category: '신비·성채' },
    { key: 'east_archway', label: '전통 아치문', pack: 'east_asia', part: 'archway', gold: 2200, wood: 5, stone: 3, solid: false, category: '신비·성채' }
];

export const resolveDecorationSpriteUrl = (
    cultureKey: CityCultureKey,
    pack: string,
    part: string
): string => {
    if (pack === 'culture') {
        return getCultureAssetUrl(cultureKey, part as CultureAssetPart);
    }
    return getPropAssetUrl(pack as PropPackKey, part);
};

export interface BaseFacilityNode {
    id: string;
    instanceId?: string;
    facilityType: string;
    label: string;
    subLabel: string;
    level: number;
    tileX: number;
    tileY: number;
    tileW: number;
    tileH: number;
    doorX: number;
    doorY: number;
    underConstruction: boolean;
    completionText?: string;
    spriteUrl?: string;
    constructionSpriteUrl?: string;
    iconText: string;
    accentColor: string;
    isHq?: boolean;
    isMonsterPen?: boolean;
    isFarm?: boolean;
    assignedNames: string[];
}

export interface BaseResidentEntity {
    id: string;
    name: string;
    role: string;
    activityBubble: string;
    spriteUrl: string;
    px: number;
    py: number;
    homePx: number;
    homePy: number;
    dir: SpriteDirection;
    walkFrame: number;
    animTimer: number;
    wanderTimer: number;
    targetPx: number | null;
    targetPy: number | null;
    companionRef: Companion;
    assignedFacilityLabel?: string;
    isSleeping?: boolean;
}

export interface BaseFarmMonsterEntity {
    id: string;
    name: string;
    level: number;
    rank?: string;
    hunger: number;
    affection: number;
    visualUrl?: string;
    px: number;
    py: number;
    minPx: number;
    maxPx: number;
    minPy: number;
    maxPy: number;
    dir: 'left' | 'right';
    bobPhase: number;
    wanderTimer: number;
    targetPx: number | null;
    targetPy: number | null;
    monsterRef: CapturedMonster;
}

export interface BaseTilemapData {
    cols: number;
    rows: number;
    baseLevel: number;
    cultureKey: CityCultureKey;
    buildingPackKey: string;
    /** 희소 바닥 타일 오버라이드 (key: "x,y", value: BaseFloorTileId) */
    floorOverrides: Record<string, BaseFloorTileId>;
    /** 충돌 판정용 희소 Set (key: "x,y") — 200x200에서도 초경량 & O(1) */
    solidSet: Set<string>;
    /** 60Hz 충돌 판정용 고속 숫자 그리드 (cols * rows, 1 = solid, 0 = walkable) */
    solidGrid?: Uint8Array;
    facilities: BaseFacilityNode[];
    decorations: BaseDecorationItem[];
    residents: BaseResidentEntity[];
    farmMonsters: BaseFarmMonsterEntity[];
    spawnPos: { x: number; y: number };
    exitGate: { x: number; y: number; w: number; h: number };
}

const FACILITY_VISUAL_META: Record<string, { icon: string; color: string; activity: string }> = {
    home: { icon: '🏡', color: '#f59e0b', activity: '🏡 내 집 휴식 중' },
    my_home: { icon: '🏡', color: '#f59e0b', activity: '🏡 내 집 휴식 중' },
    housing: { icon: '🏘️', color: '#10b981', activity: '💤 숙소 휴식 중' },
    farm: { icon: '🌾', color: '#84cc16', activity: '🌾 작물 재배 중' },
    mine: { icon: '⛏️', color: '#94a3b8', activity: '⛏️ 광석 채굴 중' },
    blacksmith: { icon: '⚒️', color: '#f97316', activity: '⚒️ 장비 단조 중' },
    alchemy: { icon: '🧪', color: '#a855f7', activity: '🧪 물약 조제 중' },
    cooking: { icon: '🍳', color: '#fb923c', activity: '🍳 요리 준비 중' },
    lab: { icon: '🔬', color: '#38bdf8', activity: '🔬 마법 연구 중' },
    workshop: { icon: '🛠️', color: '#eab308', activity: '🛠️ 공방 제작 중' },
    storage: { icon: '📦', color: '#d97706', activity: '📦 물자 정리 중' },
    dispatch: { icon: '🧭', color: '#06b6d4', activity: '🧭 파견 브리핑 중' },
    monster_farm: { icon: '🐾', color: '#22c55e', activity: '🐾 몬스터 돌봄 중' },
    monster_ranch: { icon: '🐾', color: '#22c55e', activity: '🐾 몬스터 돌봄 중' },
    monster_arena: { icon: '🏟️', color: '#ef4444', activity: '🏟️ 몬스터 대련 중' },
    training_exp: { icon: '📖', color: '#60a5fa', activity: '📖 전술 수련 중' },
    training_stat: { icon: '💪', color: '#f43f5e', activity: '💪 체력 단련 중' },
    training_mastery: { icon: '⚔️', color: '#fbbf24', activity: '⚔️ 무기 숙련 중' },
    combat_training: { icon: '🥋', color: '#ec4899', activity: '🥋 실전 대련 중' },
    tactical_training: { icon: '🎯', color: '#8b5cf6', activity: '🎯 전술 훈련 중' },
    defense: { icon: '🛡️', color: '#64748b', activity: '🛡️ 기지 경비 중' },
    child_academy: { icon: '🎓', color: '#2dd4bf', activity: '🎓 아카데미 교육 중' },
    explorer_observatory: { icon: '🔭', color: '#818cf8', activity: '🔭 던전 관측 중' },
    shinryoku_sanctuary: { icon: '✨', color: '#fde047', activity: '✨ 신력 공명 중' },
    transcendence_sanctuary: { icon: '🌟', color: '#facc15', activity: '🌟 초월 명상 중' }
};

const resolveHousingPartForInstance = (
    character: Character,
    inst: FacilityInstance
): HousingBuildingPart => {
    if (inst.type === 'home' || inst.type === 'my_home') return 'house_my_home';
    const houses = character.base?.houses || [];
    const matched = houses.find(h => h.id === inst.id) || houses[0];
    const hType = String(matched?.type || '').toLowerCase();
    if (hType.includes('luxury') || hType.includes('mansion') || hType.includes('고급')) return 'house_luxury';
    if (hType.includes('apartment') || hType.includes('아파트')) return 'house_apartment';
    if (hType.includes('villa') || hType.includes('빌라')) return 'house_villa';
    if (hType.includes('2f') || hType.includes('2층') || (inst.level || 1) >= 3) return 'house_2f';
    return 'house_1f';
};

export const canPlaceFacilityRect = (
    cols: number,
    rows: number,
    facilities: BaseFacilityNode[],
    floorOverrides: Record<string, BaseFloorTileId>,
    exitGate: { x: number; y: number; w: number; h: number },
    x: number,
    y: number,
    w: number,
    h: number,
    ignoreFacilityId?: string
): boolean => {
    // 외곽 성벽(0, cols-1, 0, rows-1) 및 정문 앞 2칸 보호
    if (x < 2 || y < 2 || x + w > cols - 2 || y + h > rows - 3) return false;

    // 정문 출입 통로 침범 방지
    if (
        x < exitGate.x + exitGate.w + 1 &&
        x + w > exitGate.x - 1 &&
        y + h > exitGate.y - 3
    ) {
        return false;
    }

    // 물 타일 위 건설 불가
    for (let ty = y; ty < y + h; ty++) {
        for (let tx = x; tx < x + w; tx++) {
            if (floorOverrides[`${tx},${ty}`] === 'water') return false;
        }
    }

    // 기존 시설과 1칸 여백 포함 충돌 검사 (자연스러운 통로 확보)
    for (const f of facilities) {
        if (ignoreFacilityId && (f.id === ignoreFacilityId || f.instanceId === ignoreFacilityId)) continue;
        if (x < f.tileX + f.tileW + 1 && x + w + 1 > f.tileX && y < f.tileY + f.tileH + 1 && y + h + 1 > f.tileY) {
            return false;
        }
    }

    return true;
};

export const generateBaseTilemap = (character: Character): BaseTilemapData => {
    const base = character.base;
    const baseLevel = Math.max(1, Math.min(5, base?.level || 1));
    const maxAllowed = BASE_MAX_MAP_SIZE_BY_LEVEL[baseLevel] || 40;
    const defaultSize = baseLevel === 1 ? 30 : Math.min(maxAllowed, 30 + (baseLevel - 1) * 15);
    const cols = Math.max(24, Math.min(200, base?.mapWidth || defaultSize));
    const rows = Math.max(24, Math.min(200, base?.mapHeight || defaultSize));
    const cx = Math.floor(cols / 2);

    const loc = base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const cultureKey = resolveCityCultureKey(loc.region, loc.nation, loc.city);
    const defaultPack = resolveBuildingPackKey(cultureKey);
    const buildingPackKey = base?.customBuildingPack || defaultPack;

    const exitGate = { x: cx - 1, y: rows - 1, w: 3, h: 1 };

    // 1. 기본 자연 도로/광장 + 사용자 customTiles 오버라이드 병합
    const floorOverrides: Record<string, BaseFloorTileId> = {};
    const hqEffectiveLv = Math.max(baseLevel, base?.underConstruction ? base.targetLevel || baseLevel : baseLevel);
    const hqFoot = getFacilityFootprint('hq', hqEffectiveLv);
    const hqX = Math.max(2, Math.min(cols - 2 - hqFoot.w, base?.hqPos?.x ?? cx - Math.floor(hqFoot.w / 2)));
    const hqY = Math.max(2, Math.min(rows - 4 - hqFoot.h, base?.hqPos?.y ?? 4));
    const hqDoorX = hqX + Math.floor(hqFoot.w / 2);
    const hqDoorY = hqY + hqFoot.h;

    // 초기 중앙 광장 & 남쪽 정문 연결 도로 (사용자가 customTiles로 언제든 덮어쓸 수 있음)
    for (let y = hqY + hqFoot.h - 1; y <= Math.min(rows - 3, hqY + hqFoot.h + 3); y++) {
        for (let x = Math.max(2, hqX - 1); x <= Math.min(cols - 3, hqX + hqFoot.w); x++) {
            floorOverrides[`${x},${y}`] = 'plaza';
        }
    }
    for (let y = hqDoorY; y < rows - 1; y++) {
        floorOverrides[`${cx},${y}`] = 'stone_road';
        if (cx - 1 >= 2) floorOverrides[`${cx - 1},${y}`] = 'stone_road';
    }
    // 가로 산책로 (본부 앞 광장 좌우)
    const crossRoadY = Math.min(rows - 5, hqDoorY + 2);
    for (let x = 4; x < cols - 4; x++) {
        floorOverrides[`${x},${crossRoadY}`] = 'dirt_road';
    }

    // 사용자 커스텀 타일 적용 (default이면 기본 잔디로 복원)
    if (base?.customTiles) {
        Object.entries(base.customTiles).forEach(([k, v]) => {
            if (v === 'default') {
                delete floorOverrides[k];
            } else {
                floorOverrides[k] = v as BaseFloorTileId;
            }
        });
    }

    const solidSet = new Set<string>();
    const solidGrid = new Uint8Array(cols * rows);
    const occGrid = new Uint8Array(cols * rows);
    const facTightGrid = new Uint8Array(cols * rows);
    const markSolid = (tx: number, ty: number) => {
        if (tx >= 0 && ty >= 0 && tx < cols && ty < rows) {
            solidGrid[ty * cols + tx] = 1;
            solidSet.add(`${tx},${ty}`);
        }
    };
    const markFacilityOcc = (fx: number, fy: number, fw: number, fh: number) => {
        const x0 = Math.max(0, fx - 1);
        const y0 = Math.max(0, fy - 1);
        const x1 = Math.min(cols - 1, fx + fw);
        const y1 = Math.min(rows - 1, fy + fh);
        for (let ty = y0; ty <= y1; ty++) {
            const rowOff = ty * cols;
            for (let tx = x0; tx <= x1; tx++) {
                occGrid[rowOff + tx] = 1;
            }
        }
        const tx0 = Math.max(0, fx);
        const ty0 = Math.max(0, fy);
        const tx1 = Math.min(cols - 1, fx + fw - 1);
        const ty1 = Math.min(rows - 1, fy + fh - 1);
        for (let ty = ty0; ty <= ty1; ty++) {
            const rowOff = ty * cols;
            for (let tx = tx0; tx <= tx1; tx++) {
                facTightGrid[rowOff + tx] = 1;
            }
        }
    };

    // 외곽 성벽 충돌
    for (let x = 0; x < cols; x++) {
        markSolid(x, 0);
        if (x < exitGate.x || x >= exitGate.x + exitGate.w) {
            markSolid(x, rows - 1);
        }
    }
    for (let y = 0; y < rows; y++) {
        markSolid(0, y);
        markSolid(cols - 1, y);
    }
    // 물 타일 충돌 및 시설 배치 금지
    Object.entries(floorOverrides).forEach(([k, v]) => {
        const isWater = v === 'water';
        const isSolidFloor = Boolean(FLOOR_TILE_MAP[v]?.solid);
        if (!isWater && !isSolidFloor) return;
        const comma = k.indexOf(',');
        if (comma <= 0) return;
        const tx = Number(k.slice(0, comma));
        const ty = Number(k.slice(comma + 1));
        if (tx >= 0 && ty >= 0 && tx < cols && ty < rows) {
            if (isSolidFloor) {
                solidGrid[ty * cols + tx] = 1;
                solidSet.add(k);
            }
            if (isWater) {
                occGrid[ty * cols + tx] = 1;
                facTightGrid[ty * cols + tx] = 1;
            }
        }
    });

    // 2. 기지 본부(HQ) 배치
    const facilities: BaseFacilityNode[] = [
        {
            id: 'base_hq',
            facilityType: 'hq',
            label: `기지 본부 (Lv.${baseLevel})`,
            subLabel: '증축 · 외형 개축 · 기지 통합 관리',
            level: baseLevel,
            tileX: hqX,
            tileY: hqY,
            tileW: hqFoot.w,
            tileH: hqFoot.h,
            doorX: hqDoorX,
            doorY: hqDoorY,
            underConstruction: Boolean(base?.underConstruction || base?.exteriorRemodelUnderConstruction),
            completionText: base?.underConstruction
                ? `Lv.${base.targetLevel || baseLevel + 1} 증축 중`
                : base?.exteriorRemodelUnderConstruction
                ? '외형 개축 공사 중'
                : undefined,
            spriteUrl: getBaseBuildingSpriteUrl(buildingPackKey, baseLevel),
            constructionSpriteUrl: getConstructionSpriteUrl('hq'),
            iconText: '🏰',
            accentColor: '#f59e0b',
            isHq: true,
            assignedNames: []
        }
    ];
    for (let y = hqY; y < hqY + hqFoot.h; y++) {
        for (let x = hqX; x < hqX + hqFoot.w; x++) {
            markSolid(x, y);
        }
    }
    solidSet.delete(`${hqDoorX},${hqY + hqFoot.h - 1}`);
    if (hqDoorX >= 0 && hqDoorX < cols && hqY + hqFoot.h - 1 >= 0 && hqY + hqFoot.h - 1 < rows) {
        solidGrid[(hqY + hqFoot.h - 1) * cols + hqDoorX] = 0;
    }
    markFacilityOcc(hqX, hqY, hqFoot.w, hqFoot.h);

    // 담당자 조회 헬퍼 (O(1) Map 인덱스, null/undefined 안전 가드)
    const compById = new Map<string, Companion>();
    const addCompToIndex = (list?: (Companion | null | undefined)[]) => {
        if (!Array.isArray(list)) return;
        for (const c of list) {
            if (c && c.id && !compById.has(c.id)) {
                compById.set(c.id, c);
            }
        }
    };
    addCompToIndex(character.inactiveCompanions);
    addCompToIndex(character.companions);
    const getAssignedCompsForInstance = (inst: FacilityInstance): Companion[] => {
        const result: Companion[] = [];
        const seen = new Set<string>();
        const pushId = (id?: string) => {
            if (!id || seen.has(id)) return;
            const c = compById.get(id);
            if (c) {
                seen.add(id);
                result.push(c);
            }
        };
        if (base?.assignments) {
            pushId(base.assignments[inst.id]);
            pushId(base.assignments[inst.type]);
        }
        if (base?.multiAssignments) {
            (base.multiAssignments[inst.id] || []).forEach(pushId);
            (base.multiAssignments[inst.type] || []).forEach(pushId);
        }
        return result;
    };

    // 3. 기존 시설들 자유 좌표 배치 (freeX/freeY가 있으면 그대로, 없으면 점유 그리드 기반 고속 자동 배치)
    const layoutList = (base?.layout || []).filter(inst => inst && inst.type);
    const assignedCompLocation = new Map<string, { px: number; py: number; bubble: string; facLabel: string }>();
    let monsterPenBounds: { minPx: number; maxPx: number; minPy: number; maxPy: number } | null = null;

    const canPlaceOnGrid = (grid: Uint8Array, x: number, y: number, w: number, h: number): boolean => {
        if (x < 2 || y < 2 || x + w > cols - 2 || y + h > rows - 3) return false;
        if (x < exitGate.x + exitGate.w + 1 && x + w > exitGate.x - 1 && y + h > exitGate.y - 3) return false;
        for (let ty = y; ty < y + h; ty++) {
            const rowOff = ty * cols;
            for (let tx = x; tx < x + w; tx++) {
                if (grid[rowOff + tx] !== 0) return false;
            }
        }
        return true;
    };

    const findNaturalFreePos = (w: number, h: number, seedIdx: number): { x: number; y: number } => {
        const baseAnchorY = Math.min(rows - h - 4, hqDoorY + 4);
        const maxRadius = Math.max(cols, rows);
        for (let radius = 0; radius < maxRadius; radius += 2) {
            const angleSteps = Math.max(8, Math.min(64, radius * 2));
            for (let s = 0; s < angleSteps; s++) {
                const ang = ((s + (seedIdx % 5)) / angleSteps) * Math.PI * 2;
                const candX = Math.round(cx - w / 2 + Math.cos(ang) * (radius + 4));
                const candY = Math.round(baseAnchorY + Math.sin(ang) * (radius * 0.8 + 2));
                if (canPlaceOnGrid(occGrid, candX, candY, w, h)) {
                    return { x: candX, y: candY };
                }
            }
        }
        // 전체 맵 1칸 정밀 스캔 (O(cols * rows) 최악 시간)
        for (let ty = 2; ty <= rows - h - 3; ty++) {
            for (let tx = 2; tx <= cols - w - 2; tx++) {
                if (canPlaceOnGrid(occGrid, tx, ty, w, h)) {
                    return { x: tx, y: ty };
                }
            }
        }
        // 여백 없이 밀착 가능한 빈 공간 스캔
        for (let ty = 2; ty <= rows - h - 3; ty++) {
            for (let tx = 2; tx <= cols - w - 2; tx++) {
                if (canPlaceOnGrid(facTightGrid, tx, ty, w, h)) {
                    return { x: tx, y: ty };
                }
            }
        }
        // 맵이 완전히 가득 찬 경우에도 (3,3) 중첩 대신 분산 배치
        const spanX = Math.max(1, cols - w - 4);
        const spanY = Math.max(1, rows - h - 5);
        return {
            x: 2 + ((seedIdx * 5) % spanX),
            y: 2 + ((Math.floor(seedIdx / 8) * 5) % spanY)
        };
    };

    const facInfoById = new Map(FACILITIES_INFO.map(f => [f.id, f]));

    layoutList.forEach((inst, idx) => {
        const effectiveLv = Math.max(1, inst.underConstruction ? inst.targetLevel || inst.level || 1 : inst.level || 1);
        const foot = getFacilityFootprint(inst.type, effectiveLv);
        let tileX = inst.freeX;
        let tileY = inst.freeY;
        if (
            typeof tileX !== 'number' ||
            typeof tileY !== 'number' ||
            tileX < 2 ||
            tileY < 2 ||
            tileX + foot.w > cols - 2 ||
            tileY + foot.h > rows - 3
        ) {
            const autoPos = findNaturalFreePos(foot.w, foot.h, idx);
            tileX = autoPos.x;
            tileY = autoPos.y;
        }
        markFacilityOcc(tileX, tileY, foot.w, foot.h);

        const facInfo = facInfoById.get(inst.type);
        const meta = FACILITY_VISUAL_META[inst.type] || { icon: '🏛️', color: '#94a3b8', activity: '⚙️ 시설 근무 중' };
        const isPersonalHome = inst.type === 'home' || inst.type === 'my_home';
        const isMonsterPen = inst.type === 'monster_farm' || inst.type === 'monster_ranch';
        const isFarm = inst.type === 'farm';

        if (!isMonsterPen && !isFarm) {
            for (let ty = tileY; ty < tileY + foot.h; ty++) {
                for (let tx = tileX; tx < tileX + foot.w; tx++) {
                    markSolid(tx, ty);
                }
            }
        }

        const assignedComps = getAssignedCompsForInstance(inst);
        const spriteUrl = isPersonalHome
            ? getHousingBuildingUrl(cultureKey, resolveHousingPartForInstance(character, inst))
            : getBaseFacilityLevelSpriteUrl(inst.type, Math.max(1, inst.level || 1));
        const constructionSizeKind: 'small' | 'medium' | 'large' =
            foot.w >= 5 ? 'large' : foot.w >= 3 ? 'medium' : 'small';
        const remainingCheck =
            inst.underConstruction && inst.constructionCompletionDate && inst.constructionCompletionTime
                ? getConstructionRemainingTime(
                      character.currentDate || '2000-03-02',
                      character.currentTime || '08:00',
                      inst.constructionCompletionDate,
                      inst.constructionCompletionTime
                  )
                : null;

        const doorX = tileX + Math.floor(foot.w / 2);
        const doorY = tileY + foot.h;

        const node: BaseFacilityNode = {
            id: `fac_${inst.id}`,
            instanceId: inst.id,
            facilityType: inst.type,
            label: facInfo?.name || inst.type,
            subLabel: inst.underConstruction
                ? `Lv.${inst.targetLevel || (inst.level || 0) + 1} 공사 중`
                : `Lv.${inst.level || 1}${assignedComps.length > 0 ? ` · 담당 ${assignedComps.length}명` : ''}`,
            level: inst.level || 1,
            tileX,
            tileY,
            tileW: foot.w,
            tileH: foot.h,
            doorX,
            doorY,
            underConstruction: Boolean(inst.underConstruction),
            completionText: inst.underConstruction
                ? remainingCheck && !remainingCheck.isCompleted
                    ? remainingCheck.text
                    : '공사 중'
                : undefined,
            spriteUrl,
            constructionSpriteUrl: getConstructionSpriteUrl(constructionSizeKind),
            iconText: meta.icon,
            accentColor: meta.color,
            isMonsterPen,
            isFarm,
            assignedNames: assignedComps.map(c => c.name)
        };
        facilities.push(node);

        if (isMonsterPen && !monsterPenBounds) {
            monsterPenBounds = {
                minPx: (tileX + 0.45) * BASE_TILE_SIZE,
                maxPx: (tileX + foot.w - 0.45) * BASE_TILE_SIZE,
                minPy: (tileY + 0.45) * BASE_TILE_SIZE,
                maxPy: (tileY + foot.h - 0.45) * BASE_TILE_SIZE
            };
        }

        assignedComps.forEach((comp, cIdx) => {
            if (!assignedCompLocation.has(comp.id)) {
                assignedCompLocation.set(comp.id, {
                    px: (tileX + 0.6 + (cIdx % Math.max(1, foot.w - 1)) * 0.95) * BASE_TILE_SIZE,
                    py: (doorY + 0.35) * BASE_TILE_SIZE,
                    bubble: meta.activity,
                    facLabel: node.label
                });
            }
        });
    });

    // 4. 조경 소품 배치
    const decorations: BaseDecorationItem[] = (base?.decorations || []).filter(
        d => d && d.x >= 1 && d.y >= 1 && d.x < cols - 1 && d.y < rows - 1
    );
    decorations.forEach(d => {
        if (d.solid) markSolid(d.x, d.y);
    });

    // 5. 기지 거주민 & 시설 담당자 전원 라이브 스폰 (제한 없음)
    const residents: BaseResidentEntity[] = [];
    const isMonsterComp = (c: Companion) =>
        Boolean(
            c.isMonster ||
                (c as any).isCustomMonster ||
                c.monsterData ||
                c.race === '몬스터' ||
                (typeof c.race === 'string' && c.race.includes('Monster'))
        );

    const allInactiveLiving = (character.inactiveCompanions || []).filter(c => c && !c.isDead);
    const humanResidents = allInactiveLiving.filter(c => !isMonsterComp(c));

    const residentSeenIds = new Set(humanResidents.map(c => c.id));
    (character.companions || []).forEach(c => {
        if (c && !c.isDead && !isMonsterComp(c) && assignedCompLocation.has(c.id) && !residentSeenIds.has(c.id)) {
            residentSeenIds.add(c.id);
            humanResidents.push(c);
        }
    });

    const timeOfDay = getTimeOfDay(character.currentTime || '12:00');
    const parsedHour = parseInt(String(character.currentTime || '12:00').split(':')[0], 10);
    const curHour = Number.isNaN(parsedHour) ? 12 : parsedHour;
    const isRestHours = curHour >= 18 || curHour < 9;
    const houseAssigns = character.base?.houseAssignments || {};
    const hasHouseAssigns = Object.keys(houseAssigns).length > 0;
    const housingNodes = facilities.filter(f => f.facilityType === 'housing' || f.facilityType === 'home' || f.facilityType === 'my_home');
    const roamAnchors: { x: number; y: number }[] = [
        ...housingNodes.map(h => ({ x: h.doorX + 0.5, y: h.doorY + 0.5 })),
        ...facilities.map(f => ({ x: f.doorX + 0.5, y: f.doorY + 0.5 })),
        { x: cx - 3, y: hqDoorY + 1 },
        { x: cx + 3, y: hqDoorY + 1 },
        { x: cx, y: Math.min(rows - 4, hqDoorY + 4) }
    ];

    // O(1) 루틴 작업장 조회 맵 사전 인덱싱 (npcRoutineService.getCompanionAssignmentName 동일 규칙)
    const assignmentNameByCompId = new Map<string, string>();
    const layoutTypeById = new Map<string, string>();
    for (const inst of layoutList) {
        if (inst.id) layoutTypeById.set(inst.id, inst.type);
    }
    if (base?.dispatched) {
        for (const m of base.dispatched) {
            if (!m) continue;
            const dest = m.destination?.city || m.destination?.nation || '외곽';
            const type = m.missionType || '';
            const label =
                type === 'PersonalLeave' ? '개인 휴가' :
                type === 'RecruitTravel' ? '동료 영입 여정' :
                type === 'WarInvasion' ? `전쟁 침공 파견 (${dest})` :
                type === 'TempleProtection' ? `신전 수호 파견 (${dest})` :
                type === 'Patrol' ? `군대 순찰 (${dest})` :
                type === 'Suppression' ? `군대 토벌 (${dest})` :
                type === 'Infiltration' ? `군대 잠입 (${dest})` :
                type === 'Escort' ? `군대 호위 (${dest})` :
                type === 'ScoutDispatch' ? `스카우트 파견 (${dest})` :
                type === 'Expedition' ? `원정대 파견 (${dest})` :
                `파견 근무 (${dest})`;
            if (m.companionId && !assignmentNameByCompId.has(m.companionId)) {
                assignmentNameByCompId.set(m.companionId, label);
            }
            const parts = (m as any).participants;
            if (Array.isArray(parts)) {
                for (const pid of parts) {
                    if (pid && !assignmentNameByCompId.has(pid)) {
                        assignmentNameByCompId.set(pid, label);
                    }
                }
            }
        }
    }
    if (character.mercenaryData?.groupMissions) {
        for (const m of character.mercenaryData.groupMissions) {
            if (!m || !Array.isArray(m.memberIds)) continue;
            const label = `용병단 의뢰 (${m.title || '단체 의뢰'})`;
            for (const mid of m.memberIds) {
                if (mid && !assignmentNameByCompId.has(mid)) {
                    assignmentNameByCompId.set(mid, label);
                }
            }
        }
    }
    if (base?.assignments) {
        const singleFacLabel = (key: string, facType: string): string => {
            if (key.startsWith('temple_protection_')) return `${key.replace('temple_protection_', '')} 수호 기사`;
            if (facType === 'farm') return '농장';
            if (facType === 'mine') return '광산';
            if (facType === 'training_exp') return '경험 훈련소';
            if (facType === 'training_stat') return '스탯 훈련소';
            if (facType === 'training_mastery') return '무기숙련 훈련장';
            if (facType === 'training_style') return '전투스타일 훈련소';
            if (facType === 'tactical_training') return '전술 훈련소';
            if (facType === 'combat_training') return '전투 훈련소';
            if (facType === 'sparring_arena') return '모의 대련장';
            if (facType === 'training') return '훈련소';
            if (facType === 'blacksmith' || facType === 'workshop') return '대장간';
            if (facType === 'alchemy') return '연금술실';
            if (facType === 'lab') return '연구소';
            if (facType === 'monster_farm') return '몬스터 사육소';
            if (facType === 'child_academy') return '유년 서당';
            if (facType === 'monster_arena') return '몬스터 수련 투기장';
            if (facType === 'cooking') return '요리 시설';
            if (facType === 'dispatch') return '파견소';
            if (facType === 'housing') return '숙소';
            if (facType === 'storage') return '창고';
            if (facType === 'defense') return '기지 방어소';
            if (facType === 'back_alley') return '뒷골목';
            if (facType === 'club') return '클럽';
            if (facType === 'trade_exchange') return '물자 교류소';
            return '기지 시설';
        };
        for (const [key, v] of Object.entries(base.assignments)) {
            if (v && !assignmentNameByCompId.has(v)) {
                const facType = layoutTypeById.get(key) || key;
                assignmentNameByCompId.set(v, singleFacLabel(key, facType));
            }
        }
    }
    if (base?.multiAssignments) {
        const multiFacLabel = (facType: string): string => {
            if (facType.startsWith('farm')) return '농장';
            if (facType.startsWith('mine')) return '광산';
            if (facType.startsWith('blacksmith') || facType.startsWith('workshop')) return '제작소/대장간';
            if (facType.startsWith('alchemy')) return '연금술실';
            if (facType.startsWith('cooking')) return '요리 시설';
            if (facType.startsWith('monster_farm')) return '사육소';
            if (facType.startsWith('lab')) return '연구소';
            if (facType.startsWith('training')) return '훈련소';
            if (facType.startsWith('housing') || facType === 'housing') return '숙소';
            return '기지 시설';
        };
        for (const [facilityId, idList] of Object.entries(base.multiAssignments)) {
            if (!Array.isArray(idList)) continue;
            const facType = layoutTypeById.get(facilityId) || facilityId;
            const label = multiFacLabel(facType);
            for (const cid of idList) {
                if (cid && !assignmentNameByCompId.has(cid)) {
                    assignmentNameByCompId.set(cid, label);
                }
            }
        }
    }
    if (base?.combatTraining) {
        for (const cTraining of Object.values(base.combatTraining)) {
            if (!cTraining?.trainees) continue;
            for (const t of cTraining.trainees) {
                if (t?.companionId && !assignmentNameByCompId.has(t.companionId)) {
                    assignmentNameByCompId.set(t.companionId, '전투 훈련소 수련장');
                }
            }
        }
    }

    const getIndexedRoutineActivity = (compId: string): string => {
        if (curHour >= 22 || curHour < 8) return '숙소에서 취침 중인 상태';
        if (curHour >= 8 && curHour < 12) return '기지 식당에서 식사 및 담소';
        const assignment = assignmentNameByCompId.get(compId);
        const workplace = assignment || '기지 수련장';
        const isLabor = assignment ? '노동 및 수련' : '자유 훈련 및 휴식';
        return `${workplace}에서 ${isLabor}`;
    };

    const ensureNonSolidPos = (px: number, py: number): { px: number; py: number } => {
        const tx = Math.max(1, Math.min(cols - 2, Math.floor(px / BASE_TILE_SIZE)));
        const ty = Math.max(1, Math.min(rows - 2, Math.floor(py / BASE_TILE_SIZE)));
        if (solidGrid[ty * cols + tx] === 0) return { px, py };
        for (let r = 1; r <= 6; r++) {
            for (let dy = -r; dy <= r; dy++) {
                const ny = ty + dy;
                if (ny < 1 || ny >= rows - 1) continue;
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const nx = tx + dx;
                    if (nx < 1 || nx >= cols - 1) continue;
                    if (solidGrid[ny * cols + nx] === 0) {
                        return {
                            px: (nx + 0.5) * BASE_TILE_SIZE,
                            py: (ny + 0.5) * BASE_TILE_SIZE
                        };
                    }
                }
            }
        }
        return {
            px: (cx + 0.5) * BASE_TILE_SIZE,
            py: (Math.min(rows - 3, hqDoorY + 1) + 0.5) * BASE_TILE_SIZE
        };
    };

    humanResidents.forEach((comp, idx) => {
        const assignedLoc = assignedCompLocation.get(comp.id);
        const isGuardOrMilitary =
            assignedLoc &&
            (assignedLoc.facLabel.includes('경비') ||
                assignedLoc.facLabel.includes('병영') ||
                assignedLoc.facLabel.includes('감시') ||
                assignedLoc.facLabel.includes('방어'));
        // 활동 시간대(!isRestHours)에는 시설 담당자가 해당 시설 내부에만 머무르도록 기지 외부 마당 스폰에서 제외 (경비/방어 초소 제외)
        if (!isRestHours && assignedLoc && !isGuardOrMilitary) {
            return;
        }
        // 휴식/수면 시간대(18:00~08:59)에는 숙소에 귀가한 거주민은 기지 밖 마당에 보이지 않음 (경비·초소 근무 등 일부만 외부에 남음)
        if (isRestHours && housingNodes.length > 0 && !isGuardOrMilitary) {
            const hasAssignedHouse = Boolean(houseAssigns[comp.id]);
            const unmappedResidentInHouse = !hasHouseAssigns && idx % 3 !== 0;
            if (hasAssignedHouse || unmappedResidentInHouse) {
                return;
            }
        }
        const anchor = roamAnchors[idx % roamAnchors.length];
        const ringOffset = Math.floor(idx / roamAnchors.length);
        const jitterAngle = (idx * 137.5 * Math.PI) / 180;
        const jitterR = Math.min(2.2, 0.4 + ringOffset * 0.45);

        let homePx = Math.max(
            BASE_TILE_SIZE * 2,
            Math.min((cols - 2) * BASE_TILE_SIZE, (anchor.x + Math.cos(jitterAngle) * jitterR) * BASE_TILE_SIZE)
        );
        let homePy = Math.max(
            BASE_TILE_SIZE * 2.5,
            Math.min((rows - 2.5) * BASE_TILE_SIZE, (anchor.y + Math.sin(jitterAngle) * jitterR) * BASE_TILE_SIZE)
        );
        const isBaseNight = timeOfDay.period === 'night' || timeOfDay.period === 'dawn';
        let activityBubble = isBaseNight ? '🌙 밤 산책 중' : '☀️ 영지 생활 중';
        let assignedFacilityLabel: string | undefined;

        if (assignedLoc) {
            homePx = assignedLoc.px;
            homePy = assignedLoc.py;
            activityBubble = assignedLoc.bubble;
            assignedFacilityLabel = assignedLoc.facLabel;
        } else if (housingNodes.length > 0 && isBaseNight) {
            const hNode = housingNodes[idx % housingNodes.length];
            homePx = (hNode.doorX + ((idx % 3) - 1) * 0.65) * BASE_TILE_SIZE;
            homePy = (hNode.doorY + 0.45) * BASE_TILE_SIZE;
            activityBubble = '💤 숙소 휴식 중';
        } else {
            activityBubble = getIndexedRoutineActivity(comp.id);
        }

        const safePos = ensureNonSolidPos(homePx, homePy);
        homePx = safePos.px;
        homePy = safePos.py;

        const spriteUrl = resolveEntityRpgSprite(comp as any, loc.region, loc.nation).url;
        residents.push({
            id: comp.id,
            name: comp.name,
            role: assignedFacilityLabel ? `${assignedFacilityLabel} 담당` : comp.job || '기지 거주민',
            activityBubble,
            spriteUrl,
            px: homePx,
            py: homePy,
            homePx,
            homePy,
            dir: 'down',
            walkFrame: 1,
            animTimer: 0,
            wanderTimer: 1.5 + (idx % 4) * 0.8,
            targetPx: null,
            targetPy: null,
            companionRef: comp,
            assignedFacilityLabel
        });
    });

    // 5-1. Lv.500+ & 라스트 클래스 이상 시 기지 방문 NPC '차원 현자 아스트라' 스폰
    if (hasDimensionalLeapEligible(character)) {
        const learnedLeap = hasDimensionalLeapSkill(character);
        const sageSafe = ensureNonSolidPos(
            (cx + 2 + 0.5) * BASE_TILE_SIZE,
            (Math.max(hqDoorY + 1, rows - 3) - 1 + 0.5) * BASE_TILE_SIZE
        );
        const sagePx = sageSafe.px;
        const sagePy = sageSafe.py;
        const sageSpriteUrl = resolveEntityRpgSprite({ name: '차원 현자 아스트라', gender: '여성', role: '차원도약 전수자' } as any, '신계', loc.nation).url;
        residents.push({
            id: 'npc_dimensional_sage',
            name: '차원 현자 아스트라',
            role: '차원도약 전수자',
            activityBubble: learnedLeap ? '🌀 차원의 길이 열려 있소' : '✨ 차원 도약 비기 전수 가능!',
            spriteUrl: sageSpriteUrl,
            px: sagePx,
            py: sagePy,
            homePx: sagePx,
            homePy: sagePy,
            dir: 'down',
            walkFrame: 1,
            animTimer: 0,
            wanderTimer: 2.5,
            targetPx: null,
            targetPy: null,
            companionRef: {
                id: 'npc_dimensional_sage',
                name: '차원 현자 아스트라',
                gender: '여성',
                race: '신족',
                job: '차원 현자' as any,
                level: 999,
                affection: 100
            } as any
        });
    }

    // 6. 기지 밖(마당)에는 사육 몬스터를 표시하지 않고, 몬스터 사육소 내부 맵에서만 스폰
    const farmMonsters: BaseFarmMonsterEntity[] = [];

    return {
        cols,
        rows,
        baseLevel,
        cultureKey,
        buildingPackKey,
        floorOverrides,
        solidSet,
        solidGrid,
        facilities,
        decorations,
        residents,
        farmMonsters,
        spawnPos: { x: cx, y: Math.max(hqDoorY + 1, rows - 3) },
        exitGate
    };
};

export interface FacilityLevelUpSpaceValidation {
    ok: boolean;
    facilityName: string;
    instanceId?: string;
    curLevel: number;
    nextLevel: number;
    curW: number;
    curH: number;
    nextW: number;
    nextH: number;
    tileX: number;
    tileY: number;
    reason?: string;
}

export const validateFacilityLevelUpSpaceFromMapData = (
    mapData: BaseTilemapData,
    facilityOrInstanceId: string
): FacilityLevelUpSpaceValidation => {
    const isHq = facilityOrInstanceId === 'hq' || facilityOrInstanceId === 'base_hq';
    const targetNode = isHq
        ? mapData.facilities.find(f => f.isHq)
        : mapData.facilities.find(
              f => f.instanceId === facilityOrInstanceId || f.id === facilityOrInstanceId || f.facilityType === facilityOrInstanceId
          );

    if (!targetNode) {
        return {
            ok: true,
            facilityName: facilityOrInstanceId,
            curLevel: 1,
            nextLevel: 2,
            curW: 3,
            curH: 3,
            nextW: 4,
            nextH: 4,
            tileX: 0,
            tileY: 0
        };
    }

    const curLevel = Math.max(1, targetNode.level || 1);
    const nextLevel = curLevel + 1;
    const curFoot = getFacilityFootprint(targetNode.facilityType, curLevel);
    const nextFoot = getFacilityFootprint(targetNode.facilityType, nextLevel);
    const { tileX, tileY } = targetNode;
    const { w: nextW, h: nextH } = nextFoot;

    if (tileX < 2 || tileY < 2 || tileX + nextW > mapData.cols - 2 || tileY + nextH > mapData.rows - 3) {
        return {
            ok: false,
            facilityName: targetNode.label,
            instanceId: targetNode.instanceId,
            curLevel,
            nextLevel,
            curW: curFoot.w,
            curH: curFoot.h,
            nextW,
            nextH,
            tileX,
            tileY,
            reason: `레벨업 시 시설 크기가 ${curFoot.w}×${curFoot.h}에서 ${nextW}×${nextH} 타일로 넓어져 외곽 성벽 경계를 벗어납니다. [🚚 시설 이동]으로 안쪽 넓은 공간으로 옮기거나 기지 부지를 확장해 주세요.`
        };
    }

    if (
        tileX < mapData.exitGate.x + mapData.exitGate.w + 1 &&
        tileX + nextW > mapData.exitGate.x - 1 &&
        tileY + nextH > mapData.exitGate.y - 3
    ) {
        return {
            ok: false,
            facilityName: targetNode.label,
            instanceId: targetNode.instanceId,
            curLevel,
            nextLevel,
            curW: curFoot.w,
            curH: curFoot.h,
            nextW,
            nextH,
            tileX,
            tileY,
            reason: `레벨업 시 시설 크기가 ${nextW}×${nextH} 타일로 넓어져 남쪽 정문 출입로를 막게 됩니다. [🚚 시설 이동]으로 위치를 옮겨 주세요.`
        };
    }

    for (let ty = tileY; ty < tileY + nextH; ty++) {
        for (let tx = tileX; tx < tileX + nextW; tx++) {
            if (mapData.floorOverrides[`${tx},${ty}`] === 'water') {
                return {
                    ok: false,
                    facilityName: targetNode.label,
                    instanceId: targetNode.instanceId,
                    curLevel,
                    nextLevel,
                    curW: curFoot.w,
                    curH: curFoot.h,
                    nextW,
                    nextH,
                    tileX,
                    tileY,
                    reason: `레벨업 확장 구역(${tx},${ty})에 연못/수로 타일이 있어 증축할 수 없습니다. 바닥 타일을 변경하거나 시설을 이동해 주세요.`
                };
            }
        }
    }

    for (const f of mapData.facilities) {
        if (f.id === targetNode.id || (targetNode.instanceId && f.instanceId === targetNode.instanceId)) continue;
        if (
            tileX < f.tileX + f.tileW + 1 &&
            tileX + nextW + 1 > f.tileX &&
            tileY < f.tileY + f.tileH + 1 &&
            tileY + nextH + 1 > f.tileY
        ) {
            return {
                ok: false,
                facilityName: targetNode.label,
                instanceId: targetNode.instanceId,
                curLevel,
                nextLevel,
                curW: curFoot.w,
                curH: curFoot.h,
                nextW,
                nextH,
                tileX,
                tileY,
                reason: `레벨업 시 크기가 ${curFoot.w}×${curFoot.h} → ${nextW}×${nextH} 타일로 1×1 증가하며 인접한 [${f.label}] 시설과 겹치게 됩니다. 먼저 주변 시설을 [🚚 시설 이동]으로 옮겨 공간을 확보해 주세요!`
            };
        }
    }

    const blockingDeco = mapData.decorations.find(
        d => d.x >= tileX && d.x < tileX + nextW && d.y >= tileY && d.y < tileY + nextH
    );
    if (blockingDeco) {
        return {
            ok: false,
            facilityName: targetNode.label,
            instanceId: targetNode.instanceId,
            curLevel,
            nextLevel,
            curW: curFoot.w,
            curH: curFoot.h,
            nextW,
            nextH,
            tileX,
            tileY,
            reason: `레벨업 확장 구역(${blockingDeco.x},${blockingDeco.y})에 조경 소품(${blockingDeco.label})이 놓여 있습니다. [🌳 조경 꾸미기]에서 해당 소품을 철거하거나 시설을 이동해 주세요.`
        };
    }

    return {
        ok: true,
        facilityName: targetNode.label,
        instanceId: targetNode.instanceId,
        curLevel,
        nextLevel,
        curW: curFoot.w,
        curH: curFoot.h,
        nextW,
        nextH,
        tileX,
        tileY
    };
};

/**
 * 시설(또는 기지 본부 HQ)을 다음 레벨로 증축할 때 타일 면적이 +1×+1 증가하므로,
 * 현재 위치(tileX, tileY) 기준으로 주변 공간에 다른 시설·물 타일·조경물·성벽 침범이 없는지 검증합니다.
 */
export const validateFacilityLevelUpSpace = (
    character: Character,
    facilityOrInstanceId: string
): FacilityLevelUpSpaceValidation => {
    const mapData = generateBaseTilemap(character);
    return validateFacilityLevelUpSpaceFromMapData(mapData, facilityOrInstanceId);
};
