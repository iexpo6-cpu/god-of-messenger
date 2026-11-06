import { ClassTier, Skill, SkillTarget, SkillType } from '../types';

/**
 * 파이널 클래스 레벨 비례 스킬 비율 및 슬롯 악용 방지 관리 서비스
 * 
 * [규칙]
 * 1. 파이널 클래스(Lv.1000) 기본 비율을 시작점으로 하여,
 *    1000레벨(2000레벨, 3000레벨 등)이 상승할 때마다 최대로 설정할 수 있는 비율
 *    (공격력, 버프, 패시브)이 약소하게 차근차근 증가합니다.
 *    단, 디버프 스킬은 아무리 레벨이 높아도 90%가 절대 최대 상한선입니다.
 * 
 * 2. 악용 방지 (Anti-Exploit):
 *    1000레벨 구간(Lv.1000~1999)에 해금되는 5개의 스킬 슬롯(1~5번 슬롯)을 스킬 잊기한 후,
 *    2000레벨에서 더 높은 비율로 재제작하는 악용을 방지하기 위해:
 *    - 1~5번째 슬롯 스킬은 영구적으로 1000레벨 기본 비율이 고정 적용됩니다.
 *    - 2000레벨(6번째 만든 스킬) 슬롯부터 레벨 비례 상향 비율이 적용됩니다.
 *    - 슬롯 6~10번: 2000레벨 기준 비율
 *    - 슬롯 11~15번: 3000레벨 기준 비율
 *    - 슬롯 16~20번: 4000레벨 기준 비율
 */

// 파이널 클래스 스킬 판별
export const isFinalTierSkill = (skill: Partial<Skill> | null | undefined): boolean => {
  if (!skill) return false;
  const tierStr = String(skill.tier || '').toUpperCase();
  return tierStr.includes('FINAL') || tierStr.includes('파이널') || tierStr.includes('4');
};

const isAccOrEvaStatName = (stat?: string): boolean => {
  if (!stat) return false;
  return ['Acc', 'MAcc', 'Eva', 'MEva', '물리명중률', '마법명중률', '물리회피율', '마법회피율', 'P.Acc', 'M.Acc', 'P.Eva', 'M.Eva'].includes(stat);
};

/**
 * 스킬의 위력 계수(powerRatio) 및 부가 효과 수치를 역산하여,
 * 해당 파이널 클래스 스킬이 최소 몇 단계(1000레벨 단위 보너스 스텝) 슬롯에서 생성되었는지 추론합니다.
 * 이를 통해 finalSkillSlot 정보가 누락된 스킬이 있더라도 상위 슬롯 스킬을 하위 슬롯(1~5번)으로 밀어넣어
 * 상위 비율 스킬을 중복 제작하는 악용을 원천 차단합니다.
 */
