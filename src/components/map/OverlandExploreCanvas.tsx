import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, Enemy, Location } from '../../types';
import { WORLD_GEOGRAPHY } from '../../constants';
import {
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    resolveCityCultureKey
} from '../../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../../services/rpgSpriteManifest';
import { getRegionalHuntStyle } from '../OutskirtsRpgCanvas';
import {
    generateBountyTargetEnemies,
    generateTravelAmbushEnemies
} from '../../services/travelEventsService';
import {
    computeOverlandRoute,
    getWalkMinutesBetweenCities,
    OverlandWaypoint
} from '../../services/travelCalculationService';
import {
    getHuntBandsForLocation,
    getMonsterInfo,
    getMonsterPoolForBand,
    NATION_THEMES
} from '../../monsterfield';
import { ArrowLeft, Compass, Flame, ShoppingBag, Sparkles } from 'lucide-react';

const CITY_TILE_SIZE = 48;

interface OverlandExploreCanvasProps {
    character: Character;
    region: string;
    nation: string;
    targetDestination?: Location | null;
    onArriveCity: (destination: Location, days: number, totalMinutes: number) => void;
    onStepWaypoint?: (waypoint: Location, days: number, totalMinutes: number) => void;
    onApplyExploreDelta: (delta: {
        goldDelta?: number;
        expDelta?: number;
        hpPctDelta?: number;
        mpPctDelta?: number;
        reputationDelta?: number;
        markRescueDate?: string;
        companionId?: string;
        affectionDelta?: number;
        baseResourcesDelta?: { herbs?: number; manaStone?: number; iron?: number; stone?: number };
        logMessage?: string;
    }) => void;
    onTriggerBattle: (enemies: Enemy[], logMsg: string) => void;
    onExitToAtlas: () => void;
}

interface OverlandCityPortal {
    city: string;
    nation: string;
    region: string;
    tx: number;
    ty: number;
    isCurrent: boolean;
    isBorder?: boolean;
    durationText: string;
    days: number;
    totalMinutes: number;
}

interface OverlandGatherNode {
    id: string;
    kind: 'herb' | 'ore' | 'crystal' | 'camp';
    label: string;
    tx: number;
    ty: number;
    collected: boolean;
}

interface OverlandPropNode {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
}

interface OverlandMonster {
    id: string;
    name: string;
    tierLabel: string;
    bandIndex: number;
    levelRange: [number, number];
    visualUrl?: string;
    px: number;
    py: number;
    homePx: number;
    homePy: number;
    targetPx: number | null;
    targetPy: number | null;
    dir: 'left' | 'right';
    wanderTimer: number;
    respawnTimer: number;
}

const COLS = 34;
const ROWS = 22;

