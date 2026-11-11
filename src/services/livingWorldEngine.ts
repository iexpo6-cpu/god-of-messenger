import { Character, WorldEconomicState, WorldNewsItem, NationRelation, DiplomaticStatus, MilitaryRank, Item } from '../types';
import { NATION_LIST, NATION_BLOCS, NationBloc, generateInitialDiplomacy } from '../nationalDiplomacy';
import { WORLD_GEOGRAPHY } from '../constants';

// 대륙 주요 격전 세력 쌍 (자율 전쟁 후보군)
interface WarFactionPair {
  attacker: string;
  defender: string;
  frontlineName: string;
  targetCities: string[];
}

const FACTION_WAR_PAIRS: WarFactionPair[] = [
  {
    attacker: '임페리얼 제국',
    defender: '미르탈 숲연합',
    frontlineName: '동부 엘프 원시림 방어선',
    targetCities: ['실바엔', '노르실', '미르탈']
  },
  {
    attacker: '임페리얼 제국',
    defender: '대한민국',
    frontlineName: '한반도 비무장 전술 회랑',
    targetCities: ['개성', '인천', '서울']
  },
  {
    attacker: '네크로디움 제국',
    defender: '레오니스 투기국',
    frontlineName: '황혼의 협곡 회랑',
    targetCities: ['하울가르', '그라울', '레오폴리스']
  },
  {
    attacker: '레오니스 투기국',
    defender: '임페리얼 제국',
    frontlineName: '검은 평원 전초 기지',
    targetCities: ['눌바리온', '딜리리움', '임페리얼']
  },
  {
    attacker: '러시아',
    defender: '우크라이나',
    frontlineName: '동유럽 국경 회랑',
    targetCities: ['키이우', '오데사']
  },
  {
    attacker: '이란',
    defender: '이스라엘',
    frontlineName: '중동 사막 완충 지대',
    targetCities: ['예루살렘', '텔아비브']
  }
];

export interface MonthlySimulationResult {
  updatedDiplomacy: Record<string, NationRelation>;
  economicState: WorldEconomicState;
  generatedNews: WorldNewsItem[];
  systemLogs: string[];
}

/**
 * 30일(매월 1일) 주기 대륙 정세 자율 시뮬레이션 엔진
 * - 국가 간 군사력 기반 자율 공방전 시뮬레이션
 * - 세계 지도 전선 점유율(occupation) 및 긴장도 실시간 변동
 * - 전쟁 물자 품귀(2.5배 매입) & 곡창지대/식량난(물가 2배 폭등) 경제 상태 산출
 * - 대륙 신문(WorldNewsModal)과 유기적으로 결합된 속보 발행
 */
