
import { Character, ClassTier, Base, ItemRarity, Enemy, SkillType, Skill, WeaponCategory, WeaponType, DistrictType, CityTier, NationConf, SchoolTier, ActiveStatus, Stats, JobType, MercenaryRank, MilitaryRank, WantedRank, CombatStyle } from "./types";
// [FIX] Added missing 'NonHuman' district configuration to satisfy DistrictType requirement
export const DISTRICT_CONFIG: Record<DistrictType, { label: string, desc: string, icon: string, color: string }> = {
    'Gate': { label: '성문/관문', desc: '입국 심사 및 통행료 납부', icon: 'Gate', color: 'text-slate-400' },
    'Commercial': { label: '상업 지구', desc: '상점, 경매장, 거래소', icon: 'Store', color: 'text-amber-400' },
    'Residential': { label: '거주 지구', desc: '여관, 주택, 정보 수집', icon: 'Home', color: 'text-green-400' },
    'Mercenary': { label: '용병 길드', desc: '의뢰 수주, 파티 모집', icon: 'Sword', color: 'text-red-400' },
    'Military': { label: '군사 구역', desc: '훈련소, 병영 (접근 제한)', icon: 'Shield', color: 'text-slate-500' },
    'Outskirts': { label: '도시 외곽', desc: '몬스터 필드, 던전 입구', icon: 'Tent', color: 'text-orange-400' },
    'Imperial': { label: '중앙 권력', desc: '왕궁, 행정청 (수도 전용)', icon: 'Crown', color: 'text-yellow-500' },
    'Academic': { label: '학교', desc: '레귤러스 학교 및 도서관', icon: 'BookOpen', color: 'text-cyan-400' },
    'RoyalCourt': { label: '왕궁 알현실', desc: '국왕을 직접 대면하는 신성한 장소', icon: 'Crown', color: 'text-amber-500' },
    };

export const TEMPLE_MESSENGER_MAP: Record<string, JobType> = {
    "태양의 사자의 성전": JobType.SOLAR_MESSENGER,
    "화염의 사자의 성화": JobType.FIRE_MESSENGER,
    "광휘의 사자의 성소": JobType.RADIANT_MESSENGER,
    "월광의 사자의 성": JobType.MOONLIGHT_MESSENGER,
    "전격의 사자의 성전": JobType.ELECTRIC_MESSENGER,
    "지령의 사자의 궁궐": JobType.EARTH_MESSENGER,
    "질풍의 사자의 질풍전": JobType.GALE_MESSENGER,
    "빙결의 사자의 빙궁": JobType.ICE_MESSENGER,
    "해수의 사자의 성수전": JobType.SEA_MESSENGER,
    "강철의 사자의 강성": JobType.STEEL_MESSENGER,
    "암연의 사자의 심연": JobType.DARK_MESSENGER,
    "초화의 사자의 성초": JobType.NATURE_MESSENGER,
    "무의 궁궐": JobType.VOID_MESSENGER
};
// [NEW] 마계 지배권 매핑
export const MAGYE_DOMINION_MAP: Record<string, JobType> = {
    "임페리얼": JobType.DEMON_GOD,
    "눌바리온": JobType.MAGYE_GENERAL_1,
    "딜리리움": JobType.MAGYE_GENERAL_2,
    "노크티아": JobType.MAGYE_GENERAL_3,
    "엔드라실": JobType.MAGYE_GENERAL_4,
    "세라피엘 몰락지": JobType.MAGYE_GENERAL_5,
    "카르나쥬": JobType.MAGYE_GENERAL_6,
    "인페르노스": JobType.MAGYE_GENERAL_7,
    "네크로폴리스": JobType.MAGYE_GENERAL_8,
    "크로노폴": JobType.MAGYE_GENERAL_9,
    "베놈가든": JobType.MAGYE_GENERAL_10,
    "블러드문": JobType.MAGYE_GENERAL_11,
};

// [NEW] 마계 지배자 직업군 리스트
export const MAGYE_LEADERS: JobType[] = [
    JobType.DEMON_GOD,
    JobType.MAGYE_GENERAL_1,
    JobType.MAGYE_GENERAL_2,
    JobType.MAGYE_GENERAL_3,
    JobType.MAGYE_GENERAL_4,
    JobType.MAGYE_GENERAL_5,
    JobType.MAGYE_GENERAL_6,
    JobType.MAGYE_GENERAL_7,
    JobType.MAGYE_GENERAL_8,
    JobType.MAGYE_GENERAL_9,
    JobType.MAGYE_GENERAL_10,
    JobType.MAGYE_GENERAL_11
];

export const MILITARY_RANK_THRESHOLD: Record<MilitaryRank, number> = {
    [MilitaryRank.PVT]: 0,
    [MilitaryRank.PFC]: 50,
    [MilitaryRank.CPL]: 100,
    [MilitaryRank.SGT]: 200,
    [MilitaryRank.SSG]: 400,
    [MilitaryRank.SFC]: 600,
    [MilitaryRank.MSG]: 800,
    [MilitaryRank.WSG]: 1000,
    [MilitaryRank.SLT]: 1500,
    [MilitaryRank.FLT]: 2000,
    [MilitaryRank.CPT]: 2500,
    [MilitaryRank.MAJ]: 4000,
    [MilitaryRank.LTC]: 5500,
    [MilitaryRank.COL]: 7000,
    [MilitaryRank.BG]: 10000, 
    [MilitaryRank.MG]: 15000,
    [MilitaryRank.LG]: 30000,
    [MilitaryRank.GEN]: 50000,
};

export const MILITARY_RANK_ORDER: MilitaryRank[] = [
    MilitaryRank.PVT, MilitaryRank.PFC, MilitaryRank.CPL, MilitaryRank.SGT,
    MilitaryRank.SSG, MilitaryRank.SFC, MilitaryRank.MSG, MilitaryRank.WSG,
    MilitaryRank.SLT, MilitaryRank.FLT, MilitaryRank.CPT,
    MilitaryRank.MAJ, MilitaryRank.LTC, MilitaryRank.COL,
    MilitaryRank.BG, MilitaryRank.MG, MilitaryRank.LG, MilitaryRank.GEN
];

export const MILITARY_SALARY: Record<MilitaryRank, number> = {
    [MilitaryRank.PVT]: 2000, [MilitaryRank.PFC]: 3000, [MilitaryRank.CPL]: 4500, [MilitaryRank.SGT]: 6000,
    [MilitaryRank.SSG]: 10000, [MilitaryRank.SFC]: 15000, [MilitaryRank.MSG]: 22000, [MilitaryRank.WSG]: 30000,
    [MilitaryRank.SLT]: 45000, [MilitaryRank.FLT]: 60000, [MilitaryRank.CPT]: 85000,
    [MilitaryRank.MAJ]: 120000, [MilitaryRank.LTC]: 180000, [MilitaryRank.COL]: 250000,
    [MilitaryRank.BG]: 350000, [MilitaryRank.MG]: 500000, [MilitaryRank.LG]: 800000, [MilitaryRank.GEN]: 1500000,
};

export const MERCENARY_RANK_SCORE: Record<MercenaryRank, number> = {
    [MercenaryRank.F]: 1, [MercenaryRank.E]: 3, [MercenaryRank.D]: 5, [MercenaryRank.C]: 7, [MercenaryRank.B]: 10, [MercenaryRank.A]: 15, [MercenaryRank.S]: 20, [MercenaryRank.SS]: 30, [MercenaryRank.SSS]: 50,
};

export const SHINRYOKU_UI_CONFIG: Record<string, { text: string, bg: string, border: string, glow: string }> = {
    '태양계': { text: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-500/50', glow: 'shadow-orange-500/20' },
    '월광계': { text: 'text-indigo-300', bg: 'bg-indigo-950/40', border: 'border-indigo-500/50', glow: 'shadow-indigo-500/20' },
    '광휘계': { text: 'text-yellow-100', bg: 'bg-yellow-900/30', border: 'border-yellow-400/50', glow: 'shadow-yellow-400/20' },
    '화염계': { text: 'text-red-500', bg: 'bg-red-950/40', border: 'border-red-600/50', glow: 'shadow-red-600/20' },
    '빙결계': { text: 'text-cyan-300', bg: 'bg-cyan-950/40', border: 'border-cyan-500/50', glow: 'shadow-cyan-500/20' },
    '전격계': { text: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-500/50', glow: 'shadow-yellow-400/20' },
    '초화계': { text: 'text-green-500', bg: 'bg-green-950/40', border: 'border-green-600/50', glow: 'shadow-green-600/20' },
    '질풍계': { text: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/20' },
    '대지계': { text: 'text-amber-700', bg: 'bg-amber-950/40', border: 'border-amber-800/50', glow: 'shadow-amber-800/20' },
    '암흑계': { text: 'text-purple-500', bg: 'bg-purple-950/40', border: 'border-purple-700/50', glow: 'shadow-purple-700/20' },
    '해수계': { text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-700/50', glow: 'shadow-blue-700/20' },
    '무기강화계': { text: 'text-slate-400', bg: 'bg-slate-900/50', border: 'border-slate-600/50', glow: 'shadow-slate-500/10' },
    '신체강화계': { text: 'text-rose-400', bg: 'bg-rose-950/30', border: 'border-rose-700/50', glow: 'shadow-rose-500/20' },
    '강철계': { text: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-600/50', glow: 'shadow-zinc-500/10' },
    '무속성': { text: 'text-slate-300', bg: 'bg-slate-900/60', border: 'border-slate-700/60', glow: 'shadow-none' },
    'default': { text: 'text-slate-400', bg: 'bg-slate-900/40', border: 'border-slate-700/50', glow: 'shadow-none' }
};

// [NEW] 악명도 시스템 설정
export const INFAMY_CONFIG = {
    MIN: 0,
    MAX: 1000,
    STAGES: {
        NONE: { rank: WantedRank.NONE, label: '시민', threshold: 0, color: 'text-slate-400', desc: '법을 준수하는 평범한 사람입니다.', spawnChance: 0 },
        SUSPECT: { rank: WantedRank.C, label: '주의 (C)', threshold: 100, color: 'text-yellow-400', desc: '경비병들이 당신의 행동을 주시하기 시작합니다.', spawnChance: 0.05 },
        CRIMINAL: { rank: WantedRank.B, label: '범죄자 (B)', threshold: 300, color: 'text-orange-500', desc: '도시 입장 시 검문이 강화되며, 일부 상점 이용이 제한될 수 있습니다.', spawnChance: 0.15 },
        WANTED: { rank: WantedRank.A, label: '지명수배자 (A)', threshold: 600, color: 'text-red-500', desc: '현상금이 걸렸습니다. 경비병들이 보는 즉시 공격할 수 있습니다.', spawnChance: 0.35 },
        DISASTER: { rank: WantedRank.S, label: '재앙 (S)', threshold: 800, color: 'text-purple-600', desc: '국가적인 적입니다. 대규모 토벌대가 당신을 쫓습니다.', spawnChance: 0.65 },
        CALAMITY: { rank: WantedRank.SSS, label: '세계의 적 (SSS)', threshold: 950, color: 'text-red-600 font-black animate-pulse', desc: '살아있는 재앙입니다. 전설의 현상금 사냥꾼들이 당신을 노립니다.', spawnChance: 0.90 }
    },
    GAINS: {
        THEFT: 20,           // 절도
        ASSAULT: 50,         // 폭행
        SLAVE_TRADE: 100,    // 노예 매매
        MURDER: 200,         // 살인 (죄 없는 시민)
        PRISON_BREAK: 150,   // 탈옥
        VANDALISM: 30        // 기물 파손
    }
};

export const NATION_INFO: Record<string, NationConf> = {
    "대한민국": { name: "대한민국", rulerRace: "Human", politics: "Republic", religion: "자유 신앙", militaryRank: "A", magicTech: "High", tolerance: "High" },
    "북한": { name: "북한", rulerRace: "인간", politics: "독재 공화국", religion: "자유 신앙 없음", militaryRank: "A", magicTech: "Low", tolerance: "Low" },
    "일본": { name: "일본", rulerRace: "Human", politics: "Empire", religion: "신도/불교", militaryRank: "B", magicTech: "High", tolerance: "Mid" },
    "중국": { name: "중국", rulerRace: "Human", politics: "Republic", religion: "도교", militaryRank: "S", magicTech: "Mid", tolerance: "Low" },
    "미국": { name: "미국", rulerRace: "Human", politics: "Republic", religion: "기독교", militaryRank: "S", magicTech: "High", tolerance: "High" },
    "영국": { name: "영국", rulerRace: "Human", politics: "Kingdom", religion: "성공회", militaryRank: "A", magicTech: "High", tolerance: "Mid" },
    "러시아": { name: "러시아", rulerRace: "Human", politics: "Republic", religion: "정교회", militaryRank: "S", magicTech: "Mid", tolerance: "Mid" },
    "독일": { name: "독일", rulerRace: "Human", politics: "Republic", religion: "기독교", militaryRank: "A", magicTech: "High", tolerance: "High" },
    "프랑스": { name: "프랑스", rulerRace: "Human", politics: "Republic", religion: "가톨릭", militaryRank: "B", magicTech: "High", tolerance: "High" },
    "이집트": { name: "이집트", rulerRace: "Human", politics: "Republic", religion: "이슬람", militaryRank: "B", magicTech: "Low", tolerance: "Mid" },
    "사우디아라비아": { name: "사우디아라비아", rulerRace: "Human", politics: "Kingdom", religion: "이슬람", militaryRank: "B", magicTech: "Low", tolerance: "Low" },
    "이란": { name: "이란", rulerRace: "Human", politics: "Theocracy", religion: "이슬람", militaryRank: "B", magicTech: "Mid", tolerance: "Low" },
    "이스라엘": { name: "이스라엘", rulerRace: "Human", politics: "Republic", religion: "유대교", militaryRank: "A", magicTech: "High", tolerance: "Low" },
    "임페리얼 제국": { name: "임페리얼 제국", rulerRace: "Monster", politics: "Empire", religion: "힘의 논리", militaryRank: "S", magicTech: "High", tolerance: "Xenophobic" },
     "미르탈 숲연합": { name: "미르탈 숲연합", rulerRace: "Elf", politics: "Kingdom", religion: "자연의 섭리", militaryRank: "A", magicTech: "Low", tolerance: "High" },
      "레오니스 투기국": { name: "레오니스 투기국", rulerRace: "Monster", politics: "Kingdom", religion: "힘의 논리", militaryRank: "A", magicTech: "Low", tolerance: "Mid" },
       "네크로디움 제국": { name: "네크로디움 제국", rulerRace: "Monster", politics: "Empire", religion: "힘의 논리", militaryRank: "B", magicTech: "High", tolerance: "Low" },
};
export const TIER_DISTRICTS: Record<CityTier, DistrictType[]> = {
    'Village': ['Gate', 'Residential', 'Outskirts','Mercenary', 'Military','Academic'],
    'Town': ['Gate', 'Commercial', 'Residential','Mercenary', 'Military','Academic', 'Outskirts'],
    'City': ['Gate', 'Commercial', 'Residential', 'Academic', 'Mercenary', 'Military', 'Outskirts'],
    'Capital': ['Gate', 'Commercial', 'Residential', 'Academic', 'Mercenary', 'Military', 'RoyalCourt', 'Outskirts']
};

export const SCHOOL_CONFIG: Record<SchoolTier, { minAge: number, maxAge: number, name: string }> = {
    'Elementary': { minAge: 11, maxAge: 13, name: '초급 레귤러스 학교' },
    'Middle': { minAge: 14, maxAge: 16, name: '중급 레귤러스 학교' },
    'High': { minAge: 17, maxAge: 19, name: '고급 레귤러스 학교' },
    'University': { minAge: 20, maxAge: 99, name: '성인 (사회인)' },
    '초급': { minAge: 11, maxAge: 13, name: '초급 레귤러스 학교' },
    '중급': { minAge: 14, maxAge: 16, name: '중급 레귤러스 학교' },
    '고급': { minAge: 17, maxAge: 19, name: '고급 레귤러스 학교' },
};

export const START_DATE = "2000-03-02";
export const MAX_STORAGE_SIZE = 500;
export const MAX_PARTY_SIZE = 5;
export const BASE_RESIDENT_LIMIT = 20;


    
   
export const STAT_DESCRIPTIONS: Record<string, string> = {
    hp: "현재 생명력입니다.",
    maxHp: "최대 생명력. 0이 되면 행동불능이 됩니다.",
    mp: "현재 마나입니다.",
    maxMp: "최대 마나. 스킬 사용에 필요한 자원입니다.",
    str: "힘. 물리 공격력과 근력 기반 활동에 영향을 줍니다.",
    int: "지력. 마법 공격력과 지식 기반 활동에 영향을 줍니다.",
    wis: "지능. 마법 방어력, 마법 명중률, 마법 공격력에 영향을 줍니다.",
    def: "방어. 물리 피해를 감소시키는 능력입니다.",
    agi: "민첩. 회피율, 명중률에 영향을 줍니다.",
    ctrl: "신력제어력. 속성 피해, 속성 저항, 스킬의 안정성, 크리티컬 확률, 치명타 피해량, 상태이상 저항에 영향을 줍니다."
};

export const QUEST_RANK_INDEX: Record<MercenaryRank, number> = {
    [MercenaryRank.F]: 300,
    [MercenaryRank.E]: 500,
    [MercenaryRank.D]: 1000,
    [MercenaryRank.C]: 2000,
    [MercenaryRank.B]: 3000,
    [MercenaryRank.A]: 5000,
    [MercenaryRank.S]: 10000,
    [MercenaryRank.SS]: 20000,
    [MercenaryRank.SSS]: 50000,
};

export const QUEST_DANGER_INDEX: Record<string, number> = {
    'Low': 0.5,
    'Mid': 1.0,
    'High': 1.5,
    'Extreme': 2.0
};
export const SHINRYOKU_SPECIAL_PASSIVES: Record<string, { name: string, type: 'STATIC' | 'TURN', code: string, desc: string }[]> = {
    '태양계': [
        { name: "태양의 열기 (Heat)", type: 'TURN', code: 'SOLAR_HEAT', desc: "모든 적에게 (물리공격력+마법공격력) 18%+(1%*Lv) 피해" },
        { name: "태양의 축복 (Regen)", type: 'TURN', code: 'SOLAR_REGEN', desc: "턴마다 MaxHP/MP 10%+(1%*Lv) 회복" }
    ],
    '월광계': [
        { name: "달의 치유 (Heal)", type: 'TURN', code: 'LUNAR_HEAL', desc: "턴마다 MaxHP/MP 10%+(1%*Lv) 회복" },
        { name: "월암 (Eclipse)", type: 'TURN', code: 'LUNAR_DARK', desc: "모든 적 STR/INT/AGI 10%+(1%*Lv) 감소" }
    ],
    '광휘계': [
        { name: "성역 (Sanctuary)", type: 'TURN', code: 'RADIANT_REGEN', desc: "턴마다 MaxHP/MP 15%+(1%*Lv) 회복" },
        { name: "심판의 빛 (Judge)", type: 'STATIC', code: 'RADIANT_JUDGE', desc: "암흑계 적에게 피해량 25% 증가" }
    ],
    '화염계': [
        { name: "불의 파동 (Heat)", type: 'TURN', code: 'FIRE_HEAT', desc: "모든 적에게 (물/마공) 18%+(1%*Lv) 피해" }
    ],
    '빙결계': [
        { name: "냉기 (Absolute Cold)", type: 'TURN', code: 'ICE_COLD', desc: "적 전체 AGI 25%+(1%*Lv) 감소 효과 부여" },
        { name: "절대 영도 (Deep)", type: 'STATIC', code: 'ICE_DEEP', desc: "빙결 상태이상 확률 100% 보정 (저항 무시)" }
    ],
    '전격계': [
        { name: "번개 (Thunder)", type: 'STATIC', code: 'ELEC_THUNDER', desc: "공격 시 (AGI+P.Atk)의 20%+(1%*Lv) 추가 피해" }
    ],
    '초화계': [
        { name: "광합성 (Synth)", type: 'TURN', code: 'NATURE_SYNTH', desc: "턴마다 MaxHP 20%+(1%*Lv) 회복" }
    ],
    '질풍계': [
        { name: "돌풍 (Gust)", type: 'STATIC', code: 'WIND_GUST', desc: "공격 시 (AGI+CTRL)의 20%+(1%*Lv) 추가 피해" }
    ],
    '대지계': [
        { name: "지진 (Quake)", type: 'STATIC', code: 'EARTH_QUAKE', desc: "공격 시 (DEF+STR)의 20%+(1%*Lv) 추가 피해" }
    ],
    '암흑계': [
        { name: "흡수 (Absorb)", type: 'STATIC', code: 'DARK_ABSORB', desc: "공격 시 (INT+CTRL) 기반 피해 및 체력 흡수" }
    ],
    '무기강화계': [
        { name: "공격 강화 (Atk)", type: 'STATIC', code: 'ENHANCE_ATK', desc: "물리/마법 공격력 50%+(1%*Lv) 증가" },
        { name: "수비 강화 (Def)", type: 'STATIC', code: 'ENHANCE_DEF', desc: "물리/마법 방어력 50%+(1%*Lv) 증가" }
    ],
    '신체강화계': [
        { name: "신체 각성 (Atk)", type: 'STATIC', code: 'ENHANCE_ATK', desc: "물리/마법 공격력 50%+(1%*Lv) 증가" },
        { name: "금강 불괴 (Def)", type: 'STATIC', code: 'ENHANCE_DEF', desc: "물리/마법 방어력 50%+(1%*Lv) 증가" }
    ],
    '강철계': [
        { name: "철광 (Iron Will)", type: 'STATIC', code: 'STEEL_IRON', desc: "상태이상 저항 50%+(1%*Lv) 증가" }
    ],
    '해수계': [
        { name: "파도 (Tide)", type: 'STATIC', code: 'WATER_WAVE', desc: "공격 시 (WIS+INT)의 20%+(1%*Lv) 추가 피해" }
    ]
};

export const STATUS_AILMENTS_DATA: Record<string, { desc: string, duration: string }> = {
    "화상": { desc: "매턴 HP 손실 (시전자 공격력 8%)", duration: "3턴" },
    "감전": { desc: "50% 확률로 행동불가, 물리/마법 방어력 -15%", duration: "2~3턴" },
    "빙결": { desc: "완전 행동불가, 물리/마법 방어력 -5%", duration: "1~2턴" },
    "출혈": { desc: "매턴 HP 손실 (시전자 공격력 5%)", duration: "3~5턴" },
    "암흑": { desc: "AGI -15%, 암속성 피해 +20% 증가", duration: "3턴" },
    "공포": { desc: "공격력 -20%, 치명타 확률 -10%", duration: "2~3턴" },
    "속박": { desc: "방어력 -20%, 25% 확률로 행동불가", duration: "2턴" },
    "혼란": { desc: "일정 확률로 아군 공격", duration: "1~2턴" },
    "소멸": { desc: "피해(MaxHP 7%), 공/마공 -20%, 방/마방 -25%", duration: "2턴" },
    "흡정": { desc: "매턴 MaxHP/MP 5% 감소", duration: "3턴" },
    "파열": { desc: "방어력 -30%", duration: "3턴" },
    "월침": { desc: "방어/마방 -20%, 치명타 -20%", duration: "3턴" },
    "월암": { desc: "STR, INT, AGI 대폭 감소", duration: "지속" },
    "냉기": { desc: "AGI 대폭 감소 (빙결계 패시브)", duration: "지속" },
    "중독": { desc: "매턴 HP 손실 (시전자 지력 10%), 받는 회복 효과 50% 감소", duration: "3턴" }
};

export const STATUS_AILMENTS_LIST = Object.keys(STATUS_AILMENTS_DATA);

export const SHINRYOKU_AILMENTS_MAP: Record<string, string[]> = {
    '화염계': ['화상', '파열'],
    '빙결계': ['빙결', '냉기'],
    '전격계': ['감전'],
    '대지계': ['속박', '파열'],
    '질풍계': ['출혈', '속박'],
    '해수계': ['속박', '냉기'],
    '광휘계': ['공포', '소멸'],
    '암흑계': ['암흑', '공포', '흡정', '소멸'],
    '태양계': ['화상', '소멸'],
    '월광계': ['월암', '월침', '암흑'],
    '초화계': ['중독', '속박', '흡정'],
    '강철계': ['파열', '출혈'],
    '무기강화계': ['출혈', '파열'],
    '신체강화계': ['파열', '공포', '출혈'],
    '일반': ['출혈', '속박', '파열']
};

export const SHINRYOKU_AFFINITY: Record<string, { strong: string[], weak: string[] }> = 
{'화염계': { strong: ['빙결계', '초화계'], weak: ['해수계', '질풍계'] },
'광휘계': { strong: ['암흑계', '질풍계','월광계'], weak: ['암흑계', '태양계','무기강화계'] },
 '전격계': { strong: ['해수계', '질풍계'], weak: ['대지계', '강철계'] },
 '빙결계': { strong: ['초화계', '해수계'], weak: ['화염계', '강철계'] },
 '대지계': { strong: ['전격계', '강철계'], weak: ['해수계', '초화계'] },
 '암흑계': { strong: ['광휘계','태양계','암흑계'], weak: ['광휘계', '신체강화계','태양계'] },
  '무기강화계': { strong: ['신체강화계', '강철계','광휘계'], weak: ['전격계', '초화계','월광계'] },
  '신체강화계': { strong: ['암흑계','태양계'], weak: ['무기강화계','질풍계'] },
'해수계': { strong: ['화염계', '대지계'], weak: ['전격계', '빙결계'] },
 '질풍계': { strong: ['화염계','신체강화계'], weak: ['전격계','광휘계'] },
 '강철계': { strong: ['빙결계', '전격계'], weak: ['대지계', '무기강화계'] },
 '태양계': { strong: ['월광계', '광휘계','암흑계'], weak: ['월광계', '암흑계','신체강화계'] },
 '월광계': { strong: ['태양계','암흑계','무기강화계'], weak: ['태양계', '암흑계','광휘계'] },
 '초화계': { strong: ['대지계', '신체강화계'], weak: ['화염계', '빙결계'] }
}; 


export const SHINRYOKU_TYPES_LIST = Object.keys(SHINRYOKU_AFFINITY);

export const SHINRYOKU_STATUS_MAP: Record<string, string[]> = {
    '태양계': ['화상', '소멸', '혼란'],
    '월광계': ['월침', '암흑', '공포','중독'],
    '암흑계': ['공포', '흡정', '속박','중독'],
    '광휘계': ['감전', '혼란', '화상'],
    '해수계': ['빙결', '공포', '속박','중독'],
    '빙결계': ['빙결', '출혈', '파열'],
    '무기강화계': ['출혈', '파열', '공포','중독'],
    '신체강화계': ['출혈', '파열', '공포','중독'],
    '질풍계': ['혼란', '출혈', '속박'],
    '초화계': ['혼란', '속박', '출혈','중독'],
    '대지계': ['속박', '출혈', '파열'],
    '강철계': ['파열', '출혈', '공포'],
    '전격계': ['감전', '화상', '혼란'],
    '화염계': ['화상', '혼란', '파열']
};

export const WEAPON_MASTERY_CONFIG: Record<WeaponCategory, { types: WeaponType[], stat: string }> = {
    'Melee': { 
        types: ['Sword', 'Spear', 'Blunt', 'Axe', 'Knuckle'], 
        stat: 'STR' 
    },
    'Ranged': { 
        types: ['Bow', 'Crossbow', 'Thrown', 'Firearm', 'Heavy'], 
        stat: 'AGI' 
    },
    'Magic': { 
        types: ['Staff', 'Energy', 'Grimoire'], 
        stat: 'INT/WIS' 
    },
    'Sub': {
        types: ['Shield', 'Orb', 'SubSword'],
        stat: 'VARIES'
    }
};

export const WEAPON_TYPE_KOREAN: Record<WeaponType, string> = {
    'Sword': '검',
    'Spear': '창',
    'Blunt': '둔기',
    'Axe': '도끼',
    'Knuckle': '너클',
    'Bow': '활',
    'Crossbow': '석궁',
    'Thrown': '투척',
    'Firearm': '총기',
    'Heavy': '중화기',
    'Staff': '지팡이',
    'Energy': '에너지',
    'Grimoire': '마법서',
    'Shield': '방패',
    'Orb': '보주',
    'SubSword': '보조검'
};

export const WEAPON_KEYWORDS: Record<WeaponType, string[]> = {
    'Sword': ['검', '대검', '쌍검', '소검', '단검', '세검', '도', '레이피어', '카타나', '소드', '대도', '나이프'],
    'Spear': ['창', '장창', '언월도', '폴암', '스피어', '랜스', '글레이브', '삼지창'],
    'Blunt': ['둔기', '철퇴', '해머', '배트', '메이스', '망치', '지팡이(물리)', '몽둥이', '낫'],
    'Axe': ['도끼', '쌍도끼', '액스', '토마호크', '할버드'],
    'Knuckle': ['너클', '클로', '권투', '글러브', '건틀릿', '피스트', '격투'],
    'Bow': ['활', '보우', '롱보우', '숏보우', '궁'],
    'Crossbow': ['석궁', '크로스보우', '노'],
    'Thrown': ['투척', '표창', '수리검', '투창', '다트', '부메랑'],
    'Firearm': ['총', '권총', '소총', '라이플', '샷건', '산탄총', '피스톨', '리볼버', '머스킷'],
    'Heavy': ['중화기', '기관총', '로켓', '런처', '대포', '캐넌', '그레네이드', '미니건'],
    'Staff': ['지팡이', '스태프', '완드', '로드'],
    'Energy': ['에너지', '레이저', '레일건', '플라즈마', '광선검', '빔'],
    'Grimoire': ['마법서', '마법책', '그리모어', '서적', '경전'],
    'Shield': ['방패', '실드', '가드', '버클러', '타지', '스쿠툼'],
    'Orb': ['보주', '오브', '수정구', '부적', '토템', '성물'],
    'SubSword': ['보조검', '단도', '망고슈', '파라잉', '보조무기(검)', '소태도']
};

// [NEW] 전투 계열 상세 정보 인터페이스
export interface CombatStyleInfo {
    style: CombatStyle;
    label: string;
    tier: 1 | 2 | 3 | 4;
    rootStyle: CombatStyle;
    parentStyle?: CombatStyle;
    minMastery: number;
    specialtyText: string;
    description: string;
    weapons: WeaponType[];
    color: string;
    bgColor: string;
    borderColor: string;
    iconName: string;
    bonusDescription?: string;
    bonuses?: any;
}

export const COMBAT_STYLE_CHANGE_COST: Record<number, number> = {
    1: 10000,
    2: 50000,
    3: 200000,
    4: 1000000,
};

// [NEW] 전투 계열 차수별 전직 수련 요구 조건 (경험치, 몬스터 처치 수, 보스 처치 수)
export interface CombatStyleTrainingReq {
    reqExp: number;
    reqKills: number;
    minMonsterLevel: number;
    reqBossKills: number;
    desc: string;
}

export const COMBAT_STYLE_TIER_REQUIREMENTS: Record<number, CombatStyleTrainingReq> = {
    1: { reqExp: 8000, reqKills: 5, minMonsterLevel: 1, reqBossKills: 0, desc: '일반 몬스터 5마리 처치 및 수련 경험치 8,000 달성' },
    2: { reqExp: 80000, reqKills: 15, minMonsterLevel: 80, reqBossKills: 0, desc: 'Lv.80 이상 몬스터 15마리 처치 (수련 EXP 80,000)' },
    3: { reqExp: 900000, reqKills: 30, minMonsterLevel: 250, reqBossKills: 4, desc: 'Lv.250 이상 몬스터 30마리 & 보스 4마리 처치 (수련 EXP 900,000)' },
    4: { reqExp: 12000000, reqKills: 50, minMonsterLevel: 450, reqBossKills: 15, desc: 'Lv.450 이상 최상위 몬스터 50마리 & 군주/보스 8마리 처치 (수련 EXP 12,000,000)' }
};

export const COMBAT_STYLE_SPECIALTIES: Record<CombatStyle, WeaponType[]> = {
    // 1차
    [CombatStyle.SWORDSMAN]: ['Sword', 'SubSword', 'Shield'],
    [CombatStyle.SPEARMAN]: ['Spear'],
    [CombatStyle.BERSERKER]: ['Axe', 'Blunt'],
    [CombatStyle.BOXER]: ['Knuckle'],
    [CombatStyle.ARCHER]: ['Bow', 'Crossbow'],
    [CombatStyle.ROGUE]: ['Thrown', 'SubSword'],
    [CombatStyle.GUNNER]: ['Firearm', 'Heavy'],
    [CombatStyle.MAGE]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.ENERGIZER]: ['Energy'],

    // 2차
    [CombatStyle.KNIGHT]: ['Shield', 'Sword'],
    [CombatStyle.MAGIC_SWORDSMAN]: ['Sword', 'Staff', 'Grimoire'],
    [CombatStyle.DUAL_SWORDSMAN]: ['SubSword', 'Sword'],
    [CombatStyle.LANCER]: ['Spear'],
    [CombatStyle.MAGIC_SPEARMAN]: ['Spear'],
    [CombatStyle.AXE_WARRIOR]: ['Axe'],
    [CombatStyle.DESTROYER]: ['Blunt'],
    [CombatStyle.MARTIAL_ARTIST]: ['Knuckle'],
    [CombatStyle.PUGILIST]: ['Knuckle'],
    [CombatStyle.BOWMAN]: ['Bow'],
    [CombatStyle.CROSSBOWMAN]: ['Crossbow'],
    [CombatStyle.ASSASSIN]: ['SubSword'],
    [CombatStyle.NINJA]: ['Thrown'],
    [CombatStyle.GUNSLINGER]: ['Firearm'],
    [CombatStyle.HEAVY_TROOPER]: ['Heavy'],
    [CombatStyle.ELEMENTALIST]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.ARCANIST]: ['Grimoire', 'Staff'],
    [CombatStyle.CLERIC]: ['Staff', 'Orb'],
    [CombatStyle.SHAMAN]: ['Orb', 'Staff'],
    [CombatStyle.ENERGY_BLADER]: ['Energy'],
    [CombatStyle.ENERGY_SHOOTER]: ['Energy'],
    [CombatStyle.ENERGY_CORE]: ['Energy'],

    // 3차
    [CombatStyle.PALADIN]: ['Shield', 'Sword'],
    [CombatStyle.MAGIC_KNIGHT]: ['Sword', 'Staff', 'Orb'],
    [CombatStyle.IRONCLAD_KNIGHT]: ['Shield', 'Sword'],
    [CombatStyle.BLADE_DANCER]: ['SubSword', 'Sword'],
    [CombatStyle.GLADIATOR]: ['SubSword', 'Sword'],
    [CombatStyle.DRAGON_KNIGHT]: ['Spear'],
    [CombatStyle.CAVALRY_LEADER]: ['Spear'],
    [CombatStyle.HOLY_KNIGHT]: ['Spear'],
    [CombatStyle.DARK_KNIGHT]: ['Spear'],
    [CombatStyle.MAGIC_LANCER]: ['Spear'],
    [CombatStyle.ELEMENTAL_LANCER]: ['Spear'],
    [CombatStyle.EXECUTIONER]: ['Axe'],
    [CombatStyle.AXE_BERSERKER]: ['Axe'],
    [CombatStyle.SHIELD_BERSERKER]: ['Axe', 'Shield'],
    [CombatStyle.MACE_WARRIOR]: ['Blunt'],
    [CombatStyle.CRUSHER]: ['Blunt'],
    [CombatStyle.COMBATANT]: ['Knuckle'],
    [CombatStyle.COMBO_MASTER]: ['Knuckle'],
    [CombatStyle.FIGHTER]: ['Knuckle'],
    [CombatStyle.FIST_SAINT]: ['Knuckle'],
    [CombatStyle.MASTER_ARCHER]: ['Bow'],
    [CombatStyle.WIND_ARCHER]: ['Bow'],
    [CombatStyle.SNIPER]: ['Crossbow'],
    [CombatStyle.HUNTER]: ['Crossbow'],
    [CombatStyle.TRUE_ASSASSIN]: ['SubSword'],
    [CombatStyle.SHADOW_BLADE]: ['SubSword'],
    [CombatStyle.SHURIKEN_MASTER]: ['Thrown'],
    [CombatStyle.BOMB_NINJA]: ['Thrown'],
    [CombatStyle.DUAL_SHOOTER]: ['Firearm'],
    [CombatStyle.GUN_SNIPER]: ['Firearm'],
    [CombatStyle.ARTILLERY]: ['Heavy'],
    [CombatStyle.DEMOLITIONIST]: ['Heavy'],
    [CombatStyle.GRAND_MAGE]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.FROST_FLAME_MAGE]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.ARCANE_MAGE]: ['Grimoire', 'Staff'],
    [CombatStyle.MAGIC_SAGE]: ['Grimoire', 'Staff'],
    [CombatStyle.PRIEST]: ['Staff', 'Orb'],
    [CombatStyle.SPIRIT_MAGE]: ['Orb', 'Staff'],
    [CombatStyle.MANA_MANIPULATOR]: ['Orb', 'Staff'],
    [CombatStyle.PLASMA_SWORD]: ['Energy'],
    [CombatStyle.ENERGY_KNIGHT]: ['Energy'],
    [CombatStyle.LASER_SHOOTER]: ['Energy'],
    [CombatStyle.BEAM_CASTER]: ['Energy'],
    [CombatStyle.ENERGY_MAGE]: ['Energy'],
    [CombatStyle.OVERDRIVER]: ['Energy'],
    [CombatStyle.SUMMONER]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.ELEMENT_SUMMONER]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.BEAST_SUMMONER]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.GRAND_SUMMONER]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.BEAST_MASTER]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.SUMMON_KING]: ['Staff', 'Orb', 'Grimoire'],
    [CombatStyle.ANCIENT_SUMMONER]: ['Staff', 'Orb', 'Grimoire'],


    // 4차
    [CombatStyle.CRUSADER]: ['Shield', 'Sword'],
    [CombatStyle.HYBRID]: ['Sword', 'Staff', 'Energy'],
    [CombatStyle.GUARDIAN_KNIGHT]: ['Shield', 'Sword'],
    [CombatStyle.SWORD_EMPEROR]: ['SubSword', 'Sword'],
    [CombatStyle.BATTLE_KING]: ['SubSword', 'Sword'],
    [CombatStyle.SKY_DRAGON_KNIGHT]: ['Spear'],
    [CombatStyle.ASSAULT_COMMANDER]: ['Spear'],
    [CombatStyle.DIVINE_KNIGHT]: ['Spear'],
    [CombatStyle.ABYSS_KNIGHT]: ['Spear'],
    [CombatStyle.MAGIC_SPEAR_KING]: ['Spear'],
    [CombatStyle.SPEAR_SAGE]: ['Spear'],
    [CombatStyle.DECAPITATOR]: ['Axe'],
    [CombatStyle.AXE_LORD]: ['Axe'],
    [CombatStyle.SHIELD_BERSERK_LORD]: ['Axe', 'Shield'],
    [CombatStyle.DESTRUCTION_LORD]: ['Blunt'],
    [CombatStyle.GRAND_CRUSHER]: ['Blunt'],
    [CombatStyle.WAR_GOD]: ['Knuckle'],
    [CombatStyle.COMBO_EMPEROR]: ['Knuckle'],
    [CombatStyle.FIST_GOD]: ['Knuckle'],
    [CombatStyle.DIVINE_ARCHER]: ['Bow'],
    [CombatStyle.SKY_BOW_MASTER]: ['Bow'],
    [CombatStyle.SNIPER_KING]: ['Crossbow'],
    [CombatStyle.GOD_OF_HUNT]: ['Crossbow'],
    [CombatStyle.DEATH_REAPER]: ['SubSword'],
    [CombatStyle.SHADOW_LORD]: ['SubSword'],
    [CombatStyle.SHURIKEN_KING]: ['Thrown'],
    [CombatStyle.EXPLOSIVE_DESTROYER]: ['Thrown'],
    [CombatStyle.GUN_BLADER]: ['Firearm'],
    [CombatStyle.DEADEYE]: ['Firearm'],
    [CombatStyle.ARSENAL]: ['Heavy'],
    [CombatStyle.DEMOLISHER]: ['Heavy'],
    [CombatStyle.ELEMENTAL_LORD]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.ELEMENTAL_SOVEREIGN]: ['Staff', 'Grimoire', 'Orb'],
    [CombatStyle.ARCHMAGE]: ['Grimoire', 'Staff'],
    [CombatStyle.GRAND_SAGE]: ['Grimoire', 'Staff'],
    [CombatStyle.SAINT]: ['Staff', 'Orb'],
    [CombatStyle.SPIRIT_KING]: ['Orb', 'Staff'],
    [CombatStyle.MAGIC_EMPEROR]: ['Orb', 'Staff'],
    [CombatStyle.PLASMA_LORD]: ['Energy'],
    [CombatStyle.LASER_MASTER]: ['Energy'],
    [CombatStyle.BEAM_LORD]: ['Energy'],
    [CombatStyle.ENERGY_MASTER]: ['Energy'],
    [CombatStyle.OVERLORD]: ['Energy']
};

