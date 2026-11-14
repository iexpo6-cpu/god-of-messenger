
export enum ClassTier {
  NONE = '없음',
  F = 'F',
  FIRST = '퍼스트 클래스',
  SECOND = '세컨드 클래스',
  LAST = '라스트 클래스',
  FINAL = '파이널 클래스',
  BOND = '인연',
}

export enum JobType {
  UNEMPLOYED = '무직',
  STUDENT = '학생',
  SOLDIER = '군인',
  MERCENARY = '용병',
  TEACHER = '교사',
  BLACKSMITH = '대장장이',
  SLAVE = '노예',
  SOLAR_MESSENGER = '태양의 사자',
  FIRE_MESSENGER = '화염의 사자',
  RADIANT_MESSENGER = '광휘의 사자',
  MOONLIGHT_MESSENGER = '월광의 사자',
  ELECTRIC_MESSENGER = '전격의 사자',
  EARTH_MESSENGER = '지령의 사자',
  GALE_MESSENGER = '질풍의 사자',
  ICE_MESSENGER = '빙결의 사자',
  SEA_MESSENGER = '해수의 사자',
  STEEL_MESSENGER = '강철의 사자',
  DARK_MESSENGER = '암연의 사자',
  NATURE_MESSENGER = '초화의 사자',
  VOID_MESSENGER = '무의 사자',
   DEMON_GOD = '마신',
  MAGYE_GENERAL_1 = '마계 제1 제너럴',
  MAGYE_GENERAL_2 = '마계 제2 제너럴',
  MAGYE_GENERAL_3 = '마계 제3 제너럴',
  MAGYE_GENERAL_4 = '마계 제4 제너럴',
  MAGYE_GENERAL_5 = '마계 제5 제너럴',
  MAGYE_GENERAL_6 = '마계 제6 제너럴',
  MAGYE_GENERAL_7 = '마계 제7 제너럴',
  MAGYE_GENERAL_8 = '마계 제8 제너럴',
  MAGYE_GENERAL_9 = '마계 제9 제너럴',
  MAGYE_GENERAL_10 = '마계 제10 제너럴',
  MAGYE_GENERAL_11 = '마계 제11 제너럴',
  PRINCE = '왕자',
  PRINCESS = '공주',
  ROYAL_KNIGHT = '왕실 기사단장',
  KING = '국왕',
  FARMER = '농부',
  MINER = '광부',
  ALCHEMIST = '연금술사',
  CHEF = '요리사',
  BREEDER = '사육사',
  TRAINER = '트레이너',
  HOUSEKEEPER = '하우스 키퍼',
  RESEARCHER = '연구원',
}

export interface NationLeader {
    name: string;
    title: string;
    desc: string;
    appearance?: string;
}
export interface MagyePersonnel {
    tormentorId?: string;      // 고문관
    overseerIds: string[];    // 노예 감독관
    executionerIds: string[];  // 처형인
}

export interface DominionData {
    fear: number;          // 공포도 (0-1000)
    corruption: number;    // 타락도 (0-1000)
    lastExtractionDate?: string; // 마지막 정제 월
    lastDecreeYear?: number;   // 마지막 칙령 연도
    facilityLevels: Record<string, number>; // 시설 레벨
    personnel?: MagyePersonnel; // [NEW] 마계 관리 인력
    guardian?: CapturedMonster; // [NEW] 지배지 수호 마수
}

export interface ClubData {
  joinedClub: ClubType;
  activityCount: number;
  contribution: number;
  clubMembers?: SimpleStudent[]; // [NEW] 고정된 동아리원 목록
  lastTrainingDate?: string; // [NEW] 마지막 합동 모의대련 진행 월 (YYYY-MM)
}

export enum ClubType {
  NONE = '없음',
  MELEE = '근접 무기부',
  RANGED = '원거리 무기부',
  MAGIC_ENG = '마법 공학부',
  COUNCIL = '학생회',
  DISCIPLINARY = '선도부'
}

export enum WantedRank {
    NONE = 'NONE',
    C = 'C',
    B = 'B',
    A = 'A',
    S = 'S',
    SS = 'SS',
    SSS = 'SSS'
}

export enum CombatStyle {
  // 1차 전투 계열
  SWORDSMAN = '검사',
  SPEARMAN = '창술사',
  BERSERKER = '광전사',
  BOXER = '권투사',
  ARCHER = '궁수',
  ROGUE = '도적',
  GUNNER = '거너',
  MAGE = '마법사',
  ENERGIZER = '에너자이저',

  // 2차 전투 계열
  KNIGHT = '기사',
  MAGIC_SWORDSMAN = '마검사',
  DUAL_SWORDSMAN = '쌍검사',
  LANCER = '창기사',
  MAGIC_SPEARMAN = '마창사',
  AXE_WARRIOR = '도끼전사',
  DESTROYER = '파괴전사',
  MARTIAL_ARTIST = '격투가',
  PUGILIST = '권투가',
  BOWMAN = '궁사',
  CROSSBOWMAN = '석궁사',
  ASSASSIN = '암살자',
  NINJA = '닌자',
  GUNSLINGER = '건슬링어',
  HEAVY_TROOPER = '중화기병',
  ELEMENTALIST = '원소술사',
  ARCANIST = '비전술사',
  CLERIC = '클레릭',
  SHAMAN = '주술사',
  SUMMONER = '소환사',
  ENERGY_BLADER = '에너지블레이더',
  ENERGY_SHOOTER = '에너지슈터',
  ENERGY_CORE = '에너지코어',

  // 3차 전투 계열
  PALADIN = '성기사',
  IRONCLAD_KNIGHT = '철벽기사',
  BLADE_DANCER = '검무사',
  GLADIATOR = '검투사',
  DRAGON_KNIGHT = '용기사',
  CAVALRY_LEADER = '기병장',
  HOLY_KNIGHT = '홀리 나이트',
  DARK_KNIGHT = '다크 나이트',
  MAGIC_LANCER = '마창술사',
  MAGIC_KNIGHT = '매직 나이트',
  ELEMENTAL_LANCER = '원소창사',
  EXECUTIONER = '처형자',
  AXE_BERSERKER = '도끼광전사',
  SHIELD_BERSERKER = '방패광전사',
  MACE_WARRIOR = '철퇴전사',
  CRUSHER = '분쇄자',
  COMBATANT = '무투가',
  COMBO_MASTER = '연격사',
  FIGHTER = '파이터',
  FIST_SAINT = '권성',
  MASTER_ARCHER = '명궁',
  WIND_ARCHER = '풍궁사',
  SNIPER = '저격수',
  HUNTER = '사냥꾼',
  TRUE_ASSASSIN = '어쌔신',
  SHADOW_BLADE = '검영',
  SHURIKEN_MASTER = '수리검사',
  BOMB_NINJA = '폭닌자',
  DUAL_SHOOTER = '듀얼슈터',
  GUN_SNIPER = '저격수(총)',
  ARTILLERY = '포병',
  DEMOLITIONIST = '폭파병',
  GRAND_MAGE = '대마도사',
  FROST_FLAME_MAGE = '빙염술사',
  ARCANE_MAGE = '아케인메이지',
  MAGIC_SAGE = '마도현자',
  PRIEST = '프리스트',
  SPIRIT_MAGE = '정령술사',
  MANA_MANIPULATOR = '마력술사',
  ELEMENT_SUMMONER = '정령소환사',
  BEAST_SUMMONER = '수환사',
  PLASMA_SWORD = '플라즈마소드',
  ENERGY_KNIGHT = '에너지나이트',
  LASER_SHOOTER = '레이저슈터',
  BEAM_CASTER = '빔캐스터',
  ENERGY_MAGE = '에너지술사',
  OVERDRIVER = '오버드라이버',
  GRAND_SUMMONER = '대소환사',
  BEAST_MASTER = '마수사',

  // 4차 전투 계열
  CRUSADER = '성전사',
  GUARDIAN_KNIGHT = '수호기사',
  SWORD_EMPEROR = '검제',
  BATTLE_KING = '투왕',
  SKY_DRAGON_KNIGHT = '천룡기사',
  ASSAULT_COMMANDER = '돌격대장',
  DIVINE_KNIGHT = '디바인 나이트',
  ABYSS_KNIGHT = '어비스 나이트',
  MAGIC_SPEAR_KING = '마창왕',
  SPEAR_SAGE = '창의현자',
  HYBRID = '하이브리드',
  DECAPITATOR = '참수자',
  AXE_LORD = '도끼군주',
  SHIELD_BERSERK_LORD = '방패광전군주',
  DESTRUCTION_LORD = '파괴군주',
  GRAND_CRUSHER = '대분쇄자',
  WAR_GOD = '무신',
  COMBO_EMPEROR = '연격제',
  FIST_GOD = '투신',
  DIVINE_ARCHER = '신궁',
  SKY_BOW_MASTER = '천궁',
  SNIPER_KING = '저격왕',
  GOD_OF_HUNT = '사냥의 신',
  DEATH_REAPER = '사신',
  SHADOW_LORD = '그림자군주',
  SHURIKEN_KING = '수리검왕',
  EXPLOSIVE_DESTROYER = '폭멸자',
  GUN_BLADER = '건블레이더',
  DEADEYE = '데드아이',
  ARSENAL = '아스널',
  DEMOLISHER = '데몰리셔',
  ELEMENTAL_LORD = '엘리멘탈 로드',
  ELEMENTAL_SOVEREIGN = '원소군주',
  ARCHMAGE = '아크메이지',
  GRAND_SAGE = '대현자',
  SAINT = '세인트',
  SPIRIT_KING = '정령왕',
  MAGIC_EMPEROR = '마도황제',
  PLASMA_LORD = '플라즈마로드',
  LASER_MASTER = '레이저마스터',
  BEAM_LORD = '빔로드',
  ENERGY_MASTER = '에너지마스터',
  OVERLORD = '오버로드',
  SUMMON_KING = '환수왕',
  ANCIENT_SUMMONER = '고대소환주'
}

export interface CombatStyleProgressData {
  exp: number;
  monsterKills: number;
  bossKills: number;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  stats?: Partial<Stats>;
  statMultipliers?: Partial<Stats>; // [NEW] 능력치 % 증가 (예: 0.1 이면 10% 증가)
  requirementText: string;
}
export enum DiplomaticStatus {
    ALLIANCE = '동맹',
    NEUTRAL = '중립',
    HOSTILE = '적대',
    WAR = '전쟁',
    VASSAL_OWNER = '종주국',
    VASSAL_SUBJECT = '속국'
}

export interface NationRelation {
    status: DiplomaticStatus;
    tension: number;
    lastEvent?: string;
    occupation?: number;
    vassalYearsRemaining?: number;
    vassalStartDate?: string; // [NEW] 속국/종주국 관계 시작 날짜 (YYYY-MM-DD)
    vassalEndDate?: string;   // [NEW] 속국/종주국 관계 종료 날짜
    allianceYearsRemaining?: number; // [NEW] 동맹 잔여 기간
    lastVassalInteractionYear?: number;
    vassalDebt?: {
        gold: number;
        manaCrystal: number;
        wood: number;
        iron: number;
    };
    lastRaidOccupationDate?: string; // [NEW] 당일 전쟁 습격 점유율 획득 날짜 (하루 1회 제한)
}

// [NEW] 성전 전용 외교 상태
export enum DivineDiplomacyStatus {
    BLESSED = '축복/비호',
    NEUTRAL = '중립/포교',
    SUBJUGATED = '굴복/성역',
    CORRUPTED = '타락/적대',
}

// [NEW] 성전 전용 국가 관계 데이터
  export interface DivineRelation {
    status: DivineDiplomacyStatus;
    faithPoints: number;      // 해당 국가 내 신앙 수치 (0-1000)
    influence: number;        // 성전의 영향력 (0-100)
    subjugatedYears?: number; // 점령 잔여 기간
    subjugatedStartDate?: string // 점령 시작 날짜
    subjugatedEndDate?: string;  // [NEW] 점령 종료 날짜
    tension: number; // 해당 성전과의 긴장도 (0-100)
    protectionYears?: number; // 비호 잔여 기간
    protectionStartDate?: string; // [NEW] 비호 시작 날짜 (YYYY-MM-DD)
    protectionEndDate?: string;   // [NEW] 비호 종료 날짜
    tributeLevel: number;     // 조공 등급 (0-3)
    lastInteractionYear?: number;
    // [NEW] 비호 관리 관련 추가 데이터
    dispatchedKnightId?: string; // 파견된 수호기사 ID
    lastFaithCollectionDate?: string; // 마지막 신앙심 수거 월 (YYYY-MM)
    // [NEW] 성역 속국 관리 관련 추가 데이터
    lastPlunderYear?: number;    // 마지막 대규모 수탈 연도
    lastEnslaveYear?: number;    // 마지막 인재 노예화 연도
}

export interface InstantDungeon {
    id: string;
    city: string;
    nation: string;
    name: string;
    description: string;
    boss: Enemy;
    monsters: Enemy[];
    loot: Item[];
    level: number;
    createdAt: string; // 생성된 날짜 (YYYY-MM)
}

