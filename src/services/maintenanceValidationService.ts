import { Character, Base, JobType } from '../types';
import { addDays } from '../utils';

export interface MaintenanceProjectionResult {
    isShortage: boolean; // 유지비 부족 여부
    currentGold: number; // 현재 보유 골드
    totalRequiredGold: number; // 총 필요 골드
    shortageAmount: number; // 부족한 골드
    totalDays: number; // 경과 일수
    dailyMilitaryFee: number; // 부대 일일 유지비
    totalMilitaryFee: number; // 기간 내 총 부대 유지비
    totalSoldiers: number; // 부대원 총원
    monthlyBaseFee: number; // 1회 월간 기지 유지비
    passedFirstDays: string[]; // 기간 내 포함된 1일(월초) 날짜 목록
    totalBaseFee: number; // 기간 내 총 기지 유지비
    unpaidMaintenance: number; // 기존 누적 미납액
    hasBase: boolean; // 기지 보유 여부
    currentOverdueMonths: number; // 현재 체납 개월 수
    warnings: string[]; // 단계별 불이익 및 주의사항 목록
}

/**
 * 기지 1회 월간 유지비 산정
 * 공식: (기지 레벨 × 10,000G) + (시설 개수 × 1,000G × 시설들 레벨 합계)
 */
export function calculateMonthlyBaseMaintenance(base?: Base): {
    total: number;
    baseLevelFee: number;
    facilityFee: number;
    facilityCount: number;
    facilityLevelsSum: number;
} {
    if (!base || (!base.layout?.length && (!base.level || base.level <= 0))) {
        return {
            total: 0,
            baseLevelFee: 0,
            facilityFee: 0,
            facilityCount: 0,
            facilityLevelsSum: 0
        };
    }

    const baseLevel = base.level || 1;
    const baseLevelFee = baseLevel * 10000;
    const validFacilities = (base.layout || []).filter(inst => inst && inst.type);
    const facilityCount = validFacilities.length;
    const facilityLevelsSum = validFacilities.reduce((sum, inst) => sum + (inst.level || 1), 0);
    const facilityFee = facilityCount * 1000 * facilityLevelsSum;
    const total = baseLevelFee + facilityFee;

    return {
        total,
        baseLevelFee,
        facilityFee,
        facilityCount,
        facilityLevelsSum
    };
}

/**
 * 부대 일일 유지비 산정 (부대원 1명당 10,000G)
 */
export function calculateDailyMilitaryMaintenance(character: Character): {
    totalSoldiers: number;
    dailyFee: number;
} {
    const isPlayerSoldier = character.job === JobType.SOLDIER;
    const militaryCompanions = (character.companions || []).filter(c => c && c.job === JobType.SOLDIER);
    const totalSoldiers = (isPlayerSoldier ? 1 : 0) + militaryCompanions.length;
    const dailyFee = totalSoldiers * 10000;

    return {
        totalSoldiers,
        dailyFee
    };
}

/**
 * 주어진 시작일로부터 n일 동안 지나는 날짜 중 '01일(매월 1일)' 목록을 반환
 */
export function getPassedFirstDays(startDate: string, daysCount: number): string[] {
    const firstDays: string[] = [];
    if (!startDate || daysCount <= 0) return firstDays;

    for (let i = 1; i <= daysCount; i++) {
        const d = addDays(startDate, i);
        if (d && d.endsWith('-01')) {
            firstDays.push(d);
        }
    }

    return firstDays;
}

/**
 * 시간 건너뛰기 전 유지비 잔액 사전 검증
 * 장기 휴식, 수련 등으로 며칠 또는 몇 주를 한 번에 건너뛸 때 골드 부족 여부 분석
 */
