import { Character, Companion, CapturedMonster, FacilityInstance } from '../types';
import { FACILITIES_INFO } from '../constants';
import {
    CityCultureKey,
    getBaseBuildingSpriteUrl,
    getHousingBuildingUrl,
    HousingBuildingPart,
    resolveBuildingPackKey,
    resolveCityCultureKey
} from './cityAssetManifest';
import { resolveEntityRpgSprite, SpriteDirection } from './rpgSpriteManifest';
import { getCompanionRoutine } from './npcRoutineService';
import { getTimeOfDay } from './gameTimeService';

export const BASE_TILE_SIZE = 48;

export type BaseTileType =
    | 'grass'
    | 'road'
    | 'plaza'
    | 'wall'
    | 'water'
    | 'farm_soil'
    | 'pasture'
    | 'slot_empty'
    | 'building'
    | 'gate';

export interface BaseFacilityNode {
    id: string;
    instanceId?: string;
    facilityType: string;
    label: string;
    subLabel: string;
    level: number;
    gridX: number; // 논리 격자 X (0..gridSize-1), 본부는 -1
    gridY: number; // 논리 격자 Y (0..gridSize-1), 본부는 -1
    tileX: number;
    tileY: number;
    tileW: number;
    tileH: number;
    doorX: number;
    doorY: number;
    underConstruction: boolean;
    completionText?: string;
    spriteUrl?: string;
    iconText: string;
    accentColor: string;
    isHq?: boolean;
    isMonsterPen?: boolean;
    assignedNames: string[];
}

export interface BaseEmptySlotNode {
    gridX: number;
    gridY: number;
    tileX: number;
    tileY: number;
    tileW: number;
    tileH: number;
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
    gridSize: number;
    cultureKey: CityCultureKey;
    buildingPackKey: string;
    tiles: BaseTileType[][];
    solid: boolean[][];
    facilities: BaseFacilityNode[];
    emptySlots: BaseEmptySlotNode[];
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
    // 해당 housing 인스턴스 또는 가장 높은 등급의 주택 타입을 매칭
    const matched = houses.find(h => h.id === inst.id) || houses[0];
    const hType = String(matched?.type || '').toLowerCase();
    if (hType.includes('luxury') || hType.includes('mansion') || hType.includes('고급')) return 'house_luxury';
    if (hType.includes('apartment') || hType.includes('아파트')) return 'house_apartment';
    if (hType.includes('villa') || hType.includes('빌라')) return 'house_villa';
    if (hType.includes('2f') || hType.includes('2층') || (inst.level || 1) >= 3) return 'house_2f';
    return 'house_1f';
};

