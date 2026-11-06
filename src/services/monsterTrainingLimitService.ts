import { Character, Companion, JobType } from '../types';

export const MAX_BREEDER_STACK_COUNT = 10;
export const MAX_DAILY_MONSTER_TRAINING_LIMIT = 100;
// 사육소 개수당 부여되는 훈련 횟수 (1회에서 3회로 상향 조정)
export const TRAIN_COUNT_PER_FARM = 3;

export interface BreederTrainingContribution {
    id: string;
    name: string;
    level: number;
    rankLabel: string;
    dailyCount: number;
    isAssigned: boolean;
}

export interface MonsterFarmTrainingLimitInfo {
    totalLimit: number;
    maxLimit: number;
    facilityCount: number;
    facilityBonus: number;
    breederBonus: number;
    breederCount: number;
    effectiveBreederCount: number;
    breeders: BreederTrainingContribution[];
    hasFacility: boolean;
}

/**
 * 사육사 등급 및 레벨에 따른 일일 훈련 횟수 가산치 계산
 * 계층 구조:
 * 견습(+2) ➔ 일반(+2) ➔ 중급(+3) ➔ 고급(+4) ➔ 숙련(+6) ➔ 장인(+9) ➔ 명인(+12) ➔ 전설(+15회)
 * 사육사 10명 누적 시 최대 100회
 */
export const getBreederDailyTrainingCount = (level: number, rankName?: string): { dailyCount: number; rankLabel: string } => {
    const rawRank = (rankName || '').trim();

    if (rawRank.includes('레전드') || rawRank.includes('전설') || level >= 100) {
        return { dailyCount: 15, rankLabel: '전설 사육사' };
    }
    if (rawRank.includes('마스터') || rawRank.includes('명인') || level >= 85) {
        return { dailyCount: 12, rankLabel: '명인 사육사' };
    }
    if (rawRank.includes('전문') || rawRank.includes('장인') || level >= 70) {
        return { dailyCount: 9, rankLabel: '장인 사육사' };
    }
    if (rawRank.includes('숙련') || level >= 55) {
        return { dailyCount: 6, rankLabel: '숙련 사육사' };
    }
    if (rawRank.includes('고급') || level >= 40) {
        return { dailyCount: 4, rankLabel: '고급 사육사' };
    }
    if (rawRank.includes('중급') || level >= 25) {
        return { dailyCount: 3, rankLabel: '중급 사육사' };
    }
    if (rawRank.includes('초급') || rawRank.includes('일반') || level >= 10) {
        return { dailyCount: 2, rankLabel: '일반 사육사' };
    }
    return { dailyCount: 2, rankLabel: '견습 사육사' };
};

/**
 * 몬스터 사육소 개수 및 사육사 인원수 기반 일일 최대 훈련 가능 횟수 상세 정보 계산
 * - 사육소 개수에 따른 훈련 횟수 포함 (사육소 1개당 3회)
 * - 사육사 인원수만큼 최대 훈련 횟수 누적 (사육사 10명분 누적)
 * - 일일 최대 100회로 제한
 */
