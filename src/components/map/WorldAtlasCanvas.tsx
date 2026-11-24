import React, { useEffect, useRef, useState } from 'react';

export interface AtlasNode {
    name: string;
    x: number; // 0..100
    y: number; // 0..100
    type: string;
    tier?: 'Village' | 'Town' | 'City' | 'Capital';
    hasRift?: boolean;
    bossName?: string;
    riftCount?: number;
    hasInstantDungeon?: boolean;
    instantDungeonCount?: number;
    instantDungeonName?: string;
    instantDungeonLevel?: number;
    hasBlackMarket?: boolean;
    isCurrent?: boolean;
    isSelected?: boolean;
    isFavorite?: boolean;
    isIsland?: boolean;
}

interface WorldAtlasCanvasProps {
    nodes: AtlasNode[];
    realm: 'mortal' | 'divine';
    viewLevel: 'world' | 'continent' | 'nation';
    zoom: number;
    pan: { x: number; y: number };
    onPanChange: (next: { x: number; y: number }) => void;
    onZoomChange: (next: number) => void;
    onSelectNode: (node: AtlasNode) => void;
    currentNodeName?: string;
    selectedNodeName?: string;
}

const BIOME_LANDMASS_COLORS: Record<string, string> = {
    '아시아': '#14532d',
    '유럽': '#1e3a8a',
    '북아메리카': '#365314',
    '남아메리카': '#065f46',
    '아프리카': '#78350f',
    '오세아니아': '#0f766e',
    '마계': '#4c0519',
    '신계': '#4c1d95',
    '실바나르': '#064e3b',
    '페랄디아': '#7c2d12',
    '아비살론': '#3b0764'
};

const MORTAL_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg";
const DIVINE_MAP_URL = "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=85";

