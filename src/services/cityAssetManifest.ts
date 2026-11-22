/**
 * 쯔꾸르 2D 도시 필드 V2 — 문화권별 건물·소품 6종 & 특수 건물 6종 에셋 매니페스트
 * - 경로 구조:
 *   assets/visuals/city_tiles/<cultureKey>/{landmark,shop,house,tree,fountain,lamp}.png
 *   assets/visuals/city_tiles/special/{special_base,special_dungeon,special_abyss,special_elf,special_beast,special_demon}.png
 */

export type BaseCultureKey =
    | 'korea'
    | 'japan'
    | 'china'
    | 'asia'
    | 'europe'
    | 'north_america'
    | 'south_america'
    | 'oceania'
    | 'africa'
    | 'shingye'
    | 'magye'
    | 'sylvanar'
    | 'feraldia'
    | 'abyssalon';

export type CityCultureKey =
    | BaseCultureKey
    // 아시아 세분화 4종
    | 'southeast_asia'
    | 'south_asia'
    | 'central_asia'
    | 'middle_east'
    // 유럽 세분화 3종 (서유럽 = europe)
    | 'southern_europe'
    | 'northern_europe'
    | 'eastern_europe'
    // 아프리카 세분화 3종
    | 'north_africa'
    | 'west_africa'
    | 'south_africa'
    // 신계 성전별 13종 (신의 거처 = shingye)
    | 'shingye_sun'
    | 'shingye_light'
    | 'shingye_flora'
    | 'shingye_flame'
    | 'shingye_ocean'
    | 'shingye_thunder'
    | 'shingye_moon'
    | 'shingye_wind'
    | 'shingye_ice'
    | 'shingye_steel'
    | 'shingye_earth'
    | 'shingye_abyss'
    | 'shingye_void'
    // 마계 도시별 11종 (임페리얼 = magye)
    | 'magye_nulbarion'
    | 'magye_delirium'
    | 'magye_noctia'
    | 'magye_endrasil'
    | 'magye_seraphiel'
    | 'magye_carnage'
    | 'magye_infernos'
    | 'magye_venomgarden'
    | 'magye_chronopol'
    | 'magye_bloodmoon'
    | 'magye_necropolis';

export type CultureAssetPart = 'landmark' | 'shop' | 'house' | 'tree' | 'fountain' | 'lamp';

export type SpecialBuildingKey =
    | 'special_base'
    | 'special_dungeon'
    | 'special_abyss'
    | 'special_elf'
    | 'special_beast'
    | 'special_demon';

export type BuildingSpriteKind = 'landmark' | 'shop' | 'house' | SpecialBuildingKey;

export type TerrainBiomeKey =
    | 'east_asia'
    | 'europe'
    | 'tropical'
    | 'desert'
    | 'shingye'
    | 'magye'
    | 'sylvanar';

export type TerrainTilePart = 'ground' | 'road' | 'plaza' | 'royal_road' | 'wall' | 'water';

export type PropPackKey = 'market' | 'nature' | 'fantasy' | 'east_asia';

export interface CityPropAssetRef {
    pack: PropPackKey;
    part: string;
}

export const getParentCultureKey = (cultureKey: CityCultureKey): BaseCultureKey => {
    if (cultureKey.startsWith('shingye_')) return 'shingye';
    if (cultureKey.startsWith('magye_')) return 'magye';
    if (cultureKey === 'southeast_asia' || cultureKey === 'south_asia' || cultureKey === 'central_asia') return 'asia';
    if (cultureKey === 'middle_east') return 'africa';
    if (cultureKey === 'southern_europe' || cultureKey === 'northern_europe' || cultureKey === 'eastern_europe') return 'europe';
    if (cultureKey === 'north_africa' || cultureKey === 'west_africa' || cultureKey === 'south_africa') return 'africa';
    return cultureKey as BaseCultureKey;
};

export const resolveTerrainBiomeKey = (cultureKey: CityCultureKey): TerrainBiomeKey => {
    if (cultureKey.startsWith('shingye')) return 'shingye';
    if (cultureKey.startsWith('magye') || cultureKey === 'abyssalon') return 'magye';
    if (cultureKey === 'sylvanar') return 'sylvanar';

    switch (cultureKey) {
        case 'korea':
        case 'japan':
        case 'china':
        case 'asia':
        case 'central_asia':
            return 'east_asia';
        case 'europe':
        case 'southern_europe':
        case 'northern_europe':
        case 'eastern_europe':
        case 'north_america':
            return 'europe';
        case 'southeast_asia':
        case 'south_asia':
        case 'south_america':
        case 'oceania':
        case 'south_africa':
            return 'tropical';
        case 'middle_east':
        case 'africa':
        case 'north_africa':
        case 'west_africa':
        case 'feraldia':
            return 'desert';
        default:
            return 'east_asia';
    }
};

const SHINGYE_CITY_CULTURE_MAP: Record<string, CityCultureKey> = {
    '태양의 사자의 성전': 'shingye_sun',
    '광휘의 사자의 성소': 'shingye_light',
    '초화의 사자의 성초': 'shingye_flora',
    '화염의 사자의 성화': 'shingye_flame',
    '해수의 사자의 성수전': 'shingye_ocean',
    '전격의 사자의 성전': 'shingye_thunder',
    '월광의 사자의 성': 'shingye_moon',
    '질풍의 사자의 질풍전': 'shingye_wind',
    '빙결의 사자의 빙궁': 'shingye_ice',
    '강철의 사자의 강성': 'shingye_steel',
    '지령의 사자의 궁궐': 'shingye_earth',
    '암연의 사자의 심연': 'shingye_abyss',
    '무의 궁궐': 'shingye_void',
};

