import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Character, FacilityInstance } from '../types';
import { FACILITIES_INFO, FACILITY_CONSTRUCTION_COSTS } from '../constants';
import {
    BASE_TILE_SIZE,
    BaseEmptySlotNode,
    BaseFacilityNode,
    BaseFarmMonsterEntity,
    BaseResidentEntity,
    generateBaseTilemap
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
    Hammer,
    Home,
    PawPrint,
    Settings,
    Users,
    X,
    Footprints
} from 'lucide-react';

interface BaseRpgCanvasProps {
    character: Character;
    onExitToCity: () => void;
    onOpenBaseModal: (initialSubModal?: string) => void;
    onInspectCompanion?: (companionId: string) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string) => void;
}

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 600 });
    const [spriteTick, setSpriteTick] = useState(0);
    const [mode, setMode] = useState<'explore' | 'build'>('explore');
    const [buildSlot, setBuildSlot] = useState<BaseEmptySlotNode | null>(null);
    const [selectedResident, setSelectedResident] = useState<BaseResidentEntity | null>(null);
    const [selectedMonster, setSelectedMonster] = useState<BaseFarmMonsterEntity | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);

    const mapData = useMemo(() => generateBaseTilemap(character), [character]);
    const loc = character.base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, loc.region, loc.nation).url,
        [character, loc.region, loc.nation]
    );

    const residentsRef = useRef<BaseResidentEntity[]>(mapData.residents);
    const monstersRef = useRef<BaseFarmMonsterEntity[]>(mapData.farmMonsters);
    useEffect(() => {
        residentsRef.current = mapData.residents.map(r => ({ ...r }));
        monstersRef.current = mapData.farmMonsters.map(m => ({ ...m }));
    }, [mapData]);

    // Preload sprites & building/terrain images
    useEffect(() => {
        let mounted = true;
        const spriteUrls = new Set<string>([playerSpriteUrl, ...mapData.residents.map(r => r.spriteUrl)]);
        spriteUrls.forEach(url => {
            loadRpgSpriteImage(url).then(() => {
                if (mounted) setSpriteTick(t => t + 1);
            });
        });

        const cityUrls = new Set<string>([
            ...(['ground', 'road', 'plaza', 'wall'] as TerrainTilePart[]).map(p =>
                getTerrainTileUrl(mapData.cultureKey, p)
            ),
            ...mapData.facilities.map(f => f.spriteUrl).filter((u): u is string => Boolean(u))
        ]);
        cityUrls.forEach(url => {
            loadCityAssetImage(url).then(img => {
                if (mounted && img) setSpriteTick(t => t + 1);
            });
        });

        // Preload monster portraits into city asset cache
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

    // Map facility type -> BaseModal initialSubModal key
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
        // 1. Nearby resident
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

        // 2. Nearby farm monster
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

        // 3. Nearby facility door
        let bestFac: BaseFacilityNode | null = null;
        let bestFacD = BASE_TILE_SIZE * 1.85;
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
    }, [findNearestInteractable, openFacilityModal]);

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
                setBuildSlot(null);
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

    // Build facility on selected empty slot
    const handleBuildFacilityOnSlot = (facilityId: string) => {
        if (!buildSlot || !character.base || !onUpdateCharacter) return;
        const facInfo = FACILITIES_INFO.find(f => f.id === facilityId);
        const costCfg = (FACILITY_CONSTRUCTION_COSTS as any)[facilityId] || { gold: 20000, wood: 15, stone: 15 };
        const goldCost = costCfg.gold || 0;
        const woodCost = costCfg.wood || 0;
        const stoneCost = costCfg.stone || 0;
        const base = character.base;
        const curWood = base.resources?.wood || 0;
        const curStone = base.resources?.stone || 0;

        if ((character.money || 0) < goldCost || curWood < woodCost || curStone < stoneCost) {
            return;
        }

        const startDate = character.currentDate || '2000-03-02';
        const startTime = character.currentTime || '08:00';
        const durationMin = getFacilityConstructionDuration(facilityId, false, 1);
        const { completionDate, completionTime } = calculateCompletionDateTime(startDate, startTime, durationMin);

        const newInstance: FacilityInstance = {
            id: `${facilityId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: facilityId,
            level: 0,
            x: buildSlot.gridX,
            y: buildSlot.gridY,
            underConstruction: true,
            constructionStartDate: startDate,
            constructionStartTime: startTime,
            constructionCompletionDate: completionDate,
            constructionCompletionTime: completionTime,
            totalConstructionMinutes: durationMin
        } as any;

        const nextChar: Character = {
            ...character,
            money: (character.money || 0) - goldCost,
            base: {
                ...base,
                resources: {
                    ...base.resources,
                    wood: curWood - woodCost,
                    stone: curStone - stoneCost
                },
                layout: [...(base.layout || []), newInstance]
            }
        };

        onUpdateCharacter(
            nextChar,
            `[기지 건설] (${buildSlot.gridX + 1}, ${buildSlot.gridY + 1}) 부지에 '${facInfo?.name || facilityId}' 건설 공사를 착공했습니다! (완공 예정: ${completionDate} ${completionTime})`
        );
        setBuildSlot(null);
    };

    // Canvas click/tap handler
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const wx = e.clientX - rect.left + cameraRef.current.x;
        const wy = e.clientY - rect.top + cameraRef.current.y;

        // 1. Build mode: check empty slot click first
        if (mode === 'build') {
            for (const slot of mapData.emptySlots) {
                const sx = slot.tileX * BASE_TILE_SIZE;
                const sy = slot.tileY * BASE_TILE_SIZE;
                const sw = slot.tileW * BASE_TILE_SIZE;
                const sh = slot.tileH * BASE_TILE_SIZE;
                if (wx >= sx && wx <= sx + sw && wy >= sy && wy <= sy + sh) {
                    setBuildSlot(slot);
                    return;
                }
            }
        }

        // 2. Resident click
        for (const r of residentsRef.current) {
            if (Math.hypot(wx - r.px, wy - (r.py - 14)) <= 26) {
                setSelectedResident(r);
                setSelectedMonster(null);
                return;
            }
        }

        // 3. Farm monster click
        for (const m of monstersRef.current) {
            if (Math.hypot(wx - m.px, wy - m.py) <= 26) {
                setSelectedMonster(m);
                setSelectedResident(null);
                return;
            }
        }

        // 4. Facility click
        for (const f of mapData.facilities) {
            const fx = f.tileX * BASE_TILE_SIZE;
            const fy = f.tileY * BASE_TILE_SIZE;
            const fw = f.tileW * BASE_TILE_SIZE;
            const fh = f.tileH * BASE_TILE_SIZE;
            if (wx >= fx && wx <= fx + fw && wy >= fy - 16 && wy <= fy + fh) {
                openFacilityModal(f);
                return;
            }
        }

        // 5. South gate click -> exit to city
        const gx = mapData.exitGate.x * BASE_TILE_SIZE;
        const gy = mapData.exitGate.y * BASE_TILE_SIZE;
        if (wx >= gx && wx <= gx + mapData.exitGate.w * BASE_TILE_SIZE && wy >= gy - 12) {
            onExitToCity();
            return;
        }

        // 6. Otherwise walk to clicked tile
        setSelectedResident(null);
        setSelectedMonster(null);
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    // 60fps loop
    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;
        const timeOfDay = getTimeOfDay(character.currentTime || '12:00');

        const isBlocked = (px: number, py: number) => {
            const tx = Math.floor(px / BASE_TILE_SIZE);
            const ty = Math.floor(py / BASE_TILE_SIZE);
            if (tx < 0 || ty < 0 || tx >= mapData.cols || ty >= mapData.rows) return true;
            return Boolean(mapData.solid[ty]?.[tx]);
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;

            // 1. Update player movement
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
                const speed = 190;
                const nx = p.x + (vx / len) * speed * dt;
                const ny = p.y + (vy / len) * speed * dt;
                if (!isBlocked(nx, p.y)) p.x = nx;
                if (!isBlocked(p.x, ny)) p.y = ny;

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

            // Check south gate auto-exit
            const ptx = Math.floor(p.x / BASE_TILE_SIZE);
            const pty = Math.floor(p.y / BASE_TILE_SIZE);
            if (
                Date.now() > exitCooldownRef.current &&
                pty >= mapData.exitGate.y &&
                ptx >= mapData.exitGate.x &&
                ptx < mapData.exitGate.x + mapData.exitGate.w
            ) {
                onExitToCity();
                return;
            }

            // 2. Update residents wander AI
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
                    const radius = 18 + Math.random() * 44;
                    r.targetPx = r.homePx + Math.cos(angle) * radius;
                    r.targetPy = r.homePy + Math.sin(angle) * radius;
                }
            });

            // 3. Update farm monsters roaming AI
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
                        const spd = 34;
                        m.px = Math.max(m.minPx, Math.min(m.maxPx, m.px + (dx / dist) * spd * dt));
                        m.py = Math.max(m.minPy, Math.min(m.maxPy, m.py + (dy / dist) * spd * dt));
                        m.dir = dx >= 0 ? 'right' : 'left';
                    }
                } else if (m.wanderTimer <= 0) {
                    m.wanderTimer = 1.8 + Math.random() * 3.0;
                    m.targetPx = m.minPx + Math.random() * Math.max(10, m.maxPx - m.minPx);
                    m.targetPy = m.minPy + Math.random() * Math.max(10, m.maxPy - m.minPy);
                }
            });

            // Update nearby prompt every ~0.2s
            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                const near = findNearestInteractable();
                if (!near) setNearbyLabel(null);
                else if (near.kind === 'resident') setNearbyLabel(`${near.resident.name} (${near.resident.role})`);
                else if (near.kind === 'monster') setNearbyLabel(`🐾 ${near.monster.name} Lv.${near.monster.level}`);
                else setNearbyLabel(`${near.facility.iconText} ${near.facility.label}`);
            }

            // 4. Camera follow
            const mapW = mapData.cols * BASE_TILE_SIZE;
            const mapH = mapData.rows * BASE_TILE_SIZE;
            const camX = Math.max(0, Math.min(Math.max(0, mapW - viewportSize.w), p.x - viewportSize.w / 2));
            const camY = Math.max(0, Math.min(Math.max(0, mapH - viewportSize.h), p.y - viewportSize.h / 2));
            cameraRef.current = { x: Math.round(camX), y: Math.round(camY) };

            // 5. Render
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, viewportSize.w, viewportSize.h);
                ctx.save();
                ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'road'));
                const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'plaza'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'wall'));

                const startC = Math.max(0, Math.floor(cameraRef.current.x / BASE_TILE_SIZE) - 1);
                const endC = Math.min(mapData.cols - 1, Math.ceil((cameraRef.current.x + viewportSize.w) / BASE_TILE_SIZE) + 1);
                const startR = Math.max(0, Math.floor(cameraRef.current.y / BASE_TILE_SIZE) - 1);
                const endR = Math.min(mapData.rows - 1, Math.ceil((cameraRef.current.y + viewportSize.h) / BASE_TILE_SIZE) + 1);

                for (let r = startR; r <= endR; r++) {
                    for (let c = startC; c <= endC; c++) {
                        const t = mapData.tiles[r][c];
                        const x = c * BASE_TILE_SIZE;
                        const y = r * BASE_TILE_SIZE;

                        // Base grass
                        if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) {
                            ctx.drawImage(groundImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else {
                            ctx.fillStyle = (r + c) % 2 === 0 ? '#2f5e2c' : '#356831';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }

                        if (t === 'road') {
                            if (roadImg && roadImg.complete && roadImg.naturalWidth > 0) {
                                ctx.drawImage(roadImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else {
                                ctx.fillStyle = '#8d7b68';
                                ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            }
                        } else if (t === 'plaza') {
                            if (plazaImg && plazaImg.complete && plazaImg.naturalWidth > 0) {
                                ctx.drawImage(plazaImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else {
                                ctx.fillStyle = '#a8a29e';
                                ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            }
                        } else if (t === 'wall') {
                            if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
                                ctx.drawImage(wallImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            } else {
                                ctx.fillStyle = '#334155';
                                ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            }
                        } else if (t === 'farm_soil') {
                            ctx.fillStyle = '#6b4423';
                            ctx.fillRect(x + 2, y + 2, BASE_TILE_SIZE - 4, BASE_TILE_SIZE - 4);
                            ctx.fillStyle = '#84cc16';
                            for (let row = 0; row < 3; row++) {
                                ctx.fillRect(x + 6, y + 7 + row * 13, BASE_TILE_SIZE - 12, 6);
                            }
                        } else if (t === 'pasture') {
                            ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else if (t === 'gate') {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }
                    }
                }

                // Draw empty build plots in build mode (or subtle corners in explore mode)
                mapData.emptySlots.forEach(slot => {
                    const sx = slot.tileX * BASE_TILE_SIZE;
                    const sy = slot.tileY * BASE_TILE_SIZE;
                    const sw = slot.tileW * BASE_TILE_SIZE;
                    const sh = slot.tileH * BASE_TILE_SIZE;
                    if (mode === 'build') {
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
                        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
                        ctx.strokeStyle = '#34d399';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([6, 4]);
                        ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);
                        ctx.setLineDash([]);
                        ctx.fillStyle = '#a7f3d0';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('+ 건설 가능', sx + sw / 2, sy + sh / 2 + 4);
                    } else {
                        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(sx + 4, sy + 4, sw - 8, sh - 8);
                    }
                });

                // Draw facilities
                mapData.facilities.forEach(f => {
                    const fx = f.tileX * BASE_TILE_SIZE;
                    const fy = f.tileY * BASE_TILE_SIZE;
                    const fw = f.tileW * BASE_TILE_SIZE;
                    const fh = f.tileH * BASE_TILE_SIZE;

                    if (f.isMonsterPen) {
                        // Wooden fence enclosure for Monster Farm
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                        ctx.strokeStyle = '#d97706';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8);
                    } else if (f.spriteUrl) {
                        const img = getCachedCityAssetImage(f.spriteUrl);
                        if (img && img.complete && img.naturalWidth > 0) {
                            const scale = f.isHq ? 1.15 : 1.06;
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
                        // Stylized facility building card
                        ctx.fillStyle = 'rgba(0,0,0,0.32)';
                        ctx.fillRect(fx + 6, fy + fh - 6, fw - 8, 8);
                        ctx.fillStyle = '#1e293b';
                        ctx.fillRect(fx + 4, fy + 8, fw - 8, fh - 12);
                        ctx.fillStyle = f.accentColor;
                        ctx.fillRect(fx + 2, fy + 4, fw - 4, 14);
                        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8);
                        ctx.font = '26px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(f.iconText, fx + fw / 2, fy + fh / 2 + 12);
                    }

                    // Under construction overlay
                    if (f.underConstruction) {
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
                        ctx.fillRect(fx, fy, fw, fh);
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
                    }

                    // Floating facility label badge
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    const textW = Math.max(60, ctx.measureText(f.label).width + 14);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
                    ctx.fillRect(fx + fw / 2 - textW / 2, fy - 18, textW, 18);
                    ctx.strokeStyle = f.underConstruction ? '#fbbf24' : f.accentColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(fx + fw / 2 - textW / 2, fy - 18, textW, 18);
                    ctx.fillStyle = f.underConstruction ? '#fde68a' : '#f8fafc';
                    ctx.fillText(f.underConstruction ? `🔨 ${f.label}` : f.label, fx + fw / 2, fy - 5);
                });

                // Draw south gate label
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

                // Draw roaming farm monsters
                monstersRef.current.forEach(m => {
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
                    ctx.fillText(`${m.name}`, m.px, m.py + 22);
                });

                // Y-sorted sprites (residents + player)
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

                    // Nameplate
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const nw = Math.max(40, ctx.measureText(name).width + 10);
                    ctx.fillStyle = isPlayer ? 'rgba(30, 58, 138, 0.88)' : 'rgba(15, 23, 42, 0.82)';
                    ctx.fillRect(px - nw / 2, py + 7, nw, 15);
                    ctx.fillStyle = isPlayer ? '#fde047' : '#e2e8f0';
                    ctx.fillText(name, px, py + 18);

                    // Activity bubble for residents
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

                const actors = [
                    ...residentsRef.current.map(r => ({
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

                // Night tint
                if (timeOfDay === 'Night') {
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
                    ctx.fillRect(0, 0, viewportSize.w, viewportSize.h);
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [mapData, viewportSize, playerSpriteUrl, character.name, character.currentTime, mode, spriteTick, findNearestInteractable, onExitToCity]);

    const base = character.base;
    const baseLevel = base?.level || 1;
    const gridSize = base?.gridSize || 7;

    return (
        <div ref={containerRef} className="relative w-full h-full flex-1 min-h-0 bg-slate-950 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                width={viewportSize.w}
                height={viewportSize.h}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-pointer"
            />

            {/* Top HUD */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md">
                    <Home size={16} className="text-amber-400" />
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-amber-200">
                            {loc.city} 내 기지 <span className="text-amber-400">Lv.{baseLevel}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>부지 {gridSize}×{gridSize}</span>
                            <span>거주민 {mapData.residents.length}명</span>
                            <span>사육 몬스터 {mapData.farmMonsters.length}마리</span>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            setMode(m => (m === 'explore' ? 'build' : 'explore'));
                            setBuildSlot(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-lg transition-all ${
                            mode === 'build'
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                    >
                        {mode === 'build' ? <Footprints size={14} /> : <Hammer size={14} />}
                        {mode === 'build' ? '탐험 모드로' : '시설 건설 모드'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenBaseModal()}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-700/90 hover:bg-indigo-600 border border-indigo-400/50 text-white flex items-center gap-1.5 shadow-lg"
                    >
                        <Settings size={14} /> 기지 통합 관리
                    </button>
                    <button
                        type="button"
                        onClick={onExitToCity}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-700/90 hover:bg-amber-600 border border-amber-400/50 text-white flex items-center gap-1.5 shadow-lg"
                    >
                        <DoorOpen size={14} /> 도시로 나가기
                    </button>
                </div>
            </div>

            {/* Nearby Interaction Prompt */}
            {nearbyLabel && !buildSlot && !selectedResident && !selectedMonster && (
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
                        <button
                            type="button"
                            onClick={() => setSelectedResident(null)}
                            className="text-slate-400 hover:text-white p-1"
                        >
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
                        <button
                            type="button"
                            onClick={() => setSelectedMonster(null)}
                            className="text-slate-400 hover:text-white p-1"
                        >
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

            {/* Empty Plot Facility Construction Modal */}
            {buildSlot && (
                <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <div className="text-sm font-black text-emerald-300 flex items-center gap-2">
                                <Hammer size={16} />
                                부지 ({buildSlot.gridX + 1}, {buildSlot.gridY + 1}) 시설 건설
                            </div>
                            <button
                                type="button"
                                onClick={() => setBuildSlot(null)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-300 flex flex-wrap gap-3">
                            <span>보유 골드: <strong className="text-amber-300">{(character.money || 0).toLocaleString()} G</strong></span>
                            <span>목재: <strong className="text-emerald-300">{base?.resources?.wood || 0}</strong></span>
                            <span>석재: <strong className="text-sky-300">{base?.resources?.stone || 0}</strong></span>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar">
                            {FACILITIES_INFO.filter(f => f.id !== 'home' && f.id !== 'my_home').map(fac => {
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
                                            <div className="text-xs font-black text-white">{fac.name}</div>
                                            <div className="text-[11px] text-slate-400 truncate">{fac.description}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-2">
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
                                            onClick={() => handleBuildFacilityOnSlot(fac.id)}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black shrink-0"
                                        >
                                            착공
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
