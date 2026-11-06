import { ClassTier, SkillTarget, SkillType } from '../types';

/**
 * 버프 스킬 슬롯 1개 기준 최대 상한 (1배 기준 원상복귀)
 * 퍼스트 클래스: 단일 20%, 광역 10%
 * 세컨드 클래스: 단일 40%, 광역 20%
 * 라스트 클래스: 단일 60%, 광역 30%
 * 파이널 클래스: 단일 100%, 광역 50%
 * (파이널 클래스 공격 스킬 부가 버프: 단일 30%, 광역 15%)
 */
export const getBuffBaseCap = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  isAllElement: boolean = false,
  bonusSteps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';

  if (isFinalAttackSkill) {
    const baseVal = isAoE ? Math.round(15 + bonusSteps * 1.5) : (30 + bonusSteps * 3);
    return isAllElement ? Math.floor(baseVal / 2) : baseVal;
  }

  const tierStr = String(tier || '').toUpperCase();
  let baseCap = 20;

  if (tierStr.includes('FIRST') || tierStr.includes('퍼스트') || tierStr.includes('1')) {
    baseCap = isAoE ? 10 : 20;
  } else if (tierStr.includes('SECOND') || tierStr.includes('세컨드') || tierStr.includes('2')) {
    baseCap = isAoE ? 20 : 40;
  } else if (tierStr.includes('LAST') || tierStr.includes('라스트') || tierStr.includes('3')) {
    baseCap = isAoE ? 30 : 60;
  } else if (tierStr.includes('FINAL') || tierStr.includes('파이널') || tierStr.includes('4')) {
    baseCap = isAoE ? (50 + bonusSteps * 5) : (100 + bonusSteps * 10);
  }

  const calculatedCap = isAccEva ? Math.round(baseCap * 1.2) : baseCap;
  return isAllElement ? Math.floor(calculatedCap / 2) : calculatedCap;
};

/**
 * 버프 스킬 다중 슬롯 합산 상한
 * 슬롯 1개: 1.0배 (기본 상한)
 * 슬롯 2개 이상: 1.5배 (슬롯 3개, 4개여도 1.5배 고정)
 */
export const getBuffTotalCap = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  isAllElement: boolean = false,
  bonusSteps: number = 0
): number => {
  const base = getBuffBaseCap(tier, target, isAccEva, isFinalAttackSkill, isAllElement, bonusSteps);
  return slotCount >= 2 ? Math.round(base * 1.5) : base;
};

/**
 * 버프 스킬 특정 슬롯에서 설정 가능한 최대 비율
 * - 개별 슬롯은 원래 1개 슬롯 기준 최대 비율(기본 상한)을 초과할 수 없음
 * - 다른 슬롯들과의 합산은 슬롯 수에 따른 총 상한(1.5배)을 초과할 수 없음
 */
export const getBuffSlotMaxAllowed = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all',
  slotCount: number,
  otherSlotsSum: number,
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  isAllElement: boolean = false,
  bonusSteps: number = 0
): number => {
  const base = getBuffBaseCap(tier, target, isAccEva, isFinalAttackSkill, isAllElement, bonusSteps);
  const total = getBuffTotalCap(tier, target, slotCount, isAccEva, isFinalAttackSkill, isAllElement, bonusSteps);
  const remainingTotal = Math.max(0, total - otherSlotsSum);
  return Math.min(base, remainingTotal);
};

/**
 * 디버프 능력치 스킬 슬롯 1개 기준 최대 상한 (최대 90% 절대 캡)
 * 퍼스트 클래스: 단일 10%, 광역 5%
 * 세컨드 클래스: 단일 20%, 광역 10%
 * 라스트 클래스: 단일 30%, 광역 15%
 * 파이널 클래스: 단일 50%, 광역 25% (1000레벨당 단일 +5%, 광역 +2.5% 차근차근 증가, 최대 90% 제한)
 */
export const getDebuffBaseCap = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  bonusSteps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';

  if (isFinalAttackSkill) {
    const rawVal = isAoE ? Math.round(10 + bonusSteps * 1) : (20 + bonusSteps * 2);
    return Math.min(90, rawVal);
  }

  const tierStr = String(tier || '').toUpperCase();
  let baseCap = 10;

  if (tierStr.includes('FIRST') || tierStr.includes('퍼스트') || tierStr.includes('1')) {
    baseCap = isAoE ? 5 : 10;
  } else if (tierStr.includes('SECOND') || tierStr.includes('세컨드') || tierStr.includes('2')) {
    baseCap = isAoE ? 10 : 20;
  } else if (tierStr.includes('LAST') || tierStr.includes('라스트') || tierStr.includes('3')) {
    baseCap = isAoE ? 15 : 30;
  } else if (tierStr.includes('FINAL') || tierStr.includes('파이널') || tierStr.includes('4')) {
    baseCap = isAoE ? Math.round(25 + bonusSteps * 2.5) : (50 + bonusSteps * 5);
  }

  const calculated = isAccEva ? Math.round(baseCap * 1.5) : baseCap;
  return Math.min(90, calculated);
};

/**
 * 디버프 스킬 다중 슬롯 합산 상한 (최대 90% 절대 캡)
 * 슬롯 1개: 1.0배 (기본 상한)
 * 슬롯 2개 이상: 1.5배 (최대 90% 제한)
 */
export const getDebuffTotalCap = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  bonusSteps: number = 0
): number => {
  const base = getDebuffBaseCap(tier, target, isAccEva, isFinalAttackSkill, bonusSteps);
  const total = slotCount >= 2 ? Math.round(base * 1.5) : base;
  return Math.min(90, total);
};

/**
 * 디버프 스킬 특정 슬롯에서 설정 가능한 최대 비율
 * - 개별 슬롯은 원래 1개 슬롯 기준 최대 비율(기본 상한)을 초과할 수 없음
 * - 다른 슬롯들과의 합산은 슬롯 수에 따른 총 상한(최대 90%)을 초과할 수 없음
 */
export const getDebuffSlotMaxAllowed = (
  tier: ClassTier | string,
  target: SkillTarget | 'single' | 'aoe' | 'all',
  slotCount: number,
  otherSlotsSum: number,
  isAccEva: boolean = false,
  isFinalAttackSkill: boolean = false,
  bonusSteps: number = 0
): number => {
  const base = getDebuffBaseCap(tier, target, isAccEva, isFinalAttackSkill, bonusSteps);
  const total = getDebuffTotalCap(tier, target, slotCount, isAccEva, isFinalAttackSkill, bonusSteps);
  const remainingTotal = Math.max(0, total - otherSlotsSum);
  return Math.min(base, remainingTotal);
};
