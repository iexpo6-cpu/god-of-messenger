import { ClassTier } from '../types';

/**
 * 레벨 기반 클래스 해방 티어 산출 헬퍼
 * 레벨이 1000이 넘더라도 무조건 파이널/라스트 클래스 해방자일 필요는 없으며,
 * 시련을 통과하지 못해 1차, 2차, 또는 미해방인 상태가 자연스럽게 공존하도록 확률적 분포를 적용합니다.
 */
export const determineRecruitClassTier = (level: number): ClassTier => {
    const roll = Math.random();
    
    // 레벨 800 이상 (1000레벨 초과 포함)
    if (level >= 800) {
        if (roll < 0.25) return ClassTier.FINAL;
        if (roll < 0.55) return ClassTier.LAST;
        if (roll < 0.78) return ClassTier.SECOND;
        if (roll < 0.90) return ClassTier.FIRST;
        return ClassTier.NONE;
    }
    
    // 레벨 500 ~ 799
    if (level >= 500) {
        if (roll < 0.15) return ClassTier.FINAL;
        if (roll < 0.45) return ClassTier.LAST;
        if (roll < 0.75) return ClassTier.SECOND;
        if (roll < 0.90) return ClassTier.FIRST;
        return ClassTier.NONE;
    }
    
    // 레벨 200 ~ 499
    if (level >= 200) {
        if (roll < 0.25) return ClassTier.LAST;
        if (roll < 0.65) return ClassTier.SECOND;
        if (roll < 0.88) return ClassTier.FIRST;
        return ClassTier.NONE;
    }
    
    // 레벨 100 ~ 199
    if (level >= 100) {
        if (roll < 0.45) return ClassTier.SECOND;
        if (roll < 0.80) return ClassTier.FIRST;
        return ClassTier.NONE;
    }
    
    // 레벨 50 ~ 99
    if (level >= 50) {
        if (roll < 0.50) return ClassTier.FIRST;
        return ClassTier.NONE;
    }
    
    // 레벨 50 미만
    return roll < 0.25 ? ClassTier.FIRST : ClassTier.NONE;
};
