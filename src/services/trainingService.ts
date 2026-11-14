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
    if (!character.base) return character;

    const instances = character.base.layout?.filter(inst => inst.type === 'combat_training') || [];
    if (instances.length === 0) {
        return {
            ...character,
            base: {
                ...character.base,
                combatTraining: {}
            }
        };
    }

    const currentReports = reports || (() => {
        const unified = getUnifiedCombatTrainingData(character);
        return unified.recentReports;
    })();

    // 과거 철거/재배치로 남은 잔존 인스턴스 키를 제거하고 현재 활성 인스턴스에만 일괄 동기화 (O(N) 경량 얕은 복사)
    const syncedCombatTraining: Record<string, { trainees: CombatTrainingTrainee[]; recentReports: CombatTrainingReportItem[] }> = {};
    instances.forEach(inst => {
        syncedCombatTraining[inst.id] = {
            trainees: trainees.map(t => ({ ...t })),
            recentReports: [...currentReports]
        };
    });

    return {
        ...character,
        base: {
            ...character.base,
            combatTraining: syncedCombatTraining
        }
    };
};

/**
 * 날짜와 시간을 기반으로 게임 내 절대 시간(분 단위, UTC 기준 타임존 무관)을 계산합니다.
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
            hour = isNaN(tParts[0]) ? 0 : tParts[0];
            minute = isNaN(tParts[1]) ? 0 : tParts[1];
        }

        // Date.UTC를 사용하여 로컬 타임존(+09:00 등)에 따른 06:00~22:00 오프셋 왜곡 원천 차단
        const ms = Date.UTC(year, month - 1, day, hour, minute);
        return Math.floor(ms / (1000 * 60));
    } catch (e) {
        return 0;
    }
};

/**
 * Epoch 기준 누적 주간(06:00~22:00, 하루 960분) 활동 시간 계산 헬퍼 (O(1))
 */
const getCumulativeActiveMinutesFromEpoch = (absMin: number): number => {
    const dayIndex = Math.floor(absMin / 1440);
    const minOfDay = ((absMin % 1440) + 1440) % 1440;
    const dayActive = Math.max(0, Math.min(minOfDay, 1320) - 360);
    return dayIndex * 960 + dayActive;
};

/**
 * 두 절대 시간(분 단위) 사이에 실제로 흘러간 주간 시간(06:00 ~ 22:00)의 분을 O(1)로 계산합니다.
 */
export const getActiveTrainingMinutes = (startAbsMin: number, endAbsMin: number): number => {
    if (endAbsMin <= startAbsMin) return 0;
    return Math.max(0, getCumulativeActiveMinutesFromEpoch(endAbsMin) - getCumulativeActiveMinutesFromEpoch(startAbsMin));
};

/**
 * 시작 절대 시각과 필요한 주간 훈련 시간(기본 720분=12시간)을 바탕으로 예상 종료 절대 시각을 O(1)로 계산합니다.
 */
export const calculateEstimatedEndAbsMinutes = (startAbsMin: number, neededActiveMinutes: number = 720): number => {
    if (neededActiveMinutes <= 0) return startAbsMin;
    const startCum = getCumulativeActiveMinutesFromEpoch(startAbsMin);
    const targetCum = startCum + neededActiveMinutes;
    let targetDayIndex = Math.floor(targetCum / 960);
    let remActive = targetCum % 960;
    if (remActive === 0 && targetCum > 0) {
        targetDayIndex -= 1;
        remActive = 960;
    }
    return targetDayIndex * 1440 + 360 + remActive;
};

/**
 * 절대 분(UTC 기준)을 'YYYY-MM-DD HH:mm' 형식 문자열로 변환합니다.
 */