export enum BlacksmithRank {
    BEGINNER = '초급',
    INTERMEDIATE = '중급',
    ADVANCED = '상급',
    MASTER = '최상급',
    GRANDMASTER = '명공'
}

export enum AlchemistRank {
    BEGINNER = '초급',
    INTERMEDIATE = '중급',
    ADVANCED = '상급',
    MASTER = '최상급',
    GRANDMASTER = '대현자'
}

export enum TrainerRank {
    APPRENTICE = '견습',
    NOVICE = '초급',
    INTERMEDIATE = '중급',
    ADVANCED = '고급',
    SKILLED = '숙련',
    PROFESSIONAL = '전문',
    MASTER = '마스터',
    LEGEND = '레전드'
}

export enum TrainerBranch {
    EXP = '경험치 트레이너',
    STAT = '스탯 트레이너',
    WEAPON_MASTERY = '무기숙련도 트레이너',
    TACTICAL = '전술 트레이너',
    COMBAT_STYLE = '전투 스타일 트레이너'
}

export const TRAINER_RANK_CONFIG: Record<TrainerRank, {
    rank: TrainerRank;
    label: string;
    dailyCount: number;
    reqLevel: number;
    reqExp: number;
    order: number;
}> = {
    [TrainerRank.APPRENTICE]: { rank: TrainerRank.APPRENTICE, label: '견습 트레이너', dailyCount: 1, reqLevel: 1, reqExp: 100, order: 1 },
    [TrainerRank.NOVICE]: { rank: TrainerRank.NOVICE, label: '초급 트레이너', dailyCount: 5, reqLevel: 10, reqExp: 300, order: 2 },
    [TrainerRank.INTERMEDIATE]: { rank: TrainerRank.INTERMEDIATE, label: '중급 트레이너', dailyCount: 10, reqLevel: 25, reqExp: 600, order: 3 },
    [TrainerRank.ADVANCED]: { rank: TrainerRank.ADVANCED, label: '고급 트레이너', dailyCount: 15, reqLevel: 40, reqExp: 1200, order: 4 },
    [TrainerRank.SKILLED]: { rank: TrainerRank.SKILLED, label: '숙련 트레이너', dailyCount: 25, reqLevel: 55, reqExp: 2500, order: 5 },
    [TrainerRank.PROFESSIONAL]: { rank: TrainerRank.PROFESSIONAL, label: '전문 트레이너', dailyCount: 50, reqLevel: 70, reqExp: 5000, order: 6 },
    [TrainerRank.MASTER]: { rank: TrainerRank.MASTER, label: '마스터 트레이너', dailyCount: 75, reqLevel: 85, reqExp: 10000, order: 7 },
    [TrainerRank.LEGEND]: { rank: TrainerRank.LEGEND, label: '레전드 트레이너', dailyCount: 100, reqLevel: 100, reqExp: 99999999, order: 8 },
};

export enum HousekeeperRank {
    BEGINNER = '초급 하우스 키퍼',
    INTERMEDIATE = '중급 하우스 키퍼',
    ADVANCED = '고급 하우스 키퍼',
    SUPERIOR = '최고급 하우스 키퍼',
    PROFESSIONAL = '전문 하우스 키퍼',
    MASTER = '마스터 하우스 키퍼',
    LEGEND = '레전드 하우스 키퍼'
}

export const HOUSEKEEPER_RANK_CONFIG: Record<HousekeeperRank, {
    rank: HousekeeperRank;
    label: string;
    coef: number; // 주택 건설 수 숙련 계수
    reqExp: number;
    order: number;
}> = {
    [HousekeeperRank.BEGINNER]: { rank: HousekeeperRank.BEGINNER, label: '초급 하우스 키퍼', coef: 2, reqExp: 100, order: 1 },
    [HousekeeperRank.INTERMEDIATE]: { rank: HousekeeperRank.INTERMEDIATE, label: '중급 하우스 키퍼', coef: 5, reqExp: 300, order: 2 },
    [HousekeeperRank.ADVANCED]: { rank: HousekeeperRank.ADVANCED, label: '고급 하우스 키퍼', coef: 10, reqExp: 600, order: 3 },
    [HousekeeperRank.SUPERIOR]: { rank: HousekeeperRank.SUPERIOR, label: '최고급 하우스 키퍼', coef: 20, reqExp: 1200, order: 4 },
    [HousekeeperRank.PROFESSIONAL]: { rank: HousekeeperRank.PROFESSIONAL, label: '전문 하우스 키퍼', coef: 35, reqExp: 2500, order: 5 },
    [HousekeeperRank.MASTER]: { rank: HousekeeperRank.MASTER, label: '마스터 하우스 키퍼', coef: 60, reqExp: 5000, order: 6 },
    [HousekeeperRank.LEGEND]: { rank: HousekeeperRank.LEGEND, label: '레전드 하우스 키퍼', coef: 100, reqExp: 99999999, order: 7 },
};

export enum HouseType {
    MY_HOME = 'my_home',         // 나의 집 (2명 거주)
    HOUSE_1F = 'house_1f',       // 1층 주택 (2명 거주)
    HOUSE_2F = 'house_2f',       // 2층 주택 (4명 거주)
    VILLA = 'villa',             // 빌라 (10명 거주)
    APARTMENT = 'apartment',     // 아파트 (50명 거주)
    LUXURY = 'luxury_house',     // 초호화 주택 (10명 거주, 호감도/충성도 최대 증가)
}

export enum ChefRank {
    APPRENTICE = '견습 요리사',
    NORMAL = '일반 요리사',
    SKILLED = '숙련 요리사',
    ARTISAN = '장인 요리사',
    MASTER = '명인 요리사',
    LEGEND = '전설 요리사'
}

export const CHEF_RANK_CONFIG: Record<ChefRank, {
    rank: ChefRank;
    label: string;
    minLevel: number;
    allowedHouses: HouseType[];
    allowedHouseDescription: string;
    order: number;
}> = {
    [ChefRank.APPRENTICE]: {
        rank: ChefRank.APPRENTICE,
        label: '견습 요리사',
        minLevel: 1,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F],
        allowedHouseDescription: '1층 주택, 나의 집',
        order: 1
    },
    [ChefRank.NORMAL]: {
        rank: ChefRank.NORMAL,
        label: '일반 요리사',
        minLevel: 20,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F],
        allowedHouseDescription: '1층 주택, 나의 집',
        order: 2
    },
    [ChefRank.SKILLED]: {
        rank: ChefRank.SKILLED,
        label: '숙련 요리사',
        minLevel: 40,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F, HouseType.HOUSE_2F],
        allowedHouseDescription: '2층 주택, 1층 주택, 나의 집',
        order: 3
    },
    [ChefRank.ARTISAN]: {
        rank: ChefRank.ARTISAN,
        label: '장인 요리사',
        minLevel: 60,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F, HouseType.HOUSE_2F],
        allowedHouseDescription: '2층 주택, 1층 주택, 나의 집',
        order: 4
    },
    [ChefRank.MASTER]: {
        rank: ChefRank.MASTER,
        label: '명인 요리사',
        minLevel: 80,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F, HouseType.HOUSE_2F, HouseType.VILLA, HouseType.LUXURY],
        allowedHouseDescription: '빌라, 초호화 주택 및 하위 주택',
        order: 5
    },
    [ChefRank.LEGEND]: {
        rank: ChefRank.LEGEND,
        label: '전설 요리사',
        minLevel: 100,
        allowedHouses: [HouseType.MY_HOME, HouseType.HOUSE_1F, HouseType.HOUSE_2F, HouseType.VILLA, HouseType.LUXURY, HouseType.APARTMENT],
        allowedHouseDescription: '아파트 및 모든 주택',
        order: 6
    }
};

export interface HouseBuilding {
    id: string;
    type: HouseType;
    name: string;
    capacity: number;
    level: number;
    cleanliness?: number; // 청결도 (0 ~ 100)
    assignedHousekeeperId?: string; // 지정 하우스키퍼 동료 ID
    assignedChefId?: string; // 지정 요리사 동료 ID
    createdAt?: string;

    // 공사(신축/증축) 진행 상태
    underConstruction?: boolean;
    targetLevel?: number;
    targetType?: HouseType;
    targetCapacity?: number;
    targetName?: string;
    constructionStartDate?: string;
    constructionStartTime?: string;
    constructionCompletionDate?: string;
    constructionCompletionTime?: string;
    totalConstructionMinutes?: number;
}

export interface RegionalStats {
    budget: number;
    security: number;   // 0 - 100
    sentiment: number;  // 0 - 100
        taxRate: number;    // [NEW] 세율 (0 - 50)
    lastUpdateMonth?: string;
}
export enum MilitaryRank {
  PVT = '이등병',
  PFC = '일병',
  CPL = '상병',
  SGT = '병장',
  SSG = '하사',
  SFC = '중사',
  MSG = '상사',
  WSG = '원사',
  SLT = '소위',
  FLT = '중위',
  CPT = '대위',
  MAJ = '소령',
  LTC = '중령',
  COL = '대령',
  BG = '준장',
  MG = '소장',
  LG = '중장',
  GEN = '대장'
}
export interface RumorData {
    itemId: string;
    item: Item;
    city: string;
    nation: string;
    description: string;
}
export interface Stats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  str: number;
  int: number;
  wis: number;
  def: number;
  agi: number;
  ctrl: number;
}
export interface MagyeRevolt {
    city: string;
    rebelLeaderName: string;
    rebelJob: JobType;
    rebelRankIdx: number;
    enemies: Enemy[];
}

export enum ItemRarity {
  NORMAL = '노말',
  MAGIC = '마법',
  RARE = '레어',
  EPIC = '에픽',
  UNIQUE = '유니크',
  LEGENDARY = '전설',
  MYTHTIC = '신화',
}

export enum MythicOptionType {
  DEF_IGNORE = '방어력 무시',
  EVA_IGNORE = '회피율 무시',
  REFLECT = '피해 반사',
  UNDEAD = '사망 방지',
  NULLIFY = '피해 무효화',
  MANA_SHIELD = '마나쉴드 자동 생성',
  DOUBLE_ATTACK = '이중 공격',
  INFINITE_MANA = '마나 무한',
}

export enum MagyeOptionType {
  REFLECT = '피해 반사',
  UNDEAD = '사망 방지',
  NULLIFY = '피해 무효화',
  INFINITE_MANA = '마나 무한',
  ABSORB = '흡수',
  DEMONIZE = '악마화',
  CURSE_SPREAD = '저주 전파',
  INSTANT_DEATH = '즉사',
}

export enum SkillType {
  PHYSICAL = '물리 공격',
  MAGIC = '마법 공격',
  BUFF = '버프',
  DEBUFF = '디버프',
  PASSIVE = '패시브',
  HEAL = '회복',
  SUMMON = '소환',
  CLONE = '분신',
}

export enum BattleRole {
  NONE = '역할없음',
  DEALER = '딜러',
  TANKER = '탱커',
  SUPPORTER = '서포터',
  ALLROUNDER = '올라운더',
}

export enum SecondaryBattleRole {
  NONE = '역할없음',
  PHYSICAL_DEALER = '물리 딜러',
  MAGIC_DEALER = '마법 딜러',
  PURE_TANKER = '퓨어 탱커',
  DEALING_TANKER = '딜링 탱커',
  SAVE_TANKER = '세이브 탱커',
  HEALER = '힐러',
  BUFFER = '버퍼',
  DEBUFFER = '디버퍼',
  ALLROUNDER = '올라운더',
}

export interface BattlePosition {
  row: number; 
  col: number;
}

export type SkillTarget = 'single' | 'aoe' | 'self' | 'ally';

export interface DerivedStats {
  pAtk: number;
  mAtk: number;
  pDef: number;
  mDef: number;
  critChance: number;
    critDamage: number;
    critDmgResist: number; // 치명타 피해 감소 (%)
    critResist?: number; // 치명타 저항률 (%)
  statusResist: number;
  accuracy: number; // 명중률 (%)
  evasion: number;  // 회피율 (%)
    mAccuracy: number; // 마법 명중률 (%)
  mEvasion: number;  // 마법 회피율 (%)
    elemental: Record<string, ElementalStat>; // [NEW] 각 속성별 피해/저항 수치
    mythicOptions: (MythicOptionType | MagyeOptionType)[]; // [NEW] 신화 특별 옵션 목록
    combatStyleBonus?: boolean; // [NEW] 전투 계열 특화 무기 장착 보너스 (+10% 공격력) 적용 여부
    ctrlPenetration?: number; // 제어 관통력 (%)
    ctrlResist?: number; // 제어 저항력 (%)
}

export interface ActiveStatus {
  name: string;
  duration: number;
  effect: string;
  val?: number;
  imageUrl?: string;
  icon?: string;
  isDiminished?: boolean;
  diminishedRate?: number;
  statCategory?: string;
  rank?: number;
  originalEffect?: string;
  shinryokuType?: string;
  auraGroup?: 'full' | 'half';
  forceFullAura?: boolean; // 기운 초월(버프) 또는 기운 잠식(디버프) 적용 시 기운 불일치/일치 페널티 무시
}

