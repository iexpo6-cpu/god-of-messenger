import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, ClassTier, Companion, Enemy, JobType, Skill, SkillType } from '../../types';
import { SHINRYOKU_AFFINITY } from '../../constants';
import {
    absorbBg3ShieldAndMana,
    ARENA_H,
    ARENA_W,
    Bg3ArenaTier,
    Bg3BossTelegraph,
    Bg3Obstacle,
    Bg3SkillTargeting,
    Bg3SurfacePool,
    Bg3Unit,
    buildBg3AllyUnits,
    buildBg3EnemyUnits,
    buildBg3Initiative,
    calculateBg3Damage,
    createBg3SummonUnits,
    createBg3SurfaceFromSkill,
    distPx,
    extractStatusEffectsFromSkill,
    findOpportunityAttackers,
    generateBg3Arena,
    getBg3SharedAllyGroup,
    getBg3SkillTargeting,
    isPointInConeZone,
    isPointInSquareZone,
    isPointWalkable,
    metersToPx,
    PX_PER_METER,
    pxToMeters,
    resolveBg3Shove
} from '../../services/bg3ArenaEngine';
import {
    getCachedCityAssetImage,
    getPropAssetUrl,
    getTerrainTileUrl,
    loadCityAssetImage
} from '../../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    SpriteDirection
} from '../../services/rpgSpriteManifest';
import { getCityBackgroundImage } from '../../services/cityBackgroundManifest';
import { getCachedMonsterSprite, loadTransparentMonsterSprite } from '../../services/monsterCutoutCache';
import { getRegisteredSkillImage } from '../../services/visualManager';
import { getSkillIconComponent } from '../../services/rpgIconService';
import { formatCompactKorean, calculateDamage, generateLoot } from '../../utils';
import {
    applyShinryokuBreakHit,
    getAllyMaxBreakGauge,
    getEnemyMaxBreakGauge,
    isShinryokuWeaknessHit,
    isUnitShinryokuBroken,
    recoverAllyBreakGauge
} from '../../services/shinryokuBreakService';
import { checkSkillParticipantsMp } from '../../services/BondSkillService';
import { MESSENGER_VIDEOS, MESSENGER_VIDEO_DURATIONS, BOSS_ENTRANCE_VIDEOS } from '../../messengerVideoData';
import { CombatVFXOverlay, combatVfxBus, preloadSkillFrameAnimations } from '../CombatVFX';
import { SkillSelector } from '../combat/SkillSelector';
import { ItemSelectionModal } from '../combat/ItemSelectionModal';
import { CombatQuickSlots } from '../combat/CombatQuickSlots';
import { CombatShortcutKeybindModal } from '../CombatShortcutKeybindModal';
import { loadCombatKeybinds, formatKeyDisplay, useCombatKeybindHandler } from '../../services/combatKeybindService';
import {
    applyBg3CombatStartPassives,
    applyBg3ConsumableItem,
    applyBg3DamageWithShieldAndRevival,
    applyBg3PostAttackHooks,
    applyBg3SkillBuffs,
    applyBg3SkillDebuffs,
    getBg3UnitDetailedStats,
    getEchoAftershockDamage,
    getFocusFusionDamageMultiplier,
    isBg3ResurrectionSkill,
    processBg3TurnStart,
    syncUnitFromSourceEntity
} from '../../services/bg3CombatSyncBridge';

// 전투불능 동료 무덤(비석) 커스텀 이미지 로더 (향후 assets/visuals/gravestone.png 생성 시 자동 반영, 미존재 시 스타일리시 캔버스 비석 폴백)
let gravestoneImgCache: HTMLImageElement | null = null;
let gravestoneImgAttempted = false;
const getGravestoneImage = (): HTMLImageElement | null => {
    if (gravestoneImgAttempted) return gravestoneImgCache;
    gravestoneImgAttempted = true;
    const base = (import.meta as any).env?.BASE_URL || './';
    const img = new Image();
    img.onload = () => {
        gravestoneImgCache = img;
    };
    img.onerror = () => {
        gravestoneImgCache = null;
    };
    img.src = `${base.endsWith('/') ? base : `${base}/`}assets/visuals/gravestone.png`;
    return null;
};

// 일반 사냥 도망 구역 마법진 이미지 로더
let escapePortalImgCache: HTMLImageElement | null = null;
let escapePortalImgAttempted = false;
const getEscapePortalImage = (): HTMLImageElement | null => {
    if (escapePortalImgAttempted) return escapePortalImgCache;
    escapePortalImgAttempted = true;
    const base = (import.meta as any).env?.BASE_URL || './';
    const img = new Image();
    img.onload = () => {
        escapePortalImgCache = img;
    };
    img.onerror = () => {
        escapePortalImgCache = null;
    };
    img.src = `${base.endsWith('/') ? base : `${base}/`}assets/visuals/escape_portal.png`;
    return null;
};

