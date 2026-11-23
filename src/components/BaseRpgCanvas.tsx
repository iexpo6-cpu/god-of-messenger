import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BaseDecorationItem, Character, FacilityInstance } from '../types';
import { FACILITIES_INFO, FACILITY_CONSTRUCTION_COSTS } from '../constants';
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
    resolveDecorationSpriteUrl
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
    getFacilityConstructionDuration
} from '../services/baseConstructionService';
import { getTimeOfDay } from '../services/gameTimeService';
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
    const [spriteTick, setSpriteTick] = useState(0);

    // 4-Mode Editor State
    const [mode, setMode] = useState<BaseEditorMode>('explore');
    const [movingFacility, setMovingFacility] = useState<BaseFacilityNode | null>(null);
    const [placingNewFacilityId, setPlacingNewFacilityId] = useState<string | null>(null);
    const [showNewFacilityPicker, setShowNewFacilityPicker] = useState(false);

    // Tile Painting State
    const [selectedFloorTile, setSelectedFloorTile] = useState<BaseFloorTileId>('stone_road');
    const [brushSize, setBrushSize] = useState<1 | 3 | 5>(1);
    const isPaintingDragRef = useRef(false);

    // Decoration State
    const [decoCategory, setDecoCategory] = useState<'자연·정원' | '마을·가구' | '신비·성채'>('자연·정원');
    const [selectedDecoKey, setSelectedDecoKey] = useState<string>(BASE_DECORATION_CATALOG[0].key);
    const [decoEraseMode, setDecoEraseMode] = useState(false);

    // Interaction / HUD State
    const [selectedResident, setSelectedResident] = useState<BaseResidentEntity | null>(null);
    const [selectedMonster, setSelectedMonster] = useState<BaseFarmMonsterEntity | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [showMinimap, setShowMinimap] = useState(true);
    const [showWarpList, setShowWarpList] = useState(false);

    const mapData = useMemo(() => generateBaseTilemap(character), [character]);
    const loc = character.base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, loc.region, loc.nation).url,
        [character, loc.region, loc.nation]
    );

    const residentsRef = useRef<BaseResidentEntity[]>(mapData.residents);
    const monstersRef = useRef<BaseFarmMonsterEntity[]>(mapData.farmMonsters);
    const hoverTileRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        residentsRef.current = mapData.residents.map(r => ({ ...r }));
        monstersRef.current = mapData.farmMonsters.map(m => ({ ...m }));
    }, [mapData]);

    // Preload sprites, buildings, terrain & decorations
    useEffect(() => {
        let mounted = true;
        const spriteUrls = new Set<string>([playerSpriteUrl, ...mapData.residents.map(r => r.spriteUrl)]);
        spriteUrls.forEach(url => {
            loadRpgSpriteImage(url).then(() => {
                if (mounted) setSpriteTick(t => t + 1);
            });
        });

        const cityUrls = new Set<string>([
            ...(['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).map(p =>
                getTerrainTileUrl(mapData.cultureKey, p)
            ),
            ...mapData.facilities.map(f => f.spriteUrl).filter((u): u is string => Boolean(u)),
            ...mapData.decorations.map(d => resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part)),
            ...BASE_DECORATION_CATALOG.map(d => resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part))
        ]);
        cityUrls.forEach(url => {
            loadCityAssetImage(url).then(img => {
                if (mounted && img) setSpriteTick(t => t + 1);
            });
        });

        mapData.farmMonsters.forEach(m => {
            if (m.visualUrl) {
                loadCityAssetImage(m.visualUrl).then(img => {
                    if (mounted && img) setSpriteTick(t => t + 1);
                });
            }
        });

        return () => {
            mounted = false;
        };
    }, [playerSpriteUrl, mapData]);

    // Resize observer
    useEffect(() => {
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
    }, []);

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
    const cameraRef = useRef({ x: 0, y: 0 });
    const exitCooldownRef = useRef<number>(Date.now() + 900);

    // Clamp player inside bounds if map size changes
    useEffect(() => {
        const p = playerRef.current;
        p.x = Math.max(BASE_TILE_SIZE * 2, Math.min((mapData.cols - 2) * BASE_TILE_SIZE, p.x));
        p.y = Math.max(BASE_TILE_SIZE * 2, Math.min((mapData.rows - 2.5) * BASE_TILE_SIZE, p.y));
    }, [mapData.cols, mapData.rows]);

    const openFacilityModal = useCallback(
        (fac: BaseFacilityNode) => {
            if (fac.isHq) {
                onOpenBaseModal();
                return;
            }
            const t = fac.facilityType;
            if (t === 'farm') onOpenBaseModal('farm');
            else if (t === 'mine') onOpenBaseModal('mine');
            else if (t === 'housing' || t === 'home' || t === 'my_home') onOpenBaseModal('housing');
            else if (t === 'monster_farm' || t === 'monster_ranch') onOpenBaseModal('monster_farm');
            else if (t === 'monster_arena') onOpenBaseModal('monster_arena');
            else if (t === 'alchemy') onOpenBaseModal('alchemy');
            else if (t === 'blacksmith') onOpenBaseModal('blacksmith');
            else if (t === 'cooking') onOpenBaseModal('cooking');
            else if (t === 'storage') onOpenBaseModal('storage');
            else if (t === 'dispatch') onOpenBaseModal('dispatch');
            else if (t === 'lab') onOpenBaseModal('lab');
            else if (t === 'workshop') onOpenBaseModal('workshop');
            else if (t === 'child_academy') onOpenBaseModal('child_academy');
            else onOpenBaseModal();
        },
        [onOpenBaseModal]
    );

    const findNearestInteractable = useCallback(() => {
        const p = playerRef.current;
        let bestRes: BaseResidentEntity | null = null;
        let bestResD = BASE_TILE_SIZE * 1.45;
        for (const r of residentsRef.current) {
            const d = Math.hypot(r.px - p.x, r.py - p.y);
            if (d < bestResD) {
                bestResD = d;
                bestRes = r;
            }
        }
        if (bestRes) return { kind: 'resident' as const, resident: bestRes };

        let bestMon: BaseFarmMonsterEntity | null = null;
        let bestMonD = BASE_TILE_SIZE * 1.45;
        for (const m of monstersRef.current) {
            const d = Math.hypot(m.px - p.x, m.py - p.y);
            if (d < bestMonD) {
                bestMonD = d;
                bestMon = m;
            }
        }
        if (bestMon) return { kind: 'monster' as const, monster: bestMon };

        let bestFac: BaseFacilityNode | null = null;
        let bestFacD = BASE_TILE_SIZE * 2.1;
        for (const f of mapData.facilities) {
            const fx = (f.doorX + 0.5) * BASE_TILE_SIZE;
            const fy = (f.doorY + 0.5) * BASE_TILE_SIZE;
            const d = Math.hypot(fx - p.x, fy - p.y);
            if (d < bestFacD) {
                bestFacD = d;
                bestFac = f;
            }
        }
        if (bestFac) return { kind: 'facility' as const, facility: bestFac };
        return null;
    }, [mapData.facilities]);

    const handleInteract = useCallback(() => {
        if (mode !== 'explore') return;
        const target = findNearestInteractable();
        if (!target) return;
        if (target.kind === 'resident') {
            setSelectedResident(target.resident);
            setSelectedMonster(null);
        } else if (target.kind === 'monster') {
            setSelectedMonster(target.monster);
            setSelectedResident(null);
        } else {
            openFacilityModal(target.facility);
        }
    }, [mode, findNearestInteractable, openFacilityModal]);

    // Keyboard controls
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                e.preventDefault();
                keysRef.current.add(k);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
            } else if (k === ' ' || k === 'enter' || k === 'e') {
                e.preventDefault();
                handleInteract();
            } else if (k === 'escape') {
                setMovingFacility(null);
                setPlacingNewFacilityId(null);
                setShowNewFacilityPicker(false);
                setSelectedResident(null);
                setSelectedMonster(null);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key.toLowerCase());
        };
        const onBlur = () => {
            keysRef.current.clear();
            dpadRef.current = null;
            isPaintingDragRef.current = false;
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

    // 1. Expand Base Map Size (Lv.1: 40x40 -> Lv.5: 200x200)
    const expansionOpt = getBaseMapExpansionOption(mapData.baseLevel, mapData.cols, mapData.rows);
    const handleExpandMapSize = () => {
        if (!character.base || !onUpdateCharacter || !expansionOpt.canExpand) return;
        const base = character.base;
        const curGold = character.money || 0;
        const curWood = base.resources?.wood || 0;
        const curStone = base.resources?.stone || 0;
        if (curGold < expansionOpt.goldCost || curWood < expansionOpt.woodCost || curStone < expansionOpt.stoneCost) {
            return;
        }
        const nextChar: Character = {
            ...character,
            money: curGold - expansionOpt.goldCost,
            base: {
                ...base,
                mapWidth: expansionOpt.nextSize,
                mapHeight: expansionOpt.nextSize,
                resources: {
                    ...base.resources,
                    wood: curWood - expansionOpt.woodCost,
                    stone: curStone - expansionOpt.stoneCost
                }
            }
        };
        onUpdateCharacter(
            nextChar,
            `[기지 영지 확장] 기지 부지가 ${expansionOpt.nextSize}×${expansionOpt.nextSize} 타일로 확장되었습니다!`
        );
    };

    // 2. Paint Floor Tiles (per-tile purchase; default tile is free!)
    const paintTilesAt = useCallback(
        (centerX: number, centerY: number) => {
            if (!character.base || !onUpdateCharacter) return;
            const tileDef = FLOOR_TILE_MAP[selectedFloorTile];
            if (!tileDef) return;
            const half = Math.floor(brushSize / 2);
            const base = character.base;
            const prevCustom = { ...(base.customTiles || {}) };
            const toChange: string[] = [];

            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const tx = centerX + dx;
                    const ty = centerY + dy;
                    if (tx < 1 || ty < 1 || tx >= mapData.cols - 1 || ty >= mapData.rows - 1) continue;
                    const key = `${tx},${ty}`;
                    const curId = mapData.floorOverrides[key] || 'default';
                    if (curId === selectedFloorTile) continue;
                    toChange.push(key);
                }
            }
            if (toChange.length === 0) return;

            const totalGold = toChange.length * tileDef.gold;
            const totalWood = toChange.length * tileDef.wood;
            const totalStone = toChange.length * tileDef.stone;
            const curGold = character.money || 0;
            const curWood = base.resources?.wood || 0;
            const curStone = base.resources?.stone || 0;
            if (curGold < totalGold || curWood < totalWood || curStone < totalStone) return;

            toChange.forEach(k => {
                prevCustom[k] = selectedFloorTile;
            });

            onUpdateCharacter(
                {
                    ...character,
                    money: curGold - totalGold,
                    base: {
                        ...base,
                        customTiles: prevCustom,
                        resources: {
                            ...base.resources,
                            wood: curWood - totalWood,
                            stone: curStone - totalStone
                        }
                    }
                },
                ''
            );
        },
        [character, onUpdateCharacter, selectedFloorTile, brushSize, mapData.cols, mapData.rows, mapData.floorOverrides]
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

        // Prevent placing on top of facilities
        const hitsFac = mapData.facilities.some(
            f => tx >= f.tileX && tx < f.tileX + f.tileW && ty >= f.tileY && ty < f.tileY + f.tileH
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
            const costCfg = (FACILITY_CONSTRUCTION_COSTS as any)[placingNewFacilityId] || { gold: 20000, wood: 15, stone: 15 };
            const goldCost = costCfg.gold || 0;
            const woodCost = costCfg.wood || 0;
            const stoneCost = costCfg.stone || 0;
            const curGold = character.money || 0;
            const curWood = base.resources?.wood || 0;
            const curStone = base.resources?.stone || 0;
            if (curGold < goldCost || curWood < woodCost || curStone < stoneCost) return;

            const startDate = character.currentDate || '2000-03-02';
            const startTime = character.currentTime || '08:00';
            const durationMin = getFacilityConstructionDuration(placingNewFacilityId, false, 1);
            const { completionDate, completionTime } = calculateCompletionDateTime(startDate, startTime, durationMin);

            const newInst: FacilityInstance = {
                id: `${placingNewFacilityId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: placingNewFacilityId,
                level: 0,
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
                            wood: curWood - woodCost,
                            stone: curStone - stoneCost
                        },
                        layout: [...(base.layout || []), newInst]
                    }
                },
                `[기지 건설] (${tx}, ${ty}) 위치에 '${facInfo?.name || placingNewFacilityId}'(${foot.w}×${foot.h}) 건설을 착공했습니다!`
            );
            setPlacingNewFacilityId(null);
            return;
        }

        // C. Otherwise check if clicking an existing facility to pick it up for moving
        const clickedFac = mapData.facilities.find(
            f => tx >= f.tileX && tx < f.tileX + f.tileW && ty >= f.tileY && ty < f.tileY + f.tileH
        );
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
        if (mode === 'paint' && isPaintingDragRef.current) {
            paintTilesAt(pos.tx, pos.ty);
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
            if (Math.hypot(wx - r.px, wy - (r.py - 14)) <= 26) {
                setSelectedResident(r);
                setSelectedMonster(null);
                return;
            }
        }
        for (const m of monstersRef.current) {
            if (Math.hypot(wx - m.px, wy - m.py) <= 26) {
                setSelectedMonster(m);
                setSelectedResident(null);
                return;
            }
        }
        for (const f of mapData.facilities) {
            const fx = f.tileX * BASE_TILE_SIZE;
            const fy = f.tileY * BASE_TILE_SIZE;
            const fw = f.tileW * BASE_TILE_SIZE;
            const fh = f.tileH * BASE_TILE_SIZE;
            if (wx >= fx && wx <= fx + fw && wy >= fy - 18 && wy <= fy + fh) {
                openFacilityModal(f);
                return;
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

    // 60fps Main Render + Minimap Loop
    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;
        let minimapTick = 0;
        const timeOfDay = getTimeOfDay(character.currentTime || '12:00');

        const isBlocked = (px: number, py: number) => {
            const tx = Math.floor(px / BASE_TILE_SIZE);
            const ty = Math.floor(py / BASE_TILE_SIZE);
            if (tx < 0 || ty < 0 || tx >= mapData.cols || ty >= mapData.rows) return true;
            return mapData.solidSet.has(`${tx},${ty}`);
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;

            // 1. Update player
            const p = playerRef.current;
            let vx = 0;
            let vy = 0;
            const keys = keysRef.current;
            if (keys.has('arrowleft') || keys.has('a') || dpadRef.current === 'left') vx -= 1;
            if (keys.has('arrowright') || keys.has('d') || dpadRef.current === 'right') vx += 1;
            if (keys.has('arrowup') || keys.has('w') || dpadRef.current === 'up') vy -= 1;
            if (keys.has('arrowdown') || keys.has('s') || dpadRef.current === 'down') vy += 1;

            if (vx === 0 && vy === 0 && p.targetX !== null && p.targetY !== null) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 6) {
                    vx = dx / dist;
                    vy = dy / dist;
                } else {
                    p.targetX = null;
                    p.targetY = null;
                }
            }

            if (vx !== 0 || vy !== 0) {
                const len = Math.hypot(vx, vy) || 1;
                const speed = mode === 'explore' ? 210 : 320; // 편집 모드에서는 대형 맵을 더 빠르게 탐색!
                const nx = p.x + (vx / len) * speed * dt;
                const ny = p.y + (vy / len) * speed * dt;
                if (mode !== 'explore' || !isBlocked(nx, p.y)) {
                    p.x = Math.max(BASE_TILE_SIZE, Math.min((mapData.cols - 1) * BASE_TILE_SIZE, nx));
                }
                if (mode !== 'explore' || !isBlocked(p.x, ny)) {
                    p.y = Math.max(BASE_TILE_SIZE, Math.min((mapData.rows - 1) * BASE_TILE_SIZE, ny));
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

            // South gate auto-exit in explore mode
            const ptx = Math.floor(p.x / BASE_TILE_SIZE);
            const pty = Math.floor(p.y / BASE_TILE_SIZE);
            if (
                mode === 'explore' &&
                Date.now() > exitCooldownRef.current &&
                pty >= mapData.exitGate.y &&
                ptx >= mapData.exitGate.x &&
                ptx < mapData.exitGate.x + mapData.exitGate.w
            ) {
                onExitToCity();
                return;
            }

            // 2. Residents AI
            residentsRef.current.forEach(r => {
                r.wanderTimer -= dt;
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
                        const nx = r.px + (dx / dist) * spd * dt;
                        const ny = r.py + (dy / dist) * spd * dt;
                        if (!isBlocked(nx, ny)) {
                            r.px = nx;
                            r.py = ny;
                        } else {
                            r.targetPx = null;
                            r.targetPy = null;
                        }
                        r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                        r.animTimer += dt;
                        if (r.animTimer >= 0.22) {
                            r.animTimer = 0;
                            r.walkFrame = (r.walkFrame + 1) % 3;
                        }
                    }
                } else if (r.wanderTimer <= 0) {
                    r.wanderTimer = 2.4 + Math.random() * 3.5;
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 20 + Math.random() * 52;
                    r.targetPx = r.homePx + Math.cos(angle) * radius;
                    r.targetPy = r.homePy + Math.sin(angle) * radius;
                }
            });

            // 3. Farm monsters AI
            monstersRef.current.forEach(m => {
                m.bobPhase += dt * 3.4;
                m.wanderTimer -= dt;
                if (m.targetPx !== null && m.targetPy !== null) {
                    const dx = m.targetPx - m.px;
                    const dy = m.targetPy - m.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        m.targetPx = null;
                        m.targetPy = null;
                    } else {
                        const spd = 36;
                        m.px = Math.max(m.minPx, Math.min(m.maxPx, m.px + (dx / dist) * spd * dt));
                        m.py = Math.max(m.minPy, Math.min(m.maxPy, m.py + (dy / dist) * spd * dt));
                        m.dir = dx >= 0 ? 'right' : 'left';
                    }
                } else if (m.wanderTimer <= 0) {
                    m.wanderTimer = 1.6 + Math.random() * 2.8;
                    m.targetPx = m.minPx + Math.random() * Math.max(10, m.maxPx - m.minPx);
                    m.targetPy = m.minPy + Math.random() * Math.max(10, m.maxPy - m.minPy);
                }
            });

            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                if (mode !== 'explore') {
                    setNearbyLabel(null);
                } else {
                    const near = findNearestInteractable();
                    if (!near) setNearbyLabel(null);
                    else if (near.kind === 'resident') setNearbyLabel(`${near.resident.name} (${near.resident.role})`);
                    else if (near.kind === 'monster') setNearbyLabel(`🐾 ${near.monster.name} Lv.${near.monster.level}`);
                    else setNearbyLabel(`${near.facility.iconText} ${near.facility.label}`);
                }
            }

            // 4. Camera follow
            const mapW = mapData.cols * BASE_TILE_SIZE;
            const mapH = mapData.rows * BASE_TILE_SIZE;
            const camX = Math.max(0, Math.min(Math.max(0, mapW - viewportSize.w), p.x - viewportSize.w / 2));
            const camY = Math.max(0, Math.min(Math.max(0, mapH - viewportSize.h), p.y - viewportSize.h / 2));
            cameraRef.current = { x: Math.round(camX), y: Math.round(camY) };

            // 5. Render main viewport (strictly viewport-culled for 200x200 60fps!)
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, viewportSize.w, viewportSize.h);
                ctx.save();
                ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'road'));
                const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'plaza'));
                const royalImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'royal_road'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'wall'));
                const waterImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'water'));

                const startC = Math.max(0, Math.floor(cameraRef.current.x / BASE_TILE_SIZE) - 1);
                const endC = Math.min(mapData.cols - 1, Math.ceil((cameraRef.current.x + viewportSize.w) / BASE_TILE_SIZE) + 1);
                const startR = Math.max(0, Math.floor(cameraRef.current.y / BASE_TILE_SIZE) - 1);
                const endR = Math.min(mapData.rows - 1, Math.ceil((cameraRef.current.y + viewportSize.h) / BASE_TILE_SIZE) + 1);

                for (let r = startR; r <= endR; r++) {
                    for (let c = startC; c <= endC; c++) {
                        const x = c * BASE_TILE_SIZE;
                        const y = r * BASE_TILE_SIZE;
                        const isPerimeterWall =
                            r === 0 ||
                            c === 0 ||
                            c === mapData.cols - 1 ||
                            (r === mapData.rows - 1 && (c < mapData.exitGate.x || c >= mapData.exitGate.x + mapData.exitGate.w));
                        const isGate =
                            r === mapData.exitGate.y &&
                            c >= mapData.exitGate.x &&
                            c < mapData.exitGate.x + mapData.exitGate.w;

                        if (isPerimeterWall) {
                            if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
                                ctx.drawImage(wallImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else {
                                ctx.fillStyle = '#334155';
                                ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            }
                            continue;
                        }

                        // Base terrain
                        if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) {
                            ctx.drawImage(groundImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else {
                            ctx.fillStyle = (r + c) % 2 === 0 ? '#2f5e2c' : '#356831';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }

                        // Custom floor tile override
                        const floorId = mapData.floorOverrides[`${c},${r}`];
                        if (floorId && floorId !== 'default') {
                            const fDef = FLOOR_TILE_MAP[floorId];
                            if (floorId === 'stone_road' && roadImg?.complete && roadImg.naturalWidth > 0) {
                                ctx.drawImage(roadImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else if (floorId === 'plaza' && plazaImg?.complete && plazaImg.naturalWidth > 0) {
                                ctx.drawImage(plazaImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else if (floorId === 'royal_marble' && royalImg?.complete && royalImg.naturalWidth > 0) {
                                ctx.drawImage(royalImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else if (floorId === 'water' && waterImg?.complete && waterImg.naturalWidth > 0) {
                                ctx.drawImage(waterImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else if (fDef) {
                                ctx.fillStyle = (r + c) % 2 === 0 ? fDef.color : fDef.accentColor;
                                ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                                if (floorId === 'flower_field') {
                                    ctx.fillStyle = '#f472b6';
                                    ctx.fillRect(x + 10, y + 10, 5, 5);
                                    ctx.fillStyle = '#fde047';
                                    ctx.fillRect(x + 28, y + 16, 5, 5);
                                    ctx.fillStyle = '#c084fc';
                                    ctx.fillRect(x + 16, y + 30, 5, 5);
                                } else if (floorId === 'wood_deck') {
                                    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
                                    ctx.lineWidth = 1;
                                    ctx.beginPath();
                                    ctx.moveTo(x, y + 16);
                                    ctx.lineTo(x + BASE_TILE_SIZE, y + 16);
                                    ctx.moveTo(x, y + 32);
                                    ctx.lineTo(x + BASE_TILE_SIZE, y + 32);
                                    ctx.stroke();
                                } else if (floorId === 'shingye_jade' || floorId === 'magye_obsidian') {
                                    ctx.strokeStyle = floorId === 'shingye_jade' ? 'rgba(245,158,11,0.45)' : 'rgba(168,85,247,0.45)';
                                    ctx.strokeRect(x + 2, y + 2, BASE_TILE_SIZE - 4, BASE_TILE_SIZE - 4);
                                }
                            }
                        }

                        if (isGate) {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }

                        // Subtle grid overlay in editor modes
                        if (mode !== 'explore') {
                            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }
                    }
                }

                // Draw facilities (viewport culled)
                mapData.facilities.forEach(f => {
                    if (
                        f.tileX + f.tileW < startC - 1 ||
                        f.tileX > endC + 1 ||
                        f.tileY + f.tileH < startR - 1 ||
                        f.tileY > endR + 1
                    ) {
                        return;
                    }
                    const fx = f.tileX * BASE_TILE_SIZE;
                    const fy = f.tileY * BASE_TILE_SIZE;
                    const fw = f.tileW * BASE_TILE_SIZE;
                    const fh = f.tileH * BASE_TILE_SIZE;
                    const isBeingMoved = movingFacility?.id === f.id;

                    if (isBeingMoved) ctx.globalAlpha = 0.4;

                    if (f.isMonsterPen) {
                        ctx.fillStyle = 'rgba(34, 197, 94, 0.24)';
                        ctx.fillRect(fx, fy, fw, fh);
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 5;
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                        ctx.strokeStyle = '#d97706';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(fx + 5, fy + 5, fw - 10, fh - 10);
                    } else if (f.isFarm) {
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
                    } else if (f.spriteUrl) {
                        const img = getCachedCityAssetImage(f.spriteUrl);
                        if (img && img.complete && img.naturalWidth > 0) {
                            const scale = f.isHq ? 1.12 : 1.06;
                            const dw = Math.round((fw + 12) * scale);
                            const dh = Math.round((fh + 18) * scale);
                            const dx = Math.round(fx + fw / 2 - dw / 2);
                            const dy = Math.round(fy + fh - dh + 4);
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, dx, dy, dw, dh);
                        } else {
                            ctx.fillStyle = '#1e293b';
                            ctx.fillRect(fx + 4, fy + 4, fw - 8, fh - 8);
                        }
                    } else {
                        ctx.fillStyle = 'rgba(0,0,0,0.34)';
                        ctx.fillRect(fx + 8, fy + fh - 6, fw - 10, 10);
                        ctx.fillStyle = '#1e293b';
                        ctx.fillRect(fx + 4, fy + 10, fw - 8, fh - 14);
                        ctx.fillStyle = f.accentColor;
                        ctx.fillRect(fx + 2, fy + 4, fw - 4, 16);
                        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8);
                        ctx.font = `${Math.min(34, Math.round(fw * 0.25))}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(f.iconText, fx + fw / 2, fy + fh / 2 + 12);
                    }

                    if (f.underConstruction) {
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
                        ctx.fillRect(fx, fy, fw, fh);
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                    }

                    if (mode === 'build') {
                        ctx.strokeStyle = isBeingMoved ? '#38bdf8' : 'rgba(251, 191, 36, 0.7)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 4]);
                        ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
                        ctx.setLineDash([]);
                    }

                    ctx.globalAlpha = 1;

                    // Floating facility badge
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    const badgeText = f.underConstruction
                        ? `🔨 ${f.label}`
                        : mode === 'build'
                        ? `${f.label} (${f.tileW}×${f.tileH})`
                        : f.label;
                    const textW = Math.max(66, ctx.measureText(badgeText).width + 14);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                    ctx.fillRect(fx + fw / 2 - textW / 2, fy - 19, textW, 18);
                    ctx.strokeStyle = f.underConstruction ? '#fbbf24' : f.accentColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(fx + fw / 2 - textW / 2, fy - 19, textW, 18);
                    ctx.fillStyle = f.underConstruction ? '#fde68a' : '#f8fafc';
                    ctx.fillText(badgeText, fx + fw / 2, fy - 6);
                });

                // Draw placed decorations (viewport culled)
                mapData.decorations.forEach(d => {
                    if (d.x < startC - 1 || d.x > endC + 1 || d.y < startR - 1 || d.y > endR + 1) return;
                    const dx = d.x * BASE_TILE_SIZE;
                    const dy = d.y * BASE_TILE_SIZE;
                    const url = resolveDecorationSpriteUrl(mapData.cultureKey, d.pack, d.part);
                    const img = getCachedCityAssetImage(url);
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
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
                });

                // Draw editor hover ghost preview!
                const hover = hoverTileRef.current;
                if (hover) {
                    if (mode === 'build' && (movingFacility || placingNewFacilityId)) {
                        const foot = movingFacility
                            ? { w: movingFacility.tileW, h: movingFacility.tileH }
                            : getFacilityFootprint(placingNewFacilityId!);
                        const valid = canPlaceFacilityRect(
                            mapData.cols,
                            mapData.rows,
                            mapData.facilities,
                            mapData.floorOverrides,
                            mapData.exitGate,
                            hover.x,
                            hover.y,
                            foot.w,
                            foot.h,
                            movingFacility?.id
                        );
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

                // South gate label
                const gCx = (mapData.exitGate.x + mapData.exitGate.w / 2) * BASE_TILE_SIZE;
                const gCy = mapData.exitGate.y * BASE_TILE_SIZE;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(gCx - 54, gCy - 18, 108, 20);
                ctx.strokeStyle = '#f59e0b';
                ctx.strokeRect(gCx - 54, gCy - 18, 108, 20);
                ctx.fillStyle = '#fde68a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🚪 도시로 나가기', gCx, gCy - 4);

                // Draw roaming farm monsters (viewport culled)
                monstersRef.current.forEach(m => {
                    if (
                        m.px < cameraRef.current.x - 40 ||
                        m.px > cameraRef.current.x + viewportSize.w + 40 ||
                        m.py < cameraRef.current.y - 40 ||
                        m.py > cameraRef.current.y + viewportSize.h + 40
                    ) {
                        return;
                    }
                    const bob = Math.sin(m.bobPhase) * 3;
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.beginPath();
                    ctx.ellipse(m.px, m.py + 10, 14, 6, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const mImg = m.visualUrl ? getCachedCityAssetImage(m.visualUrl) : null;
                    if (mImg && mImg.complete && mImg.naturalWidth > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(m.px, m.py - 6 + bob, 16, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(mImg, m.px - 16, m.py - 22 + bob, 32, 32);
                        ctx.restore();
                        ctx.strokeStyle = '#4ade80';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(m.px, m.py - 6 + bob, 16, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.font = '22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('🐾', m.px, m.py + bob);
                    }

                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#dcfce7';
                    ctx.fillText(m.name, m.px, m.py + 22);
                });

                // Y-sorted sprites (viewport culled residents + player)
                const drawSprite = (
                    url: string,
                    px: number,
                    py: number,
                    dir: SpriteDirection,
                    frame: number,
                    name: string,
                    bubble?: string,
                    isPlayer?: boolean
                ) => {
                    ctx.fillStyle = 'rgba(0,0,0,0.38)';
                    ctx.beginPath();
                    ctx.ellipse(px, py + 4, 13, 6, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const img = getCachedRpgSpriteImage(url);
                    if (img && img.complete && img.naturalWidth > 0) {
                        const fw = img.naturalWidth / 3;
                        const fh = img.naturalHeight / 4;
                        const row = DIR_ROW_MAP[dir] ?? 0;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, frame * fw, row * fh, fw, fh, Math.round(px - 22), Math.round(py - 42), 44, 48);
                    } else {
                        ctx.fillStyle = isPlayer ? '#38bdf8' : '#a78bfa';
                        ctx.beginPath();
                        ctx.arc(px, py - 16, 12, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const nw = Math.max(40, ctx.measureText(name).width + 10);
                    ctx.fillStyle = isPlayer ? 'rgba(30, 58, 138, 0.88)' : 'rgba(15, 23, 42, 0.82)';
                    ctx.fillRect(px - nw / 2, py + 7, nw, 15);
                    ctx.fillStyle = isPlayer ? '#fde047' : '#e2e8f0';
                    ctx.fillText(name, px, py + 18);

                    if (bubble) {
                        ctx.font = '10px sans-serif';
                        const bw = Math.max(54, ctx.measureText(bubble).width + 12);
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
                        ctx.fillRect(px - bw / 2, py - 60, bw, 16);
                        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px - bw / 2, py - 60, bw, 16);
                        ctx.fillStyle = '#c7d2fe';
                        ctx.fillText(bubble, px, py - 48);
                    }
                };

                const visibleResidents = residentsRef.current.filter(
                    r =>
                        r.px >= cameraRef.current.x - 60 &&
                        r.px <= cameraRef.current.x + viewportSize.w + 60 &&
                        r.py >= cameraRef.current.y - 60 &&
                        r.py <= cameraRef.current.y + viewportSize.h + 60
                );
                const actors = [
                    ...visibleResidents.map(r => ({
                        y: r.py,
                        draw: () => drawSprite(r.spriteUrl, r.px, r.py, r.dir, r.walkFrame, r.name, r.activityBubble, false)
                    })),
                    {
                        y: p.y,
                        draw: () => drawSprite(playerSpriteUrl, p.x, p.y, p.dir, p.walkFrame, character.name, undefined, true)
                    }
                ].sort((a, b) => a.y - b.y);
                actors.forEach(a => a.draw());

                ctx.restore();

                if (timeOfDay === 'Night') {
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
                    ctx.fillRect(0, 0, viewportSize.w, viewportSize.h);
                }
            }

            // 6. Render minimap (~10fps for zero overhead)
            minimapTick += dt;
            if (minimapTick >= 0.1) {
                minimapTick = 0;
                const mm = minimapRef.current;
                const mctx = mm?.getContext('2d');
                if (mm && mctx) {
                    const mw = mm.width;
                    const mh = mm.height;
                    const sx = mw / mapData.cols;
                    const sy = mh / mapData.rows;
                    mctx.fillStyle = '#1e3a20';
                    mctx.fillRect(0, 0, mw, mh);

                    // Draw custom floor tiles on minimap
                    Object.entries(mapData.floorOverrides).forEach(([k, fid]) => {
                        const [txStr, tyStr] = k.split(',');
                        const tx = Number(txStr);
                        const ty = Number(tyStr);
                        const fDef = FLOOR_TILE_MAP[fid];
                        if (fDef) {
                            mctx.fillStyle = fDef.color;
                            mctx.fillRect(tx * sx, ty * sy, Math.max(1.5, sx), Math.max(1.5, sy));
                        }
                    });

                    // Facilities
                    mapData.facilities.forEach(f => {
                        mctx.fillStyle = f.isHq ? '#fbbf24' : f.accentColor;
                        mctx.fillRect(f.tileX * sx, f.tileY * sy, Math.max(3, f.tileW * sx), Math.max(3, f.tileH * sy));
                    });

                    // Residents
                    mctx.fillStyle = '#38bdf8';
                    residentsRef.current.forEach(r => {
                        mctx.fillRect((r.px / BASE_TILE_SIZE) * sx, (r.py / BASE_TILE_SIZE) * sy, 2, 2);
                    });

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
                        (viewportSize.w / BASE_TILE_SIZE) * sx,
                        (viewportSize.h / BASE_TILE_SIZE) * sy
                    );
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [
        mapData,
        viewportSize,
        playerSpriteUrl,
        character.name,
        character.currentTime,
        mode,
        movingFacility,
        placingNewFacilityId,
        brushSize,
        decoEraseMode,
        spriteTick,
        findNearestInteractable,
        onExitToCity
    ]);

    const base = character.base;
    const baseLevel = mapData.baseLevel;
    const maxSizeForLevel = BASE_MAX_MAP_SIZE_BY_LEVEL[baseLevel] || 40;
    const canAffordExpand =
        expansionOpt.canExpand &&
        (character.money || 0) >= expansionOpt.goldCost &&
        (base?.resources?.wood || 0) >= expansionOpt.woodCost &&
        (base?.resources?.stone || 0) >= expansionOpt.stoneCost;

    return (
        <div ref={containerRef} className="relative w-full h-full flex-1 min-h-0 bg-slate-950 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                width={viewportSize.w}
                height={viewportSize.h}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-pointer"
            />

            {/* Top HUD */}
            <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
                {/* Base Info Badge */}
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md">
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
                            <span>거주민 {mapData.residents.length}명</span>
                            <span>몬스터 {mapData.farmMonsters.length}마리</span>
                            <span className="text-amber-300">{(character.money || 0).toLocaleString()} G</span>
                            <span className="text-emerald-300">목재 {base?.resources?.wood || 0}</span>
                            <span className="text-sky-300">석재 {base?.resources?.stone || 0}</span>
                        </div>
                    </div>
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
                </div>
            </div>

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
                        {expansionOpt.canExpand ? (
                            <button
                                type="button"
                                disabled={!canAffordExpand}
                                onClick={handleExpandMapSize}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center gap-1.5"
                            >
                                <Expand size={14} /> 부지 확장 ({mapData.cols}×{mapData.rows} → {expansionOpt.nextSize}×{expansionOpt.nextSize})
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
            {mode === 'explore' && nearbyLabel && !selectedResident && !selectedMonster && (
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
                <div className="absolute bottom-4 right-4 z-20 md:hidden grid grid-cols-3 gap-1 w-28 h-28 opacity-85">
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'up')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'up')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                    >
                        <ArrowUp size={16} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'left')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'left')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'right')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'right')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                    >
                        <ArrowRight size={16} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'down')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'down')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                    >
                        <ArrowDown size={16} />
                    </button>
                    <div />
                </div>
            )}

            {/* Resident Quick Card */}
            {selectedResident && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-black text-white flex items-center gap-2">
                                <Users size={15} className="text-indigo-400" />
                                {selectedResident.name}
                                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded">
                                    Lv.{selectedResident.companionRef.level || 1}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{selectedResident.role}</div>
                            <div className="text-xs text-indigo-200 mt-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                {selectedResident.activityBubble}
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedResident(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        {onInspectCompanion && (
                            <button
                                type="button"
                                onClick={() => {
                                    const cid = selectedResident.id;
                                    setSelectedResident(null);
                                    onInspectCompanion(cid);
                                }}
                                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                            >
                                동료 정보 · 대화 열기
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setSelectedResident(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
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
                                const wCost = cfg.wood || 0;
                                const sCost = cfg.stone || 0;
                                const affordable =
                                    (character.money || 0) >= gCost &&
                                    (base?.resources?.wood || 0) >= wCost &&
                                    (base?.resources?.stone || 0) >= sCost;
                                return (
                                    <div
                                        key={fac.id}
                                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-white flex items-center gap-2">
                                                <span>{fac.name}</span>
                                                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded">
                                                    {foot.w}×{foot.h} 타일
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">{fac.description}</div>
                                            <div className="text-[10px] mt-1 flex flex-wrap gap-2">
                                                <span className={(character.money || 0) >= gCost ? 'text-amber-300' : 'text-rose-400'}>
                                                    {gCost.toLocaleString()} G
                                                </span>
                                                <span className={(base?.resources?.wood || 0) >= wCost ? 'text-emerald-300' : 'text-rose-400'}>
                                                    목재 {wCost}
                                                </span>
                                                <span className={(base?.resources?.stone || 0) >= sCost ? 'text-sky-300' : 'text-rose-400'}>
                                                    석재 {sCost}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!affordable}
                                            onClick={() => {
                                                setPlacingNewFacilityId(fac.id);
                                                setShowNewFacilityPicker(false);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black shrink-0"
                                        >
                                            위치 선택
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
