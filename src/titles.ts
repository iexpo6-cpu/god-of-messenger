
import { MILITARY_RANK_ORDER } from './constants';
import { Character, Companion, ItemRarity, Title, JobType, MercenaryRank, MilitaryRank, ClassTier, ClubType } from './types';

export const TITLES: Record<string, Title> = {
  // --- [1] 기본 및 학교 관련 (School) ---
  'T_STUDENT': {
    id: 'T_STUDENT',
    name: '평범한 학생',
    description: '배움의 길을 걷는 자에게 주어지는 기본 칭호입니다.',
    rarity: ItemRarity.NORMAL,
    stats: { maxHp: 20 },
    requirementText: '직업이 학생일 때 획득'
  },
  'T_TOP_RANKER': {
    id: 'T_TOP_RANKER',
    name: '전교 1등',
    description: '학문의 정점에 도달하여 모두의 우러름을 받는 수재입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { int: 30, wis: 30, ctrl: 20 },
    requirementText: '학교 석차 1위 달성'
  },
  'T_TOURNAMENT_CONQUEROR': {
    id: 'T_TOURNAMENT_CONQUEROR',
    name: '투쟁의 천재',
    description: '교내외 모든 토너먼트를 휩쓴 불패의 학생입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 25, agi: 25, ctrl: 15 },
    requirementText: '토너먼트 우승 경험 보유'
  },
  'T_LIBRARY_HERMIT': {
    id: 'T_LIBRARY_HERMIT',
    name: '도서관의 은둔자',
    description: '금서와 비기를 탐하며 세상의 지식을 섭렵한 자입니다.',
    rarity: ItemRarity.RARE,
    stats: { int: 40, wis: 20 },
    requirementText: '지력(INT) 1500 이상 달성'
  },
  'T_STUDENT_COUNCIL': {
    id: 'T_STUDENT_COUNCIL',
    name: '학생회의 권위',
    description: '학교의 질서를 유지하고 학생들을 이끄는 리더의 기운입니다.',
    rarity: ItemRarity.RARE,
    stats: { wis: 15, ctrl: 15, str: 10 },
    requirementText: '학생회 동아리 가입'
  },
  'T_DISCIPLINARY_LEAD': {
    id: 'T_DISCIPLINARY_LEAD',
    name: '공포의 선도부장',
    description: '불량 학생들의 저승사자, 규율 그 자체입니다.',
    rarity: ItemRarity.RARE,
    stats: { str: 20, agi: 10, ctrl: 10 },
    requirementText: '선도부 동아리 가입'
  },

  // --- [2] 군대 관련 (Military) ---
   'T_BYUNGSA': {
    id: 'T_BYUNGSA',
    name: '일반 병사',
    description: '갓 입대한 초보 군인입니다.',
    rarity: ItemRarity.NORMAL,
    stats: { maxHp: 50 },
    requirementText: '군인 계급 이등병 이상 달성'
  },
   'T_BUSAGWAN': {
    id: 'T_BUSAGWAN',
    name: '부사관',
    description: '군대 부사관 계급에 오른 자입니다.',
    rarity: ItemRarity.MAGIC,
    stats: { def: 10, maxHp: 100 },
    requirementText: '군인 계급 하사(SSG) 이상 달성'
  },
  'T_IRON_VETERAN': {
    id: 'T_IRON_VETERAN',
    name: '베테랑 군인',
    description: '수많은 전장을 누비며 살아남은 끈질긴 생명력의 소유자입니다.',
    rarity: ItemRarity.RARE,
    stats: { def: 30, maxHp: 200 },
    requirementText: '군인 계급 상사(MSG) 이상 달성'
  },
  'T_JANGYO': {
    id: 'T_JANGYO',
    name: '장교',
    description: '소위의 계급으로 장교에 이른 자입니다.',
    rarity: ItemRarity.RARE,
    stats: { wis: 40, maxHp: 300 },
    requirementText: '군인 계급 소위(SLT) 이상 달성'
  },
  'T_WAR_HERO': {
    id: 'T_WAR_HERO',
    name: '전쟁의 영웅',
    description: '조국을 수호하고 전선에서 전설을 써 내려간 위대한 지휘관입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 40, def: 40, wis: 20 },
    requirementText: '군인 계급 대령(COL) 이상 달성'
  },
  'T_SUPREME_COMMANDER': {
    id: 'T_SUPREME_COMMANDER',
    name: '전군 총괄대장',
    description: '한 국가의 군사권을 손에 쥔, 만인을 호령하는 자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 150, def: 100, wis: 100, ctrl: 150 },
    statMultipliers: { str: 0.05, def: 0.05 },
    requirementText: '군인 계급 대장(GEN) 달성'
  },
  'T_FRONTLINE_DEVIL': {
    id: 'T_FRONTLINE_DEVIL',
    name: '전선의 사신',
    description: '그가 나타나는 곳마다 적들의 시체가 산을 이룹니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 80, agi: 80 },
    requirementText: '공훈(Merit) 10,000 이상 달성'
  },
  'T_GUARDIAN_OF_NATION': {
    id: 'T_GUARDIAN_OF_NATION',
    name: '국가 방위의 핵',
    description: '단 한 명의 병사도 잃지 않겠다는 철통같은 방어의 상징입니다.',
    rarity: ItemRarity.EPIC,
    stats: { def: 100, maxHp: 1000 },
    requirementText: '전쟁 방어전 10회 성공'
  },

  // --- [3] 용병 관련 (Mercenary) ---
   'T_MERC_BEGINNER': {
    id: 'T_MERC_BEGINNER',
    name: '견습 용병',
    description: '돈을 벌기 위해 무기를 든 초보자입니다.',
    rarity: ItemRarity.NORMAL,
    stats: { str: 5, agi: 10 },
    requirementText: '용병 등급 F급 이상 달성'
  },
  'T_MERC_ELITE': {
    id: 'T_MERC_ELITE',
    name: '일류 용병',
    description: '돈과 명예를 모두 거머쥔, 길드에서 가장 신뢰받는 용병입니다.',
    rarity: ItemRarity.RARE,
    stats: { str: 30, agi: 30 },
    requirementText: '용병 등급 B급 이상 달성'
  },
   'T_S_LEGEND': {
    id: 'T_S_LEGEND',
    name: '전설의 용병',
    description: '역사상 가장 위대한 용병 중 한 명으로 기록될 존재입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 100, int: 50, agi: 150, def: 50 },
    statMultipliers: { agi: 0.05 },
    requirementText: '용병 등급 S급 달성'
  },
  'T_SSS_LEGEND': {
    id: 'T_SSS_LEGEND',
    name: '사상 초유 전설의 용병',
    description: '신계와 마계조차 주목하는 불세출의 전사입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 300, int: 300, agi: 300, def: 300 },
    statMultipliers: { str: 0.1, agi: 0.1 },
    requirementText: '용병 등급 SSS급 달성'
  },
  'T_ARENA_CHAMP': {
    id: 'T_ARENA_CHAMP',
    name: '아레나의 패자',
    description: '그랜드 아레나의 모든 적을 꺾고 정점에 선 최강의 전사입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 50, agi: 50, ctrl: 30 },
    requirementText: '그랜드 아레나 우승'
  },
  'T_BOUNTY_STALKER': {
    id: 'T_BOUNTY_STALKER',
    name: '범죄자의 재앙',
    description: '그림자 속에 숨은 자들을 끝까지 추적하여 단죄하는 사냥꾼입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 40, ctrl: 40, wis: 20 },
    requirementText: '현상수배범 5명 이상 처단'
  },
  'T_MERCENARY_KING': {
    id: 'T_MERCENARY_KING',
    name: '용병들의 왕',
    description: '자신만의 거대 용병단을 이끄는 통솔자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { ctrl: 100, str: 50, wis: 50 },
    requirementText: '용병단 창설 및 단원 10명 이상 확보'
  },

  // --- [4] 신성 및 신계 관련 (Divine) ---
  'T_DIVINE_MESSENGER': {
    id: 'T_DIVINE_MESSENGER',
    name: '신의 사자',
    description: '신의 뜻을 지상에 전하고 성역을 수호하는 신성한 대행자입니다.',
    rarity: ItemRarity.MYTHTIC,
    stats: { str: 2500, int: 2500, wis: 5000, ctrl: 3000 },
    statMultipliers: { str: 0.2, int: 0.2, wis: 0.2, ctrl: 0.2 },
    requirementText: '신의 사자 직업 획득'
  },
  'T_GOD_SLAYER': {
    id: 'T_GOD_SLAYER',
    name: '신을 죽인 자',
    description: '하늘의 질서를 무너뜨리고 스스로 인과를 끊어낸 금기적 존재입니다.',
    rarity: ItemRarity.MYTHTIC,
    stats: { str: 5000, int: 5000, wis: 5000, def: 5000, agi: 2500, ctrl: 5000 },
    statMultipliers: { str: 0.5, int: 0.5, def: 0.5, agi: 0.5 },
    requirementText: '절대신 엘라 처단 성공'
  },
  'T_MAJESTY_KING': {
    id: 'T_MAJESTY_KING',
    name: '경외받는 성주',
    description: '그의 위엄 앞에 모든 불경한 자들이 고개를 숙입니다.',
    rarity: ItemRarity.EPIC,
    stats: { ctrl: 2000, def: 5000 },
    requirementText: '성전 위엄도 5,000 이상 달성'
  },
  'T_FAITH_MASTER': {
    id: 'T_FAITH_MASTER',
    name: '신앙의 화신',
    description: '온 세상의 믿음을 한 몸에 모으는 성자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { int: 8000, wis: 1020 },
    requirementText: '보유 신앙심 100,000 이상'
  },
  'T_HOLY_BENEFACTOR': {
    id: 'T_HOLY_BENEFACTOR',
    name: '국가의 수호신성',
    description: '성스러운 비호로 멸망해가는 국가를 구원한 사자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 1000, ctrl: 1000, maxHp: 50000 },
    requirementText: '5개 이상의 국가를 비호 상태로 만듦'
  },

  // --- [5] 마계 관련 (Abyssal) ---
  'T_ABYSS_GENERAL': {
    id: 'T_ABYSS_GENERAL',
    name: '심연의 제너럴',
    description: '마계의 질서를 집행하는 11명의 지배자 중 한 명입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 2000, int: 2000, def: 2000, ctrl: 2000 },
    statMultipliers: { str: 0.1, int: 0.1, def: 0.1 },
    requirementText: '마계 제너럴 직업 획득'
  },
  'T_DEMON_GOD': {
    id: 'T_DEMON_GOD',
    name: '마계의 신 (Imperial)',
    description: '모든 마물의 정점. 그가 걷는 길에 오직 파멸과 타락만이 남습니다.',
    rarity: ItemRarity.MYTHTIC,
    stats: { str: 10000, int: 10000, maxHp: 100000 },
    statMultipliers: { str: 0.4, int: 0.4, maxHp: 0.4 },
    requirementText: '마신 직업 획득'
  },
  'T_FEAR_LORD': {
    id: 'T_FEAR_LORD',
    name: '공포의 군주',
    description: '그의 이름을 듣는 것만으로도 영혼이 얼어붙습니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { ctrl: 150, str: 50 },
    requirementText: '지배지 공포도 1,000 달성'
  },
  'T_ABYSS_CRAWLER': {
    id: 'T_ABYSS_CRAWLER',
    name: '심연의 포식자',
    description: '마계의 밑바닥에서부터 모든 것을 먹어치우며 올라온 괴물입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 100, hp: 5000 },
    requirementText: '마계 던전 50층 이상 도달'
  },

  // --- [6] 사회 및 가문 관련 (Social/Heritage) ---
  'T_FAMILY_HEAD': {
    id: 'T_FAMILY_HEAD',
    name: '가문의 가주',
    description: '대물림되는 혈통과 유산을 책임지는 가문의 수장입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 20, int: 20, wis: 20, def: 20, agi: 20, ctrl: 20 },
    requirementText: '배우자와 성인 자녀 1명 이상 보유'
  },
  'T_GOLDEN_HAND': {
    id: 'T_GOLDEN_HAND',
    name: '황금의 손',
    description: '만지는 모든 것을 금으로 바꾸는 전설적인 자산가입니다.',
    rarity: ItemRarity.RARE,
    stats: { wis: 30 },
    requirementText: '보유 골드 5,000,000 G 돌파'
  },
  'T_OUTLAW': {
    id: 'T_OUTLAW',
    name: '대륙의 무법자',
    description: '법의 테두리를 벗어나 자신만의 정의를 휘두르는 위험인물입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 50, str: 30 },
    requirementText: '악명도(Infamy) 800 이상 달성'
  },
  'T_BLACK_ALLEY_KING': {
    id: 'T_BLACK_ALLEY_KING',
    name: '뒷골목의 제왕',
    description: '어두운 세계의 모든 정보를 쥐고 흔드는 첩보의 대가입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { ctrl: 60, agi: 40, wis: 40 },
    requirementText: '뒷골목 첩보 활동 20회 이상'
  },
  'T_MASTER_SMITH': {
    id: 'T_MASTER_SMITH',
    name: '신의 손길을 지닌 장인',
    description: '그가 벼려낸 장비는 그 자체로 신성을 뿜어냅니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 40, ctrl: 40 },
    requirementText: '대장장이 등급 명공 이상 달성'
  },

  // --- [7] 전투 및 업적 관련 (Achievement) ---
  'T_FINAL_EVOLVED': {
    id: 'T_FINAL_EVOLVED',
    name: '파이널 클래스 해방자',
    description: '인간의 한계를 뛰어넘어 신의 권능에 도달한 자입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 300, agi: 300, def: 300, ctrl: 300, int: 300, wis: 300 },
    statMultipliers: { str: 0.1, agi: 0.1, def: 0.1, int: 0.1, wis: 0.1, ctrl: 0.1 },
    requirementText: '파이널 클래스(Final Class) 도달'
  },
  'T_MONSTER_SLAYER': {
    id: 'T_MONSTER_SLAYER',
    name: '몬스터 도살자',
    description: '수천 마리의 마물을 베어 넘긴 공포의 대상입니다.',
    rarity: ItemRarity.RARE,
    stats: { str: 50, agi: 30 },
    requirementText: '누적 몬스터 처치 수 1,000마리 돌파'
  },
  'T_DRAGON_HUNTER': {
    id: 'T_DRAGON_HUNTER',
    name: '드래곤 헌터',
    description: '전설 속의 용을 처단한 용맹한 전사입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 30, def: 30 },
    requirementText: '드래곤 계열 보스 처치'
  },
  'T_COLLECTOR': {
    id: 'T_COLLECTOR',
    name: '수집의 광기',
    description: '세상의 모든 진기한 물건을 모으는 수집가입니다.',
    rarity: ItemRarity.RARE,
    stats: { wis: 30, ctrl: 20 },
    requirementText: '창고 및 가방 아이템 보유 수 300개 돌파'
  },
  'T_WORLD_TRAVELER': {
    id: 'T_WORLD_TRAVELER',
    name: '세계를 누비는 방랑자',
    description: '모든 대륙의 흙을 밟아본 노련한 여행가입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 50, wis: 50 },
    requirementText: '10개 이상의 다른 국가 방문'
  },
  'T_BOND_MASTER': {
    id: 'T_BOND_MASTER',
    name: '인연의 중심',
    description: '수많은 인연들이 당신의 곁으로 모여듭니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { ctrl: 30, wis: 50 },
    requirementText: '관계망(Social Network) 등록 인원 50명 돌파'
  },
  'T_CHARISMATIC_LEADER': {
    id: 'T_CHARISMATIC_LEADER',
    name: '카리스마적 영웅',
    description: '당신의 눈빛 하나에 대원들은 목숨을 바칠 준비가 되어 있습니다.',
    rarity: ItemRarity.EPIC,
    stats: { ctrl: 50, str: 50 },
    requirementText: '5명 이상의 동료 충성도 100 달성'
  },
  'T_LUCKY_STAR': {
    id: 'T_LUCKY_STAR',
    name: '하늘이 돕는 자',
    description: '위기의 순간마다 믿을 수 없는 행운이 뒤따릅니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { ctrl: 50, agi: 50 },
    requirementText: '강화 대성공 3회 이상 경험'
   },

  // --- [신규 대폭 추가: 전투 및 마스터리 계열] ---
  'T_BLADE_SAINT': {
    id: 'T_BLADE_SAINT',
    name: '검의 성자 (Blade Saint)',
    description: '모든 검의 이치를 깨달아 인간의 경지를 벗어난 검사입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 100, agi: 100, ctrl: 50 },
    requirementText: '검(Sword) 숙련도 100 달성'
  },
  'T_SPEARMAN': {
    id: 'T_SPEARMAN',
    name: '스피어 마스터',
    description: '모든 창의 이치를 깨달아 인간의 경지를 벗어난 창술사입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 100, agi: 100, ctrl: 50 },
    requirementText: '창 숙련도 100 달성'
  },'T_AXEMAN': {
    id: 'T_AXEMAN',
    name: '액스 마스터',
    description: '모든 도끼의 이치를 깨달아 인간의 경지를 벗어난 도끼 장인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 200, ctrl: 50 },
    requirementText: '도끼 숙련도 100 달성'
  },
  'T_BLUNTMAN': {
    id: 'T_BLUNTMAN',
    name: '둔기 마스터',
    description: '모든 둔기의 이치를 깨달아 인간의 경지를 벗어난 둔기 장인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 200, ctrl: 50 },
    requirementText: '둔기 숙련도 100 달성'
  },
  'T_GOD_SPEED_SNIPER': {
    id: 'T_GOD_SPEED_SNIPER',
    name: '신속의 저격수',
    description: '눈에 보이지 않는 속도로 적의 심장을 꿰뚫는 원거리의 지배자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { agi: 150, wis: 50 },
    requirementText: '활(Bow) 또는 총기(Firearm) 숙련도 100 달성'
  },
  'T_NINJA': {
    id: 'T_NINJA',
    name: '최고급 닌자',
    description: '모든 투척무기의 이치를 깨달아 인간의 경지를 벗어난 닌자급의 투척무기 장인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { agi: 200, ctrl: 50 },
    requirementText: '도끼 숙련도 100 달성'
  },
   'T_KNUCKLER': {
    id: 'T_KNUCKLER',
    name: '너클 마스터',
    description: '모든 너클의 이치를 깨달아 인간의 경지를 벗어난 닌자급의 너클무기 장인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { agi: 200, str: 50 },
    requirementText: '너클 숙련도 100 달성'
  },
  'T_ARCANE_LICH': {
    id: 'T_ARCANE_LICH',
    name: '비전의 마도 군주',
    description: '금지된 마법의 모든 지식을 습득하여 영혼까지 지배하는 마법사입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { int: 150, wis: 100, maxMp: 500 },
    requirementText: '지팡이 또는 마법 무기(Staff) 숙련도 100 달성'
  },
  'T_UNBREAKABLE_FORTRESS': {
    id: 'T_UNBREAKABLE_FORTRESS',
    name: '무너지지 않는 성벽',
    description: '그가 방패를 들면 그 어떤 신성도, 마기도 뚫지 못합니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { def: 200, maxHp: 1000 },
    requirementText: '방패(Shield) 숙련도 100 달성'
  },
  'T_BERSERK_TITAN': {
    id: 'T_BERSERK_TITAN',
    name: '광폭한 거인',
    description: '이성을 잃은 대신 신에 필적하는 파괴력을 손에 넣은 전사입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 150, maxHp: 500, def: -50 },
    requirementText: '힘(STR) 5000 이상 달성'
  },

  // --- [신규 대폭 추가: 세계 탐험 및 정세 계열] ---
  'T_DIMENSION_VOYAGER': {
    id: 'T_DIMENSION_VOYAGER',
    name: '차원 유랑자',
    description: '차원 교신을 통해 다른 세계의 정보를 수집하는 신비로운 여행자입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { wis: 100, ctrl: 100, int: 50 },
    requirementText: '차원 교신 10회 성공'
  },
  'T_IMPERIAL_SABOTEUR': {
    id: 'T_IMPERIAL_SABOTEUR',
    name: '제국의 파괴공작원',
    description: '적국의 심장부에 침투하여 내부로부터 무너뜨리는 공포의 스파이입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 80, ctrl: 60, str: 40 },
    requirementText: '적국 전선 점유율 100% 달성 관여'
  },
  'T_DIPLOMATIC_MESSENGER': {
    id: 'T_DIPLOMATIC_MESSENGER',
    name: '전권 대사',
    description: '말 한마디로 전쟁을 멈추고 동맹을 이끄는 외교의 정점입니다.',
    rarity: ItemRarity.EPIC,
    stats: { wis: 100, ctrl: 50 },
    requirementText: '휴전 협상 5회 성공'
  },
  'T_CONTINENT_LIBERATOR': {
    id: 'T_CONTINENT_LIBERATOR',
    name: '대륙의 해방자',
    description: '압제받는 국가들을 구원하여 자유의 깃발을 꽂은 영웅입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 50, def: 50, wis: 50, ctrl: 50 },
    requirementText: '3개 이상의 속국 해방에 관여'
  },

  // --- [신규 대폭 추가: 가문 및 혈통 계열] ---
  'T_ETERNAL_DYNASTY': {
    id: 'T_ETERNAL_DYNASTY',
    name: '영겁의 왕조',
    description: '수세기에 걸쳐 가문의 권위를 유지하며 전설을 이어온 가문의 수장입니다.',
    rarity: ItemRarity.MYTHTIC,
    stats: { str: 500, int: 500, wis: 500, def: 500, agi: 500, ctrl: 500 },
    statMultipliers: { str: 0.15, int: 0.15, wis: 0.15, def: 0.15, agi: 0.15, ctrl: 0.15 },
    requirementText: '5대(Generation) 이상 가문 승계 성공'
  },
  'T_PROGENITOR_OF_MIGHT': {
    id: 'T_PROGENITOR_OF_MIGHT',
    name: '무력의 시조',
    description: '자손들에게 강력한 무력의 유전자를 물려준 전설적인 부모입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 80, agi: 80 },
    requirementText: '자녀의 레벨이 200 이상에 도달'
  },
  'T_BLESSED_LINEAGE': {
    id: 'T_BLESSED_LINEAGE',
    name: '축복받은 혈통',
    description: '신계의 기운을 이어받아 태어날 때부터 남다른 재능을 지닌 자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 50, ctrl: 50, maxMp: 500 },
    requirementText: '신의 사자 사이에서 태어난 자녀'
  },
  'T_HERO_OF_CHRONICLES': {
    id: 'T_HERO_OF_CHRONICLES',
    name: '연표의 주인공',
    description: '가문의 역사서에 가장 많은 업적을 남긴 영광스러운 가주입니다.',
    rarity: ItemRarity.EPIC,
    stats: { str: 60, int: 60, wis: 60 },
    requirementText: '기억(Memories) 기록 100개 돌파'
  },

  // --- [신규 대폭 추가: 마계 및 신계 심층 계열] ---
  'T_ABYSS_CONQUEROR': {
    id: 'T_ABYSS_CONQUEROR',
    name: '심연의 정복자',
    description: '마계의 모든 제너럴을 무릎 꿇리고 심연의 끝을 본 자입니다.',
    rarity: ItemRarity.MYTHTIC,
    stats: { str: 1000, def: 1000, ctrl: 500 },
    requirementText: '11명의 제너럴 중 5명 이상 처단 혹은 복속'
  },
  'T_HEAVENLY_REBEL': {
    id: 'T_HEAVENLY_REBEL',
    name: '하늘을 가르는 반역자',
    description: '신의 질서에 의문을 품고 스스로 칼을 들어 천계를 뒤흔든 자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 1500, int: 1500, ctrl: 1000 },
    requirementText: '성전 침공 3회 이상 성공'
  },
  'T_PURE_FAITH_AVATAR': {
    id: 'T_PURE_FAITH_AVATAR',
    name: '순수 신앙의 화신',
    description: '단 한 점의 타락도 없이 오직 신성함만으로 영혼을 채운 자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 2000, ctrl: 1000 },
    requirementText: '신앙심 1,000,000 돌파 및 악명 0 유지'
  },
  'T_DARK_MESSIAH': {
    id: 'T_DARK_MESSIAH',
    name: '어둠의 구원자',
    description: '마계의 질서를 재정립하고 마물들을 통솔하는 새로운 지배자입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { int: 500, ctrl: 500, maxHp: 10000 },
    requirementText: '마계 지배지 3곳 이상 확보'
  },

  // --- [신규 대폭 추가: 특수 업적 및 수집 계열] ---
  'T_TREASURE_HUNTER': {
    id: 'T_TREASURE_HUNTER',
    name: '전설의 보물 사냥꾼',
    description: '세상에 숨겨진 모든 신화와 전설을 손에 넣은 자입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { wis: 100, agi: 50 },
    requirementText: '신화(MYTHTIC) 등급 아이템 5종 이상 보유'
  },
  'T_MILLIONAIRE': {
    id: 'T_MILLIONAIRE',
    name: '대륙의 대부호',
    description: '그의 재력은 한 국가의 예산을 상회하며, 금화로 산을 쌓을 수 있습니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 100 },
    requirementText: '보유 골드 10,000,000 G 돌파'
  },
  'T_MONSTER_GENOCIDE': {
    id: 'T_MONSTER_GENOCIDE',
    name: '멸종의 선구자',
    description: '그가 지나간 자리에는 마물의 씨가 마른다고 전해집니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 200, agi: 200 },
    requirementText: '누적 몬스터 처치 수 10,000마리 돌파'
  },
  'T_GOD_HAND_CRAFTER': {
    id: 'T_GOD_HAND_CRAFTER',
    name: '신의 손을 가진 대장장이',
    description: '그가 망치를 두드리면 하늘의 별조차 무기가 되어 내려옵니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 200, ctrl: 300 },
    requirementText: '신화 등급 장비 제작 성공'
  },
  'T_SINS_PURIFIER': {
    id: 'T_SINS_PURIFIER',
    name: '죄악의 정화자',
    description: '자신의 모든 죄업을 씻어내고 다시 빛으로 돌아온 성자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 100, ctrl: 100 },
    requirementText: '악명 900 이상에서 0으로 세탁 성공'
  },
  'T_POKER_FACE': {
    id: 'T_POKER_FACE',
    name: '포커 페이스',
    description: '그 어떤 위기나 도발에도 흔들리지 않는 강철 같은 정신력의 소유자입니다.',
    rarity: ItemRarity.RARE,
    stats: { ctrl: 50, wis: 30 },
    requirementText: '제어(CTRL) 3000 이상 달성'
  },

  // --- [8] 몬스터 관련 (Monster) ---
  'T_MONSTER_RESEARCHER': {
    id: 'T_MONSTER_RESEARCHER',
    name: '몬스터 연구가',
    description: '대륙의 수많은 마물들을 직접 대면하고 기록한 해박한 지식의 소유자입니다.',
    rarity: ItemRarity.RARE,
    stats: { int: 50, wis: 50 },
    requirementText: '도감에 50종 이상의 몬스터 등록'
  },
  'T_RARE_HUNTER': {
    id: 'T_RARE_HUNTER',
    name: '레어 헌터',
    description: '희귀한 마물들만을 골라 사냥하는 집요한 사냥꾼입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 60, ctrl: 40 },
    requirementText: '레어 등급 이상의 몬스터 10회 처치'
  },
  'T_BOSS_RAIDER': {
    id: 'T_BOSS_RAIDER',
    name: '보스 레이더',
    description: '강력한 보스급 마물들을 수없이 쓰러뜨린 전장의 지배자입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { str: 100, def: 100, maxHp: 500 },
    requirementText: '보스급 몬스터 20회 처치'
  },
  'T_MONSTER_TAMER': {
    id: 'T_MONSTER_TAMER',
    name: '몬스터 테이머',
    description: '거친 마물들을 복종시키고 자신의 수하로 부리는 조련의 대가입니다.',
    rarity: ItemRarity.RARE,
    stats: { ctrl: 80, wis: 40 },
    requirementText: '3마리 이상의 몬스터를 동료로 영입'
  },

  // --- [9] 기지 관련 (Base) ---
  'T_BASE_ARCHITECT': {
    id: 'T_BASE_ARCHITECT',
    name: '기지 건축가',
    description: '자신만의 영지를 체계적으로 발전시킨 뛰어난 설계자입니다.',
    rarity: ItemRarity.RARE,
    stats: { wis: 60, ctrl: 40 },
    requirementText: '모든 기지 시설 레벨 5 이상 달성'
  },
  'T_FORTRESS_MASTER': {
    id: 'T_FORTRESS_MASTER',
    name: '요새의 주인',
    description: '철통같은 방어력을 자랑하는 난공불락 요새의 지배자입니다.',
    rarity: ItemRarity.EPIC,
    stats: { def: 150, maxHp: 1000 },
    requirementText: '기지 레벨 5 달성'
  },
  'T_RESOURCE_TYCOON': {
    id: 'T_RESOURCE_TYCOON',
    name: '자원의 큰손',
    description: '대륙의 모든 물자를 손에 쥐고 흔드는 거대 영지의 주인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 150, ctrl: 50 },
    requirementText: '모든 기지 자원 100,000 이상 보유'
  },
  'T_BASE_GUARDIAN': {
    id: 'T_BASE_GUARDIAN',
    name: '기지 수호자',
    description: '수많은 침공으로부터 자신의 터전을 완벽하게 지켜낸 수호신입니다.',
    rarity: ItemRarity.EPIC,
    stats: { def: 50, str: 50, maxHp: 500 },
    requirementText: '기지 레벨 3 달성'
  },
  // --- [10] 신규 추가 칭호 (New Diverse Titles) ---
  'T_NATION_HERO': {
    id: 'T_NATION_HERO',
    name: '국가의 영웅',
    description: '한 국가를 위기에서 구하고 만인의 칭송을 받는 영웅입니다.',
    rarity: ItemRarity.UNIQUE,
    statMultipliers: { str: 0.05, int: 0.05, def: 0.05, agi: 0.05, wis: 0.05, ctrl: 0.05 },
    requirementText: '전쟁 승리 기여도 1위 달성'
  },
  'T_ABYSS_LORD': {
    id: 'T_ABYSS_LORD',
    name: '심연의 군주',
    description: '마계의 가장 깊은 곳, 심연을 지배하는 절대자입니다.',
    rarity: ItemRarity.MYTHTIC,
    statMultipliers: { str: 0.25, int: 0.25, ctrl: 0.15 },
    requirementText: '마계 모든 지배지 공포도 MAX 달성'
  },
  'T_RICHEST_IN_WORLD': {
    id: 'T_RICHEST_IN_WORLD',
    name: '세계 최고의 부자',
    description: '대륙의 모든 금전을 움직일 수 있는 전설적인 자산가입니다.',
    rarity: ItemRarity.UNIQUE,
    statMultipliers: { wis: 0.25 },
    requirementText: '보유 골드 1억 G 돌파'
  },
  'T_PEACE_MAKER': {
    id: 'T_PEACE_MAKER',
    name: '평화의 중재자',
    description: '전쟁의 불길을 끄고 대륙에 평화를 가져온 위대한 외교관입니다.',
    rarity: ItemRarity.UNIQUE,
    statMultipliers: { wis: 0.15, ctrl: 0.15 },
    requirementText: '국가 간 동맹 10회 이상 체결'
  },
  'T_LEGENDARY_FARMER': {
    id: 'T_LEGENDARY_FARMER',
    name: '전설의 농부',
    description: '대륙의 모든 생명을 먹여 살릴 수 있는 풍요의 상징입니다.',
    rarity: ItemRarity.EPIC,
    stats: { agi: 50, wis: 50 },
    statMultipliers: { maxHp: 0.1 },
    requirementText: '농장 수확 100회 이상 달성'
  },
  'T_BASE_TYCOON': {
    id: 'T_BASE_TYCOON',
    name: '기지의 대부',
    description: '가장 거대하고 화려한 기지를 건설한 영지의 주인입니다.',
    rarity: ItemRarity.UNIQUE,
    stats: { wis: 100, ctrl: 100 },
    statMultipliers: { def: 0.1, maxHp: 0.1 },
    requirementText: '기지 레벨 10 달성 및 모든 시설 건설'
  },
  'T_MASTER_OF_ALL_TRADES': {
    id: 'T_MASTER_OF_ALL_TRADES',
    name: '만능의 달인',
    description: '모든 분야에서 정점에 도달한, 불가능이 없는 자입니다.',
    rarity: ItemRarity.LEGENDARY,
    stats: { str: 100, int: 100, wis: 100, def: 100, agi: 100, ctrl: 100 },
    statMultipliers: { str: 0.05, int: 0.05, wis: 0.05, def: 0.05, agi: 0.05, ctrl: 0.05 },
    requirementText: '모든 숙련도 50 이상 달성'
  },
};