export const COMBAT_STYLE_CONFIG: Record<CombatStyle, CombatStyleInfo> = {
    // ==========================================
    // 1. 검사 계통
    // ==========================================
    [CombatStyle.SWORDSMAN]: {
        style: CombatStyle.SWORDSMAN,
        label: '검사',
        tier: 1,
        rootStyle: CombatStyle.SWORDSMAN,
        minMastery: 10,
        specialtyText: '검, 보조검, 방패 특화',
        description: '검과 방패의 균형 잡힌 연계로 공수일체의 전술을 구사하는 기본 전사입니다.',
        weapons: ['Sword', 'SubSword', 'Shield'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Sword',
        bonusDescription: '방어력 +15%',
        bonuses: {"pDef":0.15,"mDef":0.15}
    },
    [CombatStyle.KNIGHT]: {
        style: CombatStyle.KNIGHT,
        label: '기사',
        tier: 2,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.SWORDSMAN,
        minMastery: 30,
        specialtyText: '방패 + 검 (방어 특화)',
        description: '단단한 방패와 검으로 아군을 보호하고 전열을 유지하는 방어 특화 전사입니다.',
        weapons: ['Shield', 'Sword'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Shield',
        bonusDescription: '방어력 +15%, 어둠 속성 저항 +10%',
        bonuses: {"pDef":0.15,"mDef":0.15,"res_암흑계":0.1}
    },
    [CombatStyle.MAGIC_SWORDSMAN]: {
        style: CombatStyle.MAGIC_SWORDSMAN,
        label: '마검사',
        tier: 2,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.SWORDSMAN,
        minMastery: 30,
        specialtyText: '검 + 마법 (하이브리드)',
        description: '검술과 마법을 동시에 연마하여 물리와 마법을 아우르는 전술을 구사하는 마검사입니다.',
        weapons: ['Sword', 'Staff', 'Grimoire'],
        color: 'text-purple-400',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법공격력 +5%, 신력계통 속성 피해 +5%',
        bonuses: { "mAtk": 0.05, "shinryoku_atk": 0.05 }
    },
    [CombatStyle.DUAL_SWORDSMAN]: {
        style: CombatStyle.DUAL_SWORDSMAN,
        label: '쌍검사',
        tier: 2,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.SWORDSMAN,
        minMastery: 30,
        specialtyText: '보조검 + 검 (공격 특화)',
        description: '양손에 검을 쥐고 맹렬한 기세로 적을 압도하는 공격 특화 검사입니다.',
        weapons: ['SubSword', 'Sword'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Sword',
        bonusDescription: '치명타율 +5%, 물리 공격력 +5%',
        bonuses: {"crit":5,"pAtk":0.05}
    },
    [CombatStyle.PALADIN]: {
        style: CombatStyle.PALADIN,
        label: '성기사',
        tier: 3,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.KNIGHT,
        minMastery: 60,
        specialtyText: '방어 + 신성/지원',
        description: '신성한 가호와 방패로 전장을 수호하며 아군을 치유하고 보호하는 성기사입니다.',
        weapons: ['Shield', 'Sword'],
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-950/40',
        borderColor: 'border-yellow-500/50',
        iconName: 'Shield',
        bonusDescription: '방어력 +25%, 치명타 피해 감소 +20%, 광휘계 속성 피해 +15%',
        bonuses: {"pDef":0.25,"mDef":0.25,"critDmgResist":20,"atk_광휘계":0.15}
    },
    [CombatStyle.MAGIC_KNIGHT]: {
        style: CombatStyle.MAGIC_KNIGHT,
        label: '매직 나이트',
        tier: 3,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.MAGIC_SWORDSMAN,
        minMastery: 60,
        specialtyText: '고급 마법 검술',
        description: '마력을 검신에 응축시켜 파괴적인 마법 검기를 발산하는 상급 마검사입니다.',
        weapons: ['Sword', 'Staff', 'Orb'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-400/50',
        iconName: 'Zap',
        bonusDescription: '마법공격력 +10%, 신력계통 속성 피해 +10%',
        bonuses: { "mAtk": 0.1, "shinryoku_atk": 0.1 }
    },
    [CombatStyle.IRONCLAD_KNIGHT]: {
        style: CombatStyle.IRONCLAD_KNIGHT,
        label: '철벽기사',
        tier: 3,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.KNIGHT,
        minMastery: 60,
        specialtyText: '순수 방어/탱킹',
        description: '어떠한 물리/마법 충격도 흡수하는 강철의 방벽이자 최전선의 절대 수호자입니다.',
        weapons: ['Shield', 'Sword'],
        color: 'text-slate-300',
        bgColor: 'bg-slate-900',
        borderColor: 'border-slate-500/50',
        iconName: 'Shield',
        bonusDescription: '방어력 +35%, 상태이상 저항 +15%',
        bonuses: {"pDef":0.35,"mDef":0.35,"resist":15}
    },
    [CombatStyle.BLADE_DANCER]: {
        style: CombatStyle.BLADE_DANCER,
        label: '검무사',
        tier: 3,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.DUAL_SWORDSMAN,
        minMastery: 60,
        specialtyText: '고속 연격',
        description: '바람처럼 춤추는 듯한 칼놀림으로 찰나에 수많은 참격을 꽂아넣는 검무의 달인입니다.',
        weapons: ['SubSword', 'Sword'],
        color: 'text-amber-200',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-400/50',
        iconName: 'Zap',
        bonusDescription: '치명타율 +10%, 속도(Agi) +20%',
        bonuses: {"crit":10,"agi":0.2}
    },
    [CombatStyle.GLADIATOR]: {
        style: CombatStyle.GLADIATOR,
        label: '검투사',
        tier: 3,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.DUAL_SWORDSMAN,
        minMastery: 60,
        specialtyText: '공격력/결투 특화',
        description: '일대일 결투에서 무자비한 파괴력과 공격성으로 적을 쓰러뜨리는 결투의 투사입니다.',
        weapons: ['SubSword', 'Sword'],
        color: 'text-orange-400',
        bgColor: 'bg-orange-950/40',
        borderColor: 'border-orange-500/50',
        iconName: 'Flame',
        bonusDescription: '명중률 +15%, 물리 공격력 +10%',
        bonuses: {"acc":0.15,"pAtk":0.1}
    },
    [CombatStyle.CRUSADER]: {
        style: CombatStyle.CRUSADER,
        label: '성전사',
        tier: 4,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.PALADIN,
        minMastery: 100,
        specialtyText: '신성한 수호와 징벌',
        description: '신성한 빛의 힘으로 악을 정벌하고 불멸의 방패로 전장을 지배하는 최상위 성전사입니다.',
        weapons: ['Shield', 'Sword'],
        color: 'text-yellow-200',
        bgColor: 'bg-yellow-950/50',
        borderColor: 'border-yellow-400',
        iconName: 'Crown',
        bonusDescription: '방어력 +40%, 광휘계 속성 피해 +25%',
        bonuses: {"pDef":0.4,"mDef":0.4,"atk_광휘계":0.25}
    },
    [CombatStyle.HYBRID]: {
        style: CombatStyle.HYBRID,
        label: '하이브리드',
        tier: 4,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.MAGIC_KNIGHT,
        minMastery: 100,
        specialtyText: '마검 합일의 경지',
        description: '물리적 참격과 마법적 파괴력이 완벽한 조화를 이루어 전장을 초토화하는 최상위 마검사입니다.',
        weapons: ['Sword', 'Staff', 'Energy'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '마법공격력 +20%, 신력계통 속성 피해 +20%',
        bonuses: { "mAtk": 0.2, "shinryoku_atk": 0.2 }
    },
    [CombatStyle.GUARDIAN_KNIGHT]: {
        style: CombatStyle.GUARDIAN_KNIGHT,
        label: '수호기사',
        tier: 4,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.IRONCLAD_KNIGHT,
        minMastery: 100,
        specialtyText: '불멸의 철벽 수호',
        description: '산맥과도 같은 절대 불굴의 방어력으로 모든 공격을 무력화하는 전설의 수호자입니다.',
        weapons: ['Shield', 'Sword'],
        color: 'text-slate-100',
        bgColor: 'bg-slate-900',
        borderColor: 'border-slate-300',
        iconName: 'Shield',
        bonusDescription: '방어력 +50%, 상태이상 저항 +30%',
        bonuses: {"pDef":0.5,"mDef":0.5,"resist":30}
    },
    [CombatStyle.SWORD_EMPEROR]: {
        style: CombatStyle.SWORD_EMPEROR,
        label: '검제',
        tier: 4,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.BLADE_DANCER,
        minMastery: 100,
        specialtyText: '섬광의 극의 연격',
        description: '검의 극의에 도달하여 공간마저 베어 넘기는 전설의 검의 제왕입니다.',
        weapons: ['SubSword', 'Sword'],
        color: 'text-amber-200',
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-400',
        iconName: 'Crown',
        bonusDescription: '치명타율 +15%, 속도(Agi) +40%',
        bonuses: {"crit":15,"agi":0.4}
    },
    [CombatStyle.BATTLE_KING]: {
        style: CombatStyle.BATTLE_KING,
        label: '투왕',
        tier: 4,
        rootStyle: CombatStyle.SWORDSMAN,
        parentStyle: CombatStyle.GLADIATOR,
        minMastery: 100,
        specialtyText: '전장의 절대 패자',
        description: '수많은 결투를 승리로 이끌며 전장의 정점에 우뚝 선 절대 투왕입니다.',
        weapons: ['SubSword', 'Sword'],
        color: 'text-red-300',
        bgColor: 'bg-red-950/50',
        borderColor: 'border-red-400',
        iconName: 'Award',
        bonusDescription: '명중률 +25%, 물리 공격력 +30%',
        bonuses: {"acc":0.25,"pAtk":0.3}
    },

    // ==========================================
    // 2. 창술사 계통
    // ==========================================
    [CombatStyle.SPEARMAN]: {
        style: CombatStyle.SPEARMAN,
        label: '창술사',
        tier: 1,
        rootStyle: CombatStyle.SPEARMAN,
        minMastery: 10,
        specialtyText: '창/폴암 특화',
        description: '긴 사거리와 강력한 찌르기로 적의 접근을 원천 봉쇄하는 무예가입니다.',
        weapons: ['Spear'],
        color: 'text-blue-400',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-500/50',
        iconName: 'Crosshair',
        bonusDescription: '물리 공격력 +15%, 명중률 +10%',
        bonuses: {"pAtk":0.15,"acc":0.10}
    },
    [CombatStyle.LANCER]: {
        style: CombatStyle.LANCER,
        label: '창기사',
        tier: 2,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.SPEARMAN,
        minMastery: 30,
        specialtyText: '물리 공격 특화 창술',
        description: '창의 긴 리치와 묵직한 관통력으로 전열을 꿰뚫는 물리 특화 기사입니다.',
        weapons: ['Spear'],
        color: 'text-blue-400',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-500/50',
        iconName: 'Crosshair',
        bonusDescription: '물리 공격력 +10%',
        bonuses: {"pAtk":0.1}
    },
    [CombatStyle.MAGIC_SPEARMAN]: {
        style: CombatStyle.MAGIC_SPEARMAN,
        label: '마창사',
        tier: 2,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.SPEARMAN,
        minMastery: 30,
        specialtyText: '마법/원소 부여 창술',
        description: '창끝에 마력과 원소를 융합하여 파괴적인 마법 창격을 가합니다.',
        weapons: ['Spear'],
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-950/40',
        borderColor: 'border-indigo-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +10%, 신력 계통 속성 피해 +5%',
        bonuses: {"mAtk":0.1,"shinryoku_atk":0.05}
    },
    [CombatStyle.DRAGON_KNIGHT]: {
        style: CombatStyle.DRAGON_KNIGHT,
        label: '용기사',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.LANCER,
        minMastery: 60,
        specialtyText: '창 + 강력한 물리 공격',
        description: '용의 기상을 품고 하늘에서 내리꽂히는 파괴적인 공중 창술을 구사합니다.',
        weapons: ['Spear'],
        color: 'text-sky-300',
        bgColor: 'bg-sky-950/40',
        borderColor: 'border-sky-500/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +20%, 신력 계통 속성 피해 +5%',
        bonuses: {"pAtk":0.2,"shinryoku_atk":0.05}
    },
    [CombatStyle.CAVALRY_LEADER]: {
        style: CombatStyle.CAVALRY_LEADER,
        label: '기병장',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.LANCER,
        minMastery: 60,
        specialtyText: '돌진/기동성 특화',
        description: '번개 같은 기동력과 강력한 돌진력으로 적진의 진형을 단숨에 붕괴시킵니다.',
        weapons: ['Spear'],
        color: 'text-blue-300',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-400/50',
        iconName: 'Zap',
        bonusDescription: '물리 공격력 +15%, 속도(Agi) +15%',
        bonuses: {"pAtk":0.15,"agi":0.15}
    },
    [CombatStyle.HOLY_KNIGHT]: {
        style: CombatStyle.HOLY_KNIGHT,
        label: '홀리 나이트',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.LANCER,
        minMastery: 60,
        specialtyText: '신성/빛의 창기사',
        description: '신성한 빛의 축복을 받은 창으로 적을 정벌하고 우군을 보호하는 성스러운 기사입니다.',
        weapons: ['Spear'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Shield',
        bonusDescription: '물리 공격력 +15%, 방어력 +15%, 신성 속성 피해 +15%',
        bonuses: {"pAtk":0.15,"def":0.15,"shinryoku_atk":0.15}
    },
    [CombatStyle.MAGIC_LANCER]: {
        style: CombatStyle.MAGIC_LANCER,
        label: '마창술사',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.MAGIC_SPEARMAN,
        minMastery: 60,
        specialtyText: '마법 창격',
        description: '고밀도 마력 파동을 창끝에 응축시켜 원거리와 근거리의 적을 섬멸합니다.',
        weapons: ['Spear'],
        color: 'text-indigo-300',
        bgColor: 'bg-indigo-950/40',
        borderColor: 'border-indigo-400/50',
        iconName: 'Sparkles',
        bonusDescription: '마법/물리 공격력 +15%, 마법 명중률 +10%, 신력 계통 속성 피해 +15%',
        bonuses: {"mAtk":0.15,"pAtk":0.15,"mAcc":0.1,"shinryoku_atk":0.15}
    },
    [CombatStyle.DARK_KNIGHT]: {
        style: CombatStyle.DARK_KNIGHT,
        label: '다크 나이트',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.MAGIC_SPEARMAN,
        minMastery: 60,
        specialtyText: '암흑/마창사',
        description: '심연의 암흑 마력을 창에 주입하여 적의 생명력을 흡수하고 파괴하는 창기사입니다.',
        weapons: ['Spear'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-500/50',
        iconName: 'Flame',
        bonusDescription: '물리/마법 공격력 +15%, 흡혈 및 암흑 속성 피해 +15%',
        bonuses: {"pAtk":0.15,"mAtk":0.15,"shinryoku_atk":0.15}
    },
    [CombatStyle.ELEMENTAL_LANCER]: {
        style: CombatStyle.ELEMENTAL_LANCER,
        label: '원소창사',
        tier: 3,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.MAGIC_SPEARMAN,
        minMastery: 60,
        specialtyText: '원소(신력) 특화',
        description: '불/얼음/번개 등 원소의 힘을 창에 깃들여 강력한 속성 폭발을 일으킵니다.',
        weapons: ['Spear'],
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +15%, 신력 계통 속성 피해 +20%',
        bonuses: {"mAtk":0.15,"shinryoku_atk":0.2}
    },
    [CombatStyle.SKY_DRAGON_KNIGHT]: {
        style: CombatStyle.SKY_DRAGON_KNIGHT,
        label: '천룡기사',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.DRAGON_KNIGHT,
        minMastery: 100,
        specialtyText: '용의 비상과 궤멸격',
        description: '천룡의 강림과도 같은 압도적인 위압감으로 적을 궤멸시키는 전설의 용기사입니다.',
        weapons: ['Spear'],
        color: 'text-sky-200',
        bgColor: 'bg-sky-950/50',
        borderColor: 'border-sky-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +35%, 신력 계통 속성 피해 +30%',
        bonuses: {"pAtk":0.35,"shinryoku_atk":0.3}
    },
    [CombatStyle.ASSAULT_COMMANDER]: {
        style: CombatStyle.ASSAULT_COMMANDER,
        label: '돌격대장',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.CAVALRY_LEADER,
        minMastery: 100,
        specialtyText: '파죽지세의 돌격',
        description: '그 어떤 방어선도 뚫어버리는 전장의 선봉장이자 돌격의 지배자입니다.',
        weapons: ['Spear'],
        color: 'text-blue-200',
        bgColor: 'bg-blue-950/50',
        borderColor: 'border-blue-400',
        iconName: 'Shield',
        bonusDescription: '물리 공격력 +25%, 속도(Agi) +25%',
        bonuses: {"pAtk":0.25,"agi":0.25}
    },
    [CombatStyle.DIVINE_KNIGHT]: {
        style: CombatStyle.DIVINE_KNIGHT,
        label: '디바인 나이트',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.HOLY_KNIGHT,
        minMastery: 100,
        specialtyText: '신성의 지배자',
        description: '신성한 광휘와 불멸의 의지로 전장을 수호하는 신성 창기사의 정점입니다.',
        weapons: ['Spear'],
        color: 'text-amber-200',
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +30%, 방어력 +25%, 신성 속성 피해 +30%',
        bonuses: {"pAtk":0.3,"def":0.25,"shinryoku_atk":0.3}
    },
    [CombatStyle.MAGIC_SPEAR_KING]: {
        style: CombatStyle.MAGIC_SPEAR_KING,
        label: '마창왕',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.MAGIC_LANCER,
        minMastery: 100,
        specialtyText: '궁극의 마창격',
        description: '마력과 창술의 경지를 초월하여 전장을 마력의 창으로 뒤덮는 마창의 왕입니다.',
        weapons: ['Spear'],
        color: 'text-indigo-200',
        bgColor: 'bg-indigo-950/50',
        borderColor: 'border-indigo-400',
        iconName: 'Crown',
        bonusDescription: '마법/물리 공격력 +25%, 마법 명중률 +20%, 신력 계통 속성 피해 +35%',
        bonuses: {"mAtk":0.25,"pAtk":0.25,"mAcc":0.2,"shinryoku_atk":0.35}
    },
    [CombatStyle.ABYSS_KNIGHT]: {
        style: CombatStyle.ABYSS_KNIGHT,
        label: '어비스 나이트',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.DARK_KNIGHT,
        minMastery: 100,
        specialtyText: '심연의 마창군주',
        description: '끝없는 심연의 칠흑 마력으로 전장을 절망에 빠뜨리는 절대 암흑 창기사입니다.',
        weapons: ['Spear'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '물리/마법 공격력 +30%, 암흑 속성 피해 +35%',
        bonuses: {"pAtk":0.3,"mAtk":0.3,"shinryoku_atk":0.35}
    },
    [CombatStyle.SPEAR_SAGE]: {
        style: CombatStyle.SPEAR_SAGE,
        label: '창의현자',
        tier: 4,
        rootStyle: CombatStyle.SPEARMAN,
        parentStyle: CombatStyle.ELEMENTAL_LANCER,
        minMastery: 100,
        specialtyText: '삼라만상의 원소 창',
        description: '모든 자연 원소의 조화를 창끝에 담아내는 전설의 원소 창술 현자입니다.',
        weapons: ['Spear'],
        color: 'text-cyan-200',
        bgColor: 'bg-cyan-950/50',
        borderColor: 'border-cyan-400',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +25%, 신력 계통 속성 피해 +40%',
        bonuses: {"mAtk":0.25,"shinryoku_atk":0.4}
    },

    // ==========================================
    // 3. 광전사 계통
    // ==========================================
    [CombatStyle.BERSERKER]: {
        style: CombatStyle.BERSERKER,
        label: '광전사',
        tier: 1,
        rootStyle: CombatStyle.BERSERKER,
        minMastery: 10,
        specialtyText: '도끼, 둔기 특화',
        description: '묵직한 도끼와 둔기로 적의 방어를 분쇄하고 파괴적인 타격을 가합니다.',
        weapons: ['Axe', 'Blunt'],
        color: 'text-red-400',
        bgColor: 'bg-red-950/40',
        borderColor: 'border-red-500/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +20%, 치명타 피해량 +20%',
        bonuses: {"pAtk":0.20,"critDmg":20}
    },
    [CombatStyle.AXE_WARRIOR]: {
        style: CombatStyle.AXE_WARRIOR,
        label: '도끼전사',
        tier: 2,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.BERSERKER,
        minMastery: 30,
        specialtyText: '도끼 특화',
        description: '날카롭고 묵직한 도끼로 적의 갑주를 찢어발기는 도끼 전문 전사입니다.',
        weapons: ['Axe'],
        color: 'text-red-400',
        bgColor: 'bg-red-950/40',
        borderColor: 'border-red-500/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +10%, 치명타 피해 +10%',
        bonuses: {"pAtk":0.1,"critDmg":10}
    },
    [CombatStyle.DESTROYER]: {
        style: CombatStyle.DESTROYER,
        label: '파괴전사',
        tier: 2,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.BERSERKER,
        minMastery: 30,
        specialtyText: '둔기 특화',
        description: '거대한 둔기의 충격파로 적의 뼈마디를 부수고 방어구를 찌그러뜨립니다.',
        weapons: ['Blunt'],
        color: 'text-rose-400',
        bgColor: 'bg-rose-950/40',
        borderColor: 'border-rose-500/50',
        iconName: 'Hammer',
        bonusDescription: '물리 공격력 +20%, 방어력 -5%',
        bonuses: {"pAtk":0.2,"pDef":-0.05,"mDef":-0.05}
    },
    [CombatStyle.EXECUTIONER]: {
        style: CombatStyle.EXECUTIONER,
        label: '처형자',
        tier: 3,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.AXE_WARRIOR,
        minMastery: 60,
        specialtyText: '단일 대상/치명타',
        description: '급소를 노린 무자비한 일격으로 적을 단숨에 처형하는 처형 전문 전사입니다.',
        weapons: ['Axe'],
        color: 'text-red-300',
        bgColor: 'bg-red-950/40',
        borderColor: 'border-red-400/50',
        iconName: 'Skull',
        bonusDescription: '물리 공격력 +15%, 치명타 피해 +20%',
        bonuses: {"pAtk":0.15,"critDmg":20}
    },
    [CombatStyle.AXE_BERSERKER]: {
        style: CombatStyle.AXE_BERSERKER,
        label: '도끼광전사',
        tier: 3,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.AXE_WARRIOR,
        minMastery: 60,
        specialtyText: '광역 휩쓸기',
        description: '도끼를 휘두르며 폭풍처럼 전장을 휩쓸어 주변의 모든 적을 베어냅니다.',
        weapons: ['Axe'],
        color: 'text-red-300',
        bgColor: 'bg-red-950/40',
        borderColor: 'border-red-400/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +30%, 물리 방어력 -10%',
        bonuses: {"pAtk":0.3,"pDef":-0.1}
    },
    [CombatStyle.SHIELD_BERSERKER]: {
        style: CombatStyle.SHIELD_BERSERKER,
        label: '방패광전사',
        tier: 3,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.AXE_WARRIOR,
        minMastery: 60,
        specialtyText: '도끼 + 방패 (탱커)',
        description: '도끼와 방패를 함께 다루며 적의 공격을 버텨내면서 묵직한 반격을 가하는 방어형 광전사입니다.',
        weapons: ['Axe', 'Shield'],
        color: 'text-red-300',
        bgColor: 'bg-red-950/40',
        borderColor: 'border-red-400/50',
        iconName: 'Shield',
        bonusDescription: '방어력 +15%, 치명타 피해 감소 +20%, 물리 공격력 +10%',
        bonuses: {"pDef":0.15,"mDef":0.15,"critDmgResist":20,"pAtk":0.1}
    },
    [CombatStyle.MACE_WARRIOR]: {
        style: CombatStyle.MACE_WARRIOR,
        label: '철퇴전사',
        tier: 3,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.DESTROYER,
        minMastery: 60,
        specialtyText: '방어 파괴/제압',
        description: '강력한 철퇴의 타격으로 방어력을 깎아내고 적을 완벽하게 제압합니다.',
        weapons: ['Blunt'],
        color: 'text-rose-300',
        bgColor: 'bg-rose-950/40',
        borderColor: 'border-rose-400/50',
        iconName: 'Hammer',
        bonusDescription: '물리 공격력 +25%, 명중률 -5%',
        bonuses: {"pAtk":0.25,"acc":-0.05}
    },
    [CombatStyle.CRUSHER]: {
        style: CombatStyle.CRUSHER,
        label: '분쇄자',
        tier: 3,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.DESTROYER,
        minMastery: 60,
        specialtyText: '순수 공격력/파쇄',
        description: '압도적인 완력으로 눈앞의 모든 장애물을 가루로 만들어버립니다.',
        weapons: ['Blunt'],
        color: 'text-rose-300',
        bgColor: 'bg-rose-950/40',
        borderColor: 'border-rose-400/50',
        iconName: 'Hammer',
        bonusDescription: '물리 공격력 +35%, 속도(Agi) -10%',
        bonuses: {"pAtk":0.35,"agi":-0.1}
    },
    [CombatStyle.DECAPITATOR]: {
        style: CombatStyle.DECAPITATOR,
        label: '참수자',
        tier: 4,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.EXECUTIONER,
        minMastery: 100,
        specialtyText: '단칼의 즉사급 절명',
        description: '어떠한 강적도 단 한 합에 참수하는 공포의 처형자입니다.',
        weapons: ['Axe'],
        color: 'text-red-200',
        bgColor: 'bg-red-950/50',
        borderColor: 'border-red-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +45%, 치명타 피해 +35%',
        bonuses: {"pAtk":0.45,"critDmg":35}
    },
    [CombatStyle.AXE_LORD]: {
        style: CombatStyle.AXE_LORD,
        label: '도끼군주',
        tier: 4,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.AXE_BERSERKER,
        minMastery: 100,
        specialtyText: '전장을 휩쓰는 도끼 폭풍',
        description: '거대한 도끼 폭풍으로 군대마저 삼켜버리는 광전의 군주입니다.',
        weapons: ['Axe'],
        color: 'text-red-200',
        bgColor: 'bg-red-950/50',
        borderColor: 'border-red-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +65%, 물리 방어력 -15%',
        bonuses: {"pAtk":0.65,"pDef":-0.15}
    },
    [CombatStyle.SHIELD_BERSERK_LORD]: {
        style: CombatStyle.SHIELD_BERSERK_LORD,
        label: '방패광전군주',
        tier: 4,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.SHIELD_BERSERKER,
        minMastery: 100,
        specialtyText: '도끼 + 방패 (궁극의 광전 요새)',
        description: '강철 방패로 어떠한 충격도 막아내며 도끼의 파멸적인 반격으로 전장을 지배하는 방패광전 군주입니다.',
        weapons: ['Axe', 'Shield'],
        color: 'text-red-200',
        bgColor: 'bg-red-950/50',
        borderColor: 'border-red-400',
        iconName: 'Crown',
        bonusDescription: '방어력 +35%, 치명타 피해 감소 +35%, 물리 공격력 +25%',
        bonuses: {"pDef":0.35,"mDef":0.35,"critDmgResist":35,"pAtk":0.25}
    },
    [CombatStyle.DESTRUCTION_LORD]: {
        style: CombatStyle.DESTRUCTION_LORD,
        label: '파괴군주',
        tier: 4,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.MACE_WARRIOR,
        minMastery: 100,
        specialtyText: '모든 방어의 완전 분쇄',
        description: '그 어떤 방패와 결계도 산산조각 내는 파괴의 군주입니다.',
        weapons: ['Blunt'],
        color: 'text-rose-200',
        bgColor: 'bg-rose-950/50',
        borderColor: 'border-rose-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +60%, 명중률 -10%',
        bonuses: {"pAtk":0.6,"acc":-0.1}
    },
    [CombatStyle.GRAND_CRUSHER]: {
        style: CombatStyle.GRAND_CRUSHER,
        label: '대분쇄자',
        tier: 4,
        rootStyle: CombatStyle.BERSERKER,
        parentStyle: CombatStyle.CRUSHER,
        minMastery: 100,
        specialtyText: '대지를 뒤흔드는 파쇄력',
        description: '대지마저 가루로 만드는 불가항력적인 완력의 정점입니다.',
        weapons: ['Blunt'],
        color: 'text-rose-200',
        bgColor: 'bg-rose-950/50',
        borderColor: 'border-rose-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +70%, 속도(Agi) -20%',
        bonuses: {"pAtk":0.7,"agi":-0.2}
    },

    // ==========================================
    // 4. 권투사 계통
    // ==========================================
    [CombatStyle.BOXER]: {
        style: CombatStyle.BOXER,
        label: '권투사',
        tier: 1,
        rootStyle: CombatStyle.BOXER,
        minMastery: 10,
        specialtyText: '너클 특화',
        description: '날렵한 몸놀림과 단련된 주먹으로 적에게 연속적인 치명타를 쏟아붓습니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-400',
        bgColor: 'bg-orange-950/40',
        borderColor: 'border-orange-500/50',
        iconName: 'Zap',
        bonusDescription: '회피율 +10%, 치명타 확률 +8%',
        bonuses: {"eva":10,"crit":8}
    },
    [CombatStyle.MARTIAL_ARTIST]: {
        style: CombatStyle.MARTIAL_ARTIST,
        label: '격투가',
        tier: 2,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.BOXER,
        minMastery: 30,
        specialtyText: '연속 공격 특화',
        description: '끊임없이 몰아치는 빠른 연타로 상대에게 반격할 틈을 주지 않습니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-400',
        bgColor: 'bg-orange-950/40',
        borderColor: 'border-orange-500/50',
        iconName: 'Zap',
        bonusDescription: '속도(Agi) +10%, 회피율 +5%',
        bonuses: {"agi":0.1,"eva":0.05}
    },
    [CombatStyle.PUGILIST]: {
        style: CombatStyle.PUGILIST,
        label: '권투가',
        tier: 2,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.BOXER,
        minMastery: 30,
        specialtyText: '강력한 일격 특화',
        description: '체중을 실은 묵직한 단 한 방의 정권으로 적에게 치명상을 입힙니다.',
        weapons: ['Knuckle'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +10%, 치명타율 +5%',
        bonuses: {"pAtk":0.1,"crit":5}
    },
    [CombatStyle.COMBATANT]: {
        style: CombatStyle.COMBATANT,
        label: '무투가',
        tier: 3,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.MARTIAL_ARTIST,
        minMastery: 60,
        specialtyText: '기술/콤보 연계',
        description: '물 흐르듯 이어지는 다양한 체술 콤보로 적을 완벽히 제압합니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-300',
        bgColor: 'bg-orange-950/40',
        borderColor: 'border-orange-400/50',
        iconName: 'Zap',
        bonusDescription: '속도(Agi) +15%, 회피율 +10%',
        bonuses: {"agi":0.15,"eva":0.1}
    },
    [CombatStyle.COMBO_MASTER]: {
        style: CombatStyle.COMBO_MASTER,
        label: '연격사',
        tier: 3,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.MARTIAL_ARTIST,
        minMastery: 60,
        specialtyText: '공격속도/극한 연타',
        description: '눈에 보이지 않는 초고속 주먹으로 수십 합의 연타를 꽂아넣습니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-300',
        bgColor: 'bg-orange-950/40',
        borderColor: 'border-orange-400/50',
        iconName: 'Zap',
        bonusDescription: '속도(Agi) +20%, 명중률 +10%',
        bonuses: {"agi":0.2,"acc":0.1}
    },
    [CombatStyle.FIGHTER]: {
        style: CombatStyle.FIGHTER,
        label: '파이터',
        tier: 3,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.PUGILIST,
        minMastery: 60,
        specialtyText: '공수 균형형',
        description: '공격과 방어의 완벽한 밸런스로 어떤 전장에서도 물러서지 않는 투사입니다.',
        weapons: ['Knuckle'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-400/50',
        iconName: 'Shield',
        bonusDescription: '물리 공격력 +15%, 방어력 +10%',
        bonuses: {"pAtk":0.15,"pDef":0.1,"mDef":0.1}
    },
    [CombatStyle.FIST_SAINT]: {
        style: CombatStyle.FIST_SAINT,
        label: '권성',
        tier: 3,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.PUGILIST,
        minMastery: 60,
        specialtyText: '강력한 권격의 극의',
        description: '주먹에 혼을 담아 기공과 충격파를 방출하는 권법의 달인입니다.',
        weapons: ['Knuckle'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-400/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +20%, 치명타율 +10%',
        bonuses: {"pAtk":0.2,"crit":10}
    },
    [CombatStyle.WAR_GOD]: {
        style: CombatStyle.WAR_GOD,
        label: '무신',
        tier: 4,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.COMBATANT,
        minMastery: 100,
        specialtyText: '무예의 신격',
        description: '인간의 한계를 초월하여 무예 그 자체가 된 살아있는 신화입니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-200',
        bgColor: 'bg-orange-950/50',
        borderColor: 'border-orange-400',
        iconName: 'Crown',
        bonusDescription: '속도(Agi) +25%, 회피율 +20%',
        bonuses: {"agi":0.25,"eva":0.2}
    },
    [CombatStyle.COMBO_EMPEROR]: {
        style: CombatStyle.COMBO_EMPEROR,
        label: '연격제',
        tier: 4,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.COMBO_MASTER,
        minMastery: 100,
        specialtyText: '무한의 광속 연타',
        description: '공간마저 쪼개는 무한 연격으로 상대의 존재를 지워버립니다.',
        weapons: ['Knuckle'],
        color: 'text-orange-200',
        bgColor: 'bg-orange-950/50',
        borderColor: 'border-orange-400',
        iconName: 'Crown',
        bonusDescription: '속도(Agi) +35%, 명중률 +20%',
        bonuses: {"agi":0.35,"acc":0.2}
    },
    [CombatStyle.FIST_GOD]: {
        style: CombatStyle.FIST_GOD,
        label: '투신',
        tier: 4,
        rootStyle: CombatStyle.BOXER,
        parentStyle: CombatStyle.FIST_SAINT,
        minMastery: 100,
        specialtyText: '일격필살의 투신',
        description: '단 한 번의 주먹으로 산을 무너뜨리는 주먹의 신입니다.',
        weapons: ['Knuckle'],
        color: 'text-amber-200',
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +35%, 치명타율 +15%',
        bonuses: {"pAtk":0.35,"crit":15}
    },

    // ==========================================
    // 5. 궁수 계통
    // ==========================================
    [CombatStyle.ARCHER]: {
        style: CombatStyle.ARCHER,
        label: '궁수',
        tier: 1,
        rootStyle: CombatStyle.ARCHER,
        minMastery: 10,
        specialtyText: '활, 석궁 특화',
        description: '원거리에서 정밀하게 적의 급소를 노려 사격하는 명사수입니다.',
        weapons: ['Bow', 'Crossbow'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-500/50',
        iconName: 'Target',
        bonusDescription: '명중률 +15%, 치명타 확률 +10%',
        bonuses: {"acc":15,"crit":10}
    },
    [CombatStyle.BOWMAN]: {
        style: CombatStyle.BOWMAN,
        label: '궁사',
        tier: 2,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.ARCHER,
        minMastery: 30,
        specialtyText: '활 특화',
        description: '활시위의 탄력을 극대화하여 장거리 곡사와 속사를 펼칩니다.',
        weapons: ['Bow'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-500/50',
        iconName: 'Target',
        bonusDescription: '명중률 +10%, 속도(Agi) +5%',
        bonuses: {"acc":0.1,"agi":0.05}
    },
    [CombatStyle.CROSSBOWMAN]: {
        style: CombatStyle.CROSSBOWMAN,
        label: '석궁사',
        tier: 2,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.ARCHER,
        minMastery: 30,
        specialtyText: '석궁 특화',
        description: '강력한 장전력으로 적의 갑옷을 뚫는 직사 관통탄을 쏩니다.',
        weapons: ['Crossbow'],
        color: 'text-teal-400',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-500/50',
        iconName: 'Crosshair',
        bonusDescription: '치명타 피해 +15%, 물리 공격력 +5%',
        bonuses: {"critDmg":15,"pAtk":0.05}
    },
    [CombatStyle.MASTER_ARCHER]: {
        style: CombatStyle.MASTER_ARCHER,
        label: '명궁',
        tier: 3,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.BOWMAN,
        minMastery: 60,
        specialtyText: '장거리/정밀 사격',
        description: '수백 보 밖에서도 적의 숨통을 정확히 노려 맞히는 저격수입니다.',
        weapons: ['Bow'],
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-400/50',
        iconName: 'Target',
        bonusDescription: '명중률 +20%, 속도(Agi) +10%',
        bonuses: {"acc":0.2,"agi":0.1}
    },
    [CombatStyle.WIND_ARCHER]: {
        style: CombatStyle.WIND_ARCHER,
        label: '풍궁사',
        tier: 3,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.BOWMAN,
        minMastery: 60,
        specialtyText: '속사/기동 사격',
        description: '바람을 타듯 빠르게 이동하며 연속으로 화살을 쏘아댑니다.',
        weapons: ['Bow'],
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-400/50',
        iconName: 'Zap',
        bonusDescription: '속도(Agi) +20%, 신력 계통 속성 피해 +15%',
        bonuses: {"agi":0.2,"shinryoku_atk":0.15}
    },
    [CombatStyle.SNIPER]: {
        style: CombatStyle.SNIPER,
        label: '저격수',
        tier: 3,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.CROSSBOWMAN,
        minMastery: 60,
        specialtyText: '단일 대상 관통',
        description: '숨을 죽이고 단 한 발의 강력한 관통 화살로 적을 무너뜨립니다.',
        weapons: ['Crossbow'],
        color: 'text-teal-300',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-400/50',
        iconName: 'Crosshair',
        bonusDescription: '치명타율 +10%, 치명타 피해 +20%',
        bonuses: {"crit":10,"critDmg":20}
    },
    [CombatStyle.HUNTER]: {
        style: CombatStyle.HUNTER,
        label: '사냥꾼',
        tier: 3,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.CROSSBOWMAN,
        minMastery: 60,
        specialtyText: '함정/특수탄',
        description: '다양한 속성 탄환과 함정으로 사냥감을 서서히 옥죄어 갑니다.',
        weapons: ['Crossbow'],
        color: 'text-teal-300',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-400/50',
        iconName: 'Target',
        bonusDescription: '물리 공격력 +15%, 치명타율 +5%',
        bonuses: {"pAtk":0.15,"crit":5}
    },
    [CombatStyle.DIVINE_ARCHER]: {
        style: CombatStyle.DIVINE_ARCHER,
        label: '신궁',
        tier: 4,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.MASTER_ARCHER,
        minMastery: 100,
        specialtyText: '백발백중의 신화',
        description: '쏘아진 화살은 반드시 운명을 꿰뚫는 전설의 신궁입니다.',
        weapons: ['Bow'],
        color: 'text-emerald-200',
        bgColor: 'bg-emerald-950/50',
        borderColor: 'border-emerald-400',
        iconName: 'Crown',
        bonusDescription: '명중률 +35%, 속도(Agi) +20%',
        bonuses: {"acc":0.35,"agi":0.2}
    },
    [CombatStyle.SKY_BOW_MASTER]: {
        style: CombatStyle.SKY_BOW_MASTER,
        label: '천궁',
        tier: 4,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.WIND_ARCHER,
        minMastery: 100,
        specialtyText: '천상의 폭풍 사격',
        description: '하늘을 뒤덮는 화살비로 적의 군세를 단숨에 쓸어버립니다.',
        weapons: ['Bow'],
        color: 'text-emerald-200',
        bgColor: 'bg-emerald-950/50',
        borderColor: 'border-emerald-400',
        iconName: 'Crown',
        bonusDescription: '속도(Agi) +35%, 신력 계통 속성 피해 +30%',
        bonuses: {"agi":0.35,"shinryoku_atk":0.3}
    },
    [CombatStyle.SNIPER_KING]: {
        style: CombatStyle.SNIPER_KING,
        label: '저격왕',
        tier: 4,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.SNIPER,
        minMastery: 100,
        specialtyText: '절대 필살 저격',
        description: '그 어떤 방어선도 뚫어버리는 암흑 속의 절대 저격수입니다.',
        weapons: ['Crossbow'],
        color: 'text-teal-200',
        bgColor: 'bg-teal-950/50',
        borderColor: 'border-teal-400',
        iconName: 'Crown',
        bonusDescription: '치명타율 +15%, 치명타 피해 +35%',
        bonuses: {"crit":15,"critDmg":35}
    },
    [CombatStyle.GOD_OF_HUNT]: {
        style: CombatStyle.GOD_OF_HUNT,
        label: '사냥의 신',
        tier: 4,
        rootStyle: CombatStyle.ARCHER,
        parentStyle: CombatStyle.HUNTER,
        minMastery: 100,
        specialtyText: '전장의 모든 생명 사냥',
        description: '포식자의 정점에 서서 모든 적을 사냥감으로 만드는 신격입니다.',
        weapons: ['Crossbow'],
        color: 'text-teal-200',
        bgColor: 'bg-teal-950/50',
        borderColor: 'border-teal-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +25%, 치명타율 +20%',
        bonuses: {"pAtk":0.25,"crit":20}
    },

    // ==========================================
    // 6. 도적 계통
    // ==========================================
    [CombatStyle.ROGUE]: {
        style: CombatStyle.ROGUE,
        label: '도적',
        tier: 1,
        rootStyle: CombatStyle.ROGUE,
        minMastery: 10,
        specialtyText: '투척무기, 보조검 특화',
        description: '암기와 보조검으로 적의 빈틈을 파고들어 기습적인 피해를 입힙니다.',
        weapons: ['Thrown', 'SubSword'],
        color: 'text-purple-400',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-500/50',
        iconName: 'Eye',
        bonusDescription: '치명타 확률 +12%, 치명타 피해량 +25%, 회피율 +25%',
        bonuses: {"crit":12,"critDmg":25,"eva":25}
    },
    [CombatStyle.ASSASSIN]: {
        style: CombatStyle.ASSASSIN,
        label: '암살자',
        tier: 2,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.ROGUE,
        minMastery: 30,
        specialtyText: '보조검 특화',
        description: '그림자 속에 숨어 단검과 보조검으로 적의 급소를 베어냅니다.',
        weapons: ['SubSword'],
        color: 'text-purple-400',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-500/50',
        iconName: 'Eye',
        bonusDescription: '치명타율 +5%, 회피율 +5%',
        bonuses: {"crit":5,"eva":0.05}
    },
    [CombatStyle.NINJA]: {
        style: CombatStyle.NINJA,
        label: '닌자',
        tier: 2,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.ROGUE,
        minMastery: 30,
        specialtyText: '투척무기 특화',
        description: '수리검과 암기를 사방으로 날리며 현란한 은신술을 구사합니다.',
        weapons: ['Thrown'],
        color: 'text-violet-400',
        bgColor: 'bg-violet-950/40',
        borderColor: 'border-violet-500/50',
        iconName: 'Crosshair',
        bonusDescription: '속도(Agi) +10%, 암흑계 속성 피해 +5%',
        bonuses: {"agi":0.1,"atk_암흑계":0.05}
    },
    [CombatStyle.SHADOW_BLADE]: {
        style: CombatStyle.SHADOW_BLADE,
        label: '검영',
        tier: 3,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.ASSASSIN,
        minMastery: 60,
        specialtyText: '그림자/쌍검',
        description: '그림자와 하나가 되어 번뜩이는 단검으로 적을 베어 넘깁니다.',
        weapons: ['SubSword'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-400/50',
        iconName: 'Sword',
        bonusDescription: '치명타율 +10%, 암흑계 속성 피해 +15%',
        bonuses: {"crit":10,"atk_암흑계":0.15}
    },
    [CombatStyle.TRUE_ASSASSIN]: {
        style: CombatStyle.TRUE_ASSASSIN,
        label: '어쌔신',
        tier: 3,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.ASSASSIN,
        minMastery: 60,
        specialtyText: '독/암살 특화',
        description: '맹독과 치명적인 암살 기술로 적을 확실하게 절명시킵니다.',
        weapons: ['SubSword'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-400/50',
        iconName: 'Eye',
        bonusDescription: '치명타율 +10%, 치명타 피해 +15%',
        bonuses: {"crit":10,"critDmg":15}
    },
    [CombatStyle.SHURIKEN_MASTER]: {
        style: CombatStyle.SHURIKEN_MASTER,
        label: '수리검사',
        tier: 3,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.NINJA,
        minMastery: 60,
        specialtyText: '투척 특화',
        description: '손끝에서 쏟아지는 수리검으로 적의 온몸을 유린합니다.',
        weapons: ['Thrown'],
        color: 'text-violet-300',
        bgColor: 'bg-violet-950/40',
        borderColor: 'border-violet-400/50',
        iconName: 'Crosshair',
        bonusDescription: '속도(Agi) +20%, 회피율 +10%',
        bonuses: {"agi":0.2,"eva":0.1}
    },
    [CombatStyle.BOMB_NINJA]: {
        style: CombatStyle.BOMB_NINJA,
        label: '폭닌자',
        tier: 3,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.NINJA,
        minMastery: 60,
        specialtyText: '폭발/특수 투척',
        description: '폭탄과 화약을 투척하여 전장을 화염으로 뒤덮습니다.',
        weapons: ['Thrown'],
        color: 'text-violet-300',
        bgColor: 'bg-violet-950/40',
        borderColor: 'border-violet-400/50',
        iconName: 'Bomb',
        bonusDescription: '물리/마법 공격력 +15%, 화염계 속성 피해 +15%',
        bonuses: {"pAtk":0.15,"mAtk":0.15,"atk_화염계":0.15}
    },
    [CombatStyle.DEATH_REAPER]: {
        style: CombatStyle.DEATH_REAPER,
        label: '사신',
        tier: 4,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.TRUE_ASSASSIN,
        minMastery: 100,
        specialtyText: '죽음을 부르는 그림자',
        description: '보이지 않는 곳에서 영혼을 거두어가는 죽음의 화신입니다.',
        weapons: ['SubSword'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '치명타율 +15%, 치명타 피해 +30%',
        bonuses: {"crit":15,"critDmg":30}
    },
    [CombatStyle.SHADOW_LORD]: {
        style: CombatStyle.SHADOW_LORD,
        label: '그림자군주',
        tier: 4,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.SHADOW_BLADE,
        minMastery: 100,
        specialtyText: '암흑의 군주',
        description: '모든 그림자를 지배하며 밤의 전장을 통솔하는 군주입니다.',
        weapons: ['SubSword'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '치명타율 +15%, 암흑계 속성 피해 +30%',
        bonuses: {"crit":15,"atk_암흑계":0.3}
    },
    [CombatStyle.SHURIKEN_KING]: {
        style: CombatStyle.SHURIKEN_KING,
        label: '수리검왕',
        tier: 4,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.SHURIKEN_MASTER,
        minMastery: 100,
        specialtyText: '절대 비도 폭풍',
        description: '허공을 가르는 수만 개의 비도로 적을 흔적도 없이 지웁니다.',
        weapons: ['Thrown'],
        color: 'text-violet-200',
        bgColor: 'bg-violet-950/50',
        borderColor: 'border-violet-400',
        iconName: 'Crown',
        bonusDescription: '속도(Agi) +35%, 회피율 +20%',
        bonuses: {"agi":0.35,"eva":0.2}
    },
    [CombatStyle.EXPLOSIVE_DESTROYER]: {
        style: CombatStyle.EXPLOSIVE_DESTROYER,
        label: '폭멸자',
        tier: 4,
        rootStyle: CombatStyle.ROGUE,
        parentStyle: CombatStyle.BOMB_NINJA,
        minMastery: 100,
        specialtyText: '연쇄 대폭발',
        description: '파괴적인 연쇄 폭발로 지형 자체를 지워버리는 폭멸의 지배자입니다.',
        weapons: ['Thrown'],
        color: 'text-violet-200',
        bgColor: 'bg-violet-950/50',
        borderColor: 'border-violet-400',
        iconName: 'Crown',
        bonusDescription: '물리/마법 공격력 +25%, 화염계 속성 피해 +30%',
        bonuses: {"pAtk":0.25,"mAtk":0.25,"atk_화염계":0.3}
    },

    // ==========================================
    // 7. 거너 계통
    // ==========================================
    [CombatStyle.GUNNER]: {
        style: CombatStyle.GUNNER,
        label: '거너',
        tier: 1,
        rootStyle: CombatStyle.GUNNER,
        minMastery: 10,
        specialtyText: '총기, 중화기 특화',
        description: '화기와 중화기의 압도적인 화력으로 전장을 제압하는 화력 전문가입니다.',
        weapons: ['Firearm', 'Heavy'],
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-950/40',
        borderColor: 'border-yellow-500/50',
        iconName: 'Bomb',
        bonusDescription: '치명타 확률 +10%, 명중률 +10%',
        bonuses: {"crit":10,"acc":10}
    },
    [CombatStyle.GUNSLINGER]: {
        style: CombatStyle.GUNSLINGER,
        label: '건슬링어',
        tier: 2,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.GUNNER,
        minMastery: 30,
        specialtyText: '총기 특화',
        description: '신속한 리로드와 정확한 사격으로 권총과 라이플을 다룹니다.',
        weapons: ['Firearm'],
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-950/40',
        borderColor: 'border-yellow-500/50',
        iconName: 'Zap',
        bonusDescription: '명중률 +5%, 속도(Agi) +10%',
        bonuses: {"acc":0.05,"agi":0.1}
    },
    [CombatStyle.HEAVY_TROOPER]: {
        style: CombatStyle.HEAVY_TROOPER,
        label: '중화기병',
        tier: 2,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.GUNNER,
        minMastery: 30,
        specialtyText: '중화기 특화',
        description: '개틀링과 바주카 등 육중한 화력으로 적진을 쑥대밭으로 만듭니다.',
        weapons: ['Heavy'],
        color: 'text-amber-500',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-600/50',
        iconName: 'Bomb',
        bonusDescription: '물리 공격력 +15%, 방어력 +5%',
        bonuses: {"pAtk":0.15,"pDef":0.05,"mDef":0.05}
    },
    [CombatStyle.DUAL_SHOOTER]: {
        style: CombatStyle.DUAL_SHOOTER,
        label: '듀얼슈터',
        tier: 3,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.GUNSLINGER,
        minMastery: 60,
        specialtyText: '쌍권총 연사',
        description: '양손의 총기에서 불을 뿜으며 스타일리시한 난사를 가합니다.',
        weapons: ['Firearm'],
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-950/40',
        borderColor: 'border-yellow-400/50',
        iconName: 'Zap',
        bonusDescription: '명중률 +10%, 속도(Agi) +20%',
        bonuses: {"acc":0.1,"agi":0.2}
    },
    [CombatStyle.GUN_SNIPER]: {
        style: CombatStyle.GUN_SNIPER,
        label: '저격수(총)',
        tier: 3,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.GUNSLINGER,
        minMastery: 60,
        specialtyText: '라이플 저격',
        description: '원거리에서 숨죽인 채 단 한 발로 적을 꿰뚫습니다.',
        weapons: ['Firearm'],
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-950/40',
        borderColor: 'border-yellow-400/50',
        iconName: 'Crosshair',
        bonusDescription: '치명타율 +10%, 치명타 피해 +20%',
        bonuses: {"crit":10,"critDmg":20}
    },
    [CombatStyle.ARTILLERY]: {
        style: CombatStyle.ARTILLERY,
        label: '포병',
        tier: 3,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.HEAVY_TROOPER,
        minMastery: 60,
        specialtyText: '대포/화력 지원',
        description: '거포를 거치하고 원거리에서 포격을 쏟아부어 전장을 초토화합니다.',
        weapons: ['Heavy'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Bomb',
        bonusDescription: '물리 공격력 +25%, 치명타 피해 +10%',
        bonuses: {"pAtk":0.25,"critDmg":10}
    },
    [CombatStyle.DEMOLITIONIST]: {
        style: CombatStyle.DEMOLITIONIST,
        label: '폭파병',
        tier: 3,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.HEAVY_TROOPER,
        minMastery: 60,
        specialtyText: '폭발물 제압',
        description: '유탄과 시한폭탄으로 밀집된 적들을 단숨에 날려버립니다.',
        weapons: ['Heavy'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40',
        borderColor: 'border-amber-500/50',
        iconName: 'Flame',
        bonusDescription: '물리 공격력 +20%, 화염계 속성 피해 +15%',
        bonuses: {"pAtk":0.2,"atk_화염계":0.15}
    },
    [CombatStyle.GUN_BLADER]: {
        style: CombatStyle.GUN_BLADER,
        label: '건블레이더',
        tier: 4,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.DUAL_SHOOTER,
        minMastery: 100,
        specialtyText: '현란한 쌍권총의 극의',
        description: '총탄과 칼날의 경계를 허무는 화려한 사격술의 마스터입니다.',
        weapons: ['Firearm'],
        color: 'text-yellow-200',
        bgColor: 'bg-yellow-950/50',
        borderColor: 'border-yellow-400',
        iconName: 'Crown',
        bonusDescription: '명중률 +20%, 속도(Agi) +35%',
        bonuses: {"acc":0.2,"agi":0.35}
    },
    [CombatStyle.DEADEYE]: {
        style: CombatStyle.DEADEYE,
        label: '데드아이',
        tier: 4,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.GUN_SNIPER,
        minMastery: 100,
        specialtyText: '전설의 라이플 스나이퍼',
        description: '조준경 너머의 모든 목표를 100% 명중시키는 전설의 사수입니다.',
        weapons: ['Firearm'],
        color: 'text-yellow-200',
        bgColor: 'bg-yellow-950/50',
        borderColor: 'border-yellow-400',
        iconName: 'Crown',
        bonusDescription: '치명타율 +20%, 치명타 피해 +40%',
        bonuses: {"crit":20,"critDmg":40}
    },
    [CombatStyle.ARSENAL]: {
        style: CombatStyle.ARSENAL,
        label: '아스널',
        tier: 4,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.ARTILLERY,
        minMastery: 100,
        specialtyText: '걸어 다니는 탄약고',
        description: '전함 한 척에 필적하는 압도적 화망을 혼자서 쏟아붓습니다.',
        weapons: ['Heavy'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +40%, 치명타 피해 +20%',
        bonuses: {"pAtk":0.4,"critDmg":20}
    },
    [CombatStyle.DEMOLISHER]: {
        style: CombatStyle.DEMOLISHER,
        label: '데몰리셔',
        tier: 4,
        rootStyle: CombatStyle.GUNNER,
        parentStyle: CombatStyle.DEMOLITIONIST,
        minMastery: 100,
        specialtyText: '완전한 섬멸과 폭쇄',
        description: '지구상 모든 방어 진지를 무너뜨리는 섬멸 폭파의 화신입니다.',
        weapons: ['Heavy'],
        color: 'text-amber-300',
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-400',
        iconName: 'Crown',
        bonusDescription: '물리 공격력 +35%, 화염계 속성 피해 +30%',
        bonuses: {"pAtk":0.35,"atk_화염계":0.3}
    },

    // ==========================================
    // 8. 마법사 계통
    // ==========================================
    [CombatStyle.MAGE]: {
        style: CombatStyle.MAGE,
        label: '마법사',
        tier: 1,
        rootStyle: CombatStyle.MAGE,
        minMastery: 10,
        specialtyText: '지팡이, 마법서, 보주 특화',
        description: '지팡이와 마법서, 보주로 마력을 증폭시켜 강력한 마법을 영창합니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법공격력 +20%, 마법방어력 +15%',
        bonuses: {"mAtk":0.20,"mDef":0.15}
    },
    [CombatStyle.ELEMENTALIST]: {
        style: CombatStyle.ELEMENTALIST,
        label: '원소술사',
        tier: 2,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGE,
        minMastery: 30,
        specialtyText: '원소마법 특화',
        description: '불, 물, 바람, 땅의 4대 원소를 다루어 강력한 마법 공격을 펼칩니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +10%, 모든 속성 피해 +5%',
        bonuses: {"mAtk":0.1,"atk_모든속성":0.05}
    },
    [CombatStyle.ARCANIST]: {
        style: CombatStyle.ARCANIST,
        label: '비전술사',
        tier: 2,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGE,
        minMastery: 30,
        specialtyText: '마법서/고대마법',
        description: '고대 마도서의 지식을 해독하여 순수 마력과 시공간을 왜곡합니다.',
        weapons: ['Grimoire', 'Staff'],
        color: 'text-blue-400',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-500/50',
        iconName: 'BookOpen',
        bonusDescription: '마법 공격력 +10%, 모든 속성 피해 +10%',
        bonuses: {"mAtk":0.1,"atk_모든속성":0.1}
    },
    [CombatStyle.CLERIC]: {
        style: CombatStyle.CLERIC,
        label: '클레릭',
        tier: 2,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGE,
        minMastery: 30,
        specialtyText: '버프/신성 마법',
        description: '아군에게 강력한 축복을 부여하고 상처를 치유합니다.',
        weapons: ['Staff', 'Orb'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-500/50',
        iconName: 'Heart',
        bonusDescription: '마법 공격력 +5%, 광휘계 속성 피해 +10%',
        bonuses: {"mAtk":0.05,"atk_광휘계":0.1}
    },
    [CombatStyle.SHAMAN]: {
        style: CombatStyle.SHAMAN,
        label: '주술사',
        tier: 2,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGE,
        minMastery: 30,
        specialtyText: '보주/마력 조작',
        description: '신비로운 영혼과 마력 보주를 매개로 전장을 조작합니다.',
        weapons: ['Orb', 'Staff'],
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-950/40',
        borderColor: 'border-indigo-500/50',
        iconName: 'Moon',
        bonusDescription: '마법 공격력 +10%, 암흑계 속성 피해 +10%',
        bonuses: {"mAtk":0.1,"atk_암흑계":0.1}
    },
    [CombatStyle.GRAND_MAGE]: {
        style: CombatStyle.GRAND_MAGE,
        label: '대마도사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ELEMENTALIST,
        minMastery: 60,
        specialtyText: '원소 폭격',
        description: '하늘에서 메테오와 블리자드를 쏟아붓는 광역 마법의 대가입니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-400/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +20%, 모든 속성 피해 +15%',
        bonuses: {"mAtk":0.2,"atk_모든속성":0.15}
    },
    [CombatStyle.FROST_FLAME_MAGE]: {
        style: CombatStyle.FROST_FLAME_MAGE,
        label: '빙염술사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ELEMENTALIST,
        minMastery: 60,
        specialtyText: '원소 특화 (빙/염)',
        description: '얼음과 불꽃의 극과 극 마력을 동시에 융합하여 폭발시킵니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-400/50',
        iconName: 'Flame',
        bonusDescription: '마법 공격력 +20%, 화염계/빙결계/해수계 속성 피해 +20%',
        bonuses: {"mAtk":0.2,"atk_화염계":0.2,"atk_빙결계":0.2,"atk_해수계":0.2}
    },
    [CombatStyle.ARCANE_MAGE]: {
        style: CombatStyle.ARCANE_MAGE,
        label: '아케인메이지',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ARCANIST,
        minMastery: 60,
        specialtyText: '순수 비전 마력',
        description: '물질을 분해하는 순수 마력 파동을 자유자재로 다룹니다.',
        weapons: ['Grimoire', 'Staff'],
        color: 'text-blue-300',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-400/50',
        iconName: 'BookOpen',
        bonusDescription: '마법 공격력 +25%, 모든 속성 피해 +15%',
        bonuses: {"mAtk":0.25,"atk_모든속성":0.15}
    },
    [CombatStyle.MAGIC_SAGE]: {
        style: CombatStyle.MAGIC_SAGE,
        label: '마도현자',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ARCANIST,
        minMastery: 60,
        specialtyText: '고대/금지 마법',
        description: '금단의 고대 주문을 영창하여 전장의 법칙을 뒤바꿉니다.',
        weapons: ['Grimoire', 'Staff'],
        color: 'text-blue-300',
        bgColor: 'bg-blue-950/40',
        borderColor: 'border-blue-400/50',
        iconName: 'BookOpen',
        bonusDescription: '마법 공격력 +20%, 마법 명중률 +15%',
        bonuses: {"mAtk":0.2,"mAcc":0.15}
    },
    [CombatStyle.PRIEST]: {
        style: CombatStyle.PRIEST,
        label: '프리스트',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.CLERIC,
        minMastery: 60,
        specialtyText: '신성 치유 및 정화',
        description: '신성한 기도를 통해 죽어가는 아군도 되살려내는 성직자입니다.',
        weapons: ['Staff', 'Orb'],
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-400/50',
        iconName: 'Heart',
        bonusDescription: '마법 공격력 +10%, 광휘계 속성 피해 +20%',
        bonuses: {"mAtk":0.1,"atk_광휘계":0.2}
    },
    [CombatStyle.SPIRIT_MAGE]: {
        style: CombatStyle.SPIRIT_MAGE,
        label: '정령술사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.SHAMAN,
        minMastery: 60,
        specialtyText: '정령 소환/공명',
        description: '대자연의 상급 정령들과 공명하여 그 힘을 전장에 발현합니다.',
        weapons: ['Orb', 'Staff'],
        color: 'text-indigo-300',
        bgColor: 'bg-indigo-950/40',
        borderColor: 'border-indigo-400/50',
        iconName: 'Moon',
        bonusDescription: '마법 공격력 +15%, 초화계 속성 피해 +25%',
        bonuses: {"mAtk":0.15,"atk_초화계":0.25}
    },
    [CombatStyle.MANA_MANIPULATOR]: {
        style: CombatStyle.MANA_MANIPULATOR,
        label: '마력술사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.SHAMAN,
        minMastery: 60,
        specialtyText: '마력 제어 및 흡수',
        description: '적의 마력을 빼앗고 전장의 모든 마나 흐름을 지배합니다.',
        weapons: ['Orb', 'Staff'],
        color: 'text-indigo-300',
        bgColor: 'bg-indigo-950/40',
        borderColor: 'border-indigo-400/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +15%, 마법 명중률 +15%',
        bonuses: {"mAtk":0.15,"mAcc":0.15}
    },
    [CombatStyle.ELEMENTAL_LORD]: {
        style: CombatStyle.ELEMENTAL_LORD,
        label: '엘리멘탈 로드',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.GRAND_MAGE,
        minMastery: 100,
        specialtyText: '삼라만상의 원소 지배자',
        description: '모든 자연 원소의 법칙 위에 군림하는 마법의 정점입니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-200',
        bgColor: 'bg-cyan-950/50',
        borderColor: 'border-cyan-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, 모든 속성 피해 +30%',
        bonuses: {"mAtk":0.35,"atk_모든속성":0.3}
    },
    [CombatStyle.ELEMENTAL_SOVEREIGN]: {
        style: CombatStyle.ELEMENTAL_SOVEREIGN,
        label: '원소군주',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.FROST_FLAME_MAGE,
        minMastery: 100,
        specialtyText: '빙염의 절대군주',
        description: '영겁의 빙결과 꺼지지 않는 업화로 세계를 뒤덮는 절대군주입니다.',
        weapons: ['Staff', 'Grimoire', 'Orb'],
        color: 'text-cyan-200',
        bgColor: 'bg-cyan-950/50',
        borderColor: 'border-cyan-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, 화염계/빙결계/해수계 속성 피해 +35%',
        bonuses: {"mAtk":0.35,"atk_화염계":0.35,"atk_빙결계":0.35,"atk_해수계":0.35}
    },
    [CombatStyle.ARCHMAGE]: {
        style: CombatStyle.ARCHMAGE,
        label: '아크메이지',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ARCANE_MAGE,
        minMastery: 100,
        specialtyText: '비전 마법의 궁극',
        description: '공간과 차원을 넘나드는 비전 마법의 정점에 도달한 대마법사입니다.',
        weapons: ['Grimoire', 'Staff'],
        color: 'text-blue-200',
        bgColor: 'bg-blue-950/50',
        borderColor: 'border-blue-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +45%, 모든 속성 피해 +30%',
        bonuses: {"mAtk":0.45,"atk_모든속성":0.3}
    },
    [CombatStyle.GRAND_SAGE]: {
        style: CombatStyle.GRAND_SAGE,
        label: '대현자',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGIC_SAGE,
        minMastery: 100,
        specialtyText: '만물의 섭리를 깨달은 자',
        description: '세상의 모든 마법적 진리를 꿰뚫어보는 불멸의 대현자입니다.',
        weapons: ['Grimoire', 'Staff'],
        color: 'text-blue-200',
        bgColor: 'bg-blue-950/50',
        borderColor: 'border-blue-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, 마법 명중률 +30%',
        bonuses: {"mAtk":0.35,"mAcc":0.3}
    },
    [CombatStyle.SAINT]: {
        style: CombatStyle.SAINT,
        label: '세인트',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.PRIEST,
        minMastery: 100,
        specialtyText: '기적을 행하는 성자',
        description: '신성 그 자체가 되어 모든 어둠을 정화하고 기적을 내리는 성자입니다.',
        weapons: ['Staff', 'Orb'],
        color: 'text-emerald-200',
        bgColor: 'bg-emerald-950/50',
        borderColor: 'border-emerald-400',
        iconName: 'Crown',
        bonusDescription: '방어력 +15%, 마법 공격력 +30%, 광휘계 속성 피해 +40%',
        bonuses: {"pDef":0.15,"mDef":0.15,"mAtk":0.3,"atk_광휘계":0.4}
    },
    [CombatStyle.SPIRIT_KING]: {
        style: CombatStyle.SPIRIT_KING,
        label: '정령왕',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.SPIRIT_MAGE,
        minMastery: 100,
        specialtyText: '모든 정령의 통솔자',
        description: '정령계의 지배자가 되어 정령왕들의 절대적 힘을 소환합니다.',
        weapons: ['Orb', 'Staff'],
        color: 'text-indigo-200',
        bgColor: 'bg-indigo-950/50',
        borderColor: 'border-indigo-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +30%, 초화계 속성 피해 +40%',
        bonuses: {"mAtk":0.3,"atk_초화계":0.4}
    },
    [CombatStyle.MAGIC_EMPEROR]: {
        style: CombatStyle.MAGIC_EMPEROR,
        label: '마도황제',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MANA_MANIPULATOR,
        minMastery: 100,
        specialtyText: '마력 그 자체의 황제',
        description: '전 우주의 마나를 통제하는 절대적 마도의 황제입니다.',
        weapons: ['Orb', 'Staff'],
        color: 'text-indigo-200',
        bgColor: 'bg-indigo-950/50',
        borderColor: 'border-indigo-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +40%, 마법 명중률 +25%',
        bonuses: {"mAtk":0.4,"mAcc":0.25}
    },

    // ==========================================
    // 9. 에너자이저 계통
    // ==========================================
    [CombatStyle.ENERGIZER]: {
        style: CombatStyle.ENERGIZER,
        label: '에너자이저',
        tier: 1,
        rootStyle: CombatStyle.ENERGIZER,
        minMastery: 10,
        specialtyText: '에너지 무기 특화',
        description: '첨단 에너지 병기와 레이저를 다루어 고밀도의 에너지를 방출합니다.',
        weapons: ['Energy'],
        color: 'text-teal-400',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-500/50',
        iconName: 'Cpu',
        bonusDescription: '에너지 마법피해 +15%, 치명타 확률 +8%',
        bonuses: {"atk_에너지":0.15,"crit":8}
    },
    [CombatStyle.ENERGY_BLADER]: {
        style: CombatStyle.ENERGY_BLADER,
        label: '에너지블레이더',
        tier: 2,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGIZER,
        minMastery: 30,
        specialtyText: '근접 에너지 무기',
        description: '빛과 플라즈마로 이루어진 광선검으로 적을 베어냅니다.',
        weapons: ['Energy'],
        color: 'text-teal-400',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-500/50',
        iconName: 'Sword',
        bonusDescription: '물리/마법 공격력 +10%',
        bonuses: {"pAtk":0.1,"mAtk":0.1}
    },
    [CombatStyle.ENERGY_SHOOTER]: {
        style: CombatStyle.ENERGY_SHOOTER,
        label: '에너지슈터',
        tier: 2,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGIZER,
        minMastery: 30,
        specialtyText: '원거리 에너지 무기',
        description: '고출력 레이저 캐넌으로 원거리의 적을 저격합니다.',
        weapons: ['Energy'],
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-500/50',
        iconName: 'Crosshair',
        bonusDescription: '명중률 +10%, 치명타율 +5%',
        bonuses: {"acc":0.1,"crit":5}
    },
    [CombatStyle.ENERGY_CORE]: {
        style: CombatStyle.ENERGY_CORE,
        label: '에너지코어',
        tier: 2,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGIZER,
        minMastery: 30,
        specialtyText: '에너지 자체 조작',
        description: '신체에 에너지를 직접 응축하여 방출하는 파동술을 구사합니다.',
        weapons: ['Energy'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-500/50',
        iconName: 'Cpu',
        bonusDescription: '속도(Agi) +10%, 상태이상 저항 +5%',
        bonuses: {"agi":0.1,"resist":5}
    },
    [CombatStyle.PLASMA_SWORD]: {
        style: CombatStyle.PLASMA_SWORD,
        label: '플라즈마소드',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_BLADER,
        minMastery: 60,
        specialtyText: '초고열 플라즈마 검격',
        description: '수만 도의 플라즈마 칼날로 모든 장갑을 녹여버립니다.',
        weapons: ['Energy'],
        color: 'text-teal-300',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-400/50',
        iconName: 'Sword',
        bonusDescription: '물리/마법 공격력 +15%, 화염계/전격계 속성 피해 +15%',
        bonuses: {"pAtk":0.15,"mAtk":0.15,"atk_화염계":0.15,"atk_전격계":0.15}
    },
    [CombatStyle.ENERGY_KNIGHT]: {
        style: CombatStyle.ENERGY_KNIGHT,
        label: '에너지나이트',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_BLADER,
        minMastery: 60,
        specialtyText: '에너지 방벽 및 검술',
        description: '단단한 에너지 쉴드와 검술로 최전선을 수호합니다.',
        weapons: ['Energy'],
        color: 'text-teal-300',
        bgColor: 'bg-teal-950/40',
        borderColor: 'border-teal-400/50',
        iconName: 'Shield',
        bonusDescription: '방어력 +15%, 마법 공격력 +15%',
        bonuses: {"pDef":0.15,"mDef":0.15,"mAtk":0.15}
    },
    [CombatStyle.LASER_SHOOTER]: {
        style: CombatStyle.LASER_SHOOTER,
        label: '레이저슈터',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_SHOOTER,
        minMastery: 60,
        specialtyText: '직선 관통 레이저',
        description: '일직선상의 모든 물체를 증발시키는 고출력 광선을 쏩니다.',
        weapons: ['Energy'],
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-400/50',
        iconName: 'Crosshair',
        bonusDescription: '명중률 +20%, 치명타율 +10%',
        bonuses: {"acc":0.2,"crit":10}
    },
    [CombatStyle.BEAM_CASTER]: {
        style: CombatStyle.BEAM_CASTER,
        label: '빔캐스터',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_SHOOTER,
        minMastery: 60,
        specialtyText: '확산 및 유도 빔',
        description: '수많은 빔을 유도 발사하여 전 영역을 초토화합니다.',
        weapons: ['Energy'],
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-950/40',
        borderColor: 'border-cyan-400/50',
        iconName: 'Zap',
        bonusDescription: '마법 공격력 +20%, 치명타 피해 +20%',
        bonuses: {"mAtk":0.2,"critDmg":20}
    },
    [CombatStyle.ENERGY_MAGE]: {
        style: CombatStyle.ENERGY_MAGE,
        label: '에너지술사',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_CORE,
        minMastery: 60,
        specialtyText: '에너지 파동 제어',
        description: '순수 에너지 파동으로 적의 동력을 마비시키고 분쇄합니다.',
        weapons: ['Energy'],
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-400/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +20%, 전격계 속성 피해 +20%',
        bonuses: {"mAtk":0.2,"atk_전격계":0.2}
    },
    [CombatStyle.OVERDRIVER]: {
        style: CombatStyle.OVERDRIVER,
        label: '오버드라이버',
        tier: 3,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_CORE,
        minMastery: 60,
        specialtyText: '에너지 과충전 폭주',
        description: '에너지 코어를 한계까지 과충전하여 폭발적인 출력을 냅니다.',
        weapons: ['Energy'],
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-950/40',
        borderColor: 'border-emerald-400/50',
        iconName: 'Flame',
        bonusDescription: '속도(Agi) +20%, 물리 공격력 +20%',
        bonuses: {"agi":0.2,"pAtk":0.2}
    },
    [CombatStyle.PLASMA_LORD]: {
        style: CombatStyle.PLASMA_LORD,
        label: '플라즈마로드',
        tier: 4,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.PLASMA_SWORD,
        minMastery: 100,
        specialtyText: '태양열급 플라즈마의 군주',
        description: '태양의 열기마저 초월하는 플라즈마로 모든 것을 녹입니다.',
        weapons: ['Energy'],
        color: 'text-teal-200',
        bgColor: 'bg-teal-950/50',
        borderColor: 'border-teal-400',
        iconName: 'Crown',
        bonusDescription: '물리/마법 공격력 +25%, 화염계/전격계 속성 피해 +30%',
        bonuses: {"pAtk":0.25,"mAtk":0.25,"atk_화염계":0.3,"atk_전격계":0.3}
    },
    [CombatStyle.LASER_MASTER]: {
        style: CombatStyle.LASER_MASTER,
        label: '레이저마스터',
        tier: 4,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.LASER_SHOOTER,
        minMastery: 100,
        specialtyText: '광속을 넘는 관통력',
        description: '공간을 뚫고 지나가는 광속의 레이저로 적의 급소를 꿰뚫습니다.',
        weapons: ['Energy'],
        color: 'text-cyan-200',
        bgColor: 'bg-cyan-950/50',
        borderColor: 'border-cyan-400',
        iconName: 'Crown',
        bonusDescription: '명중률 +35%, 치명타율 +15%',
        bonuses: {"acc":0.35,"crit":15}
    },
    [CombatStyle.BEAM_LORD]: {
        style: CombatStyle.BEAM_LORD,
        label: '빔로드',
        tier: 4,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.BEAM_CASTER,
        minMastery: 100,
        specialtyText: '행성급 파괴 광선',
        description: '전함을 일격에 두 동강 내는 절대적 빔 화력을 자랑합니다.',
        weapons: ['Energy'],
        color: 'text-cyan-200',
        bgColor: 'bg-cyan-950/50',
        borderColor: 'border-cyan-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, 치명타 피해 +35%',
        bonuses: {"mAtk":0.35,"critDmg":35}
    },
    [CombatStyle.ENERGY_MASTER]: {
        style: CombatStyle.ENERGY_MASTER,
        label: '에너지마스터',
        tier: 4,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.ENERGY_MAGE,
        minMastery: 100,
        specialtyText: '에너지의 절대적 통제',
        description: '전장의 모든 에너지를 흡수하고 통제하는 에너지의 신입니다.',
        weapons: ['Energy'],
        color: 'text-emerald-200',
        bgColor: 'bg-emerald-950/50',
        borderColor: 'border-emerald-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, 전격계 속성 피해 +35%',
        bonuses: {"mAtk":0.35,"atk_전격계":0.35}
    },
    [CombatStyle.OVERLORD]: {
        style: CombatStyle.OVERLORD,
        label: '오버로드',
        tier: 4,
        rootStyle: CombatStyle.ENERGIZER,
        parentStyle: CombatStyle.OVERDRIVER,
        minMastery: 100,
        specialtyText: '무한의 과충전 파괴신',
        description: '끝없이 솟구치는 오버드라이브 에너지로 전장을 지배합니다.',
        weapons: ['Energy'],
        color: 'text-emerald-200',
        bgColor: 'bg-emerald-950/50',
        borderColor: 'border-emerald-400',
        iconName: 'Crown',
        bonusDescription: '속도(Agi) +40%, 물리/마법 공격력 +30%',
        bonuses: {"agi":0.4,"pAtk":0.3,"mAtk":0.3}
    },
    // 소환사 계열
    [CombatStyle.SUMMONER]: {
        style: CombatStyle.SUMMONER,
        label: '소환사',
        tier: 2,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.MAGE,
        minMastery: 30,
        specialtyText: '소환술 / 계약 마법',
        description: '신비한 정령과 마수를 소환하여 함께 전투합니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-500/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +10%, MaxMP +10%',
        bonuses: {"mAtk":0.1,"maxMp":0.1}
    },
    [CombatStyle.ELEMENT_SUMMONER]: {
        style: CombatStyle.ELEMENT_SUMMONER,
        label: '정령소환사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.SUMMONER,
        minMastery: 60,
        specialtyText: '자연 정령 소환',
        description: '4대 원소 정령을 소환하여 아군을 지원하고 적을 공격합니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-400/50',
        iconName: 'Sparkles',
        bonusDescription: '마법 공격력 +15%, MaxMP +15%',
        bonuses: {"mAtk":0.15,"maxMp":0.15}
    },
    [CombatStyle.BEAST_SUMMONER]: {
        style: CombatStyle.BEAST_SUMMONER,
        label: '수환사',
        tier: 3,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.SUMMONER,
        minMastery: 60,
        specialtyText: '마수 및 야수 소환',
        description: '강력한 신수와 마수를 소환하여 전장을 지배합니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-300',
        bgColor: 'bg-purple-950/40',
        borderColor: 'border-purple-400/50',
        iconName: 'Sparkles',
        bonusDescription: '물리/마법 공격력 +12%, MaxHP +15%',
        bonuses: {"pAtk":0.12,"mAtk":0.12,"maxHp":0.15}
    },
    [CombatStyle.GRAND_SUMMONER]: {
        style: CombatStyle.GRAND_SUMMONER,
        label: '대소환사',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ELEMENT_SUMMONER,
        minMastery: 100,
        specialtyText: '상위 정령 군단 소환',
        description: '상위 정령 군단을 자유자재로 소환하여 전장을 평정합니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +25%, MaxMP +25%',
        bonuses: {"mAtk":0.25,"maxMp":0.25}
    },
    [CombatStyle.BEAST_MASTER]: {
        style: CombatStyle.BEAST_MASTER,
        label: '마수사',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.BEAST_SUMMONER,
        minMastery: 100,
        specialtyText: '고대 마수 통제',
        description: '맹렬한 고대 마수를 부려 압도적인 파괴력을 발휘합니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-200',
        bgColor: 'bg-purple-950/50',
        borderColor: 'border-purple-400',
        iconName: 'Crown',
        bonusDescription: '물리/마법 공격력 +20%, MaxHP +25%',
        bonuses: {"pAtk":0.2,"mAtk":0.2,"maxHp":0.25}
    },
    [CombatStyle.SUMMON_KING]: {
        style: CombatStyle.SUMMON_KING,
        label: '환수왕',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.ELEMENT_SUMMONER,
        minMastery: 100,
        specialtyText: '전설의 환수 왕국 소환',
        description: '전설 속 환수들을 지배하는 소환의 군주입니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-100',
        bgColor: 'bg-purple-900/60',
        borderColor: 'border-purple-300',
        iconName: 'Crown',
        bonusDescription: '마법 공격력 +35%, MaxMP +35%',
        bonuses: {"mAtk":0.35,"maxMp":0.35}
    },
    [CombatStyle.ANCIENT_SUMMONER]: {
        style: CombatStyle.ANCIENT_SUMMONER,
        label: '고대소환주',
        tier: 4,
        rootStyle: CombatStyle.MAGE,
        parentStyle: CombatStyle.BEAST_MASTER,
        minMastery: 100,
        specialtyText: '태초의 소환신',
        description: '태초의 고대 소환수들을 전장에 현신시키는 소환의 신입니다.',
        weapons: ['Staff', 'Orb', 'Grimoire'],
        color: 'text-purple-100',
        bgColor: 'bg-purple-900/60',
        borderColor: 'border-purple-300',
        iconName: 'Crown',
        bonusDescription: '물리/마법 공격력 +30%, MaxHP/MaxMP +30%',
        bonuses: {"pAtk":0.3,"mAtk":0.3,"maxHp":0.3,"maxMp":0.3}
    }
};

// 1차 전투 계열 목록
export const ROOT_COMBAT_STYLES: CombatStyle[] = [
    CombatStyle.SWORDSMAN,
    CombatStyle.SPEARMAN,
    CombatStyle.BERSERKER,
    CombatStyle.BOXER,
    CombatStyle.ARCHER,
    CombatStyle.ROGUE,
    CombatStyle.GUNNER,
    CombatStyle.MAGE,
    CombatStyle.ENERGIZER
];

export const WEAPON_MASTERY_MAX_LEVEL = 100;
export const WEAPON_MASTERY_INITIAL_EXP = 0;

export const SUMMON_PRESET_IMAGES = [
  { name: '불의 정령', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=300' },
  { name: '얼음 정령', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300' },
  { name: '암흑 늑대', url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&q=80&w=300' },
  { name: '환수 드래곤', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=300' },
  { name: '암흑 마수', url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=300' },
  { name: '대지 골렘', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=300' },
];

export const getDefaultSummonImageUrl = (sName: string = '', element: string = ''): string => {
  const name = sName.toLowerCase();
  const el = element.toLowerCase();
  if (name.includes('불') || name.includes('화염') || name.includes('flame') || name.includes('fire') || el.includes('화염')) {
    return SUMMON_PRESET_IMAGES[0].url;
  }
  if (name.includes('물') || name.includes('빙결') || name.includes('냉기') || name.includes('water') || name.includes('ice') || el.includes('빙결')) {
    return SUMMON_PRESET_IMAGES[1].url;
  }
  if (name.includes('늑대') || name.includes('야수') || name.includes('마수') || name.includes('사자') || name.includes('곰') || name.includes('wolf') || name.includes('beast')) {
    return SUMMON_PRESET_IMAGES[2].url;
  }
  if (name.includes('용') || name.includes('드래곤') || name.includes('dragon')) {
    return SUMMON_PRESET_IMAGES[3].url;
  }
  if (name.includes('암흑') || name.includes('어둠') || name.includes('마왕') || name.includes('shadow') || name.includes('dark') || el.includes('암흑')) {
    return SUMMON_PRESET_IMAGES[4].url;
  }
  return SUMMON_PRESET_IMAGES[5].url;
};

export const MONSTER_PREFIXES: { name: string, statMod: any, hpMod: number }[] = [
   { name: "인형", statMod: { str: 0.9, agi: 1.1 }, hpMod: 0.8 },
];

export const BASE_MONSTERS: Partial<Enemy>[] = [
    { name: "늑대", shinryokuType: "질풍계", production: "늑대털", skills: [{ name: "물어뜯기", description: "[부가 효과: 출혈]", tier: ClassTier.FIRST, type: SkillType.PHYSICAL, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.2", powerRatio: 120 }] },
    { name: "피닉스", shinryokuType: "화염계", production: "피닉스의 깃털", skills: [{ name: "부활의 불꽃", description: "체력 회복 및 광역 화상 [부가 효과: 화상]", tier: ClassTier.FINAL, type: SkillType.MAGIC, mpCost: 100, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*2.5", powerRatio: 250, targetType: 'aoe' }] },
    { name: "고블린", shinryokuType: "대지계", production: "고블린 귀", skills: [{ name: "돌팔매", description: "돌을 던진다.", tier: ClassTier.FIRST, type: SkillType.PHYSICAL, mpCost: 3, powerRatio: 110, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.1" }] },
    { name: "오크", shinryokuType: "신체강화계", production: "오크 어금니", skills: [{ name: "내려찍기", description: "강하게 내려찍는다.", tier: ClassTier.SECOND, type: SkillType.PHYSICAL, mpCost: 15, powerRatio: 150, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.5" }] },
    { name: "슬라임", shinryokuType: "해수계", production: "슬라임 젤리", skills: [{ name: "용해액", description: "방어력을 깎는다. [부가 효과: 파열]", tier: ClassTier.FIRST, type: SkillType.DEBUFF, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "DEF -10%" }] },
    { name: "스켈레톤", shinryokuType: "암흑계", production: "뼈조각", skills: [{ name: "뼈 던지기", description: "자신의 뼈를 던진다.", tier: ClassTier.FIRST, type: SkillType.PHYSICAL, mpCost: 5, powerRatio: 115, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.15" }] },
    { name: "골렘", shinryokuType: "강철계", production: "돌조각", skills: [{ name: "지진", description: "땅을 울린다.", tier: ClassTier.SECOND, type: SkillType.PHYSICAL, targetType: 'aoe', mpCost: 30, powerRatio: 100, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.0" }] },
    { name: "와이버", shinryokuType: "질풍계", production: "와이버 날개", skills: [{ name: "에어 슬래시", description: "바람의 칼날.", tier: ClassTier.LAST, type: SkillType.MAGIC, mpCost: 50, powerRatio: 200, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*2.0" }] },
    { name: "리치", shinryokuType: "암흑계", production: "리치의 지팡이 파편", skills: [{ name: "죽음의 손길", description: "[부가 효과: 소멸]", tier: ClassTier.LAST, type: SkillType.MAGIC, mpCost: 80, powerRatio: 250, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*2.5" }] },
    { name: "드래곤", shinryokuType: "화염계", production: "드래곤 비늘", skills: [{ name: "파이어 브레스", description: "[부가 효과: 화상]", tier: ClassTier.FINAL, type: SkillType.MAGIC, targetType: 'aoe', mpCost: 150, powerRatio: 300, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*3.0" }] },
    { name: "곰", shinryokuType: "신체강화계", production: "곰 가죽", skills: [{ name: "앞발 치기", type: SkillType.PHYSICAL, powerRatio: 140, description: "강력한 앞발로 내려친치다.", tier: ClassTier.FIRST, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.4" }] },
    { name: "호랑이", shinryokuType: "질풍계", production: "호랑이 가죽", skills: [{ name: "기습", type: SkillType.PHYSICAL, powerRatio: 130, description: "[부가 효과: 출혈]", tier: ClassTier.FIRST, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "AGI*1.3" }] },
    { name: "라이언", shinryokuType: "태양계", production: "사자 갈기", skills: [{ name: "포효", type: SkillType.DEBUFF, description: "[부가 효과: 공포]", tier: ClassTier.FIRST, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "ATK -10%" }] },
    { name: "독수리", shinryokuType: "질풍계", production: "독수리 깃털", skills: [{ name: "급강하", type: SkillType.PHYSICAL, powerRatio: 125, description: "하늘에서 덮친다.", tier: ClassTier.FIRST, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "AGI*1.25" }] },
    { name: "뱀", shinryokuType: "암흑계", production: "뱀 허물", skills: [{ name: "독니", type: SkillType.PHYSICAL, description: "[부가 효과: 중독]", tier: ClassTier.FIRST, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.0" }] }, 
    { name: "거미", shinryokuType: "대지계", production: "거미줄", skills: [{ name: "거미줄", type: SkillType.DEBUFF, description: "[부가 효과: 속박]", tier: ClassTier.FIRST, mpCost: 8, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "AGI -20%" }] },
    { name: "전갈", shinryokuType: "대지계", production: "전갈 독침", skills: [{ name: "독침", type: SkillType.PHYSICAL, description: "[부가 효과: 출혈]", tier: ClassTier.FIRST, mpCost: 6, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.1" }] },
    { name: "박쥐", shinryokuType: "암흑계", production: "박쥐 날개", skills: [{ name: "흡혈", type: SkillType.MAGIC, description: "[부가 효과: 흡정]", tier: ClassTier.FIRST, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.0" }] },
    { name: "멧돼지", shinryokuType: "무기강화계", production: "멧돼지 가죽", skills: [{ name: "돌진", type: SkillType.PHYSICAL, powerRatio: 135, description: "무작정 돌진한다.", tier: ClassTier.FIRST, mpCost: 5, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.35" }] },
    { name: "악어", shinryokuType: "해수계", production: "악어 가죽", skills: [{ name: "물어뜯기", type: SkillType.PHYSICAL, powerRatio: 145, description: "강한 턱힘으로 문다.", tier: ClassTier.FIRST, mpCost: 8, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.45" }] },
    { name: "상어", shinryokuType: "해수계", production: "상어 지느러미", skills: [{ name: "물어뜯기", type: SkillType.PHYSICAL, powerRatio: 150, description: "날카로운 이빨로 문다.", tier: ClassTier.FIRST, mpCost: 8, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.5" }] },
    { name: "크라켄", shinryokuType: "해수계", production: "크라켄 다리", skills: [{ name: "촉수 공격", type: SkillType.PHYSICAL, targetType: 'aoe', powerRatio: 120, description: "여러 개의 촉수로 공격한다.", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.2" }] },
    { name: "히드라", shinryokuType: "초화계", production: "히드라 독샘", skills: [{ name: "독안개", type: SkillType.MAGIC, targetType: 'aoe', description: "[부가 효과: 혼란]", tier: ClassTier.SECOND, mpCost: 25, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.0" }] },
    { name: "그리폰", shinryokuType: "질풍계", production: "그리폰 깃털", skills: [{ name: "날개치기", type: SkillType.PHYSICAL, targetType: 'aoe', powerRatio: 110, description: "거대한 날개로 친다.", tier: ClassTier.SECOND, mpCost: 15, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.1" }] },
    { name: "페가수스", shinryokuType: "광휘계", production: "페가수스의 눈물", skills: [{ name: "성스러운 빛", type: SkillType.MAGIC, powerRatio: 160, description: "빛의 기둥을 내린다.", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.6" }] },
    { name: "켄타우로스", shinryokuType: "초화계", production: "켄타우로스의 활시위", skills: [{ name: "활쏘기", type: SkillType.PHYSICAL, powerRatio: 130, description: "정확하게 활을 쏜다.", tier: ClassTier.SECOND, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "DEX*1.3" }] },
    { name: "미노타우로스", shinryokuType: "신체강화계", production: "미노타우로스의 뿔", skills: [{ name: "도끼 휘두르기", type: SkillType.PHYSICAL, powerRatio: 160, description: "거대 도끼를 휘두른다.", tier: ClassTier.SECOND, mpCost: 15, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.6" }] },
    { name: "키메라", shinryokuType: "화염계", production: "키메라의 꼬리", skills: [{ name: "화염 방사", type: SkillType.MAGIC, targetType: 'aoe', description: "[부가 효과: 화상]", tier: ClassTier.SECOND, mpCost: 30, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.2" }] },
    { name: "바실리스크", shinryokuType: "대지계", production: "바실리스크의 눈", skills: [{ name: "석화 시선", type: SkillType.DEBUFF, description: "[부가 효과: 속박]", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "AGI -50%" }] },
    { name: "코카트리스", shinryokuType: "질풍계", production: "코카트리스의 부리", skills: [{ name: "석화 부리", type: SkillType.PHYSICAL, description: "[부가 효과: 속박]", tier: ClassTier.SECOND, mpCost: 15, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.1" }] },
    { name: "만티코어", shinryokuType: "화염계", production: "만티코어의 독가시", skills: [{ name: "꼬리 독침", type: SkillType.PHYSICAL, description: "[부가 효과: 출혈]", tier: ClassTier.SECOND, mpCost: 15, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.2" }] },
    { name: "케르베로스", shinryokuType: "암흑계", production: "케르베로스의 송곳니", skills: [{ name: "지옥의 불꽃", type: SkillType.MAGIC, targetType: 'aoe', description: "[부가 효과: 화상]", tier: ClassTier.LAST, mpCost: 50, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.5" }] },
    { name: "스핑크스", shinryokuType: "태양계", production: "스핑크스의 수수께끼 조각", skills: [{ name: "수수께끼", type: SkillType.DEBUFF, description: "[부가 효과: 혼란]", tier: ClassTier.LAST, mpCost: 40, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT -20%" }] },
    { name: "하피", shinryokuType: "질풍계", production: "하피의 깃털", skills: [{ name: "날카로운 비명", type: SkillType.DEBUFF, description: "[부가 효과: 공포]", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "DEF -20%" }] },
    { name: "세이렌", shinryokuType: "해수계", production: "세이렌의 비늘", skills: [{ name: "유혹의 노래", type: SkillType.DEBUFF, description: "[부가 효과: 혼란]", tier: ClassTier.SECOND, mpCost: 25, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "CTRL -30%" }] },
    { name: "메두사", shinryokuType: "암흑계", production: "메두사의 뱀머리", skills: [{ name: "석화의 눈", type: SkillType.DEBUFF, description: "[부가 효과: 속박]", tier: ClassTier.LAST, mpCost: 45, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "AGI -100%" }] },
    { name: "사이클롭스", shinryokuType: "강철계", production: "사이클롭스 눈알", skills: [{ name: "거대 몽둥이", type: SkillType.PHYSICAL, powerRatio: 170, description: "묵직한 한 방.", tier: ClassTier.LAST, mpCost: 30, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.7" }] },
    { name: "트롤", shinryokuType: "초화계", production: "트롤의 재생 세포", skills: [{ name: "재생", type: SkillType.BUFF, effectFormula: "MaxHP 10% 회복", description: "체력을 회복한다.", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0 }] },
    { name: "오우거", shinryokuType: "신체강화계", production: "오우거의 곤봉 조각", skills: [{ name: "강타", type: SkillType.PHYSICAL, powerRatio: 155, description: "강력한 타격.", tier: ClassTier.LAST, mpCost: 25, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.55" }] },
    { name: "자이언트", shinryokuType: "대지계", production: "자이언트의 발톱", skills: [{ name: "발구르기", type: SkillType.PHYSICAL, targetType: 'aoe', powerRatio: 130, description: "땅을 울려 공격한다.", tier: ClassTier.LAST, mpCost: 40, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.3" }] },
    { name: "데몬", shinryokuType: "암흑계", production: "데몬의 심장", skills: [{ name: "지옥불", type: SkillType.MAGIC, description: "[부가 효과: 화상]", tier: ClassTier.LAST, mpCost: 40, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.8" }] },
    { name: "데빌", shinryokuType: "암흑계", production: "데빌의 꼬리", skills: [{ name: "영혼 수확", type: SkillType.MAGIC, description: "[부가 효과: 흡정]", tier: ClassTier.LAST, mpCost: 50, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.5" }] },
    { name: "엔젤", shinryokuType: "광휘계", production: "엔젤의 후광 조각", skills: [{ name: "심판의 빛", type: SkillType.MAGIC, powerRatio: 180, description: "성스러운 심판.", tier: ClassTier.LAST, mpCost: 45, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.8" }] },
    { name: "정령", shinryokuType: "초화계", production: "정령의 가루", skills: [{ name: "자연의 분노", type: SkillType.MAGIC, powerRatio: 140, description: "자연의 힘을 모아 공격.", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.4" }] },
    { name: "엘리멘탈", shinryokuType: "전격계", production: "원소의 핵", skills: [{ name: "원소 폭발", type: SkillType.MAGIC, targetType: 'aoe', powerRatio: 150, description: "마력을 폭발시킨다.", tier: ClassTier.LAST, mpCost: 60, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.5" }] },
    { name: "유령", shinryokuType: "암흑계", production: "유령의 비명", skills: [{ name: "빙의", type: SkillType.DEBUFF, description: "[부가 효과: 혼란]", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "CTRL -20%" }] },
    { name: "뱀파이어", shinryokuType: "월광계", production: "뱀파이어의 송곳니", skills: [{ name: "흡혈", type: SkillType.PHYSICAL, description: "[부가 효과: 흡정]", tier: ClassTier.LAST, mpCost: 30, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.2" }] },
    { name: "늑대인간", shinryokuType: "월광계", production: "늑대인간의 발톱", skills: [{ name: "물어뜯기", type: SkillType.PHYSICAL, description: "[부가 효과: 출혈]", tier: ClassTier.LAST, mpCost: 25, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.4" }] },
    { name: "미라", shinryokuType: "대지계", production: "미라의 붕대", skills: [{ name: "저주", type: SkillType.DEBUFF, description: "[부가 효과: 공포]", tier: ClassTier.SECOND, mpCost: 20, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "LUCK -50%" }] },
    { name: "좀비", shinryokuType: "암흑계", production: "좀비의 썩은 살점", skills: [{ name: "감연", type: SkillType.PHYSICAL, description: "[부가 효과: 중독]", tier: ClassTier.FIRST, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.0" }] },
    { name: "구울", shinryokuType: "암흑계", production: "구울의 손톱", skills: [{ name: "마비 손톱", type: SkillType.PHYSICAL, description: "[부가 효과: 속박]", tier: ClassTier.SECOND, mpCost: 15, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.1" }] },
    { name: "와이트", shinryokuType: "빙결계", production: "와이트의 냉기 정수", skills: [{ name: "냉기 손길", type: SkillType.MAGIC, description: "[부가 효과: 냉기]", tier: ClassTier.LAST, mpCost: 35, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "INT*1.3" }] },
    { name: "밴시", shinryokuType: "암흑계", production: "밴시의 눈물", skills: [{ name: "통곡", type: SkillType.DEBUFF, description: "[부가 효과: 공포]", tier: ClassTier.LAST, mpCost: 40, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "DEF -30%" }] },
    { name: "듀라한", shinryokuType: "암흑계", production: "듀라한의 투구 파편", skills: [{ name: "죽음의 질주", type: SkillType.PHYSICAL, powerRatio: 160, description: "전장을 누비며 벤다.", tier: ClassTier.LAST, mpCost: 50, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.6" }] },
    { name: "데스나이트", shinryokuType: "암흑계", production: "데스나이트의 망토 조각", skills: [{ name: "어둠의 일격", type: SkillType.PHYSICAL, powerRatio: 180, description: "[부가 효과: 소멸]", tier: ClassTier.FINAL, mpCost: 80, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.8" }] },
    { name: "닭", shinryokuType: "가축", production: "달걀", slaughterProduct: "닭고기", skills: [] },
    { name: "소", shinryokuType: "가축", production: "우유", slaughterProduct: "소고기", skills: [] },
    { name: "말", shinryokuType: "가축", production: "말갈기", slaughterProduct: "말고기", skills: [] },
    { name: "돼지", shinryokuType: "가축", production: "돼지기름", slaughterProduct: "돼지고기", skills: [] }
];
export const PRESET_ENEMIES: Partial<Enemy>[] = BASE_MONSTERS;

export const NATION_DATA: Record<string, { 
    surnames: string[], 
    names: { male: string[], female: string[], neutral: string[] }, 
    order: 'SN' | 'NS' 
}> = {
    "북한": { 
        surnames: [
            "김", "김", "김", "김", "김", "김", "김", "김", "김", "김", 
            "리", "리", "리", "리", "리", "리", "리", "리", "리", "리", 
            "박", "박", "박", "박", "박", "박", "박", "박", 
            "최", "최", "최", "최", "최", 
            "정", "정", "정", "정", 
            "강", "강", "강", 
            "조", "조", "조", 
            "윤", "윤", "윤", 
            "장", "장", "장", 
            "림", "림", "림", 
            "한", "한", 
            "오", "오", 
            "서", "서", 
            "신", "신", 
            "권", "권", 
            "황", "황", 
            "안", "안", 
            "송", "송", 
            "전", "전", 
            "홍", "홍", 
	"로",
	"라",
            "류", "류", 
            "고", "문", "양", "손", "백", "허", "남", "하", "곽", "차", "구", "진", "엄", "채", "천", "방", "공", "현", "함", "염", "변", "여", "추", "도", "소", "마", "가"
        ], 
        names: {
            male: ["광수", "철수", "성철", "경철", "철민", "혁", "영남", "일남", "명국", "금성", "태식", "태성", "철호", "성호", "명호", "광호", "영호", "성길", "철길", "경길", "영호", "성웅", "광웅", "영웅", "용호", "길남", "길수", "인국", "일국", "삼식", "삼룡", "광남", "명혁", "경혁", "정남", "철혁"],
            female: ["순희", "영희", "명희", "경희", "숙희", "옥희", "정희", "선희", "금희", "은희", "춘희", "춘자", "영자", "정자", "순자", "순옥", "명옥", "경옥", "숙옥", "정옥", "은옥", "금옥", "옥자", "혜선", "은혜", "설경", "금옥", "송혜", "광순", "경순", "명순", "순심", "영심"],
            neutral: ["혁", "설", "진", "선", "옥", "경"]
        },
        order: 'SN' 
    },
    "대한민국": { 
        surnames: [
            "김", "김","김", "김", "김", "김", "김", "김", "김", "김", "김", 
            "이", "이", "이", "이", "이", "이", "이", "이", "이", "이", 
            "박", "박", "박", "박", "박", "박", "박", "박", 
            "최", "최", "최", "최", "최", 
            "정", "정", "정", "정", 
            "강", "강", "강", 
            "조", "조", "조", 
            "윤", "윤", "윤", 
            "장", "장", "장", 
            "임", "임", "임", 
            "한", "한", 
            "오", "오", 
            "서", "서", 
            "신", "신", 
            "권", "권", 
            "황", "황", 
            "안", "안", 
	"노",
	"류",
	"양",
	"손",
            "송", "송", 
            "전", "전", 
            "홍", "홍", 
            "유", "유", 
            "고", "문", "양", "손", "백", "허", "남", "하", "곽", "차", "구", "나", "진", "엄", "채", "천", "방", "공", "현", "함", "염", "변", "여", "추", "도", "소", "마", "가", 
            "남궁", "독고", "황보", "제갈", "사공", "선우", "서문"
        ], 
        names: {
            male: ["민수","현우","현수","현민","강준","기준","두현","두영","동진","도진","민기","무진","현빈","기훈","성민","재혁","형우","형민","형석","민호","성호","상호","민혁","창혁","주혁","지찬","지호","서준","하준","도윤","시우","민준","예준","주원","시원","시환","시완","우형","우현","상현","도현","종현","준호","정호","정국","동국","성근","태호","태원","재원","승준","재현","규민","태현","건우","은우","서진","민재","현준","정우","승민","민성","지환","동현","준","지성","태양","유준","로운","수호","이준","주안","시윤","유찬","다온"],
            female: ["지수","윤아","가현","가연","나연","나현","다현","다연","다영","리현","리연","미현","미연","서연","서현","수민","영현","정현","정수","주희","지민","수영","소영","아현","수현","소현","하은","수아","도연","주연","지연","지현","예나","예은","예지","은혜","지원","예진","이서","소은","서아","은서","소율","수빈","소윤","지윤","채원","채연","채현","하영","아영","아린","시아","채아","다인","지유","태리","설아","연우","주하"],
            neutral: ["민","지우","지안","시현","이솔","윤슬"]
        },
        order: 'SN' 
    },
    "일본": { 
        surnames: ["사토", "스즈키", "타카하시", "타나카", "와타나베", "이토", "야마모토", "나카무라", "코바야시", "카토", "요시다", "야마다", "사사키", "야마구치", "마츠모토", "이노우에", "키무라", "하야시", "시미즈", "아베", "이케다", "하시모토", "야마시타", "이시카와", "나카지마", "마에다", "후지타", "오가와", "오카다", "고토", "하세가와", "무라카미", "콘도", "이시이", "사이토", "사카모토", "엔도", "아오키", "후지이", "니시무라"], 
        names: {
            male: ["하루토", "유토", "소타", "유키", "리쿠", "카이토", "렌", "소라", "타쿠미", "히로토", "히나타", "이츠키", "아라타", "미나토", "유마", "에이타", "쇼", "츠바사", "료", "켄지", "아사히"],
            female: ["사쿠라", "아카리", "히마리", "메이", "유아", "아오이", "이치카", "칸나", "히나", "사라", "미오", "코하루", "유나", "리코", "마나", "요코", "나나미", "미사키", "레이"],
            neutral: ["소라", "유키", "레이", "아오이"]
        },
        order: 'SN' 
    },
    "중국": { 
        surnames: ["리", "왕", "장", "류", "첸", "양", "황", "자오", "우", "저우", "쉬", "순", "마", "주", "후", "궈", "허", "린", "뤄", "가오", "정", "량", "셰", "송", "탕", "쉬", "한", "펑", "카오", "팽", "쩡", "샤오", "톈", "동", "판", "위안", "위", "예", "장", "두"], 
        names: {
            male: ["웨이", "지에", "하오", "이", "준", "펑", "레이", "밍", "양", "카이", "종", "보", "첸", "창", "강", "용", "지안"],
            female: ["후이", "징", "팅", "쉐", "안", "핑", "리", "팡", "위안", "얀", "메이", "란", "샹", "즈", "샤오", "루", "윤", "화", "슈", "칭", "린", "잉", "전"],
            neutral: ["이", "준", "안", "핑", "리", "샤오", "윤", "린"]
        },
        order: 'SN' 
    },
    "미국": { 
        surnames: ["스미스", "존슨", "윌리엄스", "브라운", "존스", "가르시아", "밀러", "데이비스", "로드리게스", "마르티네스", "에르난데스", "로페스", "곤잘레스", "윌슨", "앤더슨", "토머스", "테일러", "무어", "잭슨", "마틴", "리", "페레스", "톰슨", "화이트", "해리스", "산체스", "클라크", "라미레스", "루이스", "로빈슨", "워커", "영", "알렌", "킹", "라이트", "스콧", "토레스", "응우옌", "힐", "애덤스"], 
        names: {
            male: ["제임스", "존", "로버트", "마이클", "윌리엄", "데이비드", "리처드", "조셉", "토머스", "찰스", "리암", "노아", "올리버", "엘리야", "루카스", "메이슨", "로건", "이던", "에이든", "잭슨", "제이콥", "알렉산더", "대니얼", "매튜", "새뮤얼", "세바스찬", "잭"],
            female: ["엠마", "올리비아", "에바", "이사벨라", "소피아", "샬롯", "아멜리아", "미아", "하퍼", "에블린", "아리아", "스칼렛", "그레이스"],
            neutral: ["찰리", "알렉스", "조던", "라일리", "에이보리"]
        },
        order: 'NS' 
    },
    "영국": { 
        surnames: ["스미스", "존스", "테일러", "브라운", "윌리엄스", "윌슨", "존슨", "데이비스", "로빈슨", "라이트", "톰슨", "에반스", "워커", "화이트", "로버츠", "그린", "홀", "우드", "해리스", "에드워즈", "루이스", "클라크", "제임스", "모건", "휴즈", "스콧", "왓슨", "킹", "해리슨", "베넷", "쿡", "베이커", "카터", "워드", "포스터", "베일리", "파월", "버틀러", "피셔", "그레이"], 
        names: {
            male: ["올리버", "조지", "해리", "노아", "잭", "레오", "아서", "무하마드", "오스카", "찰리", "토머스", "헨리", "윌리엄", "제임스", "조슈아", "프레디", "아치", "알피", "아이작", "알렉산더"],
            female: ["올리비아", "아멜리아", "아일라", "에바", "미아", "아이비", "릴리", "프레야", "플로렌스", "그레이스", "에비", "소피", "앨리스", "피비", "데이지", "시에나", "에블린", "윌로우", "샬롯", "루나"],
            neutral: ["찰리", "알렉스", "조던", "라일리"]
        },
        order: 'NS' 
    },
    "독일": { 
        surnames: ["밀러", "슈미트", "슈나이더", "피셔", "베버", "마이어", "바그너", "베커", "슐츠", "호프만", "셰퍼", "코흐", "바우어", "리히터", "클라인", "볼프", "슈뢰더", "노이만", "슈바르츠", "짐머만", "브라운", "크뤼거", "호프만", "하트만", "랑게", "슈미트", "베르너", "슈미츠", "크라우제", "마이어", "레만", "슈미트", "슐체", "마이어", "쾰러", "헤르만", "쾨니히", "발터", "마이어", "후버"], 
        names: {
            male: ["벤", "파울", "요나스", "엘리아스", "핀", "레온", "루이스", "루카스", "막시밀리안", "펠릭스", "노아", "마테오", "루카", "테오", "안톤", "에밀", "율리안", "모리츠", "야콥", "다비드"],
            female: ["엠마", "미아", "한나", "에밀리아", "소피아", "리나", "엘라", "밀라", "클라라", "레아", "프리다", "마리", "레니", "마틸다", "소피", "루이사", "이다", "그레타", "안나", "마야"],
            neutral: ["루카", "킴", "자샤"]
        },
        order: 'NS' 
    },
    "프랑스": { 
        surnames: ["마르탱", "베르나르", "토마", "쁘띠", "로베르", "리샤르", "뒤랑", "뒤부아", "모로", "로랑", "시몽", "미셸", "르페브르", "르루아", "루", "다비드", "베르트랑", "모렐", "푸르니에", "지라르", "보네", "두퐁", "랑베르", "퐁텐", "루소", "뱅상", "묄러", "르페브르", "포르", "앙드레", "메르시에", "블랑", "게랭", "부아예", "가르니에", "슈발리에", "프랑수아", "르그랑", "고티에", "가르시아"], 
        names: {
            male: ["가브리엘", "레오", "라파엘", "아르튀르", "루이", "루카", "아담", "쥘", "위고", "마엘", "리암", "에단", "폴", "나탕", "가뱅", "사샤", "노아", "톰", "모하메드", "아론"],
            female: ["자드", "루이즈", "엠마", "알리스", "앙브르", "리나", "로즈", "클로에", "미아", "레아", "안나", "밀라", "줄리아", "로미", "이네스", "마농", "롤라", "조에", "아가트", "엘레나"],
            neutral: ["사샤", "카미유", "샤를리"]
        },
        order: 'NS' 
    },
    "러시아": { 
        surnames: ["스미르노프", "이바노프", "쿠즈네초프", "포포프", "소콜로프", "레베데프", "코즐로프", "노비코프", "모로조프", "페트로프", "볼코프", "솔로비요프", "바실리예프", "자이체프", "파블로프", "세묘노프", "골루베프", "비노그라도프", "보그다노프", "보로비요프", "표도로프", "미하일로프", "벨랴에프", "타라소프", "벨로프", "코마로프", "오를로프", "키셀료프", "마카로프", "안드레예프"], 
        names: {
            male: ["알렉산드르", "막심", "이반", "드미트리", "아르툠", "미하일", "다니일", "키릴", "안드레이", "예고르", "니키타", "일리야", "알렉세이", "마트베이", "티모페이", "로만", "블라디미르", "세르게이", "마르크", "그리거리"],
            female: ["소피아", "마리야", "안나", "알리스", "빅토리아", "아나스타시야", "폴리나", "알렉산드라", "엘리자베타", "다리야", "에바", "크세니야", "예카테리나", "바르바라", "베로니카", "아리나", "바실리사", "밀라나", "울리야나", "키라"],
            neutral: ["사샤", "제냐", "발랴"]
        },
        order: 'NS' 
    },
    "이탈리아": { 
        surnames: ["로시", "루소", "페라리", "에스포시토", "비앙키", "로마노", "콜롬보", "리치", "마리노", "그레코", "브루노", "갈로", "콘티", "데 루카", "코스타", "조르다노", "만치니", "리조", "롬바르디", "모레티", "바르비에리", "폰타나", "산토로", "마리아니", "리날디", "카루소", "페라라", "갈리", "마르티니", "레오네"], 
        names: {
            male: ["레오나르도", "프란체스코", "알레산드로", "로렌초", "마티아", "안드레아", "가브리엘레", "리카르도", "톰마소", "에도아르도", "주세페", "페데리코", "안토니오", "디에고", "조반니", "피에트로", "필리포", "사무엘레", "크리스티안", "다비데"],
            female: ["소피아", "줄리아", "아우로라", "알리체", "지네브라", "엠마", "조르지아", "마르티나", "베아트리체", "키아라", "루도비카", "비토리아", "마틸데", "안나", "카밀라", "니콜", "가이아", "비앙카", "사라", "그레타"],
            neutral: ["안드레아", "엘리아", "마티아"]
        },
        order: 'NS' 
    },
    "스페인": { 
        surnames: ["가르시아", "로드리게스", "곤잘레스", "페르난데스", "로페스", "마르티네스", "산체스", "페레스", "고메스", "마르틴", "히메네스", "루이스", "에르난데스", "디아스", "모레노", "무뇨스", "알바레스", "로메로", "알론소", "구티에레스", "나바에스", "토레스", "도밍게스", "바스케스", "라모스", "길", "라미레스", "세라노", "블랑코", "몰리나"], 
        names: {
            male: ["우고", "마테오", "마르틴", "루카스", "레오", "다니엘", "알레한드로", "마누엘", "파블로", "알바로", "아드리안", "엔조", "마리오", "디에고", "다비드", "마르코스", "이사안", "하비에르", "알렉스", "브루노"],
            female: ["루시아", "소피아", "마르티나", "마리아", "파울라", "훌리아", "엠마", "발레리아", "다니엘라", "알바", "노아", "사라", "카를라", "클라우디아", "알마", "클로에", "롤라", "베가", "아이타나", "마르타"],
            neutral: ["알렉스", "파우", "레예스"]
        },
        order: 'NS' 
    },
    "캐나다": { 
        surnames: ["스미스", "브라운", "트랑블레", "마탱", "루아", "윌슨", "맥도널드", "가뇽", "존슨", "테일러", "코테", "부샤르", "고티에", "라부아", "벨랑제", "르블랑", "펠티에", "레베크", "하미드", "싱", "첸", "웡", "길", "칸", "리", "존스", "밀러", "데이비스", "앤더슨", "토머스"], 
        names: {
            male: ["리암", "노아", "윌리엄", "잭슨", "루카스", "로건", "벤자민", "제이콥", "올리버", "제임스", "이던", "에이든", "잭", "오웬", "와이엇", "코너", "네이선", "케일럽", "라이언", "레오"],
            female: ["올리비아", "엠마", "샬롯", "아멜리아", "소피아", "에바", "이사벨라", "아리아", "에블린", "미아", "애비게일", "에밀리", "엘라", "스칼렛", "릴리", "클로에", "마야", "한나", "노라", "에이보리"],
            neutral: ["에이보리", "조던", "찰리", "라일리"]
        },
        order: 'NS' 
    },
    "호주": { 
        surnames: ["스미스", "존스", "윌리엄스", "브라운", "윌슨", "테일러", "응우옌", "존슨", "마틴", "화이트", "앤더슨", "톰슨", "해리스", "워커", "라이언", "켈리", "킹", "리", "데이비스", "라이트", "클라크", "로버츠", "해리슨", "스콧", "영", "미첼", "그린", "홀", "에반스"], 
        names: {
            male: ["올리버", "노아", "잭", "윌리엄", "레오", "루카스", "토머스", "헨리", "찰리", "제임스", "허드슨", "리암", "리바이", "헌터", "이던", "아치", "해리슨", "맥스", "쿠퍼", "조지"],
            female: ["샬롯", "올리비아", "아멜리아", "아일라", "미아", "에바", "그레이스", "아이비", "하퍼", "윌로우", "에비", "클로에", "소피", "조이", "루비", "엘라", "에블린", "마틸다", "플로렌스", "헤이즐"],
            neutral: ["찰리", "조던", "라일리", "케이시"]
        },
        order: 'NS' 
    },
    "브라질": { 
        surnames: ["실바", "산토스", "올리베이라", "소우자", "로드리게스", "페레이라", "알베스", "페레이라", "리마", "고메스", "코스타", "카르발류", "아라우주", "멜루", "바르보자", "리베이루", "마르칭스", "카르도주", "호샤", "나시멘투", "알메이다", "안드라지", "로페스", "소아레스", "비에이라", "모레이라", "마르케스", "마샤두", "테이셰이라", "멘데스"], 
        names: {
            male: ["미겔", "아르투르", "에이토르", "베르나르두", "다비", "테오", "로렌초", "가브리엘", "페드로", "벤자민", "마테우스", "루카스", "니콜라스", "조아킹", "사무엘", "엔리케", "라파엘", "길례르미", "엔조", "무릴루"],
            female: ["엘레나", "알리스", "라우라", "마누엘라", "발렌티나", "소피아", "이사벨라", "엘로이자", "루이자", "줄리아", "로레나", "리비아", "지오바나", "마리아 알리스", "베아트리스", "마리아나", "세실리아", "엘로아", "안토넬라", "마이사"],
            neutral: ["알렉스", "크리스", "두다"]
        },
        order: 'NS' 
    },
    "아르헨티나": { 
        surnames: ["곤살레스", "로드리게스", "고메스", "페르난데스", "로페스", "디아스", "마르티네스", "페레스", "가르시아", "산체스", "로메로", "소사", "알바레스", "토레스", "루이스", "라미레스", "플로레스", "아코스타", "베니테스", "메디나", "수아레스", "에레라", "아기레", "페레이라", "구티에레스", "히메네스", "몰리나", "카스트로", "로하스", "오르티스"], 
        names: {
            male: ["마테오", "바우티스타", "후안", "펠리페", "브루노", "티아고", "베니시오", "호아킨", "아구스틴", "토마스", "치로", "이안", "엔조", "단테", "가엘", "밀로", "리암", "노아", "로렌초", "벤하민"],
            female: ["엠마", "올리비아", "마르티나", "이사벨라", "카탈리나", "델피나", "미아", "알마", "빅토리아", "조이", "엘레나", "소피아", "후아나", "발렌티나", "필라르", "롤라", "루시아", "에밀리아", "아브릴", "안토니아"],
            neutral: ["알렉스", "파우", "레예스"]
        },
        order: 'NS' 
    },
    "멕시코": { 
        surnames: ["에르난데스", "가르시아", "마르티네스", "로페스", "곤살레스", "페레스", "로드리게스", "산체스", "라미레스", "크루스", "플로레스", "고메스", "모랄레스", "바스케스", "히메네스", "레예스", "디아스", "토레스", "구티에레스", "루이스", "멘도사", "아길라르", "오르티스", "모레노", "카스티요", "로메로", "알바레스", "멘데스", "차베스", "리베라"], 
        names: {
            male: ["산티아고", "마테오", "세바스티안", "레오나르도", "마티아스", "에밀리아노", "디에고", "미겔", "다니엘", "알렉산더", "알레한드로", "가엘", "로드리고", "앙헬", "다비드", "호세", "이케르", "루이스", "니콜라스", "마우리시오"],
            female: ["소피아", "마리아 호세", "발렌티나", "히메나", "레히나", "카밀라", "마리아 페르난디", "발레리아", "빅토리아", "레나타", "루피타", "나탈리아", "다니엘라", "알렉사", "페르난디", "안드레아", "엘리자베스", "마리아나", "과달루페", "히메나"],
            neutral: ["알렉스", "과달루페", "레예스"]
        },
        order: 'NS' 
    },
    "인도": { 
        surnames: ["파텔", "싱", "샤르마", "쿠마르", "다스", "굽타", "레디", "라오", "나이르", "미시라", "칸", "베르마", "야다브", "조시", "아이예르", "초우두리", "바네르지", "차테르지", "메타", "샤", "쿨카르니", "데사이", "말호트라", "카푸르", "보스", "메논", "프라사드", "필라이", "바트", "두베이"], 
        names: {
            male: ["아라브", "비한", "아디티야", "사이", "아르준", "레얀시", "무하마드", "아리안", "비반", "크리슈나", "이샨", "샤우리야", "아타르브", "아드바이트", "아얀", "카비르", "루드라"],
            female: ["아비야", "아난야", "디야", "파리", "산비", "엔젤", "이라", "마이라", "카이라", "안비", "아디야", "아로히", "리야", "사라", "카비야", "사나", "반야", "이샤니", "샤나야", "자라", "나비야"],
            neutral: ["사이", "엔젤", "아리안"]
        },
        order: 'NS' 
    },
    "이집트": { 
        surnames: ["모하메드", "아흐메드", "마흐무드", "알리", "하산", "이브라힘", "모스타파", "유세프", "타하", "칼릴", "아바스", "만수르", "사이드", "하메드", "아지즈", "라시드", "나세르", "파흐미", "아메르", "자키", "가베르", "하템", "살렘", "살라마", "이스마일", "바다위", "오스만", "라마단", "마그디", "안와르"], 
        names: {
            male: ["모하메드", "아흐메드", "마흐무드", "유세프", "무스타파", "오마르", "타하", "칼레드", "암르", "후세인", "알리", "이브라힘", "함자", "아담", "마르완", "카림", "야신", "아나스", "말릭", "세이프"],
            female: ["마리암", "파트마", "아야", "사라", "하비바", "자나", "하나", "로자인", "리나", "누르", "사마", "파리다", "하제르", "라흐마", "라완", "살마", "샤흐드", "야스민", "바스마", "말락"],
            neutral: ["누르", "아말", "이흐산"]
        },
        order: 'NS' 
    },
    "터키": { 
        surnames: ["일마즈", "카야", "데미르", "첼리크", "샤힌", "일디즈", "일디름", "외즈튀르크", "아이딘", "외즈데미르", "아르슬란", "도안", "클리츠", "아슬란", "체틴", "카라", "코츠", "쿠르트", "외즈잔", "심셰크", "야부즈", "폴라트", "잔", "코르크마즈", "에르도안", "불루트", "위날", "귀렐", "야만", "악소이"], 
        names: {
            male: ["유수프", "에이멘", "외메르", "미라치", "무스타파", "아흐메트", "메흐메트", "케렘", "알파르슬란", "함자", "알리", "잔", "부라크", "엠레", "아르다", "에페", "오잔", "카안", "데니즈", "메르트"],
            female: ["제이네프", "엘리프", "데프네", "아셀", "아즈라", "에일륄", "네히르", "에브라르", "아다", "야우무르", "히라", "메리엠", "제흐라", "두루", "데린", "미라", "아이셰", "파트마", "에스마", "귀네시"],
            neutral: ["데니즈", "잔", "귀네시"]
        },
        order: 'NS' 
    },
    "스웨덴": { 
        surnames: ["안데르손", "요한손", "칼손", "닐손", "에릭손", "라르손", "올손", "페르손", "스벤손", "구스타프손", "페테르손", "욘손", "얀손", "한손", "벵트손", "옌손", "린드베리", "야콥손", "마그누손", "올로프손", "린드스트룀", "오케손", "린드퀴스트", "룬드그렌", "베르그스트룀", "군나르손", "발린", "사무엘손", "아르비드손", "이사크손"], 
        names: {
            male: ["빌리암", "리암", "노아", "위고", "올리버", "루카스", "엘리아스", "마테오", "레오", "아담", "발터", "닐스", "루드비그", "오스카르", "알렉산데르", "아르비드", "찰리", "이사크", "아우구스트", "멜케르"],
            female: ["알리스", "마야", "엘사", "아스트리드", "빌마", "프레이야", "올리비아", "셀마", "알마", "엘라", "시그네", "베라", "에바", "릴리", "아그네스", "이네스", "넬리", "몰리", "알바", "레아"],
            neutral: ["찰리", "킴", "미카"]
        },
        order: 'NS' 
    },
    "노르웨이": { 
        surnames: ["한센", "요한센", "올센", "라르센", "안데르센", "페데르센", "닐센", "옌센", "칼센", "크리스티안센", "에릭센", "룬데", "바케", "베르게", "하우겐", "새테르", "모엔", "산드비크", "군네르센", "하우게", "스트란", "솔베르그", "할보르센", "야콥센", "리", "시베르첸", "응우옌", "미켈센", "크누첸", "이베르센"], 
        names: {
            male: ["야콥", "루카스", "에밀", "오스카르", "올리버", "빌리암", "필립", "노아", "엘리아스", "이사크", "악셀", "마그누스", "테오도르", "루드비그", "요하네스", "헨릭", "산데르", "에릭", "토비아스", "리암"],
            female: ["노라", "엠마", "올리비아", "엘라", "소피아", "마야", "사라", "잉그리드", "테아", "이다", "에밀리에", "레아", "린네아", "프리다", "티릴", "아말리에", "한나", "아스트리드", "빌데", "아다"],
            neutral: ["킴", "미카", "알렉스"]
        },
        order: 'NS' 
    },
    "덴마크": { 
        surnames: ["닐센", "옌센", "한센", "페데르센", "안데르센", "크리스텐센", "라르센", "쇠렌센", "라스무센", "외르겐센", "페테르센", "마센", "크리스텐센", "올센", "톰센", "크리스티안센", "폴센", "요한센", "묄레르", "모르텐센", "크누센", "야콥센", "룬드", "미켈센", "홀름", "뇌르고르", "슈미트", "에릭센", "헨릭센", "칼센"], 
        names: {
            male: ["빌리암", "노아", "오스카르", "루카스", "빅토르", "말테", "에밀", "프레데리크", "올리버", "마그누스", "발데마르", "악셀", "아르투르", "알프레드", "엘리아스", "테오도르", "카를", "위고", "리암", "오토"],
            female: ["알마", "이다", "클라라", "엘라", "올리비아", "프레이야", "소피아", "엠마", "카를라", "아그네스", "릴리", "노라", "안나", "엘리", "아스타", "알베르테", "루나", "필리파", "마야", "요세피네"],
            neutral: ["킴", "미카", "알렉스"]
        },
        order: 'NS' 
    },
    "핀란드": { 
        surnames: ["코르호넨", "비르타넨", "매키넨", "니에미넨", "매켈래", "해맬래이넨", "라이네", "헤이키넨", "코스키넨", "새르비넨", "레흐토넨", "레흐티넨", "사리넨", "살로넨", "헤이노넨", "니에미", "투루넨", "살미넨", "투오미넨", "헤이스카넨", "살로", "펠토라", "킨누넨", "란타넨", "마티라", "라우티아이넨", "배이사넨", "카르얄라이넨", "라이티넨", "사볼라이넨"], 
        names: {
            male: ["레오", "에이노", "올리버", "엘리아스", "온니", "배이뇌", "노엘", "에에투", "요엘", "위고", "에밀", "옷소", "에엘리", "아르투", "니일로", "마티아스", "사무엘", "아아투", "빌호", "오스카리"],
            female: ["아이노", "올리비아", "소피아", "피흘라", "릴야", "벤라", "린네아", "헬미", "아아다", "이스라", "에에비", "엘렌", "케르투", "힐라", "비이비", "엠마", "엘라", "아만다", "마트타", "알리사"],
            neutral: ["미카", "사샤", "알렉스"]
        },
        order: 'NS' 
    },
    "폴란드": { 
        surnames: ["노바크", "코발스키", "비시니에프스키", "브이지치크", "코발치크", "카민스키", "레반도프스키", "지에린스키", "쉬만스키", "보지니아크", "돔브롭스키", "코즐롭스키", "얀코프스키", "마주르", "보이치에호프스키", "크비아트코프스키", "크라브치크", "카치마레크", "피오트로프스키", "그라보프스키", "자용츠", "파브롭스키", "미할스키", "크룰", "비에초레크", "야브원스키", "브루벨", "마예프스키", "아담치크", "두데크"], 
        names: {
            male: ["안토니", "야쿱", "얀", "시몬", "프란치스체크", "필립", "알렉산데르", "미콜와이", "보이치에흐", "카츠페르", "스타니스와프", "마르첼", "아담", "이그나치", "빅토르", "레온", "미하우", "피오트르", "니코뎀", "티몬"],
            female: ["주잔나", "조피아", "한나", "줄리아", "마야", "라우라", "올리비아", "알리차", "레나", "폴라", "마리아", "에밀리아", "아멜리아", "빅토리아", "안토니나", "헬레나", "이가", "미할리나", "코르넬리아"],
            neutral: ["알렉스", "쿠바", "올라"]
        },
        order: 'NS' 
    },
    "우크라이나": { 
        surnames: ["멜니크", "셰브첸코", "보이코", "코발렌코", "봉다렌코", "트카첸코", "코발추크", "크라브첸코", "올리이니크", "셰브추크", "폴리슈추크", "봉다르", "모로즈", "리센코", "루덴코", "사브첸코", "페트렌코", "코스텐코", "마르첸코", "파슈첸코", "하브릴류크", "쿠즈멘코", "리트빈", "크라베츠", "볼로신"], 
        names: {
            male: ["올렉산드르", "드미트로", "막심", "블라디슬라프", "안드리", "아르툠", "이반", "나자르", "보흐단", "다니일", "미키타", "타라스", "로만", "세르히", "유리", "빅토르", "이호르", "미콜라", "아나톨리", "예우헨"],
            female: ["아나스타시야", "소피야", "마리야", "안나", "빅토리야", "다리야", "베로니카", "폴리나", "올레나", "테티야나", "카테리나", "나탈리야", "옥사나", "이리나", "율리야", "올하", "알리나", "릴리야", "솔로미야"],
            neutral: ["제냐", "사샤", "발랴"]
        },
        order: 'NS' 
    },
    "네덜란드": { 
        surnames: ["더 용", "얀센", "더 브리스", "판 덴 베르흐", "판 데이크", "바커르", "얀선", "비서르", "스밋", "메이여르", "더 부르", "묠더르", "더 흐로트", "보스", "포스", "페터르스", "헨드릭스", "판 덴 허우벌", "브라우버르", "판 데르 메이르", "바커르", "스하우턴", "크라메르", "더커르", "페르묠런", "야스퍼르", "페인스트라", "빌럼스", "흐로트", "포스트마"], 
        names: {
            male: ["노아", "셈", "루카스", "단", "핀", "리바이", "밀란", "브람", "루크", "예서", "메스", "율리안", "아담", "샘", "토머스", "메이슨", "보아스", "마트스", "위고", "헤이스"],
            female: ["율리아", "밀라", "엠마", "소피", "노라", "야라", "테스", "노르", "하우트", "사라", "리브", "조에", "에비", "페네", "안나", "밀리", "올리비아", "사르", "리커", "로런"],
            neutral: ["샘", "알렉스", "로빈"]
        },
        order: 'NS' 
    },
    "벨기에": { 
        surnames: ["페터르스", "얀선스", "마스", "야콥스", "메르턴스", "빌럼스", "클라스", "호선스", "베아우터르스", "더 스멧", "파우벌스", "페르묠런", "헤르만스", "미힐스", "마르턴스", "스멧스", "아담", "쁘띠", "랑베르", "두퐁", "마르탱", "시몽", "미셸", "르루아", "뒤부아", "베르트랑", "프랑수아", "제라르", "로랑", "르페브르"], 
        names: {
            male: ["아르튀르", "리암", "루이", "노아", "아담", "쥘", "루카스", "빅토르", "가브리엘", "모하메드", "나탕", "위고", "핀", "레온", "마테오", "엘리아스", "오티스", "빈스", "에밀"],
            female: ["엠마", "올리비아", "루이즈", "밀라", "알리스", "카미유", "엘레나", "소피아", "리나", "줄리엣", "미아", "안나", "엘라", "루시", "노라", "세린", "마리", "클로에", "레아", "노르"],
            neutral: ["알렉스", "샘", "로빈"]
        },
        order: 'NS' 
    },
    "스위스": { 
        surnames: ["뮐러", "마이어", "슈미트", "켈러", "베버", "후버", "슈나이더", "마이어", "프라이", "모저", "게르버", "바우만", "브루너", "그라프", "비드머", "쥐르허", "비스", "뤼티", "슈투키", "바흐만", "파브르", "베루", "기각스", "주터", "쿤츠", "블라저", "에거", "포겔", "포르트만", "푹스"], 
        names: {
            male: ["노아", "리암", "마테오", "레온", "루카", "엘리아스", "율리안", "다비드", "사무엘", "레오", "니노", "벤", "레빈", "핀", "루이", "아론", "아르튀르", "마엘", "가브리엘", "엘리오"],
            female: ["미아", "엠마", "엘레나", "밀라", "소피아", "에밀리아", "리나", "레아", "알리나", "라라", "안나", "클로에", "사라", "노라", "라우라", "율리아", "알리스", "엘린", "레오니", "소피"],
            neutral: ["루카", "알렉스", "로빈"]
        },
        order: 'NS' 
    },
    "오스트리아": { 
        surnames: ["그루버", "후버", "바우어", "바그너", "뮐러", "피흘러", "슈타이너", "모저", "마이어", "호퍼", "라이트너", "베르거", "푹스", "에더", "피셔", "슈미트", "빙클러", "베버", "슈바르츠", "마이어", "빈더", "파이퍼", "호프만", "하르틀", "랑거", "코흐", "크라우스", "랑", "슈스터", "바이스"], 
        names: {
            male: ["막시밀리안", "파울", "야콥", "다비드", "펠릭스", "엘리아스", "루카스", "요나스", "토비아스", "알렉산더", "제바스티안", "레오", "필립", "모리츠", "안톤", "에밀", "노아", "루이스", "마테오", "파비안"],
            female: ["마리", "안나", "에밀리아", "요한나", "엠마", "미아", "소피아", "레나", "레아", "라우라", "발렌티나", "루이사", "클라라", "엘레나", "밀라", "한나", "사라", "릴리", "율리아", "노라"],
            neutral: ["알렉스", "루카", "자샤"]
        },
        order: 'NS' 
    },
    "포르투갈": { 
        surnames: ["실바", "산토스", "페레이라", "페레이라", "올리베이라", "코스타", "로드리게스", "마르칭스", "제주스", "소우자", "페르난데스", "곤살베스", "고메스", "마르케스", "알메이다", "리베이루", "카르발류", "테이셰이라", "모레이라", "코레이아", "멘데스", "누네스", "소아레스", "비에이라", "몬테이루", "카르도주", "호샤", "네베스", "쿠냐", "쿠냐"], 
        names: {
            male: ["주앙", "프란시스쿠", "산티아고", "아폰수", "두아르트", "토망스", "마르칭", "로드리구", "로렌수", "가브리엘", "미겔", "루카스", "마테우스", "길례르미", "비센트", "살바도르", "디니스", "엔리케", "세바스티앙", "베르나르두"],
            female: ["마리아", "레오노르", "마틸드", "베아트리스", "카롤리나", "마리아나", "아나", "소피아", "프란시스카", "이네스", "마르가리다", "클라라", "알리스", "라우라", "베네디타", "디아나", "마그달레나", "마팔다", "조아나", "카밀라"],
            neutral: ["알렉스", "크리스", "두다"]
        },
        order: 'NS' 
    },
    "그리스": { 
        surnames: ["파파도풀로스", "블라호스", "안겔로풀로스", "니콜라이디스", "요르구", "페트리디스", "디미트리아디스", "파파디미트리우", "이오안니디스", "콘스탄티니디스", "카차로스", "마니아티스", "파파요르구", "스타브로풀로스", "안드레아디스", "키리아키디스", "아타나시우", "알렉시우", "사리스", "루소스", "크리스토둘루", "야노풀로스", "디아만토풀로스", "파나기오토풀로스", "갈라니스"], 
        names: {
            male: ["요르기오스", "디미트리오스", "콘스탄티노스", "이오안니스", "니콜라오스", "크리스토스", "파나기오티스", "바실리오스", "아타나시오스", "에반겔로스", "알렉산드로스", "스피리돈", "아나스타시오스", "엠마누일", "안드레아스", "미하일", "마리오스", "앙겔로스", "스테파노스", "파블로스"],
            female: ["마리아", "엘레니", "카테리나", "바실리키", "요르기아", "소피아", "아나스타시아", "에반겔리아", "이오안나", "디미트라", "안나", "파나기오타", "데스피나", "칼리오페", "크리술라", "이리니", "앙겔리키", "스타브룰라", "파라스케비", "마리나"],
            neutral: ["알렉스", "니키", "크리스"]
        },
        order: 'NS' 
    },
    "아일랜드": { 
        surnames: ["머피", "켈리", "바이른", "라이언", "오브라이언", "월시", "오설리반", "오코너", "도일", "매카시", "오닐", "린치", "오라일리", "던", "케네디", "피츠제럴드", "캘러핸", "오셰이", "화이트", "브레이디", "버크", "콜린스", "도허티", "매과이어", "놀란", "플린", "오도넬", "오도노휴", "갈라허", "오마호니"], 
        names: {
            male: ["잭", "제임스", "노아", "다니엘", "코너", "핀", "리암", "피온", "해리", "찰리", "킬리언", "다라", "루크", "리안", "오신", "타그", "션", "패트릭", "바비", "아담"],
            female: ["그레이스", "피아", "에밀리", "소피", "에바", "아리아", "엘라", "올리비아", "미아", "헤이즐", "릴리", "클로에", "페니", "에비", "샤오르세", "윌로우", "루비", "알리스", "밀라", "이사벨라"],
            neutral: ["찰리", "알렉스", "조던", "라일리"]
        },
        order: 'NS' 
    },
    "스코틀랜드": { 
        surnames: ["스미스", "브라운", "윌슨", "캠벨", "스튜어트", "톰슨", "로버트슨", "앤더슨", "맥도널드", "스콧", "리드", "머레이", "테일러", "클라크", "미첼", "로스", "워커", "패터슨", "영", "프레이저", "모리슨", "맥도널드", "그레이엄", "존스턴", "헨더슨", "헌터", "맥클린", "카메론", "벨", "그레이"], 
        names: {
            male: ["올리버", "노아", "잭", "레오", "해리스", "핀레이", "루이스", "제임스", "로리", "브로디", "아치", "알피", "알렉산더", "테오", "케일럽", "루카스", "주드", "로건", "메이슨", "핀"],
            female: ["올리비아", "에밀리", "아일라", "프레이야", "엘라", "에바", "소피", "샬롯", "그레이스", "아멜리아", "릴리", "제시카", "미아", "루시", "에비", "소피아", "아리아", "메이지", "하퍼", "밀라"],
            neutral: ["찰리", "알렉스", "조던", "라일리"]
        },
        order: 'NS' 
    },
    "헝가리": { 
        surnames: ["나지", "코바치", "토트", "사보", "호르바트", "바르가", "키시", "몰나르", "네메트", "파르카시", "발로그", "파프", "타카치", "유하스", "라카토시", "메사로시", "시몬", "올라", "페헤르", "페케테", "실라지", "퇴뢰크", "굴야시", "코치시", "샨도르", "켈레멘", "하이두", "소모지", "바르타", "빈체"], 
        names: {
            male: ["벤체", "마테", "도미닉", "레벤테", "노엘", "다니엘", "잘란", "마르첼", "올리베르", "아담", "밀란", "다비드", "보톤드", "파트릭", "발라주", "크리슈토프", "아틸라", "라스로", "타마시", "게르괴"],
            female: ["한나", "안나", "조에", "레나", "루차", "엠마", "조피아", "보글라르카", "야즈민", "릴라", "그레타", "마야", "노라", "레카", "도리나", "판니", "카밀라", "아델", "비비엔", "블랑카"],
            neutral: ["알렉스", "크리스", "샤샤"]
        },
        order: 'SN' 
    },
    "체코": { 
        surnames: ["노바크", "스보보다", "노보트니", "드보르작", "체르니", "프로하츠카", "쿠체라", "베셀리", "호라크", "네메츠", "마레크", "포코르니", "포스피실", "하예크", "옐리네크", "크랄", "루지치카", "베네시", "피알라", "세들라체크", "돌레잘", "제만", "콜라르", "크레이치", "나브라틸", "체르마크", "블체크", "우르반", "바네크", "블라체크"], 
        names: {
            male: ["야쿱", "얀", "토마시", "마티야시", "아담", "필립", "보이체흐", "루카시", "마르틴", "마테이", "온드레이", "다니엘", "다비트", "도미닉", "안토닌", "이르지", "바츠라프", "페트르", "슈테판", "크리슈토프"],
            female: ["엘리슈카", "안나", "아델라", "테레자", "소피에", "빅토리에", "에마", "카롤리나", "나탈리에", "아말리에", "줄리에", "바르보라", "크리스티나", "아네슈카", "로잘리에", "라우라", "마리에", "루치에", "아네타", "네라"],
            neutral: ["알렉스", "니콜라", "사샤"]
        },
        order: 'NS' 
    },
    "루마니아": { 
        surnames: ["포파", "포페스쿠", "라두", "포프", "두미트루", "스토이카", "스탄", "게오르게", "루수", "문테아누", "마테이", "콘스탄틴", "이오네스쿠", "디누", "바실레", "마린", "몰도반", "이온", "셰르반", "안드레이", "슈테판", "미하이", "드라고미르", "플로레아", "프르부"], 
        names: {
            male: ["안드레이", "다비드", "알렉산드루", "가브리엘", "마테이", "슈테판", "이오누츠", "플로린", "다니엘", "미하이", "루카", "마리우스", "크리스티안", "다리우스", "블라드", "로베르트", "투도르", "에두아르트", "제오르제", "니콜라스"],
            female: ["마리아", "엘레나", "안드레아", "이오아나", "알렉산드라", "안나", "제오르지아나", "미하에라", "슈테파니아", "데니사", "비앙카", "아디나", "랄루카", "가브리엘라", "크리스티나", "라우라", "다리아", "안토니아", "알레시아", "에리카"],
            neutral: ["알렉스", "가비", "발리"]
        },
        order: 'NS' 
    },
    "태국": { 
        surnames: ["새탕", "새리", "새왕", "새우엥", "새첸", "새리", "새로우", "새카우", "새티우", "새풍", "라타나폰", "차이야촛", "수타랏", "파숙", "솜분", "비칫", "폰차이", "키티퐁", "수파랏", "탄타이"], 
        names: {
            male: ["솜차이", "솜삭", "아팃", "키티삭", "나타퐁", "쁘라싯", "아룬", "차이", "나롱", "삭", "비차이"],
            female: ["말리", "라타나", "시리폰", "완니파", "칸야", "라완", "말리", "핌", "수니", "아냐", "부아", "다오", "관", "남", "플로이", "리아", "사이", "타", "유이"],
            neutral: ["에크", "볼", "골프", "조이", "난"]
        },
        order: 'NS' 
    },
    "베트남": { 
        surnames: ["응우옌", "쩐", "레", "팜", "황", "후인", "판", "부", "당", "부이", "도", "호", "응오", "즈엉", "리"], 
        names: {
            male: ["민", "득", "주이", "황", "후이", "히에우", "롱", "남", "푹", "꾸안", "선", "타인", "쭝", "뚜안", "비엣"],
            female: ["안", "린", "카인", "쑤언", "옌", "란", "마이", "응옥", "프엉", "꾸인", "타오", "짱", "투", "우옌", "반"],
            neutral: ["안", "린", "카인", "투"]
        },
        order: 'SN' 
    },
    "필리핀": { 
        surnames: ["산토스", "레예스", "크루스", "바우티스타", "오캄포", "가르시아", "멘도사", "토레스", "토마스", "안드라다", "델 로사리오", "카스티요", "빌라누에바", "라모스", "카스트로", "리베라", "아키노", "파스쿠알", "델라 크루스", "곤살레스"], 
        names: {
            male: ["호세", "후안", "헤수스", "레이난테", "에드가르도", "단테", "로메오", "안토니오", "리카르도", "프란시스", "가브리엘", "나다니엘", "조슈아", "크리스찬", "이던", "존", "다비드"],
            female: ["마리아", "엔젤", "로살린다", "아우로라", "코라손", "이멜다", "루스비민다", "페를라", "삼파기타", "알테아", "사만다", "한나", "니콜"],
            neutral: ["엔젤", "알렉스", "샘"]
        },
        order: 'NS' 
    },
    "인도네시아": { 
        surnames: ["사리", "세티아완", "프라타마", "사푸트라", "산토소", "히다얏", "누그로호", "수산토", "쿠수마", "위자야", "푸트라", "하리안토", "구나완", "라흐만", "시레가르", "루비스", "나수티온", "시투모랑", "긴팅", "시만준탁"], 
        names: {
            male: ["아구스", "부디", "안디", "에코", "헨드라", "루디", "얀토", "아디티야", "밤방", "도니", "파자르", "군투르", "하디", "이완", "조코", "크리스나", "나낭", "푸르노모"],
            female: ["스리", "데위", "인다", "리나", "아유", "시티", "레스타리", "마야"],
            neutral: ["누르", "와휴", "트리"]
        },
        order: 'NS' 
    },
    "말레이시아": { 
        surnames: ["탄", "림", "리", "웡", "응", "총", "용", "추아", "테", "여", "빈 아흐마드", "빈 하산", "빈 이스마일", "빈티 압둘라", "빈티 알리"], 
        names: {
            male: ["무하마드", "아흐마드", "압둘", "모흐드", "아지즈", "하산", "알리", "아즈만", "파리드", "이브라힘", "카말", "라티프", "나시르", "오마르", "라자크", "살레", "주비르"],
            female: ["누르", "시티", "노르", "아이샤", "아미나", "파티마", "카디자", "마리암", "노라이니", "로하나", "살마", "자이톤", "자레하"],
            neutral: ["누르", "아지즈", "카말"]
        },
        order: 'NS' 
    },
    "싱가포르": { 
        surnames: ["탄", "림", "리", "응", "옹", "웡", "고", "추아", "찬", "코", "테오", "테이", "루", "로우", "소"], 
        names: {
            male: ["알로이시우스", "벤자민", "케일럽", "다리우스", "이던", "펠릭스", "가브리엘", "한스", "아이작", "조엘", "케빈", "루카스", "마커스", "네이선", "오웬", "피터", "퀘엔틴", "라이언", "사무엘", "토머스"],
            female: ["애비게일", "베아트리스", "클로에", "다프네", "엘레인", "길리언", "헤이즐", "아이린", "재스민"],
            neutral: ["알렉스", "샘", "크리스", "조던"]
        },
        order: 'NS' 
    },
    "사우디아라비아": { 
        surnames: ["알하르비", "알오타이비", "알카스타니", "알감디", "알자흐라니", "알도사리", "알무타이리", "알아나지", "알샤마리", "알라시디"], 
        names: {
            male: ["모하메드", "압둘라", "알리", "아흐메드", "오마르", "사이드", "파하드", "살만", "칼리드", "압둘아지즈", "유세프", "이브라힘", "만수르", "반다르", "투르키", "나예프", "파이살", "사우드", "왈리드", "하산"],
            female: ["파티마", "마리암", "사라", "누라", "헤사", "룰와", "알아누드", "자와헤르", "림", "무니라"],
            neutral: ["누르", "아말", "이만"]
        },
        order: 'NS' 
    },
    "UAE": { 
        surnames: ["알알리", "알함마디", "알마즈루이", "알카아비", "알샴시", "알팔라시", "알누아이미", "알만수리", "알카시미", "알나얀"], 
        names: {
            male: ["모하메드", "압둘라", "알리", "라시드", "사이드", "칼리파", "하마드", "술탄", "아흐메드", "오마르", "자예드", "막툼", "타흐눈", "사이프", "하짜", "만수르", "팔라", "부티", "수하일", "가넴"],
            female: ["파티마", "마리암", "마이타", "샤마", "라티파", "살라마", "오샤", "모자", "헤사", "힌드"],
            neutral: ["누르", "아말", "이만"]
        },
        order: 'NS' 
    },
    "이스라엘": { 
        surnames: ["코헨", "레비", "미즈라히", "페레츠", "비톤", "다한", "아브라함", "프리드만", "말카", "아줄라이", "카츠", "요세프", "다비드", "오렌", "샤피로"], 
        names: {
            male: ["다비드", "라비", "아리엘", "요세프", "노암", "오리", "에이탄", "다니엘", "모셰", "예후다", "이타이", "오메르", "기", "로에", "아밋", "알론", "이단", "토메르", "샤하르", "에레츠"],
            female: ["마야", "노아", "타마르", "시라", "아델", "탈리아", "야엘", "아비가일", "아야라", "사라"],
            neutral: ["노암", "아리엘", "오메르", "아밋"]
        },
        order: 'NS' 
    },
    "이란": { 
        surnames: ["모하마디", "호세이니", "아흐마디", "레자에이", "카리미", "무사비", "자파리", "하셰미", "사데기", "라히미", "모라디", "나자리", "살레히", "바크티아리", "가세미"], 
        names: {
            male: ["아미르", "모하마드", "알리", "호세인", "레자", "메흐디", "하산", "사이드", "하미드", "바히드", "파르하드", "바박", "시아바시", "아라시", "코우로시", "다리우시", "비잔", "케이반", "라민", "사만"],
            female: ["자흐라", "파테메", "마리암", "나르게스", "세피데", "로야", "닐루파르", "사하르", "파리사", "네가르"],
            neutral: ["카베", "샤얀", "라하"]
        },
        order: 'NS' 
    },
    "남아공": { 
        surnames: ["은코시", "쿠말로", "들라미니", "응코보", "모코에나", "음키제", "줄루", "시톨레", "느들로부", "보타", "판 데르 메르버", "스미스", "윌리엄스", "제이콥스", "드 클레르크"], 
        names: {
            male: ["주니어", "블레싱", "기프트", "프린스", "시야봉가", "반딜레", "멜로쿠흘레", "레타보", "보카모소", "옴필레", "요한", "피터", "빌렘", "헤르트", "스테판", "타보", "룽기", "시즈웨", "만들라", "봉가니"],
            female: ["잔딜레", "탄디", "레라토", "은타비셍", "음포", "부흘레", "아얀다", "놈불라", "시봉길레", "노쿠툴라"],
            neutral: ["음포", "아얀다", "레라토"]
        },
        order: 'NS' 
    },
    "나이지리아": { 
        surnames: ["이브라힘", "무사", "아부바카르", "아다무", "벨로", "압둘라히", "사니", "우마르", "모하메드", "알리유", "오콘크워", "아데예미", "발로그눈", "오비", "에제"], 
        names: {
            male: ["무사", "이브라힘", "사니", "알리유", "아부바카르", "유수프", "우마르", "모하메드", "벨로", "아다무", "추쿠디", "에메카", "올루와세운", "툰데", "세군", "치디", "이파니", "올루미데", "페미", "바바툰데"],
            female: ["은고지", "치넬로", "올라운미", "아미나", "자이나브", "치조바", "아다에제", "폴라케", "예미", "비시"],
            neutral: ["토비", "올라", "치디"]
        },
        order: 'NS' 
    },
    "케냐": { 
        surnames: ["므왕기", "마이나", "카마우", "오티에노", "카리우키", "오치엥", "오디암보", "뇨로게", "오몽디", "카란자", "완지쿠", "뉴구나", "키벳", "체프에티치", "무투아"], 
        names: {
            male: ["존", "피터", "조셉", "제임스", "다비드", "사무엘", "다니엘", "마이클", "폴", "스티븐", "키프춤바", "키프로노", "오몽디", "오티에노", "완요니", "무투쿠", "무냐오", "카란자", "뇨로게", "마이나"],
            female: ["메리", "제인", "앨리스", "그레이스", "새라", "완지쿠", "아치엥", "안양고", "체프에티치", "젭치르치르"],
            neutral: ["무모", "자와디", "바라카"]
        },
        order: 'NS' 
    },
    "모로코": { 
        surnames: ["알라위", "이드리시", "만수리", "타지", "베나니", "파시", "슈라이비", "벤젤룬", "엘 암라니", "필라리", "알라미", "하산", "베라다", "게수스", "라흘루"], 
        names: {
            male: ["모하메드", "메흐디", "아민", "함자", "유세프", "오마르", "아나스", "카림", "야신", "자카리아", "아딜", "브라힘", "드리스", "푸아드", "칼리드", "무스타파", "나빌", "라시드", "사이드", "타릭"],
            female: ["아이샤", "파티마", "카디자", "라이라", "무나", "나디아", "사나에", "지네브", "사미라", "말리카"],
            neutral: ["누르", "아말", "이만"]
        },
        order: 'NS' 
    },
    "뉴질랜드": { 
        surnames: ["스미스", "윌슨", "윌리엄스", "브라운", "테일러", "존스", "싱", "파텔", "왕", "앤더슨", "톰슨", "화이트", "해리스", "워커", "라이언"], 
        names: {
            male: ["올리버", "잭", "노아", "레오", "조지", "찰리", "루카스", "시어도어", "윌리엄", "메이슨", "리암", "헌터", "핀", "아를로", "쿠퍼", "오스카르", "제임스", "토머스", "아치", "맥스"],
            female: ["샬롯", "아멜리아", "아일라", "올리비아", "윌로우", "하퍼", "에바", "릴리", "소피", "엘라", "미아", "앨리스", "아이비", "루비", "플로렌스", "에비", "아리아", "에블린", "그레이스", "헤이즐"],
            neutral: ["찰리", "알렉스", "조던", "라일리"]
        },
        order: 'NS' 
    },
    "몽골": { 
        surnames: ["바트에르데네", "볼로르마", "엔흐바야르", "간볼드", "르하그바수렌", "뮝흐에르데네", "나란바타르", "옷곤바야르", "퓨레브도르지", "체렌바트", "다바수렌", "에르데네바트", "알탄게렐", "바야르사이한", "간조리그"], 
        names: {
            male: ["바투", "엔흐", "가나", "뮝흐", "나란", "옷곤", "퓨레브", "체렌", "다바", "에르데네", "테무진", "쿠빌라이", "오고타이", "주치", "톨루이", "예수게이", "수부타이", "제베", "무칼리"],
            female: ["보르테", "알타니", "쿠란", "예수이", "예수겐", "차비", "소르칵타니", "쿠툴룬", "만두하이", "아누", "노문다리"],
            neutral: ["엔흐", "뮝흐", "에르데네"]
        },
        order: 'SN' 
    },
    "미르탈 숲연합": { 
        surnames: ["실버", "윈드", "문", "스타", "에메랄드", "스노우", "리프", "레인", "나이트", "그린", "포레스트", "애쉬", "더스트", "블룸", "글레이드", "미스트", "쏜", "브랜치", "섀도우", "가디언"], 
        names: {
            male: ["리안", "리엘", "시엘", "페아노르", "아라곤", "엘론드", "갈라드", "스란두일", "레골라스", "에스텔", "엘로스", "핀로드", "투린", "아나리온", "켈레브림보르", "길갈라드", "글로르핀델", "에아렌딜", "투오르"],
            female: ["엘라", "갈라드리엘", "리안논", "루시엔", "에오윈", "셀레스", "아르웬", "님로델", "이드릴", "엘윙", "베렌"],
            neutral: ["리안", "시엘", "에스텔"]
        },
        order: 'SN' 
    },
    "레오니스 투기국": { 
        surnames: ["클로", "팽", "블러드", "아이언", "스톰", "와일드", "헌터", "베어", "울프", "라이언", "팽", "하울", "그라울", "슬래시", "크러시", "바이트", "로어", "본", "터스크", "브루트"], 
        names: {
            male: ["가르", "레오", "렉스", "타이거", "울프", "비스트", "바르카", "칸", "그록", "토르", "펜릴", "스카", "코가", "자바", "그리즐리", "팬서", "치타", "맘바", "코브라", "라이노", "히포", "고릴", "콩", "샤크", "오카", "울버린", "라쿤"],
            female: ["가이아", "라카", "우르사"],
            neutral: ["팽", "울프", "스카"]
        },
        order: 'SN' 
    },
    "네크로디움 제국": { 
        surnames: ["벨리알", "바알", "루시", "말피스", "네크로", "어비스", "다크", "보이드", "데스", "섀도우", "그림", "레이스", "헬", "나이트메어", "리치", "모드", "베인", "둠", "카오스", "테러"], 
        names: {
            male: ["자크", "모드", "벨레드", "제노", "자드", "크림존", "네로", "벨리알", "메피스토", "바알세불", "아스모데우스", "레비아탄", "벨페고르", "마몬", "사탄", "루시퍼", "타나토스", "하데스", "에레보스", "타르타로스", "모로스"],
            female: ["루나", "어비스", "모르가나", "리리스", "헬라", "페르세포네", "닉스", "케레스", "네메시스"],
            neutral: ["본", "섀도우", "소울"]
        },
        order: 'SN' 
    },
    "임페리얼 제국": { 
        surnames: ["임페리얼", "제너럴", "카이저", "로드", "엠퍼러", "루시퍼", "라스", "그리드", "슬로스", "테러", "프라이드", "엔비", "글러트니", "러스트", "디스페어", "카오스", "보이드", "루나틱", "다크니스", "앱솔루트"], 
        names: {
            male: ["카이", "바론", "듀크", "킹", "엠파이어", "레비아탄", "사탄", "마몬", "벨제붑", "아스모데우스", "루시엔", "아포리아", "바르칼론", "아자르", "카르니발", "이그니스", "몰드릭", "스콜라", "카이로스", "루나스", "벨리알", "제네시스", "오메가", "알파", "제니스", "나디르", "앱솔루트", "인피니트", "이터널", "이모탈"],
            female: ["엘리자베스", "빅토리아", "이사벨라", "마리아", "테레지아", "앙투아네트", "조세핀"],
            neutral: ["로열", "노블", "임페리얼"]
        },
        order: 'SN' 
    }
};
export const NATION_NAMES = Object.keys(NATION_DATA);

export const WORLD_GEOGRAPHY: Record<string, Record<string, { capital: string, cities: string[] }>> = {
    "아시아": {
        "대한민국": { capital: "서울", cities: ["서울", "부산", "인천", "대구", "대전", "광주"] },
        "북한": { capital: "평양", cities: ["평양", "나선", "개성", "신의주", "원산", "함흥", "청진"] },
        "일본": { capital: "도쿄", cities: ["도쿄", "오사카", "교토", "삿포로", "후쿠오카"] },
        "중국": { capital: "베이징", cities: ["베이징", "상하이", "광저우", "시안", "청두"] },
        "인도": { capital: "뉴델리", cities: ["뉴델리", "뭄바이", "벵갈루루", "첸나이"] },
        "태국": { capital: "방콕", cities: ["방콕", "치앙마이", "푸켓", "파타야"] },
        "베트남": { capital: "하노이", cities: ["하노이", "호치민", "다낭", "나트랑"] },
        "필리핀": { capital: "마닐라", cities: ["마닐라", "세부", "다바오"] },
        "몽골" : {capital: "울란바토르", cities: ["울란바토르", "다르항", "에르데네트"]},
        "인도네시아": { capital: "자카르타", cities: ["자카르타", "발리", "수라바야"] },
        "말레이시아": { capital: "쿠알라룸푸르", cities: ["쿠알라룸푸르", "페낭", "조호르바루"] },
        "싱가포르": { capital: "싱가포르", cities: ["싱가포르"] },
        "사우디아라비아": { capital: "리야드", cities: ["리야드", "제다", "메카"] },
        "UAE": { capital: "아부다비", cities: ["아부다비", "두바이", "샤르자"] },
        "이스라엘": { capital: "예루살렘", cities: ["예루살렘", "텔아비브", "하이파"] },
        "이란": { capital: "테헤란", cities: ["테헤란", "이스파한", "시라즈"] },
    },
    "유럽": {
        "영국": { capital: "런던", cities: ["런던", "맨체스터", "에든버러", "리버풀"] },
        "프랑스": { capital: "파리", cities: ["파리", "마르세유", "리옹", "니스"] },
        "독일": { capital: "베를린", cities: ["베를린", "뮌헨", "프랑크푸르트", "함부르크"] },
        "이탈리아": { capital: "로마", cities: ["로마", "밀라노", "베네치아", "나폴리", "피렌체"] },
        "스페인": { capital: "마드리드", cities: ["마드리드", "바르셀로나", "세비야", "발렌시아"] },
        "러시아": { capital: "모스크바", cities: ["모스크바", "상트페테르부르크", "노보시비르스크"] },
        "스웨덴": { capital: "스톡홀름", cities: ["스톡홀름", "예테보리", "말뫼"] },
        "노르웨이": { capital: "오슬로", cities: ["오슬로", "베르겐"] },
        "덴마크": { capital: "코펜하겐", cities: ["코펜하겐", "오르후스"] },
        "핀란드": { capital: "헬싱키", cities: ["헬싱키", "에스포"] },
        "폴란드": { capital: "바르샤바", cities: ["바르샤바", "크라쿠프"] },
        "우크라이나": { capital: "키이우", cities: ["키이우", "하르키우"] },
        "네덜란드": { capital: "암스테르담", cities: ["암스테르담", "로테르담", "헤이그"] },
        "벨기에": { capital: "브뤼셀", cities: ["브뤼셀", "안트베르펜"] },
        "스위스": { capital: "베른", cities: ["베른", "취리히", "제네바"] },
        "오스트리아": { capital: "빈", cities: ["빈", "잘츠부르크"] },
        "포르투갈": { capital: "리스본", cities: ["리스본", "포르투"] },
        "그리스": { capital: "아테네", cities: ["아테네", "테살로니키"] },
        "아일랜드": { capital: "더블린", cities: ["더블린", "코크"] },
        "헝가리": { capital: "부다페스트", cities: ["부다페스트"] },
        "체코": { capital: "프라하", cities: ["프라하", "브르노"] },
        "루마니아": { capital: "부쿠레슈티", cities: ["부쿠레슈티"] },
        "터키": { capital: "앙카라", cities: ["앙카라", "이스탄불"] }, 
        "스코틀랜드": { capital: "에든버러", cities: ["에든버러", "글래스고"] }, 
    },
    "북아메리카": {
        "미국": { capital: "워싱턴 D.C.", cities: ["워싱턴 D.C.", "뉴욕", "LA", "시카고", "샌프란시스코", "마이애미", "라스베가스"] },
        "캐나다": { capital: "오타와", cities: ["오타와", "토론토", "밴쿠버", "몬트리올"] },
        "멕시코": { capital: "멕시코시티", cities: ["멕시코시티", "과달라하라", "칸쿤"] },
    },
    "남아메리카": {
        "브라질": { capital: "브라질리아", cities: ["브라질리아", "상파울루", "리우데자네이루"] },
        "아르헨티나": { capital: "부에노스아이레스", cities: ["부에노스아이레스", "코르도바"] },
    },
    "오세아니아": {
        "호주": { capital: "캔버라", cities: ["캔버라", "시드니", "멜버른", "브리즈번"] },
        "뉴질랜드": { capital: "웰링턴", cities: ["웰링턴", "오클랜드", "크라이스트처치"] },
    },
    "아프리카": {
        "이집트": { capital: "카이로", cities: ["카이로", "알렉산드리아"] },
        "남아공": { capital: "프리토리아", cities: ["프리토리아", "케이프타운", "요하네스버그"] },
        "나이지리아": { capital: "아부자", cities: ["아부자", "라고스"] },
        "케냐": { capital: "나이로비", cities: ["나이로비", "몸바사"] },
        "모로코": { capital: "라바트", cities: ["라바트", "카사블랑카"] },
    },
    "마계": {
        "임페리얼 제국": {
            capital: "임페리얼",
            cities: ["임페리얼","눌바리온", "딜리리움", "노크티아", "엔드라실", "세라피엘 몰락지", "카르나쥬", "인페르노스", "베놈가든", "크로노폴", "블러드문", "네크로폴리스"]
        }
    },
    "신계": {
        "신의 성소": { capital: "신의 거처", cities: ["신의 거처"] },
        "양의 기운의 성전": { capital: "태양의 사자의 성전", cities: ["태양의 사자의 성전", "광휘의 사자의 성소", "초화의 사자의 성초", "화염의 사자의 성화", "해수의 사자의 성수전","전격의 사자의 성전"] },
        "음의 기운의 성전": { capital: "월광의 사자의 성", cities: ["월광의 사자의 성", "질풍의 사자의 질풍전", "빙결의 사자의 빙궁", "강철의 사자의 강성", "지령의 사자의 궁궐","암연의 사자의 심연"] },
        "무의 궁": { capital: "무의 궁궐", cities: ["무의 궁궐"] },
    },
    "실바나르": {
        "미르탈 숲연합": { capital: "미르탈", cities: ["미르탈", "실바엔", "노르실"]}},
    "페랄디아": {
        "레오니스 투기국": {capital: "레오폴리스", cities: ["레오폴리스", "하울가르", "그라울"]}},
    "아비살론": {
        "네크로디움 제국": {capital: "말피스", cities: ["말피스", "바르칸","크림존"]}}
    ,
    "기타": {}
};

export interface ClassTierList {
    first: string[];
    second: string[];
    last: string[];
    final: string[];
}

export const HUMANOID_CLASSES_TIERED: Record<string, ClassTierList> = {
    '화염계': {
        first: [
            // 마법 / 비전 / 술사형
            '화염술사', '불꽃 메이지', '이그나이터', '염화 도사', '화염 마도학자', '불꽃 주술사', '잿빛 수련생', '작열의 비전술사', '화염 사제',
            // 검사 / 기사형
            '불꽃 검사', '불꽃 견습기사', '플레임 소드', '염화 전사', '불꽃 기사', '화염 무사', '작열 검사',
            // 궁수 / 사수형
            '화염 사수', '화염 사냥꾼', '불꽃 아처', '작열 투척수', '잿더미 수색꾼', '화염 레인저',
            // 암살 / 닌자형
            '불꽃 닌자', '화염 암살자', '그림자 불꽃살수', '염화 척후병',
            // 격투 / 투사형
            '열혈 격투가', '버닝 스트라이커', '불꽃 투사', '열기 파이터', '화염 권투사', '마그마 피스트',
            // 창술 / 방패 / 가디언형
            '화염 창술사', '화염 가디언', '불꽃 방패병', '불꽃 조련사'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '파이로맨서', '화산의 사제', '염화의 사도', '잿빛 사제', '용의 숨결술사', '열풍의 마술사', '화염 바드', '홍련 마도사', '인페르노 위저드', '작열 비전현자',
            // 검사 / 기사형
            '플레임 나이트', '블레이즈 워리어', '피닉스 기사', '이그니션 세이버', '파이로 나이트', '홍련 검사', '블레이즈 스피어', '불꽃 마검사',
            // 궁수 / 사수형
            '작열 스나이퍼', '인페르노 레인저', '홍련 사수', '불꽃 명사수', '화염 저격수',
            // 암살 / 닌자형
            '홍련의 무용수', '화염의 암살수', '불지옥 간수', '잿빛 섀도우', '염화 살수',
            // 격투 / 투사형
            '버닝 버서커', '용암 스트라이커', '열혈 권사', '작열 격투왕',
            // 창술 / 방패 / 가디언형
            '인페르노 가드', '용암 가디언', '화염 철벽병', '불꽃 성기사'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '염화의 대현자', '폭염의 지배자', '재앙의 불꽃술사', '프로메테우스의 후예', '성화의 신관', '불타는 영혼의 인도자', '작열의 대마도사', '홍련 대주술사',
            // 검사 / 기사형
            '홍련의 성검사', '화룡의 성기사', '성화의 기사', '헬파이어 워커', '염제 군주', '인페르노 워로드', '불사조 성기사', '작열의 심판관',
            // 궁수 / 사수형
            '작열의 궁성', '인페르노 마궁수', '화염의 대사냥꾼', '홍련의 저격신',
            // 암살 / 닌자형
            '잿더미의 살신', '헬파이어 섀도우', '불꽃 심장 암살자',
            // 격투 / 투사형
            '마그마 피스트', '태양 불꽃 마스터', '잿더미의 패왕', '염황 투신',
            // 창술 / 방패 / 가디언형
            '헬파이어 커맨더', '불사조 수호령', '불꽃 방벽의 거신', '화염의 절대자'
        ],
        final: [
            '인페르노 엠페러', '불멸의 불사조왕', '겁화의 신성군주', '태초의 화신', '극염의 성황', '종언의 화염신', 
            '영겁의 헬파이어 로드', '진홍의 패왕', '태양겁화신', '묵시록의 불꽃군주', '천화의 신황', '영원한 불꽃의 지배자', 
            '염황천제', '신화적 홍련주', '불멸의 마그마 신왕'
        ]
    },
    '빙결계': {
        first: [
            // 마법 / 비전 / 술사형
            '빙결사', '한기 마법사', '빙화 사제', '프로스트 메이지', '눈꽃 수련생', '얼음 도사', '서리꽃 수련생', '빙결 마도학자', '냉기 비전술사',
            // 검사 / 기사형
            '서리 검사', '얼음 기사', '프로스트 가드', '빙결 무사', '설원 검사', '서리 견습기사',
            // 궁수 / 사수형
            '서리 사수', '얼음 사냥꾼', '설원의 추적자', '설원 척후병', '서리 아처', '빙결 저격수',
            // 암살 / 닌자형
            '서리 닌자', '빙결 암살자', '눈꽃 살수', '그림자 서리암습자',
            // 격투 / 투사형
            '아이스 브레이커', '동토의 투사', '냉기 격투가', '얼음 권투사', '서리 발차기사',
            // 창술 / 방패 / 가디언형
            '아이스 랜서', '얼음 방패병', '서리 가디언', '얼음 조련사'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '크라이오맨서', '윈터 워록', '블리자드 메이지', '프로즌 오라클', '만년설 수사', '크리스탈 소서러', '서리꽃 정령사', '만년 한기 사제', '빙결 비전현자',
            // 검사 / 기사형
            '글라시아 나이트', '프로즌 하트', '눈폭풍 기사', '얼어붙은 검사', '서리 마검사', '빙하 검객',
            // 궁수 / 사수형
            '극지 탐험가', '빙하 순찰자', '블리자드 스나이퍼', '서리 사냥꾼', '눈보라 사수',
            // 암살 / 닌자형
            '서리 가시 암살자', '빙하 도살자', '화이트워커', '동토의 암살수',
            // 격투 / 투사형
            '냉기 파괴자', '빙하 파이터', '서리 권성', '동토의 스트라이커',
            // 창술 / 방패 / 가디언형
            '눈보라 지휘관', '얼음 장벽의 거신', '영구동토의 파수꾼', '글라시아 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '극광의 대마술사', '빙설의 성자', '절대영도의 신관', '영겁의 한기 마스터', '서리여왕의 대사제', '만년빙 대현자', '빙설 대마도사',
            // 검사 / 기사형
            '서리 용의 후예', '눈보라의 성기사', '빙륜의 집행자', '서리여왕의 수호자', '백은의 빙설주', '혹한의 심판관',
            // 궁수 / 사수형
            '절대영도 사수', '빙하의 저격신', '설원 대사냥꾼', '극광의 마궁수',
            // 암살 / 닌자형
            '냉혹한 심판자', '빙결의 그림자살신', '절대영도 암살귀',
            // 격투 / 투사형
            '빙산 파쇄기', '동토의 패자', '혹한의 투신', '만년빙 권제',
            // 창술 / 방패 / 가디언형
            '빙하의 군주', '만년빙 대제', '블리자드 워로드', '서리 빙벽 절대수호자'
        ],
        final: [
            '영겁의 빙설신왕', '절대영도 황제', '빙제 카이저', '만년빙하의 주재자', '혹한의 신성군주', '천계의 눈보라신', 
            '종언의 빙결대제', '서리용의 신황', '무궁한 빙설의 지배자', '영구동토의 신왕', '빙설천제', '신화적 서리군주'
        ]
    },
    '전격계': {
        first: [
            // 마법 / 비전 / 술사형
            '뇌전술사', '정전기 마법사', '스파크 메이지', '번개 도사', '전하 유도사', '찌릿 사제', '전율 수련생', '뇌명 비전학자', '전격 주술사',
            // 검사 / 기사형
            '번개 검사', '스파크 워리어', '뇌전 기사', '볼트 세이버', '번개 무사', '뇌명 검객',
            // 궁수 / 사수형
            '전격 사냥꾼', '낙뢰 사수', '스톰 체이서', '번개 아처', '전율 레인저',
            // 암살 / 닌자형
            '전기 암살자', '번개 발톱', '그림자 뇌전닌자', '스파크 살수',
            // 격투 / 투사형
            '일렉트로 마스터', '볼트 스트라이커', '번개 투사', '뇌전 격투가', '벼락 권투사',
            // 창술 / 방패 / 가디언형
            '볼트 랜서', '전격 가디언', '뇌명 전사', '번개 방패병'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '스톰 콜러', '템페스트 메이지', '이온 마스터', '전격의 인도자', '뇌운 지배자', '플라즈마 소서러', '전뇌 비전현자', '낙뢰 대도사',
            // 검사 / 기사형
            '라이트닝 로드', '테슬라 나이트', '뇌신 기사', '볼트 슬레이어', '플라즈마 워리어', '번개 마검사',
            // 궁수 / 사수형
            '일렉트릭 레인저', '낙뢰 저격수', '스톰 스나이퍼', '전격 명사수',
            // 암살 / 닌자형
            '전뇌 암살자', '라이트닝 로그', '뇌전 암살수', '스파크 섀도우',
            // 격투 / 투사형
            '썬더 브레이커', '번개 폭발자', '과전류 폭주자', '뇌전 격투왕',
            // 창술 / 방패 / 가디언형
            '썬더볼트 가디언', '벼락의 집행자', '펄스 가디언', '전자기 거신', '라이트닝 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '벽력의 대마술사', '광뢰의 대제', '뇌광의 성자', '천공의 뇌격왕', '전자기 지배자', '뇌전 대현자', '폭풍우 대마도사',
            // 검사 / 기사형
            '뇌룡의 후예', '엠퍼러 스파크', '플라즈마 워로드', '뇌제 군주', '벼락의 성검사', '전격의 성기사',
            // 궁수 / 사수형
            '천벌의 저격신', '광뢰의 마궁수', '폭풍우 대사냥꾼',
            // 암살 / 닌자형
            '극렬의 그림자살신', '천둥 번개 암살귀', '전율의 집행관',
            // 격투 / 투사형
            '뇌신', '전격의 초월자', '극렬의 전황', '벽력 투신', '천둥 권제',
            // 창술 / 방패 / 가디언형
            '천둥의 심판관', '폭풍우의 군주', '벼락의 대집행관', '뇌전 절대방벽'
        ],
        final: [
            '뇌신황제', '영겁의 벽력신', '천벌의 뇌제', '종언의 전격대제', '태초의 벼락신', '천둥폭풍의 지배자', 
            '뇌룡의 신황', '극광뇌전의 패왕', '전자기 신화신', '영원한 번개의 주재자', '뇌성천황', '신화적 뇌제'
        ]
    },
    '대지계': {
        first: [
            // 마법 / 비전 / 술사형
            '스톤 메이지', '진흙 술사', '대지 도사', '토지령 사제', '대지 수련생', '지맥 파수꾼', '암석 비전학자', '대지 주술사',
            // 검사 / 기사형
            '바위 전사', '테라 워커', '지진 전사', '암석 검사', '대지 견습기사', '바위 무사',
            // 궁수 / 사수형
            '모래 사냥꾼', '암석 투척수', '산맥 추적자', '대지 사수', '모래바람 레인저',
            // 암살 / 닌자형
            '모래 암살자', '바위 이빨', '그림자 진흙닌자', '지맥 살수',
            // 격투 / 투사형
            '스톤 크래셔', '록 브레이커', '샌드 워커', '대지 격투가', '암반 파쇄자', '바위 권투사',
            // 창술 / 방패 / 가디언형
            '어스 가디언', '바위 방패병', '대지 정령병', '대지 랜서'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '지오맨서', '가이아 프리스트', '지각 변동술사', '대지 모신 사제', '토지령 전도사', '화강암 골렘술사', '지열 마스터', '대지 비전현자',
            // 검사 / 기사형
            '테라 나이트', '바위 성벽 기사', '암석 거인 기사', '대륙 파쇄자', '대지 마검사', '화강암 소드맨',
            // 궁수 / 사수형
            '모래 폭풍 저격수', '산맥의 감시자', '대지 명사수', '암석 스나이퍼',
            // 암살 / 닌자형
            '사막의 모래군주', '진흙 슬라임 마스터', '지저 암살수', '암반 섀도우',
            // 격투 / 투사형
            '그라운드 셰이커', '산맥의 심장', '대지의 조각가', '지각 권사', '바위 투신',
            // 창술 / 방패 / 가디언형
            '다이아몬드 가드', '협곡의 감시자', '지각 변동의 사도', '가이아 랜서', '반석 수호자'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '대지의 현자', '가이아의 거신사제', '반석의 성자', '지저의 대군주', '대지 대마도사', '지열 대주술사',
            // 검사 / 기사형
            '마운틴 KING', '산맥의 패왕', '황금바위 성기사', '가이아 워로드', '대륙의 성검사', '화강암의 제왕',
            // 궁수 / 사수형
            '모래폭풍의 지배자', '산맥의 대사냥꾼', '대지의 저격신',
            // 암살 / 닌자형
            '지저의 그림자살신', '사막 암살제', '암석 잠행자',
            // 격투 / 투사형
            '언더그라운드 킹', '대지진의 지배자', '지각의 심판관', '반석 투신', '대지 권성',
            // 창술 / 방패 / 가디언형
            '다이아몬드 로드', '대륙의 수호신', '바위 성벽 대군주', '가이아 수호신'
        ],
        final: [
            '가이아 엠페러', '대지 신황제', '영겁의 반석신', '천붕지괴의 지배자', '태초의 대지신', '종언의 산맥제왕', 
            '황금대륙의 신황', '불멸의 테라 로드', '지저심연의 신왕', '만고불변의 대지군주', '대지천황', '신화적 가이아신'
        ]
    },
    '질풍계': {
        first: [
            // 마법 / 비전 / 술사형
            '에어로맨서', '바람 메이지', '기류 수련생', '산들바람 치유사', '바람 도사', '기류 유도사', '폭풍 비전학자', '바람 주술사',
            // 검사 / 기사형
            '바람 검사', '윈드 세이버', '에어 슬라이서', '비행 전사', '질풍 견습기사', '돌풍 검객',
            // 궁수 / 사수형
            '스카이 헌터', '돌풍 사냥꾼', '돌풍 사수', '창공 척후병', '순풍 수색자', '바람 아처',
            // 암살 / 닌자형
            '윈드 워커', '바람 닌자', '클라우드 워커', '그림자 바람살수', '기류 암살자',
            // 격투 / 투사형
            '게일 스트라이커', '스톰 체이서', '질풍 격투가', '돌풍 권투사', '선풍 투사',
            // 창술 / 방패 / 가디언형
            '에어 가디언', '바람 방패병', '기류 랜서', '창공 가디언'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '태풍의 전령', '기류 제어사', '바람의 정령술사', '난기류 마스터', '기류의 도사', '폭풍 소서러', '질풍 비전현자', '선풍 사제',
            // 검사 / 기사형
            '제피로스 나이트', '허리케인 로드', '윈드 블레이더', '제피로스의 전사', '폭풍 마검사', '진공 검성',
            // 궁수 / 사수형
            '고공 저격수', '창공의 사수', '폭풍 추적자', '스톰 스나이퍼', '질풍 명사수',
            // 암살 / 닌자형
            '바람의 무희', '진공의 날개', '선풍 암살자', '구름의 방랑자', '질풍 섀도우',
            // 격투 / 투사형
            '질풍 노도 용사', '폭풍 파이터', '기류 스트라이커', '선풍 권사',
            // 창술 / 방패 / 가디언형
            '스톰 랜서', '태풍의 눈 가디언', '하늘의 파수꾼', '창공의 방벽병'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '천공의 대마술사', '바람의 성자', '폭풍의 대사도', '바람의 절대자', '태풍 대현자', '허리케인 대도사',
            // 검사 / 기사형
            '질풍의 성검사', '허리케인 마스터', '태풍의 대군주', '제피로스 군주', '스톰 워로드', '창공의 성기사',
            // 궁수 / 사수형
            '창공의 저격신', '폭풍의 대사냥꾼', '질풍의 마궁수',
            // 암살 / 닌자형
            '진공의 심판관', '비상의 초월자', '폭풍 암살귀', '그림자 바람살신',
            // 격투 / 투사형
            '폭풍의 눈', '창공의 패자', '태풍의 지배자', '질풍 투신', '천공 권제',
            // 창술 / 방패 / 가디언형
            '천공 랜서로드', '태풍 절대수호자', '창공 방벽 거신'
        ],
        final: [
            '천공의 질풍신황', '영겁의 폭풍제왕', '바람의 신황', '제피로스 엠페러', '태초의 창공신', '종언의 허리케인 로드', 
            '무한비상의 지배자', '천계풍신', '절대기류의 신왕', '영원한 바람의 주재자', '질풍천황', '신화적 폭풍신'
        ]
    },
    '해수계': {
        first: [
            // 마법 / 비전 / 술사형
            '아쿠아 맨서', '워터 워록', '해수 도사', '물방울 치유사', '물결 메이지', '수류 조종사', '해류 수련생', '물결 수련생', '심해 비전학자',
            // 검사 / 기사형
            '물결 검사', '아쿠아 나이트', '물보라 전사', '해류 기사', '바다 무사', '물결 검객',
            // 궁수 / 사수형
            '파도 사냥꾼', '조수 사수', '잠수 척후병', '해변 정찰병', '물보라 아처',
            // 암살 / 닌자형
            '해양 닌자', '물결 암살자', '심해 살수', '안개 닌자',
            // 격투 / 투사형
            '타이드 워리어', '바다 격투가', '파도 파이터', '물보라 권투사', '해류 스트라이커',
            // 창술 / 방패 / 가디언형
            '마린 가드', '리버 가디언', '파도 방패병', '아쿠아 랜서'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '하이드로맨서', '소용돌이 마법사', '심해의 사제', '파도타기 도사', '조수 간만의 지배자', '해수 소서러', '심해 비전현자', '창해 사제',
            // 검사 / 기사형
            '오션 나이트', '웨이브 마스터', '마린 커맨더', '해마 기사', '심해 마검사', '파도 검성',
            // 궁수 / 사수형
            '해류 추적자', '심해 잠수사', '마린 스나이퍼', '파도 사냥꾼', '창해 사수',
            // 암살 / 닌자형
            '안개 낀 바다 암살자', '아쿠아 리퍼', '심해 도살자', '물결 섀도우',
            // 격투 / 투사형
            '쓰나미 렉커', '해일 파괴자', '심해 격투왕', '파도 권사',
            // 창술 / 방패 / 가디언형
            '심해의 감시자', '산호초 가디언', '고래 수호령', '포세이돈의 사도', '해저 유적 감시자', '오션 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '창해의 성자', '심해의 대현자', '청염의 해신관', '소용돌이의 절대자', '대양 대마도사', '해양 대주술사',
            // 검사 / 기사형
            '대해적 군주', '쓰나미 마스터', '대양의 성기사', '타이드 워로드', '포세이돈의 후예', '창해의 성검사',
            // 궁수 / 사수형
            '해양의 대사냥꾼', '심해의 저격신', '대양의 마궁수',
            // 암살 / 닌자형
            '격류의 심판관', '심해 암살귀', '창해 그림자살신',
            // 격투 / 투사형
            '해신', '대양의 심장', '폭풍우의 해신', '심해의 지배자', '해양의 대군주', '해룡 투신',
            // 창술 / 방패 / 가디언형
            '대양 수호령주', '심해 절대방벽병', '포세이돈 창술로드'
        ],
        final: [
            '포세이돈 엠페러', '영겁의 대해신', '창해의 신황제', '심해제왕 카이저', '태초의 대양신', '종언의 쓰나미 로드', 
            '무한격류의 지배자', '해신천제', '대양의 신화군주', '영원한 파도의 주재자', '해수천황', '신화적 해양신'
        ]
    },
    '광휘계': {
        first: [
            // 마법 / 비전 / 술사형
            '프리스트', '루미너스 메이지', '빛의 수습사제', '신성 도사', '새벽의 수련생', '성화 봉송자', '은혜의 수습생', '광휘 비전학자', '빛의 주술사',
            // 검사 / 기사형
            '성기사', '빛의 검사', '홀리 나이트', '빛의 전사', '정화 견습기사', '광채 검객',
            // 궁수 / 사수형
            '광휘 사냥꾼', '신성 아처', '광채 사수', '찬란한 척후병', '빛의 레인저',
            // 암살 / 닌자형
            '빛의 닌자', '새벽 암살자', '그림자 정화살수', '광휘 살수',
            // 격투 / 투사형
            '광휘 격투가', '빛의 권투사', '성광 파이터', '찬란한 스트라이커',
            // 창술 / 방패 / 가디언형
            '빛의 방패', '선라이트 가디언', '신성 랜서', '광휘 가디언'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '선라이트 프리스트', '태양광 사제', '정화의 성녀', '광채의 마술사', '천상의 선율', '빛의 연금술사', '광휘 비전현자', '신성 대도사',
            // 검사 / 기사형
            '라이트 브링어', '세인트 워리어', '천상의 빛 기사', '미카엘의 성검', '황금날개 기사', '광휘 마검사',
            // 궁수 / 사수형
            '광휘 명사수', '신성 스나이퍼', '새벽의 레인저', '천상 사수',
            // 암살 / 닌자형
            '신성 집행관', '정화의 불꽃', '빛의 인도자', '광휘 섀도우',
            // 격투 / 투사형
            '세인트 브레이커', '광휘 권사', '천상 격투왕', '성광 스트라이커',
            // 창술 / 방패 / 가디언형
            '디바인 가디언', '홀리 랜서', '엔젤릭 가디언', '세라핌 가드', '찬란한 보좌관', '성스러운 심판관'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '대주교', '치천사의 성자', '천상의 대마술사', '정화의 성황', '새벽의 대사도', '신성 광휘 마스터', '광휘 대현자',
            // 검사 / 기사형
            '새벽의 기사', '심판의 성검사', '영광의 기사단장', '디바인 워로드', '천상 성기사',
            // 궁수 / 사수형
            '광휘의 저격신', '천상의 마궁수', '신성 대사냥꾼',
            // 암살 / 닌자형
            '빛의 절대자', '정화의 집행관', '새벽 암살귀',
            // 격투 / 투사형
            '신의 숨결', '세라핌 로드', '광휘의 대군주', '성광 투신', '천상 권제',
            // 창술 / 방패 / 가디언형
            '광휘의 사도', '치천사 수호거신', '절대성광 방벽사도'
        ],
        final: [
            '세라핌 엠페러', '대천사 미카엘의 화신', '영겁의 성광신', '천상의 광휘대제', '태초의 신성황', '종언의 구원자', 
            '무한광휘의 지배자', '성제 루미너스', '광휘천황', '영원한 빛의 주재자', '신화적 광휘주', '천계의 구원대제'
        ]
    },
    '암흑계': {
        first: [
            // 마법 / 비전 / 술사형
            '네크로맨서', '워록', '암흑 메이지', '그림자 도사', '보이드 수습생', '영혼 포획자', '어둠의 수련생', '흑염 수련생', '심연 비전학자',
            // 검사 / 기사형
            '다크 나이트', '그림자 검사', '칠흑의 전사', '심연 견습기사', '어둠 무사', '흑염 검객',
            // 궁수 / 사수형
            '어둠 사냥꾼', '암흑 사수', '명계 척후병', '그림자 아처', '심연 레인저',
            // 암살 / 닌자형
            '그림자 암살자', '섀도우 워커', '그림자 닌자', '어둠 살수', '심연 잠행자',
            // 격투 / 투사형
            '심연 격투가', '어둠 권투사', '그림자 파이터', '칠흑 스트라이커',
            // 창술 / 방패 / 가디언형
            '어둠 방패병', '나이트메어 가디언', '심연 랜서', '암흑 가디언'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '어비스 메이지', '그림자 소환사', '공허의 사제', '영혼 수확자', '다크 아포스텔', '그림자 술사', '명계 비전현자', '암흑 대도사',
            // 검사 / 기사형
            '데스 나이트', '공포의 기사', '지옥 불꽃 전사', '명계의 인도자', '심연 마검사', '칠흑 소드맨',
            // 궁수 / 사수형
            '밤의 추적자', '심연 스나이퍼', '어둠 명사수', '그림자 레인저',
            // 암살 / 닌자형
            '보이드 리퍼', '심연 도살자', '나이트메어 워커', '어둠 속의 눈', '그림자 발자국', '타락한 천사',
            // 격투 / 투사형
            '어둠의 맹약자', '심연 브레이커', '그림자 권사', '칠흑 투신',
            // 창술 / 방패 / 가디언형
            '보이드 가디언', '어비스 가디언', '나이트메어 랜서', '공허의 방패병'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '나락의 전도사', '죽음의 성자', '암흑의 대마술사', '공허의 대현자', '타락의 대집행관', '명계 대마도사', '심연 대주술사',
            // 검사 / 기사형
            '심연의 감시자', '심연의 성검사', '어비스 워로드', '명계의 대군주', '칠흑 성기사',
            // 궁수 / 사수형
            '심연의 저격신', '어둠의 대사냥꾼', '그림자 마궁수',
            // 암살 / 닌자형
            '나이트메어 로드', '심연의 심판관', '어둠의 절대자', '공허 암살귀',
            // 격투 / 투사형
            '나락의 지배자', '망령의 지배자', '그림자 대군주', '심연 권제', '명계 투신',
            // 창술 / 방패 / 가디언형
            '명계 절대수호군주', '심연 방벽 거신', '공허 랜서로드'
        ],
        final: [
            '하데스 엠페러', '영겁의 심연신왕', '죽음의 신황제', '암황제 카이저', '태초의 공허신', '종언의 암흑대제', 
            '무한암흑의 지배자', '명계천제', '심연혼돈의 신왕', '영원한 어둠의 주재자', '암흑천황', '신화적 심연신'
        ]
    },
    '무기강화계': {
        first: [
            // 마법 / 비전 / 술사형
            '무기 도사', '무기 연마사', '연마 수련생', '도검 술사', '병기 마법사', '무기 인챈터', '비전 연마학자',
            // 검사 / 기사형
            '견습 검사', '도검 수련생', '단검 전사', '쌍검 수련생', '도끼 전사', '망치 전사', '무구 전사',
            // 궁수 / 사수형
            '궁술 수련생', '궁수', '쇠뇌 사수', '투척 수련생', '무구 사냥꾼', '무기 척후병',
            // 암살 / 닌자형
            '단검 암살자', '비수 전사', '그림자 무기살수', '투검 암살자',
            // 격투 / 투사형
            '병기 파이터', '강철 격투가', '너클 파이터', '무기 권투사',
            // 창술 / 방패 / 가디언형
            '초급 창술사', '창술 견습기사', '방패 전사', '기어 워리어'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '무기 혼령술사', '무기 연금술사', '도검 명인술사', '병기 비전현자', '마법 무기 제련사',
            // 검사 / 기사형
            '소드 마스터', '액스 브레이커', '블레이드 댄서', '강철의 검성', '환영검사', '쌍검의 명수', '웨폰 스미스 나이트',
            // 궁수 / 사수형
            '보우 마스터', '투창 명수', '투척의 달인', '중화기 지배자', '병기 스나이퍼',
            // 암살 / 닌자형
            '무구 파괴자', '비도 살수', '무기술 암살자', '그림자 블레이더',
            // 격투 / 투사형
            '병기 전문가', '만능 무기 전사', '무기술 권사', '무구 스트라이커',
            // 창술 / 방패 / 가디언형
            '스피어 로드', '쉴드 가디언', '아스날 커맨더', '철벽 병기 가디언'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '무기신의 사도', '전설의 대장장이 전사', '무기의 극의자', '강철의 성자', '병기 대마술사',
            // 검사 / 기사형
            '검성', '웨폰 마스터', '아스날 로드', '대검의 지배자', '도끼의 폭군', '웨폰 워로드', '백전노장 무인',
            // 궁수 / 사수형
            '활의 신', '중화기 명사수', '병기창 저격신', '투창의 정점',
            // 암살 / 닌자형
            '무구 암살귀', '백인대장 살신', '무기술 집행관',
            // 격투 / 투사형
            '전쟁의 거장', '강철의 의지', '백인대장 전신', '병기 투신',
            // 창술 / 방패 / 가디언형
            '창의 정점', '무구 수호자', '병기창 지휘관', '병기 마스터'
        ],
        final: [
            '만병지왕 검제', '무신황제', '영겁의 병기신', '신화적 웨폰로드', '태초의 무기신', '종언의 도검신황', 
            '무궁무진의 무구제왕', '천하제일 무성', '만병지존', '영원한 검신의 주재자', '무기천황', '신화적 무신주'
        ]
    },
    '신체강화계': {
        first: [
            // 마법 / 비전 / 술사형
            '기공 수련생', '단전 수련생', '신체 술사', '투기 마법사', '기운 도사', '내공 수련생', '신체 비전학자',
            // 검사 / 기사형
            '돌격 전사', '단련된 전사', '괴력 전사', '강철 근육 기사', '신체 전사',
            // 궁수 / 사수형
            '타격 사수', '초인 사냥꾼', '강완 궁수', '투석 사수',
            // 암살 / 닌자형
            '체술 닌자', '순보 암살자', '그림자 체술살수', '야수 잠행자',
            // 격투 / 투사형
            '무투가', '격투 수련생', '권투사', '강철 근육', '신체 수련생', '투기 파이터', '아이언 바디', '불굴의 투사', '주먹 파이터', '발차기 명수', '야수 무투가', '투혼 수련생', '초인 지망생', '피지컬 워리어',
            // 창술 / 방패 / 가디언형
            '육체 방패병', '강철 신체 가디언', '괴력 창술사'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '기공 마스터', '투기 방출사', '신체 개조술사', '내공 대도사', '기운 비전현자',
            // 검사 / 기사형
            '버서커', '거인 학살자', '강철 권풍 검객', '투지의 전사',
            // 궁수 / 사수형
            '하이퍼 피지컬 사수', '강완 스나이퍼', '괴력 명사수',
            // 암살 / 닌자형
            '야수형 무투가', '신속 암살수', '체술 살인귀',
            // 격투 / 투사형
            '스트라이커', '마샬 아티스트', '피지컬 브레이커', '타이탄 포스', '자이언트 킬러', '투혼의 챔피언', '타이탄 브레이커', '금강불괴 무인', '근력 폭발 전사', '근육 거신', '투지의 화신', '한계 돌파자',
            // 창술 / 방패 / 가디언형
            '금강 방벽 거신', '타이탄 가디언', '괴력 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '육체신관', '불굴의 성자', '기공 대현자', '투기 대도사', '내공 절대자',
            // 검사 / 기사형
            '혈전의 용사', '불사신 기사', '피지컬 워로드', '초인 검객',
            // 궁수 / 사수형
            '강완의 저격신', '초인 대사냥꾼',
            // 암살 / 닌자형
            '반사신경의 달인', '그림자 투신살신', '초인 암살귀',
            // 격투 / 투사형
            '투신', '그랜드 마스터', '권성', '무극의 달인', '파괴의 주먹', '신체 변형자', '초인적인 힘', '투기 마스터', '무술의 극의', '지구력의 화신', '금강야차 투왕', '패황 권신', '투혼 대군주',
            // 창술 / 방패 / 가디언형
            '금강불괴 거신', '투혼 절대수호신', '타이탄 워로드'
        ],
        final: [
            '극의투신 황제', '금강불괴 천황', '영겁의 패황신', '신화적 투신제', '태초의 육체신', '종언의 권황대제', 
            '무한체력의 지배자', '천하무쌍 무신', '초월신체 대제', '영원한 투혼의 주재자', '신체천황', '신화적 권신'
        ]
    },
    '태양계': {
        first: [
            // 마법 / 비전 / 술사형
            '솔라 메이지', '태양광 사제', '햇살 치유사', '빛살 도사', '태양 수련생', '여명 술사', '태양 비전학자', '일출 주술사',
            // 검사 / 기사형
            '태양의 기사', '던브링어', '썬 나이트', '샤이닝 워리어', '일출 전사', '태양 검사',
            // 궁수 / 사수형
            '태양 사냥꾼', '여명 사수', '새벽 척후병', '태양 수색자', '솔라 아처',
            // 암살 / 닌자형
            '태양 닌자', '일광 살수', '그림자 태양암살자',
            // 격투 / 투사형
            '솔라 파이터', '태양 격투가', '일출 권투사', '태양열 스트라이커',
            // 창술 / 방패 / 가디언형
            '헬리오스 가드', '솔라 가디언', '데이 브레이커', '태양 방패병', '태양 랜서'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '태양신관', '태양 광풍 사제', '일출의 예언자', '태양핵 마술사', '태양의 숨결 사제', '솔라 소서러', '태양 비전현자',
            // 검사 / 기사형
            '썬 라이트 세이버', '일식의 기사', '태양 마차 기사', '불멸의 태양전사', '빛나는 태양의 아들', '솔라 블레이더',
            // 궁수 / 사수형
            '솔라 윈드 스나이퍼', '여명의 명사수', '태양 레인저', '일광 사수',
            // 암살 / 닌자형
            '태양 눈멀이 암살자', '코로나 리퍼', '새벽의 전령', '솔라 섀도우',
            // 격투 / 투사형
            '헬리오스 버서커', '타오르는 권좌 지킴이', '태양 스트라이커', '일출 권사',
            // 창술 / 방패 / 가디언형
            '래디언트 로드', '낮의 수호자', '태양의 문지기', '정오의 심판관', '솔라 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '태양의 대성자', '태양의 축복 사제', '태양의 전령', '태양 대마도사', '일륜 대현자', '광명의 인도자',
            // 검사 / 기사형
            '태양의 화신', '태양왕 군주', '헬리오스 마스터', '여명의 대군주', '태양 성기사', '솔라 성검사',
            // 궁수 / 사수형
            '정오의 저격신', '태양의 대사냥꾼', '솔라 마궁수',
            // 암살 / 닌자형
            '태양의 심판자', '빛의 폭군', '태양 암살귀',
            // 격투 / 투사형
            '광휘의 지배자', '솔라 플레어 마스터', '태양의 정점', '정오의 절대자', '태양 투신',
            // 창술 / 방패 / 가디언형
            '태양의 수호령', '태양 방벽 거신', '헬리오스 워로드'
        ],
        final: [
            '헬리오스 엠페러', '태양신왕 라의 화신', '영겁의 태양황제', '태초의 일륜신', '종언의 솔라 로드', '무한태양의 지배자', 
            '태양천제', '광휘태양의 신황', '불멸의 일광신왕', '영원한 태양의 주재자', '태양신황', '신화적 태양제'
        ]
    },
    '월광계': {
        first: [
            // 마법 / 비전 / 술사형
            '은빛 도사', '달빛 치유사', '월광 수련생', '은월 수련생', '밤하늘 유랑자', '달빛 메이지', '월식 술사', '월광 비전학자',
            // 검사 / 기사형
            '달빛 검사', '문 나이트', '크레센트 블레이드', '월광 무사', '은월 검객',
            // 궁수 / 사수형
            '달빛 사냥꾼', '초승달 사수', '밤의 척후병', '월광 아처', '달빛 레인저',
            // 암살 / 닌자형
            '달의 그림자', '루나틱 어쌔신', '나이트 스토커', '월광 닌자', '문 댄서',
            // 격투 / 투사형
            '루나 파이터', '월영 격투가', '달빛 권투사', '은월 스트라이커',
            // 창술 / 방패 / 가디언형
            '루나 가디언', '트와일라잇 워커', '은월 방패병', '월광 랜서'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '월광의 무녀', '이클립스 메이지', '보름달 사제', '월식의 마법사', '월광 전도사', '달의 눈동자', '은하수의 방랑자', '달빛 소용돌이', '밤의 찬가', '월광 비전현자',
            // 검사 / 기사형
            '월하의 무사', '은빛 달의 후예', '초승달 낫잡이', '달빛 마검사', '월광 소드맨',
            // 궁수 / 사수형
            '차가운 달빛 사수', '월광 스나이퍼', '밤의 사냥꾼', '은월 명사수',
            // 암살 / 닌자형
            '초승달 암살자', '루나 섀도우', '밤의 갈망자', '월광 살수',
            // 격투 / 투사형
            '월광의 인도자', '월광곡 연주자', '은월 권사', '달빛 격투왕',
            // 창술 / 방패 / 가디언형
            '달의 이면 가디언', '달의 성역 수호자', '월광 랜서로드', '은월 방패기사'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '달의 마법사', '월식의 사도', '달의 계시자', '달의 성자', '월광 대마도사', '은월 대현자', '달빛의 인도자',
            // 검사 / 기사형
            '은빛 달의 기사', '월영의 성검사', '셀레네 마스터', '월광 성기사', '달의 수호기사',
            // 궁수 / 사수형
            '달빛의 저격신', '은월 대사냥꾼', '초승달 마궁수',
            // 암살 / 닌자형
            '달의 지배자', '월광의 암살자', '밤의 지배자', '월광 암살귀',
            // 격투 / 투사형
            '월광의 정점', '월광의 절대자', '은월 투신', '달빛 권제',
            // 창술 / 방패 / 가디언형
            '달의 수호자', '달의 파수꾼', '월광 방벽 거신', '셀레네 워로드'
        ],
        final: [
            '셀레네 엠페러', '달의 여신 아르테미스의 화신', '영겁의 월광신왕', '태초의 은월신', '종언의 루나 로드', 
            '무한월광의 지배자', '월황천제', '은빛달의 신황', '불멸의 월영신왕', '영원한 달빛의 주재자', '월광신황', '신화적 월광제'
        ]
    },
    '초화계': {
        first: [
            // 마법 / 비전 / 술사형
            '드루이드', '플로라 메이지', '블로섬 힐러', '새싹 치유사', '초화 도사', '꽃의 마법사', '자연 수련생', '풀잎 수련생', '식물 조종사', '초화 비전학자',
            // 검사 / 기사형
            '풀잎 검사', '네이처 나이트', '자연 전사', '초화 견습기사', '숲의 검객',
            // 궁수 / 사수형
            '포레스트 레인저', '숲의 사냥꾼', '가시 사수', '숲의 척후병', '초화 아처',
            // 암살 / 닌자형
            '잎사귀 암살자', '덩굴 채찍술사', '그림자 숲살수', '자연 잠행자',
            // 격투 / 투사형
            '자연 격투가', '풀잎 권투사', '초화 파이터', '숲의 스트라이커',
            // 창술 / 방패 / 가디언형
            '바인 바인더', '우드 가디언', '녹색 방패병', '초화 랜서'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '드라이어드의 연인', '숲의 대장로', '녹색의 사도', '뿌리 깊은 현자', '고대 식물 제어자', '숲의 치유사', '엽록소 강화사', '생명의 정원사', '초화의 성자', '자연 비전현자',
            // 검사 / 기사형
            '그린 워든', '가시 덩굴 전사', '숲의 정령 기사', '초화 마검사', '자연 소드맨',
            // 궁수 / 사수형
            '포레스트 로드', '세계수의 파수꾼', '자연 저격수', '숲의 명사수',
            // 암살 / 닌자형
            '숲의 망령', '야생의 속삭임', '가시 암살수', '초화 섀도우',
            // 격투 / 투사형
            '자연의 분노', '대지의 아들', '자연의 심장', '초화 권사', '숲의 격투왕',
            // 창술 / 방패 / 가디언형
            '자연의 수호자', '세계수의 파수꾼', '녹음의 가디언', '세계수 랜서'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '대지의 정령술사', '생명의 마법사', '세계수의 성자', '생명의 대현자', '정령왕의 사도', '초화 대마도사', '대지의 노래',
            // 검사 / 기사형
            '자연의 성검사', '녹음의 대군주', '세계수 성기사', '초화 워로드',
            // 궁수 / 사수형
            '숲의 대사냥꾼', '자연의 저격신', '초화 마궁수',
            // 암살 / 닌자형
            '자연의 파괴자', '숲의 파수꾼', '자연 암살귀',
            // 격투 / 투사형
            '숲의 지배자', '초화의 정점', '초화의 절대자', '자연 투신', '생명 권제',
            // 창술 / 방패 / 가디언형
            '숲의 수호령', '자연의 인도자', '세계수 절대방벽병'
        ],
        final: [
            '세계수 엠페러', '대자연의 신 가이아의 후예', '영겁의 생명신왕', '태초의 초화신', '종언의 포레스트 로드', 
            '무한생명의 지배자', '녹황천제', '자연생명의 신황', '불멸의 수목신왕', '영원한 자연의 주재자', '초화신황', '신화적 자연주'
        ]
    },
    '강철계': {
        first: [
            // 마법 / 비전 / 술사형
            '금속 도사', '메탈 메이지', '금속 수련생', '강철 수련생', '강철 조련사', '철심 마법사', '강철 비전학자',
            // 검사 / 기사형
            '스틸 워리어', '강철 검사', '철벽 전사', '금속 견습기사', '강철 무사',
            // 궁수 / 사수형
            '철갑 사냥꾼', '강철 사수', '철혈 척후병', '강철 아처', '메탈 레인저',
            // 암살 / 닌자형
            '강철 닌자', '금속 암살자', '그림자 강철살수',
            // 격투 / 투사형
            '메탈 스트라이커', '철괴 격투가', '철판 파이터', '스틸 파이팅', '강철 권투사',
            // 창술 / 방패 / 가디언형
            '아이언 가드', '합금 방패병', '스틸 랜서', '철벽 파수꾼'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '메탈 워록', '철심술사', '강철 골렘 마스터', '금속의 사도', '메탈릭 바드', '강철 비전현자', '합금 대도사',
            // 검사 / 기사형
            '아이언 나이트', '스틸 마스터', '철혈의 기사', '메탈릭 세이버', '기계화 전사', '강철 마검사',
            // 궁수 / 사수형
            '티타늄 레인저', '강철 포병', '메탈 스나이퍼', '철갑 명사수',
            // 암살 / 닌자형
            '철갑 브레이커', '불멸의 철갑병', '강철 암살수', '스틸 섀도우',
            // 격투 / 투사형
            '중장갑 디스트로이어', '합금 거신 파이터', '강철 권사', '메탈릭 스트라이커',
            // 창술 / 방패 / 가디언형
            '티타늄 가디언', '강철 요새병', '합금 거신', '강철 성벽 수호자', '철의 심판관', '스틸 랜서로드'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '합금의 대마술사', '기계신의 사도', '철의 대현자', '강철 대마도사', '메탈 대도사',
            // 검사 / 기사형
            '철혈의 성기사', '메탈릭 로드', '불굴의 강철제왕', '스틸 워로드', '강철 성검사',
            // 궁수 / 사수형
            '티타늄 저격신', '강철 대포병장', '철갑 대사냥꾼',
            // 암살 / 닌자형
            '강철의 심판자', '기계 암살귀', '스틸 그림자살신',
            // 격투 / 투사형
            '티타늄 타이탄', '철벽의 대군주', '강철의 절대자', '메탈 마스터', '강철 투신', '철권제',
            // 창술 / 방패 / 가디언형
            '강철의 군주', '불멸의 요새왕', '강철의 성자', '합금 방벽 절대거신'
        ],
        final: [
            '강철신황제', '영겁의 불멸철신', '티타늄 카이저', '신화적 기계대제', '태초의 금속신', '종언의 강철로드', 
            '무한철갑의 지배자', '철황천제', '금속강철의 신황', '영원한 강철의 주재자', '강철천황', '신화적 철성주'
        ]
    },
    '일반': {
        first: [
            // 마법 / 비전 / 술사형
            '수습 마법사', '수련 사제', '방랑 도사', '초보 술사', '견습 비전술사', '수습 치유사',
            // 검사 / 기사형
            '초보 전사', '견습 기사', '방랑 검사', '자유 전사', '검술 수련생',
            // 궁수 / 사수형
            '방랑 사냥꾼', '견습 궁수', '초보 사수', '척후병', '자경단원',
            // 암살 / 닌자형
            '도적', '견습 닌자', '방랑 살수', '수습 암살자',
            // 격투 / 투사형
            '초보 격투가', '방랑 파이터', '수련 투사', '마을 청년', '견습 모험가', '수련생', '용병 지망생', '방랑자', '수습 모험가',
            // 창술 / 방패 / 가디언형
            '견습 창술사', '초보 방패병', '견습 가디언'
        ],
        second: [
            // 마법 / 비전 / 술사형
            '원소 마법사', '비전술사', '숙련 사제', '방랑 도사', '전투 마도사', '숙련 비전학자',
            // 검사 / 기사형
            '정예 전사', '노련한 기사', '자유 기사', '방랑 무사', '돌격대원', '마검사', '정예 검객',
            // 궁수 / 사수형
            '숙련된 사냥꾼', '명사수', '정예 척후병', '특공대 사수',
            // 암살 / 닌자형
            '그림자 방랑자', '특공대원', '은밀한 살수', '특수 암살자',
            // 격투 / 투사형
            '숙련 격투가', '전투 마스터', '숙련된 모험가', '베테랑 용병', '특수 경호원', '베테랑 가디언', '투기장 전사',
            // 창술 / 방패 / 가디언형
            '정예 창술사', '철벽 방패병', '베테랑 수호자'
        ],
        last: [
            // 마법 / 비전 / 술사형
            '대현자', '전설의 마도사', '영웅의 사도', '자유의 성자', '비전 대마술사',
            // 검사 / 기사형
            '영웅 기사', '그랜드 소드맨', '무쌍 전사', '전쟁 영웅', '불패의 성검사',
            // 궁수 / 사수형
            '아크 레인저', '전설의 명사수', '영웅 대사냥꾼',
            // 암살 / 닌자형
            '영웅 심판관', '그림자 살신', '전설의 암살귀',
            // 격투 / 투사형
            '무극 무투가', '전설의 용병왕', '백전노장 모험가', '전쟁의 지휘관', '대모험가', '전설의 영웅', '불패의 전사', '모험가 길드마스터', '방랑의 군주', '영웅의 수호자',
            // 창술 / 방패 / 가디언형
            '전설의 창성', '영웅 방벽 수호자', '그랜드 가디언'
        ],
        final: [
            '초월적 모험신왕', '불멸의 영웅황제', '신화의 모험가', '태초의 무쌍신', '종언의 대영웅', '무한영웅의 지배자', 
            '천하제일 영웅신', '만고불멸의 대제', '신화적 방랑신', '영원한 모험의 주재자', '영웅천황', '신화적 대영웅'
        ]
    }
};

/**
 * 신력 명칭을 표준 키(예: '화염계', '빙결계', '일반')로 변환하는 헬퍼 함수
 */
export const getShinryokuConstantKey = (shinryokuType?: string): string => {
    if (!shinryokuType || shinryokuType === '미개방' || shinryokuType === '무' || shinryokuType === '일반') {
        return '일반';
    }
    const clean = shinryokuType.trim();
    if (HUMANOID_CLASSES_TIERED[clean]) return clean;

    const withGye = clean.endsWith('계') ? clean : `${clean}계`;
    if (HUMANOID_CLASSES_TIERED[withGye]) return withGye;

    const baseName = clean.replace('계', '');
    const aliasMap: Record<string, string> = {
        '태양': '태양계',
        '화염': '화염계',
        '광휘': '광휘계',
        '월광': '월광계',
        '전격': '전격계',
        '지령': '대지계',
        '대지': '대지계',
        '질풍': '질풍계',
        '빙결': '빙결계',
        '해수': '해수계',
        '강철': '강철계',
        '암흑': '암흑계',
        '암연': '암흑계',
        '초화': '초화계',
        '무기강화': '무기강화계',
        '신체강화': '신체강화계',
    };
    return aliasMap[baseName] || '일반';
};

/**
 * 신력 계통 및 티어(퍼스트, 세컨드, 라스트, 파이널), 전투 계열(combatStyle)에 부합하는 클래스명 1개를 선택하는 헬퍼 함수
 */
export const getHumanoidClassByTier = (
    shinryokuType: string | undefined, 
    tier: ClassTier | number | string,
    combatStyle?: string
): string => {
    const key = getShinryokuConstantKey(shinryokuType);
    const tierData = HUMANOID_CLASSES_TIERED[key] || HUMANOID_CLASSES_TIERED['일반'];

    let tierKey: 'first' | 'second' | 'last' | 'final' = 'first';
    if (tier === ClassTier.FINAL || tier === 4 || tier === 'FINAL' || tier === 'final') {
        tierKey = 'final';
    } else if (tier === ClassTier.LAST || tier === 3 || tier === 'LAST' || tier === 'last') {
        tierKey = 'last';
    } else if (tier === ClassTier.SECOND || tier === 2 || tier === 'SECOND' || tier === 'second') {
        tierKey = 'second';
    } else {
        tierKey = 'first';
    }

    const pool = tierData[tierKey] && tierData[tierKey].length > 0 ? tierData[tierKey] : tierData.first;

    // combatStyle이 전달된 경우 전투 계열에 적합한 클래스명 우선 매칭
    if (combatStyle) {
        const style = combatStyle.toLowerCase();
        let keywords: string[] = [];

        if (style.includes('마법') || style.includes('비전') || style.includes('마도') || style.includes('술사') || style.includes('위저드') || style.includes('소서러') || style.includes('mage') || style.includes('현자') || style.includes('학자') || style.includes('주술') || style.includes('도사') || style.includes('원소')) {
            keywords = ['술사', '마법', '메이지', '소서러', '위저드', '비전', '도사', '현자', '학자', '주술', '맨서', '워록', '사도', '오라클', '마술사', '마도', '영혼', '치유', '신관', '사제'];
        } else if (style.includes('검') || style.includes('기사') || style.includes('소드') || style.includes('세이버') || style.includes('나이트') || style.includes('블레이드') || style.includes('전사') || style.includes('소드맨')) {
            keywords = ['검', '기사', '세이버', '소드', '블레이드', '나이트', '전사', '워리어', '버서커', '소드맨', '무사', '검성', '검객'];
        } else if (style.includes('궁') || style.includes('사수') || style.includes('사냥') || style.includes('스나이퍼') || style.includes('레인저') || style.includes('체이서') || style.includes('아처') || style.includes('저격')) {
            keywords = ['사수', '궁', '스나이퍼', '레인저', '체이서', '헌터', '사냥꾼', '사격', '아처', '투척', '저격'];
        } else if (style.includes('암살') || style.includes('도적') || style.includes('어쌔신') || style.includes('그림자') || style.includes('살수') || style.includes('닌자') || style.includes('로그') || style.includes('잠행')) {
            keywords = ['암살', '어쌔신', '그림자', '살수', '닌자', '로그', '스토커', '비수', '스파이', '추적자', '척후병', '잠행', '리퍼'];
        } else if (style.includes('격투') || style.includes('무투') || style.includes('권') || style.includes('몽크') || style.includes('스트라이커') || style.includes('피스트') || style.includes('투사') || style.includes('파이터') || style.includes('체술')) {
            keywords = ['격투', '무투', '권', '피스트', '투사', '스트라이커', '무인', '바디', '타이탄', '버서커', '킥', '파이터', '챔피언', '체술', '투신', '투혼'];
        } else if (style.includes('사제') || style.includes('힐러') || style.includes('신관') || style.includes('프리스트') || style.includes('성직') || style.includes('클레릭') || style.includes('성자') || style.includes('치유')) {
            keywords = ['사제', '신관', '성자', '프리스트', '힐러', '치유', '성녀', '주교', '세인트', '수사', '기도', '대주교'];
        } else if (style.includes('방패') || style.includes('가디언') || style.includes('수호') || style.includes('탱커') || style.includes('철벽') || style.includes('성벽') || style.includes('요새')) {
            keywords = ['가디언', '방패', '수호', '성벽', '철벽', '요새', '보호', '가드', '철갑', '방벽'];
        } else if (style.includes('창') || style.includes('랜서') || style.includes('스피어') || style.includes('투창')) {
            keywords = ['창', '랜서', '스피어', '투창'];
        }

        if (keywords.length > 0) {
            const matched = pool.filter(cls => keywords.some(k => cls.includes(k)));
            if (matched.length > 0) {
                return matched[Math.floor(Math.random() * matched.length)];
            }
        }
    }

    return pool[Math.floor(Math.random() * pool.length)] || '모험가';
};

/**
 * 신력 계통에 해당하는 전체 또는 티어별 클래스 배열을 리턴하는 헬퍼 함수
 */
export const getShinryokuClassPool = (shinryokuType: string | undefined, tier?: ClassTier | number | string): string[] => {
    const key = getShinryokuConstantKey(shinryokuType);
    const tierData = HUMANOID_CLASSES_TIERED[key] || HUMANOID_CLASSES_TIERED['일반'];
    if (!tier || tier === ClassTier.NONE || tier === 'NONE') {
        return [...tierData.first, ...tierData.second, ...tierData.last, ...tierData.final];
    }
    if (tier === ClassTier.FINAL || tier === 4 || tier === 'FINAL') return tierData.final;
    if (tier === ClassTier.LAST || tier === 3 || tier === 'LAST') return tierData.last;
    if (tier === ClassTier.SECOND || tier === 2 || tier === 'SECOND') return tierData.second;
    return tierData.first;
};

export const HUMANOID_CLASSES: Record<string, string[]> = Object.keys(HUMANOID_CLASSES_TIERED).reduce((acc, k) => {
    const td = HUMANOID_CLASSES_TIERED[k];
    acc[k] = [...td.first, ...td.second, ...td.last, ...td.final];
    return acc;
}, {} as Record<string, string[]>);

export const ENEMY_SKILL_POOL: Record<string, Partial<Skill>[]> = {
     '일반': [
        { name: "강하게 때리기", type: SkillType.PHYSICAL, description: "온 힘을 다해 공격한다.", mpCost: 5, powerRatio: 120 },
        { name: "돌진", type: SkillType.PHYSICAL, description: "몸을 날려 부딪힌다.", mpCost: 8, powerRatio: 130 },
        { name: "방어 태세", type: SkillType.BUFF, description: "방어력을 높인다.", mpCost: 10, effectFormula: "DEF 30% 증가(2턴)" },
        { name: "광폭화", type: SkillType.BUFF, description: "공격력을 대폭 높인다.", mpCost: 20, effectFormula: "STR 50% 증가(2턴)" },
        { name: "위협", type: SkillType.DEBUFF, description: "적을 위협한다.", mpCost: 15, effectFormula: "P.Atk -20%" },
        { name: "위협", type: SkillType.DEBUFF, description: "적을 위협한다.", mpCost: 15, effectFormula: "P.Atk -20%" },
        { name: "회피 기동", type: SkillType.BUFF, description: "회피율을 높인다.", mpCost: 12, effectFormula: "AGI 30% 증가(2턴)" }
    ],
    '화염계': [
        { name: "파이어볼", type: SkillType.MAGIC, description: "[부가 효과: 화상]", mpCost: 15, powerRatio: 150 },
        { name: "화염 방사", type: SkillType.MAGIC, description: "전방에 불을 뿜는다. [부가 효과: 화상]", targetType: 'aoe', mpCost: 30, powerRatio: 120 },
        { name: "열화", type: SkillType.BUFF, description: "자신의 공격력을 높인다.", mpCost: 20, effectFormula: "STR 30% 증가(2턴)" },
        { name: "불기둥", type: SkillType.MAGIC, description: "솟아오르는 불기둥.", mpCost: 40, powerRatio: 180 },
        { name: "멜트 다운", type: SkillType.DEBUFF, description: "방어력을 녹인다. [부가 효과: 파열]", mpCost: 25, effectFormula: "P.Def -30%" }
    ],
    '빙결계': [
        { name: "아이스 스피어", type: SkillType.MAGIC, description: "[부가 효과: 빙결]", mpCost: 15, powerRatio: 140 },
        { name: "프로스트 노바", type: SkillType.MAGIC, description: "주변을 얼린다. [부가 효과: 냉기]", targetType: 'aoe', mpCost: 35, powerRatio: 110 },
        { name: "얼음 갑옷", type: SkillType.BUFF, description: "방어력을 높인다.", mpCost: 25, effectFormula: "DEF 40% 증가(2턴)" },
        { name: "절대 영도", type: SkillType.MAGIC, description: "모든 것을 얼리는 한기.", mpCost: 50, powerRatio: 200 },
        { name: "동상", type: SkillType.DEBUFF, description: "속도를 늦춘다. [부가 효과: 냉기]", mpCost: 20, effectFormula: "AGI -30%" }
    ],
    '전격계': [
        { name: "썬더볼트", type: SkillType.MAGIC, description: "[부가 효과: 감전]", mpCost: 18, powerRatio: 160 },
        { name: "체인 라이트닝", type: SkillType.MAGIC, description: "연쇄되는 번개.", targetType: 'aoe', mpCost: 40, powerRatio: 130 },
        { name: "과충전", type: SkillType.BUFF, description: "마법 공격력을 높인다.", mpCost: 30, effectFormula: "INT 40% 증가(2턴)" },
        { name: "뇌격", type: SkillType.PHYSICAL, description: "번개를 두른 돌진.", mpCost: 25, powerRatio: 150 },
        { name: "마비", type: SkillType.DEBUFF, description: "움직임을 봉쇄한다. [부가 효과: 감전]", mpCost: 25, effectFormula: "AGI -40%" }
    ],
    '대지계': [
        { name: "지진", type: SkillType.PHYSICAL, description: "땅을 흔든다.", targetType: 'aoe', mpCost: 35, powerRatio: 120 },
        { name: "바위 던지기", type: SkillType.PHYSICAL, description: "거대한 바위를 던진다.", mpCost: 15, powerRatio: 140 },
        { name: "철벽 방어", type: SkillType.BUFF, description: "방어력을 대폭 높인다.", mpCost: 25, effectFormula: "DEF 50% 증가(2턴)" },
        { name: "모래 폭풍", type: SkillType.DEBUFF, description: "시야를 가린다. [부가 효과: 암흑]", targetType: 'aoe', mpCost: 30, effectFormula: "AGI -20%" },
        { name: "석화의 시선", type: SkillType.DEBUFF, description: "돌로 만든다. [부가 효과: 속박]", mpCost: 40, effectFormula: "AGI -30%" }
    ],
    '질풍계': [
        { name: "윈드 커터", type: SkillType.MAGIC, description: "바람의 칼날. [부가 효과: 출혈]", mpCost: 12, powerRatio: 130 },
        { name: "토네이도", type: SkillType.MAGIC, description: "거대한 회오리.", targetType: 'aoe', mpCost: 45, powerRatio: 140 },
        { name: "순풍", type: SkillType.BUFF, description: "민첩성을 높인다.", mpCost: 20, effectFormula: "AGI 40% 증가(2턴)" },
        { name: "에어 블라스트", type: SkillType.PHYSICAL, description: "압축된 공기 폭발.", mpCost: 25, powerRatio: 160 },
        { name: "진공", type: SkillType.DEBUFF, description: "숨을 못 쉬게 한다. [부가 효과: 침묵]", mpCost: 30, effectFormula: "M.Atk -30%" }
    ],
    '해수계': [
        { name: "워터 캐논", type: SkillType.MAGIC, description: "고압의 물줄기.", mpCost: 15, powerRatio: 145 },
        { name: "해일", type: SkillType.MAGIC, description: "거대한 파도.", targetType: 'aoe', mpCost: 50, powerRatio: 150 },
        { name: "물의 장막", type: SkillType.BUFF, description: "피해를 흡수한다.", mpCost: 25, effectFormula: "DEF 20% 증가(2턴)" },
        { name: "버블 트랩", type: SkillType.DEBUFF, description: "물방울에 가둔다. [부가 효과: 속박]", mpCost: 30, effectFormula: "AGI -30%" },
        { name: "산성비", type: SkillType.DEBUFF, description: "방어구를 부식시킨다. [부가 효과: 파열]", targetType: 'aoe', mpCost: 35, effectFormula: "P.Def -20%" }
    ],
    '광휘계': [
        { name: "성스러운 빛", type: SkillType.MAGIC, description: "악을 멸하는 빛.", mpCost: 20, powerRatio: 160 },
        { name: "심판", type: SkillType.MAGIC, description: "하늘에서 떨어지는 빛의 검.", mpCost: 45, powerRatio: 200 },
        { name: "축복", type: SkillType.BUFF, description: "모든 능력을 높인다.", mpCost: 40, effectFormula: "STR 20% 증가(2턴)" },
        { name: "정화", type: SkillType.BUFF, description: "상태이상을 해제한다.", mpCost: 30, effectFormula: "상태이상 해제(모두)" },
        { name: "눈부신 섬광", type: SkillType.DEBUFF, description: "시력을 뺏는다. [부가 효과: 암흑]", targetType: 'aoe', mpCost: 35, effectFormula: "AGI -30%" }
    ],
    '암흑계': [
        { name: "어둠의 화살", type: SkillType.MAGIC, description: "그림자로 만든 화살.", mpCost: 15, powerRatio: 140 },
        { name: "블랙홀", type: SkillType.MAGIC, description: "모든 것을 빨아들인다.", targetType: 'aoe', mpCost: 60, powerRatio: 180 },
        { name: "공포의 오라", type: SkillType.DEBUFF, description: "주변을 공포에 떨게 한다. [부가 효과: 공포]", targetType: 'aoe', mpCost: 40, effectFormula: "P.Atk -20%" },
        { name: "생명력 흡수", type: SkillType.MAGIC, description: "체력을 뺏는다. [부가 효과: 흡정]", mpCost: 35, powerRatio: 120 },
        { name: "저주", type: SkillType.DEBUFF, description: "능력을 약화시킨다. [부가 효과: 소멸]", mpCost: 30, effectFormula: "STR -20%" }
    ],
    '무기강화계': [
        { name: "무기 연마", type: SkillType.BUFF, description: "공격력을 대폭 높인다.", mpCost: 20, effectFormula: "STR 40% 증가(2턴)" },
        { name: "급소 타격", type: SkillType.PHYSICAL, description: "방어력을 무시하고 공격한다.", mpCost: 30, powerRatio: 180 },
        { name: "무기 투척", type: SkillType.PHYSICAL, description: "무기를 던져 원거리 공격한다.", mpCost: 15, powerRatio: 150 },
        { name: "강철의 의지", type: SkillType.BUFF, description: "방어력을 높인다.", mpCost: 25, effectFormula: "DEF 30% 증가(2턴)" },
        { name: "무기 파괴", type: SkillType.DEBUFF, description: "적의 공격력을 낮춘다.", mpCost: 35, effectFormula: "P.Atk -30%" },
        { name: "무기 강화", type: SkillType.BUFF, description: "무기의 성능을 극대화한다.", mpCost: 40, effectFormula: "STR/DEF 30% 증가(2턴)" },
        { name: "연속 타격", type: SkillType.PHYSICAL, description: "빠르게 연속으로 공격한다.", mpCost: 25, powerRatio: 160 },
        { name: "무기 방어", type: SkillType.BUFF, description: "무기로 공격을 막아낸다.", mpCost: 20, effectFormula: "DEF 40% 증가(1턴)" },
        { name: "치명적인 일격", type: SkillType.PHYSICAL, description: "치명적인 피해를 입힌다.", mpCost: 50, powerRatio: 250 },
        { name: "무기 해제", type: SkillType.DEBUFF, description: "적의 무기를 떨어뜨린다.", mpCost: 45, effectFormula: "P.Atk -30%" }
    ],
    '신체강화계': [
        { name: "근력 강화", type: SkillType.BUFF, description: "공격력을 대폭 높인다.", mpCost: 20, effectFormula: "STR 50% 증가(2턴)" },
        { name: "철의 피부", type: SkillType.BUFF, description: "방어력을 대폭 높인다.", mpCost: 25, effectFormula: "DEF 50% 증가(2턴)" },
        { name: "맹렬한 돌진", type: SkillType.PHYSICAL, description: "강력한 돌진 공격.", mpCost: 15, powerRatio: 160 },
        { name: "기합", type: SkillType.BUFF, description: "민첩성을 높인다.", mpCost: 10, effectFormula: "AGI 30% 증가(2턴)" },
        { name: "타격", type: SkillType.PHYSICAL, description: "강력한 타격.", mpCost: 10, powerRatio: 140 },
        { name: "신체 한계 돌파", type: SkillType.BUFF, description: "모든 능력을 대폭 높인다.", mpCost: 60, effectFormula: "STR/DEF/AGI 40% 증가(2턴)" },
        { name: "초고속 이동", type: SkillType.BUFF, description: "이동 속도를 극대화한다.", mpCost: 30, effectFormula: "AGI 60% 증가(2턴)" },
        { name: "강철 주먹", type: SkillType.PHYSICAL, description: "강철 같은 주먹으로 공격한다.", mpCost: 20, powerRatio: 180 },
        { name: "회복의 호흡", type: SkillType.BUFF, description: "체력을 회복한다.", mpCost: 40, effectFormula: "HP 30% 회복" },
        { name: "반격", type: SkillType.PHYSICAL, description: "적의 공격을 반격한다.", mpCost: 35, powerRatio: 200 }
    ],
    '태양계': [
        { name: "태양의 빛", type: SkillType.MAGIC, description: "강력한 빛 공격.", mpCost: 20, powerRatio: 170 },
        { name: "태양의 분노", type: SkillType.MAGIC, description: "광범위한 빛 공격.", targetType: 'aoe', mpCost: 50, powerRatio: 160 },
        { name: "태양의 가호", type: SkillType.BUFF, description: "모든 능력을 높인다.", mpCost: 40, effectFormula: "STR/INT 20% 증가(2턴)" },
        { name: "눈부심", type: SkillType.DEBUFF, description: "적의 명중률을 낮춘다.", mpCost: 30, effectFormula: "AGI -30%" },
        { name: "태양의 화신", type: SkillType.BUFF, description: "공격력을 대폭 높인다.", mpCost: 60, effectFormula: "STR/INT 50% 증가(2턴)" },
        { name: "태양의 폭발", type: SkillType.MAGIC, description: "강력한 빛 폭발.", targetType: 'aoe', mpCost: 70, powerRatio: 220 },
        { name: "태양의 눈", type: SkillType.DEBUFF, description: "적을 마비시킨다.", mpCost: 40, effectFormula: "AGI -50%" },
        { name: "태양의 치유", type: SkillType.BUFF, description: "체력을 회복한다.", mpCost: 50, effectFormula: "HP 50% 회복" },
        { name: "태양의 방패", type: SkillType.BUFF, description: "피해를 감소시킨다.", mpCost: 30, effectFormula: "DEF 40% 증가(2턴)" },
        { name: "태양의 심판", type: SkillType.MAGIC, description: "적을 소멸시킨다.", mpCost: 80, powerRatio: 300 }
    ],
    '월광계': [
        { name: "달빛의 칼날", type: SkillType.MAGIC, description: "달빛을 이용한 공격.", mpCost: 15, powerRatio: 150 },
        { name: "월광의 춤", type: SkillType.MAGIC, description: "연속 공격.", targetType: 'aoe', mpCost: 40, powerRatio: 140 },
        { name: "달의 그림자", type: SkillType.BUFF, description: "회피율을 대폭 높인다.", mpCost: 25, effectFormula: "AGI 50% 증가(2턴)" },
        { name: "달의 저주", type: SkillType.DEBUFF, description: "적의 마법 공격력을 낮춘다.", mpCost: 30, effectFormula: "M.Atk -30%" },
        { name: "월식", type: SkillType.MAGIC, description: "강력한 어둠 공격.", mpCost: 50, powerRatio: 190 },
        { name: "달빛의 보호", type: SkillType.BUFF, description: "피해를 흡수한다.", mpCost: 30, effectFormula: "DEF 30% 증가(2턴)" },
        { name: "달의 속삭임", type: SkillType.DEBUFF, description: "적을 혼란시킨다.", mpCost: 40, effectFormula: "INT -40%" },
        { name: "달빛의 환영", type: SkillType.BUFF, description: "분신을 만든다.", mpCost: 45, effectFormula: "AGI 100% 증가(1턴)" },
        { name: "달의 심판", type: SkillType.MAGIC, description: "강력한 달빛 공격.", mpCost: 60, powerRatio: 210 },
        { name: "영원한 밤", type: SkillType.DEBUFF, description: "적을 어둠 속에 가둔다.", mpCost: 70, effectFormula: "모든 능력치 -30%" }
    ],
    '초화계': [
        { name: "덩굴 묶기", type: SkillType.MAGIC, description: "적을 묶는다. [부가 효과: 속박]", mpCost: 20, effectFormula: "AGI -50%" },
        { name: "독 가시", type: SkillType.PHYSICAL, description: "독 가시 공격. [부가 효과: 독]", mpCost: 15, powerRatio: 130 },
        { name: "생명력 회복", type: SkillType.BUFF, description: "체력을 회복한다.", mpCost: 30, effectFormula: "HP 20% 회복" },
        { name: "숲의 분노", type: SkillType.MAGIC, description: "광범위한 자연 공격.", targetType: 'aoe', mpCost: 45, powerRatio: 150 },
        { name: "자연의 가호", type: SkillType.BUFF, description: "방어력을 높인다.", mpCost: 25, effectFormula: "DEF 30% 증가(2턴)" },
        { name: "꽃가루 폭발", type: SkillType.MAGIC, description: "꽃가루로 광범위 공격.", targetType: 'aoe', mpCost: 35, powerRatio: 140 },
        { name: "뿌리 내리기", type: SkillType.BUFF, description: "방어력을 대폭 높인다.", mpCost: 40, effectFormula: "DEF 60% 증가(2턴)" },
        { name: "독성 포자", type: SkillType.DEBUFF, description: "적을 중독시킨다.", mpCost: 30, effectFormula: "STR -30%" },
        { name: "생명의 나무", type: SkillType.BUFF, description: "체력을 지속적으로 회복한다.", mpCost: 60, effectFormula: "HP 10% 회복(2턴)" },
        { name: "자연의 심판", type: SkillType.MAGIC, description: "강력한 자연 공격.", mpCost: 70, powerRatio: 230 }
    ]
};

export const SYSTEM_PROMPT = `
You are the Game Master (GM) of a text-based RPG called "Shinryoku" (Divine Power).
Your goal is to provide an immersive, engaging experience for the player.
Manage the game state, narrate events, handle combat, and evolve the story based on player actions.
Always respond with a JSON object conforming to the schema provided.
The narrative should be in Korean.

**CRITICAL RULE: BASE VS TOTAL STATS**:
The player has 'Base Stats' (permanent growth) and 'Total Stats' (Base + Equipment + Buffs).
- You MUST ONLY update 'Base Stats' in the "characterUpdate.stats" object.
- NEVER include equipment bonuses or temporary buffs in "characterUpdate.stats".
- For example, if Base STR is 15 and Item provides +15, Total is 30. If the player gains +1 STR narratively, return 16, NOT 31.

**STRICT SKILL CREATION RULE**:
1. You MUST NOT ever generate, add, or update the "skills" array in the "characterUpdate" object arbitrarily.
2. Skill creation and acquisition are managed EXCLUSIVELY by the player through the dedicated "Skill Book" interface in the frontend.
3. Even during "Class Evolution" (전직), you must describe the awakening of power in the narrative, but you MUST NOT add new Skill objects to the character's state. 
4. DO NOT change existing skills or mastery values unless a specific local simulation result (like a combat turn finish) dictates it.

**CRITICAL: HYBRID AI-LOCAL ENGINE RULE**
To optimize performance and maintain state integrity, the "characterUpdate" object in your JSON response must ONLY contain fields that have ACTUALLY CHANGED or were specifically requested by the player's action. 
- OMIT all fields that remain identical to the current state.
- Do NOT return the full character state every turn. 
- If a collection (inventory, skills, companions) hasn't changed, do not include the key at all.
- The frontend engine will handle merging your updates with the existing local state.
- **Mythic Special Options**: Mythic rarity items can have one special option. When generating or describing combat involving such items, consider these effects:
  1. 방어력 무시: Ignore target's P.Def/M.Def.
  2. 회피율 무시: 100% hit rate.
  3. 피해 반사: Reflect 30% of damage taken.
  4. 사망 방지: Resurrect once with 100% HP.
  5. 피해 무효화: 20% chance to take 0 damage.
  6. 마나쉴드 자동 생성: Create shield (10% of Max MP) on action.
  7. 이중 공격: Normal attacks hit twice (Skills follow up with normal attack).
  8. 마나 무한: No MP cost if HP <= 50%.
`;

export const INITIAL_CHARACTER: Character = {
    name: "Unknown",
    age: "20세",
    birthYear: 1980,
    gender: "남성",
    race: "인간",
    hairStyle: "단정함",
    appearance: "평범한 모습",
    shinryokuType: "미개방",
    nation: "대한민국",
    personality: "평범함",
    job: JobType.STUDENT,
    currentDate: START_DATE,
    currentLocation: { region: "아시아", nation: "대한민국", city: "서울" },
    firstClassName: "미정",
    firstClassDescription: "아직 정해지지 않음",
    combatStyle: CombatStyle.SWORDSMAN,
    level: 1,
    currentExp: 0,
    maxExp: 100,
    stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 },
    classTier: ClassTier.NONE,
    liberationPotential: ClassTier.FIRST,
    skills: [],
    statusEffects: [],
    equipment: {},
    inventory: [],
    statPoints: 0,
    companions: [],
    money: 0,
    weaponMastery: {},
    socialNetwork:[],
    infamy: 0,
    bondSkills: [],
    bondGauges: {},
};

export const INITIAL_BASE: Base = {
    level: 0,
    gridSize: 2, // Level 1: 2x2
    layout: [],
    resources: { 
        gold: 0, 
        wood: 0, 
        stone: 0, 
        iron: 0, 
        manaStone: 0,
        manaCrystal: 0, 
        food: 0,
        herbs: 0, 
        normalCrystal: 0,
        magicCrystal: 0,
        rareCrystal: 0,
        epicCrystal: 0,
        uniqueCrystal: 0,
        legendaryCrystal: 0
    },
    residents: [],
    facilities: [],
    assignments: {},
    storage: [],
    facilityLevels: {}, 
    dailyCounts: {},
    elementalShards: {},
    capturedMonsters: [],
    dispatched: [],
    guardianData: {},
};

export const FACILITIES_INFO = [
    { id: 'storage', name: '창고', desc: '아이템을 보관할 수 있습니다.', minLevel: 1, isUnique: false },
    { id: 'housing', name: '숙소', desc: '동료들이 거주하며 휴식을 취합니다.', minLevel: 1, isUnique: false },
    { id: 'farm', name: '농장', desc: '식량을 생산합니다.', minLevel: 1, isUnique: false },
    { id: 'training_exp', name: '경험 훈련장', desc: '경험치를 집중적으로 훈련합니다.', minLevel: 2, isUnique: false },
    { id: 'training_stat', name: '스탯 훈련장', desc: '기초 스탯을 집중적으로 훈련합니다.', minLevel: 2, isUnique: false },
    { id: 'training_mastery', name: '무기숙련도 훈련장', desc: '무기 숙련도를 집중적으로 훈련합니다.', minLevel: 3, isUnique: false },
    { id: 'mine', name: '광산', desc: '철광석과 마석을 채굴합니다.', minLevel: 1, isUnique: false },
    { id: 'workshop', name: '제작소', desc: '장비를 강화하거나 제작할 수 있습니다.', minLevel: 3, isUnique: false },
    { id: 'defense', name: '방어소', desc: '기지의 방어력을 관리합니다.', minLevel: 2, isUnique: false },
    { id: 'dispatch', name: '파견소', desc: '동료를 파견하여 보상을 얻습니다.', minLevel: 2, isUnique: false }, 
    { id: 'alchemy', name: '연금술 실험실', desc: '포션과 특수 아이템을 제작합니다.', minLevel: 3, isUnique: false },
    { id: 'lab', name: '연구소', desc: '스킬을 연구하고 한계를 돌파합니다. (고유 시설, 담당 연구원 수에 따라 연구 보너스 증폭)', minLevel: 4, isUnique: true },
    { id: 'monster_farm', name: '몬스터 사육소', desc: '몬스터를 포획하고 관리합니다.', minLevel: 5, isUnique: false },
    { id: 'cooking', name: '요리 시설', desc: '농장 재료로 요리를 만듭니다.', minLevel: 2, isUnique: false },
    { id: 'combat_training', name: '전투 훈련소', desc: '전투에 참여하지 않는 동료를 성장시키는 시설입니다.', minLevel: 4, isUnique: false },
    { id: 'tactical_training', name: '전술 훈련소', desc: '전투 역할(딜러, 탱커, 서포터) 숙련도를 훈련하는 시설입니다.', minLevel: 3, isUnique: true },
    { id: 'sparring_arena', name: '전술 모의 대련장', desc: '동료들과 실전처럼 대련하여 전술 숙련도 경험치를 쌓고 호감도를 높입니다. (시설 개수가 늘어날수록 일일 대련 횟수 증가)', minLevel: 5, isUnique: false },
    { id: 'training_style', name: '전투 스타일 훈련소', desc: '1~4차 전직 트리 시각화 및 실전 전투 수련을 통해 전투 계열을 승급/변경하는 시설입니다.', minLevel: 2, isUnique: true },
    { id: 'potential_breakthrough', name: '기지 잠재력 돌파소', desc: '동료의 한계 클래스 잠재력을 돌파하여 성장을 촉진합니다.', minLevel: 2, isUnique: true },
    { id: 'trade_exchange', name: '물자 교류소', desc: '기지의 여분 자원을 판매하거나 필요한 자원을 구매할 수 있는 고유 상업 시설입니다. (시설 레벨에 따라 구매 금액 할인)', minLevel: 1, isUnique: true },
    { id: 'custom_lab', name: '커스텀 개조실', desc: '외형 변환, 등장 테마곡(BGM) 설정, 일반 동료 및 몬스터를 커스텀 개체로 개조 승격하는 고유 연구 시설입니다.', minLevel: 2, isUnique: true },
    { id: 'skill_vfx_lab', name: '스킬 커스텀 개조실', desc: '스킬 이펙트 테마, 아이콘, 스킬 컷신, 프레임 이펙트 제작, 이펙트 영상을 개조하는 고유 시설입니다.', minLevel: 2, isUnique: true },
    { id: 'child_academy', name: '유년 서당', desc: '기지에서 태어난 아이들이나 어린 견습생들이 성인식 전까지 기본 소양을 배우는 시설입니다. (교육 담당 동료의 직업과 전투력에 따라 아이들의 초기 능력치 육성)', minLevel: 2, isUnique: false },
    { id: 'monster_arena', name: '몬스터 수련 투기장', desc: '사육소의 몬스터들끼리 모의 대전을 치르며 야성을 일깨우는 시설입니다. (사육사의 지도 아래 몬스터의 능력 증가)', minLevel: 3, isUnique: false },
];

export const RESOURCE_SELL_PRICES: Record<string, number> = {
    wood: 100,
    stone: 100,
    herbs: 50,
    iron: 100,
    manaStone: 50,
    manaCrystal: 500,
    food: 100,
    normalCrystal: 100,
    magicCrystal: 500,
    rareCrystal: 1000,
    epicCrystal: 5000,
    uniqueCrystal: 15000,
    legendaryCrystal: 50000,
    shard: 1000, // 신력 조각 공통
    wheat: 30,
    corn: 60,
    potato: 90,
    mana_fruit: 300,
    rice: 40,
    sweet_potato: 100,
    onion: 50,
    garlic: 120,
    lettuce: 24,
    shinryoku_flower: 2000,
    carrot: 36,
    cabbage: 44,
    tomato: 76,
    strawberry: 120,
    grape: 180,
    watermelon: 240,
    ginseng: 600,
    mandrake: 1000,
    world_tree_branch: 5000,
    golden_apple: 3000,
    gold_ore: 2000,
    silver_ore: 800,
    diamond: 10000,
    ruby: 5000,
    sapphire: 5000,
    emerald: 5000
};

export const BASE_LEVEL_CONFIG: Record<number, { cost: number, requiredLevel: number, description: string, gridSize: number }> = {
    0: { cost: 100000, requiredLevel: 5, description: "황무지 (구매 가능)", gridSize: 2 },
    1: { cost: 0, requiredLevel: 5, description: "정착지 (기본)", gridSize: 2 },
    2: { cost: 50000, requiredLevel: 20, description: "소규모 기지", gridSize: 3 },
    3: { cost: 200000, requiredLevel: 50, description: "요새", gridSize: 4 },
    4: { cost: 1000000, requiredLevel: 100, description: "성채", gridSize: 5 },
    5: { cost: 5000000, requiredLevel: 200, description: "대요새", gridSize: 7 }
};

export const FACILITY_CONSTRUCTION_COSTS: Record<string, { gold?: number, food?: number, wood?: number, stone?: number, iron?: number, manaCrystal?: number }> = {
    'storage': { iron: 10 },
    'housing': { iron: 10, wood: 10 },
    'farm': { gold: 10000 },
    'mine': { gold: 30000 },
    'training_exp': { gold: 50000, iron: 100, wood: 20 },
    'training_stat': { gold: 50000, iron: 100, wood: 20 },
    'training_mastery': { gold: 50000, iron: 100, wood: 20 },
    'workshop': {gold: 50000,  iron: 10, manaCrystal: 5 },
    'defense': { iron: 100, manaCrystal: 5 },
    'dispatch': { iron: 100, manaCrystal: 10 },
    'alchemy': { gold: 100000, wood: 50, iron: 50, manaCrystal: 10 },
    'lab': {gold: 50000, iron: 100, manaCrystal: 20 },
    'monster_farm': { iron: 100, manaCrystal: 30 },
    'cooking': { gold: 20000, wood: 30, food: 20 },
    'combat_training': { gold: 30000, wood: 40, iron: 20 },
    'tactical_training': { gold: 30000, wood: 40, iron: 20 },
    'sparring_arena': { gold: 35000, wood: 40, iron: 30, manaCrystal: 5 },
    'training_style': { gold: 60000, wood: 50, iron: 40, manaCrystal: 10 },
    'potential_breakthrough': { gold: 80000, wood: 50, iron: 50, manaCrystal: 20 },
    'trade_exchange': { gold: 20000, wood: 20, stone: 20, iron: 10 },
    'custom_lab': { gold: 50000, wood: 30, stone: 20, iron: 30, manaCrystal: 10 },
    'skill_vfx_lab': { gold: 50000, wood: 30, stone: 20, iron: 30, manaCrystal: 10 },
    'child_academy': { gold: 30000, wood: 40, stone: 20, iron: 20 },
    'monster_arena': { gold: 40000, wood: 50, stone: 40, iron: 30, manaCrystal: 5 },
};

export const BASE_UPGRADE_COSTS: Record<number, { food: number, wood: number, stone: number, iron: number, manaCrystal: number, time: number }> = {
    2: { food: 50, wood: 15, stone: 20, iron: 50, manaCrystal: 0, time: 1 },
    3: { food: 200, wood: 30, stone: 20, iron: 100, manaCrystal: 0, time: 3 },
    4: { food: 400, wood: 50, stone: 50, iron: 1000, manaCrystal: 0, time: 7 },
    5: { food: 1000, wood: 200, stone: 200, iron: 5000, manaCrystal: 20, time: 30 }
};

export const BASE_GRID_EXPANSION_COSTS: Record<number, { gold: number, food: number, wood: number, stone: number, iron: number, manaCrystal: number }> = {
    8: { gold: 50000000, food: 5000, wood: 10000, stone: 10000, iron: 2000, manaCrystal: 1000 },
    9: { gold: 200000000, food: 20000, wood: 40000, stone: 40000, iron: 5000, manaCrystal: 5000 },
    10: { gold: 1000000000, food: 100000, wood: 200000, stone: 200000, iron: 20000, manaCrystal: 20000 }
};

export const FACILITY_UPGRADE_CONFIG: Record<string, { maxLevel: number, woodCost: number, stoneCost: number, goldCost: number, foodCost: number, manaCost: number }> = {
    'storage': { maxLevel: 5, woodCost: 5, stoneCost: 10, goldCost: 10000, foodCost: 0, manaCost: 0 },
    'housing': { maxLevel: 5, woodCost: 5, stoneCost: 10, goldCost: 10000, foodCost: 0, manaCost: 0 },
    'farm': { maxLevel: 5, woodCost: 5, stoneCost: 10, goldCost: 10000, foodCost: 0, manaCost: 0 },
    'mine': { maxLevel: 5, woodCost: 10, stoneCost: 5, goldCost: 10000, foodCost: 5, manaCost: 0 },
    'training_exp': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 20000, foodCost: 10, manaCost: 0 },
    'training_stat': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 20000, foodCost: 10, manaCost: 0 },
    'training_mastery': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 20000, foodCost: 10, manaCost: 0 },
    'workshop': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 20000, foodCost: 10, manaCost: 10 },
    'lab': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 50000, foodCost: 10, manaCost: 10 },
    'monster_farm': { maxLevel: 5, woodCost: 10, stoneCost: 10, goldCost: 50000, foodCost: 20, manaCost: 5 },
    'alchemy': { maxLevel: 5, woodCost: 5, stoneCost: 10, goldCost: 50000, foodCost: 0, manaCost: 20 },
    'cooking': { maxLevel: 5, woodCost: 10, stoneCost: 5, goldCost: 20000, foodCost: 10, manaCost: 0 },
    'dispatch': { maxLevel: 5, woodCost: 20, stoneCost: 10, goldCost: 30000, foodCost: 10, manaCost: 5 },
    'defense': { maxLevel: 5, woodCost: 20, stoneCost: 20, goldCost: 40000, foodCost: 10, manaCost: 10 },
    'combat_training': { maxLevel: 10, woodCost: 20, stoneCost: 10, goldCost: 30000, foodCost: 10, manaCost: 0 },
    'tactical_training': { maxLevel: 5, woodCost: 15, stoneCost: 15, goldCost: 30000, foodCost: 15, manaCost: 0 },
    'sparring_arena': { maxLevel: 5, woodCost: 20, stoneCost: 15, goldCost: 35000, foodCost: 15, manaCost: 5 },
    'training_style': { maxLevel: 5, woodCost: 25, stoneCost: 25, goldCost: 50000, foodCost: 20, manaCost: 15 },
    'potential_breakthrough': { maxLevel: 5, woodCost: 30, stoneCost: 30, goldCost: 60000, foodCost: 20, manaCost: 20 },
    'trade_exchange': { maxLevel: 5, woodCost: 15, stoneCost: 15, goldCost: 20000, foodCost: 10, manaCost: 0 },
    'custom_lab': { maxLevel: 5, woodCost: 20, stoneCost: 20, goldCost: 40000, foodCost: 10, manaCost: 10 },
    'skill_vfx_lab': { maxLevel: 5, woodCost: 20, stoneCost: 20, goldCost: 40000, foodCost: 10, manaCost: 10 },
    'child_academy': { maxLevel: 5, woodCost: 20, stoneCost: 15, goldCost: 30000, foodCost: 10, manaCost: 0 },
    'monster_arena': { maxLevel: 5, woodCost: 25, stoneCost: 20, goldCost: 40000, foodCost: 20, manaCost: 5 },
};


export const SELL_PRICES: Record<string, number> = {
    [ItemRarity.NORMAL]: 100,
    [ItemRarity.MAGIC]: 1000,
    [ItemRarity.RARE]: 20000,
    [ItemRarity.EPIC]: 50000,
    [ItemRarity.UNIQUE]: 100000,
    [ItemRarity.LEGENDARY]: 500000,
    [ItemRarity.MYTHTIC]: 10000000
};

export const ENHANCEMENT_CAPS: Record<string, number> = {
    [ItemRarity.NORMAL]: 5,
    [ItemRarity.MAGIC]: 10,
    [ItemRarity.RARE]: 15,
    [ItemRarity.EPIC]: 20,
    [ItemRarity.UNIQUE]: 25,
    [ItemRarity.LEGENDARY]: 30,
    [ItemRarity.MYTHTIC]: 50,
};

export const MINE_ZONES = [
    { id: 'surface', name: '노천 광산', desc: '지표면 근처에서 안전하게 채굴합니다.', minLevel: 1, yields: { stone: 4, iron: 1, manaStone: 0, silver_ore: 0.05 }, risk: 0 },
    { id: 'tunnel', name: '갱도', desc: '본격적인 광산 내부로 진입합니다.', minLevel: 2, yields: { stone: 8, iron: 3, manaStone: 1, silver_ore: 0.2, gold_ore: 0.05 }, risk: 5 },
    { id: 'deep', name: '심층부', desc: '깊은 곳에서 희귀한 광물을 찾습니다.', minLevel: 3, yields: { stone: 15, iron: 6, manaStone: 4, manaCrystal: 0.3, gold_ore: 0.2, ruby: 0.02, sapphire: 0.02, emerald: 0.02 }, risk: 15 },
    { id: 'abyss', name: '심연의 틈', desc: '위험하지만 막대한 마력이 깃든 곳입니다.', minLevel: 5, yields: { stone: 25, iron: 12, manaStone: 10, manaCrystal: 1.5, rareCrystal: 0.05, diamond: 0.02, gold_ore: 0.8 }, risk: 30 },
];

export const MINE_SPECIALIZATIONS = [
    { id: 'general', name: '일반 채굴', desc: '석재와 철광석을 균형 있게 채굴합니다.', bonus: { stone: 1.5, iron: 1.5 } },
    { id: 'precious', name: '귀금속 개발', desc: '금과 은 같은 귀금속 채굴에 집중합니다.', bonus: { gold_ore: 2.0, silver_ore: 2.0 } },
    { id: 'gemstone', name: '보석 발굴', desc: '다이아몬드와 각종 보석을 찾는 데 특화됩니다.', bonus: { diamond: 1.5, ruby: 1.5, sapphire: 1.5, emerald: 1.5 } },
    { id: 'mana', name: '마력 탐사', desc: '마석과 마정석 채굴 효율이 극대화됩니다.', bonus: { manaStone: 1.8, manaCrystal: 1.8 } },
];

export const FARM_CROPS = [
    // Level 1
    { id: 'wheat', name: '밀', growthDays: 2, yield: 2, seedPrice: 100, minLevel: 1 },
    { id: 'lettuce', name: '상추', growthDays: 1, yield: 7, seedPrice: 100, minLevel: 1 },
    { id: 'carrot', name: '당근', growthDays: 2, yield: 4, seedPrice: 120, minLevel: 1 },
    { id: 'cabbage', name: '배추', growthDays: 3, yield: 5, seedPrice: 150, minLevel: 1 },
    
    // Level 2
    { id: 'rice', name: '쌀', growthDays: 3, yield: 3, seedPrice: 150, minLevel: 2 },
    { id: 'onion', name: '양파', growthDays: 2, yield: 6, seedPrice: 150, minLevel: 2 },
    { id: 'tomato', name: '토마토', growthDays: 3, yield: 4, seedPrice: 250, minLevel: 2 },
    { id: 'strawberry', name: '딸기', growthDays: 4, yield: 3, seedPrice: 400, minLevel: 2 },
    
    // Level 3
    { id: 'corn', name: '옥수수', growthDays: 3, yield: 4, seedPrice: 200, minLevel: 3 },
    { id: 'potato', name: '감자', growthDays: 4, yield: 5, seedPrice: 300, minLevel: 3 },
    { id: 'sweet_potato', name: '고구마', growthDays: 4, yield: 4, seedPrice: 350, minLevel: 3 },
    { id: 'grape', name: '포도', growthDays: 5, yield: 2, seedPrice: 600, minLevel: 3 },
    
    // Level 4
    { id: 'garlic', name: '마늘', growthDays: 5, yield: 4, seedPrice: 400, minLevel: 4 },
    { id: 'herb', name: '약초', growthDays: 5, yield: 1, seedPrice: 500, minLevel: 4 },
    { id: 'watermelon', name: '수박', growthDays: 6, yield: 2, seedPrice: 800, minLevel: 4 },
    { id: 'ginseng', name: '인삼', growthDays: 10, yield: 1, seedPrice: 2000, minLevel: 4 },
    
    // Level 5
    { id: 'mana_fruit', name: '마력 열매', growthDays: 7, yield: 1, seedPrice: 1000, minLevel: 5 },
    { id: 'shinryoku_flower', name: '신력 꽃', growthDays: 10, yield: 1, seedPrice: 5000, minLevel: 5 },
    { id: 'mandrake', name: '만드라고라', growthDays: 12, yield: 1, seedPrice: 3500, minLevel: 5 },
    { id: 'world_tree_branch', name: '세계수의 가지', growthDays: 20, yield: 1, seedPrice: 15000, minLevel: 5 },
    { id: 'golden_apple', name: '황금 사과', growthDays: 15, yield: 1, seedPrice: 10000, minLevel: 5 },
];

export const ENHANCEMENT_CONFIG = {
    baseSuccess: (level: number) => Math.max(5, 100 - (level * 5)),
    rarityMod: {
        [ItemRarity.NORMAL]: 10,
        [ItemRarity.MAGIC]: 5,
        [ItemRarity.RARE]: 0,
        [ItemRarity.EPIC]: -5,
        [ItemRarity.UNIQUE]: -10,
        [ItemRarity.LEGENDARY]: -15,
        [ItemRarity.MYTHTIC]: -20
    },
    safetyZone: {
        [ItemRarity.NORMAL]: 3,
        [ItemRarity.MAGIC]: 3,
        [ItemRarity.RARE]: 4,
        [ItemRarity.EPIC]: 5,
        [ItemRarity.UNIQUE]: 6,
        [ItemRarity.LEGENDARY]: 7,
        [ItemRarity.MYTHTIC]: 7
    },
    destructionRate: (level: number) => Math.max(0, (level - 5) * 5)
};

// Passive & Skill Constants
export const ATTACK_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.5,
    [ClassTier.FIRST]: 1.0,
    [ClassTier.SECOND]: 5.0,
    [ClassTier.LAST]: 20.0,
    [ClassTier.FINAL]: 100.0,
};

export const PASSIVE_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.1,
    [ClassTier.FIRST]: 0.1,
    [ClassTier.SECOND]: 0.2,
    [ClassTier.LAST]: 0.5,
    [ClassTier.FINAL]: 1.0,
};

export const PASSIVE_STAT_TARGETS = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP'];
export const PASSIVE_COMBAT_TARGETS = ['CritChance', 'CritDamage', 'CritDmgResist', 'EleAtk', 'EleRes', 'StatusResist', 'ManaShield', 'Acc', 'MAcc', 'Eva', 'MEva'];

export const PASSIVE_LABEL_MAP: Record<string, string> = {
    'CritChance': '치명타율',
    'CritDamage': '치명타 피해량',
    'CritDmgResist': '치명타 피해 감소',
    'EleAtk': '속성 피해',
    'EleRes': '속성 저항',
    'StatusResist': '상태이상 저항',
    'ManaShield': '마나 쉴드',
    'Acc': '물리명중률 (Acc)',
    'MAcc': '마법명중률 (MAcc)',
    'Eva': '물리회피율 (Eva)',
    'MEva': '마법회피율 (MEva)'
};
