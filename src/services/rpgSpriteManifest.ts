/**
 * 쯔꾸르(RPG Maker) 2D 필드용 지역별 남/여 캐릭터 스프라이트 매니페스트 & 안전 리졸버
 * - 규격: 144x192 PNG (3열 x 4행, 셀당 48x48)
 *   Row 0: 아래(DOWN), Row 1: 왼쪽(LEFT), Row 2: 오른쪽(RIGHT), Row 3: 위(UP)
 *   Col 0: 왼발, Col 1: 정지, Col 2: 오른발
 */

export type RpgSpriteRegionKey =
    | 'asia'
    | 'europe'
    | 'north_america'
    | 'south_america'
    | 'oceania'
    | 'africa'
    | 'magye'
    | 'shingye'
    | 'sylvanar'
    | 'feraldia'
    | 'abyssalon';

export type RpgSpriteGenderKey = 'male' | 'female';
export type SpriteDirection = 'down' | 'left' | 'right' | 'up';

export const DIRECTION_ROW_MAP: Record<SpriteDirection, number> = {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
};

export interface FallbackPalette {
    hair: string;
    skin: string;
    outfit: string;
    accent: string;
}

export const REGION_FALLBACK_PALETTE: Record<RpgSpriteRegionKey, FallbackPalette> = {
    asia: { hair: '#1e293b', skin: '#f7d6bc', outfit: '#1e3a8a', accent: '#f59e0b' },
    europe: { hair: '#92400e', skin: '#fce1cb', outfit: '#1d4ed8', accent: '#cbd5e1' },
    north_america: { hair: '#451a03', skin: '#f5cfb4', outfit: '#78350f', accent: '#38bdf8' },
    south_america: { hair: '#1c1917', skin: '#e0a97d', outfit: '#0f766e', accent: '#f97316' },
    oceania: { hair: '#713f12', skin: '#eab990', outfit: '#0284c7', accent: '#fef08a' },
    africa: { hair: '#0f172a', skin: '#9a633c', outfit: '#f8fafc', accent: '#eab308' },
    magye: { hair: '#cbd5e1', skin: '#e2e8f0', outfit: '#18181b', accent: '#dc2626' },
    shingye: { hair: '#fef08a', skin: '#fff1e6', outfit: '#f8fafc', accent: '#f59e0b' },
    sylvanar: { hair: '#d9f99d', skin: '#fce7d6', outfit: '#15803d', accent: '#a7f3d0' },
    feraldia: { hair: '#b45309', skin: '#e6b892', outfit: '#9a3412', accent: '#fde047' },
    abyssalon: { hair: '#c4b5fd', skin: '#d8dee9', outfit: '#312e81', accent: '#a855f7' },
};

export const mapRegionToSpriteKey = (region?: string, nation?: string): RpgSpriteRegionKey => {
    const r = (region || '').trim();
    const n = (nation || '').trim();

    if (r === '신계') return 'shingye';
    if (r === '마계' || n === '임페리얼 제국') return 'magye';
    if (r === '실바나르' || n === '미르탈 숲연합') return 'sylvanar';
    if (r === '페랄디아' || n === '레오니스 투기국') return 'feraldia';
    if (r === '아비살론' || n === '네크로디움 제국') return 'abyssalon';
    if (r === '유럽') return 'europe';
    if (r === '북아메리카') return 'north_america';
    if (r === '남아메리카') return 'south_america';
    if (r === '오세아니아') return 'oceania';
    if (r === '아프리카') return 'africa';
    return 'asia';
};

export const normalizeGenderKey = (gender?: string): RpgSpriteGenderKey => {
    const g = (gender || '').trim().toLowerCase();
    if (g === '여성' || g === '여자' || g === 'female' || g === 'f' || g === '여') {
        return 'female';
    }
    return 'male';
};

export interface RpgSpriteCatalogItem {
    key: string;
    regionKey: RpgSpriteRegionKey;
    gender: RpgSpriteGenderKey;
    label: string;
    tag: string;
}