export const inferMinBonusStepsForFinalSkill = (skill: Partial<Skill> | null | undefined): number => {
  if (!skill || !isFinalTierSkill(skill)) return 0;

  const wasOriginallyAoE =
    (skill.targetType === 'aoe' || (skill.targetType as string) === 'all') &&
    !skill.finalEnhanceData?.isAoEExpanded &&
    !skill.finalEnhanceData?.isBuffAlliesExpanded &&
    !skill.finalEnhanceData?.isDebuffAoEExpanded;

  const targetMode: 'single' | 'aoe' = wasOriginallyAoE ? 'aoe' : 'single';
  let minSteps = 0;

  // 1. 물리/마법 공격 스킬
  if (skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC) {
    const ratio = skill.powerRatio || 0;
    const baseCap = wasOriginallyAoE ? 5000 : 10000;
    const stepInc = wasOriginallyAoE ? 500 : 1000;
    if (ratio > baseCap) {
      minSteps = Math.max(minSteps, Math.ceil((ratio - baseCap) / stepInc));
    }

    // 공격 스킬 부가 버프 검사
    const origBuffs = (skill.buffEffects || []).filter((ef: any) => !ef?.isEnhancedAdded && ef?.type !== 'CLEANSE');
    if (origBuffs.length > 0) {
      const totalBuffVal = origBuffs.reduce((sum, ef) => sum + (ef.value || 0), 0);
      let s = 0;
      while (s < 20 && getFinalAttackBuffCap(targetMode, s) < totalBuffVal) {
        s++;
      }
      minSteps = Math.max(minSteps, s);
    }

    // 공격 스킬 부가 디버프 검사
    if (skill.isAttackWithDebuff && (skill.debuffValue || 0) > 0) {
      let s = 0;
      while (s < 20 && getFinalAttackDebuffCap(targetMode, s) < (skill.debuffValue || 0)) {
        s++;
      }
      minSteps = Math.max(minSteps, s);
    }
  }

  // 2. 버프 스킬
  if (skill.type === SkillType.BUFF) {
    const origBuffs = (skill.buffEffects || []).filter((ef: any) => !ef?.isEnhancedAdded && ef?.type !== 'CLEANSE');
    if (origBuffs.length > 0) {
      let anyAccEva = false;
      origBuffs.forEach((ef) => {
        const isAccEva = ef.type === 'STAT_BOOST' && isAccOrEvaStatName(ef.targetStat);
        if (isAccEva) anyAccEva = true;
        const isAllElem =
          (ef.type === 'ELEMENTAL_DMG_BOOST' || ef.type === 'ELEMENTAL_RES_BOOST') &&
          (ef.targetElement === '모든 속성' || ef.targetElement === '모든속성');
        let s = 0;
        while (s < 20 && getFinalBuffBaseCap(targetMode, isAccEva, isAllElem, s) < (ef.value || 0)) {
          s++;
        }
        minSteps = Math.max(minSteps, s);
      });

      const totalVal = origBuffs.reduce((sum, ef) => sum + (ef.value || 0), 0);
      let sTotal = 0;
      while (sTotal < 20 && getFinalBuffTotalCap(targetMode, origBuffs.length, anyAccEva, false, sTotal) < totalVal) {
        sTotal++;
      }
      minSteps = Math.max(minSteps, sTotal);
    }
  }

  // 3. 디버프 스킬
  if (skill.type === SkillType.DEBUFF) {
    const origDebuffs = (skill.debuffEffects || []).filter((ef: any) => !ef?.type || ef?.type === 'STAT');
    if (origDebuffs.length > 0) {
      let anyAccEva = false;
      origDebuffs.forEach((ef) => {
        const isAccEva = isAccOrEvaStatName(ef.stat);
        if (isAccEva) anyAccEva = true;
        let s = 0;
        while (s < 20 && (ef.value || 0) <= 90 && getFinalDebuffBaseCap(targetMode, isAccEva, s) < (ef.value || 0)) {
          s++;
        }
        if (s < 20) minSteps = Math.max(minSteps, s);
      });

      const totalVal = origDebuffs.reduce((sum, ef) => sum + (ef.value || 0), 0);
      let sTotal = 0;
      while (sTotal < 20 && totalVal <= 90 && getFinalDebuffTotalCap(targetMode, origDebuffs.length, anyAccEva, sTotal) < totalVal) {
        sTotal++;
      }
      if (sTotal < 20) minSteps = Math.max(minSteps, sTotal);
    }
  }

  // 4. 패시브 스킬
  if (skill.type === SkillType.PASSIVE) {
    const origPassives = skill.passiveEffects || [];
    const hasCond = Boolean(skill.effectFormula && skill.effectFormula.includes('[COND:'));
    if (origPassives.length > 0) {
      let maxCapMult = 1.0;
      let hasStat = false;
      origPassives.forEach((ef) => {
        if (ef.category === 'STAT') hasStat = true;
        const isAccEva = isAccOrEvaStatName(ef.target);
        if (isAccEva) maxCapMult = 1.5;
        let s = 0;
        while (s < 20) {
          const base = ef.category === 'COMBAT' ? getFinalPassiveCombatCap(s) : getFinalPassiveStatCap(s);
          const effCap = Math.floor(Math.floor(base * (hasCond ? 1.2 : 1.0)) * (isAccEva ? 1.5 : 1.0));
          if (effCap >= (ef.value || 0)) break;
          s++;
        }
        minSteps = Math.max(minSteps, s);
      });

      const totalVal = origPassives.reduce((sum, ef) => sum + (ef.value || 0), 0);
      let sTotal = 0;
      while (sTotal < 20) {
        const base = hasStat ? getFinalPassiveStatCap(sTotal) : getFinalPassiveCombatCap(sTotal);
        const effCap = Math.floor(Math.floor(base * (hasCond ? 1.2 : 1.0)) * maxCapMult);
        if (effCap >= totalVal) break;
        sTotal++;
      }
      minSteps = Math.max(minSteps, sTotal);
    }
  }

  return Math.max(0, minSteps);
};

