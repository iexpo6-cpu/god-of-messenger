/**
 * 신의 사자 RPG — 파이어 엠블렘(Fire Emblem) 스타일 2D SRPG 코어 엔진
 * - 지형 보너스(평지·숲·성채·제단·수면/용암·성벽)
 * - 다익스트라 이동 범위(MOV 3~5) + 공격 사거리(RNG 1~3) + 경로 탐색
 * - 전투 예측(Combat Forecast: 예상 피해·명중·치명타·추격 x2·상성·협공·반격)
 * - 보스 광역 텔레그래프(다음 턴 예고 장판) + Pair-Up(결합) + 전술 AI
 */

import { Character, CombatState, Companion, Enemy, Skill, SkillType } from '../types';
import { calculateDamage, calculateFinalStats, getEntityAllCombatSkills } from '../utils';
import { CityCultureKey, resolveCityCultureKey } from './cityAssetManifest';
import {
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from './rpgSpriteManifest';

export type SrpgTerrainType = 'plain' | 'forest' | 'fort' | 'altar' | 'water' | 'lava' | 'wall';

export interface SrpgTerrainMeta {
    type: SrpgTerrainType;
    label: string;
    moveCost: number;
    passable: boolean;
    defBonus: number;       // 방어 보너스 (%)
    evaBonus: number;       // 회피 보너스 (%)
    healPct: number;        // 턴 시작 시 HP 회복 (%)
    skillPowerBonus: number;// 스킬 위력 보너스 (%)
    burnPct: number;        // 턴 시작 시 화상 피해 (%)
}

export const SRPG_TERRAIN_META: Record<SrpgTerrainType, SrpgTerrainMeta> = {
    plain:  { type: 'plain',  label: '평지',       moveCost: 1, passable: true,  defBonus: 0,  evaBonus: 0,  healPct: 0,  skillPowerBonus: 0,  burnPct: 0 },
    forest: { type: 'forest', label: '숲 (엄폐)',   moveCost: 2, passable: true,  defBonus: 12, evaBonus: 20, healPct: 0,  skillPowerBonus: 0,  burnPct: 0 },
    fort:   { type: 'fort',   label: '요새 (회복)', moveCost: 1, passable: true,  defBonus: 25, evaBonus: 10, healPct: 12, skillPowerBonus: 0,  burnPct: 0 },
    altar:  { type: 'altar',  label: '신성 제단',   moveCost: 1, passable: true,  defBonus: 10, evaBonus: 5,  healPct: 5,  skillPowerBonus: 22, burnPct: 0 },
    water:  { type: 'water',  label: '수면',       moveCost: 99, passable: false, defBonus: 0,  evaBonus: 0,  healPct: 0,  skillPowerBonus: 0,  burnPct: 0 },
    lava:   { type: 'lava',   label: '용암 지대',   moveCost: 2, passable: true,  defBonus: 0,  evaBonus: 0,  healPct: 0,  skillPowerBonus: 15, burnPct: 10 },
    wall:   { type: 'wall',   label: '성벽/기둥',   moveCost: 99, passable: false, defBonus: 0,  evaBonus: 0,  healPct: 0,  skillPowerBonus: 0,  burnPct: 0 },
};

export type SrpgSurfaceType = 'water' | 'fire' | 'ice' | 'poison' | 'holy' | 'electrified';

export interface SrpgSurfaceCell {
    type: SrpgSurfaceType;
    turns: number;
}

export interface SrpgActiveBuff {
    name: string;
    atkMult?: number;
    defMult?: number;
    critBonus?: number;
    turns: number;
    color: string;
}

export interface SrpgUnit {
    id: string;
    name: string;
    team: 'ally' | 'enemy';
    isPlayer: boolean;
    isBoss: boolean;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    atk: number;
    def: number;
    agi: number;
    wis: number;
    initiative: number;       // BG3 이니셔티브 = AGI + WIS
    mov: number;
    remainingMov: number;     // BG3 분할 이동 잔여량
    rngMin: number;
    rngMax: number;
    row: number;
    col: number;
    dir: SpriteDirection;
    hasMoved: boolean;
    hasActed: boolean;
    hasAction: boolean;       // 🟢 BG3 주행동 (1/턴)
    hasBonusAction: boolean;  // 🟠 BG3 보조행동 (1/턴: 밀치기·도약·포션·집중)
    hasReaction: boolean;     // 🟣 BG3 리액션 (1/라운드: 패링·기회공격)
    stunnedTurns?: number;
    jobLabel: string;
    element: string;
    skills: Skill[];
    activeBuffs: SrpgActiveBuff[];
    spriteUrl: string;
    regionKey: RpgSpriteRegionKey;
    genderKey: RpgSpriteGenderKey;
    visualUrl?: string;
    enemyTokenPart?: string;
    pairUnit?: SrpgUnit;
    sourceEntity: Character | Companion | Enemy;
    sourceEnemy?: Enemy;
    sourceCompanionId?: string;
    buffAtkMult?: number;
}

export interface SrpgTelegraphZone {
    bossId: string;
    bossName: string;
    skillName: string;
    tiles: Array<{ row: number; col: number }>;
    damageMultiplier: number;
}

export interface SrpgBattlefield {
    cols: number;
    rows: number;
    cultureKey: CityCultureKey;
    grid: SrpgTerrainType[][];
    allyCampPos: { row: number; col: number };
    enemyThronePos: { row: number; col: number };
    gimmicks: Array<{ row: number; col: number; part: string }>;
    title: string;
    subtitle: string;
}

export interface SrpgCombatForecast {
    attackerId: string;
    defenderId: string;
    skillName: string;
    atkDamage: number;
    atkHit: number;
    atkCrit: number;
    atkDoubles: boolean;
    dualStrikeBonus: number;
    advantage: 'up' | 'down' | 'neutral';
    canCounter: boolean;
    ctrDamage: number;
    ctrHit: number;
    ctrCrit: number;
    terrainDefBonus: number;
    terrainEvaBonus: number;
}

export interface SrpgClashStep {
    actorSide: 'attacker' | 'defender';
    actorName: string;
    damage: number;
    isCrit: boolean;
    isMiss: boolean;
    isDualStrike?: boolean;
    skillName: string;
    defenderHpAfter: number;
}

/**
 * 핵심 전투(보스 / 국가전쟁 / 신계전쟁 / 마계전쟁) 판별기
 */
export const isCoreSrpgCombat = (combatState?: CombatState | null): boolean => {
    if (!combatState || !combatState.enemies || combatState.enemies.length === 0) return false;
    const srpgTypes = new Set<string>([
        'boss',
        'god_rebellion',
        'temple_invasion',
        'temple_defense',
        'divine_invasion',
        'magye_god_slaying',
        'magye_temple_invasion',
        'magye_rebellion',
        'war_battle',
        'regional_uprising',
        'transcendent_arena',
    ]);
    if (combatState.type && srpgTypes.has(String(combatState.type))) return true;
    return combatState.enemies.some(
        e =>
            Boolean((e as any).isBoss) ||
            Boolean(e.name && /\[보스\]|\[성전 사자\]|\[반역\]|\[국가 지도자\]|\[신화\]|\[마신\]/.test(e.name))
    );
};

/**
 * 직업/스킬 기반 이동력(MOV) & 사거리(RNG) 산출 (광활한 14x10~16x12 전장 최적화)
 */
const inferUnitMobility = (jobStr: string, isBoss: boolean): { mov: number; rngMin: number; rngMax: number } => {
    const j = (jobStr || '').toLowerCase();
    if (isBoss) return { mov: 4, rngMin: 1, rngMax: 2 };
    if (/궁수|사수|아처|레인저|저격/.test(j)) return { mov: 5, rngMin: 2, rngMax: 3 };
    if (/마법|메이지|술사|도사|사제|성녀|신관|현자|비전|네크로/.test(j)) return { mov: 4, rngMin: 1, rngMax: 3 };
    if (/암살|닌자|기마|기수|척후|질풍/.test(j)) return { mov: 6, rngMin: 1, rngMax: 1 };
    if (/창|랜서|드래곤|기사|장군|제너럴/.test(j)) return { mov: 5, rngMin: 1, rngMax: 2 };
    if (/방패|중장|강철|골렘|수호/.test(j)) return { mov: 4, rngMin: 1, rngMax: 1 };
    return { mov: 5, rngMin: 1, rngMax: 1 };
};

const inferEnemyTokenPart = (enemyName: string, isBoss: boolean, region?: string, idx: number = 0): string => {
    if (isBoss) return 'enemy_boss';
    const n = (enemyName || '').toLowerCase();
    if (region === '신계' || /천사|성전|수호|빛|세라핌/.test(n)) return 'enemy_angel';
    if (region === '마계' || region === '아비살론' || /마계|악마|마인|심연|지옥|블러드/.test(n)) return 'enemy_demon';
    if (/궁수|사수|아처|저격|레인저/.test(n)) return 'enemy_archer';
    if (/마법|메이지|술사|사제|네크로|흑마/.test(n)) return 'enemy_mage';
    if (/기사|병사|수비|장군|전사/.test(n)) return 'enemy_knight';
    const pool = ['enemy_knight', 'enemy_archer', 'enemy_mage'];
    return pool[idx % pool.length];
};

/**
 * 시드 기반 전장 지형 생성 (길 막힘 0% 보장)
 */
export const generateSrpgBattlefield = (params: {
    cols: number;
    rows: number;
    region?: string;
    nation?: string;
    city?: string;
    title: string;
    subtitle: string;
}): SrpgBattlefield => {
    const { cols, rows, title, subtitle } = params;
    const cultureKey = resolveCityCultureKey(params.region, params.nation, params.city);
    const grid: SrpgTerrainType[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 'plain' as SrpgTerrainType)
    );

    const seedBase = Array.from(`${params.nation || ''}_${params.city || ''}_${title}`).reduce(
        (acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7),
        1337
    );
    let s = seedBase >>> 0;
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };

    const isMagye = cultureKey.startsWith('magye') || cultureKey === 'abyssalon';
    const isShingye = cultureKey.startsWith('shingye');
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);

    // 1. 전략 거점(요새 / 신성 제단) 배치 (중앙 좌우 대칭)
    grid[midR][Math.max(1, midC - 2)] = isShingye ? 'altar' : 'fort';
    grid[midR][Math.min(cols - 2, midC + 2)] = isShingye ? 'altar' : 'fort';
    if (rows >= 8) {
        grid[Math.max(2, midR - 2)][midC] = isShingye || isMagye ? 'altar' : 'fort';
        grid[Math.min(rows - 3, midR + 2)][midC] = 'fort';
    }

    // 2. 중간 전선 숲/엄폐물/기둥/수면·용암 배치 (상단 2줄 & 하단 2줄 스폰 구역과 중앙 통로는 항상 비워둠)
    for (let r = 2; r < rows - 2; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (grid[r][c] !== 'plain') continue;
            // 중앙 세로 2칸 주통로는 이동 보장
            if (Math.abs(c - midC) <= 1 && r === midR) continue;

            const roll = rand();
            if (roll < 0.14) {
                grid[r][c] = 'forest';
            } else if (roll < 0.20) {
                grid[r][c] = isMagye ? 'lava' : 'water';
            } else if (roll < 0.24 && Math.abs(c - midC) >= 2) {
                grid[r][c] = 'wall';
            }
        }
    }

    // 3. 적 본진(상단) 중앙 보스 옥좌 & 아군 본진(하단) 지휘 천막
    const enemyThronePos = { row: 1, col: midC };
    const allyCampPos = { row: rows - 1, col: midC };
    grid[enemyThronePos.row][enemyThronePos.col] = isShingye || isMagye ? 'altar' : 'fort';
    grid[allyCampPos.row][allyCampPos.col] = 'fort';

    // 4. 전장 특수 기믹 오브젝트 (포탑·차원문·용암 간헐천·빙결 기둥·신성 결계·전리품 상자)
    const gimmicks: Array<{ row: number; col: number; part: string }> = [];
    const pillarPart = isShingye
        ? 'holy_pillar'
        : cultureKey === 'shingye_ice' || cultureKey === 'northern_europe'
            ? 'ice_pillar'
            : isMagye
                ? 'magma_vent'
                : 'turret';

    const tryGimmick = (r: number, c: number, part: string) => {
        if (r > 1 && r < rows - 2 && c > 0 && c < cols - 1 && grid[r][c] === 'plain') {
            gimmicks.push({ row: r, col: c, part });
        }
    };
    tryGimmick(2, Math.max(1, midC - 4), pillarPart);
    tryGimmick(2, Math.min(cols - 2, midC + 4), pillarPart);
    tryGimmick(midR, 1, 'rift_portal');
    tryGimmick(midR, cols - 2, 'chest');

    return { cols, rows, cultureKey, grid, allyCampPos, enemyThronePos, gimmicks, title, subtitle };
};