export type WeaponCategory = 'Melee' | 'Ranged' | 'Magic' | 'Sub';
export type WeaponType = 
  | 'Sword' | 'Spear' | 'Blunt' | 'Axe' | 'Knuckle'
  | 'Bow' | 'Crossbow' | 'Thrown' | 'Firearm' | 'Heavy'
  | 'Staff' | 'Energy' | 'Grimoire'
  | 'Shield' | 'Orb' | 'SubSword';

export interface WeaponMastery {
  level: number;
  currentExp: number;
}

export interface Item {
  id?: string; // [NEW]
  visualUrl?: string; // [NEW]
  name: string;
  quantity?: number;
  type: 'Weapon' | 'SubWeapon' | 'Head' | 'Body' | 'Feet' | 'Hand' | 'Accessory' | 'Consumable' | 'Etc'
  weaponType?: WeaponType;
  elementalType?: string;
  rarity: ItemRarity;
  description: string;
  stats?: Partial<Stats>;
  enhancement?: number;
  maxEnhancement?: number;
  divineLevel?: number; 
  failureCount?: number;
  secondaryOptions?: string[];
  optionLevel?: number; // [NEW] 전체 옵션 레벨
  optionLevels?: number[];
  optionMaxLevels?: number[]; // [NEW] 각 옵션별 최대 레벨
  rerollCount?: number; // [NEW] 옵션 재설정 횟수
  stock?: number;
  reputationReq?: { faction: '엘프' | '수인' | '마인'; value: number };
  reputationPriceMod?: { faction: '엘프' | '수인' | '마인'; multiplier: number };
  price?: number;
  imageUrl?: string; 
  minLvl?: number; // [NEW] Added minLvl
  mythicOption?: MythicOptionType | MagyeOptionType; // [NEW] 신화 장비 특별 옵션
  originNation?: string; // [NEW] 출처 국가/지역
  locked?: boolean; // [NEW] 잠금 기능
  favorite?: boolean; // [NEW] 즐겨찾기 기능
  duration?: number; // [NEW] 물약/버프 지속시간
  isPromoted?: boolean; // [NEW] 이미 승급된 장비 여부
  bossBoost?: {
    isBoosted: boolean;
    multiplier?: number;
  };
}

export interface Skill {
  id?: string; // [NEW]
  name: string;
  description: string;
  tier: ClassTier;
  baseTier?: ClassTier | string; // [NEW] 조합 스킬 시 최소 클래스 기준 티어
  minClassTier?: ClassTier | string; // [NEW] 최소 클래스 티어
  type: SkillType;
  targetType?: SkillTarget;
  mpCost: number;
  baseMpCost?: number;
  level: number;
  maxLevel: number;
  currentMastery: number;
  effectFormula: string;
  powerRatio?: number;
  isBondSkill?: boolean; // [NEW] 인연 스킬 여부
  isCombatStyleSkill?: boolean; // [NEW] 전투 계열 장착 전용 스킬 여부
  combatStyleSource?: CombatStyle; // [NEW] 출처 전투 계열
  icon?: string; // [NEW] 스킬 썸네일 기본 아이콘명
  imageUrl?: string; // [NEW] 스킬 썸네일 커스텀 이미지 URL
  illustrationUrl?: string; // [NEW] 스킬 사용 발동 일러스트 URL/Base64
  videoUrl?: string; // [NEW] 스킬 사용 발동 이펙트 영상 URL/Base64 (mp4, webm 등)
  vfxTheme?: string; // [NEW] 스킬 타격 오라 & 이펙트 테마 (칠흑, 진홍, 백은, 네온 등)
  vfxColor?: string; // [NEW] 스킬 커스텀 이펙트 헥스/RGB 색상
  vfxShape?: string; // [NEW] 스킬 커스텀 이펙트 모양 (퍼스트~파이널 클래스 등급 제한 적용)
  buffType?: string; // [NEW] 버프/디버프 종류
  buffEffects?: any[]; // [NEW] 버프 세부 효과 목록
  debuffEffects?: { type?: 'STAT' | 'AILMENT'; stat?: string; value?: number; ailment?: string }[]; // [NEW] 디버프 세부 효과 목록
  passiveEffects?: Array<{ category: 'STAT' | 'COMBAT'; target: string; value: number; element?: string }>; // [NEW] 패시브 세부 효과 목록
  debuffStat?: string;
  debuffValue?: number;
  formulaOverride?: string;
  statusEffects?: ActiveStatus[]; // [NEW] 상태이상 효과 목록
  shinryokuType?: string; // [NEW] 스킬 속성 (신력 계통)
  frameAnimation?: SkillFrameAnimation; // [NEW] 플레이어 커스텀 프레임별 이펙트 애니메이션
  finalSkillSlot?: number; // [NEW] 파이널 클래스 생성 슬롯 번호 (1-based, 1~5는 1000레벨 슬롯, 6~10은 2000레벨 슬롯)
  finalEnhanceData?: FinalSkillEnhanceData; // [NEW] 파이널 클래스 슬롯 소모 스킬 강화 데이터
  isSummonSkill?: boolean; // [NEW] 소환 스킬 여부
  summonData?: {
    summonCount: number; // 소환 수량 (세컨드: 1, 라스트: 1~2, 파이널: 1~3)
    durationTurns: number; // 소환 유지 턴 수 (2~5턴)
    powerLevel: 'low' | 'medium' | 'high'; // 소환수 능력치 수준
    summonName: string; // 소환수 이름
    summonImageUrl?: string; // 소환수 이미지 (링크 혹은 업로드 base64)
    summonType?: string; // 소환수 분류
  };
}

export interface FinalSkillEnhanceData {
  totalEnhanceCount: number; // 총 누적 강화 횟수
  allocatedSlots: number[]; // 소모된 파이널 클래스 슬롯 번호 목록
  
  // 공격 스킬 전용 강화
  levelScaleBonus?: number; // 계수 한계 돌파 (강화 횟수당 +50% 증가)
  isAoEExpanded?: boolean; // 공격 범위 확장 (10회 이상 강화 시 선택 가능)
  isBattlefieldZone?: boolean; // 지속 전장 지대 생성 (태생 광역 스킬 10회 이상 강화 시 선택 가능)
  isFocusFusion?: boolean; // 집중 융합: 적 수 반비례 위력 증폭 (태생 광역 공격 스킬 10회 이상 강화 시 선택 가능)
  isEchoAftershock?: boolean; // 신력 여진: 시전 즉시 추가 폭발 타격 (태생 광역 공격 스킬 10회 이상 강화 시 선택 가능)
  armorPenetration?: number; // 특수 관통 효과 (강화 횟수당 +5% 증가)
  addedEffect?: any; // 추가된 버프 또는 디버프 슬롯 1개
  
  // 버프 및 회복 스킬 전용 강화
  isBuffAlliesExpanded?: boolean; // 아군 전체 광역화 (10회 이상 강화 시 선택 가능)
  buffZoneType?: 'HP' | 'MP'; // 버프 스킬 지속 결계 회복 종류 (체력/마나 회복)
  isMassCleanse?: boolean; // 일제 정화: 시전 시 아군 전체 상태이상 해제 (태생 광역 버프 스킬 10회 이상 강화 시 선택 가능)
  isAuraTranscend?: boolean; // 기운 초월: 다른 기운 아군에게도 감소 없이 버프 적용 (태생 광역 버프 스킬 10회 이상 강화 시 선택 가능)
  buffScaleBonus?: number; // 버프 비율 계수 증가 (강화 횟수당 +0.5% 증가)
  overhealShield?: boolean; // 초과 치유 보호막 전환
  addedBuffSlot?: any; // 원하는 버프 효과 슬롯 1개 추가 (중복 불가)
  durationExtended?: boolean; // 지속 턴 수 연장 (1회만 가능)
  
  // 디버프 스킬 전용 강화
  ctrlSuccessBonus?: number; // 상태이상 성공률 증가 (제어력 보너스 증가)
  chainWeakening?: boolean; // 연쇄 약화 (지속 피해량 대폭 증폭)
  debuffDurationExtended?: boolean; // 적 행동 봉쇄 강화 (지속 턴 수 연장)
  isDebuffAoEExpanded?: boolean; // 단일 -> 광역 전환 (10회 강화 시 가능)
  isAuraErosion?: boolean; // 기운 잠식: 같은 기운 적에게도 감소 없이 디버프 적용 (태생 광역 디버프 스킬 10회 이상 강화 시 선택 가능)
  isDefenseShatter?: boolean; // 방어 붕괴: 시전 시 적 전체 보호막·버프 1개 해제 (태생 광역 디버프 스킬 10회 이상 강화 시 선택 가능)
  debuffScaleBonus?: number; // 디버프 비율 스킬 레벨별 증가 (+0.5%씩 증가, 최대 90% 상한)

  // 패시브 스킬 전용 강화
  passiveScaleBonus?: number;
  passiveCombatSlot?: any;
  passiveElementalResonance?: any;
  passiveConditional?: any;
  passiveAuraShare?: boolean;

  // 공통 강화 (단일·광역 모두 가능)
  mpReductionStack?: number; // 스킬 레벨에 따른 MP 소모 감소량 증가 누적 횟수
  mpReductionAmountPerLevel?: number; // 티어별 스킬 레벨당 MP 소모 감소 수치
  tierAllocatedSlots?: Record<string, number>; // 티어별 소모 슬롯
}

export interface SkillAnimationFrame {
  id: string;
  imageUrl: string;
  x: number; // 가로 위치 오프셋 (px, 0: 중심)
  y: number; // 세로 위치 오프셋 (px, 0: 중심)
  width: number; // 가로 크기 (px, 기본 200)
  height: number; // 세로 크기 (px, 기본 200)
  scale?: number; // 배율 (기본 1.0)
  rotation?: number; // 회전 각도 (도, 기본 0)
  opacity?: number; // 불투명도 (0~1, 기본 1)
  duration: number; // 프레임 재생 시간 (ms, 기본 100ms)
  blendMode?: 'normal' | 'screen' | 'lighten' | 'overlay'; // 블렌드 합성 모드
}

export interface SkillFrameAnimation {
  enabled: boolean;
  frames: SkillAnimationFrame[];
  loopCount?: number; // 반복 횟수
  playbackSpeed?: number; // 배속
  playMode?: 'target' | 'fullscreen' | 'screen_center'; // 재생 위치 기준
  renderMode?: 'both' | 'frame_only' | 'vfx_only'; // 이펙트 발동 방식 (동시 발동, 프레임만 발동, 기본 이펙트만 발동)
}

export interface ActiveSummon {
  id: string;
  name: string;
  ownerId?: string;
  ownerName: string;
  imageUrl?: string;
  remainingTurns: number;
  maxTurns: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  tier: ClassTier;
  powerLevel: 'low' | 'medium' | 'high';
}

export interface BondSkill extends Skill {
    sourceId?: string; // [NEW] 시전자 ID (없으면 플레이어)
    sourceName?: string; // [NEW] 시전자 이름
    companionId: string;
    companionName: string;
    playerSkillName: string;
    companionSkillName: string;
    playerSkillRatio: number;
    playerSkillType: SkillType;
    companionSkillRatio: number;
    companionSkillType: SkillType;
    basePowerRatio?: number; // [NEW] 레벨 1 기준 기본 위력 비율
    playerSkillEffects?: ActiveStatus[];
    companionSkillEffects?: ActiveStatus[];
    fusedBuffEffects?: { name: string; effect: string; duration: number }[]; // [NEW] 결합 시 확정된 버프 스킬 효과 목록
    fusedDebuffEffects?: { name: string; effect: string; duration: number }[]; // [NEW] 결합 시 확정된 디버프 스킬 효과 목록
    hasSynergy?: boolean; // [NEW] 신력계통 조화 여부
}

export interface BuffConfig {
    type: 'HP_RECOV' | 'MP_RECOV' | 'STAT_BOOST' | 'CLEANSE' | 'RESURRECTION' | 'MANA_SHIELD' | 'ELEMENTAL_DMG_BOOST' | 'ELEMENTAL_RES_BOOST';
    targetStat?: string;
    targetElement?: string;
    value?: number; // percentage
    ailments?: string[]; // selected ailments for CLEANSE
}

export interface PregnancyData {
    isPregnant: boolean;
    conceptionDate: string;
    dueDate: string;
    partnerId?: string;
    partnerName?: string;
}

export interface ChildData {
    lastInteractionMonth?: string;
    academicScore?: number;
    parentNames?: string[]; 
    school?: {
        isEnrolled: boolean;
        name: string;
        nation: string;
        city: string;
        grade?: number;
    };
}

export enum MercenaryRank {
    F = 'F', E = 'E', D = 'D', C = 'C', B = 'B', A = 'A', S = 'S', SS = 'SS', SSS = 'SSS'
}

export interface GroupMission {
    id: string;
    questId: string;
    memberIds: string[]; 
    startTime: string;
    returnDate: string;
    rewardGold: number;
    rewardExp: number;
    title: string;
    successRate: number; 
}

export interface ArenaParticipant extends Companion {
    title: string;
    winCount: number;
    lossCount: number;
}

export interface ArenaMatch {
    round: number;
    opponent: ArenaParticipant;
    isWon?: boolean;
}