/**
 * 현재 캐릭터가 보유 중인 파이널 클래스 스킬들의 슬롯 번호 매핑 및 점유 슬롯 목록을 산출합니다.
 * 기존에 생성된 레거시 스킬(finalSkillSlot 속성이 없는 스킬)도 위력/효과 수치를 역산하여
 * 해당 스킬이 생성된 최소 슬롯 구간(예: 2000레벨 비율이면 6번 슬롯 이상)에 우선 배치합니다.
 */
export const getFinalSkillSlotsUsage = (skills: Skill[] = []): {
  usedSlots: Set<number>;
  assignedSkills: Array<{ skill: Skill; slot: number }>;
} => {
  const finalSkills = skills.filter(s => isFinalTierSkill(s));
  const usedSlots = new Set<number>();
  const assignedSkills: Array<{ skill: Skill; slot: number }> = [];

  // 0차: 기존 스킬 강화로 소모된 파이널 클래스 슬롯 등록
  skills.forEach((skill) => {
    if (skill.finalEnhanceData?.allocatedSlots) {
      skill.finalEnhanceData.allocatedSlots.forEach((slotNum) => {
        if (typeof slotNum === 'number' && slotNum > 0) {
          usedSlots.add(slotNum);
          assignedSkills.push({ skill, slot: slotNum });
        }
      });
    }
  });

  // 1차: 이미 finalSkillSlot이 명시된 스킬 등록 (단, 실제 스킬 수치가 요구하는 최소 슬롯 이상으로 보정)
  finalSkills.forEach((skill) => {
    if (typeof skill.finalSkillSlot === 'number' && skill.finalSkillSlot > 0) {
      const minSteps = inferMinBonusStepsForFinalSkill(skill);
      const minRequiredSlot = minSteps * 5 + 1;
      let targetSlot = Math.max(skill.finalSkillSlot, minRequiredSlot);
      while (usedSlots.has(targetSlot)) {
        targetSlot++;
      }
      usedSlots.add(targetSlot);
      assignedSkills.push({ skill, slot: targetSlot });
    }
  });

  // 2차: finalSkillSlot이 없는 스킬들에 대해 최소 요구 슬롯(minRequiredSlot)이 높은 순으로 먼저 슬롯 배정
  const unslottedSkills = finalSkills
    .filter(skill => typeof skill.finalSkillSlot !== 'number' || skill.finalSkillSlot <= 0)
    .map((skill, idx) => {
      const minSteps = inferMinBonusStepsForFinalSkill(skill);
      return {
        skill,
        idx,
        minRequiredSlot: minSteps * 5 + 1
      };
    })
    .sort((a, b) => {
      if (b.minRequiredSlot !== a.minRequiredSlot) {
        return b.minRequiredSlot - a.minRequiredSlot;
      }
      return a.idx - b.idx;
    });

  unslottedSkills.forEach(({ skill, minRequiredSlot }) => {
    let slotCandidate = Math.max(1, minRequiredSlot);
    while (usedSlots.has(slotCandidate)) {
      slotCandidate++;
    }
    usedSlots.add(slotCandidate);
    assignedSkills.push({ skill, slot: slotCandidate });
  });

  return { usedSlots, assignedSkills };
};

