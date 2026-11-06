import { Skill, SkillType, Enemy } from '../types';

/**
 * 몬스터/보스/NPC 전투 스킬 실행 및 광역 공격 처리 전용 서비스
 */

/**
 * 스킬이 광역 스킬인지 판별
 */
export const isEnemyAoeSkill = (skill?: Skill | null): boolean => {
  if (!skill) return false;
  const target = String(skill.targetType || '').toLowerCase();
  if (target === 'aoe' || target === 'all') return true;
  
  const desc = String(skill.description || '');
  const formula = String(skill.effectFormula || '');
  if (desc.includes('전체') || desc.includes('모든 적') || desc.includes('광역') || formula.includes('[AOE]')) {
    return true;
  }
  return false;
};

/**
 * 적(몬스터 또는 NPC)의 스킬 사용 확률 계산
 * - NPC 적(인맥, 결투 상대, 영원의 라이벌, 결사대, 복수자 등)은 자신이 실제로 보유한 스킬을 90%의 높은 빈도로 적극 사용
 */
export const getEnemySkillProbability = (enemy: Enemy, combatType?: string): number => {
  if (!enemy) return 0.3;

  const isNpcCombatant = Boolean(
    (enemy as any).isNpc ||
    (enemy as any).isStudent ||
    enemy.job ||
    enemy.combatStyle ||
    combatType === 'relation_battle' ||
    combatType === 'eternal_rival_duel' ||
    combatType === 'arena' ||
    combatType === 'tournament' ||
    combatType === 'relation_ambush' ||
    enemy.name.includes('[영원의 라이벌]') ||
    enemy.name.includes('[복수자]') ||
    enemy.name.includes('[대련 상대]') ||
    enemy.name.includes('[선봉') ||
    enemy.name.includes('[수호') ||
    enemy.name.includes('[정예') ||
    enemy.name.includes('[비전') ||
    enemy.name.includes('[성역') ||
    enemy.name.includes('[PVP]')
  );

  // NPC는 실제 보유 스킬을 90% 확률로 사용
  if (isNpcCombatant) {
    return 0.5;
  }

  // 보스급 몬스터 및 시련 배틀
  const isPvpOrBossOrTrial = combatType === 'PVP_battle' || 
                             combatType === 'final_trial_battle' || 
                             enemy.isBoss || 
                             (enemy as any).trialTier;
  if (isPvpOrBossOrTrial) {
    return 0.45;
  }

  // 일반 야생 몬스터
  return 0.35;
};

/**
 * 몬스터/보스/NPC가 사용할 스킬을 선택
 * - NPC가 실제로 갖고 있는 스킬(단일 공격, 버프, 디버프, 광역 공격 등)을 고르게 활용
 * - 체력 50% 이하 위기 시에만 각성/회복 스킬 발동
 */
export const chooseEnemySkill = (skills: Skill[], isBoss: boolean = false, enemyCurrentHp?: number, enemyMaxHp?: number): Skill | null => {
  const activeSkills = (skills || []).filter(s => s && s.type !== SkillType.PASSIVE);
  if (activeSkills.length === 0) return null;

  const hpRatio = (enemyCurrentHp && enemyMaxHp && enemyMaxHp > 0) ? (enemyCurrentHp / enemyMaxHp) : 1.0;
  const isEmergency = hpRatio <= 0.5;

  const weightedList: { skill: Skill; weight: number }[] = activeSkills.map(skill => {
    const isAoe = isEnemyAoeSkill(skill);
    const isAwakening = skill.name.includes('각성') || skill.name.includes('결전') || skill.effectFormula?.includes('MANA_SHIELD');
    const isBuffOrHeal = skill.type === SkillType.BUFF || 
                         skill.type === SkillType.HEAL || 
                         skill.targetType === 'self' || 
                         skill.targetType === 'ally';
    const isDebuff = skill.type === SkillType.DEBUFF;

    // 각성 스킬은 체력이 50% 이하일 때만 발동
    if (isAwakening) {
      if (!isEmergency) return { skill, weight: 0 };
      return { skill, weight: 250 }; // 위기 시 강력하게 우선 발동
    }

    // 부활 및 환생 스킬 (위기 시 우선 발동)
    const isResurrection = skill.name.includes('부활') || skill.name.includes('환생') || skill.effectFormula?.includes('RESURRECT');
    if (isResurrection) {
      if (!isEmergency) return { skill, weight: 10 };
      return { skill, weight: 200 };
    }

    // 회복 스킬
    if (skill.type === SkillType.HEAL || skill.effectFormula?.includes('RECOV') || skill.name.includes('치유') || skill.description?.includes('회복')) {
      if (!isEmergency) return { skill, weight: 15 };
      return { skill, weight: 180 };
    }

    let weight = 100;
    if (isAoe) {
      weight = isBoss ? 65 : 50; // NPC의 실제 광역 스킬도 충분히 발동되도록 가중치 보정
    } else if (isBuffOrHeal) {
      weight = 75; // 버프/강화 스킬
    } else if (isDebuff) {
      weight = 80; // 디버프/약화 스킬
    }

    return { skill, weight };
  }).filter(item => item.weight > 0);

  const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return activeSkills[0];

  let roll = Math.random() * totalWeight;
  for (const item of weightedList) {
    if (roll < item.weight) {
      return item.skill;
    }
    roll -= item.weight;
  }

  return weightedList[0].skill;
};

/**
 * 적/보스 광역 스킬 피해량 완화 배율 (전체 타격 스킬이므로 65% 수준으로 감쇄 조정)
 */
export const ENEMY_AOE_DAMAGE_RATE = 0.2;

export const adjustEnemyDamageForAoe = (rawDamage: number, isAoe: boolean): number => {
  if (!isAoe) return rawDamage;
  return Math.max(1, Math.floor(rawDamage * ENEMY_AOE_DAMAGE_RATE));
};