export function simulateMonthlyGeopoliticsAndEconomy(
  character: Character,
  monthStr: string
): MonthlySimulationResult {
  const myNation = character.nation || '대한민국';
  const diplomacy: Record<string, NationRelation> = {
    ...(character.militaryData?.diplomacy || generateInitialDiplomacy(myNation))
  };

  const systemLogs: string[] = [];
  const generatedNews: WorldNewsItem[] = [];

  // 1. 이번 달 자율 공방전 세력 2~3개 쌍 무작위 선정
  const shuffledPairs = [...FACTION_WAR_PAIRS].sort(() => 0.5 - Math.random());
  const activeClashes = shuffledPairs.slice(0, 2 + Math.floor(Math.random() * 2)); // 2~3개 충돌

  const activeWarNationsSet = new Set<string>();
  const famineNationsSet = new Set<string>();
  const blockadedCitiesSet = new Set<string>();

  // 기본적으로 플레이어와 전쟁 중인 국가들도 군수 물자 품귀국에 포함
  Object.entries(diplomacy).forEach(([nation, rel]) => {
    if (rel?.status === DiplomaticStatus.WAR) {
      activeWarNationsSet.add(nation);
    }
  });

  // 2. 각 충돌 쌍 시뮬레이션 및 점유율(occupation) 변동 연산
  activeClashes.forEach((clash, idx) => {
    const { attacker, defender, frontlineName, targetCities } = clash;
    activeWarNationsSet.add(attacker);
    activeWarNationsSet.add(defender);

    // 공격 성공 여부 (주사위 롤)
    const attackRoll = Math.floor(Math.random() * 100);
    const isAttackerAdvancing = attackRoll >= 45; // 55% 공격 성공률
    const occupationDelta = isAttackerAdvancing
      ? +(5 + Math.floor(Math.random() * 10))  // +5% ~ +14% 전진
      : -(4 + Math.floor(Math.random() * 8));  // -4% ~ -11% 후퇴

    const targetedCity = targetCities[Math.floor(Math.random() * targetCities.length)] || targetCities[0];

    // 플레이어 외교 데이터의 점유율 변동 반영 (플레이어 국가와 관련되거나, 대상 국가가 diplomacy에 등록된 경우)
    if (diplomacy[defender]) {
      const currentOcc = diplomacy[defender].occupation || 0;
      // 플레이어가 수비국 편이면 점유율 변화, 공격국 편이면 반대 변화
      const isPlayerAttackerSide = diplomacy[attacker]?.status === DiplomaticStatus.ALLIANCE || myNation === attacker;
      const isPlayerDefenderSide = diplomacy[defender]?.status === DiplomaticStatus.ALLIANCE || myNation === defender;

      let appliedDelta = occupationDelta;
      if (isPlayerDefenderSide) {
        appliedDelta = -occupationDelta; // 적이 밀고 들어오면 플레이어 기준 점유율 감소
      }

      const nextOcc = Math.max(-100, Math.min(100, currentOcc + appliedDelta));
      diplomacy[defender].occupation = nextOcc;
      diplomacy[defender].tension = Math.min(100, (diplomacy[defender].tension || 50) + 10);
      diplomacy[defender].lastEvent = `${attacker}의 대규모 공세로 전선 점유율 ${appliedDelta > 0 ? `+${appliedDelta}` : appliedDelta}% 변동`;
    }

    if (diplomacy[attacker]) {
      diplomacy[attacker].tension = Math.min(100, (diplomacy[attacker].tension || 50) + 5);
    }

    // 전쟁 피해로 인한 기근 및 무역로 봉쇄 결정
    if (isAttackerAdvancing) {
      // 수비국 영지가 유린당함 -> 수비국 식량난 발생
      famineNationsSet.add(defender);
      blockadedCitiesSet.add(targetedCity);

      // 전쟁 속보 기사 생성
      generatedNews.push({
        id: `news_war_advance_${monthStr}_${idx}`,
        category: 'war',
        title: `[전쟁 속보] ${attacker} 제2군단, ${defender} ${frontlineName} 야습 돌파!`,
        message: `${attacker}의 정예 기동 부대가 ${defender}의 ${frontlineName}을 전격 돌파하며 전선 점유율이 급변했습니다.\n외곽 거점 [${targetedCity}] 일대가 함락 위기에 놓여 양측 군사 긴장도가 최고조에 달했습니다.`,
        date: `${monthStr}-01`,
        location: `${defender} ${targetedCity}`
      });

      systemLogs.push(`[대륙 전황] ${attacker}이(가) ${defender}의 ${frontlineName}을 돌파하여 점유율이 변동되었습니다.`);
    } else {
      // 수비군이 격퇴함
      generatedNews.push({
        id: `news_war_repel_${monthStr}_${idx}`,
        category: 'war',
        title: `[전선 정세] ${defender} 수비대, ${attacker}의 ${frontlineName} 맹공 격퇴`,
        message: `${defender} 국경 요새 수비대가 ${attacker}의 기습 공세를 강력한 포격전 끝에 밀어냈습니다.\n전선은 일진일퇴의 교착 상태에 돌입하였으며, 양국 모두 심각한 탄약 및 물자 소모에 직면했습니다.`,
        date: `${monthStr}-01`,
        location: `${defender} 국경`
      });

      systemLogs.push(`[대륙 전황] ${defender}이(가) ${attacker}의 침공을 격퇴하고 전선을 수호했습니다.`);
    }
  });

  // 3. 특수 외교 사건: 수인 연합 식량 부족 및 무역로 봉쇄 기사 (확정 혹은 50% 확률)
  const beastNation = '레오니스 투기국';
  famineNationsSet.add(beastNation);
  blockadedCitiesSet.add('하울가르');

  generatedNews.push({
    id: `news_blockade_${monthStr}`,
    category: 'diplomacy',
    title: `[외교 속보] 수인 연합, 식량 부족을 견디지 못하고 남부 국경 무역로 전면 봉쇄!`,
    message: `극심한 식량 부족을 겪고 있는 수인 연합(레오니스)이 생존권 보장을 요구하며 남부 국경 관문 [하울가르] 무역로를 전면 차단했습니다.\n관련 통행이 엄격히 통제되며, 군수물자 밀수 및 비상 밀거래만 암암리에 허용되고 있습니다.`,
    date: `${monthStr}-01`,
    location: `${beastNation} 하울가르`
  });

  // 4. 경제 특보 뉴스 생성 (살아있는 시장 경제)
  const activeWarNationsList = Array.from(activeWarNationsSet);
  const famineNationsList = Array.from(famineNationsSet);
  const blockadedCitiesList = Array.from(blockadedCitiesSet);

  const warNationsStr = activeWarNationsList.slice(0, 3).join(', ');
  const famineNationsStr = famineNationsList.slice(0, 2).join(', ');

  // 전쟁 물자 품귀 특보 (철광석, 붕대, 회복 물약 2.5배 매입)
  if (activeWarNationsList.length > 0) {
    generatedNews.push({
      id: `news_economy_war_supplies_${monthStr}`,
      category: 'economy',
      title: `[시장 특보] 전쟁 격화로 ${warNationsStr} 내 철광석·붕대·회복 물약 2.5배 긴급 최고가 매입!`,
      message: `전선 장기화로 인해 [${warNationsStr}] 군 사령부와 대상단이 대대적인 군비 확충에 나섰습니다.\n대장간과 연금술 공방에서 제작된 철광석, 붕대, 치료제 및 회복 물약을 평소의 2.5배(250%) 가격에 전량 매입합니다. (상인 플레이 대특수)`,
      date: `${monthStr}-01`,
      location: warNationsStr
    });
  }

  // 식량난과 물가 폭등 특보 (빵, 고기 등 식량 구매가 2배 폭등, 식량 매입가 2배)
  if (famineNationsList.length > 0) {
    generatedNews.push({
      id: `news_economy_famine_${monthStr}`,
      category: 'economy',
      title: `[물가 비상] 곡창 지대 교전 및 기근으로 [${famineNationsStr}] 식량·육류 가격 2배 폭등!`,
      message: `전화(戰火)가 농경지를 휩쓸며 [${famineNationsStr}] 내 모든 식당과 잡화점의 빵, 고기 등 식량 구매가가 일시적으로 2배 상승합니다.\n보유 중인 잉여 식량을 해당 지역 시장에 처분 시 2배의 프리미엄을 인정받을 수 있습니다.`,
      date: `${monthStr}-01`,
      location: famineNationsStr
    });
  }

  const economicState: WorldEconomicState = {
    activeWarNations: activeWarNationsList,
    famineNations: famineNationsList,
    blockadedCities: blockadedCitiesList,
    warCasualtiesReport: `${warNationsStr} 일대 전선 교전으로 군수품 수요 250% 폭증 및 ${famineNationsStr} 식량 수급 비상`,
    lastSimulatedMonth: monthStr
  };

  return {
    updatedDiplomacy: diplomacy,
    economicState,
    generatedNews,
    systemLogs
  };
}

