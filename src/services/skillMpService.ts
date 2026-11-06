import { ClassTier, SkillType } from '../types';

/**
 * 클래스 티어별 스킬 레벨업 시 MP 소모량 감소 수치
 * - 퍼스트 클래스: 10
 * - 세컨드 클래스: 20
 * - 라스트 클래스: 50
 * - 파이널 클래스: 100
 */
export const getSkillMpReductionPerLevel = (tier?: ClassTier | string): number => {
    if (!tier) return 10;
    const tierStr = String(tier);
    if (tier === ClassTier.FINAL || tierStr.includes('파이널') || tierStr.toUpperCase() === 'FINAL') {
        return 200;
    }
    if (tier === ClassTier.LAST || tierStr.includes('라스트') || tierStr.toUpperCase() === 'LAST') {
        return 50;
    }
    if (tier === ClassTier.SECOND || tierStr.includes('세컨드') || tierStr.toUpperCase() === 'SECOND') {
        return 20;
    }
    if (tier === ClassTier.FIRST || tierStr.includes('퍼스트') || tierStr.toUpperCase() === 'FIRST') {
        return 10;
    }
    return 10;
};

/**
 * 스킬 레벨업 시 새로운 MP 소모량을 산출합니다 (최소 1 MP 유지).
 */
export const getReducedMpCostOnLevelUp = (skill: {
    tier?: ClassTier | string;
    baseTier?: ClassTier | string;
    minClassTier?: ClassTier | string;
    mpCost?: number;
    type?: SkillType | string;
}): number => {
    const currentMp = skill.mpCost ?? 10;
    const tier = skill.tier || skill.baseTier || skill.minClassTier || ClassTier.FIRST;
    const reduction = getSkillMpReductionPerLevel(tier);
    return Math.max(1, currentMp - reduction);
};

/**
 * 스킬이 패시브 스킬인지 확인합니다.
 */
export const isPassiveSkill = (skill?: { type?: SkillType | string } | null): boolean => {
    if (!skill || !skill.type) return false;
    return skill.type === SkillType.PASSIVE || skill.type === '패시브' || skill.type === 'PASSIVE';
};

/**
 * 스킬의 표기 MP 소모량을 반환합니다.
 * 패시브 스킬의 경우 무조건 0을 반환합니다.
 */
export const getSkillDisplayMpCost = (skill?: { type?: SkillType | string; mpCost?: number } | null): number => {
    if (!skill) return 0;
    if (isPassiveSkill(skill)) return 0;
    return skill.mpCost ?? 0;
};