export interface GrandArenaState {
    year: number;
    currentRound: number; 
    history: ArenaMatch[];
    isEliminated: boolean;
    lastParticipationYear?: number;
}

export interface Criminal {
    id: string;
    name: string;
    title: string;
    nation: string;
    gender: string;
    infamy: number; 
    level: number;
    shinryokuType: string;
    classType: string;
    description: string;
    rewardGold: number;
    rewardExp: number;
    rewardReputation: number;
    visualUrl?: string;
    skills: Skill[];
    birthYear?: number;
}

export interface MercenaryData {
    rank: MercenaryRank;
    registeredDate: string;
    completedQuests: number;
    reputation: number;
    guildId: string;
    isGroupLeader: boolean;
    groupName?: string;
    groupMembers?: string[]; 
    groupMissions?: GroupMission[]; 
    activeQuests?: Quest[];
    availableQuests?: Quest[];
    availableRecruits?: Companion[];
    // [NEW] 인터뷰 쿨다운 관리용
    lastInterviewMonth?: string;
    lastRefreshDate?: string;
    lastRecruitRefreshDate?: string; // [NEW] 용병 모집 명단 한달에 한번 제한
        isViceCaptain?: boolean; // [NEW] 용병단 부단장 여부
    joinedGroupId?: string;
    lastTrainDate?: string; 
    arenaState?: GrandArenaState; 
    
    blacklist?: Criminal[];
    lastBlacklistRefreshYear?: number;
    checkedBlacklistIds?: string[]; // [NEW] 용병 길드에서 이미 확인한 수배범 ID 목록

    trackedCriminalId?: string;
    trackedCriminalCity?: string;

    pendingCriminal?: Criminal;
    // [NEW] 전사자 추적
    lastDeathDate?: string;
    lastCasualtyName?: string;
      lastCasualtyNation?: string; // [NEW] 전사자 국적
    lastCasualtySurname?: string; // [NEW] 전사자 성씨
        activeRumor?: RumorData; // [NEW] 주점의 뜬소문 추적 데이터
    expiredQuestNotifications?: string[]; // [NEW]
}

export interface MilitaryData {
    rank: MilitaryRank;
    enlistedDate: string;
    merit: number;
    completedMissions: number;
    assignedCity?: string;
    assignedDistrict?: string;
    activeMissions?: Quest[];
    availableMissions?: Quest[];
    availableRecruits?: Companion[]; // [NEW] 군인 충원 명단 보존
    lastRefreshDate?: string;
    lastRecruitRefreshDate?: string; // [NEW] 군인 충원 명단 한달에 한번 제한
    lastTrainDate?: string;
    lastOracleYear?: number;
    lastSalaryDate?: string;
    deputyId?: string;
        regionStats?: Record<string, RegionalStats>; // [NEW] 도시 관리 수치
    eliteMemberIds?: string[];
    royalGuardMemberIds?: string[];
    eliteCommanderId?: string;
    royalGuardCommanderId?: string;
    regionalAppointments?: Record<string, string>;
        regionalViceAppointments?: Record<string, string>; // [NEW] 지역 부대장 임명 데이터
    diplomacy?: Record<string, NationRelation>;
    lastDiplomacyUpdate?: string; 
    pendingInvasions?: string[]; 
     globalDiplomacy?: Record<string, DiplomaticStatus>; // [NEW] 국가 간 글로벌 외교 데이터 (NationA_NationB 키 사용)
        npcWarProgress?: Record<string, number>; // [NEW] NPC 국가 간 전쟁 진척도 (NationA_NationB 키 사용, -100 ~ 100)
    expiredMissionNotifications?: string[]; // [NEW]
}

export interface Quest {
    id: string;
    type: 'Subjugation' | 'Collection' | 'MilitaryPatrol' | 'MilitaryDefense' | 'MilitaryEscort' | 'MilitarySupply' | 'MilitaryRecon' | 'MilitaryInfiltration' | 'MilitaryAttackShare' | 'MilitaryDiplomaticEscort' | 'MilitaryWallRepair' | 'MilitaryDungeonSearch' | 'MilitaryNightPatrol' | 'MilitaryRegionalDefense' | 'Investigation' | 'Rescue' | 'DivineOracle' | 'RacialNatureProtection' | 'BeastArenaBattle' | 'DemonContract' | 'BountyHunt' | 'MercenaryEscort' | 'TemporaryInstructor' | 'EscortKing' | 'EscortNoble' | string; 
    rank: MercenaryRank | MilitaryRank | string; 
    title: string;
    goal: string;
    details: string;
    danger: 'Low' | 'Mid' | 'High' | 'Extreme';
    rewardGold: number;
    rewardExp: number;
    rewardMerit?: number;
    rewardFaith?: number;
    rewardElfRep?: number;
    rewardBeastRep?: number; 
    rewardDemonRep?: number; 
    hiddenCondition?: string;
    isSecret?: boolean;
    currentAmount?: number;
    targetAmount?: number;
    targetName?: string;
    targetNation?: string; // [NEW] 퀘스트 목표 국가
    targetCity?: string; // [NEW] 퀘스트 목표 도시
    targetClassTier?: ClassTier;
    templeKey?: string;
    isEmergency?: boolean;
    civilianToRescue?: SimpleStudent;
    level?: number;
    expiryDate?: string;
    startDate?: string; // [NEW] 의뢰 수락/시작 일자
    schoolName?: string; // [NEW]
    schoolTier?: '초급' | '중급' | '고급'; // [NEW]
    studentsToTeach?: SimpleStudent[]; // [NEW] 임시 교관 퀘스트에서 가르칠 학생들
    location?: { nation?: string; city?: string; region?: string }; // [NEW] 퀘스트 수행 지역/도시
    destination?: Location; // [NEW] 호송/호위 목적지
    isEscortStarted?: boolean; // [NEW] 호송 시작 여부
    targetShare?: number; // [NEW] 점유율 목표 수치 (%)
    initialShare?: number; // [NEW] 퀘스트 수락 시점의 초기 점유율 (%)
    requiredTotalShare?: number; // [NEW] 달성해야 하는 최종 전선 점유율 (%)
    requiredResource?: { name: string; amount: number }; // [NEW] 단일 자원 요구
    requiredResources?: { stone?: number; iron?: number; wood?: number; manaCrystal?: number; food?: number; gold?: number }; // [NEW] 복합 자원 요구
}

export enum RelationType {
    ALLY = '동료',
    FRIEND = '친구',
    BEST_FRIEND = '절친',
    RIVAL = '라이벌',
    CONFLICT = '갈등',
    ENEMY = '원수',
    FLIRT = '썸',
    LOVER = '연인',
    SPOUSE = '배우자',
    SIBLING = '형제자매',
    SWORN_SIBLING = '의형제/의자매',
    PAST_CONNECTION = '과거 인연'
}

export interface CompanionRelation {
    targetId: string;
    affection: number;
    type: RelationType;
    metYear?: number;
    isHalf?: boolean; // [NEW] 이복/이부 형제자매 여부 (부모 중 한 쪽만 일치)
}

export interface BestiaryEntry {
    encountered: boolean;
    defeatedCount: number;
}
export interface Companion {
  id: string;
  name: string;
  skillShortcuts?: string[];
  age: string;
  birthYear?: number;
  gender: string;
  race: string;
  hairStyle?: string;
  appearance: string;
  personality?: string;
  nation?: string;
  lastWorldNewsMonth?: string;
  job?: JobType;
  clubData?: ClubData;
  blacksmithRank?: BlacksmithRank; 
  blacksmithMastery?: number; 
  alchemistRank?: AlchemistRank;
  alchemistMastery?: number;
  trainerRank?: TrainerRank;
  trainerBranch?: TrainerBranch;
  trainerLevel?: number;
  trainerExp?: number;
  trainerMaxExp?: number;
  housekeeperRank?: HousekeeperRank;
  housekeeperExp?: number;
  housekeeperLevel?: number;
  lastHousekeeperCleanDate?: string;
  researcherTier?: number;
  militaryRank?: MilitaryRank;
  merit?: number;
  faith?: number; 
  classType: string;
  firstClassName?: string;
  firstClassDescription?: string;
  secondClassName?: string;
  secondClassDescription?: string;
  lastClassName?: string;
  lastClassDescription?: string;
  finalClassName?: string;
  finalClassDescription?: string;
  level: number;
  currentExp: number;
  maxExp: number;
  statPoints: number;
  fatigue?: number; // [NEW] 피로도
  classTier: ClassTier;
  hasClearedFirstTrial?: boolean;
  hasClearedSecondTrial?: boolean;
  hasClearedLastTrial?: boolean;
  hasClearedFinalTrial?: boolean;
  firstTrialCleared?: boolean;
  secondTrialCleared?: boolean;
  lastTrialCleared?: boolean;
  finalTrialCleared?: boolean;
  professions?: {
    farming?: ProfessionMastery;
    mining?: ProfessionMastery;
    research?: ProfessionMastery;
    alchemy?: ProfessionMastery;
    crafting?: ProfessionMastery;
    cooking?: ProfessionMastery;
    taming?: ProfessionMastery;
    breeding?: ProfessionMastery;
  };
  shinryokuType?: string;
  stats: Stats;
  skills: Skill[];
  statusEffects?: ActiveStatus[];
  equipment: {
    weapon?: Item;
    subWeapon?: Item;
    head?: Item;
    body?: Item;
    feet?: Item;
    hand?: Item;
    accessory?: Item;
  };
  inventory?: Item[];
  weaponMastery?: Partial<Record<WeaponType, WeaponMastery>>;
  affection: number;
  loyalty: number;
  base?: Base; // [NEW]
  chatHistory?: { role: 'user' | 'companion', text: string }[];
  isLover?: boolean;
  isSpouse?: boolean;
  isEternalRival?: boolean;
  partnerId?: string; 
  partnerName?: string; 
  loverStartDate?: string;
  jealousyCount?: number;
  hasExperiencedBurnoutEvent?: boolean;
  burnoutOvercome?: boolean;
  lastMarriageAttemptDate?: string;
  jobPersuadeCooldownDate?: string;
  breakupWarning?: boolean;
  pregnancy?: PregnancyData;
  childData?: ChildData;
  isDead?: boolean;
  trainerProfile?: any;
  currentTactics?: string;
  tacticsSkillFocus?: string; // [NEW] 스킬 위주 전술 세부 모드
  preferredSkillName?: string; // [NEW] 지정 스킬명
  tacticsHpThreshold?: number; // [NEW] 힐/지원 집중 시 HP 회복 스킬 발동 기준 체력 % (기본: 80)
  tacticsMpThreshold?: number; // [NEW] 힐/지원 집중 시 MP 회복 스킬 발동 기준 마나 % (기본: 50)
  battlePosition?: BattlePosition;
  battleRole?: BattleRole;
  secondaryBattleRole?: SecondaryBattleRole;
  roleProficiency?: Partial<Record<string, number>>;
  secondaryRoleProficiency?: Partial<Record<string, number>>;
  roleInactivityDays?: Partial<Record<string, number>>; // [NEW] 역할별 미수행 일수 카운터 (장기 미수행 시 숙련도 감소)
  isMonster?: boolean;
  monsterData?: CapturedMonster;
  mercenaryRank?: MercenaryRank;
  evolutionQuests?: Quest[];
  reputation?: number;
  infamy?: number; 
  isTemporary?: boolean; 
  factionId?: string; 
  isCoreMember?: boolean;
  isCustom?: boolean; // [NEW] 커스텀 동료 여부 (false/undefined: 일반 동료)
  isCustomMonster?: boolean; // [NEW] 커스텀 몬스터 여부
  liberationEligibility?: {
    first?: boolean;
    second?: boolean;
    last?: boolean;
    final?: boolean;
  };
  liberationPotential?: ClassTier; // [NEW] 자발적 클래스 해방 한계 포텐셜
  potentialAppraised?: boolean; // [NEW] 예언가 감정 완료 여부
  isPotentialLocked?: boolean; // [NEW] 잠재력 제한 설정 여부 (취소 불가, 해당 잠재력까지 스킬 슬롯 100레벨당 +1)
  bgmUrl?: string; // [NEW] 등장 및 턴 전용 BGM (MP3 or URL)
  combatStyle?: CombatStyle; // [NEW] 전투 계열
  targetCombatStyle?: CombatStyle; // [NEW] 현재 수련 목표로 지정된 전투 계열
  combatStyleProgress?: Record<string, CombatStyleProgressData>; // [NEW] 계열별 누적 수련 진행도
  favorite?: boolean; // [NEW] 동료 즐겨찾기 상태

