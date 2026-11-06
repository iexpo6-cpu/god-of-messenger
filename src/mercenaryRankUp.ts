import { MercenaryRank } from "./types";

/**
 * 용병 등급별 필요 명성치 (Thresholds)
 */
export const MERCENARY_RANK_THRESHOLD: Record<MercenaryRank, number> = {
    [MercenaryRank.F]: 0,
    [MercenaryRank.E]: 100,
    [MercenaryRank.D]: 200,
    [MercenaryRank.C]: 500,
    [MercenaryRank.B]: 1000,
    [MercenaryRank.A]: 5000,
    [MercenaryRank.S]: 10000,
    [MercenaryRank.SS]: 30000,
    [MercenaryRank.SSS]: 50000,
};

/**
 * 퀘스트 위험도에 따른 명성치 가중치
 */
export const DANGER_REPUTATION_MULT: Record<string, number> = {
    'Low': 1,
    'Mid': 2,
    'High': 3,
    'Extreme': 4
};

/**
 * 다음 등급 반환 헬퍼
 */
export const getNextMercenaryRank = (current: MercenaryRank): MercenaryRank | null => {
    const ranks = [
        MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C,
        MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
    ];
    const idx = ranks.indexOf(current);
    if (idx >= 0 && idx < ranks.length - 1) return ranks[idx + 1];
    return null;
};

/**
 * 등급에 맞는 초기 명성치 범위 반환 (동료 생성용)
 */
export const getReputationRangeByRank = (rank: MercenaryRank): { min: number, max: number } => {
    const min = MERCENARY_RANK_THRESHOLD[rank];
    const nextRank = getNextMercenaryRank(rank);
    const max = nextRank ? MERCENARY_RANK_THRESHOLD[nextRank] - 1 : min + 5000;
    return { min, max };
};
