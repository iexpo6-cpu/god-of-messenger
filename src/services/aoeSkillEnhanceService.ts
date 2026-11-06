import { ActiveStatus, Skill } from '../types';
import { filterDebuffsForCleanse } from './statusCleanseService';

/**
 * 스킬 레벨당 MP 추가 감소량 (강화 1스택당 레벨별 200 MP 감소)
 */
export const MP_REDUCTION_PER_LEVEL_PER_STACK = 200;

/**
 * 스킬 강화창에서 'MP 소모 감소' 강화를 적용했을 때,
 * 현재 스킬 레벨에 비례하여 즉시 감소된 MP 소모량을 반환합니다.
 */
export const calculateEnhancedSkillMpCost = (
    skill: Skill,
    prevStack: number,
    nextStack: number
): number => {
    const addedStacks = Math.max(0, nextStack - prevStack);
    if (addedStacks <= 0) return skill.mpCost;

    const currentLevel = Math.max(1, skill.level || 1);
    const immediateReduction = addedStacks * currentLevel * MP_REDUCTION_PER_LEVEL_PER_STACK;
    return Math.max(1, (skill.mpCost || 1) - immediateReduction);
};

/**
 * 스킬 레벨업(1레벨 상승) 시 'MP 소모 감소' 강화 스택에 따른 추가 MP 감소량을 반환합니다.
 */
export const getLevelUpMpReductionBonus = (skill?: Skill | null): number => {
    const stack = skill?.finalEnhanceData?.mpReductionStack || 0;
    if (stack <= 0) return 0;
    const rate = skill?.finalEnhanceData?.mpReductionAmountPerLevel || MP_REDUCTION_PER_LEVEL_PER_STACK;
    return stack * rate;
};

/**
 * 공격 광역기 특화 - [집중 융합]: 생존한 적 수에 반비례하여 피해 배율을 증폭합니다.
 * - 적 1명: 피해량 +50% (1.5배)
 * - 적 2명: 피해량 +25% (1.25배)
 * - 적 3명 이상: 기본 피해량 (1.0배)
 */
export const getFocusFusionDamageMultiplier = (
    skill?: Skill | null,
    livingEnemyCount: number = 1
): { multiplier: number; logTag: string } => {
    const isFocusFusion = Boolean(
        skill?.finalEnhanceData?.isFocusFusion ||
        skill?.effectFormula?.includes('집중 융합')
    );
    if (!isFocusFusion) {
        return { multiplier: 1.0, logTag: '' };
    }

    if (livingEnemyCount <= 1) {
        return { multiplier: 1.5, logTag: ' [집중 융합: 단일 대상 위력 +50%]' };
    }
    if (livingEnemyCount === 2) {
        return { multiplier: 1.25, logTag: ' [집중 융합: 2인 대상 위력 +25%]' };
    }
    return { multiplier: 1.0, logTag: '' };
};

/**
 * 공격 광역기 특화 - [신력 여진]: 시전 즉시 원래 피해의 50% 추가 폭발 피해를 계산합니다.
 */
export const getEchoAftershockDamage = (
    skill?: Skill | null,
    primaryDamage: number = 0
): { hasAftershock: boolean; aftershockDamage: number } => {
    const isEchoAftershock = Boolean(
        skill?.finalEnhanceData?.isEchoAftershock ||
        skill?.effectFormula?.includes('신력 여진')
    );
    if (!isEchoAftershock || primaryDamage <= 0) {
        return { hasAftershock: false, aftershockDamage: 0 };
    }
    const aftershockDamage = Math.max(1, Math.floor(primaryDamage * 0.5));
    return { hasAftershock: true, aftershockDamage };
};

/**
 * 버프 광역기 특화 - [기운 초월] 여부 확인
 */
export const isSkillAuraTranscend = (skill?: Skill | null): boolean => {
    return Boolean(
        skill?.finalEnhanceData?.isAuraTranscend ||
        skill?.effectFormula?.includes('기운 초월')
    );
};

