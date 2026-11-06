import { ClassTier } from '../types';

/**
 * 클래스 티어별 스킬 레벨당 버프 계수 산출 함수
 * - 퍼스트 클래스: 0.1% / Lv
 * - 세컨드 클래스: 0.2% / Lv
 * - 라스트 클래스: 0.5% / Lv
 * - 파이널 클래스: 1.0% / Lv
 */
export const getTierBuffScale = (tier?: ClassTier | string): number => {
    if (!tier) return 0.1;
    const tierStr = String(tier).toUpperCase();

    if (tierStr.includes('FIRST') || tierStr.includes('퍼스트') || tierStr.includes('1')) {
        return 0.1;
    }
    if (tierStr.includes('SECOND') || tierStr.includes('세컨드') || tierStr.includes('2')) {
        return 0.2;
    }
    if (tierStr.includes('LAST') || tierStr.includes('라스트') || tierStr.includes('3')) {
        return 0.5;
    }
    if (tierStr.includes('FINAL') || tierStr.includes('파이널') || tierStr.includes('4')) {
        return 1.0;
    }

    return 0.1;
};

/**
 * 클래스 티어별 스킬 레벨당 공격 계수 산출 함수
 */
export const getTierAttackScale = (tier?: ClassTier | string): number => {
    if (!tier) return 1.0;
    const tierStr = String(tier).toUpperCase();

    if (tierStr.includes('FIRST') || tierStr.includes('퍼스트') || tierStr.includes('1')) {
        return 1.0;
    }
    if (tierStr.includes('SECOND') || tierStr.includes('세컨드') || tierStr.includes('2')) {
        return 5.0;
    }
    if (tierStr.includes('LAST') || tierStr.includes('라스트') || tierStr.includes('3')) {
        return 20.0;
    }
    if (tierStr.includes('FINAL') || tierStr.includes('파이널') || tierStr.includes('4')) {
        return 100;
    }
    return 1.0;
};