/**
 * 군수 물자(철광석, 붕대, 회복 물약 등) 여부 판정
 */
export function isWarSuppliesItem(item: Item): { isWarSupply: boolean; isCoreSupply: boolean; categoryName?: string } {
  if (!item || !item.name) return { isWarSupply: false, isCoreSupply: false };
  const name = item.name.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const type = (item.type || '').toLowerCase();

  // 1. 핵심 군수 물자: 철광석, 광석류, 붕대, 치료제, 회복/마나 물약 (2.5배 매입)
  const isOre = /철광석|철괴|강철|은광석|금광석|미스릴|마나 크리스탈|마나크리스탈|광석|주괴|흑철|마정석|룬스톤|원석|iron|ore/i.test(name) || /광석|주괴|철광|원석/i.test(desc);
  const isMedical = /붕대|약초|지혈대|치료제|구급|연고|herb|bandage/i.test(name) || /지혈|붕대|상처 치료/i.test(desc);
  const isPotion = /회복 물약|체력 물약|생명력 물약|마나 물약|포션|영약|비약|potion|elixir/i.test(name) || (type === 'consumable' && /회복|체력|마나|치유/i.test(desc));

  if (isOre) return { isWarSupply: true, isCoreSupply: true, categoryName: '철광석/군수 광석' };
  if (isMedical) return { isWarSupply: true, isCoreSupply: true, categoryName: '응급 치료제/붕대' };
  if (isPotion) return { isWarSupply: true, isCoreSupply: true, categoryName: '회복/보급 물약' };

  // 2. 일반 군수 물자: 무기 및 방어구 장비류 (1.5배 매입)
  const isEquipment = ['weapon', 'subweapon', 'head', 'body', 'feet', 'hand', 'shield'].includes(type) || 
                      item.type === 'Weapon' || item.type === 'SubWeapon' || ['Head', 'Body', 'Feet', 'Hand'].includes(item.type);

  if (isEquipment) {
    return { isWarSupply: true, isCoreSupply: false, categoryName: '무기/방어구 군수품' };
  }

  return { isWarSupply: false, isCoreSupply: false };
}

