import { WORLD_GEOGRAPHY, SHINRYOKU_TYPES_LIST } from '../constants';
import { Character, SimpleStudent } from '../types';

export interface ValidatedRivalLocation {
  region: string;
  nation: string;
  city: string;
  formatted: string;
}

/**
 * 신력 계통 문자열을 게임 내 정식 신력계통("광휘계", "화염계", "전격계" 등)으로 정규화합니다.
 */
export const normalizeShinryokuType = (rawShinryoku?: string): string => {
  if (!rawShinryoku || rawShinryoku === '미개방' || rawShinryoku === '무속성') return '광휘계';
  const clean = rawShinryoku.trim();
  if (SHINRYOKU_TYPES_LIST.includes(clean)) return clean;

  const map: Record<string, string> = {
    '신성': '광휘계',
    '빛': '광휘계',
    '원소': '전격계',
    '생명': '초화계',
    '바람': '질풍계',
    '화염': '화염계',
    '불': '화염계',
    '암흑': '암흑계',
    '어둠': '암흑계',
    '얼음': '빙결계',
    '냉기': '빙결계',
    '대지': '대지계',
    '땅': '대지계',
    '강철': '강철계',
    '전격': '전격계',
    '번개': '전격계',
    '해수': '해수계',
    '물': '해수계',
    '질풍': '질풍계',
    '초화': '초화계',
    '태양': '태양계',
    '월광': '월광계'
  };

  return map[clean] || SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)] || '광휘계';
};

/**
 * WORLD_GEOGRAPHY 전체에서 무작위 대륙, 국가, 도시를 선택합니다 (자유로운 전 세계 주행).
 */
export const generateRandomGlobalRivalLocation = (): ValidatedRivalLocation => {
  const regions = Object.keys(WORLD_GEOGRAPHY);
  const targetRegion = regions[Math.floor(Math.random() * regions.length)] || "아시아";
  const regionObj = WORLD_GEOGRAPHY[targetRegion] || WORLD_GEOGRAPHY["아시아"];
  const nations = Object.keys(regionObj);
  const targetNation = nations[Math.floor(Math.random() * nations.length)] || "대한민국";
  const nationData = regionObj[targetNation];
  const cities = (nationData && nationData.cities && nationData.cities.length > 0)
    ? nationData.cities
    : [nationData?.capital || "서울"];
  const targetCity = cities[Math.floor(Math.random() * cities.length)];

  return {
    region: targetRegion,
    nation: targetNation,
    city: targetCity,
    formatted: `${targetNation} ${targetCity}`
  };
};

/**
 * WORLD_GEOGRAPHY에 국가와 도시가 실제 존재하는지 확인합니다.
 */
export const isValidWorldLocation = (nation?: string, city?: string): boolean => {
  if (!nation || !city) return false;
  for (const rNations of Object.values(WORLD_GEOGRAPHY)) {
    if (rNations && rNations[nation]) {
      const cityList = rNations[nation].cities || [];
      const capital = rNations[nation].capital;
      if (cityList.includes(city) || city === capital) {
        return true;
      }
    }
  }
  return false;
};

/**
 * 원본 위치 문자열("북방 설원", "대한민국 서울", "프랑스 파리 - 수련장" 등)을 검증하여
 * WORLD_GEOGRAPHY에 100% 존재하는 국가와 도시 객체로 정제 및 변환합니다.
 */
