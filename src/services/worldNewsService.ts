import { Character, WorldNewsItem, DiplomaticStatus, MilitaryRank } from '../types';
import { simulateMonthlyGeopoliticsAndEconomy } from './livingWorldEngine';

/**
 * 매월 1일 또는 한 달 시간 경과 시 대륙 전역의 정세, 던전, 암시장 소식을 취합하여 생성합니다.
 */
export function generateMonthlyWorldNews(
  character: Character,
  monthStr: string,
  extraLogs?: string[]
): WorldNewsItem[] {
  const newsList: WorldNewsItem[] = [];
  const existingMessages = new Set<string>();

  // 1. 인스턴트 던전 소식 (dungeon)
  if (character.instantDungeons && character.instantDungeons.length > 0) {
    character.instantDungeons.forEach((d, idx) => {
      const msg = `${d.description || `도시 외곽에서 발견된 ${d.name}의 은신처입니다.`} (권장 레벨: ${d.level || 500})`;
      if (!existingMessages.has(msg)) {
        existingMessages.add(msg);
        newsList.push({
          id: `news_dungeon_${monthStr}_${d.city || idx}_${idx}`,
          category: 'dungeon',
          title: `[던전 출현] ${d.nation || '미지의 영토'} ${d.city || ''} - ${d.name}`,
          message: msg,
          date: d.createdAt ? `${d.createdAt}-01` : `${monthStr}-01`,
          location: `${d.nation || ''} ${d.city || ''}`.trim() || undefined
        });
      }
    });
  }

  // 던전 총괄 안내 카드
  const dungeonSummaryMsg = `새로운 달을 맞아 세계 각지에서 강력한 마물들의 은신처와 인스턴트 던전이 관측되었습니다. 던전 탭에서 최신 던전 위치를 확인하십시오.`;
  if (!existingMessages.has(dungeonSummaryMsg)) {
    existingMessages.add(dungeonSummaryMsg);
    newsList.push({
      id: `news_dungeon_summary_${monthStr}`,
      category: 'dungeon',
      title: `대륙 전역 인스턴트 던전 활동 관측`,
      message: dungeonSummaryMsg,
      date: `${monthStr}-01`
    });
  }

  // 2. 어둠의 암시장 소식 (world - 특별상점)
  const blackMarketMsg = `매월 1일 어둠의 상인들이 대륙 은밀한 거점의 특별 상점에 새로운 희귀 비전서, 장비, 비약들을 입고했습니다. 각국 도시의 뒷골목을 탐색해보십시오.`;
  if (!existingMessages.has(blackMarketMsg)) {
    existingMessages.add(blackMarketMsg);
    newsList.push({
      id: `news_blackmarket_${monthStr}`,
      category: 'world',
      title: `[암시장 입고] 어둠의 상단 신규 물품 입고`,
      message: blackMarketMsg,
      date: `${monthStr}-01`
    });
  }

  // 3. 국가 외교 및 군사 정세 소식 (diplomacy / war)
  if (character.militaryData?.diplomacy) {
    Object.entries(character.militaryData.diplomacy).forEach(([nation, rel]: [string, any]) => {
      if (!rel) return;
      if (rel.status === DiplomaticStatus.WAR) {
        const warMsg = `${nation}과의 전면 전쟁이 지속되고 있습니다. 국경 전선에 전군 경계령이 유지 중입니다. (긴장도: ${rel.tension || 100})`;
        if (!existingMessages.has(warMsg)) {
          existingMessages.add(warMsg);
          newsList.push({
            id: `news_war_${monthStr}_${nation}`,
            category: 'war',
            title: `[전쟁 속보] ${nation} 전면전 지속`,
            message: warMsg,
            date: `${monthStr}-01`
          });
        }
      } else if (rel.status === DiplomaticStatus.HOSTILE) {
        const hostileMsg = `${nation}과의 외교적 긴장이 극에 달했습니다. 국경 지대에서 무력 충돌의 위험이 고조되고 있습니다. (긴장도: ${rel.tension || 80})`;
        if (!existingMessages.has(hostileMsg)) {
          existingMessages.add(hostileMsg);
          newsList.push({
            id: `news_hostile_${monthStr}_${nation}`,
            category: 'diplomacy',
            title: `[외교 긴장] ${nation} 국경 비상 경계`,
            message: hostileMsg,
            date: `${monthStr}-01`
          });
        }
      } else if (rel.status === DiplomaticStatus.ALLIANCE) {
        const allyMsg = `${nation}과의 상호 방위 조약 및 통상 우호 관계가 원활하게 유지되고 있습니다.`;
        if (!existingMessages.has(allyMsg)) {
          existingMessages.add(allyMsg);
          newsList.push({
            id: `news_ally_${monthStr}_${nation}`,
            category: 'diplomacy',
            title: `[동맹 우호] ${nation} 상호 방위 협력`,
            message: allyMsg,
            date: `${monthStr}-01`
          });
        }
      }
    });
  }

  // 4. 시스템 로그에서 발생한 주요 외교/정세 뉴스 추출 반영
  if (extraLogs && extraLogs.length > 0) {
    extraLogs.forEach((log, idx) => {
      if (/\[외교\]|\[선전포고\]|\[성전\]|\[군대\]|\[찬탈\]|\[정세\]|\[국가\]|\[외교 뉴스\]|\[국방 정보\]|\[전보\]/i.test(log)) {
        if (!existingMessages.has(log)) {
          existingMessages.add(log);
          const isWar = log.includes('전쟁') || log.includes('선전포고') || log.includes('성전');
          newsList.push({
            id: `news_log_${monthStr}_${idx}`,
            category: isWar ? 'war' : 'diplomacy',
            title: log.length > 25 ? log.substring(0, 22) + '...' : log,
            date: character.currentDate || `${monthStr}-01`,
            message: log
          });
        }
      }
    });
  }

  // 외교 항목이 없을 경우 기본 정세 브리핑 추가
  const hasDiplomacy = newsList.some(n => n.category === 'diplomacy' || n.category === 'war');
  if (!hasDiplomacy) {
    newsList.push({
      id: `news_general_${monthStr}`,
      category: 'diplomacy',
      title: `[세계 정세] ${monthStr} 대륙 정세 월간 보고`,
      message: `대륙 각국 간의 경제 무역과 치안 활동이 순조롭게 이어지고 있으며, 각국 영주들이 영지 방어와 치안 유지에 힘쓰고 있습니다.`,
      date: `${monthStr}-01`
    });
  }

  return newsList;
}