// 전리품 드롭 이미지 캐시 (수루룩 드롭 연출용)
const lootImgCache = new Map<string, HTMLImageElement | null>();
const getCachedLootImage = (url?: string): HTMLImageElement | null => {
    if (!url) return null;
    if (lootImgCache.has(url)) return lootImgCache.get(url) || null;
    lootImgCache.set(url, null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => lootImgCache.set(url, img);
    img.onerror = () => lootImgCache.set(url, null);
    img.src = url;
    return null;
};

const getRarityGlowColor = (rarity?: string): string => {
    const r = String(rarity || '').toLowerCase();
    if (r.includes('mythic') || r.includes('신화') || r.includes('절대')) return '#fbbf24';
    if (r.includes('legend') || r.includes('전설')) return '#f97316';
    if (r.includes('epic') || r.includes('영웅') || r.includes('유일')) return '#c084fc';
    if (r.includes('rare') || r.includes('희귀')) return '#38bdf8';
    if (r.includes('uncommon') || r.includes('고급')) return '#34d399';
    return '#cbd5e1';
};
import {
    BookOpen,
    Bot,
    FastForward,
    Flame,
    Footprints,
    Heart,
    RotateCcw,
    Shield,
    Sparkles,
    Sword,
    Wind,
    X,
    Zap
} from 'lucide-react';

export interface Bg3BattleResult {
    isVictory: boolean;
    turns: number;
    playerFinalHp: number;
    playerFinalMp?: number;
    companionFinalHps: Record<string, number>;
    companionFinalMps?: Record<string, number>;
    defeatedEnemyCount: number;
    /** 유닛별('player' 또는 companion.id) 사용 스킬 횟수 -> 스킬 숙련도 반영용 */
    usedSkillsByUnit?: Record<string, Record<string, number>>;
    /** 유닛별('player' 또는 companion.id) 공격/스킬 행동 횟수 -> 무기 숙련도 반영용 */
    attackCountByUnit?: Record<string, number>;
    /** 전투 종료 시 플레이어/동료 잔여 상태이상(버프 포함) -> 전투 종료 후 1턴 감소 반영용 */
    playerFinalStatusEffects?: any[];
    companionFinalStatusEffects?: Record<string, any[]>;
    /** 몬스터 처치 순간 전장에 수루룩 드롭 연출로 이미 굴려진 확정 전리품 목록 */
    preRolledLoot?: any[];
}

export interface Bg3ArenaCanvasProps {
    character: Character;
    companions?: Companion[];
    enemies: Enemy[];
    title?: string;
    subtitle?: string;
    region?: string;
    nation?: string;
    city?: string;
    isLargeWar?: boolean;
    arenaTier?: Bg3ArenaTier;
    isOneOnOne?: boolean;
    challengerCompanionId?: string;
    canFlee?: boolean;
    onUpdateCharacter?: (newChar: Character, logMsg?: string) => void;
    onComplete: (result: Bg3BattleResult) => void;
    onRetreat?: () => void;
}

type ActionMode = 'move' | 'attack' | 'skill' | 'shove' | 'jump' | 'item';

interface ProjectileFx {
    id: string;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    color: string;
    startTime: number;
    duration: number;
    radius: number;
}

interface SlashArcFx {
    id: string;
    x: number;
    y: number;
    angle: number;
    color: string;
    startTime: number;
    duration: number;
    scale: number;
}

interface ExplosionRingFx {
    id: string;
    x: number;
    y: number;
    maxRadius: number;
    color: string;
    startTime: number;
    duration: number;
}

interface ParticleFx {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
}

interface FloatTextFx {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    scale: number;
    startTime: number;
    duration: number;
}

interface WalkAnim {
    unitId: string;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    isJump: boolean;
    startTime: number;
    duration: number;
}

interface ReactionPrompt {
    defender: Bg3Unit;
    attacker: Bg3Unit;
    incomingDamage: number;
    resolve: (parry: boolean) => void;
}

const SURFACE_COLORS: Record<string, { fill: string; edge: string; label: string }> = {
    water: { fill: 'rgba(14, 165, 233, 0.34)', edge: 'rgba(125, 211, 252, 0.72)', label: '물 웅덩이 (전격 감전↑)' },
    fire: { fill: 'rgba(239, 68, 68, 0.38)', edge: 'rgba(251, 146, 60, 0.85)', label: '화염 지대 (화상 피해)' },
    ice: { fill: 'rgba(103, 232, 249, 0.36)', edge: 'rgba(207, 250, 254, 0.85)', label: '빙결 지면 (파쇄↑)' },
    poison: { fill: 'rgba(74, 222, 128, 0.34)', edge: 'rgba(134, 239, 172, 0.8)', label: '맹독 지대 (화염 폭발↑)' },
    holy: { fill: 'rgba(253, 224, 71, 0.30)', edge: 'rgba(254, 240, 138, 0.85)', label: '신성 성역 (치유 오라)' },
    electrified: { fill: 'rgba(56, 189, 248, 0.42)', edge: 'rgba(186, 230, 253, 0.92)', label: '전격 지대 (감전)' }
};

const waitMs = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

const calcDir = (dx: number, dy: number): SpriteDirection => {
    if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
};

const CURSOR_SKILL_TARGET = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#fbbf24" stroke-width="2.2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#38bdf8" stroke-width="2"/><line x1="16" y1="1" x2="16" y2="8" stroke="#fbbf24" stroke-width="2"/><line x1="16" y1="24" x2="16" y2="31" stroke="#fbbf24" stroke-width="2"/><line x1="1" y1="16" x2="8" y2="16" stroke="#fbbf24" stroke-width="2"/><line x1="24" y1="16" x2="31" y2="16" stroke="#fbbf24" stroke-width="2"/></svg>')}") 16 16, crosshair`;
const CURSOR_ATTACK_SWORD = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 27 L11 21 M8 18 L14 24 M11 21 L26 6 L27 5 L21 6 L6 21 Z" fill="#fb7185" stroke="#fef08a" stroke-width="1.8" stroke-linejoin="round"/></svg>')}") 6 26, pointer`;

export const Bg3ArenaCanvas: React.FC<Bg3ArenaCanvasProps> = ({
    character,
    companions,
    enemies,
    title = '전술 전투',
    subtitle = '자유 이동 · 전술 전투',
    region,
    nation,
    city,
    isLargeWar = false,
    arenaTier,
    isOneOnOne = false,
    challengerCompanionId,
    canFlee = false,
    onUpdateCharacter,
    onComplete,
    onRetreat
}) => {
    const resolvedCompanions = useMemo(() => {
        if (isOneOnOne || challengerCompanionId) return [];
        const baseList =
            companions && companions.length > 0
                ? companions
                : (character.companions || []).filter(c => c && (c.stats?.hp ?? 1) > 0);
        // 장착된 탈것 몬스터는 별도 동료 유닛으로 중복 출격하지 않도록 제외 (탈것 자동 협공 1회 전용!)
        const mountedIds = new Set<string>();
        if (character.mountedMonster?.id) mountedIds.add(character.mountedMonster.id);
        if (character.mountedMonsterId) mountedIds.add(character.mountedMonsterId);
        (character.companions || []).forEach(c => {
            if (c?.mountedMonster?.id) mountedIds.add(c.mountedMonster.id);
            if (c?.mountedMonsterId) mountedIds.add(c.mountedMonsterId);
        });
        return baseList.filter(c => c && !mountedIds.has(c.id)).slice(0, 6);
    }, [isOneOnOne, challengerCompanionId, companions, character.companions, character.mountedMonster, character.mountedMonsterId]);

    const resolvedArenaTier: Bg3ArenaTier = arenaTier || (isLargeWar ? 'war' : 'boss');

    const arena = useMemo(
        () =>
            generateBg3Arena({
                region: region || character.currentLocation?.region,
                nation: nation || character.currentLocation?.nation,
                city: city || character.currentLocation?.city,
                title,
                subtitle,
                isLargeWar: resolvedArenaTier === 'war',
                arenaTier: resolvedArenaTier
            }),
        [region, nation, city, character.currentLocation, title, subtitle, resolvedArenaTier]
    );
    const arenaW = arena.width;
    const arenaH = arena.height;

    const bgImageUrl = useMemo(() => {
        const info = getCityBackgroundImage({
            region: region || character.currentLocation?.region,
            nation: nation || character.currentLocation?.nation,
            city: city || character.currentLocation?.city
        });
        return info?.url || info?.fallbackUrl || '';
    }, [region, nation, city, character.currentLocation]);

    const [units, setUnits] = useState<Bg3Unit[]>(() => {
        const allies = buildBg3AllyUnits(
            character,
            resolvedCompanions,
            region || character.currentLocation?.region,
            nation || character.currentLocation?.nation,
            arenaW,
            arenaH,
            challengerCompanionId
        );
        const foes = buildBg3EnemyUnits(
            enemies,
            region || character.currentLocation?.region,
            nation || character.currentLocation?.nation,
            arenaW,
            arenaH
        );
        // sourceEntity의 statusEffects / stats를 전투 세션 전용으로 안전하게 복제 후 전투 시작 패시브 적용
        const cloned = [...allies, ...foes].map(u => {
            if (!u.sourceEntity) return u;
            const src: any = u.sourceEntity;
            const clonedSrc = {
                ...src,
                stats: src.stats ? { ...src.stats } : undefined,
                statusEffects: Array.isArray(src.statusEffects) ? src.statusEffects.map((e: any) => ({ ...e })) : []
            };
            return { ...u, sourceEntity: clonedSrc };
        });
        const afterPassives = applyBg3CombatStartPassives(cloned).units;
        // [FIX] 패시브/최종스탯 반영 후에도 모든 몬스터는 전투 시작 시 무조건 HP 100% 완충 보장!
        // (sourceEntity.stats.maxHp는 원본 유지하여 calculateFinalStats 이중 배율 방지!)
        return afterPassives.map(u => {
            if (u.team !== 'enemy') return u;
            const fullHp = Math.max(u.maxHp, u.hp, 1);
            if (u.sourceEntity) {
                (u.sourceEntity as any).hp = fullHp;
                (u.sourceEntity as any).maxHp = fullHp;
                if ((u.sourceEntity as any).stats) {
                    (u.sourceEntity as any).stats.hp = fullHp;
                }
            }
            return { ...u, hp: fullHp, maxHp: fullHp };
        });
    });
    const unitsRef = useRef<Bg3Unit[]>(units);
    unitsRef.current = units;

    const [surfaces, setSurfaces] = useState<Bg3SurfacePool[]>(() => arena.initialSurfaces);
    const surfacesRef = useRef<Bg3SurfacePool[]>(surfaces);
    surfacesRef.current = surfaces;

    const [telegraphs, setTelegraphs] = useState<Bg3BossTelegraph[]>([]);
    const telegraphsRef = useRef<Bg3BossTelegraph[]>(telegraphs);
    telegraphsRef.current = telegraphs;

    const [initiativeOrder, setInitiativeOrder] = useState<string[]>(() => buildBg3Initiative(units));
    const [turnIdx, setTurnIdx] = useState<number>(0);
    const [roundNum, setRoundNum] = useState<number>(1);
    const [activeUnitId, setActiveUnitId] = useState<string>(() => buildBg3Initiative(units)[0] || '');

    const [actionMode, setActionMode] = useState<ActionMode>('move');
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [showSkillBook, setShowSkillBook] = useState<boolean>(false);
    const [showItemModal, setShowItemModal] = useState<boolean>(false);
    const [pendingItemUse, setPendingItemUse] = useState<{
        item: any;
        quantity: number;
        rangeMeters: number;
        isEnemyTarget: boolean;
        isRevive: boolean;
    } | null>(null);

    // 전투 시작 및 아군 턴 전환 시 항상 [자유이동] 모드가 우선 선택되도록 강제 초기화!
    useEffect(() => {
        setActionMode('move');
        setSelectedSkill(null);
        setPendingItemUse(null);
    }, [activeUnitId]);
    const [hoveringEnemy, setHoveringEnemy] = useState<boolean>(false);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const isBusyRef = useRef<boolean>(false);
    isBusyRef.current = isBusy;
    const setBusySafe = useCallback((v: boolean) => {
        isBusyRef.current = v;
        setIsBusy(v);
    }, []);
    const aiTurnLockRef = useRef<string>('');
    const mountAttackedTurnKeyRef = useRef<string>('');
    const mountedRef = useRef<boolean>(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const [autoBattle, setAutoBattle] = useState<boolean>(false);
    const [fastMode, setFastMode] = useState<boolean>(false);
    const [bannerMsg, setBannerMsg] = useState<string>('전투 개시! 바닥을 눌러 이동하거나 스킬을 선택하세요.');
    const [combatLogs, setCombatLogs] = useState<Array<{ id: string; round: number; text: string; tone?: 'info' | 'dmg' | 'heal' | 'warn' }>>([
        { id: 'init_0', round: 1, text: `⚔️ [${title}] 전투 개시! (${Math.round(arenaW / PX_PER_METER)}m × ${Math.round(arenaH / PX_PER_METER)}m 전장)`, tone: 'info' }
    ]);
    const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
    // 모바일(< 768px)에서는 좌측 하단 스탯 패널 및 우측 상단 인연 패널을 기본 접힘 상태로 시작해 전장 시야 확보!
    const [statsPanelOpen, setStatsPanelOpen] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 768 : true
    );
    const [bondPanelOpen, setBondPanelOpen] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 768 : false
    );
    const [bottomBuffsOpen, setBottomBuffsOpen] = useState<boolean>(false);
    const pushCombatLog = useCallback((text: string, tone: 'info' | 'dmg' | 'heal' | 'warn' = 'info', r = 1) => {
        setCombatLogs(prev => [{ id: `log_${Date.now()}_${Math.random()}`, round: r, text, tone }, ...prev].slice(0, 120));
    }, []);
    const [battleEnded, setBattleEnded] = useState<'victory' | 'defeat' | null>(null);
    const [reactionPrompt, setReactionPrompt] = useState<ReactionPrompt | null>(null);
    const [zoom, setZoom] = useState<number>(isLargeWar ? 1.55 : 1.25);
    const [overviewMode, setOverviewMode] = useState<boolean>(false);
    const [activeVideo, setActiveVideo] = useState<{ url: string; duration: number } | null>(null);
    const [combatKeybinds, setCombatKeybinds] = useState<string[]>(() => loadCombatKeybinds());
    const [showKeybindModal, setShowKeybindModal] = useState<boolean>(false);
    const mountDashAnimsRef = useRef<
        Array<{
            id: string;
            mountName: string;
            visualUrl?: string;
            sx: number;
            sy: number;
            tx: number;
            ty: number;
            startTime: number;
            duration: number;
        }>
    >([]);
    // 처치 순간 수루룩 전리품 드롭 연출 & 확정 전리품 저장소
    const preRolledLootRef = useRef<any[]>([]);
    const lootDropAnimsRef = useRef<
        Array<{
            id: string;
            name: string;
            imageUrl?: string;
            rarityColor: string;
            sx: number;
            sy: number;
            tx: number;
            ty: number;
            startTime: number;
            duration: number;
        }>
    >([]);

    // 인연 게이지 (동료별 0~100, 매 라운드 +5 / 치명타 +10, 100 도달 시 인연 스킬 해방!)
    const [bondGauges, setBondGauges] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        resolvedCompanions.forEach(c => {
            if (c?.id) init[c.id] = 30;
        });
        return init;
    });
    const chargeBondGauges = useCallback((delta: number) => {
        setBondGauges(prev => {
            const next: Record<string, number> = {};
            Object.keys(prev).forEach(k => {
                next[k] = Math.min(100, (prev[k] || 0) + delta);
            });
            return next;
        });
    }, []);

    // QTE (JUST IMPACT 타이밍 바)
    const [qteEnabled, setQteEnabled] = useState<boolean>(true);
    const [qtePrompt, setQtePrompt] = useState<{ skillName: string; startTime: number; duration: number } | null>(null);
    // 💞 인연 합체기 듀얼 visualUrl 컷인 배너 (시전자 + 인연 파트너 초상화가 중앙으로 합체!)
    const [bondCutIn, setBondCutIn] = useState<{
        skillName: string;
        casterName: string;
        casterVisualUrl?: string;
        partnerName: string;
        partnerVisualUrl?: string;
    } | null>(null);
    const qteResolveRef = useRef<((res: { grade: 'JUST' | 'GOOD' | 'MISS'; mult: number; extraBreak: number; mpPaybackPct: number }) => void) | null>(null);

    const resolveQteNow = useCallback((forcedGrade?: 'JUST' | 'GOOD' | 'MISS') => {
        const resolver = qteResolveRef.current;
        if (!resolver) return;
        qteResolveRef.current = null;
        let grade: 'JUST' | 'GOOD' | 'MISS' = forcedGrade || 'GOOD';
        if (!forcedGrade && qtePrompt) {
            const elapsed = performance.now() - qtePrompt.startTime;
            const pos = Math.min(1, Math.max(0, elapsed / qtePrompt.duration));
            const distFromCenter = Math.abs(pos - 0.5);
            if (distFromCenter <= 0.13) grade = 'JUST';
            else if (distFromCenter <= 0.30) grade = 'GOOD';
            else grade = 'MISS';
        }
        setQtePrompt(null);
        if (grade === 'JUST') resolver({ grade: 'JUST', mult: 1.25, extraBreak: 1, mpPaybackPct: 0.2 });
        else if (grade === 'GOOD') resolver({ grade: 'GOOD', mult: 1.0, extraBreak: 0, mpPaybackPct: 0 });
        else resolver({ grade: 'MISS', mult: 0.85, extraBreak: 0, mpPaybackPct: 0 });
    }, [qtePrompt]);

    const runQteIfEnabled = useCallback(
        (skillName: string, isAutoOrAi: boolean): Promise<{ grade: 'JUST' | 'GOOD' | 'MISS'; mult: number; extraBreak: number; mpPaybackPct: number }> => {
            if (!qteEnabled || isAutoOrAi) {
                return Promise.resolve({ grade: 'GOOD', mult: 1.0, extraBreak: 0, mpPaybackPct: 0 });
            }
            return new Promise(resolve => {
                const dur = 920;
                qteResolveRef.current = resolve;
                setQtePrompt({ skillName, startTime: performance.now(), duration: dur });
                window.setTimeout(() => {
                    if (qteResolveRef.current === resolve) {
                        qteResolveRef.current = null;
                        setQtePrompt(null);
                        resolve({ grade: 'GOOD', mult: 1.0, extraBreak: 0, mpPaybackPct: 0 });
                    }
                }, dur + 40);
            });
        },
        [qteEnabled]
    );

    useEffect(() => {
        if (!qtePrompt) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === 'Enter') {
                e.preventDefault();
                resolveQteNow();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [qtePrompt, resolveQteNow]);
    const cameraRef = useRef<{ x: number; y: number }>({ x: arenaW * 0.5, y: arenaH - 280 });
    const cameraTargetRef = useRef<{ x: number; y: number }>({ x: arenaW * 0.5, y: arenaH - 280 });
    const panDragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });
    // 태블릿/모바일 터치 핀치 줌 & 1손가락/2손가락 드래그 카메라 패닝 · 스킬 범위 조준 상태
    const touchGestureRef = useRef<{
        mode: 'none' | 'pan' | 'pinch' | 'aim';
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        moved: boolean;
        pinchStartDist: number;
        pinchStartZoom: number;
    }>({ mode: 'none', startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false, pinchStartDist: 0, pinchStartZoom: 1 });
    // 스킬 숙련도 & 무기 숙련도 반영용 전투 행동 누적 추적기
    const usedSkillsByUnitRef = useRef<Record<string, Record<string, number>>>({});
    const attackCountByUnitRef = useRef<Record<string, number>>({});

    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 1280, h: 720 });
    const hoverWorldRef = useRef<{ x: number; y: number } | null>(null);

    // On-field real-time VFX refs (Layer B)
    const projectilesRef = useRef<ProjectileFx[]>([]);
    const slashArcsRef = useRef<SlashArcFx[]>([]);
    const explosionsRef = useRef<ExplosionRingFx[]>([]);
    const particlesRef = useRef<ParticleFx[]>([]);
    const floatsRef = useRef<FloatTextFx[]>([]);
    const walkAnimRef = useRef<WalkAnim | null>(null);
    const lungeMapRef = useRef<Record<string, { dx: number; dy: number; until: number }>>({});
    const hitFlashRef = useRef<Record<string, number>>({});
    const shakeRef = useRef<{ intensity: number; until: number }>({ intensity: 0, until: 0 });
    const bgImgRef = useRef<HTMLImageElement | null>(null);
    const [, setAssetTick] = useState<number>(0);

    const activeUnit = useMemo(() => units.find(u => u.id === activeUnitId && u.hp > 0) || null, [units, activeUnitId]);
    const sharedAllyGroup = useMemo(
        () => getBg3SharedAllyGroup(initiativeOrder, turnIdx, units),
        [initiativeOrder, turnIdx, units]
    );
    const isPlayerTurn = Boolean(activeUnit && activeUnit.team === 'ally' && !battleEnded);

    const currentTargeting: Bg3SkillTargeting | null = useMemo(() => {
        if (!activeUnit) return null;
        if (actionMode === 'attack') return getBg3SkillTargeting(activeUnit, null);
        if (actionMode === 'skill' && selectedSkill) return getBg3SkillTargeting(activeUnit, selectedSkill);
        return null;
    }, [activeUnit, actionMode, selectedSkill]);

    // Preload background, terrain, SRPG props, enemy tokens, and ally sprites
    useEffect(() => {
        let alive = true;
        if (bgImageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (alive) {
                    bgImgRef.current = img;
                    setAssetTick(t => t + 1);
                }
            };
            img.src = bgImageUrl;
        }
        const urls = new Set<string>();
        urls.add(getTerrainTileUrl(arena.cultureKey, 'ground'));
        arena.obstacles.forEach(o => urls.add(getPropAssetUrl('srpg', o.part)));
        // 원소 지면 6종 고급 PNG 에셋 사전 로드
        ['surface_fire', 'surface_water', 'surface_ice', 'surface_poison', 'surface_holy', 'surface_electrified'].forEach(sp =>
            urls.add(getPropAssetUrl('srpg', sp))
        );
        getGravestoneImage();
        getEscapePortalImage();
        unitsRef.current.forEach(u => {
            if (u.enemyTokenPart) urls.add(getPropAssetUrl('srpg', u.enemyTokenPart));
            if (u.team === 'enemy' && u.visualUrl) {
                loadTransparentMonsterSprite(u.visualUrl).then(() => alive && setAssetTick(t => t + 1));
            }
            if (u.mountVisualUrl) {
                loadTransparentMonsterSprite(u.mountVisualUrl).then(() => alive && setAssetTick(t => t + 1));
            }
            loadRpgSpriteImage(u.spriteUrl).then(() => alive && setAssetTick(t => t + 1));
        });
        urls.forEach(url => {
            loadCityAssetImage(url).then(() => alive && setAssetTick(t => t + 1));
        });

        // 모든 참여 유닛 스킬의 커스텀 프레임 애니메이션 사전 로드 (CombatInterface.tsx와 동일)
        const allSkills = unitsRef.current.flatMap(u => u.skills || []);
        if (allSkills.length > 0) {
            preloadSkillFrameAnimations(allSkills);
        }

        // 보스 입장 동영상 자동 감지 및 재생 (BOSS_ENTRANCE_VIDEOS)
        const detectedBossName = Object.keys(BOSS_ENTRANCE_VIDEOS).find(bossName =>
            unitsRef.current.some(u => u.team === 'enemy' && u.name.includes(bossName))
        );
        let videoTimer: number | null = null;
        if (detectedBossName) {
            const vData = BOSS_ENTRANCE_VIDEOS[detectedBossName];
            if (vData?.url) {
                setActiveVideo({ url: vData.url, duration: vData.duration });
                videoTimer = window.setTimeout(() => {
                    if (alive) setActiveVideo(null);
                }, vData.duration);
            }
        }

        return () => {
            alive = false;
            if (videoTimer !== null) window.clearTimeout(videoTimer);
        };
    }, [arena, bgImageUrl]);

    // ResizeObserver for 100% full-viewport canvas
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                setViewportSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Auto-focus camera on active unit turn (unless overview mode is enabled)
    useEffect(() => {
        if (overviewMode) {
            cameraTargetRef.current = { x: arenaW * 0.5, y: arenaH * 0.5 };
            return;
        }
        const cur = unitsRef.current.find(u => u.id === activeUnitId && u.hp > 0);
        if (cur) {
            cameraTargetRef.current = { x: cur.x, y: cur.y };
        }
    }, [activeUnitId, overviewMode, arenaW, arenaH]);

    // WASD / Arrow keys camera panning on vast battlefield
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (showSkillBook || reactionPrompt || showKeybindModal || activeVideo) return;
            const step = 140;
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                setOverviewMode(false);
                cameraTargetRef.current.y = Math.max(160, cameraTargetRef.current.y - step);
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                setOverviewMode(false);
                cameraTargetRef.current.y = Math.min(arenaH - 160, cameraTargetRef.current.y + step);
            } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                setOverviewMode(false);
                cameraTargetRef.current.x = Math.max(220, cameraTargetRef.current.x - step);
            } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                setOverviewMode(false);
                cameraTargetRef.current.x = Math.min(arenaW - 220, cameraTargetRef.current.x + step);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showSkillBook, reactionPrompt, showKeybindModal, activeVideo, arenaW, arenaH]);

    // World <-> Screen transform with smooth camera pan & zoom
    const getTransform = useCallback(() => {
        const fitScale = Math.min(viewportSize.w / arenaW, viewportSize.h / arenaH);
        const effZoom = overviewMode ? 1.0 : zoom;
        const scale = Math.max(0.24, fitScale * effZoom);
        const camX = overviewMode ? arenaW * 0.5 : cameraRef.current.x;
        const camY = overviewMode ? arenaH * 0.5 : cameraRef.current.y;
        const offsetX = viewportSize.w * 0.5 - camX * scale;
        const offsetY = viewportSize.h * 0.5 - camY * scale;
        return { scale, offsetX, offsetY };
    }, [viewportSize, zoom, overviewMode, arenaW, arenaH]);

    const screenToWorld = useCallback(
        (clientX: number, clientY: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const { scale, offsetX, offsetY } = getTransform();
            const wx = (clientX - rect.left - offsetX) / scale;
            const wy = (clientY - rect.top - offsetY) / scale;
            return { x: Math.max(10, Math.min(arenaW - 10, wx)), y: Math.max(10, Math.min(arenaH - 10, wy)) };
        },
        [getTransform, arenaW, arenaH]
    );

    // VFX helpers
    const addFloatText = useCallback((x: number, y: number, text: string, color: string, scale = 1) => {
        floatsRef.current.push({
            id: `ft_${Date.now()}_${Math.random()}`,
            x,
            y,
            text,
            color,
            scale,
            startTime: performance.now(),
            duration: 1250
        });
    }, []);

    const spawnParticles = useCallback((x: number, y: number, color: string, count = 18, speed = 3.2) => {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
            const spd = speed * (0.45 + Math.random() * 0.9);
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 0.6,
                size: 2.5 + Math.random() * 4.5,
                color,
                life: 0,
                maxLife: 24 + Math.floor(Math.random() * 20)
            });
        }
    }, []);

    const triggerShake = useCallback((intensity = 9, ms = 260) => {
        shakeRef.current = { intensity, until: performance.now() + ms };
    }, []);

    const spawnKillBurst = useCallback(
        (target: Bg3Unit) => {
            const nowTs = performance.now();
            explosionsRef.current.push({
                id: `kill_${Date.now()}_${Math.random()}`,
                x: target.x,
                y: target.y,
                maxRadius: 96,
                color: '#f43f5e',
                startTime: nowTs,
                duration: 540
            });
            spawnParticles(target.x, target.y, '#fbbf24', 28, 4.8);
            spawnParticles(target.x, target.y, '#f43f5e', 24, 3.8);
            addFloatText(target.x, target.y - 34, `💀 ${target.name} 처치!`, '#fde047', 1.35);
            triggerShake(13, 340);

            // 몬스터 처치 시 확정 전리품 롤 + 수루룩 전리품 이미지 분수 연출!
            if (target.team === 'enemy' && target.sourceEntity) {
                try {
                    const drops = generateLoot(target.sourceEntity as Enemy, nation || character.currentLocation?.nation, character) || [];
                    if (drops.length > 0) {
                        preRolledLootRef.current.push(...drops);
                        const total = drops.length;
                        drops.forEach((item: any, idx: number) => {
                            const spreadAngle = total === 1
                                ? -Math.PI / 2
                                : -Math.PI * 0.85 + (Math.PI * 0.7 * idx) / Math.max(1, total - 1);
                            const dist = 46 + (idx % 3) * 20;
                            const tx = target.x + Math.cos(spreadAngle) * dist;
                            const ty = target.y + Math.sin(spreadAngle) * dist * 0.55 + 10;
                            const imgUrl = item.imageUrl || item.visualUrl || undefined;
                            if (imgUrl) getCachedLootImage(imgUrl);
                            lootDropAnimsRef.current.push({
                                id: `loot_${Date.now()}_${idx}_${Math.random()}`,
                                name: item.name || '전리품',
                                imageUrl: imgUrl,
                                rarityColor: getRarityGlowColor(item.rarity),
                                sx: target.x,
                                sy: target.y - 8,
                                tx,
                                ty,
                                startTime: nowTs + idx * 70, // 순식간에 수루룩 퍼지는 스태거!
                                duration: 2500
                            });
                        });
                        pushCombatLog(
                            `🎁 [${target.name}] 전리품 드롭: ${drops.map((d: any) => d.name).join(', ')}`,
                            'heal',
                            roundNum
                        );
                    }
                } catch {
                    // ignore safely
                }
            }
        },
        [addFloatText, spawnParticles, triggerShake, nation, character, pushCombatLog, roundNum]
    );

    const emitDualLayerVfx = useCallback(
        async (
            caster: Bg3Unit,
            targets: Bg3Unit[],
            centerX: number,
            centerY: number,
            skill: Skill | null,
            targeting: Bg3SkillTargeting
        ) => {
            const now = performance.now();

            // Layer A: CombatInterface.tsx와 100% 동일한 커스텀 프레임 애니메이션 + 컷신 일러스트 + 파이널 동영상 + 신력 VFX!
            if (skill || targeting.shape !== 'single' || caster.isBoss) {
                const srcEntity: any = caster.sourceEntity || {};
                const isFinalOrBondTier = Boolean(
                    skill &&
                        (skill.tier === ClassTier.FINAL ||
                            skill.tier === ClassTier.BOND ||
                            (skill as any).isBondSkill ||
                            (skill as any).isBond)
                );
                const isCutinTier = Boolean(skill && (skill.tier === ClassTier.LAST || isFinalOrBondTier));
                const autoCutinMode =
                    typeof window !== 'undefined'
                        ? localStorage.getItem('game_auto_caster_cutin_mode') || 'last_and_final'
                        : 'last_and_final';

                // 파이널 클래스 사자 전용 동영상 재생 (MESSENGER_VIDEOS)
                if (skill && skill.tier === ClassTier.FINAL) {
                    const job = (srcEntity.job || '') as JobType;
                    const gender = String(srcEntity.gender || '').toLowerCase().includes('여') ? 'female' : 'male';
                    const videoMap = (MESSENGER_VIDEOS as any)[job];
                    const vDur = (MESSENGER_VIDEO_DURATIONS as any)[job];
                    if (videoMap && vDur) {
                        const vUrl = gender === 'female' ? videoMap.female : videoMap.male;
                        if (vUrl) {
                            setActiveVideo({ url: vUrl, duration: vDur });
                            window.setTimeout(() => {
                                if (mountedRef.current) setActiveVideo(null);
                            }, vDur);
                        }
                    }
                }

                // 컷신 일러스트 결정 (스킬 전용 일러스트 우선 -> 라스트/파이널/인연 자동 시전자 컷인)
                let illustrationUrl: string | undefined = undefined;
                if (skill && isCutinTier && autoCutinMode !== 'off') {
                    if (skill.illustrationUrl) {
                        illustrationUrl = skill.illustrationUrl;
                    } else if (
                        skill.imageUrl &&
                        (skill.imageUrl.startsWith('http') || skill.imageUrl.startsWith('/') || skill.imageUrl.startsWith('data:'))
                    ) {
                        illustrationUrl = skill.imageUrl;
                    } else if (
                        autoCutinMode === 'last_and_final' ||
                        (autoCutinMode === 'final_only' && isFinalOrBondTier)
                    ) {
                        illustrationUrl =
                            caster.visualUrl ||
                            srcEntity.visualUrl ||
                            srcEntity.imageUrl ||
                            srcEntity.monsterData?.visualUrl ||
                            srcEntity.defaultVisualUrl;
                    }
                }

                const frameAnimation = skill?.frameAnimation?.enabled ? skill.frameAnimation : undefined;
                const resolvedTier = targeting.isSupport
                    ? 'BUFF'
                    : skill?.type === SkillType.DEBUFF
                    ? 'DEBUFF'
                    : (skill as any)?.isBondSkill
                    ? 'BOND'
                    : ((skill?.tier as ClassTier) || ClassTier.FIRST);

                let vfxDuration = illustrationUrl
                    ? 1650
                    : resolvedTier === ClassTier.FINAL || resolvedTier === 'BOND'
                    ? 1300
                    : resolvedTier === ClassTier.LAST
                    ? 1000
                    : fastMode
                    ? 600
                    : 920;

                if (frameAnimation && frameAnimation.frames && frameAnimation.frames.length > 0) {
                    const fCount = frameAnimation.frames.length;
                    const frameSum = frameAnimation.frames.reduce((acc: number, f: any) => {
                        const rawDur = f.duration || 70;
                        const effDur = fCount >= 36 && rawDur >= 50 ? 18 : fCount >= 16 && rawDur >= 65 ? 32 : rawDur;
                        return acc + effDur;
                    }, 0);
                    const loops = frameAnimation.loopCount === 0 ? 1 : Math.min(3, frameAnimation.loopCount || 1);
                    const speed = frameAnimation.playbackSpeed || 1;
                    vfxDuration = Math.max(vfxDuration, Math.round((frameSum * loops) / speed) + 180);
                }

                // 피격 대상(또는 AoE 중심)의 정확한 캔버스 화면 좌표(px) + 스킬 범위에 정확히 비례하는 VFX 크기 계산!
                const impactWorldX = targets.length === 1 ? targets[0].x : centerX;
                const impactWorldY = targets.length === 1 ? targets[0].y : centerY;
                const { scale, offsetX, offsetY } = getTransform();
                const targetScreenPos = {
                    x: Math.max(48, Math.min(viewportSize.w - 48, offsetX + impactWorldX * scale)),
                    y: Math.max(48, Math.min(viewportSize.h - 48, offsetY + impactWorldY * scale))
                };

                // 단일 스킬: 적 토큰에 맞춘 일정한 크기(136px) / 광역 스킬: 실제 스킬 범위(m)의 화면 px 크기 그대로!
                let vfxPixelSize = 136;
                if (targeting.shape === 'circle') {
                    vfxPixelSize = Math.round(Math.max(180, Math.min(920, metersToPx(targeting.aoeRadiusMeters) * 2 * scale)));
                } else if (targeting.shape === 'cone') {
                    vfxPixelSize = Math.round(Math.max(180, Math.min(920, metersToPx(targeting.rangeMeters) * 1.35 * scale)));
                } else if (targeting.shape === 'square') {
                    const maxDimM = Math.max(targeting.squareWidthMeters || 5, targeting.squareLengthMeters || 10);
                    vfxPixelSize = Math.round(Math.max(180, Math.min(920, metersToPx(maxDimM) * scale)));
                }

                combatVfxBus.emit({
                    id: `bg3_vfx_${Date.now()}`,
                    shinryokuType: (skill as any)?.shinryokuType || targeting.shinryokuType,
                    tier: resolvedTier,
                    isAoe: targeting.shape !== 'single',
                    attackerName: caster.name,
                    targetName: targets[0]?.name || '전장',
                    skillName: skill?.name || '전술 강타',
                    duration: vfxDuration,
                    illustrationUrl,
                    vfxTheme: skill?.vfxTheme,
                    vfxColor: skill?.vfxColor || targeting.vfxColor,
                    vfxShape: skill?.vfxShape,
                    vfxScale: (skill as any)?.vfxScale,
                    frameAnimation,
                    targetScreenPos,
                    vfxPixelSize
                });
            }

            // Layer B: On-Field Canvas Projectiles / Lunge / Slash Arc / AoE Ring
            if (targeting.isRanged) {
                const destX = targets.length === 1 ? targets[0].x : centerX;
                const destY = targets.length === 1 ? targets[0].y : centerY;
                projectilesRef.current.push({
                    id: `proj_${now}_${Math.random()}`,
                    sx: caster.x,
                    sy: caster.y - 12,
                    tx: destX,
                    ty: destY - 8,
                    color: targeting.vfxColor,
                    startTime: now,
                    duration: fastMode ? 170 : 280,
                    radius: targeting.shape !== 'single' ? 14 : 9
                });
                await waitMs(fastMode ? 160 : 260);
            } else if (targets[0]) {
                const dx = targets[0].x - caster.x;
                const dy = targets[0].y - caster.y;
                const len = Math.max(1, Math.hypot(dx, dy));
                lungeMapRef.current[caster.id] = {
                    dx: (dx / len) * 26,
                    dy: (dy / len) * 26,
                    until: performance.now() + 210
                };
                await waitMs(fastMode ? 70 : 120);
            }

            // Impact slashes & AoE ring
            const impNow = performance.now();
            if (targeting.shape !== 'single') {
                explosionsRef.current.push({
                    id: `aoe_${impNow}_${Math.random()}`,
                    x: centerX,
                    y: centerY,
                    maxRadius: metersToPx(Math.max(2.6, targeting.aoeRadiusMeters)),
                    color: targeting.vfxColor,
                    startTime: impNow,
                    duration: 460
                });
                spawnParticles(centerX, centerY, targeting.vfxColor, 34, 4.4);
                triggerShake(11, 300);
            }

            targets.forEach(t => {
                const ang = Math.atan2(t.y - caster.y, t.x - caster.x);
                slashArcsRef.current.push({
                    id: `slash_${impNow}_${t.id}`,
                    x: t.x,
                    y: t.y,
                    angle: ang,
                    color: targeting.vfxColor,
                    startTime: impNow,
                    duration: 320,
                    scale: caster.isBoss ? 1.45 : 1.15
                });
                hitFlashRef.current[t.id] = impNow + 220;
                spawnParticles(t.x, t.y, targeting.vfxColor, 18, 3.5);
            });
            triggerShake(8, 220);
        },
        [fastMode, spawnParticles, triggerShake, getTransform, viewportSize]
    );

    // Check victory / defeat
    const checkBattleOutcome = useCallback(
        (nextUnits: Bg3Unit[], curRound: number): boolean => {
            const aliveEnemies = nextUnits.filter(u => u.team === 'enemy' && u.hp > 0);
            const aliveAllies = nextUnits.filter(u => u.team === 'ally' && u.hp > 0);
            const playerUnitCheck = nextUnits.find(u => u.isPlayer);
            const isPlayerKo = Boolean(playerUnitCheck && playerUnitCheck.hp <= 0);
            if (aliveEnemies.length === 0 && !isPlayerKo) {
                setBattleEnded('victory');
                setBannerMsg('🏆 모든 적을 격파하고 전장을 완전히 제압했습니다!');
                const playerUnit = nextUnits.find(u => u.isPlayer);
                const compHps: Record<string, number> = {};
                const compMps: Record<string, number> = {};
                const compStatuses: Record<string, any[]> = {};
                nextUnits.forEach(u => {
                    if (u.sourceCompanionId) {
                        compHps[u.sourceCompanionId] = Math.max(0, u.hp);
                        compMps[u.sourceCompanionId] = Math.max(0, u.mp);
                        compStatuses[u.sourceCompanionId] = Array.isArray((u.sourceEntity as any)?.statusEffects)
                            ? [...(u.sourceEntity as any).statusEffects]
                            : [];
                    }
                });
                window.setTimeout(() => {
                    onComplete({
                        isVictory: true,
                        turns: curRound,
                        playerFinalHp: playerUnit ? Math.max(1, playerUnit.hp) : Math.max(1, character.stats.hp || 1),
                        playerFinalMp: playerUnit ? Math.max(0, playerUnit.mp) : Math.max(0, character.stats.mp || 0),
                        companionFinalHps: compHps,
                        companionFinalMps: compMps,
                        defeatedEnemyCount: nextUnits.filter(u => u.team === 'enemy' && u.hp <= 0).length,
                        usedSkillsByUnit: usedSkillsByUnitRef.current,
                        attackCountByUnit: attackCountByUnitRef.current,
                        playerFinalStatusEffects: playerUnit && Array.isArray((playerUnit.sourceEntity as any)?.statusEffects)
                            ? [...(playerUnit.sourceEntity as any).statusEffects]
                            : [...(character.statusEffects || [])],
                        companionFinalStatusEffects: compStatuses,
                        preRolledLoot: [...preRolledLootRef.current]
                    });
                }, 900);
                return true;
            }
            if (aliveAllies.length === 0 || isPlayerKo) {
                setBattleEnded('defeat');
                setBannerMsg(isPlayerKo ? '💀 플레이어가 전투불능이 되어 패배했습니다...' : '💀 아군 부대가 전멸했습니다...');
                const playerUnit = nextUnits.find(u => u.isPlayer);
                const compHps: Record<string, number> = {};
                const compMps: Record<string, number> = {};
                const compStatuses: Record<string, any[]> = {};
                nextUnits.forEach(u => {
                    if (u.sourceCompanionId) {
                        compHps[u.sourceCompanionId] = Math.max(1, u.hp);
                        compMps[u.sourceCompanionId] = Math.max(0, u.mp);
                        compStatuses[u.sourceCompanionId] = Array.isArray((u.sourceEntity as any)?.statusEffects)
                            ? [...(u.sourceEntity as any).statusEffects]
                            : [];
                    }
                });
                window.setTimeout(() => {
                    onComplete({
                        isVictory: false,
                        turns: curRound,
                        playerFinalHp: playerUnit ? 1 : Math.max(1, character.stats.hp || 1),
                        playerFinalMp: playerUnit ? Math.max(0, playerUnit.mp) : Math.max(0, character.stats.mp || 0),
                        companionFinalHps: compHps,
                        companionFinalMps: compMps,
                        defeatedEnemyCount: nextUnits.filter(u => u.team === 'enemy' && u.hp <= 0).length,
                        usedSkillsByUnit: usedSkillsByUnitRef.current,
                        attackCountByUnit: attackCountByUnitRef.current,
                        playerFinalStatusEffects: playerUnit && Array.isArray((playerUnit.sourceEntity as any)?.statusEffects)
                            ? [...(playerUnit.sourceEntity as any).statusEffects]
                            : [...(character.statusEffects || [])],
                        companionFinalStatusEffects: compStatuses
                    });
                }, 900);
                return true;
            }
            return false;
        },
        [onComplete]
    );

    // Smooth walk / jump animation
    const animateMove = useCallback(
        async (unitId: string, tx: number, ty: number, isJump = false) => {
            const cur = unitsRef.current.find(u => u.id === unitId);
            if (!cur) return;
            const d = distPx(cur.x, cur.y, tx, ty);
            const dir = calcDir(tx - cur.x, ty - cur.y);
            const dur = fastMode ? Math.min(260, Math.max(140, d * 0.7)) : Math.min(540, Math.max(220, d * 1.35));
            walkAnimRef.current = {
                unitId,
                sx: cur.x,
                sy: cur.y,
                tx,
                ty,
                isJump,
                startTime: performance.now(),
                duration: dur
            };
            await waitMs(dur);
            walkAnimRef.current = null;
            setUnits(prev =>
                prev.map(u =>
                    u.id === unitId
                        ? {
                              ...u,
                              x: tx,
                              y: ty,
                              dir,
                              remainingMeters: isJump ? u.remainingMeters : Math.max(0, +(u.remainingMeters - pxToMeters(d)).toFixed(1)),
                              hasBonusAction: isJump ? false : u.hasBonusAction
                          }
                        : u
                )
            );
            if (isJump) {
                explosionsRef.current.push({
                    id: `jmp_${Date.now()}`,
                    x: tx,
                    y: ty,
                    maxRadius: 56,
                    color: '#38bdf8',
                    startTime: performance.now(),
                    duration: 340
                });
                spawnParticles(tx, ty, '#7dd3fc', 16, 2.8);
            }
        },
        [fastMode, spawnParticles]
    );

    // Ask BG3 Reaction (Parry + Counter)
    const askReactionParry = useCallback(
        (defender: Bg3Unit, attacker: Bg3Unit, incomingDamage: number): Promise<boolean> => {
            if (autoBattle) return Promise.resolve(true);
            return new Promise<boolean>(resolve => {
                setReactionPrompt({ defender, attacker, incomingDamage, resolve });
            });
        },
        [autoBattle]
    );

    // Execute attack or skill at world point (or target unit)
    const executeCombatAction = useCallback(
        async (
            caster: Bg3Unit,
            targetX: number,
            targetY: number,
            skill: Skill | null,
            explicitTarget?: Bg3Unit,
            fromAi = false
        ) => {
            if ((!fromAi && isBusyRef.current) || battleEnded) return;
            const targeting = getBg3SkillTargeting(caster, skill);
            const mpCost = skill?.mpCost || 0;
            if (skill && (skill as any).isBondSkill) {
                const bondMp = checkSkillParticipantsMp(skill, character, caster.sourceEntity as any);
                if (!bondMp.isAllowed) {
                    if (!fromAi) setBannerMsg(bondMp.reason || '인연 스킬 마력이 부족합니다!');
                    return;
                }
            } else if (mpCost > caster.mp) {
                if (!fromAi) setBannerMsg(`MP가 부족합니다! (필요 MP ${mpCost})`);
                return;
            }

            // 아군 스킬 숙련도 & 무기 숙련도 누적 기록
            if (caster.team === 'ally') {
                const actorKey = caster.isPlayer ? 'player' : caster.sourceCompanionId || caster.id;
                attackCountByUnitRef.current[actorKey] = (attackCountByUnitRef.current[actorKey] || 0) + 1;
                if (skill?.name) {
                    if (!usedSkillsByUnitRef.current[actorKey]) usedSkillsByUnitRef.current[actorKey] = {};
                    usedSkillsByUnitRef.current[actorKey][skill.name] =
                        (usedSkillsByUnitRef.current[actorKey][skill.name] || 0) + 1;
                }
            }

            // Summon / Ninja Clone Skill -> 전장에 실제 독립 아군 유닛으로 소환!
            if (targeting.isSummon && skill) {
                setBusySafe(true);
                const spawned = createBg3SummonUnits(caster, skill, targetX, targetY, arenaW, arenaH);
                await emitDualLayerVfx(caster, spawned, targetX, targetY, skill, targeting);
                setUnits(prev => [
                    ...prev.map(u => (u.id === caster.id ? { ...u, mp: Math.max(0, u.mp - mpCost), hasAction: false, remainingMeters: 0 } : u)),
                    ...spawned
                ]);
                setInitiativeOrder(prev => [...prev, ...spawned.map(s => s.id)]);
                spawned.forEach(s => {
                    addFloatText(s.x, s.y - 26, `✨ ${s.name} 소환!`, '#38bdf8', 1.15);
                    spawnParticles(s.x, s.y, '#38bdf8', 22, 3.2);
                });
                const msg = `🌀 ${caster.name}이(가) [${skill.name}] 발동! ${spawned.map(s => s.name).join(', ')} 전장 합류 (${spawned[0]?.summonTurnsLeft || 3}턴)`;
                setBannerMsg(msg);
                pushCombatLog(msg, 'heal', roundNum);
                setActionMode('move');
                setSelectedSkill(null);
                if (!fromAi) setBusySafe(false);
                return;
            }

            // Pure Teleport / Movement Skill -> 장애물·기회공격 무시하고 지정 위치로 즉시 순간이동!
            if (targeting.isTeleport && skill) {
                const dM = pxToMeters(distPx(caster.x, caster.y, targetX, targetY));
                if (dM > targeting.rangeMeters + 0.35) {
                    if (!fromAi) setBannerMsg(`이동 사거리 초과! (최대 ${targeting.rangeMeters.toFixed(1)}m / 선택 ${dM.toFixed(1)}m)`);
                    return;
                }
                if (!isPointWalkable(targetX, targetY, caster.id, arena.obstacles, unitsRef.current, arenaW, arenaH)) {
                    if (!fromAi) setBannerMsg('해당 위치로 순간이동할 수 없습니다! (장애물 또는 유닛 겹침)');
                    return;
                }
                setBusySafe(true);
                const faceDir: Bg3Unit['dir'] = targetX >= caster.x ? 'right' : 'left';
                spawnParticles(caster.x, caster.y, '#c084fc', 26, 4.0);
                addFloatText(caster.x, caster.y - 32, '⚡ 순간이동!', '#c084fc', 1.2);
                setUnits(prev =>
                    prev.map(u => {
                        if (u.id !== caster.id) return u;
                        const nextMp = Math.max(0, u.mp - mpCost);
                        if (u.sourceEntity && (u.sourceEntity as any).stats) {
                            (u.sourceEntity as any).stats.mp = nextMp;
                        }
                        return { ...u, x: targetX, y: targetY, dir: faceDir, mp: nextMp, hasAction: false };
                    })
                );
                cameraTargetRef.current = { x: targetX, y: targetY };
                spawnParticles(targetX, targetY, '#fde047', 28, 4.2);
                addFloatText(targetX, targetY - 34, `✨ ${skill.name}`, '#e9d5ff', 1.15);
                const msg = `⚡ ${caster.name}이(가) [${skill.name}] 발동! (${dM.toFixed(1)}m 순간이동)`;
                setBannerMsg(msg);
                pushCombatLog(msg, 'info', roundNum);
                setActionMode('move');
                setSelectedSkill(null);
                if (!fromAi) setBusySafe(false);
                return;
            }

            // Support skill (Heal / MP Recov / Resurrection / Mana Shield / Cleanse / Buff) — SSOT 정규 엔진 100% 연동
            if (targeting.isSupport && skill) {
                setBusySafe(true);
                const isResurrectSkill = isBg3ResurrectionSkill(skill);
                const alliesPool = unitsRef.current.filter(u => u.team === caster.team && (isResurrectSkill ? true : u.hp > 0));
                const affected =
                    targeting.shape !== 'single'
                        ? alliesPool.filter(a => distPx(a.x, a.y, targetX, targetY) <= metersToPx(targeting.aoeRadiusMeters) + 4)
                        : [explicitTarget && explicitTarget.team === caster.team ? explicitTarget : (isResurrectSkill ? alliesPool.find(a => a.hp <= 0) || caster : caster)];
                const finalTargets = affected.length > 0 ? affected : [caster];

                await emitDualLayerVfx(caster, finalTargets, targetX, targetY, skill, targeting);

                const revivedIds: string[] = [];
                const collectedLogs: string[] = [];
                const isAoeSupport = targeting.shape !== 'single';

                const nextSupportUnits = unitsRef.current.map(u => {
                    let next = { ...u };
                    if (u.id === caster.id) {
                        // 스킬 사용 시 잔여 이동 거리 0으로 고정 (스킬 사용 후 추가 이동 불가)
                        next = { ...next, mp: Math.max(0, next.mp - mpCost), hasAction: false, remainingMeters: 0 };
                        if (next.sourceEntity && (next.sourceEntity as any).stats) {
                            (next.sourceEntity as any).stats.mp = next.mp;
                        }
                    }
                    if (finalTargets.some(t => t.id === u.id)) {
                        const res = applyBg3SkillBuffs(caster, next, skill, isAoeSupport);
                        next = res.unit;
                        collectedLogs.push(...res.logs);
                        if (res.revived) {
                            revivedIds.push(next.id);
                            addFloatText(next.x, next.y - 34, `✨ 부활! +${formatCompactKorean(res.healAmount)} HP`, '#fde047', 1.25);
                            spawnParticles(next.x, next.y, '#fde047', 28, 3.6);
                        } else if (res.healAmount > 0) {
                            addFloatText(next.x, next.y - 26, `+${formatCompactKorean(res.healAmount)} HP`, '#4ade80', 1.15);
                        }
                        if (res.mpGain > 0) {
                            addFloatText(next.x, next.y - 40, `+${formatCompactKorean(res.mpGain)} MP`, '#38bdf8', 1.05);
                        }
                        if (res.shieldGain > 0) {
                            addFloatText(next.x, next.y - 46, `🛡️ +${formatCompactKorean(res.shieldGain)}`, '#38bdf8', 1.1);
                        }
                        if (!res.revived && res.healAmount === 0 && res.buffApplied) {
                            addFloatText(next.x, next.y - 26, `✨ ${skill.name}`, '#fde047', 1.05);
                        }
                    }
                    return next;
                });
                setUnits(nextSupportUnits);

                // 라운드 도중 부활한 동료는 즉시 이니셔티브 순서에 재합류
                if (revivedIds.length > 0) {
                    setInitiativeOrder(prev => {
                        const missing = revivedIds.filter(id => !prev.includes(id));
                        return missing.length > 0 ? [...prev, ...missing] : prev;
                    });
                }

                const surf = createBg3SurfaceFromSkill(targetX, targetY, targeting.shinryokuType);
                if (surf) setSurfaces(prev => [...prev.slice(-10), surf]);

                const supMsg = collectedLogs[0] || `✨ ${caster.name}의 [${skill.name}] 발동! (${finalTargets.length}명 적용)`;
                setBannerMsg(supMsg);
                if (collectedLogs.length > 0) {
                    collectedLogs.forEach(l => pushCombatLog(l, 'heal', roundNum));
                } else {
                    pushCombatLog(supMsg, 'heal', roundNum);
                }
                setActionMode('move');
                setSelectedSkill(null);
                if (!fromAi) setBusySafe(false);
                return;
            }

            // Offensive / Debuff targeting (Single / Target Circle / Variable Cone / Rotated Square OBB)
            const enemiesAlive = unitsRef.current.filter(u => u.team !== caster.team && u.hp > 0);
            let targets: Bg3Unit[] = [];
            if (targeting.shape === 'single') {
                const picked =
                    explicitTarget && explicitTarget.team !== caster.team && explicitTarget.hp > 0
                        ? explicitTarget
                        : enemiesAlive.find(e => distPx(e.x, e.y, targetX, targetY) <= e.radius + 26);
                if (!picked) {
                    setBannerMsg('공격할 적을 클릭하세요.');
                    return;
                }
                if (pxToMeters(distPx(caster.x, caster.y, picked.x, picked.y)) > targeting.rangeMeters + 0.6) {
                    setBannerMsg(`사거리 밖입니다! (최대 ${targeting.rangeMeters.toFixed(1)}m)`);
                    return;
                }
                targets = [picked];
            } else if (targeting.shape === 'circle') {
                if (pxToMeters(distPx(caster.x, caster.y, targetX, targetY)) > targeting.rangeMeters + 0.8) {
                    setBannerMsg(`스킬 사거리 밖입니다! (최대 ${targeting.rangeMeters.toFixed(1)}m)`);
                    return;
                }
                const rPx = metersToPx(targeting.aoeRadiusMeters);
                targets = enemiesAlive.filter(e => distPx(e.x, e.y, targetX, targetY) <= rPx + 4);
                if (targets.length === 0) {
                    setBannerMsg('범위 안에 적이 없습니다.');
                    return;
                }
            } else if (targeting.shape === 'square') {
                const wPx = metersToPx(targeting.squareWidthMeters || 5);
                const lPx = metersToPx(targeting.squareLengthMeters || 10);
                targets = enemiesAlive.filter(e => isPointInSquareZone(caster.x, caster.y, targetX, targetY, wPx, lPx, e.x, e.y, 4));
                if (targets.length === 0) {
                    setBannerMsg('직사각형(Square) 범위 안에 적이 없습니다.');
                    return;
                }
            } else {
                // Variable-angle Cone
                const maxPx = metersToPx(targeting.rangeMeters);
                targets = enemiesAlive.filter(e =>
                    isPointInConeZone(caster.x, caster.y, targetX, targetY, maxPx, targeting.coneAngleDeg || 60, e.x, e.y, 4)
                );
                if (targets.length === 0) {
                    setBannerMsg('부채꼴(Cone) 범위 안에 적이 없습니다.');
                    return;
                }
            }

            setBusySafe(true);
            const aimX = targets.length === 1 ? targets[0].x : targetX;
            const aimY = targets.length === 1 ? targets[0].y : targetY;
            const faceDir = calcDir(aimX - caster.x, aimY - caster.y);

            const isPureDebuffSkill = skill?.type === SkillType.DEBUFF;

            // QTE (JUST IMPACT 타이밍 바 — 수동 공격 스킬 시전 시 발동, 상단 QTE 토글로 ON/OFF 가능)
            const qteRes =
                skill && !isPureDebuffSkill && caster.team === 'ally'
                    ? await runQteIfEnabled(skill.name, fromAi || autoBattle)
                    : { grade: 'GOOD' as const, mult: 1.0, extraBreak: 0, mpPaybackPct: 0 };
            if (qteRes.grade === 'JUST') {
                addFloatText(caster.x, caster.y - 44, '⚡ JUST IMPACT! (×1.25 · 브레이크+1)', '#fde047', 1.25);
                pushCombatLog(`⚡ [QTE JUST IMPACT!] ${caster.name}의 [${skill?.name}] 위력 1.25배 + MP 20% 페이백!`, 'heal', roundNum);
            } else if (qteRes.grade === 'MISS') {
                addFloatText(caster.x, caster.y - 44, 'MISS TIMING (×0.85)', '#94a3b8', 0.95);
            }

            // 인연 스킬 발동 시: 파트너 스프라이트가 시전자 옆으로 딱 붙어 합류 + 양측 visualUrl 듀얼 합체 컷인 배너 발동!
            const bondCompId = (skill as any)?.isBondSkill ? (skill as any)?.companionId : undefined;
            if (bondCompId && skill) {
                setBondGauges(prev => ({ ...prev, [bondCompId]: 0 }));
                const partnerUnit = unitsRef.current.find(u => u.sourceCompanionId === bondCompId && u.hp > 0);
                const partnerObj = (character.companions || []).find(c => c.id === bondCompId);
                setBondCutIn({
                    skillName: skill.name,
                    casterName: caster.name,
                    casterVisualUrl: caster.visualUrl,
                    partnerName: partnerUnit?.name || partnerObj?.name || '인연 동료',
                    partnerVisualUrl: partnerUnit?.visualUrl || partnerObj?.visualUrl
                });
                window.setTimeout(() => setBondCutIn(null), 1450);

                // 파트너 스프라이트를 시전자 바로 옆(x+30, y)으로 돌진 합체!
                if (partnerUnit) {
                    const joinX = Math.max(48, Math.min(arenaW - 48, caster.x + 30));
                    const joinY = Math.max(48, Math.min(arenaH - 48, caster.y));
                    await animateMove(partnerUnit.id, joinX, joinY, true);
                    spawnParticles((caster.x + joinX) / 2, caster.y, '#f472b6', 28, 3.8);
                    addFloatText((caster.x + joinX) / 2, caster.y - 36, `💞 인연 공명! [${skill.name}]`, '#f472b6', 1.25);
                }
                pushCombatLog(`💞 [인연 합체기 발동!] ${caster.name} × ${partnerUnit?.name || partnerObj?.name || '동료'}의 [${skill.name}]!`, 'heal', roundNum);
            }

            // [돌진(Dash) / 텔레포트(Teleport) 이동 연계 공격!]
            const skillMoveMode = skill?.zoneConfig?.movementMode;
            let casterAfterMoveX = caster.x;
            let casterAfterMoveY = caster.y;
            if ((skillMoveMode === 'dash' || skillMoveMode === 'teleport') && !isPureDebuffSkill) {
                const angToAim = Math.atan2(aimY - caster.y, aimX - caster.x);
                const standoffPx = targets.length === 1 ? (targets[0].radius || 22) + (caster.radius || 20) + 6 : 24;
                const distToAim = distPx(caster.x, caster.y, aimX, aimY);
                const moveDist = Math.max(0, distToAim - standoffPx);
                const landX = Math.max(48, Math.min(arenaW - 48, caster.x + Math.cos(angToAim) * moveDist));
                const landY = Math.max(48, Math.min(arenaH - 48, caster.y + Math.sin(angToAim) * moveDist));

                if (skillMoveMode === 'dash') {
                    spawnParticles(caster.x, caster.y, '#38bdf8', 16, 3.4);
                    addFloatText(caster.x, caster.y - 32, '💨 돌진!', '#38bdf8', 1.15);
                    await animateMove(caster.id, landX, landY, false);
                    spawnParticles(landX, landY, '#38bdf8', 18, 3.8);
                    pushCombatLog(`💨 ${caster.name}이(가) [${skill?.name}] 돌진 이동 공격!`, 'info', roundNum);
                } else {
                    // 텔레포트: 장애물·기회공격 무시하고 즉시 순간이동!
                    spawnParticles(caster.x, caster.y, '#c084fc', 24, 4.0);
                    addFloatText(caster.x, caster.y - 32, '⚡ 순간이동!', '#c084fc', 1.15);
                    setUnits(prev => prev.map(u => (u.id === caster.id ? { ...u, x: landX, y: landY, dir: faceDir } : u)));
                    cameraTargetRef.current = { x: landX, y: landY };
                    spawnParticles(landX, landY, '#fde047', 26, 4.2);
                    addFloatText(landX, landY - 36, '⚡ 텔레포트 타격!', '#fde047', 1.2);
                    pushCombatLog(`⚡ ${caster.name}이(가) [${skill?.name}] 텔레포트 순간이동 공격!`, 'info', roundNum);
                }
                casterAfterMoveX = landX;
                casterAfterMoveY = landY;
            }

            await emitDualLayerVfx({ ...caster, x: casterAfterMoveX, y: casterAfterMoveY }, targets, aimX, aimY, skill, targeting);

            const effectiveMpCost = Math.max(0, Math.round(mpCost * (1 - qteRes.mpPaybackPct)));
            let updatedUnits = unitsRef.current.map(u => {
                if (u.id === caster.id) {
                    const nextMp = Math.max(0, u.mp - effectiveMpCost);
                    if (u.sourceEntity && (u.sourceEntity as any).stats) {
                        (u.sourceEntity as any).stats.mp = nextMp;
                    }
                    return {
                        ...u,
                        x: casterAfterMoveX,
                        y: casterAfterMoveY,
                        dir: faceDir,
                        mp: nextMp,
                        hasAction: false,
                        // 스킬 사용 시 잔여 이동 거리 0으로 고정 (스킬 사용 후 추가 이동 불가)
                        remainingMeters: skill ? 0 : u.remainingMeters
                    };
                }
                if (bondCompId && u.sourceCompanionId === bondCompId) {
                    const nextCompMp = Math.max(0, u.mp - mpCost);
                    if (u.sourceEntity && (u.sourceEntity as any).stats) {
                        (u.sourceEntity as any).stats.mp = nextCompMp;
                    }
                    return { ...u, mp: nextCompMp };
                }
                return u;
            });
            let totalDmg = 0;
            let kills = 0;
            let comboBanner = '';
            let anyCritByAlly = false;

            for (const target of targets) {
                const curTargetObj = updatedUnits.find(u => u.id === target.id) || target;
                const curCasterObj = updatedUnits.find(u => u.id === caster.id) || caster;

                // 순수 디버프 스킬: CTRL 저항 판정 + 정규 디버프/상태이상 SSOT 적용
                if (isPureDebuffSkill && skill) {
                    const debRes = applyBg3SkillDebuffs(curCasterObj, curTargetObj, skill);
                    debRes.logs.forEach(l => pushCombatLog(l, debRes.resisted ? 'info' : 'warn', roundNum));
                    if (debRes.resisted) {
                        addFloatText(target.x, target.y - 26, '🛡️ 저항!', '#94a3b8', 1.05);
                    } else if (debRes.applied) {
                        addFloatText(target.x, target.y - 26, `💀 ${skill.name}`, '#f43f5e', 1.1);
                    }
                    updatedUnits = updatedUnits.map(u => (u.id === target.id ? debRes.unit : u));
                    continue;
                }

                const res = calculateBg3Damage(curCasterObj, curTargetObj, skill, arena.obstacles, surfacesRef.current, character);
                // 최종강화 [집중 융합]: 광역 스킬로 적 1명만 적중 시 배율 적용 ({ multiplier, logTag } 객체 안전 분해!)
                const focusRes = skill ? getFocusFusionDamageMultiplier(skill, targets.length) : { multiplier: 1, logTag: '' };
                const focusMult = typeof focusRes === 'number' ? focusRes : (focusRes?.multiplier || 1);
                let finalDmg = Math.max(1, Math.round(res.damage * qteRes.mult * focusMult));
                if (focusMult > 1) {
                    pushCombatLog(`🎯 [집중 융합] 발동! 단일 대상 피해 ×${focusMult.toFixed(2)}`, 'heal', roundNum);
                }
                if (res.affinityEffect && res.affinityEffect.includes('약점')) {
                    addFloatText(curTargetObj.x, curTargetObj.y - 68, `⚡ 속성 약점!`, '#fde047', 0.95);
                }
                if (Array.isArray(res.additionalLogs) && res.additionalLogs.length > 0) {
                    res.additionalLogs.forEach(l => pushCombatLog(l, 'dmg', roundNum));
                }
                if (res.isCrit && curCasterObj.team === 'ally') anyCritByAlly = true;

                // 신력 브레이크 게이지 차감 (약점 신력 타격 시 -1, QTE JUST 시 추가 -1!)
                const atkElem = targeting.shinryokuType || curCasterObj.element;
                const defElem = curTargetObj.element || '무속성';
                const aff = SHINRYOKU_AFFINITY[atkElem];
                if (aff && defElem !== '무속성' && !res.isMiss) {
                    if (aff.strong?.includes(defElem)) {
                        addFloatText(curTargetObj.x, curTargetObj.y - 74, `⚡ 신력상성 우위 (${atkElem} ▶ ${defElem})`, '#38bdf8', 0.92);
                        pushCombatLog(`[신력상성] ${atkElem} ▶ ${defElem} (상성 우위)`, 'info', roundNum);
                    } else if (aff.weak?.includes(defElem)) {
                        addFloatText(curTargetObj.x, curTargetObj.y - 74, `⚠️ 신력상성 열세 (${atkElem} ◀ ${defElem})`, '#f87171', 0.92);
                        pushCombatLog(`[신력상성] ${atkElem} ◀ ${defElem} (상성 열세)`, 'warn', roundNum);
                    }
                }
                const isWeakHit = isShinryokuWeaknessHit(atkElem, curTargetObj.element);
                const breakDmg = (isWeakHit ? 1 : 0) + (isWeakHit ? qteRes.extraBreak : 0);
                if (breakDmg > 0 && curTargetObj.sourceEntity && !res.isMiss) {
                    const defMaxBrk =
                        curTargetObj.team === 'ally'
                            ? getAllyMaxBreakGauge(character, curTargetObj.sourceEntity as any)
                            : getEnemyMaxBreakGauge(curTargetObj.sourceEntity as any);
                    const brkRes = applyShinryokuBreakHit(curTargetObj.sourceEntity as any, breakDmg, defMaxBrk);
                    if (brkRes.triggeredBreak) {
                        addFloatText(curTargetObj.x, curTargetObj.y - 60, '💥 신력 브레이크! (피해 1.5배)', '#fbbf24', 1.35);
                        spawnParticles(curTargetObj.x, curTargetObj.y, '#fbbf24', 30, 4.5);
                        triggerShake(14, 340);
                        pushCombatLog(brkRes.log.trim(), 'warn', roundNum);
                        finalDmg = Math.round(finalDmg * 1.5);
                    } else if (brkRes.log) {
                        addFloatText(curTargetObj.x, curTargetObj.y - 52, `🛡️ 약점! 실드 -${breakDmg}`, '#38bdf8', 0.95);
                    }
                    updatedUnits = updatedUnits.map(u =>
                        u.id === curTargetObj.id
                            ? {
                                  ...u,
                                  breakGauge: (curTargetObj.sourceEntity as any).breakGauge ?? u.breakGauge,
                                  stunnedTurns: brkRes.triggeredBreak ? Math.max(1, u.stunnedTurns) : u.stunnedTurns
                              }
                            : u
                    );
                }

                if (res.isMiss) {
                    addFloatText(target.x, target.y - 24, 'MISS', '#94a3b8', 1.0);
                    continue;
                }

                const latestTarget = updatedUnits.find(u => u.id === target.id) || curTargetObj;
                const latestCaster = updatedUnits.find(u => u.id === caster.id) || curCasterObj;
                const beforeHp = latestTarget.hp || 0;

                // 정규 보호막(CombatShieldService) + 불멸 환생/UNDEAD 사망방지 일괄 처리
                const dmgApplied = applyBg3DamageWithShieldAndRevival(latestTarget, finalDmg);
                let hpDmg = dmgApplied.hpDamage;
                let nextTargetUnit = dmgApplied.unit;
                let nextCasterUnit = latestCaster;

                // 최종강화 [신력 여진]: 적중 후 추가 폭발 여진 피해 ({ hasAftershock, aftershockDamage } 객체 안전 분해!)
                const echoRes = skill && nextTargetUnit.hp > 0 ? getEchoAftershockDamage(skill, hpDmg) : { hasAftershock: false, aftershockDamage: 0 };
                const echoDmg = typeof echoRes === 'number' ? echoRes : (echoRes?.hasAftershock ? echoRes.aftershockDamage : 0);
                if (echoDmg > 0) {
                    const echoApplied = applyBg3DamageWithShieldAndRevival(nextTargetUnit, echoDmg);
                    nextTargetUnit = echoApplied.unit;
                    hpDmg += echoApplied.hpDamage;
                    addFloatText(target.x, target.y - 54, `🌊 신력 여진 -${formatCompactKorean(echoApplied.hpDamage)}`, '#a855f7', 1.1);
                    pushCombatLog(`🌊 [신력 여진] ${target.name}에게 추가 여진 피해 -${formatCompactKorean(echoApplied.hpDamage)}!`, 'dmg', roundNum);
                }

                if (dmgApplied.shieldAbsorbed > 0) {
                    addFloatText(target.x, target.y - 44, `🛡️ 보호막 -${formatCompactKorean(dmgApplied.shieldAbsorbed)}`, '#38bdf8', 1.0);
                }
                dmgApplied.logs.forEach(l => pushCombatLog(l, dmgApplied.revived ? 'heal' : 'info', roundNum));
                if (dmgApplied.revived) {
                    addFloatText(target.x, target.y - 54, `✨ 불사/환생 발동!`, '#fde047', 1.25);
                    spawnParticles(target.x, target.y, '#fde047', 26, 3.6);
                }

                totalDmg += hpDmg;
                if (res.comboName) {
                    comboBanner = res.comboName;
                    addFloatText(target.x, target.y - 48, res.comboName, '#38bdf8', 1.2);
                }
                addFloatText(
                    target.x,
                    target.y - 22,
                    `${res.isCrit ? 'CRIT! ' : ''}-${formatCompactKorean(hpDmg)}`,
                    res.isCrit ? '#fde047' : '#fb7185',
                    res.isCrit ? 1.3 : 1.05
                );

                // 공격 스킬 부가 디버프/상태이상 SSOT 적용
                if (skill && nextTargetUnit.hp > 0) {
                    const secDeb = applyBg3SkillDebuffs(nextCasterUnit, nextTargetUnit, skill);
                    if (secDeb.applied) {
                        nextTargetUnit = secDeb.unit;
                        secDeb.logs.forEach(l => pushCombatLog(l, 'warn', roundNum));
                    }
                }
                if (res.stunsTarget && nextTargetUnit.hp > 0) {
                    nextTargetUnit = { ...nextTargetUnit, stunnedTurns: Math.max(nextTargetUnit.stunnedTurns, 1) };
                }

                // 신화/마계 피격·타격 옵션 (ABSORB/DEMONIZE/CURSE_SPREAD/REFLECT) & 장비 상태이상(processEquipmentOnHit)
                const postHook = applyBg3PostAttackHooks(nextCasterUnit, nextTargetUnit, { damage: hpDmg, isCrit: res.isCrit });
                nextCasterUnit = postHook.attacker;
                nextTargetUnit = postHook.target;
                postHook.logs.forEach(l => pushCombatLog(l, 'info', roundNum));

                // 패시브 흡혈 & 반사 처리
                const lifestealHeal = nextCasterUnit.passiveLifestealPct > 0 ? Math.round((hpDmg * nextCasterUnit.passiveLifestealPct) / 100) : 0;
                const reflectDmg = nextTargetUnit.passiveReflectPct > 0 ? Math.round((hpDmg * nextTargetUnit.passiveReflectPct) / 100) : 0;
                if (lifestealHeal > 0 && nextCasterUnit.hp > 0) {
                    nextCasterUnit = { ...nextCasterUnit, hp: Math.min(nextCasterUnit.maxHp, nextCasterUnit.hp + lifestealHeal) };
                    addFloatText(nextCasterUnit.x, nextCasterUnit.y - 26, `🩸 +${formatCompactKorean(lifestealHeal)}`, '#4ade80', 0.95);
                }
                if (reflectDmg > 0 && nextCasterUnit.hp > 0) {
                    const refRes = applyBg3DamageWithShieldAndRevival(nextCasterUnit, reflectDmg);
                    nextCasterUnit = refRes.unit;
                    addFloatText(nextCasterUnit.x, nextCasterUnit.y - 40, `⚡ 반사 -${formatCompactKorean(reflectDmg)}`, '#f43f5e', 0.95);
                }

                if (beforeHp > 0 && nextTargetUnit.hp <= 0) {
                    kills += 1;
                    spawnKillBurst(target);
                }

                updatedUnits = updatedUnits.map(u => {
                    if (u.id === target.id) return nextTargetUnit;
                    if (u.id === caster.id) return nextCasterUnit;
                    return u;
                });
            }

            // [Item #3] 공격 + 버프 복합 스킬인 경우 범위 내 아군에게 정규 SSOT 버프/회복/마나쉴드/정화 적용!
            const hasAttackBuff =
                skill &&
                (skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC) &&
                ((Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0) ||
                    skill.finalEnhanceData?.addedEffect?.type === 'buff' ||
                    /\[버프:|BUFF:|MANA_SHIELD|마나\s*쉴드/i.test(skill.effectFormula || ''));
            if (hasAttackBuff && skill) {
                const buffAllies = updatedUnits.filter(u => {
                    if (u.team !== caster.team || u.hp <= 0) return false;
                    // [FIX] 단일 물리/마법 + 버프 스킬은 버프가 전체 아군에 퍼지지 않고 무조건 시전자 본인에게만 적용!
                    if (targeting.shape === 'single') {
                        return u.id === caster.id;
                    }
                    if (u.id === caster.id) return true;
                    if (targeting.shape === 'circle') {
                        return distPx(u.x, u.y, aimX, aimY) <= metersToPx(targeting.aoeRadiusMeters) + 4;
                    }
                    if (targeting.shape === 'cone') {
                        return isPointInConeZone(caster.x, caster.y, aimX, aimY, metersToPx(targeting.rangeMeters), targeting.coneAngleDeg || 60, u.x, u.y, 4);
                    }
                    if (targeting.shape === 'square') {
                        return isPointInSquareZone(caster.x, caster.y, aimX, aimY, metersToPx(targeting.squareWidthMeters || 5), metersToPx(targeting.squareLengthMeters || 10), u.x, u.y, 4);
                    }
                    return u.id === caster.id;
                });

                const effectiveBuffSkill: Skill =
                    skill.finalEnhanceData?.addedEffect?.type === 'buff' && (!skill.buffEffects || skill.buffEffects.length === 0)
                        ? {
                              ...skill,
                              buffEffects: [
                                  {
                                      type: 'STAT_BOOST',
                                      targetStat: skill.finalEnhanceData.addedEffect.stat || 'STR',
                                      value: skill.finalEnhanceData.addedEffect.value || 15
                                  } as any
                              ]
                          }
                        : skill;

                const latestCasterForBuff = updatedUnits.find(u => u.id === caster.id) || caster;
                const isAoeComposite = targeting.shape !== 'single';
                const compLogs: string[] = [];

                updatedUnits = updatedUnits.map(u => {
                    if (!buffAllies.some(a => a.id === u.id)) return u;
                    const bRes = applyBg3SkillBuffs(latestCasterForBuff, u, effectiveBuffSkill, isAoeComposite);
                    compLogs.push(...bRes.logs);
                    if (bRes.healAmount > 0) addFloatText(u.x, u.y - 34, `+${formatCompactKorean(bRes.healAmount)} HP`, '#4ade80', 1.0);
                    if (bRes.shieldGain > 0) addFloatText(u.x, u.y - 46, `🛡️ +${formatCompactKorean(bRes.shieldGain)}`, '#38bdf8', 1.05);
                    if (bRes.buffApplied && bRes.healAmount === 0) addFloatText(u.x, u.y - 26, `✨ ${skill.name}`, '#fde047', 1.05);
                    return bRes.unit;
                });
                if (compLogs.length > 0) {
                    compLogs.forEach(l => pushCombatLog(l, 'heal', roundNum));
                } else {
                    pushCombatLog(`✨ [${skill.name}] 부가 버프가 아군 ${buffAllies.length}명에게 적용되었습니다!`, 'heal', roundNum);
                }
            }

            if (anyCritByAlly) {
                chargeBondGauges(10);
            }

            // [탈것 몬스터 자동 협공!] 장착한 탈것이 있는 아군이 공격(기본/스킬) 시 턴당 정확히 1회만 뛰어나오며 자동 추가 공격!
            const mountTurnKey = `${roundNum}:${turnIdx}:${caster.id}`;
            if (caster.team === 'ally' && caster.mountEntity && !isPureDebuffSkill && mountAttackedTurnKeyRef.current !== mountTurnKey) {
                mountAttackedTurnKeyRef.current = mountTurnKey;
                const mount = caster.mountEntity;
                const liveMountTarget =
                    targets.map(t => updatedUnits.find(u => u.id === t.id)).find(u => u && u.hp > 0) ||
                    updatedUnits
                        .filter(u => u.team === 'enemy' && u.hp > 0)
                        .sort((a, b) => distPx(caster.x, caster.y, a.x, a.y) - distPx(caster.x, caster.y, b.x, b.y))[0];

                if (liveMountTarget) {
                    mountDashAnimsRef.current.push({
                        id: `mnt_${Date.now()}_${Math.random()}`,
                        mountName: mount.name,
                        visualUrl: caster.mountVisualUrl || (mount as any).monsterData?.visualUrl || mount.visualUrl || (mount as any).appearance,
                        sx: caster.x - 16,
                        sy: caster.y - 8,
                        tx: liveMountTarget.x,
                        ty: liveMountTarget.y,
                        startTime: performance.now(),
                        duration: 540
                    });

                    const mountAttackSkills = (mount.skills || []).filter(
                        s => (s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC) && (s.mpCost || 0) <= (mount.stats?.mp || 9999)
                    );
                    const chosenMountSkill =
                        mountAttackSkills.length > 0 && Math.random() < 0.65
                            ? mountAttackSkills[Math.floor(Math.random() * mountAttackSkills.length)]
                            : undefined;

                    const mCalc = calculateDamage(mount as any, liveMountTarget.sourceEntity as any, chosenMountSkill, character);
                    const rawMountDmg = Math.max(25, Math.round((mCalc.damage || 30) + (mCalc.additionalDamage || []).reduce((s, a) => s + (a.damage || 0), 0)));
                    const mBeforeHp = liveMountTarget.hp;
                    const mApplied = applyBg3DamageWithShieldAndRevival(liveMountTarget, rawMountDmg);
                    totalDmg += mApplied.hpDamage;

                    spawnParticles(liveMountTarget.x, liveMountTarget.y, '#34d399', 18, 3.6);
                    addFloatText(
                        liveMountTarget.x,
                        liveMountTarget.y - 44,
                        `🐎 ${mount.name} ${chosenMountSkill ? `[${chosenMountSkill.name}] ` : '협공 '}-${formatCompactKorean(mApplied.hpDamage)}`,
                        '#34d399',
                        1.15
                    );
                    pushCombatLog(
                        `🐎 [탈것 협공] ${caster.name}의 탈것 [${mount.name}]이(가) 뛰어나와 ${liveMountTarget.name}에게 ${formatCompactKorean(mApplied.hpDamage)} 피해!`,
                        'dmg',
                        roundNum
                    );
                    if (mBeforeHp > 0 && mApplied.unit.hp <= 0) {
                        kills += 1;
                        spawnKillBurst(liveMountTarget);
                    }
                    updatedUnits = updatedUnits.map(u => (u.id === liveMountTarget.id ? mApplied.unit : u));
                }
            }

            // Create elemental surface pool
            const newPool = createBg3SurfaceFromSkill(aimX, aimY, targeting.shinryokuType);
            if (newPool) {
                setSurfaces(prev => [...prev.slice(-10), newPool]);
            }

            setUnits(updatedUnits);
            const atkMsg = `${caster.name}의 [${skill?.name || caster.weaponLabel || '기본 공격'}]! 총 ${formatCompactKorean(totalDmg)} 피해${
                kills > 0 ? ` (💀 ${kills}명 처치!)` : ''
            }${comboBanner ? ` · ${comboBanner}` : ''}`;
            setBannerMsg(atkMsg);
            pushCombatLog(atkMsg, 'dmg', roundNum);
            setActionMode('move');
            setSelectedSkill(null);
            if (!fromAi) setBusySafe(false);

            checkBattleOutcome(updatedUnits, roundNum);
        },
        [
            battleEnded,
            arena.obstacles,
            character,
            roundNum,
            setBusySafe,
            emitDualLayerVfx,
            askReactionParry,
            addFloatText,
            spawnKillBurst,
            checkBattleOutcome
        ]
    );

    // Handle BG3 Shove (Bonus Action)
    const executeShove = useCallback(
        async (caster: Bg3Unit, target: Bg3Unit) => {
            if (!caster.hasBonusAction || isBusy) return;
            if (pxToMeters(distPx(caster.x, caster.y, target.x, target.y)) > 2.8) {
                setBannerMsg('밀치기는 2.6m 이내의 인접한 적에게만 사용할 수 있습니다!');
                return;
            }
            setIsBusy(true);
            const shoveRes = resolveBg3Shove(caster, target, arena.obstacles, surfacesRef.current, arenaW, arenaH);
            await animateMove(target.id, shoveRes.newX, shoveRes.newY, true);
            triggerShake(9, 240);

            let updatedUnits = unitsRef.current.map(u => {
                if (u.id === caster.id) return { ...u, hasBonusAction: false };
                if (u.id === target.id) {
                    const nextHp = Math.max(0, u.hp - shoveRes.bonusDamage);
                    if (u.hp > 0 && nextHp <= 0) spawnKillBurst({ ...u, x: shoveRes.newX, y: shoveRes.newY });
                    return { ...u, x: shoveRes.newX, y: shoveRes.newY, hp: nextHp };
                }
                return u;
            });
            addFloatText(
                shoveRes.newX,
                shoveRes.newY - 28,
                shoveRes.bonusDamage > 0 ? `💥 ${shoveRes.reason} -${formatCompactKorean(shoveRes.bonusDamage)}` : `💥 ${shoveRes.reason}`,
                '#fb923c',
                1.15
            );
            setUnits(updatedUnits);
            setBannerMsg(`💥 ${caster.name}이(가) ${target.name}을(를) 밀쳐냈습니다! (${shoveRes.reason})`);
            setActionMode('move');
            setIsBusy(false);
            checkBattleOutcome(updatedUnits, roundNum);
        },
        [isBusy, arena.obstacles, animateMove, triggerShake, spawnKillBurst, addFloatText, checkBattleOutcome, roundNum]
    );

    // Advance Initiative Turn
    const advanceTurn = useCallback(() => {
        if (battleEnded) return;
        const alive = unitsRef.current.filter(u => u.hp > 0);
        if (checkBattleOutcome(unitsRef.current, roundNum)) return;

        let nextIdx = turnIdx + 1;
        let nextOrder = initiativeOrder;
        let nextRound = roundNum;

        while (nextIdx < nextOrder.length) {
            const candidate = alive.find(u => u.id === nextOrder[nextIdx]);
            if (candidate) break;
            nextIdx++;
        }

        if (nextIdx >= nextOrder.length) {
            // New Round!
            nextRound = roundNum + 1;
            nextOrder = buildBg3Initiative(alive);
            nextIdx = 0;

            // Tick buffs, surfaces, passive turn effects (CombatUtils.processTurnStart & processPassiveTurnEffects), role MP regen, and reset action economy
            setSurfaces(prev => prev.map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0));
            const roundLogs: string[] = [];
            const working = [...unitsRef.current];
            for (let idx = 0; idx < working.length; idx++) {
                const u = working[idx];
                if (u.hp <= 0) continue;

                // 1. 지형 회복 / 화염 지면
                let terrainHeal = 0;
                arena.obstacles.forEach(o => {
                    if (o.healPct && distPx(u.x, u.y, o.x, o.y) <= o.radius + 26) {
                        terrainHeal = Math.max(terrainHeal, Math.round((u.maxHp * o.healPct) / 100));
                    }
                });
                const onFire = surfacesRef.current.find(s => s.type === 'fire' && distPx(u.x, u.y, s.x, s.y) <= s.radius);
                const burn = onFire ? Math.max(40, Math.round(u.maxHp * 0.06)) : 0;
                if (terrainHeal > 0) addFloatText(u.x, u.y - 24, `+${formatCompactKorean(terrainHeal)} HP`, '#4ade80', 0.95);
                if (burn > 0) addFloatText(u.x, u.y - 24, `🔥 -${formatCompactKorean(burn)}`, '#f97316', 0.95);

                // 2. 소환수 수명 차감
                const nextSummonTurns = u.isSummon ? (u.summonTurnsLeft ?? 1) - 1 : undefined;
                if (u.isSummon && (nextSummonTurns ?? 0) <= 0) {
                    addFloatText(u.x, u.y - 26, `💨 ${u.name} 소멸`, '#94a3b8', 1.0);
                    working[idx] = { ...u, hp: 0, summonTurnsLeft: 0 };
                    continue;
                }

                // 3. 역할별 라운드 MP 자연회복 (useGame.ts:5158-5208)
                let roleMpRegen = 0;
                const roleStr = String((u.sourceEntity as any)?.battleRole || '');
                if (roleStr.includes('힐러') || roleStr.includes('버퍼') || roleStr.includes('디버퍼')) {
                    roleMpRegen = Math.max(1, Math.floor(u.maxMp * 0.015));
                } else if (roleStr.includes('서포터')) {
                    roleMpRegen = Math.max(1, Math.floor(u.maxMp * 0.01));
                } else if (roleStr.includes('올라운더')) {
                    roleMpRegen = Math.max(1, Math.floor(u.maxMp * 0.005));
                }

                // 4. 정규 턴 시작 처리 (패시브 재생, 도트 피해(치사 가능), 결계, 턴 차감, 패시브 광역, CC 판정)
                let nextU: Bg3Unit = {
                    ...u,
                    hp: Math.max(0, Math.min(u.maxHp, u.hp + terrainHeal - burn)),
                    mp: Math.min(u.maxMp, u.mp + roleMpRegen),
                    isDefending: false,
                    summonTurnsLeft: nextSummonTurns
                };
                const turnStartRes = processBg3TurnStart(nextU, working, character);
                nextU = turnStartRes.unit;
                roundLogs.push(...turnStartRes.logs);

                // [신력 특수 패시브 시각 이펙트!] 재생 / 성역 / 광합성 / 열기 / 월암 / 냉기 명확히 연출!
                const joinedLogs = turnStartRes.logs.join(' ');
                if (/재생|성역|광합성|지속 치유|지속 마력/.test(joinedLogs)) {
                    const isSanctuary = joinedLogs.includes('성역');
                    const fxColor = isSanctuary ? '#fde047' : '#4ade80';
                    explosionsRef.current.push({
                        id: `pas_heal_${Date.now()}_${u.id}`,
                        x: u.x,
                        y: u.y,
                        maxRadius: 58,
                        color: fxColor,
                        startTime: performance.now(),
                        duration: 520
                    });
                    spawnParticles(u.x, u.y, fxColor, 18, 3.0);
                    addFloatText(u.x, u.y - 44, isSanctuary ? '🌟 성역 재생!' : '🌿 패시브 재생!', fxColor, 1.1);
                }
                if (/열기|태양열|화염 오라/.test(joinedLogs)) {
                    explosionsRef.current.push({
                        id: `pas_heat_${Date.now()}_${u.id}`,
                        x: u.x,
                        y: u.y,
                        maxRadius: 110,
                        color: '#f97316',
                        startTime: performance.now(),
                        duration: 560
                    });
                    spawnParticles(u.x, u.y, '#f97316', 24, 4.0);
                    addFloatText(u.x, u.y - 52, '🔥 신력 패시브: 열기 발동!', '#fb923c', 1.15);
                }
                if (/월암/.test(joinedLogs)) {
                    explosionsRef.current.push({
                        id: `pas_lunar_${Date.now()}_${u.id}`,
                        x: u.x,
                        y: u.y,
                        maxRadius: 110,
                        color: '#a855f7',
                        startTime: performance.now(),
                        duration: 560
                    });
                    spawnParticles(u.x, u.y, '#a855f7', 22, 3.8);
                    addFloatText(u.x, u.y - 52, '🌙 신력 패시브: 월암 발동!', '#c084fc', 1.15);
                }
                if (/냉기/.test(joinedLogs)) {
                    explosionsRef.current.push({
                        id: `pas_ice_${Date.now()}_${u.id}`,
                        x: u.x,
                        y: u.y,
                        maxRadius: 110,
                        color: '#38bdf8',
                        startTime: performance.now(),
                        duration: 560
                    });
                    spawnParticles(u.x, u.y, '#38bdf8', 22, 3.8);
                    addFloatText(u.x, u.y - 52, '❄️ 신력 패시브: 냉기 발동!', '#7dd3fc', 1.15);
                }

                // 패시브 광역 효과로 영향받은 상대 유닛 반영 + 피격 이펙트
                turnStartRes.otherUnitUpdates.forEach((updatedOpp, oppId) => {
                    const oIdx = working.findIndex(x => x.id === oppId);
                    if (oIdx >= 0) {
                        const prevOpp = working[oIdx];
                        if (updatedOpp.hp < prevOpp.hp) {
                            const pDmg = prevOpp.hp - updatedOpp.hp;
                            spawnParticles(prevOpp.x, prevOpp.y, '#f97316', 14, 3.2);
                            addFloatText(prevOpp.x, prevOpp.y - 32, `🔥 열기 -${formatCompactKorean(pDmg)}`, '#fb923c', 1.05);
                        } else if ((updatedOpp.activeStatuses?.length || 0) > (prevOpp.activeStatuses?.length || 0)) {
                            spawnParticles(prevOpp.x, prevOpp.y, '#c084fc', 14, 3.0);
                            addFloatText(prevOpp.x, prevOpp.y - 32, '⚠️ 패시브 약화!', '#c084fc', 1.0);
                        }
                        working[oIdx] = updatedOpp;
                    }
                });

                if (turnStartRes.skipTurn && nextU.hp > 0) {
                    addFloatText(nextU.x, nextU.y - 34, `⚠️ ${turnStartRes.skipReason || '행동불가'}!`, '#38bdf8', 1.1);
                }

                working[idx] = {
                    ...nextU,
                    remainingMeters: turnStartRes.moveLocked || turnStartRes.skipTurn ? 0 : nextU.moveMeters,
                    hasAction: !turnStartRes.skipTurn && nextU.stunnedTurns <= 0,
                    hasBonusAction: !turnStartRes.skipTurn && nextU.stunnedTurns <= 0,
                    hasReaction: !turnStartRes.skipTurn,
                    stunnedTurns: turnStartRes.skipTurn ? Math.max(1, nextU.stunnedTurns) : Math.max(0, nextU.stunnedTurns - 1),
                    buffAtkMult: 1
                };
            }
            setUnits(working);
            roundLogs.forEach(l => pushCombatLog(l, 'info', nextRound));
            chargeBondGauges(5);
            setRoundNum(nextRound);
            setInitiativeOrder(nextOrder);
        }

        const nextId = nextOrder[nextIdx];
        setTurnIdx(nextIdx);
        setActiveUnitId(nextId);
        setActionMode('move');
        setSelectedSkill(null);
        const nextUnit = alive.find(u => u.id === nextId);
        if (nextUnit) {
            setBannerMsg(
                nextUnit.team === 'ally'
                    ? `🟢 [라운드 ${nextRound}] ${nextUnit.name}의 차례! (이동 ${nextUnit.remainingMeters.toFixed(1)}m · 주행동 · 보조행동)`
                    : `🔴 [라운드 ${nextRound}] 적군 ${nextUnit.name} 행동 개시...`
            );
        }
    }, [battleEnded, checkBattleOutcome, roundNum, turnIdx, initiativeOrder, arena.obstacles, addFloatText]);

    // Latest callback refs so AI effect is NEVER cancelled mid-turn by state updates!
    const aiCallbacksRef = useRef({
        animateMove,
        executeCombatAction,
        advanceTurn,
        addFloatText,
        spawnParticles,
        triggerShake,
        checkBattleOutcome,
        fastMode
    });
    aiCallbacksRef.current = {
        animateMove,
        executeCombatAction,
        advanceTurn,
        addFloatText,
        spawnParticles,
        triggerShake,
        checkBattleOutcome,
        fastMode
    };

    // Enemy AI & Auto-Battle AI turn runner (guaranteed to execute once per turn and always advance!)
    useEffect(() => {
        if (battleEnded) return;
        const curAtStart = unitsRef.current.find(u => u.id === activeUnitId && u.hp > 0);
        if (!curAtStart) return;
        const shouldRunAi = curAtStart.team === 'enemy' || (curAtStart.team === 'ally' && autoBattle);
        if (!shouldRunAi) return;

        const turnKey = `${roundNum}:${turnIdx}:${activeUnitId}:${autoBattle ? 'auto' : 'manual'}`;
        if (aiTurnLockRef.current === turnKey) return;
        aiTurnLockRef.current = turnKey;

        const runAi = async () => {
            setBusySafe(true);
            try {
                const cb = () => aiCallbacksRef.current;
                await waitMs(cb().fastMode ? 180 : 380);
                if (!mountedRef.current) return;

                const cur = unitsRef.current.find(u => u.id === activeUnitId);
                if (!cur || cur.hp <= 0 || cur.stunnedTurns > 0) {
                    if (cur && cur.stunnedTurns > 0) {
                        cb().addFloatText(cur.x, cur.y - 26, '⚡ 기절! 행동 불가', '#38bdf8', 1.1);
                    }
                    setBusySafe(false);
                    cb().advanceTurn();
                    return;
                }

                // Boss telegraph detonation at start of boss turn
                if (cur.isBoss && telegraphsRef.current.some(t => t.bossId === cur.id)) {
                    const myTele = telegraphsRef.current.filter(t => t.bossId === cur.id);
                    setTelegraphs(prev => prev.filter(t => t.bossId !== cur.id));
                    for (const tg of myTele) {
                        const hitAllies = unitsRef.current.filter(
                            u => u.team === 'ally' && u.hp > 0 && distPx(u.x, u.y, tg.x, tg.y) <= tg.radiusPx + u.radius
                        );
                        explosionsRef.current.push({
                            id: `tg_${Date.now()}`,
                            x: tg.x,
                            y: tg.y,
                            maxRadius: tg.radiusPx,
                            color: '#ef4444',
                            startTime: performance.now(),
                            duration: 520
                        });
                        cb().spawnParticles(tg.x, tg.y, '#ef4444', 36, 4.6);
                        cb().triggerShake(13, 350);
                        if (hitAllies.length > 0) {
                            let nextU = [...unitsRef.current];
                            hitAllies.forEach(a => {
                                const dmg = Math.max(120, Math.round(cur.atk * tg.damageMultiplier));
                                cb().addFloatText(a.x, a.y - 28, `☄️ -${formatCompactKorean(dmg)}`, '#f43f5e', 1.25);
                                nextU = nextU.map(u => (u.id === a.id ? { ...u, hp: Math.max(0, u.hp - dmg) } : u));
                            });
                            setUnits(nextU);
                            if (cb().checkBattleOutcome(nextU, roundNum)) {
                                setBusySafe(false);
                                return;
                            }
                        }
                    }
                }

                const targets = unitsRef.current.filter(u => u.team !== cur.team && u.hp > 0);
                if (targets.length === 0) {
                    setBusySafe(false);
                    cb().checkBattleOutcome(unitsRef.current, roundNum);
                    return;
                }

                // 아군 자동전투 AI: 사망 동료 부활 최우선 -> 빈사 아군 회복 우선!
                if (cur.team === 'ally') {
                    const deadAlly = unitsRef.current.find(u => u.team === 'ally' && !u.isSummon && u.hp <= 0);
                    const resSkill = deadAlly
                        ? cur.skills.find(s => isBg3ResurrectionSkill(s) && (s.mpCost || 0) <= cur.mp)
                        : undefined;
                    if (deadAlly && resSkill) {
                        await cb().executeCombatAction(cur, deadAlly.x, deadAlly.y, resSkill, deadAlly, true);
                        return;
                    }
                    const lowHpAlly = unitsRef.current
                        .filter(u => u.team === 'ally' && u.hp > 0 && u.hp / Math.max(1, u.maxHp) < 0.55)
                        .sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp))[0];
                    const healSkill = lowHpAlly
                        ? cur.skills.find(
                              s =>
                                  (s.mpCost || 0) <= cur.mp &&
                                  !isBg3ResurrectionSkill(s) &&
                                  (s.type === SkillType.HEAL ||
                                      (Array.isArray(s.buffEffects) && s.buffEffects.some(ef => ef.type === 'HP_RECOV')))
                          )
                        : undefined;
                    if (lowHpAlly && healSkill) {
                        await cb().executeCombatAction(cur, lowHpAlly.x, lowHpAlly.y, healSkill, lowHpAlly, true);
                        return;
                    }
                }

                // Pick closest opponent
                targets.sort((a, b) => distPx(cur.x, cur.y, a.x, a.y) - distPx(cur.x, cur.y, b.x, b.y));
                const target = targets[0];

                // Pick best usable offensive skill
                const usableSkills = cur.skills.filter(
                    s => s.type !== SkillType.HEAL && s.type !== SkillType.BUFF && (s.mpCost || 0) <= cur.mp
                );
                const chosenSkill =
                    usableSkills.length > 0 && Math.random() < 0.72
                        ? usableSkills[Math.floor(Math.random() * usableSkills.length)]
                        : null;
                const targeting = getBg3SkillTargeting(cur, chosenSkill);

                // Move closer if out of range (with obstacle-avoidance angle fan!)
                const distM = pxToMeters(distPx(cur.x, cur.y, target.x, target.y));
                if (distM > targeting.rangeMeters - 0.3 && cur.remainingMeters > 0.5) {
                    const neededM = Math.min(cur.remainingMeters, Math.max(0.8, distM - (targeting.rangeMeters - 0.6)));
                    const baseAng = Math.atan2(target.y - cur.y, target.x - cur.x);
                    const angleOffsets = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35];
                    const distScales = [1.0, 0.75, 0.5];
                    let chosenDest: { x: number; y: number } | null = null;
                    for (const sc of distScales) {
                        for (const ao of angleOffsets) {
                            const tx = Math.max(48, Math.min(arenaW - 48, cur.x + Math.cos(baseAng + ao) * metersToPx(neededM * sc)));
                            const ty = Math.max(48, Math.min(arenaH - 48, cur.y + Math.sin(baseAng + ao) * metersToPx(neededM * sc)));
                            if (isPointWalkable(tx, ty, cur.id, arena.obstacles, unitsRef.current, arenaW, arenaH)) {
                                chosenDest = { x: tx, y: ty };
                                break;
                            }
                        }
                        if (chosenDest) break;
                    }
                    if (chosenDest) {
                        await cb().animateMove(cur.id, chosenDest.x, chosenDest.y, false);
                    }
                }
                if (!mountedRef.current) return;

                const refreshedCur = unitsRef.current.find(u => u.id === cur.id);
                const refreshedTarget = unitsRef.current.find(u => u.id === target.id);
                if (refreshedCur && refreshedCur.hp > 0 && refreshedTarget && refreshedTarget.hp > 0) {
                    const newDistM = pxToMeters(distPx(refreshedCur.x, refreshedCur.y, refreshedTarget.x, refreshedTarget.y));
                    if (newDistM <= targeting.rangeMeters + 0.9) {
                        await cb().executeCombatAction(
                            refreshedCur,
                            refreshedTarget.x,
                            refreshedTarget.y,
                            chosenSkill,
                            refreshedTarget,
                            true
                        );
                    } else {
                        setBannerMsg(`🏃 ${refreshedCur.name}이(가) 전선을 향해 진격했습니다!`);
                    }
                    // Boss telegraphs an AoE for next round!
                    if (refreshedCur.isBoss && Math.random() < 0.65) {
                        setTelegraphs(prev => [
                            ...prev.filter(t => t.bossId !== refreshedCur.id),
                            {
                                bossId: refreshedCur.id,
                                bossName: refreshedCur.name,
                                skillName: refreshedCur.isMythicBoss ? '신격 파멸의 천벌' : '파멸의 신격 강타',
                                x: refreshedTarget.x,
                                y: refreshedTarget.y,
                                radiusPx: metersToPx(refreshedCur.isMythicBoss ? 8.5 : 5.5),
                                damageMultiplier: refreshedCur.isMythicBoss ? 1.65 : 1.45
                            }
                        ]);
                        setBannerMsg(`⚠️ ${refreshedCur.name}이(가) [파멸의 신격 강타]를 예고했습니다! 붉은 원 밖으로 피하세요!`);
                    }
                }
            } finally {
                if (mountedRef.current) {
                    setBusySafe(false);
                    await waitMs(aiCallbacksRef.current.fastMode ? 160 : 320);
                    if (mountedRef.current) {
                        aiCallbacksRef.current.advanceTurn();
                    }
                }
            }
        };

        runAi();
    }, [activeUnitId, turnIdx, roundNum, autoBattle, battleEnded, arena.obstacles, setBusySafe]);

    // Canvas Click / Touch-Release World Point Handler (Move / Attack / Skill / Shove / Jump / Item)
    const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pt = screenToWorld(e.clientX, e.clientY);
        if (!pt) return;
        await handleCanvasWorldClick(pt);
    };

    const handleCanvasWorldClick = async (pt: { x: number; y: number }) => {
        if (!isPlayerTurn || isBusy || !activeUnit || battleEnded) return;

        // Clicking another ally in the shared initiative group switches active unit!
        // 부활 스킬 선택 중에는 전투불능(hp <= 0) 동료 무덤도 클릭 타겟으로 허용!
        const isResSkillSelected = actionMode === 'skill' && isBg3ResurrectionSkill(selectedSkill);
        const clickedDeadAlly = isResSkillSelected
            ? units.find(u => u.team === 'ally' && u.hp <= 0 && distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 18)
            : undefined;
        const clickedAlly = units.find(
            u => u.team === 'ally' && u.hp > 0 && u.id !== activeUnit.id && distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 12
        );
        const clickedSelf =
            actionMode === 'skill' && distPx(pt.x, pt.y, activeUnit.x, activeUnit.y) <= activeUnit.radius + 12
                ? activeUnit
                : undefined;
        if (clickedAlly && actionMode === 'move' && sharedAllyGroup.includes(clickedAlly.id)) {
            setActiveUnitId(clickedAlly.id);
            setBannerMsg(`🔄 공유 이니셔티브 전환: ${clickedAlly.name} 선택!`);
            return;
        }

        const clickedEnemy = units.find(u => u.team === 'enemy' && u.hp > 0 && distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 14);

        // Shove mode
        if (actionMode === 'shove') {
            if (!clickedEnemy) {
                setBannerMsg('밀쳐낼 인접 적군을 클릭하세요.');
                return;
            }
            await executeShove(activeUnit, clickedEnemy);
            return;
        }

        // Item Targeting Mode (고정 타겟 범위 내 아군/적군/부활 무덤 선택 사용!)
        if (actionMode === 'item' && pendingItemUse) {
            const { item, quantity, rangeMeters, isEnemyTarget, isRevive } = pendingItemUse;
            const clickedItemTarget = isEnemyTarget
                ? units.find(u => u.team === 'enemy' && u.hp > 0 && distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 18)
                : units.find(
                      u =>
                          u.team === 'ally' &&
                          (isRevive ? u.hp <= 0 : u.hp > 0) &&
                          distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 18
                  );
            if (!clickedItemTarget) {
                setBannerMsg(
                    isEnemyTarget
                        ? `🎯 [${item.name}] 대상을 클릭하세요! (사거리 ${rangeMeters}m 내 적군)`
                        : isRevive
                            ? `🎯 [${item.name}] 부활시킬 동료의 무덤을 클릭하세요! (사거리 ${rangeMeters}m)`
                            : `🎯 [${item.name}] 사용할 아군(또는 자신)을 클릭하세요! (사거리 ${rangeMeters}m)`
                );
                return;
            }
            const dM = pxToMeters(distPx(activeUnit.x, activeUnit.y, clickedItemTarget.x, clickedItemTarget.y));
            if (dM > rangeMeters + 0.5) {
                setBannerMsg(`아이템 사용 사거리 밖입니다! (최대 ${rangeMeters}m, 현재 ${dM.toFixed(1)}m)`);
                return;
            }
            handleUseInventoryItem(item, quantity, clickedItemTarget.name);
            setPendingItemUse(null);
            setActionMode('move');
            return;
        }

        // Jump mode (6.5m Bonus Action, ignores Opportunity Attacks!)
        if (actionMode === 'jump') {
            if (!activeUnit.hasBonusAction) {
                setBannerMsg('보조행동을 이미 사용했습니다.');
                return;
            }
            const jumpM = pxToMeters(distPx(activeUnit.x, activeUnit.y, pt.x, pt.y));
            if (jumpM > 6.5) {
                setBannerMsg('도약 최대 거리는 6.5m입니다!');
                return;
            }
            if (!isPointWalkable(pt.x, pt.y, activeUnit.id, arena.obstacles, units, arenaW, arenaH)) {
                setBannerMsg('착지할 수 없는 위치입니다.');
                return;
            }
            setIsBusy(true);
            await animateMove(activeUnit.id, pt.x, pt.y, true);
            setBannerMsg(`🦘 ${activeUnit.name} 도약 착지! (기회 공격 회피)`);
            setActionMode('move');
            setIsBusy(false);
            return;
        }

        // Skill or Attack mode (or direct click on enemy in move mode!)
        if (actionMode === 'attack' || actionMode === 'skill' || (actionMode === 'move' && clickedEnemy && activeUnit.hasAction)) {
            if (!activeUnit.hasAction) {
                setBannerMsg('이번 턴 주행동을 이미 사용했습니다! 이동하거나 보조행동을 사용하세요.');
                return;
            }
            const useSkill = actionMode === 'skill' ? selectedSkill : null;
            const explicitTgt = clickedDeadAlly || clickedEnemy || clickedAlly || clickedSelf;
            await executeCombatAction(activeUnit, pt.x, pt.y, useSkill, explicitTgt);
            return;
        }

        // Gridless Free Movement (Split movement!)
        const moveM = pxToMeters(distPx(activeUnit.x, activeUnit.y, pt.x, pt.y));
        if (moveM < 0.35) return;
        if (moveM > activeUnit.remainingMeters + 0.15) {
            setBannerMsg(`이동 거리가 부족합니다! (요청 ${moveM.toFixed(1)}m / 잔여 ${activeUnit.remainingMeters.toFixed(1)}m)`);
            return;
        }
        if (!isPointWalkable(pt.x, pt.y, activeUnit.id, arena.obstacles, units, arenaW, arenaH)) {
            setBannerMsg('장애물이나 다른 유닛이 있어 이동할 수 없습니다.');
            return;
        }

        setIsBusy(true);
        // Check Opportunity Attacks before leaving melee threat circles!
        const oppAttackers = findOpportunityAttackers(activeUnit, pt.x, pt.y, units);
        if (oppAttackers.length > 0) {
            let nextUnits = [...unitsRef.current];
            for (const opp of oppAttackers) {
                const dmg = Math.max(50, Math.round(opp.atk * 0.85));
                addFloatText(activeUnit.x, activeUnit.y - 34, `⚠️ 기회 공격! -${formatCompactKorean(dmg)}`, '#f43f5e', 1.2);
                slashArcsRef.current.push({
                    id: `opp_${Date.now()}_${opp.id}`,
                    x: activeUnit.x,
                    y: activeUnit.y,
                    angle: Math.atan2(activeUnit.y - opp.y, activeUnit.x - opp.x),
                    color: '#f43f5e',
                    startTime: performance.now(),
                    duration: 300,
                    scale: 1.15
                });
                triggerShake(8, 220);
                nextUnits = nextUnits.map(u => {
                    if (u.id === opp.id) return { ...u, hasReaction: false };
                    if (u.id === activeUnit.id) return { ...u, hp: Math.max(0, u.hp - dmg) };
                    return u;
                });
            }
            setUnits(nextUnits);
            if ((nextUnits.find(u => u.id === activeUnit.id)?.hp || 0) <= 0) {
                setIsBusy(false);
                checkBattleOutcome(nextUnits, roundNum);
                return;
            }
        }

        await animateMove(activeUnit.id, pt.x, pt.y, false);
        setIsBusy(false);
    };

    // 방어 태세 (1턴간 받는 피해 45% 감소 + 소량 보호막 + 신력 실드 +2 복구)
    const handleDefendStance = () => {
        if (!activeUnit || !activeUnit.hasAction || isBusy) return;
        const shAdd = Math.max(80, Math.round(activeUnit.maxHp * 0.1));
        let brkRecovered = 0;
        if (activeUnit.sourceEntity) {
            brkRecovered = recoverAllyBreakGauge(
                activeUnit.sourceEntity as any,
                2,
                getAllyMaxBreakGauge(character, activeUnit.sourceEntity as any)
            );
        }
        addFloatText(
            activeUnit.x,
            activeUnit.y - 26,
            `🛡️ 방어 태세 (-45% · 쉴드 +${formatCompactKorean(shAdd)}${brkRecovered > 0 ? ` · 브레이크+${brkRecovered}` : ''})`,
            '#38bdf8',
            1.1
        );
        spawnParticles(activeUnit.x, activeUnit.y, '#38bdf8', 18, 2.8);
        setUnits(prev =>
            prev.map(u =>
                u.id === activeUnit.id
                    ? {
                          ...u,
                          hasAction: false,
                          isDefending: true,
                          shieldHp: (u.shieldHp || 0) + shAdd,
                          maxShieldHp: Math.max(u.maxShieldHp || 0, (u.shieldHp || 0) + shAdd),
                          breakGauge: (activeUnit.sourceEntity as any)?.breakGauge ?? u.breakGauge
                      }
                    : u
            )
        );
        const msg = `🛡️ ${activeUnit.name} 방어 태세 돌입! (피해 -45%, 보호막 +${formatCompactKorean(shAdd)}${brkRecovered > 0 ? `, 신력 실드 +${brkRecovered} 복구` : ''})`;
        setBannerMsg(msg);
        pushCombatLog(msg, 'info', roundNum);
    };

    // 실제 인벤토리 소모품 사용 (ItemSelectionModal + 정규 applyConsumableEffect 100% 연동 — 회복·버프·해독·부활·몬스터 포획 지원)
    const handleUseInventoryItem = (item: any, quantity: number = 1, targetName?: string) => {
        if (!activeUnit || isBusy || !item) return;
        const targetAlly =
            (targetName ? unitsRef.current.find(u => u.team === 'ally' && u.name === targetName) : null) || activeUnit;
        const targetEnemy =
            (targetName ? unitsRef.current.find(u => u.team === 'enemy' && u.hp > 0 && u.name === targetName) : null) ||
            unitsRef.current.find(u => u.team === 'enemy' && u.hp > 0);

        const txt = `${item.name || ''} ${item.description || ''} ${item.effect || ''}`.toLowerCase();
        const isRevive = /부활|소생|불사/.test(txt);

        let capturedMonsterObj: any;
        let capturedEnemyId: string | undefined;
        let revivedAllyId: string | undefined;
        const itemLogs: string[] = [];

        // React 19 비동기 업데이터 유실 방지: unitsRef.current에서 동기 계산 후 setUnits 전달!
        const nextUnitsAfterItem = unitsRef.current.map(u => {
            let next = { ...u };
            if (u.id === activeUnit.id) {
                next = { ...next, hasBonusAction: false };
            }
            if (u.id === targetAlly.id) {
                if (isRevive && next.hp <= 0) {
                    const revHp = Math.max(100, Math.round(next.maxHp * 0.5));
                    next.hp = revHp;
                    if (next.sourceEntity) {
                        (next.sourceEntity as any).isDead = false;
                        if ((next.sourceEntity as any).stats) (next.sourceEntity as any).stats.hp = revHp;
                    }
                    next = syncUnitFromSourceEntity(next);
                    revivedAllyId = next.id;
                    addFloatText(next.x, next.y - 28, `✨ 부활! +${formatCompactKorean(revHp)} HP`, '#fde047', 1.2);
                    itemLogs.push(`✨ [${item.name}] 사용! ${next.name}이(가) 부활했습니다!`);
                } else {
                    for (let q = 0; q < Math.max(1, quantity); q++) {
                        const res = applyBg3ConsumableItem(next, item, targetEnemy);
                        next = res.user;
                        itemLogs.push(...res.logs);
                        if (res.hpGain > 0) addFloatText(next.x, next.y - 28, `🧪 +${formatCompactKorean(res.hpGain)} HP`, '#4ade80', 1.15);
                        if (res.mpGain > 0) addFloatText(next.x, next.y - 42, `💧 +${formatCompactKorean(res.mpGain)} MP`, '#38bdf8', 1.1);
                        if (res.isCaptured && res.capturedMonster && targetEnemy) {
                            capturedMonsterObj = res.capturedMonster;
                            capturedEnemyId = targetEnemy.id;
                            addFloatText(targetEnemy.x, targetEnemy.y - 32, `🕸️ 포획 성공!`, '#fde047', 1.3);
                            break;
                        }
                    }
                }
            }
            return next;
        }).map(u => (capturedEnemyId && u.id === capturedEnemyId ? { ...u, hp: 0 } : u));

        setUnits(nextUnitsAfterItem);

        if (revivedAllyId) {
            setInitiativeOrder(prev => (prev.includes(revivedAllyId!) ? prev : [...prev, revivedAllyId!]));
        }

        // 실제 인벤토리 수량 차감 (+ 몬스터 포획 시 character.base.capturedMonsters에 정규 등록!)
        if (onUpdateCharacter) {
            let rem = quantity;
            const nextInv = (character.inventory || [])
                .map(inv => {
                    if (rem <= 0 || !inv || inv.name !== item.name) return inv;
                    const q = inv.quantity || 1;
                    if (q <= rem) {
                        rem -= q;
                        return null;
                    }
                    const left = q - rem;
                    rem = 0;
                    return { ...inv, quantity: left };
                })
                .filter(Boolean) as any[];
            const nextBase = capturedMonsterObj
                ? {
                      ...(character.base || {}),
                      capturedMonsters: [...((character.base as any)?.capturedMonsters || []), capturedMonsterObj]
                  }
                : character.base;
            const latestPlayerUnit = nextUnitsAfterItem.find(u => u.isPlayer);
            const syncedPlayerStatuses = Array.isArray((latestPlayerUnit?.sourceEntity as any)?.statusEffects)
                ? [...(latestPlayerUnit?.sourceEntity as any).statusEffects]
                : character.statusEffects;
            onUpdateCharacter({ ...character, inventory: nextInv, base: nextBase as any, statusEffects: syncedPlayerStatuses });
        }

        const msg = itemLogs[0] || `🎒 ${activeUnit.name}이(가) [${item.name}] x${quantity} 사용! (${targetAlly.name})`;
        setBannerMsg(msg);
        if (itemLogs.length > 0) itemLogs.forEach(l => pushCombatLog(l, 'heal', roundNum));
        else pushCombatLog(msg, 'heal', roundNum);
        setShowItemModal(false);

        if (capturedEnemyId) {
            checkBattleOutcome(nextUnitsAfterItem, roundNum);
        }
    };

    // Quick Bonus Action: Potion / Rally
    const handleBonusPotion = () => {
        if (!activeUnit || !activeUnit.hasBonusAction || isBusy) return;
        const healAmt = Math.max(150, Math.round(activeUnit.maxHp * 0.25));
        addFloatText(activeUnit.x, activeUnit.y - 26, `🧪 +${formatCompactKorean(healAmt)} HP · 공+15%`, '#4ade80', 1.15);
        spawnParticles(activeUnit.x, activeUnit.y, '#4ade80', 20, 3.0);
        setUnits(prev =>
            prev.map(u =>
                u.id === activeUnit.id
                    ? {
                          ...u,
                          hp: Math.min(u.maxHp, u.hp + healAmt),
                          hasBonusAction: false,
                          buffAtkMult: Math.min(2.0, +(u.buffAtkMult * 1.15).toFixed(2)),
                          activeBuffs: [...u.activeBuffs, { name: '전투 고양', atkMult: 1.15, turns: 2, color: '#4ade80' }]
                      }
                    : u
            )
        );
        setBannerMsg(`🧪 ${activeUnit.name} 보조행동 [전투 물약 & 고양] 사용!`);
    };

    // Dash Action (+100% movement meters)
    const handleDash = () => {
        if (!activeUnit || !activeUnit.hasAction || isBusy) return;
        addFloatText(activeUnit.x, activeUnit.y - 26, `💨 질주 (+${activeUnit.moveMeters.toFixed(1)}m)`, '#38bdf8', 1.1);
        spawnParticles(activeUnit.x, activeUnit.y, '#38bdf8', 16, 3.2);
        setUnits(prev =>
            prev.map(u =>
                u.id === activeUnit.id
                    ? { ...u, hasAction: false, remainingMeters: +(u.remainingMeters + u.moveMeters).toFixed(1) }
                    : u
            )
        );
        setBannerMsg(`💨 ${activeUnit.name} 질주! 이동 거리가 2배로 증가했습니다.`);
    };

    // Main 60fps Canvas Renderer (ZERO square gridlines!)
    useEffect(() => {
        let rafId = 0;

        const render = (now: number) => {
            const canvas = canvasRef.current;
            if (!canvas) {
                rafId = requestAnimationFrame(render);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            const targetW = Math.floor(viewportSize.w * dpr);
            const targetH = Math.floor(viewportSize.h * dpr);
            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }

            ctx.save();
            ctx.scale(dpr, dpr);

            // Screen shake
            let shakeX = 0;
            let shakeY = 0;
            if (now < shakeRef.current.until) {
                const s = shakeRef.current.intensity * ((shakeRef.current.until - now) / 300);
                shakeX = (Math.random() - 0.5) * s * 2;
                shakeY = (Math.random() - 0.5) * s * 2;
            }

            // Fill dark slate backdrop
            ctx.fillStyle = '#070b14';
            ctx.fillRect(0, 0, viewportSize.w, viewportSize.h);

            // Background city illustration (subtle atmospheric bleed)
            if (bgImgRef.current) {
                ctx.save();
                ctx.globalAlpha = 0.34;
                const img = bgImgRef.current;
                const coverScale = Math.max(viewportSize.w / img.width, viewportSize.h / img.height);
                const dw = img.width * coverScale;
                const dh = img.height * coverScale;
                ctx.drawImage(img, (viewportSize.w - dw) / 2, (viewportSize.h - dh) / 2, dw, dh);
                ctx.restore();
            }

            // Smooth camera lerp toward target
            cameraRef.current.x += (cameraTargetRef.current.x - cameraRef.current.x) * 0.12;
            cameraRef.current.y += (cameraTargetRef.current.y - cameraRef.current.y) * 0.12;

            const { scale, offsetX, offsetY } = getTransform();
            ctx.translate(offsetX + shakeX, offsetY + shakeY);
            ctx.scale(scale, scale);

            // Arena organic ground plate (seamless grass texture, NO gridlines!)
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, arenaW, arenaH, 24);
            ctx.clip();

            const groundImg = getCachedCityAssetImage(getTerrainTileUrl(arena.cultureKey, 'ground'));
            if (groundImg) {
                ctx.globalAlpha = 0.56;
                const tileSz = 112;
                for (let gx = 0; gx < arenaW; gx += tileSz) {
                    for (let gy = 0; gy < arenaH; gy += tileSz) {
                        ctx.drawImage(groundImg, gx, gy, tileSz, tileSz);
                    }
                }
                ctx.globalAlpha = 1;
            } else {
                const grad = ctx.createRadialGradient(arenaW / 2, arenaH / 2, 120, arenaW / 2, arenaH / 2, arenaW * 0.72);
                grad.addColorStop(0, 'rgba(30, 58, 42, 0.72)');
                grad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, arenaW, arenaH);
            }

            // Soft edge vignette inside arena
            const vig = ctx.createRadialGradient(arenaW / 2, arenaH / 2, arenaH * 0.36, arenaW / 2, arenaH / 2, arenaW * 0.65);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(2, 6, 23, 0.52)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, arenaW, arenaH);

            // 0. 일반 사냥 전용 '도망 구역 (Escape Zone)' 렌더링 (전장 하단 후방)
            if (canFlee) {
                const escTop = arenaH - 132;
                const pulse = 0.16 + Math.abs(Math.sin(now * 0.004)) * 0.12;
                ctx.save();
                ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`;
                ctx.fillRect(24, escTop, arenaW - 48, 110);
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([10, 6]);
                ctx.strokeRect(24, escTop, arenaW - 48, 110);
                ctx.setLineDash([]);
                const portalImg = getEscapePortalImage();
                if (portalImg && portalImg.complete && portalImg.naturalWidth > 0) {
                    const pw = 112;
                    const ph = 76;
                    ctx.globalAlpha = 0.88;
                    ctx.drawImage(portalImg, arenaW * 0.5 - pw / 2, escTop + 26, pw, ph);
                    ctx.globalAlpha = 1;
                }
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#a7f3d0';
                ctx.fillText('🏃 도망 구역 (이 영역 안으로 이동하면 하단 [도망] 버튼 활성화)', arenaW * 0.5, escTop + 22);
                ctx.restore();
            }

            // 1. Organic Elemental Surface Pools (+ 의미 안내 라벨 필 표기!)
            const SURFACE_LABEL_MAP: Record<string, { label: string; textColor: string }> = {
                fire: { label: '🔥 화염 지면 (매턴 -6%)', textColor: '#fed7aa' },
                water: { label: '💧 물 웅덩이 (전격 콤보)', textColor: '#bae6fd' },
                ice: { label: '❄️ 빙결 지면 (파쇄 콤보)', textColor: '#cffafe' },
                poison: { label: '☠️ 독 웅덩이 (화염 콤보)', textColor: '#bbf7d0' },
                holy: { label: '✨ 성역 지면 (치유)', textColor: '#fef08a' },
                electrified: { label: '⚡ 감전 지면', textColor: '#e0f2fe' }
            };
            surfacesRef.current.forEach(pool => {
                const st = SURFACE_COLORS[pool.type] || SURFACE_COLORS.water;
                const pulse = 1 + Math.sin(now * 0.004 + pool.x) * 0.04;
                const r = pool.radius * pulse;
                const surfImg = getCachedCityAssetImage(getPropAssetUrl('srpg', `surface_${pool.type}`));
                if (surfImg) {
                    ctx.save();
                    ctx.globalAlpha = 0.86;
                    const dw = r * 2.15;
                    const dh = r * 1.85;
                    ctx.drawImage(surfImg, pool.x - dw / 2, pool.y - dh / 2, dw, dh);
                    ctx.restore();
                } else {
                    const rg = ctx.createRadialGradient(pool.x, pool.y, r * 0.15, pool.x, pool.y, r);
                    rg.addColorStop(0, st.edge);
                    rg.addColorStop(0.65, st.fill);
                    rg.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = rg;
                    ctx.beginPath();
                    ctx.ellipse(pool.x, pool.y, r * 1.12, r * 0.88, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                const sInfo = SURFACE_LABEL_MAP[pool.type];
                if (sInfo) {
                    ctx.save();
                    ctx.font = 'bold 9.5px sans-serif';
                    const tw = ctx.measureText(sInfo.label).width + 10;
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
                    ctx.beginPath();
                    ctx.roundRect(pool.x - tw / 2, pool.y - 8, tw, 16, 5);
                    ctx.fill();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = sInfo.textColor;
                    ctx.fillText(sInfo.label, pool.x, pool.y + 3);
                    ctx.restore();
                }
            });

            // 2. Boss Telegraph Danger Circles
            telegraphsRef.current.forEach(tg => {
                const pulse = 0.22 + Math.abs(Math.sin(now * 0.007)) * 0.24;
                ctx.save();
                ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                ctx.strokeStyle = 'rgba(254, 202, 202, 0.92)';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.arc(tg.x, tg.y, tg.radiusPx, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#fef2f2';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ ${tg.skillName}`, tg.x, tg.y + 4);
                ctx.restore();
            });

            // 3. Active Unit Move Range Circle & Enemy Melee Threat Circles
            const curActive = unitsRef.current.find(u => u.id === activeUnitId && u.hp > 0);
            if (curActive && curActive.team === 'ally' && !battleEnded) {
                // Remaining movement circle (선명한 시안 실선 + 상단 이동거리 라벨 필!)
                if (actionMode === 'move' && curActive.remainingMeters > 0.2) {
                    const mrPx = metersToPx(curActive.remainingMeters);
                    ctx.save();
                    ctx.strokeStyle = '#22d3ee';
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
                    ctx.lineWidth = 2.8;
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, mrPx, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 이동 가능 거리 필 라벨 (원 상단)
                    const moveLabel = `👣 이동 가능 ${curActive.remainingMeters.toFixed(1)}m / ${curActive.moveMeters.toFixed(1)}m`;
                    ctx.font = 'bold 11.5px sans-serif';
                    const mTw = ctx.measureText(moveLabel).width + 14;
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(curActive.x - mTw / 2, curActive.y - mrPx - 23, mTw, 19, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#22d3ee';
                    ctx.lineWidth = 1.3;
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#a5f3fc';
                    ctx.fillText(moveLabel, curActive.x, curActive.y - mrPx - 9.5);
                    ctx.restore();
                }

                // Jump range circle
                if (actionMode === 'jump') {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(251, 146, 60, 0.72)';
                    ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([6, 5]);
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, metersToPx(6.5), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }

                // Item Targeting Range Circle (고정 사거리 내 대상 선택!)
                if (actionMode === 'item' && pendingItemUse) {
                    const itemRPx = metersToPx(pendingItemUse.rangeMeters);
                    const ringColor = pendingItemUse.isEnemyTarget ? '#f43f5e' : '#34d399';
                    ctx.save();
                    ctx.fillStyle = pendingItemUse.isEnemyTarget ? 'rgba(244, 63, 94, 0.08)' : 'rgba(52, 211, 153, 0.08)';
                    ctx.strokeStyle = ringColor;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, itemRPx, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = ringColor;
                    ctx.fillText(`🎒 ${pendingItemUse.item.name} 사거리 ${pendingItemUse.rangeMeters}m`, curActive.x, curActive.y - itemRPx - 8);
                    ctx.restore();
                }

                // Skill / Attack TargetRadius (시전 사거리 원 — 점선 대신 선명한 시안 실선 + 사거리 라벨!)
                if (currentTargeting) {
                    const trPx = metersToPx(currentTargeting.rangeMeters);
                    ctx.save();
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2.6;
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, trPx, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 사거리 필 라벨 (원 상단)
                    const rangeLabel = `시전 사거리 ${currentTargeting.rangeMeters.toFixed(1)}m`;
                    ctx.font = 'bold 11px sans-serif';
                    const rTw = ctx.measureText(rangeLabel).width + 14;
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
                    ctx.beginPath();
                    ctx.roundRect(curActive.x - rTw / 2, curActive.y - trPx - 22, rTw, 18, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#bae6fd';
                    ctx.fillText(rangeLabel, curActive.x, curActive.y - trPx - 9);
                    ctx.restore();
                }

                // Enemy melee threat circles (red dashed)
                unitsRef.current.forEach(e => {
                    if (e.team === 'enemy' && e.hp > 0 && e.hasReaction) {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(244, 63, 94, 0.34)';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.arc(e.x, e.y, metersToPx(e.meleeThreatMeters), 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }

            // 4. Organic SRPG Obstacles & Tactical Zones
            arena.obstacles.forEach(obs => {
                // Soft aura ring for tactical zones (fort/altar/forest/camp)
                if (obs.defBonus || obs.evaBonus || obs.healPct) {
                    ctx.save();
                    ctx.strokeStyle = obs.healPct ? 'rgba(74, 222, 128, 0.35)' : obs.defBonus ? 'rgba(250, 204, 21, 0.35)' : 'rgba(134, 239, 172, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.radius + 14, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Ground shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.beginPath();
                ctx.ellipse(obs.x, obs.y + obs.radius * 0.55, obs.radius * 0.95, obs.radius * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();

                const img = getCachedCityAssetImage(getPropAssetUrl('srpg', obs.part));
                if (img) {
                    const drawSz = obs.radius * 2.15;
                    ctx.drawImage(img, obs.x - drawSz / 2, obs.y - drawSz / 2 - 4, drawSz, drawSz);
                }

                // 전술 오브젝트 효과 안내 라벨 (숲 회피+, 성채 방어+, 제단 회복+ 등)
                const obsTip = obs.healPct
                    ? `✨ ${obs.label} (매턴 +${obs.healPct}%)`
                    : obs.defBonus
                        ? `🛡️ ${obs.label} (방어 +${obs.defBonus})`
                        : obs.evaBonus
                            ? `🌿 ${obs.label} (회피 +${obs.evaBonus}%)`
                            : obs.label || '';
                if (obsTip) {
                    ctx.save();
                    ctx.font = 'bold 9px sans-serif';
                    const otw = ctx.measureText(obsTip).width + 10;
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
                    ctx.beginPath();
                    ctx.roundRect(obs.x - otw / 2, obs.y + obs.radius * 0.68, otw, 15, 4);
                    ctx.fill();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = obs.healPct ? '#86efac' : obs.defBonus ? '#fde68a' : obs.evaBonus ? '#a7f3d0' : '#cbd5e1';
                    ctx.fillText(obsTip, obs.x, obs.y + obs.radius * 0.68 + 10.5);
                    ctx.restore();
                }
            });

            // 5. BG3 Hover Path / AoE Reticle / Cone Template / Jump Arc
            const hover = hoverWorldRef.current;
            if (hover && curActive && curActive.team === 'ally' && !isBusy && !battleEnded) {
                if (actionMode === 'move') {
                    const dPx = distPx(curActive.x, curActive.y, hover.x, hover.y);
                    const dM = pxToMeters(dPx);
                    const walkable = isPointWalkable(hover.x, hover.y, curActive.id, arena.obstacles, unitsRef.current, arenaW, arenaH);
                    const ok = dM <= curActive.remainingMeters + 0.1 && walkable;
                    const oppCount = ok ? findOpportunityAttackers(curActive, hover.x, hover.y, unitsRef.current).length : 0;

                    ctx.save();
                    ctx.strokeStyle = oppCount > 0 ? '#f43f5e' : ok ? '#38bdf8' : '#ef4444';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([8, 6]);
                    ctx.beginPath();
                    ctx.moveTo(curActive.x, curActive.y);
                    ctx.lineTo(hover.x, hover.y);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.beginPath();
                    ctx.arc(hover.x, hover.y, 14, 0, Math.PI * 2);
                    ctx.fillStyle = ok ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.25)';
                    ctx.fill();
                    ctx.stroke();

                    // Distance Pill
                    const pillText = oppCount > 0 ? `${dM.toFixed(1)}m · ⚠️ 기회공격!` : `${dM.toFixed(1)}m / ${curActive.remainingMeters.toFixed(1)}m`;
                    ctx.font = 'bold 12px sans-serif';
                    const tw = ctx.measureText(pillText).width + 16;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(hover.x - tw / 2, hover.y - 38, tw, 22, 8);
                    ctx.fill();
                    ctx.strokeStyle = oppCount > 0 ? '#f43f5e' : ok ? '#38bdf8' : '#ef4444';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = oppCount > 0 ? '#fda4af' : ok ? '#e0f2fe' : '#fecaca';
                    ctx.textAlign = 'center';
                    ctx.fillText(pillText, hover.x, hover.y - 23);
                    ctx.restore();
                } else if (actionMode === 'jump') {
                    const dM = pxToMeters(distPx(curActive.x, curActive.y, hover.x, hover.y));
                    const ok = dM <= 6.5 && isPointWalkable(hover.x, hover.y, curActive.id, arena.obstacles, unitsRef.current, arenaW, arenaH);
                    ctx.save();
                    ctx.strokeStyle = ok ? '#fb923c' : '#ef4444';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(curActive.x, curActive.y);
                    ctx.quadraticCurveTo((curActive.x + hover.x) / 2, Math.min(curActive.y, hover.y) - 90, hover.x, hover.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(hover.x, hover.y, 16, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                } else if (currentTargeting) {
                    if (currentTargeting.isTeleport) {
                        const dM = pxToMeters(distPx(curActive.x, curActive.y, hover.x, hover.y));
                        const walkable = isPointWalkable(hover.x, hover.y, curActive.id, arena.obstacles, unitsRef.current, arenaW, arenaH);
                        const inRange = dM <= currentTargeting.rangeMeters + 0.35;
                        const ok = inRange && walkable;
                        ctx.save();
                        ctx.strokeStyle = ok ? '#c084fc' : '#ef4444';
                        ctx.lineWidth = 2.5;
                        ctx.setLineDash([6, 5]);
                        ctx.beginPath();
                        ctx.moveTo(curActive.x, curActive.y);
                        ctx.lineTo(hover.x, hover.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.fillStyle = ok ? 'rgba(192, 132, 252, 0.28)' : 'rgba(239, 68, 68, 0.25)';
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, 18, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        const pill = !inRange
                            ? `사거리 초과 (${dM.toFixed(1)}m / ${currentTargeting.rangeMeters.toFixed(1)}m)`
                            : !walkable
                                ? '이동 불가 위치'
                                : `⚡ 순간이동 ${dM.toFixed(1)}m / ${currentTargeting.rangeMeters.toFixed(1)}m`;
                        ctx.font = 'bold 11px sans-serif';
                        const tw = ctx.measureText(pill).width + 14;
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(hover.x - tw / 2, hover.y - 36, tw, 18, 6);
                        ctx.fill();
                        ctx.strokeStyle = ok ? '#c084fc' : '#ef4444';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.textAlign = 'center';
                        ctx.fillStyle = ok ? '#e9d5ff' : '#fecaca';
                        ctx.fillText(pill, hover.x, hover.y - 23);
                        ctx.restore();
                    } else if (currentTargeting.shape === 'circle') {
                        const rPx = metersToPx(currentTargeting.aoeRadiusMeters);
                        const dM = pxToMeters(distPx(curActive.x, curActive.y, hover.x, hover.y));
                        const inRange = dM <= currentTargeting.rangeMeters + 0.4;
                        const areaColor = !inRange ? '#ef4444' : currentTargeting.isSupport ? '#34d399' : '#fb923c';
                        ctx.save();
                        // 시전자 -> 타겟 중심 조준선
                        ctx.strokeStyle = inRange ? 'rgba(56, 189, 248, 0.55)' : 'rgba(239, 68, 68, 0.65)';
                        ctx.lineWidth = 1.6;
                        ctx.beginPath();
                        ctx.moveTo(curActive.x, curActive.y);
                        ctx.lineTo(hover.x, hover.y);
                        ctx.stroke();

                        // AreaRadius (효과 적용 범위 원 — TargetRadius와 완벽히 구별되는 채움 + 이중 실선!)
                        ctx.fillStyle = !inRange
                            ? 'rgba(239, 68, 68, 0.22)'
                            : currentTargeting.isSupport
                                ? 'rgba(52, 211, 153, 0.24)'
                                : 'rgba(251, 146, 60, 0.26)';
                        ctx.strokeStyle = areaColor;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, rPx, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.lineWidth = 1.2;
                        ctx.strokeStyle = '#ffffffaa';
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, Math.max(4, rPx - 4), 0, Math.PI * 2);
                        ctx.stroke();

                        const areaLabel = inRange
                            ? `효과 범위 ${currentTargeting.aoeRadiusMeters.toFixed(1)}m`
                            : `사거리 초과 (${dM.toFixed(1)}m / ${currentTargeting.rangeMeters.toFixed(1)}m)`;
                        ctx.font = 'bold 11px sans-serif';
                        const aTw = ctx.measureText(areaLabel).width + 14;
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(hover.x - aTw / 2, hover.y - rPx - 24, aTw, 18, 6);
                        ctx.fill();
                        ctx.strokeStyle = areaColor;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.textAlign = 'center';
                        ctx.fillStyle = inRange ? '#fed7aa' : '#fecaca';
                        ctx.fillText(areaLabel, hover.x, hover.y - rPx - 11);
                        ctx.restore();
                    } else if (currentTargeting.shape === 'cone') {
                        const ang = Math.atan2(hover.y - curActive.y, hover.x - curActive.x);
                        const rPx = metersToPx(currentTargeting.rangeMeters);
                        const halfRad = (((currentTargeting.coneAngleDeg || 60) * Math.PI) / 180) * 0.5;
                        ctx.save();
                        ctx.fillStyle = `${currentTargeting.vfxColor}33`;
                        ctx.strokeStyle = currentTargeting.vfxColor;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(curActive.x, curActive.y);
                        ctx.arc(curActive.x, curActive.y, rPx, ang - halfRad, ang + halfRad);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    } else if (currentTargeting.shape === 'square') {
                        const ang = Math.atan2(hover.y - curActive.y, hover.x - curActive.x);
                        const wPx = metersToPx(currentTargeting.squareWidthMeters || 5);
                        const lPx = metersToPx(currentTargeting.squareLengthMeters || 10);
                        ctx.save();
                        ctx.translate(curActive.x, curActive.y);
                        ctx.rotate(ang);
                        ctx.fillStyle = `${currentTargeting.vfxColor}33`;
                        ctx.strokeStyle = currentTargeting.vfxColor;
                        ctx.lineWidth = 2.5;
                        ctx.fillRect(0, -wPx / 2, lPx, wPx);
                        ctx.strokeRect(0, -wPx / 2, lPx, wPx);
                        ctx.restore();
                    } else if (currentTargeting.shape === 'single') {
                        // 단일 스킬/공격 조준 시 타겟 리티클(과녁) 링 렌더링
                        const pulse = 1 + Math.sin(now * 0.01) * 0.12;
                        const r = 18 * pulse;
                        ctx.save();
                        ctx.strokeStyle = actionMode === 'skill' ? '#fbbf24' : '#f43f5e';
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, r, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, r * 0.45, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            // 6. Units (Sorted by Y for 2.5D depth — 전투불능 동료는 무덤/비석 오브젝트로 유지 표기!)
            const isResTargetMode = actionMode === 'skill' && isBg3ResurrectionSkill(selectedSkill);
            const sortedUnits = [...unitsRef.current]
                .filter(u => u.hp > 0 || (u.team === 'ally' && !u.isSummon))
                .sort((a, b) => a.y - b.y);
            sortedUnits.forEach(u => {
                // 전투불능 동료 -> 무덤(비석) 오브젝트 렌더링 (추후 assets/visuals/gravestone.png 생성 시 자동 표시)
                if (u.hp <= 0 && u.team === 'ally') {
                    const gx = u.x;
                    const gy = u.y;
                    ctx.save();

                    // 부활 스킬 선택 중일 때 황금빛 부활 가능 펄스 링 표시
                    if (isResTargetMode) {
                        const pulse = 1 + Math.sin(now * 0.008) * 0.14;
                        ctx.strokeStyle = 'rgba(250, 204, 21, 0.92)';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([7, 5]);
                        ctx.beginPath();
                        ctx.ellipse(gx, gy + 10, (u.radius + 10) * pulse, (u.radius + 10) * 0.52 * pulse, 0, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }

                    // 바닥 그림자 & 흙무덤
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
                    ctx.beginPath();
                    ctx.ellipse(gx, gy + 14, 24, 10, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#44403c';
                    ctx.beginPath();
                    ctx.ellipse(gx, gy + 10, 20, 8, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const graveImg = getGravestoneImage();
                    if (graveImg && graveImg.complete && graveImg.naturalWidth > 0) {
                        const gw = 48;
                        const gh = 54;
                        ctx.drawImage(graveImg, gx - gw / 2, gy - gh + 14, gw, gh);
                    } else {
                        // 스타일리시 캔버스 석재 비석 (추후 이미지 생성 전까지 기본 표시)
                        const stoneGrad = ctx.createLinearGradient(gx - 15, gy - 32, gx + 15, gy + 10);
                        stoneGrad.addColorStop(0, '#94a3b8');
                        stoneGrad.addColorStop(0.55, '#64748b');
                        stoneGrad.addColorStop(1, '#334155');
                        ctx.fillStyle = stoneGrad;
                        ctx.strokeStyle = '#1e293b';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(gx - 14, gy + 8);
                        ctx.lineTo(gx - 14, gy - 16);
                        ctx.arc(gx, gy - 16, 14, Math.PI, 0, false);
                        ctx.lineTo(gx + 14, gy + 8);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();

                        // 비석 받침대
                        ctx.fillStyle = '#475569';
                        ctx.fillRect(gx - 18, gy + 5, 36, 6);
                        ctx.strokeRect(gx - 18, gy + 5, 36, 6);

                        // 각인 십자가
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(gx, gy - 23);
                        ctx.lineTo(gx, gy - 5);
                        ctx.moveTo(gx - 6, gy - 16);
                        ctx.lineTo(gx + 6, gy - 16);
                        ctx.stroke();
                    }

                    // 이름표 & 상태 안내
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const label = isResTargetMode ? `✨ ${u.name} (부활 가능)` : `⚰️ ${u.name} (전투불능)`;
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
                    ctx.fillText(label, gx + 1, gy - 37);
                    ctx.fillStyle = isResTargetMode ? '#fde047' : '#cbd5e1';
                    ctx.fillText(label, gx, gy - 38);

                    ctx.restore();
                    return;
                }

                let ux = u.x;
                let uy = u.y;
                let jumpArcY = 0;
                let walkFrame = 1;

                // Walking interpolation
                const wa = walkAnimRef.current;
                if (wa && wa.unitId === u.id) {
                    const t = Math.min(1, (now - wa.startTime) / wa.duration);
                    ux = wa.sx + (wa.tx - wa.sx) * t;
                    uy = wa.sy + (wa.ty - wa.sy) * t;
                    if (wa.isJump) jumpArcY = Math.sin(t * Math.PI) * 68;
                    walkFrame = Math.floor(now / 110) % 3;
                }

                // Melee lunge offset
                const lunge = lungeMapRef.current[u.id];
                if (lunge && now < lunge.until) {
                    const p = Math.sin(((lunge.until - now) / 210) * Math.PI);
                    ux += lunge.dx * p;
                    uy += lunge.dy * p;
                }

                const isSelected = u.id === activeUnitId;
                const isShared = sharedAllyGroup.includes(u.id);

                // Ground shadow
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.beginPath();
                ctx.ellipse(ux, uy + 14, u.radius * 0.95, u.radius * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();

                // Active / Team Ring
                ctx.save();
                ctx.strokeStyle = isSelected ? '#fde047' : u.team === 'ally' ? (isShared ? '#34d399' : '#38bdf8') : u.isBoss ? '#f43f5e' : '#fb7185';
                ctx.lineWidth = isSelected ? 3.5 : 2;
                ctx.beginPath();
                ctx.ellipse(ux, uy + 12, u.radius + 5, (u.radius + 5) * 0.48, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // Rotating Buff Aura Ring!
                if (u.activeBuffs.length > 0) {
                    ctx.save();
                    ctx.translate(ux, uy + 10);
                    ctx.scale(1, 0.5);
                    ctx.rotate(now * 0.003);
                    ctx.strokeStyle = u.activeBuffs[0].color || '#fde047';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 7]);
                    ctx.beginPath();
                    ctx.arc(0, 0, u.radius + 13, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Draw Unit Sprite / Enemy Token
                const drawY = uy - jumpArcY;
                const isFlashing = (hitFlashRef.current[u.id] || 0) > now;
                ctx.save();
                if (isFlashing) ctx.filter = 'brightness(2.4)';

                if (u.team === 'enemy') {
                    const isRpgSheetUrl = (url?: string) => !!url && (url.includes('rpg_sprites') || url.includes('_rpg.png'));
                    const enemySheetUrl = isRpgSheetUrl(u.visualUrl) ? u.visualUrl : (!u.visualUrl && isRpgSheetUrl(u.spriteUrl) ? u.spriteUrl : undefined);
                    const enemySheet = enemySheetUrl ? getCachedRpgSpriteImage(enemySheetUrl) : null;
                    const realMonster = !enemySheetUrl ? getCachedMonsterSprite(u.visualUrl) : null;
                    const sz = u.isBoss ? 112 : 76;
                    if (enemySheet) {
                        const charSz = u.isBoss ? 72 : 56;
                        const fw = enemySheet.width / 3;
                        const fh = enemySheet.height / 4;
                        const row = DIRECTION_ROW_MAP[u.dir] ?? 0;
                        ctx.drawImage(enemySheet, walkFrame * fw, row * fh, fw, fh, ux - charSz / 2, drawY - charSz * 0.78, charSz, charSz);
                    } else if (realMonster) {
                        if (realMonster.isCutout) {
                            // 투명화 처리된 실제 몬스터 스프라이트! (비율 유지 + 은은한 그림자)
                            const aspect = realMonster.width / Math.max(1, realMonster.height);
                            const drawW = aspect >= 1 ? sz : sz * aspect;
                            const drawH = aspect >= 1 ? sz / aspect : sz;
                            ctx.shadowColor = u.isBoss ? 'rgba(244, 63, 94, 0.55)' : 'rgba(0, 0, 0, 0.65)';
                            ctx.shadowBlur = u.isBoss ? 14 : 8;
                            ctx.drawImage(realMonster.source, ux - drawW / 2, drawY - drawH * 0.82, drawW, drawH);
                            ctx.shadowBlur = 0;
                        } else {
                            // 풀 채색 판타지 몬스터 일러스트: 원본 100% 보존 + BG3 고급 원형 메달 미니어처 토큰 (aspect-cover 크롭 + 이중 금속 테두리 + 보스 오라)
                            const rad = u.isBoss ? 46 : 31;
                            const cy = drawY - rad * 0.76;

                            // 외곽 발광 오라
                            ctx.save();
                            ctx.shadowColor = u.isBoss ? 'rgba(251, 191, 36, 0.75)' : 'rgba(244, 63, 94, 0.6)';
                            ctx.shadowBlur = u.isBoss ? 18 : 10;
                            ctx.beginPath();
                            ctx.arc(ux, cy, rad + 2, 0, Math.PI * 2);
                            ctx.fillStyle = '#0f172a';
                            ctx.fill();
                            ctx.restore();

                            // 원형 클립 + object-cover 중앙 상단 포커스 (얼굴/상반신이 찌그러지지 않게!)
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(ux, cy, rad, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            const sw = realMonster.width || 128;
                            const sh = realMonster.height || 128;
                            const coverScale = Math.max((rad * 2) / sw, (rad * 2) / sh);
                            const dw = sw * coverScale;
                            const dh = sh * coverScale;
                            ctx.drawImage(realMonster.source, ux - dw / 2, cy - dh * 0.44, dw, dh);

                            // 은은한 내부 비네팅으로 메달 입체감 강조
                            const innerVig = ctx.createRadialGradient(ux, cy, rad * 0.55, ux, cy, rad);
                            innerVig.addColorStop(0, 'rgba(0,0,0,0)');
                            innerVig.addColorStop(1, 'rgba(2, 6, 23, 0.55)');
                            ctx.fillStyle = innerVig;
                            ctx.fillRect(ux - rad, cy - rad, rad * 2, rad * 2);
                            ctx.restore();

                            // 이중 금속 베벨 링
                            ctx.save();
                            ctx.strokeStyle = u.isBoss ? '#fbbf24' : '#f43f5e';
                            ctx.lineWidth = u.isBoss ? 4 : 2.8;
                            ctx.beginPath();
                            ctx.arc(ux, cy, rad, 0, Math.PI * 2);
                            ctx.stroke();

                            ctx.strokeStyle = u.isBoss ? 'rgba(254, 240, 138, 0.85)' : 'rgba(253, 164, 175, 0.7)';
                            ctx.lineWidth = 1.2;
                            ctx.beginPath();
                            ctx.arc(ux, cy, rad - 3, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.restore();
                        }
                    } else if (u.enemyTokenPart) {
                        const tok = getCachedCityAssetImage(getPropAssetUrl('srpg', u.enemyTokenPart));
                        const tokSz = u.isBoss ? 88 : 62;
                        if (tok) {
                            ctx.drawImage(tok, ux - tokSz / 2, drawY - tokSz * 0.72, tokSz, tokSz);
                        } else {
                            drawFallbackChibiSprite(ctx, ux, drawY + 12, 48, u.dir, walkFrame, u.regionKey, u.genderKey);
                        }
                    } else {
                        drawFallbackChibiSprite(ctx, ux, drawY + 12, 48, u.dir, walkFrame, u.regionKey, u.genderKey);
                    }
                } else {
                    const sheet = getCachedRpgSpriteImage(u.spriteUrl);
                    const sz = u.isPlayer ? 62 : 54;
                    if (sheet) {
                        const fw = sheet.width / 3;
                        const fh = sheet.height / 4;
                        const row = DIRECTION_ROW_MAP[u.dir] ?? 0;
                        ctx.drawImage(sheet, walkFrame * fw, row * fh, fw, fh, ux - sz / 2, drawY - sz * 0.78, sz, sz);
                    } else {
                        drawFallbackChibiSprite(ctx, ux, drawY + 12, 48, u.dir, walkFrame, u.regionKey, u.genderKey);
                    }

                    // 탈것 장착 아군: 캐릭터 좌측 하단에 탈것 visualUrl 원형 메달 상시 표기!
                    if (u.mountName) {
                        const mx = ux - u.radius - 7;
                        const my = drawY - 10;
                        const mRad = 13;
                        const mSprite = getCachedMonsterSprite(u.mountVisualUrl);
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(mx, my, mRad + 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#0f172a';
                        ctx.fill();
                        if (mSprite) {
                            ctx.beginPath();
                            ctx.arc(mx, my, mRad, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            const sw = mSprite.width || 64;
                            const sh = mSprite.height || 64;
                            const sc = Math.max((mRad * 2) / sw, (mRad * 2) / sh);
                            ctx.drawImage(mSprite.source, mx - (sw * sc) / 2, my - (sh * sc) * 0.45, sw * sc, sh * sc);
                        } else {
                            ctx.fillStyle = '#065f46';
                            ctx.beginPath();
                            ctx.arc(mx, my, mRad, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.font = '12px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = '#ecfdf5';
                            ctx.fillText('🐎', mx, my + 4);
                        }
                        ctx.restore();
                        ctx.save();
                        ctx.strokeStyle = '#34d399';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(mx, my, mRad, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
                ctx.restore();

                // Name + HP Bar (12px, 내부에 HP 수치+% 정렬) + MP Bar (10px, 내부에 MP % 정렬) + Shield Bar
                const barW = u.isBoss ? 116 : 86;
                const hpBarH = 12;
                const mpBarH = 10;
                const barY = drawY - (u.isBoss ? 96 : 68);
                const hpPct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
                const hpPctInt = Math.round(hpPct * 100);

                // HP 바 배경 & 채움
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(ux - barW / 2, barY, barW, hpBarH);
                ctx.fillStyle = u.team === 'ally' ? '#16a34a' : u.isBoss ? '#e11d48' : '#dc2626';
                ctx.fillRect(ux - barW / 2, barY, barW * hpPct, hpBarH);
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 0.8;
                ctx.strokeRect(ux - barW / 2, barY, barW, hpBarH);

                // HP 수치 + % 를 HP 칸 내부 정중앙에 깔끔하게 표기!
                const hpInnerText = (u.shieldHp || 0) > 0
                    ? `${formatCompactKorean(u.hp)} (${hpPctInt}%) +🛡️${formatCompactKorean(u.shieldHp)}`
                    : `${formatCompactKorean(u.hp)} (${hpPctInt}%)`;
                ctx.save();
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 2.4;
                ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
                ctx.strokeText(hpInnerText, ux, barY + hpBarH / 2 + 0.5);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(hpInnerText, ux, barY + hpBarH / 2 + 0.5);
                ctx.restore();

                // 보호막 / 마나 쉴드 파란 게이지 바 (HP 바 바로 위)
                if ((u.shieldHp || 0) > 0) {
                    const shPct = Math.min(1, u.shieldHp / Math.max(1, u.maxShieldHp || u.maxHp));
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(ux - barW / 2, barY - 4, barW * shPct, 3.2);
                }

                // 아군 캐릭터/동료 MP 게이지 바 (HP 바 바로 아래 + 내부에 MP % 정중앙 표기!)
                if (u.team === 'ally' && u.maxMp > 0) {
                    const mpY = barY + hpBarH + 1;
                    const mpPct = Math.max(0, Math.min(1, u.mp / Math.max(1, u.maxMp)));
                    const mpPctInt = Math.round(mpPct * 100);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                    ctx.fillRect(ux - barW / 2, mpY, barW, mpBarH);
                    ctx.fillStyle = '#2563eb';
                    ctx.fillRect(ux - barW / 2, mpY, barW * mpPct, mpBarH);
                    ctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
                    ctx.lineWidth = 0.7;
                    ctx.strokeRect(ux - barW / 2, mpY, barW, mpBarH);

                    ctx.save();
                    ctx.font = 'bold 8.5px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineWidth = 2.2;
                    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
                    ctx.strokeText(`MP ${mpPctInt}%`, ux, mpY + mpBarH / 2 + 0.5);
                    ctx.fillStyle = '#e0f2fe';
                    ctx.fillText(`MP ${mpPctInt}%`, ux, mpY + mpBarH / 2 + 0.5);
                    ctx.restore();
                }

                // 신력 쉴드(브레이크 게이지) 명시적 뱃지 (HP바 우측)
                const maxBrk = u.maxBreakGauge || 0;
                if (maxBrk > 0) {
                    const curBrk = u.breakGauge ?? maxBrk;
                    const isBroken = isUnitShinryokuBroken((u.sourceEntity as any)?.statusEffects);
                    const badgeX = ux + barW / 2 + 4;
                    const badgeY = barY;
                    const badgeText = isBroken ? '💥BREAK' : `⚡${curBrk}/${maxBrk}`;
                    ctx.save();
                    ctx.font = 'bold 9px sans-serif';
                    const tw = ctx.measureText(badgeText).width + 8;
                    ctx.fillStyle = isBroken ? 'rgba(153, 27, 27, 0.92)' : u.team === 'ally' ? 'rgba(12, 74, 110, 0.92)' : 'rgba(120, 53, 15, 0.92)';
                    ctx.strokeStyle = isBroken ? '#f87171' : u.team === 'ally' ? '#38bdf8' : '#fbbf24';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(badgeX, badgeY, tw, 13, 4);
                    ctx.fill();
                    ctx.stroke();
                    ctx.textAlign = 'left';
                    ctx.fillStyle = isBroken ? '#fef08a' : u.team === 'ally' ? '#e0f2fe' : '#fef3c7';
                    ctx.fillText(badgeText, badgeX + 4, badgeY + 9.5);
                    ctx.restore();
                }

                // 버프/상태이상 캔버스 미니 젬 인디케이터 (상세 아이콘·효과는 좌측 하단 패널 & 마우스 호버 툴팁에서 확인)
                const buffCount = (u.activeBuffs || []).length;
                const statusCount = (u.activeStatuses || []).length;
                if (buffCount > 0 || statusCount > 0) {
                    const totalDots = Math.min(5, buffCount + statusCount);
                    const startX = ux - ((totalDots - 1) * 10) / 2;
                    for (let bi = 0; bi < Math.min(3, buffCount); bi++) {
                        ctx.fillStyle = u.activeBuffs[bi].color || '#fde047';
                        ctx.beginPath();
                        ctx.arc(startX + bi * 10, barY - 22, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#020617';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                    for (let si = 0; si < Math.min(2, statusCount); si++) {
                        ctx.fillStyle = u.activeStatuses[si].color || '#f43f5e';
                        ctx.beginPath();
                        ctx.arc(startX + (Math.min(3, buffCount) + si) * 10, barY - 22, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                const displayUnitName = `Lv.${u.level} ${u.name}`;
                ctx.font = u.isBoss ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#020617';
                ctx.fillText(displayUnitName, ux + 1, barY - 5);
                ctx.fillStyle = u.team === 'ally' ? '#e0f2fe' : u.isBoss ? '#fde047' : '#fecdd3';
                ctx.fillText(displayUnitName, ux, barY - 6);

                // Hover Damage & Hit Chance Preview over Enemy! (만/억/조 단위 + 신력상성)
                if (hover && curActive && curActive.team === 'ally' && u.team === 'enemy' && distPx(hover.x, hover.y, u.x, u.y) <= u.radius + 30) {
                    const prev = calculateBg3Damage(curActive, u, actionMode === 'skill' ? selectedSkill : null, arena.obstacles, surfacesRef.current, character);
                    const atkEl = (actionMode === 'skill' ? (selectedSkill as any)?.shinryokuType : null) || curActive.element || '무속성';
                    const defEl = u.element || '무속성';
                    const affInfo = SHINRYOKU_AFFINITY[atkEl];
                    const matchupTag =
                        affInfo && defEl !== '무속성'
                            ? affInfo.strong?.includes(defEl)
                                ? ` · ▲우위(${atkEl}▶${defEl})`
                                : affInfo.weak?.includes(defEl)
                                    ? ` · ▼열세(${atkEl}◀${defEl})`
                                    : ''
                            : '';
                    const tip = `🎯 ${prev.hitChance}% · 예상 ${formatCompactKorean(prev.damage)}${prev.comboName ? ' ⚡콤보!' : ''}${matchupTag}`;
                    ctx.font = 'bold 12px sans-serif';
                    const tw = ctx.measureText(tip).width + 16;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                    ctx.beginPath();
                    ctx.roundRect(ux - tw / 2, barY - 38, tw, 22, 8);
                    ctx.fill();
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = '#fef08a';
                    ctx.fillText(tip, ux, barY - 23);
                }
            });

            // 7. Layer B Live On-Field VFX: Projectiles
            // 6.5 탈것 몬스터 자동 협공 돌진 애니메이션 렌더링!
            mountDashAnimsRef.current = mountDashAnimsRef.current.filter(anim => now - anim.startTime < anim.duration);
            mountDashAnimsRef.current.forEach(anim => {
                const p = Math.min(1, (now - anim.startTime) / anim.duration);
                const lungeT = p < 0.55 ? p / 0.55 : 1 - (p - 0.55) / 0.45;
                const ease = 1 - Math.pow(1 - lungeT, 2);
                const cx = anim.sx + (anim.tx - anim.sx) * ease;
                const cy = anim.sy + (anim.ty - anim.sy) * ease - Math.sin(lungeT * Math.PI) * 24;
                const mSprite = getCachedMonsterSprite(anim.visualUrl);
                const rad = 24;

                ctx.save();
                ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
                ctx.shadowColor = 'rgba(52, 211, 153, 0.85)';
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(cx, cy, rad + 2, 0, Math.PI * 2);
                ctx.fillStyle = '#064e3b';
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
                if (mSprite) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    const sw = mSprite.width || 64;
                    const sh = mSprite.height || 64;
                    const sc = Math.max((rad * 2) / sw, (rad * 2) / sh);
                    ctx.drawImage(mSprite.source, cx - (sw * sc) / 2, cy - (sh * sc) * 0.45, sw * sc, sh * sc);
                } else {
                    ctx.font = 'bold 22px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🐎', cx, cy + 8);
                }
                ctx.restore();

                ctx.save();
                ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
                ctx.strokeStyle = '#6ee7b7';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.stroke();
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#6ee7b7';
                ctx.fillText(`🐎 ${anim.mountName}`, cx, cy - rad - 6);
                ctx.restore();
            });

            projectilesRef.current = projectilesRef.current.filter(p => now - p.startTime < p.duration);
            projectilesRef.current.forEach(p => {
                const t = Math.min(1, (now - p.startTime) / p.duration);
                const cx = p.sx + (p.tx - p.sx) * t;
                const cy = p.sy + (p.ty - p.sy) * t;
                ctx.save();
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.radius * 0.7;
                ctx.globalAlpha = 0.65;
                ctx.beginPath();
                ctx.moveTo(p.sx + (p.tx - p.sx) * Math.max(0, t - 0.25), p.sy + (p.ty - p.sy) * Math.max(0, t - 0.25));
                ctx.lineTo(cx, cy);
                ctx.stroke();

                const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, p.radius * 2.2);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.4, p.color);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = 1;
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(cx, cy, p.radius * 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 8. Layer B Live On-Field VFX: Wide Glowing Slash Arcs
            slashArcsRef.current = slashArcsRef.current.filter(s => now - s.startTime < s.duration);
            slashArcsRef.current.forEach(s => {
                const t = (now - s.startTime) / s.duration;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle);
                ctx.globalAlpha = 1 - t;
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 10 * s.scale * (1 - t * 0.5);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, 34 * s.scale, -1.1, 1.1);
                ctx.stroke();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3.5 * s.scale;
                ctx.beginPath();
                ctx.arc(0, 0, 34 * s.scale, -0.85, 0.85);
                ctx.stroke();
                ctx.restore();
            });

            // 9. Layer B Live On-Field VFX: Expanding AoE & Kill Shockwave Rings
            explosionsRef.current = explosionsRef.current.filter(ex => now - ex.startTime < ex.duration);
            explosionsRef.current.forEach(ex => {
                const t = (now - ex.startTime) / ex.duration;
                const r = ex.maxRadius * (0.18 + t * 0.82);
                ctx.save();
                ctx.globalAlpha = 1 - t;
                ctx.strokeStyle = ex.color;
                ctx.lineWidth = 7 * (1 - t * 0.7);
                ctx.beginPath();
                ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = `${ex.color}33`;
                ctx.fill();
                ctx.restore();
            });

            // 10. Particles
            particlesRef.current = particlesRef.current.filter(pt => pt.life < pt.maxLife);
            particlesRef.current.forEach(pt => {
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.vy += 0.08;
                pt.life += 1;
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 10.5 전리품 수루룩 드롭 분수 연출 (몬스터 처치 시 실제 전리품 이미지 + 희귀도 발광 카드!)
            lootDropAnimsRef.current = lootDropAnimsRef.current.filter(ld => now - ld.startTime < ld.duration);
            lootDropAnimsRef.current.forEach(ld => {
                if (now < ld.startTime) return;
                const elapsed = now - ld.startTime;
                const t = Math.min(1, elapsed / ld.duration);
                const flyT = Math.min(1, t / 0.24);
                const easeOut = 1 - Math.pow(1 - flyT, 3);
                const arcY = t < 0.24
                    ? Math.sin(flyT * Math.PI) * 52
                    : t < 0.34
                        ? Math.sin(((t - 0.24) / 0.1) * Math.PI) * 14
                        : Math.sin(now * 0.006) * 2.5;
                const lx = ld.sx + (ld.tx - ld.sx) * easeOut;
                const ly = ld.sy + (ld.ty - ld.sy) * easeOut - arcY;
                const alpha = t > 0.82 ? Math.max(0, (1 - t) / 0.18) : 1;
                const cardSz = 30;
                const lImg = getCachedLootImage(ld.imageUrl);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowColor = ld.rarityColor;
                ctx.shadowBlur = 12;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                ctx.strokeStyle = ld.rarityColor;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.roundRect(lx - cardSz / 2, ly - cardSz / 2, cardSz, cardSz, 7);
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0;

                if (lImg && lImg.complete && lImg.naturalWidth > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(lx - cardSz / 2 + 2, ly - cardSz / 2 + 2, cardSz - 4, cardSz - 4, 5);
                    ctx.clip();
                    ctx.drawImage(lImg, lx - cardSz / 2 + 2, ly - cardSz / 2 + 2, cardSz - 4, cardSz - 4);
                    ctx.restore();
                } else {
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🎁', lx, ly + 6);
                }

                const shortName = ld.name.length > 9 ? `${ld.name.slice(0, 8)}…` : ld.name;
                ctx.font = 'bold 9.5px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
                ctx.fillText(shortName, lx + 1, ly + cardSz / 2 + 12);
                ctx.fillStyle = ld.rarityColor;
                ctx.fillText(shortName, lx, ly + cardSz / 2 + 11);
                ctx.restore();
            });

            // 11. Floating Damage / Combo / Kill Texts
            floatsRef.current = floatsRef.current.filter(f => now - f.startTime < f.duration);
            floatsRef.current.forEach(f => {
                const t = (now - f.startTime) / f.duration;
                const y = f.y - t * 44;
                ctx.save();
                ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
                ctx.font = `900 ${Math.round(16 * f.scale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
                ctx.lineWidth = 4;
                ctx.strokeText(f.text, f.x, y);
                ctx.fillStyle = f.color;
                ctx.fillText(f.text, f.x, y);
                ctx.restore();
            });

            ctx.restore(); // end clip
            ctx.restore(); // end dpr

            rafId = requestAnimationFrame(render);
        };

        rafId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafId);
    }, [viewportSize, getTransform, arena, activeUnitId, actionMode, currentTargeting, selectedSkill, pendingItemUse, sharedAllyGroup, isBusy, battleEnded, character]);

    const aliveInitiativeUnits = useMemo(
        () =>
            initiativeOrder
                .map(id => units.find(u => u.id === id))
                .filter((u): u is Bg3Unit => Boolean(u && u.hp > 0)),
        [initiativeOrder, units]
    );

    const activePlayerSkills = useMemo(() => {
        if (!activeUnit) return [];
        return activeUnit.skills.slice(0, 4);
    }, [activeUnit]);

    // SRPG 숏컷(CombatQuickSlots) 현재 유닛 및 단축키 트리거 연동
    const activeAllyEntity: Character | Companion = useMemo(() => {
        if (activeUnit && activeUnit.team === 'ally') {
            return (activeUnit.sourceEntity as Character | Companion) || character;
        }
        return character;
    }, [activeUnit, character]);

    const activeShortcuts: string[] = useMemo(() => {
        const raw = (activeAllyEntity as any)?.skillShortcuts || (character as any)?.skillShortcuts;
        if (Array.isArray(raw) && raw.length > 0) return raw;
        return (activeUnit?.skills || character.skills || []).slice(0, 8).map(s => s.name);
    }, [activeAllyEntity, character, activeUnit]);

    const handleTriggerShortcutSlot = useCallback(
        (slotIdx: number) => {
            if (!isPlayerTurn || isBusy || !activeUnit || battleEnded) return;
            const entry = activeShortcuts[slotIdx];
            if (!entry) return;
            const foundSkill = activeUnit.skills.find(s => s.name === entry || s.id === entry);
            if (foundSkill) {
                if (!activeUnit.hasAction) {
                    setBannerMsg('이번 턴 주행동을 이미 사용했습니다!');
                    return;
                }
                if ((foundSkill.mpCost || 0) > activeUnit.mp) {
                    setBannerMsg(`MP가 부족합니다! (${foundSkill.name} 필요 MP ${foundSkill.mpCost})`);
                    return;
                }
                setSelectedSkill(foundSkill);
                setActionMode('skill');
                setBannerMsg(`⚡ 숏컷 [${foundSkill.name}] 선택됨! 전장의 적이나 위치를 클릭해 시전하세요.`);
                return;
            }
            // 소비 아이템 숏컷인 경우 보조행동으로 회복 적용
            if (activeUnit.hasBonusAction) {
                handleBonusPotion();
            }
        },
        [isPlayerTurn, isBusy, activeUnit, battleEnded, activeShortcuts]
    );

    useCombatKeybindHandler(
        combatKeybinds,
        Boolean(isPlayerTurn && !isBusy && !showSkillBook && !showKeybindModal && !reactionPrompt && !activeVideo),
        handleTriggerShortcutSlot
    );

    // 스페이스바(Space)로 즉시 턴 종료 (QTE/모달/입력창이 열려있지 않을 때)
    useEffect(() => {
        const onSpaceEndTurn = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (!isPlayerTurn || isBusy || battleEnded || qtePrompt || showSkillBook || showItemModal || showKeybindModal || reactionPrompt || activeVideo) {
                return;
            }
            e.preventDefault();
            advanceTurn();
        };
        window.addEventListener('keydown', onSpaceEndTurn);
        return () => window.removeEventListener('keydown', onSpaceEndTurn);
    }, [isPlayerTurn, isBusy, battleEnded, qtePrompt, showSkillBook, showItemModal, showKeybindModal, reactionPrompt, activeVideo, advanceTurn]);

    return (
        <div className="relative flex flex-col w-full h-full bg-slate-950 text-slate-100 overflow-hidden select-none rounded-xl border border-slate-800/80">
            {/* 보스 입장 / 파이널 클래스 사자 전용 동영상 컷신 오버레이 */}
            {activeVideo && (
                <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-2 sm:p-6">
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-2xl">
                        {activeVideo.url?.includes('youtube.com') || activeVideo.url?.includes('youtu.be') ? (
                            <iframe
                                src={(() => {
                                    const raw = activeVideo.url || '';
                                    if (raw.includes('/shorts/')) {
                                        const id = raw.split('/shorts/')[1]?.split('?')[0]?.split('&')[0];
                                        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
                                    }
                                    if (raw.includes('watch?v=') || raw.includes('watch/')) {
                                        const id = raw.includes('watch?v=')
                                            ? raw.split('watch?v=')[1]?.split('&')[0]?.split('?')[0]
                                            : raw.split('watch/')[1]?.split('?')[0];
                                        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
                                    }
                                    if (raw.includes('youtu.be/')) {
                                        const id = raw.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
                                        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
                                    }
                                    if (raw.includes('/embed/')) {
                                        return raw.includes('autoplay=1') ? raw : `${raw}${raw.includes('?') ? '&' : '?'}autoplay=1&rel=0`;
                                    }
                                    return raw;
                                })()}
                                className="w-full h-full border-0"
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                                title="BG3 Combat Cutscene Video"
                            />
                        ) : (
                            <video
                                src={activeVideo.url}
                                autoPlay
                                className="w-full h-full object-contain"
                                onEnded={() => setActiveVideo(null)}
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveVideo(null)}
                            className="absolute top-3 right-3 z-50 bg-black/75 hover:bg-black text-white w-10 h-10 rounded-full flex items-center justify-center border border-white/25 font-bold"
                            title="영상 건너뛰기"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* 상단 헤더 + BG3 이니셔티브 포트레이트 바 (AGI + WIS 순) */}
            <div className="shrink-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black whitespace-nowrap shrink-0">
                            R{roundNum}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-white truncate">{title}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{bannerMsg}</p>
                </div>

                {/* BG3 Initiative Portrait Strip */}
                <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[54%] py-0.5">
                    {aliveInitiativeUnits.map(u => {
                        const isCur = u.id === activeUnitId;
                        const canSwitch = sharedAllyGroup.includes(u.id) && isPlayerTurn && !isBusy;
                        return (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                    if (canSwitch) {
                                        setActiveUnitId(u.id);
                                        setActionMode('move');
                                    }
                                }}
                                title={`${u.name} (이니셔티브 AGI+WIS: ${u.initiative})`}
                                className={`relative px-2 py-1 rounded-lg border text-left transition-all shrink-0 ${
                                    isCur
                                        ? 'border-amber-400 bg-amber-500/20 scale-105 shadow-lg shadow-amber-500/20'
                                        : u.team === 'ally'
                                        ? canSwitch
                                            ? 'border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-900/50 cursor-pointer'
                                            : 'border-sky-800/60 bg-slate-900/80'
                                        : 'border-rose-800/70 bg-rose-950/40'
                                }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {u.visualUrl ? (
                                        <img
                                            src={u.visualUrl}
                                            alt={u.name}
                                            className={`w-6 h-6 rounded-full object-cover object-top shrink-0 border ${
                                                u.team === 'ally' ? 'border-sky-400' : u.isBoss ? 'border-amber-400' : 'border-rose-400'
                                            }`}
                                        />
                                    ) : (
                                        <div
                                            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black border ${
                                                u.team === 'ally'
                                                    ? 'bg-sky-900 border-sky-400 text-sky-200'
                                                    : 'bg-rose-900 border-rose-400 text-rose-200'
                                            }`}
                                        >
                                            {u.name.slice(0, 1)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className={`text-[11px] font-bold truncate max-w-[60px] ${u.team === 'ally' ? 'text-sky-200' : 'text-rose-200'}`}>
                                                {u.name}
                                            </span>
                                            <span className="text-[9px] font-mono text-amber-300/90">{u.initiative}</span>
                                        </div>
                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                                            <div
                                                className={`h-full ${u.team === 'ally' ? 'bg-emerald-400' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.max(0, Math.min(100, (u.hp / Math.max(1, u.maxHp)) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 우측 컨트롤 */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowLogDrawer(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            showLogDrawer ? 'bg-indigo-600/35 border-indigo-400 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                        title="전투 상세 로그 패널 열기/닫기"
                    >
                        📜 로그
                    </button>
                    <button
                        type="button"
                        onClick={() => setOverviewMode(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            overviewMode ? 'bg-sky-500/25 border-sky-400 text-sky-200' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                        title="전체 광활한 전장 한눈에 보기 / 유닛 추적 전환 (WASD·우클릭 드래그 이동)"
                    >
                        {overviewMode ? '🎯 추적' : '🗺️ 전체'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setFastMode(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            fastMode ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                    >
                        <FastForward size={13} /> 고속
                    </button>
                    <button
                        type="button"
                        onClick={() => setQteEnabled(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            qteEnabled ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                        title="공격 스킬 시전 시 JUST IMPACT 타이밍 바 (1.25배 피해 + 브레이크 추가)"
                    >
                        ⚡ QTE
                    </button>
                    <button
                        type="button"
                        onClick={() => setAutoBattle(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            autoBattle ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                    >
                        <Bot size={13} /> 자동
                    </button>
                    {canFlee && onRetreat && (
                        <button
                            type="button"
                            onClick={onRetreat}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-300"
                            title="전장 후퇴 (일반 사냥 전용)"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* 100% 풀-뷰포트 무격자 캔버스 영역 */}
            <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden">
                {/* Layer A: 캔버스 좌표계와 1:1 일치시켜 적의 정확한 위치에서 VFX/프레임 애니메이션이 터지도록 배치 */}
                <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                    <CombatVFXOverlay />
                </div>

                {/* 💞 인연 합체기 듀얼 visualUrl 합체 컷인 배너 */}
                {bondCutIn && (
                    <div className="pointer-events-none absolute inset-x-0 top-14 z-40 flex items-center justify-center px-4">
                        <div className="relative flex items-center gap-0 rounded-2xl bg-gradient-to-r from-pink-950/95 via-slate-950/95 to-amber-950/95 border-2 border-pink-400/85 px-4 py-2.5 shadow-[0_0_40px_rgba(244,114,182,0.55)] backdrop-blur-md">
                            <div
                                className="flex items-center gap-2 pr-2"
                                style={{ animation: 'bondLeftIn 320ms cubic-bezier(0.22,1,0.36,1) forwards' }}
                            >
                                {bondCutIn.casterVisualUrl ? (
                                    <img
                                        src={bondCutIn.casterVisualUrl}
                                        alt={bondCutIn.casterName}
                                        className="w-16 h-16 rounded-xl object-cover object-top border-2 border-pink-400 shadow-lg"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-pink-900/70 border-2 border-pink-400 flex items-center justify-center text-xl font-black text-pink-200">
                                        {bondCutIn.casterName.slice(0, 1)}
                                    </div>
                                )}
                            </div>
                            <div className="px-3 text-center">
                                <div className="text-[10px] font-black tracking-widest text-pink-300 uppercase">💞 BOND RESONANCE</div>
                                <div className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 to-pink-300 whitespace-nowrap">
                                    {bondCutIn.skillName}
                                </div>
                                <div className="text-[11px] font-bold text-slate-200">
                                    {bondCutIn.casterName} × {bondCutIn.partnerName}
                                </div>
                            </div>
                            <div
                                className="flex items-center gap-2 pl-2"
                                style={{ animation: 'bondRightIn 320ms cubic-bezier(0.22,1,0.36,1) forwards' }}
                            >
                                {bondCutIn.partnerVisualUrl ? (
                                    <img
                                        src={bondCutIn.partnerVisualUrl}
                                        alt={bondCutIn.partnerName}
                                        className="w-16 h-16 rounded-xl object-cover object-top border-2 border-amber-300 shadow-lg"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-amber-900/70 border-2 border-amber-300 flex items-center justify-center text-xl font-black text-amber-200">
                                        {bondCutIn.partnerName.slice(0, 1)}
                                    </div>
                                )}
                            </div>
                            <style>{`
                                @keyframes bondLeftIn { from { transform: translateX(-44px); opacity: 0.2; } to { transform: translateX(6px); opacity: 1; } }
                                @keyframes bondRightIn { from { transform: translateX(44px); opacity: 0.2; } to { transform: translateX(-6px); opacity: 1; } }
                            `}</style>
                        </div>
                    </div>
                )}

                {/* QTE JUST IMPACT 타이밍 바 오버레이 */}
                {qtePrompt && (
                    <div
                        onClick={() => resolveQteNow()}
                        className="absolute inset-x-0 bottom-24 z-40 flex flex-col items-center justify-center px-4 cursor-pointer select-none"
                    >
                        <div className="w-full max-w-md rounded-2xl bg-slate-950/95 border-2 border-amber-400/80 p-3 shadow-2xl backdrop-blur-md">
                            <div className="flex items-center justify-between text-xs font-black mb-1.5">
                                <span className="text-amber-300">⚡ JUST IMPACT — {qtePrompt.skillName}</span>
                                <span className="text-slate-300 text-[10px]">클릭 또는 SPACE!</span>
                            </div>
                            <div className="relative h-5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                                {/* 중앙 황금 JUST 존 */}
                                <div className="absolute inset-y-0 left-[37%] w-[26%] bg-amber-400/40 border-x-2 border-amber-300" />
                                <div className="absolute inset-y-0 left-[46%] w-[8%] bg-yellow-300/70" />
                                {/* 이동 커서 */}
                                <div
                                    className="absolute inset-y-0 w-2 bg-white shadow-[0_0_12px_#fde047] rounded-full"
                                    style={{
                                        left: '0%',
                                        animation: `qteSlide ${qtePrompt.duration}ms linear forwards`
                                    }}
                                />
                            </div>
                            <style>{`@keyframes qteSlide { from { left: 0%; } to { left: 98%; } }`}</style>
                        </div>
                    </div>
                )}

                {/* 💞 인연 게이지 & 준비된 인연 합체기 플로팅 바 (우측 상단, 접기/펼치기 지원!) */}
                {Array.isArray(character.bondSkills) && character.bondSkills.length > 0 && (() => {
                    const bondTargets = resolvedCompanions
                        .filter(c => character.bondSkills?.some(bs => bs.companionId === c.id))
                        .slice(0, 3);
                    if (bondTargets.length === 0) return null;
                    const maxGauge = bondTargets.reduce((m, c) => Math.max(m, bondGauges[c.id] || 0), 0);
                    const hasReadyBond = maxGauge >= 100;

                    if (!bondPanelOpen) {
                        return (
                            <button
                                type="button"
                                onClick={() => setBondPanelOpen(true)}
                                className={`absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 shadow-xl backdrop-blur-sm border text-[11px] font-black transition-all ${
                                    hasReadyBond
                                        ? 'bg-gradient-to-r from-pink-600/95 to-amber-500/95 border-amber-300 text-white animate-pulse'
                                        : 'bg-slate-950/88 border-pink-500/50 text-pink-200 hover:border-pink-400'
                                }`}
                                title="인연 게이지 펼치기"
                            >
                                <span>💞 {hasReadyBond ? '합체기 준비!' : `인연 ${maxGauge}%`}</span>
                                <span className="text-[10px] opacity-80">▼</span>
                            </button>
                        );
                    }

                    return (
                        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1 w-[178px] sm:w-[205px] rounded-xl bg-slate-950/90 border border-pink-500/45 p-2 shadow-xl backdrop-blur-sm">
                            <div className="text-[10px] font-black text-pink-300 flex items-center justify-between gap-1 border-b border-pink-500/20 pb-1">
                                <span>💞 인연 게이지</span>
                                <button
                                    type="button"
                                    onClick={() => setBondPanelOpen(false)}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-pink-500/40 text-[9px] font-bold text-pink-200"
                                    title="인연 게이지 접기"
                                >
                                    접기 ▲
                                </button>
                            </div>
                            {bondTargets.map(c => {
                                const g = bondGauges[c.id] || 0;
                                const readySkill = g >= 100 ? character.bondSkills?.find(bs => bs.companionId === c.id) : undefined;
                                return (
                                    <div key={c.id} className="space-y-0.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-200 font-bold truncate">{c.name}</span>
                                            <span className={`font-mono font-black ${g >= 100 ? 'text-pink-300 animate-pulse' : 'text-slate-400'}`}>{g}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${g >= 100 ? 'bg-gradient-to-r from-pink-500 to-amber-300' : 'bg-pink-500/80'}`}
                                                style={{ width: `${Math.min(100, g)}%` }}
                                            />
                                        </div>
                                        {readySkill && isPlayerTurn && activeUnit?.hasAction && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSkill({ ...(readySkill as any), isBondSkill: true, companionId: c.id });
                                                    setActionMode('skill');
                                                    setBannerMsg(`💞 인연 합체기 [${readySkill.name}] 준비! 전장을 터치해 조준 후 떼면 발동합니다!`);
                                                }}
                                                className="w-full mt-0.5 py-0.5 px-1.5 rounded bg-gradient-to-r from-pink-600 to-amber-500 text-white text-[10px] font-black shadow hover:brightness-110"
                                            >
                                                💞 {readySkill.name} 발동!
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* 태블릿/모바일 친화적 터치 확대·축소 컨트롤 플로팅 바 (좌측 상단) */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 rounded-xl bg-slate-950/85 border border-slate-700/80 p-1 shadow-xl backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setOverviewMode(false);
                            setZoom(z => Math.max(0.5, +(z - 0.35).toFixed(2)));
                        }}
                        className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-100 font-black text-base border border-slate-700 flex items-center justify-center"
                        title="화면 축소 (-)"
                    >
                        −
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOverviewMode(false);
                            setZoom(isLargeWar ? 1.85 : 1.5);
                        }}
                        className="min-h-[36px] px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 font-mono font-bold text-xs border border-slate-700/80 flex items-center justify-center"
                        title="기본 배율로 초기화"
                    >
                        {overviewMode ? '전체' : `${Math.round(zoom * 100)}%`}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOverviewMode(false);
                            setZoom(z => Math.min(4.5, +(z + 0.35).toFixed(2)));
                        }}
                        className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-100 font-black text-base border border-slate-700 flex items-center justify-center"
                        title="화면 확대 (+)"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        onClick={() => setOverviewMode(v => !v)}
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center ${
                            overviewMode
                                ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                        title="전체 전장 보기 / 유닛 추적"
                    >
                        {overviewMode ? '🎯 추적' : '🗺️ 전체'}
                    </button>
                </div>

                <canvas
                    ref={canvasRef}
                    onContextMenu={e => e.preventDefault()}
                    onMouseDown={e => {
                        if (e.button === 2 || e.button === 1) {
                            setOverviewMode(false);
                            panDragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
                        }
                    }}
                    onMouseUp={() => {
                        panDragRef.current.dragging = false;
                    }}
                    onMouseMove={e => {
                        if (panDragRef.current.dragging) {
                            const dx = e.clientX - panDragRef.current.lastX;
                            const dy = e.clientY - panDragRef.current.lastY;
                            panDragRef.current.lastX = e.clientX;
                            panDragRef.current.lastY = e.clientY;
                            const { scale } = getTransform();
                            cameraTargetRef.current.x = Math.max(120, Math.min(arenaW - 120, cameraTargetRef.current.x - dx / scale));
                            cameraTargetRef.current.y = Math.max(120, Math.min(arenaH - 120, cameraTargetRef.current.y - dy / scale));
                            cameraRef.current.x = cameraTargetRef.current.x;
                            cameraRef.current.y = cameraTargetRef.current.y;
                        }
                        const wPt = screenToWorld(e.clientX, e.clientY);
                        hoverWorldRef.current = wPt;
                        if (wPt) {
                            const overEnemy = unitsRef.current.some(
                                u => u.team === 'enemy' && u.hp > 0 && distPx(wPt.x, wPt.y, u.x, u.y) <= u.radius + 18
                            );
                            if (overEnemy !== hoveringEnemy) setHoveringEnemy(overEnemy);
                        }
                    }}
                    onMouseLeave={() => {
                        panDragRef.current.dragging = false;
                        hoverWorldRef.current = null;
                        if (hoveringEnemy) setHoveringEnemy(false);
                    }}
                    onTouchStart={e => {
                        const tg = touchGestureRef.current;
                        if (e.touches.length === 2) {
                            const t0 = e.touches[0];
                            const t1 = e.touches[1];
                            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
                            tg.mode = 'pinch';
                            tg.pinchStartDist = Math.max(10, dist);
                            tg.pinchStartZoom = overviewMode ? 1.0 : zoom;
                            tg.lastX = (t0.clientX + t1.clientX) / 2;
                            tg.lastY = (t0.clientY + t1.clientY) / 2;
                            tg.moved = true;
                            hoverWorldRef.current = null;
                            setOverviewMode(false);
                        } else if (e.touches.length === 1) {
                            const t = e.touches[0];
                            tg.startX = t.clientX;
                            tg.startY = t.clientY;
                            tg.lastX = t.clientX;
                            tg.lastY = t.clientY;
                            tg.moved = false;
                            // 모바일 스킬/공격/아이템/밀치기/도약 조준 모드:
                            // 터치하는 즉시 PC와 동일한 스킬 범위(광역 원/사거리/타겟 강조)를 실시간 표시하고,
                            // 드래그로 위치를 조정한 뒤 터치를 떼면 해당 위치에 즉시 발동!
                            if (actionMode !== 'move' && isPlayerTurn && !isBusy && !battleEnded) {
                                tg.mode = 'aim';
                                const wPt = screenToWorld(t.clientX, t.clientY);
                                hoverWorldRef.current = wPt;
                            } else {
                                tg.mode = 'pan';
                            }
                        }
                    }}
                    onTouchMove={e => {
                        const tg = touchGestureRef.current;
                        if (e.touches.length === 2 && tg.mode === 'pinch') {
                            const t0 = e.touches[0];
                            const t1 = e.touches[1];
                            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
                            const ratio = dist / Math.max(10, tg.pinchStartDist);
                            const nextZoom = Math.max(0.5, Math.min(4.5, +(tg.pinchStartZoom * ratio).toFixed(2)));
                            setZoom(nextZoom);

                            const midX = (t0.clientX + t1.clientX) / 2;
                            const midY = (t0.clientY + t1.clientY) / 2;
                            const dx = midX - tg.lastX;
                            const dy = midY - tg.lastY;
                            tg.lastX = midX;
                            tg.lastY = midY;
                            const { scale } = getTransform();
                            cameraTargetRef.current.x = Math.max(120, Math.min(arenaW - 120, cameraTargetRef.current.x - dx / scale));
                            cameraTargetRef.current.y = Math.max(120, Math.min(arenaH - 120, cameraTargetRef.current.y - dy / scale));
                            cameraRef.current.x = cameraTargetRef.current.x;
                            cameraRef.current.y = cameraTargetRef.current.y;
                        } else if (e.touches.length === 1 && tg.mode === 'aim') {
                            const t = e.touches[0];
                            tg.lastX = t.clientX;
                            tg.lastY = t.clientY;
                            const wPt = screenToWorld(t.clientX, t.clientY);
                            hoverWorldRef.current = wPt;
                        } else if (e.touches.length === 1 && tg.mode === 'pan') {
                            const t = e.touches[0];
                            const totalMove = Math.hypot(t.clientX - tg.startX, t.clientY - tg.startY);
                            if (totalMove > 12) {
                                tg.moved = true;
                                setOverviewMode(false);
                                const dx = t.clientX - tg.lastX;
                                const dy = t.clientY - tg.lastY;
                                const { scale } = getTransform();
                                cameraTargetRef.current.x = Math.max(120, Math.min(arenaW - 120, cameraTargetRef.current.x - dx / scale));
                                cameraTargetRef.current.y = Math.max(120, Math.min(arenaH - 120, cameraTargetRef.current.y - dy / scale));
                                cameraRef.current.x = cameraTargetRef.current.x;
                                cameraRef.current.y = cameraTargetRef.current.y;
                            }
                            tg.lastX = t.clientX;
                            tg.lastY = t.clientY;
                        }
                    }}
                    onTouchEnd={e => {
                        const tg = touchGestureRef.current;
                        if (tg.mode === 'aim' && e.touches.length === 0) {
                            const aimedPt = hoverWorldRef.current || screenToWorld(tg.lastX, tg.lastY);
                            tg.moved = true; // 브라우저 합성 onClick 중복 실행 방지
                            tg.mode = 'none';
                            hoverWorldRef.current = null;
                            if (aimedPt) {
                                void handleCanvasWorldClick(aimedPt);
                            }
                            window.setTimeout(() => {
                                touchGestureRef.current.moved = false;
                            }, 280);
                            return;
                        }
                        window.setTimeout(() => {
                            touchGestureRef.current.mode = 'none';
                            touchGestureRef.current.moved = false;
                        }, 60);
                    }}
                    onClick={e => {
                        if (touchGestureRef.current.moved) return;
                        handleCanvasClick(e);
                    }}
                    onWheel={e => {
                        setOverviewMode(false);
                        setZoom(z => Math.max(0.5, Math.min(4.5, +(z + (e.deltaY < 0 ? 0.22 : -0.22)).toFixed(2))));
                    }}
                    style={{
                        cursor:
                            actionMode === 'skill'
                                ? CURSOR_SKILL_TARGET
                                : actionMode === 'attack' || (actionMode === 'move' && hoveringEnemy)
                                ? CURSOR_ATTACK_SWORD
                                : 'pointer'
                    }}
                    className="block w-full h-full touch-none"
                />

                {/* [Item #4 & #7 + 모바일 최적화] 좌측 하단 현재 턴 캐릭터 스탯 · 버프 패널 (모바일 기본 접힘, 탭으로 토글!) */}
                {activeUnit && !statsPanelOpen && (
                    <button
                        type="button"
                        onClick={() => setStatsPanelOpen(true)}
                        className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 rounded-xl bg-slate-950/90 border border-slate-700/85 px-2.5 py-1.5 shadow-xl backdrop-blur-md text-[11px] font-bold text-slate-100 hover:border-amber-400/70"
                    >
                        {activeUnit.visualUrl && (
                            <img
                                src={activeUnit.visualUrl}
                                alt={activeUnit.name}
                                className="w-5 h-5 rounded-full object-cover object-top border border-amber-400/70"
                            />
                        )}
                        <span className="truncate max-w-[72px]">{activeUnit.name}</span>
                        <span className="text-emerald-300 font-mono">
                            {Math.round((activeUnit.hp / Math.max(1, activeUnit.maxHp)) * 100)}%
                        </span>
                        {(activeUnit.maxBreakGauge || 0) > 0 && (
                            <span className="text-amber-300 font-mono">
                                ⚡{activeUnit.breakGauge ?? activeUnit.maxBreakGauge}/{activeUnit.maxBreakGauge}
                            </span>
                        )}
                        {(activeUnit.activeBuffs?.length || 0) > 0 && (
                            <span className="text-yellow-300 font-mono">✨{activeUnit.activeBuffs.length}</span>
                        )}
                        <span className="text-slate-400 text-[10px]">▲</span>
                    </button>
                )}
                {activeUnit && statsPanelOpen && (
                    <div className="absolute bottom-2 left-2 z-30 w-64 sm:w-72 max-w-[84vw] max-h-[calc(100%-16px)] overflow-y-auto rounded-xl bg-slate-950/95 border border-amber-500/45 p-2.5 shadow-2xl backdrop-blur-md space-y-2">
                        {/* 캐릭터 헤더 (상단 고정 + 명확한 접기 버튼!) */}
                        <div className="sticky -top-2.5 -mx-2.5 -mt-2.5 px-2.5 pt-2 pb-1.5 bg-slate-950/98 backdrop-blur-md flex items-center justify-between gap-2 border-b border-slate-800 z-10">
                            <div className="flex items-center gap-2 min-w-0">
                                {activeUnit.visualUrl ? (
                                    <img
                                        src={activeUnit.visualUrl}
                                        alt={activeUnit.name}
                                        className="w-8 h-8 rounded-full object-cover object-top border border-amber-400/70 shrink-0"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-400/60 flex items-center justify-center text-xs font-black text-amber-300 shrink-0">
                                        {activeUnit.name.slice(0, 1)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="text-xs font-black text-white truncate">{activeUnit.name}</div>
                                    <div className="text-[10px] text-slate-400 truncate">Lv.{activeUnit.level} · {activeUnit.jobLabel}</div>
                                    {(() => {
                                        const src = activeUnit.sourceEntity as any;
                                        const tierOrder = [
                                            ClassTier.NONE,
                                            ClassTier.F,
                                            ClassTier.FIRST,
                                            ClassTier.SECOND,
                                            ClassTier.LAST,
                                            ClassTier.FINAL
                                        ];
                                        const currentTier: string = src?.classTier || ClassTier.NONE;
                                        const potentialTier: string | undefined = src?.liberationPotential;
                                        const unitSkills: Skill[] = Array.isArray(src?.skills) ? src.skills : [];
                                        let highestTierIdx = Math.max(0, tierOrder.indexOf(currentTier as ClassTier));
                                        unitSkills.forEach(sk => {
                                            const idx = tierOrder.indexOf(sk.tier);
                                            if (idx > highestTierIdx) {
                                                highestTierIdx = idx;
                                            }
                                        });
                                        const actualClassName =
                                            src?.finalClassName ||
                                            src?.lastClassName ||
                                            src?.secondClassName ||
                                            src?.firstClassName ||
                                            null;
                                        const elementLabel = activeUnit.element || src?.shinryokuType || '무속성';
                                        return (
                                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/90 border border-indigo-400/50 text-indigo-200">
                                                    🔓 해방: {currentTier}{potentialTier && potentialTier !== currentTier ? ` (한계 ${potentialTier})` : ''}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/40 text-amber-200">
                                                    👑 클래스명: {actualClassName || '미해방'}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-cyan-200">
                                                    ✨ 신력: {elementLabel}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    {activeUnit.mountName && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {activeUnit.mountVisualUrl && (
                                                <img
                                                    src={activeUnit.mountVisualUrl}
                                                    alt={activeUnit.mountName}
                                                    className="w-4 h-4 rounded-full object-cover object-top border border-emerald-400/80 shrink-0"
                                                />
                                            )}
                                            <span className="text-[9px] font-bold text-emerald-300 truncate">🐎 {activeUnit.mountName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setStatsPanelOpen(false)}
                                    className="text-[11px] font-black text-amber-200 hover:text-white px-2 py-0.5 rounded-lg bg-amber-950/90 hover:bg-amber-800 border border-amber-400/70 shadow"
                                    title="스탯 패널 접기"
                                >
                                    접기 ▼
                                </button>
                                {(activeUnit.maxBreakGauge || 0) > 0 && (
                                    <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.5 rounded">
                                        ⚡ 쉴드 {activeUnit.breakGauge ?? activeUnit.maxBreakGauge}/{activeUnit.maxBreakGauge}
                                    </span>
                                )}
                                {(activeUnit.shieldHp || 0) > 0 && (
                                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/50 px-1.5 py-0.5 rounded">
                                        🛡️ +{formatCompactKorean(activeUnit.shieldHp)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* HP / MP 게이지 + 퍼센트(%) 명시적 표기 */}
                        {(() => {
                            const hpPct = Math.round((activeUnit.hp / Math.max(1, activeUnit.maxHp)) * 100);
                            const mpPct = Math.round((activeUnit.mp / Math.max(1, activeUnit.maxMp)) * 100);
                            return (
                                <div className="space-y-1 text-[10px] font-mono">
                                    <div>
                                        <div className="flex justify-between text-emerald-300 font-bold mb-0.5">
                                            <span>HP {formatCompactKorean(activeUnit.hp)} / {formatCompactKorean(activeUnit.maxHp)}</span>
                                            <span>{hpPct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, hpPct)}%` }} />
                                        </div>
                                    </div>
                                    {activeUnit.team === 'ally' && activeUnit.maxMp > 0 && (
                                        <div>
                                            <div className="flex justify-between text-sky-300 font-bold mb-0.5">
                                                <span>MP {formatCompactKorean(activeUnit.mp)} / {formatCompactKorean(activeUnit.maxMp)}</span>
                                                <span>{mpPct}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, mpPct)}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 전체 능력치 + 파생 전투 스탯 그리드 (정규 calculateFinalStats + calculateDerivedStats 실시간 반영!) */}
                        {(() => {
                            const snap = getBg3UnitDetailedStats(activeUnit);
                            const fStats = snap?.finalStats;
                            const diffs = snap?.statDiffs;
                            const derived = snap?.derived;
                            const rows = [
                                { label: 'STR', val: fStats?.str ?? activeUnit.str, diff: diffs?.str ?? 0, color: 'text-rose-300' },
                                { label: 'INT', val: fStats?.int ?? activeUnit.int, diff: diffs?.int ?? 0, color: 'text-sky-300' },
                                { label: 'AGI', val: fStats?.agi ?? activeUnit.agi, diff: diffs?.agi ?? 0, color: 'text-emerald-300' },
                                { label: 'WIS', val: fStats?.wis ?? activeUnit.wis, diff: diffs?.wis ?? 0, color: 'text-indigo-300' },
                                { label: 'DEF', val: fStats?.def ?? activeUnit.def, diff: diffs?.def ?? 0, color: 'text-amber-300' },
                                { label: 'CTRL', val: fStats?.ctrl ?? activeUnit.ctrl, diff: diffs?.ctrl ?? 0, color: 'text-purple-300' }
                            ];
                            return (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                                        {rows.map(r => (
                                            <div key={r.label} className="bg-slate-900/85 border border-slate-800 rounded-md px-1.5 py-1 flex flex-col">
                                                <span className="text-[9px] text-slate-500 font-bold">{r.label}</span>
                                                <span className={`font-black leading-tight ${r.diff > 0 ? 'text-amber-300' : r.diff < 0 ? 'text-rose-400' : r.color}`}>
                                                    {formatCompactKorean(Math.round(r.val))}
                                                    {r.diff !== 0 && (
                                                        <span className={`text-[8px] ml-0.5 ${r.diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            ({r.diff > 0 ? `+${formatCompactKorean(r.diff)}` : formatCompactKorean(r.diff)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {derived && (
                                        <div className="grid grid-cols-4 gap-1 text-[9px] font-mono bg-slate-900/60 border border-slate-800/80 rounded-md px-1.5 py-1">
                                            <div><span className="text-slate-500">물공</span> <span className="text-rose-200 font-bold">{formatCompactKorean(Math.round((derived as any).pAtk ?? (derived as any).physAtk ?? 0))}</span></div>
                                            <div><span className="text-slate-500">마공</span> <span className="text-sky-200 font-bold">{formatCompactKorean(Math.round((derived as any).mAtk ?? (derived as any).magAtk ?? 0))}</span></div>
                                            <div><span className="text-slate-500">물방</span> <span className="text-amber-200 font-bold">{formatCompactKorean(Math.round((derived as any).pDef ?? (derived as any).physDef ?? 0))}</span></div>
                                            <div><span className="text-slate-500">마방</span> <span className="text-indigo-200 font-bold">{formatCompactKorean(Math.round((derived as any).mDef ?? (derived as any).magDef ?? 0))}</span></div>
                                            <div className="col-span-2"><span className="text-slate-500">치명</span> <span className="text-yellow-300 font-bold">{Math.round(derived.critChance || 0)}%</span></div>
                                            <div><span className="text-slate-500">명중</span> <span className="text-emerald-300 font-bold">{Math.round(derived.accuracy || 0)}</span></div>
                                            <div><span className="text-slate-500">회피</span> <span className="text-cyan-300 font-bold">{Math.round(derived.evasion || 0)}</span></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 별도 버프 & 상태이상 영역 (CombatInterface 스타일 스킬 아이콘 + 마우스 호버 툴팁!) */}
                        <div className="border-t border-slate-800/90 pt-1.5">
                            <div className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                                <span>적용 중인 버프 / 상태이상</span>
                                {activeUnit.buffAtkMult > 1 && (
                                    <span className="text-amber-300 font-mono">공격 배율 ×{activeUnit.buffAtkMult.toFixed(2)}</span>
                                )}
                            </div>
                            {(activeUnit.activeBuffs || []).length === 0 && (activeUnit.activeStatuses || []).length === 0 ? (
                                <div className="text-[10px] text-slate-500 italic">적용 중인 버프 없음</div>
                            ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {(activeUnit.activeBuffs || []).map(b => {
                                        const regImg = getRegisteredSkillImage(b.name) || b.imageUrl;
                                        const IconComp = getSkillIconComponent(b.icon || 'Sparkles');
                                        return (
                                            <div key={b.name} className="relative group">
                                                <div
                                                    className="w-8 h-8 rounded-lg border-2 border-amber-400/80 bg-slate-900 overflow-hidden flex items-center justify-center shadow-md cursor-help"
                                                    style={{ boxShadow: `0 0 8px ${b.color || '#fbbf24'}55` }}
                                                >
                                                    {regImg ? (
                                                        <img src={regImg} alt={b.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <IconComp size={15} className="text-amber-300" />
                                                    )}
                                                    <span className="absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-amber-400 text-[8px] font-black text-amber-300 leading-tight">
                                                        {b.turns}T
                                                    </span>
                                                </div>
                                                {/* 마우스 호버 상세 버프 효과 툴팁 */}
                                                <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-2 w-52 p-2 rounded-xl bg-slate-950/98 border border-amber-400/70 shadow-2xl z-50 text-[10px]">
                                                    <div className="flex items-center justify-between gap-1 font-black text-amber-300 mb-0.5">
                                                        <span className="truncate">{b.name}</span>
                                                        <span className="text-emerald-300 shrink-0">{b.turns}턴 남음</span>
                                                    </div>
                                                    <div className="text-slate-200 leading-snug">
                                                        {b.effectSummary || `공격 배율 ×${(b.atkMult || 1).toFixed(2)}`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(activeUnit.activeStatuses || []).map(s => (
                                        <div key={s.name} className="relative group">
                                            <div className="w-8 h-8 rounded-lg border-2 border-rose-500/80 bg-rose-950/70 flex items-center justify-center text-[10px] font-black text-rose-200 cursor-help">
                                                {s.name.slice(0, 2)}
                                                <span className="absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-rose-400 text-[8px] font-black text-rose-300 leading-tight">
                                                    {s.turns}T
                                                </span>
                                            </div>
                                            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-2 w-44 p-2 rounded-xl bg-slate-950/98 border border-rose-500/70 shadow-2xl z-50 text-[10px]">
                                                <div className="font-black text-rose-300">{s.name} ({s.turns}턴 남음)</div>
                                                <div className="text-slate-300">
                                                    {s.kind === 'dot' ? '매 라운드 지속 피해' : s.kind === 'cc' ? '행동 불가 (CC)' : '능력치 약화 디버프'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatsPanelOpen(false)}
                            className="w-full py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-[10px] font-black text-amber-200 transition-colors"
                        >
                            ▼ 스탯 창 접기
                        </button>
                    </div>
                )}

                {/* 접이식 상세 전투 로그 드로어 (우측 슬라이드 / 모바일 하단 시트) */}
                {showLogDrawer && (
                    <div className="absolute top-2 right-2 bottom-2 w-72 sm:w-80 max-w-[90vw] z-30 rounded-2xl bg-slate-950/92 border border-indigo-500/50 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-300">📜 전술 전투 상세 로그</span>
                            <button
                                type="button"
                                onClick={() => setShowLogDrawer(false)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-[11px] leading-relaxed">
                            {combatLogs.map(log => (
                                <div
                                    key={log.id}
                                    className={`px-2 py-1 rounded-lg border ${
                                        log.tone === 'dmg'
                                            ? 'bg-rose-950/35 border-rose-800/50 text-rose-200'
                                            : log.tone === 'heal'
                                            ? 'bg-emerald-950/35 border-emerald-800/50 text-emerald-200'
                                            : log.tone === 'warn'
                                            ? 'bg-amber-950/35 border-amber-800/50 text-amber-200'
                                            : 'bg-slate-900/70 border-slate-800 text-slate-300'
                                    }`}
                                >
                                    <span className="text-[9px] font-mono text-slate-500 mr-1.5">[R{log.round}]</span>
                                    {log.text}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 광활한 전장 클릭 이동 미니맵 (우측 하단) */}
                <div
                    className="hidden sm:block absolute bottom-3 right-3 z-20 rounded-xl bg-slate-950/85 border border-slate-700/80 p-1.5 shadow-xl backdrop-blur-sm"
                    title="미니맵 클릭으로 카메라 즉시 이동"
                >
                    <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 mb-0.5 font-mono">
                        <span>{isLargeWar ? '대규모 전쟁 전선' : '보스 결전장'}</span>
                        <span>{Math.round(arenaW / PX_PER_METER)}m×{Math.round(arenaH / PX_PER_METER)}m</span>
                    </div>
                    <div
                        className="relative bg-emerald-950/60 border border-slate-700 rounded-md overflow-hidden cursor-pointer"
                        style={{ width: 144, height: Math.round((144 * arenaH) / arenaW) }}
                        onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const rx = (e.clientX - rect.left) / rect.width;
                            const ry = (e.clientY - rect.top) / rect.height;
                            setOverviewMode(false);
                            cameraTargetRef.current = {
                                x: Math.max(120, Math.min(arenaW - 120, rx * arenaW)),
                                y: Math.max(120, Math.min(arenaH - 120, ry * arenaH))
                            };
                        }}
                    >
                        {arena.obstacles.map(o => (
                            <div
                                key={o.id}
                                className={`absolute rounded-full ${
                                    o.kind === 'fort' || o.kind === 'altar'
                                        ? 'bg-amber-400/70'
                                        : o.blocksMovement
                                        ? 'bg-slate-400/60'
                                        : 'bg-emerald-500/40'
                                }`}
                                style={{
                                    left: `${(o.x / arenaW) * 100}%`,
                                    top: `${(o.y / arenaH) * 100}%`,
                                    width: 4,
                                    height: 4,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                        ))}
                        {units
                            .filter(u => u.hp > 0)
                            .map(u => (
                                <div
                                    key={u.id}
                                    className={`absolute rounded-full ${
                                        u.id === activeUnitId
                                            ? 'bg-yellow-300 ring-2 ring-yellow-200 z-10'
                                            : u.team === 'ally'
                                            ? 'bg-sky-400'
                                            : u.isBoss
                                            ? 'bg-rose-500 ring-1 ring-amber-300'
                                            : 'bg-red-400'
                                    }`}
                                    style={{
                                        left: `${(u.x / arenaW) * 100}%`,
                                        top: `${(u.y / arenaH) * 100}%`,
                                        width: u.isBoss || u.id === activeUnitId ? 7 : 5,
                                        height: u.isBoss || u.id === activeUnitId ? 7 : 5,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />
                            ))}
                    </div>
                </div>
            </div>

            {/* SRPG 숏컷 바 (CombatInterface.tsx와 100% 동일한 CombatQuickSlots + 키보드 단축키!) */}
            {activeUnit && activeUnit.team === 'ally' && !battleEnded && (
                <div className="shrink-0 z-20 bg-slate-950/95 border-t border-slate-800/90 px-2 py-1">
                    <CombatQuickSlots
                        currentUnit={activeAllyEntity}
                        player={character}
                        availableSkillList={activeUnit.skills}
                        shortcuts={activeShortcuts}
                        combatKeybinds={combatKeybinds}
                        isPlayerOrManualCompanionTurn={Boolean(isPlayerTurn && !isBusy)}
                        isPlayerUnit={Boolean(activeUnit.isPlayer)}
                        isAutoBattle={autoBattle}
                        isLoading={isBusy}
                        formatKeyDisplay={formatKeyDisplay}
                        onTriggerSlot={handleTriggerShortcutSlot}
                        onOpenKeybindModal={() => setShowKeybindModal(true)}
                    />
                </div>
            )}

            {/* 하단 BG3 액션 핫바 */}
            <div className="shrink-0 z-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                {/* 좌측: 활성 유닛 & BG3 행동 경제 리소스 */}
                {activeUnit ? (
                    <div className="flex items-center gap-2.5">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white">{activeUnit.name}</span>
                                <span className="text-[10px] text-slate-400">{activeUnit.jobLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5 flex-wrap">
                                <span className="text-emerald-400">HP {formatCompactKorean(activeUnit.hp)}/{formatCompactKorean(activeUnit.maxHp)}</span>
                                <span className="text-sky-400">MP {formatCompactKorean(activeUnit.mp)}/{formatCompactKorean(activeUnit.maxMp)}</span>
                                {(activeUnit.shieldHp || 0) > 0 && (
                                    <span className="text-cyan-300 font-bold bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-500/50">
                                        🛡️ 마나쉴드 +{formatCompactKorean(activeUnit.shieldHp)}
                                    </span>
                                )}
                            </div>
                            {/* 적용 중인 버프 & 상태이상: 모바일에서도 한 줄 요약 + 클릭 펼치기/접기로 깔끔하게! */}
                            {((activeUnit.activeBuffs || []).length > 0 || (activeUnit.activeStatuses || []).length > 0) && (
                                <div className="mt-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setBottomBuffsOpen(v => !v)}
                                            className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-950/85 hover:bg-amber-900/90 border border-amber-400/60 text-amber-200 transition-colors"
                                        >
                                            <span>✨ 버프 {(activeUnit.activeBuffs || []).length}</span>
                                            {(activeUnit.activeStatuses || []).length > 0 && (
                                                <span className="text-rose-300">· ⚠️{(activeUnit.activeStatuses || []).length}</span>
                                            )}
                                            <span className="text-[9px] text-amber-300/90">{bottomBuffsOpen ? '접기 ▲' : '보기 ▼'}</span>
                                        </button>
                                        {!bottomBuffsOpen && (activeUnit.activeBuffs || []).slice(0, 2).map(b => (
                                            <span
                                                key={b.name}
                                                className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-400/40 text-amber-200 truncate max-w-[140px]"
                                            >
                                                {b.name} ({b.turns}T)
                                            </span>
                                        ))}
                                    </div>
                                    {bottomBuffsOpen && (
                                        <div className="flex items-center gap-1 mt-1 flex-wrap max-h-24 overflow-y-auto pr-1">
                                            {(activeUnit.activeBuffs || []).map(b => (
                                                <span key={b.name} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/75 border border-amber-400/50 text-amber-200">
                                                    ✨ {b.name} · {b.turns}T
                                                </span>
                                            ))}
                                            {(activeUnit.activeStatuses || []).map(s => (
                                                <span key={s.name} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/75 border border-rose-400/50 text-rose-200">
                                                    ⚠️ {s.name} · {s.turns}T
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap shrink-0">
                            <span
                                className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300"
                                title={`AGI ${formatCompactKorean(activeUnit.agi)} 기반 1턴 이동 거리: 최대 ${activeUnit.moveMeters.toFixed(1)}m`}
                            >
                                🔵 {activeUnit.remainingMeters.toFixed(1)}m (AGI {formatCompactKorean(activeUnit.agi)})
                            </span>
                            <span
                                className={`px-1.5 py-0.5 rounded border ${
                                    activeUnit.hasAction
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 line-through'
                                }`}
                            >
                                🟢 주행동
                            </span>
                            <span
                                className={`px-1.5 py-0.5 rounded border ${
                                    activeUnit.hasBonusAction
                                        ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 line-through'
                                }`}
                            >
                                🟠 보조
                            </span>
                            <span
                                className={`px-1.5 py-0.5 rounded border ${
                                    activeUnit.hasReaction
                                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 line-through'
                                }`}
                            >
                                🟣 리액션
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-400">전투 진행 중...</div>
                )}

                {/* 중앙: BG3 핵심 전투 커맨드 (자유이동 · 전체 스킬창 · 밀치기 · 도약 · 방어 · 아이템) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy}
                        onClick={() => {
                            setActionMode('move');
                            setSelectedSkill(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            actionMode === 'move' ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                    >
                        <Footprints size={13} /> 자유이동 {activeUnit ? `(${activeUnit.remainingMeters.toFixed(1)}m)` : ''}
                    </button>

                    {/* CombatInterface와 동일한 전체 스킬창 열기! */}
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction}
                        onClick={() => setShowSkillBook(true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white flex items-center gap-1 disabled:opacity-40"
                    >
                        <BookOpen size={13} /> 스킬
                    </button>

                    {/* BG3 보조행동: 밀치기 / 도약 / 방어 / 아이템 */}
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasBonusAction}
                        onClick={() => setActionMode('shove')}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 disabled:opacity-40 ${
                            actionMode === 'shove' ? 'bg-orange-600 border-orange-300 text-white' : 'bg-slate-900 border-orange-500/50 text-orange-300'
                        }`}
                    >
                        <Flame size={12} /> 밀치기
                    </button>
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasBonusAction}
                        onClick={() => setActionMode('jump')}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 disabled:opacity-40 ${
                            actionMode === 'jump' ? 'bg-orange-600 border-orange-300 text-white' : 'bg-slate-900 border-orange-500/50 text-orange-300'
                        }`}
                    >
                        <Wind size={12} /> 도약
                    </button>
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction}
                        onClick={handleDefendStance}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 flex items-center gap-1 disabled:opacity-40"
                    >
                        <Shield size={12} /> 방어
                    </button>
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasBonusAction}
                        onClick={() => setShowItemModal(true)}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-amber-500/50 text-amber-300 hover:bg-amber-950/60 flex items-center gap-1 disabled:opacity-40"
                    >
                        🎒 아이템
                    </button>
                    {canFlee && onRetreat && (() => {
                        const inEscapeZone = Boolean(activeUnit && activeUnit.y >= arenaH - 142);
                        const aliveEnemiesForFlee = units.filter(u => u.team === 'enemy' && u.hp > 0);
                        const avgEnemyAgi =
                            aliveEnemiesForFlee.length > 0
                                ? aliveEnemiesForFlee.reduce((s, e) => s + (e.agi || 20), 0) / aliveEnemiesForFlee.length
                                : 20;
                        const fleeChance = Math.round(
                            Math.max(15, Math.min(90, 50 + ((activeUnit?.agi || 20) - avgEnemyAgi) * 0.5))
                        );
                        return (
                            <button
                                type="button"
                                disabled={!isPlayerTurn || isBusy || !inEscapeZone}
                                onClick={() => {
                                    if (!activeUnit || !inEscapeZone) return;
                                    const roll = Math.random() * 100;
                                    if (roll < fleeChance) {
                                        pushCombatLog(`🏃 ${activeUnit.name} 도주 성공! (성공률 ${fleeChance}%)`, 'heal', roundNum);
                                        onRetreat();
                                    } else {
                                        addFloatText(activeUnit.x, activeUnit.y - 30, `❌ 도주 실패! (${fleeChance}%)`, '#f43f5e', 1.15);
                                        const failMsg = `❌ ${activeUnit.name}이(가) 도주에 실패하여 주행동을 소모했습니다! (성공률 ${fleeChance}%)`;
                                        setBannerMsg(failMsg);
                                        pushCombatLog(failMsg, 'warn', roundNum);
                                        setUnits(prev =>
                                            prev.map(u => (u.id === activeUnit.id ? { ...u, hasAction: false, remainingMeters: 0 } : u))
                                        );
                                    }
                                }}
                                title={
                                    inEscapeZone
                                        ? `도망 구역에 도달했습니다! (AGI 기반 도주 성공률 ${fleeChance}%)`
                                        : '전장 하단의 초록색 [도망 구역] 안으로 이동하면 활성화됩니다.'
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black border flex items-center gap-1 transition-all ${
                                    inEscapeZone
                                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white shadow-lg shadow-emerald-900/50 animate-pulse'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                                }`}
                            >
                                🏃 도망 {inEscapeZone ? `(${fleeChance}%)` : ''}
                            </button>
                        );
                    })()}
                </div>

                {/* 우측: 턴 종료 */}
                <button
                    type="button"
                    disabled={!isPlayerTurn || isBusy}
                    onClick={advanceTurn}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white border border-amber-400/60 flex items-center gap-1.5 disabled:opacity-40"
                >
                    <RotateCcw size={13} /> 턴 종료
                </button>
            </div>

            {/* 전체 스킬창 모달 (CombatInterface.tsx의 SkillSelector 100% 연동) */}
            {showSkillBook && activeUnit && (
                <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3">
                    <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-indigo-500/60 bg-slate-950 shadow-2xl">
                        <SkillSelector
                            skills={activeUnit.skills}
                            currentTier={character.classTier || ClassTier.FIRST}
                            player={character}
                            onSelect={(skill: Skill) => {
                                setSelectedSkill(skill);
                                setActionMode('skill');
                                setShowSkillBook(false);
                                setBannerMsg(`✨ [${skill.name}] 선택됨! 전장의 적이나 위치를 클릭해 시전하세요.`);
                            }}
                            onClose={() => setShowSkillBook(false)}
                        />
                    </div>
                </div>
            )}

            {/* 실제 인벤토리 소모품 사용 모달 (ItemSelectionModal 연동) */}
            {showItemModal && (
                <div className="fixed inset-0 z-[325] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3">
                    <ItemSelectionModal
                        items={(character.inventory || []).filter(it => it && (it.type === 'Consumable' || /포션|물약|영약|해독|부활|회복|포획|그물/.test(it.name || '')))}
                        onSelect={(item: any, quantity: number = 1) => {
                            const txt = `${item?.name || ''} ${item?.description || ''} ${item?.effect || ''}`.toLowerCase();
                            const isEnemyTarget = /포획|그물|폭탄|독병|수류탄|투척/.test(txt);
                            const isRevive = /부활|소생|불사/.test(txt);
                            const rangeMeters = isEnemyTarget ? 8.5 : 6.5;
                            setShowItemModal(false);
                            setPendingItemUse({ item, quantity, rangeMeters, isEnemyTarget, isRevive });
                            setActionMode('item');
                            setSelectedSkill(null);
                            setBannerMsg(
                                isEnemyTarget
                                    ? `🎒 [${item.name}] 사거리 ${rangeMeters}m 내의 적군을 클릭하세요!`
                                    : isRevive
                                        ? `🎒 [${item.name}] 사거리 ${rangeMeters}m 내의 전투불능 동료 무덤을 클릭하세요!`
                                        : `🎒 [${item.name}] 사거리 ${rangeMeters}m 내의 아군(또는 본인)을 클릭하세요!`
                            );
                        }}
                        onClose={() => setShowItemModal(false)}
                        partyMembers={units.filter(u => u.team === 'ally').map(u => ({ name: u.name, hp: u.hp, maxHp: u.maxHp }))}
                        enemies={units.filter(u => u.team === 'enemy' && u.hp > 0).map(u => ({ name: u.name, hp: u.hp, maxHp: u.maxHp }))}
                    />
                </div>
            )}

            {/* 단축키 설정 모달 */}
            <CombatShortcutKeybindModal
                isOpen={showKeybindModal}
                onClose={() => setShowKeybindModal(false)}
                currentKeybinds={combatKeybinds}
                onSaveKeybinds={next => setCombatKeybinds(next)}
                unitName={activeUnit?.name || character.name}
                shortcuts={activeShortcuts}
            />

        </div>
    );
};

export default Bg3ArenaCanvas;
