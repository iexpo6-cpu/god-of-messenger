import { Character, Companion, Skill, SkillType } from '../types';
import { calculateFinalStats } from '../utils';
import * as CombatUtils from './combatUtils';

// 스킬 타입 판별 캐시 (WeakMap을 통해 메모리 누수 없이 O(1) 초고속 조회)
const supportSkillCache = new WeakMap<Skill, boolean>();
const hpHealSkillCache = new WeakMap<Skill, boolean>();
const mpHealSkillCache = new WeakMap<Skill, boolean>();

/**
 * 동료 전술 및 타겟팅 지원 서비스
 * 파티원의 실제 최대 체력(장비, 버프, 칭호가 반영된 finalStats.maxHp)을 기준으로
 * 정확한 HP/MP 비율을 계산하고, 연산 캐싱을 통해 CPU 과부하를 억제합니다.
 */
export class CompanionTacticsService {
  /**
   * 엔티티의 실제 최대 체력(Max HP)을 계산합니다.
   * partyMembers 배열에 캐시된 finalStats가 있으면 우선 사용하고, 없으면 calculateFinalStats를 호출합니다.
   */
  public static getEntityMaxHp(entity: any, partyMembers?: any[]): number {
    if (!entity) return 100;
    if (partyMembers && partyMembers.length > 0) {
      const cached = partyMembers.find(m => (m.id && m.id === entity.id) || (m.name && m.name === entity.name));
      if (cached?.finalStats?.maxHp) {
        return Math.max(1, cached.finalStats.maxHp);
      }
    }
    if (entity.finalStats?.maxHp) {
      return Math.max(1, entity.finalStats.maxHp);
    }
    try {
      const final = calculateFinalStats(entity).finalStats;
      if (final?.maxHp) {
        return Math.max(1, final.maxHp);
      }
    } catch (e) {
      // Fallback
    }
    return Math.max(1, entity.stats?.maxHp || entity.maxHp || 100);
  }

  /**
   * 엔티티의 실제 최대 마나(Max MP)를 계산합니다.
   */
  public static getEntityMaxMp(entity: any, partyMembers?: any[]): number {
    if (!entity) return 100;
    if (partyMembers && partyMembers.length > 0) {
      const cached = partyMembers.find(m => (m.id && m.id === entity.id) || (m.name && m.name === entity.name));
      if (cached?.finalStats?.maxMp) {
        return Math.max(1, cached.finalStats.maxMp);
      }
    }
    if (entity.finalStats?.maxMp) {
      return Math.max(1, entity.finalStats.maxMp);
    }
    try {
      const final = calculateFinalStats(entity).finalStats;
      if (final?.maxMp) {
        return Math.max(1, final.maxMp);
      }
    } catch (e) {
      // Fallback
    }
    return Math.max(1, entity.stats?.maxMp || entity.maxMp || 100);
  }

  /**
   * 엔티티의 현재 체력 비율 (0.0 ~ 1.0)을 반환합니다.
   */
  public static getEntityHpRatio(entity: any, partyMembers?: any[]): number {
    if (!entity || !entity.stats) return 1;
    const maxHp = this.getEntityMaxHp(entity, partyMembers);
    const currentHp = Math.max(0, entity.stats.hp ?? 0);
    return Math.min(1, Math.max(0, currentHp / maxHp));
  }

  /**
   * 엔티티의 현재 마나 비율 (0.0 ~ 1.0)을 반환합니다.
   */
  public static getEntityMpRatio(entity: any, partyMembers?: any[]): number {
    if (!entity || !entity.stats) return 1;
    const maxMp = this.getEntityMaxMp(entity, partyMembers);
    const currentMp = Math.max(0, entity.stats.mp ?? 0);
    return Math.min(1, Math.max(0, currentMp / maxMp));
  }

  /**
   * 지원/버프/회복 스킬인지 판별합니다 (초고속 캐싱).
   */
  public static isSupportSkill(skill: Skill | null | undefined): boolean {
    if (!skill) return false;
    if (supportSkillCache.has(skill)) {
      return supportSkillCache.get(skill)!;
    }

    let result = false;
    const rawType = String(skill.type || '');
    const upperType = rawType.toUpperCase();
    const isOffensiveAttack =
      skill.type === SkillType.PHYSICAL ||
      skill.type === SkillType.MAGIC ||
      upperType.includes('PHYSICAL') ||
      upperType.includes('MAGIC') ||
      rawType.includes('물리') ||
      rawType.includes('마법');

    if (isOffensiveAttack) {
      result = false;
    } else if (skill.type === SkillType.BUFF || skill.type === SkillType.HEAL) {
      result = true;
    } else if (CombatUtils.isResurrectionSkill(skill)) {
      result = true;
    } else {
      const desc = skill.description || '';
      const formula = skill.effectFormula || '';
      if (desc.includes('회복') || desc.includes('치유') || desc.includes('부활') || desc.includes('보호막')) {
        result = true;
      } else if (formula.includes('HP') || formula.includes('MP') || formula.includes('HEAL') || formula.includes('RECOV') || formula.includes('BUFF:') || formula.includes('MANA_SHIELD') || formula.includes('상태이상 해제')) {
        result = true;
      }
    }

    supportSkillCache.set(skill, result);
    return result;
  }

