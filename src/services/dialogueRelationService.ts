import { Character, Companion, SimpleStudent, RelationType, CompanionRelation, TempleVisitor } from '../types';
import { areSiblings, isHalfSibling } from './siblingService';

/**
 * 게임 내에 존재하는 모든 관련 인물(플레이어, 파티 동료, 대기 동료, 관계망 인물 등)의 매핑을 생성합니다.
 */
export const getAllKnownPeople = (player?: Character): { id: string; name: string; person: any }[] => {
  if (!player) return [];

  const list: { id: string; name: string; person: any }[] = [
    { id: 'player', name: `${player.name}`, person: player }
  ];
  const seenIds = new Set<string>(['player']);

  const addPerson = (person: any, fallbackName?: string) => {
    if (!person) return;
    const id = person.id || fallbackName;
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    list.push({ id, name: person.name || fallbackName || '알 수 없음', person });
  };

  // 파티 동료 및 대기 동료
  (player.companions || []).forEach(c => addPerson(c));
  (player.inactiveCompanions || []).forEach(c => addPerson(c));
  (player.deceasedCompanions || []).forEach(c => addPerson(c));

  // 사회적 관계망
  (player.socialNetwork || []).forEach(n => addPerson(n));

  // 학교 친구
  (player.schoolData?.classmates || []).forEach(s => addPerson(s));

  // 동아리 부원
  (player.clubData?.clubMembers || []).forEach(m => addPerson(m));

  // 성전 방문객
  if (player.base?.templeVisitors) {
    Object.values(player.base.templeVisitors).forEach((vList: any) => {
      if (Array.isArray(vList)) {
        vList.forEach(v => addPerson(v));
      }
    });
  }

  return list;
};

/**
 * 인물 간 관계 유형에 대한 한글 명칭과 설명 반환
 */
export const getRelationTypeDescription = (type: RelationType | string, affection?: number): string => {
  switch (type) {
    case RelationType.SPOUSE:
    case '배우자':
      return '배우자 (평생을 함께하기로 맹세한 반려자, 절대적인 사랑과 신뢰)';
    case RelationType.LOVER:
    case '연인':
      return '연인 (서로 깊이 사랑하고 아끼는 관계)';
    case RelationType.FLIRT:
    case '썸':
      return '호감 (서로에게 이성적인 두근거림과 관심을 느끼는 사이)';
    case RelationType.BEST_FRIEND:
    case '절친':
      return '절친 (어떤 비밀도 터놓을 수 있는 가장 각별한 친구)';
    case RelationType.FRIEND:
    case '친구':
      return '친구 (서로 믿고 의지하는 친밀한 친구)';
    case RelationType.RIVAL:
    case '라이벌':
      return '라이벌 (서로의 실력을 겨루며 자극을 주고받는 경쟁 상대)';
    case RelationType.SWORN_SIBLING:
    case '의형제/의자매':
      return '의형제/의자매 (피보다 진한 유대를 맺은 결의 형제)';
    case RelationType.SIBLING:
    case '형제자매':
      return '형제자매 (한 피를 나눈 가족, 아끼면서도 티격태격할 수 있는 사이)';
    case RelationType.CONFLICT:
    case '갈등':
      return '갈등/앙숙 (의견 차이나 악감정으로 인해 껄끄럽고 경계하는 사이)';
    case RelationType.ENEMY:
    case '원수':
      return '원수 (치열한 원한이나 적대감을 품고 있는 증오의 대상)';
    case RelationType.PAST_CONNECTION:
    case '과거 인연':
      return '과거 인연 (예전에 깊은 인연이 있었으나 지금은 각자의 길을 걷는 사이)';
    case RelationType.ALLY:
    case '동료':
    default:
      if (affection !== undefined) {
        if (affection >= 80) return '각별한 동료 (호감도 매우 높음, 강한 유대)';
        if (affection >= 50) return '친밀한 동료 (호감도 높음, 호의적)';
        if (affection >= 20) return '원만한 동료 (기본적인 호감)';
        if (affection < -50) return '극도로 적대적인 관계 (불만과 원한 가득함)';
        if (affection < 0) return '불편한 동료 (호감도 낮음, 서먹하거나 못마땅함)';
      }
      return '동료 (함께 활동하는 동료)';
  }
};

