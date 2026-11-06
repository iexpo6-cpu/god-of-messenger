/**
 * 영지 방어 체계 전담 서비스
 * - 성전 방어를 배제하고 지역관리 모달 내 지역대장 전용 순수 영지 방어 로직 전담
 * - 진지 보강 공사: 시간 소요, 시작 시간 및 남은 시간 정밀 계산, 준공 승인
 * - 비상 요격 작전: 긴급 위협 사태 이벤트 발생 시 주둔 방어군 파견
 * - 파견 상태: 수일간(2~5일) 전방 작전지로 파견되어 주둔 방어군이 임무 수행
 * - 파견 완료 시: 도시 위협도 해소, 대량의 골드/영지 예산/군공/마정석 및 전리품 보상 지급, 가문 서신 발송
 */

import { Character, Companion, SimpleStudent, MilitaryRank, Item } from '../types';
import { MILITARY_RANK_THRESHOLD } from '@/constants';
import { calculateCombatPower } from '../utils';
import { getHuntBandsForLocation, HUNT_LEVEL_BANDS } from '../monsterfield';

export interface FortificationConstruction {
    targetLevel: number;
    targetLabel: string;
    cost: number;
    startDate: string;
    startTime: string;
    completionDate: string;
    completionTime: string;
    durationMinutes: number;
}

export interface TerritoryThreatEvent {
    id: string;
    city: string;
    title: string;
    description: string;
    severity: '보통' | '경계' | '심각' | '재앙';
    recommendedPower: number; // 토벌 권장 전투력
    occurredDate: string;
    occurredTime: string;
    threatIncreasePerDay: number;
    lastEscalationDate: string;
    daysIgnored: number;
    targetThreatReduction: number;
    bountyGold: number;
    bountyMerit: number;
    isResolved?: boolean;
}

export interface DefenseDispatchRewardItem {
    name: string;
    count: number;
    desc: string;
    type?: 'Etc' | 'Consumable';
    rarity?: any;
}

export interface DefenseDispatch {
    id: string;
    city: string;
    threatEventId: string;
    threatTitle: string;
    threatSeverity: '보통' | '경계' | '심각' | '재앙';
    recommendedPower: number; // 권장 전투력
    actualPower: number; // 출동 당시 방어군 전투력
    failChance: number; // 실패 확률 (0~100)
    isFailed?: boolean; // 작전 실패 여부 (사망 처리)
    garrisonIds: string[]; // 출동한 주둔 방어군 대원 식별자
    departureDate: string;
    departureTime: string;
    returnDate: string;
    returnTime: string;
    durationDays: number;
    durationMinutes: number;
    // 파견 완료 시 주어질 보상
    rewardGold: number;
    rewardMerit: number; // 사령관 획득 군공
    memberMerit: number; // 파견 대원 각자 획득 군공
    rewardBudget: number;
    rewardItems?: DefenseDispatchRewardItem[];
    threatReduction: number;
    isCompleted?: boolean;
}

export interface RegionDefenseData {
    garrisonIds: string[]; // 주둔 방어군 식별자 (최대 4인)
    fortificationLevel: number; // 방어 진지 보강 등급 (1~5)
    threatLevel: number; // 도시 위협도 (0~100)
    defensePower: number; // 계산된 종합 방어력
    lastDefenseDate?: string;
    defenseLog?: string[];
    construction?: FortificationConstruction; // 현재 진행 중인 진지 보강 공사
    activeThreatEvent?: TerritoryThreatEvent; // 현재 발생한 긴급 위협 사태
    activeDispatch?: DefenseDispatch; // 비상 출동 파견 작전 진행 상태
    lastScoutMonth?: string; // 마지막 외곽 척후 수색 년월 (YYYY-MM)
}

// 방어 진지 등급별 기본 설정 (소모 예산, 방어력 보너스, 소요 시간(분), 명칭)
export const FORTIFICATION_CONFIG: Record<number, { cost: number; defenseBonus: number; label: string; durationMinutes: number }> = {
    1: { cost: 0, defenseBonus: 1000, label: '기본 목책 바리케이드', durationMinutes: 0 },
    2: { cost: 15000, defenseBonus: 4000, label: '석조 망루 및 경비 초소', durationMinutes: 720 }, // 12시간
    3: { cost: 35000, defenseBonus: 10000, label: '강화 성벽 및 함정 구역', durationMinutes: 1440 }, // 24시간 (1일)
    4: { cost: 65000, defenseBonus: 25000, label: '철제 방호벽 및 마도 포탑', durationMinutes: 2880 }, // 48시간 (2일)
    5: { cost: 100000, defenseBonus: 50000, label: '불가침 철벽 요새 진지', durationMinutes: 4320 } // 72시간 (3일)
};

// 긴급 위협 등급별 파견 작전 일수 및 보상 배율 설정 (공적 밸런스 조정 및 전리품 제거)
export const DISPATCH_SEVERITY_CONFIG: Record<'보통' | '경계' | '심각' | '재앙', {
    durationDays: number;
    durationMinutes: number;
    goldMultiplier: number;
    budgetBonus: number;
    meritMultiplier: number;
    threatReduction: number;
}> = {
    '보통': {
        durationDays: 2,
        durationMinutes: 2880, // 2일 (48시간)
        goldMultiplier: 1.2,
        budgetBonus: 12000,
        meritMultiplier: 1.0,
        threatReduction: 25
    },
    '경계': {
        durationDays: 3,
        durationMinutes: 4320, // 3일 (72시간)
        goldMultiplier: 1.5,
        budgetBonus: 20000,
        meritMultiplier: 1.1,
        threatReduction: 35
    },
    '심각': {
        durationDays: 4,
        durationMinutes: 5760, // 4일 (96시간)
        goldMultiplier: 1.8,
        budgetBonus: 32000,
        meritMultiplier: 1.2,
        threatReduction: 45
    },
    '재앙': {
        durationDays: 5,
        durationMinutes: 7200, // 5일 (120시간)
        goldMultiplier: 2.2,
        budgetBonus: 50000,
        meritMultiplier: 1.3,
        threatReduction: 60
    }
};

