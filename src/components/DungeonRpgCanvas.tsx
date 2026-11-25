import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Character } from '../types';
import { GridDungeonState, GridTile } from '../services/gridDungeonEngine';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import { ZoomIn, ZoomOut, Maximize2, Compass } from 'lucide-react';
import { getCachedCityAssetImage, getPropAssetUrl, loadCityAssetImage } from '../services/cityAssetManifest';

export interface DungeonFloatingText {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
}

export interface DungeonRpgCanvasProps {
    gridState: GridDungeonState;
    character: Character;
    selectedTile: GridTile | null;
    isSeasonalBoss: boolean;
    bossName?: string;
    isPaused?: boolean;
    floatingNotice?: DungeonFloatingText | null;
    onMoveToTile: (x: number, y: number) => void;
    onSelectTile: (tile: GridTile) => void;
    onTriggerFloorChange?: (targetFloor: number) => void;
    onExitDungeon?: () => void;
}

const TILE_PX = 64;

const DUNGEON_ASSET_KEYS = [
    'tile_floor_stone',
    'tile_wall_stone',
    'tile_floor_mythic',
    'tile_wall_mythic',
    'tile_floor_volcanic',
    'tile_wall_volcanic',
    'tile_floor_celestial',
    'tile_wall_celestial',
    'entrance_gate',
    'stairs_down',
    'stairs_up',
    'chest_closed',
    'chest_open',
    'shrine_fountain',
    'rune_locked',
    'rune_active',
    'mystery_wisp',
    'enemy_marker',
    'miniboss_marker',
    'boss_throne',
    'wall_torch',
    'stone_pillar',
    'barrel_crates',
    'skeleton_bones',
    'crystal_cluster',
    'magic_circle',
    'zone_fire_lava',
    'zone_water_puddle',
    'zone_ice_frost',
    'zone_poison_swamp',
    'zone_holy_sanctuary',
    'zone_thunder_crack',
    'royal_carpet',
    'gargoyle_statue',
    'prison_bars',
    'arcane_bookshelf',
    'blood_altar',
    'campfire_rest',
    'spike_trap',
    'rune_lever',
    'dungeon_merchant',
    'mimic_chest',
    'wraith_reaper',
    'golem_sentry'
] as const;

type DungeonAssetKey = typeof DUNGEON_ASSET_KEYS[number];

const dungeonImageCache = new Map<string, HTMLImageElement | null>();
const dungeonImageLoading = new Set<string>();