export const WorldAtlasCanvas: React.FC<WorldAtlasCanvasProps> = ({
    nodes,
    realm,
    viewLevel,
    zoom,
    pan,
    onPanChange,
    onZoomChange,
    onSelectNode,
    currentNodeName,
    selectedNodeName
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ w: 960, h: 560 });
    const [hoveredName, setHoveredName] = useState<string | null>(null);
    const mortalBgRef = useRef<HTMLImageElement | null>(null);
    const divineBgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const mImg = new Image();
        mImg.crossOrigin = 'anonymous';
        mImg.src = MORTAL_MAP_URL;
        mortalBgRef.current = mImg;

        const dImg = new Image();
        dImg.crossOrigin = 'anonymous';
        dImg.src = DIVINE_MAP_URL;
        divineBgRef.current = dImg;
    }, []);
    const dragRef = useRef<{ active: boolean; startX: number; startY: number; origPanX: number; origPanY: number; moved: boolean }>({
        active: false,
        startX: 0,
        startY: 0,
        origPanX: 0,
        origPanY: 0,
        moved: false
    });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Map 0..100 coordinate to screen px
    const toScreen = (nx: number, ny: number) => {
        const cx = size.w / 2;
        const cy = size.h / 2;
        const baseW = size.w * 0.86;
        const baseH = size.h * 0.82;
        const wx = ((nx - 50) / 100) * baseW;
        const wy = ((ny - 50) / 100) * baseH;
        return {
            x: cx + wx * zoom + pan.x,
            y: cy + wy * zoom + pan.y
        };
    };

    useEffect(() => {
        let rafId = 0;
        const render = (now: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                const w = size.w;
                const h = size.h;
                ctx.clearRect(0, 0, w, h);

                // 1. Background Ocean / Astral Sea
                const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.75);
                if (realm === 'divine') {
                    bg.addColorStop(0, '#1e1b4b');
                    bg.addColorStop(0.6, '#0f172a');
                    bg.addColorStop(1, '#020617');
                } else {
                    bg.addColorStop(0, '#0c2340');
                    bg.addColorStop(0.65, '#09192f');
                    bg.addColorStop(1, '#040b18');
                }
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);

                // 1-1. Draw existing World Map / Divine Map background aligned to 0..100 coordinate space
                const mapBgImg = realm === 'divine' ? divineBgRef.current : mortalBgRef.current;
                if (mapBgImg && mapBgImg.complete && mapBgImg.naturalWidth > 0) {
                    const topLeft = toScreen(0, 0);
                    const botRight = toScreen(100, 100);
                    ctx.save();
                    if (realm === 'divine') {
                        ctx.globalAlpha = 0.72;
                    } else {
                        ctx.globalAlpha = 0.28;
                        ctx.filter = 'invert(1) sepia(0.35) hue-rotate(155deg) saturate(1.4)';
                    }
                    ctx.drawImage(
                        mapBgImg,
                        topLeft.x,
                        topLeft.y,
                        botRight.x - topLeft.x,
                        botRight.y - topLeft.y
                    );
                    ctx.restore();
                }

                // Subtle Nautical / Astral Latitude-Longitude Grid
                ctx.strokeStyle = realm === 'divine' ? 'rgba(167, 139, 250, 0.08)' : 'rgba(56, 189, 248, 0.07)';
                ctx.lineWidth = 1;
                for (let g = 10; g <= 90; g += 10) {
                    const pH = toScreen(0, g);
                    ctx.beginPath();
                    ctx.moveTo(0, pH.y);
                    ctx.lineTo(w, pH.y);
                    ctx.stroke();

                    const pV = toScreen(g, 0);
                    ctx.beginPath();
                    ctx.moveTo(pV.x, 0);
                    ctx.lineTo(pV.x, h);
                    ctx.stroke();
                }

                // 2. Decorative Landmass Silhouettes behind nodes
                nodes.forEach((n, idx) => {
                    const p = toScreen(n.x, n.y);
                    const baseColor = BIOME_LANDMASS_COLORS[n.name] || (realm === 'divine' ? '#312e81' : '#1e3a2f');
                    const radius = (viewLevel === 'world' ? 48 : viewLevel === 'continent' ? 32 : 24) * Math.min(2.2, Math.max(0.8, zoom * 0.7));
                    const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.15, p.x, p.y, radius * 1.45);
                    grad.addColorStop(0, `${baseColor}cc`);
                    grad.addColorStop(0.65, `${baseColor}55`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, radius * 1.4, radius * (0.95 + (idx % 3) * 0.12), (idx % 4) * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 3. Connecting Routes (Nearest neighbor network)
                ctx.lineWidth = 1.4;
                for (let i = 0; i < nodes.length; i++) {
                    const a = nodes[i];
                    const pa = toScreen(a.x, a.y);
                    // Connect each node to its closest 2 neighbors
                    const neighbors = nodes
                        .map((b, j) => ({ b, j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
                        .filter(item => item.j > i)
                        .sort((x, y) => x.d - y.d)
                        .slice(0, 2);

                    neighbors.forEach(({ b }) => {
                        const pb = toScreen(b.x, b.y);
                        const isSea = a.isIsland || b.isIsland || viewLevel === 'world';
                        ctx.save();
                        ctx.strokeStyle = realm === 'divine'
                            ? 'rgba(192, 132, 252, 0.25)'
                            : isSea
                                ? 'rgba(56, 189, 248, 0.24)'
                                : 'rgba(251, 191, 36, 0.24)';
                        if (isSea) ctx.setLineDash([6, 5]);
                        ctx.beginPath();
                        ctx.moveTo(pa.x, pa.y);
                        ctx.lineTo(pb.x, pb.y);
                        ctx.stroke();
                        ctx.restore();
                    });
                }

                // 4. Active Route Highlight (Current -> Selected)
                const curNode = nodes.find(n => n.name === currentNodeName || n.isCurrent);
                const selNode = nodes.find(n => n.name === selectedNodeName || n.isSelected);
                if (curNode && selNode && curNode.name !== selNode.name) {
                    const p1 = toScreen(curNode.x, curNode.y);
                    const p2 = toScreen(selNode.x, selNode.y);
                    ctx.save();
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 6]);
                    ctx.lineDashOffset = -(now * 0.04);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    ctx.restore();
                }

                // 5. Nodes & Animated Markers
                nodes.forEach(n => {
                    const p = toScreen(n.x, n.y);
                    const isHover = hoveredName === n.name;
                    const isSel = n.isSelected || n.name === selectedNodeName;
                    const isCur = n.isCurrent || n.name === currentNodeName;
                    const pulse = 0.65 + 0.35 * Math.sin(now * 0.005 + n.x);

                    // Boss Rift Vortex
                    if (n.hasRift) {
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(now * 0.002);
                        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.arc(0, 0, 20, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }

                    // Current Location Pulse
                    if (isCur) {
                        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.5})`;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 16 + pulse * 6, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    // Node Circle
                    const r = isSel || isHover ? 11 : n.tier === 'Capital' ? 10 : 8;
                    ctx.fillStyle = isCur
                        ? '#38bdf8'
                        : isSel
                            ? '#fbbf24'
                            : n.hasRift
                                ? '#f43f5e'
                                : n.hasInstantDungeon
                                    ? '#a855f7'
                                    : n.tier === 'Capital'
                                        ? '#f59e0b'
                                        : '#cbd5e1';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Badges (Dungeon / BlackMarket / Favorite)
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    if (n.isFavorite) ctx.fillText('⭐', p.x + 13, p.y - 10);
                    if (n.hasInstantDungeon) ctx.fillText('🌀', p.x - 14, p.y - 10);
                    if (n.hasBlackMarket) ctx.fillText('🕶️', p.x + 14, p.y + 12);

                    // Label Pill
                    ctx.font = isSel || isCur || isHover ? 'bold 11px sans-serif' : '10px sans-serif';
                    const tw = Math.max(46, ctx.measureText(n.name).width + 12);
                    ctx.fillStyle = isSel ? 'rgba(120, 53, 15, 0.92)' : 'rgba(15, 23, 42, 0.86)';
                    ctx.beginPath();
                    ctx.roundRect(p.x - tw / 2, p.y + 14, tw, 18, 4);
                    ctx.fill();
                    ctx.strokeStyle = isSel ? '#fbbf24' : isCur ? '#38bdf8' : 'rgba(148, 163, 184, 0.35)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = isSel ? '#fef08a' : isCur ? '#bae6fd' : '#f1f5f9';
                    ctx.fillText(n.name, p.x, p.y + 26);
                });

                // 6. Compass Rose Overlay (Top-Right)
                const cx = w - 42;
                const cy = 42;
                ctx.save();
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, 20, 0, Math.PI * 2);
                ctx.stroke();
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#fbbf24';
                ctx.textAlign = 'center';
                ctx.fillText('N', cx, cy - 23);
                ctx.restore();
            }
            rafId = requestAnimationFrame(render);
        };
        rafId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafId);
    }, [nodes, realm, viewLevel, zoom, pan, size, hoveredName, currentNodeName, selectedNodeName]);

    const findNodeAt = (clientX: number, clientY: number): AtlasNode | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        for (let i = nodes.length - 1; i >= 0; i--) {
            const p = toScreen(nodes[i].x, nodes[i].y);
            if (Math.hypot(mx - p.x, my - p.y) <= 22) {
                return nodes[i];
            }
        }
        return null;
    };

    return (
        <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                className="w-full h-full cursor-grab active:cursor-grabbing block"
                onMouseDown={e => {
                    dragRef.current = {
                        active: true,
                        startX: e.clientX,
                        startY: e.clientY,
                        origPanX: pan.x,
                        origPanY: pan.y,
                        moved: false
                    };
                }}
                onMouseMove={e => {
                    if (dragRef.current.active) {
                        const dx = e.clientX - dragRef.current.startX;
                        const dy = e.clientY - dragRef.current.startY;
                        if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
                        onPanChange({ x: dragRef.current.origPanX + dx, y: dragRef.current.origPanY + dy });
                    } else {
                        const hit = findNodeAt(e.clientX, e.clientY);
                        setHoveredName(hit ? hit.name : null);
                    }
                }}
                onMouseUp={e => {
                    const wasMoved = dragRef.current.moved;
                    dragRef.current.active = false;
                    if (!wasMoved) {
                        const hit = findNodeAt(e.clientX, e.clientY);
                        if (hit) onSelectNode(hit);
                    }
                }}
                onMouseLeave={() => {
                    dragRef.current.active = false;
                    setHoveredName(null);
                }}
                onWheel={e => {
                    e.preventDefault();
                    const next = Math.max(0.7, Math.min(3.2, zoom + (e.deltaY < 0 ? 0.15 : -0.15)));
                    onZoomChange(Number(next.toFixed(2)));
                }}
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 pointer-events-none">
                드래그: 지도 이동 · 휠: 줌 ({Math.round(zoom * 100)}%) · 노드 클릭: 선택/진입
            </div>
        </div>
    );
};

export default WorldAtlasCanvas;
