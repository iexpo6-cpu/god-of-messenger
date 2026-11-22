/**
 * 몬스터 실제 visualUrl 이미지 전장 렌더링 캐시 & 안전 투명화 엔진
 * - 이미 투명 채널이 있는 PNG: 100% 원본 투명 컷아웃 그대로 사용
 * - 단색 스튜디오(순백/그린스크린) 배경: 엄격한 외곽 분산 검증 + 중앙 침투 방지 검사 통과 시에만 투명화
 * - 수호해태 등 풀 채색 판타지 일러스트(어두운 배경 + 어두운 털/갑옷):
 *   단순 RGB 플러드필은 몬스터 본체를 파먹으므로 절대 사용하지 않고,
 *   원본 일러스트를 100% 보존하는 BG3 고급 원형 미니어처 메달(isCutout: false)로 렌더링!
 */

export interface CachedMonsterSprite {
    source: HTMLCanvasElement | HTMLImageElement;
    isCutout: boolean;
    width: number;
    height: number;
}

const cutoutCache = new Map<string, CachedMonsterSprite | 'loading' | 'error'>();

const resolveMonsterUrl = (rawUrl: string): string => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return '';
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${cleanBase}${cleanPath}`;
};

const analyzeAndPrepareMonster = (img: HTMLImageElement): CachedMonsterSprite => {
    const natW = img.naturalWidth || 128;
    const natH = img.naturalHeight || 128;
    const maxDim = 256;
    const scale = Math.min(1, maxDim / Math.max(1, natW, natH));
    const w = Math.max(16, Math.round(natW * scale));
    const h = Math.max(16, Math.round(natH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { source: img, isCutout: false, width: natW, height: natH };

    ctx.drawImage(img, 0, 0, w, h);

    let imgData: ImageData;
    try {
        imgData = ctx.getImageData(0, 0, w, h);
    } catch {
        // Cross-origin without CORS headers -> ornate circular BG3 token
        return { source: img, isCutout: false, width: natW, height: natH };
    }

    const data = imgData.data;

    // 1. 이미 진짜 투명 배경(Alpha PNG)인 경우: 그대로 투명 컷아웃 사용!
    const cornerIndices = [
        0,
        (w - 1) * 4,
        (h - 1) * w * 4,
        ((h - 1) * w + (w - 1)) * 4
    ];
    const transparentCorners = cornerIndices.filter(idx => data[idx + 3] < 24).length;
    if (transparentCorners >= 3) {
        return { source: canvas, isCutout: true, width: w, height: h };
    }

    // 2. 순백(#F0F0F0 이상) 단색 스튜디오 배경인지 엄격하게 검증
    // (어두운/복합 판타지 일러스트는 절대 플러드필로 파먹지 않음!)
    const cColors = cornerIndices.map(idx => [data[idx], data[idx + 1], data[idx + 2]]);
    const allPureWhite = cColors.every(([r, g, b]) => r >= 236 && g >= 236 && b >= 236);
    if (!allPureWhite) {
        return { source: img, isCutout: false, width: natW, height: natH };
    }

    // 순백 배경만 보수적으로 제거 (tolerance = 24)
    const visited = new Uint8Array(w * h);
    const removed = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const tryPush = (x: number, y: number) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        const p = y * w + x;
        if (visited[p]) return;
        visited[p] = 1;
        const i = p * 4;
        if (data[i] >= 232 && data[i + 1] >= 232 && data[i + 2] >= 232) {
            removed[p] = 1;
            queue[tail++] = p;
        }
    };

    for (let x = 0; x < w; x++) {
        tryPush(x, 0);
        tryPush(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
        tryPush(0, y);
        tryPush(w - 1, y);
    }

    while (head < tail) {
        const p = queue[head++];
        const x = p % w;
        const y = (p - x) / w;
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
    }

    // 중앙 36% 핵심 영역이 파먹혔다면 즉시 취소하고 원본 메달 토큰 사용!
    const cx0 = Math.floor(w * 0.32), cx1 = Math.floor(w * 0.68);
    const cy0 = Math.floor(h * 0.32), cy1 = Math.floor(h * 0.68);
    let centerRemoved = 0;
    let centerTotal = 0;
    for (let y = cy0; y < cy1; y++) {
        for (let x = cx0; x < cx1; x++) {
            centerTotal++;
            if (removed[y * w + x]) centerRemoved++;
        }
    }
    if (centerTotal > 0 && centerRemoved / centerTotal > 0.12) {
        return { source: img, isCutout: false, width: natW, height: natH };
    }

    for (let p = 0; p < w * h; p++) {
        if (removed[p]) data[p * 4 + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
    return { source: canvas, isCutout: true, width: w, height: h };
};

export const getCachedMonsterSprite = (rawUrl?: string): CachedMonsterSprite | null => {
    if (!rawUrl) return null;
    const entry = cutoutCache.get(rawUrl);
    if (!entry || entry === 'loading' || entry === 'error') return null;
    return entry;
};

export const loadTransparentMonsterSprite = (rawUrl?: string): Promise<CachedMonsterSprite | null> => {
    if (!rawUrl) return Promise.resolve(null);
    const existing = cutoutCache.get(rawUrl);
    if (existing === 'error') return Promise.resolve(null);
    if (existing && existing !== 'loading') return Promise.resolve(existing);

    const url = resolveMonsterUrl(rawUrl);
    if (!url) return Promise.resolve(null);

    cutoutCache.set(rawUrl, 'loading');
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const processed = analyzeAndPrepareMonster(img);
            cutoutCache.set(rawUrl, processed);
            resolve(processed);
        };
        img.onerror = () => {
            const retryImg = new Image();
            retryImg.onload = () => {
                const fallback: CachedMonsterSprite = {
                    source: retryImg,
                    isCutout: false,
                    width: retryImg.naturalWidth || 128,
                    height: retryImg.naturalHeight || 128
                };
                cutoutCache.set(rawUrl, fallback);
                resolve(fallback);
            };
            retryImg.onerror = () => {
                cutoutCache.set(rawUrl, 'error');
                resolve(null);
            };
            retryImg.src = url;
        };
        img.src = url;
    });
};