export const resolveDungeonAssetUrl = (key: DungeonAssetKey): string => {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}assets/props/dungeon/${key}.png`;
};

const getDungeonImage = (key: DungeonAssetKey): HTMLImageElement | null => {
    if (dungeonImageCache.has(key)) return dungeonImageCache.get(key) || null;
    if (!dungeonImageLoading.has(key)) {
        dungeonImageLoading.add(key);
        const img = new Image();
        img.onload = () => {
            dungeonImageCache.set(key, img);
            dungeonImageLoading.delete(key);
        };
        img.onerror = () => {
            dungeonImageCache.set(key, null);
            dungeonImageLoading.delete(key);
        };
        img.src = resolveDungeonAssetUrl(key);
    }
    return null;
};

// Deterministic hash per tile for decorative props (torches, cracks, moss, crystals)
const tileHash = (x: number, y: number, floor: number): number => {
    let h = (x * 374761393 + y * 668265263 + floor * 1442695041) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

// Simple 4-directional (+ diagonal) BFS pathfinder on revealed walkable tiles
const findDungeonPath = (
    tiles: GridTile[][],
    start: { x: number; y: number },
    goal: { x: number; y: number }
): { x: number; y: number }[] => {
    const h = tiles.length;
    const w = tiles[0]?.length || 0;
    if (start.x === goal.x && start.y === goal.y) return [];
    if (goal.x < 0 || goal.x >= w || goal.y < 0 || goal.y >= h) return [];
    const goalTile = tiles[goal.y][goal.x];
    if (!goalTile.isRevealed || goalTile.type === 'wall') return [];

    const key = (x: number, y: number) => `${x},${y}`;
    const queue: { x: number; y: number }[] = [start];
    const parent = new Map<string, { x: number; y: number } | null>();
    parent.set(key(start.x, start.y), null);

    // Prefer cardinal moves first so RPG Maker walking looks natural
    const dirs = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.x === goal.x && cur.y === goal.y) {
            const path: { x: number; y: number }[] = [];
            let step: { x: number; y: number } | null = cur;
            while (step && !(step.x === start.x && step.y === start.y)) {
                path.unshift(step);
                step = parent.get(key(step.x, step.y)) || null;
            }
            return path;
        }
        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nk = key(nx, ny);
            if (parent.has(nk)) continue;
            const t = tiles[ny][nx];
            if (!t.isRevealed || t.type === 'wall') continue;
            // Avoid cutting corners diagonally through walls
            if (dx !== 0 && dy !== 0) {
                if (tiles[cur.y][nx].type === 'wall' || tiles[ny][cur.x].type === 'wall') continue;
            }
            parent.set(nk, cur);
            queue.push({ x: nx, y: ny });
        }
    }
    return [];
};

const DungeonRpgCanvas: React.FC<DungeonRpgCanvasProps> = ({
    gridState,
    character,
    selectedTile,
    isSeasonalBoss,
    bossName,
    isPaused = false,
    floatingNotice,
    onMoveToTile,
    onSelectTile,
    onTriggerFloorChange,
    onExitDungeon
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [zoom, setZoom] = useState<number>(0.92);
    const [viewportSize, setViewportSize] = useState({ width: 720, height: 500 });
    const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);

    // Smooth visual position & trail for RPG Maker caterpillar party
    const visualPosRef = useRef({ x: gridState.playerPos.x * TILE_PX, y: gridState.playerPos.y * TILE_PX });
    const prevTileRef = useRef({ x: gridState.playerPos.x, y: gridState.playerPos.y, floor: gridState.currentFloor });
    const facingRef = useRef<SpriteDirection>('down');
    const walkAnimRef = useRef(0);
    const trailRef = useRef<{ x: number; y: number; dir: SpriteDirection }[]>([]);
    const cameraRef = useRef({ x: gridState.playerPos.x * TILE_PX, y: gridState.playerPos.y * TILE_PX });
    const dustRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[]>([]);
    const embersRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number }[]>([]);
    const floatTextsRef = useRef<{ x: number; y: number; text: string; color: string; life: number; maxLife: number }[]>([]);

    // Enqueue floating text popup whenever floatingNotice prop updates
    useEffect(() => {
        if (!floatingNotice) return;
        floatTextsRef.current.push({
            x: floatingNotice.x * TILE_PX + TILE_PX * 0.5,
            y: floatingNotice.y * TILE_PX + 10,
            text: floatingNotice.text,
            color: floatingNotice.color || '#fde047',
            life: 0,
            maxLife: 58
        });
    }, [floatingNotice]);

    // Auto-walk BFS path queue
    const autoPathRef = useRef<{ x: number; y: number }[]>([]);
    const lastStepTimeRef = useRef(0);
    const onMoveRef = useRef(onMoveToTile);
    onMoveRef.current = onMoveToTile;

    const gridStateRef = useRef(gridState);
    gridStateRef.current = gridState;

    // Resolve player + up to 3 active companions RPG sprites
    const partySprites = useMemo(() => {
        const list: { id: string; name: string; spec: ReturnType<typeof resolveEntityRpgSprite> }[] = [];
        const loc = character.currentLocation || { region: '아시아', nation: character.nation };
        list.push({
            id: character.id || 'player',
            name: character.name,
            spec: resolveEntityRpgSprite(character, loc.region, loc.nation)
        });
        const activeParty = (character.companions || []).filter(c => c.inParty).slice(0, 3);
        for (const comp of activeParty) {
            list.push({
                id: comp.id,
                name: comp.name,
                spec: resolveEntityRpgSprite(comp as any, loc.region, loc.nation)
            });
        }
        return list;
    }, [character]);

    // Preload party sprites and dungeon prop images
    useEffect(() => {
        partySprites.forEach(p => {
            const url = p.spec.url || (p.spec as any).sheetUrl;
            if (url) loadRpgSpriteImage(url);
        });
        DUNGEON_ASSET_KEYS.forEach(k => getDungeonImage(k));
    }, [partySprites]);

    // Initialize ambient floating embers/dust particles
    useEffect(() => {
        const arr = [];
        for (let i = 0; i < 42; i++) {
            arr.push({
                x: Math.random() * gridState.width * TILE_PX,
                y: Math.random() * gridState.height * TILE_PX,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.15 - Math.random() * 0.35,
                size: 1.2 + Math.random() * 2.2,
                alpha: 0.25 + Math.random() * 0.55,
                phase: Math.random() * Math.PI * 2
            });
        }
        embersRef.current = arr;
    }, [gridState.width, gridState.height, gridState.currentFloor]);

    // Track playerPos changes for direction, trail, and floor resets
    useEffect(() => {
        const prev = prevTileRef.current;
        const curr = gridState.playerPos;
        if (prev.floor !== gridState.currentFloor) {
            visualPosRef.current = { x: curr.x * TILE_PX, y: curr.y * TILE_PX };
            cameraRef.current = { x: curr.x * TILE_PX, y: curr.y * TILE_PX };
            trailRef.current = [];
            autoPathRef.current = [];
        } else if (prev.x !== curr.x || prev.y !== curr.y) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            let dir: SpriteDirection = facingRef.current;
            if (Math.abs(dx) >= Math.abs(dy)) {
                dir = dx > 0 ? 'right' : 'left';
            } else {
                dir = dy > 0 ? 'down' : 'up';
            }
            facingRef.current = dir;
            trailRef.current.unshift({ x: prev.x * TILE_PX, y: prev.y * TILE_PX, dir });
            if (trailRef.current.length > 8) trailRef.current.length = 8;

            // Footstep dust puff
            for (let i = 0; i < 4; i++) {
                dustRef.current.push({
                    x: prev.x * TILE_PX + TILE_PX * 0.5 + (Math.random() - 0.5) * 14,
                    y: prev.y * TILE_PX + TILE_PX * 0.72 + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: -0.2 - Math.random() * 0.4,
                    life: 0,
                    maxLife: 20 + Math.random() * 14
                });
            }
        }
        prevTileRef.current = { x: curr.x, y: curr.y, floor: gridState.currentFloor };
    }, [gridState.playerPos.x, gridState.playerPos.y, gridState.currentFloor]);

    // Cancel auto-walk if modal/event paused
    useEffect(() => {
        if (isPaused) autoPathRef.current = [];
    }, [isPaused]);

    // ResizeObserver for responsive container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                setViewportSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
            }
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Screen -> Tile coordinate converter
    const screenToTile = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;
        const cam = cameraRef.current;
        const worldX = (sx - rect.width / 2) / zoom + cam.x + TILE_PX / 2;
        const worldY = (sy - rect.height / 2) / zoom + cam.y + TILE_PX / 2;
        const tx = Math.floor(worldX / TILE_PX);
        const ty = Math.floor(worldY / TILE_PX);
        const gs = gridStateRef.current;
        if (tx < 0 || tx >= gs.width || ty < 0 || ty >= gs.height) return null;
        return { x: tx, y: ty };
    }, [zoom]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPaused) return;
        const hit = screenToTile(e.clientX, e.clientY);
        if (!hit) return;
        const gs = gridStateRef.current;
        const tile = gs.tiles[hit.y]?.[hit.x];
        if (!tile) return;

        onSelectTile(tile);

        // Clicking current tile triggers stairs / entrance interaction directly
        if (hit.x === gs.playerPos.x && hit.y === gs.playerPos.y) {
            if (tile.type === 'stairs' && onTriggerFloorChange) {
                onTriggerFloorChange(gs.currentFloor + 1);
            } else if (tile.type === 'stairs_up' && onTriggerFloorChange) {
                onTriggerFloorChange(gs.currentFloor - 1);
            } else if (tile.type === 'entrance' && onExitDungeon) {
                onExitDungeon();
            }
            return;
        }

        if (!tile.isRevealed || tile.type === 'wall') return;

        const dx = Math.abs(hit.x - gs.playerPos.x);
        const dy = Math.abs(hit.y - gs.playerPos.y);
        if (dx <= 1 && dy <= 1) {
            autoPathRef.current = [];
            onMoveToTile(hit.x, hit.y);
        } else {
            const path = findDungeonPath(gs.tiles, gs.playerPos, hit);
            if (path.length > 0) {
                autoPathRef.current = path;
                lastStepTimeRef.current = 0;
            }
        }
    }, [isPaused, screenToTile, onSelectTile, onMoveToTile, onTriggerFloorChange, onExitDungeon]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const hit = screenToTile(e.clientX, e.clientY);
        setHoverTile(hit);
    }, [screenToTile]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        setZoom(z => Math.max(0.55, Math.min(2.2, Number((z + delta).toFixed(2)))));
    }, []);

    const handleFitMap = useCallback(() => {
        const gs = gridStateRef.current;
        const mapW = gs.width * TILE_PX;
        const mapH = gs.height * TILE_PX;
        const fit = Math.min(viewportSize.width / (mapW + 40), viewportSize.height / (mapH + 40));
        setZoom(Math.max(0.55, Math.min(1.6, Number(fit.toFixed(2)))));
    }, [viewportSize]);

    const theme = useMemo(() => {
        if (isSeasonalBoss) {
            return {
                voidBg: '#06050c',
                floorA: '#1d182b',
                floorB: '#241e35',
                floorEdge: '#3b2f52',
                wallTop: '#100c1c',
                wallFace: '#2c2242',
                wallTrim: '#d4af37',
                torchColor: 'rgba(251, 191, 36, 0.25)',
                emberColor: '#fbbf24'
            };
        }
        return {
            voidBg: '#05070e',
            floorA: '#1c2433',
            floorB: '#212b3d',
            floorEdge: '#324059',
            wallTop: '#0b101b',
            wallFace: '#273247',
            wallTrim: '#64748b',
            torchColor: 'rgba(245, 158, 11, 0.23)',
            emberColor: '#f59e0b'
        };
    }, [isSeasonalBoss]);

    // Main 60fps RPG Maker Canvas loop
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
            const targetW = Math.floor(viewportSize.width * dpr);
            const targetH = Math.floor(viewportSize.height * dpr);
            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }

            const gs = gridStateRef.current;

            // Process auto-walk step queue
            if (!isPaused && autoPathRef.current.length > 0 && now - lastStepTimeRef.current >= 155) {
                const nextStep = autoPathRef.current.shift()!;
                const dx = Math.abs(nextStep.x - gs.playerPos.x);
                const dy = Math.abs(nextStep.y - gs.playerPos.y);
                if (dx <= 1 && dy <= 1) {
                    lastStepTimeRef.current = now;
                    const nextTile = gs.tiles[nextStep.y]?.[nextStep.x];
                    if (nextTile && ((nextTile.content && !nextTile.isCleared) || nextTile.type === 'stairs' || nextTile.type === 'stairs_up')) {
                        autoPathRef.current = [];
                    }
                    onMoveRef.current(nextStep.x, nextStep.y);
                } else {
                    autoPathRef.current = [];
                }
            }

            // Smooth player visual interpolation
            const goalX = gs.playerPos.x * TILE_PX;
            const goalY = gs.playerPos.y * TILE_PX;
            const vPos = visualPosRef.current;
            const distX = goalX - vPos.x;
            const distY = goalY - vPos.y;
            const isMoving = Math.hypot(distX, distY) > 1.2;
            vPos.x += distX * 0.24;
            vPos.y += distY * 0.24;
            if (!isMoving) {
                vPos.x = goalX;
                vPos.y = goalY;
            } else {
                walkAnimRef.current += 0.22;
            }

            // Smooth camera follow
            const cam = cameraRef.current;
            cam.x += (vPos.x - cam.x) * 0.14;
            cam.y += (vPos.y - cam.y) * 0.14;

            ctx.save();
            ctx.scale(dpr, dpr);

            // Clear void background
            ctx.fillStyle = theme.voidBg;
            ctx.fillRect(0, 0, viewportSize.width, viewportSize.height);

            // Camera transform
            ctx.save();
            ctx.translate(viewportSize.width / 2, viewportSize.height / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-(cam.x + TILE_PX / 2), -(cam.y + TILE_PX / 2));

            const isFinalFloor = gs.currentFloor === gs.maxFloors - 1;
            const floorKey: DungeonAssetKey = isSeasonalBoss
                ? (isFinalFloor || gs.currentFloor % 2 === 1 ? 'tile_floor_celestial' : 'tile_floor_mythic')
                : (isFinalFloor || gs.currentFloor >= 1 ? 'tile_floor_volcanic' : 'tile_floor_stone');
            const wallKey: DungeonAssetKey = isSeasonalBoss
                ? (isFinalFloor || gs.currentFloor % 2 === 1 ? 'tile_wall_celestial' : 'tile_wall_mythic')
                : (isFinalFloor || gs.currentFloor >= 1 ? 'tile_wall_volcanic' : 'tile_wall_stone');
            const floorImg = getDungeonImage(floorKey);
            const wallImg = getDungeonImage(wallKey);
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
            const torchFlicker = 0.92 + 0.08 * Math.sin(now * 0.011) * Math.cos(now * 0.007);

            // =========================================================================
            // 1. 혁신안 1: 2.5D 입체 벽면(천장 Roof / 전면 Facade 분리) + 바닥 AO + 소프트 안개
            // =========================================================================
            for (let y = 0; y < gs.height; y++) {
                for (let x = 0; x < gs.width; x++) {
                    const tile = gs.tiles[y][x];
                    const px = x * TILE_PX;
                    const py = y * TILE_PX;
                    const hVal = tileHash(x, y, gs.currentFloor);

                    if (!tile.isRevealed) {
                        // Soft-Edge Fog of War: 밝혀진 타일과 맞닿아 있으면 부드러운 그라데이션 테두리 연출
                        const hasRevealedNeighbor =
                            (y > 0 && gs.tiles[y - 1][x].isRevealed) ||
                            (y + 1 < gs.height && gs.tiles[y + 1][x].isRevealed) ||
                            (x > 0 && gs.tiles[y][x - 1].isRevealed) ||
                            (x + 1 < gs.width && gs.tiles[y][x + 1].isRevealed);

                        ctx.fillStyle = theme.voidBg;
                        ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        if (hasRevealedNeighbor) {
                            const fogGrad = ctx.createRadialGradient(
                                px + TILE_PX / 2, py + TILE_PX / 2, 4,
                                px + TILE_PX / 2, py + TILE_PX / 2, TILE_PX * 0.75
                            );
                            fogGrad.addColorStop(0, isSeasonalBoss ? 'rgba(44, 34, 66, 0.28)' : 'rgba(30, 41, 59, 0.28)');
                            fogGrad.addColorStop(1, 'rgba(5, 7, 14, 0)');
                            ctx.fillStyle = fogGrad;
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        }
                        continue;
                    }

                    if (tile.type === 'wall') {
                        const belowIsFloor = y + 1 < gs.height && gs.tiles[y + 1][x].type !== 'wall';
                        const aboveIsFloor = y > 0 && gs.tiles[y - 1][x].type !== 'wall';
                        const leftIsFloor = x > 0 && gs.tiles[y][x - 1].type !== 'wall';
                        const rightIsFloor = x + 1 < gs.width && gs.tiles[y][x + 1].type !== 'wall';

                        if (belowIsFloor) {
                            // 2.5D 전면 석벽 (상단 34% 천장 캡 + 하단 66% 전면 벽돌 텍스처 + 몰딩 라인)
                            ctx.fillStyle = theme.wallTop;
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);
                            if (wallImg) {
                                ctx.drawImage(wallImg, px, py, TILE_PX, TILE_PX);
                                // 상단 천장 캡 쉐이딩
                                ctx.fillStyle = 'rgba(5, 7, 14, 0.42)';
                                ctx.fillRect(px, py, TILE_PX, Math.floor(TILE_PX * 0.34));
                            } else {
                                const faceH = Math.floor(TILE_PX * 0.56);
                                const faceY = py + TILE_PX - faceH;
                                ctx.fillStyle = theme.wallFace;
                                ctx.fillRect(px, faceY, TILE_PX, faceH);
                            }
                            // 2.5D 석조/황금 상단 릿지(Ridge) 몰딩 라인
                            const ridgeY = py + Math.floor(TILE_PX * 0.34);
                            ctx.fillStyle = theme.wallTrim;
                            ctx.fillRect(px, ridgeY, TILE_PX, 2.5);
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                            ctx.fillRect(px, ridgeY + 2.5, TILE_PX, 2);
                            // 하단 베이스 걸레받이 음영
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                            ctx.fillRect(px, py + TILE_PX - 3, TILE_PX, 3);
                        } else {
                            // 사방이 벽인 천장(Roof) 타일: 어둡게 눌러서 바닥/전면벽과의 2.5D 높이차를 확실히 부여!
                            ctx.fillStyle = theme.wallTop;
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);
                            if (wallImg) {
                                ctx.save();
                                ctx.globalAlpha = 0.38;
                                ctx.drawImage(wallImg, px, py, TILE_PX, TILE_PX);
                                ctx.restore();
                            }
                            ctx.fillStyle = 'rgba(4, 6, 12, 0.52)';
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        }

                        // 바닥과 맞닿는 벽 외곽에 입체 하이라이트 림(Rim) 라인 추가
                        ctx.fillStyle = isSeasonalBoss ? 'rgba(212, 175, 55, 0.4)' : 'rgba(148, 163, 184, 0.32)';
                        if (aboveIsFloor) ctx.fillRect(px, py, TILE_PX, 2.5);
                        if (leftIsFloor) ctx.fillRect(px, py, 2.5, TILE_PX);
                        if (rightIsFloor) ctx.fillRect(px + TILE_PX - 2.5, py, 2.5, TILE_PX);

                        // 남향 전면 벽 횃불(wall_torch) 대칭/주기 배치 + 따뜻한 광원
                        if (belowIsFloor && (hVal > 0.65 || (x % 2 === 1 && hVal > 0.42))) {
                            const faceH = Math.floor(TILE_PX * 0.52);
                            const faceY = py + TILE_PX - faceH;
                            const torchImg = getDungeonImage('wall_torch');
                            const tx = px + TILE_PX * 0.5;
                            const ty = faceY + faceH * 0.35;
                            if (torchImg) {
                                ctx.drawImage(torchImg, px + 14, faceY - 6, 36, 36);
                            } else {
                                ctx.fillStyle = '#fb923c';
                                ctx.beginPath();
                                ctx.arc(tx, ty - 2, 4.5 * torchFlicker, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            const grad = ctx.createRadialGradient(tx, ty + 8, 2, tx, ty + 8, 68 * torchFlicker);
                            grad.addColorStop(0, 'rgba(251, 146, 60, 0.34)');
                            grad.addColorStop(0.55, 'rgba(245, 158, 11, 0.12)');
                            grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.arc(tx, ty + 8, 68 * torchFlicker, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        continue;
                    }

                    // Walkable Floor Tile
                    if (floorImg) {
                        ctx.drawImage(floorImg, px, py, TILE_PX, TILE_PX);
                        // 체커보드 미세 명암 차이로 타일 격자감 부여
                        if ((x + y) % 2 === 1) {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        }
                    } else {
                        ctx.fillStyle = (x + y) % 2 === 0 ? theme.floorA : theme.floorB;
                        ctx.fillRect(px, py, TILE_PX, TILE_PX);
                    }

                    // 타일 이음새 베벨
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 0.5, py + 0.5, TILE_PX - 1, TILE_PX - 1);

                    // 2.5D 바닥 Ambient Occlusion (벽과 맞닿는 바닥 가장자리에 깊은 그림자 드리우기)
                    const wallN = y > 0 && gs.tiles[y - 1][x].type === 'wall';
                    const wallS = y + 1 < gs.height && gs.tiles[y + 1][x].type === 'wall';
                    const wallW = x > 0 && gs.tiles[y][x - 1].type === 'wall';
                    const wallE = x + 1 < gs.width && gs.tiles[y][x + 1].type === 'wall';

                    if (wallN) {
                        const gN = ctx.createLinearGradient(px, py, px, py + 18);
                        gN.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
                        gN.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = gN;
                        ctx.fillRect(px, py, TILE_PX, 18);
                    }
                    if (wallS) {
                        const gS = ctx.createLinearGradient(px, py + TILE_PX, px, py + TILE_PX - 10);
                        gS.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
                        gS.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = gS;
                        ctx.fillRect(px, py + TILE_PX - 10, TILE_PX, 10);
                    }
                    if (wallW) {
                        const gW = ctx.createLinearGradient(px, py, px + 12, py);
                        gW.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
                        gW.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = gW;
                        ctx.fillRect(px, py, 12, TILE_PX);
                    }
                    if (wallE) {
                        const gE = ctx.createLinearGradient(px + TILE_PX, py, px + TILE_PX - 12, py);
                        gE.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
                        gE.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = gE;
                        ctx.fillRect(px + TILE_PX - 12, py, 12, TILE_PX);
                    }

                    // 왕실 레드카펫 러너 (보스 홀 및 주요 방 중앙 통로)
                    if (tile.hasCarpet) {
                        const carpetImg = getDungeonImage('royal_carpet');
                        if (carpetImg) {
                            ctx.save();
                            ctx.globalAlpha = 0.92;
                            ctx.drawImage(carpetImg, px + 2, py + 1, TILE_PX - 4, TILE_PX - 2);
                            ctx.restore();
                        }
                    }

                    // 혁신안 3: 6종 원소 지형 장판 렌더링 (타일 전체 크기로 화려하게!)
                    const zoneKeyMap: Record<string, DungeonAssetKey> = {
                        fire: 'zone_fire_lava',
                        water: 'zone_water_puddle',
                        ice: 'zone_ice_frost',
                        poison: 'zone_poison_swamp',
                        holy: 'zone_holy_sanctuary',
                        thunder: 'zone_thunder_crack'
                    };
                    if (tile.zoneType && zoneKeyMap[tile.zoneType]) {
                        const zImg = getDungeonImage(zoneKeyMap[tile.zoneType]);
                        if (zImg) {
                            ctx.save();
                            ctx.globalAlpha = tile.isCleared ? 0.35 : (0.85 + pulse * 0.15);
                            ctx.drawImage(zImg, px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                            ctx.restore();
                        }
                    } else if (tile.content === 'shrine') {
                        const holyZone = getDungeonImage('zone_holy_sanctuary');
                        if (holyZone) {
                            ctx.save();
                            ctx.globalAlpha = tile.isCleared ? 0.35 : 0.8;
                            ctx.drawImage(holyZone, px + 2, py + 4, TILE_PX - 4, TILE_PX - 4);
                            ctx.restore();
                        }
                    }

                    // Adjacent reachable tile subtle highlight
                    const isAdj = Math.abs(x - gs.playerPos.x) <= 1 && Math.abs(y - gs.playerPos.y) <= 1 && !(x === gs.playerPos.x && y === gs.playerPos.y);
                    if (isAdj) {
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
                        ctx.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                    }

                    // Hovered tile highlight
                    if (hoverTile && hoverTile.x === x && hoverTile.y === y) {
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                    }

                    // Selected tile highlight
                    if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
                        ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(px + 3, py + 3, TILE_PX - 6, TILE_PX - 6);
                    }
                }
            }

            // 2. Draw Auto-Walk Path Preview Dots
            if (autoPathRef.current.length > 0) {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
                for (const pt of autoPathRef.current) {
                    ctx.beginPath();
                    ctx.arc(pt.x * TILE_PX + TILE_PX / 2, pt.y * TILE_PX + TILE_PX / 2, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // =========================================================================
            // 3. 혁신안 2·3·4 + g2/g3 확장: 테마 룸 인테리어 소품 & 함정/상인/야영지 & 회전 마법진 & 다종 몬스터(!)
            // =========================================================================
            for (let y = 0; y < gs.height; y++) {
                for (let x = 0; x < gs.width; x++) {
                    const tile = gs.tiles[y][x];
                    if (!tile.isRevealed || tile.type === 'wall') continue;
                    const px = x * TILE_PX;
                    const py = y * TILE_PX;
                    const cx = px + TILE_PX / 2;
                    const cy = py + TILE_PX / 2;
                    const bob = Math.sin(now * 0.004 + x + y) * 2.5;

                    // 3-A. 테마 룸 인테리어 & 파밍 소품 (pillar, gargoyle, crate, bones, crystal, campfire, merchant, bookshelf, altar, prison, lever, spike_trap)
                    if (tile.propType === 'pillar') {
                        const pImg = getDungeonImage('stone_pillar');
                        if (pImg) {
                            ctx.fillStyle = 'rgba(0,0,0,0.45)';
                            ctx.beginPath();
                            ctx.ellipse(cx, py + TILE_PX - 8, 18, 7, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.drawImage(pImg, px + 6, py - 8, TILE_PX - 12, TILE_PX + 4);
                        }
                    } else if (tile.propType === 'gargoyle') {
                        const gImg = getDungeonImage('gargoyle_statue');
                        if (gImg) {
                            ctx.fillStyle = 'rgba(0,0,0,0.45)';
                            ctx.beginPath();
                            ctx.ellipse(cx, py + TILE_PX - 8, 18, 7, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.drawImage(gImg, px + 4, py - 8, TILE_PX - 8, TILE_PX + 4);
                        }
                    } else if (tile.propType === 'crate' && !tile.isCleared) {
                        const cImg = getDungeonImage('barrel_crates');
                        if (cImg) {
                            ctx.drawImage(cImg, px + 8, py + 8, TILE_PX - 16, TILE_PX - 16);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '보급통', '#451a03', '#fdba74');
                        }
                    } else if (tile.propType === 'bones' && !tile.isCleared) {
                        const bImg = getDungeonImage('skeleton_bones');
                        if (bImg) {
                            ctx.drawImage(bImg, px + 6, py + 10, TILE_PX - 12, TILE_PX - 12);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '유골', '#1e293b', '#cbd5e1');
                        }
                    } else if (tile.propType === 'crystal') {
                        const crImg = getDungeonImage('crystal_cluster');
                        const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48);
                        cGrad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
                        cGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                        ctx.fillStyle = cGrad;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 48, 0, Math.PI * 2);
                        ctx.fill();
                        if (crImg) {
                            ctx.globalAlpha = tile.isCleared ? 0.55 : 1;
                            ctx.drawImage(crImg, px + 6, py + 4 + bob * 0.4, TILE_PX - 12, TILE_PX - 12);
                            ctx.globalAlpha = 1;
                        }
                        if (!tile.isCleared) drawMiniBadge(ctx, cx, py + TILE_PX - 7, '마력수정', '#0c4a6e', '#7dd3fc');
                    } else if (tile.propType === 'campfire') {
                        const cfImg = getDungeonImage('campfire_rest');
                        const fGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 56 * torchFlicker);
                        fGrad.addColorStop(0, 'rgba(251, 146, 60, 0.36)');
                        fGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
                        ctx.fillStyle = fGrad;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 56 * torchFlicker, 0, Math.PI * 2);
                        ctx.fill();
                        if (cfImg) {
                            ctx.globalAlpha = tile.isCleared ? 0.55 : 1;
                            ctx.drawImage(cfImg, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                            ctx.globalAlpha = 1;
                        }
                        if (!tile.isCleared) drawMiniBadge(ctx, cx, py + TILE_PX - 7, '모닥불', '#7c2d12', '#fed7aa');
                    } else if (tile.propType === 'merchant') {
                        const mImg = getDungeonImage('dungeon_merchant');
                        if (mImg) {
                            ctx.globalAlpha = tile.isCleared ? 0.55 : 1;
                            ctx.drawImage(mImg, px + 4, py + 2 + bob * 0.5, TILE_PX - 8, TILE_PX - 6);
                            ctx.globalAlpha = 1;
                        }
                        if (!tile.isCleared) drawMiniBadge(ctx, cx, py + TILE_PX - 7, '방랑상인', '#3b0764', '#e9d5ff');
                    } else if (tile.propType === 'bookshelf' && !tile.isCleared) {
                        const bsImg = getDungeonImage('arcane_bookshelf');
                        if (bsImg) {
                            ctx.drawImage(bsImg, px + 4, py + 2, TILE_PX - 8, TILE_PX - 4);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '마도서가', '#1e3a8a', '#93c5fd');
                        }
                    } else if (tile.propType === 'altar' && !tile.isCleared) {
                        const alImg = getDungeonImage('blood_altar');
                        if (alImg) {
                            ctx.drawImage(alImg, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '혈석제단', '#7f1d1d', '#fca5a5');
                        }
                    } else if (tile.propType === 'prison' && !tile.isCleared) {
                        const prImg = getDungeonImage('prison_bars');
                        if (prImg) {
                            ctx.drawImage(prImg, px + 4, py + 2, TILE_PX - 8, TILE_PX - 4);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '감옥철창', '#334155', '#e2e8f0');
                        }
                    } else if (tile.propType === 'lever') {
                        const lvImg = getDungeonImage('rune_lever');
                        if (lvImg) {
                            ctx.globalAlpha = tile.isCleared ? 0.55 : 1;
                            ctx.drawImage(lvImg, px + 6, py + 6, TILE_PX - 12, TILE_PX - 12);
                            ctx.globalAlpha = 1;
                        }
                        if (!tile.isCleared) drawMiniBadge(ctx, cx, py + TILE_PX - 7, '제어레버', '#164e63', '#67e8f9');
                    } else if (tile.propType === 'spike_trap' && !tile.isCleared) {
                        const spImg = getDungeonImage('spike_trap');
                        if (spImg) {
                            ctx.drawImage(spImg, px + 6, py + 8, TILE_PX - 12, TILE_PX - 12);
                            drawMiniBadge(ctx, cx, py + TILE_PX - 7, '가시함정', '#450a0a', '#fda4af');
                        }
                    } else if (tile.propType === 'rescue_survivor' && !tile.isCleared) {
                        const survUrl = getPropAssetUrl('srpg', 'rescued_survivor');
                        loadCityAssetImage(survUrl);
                        const survImg = getCachedCityAssetImage(survUrl);
                        ctx.save();
                        ctx.fillStyle = `rgba(34, 211, 238, ${0.22 + pulse * 0.2})`;
                        ctx.beginPath();
                        ctx.arc(cx, cy + 4, 24, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        if (survImg && survImg.complete && survImg.naturalWidth > 0) {
                            ctx.drawImage(survImg, px + 4, py + 2 + bob * 0.5, TILE_PX - 8, TILE_PX - 6);
                        } else {
                            drawMiniBadge(ctx, cx, cy, '🆘', '#0e7490', '#ecfeff');
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 7, '🆘 실종자', '#0e7490', '#cffafe');
                    }

                    // 3-B. Entrance / Stairs
                    if (tile.type === 'entrance') {
                        const img = getDungeonImage('entrance_gate');
                        if (img) {
                            ctx.drawImage(img, px + 2, py - 2, TILE_PX - 4, TILE_PX);
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '출구', '#065f46', '#6ee7b7');
                    } else if (tile.type === 'stairs') {
                        const img = getDungeonImage('stairs_down');
                        if (img) {
                            ctx.drawImage(img, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '하층 ↓', '#0c4a6e', '#7dd3fc');
                    } else if (tile.type === 'stairs_up') {
                        const img = getDungeonImage('stairs_up');
                        if (img) {
                            ctx.drawImage(img, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '상층 ↑', '#78350f', '#fde68a');
                    }

                    // 3-C. Interactive Content Objects (시야 내 모든 오브젝트는 ? 없이 고유 이미지로 즉시 노출!)
                    if (tile.content) {
                        if (tile.content === 'chest') {
                            const img = getDungeonImage(tile.isCleared ? 'chest_open' : 'chest_closed');
                            if (img) {
                                ctx.drawImage(img, px + 6, py + 6, TILE_PX - 12, TILE_PX - 12);
                            }
                            if (!tile.isCleared) drawMiniBadge(ctx, cx, py + 10, '보물', '#78350f', '#fde047');
                        } else if (tile.content === 'shrine') {
                            const img = getDungeonImage('shrine_fountain');
                            if (img) {
                                ctx.globalAlpha = tile.isCleared ? 0.5 : 1;
                                ctx.drawImage(img, px + 4, py + 2, TILE_PX - 8, TILE_PX - 8);
                                ctx.globalAlpha = 1;
                            }
                            if (!tile.isCleared) drawMiniBadge(ctx, cx, py + 10, '치유성소', '#164e63', '#67e8f9');
                        } else if (tile.content === 'rune_stone') {
                            // 봉인석 아래 회전하는 마법진 연출
                            const magicImg = getDungeonImage('magic_circle');
                            if (magicImg) {
                                ctx.save();
                                ctx.translate(cx, cy + 4);
                                ctx.rotate(now * 0.0008);
                                ctx.globalAlpha = tile.isCleared ? 0.35 : (0.65 + pulse * 0.25);
                                ctx.drawImage(magicImg, -34, -34, 68, 68);
                                ctx.restore();
                            }
                            const img = getDungeonImage(tile.isCleared ? 'rune_active' : 'rune_locked');
                            if (img) {
                                ctx.drawImage(img, px + 6, py, TILE_PX - 12, TILE_PX - 6);
                            }
                            drawMiniBadge(ctx, cx, py + 8, tile.isCleared ? '해제됨' : '봉인석', tile.isCleared ? '#164e63' : '#3b0764', tile.isCleared ? '#67e8f9' : '#d8b4fe');
                        } else if (!tile.isCleared && tile.content === 'enemy') {
                            const alertFastBob = tile.isAlerted ? Math.sin(now * 0.014 + x) * 4.5 : bob * 0.6;
                            const enemyAsset: DungeonAssetKey =
                                tile.enemyVariant === 'mimic' ? 'mimic_chest' :
                                tile.enemyVariant === 'wraith' ? 'wraith_reaper' :
                                'enemy_marker';
                            const img = getDungeonImage(enemyAsset);
                            if (img) {
                                ctx.drawImage(img, px + 5, py + 3 + alertFastBob, TILE_PX - 10, TILE_PX - 10);
                            }
                            if (tile.isAlerted) {
                                drawMiniBadge(ctx, cx, py + 6, '! 경계중', '#991b1b', '#fef08a');
                            } else {
                                const label = tile.enemyVariant === 'mimic' ? '미믹' : tile.enemyVariant === 'wraith' ? '사신망령' : '마물';
                                drawMiniBadge(ctx, cx, py + 8, label, '#7f1d1d', '#fca5a5');
                            }
                        } else if (!tile.isCleared && tile.content === 'miniboss') {
                            const alertFastBob = tile.isAlerted ? Math.sin(now * 0.012 + x) * 4 : bob * 0.6;
                            const mbAsset: DungeonAssetKey = tile.enemyVariant === 'golem' ? 'golem_sentry' : 'miniboss_marker';
                            const img = getDungeonImage(mbAsset);
                            if (img) {
                                ctx.drawImage(img, px + 1, py - 2 + alertFastBob, TILE_PX - 2, TILE_PX - 2);
                            }
                            const mbLabel = tile.enemyVariant === 'golem' ? '고대골렘' : '정예수호자';
                            drawMiniBadge(ctx, cx, py + 6, tile.isAlerted ? `!! ${mbLabel}` : mbLabel, '#881337', '#fda4af');
                        } else if (!tile.isCleared && tile.content === 'boss') {
                            // 보스 알현실: 거대한 2x2 크기로 실시간 회전하는 고대 마법진 + 왕좌
                            const magicImg = getDungeonImage('magic_circle');
                            if (magicImg) {
                                ctx.save();
                                ctx.translate(cx, cy + 4);
                                ctx.rotate(now * 0.0006);
                                ctx.globalAlpha = 0.72 + pulse * 0.25;
                                ctx.drawImage(magicImg, -54, -54, 108, 108);
                                ctx.restore();
                            }
                            const bossImg = getDungeonImage('boss_throne');
                            if (bossImg) {
                                ctx.drawImage(bossImg, px - 8, py - 14 + bob * 0.5, TILE_PX + 16, TILE_PX + 16);
                            }
                            drawMiniBadge(ctx, cx, py - 6, bossName ? `👑 ${bossName.slice(0, 7)}` : '👑 BOSS', '#7f1d1d', '#fde047');
                        }
                    }
                }
            }

            // 4. Draw Dust Footstep Particles
            for (let i = dustRef.current.length - 1; i >= 0; i--) {
                const d = dustRef.current[i];
                d.x += d.vx;
                d.y += d.vy;
                d.life += 1;
                if (d.life >= d.maxLife) {
                    dustRef.current.splice(i, 1);
                    continue;
                }
                const alpha = (1 - d.life / d.maxLife) * 0.5;
                ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 2.5 + (d.life / d.maxLife) * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // 5. Draw RPG Maker Caterpillar Party (Companions trailing behind Player!)
            const drawOrder = [...partySprites].reverse(); // Draw companions first, player on top
            for (let idx = 0; idx < drawOrder.length; idx++) {
                const member = drawOrder[idx];
                const partyIndex = partySprites.length - 1 - idx; // 0 = player, 1..3 = companions
                let drawX = vPos.x;
                let drawY = vPos.y;
                let dir: SpriteDirection = facingRef.current;

                if (partyIndex > 0) {
                    const tPt = trailRef.current[Math.min(partyIndex - 1, trailRef.current.length - 1)];
                    if (tPt) {
                        drawX = tPt.x;
                        drawY = tPt.y;
                        dir = tPt.dir;
                    } else {
                        // Slightly tucked behind player if no trail yet
                        drawX = vPos.x - partyIndex * 10;
                        drawY = vPos.y - partyIndex * 6;
                    }
                }

                const centerX = drawX + TILE_PX / 2;
                const footY = drawY + TILE_PX * 0.78;

                // Ground drop shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
                ctx.beginPath();
                ctx.ellipse(centerX, footY + 2, partyIndex === 0 ? 15 : 12, 6, 0, 0, Math.PI * 2);
                ctx.fill();

                // Active player golden aura ring
                if (partyIndex === 0) {
                    ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + pulse * 0.35})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(centerX, footY + 2, 18, 8, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }

                const spriteSize = partyIndex === 0 ? 54 : 44;
                const spriteUrl = member.spec.url || (member.spec as any).sheetUrl;
                const sheetImg = spriteUrl ? getCachedRpgSpriteImage(spriteUrl) : null;
                if (spriteUrl && !sheetImg) {
                    loadRpgSpriteImage(spriteUrl);
                }
                const animFrame = isMoving ? Math.floor(walkAnimRef.current) % 4 : 1;
                const frameCol = animFrame === 3 ? 1 : animFrame; // 0-1-2-1 RPG Maker walk cycle

                if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
                    const cols = (member.spec as any).cols || 3;
                    const rows = (member.spec as any).rows || 4;
                    const fw = sheetImg.naturalWidth / cols;
                    const fh = sheetImg.naturalHeight / rows;
                    const row = DIRECTION_ROW_MAP[dir] ?? 0;
                    ctx.drawImage(
                        sheetImg,
                        (frameCol % cols) * fw,
                        (row % rows) * fh,
                        fw,
                        fh,
                        centerX - spriteSize / 2,
                        footY - spriteSize + 4,
                        spriteSize,
                        spriteSize
                    );
                } else {
                    drawFallbackChibiSprite(
                        ctx,
                        centerX,
                        footY,
                        spriteSize,
                        dir,
                        frameCol,
                        member.spec.regionKey || 'asia',
                        member.spec.genderKey || 'male'
                    );
                }

                if (partyIndex === 0) {
                    drawMiniBadge(ctx, centerX, footY - spriteSize - 2, character.name.slice(0, 8), 'rgba(15, 23, 42, 0.85)', '#fde68a');
                }
            }

            // 6. Dynamic Warm Torchlight Glow around Player
            const pCx = vPos.x + TILE_PX / 2;
            const pCy = vPos.y + TILE_PX / 2;
            const torchPx = Math.max(120, gs.torchRadius * TILE_PX * 1.15) * torchFlicker;
            const torchGrad = ctx.createRadialGradient(pCx, pCy, 14, pCx, pCy, torchPx);
            torchGrad.addColorStop(0, theme.torchColor);
            torchGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.06)');
            torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = torchGrad;
            ctx.beginPath();
            ctx.arc(pCx, pCy, torchPx, 0, Math.PI * 2);
            ctx.fill();

            // 7. Ambient Floating Dungeon Embers / Dust Motes
            for (const em of embersRef.current) {
                em.x += em.vx + Math.sin(now * 0.002 + em.phase) * 0.15;
                em.y += em.vy;
                if (em.y < 0) em.y = gs.height * TILE_PX;
                if (em.x < 0) em.x = gs.width * TILE_PX;
                if (em.x > gs.width * TILE_PX) em.x = 0;
                const tx = Math.floor(em.x / TILE_PX);
                const ty = Math.floor(em.y / TILE_PX);
                if (!gs.tiles[ty]?.[tx]?.isRevealed) continue;
                ctx.fillStyle = theme.emberColor;
                ctx.globalAlpha = em.alpha * (0.5 + 0.5 * Math.sin(now * 0.004 + em.phase));
                ctx.beginPath();
                ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // 7-B. Floating Gimmick & Loot Popups on Canvas
            for (let i = floatTextsRef.current.length - 1; i >= 0; i--) {
                const ft = floatTextsRef.current[i];
                ft.y -= 0.65;
                ft.life += 1;
                if (ft.life >= ft.maxLife) {
                    floatTextsRef.current.splice(i, 1);
                    continue;
                }
                const alpha = Math.min(1, (1 - ft.life / ft.maxLife) * 1.35);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 12px sans-serif';
                const tw = Math.max(40, ctx.measureText(ft.text).width + 16);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.beginPath();
                ctx.roundRect(ft.x - tw / 2, ft.y - 11, tw, 22, 6);
                ctx.fill();
                ctx.strokeStyle = ft.color;
                ctx.lineWidth = 1.4;
                ctx.stroke();
                ctx.fillStyle = ft.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ft.text, ft.x, ft.y + 0.5);
                ctx.restore();
            }

            ctx.restore(); // End world camera transform

            // 8. Atmospheric Dungeon Vignette Overlay
            const vig = ctx.createRadialGradient(
                viewportSize.width / 2,
                viewportSize.height / 2,
                Math.min(viewportSize.width, viewportSize.height) * 0.36,
                viewportSize.width / 2,
                viewportSize.height / 2,
                Math.max(viewportSize.width, viewportSize.height) * 0.76
            );
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(2, 6, 23, 0.56)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, viewportSize.width, viewportSize.height);

            ctx.restore();
            rafId = requestAnimationFrame(render);
        };

        rafId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafId);
    }, [viewportSize, zoom, theme, isSeasonalBoss, partySprites, hoverTile, selectedTile, bossName, character.name, isPaused]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[240px] sm:min-h-[460px] bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
        >
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverTile(null)}
                onWheel={handleWheel}
                className="w-full h-full block cursor-pointer"
            />

            {/* 좌측 상단: 줌 & 전체보기 컨트롤 */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-0.5 sm:gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shadow-lg">
                <button
                    onClick={() => setZoom(z => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
                    className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="축소"
                >
                    <ZoomOut size={14} />
                </button>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-300 px-1 sm:px-1.5 min-w-[38px] sm:min-w-[44px] text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={() => setZoom(z => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                    className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="확대"
                >
                    <ZoomIn size={14} />
                </button>
                <button
                    onClick={handleFitMap}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-slate-800 rounded-lg text-[10px] sm:text-[11px] font-bold text-cyan-300 flex items-center gap-1 transition-colors border-l border-slate-800 ml-0.5"
                    title="전체 지도 맞추기"
                >
                    <Maximize2 size={12} /> 전체
                </button>
            </div>

            {/* 우측 상단: 실시간 미니맵 */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 sm:p-2 shadow-xl hidden sm:block">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 px-0.5">
                    <span className="flex items-center gap-1"><Compass size={11} className="text-amber-400" /> 미니맵</span>
                    <span className="font-mono text-amber-300">({gridState.playerPos.x},{gridState.playerPos.y})</span>
                </div>
                <div
                    className="grid gap-[1px] bg-slate-900 p-1 rounded-lg border border-slate-800"
                    style={{ gridTemplateColumns: `repeat(${gridState.width}, 6px)` }}
                >
                    {gridState.tiles.map((row, y) =>
                        row.map((t, x) => {
                            const isP = gridState.playerPos.x === x && gridState.playerPos.y === y;
                            let bg = 'bg-slate-950';
                            if (t.isRevealed) {
                                if (t.type === 'wall') bg = 'bg-slate-800';
                                else if (isP) bg = 'bg-amber-400 animate-pulse';
                                else if (t.content === 'boss' && !t.isCleared) bg = 'bg-rose-500';
                                else if (t.content === 'miniboss' && !t.isCleared) bg = 'bg-pink-400';
                                else if (t.content === 'enemy' && !t.isCleared) bg = 'bg-red-400';
                                else if (t.content === 'chest' && !t.isCleared) bg = 'bg-yellow-400';
                                else if (t.content === 'shrine' && !t.isCleared) bg = 'bg-cyan-400';
                                else if (t.content === 'rune_stone' && !t.isCleared) bg = 'bg-purple-400';
                                else if (t.propType === 'crystal' && !t.isCleared) bg = 'bg-sky-300';
                                else if (t.propType === 'crate' && !t.isCleared) bg = 'bg-orange-400';
                                else if (t.propType === 'bones' && !t.isCleared) bg = 'bg-slate-300';
                                else if (t.type === 'stairs' || t.type === 'stairs_up') bg = 'bg-sky-400';
                                else if (t.type === 'entrance') bg = 'bg-emerald-400';
                                else bg = 'bg-slate-600/80';
                            }
                            return <div key={`${x}-${y}`} className={`w-[6px] h-[6px] rounded-[1px] ${bg}`} />;
                        })
                    )}
                </div>
            </div>

            {/* 하단 안내 오버레이 */}
            <div className="absolute bottom-1.5 sm:bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-700/70 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] text-slate-300 font-medium whitespace-nowrap pointer-events-none shadow-lg max-w-[94%] truncate">
                🖱️ 바닥 탭 자동 이동 · ⌨️ 방향키 탐험 · 🔍 확대/축소
            </div>
        </div>
    );
};

function drawMiniBadge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    text: string,
    bgColor: string,
    textColor: string
) {
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    const w = Math.max(26, ctx.measureText(text).width + 10);
    const h = 15;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y + 0.5);
    ctx.restore();
}

export default DungeonRpgCanvas;
