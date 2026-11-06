import { Companion, Enemy, Character, BattleRole, SecondaryBattleRole, Stats } from '../types';
import { calculateFinalStats, getEntityAllCombatSkills } from '../utils';
import { scaleNpcEnemyStats } from './npcCombatScaling';

/**
 * 기지 모의 대련장 실전 1:1 턴제 대결 전용 서비스
 */

/**
 * 대련 동료를 실전 1:1 대결용 Enemy 객체로 변환
 */
export const createSparringEnemy = (partner: Companion, role?: BattleRole): Enemy => {
  // 1. NPC 전투 스케일링 기본 함수로 기반 생성
  const baseEnemy = scaleNpcEnemyStats(partner as any, false, '[모의 대련]');

  // 2. 동료의 실제 최종 능력치(finalStats)를 직접 정밀 반영
  const finalCalc = calculateFinalStats(partner);
  const fStats = finalCalc.finalStats;

  const enemyHp = Math.max(100, fStats.maxHp || fStats.hp || 100);
  const enemyMp = Math.max(50, fStats.maxMp || fStats.mp || 50);

  // 3. 동료가 보유한 모든 실제 전투 스킬 추출 및 보존
  const realSkills = getEntityAllCombatSkills(partner);
  const combinedSkills = realSkills.length > 0 ? realSkills : (baseEnemy.skills || []);

  const sparringEnemy: Enemy = {
    ...baseEnemy,
    id: `sparring_${partner.id}`,
    name: `[모의 대련] ${partner.name}`,
    level: partner.level || 1,
    hp: enemyHp,
    maxHp: enemyHp,
    stats: {
      hp: enemyHp,
      maxHp: enemyHp,
      mp: enemyMp,
      maxMp: enemyMp,
      str: fStats.str || 10,
      int: fStats.int || 10,
      agi: fStats.agi || 10,
      wis: fStats.wis || 10,
      def: fStats.def || 10,
      ctrl: fStats.ctrl || 10
    },
    skills: combinedSkills,
    visualUrl: partner.visualUrl || partner.appearance || baseEnemy.visualUrl,
    job: partner.job || '수련생',
    combatStyle: (partner.combatStyle || '균형 전투') as any,
    shinryokuType: partner.shinryokuType || '무속성',
    isNpc: true,
    isBoss: false
  };

  (sparringEnemy as any).isSparringPartner = true;
  (sparringEnemy as any).originalCompanionId = partner.id;

  return sparringEnemy;
};

/**
 * 실전 1:1 모의 대련 시작 전 자원 소모 및 횟수 차감 처리
 */
export const prepareSparringMatch = (
  character: Character,
  partner: Companion,
  playerRole: BattleRole | SecondaryBattleRole,
  partnerRole: BattleRole | SecondaryBattleRole
): { updatedCharacter: Character; enemy: Enemy } => {
  const newChar: Character = JSON.parse(JSON.stringify(character));

  // 기지 식량 3개 차감
  if (newChar.base?.resources) {
    newChar.base.resources.food = Math.max(0, (newChar.base.resources.food || 0) - 3);
  }

  // 일일 대련 횟수 1 증가
  if (!newChar.base) (newChar as any).base = {};
  if (!newChar.base.dailyCounts) newChar.base.dailyCounts = {};
  newChar.base.dailyCounts['sparring_arena'] = (newChar.base.dailyCounts['sparring_arena'] || 0) + 1;

  // 대련 상대 적 객체 생성
  const enemy = createSparringEnemy(partner, partnerRole as any);
  (enemy as any).playerRole = playerRole;
  (enemy as any).partnerRole = partnerRole;

  return { updatedCharacter: newChar, enemy };
};

/**
 * 수동 1:1 모의 대련 완료 후 캐릭터 및 동료의 역할 숙련도 및 호감도/친밀도 보상 반영
 */