export const RPG_SPRITE_CATALOG: RpgSpriteCatalogItem[] = [
    { key: 'asia_male', regionKey: 'asia', gender: 'male', label: '동양 무투가 (남)', tag: '인간계' },
    { key: 'asia_female', regionKey: 'asia', gender: 'female', label: '동양 모험가 (여)', tag: '인간계' },
    { key: 'europe_male', regionKey: 'europe', gender: 'male', label: '유럽 기사 (남)', tag: '인간계' },
    { key: 'europe_female', regionKey: 'europe', gender: 'female', label: '유럽 마도기사 (여)', tag: '인간계' },
    { key: 'north_america_male', regionKey: 'north_america', gender: 'male', label: '개척 헌터 (남)', tag: '인간계' },
    { key: 'north_america_female', regionKey: 'north_america', gender: 'female', label: '모던 레인저 (여)', tag: '인간계' },
    { key: 'south_america_male', regionKey: 'south_america', gender: 'male', label: '열대 탐험가 (남)', tag: '인간계' },
    { key: 'south_america_female', regionKey: 'south_america', gender: 'female', label: '남미 모험가 (여)', tag: '인간계' },
    { key: 'oceania_male', regionKey: 'oceania', gender: 'male', label: '해양 모험가 (남)', tag: '인간계' },
    { key: 'oceania_female', regionKey: 'oceania', gender: 'female', label: '해안 탐험가 (여)', tag: '인간계' },
    { key: 'africa_male', regionKey: 'africa', gender: 'male', label: '태양 전사 (남)', tag: '인간계' },
    { key: 'africa_female', regionKey: 'africa', gender: 'female', label: '태양 사제 (여)', tag: '인간계' },
    { key: 'shingye_male', regionKey: 'shingye', gender: 'male', label: '신계 성기사 (남)', tag: '신계' },
    { key: 'shingye_female', regionKey: 'shingye', gender: 'female', label: '신계 발키리 (여)', tag: '신계' },
    { key: 'magye_male', regionKey: 'magye', gender: 'male', label: '마계 흑기사 (남)', tag: '마계' },
    { key: 'magye_female', regionKey: 'magye', gender: 'female', label: '마계 귀족마도사 (여)', tag: '마계' },
    { key: 'sylvanar_male', regionKey: 'sylvanar', gender: 'male', label: '엘프 궁수 (남)', tag: '이종족' },
    { key: 'sylvanar_female', regionKey: 'sylvanar', gender: 'female', label: '엘프 정령사 (여)', tag: '이종족' },
    { key: 'feraldia_male', regionKey: 'feraldia', gender: 'male', label: '수인 검투사 (남)', tag: '이종족' },
    { key: 'feraldia_female', regionKey: 'feraldia', gender: 'female', label: '수인 격투가 (여)', tag: '이종족' },
    { key: 'abyssalon_male', regionKey: 'abyssalon', gender: 'male', label: '마족 암흑기사 (남)', tag: '이종족' },
    { key: 'abyssalon_female', regionKey: 'abyssalon', gender: 'female', label: '마족 흑마녀 (여)', tag: '이종족' },
];

export const HUMAN_GLOBAL_REGION_KEYS: RpgSpriteRegionKey[] = [
    'asia', 'europe', 'north_america', 'south_america', 'oceania', 'africa'
];

