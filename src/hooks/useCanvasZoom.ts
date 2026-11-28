import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.4;
const ZOOM_STORAGE_KEY = 'shinryoku_canvas_zoom';

const clampZoom = (val: number): number => Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, val)) * 100) / 100;

const readInitialZoom = (): number => {
    try {
        const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
        if (saved) {
            const parsed = parseFloat(saved);
            if (!Number.isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
                return clampZoom(parsed);
            }
        }
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
            return 0.85;
        }
    } catch {
        // ignore
    }
    return 1.0;
};

export const useCanvasZoom = () => {
    const [zoom, setZoomState] = useState<number>(readInitialZoom);
    const zoomRef = useRef<number>(zoom);
    const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

    const setZoom = useCallback((next: number | ((prev: number) => number)) => {
        setZoomState(prev => {
            const resolved = clampZoom(typeof next === 'function' ? next(prev) : next);
            zoomRef.current = resolved;
            try {
                localStorage.setItem(ZOOM_STORAGE_KEY, String(resolved));
            } catch {
                // ignore
            }
            return resolved;
        });
    }, []);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    const zoomIn = useCallback(() => setZoom(z => z + 0.1), [setZoom]);
    const zoomOut = useCallback(() => setZoom(z => z - 0.1), [setZoom]);
    const resetZoom = useCallback(() => setZoom(typeof window !== 'undefined' && window.innerWidth < 640 ? 0.85 : 1.0), [setZoom]);

    const onTouchStartPinch = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchRef.current = { startDist: Math.hypot(dx, dy), startZoom: zoomRef.current };
        }
    }, []);

    const onTouchMovePinch = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2 && pinchRef.current && pinchRef.current.startDist > 10) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const next = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
                setZoom(next);
            }
        },
        [setZoom]
    );

    const onTouchEndPinch = useCallback(() => {
        pinchRef.current = null;
    }, []);

    return {
        zoom,
        zoomRef,
        zoomIn,
        zoomOut,
        resetZoom,
        pinchHandlers: {
            onTouchStart: onTouchStartPinch,
            onTouchMove: onTouchMovePinch,
            onTouchEnd: onTouchEndPinch,
            onTouchCancel: onTouchEndPinch,
        },
    };
};

export const CanvasZoomControls: React.FC<{
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    className?: string;
}> = ({ zoom, onZoomIn, onZoomOut, onReset, className = 'top-2.5 right-2.5' }) => (
    <div className={`absolute z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-slate-950/85 border border-slate-700/80 backdrop-blur-sm shadow-lg ${className}`}>
        <button
            type="button"
            onClick={onZoomOut}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title="축소"
        >
            <Minus size={12} />
        </button>
        <button
            type="button"
            onClick={onReset}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
            title="줌 초기화"
        >
            <span>{Math.round(zoom * 100)}%</span>
            <RotateCcw size={9} className="opacity-70" />
        </button>
        <button
            type="button"
            onClick={onZoomIn}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title="확대"
        >
            <Plus size={12} />
        </button>
    </div>
);
