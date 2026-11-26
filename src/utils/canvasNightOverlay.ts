import { parseHour } from '../services/facilityOperatingService';

export interface NightLightPoint {
    x: number;
    y: number;
    radius?: number;
    color?: string;
}

export interface CanvasNightOverlayOptions {
    isIndoor?: boolean;
    playerLight?: NightLightPoint | null;
    extraLights?: NightLightPoint[];
}

export function isNightTime(currentTime?: string): boolean {
    const h = parseHour(currentTime);
    return h >= 20 || h < 6;
}

/**
 * 모든 RPG 캔버스에 일관된 야간/저녁 어둠 효과와 따뜻한 등불/플레이어 광원을 적용합니다.
 */
export function drawCanvasNightOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    currentTime?: string,
    options?: CanvasNightOverlayOptions
): void {
    const h = parseHour(currentTime);
    const isIndoor = Boolean(options?.isIndoor);

    if (h >= 20 || h < 6) {
        const isDeep = h >= 0 && h < 5;
        const alpha = isIndoor ? (isDeep ? 0.36 : 0.30) : (isDeep ? 0.52 : 0.44);
        ctx.fillStyle = `rgba(8, 12, 36, ${alpha})`;
        ctx.fillRect(x, y, width, height);

        const lights: NightLightPoint[] = [];
        if (options?.playerLight) lights.push(options.playerLight);
        if (options?.extraLights?.length) lights.push(...options.extraLights);

        if (lights.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const lt of lights) {
                const r = lt.radius ?? 90;
                const grad = ctx.createRadialGradient(lt.x, lt.y, 4, lt.x, lt.y, r);
                grad.addColorStop(0, lt.color ?? 'rgba(254, 243, 199, 0.24)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(lt.x, lt.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    } else if (h >= 17 && h < 20) {
        ctx.fillStyle = `rgba(190, 60, 40, ${isIndoor ? 0.08 : 0.14})`;
        ctx.fillRect(x, y, width, height);
    }
}