export const getRpgSpriteUrlByKey = (spriteKey: string): string => {
    const base = (import.meta as any).env?.BASE_URL || './';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}assets/visuals/sprites/${spriteKey}.png`;
};

const simpleHash = (str: string): number => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
};

export const pickRandomRpgSpriteKey = (gender?: string, pool: 'human' | 'all' = 'human'): string => {
    const gKey = normalizeGenderKey(gender);
    const candidates = RPG_SPRITE_CATALOG.filter(
        item => item.gender === gKey && (pool === 'all' || item.tag === '인간계')
    );
    const list = candidates.length > 0 ? candidates : RPG_SPRITE_CATALOG;
    return list[Math.floor(Math.random() * list.length)].key;
};

/**
 * 캐릭터/동료의 쯔꾸르 스프라이트 해석기:
 * 1) rpgSpriteKey가 직접 지정되어 있으면 어느 지역에 있든 유저가 선택한 스프라이트를 우선 적용
 * 2) 미지정(기존 세이브/동료)이면 지역에 정형화하지 않고 이름/ID 시드 기반으로 다양한 외형을 결정적 배정
 */
export const resolveEntityRpgSprite = (
    entity: { rpgSpriteKey?: string; id?: string; name?: string; gender?: string; race?: string },
    fallbackRegion?: string,
    fallbackNation?: string
): { key: string; url: string; regionKey: RpgSpriteRegionKey; genderKey: RpgSpriteGenderKey } => {
    if (entity.rpgSpriteKey) {
        const found = RPG_SPRITE_CATALOG.find(item => item.key === entity.rpgSpriteKey);
        if (found) {
            return {
                key: found.key,
                url: getRpgSpriteUrlByKey(found.key),
                regionKey: found.regionKey,
                genderKey: found.gender
            };
        }
    }

    const genderKey = normalizeGenderKey(entity.gender);
    const raceStr = (entity.race || '').toLowerCase();
    let regionKey: RpgSpriteRegionKey;

    if (raceStr.includes('엘프') || raceStr.includes('elf')) {
        regionKey = 'sylvanar';
    } else if (raceStr.includes('수인') || raceStr.includes('beast')) {
        regionKey = 'feraldia';
    } else if (raceStr.includes('마족') || raceStr.includes('demon') || raceStr.includes('언데드')) {
        regionKey = 'abyssalon';
    } else if (raceStr.includes('천사') || raceStr.includes('신족') || raceStr.includes('신')) {
        regionKey = 'shingye';
    } else {
        const seed = entity.id || entity.name || '';
        if (seed) {
            const idx = simpleHash(seed) % HUMAN_GLOBAL_REGION_KEYS.length;
            regionKey = HUMAN_GLOBAL_REGION_KEYS[idx];
        } else {
            regionKey = mapRegionToSpriteKey(fallbackRegion, fallbackNation);
        }
    }

    const key = `${regionKey}_${genderKey}`;
    return {
        key,
        url: getRpgSpriteUrlByKey(key),
        regionKey,
        genderKey
    };
};

export const getRpgSpriteAssetPath = (region?: string, gender?: string, nation?: string): string => {
    const regionKey = mapRegionToSpriteKey(region, nation);
    const genderKey = normalizeGenderKey(gender);
    return getRpgSpriteUrlByKey(`${regionKey}_${genderKey}`);
};

// 인메모리 스프라이트 이미지 캐시
const spriteImageCache = new Map<string, HTMLImageElement | 'error'>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

export const loadRpgSpriteImage = (url: string): Promise<HTMLImageElement | null> => {
    const cached = spriteImageCache.get(url);
    if (cached === 'error') return Promise.resolve(null);
    if (cached) return Promise.resolve(cached);

    const existing = loadingPromises.get(url);
    if (existing) return existing;

    const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            spriteImageCache.set(url, img);
            loadingPromises.delete(url);
            resolve(img);
        };
        img.onerror = () => {
            spriteImageCache.set(url, 'error');
            loadingPromises.delete(url);
            resolve(null);
        };
        img.src = url;
    });

    loadingPromises.set(url, p);
    return p;
};

export const getCachedRpgSpriteImage = (url: string): HTMLImageElement | null => {
    const cached = spriteImageCache.get(url);
    if (!cached || cached === 'error') return null;
    return cached;
};

/**
 * 스프라이트 로드 전/실패 시에도 깔끔한 16-bit 픽셀풍 치비 캐릭터를 렌더링하는 폴백 함수
 */
export const drawFallbackChibiSprite = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    footY: number,
    size: number,
    dir: SpriteDirection,
    walkFrame: number, // 0: 왼발, 1: 정지, 2: 오른발
    regionKey: RpgSpriteRegionKey,
    genderKey: RpgSpriteGenderKey
) => {
    const pal = REGION_FALLBACK_PALETTE[regionKey] || REGION_FALLBACK_PALETTE.asia;
    const bounce = walkFrame === 1 ? 0 : -2;
    const stepOffset = walkFrame === 0 ? -2.5 : walkFrame === 2 ? 2.5 : 0;

    ctx.save();
    ctx.translate(centerX, footY);

    // 발밑 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -2, size * 0.28, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bounce);

    // 다리 / 신발
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-size * 0.14 + stepOffset * 0.4, -size * 0.22, size * 0.11, size * 0.18);
    ctx.fillRect(size * 0.03 - stepOffset * 0.4, -size * 0.22, size * 0.11, size * 0.18);

    // 몸통 (의상)
    ctx.fillStyle = pal.outfit;
    ctx.beginPath();
    ctx.roundRect(-size * 0.22, -size * 0.52, size * 0.44, size * 0.34, 4);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 포인트 허리띠/망토
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-size * 0.21, -size * 0.34, size * 0.42, size * 0.07);

    // 머리
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0, -size * 0.68, size * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 머리카락
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (dir === 'up') {
        ctx.arc(0, -size * 0.69, size * 0.24, 0, Math.PI * 2);
    } else {
        ctx.arc(0, -size * 0.72, size * 0.24, Math.PI, Math.PI * 2);
        if (genderKey === 'female') {
            ctx.fillRect(-size * 0.24, -size * 0.72, size * 0.09, size * 0.25);
            ctx.fillRect(size * 0.15, -size * 0.72, size * 0.09, size * 0.25);
        }
    }
    ctx.fill();

    // 눈 (뒤돌아볼 때 제외)
    if (dir !== 'up') {
        ctx.fillStyle = '#0f172a';
        const eyeShiftX = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
        ctx.fillRect(-size * 0.09 + eyeShiftX, -size * 0.68, 2.5, 3.5);
        ctx.fillRect(size * 0.05 + eyeShiftX, -size * 0.68, 2.5, 3.5);
    }

    ctx.restore();
};
