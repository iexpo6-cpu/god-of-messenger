import { Character, Companion, TrainerRank, TrainerBranch, TRAINER_RANK_CONFIG, JobType, CombatTrainingTrainee, CombatTrainingReportItem, FacilityInstance, WeaponType, SkillType } from '../types';
import { getTrainerBranchMultiplier, calculateFinalStats, getRequiredExp, getStatPointsPerLevel, addMasteryExp } from '../utils';
import { getReducedMpCostOnLevelUp } from './skillMpService';
import { WEAPON_TYPE_KOREAN } from '../constants';

export interface TrainingRates {
    greatSuccessRate: number; // 0 ~ 1
    successRate: number;      // 0 ~ 1
    failRate: number;         // 0 ~ 1
    trainerRank: TrainerRank | null;
    trainerName: string;
    trainerLabel: string;
}

export interface TrainingRollResult {
    greatSuccessCount: number;
    successCount: number;
    failCount: number;
    totalSuccesses: number;
    rates: TrainingRates;
}

export const MAX_TRAINER_STACK_COUNT = 10;
export const MAX_DAILY_TRAINING_LIMIT = 1000;
export const TRAIN_COUNT_PER_FACILITY = 1;

export interface FacilityTrainingLimitInfo {
    totalLimit: number;
    facilityCount: number;
    facilityBonus: number;
    trainerCount: number;
    trainerBonus: number;
}

/**
 * 훈련소 시설별 일일 최대 훈련 가능 횟수 상세 정보 계산
 * - 해당 종류의 훈련소 시설 개수(1개당 +1회) + 해당 훈련소 시설에 직접 배치된 트레이너의 등급 가산치 합산
 * - 배치된 트레이너 최대 10명분 누적, 일일 최대 1,000회
 * - 견습(+1) ➔ 초급(+5) ➔ 중급(+10) ➔ 고급(+15) ➔ 숙련(+25) ➔ 전문(+50) ➔ 마스터(+75) ➔ 레전드(+100회)
 */
export const getFacilityTrainingLimitInfo = (
    character: Character,
    facilityType: string
): FacilityTrainingLimitInfo => {
    const instances = character.base?.layout?.filter(inst =>
        (inst.type === facilityType || (facilityType === 'training_exp' && inst.type === 'training')) &&
        !inst.underConstruction &&
        (inst.level || 0) > 0
    ) || [];

    const facilityCount = instances.length;
    if (facilityCount === 0) {
        return {
            totalLimit: 0,
            facilityCount: 0,
            facilityBonus: 0,
            trainerCount: 0,
            trainerBonus: 0
        };
    }

    const facilityBonus = facilityCount * TRAIN_COUNT_PER_FACILITY;

    const allActors: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    const seenIds = new Set<string>();
    const trainerBonuses: number[] = [];

    const addTrainerIfValid = (actor: Character | Companion | undefined, key: string) => {
        if (!actor || seenIds.has(key)) return;
        if ((actor as any).isDead || (actor as any).isMonster || (actor as any).monsterData) return;
        if (actor.job !== JobType.TRAINER && (actor.job as string) !== '트레이너') return;

        seenIds.add(key);
        const rank = (actor as any).trainerRank || (actor as any).trainerProfile?.rank || TrainerRank.APPRENTICE;
        const rankCfg = TRAINER_RANK_CONFIG[rank as TrainerRank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
        trainerBonuses.push(rankCfg.dailyCount);
    };

    // 오직 해당 훈련소 시설 인스턴스에 직접 배치된 트레이너만 집계
    instances.forEach(inst => {
        const assignedIds: string[] = [
            ...(character.base?.multiAssignments?.[inst.id] || []),
            ...(character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id] as string] : [])
        ];
        assignedIds.forEach(assigneeId => {
            if (!assigneeId) return;
            const actor = assigneeId === 'player'
                ? character
                : allActors.find(c => ('id' in c ? c.id : 'player') === assigneeId);
            addTrainerIfValid(actor, assigneeId);
        });
    });

    // 레거시/직접 시설 타입 키 배치가 있는 경우 함께 확인
    const directTypeAssignee = character.base?.assignments?.[facilityType];
    if (directTypeAssignee) {
        const actor = directTypeAssignee === 'player'
            ? character
            : allActors.find(c => ('id' in c ? c.id : 'player') === directTypeAssignee);
        addTrainerIfValid(actor, directTypeAssignee);
    }

    // 높은 등급의 배치 트레이너부터 최대 10명분까지 누적
    trainerBonuses.sort((a, b) => b - a);
    const stackedTrainerBonus = trainerBonuses
        .slice(0, MAX_TRAINER_STACK_COUNT)
        .reduce((sum, count) => sum + count, 0);

    const totalLimit = Math.min(MAX_DAILY_TRAINING_LIMIT, facilityBonus + stackedTrainerBonus);

    return {
        totalLimit,
        facilityCount,
        facilityBonus,
        trainerCount: trainerBonuses.length,
        trainerBonus: stackedTrainerBonus
    };
};

