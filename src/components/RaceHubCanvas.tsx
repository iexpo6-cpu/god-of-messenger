import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../types';
import { drawCanvasNightOverlay } from '../utils/canvasNightOverlay';
import { BASE_TILE_SIZE, resolveDecorationSpriteUrl } from '../services/baseTilemapEngine';
import {
    BuildingSpriteKind,
    CityCultureKey,
    getBuildingSpriteUrl,
    getCachedCityAssetImage,
    getTerrainTileUrl,
    loadCityAssetImage,
    TerrainTilePart
} from '../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import ElfCityModal, { ElfCityTab } from './ElfCityModal';
import BeastCityModal, { BeastCityTab } from './BeastCityModal';
import DemonCityModal, { DemonCityTab } from './DemonCityModal';
import { DoorOpen, MessageSquare, Sparkles, X } from 'lucide-react';

export type RaceHubKind = 'elf' | 'beast' | 'demon';

const COLS = 34;
const ROWS = 24;
const TILE = BASE_TILE_SIZE;

interface HubBuilding {
    id: string;
    name: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    doorTx: number;
    doorTy: number;
    accent: string;
    iconLabel: string;
    spriteKind: BuildingSpriteKind;
    tab: string;
}

interface HubNpc {
    id: string;
    name: string;
    role: string;
    tx: number;
    ty: number;
    homeTx: number;
    homeTy: number;
    dir: SpriteDirection;
    gender: RpgSpriteGenderKey;
    spriteUrl: string;
    dialogue: string;
    tab?: string;
}

