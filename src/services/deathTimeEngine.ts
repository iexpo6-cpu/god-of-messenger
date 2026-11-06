
import { Character, Companion, JobType, SimpleStudent, RelationType, ClassTier, Skill, Stats, DeceasedAlertInfo, Item } from '../types';
import { getYear, generateName, generateDefaultVisualUrl, generateEnemyStats, getRaceByNation, calculateFinalStats } from '../utils';
import { isMessengerJob } from '../messengerofgodvisual';
import { SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES } from '../constants';
import { remapCompanionRelationships } from './playerCompanionSwitchService';

const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

export const purgeDeceasedCompanions = (character: Character): Character => {
  const newChar = { ...character };
  
  if (!newChar.deceasedCompanions) {
    newChar.deceasedCompanions = [];
  }

  // Active companions
  if (newChar.companions) {
    const aliveCompanions: Companion[] = [];
    newChar.companions.forEach(c => {
      if (c.isDead) {
        newChar.deceasedCompanions!.push(c);
      } else {
        aliveCompanions.push(c);
      }
    });
    newChar.companions = aliveCompanions;
  }

  // Inactive companions
  if (newChar.inactiveCompanions) {
    const aliveInactive: Companion[] = [];
    newChar.inactiveCompanions.forEach(c => {
      if (c.isDead) {
        newChar.deceasedCompanions!.push(c);
      } else {
        aliveInactive.push(c);
      }
    });
    newChar.inactiveCompanions = aliveInactive;
  }

  return newChar;
};

// 자연사 면역 직업군
export const IMMUNE_JOBS: JobType[] = [
  JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
  JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
  JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
  JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
  JobType.VOID_MESSENGER, JobType.DEMON_GOD,
  JobType.MAGYE_GENERAL_1, JobType.MAGYE_GENERAL_2, JobType.MAGYE_GENERAL_3,
  JobType.MAGYE_GENERAL_4, JobType.MAGYE_GENERAL_5, JobType.MAGYE_GENERAL_6,
  JobType.MAGYE_GENERAL_7, JobType.MAGYE_GENERAL_8, JobType.MAGYE_GENERAL_9,
  JobType.MAGYE_GENERAL_10, JobType.MAGYE_GENERAL_11
];

// 연령별 일일 사망 확률 (%)
const DAILY_DEATH_RATES = [
  { maxAge: 30, rate: 0.0003 },
  { maxAge: 50, rate: 0.0006 },
  { maxAge: 70, rate: 0.002 },
  { maxAge: 85, rate: 0.005 },
  { maxAge: 100, rate: 0.01 },
   { maxAge: 150, rate: 0.05 },
  { maxAge: 9999, rate: 0.1 }
];

/**
 * 캐릭터의 종족과 나이를 고려하여 실제 "노화 지수" 상의 나이를 반환
 */
const getEffectiveAge = (ageStr: string, race: string): number => {
  const age = parseInt(ageStr.replace(/[^0-9]/g, '')) || 20;
  // 비인간 종족은 수명이 훨씬 길어 노화가 늦게 옴 (인간 기준 250년 보정)
  if (['엘프', '수인', '마인','몬스터'].includes(race)) {
    return Math.max(0, age - 350);
  }
  return age;
};

/**
 * [NEW] 계승 비율 계산 헬퍼
 */
export const calculateSuccessionRatio = (character: Character): number => {
    const isMessenger = isMessengerJob(character.job);
    const isDemonGod = character.job === JobType.DEMON_GOD;
    const isGeneral = character.job && character.job.toString().includes('제너럴');
    const isSlayer = character.isGodDefeated;

    // 1. 신을 죽인 자 (사자 혹은 마신) - 50%
    if (isSlayer && (isMessenger || isDemonGod)) return 0.50;
    // 2. 마신 - 15%
    if (isDemonGod) return 0.15;
    // 3. 신의 사자 혹은 제너럴 - 10%
    if (isMessenger || isGeneral) return 0.10;
    // 4. 기본 - 5%
    return 0.05;
};

/**
 * [NEW] 파견 중인지 확인하는 헬퍼
 */