/**
 * Character / Companion -> SrpgUnit 변환
 */
export const buildAllySrpgUnits = (
    player: Character,
    selectedCompanions: Companion[],
    rows: number,
    cols: number,
    region?: string,
    nation?: string
): SrpgUnit[] => {
    const units: SrpgUnit[] = [];
    const midC = Math.floor(cols / 2);

    const makeUnit = (
        entity: Character | Companion,
        isPlayer: boolean,
        row: number,
        col: number
    ): SrpgUnit => {
        const finalStats = calculateFinalStats(entity as any);
        const maxHp = Math.max(100, Math.floor(finalStats.maxHp || entity.stats?.maxHp || 500));
        const hp = Math.max(1, Math.min(maxHp, Math.floor(entity.stats?.hp || maxHp)));
        const maxMp = Math.max(50, Math.floor(finalStats.maxMp || entity.stats?.maxMp || 200));
        const mp = Math.max(0, Math.min(maxMp, Math.floor(entity.stats?.mp || maxMp)));
        const atk = Math.max(20, Math.floor(Math.max(finalStats.str || 0, finalStats.int || 0) * 1.4 + (entity.level || 1) * 4));
        const def = Math.max(10, Math.floor((finalStats.def || 10) * 0.9 + (entity.level || 1) * 1.5));
        const agi = Math.max(10, Math.floor(finalStats.agi || 20));
        const wis = Math.max(10, Math.floor(finalStats.wis || 20));
        const initiative = agi + wis;
        const jobLabel = String(entity.job || '모험가');
        const mob = inferUnitMobility(jobLabel, false);
        const sprite = resolveEntityRpgSprite(entity, region, nation);
        // SkillSelector 전체 스킬창과 100% 연동하기 위해 모든 보유 전투 스킬을 보존
        const skills = getEntityAllCombatSkills(entity as any).filter(Boolean);

        return {
            id: isPlayer ? 'srpg_player' : `srpg_comp_${entity.id}`,
            name: entity.name,
            team: 'ally',
            isPlayer,
            isBoss: false,
            level: entity.level || 1,
            hp,
            maxHp,
            mp,
            maxMp,
            atk,
            def,
            agi,
            wis,
            initiative,
            mov: mob.mov,
            remainingMov: mob.mov,
            rngMin: mob.rngMin,
            rngMax: mob.rngMax,
            row,
            col,
            dir: 'up',
            hasMoved: false,
            hasActed: false,
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            jobLabel,
            element: String((entity as any).shinryokuType || '무속성'),
            skills,
            activeBuffs: [],
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: entity.visualUrl,
            sourceEntity: entity,
            sourceCompanionId: isPlayer ? undefined : entity.id
        };
    };

    // 플레이어: 하단 중앙 배치
    units.push(makeUnit(player, true, rows - 2, midC));

    // 동료들: 하단 2줄에 좌우 대칭 배치
    const slots: Array<[number, number]> = [
        [rows - 2, Math.max(1, midC - 2)],
        [rows - 2, Math.min(cols - 2, midC + 2)],
        [rows - 1, Math.max(1, midC - 1)],
        [rows - 1, Math.min(cols - 2, midC + 1)],
        [rows - 1, Math.max(1, midC - 3)],
        [rows - 1, Math.min(cols - 2, midC + 3)],
    ];

    selectedCompanions.slice(0, 6).forEach((comp, idx) => {
        const [r, c] = slots[idx] || [rows - 1, Math.min(cols - 2, idx + 1)];
        units.push(makeUnit(comp, false, r, c));
    });

    return units;
};

