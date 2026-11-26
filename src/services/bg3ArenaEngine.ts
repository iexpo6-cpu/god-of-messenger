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
import { PRESET_ENEMIES } from '../constants';
import { calculateDamage, calculateFinalStats, getEntityAllCombatSkills } from '../utils';
import { resolveEffectiveSkillZone, resolveWeaponBasicAttackZone, getTeleportRangeByTier, getEffectiveTeleportRange, getSummonLevelStatMultiplier } from './skillZoneService';
import { MountCombatService } from './mountCombatService';
import { getAllyMaxBreakGauge, getEnemyMaxBreakGauge } from './shinryokuBreakService';
import { CityCultureKey, resolveCityCultureKey } from './cityAssetManifest';
import {
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from './rpgSpriteManifest';

export type Bg3ArenaTier = 'skirmish' | 'boss' | 'mythic_boss' | 'war';

export const SKIRMISH_ARENA_W = 1536;   // 48m (일반 사냥 · 던전 · 1:1 대련/승급전 — 여유로운 전술 공간!)
export const SKIRMISH_ARENA_H = 1056;   // 33m
export const BOSS_ARENA_W = 2880;       // 90m (일반 보스 결전)
export const BOSS_ARENA_H = 1920;       // 60m
export const ARENA_W = 4160;            // 130m (신화 보스 · 신계 보스 · 절대신 결전)
export const ARENA_H = 2880;            // 90m
export const WAR_ARENA_W = 6080;        // 190m (국가/신계/마계 전면전 · 성전 공방전)
export const WAR_ARENA_H = 4160;        // 130m
export const PX_PER_METER = 32;         // 1m = 32px

export const getArenaDimensions = (tier: Bg3ArenaTier): { width: number; height: number } => {
    if (tier === 'skirmish') return { width: SKIRMISH_ARENA_W, height: SKIRMISH_ARENA_H };
    if (tier === 'boss') return { width: BOSS_ARENA_W, height: BOSS_ARENA_H };
    if (tier === 'war') return { width: WAR_ARENA_W, height: WAR_ARENA_H };
    return { width: ARENA_W, height: ARENA_H }; // mythic_boss
};

export const isMythicBossEntity = (enemy?: Enemy | null): boolean => {
    if (!enemy) return false;
    const id = String(enemy.id || '').toLowerCase();
    const name = String(enemy.name || '');
    if (id.startsWith('mythicboss_') || id.startsWith('season_boss_') || id.startsWith('boss_') || id.includes('mythic') || id.includes('ella')) return true;
    if ((enemy as any).isMythicBoss || (enemy as any).isSeasonalBoss) return true;
    if (/절대신|태양의 사자|월광의 사자|마신|\[신화\]|\[성전 사자\]/.test(name)) return true;
    if (Boolean((enemy as any).isBoss) && (((enemy as any).critResist || 0) >= 15 || (enemy.level || 0) >= 3000)) return true;
    return false;
};

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
    icon?: string;
    imageUrl?: string;
    effectSummary?: string;
    statBonuses?: Record<string, number>;
}

export interface Bg3StatusEffect {
    name: string;
    kind: 'dot' | 'cc' | 'debuff';
    turns: number;
    dotRatio?: number;
    atkDebuffMult?: number;
    defDebuffMult?: number;
    color: string;
}

export interface Bg3Unit {
    id: string;
    name: string;
    team: 'ally' | 'enemy';
    isPlayer: boolean;
    isBoss: boolean;
    isMythicBoss?: boolean;
    isSummon?: boolean;
    summonTurnsLeft?: number;
    isDefending?: boolean;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    shieldHp: number;
    maxShieldHp: number;
    breakGauge?: number;
    maxBreakGauge?: number;
    manaShieldRatio: number; // 0~0.6 (마나 쉴드: 피해의 일정 비율을 MP로 흡수)
    passiveDmgRedPct: number;
    passiveLifestealPct: number;
    passiveReflectPct: number;
    atk: number;
    def: number;
    str: number;
    int: number;
    agi: number;
    wis: number;
    ctrl: number;
    initiative: number; // AGI + WIS
    x: number;
    y: number;
    radius: number;     // 충돌 반경 (px)
    moveMeters: number;
    remainingMeters: number;
    attackRangeMeters: number;
    meleeThreatMeters: number;
    weaponLabel: string;
    dir: SpriteDirection;
    hasAction: boolean;
    hasBonusAction: boolean;
    hasReaction: boolean;
    stunnedTurns: number;
    jobLabel: string;
    element: string;
    skills: Skill[];
    activeBuffs: Bg3ActiveBuff[];
    activeStatuses: Bg3StatusEffect[];
    buffAtkMult: number;
    spriteUrl: string;
    regionKey: RpgSpriteRegionKey;
    genderKey: RpgSpriteGenderKey;
    visualUrl?: string;
    enemyTokenPart?: string;
    mountName?: string;
    mountVisualUrl?: string;
    mountEntity?: Companion;
    sourceEntity: Character | Companion | Enemy;
    sourceCompanionId?: string;
}