export const THREAT_EVENT_TEMPLATES = [
    {
        title: '외곽 산림 마물 무리의 대규모 약탈 침입',
        description: '도시 외곽 농경지와 보급로 주변으로 광포해진 마물 떼가 출몰하여 영민들의 가옥을 위협하고 있습니다.',
        severity: '경계' as const,
        recommendedPower: 105000,
        threatIncreasePerDay: 8,
        threatReduction: 30,
        bountyGold: 25000,
        bountyMerit: 20
    },
    {
        title: '변방 유목 도적단의 보급 마차 습격',
        description: '산악 지대에 은신 중이던 무장 도적단이 상단과 군용 보급로를 기습 약탈하며 도시 치안을 뒤흔들고 있습니다.',
        severity: '보통' as const,
        recommendedPower: 42000,
        threatIncreasePerDay: 6,
        threatReduction: 25,
        bountyGold: 15000,
        bountyMerit: 15
    },
    {
        title: '암흑 교단 추종자들의 결계 오염 획책',
        description: '도시 방벽 외곽의 마도 결계석에 저주를 심으려는 이단 마법사 무리가 포착되었습니다. 방치 시 결계가 붕괴됩니다.',
        severity: '심각' as const,
        recommendedPower: 225000,
        threatIncreasePerDay: 12,
        threatReduction: 40,
        bountyGold: 45000,
        bountyMerit: 28
    },
    {
        title: '고대 유적 폭주 마수의 관문 접근',
        description: '지하 유적에서 깨어난 대형 마수 군단이 성문을 향해 진군 중입니다. 신속히 요격하지 않으면 대참사가 우려됩니다.',
        severity: '재앙' as const,
        recommendedPower: 450000,
        threatIncreasePerDay: 15,
        threatReduction: 50,
        bountyGold: 75000,
        bountyMerit: 38
    }
];

/**
 * 사냥터 지도 기준 레벨별 표준 권장 전투력 산출
 */
export const getHuntZoneRecommendedCP = (lvl: number): number => {
    const l = Math.max(1, lvl);
    return Math.floor(l * 120 + Math.pow(l, 1.55) * 12 + 300);
};

/**
 * 도시 위치와 사냥터 지도 난이도에 기반한 동적 토벌 권장 전투력 계산
 */
export const calculateThreatRecommendedPower = (
    character: Character,
    cityName: string,
    severity: '보통' | '경계' | '심각' | '재앙'
): number => {
    const loc = character.currentLocation;
    const bands = getHuntBandsForLocation(loc?.nation, loc?.region, cityName);

    // 4인 편성 방어군 기준 권장 전투력 산정 (1인 기준 사냥터 전투력 대비 3배 내외 반영)
    // 보통: 2번째 구역 기준 x 3.0
    // 경계: 3번째 구역 기준 x 3.6
    // 심각: 4번째 구역 기준 x 4.5
    // 재앙: 5번째 이상 구역 기준 x 6.0
    let targetIndex = 2;
    let squadMultiplier = 3.0;

    if (severity === '보통') {
        targetIndex = Math.min(2, bands.length - 1);
        squadMultiplier = 3.0;
    } else if (severity === '경계') {
        targetIndex = Math.min(3, bands.length - 1);
        squadMultiplier = 3.6;
    } else if (severity === '심각') {
        targetIndex = Math.min(4, bands.length - 1);
        squadMultiplier = 4.5;
    } else if (severity === '재앙') {
        targetIndex = Math.min(5, bands.length - 1);
        squadMultiplier = 6.0;
    }

    const band = bands[targetIndex] || bands[bands.length - 1] || HUNT_LEVEL_BANDS[2];
    const avgLvl = Math.floor((band.levelRange[0] + band.levelRange[1]) / 2);
    const baseCP = getHuntZoneRecommendedCP(avgLvl);

    return Math.floor(baseCP * squadMultiplier);
};

/**
 * 권장 전투력 대비 작전 실패 확률 계산 (0~85%)
 * - 실제 전투력이 권장 전투력 이상이면 실패 확률 0%
 * - 권장 전투력보다 낮으면 부족한 비율에 비례하여 실패 확률 발생 (실패 시 전원 사망)
 */
export function calculateDispatchFailChance(actualPower: number, recommendedPower: number): number {
    if (!recommendedPower || recommendedPower <= 0) return 0;
    if (actualPower >= recommendedPower) return 0;
    const ratio = Math.max(0, actualPower / recommendedPower);
    return Math.min(85, Math.max(10, Math.round((1 - ratio) * 100)));
}

/**
 * 날짜 일자 가산 헬퍼 (YYYY-MM-DD)
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        const nextY = date.getFullYear();
        const nextM = String(date.getMonth() + 1).padStart(2, '0');
        const nextD = String(date.getDate()).padStart(2, '0');
        return `${nextY}-${nextM}-${nextD}`;
    } catch {
        return dateStr;
    }
}

/**
 * 두 날짜 간의 일수 차이 계산 (date2 - date1)
 */