/**
 * Enemy[] -> SrpgUnit[] 변환
 */
export const buildEnemySrpgUnits = (
    enemies: Enemy[],
    rows: number,
    cols: number,
    region?: string,
    nation?: string
): SrpgUnit[] => {
    const midC = Math.floor(cols / 2);
    const bossIdx = enemies.findIndex(
        e => Boolean((e as any).isBoss) || Boolean(e.name && /\[보스\]|\[성전 사자\]|\[반역\]|\[국가 지도자\]|\[마신\]/.test(e.name))
    );

    const slots: Array<[number, number]> = [
        [1, midC],
        [2, Math.max(1, midC - 2)],
        [2, Math.min(cols - 2, midC + 2)],
        [1, Math.max(1, midC - 3)],
        [1, Math.min(cols - 2, midC + 3)],
        [2, midC],
        [3, Math.max(1, midC - 1)],
        [3, Math.min(cols - 2, midC + 1)],
    ];

    // 보스가 있으면 0번 슬롯(상단 중앙 옥좌)에 우선 배치
    const ordered = [...enemies];
    if (bossIdx > 0) {
        const [b] = ordered.splice(bossIdx, 1);
        ordered.unshift(b);
    }

    return ordered.slice(0, 8).map((enemy, idx) => {
        const isBoss = idx === 0 && (bossIdx >= 0 || enemies.length === 1 || (enemy.maxHp || 0) >= 3000);
        const [r, c] = slots[idx] || [1, Math.min(cols - 2, idx + 1)];
        const maxHp = Math.max(80, Math.floor(enemy.maxHp || enemy.hp || 500));
        const hp = Math.max(1, Math.min(maxHp, Math.floor(enemy.hp || maxHp)));
        const atk = Math.max(20, Math.floor((enemy.attack || 40) * 1.15));
        const def = Math.max(8, Math.floor((enemy.defense || 15) * 0.9));
        const agi = Math.max(10, Math.floor((enemy as any).agi || (enemy.level || 1) * 1.1 + 15));
        const wis = Math.max(10, Math.floor((enemy as any).wis || (enemy.level || 1) * 1.0 + 14));
        const initiative = agi + wis;
        const mob = inferUnitMobility(enemy.name || '', isBoss);
        const sprite = resolveEntityRpgSprite(
            { id: enemy.id || `enemy_${idx}`, name: enemy.name, gender: idx % 2 === 0 ? 'male' : 'female' },
            region,
            nation
        );

        return {
            id: `srpg_enemy_${enemy.id || idx}`,
            name: enemy.name || `적군 ${idx + 1}`,
            team: 'enemy',
            isPlayer: false,
            isBoss,
            level: enemy.level || 1,
            hp,
            maxHp,
            mp: 100,
            maxMp: 100,
            atk,
            def,
            agi,
            wis,
            initiative,
            mov: mob.mov,
            remainingMov: mob.mov,
            rngMin: mob.rngMin,
            rngMax: mob.rngMax,
            row: r,
            col: c,
            dir: 'down',
            hasMoved: false,
            hasActed: false,
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            jobLabel: isBoss ? '적 사령관 / 보스' : '적 정예병',
            element: String((enemy as any).element || (enemy as any).shinryokuType || '무속성'),
            skills: (enemy.skills || []).slice(0, 6),
            activeBuffs: [],
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: enemy.visualUrl,
            enemyTokenPart: inferEnemyTokenPart(enemy.name || '', isBoss, region, idx),
            sourceEntity: enemy,
            sourceEnemy: enemy
        };
    });
};

