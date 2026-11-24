import { Character, Location } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import { calculateFinalStats } from '../utils';
import { GEO_POSITIONS, ISLAND_NATIONS } from '../components/MapModal';
import { formatDuration } from './gameTimeService';

export type TravelTransportType = 'walk' | 'carriage' | 'ship' | 'airship' | 'portal';

export interface TravelOption {
    type: TravelTransportType;
    label: string;
    description: string;
    cost: number;
    baseCost: number;
    days: number;
    totalMinutes: number;
    durationText: string;
    ambushRisk: 'low' | 'medium' | 'high';
    ambushChancePct: number;
    recommended?: boolean;
    passActive?: boolean;
    passStatusText?: string;
    requiresContract?: boolean;
    note?: string;
}

export const TRANSPORT_CONTRACT_PRICES: Record<'carriage' | 'ship' | 'airship', { monthly: number; purchase: number; label: string }> = {
    carriage: { monthly: 1500000, purchase: 18000000, label: '정기/급행 마차' },
    ship: { monthly: 2500000, purchase: 30000000, label: '대형 범선/쾌속선' },
    airship: { monthly: 7500000, purchase: 90000000, label: '고속 비행선' }
};

export function isTransportPassActive(character: Character, type: 'carriage' | 'ship' | 'airship'): { active: boolean; statusText?: string } {
    const lic = character.transportLicenses;
    if (!lic) return { active: false };
    if (type === 'carriage' && lic.carriageOwned) return { active: true, statusText: '영구 보유 (무료)' };
    if (type === 'ship' && lic.shipOwned) return { active: true, statusText: '영구 보유 (무료)' };
    if (type === 'airship' && lic.airshipOwned) return { active: true, statusText: '영구 보유 (무료)' };

    const curMs = new Date(character.currentDate || '2026-01-01').getTime();
    const untilStr =
        type === 'carriage'
            ? lic.carriageMonthlyUntil
            : type === 'ship'
                ? lic.shipMonthlyUntil
                : lic.airshipMonthlyUntil;
    if (untilStr) {
        const untilMs = new Date(untilStr).getTime();
        if (!Number.isNaN(untilMs) && untilMs >= curMs) {
            return { active: true, statusText: `정기계약 (~${untilStr})` };
        }
    }
    return { active: false };
}

export interface TravelCalculationInfo {
    cost: number;
    days: number;
    totalMinutes: number;
    durationText: string;
    method: string;
    isSameLocation: boolean;
}

/**
 * 국가 이름으로 속한 대륙(지역)을 찾습니다.
 */
export function findRegionForNation(nation: string): string {
    if (!nation) return '아시아';
    for (const [region, nations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nations && nations[nation]) {
            return region;
        }
    }
    return '아시아';
}

/**
 * 현재 위치에서 목적지까지의 정확한 이동 시간(분/일) 및 비용을 정밀하게 계산합니다.
 * [사용자 요구 반영]
 * 1. 일반 이동 시간은 크게 단축:
 *    - 같은 국가 내 도시 간: 20분 ~ 1시간 30분
 *    - 같은 대륙 다른 국가 간: 2시간 ~ 8시간
 *    - 다른 대륙 간 (비행선): 12시간 ~ 1.5일 (최대 36시간)
 *    - 마계/차원 대륙: 1.5일 ~ 2일
 * 2. 신계(신성 이동 / 신계 차원 이동)만 고난도 이동으로 훨씬 오래 걸림:
 *    - 신계 진입 및 이탈 (차원 이동): 7일 ~ 14일
 *    - 신계 내 도시 간 이동 (신성 이동): 3일 ~ 5일
 */