export function getDaysDifference(date1Str: string, date2Str: string): number {
    try {
        const [y1, m1, d1] = date1Str.split('-').map(Number);
        const [y2, m2, d2] = date2Str.split('-').map(Number);
        const d1Obj = new Date(y1, m1 - 1, d1);
        const d2Obj = new Date(y2, m2 - 1, d2);
        const diffMs = d2Obj.getTime() - d1Obj.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
}

/**
 * 완공 또는 복귀 일시 계산
 */
export function calculateFortificationCompletion(
    startDateStr?: string,
    startTimeStr?: string,
    durationMinutes: number = 720
): { completionDate: string; completionTime: string } {
    const startDate = startDateStr || '2000-03-02';
    const startTime = startTimeStr || '08:00';

    const [curHour, curMin] = startTime.split(':').map(Number);
    const startTotalMinutes = (curHour || 0) * 60 + (curMin || 0);
    const targetTotalMinutes = startTotalMinutes + Math.max(1, durationMinutes);

    const daysToAdd = Math.floor(targetTotalMinutes / 1440);
    const remainingMinutesInDay = targetTotalMinutes % 1440;

    const endHour = Math.floor(remainingMinutesInDay / 60);
    const endMin = remainingMinutesInDay % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const completionTime = `${pad(endHour)}:${pad(endMin)}`;

    const completionDate = daysToAdd > 0 ? addDaysToDateStr(startDate, daysToAdd) : startDate;

    return { completionDate, completionTime };
}

/**
 * 현재 일시와 완공 일시 비교하여 남은 시간 계산
 */
export function getFortificationRemainingTime(
    currentDateStr?: string,
    currentTimeStr?: string,
    completionDateStr?: string,
    completionTimeStr?: string,
    durationMinutes: number = 720
): { remainingMinutes: number; text: string; isCompleted: boolean; progressPercent: number } {
    if (!completionDateStr || !completionTimeStr) {
        return { remainingMinutes: 0, text: '준공 대기', isCompleted: true, progressPercent: 100 };
    }

    const curDate = currentDateStr || '2000-03-02';
    const curTime = currentTimeStr || '08:00';

    const [curY, curM, curD] = curDate.split('-').map(Number);
    const [curHour, curMin] = curTime.split(':').map(Number);
    const curDateObj = new Date(curY, curM - 1, curD, curHour || 0, curMin || 0);

    const [tgtY, tgtM, tgtD] = completionDateStr.split('-').map(Number);
    const [tgtHour, tgtMin] = completionTimeStr.split(':').map(Number);
    const tgtDateObj = new Date(tgtY, tgtM - 1, tgtD, tgtHour || 0, tgtMin || 0);

    const diffMs = tgtDateObj.getTime() - curDateObj.getTime();
    const remainingMinutes = Math.floor(diffMs / (1000 * 60));

    if (remainingMinutes <= 0) {
        return { remainingMinutes: 0, text: '완공 완료', isCompleted: true, progressPercent: 100 };
    }

    const elapsedMinutes = Math.max(0, durationMinutes - remainingMinutes);
    const progressPercent = Math.min(99, Math.max(0, Math.floor((elapsedMinutes / durationMinutes) * 100)));

    const days = Math.floor(remainingMinutes / 1440);
    const hours = Math.floor((remainingMinutes % 1440) / 60);
    const minutes = remainingMinutes % 60;

    let text = '';
    if (days > 0) {
        text = `${days}일 ${hours}시간 남음`;
    } else if (hours > 0) {
        text = `${hours}시간 ${minutes}분 남음`;
    } else {
        text = `${minutes}분 남음`;
    }

    return { remainingMinutes, text, isCompleted: false, progressPercent };
}

/**
 * 파견 작전 남은 시간 및 진행률 정밀 계산
 */
export function getDispatchRemainingTime(
    currentDateStr?: string,
    currentTimeStr?: string,
    returnDateStr?: string,
    returnTimeStr?: string,
    durationMinutes: number = 2880
): { remainingMinutes: number; text: string; isCompleted: boolean; progressPercent: number } {
    if (!returnDateStr || !returnTimeStr) {
        return { remainingMinutes: 0, text: '복귀 완료', isCompleted: true, progressPercent: 100 };
    }

    const curDate = currentDateStr || '2000-03-02';
    const curTime = currentTimeStr || '08:00';

    const [curY, curM, curD] = curDate.split('-').map(Number);
    const [curHour, curMin] = curTime.split(':').map(Number);
    const curDateObj = new Date(curY, curM - 1, curD, curHour || 0, curMin || 0);

    const [tgtY, tgtM, tgtD] = returnDateStr.split('-').map(Number);
    const [tgtHour, tgtMin] = returnTimeStr.split(':').map(Number);
    const tgtDateObj = new Date(tgtY, tgtM - 1, tgtD, tgtHour || 0, tgtMin || 0);

    const diffMs = tgtDateObj.getTime() - curDateObj.getTime();
    const remainingMinutes = Math.floor(diffMs / (1000 * 60));

    if (remainingMinutes <= 0) {
        return { remainingMinutes: 0, text: '작전 완수 / 복귀 완료', isCompleted: true, progressPercent: 100 };
    }

    const elapsedMinutes = Math.max(0, durationMinutes - remainingMinutes);
    const progressPercent = Math.min(99, Math.max(1, Math.floor((elapsedMinutes / durationMinutes) * 100)));

    const days = Math.floor(remainingMinutes / 1440);
    const hours = Math.floor((remainingMinutes % 1440) / 60);
    const minutes = remainingMinutes % 60;

    let text = '';
    if (days > 0) {
        text = `${days}일 ${hours}시간 남음`;
    } else if (hours > 0) {
        text = `${hours}시간 ${minutes}분 남음`;
    } else {
        text = `${minutes}분 남음`;
    }

    return { remainingMinutes, text, isCompleted: false, progressPercent };
}

/**
 * 지역 방어 권한 체크
 */
export const checkRegionalDefenseAuthority = (
    character: Character,
    cityName?: string,
    authorityLevel?: number
): {
    canCommand: boolean;
    reason?: string;
    isRegionalCommander: boolean;
    isHighRankMilitary: boolean;
} => {
    // 1. 지역 관리 모달의 authorityLevel이 2 이상이면 최고 지휘권 보유 (지역대장)
    const isRegionalCommander = (authorityLevel !== undefined && authorityLevel >= 2);
    
    // 2. 군사 계급이 대령 이상인지 체크
    let isHighRankMilitary = false;
    if (character.militaryRank) {
        const ranksInOrder = [
            MilitaryRank.PVT, MilitaryRank.PFC, MilitaryRank.CPL, MilitaryRank.SGT,
            MilitaryRank.SSG, MilitaryRank.SFC, MilitaryRank.MSG, MilitaryRank.WSG,
            MilitaryRank.SLT, MilitaryRank.FLT, MilitaryRank.CPT, MilitaryRank.MAJ,
            MilitaryRank.LTC, MilitaryRank.COL, MilitaryRank.BG, MilitaryRank.MG,
            MilitaryRank.LG, MilitaryRank.GEN
        ];
        const myRankIndex = ranksInOrder.indexOf(character.militaryRank);
        const colIndex = ranksInOrder.indexOf(MilitaryRank.COL);
        if (myRankIndex !== -1 && colIndex !== -1 && myRankIndex >= colIndex) {
            isHighRankMilitary = true;
        }
    }

    const canCommand = isRegionalCommander || isHighRankMilitary;
    let reason = '';
    if (!canCommand) {
        reason = '영지 방어 최고 지휘권은 지역대장으로 임명되었거나 대령 이상 계급에 도달해야 행사할 수 있습니다.';
    }

    return {
        canCommand,
        reason,
        isRegionalCommander,
        isHighRankMilitary
    };
};

/**
 * 도시별 방어 데이터 불러오기
 */
export const getRegionDefenseData = (character: Character, cityName: string): RegionDefenseData => {
    if (!character.militaryData) {
        character.militaryData = {} as any;
    }
    if (!(character.militaryData as any).regionDefense) {
        (character.militaryData as any).regionDefense = {};
    }

    const defenseMap = (character.militaryData as any).regionDefense;
    if (!defenseMap[cityName]) {
        defenseMap[cityName] = {
            garrisonIds: [],
            fortificationLevel: 1,
            threatLevel: 20,
            defensePower: 100,
            defenseLog: [`[방어 사령부 창설] ${cityName} 방어 체계가 공식 수립되었습니다.`]
        };
    }

    return defenseMap[cityName];
};

/**
 * 개별 대원의 방어 기여도 계산 (게임 내 종합 전투력 calculateCombatPower 반영)
 */
export const calculateMemberDefensePower = (member: Companion | SimpleStudent): number => {
    if (!member) return 0;
    try {
        const cp = calculateCombatPower(member as any);
        if (cp && cp > 0) return cp;
    } catch (e) {
        // fallback
    }
    const lvl = member.level || 1;
    const basePower = getHuntZoneRecommendedCP(lvl);
    const stats = member.stats as any;
    const statSum = ((stats?.str || 10) + (stats?.def || 10) + (stats?.agi || 10) + (stats?.int || 10) + (stats?.wis || 10)) * 2;
    return Math.floor(basePower + statSum);
};

/**
 * 영지 종합 방어력 재계산
 */
export const recalculateDefensePower = (
    defenseData: RegionDefenseData,
    allPersons: (Companion | SimpleStudent)[]
): number => {
    const fortBonus = FORTIFICATION_CONFIG[defenseData.fortificationLevel]?.defenseBonus || 1000;
    let garrisonSum = 0;

    defenseData.garrisonIds.forEach(id => {
        const person = allPersons.find(p => p.id === id);
        if (person) {
            garrisonSum += calculateMemberDefensePower(person);
        }
    });

    return fortBonus + garrisonSum;
};

/**
 * 방어 등급 평가 라벨 및 색상
 */
export const getDefenseRating = (power: number): { label: string; color: string; desc: string } => {
    if (power >= 120000) {
        return { label: '철벽 방어', color: 'text-emerald-400', desc: '어떤 마물이나 대규모 침공도 격퇴할 수 있는 무적의 방어망입니다.' };
    }
    if (power >= 60000) {
        return { label: '견고한 수비', color: 'text-blue-400', desc: '고위 마물의 습격도 안정적으로 방어할 수 있는 강대한 군세입니다.' };
    }
    if (power >= 25000) {
        return { label: '일반 경비', color: 'text-amber-400', desc: '중급 마물은 격퇴 가능하나 엘리트급 대형 침공에는 취약할 수 있습니다.' };
    }
    if (power >= 10000) {
        return { label: '기초 방비', color: 'text-orange-400', desc: '초기 방비만 갖추어져 있어 대규모 습격 시 피해가 우려됩니다.' };
    }
    return { label: '취약한 방비', color: 'text-rose-400', desc: '방어 전력이 극히 미흡하여 작은 습격에도 도시가 위험합니다.' };
};

/**
 * 긴급 위협 사태 발생 및 가문 서신 발송
 */
export function generateThreatEventAndMail(
    character: Character,
    cityName: string,
    specificTemplateIndex?: number
): { event: TerritoryThreatEvent; mailText: string } {
    const index = specificTemplateIndex !== undefined
        ? specificTemplateIndex % THREAT_EVENT_TEMPLATES.length
        : Math.floor(Math.random() * THREAT_EVENT_TEMPLATES.length);
    
    const template = THREAT_EVENT_TEMPLATES[index];
    const eventId = `threat_${cityName}_${Date.now()}`;
    const curDate = character.currentDate || '2000-03-02';
    const curTime = character.currentTime || '08:00';

    // HuntingMap 기반 해당 도시 권장 전투력 동적 산출 (미제공 시 템플릿 기본값 사용)
    const dynamicRecPower = calculateThreatRecommendedPower(character, cityName, template.severity);
    const recPower = Math.max(template.recommendedPower || 10000, dynamicRecPower);

    const event: TerritoryThreatEvent = {
        id: eventId,
        city: cityName,
        title: template.title,
        description: template.description,
        severity: template.severity,
        recommendedPower: recPower,
        occurredDate: curDate,
        occurredTime: curTime,
        threatIncreasePerDay: template.threatIncreasePerDay,
        lastEscalationDate: curDate,
        daysIgnored: 0,
        targetThreatReduction: template.threatReduction,
        bountyGold: template.bountyGold,
        bountyMerit: template.bountyMerit
    };

    const mailText = 
`[영지 긴급 서신] 비상 경보 발령

수신: ${cityName} 방어 사령관 귀하
발신: ${cityName} 수비 정찰대

사령관님, ${cityName} 외곽에서 긴급 위협 사태가 감지되었습니다.

• 발생 사태: ${template.title}
• 위협 등급: ${template.severity}
• 토벌 권장 전투력: ${recPower.toLocaleString()} (권장 전력 미달 시 작전 실패 및 전사 위험)
• 정찰 보고: ${template.description}
• 방치 시 피해: 매일 도시 위협도가 +${template.threatIncreasePerDay}%씩 폭증하고 치안이 급격히 무너집니다.

사태가 걷잡을 수 없이 커지기 전에 즉시 영지 관리의 영지 방어 사령부에서 주둔군을 출동시켜 선제 요격 작전을 개시해 주십시오!`;

    if (!character.messages) {
        character.messages = [];
    }

    character.messages.push({
        id: `mail_${eventId}`,
        role: 'ai',
        text: mailText,
        timestamp: Date.now()
    });

    return { event, mailText };
}

/**
 * 비상 요격 파견 작전 개시 함수
 */
export function startDefenseDispatch(
    character: Character,
    cityName: string,
    threatEvent: TerritoryThreatEvent,
    garrisonIds: string[],
    defensePower: number
): { dispatch: DefenseDispatch; mailText: string } {
    const curDate = character.currentDate || '2000-03-02';
    const curTime = character.currentTime || '08:00';
    const config = DISPATCH_SEVERITY_CONFIG[threatEvent.severity] || DISPATCH_SEVERITY_CONFIG['보통'];

    const { completionDate: returnDate, completionTime: returnTime } = calculateFortificationCompletion(
        curDate,
        curTime,
        config.durationMinutes
    );

    // 파견 보상 산정 (전력 비례 가산 포함, 골드 급증 방지 캡 적용)
    const powerBonus = Math.min(30000, Math.floor(defensePower * 0.1));
    const rewardGold = Math.floor(threatEvent.bountyGold * config.goldMultiplier) + powerBonus;
    const rewardMerit = Math.floor(threatEvent.bountyMerit * config.meritMultiplier);
    // 파견 대원 각자에게도 공적 수여 (지휘관과 동일하게 획득)
    const memberMerit = rewardMerit;
    const rewardBudget = config.budgetBonus + Math.floor(powerBonus * 1.5);
    const threatReduction = Math.max(threatEvent.targetThreatReduction, config.threatReduction);

    // 권장 전투력 대비 작전 실패 확률 산출 (권장 전투력보다 낮으면 실패 확률 존재)
    const recPower = threatEvent.recommendedPower || 1000;
    const failChance = calculateDispatchFailChance(defensePower, recPower);
    const roll = Math.random() * 100;
    const isFailed = failChance > 0 && roll < failChance;

    const dispatchId = `dispatch_${cityName}_${Date.now()}`;
    const dispatch: DefenseDispatch = {
        id: dispatchId,
        city: cityName,
        threatEventId: threatEvent.id,
        threatTitle: threatEvent.title,
        threatSeverity: threatEvent.severity,
        recommendedPower: recPower,
        actualPower: defensePower,
        failChance,
        isFailed,
        garrisonIds: [...garrisonIds],
        departureDate: curDate,
        departureTime: curTime,
        returnDate,
        returnTime,
        durationDays: config.durationDays,
        durationMinutes: config.durationMinutes,
        rewardGold,
        rewardMerit,
        memberMerit,
        rewardBudget,
        rewardItems: [],
        threatReduction,
        isCompleted: false
    };

    const mailText = 
`[영지 출정 서신] 비상 요격 부대 출동 보고

수신: ${cityName} 방어 사령관 귀하
발신: ${cityName} 주둔 방어 사령부

사령관님의 명령에 따라 주둔 방어군 ${garrisonIds.length}명이 [${threatEvent.title}] 토벌을 위해 작전지로 즉각 출격하였습니다.

• 출동 일시: ${curDate} ${curTime}
• 예정 작전 기간: ${config.durationDays}일간 전방 토벌 파견 수행
• 복귀 예정 일시: ${returnDate} ${returnTime}
• 출동 부대 규모: 정예 주둔 방어군 ${garrisonIds.length}명
• 부대 전력 평가: 현재 전력 ${defensePower.toLocaleString()} / 권장 전투력 ${recPower.toLocaleString()} ${
    failChance > 0 
        ? `(권장 전투력 미달: 작전 실패 위험 ${failChance}%, 실패 시 전원 전사)` 
        : '(권장 전투력 충족: 승리 확실)'
}
• 예상 토벌 보상: 소지금 +${rewardGold.toLocaleString()} 골드, 영지 예산 +${rewardBudget.toLocaleString()} G, 사령관 군공 +${rewardMerit}점, 파견 대원 각자 군공 +${memberMerit}점

작전 기간 동안 부대는 현지에 주둔하여 토벌을 완수하고, 귀환 일시에 맞춰 승전 보고를 올리겠습니다!`;

    if (!character.messages) {
        character.messages = [];
    }

    character.messages.push({
        id: `mail_dispatch_${dispatchId}`,
        role: 'ai',
        text: mailText,
        timestamp: Date.now()
    });

    return { dispatch, mailText };
}

/**
 * 파견 완료 및 보상 일괄 정산 함수
 * - 권장 전투력 미달로 실패 시: 출동 대원 전원 사망(전사) 처리, 위협도 폭증, 보상 없음, 비보 서신 발송
 * - 성공 시: 사령관 및 출동한 파견 대원 전원에게 군공 지급, 승전 서신 발송
 */
export function completeDefenseDispatch(
    character: Character,
    cityName: string,
    dispatch: DefenseDispatch
): {
    updatedCharacter: Character;
    mailText: string;
    rewardSummary: {
        gold: number;
        merit: number;
        memberMerit: number;
        creditedMembers: string[];
        budget: number;
        threatReduction: number;
        items: DefenseDispatchRewardItem[];
        isFailed?: boolean;
        casualties?: string[];
    };
} {
    const charCopy = JSON.parse(JSON.stringify(character)) as Character;

    if (!charCopy.militaryData) {
        charCopy.militaryData = {} as any;
    }
    if (!(charCopy.militaryData as any).regionDefense) {
        (charCopy.militaryData as any).regionDefense = {};
    }

    const currentDef: RegionDefenseData = (charCopy.militaryData as any).regionDefense[cityName];
    const regionStats = charCopy.militaryData?.regionStats?.[cityName];

    // [소탕 작전 실패 판정 시] 출동 대원 전원 전사 처리
    if (dispatch.isFailed) {
        const casualties: string[] = [];

        dispatch.garrisonIds.forEach(id => {
            // 동료 목록에서 탐색 및 사망 처리
            const comp = charCopy.companions.find(c => c.id === id);
            if (comp) {
                comp.isDead = true;
                casualties.push(comp.name);
                charCopy.companions = charCopy.companions.filter(c => c.id !== id);
            }
            // 대기 동료 목록에서 탐색 및 사망 처리
            if (charCopy.inactiveCompanions) {
                const inComp = charCopy.inactiveCompanions.find(c => c.id === id);
                if (inComp) {
                    inComp.isDead = true;
                    casualties.push(inComp.name);
                    charCopy.inactiveCompanions = charCopy.inactiveCompanions.filter(c => c.id !== id);
                }
            }
            // 사회적 인맥 목록에서 탐색 및 사망 처리
            if (charCopy.socialNetwork) {
                const soc = charCopy.socialNetwork.find((s: any) => s.id === id);
                if (soc) {
                    (soc as any).isDead = true;
                    casualties.push((soc as any).name);
                    charCopy.socialNetwork = charCopy.socialNetwork.filter((s: any) => s.id !== id);
                }
            }
        });

        // 주둔군 명단에서 전사한 대원 일괄 제적
        if (currentDef) {
            currentDef.garrisonIds = currentDef.garrisonIds.filter(id => !dispatch.garrisonIds.includes(id));
            currentDef.defensePower = recalculateDefensePower(currentDef, [
                ...charCopy.companions,
                ...(charCopy.inactiveCompanions || []),
                ...(charCopy.socialNetwork || [] as any[])
            ]);
            // 도시 위협도 폭증 (+20%)
            currentDef.threatLevel = Math.min(100, currentDef.threatLevel + 20);
            currentDef.activeDispatch = undefined; // 파견 상태 해제

            if (!currentDef.defenseLog) currentDef.defenseLog = [];
            currentDef.defenseLog.unshift(
                `[작전 실패 및 대원 전사] '${dispatch.threatTitle}' 요격에 나선 주둔군이 권장 전투력 부족으로 패배하고 전원 전사했습니다. (전사: ${casualties.join(', ') || '대원들'})`
            );
        }

        // 지역 치안 및 민심 급락
        if (regionStats) {
            regionStats.security = Math.max(0, (regionStats.security || 50) - 20);
            regionStats.sentiment = Math.max(0, (regionStats.sentiment || 50) - 15);
        }

        const deadDesc = casualties.length > 0 ? casualties.join(', ') : '출동 대원 전원';
        const mailText = 
`[영지 비보 서신] 비상 요격 작전 패배 및 대원 전사 통보

수신: ${cityName} 방어 사령관 귀하
발신: ${cityName} 주둔 방어군 지휘부

사령관님, 비통한 소식을 전합니다...
[${dispatch.threatTitle}] 토벌을 위해 출동했던 주둔 방어군이 권장 전투력 열세를 극복하지 못하고 작전에 실패하였습니다.

적의 막강한 전력과 불의의 기습에 밀려 출동했던 대원 (${deadDesc}) 전원이 장렬히 전사하였으며, 도시 외곽의 위협은 여전히 해소되지 못했습니다.

• 작전 결과: 토벌 실패 및 부대 전멸
• 전사 대원: ${deadDesc}
• 도시 위협도: +20% (현재 위협도 ${currentDef?.threatLevel || 0}%로 폭증)
• 지역 치안 및 민심: 치안 -20%, 민심 -15% 급락

영지의 안위를 위해 방어 진지를 보강하고 새로운 주둔군을 편성하여 신속히 위협에 맞서야 합니다.`;

        if (!charCopy.messages) {
            charCopy.messages = [];
        }
        charCopy.messages.push({
            id: `mail_dispatch_loss_${dispatch.id}`,
            role: 'ai',
            text: mailText,
            timestamp: Date.now()
        });

        return {
            updatedCharacter: charCopy,
            mailText,
            rewardSummary: {
                gold: 0,
                merit: 0,
                memberMerit: 0,
                creditedMembers: [],
                budget: 0,
                threatReduction: 0,
                items: [],
                isFailed: true,
                casualties
            }
        };
    }

    // [소탕 작전 성공 판정 시]
    // 1. 개인 소지금 및 사령관 군공 지급
    charCopy.money = (charCopy.money || 0) + dispatch.rewardGold;
    charCopy.militaryData.merit = (charCopy.militaryData.merit || 0) + dispatch.rewardMerit;

    // 2. 파견 대원 각자에게 군공 지급
    const memberMeritAmount = dispatch.memberMerit || dispatch.rewardMerit;
    const creditedMembers: string[] = [];

    dispatch.garrisonIds.forEach(id => {
        // 동료 목록에서 탐색
        const comp = charCopy.companions.find(c => c.id === id);
        if (comp) {
            comp.merit = (comp.merit || 0) + memberMeritAmount;
            creditedMembers.push(comp.name);
            return;
        }
        // 대기 동료 목록에서 탐색
        const inComp = (charCopy.inactiveCompanions || []).find(c => c.id === id);
        if (inComp) {
            inComp.merit = (inComp.merit || 0) + memberMeritAmount;
            creditedMembers.push(inComp.name);
            return;
        }
        // 인맥 목록에서 탐색
        const soc = (charCopy.socialNetwork || []).find((s: any) => s.id === id);
        if (soc) {
            (soc as any).merit = ((soc as any).merit || 0) + memberMeritAmount;
            creditedMembers.push((soc as any).name);
        }
    });

    // 3. 영지 예산 및 치안, 민심 개선
    if (regionStats) {
        regionStats.budget = (regionStats.budget || 0) + dispatch.rewardBudget;
        regionStats.security = Math.min(100, (regionStats.security || 50) + 15);
        regionStats.sentiment = Math.min(100, (regionStats.sentiment || 50) + 10);
    }

    // 4. 도시 위협도 대폭 감소 및 사태 종결
    if (currentDef) {
        currentDef.threatLevel = Math.max(0, currentDef.threatLevel - dispatch.threatReduction);
        currentDef.activeThreatEvent = undefined; // 위협 사태 완전 해결!
        currentDef.activeDispatch = undefined; // 파견 상태 해제 및 부대 복귀!

        if (!currentDef.defenseLog) currentDef.defenseLog = [];
        currentDef.defenseLog.unshift(
            `[파견 작전 승전] 주둔군이 '${dispatch.threatTitle}' 토벌을 성공리에 완수하고 영지로 무사 복귀했습니다. (위협도 -${dispatch.threatReduction}%)`
        );
    }

    // 5. 가문 서신 발송 (전리품 없이 군공 및 정산 내용만 명시)
    const membersDesc = creditedMembers.length > 0 
        ? `${creditedMembers.join(', ')} (총 ${creditedMembers.length}명)`
        : `주둔 대원 ${dispatch.garrisonIds.length}명`;

    const mailText = 
`[영지 승전 서신] 비상 요격 작전 완수 및 부대 복귀 보고

수신: ${cityName} 방어 사령관 귀하
발신: ${cityName} 주둔 방어군 지휘부

사령관님! 작전지에 파견되었던 주둔 방어군이 수일간의 격전 끝에 [${dispatch.threatTitle}] 토벌을 완벽히 완수하고 무사히 영지로 귀환하였습니다.

• 토벌 결과: 위협 사태 완전 소탕 및 평정
• 도시 위협도 완화: -${dispatch.threatReduction}% (안정화 완료)
• 지역 치안 및 민심: 치안 +15%, 민심 +10% 회복
• 파견 지급 보상:
  - 개인 소지금: +${dispatch.rewardGold.toLocaleString()} 골드
  - 영지 지원 예산: +${dispatch.rewardBudget.toLocaleString()} G
  - 사령관 군공: +${dispatch.rewardMerit}점
  - 파견 대원 군공: ${membersDesc} 각자 군공 +${memberMeritAmount}점 수여

출동했던 주둔 방어군 대원 전원이 건강히 주둔지로 복귀하여 경비 태세를 정상 재개하였습니다!`;

    if (!charCopy.messages) {
        charCopy.messages = [];
    }
    charCopy.messages.push({
        id: `mail_dispatch_win_${dispatch.id}`,
        role: 'ai',
        text: mailText,
        timestamp: Date.now()
    });

    return {
        updatedCharacter: charCopy,
        mailText,
        rewardSummary: {
            gold: dispatch.rewardGold,
            merit: dispatch.rewardMerit,
            memberMerit: memberMeritAmount,
            creditedMembers,
            budget: dispatch.rewardBudget,
            threatReduction: dispatch.threatReduction,
            items: []
        }
    };
}

/**
 * 시간 경과에 따른 영지 방어 상태 동기화
 * 1. 진지 보강 공사 완공 자동 승인/안내
 * 2. 비상 요격 파견 작전의 기간 경과 및 부대 복귀 완수 처리
 * 3. 방치된 긴급 위협 사태의 도시 위협도 증가 및 치안 하락 (파견 중이 아닐 때만)
 */
export function syncRegionDefenseTimeTick(
    character: Character,
    targetCity?: string
): { updatedCharacter: Character; logs: string[] } {
    const charCopy = JSON.parse(JSON.stringify(character)) as Character;
    const logs: string[] = [];
    const curDate = charCopy.currentDate || '2000-03-02';
    const curTime = charCopy.currentTime || '08:00';

    if (!charCopy.militaryData) {
        charCopy.militaryData = {} as any;
    }
    if (!(charCopy.militaryData as any).regionDefense) {
        (charCopy.militaryData as any).regionDefense = {};
    }

    const defenseMap = (charCopy.militaryData as any).regionDefense;
    const citiesToCheck = targetCity ? [targetCity] : Object.keys(defenseMap);

    citiesToCheck.forEach(cityName => {
        const defData: RegionDefenseData = defenseMap[cityName];
        if (!defData) return;

        // 1. 공사 완공 점검
        if (defData.construction) {
            const timeInfo = getFortificationRemainingTime(
                curDate,
                curTime,
                defData.construction.completionDate,
                defData.construction.completionTime,
                defData.construction.durationMinutes
            );

            if (timeInfo.isCompleted) {
                const targetLvl = defData.construction.targetLevel;
                const nextInfo = FORTIFICATION_CONFIG[targetLvl];
                defData.fortificationLevel = targetLvl;
                defData.construction = undefined;
                defData.threatLevel = Math.max(0, defData.threatLevel - 15);
                
                logs.push(`[영지 방어] ${cityName}의 방어 진지 보강 공사가 완공되어 '${nextInfo.label}' 구축이 완료되었습니다!`);

                if (!charCopy.messages) charCopy.messages = [];
                charCopy.messages.push({
                    id: `mail_fort_done_${cityName}_${Date.now()}`,
                    role: 'ai',
                    text: `[영지 서신] 방어 진지 준공 보고\n\n수신: ${cityName} 방어 사령관 귀하\n\n${cityName} 방어 진지 보강 공사가 차질 없이 완공되었습니다.\n• 완공 시설: ${nextInfo.label} (진지 등급 ${targetLvl}단계)\n• 방어력 상승: +${nextInfo.defenseBonus}점\n• 도시 위협도 완화: -15%\n\n철벽의 수비망으로 영지 방비가 더욱 견고해졌습니다!`,
                    timestamp: Date.now()
                });
            }
        }

        // 2. 비상 파견 작전 기간 경과 및 부대 복귀 자동 처리
        if (defData.activeDispatch) {
            const dispatchTimeInfo = getDispatchRemainingTime(
                curDate,
                curTime,
                defData.activeDispatch.returnDate,
                defData.activeDispatch.returnTime,
                defData.activeDispatch.durationMinutes
            );

            if (dispatchTimeInfo.isCompleted) {
                // 파견 임무 완수 및 부대 복귀 자동 정산!
                const completeRes = completeDefenseDispatch(charCopy, cityName, defData.activeDispatch);
                // charCopy 상태 갱신
                Object.assign(charCopy, completeRes.updatedCharacter);
                if (completeRes.rewardSummary.isFailed) {
                    logs.push(`[영지 방어 비보] ${cityName} 주둔 방어군이 '${defData.activeDispatch.threatTitle}' 요격 작전에서 전멸하고 전원 전사했습니다...`);
                } else {
                    logs.push(`[영지 방어] ${cityName}에 파견되었던 주둔 방어군이 '${defData.activeDispatch.threatTitle}' 토벌을 완수하고 무사히 복귀했습니다!`);
                }
                return;
            }
        }

        // 3. 방치된 긴급 위협 사태 경과 및 위협도 폭증 (파견 출동 중이 아닐 때만 위협도 증가)
        if (defData.activeThreatEvent && !defData.activeThreatEvent.isResolved && !defData.activeDispatch) {
            const daysPassed = getDaysDifference(defData.activeThreatEvent.lastEscalationDate, curDate);
            if (daysPassed > 0) {
                const inc = daysPassed * defData.activeThreatEvent.threatIncreasePerDay;
                defData.threatLevel = Math.min(100, defData.threatLevel + inc);
                defData.activeThreatEvent.daysIgnored += daysPassed;
                defData.activeThreatEvent.lastEscalationDate = curDate;

                // 지역 치안도 하락
                if (charCopy.militaryData?.regionStats?.[cityName]) {
                    const stats = charCopy.militaryData.regionStats[cityName];
                    stats.security = Math.max(0, stats.security - (daysPassed * 3));
                    stats.sentiment = Math.max(0, stats.sentiment - (daysPassed * 2));
                }

                logs.push(`[영지 경보] ${cityName}의 긴급 위협(${defData.activeThreatEvent.title})이 방치되어 도시 위협도가 ${defData.threatLevel}%로 치솟았습니다!`);

                // 위협도가 위험 수준에 도달했을 때 추가 경고 서신 발송
                if (defData.threatLevel >= 65) {
                    if (!charCopy.messages) charCopy.messages = [];
                    charCopy.messages.push({
                        id: `mail_threat_warning_${cityName}_${Date.now()}`,
                        role: 'ai',
                        text: `[영지 경고 서신] 비상 경보 격상\n\n수신: ${cityName} 방어 사령관 귀하\n\n${cityName}의 긴급 사태를 신속히 해결하지 않아 도시 위협도가 ${defData.threatLevel}%까지 치솟았습니다!\n영민들의 불안감이 극에 달하고 치안이 붕괴되고 있으니 즉시 비상 요격 작전을 결단해 주십시오!`,
                        timestamp: Date.now()
                    });
                }
            }
        }
    });

    return { updatedCharacter: charCopy, logs };
}