/**
 * 대화 시 프롬프트에 주입할 인물 관계망 정보 텍스트 생성
 */
export const buildRelationContextForDialogue = (target: any, player?: Character): string => {
  if (!target) return '';

  const knownPeople = getAllKnownPeople(player);
  const findPersonName = (id: string, fallback?: string): string => {
    if (id === 'player' && player) return player.name;
    const found = knownPeople.find(p => p.id === id);
    return found?.name || fallback || '알 수 없음';
  };

  const sections: string[] = [];

  // 1. 플레이어와의 관계
  let playerRelationStr = '';
  const isSpouseWithPlayer = target.isSpouse && (target.partnerId === 'player' || (!target.partnerId && !target.partnerName));
  const isLoverWithPlayer = target.isLover && (target.partnerId === 'player' || (!target.partnerId && !target.partnerName));
  const isSiblingWithPlayer = player ? areSiblings(target, player, player) : false;
  const isHalfSibWithPlayer = player && isSiblingWithPlayer ? isHalfSibling(target, player, player) : false;
  const playerRelFromMap = target.relations?.['player'];

  if (isSpouseWithPlayer || playerRelFromMap?.type === RelationType.SPOUSE) {
    playerRelationStr = `배우자 (플레이어 '${player?.name || '주인공'}'의 남편/아내, 깊은 사랑과 신뢰)`;
  } else if (isLoverWithPlayer || playerRelFromMap?.type === RelationType.LOVER) {
    playerRelationStr = `연인 (플레이어 '${player?.name || '주인공'}'와 열애 중, 애틋하고 다정한 사이)`;
  } else if (isSiblingWithPlayer || target.relation === RelationType.SIBLING || playerRelFromMap?.type === RelationType.SIBLING) {
    playerRelationStr = isHalfSibWithPlayer 
      ? `이복/이부 형제자매 (플레이어 '${player?.name || '주인공'}'와 한쪽 부모를 공유하는 가족)` 
      : `친형제자매 (플레이어 '${player?.name || '주인공'}'와 피를 나눈 친가족)`;
  } else if (playerRelFromMap?.type) {
    playerRelationStr = `${getRelationTypeDescription(playerRelFromMap.type, playerRelFromMap.affection)} (호감도: ${target.affection ?? playerRelFromMap.affection ?? 50})`;
  } else if (target.isRival) {
    playerRelationStr = `라이벌 (플레이어 '${player?.name || '주인공'}'의 경쟁자, 존중도: ${target.respect ?? 50}, 긴장도: ${target.tension ?? 50})`;
  } else {
    playerRelationStr = `${getRelationTypeDescription(RelationType.ALLY, target.affection)} (호감도: ${target.affection ?? 50}${target.loyalty !== undefined ? `, 충성도: ${target.loyalty}` : ''})`;
  }

  sections.push(`- 플레이어(${player?.name || '주인공'})와의 관계: ${playerRelationStr}`);

  // 2. 연인 및 배우자 정보 (제3자와 맺은 경우)
  const isTakenByOther = (target.isLover || target.isSpouse) && target.partnerId && target.partnerId !== 'player';
  if (isTakenByOther) {
    const partnerName = target.partnerName || findPersonName(target.partnerId, '다른 인물');
    const partnerType = target.isSpouse ? '배우자' : '연인';
    sections.push(`- 연인/배우자 관계: '${partnerName}'의 ${partnerType} (플레이어가 아닌 '${partnerName}'와 진지하게 맺어진 상태. 플레이어의 로맨틱한 접근은 단호히 거절함)`);
  } else if (isSpouseWithPlayer) {
    sections.push(`- 연인/배우자 관계: 플레이어 '${player?.name}'의 배우자`);
  } else if (isLoverWithPlayer) {
    sections.push(`- 연인/배우자 관계: 플레이어 '${player?.name}'의 연인`);
  } else {
    sections.push(`- 연인/배우자 관계: 솔로 (현재 맺어진 연인 없음)`);
  }

  // 3. 가족 및 혈연 관계
  const familyList: string[] = [];
  if (target.fatherName) familyList.push(`아버지: ${target.fatherName}`);
  if (target.motherName) familyList.push(`어머니: ${target.motherName}`);
  if (target.children && target.children.length > 0) {
    const childNames = target.children.map((c: any) => typeof c === 'string' ? c : c.name).filter(Boolean);
    if (childNames.length > 0) familyList.push(`자녀: ${childNames.join(', ')}`);
  }

  // 동료들 중 형제자매 탐색
  if (player?.companions) {
    player.companions.forEach(c => {
      if (c.id === target.id) return;
      if (areSiblings(target, c, player)) {
        const isHalf = isHalfSibling(target, c, player);
        familyList.push(`${isHalf ? '이복/이부 형제자매' : '친형제자매'}: ${c.name}`);
      }
    });
  }

  if (familyList.length > 0) {
    sections.push(`- 가족 및 혈연 관계: ${familyList.join(' | ')}`);
  }

  // 4. 관계망 내 다른 인물들과의 관계 (relations 맵 및 주요 동료들과의 유대)
  const relationEntries: string[] = [];
  const rawRelations = target.relations ? (Object.values(target.relations) as CompanionRelation[]) : [];

  rawRelations.forEach(rel => {
    if (!rel || rel.targetId === 'player') return;
    const otherName = findPersonName(rel.targetId);
    const desc = getRelationTypeDescription(rel.type, rel.affection);
    const affText = rel.affection !== undefined ? ` (호감도 ${rel.affection})` : '';
    relationEntries.push(`* ${otherName}: ${desc}${affText}`);
  });

  // relations 맵에 없더라도 파티 동료 중 라이벌이나 절친/가족이 있으면 보강
  if (player?.companions) {
    player.companions.forEach(c => {
      if (c.id === target.id) return;
      const alreadyListed = rawRelations.some(r => r.targetId === c.id);
      if (alreadyListed) return;

      if (target.rivalId === c.id || target.rivalName === c.name) {
        relationEntries.push(`* ${c.name}: 라이벌 (의식하고 있는 경쟁 상대)`);
      } else if (c.relations?.[target.id]) {
        const otherRel = c.relations[target.id];
        const desc = getRelationTypeDescription(otherRel.type, otherRel.affection);
        relationEntries.push(`* ${c.name}: ${desc} (상대방이 먼저 형성한 관계)`);
      }
    });
  }

  if (relationEntries.length > 0) {
    sections.push(`- 관계망 내 인물들과의 주요 관계:\n  ${relationEntries.join('\n  ')}`);
  } else {
    sections.push(`- 관계망 내 인물들과의 주요 관계: 특별한 갈등이나 연인 없이 전반적으로 동료들과 무난하게 지내는 중`);
  }

  return sections.join('\n');
};