/**
 * 훈련소 시설별 일일 최대 훈련 가능 횟수 계산
 */
export const calculateFacilityTrainingLimit = (
    character: Character,
    facilityType: string
): number => {
    return getFacilityTrainingLimitInfo(character, facilityType).totalLimit;
};

/**
 * 특정 훈련 시설(또는 분과)에 직접 배치된 최고 등급 트레이너 조회
 */
export const getAssignedTrainerInfo = (
    character: Character,
    facilityType: 'training_exp' | 'training_stat' | 'training_mastery'
): { rank: TrainerRank | null; name: string; label: string } => {
    if (!character.base) return { rank: null, name: '미배치', label: '미배치' };

    const allComps: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    const instances = character.base.layout?.filter(inst => 
        (inst.type === facilityType || (facilityType === 'training_exp' && inst.type === 'training')) &&
        !inst.underConstruction &&
        (inst.level || 0) > 0
    ) || [];
    let bestRank: TrainerRank | null = null;
    let bestOrder = 0;
    let bestName = '';

    const checkAssignee = (assigneeId?: string) => {
        if (!assigneeId) return;
        const assignee = assigneeId === 'player' ? character : allComps.find(c => ('id' in c ? c.id : 'player') === assigneeId);
        if (assignee && (assignee.job === JobType.TRAINER || (assignee.job as string) === '트레이너')) {
            const rank = (assignee as any).trainerRank || (assignee as any).trainerProfile?.rank || TrainerRank.APPRENTICE;
            const order = TRAINER_RANK_CONFIG[rank as TrainerRank]?.order || 1;
            if (order > bestOrder) {
                bestOrder = order;
                bestRank = rank as TrainerRank;
                bestName = assignee.name;
            }
        }
    };

    instances.forEach(inst => {
        const assignedIds: string[] = [
            ...(character.base?.multiAssignments?.[inst.id] || []),
            ...(character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id] as string] : [])
        ];
        assignedIds.forEach(checkAssignee);
    });

    if (character.base?.assignments?.[facilityType]) {
        checkAssignee(character.base.assignments[facilityType]);
    }

    if (bestRank) {
        const cfg = TRAINER_RANK_CONFIG[bestRank];
        return {
            rank: bestRank,
            name: bestName,
            label: cfg ? cfg.label : `${bestRank} 트레이너`
        };
    }

    return { rank: null, name: '미배치', label: '미배치' };
};

/**
 * 트레이너 등급에 따른 훈련 성공/실패 확률 계산
 * - 트레이너 등급이 높을수록 실패 확률이 대폭 감소하고 대성공 및 성공 확률이 증가합니다.
 */
export const getTrainingRates = (
    character: Character,
    facilityType: 'training_exp' | 'training_stat' | 'training_mastery'
): TrainingRates => {
    const trainerInfo = getAssignedTrainerInfo(character, facilityType);
    const rank = trainerInfo.rank;

    let greatSuccessRate = 0.10; // 10%
    let successRate = 0.50;      // 50%
    let failRate = 0.40;         // 40%

    if (rank === TrainerRank.APPRENTICE) {
        greatSuccessRate = 0.12;
        successRate = 0.53;
        failRate = 0.35;
    } else if (rank === TrainerRank.NOVICE) {
        greatSuccessRate = 0.14;
        successRate = 0.56;
        failRate = 0.30;
    } else if (rank === TrainerRank.INTERMEDIATE) {
        greatSuccessRate = 0.16;
        successRate = 0.59;
        failRate = 0.25;
    } else if (rank === TrainerRank.ADVANCED) {
        greatSuccessRate = 0.18;
        successRate = 0.62;
        failRate = 0.20;
    } else if (rank === TrainerRank.SKILLED) {
        greatSuccessRate = 0.20;
        successRate = 0.65;
        failRate = 0.15;
    } else if (rank === TrainerRank.PROFESSIONAL) {
        greatSuccessRate = 0.24;
        successRate = 0.66;
        failRate = 0.10;
    } else if (rank === TrainerRank.MASTER) {
        greatSuccessRate = 0.28;
        successRate = 0.67;
        failRate = 0.05;
    } else if (rank === TrainerRank.LEGEND) {
        greatSuccessRate = 0.35;
        successRate = 0.65;
        failRate = 0.00; // 레전드 트레이너는 실패율 0%!
    }

    return {
        greatSuccessRate,
        successRate,
        failRate,
        trainerRank: rank,
        trainerName: trainerInfo.name,
        trainerLabel: trainerInfo.label
    };
};

/**
 * 1회당 개별 독립 확률로 N회 훈련 판정 수행
 */
export const executeBatchTrainingRolls = (
    amount: number,
    rates: TrainingRates
): TrainingRollResult => {
    let greatSuccessCount = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < amount; i++) {
        const roll = Math.random();
        if (roll < rates.greatSuccessRate) {
            greatSuccessCount++;
        } else if (roll < rates.greatSuccessRate + rates.successRate) {
            successCount++;
        } else {
            failCount++;
        }
    }

    return {
        greatSuccessCount,
        successCount,
        failCount,
        totalSuccesses: greatSuccessCount + successCount,
        rates
    };
};