export function calculateTravelCostAndDays(
    currentLoc: Location | undefined,
    targetLoc: Location | undefined,
    character: Character
): TravelCalculationInfo {
    const curRegion = currentLoc?.region || (currentLoc?.nation ? findRegionForNation(currentLoc.nation) : '아시아');
    const curNation = currentLoc?.nation || '대한민국';
    const curCity = currentLoc?.city || '서울';

    const tgtNation = targetLoc?.nation || curNation;
    const tgtRegion = targetLoc?.region || (targetLoc?.nation ? findRegionForNation(targetLoc.nation) : curRegion);
    const tgtCity = targetLoc?.city || curCity;

    // 동일 위치인 경우
    if (tgtCity === curCity && tgtNation === curNation) {
        return {
            cost: 0,
            days: 0,
            totalMinutes: 0,
            durationText: '현재 위치',
            method: '현재 위치',
            isSameLocation: true
        };
    }

    let cost = 0;
    let baseMinutes = 0;
    let minMinutes = 1;
    let method = '이동';

    const isRealmCrossing = (tgtRegion === '신계' && curRegion !== '신계') ||
                            (tgtRegion !== '신계' && curRegion === '신계');

    if (isRealmCrossing) {
        // 신계 진입 및 이탈 (차원 이동): 기본 30분, 최소 30분
        cost = 100000;
        baseMinutes = 30;
        minMinutes = 30;
        method = '신계 차원 도약';
    } else if (tgtRegion === '신계') {
        // 신계 내부 이동: 기본 10분, 최소 10분
        cost = 30000;
        baseMinutes = 10;
        minMinutes = 10;
        method = '신성 순례 이동';
    } else if (tgtNation === curNation) {
        // 같은 국가 내 도시 간: 20분 ~ 1시간 30분
        const p1 = GEO_POSITIONS[curCity] || GEO_POSITIONS[curNation] || { x: 50, y: 50 };
        const p2 = GEO_POSITIONS[tgtCity] || GEO_POSITIONS[tgtNation] || { x: 50, y: 50 };
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        cost = Math.max(200, Math.floor(dist * 100) + 200);
        baseMinutes = Math.min(90, Math.max(20, Math.floor(dist * 10) + 20));
        method = '도보/마차 이동';
    } else if (tgtRegion !== curRegion) {
        // 다른 대륙 간 비행선: 12시간 ~ 1.5일 (720분 ~ 2160분)
        const p1 = GEO_POSITIONS[curRegion] || { x: 50, y: 50 };
        const p2 = GEO_POSITIONS[tgtRegion] || { x: 50, y: 50 };
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        const baseHours = Math.min(36, Math.max(12, Math.floor(dist * 0.3) + 12));
        baseMinutes = baseHours * 60;
        cost = Math.max(4000, Math.floor(dist * 400));
        method = '고속 비행선';

        if (tgtRegion === '마계' || tgtRegion === '실바나르' || tgtRegion === '페랄디아' || tgtRegion === '아비살론') {
            baseMinutes = Math.floor(baseMinutes * 1.3); // 마계/차원은 약 1.5일~2일
            cost = Math.floor(cost * 1.3);
            method = '차원 횡단선';
        }
    } else {
        // 같은 대륙 다른 국가 이동: 2시간 ~ 8시간 (120분 ~ 480분)
        const p1 = GEO_POSITIONS[curNation] || { x: 50, y: 50 };
        const p2 = GEO_POSITIONS[tgtNation] || { x: 50, y: 50 };
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        baseMinutes = Math.min(480, Math.max(120, Math.floor(dist * 6) + 120));
        cost = 1500;
        method = '마차/급행선';
        if (ISLAND_NATIONS.includes(tgtNation) || ISLAND_NATIONS.includes(curNation)) {
            method = '쾌속선';
        }
    }

    const agi = character.stats?.agi || 0;
    let threshold = 3000;

    if (isRealmCrossing || tgtRegion === '신계') {
        threshold = 30000;
    } else if (tgtRegion !== curRegion) {
        threshold = 8000;
    } else if (tgtNation !== curNation) {
        threshold = 5000;
    } else {
        threshold = 1200; // 국내 이동
    }

    // 민첩에 의한 시간 단축 (최대 99% 단축, 최소 minMinutes)
    const reductionRatio = Math.min(0.99, agi / threshold);
    const totalMinutes = Math.max(minMinutes, Math.round(baseMinutes * (1 - reductionRatio)));
    const days = Math.floor(totalMinutes / 1440);
    const durationText = formatDuration(totalMinutes);

    return {
        cost,
        days,
        totalMinutes,
        durationText,
        method,
        isSameLocation: false
    };
}

