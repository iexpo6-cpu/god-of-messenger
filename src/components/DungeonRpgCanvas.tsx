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

export interface DungeonRpgCanvasProps {
    gridState: GridDungeonState;
    character: Character;
    selectedTile: GridTile | null;
    isSeasonalBoss: boolean;
    bossName?: string;
    isPaused?: boolean;
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
    'magic_circle'
] as const;

type DungeonAssetKey = typeof DUNGEON_ASSET_KEYS[number];

const dungeonImageCache = new Map<string, HTMLImageElement | null>();
const dungeonImageLoading = new Set<string>();

const resolveDungeonAssetUrl = (key: DungeonAssetKey): string => {
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
    onMoveToTile,
    onSelectTile,
    onTriggerFloorChange,
    onExitDungeon
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [zoom, setZoom] = useState<number>(1.05);
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
            if (p.spec.sheetUrl) loadRpgSpriteImage(p.spec.sheetUrl);
        });
        DUNGEON_ASSET_KEYS.forEach(k => getDungeonImage(k));
    }, [partySprites]);

    // Initialize ambient floating embers/dust particles
    useEffect(() => {
        const arr = [];
        for (let i = 0; i < 36; i++) {
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
            // Instant snap on floor change
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
            // BFS auto-walk to clicked revealed tile
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

    // Theme palette (Normal stone dungeon vs Mythic golden abyssal sanctuary)
    const theme = useMemo(() => {
        if (isSeasonalBoss) {
            return {
                voidBg: '#09070f',
                floorA: '#1d182b',
                floorB: '#241e35',
                floorEdge: '#3b2f52',
                wallTop: '#161124',
                wallFace: '#2c2242',
                wallTrim: '#c59b46',
                torchColor: 'rgba(251, 191, 36, 0.24)',
                emberColor: '#fbbf24'
            };
        }
        return {
            voidBg: '#070a12',
            floorA: '#1c2433',
            floorB: '#212b3d',
            floorEdge: '#324059',
            wallTop: '#0f1521',
            wallFace: '#273247',
            wallTrim: '#475569',
            torchColor: 'rgba(245, 158, 11, 0.22)',
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
                    // Stop auto-walk right after stepping onto interactive event/combat tile
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

            const floorImg = getDungeonImage(isSeasonalBoss ? 'tile_floor_mythic' : 'tile_floor_stone');
            const wallImg = getDungeonImage(isSeasonalBoss ? 'tile_wall_mythic' : 'tile_wall_stone');
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
            const torchFlicker = 0.92 + 0.08 * Math.sin(now * 0.011) * Math.cos(now * 0.007);

            // 1. Draw Floor & Wall Tiles (2.5D RPG Maker style)
            for (let y = 0; y < gs.height; y++) {
                for (let x = 0; x < gs.width; x++) {
                    const tile = gs.tiles[y][x];
                    const px = x * TILE_PX;
                    const py = y * TILE_PX;
                    const hVal = tileHash(x, y, gs.currentFloor);

                    if (!tile.isRevealed) {
                        // Fog of War tile
                        ctx.fillStyle = '#05070e';
                        ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        ctx.fillStyle = 'rgba(30, 41, 59, 0.18)';
                        ctx.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
                        continue;
                    }

                    if (tile.type === 'wall') {
                        if (wallImg) {
                            ctx.drawImage(wallImg, px, py, TILE_PX, TILE_PX);
                        } else {
                            // 2.5D RPG Maker stone wall block: top cap + brick front facade
                            const belowIsFloor = y + 1 < gs.height && gs.tiles[y + 1][x].type !== 'wall';
                            ctx.fillStyle = theme.wallTop;
                            ctx.fillRect(px, py, TILE_PX, TILE_PX);

                            if (belowIsFloor) {
                                // Front facade (bottom 42% of tile)
                                const faceH = Math.floor(TILE_PX * 0.44);
                                const faceY = py + TILE_PX - faceH;
                                ctx.fillStyle = theme.wallFace;
                                ctx.fillRect(px, faceY, TILE_PX, faceH);
                                // Stone brick mortar lines
                                ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.moveTo(px, faceY + faceH * 0.5);
                                ctx.lineTo(px + TILE_PX, faceY + faceH * 0.5);
                                ctx.moveTo(px + TILE_PX * 0.5, faceY);
                                ctx.lineTo(px + TILE_PX * 0.5, faceY + faceH * 0.5);
                                ctx.moveTo(px + TILE_PX * 0.25, faceY + faceH * 0.5);
                                ctx.lineTo(px + TILE_PX * 0.25, py + TILE_PX);
                                ctx.moveTo(px + TILE_PX * 0.75, faceY + faceH * 0.5);
                                ctx.lineTo(px + TILE_PX * 0.75, py + TILE_PX);
                                ctx.stroke();
                                // Top lip highlight
                                ctx.fillStyle = theme.wallTrim;
                                ctx.fillRect(px, faceY, TILE_PX, 2.5);
                                // Cast shadow onto floor below
                                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                                ctx.fillRect(px, py + TILE_PX, TILE_PX, 7);

                                // Occasional wall torch sconce!
                                if (hVal > 0.78) {
                                    const torchImg = getDungeonImage('wall_torch');
                                    const tx = px + TILE_PX * 0.5;
                                    const ty = faceY + faceH * 0.35;
                                    if (torchImg) {
                                        ctx.drawImage(torchImg, px + 16, faceY - 6, 32, 32);
                                    } else {
                                        ctx.fillStyle = '#78350f';
                                        ctx.fillRect(tx - 2, ty, 4, 10);
                                        ctx.fillStyle = '#fb923c';
                                        ctx.beginPath();
                                        ctx.arc(tx, ty - 2, 4.5 * torchFlicker, 0, Math.PI * 2);
                                        ctx.fill();
                                        ctx.fillStyle = '#fef08a';
                                        ctx.beginPath();
                                        ctx.arc(tx, ty - 3, 2.2 * torchFlicker, 0, Math.PI * 2);
                                        ctx.fill();
                                    }
                                    // Warm radial glow from wall torch
                                    const grad = ctx.createRadialGradient(tx, ty, 2, tx, ty, 58 * torchFlicker);
                                    grad.addColorStop(0, 'rgba(251, 146, 60, 0.26)');
                                    grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
                                    ctx.fillStyle = grad;
                                    ctx.beginPath();
                                    ctx.arc(tx, ty, 58 * torchFlicker, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            } else {
                                // Subtle bevel border on solid wall roof
                                ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                                ctx.strokeRect(px + 1, py + 1, TILE_PX - 2, TILE_PX - 2);
                            }
                        }
                        continue;
                    }

                    // Walkable Floor Tile
                    if (floorImg) {
                        ctx.drawImage(floorImg, px, py, TILE_PX, TILE_PX);
                    } else {
                        ctx.fillStyle = (x + y) % 2 === 0 ? theme.floorA : theme.floorB;
                        ctx.fillRect(px, py, TILE_PX, TILE_PX);
                        // Flagstone seam
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px + 0.5, py + 0.5, TILE_PX - 1, TILE_PX - 1);
                        // Subtle inner stone bevel
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
                        ctx.strokeRect(px + 2.5, py + 2.5, TILE_PX - 5, TILE_PX - 5);

                        // Subtle cracks / moss / mythic trim
                        if (isSeasonalBoss && hVal > 0.72) {
                            ctx.strokeStyle = 'rgba(217, 179, 86, 0.16)';
                            ctx.strokeRect(px + 7, py + 7, TILE_PX - 14, TILE_PX - 14);
                        } else if (hVal < 0.16) {
                            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                            ctx.beginPath();
                            ctx.moveTo(px + 14, py + 18);
                            ctx.lineTo(px + 24, py + 26);
                            ctx.lineTo(px + 20, py + 37);
                            ctx.stroke();
                        }
                    }

                    // Decorative ambient prop on empty cleared floor corners (subtle)
                    if (!tile.content && tile.type === 'floor' && !(x === gs.playerPos.x && y === gs.playerPos.y)) {
                        if (hVal > 0.94) {
                            const crystalImg = getDungeonImage('crystal_cluster');
                            if (crystalImg) ctx.drawImage(crystalImg, px + 36, py + 6, 22, 22);
                        } else if (hVal < 0.04) {
                            const boneImg = getDungeonImage('skeleton_bones');
                            if (boneImg) ctx.drawImage(boneImg, px + 8, py + 36, 22, 22);
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

            // 3. Draw Tile Objects (Stairs, Entrance, Chest, Shrine, Rune, Monsters, Boss)
            for (let y = 0; y < gs.height; y++) {
                for (let x = 0; x < gs.width; x++) {
                    const tile = gs.tiles[y][x];
                    if (!tile.isRevealed || tile.type === 'wall') continue;
                    const px = x * TILE_PX;
                    const py = y * TILE_PX;
                    const cx = px + TILE_PX / 2;
                    const cy = py + TILE_PX / 2;

                    // Entrance / Stairs
                    if (tile.type === 'entrance') {
                        const img = getDungeonImage('entrance_gate');
                        if (img) {
                            ctx.drawImage(img, px + 4, py + 2, TILE_PX - 8, TILE_PX - 4);
                        } else {
                            // Emerald exit portal archway
                            const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 26);
                            g.addColorStop(0, 'rgba(52, 211, 153, 0.75)');
                            g.addColorStop(1, 'rgba(16, 185, 129, 0)');
                            ctx.fillStyle = g;
                            ctx.beginPath();
                            ctx.arc(cx, cy, 26, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = '#6ee7b7';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(cx, cy + 4, 16, Math.PI, 0);
                            ctx.stroke();
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '출구', '#065f46', '#6ee7b7');
                    } else if (tile.type === 'stairs') {
                        const img = getDungeonImage('stairs_down');
                        if (img) {
                            ctx.drawImage(img, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                        } else {
                            // Descending stone steps
                            ctx.fillStyle = '#0f172a';
                            ctx.fillRect(px + 12, py + 12, 40, 40);
                            for (let s = 0; s < 5; s++) {
                                ctx.fillStyle = `rgb(${85 - s * 14}, ${105 - s * 16}, ${135 - s * 18})`;
                                ctx.fillRect(px + 14 + s * 3, py + 14 + s * 7, 36 - s * 6, 6);
                            }
                            ctx.strokeStyle = '#38bdf8';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(px + 12, py + 12, 40, 40);
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '하층 ↓', '#0c4a6e', '#7dd3fc');
                    } else if (tile.type === 'stairs_up') {
                        const img = getDungeonImage('stairs_up');
                        if (img) {
                            ctx.drawImage(img, px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
                        } else {
                            ctx.fillStyle = '#451a03';
                            ctx.fillRect(px + 12, py + 12, 40, 40);
                            for (let s = 0; s < 5; s++) {
                                ctx.fillStyle = `rgb(${180 - s * 18}, ${140 - s * 16}, ${80 - s * 10})`;
                                ctx.fillRect(px + 14, py + 42 - s * 7, 36, 5);
                            }
                            ctx.strokeStyle = '#fbbf24';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(px + 12, py + 12, 40, 40);
                        }
                        drawMiniBadge(ctx, cx, py + TILE_PX - 6, '상층 ↑', '#78350f', '#fde68a');
                    }

                    // Interactive Content Objects
                    if (tile.content) {
                        const bob = Math.sin(now * 0.004 + x + y) * 2.5;

                        if (!tile.isCleared && !tile.isIdentified) {
                            // Unidentified mystery wisp (?)
                            const img = getDungeonImage('mystery_wisp');
                            if (img) {
                                ctx.drawImage(img, px + 8, py + 6 + bob, TILE_PX - 16, TILE_PX - 16);
                            } else {
                                const g = ctx.createRadialGradient(cx, cy + bob, 2, cx, cy + bob, 22);
                                g.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
                                g.addColorStop(0.55, 'rgba(245, 158, 11, 0.35)');
                                g.addColorStop(1, 'rgba(245, 158, 11, 0)');
                                ctx.fillStyle = g;
                                ctx.beginPath();
                                ctx.arc(cx, cy + bob, 22, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = '#fef3c7';
                                ctx.font = 'bold 20px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText('?', cx, cy + bob);
                            }
                        } else if (tile.content === 'chest') {
                            const img = getDungeonImage(tile.isCleared ? 'chest_open' : 'chest_closed');
                            if (img) {
                                ctx.drawImage(img, px + 8, py + 8, TILE_PX - 16, TILE_PX - 16);
                            } else {
                                ctx.fillStyle = tile.isCleared ? '#57534e' : '#92400e';
                                ctx.fillRect(px + 16, py + 22, 32, 22);
                                ctx.strokeStyle = tile.isCleared ? '#a8a29e' : '#fbbf24';
                                ctx.lineWidth = 2.5;
                                ctx.strokeRect(px + 16, py + 22, 32, 22);
                                ctx.fillStyle = tile.isCleared ? '#78716c' : '#f59e0b';
                                ctx.fillRect(px + 29, py + 28, 6, 8);
                            }
                            if (!tile.isCleared) drawMiniBadge(ctx, cx, py + 10, '보물', '#78350f', '#fde047');
                        } else if (tile.content === 'shrine') {
                            const img = getDungeonImage('shrine_fountain');
                            if (img) {
                                ctx.globalAlpha = tile.isCleared ? 0.5 : 1;
                                ctx.drawImage(img, px + 6, py + 4, TILE_PX - 12, TILE_PX - 12);
                                ctx.globalAlpha = 1;
                            } else {
                                const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
                                g.addColorStop(0, tile.isCleared ? 'rgba(148,163,184,0.3)' : 'rgba(34, 211, 238, 0.75)');
                                g.addColorStop(1, 'rgba(34, 211, 238, 0)');
                                ctx.fillStyle = g;
                                ctx.beginPath();
                                ctx.arc(cx, cy, 24, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = '#334155';
                                ctx.beginPath();
                                ctx.arc(cx, cy, 13, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = tile.isCleared ? '#64748b' : '#67e8f9';
                                ctx.beginPath();
                                ctx.arc(cx, cy, 8, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            if (!tile.isCleared) drawMiniBadge(ctx, cx, py + 10, '성소', '#164e63', '#67e8f9');
                        } else if (tile.content === 'rune_stone') {
                            const img = getDungeonImage(tile.isCleared ? 'rune_active' : 'rune_locked');
                            if (img) {
                                ctx.drawImage(img, px + 6, py + 2, TILE_PX - 12, TILE_PX - 8);
                            } else {
                                ctx.fillStyle = tile.isCleared ? '#0e7490' : '#4c1d95';
                                ctx.beginPath();
                                ctx.moveTo(cx, py + 10);
                                ctx.lineTo(px + 44, py + 28);
                                ctx.lineTo(px + 40, py + 52);
                                ctx.lineTo(px + 24, py + 52);
                                ctx.lineTo(px + 20, py + 28);
                                ctx.closePath();
                                ctx.fill();
                                ctx.strokeStyle = tile.isCleared ? '#67e8f9' : '#c084fc';
                                ctx.lineWidth = 2;
                                ctx.stroke();
                            }
                            drawMiniBadge(ctx, cx, py + 10, tile.isCleared ? '해제됨' : '봉인석', tile.isCleared ? '#164e63' : '#3b0764', tile.isCleared ? '#67e8f9' : '#d8b4fe');
                        } else if (!tile.isCleared && tile.content === 'enemy') {
                            const img = getDungeonImage('enemy_marker');
                            if (img) {
                                ctx.drawImage(img, px + 6, py + 4 + bob * 0.6, TILE_PX - 12, TILE_PX - 12);
                            } else {
                                ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
                                ctx.beginPath();
                                ctx.arc(cx, cy + 8, 16, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = '#7f1d1d';
                                ctx.beginPath();
                                ctx.arc(cx, cy + bob * 0.5, 13, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = '#fca5a5';
                                ctx.fillRect(cx - 6, cy - 2 + bob * 0.5, 4, 3);
                                ctx.fillRect(cx + 2, cy - 2 + bob * 0.5, 4, 3);
                            }
                            drawMiniBadge(ctx, cx, py + 8, '마물', '#7f1d1d', '#fca5a5');
                        } else if (!tile.isCleared && tile.content === 'miniboss') {
                            const img = getDungeonImage('miniboss_marker');
                            if (img) {
                                ctx.drawImage(img, px + 2, py + bob * 0.6, TILE_PX - 4, TILE_PX - 4);
                            } else {
                                ctx.fillStyle = 'rgba(244, 63, 94, 0.32)';
                                ctx.beginPath();
                                ctx.arc(cx, cy + 8, 20, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.fillStyle = '#9f1239';
                                ctx.beginPath();
                                ctx.arc(cx, cy + bob * 0.5, 16, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.strokeStyle = '#fda4af';
                                ctx.lineWidth = 2;
                                ctx.stroke();
                            }
                            drawMiniBadge(ctx, cx, py + 8, '정예', '#881337', '#fda4af');
                        } else if (!tile.isCleared && tile.content === 'boss') {
                            const magicImg = getDungeonImage('magic_circle');
                            if (magicImg) {
                                ctx.save();
                                ctx.globalAlpha = 0.55 + pulse * 0.35;
                                ctx.drawImage(magicImg, px - 10, py - 10, TILE_PX + 20, TILE_PX + 20);
                                ctx.restore();
                            } else {
                                ctx.strokeStyle = `rgba(244, 63, 94, ${0.5 + pulse * 0.45})`;
                                ctx.lineWidth = 3;
                                ctx.beginPath();
                                ctx.arc(cx, cy, 26 + pulse * 3, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                            const bossImg = getDungeonImage('boss_throne');
                            if (bossImg) {
                                ctx.drawImage(bossImg, px - 2, py - 6 + bob * 0.5, TILE_PX + 4, TILE_PX + 4);
                            } else {
                                ctx.fillStyle = '#450a0a';
                                ctx.beginPath();
                                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.strokeStyle = '#fbbf24';
                                ctx.lineWidth = 2.5;
                                ctx.stroke();
                                ctx.fillStyle = '#fbbf24';
                                ctx.font = 'bold 18px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText('👑', cx, cy);
                            }
                            drawMiniBadge(ctx, cx, py - 2, bossName ? `BOSS ${bossName.slice(0, 6)}` : 'BOSS', '#7f1d1d', '#fde047');
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
                const sheetImg = member.spec.sheetUrl ? getCachedRpgSpriteImage(member.spec.sheetUrl) : null;
                const animFrame = isMoving ? Math.floor(walkAnimRef.current) % 4 : 1;
                const frameCol = animFrame === 3 ? 1 : animFrame; // 0-1-2-1 RPG Maker walk cycle

                if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
                    const cols = member.spec.cols || 3;
                    const rows = member.spec.rows || 4;
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
                    drawFallbackChibiSprite(ctx, {
                        x: centerX,
                        y: footY,
                        size: spriteSize,
                        dir,
                        frame: frameCol,
                        hairColor: member.spec.hairColor,
                        outfitColor: member.spec.outfitColor,
                        accentColor: member.spec.accentColor,
                        isFemale: member.spec.gender === 'female'
                    });
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

            ctx.restore(); // End world camera transform

            // 8. Atmospheric Dungeon Vignette Overlay
            const vig = ctx.createRadialGradient(
                viewportSize.width / 2,
                viewportSize.height / 2,
                Math.min(viewportSize.width, viewportSize.height) * 0.32,
                viewportSize.width / 2,
                viewportSize.height / 2,
                Math.max(viewportSize.width, viewportSize.height) * 0.72
            );
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(2, 6, 23, 0.62)');
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
            className="relative w-full h-full min-h-[380px] sm:min-h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
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
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg">
                <button
                    onClick={() => setZoom(z => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="축소"
                >
                    <ZoomOut size={15} />
                </button>
                <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 min-w-[44px] text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={() => setZoom(z => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="확대"
                >
                    <ZoomIn size={15} />
                </button>
                <button
                    onClick={handleFitMap}
                    className="px-2 py-1 hover:bg-slate-800 rounded-lg text-[11px] font-bold text-cyan-300 flex items-center gap-1 transition-colors border-l border-slate-800 ml-0.5"
                    title="전체 지도 맞추기"
                >
                    <Maximize2 size={13} /> 전체
                </button>
            </div>

            {/* 우측 상단: 실시간 미니맵 */}
            <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-xl hidden sm:block">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 px-0.5">
                    <span className="flex items-center gap-1"><Compass size={11} className="text-amber-400" /> 미니맵</span>
                    <span className="font-mono text-amber-300">({gridState.playerPos.x},{gridState.playerPos.y})</span>
                </div>
                <div
                    className="grid gap-[1px] bg-slate-900 p-1 rounded-lg border border-slate-800"
                    style={{ gridTemplateColumns: `repeat(${gridState.width}, 7px)` }}
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
                                else if (t.type === 'stairs' || t.type === 'stairs_up') bg = 'bg-sky-400';
                                else if (t.type === 'entrance') bg = 'bg-emerald-400';
                                else bg = 'bg-slate-600/80';
                            }
                            return <div key={`${x}-${y}`} className={`w-[7px] h-[7px] rounded-[1px] ${bg}`} />;
                        })
                    )}
                </div>
            </div>

            {/* 하단 안내 오버레이 */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-700/70 px-3 py-1 rounded-full text-[11px] text-slate-300 font-medium whitespace-nowrap pointer-events-none shadow-lg">
                🖱️ 바닥 클릭 자동 이동 · ⌨️ WASD / 방향키 탐험 · 🔍 휠 확대/축소
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