interface RaceHubCanvasProps {
    character: Character;
    kind: RaceHubKind;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const HUB_THEMES: Record<
    RaceHubKind,
    {
        title: string;
        cultureKey: CityCultureKey;
        spriteRegion: RpgSpriteRegionKey;
        accent: string;
        particleColor: string;
        buildings: HubBuilding[];
        npcs: Array<{ id: string; name: string; role: string; tx: number; ty: number; gender: RpgSpriteGenderKey; dialogue: string; tab?: string }>;
    }
> = {
    elf: {
        title: '미르탈 숲연합 · 비밀의 숲 성역',
        cultureKey: 'sylvanar',
        spriteRegion: 'sylvanar',
        accent: '#34d399',
        particleColor: 'rgba(110, 231, 183, 0.65)',
        buildings: [
            { id: 'elf_audience', name: '세계수 장로원', tx: 14, ty: 3, w: 6, h: 4, doorTx: 17, doorTy: 8, accent: '#34d399', iconLabel: '🌿', spriteKind: 'special_elf', tab: 'audience' },
            { id: 'elf_recruits', name: '숲의 정찰대 병영', tx: 4, ty: 8, w: 5, h: 4, doorTx: 6, doorTy: 13, accent: '#2dd4bf', iconLabel: '🏹', spriteKind: 'house', tab: 'recruits' },
            { id: 'elf_shop', name: '정령 비약 상점', tx: 25, ty: 8, w: 5, h: 4, doorTx: 27, doorTy: 13, accent: '#a7f3d0', iconLabel: '🧪', spriteKind: 'shop', tab: 'shop' },
            { id: 'elf_skills', name: '고대 세계수 비기 전당', tx: 14, ty: 15, w: 6, h: 4, doorTx: 17, doorTy: 20, accent: '#fde047', iconLabel: '✨', spriteKind: 'landmark', tab: 'skills' }
        ],
        npcs: [
            { id: 'elf_elder', name: '대장로 에아렌딜', role: '세계수 장로원 수장', tx: 17, ty: 9, gender: 'male', dialogue: '세계수의 숨결이 그대와 함께하길. 알현 및 임무를 확인하시겠소?', tab: 'audience' },
            { id: 'elf_captain', name: '정찰대장 실피드', role: '엘프 전사 영입관', tx: 7, ty: 14, gender: 'female', dialogue: '숲의 정예 궁수와 정령사들이 합류를 기다리고 있습니다.', tab: 'recruits' },
            { id: 'elf_merchant', name: '정령 상인 리아나', role: '엘프 상점 주인', tx: 27, ty: 14, gender: 'female', dialogue: '고대 숲에서만 구할 수 있는 진귀한 비약과 장비를 살펴보세요.', tab: 'shop' }
        ]
    },
    beast: {
        title: '레오니스 투기국 · 투사의 전당',
        cultureKey: 'feraldia',
        spriteRegion: 'feraldia',
        accent: '#fb923c',
        particleColor: 'rgba(251, 146, 60, 0.65)',
        buildings: [
            { id: 'beast_audience', name: '대투기장 · 대족장 전당', tx: 14, ty: 3, w: 6, h: 4, doorTx: 17, doorTy: 8, accent: '#fb923c', iconLabel: '🦁', spriteKind: 'special_beast', tab: 'audience' },
            { id: 'beast_recruits', name: '투사 훈련소', tx: 4, ty: 8, w: 5, h: 4, doorTx: 6, doorTy: 13, accent: '#f59e0b', iconLabel: '🪓', spriteKind: 'house', tab: 'recruits' },
            { id: 'beast_shop', name: '야수의 대장간', tx: 25, ty: 8, w: 5, h: 4, doorTx: 27, doorTy: 13, accent: '#ef4444', iconLabel: '⚒️', spriteKind: 'shop', tab: 'shop' },
            { id: 'beast_skills', name: '야성 비기 연무장', tx: 14, ty: 15, w: 6, h: 4, doorTx: 17, doorTy: 20, accent: '#fde047', iconLabel: '🔥', spriteKind: 'landmark', tab: 'skills' }
        ],
        npcs: [
            { id: 'beast_chief', name: '투왕 레오나르', role: '대족장 · 투기장 주인', tx: 17, ty: 9, gender: 'male', dialogue: '강자만이 살아남는 투기장에 온 걸 환영한다! 도전을 받아들이겠나?', tab: 'audience' },
            { id: 'beast_trainer', name: '야수 교관 바르가스', role: '전사 영입관', tx: 7, ty: 14, gender: 'male', dialogue: '거친 야성을 지닌 맹수 전사들이 네 동료가 되길 원한다.', tab: 'recruits' },
            { id: 'beast_smith', name: '강철발톱 고르곤', role: '수인 상점 주인', tx: 27, ty: 14, gender: 'male', dialogue: '전장의 피로 벼려낸 강인한 무구들이 준비되어 있다!', tab: 'shop' }
        ]
    },
    demon: {
        title: '네크로디움 제국 · 계약의 전당',
        cultureKey: 'abyssalon',
        spriteRegion: 'abyssalon',
        accent: '#c084fc',
        particleColor: 'rgba(192, 132, 252, 0.6)',
        buildings: [
            { id: 'demon_audience', name: '마족 제국 의회', tx: 14, ty: 3, w: 6, h: 4, doorTx: 17, doorTy: 8, accent: '#c084fc', iconLabel: '👑', spriteKind: 'special_demon', tab: 'audience' },
            { id: 'demon_recruits', name: '마인 계약관', tx: 4, ty: 8, w: 5, h: 4, doorTx: 6, doorTy: 13, accent: '#a855f7', iconLabel: '🦇', spriteKind: 'house', tab: 'recruits' },
            { id: 'demon_shop', name: '심연 암시장', tx: 25, ty: 8, w: 5, h: 4, doorTx: 27, doorTy: 13, accent: '#ec4899', iconLabel: '💀', spriteKind: 'shop', tab: 'shop' },
            { id: 'demon_slaves', name: '어둠의 노예 시장', tx: 14, ty: 15, w: 6, h: 4, doorTx: 17, doorTy: 20, accent: '#f43f5e', iconLabel: '⛓️', spriteKind: 'landmark', tab: 'slaves' }
        ],
        npcs: [
            { id: 'demon_lord', name: '제국 의장 벨제불', role: '마족 의회 수장', tx: 17, ty: 9, gender: 'male', dialogue: '네크로디움의 계약은 절대적이다. 의회의 임무를 수락하겠느냐?', tab: 'audience' },
            { id: 'demon_broker', name: '계약관 리리스', role: '마인 고용 중개인', tx: 7, ty: 14, gender: 'female', dialogue: '피의 계약을 맺을 준비가 된 강력한 마족 용병들이 대기 중입니다.', tab: 'recruits' },
            { id: 'demon_merchant', name: '암시장 주인 모르도', role: '금서 · 유물 상인', tx: 27, ty: 14, gender: 'male', dialogue: '인간계에서는 구경조차 못 할 금단의 물건들을 거래하지.', tab: 'shop' }
        ]
    }
};

const RaceHubCanvas: React.FC<RaceHubCanvasProps> = ({
    character,
    kind,
    region,
    nation,
    city,
    onExitToCity,
    onUpdateCharacter
}) => {
    const theme = HUB_THEMES[kind];
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scaledImgCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [selectedNpc, setSelectedNpc] = useState<HubNpc | null>(null);
    const [nearbyBuilding, setNearbyBuilding] = useState<HubBuilding | null>(null);
    const [nearbyNpc, setNearbyNpc] = useState<HubNpc | null>(null);
    const prevNearBRef = useRef<string | null>(null);
    const prevNearNRef = useRef<string | null>(null);

    const playerSprite = useMemo(
        () => resolveEntityRpgSprite(character, region, nation),
        [character, region, nation]
    );

    const npcs = useMemo<HubNpc[]>(() => {
        return theme.npcs.map(n => {
            const spr = resolveEntityRpgSprite({ name: n.name, gender: n.gender } as any, theme.spriteRegion, nation);
            return {
                ...n,
                homeTx: n.tx,
                homeTy: n.ty,
                dir: 'down',
                spriteUrl: spr.url
            };
        });
    }, [theme, nation]);

    const npcRuntimeRef = useRef<HubNpc[]>([]);
    useEffect(() => {
        npcRuntimeRef.current = npcs.map(n => ({ ...n }));
    }, [npcs]);

    const playerRef = useRef({
        x: 17 * TILE + TILE / 2,
        y: 12 * TILE + TILE / 2,
        dir: 'up' as SpriteDirection,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());

    const hasOverlayOpen = !!(activeTab || selectedNpc);
    const modalOpenRef = useRef(false);
    useEffect(() => {
        modalOpenRef.current = hasOverlayOpen;
        if (hasOverlayOpen) {
            keysRef.current.clear();
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;
        }
    }, [hasOverlayOpen]);

    useEffect(() => {
        if (playerSprite.url) loadRpgSpriteImage(playerSprite.url);
        npcs.forEach(n => {
            if (n.spriteUrl) loadRpgSpriteImage(n.spriteUrl);
        });
        const assetUrls = new Set<string>([
            ...(['ground', 'road', 'plaza', 'wall'] as TerrainTilePart[]).map(p => getTerrainTileUrl(theme.cultureKey, p)),
            ...theme.buildings.map(b => getBuildingSpriteUrl(theme.cultureKey, b.spriteKind)),
            resolveDecorationSpriteUrl(theme.cultureKey, 'culture', 'tree'),
            resolveDecorationSpriteUrl(theme.cultureKey, 'culture', 'lamp'),
            resolveDecorationSpriteUrl(theme.cultureKey, 'culture', 'fountain')
        ]);
        assetUrls.forEach(u => {
            if (u) loadCityAssetImage(u);
        });
    }, [playerSprite.url, npcs, theme]);

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
        let cached = scaledImgCacheRef.current.get(key);
        if (!cached) {
            cached = document.createElement('canvas');
            cached.width = w;
            cached.height = h;
            const cctx = cached.getContext('2d');
            if (cctx) {
                cctx.imageSmoothingEnabled = true;
                cctx.imageSmoothingQuality = 'medium';
                cctx.drawImage(img, 0, 0, w, h);
            }
            if (scaledImgCacheRef.current.size > 120) scaledImgCacheRef.current.clear();
            scaledImgCacheRef.current.set(key, cached);
        }
        ctx.drawImage(cached, Math.round(dx), Math.round(dy));
    };

    const interactNearest = useCallback(() => {
        const p = playerRef.current;
        let bestB: HubBuilding | null = null;
        let bestBD = TILE * 2.8;
        for (const b of theme.buildings) {
            const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
            if (d < bestBD) {
                bestBD = d;
                bestB = b;
            }
        }
        if (bestB) {
            setActiveTab(bestB.tab);
            return;
        }
        let bestN: HubNpc | null = null;
        let bestND = TILE * 2.2;
        for (const n of npcRuntimeRef.current) {
            const d = Math.hypot(p.x - (n.tx * TILE + TILE / 2), p.y - (n.ty * TILE + TILE / 2));
            if (d < bestND) {
                bestND = d;
                bestN = n;
            }
        }
        if (bestN) setSelectedNpc(bestN);
    }, [theme.buildings]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (modalOpenRef.current) return;
            const k = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
                e.preventDefault();
                keysRef.current.add(k);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
            } else if (k === ' ' || k === 'enter') {
                e.preventDefault();
                interactNearest();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [interactNearest]);

    const isBlocked = useCallback(
        (wx: number, wy: number) => {
            const tx = Math.floor(wx / TILE);
            const ty = Math.floor(wy / TILE);
            if (tx < 2 || tx >= COLS - 2 || ty < 2 || ty >= ROWS - 2) return true;
            for (const b of theme.buildings) {
                if (tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h) return true;
            }
            return false;
        },
        [theme.buildings]
    );

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        const particles = Array.from({ length: 30 }, (_, i) => ({
            x: ((i * 5113) % (COLS * TILE)),
            y: ((i * 3191) % (ROWS * TILE)),
            speed: 14 + (i % 4) * 5,
            r: 2 + (i % 2)
        }));

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;
            const canvas = canvasRef.current;
            if (canvas) {
                if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                    canvas.width = canvas.clientWidth;
                    canvas.height = canvas.clientHeight;
                }
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const p = playerRef.current;
                    const speed = 280;
                    let dx = 0;
                    let dy = 0;
                    if (!modalOpenRef.current) {
                        const ks = keysRef.current;
                        if (ks.has('w') || ks.has('arrowup')) dy -= 1;
                        if (ks.has('s') || ks.has('arrowdown')) dy += 1;
                        if (ks.has('a') || ks.has('arrowleft')) dx -= 1;
                        if (ks.has('d') || ks.has('arrowright')) dx += 1;
                        if (dx === 0 && dy === 0 && p.targetX !== null && p.targetY !== null) {
                            const tdx = p.targetX - p.x;
                            const tdy = p.targetY - p.y;
                            const dist = Math.hypot(tdx, tdy);
                            if (dist < 10) {
                                p.targetX = null;
                                p.targetY = null;
                            } else {
                                dx = tdx / dist;
                                dy = tdy / dist;
                            }
                        }
                    }

                    if (dx !== 0 || dy !== 0) {
                        const len = Math.hypot(dx, dy);
                        dx /= len;
                        dy /= len;
                        const nx = p.x + dx * speed * dt;
                        const ny = p.y + dy * speed * dt;
                        if (!isBlocked(nx, p.y)) p.x = nx;
                        if (!isBlocked(p.x, ny)) p.y = ny;
                        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                        p.animTimer += dt;
                        if (p.animTimer > 0.14) {
                            p.animTimer = 0;
                            p.walkFrame = (p.walkFrame + 1) % 3;
                        }
                    } else {
                        p.walkFrame = 1;
                    }

                    let nearB: HubBuilding | null = null;
                    let nearBD = TILE * 2.8;
                    for (const b of theme.buildings) {
                        const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
                        if (d < nearBD) {
                            nearBD = d;
                            nearB = b;
                        }
                    }
                    if (prevNearBRef.current !== (nearB?.id || null)) {
                        prevNearBRef.current = nearB?.id || null;
                        setNearbyBuilding(nearB);
                    }

                    let nearN: HubNpc | null = null;
                    let nearND = TILE * 2.2;
                    npcRuntimeRef.current.forEach(n => {
                        const nx = n.tx * TILE + TILE / 2;
                        const ny = n.ty * TILE + TILE / 2;
                        const d = Math.hypot(p.x - nx, p.y - ny);
                        if (d < TILE * 3.5) {
                            const pdx = p.x - nx;
                            const pdy = p.y - ny;
                            n.dir = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? 'right' : 'left') : (pdy > 0 ? 'down' : 'up');
                        }
                        if (d < nearND) {
                            nearND = d;
                            nearN = n;
                        }
                    });
                    if (prevNearNRef.current !== (nearN?.id || null)) {
                        prevNearNRef.current = nearN?.id || null;
                        setNearbyNpc(nearN);
                    }