export const getMonsterFarmTrainingLimitInfo = (character: Character): MonsterFarmTrainingLimitInfo => {
    const monsterFarmInstances = character.base?.layout?.filter(inst =>
        (inst.type === 'monster_farm' || inst.type === 'monster_ranch') &&
        !inst.underConstruction &&
        (inst.level || 0) > 0
    ) || [];

    const facilityCount = monsterFarmInstances.length;
    if (facilityCount === 0) {
        return {
            totalLimit: 0,
            maxLimit: MAX_DAILY_MONSTER_TRAINING_LIMIT,
            facilityCount: 0,
            facilityBonus: 0,
            breederBonus: 0,
            breederCount: 0,
            effectiveBreederCount: 0,
            breeders: [],
            hasFacility: false
        };
    }

    // 사육소 개수당 기본 훈련 횟수 (1개당 3회)
    const facilityBonus = facilityCount * TRAIN_COUNT_PER_FARM;

    const assignedBreederIdSet = new Set<string>();
    monsterFarmInstances.forEach(inst => {
        const assignedIds: string[] = [
            ...(character.base?.multiAssignments?.[inst.id] || []),
            ...(character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id] as string] : [])
        ];
        assignedIds.forEach(id => {
            if (id) assignedBreederIdSet.add(id);
        });
    });

    const allActors: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    const seenIds = new Set<string>();
    const breederContributions: BreederTrainingContribution[] = [];

    const processActor = (actor: Character | Companion | undefined, key: string, isAssigned: boolean) => {
        if (!actor || seenIds.has(key)) return;
        if ((actor as any).isDead || (actor as any).isMonster || (actor as any).monsterData) return;

        const isBreeder = actor.job === JobType.BREEDER || (actor.job as string) === '사육사';
        if (!isBreeder) return;

        seenIds.add(key);

        const breeding = (actor as any).professions?.breeding;
        const level = breeding?.level || (actor as any).breederLevel || 1;
        const rankName = (actor as any).breederRank || (actor as any).breederTitle;

        const { dailyCount, rankLabel } = getBreederDailyTrainingCount(level, rankName);

        breederContributions.push({
            id: key,
            name: actor.name || '사육사',
            level,
            rankLabel,
            dailyCount,
            isAssigned
        });
    };

    // 1. 사육소 시설에 직접 배치된 사육사 우선 확인
    assignedBreederIdSet.forEach(assigneeId => {
        const actor = assigneeId === 'player'
            ? character
            : allActors.find(c => ('id' in c ? c.id : 'player') === assigneeId);
        processActor(actor, assigneeId, true);
    });

    // 2. 미배치 포함 기지에 등록된 모든 사육사 확인
    allActors.forEach(actor => {
        const key = 'id' in actor ? actor.id : 'player';
        processActor(actor, key, assignedBreederIdSet.has(key));
    });

    if (breederContributions.length === 0) {
        // 사육사가 없더라도 사육소 시설 개수에 따른 기본 훈련 횟수 부여
        const totalLimit = Math.min(MAX_DAILY_MONSTER_TRAINING_LIMIT, facilityBonus);
        return {
            totalLimit,
            maxLimit: MAX_DAILY_MONSTER_TRAINING_LIMIT,
            facilityCount,
            facilityBonus,
            breederBonus: 0,
            breederCount: 0,
            effectiveBreederCount: 0,
            breeders: [],
            hasFacility: true
        };
    }

    // 일일 훈련 가산치가 높은 사육사 순으로 정렬
    breederContributions.sort((a, b) => {
        if (b.dailyCount !== a.dailyCount) return b.dailyCount - a.dailyCount;
        return b.level - a.level;
    });

    // 최대 10명분까지 누적
    const topBreeders = breederContributions.slice(0, MAX_BREEDER_STACK_COUNT);
    const breederBonus = topBreeders.reduce((sum, item) => sum + item.dailyCount, 0);

    // 사육소 개수 훈련 횟수 + 사육사 10명분 누적치, 일일 최대 100회 제한
    const totalLimit = Math.min(MAX_DAILY_MONSTER_TRAINING_LIMIT, facilityBonus + breederBonus);

    return {
        totalLimit,
        maxLimit: MAX_DAILY_MONSTER_TRAINING_LIMIT,
        facilityCount,
        facilityBonus,
        breederBonus,
        breederCount: breederContributions.length,
        effectiveBreederCount: topBreeders.length,
        breeders: breederContributions,
        hasFacility: true
    };
};

/**
 * 몬스터 사육소의 일일 최대 훈련 횟수 계산
 */
export const calculateMonsterFarmTrainingLimit = (character: Character): number => {
    return getMonsterFarmTrainingLimitInfo(character).totalLimit;
};
