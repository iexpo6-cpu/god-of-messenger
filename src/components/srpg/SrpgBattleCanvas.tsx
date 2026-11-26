import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, ClassTier, Companion, Enemy, Skill, SkillType } from '../../types';
import {
    applySkillSurfaceAndCombo,
    buildAllySrpgUnits,
    buildEnemySrpgUnits,
    buildInitiativeOrder,
    calculateSrpgForecast,
    computeAttackableFrom,
    computeBossTelegraph,
    computeJumpTiles,
    computeMovableTiles,
    generateSrpgBattlefield,
    getSharedAllyGroupIds,
    reconstructPath,
    resolveShoveAction,
    resolveSrpgClash,
    resolveSrpgSupportSkill,
    SRPG_TERRAIN_META,
    SrpgClashStep,
    SrpgCombatForecast,
    SrpgSurfaceCell,
    SrpgTelegraphZone,
    SrpgUnit
} from '../../services/srpgBattleEngine';
import {
    getCachedCityAssetImage,
    getCultureAssetUrl,
    getPropAssetUrl,
    getSpecialBuildingUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    TerrainTilePart
} from '../../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage
} from '../../services/rpgSpriteManifest';
import { getCityBackgroundImage } from '../../services/cityBackgroundManifest';
import { SkillSelector } from '../combat/SkillSelector';
import {
    BookOpen,
    Bot,
    Crown,
    FastForward,
    Flame,
    Footprints,
    Heart,
    RefreshCw,
    Shield,
    Sparkles,
    Sword,
    Wind,
    X,
    Zap
} from 'lucide-react';

export interface SrpgBattleResult {
    isVictory: boolean;
    turns: number;
    playerFinalHp: number;
    companionFinalHps: Record<string, number>;
    defeatedEnemyCount: number;
}

export interface SrpgBattleCanvasProps {
    character: Character;
    companions?: Companion[];
    enemies: Enemy[];
    title: string;
    subtitle?: string;
    region?: string;
    nation?: string;
    city?: string;
    cols?: number;
    rows?: number;
    onComplete: (result: SrpgBattleResult) => void;
    onRetreat?: () => void;
}

type TacticalActionMode = 'default' | 'shove' | 'jump';

interface ActiveClashState {
    attacker: SrpgUnit;
    defender: SrpgUnit;
    steps: SrpgClashStep[];
    currentStepIdx: number;
    onFinish: () => void;
}

interface PendingReactionState {
    attacker: SrpgUnit;
    defender: SrpgUnit;
    rawDamage: number;
    onParry: () => void;
    onTakeHit: () => void;
}

interface VfxParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
}

interface VfxRing {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    life: number;
    maxLife: number;
}

interface FloatingText {
    x: number;
    y: number;
    vy: number;
    text: string;
    color: string;
    scale: number;
    life: number;
    maxLife: number;
}

const TILE_PX = 48;

const SRPG_PRELOAD_PARTS = [
    'forest', 'fort', 'altar', 'barricade', 'ally_camp', 'enemy_throne',
    'enemy_knight', 'enemy_archer', 'enemy_mage', 'enemy_angel', 'enemy_demon', 'enemy_boss',
    'turret', 'rift_portal', 'magma_vent', 'ice_pillar', 'holy_pillar', 'chest'
];