const isDispatched = (compId: string, character: Character): boolean => {
  const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
  const isWarDispatched = character.base?.dispatched?.some(m => 
    m.missionType === 'WarInvasion' && (m as any).participants?.includes(compId)
  );
  const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(compId));
  return !!(isBaseDispatched || isWarDispatched || isGroupDispatched);
};

/**
 * 사망 원인 및 로그 메시지 생성 헬퍼
 */
const getDeathCauseAndLog = (
  entity: any, 
  roleType: 'player' | 'party' | 'inactive' | 'social' | 'classmate',
  currentYear: number,
  fallbackNation: string
): { reason: string; log: string; killer?: SimpleStudent } => {
  const effectiveAge = getEffectiveAge(entity.age, entity.race);
  const name = entity.name;

  // 1. 젊은 나이 (50세 이하): 살해/암살 이벤트, 급작스러운 지병, 마력 역류, 불의의 마수 습격 등
  if (effectiveAge <= 50) {
    const isMurder = Math.random() < 0.55; // 젊은 층 사망의 약 55%는 암살 및 기습 살해

    if (isMurder) {
      const killerGender = Math.random() > 0.5 ? "남성" : "여성";
      const genderParam = killerGender === "남성" ? "male" : "female";
      const killerNation = entity.nation || fallbackNation || "대한민국";
      const killerRace = getRaceByNation(killerNation);
      const killerName = generateName(killerNation, genderParam);
      const victimLevel = Math.max(1, entity.level || 1);
      // 살해범의 레벨은 사망한 대상보다 최소 5~20 레벨 이상 높게 설정
      const killerLevel = victimLevel + Math.floor(Math.random() * 16) + 5;
      const killerType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
      const killerAgeNum = 20 + Math.floor(Math.random() * 25);
      const killerJob = (HUMANOID_CLASSES[killerType] || ["암살자"])[0];

      const isDirectCompanion = roleType === 'party' || roleType === 'inactive' || roleType === 'player';

      const killer: SimpleStudent = {
        id: `killer_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: killerName,
        age: `${killerAgeNum}세`,
        birthYear: currentYear - killerAgeNum,
        gender: killerGender,
        race: killerRace,
        nation: killerNation,
        level: killerLevel,
        classType: killerJob,
        personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
        appearance: isDirectCompanion 
          ? `'${name}'을(를) 잔혹하게 암살하고 어둠 속으로 도주한 냉혹한 원수입니다.`
          : `과거의 인연이었던 '${name}'을(를) 살해했다고 전해지는 인물입니다.`,
        stats: generateEnemyStats(killerLevel),
        shinryokuType: killerType,
        affection: isDirectCompanion ? -100 : 0, // 동료는 원수로 극심한 악감정(-100), 과거 인연은 단순 인지(0)
        isPastConnection: true, // 과거 인연으로 등록
        origin: isDirectCompanion ? "암살 배후" : "소문 속 인물",
        originName: isDirectCompanion ? "원수 (살해범)" : "사건 관련 인물",
        memories: isDirectCompanion
          ? [`${currentYear}년 소중한 동료 '${name}'을(를) 은밀히 기습하여 살해한 씻을 수 없는 원수입니다.`]
          : [`${currentYear}년 과거의 인연이었던 '${name}'을(를) 살해했다는 소문으로 알게 된 인물입니다.`],
        visualUrl: generateDefaultVisualUrl(killerName, killerNation, killerRace, killerGender)
      };

      const reason = `'${killerName}'에게 살해당함`;
      let log = '';
      if (roleType === 'player') {
        log = `[비보] 가주 ${name}이(가) 암살자 '${killerName}'의 비열한 기습을 받아 치명상을 입고 쓰러졌습니다.`;
      } else if (roleType === 'party') {
        log = `[비보] 동료 ${name}이(가) 자객 '${killerName}'에게 살해당했습니다! 당신은 '${killerName}'에게 깊은 악감정을 품고 원수(과거 인연)로 등록했습니다.`;
      } else if (roleType === 'inactive') {
        log = `[비보] 기지 대기 동료 ${name}이(가) 암살자 '${killerName}'에게 살해당했습니다! '${killerName}'에 대한 깊은 증오를 품고 원수(과거 인연)로 등록했습니다.`;
      } else if (roleType === 'social') {
        log = `[소식] 과거의 인연이었던 ${name}이(가) '${killerName}'에게 살해당했다는 전갈이 도착했습니다. 살해범 '${killerName}'의 존재를 알게 되었습니다.`;
      } else {
        log = `[소식] 학창 시절 동창이었던 ${name}이(가) '${killerName}'에게 살해당했다는 안타까운 소식이 전해졌습니다. 살해범 '${killerName}'의 존재를 알게 되었습니다.`;
      }

      return { reason, log, killer };
    }

    // 살해가 아닌 기타 젊은 층 돌발 요절 사건
    const otherYoungEvents = [
      {
        reason: '급작스러운 지병 악화로 사망',
        desc: '오랫동안 앓아오던 내상의 후유증과 급작스러운 지병 악화로 요절'
      },
      {
        reason: '마력 역류 및 주화입마로 요절',
        desc: '수련 도중 발생한 치명적인 마력 역류와 주화입마를 억제하지 못하고 세상을 떠남'
      },
      {
        reason: '불의의 마수 습격을 받아 전사',
        desc: '이동 중 갑작스럽게 출현한 강력한 돌연변이 마물 무리에 맞서 싸우다 전사'
      },
      {
        reason: '원인 불명의 급환으로 요절',
        desc: '원인 불명의 급환이 온몸에 퍼져 손쓸 틈도 없이 갑작스럽게 숨을 거둠'
      },
      {
        reason: '치명적인 독기에 중독되어 사망',
        desc: '고대 유적과 위험 지대에서 퍼져 나온 치명적인 맹독에 중독되어 절명'
      }
    ];

    const pick = otherYoungEvents[Math.floor(Math.random() * otherYoungEvents.length)];

    let log = '';
    if (roleType === 'player') {
      log = `[비보] 가주 ${name}이(가) ${pick.desc}했다는 비보가 전해졌습니다.`;
    } else if (roleType === 'party') {
      log = `[비보] 동료 ${name}이(가) ${pick.desc}했습니다.`;
    } else if (roleType === 'inactive') {
      log = `[비보] 기지 대기 동료 ${name}이(가) ${pick.desc}했다는 비보가 전해졌습니다.`;
    } else if (roleType === 'social') {
      log = `[소식] 과거의 인연이었던 ${name}이(가) ${pick.desc}했다는 전갈이 도착했습니다.`;
    } else {
      log = `[소식] 학창 시절 동창이었던 ${name}이(가) ${pick.desc}했다는 안타까운 소식이 들려왔습니다.`;
    }

    return { reason: pick.reason, log };
  }

  // 2. 장년/고령 (51세 ~ 75세): 오랜 지병, 내상 악화, 기력 쇠진
  if (effectiveAge <= 75) {
    const matureDeathEvents = [
      {
        reason: '오랜 지병 악화로 별세',
        desc: '수많은 전투와 세월로 누적된 오랜 지병이 악화되어 영면에 듦'
      },
      {
        reason: '고질적인 내상 악화로 별세',
        desc: '쇠약해진 기력과 고질적인 내상을 이겨내지 못하고 조용히 눈을 감음'
      },
      {
        reason: '기력 쇠진으로 영면',
        desc: '평생의 사명을 다하고 세월의 흐름 속에 기력이 다하여 편안하게 안식에 듦'
      },
      {
        reason: '지병으로 별세',
        desc: '지병으로 인해 가족과 동료들의 애도 속에 세상을 떠남'
      }
    ];

    const pick = matureDeathEvents[Math.floor(Math.random() * matureDeathEvents.length)];

    let log = '';
    if (roleType === 'player') {
      log = `[비보] 가주 ${name}이(가) ${pick.desc}했습니다.`;
    } else if (roleType === 'party') {
      log = `[비보] 동료 ${name}이(가) ${pick.desc}했습니다.`;
    } else if (roleType === 'inactive') {
      log = `[비보] 기지에서 휴식 중이던 ${name}이(가) ${pick.desc}했습니다.`;
    } else if (roleType === 'social') {
      log = `[소식] 과거의 인연이었던 ${name}이(가) ${pick.desc}했다는 전갈이 왔습니다.`;
    } else {
      log = `[소식] 학창 시절 동창이었던 ${name}이(가) ${pick.desc}했다는 소식이 전해졌습니다.`;
    }

    return { reason: pick.reason, log };
  }

  // 3. 노년 (76세 이상): 천수를 다하고 노환으로 별세
  const elderDeathEvents = [
    {
      reason: '노환으로 별세',
      desc: '세월의 무게를 이기지 못하고 노환으로 조용히 영면에 듦'
    },
    {
      reason: '천수를 다하여 영면',
      desc: '파란만장했던 긴 삶을 마치고 천수를 다하여 평화롭게 눈을 감음'
    },
    {
      reason: '세월의 순리에 따라 영면',
      desc: '긴 세월의 여정을 마치고 세월의 순리에 따라 평온하게 영면에 듦'
    }
  ];

  const pick = elderDeathEvents[Math.floor(Math.random() * elderDeathEvents.length)];

  let log = '';
  if (roleType === 'player') {
    log = `[비보] 세월을 이기지 못한 가주 ${name}이(가) ${pick.desc}했습니다.`;
  } else if (roleType === 'party') {
    log = `[비보] 동료 ${name}이(가) ${pick.desc}했습니다.`;
  } else if (roleType === 'inactive') {
    log = `[비보] 기지에서 휴식 중이던 ${name}이(가) ${pick.desc}했습니다.`;
  } else if (roleType === 'social') {
    log = `[소식] 과거의 인연이었던 ${name}이(가) 세월의 흐름 속에 영면에 들었다는 전갈이 왔습니다.`;
  } else {
    log = `[소식] 학창 시절 동창이었던 ${name}이(가) 세월의 흐름 속에 영면에 들었다는 소식이 전해졌습니다.`;
  }

  return { reason: pick.reason, log };
};

/**
 * 매일 발생하는 노화 및 자연사 체크
 */
export const processNaturalDeath = (character: Character): { updatedChar: Character, deathLogs: string[], newDeceased: DeceasedAlertInfo[] } => {
  const deathLogs: string[] = [];
  const newDeceased: DeceasedAlertInfo[] = [];
  const newKillers: SimpleStudent[] = [];
  const newChar = { ...character };
  const currentYear = getYear(character.currentDate || '2000-01-01');
  const fallbackNation = newChar.nation || '대한민국';

  const checkDeath = (entity: any, isCompanion: boolean = false): boolean => {
    // [MODIFIED] 이 부분에서 영생(isImmortal) 여부를 먼저 확인합니다.
    if (entity.isDead || entity.isImmortal || (entity.job && IMMUNE_JOBS.includes(entity.job))) return false;
    
    const effectiveAge = getEffectiveAge(entity.age, entity.race);
    const rateConfig = DAILY_DEATH_RATES.find(c => effectiveAge <= c.maxAge) || DAILY_DEATH_RATES[DAILY_DEATH_RATES.length - 1];
    
    // 사망 주사위
    return Math.random() * 100 < rateConfig.rate;
  };

  // 1. 플레이어 체크
  if (checkDeath(newChar)) {
    newChar.isDead = true;
    const deathInfo = getDeathCauseAndLog(newChar, 'player', currentYear, fallbackNation);
    deathLogs.push(deathInfo.log);
    if (deathInfo.killer) newKillers.push(deathInfo.killer);
  }

  // 2. 파티원 체크
  newChar.companions = newChar.companions.map(c => {
    if (checkDeath(c, true)) {
      const deathInfo = getDeathCauseAndLog(c, 'party', currentYear, fallbackNation);
      deathLogs.push(deathInfo.log);
      if (deathInfo.killer) newKillers.push(deathInfo.killer);
      newDeceased.push({
        id: c.id,
        name: c.name,
        reason: deathInfo.reason,
        nation: c.nation || newChar.nation || '대한민국',
        originName: '함께했던 파티 동료',
        visualUrl: c.visualUrl,
        gender: c.gender,
        race: c.race
      });
      return { ...c, isDead: true, purgedReason: deathInfo.reason, hp: 0 };
    }
    return c;
  });

  // 3. 대기 동료 체크
  if (newChar.inactiveCompanions) {
    newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
      if (checkDeath(c, true)) {
        const deathInfo = getDeathCauseAndLog(c, 'inactive', currentYear, fallbackNation);
        deathLogs.push(deathInfo.log);
        if (deathInfo.killer) newKillers.push(deathInfo.killer);
        newDeceased.push({
          id: c.id,
          name: c.name,
          reason: deathInfo.reason,
          nation: c.nation || newChar.nation || '대한민국',
          originName: '기지 대기 동료',
          visualUrl: c.visualUrl,
          gender: c.gender,
          race: c.race
        });
        return { ...c, isDead: true, purgedReason: deathInfo.reason, hp: 0 };
      }
      return c;
    });
  }

  // 4. 인물 관계망 (과거 인연) 체크
  if (newChar.socialNetwork) {
    newChar.socialNetwork = newChar.socialNetwork.map(n => {
      if (checkDeath(n)) {
        const deathInfo = getDeathCauseAndLog(n, 'social', currentYear, fallbackNation);
        deathLogs.push(deathInfo.log);
        if (deathInfo.killer) newKillers.push(deathInfo.killer);
        newDeceased.push({
          id: n.id,
          name: n.name,
          reason: deathInfo.reason,
          nation: n.nation || newChar.nation || '대한민국',
          originName: n.originName || '과거의 소중한 인연',
          visualUrl: n.visualUrl,
          gender: n.gender,
          race: n.race
        });
        return { ...n, isDead: true, purgedReason: deathInfo.reason };
      }
      return n;
    });
  }

  // 5. 학교 동창/클럽 체크
  if (newChar.schoolData?.classmates) {
    newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
      if (checkDeath(s)) {
        const deathInfo = getDeathCauseAndLog(s, 'classmate', currentYear, fallbackNation);
        deathLogs.push(deathInfo.log);
        if (deathInfo.killer) newKillers.push(deathInfo.killer);
        newDeceased.push({
          id: s.id,
          name: s.name,
          reason: deathInfo.reason,
          nation: s.nation || newChar.nation || '대한민국',
          originName: newChar.schoolData?.schoolName || '학창 시절 동창',
          visualUrl: s.visualUrl,
          gender: s.gender,
          race: s.race
        });
        return { ...s, isDead: true, purgedReason: deathInfo.reason };
      }
      return s;
    });
  }

  // 살해범을 과거 인연(원수)으로 등록
  if (newKillers.length > 0) {
    if (!newChar.socialNetwork) newChar.socialNetwork = [];
    newKillers.forEach(killer => {
      if (!newChar.socialNetwork!.some(sn => sn.id === killer.id)) {
        newChar.socialNetwork!.push(killer);
      }
    });
  }

  return { updatedChar: newChar, deathLogs, newDeceased };
};

/**
 * 승계 가능한 후보자 리스트 추출
 */
export const getSuccessors = (character: Character): Companion[] => {
  const allComps = [
    ...character.companions,
    ...(character.inactiveCompanions || [])
  ].filter(c => !c.isDead && !c.isMonster);

  // 가중치 계산: 배우자(1000) > 자녀(성인 500) > 동료(호감+충성)
  return allComps.sort((a, b) => {
    const getWeight = (c: Companion) => {
      let weight = c.affection + c.loyalty;
      if (c.isSpouse && c.partnerId === 'player') weight += 1000;
      const age = parseInt(c.age.replace(/[^0-9]/g, '')) || 0;
      if ((c.classType.includes('자녀') || c.classType.includes('Child')) && age >= 20) weight += 500;
      return weight;
    };
    return getWeight(b) - getWeight(a);
  });
};

/**
 * 승계 수행: 선택된 동료가 새로운 플레이어가 됨
 */
export const performSuccession = (character: Character, successor: Companion, inheritedSkill?: Skill): Character => {
  // 1. 전대 가주(현재 플레이어)를 고인으로 아카이빙 준비
  const currentYear = getYear(character.currentDate || '2000-01-01');
  const predecessorArchive: SimpleStudent = {
    id: `predecessor_${Date.now()}`,
    name: character.name,
    age: character.age,
    birthYear: character.birthYear,
    gender: character.gender, 
    race: character.race,
    nation: character.nation,
    level: character.level,
    personality: character.personality,
    appearance: character.appearance,
    classType: "선대 가주",
    stats: { ...character.stats },
    affection: 100,
    isPurged: true,
    purgedReason: "가문의 영광을 뒤로하고 서거",
    visualUrl: character.visualUrl
  };

  // 2. 가주의 유산 및 계승 비율 적용
  const ratio = calculateSuccessionRatio(character);
  const legacy = {
    money: character.money,
    inventory: character.inventory,
    base: character.base,
    mercenaryData: character.mercenaryData,
    militaryData: character.militaryData,
    templeDiplomacy: character.templeDiplomacy,
    socialNetwork: character.socialNetwork ? [...character.socialNetwork, predecessorArchive] : [predecessorArchive],
    memories: character.memories || []
  };
  // 3. 새로운 가주 데이터 주입
  const nextPlayer: Character = {
    ...legacy,
    name: successor.name,
    age: successor.age,
    birthYear: successor.birthYear,
    gender: successor.gender,
    race: successor.race,
    hairStyle: successor.hairStyle || '평범함',
    appearance: successor.appearance,
    visualUrl: successor.visualUrl || successor.defaultVisualUrl || generateDefaultVisualUrl(successor.name, successor.nation || character.nation, successor.race, successor.gender),
    bgmUrl: successor.bgmUrl,
    motto: successor.motto,
    shinryokuType: successor.shinryokuType || '미개방',
    nation: successor.nation || character.nation,
    personality: successor.personality || '평범함',
    job: successor.job || JobType.UNEMPLOYED,
    firstClassName: successor.firstClassName  || '미정',
    firstClassDescription: successor.firstClassDescription  || '없음',
    secondClassName: successor.secondClassName,
    secondClassDescription: successor.secondClassDescription,
    lastClassName: successor.lastClassName,
    lastClassDescription: successor.lastClassDescription,
    finalClassName: successor.finalClassName,
    finalClassDescription: successor.finalClassDescription,
    level: successor.level,
    currentExp: successor.currentExp,
    maxExp: successor.maxExp,
    stats: { ...successor.stats },
    statPoints: successor.statPoints,
    classTier: successor.classTier,
    liberationPotential: successor.liberationPotential,
    potentialAppraised: successor.potentialAppraised,
    hasClearedFirstTrial: successor.hasClearedFirstTrial,
    hasClearedSecondTrial: successor.hasClearedSecondTrial,
    hasClearedLastTrial: successor.hasClearedLastTrial,
    hasClearedFinalTrial: successor.hasClearedFinalTrial,
    firstTrialCleared: successor.firstTrialCleared,
    secondTrialCleared: successor.secondTrialCleared,
    lastTrialCleared: successor.lastTrialCleared,
    finalTrialCleared: successor.finalTrialCleared,
    skills: [...successor.skills],
    equipment: { ...successor.equipment },
    weaponMastery: successor.weaponMastery ? { ...successor.weaponMastery } : {},
    combatStyle: successor.combatStyle,
    targetCombatStyle: successor.targetCombatStyle,
    combatStyleProgress: successor.combatStyleProgress ? JSON.parse(JSON.stringify(successor.combatStyleProgress)) : {},
    unlockedCombatStyles: successor.unlockedCombatStyles ? [...successor.unlockedCombatStyles] : [],
    professions: successor.professions ? JSON.parse(JSON.stringify(successor.professions)) : character.professions,
    availableTitles: successor.availableTitles ? [...successor.availableTitles] : [],
    equippedTitleId: successor.equippedTitleId,
    socialNetwork: successor.socialNetwork ? JSON.parse(JSON.stringify(successor.socialNetwork)) : (character.socialNetwork ? [...character.socialNetwork, predecessorArchive] : [predecessorArchive]),
    companions: [],
    isDead: false,
    isImmortal: successor.isImmortal || false
  };

  // 4. [NEW] 유전적 특성 계승 (Stat Inheritance)
  const statsToInherit: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl'];
  statsToInherit.forEach(key => {
      const bonus = Math.floor(character.stats[key] * ratio);
      nextPlayer.stats[key] += bonus;
  });
  nextPlayer.stats.maxHp += Math.floor(character.stats.maxHp * ratio);
  nextPlayer.stats.maxMp += Math.floor(character.stats.maxMp * ratio);
  const { finalStats: inheritFinal } = calculateFinalStats(nextPlayer);
  nextPlayer.stats.hp = inheritFinal.maxHp;
  nextPlayer.stats.mp = inheritFinal.maxMp;

  // 5. [NEW] 비기 계승 (Skill Inheritance) - 계승자 클래스 티어 이하만 전수 가능 검증 추가
  const getTierRank = (tier: ClassTier | string | undefined | null): number => {
    if (!tier) return 0;
    switch (tier) {
      case ClassTier.NONE:
      case 'NONE':
      case '없음':
      case ClassTier.F:
      case 'F':
        return 0;
      case ClassTier.FIRST:
      case 'FIRST':
      case '퍼스트 클래스':
        return 1;
      case ClassTier.SECOND:
      case 'SECOND':
      case '세컨드 클래스':
        return 2;
      case ClassTier.LAST:
      case 'LAST':
      case '라스트 클래스':
        return 3;
      case ClassTier.FINAL:
      case 'FINAL':
      case '파이널 클래스':
        return 4;
      case ClassTier.BOND:
      case 'BOND':
      case '인연':
        return 5;
      default:
        return 0;
    }
  };

  if (inheritedSkill) {
      const isAllowed = inheritedSkill.tier === ClassTier.BOND || 
                        getTierRank(inheritedSkill.tier) <= getTierRank(successor.classTier);

      if (isAllowed) {
          // 중복 체크 후 추가
          if (!nextPlayer.skills.some(s => s.name === inheritedSkill.name)) {
              nextPlayer.skills.push({
                  ...inheritedSkill,
                  currentMastery: 0 // 숙련도는 초기화하여 새롭게 연마하게 함
              });
          }
      }
  }

  // 사망한 전대 가주를 기록에 남김
  if (!nextPlayer.memories) nextPlayer.memories = [];
  nextPlayer.memories.push(`[${character.currentDate}] 전대 가주 ${character.name}의 뒤를 이어 가문을 승계함. (유산 계승률: ${Math.floor(ratio * 100)}%)`);

  // 동료 목록 재구성 (승계자 제외 및 인간관계 재매핑)
  const remainingCompanions = (character.companions || []).filter(c => c.id !== successor.id);
  const remainingInactive = (character.inactiveCompanions || []).filter(c => c.id !== successor.id);

  const { updatedCompanions, updatedInactiveCompanions } = remapCompanionRelationships(
    remainingCompanions,
    remainingInactive,
    successor.id,
    character.name,
    successor.name,
    undefined,
    successor
  );

  nextPlayer.companions = updatedCompanions;
  nextPlayer.inactiveCompanions = updatedInactiveCompanions;

  // 사망한 전대 가주(플레이어)의 장착 장비 보관소/가방으로 이전
  const equippedItems: Item[] = [];
  if (character.equipment) {
    const slots: (keyof typeof character.equipment)[] = ['weapon', 'subWeapon', 'head', 'body', 'feet', 'hand', 'accessory'];
    slots.forEach(slot => {
      const item = character.equipment[slot];
      if (item) {
        equippedItems.push(item);
      }
    });
  }

  if (equippedItems.length > 0) {
    if (nextPlayer.base && Array.isArray(nextPlayer.base.storage)) {
      nextPlayer.base.storage.push(...equippedItems);
    } else {
      if (!nextPlayer.inventory) {
        nextPlayer.inventory = [];
      }
      nextPlayer.inventory.push(...equippedItems);
    }
  }

  return nextPlayer;
};