export interface Bg3ArenaData {
    width: number;
    height: number;
    arenaTier: Bg3ArenaTier;
    cultureKey: CityCultureKey;
    obstacles: Bg3Obstacle[];
    initialSurfaces: Bg3SurfacePool[];
    title: string;
    subtitle: string;
}

export interface Bg3SkillTargeting {
    shape: 'single' | 'circle' | 'cone' | 'square';
    rangeMeters: number;
    aoeRadiusMeters: number;
    coneAngleDeg: number;
    squareWidthMeters: number;
    squareLengthMeters: number;
    isSupport: boolean;
    isSummon: boolean;
    isDebuff: boolean;
    isTeleport?: boolean;
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
 * AGI 능력치 기반 1턴 이동 거리(m) 산출 (최대 20.0m, AGI 1억 도달 시 최대치!)
 * - AGI 10: ~6.9m | AGI 100: ~8.8m | AGI 1,000: ~10.6m
 * - AGI 10만: ~14.4m | AGI 100만: ~16.3m | AGI 1,000만: ~18.1m | AGI 1억: 20.0m (MAX)
 */
export const computeAgiMoveMeters = (agi: number, jobBonus = 0): number => {
    const safeAgi = Math.max(1, agi || 1);
    const agiRatio = Math.min(1, Math.log10(safeAgi) / 8); // log10(100,000,000) === 8
    const rawMeters = 5.0 + agiRatio * 15.0 + jobBonus * 0.25;
    return Math.round(Math.max(5.0, Math.min(20.0, rawMeters)) * 10) / 10;
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
    arenaTier?: Bg3ArenaTier;
}): Bg3ArenaData => {
    const tier: Bg3ArenaTier = params.arenaTier || (params.isLargeWar ? 'war' : 'boss');
    const { width: W, height: H } = getArenaDimensions(tier);
    const isWar = tier === 'war';
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

    if (isWar) {
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
        ...(isWar
            ? [
                  { id: 'surf_war_1', x: W * 0.36, y: H * 0.48, radius: 92, type: (isMagye ? 'fire' : 'water') as Bg3SurfaceType, turns: 99 },
                  { id: 'surf_war_2', x: W * 0.64, y: H * 0.48, radius: 92, type: (isShingye ? 'holy' : 'water') as Bg3SurfaceType, turns: 99 }
              ]
            : [])
    ];

    return { width: W, height: H, arenaTier: tier, cultureKey, obstacles, initialSurfaces, title: params.title, subtitle: params.subtitle };
};

/**
 * 패시브 스킬 및 기존 statusEffects에서 전투 보정치(피해감소 · 흡혈 · 반사 · 실제 MP 비례 마나쉴드량) 정확 추출
 */
const extractPassiveCombatBonuses = (skills: Skill[], maxHp: number, maxMp: number, existingStatuses?: any[]) => {
    let dmgRedPct = 0;
    let lifestealPct = 0;
    let reflectPct = 0;
    let manaShieldRatio = 0;
    let initialShieldHp = 0;

    // 1. 기존 statusEffects에 이미 부여된 마나 쉴드 / 보호막 수치(val) 계승
    if (Array.isArray(existingStatuses)) {
        for (const st of existingStatuses) {
            if (!st) continue;
            const n = String(st.name || '');
            if (/마나\s*쉴드|보호막|쉴드|shield|barrier/i.test(n) && (st.val || 0) > 0) {
                initialShieldHp += Math.floor(st.val);
            }
        }
    }

    // 2. 패시브 스킬에서 실제 CombatUtils 공식(maxMp * ratio%)으로 마나 쉴드량 계산
    for (const sk of skills || []) {
        if (!sk) continue;
        const txt = `${sk.name || ''} ${sk.description || ''} ${sk.effectFormula || ''}`;
        const lower = txt.toLowerCase();
        const msMatch = txt.match(/MANA_SHIELD\]\s*(\d+(?:\.\d+)?)%(?:\s*\(\+(\d+(?:\.\d+)?)%\s*per\s*Lv\))?/i);
        if (msMatch) {
            const base = parseFloat(msMatch[1] || '30');
            const scale = parseFloat(msMatch[2] || '5');
            const ratio = base + scale * (sk.level || 1);
            initialShieldHp += Math.floor(maxMp * (ratio / 100));
            manaShieldRatio = Math.max(manaShieldRatio, 0.35);
        } else if (/마나\s*쉴드|마력\s*방벽|마나\s*장막|mana\s*shield/.test(lower) && sk.type === SkillType.PASSIVE) {
            initialShieldHp += Math.floor(maxMp * (0.35 + (sk.level || 1) * 0.05));
            manaShieldRatio = Math.max(manaShieldRatio, 0.35);
        } else if (/보호막|방어막|실드|결계/.test(lower) && sk.type === SkillType.PASSIVE) {
            initialShieldHp += Math.round(maxHp * 0.18);
        }

        if (sk.type === SkillType.PASSIVE && Array.isArray(sk.passiveEffects)) {
            for (const pe of sk.passiveEffects) {
                const t = String(pe.target || '').toLowerCase();
                const val = Number(pe.value || 0);
                if (t.includes('피해 감소') || t.includes('받는 피해')) dmgRedPct += val;
                if (t.includes('흡혈') || t.includes('생명력 흡수')) lifestealPct += val;
                if (t.includes('반사')) reflectPct += val;
                if (t.includes('마나 쉴드') || t.includes('마나쉴드')) initialShieldHp += Math.floor((maxMp * val) / 100);
                else if (t.includes('보호막')) initialShieldHp += Math.round((maxHp * val) / 100);
            }
        }
    }

    return {
        passiveDmgRedPct: Math.min(60, dmgRedPct),
        passiveLifestealPct: Math.min(40, lifestealPct),
        passiveReflectPct: Math.min(35, reflectPct),
        manaShieldRatio,
        initialShieldHp
    };
};