export const generateBaseTilemap = (character: Character): BaseTilemapData => {
    const base = character.base;
    const gridSize = Math.max(7, Math.min(10, base?.gridSize || 7));
    const baseLevel = Math.max(1, Math.min(5, base?.level || 1));
    const loc = base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const cultureKey = resolveCityCultureKey(loc.region, loc.nation, loc.city);
    const defaultPack = resolveBuildingPackKey(cultureKey);
    const buildingPackKey = base?.customBuildingPack || defaultPack;

    // 각 논리 격자 슬롯 = 3x3 타일 블록 (1타일 통로 간격 포함 시 너무 커지므로 3x3 블록 내 2x2 건물 + 1타일 앞길)
    const CELL = 3;
    const marginX = 3;
    const hqHeight = 6; // 상단 기지 본부 및 광장 영역
    const southHeight = 4; // 남쪽 정문 및 출구 도로 영역

    const cols = marginX * 2 + gridSize * CELL;
    const rows = hqHeight + gridSize * CELL + southHeight;
    const cx = Math.floor(cols / 2);

    const tiles: BaseTileType[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 'grass' as BaseTileType)
    );
    const solid: boolean[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
    );

    // 1. 외곽 성벽
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

    // 2. 남쪽 정문 출구 (도시로 나가기)
    const exitGate = { x: cx - 1, y: rows - 1, w: 3, h: 1 };
    for (let gx = exitGate.x; gx < exitGate.x + exitGate.w; gx++) {
        tiles[rows - 1][gx] = 'gate';
        solid[rows - 1][gx] = false;
        tiles[rows - 2][gx] = 'road';
        tiles[rows - 3][gx] = 'road';
    }

    // 3. 상단 본부 앞 광장 + 중앙 종단 도로
    for (let y = 2; y <= hqHeight; y++) {
        for (let x = Math.max(2, cx - 4); x <= Math.min(cols - 3, cx + 4); x++) {
            tiles[y][x] = 'plaza';
        }
    }
    for (let y = hqHeight; y < rows - 1; y++) {
        tiles[y][cx] = 'road';
        if (cx - 1 >= 1) tiles[y][cx - 1] = 'road';
    }
    // 가로 순환 도로 (본부 바로 아래 & 남쪽 정문 바로 위)
    for (let x = 2; x < cols - 2; x++) {
        tiles[hqHeight][x] = 'road';
        tiles[rows - 3][x] = 'road';
    }

    // 4. 기지 본부(HQ) 배치
    const hqW = baseLevel >= 5 ? 5 : baseLevel >= 3 ? 4 : 3;
    const hqH = baseLevel >= 4 ? 3 : 2;
    const hqX = cx - Math.floor(hqW / 2);
    const hqY = 2;
    for (let y = hqY; y < hqY + hqH; y++) {
        for (let x = hqX; x < hqX + hqW; x++) {
            tiles[y][x] = 'building';
            solid[y][x] = true;
        }
    }
    solid[hqY + hqH - 1][cx] = false;

    const facilities: BaseFacilityNode[] = [
        {
            id: 'base_hq',
            facilityType: 'hq',
            label: `기지 본부 (Lv.${baseLevel})`,
            subLabel: '증축 · 외형 개축 · 기지 통합 관리',
            level: baseLevel,
            gridX: -1,
            gridY: -1,
            tileX: hqX,
            tileY: hqY,
            tileW: hqW,
            tileH: hqH,
            doorX: cx,
            doorY: hqY + hqH - 1,
            underConstruction: Boolean(base?.underConstruction || base?.exteriorRemodelUnderConstruction),
            completionText: base?.underConstruction
                ? `Lv.${base.targetLevel || baseLevel + 1} 증축 중`
                : base?.exteriorRemodelUnderConstruction
                ? '외형 개축 공사 중'
                : undefined,
            spriteUrl: getBaseBuildingSpriteUrl(buildingPackKey, baseLevel),
            iconText: '🏰',
            accentColor: '#f59e0b',
            isHq: true,
            assignedNames: []
        }
    ];

    // 담당자 맵 구성 (instanceId / facilityType -> Companion[])
    const allComps = [...(character.inactiveCompanions || []), ...(character.companions || [])];
    const findCompById = (id?: string) => allComps.find(c => c.id === id);

    const getAssignedCompsForInstance = (inst: FacilityInstance): Companion[] => {
        const result: Companion[] = [];
        const seen = new Set<string>();
        const pushId = (id?: string) => {
            if (!id || seen.has(id)) return;
            const c = findCompById(id);
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

    // 5. 기존 배치된 시설들(base.layout)을 2D 맵 격자에 배치
    const occupiedGrid = new Set<string>();
    const layoutList = (base?.layout || []).filter(inst => inst && inst.type);

    // 빈 슬롯에 자동 폴백 좌표를 부여할 헬퍼
    const claimGridPos = (prefX?: number, prefY?: number): { gx: number; gy: number } => {
        if (
            typeof prefX === 'number' &&
            typeof prefY === 'number' &&
            prefX >= 0 &&
            prefX < gridSize &&
            prefY >= 0 &&
            prefY < gridSize &&
            !occupiedGrid.has(`${prefX},${prefY}`)
        ) {
            occupiedGrid.add(`${prefX},${prefY}`);
            return { gx: prefX, gy: prefY };
        }
        for (let gy = 0; gy < gridSize; gy++) {
            for (let gx = 0; gx < gridSize; gx++) {
                if (!occupiedGrid.has(`${gx},${gy}`)) {
                    occupiedGrid.add(`${gx},${gy}`);
                    return { gx, gy };
                }
            }
        }
        return { gx: 0, gy: 0 };
    };

    const assignedCompLocation = new Map<string, { px: number; py: number; bubble: string; facLabel: string }>();
    let monsterPenBounds: { minPx: number; maxPx: number; minPy: number; maxPy: number } | null = null;

    layoutList.forEach(inst => {
        const { gx, gy } = claimGridPos(inst.x, inst.y);
        const tileX = marginX + gx * CELL;
        const tileY = hqHeight + 1 + gy * CELL;
        const facInfo = FACILITIES_INFO.find(f => f.id === inst.type);
        const meta = FACILITY_VISUAL_META[inst.type] || { icon: '🏛️', color: '#94a3b8', activity: '⚙️ 시설 근무 중' };
        const isHousing = inst.type === 'housing' || inst.type === 'home' || inst.type === 'my_home';
        const isMonsterPen = inst.type === 'monster_farm' || inst.type === 'monster_ranch';
        const isFarm = inst.type === 'farm';

        // 타일 채색 & 충돌 설정 (상단 2x2 건물, 하단 1행은 진입 통로)
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = tileX + dx;
                const ty = tileY + dy;
                if (ty < rows - 1 && tx < cols - 1) {
                    tiles[ty][tx] = isMonsterPen ? 'pasture' : isFarm ? 'farm_soil' : 'building';
                    solid[ty][tx] = !isMonsterPen && !isFarm;
                }
            }
        }
        // 앞쪽 통로 타일
        if (tileY + 2 < rows - 1) {
            tiles[tileY + 2][tileX] = 'road';
            tiles[tileY + 2][tileX + 1] = 'road';
        }

        const assignedComps = getAssignedCompsForInstance(inst);
        const spriteUrl = isHousing
            ? getHousingBuildingUrl(cultureKey, resolveHousingPartForInstance(character, inst))
            : undefined;

        const node: BaseFacilityNode = {
            id: `fac_${inst.id}`,
            instanceId: inst.id,
            facilityType: inst.type,
            label: facInfo?.name || inst.type,
            subLabel: inst.underConstruction
                ? '공사 진행 중'
                : `Lv.${inst.level || 1}${assignedComps.length > 0 ? ` · 담당 ${assignedComps.length}명` : ''}`,
            level: inst.level || 1,
            gridX: gx,
            gridY: gy,
            tileX,
            tileY,
            tileW: 2,
            tileH: 2,
            doorX: tileX + 1,
            doorY: tileY + 2,
            underConstruction: Boolean(inst.underConstruction),
            completionText: inst.underConstruction ? '공사 중' : undefined,
            spriteUrl,
            iconText: meta.icon,
            accentColor: meta.color,
            isMonsterPen,
            assignedNames: assignedComps.map(c => c.name)
        };
        facilities.push(node);

        // 몬스터 사육소 울타리 좌표 기록
        if (isMonsterPen && !monsterPenBounds) {
            monsterPenBounds = {
                minPx: (tileX + 0.3) * BASE_TILE_SIZE,
                maxPx: (tileX + 2.4) * BASE_TILE_SIZE,
                minPy: (tileY + 0.3) * BASE_TILE_SIZE,
                maxPy: (tileY + 2.1) * BASE_TILE_SIZE
            };
        }

        // 담당자 활동 위치 등록
        assignedComps.forEach((comp, idx) => {
            if (!assignedCompLocation.has(comp.id)) {
                assignedCompLocation.set(comp.id, {
                    px: (tileX + 0.6 + (idx % 2) * 1.1) * BASE_TILE_SIZE,
                    py: (tileY + 2.15) * BASE_TILE_SIZE,
                    bubble: meta.activity,
                    facLabel: node.label
                });
            }
        });
    });

    // 6. 빈 건설 슬롯 목록 생성 (건설 모드에서 하이라이트 & 클릭 건설 가능)
    const emptySlots: BaseEmptySlotNode[] = [];
    for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
            if (occupiedGrid.has(`${gx},${gy}`)) continue;
            const tileX = marginX + gx * CELL;
            const tileY = hqHeight + 1 + gy * CELL;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    if (tiles[tileY + dy]?.[tileX + dx] === 'grass') {
                        tiles[tileY + dy][tileX + dx] = 'slot_empty';
                    }
                }
            }
            emptySlots.push({ gridX: gx, gridY: gy, tileX, tileY, tileW: 2, tileH: 2 });
        }
    }

    // 7. 기지 거주민(inactiveCompanions) & 시설 담당자 라이브 NPC 스폰 (인원 제한 없이 전원 표시!)
    const residents: BaseResidentEntity[] = [];
    const isMonsterComp = (c: Companion) =>
        Boolean(c.isMonster || (c as any).isCustomMonster || c.monsterData || c.race === '몬스터' || (typeof c.race === 'string' && c.race.includes('Monster')));

    const allInactiveLiving = (character.inactiveCompanions || []).filter(c => c && !c.isDead);
    const humanResidents = allInactiveLiving.filter(c => !isMonsterComp(c));
    const monsterResidents = allInactiveLiving.filter(c => isMonsterComp(c));

    // 시설에 배치되어 있지만 현재 파티(companions)에도 있는 담당자까지 누락 없이 포함
    const residentSeenIds = new Set(humanResidents.map(c => c.id));
    (character.companions || []).forEach(c => {
        if (c && !c.isDead && !isMonsterComp(c) && assignedCompLocation.has(c.id) && !residentSeenIds.has(c.id)) {
            residentSeenIds.add(c.id);
            humanResidents.push(c);
        }
    });

    const timeOfDay = getTimeOfDay(character.currentTime || '12:00');
    const housingNodes = facilities.filter(f => f.facilityType === 'housing' || f.facilityType === 'home' || f.facilityType === 'my_home');
    // 미배치 거주민이 겹치지 않도록 기지 전역(주택 앞 · 중앙 광장 · 순환 도로)에 골고루 분산 배치
    const roamAnchors: { x: number; y: number }[] = [
        ...housingNodes.map(h => ({ x: h.doorX + 0.5, y: h.doorY + 0.35 })),
        { x: cx - 3, y: hqHeight + 0.3 },
        { x: cx - 1.5, y: hqHeight + 0.3 },
        { x: cx + 1.5, y: hqHeight + 0.3 },
        { x: cx + 3, y: hqHeight + 0.3 },
        { x: cx - 0.5, y: hqHeight + 2.5 },
        { x: cx + 0.5, y: hqHeight + 4.5 },
        { x: cx - 0.5, y: Math.max(hqHeight + 5, rows - 4) },
        { x: Math.max(3, cx - 5), y: rows - 3 },
        { x: Math.min(cols - 4, cx + 5), y: rows - 3 }
    ];

    humanResidents.forEach((comp, idx) => {
        const assignedLoc = assignedCompLocation.get(comp.id);
        const anchor = roamAnchors[idx % roamAnchors.length];
        const ringOffset = Math.floor(idx / roamAnchors.length);
        const jitterAngle = (idx * 137.5 * Math.PI) / 180;
        const jitterR = Math.min(1.4, 0.35 + ringOffset * 0.32);

        let homePx = Math.max(
            BASE_TILE_SIZE * 1.5,
            Math.min((cols - 1.5) * BASE_TILE_SIZE, (anchor.x + Math.cos(jitterAngle) * jitterR) * BASE_TILE_SIZE)
        );
        let homePy = Math.max(
            BASE_TILE_SIZE * 2.5,
            Math.min((rows - 2) * BASE_TILE_SIZE, (anchor.y + Math.sin(jitterAngle) * jitterR) * BASE_TILE_SIZE)
        );
        let activityBubble = timeOfDay === 'Night' ? '🌙 밤 산책 중' : '☀️ 기지 생활 중';
        let assignedFacilityLabel: string | undefined;

        if (assignedLoc) {
            homePx = assignedLoc.px;
            homePy = assignedLoc.py;
            activityBubble = assignedLoc.bubble;
            assignedFacilityLabel = assignedLoc.facLabel;
        } else if (housingNodes.length > 0 && timeOfDay === 'Night') {
            const hNode = housingNodes[idx % housingNodes.length];
            homePx = (hNode.doorX + ((idx % 3) - 1) * 0.55) * BASE_TILE_SIZE;
            homePy = (hNode.doorY + 0.35) * BASE_TILE_SIZE;
            activityBubble = '💤 숙소 휴식 중';
        } else {
            try {
                const routine = getCompanionRoutine(character, comp.id);
                if (routine?.activity) {
                    activityBubble = routine.activity;
                }
            } catch {
                // fallback
            }
        }

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

    // 8. 몬스터 사육소 보유 몬스터 + 대기 몬스터 동료 전원 라이브 스폰 (제한 해제)
    const farmMonsters: BaseFarmMonsterEntity[] = [];
    const captured = (base?.capturedMonsters || []).filter(Boolean);
    const defaultPen = monsterPenBounds || {
        minPx: (cx + 1.5) * BASE_TILE_SIZE,
        maxPx: Math.min(cols - 2.5, cx + 4.5) * BASE_TILE_SIZE,
        minPy: (hqHeight - 1.5) * BASE_TILE_SIZE,
        maxPy: (hqHeight + 0.5) * BASE_TILE_SIZE
    };

    const allFarmMonsters: CapturedMonster[] = [
        ...captured,
        ...monsterResidents.map(
            mc =>
                ({
                    id: mc.id,
                    name: mc.name,
                    level: mc.level || 1,
                    hp: mc.stats?.hp || 100,
                    maxHp: mc.stats?.maxHp || 100,
                    stats: mc.stats,
                    visualUrl: mc.monsterData?.visualUrl || (mc as any).visualUrl || mc.appearance,
                    hunger: 100,
                    affection: mc.affection ?? 50,
                    rank: (mc.monsterData as any)?.rank
                } as any)
        )
    ];

    allFarmMonsters.forEach((mon, idx) => {
        const spanX = Math.max(BASE_TILE_SIZE, defaultPen.maxPx - defaultPen.minPx);
        const spanY = Math.max(BASE_TILE_SIZE, defaultPen.maxPy - defaultPen.minPy);
        const px = defaultPen.minPx + ((idx * 37) % 100) / 100 * spanX;
        const py = defaultPen.minPy + ((idx * 53) % 100) / 100 * spanY;
        farmMonsters.push({
            id: mon.id || `farm_mon_${idx}`,
            name: mon.name || '사육 몬스터',
            level: mon.level || 1,
            rank: (mon as any).rank,
            hunger: mon.hunger ?? 100,
            affection: mon.affection ?? 50,
            visualUrl: mon.visualUrl,
            px,
            py,
            minPx: defaultPen.minPx,
            maxPx: defaultPen.maxPx,
            minPy: defaultPen.minPy,
            maxPy: defaultPen.maxPy,
            dir: idx % 2 === 0 ? 'right' : 'left',
            bobPhase: idx * 0.9,
            wanderTimer: 1.2 + (idx % 5) * 0.7,
            targetPx: null,
            targetPy: null,
            monsterRef: mon
        });
    });

    return {
        cols,
        rows,
        gridSize,
        cultureKey,
        buildingPackKey,
        tiles,
        solid,
        facilities,
        emptySlots,
        residents,
        farmMonsters,
        spawnPos: { x: cx, y: rows - 3 },
        exitGate
    };
};