/**
 * 새로 생성할 파이널 클래스 스킬이 배정받을 가장 작은 빈 슬롯 번호(1-indexed)를 찾습니다.
 */
export const getNextAvailableFinalSkillSlot = (skills: Skill[] = []): number => {
  const { usedSlots } = getFinalSkillSlotsUsage(skills);
  let slot = 1;
  while (usedSlots.has(slot)) {
    slot++;
  }
  return slot;
};

/**
 * 특정 파이널 클래스 슬롯 번호와 캐릭터 레벨을 바탕으로 적용되는 기준 레벨(티어 레벨)을 산출합니다.
 * - 1~5번 슬롯: 무조건 1000레벨 (스킬 잊기 후 재제작 악용 방지)
 * - 6~10번 슬롯: 2000레벨 (캐릭터 레벨이 2000 이상이어야 함)
 * - 11~15번 슬롯: 3000레벨 (캐릭터 레벨이 3000 이상이어야 함)
 */
export const getFinalSkillSlotLevelTier = (slotNumber: number, characterLevel: number): number => {
  if (slotNumber <= 5) {
    return 1000; // 1~5번째 슬롯은 영구적으로 1000레벨 기본 비율 고정
  }
  const maxSlotLevelTier = 1000 + Math.floor((slotNumber - 1) / 5) * 1000;
  const charLevelTier = Math.floor(Math.max(1000, characterLevel) / 1000) * 1000;
  return Math.min(charLevelTier, maxSlotLevelTier);
};

/**
 * 1000레벨 기준 대비 몇 단계(1000레벨 단위 상승치)가 적용되는지 산출합니다.
 * (예: 1000Lv -> 0단계, 2000Lv -> 1단계, 3000Lv -> 2단계)
 */
export const getFinalSkillBonusSteps = (slotNumber: number, characterLevel: number): number => {
  const levelTier = getFinalSkillSlotLevelTier(slotNumber, characterLevel);
  return Math.max(0, Math.floor((levelTier - 1000) / 1000));
};

// ========================================================
// 1. 공격 스킬 (물리/마법) 위력 상한 계산
// 기본(1000Lv): 단일 10,000%, 광역 5,000%
// 1000레벨 증가당: 단일 +1,000%, 광역 +500%
// 타속성일 경우 65% 계수 적용
// ========================================================
export const getFinalAttackPowerCap = (
  steps: number = 0,
  isAoE: boolean = false,
  isNativeElement: boolean = true
): number => {
  const baseSingle = 10000 + (steps * 1000);
  const baseAoE = 5000 + (steps * 500);
  const rawCap = isAoE ? baseAoE : baseSingle;
  return isNativeElement ? rawCap : Math.floor(rawCap * 0.65);
};

// 공격 스킬의 부가 버프 상한: 기본 단일 30%, 광역 15% / 1000레벨당 단일 +3%, 광역 +1.5%
export const getFinalAttackBuffCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  steps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';
  if (isAoE) {
    return Math.round(15 + (steps * 1.5));
  }
  return 30 + (steps * 3);
};

// 공격 스킬의 부가 디버프 상한: 기본 단일 20%, 광역 10% / 1000레벨당 단일 +2%, 광역 +1% (최대 90% 제한)
export const getFinalAttackDebuffCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  steps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';
  const rawCap = isAoE ? Math.round(10 + (steps * 1)) : (20 + (steps * 2));
  return Math.min(90, rawCap);
};

