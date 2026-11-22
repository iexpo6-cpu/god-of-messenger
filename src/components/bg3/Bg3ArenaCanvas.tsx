import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, ClassTier, Companion, Enemy, JobType, Skill, SkillType } from '../../types';
import {
    ARENA_H,
    ARENA_W,
    Bg3BossTelegraph,
    Bg3Obstacle,
    Bg3SkillTargeting,
    Bg3SurfacePool,
    Bg3Unit,
    buildBg3AllyUnits,
    buildBg3EnemyUnits,
    buildBg3Initiative,
    calculateBg3Damage,
    createBg3SurfaceFromSkill,
    distPx,
    findOpportunityAttackers,
    generateBg3Arena,
    getBg3SharedAllyGroup,
    getBg3SkillTargeting,
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
import { formatCompactKorean } from '../../utils';
import { MESSENGER_VIDEOS, MESSENGER_VIDEO_DURATIONS, BOSS_ENTRANCE_VIDEOS } from '../../messengerVideoData';
import { CombatVFXOverlay, combatVfxBus, preloadSkillFrameAnimations } from '../CombatVFX';
import { SkillSelector } from '../combat/SkillSelector';
import { CombatQuickSlots } from '../combat/CombatQuickSlots';
import { CombatShortcutKeybindModal } from '../CombatShortcutKeybindModal';
import { loadCombatKeybinds, formatKeyDisplay, useCombatKeybindHandler } from '../../services/combatKeybindService';
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
    companionFinalHps: Record<string, number>;
    defeatedEnemyCount: number;
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
    onComplete: (result: Bg3BattleResult) => void;
    onRetreat?: () => void;
}

type ActionMode = 'move' | 'attack' | 'skill' | 'shove' | 'jump';

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

