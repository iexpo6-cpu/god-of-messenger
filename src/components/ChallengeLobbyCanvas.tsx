import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../types';
import { BASE_TILE_SIZE } from '../services/baseTilemapEngine';
import {
    getCachedCityAssetImage,
    getTerrainTileUrl,
    loadCityAssetImage,
    resolveCityCultureKey
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
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Crown,
    DoorOpen,
    Flame,
    MessageCircle,
    Shield,
    Skull,
    Sparkles,
    Sword,
    Trophy,
    X
} from 'lucide-react';

export type ChallengeLobbyMode =
    | 'abyss_tower'
    | 'transcendent_arena'
    | 'grand_arena'
    | 'school_tournament';

export interface ChallengeLobbyNpc {
    id: string;
    name: string;
    role: string;
    tx: number;
    ty: number;
    dir: SpriteDirection;
    gender: RpgSpriteGenderKey;
    regionKey?: RpgSpriteRegionKey;
    visualUrl?: string;
    dialogue: string;
    kind: 'challenger' | 'boss' | 'official' | 'portal' | 'spectator' | 'ally';
    auraColor?: string;
    canPatrol?: boolean;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

interface ChallengeLobbyCanvasProps {
    character: Character;
    mode: ChallengeLobbyMode;
    title: string;
    subtitle: string;
    cheerText?: string;
    npcs: ChallengeLobbyNpc[];
    onClose: () => void;
    heightClassName?: string;
    headerExtra?: React.ReactNode;
}

const COLS = 24;
const ROWS = 17;
const TILE = BASE_TILE_SIZE;

const MODE_THEME: Record<
    ChallengeLobbyMode,
    {
        cultureKey: string;
        bgGradient: string;
        ringColor: string;
        ringGlow: string;
        standColor: string;
        accentText: string;
        portalLabel?: string;
    }
> = {
    abyss_tower: {
        cultureKey: 'magye',
        bgGradient: '#0b0614',
        ringColor: 'rgba(239, 68, 68, 0.55)',
        ringGlow: 'rgba(220, 38, 38, 0.25)',
        standColor: 'rgba(30, 12, 38, 0.72)',
        accentText: 'text-red-300',
        portalLabel: '심연 차원문'
    },
    transcendent_arena: {
        cultureKey: 'shingye',
        bgGradient: '#0d102b',
        ringColor: 'rgba(251, 191, 36, 0.65)',
        ringGlow: 'rgba(245, 158, 11, 0.25)',
        standColor: 'rgba(30, 27, 75, 0.65)',
        accentText: 'text-amber-300'
    },
    grand_arena: {
        cultureKey: 'europe',
        bgGradient: '#0f172a',
        ringColor: 'rgba(99, 102, 241, 0.65)',
        ringGlow: 'rgba(79, 70, 229, 0.25)',
        standColor: 'rgba(15, 23, 42, 0.72)',
        accentText: 'text-indigo-300'
    },
    school_tournament: {
        cultureKey: 'korea',
        bgGradient: '#111827',
        ringColor: 'rgba(245, 158, 11, 0.65)',
        ringGlow: 'rgba(217, 119, 6, 0.25)',
        standColor: 'rgba(30, 41, 59, 0.72)',
        accentText: 'text-amber-300'
    }
};

export const ChallengeLobbyCanvas: React.FC<ChallengeLobbyCanvasProps> = ({
    character,
    mode,
    title,
    subtitle,
    cheerText,
    npcs,
    onClose,
    heightClassName = 'h-[520px] sm:h-[580px]',
    headerExtra
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState({ w: 860, h: 520 });
    const [selectedNpc, setSelectedNpc] = useState<ChallengeLobbyNpc | null>(null);

    const theme = MODE_THEME[mode];
    const nation = character.currentLocation?.nation || character.nation || '대한민국';
    const cultureKey = resolveCityCultureKey(nation, mode === 'abyss_tower' ? '마계' : mode === 'transcendent_arena' ? '신계' : undefined);

    const regionStr = mode === 'abyss_tower' ? '마계' : mode === 'transcendent_arena' ? '신계' : (character.currentLocation?.region || '유럽');

    const playerSpriteInfo = useMemo(() => {
        return resolveEntityRpgSprite(character, regionStr, nation);
    }, [character, regionStr, nation]);

    const playerPosRef = useRef<{ x: number; y: number; dir: SpriteDirection; walking: boolean; frame: number; targetX: number | null; targetY: number | null }>({
        x: 12 * TILE + TILE / 2,
        y: 13 * TILE + TILE / 2,
        dir: 'up',
        walking: false,
        frame: 0,
        targetX: null,
        targetY: null
    });

    const keysRef = useRef<Record<string, boolean>>({});
    const dpadRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);
    const npcOffsetsRef = useRef<Record<string, { dx: number; dy: number; dir: SpriteDirection; timer: number; vx: number; vy: number }>>({});
    const npcsRef = useRef<ChallengeLobbyNpc[]>(npcs);
    npcsRef.current = npcs;

    const resolvedNpcSprites = useMemo(() => {
        const map: Record<string, { url: string; gender: RpgSpriteGenderKey; region: RpgSpriteRegionKey }> = {};
        npcs.forEach((n) => {
            const rKey: RpgSpriteRegionKey = n.regionKey || (mode === 'abyss_tower' ? 'magye' : mode === 'transcendent_arena' ? 'shingye' : 'europe');
            const info = resolveEntityRpgSprite(
                { name: n.name, gender: n.gender === 'female' ? '여성' : '남성', role: n.role } as any,
                rKey,
                nation
            );
            map[n.id] = { url: n.visualUrl || info.url, gender: n.gender, region: info.region };
            loadRpgSpriteImage(n.visualUrl || info.url);
        });
        return map;
    }, [npcs, mode, nation]);

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteInfo.url);
        const floorCulture = mode === 'abyss_tower' ? 'northern_europe' : mode === 'transcendent_arena' ? 'europe' : cultureKey;
        loadCityAssetImage(getTerrainTileUrl(floorCulture as any, 'plaza'));
        loadCityAssetImage(getTerrainTileUrl(floorCulture as any, 'road'));
    }, [playerSpriteInfo.url, mode, cultureKey]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setViewport({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const findNearestInteractable = useCallback((): ChallengeLobbyNpc | null => {
        const p = playerPosRef.current;
        const ptx = p.x / TILE;
        const pty = p.y / TILE;
        let best: ChallengeLobbyNpc | null = null;
        let bestDist = 2.4;
        for (const n of npcsRef.current) {
            const off = npcOffsetsRef.current[n.id];
            const ntx = n.tx + (off ? off.dx / TILE : 0) + 0.5;
            const nty = n.ty + (off ? off.dy / TILE : 0) + 0.5;
            const d = Math.hypot(ptx - ntx, pty - nty);
            if (d < bestDist) {
                bestDist = d;
                best = n;
            }
        }
        return best;
    }, []);

    const handleInteract = useCallback(() => {
        const target = findNearestInteractable();
        if (target) {
            setSelectedNpc(target);
        }
    }, [findNearestInteractable]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (selectedNpc) {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    setSelectedNpc(null);
                }
                return;
            }
            const k = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
                keysRef.current[k] = true;
                playerPosRef.current.targetX = null;
                playerPosRef.current.targetY = null;
            } else if (k === 'e' || k === ' ' || k === 'enter') {
                e.preventDefault();
                handleInteract();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.key.toLowerCase()] = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [selectedNpc, handleInteract]);

    useEffect(() => {
        let rafId = 0;
        let lastTime = performance.now();

        const isBlocked = (wx: number, wy: number) => {
            const tx = wx / TILE;
            const ty = wy / TILE;
            if (tx < 1.2 || tx > COLS - 1.2 || ty < 1.6 || ty > ROWS - 1.2) return true;
            // Spectator stands barriers on far left & far right
            if ((tx < 3.4 || tx > COLS - 3.4) && ty >= 2.5 && ty <= ROWS - 2.5) return true;
            return false;
        };

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;

            const p = playerPosRef.current;
            let vx = 0;
            let vy = 0;
            const keys = keysRef.current;
            if (keys['w'] || keys['arrowup'] || dpadRef.current === 'up') vy -= 1;
            if (keys['s'] || keys['arrowdown'] || dpadRef.current === 'down') vy += 1;
            if (keys['a'] || keys['arrowleft'] || dpadRef.current === 'left') vx -= 1;
            if (keys['d'] || keys['arrowright'] || dpadRef.current === 'right') vx += 1;

            const speed = 195;
            if (vx !== 0 || vy !== 0) {
                const len = Math.hypot(vx, vy);
                vx = (vx / len) * speed * dt;
                vy = (vy / len) * speed * dt;
                if (Math.abs(vx) > Math.abs(vy)) p.dir = vx > 0 ? 'right' : 'left';
                else p.dir = vy > 0 ? 'down' : 'up';
                if (!isBlocked(p.x + vx, p.y)) p.x += vx;
                if (!isBlocked(p.x, p.y + vy)) p.y += vy;
                p.walking = true;
                p.frame += dt * 9;
            } else if (p.targetX !== null && p.targetY !== null) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 6) {
                    p.targetX = null;
                    p.targetY = null;
                    p.walking = false;
                } else {
                    const step = Math.min(dist, speed * dt);
                    const mx = (dx / dist) * step;
                    const my = (dy / dist) * step;
                    if (Math.abs(mx) > Math.abs(my)) p.dir = mx > 0 ? 'right' : 'left';
                    else p.dir = my > 0 ? 'down' : 'up';
                    if (!isBlocked(p.x + mx, p.y)) p.x += mx;
                    if (!isBlocked(p.x, p.y + my)) p.y += my;
                    p.walking = true;
                    p.frame += dt * 9;
                }
            } else {
                p.walking = false;
            }

            // Gentle patrol for spectators / wandering NPCs
            for (const n of npcsRef.current) {
                if (!n.canPatrol) continue;
                let st = npcOffsetsRef.current[n.id];
                if (!st) {
                    st = { dx: 0, dy: 0, dir: n.dir, timer: 1 + Math.random() * 2, vx: 0, vy: 0 };
                    npcOffsetsRef.current[n.id] = st;
                }
                st.timer -= dt;
                if (st.timer <= 0) {
                    st.timer = 1.6 + Math.random() * 2.5;
                    if (Math.random() < 0.55) {
                        st.vx = 0;
                        st.vy = 0;
                    } else {
                        const dirs: Array<[number, number, SpriteDirection]> = [
                            [0, -18, 'up'],
                            [0, 18, 'down'],
                            [-18, 0, 'left'],
                            [18, 0, 'right']
                        ];
                        const pick = dirs[Math.floor(Math.random() * dirs.length)];
                        st.vx = pick[0];
                        st.vy = pick[1];
                        st.dir = pick[2];
                    }
                }
                if (st.vx !== 0 || st.vy !== 0) {
                    const nx = st.dx + st.vx * dt;
                    const ny = st.dy + st.vy * dt;
                    if (Math.hypot(nx, ny) <= 22) {
                        st.dx = nx;
                        st.dy = ny;
                    } else {
                        st.vx = 0;
                        st.vy = 0;
                    }
                }
            }

            // Render
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const cw = viewport.w;
                    const ch = viewport.h;
                    if (canvas.width !== cw || canvas.height !== ch) {
                        canvas.width = cw;
                        canvas.height = ch;
                    }

                    const worldW = COLS * TILE;
                    const worldH = ROWS * TILE;
                    const camX = Math.max(0, Math.min(worldW - cw, p.x - cw / 2));
                    const camY = Math.max(0, Math.min(worldH - ch, p.y - ch / 2));

                    ctx.fillStyle = theme.bgGradient;
                    ctx.fillRect(0, 0, cw, ch);

                    ctx.save();
                    ctx.translate(-Math.round(camX), -Math.round(camY));

                    const floorCulture = mode === 'abyss_tower' ? 'northern_europe' : mode === 'transcendent_arena' ? 'europe' : cultureKey;
                    const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(floorCulture as any, 'plaza'));
                    const roadImg = getCachedCityAssetImage(getTerrainTileUrl(floorCulture as any, 'road'));

                    // Floor tiles
                    for (let ty = 0; ty < ROWS; ty++) {
                        for (let tx = 0; tx < COLS; tx++) {
                            const isAisle = tx >= 10 && tx <= 13 && ty >= 4 && ty <= 15;
                            const isCenter = tx >= 7 && tx <= 16 && ty >= 3 && ty <= 10;
                            const tileImg = isAisle ? roadImg : plazaImg;
                            if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
                                ctx.drawImage(tileImg, tx * TILE, ty * TILE, TILE, TILE);
                            } else {
                                ctx.fillStyle = isAisle ? '#1e293b' : '#0f172a';
                                ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
                            }
                            if (isCenter) {
                                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                                ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
                            }
                            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                            ctx.strokeRect(tx * TILE, ty * TILE, TILE, TILE);
                        }
                    }

                    // Spectator stands (left & right)
                    ctx.fillStyle = theme.standColor;
                    ctx.fillRect(TILE * 0.5, TILE * 2, TILE * 2.8, TILE * (ROWS - 4));
                    ctx.fillRect((COLS - 3.3) * TILE, TILE * 2, TILE * 2.8, TILE * (ROWS - 4));
                    ctx.strokeStyle = theme.ringColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(TILE * 0.5, TILE * 2, TILE * 2.8, TILE * (ROWS - 4));
                    ctx.strokeRect((COLS - 3.3) * TILE, TILE * 2, TILE * 2.8, TILE * (ROWS - 4));

                    // Central Arena Ring / Abyss Seal
                    const cx = 12 * TILE + TILE / 2;
                    const cy = 6.5 * TILE;
                    const pulse = 0.85 + Math.sin(now / 360) * 0.15;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, TILE * 3.2, 0, Math.PI * 2);
                    ctx.fillStyle = theme.ringGlow;
                    ctx.fill();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = theme.ringColor;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(cx, cy, TILE * 2.3 * pulse, 0, Math.PI * 2);
                    ctx.setLineDash([8, 6]);
                    ctx.strokeStyle = theme.ringColor;
                    ctx.stroke();
                    ctx.restore();

                    // Abyss portal gate at top center for abyss_tower
                    if (mode === 'abyss_tower') {
                        const pxGate = 12 * TILE + TILE / 2;
                        const pyGate = 3 * TILE;
                        const grad = ctx.createRadialGradient(pxGate, pyGate, 6, pxGate, pyGate, 48);
                        grad.addColorStop(0, 'rgba(248, 113, 113, 0.95)');
                        grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.65)');
                        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(pxGate, pyGate, 48, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Sort entities by Y for proper depth
                    type DrawActor = {
                        id: string;
                        name: string;
                        sub?: string;
                        x: number;
                        y: number;
                        dir: SpriteDirection;
                        frame: number;
                        url: string;
                        gender: RpgSpriteGenderKey;
                        region: RpgSpriteRegionKey;
                        isPlayer?: boolean;
                        auraColor?: string;
                        kind?: ChallengeLobbyNpc['kind'];
                    };

                    const actors: DrawActor[] = [
                        {
                            id: 'player',
                            name: character.name,
                            sub: '나',
                            x: p.x,
                            y: p.y,
                            dir: p.dir,
                            frame: p.walking ? Math.floor(p.frame) % 4 : 0,
                            url: playerSpriteInfo.url,
                            gender: character.gender === '여성' ? 'female' : 'male',
                            region: playerSpriteInfo.region,
                            isPlayer: true
                        }
                    ];

                    npcsRef.current.forEach((n) => {
                        const off = npcOffsetsRef.current[n.id];
                        const sp = resolvedNpcSprites[n.id];
                        actors.push({
                            id: n.id,
                            name: n.name,
                            sub: n.role,
                            x: n.tx * TILE + TILE / 2 + (off?.dx || 0),
                            y: n.ty * TILE + TILE / 2 + (off?.dy || 0),
                            dir: off?.dir || n.dir,
                            frame: off && (off.vx !== 0 || off.vy !== 0) ? Math.floor(now / 150) % 4 : 0,
                            url: sp?.url || playerSpriteInfo.url,
                            gender: sp?.gender || n.gender,
                            region: sp?.region || playerSpriteInfo.region,
                            auraColor: n.auraColor,
                            kind: n.kind
                        });
                    });

                    actors.sort((a, b) => a.y - b.y);

                    const nearest = findNearestInteractable();

                    for (const actor of actors) {
                        // Aura ring for bosses/challengers
                        if (actor.auraColor) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.ellipse(actor.x, actor.y + 14, 22, 10, 0, 0, Math.PI * 2);
                            ctx.fillStyle = actor.auraColor;
                            ctx.fill();
                            ctx.restore();
                        }

                        // Shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.45)';
                        ctx.beginPath();
                        ctx.ellipse(actor.x, actor.y + 16, 14, 6, 0, 0, Math.PI * 2);
                        ctx.fill();

                        const img = getCachedRpgSpriteImage(actor.url);
                        if (img && img.complete && img.naturalWidth > 0) {
                            const cols = 3;
                            const rows = 4;
                            const fw = img.naturalWidth / cols;
                            const fh = img.naturalHeight / rows;
                            const row = DIRECTION_ROW_MAP[actor.dir] ?? 0;
                            const col = actor.frame % cols;
                            const drawW = 44;
                            const drawH = 44;
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(
                                img,
                                col * fw,
                                row * fh,
                                fw,
                                fh,
                                Math.round(actor.x - drawW / 2),
                                Math.round(actor.y - drawH + 14),
                                drawW,
                                drawH
                            );
                        } else {
                            drawFallbackChibiSprite(ctx, actor.x, actor.y + 8, actor.region, actor.gender, actor.dir, actor.frame % 3);
                        }

                        // Name tag
                        const isHighlight = nearest?.id === actor.id;
                        ctx.font = 'bold 11px sans-serif';
                        const labelText = actor.isPlayer ? `★ ${actor.name}` : actor.name;
                        const tw = ctx.measureText(labelText).width;
                        ctx.fillStyle = isHighlight ? 'rgba(245, 158, 11, 0.92)' : actor.isPlayer ? 'rgba(6, 182, 212, 0.88)' : 'rgba(15, 23, 42, 0.82)';
                        ctx.fillRect(actor.x - tw / 2 - 6, actor.y + 20, tw + 12, 17);
                        ctx.fillStyle = isHighlight || actor.isPlayer ? '#0f172a' : actor.kind === 'boss' || actor.kind === 'challenger' ? '#fca5a5' : '#e2e8f0';
                        ctx.textAlign = 'center';
                        ctx.fillText(labelText, actor.x, actor.y + 32);

                        if (isHighlight) {
                            ctx.fillStyle = '#fde047';
                            ctx.font = 'bold 11px sans-serif';
                            ctx.fillText('[E / 클릭] 상호작용', actor.x, actor.y - 40);
                        }
                    }

                    ctx.restore();
                }
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [viewport, mode, cultureKey, theme, character.name, character.gender, playerSpriteInfo, resolvedNpcSprites, findNearestInteractable]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const p = playerPosRef.current;
        const worldW = COLS * TILE;
        const worldH = ROWS * TILE;
        const camX = Math.max(0, Math.min(worldW - viewport.w, p.x - viewport.w / 2));
        const camY = Math.max(0, Math.min(worldH - viewport.h, p.y - viewport.h / 2));

        const wx = clickX + camX;
        const wy = clickY + camY;

        // Check if clicked on an NPC directly
        for (const n of npcsRef.current) {
            const off = npcOffsetsRef.current[n.id];
            const nx = n.tx * TILE + TILE / 2 + (off?.dx || 0);
            const ny = n.ty * TILE + TILE / 2 + (off?.dy || 0);
            if (Math.hypot(wx - nx, wy - ny) <= 34) {
                const distToPlayer = Math.hypot(p.x - nx, p.y - ny);
                if (distToPlayer <= TILE * 2.5) {
                    setSelectedNpc(n);
                    return;
                }
                // Walk near NPC
                p.targetX = nx;
                p.targetY = ny + TILE * 1.1;
                return;
            }
        }

        p.targetX = wx;
        p.targetY = wy;
    };

    const nearestNpc = findNearestInteractable();

    return (
        <div className="flex flex-col w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl">
            {/* Top Bar */}
            <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300">
                        {mode === 'abyss_tower' ? <Skull size={18} /> : mode === 'transcendent_arena' ? <Crown size={18} /> : <Trophy size={18} />}
                    </div>
                    <div>
                        <h3 className={`text-sm sm:text-base font-black ${theme.accentText}`}>{title}</h3>
                        <p className="text-[11px] text-slate-400">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {headerExtra}
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                        <DoorOpen size={14} />
                        <span>나가기</span>
                    </button>
                </div>
            </div>

            {cheerText && (
                <div className="px-4 py-1.5 bg-indigo-950/60 border-b border-indigo-500/25 text-center text-[11px] sm:text-xs text-indigo-200 flex items-center justify-center gap-2 shrink-0">
                    <Sparkles size={12} className="text-amber-400 shrink-0" />
                    <span className="truncate">{cheerText}</span>
                </div>
            )}

            {/* Canvas Viewport */}
            <div ref={containerRef} className={`relative w-full flex-1 ${heightClassName} select-none overflow-hidden`}>
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-full block cursor-crosshair"
                />

                {/* Guide Hint */}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700/80 text-[10px] sm:text-xs text-slate-300 pointer-events-none">
                    WASD / 방향키 / 터치 이동 · NPC에게 다가가 <span className="text-amber-300 font-bold">E 또는 클릭</span>
                </div>

                {/* Mobile D-pad + Interact */}
                <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1 w-24 sm:hidden">
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'up')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'up')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white flex justify-center"
                    >
                        <ArrowUp size={14} />
                    </button>
                    <div />
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'left')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'left')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white flex justify-center"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'down')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'down')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white flex justify-center"
                    >
                        <ArrowDown size={14} />
                    </button>
                    <button
                        type="button"
                        onTouchStart={() => (dpadRef.current = 'right')}
                        onTouchEnd={() => (dpadRef.current = null)}
                        onMouseDown={() => (dpadRef.current = 'right')}
                        onMouseUp={() => (dpadRef.current = null)}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white flex justify-center"
                    >
                        <ArrowRight size={14} />
                    </button>
                </div>

                {nearestNpc && !selectedNpc && (
                    <button
                        type="button"
                        onClick={() => setSelectedNpc(nearestNpc)}
                        className="absolute bottom-3 right-3 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer animate-bounce"
                    >
                        <MessageCircle size={15} />
                        <span>{nearestNpc.name}와(과) 대화/도전</span>
                    </button>
                )}

                {/* NPC Interaction Modal */}
                {selectedNpc && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-5 z-20 animate-in fade-in">
                        <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300">
                                        {selectedNpc.kind === 'boss' || selectedNpc.kind === 'challenger' ? (
                                            <Sword size={18} />
                                        ) : selectedNpc.kind === 'official' ? (
                                            <Shield size={18} />
                                        ) : (
                                            <Flame size={18} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm sm:text-base font-black text-white">{selectedNpc.name}</h4>
                                        <p className="text-[11px] text-amber-300/90 font-bold">{selectedNpc.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedNpc(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                                {selectedNpc.dialogue}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectedNpc.actionLabel && selectedNpc.onAction && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fn = selectedNpc.onAction!;
                                            setSelectedNpc(null);
                                            fn();
                                        }}
                                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        <Sword size={15} />
                                        <span>{selectedNpc.actionLabel}</span>
                                    </button>
                                )}
                                {selectedNpc.secondaryActionLabel && selectedNpc.onSecondaryAction && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fn = selectedNpc.onSecondaryAction!;
                                            setSelectedNpc(null);
                                            fn();
                                        }}
                                        className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm cursor-pointer"
                                    >
                                        {selectedNpc.secondaryActionLabel}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedNpc(null)}
                                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengeLobbyCanvas;