/**
 * 월 변경 여부를 검사하고, 월이 바뀌었을 경우 월간 뉴스를 1회 자동 생성하여 반환합니다.
 */
export function checkAndGenerateMonthlyWorldNews(
  character: Character,
  prevDate?: string,
  currentLogs?: string[]
): { updatedCharacter: Character; news: WorldNewsItem[] | null } {
  if (!character || !character.currentDate) {
    return { updatedCharacter: character, news: null };
  }

  const curMonth = character.currentDate.substring(0, 7); // 예: '2000-03'
  if (!curMonth) {
    return { updatedCharacter: character, news: null };
  }

  // 게임 시작 시점(2000-03-02)에 처음 시작할 때는 기준 월만 기록하고 모달을 띄우지 않음
  if (!character.lastWorldNewsMonth) {
    if (character.currentDate === '2000-03-02') {
      return {
        updatedCharacter: {
          ...character,
          lastWorldNewsMonth: curMonth
        },
        news: null
      };
    }
  }

  // 이미 이번 달에 뉴스를 확인한 경우 건너뜀
  if (character.lastWorldNewsMonth === curMonth) {
    return { updatedCharacter: character, news: null };
  }

  // 월이 변경됨: 30일 주기 세력 시뮬레이션 & 시장 경제 & 뉴스 생성
  const simulation = simulateMonthlyGeopoliticsAndEconomy(character, curMonth);
  const updatedMilitaryData = {
    ...(character.militaryData || { rank: MilitaryRank.PVT, contribution: 0 }),
    diplomacy: simulation.updatedDiplomacy
  };

  const characterWithSim: Character = {
    ...character,
    militaryData: updatedMilitaryData,
    economicState: simulation.economicState,
    lastWorldNewsMonth: curMonth
  };

  const baseNews = generateMonthlyWorldNews(characterWithSim, curMonth, currentLogs);
  
  // 시뮬레이션 뉴스를 최상단에 우선 배치하고 중복 제거
  const newsMap = new Map<string, WorldNewsItem>();
  simulation.generatedNews.forEach(n => newsMap.set(n.id, n));
  baseNews.forEach(n => {
    if (!newsMap.has(n.id)) {
      newsMap.set(n.id, n);
    }
  });

  const finalNews = Array.from(newsMap.values());

  return { updatedCharacter: characterWithSim, news: finalNews };
}