  /**
   * 체력 회복(힐) 스킬인지 판별합니다 (초고속 캐싱).
   */
  public static isHpHealSkill(skill: Skill | null | undefined): boolean {
    if (!skill) return false;
    if (hpHealSkillCache.has(skill)) {
      return hpHealSkillCache.get(skill)!;
    }

    let result = false;
    if (skill.type === SkillType.HEAL) {
      result = true;
    } else {
      const desc = skill.description || '';
      const formula = skill.effectFormula || '';
      if (formula.includes('HP') && (formula.includes('회복') || formula.includes('RECOV') || formula.includes('HEAL'))) {
        result = true;
      } else if (desc.includes('HP 회복') || desc.includes('체력 회복') || desc.includes('치유')) {
        result = true;
      }
    }

    hpHealSkillCache.set(skill, result);
    return result;
  }

  /**
   * 마나 회복 스킬인지 판별합니다 (초고속 캐싱).
   */
  public static isMpHealSkill(skill: Skill | null | undefined): boolean {
    if (!skill) return false;
    if (mpHealSkillCache.has(skill)) {
      return mpHealSkillCache.get(skill)!;
    }

    let result = false;
    const desc = skill.description || '';
    const formula = skill.effectFormula || '';
    if (formula.includes('MP') && (formula.includes('회복') || formula.includes('RECOV'))) {
      result = true;
    } else if (desc.includes('MP 회복') || desc.includes('마나 회복')) {
      result = true;
    }

    mpHealSkillCache.set(skill, result);
    return result;
  }

  /**
   * 광역(AOE) 대상인지 판별합니다.
   */
  public static isAoeTarget(targetName?: string, skill?: Skill | null): boolean {
    if (skill && skill.targetType === 'aoe') return true;
    if (!targetName) return false;
    const clean = targetName.trim().toLowerCase();
    return clean === 'aoe' ||
           clean === 'allies' ||
           clean === '전체' ||
           clean === '전체 대상' ||
           clean === '전체대상' ||
           clean === '아군 전체' ||
           clean === '아군전체' ||
           clean === '적 전체' ||
           clean === '적전체';
  }

  /**
   * 파티원 전체의 체력 및 마나 상태를 정확하게 분석합니다.
   */
  public static evaluatePartyNeeds(player: Character, companions: Companion[] = [], partyMembers?: any[]) {
    const allMembers: (Character | Companion)[] = [player, ...companions];
    
    // 생존 아군 목록
    const livingAllies = allMembers.filter(a => a.stats && a.stats.hp > 0 && !a.isDead);
    // 전투불능(사망) 아군 목록
    const deadAllies = allMembers.filter(a => a.stats && (a.stats.hp <= 0 || a.isDead));

    // 각 아군의 체력 비율 계산 및 정렬
    const alliesWithRatios = livingAllies.map(a => ({
      entity: a,
      name: a.name,
      hpRatio: this.getEntityHpRatio(a, partyMembers),
      mpRatio: this.getEntityMpRatio(a, partyMembers),
      hp: a.stats.hp,
      maxHp: this.getEntityMaxHp(a, partyMembers),
      mp: a.stats.mp,
      maxMp: this.getEntityMaxMp(a, partyMembers)
    }));

    // 최저 체력 순 정렬
    const sortedByHp = [...alliesWithRatios].sort((a, b) => a.hpRatio - b.hpRatio);
    // 최저 마나 순 정렬
    const sortedByMp = [...alliesWithRatios].sort((a, b) => a.mpRatio - b.mpRatio);

    const lowestHpMember = sortedByHp[0] || null;
    const lowestMpMember = sortedByMp[0] || null;

    return {
      livingAllies,
      deadAllies,
      lowestHpAlly: lowestHpMember?.entity || null,
      lowestHpRatio: lowestHpMember ? lowestHpMember.hpRatio : 1.0,
      lowestMpAlly: lowestMpMember?.entity || null,
      lowestMpRatio: lowestMpMember ? lowestMpMember.mpRatio : 1.0,
      alliesWithRatios
    };
  }