  unlockedCombatStyles?: CombatStyle[]; // [NEW] 이미 해금되어 자유롭게 전환 가능한 전투 계열 목록
  hasDivineAwakened?: boolean; 
  respect?: number; // [NEW] 라이벌 전용 존중도
  isRival?: boolean; // [NEW] 라이벌 여부
  motto?: string; // [NEW] 좌우명
  socialNetwork?: SimpleStudent[]; // [NEW] 사회적 관계망
  relation?: RelationType; // [NEW] 플레이어와의 관계 유형
  metYear?: number; // [NEW] 처음 만난 연도
  relations?: Record<string, CompanionRelation>; 
  memories?: string[]; // [NEW] AI 기억 데이터
   isPurged?: boolean; // [NEW] 묘비명 패턴 플래그
  purgedReason?: string; // [NEW] 묘비명 사유
  customEpitaph?: string; // [NEW] 조문/추모 시 새긴 묘비명
  condolenceCount?: number; // [NEW] 누적 조문 횟수
  lastCondolenceDate?: string; // [NEW] 마지막 조문 날짜
  isImmortal?: boolean; // [NEW] 영생 여부
  isMagyeAwakeningUnlocked?: boolean; // [NEW] 마계 각성 여부
  isMountedAsMount?: boolean; // [NEW] 탈것으로 장착 중인지 여부
  visualUrl?: string; // [NEW] 동료의 비주얼 URL (몬스터인 경우 등)
  defaultVisualUrl?: string; // [NEW] 동료의 기본 비주얼 URL (생성 시 자동생성)
  godVisualChoice?: 'original' | 'transformed'; // [NEW] 신의 사자/마신 외형 선택 (유지/변환)
  originalVisualUrl?: string; // [NEW] 신의 사자/마신 전직 전 원본 외형 URL
  mountedMonsterId?: string; // [NEW] 탈것으로 장착한 몬스터 ID
  mountedMonster?: Companion; // [NEW] 탈것으로 장착한 몬스터 동료
  availableTitles?: string[]; // [NEW]
  equippedTitleId?: string; // [NEW]
  mercenaryData?: MercenaryData;
  militaryData?: MilitaryData;
  templeDiplomacy?: Record<string, DivineRelation>;
  divineRelations?: {
    god: { affection: number; status: string };
    temples: Record<string, { affection: number; status: string }>;
  };
  elfReputation?: number;
  beastReputation?: number;
  demonReputation?: number;
  magyeDominions?: Record<string, DominionData>;
  schoolData?: SchoolData;
  nationalFavorability?: Record<string, number>;
  lastKingQuestRefreshYear?: Record<string, number>;
  lastKingTreasuryYear?: Record<string, number>;
  lastKingPersonnelYear?: Record<string, number>;
  lastKingGoodwillDate?: Record<string, string>;
  royalPersonnel?: Record<string, any[]>;
  customNationLeaders?: Record<string, NationLeader>;
  isBlessed?: boolean; // [NEW] 축복받은 아이 (스탯 성장 2배)
    instantDungeons?: InstantDungeon[]; // [NEW] 인스턴트 던전 목록
    growthSettings?: {
        statAutoMode: 'manual' | 'auto';
        classAutoMode: 'manual' | 'auto';
        skillAutoMode: 'manual' | 'auto';
        statDistribution?: {
            hp: number;
            mp: number;
            str: number;
            int: number;
            agi: number;
            def: number;
            wis: number;
            ctrl: number;
        };
        preferredSkillType?: 'physical' | 'magic' | 'buff' | 'debuff' | 'passive';
        lastProcessed?: { level: number, statPoints: number, classTier?: ClassTier };
    };
}

export interface ElementalStat {
  atk: number; // 속성 피해량 배율 (기본 1.0)
  res: number; // 속성 저항력 배율 (기본 1.0)
}
export interface BaseResources {
  gold: number;
  wood: number;
  stone: number;
  iron: number;
  manaStone: number;
  manaCrystal: number;
  food: number;
  herbs: number;
  normalCrystal: number;
  magicCrystal: number;
  rareCrystal: number;
  epicCrystal: number;
  uniqueCrystal: number;
  legendaryCrystal: number;
  wheat?: number; // [NEW] 밀
  corn?: number; // [NEW] 옥수수
  potato?: number; // [NEW] 감자
  mana_fruit?: number; // [NEW] 마력 열매
  rice?: number; // [NEW] 쌀
  sweet_potato?: number; // [NEW] 고구마
  onion?: number; // [NEW] 양파
  garlic?: number; // [NEW] 마늘
  lettuce?: number; // [NEW] 상추
  shinryoku_flower?: number; // [NEW] 신력 꽃
  shinryoku_shard?: number; // [NEW] 신력 계통 조각
  carrot?: number; // [NEW] 당근
  cabbage?: number; // [NEW] 배추
  tomato?: number; // [NEW] 토마토
  strawberry?: number; // [NEW] 딸기
  grape?: number; // [NEW] 포도
  watermelon?: number; // [NEW] 수박
  ginseng?: number; // [NEW] 인삼
  mandrake?: number; // [NEW] 만드라고라
  world_tree_branch?: number; // [NEW] 세계수의 가지
  golden_apple?: number; // [NEW] 황금 사과
  gold_ore?: number; // [NEW] 금광석
  silver_ore?: number; // [NEW] 은광석
  diamond?: number; // [NEW] 다이아몬드
  ruby?: number; // [NEW] 루비
  sapphire?: number; // [NEW] 사파이어
  emerald?: number; // [NEW] 에메랄드
  holy_stone?: number; // [NEW] 신성석
}

export enum MonsterStage {
    EGG = '알',
    BABY = '유아기',
    CHILD = '성장기',
    ADULT = '성숙기',
    PERFECT = '완전체',
    ULTIMATE = '궁극체',
    SUPER_ULTIMATE = '초궁극체'
}

export interface CapturedMonster extends Enemy {
    id: string;
    rank: 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
    affection: number;
    isTamed: boolean;
    capturedDate: string;
    disposition?: '온순' | '중립' | '공격적';
    production?: string;
    slaughterProduct?: string; // [NEW] 도축 시 얻는 아이템
    stage?: MonsterStage;
    hunger?: number;
    cleanliness?: number;
    trainingLog?: { str: number, int: number, def: number, agi: number, magic: number };
    evolutionReady?: boolean;
    currentExp?: number;
    maxExp?: number;
    statPoints?: number;
    height?: number;
    weight?: number;
    appearance?: string;
    hatchDueDate?: string;
    nickname?: string;
    isCustomMonster?: boolean;
    visualUrl?: string;
    stageSkillsCreated?: Record<string, boolean>;
    assignedBreederId?: string; // 전담 사육사 동료 ID
    assignedBreederName?: string; // 전담 사육사 이름
    dedicatedTrainingStat?: 'str' | 'def' | 'int' | 'agi' | 'wis' | 'ctrl' | 'hp' | 'mp'; // 전담 훈련 지정 능력치
}

export interface Location {
    region: string;
    nation: string;
    city: string;
}
export type GameLocation = Location;

export interface SocialAppointment {
    id: string; // 고유 ID
    targetId: string;
    targetName: string;
    targetVisualUrl?: string;
    targetJob?: string;
    targetClassType?: string;
    location: Location;
    district: string; // 'Residential' (거주구역)
    appointmentDate: string; // 약속 생성일 YYYY-MM-DD
    appointmentTime?: string; // 약속 시간대 (HH:mm 포맷, 예: '12:00', '19:00' 등)
    themeName?: string; // 약속 테마 (한글 표기, 예: "점심 식사 약속", "노을 산책" 등)
    type: 'meet' | 'duel'; // 일반 만남 or 결투
    status: 'pending' | 'completed' | 'cancelled' | 'rejected' | 'missed';
    locationType?: 'inyeon' | 'midpoint' | 'player';
    affectionBonus?: number;
    proposedBy?: 'player' | 'npc';
    isAcceptedByPlayer?: boolean;
    note?: string;
}

export interface ExpeditionTeamMember {
    companionId: string;
    role: 'tanker' | 'dealer' | 'supporter' | 'allrounder' | 'none';
    position: 'front' | 'mid' | 'back';
}

export interface DispatchMission {
    id: string;
    companionId: string;
    destination: Location;
    startTime: string;
    durationMonths: number;
    expectedReturnDate: string;
    status: 'Normal' | 'Difficult' | 'Critical';
    dangerCounter: number;
    rewards?: { gold: number, items: Item[], merit?: number };
    successRate: number; 
    missionType?: string; 
    // [NEW] 원정대(Expedition) 전용 추가 데이터
    expeditionDifficulty?: string;
    expeditionTargetName?: string;
    targetType?: 'dungeon' | 'hunt_zone';
    huntZoneId?: string;
    targetLevelRange?: [number, number];
    teamMembers?: ExpeditionTeamMember[];
    // [NEW] 긴급 지원 급파 대원 정보
    supportCompanionId?: string;
    supportCompanionName?: string;
    supportCompanionLevel?: number;
    supportDate?: string;
    // [NEW] 스카우트 파견 전용 정보
    scoutTargetJob?: JobType;
    scoutTargetNation?: string;
    scoutTargetCity?: string;
}

export interface TemplePersonnel {
    priestId?: string;
    priestAssignmentDate?: string; 
    subPriestId?: string;
    knightIds: string[];
    butlerIds: string[];
    maidIds: string[];
    majesty?: number; 
}

export interface SimpleStudent {
    id: string;
    name: string;
    age: string;
    birthYear?: number;
    gender: string;
    race: string;
    nation: string;
    level: number;
    personality: string;
    appearance: string;
    stats: Partial<Stats>;
    affection: number;
    shinryokuType?: string; // [NEW] 신력 계통 정보 추가
    respect?: number; // [NEW] 라이벌 전용 존중도
    tension?: number; // [NEW] 라이벌 전용 긴장도
    isRival?: boolean;
    isEternalRival?: boolean;
    isPastConnection?: boolean; // [NEW] 과거 인연 여부
    classType: string;
       childData?: ChildData;
    classNumber?: number; // [추가] 이 학생이 현재 몇 반인지 저장 (1~5)
    chatHistory?: { role: 'user' | 'model', text: string }[]; // [NEW] 학생과의 대화 기록
    memories?: string[]; // [NEW] AI 기억 데이터
    metYear?: number; // [NEW] 처음 만난 연도
    job?: JobType;
    militaryRank?: MilitaryRank;
    visualUrl?: string; // [NEW] 시각적 이미지 URL
    merit?: number;
    mercenaryRank?: MercenaryRank;
    infamy?: number;
    goodWill?: number;
    alignment?: 'GOOD' | 'EVIL' | 'NEUTRAL';
    reputation?: number;
    classTier?: ClassTier;
    combatStyle?: CombatStyle; // [NEW] 전투 계열
    lastMentoringDate?: string; // [NEW] 최근 교관 지도(조언/칭찬) 일자
    isSpouse?: boolean;
  partnerId?: string; 
      isStaticRank?: boolean; // [NEW] 성장 엔진에 의한 자동 계급 변동(강등) 방지 플래그
        lastRecruitAttemptMonth?: string; // [NEW] 영입 실패 쿨다운 기록
            blacksmithRank?: BlacksmithRank; // [NEW] 대장장이 등급
    blacksmithMastery?: number; // [NEW] 대장장이 숙련도
    alchemistRank?: AlchemistRank; // [NEW] 연금술사 등급
    alchemistMastery?: number; // [NEW] 연금술사 숙련도
    trainerRank?: TrainerRank;
    trainerBranch?: TrainerBranch;
    trainerLevel?: number;
    trainerExp?: number;
    trainerMaxExp?: number;
    origin?: string;
    originName?: string;
    isPurged?: boolean; // [NEW] 묘비명 패턴 플래그
    isDead?: boolean; // [NEW] 사망 여부
    purgedReason?: string; // [NEW] 묘비명 사유
    customEpitaph?: string; // [NEW] 조문/추모 시 새긴 묘비명
    condolenceCount?: number; // [NEW] 누적 조문 횟수
    lastCondolenceDate?: string; // [NEW] 마지막 조문 날짜
    isImmortal?: boolean; // [NEW] 영생 여부
    liberationEligibility?: {
      first?: boolean;
      second?: boolean;
      last?: boolean;
      final?: boolean;
    };
    liberationPotential?: ClassTier; // [NEW] 자발적 클래스 해방 한계 포텐셜
     statusEffects?: ActiveStatus[]; // [NEW] 사회적 관계망 NPC들의 상태 저장용
  skills?: Skill[]; // [NEW] 사회적 관계망 NPC들의 스킬셋 저장용
  skillShortcuts?: string[]; // [NEW] 전투 스킬 및 아이템 숏컷 단축버튼 등록 목록 (최대 10개)
 availableTitles?: string[]; // [NEW]
  equippedTitleId?: string; // [NEW]
   // [NPC 사회화 추가 필드]
     lastInteractionDate?: string; // [NEW] 유대 수치 감소용 마지막 교류일
       relations?: Record<string, CompanionRelation>; // [NEW] NPC 간의 관계 정보를 저장합니다.
    rivalData?: EternalRivalStatusData; // [NEW] 영원의 라이벌 전용 상세 데이터 (동료 및 현황)
}

export interface EternalRivalCompanion {
    id: string;
    name: string;
    role: string;
    level: number;
    job?: string;
    shinryokuType?: string;
    personality?: string;
    joinedReason?: string;
    visualUrl?: string;
}

