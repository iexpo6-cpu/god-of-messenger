import { Stats } from '../types';

/**
 * 레벨 구간별 획득 스탯 포인트 계산
 * Lv 1~29: 5P (29번 레벨업)
 * Lv 30~99: 10P (70번 레벨업)
 * Lv 100~299: 20P (200번 레벨업)
 * Lv 300~999: 30P (700번 레벨업)
 * Lv 1000 이상: 50P
 */
export const getStatPointsPerLevelByLevel = (level: number): number => {
    if (level < 30) return 5;
    if (level < 100) return 10;
    if (level < 300) return 20;
    if (level < 1000) return 30;
    return 50;
};

/**
 * 캐릭터/동료의 1레벨부터 현재 레벨까지 총 획득 스탯 포인트 재계산
 * 예: Lv.150 캐릭터인 경우: 29×5 + 70×10 + 50×20 = 1,845 P
 */
export const calculateTotalStatPointsForLevel = (level: number): number => {
    const validLevel = Math.max(1, level || 1);
    let total = 0;
    for (let lvl = 2; lvl <= validLevel; lvl++) {
        total += getStatPointsPerLevelByLevel(lvl);
    }
    return total;
};

/**
 * 스탯 포인트 초기화 주문서 사용 시 대상 캐릭터/동료의 스탯을 리셋하는 함수
 * - HP, MP 기본값: 레벨 * 20
 * - 힘(STR), 지력(INT), 방어(DEF), 민첩(AGI), 지능(WIS), 제어(CTRL) 기본값: 10
 * - 1레벨부터 현재 레벨까지 총 획득 스탯 포인트를 구간별 재계산하여 일괄 지급
 */
export const resetEntityStats = (targetEntity: any): number => {
    const level = Math.max(1, targetEntity.level || 1);
    const totalPoints = calculateTotalStatPointsForLevel(level);
    const baseHpMp = level * 20;

    if (!targetEntity.stats) {
        targetEntity.stats = {
            hp: baseHpMp,
            maxHp: baseHpMp,
            mp: baseHpMp,
            maxMp: baseHpMp,
            str: 10,
            int: 10,
            wis: 10,
            def: 10,
            agi: 10,
            ctrl: 10
        };
    } else {
        targetEntity.stats.str = 10;
        targetEntity.stats.int = 10;
        targetEntity.stats.wis = 10;
        targetEntity.stats.def = 10;
        targetEntity.stats.agi = 10;
        targetEntity.stats.ctrl = 10;
        targetEntity.stats.maxHp = baseHpMp;
        targetEntity.stats.hp = baseHpMp;
        targetEntity.stats.maxMp = baseHpMp;
        targetEntity.stats.mp = baseHpMp;
    }

    targetEntity.statPoints = totalPoints;
    return totalPoints;
};