  /**
   * 대상(targetEntity)에게 해당 버프/디버프 스킬의 효과가 이미 활성화되어 남아있는지 판별합니다.
   * 유효한 지속 효과가 존재할 경우 중복 재시전 낭비를 방지하기 위해 true를 반환합니다.
   */
  public static isDuplicateBuffOrDebuffActive(skill: Skill | null | undefined, targetEntity: any): boolean {
    if (!skill || !targetEntity) return false;
    const effects = targetEntity.statusEffects || [];

    // 1. 버프 스킬 중복 시전 판별
    if (skill.type === SkillType.BUFF) {
      if (Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0) {
        return skill.buffEffects.some(ef => {
          if (ef.type === 'STAT_BOOST' && ef.targetStat) {
            return effects.some((e: any) => (e.duration === undefined || e.duration >= 1) && (e.name === ef.targetStat || e.effect?.includes(ef.targetStat)));
          }
          if (ef.type === 'ELEMENTAL_DMG_BOOST' || ef.type === 'ELEMENTAL_RES_BOOST') {
            const targetElem = ef.targetElement || '속성';
            return effects.some((e: any) => (e.duration === undefined || e.duration >= 1) && (e.name?.includes(targetElem) || e.effect?.includes(targetElem)));
          }
          if (ef.type === 'MANA_SHIELD') {
            return effects.some((e: any) => (e.duration === undefined || e.duration >= 1) && e.name?.includes('마나 쉴드') && (e.val || 0) > 0);
          }
          return false;
        });
      }
    }

    // 2. 디버프 스킬 중복 시전 판별
    if (skill.type === SkillType.DEBUFF) {
      const formula = skill.effectFormula || (skill as any).formulaOverride || '';
      if ((skill as any).debuffStat || formula.includes('디버프') || formula.includes('Debuff')) {
        const statKey = (skill as any).debuffStat || '';
        if (statKey) {
          return effects.some((e: any) => (e.duration === undefined || e.duration >= 1) && (e.name?.includes(statKey) || e.effect?.includes(statKey)));
        }
      }
      if (Array.isArray(skill.debuffEffects) && skill.debuffEffects.length > 0) {
        return skill.debuffEffects.some(ef => {
          const stat = ef.stat || ef.ailment || '';
          return effects.some((e: any) => (e.duration === undefined || e.duration >= 1) && (e.name?.includes(stat) || e.effect?.includes(stat)));
        });
      }
    }

    return false;
  }

  /**
   * 부활 스킬로 되살아난 유닛(또는 사망 파티원이 있는 상태)의 전술 행동 우선순위 판단
   * 1순위: 사망한 아군이 존재하는 경우 부활 스킬 즉시 최우선 사용
   * 2순위: 되살아난 유닛의 체력/마나가 낮을 때 자생/방어/보호막/힐 스킬 우선 사용
   * 3순위: 중복 시전 없는 고효율 공격/스킬 사용
   */
  public static selectOptimalSkillForAI(
    skills: Skill[],
    caster: any,
    targetEntity: any,
    partyNeeds?: any
  ): Skill | null {
    if (!skills || skills.length === 0) return null;

    // 0순위: 사망한 아군이 있고 부활 스킬을 보유한 경우, 전술 성향과 관계없이 최우선 부활 시전
    if (partyNeeds && partyNeeds.deadAllies && partyNeeds.deadAllies.length > 0) {
      const resSkill = skills.find(s => CombatUtils.isResurrectionSkill(s) || (s as any).buffEffects?.some((ef: any) => ef.type === 'RESURRECTION'));
      if (resSkill) return resSkill;
    }

    // 1순위: 시전자 본인이 부활 직후 상태이거나 체력이 60% 미만인 경우 방어/생존/회복 스킬 최우선 선별
    const casterHpRatio = this.getEntityHpRatio(caster);
    if (casterHpRatio < 0.6) {
      const survivalSkill = skills.find(s => 
        this.isHpHealSkill(s) || 
        s.effectFormula?.includes('MANA_SHIELD') || 
        (s as any).buffEffects?.some((ef: any) => ef.type === 'MANA_SHIELD' || ef.type === 'HP_RECOV')
      );
      if (survivalSkill && !this.isDuplicateBuffOrDebuffActive(survivalSkill, caster)) {
        return survivalSkill;
      }
    }

    // 2순위: 중복 시전이 아닌 유효한 스킬들 필터링
    const nonDuplicateSkills = skills.filter(skill => !this.isDuplicateBuffOrDebuffActive(skill, targetEntity));

    if (nonDuplicateSkills.length > 0) {
      // 중복이 없는 스킬 중 최고 계수 스킬 선별
      return nonDuplicateSkills.sort((a, b) => (b.powerRatio || 0) - (a.powerRatio || 0))[0];
    }

    // 모든 버프/디버프 스킬이 이미 걸려있는 경우, 공격/힐/기타 스킬을 최우선 선택
    const nonBuffSkills = skills.filter(s => s.type !== SkillType.BUFF && s.type !== SkillType.DEBUFF);
    if (nonBuffSkills.length > 0) {
      return nonBuffSkills.sort((a, b) => (b.powerRatio || 0) - (a.powerRatio || 0))[0];
    }

    // 예외 Fallback: 스킬 중 첫 번째 선택
    return skills[0];
  }
}