/**
 * 훈련 결과 요약 문구 생성
 */
export const buildTrainingResultSummary = (
    rollResult: TrainingRollResult,
    amount: number,
    multiplier: number,
    branchName: string
): { title: string; msg: string; resultType: 'success' | 'info' | 'failure' } => {
    const { greatSuccessCount, successCount, failCount, totalSuccesses } = rollResult;
    const multText = multiplier > 1 ? ` (${branchName} 2배 적용)` : '';

    if (amount === 1) {
        if (greatSuccessCount === 1) {
            return {
                resultType: 'success',
                title: '훈련 대성공!',
                msg: `뛰어난 집중력으로 대성공을 거두었습니다!${multText}`
            };
        } else if (successCount === 1) {
            return {
                resultType: 'info',
                title: '훈련 성공',
                msg: `성실히 훈련을 마쳤습니다.${multText}`
            };
        } else {
            return {
                resultType: 'failure',
                title: '훈련 실패',
                msg: '성과 없이 훈련이 종료되었습니다.'
            };
        }
    }

    if (totalSuccesses === 0) {
        return {
            resultType: 'failure',
            title: '훈련 전회 실패',
            msg: `총 ${amount}회의 훈련 모두 성과 없이 종료되었습니다.`
        };
    } else if (greatSuccessCount === amount) {
        return {
            resultType: 'success',
            title: '훈련 전회 대성공!',
            msg: `총 ${amount}회의 훈련 모두 대성공하여 놀라운 성과를 거두었습니다!${multText}`
        };
    } else if (failCount === 0) {
        return {
            resultType: 'success',
            title: '훈련 전회 성공!',
            msg: `총 ${amount}회 모두 성공(대성공 ${greatSuccessCount}회, 성공 ${successCount}회)하였습니다!${multText}`
        };
    } else {
        return {
            resultType: 'info',
            title: `훈련 완료 (${totalSuccesses}/${amount}회 성공)`,
            msg: `총 ${amount}회 중 대성공 ${greatSuccessCount}회, 성공 ${successCount}회, 실패 ${failCount}회로 훈련을 마쳤습니다.${multText}`
        };
    }
};

/**
 * 트레이너 등급별 전투 훈련소 훈련 효율 보너스 배율
 */
export const COMBAT_TRAINING_RANK_BONUS: Record<TrainerRank, number> = {
    [TrainerRank.APPRENTICE]: 0.10,     // 견습: +10%
    [TrainerRank.NOVICE]: 0.20,         // 초급: +20%
    [TrainerRank.INTERMEDIATE]: 0.50,   // 중급: +50%
    [TrainerRank.ADVANCED]: 1.00,       // 고급: +100%
    [TrainerRank.SKILLED]: 1.50,        // 숙련: +150%
    [TrainerRank.PROFESSIONAL]: 2.00,   // 전문: +200%
    [TrainerRank.MASTER]: 2.50,         // 마스터: +250%
    [TrainerRank.LEGEND]: 5.00          // 레전드: +500%
};

/**
 * 담당 관리자(트레이너)의 훈련 효율 보너스 계수 반환 (0.00 ~ 5.00)
 */
export const getCombatTrainingEfficiencyBonus = (manager?: Companion | Character): number => {
    if (!manager) return 0;
    if (manager.job !== JobType.TRAINER) return 0;
    const rank = (manager as any).trainerRank || (manager as any).trainerProfile?.rank || TrainerRank.APPRENTICE;
    return COMBAT_TRAINING_RANK_BONUS[rank] || 0.10;
};

/**
 * 전투 훈련소 담당 트레이너 정보 및 표시 텍스트 반환
 */
export const getCombatTrainingTrainerInfo = (manager?: Companion | Character): { rank: TrainerRank | null; label: string; bonusPercent: number } => {
    if (!manager) return { rank: null, label: '미배치', bonusPercent: 0 };
    if (manager.job !== JobType.TRAINER) return { rank: null, label: '트레이너 아님', bonusPercent: 0 };
    const rank = (manager as any).trainerRank || (manager as any).trainerProfile?.rank || TrainerRank.APPRENTICE;
    const bonus = COMBAT_TRAINING_RANK_BONUS[rank] || 0.10;
    const cfg = TRAINER_RANK_CONFIG[rank];
    return {
        rank,
        label: cfg ? cfg.label : `${rank} 트레이너`,
        bonusPercent: Math.round(bonus * 100)
    };
};

export interface UnifiedCombatTrainingInfo {
    facilityCount: number;
    instances: FacilityInstance[];
    maxTrainees: number; // 전체 전투훈련소 개수 및 레벨에 따른 총 정원
    trainees: CombatTrainingTrainee[];
    recentReports: CombatTrainingReportItem[];
    bestManager?: Companion | Character;
    bestFacilityLevel: number;
    primaryInstanceId: string;
}