export const getValidRivalLocation = (
  rawLocation?: string,
  defaultNation?: string
): ValidatedRivalLocation => {
  if (rawLocation) {
    const cleanLoc = rawLocation.replace(/\s*-\s*.*$/, '').trim();
    const parts = cleanLoc.split(/\s+/);
    if (parts.length >= 2) {
      const testNation = parts[0];
      const testCity = parts[1];

      for (const [rName, rNations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (rNations && rNations[testNation]) {
          const cities = rNations[testNation].cities || [];
          const capital = rNations[testNation].capital;
          if (cities.includes(testCity) || testCity === capital) {
            return {
              region: rName,
              nation: testNation,
              city: testCity,
              formatted: `${testNation} ${testCity}`
            };
          }
        }
      }
    }
  }

  return generateRandomGlobalRivalLocation();
};

/**
 * 캐릭터의 인맥/동료 내 영원의 라이벌 위치 및 결사대원 신력 계통을 자동 정제합니다.
 */
export const sanitizeCharacterRivalLocations = (character: Character): void => {
  const sanitizeStudent = (student: SimpleStudent) => {
    if (student && student.isEternalRival && student.rivalData) {
      const valid = getValidRivalLocation(student.rivalData.currentLocation, student.nation);
      student.rivalData.currentLocation = valid.formatted;

      if (student.shinryokuType) {
        student.shinryokuType = normalizeShinryokuType(student.shinryokuType);
      }

      if (student.rivalData.partyMembers && Array.isArray(student.rivalData.partyMembers)) {
        student.rivalData.partyMembers.forEach((comp: any) => {
          comp.shinryokuType = normalizeShinryokuType(comp.shinryokuType);
        });
      }
    }
  };

  if (character.socialNetwork) {
    character.socialNetwork.forEach(sanitizeStudent);
  }
  if (character.schoolData?.classmates) {
    character.schoolData.classmates.forEach(sanitizeStudent);
  }
};

/**
 * 이번 달에 이미 영원의 라이벌과 결투 또는 대결을 완료했는지 여부를 반환합니다.
 */
export const hasFoughtRivalThisMonth = (rivalData?: any, currentDate?: string): boolean => {
  if (!rivalData || !rivalData.lastDuelDate || !currentDate) return false;
  const currentMonth = currentDate.slice(0, 7);
  const lastDuelMonth = rivalData.lastDuelDate.slice(0, 7);
  return currentMonth === lastDuelMonth;
};

/**
 * 라이벌 결투 기록을 갱신합니다 (이번 달 결투 수행 처리).
 */
export const recordRivalDuel = (rival: SimpleStudent, currentDate?: string): void => {
  if (!rival.rivalData) return;
  const date = currentDate || "2000-01-01";
  rival.rivalData.lastDuelDate = date;
  rival.rivalData.totalDuelsCount = (rival.rivalData.totalDuelsCount || 0) + 1;
};

/**
 * 영원의 라이벌 선한/악한 영향력 행사 정산
 * - 악명도 200 이상: 오직 악행만 수행 (선행 불가)
 * - 선한 영향력 200 이상: 오직 선행만 수행 (악행 불가)
 */
export const processRivalMonthlyInfluence = (rival: SimpleStudent, character: Character): string | null => {
  if (!rival || !rival.isEternalRival) return null;
  if (!rival.rivalData) {
    rival.rivalData = {
      currentLocation: generateRandomGlobalRivalLocation().formatted,
      currentActivity: "대륙 각지를 유랑하며 세력을 확장하는 중",
      targetGoal: "플레이어를 뛰어넘어 대륙 최강의 패자가 되는 것",
      recentFeats: [],
      partyMembers: [],
      infamy: 0,
      goodWill: 0,
      alignment: 'NEUTRAL'
    };
  }

  const rd = rival.rivalData;
  let infamy = rd.infamy || rival.infamy || 0;
  let goodWill = rd.goodWill || rival.goodWill || 0;

  // 행동 성향 결정
  let isEvilAction = false;
  if (infamy >= 200) {
    isEvilAction = true;
    rd.alignment = 'EVIL';
    rival.alignment = 'EVIL';
  } else if (goodWill >= 200) {
    isEvilAction = false;
    rd.alignment = 'GOOD';
    rival.alignment = 'GOOD';
  } else {
    isEvilAction = Math.random() < 0.5;
  }

  const newLoc = generateRandomGlobalRivalLocation();
  rd.currentLocation = newLoc.formatted;

  const gainAmount = Math.floor(Math.random() * 10) + 15;
  let rumorText = "";

  if (isEvilAction) {
    infamy += gainAmount;
    rd.infamy = infamy;
    rival.infamy = infamy;
    if (infamy >= 200) {
      rd.alignment = 'EVIL';
      rival.alignment = 'EVIL';
    }

    const evilRumorTemplates = [
      `[소문] 영원의 라이벌 '${rival.name}'이(가) ${newLoc.nation} ${newLoc.city}의 상단을 기습하여 치안을 무너뜨렸다는 흉흉한 소문이 확산 중입니다! (악명도 +${gainAmount}, 현재: ${infamy})`,
      `[소문] '${rival.name}' 결사대가 ${newLoc.city} 주변 보급로를 점령하고 행인들을 위협했다는 나쁜 소식이 전해졌습니다. (악명도 +${gainAmount}, 현재: ${infamy})`,
      `[소문] '${rival.name}'이(가) ${newLoc.city}의 결계석을 훼손하여 마수 난입 소동을 일으켰습니다! (악명도 +${gainAmount}, 현재: ${infamy})`,
      `[소문] '${rival.name}'이(가) ${newLoc.city}의 명망 높은 무관을 습격하여 영지에 공포를 조성했습니다. (악명도 +${gainAmount}, 현재: ${infamy})`
    ];
    rumorText = evilRumorTemplates[Math.floor(Math.random() * evilRumorTemplates.length)];
    rd.currentActivity = `${newLoc.city} 주변에서 악행을 펼치며 공포를 조성하는 중`;
  } else {
    goodWill += gainAmount;
    rd.goodWill = goodWill;
    rival.goodWill = goodWill;
    if (goodWill >= 200) {
      rd.alignment = 'GOOD';
      rival.alignment = 'GOOD';
    }

    const goodRumorTemplates = [
      `[소문] 영원의 라이벌 '${rival.name}'이(가) ${newLoc.nation} ${newLoc.city}에 나타난 대형 마수 군단을 단신으로 물리치고 구출했습니다! (선한 영향력 +${gainAmount}, 현재: ${goodWill})`,
      `[소문] '${rival.name}' 결사대가 ${newLoc.city}의 고아원과 병원에 대량의 구호 기금을 전달했다는 따뜻한 소문이 들려옵니다. (선한 영향력 +${gainAmount}, 현재: ${goodWill})`,
      `[소문] '${rival.name}'이(가) ${newLoc.city} 주변 위험 던전을 정화하여 무고한 상인들의 보급로를 열어주었습니다. (선한 영향력 +${gainAmount}, 현재: ${goodWill})`,
      `[소문] '${rival.name}'이(가) ${newLoc.city}를 위협하던 이단 암흑 집단을 소탕하여 영민들의 송송을 받고 있습니다. (선한 영향력 +${gainAmount}, 현재: ${goodWill})`
    ];
    rumorText = goodRumorTemplates[Math.floor(Math.random() * goodRumorTemplates.length)];
    rd.currentActivity = `${newLoc.city} 주변에서 마수를 퇴치하고 선행을 베푸는 중`;
  }

  if (!rd.recentFeats) rd.recentFeats = [];
  rd.recentFeats.unshift(rumorText.replace(/\[소문\]\s*/, ''));
  if (rd.recentFeats.length > 6) rd.recentFeats.pop();

  return rumorText;
};

/**
 * 일반 NPC(동료 제외)의 월간 선한/악한 영향력 행사 정산
 * - 악명도 200 이상: 오직 악행만 수행 (선행 불가)
 * - 선한 영향력 200 이상: 오직 선행만 수행 (악행 불가)
 */
export const processGeneralNpcMonthlyInfluence = (npc: SimpleStudent, character: Character): string | null => {
  if (!npc || npc.isEternalRival) return null;

  // 동료 예외 처리 (character.companions / character.inactiveCompanions에 포함된 대원은 제외)
  const isCompanion = (character.companions || []).some(c => c.id === npc.id) ||
                      (character.inactiveCompanions || []).some(c => c.id === npc.id);
  if (isCompanion) return null;

  let infamy = npc.infamy || 0;
  let goodWill = npc.goodWill || 0;

  let isEvilAction = false;
  if (infamy >= 200) {
    isEvilAction = true;
    npc.alignment = 'EVIL';
  } else if (goodWill >= 200) {
    isEvilAction = false;
    npc.alignment = 'GOOD';
  } else {
    isEvilAction = Math.random() < 0.5;
  }

  const newLoc = generateRandomGlobalRivalLocation();
  const gainAmount = Math.floor(Math.random() * 10) + 12; // 12~21 상승
  let rumorText = "";

  if (isEvilAction) {
    infamy += gainAmount;
    npc.infamy = infamy;
    if (infamy >= 200) npc.alignment = 'EVIL';

    const evilTemplates = [
      `[소문] 인맥 '${npc.name}'이(가) ${newLoc.nation} ${newLoc.city}에서 불법 밀수 거래에 가담했다는 오명이 퍼지고 있습니다. (악명도 +${gainAmount}, 현재: ${infamy})`,
      `[소문] '${npc.name}'이(가) ${newLoc.city}의 무관과 시비 끝에 난동을 피워 치안 수배령이 내렸습니다. (악명도 +${gainAmount}, 현재: ${infamy})`,
      `[소문] '${npc.name}'이(가) ${newLoc.city}에서 사기 사건에 관련되었다는 흉흉한 소문이 들려옵니다. (악명도 +${gainAmount}, 현재: ${infamy})`
    ];
    rumorText = evilTemplates[Math.floor(Math.random() * evilTemplates.length)];
  } else {
    goodWill += gainAmount;
    npc.goodWill = goodWill;
    if (goodWill >= 200) npc.alignment = 'GOOD';

    const goodTemplates = [
      `[소문] 인맥 '${npc.name}'이(가) ${newLoc.nation} ${newLoc.city}에서 주민들과 함께 마수의 습격을 방어해냈습니다! (선한 영향력 +${gainAmount}, 현재: ${goodWill})`,
      `[소문] '${npc.name}'이(가) ${newLoc.city}의 성당과 구호소에 대량의 은화를 기부하고 구호에 앞장섰습니다. (선한 영향력 +${gainAmount}, 현재: ${goodWill})`,
      `[소문] '${npc.name}'이(가) ${newLoc.city}에서 조난된 탐험대를 무사히 구조하여 칭송받고 있습니다. (선한 영향력 +${gainAmount}, 현재: ${goodWill})`
    ];
    rumorText = goodTemplates[Math.floor(Math.random() * goodTemplates.length)];
  }

  return rumorText;
};