export interface EternalRivalStatusData {
    currentLocation: string;
    currentActivity: string;
    targetGoal: string;
    recentFeats: string[];
    partyMembers: EternalRivalCompanion[];
    totalDuelsCount?: number;
    playerWins?: number;
    rivalWins?: number;
    lastDuelDate?: string;
    infamy?: number; // 악명도 (악행)
    goodWill?: number; // 선한 영향력 (선행)
    alignment?: 'GOOD' | 'EVIL' | 'NEUTRAL'; // 성향 고정 상태
}

export interface TournamentMatch {
    id: number;
    round: number;
    p1: string;
    p2: string;
    winner?: string;
}

export interface TournamentState {
    isActive: boolean;
    name: string;
    key: string;
    currentRound: number;
    maxRound: number;
    reward?: { exp: number, gold: number };
    bracket?: TournamentMatch[];
    opponentName?: string;
}

export interface TournamentHistory {
    schoolPlacement: number;
    nationalPlacement: number;
    worldPlacement: number;
}

export interface TournamentPostMatchData {
    tournamentType: 'school' | 'arena';
    tournamentName: string;
    roundLabel: string;
    opponent: {
        id?: string;
        name: string;
        level: number;
        gender?: string;
        race?: string;
        nation?: string;
        stats?: Partial<Stats>;
        shinryokuType?: string;
        combatStyle?: CombatStyle;
        job?: JobType;
        mercenaryRank?: MercenaryRank;
        visualUrl?: string;
        description?: string;
    };
    nextStepTitle?: string;
    nextStepMsg?: string;
}

export interface SchoolData {
    tier: SchoolTier;
    grade: number;
    classNumber: number;
    semester: 1 | 2;
    midtermPassed: boolean; 
    finalPassed: boolean;
    examsPassed?: number; 
    classmates: SimpleStudent[];
    homeroomTeacher?: SimpleStudent; // [NEW] 담임 교사 정보
    rank: number;
    reputation: number;
    isGraduated: boolean;
    enrolled?: boolean; // [NEW] 재학 여부
    schoolName: string;
    schoolLocation?: string;
    warnings?: number;
    penaltyStatus?: 'None' | 'Suspended' | 'Expelled';
    lastExamDate?: string; 
    lastTournamentDate?: string; 
    lastClubActivityDate?: string;
    lastTrainingDate?: string; // [NEW] 월간 훈련 제한용 필드
    currentTournament?: TournamentState;
    tournamentHistory?: TournamentHistory;
      lastScholarshipDate?: string; // [NEW] 장학금 수령 기록 (YYYY-MM)
}

// [NEW] 인터뷰 관련 타입
export interface InterviewQuestion {
  question: string;
  isDirectAnswer?: boolean; // [NEW] 주관식 답변 여부
  options: {
    text: string;
    meritGain?: number;
    repGain?: number;
    infamyGain?: number;
    reaction: string; // 기자의 반응 혹은 서사
  }[];
}

export interface InterviewData {
  id: string;
  interviewer: string;
  interviewerTitle: string;
  topic: string;
  questions?: InterviewQuestion[]; // [MODIFIED] 초대장 상태 지원을 위해 옵셔널로 변경
}

export interface ChoiceEvent {
    id: string;
    title: string;
    description: string;
    image?: string;
    options: {
        text: string;
        action: string; // "stats_gain", "affection_gain", etc.
        outcome: string; // 서사적 결과 텍스트
        callbackId: string;
    }[];
}

export interface ProfessionMastery {
  level: number;
  exp: number;
  maxExp: number;
}

export interface TacticalPreset {
  id: string; // '1' | '2' | '3' | '4' | '5'
  name: string; // e.g., "1전술", "2전술" ...
  player: {
    battleRole?: BattleRole;
    secondaryBattleRole?: SecondaryBattleRole;
    battlePosition?: BattlePosition;
    currentTactics?: string;
    tacticsSkillFocus?: string;
    preferredSkillName?: string;
    tacticsHpThreshold?: number;
    tacticsMpThreshold?: number;
  };
  companions: {
    id: string;
    name: string;
    battleRole?: BattleRole;
    secondaryBattleRole?: SecondaryBattleRole;
    battlePosition?: BattlePosition;
    currentTactics?: string;
    tacticsSkillFocus?: string;
    preferredSkillName?: string;
    tacticsHpThreshold?: number;
    tacticsMpThreshold?: number;
  }[];
}

export interface Character {
  id?: string;
  name: string;
  age: string;
  birthYear?: number;
  gender: string;
  race: string;
  hairStyle: string;
  appearance: string;
  shinryokuType: string;
  nation: string;
  personality: string;
  motto?: string;
  job: JobType;
  clubData?: ClubData;
  blacksmithRank?: BlacksmithRank; 
  blacksmithMastery?: number; 
  alchemistRank?: AlchemistRank;
  alchemistMastery?: number;
  trainerRank?: TrainerRank;
  trainerBranch?: TrainerBranch;
  trainerLevel?: number;
  trainerExp?: number;
  trainerMaxExp?: number;
  housekeeperRank?: HousekeeperRank;
  housekeeperExp?: number;
  housekeeperLevel?: number;
  researcherTier?: number;
  faith?: number; 
  infamy?: number; 
  fame?: number; // [NEW] 명성
  elfReputation?: number; // [NEW] 엘프 평판 (0-100)
  beastReputation?: number; // [NEW] 수인 평판 (0-100)
  demonReputation?: number; // [NEW] 마인 평판 (0-100)
  militaryRank?: MilitaryRank;
  militaryData?: MilitaryData; 
  templeDiplomacy?: Record<string, DivineRelation>; // [NEW] 성전 전용 외교 데이터
  magyeDominions?: Record<string, DominionData>; // [NEW] 마계 통치 데이터
  nationalFavorability?: Record<string, number>; // [NEW] 국가별 국왕 호감도 (0-1000)
  lastKingQuestRefreshYear?: Record<string, number>; // [NEW] 국가별 마지막 국왕 퀘스트 갱신 연도
  lastKingTreasuryYear?: Record<string, number>; // [NEW] 국가별 마지막 왕실 보물고 이용 연도
  lastKingPersonnelYear?: Record<string, number>; // [NEW] 국가별 마지막 왕실 인물 소개 연도
  lastKingGoodwillDate?: Record<string, string>; // [NEW] 국가별 마지막 국왕 친선 표시 날짜 (YYYY-MM)
  shopStock?: Record<string, number>; // [NEW] 상점 물품 재고 (key: item.name + city + shopType)
  lastShopResetYear?: number; // [NEW] 마지막 상점 재고 초기화 연도
  royalPersonnel?: Record<string, any[]>; // [NEW] 국가별 생성된 왕실 인물 목록
  customNationLeaders?: Record<string, NationLeader>; // [NEW] 플레이어에 의해 변경된 국가 지도자
  divineRelations?: {
    god: { affection: number; status: string };
    temples: Record<string, { affection: number; status: string }>;
  }; // [NEW] 신성 관계 데이터
  currentDate?: string;
  currentTime?: string; // [NEW] 현재 시각 (HH:mm 형식, 기본 08:00)
  fatigue?: number; // [NEW] 피로도 (0-100, 100 도달 시 과로로 모든 능력치 50% 감소)
  messages?: any[]; // [NEW] 가문 서신 및 시스템 기록 메시지 보관함
  bufferedTimeSkipReports?: any[]; // [NEW] 던전/전투 중 발생한 일일 결산 완충 보관용
  pendingDeceasedAlerts?: DeceasedAlertInfo[]; // [NEW] 자연사 발생 알림 대기 목록
  currentLocation?: Location;
  schoolData?: SchoolData;
  mercenaryData?: MercenaryData;
  lastAuctionDate?: string;
  lastBossRumorDate?: string;
  pregnancy?: PregnancyData;
  pendingConfessionCompanionId?: string;
  classType?: string;
  firstClassName: string;
  firstClassDescription: string;
  secondClassName?: string;
  secondClassDescription?: string;
  lastClassName?: string;
  lastClassDescription?: string;
  finalClassName?: string;
  finalClassDescription?: string;
  level: number;
  currentExp: number;
  maxExp: number;
  stats: Stats;
  battlePosition?: BattlePosition;
  battleRole?: BattleRole;
  secondaryBattleRole?: SecondaryBattleRole;
  roleProficiency?: Partial<Record<string, number>>;
  secondaryRoleProficiency?: Partial<Record<string, number>>;
  roleInactivityDays?: Partial<Record<string, number>>; // [NEW] 역할별 미수행 일수 카운터
  currentTactics?: string; // [NEW]
  tacticsSkillFocus?: string; // [NEW] 스킬 위주 전술 세부 모드
  preferredSkillName?: string; // [NEW] 지정 스킬명
  tacticsHpThreshold?: number; // [NEW] 힐/지원 집중 시 HP 회복 스킬 발동 기준 체력 % (기본: 80)
  tacticsMpThreshold?: number; // [NEW] 힐/지원 집중 시 MP 회복 스킬 발동 기준 마나 % (기본: 50)
  lastHuntingBandId?: string; // [NEW] 마지막으로 탐색/전투를 진행한 사냥터 밴드 ID
  mountedMonsterId?: string; // [NEW] 탈것으로 장착한 몬스터 ID
  mountedMonster?: Companion; // [NEW] 탈것으로 장착한 몬스터 동료
  visualUrl?: string; // [NEW] 캐릭터의 비주얼 URL
  godVisualChoice?: 'original' | 'transformed'; // [NEW] 신의 사자/마신 외형 선택 (유지/변환)
  originalVisualUrl?: string; // [NEW] 신의 사자/마신 전직 전 원본 외형 URL
  bgmUrl?: string; // [NEW] 플레이어 고유 등장 및 턴 전용 BGM (MP3 or URL)
  classTier: ClassTier;
  liberationPotential?: ClassTier; // [NEW] 플레이어 잠재력 한계 등급 (기지 잠재력 돌파소에서 돌파 가능)
  potentialAppraised?: boolean; // [NEW] 잠재력 감정 완료 여부
  liberationEligibility?: {
    first?: boolean;
    second?: boolean;
    last?: boolean;
    final?: boolean;
  };
  hasClearedFirstTrial?: boolean;
  hasClearedSecondTrial?: boolean;
  hasClearedLastTrial?: boolean;
  hasClearedFinalTrial?: boolean; // [NEW] 기지 잠재력 돌파소 최후의 시련(신의 사자 모형) 통과 여부
  firstTrialCleared?: boolean;
  secondTrialCleared?: boolean;
  lastTrialCleared?: boolean;
  finalTrialCleared?: boolean; // [NEW] 최후의 시련 통과 플래그
  combatStyle?: CombatStyle; // [NEW] 전투 계열
  targetCombatStyle?: CombatStyle; // [NEW] 현재 수련 목표로 지정된 전투 계열
  combatStyleProgress?: Record<string, CombatStyleProgressData>; // [NEW] 계열별 누적 수련 진행도
  unlockedCombatStyles?: CombatStyle[]; // [NEW] 이미 해금되어 자유롭게 전환 가능한 전투 계열 목록
  skills: Skill[];
  skillShortcuts?: string[]; // [NEW] 전투 스킬 및 아이템 숏컷 단축버튼 등록 목록 (최대 10개)
  statusEffects?: ActiveStatus[];
  weaponMastery?: Partial<Record<WeaponType, WeaponMastery>>;
  equipment: {
    weapon?: Item;
    subWeapon?: Item;
    head?: Item;
    body?: Item;
    feet?: Item;
    hand?: Item;
    accessory?: Item;
  };
  characterUpdate?: any; 
  inventory: Item[];
  statPoints: number;
  companions: Companion[];
  inactiveCompanions?: Companion[];
  deceasedCompanions?: Companion[]; // [NEW] 사망한 동료 목록 (고인명단용)
  hasEternalRivalDied?: boolean;
  bondSkills?: BondSkill[]; // [NEW] 인연 스킬 목록
  bondGauges?: Record<string, number>; // [NEW] 인연 게이지 (bondSkillId -> gauge %)
  money: number;
  base?: Base;
  professions?: {
    cooking?: ProfessionMastery;
    mining?: ProfessionMastery;
    farming?: ProfessionMastery;
    research?: ProfessionMastery;
    alchemy?: ProfessionMastery;
    crafting?: ProfessionMastery;
    taming?: ProfessionMastery;
    breeding?: ProfessionMastery;
  };
  optionMaxLevel?: number; // [NEW] 옵션 강화 최대 레벨
  hasDivineAwakened?: boolean; 
  availableElfQuests?: Quest[]; 
  lastElfQuestRefreshDate?: string; 
  availableElfRecruits?: Companion[];
  lastElfRecruitRefreshDate?: string;
  availableBeastQuests?: Quest[]; 
  lastBeastQuestRefreshDate?: string; 
  availableBeastRecruits?: Companion[];
  lastBeastRecruitRefreshDate?: string;
  availableDemonQuests?: Quest[]; 
  lastDemonQuestRefreshDate?: string; 
  availableDemonRecruits?: Companion[];
  lastDemonRecruitRefreshDate?: string; 
  availableDemonSlaves?: Companion[];
  lastDemonSlaveRefreshDate?: string;
  evolutionQuests?: Quest[];
  demonMiningContractEndDate?: string; 
  demonMiningDailySupply?: number; // [NEW] 마인 마정석 계약 일일 기지 공급량 (30 + 추가 신용도)
  elfWoodContractEndDate?: string;
  elfWoodDailySupply?: number; // [NEW] 엘프 목재 계약 일일 기지 공급량 (30 + 추가 평판)
  beastStoneContractEndDate?: string;
  beastStoneDailySupply?: number; // [NEW] 수인 석재 계약 일일 기지 공급량 (30 + 추가 평판)
  beastIronContractEndDate?: string;
  beastIronDailySupply?: number; // [NEW] 수인 철광석 계약 일일 기지 공급량 (30 + 추가 평판)
  pendingDefenseEvent?: { enemies: Enemy[], log: string, source: string, targetNation: string, targetCity: string };
  pendingBaseAttackEvent?: { enemies: Enemy[], log: string, enemyPower: number };
  wantedClearanceCity?: string; 
  memories?: string[]; // [NEW] AI 기억 데이터
  severedRelations?: string[]; // [NEW] 손절한 인연 목록 (ID 리스트)
  isGodDefeated?: boolean; // [NEW] 신 처단 여부
  isCommunicationUnlocked?: boolean; // [NEW] 차원 교신 개방 여부
  usedDimensionCodes?: string[]; // [NEW] 중복 코드 사용 방지 리스트
  lastReactionRefreshDate?: string; // [NEW] 세상의 소리 마지막 갱신일 (YYYY-MM-DD)
  savedReactions?: (WorldReaction | NewsArticle)[]; // [NEW] 저장된 소문 게시물 (기사 포함)
   isImmortal?: boolean; // [NEW] 영생 여부
  // [NEW] 인터뷰 관련 필드
  pendingInterviews?: InterviewData[];
  lastInterviewRequestMonth?: string;
  lastWorldNewsMonth?: string; // [NEW] 월간 세계 정세 뉴스 마지막 확인 월 (YYYY-MM)
  pendingWorldNews?: WorldNewsItem[]; // [NEW] 월 변경 시 팝업 대기 중인 세계 정세 뉴스
  economicState?: WorldEconomicState; // [NEW] 실시간 대륙 시장 경제 및 전쟁 물가 상태
  lastInterviewDate?: string;