const MAGYE_CITY_CULTURE_MAP: Record<string, CityCultureKey> = {
    '눌바리온': 'magye_nulbarion',
    '딜리리움': 'magye_delirium',
    '노크티아': 'magye_noctia',
    '엔드라실': 'magye_endrasil',
    '세라피엘 몰락지': 'magye_seraphiel',
    '카르나쥬': 'magye_carnage',
    '인페르노스': 'magye_infernos',
    '베놈가든': 'magye_venomgarden',
    '크로노폴': 'magye_chronopol',
    '블러드문': 'magye_bloodmoon',
    '네크로폴리스': 'magye_necropolis',
};

export const resolveCityCultureKey = (region?: string, nation?: string, city?: string): CityCultureKey => {
    const r = (region || '').trim();
    const n = (nation || '').trim();
    const c = (city || '').trim();

    if (r === '신계') {
        return SHINGYE_CITY_CULTURE_MAP[c] || 'shingye';
    }
    if (r === '마계' || n === '임페리얼 제국') {
        return MAGYE_CITY_CULTURE_MAP[c] || 'magye';
    }
    if (r === '실바나르' || n === '미르탈 숲연합') return 'sylvanar';
    if (r === '페랄디아' || n === '레오니스 투기국') return 'feraldia';
    if (r === '아비살론' || n === '네크로디움 제국') return 'abyssalon';

    // 아시아 세분화
    if (n === '대한민국' || n === '북한') return 'korea';
    if (n === '일본') return 'japan';
    if (n === '중국' || n === '대만') return 'china';
    if (['태국', '베트남', '필리핀', '인도네시아', '말레이시아', '싱가포르'].includes(n)) return 'southeast_asia';
    if (n === '인도') return 'south_asia';
    if (n === '몽골') return 'central_asia';
    if (['사우디아라비아', 'UAE', '이스라엘', '이란', '터키'].includes(n)) return 'middle_east';

    // 아프리카 세분화
    if (['이집트', '모로코'].includes(n)) return 'north_africa';
    if (['나이지리아', '케냐'].includes(n)) return 'west_africa';
    if (n === '남아공') return 'south_africa';
    if (r === '아프리카') return 'africa';

    // 유럽 세분화
    if (['이탈리아', '스페인', '포르투갈', '그리스'].includes(n)) return 'southern_europe';
    if (['스웨덴', '노르웨이', '덴마크', '핀란드'].includes(n)) return 'northern_europe';
    if (['러시아', '폴란드', '우크라이나', '헝가리', '체코', '루마니아'].includes(n)) return 'eastern_europe';
    if (r === '유럽') return 'europe';

    if (r === '북아메리카') return 'north_america';
    if (r === '남아메리카') return 'south_america';
    if (r === '오세아니아') return 'oceania';
    return 'asia';
};

const getBaseUrl = (): string => {
    const base = (import.meta as any).env?.BASE_URL || './';
    return base.endsWith('/') ? base : `${base}/`;
};

export const getCultureAssetUrl = (cultureKey: CityCultureKey, part: CultureAssetPart): string => {
    // 기타 아시아(동남아 등)는 korea 팩과 호환하거나 전용 asia 폴더 조회
    return `${getBaseUrl()}assets/visuals/city_tiles/${cultureKey}/${part}.png`;
};

export const getSpecialBuildingUrl = (specialKey: SpecialBuildingKey): string => {
    return `${getBaseUrl()}assets/visuals/city_tiles/special/${specialKey}.png`;
};

export const getBuildingSpriteUrl = (cultureKey: CityCultureKey, kind: BuildingSpriteKind): string => {
    if (kind.startsWith('special_')) {
        return getSpecialBuildingUrl(kind as SpecialBuildingKey);
    }
    return getCultureAssetUrl(cultureKey, kind as CultureAssetPart);
};

export const getTerrainTileUrl = (cultureKey: CityCultureKey, part: TerrainTilePart): string => {
    const biome = resolveTerrainBiomeKey(cultureKey);
    return `${getBaseUrl()}assets/visuals/city_tiles/terrain/${biome}/${part}.png`;
};

export const getPropAssetUrl = (pack: PropPackKey, part: string): string => {
    return `${getBaseUrl()}assets/visuals/city_tiles/props/${pack}/${part}.png`;
};

// 인메모리 이미지 캐시 (없는 PNG는 한 번만 404 후 'error' 캐싱해 네트워크 재요청 방지)
const assetCache = new Map<string, HTMLImageElement | 'error'>();
const pendingLoads = new Map<string, Promise<HTMLImageElement | null>>();

export const loadCityAssetImage = (url: string): Promise<HTMLImageElement | null> => {
    const cached = assetCache.get(url);
    if (cached === 'error') return Promise.resolve(null);
    if (cached) return Promise.resolve(cached);

    const pending = pendingLoads.get(url);
    if (pending) return pending;

    const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            assetCache.set(url, img);
            pendingLoads.delete(url);
            resolve(img);
        };
        img.onerror = () => {
            assetCache.set(url, 'error');
            pendingLoads.delete(url);
            resolve(null);
        };
        img.src = url;
    });

    pendingLoads.set(url, p);
    return p;
};

export const getCachedCityAssetImage = (url: string): HTMLImageElement | null => {
    const cached = assetCache.get(url);
    if (!cached || cached === 'error') return null;
    return cached;
};