/**
 * 다익스트라 기반 이동 가능 타일 계산 (적 유닛 통과 불가, 아군 통과 가능·정지 불가)
 */
export const computeMovableTiles = (
    unit: SrpgUnit,
    grid: SrpgTerrainType[][],
    units: SrpgUnit[]
): Map<string, { cost: number; parent: string | null }> => {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const occupiedEnemy = new Set(
        units.filter(u => u.hp > 0 && u.team !== unit.team).map(u => `${u.row},${u.col}`)
    );

    const startKey = `${unit.row},${unit.col}`;
    const dist = new Map<string, { cost: number; parent: string | null }>();
    dist.set(startKey, { cost: 0, parent: null });

    const queue: Array<{ r: number; c: number; cost: number }> = [{ r: unit.row, c: unit.col, cost: 0 }];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
        queue.sort((a, b) => a.cost - b.cost);
        const cur = queue.shift()!;
        const curKey = `${cur.r},${cur.c}`;
        const best = dist.get(curKey);
        if (!best || cur.cost > best.cost) continue;

        for (const [dr, dc] of dirs) {
            const nr = cur.r + dr;
            const nc = cur.c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const nKey = `${nr},${nc}`;
            if (occupiedEnemy.has(nKey)) continue;
            const tMeta = SRPG_TERRAIN_META[grid[nr][nc]];
            if (!tMeta.passable) continue;
            const nextCost = cur.cost + tMeta.moveCost;
            if (nextCost > unit.remainingMov) continue;

            const prev = dist.get(nKey);
            if (!prev || nextCost < prev.cost) {
                dist.set(nKey, { cost: nextCost, parent: curKey });
                queue.push({ r: nr, c: nc, cost: nextCost });
            }
        }
    }

    return dist;
};

