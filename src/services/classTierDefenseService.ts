import { ClassTier, Character, Companion, Skill } from '../types';

/**
 * 클래스 해방 단계에 따른 방어력 계수 및 최대 체력 보너스 관리 서비스
 * - 1번 요청: 클래스 해방 정도에 따라 방어력 계수 상향 (퍼스트 +30%, 세컨드 +60%, 라스트 +100%, 파이널 +150%)
 * - 2번 요청: 클래스 해방 정도에 따라 최대 체력(MaxHP) 상향 (퍼스트 +20%, 세컨드 +40%, 라스트 +70%, 파이널 +100%)
 */

export interface ClassTierDefenseConfig {
  defenseMultiplier: number; // 방어력 계수 가산치 (예: 0.3 = +30%)
  hpMultiplier: number;      // 최대 체력 가산치 (예: 0.2 = +20%)
  tierLabel: string;
}

export const CLASS_TIER_DEFENSE_TABLE: Record<ClassTier, ClassTierDefenseConfig> = {
  [ClassTier.NONE]: { defenseMultiplier: 0.0, hpMultiplier: 0.0, tierLabel: '일반' },
  [ClassTier.F]: { defenseMultiplier: 0.0, hpMultiplier: 0.0, tierLabel: 'F' },
  [ClassTier.BOND]: { defenseMultiplier: 0.20, hpMultiplier: 0.10, tierLabel: '인연' },
  [ClassTier.FIRST]: { defenseMultiplier: 0.45, hpMultiplier: 0.20, tierLabel: '퍼스트 클래스' },
  [ClassTier.SECOND]: { defenseMultiplier: 0.85, hpMultiplier: 0.40, tierLabel: '세컨드 클래스' },
  [ClassTier.LAST]: { defenseMultiplier: 1.35, hpMultiplier: 0.70, tierLabel: '라스트 클래스' },
  [ClassTier.FINAL]: { defenseMultiplier: 2.00, hpMultiplier: 1.00, tierLabel: '파이널 클래스' }
};

/**
 * 엔티티(캐릭터, 동료, NPC 적 등)의 클래스 해방 등급을 판별합니다.
 */
export const resolveEntityClassTier = (entity: any, skills?: Skill[]): ClassTier => {
  if (!entity) return ClassTier.NONE;

  // 1. 엔티티 객체에 명시된 classTier 우선 확인
  if (entity.classTier && typeof entity.classTier === 'string') {
    const rawTier = entity.classTier;
    if (Object.values(ClassTier).includes(rawTier as ClassTier)) {
      return rawTier as ClassTier;
    }
  }

  // 2. 시련 클리어 플래그 확인
  if (entity.hasClearedFinalTrial || entity.finalTrialCleared) return ClassTier.FINAL;
  if (entity.hasClearedLastTrial || entity.lastTrialCleared) return ClassTier.LAST;
  if (entity.hasClearedSecondTrial || entity.secondTrialCleared) return ClassTier.SECOND;
  if (entity.hasClearedFirstTrial || entity.firstTrialCleared) return ClassTier.FIRST;

  // 3. 잠재력 해방 등급 확인
  if (entity.liberationPotential) {
    const pot = entity.liberationPotential as ClassTier;
    if (pot === ClassTier.FINAL || pot === ClassTier.LAST || pot === ClassTier.SECOND || pot === ClassTier.FIRST) {
      return pot;
    }
  }

  // 4. 보유 스킬 목록에서 최고 티어 추출
  const skillList = skills || entity.skills;
  if (Array.isArray(skillList) && skillList.length > 0) {
    let highestTier = ClassTier.NONE;
    const tierPriority: Record<string, number> = {
      [ClassTier.FINAL]: 4,
      [ClassTier.LAST]: 3,
      [ClassTier.SECOND]: 2,
      [ClassTier.FIRST]: 1,
      [ClassTier.BOND]: 1,
      [ClassTier.NONE]: 0,
      [ClassTier.F]: 0
    };

    for (const sk of skillList) {
      if (sk && sk.tier) {
        const curPriority = tierPriority[sk.tier] || 0;
        const highestPriority = tierPriority[highestTier] || 0;
        if (curPriority > highestPriority) {
          highestTier = sk.tier as ClassTier;
        }
      }
    }
    if (tierPriority[highestTier] > 0) {
      return highestTier;
    }
  }

  // 5. NPC 레벨 기반 클래스 단계 보정 (인간형 NPC 적 대비)
  if (entity.isNpc || entity.isStudent || entity.job) {
    const lvl = entity.level || 1;
    if (lvl >= 1000) return ClassTier.FINAL;
    if (lvl >= 300) return ClassTier.LAST;
    if (lvl >= 100) return ClassTier.SECOND;
    if (lvl >= 30) return ClassTier.FIRST;
  }

  return ClassTier.NONE;
};

/**
 * 클래스 해방에 따른 방어력 스탯 및 최대 체력 보너스 계산
 */
export const calculateClassTierStatBonus = (
  entity: any,
  baseDef: number = 0,
  baseHp: number = 0,
  skills?: Skill[]
): {
  tier: ClassTier;
  defenseMultiplier: number;
  hpMultiplier: number;
  addedDef: number;
  addedHp: number;
} => {
  const tier = resolveEntityClassTier(entity, skills);
  const cfg = CLASS_TIER_DEFENSE_TABLE[tier] || CLASS_TIER_DEFENSE_TABLE[ClassTier.NONE];

  const addedDef = Math.floor(Math.max(0, baseDef) * cfg.defenseMultiplier);
  const addedHp = Math.floor(Math.max(0, baseHp) * cfg.hpMultiplier);

  return {
    tier,
    defenseMultiplier: cfg.defenseMultiplier,
    hpMultiplier: cfg.hpMultiplier,
    addedDef,
    addedHp
  };
};

/**
 * 파생 스탯(calculateDerivedStats) 단계에서 적용할 방어력 계수 보너스 반환
 */
export const getDerivedDefenseMultiplierForClassTier = (entityOrSkills: any, skills?: Skill[]): number => {
  const tier = resolveEntityClassTier(entityOrSkills, skills);
  const cfg = CLASS_TIER_DEFENSE_TABLE[tier] || CLASS_TIER_DEFENSE_TABLE[ClassTier.NONE];
  return cfg.defenseMultiplier;
};
