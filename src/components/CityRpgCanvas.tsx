import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Character, CityTier, DistrictType } from '../types';
import {
    buildCityTilemap,
    CITY_TILE_SIZE,
    CityNpcEntity,
    CityPortalNode,
    findPathBFS
} from '../services/cityTilemapEngine';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    getRpgSpriteAssetPath,
    loadRpgSpriteImage,
    mapRegionToSpriteKey,
    normalizeGenderKey,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import {
    ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, CornerDownLeft,
    Map as MapIcon, MessageSquare, Sparkles, ChevronUp, ChevronDown
} from 'lucide-react';

export interface CityRpgCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    tier: CityTier;
    activeDistricts: DistrictType[];
    hasBaseInCurrentLocation: boolean;
    isElfNation: boolean;
    isBeastNation: boolean;
    isDemonNation: boolean;
    canOpenTranscendent: boolean;
    timePeriod: 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'shingye';
    timeLabel: string;
    isMythicBoss: boolean;
    bossName?: string;
    onEnterCity: (district?: DistrictType | 'Gate', openHuntMap?: boolean) => void;
    onOpenDungeon: () => void;
    onOpenMap: () => void;
    onOpenBase?: () => void;
    onOpenElfCity?: () => void;
    onOpenDemonCity?: () => void;
    onOpenBeastCity?: () => void;
    onOpenTranscendentArena?: () => void;
    onOpenAbyssTower?: () => void;
}

interface TrailPoint {
    x: number;
    y: number;
    dir: SpriteDirection;
}

interface DustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

interface ActiveDialogue {
    npcName: string;
    npcRole: string;
    lines: string[];
    lineIndex: number;
}