/**
 * 기지 내 모든 전투 훈련소를 단일 통합 센터로 집계하여 반환합니다.
 * 전투 훈련소가 여러 개일 경우 각 훈련소의 수용량이 모두 합산되어 총 훈련 가능 인원이 증가합니다.
 */
export const getUnifiedCombatTrainingData = (character: Character): UnifiedCombatTrainingInfo => {
    const instances = character.base?.layout?.filter(inst => 
        inst.type === 'combat_training' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const facilityCount = instances.length;

    if (facilityCount === 0) {
        return {
            facilityCount: 0,
            instances: [],
            maxTrainees: 0,
            trainees: [],
            recentReports: [],
            bestFacilityLevel: 1,
            primaryInstanceId: ''
        };
    }

    // 1. 전체 전투훈련소의 수용 인원 합산 (각 훈련소 레벨 + 1)
    const maxTrainees = instances.reduce((sum, inst) => sum + ((inst.level || 0) + 1), 0);

    // 2. 최고 시설 레벨
    const bestFacilityLevel = Math.max(...instances.map(inst => inst.level || 1));

    // 3. 기지 내 모든 활성 및 대기 동료 목록
    const allComps: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];
    const allValidIds = new Set(allComps.map(c => ('id' in c && c.id ? c.id : 'player')));
    allValidIds.add('player');
    if ((character as any).id) allValidIds.add((character as any).id);

    // 4. 담당 관리자들 중 가장 효율이 높은 트레이너 선정
    let bestManager: Companion | Character | undefined = undefined;
    let bestBonus = -1;

    instances.forEach(inst => {
        const assigneeId = character.base?.assignments?.[inst.id];
        if (!assigneeId) return;
        const assignee = assigneeId === 'player' ? character : allComps.find(c => ('id' in c ? c.id : 'player') === assigneeId);
        if (assignee) {
            const bonus = getCombatTrainingEfficiencyBonus(assignee);
            if (bonus > bestBonus) {
                bestBonus = bonus;
                bestManager = assignee;
            }
        }
    });

    // 5. 모든 전투훈련소 인스턴스에 등록된 훈련생을 수합 및 중복 제거 (최신 정산 기록 우선)
    const traineeMap = new Map<string, CombatTrainingTrainee>();
    const activeInstanceIds = new Set(instances.map(inst => inst.id));

    const registerTrainee = (t: CombatTrainingTrainee) => {
        if (!t || !allValidIds.has(t.companionId)) return;
        const existing = traineeMap.get(t.companionId);
        if (!existing) {
            traineeMap.set(t.companionId, t);
            return;
        }
        const existingLast = existing.lastTrainedAbsMinutes ?? existing.startedAtAbsMinutes ?? 0;
        const nextLast = t.lastTrainedAbsMinutes ?? t.startedAtAbsMinutes ?? 0;
        if (nextLast > existingLast || (nextLast === existingLast && (t.accumulatedMinutes || 0) > (existing.accumulatedMinutes || 0))) {
            traineeMap.set(t.companionId, t);
        }
    };

    // 활성화된 훈련소 인스턴스를 먼저 순회하고, 나머지 키도 확인하여 가장 최신 진행도를 채택
    instances.forEach(inst => {
        const ct = character.base?.combatTraining?.[inst.id];
        (ct?.trainees || []).forEach(registerTrainee);
    });
    Object.entries(character.base?.combatTraining || {}).forEach(([instId, ct]) => {
        if (activeInstanceIds.has(instId)) return;
        (ct?.trainees || []).forEach(registerTrainee);
    });

    const trainees: CombatTrainingTrainee[] = Array.from(traineeMap.values());

    // 6. 모든 인스턴스의 훈련 결과 보고서 병합 (중복 제거 및 최신순 정렬)
    const recentReports: CombatTrainingReportItem[] = [];
    const seenReportKeys = new Set<string>();
    Object.values(character.base?.combatTraining || {}).forEach(ct => {
        (ct.recentReports || []).forEach(r => {
            const key = `${r.companionId}_${r.date}_${r.targetStat}_${r.gain}`;
            if (!seenReportKeys.has(key)) {
                seenReportKeys.add(key);
                recentReports.push(r);
            }
        });
    });

    recentReports.sort((a, b) => {
        const dateA = typeof a.date === 'string' ? a.date : '';
        const dateB = typeof b.date === 'string' ? b.date : '';
        return dateB.localeCompare(dateA);
    });

    return {
        facilityCount,
        instances,
        maxTrainees,
        trainees: trainees.slice(0, maxTrainees), // 최대 정원 한도 적용
        recentReports: recentReports.slice(0, 30),
        bestManager,
        bestFacilityLevel,
        primaryInstanceId: instances[0]?.id || ''
    };
};

/**
 * 훈련생 명단 및 보고서를 기지 내 모든 전투 훈련소 인스턴스에 일괄 동기화합니다.
 */
