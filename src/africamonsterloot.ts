import { ItemRarity, Stats, WeaponType } from './types';

export interface AfricaLootEntry {
    item: string;
    type: 'Etc' | 'Weapon' | 'SubWeapon' | 'Head' | 'Body' | 'Feet' | 'Hand' | 'Accessory' | 'Consumable';
    weaponType?: WeaponType;
    droppedBy?: string[];
    chance: number;
    minLvl: number;
    rarity: ItemRarity;
    stats?: Partial<Stats>;
    options?: string[];
    description: string;
    imageUrl?: string;
}

// --- 이집트 (Egypt) ---
const EGYPT_LOOT: AfricaLootEntry[] = [
    // 기존 아이템
    { item: "황금 마스크 조관", type: 'Etc', droppedBy: ["파라오의 호위기사", "그림자 피라미드 군주"], chance: 0.01, minLvl: 151, rarity: ItemRarity.EPIC, description: "고대 왕의 권위를 상징하는 파편.", imageUrl: "https://i.ibb.co/hF52JmRK/Gemini-Generated-Image-lugn6ilugn6ilugn.png" },
    { item: "파피루스 조각", type: 'Etc', droppedBy: ["되살아난 미라", "무덤 약탈자"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "고대 지식이 적혀있던 종이 조각.", imageUrl: "https://i.ibb.co/qLqhMPr3/Gemini-Generated-Image-txp7jktxp7jktxp7.png" },
    { item: "신성한 스카라베", type: 'Etc', droppedBy: ["케프리의 거대 스카라베", "태양의 딱정벌레"], chance: 0.05, minLvl: 31, rarity: ItemRarity.RARE, description: "부와 부활을 상징하는 황금 딱정벌레 상.", imageUrl: "https://i.ibb.co/DPZSMGfM/Gemini-Generated-Image-akcqaiakcqaiakcq.png" },
    { item: "바스테트의 조각상", type: 'Etc', droppedBy: ["바스테트의 고양이"], chance: 0.05, minLvl: 51, rarity: ItemRarity.RARE, description: "고양이 여신 바스테트의 작은 성상.", imageUrl: "https://i.ibb.co/bgV4yq7j/Gemini-Generated-Image-n99pltn99pltn99p.png" },
    { item: "아누비스의 저주 지팡이", type: 'Weapon', weaponType: 'Staff', droppedBy: ["죽음의 신 아누비스", "공허의 미라 로드"], chance: 0.02, minLvl: 200, rarity: ItemRarity.UNIQUE, stats: { int: 130, wis: 70 }, options: ["암흑계 속성 부여", "마법 공격력 +25%"], description: "죽음의 신의 마력이 깃든 지팡이.", imageUrl: "https://i.ibb.co/0VWG2nRJ/Gemini-Generated-Image-g52k0lg52k0lg52k.png" },
    { item: "나일강의 성수", type: 'Consumable', chance: 0.01, minLvl: 5, rarity: ItemRarity.UNIQUE, options: ["MP 100 회복","WIS +1(영구)"], description: "생명줄이라 불리는 나일강의 기운이 깃든 물.", imageUrl: "https://i.ibb.co/4Z6fhpSv/Gemini-Generated-Image-7hlp5d7hlp5d7hlp.png" },
    { item: "파라오의 샌들", type: 'Feet', chance: 0.08, minLvl: 60, rarity: ItemRarity.RARE, stats: { agi: 15, wis: 10 }, options: ["물리 회피율 +10%"], description: "모래 위를 걷기 편하게 제작된 고대의 샌들.", imageUrl: "https://i.ibb.co/nMr0SkPj/Gemini-Generated-Image-dmeq5ndmeq5ndmeq.png" },
    { item: "호루스의 눈 펜던트", type: 'Accessory', droppedBy: ["아누비스의 심판관"], chance: 0.05, minLvl: 100, rarity: ItemRarity.EPIC, stats: { wis: 40, ctrl: 30 }, options: ["상태이상 저항 +15%", "물리 명중률 +10%"], description: "모든 악을 꿰뚫어보고 보호한다는 신성한 상징입니다.", imageUrl: "https://i.ibb.co/mFXHnJhw/Gemini-Generated-Image-11f0ef11f0ef11f0.png" },
    { item: "카노푸스 단지", type: 'Etc', droppedBy: ["되살아난 미라"], chance: 0.15, minLvl: 80, rarity: ItemRarity.RARE, description: "장기를 보관하던 고대 용기입니다. 강력한 영적 에너지가 느껴집니다.", imageUrl: "https://i.ibb.co/GQf1bJT9/Gemini-Generated-Image-japk6tjapk6tjapk.png" },
    { item: "사자의 서 (단편)", type: 'Accessory', droppedBy: ["망각의 저승사자", "아누비스의 심판관"], chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { int: 60, wis: 40 }, options: ["암흑계 속성 부여", "MP +20%"], description: "사후 세계로 가는 길을 안내하는 고대 경전의 일부입니다.", imageUrl: "https://i.ibb.co/JWF9jXqm/Gemini-Generated-Image-dzeq2idzeq2idzeq.png" },
    { item: "미라용 아마포", type: 'Consumable', chance: 0.15, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 150 회복", "출혈 상태이상 회복"], description: "방부 처리가 된 질긴 천입니다. 긴급 지혈에 탁월합니다.", imageUrl: "https://i.ibb.co/FbhYVgXG/Gemini-Generated-Image-k2wotok2wotok2wo.png" },
    { item: "스핑크스의 발톱", type: 'Weapon', weaponType: 'Knuckle', chance: 0.04, minLvl: 140, rarity: ItemRarity.UNIQUE, stats: { str: 95, agi: 45 }, options: ["물리 공격력 +20%", "대지계 속성 부여"], description: "바위도 뚫는 스핑크스의 날카로운 발톱을 가공한 무기입니다.", imageUrl: "https://i.ibb.co/QxrjW8N/Gemini-Generated-Image-fh3xarfh3xarfh3x.png" },
    { item: "투탕카멘의 황금 단검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["파라오의 호위기사","오시리스의 영혼"], chance: 0.001, minLvl: 150, rarity: ItemRarity.LEGENDARY, stats: { str: 130, agi: 110, wis: 50 }, options: ["물리 공격력 +25%", "태양계 속성 부여", "AGI +15%"], description: "소년 왕의 무덤에서 발견된, 세월이 흘러도 빛을 잃지 않는 단검입니다.", imageUrl: "https://i.ibb.co/Zpffy0Ws/Gemini-Generated-Image-23sf823sf823sf82.png" },
    { item: "오시리스의 유물", type: 'Etc', droppedBy: ["죽음의 신 아누비스"], chance: 0.035, minLvl: 150, rarity: ItemRarity.EPIC, description: "부활과 재생을 관장하는 신의 기운이 깃든 조각입니다.", imageUrl: "https://i.ibb.co/nMgHQNqW/Gemini-Generated-Image-9i2ryq9i2ryq9i2r.png" }
];

// --- 중앙아프리카 (나이지리아, 케냐, 모로코 등) ---
const CENTRAL_AFRICA_LOOT: AfricaLootEntry[] = [
    // 기존 아이템
    { item: "사바나 사자의 갈기", type: 'Etc', droppedBy: ["사바나의 대장 사자", "야생 들개"], chance: 0.1, minLvl: 11, rarity: ItemRarity.NORMAL, description: "용맹한 사자의 거친 털뭉치.", imageUrl: "https://i.ibb.co/rRhL3sFS/Gemini-Generated-Image-aklz6saklz6saklz.png" },
    { item: "표범 무늬 가죽", type: 'Etc', droppedBy: ["표범 수인", "야생 표범"], chance: 0.08, minLvl: 21, rarity: ItemRarity.MAGIC, description: "은신에 도움을 줄 것 같은 가죽.", imageUrl: "https://i.ibb.co/vC61v7m0/Gemini-Generated-Image-3zegb03zegb03zeg.png" },
    { item: "바오밥 나무 열매", type: 'Etc', droppedBy: ["초원의 정령"], chance: 0.1, minLvl: 11, rarity: ItemRarity.NORMAL, description: "거대 나무의 생명력이 담긴 열매.", imageUrl: "https://i.ibb.co/ksRXHnHN/Gemini-Generated-Image-e4eclge4eclge4ec.png" },
    { item: "부족의 전투 가면", type: 'Etc', droppedBy: ["그림자 부족장", "부족의 영웅 원혼"], chance: 0.01, minLvl: 81, rarity: ItemRarity.RARE, description: "전사의 투지를 일깨우는 기괴한 가면.", imageUrl: "https://i.ibb.co/wZJSH1xb/Gemini-Generated-Image-jdmt7ujdmt7ujdmt.png" },
    { item: "사바나 창", type: 'Weapon', weaponType: 'Spear', chance: 0.02, minLvl: 40, rarity: ItemRarity.RARE, stats: { str: 25, agi: 15 }, description: "사냥에 특화된 가볍고 단단한 창입니다.", imageUrl: "https://i.ibb.co/W4Z1801V/Gemini-Generated-Image-t9orwot9orwot9or.png" },
    { item: "커피 생두", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["MP 30 회복"], description: "에티오피아 고원에서 유래된 각성 효과의 열매.", imageUrl: "https://i.ibb.co/Hp3YqQmt/Gemini-Generated-Image-ijv0fmijv0fmijv0.png" },
    { item: "부족의 펜던트", type: 'Accessory', chance: 0.03, minLvl: 30, rarity: ItemRarity.MAGIC, stats: { def: 5, wis: 15 }, options: ["상태이상 저항 +5%"], description: "부족의 영령이 지켜준다는 믿음이 담긴 장신구.", imageUrl: "https://i.ibb.co/kgTWwrcz/Gemini-Generated-Image-f4oakwf4oakwf4oa.png" },
    { item: "코뿔소의 뿔", type: 'Etc', droppedBy: ["거대 코뿔소"], chance: 0.01, minLvl: 50, rarity: ItemRarity.EPIC, description: "강철보다 단단한 코뿔소의 뿔입니다. 강력한 무기 재료가 됩니다.", imageUrl: "https://i.ibb.co/bRCQ2Rtd/Gemini-Generated-Image-nsjrbjnsjrbjnsjr.png" },
    { item: "사바나의 영광", type: 'Accessory', chance: 0.001, minLvl: 100, rarity: ItemRarity.UNIQUE, stats: { str: 40, agi: 40, def: 20 }, options: ["물리 공격력 +15%", "AGI +10%"], description: "사바나의 진정한 왕만이 지닐 수 있는 증표입니다.", imageUrl: "https://i.ibb.co/WW15B385/Gemini-Generated-Image-r3q86rr3q86rr3q8.png" },
    { item: "모로코식 곡선 단도", type: 'Weapon', weaponType: 'SubSword', chance: 0.05, minLvl: 70, rarity: ItemRarity.RARE, stats: { agi: 45, str: 15 }, options: ["치명타 확률 +10%", "물리 회피율 +5%"], description: "초승달처럼 휘어진 예리한 단검입니다.", imageUrl: "https://i.ibb.co/Pz5wJNVH/Gemini-Generated-Image-6davvw6davvw6dav.png" },
    { item: "부두 주술 인형", type: 'SubWeapon', weaponType: 'Orb', chance: 0.03, minLvl: 110, rarity: ItemRarity.UNIQUE, stats: { int: 80, ctrl: 50 }, options: ["CTRL +20%", "암흑계 속성 부여"], description: "적의 영혼을 구속하는 불길하고 신비로운 인형입니다.", imageUrl: "https://i.ibb.co/r2gprMm7/Gemini-Generated-Image-fm6l4jfm6l4jfm6l.png" },
    { item: "마사이의 전사 방패", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["부족의 영웅 원혼"], chance: 0.05, minLvl: 45, rarity: ItemRarity.RARE, stats: { def: 60, hp: 300 }, options: ["물리 방어력 +12%", "마법 방어력 +20%"], description: "사자 가죽을 덧댄 전통적인 방패로, 전사의 용맹을 상징합니다.", imageUrl: "https://i.ibb.co/WWSPGjLP/Gemini-Generated-Image-80a7v380a7v380a7.png" },
    { item: "아프리카 젬베", type: 'Accessory', chance: 0.05, minLvl: 1, rarity: ItemRarity.RARE, stats: { wis: 25, ctrl: 10 }, options: ["아군 전체 사기 증진 (STR +5%(3턴))"], description: "대지의 고동을 울리는 북입니다. 소리만으로 전사들을 고무시킵니다.", imageUrl: "https://i.ibb.co/JRbDwqf4/Gemini-Generated-Image-syr6tosyr6tosyr6.png" },
    { item: "얼룩말 가죽 가방", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.MAGIC, description: "독특한 무늬가 아름다운 질긴 가죽 가방입니다. 인벤토리 확장에 쓰입니다.", imageUrl: "https://i.ibb.co/hR33bjLS/Gemini-Generated-Image-uwg2sruwg2sruwg2.png" }
];

// --- 남아프리카 (South Africa) ---
const SOUTH_AFRICA_LOOT: AfricaLootEntry[] = [
    // 기존 아이템
    { item: "다이아몬드 원석", type: 'Etc', droppedBy: ["다이아몬드 골렘", "그림자 다이아몬드 킹"], chance: 0.01, minLvl: 61, rarity: ItemRarity.UNIQUE, description: "가공되지 않은 순수한 보석 원석.", imageUrl: "https://i.ibb.co/LD7S6167/Kakao-Talk-20260212-195208562-07.png" },
    { item: "흑철석 결정", type: 'Etc', droppedBy: ["강철 기병", "지하의 군주"], chance: 0.1, minLvl: 81, rarity: ItemRarity.RARE, description: "강철보다 단단한 지하의 광석 결정.", imageUrl: "https://i.ibb.co/RkBJrm9N/Kakao-Talk-20260212-195208562-06.png" },
    { item: "금강석 가루", type: 'Etc', droppedBy: ["금강석 거신"], chance: 0.1, minLvl: 121, rarity: ItemRarity.MAGIC, description: "무기를 연마할 때 쓰이는 아주 단단한 가루.", imageUrl: "https://i.ibb.co/nFCQBCY/Kakao-Talk-20260212-195208562-05.png" },
    { item: "광부의 램프", type: 'Accessory', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, stats: { wis: 5 }, options: ["암흑계 속성 저항 +10%"], description: "어두운 동굴 속을 비추는 낡은 램프.", imageUrl: "https://i.ibb.co/6cyst484/Kakao-Talk-20260212-195208562-04.png" },
    { item: "흑연 조각", type: 'Etc', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "다이아몬드가 되기 전의 탄소 덩어리입니다.", imageUrl: "https://i.ibb.co/DgCZD3pn/Kakao-Talk-20260212-195208562-03.png" },
    { item: "희망봉의 별 원석", type: 'Etc', droppedBy: ["대지의 창조신"], chance: 0.01, minLvl: 180, rarity: ItemRarity.LEGENDARY, description: "전설적인 크기를 자랑하는 거대 다이아몬드 원석입니다.", imageUrl: "https://i.ibb.co/T6b3Dqv/Gemini-Generated-Image-mo56ibmo56ibmo56.png" },
    { item: "백금 너겟", type: 'Etc', droppedBy: ["지하의 군주", "심연의 채굴단장"], chance: 0.03, minLvl: 150, rarity: ItemRarity.UNIQUE, description: "광산 깊은 곳에서 발견되는 귀한 백금 덩어리입니다.", imageUrl: "https://i.ibb.co/xKws31qV/Kakao-Talk-20260212-195208562-02.png" },
    { item: "채굴용 강화 폭약", type: 'Consumable', chance: 0.1, minLvl: 40, rarity: ItemRarity.RARE, options: ["파열 상태이상 부여 (50%)"], description: "단단한 암석을 부수기 위해 제작된 강력한 폭약입니다.", imageUrl: "https://i.ibb.co/dsT7YyDj/Gemini-Generated-Image-la47vgla47vgla47.png" },
    { item: "프로테아 꽃잎", type: 'Consumable', chance: 0.05, minLvl: 10, rarity: ItemRarity.MAGIC, options: ["상태이상 저항 +20% (5턴)"], description: "남아프리카를 상징하는 거대한 꽃의 잎입니다. 정신력을 고양시킵니다.", imageUrl: "https://i.ibb.co/7d0S8s3Z/Kakao-Talk-20260212-195208562-01.png" },
    { item: "테이블 마운틴의 파편", type: 'Etc', droppedBy: ["테이블 마운틴 거인"], chance: 0.2, minLvl: 100, rarity: ItemRarity.RARE, description: "산의 정기가 담긴 묵직한 바위 조각입니다.", imageUrl: "https://i.ibb.co/vCcVFByb/Gemini-Generated-Image-lkz2f5lkz2f5lkz2.png" },
    { item: "블루 다이아몬드 펜던트", type: 'Accessory', droppedBy: ["대지의 창조신"], chance: 0.01, minLvl: 200, rarity: ItemRarity.LEGENDARY, stats: { str: 80, int: 80, def: 120, wis: 80 }, options: ["상태 이상 저항 +25%", "최종 능력치 +12%", "강철계 속성 부여"], description: "심연의 압력을 견디고 탄생한 전설적인 푸른 보석입니다.", imageUrl: "https://i.ibb.co/N63t8zg7/Gemini-Generated-Image-1nfxvk1nfxvk1nfx.png" },
    { item: "사금 주머니", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "강가에서 채취한 반짝이는 금가루가 든 주머니입니다.", imageUrl: "https://i.ibb.co/wNSKRZBD/Kakao-Talk-20260212-195208562.png" }
];

export const AFRICA_MONSTER_LOOT: Record<string, AfricaLootEntry[]> = {
    "이집트": EGYPT_LOOT,
    "나이지리아": CENTRAL_AFRICA_LOOT,
    "케냐": CENTRAL_AFRICA_LOOT,
    "모로코": CENTRAL_AFRICA_LOOT,
    "남아공": SOUTH_AFRICA_LOOT
};