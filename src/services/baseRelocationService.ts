import { Character, Location } from '../types';
import { calculateTravelCostAndDays } from './travelCalculationService';
import { advanceGameTime } from './gameTimeService';
import { calculateFinalStats } from '../utils';

export interface BaseRelocationCosts {
    gold: number;
    wood: number;
    stone: number;
    food: number;
}

export interface BaseRelocationPlan {
    originLocation: Location;
    destination: Location;
    totalMinutes: number;
    days: number;
    durationText: string;
    costs: BaseRelocationCosts;
    canAfford: boolean;
    missingResources: string[];
}

export interface BaseRelocationResult {
    updatedCharacter: Character;
    systemLogs: string[];
    dailyReport?: any;
    toastNotice?: string;
    durationText: string;
}

/**
 * 기지 이사에 필요한 정확한 소요 시간(MapModal과 100% 동일) 및 자원 비용을 계산합니다.
 */
export function calculateBaseRelocationPlan(
    character: Character,
    destination: Location,
    explicitMinutes?: number
): BaseRelocationPlan {
    const originLocation: Location = character.base?.location || character.currentLocation || {
        region: '아시아',
        nation: '대한민국',
        city: '서울'
    };

    const travelCalc = calculateTravelCostAndDays(originLocation, destination, character);
    const totalMinutes = explicitMinutes !== undefined && explicitMinutes > 0
        ? explicitMinutes
        : (travelCalc.totalMinutes > 0 ? travelCalc.totalMinutes : 60);

    const durationText = travelCalc.durationText || `${Math.max(1, Math.round(totalMinutes / 60))}시간`;
    const days = travelCalc.days;

    // 기지 전체 및 전 거주민 이동에 필요한 자원 계산 (시간 비율에 따라 합리적으로 산정)
    const totalResidents = 1 + (character.companions?.length || 0) + (character.inactiveCompanions?.length || 0);
    const daysRatio = Math.max(0.1, totalMinutes / 1440);

    const goldCost = Math.max(1000, Math.round(50000 * daysRatio));
    const woodCost = Math.max(5, Math.round(100 * daysRatio));
    const stoneCost = Math.max(5, Math.round(100 * daysRatio));
    const foodCost = Math.max(totalResidents, Math.round(totalResidents * Math.max(1, Math.ceil(daysRatio))));

    const costs: BaseRelocationCosts = {
        gold: goldCost,
        wood: woodCost,
        stone: stoneCost,
        food: foodCost
    };

    const baseRes = character.base?.resources || {
        gold: 0,
        wood: 0,
        stone: 0,
        food: 0,
        iron: 0,
        manaCrystal: 0
    };

    const missingResources: string[] = [];
    if (baseRes.wood < woodCost) {
        missingResources.push(`목재 ${woodCost - baseRes.wood}개`);
    }
    if (baseRes.stone < stoneCost) {
        missingResources.push(`석재 ${stoneCost - baseRes.stone}개`);
    }
    if ((character.money || 0) < goldCost) {
        missingResources.push(`골드 ${(goldCost - (character.money || 0)).toLocaleString()}G`);
    }
    if (baseRes.food < foodCost) {
        missingResources.push(`식량 ${foodCost - baseRes.food}개`);
    }

    const canAfford = missingResources.length === 0;

    return {
        originLocation,
        destination,
        totalMinutes,
        days,
        durationText,
        costs,
        canAfford,
        missingResources
    };
}

/**
 * 기지 이사를 실행하고 실제 게임 시간을 정확하게 소요시킵니다.
 */
export function executeBaseRelocation(
    character: Character,
    destination: Location,
    totalMinutes: number,
    costs: BaseRelocationCosts
): BaseRelocationResult {
    // 1. 실제 게임 시간 경과 (gameTimeService advanceGameTime 호출로 모든 일차 결산 및 시설 완공 등 완벽 연동)
    const timeResult = advanceGameTime(character, totalMinutes, {
        activityName: `기지 이사 (${destination.city})`
    });

    const newChar: Character = { ...timeResult.updatedCharacter };

    // 2. 자원 및 비용 차감
    newChar.money = Math.max(0, newChar.money - costs.gold);
    if (newChar.base) {
        newChar.base = {
            ...newChar.base,
            location: destination,
            resources: {
                ...newChar.base.resources,
                wood: Math.max(0, (newChar.base.resources.wood || 0) - costs.wood),
                stone: Math.max(0, (newChar.base.resources.stone || 0) - costs.stone),
                food: Math.max(0, (newChar.base.resources.food || 0) - costs.food)
            }
        };
    }
    newChar.currentLocation = destination;

    // 3. 이동 중 휴식으로 인한 체력/마력 완전 회복
    const heal = (entity: any) => {
        if (!entity || !entity.stats) return;
        const { finalStats } = calculateFinalStats(entity);
        entity.stats.hp = finalStats.maxHp;
        entity.stats.mp = finalStats.maxMp;
        entity.statusEffects = entity.statusEffects || [];
    };

    heal(newChar);
    newChar.companions?.forEach(heal);
    newChar.inactiveCompanions?.forEach(heal);

    const originCity = character.base?.location?.city || character.currentLocation?.city || '이전 지역';
    const travelCalc = calculateTravelCostAndDays(character.base?.location || character.currentLocation, destination, character);
    const durationText = travelCalc.durationText || `${Math.max(1, Math.round(totalMinutes / 60))}시간`;

    const logs: string[] = [
        ...(timeResult.systemLogs || []),
        `[기지 이사] ${originCity}에서 ${destination.nation} ${destination.city}(으)로 기지를 성공적으로 이사했습니다. (소요 시간: ${durationText})`,
        `[기지 이사] 장거리 여정 동안 충분한 휴식을 취하여 모든 동료가 체력과 마력을 완전히 회복했습니다.`
    ];

    return {
        updatedCharacter: newChar,
        systemLogs: logs,
        dailyReport: timeResult.dailyReport,
        toastNotice: timeResult.toastNotice,
        durationText
    };
}