  // [PLAN 1] 사회적 관계망 (평생 인연)
  socialNetwork?: SimpleStudent[];
  socialAppointments?: SocialAppointment[]; // [NEW] 사회적 약속 목록
  nightMarketMonthlyHistory?: { month: string; purchases: Record<string, number> }; // [NEW] 심야 암시장 월간 구매 내역 (월 1회 갱신)
  isDead?: boolean; // [NEW] 부활 시스템용 사망 상태 플래그
  trainerProfile?: any;
      isMagyeAwakeningUnlocked?: boolean; // [NEW] 마계 각성 여부
  childData?: ChildData; // [NEW] 자녀 데이터
  isBlessed?: boolean; // [NEW] 축복받은 아이 (스탯 성장 2배)
  isMountedAsMount?: boolean; // [NEW] 탈것 장착 여부
  growthSettings?: {
    statAutoMode: 'manual' | 'auto';
    classAutoMode: 'manual' | 'auto';
    skillAutoMode: 'manual' | 'auto';
    statDistribution?: {
      hp: number;
      mp: number;
      str: number;
      int: number;
      agi: number;
      def: number;
      wis: number;
    };
  };
  pendingMagyeRevolt?: MagyeRevolt; // [NEW] 마계 하극상 이벤트 데이터
  pendingMagyeDivineWar?: MagyeDivineWar; // [NEW] 마계-신계 전쟁 이벤트 데이터
    pendingAmbush?: { enemies: Enemy[], sourceId: string, title?: string, message?: string }; // [NEW] 과거 인연 기습 이벤트 데이터
  queuedAmbush?: { enemies: Enemy[], sourceId: string, title?: string, message?: string }; // [NEW] 대기 중인 인연 기습 이벤트
  queuedAmbushes?: { enemies: Enemy[], sourceId: string, title?: string, message?: string }[]; // [NEW] 대기 중인 다중 기습/결투 이벤트 대기열
  queuedBaseAttackEvent?: { enemies: Enemy[], log: string, enemyPower: number }; // [NEW] 대기 중인 기지 습격 이벤트
  militaryOverdueDays?: number; // [NEW] 부대 유지비 연속 체납 일수
  pendingChoiceEvent?: ChoiceEvent; // [NEW] 선택형 이벤트 데이터
           pendingInstructors?: SimpleStudent[]; // [NEW] 임시 교관 데이터 보관용
               hasMetLegendaryGraduate?: boolean; // [NEW] 전설적인 졸업생 이벤트 발생 여부
                availableTitles?: string[]; // [NEW]
  equippedTitleId?: string; // [NEW]
    bestiary?: Record<string, BestiaryEntry>;
    pendingSchoolQuest?: { questId: string, schoolName: string, tier: string, rewards: { gold: number, exp: number }, statGains: any, studentsToTeach?: SimpleStudent[] }; // [NEW]
    instantDungeons?: InstantDungeon[]; // [NEW]
    trackedQuestIds?: string[]; // [NEW] 퀘스트 추적 UI용 ID 목록
    clearedDungeonsByCity?: Record<string, string>; // [NEW] 도시별 마지막 클리어 날짜 (CityName -> YYYY-MM-DD)
    paidTollsToday?: string[]; // [NEW] 오늘 통행료를 지불한 도시 목록
    lastTollPaidDate?: string; // [NEW] 마지막으로 통행료를 지불한 날짜 (YYYY-MM-DD)
    activeBlackMarket?: BlackMarketData; // [NEW] 월간 암시장 정보
    tacticalPresets?: TacticalPreset[]; // [NEW] 전술 슬롯 리스트
  dungeonProgress?: {
        currentIndex: number;
        currentNodeId?: string;
        selectedPath?: string[];
        currentFloor?: number;
        nodes: any[];
        nation: string;
        dungeonId?: string; // [NEW]
        obtainedBossLoots?: any[];
        bossBattlePreInventory?: string[];
        gridDungeon?: any;
    };
    systemSettings?: SystemSettings; // [NEW] 게임 시스템 및 시뮬레이션 설정
}

export interface SystemSettings {
  disableCommonCompanionInteraction?: boolean; // [NEW] 일반동료 자율 상호교류 비활성화 (동료 수가 많을 때 연산 최적화)
  combatSpeed?: 'fast' | 'normal';
  defaultPlayerAuto?: boolean;
  defaultCompanionAuto?: boolean;
  disableSkillEffects?: boolean;
  disableBackdropBlur?: boolean;
  disableScreenShake?: boolean;
}

/**
 * 일반 동료 판별 헬퍼 함수
 * - 커스텀 동료(isCustom), 핵심 동료(isCoreMember), 배우자(isSpouse), 연인(isLover), 자녀(childData), 즐겨찾기(favorite)는 제외
 */
export const isCommonCompanion = (comp: Companion): boolean => {
  return !comp.isCustom && !comp.isCoreMember && !comp.isSpouse && !comp.isLover && !comp.childData && !comp.favorite;
};

/**
 * 일반 동료 간 상호교류 비활성화 여부 확인 헬퍼 함수
 */
export const isCommonCompanionInteractionDisabled = (character?: Character): boolean => {
  if (character?.systemSettings?.disableCommonCompanionInteraction !== undefined) {
    return character.systemSettings.disableCommonCompanionInteraction;
  }
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('game_disable_common_companion_interaction') === 'true';
  }
  return false;
};

export interface Enemy {
  id?: string;
  name: string;
  level?: number; 
  hp: number;
  maxHp: number;
  stats?: Stats; 
  statusEffects: ActiveStatus[];
  description?: string;
  shinryokuType?: string;
  skills?: Skill[];
  combatStyle?: CombatStyle; // [NEW] 전투 계열
  visualUrl?: string; 
  job?: JobType | string; // [NEW] PVP 또는 네임드 직업
  gender?: string; // [NEW] 성별
  equippedTitleId?: string;
  isBoss?: boolean;
  equipment?: { [key: string]: Item | undefined };
  mountedMonster?: Companion;
  passiveSkills?: Skill[];
  mythicOptions?: (MythicOptionType | MagyeOptionType)[];
  dropTable?: Item[]; // [NEW]
  production?: string; // [NEW]
  slaughterProduct?: string; // [NEW]
  imageUrl?: string;
  isRiftCrystal?: boolean;
  isRivalEscort?: boolean;
  isRivalCombat?: boolean;
  isRivalLeader?: boolean;
  isSparringPartner?: boolean;
  detailedLoot?: Item | Item[]; // [NEW] 보스전용 전리품 세부 정보
  critResist?: number; // 치명타 저항률 (%)
  critDmgResist?: number; // 치명타 피해 감소율 (%)
}

export interface CombatTurnUnit {
  id: string; // 'player', companion.id, `enemy_${index}`, or `summon_${index}`
  name: string;
  unitType: 'player' | 'companion' | 'enemy' | 'summon';
  companionIndex?: number;
  enemyIndex?: number;
  summonIndex?: number;
  agility: number;
  isDead: boolean;
  visualUrl?: string;
  shinryokuType?: string;
}

export interface CombatState {
  enemies: Enemy[];
  turn: number;
  log: string[];
  isEnded?: boolean;
  isOneOnOne?: boolean;
  trialTier?: ClassTier;
  challengerCompanionId?: string;
  type?: 'normal' | 'exam_mid' | 'exam_final' | 'tournament' | 'dungeon' | 'arena' | 'war_raid' | 'war_defend' | 'bounty_hunt' | 'temple_defense' | 'wanted_battle' | 'divine_invasion' | 'relation_battle' | 'god_rebellion' | 'temple_invasion' | 'PVP_battle' | 'magye_revolt' | 'magye_divine_war' | 'magye_rebellion' | 'relation_ambush' | 'instant_dungeon' | 'magye_temple_invasion' | 'magye_god_slaying' | 'regional_uprising' | 'Coup' | 'emergency_rescue' | 'school_demo' | 'military_regional_defense' | 'military_defense' | 'base_defense' | 'final_trial_battle' | 'eternal_rival_duel' | 'sparring_arena';
  rewards?: { exp: number, gold: number };
  rebelRankIdx?: number;
  passivesApplied?: boolean;
  accumulatedExp?: number;
  accumulatedGold?: number;
  accumulatedLoot?: Item[];
  hasUsedItem?: boolean;
  suddenEventType?: 'rift_crystal' | 'rival_ambush' | 'ancient_blacksmith' | 'monster_frenzy' | string;
  suddenExpMultiplier?: number;
  suddenMasteryBonus?: number;
  suddenRewardMultiplier?: number;
  suddenLootRolls?: number;
  suddenLevelUpCount?: number;
  baseCombatExp?: number;
  dungeonId?: string;
  sourceId?: string;
  _rivalBonusGranted?: boolean;
  turnQueue?: CombatTurnUnit[];
  activeUnitIndex?: number;
  round?: number;
  initialParticipantStates?: {
    id: string; // 'player' or companion.id
    name: string;
    level: number;
    currentExp: number;
    requiredExp: number;
  }[];
}

export interface GameResponse {
  narrative: string;
  choices: string[];
  characterUpdate?: Partial<Character> & { deceased?: string[] };
  sceneType?: 'normal' | 'combat' | 'creation' | 'levelup';
  recommendedSkills?: Skill[];
  combatState?: CombatState;
}

// [NEW] 월간 암시장 이벤트 구조체
export interface BlackMarketItem extends Item {
    stock: number;
    maxStock: number;
    resourceGain?: {
        resourceType: 'magicStone' | 'manaCrystal' | 'shinryokuFlower' | 'specialOre';
        amount: number;
    };
}

export interface BlackMarketData {
    month: string; // YYYY-MM
    region: string;
    nation: string;
    city: string;
    items: BlackMarketItem[];
}

// [NEW] 마계-신계 전쟁 이벤트 구조체
export interface MagyeDivineWar {
    city: string;
    type: 'MESSENGER_JUDGMENT' | 'DIVINE_PUNISHMENT';
    invaderName: string;
    enemies: Enemy[];
    chaosScore: number;
}
export interface ResultData {
    type: 'success' | 'failure' | 'destroy' | 'info' | 'levelup' | 'warning';
    title: string;
    message: string;
    items?: { label: string, before?: string | number, after: string | number }[];
}

export interface MercenaryGroup {
    id: string;
    name: string;
    description: string;
    minLevel: number;
    size: 'Small' | 'Medium' | 'Large';
    nation: string;
    city: string;
    captain?: string; 
    viceCaptain?: string; 
}

export interface FacilityInstance {
  id: string;
  type: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  underConstruction?: boolean;
  targetLevel?: number;
  constructionStartDate?: string;
  constructionStartTime?: string;
  constructionCompletionDate?: string;
  constructionCompletionTime?: string;
  totalConstructionMinutes?: number;
}

export interface FarmPlot {
    id: number;
    status: 'empty' | 'plowed' | 'planted' | 'ready';
    cropId?: string;
    plantedDate?: string;
    lastWateredDate?: string;
    growthProgress: number; // 0 to 100
    isWatered: boolean;
    quality: number; // 0 to 100
}

