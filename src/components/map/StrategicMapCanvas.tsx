import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { WORLD_GEOGRAPHY } from '../../constants';
import { GEO_POSITIONS } from '../MapModal';

export const getNationRegionAndPos = (nationName: string): { region: string; x: number; y: number } => {
    let foundRegion = '기타';
    for (const rName of Object.keys(WORLD_GEOGRAPHY)) {
        if (WORLD_GEOGRAPHY[rName]?.[nationName]) {
            foundRegion = rName;
            break;
        }
    }
    const direct = GEO_POSITIONS[nationName];
    if (direct) return { region: foundRegion, x: direct.x, y: direct.y };
    const regPos = GEO_POSITIONS[foundRegion] || { x: 50, y: 50 };
    let hash = 0;
    for (let i = 0; i < nationName.length; i++) hash = (hash * 31 + nationName.charCodeAt(i)) | 0;
    const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
    return {
        region: foundRegion,
        x: Math.max(6, Math.min(94, regPos.x + Math.cos(angle) * 6)),
        y: Math.max(6, Math.min(94, regPos.y + Math.sin(angle) * 6))
    };
};

export const getTempleStrategicPos = (templeName: string, idx: number, total: number): { x: number; y: number } => {
    if (templeName === '신의 거처' || templeName === 'god') return { x: 50, y: 20 };
    const direct = GEO_POSITIONS[templeName];
    if (direct) return direct;
    const angle = ((idx / Math.max(1, total)) * Math.PI * 1.4) + Math.PI * 0.15;
    return {
        x: Math.max(12, Math.min(88, 50 + Math.cos(angle) * 34)),
        y: Math.max(28, Math.min(88, 54 + Math.sin(angle) * 28))
    };
};

export type StrategicFactionStatus =
    | 'origin'
    | 'alliance'
    | 'blessed'
    | 'neutral'
    | 'hostile'
    | 'corrupted'
    | 'war'
    | 'vassal'
    | 'subjugated';

export interface StrategicNode {
    id: string;
    name: string;
    region: string;
    x: number; // 0..100
    y: number; // 0..100
    status: StrategicFactionStatus;
    badge?: string;
    subLabel?: string;
    hasAlert?: boolean;
}

export interface StrategicArrow {
    fromId: string;
    toId: string;
    kind: 'war' | 'invasion' | 'bless' | 'selected';
    label?: string;
}

interface StrategicMapCanvasProps {
    nodes: StrategicNode[];
    arrows?: StrategicArrow[];
    selectedNodeId: string | null;
    onSelectNode: (node: StrategicNode) => void;
    realm?: 'mortal' | 'divine' | 'magye';
    title?: string;
    legendItems?: Array<{ status: StrategicFactionStatus; label: string }>;
}

const STATUS_COLORS: Record<StrategicFactionStatus, { fill: string; stroke: string; glow: string }> = {
    origin: { fill: '#06b6d4', stroke: '#cffafe', glow: 'rgba(6, 182, 212, 0.45)' },
    alliance: { fill: '#10b981', stroke: '#a7f3d0', glow: 'rgba(16, 185, 129, 0.35)' },
    blessed: { fill: '#10b981', stroke: '#a7f3d0', glow: 'rgba(16, 185, 129, 0.35)' },
    neutral: { fill: '#3b82f6', stroke: '#bfdbfe', glow: 'rgba(59, 130, 246, 0.28)' },
    hostile: { fill: '#f97316', stroke: '#fed7aa', glow: 'rgba(249, 115, 22, 0.38)' },
    corrupted: { fill: '#a855f7', stroke: '#e9d5ff', glow: 'rgba(168, 85, 247, 0.38)' },
    war: { fill: '#ef4444', stroke: '#fecaca', glow: 'rgba(239, 68, 68, 0.55)' },
    vassal: { fill: '#f59e0b', stroke: '#fde68a', glow: 'rgba(245, 158, 11, 0.4)' },
    subjugated: { fill: '#f59e0b', stroke: '#fde68a', glow: 'rgba(245, 158, 11, 0.4)' }
};

const ARROW_COLORS: Record<StrategicArrow['kind'], string> = {
    war: '#ef4444',
    invasion: '#f97316',
    bless: '#34d399',
    selected: '#fde047'
};

const MORTAL_MAP_URL = 'https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg';

