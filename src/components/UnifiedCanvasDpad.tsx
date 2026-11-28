import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { SpriteDirection } from '../services/rpgSpriteManifest';

export interface DpadVector {
    vx: number;
    vy: number;
    dir: SpriteDirection | null;
}

export type DpadSizePreset = 'small' | 'medium' | 'large';
export type DpadOpacityPreset = 'solid' | 'translucent';

interface UnifiedCanvasDpadProps {
    dpadDirRef?: React.MutableRefObject<SpriteDirection | null>;
    dpadVectorRef?: React.MutableRefObject<{ vx: number; vy: number }>;
    onInteract: () => void;
    className?: string;
}

const SIZE_CLASSES: Record<DpadSizePreset, string> = {
    small: 'w-28 h-28',
    medium: 'w-36 h-36 sm:w-40 sm:h-40',
    large: 'w-44 h-44 sm:w-48 sm:h-48',
};

const readDpadSettings = (): { visible: boolean; size: DpadSizePreset; opacity: DpadOpacityPreset } => {
    try {
        const visible = localStorage.getItem('shinryoku_show_dpad') !== 'false';
        const rawSize = localStorage.getItem('shinryoku_dpad_size');
        const size: DpadSizePreset = rawSize === 'small' || rawSize === 'large' ? rawSize : 'medium';
        const rawOp = localStorage.getItem('shinryoku_dpad_opacity');
        const opacity: DpadOpacityPreset = rawOp === 'translucent' ? 'translucent' : 'solid';
        return { visible, size, opacity };
    } catch {
        return { visible: true, size: 'medium', opacity: 'solid' };
    }
};

export const UnifiedCanvasDpad: React.FC<UnifiedCanvasDpadProps> = ({
    dpadDirRef,
    dpadVectorRef,
    onInteract,
    className = 'bottom-4 left-4',
}) => {
    const [settings, setSettings] = useState(readDpadSettings);
    const [activeDir, setActiveDir] = useState<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    useEffect(() => {
        const sync = () => setSettings(readDpadSettings());
        window.addEventListener('shinryoku-canvas-controls-change', sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('shinryoku-canvas-controls-change', sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const applyVector = useCallback(
        (vx: number, vy: number) => {
            if (dpadVectorRef) {
                dpadVectorRef.current = { vx, vy };
            }
            if (dpadDirRef) {
                if (vx === 0 && vy === 0) {
                    dpadDirRef.current = null;
                } else if (Math.abs(vx) > Math.abs(vy)) {
                    dpadDirRef.current = vx < 0 ? 'left' : 'right';
                } else {
                    dpadDirRef.current = vy < 0 ? 'up' : 'down';
                }
            }
            setActiveDir({ vx, vy });
        },
        [dpadDirRef, dpadVectorRef]
    );

    const updateFromPointer = useCallback(
        (clientX: number, clientY: number) => {
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = clientX - cx;
            const dy = clientY - cy;
            const dist = Math.hypot(dx, dy);
            const deadzone = rect.width * 0.14;
            if (dist < deadzone) {
                applyVector(0, 0);
                return;
            }
            // Quantize to 8 directions (45 deg sectors)
            const angle = Math.atan2(dy, dx);
            const sector = Math.round(angle / (Math.PI / 4));
            const norm = Math.SQRT1_2;
            const map8: Record<number, [number, number]> = {
                0: [1, 0],
                1: [norm, norm],
                2: [0, 1],
                3: [-norm, norm],
                4: [-1, 0],
                [-4]: [-1, 0],
                [-3]: [-norm, -norm],
                [-2]: [0, -1],
                [-1]: [norm, -norm],
            };
            const [vx, vy] = map8[sector] || [0, 0];
            applyVector(vx, vy);
        },
        [applyVector]
    );

    const stopDrag = useCallback(() => {
        draggingRef.current = false;
        applyVector(0, 0);
    }, [applyVector]);

    if (!settings.visible) return null;

    const iconSize = settings.size === 'small' ? 18 : settings.size === 'large' ? 24 : 22;
    const opacityClass = settings.opacity === 'translucent' ? 'opacity-60' : 'opacity-90';

    return (
        <div
            ref={containerRef}
            onPointerDown={e => {
                if ((e.target as HTMLElement).closest('[data-dpad-confirm="true"]')) return;
                draggingRef.current = true;
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
                updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={e => {
                if (!draggingRef.current) return;
                updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            style={{ touchAction: 'none' }}
            className={`absolute z-20 grid grid-cols-3 gap-1.5 ${SIZE_CLASSES[settings.size]} ${opacityClass} select-none transition-all ${className}`}
        >
            <div />
            <button
                type="button"
                aria-label="위로 이동"
                className={`border border-slate-600/80 rounded-xl flex items-center justify-center text-white pointer-events-none ${
                    activeDir.vy < -0.3 ? 'bg-amber-600/85' : 'bg-slate-900/85'
                }`}
            >
                <ArrowUp size={iconSize} />
            </button>
            <div />
            <button
                type="button"
                aria-label="왼쪽 이동"
                className={`border border-slate-600/80 rounded-xl flex items-center justify-center text-white pointer-events-none ${
                    activeDir.vx < -0.3 ? 'bg-amber-600/85' : 'bg-slate-900/85'
                }`}
            >
                <ArrowLeft size={iconSize} />
            </button>
            <button
                type="button"
                data-dpad-confirm="true"
                onClick={e => {
                    e.stopPropagation();
                    onInteract();
                }}
                className="bg-amber-600/90 active:bg-amber-500 active:scale-95 border border-amber-300 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg cursor-pointer"
            >
                확인
            </button>
            <button
                type="button"
                aria-label="오른쪽 이동"
                className={`border border-slate-600/80 rounded-xl flex items-center justify-center text-white pointer-events-none ${
                    activeDir.vx > 0.3 ? 'bg-amber-600/85' : 'bg-slate-900/85'
                }`}
            >
                <ArrowRight size={iconSize} />
            </button>
            <div />
            <button
                type="button"
                aria-label="아래로 이동"
                className={`border border-slate-600/80 rounded-xl flex items-center justify-center text-white pointer-events-none ${
                    activeDir.vy > 0.3 ? 'bg-amber-600/85' : 'bg-slate-900/85'
                }`}
            >
                <ArrowDown size={iconSize} />
            </button>
            <div />
        </div>
    );
};

export default UnifiedCanvasDpad;