/**
 * 캐릭터 또는 동료의 상태를 검사하여 해금 가능한 칭호 ID 목록을 반환합니다.
 * (기존 로직 유지 및 신규 칭호 체크 로직 보강)
 */
export const checkTitleUnlocks = (target: Character | Companion, player: Character): string[] => {
  const newUnlocks: string[] = [];
  const available = target.availableTitles || [];
  const memories = player.memories || [];

  const addIfMissing = (id: string) => {
    if (!available.includes(id) && TITLES[id]) newUnlocks.push(id);
  };

  // --- 1. 직업 및 클래스 기반 체크 ---
  if (target.job === JobType.STUDENT) addIfMissing('T_STUDENT');
  if (target.job === JobType.DEMON_GOD) addIfMissing('T_DEMON_GOD');
  if (target.job && target.job.toString().includes('제너럴')) addIfMissing('T_ABYSS_GENERAL');
  
  if (target.classTier === ClassTier.FINAL) addIfMissing('T_FINAL_EVOLVED');

  const isMessenger = target.job && [
    JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
    JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
    JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
    JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
    JobType.VOID_MESSENGER
  ].includes(target.job);
  if (isMessenger) addIfMissing('T_DIVINE_MESSENGER');

  // --- 2. 스탯 및 재화 기반 ---
  if (target.stats.int >= 1500) addIfMissing('T_LIBRARY_HERMIT');
  if (target.stats.str >= 5000) addIfMissing('T_BERSERK_TITAN');
  if (target.stats.ctrl >= 3000) addIfMissing('T_POKER_FACE');
  
  if (player.money >= 5000000 && target === (player as any)) addIfMissing('T_GOLDEN_HAND');
  if (player.money >= 10000000 && target === (player as any)) addIfMissing('T_MILLIONAIRE');
  
  if ((target.infamy || 0) >= 800) addIfMissing('T_OUTLAW');
  if (player.faith >= 100000 && target === (player as any)) addIfMissing('T_FAITH_MASTER');
  if (player.faith >= 1000000 && target === (player as any)) addIfMissing('T_FAITH_MASTER'); // Re-check logic can be improved

  // --- 3. 군대 기반 ---
  const milRank = (target as any).militaryRank;
  if (milRank) {
    const milRankIdx = MILITARY_RANK_ORDER.indexOf(milRank);
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.PVT)) addIfMissing('T_BYUNGSA');
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SSG)) addIfMissing('T_BUSAGWAN');
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MSG)) addIfMissing('T_IRON_VETERAN');
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT)) addIfMissing('T_JANGYO');
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL)) addIfMissing('T_WAR_HERO');
    if (milRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.GEN)) addIfMissing('T_SUPREME_COMMANDER');
  }
  const merit = (target as any).merit || 0;
  if (merit >= 10000) addIfMissing('T_FRONTLINE_DEVIL');

  // --- 4. 용병 및 아레나 기반 ---
  const mercRank = (target as any).mercenaryRank || (target as any).mercenaryData?.rank;
  const mercRankIdx = [MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C, MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS].indexOf(mercRank);
  if (target.job === JobType.MERCENARY && mercRankIdx >= 0) addIfMissing('T_MERC_BEGINNER');
  if (mercRankIdx >= 4) addIfMissing('T_MERC_ELITE');
  if (mercRankIdx >= 6) addIfMissing('T_S_LEGEND');
  if (mercRankIdx >= 8) addIfMissing('T_SSS_LEGEND');

  if (player.mercenaryData?.arenaState?.currentRound === 0 && target === (player as any)) addIfMissing('T_ARENA_CHAMP');

  // --- 5. 학교 및 관계 기반 ---
  if (player.schoolData?.rank === 1 && target === (player as any)) addIfMissing('T_TOP_RANKER');
  
  if (memories.some(m => m.includes('토너먼트 우승')) && target === (player as any)) addIfMissing('T_TOURNAMENT_CONQUEROR');

  const allComps = [...(player?.companions || []), ...(player?.inactiveCompanions || [])];
  const myChildren = allComps.filter(c => c && (c.classType?.includes('자녀') || c.classType?.includes('Child')) && c.childData?.parentNames?.includes(target.name));
  const hasSpouse = (target as Companion).isSpouse && (target as Companion).partnerId === 'player';
  const isPlayerHead = target === (player as any) && allComps.some(c => c && c.isSpouse && c.partnerId === 'player');
  
  if (myChildren.some(c => {
      const ageNum = parseInt(c.age?.replace(/[^0-9]/g, '') || '0') || 0;
      return ageNum >= 20;
  }) && (isPlayerHead || hasSpouse)) {
      addIfMissing('T_FAMILY_HEAD');
  }

  if (target.clubData?.joinedClub === ClubType.COUNCIL) addIfMissing('T_STUDENT_COUNCIL');
  if (target.clubData?.joinedClub === ClubType.DISCIPLINARY) addIfMissing('T_DISCIPLINARY_LEAD');

  // --- 6. 업적 및 수집 로직 ---
  const killCount = (memories || []).filter(m => m && m.includes('처치!')).length;
  if (killCount >= 1000) addIfMissing('T_MONSTER_SLAYER');
  if (killCount >= 10000) addIfMissing('T_MONSTER_GENOCIDE');
  
  if ((memories || []).some(m => m && m.includes('드래곤') && m.includes('처치'))) addIfMissing('T_DRAGON_HUNTER');

  const storageItems = player?.base?.storage?.length || 0;
  const invItems = player?.inventory?.length || 0;
  if (storageItems + invItems >= 300) addIfMissing('T_COLLECTOR');

  const socialCount = (player?.socialNetwork?.length || 0) + allComps.length;
  if (socialCount >= 50) addIfMissing('T_BOND_MASTER');

  const highLoyaltyCount = allComps.filter(c => c && (c.loyalty || 0) >= 100).length;
  if (highLoyaltyCount >= 5) addIfMissing('T_CHARISMATIC_LEADER');

  // --- 7. 특수 성취 ---
  if (player.isGodDefeated && target === (player as any)) addIfMissing('T_GOD_SLAYER');
  
  const blacksmithRank = (target as any).blacksmithRank;
  if (blacksmithRank === '명공' || blacksmithRank === 'Grandmaster') addIfMissing('T_MASTER_SMITH');

  // 성전 위엄도 체크
  if (target === (player as any)) {
      const dominions = player.magyeDominions || {};
      const templePersonnel = player.base?.templePersonnel || {};
      
      const highFear = Object.values(dominions).some(d => d.fear >= 1000);
      if (highFear) addIfMissing('T_FEAR_LORD');

      const highMajesty = Object.values(templePersonnel).some(tp => (tp.majesty || 0) >= 5000);
      if (highMajesty) addIfMissing('T_MAJESTY_KING');

      if (player.nation === "대한민국" && player.level >= 500) addIfMissing('T_KOREAN_PRIDE');
  }

  // --- 8. 마스터리 기반 추가 ---
  const wm = target.weaponMastery || {};
  if (wm['Sword']?.level === 100) addIfMissing('T_BLADE_SAINT');
    if (wm['Spear']?.level === 100) addIfMissing('T_SPEARMAN');
        if (wm['Axe']?.level === 100) addIfMissing('T_AXEMAN');
            if (wm['Blunt']?.level === 100) addIfMissing('T_BLUNTMAN');
                if (wm['Thrown']?.level === 100) addIfMissing('T_NINJA');
  if (wm['Bow']?.level === 100 || wm['Firearm']?.level === 100) addIfMissing('T_GOD_SPEED_SNIPER');
  if (wm['Staff']?.level === 100|| wm['Energy']?.level === 100|| wm['Grimoire']?.level === 100) addIfMissing('T_ARCANE_LICH');
  if (wm['Shield']?.level === 100) addIfMissing('T_UNBREAKABLE_FORTRESS');
  if (wm['Knuckle']?.level === 100) addIfMissing('T_KNUCKLER');

  // --- 9. 몬스터 관련 로직 ---
  const bestiary = player.bestiary || {};
  const encounteredCount = Object.keys(bestiary).length;
  if (encounteredCount >= 50) addIfMissing('T_MONSTER_RESEARCHER');

  const rareKills = memories.filter(m => m.includes('레어') && m.includes('처치!')).length;
  if (rareKills >= 10) addIfMissing('T_RARE_HUNTER');

  const bossKills = memories.filter(m => m.includes('보스') && m.includes('처치!')).length;
  if (bossKills >= 20) addIfMissing('T_BOSS_RAIDER');

  const monsterCompanions = allComps.filter(c => c.isMonster).length;
  if (monsterCompanions >= 3) addIfMissing('T_MONSTER_TAMER');

  // --- 10. 기지 관련 로직 ---
  if (player.base) {
    const base = player.base;
    if (base.level >= 5) addIfMissing('T_FORTRESS_MASTER');
    if (base.level >= 3) addIfMissing('T_BASE_GUARDIAN');

    const facilityLevels = Object.values(base.facilityLevels || {});
    // 모든 시설이 5레벨 이상 (최소 1개 이상의 시설이 있어야 함)
    if (facilityLevels.length > 0 && facilityLevels.every(lvl => lvl >= 5)) {
      addIfMissing('T_BASE_ARCHITECT');
    }

    const res = base.resources;
    if (res && 
        res.gold >= 100000 && res.wood >= 100000 && res.stone >= 100000 && 
        res.iron >= 100000 && res.food >= 100000 && res.herbs >= 100000) {
      addIfMissing('T_RESOURCE_TYCOON');
    }
  }

  // --- 11. 신규 추가 칭호 해금 로직 ---
  if (memories.some(m => m.includes('전쟁 승리 기여도 1위'))) addIfMissing('T_NATION_HERO');
  if (memories.some(m => m.includes('시련의 탑 100층 돌파'))) addIfMissing('T_DIVINE_CHAMPION');
  
  if (target === (player as any)) {
      const dominions = player.magyeDominions || {};
      const allMaxFear = Object.values(dominions).length > 0 && Object.values(dominions).every(d => d.fear >= 1000);
      if (allMaxFear) addIfMissing('T_ABYSS_LORD');
      
      if (player.money >= 100000000) addIfMissing('T_RICHEST_IN_WORLD');
  }

  if (hasSpouse) {
      const spouse = allComps.find(c => c.isSpouse && c.partnerId === 'player');
      if (spouse && spouse.affection >= 1000) addIfMissing('T_LEGENDARY_LOVER');
  }

  if (killCount >= 50000) addIfMissing('T_MONSTER_CALAMITY');
  if (target.stats.agi >= 10000) addIfMissing('T_UNTOUCHABLE');
  if (target.stats.int >= 10000) addIfMissing('T_SAGE_OF_ALL_KNOWLEDGE');

  const dragonKills = memories.filter(m => m.includes('드래곤') && m.includes('처치!')).length;
  if (dragonKills >= 10) addIfMissing('T_DRAGON_SLAYER_MASTER');

  const allianceCount = memories.filter(m => m.includes('동맹 체결')).length;
  if (allianceCount >= 10) addIfMissing('T_PEACE_MAKER');

  return newUnlocks;
};