export function getWalkMinutesBetweenCities(
    currentLoc: Location | undefined,
    targetLoc: Location | undefined,
    character: Character
): { days: number; totalMinutes: number; durationText: string } {
    const base = calculateTravelCostAndDays(currentLoc, targetLoc, character);
    if (base.isSameLocation) return { days: 0, totalMinutes: 0, durationText: '현재 위치' };
    const agi = character.stats?.agi || 0;
    // 도보 이동시간 2배 확대 + AGI(민첩)에 따른 추가 도보 가속(최대 75% 단축)
    const walkAgiReduction = Math.min(0.75, agi / 1500);
    const walkMinutes = Math.max(20, Math.round(base.totalMinutes * 2.7 * (1 - walkAgiReduction)));
    return {
        days: Math.floor(walkMinutes / 1440),
        totalMinutes: walkMinutes,
        durationText: formatDuration(walkMinutes)
    };
}

export interface OverlandWaypoint {
    region: string;
    nation: string;
    city: string;
}

export const OVERLAND_NATION_EDGES: Record<string, string[]> = {
    // 아시아 (16)
    '대한민국': ['북한', '중국', '일본'],
    '북한': ['대한민국', '중국', '러시아', '일본'],
    '일본': ['대한민국', '북한', '중국', '필리핀', '러시아', '네크로디움 제국'],
    '중국': ['북한', '대한민국', '일본', '몽골', '러시아', '인도', '태국', '베트남', '필리핀'],
    '몽골': ['중국', '러시아'],
    '인도': ['중국', '이란', '태국', 'UAE', '사우디아라비아', '말레이시아', '인도네시아', '케냐'],
    '태국': ['중국', '인도', '베트남', '말레이시아'],
    '베트남': ['중국', '태국', '필리핀', '말레이시아', '인도네시아'],
    '필리핀': ['일본', '중국', '베트남', '말레이시아', '인도네시아', '호주', '네크로디움 제국'],
    '말레이시아': ['태국', '베트남', '필리핀', '싱가포르', '인도네시아', '인도'],
    '싱가포르': ['말레이시아', '인도네시아', '호주'],
    '인도네시아': ['말레이시아', '싱가포르', '베트남', '필리핀', '인도', '호주', '네크로디움 제국'],
    '사우디아라비아': ['UAE', '이란', '이스라엘', '인도', '이집트', '케냐'],
    'UAE': ['사우디아라비아', '이란', '인도'],
    '이스라엘': ['이집트', '사우디아라비아', '이란', '터키', '그리스'],
    '이란': ['터키', '러시아', '인도', '사우디아라비아', 'UAE', '이스라엘'],
    // 유럽 (24)
    '영국': ['스코틀랜드', '아일랜드', '프랑스', '벨기에', '네덜란드', '노르웨이', '캐나다', '미국'],
    '스코틀랜드': ['영국', '아일랜드', '노르웨이', '캐나다', '레오니스 투기국'],
    '아일랜드': ['영국', '스코틀랜드', '프랑스', '캐나다', '미국'],
    '프랑스': ['영국', '아일랜드', '벨기에', '독일', '스위스', '이탈리아', '스페인', '포르투갈'],
    '스페인': ['프랑스', '포르투갈', '이탈리아', '모로코', '미국', '멕시코', '브라질'],
    '포르투갈': ['스페인', '프랑스', '모로코', '미국', '브라질'],
    '벨기에': ['프랑스', '네덜란드', '독일', '영국'],
    '네덜란드': ['벨기에', '독일', '영국', '덴마크'],
    '독일': ['네덜란드', '벨기에', '프랑스', '스위스', '오스트리아', '체코', '폴란드', '덴마크'],
    '스위스': ['프랑스', '독일', '오스트리아', '이탈리아'],
    '이탈리아': ['프랑스', '스위스', '오스트리아', '스페인', '그리스', '이집트'],
    '오스트리아': ['독일', '스위스', '이탈리아', '체코', '헝가리'],
    '체코': ['독일', '폴란드', '오스트리아', '헝가리'],
    '헝가리': ['오스트리아', '체코', '우크라이나', '루마니아', '그리스'],
    '폴란드': ['독일', '체코', '우크라이나', '러시아', '스웨덴'],
    '우크라이나': ['폴란드', '헝가리', '루마니아', '러시아', '터키'],
    '루마니아': ['우크라이나', '헝가리', '그리스', '터키'],
    '그리스': ['루마니아', '헝가리', '터키', '이탈리아', '이집트', '이스라엘'],
    '터키': ['그리스', '루마니아', '우크라이나', '러시아', '이란', '이스라엘', '이집트'],
    '덴마크': ['독일', '네덜란드', '노르웨이', '스웨덴'],
    '노르웨이': ['덴마크', '스웨덴', '핀란드', '러시아', '영국', '스코틀랜드', '레오니스 투기국'],
    '스웨덴': ['노르웨이', '덴마크', '핀란드', '폴란드', '레오니스 투기국'],
    '핀란드': ['스웨덴', '노르웨이', '러시아', '레오니스 투기국'],
    '러시아': ['노르웨이', '핀란드', '폴란드', '우크라이나', '터키', '이란', '몽골', '중국', '북한', '일본', '캐나다', '레오니스 투기국'],
    // 북아메리카 (3)
    '미국': ['캐나다', '멕시코', '영국', '아일랜드', '스페인', '포르투갈', '미르탈 숲연합'],
    '캐나다': ['미국', '영국', '스코틀랜드', '아일랜드', '러시아', '레오니스 투기국', '미르탈 숲연합'],
    '멕시코': ['미국', '스페인', '브라질', '아르헨티나', '미르탈 숲연합'],
    // 남아메리카 (2)
    '브라질': ['아르헨티나', '멕시코', '스페인', '포르투갈', '모로코', '나이지리아', '남아공'],
    '아르헨티나': ['브라질', '멕시코', '남아공', '미르탈 숲연합', '임페리얼 제국'],
    // 오세아니아 (2)
    '호주': ['뉴질랜드', '인도네시아', '싱가포르', '필리핀', '남아공', '네크로디움 제국', '임페리얼 제국'],
    '뉴질랜드': ['호주', '네크로디움 제국', '임페리얼 제국'],
    // 아프리카 (5)
    '이집트': ['모로코', '나이지리아', '케냐', '이스라엘', '사우디아라비아', '터키', '그리스', '이탈리아'],
    '모로코': ['이집트', '나이지리아', '스페인', '포르투갈', '브라질'],
    '나이지리아': ['모로코', '이집트', '케냐', '남아공', '브라질'],
    '케냐': ['이집트', '나이지리아', '남아공', '사우디아라비아', '인도'],
    '남아공': ['나이지리아', '케냐', '브라질', '아르헨티나', '호주', '임페리얼 제국'],
    // 마계 & 판타지 대륙 (4)
    '임페리얼 제국': ['남아공', '아르헨티나', '호주', '뉴질랜드'],
    '미르탈 숲연합': ['미국', '멕시코', '캐나다', '아르헨티나'],
    '레오니스 투기국': ['노르웨이', '스웨덴', '핀란드', '스코틀랜드', '러시아', '캐나다'],
    '네크로디움 제국': ['일본', '필리핀', '인도네시아', '호주', '뉴질랜드']
};