export const applySparringManualCombatResult = (
  character: Character,
  enemy: Enemy,
  isPlayerWin: boolean
): {
  updatedCharacter: Character;
  resultLog: string;
  resultModalData: {
    type: 'success' | 'failure';
    title: string;
    message: string;
    items: { label: string; after: string }[];
  };
} => {
  const newChar: Character = JSON.parse(JSON.stringify(character));
  const partnerId = (enemy as any)?.originalCompanionId || enemy.id?.replace('sparring_', '');
  const playerRole = (enemy as any)?.playerRole || BattleRole.DEALER;
  const partnerRole = (enemy as any)?.partnerRole || BattleRole.DEALER;

  // 기본 숙련도 획득량 (승리 시 +5, 패배 시 +3)
  const basePlayerGain = isPlayerWin ? 5 : 3;
  const basePartnerGain = isPlayerWin ? 4 : 3;
  const affectionGain = isPlayerWin ? 4 : 2;

  // 2차 전투역할일 경우 1/3 수준으로 획득량 축소 (더 까다로운 조건)
  const isPlayerSecondary = Object.values(SecondaryBattleRole).includes(playerRole as any);
  const actualPlayerGain = isPlayerSecondary ? Math.max(1, Math.floor(basePlayerGain / 3)) : basePlayerGain;

  const isPartnerSecondary = Object.values(SecondaryBattleRole).includes(partnerRole as any);
  const actualPartnerGain = isPartnerSecondary ? Math.max(1, Math.floor(basePartnerGain / 3)) : basePartnerGain;

  // 플레이어 역할 숙련도 가산
  if (isPlayerSecondary) {
    if (!newChar.secondaryRoleProficiency) newChar.secondaryRoleProficiency = {};
    const cur = newChar.secondaryRoleProficiency[playerRole as SecondaryBattleRole] || 0;
    newChar.secondaryRoleProficiency[playerRole as SecondaryBattleRole] = Math.min(100, cur + actualPlayerGain);
  } else {
    if (!newChar.roleProficiency) newChar.roleProficiency = {};
    const cur = newChar.roleProficiency[playerRole as BattleRole] || 0;
    newChar.roleProficiency[playerRole as BattleRole] = Math.min(100, cur + actualPlayerGain);
    if (!newChar.roleInactivityDays) newChar.roleInactivityDays = {};
    newChar.roleInactivityDays[playerRole as BattleRole] = 0;
  }

  // 동료 찾기 및 역할 숙련도/친밀도 가산
  let partnerName = '동료';
  const applyPartnerGain = (c: Companion) => {
    partnerName = c.name;
    if (isPartnerSecondary) {
      if (!c.secondaryRoleProficiency) c.secondaryRoleProficiency = {};
      const cur = c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] || 0;
      c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] = Math.min(100, cur + actualPartnerGain);
    } else {
      if (!c.roleProficiency) c.roleProficiency = {};
      const cur = c.roleProficiency[partnerRole as BattleRole] || 0;
      c.roleProficiency[partnerRole as BattleRole] = Math.min(100, cur + actualPartnerGain);
      if (!c.roleInactivityDays) c.roleInactivityDays = {};
      c.roleInactivityDays[partnerRole as BattleRole] = 0;
    }
    // 친밀도/호감도 가산
    c.affection = Math.min(100, (c.affection || 0) + affectionGain);
  };

  let compIdx = newChar.companions.findIndex(c => c.id === partnerId);
  if (compIdx !== -1) {
    applyPartnerGain(newChar.companions[compIdx]);
  } else if (newChar.inactiveCompanions) {
    let inCompIdx = newChar.inactiveCompanions.findIndex(c => c.id === partnerId);
    if (inCompIdx !== -1) {
      applyPartnerGain(newChar.inactiveCompanions[inCompIdx]);
    }
  }

  const resultModalData = {
    type: isPlayerWin ? ('success' as const) : ('failure' as const),
    title: isPlayerWin ? '⚔️ 전술 모의 대련 승리!' : '⚔️ 전술 모의 대련 수련 완료',
    message: `동료 ${partnerName}과의 실전 1대 1 대련을 통해 전술 숙련도를 쌓고 상호 유대감을 넓혔습니다.`,
    items: [
      { label: `플레이어 수련 [${playerRole}]`, after: `숙련도 +${actualPlayerGain} ${isPlayerSecondary ? '(2차 수련 1/3 보정)' : ''}` },
      { label: `${partnerName} 수련 [${partnerRole}]`, after: `숙련도 +${actualPartnerGain} ${isPartnerSecondary ? '(2차 수련 1/3 보정)' : ''}` },
      { label: `${partnerName} 유대감`, after: `친밀도 +${affectionGain}` }
    ]
  };

  const logMsg = `[수동 모의 대련 완료] ${partnerName}과의 실전 대련 완료! 플레이어 [${playerRole}] 숙련도 +${actualPlayerGain}, ${partnerName} [${partnerRole}] 숙련도 +${actualPartnerGain}, 친밀도 +${affectionGain}`;
  return { updatedCharacter: newChar, resultLog: logMsg, resultModalData };
};