                    const camX = Math.max(0, Math.min(COLS * TILE - canvas.width, p.x - canvas.width / 2));
                    const camY = Math.max(0, Math.min(ROWS * TILE - canvas.height, p.y - canvas.height / 2));

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    ctx.translate(-camX, -camY);

                    const groundImg = getCachedCityAssetImage(getTerrainTileUrl(theme.cultureKey, 'ground'));
                    const roadImg = getCachedCityAssetImage(getTerrainTileUrl(theme.cultureKey, 'road'));
                    const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(theme.cultureKey, 'plaza'));
                    const wallImg = getCachedCityAssetImage(getTerrainTileUrl(theme.cultureKey, 'wall'));

                    const startTx = Math.max(0, Math.floor(camX / TILE) - 1);
                    const endTx = Math.min(COLS - 1, Math.ceil((camX + canvas.width) / TILE) + 1);
                    const startTy = Math.max(0, Math.floor(camY / TILE) - 1);
                    const endTy = Math.min(ROWS - 1, Math.ceil((camY + canvas.height) / TILE) + 1);

                    for (let ty = startTy; ty <= endTy; ty++) {
                        for (let tx = startTx; tx <= endTx; tx++) {
                            const x = tx * TILE;
                            const y = ty * TILE;
                            const isBorder = tx < 2 || tx >= COLS - 2 || ty < 2 || ty >= ROWS - 2;
                            const isPlaza = Math.hypot(tx - 17, ty - 12) < 4;
                            const isRoad = (tx >= 16 && tx <= 18 && ty >= 7 && ty <= 20) || (ty >= 12 && ty <= 13 && tx >= 6 && tx <= 28);

                            if (isBorder) {
                                if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) drawScaledImg(ctx, wallImg, `w_${theme.cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isPlaza) {
                                if (plazaImg && plazaImg.complete && plazaImg.naturalWidth > 0) drawScaledImg(ctx, plazaImg, `p_${theme.cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#334155'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isRoad) {
                                if (roadImg && roadImg.complete && roadImg.naturalWidth > 0) drawScaledImg(ctx, roadImg, `r_${theme.cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#475569'; ctx.fillRect(x, y, TILE, TILE); }
                            } else {
                                if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) drawScaledImg(ctx, groundImg, `g_${theme.cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#0f172a'; ctx.fillRect(x, y, TILE, TILE); }
                            }
                        }
                    }

                    // 조경 장식
                    const treeUrl = resolveDecorationSpriteUrl(theme.cultureKey, 'culture', 'tree');
                    const lampUrl = resolveDecorationSpriteUrl(theme.cultureKey, 'culture', 'lamp');
                    const treeImg = getCachedCityAssetImage(treeUrl);
                    const lampImg = getCachedCityAssetImage(lampUrl);
                    [[3, 4], [30, 4], [3, 20], [30, 20], [12, 10], [22, 10]].forEach(([tx, ty]) => {
                        if (treeImg && treeImg.complete && treeImg.naturalWidth > 0) {
                            drawScaledImg(ctx, treeImg, `t_${treeUrl}`, tx * TILE - 12, ty * TILE - 24, TILE * 1.5, TILE * 1.5);
                        }
                    });
                    [[15, 11], [19, 11], [15, 14], [19, 14]].forEach(([tx, ty]) => {
                        if (lampImg && lampImg.complete && lampImg.naturalWidth > 0) {
                            drawScaledImg(ctx, lampImg, `l_${lampUrl}`, tx * TILE, ty * TILE - 10, TILE, TILE * 1.2);
                        }
                    });

                    theme.buildings.forEach(b => {
                        const bx = b.tx * TILE;
                        const by = b.ty * TILE;
                        const bw = b.w * TILE;
                        const bh = b.h * TILE;
                        const bUrl = getBuildingSpriteUrl(theme.cultureKey, b.spriteKind);
                        const bImg = getCachedCityAssetImage(bUrl);
                        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                            drawScaledImg(ctx, bImg, `hb_${bUrl}`, bx - 8, by - 16, bw + 16, bh + 18);
                        } else {
                            ctx.fillStyle = '#1e293b';
                            ctx.fillRect(bx, by, bw, bh);
                            ctx.strokeStyle = b.accent;
                            ctx.lineWidth = 2.5;
                            ctx.strokeRect(bx, by, bw, bh);
                        }
                        ctx.font = 'bold 12px sans-serif';
                        const label = `${b.iconLabel} ${b.name}`;
                        const tw = ctx.measureText(label).width + 18;
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                        ctx.fillRect(bx + bw / 2 - tw / 2, by - 30, tw, 22);
                        ctx.strokeStyle = b.accent;
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(bx + bw / 2 - tw / 2, by - 30, tw, 22);
                        ctx.fillStyle = '#f8fafc';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, bx + bw / 2, by - 15);
                    });

                    npcRuntimeRef.current.forEach(n => {
                        const nx = n.tx * TILE + TILE / 2;
                        const ny = n.ty * TILE + TILE / 2;
                        const spr = getCachedRpgSpriteImage(n.spriteUrl);
                        if (spr && spr.complete && spr.naturalWidth > 0) {
                            ctx.fillStyle = 'rgba(0,0,0,0.34)';
                            ctx.beginPath();
                            ctx.ellipse(nx, ny + 18, 12, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                            const cellW = spr.naturalWidth / 3;
                            const cellH = spr.naturalHeight / 4;
                            const row = DIRECTION_ROW_MAP[n.dir] ?? 0;
                            ctx.drawImage(spr, cellW, row * cellH, cellW, cellH, nx - 24, ny - 28, 48, 48);
                        } else {
                            drawFallbackChibiSprite(ctx, nx, ny + 18, 44, n.dir, 1, theme.spriteRegion, n.gender);
                        }
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const ntw = ctx.measureText(n.name).width + 10;
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
                        ctx.fillRect(nx - ntw / 2, ny + 22, ntw, 16);
                        ctx.fillStyle = theme.accent;
                        ctx.fillText(n.name, nx, ny + 34);
                    });

                    const pspr = getCachedRpgSpriteImage(playerSprite.url);
                    if (pspr && pspr.complete && pspr.naturalWidth > 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.38)';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + 18, 13, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const cellW = pspr.naturalWidth / 3;
                        const cellH = pspr.naturalHeight / 4;
                        const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                        const col = Math.max(0, Math.min(2, p.walkFrame));
                        ctx.drawImage(pspr, col * cellW, row * cellH, cellW, cellH, p.x - 24, p.y - 28, 48, 48);
                    } else {
                        drawFallbackChibiSprite(ctx, p.x, p.y + 18, 46, p.dir, p.walkFrame, playerSprite.regionKey, playerSprite.genderKey);
                    }

                    particles.forEach(pt => {
                        pt.y -= pt.speed * dt;
                        if (pt.y < 0) pt.y = ROWS * TILE;
                        ctx.fillStyle = theme.particleColor;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    drawCanvasNightOverlay(ctx, camX, camY, canvas.width, canvas.height, character.currentTime, {
                        playerLight: { x: p.x, y: p.y - 6, radius: 100 }
                    });
                    ctx.restore();
                }
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [theme, playerSprite, isBlocked]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (modalOpenRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const p = playerRef.current;
        const camX = Math.max(0, Math.min(COLS * TILE - canvas.width, p.x - canvas.width / 2));
        const camY = Math.max(0, Math.min(ROWS * TILE - canvas.height, p.y - canvas.height / 2));
        const wx = e.clientX - rect.left + camX;
        const wy = e.clientY - rect.top + camY;

        for (const b of theme.buildings) {
            if (wx >= b.tx * TILE && wx <= (b.tx + b.w) * TILE && wy >= b.ty * TILE && wy <= (b.ty + b.h) * TILE) {
                const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
                if (d < TILE * 3.5) {
                    setActiveTab(b.tab);
                    return;
                }
                p.targetX = b.doorTx * TILE + TILE / 2;
                p.targetY = (b.doorTy + 1) * TILE + TILE / 2;
                return;
            }
        }
        for (const n of npcRuntimeRef.current) {
            if (Math.hypot(wx - (n.tx * TILE + TILE / 2), wy - (n.ty * TILE + TILE / 2)) < TILE * 0.9) {
                setSelectedNpc(n);
                return;
            }
        }
        p.targetX = wx;
        p.targetY = wy;
    };

    return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
            <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full h-full block cursor-pointer" />

            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <div className="bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2 shadow-xl">
                    <div className="text-xs font-black text-white">{theme.title}</div>
                    <div className="text-[10px] text-slate-400">{nation} · {city}</div>
                </div>
                <button
                    onClick={onExitToCity}
                    className="bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                    <DoorOpen size={14} /> 광장으로
                </button>
            </div>

            {(nearbyBuilding || nearbyNpc) && !hasOverlayOpen && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={interactNearest}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce"
                    >
                        <Sparkles size={15} />
                        {nearbyBuilding ? `${nearbyBuilding.iconLabel} ${nearbyBuilding.name} 입장 (Space)` : `💬 ${nearbyNpc?.name} 대화하기 (Space)`}
                    </button>
                </div>
            )}

            {selectedNpc && (
                <div className="fixed inset-0 z-50 bg-black/65 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs text-amber-400 font-bold">{selectedNpc.role}</div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <MessageSquare size={16} className="text-amber-400" />
                                    {selectedNpc.name}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedNpc(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">"{selectedNpc.dialogue}"</p>
                        <div className="flex justify-end gap-2">
                            {selectedNpc.tab && (
                                <button
                                    onClick={() => {
                                        const tab = selectedNpc.tab!;
                                        setSelectedNpc(null);
                                        setActiveTab(tab);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                                >
                                    바로 열기
                                </button>
                            )}
                            <button onClick={() => setSelectedNpc(null)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab && kind === 'elf' && (
                <ElfCityModal character={character} initialTab={activeTab as ElfCityTab} singleTabOnly={true} onClose={() => setActiveTab(null)} onUpdateCharacter={onUpdateCharacter} />
            )}
            {activeTab && kind === 'beast' && (
                <BeastCityModal character={character} initialTab={activeTab as BeastCityTab} singleTabOnly={true} onClose={() => setActiveTab(null)} onUpdateCharacter={onUpdateCharacter} />
            )}
            {activeTab && kind === 'demon' && (
                <DemonCityModal character={character} initialTab={activeTab as DemonCityTab} singleTabOnly={true} onClose={() => setActiveTab(null)} onUpdateCharacter={onUpdateCharacter} />
            )}
        </div>
    );
};

export default RaceHubCanvas;