/**
 * WORLD_GEOGRAPHY와 OVERLAND_NATION_EDGES를 기반으로 출발 국가에서 목표 국가까지의
 * 세분화된 경유 국가 경로(BFS 최단 인접 체인)를 계산합니다.
 */
export function computeOverlandRoute(
    origin: Location | undefined,
    destination: Location | undefined
): OverlandWaypoint[] {
    const startRegion = origin?.region || '아시아';
    const startNation = origin?.nation || '대한민국';
    const endRegion = destination?.region || startRegion;
    const endNation = destination?.nation || startNation;
    const endCity = destination?.city || WORLD_GEOGRAPHY[endRegion]?.[endNation]?.capital || endNation;

    if (startNation === endNation) {
        return [{ region: endRegion, nation: endNation, city: endCity }];
    }

    const nationMeta: Record<string, { region: string; city: string }> = {};
    for (const [reg, nationsObj] of Object.entries(WORLD_GEOGRAPHY)) {
        if (reg === '신계') continue;
        for (const [nat, data] of Object.entries(nationsObj)) {
            nationMeta[nat] = {
                region: reg,
                city: nat === endNation ? endCity : (data.capital || data.cities?.[0] || nat)
            };
        }
    }

    // BFS shortest hop path over OVERLAND_NATION_EDGES
    const queue: string[][] = [[startNation]];
    const visited = new Set<string>([startNation]);
    let foundPath: string[] | null = null;

    while (queue.length > 0) {
        const path = queue.shift()!;
        const cur = path[path.length - 1];
        if (cur === endNation) {
            foundPath = path;
            break;
        }
        const neighbors = OVERLAND_NATION_EDGES[cur] || [];
        for (const nxt of neighbors) {
            if (!visited.has(nxt)) {
                visited.add(nxt);
                queue.push([...path, nxt]);
            }
        }
    }

    if (!foundPath) {
        return [{ region: endRegion, nation: endNation, city: endCity }];
    }

    return foundPath.slice(1).map(nat => ({
        region: nationMeta[nat]?.region || endRegion,
        nation: nat,
        city: nat === endNation ? endCity : (nationMeta[nat]?.city || nat)
    }));
}