/**
 * 이동 경로 복원 (화살표 렌더링 & 부드러운 유닛 이동용)
 */
export const reconstructPath = (
    distMap: Map<string, { cost: number; parent: string | null }>,
    targetRow: number,
    targetCol: number
): Array<{ row: number; col: number }> => {
    const path: Array<{ row: number; col: number }> = [];
    let cur: string | null = `${targetRow},${targetCol}`;
    while (cur) {
        const [r, c] = cur.split(',').map(Number);
        path.push({ row: r, col: c });
        cur = distMap.get(cur)?.parent || null;
    }
    path.reverse();
    return path;
};

/**
 * 특정 좌표에서 공격 가능한 타일 집합 계산
 */
export const computeAttackableFrom = (
    row: number,
    col: number,
    rngMin: number,
    rngMax: number,
    rows: number,
    cols: number
): Set<string> => {
    const out = new Set<string>();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const d = Math.abs(r - row) + Math.abs(c - col);
            if (d >= rngMin && d <= rngMax) {
                out.add(`${r},${c}`);
            }
        }
    }
    return out;
};

/**
 * 파이어 엠블렘 전투 예측 (Combat Forecast)
 * - 실제 CombatInterface.tsx와 100% 동일한 `calculateDamage(utils.ts)` 공식으로 기본 피해·속성 상성·치명타를 산정하고,
 *   그 위에 SRPG 전술 보너스(지형 방어·제단 위력·Pair-Up·인접 협공)를 가산합니다.
 */