export const buildBg3AllyUnits = (
    player: Character,
    selectedCompanions: Companion[],
    region?: string,
    nation?: string,
    arenaW = ARENA_W,
    arenaH = ARENA_H,
    challengerCompanionId?: string
): Bg3Unit[] => {
    const makeUnit = (entity: Character | Companion, isPlayer: boolean, x: number, y: number): Bg3Unit => {
        const calc = calculateFinalStats(entity as any);
        const finalStats = calc?.finalStats || entity.stats || ({} as any);
        const maxHp = Math.max(1, Math.floor(finalStats.maxHp || entity.stats?.maxHp || 1));
        const hp = Math.max(1, Math.min(maxHp, Math.floor(entity.stats?.hp || maxHp)));
        const maxMp = Math.max(0, Math.floor(finalStats.maxMp || entity.stats?.maxMp || 0));
        const mp = Math.max(0, Math.min(maxMp, Math.floor(entity.stats?.mp || maxMp)));
        const atk = Math.max(20, Math.floor(Math.max(finalStats.str || 0, finalStats.int || 0) * 1.4 + (entity.level || 1) * 4));
        const def = Math.max(10, Math.floor((finalStats.def || 10) * 0.9 + (entity.level || 1) * 1.5));
        const str = Math.max(10, Math.floor(finalStats.str || 20));
        const intStat = Math.max(10, Math.floor(finalStats.int || 20));
        const agi = Math.max(10, Math.floor(finalStats.agi || 20));
        const wis = Math.max(10, Math.floor(finalStats.wis || 20));
        const ctrl = Math.max(10, Math.floor(finalStats.ctrl || 20));
        const jobLabel = String(entity.job || '모험가');
        const mob = inferBg3Mobility(jobLabel, false, agi);
        const weaponZone = resolveWeaponBasicAttackZone(entity);
        const sprite = resolveEntityRpgSprite(entity, region, nation);
        const allSkills = getEntityAllCombatSkills(entity as any).filter(Boolean);
        const passiveBonuses = extractPassiveCombatBonuses(allSkills, maxHp, maxMp, (entity as any).statusEffects);
        const skills = allSkills.filter(s => s.type !== SkillType.PASSIVE);
        const activeMount = MountCombatService.getActiveMount(entity as any, player);
        const validMount = activeMount && ((activeMount.stats?.hp ?? 1) > 0 && !activeMount.isDead) ? activeMount : undefined;
        const resolveMountVisual = (m?: Companion): string | undefined => {
            if (!m) return undefined;
            const direct = (m as any).monsterData?.visualUrl || m.visualUrl || (m as any).imageUrl || (m as any).appearance;
            if (typeof direct === 'string' && /^(https?:|data:|blob:|\/|\.\/|assets\/)/i.test(direct.trim())) {
                return direct.trim();
            }
            const cleanName = (m.name || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
            const preset = PRESET_ENEMIES.find(p => p.name && (p.name === cleanName || cleanName.includes(p.name) || p.name.includes(cleanName)));
            return preset?.visualUrl;
        };
        const resolvedMountVisual = resolveMountVisual(validMount);
        const maxBrk = getAllyMaxBreakGauge(player, entity as any);

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
            shieldHp: passiveBonuses.initialShieldHp,
            maxShieldHp: Math.max(passiveBonuses.initialShieldHp, Math.round(maxHp * 0.35)),
            breakGauge: maxBrk,
            maxBreakGauge: maxBrk,
            manaShieldRatio: passiveBonuses.manaShieldRatio,
            passiveDmgRedPct: passiveBonuses.passiveDmgRedPct,
            passiveLifestealPct: passiveBonuses.passiveLifestealPct,
            passiveReflectPct: passiveBonuses.passiveReflectPct,
            atk,
            def,
            str,
            int: intStat,
            agi,
            wis,
            ctrl,
            initiative: agi + wis,
            x,
            y,
            radius: 20,
            moveMeters: mob.moveMeters,
            remainingMeters: mob.moveMeters,
            attackRangeMeters: weaponZone.rangeMeters,
            meleeThreatMeters: weaponZone.isRanged ? 2.0 : Math.max(2.4, Math.min(3.8, weaponZone.rangeMeters)),
            weaponLabel: weaponZone.weaponLabel,
            dir: 'up',
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            stunnedTurns: 0,
            jobLabel,
            element: String((entity as any).shinryokuType || '무속성'),
            skills,
            activeBuffs: [],
            activeStatuses: [],
            buffAtkMult: 1,
            mountName: validMount?.name,
            mountVisualUrl: resolvedMountVisual,
            mountEntity: validMount,
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: entity.visualUrl,
            sourceEntity: entity,
            sourceCompanionId: isPlayer ? undefined : entity.id
        };
    };

    if (challengerCompanionId) {
        const challenger = (player.companions || []).find(c => c.id === challengerCompanionId) || selectedCompanions.find(c => c.id === challengerCompanionId);
        if (challenger) {
            return [makeUnit(challenger, false, arenaW * 0.5, arenaH - 220)];
        }
    }

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
        const isMythic = isMythicBossEntity(enemy);
        const isNamedBoss = Boolean((enemy as any).isBoss) || Boolean(enemy.name && /\[보스\]|\[BOSS\]|\[성전 사자\]|\[반역\]|\[국가 지도자\]|\[마신\]/.test(enemy.name));
        const isBoss = isMythic || isNamedBoss;
        const [x, y] = positions[idx] || [arenaW * 0.5, 240];
        let calcFinal: any = null;
        try {
            calcFinal = calculateFinalStats(enemy as any)?.finalStats || null;
        } catch {
            calcFinal = null;
        }
        const rawAtk = (enemy as any).attack ?? enemy.stats?.str ?? enemy.stats?.int ?? 40;
        const rawDef = (enemy as any).defense ?? enemy.stats?.def ?? 15;
        const maxHp = Math.max(
            80,
            Math.floor(calcFinal?.maxHp || 0),
            Math.floor(enemy.maxHp || 0),
            Math.floor(enemy.stats?.maxHp || 0),
            Math.floor(enemy.hp || 500)
        );
        const maxMp = Math.max(
            100,
            Math.floor(calcFinal?.maxMp || 0),
            Math.floor((enemy as any).maxMp || 0),
            Math.floor(enemy.stats?.maxMp || 0),
            1000
        );
        // 전투 등장 시 몬스터는 항상 최대 HP/MP(100%)로 완충 + 원래 stats.maxHp 보존(이중 배율 방지)
        const hp = maxHp;
        const mp = maxMp;
        const syncedEnemy: Enemy = {
            ...enemy,
            hp: maxHp,
            maxHp,
            stats: enemy.stats
                ? { ...enemy.stats, hp: maxHp, mp: maxMp }
                : {
                      hp: maxHp,
                      maxHp,
                      mp: maxMp,
                      maxMp,
                      str: Math.max(10, Math.floor(calcFinal?.str || rawAtk)),
                      int: Math.max(10, Math.floor(calcFinal?.int || rawAtk)),
                      agi: Math.max(10, Math.floor(calcFinal?.agi || (enemy as any).agi || (enemy.level || 1) * 1.1 + 15)),
                      wis: Math.max(10, Math.floor(calcFinal?.wis || (enemy as any).wis || (enemy.level || 1) * 1.0 + 14)),
                      def: Math.max(8, Math.floor(calcFinal?.def || rawDef)),
                      ctrl: Math.max(10, Math.floor(calcFinal?.ctrl || (enemy.level || 1) * 1.0 + 10))
                  }
        };
        const str = Math.max(10, Math.floor(calcFinal?.str || enemy.stats?.str || rawAtk));
        const intStat = Math.max(10, Math.floor(calcFinal?.int || enemy.stats?.int || rawAtk));
        const agi = Math.max(10, Math.floor(calcFinal?.agi || enemy.stats?.agi || (enemy as any).agi || (enemy.level || 1) * 1.1 + 15));
        const wis = Math.max(10, Math.floor(calcFinal?.wis || enemy.stats?.wis || (enemy as any).wis || (enemy.level || 1) * 1.0 + 14));
        const def = Math.max(8, Math.floor(calcFinal?.def || enemy.stats?.def || rawDef));
        const ctrl = Math.max(10, Math.floor(calcFinal?.ctrl || enemy.stats?.ctrl || (enemy.level || 1) * 1.0 + 10));
        const atk = Math.max(20, Math.floor(Math.max(str, intStat) * 1.4 + (enemy.level || 1) * 4));
        const mob = inferBg3Mobility(enemy.name || '', isBoss, agi);
        const weaponZone = resolveWeaponBasicAttackZone(syncedEnemy);
        const passiveBonuses = extractPassiveCombatBonuses(enemy.skills || [], maxHp, maxMp, (enemy as any).statusEffects);
        const sprite = resolveEntityRpgSprite(
            { id: enemy.id || `enemy_${idx}`, name: enemy.name, gender: idx % 2 === 0 ? 'male' : 'female' },
            region,
            nation
        );

        const maxBrk = getEnemyMaxBreakGauge(enemy);
        return {
            id: `bg3_enemy_${enemy.id || idx}`,
            name: enemy.name || `적군 ${idx + 1}`,
            team: 'enemy',
            isPlayer: false,
            isBoss,
            isMythicBoss: isMythic,
            level: enemy.level || 1,
            hp,
            maxHp,
            mp,
            maxMp,
            shieldHp: passiveBonuses.initialShieldHp,
            maxShieldHp: Math.max(passiveBonuses.initialShieldHp, Math.round(maxHp * 0.25)),
            breakGauge: maxBrk,
            maxBreakGauge: maxBrk,
            manaShieldRatio: passiveBonuses.manaShieldRatio,
            passiveDmgRedPct: passiveBonuses.passiveDmgRedPct,
            passiveLifestealPct: passiveBonuses.passiveLifestealPct,
            passiveReflectPct: passiveBonuses.passiveReflectPct,
            atk,
            def,
            str,
            int: intStat,
            agi,
            wis,
            ctrl,
            initiative: agi + wis,
            x,
            y,
            radius: isBoss ? 26 : 20,
            moveMeters: mob.moveMeters,
            remainingMeters: mob.moveMeters,
            attackRangeMeters: Math.max(mob.attackRangeMeters, weaponZone.rangeMeters),
            meleeThreatMeters: isBoss ? 3.2 : 2.3,
            weaponLabel: weaponZone.weaponLabel,
            dir: 'down',
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            stunnedTurns: 0,
            jobLabel: isBoss ? '보스 / 총사령관' : '적 정예병',
            element: String((enemy as any).element || (enemy as any).shinryokuType || '무속성'),
            skills: (enemy.skills || []).filter(s => s.type !== SkillType.PASSIVE).slice(0, 6),
            activeBuffs: [],
            activeStatuses: [],
            buffAtkMult: 1,
            spriteUrl: sprite.url,
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            visualUrl: enemy.visualUrl,
            enemyTokenPart: inferEnemyTokenPart(enemy.name || '', isBoss, region, idx),
            sourceEntity: syncedEnemy
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
 * BG3 스킬 조준 형태 (단일 TargetRadius / 광역 Cone · Square · Target) & 무기별 일반공격 범위 판별
 */
export const getBg3SkillTargeting = (unit: Bg3Unit, skill: Skill | null): Bg3SkillTargeting => {
    const text = `${skill?.name || ''} ${skill?.description || ''} ${unit.element || ''}`.toLowerCase();
    let shinryokuType = (skill as any)?.shinryokuType || '무속성';
    let vfxColor = skill?.vfxColor || '#f59e0b';
    if (!skill?.vfxColor) {
        if (/화염|불|염|태양|피닉스|flame|fire|sun/.test(text)) { shinryokuType = '화염계'; vfxColor = '#f97316'; }
        else if (/전격|번개|뇌|볼트|천둥|lightning|thunder/.test(text)) { shinryokuType = '전격계'; vfxColor = '#38bdf8'; }
        else if (/빙결|얼음|서리|눈|블리자드|ice|frost/.test(text)) { shinryokuType = '빙결계'; vfxColor = '#67e8f9'; }
        else if (/해수|물|파도|오션|water|ocean/.test(text)) { shinryokuType = '해수계'; vfxColor = '#0ea5e9'; }
        else if (/초화|독|맹독|베놈|자연|숲|flora|poison/.test(text)) { shinryokuType = '초화계'; vfxColor = '#4ade80'; }
        else if (/광휘|빛|성|신성|태초|light|holy/.test(text)) { shinryokuType = '광휘계'; vfxColor = '#fde047'; }
        else if (/암연|어둠|심연|그림자|저주|dark|abyss|shadow/.test(text)) { shinryokuType = '암연계'; vfxColor = '#c084fc'; }
        else if (/질풍|바람|폭풍|wind|storm/.test(text)) { shinryokuType = '질풍계'; vfxColor = '#2dd4bf'; }
        else if (/강철|철|대지|지령|steel|earth/.test(text)) { shinryokuType = '강철계'; vfxColor = '#cbd5e1'; }
    }

    // 일반공격: 장착 무기별 고유 사거리 유지, 타겟팅은 항상 단일(single)로 1명만 정확히 공격!
    if (!skill) {
        const wep = resolveWeaponBasicAttackZone(unit.sourceEntity);
        return {
            shape: 'single',
            rangeMeters: wep.rangeMeters,
            aoeRadiusMeters: 0,
            coneAngleDeg: 60,
            squareWidthMeters: 0,
            squareLengthMeters: 0,
            isSupport: false,
            isSummon: false,
            isDebuff: false,
            isRanged: wep.isRanged,
            shinryokuType,
            vfxColor
        };
    }

    // 순수 이동(텔레포트) 스킬 -> 장애물·기회공격 무시하고 지정 위치로 즉시 순간이동
    if (skill.type === SkillType.TELEPORT) {
        const maxRange = getEffectiveTeleportRange(skill);
        return {
            shape: 'circle',
            rangeMeters: maxRange,
            aoeRadiusMeters: 0.9,
            coneAngleDeg: 60,
            squareWidthMeters: 0,
            squareLengthMeters: 0,
            isSupport: false,
            isSummon: false,
            isDebuff: false,
            isTeleport: true,
            isRanged: true,
            shinryokuType,
            vfxColor: skill.vfxColor || '#c084fc'
        };
    }

    // [FIX] 물리/마법/버프/디버프/회복 스킬 설명에 '소환' 단어가 들어있어도 소환 스킬로 오인하지 않도록 명시적 타입/플래그만 판정!
    const isExplicitNonSummon =
        skill.type === SkillType.PHYSICAL ||
        skill.type === SkillType.MAGIC ||
        skill.type === SkillType.BUFF ||
        skill.type === SkillType.DEBUFF ||
        skill.type === SkillType.HEAL;
    const isSummon = Boolean(
        skill.type === SkillType.SUMMON ||
            skill.type === SkillType.CLONE ||
            skill.isSummonSkill ||
            (!isExplicitNonSummon && /분신술|소환수|정령\s*소환|사역마\s*소환/.test(text))
    );
    const isSupport = skill.type === SkillType.HEAL || skill.type === SkillType.BUFF;
    const isDebuff = skill.type === SkillType.DEBUFF;

    if (isSummon) {
        return {
            shape: 'circle',
            rangeMeters: 9.0,
            aoeRadiusMeters: 2.2,
            coneAngleDeg: 60,
            squareWidthMeters: 0,
            squareLengthMeters: 0,
            isSupport: false,
            isSummon: true,
            isDebuff: false,
            isRanged: true,
            shinryokuType,
            vfxColor: '#38bdf8'
        };
    }

    const eff = resolveEffectiveSkillZone(skill);
    // 장착 무기 기본 사거리를 기준으로 스킬 범위(TargetRadius / ConeLength / SquareLength)에 합산!
    const wepBonusMeters = resolveWeaponBasicAttackZone(unit.sourceEntity).rangeMeters;

    // 보스 / 신화 보스 몬스터 전용 대형 광역 스킬 범위 자동 승격 & 확장!
    if (unit.isBoss && !skill.zoneConfig && !isSupport) {
        const isMyth = Boolean(unit.isMythicBoss);
        if (/브레스|포효|참격|베기|선풍|파도|날개|폭풍/.test(text)) {
            return {
                shape: 'cone',
                rangeMeters: isMyth ? 24 : 16,
                aoeRadiusMeters: 0,
                coneAngleDeg: isMyth ? 135 : 100,
                squareWidthMeters: 0,
                squareLengthMeters: 0,
                isSupport: false,
                isSummon: false,
                isDebuff,
                isRanged: true,
                shinryokuType,
                vfxColor
            };
        }
        if (/진격|돌진|창|일섬|관통|광선|레이저|빔|낙뢰|연격/.test(text)) {
            return {
                shape: 'square',
                rangeMeters: isMyth ? 26 : 18,
                aoeRadiusMeters: 0,
                coneAngleDeg: 60,
                squareWidthMeters: isMyth ? 11 : 7,
                squareLengthMeters: isMyth ? 26 : 18,
                isSupport: false,
                isSummon: false,
                isDebuff,
                isRanged: true,
                shinryokuType,
                vfxColor
            };
        }
        if (/영역|소멸|정화|소용돌이|붕괴|지진|폭발|버스트|메테오|군림|심판|파멸|대지/.test(text) || eff.isAoe) {
            return {
                shape: 'circle',
                rangeMeters: isMyth ? 28 : 20,
                aoeRadiusMeters: isMyth ? 11.5 : 7.5,
                coneAngleDeg: 60,
                squareWidthMeters: 0,
                squareLengthMeters: 0,
                isSupport: false,
                isSummon: false,
                isDebuff,
                isRanged: true,
                shinryokuType,
                vfxColor
            };
        }
    }

    const shape: Bg3SkillTargeting['shape'] =
        eff.zoneType === 'cone'
            ? 'cone'
            : eff.zoneType === 'square'
            ? 'square'
            : eff.zoneType === 'target'
            ? 'circle'
            : 'single';

    const rangeMeters =
        shape === 'cone'
            ? +(eff.coneLength + wepBonusMeters).toFixed(1)
            : shape === 'square'
            ? +(eff.squareLength + wepBonusMeters).toFixed(1)
            : +(eff.targetRadius + wepBonusMeters).toFixed(1);

    return {
        shape,
        rangeMeters,
        aoeRadiusMeters: shape === 'circle' ? eff.areaRadius : 0,
        coneAngleDeg: eff.coneAngle,
        squareWidthMeters: eff.squareWidth,
        squareLengthMeters: +(eff.squareLength + wepBonusMeters).toFixed(1),
        isSupport,
        isSummon: false,
        isDebuff,
        isRanged: isSupport || isDebuff || skill.type === SkillType.MAGIC || shape === 'circle' || rangeMeters >= 5.5,
        shinryokuType,
        vfxColor
    };
};

/**
 * Square(회전 직사각형 OBB) 내부 피격 판정
 */
export const isPointInSquareZone = (
    casterX: number,
    casterY: number,
    aimX: number,
    aimY: number,
    widthPx: number,
    lengthPx: number,
    px: number,
    py: number,
    padPx = 14
): boolean => {
    const ang = Math.atan2(aimY - casterY, aimX - casterX);
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const dx = px - casterX;
    const dy = py - casterY;
    const forward = dx * cos + dy * sin;
    const lateral = Math.abs(-dx * sin + dy * cos);
    return forward >= -padPx && forward <= lengthPx + padPx && lateral <= widthPx * 0.5 + padPx;
};

/**
 * Cone(가변 길이 · 가변 각도) 내부 피격 판정
 */
export const isPointInConeZone = (
    casterX: number,
    casterY: number,
    aimX: number,
    aimY: number,
    lengthPx: number,
    angleDeg: number,
    px: number,
    py: number,
    padPx = 14
): boolean => {
    const d = distPx(casterX, casterY, px, py);
    if (d > lengthPx + padPx) return false;
    const aimAng = Math.atan2(aimY - casterY, aimX - casterX);
    let diff = Math.atan2(py - casterY, px - casterX) - aimAng;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const halfRad = ((angleDeg * Math.PI) / 180) * 0.5;
    return Math.abs(diff) <= halfRad + 0.12;
};

/**
 * 보호막(Shield) 및 마나 쉴드(MP 흡수) + 패시브 피해 감소 통합 계산
 */
export const absorbBg3ShieldAndMana = (
    unit: Bg3Unit,
    rawDamage: number
): { hpDamage: number; shieldAbsorbed: number; mpAbsorbed: number; nextShieldHp: number; nextMp: number } => {
    let rem = Math.max(1, Math.round(rawDamage * (1 - (unit.passiveDmgRedPct || 0) / 100)));
    let shieldAbsorbed = 0;
    let mpAbsorbed = 0;
    let nextShieldHp = unit.shieldHp || 0;
    let nextMp = unit.mp || 0;

    // 1. 일반 보호막 우선 흡수
    if (nextShieldHp > 0 && rem > 0) {
        shieldAbsorbed = Math.min(nextShieldHp, rem);
        nextShieldHp -= shieldAbsorbed;
        rem -= shieldAbsorbed;
    }

    // 2. 마나 쉴드(MP로 잔여 피해 일부 흡수)
    if ((unit.manaShieldRatio || 0) > 0 && nextMp > 0 && rem > 0) {
        const wantAbsorb = Math.round(rem * unit.manaShieldRatio);
        const mpNeeded = Math.max(1, Math.round(wantAbsorb * 0.25));
        const actualMp = Math.min(nextMp, mpNeeded);
        mpAbsorbed = Math.min(rem, Math.round(actualMp * 4));
        nextMp -= actualMp;
        rem = Math.max(0, rem - mpAbsorbed);
    }

    return { hpDamage: rem, shieldAbsorbed, mpAbsorbed, nextShieldHp, nextMp };
};

/**
 * 소환 스킬 / 닌자 분신 스킬 시전 시 전장에 독립 아군 Bg3Unit 실체화
 */
export const createBg3SummonUnits = (
    caster: Bg3Unit,
    skill: Skill,
    spawnX: number,
    spawnY: number,
    arenaW: number,
    arenaH: number
): Bg3Unit[] => {
    const sData = skill.summonData;
    const isNinjaClone = skill.type === SkillType.CLONE || /분신/.test(skill.name || '');
    const tierStr = String(skill.tier || '').toUpperCase();
    const maxClones = isNinjaClone ? (tierStr.includes('FINAL') ? 5 : tierStr.includes('LAST') ? 3 : 2) : 3;
    const count = Math.max(1, Math.min(maxClones, sData?.summonCount || (isNinjaClone ? 2 : 1)));
    const baseStatMult = isNinjaClone
        ? (tierStr.includes('FINAL') ? 0.65 : tierStr.includes('LAST') ? 0.5 : 0.35)
        : (sData?.powerLevel === 'high' ? 0.75 : sData?.powerLevel === 'medium' ? 0.55 : 0.4);
    const statMult = baseStatMult * getSummonLevelStatMultiplier(skill);
    const duration = Math.max(2, Math.min(6, sData?.durationTurns || 3));
    const baseName = sData?.summonName || (isNinjaClone ? `${caster.name}의 분신` : `${caster.name}의 소환수`);

    const spawned: Bg3Unit[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const sx = Math.max(54, Math.min(arenaW - 54, spawnX + Math.cos(angle) * (count > 1 ? 48 : 0)));
        const sy = Math.max(54, Math.min(arenaH - 54, spawnY + Math.sin(angle) * (count > 1 ? 48 : 0)));
        const maxHp = Math.max(200, Math.round(caster.maxHp * statMult));
        spawned.push({
            ...caster,
            id: `bg3_summon_${Date.now()}_${i}_${Math.floor(Math.random() * 999)}`,
            name: count > 1 ? `${baseName} #${i + 1}` : baseName,
            isPlayer: false,
            isBoss: false,
            isSummon: true,
            summonTurnsLeft: duration,
            hp: maxHp,
            maxHp,
            mp: Math.round(caster.maxMp * 0.5),
            maxMp: Math.round(caster.maxMp * 0.5),
            shieldHp: 0,
            maxShieldHp: Math.round(maxHp * 0.2),
            atk: Math.max(30, Math.round(caster.atk * statMult)),
            def: Math.max(15, Math.round(caster.def * statMult)),
            x: sx,
            y: sy,
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            remainingMeters: caster.moveMeters,
            jobLabel: isNinjaClone ? '닌자 분신' : '소환수',
            visualUrl: sData?.summonImageUrl || caster.visualUrl,
            mountName: undefined,
            mountVisualUrl: undefined,
            mountEntity: undefined,
            activeBuffs: [],
            activeStatuses: [],
            // 닌자 분신은 정규 ninjaCloneService 규칙에 따라 일반 공격 전용!
            skills: isNinjaClone ? [] : caster.skills.filter(s => s.type !== SkillType.SUMMON && s.type !== SkillType.CLONE).slice(0, 3)
        });
    }
    return spawned;
};

/**
 * 스킬에서 상태이상(화상/중독/출혈/빙결/기절/속박/디버프) 자동 추출
 */
export const extractStatusEffectsFromSkill = (skill: Skill | null): Bg3StatusEffect[] => {
    if (!skill) return [];
    const txt = `${skill.name || ''} ${skill.description || ''} ${skill.effectFormula || ''}`;
    const list: Bg3StatusEffect[] = [];
    if (/화상/.test(txt)) list.push({ name: '화상', kind: 'dot', turns: 2, dotRatio: 0.06, color: '#f97316' });
    if (/중독|맹독/.test(txt)) list.push({ name: '중독', kind: 'dot', turns: 3, dotRatio: 0.05, color: '#4ade80' });
    if (/출혈/.test(txt)) list.push({ name: '출혈', kind: 'dot', turns: 2, dotRatio: 0.06, color: '#f43f5e' });
    if (/기절|스턴/.test(txt)) list.push({ name: '기절', kind: 'cc', turns: 1, color: '#fbbf24' });
    if (/빙결|동결/.test(txt)) list.push({ name: '빙결', kind: 'cc', turns: 1, color: '#67e8f9' });
    if (/속박/.test(txt)) list.push({ name: '속박', kind: 'cc', turns: 1, color: '#a78bfa' });
    if (skill.type === SkillType.DEBUFF || (skill.debuffEffects && skill.debuffEffects.length > 0)) {
        list.push({ name: '약화', kind: 'debuff', turns: 3, atkDebuffMult: 0.82, defDebuffMult: 0.82, color: '#c084fc' });
    }
    return list;
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
    affinityEffect?: string;
    additionalLogs?: string[];
} => {
    const base = calculateDamage(attacker.sourceEntity, defender.sourceEntity, skill || undefined, playerCharacter);
    const extra = (base.additionalDamage || []).reduce((sum, a) => sum + (a.damage || 0), 0);
    const additionalLogs = (base.additionalDamage || []).map(a => a.log).filter(Boolean) as string[];
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

    // 버프/디버프 상태이상 & 방어 태세 배율 실반영
    const atkDebuff = (attacker.activeStatuses || []).reduce((m, s) => m * (s.atkDebuffMult || 1), 1);
    const defDebuff = (defender.activeStatuses || []).reduce((m, s) => m * (s.defDebuffMult || 1), 1);
    const defBuff = (defender.activeBuffs || []).reduce((m, b) => m * (b.defMult || 1), 1);
    const defendMult = defender.isDefending ? 0.55 : 1.0;

    dmg = Math.max(
        1,
        Math.round(
            dmg *
                (attacker.buffAtkMult || 1) *
                atkDebuff *
                (1 / Math.max(0.5, defDebuff)) *
                (1 / Math.max(0.5, defBuff)) *
                defendMult *
                (1 - defBonus / 150) *
                comboMult
        )
    );
    const hitChance = Math.max(55, Math.min(100, Math.round(93 + (attacker.agi - defender.agi) * 0.35 - evaBonus)));

    return {
        damage: dmg,
        isCrit: base.isCrit,
        isMiss: base.isMiss,
        hitChance,
        comboName,
        stunsTarget,
        affinityEffect: (base as any).affinityEffect,
        additionalLogs
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