/**
 * 출발지·도착지·캐릭터 능력치에 따라 선택 가능한 이동수단(도보 / 마차·선박 / 비행선 / 차원 도약) 옵션을 반환합니다.
 */
export function calculateTravelOptions(
    currentLoc: Location | undefined,
    targetLoc: Location | undefined,
    character: Character
): TravelOption[] {
    const base = calculateTravelCostAndDays(currentLoc, targetLoc, character);
    if (base.isSameLocation) return [];

    const curRegion = currentLoc?.region || (currentLoc?.nation ? findRegionForNation(currentLoc.nation) : '아시아');
    const curNation = currentLoc?.nation || '대한민국';
    const tgtNation = targetLoc?.nation || curNation;
    const tgtRegion = targetLoc?.region || (targetLoc?.nation ? findRegionForNation(targetLoc.nation) : curRegion);

    const isRealmCrossing =
        (tgtRegion === '신계' && curRegion !== '신계') ||
        (tgtRegion !== '신계' && curRegion === '신계');
    const isDimensional =
        isRealmCrossing ||
        tgtRegion === '마계' ||
        curRegion === '마계' ||
        tgtRegion === '실바나르' ||
        tgtRegion === '페랄디아' ||
        tgtRegion === '아비살론';
    const isSeaRoute =
        ISLAND_NATIONS.includes(tgtNation) ||
        ISLAND_NATIONS.includes(curNation) ||
        (tgtRegion !== curRegion && !isDimensional);

    if (isRealmCrossing) {
        return [
            {
                type: 'portal',
                label: '신계 차원 도약',
                description: '신성 마법진으로 차원 경계를 넘어 이동합니다. (여정 중 차원 균열 조우 가능)',
                cost: base.cost,
                baseCost: base.cost,
                days: base.days,
                totalMinutes: base.totalMinutes,
                durationText: base.durationText,
                ambushRisk: 'medium',
                ambushChancePct: 25,
                recommended: true,
                note: '추후 Lv.500+ · 라스트 클래스 · 차원도약 스킬 퀘스트 연동 예정'
            }
        ];
    }

    const options: TravelOption[] = [];

    // 1. 도보 탐험 (신계 제외 전 세계 도보/연안 경유 탐험 가능 - getWalkMinutesBetweenCities 단일 기준 사용)
    const walkInfo = getWalkMinutesBetweenCities(currentLoc, targetLoc, character);
    options.push({
        type: 'walk',
        label: '도보 탐험',
        description:
            tgtNation === curNation
                ? '국가 필드를 직접 걸으며 도시·상단·몬스터 조우를 경험합니다.'
                : '인접 국가 경유 포탈을 거쳐 목적지까지 직접 걸어 이동합니다.',
        cost: 0,
        baseCost: 0,
        days: walkInfo.days,
        totalMinutes: walkInfo.totalMinutes,
        durationText: walkInfo.durationText,
        ambushRisk: 'high',
        ambushChancePct: 45
    });

    // 2. 마차 / 쾌속선 (계약 또는 영구구매 필수)
    if (!isDimensional || tgtRegion === curRegion) {
        const isShip = isSeaRoute;
        const passType = isShip ? 'ship' : 'carriage';
        const pass = isTransportPassActive(character, passType);
        options.push({
            type: passType,
            label: isShip ? '대형 범선 / 쾌속선' : '정기 마차 / 급행 마차',
            description: isShip
                ? '해로를 따라 항해합니다. (1달 정기계약 또는 영구 구매 필요)'
                : '가도를 따라 이동합니다. (1달 정기계약 또는 영구 구매 필요)',
            cost: pass.active ? 0 : base.cost,
            baseCost: base.cost,
            days: base.days,
            totalMinutes: base.totalMinutes,
            durationText: base.durationText,
            ambushRisk: 'medium',
            ambushChancePct: 28,
            recommended: pass.active && tgtRegion === curRegion,
            passActive: pass.active,
            passStatusText: pass.statusText,
            requiresContract: !pass.active
        });
    }

    // 3. 고속 비행선 / 차원 횡단선 (계약 또는 영구구매 필수)
    const airshipBaseCost = tgtRegion !== curRegion ? base.cost : Math.max(2500, Math.round(base.cost * 2.4));
    const airshipMinutes = tgtRegion !== curRegion
        ? base.totalMinutes
        : Math.max(10, Math.round(base.totalMinutes * 0.45));
    const airPass = isTransportPassActive(character, 'airship');
    const isDimCross = isDimensional && tgtRegion !== curRegion;
    options.push({
        type: isDimCross ? 'portal' : 'airship',
        label: isDimCross ? '차원 횡단 비행선' : '고속 비행선',
        description: isDimCross
            ? '차원 경계를 횡단합니다.'
            : '상공 항로를 고속 비행합니다. (1달 정기계약 또는 영구 구매 필요)',
        cost: !isDimCross && airPass.active ? 0 : airshipBaseCost,
        baseCost: airshipBaseCost,
        days: Math.floor(airshipMinutes / 1440),
        totalMinutes: airshipMinutes,
        durationText: formatDuration(airshipMinutes),
        ambushRisk: 'low',
        ambushChancePct: 14,
        recommended: !isDimCross && airPass.active && tgtRegion !== curRegion,
        passActive: !isDimCross && airPass.active,
        passStatusText: !isDimCross ? airPass.statusText : undefined,
        requiresContract: !isDimCross && !airPass.active,
        note: isDimCross ? '추후 차원도약 스킬/퀘스트 연동 예정' : undefined
    });

    return options;
}
