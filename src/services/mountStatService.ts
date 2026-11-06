import { Character, Companion, Stats } from '../types';

/**
 * 탈것 몬스터의 최종 능력치(final stat)를 기준으로 능력치 10% 보너스 계산 서비스
 * - 사용자의 요구사항: 탈것몬스터 능력치 10% 반영은 탈것의 final stat의 기준을 반영
 * - 기본 10% 반영, 동일 신력 계통 매칭 시 +5% 추가 공명 보너스(15%) 적용
 */

export interface MountBonusResult {
  mountBonus: Partial<Stats>;
  mountName?: string;
  isShinryokuMatched: boolean;
  rate: number;
}

/**
 * 탈것의 최종 능력치(final stat)를 안전하게 계산하여 라이더(캐릭터 또는 동료)에게 부여할 보너스 산출
 */
export const calculateMountFinalStatBonus = (
  rider: Character | Companion,
  mountEntity: any,
  calculateFinalStatsFn: (entity: any, excludeBuffs?: boolean) => { finalStats: Stats }
): MountBonusResult => {
  const result: MountBonusResult = {
    mountBonus: {},
    isShinryokuMatched: false,
    rate: 0.10
  };

  if (!mountEntity || !mountEntity.stats) {
    return result;
  }

  try {
    // 무한 재귀 호출 방지를 위해 탈것 엔티티의 탈것 정보 제거 후 안전 복사
    const safeMount = {
      ...mountEntity,
      mountedMonster: undefined,
      mountedMonsterId: undefined
    };

    // 탈것 몬스터의 최종 능력치(final stat) 산출
    const mountFinalStatsResult = calculateFinalStatsFn(safeMount, true);
    const mountFinal = mountFinalStatsResult?.finalStats || mountEntity.stats;

    // 신력 계통 공명 판별
    const riderShinryoku = (rider as any).shinryokuType || "무속성";
    const mountShinryoku = mountEntity.shinryokuType || mountEntity.monsterData?.shinryokuType || "무속성";

    const isMatched = 
      riderShinryoku !== "무속성" && 
      riderShinryoku !== "미개방" && 
      riderShinryoku === mountShinryoku;

    // 기본 10% (신력 일치 공명 시 15%)
    const factor = isMatched ? 0.15 : 0.10;

    result.isShinryokuMatched = isMatched;
    result.rate = factor;
    result.mountName = mountEntity.name;

    // 모든 핵심 능력치(생명력, 마나, 힘, 지능, 지혜, 방어력, 민첩, 제어력)에 최종 능력치 10% 반영
    const statKeys: (keyof Stats)[] = ['maxHp', 'maxMp', 'str', 'int', 'wis', 'def', 'agi', 'ctrl'];

    statKeys.forEach(key => {
      const statVal = mountFinal[key] ?? mountEntity.stats?.[key] ?? 0;
      if (typeof statVal === 'number' && statVal > 0) {
        result.mountBonus[key] = Math.floor(statVal * factor);
      }
    });

    // hp와 mp에도 동일한 생명력/마나 보너스 적용
    if (result.mountBonus.maxHp) {
      result.mountBonus.hp = result.mountBonus.maxHp;
    }
    if (result.mountBonus.maxMp) {
      result.mountBonus.mp = result.mountBonus.maxMp;
    }

  } catch (error) {
    console.warn("[탈것 능력치 계산 오류] 기본 스탯으로 대체합니다:", error);
    const factor = 0.10;
    const statKeys: (keyof Stats)[] = ['maxHp', 'maxMp', 'str', 'int', 'wis', 'def', 'agi', 'ctrl'];
    statKeys.forEach(key => {
      const val = mountEntity.stats?.[key] ?? 0;
      result.mountBonus[key] = Math.floor(val * factor);
    });
  }

  return result;
};
