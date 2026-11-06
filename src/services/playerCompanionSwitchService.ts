import { Character, Companion, CompanionRelation, JobType, RelationType } from '../types';
import { generateDefaultVisualUrl } from '../utils';

/**
 * 커스텀 동료가 플레이어 스위칭이 가능한 대상인지 검증합니다.
 * (몬스터는 불가, isCustom 이고 몬스터가 아니어야 함)
 */
export function isCompanionEligibleForSwitch(companion: Companion): boolean {
  if (!companion) return false;
  if (companion.isMonster || companion.isCustomMonster || companion.race === '몬스터') {
    return false;
  }
  return companion.isCustom === true;
}

/**
 * 스위칭 및 가주 승계 시 동료들의 인간관계(연인/배우자, 형제자매, relations 맵)를 새로운 플레이어 기준으로 완전 정합성 재매핑
 */
export function remapCompanionRelationships(
  companions: Companion[],
  inactiveCompanions: Companion[],
  successorId: string,
  oldPlayerName: string,
  successorName: string,
  formerPlayerCompanion?: Companion,
  successorCompanion?: Companion
): {
  updatedCompanions: Companion[];
  updatedInactiveCompanions: Companion[];
  updatedFormerPlayer?: Companion;
} {
  const formerPlayerId = formerPlayerCompanion ? formerPlayerCompanion.id : undefined;

  // 승계자(successor)가 전대 플레이어와 연인/배우자/형제 관계였는지 사전 측정
  const successorIsLover = Boolean(
    successorCompanion?.isLover &&
    (successorCompanion.partnerId === 'player' || successorCompanion.partnerName === oldPlayerName || (!successorCompanion.partnerId && !successorCompanion.partnerName))
  );
  const successorIsSpouse = Boolean(
    successorCompanion?.isSpouse &&
    (successorCompanion.partnerId === 'player' || successorCompanion.partnerName === oldPlayerName || (!successorCompanion.partnerId && !successorCompanion.partnerName))
  );
  const successorIsSibling = Boolean(
    successorCompanion?.relation === RelationType.SIBLING ||
    successorCompanion?.relations?.['player']?.type === RelationType.SIBLING
  );

  const remapOne = (c: Companion): Companion => {
    const updated: Companion = { ...c };
    const origRelations = c.relations ? { ...c.relations } : {};
    const newRelations: Record<string, CompanionRelation> = {};

    // 만약 'player'에 대한 관계가 origRelations에 존재하지 않지만 c가 주인공에 대해 가진 affection이 있다면 기본 관계로 시딩해줍니다.
    if (!origRelations['player'] && c.id !== successorId && (!formerPlayerId || c.id !== formerPlayerId)) {
      const isPlayerSpouse = Boolean(c.isSpouse && (c.partnerId === 'player' || !c.partnerId || c.partnerId === '' || c.partnerName === oldPlayerName));
      const isPlayerLover = Boolean(c.isLover && (c.partnerId === 'player' || !c.partnerId || c.partnerId === '' || c.partnerName === oldPlayerName));
      origRelations['player'] = {
        targetId: 'player',
        type: isPlayerSpouse ? RelationType.SPOUSE : isPlayerLover ? RelationType.LOVER : c.relation || RelationType.ALLY,
        affection: c.affection || 100,
        metYear: c.metYear
      };
    }

    // 1. relations 맵 키 이전 (successorId -> 'player', 'player' -> formerPlayerId 또는 삭제)
    for (const [targetKey, rel] of Object.entries(origRelations)) {
      if (targetKey === successorId) {
        newRelations['player'] = {
          ...rel,
          targetId: 'player'
        };
      } else if (targetKey === 'player') {
        if (formerPlayerId) {
          newRelations[formerPlayerId] = {
            ...rel,
            targetId: formerPlayerId
          };
        }
      } else {
        newRelations[targetKey] = { ...rel };
      }
    }
    updated.relations = newRelations;

    // 2. 연인 및 배우자 관계 재매핑 (partnerId, partnerName, isLover, isSpouse)
    const isLoverOfOldPlayer = Boolean(
      (c.isLover || c.isSpouse) && (
        c.partnerId === 'player' ||
        c.partnerName === oldPlayerName ||
        !c.partnerId ||
        c.partnerId === ''
      )
    );

    if (c.partnerId === successorId || (c.partnerName === successorName && c.partnerId !== 'player')) {
      // 승계자가 원래 연인/배우자였음 -> 이제 승계자가 'player'임
      updated.partnerId = 'player';
      updated.partnerName = successorName;
      updated.isLover = c.isLover || false;
      updated.isSpouse = c.isSpouse || false;
    } else if (isLoverOfOldPlayer) {
      // 전대 플레이어가 연인/배우자였음
      if (formerPlayerId) {
        updated.partnerId = formerPlayerId;
        updated.partnerName = oldPlayerName;
        updated.isLover = c.isLover || false;
        updated.isSpouse = c.isSpouse || false;
      } else {
        updated.partnerId = undefined;
        updated.partnerName = oldPlayerName;
        updated.isLover = false;
        updated.isSpouse = false;
      }
    }

    // 3. 형제자매 관계 (relation, SIBLING)
    const wasSiblingWithSuccessor =
      origRelations[successorId]?.type === RelationType.SIBLING ||
      origRelations[successorId]?.type === ('형제' as any) ||
      origRelations[successorId]?.type === ('자매' as any) ||
      origRelations[successorId]?.type === ('남매' as any) ||
      origRelations[successorId]?.type === ('의형제' as any) ||
      origRelations[successorId]?.type === ('의자매' as any);

    const wasSiblingWithOldPlayer =
      c.relation === RelationType.SIBLING ||
      origRelations['player']?.type === RelationType.SIBLING ||
      origRelations['player']?.type === ('형제' as any) ||
      origRelations['player']?.type === ('자매' as any) ||
      origRelations['player']?.type === ('남매' as any) ||
      origRelations['player']?.type === ('의형제' as any) ||
      origRelations['player']?.type === ('의자매' as any);

    if (wasSiblingWithSuccessor) {
      updated.relation = RelationType.SIBLING;
      if (!updated.relations['player']) {
        updated.relations['player'] = {
          targetId: 'player',
          type: RelationType.SIBLING,
          affection: origRelations[successorId]?.affection || 80
        };
      }
    } else if (wasSiblingWithOldPlayer) {
      if (formerPlayerId) {
        if (!updated.relations[formerPlayerId]) {
          updated.relations[formerPlayerId] = {
            targetId: formerPlayerId,
            type: RelationType.SIBLING,
            affection: origRelations['player']?.affection || 80
          };
        }
      }
      if (updated.relation === RelationType.SIBLING) {
        updated.relation = undefined;
      }
    }

    return updated;
  };

  // 활성 및 비활성 동료 처리 (승계자 및 전대 플레이어 제외)
  const updatedCompanions = companions
    .filter(c => c.id !== successorId && (!formerPlayerId || c.id !== formerPlayerId))
    .map(c => remapOne(c));

  const updatedInactiveCompanions = inactiveCompanions
    .filter(c => c.id !== successorId && (!formerPlayerId || c.id !== formerPlayerId))
    .map(c => remapOne(c));

  // 전대 플레이어(동료로 변환된 경우) 처리
  let updatedFormerPlayer: Companion | undefined = undefined;
  if (formerPlayerCompanion) {
    const remappedFP = remapOne(formerPlayerCompanion);
    remappedFP.metYear = successorCompanion?.metYear || remappedFP.metYear;

    // Case 1: 승계자(successorCompanion)가 전대 플레이어와 연인/배우자 관계였던 경우
    if (successorIsLover || successorIsSpouse) {
      remappedFP.isLover = successorIsLover;
      remappedFP.isSpouse = successorIsSpouse;
      remappedFP.partnerId = 'player';
      remappedFP.partnerName = successorName;
      remappedFP.loverStartDate = successorCompanion?.loverStartDate;
      remappedFP.relations = remappedFP.relations || {};
      remappedFP.relations['player'] = {
        targetId: 'player',
        type: successorIsSpouse ? RelationType.SPOUSE : RelationType.LOVER,
        affection: successorCompanion?.relations?.['player']?.affection || 100
      };
    } else {
      // Case 2: 다른 동료 중 전대 플레이어의 연인/배우자가 있었는지 검색
      const otherPartnerComp = [...companions, ...inactiveCompanions].find(c => {
        if (c.id === successorId) return false;
        return (c.isLover || c.isSpouse) && (
          c.partnerId === 'player' ||
          c.partnerName === oldPlayerName ||
          !c.partnerId ||
          c.partnerId === ''
        );
      });
      if (otherPartnerComp) {
        remappedFP.isLover = otherPartnerComp.isLover || false;
        remappedFP.isSpouse = otherPartnerComp.isSpouse || false;
        remappedFP.partnerId = otherPartnerComp.id;
        remappedFP.partnerName = otherPartnerComp.name;
        remappedFP.loverStartDate = otherPartnerComp.loverStartDate;
        remappedFP.relations = remappedFP.relations || {};
        remappedFP.relations[otherPartnerComp.id] = {
          targetId: otherPartnerComp.id,
          type: otherPartnerComp.isSpouse ? RelationType.SPOUSE : RelationType.LOVER,
          affection: otherPartnerComp.relations?.['player']?.affection || 100
        };
      }
    }

    // 승계자(successorCompanion)가 전대 플레이어와 형제자매 관계였던 경우
    if (successorIsSibling) {
      remappedFP.relation = RelationType.SIBLING;
      remappedFP.relations = remappedFP.relations || {};
      remappedFP.relations['player'] = {
        targetId: 'player',
        type: RelationType.SIBLING,
        affection: successorCompanion?.relations?.['player']?.affection || 80
      };
    }

    // 만약 'player'에 대한 관계가 아직 정의되지 않았다면 기본 동료 관계로 추가해줍니다.
    remappedFP.relations = remappedFP.relations || {};
    if (!remappedFP.relations['player']) {
      remappedFP.relations['player'] = {
        targetId: 'player',
        type: RelationType.ALLY,
        affection: successorCompanion ? (successorCompanion.affection || 100) : 100
      };
    }

    updatedFormerPlayer = remappedFP;
  }

  return {
    updatedCompanions,
    updatedInactiveCompanions,
    updatedFormerPlayer
  };
}

