import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BaseDecorationItem, Character, FacilityInstance, JobType } from '../types';
import { CanvasCharacterHud } from './CanvasCharacterHud';
import { CanvasVisualEvent } from '../utils/canvasEventVisualizer';
import { FACILITIES_INFO, FACILITY_CONSTRUCTION_COSTS, FACILITY_UPGRADE_CONFIG } from '../constants';
import {
    BASE_DECORATION_CATALOG,
    BASE_FLOOR_TILE_CATALOG,
    BASE_MAX_MAP_SIZE_BY_LEVEL,
    BASE_TILE_SIZE,
    BaseFacilityNode,
    BaseFarmMonsterEntity,
    BaseFloorTileId,
    BaseResidentEntity,
    canPlaceFacilityRect,
    FLOOR_TILE_MAP,
    generateBaseTilemap,
    getBaseMapExpansionOption,
    getFacilityFootprint,
    resolveDecorationSpriteUrl,
    validateFacilityLevelUpSpaceFromMapData
} from '../services/baseTilemapEngine';
import {
    getCachedCityAssetImage,
    getTerrainTileUrl,
    loadCityAssetImage,
    TerrainTilePart
} from '../services/cityAssetManifest';
import {
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import {
    calculateCompletionDateTime,
    getConstructionRemainingTime,
    getFacilityConstructionDuration
} from '../services/baseConstructionService';
import { getTimeOfDay } from '../services/gameTimeService';
import FacilityInteriorCanvas from './FacilityInteriorCanvas';
import ResidentQuickCard from './base/ResidentQuickCard';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    DoorOpen,
    Expand,
    Footprints,
    Hammer,
    Home,
    MapPin,
    Move,
    Paintbrush,
    PawPrint,
    Plus,
    Settings,
    Trash2,
    Trees,
    Users,
    X
} from 'lucide-react';

interface BaseRpgCanvasProps {
    character: Character;
    onExitToCity: () => void;
    onOpenBaseModal: (initialSubModal?: string) => void;
    onInspectCompanion?: (companionId: string) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string) => void;
}

type BaseEditorMode = 'explore' | 'build' | 'paint' | 'decorate';

const DIR_ROW_MAP: Record<SpriteDirection, number> = {
    down: 0,
    left: 1,
    right: 2,
    up: 3
};

const TERRAIN_CHUNK_TILES = 16;
const MAX_TERRAIN_CHUNKS = 36;
const MIN_SCALED_IMG_CACHE = 512;
const MAX_SCALED_IMG_CACHE = 2048;
const MAX_TEXT_WIDTH_CACHE = 2048;
const MIN_BADGE_SPRITE_CACHE = 1024;
const MAX_BADGE_SPRITE_CACHE = 2400;
const DENSE_BUBBLE_RESIDENT_THRESHOLD = 20;
const DENSE_NAMEPLATE_RESIDENT_THRESHOLD = 120;
const NEARBY_BUBBLE_DIST_SQ = (BASE_TILE_SIZE * 5) * (BASE_TILE_SIZE * 5);

interface CachedTerrainChunk {
    canvas: HTMLCanvasElement;
    loadedCount: number;
}

interface ActorRenderSlot {
    px: number;
    py: number;
    dir: SpriteDirection;
    walkFrame: number;
    url: string;
    name: string;
    bubble: string | undefined;
    isPlayer: boolean;
    isLover: boolean;
    showNameplate: boolean;
    distSq: number;
}