export const formatAbsMinutesToDateTime = (absMin: number): string => {
    const d = new Date(absMin * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
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

    // 1. 전투훈련소 시설 및 훈련생 존재 여부 빠른 사전 검사
    const trainingInstances = character.base?.layout?.filter(inst => 
        inst && inst.type === 'combat_training' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    if (trainingInstances.length === 0) {
        return { updatedCharacter: character, logs };
    }

    const unified = getUnifiedCombatTrainingData(character);
    if (!unified.trainees || unified.trainees.length === 0) {
        return { updatedCharacter: character, logs };
    }

    // 현재 절대 시각 구하기 (UTC 기반)
    const currentAbsMinutes = getAbsoluteMinutes(character.currentDate || '2000-03-02', character.currentTime || '08:00');

    // [성능 최적화 핵심] 모든 훈련생이 이미 예상 종료 시각을 갖고 있고 아직 도달하지 않았다면
    // 어떠한 객체 복사나 루프 연산도 없이 0ms 즉시 종료 (O(1) Zero-Copy Fast Exit)
    const needsProcessing = unified.trainees.some(t => 
        t.targetEndAbsMinutes === undefined || currentAbsMinutes >= t.targetEndAbsMinutes
    );
    if (!needsProcessing) {
        return { updatedCharacter: character, logs };
    }

    let charCopy: Character = {
        ...character,
        companions: [...(character.companions || [])],
        inactiveCompanions: [...(character.inactiveCompanions || [])],
        messages: [...(character.messages || [])]
    };

    const allCompanions: any[] = [charCopy, ...charCopy.companions, ...(charCopy.inactiveCompanions || [])];

    // 유효한 훈련생만 필터링 (복사본 배열 생성)
    const validTrainees = unified.trainees
        .filter(t => allCompanions.some(c => c && c.id === t.companionId && !c.isDead && !c.isMonster))
        .map(t => ({ ...t }));

    if (validTrainees.length === 0) {
        return { updatedCharacter: character, logs };
    }

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
    const settledSummaryLines: string[] = [];

    // 3. 각 훈련생별로 시작/예상종료 시각 기반 주간 훈련 시간 누적 및 12시간 정산 체크
    validTrainees.forEach(traineeInfo => {
        const origTrainee = allCompanions.find(c => c && c.id === traineeInfo.companionId);
        if (!origTrainee) return;
        const trainee = { ...origTrainee, stats: origTrainee.stats ? { ...origTrainee.stats } : undefined };

        // 훈련 시작/마지막 체크 시점 복원
        let lastTrainedMin = traineeInfo.lastTrainedAbsMinutes;
        if (lastTrainedMin === undefined || lastTrainedMin <= 0) {
            if (traineeInfo.startDate) {
                lastTrainedMin = getAbsoluteMinutes(traineeInfo.startDate, traineeInfo.startTime || '08:00');
            } else {
                lastTrainedMin = currentAbsMinutes;
            }
        }
        if (lastTrainedMin > currentAbsMinutes) {
            lastTrainedMin = currentAbsMinutes;
        }

        // 아직 예상 종료 시각이 계산되지 않은 구형 데이터인 경우 계산하여 부여
        if (traineeInfo.targetEndAbsMinutes === undefined) {
            const needed = Math.max(1, 720 - (traineeInfo.accumulatedMinutes || 0));
            traineeInfo.lastTrainedAbsMinutes = lastTrainedMin;
            traineeInfo.targetEndAbsMinutes = calculateEstimatedEndAbsMinutes(lastTrainedMin, needed);
            if (currentAbsMinutes < traineeInfo.targetEndAbsMinutes) {
                return;
            }
        }

        // 예상 종료 시각에 아직 도달하지 않은 훈련생은 스킵
        if (currentAbsMinutes < traineeInfo.targetEndAbsMinutes) {
            return;
        }

        // 훈련 시작/체크 시간과 현재 시각 사이의 정확한 주간 경과 시간(분) O(1) 계산
        const trainingMinutesAccumulated = getActiveTrainingMinutes(lastTrainedMin, currentAbsMinutes);
        traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;

        const prevMinutes = traineeInfo.accumulatedMinutes || 0;
        traineeInfo.accumulatedMinutes = prevMinutes + trainingMinutesAccumulated;

        // 12시간(=720분) 정산 처리
        if (traineeInfo.accumulatedMinutes >= 720) {
            const settlementCount = Math.floor(traineeInfo.accumulatedMinutes / 720);
            traineeInfo.accumulatedMinutes = traineeInfo.accumulatedMinutes % 720;

            // 다음 12시간 회차 예상 종료 시각 즉시 재예약
            traineeInfo.targetEndAbsMinutes = calculateEstimatedEndAbsMinutes(
                currentAbsMinutes,
                Math.max(1, 720 - traineeInfo.accumulatedMinutes)
            );

            let statDetailText = "";
            const statKey = traineeInfo.targetStat;
            const statLabel = STAT_NAME_MAP[statKey] || statKey;
            let totalUnitGain = 0;
            const oldLevel = trainee.level;
            let anyLeveledUp = false;

            for (let s = 0; s < settlementCount; s++) {
                if (statKey === 'exp') {
                    const expGain = finalGain * 5;
                    totalUnitGain += expGain;
                    trainee.currentExp = (trainee.currentExp || 0) + expGain;
                    trainee.maxExp = getRequiredExp(trainee.level);

                    while (trainee.currentExp >= trainee.maxExp) {
                        anyLeveledUp = true;
                        trainee.currentExp -= trainee.maxExp;
                        trainee.level += 1;
                        trainee.maxExp = getRequiredExp(trainee.level);
                        trainee.statPoints = (trainee.statPoints || 0) + getStatPointsPerLevel(trainee);
                        if (trainee.stats) {
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
                    }

                    traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + expGain;
                    traineeInfo.lastGain = expGain;
                    traineeInfo.lastTrainedDate = curDate;
                    traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;
                } else if (statKey === 'weapon') {
                    const weaponType = traineeInfo.targetWeaponType || 'Sword';
                    const baseWeaponExp = Math.max(3, Math.round(finalGain * 0.25) + 2);
                    const expGain = Math.max(4, Math.round(baseWeaponExp * 1.5));
                    totalUnitGain += expGain;
                    const result = addMasteryExp(trainee, weaponType, expGain);
                    trainee.weaponMastery = (result.char as any).weaponMastery;
                    if (result.leveledUp) anyLeveledUp = true;

                    traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + expGain;
                    traineeInfo.lastGain = expGain;
                    traineeInfo.lastTrainedDate = curDate;
                    traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;
                } else if (statKey === 'skill') {
                    const skillName = traineeInfo.targetSkillName;
                    const foundSkill = trainee.skills?.find((sk: any) => sk.name === skillName);
                    if (foundSkill) {
                        const baseSkillGain = Math.round(finalGain / 15) + 1;
                        let skillGain = baseSkillGain * 3;
                        if (trainee.isPotentialLocked) skillGain *= 2;
                        totalUnitGain += skillGain;
                        foundSkill.currentMastery = (foundSkill.currentMastery || 0) + skillGain;

                        traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + skillGain;
                        traineeInfo.lastGain = skillGain;
                        traineeInfo.lastTrainedDate = curDate;
                        traineeInfo.totalDaysTrained = (traineeInfo.totalDaysTrained || 0) + 1;
                    }
                } else {
                    const statKeyName = statKey === 'maxHp' ? 'maxHp' : statKey === 'maxMp' ? 'maxMp' : statKey;
                    let growth = Math.round(finalGain / 10) + 1;
                    if (statKeyName === 'maxHp' || statKeyName === 'maxMp') growth *= 10;
                    totalUnitGain += growth;

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
                }
            }

            // 정산 보고서(UI 최근 활동 피드)는 대원당 합산 1건으로 깔끔하게 기록
            if (statKey === 'exp') {
                statDetailText = anyLeveledUp
                    ? `경험치 +${totalUnitGain.toLocaleString()} (${settlementCount}회차 완료) ➔ 🌟 Lv.${oldLevel} → Lv.${trainee.level}`
                    : `경험치 +${totalUnitGain.toLocaleString()} (${settlementCount}회차 완료)`;
                trainingReports.unshift({
                    companionId: trainee.id,
                    companionName: trainee.name,
                    targetStat: 'exp',
                    targetStatLabel: '경험치',
                    gain: totalUnitGain,
                    accumulatedGain: traineeInfo.accumulatedGain,
                    statValue: trainee.level,
                    currentLevel: trainee.level,
                    date: curDate
                });
            } else if (statKey === 'weapon') {
                const weaponType = traineeInfo.targetWeaponType || 'Sword';
                const weaponKorean = WEAPON_TYPE_KOREAN[weaponType] || weaponType;
                const newLvl = trainee.weaponMastery?.[weaponType]?.level ?? 0;
                statDetailText = `[${weaponKorean}] 숙련도 +${totalUnitGain} (${settlementCount}회차 완료, Lv.${newLvl})`;
                trainingReports.unshift({
                    companionId: trainee.id,
                    companionName: trainee.name,
                    targetStat: 'weapon',
                    targetStatLabel: `무기 숙련도 (${weaponKorean})`,
                    gain: totalUnitGain,
                    accumulatedGain: traineeInfo.accumulatedGain,
                    statValue: newLvl,
                    currentLevel: newLvl,
                    leveledUp: anyLeveledUp,
                    date: curDate
                });
            } else if (statKey === 'skill') {
                const skillName = traineeInfo.targetSkillName;
                const foundSkill = trainee.skills?.find((sk: any) => sk.name === skillName);
                const curMastery = foundSkill?.currentMastery ?? 0;
                statDetailText = `[${skillName}] 숙련도 +${totalUnitGain} (${settlementCount}회차 완료, 현재 ${curMastery})`;
                trainingReports.unshift({
                    companionId: trainee.id,
                    companionName: trainee.name,
                    targetStat: 'skill',
                    targetStatLabel: `스킬 숙련도 (${skillName})`,
                    gain: totalUnitGain,
                    accumulatedGain: traineeInfo.accumulatedGain,
                    statValue: curMastery,
                    currentLevel: trainee.level,
                    date: curDate
                });
            } else {
                const statKeyName = statKey === 'maxHp' ? 'maxHp' : statKey === 'maxMp' ? 'maxMp' : statKey;
                const curVal = (trainee.stats as any)?.[statKeyName] ?? 0;
                statDetailText = `${statLabel} +${totalUnitGain} 상승 (${settlementCount}회차 완료, 현재 ${curVal})`;
                trainingReports.unshift({
                    companionId: trainee.id,
                    companionName: trainee.name,
                    targetStat: statKeyName,
                    targetStatLabel: statLabel,
                    gain: totalUnitGain,
                    accumulatedGain: traineeInfo.accumulatedGain,
                    statValue: curVal,
                    currentLevel: trainee.level,
                    date: curDate
                });
            }

            settledSummaryLines.push(`• ${trainee.name} [${statLabel}]: ${statDetailText}`);

            // 동료 원본 정보 배열에 복사 반영
            if (trainee.id === 'player') {
                charCopy = { ...charCopy, ...trainee };
            } else if (charCopy.companions.some(c => c.id === trainee.id)) {
                charCopy.companions = charCopy.companions.map(c => c.id === trainee.id ? trainee : c);
            } else if (charCopy.inactiveCompanions) {
                charCopy.inactiveCompanions = charCopy.inactiveCompanions.map(c => c.id === trainee.id ? trainee : c);
            }
        } else {
            // 720분 미만 잔여 시간만 경과한 경우, 다음 예상 종료 시각 보정
            traineeInfo.targetEndAbsMinutes = calculateEstimatedEndAbsMinutes(
                currentAbsMinutes,
                Math.max(1, 720 - traineeInfo.accumulatedMinutes)
            );
        }
    });

    // 4. [1회 통합 정산 서신] 여러 회차/여러 대원이 정산되었더라도 단 1통의 통합 서신만 발송
    if (settledSummaryLines.length > 0) {
        if (!charCopy.messages) charCopy.messages = [];
        const mailId = `combat_training_unified_${currentAbsMinutes}`;
        const isDup = charCopy.messages.slice(-10).some(m => m.id === mailId);
        if (!isDup) {
            const mailText = `[전투 수련 통합 보고] 전투훈련소 훈련 정산 완료!\n\n기지 전투훈련소에서 훈련을 마친 대원들의 종합 성장 보고서입니다.\n\n${settledSummaryLines.join('\n')}\n\n다음 훈련 회차도 자동으로 이어서 진행됩니다.`;
            charCopy.messages.push({
                id: mailId,
                role: 'ai',
                text: mailText,
                timestamp: Date.now()
            });
        }
    }

    // 5. 보고서 목록 정리 및 훈련소 동기화 적용
    const trimmedReports = trainingReports.slice(0, 30);
    const finalUpdatedChar = syncUnifiedCombatTrainingToCharacter(charCopy, validTrainees, trimmedReports);

    return {
        updatedCharacter: finalUpdatedChar,
        logs
    };
};