/**
 * 식량/음식 아이템 여부 판정
 */
export function isLivingFoodItem(item: Item): boolean {
  if (!item || !item.name) return false;
  const name = item.name.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  return /빵|고기|식량|수프|스튜|스테이크|음식|요리|치즈|과일|열매|포도주|주스|식료품|육포|건포도|파이|구이|생선|곡물|밀가루/i.test(name) ||
         /포만감|식량|허기|음식/i.test(desc);
}

/**
 * 실시간 시장 경제(전쟁 특수 2.5배 매입, 식량난 2배 매입/구매) 반영 가격 계산
 */
export function getLivingEconomyPricing(
  item: Item,
  currentNation: string | undefined,
  economicState: WorldEconomicState | undefined,
  mode: 'buy' | 'sell',
  baseCalculatedPrice: number
): {
  finalPrice: number;
  multiplier: number;
  badgeText?: string;
  badgeStyle?: string;
  reason?: string;
} {
  if (!item || !currentNation || !economicState) {
    return { finalPrice: baseCalculatedPrice, multiplier: 1.0 };
  }

  const isWarNation = economicState.activeWarNations?.includes(currentNation);
  const isFamineNation = economicState.famineNations?.includes(currentNation);

  if (mode === 'sell') {
    // 1. 전쟁 국가의 군수 물자 매입 (철광석, 붕대, 회복 물약 2.5배 / 장비 1.5배)
    if (isWarNation) {
      const warSupply = isWarSuppliesItem(item);
      if (warSupply.isWarSupply) {
        if (warSupply.isCoreSupply) {
          const mult = 2.5;
          return {
            finalPrice: Math.floor(baseCalculatedPrice * mult),
            multiplier: mult,
            badgeText: '전쟁 특수 2.5배 매입',
            badgeStyle: 'text-amber-300 bg-amber-950/80 border-amber-500/60 shadow-amber-900/30',
            reason: `[전쟁 국가 군수품 긴급 매입] ${warSupply.categoryName} 수요 폭증으로 2.5배 프리미엄`
          };
        } else {
          const mult = 1.5;
          return {
            finalPrice: Math.floor(baseCalculatedPrice * mult),
            multiplier: mult,
            badgeText: '군비 확장 1.5배 매입',
            badgeStyle: 'text-orange-300 bg-orange-950/70 border-orange-500/50',
            reason: `[전쟁 군비 확장] 전선 투입을 위한 장비 1.5배 매입`
          };
        }
      }
    }

    // 2. 식량난 국가의 식량 매입 (식량 아이템 2.0배)
    if (isFamineNation && isLivingFoodItem(item)) {
      const mult = 2.0;
      return {
        finalPrice: Math.floor(baseCalculatedPrice * mult),
        multiplier: mult,
        badgeText: '식량난 2배 매입',
        badgeStyle: 'text-rose-300 bg-rose-950/80 border-rose-500/50 shadow-rose-900/30',
        reason: `[식량난 긴급 구호] 기근 지역 식량 부족으로 2배 고가 매입`
      };
    }
  }

  if (mode === 'buy') {
    // 식량난 국가에서 식량 구매 시 가격 2.0배 폭등
    if (isFamineNation && isLivingFoodItem(item)) {
      const mult = 2.0;
      return {
        finalPrice: Math.floor(baseCalculatedPrice * mult),
        multiplier: mult,
        badgeText: '식량난 200% 폭등',
        badgeStyle: 'text-rose-400 bg-rose-950/80 border-rose-500/60',
        reason: `[기근/곡창지대 피해] 식량 공급 부족으로 판매 가격 2배 폭등`
      };
    }
  }

  return { finalPrice: baseCalculatedPrice, multiplier: 1.0 };
}