const CityRpgCanvas: React.FC<CityRpgCanvasProps> = ({
    character,
    region,
    nation,
    city,
    tier,
    activeDistricts,
    hasBaseInCurrentLocation,
    isElfNation,
    isBeastNation,
    isDemonNation,
    canOpenTranscendent,
    timePeriod,
    timeLabel,
    isMythicBoss,
    bossName,
    onEnterCity,
    onOpenDungeon,
    onOpenMap,
    onOpenBase,
    onOpenElfCity,
    onOpenDemonCity,
    onOpenBeastCity,
    onOpenTranscendentArena,
    onOpenAbyssTower
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 960, height: 560 });
    const [dialogue, setDialogue] = useState<ActiveDialogue | null>(null);
    const [typedChars, setTypedChars] = useState(0);
    const [nearbyLabel, setNearbyLabel] = useState<string>('');
    const [showQuickBar, setShowQuickBar] = useState<boolean>(true);
    const [, setSpriteTick] = useState(0);

    // 1. 현재 도시 타일맵 생성
    const mapData = useMemo(
        () =>
            buildCityTilemap({
                region,
                nation,
                city,
                tier,
                activeDistricts,
                hasBaseInCurrentLocation,
                isElfNation,
                isBeastNation,
                isDemonNation,
                canOpenTranscendent,
                timeLabel,
                isMythicBoss,
                bossName
            }),
        [
            region,
            nation,
            city,
            tier,
            activeDistricts.join(','),
            hasBaseInCurrentLocation,
            isElfNation,
            isBeastNation,
            isDemonNation,
            canOpenTranscendent,
            timeLabel,
            isMythicBoss,
            bossName
        ]
    );

    const playerRegionKey: RpgSpriteRegionKey = mapRegionToSpriteKey(region, nation);
    const playerGenderKey: RpgSpriteGenderKey = normalizeGenderKey(character.gender);
    const playerSpriteUrl = getRpgSpriteAssetPath(region, character.gender, nation);

    // 파티 동료(최대 4명) 팔로워 스프라이트 정보
    const followers = useMemo(() => {
        return (character.companions || []).slice(0, 4).map((c, idx) => {
            const gKey = normalizeGenderKey(c.gender);
            const rKey = mapRegionToSpriteKey(region, nation);
            return {
                id: c.id || `comp_${idx}`,
                name: c.name,
                regionKey: rKey,
                genderKey: gKey,
                spriteUrl: getRpgSpriteAssetPath(region, c.gender, nation)
            };
        });
    }, [character.companions, region, nation]);

    // 필요한 스프라이트 이미지 프리로드 (현재 지역 남/여 모두 로드)
    useEffect(() => {
        const urls = new Set<string>([
            playerSpriteUrl,
            getRpgSpriteAssetPath(region, '남성', nation),
            getRpgSpriteAssetPath(region, '여성', nation),
            ...followers.map(f => f.spriteUrl)
        ]);
        let mounted = true;
        urls.forEach(url => {
            loadRpgSpriteImage(url).then(() => {
                if (mounted) setSpriteTick(t => t + 1);
            });
        });
        return () => {
            mounted = false;
        };
    }, [playerSpriteUrl, region, nation, followers]);

    // 2. 런타임 게임 상태 Refs (60fps 루프용)
    const keysPressedRef = useRef<Set<string>>(new Set());
    const dpadDirRef = useRef<SpriteDirection | null>(null);
    const playerRef = useRef({
        x: mapData.spawnPos.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
        y: mapData.spawnPos.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
        dir: 'down' as SpriteDirection,
        moving: false,
        animTimer: 0,
        walkFrame: 1,
        path: [] as Array<{ x: number; y: number }>,
        pendingPortal: null as CityPortalNode | null,
        pendingNpc: null as CityNpcEntity | null
    });
    const trailRef = useRef<TrailPoint[]>([]);
    const npcsRef = useRef<
        Array<
            CityNpcEntity & {
                px: number;
                py: number;
                targetX: number;
                targetY: number;
                waitTimer: number;
                walkFrame: number;
                animTimer: number;
            }
        >
    >([]);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1.5 });
    const particlesRef = useRef<DustParticle[]>([]);
    const dialogueOpenRef = useRef(false);

    useEffect(() => {
        dialogueOpenRef.current = Boolean(dialogue);
    }, [dialogue]);

    // 도시 전환 시 플레이어·트레일·NPC 초기화
    useEffect(() => {
        const sx = mapData.spawnPos.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
        const sy = mapData.spawnPos.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
        playerRef.current = {
            x: sx,
            y: sy,
            dir: 'down',
            moving: false,
            animTimer: 0,
            walkFrame: 1,
            path: [],
            pendingPortal: null,
            pendingNpc: null
        };
        trailRef.current = Array.from({ length: 64 }, () => ({ x: sx, y: sy, dir: 'down' as SpriteDirection }));
        npcsRef.current = mapData.npcs.map(n => ({
            ...n,
            px: n.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
            py: n.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
            targetX: n.x,
            targetY: n.y,
            waitTimer: 1.2 + Math.random() * 2.5,
            walkFrame: 1,
            animTimer: 0
        }));
        setDialogue(null);
    }, [mapData]);

    // 컨테이너 리사이즈 감지
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                setCanvasSize({
                    width: Math.floor(rect.width),
                    height: Math.floor(rect.height)
                });
            }
        };
        update();
        const obs = new ResizeObserver(update);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // 포탈 실행 핸들러
    const triggerPortalAction = useCallback(
        (portal: CityPortalNode) => {
            switch (portal.actionType) {
                case 'district':
                    onEnterCity(portal.district, portal.openHuntMap);
                    break;
                case 'dungeon':
                    onOpenDungeon();
                    break;
                case 'world_map':
                    onOpenMap();
                    break;
                case 'base':
                    onOpenBase?.();
                    break;
                case 'elf_city':
                    onOpenElfCity?.();
                    break;
                case 'beast_city':
                    onOpenBeastCity?.();
                    break;
                case 'demon_city':
                    onOpenDemonCity?.();
                    break;
                case 'transcendent_arena':
                    onOpenTranscendentArena?.();
                    break;
                case 'abyss_tower':
                    onOpenAbyssTower?.();
                    break;
            }
        },
        [
            onEnterCity,
            onOpenDungeon,
            onOpenMap,
            onOpenBase,
            onOpenElfCity,
            onOpenBeastCity,
            onOpenDemonCity,
            onOpenTranscendentArena,
            onOpenAbyssTower
        ]
    );

    // 가장 가까운 상호작용 대상 찾기 (문/포탈/NPC)
    const findNearbyInteractable = useCallback(() => {
        const p = playerRef.current;
        const tileX = Math.floor(p.x / CITY_TILE_SIZE);
        const tileY = Math.floor(p.y / CITY_TILE_SIZE);

        // 1. 포탈/건물 문 (현재 타일 또는 1칸 이내)
        let closestPortal: CityPortalNode | null = null;
        let minPortalDist = 1.6;
        for (const portal of mapData.portals) {
            const dx = portal.doorX - tileX;
            const dy = portal.doorY - tileY;
            const d = Math.hypot(dx, dy);
            if (d <= minPortalDist) {
                minPortalDist = d;
                closestPortal = portal;
            }
        }
        if (closestPortal) {
            return { type: 'portal' as const, portal: closestPortal };
        }

        // 2. NPC (1.6타일 이내)
        for (const npc of npcsRef.current) {
            const d = Math.hypot(npc.px - p.x, npc.py - p.y) / CITY_TILE_SIZE;
            if (d <= 1.65) {
                return { type: 'npc' as const, npc };
            }
        }

        return null;
    }, [mapData]);

    // 상호작용 버튼 / Space / Enter 처리
    const handleInteract = useCallback(() => {
        if (dialogue) {
            const curLine = dialogue.lines[dialogue.lineIndex] || '';
            if (typedChars < curLine.length) {
                setTypedChars(curLine.length);
                return;
            }
            if (dialogue.lineIndex + 1 < dialogue.lines.length) {
                setDialogue({ ...dialogue, lineIndex: dialogue.lineIndex + 1 });
                setTypedChars(0);
            } else {
                setDialogue(null);
                setTypedChars(0);
            }
            return;
        }

        const target = findNearbyInteractable();
        if (!target) return;
        if (target.type === 'portal') {
            triggerPortalAction(target.portal);
        } else if (target.type === 'npc') {
            // NPC가 플레이어를 바라보도록 회전
            const p = playerRef.current;
            const dx = p.x - target.npc.px;
            const dy = p.y - target.npc.py;
            if (Math.abs(dx) > Math.abs(dy)) {
                target.npc.dir = dx > 0 ? 'right' : 'left';
            } else {
                target.npc.dir = dy > 0 ? 'down' : 'up';
            }
            setDialogue({
                npcName: target.npc.name,
                npcRole: target.npc.role,
                lines: target.npc.dialogues,
                lineIndex: 0
            });
            setTypedChars(0);
        }
    }, [dialogue, typedChars, findNearbyInteractable, triggerPortalAction]);

    // 타자기 텍스트 효과
    useEffect(() => {
        if (!dialogue) return;
        const curLine = dialogue.lines[dialogue.lineIndex] || '';
        if (typedChars >= curLine.length) return;
        const timer = setTimeout(() => {
            setTypedChars(c => Math.min(curLine.length, c + 2));
        }, 22);
        return () => clearTimeout(timer);
    }, [dialogue, typedChars]);

    // 키보드 입력 리스너
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift'].includes(k)) {
                e.preventDefault();
                keysPressedRef.current.add(k);
                // 키보드 조작 시 자동 이동 경로 취소
                playerRef.current.path = [];
                playerRef.current.pendingPortal = null;
                playerRef.current.pendingNpc = null;
            } else if (k === ' ' || k === 'enter' || k === 'e') {
                e.preventDefault();
                handleInteract();
            } else if (k === 'escape' && dialogueOpenRef.current) {
                setDialogue(null);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keysPressedRef.current.delete(e.key.toLowerCase());
        };
        const onBlur = () => {
            keysPressedRef.current.clear();
            dpadDirRef.current = null;
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

    // 캔버스 클릭/터치 이동 & 건물/NPC 클릭 상호작용
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dialogue) {
            handleInteract();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const zoom = cameraRef.current.zoom || 1;
        const worldX = (e.clientX - rect.left) / zoom + cameraRef.current.x;
        const worldY = (e.clientY - rect.top) / zoom + cameraRef.current.y;
        const tx = Math.floor(worldX / CITY_TILE_SIZE);
        const ty = Math.floor(worldY / CITY_TILE_SIZE);

        const p = playerRef.current;
        const start = {
            x: Math.floor(p.x / CITY_TILE_SIZE),
            y: Math.floor(p.y / CITY_TILE_SIZE)
        };

        // 1. 건물 영역 클릭 체크 -> 해당 건물 문 앞으로 이동 후 자동 입장
        const clickedPortal = mapData.portals.find(
            pt =>
                tx >= pt.buildingX &&
                tx < pt.buildingX + pt.buildingW &&
                ty >= pt.buildingY &&
                ty <= pt.buildingY + pt.buildingH
        );
        if (clickedPortal) {
            const path = findPathBFS(mapData.solid, start, { x: clickedPortal.doorX, y: clickedPortal.doorY });
            if (path.length === 0 && Math.hypot(clickedPortal.doorX - start.x, clickedPortal.doorY - start.y) <= 1.5) {
                triggerPortalAction(clickedPortal);
            } else {
                p.path = path;
                p.pendingPortal = clickedPortal;
                p.pendingNpc = null;
            }
            return;
        }

        // 2. NPC 클릭 체크
        const clickedNpc = npcsRef.current.find(
            n => Math.hypot(n.px - worldX, n.py - worldY) <= CITY_TILE_SIZE * 0.85
        );
        if (clickedNpc) {
            const ntx = Math.floor(clickedNpc.px / CITY_TILE_SIZE);
            const nty = Math.floor(clickedNpc.py / CITY_TILE_SIZE);
            if (Math.hypot(ntx - start.x, nty - start.y) <= 1.6) {
                setDialogue({
                    npcName: clickedNpc.name,
                    npcRole: clickedNpc.role,
                    lines: clickedNpc.dialogues,
                    lineIndex: 0
                });
                setTypedChars(0);
            } else {
                p.path = findPathBFS(mapData.solid, start, { x: ntx, y: nty });
                p.pendingNpc = clickedNpc;
                p.pendingPortal = null;
            }
            return;
        }

        // 3. 일반 바닥 클릭 -> 최단 경로 이동
        const path = findPathBFS(mapData.solid, start, { x: tx, y: ty });
        p.path = path;
        p.pendingPortal = null;
        p.pendingNpc = null;
    };

    // 3. 메인 60fps 게임 루프 (업데이트 + 렌더링)
    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let uiSyncAccum = 0;

        const isSolidPixel = (px: number, py: number): boolean => {
            const halfW = 10;
            const halfH = 8;
            const corners = [
                [px - halfW, py - halfH],
                [px + halfW, py - halfH],
                [px - halfW, py + halfH],
                [px + halfW, py + halfH]
            ];
            for (const [cx, cy] of corners) {
                const tx = Math.floor(cx / CITY_TILE_SIZE);
                const ty = Math.floor(cy / CITY_TILE_SIZE);
                if (tx < 0 || ty < 0 || tx >= mapData.cols || ty >= mapData.rows) return true;
                if (mapData.solid[ty][tx]) return true;
            }
            return false;
        };

        const renderSprite = (
            ctx: CanvasRenderingContext2D,
            url: string,
            cx: number,
            footY: number,
            dir: SpriteDirection,
            walkFrame: number,
            rKey: RpgSpriteRegionKey,
            gKey: RpgSpriteGenderKey
        ) => {
            const img = getCachedRpgSpriteImage(url);
            const drawSize = 46;
            if (img && img.complete && img.naturalWidth > 0) {
                // 발밑 그림자
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.beginPath();
                ctx.ellipse(cx, footY - 2, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                const cellW = img.naturalWidth / 3;
                const cellH = img.naturalHeight / 4;
                const row = DIRECTION_ROW_MAP[dir] ?? 0;
                const col = Math.max(0, Math.min(2, walkFrame));
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    img,
                    col * cellW,
                    row * cellH,
                    cellW,
                    cellH,
                    Math.round(cx - drawSize / 2),
                    Math.round(footY - drawSize + 4),
                    drawSize,
                    drawSize
                );
            } else {
                drawFallbackChibiSprite(ctx, cx, footY, drawSize, dir, walkFrame, rKey, gKey);
            }
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;

            const p = playerRef.current;
            const keys = keysPressedRef.current;

            // --- A. 플레이어 이동 업데이트 ---
            if (!dialogueOpenRef.current) {
                let vx = 0;
                let vy = 0;
                if (keys.has('arrowup') || keys.has('w') || dpadDirRef.current === 'up') vy -= 1;
                if (keys.has('arrowdown') || keys.has('s') || dpadDirRef.current === 'down') vy += 1;
                if (keys.has('arrowleft') || keys.has('a') || dpadDirRef.current === 'left') vx -= 1;
                if (keys.has('arrowright') || keys.has('d') || dpadDirRef.current === 'right') vx += 1;

                const isRunning = keys.has('shift');
                const speed = (isRunning ? 225 : 148) * dt;

                if (vx !== 0 || vy !== 0) {
                    const len = Math.hypot(vx, vy);
                    vx = (vx / len) * speed;
                    vy = (vy / len) * speed;

                    if (Math.abs(vx) > Math.abs(vy)) {
                        p.dir = vx > 0 ? 'right' : 'left';
                    } else {
                        p.dir = vy > 0 ? 'down' : 'up';
                    }

                    const nextX = p.x + vx;
                    const nextY = p.y + vy;
                    let moved = false;
                    if (!isSolidPixel(nextX, p.y)) {
                        p.x = nextX;
                        moved = true;
                    }
                    if (!isSolidPixel(p.x, nextY)) {
                        p.y = nextY;
                        moved = true;
                    }
                    p.moving = moved;
                } else if (p.path.length > 0) {
                    const nextTile = p.path[0];
                    const tx = nextTile.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                    const ty = nextTile.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                    const dx = tx - p.x;
                    const dy = ty - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= speed + 1.5) {
                        p.x = tx;
                        p.y = ty;
                        p.path.shift();
                        if (p.path.length === 0) {
                            if (p.pendingPortal) {
                                const pt = p.pendingPortal;
                                p.pendingPortal = null;
                                triggerPortalAction(pt);
                            } else if (p.pendingNpc) {
                                const npc = p.pendingNpc;
                                p.pendingNpc = null;
                                setDialogue({
                                    npcName: npc.name,
                                    npcRole: npc.role,
                                    lines: npc.dialogues,
                                    lineIndex: 0
                                });
                                setTypedChars(0);
                            }
                        }
                    } else {
                        p.x += (dx / dist) * speed;
                        p.y += (dy / dist) * speed;
                        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    }
                    p.moving = true;
                } else {
                    p.moving = false;
                }

                // 걷기 애니메이션 & 트레일 & 발자국 파티클
                if (p.moving) {
                    p.animTimer += dt * (isRunning ? 10 : 6.8);
                    const seq = [0, 1, 2, 1];
                    p.walkFrame = seq[Math.floor(p.animTimer) % 4];

                    const head = trailRef.current[0];
                    if (!head || Math.hypot(head.x - p.x, head.y - p.y) >= 4) {
                        trailRef.current.unshift({ x: p.x, y: p.y, dir: p.dir });
                        if (trailRef.current.length > 80) trailRef.current.pop();
                    }

                    if (Math.random() < 0.22) {
                        particlesRef.current.push({
                            x: p.x + (Math.random() - 0.5) * 10,
                            y: p.y + 4,
                            vx: (Math.random() - 0.5) * 14,
                            vy: -Math.random() * 12,
                            life: 0.35,
                            maxLife: 0.35
                        });
                    }
                } else {
                    p.walkFrame = 1;
                }
            } else {
                p.moving = false;
                p.walkFrame = 1;
            }

            // --- B. NPC 자율 배회 업데이트 ---
            npcsRef.current.forEach(npc => {
                if (dialogueOpenRef.current) {
                    npc.walkFrame = 1;
                    return;
                }
                const tx = npc.targetX * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                const ty = npc.targetY * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                const dx = tx - npc.px;
                const dy = ty - npc.py;
                const dist = Math.hypot(dx, dy);

                if (dist > 2) {
                    const nSpeed = 48 * dt;
                    npc.px += (dx / dist) * Math.min(dist, nSpeed);
                    npc.py += (dy / dist) * Math.min(dist, nSpeed);
                    npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    npc.animTimer += dt * 5;
                    npc.walkFrame = [0, 1, 2, 1][Math.floor(npc.animTimer) % 4];
                } else {
                    npc.walkFrame = 1;
                    npc.waitTimer -= dt;
                    if (npc.waitTimer <= 0) {
                        npc.waitTimer = 2.0 + Math.random() * 3.0;
                        const dirs = [
                            [1, 0],
                            [-1, 0],
                            [0, 1],
                            [0, -1]
                        ];
                        const [ddx, ddy] = dirs[Math.floor(Math.random() * dirs.length)];
                        const nx = npc.targetX + ddx;
                        const ny = npc.targetY + ddy;
                        if (
                            Math.abs(nx - npc.homeX) <= 2 &&
                            Math.abs(ny - npc.homeY) <= 2 &&
                            nx > 1 &&
                            nx < mapData.cols - 2 &&
                            ny > 1 &&
                            ny < mapData.rows - 2 &&
                            !mapData.solid[ny][nx] &&
                            mapData.tiles[ny][nx] !== 'door' &&
                            mapData.tiles[ny][nx] !== 'portal'
                        ) {
                            npc.targetX = nx;
                            npc.targetY = ny;
                        }
                    }
                }
            });

            // --- C. 파티클 업데이트 ---
            particlesRef.current = particlesRef.current
                .map(pt => ({ ...pt, x: pt.x + pt.vx * dt, y: pt.y + pt.vy * dt, life: pt.life - dt }))
                .filter(pt => pt.life > 0);

            // --- D. 근접 상호작용 프롬프트 주기적 동기화 ---
            uiSyncAccum += dt;
            if (uiSyncAccum >= 0.12) {
                uiSyncAccum = 0;
                const near = findNearbyInteractable();
                if (near?.type === 'portal') {
                    setNearbyLabel(`[Space / E] ${near.portal.label} 입장`);
                } else if (near?.type === 'npc') {
                    setNearbyLabel(`[Space / E] ${near.npc.name}에게 말 걸기`);
                } else {
                    setNearbyLabel('');
                }
            }

            // --- E. 카메라 추적 (항상 캔버스 전체를 빈 여백 없이 꽉 채우는 쯔꾸르 줌) ---
            const worldW = mapData.cols * CITY_TILE_SIZE;
            const worldH = mapData.rows * CITY_TILE_SIZE;
            const viewW = canvasSize.width;
            const viewH = canvasSize.height;

            // 최소 1.45배 확대 + 화면 비율에 맞춰 여백 0% 보장
            const zoom = Math.max(1.45, viewW / worldW, viewH / worldH);
            cameraRef.current.zoom = zoom;
            const visibleWorldW = viewW / zoom;
            const visibleWorldH = viewH / zoom;

            const desiredCamX = Math.max(0, Math.min(Math.max(0, worldW - visibleWorldW), p.x - visibleWorldW / 2));
            const desiredCamY = Math.max(0, Math.min(Math.max(0, worldH - visibleWorldH), p.y - visibleWorldH / 2));
            cameraRef.current.x += (desiredCamX - cameraRef.current.x) * Math.min(1, dt * 10);
            cameraRef.current.y += (desiredCamY - cameraRef.current.y) * Math.min(1, dt * 10);

            // --- F. 캔버스 렌더링 ---
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, viewW, viewH);
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, viewW, viewH);

                const camX = cameraRef.current.x;
                const camY = cameraRef.current.y;
                const pal = mapData.palette;
                const ts = CITY_TILE_SIZE;
                const waterWave = Math.sin(now * 0.004) * 3;

                ctx.save();
                ctx.scale(zoom, zoom);
                ctx.translate(-camX, -camY);

                // Layer 1: 지형 타일
                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        const px = x * ts;
                        const py = y * ts;
                        const checker = (x + y) % 2 === 0;

                        if (t === 'road') {
                            ctx.fillStyle = checker ? pal.road1 : pal.road2;
                            ctx.fillRect(px, py, ts, ts);
                            ctx.fillStyle = 'rgba(0,0,0,0.08)';
                            ctx.fillRect(px, py + ts - 2, ts, 2);
                        } else if (t === 'plaza' || t === 'fountain') {
                            ctx.fillStyle = checker ? pal.plaza1 : pal.plaza2;
                            ctx.fillRect(px, py, ts, ts);
                            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                            ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
                        } else if (t === 'water') {
                            ctx.fillStyle = checker ? pal.water1 : pal.water2;
                            ctx.fillRect(px, py, ts, ts);
                            ctx.fillStyle = 'rgba(255,255,255,0.22)';
                            ctx.fillRect(px + 6 + waterWave, py + 12, 14, 2);
                            ctx.fillRect(px + 14 - waterWave, py + 26, 12, 2);
                        } else if (t === 'wall') {
                            ctx.fillStyle = pal.wall;
                            ctx.fillRect(px, py, ts, ts);
                            ctx.fillStyle = pal.wallTop;
                            ctx.fillRect(px, py, ts, 10);
                            ctx.fillStyle = 'rgba(0,0,0,0.25)';
                            ctx.fillRect(px, py + ts - 4, ts, 4);
                        } else {
                            ctx.fillStyle = checker ? pal.grass1 : pal.grass2;
                            ctx.fillRect(px, py, ts, ts);
                            if (t === 'flower') {
                                ctx.fillStyle = '#fde047';
                                ctx.fillRect(px + 10, py + 12, 4, 4);
                                ctx.fillStyle = '#f472b6';
                                ctx.fillRect(px + 24, py + 22, 4, 4);
                                ctx.fillStyle = '#38bdf8';
                                ctx.fillRect(px + 16, py + 28, 4, 4);
                            }
                        }

                        // 중앙 분수대 디테일
                        if (t === 'fountain') {
                            ctx.fillStyle = '#64748b';
                            ctx.beginPath();
                            ctx.roundRect(px + 2, py + 4, ts - 4, ts - 8, 6);
                            ctx.fill();
                            ctx.fillStyle = pal.water2;
                            ctx.beginPath();
                            ctx.roundRect(px + 6, py + 8, ts - 12, ts - 16, 4);
                            ctx.fill();
                            ctx.fillStyle = 'rgba(255,255,255,0.65)';
                            ctx.beginPath();
                            ctx.arc(px + ts / 2, py + ts / 2 + Math.sin(now * 0.008) * 2, 4, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }

                // 클릭 목표 경로 점선 표시
                if (p.path.length > 0) {
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
                    p.path.forEach(pt => {
                        ctx.beginPath();
                        ctx.arc(pt.x * ts + ts / 2, pt.y * ts + ts / 2, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                // Layer 2: 건물 본체 + 지붕 + 간판 + 문/포탈
                const isNightLike = timePeriod === 'night' || timePeriod === 'dawn' || timePeriod === 'sunset';
                mapData.portals.forEach(pt => {
                    if (pt.actionType === 'world_map') {
                        // 남쪽 성문 아치 표시
                        const gx = pt.doorX * ts;
                        const gy = pt.doorY * ts;
                        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
                        ctx.fillRect(gx, gy, ts * 2, ts);
                        ctx.fillStyle = '#93c5fd';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('▼ 성문 / 월드맵', gx + ts, gy + 24);
                        return;
                    }

                    const bx = pt.buildingX * ts;
                    const by = pt.buildingY * ts;
                    const bw = pt.buildingW * ts;
                    const bh = pt.buildingH * ts;

                    // 건물 그림자
                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.fillRect(bx + 6, by + bh - 4, bw, 10);

                    // 벽면
                    ctx.fillStyle = pal.buildingWall;
                    ctx.fillRect(bx + 2, by + ts * 0.7, bw - 4, bh - ts * 0.7);
                    ctx.strokeStyle = pal.buildingTrim;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(bx + 2, by + ts * 0.7, bw - 4, bh - ts * 0.7);

                    // 창문 (밤에는 따뜻한 불빛)
                    const winCount = Math.max(1, pt.buildingW - 1);
                    for (let i = 0; i < winCount; i++) {
                        const wx = bx + 12 + i * ts;
                        const wy = by + ts * 0.95;
                        if (Math.abs(wx + 8 - (pt.doorX * ts + ts / 2)) < 20) continue;
                        ctx.fillStyle = isNightLike ? '#fde047' : '#38bdf8';
                        ctx.fillRect(wx, wy, 14, 14);
                        ctx.strokeStyle = pal.buildingTrim;
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(wx, wy, 14, 14);
                    }

                    // 지붕
                    ctx.fillStyle = pt.roofColor;
                    ctx.beginPath();
                    ctx.roundRect(bx - 3, by - 4, bw + 6, ts * 0.95, 6);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // 지붕 하이라이트 띠
                    ctx.fillStyle = pt.accentColor;
                    ctx.fillRect(bx + 2, by + ts * 0.72, bw - 4, 4);

                    // 문 / 포탈 입구
                    const dx = pt.doorX * ts;
                    const dy = pt.doorY * ts;
                    if (pt.actionType === 'dungeon' || pt.actionType === 'abyss_tower') {
                        const pulse = 0.55 + Math.sin(now * 0.006) * 0.25;
                        ctx.fillStyle = `rgba(192, 132, 252, ${pulse})`;
                        ctx.beginPath();
                        ctx.ellipse(dx + ts / 2, dy + ts / 2, 14, 16, 0, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillStyle = '#451a03';
                        ctx.beginPath();
                        ctx.roundRect(dx + 8, dy + 4, ts - 16, ts - 6, [6, 6, 0, 0]);
                        ctx.fill();
                        ctx.fillStyle = '#fbbf24';
                        ctx.beginPath();
                        ctx.arc(dx + ts - 13, dy + ts / 2 + 2, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 건물 간판 (지붕 중앙)
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    const title = `${pt.iconText} ${pt.label}`;
                    const tw = Math.min(bw + 24, ctx.measureText(title).width + 14);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
                    ctx.beginPath();
                    ctx.roundRect(bx + bw / 2 - tw / 2, by + 4, tw, 20, 6);
                    ctx.fill();
                    ctx.strokeStyle = pt.accentColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(title, bx + bw / 2, by + 18);
                });

                // 나무 & 가로등 + 캐릭터/NPC Y-Sort 엔티티 수집
                type RenderItem = { y: number; draw: () => void };
                const ySortItems: RenderItem[] = [];

                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        const cx = x * ts + ts / 2;
                        const by = (y + 1) * ts;
                        if (t === 'tree') {
                            ySortItems.push({
                                y: by,
                                draw: () => {
                                    ctx.fillStyle = 'rgba(0,0,0,0.28)';
                                    ctx.beginPath();
                                    ctx.ellipse(cx, by - 4, 14, 6, 0, 0, Math.PI * 2);
                                    ctx.fill();
                                    ctx.fillStyle = pal.treeTrunk;
                                    ctx.fillRect(cx - 5, by - 22, 10, 18);
                                    ctx.fillStyle = pal.treeLeaf1;
                                    ctx.beginPath();
                                    ctx.arc(cx, by - 30, 16, 0, Math.PI * 2);
                                    ctx.fill();
                                    ctx.fillStyle = pal.treeLeaf2;
                                    ctx.beginPath();
                                    ctx.arc(cx - 5, by - 34, 9, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            });
                        } else if (t === 'lamp') {
                            ySortItems.push({
                                y: by,
                                draw: () => {
                                    ctx.fillStyle = '#334155';
                                    ctx.fillRect(cx - 2, by - 30, 4, 28);
                                    ctx.fillStyle = isNightLike ? '#fef08a' : '#cbd5e1';
                                    ctx.beginPath();
                                    ctx.arc(cx, by - 32, 5, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            });
                        }
                    }
                }

                // NPC 추가
                npcsRef.current.forEach(npc => {
                    const npcUrl = getRpgSpriteAssetPath(region, npc.gender === 'female' ? '여성' : '남성', nation);
                    ySortItems.push({
                        y: npc.py + 8,
                        draw: () => {
                            renderSprite(ctx, npcUrl, npc.px, npc.py + 12, npc.dir, npc.walkFrame, npc.regionKey, npc.gender);
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = 'rgba(15,23,42,0.78)';
                            const nw = ctx.measureText(npc.name).width + 10;
                            ctx.beginPath();
                            ctx.roundRect(npc.px - nw / 2, npc.py - 44, nw, 15, 4);
                            ctx.fill();
                            ctx.fillStyle = '#e2e8f0';
                            ctx.fillText(npc.name, npc.px, npc.py - 33);
                        }
                    });
                });

                // 파티 동료 팔로워 트레일 추가
                followers.forEach((f, idx) => {
                    const trailIdx = Math.min(trailRef.current.length - 1, (idx + 1) * 10);
                    const pt = trailRef.current[trailIdx];
                    if (!pt) return;
                    ySortItems.push({
                        y: pt.y + 8,
                        draw: () => {
                            renderSprite(
                                ctx,
                                f.spriteUrl,
                                pt.x,
                                pt.y + 12,
                                pt.dir,
                                p.moving ? p.walkFrame : 1,
                                f.regionKey,
                                f.genderKey
                            );
                        }
                    });
                });

                // 플레이어 추가
                ySortItems.push({
                    y: p.y + 10,
                    draw: () => {
                        renderSprite(ctx, playerSpriteUrl, p.x, p.y + 12, p.dir, p.walkFrame, playerRegionKey, playerGenderKey);
                        // 플레이어 이름표 (황금 테두리)
                        const pLabel = `${character.name}`;
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const pw = ctx.measureText(pLabel).width + 12;
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                        ctx.beginPath();
                        ctx.roundRect(p.x - pw / 2, p.y - 46, pw, 17, 5);
                        ctx.fill();
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#fde68a';
                        ctx.fillText(pLabel, p.x, p.y - 34);
                    }
                });

                // Y-Sort 실행
                ySortItems.sort((a, b) => a.y - b.y);
                ySortItems.forEach(item => item.draw());

                // 발자국 먼지 파티클
                particlesRef.current.forEach(pt => {
                    const alpha = Math.max(0, pt.life / pt.maxLife) * 0.55;
                    ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Layer 4: 시간대 대기 조명 + 야간 가로등/플레이어 광원
                if (timePeriod === 'sunset') {
                    ctx.fillStyle = 'rgba(234, 88, 12, 0.14)';
                    ctx.fillRect(0, 0, worldW, worldH);
                } else if (timePeriod === 'night' || timePeriod === 'dawn') {
                    ctx.fillStyle = timePeriod === 'dawn' ? 'rgba(15, 23, 56, 0.36)' : 'rgba(10, 15, 40, 0.42)';
                    ctx.fillRect(0, 0, worldW, worldH);

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const drawGlow = (gx: number, gy: number, r: number, color: string) => {
                        const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, r);
                        grad.addColorStop(0, color);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(gx, gy, r, 0, Math.PI * 2);
                        ctx.fill();
                    };
                    mapData.lamps.forEach(l => {
                        drawGlow(l.x * ts + ts / 2, l.y * ts + 8, 92, pal.lampGlow);
                    });
                    drawGlow(p.x, p.y - 6, 85, 'rgba(254, 243, 199, 0.22)');
                    ctx.restore();
                }

                ctx.restore();

                // Layer 5: 우측 상단 컴팩트 미니맵
                const mmScale = 4;
                const mmW = mapData.cols * mmScale;
                const mmH = mapData.rows * mmScale;
                const mmX = viewW - mmW - 14;
                const mmY = 14;
                ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
                ctx.beginPath();
                ctx.roundRect(mmX - 5, mmY - 5, mmW + 10, mmH + 10, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();

                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        if (t === 'road' || t === 'plaza') ctx.fillStyle = '#64748b';
                        else if (t === 'building_roof' || t === 'building_wall') ctx.fillStyle = '#d97706';
                        else if (t === 'door' || t === 'portal') ctx.fillStyle = '#38bdf8';
                        else if (t === 'water') ctx.fillStyle = '#2563eb';
                        else if (t === 'wall') ctx.fillStyle = '#1e293b';
                        else ctx.fillStyle = '#14532d';
                        ctx.fillRect(mmX + x * mmScale, mmY + y * mmScale, mmScale, mmScale);
                    }
                }
                // 미니맵 NPC & 플레이어 점
                ctx.fillStyle = '#4ade80';
                npcsRef.current.forEach(n => {
                    ctx.fillRect(
                        mmX + Math.floor(n.px / ts) * mmScale,
                        mmY + Math.floor(n.py / ts) * mmScale,
                        mmScale,
                        mmScale
                    );
                });
                ctx.fillStyle = '#fde047';
                ctx.fillRect(
                    mmX + Math.floor(p.x / ts) * mmScale - 1,
                    mmY + Math.floor(p.y / ts) * mmScale - 1,
                    mmScale + 2,
                    mmScale + 2
                );
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [
        mapData,
        canvasSize,
        playerSpriteUrl,
        playerRegionKey,
        playerGenderKey,
        followers,
        character.name,
        region,
        nation,
        timePeriod,
        findNearbyInteractable,
        triggerPortalAction
    ]);

    const currentDialogueText = dialogue ? (dialogue.lines[dialogue.lineIndex] || '').slice(0, typedChars) : '';

    return (
        <div
            ref={containerRef}
            className="relative w-full flex-1 min-h-[430px] sm:min-h-[520px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 select-none"
        >
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-pointer"
            />

            {/* 조작 안내 뱃지 (좌상단) */}
            <div className="pointer-events-none absolute top-3 left-3 hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700/70 text-[10px] text-slate-300 backdrop-blur-sm">
                <Compass size={12} className="text-amber-400" />
                <span><strong className="text-white">WASD / 방향키 / 클릭</strong> 이동</span>
                <span className="text-slate-600">|</span>
                <span><strong className="text-white">Shift</strong> 달리기</span>
                <span className="text-slate-600">|</span>
                <span><strong className="text-amber-300">Space / E</strong> 상호작용</span>
            </div>

            {/* 근접 상호작용 플로팅 프롬프트 */}
            {nearbyLabel && !dialogue && (
                <button
                    type="button"
                    onClick={handleInteract}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/92 hover:bg-amber-950/90 border-2 border-amber-400/80 text-amber-200 text-xs font-black shadow-xl flex items-center gap-2 animate-bounce cursor-pointer z-20"
                >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{nearbyLabel}</span>
                </button>
            )}

            {/* 쯔꾸르 정통 하단 NPC 대화창 */}
            {dialogue && (
                <div
                    onClick={handleInteract}
                    className="absolute bottom-5 left-3 right-3 sm:left-8 sm:right-8 z-30 cursor-pointer rounded-2xl border-2 border-slate-100/90 bg-gradient-to-b from-blue-950/95 via-slate-950/95 to-slate-950/98 p-4 shadow-[0_0_30px_rgba(0,0,0,0.85)]"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-amber-400" />
                            <span className="text-xs sm:text-sm font-black text-amber-300">{dialogue.npcName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                {dialogue.npcRole}
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {dialogue.lineIndex + 1} / {dialogue.lines.length}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed min-h-[2.6rem] font-medium">
                        {currentDialogueText}
                    </p>
                    <div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-amber-300/90 font-bold animate-pulse">
                        <CornerDownLeft size={11} />
                        <span>클릭 또는 Space / Enter 계속</span>
                    </div>
                </div>
            )}

            {/* 모바일 가상 D-Pad (좌하단) + 확인 버튼 (우하단) */}
            {!dialogue && (
                <>
                    <div className="sm:hidden absolute bottom-16 left-3 z-20 grid grid-cols-3 gap-1 w-28 h-28">
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'up'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/80 active:bg-amber-600/80 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowUp size={16} />
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'left'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/80 active:bg-amber-600/80 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="rounded-lg bg-slate-950/60 border border-slate-800" />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'right'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/80 active:bg-amber-600/80 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowRight size={16} />
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'down'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/80 active:bg-amber-600/80 border border-slate-600 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowDown size={16} />
                        </button>
                        <div />
                    </div>

                    <button
                        type="button"
                        onClick={handleInteract}
                        className="sm:hidden absolute bottom-20 right-3 z-20 w-14 h-14 rounded-full bg-amber-600/90 active:scale-95 border-2 border-amber-300 text-white font-black text-xs shadow-xl flex flex-col items-center justify-center"
                    >
                        <span>확인</span>
                    </button>
                </>
            )}

            {/* 하단 접이식 빠른 이동 퀵바 (걷지 않고 즉시 구역 진입 지원) */}
            {!dialogue && (
                <div className="absolute bottom-3 left-2 right-2 z-20 flex flex-col items-center pointer-events-none">
                    <button
                        type="button"
                        onClick={() => setShowQuickBar(v => !v)}
                        className="pointer-events-auto mb-1 px-2.5 py-0.5 rounded-t-lg bg-slate-950/85 border border-b-0 border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-amber-300 flex items-center gap-1"
                    >
                        <MapIcon size={11} className="text-amber-400" />
                        <span>빠른 이동</span>
                        {showQuickBar ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    </button>
                    {showQuickBar && (
                        <div className="pointer-events-auto max-w-full overflow-x-auto flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80 backdrop-blur-md shadow-xl custom-scrollbar">
                            {mapData.portals.map(pt => (
                                <button
                                    key={pt.id}
                                    type="button"
                                    onClick={() => triggerPortalAction(pt)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/70 text-[10.5px] font-bold text-slate-200 whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 shrink-0"
                                >
                                    <span>{pt.iconText}</span>
                                    <span>{pt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CityRpgCanvas;