const SrpgBattleCanvas: React.FC<SrpgBattleCanvasProps> = ({
    character,
    companions,
    enemies,
    title,
    subtitle,
    region,
    nation,
    city,
    cols = 14,
    rows = 10,
    onComplete,
    onRetreat
}) => {
    const locRegion = region || character.currentLocation?.region || '아시아';
    const locNation = nation || character.currentLocation?.nation || '대한민국';
    const locCity = city || character.currentLocation?.city || '서울';

    const battlefield = useMemo(
        () =>
            generateSrpgBattlefield({
                cols,
                rows,
                region: locRegion,
                nation: locNation,
                city: locCity,
                title,
                subtitle: subtitle || `${locNation} · ${locCity}`
            }),
        [cols, rows, locRegion, locNation, locCity, title, subtitle]
    );

    const activeCompanions = useMemo(() => {
        if (companions) return companions.filter(c => !c.isDead).slice(0, 6);
        return (character.companions || []).filter(c => !c.isDead).slice(0, 4);
    }, [companions, character.companions]);

    const initialUnits = useMemo(
        () => [
            ...buildAllySrpgUnits(character, activeCompanions, rows, cols, locRegion, locNation),
            ...buildEnemySrpgUnits(enemies, rows, cols, locRegion, locNation)
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [units, setUnits] = useState<SrpgUnit[]>(initialUnits);
    const [initiativeOrder, setInitiativeOrder] = useState<string[]>(() => buildInitiativeOrder(initialUnits));
    const [initiativeIdx, setInitiativeIdx] = useState<number>(0);
    const [roundCount, setRoundCount] = useState<number>(1);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(() => {
        const ord = buildInitiativeOrder(initialUnits);
        const first = initialUnits.find(u => u.id === ord[0]);
        return first?.team === 'ally' ? first.id : null;
    });

    const [actionMode, setActionMode] = useState<TacticalActionMode>('default');
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [forecastTargetId, setForecastTargetId] = useState<string | null>(null);
    const [hoverTile, setHoverTile] = useState<{ row: number; col: number } | null>(null);
    const [surfaces, setSurfaces] = useState<Record<string, SrpgSurfaceCell>>({});
    const [telegraph, setTelegraph] = useState<SrpgTelegraphZone | null>(null);
    const [clash, setClash] = useState<ActiveClashState | null>(null);
    const [pendingReaction, setPendingReaction] = useState<PendingReactionState | null>(null);
    const [autoBattle, setAutoBattle] = useState(false);
    const [fastMode, setFastMode] = useState(false);
    const [bannerText, setBannerText] = useState<string>('⚔️ 라운드 1 개시! (AGI+WIS 이니셔티브 순으로 행동합니다)');
    const [isEnded, setIsEnded] = useState(false);
    const [, setAssetTick] = useState(0);

    // 풀뷰포트 반응형 카메라 상태
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ width: 1024, height: 560 });
    const cameraRef = useRef({ zoom: 1.0, offsetX: 0, offsetY: 0, userZoom: 1.0 });

    // 실시간 VFX refs (파티클, 충격파 링, 플로팅 텍스트, 화면 흔들림)
    const vfxParticlesRef = useRef<VfxParticle[]>([]);
    const vfxRingsRef = useRef<VfxRing[]>([]);
    const floatingTextsRef = useRef<FloatingText[]>([]);
    const screenShakeRef = useRef<number>(0);

    const unitsRef = useRef(units);
    unitsRef.current = units;
    const surfacesRef = useRef(surfaces);
    surfacesRef.current = surfaces;

    // VFX 스폰 헬퍼
    const spawnBurstVfx = useCallback((row: number, col: number, color: string, count = 20, maxRadius = 46, shake = 6) => {
        const cx = col * TILE_PX + TILE_PX / 2;
        const cy = row * TILE_PX + TILE_PX / 2;
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const spd = 40 + Math.random() * 140;
            vfxParticlesRef.current.push({
                x: cx,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 20,
                size: 2.5 + Math.random() * 3.5,
                color,
                life: 0.45 + Math.random() * 0.35,
                maxLife: 0.8
            });
        }
        vfxRingsRef.current.push({
            x: cx,
            y: cy,
            radius: 6,
            maxRadius,
            color,
            life: 0.42,
            maxLife: 0.42
        });
        if (shake > 0) screenShakeRef.current = Math.max(screenShakeRef.current, shake);
    }, []);

    const spawnFloatingText = useCallback((row: number, col: number, text: string, color: string, scale = 1.0) => {
        const cx = col * TILE_PX + TILE_PX / 2;
        const cy = row * TILE_PX + 8;
        floatingTextsRef.current.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: cy,
            vy: -36,
            text,
            color,
            scale,
            life: 1.25,
            maxLife: 1.25
        });
    }, []);

    // 컨테이너 크기 추적 (100% 풀뷰포트 채움!)
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 50) {
                setViewportSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
            }
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // 배경 일러스트 URL
    const cityBg = useMemo(
        () => getCityBackgroundImage(locRegion, locNation, locCity),
        [locRegion, locNation, locCity]
    );
    const resolvedBgUrl = useMemo(() => {
        const base = (import.meta as any).env?.BASE_URL || './';
        const normBase = base.endsWith('/') ? base : `${base}/`;
        return `${normBase}${cityBg.url.replace(/^\.?\//, '')}`;
    }, [cityBg.url]);

    // 에셋 프리로드
    useEffect(() => {
        let mounted = true;
        const assetUrls = new Set<string>([
            ...(['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).map(part =>
                getTerrainTileUrl(battlefield.cultureKey, part)
            ),
            getCultureAssetUrl(battlefield.cultureKey, 'tree'),
            getSpecialBuildingUrl('special_base'),
            getPropAssetUrl('fantasy', 'rune_pad'),
            ...SRPG_PRELOAD_PARTS.map(part => getPropAssetUrl('srpg', part))
        ]);
        assetUrls.forEach(url => {
            loadCityAssetImage(url).then(img => {
                if (mounted && img) setAssetTick(t => t + 1);
            });
        });
        const spriteUrls = new Set(units.map(u => u.spriteUrl));
        spriteUrls.forEach(url => {
            loadRpgSpriteImage(url).then(() => {
                if (mounted) setAssetTick(t => t + 1);
            });
        });
        return () => {
            mounted = false;
        };
    }, [battlefield.cultureKey]);

    // 현재 이니셔티브 주체 & 공유 아군 그룹 계산
    const currentTurnUnit = useMemo(() => {
        const id = initiativeOrder[initiativeIdx];
        return units.find(u => u.id === id && u.hp > 0) || null;
    }, [initiativeOrder, initiativeIdx, units]);

    const activeAllyGroupIds = useMemo(
        () => getSharedAllyGroupIds(initiativeOrder, initiativeIdx, units),
        [initiativeOrder, initiativeIdx, units]
    );

    const isAllyTurn = currentTurnUnit?.team === 'ally';

    const selectedUnit = useMemo(() => {
        if (!isAllyTurn) return null;
        if (selectedUnitId && activeAllyGroupIds.includes(selectedUnitId)) {
            const u = units.find(x => x.id === selectedUnitId && x.hp > 0);
            if (u) return u;
        }
        return currentTurnUnit;
    }, [isAllyTurn, selectedUnitId, activeAllyGroupIds, units, currentTurnUnit]);

    // 이동 / 공격 / 지원 / 도약 / 밀치기 가능 타일 계산
    const movableMap = useMemo(() => {
        if (!selectedUnit || !isAllyTurn || selectedUnit.remainingMov <= 0 || actionMode !== 'default') {
            return new Map<string, { cost: number; parent: string | null }>();
        }
        return computeMovableTiles(selectedUnit, battlefield.grid, units);
    }, [selectedUnit, isAllyTurn, actionMode, battlefield.grid, units]);

    const isSupportSkillSelected = Boolean(
        selectedSkill && (selectedSkill.type === SkillType.HEAL || selectedSkill.type === SkillType.BUFF)
    );

    const attackableSet = useMemo(() => {
        if (!selectedUnit || !isAllyTurn || !selectedUnit.hasAction || actionMode !== 'default' || isSupportSkillSelected) {
            return new Set<string>();
        }
        const rngMax = selectedSkill ? Math.max(selectedUnit.rngMax, 3) : selectedUnit.rngMax;
        const rngMin = selectedSkill ? 1 : selectedUnit.rngMin;
        return computeAttackableFrom(selectedUnit.row, selectedUnit.col, rngMin, rngMax, rows, cols);
    }, [selectedUnit, isAllyTurn, actionMode, selectedSkill, isSupportSkillSelected, rows, cols]);

    const supportableSet = useMemo(() => {
        if (!selectedUnit || !isAllyTurn || !selectedUnit.hasAction || actionMode !== 'default' || !isSupportSkillSelected) {
            return new Set<string>();
        }
        return computeAttackableFrom(selectedUnit.row, selectedUnit.col, 0, 3, rows, cols);
    }, [selectedUnit, isAllyTurn, actionMode, isSupportSkillSelected, rows, cols]);

    const jumpableSet = useMemo(() => {
        if (!selectedUnit || !isAllyTurn || !selectedUnit.hasBonusAction || actionMode !== 'jump') {
            return new Set<string>();
        }
        return computeJumpTiles(selectedUnit, battlefield.grid, units, 3);
    }, [selectedUnit, isAllyTurn, actionMode, battlefield.grid, units]);

    const shovableSet = useMemo(() => {
        if (!selectedUnit || !isAllyTurn || !selectedUnit.hasBonusAction || actionMode !== 'shove') {
            return new Set<string>();
        }
        return computeAttackableFrom(selectedUnit.row, selectedUnit.col, 1, 1, rows, cols);
    }, [selectedUnit, isAllyTurn, actionMode, rows, cols]);

    const activeForecast: SrpgCombatForecast | null = useMemo(() => {
        if (!selectedUnit || !forecastTargetId) return null;
        const target = units.find(u => u.id === forecastTargetId && u.hp > 0);
        if (!target) return null;
        return calculateSrpgForecast(selectedUnit, target, battlefield.grid, units, selectedSkill, character);
    }, [selectedUnit, forecastTargetId, units, battlefield.grid, selectedSkill, character]);

    // 승패 판정
    const finishBattleCheck = useCallback(
        (nextUnits: SrpgUnit[], curRound: number) => {
            const aliveEnemies = nextUnits.filter(u => u.team === 'enemy' && u.hp > 0);
            const aliveAllies = nextUnits.filter(u => u.team === 'ally' && u.hp > 0);
            const playerUnitCheck = nextUnits.find(u => u.isPlayer);
            const isPlayerKo = Boolean(playerUnitCheck && playerUnitCheck.hp <= 0);
            if (aliveEnemies.length === 0 || aliveAllies.length === 0 || isPlayerKo) {
                setIsEnded(true);
                setAutoBattle(false);
                const isVictory = aliveEnemies.length === 0 && !isPlayerKo && aliveAllies.length > 0;
                const playerUnit = playerUnitCheck;
                const compHps: Record<string, number> = {};
                nextUnits.forEach(u => {
                    if (u.sourceCompanionId) compHps[u.sourceCompanionId] = Math.max(1, u.hp);
                });
                setBannerText(
                    isVictory
                        ? '🏆 전술 대첩! 모든 적군을 격파했습니다!'
                        : isPlayerKo
                            ? '💀 플레이어가 전투불능이 되어 패배했습니다...'
                            : '💀 아군 전선 붕괴... 퇴각합니다.'
                );
                setTimeout(() => {
                    onComplete({
                        isVictory,
                        turns: curRound,
                        playerFinalHp: Math.max(1, playerUnit?.hp || 1),
                        companionFinalHps: compHps,
                        defeatedEnemyCount: nextUnits.filter(u => u.team === 'enemy' && u.hp <= 0).length
                    });
                }, fastMode ? 450 : 1250);
                return true;
            }
            return false;
        },
        [onComplete, fastMode]
    );

    // 유닛 턴 시작 시 행동 자원 복구 & 지형/버프 틱 처리
    const refreshUnitForTurn = useCallback(
        (unit: SrpgUnit): SrpgUnit => {
            const tMeta = SRPG_TERRAIN_META[battlefield.grid[unit.row][unit.col]];
            let nextHp = unit.hp;
            let nextMp = unit.mp;
            if (tMeta.healPct > 0 && nextHp < unit.maxHp) {
                const heal = Math.round((unit.maxHp * tMeta.healPct) / 100);
                nextHp = Math.min(unit.maxHp, nextHp + heal);
                spawnFloatingText(unit.row, unit.col, `+${heal.toLocaleString()} 요새회복`, '#34d399', 0.95);
            }
            if (tMeta.skillPowerBonus > 0) {
                nextMp = Math.min(unit.maxMp, nextMp + Math.round(unit.maxMp * 0.12));
            }
            if (tMeta.burnPct > 0 || surfacesRef.current[`${unit.row},${unit.col}`]?.type === 'fire') {
                const burn = Math.max(25, Math.round(unit.maxHp * 0.08));
                nextHp = Math.max(1, nextHp - burn);
                spawnBurstVfx(unit.row, unit.col, '#f97316', 10, 26, 2);
                spawnFloatingText(unit.row, unit.col, `🔥-${burn.toLocaleString()}`, '#fb923c', 0.95);
            }
            const nextBuffs = (unit.activeBuffs || [])
                .map(b => ({ ...b, turns: b.turns - 1 }))
                .filter(b => b.turns > 0);
            const atkMult = nextBuffs.reduce((acc, b) => acc * (b.atkMult || 1), 1);

            return {
                ...unit,
                hp: nextHp,
                mp: nextMp,
                remainingMov: unit.mov,
                hasMoved: false,
                hasActed: false,
                hasAction: true,
                hasBonusAction: true,
                hasReaction: true,
                activeBuffs: nextBuffs,
                buffAtkMult: atkMult,
                stunnedTurns: Math.max(0, (unit.stunnedTurns || 0) - 1)
            };
        },
        [battlefield.grid, spawnBurstVfx, spawnFloatingText]
    );

    // 다음 이니셔티브 턴으로 진행
    const advanceInitiative = useCallback(
        (currentList: SrpgUnit[], skipCount = 1) => {
            if (finishBattleCheck(currentList, roundCount)) return;
            const aliveSet = new Set(currentList.filter(u => u.hp > 0).map(u => u.id));
            let nextIdx = initiativeIdx + skipCount;
            let nextRound = roundCount;
            let order = initiativeOrder;

            // 다음 살아있는 유닛 찾기
            let found = false;
            for (let tries = 0; tries < order.length + 2; tries++) {
                if (nextIdx >= order.length) {
                    // 새 라운드 시작! 이니셔티브 재정렬 & 지면 표면 턴 감소
                    nextRound += 1;
                    order = buildInitiativeOrder(currentList);
                    setInitiativeOrder(order);
                    setRoundCount(nextRound);
                    setSurfaces(prev => {
                        const updated: Record<string, SrpgSurfaceCell> = {};
                        Object.entries(prev).forEach(([k, v]) => {
                            if (v.turns > 1) updated[k] = { ...v, turns: v.turns - 1 };
                        });
                        return updated;
                    });
                    nextIdx = 0;
                }
                if (aliveSet.has(order[nextIdx])) {
                    found = true;
                    break;
                }
                nextIdx++;
            }
            if (!found) return;

            const nextUnitId = order[nextIdx];
            const nextGroup = getSharedAllyGroupIds(order, nextIdx, currentList);
            const refreshIds = new Set(nextGroup.length > 0 ? nextGroup : [nextUnitId]);

            const refreshedUnits = currentList.map(u => (refreshIds.has(u.id) ? refreshUnitForTurn(u) : u));
            setUnits(refreshedUnits);
            setInitiativeIdx(nextIdx);
            setActionMode('default');
            setSelectedSkill(null);
            setForecastTargetId(null);

            const lead = refreshedUnits.find(u => u.id === nextUnitId);
            if (lead?.team === 'ally') {
                setSelectedUnitId(lead.id);
                setBannerText(
                    nextGroup.length > 1
                        ? `⚔️ 라운드 ${nextRound} — 아군 공유 이니셔티브(${nextGroup.length}명)! 자유롭게 전환하며 이동·스킬·보조행동을 사용하세요.`
                        : `⚔️ 라운드 ${nextRound} — [${lead.name}]의 턴! (이니셔티브 ${lead.initiative})`
                );
            } else if (lead) {
                setSelectedUnitId(null);
                setBannerText(`🔥 라운드 ${nextRound} — 적군 [${lead.name}] 행동 개시!`);
            }
        },
        [finishBattleCheck, initiativeIdx, initiativeOrder, refreshUnitForTurn, roundCount]
    );

    // 교전 실행 + VFX + 원소 지면 콤보 + 처치 폭발!
    const executeClash = useCallback(
        (attacker: SrpgUnit, defender: SrpgUnit, skill: Skill | null, onAfter?: (updated: SrpgUnit[]) => void) => {
            const forecast = calculateSrpgForecast(attacker, defender, battlefield.grid, unitsRef.current, skill, character);
            const surfRes = applySkillSurfaceAndCombo(
                defender.row,
                defender.col,
                skill,
                attacker.element,
                surfacesRef.current,
                battlefield.grid
            );
            setSurfaces(surfRes.nextSurfaces);

            const boostedForecast: SrpgCombatForecast = {
                ...forecast,
                atkDamage: Math.round(forecast.atkDamage * surfRes.comboMultiplier)
            };
            const { steps, finalAttackerHp, finalDefenderHp } = resolveSrpgClash(attacker, defender, boostedForecast);
            const mpCost = skill ? Math.min(attacker.mp, skill.mpCost || 15) : 0;

            const applyResult = () => {
                const totalDmg = steps.filter(s => s.actorSide === 'attacker').reduce((a, b) => a + b.damage, 0);
                const hadCrit = steps.some(s => s.actorSide === 'attacker' && s.isCrit);
                const isKill = finalDefenderHp <= 0;

                // 캔버스 타격/처치/원소 콤보 VFX 폭발!
                spawnBurstVfx(defender.row, defender.col, surfRes.vfxColor, isKill ? 34 : 20, isKill ? 64 : 42, isKill ? 12 : hadCrit ? 9 : 5);
                spawnFloatingText(
                    defender.row,
                    defender.col,
                    hadCrit ? `💥 ${totalDmg.toLocaleString()}!` : `-${totalDmg.toLocaleString()}`,
                    hadCrit ? '#fde047' : '#fb7185',
                    hadCrit ? 1.3 : 1.05
                );
                if (surfRes.comboName) {
                    spawnFloatingText(defender.row, defender.col, surfRes.comboName, '#38bdf8', 1.15);
                }
                if (isKill) {
                    spawnFloatingText(defender.row, defender.col, `💀 ${defender.name.replace(/\[.*?\]/g, '').trim()} 처치!`, '#facc15', 1.25);
                }

                const updated = unitsRef.current.map(u => {
                    if (u.id === attacker.id) {
                        return { ...u, hp: finalAttackerHp, mp: Math.max(0, u.mp - mpCost), hasAction: false, hasActed: !u.hasBonusAction && u.remainingMov <= 0 };
                    }
                    if (u.id === defender.id) {
                        return {
                            ...u,
                            hp: finalDefenderHp,
                            stunnedTurns: surfRes.stunsTarget ? 1 : u.stunnedTurns
                        };
                    }
                    return u;
                });
                setUnits(updated);
                setClash(null);
                setForecastTargetId(null);
                setSelectedSkill(null);
                setBannerText(
                    isKill
                        ? `💀 ${attacker.name}의 [${forecast.skillName}] 일격으로 ${defender.name} 처치! (${totalDmg.toLocaleString()} 피해)`
                        : `⚔️ ${attacker.name} → ${defender.name} [${forecast.skillName}] (${totalDmg.toLocaleString()} 피해${surfRes.comboName ? ` · ${surfRes.comboName}` : ''})`
                );

                const ended = finishBattleCheck(updated, roundCount);
                if (!ended && onAfter) onAfter(updated);
            };

            if (fastMode) {
                applyResult();
                return;
            }

            setClash({
                attacker,
                defender,
                steps,
                currentStepIdx: 0,
                onFinish: applyResult
            });
        },
        [battlefield.grid, character, fastMode, finishBattleCheck, roundCount, spawnBurstVfx, spawnFloatingText]
    );

    // 컷인 스텝 진행
    useEffect(() => {
        if (!clash) return;
        const timer = setTimeout(() => {
            if (clash.currentStepIdx + 1 < clash.steps.length) {
                setClash(prev => (prev ? { ...prev, currentStepIdx: prev.currentStepIdx + 1 } : null));
            } else {
                clash.onFinish();
            }
        }, 560);
        return () => clearTimeout(timer);
    }, [clash]);

    // 적군 개별 이니셔티브 턴 AI 실행 (BG3 리액션 패링 팝업 + 보스 텔레그래프)
    useEffect(() => {
        if (!currentTurnUnit || currentTurnUnit.team !== 'enemy' || clash || pendingReaction || isEnded) return;

        const timer = setTimeout(() => {
            let current = [...unitsRef.current];
            const enemy = current.find(u => u.id === currentTurnUnit.id && u.hp > 0);
            if (!enemy) {
                advanceInitiative(current, 1);
                return;
            }

            // 기절 상태면 턴 스킵
            if ((enemy.stunnedTurns || 0) > 0) {
                spawnFloatingText(enemy.row, enemy.col, '⚡ 감전 기절!', '#38bdf8', 1.1);
                advanceInitiative(current, 1);
                return;
            }

            // 보스 턴 시작 시 예고 장판 폭발
            if (enemy.isBoss && telegraph && telegraph.bossId === enemy.id) {
                const tileSet = new Set(telegraph.tiles.map(t => `${t.row},${t.col}`));
                current = current.map(u => {
                    if (u.team === 'ally' && u.hp > 0 && tileSet.has(`${u.row},${u.col}`)) {
                        const dmg = Math.max(30, Math.round(enemy.atk * telegraph.damageMultiplier - u.def * 0.4));
                        spawnBurstVfx(u.row, u.col, '#ef4444', 22, 48, 8);
                        spawnFloatingText(u.row, u.col, `💥-${dmg.toLocaleString()}`, '#f87171', 1.15);
                        return { ...u, hp: Math.max(0, u.hp - dmg) };
                    }
                    return u;
                });
                setTelegraph(null);
                setUnits(current);
                if (finishBattleCheck(current, roundCount)) return;
            }

            const aliveAllies = current.filter(u => u.team === 'ally' && u.hp > 0);
            if (aliveAllies.length === 0) return;

            const targetAlly = aliveAllies.reduce((best, cur) => {
                const dBest = Math.abs(best.row - enemy.row) + Math.abs(best.col - enemy.col);
                const dCur = Math.abs(cur.row - enemy.row) + Math.abs(cur.col - enemy.col);
                return dCur < dBest ? cur : best;
            }, aliveAllies[0]);

            const distMap = computeMovableTiles(enemy, battlefield.grid, current);
            const occupied = new Set(current.filter(u => u.hp > 0 && u.id !== enemy.id).map(u => `${u.row},${u.col}`));
            let bestR = enemy.row;
            let bestC = enemy.col;
            let bestScore = Infinity;

            distMap.forEach((_, key) => {
                if (occupied.has(key)) return;
                const [r, c] = key.split(',').map(Number);
                const d = Math.abs(r - targetAlly.row) + Math.abs(c - targetAlly.col);
                const score = d >= enemy.rngMin && d <= enemy.rngMax ? -100 + d : d;
                if (score < bestScore) {
                    bestScore = score;
                    bestR = r;
                    bestC = c;
                }
            });

            current = current.map(u =>
                u.id === enemy.id
                    ? { ...u, row: bestR, col: bestC, dir: (targetAlly.row > bestR ? 'down' : 'up') as any }
                    : u
            );
            const movedEnemy = current.find(u => u.id === enemy.id)!;
            setUnits(current);

            // 보스 다음 턴 장판 예고
            if (movedEnemy.isBoss) {
                setTelegraph(computeBossTelegraph(movedEnemy, battlefield.grid, aliveAllies));
            }

            const dist = Math.abs(movedEnemy.row - targetAlly.row) + Math.abs(movedEnemy.col - targetAlly.col);
            if (dist >= movedEnemy.rngMin && dist <= movedEnemy.rngMax) {
                const forecast = calculateSrpgForecast(movedEnemy, targetAlly, battlefield.grid, current, null, character);

                const applyEnemyAttack = (parried: boolean) => {
                    const dmg = Math.max(1, Math.round(forecast.atkDamage * (parried ? 0.45 : 1.0)));
                    const counterDmg = parried ? Math.max(1, Math.round(forecast.ctrDamage * 0.9 || targetAlly.atk * 0.6)) : 0;

                    spawnBurstVfx(targetAlly.row, targetAlly.col, parried ? '#a855f7' : '#ef4444', 18, 42, parried ? 5 : 8);
                    spawnFloatingText(
                        targetAlly.row,
                        targetAlly.col,
                        parried ? `🟣 패링! -${dmg.toLocaleString()}` : `-${dmg.toLocaleString()}`,
                        parried ? '#c084fc' : '#fb7185',
                        1.15
                    );
                    if (parried && counterDmg > 0) {
                        spawnBurstVfx(movedEnemy.row, movedEnemy.col, '#38bdf8', 16, 38, 6);
                        spawnFloatingText(movedEnemy.row, movedEnemy.col, `⚡ 반격 -${counterDmg.toLocaleString()}`, '#38bdf8', 1.15);
                    }

                    const after = current.map(u => {
                        if (u.id === targetAlly.id) {
                            return { ...u, hp: Math.max(0, u.hp - dmg), hasReaction: parried ? false : u.hasReaction };
                        }
                        if (u.id === movedEnemy.id && parried) {
                            return { ...u, hp: Math.max(0, u.hp - counterDmg) };
                        }
                        return u;
                    });
                    setPendingReaction(null);
                    setUnits(after);
                    advanceInitiative(after, 1);
                };

                // 🟣 BG3 리액션 패링 발동 기회! (보스/강공격 + 리액션 보유 시)
                if (targetAlly.hasReaction && !autoBattle && (movedEnemy.isBoss || forecast.atkDamage >= targetAlly.maxHp * 0.15)) {
                    setPendingReaction({
                        attacker: movedEnemy,
                        defender: targetAlly,
                        rawDamage: forecast.atkDamage,
                        onParry: () => applyEnemyAttack(true),
                        onTakeHit: () => applyEnemyAttack(false)
                    });
                    return;
                }

                applyEnemyAttack(Boolean(targetAlly.hasReaction && autoBattle));
            } else {
                advanceInitiative(current, 1);
            }
        }, fastMode ? 140 : 380);

        return () => clearTimeout(timer);
    }, [currentTurnUnit, clash, pendingReaction, isEnded, advanceInitiative, autoBattle, battlefield.grid, character, fastMode, finishBattleCheck, roundCount, spawnBurstVfx, spawnFloatingText, telegraph]);

    // 자동 지휘(Auto AI) 루프 (아군 공유 이니셔티브 그룹)
    useEffect(() => {
        if (!autoBattle || !isAllyTurn || clash || pendingReaction || isEnded) return;
        const timer = setTimeout(() => {
            const current = unitsRef.current;
            const groupSet = new Set(activeAllyGroupIds);
            const actor = current.find(u => groupSet.has(u.id) && u.hp > 0 && u.hasAction);
            const aliveEnemies = current.filter(u => u.team === 'enemy' && u.hp > 0);
            if (!actor || aliveEnemies.length === 0) {
                advanceInitiative(current, Math.max(1, activeAllyGroupIds.length));
                return;
            }

            const target = aliveEnemies.reduce((best, cur) => {
                const dBest = Math.abs(best.row - actor.row) + Math.abs(best.col - actor.col);
                const dCur = Math.abs(cur.row - actor.row) + Math.abs(cur.col - actor.col);
                return dCur < dBest ? cur : best;
            }, aliveEnemies[0]);

            const distMap = computeMovableTiles(actor, battlefield.grid, current);
            const occupied = new Set(current.filter(u => u.hp > 0 && u.id !== actor.id).map(u => `${u.row},${u.col}`));
            let bestR = actor.row;
            let bestC = actor.col;
            let bestScore = Infinity;

            distMap.forEach((_, key) => {
                if (occupied.has(key)) return;
                const [r, c] = key.split(',').map(Number);
                const d = Math.abs(r - target.row) + Math.abs(c - target.col);
                const score = d >= actor.rngMin && d <= actor.rngMax ? -100 + d : d;
                if (score < bestScore) {
                    bestScore = score;
                    bestR = r;
                    bestC = c;
                }
            });

            const moved = current.map(u => (u.id === actor.id ? { ...u, row: bestR, col: bestC, remainingMov: 0 } : u));
            const movedActor = moved.find(u => u.id === actor.id)!;
            setUnits(moved);
            unitsRef.current = moved;

            const dFinal = Math.abs(movedActor.row - target.row) + Math.abs(movedActor.col - target.col);
            if (dFinal >= movedActor.rngMin && dFinal <= movedActor.rngMax) {
                const atkSkill = movedActor.skills.find(sk => (sk.type === SkillType.ATTACK || sk.type === SkillType.MAGIC) && (sk.mpCost || 15) <= movedActor.mp) || null;
                executeClash(movedActor, target, atkSkill);
            } else {
                const done = moved.map(u => (u.id === movedActor.id ? { ...u, hasAction: false, hasActed: true } : u));
                setUnits(done);
            }
        }, fastMode ? 160 : 380);

        return () => clearTimeout(timer);
    }, [autoBattle, isAllyTurn, clash, pendingReaction, isEnded, activeAllyGroupIds, units, advanceInitiative, battlefield.grid, executeClash, fastMode]);

    // 캔버스 좌표 변환 (풀뷰포트 카메라 대응)
    const clientToTile = (clientX: number, clientY: number): { row: number; col: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;
        const { zoom, offsetX, offsetY } = cameraRef.current;
        const wx = (sx - offsetX) / zoom;
        const wy = (sy - offsetY) / zoom;
        const col = Math.floor(wx / TILE_PX);
        const row = Math.floor(wy / TILE_PX);
        if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
        return { row, col };
    };

    // 타일 클릭 핸들러 (분할 이동 / 공격 / 지원 스킬 / 밀치기 / 도약 / 공유 이니셔티브 전환)
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAllyTurn || clash || pendingReaction || isEnded || autoBattle) return;
        const hit = clientToTile(e.clientX, e.clientY);
        if (!hit) return;
        const { row, col } = hit;
        const clickedUnit = units.find(u => u.hp > 0 && u.row === row && u.col === col);

        // 0. 🟠 보조행동: 도약(Jump) 실행
        if (selectedUnit && actionMode === 'jump' && jumpableSet.has(`${row},${col}`)) {
            spawnBurstVfx(selectedUnit.row, selectedUnit.col, '#38bdf8', 12, 28, 2);
            spawnBurstVfx(row, col, '#fbbf24', 18, 38, 4);
            spawnFloatingText(row, col, '🦘 도약 착지!', '#fde047', 1.05);
            setUnits(prev =>
                prev.map(u => (u.id === selectedUnit.id ? { ...u, row, col, hasBonusAction: false } : u))
            );
            setActionMode('default');
            setBannerText(`🦘 ${selectedUnit.name} 도약 성공! (보조행동 소모, 주행동·남은 이동력 유지)`);
            return;
        }

        // 1. 🟠 보조행동: 밀치기(Shove) 실행
        if (selectedUnit && actionMode === 'shove' && clickedUnit && clickedUnit.team === 'enemy' && shovableSet.has(`${row},${col}`)) {
            const shove = resolveShoveAction(selectedUnit, clickedUnit, battlefield.grid, units);
            spawnBurstVfx(shove.newRow, shove.newCol, '#f97316', 22, 46, 7);
            spawnFloatingText(shove.newRow, shove.newCol, shove.bonusDamage > 0 ? `💥 밀치기! -${shove.bonusDamage}` : '💨 밀쳐냄!', '#fb923c', 1.15);
            const updated = units.map(u => {
                if (u.id === selectedUnit.id) return { ...u, hasBonusAction: false };
                if (u.id === clickedUnit.id) return { ...u, row: shove.newRow, col: shove.newCol, hp: Math.max(0, u.hp - shove.bonusDamage) };
                return u;
            });
            setUnits(updated);
            setActionMode('default');
            setBannerText(`💥 ${selectedUnit.name}의 밀치기! ${clickedUnit.name} — ${shove.reason}`);
            finishBattleCheck(updated, roundCount);
            return;
        }

        // 2. 💚 지원 스킬(회복/버프) 시전 + 확실한 버프 오라 VFX
        if (selectedUnit && selectedSkill && isSupportSkillSelected && clickedUnit && clickedUnit.team === 'ally' && supportableSet.has(`${row},${col}`)) {
            const mpCost = Math.min(selectedUnit.mp, selectedSkill.mpCost || 15);
            const supRes = resolveSrpgSupportSkill(selectedUnit, clickedUnit, selectedSkill);
            const isHeal = selectedSkill.type === SkillType.HEAL;
            spawnBurstVfx(clickedUnit.row, clickedUnit.col, isHeal ? '#34d399' : '#fbbf24', 24, 52, 3);
            spawnFloatingText(
                clickedUnit.row,
                clickedUnit.col,
                isHeal ? `💚 +${supRes.healAmount.toLocaleString()}` : `✨ ${selectedSkill.name} 버프!`,
                isHeal ? '#34d399' : '#fde047',
                1.2
            );
            const updated = units.map(u => {
                let nextU = u;
                if (u.id === clickedUnit.id) {
                    const nextBuffs = supRes.buffApplied
                        ? [...(nextU.activeBuffs || []), { name: selectedSkill.name, atkMult: 1.25, turns: 3, color: '#fbbf24' }]
                        : nextU.activeBuffs;
                    nextU = {
                        ...nextU,
                        hp: Math.min(nextU.maxHp, nextU.hp + supRes.healAmount),
                        activeBuffs: nextBuffs,
                        buffAtkMult: supRes.buffApplied ? Math.max(1.25, nextU.buffAtkMult || 1) : nextU.buffAtkMult
                    };
                }
                if (u.id === selectedUnit.id) {
                    nextU = { ...nextU, mp: Math.max(0, nextU.mp - mpCost), hasAction: false };
                }
                return nextU;
            });
            setUnits(updated);
            setSelectedSkill(null);
            setBannerText(supRes.logText);
            return;
        }

        // 3. ⚔️ 공격/스킬 사거리 내 적 클릭 -> 전투 예측창 표시
        if (selectedUnit && clickedUnit && clickedUnit.team === 'enemy' && attackableSet.has(`${row},${col}`)) {
            setForecastTargetId(clickedUnit.id);
            return;
        }

        // 4. 공유 이니셔티브 그룹 내 다른 아군 클릭 -> 즉시 유닛 전환
        if (clickedUnit && clickedUnit.team === 'ally' && activeAllyGroupIds.includes(clickedUnit.id)) {
            setSelectedUnitId(clickedUnit.id);
            setActionMode('default');
            setSelectedSkill(null);
            setForecastTargetId(null);
            return;
        }

        // 5. 🔵 BG3 분할 이동 (이동 비용만큼만 remainingMov 차감 -> 공격 후 남은 칸으로 후퇴 가능!)
        if (selectedUnit && !clickedUnit && movableMap.has(`${row},${col}`)) {
            const cost = movableMap.get(`${row},${col}`)?.cost || 1;
            const nextUnits = units.map(u =>
                u.id === selectedUnit.id
                    ? {
                          ...u,
                          row,
                          col,
                          dir: (row > u.row ? 'down' : row < u.row ? 'up' : col > u.col ? 'right' : 'left') as any,
                          remainingMov: Math.max(0, u.remainingMov - cost),
                          hasMoved: true
                      }
                    : u
            );
            setUnits(nextUnits);
            setForecastTargetId(null);
            const tMeta = SRPG_TERRAIN_META[battlefield.grid[row][col]];
            setBannerText(`👣 ${selectedUnit.name} → [${tMeta.label}] 이동! (잔여 이동력 ${Math.max(0, selectedUnit.remainingMov - cost)}칸)`);
            return;
        }

        setForecastTargetId(null);
        setActionMode('default');
    };

    const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setHoverTile(clientToTile(e.clientX, e.clientY));
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        cameraRef.current.userZoom = Math.max(0.85, Math.min(2.0, cameraRef.current.userZoom + delta));
    };

    // 60fps 풀뷰포트 2D 전장 + 원소 표면 + 버프 오라 + 실시간 VFX 렌더링
    useEffect(() => {
        let rafId = 0;
        let lastTime = performance.now();

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && canvas) {
                const viewW = canvas.width;
                const viewH = canvas.height;
                const worldW = cols * TILE_PX;
                const worldH = rows * TILE_PX;

                // 화면을 꽉 채우도록 자동 맞춤 줌 계산 (여백 최소화!)
                const fitZoom = Math.min((viewW - 16) / worldW, (viewH - 16) / worldH);
                const zoom = Math.max(0.65, fitZoom * cameraRef.current.userZoom);
                const offsetX = Math.round((viewW - worldW * zoom) / 2);
                const offsetY = Math.round((viewH - worldH * zoom) / 2);
                cameraRef.current.zoom = zoom;
                cameraRef.current.offsetX = offsetX;
                cameraRef.current.offsetY = offsetY;

                // 화면 흔들림 감쇠
                let shakeX = 0;
                let shakeY = 0;
                if (screenShakeRef.current > 0.2) {
                    shakeX = (Math.random() - 0.5) * screenShakeRef.current * 2;
                    shakeY = (Math.random() - 0.5) * screenShakeRef.current * 2;
                    screenShakeRef.current *= Math.pow(0.02, dt);
                } else {
                    screenShakeRef.current = 0;
                }

                ctx.clearRect(0, 0, viewW, viewH);
                ctx.save();
                ctx.translate(offsetX + shakeX, offsetY + shakeY);
                ctx.scale(zoom, zoom);
                ctx.imageSmoothingEnabled = false;

                const aiGround = getCachedCityAssetImage(getTerrainTileUrl(battlefield.cultureKey, 'ground'));
                const aiRoad = getCachedCityAssetImage(getTerrainTileUrl(battlefield.cultureKey, 'road'));
                const aiPlaza = getCachedCityAssetImage(getTerrainTileUrl(battlefield.cultureKey, 'plaza'));
                const aiWall = getCachedCityAssetImage(getTerrainTileUrl(battlefield.cultureKey, 'wall'));
                const aiWater = getCachedCityAssetImage(getTerrainTileUrl(battlefield.cultureKey, 'water'));
                const treeImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'forest')) || getCachedCityAssetImage(getCultureAssetUrl(battlefield.cultureKey, 'tree'));
                const fortImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'fort')) || getCachedCityAssetImage(getSpecialBuildingUrl('special_base'));
                const altarImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'altar')) || getCachedCityAssetImage(getPropAssetUrl('fantasy', 'rune_pad'));
                const barricadeImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'barricade'));
                const allyCampImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'ally_camp'));
                const enemyThroneImg = getCachedCityAssetImage(getPropAssetUrl('srpg', 'enemy_throne'));
                const ready = (img: HTMLImageElement | null): img is HTMLImageElement =>
                    Boolean(img && img.complete && img.naturalWidth > 0);

                // Layer 1: 고품질 지형 타일 (도시 배경 은은하게 투과)
                ctx.save();
                ctx.globalAlpha = 0.84;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const t = battlefield.grid[r][c];
                        const px = c * TILE_PX;
                        const py = r * TILE_PX;
                        if (t === 'water' || t === 'lava') {
                            if (ready(aiWater)) ctx.drawImage(aiWater, px, py, TILE_PX, TILE_PX);
                            else { ctx.fillStyle = t === 'lava' ? '#991b1b' : '#1d4ed8'; ctx.fillRect(px, py, TILE_PX, TILE_PX); }
                            if (t === 'lava') {
                                ctx.fillStyle = `rgba(249, 115, 22, ${0.28 + Math.sin(now * 0.005 + r + c) * 0.12})`;
                                ctx.fillRect(px, py, TILE_PX, TILE_PX);
                            }
                        } else if (t === 'wall') {
                            if (ready(aiWall)) ctx.drawImage(aiWall, px, py, TILE_PX, TILE_PX);
                            else { ctx.fillStyle = '#334155'; ctx.fillRect(px, py, TILE_PX, TILE_PX); }
                        } else if (t === 'fort') {
                            if (ready(aiRoad)) ctx.drawImage(aiRoad, px, py, TILE_PX, TILE_PX);
                            else { ctx.fillStyle = '#475569'; ctx.fillRect(px, py, TILE_PX, TILE_PX); }
                        } else if (t === 'altar') {
                            if (ready(aiPlaza)) ctx.drawImage(aiPlaza, px, py, TILE_PX, TILE_PX);
                            else { ctx.fillStyle = '#4c1d95'; ctx.fillRect(px, py, TILE_PX, TILE_PX); }
                        } else {
                            if (ready(aiGround)) ctx.drawImage(aiGround, px, py, TILE_PX, TILE_PX);
                            else { ctx.fillStyle = (r + c) % 2 === 0 ? '#1f4e34' : '#255a3d'; ctx.fillRect(px, py, TILE_PX, TILE_PX); }
                        }
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px + 0.5, py + 0.5, TILE_PX - 1, TILE_PX - 1);
                    }
                }
                ctx.restore();

                // Layer 1.5: BG3 원소 지면 표면(Surface: 물/불/얼음/독/신성/감전)
                Object.entries(surfaces).forEach(([key, cell]) => {
                    const [r, c] = key.split(',').map(Number);
                    const px = c * TILE_PX;
                    const py = r * TILE_PX;
                    const glow = 0.28 + Math.sin(now * 0.007 + r + c) * 0.12;
                    const colMap: Record<string, string> = {
                        water: `rgba(14, 165, 233, ${glow})`,
                        fire: `rgba(249, 115, 22, ${glow + 0.1})`,
                        ice: `rgba(103, 232, 249, ${glow})`,
                        poison: `rgba(74, 222, 128, ${glow})`,
                        holy: `rgba(253, 224, 71, ${glow})`,
                        electrified: `rgba(56, 189, 248, ${glow + 0.15})`
                    };
                    ctx.fillStyle = colMap[cell.type] || `rgba(255,255,255,${glow})`;
                    ctx.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                });

                // Layer 2: SRPG 지형 소품 & 기믹
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const t = battlefield.grid[r][c];
                        const px = c * TILE_PX;
                        const py = r * TILE_PX;
                        const isAllyCamp = r === battlefield.allyCampPos.row && c === battlefield.allyCampPos.col;
                        const isEnemyThrone = r === battlefield.enemyThronePos.row && c === battlefield.enemyThronePos.col;
                        if (isAllyCamp && ready(allyCampImg)) ctx.drawImage(allyCampImg, px + 1, py - 2, TILE_PX - 2, TILE_PX + 2);
                        else if (isEnemyThrone && ready(enemyThroneImg)) ctx.drawImage(enemyThroneImg, px, py - 4, TILE_PX, TILE_PX + 4);
                        else if (t === 'forest' && ready(treeImg)) ctx.drawImage(treeImg, px + 2, py, TILE_PX - 4, TILE_PX - 2);
                        else if (t === 'fort' && ready(fortImg)) ctx.drawImage(fortImg, px + 1, py, TILE_PX - 2, TILE_PX - 2);
                        else if (t === 'altar' && ready(altarImg)) ctx.drawImage(altarImg, px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                        else if (t === 'wall' && ready(barricadeImg)) ctx.drawImage(barricadeImg, px + 2, py + 4, TILE_PX - 4, TILE_PX - 6);
                    }
                }
                battlefield.gimmicks.forEach(g => {
                    const gImg = getCachedCityAssetImage(getPropAssetUrl('srpg', g.part));
                    if (ready(gImg)) ctx.drawImage(gImg, g.col * TILE_PX + 2, g.row * TILE_PX - 2, TILE_PX - 4, TILE_PX);
                });

                // Layer 3: 범위 하이라이트 (파란 이동 / 빨간 공격 / 초록 지원 / 주황 도약·밀치기 / 보스 장판)
                const pulse = 0.30 + Math.sin(now * 0.006) * 0.12;
                movableMap.forEach((_, key) => {
                    const [r, c] = key.split(',').map(Number);
                    ctx.fillStyle = `rgba(56, 189, 248, ${pulse})`;
                    ctx.fillRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                });
                attackableSet.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    const hasEnemy = units.some(u => u.hp > 0 && u.team === 'enemy' && u.row === r && u.col === c);
                    ctx.fillStyle = hasEnemy ? `rgba(244, 63, 94, ${pulse + 0.22})` : 'rgba(244, 63, 94, 0.18)';
                    ctx.fillRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    if (hasEnemy) {
                        ctx.strokeStyle = '#fb7185';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    }
                });
                supportableSet.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    const hasAlly = units.some(u => u.hp > 0 && u.team === 'ally' && u.row === r && u.col === c);
                    ctx.fillStyle = hasAlly ? `rgba(16, 185, 129, ${pulse + 0.25})` : 'rgba(16, 185, 129, 0.18)';
                    ctx.fillRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    if (hasAlly) { ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.strokeRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4); }
                });
                jumpableSet.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    ctx.fillStyle = `rgba(245, 158, 11, ${pulse + 0.15})`;
                    ctx.fillRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                });
                shovableSet.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    ctx.fillStyle = `rgba(249, 115, 22, ${pulse + 0.2})`;
                    ctx.fillRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                    ctx.strokeStyle = '#fb923c';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(c * TILE_PX + 2, r * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
                });
                if (telegraph) {
                    const warnAlpha = 0.28 + Math.sin(now * 0.01) * 0.18;
                    telegraph.tiles.forEach(({ row, col }) => {
                        const px = col * TILE_PX;
                        const py = row * TILE_PX;
                        ctx.fillStyle = `rgba(220, 38, 38, ${warnAlpha})`;
                        ctx.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                        ctx.fillStyle = '#fef08a';
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('⚠️', px + TILE_PX - 11, py + 13);
                    });
                }

                // 이동 경로 황금 화살표
                if (selectedUnit && hoverTile && movableMap.has(`${hoverTile.row},${hoverTile.col}`)) {
                    const path = reconstructPath(movableMap, hoverTile.row, hoverTile.col);
                    if (path.length >= 2) {
                        ctx.save();
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 3.5;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.beginPath();
                        path.forEach((pt, idx) => {
                            const cx = pt.col * TILE_PX + TILE_PX / 2;
                            const cy = pt.row * TILE_PX + TILE_PX / 2;
                            if (idx === 0) ctx.moveTo(cx, cy);
                            else ctx.lineTo(cx, cy);
                        });
                        ctx.stroke();
                        ctx.restore();
                    }
                }

                // Layer 4: 유닛 + 버프 오라 링 렌더링
                const walkFrame = Math.floor(now / 260) % 2 === 0 ? 1 : 0;
                units
                    .filter(u => u.hp > 0)
                    .sort((a, b) => a.row - b.row)
                    .forEach(u => {
                        const cx = u.col * TILE_PX + TILE_PX / 2;
                        const cy = u.row * TILE_PX + TILE_PX / 2;
                        const isSel = selectedUnit?.id === u.id;

                        // 활성 버프 회전 오라 링!
                        if ((u.activeBuffs?.length || 0) > 0) {
                            ctx.save();
                            ctx.translate(cx, cy + 14);
                            ctx.rotate(now * 0.003);
                            ctx.strokeStyle = u.activeBuffs[0].color || '#fde047';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([5, 4]);
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 19, 8, 0, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.restore();
                        }

                        // 진영 베이스 링
                        ctx.fillStyle =
                            u.team === 'ally'
                                ? isSel
                                    ? 'rgba(250, 204, 21, 0.65)'
                                    : activeAllyGroupIds.includes(u.id)
                                        ? 'rgba(56, 189, 248, 0.48)'
                                        : 'rgba(56, 189, 248, 0.25)'
                                : u.isBoss
                                    ? 'rgba(244, 63, 94, 0.6)'
                                    : 'rgba(239, 68, 68, 0.38)';
                        ctx.beginPath();
                        ctx.ellipse(cx, cy + 14, 16, 7, 0, 0, Math.PI * 2);
                        ctx.fill();

                        const enemyTokenImg =
                            u.team === 'enemy' && u.enemyTokenPart
                                ? getCachedCityAssetImage(getPropAssetUrl('srpg', u.enemyTokenPart))
                                : null;

                        if (ready(enemyTokenImg)) {
                            const bob = Math.sin(now * 0.006 + u.row + u.col) * 1.5;
                            const drawW = u.isBoss ? 48 : 40;
                            const drawH = u.isBoss ? 54 : 46;
                            ctx.drawImage(enemyTokenImg, cx - drawW / 2, cy + 16 - drawH + bob, drawW, drawH);
                        } else {
                            const spriteImg = getCachedRpgSpriteImage(u.spriteUrl);
                            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                                const fw = Math.floor(spriteImg.naturalWidth / 3);
                                const fh = Math.floor(spriteImg.naturalHeight / 4);
                                const rowIdx = DIRECTION_ROW_MAP[u.dir] ?? 0;
                                const drawW = u.isBoss ? 46 : 38;
                                const drawH = u.isBoss ? 56 : 48;
                                ctx.drawImage(spriteImg, walkFrame * fw, rowIdx * fh, fw, fh, cx - drawW / 2, cy + 16 - drawH, drawW, drawH);
                            } else {
                                drawFallbackChibiSprite(ctx, cx, cy + 12, u.regionKey, u.genderKey, u.dir, walkFrame);
                            }
                        }

                        if (u.isBoss) {
                            ctx.font = 'bold 12px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('👑', cx, cy - 26);
                        } else if ((u.activeBuffs?.length || 0) > 0) {
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('✨', cx + 15, cy - 16);
                        }

                        // HP 바 + 이름
                        const barW = 38;
                        const hpRatio = Math.max(0, Math.min(1, u.hp / u.maxHp));
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                        ctx.fillRect(cx - barW / 2, cy + 16, barW, 5);
                        ctx.fillStyle = u.team === 'ally' ? '#34d399' : u.isBoss ? '#f59e0b' : '#f43f5e';
                        ctx.fillRect(cx - barW / 2 + 1, cy + 17, Math.max(1, (barW - 2) * hpRatio), 3);

                        ctx.font = 'bold 9px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
                        const shortName = u.name.replace(/\[.*?\]/g, '').trim().slice(0, 6);
                        const tw = ctx.measureText(shortName).width + 6;
                        ctx.fillRect(cx - tw / 2, cy - 28, tw, 12);
                        ctx.fillStyle = u.team === 'ally' ? '#e0f2fe' : '#fecdd3';
                        ctx.fillText(shortName, cx, cy - 19);
                    });

                // Layer 5: 실시간 타격/처치/버프 파티클 & 충격파 링 & 플로팅 텍스트
                vfxRingsRef.current = vfxRingsRef.current.filter(ring => {
                    ring.life -= dt;
                    if (ring.life <= 0) return false;
                    const p = 1 - ring.life / ring.maxLife;
                    const rad = ring.radius + (ring.maxRadius - ring.radius) * p;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
                    ctx.strokeStyle = ring.color;
                    ctx.lineWidth = 3 * (1 - p) + 1;
                    ctx.beginPath();
                    ctx.arc(ring.x, ring.y, rad, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    return true;
                });

                vfxParticlesRef.current = vfxParticlesRef.current.filter(pt => {
                    pt.life -= dt;
                    if (pt.life <= 0) return false;
                    pt.x += pt.vx * dt;
                    pt.y += pt.vy * dt;
                    pt.vy += 180 * dt;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
                    ctx.fillStyle = pt.color;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    return true;
                });

                floatingTextsRef.current = floatingTextsRef.current.filter(ft => {
                    ft.life -= dt;
                    if (ft.life <= 0) return false;
                    ft.y += ft.vy * dt;
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.6);
                    ctx.font = `900 ${Math.round(13 * ft.scale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
                    ctx.strokeText(ft.text, ft.x, ft.y);
                    ctx.fillStyle = ft.color;
                    ctx.fillText(ft.text, ft.x, ft.y);
                    ctx.restore();
                    return true;
                });

                ctx.restore();
            }
            rafId = requestAnimationFrame(render);
        };
        rafId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafId);
    }, [battlefield, cols, rows, units, selectedUnit, activeAllyGroupIds, movableMap, attackableSet, supportableSet, jumpableSet, shovableSet, hoverTile, telegraph, surfaces, viewportSize]);

    const hoverTerrain = hoverTile ? SRPG_TERRAIN_META[battlefield.grid[hoverTile.row][hoverTile.col]] : null;
    const forecastDefender = forecastTargetId ? units.find(u => u.id === forecastTargetId) : null;

    return (
        <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative select-none">
            {/* 상단 헤더 + BG3 이니셔티브 초상화 순서바 (AGI + WIS 순) */}
            <div className="px-2.5 py-1.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[10.5px] font-black shrink-0">
                        R{roundCount}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-[260px]">
                        {battlefield.title}
                    </span>
                </div>

                {/* BG3 이니셔티브 초상화 바 */}
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full sm:max-w-[52%] py-0.5">
                    {initiativeOrder.map((uid, idx) => {
                        const u = units.find(x => x.id === uid);
                        if (!u || u.hp <= 0) return null;
                        const isCur = idx === initiativeIdx;
                        const isSharedAlly = activeAllyGroupIds.includes(uid);
                        return (
                            <button
                                key={uid}
                                type="button"
                                onClick={() => {
                                    if (isSharedAlly) {
                                        setSelectedUnitId(uid);
                                        setActionMode('default');
                                    }
                                }}
                                className={`px-1.5 py-0.5 rounded-lg border text-[9.5px] font-black flex items-center gap-1 shrink-0 transition-all ${
                                    isCur
                                        ? 'bg-amber-500 text-slate-950 border-amber-200 scale-105 shadow-md'
                                        : isSharedAlly
                                            ? 'bg-sky-900/90 text-sky-200 border-sky-400 hover:bg-sky-800 cursor-pointer'
                                            : u.team === 'ally'
                                                ? 'bg-slate-900 text-sky-300 border-sky-800/70 opacity-80'
                                                : 'bg-rose-950/80 text-rose-300 border-rose-800/70 opacity-85'
                                }`}
                                title={`${u.name} (이니셔티브 AGI+WIS: ${u.initiative})`}
                            >
                                <span>{u.isBoss ? '👑' : u.team === 'ally' ? '🛡️' : '💀'}</span>
                                <span className="max-w-[46px] truncate">{u.name.replace(/\[.*?\]/g, '').trim()}</span>
                                <span className="text-[8.5px] opacity-75 font-mono">{u.initiative}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setFastMode(v => !v)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                            fastMode ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                    >
                        <FastForward size={11} /> 고속
                    </button>
                    <button
                        type="button"
                        onClick={() => setAutoBattle(v => !v)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                            autoBattle ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                    >
                        <Bot size={11} /> {autoBattle ? '자동 ON' : '자동'}
                    </button>
                    {onRetreat && !isEnded && (
                        <button type="button" onClick={onRetreat} className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white" title="퇴각">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* 전황 배너 + 지형 정보 */}
            <div className="px-3 py-1 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[10.5px] shrink-0 z-20">
                <span className="font-bold text-emerald-300 truncate">{bannerText}</span>
                {hoverTerrain && (
                    <span className="text-[9.5px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                        {hoverTerrain.label} · 방어+{hoverTerrain.defBonus}% · 회피+{hoverTerrain.evaBonus}%
                    </span>
                )}
            </div>

            {/* 중앙 100% 풀뷰포트 2D 전장 캔버스 */}
            <div ref={viewportRef} className="relative flex-1 min-h-[320px] w-full overflow-hidden bg-slate-950">
                <img
                    src={resolvedBgUrl}
                    alt="전장 배경"
                    className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-35"
                />
                <canvas
                    ref={canvasRef}
                    width={viewportSize.width}
                    height={viewportSize.height}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMove}
                    onMouseLeave={() => setHoverTile(null)}
                    onWheel={handleWheel}
                    className="relative z-10 block w-full h-full cursor-pointer"
                />

                {/* 전투 예측창 (Combat Forecast) */}
                {activeForecast && selectedUnit && forecastDefender && !clash && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-[460px] rounded-2xl bg-slate-950/95 border-2 border-amber-400/85 p-3 shadow-[0_0_35px_rgba(0,0,0,0.92)] backdrop-blur-md">
                        <div className="flex items-center justify-between text-xs font-black mb-2">
                            <span className="text-sky-300">{selectedUnit.name}</span>
                            <span className="text-amber-300 text-[11px]">[{activeForecast.skillName}]</span>
                            <span className="text-rose-300">{forecastDefender.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-900/90 rounded-xl p-2 border border-slate-800 mb-2">
                            <div>
                                <div className="text-slate-400 text-[10px]">예상 피해</div>
                                <div className="font-black text-amber-300 text-sm">
                                    {activeForecast.atkDamage.toLocaleString()}
                                    {activeForecast.atkDoubles && <span className="text-emerald-400 ml-1">×2</span>}
                                </div>
                                <div className="text-[9.5px] text-slate-400">명중 {activeForecast.atkHit}% · 치명 {activeForecast.atkCrit}%</div>
                            </div>
                            <div className="flex flex-col justify-center items-center border-x border-slate-800">
                                <span className="text-[10px] text-slate-400">HP 예측</span>
                                <span className="text-rose-300 font-mono font-bold text-[10.5px]">
                                    {forecastDefender.hp.toLocaleString()} → {Math.max(0, forecastDefender.hp - activeForecast.atkDamage * (activeForecast.atkDoubles ? 2 : 1)).toLocaleString()}
                                </span>
                                {activeForecast.dualStrikeBonus > 0 && (
                                    <span className="text-[9px] text-emerald-400 font-black">🤝 협공 +{activeForecast.dualStrikeBonus}%</span>
                                )}
                            </div>
                            <div>
                                <div className="text-slate-400 text-[10px]">적 반격</div>
                                <div className="font-black text-rose-400 text-sm">
                                    {activeForecast.canCounter ? activeForecast.ctrDamage.toLocaleString() : '불가'}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setForecastTargetId(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => executeClash(selectedUnit, forecastDefender, selectedSkill)}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-xs font-black flex items-center gap-1 shadow-lg"
                            >
                                <Sword size={13} /> 공격 확정!
                            </button>
                        </div>
                    </div>
                )}

                {/* 파이어 엠블렘 2D 교전 컷인 오버레이 */}
                {clash && (
                    <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
                        <div className="w-full max-w-[500px] rounded-2xl border-2 border-amber-400/80 bg-slate-950 p-4 shadow-[0_0_50px_rgba(251,191,36,0.35)]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-sky-300">{clash.attacker.name}</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[11px] font-black">
                                    ⚔️ {clash.steps[clash.currentStepIdx]?.skillName}
                                </span>
                                <span className="text-xs font-black text-rose-300">{clash.defender.name}</span>
                            </div>
                            <div className="h-24 rounded-xl bg-gradient-to-r from-sky-950/50 via-slate-900 to-rose-950/50 border border-slate-800 flex items-center justify-around">
                                <div className={`w-14 h-14 rounded-xl bg-slate-900 border-2 border-sky-400 overflow-hidden flex items-center justify-center transition-transform ${clash.steps[clash.currentStepIdx]?.actorSide === 'attacker' ? 'translate-x-6 scale-110' : ''}`}>
                                    {clash.attacker.visualUrl ? <img src={clash.attacker.visualUrl} alt="" className="w-full h-full object-cover" /> : <Sword size={24} className="text-sky-400" />}
                                </div>
                                <div className="text-center">
                                    {(() => {
                                        const st = clash.steps[clash.currentStepIdx];
                                        if (!st) return null;
                                        return st.isMiss ? (
                                            <div className="text-lg font-black text-slate-400">MISS!</div>
                                        ) : (
                                            <div className={`text-2xl font-black ${st.isCrit ? 'text-amber-300' : 'text-rose-400'}`}>
                                                {st.isCrit && '💥 '} -{st.damage.toLocaleString()}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className={`w-14 h-14 rounded-xl bg-slate-900 border-2 border-rose-500 overflow-hidden flex items-center justify-center transition-transform ${clash.steps[clash.currentStepIdx]?.actorSide === 'defender' ? '-translate-x-6 scale-110' : ''}`}>
                                    {clash.defender.visualUrl ? <img src={clash.defender.visualUrl} alt="" className="w-full h-full object-cover" /> : <Crown size={24} className="text-rose-400" />}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 하단 BG3 전술 핫바 (이동 게이지 · 🟢주행동 · 🟠보조행동 · 🟣리액션 · 📖전체 스킬창) */}
            <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
                {selectedUnit && isAllyTurn ? (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-sky-300">{selectedUnit.name}</span>
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-700/50">
                                HP {selectedUnit.hp.toLocaleString()}/{selectedUnit.maxHp.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono text-sky-300 bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-700/50">
                                🔵 이동 {selectedUnit.remainingMov}/{selectedUnit.mov}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${selectedUnit.hasAction ? 'bg-emerald-600/25 text-emerald-300 border-emerald-400' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                                🟢 주행동
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${selectedUnit.hasBonusAction ? 'bg-amber-600/25 text-amber-300 border-amber-400' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                                🟠 보조행동
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${selectedUnit.hasReaction ? 'bg-purple-600/25 text-purple-300 border-purple-400' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                                🟣 리액션
                            </span>
                            {(selectedUnit.activeBuffs?.length || 0) > 0 && (
                                <span className="text-[10px] font-black text-amber-200 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/50">
                                    ✨ 버프 {selectedUnit.activeBuffs.length}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                            {/* 📖 CombatInterface.tsx 동일 전체 스킬창 열기 */}
                            <button
                                type="button"
                                disabled={!selectedUnit.hasAction}
                                onClick={() => setIsSkillModalOpen(true)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1 shrink-0 ${
                                    selectedUnit.hasAction
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-400 shadow'
                                        : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                            >
                                <BookOpen size={12} />
                                <span>{selectedSkill ? `스킬: ${selectedSkill.name}` : '전체 스킬창'}</span>
                            </button>

                            {selectedSkill && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedSkill(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 text-[10.5px] font-bold text-slate-300 border border-slate-600 shrink-0"
                                >
                                    일반공격
                                </button>
                            )}

                            {/* 🟠 보조행동 3종: 밀치기 / 도약 / 긴급 집중 */}
                            <button
                                type="button"
                                disabled={!selectedUnit.hasBonusAction}
                                onClick={() => setActionMode(m => (m === 'shove' ? 'default' : 'shove'))}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-black border shrink-0 ${
                                    actionMode === 'shove'
                                        ? 'bg-orange-500 text-slate-950 border-orange-300'
                                        : selectedUnit.hasBonusAction
                                            ? 'bg-slate-950 text-orange-300 border-orange-600/60 hover:bg-orange-950/50'
                                            : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                            >
                                💥 밀치기
                            </button>

                            <button
                                type="button"
                                disabled={!selectedUnit.hasBonusAction}
                                onClick={() => setActionMode(m => (m === 'jump' ? 'default' : 'jump'))}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-black border shrink-0 ${
                                    actionMode === 'jump'
                                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                                        : selectedUnit.hasBonusAction
                                            ? 'bg-slate-950 text-amber-300 border-amber-600/60 hover:bg-amber-950/50'
                                            : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                            >
                                🦘 도약
                            </button>

                            <button
                                type="button"
                                disabled={!selectedUnit.hasBonusAction}
                                onClick={() => {
                                    const heal = Math.round(selectedUnit.maxHp * 0.25);
                                    spawnBurstVfx(selectedUnit.row, selectedUnit.col, '#34d399', 20, 44, 2);
                                    spawnFloatingText(selectedUnit.row, selectedUnit.col, `🧪 +${heal.toLocaleString()} & ATK↑`, '#34d399', 1.15);
                                    setUnits(prev =>
                                        prev.map(u =>
                                            u.id === selectedUnit.id
                                                ? {
                                                      ...u,
                                                      hp: Math.min(u.maxHp, u.hp + heal),
                                                      hasBonusAction: false,
                                                      activeBuffs: [...(u.activeBuffs || []), { name: '신력 고양', atkMult: 1.2, turns: 2, color: '#34d399' }],
                                                      buffAtkMult: Math.max(1.2, u.buffAtkMult || 1)
                                                  }
                                                : u
                                        )
                                    );
                                    setBannerText(`🧪 ${selectedUnit.name} 긴급 회복(+${heal.toLocaleString()}) & 공격력 +20% 버프 발동!`);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-black border shrink-0 ${
                                    selectedUnit.hasBonusAction
                                        ? 'bg-slate-950 text-emerald-300 border-emerald-600/60 hover:bg-emerald-950/50'
                                        : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                            >
                                🧪 포션/고양
                            </button>

                            <button
                                type="button"
                                disabled={!selectedUnit.hasAction}
                                onClick={() => {
                                    spawnBurstVfx(selectedUnit.row, selectedUnit.col, '#38bdf8', 14, 34, 1);
                                    spawnFloatingText(selectedUnit.row, selectedUnit.col, `💨 대시! MOV +${selectedUnit.mov}`, '#38bdf8', 1.05);
                                    setUnits(prev =>
                                        prev.map(u =>
                                            u.id === selectedUnit.id
                                                ? { ...u, hasAction: false, remainingMov: u.remainingMov + u.mov }
                                                : u
                                        )
                                    );
                                    setBannerText(`💨 ${selectedUnit.name} 대시 발동! 이동력이 크게 증가했습니다.`);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-black border shrink-0 ${
                                    selectedUnit.hasAction
                                        ? 'bg-slate-950 text-sky-300 border-sky-600/60 hover:bg-sky-950/50'
                                        : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                            >
                                💨 대시
                            </button>

                            <button
                                type="button"
                                onClick={() => advanceInitiative(unitsRef.current, Math.max(1, activeAllyGroupIds.length))}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-[11px] font-black flex items-center gap-1 shadow shrink-0"
                            >
                                <RefreshCw size={11} /> 턴 종료
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
                        <span>
                            아군 생존 <strong className="text-sky-300">{units.filter(u => u.team === 'ally' && u.hp > 0).length}</strong> · 적군 생존{' '}
                            <strong className="text-rose-400">{units.filter(u => u.team === 'enemy' && u.hp > 0).length}</strong>
                        </span>
                        <span>적군 이니셔티브 턴 진행 중...</span>
                    </div>
                )}
            </div>

            {/* CombatInterface.tsx 동일 전체 스킬창 모달 (SkillSelector) */}
            {isSkillModalOpen && selectedUnit && (
                <SkillSelector
                    skills={selectedUnit.skills}
                    currentTier={(selectedUnit.sourceEntity as any)?.classTier || ClassTier.FIRST}
                    player={selectedUnit.sourceEntity as Character | Companion}
                    onSelect={(skill) => {
                        setSelectedSkill(skill);
                        setActionMode('default');
                        setIsSkillModalOpen(false);
                        setForecastTargetId(null);
                        setBannerText(
                            skill.type === SkillType.HEAL || skill.type === SkillType.BUFF
                                ? `💚 [${skill.name}] 선택! 초록색 사거리 내 아군을 클릭해 시전하세요.`
                                : `⚔️ [${skill.name}] 선택! 빨간색 사거리 내 적을 클릭해 시전하세요.`
                        );
                    }}
                    onClose={() => setIsSkillModalOpen(false)}
                />
            )}
        </div>
    );
};

export default SrpgBattleCanvas;
