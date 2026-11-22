/**
 * 신의 사자 RPG — 발더스 게이트 3(BG3) 스타일 무격자(Gridless) 자유 이동 전술 전투 엔진
 * - 네모 타일(격자) 완전 제거: 연속 월드 좌표 (x, y) & 미터(m) 단위 자유 이동/사거리
 * - 이니셔티브: AGI + WIS 내림차순 + 연속 아군 공유 이니셔티브 그룹
 * - BG3 행동 경제: 분할 이동(m) / 🟢 주행동 / 🟠 보조행동(밀치기·도약·포션) / 🟣 리액션(기회공격·신력 패링)
 * - BG3 조준 템플릿: 단일(투사체/근접) · 원형 AoE · 60도 부채꼴 브레스
 * - BG3 유기적 원형 원소 웅덩이(Surface) & 원소 시너지 콤보
 * - 데미지 공식: CombatInterface.tsx와 100% 동일한 `calculateDamage(src/utils.ts)`
 */

import { Character, Companion, Enemy, Skill, SkillType } from '../types';
import { calculateDamage, calculateFinalStats, getEntityAllCombatSkills } from '../utils';
import { CityCultureKey, resolveCityCultureKey } from './cityAssetManifest';
import {
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from './rpgSpriteManifest';

export const ARENA_W = 2800;
export const ARENA_H = 1900;
export const WAR_ARENA_W = 4200;
export const WAR_ARENA_H = 2800;
export const PX_PER_METER = 32; // 1m = 32px (보스전 87.5m×59.4m / 대규모 전쟁 131.2m×87.5m!)

export type Bg3SurfaceType = 'water' | 'fire' | 'ice' | 'poison' | 'holy' | 'electrified';

export interface Bg3SurfacePool {
    id: string;
    x: number;
    y: number;
    radius: number; // px
    type: Bg3SurfaceType;
    turns: number;
}

export interface Bg3Obstacle {
    id: string;
    x: number;
    y: number;
    radius: number; // px
    kind: 'forest' | 'fort' | 'altar' | 'barricade' | 'pillar' | 'lava' | 'water' | 'ally_camp' | 'enemy_throne' | 'chest';
    part: string;   // props/srpg/<part>.png
    blocksMovement: boolean;
    label: string;
    defBonus?: number;
    evaBonus?: number;
    healPct?: number;
}

export interface Bg3ActiveBuff {
    name: string;
    atkMult?: number;
    defMult?: number;
    turns: number;
    color: string;
}

export interface Bg3Unit {
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
    initiative: number; // AGI + WIS
    x: number;
    y: number;
    radius: number;     // 충돌 반경 (px)
    moveMeters: number;
    remainingMeters: number;
    attackRangeMeters: number;
    meleeThreatMeters: number;
    dir: SpriteDirection;
    hasAction: boolean;
    hasBonusAction: boolean;
    hasReaction: boolean;
    stunnedTurns: number;
    jobLabel: string;
    element: string;
    skills: Skill[];
    activeBuffs: Bg3ActiveBuff[];
    buffAtkMult: number;
    spriteUrl: string;
    regionKey: RpgSpriteRegionKey;
    genderKey: RpgSpriteGenderKey;
    visualUrl?: string;
    enemyTokenPart?: string;
    sourceEntity: Character | Companion | Enemy;
    sourceCompanionId?: string;
}

export interface Bg3ArenaData {
    width: number;
    height: number;
    cultureKey: CityCultureKey;
    obstacles: Bg3Obstacle[];
    initialSurfaces: Bg3SurfacePool[];
    title: string;
    subtitle: string;
}

export interface Bg3SkillTargeting {
    shape: 'single' | 'circle' | 'cone';
    rangeMeters: number;
    aoeRadiusMeters: number;
    isSupport: boolean;
    isRanged: boolean;
    shinryokuType: string;
    vfxColor: string;
}

export interface Bg3BossTelegraph {
    bossId: string;
    bossName: string;
    skillName: string;
    x: number;
    y: number;
    radiusPx: number;
    damageMultiplier: number;
}

export const distPx = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const pxToMeters = (px: number): number => px / PX_PER_METER;
export const metersToPx = (m: number): number => m * PX_PER_METER;

/**
 * AGI 능력치 기반 1턴 이동 거리(m) 산출
 * - 초중반(AGI 20~200): 11m ~ 16m
 * - 중후반(AGI 500~5,000): 20m ~ 25m
 * - 신계/마계(AGI 10,000+): 최대 30m (광활한 65m 전장에서 체감 확실!)
 */
export const computeAgiMoveMeters = (agi: number, jobBonus = 0): number => {
    const safeAgi = Math.max(1, agi || 10);
    const agiBonus = Math.log10(safeAgi + 10) * 4.2 + Math.min(5.0, safeAgi / 100);
    return Math.round(Math.max(8.5, Math.min(30.0, 6.0 + agiBonus + jobBonus)) * 10) / 10;
};

const inferBg3Mobility = (jobStr: string, isBoss: boolean, agi: number): { moveMeters: number; attackRangeMeters: number } => {
    const j = (jobStr || '').toLowerCase();
    if (isBoss) return { moveMeters: computeAgiMoveMeters(agi, 1.0), attackRangeMeters: 4.5 };
    if (/궁수|사수|아처|레인저|저격/.test(j)) return { moveMeters: computeAgiMoveMeters(agi, 0.5), attackRangeMeters: 14.0 };
    if (/마법|메이지|술사|도사|사제|성녀|신관|현자|비전|네크로/.test(j)) return { moveMeters: computeAgiMoveMeters(agi, 0), attackRangeMeters: 13.0 };
    if (/암살|닌자|기마|기수|척후|질풍/.test(j)) return { moveMeters: computeAgiMoveMeters(agi, 2.5), attackRangeMeters: 3.2 };
    if (/창|랜서|드래곤|기사|장군|제너럴/.test(j)) return { moveMeters: computeAgiMoveMeters(agi, 1.0), attackRangeMeters: 3.8 };
    if (/방패|중장|강철|골렘|수호/.test(j)) return { moveMeters: computeAgiMoveMeters(agi, -0.8), attackRangeMeters: 3.0 };
    return { moveMeters: computeAgiMoveMeters(agi, 0), attackRangeMeters: 3.2 };
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
 * 무격자 자유 아레나 생성 (유기적 원형 장애물·요새·숲·제단·용암/물 웅덩이)
 */
export const generateBg3Arena = (params: {
    region?: string;
    nation?: string;
    city?: string;
    title: string;
    subtitle: string;
    isLargeWar?: boolean;
}): Bg3ArenaData => {
    const W = params.isLargeWar ? WAR_ARENA_W : ARENA_W;
    const H = params.isLargeWar ? WAR_ARENA_H : ARENA_H;
    const cultureKey = resolveCityCultureKey(params.region, params.nation, params.city);
    const isMagye = cultureKey.startsWith('magye') || cultureKey === 'abyssalon';
    const isShingye = cultureKey.startsWith('shingye');
    const pillarPart = isShingye ? 'holy_pillar' : cultureKey === 'shingye_ice' || cultureKey === 'northern_europe' ? 'ice_pillar' : isMagye ? 'magma_vent' : 'turret';

    const obstacles: Bg3Obstacle[] = [
        // 상단 적 본진 옥좌 & 하단 아군 지휘 천막
        { id: 'obs_throne', x: W * 0.5, y: 120, radius: 60, kind: 'enemy_throne', part: 'enemy_throne', blocksMovement: false, label: '적 사령부 옥좌' },
        { id: 'obs_camp', x: W * 0.5, y: H - 110, radius: 56, kind: 'ally_camp', part: 'ally_camp', blocksMovement: false, label: '아군 지휘 천막 (회복)', healPct: 10 },

        // 좌우 + 중앙 전략 요새 / 신성 제단 (근처에서 방어·회복 오라!)
        { id: 'obs_fort_l', x: W * 0.24, y: H * 0.48, radius: 56, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: isShingye ? '신성 제단 (스킬↑)' : '전술 요새 (방어+20%)', defBonus: 20, healPct: 10 },
        { id: 'obs_fort_r', x: W * 0.76, y: H * 0.48, radius: 56, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: isShingye ? '신성 제단 (스킬↑)' : '전술 요새 (방어+20%)', defBonus: 20, healPct: 10 },
        { id: 'obs_fort_c', x: W * 0.50, y: H * 0.50, radius: 54, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: isShingye ? '중앙 신성 성소' : '중앙 요충지 요새', defBonus: 20, healPct: 10 },

        // 광활한 전장 엄폐 숲 군락 (통과 가능, 내부에서 회피 +20%)
        { id: 'obs_forest_1', x: W * 0.14, y: H * 0.28, radius: 58, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },
        { id: 'obs_forest_2', x: W * 0.86, y: H * 0.28, radius: 58, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },
        { id: 'obs_forest_3', x: W * 0.34, y: H * 0.68, radius: 54, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },
        { id: 'obs_forest_4', x: W * 0.66, y: H * 0.68, radius: 54, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },
        { id: 'obs_forest_5', x: W * 0.15, y: H * 0.72, radius: 52, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },
        { id: 'obs_forest_6', x: W * 0.85, y: H * 0.72, radius: 52, kind: 'forest', part: 'forest', blocksMovement: false, label: '숲 엄폐 (회피+20%)', evaBonus: 20 },

        // 물리 충돌 장애물 (밀치기 벽 충돌 추가 피해 유발!)
        { id: 'obs_bar_1', x: W * 0.38, y: H * 0.36, radius: 40, kind: 'barricade', part: 'barricade', blocksMovement: true, label: '전술 바리케이드' },
        { id: 'obs_bar_2', x: W * 0.62, y: H * 0.36, radius: 40, kind: 'barricade', part: 'barricade', blocksMovement: true, label: '전술 바리케이드' },
        { id: 'obs_pil_1', x: W * 0.12, y: H * 0.50, radius: 36, kind: 'pillar', part: pillarPart, blocksMovement: true, label: '전장 기믹 기둥' },
        { id: 'obs_pil_2', x: W * 0.88, y: H * 0.50, radius: 36, kind: 'pillar', part: pillarPart, blocksMovement: true, label: '전장 기믹 기둥' },
        { id: 'obs_pil_3', x: W * 0.35, y: H * 0.22, radius: 34, kind: 'pillar', part: pillarPart, blocksMovement: true, label: '전장 기믹 기둥' },
        { id: 'obs_pil_4', x: W * 0.65, y: H * 0.22, radius: 34, kind: 'pillar', part: pillarPart, blocksMovement: true, label: '전장 기믹 기둥' },
        { id: 'obs_chest', x: W * 0.92, y: H * 0.44, radius: 30, kind: 'chest', part: 'chest', blocksMovement: false, label: '전리품 상자' },
    ];

    if (params.isLargeWar) {
        // 대규모 전쟁 전용 추가 전선 거점 (상·하부 요새 & 추가 바리케이드 & 숲)
        obstacles.push(
            { id: 'obs_war_fort_n1', x: W * 0.33, y: H * 0.30, radius: 56, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: '북부 전초 요새 (방어+20%)', defBonus: 20, healPct: 10 },
            { id: 'obs_war_fort_n2', x: W * 0.67, y: H * 0.30, radius: 56, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: '북부 전초 요새 (방어+20%)', defBonus: 20, healPct: 10 },
            { id: 'obs_war_fort_s1', x: W * 0.33, y: H * 0.72, radius: 54, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: '남부 방어 거점 (방어+20%)', defBonus: 20, healPct: 10 },
            { id: 'obs_war_fort_s2', x: W * 0.67, y: H * 0.72, radius: 54, kind: isShingye ? 'altar' : 'fort', part: isShingye ? 'altar' : 'fort', blocksMovement: false, label: '남부 방어 거점 (방어+20%)', defBonus: 20, healPct: 10 },
            { id: 'obs_war_bar_1', x: W * 0.25, y: H * 0.58, radius: 40, kind: 'barricade', part: 'barricade', blocksMovement: true, label: '전선 방벽' },
            { id: 'obs_war_bar_2', x: W * 0.75, y: H * 0.58, radius: 40, kind: 'barricade', part: 'barricade', blocksMovement: true, label: '전선 방벽' },
            { id: 'obs_war_bar_3', x: W * 0.50, y: H * 0.64, radius: 40, kind: 'barricade', part: 'barricade', blocksMovement: true, label: '중앙 방벽' },
            { id: 'obs_war_forest_1', x: W * 0.50, y: H * 0.36, radius: 58, kind: 'forest', part: 'forest', blocksMovement: false, label: '전장 중앙 숲 (회피+20%)', evaBonus: 20 },
            { id: 'obs_war_forest_2', x: W * 0.22, y: H * 0.82, radius: 54, kind: 'forest', part: 'forest', blocksMovement: false, label: '남서 매복 숲 (회피+20%)', evaBonus: 20 },
            { id: 'obs_war_forest_3', x: W * 0.78, y: H * 0.82, radius: 54, kind: 'forest', part: 'forest', blocksMovement: false, label: '남동 매복 숲 (회피+20%)', evaBonus: 20 }
        );
    }

    const initialSurfaces: Bg3SurfacePool[] = [
        { id: 'surf_init_1', x: W * 0.22, y: H * 0.62, radius: 96, type: isMagye ? 'fire' : 'water', turns: 99 },
        { id: 'surf_init_2', x: W * 0.78, y: H * 0.62, radius: 96, type: isMagye ? 'fire' : 'water', turns: 99 },
        { id: 'surf_init_3', x: W * 0.50, y: H * 0.32, radius: 88, type: isShingye ? 'holy' : isMagye ? 'fire' : 'water', turns: 99 },
        ...(params.isLargeWar
            ? [
                  { id: 'surf_war_1', x: W * 0.36, y: H * 0.48, radius: 92, type: (isMagye ? 'fire' : 'water') as Bg3SurfaceType, turns: 99 },
                  { id: 'surf_war_2', x: W * 0.64, y: H * 0.48, radius: 92, type: (isShingye ? 'holy' : 'water') as Bg3SurfaceType, turns: 99 }
              ]
            : [])
    ];

    return { width: W, height: H, cultureKey, obstacles, initialSurfaces, title: params.title, subtitle: params.subtitle };
};

export const buildBg3AllyUnits = (
    player: Character,
    selectedCompanions: Companion[],
    region?: string,
    nation?: string,
    arenaW = ARENA_W,
    arenaH = ARENA_H
): Bg3Unit[] => {
    const makeUnit = (entity: Character | Companion, isPlayer: boolean, x: number, y: number): Bg3Unit => {
        const calc = calculateFinalStats(entity as any);
        const finalStats = calc?.finalStats || entity.stats || ({} as any);
        const maxHp = Math.max(100, Math.floor(finalStats.maxHp || entity.stats?.maxHp || 500));
        const hp = Math.max(1, Math.min(maxHp, Math.floor(entity.stats?.hp || maxHp)));
        const maxMp = Math.max(50, Math.floor(finalStats.maxMp || entity.stats?.maxMp || 200));
        const mp = Math.max(0, Math.min(maxMp, Math.floor(entity.stats?.mp || maxMp)));
        const atk = Math.max(20, Math.floor(Math.max(finalStats.str || 0, finalStats.int || 0) * 1.4 + (entity.level || 1) * 4));
        const def = Math.max(10, Math.floor((finalStats.def || 10) * 0.9 + (entity.level || 1) * 1.5));
        const agi = Math.max(10, Math.floor(finalStats.agi || 20));
        const wis = Math.max(10, Math.floor(finalStats.wis || 20));
        const jobLabel = String(entity.job || '모험가');
        const mob = inferBg3Mobility(jobLabel, false, agi);
        const sprite = resolveEntityRpgSprite(entity, region, nation);
        const skills = getEntityAllCombatSkills(entity as any).filter(Boolean);

        return {
            id: isPlayer ? 'bg3_player' : `bg3_comp_${entity.id}`,
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
            initiative: agi + wis,
            x,
            y,
            radius: 20,
            moveMeters: mob.moveMeters,
            remainingMeters: mob.moveMeters,
            attackRangeMeters: mob.attackRangeMeters,
            meleeThreatMeters: 2.2,
            dir: 'up',
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            stunnedTurns: 0,
            jobLabel,
            element: String((entity as any).shinryokuType || '무속성'),
            skills,
            activeBuffs: [],
            buffAtkMult: 1,
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: entity.visualUrl,
            sourceEntity: entity,
            sourceCompanionId: isPlayer ? undefined : entity.id
        };
    };

    const result: Bg3Unit[] = [makeUnit(player, true, arenaW * 0.5, arenaH - 220)];
    const positions: Array<[number, number]> = [
        [arenaW * 0.38, arenaH - 200],
        [arenaW * 0.62, arenaH - 200],
        [arenaW * 0.28, arenaH - 270],
        [arenaW * 0.72, arenaH - 270],
        [arenaW * 0.44, arenaH - 310],
        [arenaW * 0.56, arenaH - 310],
    ];
    selectedCompanions.slice(0, 6).forEach((c, idx) => {
        const [px, py] = positions[idx] || [arenaW * (0.3 + idx * 0.08), arenaH - 210];
        result.push(makeUnit(c, false, px, py));
    });
    return result;
};

export const buildBg3EnemyUnits = (
    enemies: Enemy[],
    region?: string,
    nation?: string,
    arenaW = ARENA_W,
    arenaH = ARENA_H
): Bg3Unit[] => {
    const bossIdx = (enemies || []).findIndex(
        e => Boolean((e as any).isBoss) || Boolean(e.name && /\[보스\]|\[성전 사자\]|\[반역\]|\[국가 지도자\]|\[마신\]/.test(e.name))
    );
    const ordered = [...(enemies || [])];
    if (bossIdx > 0) {
        const [b] = ordered.splice(bossIdx, 1);
        ordered.unshift(b);
    }

    const positions: Array<[number, number]> = [
        [arenaW * 0.50, 230],
        [arenaW * 0.35, 340],
        [arenaW * 0.65, 340],
        [arenaW * 0.24, 270],
        [arenaW * 0.76, 270],
        [arenaW * 0.42, Math.min(480, arenaH * 0.24)],
        [arenaW * 0.58, Math.min(480, arenaH * 0.24)],
        [arenaW * 0.50, Math.min(560, arenaH * 0.28)],
    ];

    return ordered.slice(0, 8).map((enemy, idx) => {
        const isBoss = idx === 0 && (bossIdx >= 0 || ordered.length === 1 || (enemy.maxHp || 0) >= 3000);
        const [x, y] = positions[idx] || [arenaW * 0.5, 240];
        const maxHp = Math.max(80, Math.floor(enemy.maxHp || enemy.hp || 500));
        const hp = Math.max(1, Math.min(maxHp, Math.floor(enemy.hp || maxHp)));
        const rawAtk = (enemy as any).attack ?? enemy.stats?.str ?? enemy.stats?.int ?? 40;
        const rawDef = (enemy as any).defense ?? enemy.stats?.def ?? 15;
        const atk = Math.max(20, Math.floor(rawAtk * 1.15));
        const def = Math.max(8, Math.floor(rawDef * 0.9));
        const agi = Math.max(10, Math.floor((enemy as any).agi || (enemy.level || 1) * 1.1 + 15));
        const wis = Math.max(10, Math.floor((enemy as any).wis || (enemy.level || 1) * 1.0 + 14));
        const mob = inferBg3Mobility(enemy.name || '', isBoss, agi);
        const sprite = resolveEntityRpgSprite(
            { id: enemy.id || `enemy_${idx}`, name: enemy.name, gender: idx % 2 === 0 ? 'male' : 'female' },
            region,
            nation
        );

        return {
            id: `bg3_enemy_${enemy.id || idx}`,
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
            initiative: agi + wis,
            x,
            y,
            radius: isBoss ? 26 : 20,
            moveMeters: mob.moveMeters,
            remainingMeters: mob.moveMeters,
            attackRangeMeters: mob.attackRangeMeters,
            meleeThreatMeters: isBoss ? 2.8 : 2.1,
            dir: 'down',
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            stunnedTurns: 0,
            jobLabel: isBoss ? '보스 / 총사령관' : '적 정예병',
            element: String((enemy as any).element || (enemy as any).shinryokuType || '무속성'),
            skills: (enemy.skills || []).slice(0, 6),
            activeBuffs: [],
            buffAtkMult: 1,
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: enemy.visualUrl,
            enemyTokenPart: inferEnemyTokenPart(enemy.name || '', isBoss, region, idx),
            sourceEntity: enemy
        };
    });
};

/**
 * BG3 이니셔티브 순서 (AGI + WIS 내림차순)
 */
export const buildBg3Initiative = (units: Bg3Unit[]): string[] => {
    return [...units]
        .filter(u => u.hp > 0)
        .sort((a, b) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative;
            if (a.team !== b.team) return a.team === 'ally' ? -1 : 1;
            return b.level - a.level;
        })
        .map(u => u.id);
};

export const getBg3SharedAllyGroup = (order: string[], curIdx: number, units: Bg3Unit[]): string[] => {
    const map = new Map(units.map(u => [u.id, u]));
    const cur = map.get(order[curIdx]);
    if (!cur || cur.team !== 'ally' || cur.hp <= 0) return [];
    const group = [cur.id];
    for (let i = curIdx + 1; i < order.length; i++) {
        const u = map.get(order[i]);
        if (!u || u.hp <= 0) continue;
        if (u.team === 'ally') group.push(u.id);
        else break;
    }
    return group;
};

/**
 * BG3 스킬 조준 형태 & 속성 VFX 테마 판별
 */
export const getBg3SkillTargeting = (unit: Bg3Unit, skill: Skill | null): Bg3SkillTargeting => {
    const text = `${skill?.name || ''} ${skill?.description || ''} ${unit.element || ''}`.toLowerCase();
    let shinryokuType = '무속성';
    let vfxColor = '#f59e0b';
    if (/화염|불|염|태양|피닉스|flame|fire|sun/.test(text)) { shinryokuType = '화염계'; vfxColor = '#f97316'; }
    else if (/전격|번개|뇌|볼트|천둥|lightning|thunder/.test(text)) { shinryokuType = '전격계'; vfxColor = '#38bdf8'; }
    else if (/빙결|얼음|서리|눈|블리자드|ice|frost/.test(text)) { shinryokuType = '빙결계'; vfxColor = '#67e8f9'; }
    else if (/해수|물|파도|오션|water|ocean/.test(text)) { shinryokuType = '해수계'; vfxColor = '#0ea5e9'; }
    else if (/초화|독|맹독|베놈|자연|숲|flora|poison/.test(text)) { shinryokuType = '초화계'; vfxColor = '#4ade80'; }
    else if (/광휘|빛|성|신성|태초|light|holy/.test(text)) { shinryokuType = '광휘계'; vfxColor = '#fde047'; }
    else if (/암연|어둠|심연|그림자|저주|dark|abyss|shadow/.test(text)) { shinryokuType = '암연계'; vfxColor = '#c084fc'; }
    else if (/질풍|바람|폭풍|wind|storm/.test(text)) { shinryokuType = '질풍계'; vfxColor = '#2dd4bf'; }
    else if (/강철|철|대지|지령|steel|earth/.test(text)) { shinryokuType = '강철계'; vfxColor = '#cbd5e1'; }

    if (!skill) {
        return {
            shape: 'single',
            rangeMeters: unit.attackRangeMeters,
            aoeRadiusMeters: 0,
            isSupport: false,
            isRanged: unit.attackRangeMeters >= 3.5,
            shinryokuType,
            vfxColor
        };
    }

    const isSupport = skill.type === SkillType.HEAL || skill.type === SkillType.BUFF;
    const isAoe = Boolean((skill as any).isAoe || /전체|광역|범위|폭발|메테오|폭풍|파동|일섬|브레스|비|대지/.test(text));
    const isCone = /브레스|파동|베기|참격|선풍|부채/.test(text) && isAoe;

    return {
        shape: isCone ? 'cone' : isAoe ? 'circle' : 'single',
        rangeMeters: isSupport ? 14.0 : isCone ? 10.5 : Math.max(unit.attackRangeMeters, skill.type === SkillType.MAGIC ? 14.5 : 5.5),
        aoeRadiusMeters: isAoe ? 5.2 : 0,
        isSupport,
        isRanged: isSupport || skill.type === SkillType.MAGIC || isAoe || unit.attackRangeMeters >= 4.2,
        shinryokuType,
        vfxColor
    };
};

/**
 * 이동 목적지 충돌 검사 (물리 장애물 & 다른 유닛)
 */
export const isPointWalkable = (
    x: number,
    y: number,
    moverId: string,
    obstacles: Bg3Obstacle[],
    units: Bg3Unit[],
    arenaW = ARENA_W,
    arenaH = ARENA_H
): boolean => {
    if (x < 36 || x > arenaW - 36 || y < 36 || y > arenaH - 36) return false;
    for (const obs of obstacles) {
        if (obs.blocksMovement && distPx(x, y, obs.x, obs.y) < obs.radius + 16) return false;
    }
    for (const u of units) {
        if (u.hp > 0 && u.id !== moverId && distPx(x, y, u.x, u.y) < u.radius + 18) return false;
    }
    return true;
};

/**
 * BG3 기회 공격(Opportunity Attack) 위협자 판별:
 * 시작점 (sx, sy)에서 적의 근접 위협 원 안에 있었는데, 목표점 (tx, ty)에서 그 원을 벗어나면 기회 공격 발동!
 */
export const findOpportunityAttackers = (
    mover: Bg3Unit,
    targetX: number,
    targetY: number,
    units: Bg3Unit[]
): Bg3Unit[] => {
    return units.filter(enemy => {
        if (enemy.hp <= 0 || enemy.team === mover.team || !enemy.hasReaction) return false;
        const threatPx = metersToPx(enemy.meleeThreatMeters);
        const wasInside = distPx(mover.x, mover.y, enemy.x, enemy.y) <= threatPx + 10;
        const willBeOutside = distPx(targetX, targetY, enemy.x, enemy.y) > threatPx + 12;
        return wasInside && willBeOutside;
    });
};

/**
 * CombatInterface.tsx와 100% 동일한 calculateDamage 기반 BG3 데미지 산정
 */
export const calculateBg3Damage = (
    attacker: Bg3Unit,
    defender: Bg3Unit,
    skill: Skill | null,
    obstacles: Bg3Obstacle[],
    surfaces: Bg3SurfacePool[],
    playerCharacter: Character
): {
    damage: number;
    isCrit: boolean;
    isMiss: boolean;
    hitChance: number;
    comboName: string | null;
    stunsTarget: boolean;
} => {
    const base = calculateDamage(attacker.sourceEntity, defender.sourceEntity, skill || undefined, playerCharacter);
    const extra = (base.additionalDamage || []).reduce((sum, a) => sum + (a.damage || 0), 0);
    let dmg = Math.max(1, (base.damage || 1) + extra);

    // 장애물(숲/요새) 보너스
    let defBonus = 0;
    let evaBonus = 0;
    obstacles.forEach(obs => {
        if (distPx(defender.x, defender.y, obs.x, obs.y) <= obs.radius + 24) {
            defBonus = Math.max(defBonus, obs.defBonus || 0);
            evaBonus = Math.max(evaBonus, obs.evaBonus || 0);
        }
    });

    // BG3 원소 지면 콤보 판정
    const targeting = getBg3SkillTargeting(attacker, skill);
    const underPool = surfaces.find(s => distPx(defender.x, defender.y, s.x, s.y) <= s.radius + 14);
    let comboName: string | null = null;
    let comboMult = 1.0;
    let stunsTarget = false;

    if (targeting.shinryokuType === '전격계' && underPool?.type === 'water') {
        comboName = '⚡ 과전류 감전 콤보!';
        comboMult = 1.55;
        stunsTarget = true;
    } else if (targeting.shinryokuType === '화염계' && (underPool?.type === 'poison' || evaBonus > 0)) {
        comboName = '🔥 대화재 폭발 콤보!';
        comboMult = 1.5;
    } else if (underPool?.type === 'ice' && (targeting.shinryokuType === '강철계' || !skill)) {
        comboName = '💎 빙결 산산조각!';
        comboMult = 1.4;
    }

    dmg = Math.max(1, Math.round(dmg * (attacker.buffAtkMult || 1) * (1 - defBonus / 150) * comboMult));
    const hitChance = Math.max(55, Math.min(100, Math.round(93 + (attacker.agi - defender.agi) * 0.35 - evaBonus)));

    return {
        damage: dmg,
        isCrit: base.isCrit,
        isMiss: base.isMiss,
        hitChance,
        comboName,
        stunsTarget
    };
};

/**
 * BG3 밀치기(Shove) — 적을 4.2m 뒤로 밀어 장애물 충돌/용암 추락 피해
 */
export const resolveBg3Shove = (
    caster: Bg3Unit,
    target: Bg3Unit,
    obstacles: Bg3Obstacle[],
    surfaces: Bg3SurfacePool[],
    arenaW = ARENA_W,
    arenaH = ARENA_H
): { newX: number; newY: number; bonusDamage: number; reason: string } => {
    const dx = target.x - caster.x;
    const dy = target.y - caster.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const pushPx = metersToPx(4.2);

    let nx = target.x;
    let ny = target.y;
    let bonusDamage = 0;
    let reason = '4m 밀쳐냄!';

    for (let step = 1; step <= 8; step++) {
        const testX = target.x + ux * (pushPx * (step / 8));
        const testY = target.y + uy * (pushPx * (step / 8));
        if (testX < 40 || testX > arenaW - 40 || testY < 40 || testY > arenaH - 40) {
            bonusDamage = Math.max(120, Math.round(caster.atk * 0.65));
            reason = '전장 외벽 충돌 추가 피해!';
            break;
        }
        const hitObs = obstacles.find(o => o.blocksMovement && distPx(testX, testY, o.x, o.y) < o.radius + 18);
        if (hitObs) {
            bonusDamage = Math.max(120, Math.round(caster.atk * 0.65));
            reason = `${hitObs.label} 충돌 추가 피해!`;
            break;
        }
        nx = testX;
        ny = testY;
    }

    const inFire = surfaces.find(s => s.type === 'fire' && distPx(nx, ny, s.x, s.y) <= s.radius);
    if (inFire && bonusDamage === 0) {
        bonusDamage = Math.max(150, Math.round(target.maxHp * 0.1));
        reason = '화염 지대 추락 화상 피해!';
    }

    return { newX: nx, newY: ny, bonusDamage, reason };
};

export const createBg3SurfaceFromSkill = (
    x: number,
    y: number,
    shinryokuType: string
): Bg3SurfacePool | null => {
    const map: Record<string, Bg3SurfaceType> = {
        '화염계': 'fire',
        '전격계': 'electrified',
        '빙결계': 'ice',
        '해수계': 'water',
        '초화계': 'poison',
        '광휘계': 'holy'
    };
    const type = map[shinryokuType];
    if (!type) return null;
    return { id: `surf_${Date.now()}_${Math.random()}`, x, y, radius: 68, type, turns: 3 };
};