/**
 * 플레이어와 커스텀 동료의 역할을 완벽하게 서로 스위칭(교체)합니다.
 * 모든 스탯, 외형, 비주얼 URL, 잠재력, 스킬, 장비, 인간관계, 칭호, 전문직업 등 모든 정보가 동료의 데이터로 치환되며,
 * 기존 플레이어는 동료 위치에 들어가 동료 데이터로 전환됩니다.
 */
export function switchPlayerAndCompanion(
  player: Character,
  companion: Companion
): { newPlayer: Character; newCompanion: Companion; logMsg: string } {
  // 0. 인간관계(소셜 네트워크) 개별 보존 - 주인공과 동료 각자가 보유했던 고유 과거 인연(socialNetwork)을 개별 보존
  const newPlayerSocialNetwork = companion.socialNetwork ? JSON.parse(JSON.stringify(companion.socialNetwork)) : [];
  const formerPlayerSocialNetwork = player.socialNetwork ? JSON.parse(JSON.stringify(player.socialNetwork)) : [];

  // 그전 플레이어와 다른 동료들과의 관계를 보존하기 위해, 다른 동료들이 주인공에 대해 가졌던 호감도/관계를 역으로 채워넣습니다.
  const formerPlayerRelations: Record<string, CompanionRelation> = {};
  const allOtherCompanions = [
    ...(player.companions || []),
    ...(player.inactiveCompanions || [])
  ].filter(c => c && c.id && c.id !== companion.id);

  for (const c of allOtherCompanions) {
    const relWithPlayer = c.relations?.['player'];
    const affection = relWithPlayer ? relWithPlayer.affection : (c.affection || 100);
    const isPlayerSpouse = Boolean(c.isSpouse && (c.partnerId === 'player' || !c.partnerId || c.partnerId === '' || c.partnerName === player.name));
    const isPlayerLover = Boolean(c.isLover && (c.partnerId === 'player' || !c.partnerId || c.partnerId === '' || c.partnerName === player.name));
    const relType = relWithPlayer ? relWithPlayer.type : (isPlayerSpouse ? RelationType.SPOUSE : isPlayerLover ? RelationType.LOVER : c.relation || RelationType.ALLY);

    formerPlayerRelations[c.id] = {
      targetId: c.id,
      type: relType,
      affection: affection
    };
  }

  const successorVisualUrl =
    companion.visualUrl ||
    companion.defaultVisualUrl ||
    generateDefaultVisualUrl(companion.name, companion.nation || player.nation, companion.race, companion.gender);

  // 1. 동료 -> 새로운 플레이어 데이터 구성
  const newPlayer: Character = {
    ...player, // 기본 기지, 골드, 인벤토리, 날짜 등 글로벌 상태 유지

    // 신상 및 외형 데이터
    name: companion.name,
    age: companion.age,
    birthYear: companion.birthYear,
    gender: companion.gender,
    race: companion.race,
    hairStyle: companion.hairStyle || '평범함',
    appearance: companion.appearance,
    visualUrl: successorVisualUrl,
    godVisualChoice: companion.godVisualChoice,
    originalVisualUrl: companion.originalVisualUrl,
    bgmUrl: companion.bgmUrl,
    shinryokuType: companion.shinryokuType || '미개방',
    nation: companion.nation || player.nation,
    personality: companion.personality || '평범함',
    motto: companion.motto,
    isImmortal: companion.isImmortal || false,

    // 직업 및 클래스
    job: companion.job || JobType.UNEMPLOYED,
    classType: companion.classType || companion.firstClassName || '전투계열',
    firstClassName: companion.firstClassName || companion.classType || '미정',
    firstClassDescription: companion.firstClassDescription || '',
    secondClassName: companion.secondClassName,
    secondClassDescription: companion.secondClassDescription,
    lastClassName: companion.lastClassName,
    lastClassDescription: companion.lastClassDescription,
    finalClassName: companion.finalClassName,
    finalClassDescription: companion.finalClassDescription,

    // 레벨 및 경험치
    level: companion.level,
    currentExp: companion.currentExp,
    maxExp: companion.maxExp,
    classTier: companion.classTier,

    // 잠재력 및 시련 해방 상태
    liberationPotential: companion.liberationPotential,
    potentialAppraised: companion.potentialAppraised,
    liberationEligibility: companion.liberationEligibility ? JSON.parse(JSON.stringify(companion.liberationEligibility)) : undefined,
    hasClearedFirstTrial: companion.hasClearedFirstTrial,
    hasClearedSecondTrial: companion.hasClearedSecondTrial,
    hasClearedLastTrial: companion.hasClearedLastTrial,
    hasClearedFinalTrial: companion.hasClearedFinalTrial,
    firstTrialCleared: companion.firstTrialCleared,
    secondTrialCleared: companion.secondTrialCleared,
    lastTrialCleared: companion.lastTrialCleared,
    finalTrialCleared: companion.finalTrialCleared,

    // 능률, 스킬, 장비, 숙련도
    stats: { ...companion.stats },
    statPoints: companion.statPoints || 0,
    skills: JSON.parse(JSON.stringify(companion.skills || [])).map((s: any) => ({
      ...s,
      mpCost: (s.type === '패시브' || s.type === 'PASSIVE') ? 0 : s.mpCost
    })),
    skillShortcuts: companion.skillShortcuts ? [...companion.skillShortcuts] : [],
    statusEffects: companion.statusEffects ? JSON.parse(JSON.stringify(companion.statusEffects)) : [],
    equipment: JSON.parse(JSON.stringify(companion.equipment || {})),
    weaponMastery: companion.weaponMastery ? JSON.parse(JSON.stringify(companion.weaponMastery)) : {},
    combatStyle: companion.combatStyle,
    targetCombatStyle: companion.targetCombatStyle,
    combatStyleProgress: companion.combatStyleProgress ? JSON.parse(JSON.stringify(companion.combatStyleProgress)) : {},
    unlockedCombatStyles: companion.unlockedCombatStyles ? [...companion.unlockedCombatStyles] : [],
    battleRole: companion.battleRole,
    roleProficiency: companion.roleProficiency ? JSON.parse(JSON.stringify(companion.roleProficiency)) : undefined,
    roleInactivityDays: companion.roleInactivityDays ? JSON.parse(JSON.stringify(companion.roleInactivityDays)) : undefined,

    // 전문 직업 및 칭호
    professions: companion.professions ? JSON.parse(JSON.stringify(companion.professions)) : undefined,
    availableTitles: companion.availableTitles ? [...companion.availableTitles] : [],
    equippedTitleId: companion.equippedTitleId,

    // 서브 직업/전기 기술 숙련도 및 등급
    blacksmithRank: companion.blacksmithRank,
    blacksmithMastery: companion.blacksmithMastery || 0,
    alchemistRank: companion.alchemistRank,
    alchemistMastery: companion.alchemistMastery || 0,
    trainerRank: companion.trainerRank,
    trainerBranch: companion.trainerBranch,
    trainerLevel: companion.trainerLevel || 1,
    trainerExp: companion.trainerExp || 0,
    trainerMaxExp: companion.trainerMaxExp || 100,
    housekeeperRank: companion.housekeeperRank,
    housekeeperExp: companion.housekeeperExp || 0,
    housekeeperLevel: companion.housekeeperLevel || 1,
    researcherTier: companion.researcherTier || 1,

    // 클럽 및 학교 데이터
    clubData: companion.clubData ? JSON.parse(JSON.stringify(companion.clubData)) : undefined,
    schoolData: companion.schoolData ? JSON.parse(JSON.stringify(companion.schoolData)) : undefined,

    // 용병 데이터 및 명성치
    mercenaryData: companion.mercenaryData ? JSON.parse(JSON.stringify(companion.mercenaryData)) : (
      (companion.mercenaryRank || companion.reputation !== undefined) ? {
        rank: companion.mercenaryRank || 'F',
        registeredDate: player.currentDate || '2000-01-01',
        completedQuests: 0,
        reputation: companion.reputation || 0,
        guildId: 'None',
        isGroupLeader: false,
        activeQuests: [],
        availableQuests: []
      } : undefined
    ),
    fame: companion.reputation !== undefined ? companion.reputation : player.fame,
    infamy: companion.infamy !== undefined ? companion.infamy : player.infamy,

    // 군대 데이터 및 계급
    militaryRank: companion.militaryRank,
    militaryData: companion.militaryData ? JSON.parse(JSON.stringify(companion.militaryData)) : (
      (companion.militaryRank || companion.merit !== undefined) ? {
        rank: companion.militaryRank || '이등병',
        enlistedDate: player.currentDate || '2000-01-01',
        merit: companion.merit || 0,
        completedMissions: 0,
        activeMissions: [],
        availableMissions: []
      } : undefined
    ),

    // 이종족 평판 및 마계 영지
    elfReputation: companion.elfReputation !== undefined ? companion.elfReputation : player.elfReputation,
    beastReputation: companion.beastReputation !== undefined ? companion.beastReputation : player.beastReputation,
    demonReputation: companion.demonReputation !== undefined ? companion.demonReputation : player.demonReputation,
    magyeDominions: companion.magyeDominions ? JSON.parse(JSON.stringify(companion.magyeDominions)) : player.magyeDominions,

    // 국왕 호감도 및 왕실 관련 데이터
    nationalFavorability: companion.nationalFavorability ? JSON.parse(JSON.stringify(companion.nationalFavorability)) : player.nationalFavorability,
    lastKingQuestRefreshYear: companion.lastKingQuestRefreshYear ? JSON.parse(JSON.stringify(companion.lastKingQuestRefreshYear)) : player.lastKingQuestRefreshYear,
    lastKingTreasuryYear: companion.lastKingTreasuryYear ? JSON.parse(JSON.stringify(companion.lastKingTreasuryYear)) : player.lastKingTreasuryYear,
    lastKingPersonnelYear: companion.lastKingPersonnelYear ? JSON.parse(JSON.stringify(companion.lastKingPersonnelYear)) : player.lastKingPersonnelYear,
    lastKingGoodwillDate: companion.lastKingGoodwillDate ? JSON.parse(JSON.stringify(companion.lastKingGoodwillDate)) : player.lastKingGoodwillDate,
    royalPersonnel: companion.royalPersonnel ? JSON.parse(JSON.stringify(companion.royalPersonnel)) : player.royalPersonnel,
    customNationLeaders: companion.customNationLeaders ? JSON.parse(JSON.stringify(companion.customNationLeaders)) : player.customNationLeaders,

    // 성전 외교 및 신성 관계
    templeDiplomacy: companion.templeDiplomacy ? JSON.parse(JSON.stringify(companion.templeDiplomacy)) : undefined,
    divineRelations: companion.divineRelations ? JSON.parse(JSON.stringify(companion.divineRelations)) : undefined,
    faith: companion.faith || 0,

    // 인간관계 (새 주인공 자신의 관계망 적용)
    socialNetwork: newPlayerSocialNetwork,

    // 기억
    memories: companion.memories ? [...companion.memories] : [],

    // 생체 및 탈것, 성장 제어 옵션 등 추가 누락 필드 일괄 복사 (동료 -> 새로운 플레이어)
    pregnancy: companion.pregnancy ? JSON.parse(JSON.stringify(companion.pregnancy)) : undefined,
    childData: companion.childData ? JSON.parse(JSON.stringify(companion.childData)) : undefined,
    mountedMonsterId: companion.mountedMonsterId,
    mountedMonster: companion.mountedMonster ? JSON.parse(JSON.stringify(companion.mountedMonster)) : undefined,
    isMountedAsMount: companion.isMountedAsMount,
    growthSettings: companion.growthSettings ? JSON.parse(JSON.stringify(companion.growthSettings)) : undefined,
    isBlessed: companion.isBlessed,
    isMagyeAwakeningUnlocked: companion.isMagyeAwakeningUnlocked,
    trainerProfile: companion.trainerProfile ? JSON.parse(JSON.stringify(companion.trainerProfile)) : undefined,
    instantDungeons: companion.instantDungeons ? JSON.parse(JSON.stringify(companion.instantDungeons)) : undefined,

    // 신성 각성 및 AI 전술 관련 누락 데이터 복사 (Character 명세 지원)
    hasDivineAwakened: companion.hasDivineAwakened,
    currentTactics: companion.currentTactics,
    tacticsSkillFocus: companion.tacticsSkillFocus,
    preferredSkillName: companion.preferredSkillName,
    tacticsHpThreshold: companion.tacticsHpThreshold,
    tacticsMpThreshold: companion.tacticsMpThreshold,

    // 피로도 시스템 연동
    fatigue: companion.fatigue || 0,
    lastWorldNewsMonth: player.lastWorldNewsMonth
  };

  // 2. 기존 플레이어 -> 동료 데이터 구성
  const initialNewCompanion: Companion = {
    id: companion.id,
    name: player.name,
    age: player.age,
    birthYear: player.birthYear,
    gender: player.gender,
    race: player.race,
    hairStyle: player.hairStyle,
    appearance: player.appearance,
    visualUrl: player.visualUrl,
    defaultVisualUrl: player.visualUrl,
    godVisualChoice: player.godVisualChoice,
    originalVisualUrl: player.originalVisualUrl,
    bgmUrl: player.bgmUrl,
    shinryokuType: player.shinryokuType,
    nation: player.nation,
    personality: player.personality,
    motto: player.motto,
    isImmortal: player.isImmortal,

    job: player.job,
    classType: player.classType || player.firstClassName || '전투계열',
    firstClassName: player.firstClassName,
    firstClassDescription: player.firstClassDescription,
    secondClassName: player.secondClassName,
    secondClassDescription: player.secondClassDescription,
    lastClassName: player.lastClassName,
    lastClassDescription: player.lastClassDescription,
    finalClassName: player.finalClassName,
    finalClassDescription: player.finalClassDescription,

    level: player.level,
    currentExp: player.currentExp,
    maxExp: player.maxExp,
    classTier: player.classTier,

    liberationPotential: player.liberationPotential,
    potentialAppraised: player.potentialAppraised,
    liberationEligibility: player.liberationEligibility ? JSON.parse(JSON.stringify(player.liberationEligibility)) : undefined,
    hasClearedFirstTrial: player.hasClearedFirstTrial,
    hasClearedSecondTrial: player.hasClearedSecondTrial,
    hasClearedLastTrial: player.hasClearedLastTrial,
    hasClearedFinalTrial: player.finalTrialCleared || player.hasClearedFinalTrial,
    firstTrialCleared: player.firstTrialCleared,
    secondTrialCleared: player.secondTrialCleared,
    lastTrialCleared: player.lastTrialCleared,
    finalTrialCleared: player.finalTrialCleared,

    stats: { ...player.stats },
    statPoints: player.statPoints,
    skills: JSON.parse(JSON.stringify(player.skills || [])).map((s: any) => ({
      ...s,
      mpCost: (s.type === '패시브' || s.type === 'PASSIVE') ? 0 : s.mpCost
    })),
    skillShortcuts: player.skillShortcuts ? [...player.skillShortcuts] : [],
    statusEffects: player.statusEffects ? JSON.parse(JSON.stringify(player.statusEffects)) : [],
    equipment: JSON.parse(JSON.stringify(player.equipment || {})),
    weaponMastery: player.weaponMastery ? JSON.parse(JSON.stringify(player.weaponMastery)) : {},
    combatStyle: player.combatStyle,
    targetCombatStyle: player.targetCombatStyle,
    combatStyleProgress: player.combatStyleProgress ? JSON.parse(JSON.stringify(player.combatStyleProgress)) : {},
    unlockedCombatStyles: player.unlockedCombatStyles ? [...player.unlockedCombatStyles] : [],
    battleRole: player.battleRole,
    roleProficiency: player.roleProficiency ? JSON.parse(JSON.stringify(player.roleProficiency)) : undefined,
    roleInactivityDays: player.roleInactivityDays ? JSON.parse(JSON.stringify(player.roleInactivityDays)) : undefined,

    professions: player.professions ? JSON.parse(JSON.stringify(player.professions)) : undefined,
    availableTitles: player.availableTitles ? [...player.availableTitles] : [],
    equippedTitleId: player.equippedTitleId,

    // 서브 직업/전기 기술 숙련도 및 등급
    blacksmithRank: player.blacksmithRank,
    blacksmithMastery: player.blacksmithMastery,
    alchemistRank: player.alchemistRank,
    alchemistMastery: player.alchemistMastery,
    trainerRank: player.trainerRank,
    trainerBranch: player.trainerBranch,
    trainerLevel: player.trainerLevel,
    trainerExp: player.trainerExp,
    trainerMaxExp: player.trainerMaxExp,
    housekeeperRank: player.housekeeperRank,
    housekeeperExp: player.housekeeperExp,
    housekeeperLevel: player.housekeeperLevel,
    researcherTier: player.researcherTier,

    // 클럽 및 학교 데이터
    clubData: player.clubData ? JSON.parse(JSON.stringify(player.clubData)) : undefined,
    schoolData: player.schoolData ? JSON.parse(JSON.stringify(player.schoolData)) : undefined,

    // 용병 데이터 및 명성치
    mercenaryRank: player.mercenaryData?.rank,
    reputation: player.mercenaryData?.reputation || player.fame || 0,
    infamy: player.infamy || 0,
    mercenaryData: player.mercenaryData ? JSON.parse(JSON.stringify(player.mercenaryData)) : undefined,

    // 군대 데이터 및 계급
    militaryRank: player.militaryRank,
    merit: player.militaryData?.merit || 0,
    militaryData: player.militaryData ? JSON.parse(JSON.stringify(player.militaryData)) : undefined,

    // 이종족 평판 및 마계 영지
    elfReputation: player.elfReputation,
    beastReputation: player.beastReputation,
    demonReputation: player.demonReputation,
    magyeDominions: player.magyeDominions ? JSON.parse(JSON.stringify(player.magyeDominions)) : undefined,

    // 국왕 호감도 및 왕실 관련 데이터
    nationalFavorability: player.nationalFavorability ? JSON.parse(JSON.stringify(player.nationalFavorability)) : undefined,
    lastKingQuestRefreshYear: player.lastKingQuestRefreshYear ? JSON.parse(JSON.stringify(player.lastKingQuestRefreshYear)) : undefined,
    lastKingTreasuryYear: player.lastKingTreasuryYear ? JSON.parse(JSON.stringify(player.lastKingTreasuryYear)) : undefined,
    lastKingPersonnelYear: player.lastKingPersonnelYear ? JSON.parse(JSON.stringify(player.lastKingPersonnelYear)) : undefined,
    lastKingGoodwillDate: player.lastKingGoodwillDate ? JSON.parse(JSON.stringify(player.lastKingGoodwillDate)) : undefined,
    royalPersonnel: player.royalPersonnel ? JSON.parse(JSON.stringify(player.royalPersonnel)) : undefined,
    customNationLeaders: player.customNationLeaders ? JSON.parse(JSON.stringify(player.customNationLeaders)) : undefined,

    // 성전 외교 및 신성 관계
    templeDiplomacy: player.templeDiplomacy ? JSON.parse(JSON.stringify(player.templeDiplomacy)) : undefined,
    divineRelations: player.divineRelations ? JSON.parse(JSON.stringify(player.divineRelations)) : undefined,
    faith: player.faith || 0,

    isCustom: true,
    metYear: companion.metYear || (player.currentDate ? parseInt(player.currentDate.split('-')[0]) : 2000),
    affection: 100,
    loyalty: 100,
    memories: player.memories ? [...player.memories] : [],
    socialNetwork: formerPlayerSocialNetwork,

    // 생체 및 탈것, 성장 제어 옵션 등 추가 누락 필드 일괄 복사 (플레이어 -> 기존 동료)
    pregnancy: player.pregnancy ? JSON.parse(JSON.stringify(player.pregnancy)) : undefined,
    childData: player.childData ? JSON.parse(JSON.stringify(player.childData)) : undefined,
    mountedMonsterId: player.mountedMonsterId,
    mountedMonster: player.mountedMonster ? JSON.parse(JSON.stringify(player.mountedMonster)) : undefined,
    isMountedAsMount: player.isMountedAsMount,
    growthSettings: player.growthSettings ? JSON.parse(JSON.stringify(player.growthSettings)) : undefined,
    isBlessed: player.isBlessed,
    isMagyeAwakeningUnlocked: player.isMagyeAwakeningUnlocked,
    trainerProfile: player.trainerProfile ? JSON.parse(JSON.stringify(player.trainerProfile)) : undefined,
    instantDungeons: player.instantDungeons ? JSON.parse(JSON.stringify(player.instantDungeons)) : undefined,

    // 신성 각성 및 AI 전술 데이터 복사
    hasDivineAwakened: player.hasDivineAwakened,
    currentTactics: player.currentTactics,
    tacticsSkillFocus: player.tacticsSkillFocus,
    preferredSkillName: player.preferredSkillName,
    tacticsHpThreshold: player.tacticsHpThreshold,
    tacticsMpThreshold: player.tacticsMpThreshold,

    // 전 플레이어가 동료화될 때의 고유 상호작용 및 라이벌 상태 초기 설정
    jealousyCount: 0,
    hasExperiencedBurnoutEvent: false,
    burnoutOvercome: false,
    lastMarriageAttemptDate: undefined,
    jobPersuadeCooldownDate: undefined,
    breakupWarning: false,
    lastHousekeeperCleanDate: undefined,
    loverStartDate: undefined,
    isEternalRival: false,
    respect: 0,
    isRival: false,

    // 피로도 시스템 연동
    fatigue: player.fatigue || 0,
    lastWorldNewsMonth: player.lastWorldNewsMonth,

    // 이전 플레이어의 타 동료 관계망 초기 시드 주입
    relations: formerPlayerRelations
  };

  // 3. 인간관계 전면 재매핑 (모든 동료 + 전 플레이어 동료)
  const { updatedCompanions, updatedInactiveCompanions, updatedFormerPlayer } = remapCompanionRelationships(
    player.companions || [],
    player.inactiveCompanions || [],
    companion.id,
    player.name,
    companion.name,
    initialNewCompanion,
    companion
  );

  const finalNewCompanion = updatedFormerPlayer || initialNewCompanion;

  // newPlayer 의 companions 및 inactiveCompanions 업데이트
  newPlayer.companions = [finalNewCompanion, ...updatedCompanions];
  newPlayer.inactiveCompanions = updatedInactiveCompanions;

  const logMsg = `[주인공 전환] '${player.name}'(플레이어)와 '${companion.name}'(커스텀 동료)의 역할이 전환되었습니다. 연인 관계를 포함한 모든 신상과 데이터가 완벽히 유지 및 치환되었습니다.`;

  return { newPlayer, newCompanion: finalNewCompanion, logMsg };
}