export const syncUnifiedCombatTrainingToCharacter = (
    character: Character,
    trainees: CombatTrainingTrainee[],
    reports?: CombatTrainingReportItem[]
): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return newChar;

    const instances = newChar.base.layout?.filter(inst => inst.type === 'combat_training') || [];
    if (instances.length === 0) {
        newChar.base.combatTraining = {};
        return newChar;
    }

    const currentReports = reports || (() => {
        const unified = getUnifiedCombatTrainingData(newChar);
        return unified.recentReports;
    })();

    // 과거 철거/재배치로 남은 잔존 인스턴스 키를 제거하고 현재 활성 인스턴스에만 일괄 동기화
    const syncedCombatTraining: Record<string, { trainees: CombatTrainingTrainee[]; recentReports: CombatTrainingReportItem[] }> = {};
    instances.forEach(inst => {
        syncedCombatTraining[inst.id] = {
            trainees: trainees.map(t => ({ ...t })),
            recentReports: [...currentReports]
        };
    });
    newChar.base.combatTraining = syncedCombatTraining;

    return newChar;
};

/**
 * 날짜와 시간을 기반으로 게임 내 절대 시간(분 단위)을 계산합니다.
 */
export const getAbsoluteMinutes = (dateStr: string, timeStr: string): number => {
    const date = dateStr || '2000-03-02';
    const time = timeStr || '08:00';
    try {
        let year = 2000, month = 3, day = 2;
        if (date.includes('-')) {
            const parts = date.split('-').map(Number);
            year = parts[0] || 2000;
            month = parts[1] || 3;
            day = parts[2] || 2;
        } else {
            const yMatch = date.match(/(\d+)년/);
            const mMatch = date.match(/(\d+)월/);
            const dMatch = date.match(/(\d+)일/);
            if (yMatch) {
                const parsedY = parseInt(yMatch[1], 10);
                year = parsedY >= 1000 ? parsedY : (2000 + parsedY - 1);
            }
            if (mMatch) month = parseInt(mMatch[1], 10);
            if (dMatch) day = parseInt(dMatch[1], 10);
        }

        let hour = 8, minute = 0;
        if (time.includes(':')) {
            const tParts = time.split(':').map(Number);
            hour = tParts[0] || 0;
            minute = tParts[1] || 0;
        }

        const ms = new Date(year, month - 1, day, hour, minute).getTime();
        return Math.floor(ms / (1000 * 60));
    } catch (e) {
        return 0;
    }
};

/**
 * 두 절대 시간(분 단위) 사이에 실제로 흘러간 주간 시간(06:00 ~ 22:00)의 분을 계산합니다.
 */
export const getActiveTrainingMinutes = (startAbsMin: number, endAbsMin: number): number => {
    if (endAbsMin <= startAbsMin) return 0;
    
    let activeMinutes = 0;
    const diff = endAbsMin - startAbsMin;
    if (diff > 10080) { // 7일 이상은 대략적인 주간 비율(하루 16시간 = 960분)로 고속 계산
        const days = Math.floor(diff / 1440);
        activeMinutes += days * 960;
        const remain = diff % 1440;
        let temp = startAbsMin + days * 1440;
        for (let i = 0; i < remain; i++) {
            const minOfDay = ((temp % 1440) + 1440) % 1440;
            if (minOfDay >= 360 && minOfDay < 1320) {
                activeMinutes++;
            }
            temp++;
        }
    } else {
        let temp = startAbsMin;
        for (let i = 0; i < diff; i++) {
            const minOfDay = ((temp % 1440) + 1440) % 1440;
            if (minOfDay >= 360 && minOfDay < 1320) {
                activeMinutes++;
            }
            temp++;
        }
    }
    return activeMinutes;
};

/**
 * [NEW] 훈련소 시간 경과 및 능력치 성장 처리 (절대 시각 비교 방식을 탑재하여 무누락/무정지 훈련 구현)
 */