export function checkMaintenanceShortageBeforeTimeSkip(
    character: Character,
    advanceMinutes: number = 0,
    advanceDays: number = 0
): MaintenanceProjectionResult {
    const currentGold = character.money || 0;
    const startDate = character.currentDate || '2000-03-02';

    // 총 경과 일수 (분 단위 시간도 1440분 이상이면 일수로 환산)
    const extraDaysFromMinutes = Math.floor(advanceMinutes / 1440);
    const totalDays = Math.max(0, advanceDays + extraDaysFromMinutes);

    // 1. 부대 유지비 계산
    const { totalSoldiers, dailyFee: dailyMilitaryFee } = calculateDailyMilitaryMaintenance(character);
    // 일 단위 건너뛰기면 날마다 차감, 24시간 미만이면 당일 정산 시점에 1회 발생 가능
    const effectiveDaysForMilitary = totalDays > 0 ? totalDays : (advanceMinutes >= 720 ? 1 : 0);
    const totalMilitaryFee = dailyMilitaryFee * effectiveDaysForMilitary;

    // 2. 기지 유지비 계산
    const base = character.base;
    const hasBase = !!(base && (base.resources || (base.level && base.level > 0)));
    const { total: monthlyBaseFee } = calculateMonthlyBaseMaintenance(base);

    // 기간 중 통과하는 월초(1일) 목록
    const passedFirstDays = totalDays > 0 ? getPassedFirstDays(startDate, totalDays) : [];
    
    // 만약 시간 단위 건너뛰기(예: 8시간, 12시간)인데 자정이나 8시를 넘겨 1일로 진입하는 경우 체크
    if (totalDays === 0 && advanceMinutes > 0) {
        const [curHour, curMin] = (character.currentTime || '08:00').split(':').map(Number);
        const totalMin = curHour * 60 + curMin + advanceMinutes;
        const addDaysCount = Math.floor(totalMin / 1440);
        if (addDaysCount > 0) {
            const nextDate = addDays(startDate, addDaysCount);
            if (nextDate.endsWith('-01')) {
                passedFirstDays.push(nextDate);
            }
        }
    }

    const totalBaseFee = hasBase ? monthlyBaseFee * passedFirstDays.length : 0;
    const unpaidMaintenance = (hasBase && base?.unpaidMaintenance) ? base.unpaidMaintenance : 0;

    // 총 필요 골드
    const totalRequiredGold = totalMilitaryFee + totalBaseFee + unpaidMaintenance;
    const isShortage = currentGold < totalRequiredGold && totalRequiredGold > 0;
    const shortageAmount = isShortage ? totalRequiredGold - currentGold : 0;

    // 경고 및 불이익 안내 목록 작성
    const warnings: string[] = [];
    const currentOverdueMonths = base?.overdueMonths || 0;

    if (isShortage) {
        if (totalMilitaryFee > 0 && currentGold < totalMilitaryFee) {
            warnings.push("부대 유지비 부족: 부대원 보급이 지연되어 사기와 충성도가 하락하며, 장기 체납 시 부대 이탈 위험이 있습니다.");
        }
        if (passedFirstDays.length > 0 && totalBaseFee > 0) {
            const projectedOverdue = currentOverdueMonths + passedFirstDays.length;
            if (projectedOverdue === 1) {
                warnings.push("기지 유지비 체납 1단계: 강제 차감 대신 유예되나 영지 시설 자원 생산량이 50%로 감소합니다.");
            } else if (projectedOverdue === 2) {
                warnings.push("기지 유지비 체납 2단계: 시설 생산량이 25%로 급감하고 기지 내 모든 동료의 충성도와 사기가 하락합니다.");
            } else {
                warnings.push("기지 유지비 체납 3단계: 장기 체납으로 기지 내 모든 시설 가동이 일시 전면 중단됩니다.");
            }
        }
        if (unpaidMaintenance > 0) {
            warnings.push(`기존 미납액 ${unpaidMaintenance.toLocaleString()}G가 누적되어 있어 우선 정산이 필요합니다.`);
        }
    }

    return {
        isShortage,
        currentGold,
        totalRequiredGold,
        shortageAmount,
        totalDays,
        dailyMilitaryFee,
        totalMilitaryFee,
        totalSoldiers,
        monthlyBaseFee,
        passedFirstDays,
        totalBaseFee,
        unpaidMaintenance,
        hasBase,
        currentOverdueMonths,
        warnings
    };
}

/**
 * 기지 미납 유지비 수동 즉시 납부 (체납 해제 처리)
 */
export function payOffBaseMaintenance(character: Character): {
    success: boolean;
    updatedCharacter: Character;
    message: string;
} {
    const updated = JSON.parse(JSON.stringify(character)) as Character;
    const base = updated.base;

    if (!base || !base.unpaidMaintenance || base.unpaidMaintenance <= 0) {
        return {
            success: false,
            updatedCharacter: character,
            message: "현재 체납된 기지 유지비가 없습니다."
        };
    }

    const unpaid = base.unpaidMaintenance;
    if ((updated.money || 0) < unpaid) {
        return {
            success: false,
            updatedCharacter: character,
            message: `보유 골드가 부족합니다. (필요: ${unpaid.toLocaleString()}G, 보유: ${(updated.money || 0).toLocaleString()}G)`
        };
    }

    updated.money -= unpaid;
    base.unpaidMaintenance = 0;
    base.overdueMonths = 0;
    base.isFacilitySuspended = false;

    return {
        success: true,
        updatedCharacter: updated,
        message: `체납된 기지 유지비 ${unpaid.toLocaleString()}G를 완납했습니다! 모든 시설이 정상 가동됩니다.`
    };
}