export const calculateSrpgForecast = (
    attacker: SrpgUnit,
    defender: SrpgUnit,
    grid: SrpgTerrainType[][],
    units: SrpgUnit[],
    skill?: Skill | null,
    playerCharacter?: Character
): SrpgCombatForecast => {
    const atkTerrain = SRPG_TERRAIN_META[grid[attacker.row][attacker.col]];
    const defTerrain = SRPG_TERRAIN_META[grid[defender.row][defender.col]];
    const dist = Math.abs(attacker.row - defender.row) + Math.abs(attacker.col - defender.col);

    // Pair-Up 보너스 & 인접 아군 협공(Dual Strike) 보너스
    const pairMult = attacker.pairUnit ? 1.22 : 1.0;
    const defPairMult = defender.pairUnit ? 0.85 : 1.0;
    const buffMult = attacker.buffAtkMult || 1.0;
    const adjacentAllies = units.filter(
        u =>
            u.hp > 0 &&
            u.team === attacker.team &&
            u.id !== attacker.id &&
            Math.abs(u.row - defender.row) + Math.abs(u.col - defender.col) === 1
    );
    const dualStrikeBonus = adjacentAllies.length > 0 ? Math.min(35, adjacentAllies.length * 15) : 0;

    // CombatInterface.tsx와 100% 동일한 calculateDamage 엔진 호출
    const baseCalc = calculateDamage(attacker.sourceEntity, defender.sourceEntity, skill || undefined, playerCharacter);
    const extraDmg = (baseCalc.additionalDamage || []).reduce((sum, a) => sum + (a.damage || 0), 0);
    const rawCoreDamage = Math.max(1, (baseCalc.damage || 1) + extraDmg);

    const altarMult = 1 + (skill ? atkTerrain.skillPowerBonus : 0) / 100;
    const terrainDefReduction = 1 - defTerrain.defBonus / 160;
    const atkDamage = Math.max(
        1,
        Math.round(rawCoreDamage * pairMult * defPairMult * buffMult * altarMult * terrainDefReduction * (1 + dualStrikeBonus / 100))
    );

    let advantage: 'up' | 'down' | 'neutral' = 'neutral';
    if (baseCalc.affinityEffect?.includes('약점') || baseCalc.affinityEffect?.includes('우세')) advantage = 'up';
    else if (baseCalc.affinityEffect?.includes('반감') || baseCalc.affinityEffect?.includes('저항')) advantage = 'down';
    else if (attacker.rngMax >= 2 && defender.rngMax === 1 && dist >= 2) advantage = 'up';

    const atkHit = Math.max(55, Math.min(100, Math.round(93 + (attacker.agi - defender.agi) * 0.4 - defTerrain.evaBonus + (advantage === 'up' ? 8 : 0))));
    const atkCrit = Math.max(5, Math.min(70, Math.round(14 + (attacker.agi - defender.agi) * 0.3 + (skill ? 8 : 0))));
    const atkDoubles = attacker.agi >= defender.agi + 8 && !skill;

    // 반격 가능 여부 (사거리 내 생존 시) — 동일하게 calculateDamage 사용
    const canCounter = dist >= defender.rngMin && dist <= defender.rngMax;
    let ctrDamage = 0;
    if (canCounter) {
        const ctrCalc = calculateDamage(defender.sourceEntity, attacker.sourceEntity, undefined, playerCharacter);
        const ctrExtra = (ctrCalc.additionalDamage || []).reduce((sum, a) => sum + (a.damage || 0), 0);
        const atkTerrainDefReduction = 1 - atkTerrain.defBonus / 160;
        const atkPairDefMult = attacker.pairUnit ? 0.85 : 1.0;
        ctrDamage = Math.max(1, Math.round(((ctrCalc.damage || 1) + ctrExtra) * atkTerrainDefReduction * atkPairDefMult));
    }
    const ctrHit = canCounter ? Math.max(45, Math.min(98, Math.round(86 + (defender.agi - attacker.agi) * 0.4 - atkTerrain.evaBonus))) : 0;
    const ctrCrit = canCounter ? Math.max(3, Math.min(40, Math.round(8 + (defender.agi - attacker.agi) * 0.25))) : 0;

    return {
        attackerId: attacker.id,
        defenderId: defender.id,
        skillName: skill ? skill.name : '일반 공격',
        atkDamage,
        atkHit,
        atkCrit,
        atkDoubles,
        dualStrikeBonus,
        advantage,
        canCounter,
        ctrDamage,
        ctrHit,
        ctrCrit,
        terrainDefBonus: defTerrain.defBonus,
        terrainEvaBonus: defTerrain.evaBonus
    };
};

/**
 * 아군 지원 스킬 (HEAL / BUFF) SRPG 전장 처리
 */
export const resolveSrpgSupportSkill = (
    caster: SrpgUnit,
    target: SrpgUnit,
    skill: Skill
): { healAmount: number; buffApplied: boolean; logText: string } => {
    if (skill.type === SkillType.HEAL) {
        const ratio = Math.max(0.25, Math.min(0.85, ((skill as any).damageMultiplier || 40) / 100));
        const healAmount = Math.max(100, Math.round(target.maxHp * ratio + caster.atk * 0.45));
        return {
            healAmount,
            buffApplied: false,
            logText: `💚 ${caster.name}의 [${skill.name}] → ${target.name} HP +${healAmount.toLocaleString()} 회복!`
        };
    }
    return {
        healAmount: 0,
        buffApplied: true,
        logText: `✨ ${caster.name}의 [${skill.name}] → ${target.name} 공격력 +25% 강화!`
    };
};

/**
 * 파이어 엠블렘 교전 시뮬레이션 (공격 -> 반격 -> 추격)
 */