// ========================================================
// 2. 버프 스킬 상한 계산
// 단일 슬롯 기본(1000Lv): 단일 100%, 광역 50%
// 1000레벨 증가당: 단일 +10%, 광역 +5%
// 다중 슬롯 합산: 1개 슬롯 기준의 1.5배
// 명중/회피: 1.2배
// ========================================================
export const getFinalBuffBaseCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  isAccEva: boolean = false,
  isAllElement: boolean = false,
  steps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';
  const base = isAoE ? (50 + steps * 5) : (100 + steps * 10);
  const calculated = isAccEva ? Math.round(base * 1.2) : base;
  return isAllElement ? Math.floor(calculated / 2) : calculated;
};

export const getFinalBuffTotalCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  isAccEva: boolean = false,
  isAllElement: boolean = false,
  steps: number = 0
): number => {
  const base = getFinalBuffBaseCap(target, isAccEva, isAllElement, steps);
  return slotCount >= 2 ? Math.round(base * 1.5) : base;
};

export const getFinalBuffSlotMaxAllowed = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  otherSlotsSum: number = 0,
  isAccEva: boolean = false,
  isAllElement: boolean = false,
  steps: number = 0
): number => {
  const base = getFinalBuffBaseCap(target, isAccEva, isAllElement, steps);
  const total = getFinalBuffTotalCap(target, slotCount, isAccEva, isAllElement, steps);
  const remainingTotal = Math.max(0, total - otherSlotsSum);
  return Math.min(base, remainingTotal);
};

// ========================================================
// 3. 디버프 스킬 상한 계산 (※ 최대 90% 절대 캡 적용)
// 단일 슬롯 기본(1000Lv): 단일 50%, 광역 25%
// 1000레벨 증가당: 단일 +5%, 광역 +2.5%
// 다중 슬롯 합산: 1개 슬롯 기준의 1.5배 (단, 최대 90% 제한)
// 명중/회피: 1.5배 (단, 최대 90% 제한)
// ========================================================
export const getFinalDebuffBaseCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  isAccEva: boolean = false,
  steps: number = 0
): number => {
  const isAoE = target === 'aoe' || target === 'all';
  const base = isAoE ? Math.round(25 + steps * 2.5) : (50 + steps * 5);
  const calculated = isAccEva ? Math.round(base * 1.5) : base;
  return Math.min(90, calculated);
};

export const getFinalDebuffTotalCap = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  isAccEva: boolean = false,
  steps: number = 0
): number => {
  const base = getFinalDebuffBaseCap(target, isAccEva, steps);
  const total = slotCount >= 2 ? Math.round(base * 1.5) : base;
  return Math.min(90, total);
};

export const getFinalDebuffSlotMaxAllowed = (
  target: SkillTarget | 'single' | 'aoe' | 'all' = 'single',
  slotCount: number = 1,
  otherSlotsSum: number = 0,
  isAccEva: boolean = false,
  steps: number = 0
): number => {
  const base = getFinalDebuffBaseCap(target, isAccEva, steps);
  const total = getFinalDebuffTotalCap(target, slotCount, isAccEva, steps);
  const remainingTotal = Math.max(0, total - otherSlotsSum);
  return Math.min(base, remainingTotal);
};

// ========================================================
// 4. 패시브 스킬 상한 계산
// 기본 스탯(1000Lv): 30% / 1000레벨당 +3%
// 전투 효과(1000Lv): 20% / 1000레벨당 +2%
// 조건부(착용무기 한정): 1.2배
// 명중/회피: 1.5배
// ========================================================
export const getFinalPassiveStatCap = (steps: number = 0): number => {
  return 30 + (steps * 3);
};

export const getFinalPassiveCombatCap = (steps: number = 0): number => {
  return 20 + (steps * 2);
};

export const getFinalPassiveCap = (
  hasCondition: boolean = false,
  steps: number = 0,
  category: 'STAT' | 'COMBAT' = 'STAT'
): number => {
  const base = category === 'STAT' ? getFinalPassiveStatCap(steps) : getFinalPassiveCombatCap(steps);
  const bonusMult = hasCondition ? 1.2 : 1.0;
  return Math.floor(base * bonusMult);
};