export const advanceCombatTrainingTime = (
    character: Character,
    minutesToAdd: number,
    totalCurrentMinutes: number
): { updatedCharacter: Character; logs: string[] } => {
    const logs: string[] = [];

    // 1. 전투훈련소 시설이 있는지 빠른 사전 검사
    const trainingInstances = character.base?.layout?.filter(inst => 
        inst && inst.type === 'combat_training' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    if (trainingInstances.length === 0) {
        return { updatedCharacter: character, logs };
    }

    // 훈련생 배정 여부 올바른 사전 검사
    const hasTrainees = Object.values(character.base?.combatTraining || {}).some(
        ct => ct && ct.trainees && ct.trainees.length > 0
    );
    if (!hasTrainees) {
        return { updatedCharacter: character, logs };
    }

    let charCopy = JSON.parse(JSON.stringify(character)) as Character;

    // 2. 훈련소 통합 데이터 가져오기
    const unified = getUnifiedCombatTrainingData(charCopy);
    if (!unified.trainees || unified.trainees.length === 0) {
        return { updatedCharacter: charCopy, logs };
    }

    const activeCompanions = charCopy.companions || [];
    const baseInactive = charCopy.inactiveCompanions || [];
    const allCompanions: any[] = [charCopy, ...activeCompanions, ...baseInactive];

    // 유효한 훈련생만 필터링
    const validTrainees = (unified.trainees || []).filter(t => 
        allCompanions.some(c => c && c.id === t.companionId && !c.isDead && !c.isMonster)
    );

    if (validTrainees.length === 0) {
        return { updatedCharacter: charCopy, logs };
    }

    // 현재 절대 시각 구하기
    const currentAbsMinutes = getAbsoluteMinutes(charCopy.currentDate || '2000-03-02', charCopy.currentTime || '08:00');

    const manager = unified.bestManager;
    const efficiencyBonus = getCombatTrainingEfficiencyBonus(manager);
    const effectiveLevel = unified.bestFacilityLevel || 1;
    const baseGain = 10 * effectiveLevel;
    const finalGain = Math.floor(baseGain * (1 + efficiencyBonus));
    const trainingReports = [...(unified.recentReports || [])];

    const STAT_NAME_MAP: Record<string, string> = {
        exp: '경험치',
        str: 'STR',
        int: 'INT',
        agi: 'AGI',
        wis: 'WIS',
        def: 'DEF',
        ctrl: 'CTRL',
        maxHp: '최대 체력',
        maxMp: '최대 마나',
        weapon: '무기 숙련도',
        skill: '스킬 숙련도'
    };

    const curDate = charCopy.currentDate || '2000-03-02';

    // 3. 각 훈련생별로 절대 시각 기반 주간 훈련 시간 누적 및 12시간 정산 체크
    validTrainees.forEach(traineeInfo => {
        const trainee = allCompanions.find(c => c && c.id === traineeInfo.companionId);
        if (!trainee) return;

        // 훈련 시작 기준 시점 계산 (lastTrainedAbsMinutes가 없으면 startDate 및 startTime 기반으로 복원)
        let lastTrainedMin = traineeInfo.lastTrainedAbsMinutes;
        if (lastTrainedMin === undefined || lastTrainedMin <= 0) {
            if (traineeInfo.startDate) {
                lastTrainedMin = getAbsoluteMinutes(traineeInfo.startDate, traineeInfo.startTime || '08:00');
            } else {
                lastTrainedMin = currentAbsMinutes;
            }
        }

        // 현재 시각보다 미래로 설정되어 있다면 현재 시각으로 보정
        if (lastTrainedMin > currentAbsMinutes) {
            lastTrainedMin = currentAbsMinutes;
        }

        // 훈련 시작 시간과 현재 시각 사이의 정확한 주간 경과 시간(분) 계산
        const trainingMinutesAccumulated = getActiveTrainingMinutes(lastTrainedMin, currentAbsMinutes);
        if (trainingMinutesAccumulated <= 0) {
            traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;
            return;
        }

        // 절대 시각 갱신
        traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;

        // 누적 훈련 분 증가
        const prevMinutes = traineeInfo.accumulatedMinutes || 0;
        traineeInfo.accumulatedMinutes = prevMinutes + trainingMinutesAccumulated;

        // 12시간(=720분) 채웠는지 여부 (시간 누락 없이 다중 정산 지원)
        if (traineeInfo.accumulatedMinutes >= 720) {
            const settlementCount = Math.floor(traineeInfo.accumulatedMinutes / 720);
            traineeInfo.accumulatedMinutes = traineeInfo.accumulatedMinutes % 720;

            let successMessage = "";
            let statDetailText = "";
            const statKey = traineeInfo.targetStat;
            const statLabel = STAT_NAME_MAP[statKey] || statKey;

            for (let s = 0; s < settlementCount; s++) {
                if (statKey === 'exp') {
                    // 경험치 훈련
                    const expGain = finalGain * 5;
                    const oldLevel = trainee.level;
                    trainee.currentExp = (trainee.currentExp || 0) + expGain;
                    trainee.maxExp = getRequiredExp(trainee.level);
                    let leveledUp = false;

                    while (trainee.currentExp >= trainee.maxExp) {
                        leveledUp = true;
                        trainee.currentExp -= trainee.maxExp;
                        trainee.level += 1;
                        trainee.maxExp = getRequiredExp(trainee.level);
                        trainee.statPoints = (trainee.statPoints || 0) + getStatPointsPerLevel(trainee);
                        trainee.stats.maxHp += 20;
                        trainee.stats.maxMp += 20;

                        const { finalStats: compFinal } = calculateFinalStats(trainee);
                        trainee.stats.hp = compFinal.maxHp;
                        trainee.stats.mp = compFinal.maxMp;
                        trainee.stats.maxHp = compFinal.maxHp;
                        trainee.stats.maxMp = compFinal.maxMp;
                        (trainee as any).hp = compFinal.maxHp;
                        (trainee as any).maxHp = compFinal.maxHp;
                        if ((trainee as any).mp !== undefined || (trainee as any).maxMp !== undefined) {
                            (trainee as any).mp = compFinal.maxMp;
                            (trainee as any).maxMp = compFinal.maxMp;
                        }
                    }

                    traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + expGain;
                    traineeInfo.lastGain = expGain;
                    traineeInfo.lastTrainedDate = curDate;
                    traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;

                    successMessage = leveledUp
                        ? `[전투 훈련소] 대원 '${trainee.name}' - 경험치 +${expGain.toLocaleString()} 획득! 🌟 레벨업 달성 (Lv.${oldLevel} ➔ Lv.${trainee.level})`
                        : `[전투 훈련소] 대원 '${trainee.name}' - 경험치 +${expGain.toLocaleString()} 획득 (${trainee.currentExp.toLocaleString()} / ${trainee.maxExp.toLocaleString()} EXP)`;

                    statDetailText = leveledUp 
                        ? `레벨업 달성 (Lv.${oldLevel} ➔ Lv.${trainee.level})` 
                        : `경험치 +${expGain.toLocaleString()} 획득 (현재: ${trainee.currentExp.toLocaleString()} / ${trainee.maxExp.toLocaleString()})`;

                    trainingReports.unshift({
                        companionId: trainee.id,
                        companionName: trainee.name,
                        targetStat: 'exp',
                        targetStatLabel: '경험치',
                        gain: expGain,
                        accumulatedGain: traineeInfo.accumulatedGain,
                        statValue: trainee.level,
                        currentLevel: trainee.level,
                        date: curDate
                    });
                } else if (statKey === 'weapon') {
                    // 무기 숙련도 수련 (기존 대비 1.5배 상향 조정)
                    const weaponType = traineeInfo.targetWeaponType || 'Sword';
                    const baseWeaponExp = Math.max(3, Math.round(finalGain * 0.25) + 2);
                    const expGain = Math.max(4, Math.round(baseWeaponExp * 1.5));
                    const result = addMasteryExp(trainee, weaponType, expGain);
                    trainee.weaponMastery = (result.char as any).weaponMastery;

                    traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + expGain;
                    traineeInfo.lastGain = expGain;
                    traineeInfo.lastTrainedDate = curDate;
                    traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;

                    const weaponKorean = WEAPON_TYPE_KOREAN[weaponType] || weaponType;
                    const oldLvl = result.oldLevel ?? 0;
                    const newLvl = result.newLevel ?? 0;
                    const currentWeaponExp = trainee.weaponMastery?.[weaponType]?.exp ?? 0;

                    successMessage = result.leveledUp
                        ? `[전투 훈련소] 대원 '${trainee.name}' - [${weaponKorean}] 숙련도 +${expGain} 증가! 🌟 숙련 등급 상승 (Lv.${oldLvl} ➔ Lv.${newLvl}, 누적 숙련도: ${currentWeaponExp})`
                        : `[전투 훈련소] 대원 '${trainee.name}' - [${weaponKorean}] 숙련도 +${expGain} 증가 (현재: Lv.${newLvl}, 누적 숙련도: ${currentWeaponExp})`;

                    statDetailText = result.leveledUp
                        ? `[${weaponKorean}] 숙련 등급 상승 (Lv.${oldLvl} ➔ Lv.${newLvl}, 누적 숙련도: ${currentWeaponExp})`
                        : `[${weaponKorean}] 숙련도 +${expGain} 증가 (현재: Lv.${newLvl}, 누적 숙련도: ${currentWeaponExp})`;

                    trainingReports.unshift({
                        companionId: trainee.id,
                        companionName: trainee.name,
                        targetStat: 'weapon',
                        targetStatLabel: `무기 숙련도 (${weaponKorean})`,
                        gain: expGain,
                        accumulatedGain: traineeInfo.accumulatedGain,
                        statValue: newLvl,
                        currentLevel: newLvl,
                        oldLevel: oldLvl,
                        leveledUp: result.leveledUp,
                        date: curDate
                    });
                } else if (statKey === 'skill') {
                    // 스킬 숙련도 수련 (기존 대비 3배 상향 조정)
                    const skillName = traineeInfo.targetSkillName;
                    const foundSkill = trainee.skills?.find(s => s.name === skillName);
                    if (foundSkill) {
                        const baseSkillGain = Math.round(finalGain / 15) + 1;
                        let skillGain = baseSkillGain * 3;
                        if (trainee.isPotentialLocked) {
                            skillGain *= 2;
                        }
                        foundSkill.currentMastery = (foundSkill.currentMastery || 0) + skillGain;

                        traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + skillGain;
                        traineeInfo.lastGain = skillGain;
                        traineeInfo.lastTrainedDate = curDate;
                        traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;

                        const lockBonusTag = trainee.isPotentialLocked ? ' [잠재력 제한 특화 2배]' : '';
                        successMessage = `[전투 훈련소] 대원 '${trainee.name}' - [${skillName}] 스킬 숙련도 +${skillGain} 상승 (현재 숙련도: ${foundSkill.currentMastery})${lockBonusTag}`;
                        statDetailText = `[${skillName}] 스킬 숙련도 +${skillGain} 상승 (현재 숙련도: ${foundSkill.currentMastery})${lockBonusTag}`;

                        trainingReports.unshift({
                            companionId: trainee.id,
                            companionName: trainee.name,
                            targetStat: 'skill',
                            targetStatLabel: `스킬 숙련도 (${skillName})`,
                            gain: skillGain,
                            accumulatedGain: traineeInfo.accumulatedGain,
                            statValue: foundSkill.currentMastery,
                            currentLevel: trainee.level,
                            date: curDate
                        });
                    }
                } else {
                    // 기본 6대 능력치 수련
                    const statKeyName = statKey === 'maxHp' ? 'maxHp' : statKey === 'maxMp' ? 'maxMp' : statKey;
                    let growth = Math.round(finalGain / 10) + 1;
                    if (statKeyName === 'maxHp' || statKeyName === 'maxMp') {
                        growth *= 10;
                    }

                    if (!trainee.stats) trainee.stats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, agi: 10, wis: 10, def: 5, ctrl: 5 };
                    trainee.stats[statKeyName] = (trainee.stats[statKeyName] || 0) + growth;

                    if (statKeyName === 'maxHp') {
                        trainee.stats.hp = trainee.stats.maxHp;
                        (trainee as any).hp = trainee.stats.maxHp;
                        (trainee as any).maxHp = trainee.stats.maxHp;
                    }
                    if (statKeyName === 'maxMp') {
                        trainee.stats.mp = trainee.stats.maxMp;
                        (trainee as any).mp = trainee.stats.maxMp;
                        (trainee as any).maxMp = trainee.stats.maxMp;
                    }

                    traineeInfo.accumulatedGain = Math.round((traineeInfo.accumulatedGain || 0) + growth);
                    traineeInfo.lastGain = growth;
                    traineeInfo.lastTrainedDate = curDate;
                    traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;

                    successMessage = `[전투 훈련소] 대원 '${trainee.name}' - ${statLabel} +${growth} 상승 (현재: ${(trainee.stats as any)[statKeyName]})`;
                    statDetailText = `${statLabel} +${growth} 상승 (현재: ${(trainee.stats as any)[statKeyName]})`;

                    trainingReports.unshift({
                        companionId: trainee.id,
                        companionName: trainee.name,
                        targetStat: statKeyName,
                        targetStatLabel: statLabel,
                        gain: growth,
                        accumulatedGain: traineeInfo.accumulatedGain,
                        statValue: (trainee.stats as any)[statKeyName],
                        currentLevel: trainee.level,
                        date: curDate
                    });
                }

                if (successMessage) {
                    // [중복 방지] 상세 서신([전투 수련])이 발송되므로 중복 한 줄 로그(successMessage)는 제외
                    // 능력치 오르면 서신(편지)오도록 하고 동일 내용 중복 발송 방지
                    if (!charCopy.messages) charCopy.messages = [];
                    const mailText = `[전투 수련] 대원 '${trainee.name}'의 12시간 훈련 정산 완료!\n\n전투훈련소에서 12시간 동안 성실하게 훈련에 매진한 대원 '${trainee.name}'이(가) 한 단계 더 성장했습니다.\n\n- 대상 훈련: ${statLabel} 수련\n- 훈련 성과: ${statDetailText}\n\n땀방울은 거짓말을 하지 않습니다. 대원의 다음 성장 로드맵을 계획하고 훈련을 이어나가도록 독려해주세요!`;
                    const settlementMailId = `combat_training_mail_${trainee.id}_${traineeInfo.lastTrainedAbsMinutes}_${s}`;
                    const isDuplicateMail = charCopy.messages.slice(-15).some(m => m.id === settlementMailId || m.text === mailText);
                    if (!isDuplicateMail) {
                        charCopy.messages.push({
                            id: settlementMailId,
                            role: 'ai',
                            text: mailText,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        }

        // 동료 원본 정보 배열에 복사 반영
        if (trainee.id === 'player') {
            charCopy = { ...charCopy, ...trainee };
        } else if (charCopy.companions.some(c => c.id === trainee.id)) {
            charCopy.companions = charCopy.companions.map(c => c.id === trainee.id ? trainee : c);
        } else if (charCopy.inactiveCompanions) {
            charCopy.inactiveCompanions = charCopy.inactiveCompanions.map(c => c.id === trainee.id ? trainee : c);
        }
    });

    // 5. 보고서 목록 정리 및 훈련소 동기화 적용
    const trimmedReports = trainingReports.slice(0, 30);
    const finalUpdatedChar = syncUnifiedCombatTrainingToCharacter(charCopy, validTrainees, trimmedReports);

    return {
        updatedCharacter: finalUpdatedChar,
        logs
    };
};