export const Bg3ArenaCanvas: React.FC<Bg3ArenaCanvasProps> = ({
    character,
    companions,
    enemies,
    title = '전술 결전 아레나 (BG3)',
    subtitle = '무격자 자유 이동 · 발더스 게이트 3 액티브 전술 전투',
    region,
    nation,
    city,
    isLargeWar = false,
    onComplete,
    onRetreat
}) => {
    const resolvedCompanions = useMemo(() => {
        if (companions && companions.length > 0) return companions;
        return (character.companions || []).filter(c => c && (c.stats?.hp ?? 1) > 0).slice(0, 6);
    }, [companions, character.companions]);

    const arena = useMemo(
        () =>
            generateBg3Arena({
                region: region || character.currentLocation?.region,
                nation: nation || character.currentLocation?.nation,
                city: city || character.currentLocation?.city,
                title,
                subtitle,
                isLargeWar
            }),
        [region, nation, city, character.currentLocation, title, subtitle, isLargeWar]
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
            arenaH
        );
        const foes = buildBg3EnemyUnits(
            enemies,
            region || character.currentLocation?.region,
            nation || character.currentLocation?.nation,
            arenaW,
            arenaH
        );
        return [...allies, ...foes];
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
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const isBusyRef = useRef<boolean>(false);
    isBusyRef.current = isBusy;
    const setBusySafe = useCallback((v: boolean) => {
        isBusyRef.current = v;
        setIsBusy(v);
    }, []);
    const aiTurnLockRef = useRef<string>('');
    const mountedRef = useRef<boolean>(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const [autoBattle, setAutoBattle] = useState<boolean>(false);
    const [fastMode, setFastMode] = useState<boolean>(false);
    const [bannerMsg, setBannerMsg] = useState<string>('무격자 자유 전술 아레나 개시! 바닥을 클릭해 자유롭게 이동하거나 스킬을 선택하세요.');
    const [battleEnded, setBattleEnded] = useState<'victory' | 'defeat' | null>(null);
    const [reactionPrompt, setReactionPrompt] = useState<ReactionPrompt | null>(null);
    const [zoom, setZoom] = useState<number>(isLargeWar ? 1.55 : 1.25);
    const [overviewMode, setOverviewMode] = useState<boolean>(false);
    const [activeVideo, setActiveVideo] = useState<{ url: string; duration: number } | null>(null);
    const [combatKeybinds, setCombatKeybinds] = useState<string[]>(() => loadCombatKeybinds());
    const [showKeybindModal, setShowKeybindModal] = useState<boolean>(false);
    const cameraRef = useRef<{ x: number; y: number }>({ x: arenaW * 0.5, y: arenaH - 280 });
    const cameraTargetRef = useRef<{ x: number; y: number }>({ x: arenaW * 0.5, y: arenaH - 280 });
    const panDragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });

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
        unitsRef.current.forEach(u => {
            if (u.enemyTokenPart) urls.add(getPropAssetUrl('srpg', u.enemyTokenPart));
            if (u.team === 'enemy' && u.visualUrl) {
                loadTransparentMonsterSprite(u.visualUrl).then(() => alive && setAssetTick(t => t + 1));
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
            explosionsRef.current.push({
                id: `kill_${Date.now()}_${Math.random()}`,
                x: target.x,
                y: target.y,
                maxRadius: 96,
                color: '#f43f5e',
                startTime: performance.now(),
                duration: 540
            });
            spawnParticles(target.x, target.y, '#fbbf24', 28, 4.8);
            spawnParticles(target.x, target.y, '#f43f5e', 24, 3.8);
            addFloatText(target.x, target.y - 34, `💀 ${target.name} 처치!`, '#fde047', 1.35);
            triggerShake(13, 340);
        },
        [addFloatText, spawnParticles, triggerShake]
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

                // 피격 대상(또는 AoE 중심)의 정확한 캔버스 화면 좌표(px) 계산 -> 적이 있는 위치에서 이펙트 폭발!
                const impactWorldX = targets.length === 1 ? targets[0].x : centerX;
                const impactWorldY = targets.length === 1 ? targets[0].y : centerY;
                const { scale, offsetX, offsetY } = getTransform();
                const targetScreenPos = {
                    x: Math.max(48, Math.min(viewportSize.w - 48, offsetX + impactWorldX * scale)),
                    y: Math.max(48, Math.min(viewportSize.h - 48, offsetY + impactWorldY * scale))
                };

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
                    targetScreenPos
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
            if (aliveEnemies.length === 0) {
                setBattleEnded('victory');
                setBannerMsg('🏆 모든 적을 격파하고 전장을 완전히 제압했습니다!');
                const playerUnit = nextUnits.find(u => u.isPlayer);
                const compHps: Record<string, number> = {};
                nextUnits.forEach(u => {
                    if (u.sourceCompanionId) compHps[u.sourceCompanionId] = Math.max(0, u.hp);
                });
                window.setTimeout(() => {
                    onComplete({
                        isVictory: true,
                        turns: curRound,
                        playerFinalHp: Math.max(1, playerUnit?.hp || 1),
                        companionFinalHps: compHps,
                        defeatedEnemyCount: nextUnits.filter(u => u.team === 'enemy' && u.hp <= 0).length
                    });
                }, 900);
                return true;
            }
            if (aliveAllies.length === 0) {
                setBattleEnded('defeat');
                setBannerMsg('💀 아군 부대가 전멸했습니다...');
                window.setTimeout(() => {
                    onComplete({
                        isVictory: false,
                        turns: curRound,
                        playerFinalHp: 1,
                        companionFinalHps: {},
                        defeatedEnemyCount: nextUnits.filter(u => u.team === 'enemy' && u.hp <= 0).length
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
            if (mpCost > caster.mp) {
                if (!fromAi) setBannerMsg(`MP가 부족합니다! (필요 MP ${mpCost})`);
                return;
            }

            // Support skill (Heal / Buff)
            if (targeting.isSupport && skill) {
                setBusySafe(true);
                const allies = unitsRef.current.filter(u => u.team === caster.team && u.hp > 0);
                const affected =
                    targeting.shape !== 'single'
                        ? allies.filter(a => distPx(a.x, a.y, targetX, targetY) <= metersToPx(Math.max(4.5, targeting.aoeRadiusMeters)))
                        : [explicitTarget && explicitTarget.team === caster.team ? explicitTarget : caster];
                const finalTargets = affected.length > 0 ? affected : [caster];

                await emitDualLayerVfx(caster, finalTargets, targetX, targetY, skill, targeting);

                const isHeal = skill.type === SkillType.HEAL;
                setUnits(prev =>
                    prev.map(u => {
                        let next = u;
                        if (u.id === caster.id) {
                            next = { ...next, mp: Math.max(0, next.mp - mpCost), hasAction: false };
                        }
                        if (finalTargets.some(t => t.id === u.id)) {
                            if (isHeal) {
                                const healAmt = Math.max(120, Math.round(next.maxHp * 0.34));
                                addFloatText(next.x, next.y - 26, `+${formatCompactKorean(healAmt)} HP`, '#4ade80', 1.15);
                                next = { ...next, hp: Math.min(next.maxHp, next.hp + healAmt) };
                            } else {
                                const newBuff = { name: skill.name, atkMult: 1.25, turns: 3, color: targeting.vfxColor };
                                addFloatText(next.x, next.y - 26, `✨ ${skill.name} (+25%)`, '#fde047', 1.1);
                                next = {
                                    ...next,
                                    buffAtkMult: Math.min(2.0, +(next.buffAtkMult * 1.25).toFixed(2)),
                                    activeBuffs: [...next.activeBuffs.filter(b => b.name !== skill.name), newBuff]
                                };
                            }
                        }
                        return next;
                    })
                );

                const surf = createBg3SurfaceFromSkill(targetX, targetY, targeting.shinryokuType);
                if (surf) setSurfaces(prev => [...prev.slice(-10), surf]);

                setBannerMsg(`✨ ${caster.name}의 [${skill.name}] 발동! (${finalTargets.length}명 적용)`);
                setActionMode('move');
                setSelectedSkill(null);
                if (!fromAi) setBusySafe(false);
                return;
            }

            // Offensive targeting
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
                targets = enemiesAlive.filter(e => distPx(e.x, e.y, targetX, targetY) <= rPx + e.radius);
                if (targets.length === 0) {
                    setBannerMsg('범위 안에 적이 없습니다.');
                    return;
                }
            } else {
                // 60-degree cone
                const aimAng = Math.atan2(targetY - caster.y, targetX - caster.x);
                const maxPx = metersToPx(targeting.rangeMeters);
                targets = enemiesAlive.filter(e => {
                    const d = distPx(caster.x, caster.y, e.x, e.y);
                    if (d > maxPx + e.radius) return false;
                    let diff = Math.atan2(e.y - caster.y, e.x - caster.x) - aimAng;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    return Math.abs(diff) <= Math.PI / 6 + 0.15;
                });
                if (targets.length === 0) {
                    setBannerMsg('부채꼴 범위 안에 적이 없습니다.');
                    return;
                }
            }

            setBusySafe(true);
            const aimX = targets.length === 1 ? targets[0].x : targetX;
            const aimY = targets.length === 1 ? targets[0].y : targetY;
            const faceDir = calcDir(aimX - caster.x, aimY - caster.y);

            await emitDualLayerVfx(caster, targets, aimX, aimY, skill, targeting);

            let updatedUnits = unitsRef.current.map(u =>
                u.id === caster.id ? { ...u, dir: faceDir, mp: Math.max(0, u.mp - mpCost), hasAction: false } : u
            );
            let totalDmg = 0;
            let kills = 0;
            let comboBanner = '';

            for (const target of targets) {
                const res = calculateBg3Damage(caster, target, skill, arena.obstacles, surfacesRef.current, character);
                let finalDmg = res.damage;

                // BG3 Reaction: Ally Parry + Counter when enemy attacks!
                if (target.team === 'ally' && target.hasReaction && !res.isMiss) {
                    const parry = await askReactionParry(target, caster, finalDmg);
                    setReactionPrompt(null);
                    if (parry) {
                        finalDmg = Math.max(1, Math.round(finalDmg * 0.45));
                        const counterDmg = Math.max(40, Math.round(target.atk * 0.9));
                        addFloatText(target.x, target.y - 34, '🟣 신력 패링! (-55%)', '#c084fc', 1.15);
                        addFloatText(caster.x, caster.y - 30, `⚡ 반격 -${formatCompactKorean(counterDmg)}`, '#38bdf8', 1.15);
                        slashArcsRef.current.push({
                            id: `ctr_${Date.now()}`,
                            x: caster.x,
                            y: caster.y,
                            angle: Math.atan2(caster.y - target.y, caster.x - target.x),
                            color: '#c084fc',
                            startTime: performance.now(),
                            duration: 300,
                            scale: 1.2
                        });
                        updatedUnits = updatedUnits.map(u => {
                            if (u.id === target.id) return { ...u, hasReaction: false };
                            if (u.id === caster.id) return { ...u, hp: Math.max(0, u.hp - counterDmg) };
                            return u;
                        });
                    }
                }

                if (res.isMiss) {
                    addFloatText(target.x, target.y - 24, 'MISS', '#94a3b8', 1.0);
                    continue;
                }

                totalDmg += finalDmg;
                if (res.comboName) {
                    comboBanner = res.comboName;
                    addFloatText(target.x, target.y - 48, res.comboName, '#38bdf8', 1.2);
                }
                addFloatText(
                    target.x,
                    target.y - 22,
                    `${res.isCrit ? 'CRIT! ' : ''}-${formatCompactKorean(finalDmg)}`,
                    res.isCrit ? '#fde047' : '#fb7185',
                    res.isCrit ? 1.3 : 1.05
                );

                const beforeHp = updatedUnits.find(u => u.id === target.id)?.hp || 0;
                const afterHp = Math.max(0, beforeHp - finalDmg);
                if (beforeHp > 0 && afterHp <= 0) {
                    kills += 1;
                    spawnKillBurst(target);
                }

                updatedUnits = updatedUnits.map(u =>
                    u.id === target.id
                        ? { ...u, hp: afterHp, stunnedTurns: res.stunsTarget ? Math.max(u.stunnedTurns, 1) : u.stunnedTurns }
                        : u
                );
            }

            // Create elemental surface pool
            const newPool = createBg3SurfaceFromSkill(aimX, aimY, targeting.shinryokuType);
            if (newPool) {
                setSurfaces(prev => [...prev.slice(-10), newPool]);
            }

            setUnits(updatedUnits);
            setBannerMsg(
                `${caster.name}의 [${skill?.name || '기본 공격'}]! 총 ${formatCompactKorean(totalDmg)} 피해${
                    kills > 0 ? ` (💀 ${kills}명 처치!)` : ''
                }${comboBanner ? ` · ${comboBanner}` : ''}`
            );
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

            // Tick buffs, surfaces, and reset action economy
            setSurfaces(prev => prev.map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0));
            setUnits(prev =>
                prev.map(u => {
                    if (u.hp <= 0) return u;
                    // Heal on ally_camp / fort / altar / holy surface
                    let heal = 0;
                    arena.obstacles.forEach(o => {
                        if (o.healPct && distPx(u.x, u.y, o.x, o.y) <= o.radius + 26) {
                            heal = Math.max(heal, Math.round((u.maxHp * o.healPct) / 100));
                        }
                    });
                    const onFire = surfacesRef.current.find(s => s.type === 'fire' && distPx(u.x, u.y, s.x, s.y) <= s.radius);
                    let burn = onFire ? Math.max(40, Math.round(u.maxHp * 0.06)) : 0;
                    if (heal > 0) addFloatText(u.x, u.y - 24, `+${formatCompactKorean(heal)} HP`, '#4ade80', 0.95);
                    if (burn > 0) addFloatText(u.x, u.y - 24, `🔥 -${formatCompactKorean(burn)}`, '#f97316', 0.95);

                    const nextBuffs = u.activeBuffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0);
                    const nextMult = nextBuffs.reduce((acc, b) => acc * (b.atkMult || 1), 1);

                    return {
                        ...u,
                        hp: Math.max(1, Math.min(u.maxHp, u.hp + heal - burn)),
                        remainingMeters: u.moveMeters,
                        hasAction: u.stunnedTurns <= 0,
                        hasBonusAction: u.stunnedTurns <= 0,
                        hasReaction: true,
                        stunnedTurns: Math.max(0, u.stunnedTurns - 1),
                        activeBuffs: nextBuffs,
                        buffAtkMult: +nextMult.toFixed(2)
                    };
                })
            );
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
                                skillName: '파멸의 신격 강타',
                                x: refreshedTarget.x,
                                y: refreshedTarget.y,
                                radiusPx: metersToPx(3.6),
                                damageMultiplier: 1.45
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

    // Canvas Click Handler (Gridless Move / Attack / Skill / Shove / Jump)
    const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isPlayerTurn || isBusy || !activeUnit || battleEnded) return;
        const pt = screenToWorld(e.clientX, e.clientY);
        if (!pt) return;

        // Clicking another ally in the shared initiative group switches active unit!
        const clickedAlly = units.find(
            u => u.team === 'ally' && u.hp > 0 && u.id !== activeUnit.id && distPx(pt.x, pt.y, u.x, u.y) <= u.radius + 10
        );
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
            await executeCombatAction(activeUnit, pt.x, pt.y, useSkill, clickedEnemy || clickedAlly);
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

            // 1. Organic Elemental Surface Pools
            surfacesRef.current.forEach(pool => {
                const st = SURFACE_COLORS[pool.type] || SURFACE_COLORS.water;
                const pulse = 1 + Math.sin(now * 0.004 + pool.x) * 0.04;
                const r = pool.radius * pulse;
                const rg = ctx.createRadialGradient(pool.x, pool.y, r * 0.15, pool.x, pool.y, r);
                rg.addColorStop(0, st.edge);
                rg.addColorStop(0.65, st.fill);
                rg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.ellipse(pool.x, pool.y, r * 1.12, r * 0.88, 0, 0, Math.PI * 2);
                ctx.fill();
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
                // Remaining movement circle (soft cyan)
                if (actionMode === 'move' && curActive.remainingMeters > 0.2) {
                    const mrPx = metersToPx(curActive.remainingMeters);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 6]);
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, mrPx, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
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

                // Skill / Attack Range Circle
                if (currentTargeting) {
                    ctx.save();
                    ctx.strokeStyle = currentTargeting.vfxColor;
                    ctx.globalAlpha = 0.55;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([7, 5]);
                    ctx.beginPath();
                    ctx.arc(curActive.x, curActive.y, metersToPx(currentTargeting.rangeMeters), 0, Math.PI * 2);
                    ctx.stroke();
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
                    if (currentTargeting.shape === 'circle') {
                        const rPx = metersToPx(currentTargeting.aoeRadiusMeters);
                        ctx.save();
                        ctx.fillStyle = `${currentTargeting.vfxColor}33`;
                        ctx.strokeStyle = currentTargeting.vfxColor;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.arc(hover.x, hover.y, rPx, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    } else if (currentTargeting.shape === 'cone') {
                        const ang = Math.atan2(hover.y - curActive.y, hover.x - curActive.x);
                        const rPx = metersToPx(currentTargeting.rangeMeters);
                        ctx.save();
                        ctx.fillStyle = `${currentTargeting.vfxColor}33`;
                        ctx.strokeStyle = currentTargeting.vfxColor;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(curActive.x, curActive.y);
                        ctx.arc(curActive.x, curActive.y, rPx, ang - Math.PI / 6, ang + Math.PI / 6);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            // 6. Units (Sorted by Y for 2.5D depth)
            const sortedUnits = [...unitsRef.current].filter(u => u.hp > 0).sort((a, b) => a.y - b.y);
            sortedUnits.forEach(u => {
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
                    const realMonster = getCachedMonsterSprite(u.visualUrl);
                    const sz = u.isBoss ? 112 : 76;
                    if (realMonster) {
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
                }
                ctx.restore();

                // Name + HP Bar + Compact Korean HP Text (만/억/조)
                const barW = u.isBoss ? 96 : 66;
                const barY = drawY - (u.isBoss ? 92 : 62);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                ctx.fillRect(ux - barW / 2, barY, barW, 8);
                const hpPct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
                ctx.fillStyle = u.team === 'ally' ? '#22c55e' : u.isBoss ? '#f43f5e' : '#ef4444';
                ctx.fillRect(ux - barW / 2, barY, barW * hpPct, 8);

                // Compact HP readout
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#020617';
                ctx.fillText(formatCompactKorean(u.hp), ux + 1, barY + 18);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(formatCompactKorean(u.hp), ux, barY + 17);

                ctx.font = u.isBoss ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#020617';
                ctx.fillText(u.name, ux + 1, barY - 4);
                ctx.fillStyle = u.team === 'ally' ? '#e0f2fe' : u.isBoss ? '#fde047' : '#fecdd3';
                ctx.fillText(u.name, ux, barY - 5);

                // Hover Damage & Hit Chance Preview over Enemy! (만/억/조 단위)
                if (hover && curActive && curActive.team === 'ally' && u.team === 'enemy' && distPx(hover.x, hover.y, u.x, u.y) <= u.radius + 30) {
                    const prev = calculateBg3Damage(curActive, u, actionMode === 'skill' ? selectedSkill : null, arena.obstacles, surfacesRef.current, character);
                    const tip = `🎯 ${prev.hitChance}% · 예상 ${formatCompactKorean(prev.damage)}${prev.comboName ? ' ⚡콤보!' : ''}`;
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
    }, [viewportSize, getTransform, arena, activeUnitId, actionMode, currentTargeting, selectedSkill, sharedAllyGroup, isBusy, battleEnded, character]);

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
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                            R{roundNum} · BG3 무격자 전술전
                        </span>
                        <h3 className="text-sm font-black text-white truncate">{title}</h3>
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
                                <div className="flex items-center gap-1">
                                    <span className={`text-[11px] font-bold truncate max-w-[64px] ${u.team === 'ally' ? 'text-sky-200' : 'text-rose-200'}`}>
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
                            </button>
                        );
                    })}
                </div>

                {/* 우측 컨트롤 */}
                <div className="flex items-center gap-1.5 shrink-0">
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
                        onClick={() => setAutoBattle(v => !v)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            autoBattle ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                    >
                        <Bot size={13} /> 자동
                    </button>
                    {onRetreat && (
                        <button
                            type="button"
                            onClick={onRetreat}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-300"
                            title="전장 후퇴"
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
                        hoverWorldRef.current = screenToWorld(e.clientX, e.clientY);
                    }}
                    onMouseLeave={() => {
                        panDragRef.current.dragging = false;
                        hoverWorldRef.current = null;
                    }}
                    onClick={handleCanvasClick}
                    onWheel={e => {
                        setOverviewMode(false);
                        setZoom(z => Math.max(0.6, Math.min(2.2, +(z + (e.deltaY < 0 ? 0.12 : -0.12)).toFixed(2))));
                    }}
                    className="block w-full h-full cursor-crosshair"
                />

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
                            <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                                <span className="text-emerald-400">HP {formatCompactKorean(activeUnit.hp)}/{formatCompactKorean(activeUnit.maxHp)}</span>
                                <span className="text-sky-400">MP {formatCompactKorean(activeUnit.mp)}/{formatCompactKorean(activeUnit.maxMp)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
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

                {/* 중앙: BG3 전투 커맨드 & 스킬 핫바 */}
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
                        <Footprints size={13} /> 자유이동
                    </button>
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction}
                        onClick={() => {
                            setActionMode('attack');
                            setSelectedSkill(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 disabled:opacity-40 ${
                            actionMode === 'attack' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                    >
                        <Sword size={13} /> 기본공격
                    </button>

                    {/* 빠른 스킬 4종 */}
                    {activePlayerSkills.map(sk => (
                        <button
                            key={sk.id}
                            type="button"
                            disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction || (sk.mpCost || 0) > (activeUnit?.mp || 0)}
                            onClick={() => {
                                setSelectedSkill(sk);
                                setActionMode('skill');
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 disabled:opacity-40 max-w-[116px] truncate ${
                                actionMode === 'skill' && selectedSkill?.id === sk.id
                                    ? 'bg-amber-600 border-amber-300 text-white'
                                    : 'bg-slate-900 border-amber-500/40 text-amber-200 hover:bg-amber-950/50'
                            }`}
                            title={`${sk.name} (MP ${sk.mpCost || 0})`}
                        >
                            <Sparkles size={12} className="shrink-0" />
                            <span className="truncate">{sk.name}</span>
                        </button>
                    ))}

                    {/* CombatInterface와 동일한 전체 스킬창 열기! */}
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction}
                        onClick={() => setShowSkillBook(true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white flex items-center gap-1 disabled:opacity-40"
                    >
                        <BookOpen size={13} /> 전체 스킬창
                    </button>

                    {/* BG3 보조행동: 밀치기 / 도약 / 물약 */}
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
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasBonusAction}
                        onClick={handleBonusPotion}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60 flex items-center gap-1 disabled:opacity-40"
                    >
                        <Heart size={12} /> 고양
                    </button>
                    <button
                        type="button"
                        disabled={!isPlayerTurn || isBusy || !activeUnit?.hasAction}
                        onClick={handleDash}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-sky-500/50 text-sky-300 hover:bg-sky-950/60 flex items-center gap-1 disabled:opacity-40"
                    >
                        <Zap size={12} /> 질주
                    </button>
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

            {/* 단축키 설정 모달 */}
            <CombatShortcutKeybindModal
                isOpen={showKeybindModal}
                onClose={() => setShowKeybindModal(false)}
                currentKeybinds={combatKeybinds}
                onSaveKeybinds={next => setCombatKeybinds(next)}
                unitName={activeUnit?.name || character.name}
                shortcuts={activeShortcuts}
            />

            {/* BG3 리액션: 신력 패링 + 반격 인터랙티브 팝업 */}
            {reactionPrompt && (
                <div className="fixed inset-0 z-[330] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl border-2 border-purple-400 bg-slate-950 p-5 shadow-2xl shadow-purple-900/40 space-y-4">
                        <div className="flex items-center gap-2 text-purple-300 font-black text-base">
                            <Shield size={20} className="text-purple-400" />
                            🟣 BG3 리액션 발동 기회!
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                            <strong className="text-rose-300">{reactionPrompt.attacker.name}</strong>이(가){' '}
                            <strong className="text-sky-300">{reactionPrompt.defender.name}</strong>에게{' '}
                            <span className="text-rose-400 font-bold">{formatCompactKorean(reactionPrompt.incomingDamage)}</span> 피해를 가하려 합니다!
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => reactionPrompt.resolve(true)}
                                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs border border-purple-300"
                            >
                                ⚡ 신력 패링(-55%) + 반격!
                            </button>
                            <button
                                type="button"
                                onClick={() => reactionPrompt.resolve(false)}
                                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-600"
                            >
                                리액션 아끼기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bg3ArenaCanvas;