/**
 * 디버프 광역기 특화 - [기운 잠식] 여부 확인
 */
export const isSkillAuraErosion = (skill?: Skill | null): boolean => {
    return Boolean(
        skill?.finalEnhanceData?.isAuraErosion ||
        skill?.effectFormula?.includes('기운 잠식')
    );
};

const HARMFUL_AILMENT_NAMES = new Set([
    '화상', '출혈', '빙결', '기절', '마비', '수면', '소멸', '흡정', '중독',
    '감전', '암흑', '공포', '속박', '파열', '월침', '월암', '냉기', '혼란',
    '지속 전장 결계', '마계의 저주', '저주의 반동'
]);

/**
 * 버프 광역기 특화 - [일제 정화]: 대상 아군의 해로운 상태이상 및 능력치 약화 디버프만 선별하여 모두 해제합니다 (버프 유지).
 */
export const applyBuffMassCleanse = (
    skill?: Skill | null,
    target?: { name?: string; statusEffects?: ActiveStatus[] } | null
): string | null => {
    const isMassCleanse = Boolean(
        skill?.finalEnhanceData?.isMassCleanse ||
        skill?.effectFormula?.includes('일제 정화') ||
        skill?.effectFormula?.includes('상태이상 해제(모두)') ||
        skill?.effectFormula?.includes('상태이상 해제(모든 상태이상)')
    );
    if (!isMassCleanse || !target || !target.statusEffects || target.statusEffects.length === 0) {
        return null;
    }

    const initialList = [...target.statusEffects];
    const cleanedList = filterDebuffsForCleanse(target.statusEffects, ['ALL']);
    const removedNames = initialList
        .filter(s => !cleanedList.includes(s))
        .map(s => s.name);

    target.statusEffects = cleanedList;

    if (removedNames.length === 0) return null;
    return `✨ [일제 정화] ${target.name || '아군'}의 해로운 효과(${removedNames.join(', ')})가 모두 정화되었습니다!`;
};

const SHIELD_AND_BUFF_NAMES = new Set([
    '마나 쉴드', '마나 쉴드 (패시브)', '방어 태세', '방어',
    '지속 치유 결계', '지속 마력 결계'
]);

/**
 * 디버프 광역기 특화 - [방어 붕괴]: 대상 적의 보호막과 이로운 버프 효과를 1개(보호막 우선) 해제합니다.
 */
export const applyDebuffDefenseShatter = (
    skill?: Skill | null,
    target?: { name?: string; statusEffects?: ActiveStatus[] } | null
): string | null => {
    const isDefenseShatter = Boolean(
        skill?.finalEnhanceData?.isDefenseShatter ||
        skill?.effectFormula?.includes('방어 붕괴')
    );
    if (!isDefenseShatter || !target || !target.statusEffects || target.statusEffects.length === 0) {
        return null;
    }

    // 1순위: 보호막 계열 탐색
    let removeIdx = target.statusEffects.findIndex((s) =>
        SHIELD_AND_BUFF_NAMES.has(s.name) ||
        s.name.includes('쉴드') ||
        s.name.includes('보호막') ||
        (s.effect && (s.effect.includes('쉴드') || s.effect.includes('보호막')))
    );

    // 2순위: 이로운 능력치 상승 버프(+% 수치) 탐색
    if (removeIdx === -1) {
        removeIdx = target.statusEffects.findIndex((s) => {
            const rawText = s.originalEffect || s.effect || '';
            return /\+\d+(?:\.\d+)?%/.test(rawText) && !HARMFUL_AILMENT_NAMES.has(s.name);
        });
    }

    if (removeIdx === -1) return null;

    const [removed] = target.statusEffects.splice(removeIdx, 1);
    return `💥 [방어 붕괴] ${target.name || '적'}의 [${removed.name}] 보호막·버프 효과가 파괴되었습니다!`;
};