export const resolveSrpgClash = (
    attacker: SrpgUnit,
    defender: SrpgUnit,
    forecast: SrpgCombatForecast
): { steps: SrpgClashStep[]; finalAttackerHp: number; finalDefenderHp: number } => {
    const steps: SrpgClashStep[] = [];
    let aHp = attacker.hp;
    let dHp = defender.hp;

    const swing = (
        side: 'attacker' | 'defender',
        name: string,
        baseDmg: number,
        hitRate: number,
        critRate: number,
        skillName: string,
        isDualStrike = false
    ) => {
        const hitRoll = Math.random() * 100;
        if (hitRoll > hitRate) {
            steps.push({
                actorSide: side,
                actorName: name,
                damage: 0,
                isCrit: false,
                isMiss: true,
                isDualStrike,
                skillName,
                defenderHpAfter: side === 'attacker' ? dHp : aHp
            });
            return;
        }
        const isCrit = Math.random() * 100 <= critRate;
        const dmg = Math.max(1, Math.round(baseDmg * (isCrit ? 1.75 : 1.0) * (0.94 + Math.random() * 0.12)));
        if (side === 'attacker') {
            dHp = Math.max(0, dHp - dmg);
            steps.push({ actorSide: 'attacker', actorName: name, damage: dmg, isCrit, isMiss: false, isDualStrike, skillName, defenderHpAfter: dHp });
        } else {
            aHp = Math.max(0, aHp - dmg);
            steps.push({ actorSide: 'defender', actorName: name, damage: dmg, isCrit, isMiss: false, skillName: '반격', defenderHpAfter: aHp });
        }
    };

    // 1. 선제 공격
    swing('attacker', attacker.name, forecast.atkDamage, forecast.atkHit, forecast.atkCrit, forecast.skillName, forecast.dualStrikeBonus > 0);

    // 2. 방어자 생존 시 반격
    if (dHp > 0 && forecast.canCounter) {
        swing('defender', defender.name, forecast.ctrDamage, forecast.ctrHit, forecast.ctrCrit, '반격');
    }

    // 3. 공격자 생존 + 속도 추격(×2)
    if (aHp > 0 && dHp > 0 && forecast.atkDoubles) {
        swing('attacker', attacker.name, forecast.atkDamage, forecast.atkHit, forecast.atkCrit, '연속 추격 ×2');
    }

    return { steps, finalAttackerHp: aHp, finalDefenderHp: dHp };
};

/**
 * 보스 광역 텔레그래프(예고 장판) 생성
 */
export const computeBossTelegraph = (
    boss: SrpgUnit,
    grid: SrpgTerrainType[][],
    allies: SrpgUnit[]
): SrpgTelegraphZone | null => {
    const aliveAllies = allies.filter(a => a.hp > 0);
    if (aliveAllies.length === 0 || boss.hp <= 0) return null;

    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    // 가장 가까운 아군을 중심으로 3x3 십자 장판 예고
    const target = aliveAllies.reduce((best, cur) => {
        const dBest = Math.abs(best.row - boss.row) + Math.abs(best.col - boss.col);
        const dCur = Math.abs(cur.row - boss.row) + Math.abs(cur.col - boss.col);
        return dCur < dBest ? cur : best;
    }, aliveAllies[0]);

    const tiles: Array<{ row: number; col: number }> = [];
    const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
    offsets.forEach(([dr, dc]) => {
        const nr = target.row + dr;
        const nc = target.col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && SRPG_TERRAIN_META[grid[nr][nc]].passable) {
            tiles.push({ row: nr, col: nc });
        }
    });

    const bossSkill = boss.skills[0]?.name || '파멸의 권능';
    return {
        bossId: boss.id,
        bossName: boss.name,
        skillName: bossSkill,
        tiles,
        damageMultiplier: 1.35
    };
};

/**
 * BG3 이니셔티브 순서 생성 (AGI + WIS 내림차순, 동점 시 아군 우선)
 */
export const buildInitiativeOrder = (units: SrpgUnit[]): string[] => {
    return [...units]
        .filter(u => u.hp > 0)
        .sort((a, b) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative;
            if (a.team !== b.team) return a.team === 'ally' ? -1 : 1;
            return b.level - a.level;
        })
        .map(u => u.id);
};

/**
 * BG3 공유 이니셔티브 아군 그룹 반환 (연속된 아군 턴은 자유롭게 전환하며 행동 가능)
 */
export const getSharedAllyGroupIds = (
    initiativeOrder: string[],
    currentIdx: number,
    units: SrpgUnit[]
): string[] => {
    const unitMap = new Map(units.map(u => [u.id, u]));
    const curUnit = unitMap.get(initiativeOrder[currentIdx]);
    if (!curUnit || curUnit.team !== 'ally' || curUnit.hp <= 0) return [];

    const group: string[] = [curUnit.id];
    // 뒤로 연속된 생존 아군 묶기
    for (let i = currentIdx + 1; i < initiativeOrder.length; i++) {
        const u = unitMap.get(initiativeOrder[i]);
        if (!u || u.hp <= 0) continue;
        if (u.team === 'ally') group.push(u.id);
        else break;
    }
    return group;
};

/**
 * BG3 보조행동: 도약(Jump) 가능 타일 계산 (장애물/수면/용암 뛰어넘어 최대 3칸 착지)
 */
export const computeJumpTiles = (
    unit: SrpgUnit,
    grid: SrpgTerrainType[][],
    units: SrpgUnit[],
    maxRange: number = 3
): Set<string> => {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const occupied = new Set(units.filter(u => u.hp > 0).map(u => `${u.row},${u.col}`));
    const result = new Set<string>();

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const dist = Math.abs(r - unit.row) + Math.abs(c - unit.col);
            if (dist < 2 || dist > maxRange) continue;
            const key = `${r},${c}`;
            if (occupied.has(key)) continue;
            if (!SRPG_TERRAIN_META[grid[r][c]].passable) continue;
            result.add(key);
        }
    }
    return result;
};