/**
 * 프롬프트에 주입할 관계망 행동 지침
 */
export const RELATION_DIALOGUE_GUIDELINES = `
[관계망 반영 대화 지침]
1. 당신은 위 [인물 관계망 정보]에 적힌 모든 인간관계(연인, 배우자, 친구, 절친, 라이벌, 앙숙, 가족 등)를 완벽히 인지하고 있습니다.
2. 플레이어가 다른 동료나 지인에 대해 물어보거나 대화 주제로 언급할 경우, 그 인물과의 관계와 호감도에 따른 진솔한 감정(호감, 신뢰, 질투, 라이벌 의식, 경계심, 가족애 등)을 자연스럽게 드러내세요.
3. 다른 인물과 연인이나 배우자 관계라면 그 사람에 대한 변함없는 애정을 품고 있으며, 플레이어가 연애적인 고백이나 호감을 표하더라도 단호하게 선을 긋고 거절해야 합니다.
4. 갈등이나 원수 관계인 인물에 대해서는 불편함, 경계심, 혹은 불만을 드러내고, 절친이나 가족에 대해서는 따뜻한 신뢰와 애착을 보여주세요.
5. 대화 중에 주변 동료들의 근황이나 관계망 속 인물들과 있었던 소소한 에피소드를 자연스럽게 곁들여 대화의 생동감을 높이세요.
6. 미성년자와 성인 간의 연애나 썸은 윤리적으로 엄격히 금지되어 있습니다. 상대방과의 나이 관계(미성년자/성인 여부)를 고려하여 성인이 미성년자에게, 또는 미성년자가 성인에게 연애적 호감이나 고백을 표할 경우 윤리적 선을 지켜 단호하고 정중히 거절해야 합니다. (단, 미성년자끼리의 풋풋한 교제나 성인끼리의 교제는 가능합니다)
`.trim();
