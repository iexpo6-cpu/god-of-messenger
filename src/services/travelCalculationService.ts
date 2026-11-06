import { Character, Location } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import { calculateFinalStats } from '../utils';
import { GEO_POSITIONS, ISLAND_NATIONS } from '../components/MapModal';
import { formatDuration } from './gameTimeService';

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