const BaseRpgCanvas: React.FC<BaseRpgCanvasProps> = ({
    character,
    onExitToCity,
    onOpenBaseModal,
    onInspectCompanion,
    onUpdateCharacter
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 600 });

    // 4-Mode Editor State
    const [mode, setMode] = useState<BaseEditorMode>('explore');
    const [movingFacility, setMovingFacility] = useState<BaseFacilityNode | null>(null);
    const [placingNewFacilityId, setPlacingNewFacilityId] = useState<string | null>(null);
    const [showNewFacilityPicker, setShowNewFacilityPicker] = useState(false);

    // Tile Painting State
    const [selectedFloorTile, setSelectedFloorTile] = useState<BaseFloorTileId>('stone_road');
    const [brushSize, setBrushSize] = useState<1 | 3 | 5>(1);
    const isPaintingDragRef = useRef(false);
    const lastPaintedTileRef = useRef<{ tx: number; ty: number; tile: BaseFloorTileId; brush: number } | null>(null);
    const selfPaintedTilesRef = useRef<Record<string, string> | null>(null);

    // Decoration State
    const [decoCategory, setDecoCategory] = useState<'자연·정원' | '마을·가구' | '신비·성채'>('자연·정원');
    const [selectedDecoKey, setSelectedDecoKey] = useState<string>(BASE_DECORATION_CATALOG[0].key);
    const [decoEraseMode, setDecoEraseMode] = useState(false);

    // Interaction / HUD State
    const [selectedResident, setSelectedResident] = useState<BaseResidentEntity | null>(null);
    const [selectedMonster, setSelectedMonster] = useState<BaseFarmMonsterEntity | null>(null);
    const [selectedFacility, setSelectedFacility] = useState<BaseFacilityNode | null>(null);
    const [showFacilityAssignDrawer, setShowFacilityAssignDrawer] = useState(false);
    const [activeInteriorFacility, setActiveInteriorFacility] = useState<BaseFacilityNode | null>(null);
    const [isInteriorFading, setIsInteriorFading] = useState(false);
    const [facilityNotice, setFacilityNotice] = useState<string | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [showMinimap, setShowMinimap] = useState(true);
    const [showWarpList, setShowWarpList] = useState(false);
    const [showBaseEventDrawer, setShowBaseEventDrawer] = useState(false);

    const baseEvents = useMemo<CanvasVisualEvent[]>(
        () => ((character.recentCanvasEvents || []) as CanvasVisualEvent[]).filter(e => e?.domain === 'base'),
        [character.recentCanvasEvents]
    );
    const baseVisualQueueRef = useRef<
        { x: number; y: number; text: string; color: string; border: string; expiresAt: number; floatUp: boolean }[]
    >([]);
    const baseEventParticlesRef = useRef<
        { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number }[]
    >([]);
    const seenBaseEventIdsRef = useRef<Set<string>>(new Set());
    const hasPendingAttackRef = useRef<boolean>(false);
    hasPendingAttackRef.current = Boolean(character.pendingBaseAttackEvent);

    const base = character.base;
    const loc = base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const mapHourBucket = Math.floor((parseInt((character.currentTime || '12:00').split(':')[0] || '12', 10) || 12) / 4);
    const mapData = useMemo(
        () => generateBaseTilemap(character),
        [
            base?.level,
            base?.mapWidth,
            base?.mapHeight,
            base?.hqPos,
            base?.location,
            base?.customBuildingPack,
            base?.underConstruction,
            base?.targetLevel,
            base?.exteriorRemodelUnderConstruction,
            base?.customTiles,
            base?.layout,
            base?.decorations,
            base?.houses,
            base?.assignments,
            base?.multiAssignments,
            base?.houseAssignments,
            base?.dispatched,
            base?.combatTraining,
            character.companions?.length,
            character.inactiveCompanions?.length,
            character.mercenaryData?.groupMissions?.length,
            character.currentLocation?.city,
            character.currentDate,
            mapHourBucket,
            character.level,
            character.classTier
        ]
    );
    const baseLevel = mapData.baseLevel;
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, loc.region, loc.nation).url,
        [
            character.rpgSpriteKey,
            character.customSpriteUrl,
            character.race,
            character.id,
            character.name,
            character.gender,
            character.appearance,
            character.classType,
            loc.region,
            loc.nation
        ]
    );

    const spatialIndex = useMemo(() => {
        const cellSize = TERRAIN_CHUNK_TILES;
        const cellCols = Math.max(1, Math.ceil(mapData.cols / cellSize));
        const cellRows = Math.max(1, Math.ceil(mapData.rows / cellSize));
        const facilityCells = new Map<number, number[]>();
        mapData.facilities.forEach((f, idx) => {
            const cx0 = Math.max(0, Math.floor(f.tileX / cellSize));
            const cy0 = Math.max(0, Math.floor((f.tileY - 1) / cellSize));
            const cx1 = Math.min(cellCols - 1, Math.floor((f.tileX + f.tileW - 1) / cellSize));
            const cy1 = Math.min(cellRows - 1, Math.floor((f.tileY + f.tileH) / cellSize));
            for (let cy = cy0; cy <= cy1; cy++) {
                for (let cx = cx0; cx <= cx1; cx++) {
                    const key = cy * cellCols + cx;
                    let list = facilityCells.get(key);
                    if (!list) {
                        list = [];
                        facilityCells.set(key, list);
                    }
                    list.push(idx);
                }
            }
        });
        const decorationCells = new Map<number, BaseDecorationItem[]>();
        mapData.decorations.forEach(d => {
            const cx = Math.floor(d.x / cellSize);
            const cy = Math.floor(d.y / cellSize);
            const key = cy * cellCols + cx;
            let list = decorationCells.get(key);
            if (!list) {
                list = [];
                decorationCells.set(key, list);
            }
            list.push(d);
        });
        return { cellSize, cellCols, cellRows, facilityCells, decorationCells };
    }, [mapData]);

    const residentsRef = useRef<BaseResidentEntity[]>(mapData.residents);
    const monstersRef = useRef<BaseFarmMonsterEntity[]>(mapData.farmMonsters);
    const mapFacilitiesRef = useRef(mapData.facilities);
    mapFacilitiesRef.current = mapData.facilities;

    const enqueueBaseVisualEvents = useCallback(
        (evList: CanvasVisualEvent[], forceReplay = false) => {
            if (!evList || evList.length === 0) return;
            const nowMs = Date.now();
            const toneColors: Record<string, { color: string; border: string }> = {
                positive: { color: 'rgba(6, 78, 59, 0.94)', border: '#34d399' },
                negative: { color: 'rgba(136, 19, 55, 0.94)', border: '#fb7185' },
                warning: { color: 'rgba(120, 53, 15, 0.95)', border: '#fbbf24' },
                special: { color: 'rgba(49, 46, 129, 0.94)', border: '#a78bfa' },
                neutral: { color: 'rgba(15, 23, 42, 0.92)', border: '#38bdf8' }
            };
            const facs = mapFacilitiesRef.current || [];
            const hqFac = facs[0];
            const defaultX = hqFac ? (hqFac.tileX + hqFac.tileW / 2) * BASE_TILE_SIZE : 400;
            const defaultY = hqFac ? (hqFac.tileY + hqFac.tileH / 2) * BASE_TILE_SIZE : 400;

            for (const ev of evList) {
                if (!forceReplay && seenBaseEventIdsRef.current.has(ev.id)) continue;
                seenBaseEventIdsRef.current.add(ev.id);
                if (baseVisualQueueRef.current.length >= 12) break;

                let tx = defaultX;
                let ty = defaultY;
                let floatUp = false;

                if (ev.actorName) {
                    const matchedRes = residentsRef.current.find(r => r.name === ev.actorName);
                    if (matchedRes) {
                        tx = matchedRes.px;
                        ty = matchedRes.py;
                    }
                } else if (ev.facilityType) {
                    const matchedFac = facs.find(f => f.type === ev.facilityType || f.type.includes(ev.facilityType!));
                    if (matchedFac) {
                        tx = (matchedFac.tileX + matchedFac.tileW / 2) * BASE_TILE_SIZE;
                        ty = (matchedFac.tileY + matchedFac.tileH / 2) * BASE_TILE_SIZE;
                        floatUp = true;
                    }
                } else if (ev.kind === 'base_harvest' || ev.kind === 'base_build_complete') {
                    floatUp = true;
                }

                const pal = toneColors[ev.tone] || toneColors.neutral;
                baseVisualQueueRef.current.push({
                    x: tx,
                    y: ty,
                    text: (ev.floatingText || ev.bubbleText || `${ev.emoji} ${ev.title}`).slice(0, 22),
                    color: pal.color,
                    border: pal.border,
                    expiresAt: nowMs + 4500,
                    floatUp
                });

                if (baseEventParticlesRef.current.length < 25) {
                    const pCount = Math.min(4, 25 - baseEventParticlesRef.current.length);
                    for (let pi = 0; pi < pCount; pi++) {
                        baseEventParticlesRef.current.push({
                            x: tx + (Math.random() - 0.5) * 20,
                            y: ty - 16,
                            vx: (Math.random() - 0.5) * 32,
                            vy: -18 - Math.random() * 24,
                            color: pal.border,
                            life: 0,
                            maxLife: 1.4
                        });
                    }
                }
            }
        },
        []
    );

    useEffect(() => {
        if (baseEvents.length > 0) {
            enqueueBaseVisualEvents(baseEvents, false);
        }
    }, [baseEvents, enqueueBaseVisualEvents]);
    const hoverTileRef = useRef<{ x: number; y: number } | null>(null);
    const hoverWorldRef = useRef<{ wx: number; wy: number } | null>(null);
    const prevNearbyLabelRef = useRef<string | null>(null);
    const textWidthCacheRef = useRef<Map<string, number>>(new Map());
    const scaledImgCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const badgeSpriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const activeScaledImgCapRef = useRef<number>(MIN_SCALED_IMG_CACHE);
    const activeBadgeCapRef = useRef<number>(MIN_BADGE_SPRITE_CACHE);
    const terrainChunksRef = useRef<Map<string, CachedTerrainChunk>>(new Map());
    const minimapBgCacheRef = useRef<HTMLCanvasElement | null>(null);
    const minimapBgDirtyRef = useRef<boolean>(true);
    const lanternCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const preloadedUrlsRef = useRef<Set<string>>(new Set());
    const mapDataVersionRef = useRef(0);
    const latestCharacterRef = useRef<Character>(character);
    latestCharacterRef.current = character;
    const mapDataRef = useRef(mapData);
    mapDataRef.current = mapData;
    const spatialIndexRef = useRef(spatialIndex);
    spatialIndexRef.current = spatialIndex;
    const playerSpriteUrlRef = useRef(playerSpriteUrl);
    playerSpriteUrlRef.current = playerSpriteUrl;
    const viewportSizeRef = useRef(viewportSize);
    viewportSizeRef.current = viewportSize;
    const selectedResidentIdRef = useRef<string | null>(null);
    selectedResidentIdRef.current = selectedResident?.id || null;
    const interiorFadeTimerRef = useRef<number | null>(null);
    const prevTerrainSigRef = useRef<{
        cols: number;
        rows: number;
        cultureKey: string;
        customTiles: unknown;
        layoutRef: unknown;
        hqSig: string;
    } | null>(null);

    const measureCachedText = (ctx: CanvasRenderingContext2D, key: string, text: string): number => {
        const cache = textWidthCacheRef.current;
        let w = cache.get(key);
        if (w !== undefined) {
            cache.delete(key);
            cache.set(key, w);
            return w;
        }
        w = ctx.measureText(text).width;
        if (cache.size >= MAX_TEXT_WIDTH_CACHE) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
        cache.set(key, w);
        return w;
    };

    const getCachedBadgeSprite = (
        cacheKey: string,
        font: string,
        text: string,
        minWidth: number,
        padX: number,
        boxHeight: number,
        bgColor: string,
        borderColor: string | null,
        textColor: string,
        textY: number
    ): HTMLCanvasElement => {
        const cache = badgeSpriteCacheRef.current;
        let canvas = cache.get(cacheKey);
        if (canvas) {
            cache.delete(cacheKey);
            cache.set(cacheKey, canvas);
            return canvas;
        }
        canvas = document.createElement('canvas');
        const bctx = canvas.getContext('2d');
        let bw = minWidth;
        if (bctx) {
            bctx.font = font;
            const measured = measureCachedText(bctx, cacheKey, text);
            bw = Math.ceil(Math.max(minWidth, measured + padX));
        }
        const cw = bw + 2;
        const ch = boxHeight + 2;
        canvas.width = cw;
        canvas.height = ch;
        const ctx2 = canvas.getContext('2d');
        if (ctx2) {
            ctx2.clearRect(0, 0, cw, ch);
            ctx2.fillStyle = bgColor;
            ctx2.fillRect(1, 1, bw, boxHeight);
            if (borderColor) {
                ctx2.strokeStyle = borderColor;
                ctx2.lineWidth = 1;
                ctx2.strokeRect(1, 1, bw, boxHeight);
            }
            ctx2.font = font;
            ctx2.textAlign = 'center';
            ctx2.fillStyle = textColor;
            ctx2.fillText(text, cw / 2, textY + 1);
        }
        const cap = activeBadgeCapRef.current;
        if (cache.size >= cap) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
        cache.set(cacheKey, canvas);
        return canvas;
    };

    const drawScaledImg = (
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        cacheKey: string,
        dx: number,
        dy: number,
        dw: number,
        dh: number
    ) => {
        const w = Math.max(1, Math.round(dw));
        const h = Math.max(1, Math.round(dh));
        const key = `${cacheKey}|${w}x${h}`;
        const cache = scaledImgCacheRef.current;
        let cached = cache.get(key);
        if (cached) {
            cache.delete(key);
            cache.set(key, cached);
        } else {
            cached = document.createElement('canvas');
            cached.width = w;
            cached.height = h;
            const cctx = cached.getContext('2d');
            if (cctx) {
                cctx.clearRect(0, 0, w, h);
                cctx.imageSmoothingEnabled = true;
                cctx.imageSmoothingQuality = 'medium';
                cctx.drawImage(img, 0, 0, w, h);
            }
            const cap = activeScaledImgCapRef.current;
            if (cache.size >= cap) {
                const oldestKey = cache.keys().next().value;
                if (oldestKey !== undefined) cache.delete(oldestKey);
            }
            cache.set(key, cached);
        }
        ctx.drawImage(cached, Math.round(dx), Math.round(dy));
    };

    const selectedFacilitySpaceVal = useMemo(() => {
        if (!selectedFacility) return null;
        return validateFacilityLevelUpSpaceFromMapData(
            mapData,
            selectedFacility.isHq ? 'hq' : selectedFacility.instanceId || selectedFacility.facilityType
        );
    }, [mapData, selectedFacility]);
    const selectedFacilitySpaceOk = selectedFacilitySpaceVal ? selectedFacilitySpaceVal.ok : true;

    const playerLoverKeys = useMemo(() => {
        const set = new Set<string>();
        const all = [
            ...(character.companions || []),
            ...(character.inactiveCompanions || []),
            ...(character.socialNetwork || [])
        ];
        all.forEach((t: any) => {
            if (t && t.isLover && (t.partnerId === 'player' || (!t.partnerId && !t.partnerName))) {
                if (t.id) set.add(t.id);
                if (t.name) set.add(t.name);
            }
        });
        return set;
    }, [character.companions, character.inactiveCompanions, character.socialNetwork]);
    const playerLoverKeysRef = useRef(playerLoverKeys);
    playerLoverKeysRef.current = playerLoverKeys;

    const companionPartnerMap = useMemo(() => {
        const map = new Map<string, string>();
        const all = [...(character.companions || []), ...(character.inactiveCompanions || [])];
        all.forEach((c: any) => {
            if (!c?.id || !c.relations) return;
            for (const [targetId, rel] of Object.entries<any>(c.relations)) {
                if (targetId === 'player') continue;
                if (rel?.type === 'Lover' || rel?.type === 'Spouse' || rel?.type === '연인' || rel?.type === '배우자') {
                    map.set(c.id, targetId);
                    map.set(targetId, c.id);
                    break;
                }
            }
        });
        return map;
    }, [character.companions, character.inactiveCompanions]);
    const companionPartnerMapRef = useRef(companionPartnerMap);
    companionPartnerMapRef.current = companionPartnerMap;

    useEffect(() => {
        mapDataVersionRef.current += 1;
        const prevById = new Map(residentsRef.current.map(r => [r.id, r]));
        const solidGrid = mapData.solidGrid;
        residentsRef.current = mapData.residents.map(r => {
            const prev = prevById.get(r.id);
            if (!prev) return { ...r };
            const prevTx = Math.floor(prev.px / BASE_TILE_SIZE);
            const prevTy = Math.floor(prev.py / BASE_TILE_SIZE);
            const prevBlocked =
                prevTx < 0 ||
                prevTy < 0 ||
                prevTx >= mapData.cols ||
                prevTy >= mapData.rows ||
                (solidGrid ? solidGrid[prevTy * mapData.cols + prevTx] === 1 : mapData.solidSet.has(`${prevTx},${prevTy}`));
            if (prevBlocked) {
                return { ...r };
            }
            return {
                ...r,
                px: prev.px,
                py: prev.py,
                dir: prev.dir,
                walkFrame: prev.walkFrame,
                animTimer: prev.animTimer,
                wanderTimer: prev.wanderTimer,
                targetPx: prev.targetPx,
                targetPy: prev.targetPy
            };
        });
        monstersRef.current = mapData.farmMonsters.map(m => ({ ...m }));

        const prevSig = prevTerrainSigRef.current;
        const curCustomTiles = base?.customTiles;
        const curLayout = base?.layout;
        const hqNode = mapData.facilities[0];
        const curHqSig = hqNode ? `${mapData.baseLevel}:${hqNode.tileX},${hqNode.tileY},${hqNode.tileW},${hqNode.tileH}` : `${mapData.baseLevel}`;
        if (
            !prevSig ||
            prevSig.cols !== mapData.cols ||
            prevSig.rows !== mapData.rows ||
            prevSig.cultureKey !== mapData.cultureKey ||
            prevSig.hqSig !== curHqSig
        ) {
            selfPaintedTilesRef.current = null;
            terrainChunksRef.current.clear();
            minimapBgDirtyRef.current = true;
        } else if (prevSig.customTiles !== curCustomTiles) {
            if (selfPaintedTilesRef.current && selfPaintedTilesRef.current === curCustomTiles) {
                selfPaintedTilesRef.current = null;
            } else {
                terrainChunksRef.current.forEach(chunk => {
                    chunk.loadedCount = -1;
                });
            }
            minimapBgDirtyRef.current = true;
        } else if (prevSig.layoutRef !== curLayout) {
            minimapBgDirtyRef.current = true;
        }
        prevTerrainSigRef.current = {
            cols: mapData.cols,
            rows: mapData.rows,
            cultureKey: mapData.cultureKey,
            customTiles: curCustomTiles,
            layoutRef: curLayout,
            hqSig: curHqSig
        };
    }, [mapData, base?.customTiles, base?.layout, base?.hqPos]);

    // Preload sprites, buildings, terrain & decorations (deduped via preloadedUrlsRef)
    useEffect(() => {
        const seen = preloadedUrlsRef.current;
        const preloadRpg = (url?: string) => {
            if (!url || seen.has(url)) return;
            seen.add(url);
            loadRpgSpriteImage(url);
        };
        const preloadCity = (url?: string) => {
            if (!url || seen.has(url)) return;
            seen.add(url);
            loadCityAssetImage(url);
        };

        preloadRpg(playerSpriteUrl);
        for (const r of mapData.residents) preloadRpg(r.spriteUrl);

        (['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).forEach(p => {
            preloadCity(getTerrainTileUrl(mapData.cultureKey, p));
        });
        for (const f of mapData.facilities) {
            preloadCity(f.spriteUrl);
            preloadCity(f.constructionSpriteUrl);
        }
        for (const d of mapData.decorations) {
            preloadCity(resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part));
        }
        for (const d of BASE_DECORATION_CATALOG) {
            preloadCity(resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part));
        }
        for (const m of mapData.farmMonsters) {
            preloadCity(m.visualUrl);
        }
    }, [playerSpriteUrl, mapData]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (interiorFadeTimerRef.current !== null) {
                window.clearTimeout(interiorFadeTimerRef.current);
                interiorFadeTimerRef.current = null;
            }
        };
    }, []);

    // Resize observer (re-attaches whenever returning from FacilityInteriorCanvas)
    useEffect(() => {
        if (activeInteriorFacility) return;
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 80 && height > 80) {
                    setViewportSize({ w: Math.floor(width), h: Math.floor(height) });
                }
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [activeInteriorFacility]);

    // Player runtime state
    const playerRef = useRef({
        x: mapData.spawnPos.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2,
        y: mapData.spawnPos.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2,
        dir: 'up' as SpriteDirection,
        moving: false,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());
    const dpadRef = useRef<SpriteDirection | null>(null);
    const cameraRef = useRef({
        x: Math.max(0, mapData.spawnPos.x * BASE_TILE_SIZE - 480),
        y: Math.max(0, mapData.spawnPos.y * BASE_TILE_SIZE - 300)
    });
    const exitCooldownRef = useRef<number>(Date.now() + 900);

    // Clamp player inside bounds if map size changes
    useEffect(() => {
        const p = playerRef.current;
        p.x = Math.max(BASE_TILE_SIZE * 2, Math.min((mapData.cols - 2) * BASE_TILE_SIZE, p.x));
        p.y = Math.max(BASE_TILE_SIZE * 2, Math.min((mapData.rows - 2.5) * BASE_TILE_SIZE, p.y));
    }, [mapData.cols, mapData.rows]);

    const openFacilityModal = useCallback((fac: BaseFacilityNode) => {
        if (interiorFadeTimerRef.current !== null) {
            window.clearTimeout(interiorFadeTimerRef.current);
        }
        setIsInteriorFading(true);
        interiorFadeTimerRef.current = window.setTimeout(() => {
            interiorFadeTimerRef.current = null;
            setActiveInteriorFacility(fac);
            setIsInteriorFading(false);
        }, 120);
    }, []);

    const findNearestInteractable = useCallback(() => {
        const p = playerRef.current;
        const m = mapDataRef.current;
        const si = spatialIndexRef.current;

        let bestRes: BaseResidentEntity | null = null;
        let bestResDSq = (BASE_TILE_SIZE * 1.45) * (BASE_TILE_SIZE * 1.45);
        for (const r of residentsRef.current) {
            const dx = r.px - p.x;
            const dy = r.py - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < bestResDSq) {
                bestResDSq = dSq;
                bestRes = r;
            }
        }
        if (bestRes) return { kind: 'resident' as const, resident: bestRes };

        let bestMon: BaseFarmMonsterEntity | null = null;
        let bestMonDSq = (BASE_TILE_SIZE * 1.45) * (BASE_TILE_SIZE * 1.45);
        for (const mon of monstersRef.current) {
            const dx = mon.px - p.x;
            const dy = mon.py - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < bestMonDSq) {
                bestMonDSq = dSq;
                bestMon = mon;
            }
        }
        if (bestMon) return { kind: 'monster' as const, monster: bestMon };

        let bestFac: BaseFacilityNode | null = null;
        let bestFacDSq = (BASE_TILE_SIZE * 2.1) * (BASE_TILE_SIZE * 2.1);
        const ptx = Math.floor(p.x / BASE_TILE_SIZE);
        const pty = Math.floor(p.y / BASE_TILE_SIZE);
        const pcx = Math.floor(ptx / si.cellSize);
        const pcy = Math.floor(pty / si.cellSize);
        const cx0 = Math.max(0, pcx - 1);
        const cx1 = Math.min(si.cellCols - 1, pcx + 1);
        const cy0 = Math.max(0, pcy - 1);
        const cy1 = Math.min(si.cellRows - 1, pcy + 1);
        for (let cy = cy0; cy <= cy1; cy++) {
            for (let cx = cx0; cx <= cx1; cx++) {
                const indices = si.facilityCells.get(cy * si.cellCols + cx);
                if (!indices) continue;
                for (let i = 0; i < indices.length; i++) {
                    const f = m.facilities[indices[i]];
                    if (!f) continue;
                    const fx = (f.doorX + 0.5) * BASE_TILE_SIZE;
                    const fy = (f.doorY + 0.5) * BASE_TILE_SIZE;
                    const dx = fx - p.x;
                    const dy = fy - p.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < bestFacDSq) {
                        bestFacDSq = dSq;
                        bestFac = f;
                    }
                }
            }
        }
        if (bestFac) return { kind: 'facility' as const, facility: bestFac };
        return null;
    }, []);

    const handleInteract = useCallback(() => {
        if (rafStateRef.current.mode !== 'explore') return;
        const target = findNearestInteractable();
        if (!target) return;
        if (target.kind === 'resident') {
            setSelectedResident(target.resident);
            setSelectedMonster(null);
            setSelectedFacility(null);
            setFacilityNotice(null);
        } else if (target.kind === 'monster') {
            setSelectedMonster(target.monster);
            setSelectedResident(null);
            setSelectedFacility(null);
            setFacilityNotice(null);
        } else {
            setSelectedFacility(target.facility);
            setSelectedResident(null);
            setSelectedMonster(null);
            setFacilityNotice(null);
        }
    }, [findNearestInteractable]);

    // Keyboard controls (supports Korean IME via e.code and ignores key repeat)
    useEffect(() => {
        const mapMoveKey = (e: KeyboardEvent): string | null => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') return 'w';
            if (e.code === 'KeyS' || e.code === 'ArrowDown') return 's';
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') return 'a';
            if (e.code === 'KeyD' || e.code === 'ArrowRight') return 'd';
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) return k;
            return null;
        };
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const mv = mapMoveKey(e);
            if (mv) {
                e.preventDefault();
                if (e.repeat) return;
                keysRef.current.add(mv);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
                return;
            }
            const k = e.key.toLowerCase();
            if (k === ' ' || k === 'enter' || k === 'e' || e.code === 'KeyE' || e.code === 'Space') {
                e.preventDefault();
                if (!e.repeat) handleInteract();
            } else if (k === 'escape') {
                setMovingFacility(null);
                setPlacingNewFacilityId(null);
                setShowNewFacilityPicker(false);
                setSelectedResident(null);
                setSelectedMonster(null);
                setSelectedFacility(null);
                setFacilityNotice(null);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            const mv = mapMoveKey(e);
            if (mv) keysRef.current.delete(mv);
            keysRef.current.delete(e.key.toLowerCase());
        };
        const onBlur = () => {
            keysRef.current.clear();
            dpadRef.current = null;
            isPaintingDragRef.current = false;
            lastPaintedTileRef.current = null;
            hoverTileRef.current = null;
            hoverWorldRef.current = null;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [handleInteract]);

    // 1. Expand Base Map Size (Lv.1: 40x40 -> Lv.5: 200x200) — 공사 타이머 적용!
    const expansionOpt = getBaseMapExpansionOption(mapData.baseLevel, mapData.cols, mapData.rows);
    const isMapExpanding = Boolean(character.base?.mapExpansionUnderConstruction);
    const mapExpandRemaining =
        isMapExpanding &&
        character.base?.mapExpansionCompletionDate &&
        character.base?.mapExpansionCompletionTime
            ? getConstructionRemainingTime(
                  character.currentDate || '2000-03-02',
                  character.currentTime || '08:00',
                  character.base.mapExpansionCompletionDate,
                  character.base.mapExpansionCompletionTime
              )
            : null;

    const handleExpandMapSize = () => {
        if (!character.base || !onUpdateCharacter || !expansionOpt.canExpand || isMapExpanding) return;
        const base = character.base;
        const curGold = character.money || 0;
        const curFood = base.resources?.food || 0;
        const curWood = base.resources?.wood || 0;
        const curStone = base.resources?.stone || 0;
        const curIron = base.resources?.iron || 0;
        const curMana = base.resources?.manaCrystal || 0;
        if (
            curGold < expansionOpt.goldCost ||
            curFood < expansionOpt.foodCost ||
            curWood < expansionOpt.woodCost ||
            curStone < expansionOpt.stoneCost ||
            curIron < expansionOpt.ironCost ||
            curMana < expansionOpt.manaCrystalCost
        ) {
            return;
        }
        const startDate = character.currentDate || '2000-03-02';
        const startTime = character.currentTime || '08:00';
        // 목표 크기에 비례한 공사 기간 (12시간 ~ 48시간)
        const durationMin = Math.max(720, Math.min(2880, (expansionOpt.nextSize - 20) * 24));
        const { completionDate, completionTime } = calculateCompletionDateTime(startDate, startTime, durationMin);

        const nextChar: Character = {
            ...character,
            money: curGold - expansionOpt.goldCost,
            base: {
                ...base,
                mapExpansionUnderConstruction: true,
                targetMapSize: expansionOpt.nextSize,
                mapExpansionStartDate: startDate,
                mapExpansionStartTime: startTime,
                mapExpansionCompletionDate: completionDate,
                mapExpansionCompletionTime: completionTime,
                mapExpansionTotalMinutes: durationMin,
                resources: {
                    ...base.resources,
                    food: curFood - expansionOpt.foodCost,
                    wood: curWood - expansionOpt.woodCost,
                    stone: curStone - expansionOpt.stoneCost,
                    iron: curIron - expansionOpt.ironCost,
                    manaCrystal: curMana - expansionOpt.manaCrystalCost
                }
            }
        };
        onUpdateCharacter(
            nextChar,
            `[영지 확장 착공] 기지 부지를 ${expansionOpt.nextSize}×${expansionOpt.nextSize} 타일로 확장하는 공사를 시작했습니다! (완공 예정: ${completionDate} ${completionTime})`
        );
    };

    // 2. Paint Floor Tiles (per-tile purchase; default tile is free!)
    const paintTilesAt = useCallback(
        (centerX: number, centerY: number) => {
            lastPaintedTileRef.current = { tx: centerX, ty: centerY, tile: selectedFloorTile, brush: brushSize };
            const curChar = latestCharacterRef.current;
            const curBase = curChar.base;
            if (!curBase || !onUpdateCharacter) return;
            const tileDef = FLOOR_TILE_MAP[selectedFloorTile];
            if (!tileDef) return;
            const curMap = mapDataRef.current;
            const half = Math.floor(brushSize / 2);
            const curCustomTiles = curBase.customTiles || {};
            const toChange: string[] = [];
            let minTx = centerX;
            let maxTx = centerX;
            let minTy = centerY;
            let maxTy = centerY;

            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const tx = centerX + dx;
                    const ty = centerY + dy;
                    if (tx < 1 || ty < 1 || tx >= curMap.cols - 1 || ty >= curMap.rows - 1) continue;
                    const key = `${tx},${ty}`;
                    const curId =
                        key in curCustomTiles
                            ? curCustomTiles[key]
                            : curMap.floorOverrides[key] || 'default';
                    if (curId === selectedFloorTile) continue;
                    toChange.push(key);
                    if (tx < minTx) minTx = tx;
                    if (tx > maxTx) maxTx = tx;
                    if (ty < minTy) minTy = ty;
                    if (ty > maxTy) maxTy = ty;
                }
            }
            if (toChange.length === 0) return;

            const totalGold = toChange.length * tileDef.gold;
            const totalWood = toChange.length * tileDef.wood;
            const totalStone = toChange.length * tileDef.stone;
            const curGold = curChar.money || 0;
            const curWood = curBase.resources?.wood || 0;
            const curStone = curBase.resources?.stone || 0;
            if (curGold < totalGold || curWood < totalWood || curStone < totalStone) return;

            const prevCustom = { ...curCustomTiles };
            toChange.forEach(k => {
                prevCustom[k] = selectedFloorTile;
            });

            // Invalidate only touched terrain chunks (1-4 chunks), reusing their offscreen canvases
            const c0 = Math.floor(minTx / TERRAIN_CHUNK_TILES);
            const c1 = Math.floor(maxTx / TERRAIN_CHUNK_TILES);
            const r0 = Math.floor(minTy / TERRAIN_CHUNK_TILES);
            const r1 = Math.floor(maxTy / TERRAIN_CHUNK_TILES);
            for (let cy = r0; cy <= r1; cy++) {
                for (let cx = c0; cx <= c1; cx++) {
                    const existingChunk = terrainChunksRef.current.get(`${cx}_${cy}`);
                    if (existingChunk) {
                        existingChunk.loadedCount = -1;
                    }
                }
            }
            selfPaintedTilesRef.current = prevCustom;

            const nextChar: Character = {
                ...curChar,
                money: curGold - totalGold,
                base: {
                    ...curBase,
                    customTiles: prevCustom,
                    resources: {
                        ...curBase.resources,
                        wood: curWood - totalWood,
                        stone: curStone - totalStone
                    }
                }
            };
            latestCharacterRef.current = nextChar;
            onUpdateCharacter(nextChar, '');
        },
        [onUpdateCharacter, selectedFloorTile, brushSize]
    );

    // 3. Place or Remove Decoration
    const handleDecorateAt = (tx: number, ty: number) => {
        if (!character.base || !onUpdateCharacter) return;
        if (tx < 1 || ty < 1 || tx >= mapData.cols - 1 || ty >= mapData.rows - 1) return;
        const base = character.base;
        const existingList = base.decorations || [];
        const existingIdx = existingList.findIndex(d => d.x === tx && d.y === ty);

        if (decoEraseMode || existingIdx !== -1) {
            if (existingIdx === -1) return;
            const removed = existingList[existingIdx];
            const def = BASE_DECORATION_CATALOG.find(c => c.key === removed.decoKey);
            const refundGold = Math.floor((def?.gold || 400) * 0.5);
            const refundWood = Math.floor((def?.wood || 0) * 0.5);
            const refundStone = Math.floor((def?.stone || 0) * 0.5);
            const nextDecos = existingList.filter((_, i) => i !== existingIdx);
            onUpdateCharacter(
                {
                    ...character,
                    money: (character.money || 0) + refundGold,
                    base: {
                        ...base,
                        decorations: nextDecos,
                        resources: {
                            ...base.resources,
                            wood: (base.resources?.wood || 0) + refundWood,
                            stone: (base.resources?.stone || 0) + refundStone
                        }
                    }
                },
                `[기지 꾸미기] '${removed.label}'을(를) 철거했습니다. (50% 환급)`
            );
            return;
        }

        // Prevent placing on top of facilities (spatial cell lookup)
        const dcx = Math.floor(tx / spatialIndex.cellSize);
        const dcy = Math.floor(ty / spatialIndex.cellSize);
        const facIndices = spatialIndex.facilityCells.get(dcy * spatialIndex.cellCols + dcx);
        const hitsFac = Boolean(
            facIndices?.some(idx => {
                const f = mapData.facilities[idx];
                return f && tx >= f.tileX && tx < f.tileX + f.tileW && ty >= f.tileY && ty < f.tileY + f.tileH;
            })
        );
        if (hitsFac) return;

        const def = BASE_DECORATION_CATALOG.find(c => c.key === selectedDecoKey);
        if (!def) return;
        const curGold = character.money || 0;
        const curWood = base.resources?.wood || 0;
        const curStone = base.resources?.stone || 0;
        if (curGold < def.gold || curWood < def.wood || curStone < def.stone) return;

        const newDeco: BaseDecorationItem = {
            id: `deco_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            decoKey: def.key,
            pack: def.pack,
            part: def.part,
            label: def.label,
            x: tx,
            y: ty,
            solid: def.solid
        };
        onUpdateCharacter(
            {
                ...character,
                money: curGold - def.gold,
                base: {
                    ...base,
                    decorations: [...existingList, newDeco],
                    resources: {
                        ...base.resources,
                        wood: curWood - def.wood,
                        stone: curStone - def.stone
                    }
                }
            },
            `[기지 꾸미기] '${def.label}'을(를) 배치했습니다.`
        );
    };

    // 4. Move Existing Facility OR Build New Facility at (tx, ty)
    const handleBuildOrMoveAt = (tx: number, ty: number) => {
        if (!character.base || !onUpdateCharacter) return;
        const base = character.base;

        // A. Dropping a facility being moved
        if (movingFacility) {
            const ok = canPlaceFacilityRect(
                mapData.cols,
                mapData.rows,
                mapData.facilities,
                mapData.floorOverrides,
                mapData.exitGate,
                tx,
                ty,
                movingFacility.tileW,
                movingFacility.tileH,
                movingFacility.id
            );
            if (!ok) return;

            if (movingFacility.isHq) {
                onUpdateCharacter(
                    {
                        ...character,
                        base: {
                            ...base,
                            hqPos: { x: tx, y: ty }
                        }
                    },
                    `[기지 재배치] 기지 본부를 (${tx}, ${ty}) 위치로 이동했습니다.`
                );
            } else {
                const nextLayout = (base.layout || []).map(inst =>
                    inst.id === movingFacility.instanceId ? { ...inst, freeX: tx, freeY: ty } : inst
                );
                onUpdateCharacter(
                    {
                        ...character,
                        base: {
                            ...base,
                            layout: nextLayout
                        }
                    },
                    `[기지 재배치] '${movingFacility.label}'을(를) (${tx}, ${ty}) 위치로 이동했습니다.`
                );
            }
            setMovingFacility(null);
            return;
        }

        // B. Placing a brand-new facility
        if (placingNewFacilityId) {
            const foot = getFacilityFootprint(placingNewFacilityId);
            const ok = canPlaceFacilityRect(
                mapData.cols,
                mapData.rows,
                mapData.facilities,
                mapData.floorOverrides,
                mapData.exitGate,
                tx,
                ty,
                foot.w,
                foot.h
            );
            if (!ok) return;

            const facInfo = FACILITIES_INFO.find(f => f.id === placingNewFacilityId);
            if (facInfo && baseLevel < (facInfo.minLevel || 1)) return;
            if (
                facInfo?.isUnique &&
                ((base.layout || []).some(inst => inst.type === placingNewFacilityId) ||
                    (base.facilities || []).includes(placingNewFacilityId))
            ) {
                return;
            }
            const costCfg = (FACILITY_CONSTRUCTION_COSTS as any)[placingNewFacilityId] || { gold: 20000, wood: 15, stone: 15 };
            const goldCost = costCfg.gold || 0;
            const foodCost = costCfg.food || 0;
            const woodCost = costCfg.wood || 0;
            const stoneCost = costCfg.stone || 0;
            const ironCost = costCfg.iron || 0;
            const manaCost = costCfg.manaCrystal || 0;
            const curGold = character.money || 0;
            const curFood = base.resources?.food || 0;
            const curWood = base.resources?.wood || 0;
            const curStone = base.resources?.stone || 0;
            const curIron = base.resources?.iron || 0;
            const curMana = base.resources?.manaCrystal || 0;
            if (
                curGold < goldCost ||
                curFood < foodCost ||
                curWood < woodCost ||
                curStone < stoneCost ||
                curIron < ironCost ||
                curMana < manaCost
            ) {
                return;
            }

            const startDate = character.currentDate || '2000-03-02';
            const startTime = character.currentTime || '08:00';
            const durationMin = getFacilityConstructionDuration(placingNewFacilityId, false, 1);
            const { completionDate, completionTime } = calculateCompletionDateTime(startDate, startTime, durationMin);

            const newInst: FacilityInstance = {
                id: `${placingNewFacilityId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: placingNewFacilityId,
                level: 0,
                targetLevel: 1,
                x: 0,
                y: 0,
                width: foot.w,
                height: foot.h,
                freeX: tx,
                freeY: ty,
                underConstruction: true,
                constructionStartDate: startDate,
                constructionStartTime: startTime,
                constructionCompletionDate: completionDate,
                constructionCompletionTime: completionTime,
                totalConstructionMinutes: durationMin
            };

            onUpdateCharacter(
                {
                    ...character,
                    money: curGold - goldCost,
                    base: {
                        ...base,
                        resources: {
                            ...base.resources,
                            food: curFood - foodCost,
                            wood: curWood - woodCost,
                            stone: curStone - stoneCost,
                            iron: curIron - ironCost,
                            manaCrystal: curMana - manaCost
                        },
                        layout: [...(base.layout || []), newInst]
                    }
                },
                `[기지 건설] (${tx}, ${ty}) 위치에 '${facInfo?.name || placingNewFacilityId}'(${foot.w}×${foot.h}) 건설을 착공했습니다!`
            );
            setPlacingNewFacilityId(null);
            return;
        }

        // C. Otherwise check if clicking an existing facility to pick it up for moving (spatial cell lookup)
        const bcx = Math.floor(tx / spatialIndex.cellSize);
        const bcy = Math.floor(ty / spatialIndex.cellSize);
        const cellIndices = spatialIndex.facilityCells.get(bcy * spatialIndex.cellCols + bcx);
        const clickedFacIdx = cellIndices?.find(idx => {
            const f = mapData.facilities[idx];
            return f && tx >= f.tileX && tx < f.tileX + f.tileW && ty >= f.tileY && ty < f.tileY + f.tileH;
        });
        const clickedFac = clickedFacIdx !== undefined ? mapData.facilities[clickedFacIdx] : undefined;
        if (clickedFac) {
            setMovingFacility(clickedFac);
        }
    };

    const getWorldTileFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const wx = e.clientX - rect.left + cameraRef.current.x;
        const wy = e.clientY - rect.top + cameraRef.current.y;
        return { wx, wy, tx: Math.floor(wx / BASE_TILE_SIZE), ty: Math.floor(wy / BASE_TILE_SIZE) };
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getWorldTileFromEvent(e);
        if (!pos) return;
        hoverTileRef.current = { x: pos.tx, y: pos.ty };
        hoverWorldRef.current = { wx: pos.wx, wy: pos.wy };
        if (mode === 'paint' && isPaintingDragRef.current) {
            const last = lastPaintedTileRef.current;
            if (!last || last.tx !== pos.tx || last.ty !== pos.ty || last.tile !== selectedFloorTile || last.brush !== brushSize) {
                paintTilesAt(pos.tx, pos.ty);
            }
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getWorldTileFromEvent(e);
        if (!pos) return;
        if (mode === 'paint') {
            isPaintingDragRef.current = true;
            paintTilesAt(pos.tx, pos.ty);
        }
    };

    const handleCanvasMouseUp = () => {
        isPaintingDragRef.current = false;
        lastPaintedTileRef.current = null;
    };

    const handleCanvasMouseLeave = () => {
        handleCanvasMouseUp();
        hoverTileRef.current = null;
        hoverWorldRef.current = null;
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getWorldTileFromEvent(e);
        if (!pos) return;
        const { wx, wy, tx, ty } = pos;

        if (mode === 'paint') return;
        if (mode === 'decorate') {
            handleDecorateAt(tx, ty);
            return;
        }
        if (mode === 'build') {
            handleBuildOrMoveAt(tx, ty);
            return;
        }

        // Explore mode interactions
        for (const r of residentsRef.current) {
            const dx = wx - r.px;
            const dy = wy - (r.py - 14);
            if (dx * dx + dy * dy <= 26 * 26) {
                setSelectedResident(r);
                setSelectedMonster(null);
                setSelectedFacility(null);
                setFacilityNotice(null);
                return;
            }
        }
        for (const m of monstersRef.current) {
            const dx = wx - m.px;
            const dy = wy - m.py;
            if (dx * dx + dy * dy <= 26 * 26) {
                setSelectedMonster(m);
                setSelectedResident(null);
                setSelectedFacility(null);
                setFacilityNotice(null);
                return;
            }
        }
        // Spatial grid lookup for clicked facility (check tile cell and row below if click near top badge)
        const cx = Math.floor(tx / spatialIndex.cellSize);
        const cy = Math.floor(ty / spatialIndex.cellSize);
        const cyMax = Math.min(spatialIndex.cellRows - 1, Math.floor((ty + 1) / spatialIndex.cellSize));
        for (let cellY = Math.max(0, cy); cellY <= cyMax; cellY++) {
            const indices = spatialIndex.facilityCells.get(cellY * spatialIndex.cellCols + cx);
            if (!indices) continue;
            for (let i = 0; i < indices.length; i++) {
                const f = mapData.facilities[indices[i]];
                if (!f) continue;
                const fx = f.tileX * BASE_TILE_SIZE;
                const fy = f.tileY * BASE_TILE_SIZE;
                const fw = f.tileW * BASE_TILE_SIZE;
                const fh = f.tileH * BASE_TILE_SIZE;
                if (wx >= fx && wx <= fx + fw && wy >= fy - 18 && wy <= fy + fh) {
                    setSelectedFacility(f);
                    setSelectedResident(null);
                    setSelectedMonster(null);
                    setFacilityNotice(null);
                    return;
                }
            }
        }

        const gx = mapData.exitGate.x * BASE_TILE_SIZE;
        const gy = mapData.exitGate.y * BASE_TILE_SIZE;
        if (wx >= gx && wx <= gx + mapData.exitGate.w * BASE_TILE_SIZE && wy >= gy - 12) {
            onExitToCity();
            return;
        }

        setSelectedResident(null);
        setSelectedMonster(null);
        setSelectedFacility(null);
        setFacilityNotice(null);
        // 모바일(768px 미만)에서는 터치 이동을 제한하고 D-패드로만 이동
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return;
        }
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    // Warp player to a tile coordinate (used by minimap & facility quick-warp)
    const warpPlayerToTile = (tx: number, ty: number) => {
        const clampedX = Math.max(2, Math.min(mapData.cols - 3, tx));
        const clampedY = Math.max(2, Math.min(mapData.rows - 3, ty));
        playerRef.current.x = (clampedX + 0.5) * BASE_TILE_SIZE;
        playerRef.current.y = (clampedY + 0.5) * BASE_TILE_SIZE;
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
    };

    const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const mm = minimapRef.current;
        if (!mm) return;
        const rect = mm.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;
        warpPlayerToTile(Math.floor(rx * mapData.cols), Math.floor(ry * mapData.rows));
    };

    const rafStateRef = useRef({
        mode,
        movingFacility,
        placingNewFacilityId,
        brushSize,
        decoEraseMode,
        selectedFacility,
        selectedFacilitySpaceOk,
        characterName: character.name,
        currentTime: character.currentTime || '12:00',
        findNearestInteractable,
        onExitToCity
    });
    rafStateRef.current = {
        mode,
        movingFacility,
        placingNewFacilityId,
        brushSize,
        decoEraseMode,
        selectedFacility,
        selectedFacilitySpaceOk,
        characterName: character.name,
        currentTime: character.currentTime || '12:00',
        findNearestInteractable,
        onExitToCity
    };

    const facStampArrRef = useRef<Uint32Array>(new Uint32Array(0));
    const facStampValRef = useRef(0);
    const visibleFacsRef = useRef<BaseFacilityNode[]>([]);
    const actorPoolRef = useRef<ActorRenderSlot[]>([]);
    const activeActorsRef = useRef<ActorRenderSlot[]>([]);
    const nameplateRankPoolRef = useRef<number[]>([]);
    const hoverPlaceCacheRef = useRef<{ tx: number; ty: number; key: string; valid: boolean } | null>(null);

    // 60fps Main Render + Minimap Loop (mounted once while exterior is active; reads refs)
    useEffect(() => {
        if (activeInteriorFacility) return;
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;
        let minimapTick = 0;
        let offscreenAiAccum = 0;

        const isBlocked = (m: typeof mapDataRef.current, px: number, py: number) => {
            const tx = Math.floor(px / BASE_TILE_SIZE);
            const ty = Math.floor(py / BASE_TILE_SIZE);
            if (tx < 0 || ty < 0 || tx >= m.cols || ty >= m.rows) return true;
            return m.solidGrid ? m.solidGrid[ty * m.cols + tx] === 1 : m.solidSet.has(`${tx},${ty}`);
        };

        const loop = (now: number) => {
            const dt = Math.min(0.033, Math.max(0.001, (now - lastTs) / 1000));
            lastTs = now;
            const m = mapDataRef.current;
            const si = spatialIndexRef.current;
            const curViewport = viewportSizeRef.current;
            const curPlayerSpriteUrl = playerSpriteUrlRef.current;
            const curLoverKeys = playerLoverKeysRef.current;
            const curSelectedResId = selectedResidentIdRef.current;
            const {
                mode,
                movingFacility,
                placingNewFacilityId,
                brushSize,
                decoEraseMode,
                selectedFacility,
                selectedFacilitySpaceOk,
                characterName,
                currentTime,
                findNearestInteractable,
                onExitToCity
            } = rafStateRef.current;
            const timeOfDay = getTimeOfDay(currentTime);

            // 1. Update player
            const p = playerRef.current;
            let vx = 0;
            let vy = 0;
            const keys = keysRef.current;
            if (keys.has('arrowleft') || keys.has('a') || dpadRef.current === 'left') vx -= 1;
            if (keys.has('arrowright') || keys.has('d') || dpadRef.current === 'right') vx += 1;
            if (keys.has('arrowup') || keys.has('w') || dpadRef.current === 'up') vy -= 1;
            if (keys.has('arrowdown') || keys.has('s') || dpadRef.current === 'down') vy += 1;

            const speed = mode === 'explore' ? 210 : 320; // 편집 모드에서는 대형 맵을 더 빠르게 탐색!
            const maxStep = speed * dt;
            let isClickMoving = false;
            let clickStepDist = maxStep;

            if (vx === 0 && vy === 0 && p.targetX !== null && p.targetY !== null) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= Math.max(4, maxStep)) {
                    if (mode !== 'explore' || !isBlocked(m, p.targetX, p.targetY)) {
                        p.x = p.targetX;
                        p.y = p.targetY;
                    }
                    p.targetX = null;
                    p.targetY = null;
                } else {
                    vx = dx / dist;
                    vy = dy / dist;
                    isClickMoving = true;
                    clickStepDist = Math.min(maxStep, dist);
                }
            }

            if (vx !== 0 || vy !== 0) {
                const len = Math.hypot(vx, vy) || 1;
                const step = isClickMoving ? clickStepDist : maxStep;
                const prevX = p.x;
                const prevY = p.y;
                const nx = p.x + (vx / len) * step;
                const ny = p.y + (vy / len) * step;
                if (mode !== 'explore' || !isBlocked(m, nx, p.y)) {
                    p.x = Math.max(BASE_TILE_SIZE, Math.min((m.cols - 1) * BASE_TILE_SIZE, nx));
                }
                if (mode !== 'explore' || !isBlocked(m, p.x, ny)) {
                    p.y = Math.max(BASE_TILE_SIZE, Math.min((m.rows - 1) * BASE_TILE_SIZE, ny));
                }
                if (isClickMoving && Math.hypot(p.x - prevX, p.y - prevY) < 0.25) {
                    p.targetX = null;
                    p.targetY = null;
                }

                if (Math.abs(vx) > Math.abs(vy)) p.dir = vx > 0 ? 'right' : 'left';
                else p.dir = vy > 0 ? 'down' : 'up';

                p.moving = true;
                p.animTimer += dt;
                if (p.animTimer >= 0.14) {
                    p.animTimer = 0;
                    p.walkFrame = (p.walkFrame + 1) % 3;
                }
            } else {
                p.moving = false;
                p.walkFrame = 1;
            }

            // South gate auto-exit in explore mode (keep RAF alive if exit is delayed/cancelled)
            const ptx = Math.floor(p.x / BASE_TILE_SIZE);
            const pty = Math.floor(p.y / BASE_TILE_SIZE);
            if (
                mode === 'explore' &&
                Date.now() > exitCooldownRef.current &&
                pty >= m.exitGate.y &&
                ptx >= m.exitGate.x &&
                ptx < m.exitGate.x + m.exitGate.w
            ) {
                exitCooldownRef.current = Date.now() + 900;
                onExitToCity();
            }

            // 2. Camera follow (smooth lerp just like CityRpgCanvas)
            const mapW = m.cols * BASE_TILE_SIZE;
            const mapH = m.rows * BASE_TILE_SIZE;
            const desiredCamX = Math.max(0, Math.min(Math.max(0, mapW - curViewport.w), p.x - curViewport.w / 2));
            const desiredCamY = Math.max(0, Math.min(Math.max(0, mapH - curViewport.h), p.y - curViewport.h / 2));
            cameraRef.current.x += (desiredCamX - cameraRef.current.x) * Math.min(1, dt * 14);
            cameraRef.current.y += (desiredCamY - cameraRef.current.y) * Math.min(1, dt * 14);
            const camX = Math.round(cameraRef.current.x);
            const camY = Math.round(cameraRef.current.y);

            // 3. Residents AI (visible residents 60Hz, far offscreen residents throttled to ~5Hz)
            offscreenAiAccum += dt;
            const runOffscreenAi = offscreenAiAccum >= 0.2;
            const offscreenDt = runOffscreenAi ? offscreenAiAccum : 0;
            if (runOffscreenAi) offscreenAiAccum = 0;

            const aiMinX = camX - 120;
            const aiMaxX = camX + curViewport.w + 120;
            const aiMinY = camY - 120;
            const aiMaxY = camY + curViewport.h + 120;
            const resList = residentsRef.current;
            for (let i = 0; i < resList.length; i++) {
                const r = resList[i];
                const nearView = r.px >= aiMinX && r.px <= aiMaxX && r.py >= aiMinY && r.py <= aiMaxY;
                if (!nearView && !runOffscreenAi) continue;
                const stepDt = nearView ? dt : offscreenDt;
                r.wanderTimer -= stepDt;

                const currentlyBlocked = isBlocked(m, r.px, r.py);
                if (currentlyBlocked && r.targetPx === null) {
                    if (!isBlocked(m, r.homePx, r.homePy)) {
                        r.targetPx = r.homePx;
                        r.targetPy = r.homePy;
                    } else {
                        const rtx = Math.floor(r.px / BASE_TILE_SIZE);
                        const rty = Math.floor(r.py / BASE_TILE_SIZE);
                        let found = false;
                        for (let rad = 1; rad <= 5 && !found; rad++) {
                            for (let dy = -rad; dy <= rad && !found; dy++) {
                                for (let dx = -rad; dx <= rad && !found; dx++) {
                                    if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
                                    const wx = (rtx + dx + 0.5) * BASE_TILE_SIZE;
                                    const wy = (rty + dy + 0.5) * BASE_TILE_SIZE;
                                    if (!isBlocked(m, wx, wy)) {
                                        r.targetPx = wx;
                                        r.targetPy = wy;
                                        found = true;
                                    }
                                }
                            }
                        }
                    }
                }

                if (r.targetPx !== null && r.targetPy !== null) {
                    const dx = r.targetPx - r.px;
                    const dy = r.targetPy - r.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        r.targetPx = null;
                        r.targetPy = null;
                        r.walkFrame = 1;
                    } else {
                        const spd = 48;
                        const nx = r.px + (dx / dist) * spd * stepDt;
                        const ny = r.py + (dy / dist) * spd * stepDt;
                        if (currentlyBlocked || !isBlocked(m, nx, ny)) {
                            r.px = nx;
                            r.py = ny;
                        } else {
                            r.targetPx = null;
                            r.targetPy = null;
                        }
                        r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                        r.animTimer += stepDt;
                        if (r.animTimer >= 0.22) {
                            r.animTimer = 0;
                            r.walkFrame = (r.walkFrame + 1) % 3;
                        }
                    }
                } else if (r.wanderTimer <= 0) {
                    const partnerId = companionPartnerMapRef.current.get(r.id);
                    const partnerRes = partnerId ? resList.find(p2 => p2.id === partnerId) : undefined;
                    if (partnerRes && Math.random() < 0.8) {
                        r.wanderTimer = 1.6 + Math.random() * 1.8;
                        r.targetPx = partnerRes.px + (Math.random() - 0.5) * 32;
                        r.targetPy = partnerRes.py + (Math.random() - 0.5) * 28;
                    } else {
                        r.wanderTimer = 2.4 + Math.random() * 3.5;
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 20 + Math.random() * 52;
                        r.targetPx = r.homePx + Math.cos(angle) * radius;
                        r.targetPy = r.homePy + Math.sin(angle) * radius;
                    }
                }
            }

            // 4. Farm monsters AI
            const monList = monstersRef.current;
            for (let i = 0; i < monList.length; i++) {
                const mon = monList[i];
                mon.bobPhase += dt * 3.4;
                mon.wanderTimer -= dt;
                if (mon.targetPx !== null && mon.targetPy !== null) {
                    const dx = mon.targetPx - mon.px;
                    const dy = mon.targetPy - mon.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        mon.targetPx = null;
                        mon.targetPy = null;
                    } else {
                        const spd = 36;
                        mon.px = Math.max(mon.minPx, Math.min(mon.maxPx, mon.px + (dx / dist) * spd * dt));
                        mon.py = Math.max(mon.minPy, Math.min(mon.maxPy, mon.py + (dy / dist) * spd * dt));
                        mon.dir = dx >= 0 ? 'right' : 'left';
                    }
                } else if (mon.wanderTimer <= 0) {
                    mon.wanderTimer = 1.6 + Math.random() * 2.8;
                    mon.targetPx = mon.minPx + Math.random() * Math.max(10, mon.maxPx - mon.minPx);
                    mon.targetPy = mon.minPy + Math.random() * Math.max(10, mon.maxPy - mon.minPy);
                }
            }

            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                let nextLabel: string | null = null;
                if (mode === 'explore') {
                    const near = findNearestInteractable();
                    if (near) {
                        if (near.kind === 'resident') nextLabel = `${near.resident.name} (${near.resident.role})`;
                        else if (near.kind === 'monster') nextLabel = `🐾 ${near.monster.name} Lv.${near.monster.level}`;
                        else nextLabel = `${near.facility.iconText} ${near.facility.label}`;
                    }
                }
                if (prevNearbyLabelRef.current !== nextLabel) {
                    prevNearbyLabelRef.current = nextLabel;
                    setNearbyLabel(nextLabel);
                }
            }

            // 5. Render main viewport (chunked terrain + spatial-indexed facilities/decorations + zero-closure actor sort)
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, curViewport.w, curViewport.h);
                ctx.save();
                ctx.translate(-camX, -camY);

                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'road'));
                const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'plaza'));
                const royalImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'royal_road'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'wall'));
                const waterImg = getCachedCityAssetImage(getTerrainTileUrl(m.cultureKey, 'water'));

                const startC = Math.max(0, Math.floor(camX / BASE_TILE_SIZE) - 1);
                const endC = Math.min(m.cols - 1, Math.ceil((camX + curViewport.w) / BASE_TILE_SIZE) + 1);
                const startR = Math.max(0, Math.floor(camY / BASE_TILE_SIZE) - 1);
                const endR = Math.min(m.rows - 1, Math.ceil((camY + curViewport.h) / BASE_TILE_SIZE) + 1);

                const loadedTerrainCount =
                    (groundImg && groundImg.complete && groundImg.naturalWidth > 0 ? 1 : 0) +
                    (roadImg && roadImg.complete && roadImg.naturalWidth > 0 ? 1 : 0) +
                    (plazaImg && plazaImg.complete && plazaImg.naturalWidth > 0 ? 1 : 0) +
                    (royalImg && royalImg.complete && royalImg.naturalWidth > 0 ? 1 : 0) +
                    (wallImg && wallImg.complete && wallImg.naturalWidth > 0 ? 1 : 0) +
                    (waterImg && waterImg.complete && waterImg.naturalWidth > 0 ? 1 : 0);

                // Fixed 16x16 chunked offscreen terrain cache (max 768x768 per chunk, LRU up to 36 chunks)
                const chunkC0 = Math.max(0, Math.floor(startC / TERRAIN_CHUNK_TILES));
                const chunkC1 = Math.min(si.cellCols - 1, Math.floor(endC / TERRAIN_CHUNK_TILES));
                const chunkR0 = Math.max(0, Math.floor(startR / TERRAIN_CHUNK_TILES));
                const chunkR1 = Math.min(si.cellRows - 1, Math.floor(endR / TERRAIN_CHUNK_TILES));
                const chunkCache = terrainChunksRef.current;

                for (let cy = chunkR0; cy <= chunkR1; cy++) {
                    for (let cx = chunkC0; cx <= chunkC1; cx++) {
                        const chunkKey = `${cx}_${cy}`;
                        const c0 = cx * TERRAIN_CHUNK_TILES;
                        const r0 = cy * TERRAIN_CHUNK_TILES;
                        const c1 = Math.min(m.cols - 1, c0 + TERRAIN_CHUNK_TILES - 1);
                        const r1 = Math.min(m.rows - 1, r0 + TERRAIN_CHUNK_TILES - 1);
                        const reqW = (c1 - c0 + 1) * BASE_TILE_SIZE;
                        const reqH = (r1 - r0 + 1) * BASE_TILE_SIZE;

                        let chunkEntry = chunkCache.get(chunkKey);
                        if (
                            chunkEntry &&
                            chunkEntry.loadedCount === loadedTerrainCount &&
                            chunkEntry.canvas.width === reqW &&
                            chunkEntry.canvas.height === reqH
                        ) {
                            chunkCache.delete(chunkKey);
                            chunkCache.set(chunkKey, chunkEntry);
                        } else {
                            let reusedCanvas = chunkEntry?.canvas;
                            if (!reusedCanvas && chunkCache.size >= MAX_TERRAIN_CHUNKS) {
                                const oldestKey = chunkCache.keys().next().value;
                                if (oldestKey !== undefined) {
                                    reusedCanvas = chunkCache.get(oldestKey)?.canvas;
                                    chunkCache.delete(oldestKey);
                                }
                            }
                            const off = reusedCanvas || document.createElement('canvas');
                            if (off.width !== reqW) off.width = reqW;
                            if (off.height !== reqH) off.height = reqH;
                            const octx = off.getContext('2d');
                            if (octx) {
                                octx.clearRect(0, 0, reqW, reqH);
                                const hasGround = Boolean(groundImg && groundImg.complete && groundImg.naturalWidth > 0);
                                const hasWall = Boolean(wallImg && wallImg.complete && wallImg.naturalWidth > 0);
                                const hasRoad = Boolean(roadImg?.complete && roadImg.naturalWidth > 0);
                                const hasPlaza = Boolean(plazaImg?.complete && plazaImg.naturalWidth > 0);
                                const hasRoyal = Boolean(royalImg?.complete && royalImg.naturalWidth > 0);
                                const hasWater = Boolean(waterImg?.complete && waterImg.naturalWidth > 0);

                                for (let r = r0; r <= r1; r++) {
                                    for (let c = c0; c <= c1; c++) {
                                        const x = (c - c0) * BASE_TILE_SIZE;
                                        const y = (r - r0) * BASE_TILE_SIZE;
                                        const isPerimeterWall =
                                            r === 0 ||
                                            c === 0 ||
                                            c === m.cols - 1 ||
                                            (r === m.rows - 1 && (c < m.exitGate.x || c >= m.exitGate.x + m.exitGate.w));
                                        const isGate =
                                            r === m.exitGate.y && c >= m.exitGate.x && c < m.exitGate.x + m.exitGate.w;

                                        if (isPerimeterWall) {
                                            if (hasWall && wallImg) {
                                                octx.drawImage(wallImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            } else {
                                                octx.fillStyle = '#334155';
                                                octx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            }
                                            continue;
                                        }

                                        if (hasGround && groundImg) {
                                            octx.drawImage(groundImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                        } else {
                                            octx.fillStyle = (r + c) % 2 === 0 ? '#2f5e2c' : '#356831';
                                            octx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                        }

                                        const floorId = m.floorOverrides[`${c},${r}`];
                                        if (floorId && floorId !== 'default') {
                                            const fDef = FLOOR_TILE_MAP[floorId];
                                            if (floorId === 'stone_road' && hasRoad && roadImg) {
                                                octx.drawImage(roadImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            } else if (floorId === 'plaza' && hasPlaza && plazaImg) {
                                                octx.drawImage(plazaImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            } else if (floorId === 'royal_marble' && hasRoyal && royalImg) {
                                                octx.drawImage(royalImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            } else if (floorId === 'water' && hasWater && waterImg) {
                                                octx.drawImage(waterImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                            } else if (fDef) {
                                                octx.fillStyle = (r + c) % 2 === 0 ? fDef.color : fDef.accentColor;
                                                octx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                                if (floorId === 'flower_field') {
                                                    octx.fillStyle = '#f472b6';
                                                    octx.fillRect(x + 10, y + 10, 5, 5);
                                                    octx.fillStyle = '#fde047';
                                                    octx.fillRect(x + 28, y + 16, 5, 5);
                                                    octx.fillStyle = '#c084fc';
                                                    octx.fillRect(x + 16, y + 30, 5, 5);
                                                } else if (floorId === 'wood_deck') {
                                                    octx.strokeStyle = 'rgba(0,0,0,0.22)';
                                                    octx.lineWidth = 1;
                                                    octx.beginPath();
                                                    octx.moveTo(x, y + 16);
                                                    octx.lineTo(x + BASE_TILE_SIZE, y + 16);
                                                    octx.moveTo(x, y + 32);
                                                    octx.lineTo(x + BASE_TILE_SIZE, y + 32);
                                                    octx.stroke();
                                                } else if (floorId === 'shingye_jade' || floorId === 'magye_obsidian') {
                                                    octx.strokeStyle =
                                                        floorId === 'shingye_jade'
                                                            ? 'rgba(245,158,11,0.45)'
                                                            : 'rgba(168,85,247,0.45)';
                                                    octx.strokeRect(x + 2, y + 2, BASE_TILE_SIZE - 4, BASE_TILE_SIZE - 4);
                                                }
                                            }
                                        }

                                        if (isGate) {
                                            octx.fillStyle = 'rgba(251, 191, 36, 0.35)';
                                            octx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                        }
                                    }
                                }
                            }
                            chunkEntry = { canvas: off, loadedCount: loadedTerrainCount };
                            if (chunkCache.has(chunkKey)) {
                                chunkCache.delete(chunkKey);
                            } else if (chunkCache.size >= MAX_TERRAIN_CHUNKS) {
                                const oldestKey = chunkCache.keys().next().value;
                                if (oldestKey !== undefined) chunkCache.delete(oldestKey);
                            }
                            chunkCache.set(chunkKey, chunkEntry);
                        }
                        ctx.drawImage(chunkEntry.canvas, c0 * BASE_TILE_SIZE, r0 * BASE_TILE_SIZE);
                    }
                }

                if (mode !== 'explore') {
                    // Single batched path for editor grid
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    const xStart = startC * BASE_TILE_SIZE;
                    const xEnd = (endC + 1) * BASE_TILE_SIZE;
                    const yStart = startR * BASE_TILE_SIZE;
                    const yEnd = (endR + 1) * BASE_TILE_SIZE;
                    for (let c = startC; c <= endC + 1; c++) {
                        const x = c * BASE_TILE_SIZE;
                        ctx.moveTo(x, yStart);
                        ctx.lineTo(x, yEnd);
                    }
                    for (let r = startR; r <= endR + 1; r++) {
                        const y = r * BASE_TILE_SIZE;
                        ctx.moveTo(xStart, y);
                        ctx.lineTo(xEnd, y);
                    }
                    ctx.stroke();
                }

                // Collect visible facilities via spatial grid (zero-allocation stamp deduplication)
                if (facStampArrRef.current.length < m.facilities.length) {
                    facStampArrRef.current = new Uint32Array(m.facilities.length + 16);
                    facStampValRef.current = 0;
                }
                facStampValRef.current += 1;
                if (facStampValRef.current >= 0xfffffffe) {
                    facStampArrRef.current.fill(0);
                    facStampValRef.current = 1;
                }
                const stampVal = facStampValRef.current;
                const stampArr = facStampArrRef.current;
                const visibleFacs = visibleFacsRef.current;
                visibleFacs.length = 0;

                for (let cy = chunkR0; cy <= chunkR1; cy++) {
                    for (let cx = chunkC0; cx <= chunkC1; cx++) {
                        const indices = si.facilityCells.get(cy * si.cellCols + cx);
                        if (!indices) continue;
                        for (let i = 0; i < indices.length; i++) {
                            const fIdx = indices[i];
                            if (stampArr[fIdx] === stampVal) continue;
                            stampArr[fIdx] = stampVal;
                            const f = m.facilities[fIdx];
                            if (
                                f.tileX + f.tileW < startC - 1 ||
                                f.tileX > endC + 1 ||
                                f.tileY + f.tileH < startR - 1 ||
                                f.tileY > endR + 1
                            ) {
                                continue;
                            }
                            visibleFacs.push(f);
                        }
                    }
                }

                // Dynamically scale image/badge LRU caps to prevent thrashing on dense scenes
                activeScaledImgCapRef.current = Math.max(
                    MIN_SCALED_IMG_CACHE,
                    Math.min(MAX_SCALED_IMG_CACHE, visibleFacs.length * 2 + 128)
                );
                activeBadgeCapRef.current = Math.max(
                    MIN_BADGE_SPRITE_CACHE,
                    Math.min(MAX_BADGE_SPRITE_CACHE, (resList.length + visibleFacs.length) * 2 + 256)
                );

                // Draw visible facilities
                for (let i = 0; i < visibleFacs.length; i++) {
                    const f = visibleFacs[i];
                    const fx = f.tileX * BASE_TILE_SIZE;
                    const fy = f.tileY * BASE_TILE_SIZE;
                    const fw = f.tileW * BASE_TILE_SIZE;
                    const fh = f.tileH * BASE_TILE_SIZE;
                    const isBeingMoved = movingFacility?.id === f.id;

                    if (isBeingMoved) ctx.globalAlpha = 0.4;

                    const loadedFacilityImg = f.spriteUrl ? getCachedCityAssetImage(f.spriteUrl) : null;
                    const loadedConstructionImg = f.constructionSpriteUrl
                        ? getCachedCityAssetImage(f.constructionSpriteUrl)
                        : null;
                    const hasFacilityPng = Boolean(
                        loadedFacilityImg && loadedFacilityImg.complete && loadedFacilityImg.naturalWidth > 0
                    );
                    const hasConstructionPng = Boolean(
                        loadedConstructionImg && loadedConstructionImg.complete && loadedConstructionImg.naturalWidth > 0
                    );

                    if (f.underConstruction && hasConstructionPng && loadedConstructionImg && f.constructionSpriteUrl) {
                        const dw = Math.round(fw + 12);
                        const dh = Math.round(fh + 18);
                        const dx = Math.round(fx + fw / 2 - dw / 2);
                        const dy = Math.round(fy + fh - dh + 4);
                        drawScaledImg(ctx, loadedConstructionImg, f.constructionSpriteUrl, dx, dy, dw, dh);
                    } else if (f.isMonsterPen) {
                        if (hasFacilityPng && loadedFacilityImg && f.spriteUrl) {
                            const dw = Math.round(fw + 8);
                            const dh = Math.round(fh + 12);
                            const dx = Math.round(fx + fw / 2 - dw / 2);
                            const dy = Math.round(fy + fh - dh + 4);
                            drawScaledImg(ctx, loadedFacilityImg, f.spriteUrl, dx, dy, dw, dh);
                        } else {
                            ctx.fillStyle = 'rgba(34, 197, 94, 0.20)';
                            ctx.fillRect(fx, fy, fw, fh);
                            ctx.strokeStyle = '#92400e';
                            ctx.lineWidth = 5;
                            ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                            ctx.strokeStyle = '#d97706';
                            ctx.lineWidth = 1.5;
                            ctx.strokeRect(fx + 5, fy + 5, fw - 10, fh - 10);
                        }
                    } else if (f.isFarm && !hasFacilityPng) {
                        ctx.fillStyle = '#5c3a21';
                        ctx.fillRect(fx + 3, fy + 3, fw - 6, fh - 6);
                        ctx.fillStyle = '#84cc16';
                        const rowsCount = Math.max(3, f.tileH * 2);
                        for (let fr = 0; fr < rowsCount; fr++) {
                            ctx.fillRect(fx + 10, fy + 10 + fr * ((fh - 20) / rowsCount), fw - 20, 8);
                        }
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                    } else if (hasFacilityPng && loadedFacilityImg && f.spriteUrl) {
                        const scale = f.isHq ? 1.12 : 1.06;
                        const dw = Math.round((fw + 12) * scale);
                        const dh = Math.round((fh + 18) * scale);
                        const dx = Math.round(fx + fw / 2 - dw / 2);
                        const dy = Math.round(fy + fh - dh + 4);
                        drawScaledImg(ctx, loadedFacilityImg, f.spriteUrl, dx, dy, dw, dh);
                    } else {
                        const lv = f.level || 1;
                        const tierWall = lv >= 8 ? '#312e81' : lv >= 5 ? '#1e3a5f' : lv >= 3 ? '#334155' : '#292524';
                        const tierTrim = lv >= 8 ? '#facc15' : lv >= 5 ? '#38bdf8' : lv >= 3 ? '#cbd5e1' : '#a16207';
                        ctx.fillStyle = 'rgba(0,0,0,0.34)';
                        ctx.fillRect(fx + 8, fy + fh - 6, fw - 10, 10);
                        ctx.fillStyle = tierWall;
                        ctx.fillRect(fx + 4, fy + 10, fw - 8, fh - 14);
                        ctx.fillStyle = f.accentColor;
                        ctx.fillRect(fx + 2, fy + 4, fw - 4, 16);
                        ctx.strokeStyle = tierTrim;
                        ctx.lineWidth = lv >= 5 ? 2.5 : 1.5;
                        ctx.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8);
                        ctx.font = `${Math.min(34, Math.round(fw * 0.25))}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(f.iconText, fx + fw / 2, fy + fh / 2 + 12);
                        ctx.fillStyle = 'rgba(15,23,42,0.88)';
                        ctx.fillRect(fx + fw - 38, fy + fh - 20, 32, 14);
                        ctx.fillStyle = tierTrim;
                        ctx.font = 'bold 9px monospace';
                        ctx.fillText(`Lv.${lv}`, fx + fw - 22, fy + fh - 10);
                    }

                    if (f.underConstruction && !hasConstructionPng) {
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
                        ctx.fillRect(fx, fy, fw, fh);
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(fx + 6, fy + 6);
                        ctx.lineTo(fx + fw - 6, fy + fh - 6);
                        ctx.moveTo(fx + fw - 6, fy + 6);
                        ctx.lineTo(fx + 6, fy + fh - 6);
                        ctx.stroke();
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([8, 4]);
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                        ctx.setLineDash([]);
                    }

                    if (mode === 'build') {
                        ctx.strokeStyle = isBeingMoved ? '#38bdf8' : 'rgba(251, 191, 36, 0.7)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 4]);
                        ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
                        ctx.setLineDash([]);
                    } else if (selectedFacility?.id === f.id) {
                        const nextFoot = getFacilityFootprint(f.facilityType, (f.level || 1) + 1);
                        const nfw = nextFoot.w * BASE_TILE_SIZE;
                        const nfh = nextFoot.h * BASE_TILE_SIZE;
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
                        if (!f.underConstruction) {
                            ctx.strokeStyle = selectedFacilitySpaceOk ? 'rgba(52, 211, 153, 0.9)' : 'rgba(244, 63, 94, 0.9)';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([6, 4]);
                            ctx.strokeRect(fx, fy, nfw, nfh);
                            ctx.setLineDash([]);
                        }
                    }

                    if (isBeingMoved) ctx.globalAlpha = 1;

                    // Pre-cached floating facility badge sprite
                    const badgeText = f.underConstruction
                        ? `🔨 ${f.label} (${f.completionText || '공사 중'})`
                        : mode === 'build'
                        ? `${f.label} Lv.${f.level} (${f.tileW}×${f.tileH})`
                        : `${f.label} Lv.${f.level}`;
                    const borderColor = f.underConstruction ? '#fbbf24' : f.accentColor;
                    const textColor = f.underConstruction ? '#fde68a' : '#f8fafc';
                    const badgeKey = `fb:${borderColor}:${textColor}:${badgeText}`;
                    const badgeSprite = getCachedBadgeSprite(
                        badgeKey,
                        'bold 11px sans-serif',
                        badgeText,
                        66,
                        14,
                        18,
                        'rgba(15, 23, 42, 0.88)',
                        borderColor,
                        textColor,
                        13
                    );
                    ctx.drawImage(badgeSprite, Math.round(fx + fw / 2 - badgeSprite.width / 2), Math.round(fy - 20));
                }

                // Draw placed decorations via spatial grid (state set once outside loop)
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';
                for (let cy = chunkR0; cy <= chunkR1; cy++) {
                    for (let cx = chunkC0; cx <= chunkC1; cx++) {
                        const decos = si.decorationCells.get(cy * si.cellCols + cx);
                        if (!decos) continue;
                        for (let i = 0; i < decos.length; i++) {
                            const d = decos[i];
                            if (d.x < startC - 1 || d.x > endC + 1 || d.y < startR - 1 || d.y > endR + 1) continue;
                            const dx = d.x * BASE_TILE_SIZE;
                            const dy = d.y * BASE_TILE_SIZE;
                            const url = resolveDecorationSpriteUrl(m.cultureKey, d.pack, d.part);
                            const img = getCachedCityAssetImage(url);
                            if (img && img.complete && img.naturalWidth > 0) {
                                ctx.drawImage(img, dx - 4, dy - 12, BASE_TILE_SIZE + 8, BASE_TILE_SIZE + 12);
                            } else {
                                ctx.fillStyle = '#10b981';
                                ctx.beginPath();
                                ctx.arc(dx + BASE_TILE_SIZE / 2, dy + BASE_TILE_SIZE / 2, 12, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            if (mode === 'decorate') {
                                ctx.strokeStyle = decoEraseMode ? 'rgba(244,63,94,0.8)' : 'rgba(52,211,153,0.45)';
                                ctx.strokeRect(dx + 2, dy + 2, BASE_TILE_SIZE - 4, BASE_TILE_SIZE - 4);
                            }
                        }
                    }
                }

                // Draw editor hover ghost preview!
                const hover = hoverTileRef.current;
                if (hover) {
                    if (mode === 'build' && (movingFacility || placingNewFacilityId)) {
                        const foot = movingFacility
                            ? { w: movingFacility.tileW, h: movingFacility.tileH }
                            : getFacilityFootprint(placingNewFacilityId!);
                        const cacheKey = `${mapDataVersionRef.current}|${movingFacility?.id || ''}|${placingNewFacilityId || ''}`;
                        let valid: boolean;
                        const cachedHover = hoverPlaceCacheRef.current;
                        if (cachedHover && cachedHover.tx === hover.x && cachedHover.ty === hover.y && cachedHover.key === cacheKey) {
                            valid = cachedHover.valid;
                        } else {
                            valid = canPlaceFacilityRect(
                                m.cols,
                                m.rows,
                                m.facilities,
                                m.floorOverrides,
                                m.exitGate,
                                hover.x,
                                hover.y,
                                foot.w,
                                foot.h,
                                movingFacility?.id
                            );
                            hoverPlaceCacheRef.current = { tx: hover.x, ty: hover.y, key: cacheKey, valid };
                        }
                        ctx.fillStyle = valid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.38)';
                        ctx.fillRect(
                            hover.x * BASE_TILE_SIZE,
                            hover.y * BASE_TILE_SIZE,
                            foot.w * BASE_TILE_SIZE,
                            foot.h * BASE_TILE_SIZE
                        );
                        ctx.strokeStyle = valid ? '#34d399' : '#f87171';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(
                            hover.x * BASE_TILE_SIZE + 1,
                            hover.y * BASE_TILE_SIZE + 1,
                            foot.w * BASE_TILE_SIZE - 2,
                            foot.h * BASE_TILE_SIZE - 2
                        );
                    } else if (mode === 'paint') {
                        const half = Math.floor(brushSize / 2);
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 2;
                        ctx.fillRect(
                            (hover.x - half) * BASE_TILE_SIZE,
                            (hover.y - half) * BASE_TILE_SIZE,
                            brushSize * BASE_TILE_SIZE,
                            brushSize * BASE_TILE_SIZE
                        );
                        ctx.strokeRect(
                            (hover.x - half) * BASE_TILE_SIZE,
                            (hover.y - half) * BASE_TILE_SIZE,
                            brushSize * BASE_TILE_SIZE,
                            brushSize * BASE_TILE_SIZE
                        );
                    } else if (mode === 'decorate') {
                        ctx.fillStyle = decoEraseMode ? 'rgba(244, 63, 94, 0.32)' : 'rgba(52, 211, 153, 0.32)';
                        ctx.strokeStyle = decoEraseMode ? '#fb7185' : '#34d399';
                        ctx.lineWidth = 2;
                        ctx.fillRect(hover.x * BASE_TILE_SIZE, hover.y * BASE_TILE_SIZE, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        ctx.strokeRect(hover.x * BASE_TILE_SIZE, hover.y * BASE_TILE_SIZE, BASE_TILE_SIZE, BASE_TILE_SIZE);
                    }
                }

                // South gate label (cached badge sprite)
                const gCx = (m.exitGate.x + m.exitGate.w / 2) * BASE_TILE_SIZE;
                const gCy = m.exitGate.y * BASE_TILE_SIZE;
                const gateBadge = getCachedBadgeSprite(
                    'gate:exit',
                    'bold 11px sans-serif',
                    '🚪 도시로 나가기',
                    108,
                    16,
                    20,
                    'rgba(15, 23, 42, 0.9)',
                    '#f59e0b',
                    '#fde68a',
                    14
                );
                ctx.drawImage(gateBadge, Math.round(gCx - gateBadge.width / 2), Math.round(gCy - 19));

                // Draw roaming farm monsters (viewport culled)
                for (let i = 0; i < monList.length; i++) {
                    const mon = monList[i];
                    if (
                        mon.px < camX - 40 ||
                        mon.px > camX + curViewport.w + 40 ||
                        mon.py < camY - 40 ||
                        mon.py > camY + curViewport.h + 40
                    ) {
                        continue;
                    }
                    const bob = Math.sin(mon.bobPhase) * 3;
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.beginPath();
                    ctx.ellipse(mon.px, mon.py + 10, 14, 6, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const mImg = mon.visualUrl ? getCachedCityAssetImage(mon.visualUrl) : null;
                    if (mImg && mImg.complete && mImg.naturalWidth > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(mon.px, mon.py - 6 + bob, 16, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(mImg, mon.px - 16, mon.py - 22 + bob, 32, 32);
                        ctx.restore();
                        ctx.strokeStyle = '#4ade80';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(mon.px, mon.py - 6 + bob, 16, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('🐾', mon.px, mon.py + bob);
                    }

                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#dcfce7';
                    ctx.fillText(mon.name, mon.px, mon.py + 22);
                }

                // Y-sorted sprites using preallocated actor slot pool (zero per-frame closures!)
                const pool = actorPoolRef.current;
                const activeActors = activeActorsRef.current;
                activeActors.length = 0;
                const vMinX = camX - 60;
                const vMaxX = camX + curViewport.w + 60;
                const vMinY = camY - 60;
                const vMaxY = camY + curViewport.h + 60;
                let slotIdx = 0;

                const pushActorSlot = (
                    px: number,
                    py: number,
                    dir: SpriteDirection,
                    walkFrame: number,
                    url: string,
                    name: string,
                    bubble: string | undefined,
                    isPlayer: boolean,
                    isLover: boolean,
                    showNameplate: boolean,
                    distSq: number
                ) => {
                    let slot = pool[slotIdx];
                    if (!slot) {
                        slot = { px, py, dir, walkFrame, url, name, bubble, isPlayer, isLover, showNameplate, distSq };
                        pool[slotIdx] = slot;
                    } else {
                        slot.px = px;
                        slot.py = py;
                        slot.dir = dir;
                        slot.walkFrame = walkFrame;
                        slot.url = url;
                        slot.name = name;
                        slot.bubble = bubble;
                        slot.isPlayer = isPlayer;
                        slot.isLover = isLover;
                        slot.showNameplate = showNameplate;
                        slot.distSq = distSq;
                    }
                    slotIdx++;
                    activeActors.push(slot);
                };

                const hoverWorld = hoverWorldRef.current;
                let selectedActorIdx = -1;
                const rankPool = nameplateRankPoolRef.current;
                rankPool.length = 0;

                for (let i = 0; i < resList.length; i++) {
                    const r = resList[i];
                    if (r.px < vMinX || r.px > vMaxX || r.py < vMinY || r.py > vMaxY) continue;
                    const isLover = curLoverKeys.has(r.id) || curLoverKeys.has(r.name);
                    const isSelected = Boolean(curSelectedResId && r.id === curSelectedResId);
                    if (isSelected) {
                        selectedActorIdx = activeActors.length;
                    }
                    const isHovered = Boolean(
                        hoverWorld &&
                            (hoverWorld.wx - r.px) * (hoverWorld.wx - r.px) +
                                (hoverWorld.wy - (r.py - 14)) * (hoverWorld.wy - (r.py - 14)) <=
                                26 * 26
                    );
                    const dx = r.px - p.x;
                    const dy = r.py - p.y;
                    const distSq = dx * dx + dy * dy;
                    if (!isSelected && !isHovered && !isLover) {
                        rankPool.push(activeActors.length);
                    }
                    pushActorSlot(
                        r.px,
                        r.py,
                        r.dir,
                        r.walkFrame,
                        r.spriteUrl,
                        r.name,
                        r.activityBubble,
                        false,
                        isLover,
                        true,
                        distSq
                    );
                }

                const visibleResCount = activeActors.length;
                activeBadgeCapRef.current = Math.max(
                    MIN_BADGE_SPRITE_CACHE,
                    Math.min(MAX_BADGE_SPRITE_CACHE, (visibleResCount + visibleFacs.length) * 2 + 256)
                );

                // Dense-crowd bubble LOD (>20 visible residents): show bubbles for nearby-to-player, lovers, or selected
                if (visibleResCount > DENSE_BUBBLE_RESIDENT_THRESHOLD) {
                    for (let i = 0; i < visibleResCount; i++) {
                        if (i === selectedActorIdx) continue;
                        const slot = activeActors[i];
                        if (slot.isLover) continue;
                        if (slot.distSq > NEARBY_BUBBLE_DIST_SQ) {
                            slot.bubble = undefined;
                        }
                    }
                }

                // Dense-crowd nameplate LOD (>120 visible residents): show nameplates for selected/hovered/lovers + closest 120 residents
                if (
                    visibleResCount > DENSE_NAMEPLATE_RESIDENT_THRESHOLD &&
                    rankPool.length > DENSE_NAMEPLATE_RESIDENT_THRESHOLD
                ) {
                    rankPool.sort((ia, ib) => activeActors[ia].distSq - activeActors[ib].distSq);
                    for (let k = DENSE_NAMEPLATE_RESIDENT_THRESHOLD; k < rankPool.length; k++) {
                        activeActors[rankPool[k]].showNameplate = false;
                    }
                }

                pushActorSlot(p.x, p.y, p.dir, p.walkFrame, curPlayerSpriteUrl, characterName, undefined, true, false, true, 0);
                activeActors.sort((a, b) => a.py - b.py);

                ctx.imageSmoothingEnabled = false;
                if (!shadowCanvasRef.current) {
                    const sc = document.createElement('canvas');
                    sc.width = 28;
                    sc.height = 14;
                    const sctx = sc.getContext('2d');
                    if (sctx) {
                        sctx.fillStyle = 'rgba(0,0,0,0.38)';
                        sctx.beginPath();
                        sctx.ellipse(14, 7, 13, 6, 0, 0, Math.PI * 2);
                        sctx.fill();
                    }
                    shadowCanvasRef.current = sc;
                }
                const shadowSprite = shadowCanvasRef.current;
                const heartBob = Math.sin(now / 220) * 2.5;
                for (let i = 0; i < activeActors.length; i++) {
                    const a = activeActors[i];
                    const px = Math.round(a.px);
                    const py = Math.round(a.py);

                    if (a.isLover) {
                        ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
                        ctx.beginPath();
                        ctx.ellipse(px, py + 4, 17, 8, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(244, 114, 182, 0.78)';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                    }
                    ctx.drawImage(shadowSprite, px - 14, py - 3);

                    const img = getCachedRpgSpriteImage(a.url);
                    if (img && img.complete && img.naturalWidth > 0) {
                        const fw = img.naturalWidth / 3;
                        const fh = img.naturalHeight / 4;
                        const row = DIR_ROW_MAP[a.dir] ?? 0;
                        ctx.drawImage(img, a.walkFrame * fw, row * fh, fw, fh, px - 22, py - 42, 44, 48);
                    } else {
                        ctx.fillStyle = a.isPlayer ? '#38bdf8' : a.isLover ? '#f472b6' : '#a78bfa';
                        ctx.beginPath();
                        ctx.arc(px, py - 16, 12, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (a.isLover) {
                        const heartSprite = getCachedBadgeSprite(
                            'lover_heart',
                            '12px sans-serif',
                            '💕',
                            18,
                            4,
                            16,
                            'rgba(0,0,0,0)',
                            null,
                            '#f472b6',
                            13
                        );
                        ctx.drawImage(heartSprite, Math.round(px - heartSprite.width / 2), Math.round(py - (a.bubble ? 79 : 61) + heartBob));
                    }

                    if (a.showNameplate) {
                        const displayLabel = a.isLover ? `💕 ${a.name}` : a.name;
                        const nBg = a.isPlayer
                            ? 'rgba(30, 58, 138, 0.88)'
                            : a.isLover
                            ? 'rgba(131, 24, 67, 0.92)'
                            : 'rgba(15, 23, 42, 0.82)';
                        const nBorder = a.isLover ? 'rgba(244, 114, 182, 0.85)' : null;
                        const nText = a.isPlayer ? '#fde047' : a.isLover ? '#fbcfe8' : '#e2e8f0';
                        const nameBadge = getCachedBadgeSprite(
                            `np:${a.isPlayer ? 1 : 0}:${a.isLover ? 1 : 0}:${displayLabel}`,
                            'bold 10px sans-serif',
                            displayLabel,
                            40,
                            10,
                            15,
                            nBg,
                            nBorder,
                            nText,
                            11
                        );
                        ctx.drawImage(nameBadge, Math.round(px - nameBadge.width / 2), py + 6);
                    }

                    if (a.bubble) {
                        const bubbleBadge = getCachedBadgeSprite(
                            `ub:${a.bubble}`,
                            '10px sans-serif',
                            a.bubble,
                            54,
                            12,
                            16,
                            'rgba(15, 23, 42, 0.86)',
                            'rgba(99, 102, 241, 0.6)',
                            '#c7d2fe',
                            12
                        );
                        ctx.drawImage(bubbleBadge, Math.round(px - bubbleBadge.width / 2), py - 61);
                    }
                }

                // 5.5 Pooled TimeEngine Event Visuals (max 12 badges, max 25 particles, cached sprite)
                const evQueue = baseVisualQueueRef.current;
                if (evQueue.length > 0) {
                    const nowMs = Date.now();
                    for (let ei = evQueue.length - 1; ei >= 0; ei--) {
                        const ev = evQueue[ei];
                        if (nowMs >= ev.expiresAt) {
                            evQueue.splice(ei, 1);
                            continue;
                        }
                        if (ev.x < vMinX - 80 || ev.x > vMaxX + 80 || ev.y < vMinY - 80 || ev.y > vMaxY + 80) continue;
                        const progress = Math.max(0, Math.min(1, 1 - (ev.expiresAt - nowMs) / 4500));
                        const dyOffset = ev.floatUp ? -Math.round(progress * 26) : Math.round(Math.sin(nowMs / 180) * 2.5);
                        const evSprite = getCachedBadgeSprite(
                            `bev:${ev.text}:${ev.border}`,
                            'bold 10px sans-serif',
                            ev.text,
                            68,
                            14,
                            18,
                            ev.color,
                            ev.border,
                            '#f8fafc',
                            13
                        );
                        ctx.drawImage(evSprite, Math.round(ev.x - evSprite.width / 2), Math.round(ev.y - 62 + dyOffset));
                    }
                }
                const evParts = baseEventParticlesRef.current;
                if (evParts.length > 0) {
                    for (let pi = evParts.length - 1; pi >= 0; pi--) {
                        const pt = evParts[pi];
                        pt.life += dt;
                        if (pt.life >= pt.maxLife) {
                            evParts.splice(pi, 1);
                            continue;
                        }
                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;
                        ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
                        ctx.fillStyle = pt.color;
                        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 3, 3);
                    }
                    ctx.globalAlpha = 1;
                }

                ctx.restore();

                if (timeOfDay.period === 'night' || timeOfDay.period === 'dawn') {
                    ctx.fillStyle = 'rgba(10, 14, 42, 0.48)';
                    ctx.fillRect(0, 0, curViewport.w, curViewport.h);
                    const pxScreen = Math.round(p.x - cameraRef.current.x);
                    const pyScreen = Math.round(p.y - cameraRef.current.y - 6);
                    if (!lanternCanvasRef.current) {
                        const lc = document.createElement('canvas');
                        lc.width = 210;
                        lc.height = 210;
                        const lctx = lc.getContext('2d');
                        if (lctx) {
                            const grad = lctx.createRadialGradient(105, 105, 6, 105, 105, 105);
                            grad.addColorStop(0, 'rgba(254, 243, 199, 0.24)');
                            grad.addColorStop(1, 'rgba(0,0,0,0)');
                            lctx.fillStyle = grad;
                            lctx.fillRect(0, 0, 210, 210);
                        }
                        lanternCanvasRef.current = lc;
                    }
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(lanternCanvasRef.current, pxScreen - 105, pyScreen - 105);
                    ctx.restore();
                } else if (timeOfDay.period === 'sunset') {
                    ctx.fillStyle = 'rgba(190, 60, 40, 0.14)';
                    ctx.fillRect(0, 0, curViewport.w, curViewport.h);
                }

                if (hasPendingAttackRef.current) {
                    const pulse = 0.25 + Math.abs(Math.sin(Date.now() / 320)) * 0.35;
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 6;
                    ctx.strokeRect(3, 3, curViewport.w - 6, curViewport.h - 6);
                    ctx.restore();
                }
            }

            // 6. Render minimap (~2.5fps for zero overhead)
            minimapTick += dt;
            if (minimapTick >= 0.4) {
                minimapTick = 0;
                const mm = minimapRef.current;
                const mctx = mm?.getContext('2d');
                if (mm && mctx) {
                    const mw = mm.width;
                    const mh = mm.height;
                    const sx = mw / m.cols;
                    const sy = mh / m.rows;
                    if (
                        minimapBgDirtyRef.current ||
                        !minimapBgCacheRef.current ||
                        minimapBgCacheRef.current.width !== mw ||
                        minimapBgCacheRef.current.height !== mh
                    ) {
                        const bg = minimapBgCacheRef.current || document.createElement('canvas');
                        if (bg.width !== mw) bg.width = mw;
                        if (bg.height !== mh) bg.height = mh;
                        const bctx = bg.getContext('2d');
                        if (bctx) {
                            bctx.clearRect(0, 0, mw, mh);
                            bctx.fillStyle = '#1e3a20';
                            bctx.fillRect(0, 0, mw, mh);
                            Object.entries(m.floorOverrides).forEach(([k, fid]) => {
                                const comma = k.indexOf(',');
                                const tx = Number(k.slice(0, comma));
                                const ty = Number(k.slice(comma + 1));
                                const fDef = FLOOR_TILE_MAP[fid];
                                if (fDef) {
                                    bctx.fillStyle = fDef.color;
                                    bctx.fillRect(tx * sx, ty * sy, Math.max(1.5, sx), Math.max(1.5, sy));
                                }
                            });
                            m.facilities.forEach(f => {
                                bctx.fillStyle = f.isHq ? '#fbbf24' : f.accentColor;
                                bctx.fillRect(f.tileX * sx, f.tileY * sy, Math.max(3, f.tileW * sx), Math.max(3, f.tileH * sy));
                            });
                        }
                        minimapBgCacheRef.current = bg;
                        minimapBgDirtyRef.current = false;
                    }
                    mctx.drawImage(minimapBgCacheRef.current, 0, 0);

                    // Residents
                    mctx.fillStyle = '#38bdf8';
                    for (let i = 0; i < resList.length; i++) {
                        const r = resList[i];
                        mctx.fillRect((r.px / BASE_TILE_SIZE) * sx, (r.py / BASE_TILE_SIZE) * sy, 2, 2);
                    }

                    // Player dot
                    mctx.fillStyle = '#fde047';
                    mctx.beginPath();
                    mctx.arc((p.x / BASE_TILE_SIZE) * sx, (p.y / BASE_TILE_SIZE) * sy, 3, 0, Math.PI * 2);
                    mctx.fill();

                    // Camera viewport box
                    mctx.strokeStyle = 'rgba(255,255,255,0.75)';
                    mctx.lineWidth = 1;
                    mctx.strokeRect(
                        (cameraRef.current.x / BASE_TILE_SIZE) * sx,
                        (cameraRef.current.y / BASE_TILE_SIZE) * sy,
                        (curViewport.w / BASE_TILE_SIZE) * sx,
                        (curViewport.h / BASE_TILE_SIZE) * sy
                    );
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [activeInteriorFacility]);

    // 일일 탭 [이동 ->] 이벤트 수신 시 해당 시설 내부 맵으로 즉시 진입
    useEffect(() => {
        const onEnterFromDaily = (e: Event) => {
            const detail = (e as CustomEvent<{ facilityType?: string }>).detail;
            const targetType = detail?.facilityType;
            if (!targetType) return;
            const facs = mapDataRef.current.facilities;
            const match =
                facs.find(f => f.facilityType === targetType) ||
                facs.find(f => targetType.startsWith('training_') && f.facilityType === 'training') ||
                facs.find(
                    f => (targetType === 'monster_farm' || targetType === 'monster_ranch') && f.isMonsterPen
                );
            if (match) {
                setSelectedFacility(null);
                setSelectedResident(null);
                setSelectedMonster(null);
                setActiveInteriorFacility(match);
            }
        };
        window.addEventListener('enter-base-facility', onEnterFromDaily);
        return () => window.removeEventListener('enter-base-facility', onEnterFromDaily);
    }, []);

    const maxSizeForLevel = BASE_MAX_MAP_SIZE_BY_LEVEL[baseLevel] || 40;
    const actualHumanResidentCount = useMemo(
        () =>
            (character.inactiveCompanions || []).filter(
                c => c && !c.isDead && !c.isMonster && !(c as any).isCustomMonster && c.race !== '몬스터'
            ).length,
        [character.inactiveCompanions]
    );
    const actualMonsterCount = useMemo(
        () =>
            (base?.capturedMonsters?.length || 0) +
            (character.inactiveCompanions || []).filter(
                c => c && !c.isDead && (c.isMonster || (c as any).isCustomMonster || c.race === '몬스터')
            ).length,
        [base?.capturedMonsters, character.inactiveCompanions]
    );

    const { busyCompIdSet, houseChefIdSet } = useMemo(() => {
        const busySet = new Set<string>();
        const chefSet = new Set<string>();
        if (!showFacilityAssignDrawer || !base) {
            return { busyCompIdSet: busySet, houseChefIdSet: chefSet };
        }
        base.dispatched?.forEach(m => {
            if (m?.companionId) busySet.add(m.companionId);
            const parts = (m as any)?.participants;
            if (Array.isArray(parts)) parts.forEach((id: string) => id && busySet.add(id));
        });
        character.mercenaryData?.groupMissions?.forEach(m => {
            m?.memberIds?.forEach(id => id && busySet.add(id));
        });
        if (base.assignments) {
            Object.values(base.assignments).forEach(id => {
                if (id) busySet.add(id);
            });
        }
        if (base.multiAssignments) {
            Object.values(base.multiAssignments).forEach(list => {
                if (Array.isArray(list)) list.forEach(id => id && busySet.add(id));
            });
        }
        base.houses?.forEach(h => {
            if (h?.assignedChefId) {
                busySet.add(h.assignedChefId);
                chefSet.add(h.assignedChefId);
            }
            if (h?.assignedHousekeeperId) busySet.add(h.assignedHousekeeperId);
        });
        return { busyCompIdSet: busySet, houseChefIdSet: chefSet };
    }, [
        showFacilityAssignDrawer,
        base?.dispatched,
        character.mercenaryData?.groupMissions,
        base?.assignments,
        base?.multiAssignments,
        base?.houses
    ]);

    if (activeInteriorFacility) {
        const liveFac =
            mapData.facilities.find(f => f.id === activeInteriorFacility.id) || activeInteriorFacility;
        return (
            <div className="relative w-full h-full flex-1 min-h-0 flex flex-col">
                <FacilityInteriorCanvas
                    character={character}
                    facility={liveFac}
                    onExitToBase={() => {
                        if (interiorFadeTimerRef.current !== null) {
                            window.clearTimeout(interiorFadeTimerRef.current);
                        }
                        setIsInteriorFading(true);
                        interiorFadeTimerRef.current = window.setTimeout(() => {
                            interiorFadeTimerRef.current = null;
                            setActiveInteriorFacility(null);
                            setIsInteriorFading(false);
                        }, 120);
                    }}
                    onOpenBaseModal={onOpenBaseModal}
                    onInspectCompanion={onInspectCompanion}
                    onUpdateCharacter={onUpdateCharacter}
                    onSwitchFacilityInstance={newId => {
                        const target = mapData.facilities.find(f => f.instanceId === newId);
                        if (target) setActiveInteriorFacility(target);
                    }}
                />
                {isInteriorFading && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center pointer-events-none">
                        <span className="text-amber-200 font-black text-sm tracking-widest animate-pulse">
                            🚪 기지 마당으로 나오는 중...
                        </span>
                    </div>
                )}
            </div>
        );
    }
    const canAffordExpand =
        expansionOpt.canExpand &&
        (character.money || 0) >= expansionOpt.goldCost &&
        (base?.resources?.food || 0) >= expansionOpt.foodCost &&
        (base?.resources?.wood || 0) >= expansionOpt.woodCost &&
        (base?.resources?.stone || 0) >= expansionOpt.stoneCost &&
        (base?.resources?.iron || 0) >= expansionOpt.ironCost &&
        (base?.resources?.manaCrystal || 0) >= expansionOpt.manaCrystalCost;

    return (
        <div ref={containerRef} className="relative w-full h-full flex-1 min-h-0 bg-slate-950 overflow-hidden select-none">
            {isInteriorFading && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center pointer-events-none">
                    <span className="text-amber-200 font-black text-sm tracking-widest animate-pulse">
                        🚪 시설 내부로 입장하는 중...
                    </span>
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={viewportSize.w}
                height={viewportSize.h}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-pointer"
            />

            {/* Top HUD */}
            <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
                <div className="flex flex-col gap-1.5">
                    {/* Base Info Badge */}
                    <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-xl w-fit">
                    <Home size={16} className="text-amber-400 shrink-0" />
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                            <span>{loc.city} 내 기지</span>
                            <span className="text-amber-400">Lv.{baseLevel}</span>
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/40">
                                {mapData.cols}×{mapData.rows} / 최대 {maxSizeForLevel}×{maxSizeForLevel}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>거주민 {actualHumanResidentCount}명</span>
                            <span>몬스터 {actualMonsterCount}마리</span>
                            <span className="text-amber-300">{(character.money || 0).toLocaleString()} G</span>
                            <span className="text-emerald-300">목재 {base?.resources?.wood || 0}</span>
                            <span className="text-sky-300">석재 {base?.resources?.stone || 0}</span>
                        </div>
                    </div>
                </div>
                <CanvasCharacterHud character={character} />
                </div>

                {/* Mode & Action Buttons */}
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    {(
                        [
                            { id: 'explore', label: '탐험', icon: Footprints, activeCls: 'bg-sky-600 border-sky-400 text-white' },
                            { id: 'build', label: '건축·이동', icon: Hammer, activeCls: 'bg-emerald-600 border-emerald-400 text-white' },
                            { id: 'paint', label: '타일', icon: Paintbrush, activeCls: 'bg-indigo-600 border-indigo-400 text-white' },
                            { id: 'decorate', label: '꾸미기', icon: Trees, activeCls: 'bg-teal-600 border-teal-400 text-white' }
                        ] as const
                    ).map(btn => {
                        const Icon = btn.icon;
                        const active = mode === btn.id;
                        return (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => {
                                    setMode(btn.id);
                                    setMovingFacility(null);
                                    setPlacingNewFacilityId(null);
                                    setShowNewFacilityPicker(false);
                                    setSelectedResident(null);
                                    setSelectedMonster(null);
                                    setSelectedFacility(null);
                                    setFacilityNotice(null);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border shadow-lg transition-all ${
                                    active
                                        ? btn.activeCls
                                        : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <Icon size={13} />
                                {btn.label}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setShowWarpList(v => !v)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-amber-200 flex items-center gap-1 shadow-lg"
                    >
                        <MapPin size={13} /> 빠른이동
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenBaseModal()}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-indigo-700/90 hover:bg-indigo-600 border border-indigo-400/50 text-white flex items-center gap-1 shadow-lg"
                    >
                        <Settings size={13} /> 통합관리
                    </button>
                    <button
                        type="button"
                        onClick={onExitToCity}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-700/90 hover:bg-amber-600 border border-amber-400/50 text-white flex items-center gap-1 shadow-lg"
                    >
                        <DoorOpen size={13} /> 도시로
                    </button>
                    {baseEvents.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowBaseEventDrawer(v => !v)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-rose-900/90 hover:bg-rose-800 border border-rose-400/60 text-rose-100 flex items-center gap-1 shadow-lg animate-pulse"
                        >
                            <span>🔔 기지 소식 ({baseEvents.length})</span>
                        </button>
                    )}
                </div>
            </div>

            {showBaseEventDrawer && baseEvents.length > 0 && (
                <div className="absolute top-16 right-4 z-30 w-80 max-w-[90vw] bg-slate-950/95 border border-slate-700 rounded-2xl p-3 shadow-2xl space-y-2 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-black text-amber-300">🔔 최근 기지 이벤트 ({baseEvents.length})</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => enqueueBaseVisualEvents(baseEvents, true)}
                                className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-[10px] font-bold text-white"
                            >
                                연출 다시보기
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBaseEventDrawer(false)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {baseEvents.map(ev => (
                            <div key={ev.id} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                    <span>{ev.emoji}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-amber-300">{ev.badge}</span>
                                    <span className="truncate">{ev.title}</span>
                                </div>
                                <p className="text-[10px] text-slate-300 leading-snug">{ev.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Facility Quick-Warp Dropdown */}
            {showWarpList && (
                <div className="absolute top-16 right-3 z-30 w-60 max-h-72 overflow-y-auto bg-slate-950/95 border border-amber-500/50 rounded-xl p-2 shadow-2xl custom-scrollbar">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 mb-1">
                        <span className="text-[11px] font-black text-amber-300">📍 시설 빠른 이동</span>
                        <button type="button" onClick={() => setShowWarpList(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {mapData.facilities.map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                    warpPlayerToTile(f.doorX, f.doorY);
                                    setShowWarpList(false);
                                }}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-left text-xs text-slate-200 flex items-center justify-between"
                            >
                                <span className="truncate">
                                    {f.iconText} {f.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    ({f.tileX},{f.tileY})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Real-Time Minimap (Top-Right below HUD) */}
            <div className="absolute top-16 right-2.5 z-20 flex flex-col items-end gap-1">
                <button
                    type="button"
                    onClick={() => setShowMinimap(v => !v)}
                    className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white"
                >
                    {showMinimap ? '미니맵 접기' : '🗺️ 미니맵'}
                </button>
                {showMinimap && (
                    <div className="bg-slate-950/90 p-1 rounded-xl border border-amber-500/40 shadow-2xl">
                        <canvas
                            ref={minimapRef}
                            width={132}
                            height={132}
                            onClick={handleMinimapClick}
                            title="클릭하여 해당 위치로 즉시 이동"
                            className="block rounded-lg cursor-crosshair"
                        />
                    </div>
                )}
            </div>

            {/* BUILD & MOVE MODE BOTTOM BAR */}
            {mode === 'build' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 w-[95%] max-w-2xl bg-slate-950/95 border border-emerald-500/50 rounded-2xl p-3 shadow-2xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-emerald-200 font-bold flex items-center gap-1.5">
                            <Move size={14} className="text-emerald-400" />
                            {movingFacility
                                ? `이동 중: [${movingFacility.label} (${movingFacility.tileW}×${movingFacility.tileH})] — 원하는 빈 땅을 클릭하세요`
                                : placingNewFacilityId
                                ? `신규 착공: [${FACILITIES_INFO.find(f => f.id === placingNewFacilityId)?.name}] — 원하는 빈 땅을 클릭하세요`
                                : '기존 시설을 클릭하면 위치 이동, 아래 버튼으로 신규 건설 또는 부지 확장!'}
                        </div>
                        {(movingFacility || placingNewFacilityId) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMovingFacility(null);
                                    setPlacingNewFacilityId(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-black"
                            >
                                취소
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setMovingFacility(null);
                                setShowNewFacilityPicker(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5"
                        >
                            <Plus size={14} /> 신규 시설 건설
                        </button>
                        {isMapExpanding ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-black flex items-center gap-1.5 animate-pulse">
                                <Hammer size={13} /> 영지 확장 공사 중 ({base?.targetMapSize}×{base?.targetMapSize})
                                {mapExpandRemaining && !mapExpandRemaining.isCompleted && (
                                    <span className="text-[10px] text-amber-300">· {mapExpandRemaining.text} 남음</span>
                                )}
                            </span>
                        ) : expansionOpt.canExpand ? (
                            <button
                                type="button"
                                disabled={!canAffordExpand}
                                onClick={handleExpandMapSize}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center gap-1.5"
                            >
                                <Expand size={14} /> 부지 확장 착공 ({mapData.cols}×{mapData.rows} → {expansionOpt.nextSize}×{expansionOpt.nextSize})
                                <span className="text-[10px] opacity-90">
                                    [{expansionOpt.goldCost.toLocaleString()}G · 목{expansionOpt.woodCost} · 석{expansionOpt.stoneCost}]
                                </span>
                            </button>
                        ) : (
                            <span className="text-[11px] text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                                {expansionOpt.needsHigherBaseLevel
                                    ? `Lv.${baseLevel} 최대 크기(${maxSizeForLevel}×${maxSizeForLevel}) 도달 — 기지 증축 시 추가 확장 가능 (Lv.5 최대 200×200)`
                                    : '최대 크기(200×200) 달성 완료!'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* TILE PAINTING MODE BOTTOM PALETTE */}
            {mode === 'paint' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 w-[96%] max-w-3xl bg-slate-950/95 border border-indigo-500/50 rounded-2xl p-3 shadow-2xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-black text-indigo-200 flex items-center gap-1.5">
                            <Paintbrush size={14} className="text-indigo-400" />
                            바닥 타일 칠하기 (드래그 지원 · 기본 지면 무료 · 특수 타일 칸당 구매)
                        </div>
                        <div className="flex items-center gap-1">
                            {([1, 3, 5] as const).map(sz => (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setBrushSize(sz)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-black border ${
                                        brushSize === sz
                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                            : 'bg-slate-900 border-slate-700 text-slate-300'
                                    }`}
                                >
                                    {sz}×{sz}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        {BASE_FLOOR_TILE_CATALOG.map(t => {
                            const active = selectedFloorTile === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedFloorTile(t.id)}
                                    className={`px-2.5 py-1.5 rounded-xl border shrink-0 text-left transition-all ${
                                        active
                                            ? 'bg-indigo-950 border-indigo-400 ring-1 ring-indigo-400/60'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="w-3.5 h-3.5 rounded border border-white/30 shrink-0"
                                            style={{ backgroundColor: t.color }}
                                        />
                                        <span className="text-[11px] font-bold text-white">{t.label}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                        {t.gold === 0 && t.wood === 0 && t.stone === 0
                                            ? '무료'
                                            : `${t.gold}G${t.wood ? ` · 목${t.wood}` : ''}${t.stone ? ` · 석${t.stone}` : ''}`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DECORATION MODE BOTTOM PALETTE */}
            {mode === 'decorate' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 w-[96%] max-w-3xl bg-slate-950/95 border border-teal-500/50 rounded-2xl p-3 shadow-2xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            {(['자연·정원', '마을·가구', '신비·성채'] as const).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                        setDecoCategory(cat);
                                        setDecoEraseMode(false);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                                        decoCategory === cat && !decoEraseMode
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setDecoEraseMode(v => !v)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 border ${
                                decoEraseMode
                                    ? 'bg-rose-600 border-rose-400 text-white'
                                    : 'bg-slate-900 border-slate-700 text-rose-300'
                            }`}
                        >
                            <Trash2 size={12} /> {decoEraseMode ? '철거 모드 ON' : '소품 철거 (50% 환급)'}
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {BASE_DECORATION_CATALOG.filter(d => d.category === decoCategory).map(d => {
                            const active = !decoEraseMode && selectedDecoKey === d.key;
                            return (
                                <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDecoKey(d.key);
                                        setDecoEraseMode(false);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-xl border shrink-0 flex items-center gap-2 transition-all ${
                                        active
                                            ? 'bg-teal-950 border-teal-400 ring-1 ring-teal-400/60'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    <img
                                        src={resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part)}
                                        alt={d.label}
                                        className="w-8 h-8 object-contain"
                                    />
                                    <div className="text-left">
                                        <div className="text-[11px] font-bold text-white">{d.label}</div>
                                        <div className="text-[9px] text-slate-400">
                                            {d.gold.toLocaleString()}G{d.wood ? ` · 목${d.wood}` : ''}{d.stone ? ` · 석${d.stone}` : ''}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Nearby Interaction Prompt (Explore Mode) */}
            {mode === 'explore' && nearbyLabel && !selectedResident && !selectedMonster && !selectedFacility && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="px-4 py-2 rounded-full bg-slate-950/95 border border-amber-400/70 text-amber-200 text-xs font-black shadow-2xl hover:bg-amber-950/80 transition-all"
                    >
                        [Space / 터치] {nearbyLabel}
                    </button>
                </div>
            )}

            {/* Mobile D-Pad */}
            {mode === 'explore' && (
                <div className="absolute bottom-4 left-4 z-20 grid grid-cols-3 gap-1.5 w-36 h-36 sm:w-40 sm:h-40 opacity-90 select-none">
                    <div />
                    <button
                        type="button"
                        onPointerDown={() => { dpadRef.current = 'up'; }}
                        onPointerUp={() => { dpadRef.current = null; }}
                        onPointerLeave={() => { dpadRef.current = null; }}
                        onPointerCancel={() => { dpadRef.current = null; }}
                        className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                    >
                        <ArrowUp size={22} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onPointerDown={() => { dpadRef.current = 'left'; }}
                        onPointerUp={() => { dpadRef.current = null; }}
                        onPointerLeave={() => { dpadRef.current = null; }}
                        onPointerCancel={() => { dpadRef.current = null; }}
                        className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="bg-amber-600/90 active:bg-amber-500 active:scale-95 border border-amber-300 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg"
                    >
                        확인
                    </button>
                    <button
                        type="button"
                        onPointerDown={() => { dpadRef.current = 'right'; }}
                        onPointerUp={() => { dpadRef.current = null; }}
                        onPointerLeave={() => { dpadRef.current = null; }}
                        onPointerCancel={() => { dpadRef.current = null; }}
                        className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                    >
                        <ArrowRight size={22} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onPointerDown={() => { dpadRef.current = 'down'; }}
                        onPointerUp={() => { dpadRef.current = null; }}
                        onPointerLeave={() => { dpadRef.current = null; }}
                        onPointerCancel={() => { dpadRef.current = null; }}
                        className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                    >
                        <ArrowDown size={22} />
                    </button>
                    <div />
                </div>
            )}

            {/* Resident Quick Card */}
            {selectedResident && (
                <ResidentQuickCard
                    resident={selectedResident}
                    character={character}
                    onUpdateCharacter={onUpdateCharacter}
                    onInspectCompanion={onInspectCompanion}
                    onClose={() => setSelectedResident(null)}
                />
            )}

            {/* Farm Monster Quick Card */}
            {selectedMonster && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {selectedMonster.visualUrl && (
                                <img
                                    src={selectedMonster.visualUrl}
                                    alt={selectedMonster.name}
                                    className="w-14 h-14 rounded-xl object-cover border border-emerald-500/50"
                                />
                            )}
                            <div>
                                <div className="text-sm font-black text-emerald-200 flex items-center gap-1.5">
                                    <PawPrint size={14} className="text-emerald-400" />
                                    {selectedMonster.name}
                                    {selectedMonster.rank && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                                            {selectedMonster.rank}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-300 mt-1 space-x-3">
                                    <span>Lv.{selectedMonster.level}</span>
                                    <span>포만감 {selectedMonster.hunger}%</span>
                                    <span>친밀도 {selectedMonster.affection}</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedMonster(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedMonster(null);
                                onOpenBaseModal('monster_farm');
                            }}
                            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
                        >
                            몬스터 사육소 관리 열기
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedMonster(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Facility Quick Action Card (Explore Mode: Enter / Move / Level-Up with +1x1 space check!) */}
            {selectedFacility && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-lg bg-slate-950/95 border border-amber-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
                    {(() => {
                        const liveFac =
                            mapData.facilities.find(f => f.id === selectedFacility.id) || selectedFacility;
                        const curLv = Math.max(1, liveFac.level || 1);
                        const nextLv = curLv + 1;
                        const curFoot = getFacilityFootprint(liveFac.facilityType, curLv);
                        const nextFoot = getFacilityFootprint(liveFac.facilityType, nextLv);
                        const spaceVal =
                            selectedFacilitySpaceVal ||
                            validateFacilityLevelUpSpaceFromMapData(
                                mapData,
                                liveFac.isHq ? 'hq' : liveFac.instanceId || liveFac.facilityType
                            );
                        const upgCfg = !liveFac.isHq ? FACILITY_UPGRADE_CONFIG[liveFac.facilityType] : null;
                        const isMaxLv = liveFac.isHq ? curLv >= 5 : upgCfg ? nextLv > upgCfg.maxLevel : false;
                        const gCost = upgCfg ? upgCfg.goldCost * curLv : 0;
                        const wCost = upgCfg ? upgCfg.woodCost * curLv : 0;
                        const sCost = upgCfg ? upgCfg.stoneCost * curLv : 0;
                        const fCost = upgCfg ? upgCfg.foodCost * curLv : 0;
                        const mCost = upgCfg ? upgCfg.manaCost * curLv : 0;

                        const assignKey = liveFac.instanceId || liveFac.facilityType;
                        const singleAssignId = character.base?.assignments?.[assignKey] || character.base?.assignments?.[liveFac.facilityType];
                        const multiAssignIds =
                            character.base?.multiAssignments?.[assignKey] ||
                            character.base?.multiAssignments?.[liveFac.facilityType] ||
                            [];
                        const assignedIdSet = new Set<string>([
                            ...(singleAssignId ? [singleAssignId] : []),
                            ...multiAssignIds
                        ]);
                        const allBaseHumanComps = [
                            ...(character.inactiveCompanions || []),
                            ...(character.companions || [])
                        ].filter(c => c && !c.isDead && !c.isMonster && !(c as any).isCustomMonster && c.race !== '몬스터');
                        const assignedComps = allBaseHumanComps.filter(c => assignedIdSet.has(c.id));

                        const handleToggleFacilityAssign = (compId: string) => {
                            if (!character.base || !onUpdateCharacter) return;
                            const comp = allBaseHumanComps.find(c => c.id === compId);
                            if (!comp) return;
                            const fType = liveFac.facilityType;
                            const isTrainingFac =
                                fType === 'training_exp' ||
                                fType === 'training_stat' ||
                                fType === 'training_mastery' ||
                                fType === 'training_style' ||
                                fType === 'tactical_training' ||
                                fType === 'combat_training' ||
                                fType === 'training';
                            const isHouseChef = houseChefIdSet.has(compId) || !!character.base?.houses?.some(h => h.assignedChefId === compId);
                            const isJobMismatch =
                                (fType === 'farm' && comp.job !== JobType.FARMER && comp.job !== JobType.SLAVE && (comp.job as string) !== '노예') ||
                                (fType === 'mine' && comp.job !== JobType.MINER && comp.job !== JobType.SLAVE && (comp.job as string) !== '노예') ||
                                (fType === 'alchemy' && comp.job !== JobType.ALCHEMIST) ||
                                (fType === 'cooking' && comp.job !== JobType.CHEF) ||
                                ((fType === 'monster_farm' || fType === 'monster_arena') && comp.job !== JobType.BREEDER) ||
                                (fType === 'lab' && comp.job !== JobType.RESEARCHER) ||
                                (fType === 'workshop' && comp.job !== JobType.BLACKSMITH) ||
                                (isTrainingFac && comp.job !== JobType.TRAINER);
                            if (!assignedIdSet.has(compId) && (isJobMismatch || (fType === 'cooking' && isHouseChef))) {
                                return;
                            }
                            const nextAssignments = { ...(character.base.assignments || {}) };
                            const nextMultiAssignments = { ...(character.base.multiAssignments || {}) };
                            const isMultiFac =
                                liveFac.facilityType === 'farm' ||
                                liveFac.facilityType === 'mine' ||
                                liveFac.facilityType === 'alchemy' ||
                                liveFac.facilityType === 'cooking' ||
                                liveFac.facilityType === 'lab' ||
                                liveFac.facilityType === 'workshop';
                            if (isMultiFac) {
                                const list = nextMultiAssignments[assignKey] || [];
                                if (list.includes(compId)) {
                                    nextMultiAssignments[assignKey] = list.filter(id => id !== compId);
                                } else {
                                    nextMultiAssignments[assignKey] = [...list, compId];
                                }
                            } else {
                                if (nextAssignments[assignKey] === compId) {
                                    delete nextAssignments[assignKey];
                                } else {
                                    nextAssignments[assignKey] = compId;
                                }
                            }
                            const draft: Character = {
                                ...character,
                                base: {
                                    ...character.base,
                                    assignments: nextAssignments,
                                    multiAssignments: nextMultiAssignments
                                }
                            };
                            onUpdateCharacter(draft, `[시설 담당자] '${liveFac.label}' 담당자 배정을 변경했습니다.`);
                        };

                        const handleDirectFacilityLevelUp = () => {
                            if (liveFac.isHq) {
                                setSelectedFacility(null);
                                onOpenBaseModal();
                                return;
                            }
                            if (!character.base || !onUpdateCharacter || !upgCfg) return;
                            if (liveFac.underConstruction) {
                                setFacilityNotice('현재 증축 공사가 진행 중인 시설입니다.');
                                return;
                            }
                            if (!spaceVal.ok) {
                                setFacilityNotice(spaceVal.reason || '주변에 여유 공간이 부족하여 증축할 수 없습니다.');
                                return;
                            }
                            const res = character.base.resources;
                            if (
                                (character.money || 0) < gCost ||
                                (res?.wood || 0) < wCost ||
                                (res?.stone || 0) < sCost ||
                                (res?.food || 0) < fCost ||
                                (res?.manaCrystal || 0) < mCost
                            ) {
                                setFacilityNotice('증축에 필요한 골드 또는 자원이 부족합니다.');
                                return;
                            }
                            const startDate = character.currentDate || '2000-03-02';
                            const startTime = character.currentTime || '08:00';
                            const durationMinutes = getFacilityConstructionDuration(liveFac.facilityType, true, curLv);
                            const { completionDate, completionTime } = calculateCompletionDateTime(
                                startDate,
                                startTime,
                                durationMinutes
                            );
                            const nextLayout = (character.base.layout || []).map(inst =>
                                inst.id === liveFac.instanceId
                                    ? {
                                          ...inst,
                                          underConstruction: true,
                                          targetLevel: nextLv,
                                          constructionStartDate: startDate,
                                          constructionStartTime: startTime,
                                          constructionCompletionDate: completionDate,
                                          constructionCompletionTime: completionTime,
                                          totalConstructionMinutes: durationMinutes
                                      }
                                    : inst
                            );
                            onUpdateCharacter(
                                {
                                    ...character,
                                    money: (character.money || 0) - gCost,
                                    base: {
                                        ...character.base,
                                        resources: {
                                            ...res,
                                            wood: (res.wood || 0) - wCost,
                                            stone: (res.stone || 0) - sCost,
                                            food: (res.food || 0) - fCost,
                                            manaCrystal: (res.manaCrystal || 0) - mCost
                                        },
                                        layout: nextLayout
                                    }
                                },
                                `[시설 증축 착공] ${liveFac.label} Lv.${nextLv} 증축 공사를 시작했습니다! (타일 면적: ${curFoot.w}×${curFoot.h} → ${nextFoot.w}×${nextFoot.h}, 완공 예정: ${completionDate} ${completionTime})`
                            );
                            setSelectedFacility(null);
                            setFacilityNotice(null);
                        };

                        return (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {liveFac.spriteUrl && (
                                            <img
                                                src={liveFac.spriteUrl}
                                                alt={liveFac.label}
                                                className="w-14 h-14 rounded-xl object-contain bg-slate-900/90 p-1 border border-amber-500/40"
                                            />
                                        )}
                                        <div>
                                            <div className="text-sm font-black text-amber-200 flex flex-wrap items-center gap-1.5">
                                                <span>{liveFac.iconText}</span>
                                                <span>{liveFac.label}</span>
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                                                    Lv.{curLv}
                                                </span>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-600/40">
                                                    현재 {liveFac.tileW}×{liveFac.tileH} 타일
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-300 mt-1">
                                                {liveFac.underConstruction
                                                    ? `🔨 ${liveFac.subLabel} (${liveFac.completionText || '공사 중'})`
                                                    : !isMaxLv
                                                    ? `⬆️ Lv.${nextLv} 증축 시 타일 크기: ${curFoot.w}×${curFoot.h} → ${nextFoot.w}×${nextFoot.h} (+1×1 증가)`
                                                    : '✨ 최고 레벨 달성 완료'}
                                            </div>
                                            {!isMaxLv && !liveFac.underConstruction && (
                                                <div
                                                    className={`text-[10px] mt-1 font-bold ${
                                                        spaceVal.ok ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                >
                                                    {spaceVal.ok
                                                        ? `✅ 주변 증축 공간 확보됨 (${nextFoot.w}×${nextFoot.h} 타일 확장 가능)`
                                                        : `⚠️ ${spaceVal.reason}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFacility(null);
                                            setFacilityNotice(null);
                                        }}
                                        className="text-slate-400 hover:text-white p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {!liveFac.isHq && !isMaxLv && !liveFac.underConstruction && upgCfg && (
                                    <div className="text-[10px] bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-2.5 text-slate-300">
                                        <span className="font-bold text-amber-300">증축 비용:</span>
                                        {gCost > 0 && <span>{gCost.toLocaleString()} G</span>}
                                        {wCost > 0 && <span>목재 {wCost}</span>}
                                        {sCost > 0 && <span>석재 {sCost}</span>}
                                        {fCost > 0 && <span>식량 {fCost}</span>}
                                        {mCost > 0 && <span>마정석 {mCost}</span>}
                                    </div>
                                )}

                                {!liveFac.isHq && !liveFac.underConstruction && (
                                    <div className="text-[11px] bg-slate-900/90 border border-indigo-500/30 rounded-lg px-3 py-2 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-300">
                                                <strong className="text-indigo-300">담당자:</strong>{' '}
                                                {assignedComps.length > 0
                                                    ? assignedComps.map(c => c.name).join(', ')
                                                    : '미배정'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowFacilityAssignDrawer(v => !v)}
                                                className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-black shrink-0"
                                            >
                                                {showFacilityAssignDrawer ? '담당자 닫기' : '👤 담당자 설정'}
                                            </button>
                                        </div>
                                        {showFacilityAssignDrawer && (
                                            <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 pt-1 border-t border-slate-800">
                                                {(character.inactiveCompanions || [])
                                                    .filter(c => {
                                                        if (!c || c.isDead || c.isMonster || (c as any).isCustomMonster || c.race === '몬스터') {
                                                            return false;
                                                        }
                                                        if (assignedIdSet.has(c.id)) return true;
                                                        return !busyCompIdSet.has(c.id);
                                                    })
                                                    .map(c => {
                                                        const isAssignedHere = assignedIdSet.has(c.id);
                                                        const fType = liveFac.facilityType;
                                                        const isTrainingFac =
                                                            fType === 'training_exp' ||
                                                            fType === 'training_stat' ||
                                                            fType === 'training_mastery' ||
                                                            fType === 'training_style' ||
                                                            fType === 'tactical_training' ||
                                                            fType === 'combat_training' ||
                                                            fType === 'training';
                                                        const isHouseChef = houseChefIdSet.has(c.id);
                                                        const isChefLockedByHousing = fType === 'cooking' && isHouseChef;
                                                        const isJobMismatch =
                                                            (fType === 'farm' && c.job !== JobType.FARMER && c.job !== JobType.SLAVE && (c.job as string) !== '노예') ||
                                                            (fType === 'mine' && c.job !== JobType.MINER && c.job !== JobType.SLAVE && (c.job as string) !== '노예') ||
                                                            (fType === 'alchemy' && c.job !== JobType.ALCHEMIST) ||
                                                            (fType === 'cooking' && c.job !== JobType.CHEF) ||
                                                            ((fType === 'monster_farm' || fType === 'monster_arena') && c.job !== JobType.BREEDER) ||
                                                            (fType === 'lab' && c.job !== JobType.RESEARCHER) ||
                                                            (fType === 'workshop' && c.job !== JobType.BLACKSMITH) ||
                                                            (isTrainingFac && c.job !== JobType.TRAINER);
                                                        const isLocked = !isAssignedHere && (isJobMismatch || isChefLockedByHousing);
                                                        const reqJobLabel =
                                                            fType === 'farm' ? '농부/노예' :
                                                            fType === 'mine' ? '광부/노예' :
                                                            fType === 'alchemy' ? '연금술사' :
                                                            fType === 'cooking' ? '요리사' :
                                                            (fType === 'monster_farm' || fType === 'monster_arena') ? '사육사' :
                                                            fType === 'lab' ? '연구원' :
                                                            fType === 'workshop' ? '대장장이' :
                                                            isTrainingFac ? '트레이너' : '해당 직업';
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                disabled={isLocked}
                                                                onClick={() => handleToggleFacilityAssign(c.id)}
                                                                className={`w-full px-2.5 py-1.5 rounded text-left text-[11px] font-bold flex items-center justify-between border ${
                                                                    isLocked
                                                                        ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed grayscale'
                                                                        : isAssignedHere
                                                                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                                                                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/50'
                                                                }`}
                                                            >
                                                                <span>
                                                                    {c.name} ({c.job || c.classType || '거주민'})
                                                                    {isChefLockedByHousing && (
                                                                        <span className="text-[10px] text-amber-400 ml-1">(숙소 요리사 배정 중)</span>
                                                                    )}
                                                                    {!isChefLockedByHousing && isLocked && (
                                                                        <span className="text-[10px] text-rose-400 ml-1">({reqJobLabel}만 가능)</span>
                                                                    )}
                                                                </span>
                                                                <span className="text-[10px]">
                                                                    {isAssignedHere ? '✓ 배정됨 (해제)' : isLocked ? '불가' : '+ 배정'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {facilityNotice && (
                                    <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-500/50 rounded-lg px-3 py-2 font-bold">
                                        {facilityNotice}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fac = liveFac;
                                            setSelectedFacility(null);
                                            setFacilityNotice(null);
                                            openFacilityModal(fac);
                                        }}
                                        className="flex-1 min-w-[115px] py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                    >
                                        <DoorOpen size={14} /> 시설 입장 · 관리
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fac = liveFac;
                                            setSelectedFacility(null);
                                            setFacilityNotice(null);
                                            setMode('build');
                                            setMovingFacility(fac);
                                            setPlacingNewFacilityId(null);
                                        }}
                                        className="flex-1 min-w-[115px] py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                    >
                                        <Move size={14} /> 시설 위치 이동
                                    </button>
                                    {!liveFac.isHq && !isMaxLv && !liveFac.underConstruction && upgCfg && (
                                        <button
                                            type="button"
                                            onClick={handleDirectFacilityLevelUp}
                                            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 ${
                                                spaceVal.ok
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40'
                                            }`}
                                        >
                                            <Hammer size={14} /> Lv.{nextLv} 증축 ({nextFoot.w}×{nextFoot.h})
                                        </button>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* New Facility Picker Modal */}
            {showNewFacilityPicker && (
                <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <div className="text-sm font-black text-emerald-300 flex items-center gap-2">
                                <Hammer size={16} /> 건설할 시설 선택 (선택 후 맵 원하는 곳에 배치)
                            </div>
                            <button type="button" onClick={() => setShowNewFacilityPicker(false)} className="text-slate-400 hover:text-white p-1">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar">
                            {FACILITIES_INFO.filter(f => f.id !== 'home' && f.id !== 'my_home').map(fac => {
                                const foot = getFacilityFootprint(fac.id);
                                const cfg = (FACILITY_CONSTRUCTION_COSTS as any)[fac.id] || { gold: 20000, wood: 15, stone: 15 };
                                const gCost = cfg.gold || 0;
                                const fCost = cfg.food || 0;
                                const wCost = cfg.wood || 0;
                                const sCost = cfg.stone || 0;
                                const iCost = cfg.iron || 0;
                                const mCost = cfg.manaCrystal || 0;
                                const minBaseLv = fac.minLevel || 1;
                                const meetsBaseLv = baseLevel >= minBaseLv;
                                const isUniqueBuilt = Boolean(
                                    fac.isUnique &&
                                        ((base?.layout || []).some(inst => inst.type === fac.id) ||
                                            (base?.facilities || []).includes(fac.id))
                                );
                                const affordable =
                                    (character.money || 0) >= gCost &&
                                    (base?.resources?.food || 0) >= fCost &&
                                    (base?.resources?.wood || 0) >= wCost &&
                                    (base?.resources?.stone || 0) >= sCost &&
                                    (base?.resources?.iron || 0) >= iCost &&
                                    (base?.resources?.manaCrystal || 0) >= mCost;
                                const canBuild = affordable && meetsBaseLv && !isUniqueBuilt;
                                return (
                                    <div
                                        key={fac.id}
                                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                                                <span>{fac.name}</span>
                                                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded">
                                                    {foot.w}×{foot.h} 타일
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                        meetsBaseLv
                                                            ? 'bg-sky-950/70 border-sky-500/40 text-sky-300'
                                                            : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                                                    }`}
                                                >
                                                    기지 Lv.{minBaseLv}+
                                                </span>
                                                {fac.isUnique && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                                                        {isUniqueBuilt ? '보유중(고유)' : '고유'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">{fac.desc}</div>
                                            <div className="text-[10px] mt-1 flex flex-wrap gap-2">
                                                {gCost > 0 && (
                                                    <span className={(character.money || 0) >= gCost ? 'text-amber-300' : 'text-rose-400'}>
                                                        {gCost.toLocaleString()} G
                                                    </span>
                                                )}
                                                {wCost > 0 && (
                                                    <span className={(base?.resources?.wood || 0) >= wCost ? 'text-emerald-300' : 'text-rose-400'}>
                                                        목재 {wCost}
                                                    </span>
                                                )}
                                                {sCost > 0 && (
                                                    <span className={(base?.resources?.stone || 0) >= sCost ? 'text-sky-300' : 'text-rose-400'}>
                                                        석재 {sCost}
                                                    </span>
                                                )}
                                                {fCost > 0 && (
                                                    <span className={(base?.resources?.food || 0) >= fCost ? 'text-lime-300' : 'text-rose-400'}>
                                                        식량 {fCost}
                                                    </span>
                                                )}
                                                {iCost > 0 && (
                                                    <span className={(base?.resources?.iron || 0) >= iCost ? 'text-slate-300' : 'text-rose-400'}>
                                                        철 {iCost}
                                                    </span>
                                                )}
                                                {mCost > 0 && (
                                                    <span className={(base?.resources?.manaCrystal || 0) >= mCost ? 'text-purple-300' : 'text-rose-400'}>
                                                        마정석 {mCost}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!canBuild}
                                            onClick={() => {
                                                setPlacingNewFacilityId(fac.id);
                                                setShowNewFacilityPicker(false);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black shrink-0"
                                        >
                                            {isUniqueBuilt ? '보유중' : !meetsBaseLv ? `Lv.${minBaseLv} 필요` : '위치 선택'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BaseRpgCanvas;