export const StrategicMapCanvas: React.FC<StrategicMapCanvasProps> = ({
    nodes,
    arrows = [],
    selectedNodeId,
    onSelectNode,
    realm = 'mortal',
    title,
    legendItems
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ w: 640, h: 460 });
    const [regionFilter, setRegionFilter] = useState<string>('ALL');
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const worldSvgRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number; moved: boolean }>({
        active: false,
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
        moved: false
    });

    useEffect(() => {
        if (realm === 'mortal') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = MORTAL_MAP_URL;
            worldSvgRef.current = img;
        }
    }, [realm]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const regions = useMemo(() => {
        const set = new Set<string>();
        nodes.forEach((n) => {
            if (n.region && n.region !== 'ORIGIN') set.add(n.region);
        });
        return Array.from(set);
    }, [nodes]);

    const visibleNodes = useMemo(() => {
        if (regionFilter === 'ALL') return nodes;
        return nodes.filter((n) => n.region === regionFilter || n.status === 'origin');
    }, [nodes, regionFilter]);

    const focusRegion = (reg: string) => {
        setRegionFilter(reg);
        if (reg === 'ALL') {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            return;
        }
        const regNodes = nodes.filter((n) => n.region === reg);
        if (regNodes.length === 0) return;
        const avgX = regNodes.reduce((s, n) => s + n.x, 0) / regNodes.length;
        const avgY = regNodes.reduce((s, n) => s + n.y, 0) / regNodes.length;
        const nextZoom = 1.85;
        const baseW = size.w * 0.86;
        const baseH = size.h * 0.82;
        const wx = ((avgX - 50) / 100) * baseW;
        const wy = ((avgY - 50) / 100) * baseH;
        setZoom(nextZoom);
        setPan({ x: -wx * nextZoom, y: -wy * nextZoom });
    };

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
                const { w, h } = size;
                if (canvas.width !== w || canvas.height !== h) {
                    canvas.width = w;
                    canvas.height = h;
                }

                // Background
                const bg = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, Math.max(w, h) * 0.78);
                if (realm === 'divine') {
                    bg.addColorStop(0, '#1e1b4b');
                    bg.addColorStop(0.65, '#0f172a');
                    bg.addColorStop(1, '#020617');
                } else if (realm === 'magye') {
                    bg.addColorStop(0, '#2a0815');
                    bg.addColorStop(0.65, '#120714');
                    bg.addColorStop(1, '#050208');
                } else {
                    bg.addColorStop(0, '#0b223d');
                    bg.addColorStop(0.65, '#071426');
                    bg.addColorStop(1, '#030812');
                }
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);

                // Tactical Grid
                ctx.strokeStyle = realm === 'magye' ? 'rgba(239, 68, 68, 0.08)' : realm === 'divine' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(56, 189, 248, 0.07)';
                ctx.lineWidth = 1;
                const step = 44;
                for (let gx = (pan.x % step + step) % step; gx < w; gx += step) {
                    ctx.beginPath();
                    ctx.moveTo(gx, 0);
                    ctx.lineTo(gx, h);
                    ctx.stroke();
                }
                for (let gy = (pan.y % step + step) % step; gy < h; gy += step) {
                    ctx.beginPath();
                    ctx.moveTo(0, gy);
                    ctx.lineTo(w, gy);
                    ctx.stroke();
                }

                // World Silhouette for mortal map
                if (realm === 'mortal' && worldSvgRef.current && worldSvgRef.current.complete && worldSvgRef.current.naturalWidth > 0) {
                    const topLeft = toScreen(0, 0);
                    const botRight = toScreen(100, 100);
                    ctx.save();
                    ctx.globalAlpha = 0.16;
                    ctx.filter = 'invert(1) sepia(0.3) hue-rotate(170deg)';
                    ctx.drawImage(
                        worldSvgRef.current,
                        topLeft.x,
                        topLeft.y,
                        botRight.x - topLeft.x,
                        botRight.y - topLeft.y
                    );
                    ctx.restore();
                }

                const nodeById = new Map<string, StrategicNode>();
                nodes.forEach((n) => nodeById.set(n.id, n));

                // Draw March / Diplomacy Arrows
                const dashOffset = -(now / 30) % 24;
                arrows.forEach((arr) => {
                    const from = nodeById.get(arr.fromId);
                    const to = nodeById.get(arr.toId);
                    if (!from || !to) return;
                    const p1 = toScreen(from.x, from.y);
                    const p2 = toScreen(to.x, to.y);
                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2 - Math.min(60, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.22);
                    const color = ARROW_COLORS[arr.kind];

                    ctx.save();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = arr.kind === 'selected' ? 3 : 2.2;
                    ctx.setLineDash([10, 6]);
                    ctx.lineDashOffset = dashOffset;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
                    ctx.stroke();

                    // Arrowhead near p2
                    const angle = Math.atan2(p2.y - my, p2.x - mx);
                    const tipX = p2.x - Math.cos(angle) * 14;
                    const tipY = p2.y - Math.sin(angle) * 14;
                    ctx.setLineDash([]);
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - Math.cos(angle - 0.45) * 11, tipY - Math.sin(angle - 0.45) * 11);
                    ctx.lineTo(tipX - Math.cos(angle + 0.45) * 11, tipY - Math.sin(angle + 0.45) * 11);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });

                // Draw Nodes
                visibleNodes.forEach((n) => {
                    const { x, y } = toScreen(n.x, n.y);
                    const palette = STATUS_COLORS[n.status] || STATUS_COLORS.neutral;
                    const isSelected = n.id === selectedNodeId;
                    const isHovered = n.id === hoveredId;
                    const baseR = n.status === 'origin' ? 11 : isSelected ? 11 : 8;

                    // Territory Halo
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, baseR * (isSelected ? 2.5 : 1.9), 0, Math.PI * 2);
                    ctx.fillStyle = palette.glow;
                    ctx.fill();

                    if (n.hasAlert || n.status === 'war' || isSelected) {
                        const pulse = 1 + Math.sin(now / 280) * 0.25;
                        ctx.beginPath();
                        ctx.arc(x, y, baseR * 1.9 * pulse, 0, Math.PI * 2);
                        ctx.strokeStyle = isSelected ? '#fde047' : palette.fill;
                        ctx.lineWidth = isSelected ? 2.2 : 1.4;
                        ctx.stroke();
                    }

                    // Core Circle
                    ctx.beginPath();
                    ctx.arc(x, y, baseR, 0, Math.PI * 2);
                    ctx.fillStyle = palette.fill;
                    ctx.fill();
                    ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.6;
                    ctx.strokeStyle = isSelected ? '#fde047' : palette.stroke;
                    ctx.stroke();

                    // Label
                    ctx.font = isSelected || isHovered || n.status === 'origin' ? 'bold 11px sans-serif' : '600 10px sans-serif';
                    const label = n.status === 'origin' ? `★ ${n.name}` : n.name;
                    const tw = ctx.measureText(label).width;
                    ctx.fillStyle = isSelected ? 'rgba(250, 204, 21, 0.94)' : 'rgba(2, 6, 23, 0.84)';
                    ctx.fillRect(x - tw / 2 - 5, y + baseR + 4, tw + 10, 16);
                    ctx.fillStyle = isSelected ? '#0f172a' : '#f1f5f9';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, x, y + baseR + 15);

                    if (n.badge) {
                        ctx.font = 'bold 9px sans-serif';
                        ctx.fillStyle = '#fde047';
                        ctx.fillText(n.badge, x, y - baseR - 5);
                    }
                    ctx.restore();
                });
            }

            rafId = requestAnimationFrame(render);
        };
        rafId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafId);
    }, [size, nodes, visibleNodes, arrows, selectedNodeId, hoveredId, zoom, pan, realm]);

    const pickNodeAt = (clientX: number, clientY: number): StrategicNode | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        let best: StrategicNode | null = null;
        let bestDist = 24;
        for (const n of visibleNodes) {
            const p = toScreen(n.x, n.y);
            const d = Math.hypot(mx - p.x, my - p.y);
            if (d < bestDist) {
                bestDist = d;
                best = n;
            }
        }
        return best;
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-950 select-none overflow-hidden">
            {/* Top Filter & Zoom Controls */}
            <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                    {title && <span className="text-[11px] font-black text-slate-300 mr-1 shrink-0">{title}</span>}
                    {regions.length > 1 && (
                        <>
                            <button
                                onClick={() => focusRegion('ALL')}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                                    regionFilter === 'ALL'
                                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                전체
                            </button>
                            {regions.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => focusRegion(r)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                                        regionFilter === r
                                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.35).toFixed(2))))}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        title="확대"
                    >
                        <ZoomIn size={13} />
                    </button>
                    <button
                        onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.35).toFixed(2))))}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        title="축소"
                    >
                        <ZoomOut size={13} />
                    </button>
                    <button
                        onClick={() => {
                            setRegionFilter('ALL');
                            setZoom(1);
                            setPan({ x: 0, y: 0 });
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        title="초기화"
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="relative flex-1 min-h-[260px] sm:min-h-[340px] overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                        dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y, moved: false };
                    }}
                    onMouseMove={(e) => {
                        if (dragRef.current.active) {
                            const dx = e.clientX - dragRef.current.startX;
                            const dy = e.clientY - dragRef.current.startY;
                            if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
                            setPan({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                        } else {
                            const hit = pickNodeAt(e.clientX, e.clientY);
                            setHoveredId(hit?.id || null);
                        }
                    }}
                    onMouseUp={(e) => {
                        const wasMoved = dragRef.current.moved;
                        dragRef.current.active = false;
                        if (!wasMoved) {
                            const hit = pickNodeAt(e.clientX, e.clientY);
                            if (hit && hit.status !== 'origin') onSelectNode(hit);
                        }
                    }}
                    onMouseLeave={() => {
                        dragRef.current.active = false;
                        setHoveredId(null);
                    }}
                    onWheel={(e) => {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 0.2 : -0.2;
                        setZoom((z) => Math.max(0.7, Math.min(3.5, Number((z + delta).toFixed(2)))));
                    }}
                />

                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 border border-slate-800 text-[10px] text-slate-300 pointer-events-none">
                    국가/성전 노드 클릭 시 작전·외교 실행 · 드래그 이동 / 휠 확대
                </div>
            </div>

            {/* Legend */}
            {legendItems && legendItems.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 shrink-0">
                    {legendItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: STATUS_COLORS[item.status].fill }}
                            />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StrategicMapCanvas;