/**
 * BG3 보조행동: 밀치기(Shove) — 인접 적을 2칸 밀어 벽/용암/수면 환경 피해 유발
 */
export const resolveShoveAction = (
    caster: SrpgUnit,
    target: SrpgUnit,
    grid: SrpgTerrainType[][],
    units: SrpgUnit[]
): {
    newRow: number;
    newCol: number;
    bonusDamage: number;
    reason: string;
} => {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const dr = Math.sign(target.row - caster.row);
    const dc = Math.sign(target.col - caster.col);
    const occupied = new Set(units.filter(u => u.hp > 0 && u.id !== target.id).map(u => `${u.row},${u.col}`));

    let curR = target.row;
    let curC = target.col;
    let bonusDamage = 0;
    let reason = '밀쳐냄!';

    for (let step = 0; step < 2; step++) {
        const nr = curR + dr;
        const nc = curC + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !SRPG_TERRAIN_META[grid[nr][nc]].passable || occupied.has(`${nr},${nc}`)) {
            bonusDamage = Math.max(80, Math.round(caster.atk * 0.55));
            reason = '벽/장애물 충돌 추가 피해!';
            break;
        }
        curR = nr;
        curC = nc;
        if (grid[curR][curC] === 'lava') {
            bonusDamage = Math.max(120, Math.round(target.maxHp * 0.12));
            reason = '용암 지대 추락 화상 피해!';
            break;
        }
    }

    return { newRow: curR, newCol: curC, bonusDamage, reason };
};

/**
 * BG3 지면 원소 표면(Surface) 생성 및 원소 시너지 콤보 판정
 */
export const applySkillSurfaceAndCombo = (
    targetRow: number,
    targetCol: number,
    skill: Skill | null,
    attackerElement: string,
    surfaces: Record<string, SrpgSurfaceCell>,
    grid: SrpgTerrainType[][]
): {
    nextSurfaces: Record<string, SrpgSurfaceCell>;
    comboName: string | null;
    comboMultiplier: number;
    stunsTarget: boolean;
    vfxColor: string;
} => {
    const nextSurfaces = { ...surfaces };
    const text = `${skill?.name || ''} ${skill?.description || ''} ${attackerElement || ''}`.toLowerCase();

    let incoming: SrpgSurfaceType | null = null;
    let vfxColor = '#f59e0b';
    if (/전격|번개|뇌|볼트|천둥|lightning|thunder/.test(text)) { incoming = 'electrified'; vfxColor = '#38bdf8'; }
    else if (/화염|불|염|태양|피닉스|flame|fire|sun/.test(text)) { incoming = 'fire'; vfxColor = '#f97316'; }
    else if (/빙결|얼음|서리|눈|블리자드|ice|frost/.test(text)) { incoming = 'ice'; vfxColor = '#67e8f9'; }
    else if (/해수|물|파도|수|오션|water|ocean/.test(text)) { incoming = 'water'; vfxColor = '#0ea5e9'; }
    else if (/독|초화|맹독|베놈|poison|venom/.test(text)) { incoming = 'poison'; vfxColor = '#4ade80'; }
    else if (/광휘|빛|성|신성|태초|light|holy/.test(text)) { incoming = 'holy'; vfxColor = '#fde047'; }

    const key = `${targetRow},${targetCol}`;
    const existing = nextSurfaces[key]?.type;
    const terrain = grid[targetRow]?.[targetCol];

    let comboName: string | null = null;
    let comboMultiplier = 1.0;
    let stunsTarget = false;

    // BG3 원소 콤보 판정!
    if (incoming === 'electrified' && (existing === 'water' || terrain === 'water')) {
        comboName = '⚡ 과전류 감전 콤보!';
        comboMultiplier = 1.55;
        stunsTarget = true;
    } else if (incoming === 'fire' && (existing === 'poison' || terrain === 'forest')) {
        comboName = '🔥 대화재 폭발 콤보!';
        comboMultiplier = 1.5;
    } else if ((!incoming || incoming === 'holy') && existing === 'ice') {
        comboName = '💎 빙결 산산조각 콤보!';
        comboMultiplier = 1.4;
    }

    // 스킬 시전 시 3x3 또는 십자 지면 표면 생성
    if (incoming && skill) {
        const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
        const rows = grid.length;
        const cols = grid[0]?.length || 0;
        offsets.forEach(([dr, dc]) => {
            const nr = targetRow + dr;
            const nc = targetCol + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && SRPG_TERRAIN_META[grid[nr][nc]].passable) {
                nextSurfaces[`${nr},${nc}`] = { type: incoming!, turns: 3 };
            }
        });
    }

    return { nextSurfaces, comboName, comboMultiplier, stunsTarget, vfxColor };
};
