import { ActiveStatus } from '../types';

/**
 * 전투 중 마나 쉴드 및 방어 보호막 피해 흡수 및 파괴 시스템 서비스
 */
export class CombatShieldService {
  /**
   * 엔티티가 보유한 마나 쉴드 및 방어 보호막 상태 효과의 피해 흡수 처리 및 시스템 알림 생성
   * @param targetEntity 대상 캐릭터, 동료, 또는 적
   * @param incomingDamage 가해진 가공전 피해량
   * @returns remainingDamage(보호막 차감 후 남은 피해) 및 totalLog(흡수/파괴 알림 로그)
   */
  public static processShieldAbsorption(
    targetEntity: any,
    incomingDamage: number
  ): { remainingDamage: number; totalLog: string } {
    if (!targetEntity || !targetEntity.statusEffects || incomingDamage <= 0) {
      return { remainingDamage: Math.max(0, incomingDamage), totalLog: '' };
    }

    let remainingDamage = incomingDamage;
    let totalLog = '';

    // 보호막/쉴드 계열 상태 효과 필터링 (마나 쉴드, 방어 보호막, 신성 보호막, 패시브 보호막 등)
    const shieldEffects = (targetEntity.statusEffects as ActiveStatus[]).filter(
      (e: any) =>
        e &&
        (e.name?.includes('마나 쉴드') ||
          e.name?.includes('보호막') ||
          e.name?.includes('쉴드') ||
          e.name?.includes('Shield') ||
          e.name?.includes('Barrier') ||
          (e.effect && (e.effect.includes('보호막') || e.effect.includes('피해를 흡수'))))
    );

    for (const shieldEffect of shieldEffects) {
      if (remainingDamage <= 0) break;
      if (shieldEffect && (shieldEffect.val || 0) > 0) {
        const currentVal = shieldEffect.val || 0;
        const absorb = Math.min(currentVal, remainingDamage);
        
        shieldEffect.val = currentVal - absorb;
        remainingDamage -= absorb;

        // 상태 효과 설명 업데이트
        if (shieldEffect.val > 0) {
          shieldEffect.effect = `피해를 흡수하는 마법 보호막 (${shieldEffect.val})`;
          totalLog += `\n[시스템] 🛡️ ${targetEntity.name}의 ${shieldEffect.name}가 ${absorb}의 피해를 흡수했습니다! (남은 보호막: ${shieldEffect.val})`;
        } else {
          // 보호막 완파
          targetEntity.statusEffects = (targetEntity.statusEffects as ActiveStatus[]).filter(
            (e: any) => e !== shieldEffect
          );
          totalLog += `\n[시스템] 🛡️ ${targetEntity.name}의 ${shieldEffect.name}가 ${absorb}의 피해를 흡수했습니다!`;
          totalLog += `\n[시스템] 💥 ${targetEntity.name}의 ${shieldEffect.name}가 피해 흡수 한계를 초과하여 완전히 파괴되었습니다!`;
        }
      }
    }

    return {
      remainingDamage: Math.max(0, remainingDamage),
      totalLog
    };
  }

  /**
   * 치명타/결정타 시 적 엔티티의 불멸 환생 및 부활 기믹 처리
   */
  public static processRevivalIfLethal(
    targetEntity: any,
    currentHp: number
  ): { revivedHp: number; log: string } {
    if (!targetEntity || currentHp > 0 || !targetEntity.statusEffects) {
      return { revivedHp: currentHp, log: '' };
    }

    const revivalIdx = targetEntity.statusEffects.findIndex((e: any) =>
      e && (e.name?.includes('환생') || e.name?.includes('부활') || e.effect?.includes('환생') || e.effect?.includes('부활'))
    );

    if (revivalIdx >= 0 && !(targetEntity as any)._hasRevivedInCombat) {
      const revivalStatus = targetEntity.statusEffects[revivalIdx];
      const maxHp = targetEntity.maxHp || (targetEntity.stats?.maxHp) || 10000;
      const ratio = (revivalStatus.val || 50) / 100;
      const revivedHp = Math.max(100, Math.floor(maxHp * ratio));

      (targetEntity as any)._hasRevivedInCombat = true;
      targetEntity.statusEffects.splice(revivalIdx, 1);
      targetEntity.hp = revivedHp;
      if (targetEntity.stats) targetEntity.stats.hp = revivedHp;

      const log = `\n[시스템] ✨ ${targetEntity.name}의 ${revivalStatus.name} 발동! 죽음의 순간 눈부신 광휘의 성광이 내려앉으며 체력 ${revivedHp}(${Math.round(ratio * 100)}%)로 즉시 환생했습니다!`;
      return { revivedHp, log };
    }

    return { revivedHp: currentHp, log: '' };
  }
}