export const OverlandExploreCanvas: React.FC<OverlandExploreCanvasProps> = ({
    character,
    region: initialRegion,
    nation: initialNation,
    targetDestination,
    onArriveCity,
    onStepWaypoint,
    onApplyExploreDelta,
    onTriggerBattle,
    onExitToAtlas
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const monsterImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const [viewport, setViewport] = useState({ w: 920, h: 540 });
    const [nearbyAction, setNearbyAction] = useState<{ label: string; kind: 'city' | 'gather' | 'merchant' | 'waypoint' } | null>(null);
    const [merchantOpen, setMerchantOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const routeWaypoints = useMemo<OverlandWaypoint[]>(() => {
        if (!targetDestination) return [];
        return computeOverlandRoute(
            { region: initialRegion, nation: initialNation, city: character.currentLocation?.city || initialNation },
            targetDestination
        );
    }, [initialRegion, initialNation, character.currentLocation?.city, targetDestination]);

    const [activeRegion, setActiveRegion] = useState<string>(() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_overland_resume');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.charId === character.id && parsed?.activeRegion) return parsed.activeRegion;
        } catch {}
        return initialRegion;
    });
    const [activeNation, setActiveNation] = useState<string>(() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_overland_resume');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.charId === character.id && parsed?.activeNation) return parsed.activeNation;
        } catch {}
        return initialNation;
    });
    const [hopIndex, setHopIndex] = useState<number>(() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_overland_resume');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.charId === character.id && typeof parsed?.hopIndex === 'number') return parsed.hopIndex;
        } catch {}
        return 0;
    });
    const region = activeRegion;
    const nation = activeNation;

    useEffect(() => {
        // One-shot consume: once OverlandExploreCanvas mounts back after combat, clear the resume token
        try {
            const raw = sessionStorage.getItem('shinryoku_overland_resume');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.charId === character.id) {
                    sessionStorage.removeItem('shinryoku_overland_resume');
                }
            }
        } catch {}
    }, [character.id]);

    const nextWaypoint = useMemo<OverlandWaypoint | null>(() => {
        if (routeWaypoints.length === 0) return null;
        if (activeNation === targetDestination?.nation) return null;
        return routeWaypoints[hopIndex] || routeWaypoints[routeWaypoints.length - 1] || null;
    }, [routeWaypoints, activeNation, targetDestination?.nation, hopIndex]);

    const waypointPortalPos = useMemo(() => {
        if (!nextWaypoint) return { tx: 30.5, ty: 10.5, enterTx: 3.5, enterTy: 10.5, dirLabel: '동쪽' };
        const key = `${activeNation}->${nextWaypoint.nation}:${nextWaypoint.city}`;
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        const side = h % 4;
        if (side === 0) return { tx: 30.5, ty: 10.5, enterTx: 3.5, enterTy: 10.5, dirLabel: '동쪽' };
        if (side === 1) return { tx: 2.5, ty: 10.5, enterTx: 29.5, enterTy: 10.5, dirLabel: '서쪽' };
        if (side === 2) return { tx: 16.5, ty: 2.5, enterTx: 16.5, enterTy: 18.5, dirLabel: '북쪽' };
        return { tx: 16.5, ty: 18.5, enterTx: 16.5, enterTy: 3.5, dirLabel: '남쪽' };
    }, [nextWaypoint, activeNation]);

    const curCity =
        activeNation === (character.currentLocation?.nation || initialNation)
            ? (character.currentLocation?.city || WORLD_GEOGRAPHY[region]?.[nation]?.capital || '서울')
            : (WORLD_GEOGRAPHY[region]?.[nation]?.capital || WORLD_GEOGRAPHY[region]?.[nation]?.cities?.[0] || nation);
    const initialOriginRef = useRef<Location>(
        character.currentLocation || { region: initialRegion, nation: initialNation, city: curCity }
    );
    const cultureKey = useMemo(() => resolveCityCultureKey(region, nation, curCity), [region, nation, curCity]);
    const huntStyle = useMemo(() => getRegionalHuntStyle(region, nation), [region, nation]);
    const spriteInfo = useMemo(
        () => resolveEntityRpgSprite(character as any, region, nation),
        [character, region, nation]
    );
    const playerSpriteUrl = spriteInfo.url;

    // Preload tiles, props, and player RPG spritesheet
    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
        loadCityAssetImage(getInteriorPropSpriteUrl(huntStyle.tileKey));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_tile_trail'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_tree'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_rock'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_camp'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_spirit_tree'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_obsidian'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_ruin_pillar'));
        loadCityAssetImage(getInteriorPropSpriteUrl('hunt_prop_rift_stone'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_npc_merchant'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_npc_rescue'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_npc_bounty'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_herb'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_spirit_herb'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_ore'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_crystal'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_camp'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_wagon'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_bounty_board'));
        loadCityAssetImage(getInteriorPropSpriteUrl('overland_obj_portal'));
    }, [playerSpriteUrl, cultureKey, huntStyle.tileKey]);

    // Build city portals from WORLD_GEOGRAPHY[region][nation].cities + nearby nations in the region
    const cityPortals = useMemo<OverlandCityPortal[]>(() => {
        const nationData = WORLD_GEOGRAPHY[region]?.[nation];
        const rawCities: string[] = Array.isArray(nationData?.cities) ? nationData.cities : [];
        const sortedCities = [...rawCities].sort((a, b) => (a === curCity ? -1 : b === curCity ? 1 : 0));

        const slots = [
            { tx: 16, ty: 10 }, // Current city hub center-south
            { tx: 6, ty: 5 },
            { tx: 27, ty: 5 },
            { tx: 5, ty: 12 },
            { tx: 28, ty: 12 },
            { tx: 7, ty: 18 },
            { tx: 26, ty: 18 },
            { tx: 16, ty: 3 }
        ];

        const portals: OverlandCityPortal[] = sortedCities.slice(0, slots.length - 1).map((cName, idx) => {
            const dest: Location = { region, nation, city: cName };
            const walkInfo = getWalkMinutesBetweenCities(initialOriginRef.current, dest, character);
            return {
                city: cName,
                nation,
                region,
                tx: slots[idx].tx,
                ty: slots[idx].ty,
                isCurrent: cName === curCity && nation === initialOriginRef.current.nation,
                durationText: walkInfo.durationText,
                days: walkInfo.days,
                totalMinutes: walkInfo.totalMinutes
            };
        });

        // Add 1 neighboring nation border gate if space remains
        const regionNations = Object.keys(WORLD_GEOGRAPHY[region] || {}).filter(n => n !== nation);
        if (regionNations.length > 0 && portals.length < slots.length) {
            const nextNation = regionNations[0];
            const cap = WORLD_GEOGRAPHY[region][nextNation]?.capital || WORLD_GEOGRAPHY[region][nextNation]?.cities?.[0];
            if (cap) {
                const dest: Location = { region, nation: nextNation, city: cap };
                const walkInfo = getWalkMinutesBetweenCities(character.currentLocation, dest, character);
                const slot = slots[portals.length];
                portals.push({
                    city: cap,
                    nation: nextNation,
                    region,
                    tx: slot.tx,
                    ty: slot.ty,
                    isCurrent: false,
                    isBorder: true,
                    durationText: walkInfo.durationText,
                    days: walkInfo.days,
                    totalMinutes: walkInfo.totalMinutes
                });
            }
        }
        return portals;
    }, [region, nation, curCity, character]);

    const fieldProps = useMemo<OverlandPropNode[]>(() => {
        const tk = huntStyle.treeKind;
        const rk = huntStyle.rockKind;
        const treeKey = tk === 'rift' ? 'hunt_prop_obsidian' : tk === 'pillar' ? 'hunt_prop_ruin_pillar' : 'hunt_prop_tree';
        const spiritKey = tk === 'rift' ? 'hunt_prop_rift_stone' : 'hunt_prop_spirit_tree';
        const rockKey = rk === 'pillar' ? 'hunt_prop_ruin_pillar' : 'hunt_prop_rock';
        return [
            { key: 'hunt_prop_camp', tx: 14, ty: 10, w: 2, h: 2 },
            { key: spiritKey, tx: 11, ty: 4, w: 2, h: 2 },
            { key: spiritKey, tx: 21, ty: 4, w: 2, h: 2 },
            { key: treeKey, tx: 2, ty: 2, w: 2, h: 2 },
            { key: treeKey, tx: 30, ty: 2, w: 2, h: 2 },
            { key: treeKey, tx: 2, ty: 18, w: 2, h: 2 },
            { key: treeKey, tx: 30, ty: 18, w: 2, h: 2 },
            { key: rockKey, tx: 9, ty: 14, w: 1.6, h: 1.6 },
            { key: rockKey, tx: 23, ty: 14, w: 1.6, h: 1.6 },
            { key: treeKey, tx: 12, ty: 17, w: 2, h: 2 },
            { key: treeKey, tx: 20, ty: 17, w: 2, h: 2 }
        ];
    }, [huntStyle]);

    const gatherNodesRef = useRef<OverlandGatherNode[]>([
        { id: 'camp_center', kind: 'camp', label: '여로의 모닥불 야영지', tx: 14.5, ty: 11.2, collected: false },
        { id: 'herb_1', kind: 'herb', label: '야생 약초 군락', tx: 10, ty: 7, collected: false },
        { id: 'ore_1', kind: 'ore', label: '노천 철광맥', tx: 23, ty: 7, collected: false },
        { id: 'crystal_1', kind: 'crystal', label: '마력석 노두', tx: 11, ty: 15, collected: false },
        { id: 'herb_2', kind: 'herb', label: '희귀 영초', tx: 22, ty: 15, collected: false }
    ]);

    const rescueNpcRef = useRef({ tx: 12.5, ty: 8.5, rescued: false });
    const bountyNpcRef = useRef({ tx: 22.5, ty: 11.5, defeated: false });

    const merchantPos = useMemo(() => ({ tx: 18.2, ty: 11.2, name: '유랑 상단장' }), []);

    const monstersRef = useRef<OverlandMonster[]>([]);
    useEffect(() => {
        const theme = NATION_THEMES[curCity] || NATION_THEMES[nation] || NATION_THEMES['default'];
        const tiers: Array<{ key: 'beginner' | 'intermediate' | 'advanced' | 'elite'; label: string }> = [
            { key: 'beginner', label: '초보' },
            { key: 'intermediate', label: '중급' },
            { key: 'advanced', label: '상급' },
            { key: 'elite', label: '정예' }
        ];
        const slots = [
            { tx: 9, ty: 5 },
            { tx: 23, ty: 5 },
            { tx: 8, ty: 9 },
            { tx: 25, ty: 9 },
            { tx: 8, ty: 15 },
            { tx: 25, ty: 15 },
            { tx: 13, ty: 18 },
            { tx: 20, ty: 18 },
            { tx: 4, ty: 8 },
            { tx: 29, ty: 8 },
            { tx: 12, ty: 3 },
            { tx: 21, ty: 3 },
            { tx: 4, ty: 15 },
            { tx: 29, ty: 15 },
            { tx: 16, ty: 15 },
            { tx: 18, ty: 6 }
        ];

        const bands = getHuntBandsForLocation(nation, region, curCity);
        monstersRef.current = slots.map((s, idx) => {
            const bandIdx = bands.length > 0 ? idx % bands.length : 0;
            const band = bands[bandIdx];
            const pool = band
                ? getMonsterPoolForBand(theme, band.id)
                : theme.monsters?.['beginner'] || ['야생 마물'];
            const raw = pool[Math.floor(Math.random() * pool.length)];
            const info = getMonsterInfo(raw);
            if (info.visualUrl && !monsterImgCacheRef.current.has(info.visualUrl)) {
                const img = new Image();
                img.src = info.visualUrl;
                monsterImgCacheRef.current.set(info.visualUrl, img);
            }
            const px = (s.tx + 0.5) * CITY_TILE_SIZE;
            const py = (s.ty + 0.5) * CITY_TILE_SIZE;
            return {
                id: `over_mob_${idx}`,
                name: info.name,
                tierLabel: band ? band.name : tiers[idx % tiers.length].label,
                bandIndex: bandIdx,
                levelRange: band ? band.levelRange : [1, 10],
                visualUrl: info.visualUrl,
                px,
                py,
                homePx: px,
                homePy: py,
                targetPx: null,
                targetPy: null,
                dir: idx % 2 === 0 ? 'left' : 'right',
                wanderTimer: 1 + Math.random() * 2,
                respawnTimer: 0
            };
        });
    }, [curCity, nation]);

    const startCityPortal = cityPortals.find(p => p.isCurrent) || cityPortals[0];
    const playerRef = useRef((() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_overland_resume');
            const parsed = raw ? JSON.parse(raw) : null;
            if (
                parsed?.charId === character.id &&
                parsed?.activeNation === activeNation &&
                typeof parsed?.playerX === 'number' &&
                typeof parsed?.playerY === 'number'
            ) {
                return {
                    x: parsed.playerX as number,
                    y: parsed.playerY as number,
                    dir: (parsed.playerDir as SpriteDirection) || 'down',
                    frame: 1,
                    animTimer: 0,
                    targetX: null as number | null,
                    targetY: null as number | null
                };
            }
        } catch {}
        return {
            x: ((startCityPortal?.tx ?? 16) + 0.5) * CITY_TILE_SIZE,
            y: ((startCityPortal?.ty ?? 10) + 1.2) * CITY_TILE_SIZE,
            dir: 'down' as SpriteDirection,
            frame: 1,
            animTimer: 0,
            targetX: null as number | null,
            targetY: null as number | null
        };
    })());
    const keysRef = useRef<Set<string>>(new Set());
    const cameraRef = useRef({ x: 0, y: 0 });
    const graceRef = useRef<number>(Date.now() + 1200);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                setViewport({ w: Math.floor(r.width), h: Math.floor(r.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(prev => (prev === msg ? null : prev)), 2600);
    };

    const handleInteract = useCallback(() => {
        const p = playerRef.current;
        // 0. Check Next Waypoint Portal (multi-hop overland route)
        if (nextWaypoint) {
            const wx = waypointPortalPos.tx * CITY_TILE_SIZE;
            const wy = waypointPortalPos.ty * CITY_TILE_SIZE;
            if (Math.hypot(wx - p.x, wy - p.y) <= CITY_TILE_SIZE * 1.7) {
                const walkInfo = getWalkMinutesBetweenCities(
                    { region, nation, city: curCity },
                    { region: nextWaypoint.region, nation: nextWaypoint.nation, city: nextWaypoint.city },
                    character
                );
                onStepWaypoint?.(
                    { region: nextWaypoint.region, nation: nextWaypoint.nation, city: nextWaypoint.city },
                    walkInfo.days,
                    walkInfo.totalMinutes
                );
                setActiveRegion(nextWaypoint.region);
                setActiveNation(nextWaypoint.nation);
                setHopIndex(idx => idx + 1);
                playerRef.current.x = waypointPortalPos.enterTx * CITY_TILE_SIZE;
                playerRef.current.y = waypointPortalPos.enterTy * CITY_TILE_SIZE;
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
                graceRef.current = Date.now() + 1400;
                showToast(`🧭 ${nextWaypoint.nation} (${nextWaypoint.city} 방면) 진입! (${walkInfo.durationText} 경과)`);
                return;
            }
        }
        for (const cp of cityPortals) {
            const cx = (cp.tx + 0.5) * CITY_TILE_SIZE;
            const cy = (cp.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(cx - p.x, cy - p.y) <= CITY_TILE_SIZE * 1.55) {
                onArriveCity(
                    { region: cp.region, nation: cp.nation, city: cp.city },
                    cp.days,
                    cp.totalMinutes
                );
                return;
            }
        }
        const mx = (merchantPos.tx + 0.5) * CITY_TILE_SIZE;
        const my = (merchantPos.ty + 0.5) * CITY_TILE_SIZE;
        if (Math.hypot(mx - p.x, my - p.y) <= CITY_TILE_SIZE * 1.6) {
            setMerchantOpen(true);
            return;
        }
        // 2-1. Check Stranded Traveler (Rescue - 1/day limit, +2 reputation)
        const todayDate = character.currentDate || '2026-01-01';
        if (!rescueNpcRef.current.rescued && character.lastTravelRescueDate !== todayDate) {
            const rx = (rescueNpcRef.current.tx + 0.5) * CITY_TILE_SIZE;
            const ry = (rescueNpcRef.current.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(rx - p.x, ry - p.y) <= CITY_TILE_SIZE * 1.55) {
                rescueNpcRef.current.rescued = true;
                const rescueGold = 350 + character.level * 40;
                onApplyExploreDelta({
                    goldDelta: rescueGold,
                    reputationDelta: 2,
                    markRescueDate: todayDate,
                    expDelta: 30 + character.level * 10,
                    logMessage: `[도보 구조] 조난당한 여행자를 도와주어 명성 +2, ${rescueGold.toLocaleString()}G를 획득했습니다.`
                });
                showToast(`🆘 조난자 구조 완료! (+${rescueGold.toLocaleString()}G · 명성 +2)`);
                return;
            }
        }
        // 2-2. Check Bounty Target
        if (!bountyNpcRef.current.defeated) {
            const bx = (bountyNpcRef.current.tx + 0.5) * CITY_TILE_SIZE;
            const by = (bountyNpcRef.current.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(bx - p.x, by - p.y) <= CITY_TILE_SIZE * 1.55) {
                bountyNpcRef.current.defeated = true;
                try {
                    sessionStorage.setItem(
                        'shinryoku_overland_resume',
                        JSON.stringify({
                            charId: character.id,
                            savedLocationKey: `${character.currentLocation?.nation}|${character.currentLocation?.city}`,
                            activeRegion,
                            activeNation,
                            hopIndex,
                            targetDestination: targetDestination || null,
                            playerX: p.x,
                            playerY: p.y,
                            playerDir: p.dir
                        })
                    );
                } catch {}
                const enemies = generateBountyTargetEnemies({ region, nation, city: curCity }, character);
                onTriggerBattle(enemies, `[도보 수배] ${nation} 외곽에 숨어있던 현상수배범을 추적해 전투에 돌입합니다!`);
                return;
            }
        }
        for (const gn of gatherNodesRef.current) {
            const gx = (gn.tx + 0.5) * CITY_TILE_SIZE;
            const gy = (gn.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(gx - p.x, gy - p.y) <= CITY_TILE_SIZE * 1.55) {
                if (gn.kind === 'camp') {
                    const comps = character.companions || [];
                    const comp = comps.length > 0 ? comps[Math.floor(Math.random() * comps.length)] : null;
                    onApplyExploreDelta({
                        hpPctDelta: 40,
                        mpPctDelta: 40,
                        companionId: comp?.id,
                        affectionDelta: comp ? 2 : undefined,
                        logMessage: comp
                            ? `[도보 야영] 모닥불 휴식 중 ${comp.name}와(과) 대화를 나누어 HP/MP +40%, ${comp.name} 친밀도 +2!`
                            : '[도보 탐험] 여로의 모닥불에서 휴식을 취해 체력과 마력을 회복했습니다.'
                    });
                    showToast(comp ? `🔥 야영 휴식 (HP/MP +40% · ${comp.name} 친밀도 +2)` : '🔥 야영지에서 체력/마력 +40% 회복!');
                } else if (!gn.collected) {
                    gn.collected = true;
                    if (!character.base) {
                        showToast(`⚠️ ${gn.label}: 기지가 없어 자원을 보관할 수 없습니다.`);
                        return;
                    }
                    if (gn.kind === 'herb') {
                        const qty = gn.id === 'herb_2' ? 5 : 3;
                        onApplyExploreDelta({
                            baseResourcesDelta: { herbs: qty },
                            logMessage: `[도보 채집] ${gn.label}에서 기지 자원 약초 +${qty}개를 수집했습니다.`
                        });
                        showToast(`🌿 ${gn.label} 수집 (기지 약초 +${qty})`);
                    } else if (gn.kind === 'crystal') {
                        const qty = 3;
                        onApplyExploreDelta({
                            baseResourcesDelta: { manaStone: qty },
                            logMessage: `[도보 채집] ${gn.label}에서 기지 자원 마석 +${qty}개를 수집했습니다.`
                        });
                        showToast(`💎 ${gn.label} 수집 (기지 마석 +${qty})`);
                    } else if (gn.kind === 'ore') {
                        onApplyExploreDelta({
                            baseResourcesDelta: { iron: 3, stone: 2 },
                            logMessage: `[도보 채집] ${gn.label}에서 기지 자원 철광석 +3, 석재 +2개를 수집했습니다.`
                        });
                        showToast(`🪨 ${gn.label} 수집 (기지 철광석 +3 · 석재 +2)`);
                    }
                }
                return;
            }
        }
    }, [cityPortals, merchantPos, onArriveCity, onApplyExploreDelta, character.level]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                keysRef.current.add(k);
            } else if (k === ' ' || k === 'enter' || k === 'e') {
                e.preventDefault();
                handleInteract();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [handleInteract]);

    useEffect(() => {
        let rafId = 0;
        let last = performance.now();
        let uiTick = 0;

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const p = playerRef.current;

            let vx = 0;
            let vy = 0;
            const keys = keysRef.current;
            if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
            if (keys.has('arrowright') || keys.has('d')) vx += 1;
            if (keys.has('arrowup') || keys.has('w')) vy -= 1;
            if (keys.has('arrowdown') || keys.has('s')) vy += 1;

            let moving = false;
            if (vx !== 0 || vy !== 0) {
                p.targetX = null;
                p.targetY = null;
                const len = Math.hypot(vx, vy);
                p.x += (vx / len) * 190 * dt;
                p.y += (vy / len) * 190 * dt;
                moving = true;
                if (Math.abs(vx) >= Math.abs(vy)) p.dir = vx < 0 ? 'left' : 'right';
                else p.dir = vy < 0 ? 'up' : 'down';
            } else if (p.targetX !== null && p.targetY !== null) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 6) {
                    p.targetX = null;
                    p.targetY = null;
                } else {
                    p.x += (dx / dist) * 190 * dt;
                    p.y += (dy / dist) * 190 * dt;
                    moving = true;
                    if (Math.abs(dx) >= Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
                    else p.dir = dy < 0 ? 'up' : 'down';
                }
            }

            if (moving) {
                p.animTimer += dt;
                if (p.animTimer >= 0.14) {
                    p.animTimer = 0;
                    p.frame = (p.frame + 1) % 3;
                }
            } else {
                p.frame = 1;
            }

            p.x = Math.max(CITY_TILE_SIZE * 1.2, Math.min((COLS - 1.2) * CITY_TILE_SIZE, p.x));
            p.y = Math.max(CITY_TILE_SIZE * 1.2, Math.min((ROWS - 1.2) * CITY_TILE_SIZE, p.y));

            for (const m of monstersRef.current) {
                if (m.respawnTimer > 0) {
                    m.respawnTimer = Math.max(0, m.respawnTimer - dt);
                    continue;
                }
                if (Date.now() > graceRef.current && Math.hypot(m.px - p.x, m.py - p.y) <= CITY_TILE_SIZE * 0.72) {
                    m.respawnTimer = 10;
                    graceRef.current = Date.now() + 2000;
                    p.targetX = null;
                    p.targetY = null;
                    try {
                        sessionStorage.setItem(
                            'shinryoku_overland_resume',
                            JSON.stringify({
                                charId: character.id,
                                savedLocationKey: `${character.currentLocation?.nation}|${character.currentLocation?.city}`,
                                activeRegion,
                                activeNation,
                                hopIndex,
                                targetDestination: targetDestination || null,
                                playerX: p.x,
                                playerY: p.y,
                                playerDir: p.dir
                            })
                        );
                    } catch {}
                    const enemies = generateTravelAmbushEnemies({ region, nation, city: curCity }, character, m.bandIndex);
                    onTriggerBattle(enemies, `[도보 탐험] ${nation} 가도를 배회하던 ${m.name} 무리와 조우했습니다!`);
                    break;
                }
                m.wanderTimer -= dt;
                if (m.targetPx !== null && m.targetPy !== null) {
                    const dx = m.targetPx - m.px;
                    const dy = m.targetPy - m.py;
                    const d = Math.hypot(dx, dy);
                    if (d < 4) {
                        m.targetPx = null;
                        m.targetPy = null;
                    } else {
                        m.px += (dx / d) * 38 * dt;
                        m.py += (dy / d) * 38 * dt;
                        m.dir = dx < 0 ? 'left' : 'right';
                    }
                } else if (m.wanderTimer <= 0) {
                    m.wanderTimer = 2 + Math.random() * 2.5;
                    const ang = Math.random() * Math.PI * 2;
                    m.targetPx = m.homePx + Math.cos(ang) * 52;
                    m.targetPy = m.homePy + Math.sin(ang) * 52;
                }
            }

            uiTick += dt;
            if (uiTick >= 0.18) {
                uiTick = 0;
                let found: { label: string; kind: 'city' | 'gather' | 'merchant' | 'waypoint' } | null = null;
                if (nextWaypoint) {
                    const wx = waypointPortalPos.tx * CITY_TILE_SIZE;
                    const wy = waypointPortalPos.ty * CITY_TILE_SIZE;
                    if (Math.hypot(wx - p.x, wy - p.y) <= CITY_TILE_SIZE * 1.7) {
                        found = {
                            label: `🌀 다음 경유지: ${nextWaypoint.nation} (${nextWaypoint.city} 방면) [Space]`,
                            kind: 'waypoint'
                        };
                    }
                }
                if (!found) for (const cp of cityPortals) {
                    const cx = (cp.tx + 0.5) * CITY_TILE_SIZE;
                    const cy = (cp.ty + 0.5) * CITY_TILE_SIZE;
                    if (Math.hypot(cx - p.x, cy - p.y) <= CITY_TILE_SIZE * 1.55) {
                        found = {
                            label: cp.isBorder
                                ? `🚩 국경 이동: ${cp.nation} ${cp.city} (${cp.durationText}) [Space]`
                                : `🏰 ${cp.city} 입장 (${cp.isCurrent ? '현재 도시' : cp.durationText}) [Space]`,
                            kind: 'city'
                        };
                        break;
                    }
                }
                if (!found) {
                    const mx = (merchantPos.tx + 0.5) * CITY_TILE_SIZE;
                    const my = (merchantPos.ty + 0.5) * CITY_TILE_SIZE;
                    if (Math.hypot(mx - p.x, my - p.y) <= CITY_TILE_SIZE * 1.6) {
                        found = { label: `🛒 ${merchantPos.name} 거래 [Space]`, kind: 'merchant' };
                    }
                }
                if (!found && !rescueNpcRef.current.rescued && character.lastTravelRescueDate !== (character.currentDate || '2026-01-01')) {
                    const rx = (rescueNpcRef.current.tx + 0.5) * CITY_TILE_SIZE;
                    const ry = (rescueNpcRef.current.ty + 0.5) * CITY_TILE_SIZE;
                    if (Math.hypot(rx - p.x, ry - p.y) <= CITY_TILE_SIZE * 1.55) {
                        found = { label: '🆘 조난당한 여행자 구조 [Space]', kind: 'gather' };
                    }
                }
                if (!found && !bountyNpcRef.current.defeated) {
                    const bx = (bountyNpcRef.current.tx + 0.5) * CITY_TILE_SIZE;
                    const by = (bountyNpcRef.current.ty + 0.5) * CITY_TILE_SIZE;
                    if (Math.hypot(bx - p.x, by - p.y) <= CITY_TILE_SIZE * 1.55) {
                        found = { label: '📜 현상수배범 토벌 [Space]', kind: 'gather' };
                    }
                }
                if (!found) {
                    for (const gn of gatherNodesRef.current) {
                        const gx = (gn.tx + 0.5) * CITY_TILE_SIZE;
                        const gy = (gn.ty + 0.5) * CITY_TILE_SIZE;
                        if (Math.hypot(gx - p.x, gy - p.y) <= CITY_TILE_SIZE * 1.55 && (gn.kind === 'camp' || !gn.collected)) {
                            found = { label: `✨ ${gn.label} [Space]`, kind: 'gather' };
                            break;
                        }
                    }
                }
                setNearbyAction(found);
            }

            const mapW = COLS * CITY_TILE_SIZE;
            const mapH = ROWS * CITY_TILE_SIZE;
            cameraRef.current.x = Math.round(Math.max(0, Math.min(Math.max(0, mapW - viewport.w), p.x - viewport.w / 2)));
            cameraRef.current.y = Math.round(Math.max(0, Math.min(Math.max(0, mapH - viewport.h), p.y - viewport.h / 2)));

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, viewport.w, viewport.h);
                ctx.save();
                const offX = mapW < viewport.w ? Math.floor((viewport.w - mapW) / 2) : -cameraRef.current.x;
                const offY = mapH < viewport.h ? Math.floor((viewport.h - mapH) / 2) : -cameraRef.current.y;
                ctx.translate(offX, offY);

                const customGround = getCachedCityAssetImage(getInteriorPropSpriteUrl(huntStyle.tileKey));
                const customTrail = getCachedCityAssetImage(getInteriorPropSpriteUrl('hunt_tile_trail'));
                const groundImg = customGround?.complete && customGround.naturalWidth > 0 ? customGround : getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
                const trailImg = customTrail?.complete && customTrail.naturalWidth > 0 ? customTrail : getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));

                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        const x = c * CITY_TILE_SIZE;
                        const y = r * CITY_TILE_SIZE;
                        const isBorder = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
                        if (isBorder) {
                            if (wallImg?.complete && wallImg.naturalWidth > 0) ctx.drawImage(wallImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            else {
                                ctx.fillStyle = huntStyle.wall;
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                            continue;
                        }
                        const isRoad = r === 10 || c === 16 || (r >= 5 && r <= 18 && (c === 6 || c === 27));
                        const tile = isRoad ? trailImg : groundImg;
                        if (tile?.complete && tile.naturalWidth > 0) {
                            ctx.drawImage(tile, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        } else {
                            ctx.fillStyle = isRoad ? huntStyle.trail : (r + c) % 2 === 0 ? huntStyle.groundA : huntStyle.groundB;
                            ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        }
                    }
                }

                const ts = CITY_TILE_SIZE;
                // Scenic Props (Trees, Rocks, Spirit Trees, Campfire)
                fieldProps.forEach(pr => {
                    const px = pr.tx * ts;
                    const py = pr.ty * ts;
                    const pw = pr.w * ts;
                    const ph = pr.h * ts;
                    const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                    if (img && img.complete && img.naturalWidth > 0) {
                        const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                        const dw = img.naturalWidth * scale;
                        const dh = img.naturalHeight * scale;
                        ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                    }
                });

                // City & Border Portals
                cityPortals.forEach(cp => {
                    const cx = (cp.tx + 0.5) * ts;
                    const cy = (cp.ty + 0.5) * ts;
                    const color = cp.isCurrent ? '#38bdf8' : cp.isBorder ? '#c084fc' : '#fbbf24';
                    ctx.fillStyle = `${color}33`;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2.2;
                    ctx.stroke();
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(cp.isBorder ? '🚩' : '🏰', cx, cy + 7);

                    const label = cp.isBorder ? `${cp.nation}·${cp.city}` : cp.city;
                    ctx.font = 'bold 10px sans-serif';
                    const tw = Math.max(58, ctx.measureText(label).width + 12);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(cx - tw / 2, cy - 42, tw, 22, 5);
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(label, cx, cy - 31);
                    ctx.fillStyle = '#fde047';
                    ctx.font = '9px sans-serif';
                    ctx.fillText(cp.isCurrent ? '현재 위치' : cp.durationText, cx, cy - 22);
                });

                // Gather & Camp Nodes (Custom 2D Sprites)
                gatherNodesRef.current.forEach(gn => {
                    if (gn.collected && gn.kind !== 'camp') return;
                    const gx = (gn.tx + 0.5) * ts;
                    const gy = (gn.ty + 0.5) * ts;
                    const spriteKey =
                        gn.kind === 'camp'
                            ? 'overland_obj_camp'
                            : gn.id === 'herb_2'
                                ? 'overland_obj_spirit_herb'
                                : gn.kind === 'herb'
                                    ? 'overland_obj_herb'
                                    : gn.kind === 'ore'
                                        ? 'overland_obj_ore'
                                        : 'overland_obj_crystal';
                    const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(spriteKey));
                    if (img && img.complete && img.naturalWidth > 0) {
                        const targetSize = gn.kind === 'camp' ? 54 : 46;
                        const scale = Math.min(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
                        const dw = img.naturalWidth * scale;
                        const dh = img.naturalHeight * scale;
                        ctx.drawImage(img, gx - dw / 2, gy - dh / 2, dw, dh);
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        const icon = gn.kind === 'camp' ? '🔥' : gn.kind === 'herb' ? '🌿' : gn.kind === 'ore' ? '🪨' : '💎';
                        ctx.fillText(icon, gx, gy + 8);
                    }
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillStyle = '#fde68a';
                    ctx.textAlign = 'center';
                    ctx.fillText(gn.label, gx, gy - 26);
                });

                // Wandering Merchant (Wagon + Merchant NPC)
                const mx = (merchantPos.tx + 0.5) * ts;
                const my = (merchantPos.ty + 0.5) * ts;
                const wagonImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_obj_wagon'));
                if (wagonImg && wagonImg.complete && wagonImg.naturalWidth > 0) {
                    const scale = Math.min(62 / wagonImg.naturalWidth, 62 / wagonImg.naturalHeight);
                    const dw = wagonImg.naturalWidth * scale;
                    const dh = wagonImg.naturalHeight * scale;
                    ctx.drawImage(wagonImg, mx + 12 - dw / 2, my - 10 - dh / 2, dw, dh);
                }
                const merchImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_npc_merchant'));
                if (merchImg && merchImg.complete && merchImg.naturalWidth > 0) {
                    const scale = Math.min(46 / merchImg.naturalWidth, 46 / merchImg.naturalHeight);
                    const dw = merchImg.naturalWidth * scale;
                    const dh = merchImg.naturalHeight * scale;
                    ctx.drawImage(merchImg, mx - 10 - dw / 2, my - dh / 2 + 4, dw, dh);
                } else {
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🧳', mx, my + 8);
                }
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#6ee7b7';
                ctx.textAlign = 'center';
                ctx.fillText(merchantPos.name, mx, my - 28);

                // Rescue NPC & Bounty Target (Custom 2D Sprites)
                if (!rescueNpcRef.current.rescued && character.lastTravelRescueDate !== (character.currentDate || '2026-01-01')) {
                    const rx = (rescueNpcRef.current.tx + 0.5) * ts;
                    const ry = (rescueNpcRef.current.ty + 0.5) * ts;
                    const rImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_npc_rescue'));
                    if (rImg && rImg.complete && rImg.naturalWidth > 0) {
                        const scale = Math.min(44 / rImg.naturalWidth, 44 / rImg.naturalHeight);
                        const dw = rImg.naturalWidth * scale;
                        const dh = rImg.naturalHeight * scale;
                        ctx.drawImage(rImg, rx - dw / 2, ry - dh / 2, dw, dh);
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('🆘', rx, ry + 8);
                    }
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillStyle = '#93c5fd';
                    ctx.textAlign = 'center';
                    ctx.fillText('조난 여행자', rx, ry - 26);
                }
                if (!bountyNpcRef.current.defeated) {
                    const bx = (bountyNpcRef.current.tx + 0.5) * ts;
                    const by = (bountyNpcRef.current.ty + 0.5) * ts;
                    const boardImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_obj_bounty_board'));
                    if (boardImg && boardImg.complete && boardImg.naturalWidth > 0) {
                        const scale = Math.min(44 / boardImg.naturalWidth, 44 / boardImg.naturalHeight);
                        const dw = boardImg.naturalWidth * scale;
                        const dh = boardImg.naturalHeight * scale;
                        ctx.drawImage(boardImg, bx + 20 - dw / 2, by - 6 - dh / 2, dw, dh);
                    }
                    const bImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_npc_bounty'));
                    if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                        const scale = Math.min(46 / bImg.naturalWidth, 46 / bImg.naturalHeight);
                        const dw = bImg.naturalWidth * scale;
                        const dh = bImg.naturalHeight * scale;
                        ctx.drawImage(bImg, bx - 6 - dw / 2, by - dh / 2, dw, dh);
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('📜', bx, by + 8);
                    }
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillStyle = '#fda4af';
                    ctx.textAlign = 'center';
                    ctx.fillText('현상수배범', bx, by - 28);
                }

                // Monsters (cached Image + flip)
                monstersRef.current.forEach(m => {
                    if (m.respawnTimer > 0) return;
                    const bob = Math.sin(now * 0.006 + m.px * 0.05) * 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.beginPath();
                    ctx.ellipse(m.px, m.py + 12, 14, 6, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const img = m.visualUrl ? monsterImgCacheRef.current.get(m.visualUrl) : null;
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.save();
                        ctx.translate(m.px, m.py - 4 + bob);
                        if (m.dir === 'left') ctx.scale(-1, 1);
                        ctx.drawImage(img, -20, -22, 40, 40);
                        ctx.restore();
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('👾', m.px, m.py + 6 + bob);
                    }
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillStyle = '#fca5a5';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${m.name} (Lv.${m.levelRange[0]}~${m.levelRange[1]})`, m.px, m.py + 22);
                });

                // Next Waypoint Gate Portal (varies by route direction)
                if (nextWaypoint) {
                    const wx = waypointPortalPos.tx * ts;
                    const wy = waypointPortalPos.ty * ts;
                    const pulse = 0.65 + 0.35 * Math.sin(now * 0.005);
                    ctx.fillStyle = `rgba(16, 185, 129, ${0.28 * pulse})`;
                    ctx.beginPath();
                    ctx.arc(wx, wy, 28, 0, Math.PI * 2);
                    ctx.fill();
                    const pGateImg = getCachedCityAssetImage(getInteriorPropSpriteUrl('overland_obj_portal'));
                    if (pGateImg && pGateImg.complete && pGateImg.naturalWidth > 0) {
                        const scale = Math.min(60 / pGateImg.naturalWidth, 60 / pGateImg.naturalHeight);
                        const dw = pGateImg.naturalWidth * scale;
                        const dh = pGateImg.naturalHeight * scale;
                        ctx.drawImage(pGateImg, wx - dw / 2, wy - dh / 2, dw, dh);
                    } else {
                        ctx.strokeStyle = '#34d399';
                        ctx.lineWidth = 2.5;
                        ctx.stroke();
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('🌀', wx, wy + 7);
                    }
                    const wLabel = `다음 경유지: ${nextWaypoint.nation}`;
                    ctx.font = 'bold 10px sans-serif';
                    const tw = Math.max(88, ctx.measureText(wLabel).width + 14);
                    ctx.fillStyle = 'rgba(6, 78, 59, 0.94)';
                    ctx.beginPath();
                    ctx.roundRect(wx - tw / 2, wy - 50, tw, 22, 5);
                    ctx.fill();
                    ctx.strokeStyle = '#34d399';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#a7f3d0';
                    ctx.textAlign = 'center';
                    ctx.fillText(wLabel, wx, wy - 35);
                }

                // Player (3x4 RPG Spritesheet Slicing matching CityRpgCanvas)
                const pImg = getCachedRpgSpriteImage(playerSpriteUrl);
                const drawSize = 46;
                ctx.fillStyle = 'rgba(0,0,0,0.34)';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y - 2, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                if (pImg && pImg.complete && pImg.naturalWidth > 0) {
                    const cellW = pImg.naturalWidth / 3;
                    const cellH = pImg.naturalHeight / 4;
                    const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                    const col = Math.max(0, Math.min(2, p.frame));
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        pImg,
                        col * cellW,
                        row * cellH,
                        cellW,
                        cellH,
                        Math.round(p.x - drawSize / 2),
                        Math.round(p.y - drawSize + 4),
                        drawSize,
                        drawSize
                    );
                } else {
                    drawFallbackChibiSprite(ctx, p.x, p.y, spriteInfo.regionKey, spriteInfo.genderKey, p.dir, p.frame);
                }
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#fde047';
                ctx.textAlign = 'center';
                ctx.fillText(character.name, p.x, p.y + 14);

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [viewport, cultureKey, huntStyle, playerSpriteUrl, spriteInfo, cityPortals, fieldProps, merchantPos, nextWaypoint, waypointPortalPos, curCity, nation, region, character, onTriggerBattle]);

    const supplyCost = Math.max(150, character.level * 25);

    return (
        <div className="relative flex-1 flex flex-col w-full h-full bg-slate-950 overflow-hidden rounded-xl border border-slate-800">
            <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <Compass size={18} className="text-emerald-400" />
                    <div>
                        <div className="text-sm font-black text-emerald-300 flex items-center gap-2 flex-wrap">
                            <span>{region} · {nation} 도보 탐험 필드</span>
                            {targetDestination && routeWaypoints.length > 0 && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
                                    목표: {targetDestination.nation} {targetDestination.city} ({Math.min(hopIndex + 1, routeWaypoints.length)}/{routeWaypoints.length} 구간)
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {nextWaypoint
                                ? `${waypointPortalPos.dirLabel} 관문(🌀 ${nextWaypoint.nation} 방면)으로 이동해 다음 국가를 거쳐가세요! · 상단(🧳)·채집(🌿🔥) [Space]`
                                : 'WASD/방향키 또는 클릭 이동 · 도시 포탈(🏰)/국경(🚩) 입장 시 도보 시간 경과 · 상단(🧳)·채집(🌿🔥) [Space]'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onExitToAtlas}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                    <ArrowLeft size={14} />
                    세계지도로
                </button>
            </div>

            <div ref={containerRef} className="relative flex-1 w-full min-h-[360px]">
                <canvas
                    ref={canvasRef}
                    width={viewport.w}
                    height={viewport.h}
                    className="w-full h-full block cursor-crosshair"
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mapW = COLS * CITY_TILE_SIZE;
                        const mapH = ROWS * CITY_TILE_SIZE;
                        const offX = mapW < viewport.w ? Math.floor((viewport.w - mapW) / 2) : -cameraRef.current.x;
                        const offY = mapH < viewport.h ? Math.floor((viewport.h - mapH) / 2) : -cameraRef.current.y;
                        playerRef.current.targetX = e.clientX - rect.left - offX;
                        playerRef.current.targetY = e.clientY - rect.top - offY;
                    }}
                />

                {nearbyAction && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                        <button
                            onClick={handleInteract}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl cursor-pointer flex items-center gap-2"
                        >
                            {nearbyAction.kind === 'city' ? <Compass size={15} /> : nearbyAction.kind === 'merchant' ? <ShoppingBag size={15} /> : <Flame size={15} />}
                            {nearbyAction.label}
                        </button>
                    </div>
                )}

                {toastMsg && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-xs font-bold text-emerald-200 shadow-lg flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400" />
                        {toastMsg}
                    </div>
                )}

                {merchantOpen && (
                    <div className="absolute inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                                    <ShoppingBag size={16} />
                                    {merchantPos.name} — 야외 보급 상단
                                </h4>
                                <button onClick={() => setMerchantOpen(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                                    닫기
                                </button>
                            </div>
                            <p className="text-xs text-slate-300">
                                &ldquo;{nation} 일대는 최근 마물 출몰이 잦습니다. 길 떠나기 전 보급품을 챙기시겠소?&rdquo;
                            </p>
                            <button
                                disabled={character.money < supplyCost}
                                onClick={() => {
                                    onApplyExploreDelta({
                                        goldDelta: -supplyCost,
                                        hpPctDelta: 50,
                                        mpPctDelta: 50,
                                        logMessage: `[유랑 상단] ${supplyCost.toLocaleString()}G로 보급 비약을 구매해 HP/MP 50%를 회복했습니다.`
                                    });
                                    showToast('🧪 야외 보급 완료 (HP/MP +50%)');
                                    setMerchantOpen(false);
                                }}
                                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs cursor-pointer"
                            >
                                여정 보급 비약 구매 (-{supplyCost.toLocaleString()}G · HP/MP +50%)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverlandExploreCanvas;