export interface CombatTrainingReportItem {
    companionId: string;
    companionName: string;
    targetStat: 'exp' | 'str' | 'int' | 'agi' | 'wis' | 'def' | 'ctrl' | 'weapon' | 'skill' | 'maxHp' | 'maxMp';
    targetStatLabel: string;
    gain: number;
    accumulatedGain?: number;
    currentLevel?: number;
    oldLevel?: number;
    leveledUp?: boolean;
    currentExp?: number;
    maxExp?: number;
    statValue?: number;
    date: string;
    targetWeaponType?: WeaponType;
    targetSkillName?: string;
}

export interface CombatTrainingTrainee {
    companionId: string;
    startDate: string;
    startTime?: string; // [NEW] 훈련 시작 시각 (HH:mm)
    targetStat: 'exp' | 'str' | 'int' | 'agi' | 'wis' | 'def' | 'ctrl' | 'weapon' | 'skill' | 'maxHp' | 'maxMp';
    targetWeaponType?: WeaponType;
    targetSkillName?: string;
    accumulatedGain?: number; // 누적 훈련 획득량
    lastGain?: number; // 최근 1회 훈련 획득량
    lastTrainedDate?: string; // 최근 훈련 일자
    totalDaysTrained?: number; // 누적 훈련 일수
    accumulatedMinutes?: number; // 누적 훈련 시간 (분 단위)
    lastTrainedAbsMinutes?: number; // 훈련 절대 시각 비교를 위한 총 누적 분
    startedAtAbsMinutes?: number; // 훈련 시작 절대 분
    targetEndAbsMinutes?: number; // [NEW] 12시간 주간 누적 예상 종료 절대 분
}

export interface CombatTrainingCenterData {
    trainees: CombatTrainingTrainee[];
    lastUpdateDate?: string;
    recentReports?: CombatTrainingReportItem[]; // 최근 훈련 결과 보고 기록
}

export interface DefenseStructureInstance {
  id: string;
  key: string;
  name: string;
  defense: number;
  instanceId: string;
  builtAt: string;
  underConstruction?: boolean;
  constructionStartDate?: string;
  constructionStartTime?: string;
  constructionCompletionDate?: string;
  constructionCompletionTime?: string;
  totalConstructionMinutes?: number;
}

export interface CookingJob {
  id: string;
  instanceId: string;
  recipeId: string;
  recipeName: string;
  resultItemId: string;
  bonusMultiplier: number;
  expGain: number;
  startDate: string;
  startTime: string;
  completionDate: string;
  completionTime: string;
  totalMinutes: number;
  isCompleted?: boolean;
}

export interface Base {
  level: number;
  gridSize: number; // e.g. 5 means 5x5 grid
  layout: FacilityInstance[];
  location?: Location;
  resources: BaseResources;
  residents: string[];
  facilities: string[]; // Keep for backward compatibility or general list
  assignments: Record<string, string>;
  defenseStructures?: DefenseStructureInstance[];
  childAcademy?: any;
  childAcademyTrainees?: any[];
  childAcademyReports?: any[];
  cookingJobs?: CookingJob[]; // [NEW] 전문 주방 조리 대기열 및 진행 상황
  multiAssignments?: Record<string, string[]>; // [NEW] 지원 가능한 시설에 대해 다중 배치 정보 저장
  houseAssignments?: Record<string, string>; // [NEW] 동료별 거주 집 지정 (companionId -> houseInstanceId)
  houseCustomNames?: Record<string, string>; // [NEW] 집별 별칭 (houseInstanceId -> customName)
  houses?: HouseBuilding[]; // [NEW] 단지 내 주택 목록 (유형, 정원, 별칭 등)
  labels?: Record<string, string>;
  urgentAlarms?: string[]; // [NEW] 긴급 알람 로그
  storage: Item[];
  lastTrainingDate?: string; 
  lastStatTrainingDate?: string; 
  lastWeaponTrainingDate?: string; 
  lastFarmHarvestDate?: string;
  lastMineDate?: string;
  lastAlchemyProductionDate?: string;
  lastHouseCleanDate?: string; // [NEW] 마지막 주택 청소/영지 관리 수행 일자
  lastMaintenanceMonth?: string; // [NEW] 마지막 기지 월간 유지비 정산 년월 (YYYY-MM)
  overdueMonths?: number; // [NEW] 기지 유지비 연속 체납 개월 수 (0: 정상, 1: 경고 1단계 생산 50% 감소, 2: 경고 2단계 생산 75% 감소 및 사기 저하, 3+: 시설 가동 중단)
  unpaidMaintenance?: number; // [NEW] 미납된 기지 유지비 총액
  isFacilitySuspended?: boolean; // [NEW] 체납으로 인한 기지 시설 일시 가동 중단 여부
  lastTempleResourceDate?: string; 
  lastRitualYear?: number; 
  lastSecurityCheckYear?: number; 
  lastTempleRefreshDate?: string; 
  isTempleBlessed?: boolean; 
  facilityLevels: Record<string, number>; // Keep for aggregate level info
  underConstruction?: boolean; // [NEW] 기지 전체 증축 공사 진행 여부
  targetLevel?: number; // [NEW] 완공 시 기지 레벨
  constructionStartDate?: string;
  constructionStartTime?: string;
  constructionCompletionDate?: string;
  constructionCompletionTime?: string;
  totalConstructionMinutes?: number;
  gridExpansionUnderConstruction?: boolean; // [NEW] 기지 부지 확장 공사 진행 여부
  targetGridSize?: number; // [NEW] 완공 시 목표 부지 격자 크기 (예: 8, 9, 10)
  gridExpansionStartDate?: string;
  gridExpansionStartTime?: string;
  gridExpansionCompletionDate?: string;
  gridExpansionCompletionTime?: string;
  gridExpansionTotalMinutes?: number;
  dailyCounts: Record<string, number>;
  lastDailyReset?: string;
  elementalShards: Record<string, number>;
  characterUpdate?: any;
  capturedMonsters: CapturedMonster[];
  farmPlots?: Record<string, FarmPlot[]>; // instanceId -> plots
  combatTraining?: Record<string, CombatTrainingCenterData>; // [NEW] instanceId -> training data
  farmAutoPlantConfig?: Record<string, string>; // [NEW] instanceId -> cropId (자동 재배 지시)
  mineSpecializations?: Record<string, string>; // [NEW] instanceId -> specializationId
  dispatched?: DispatchMission[];
  guardianData?: Record<string, { level: number, stats: Stats, affection: number, trainCount?: number }>; 
  templePersonnel?: Record<string, TemplePersonnel>;
  divinePowerBoosts?: Record<string, number>;
  elementalDamageBoosts?: Record<string, number>;
  elementalResistanceBoosts?: Record<string, number>;
  templeVisitors?: Record<string, TempleVisitor[]>; 
  lastTempleDefenseYear?: number; 
  cookingTools?: string[]; // [NEW] 요리 도구 (오븐, 프라이팬 등)
  lastDefenseReport?: BaseDefenseReportData; // [NEW] 최근 기지 방어 실패 피해 통계 리포트
}

export interface BaseFacilityDamage {
  instanceId: string;
  facilityType: string;
  facilityName: string;
  oldLevel: number;
  newLevel: number;
  repairCost: {
    gold: number;
    wood: number;
    stone: number;
    food: number;
    manaCost: number;
  };
}

export interface BaseDefenseReportData {
  id: string;
  timestamp: string;
  defenseType: 'delegated' | 'direct';
  enemyPower: number;
  baseDefense: number;
  enemies: { name: string; level: number }[];
  locationName: string;
  facilityDamages: BaseFacilityDamage[];
  baseLevelDamage?: {
    oldLevel: number;
    newLevel: number;
    repairCost: {
      food: number;
      wood: number;
      stone: number;
      iron: number;
      manaCrystal: number;
    };
  };
  casualties: {
    deadCount: number;
    names: string[];
    reliefCostGold: number;
  };
  plunderedResources: {
    resourceType: string;
    resourceName: string;
    amount: number;
    category?: string;
  }[];
  totalRepairCost: {
    gold: number;
    wood: number;
    stone: number;
    iron: number;
    food: number;
    manaCost: number;
    manaCrystal: number;
  };
  restored?: boolean; // 긴급 복구 완료 여부
}

export interface WorldReaction {
  id: string;
  category: 'Trending' | 'News' | 'Rumor' | 'Companion';
  title: string;
  author: string;
  authorTitle: string;
  content: string;
  likes: number;
  views: number;
  comments: {
    author: string;
    text: string;
    time: string;
  }[];
  timestamp: string;
  location?: string; // [NEW] 게시글의 발원지 또는 만남 장소 (도시명)
    paddingTop?: string;
}

// [NEW] 언론 기사 타입
export interface NewsArticle extends WorldReaction {
  location: string;
  imageUrl?: string;
  source: string; // 예: 제국 일보, 숲의 전령사 등
}

export type CityTier = 'Village' | 'Town' | 'City' | 'Capital';
export type DistrictType = 'Gate' | 'Commercial' | 'Residential' | 'Mercenary' | 'Military' | 'Outskirts' | 'Imperial' | 'Academic' | 'RoyalCourt';

export interface NationConf {
    name: string;
    rulerRace: string;
    politics: string;
    religion: string;
    militaryRank: 'S' | 'A' | 'B' | 'C';
    magicTech: 'High' | 'Mid' | 'Low';
    tolerance: 'High' | 'Mid' | 'Low' | 'Xenophobic';
}

export type SchoolTier = 'Elementary' | 'Middle' | 'High' | 'University' | '초급' | '중급' | '고급';

// [FIX] Added missing VisitorDisposition type definition
export type VisitorDisposition = 'Hostile' | 'PotentiallyHostile' | 'PotentiallyFriendly' | 'Peaceful';

export interface TempleVisitor extends Companion {
    visitReason: string;
    intendedAction: VisitorDisposition;
    isMet: boolean;
    discoveryDate: string;
    templeChatHistory?: { role: 'user' | 'visitor', text: string }[];
    origin?: 'Temple'; // [NEW] 출처 식별자
    originName?: string;
}
export interface CombatResultParticipantState {
    id: string;
    name: string;
    level: number;
    currentExp: number;
    requiredExp: number;
    targetCombatStyle?: string;
    combatStyle?: string;
    combatStyleProgress?: Record<string, { exp: number; monsterKills: number; bossKills: number }>;
    skills?: { name: string; level: number; currentMastery: number }[];
    weaponMastery?: { type: WeaponType; level: number; currentExp: number }[];
}

export interface DeceasedAlertInfo {
    id?: string;
    name: string;
    reason: string;
    nation?: string;
    originName?: string;
    visualUrl?: string;
    gender?: string;
    race?: string;
}

export interface CriticalAlert {
    id: string;
    type: 'defense' | 'shortage' | 'decay' | 'urgent' | 'dispatch' | 'blacksmith' | 'alchemy' | 'deceased' | 'romance' | 'info';
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    deceasedInfo?: DeceasedAlertInfo;
}

export interface WorldEconomicState {
    activeWarNations: string[];     // 군수물자 품귀 국가 (철광석, 붕대, 포션 판매가 2~3배 폭등)
    famineNations: string[];        // 식량난 국가 (음식 구매가 2배 상승, 식량 매입가 2배)
    blockadedCities?: string[];     // 무역로 봉쇄/통행 제한 도시 목록
    warCasualtiesReport?: string;   // 이 달의 전쟁 피해 요약
    lastSimulatedMonth?: string;    // 마지막 시뮬레이션 월 (YYYY-MM)
}

export interface WorldNewsItem {
    id: string;
    category: 'diplomacy' | 'dungeon' | 'world' | 'war' | 'economy';
    title: string;
    message: string;
    date?: string;
    location?: string;
}

export interface DailyReportData {
    days: number;
    date: string;
    totalHarvested: {
        food: number;
        wood: number;
        stone: number;
        herbs: number;
        iron: number;
        manaStone: number;
        manaCrystal: number;
        silver_ore?: number;
        gold_ore?: number;
        ruby?: number;
        sapphire?: number;
        emerald?: number;
        diamond?: number;
        holy_stone?: number;
    };
    workerHarvestCount: number;
    criticalAlerts: CriticalAlert[];
    deceasedList?: DeceasedAlertInfo[];
    foodConsumed?: number;
    dailyFoodNeed?: number;
    baseMaintenanceFee?: number;
    currentResources?: {
        food: number;
        wood: number;
        stone: number;
        herbs: number;
        iron: number;
        manaStone: number;
        manaCrystal: number;
    };
}

export interface CombatResultModalData {
    initialStates: CombatResultParticipantState[];
    finalStates: CombatResultParticipantState[];
    accumulatedExp: number;
    accumulatedGold: number;
    accumulatedLoot: Item[];
    isVictory: boolean;
    expMultiplier?: number;
    goldMultiplier?: number;
    expBonus?: number;
    goldBonus?: number;
    activeExpBuffs?: string[];
    activeGoldBuffs?: string[];
}

export type BaseData = Base;
