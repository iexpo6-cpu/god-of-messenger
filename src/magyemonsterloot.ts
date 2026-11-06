import { ItemRarity, Stats, WeaponType } from './types';

export interface MagyeLootEntry {
    item: string;
    type: 'Etc' | 'Weapon' | 'SubWeapon' | 'Head' | 'Body' | 'Feet' | 'Hand' | 'Accessory' | 'Consumable';
    weaponType?: WeaponType;
    droppedBy?: string[];
    chance: number;
    minLvl: number;
    rarity: ItemRarity;
    stats?: Partial<Stats>;
    options?: string[];
    imageUrl?: string;
    description: string;
}

const MAGYE_LOOT: MagyeLootEntry[] = [
    { item: "부패한 살점", type: 'Etc', droppedBy: ["부패한 슬라임", "심연 들쥐", "지옥 딱정벌레"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "마계 생물의 부패한 조각입니다.",imageUrl:"https://i.ibb.co/B5Z91FQ9/Gemini-Generated-Image-m60qs1m60qs1m60q.png" },
    { item: "피의 정수", type: 'Etc', droppedBy: ["피의 광신도", "피의 홍수", "마계 경비병"], chance: 0.05, minLvl: 11, rarity: ItemRarity.MAGIC, description: "마력을 머금은 붉은 정수입니다.",imageUrl:"https://i.ibb.co/MDs9JVrv/Gemini-Generated-Image-hggr5khggr5khggr.png" },
    { item: "심연의 흑철석", type: 'Etc', droppedBy: ["강철 가시 마수", "심연의 가고일 로드", "심연의 기사단장"], chance: 0.05, minLvl: 151, rarity: ItemRarity.RARE, description: "마계의 어둠을 머금은 철광석.",imageUrl:"https://i.ibb.co/3JyKPsh/Gemini-Generated-Image-t8b4vlt8b4vlt8b4.png" },
    { item: "마신의 부러진 뿔", type: 'Etc', droppedBy: ["마신 임페리얼의 분신", "마계 대장군", "공포의 집행자"], chance: 0.02, minLvl: 101, rarity: ItemRarity.EPIC, description: "강력한 마족의 권위가 담긴 뿔 조각.",imageUrl:"https://i.ibb.co/twbRYWVT/Gemini-Generated-Image-b9ct9sb9ct9sb9ct.png" },
    { item: "7대 죄악의 인장", type: 'Etc', droppedBy: ["마계 제너럴들의 분신", "죄악의 전도사", "진정한 루시퍼"], chance: 0.01, minLvl: 251, rarity: ItemRarity.UNIQUE, description: "타락한 자들의 증표입니다.",imageUrl:"https://i.ibb.co/rKFfhsFp/Gemini-Generated-Image-nttkb0nttkb0nttk.png" },
    { item: "임페리얼 다크 블레이드(虛無)", type: 'Weapon', weaponType: 'Sword', droppedBy: ["마계 대장군", "공포의 집행자", "마신 임페리얼의 분신"], chance: 0.01, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 200, ctrl: 100 }, options: ["암흑계 속성 부여", "암흑계 속성 피해 +100%","STR +20%"], description: "제국의 정점들이 사용하는 그림자 검.",imageUrl:"https://i.ibb.co/MDd9NFY5/Gemini-Generated-Image-s9gu8qs9gu8qs9gu.png" },
    { item: "타락한 천사의 날개깃", type: 'Accessory', droppedBy: ["공허의 루시퍼 파편", "검은 구원자", "타락한 대천사"], chance: 0.01, minLvl: 221, rarity: ItemRarity.UNIQUE, stats: { agi: 120, int: 80 }, options: ["마법 회피율 +15%", "상태이상 저항 +10%"], description: "슬픔과 마력이 깃든 검은 깃털.",imageUrl:"https://i.ibb.co/GfRgbHJ8/Gemini-Generated-Image-xfauv2xfauv2xfau.png" },
    { item: "마력의 정수", type: "Etc", chance: 0.01, minLvl:100, rarity: ItemRarity.UNIQUE, description: "강력한 마력의 정수이다.", imageUrl: "https://i.ibb.co/jkV1CtJy/Kakao-Talk-20260105-221438797-03.png"},
    { item: "죄악의 찌꺼기", type: 'Etc', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "마계의 대기에 떠도는 불결한 에너지의 결정입니다.",imageUrl:"https://i.ibb.co/CpHtP8jY/Gemini-Generated-Image-g19ik7g19ik7g19i.png" },
    { item: "지옥견의 송곳니", type: 'Etc', droppedBy: ["타락한 수견", "지옥마"], chance: 0.1, minLvl: 20, rarity: ItemRarity.MAGIC, description: "지옥의 짐승이 남긴 날카로운 송곳니입니다.",imageUrl:"https://i.ibb.co/HLF85tSF/Gemini-Generated-Image-yda5slyda5slyda5.png" },
    { item: "고통의 파편", type: 'Etc', droppedBy: ["고통의 유령", "영혼 갈취자"], chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, description: "희생자들의 비명이 얼어붙어 만들어진 보석입니다.",imageUrl:"https://i.ibb.co/35d1TwfS/Gemini-Generated-Image-g3ub51g3ub51g3ub.png" },
    { item: "타락한 마나 포션", type: 'Consumable', chance: 0.05, minLvl: 30, rarity: ItemRarity.RARE, options: ["MP 300 회복", "일시적 INT +5%(5턴)"], description: "강력하지만 몸에 해로운 마계의 마력 농축액입니다.",imageUrl:"https://i.ibb.co/rKpBJSR6/Gemini-Generated-Image-ydc0sdydc0sdydc0.png" },
    { item: "심연의 눈알", type: 'Accessory', droppedBy: ["영원한 어둠의 눈", "심연의 가고일"], chance: 0.03, minLvl: 80, rarity: ItemRarity.RARE, stats: { int: 25, ctrl: 20 }, options: ["물리 명중률 +10%"], description: "사방을 감시하는 기괴한 마법 장신구입니다.",imageUrl:"https://i.ibb.co/dsPFPLW6/Gemini-Generated-Image-snz99gsnz99gsnz9.png" },
    { item: "베엘제붑의 파리 반지", type: 'Accessory', droppedBy: ["심연의 베엘제붑", "베엘제붑의 하수인"], chance: 0.02, minLvl: 150, rarity: ItemRarity.EPIC, stats: { int: 40, wis: 40, ctrl: 20 }, options: ["모든 속성 저항 +10%", "초화계 속성 부여"], description: "식탐의 주군이 하사한 불길한 반지입니다.",imageUrl:"https://i.ibb.co/Df31Ht2n/Gemini-Generated-Image-uo073muo073muo07.png" },
    { item: "카오스의 잔영", type: 'Etc', droppedBy: ["카오스의 잔영", "무(無)의 파편"], chance: 0.01, minLvl: 250, rarity: ItemRarity.UNIQUE, description: "형체도 기척도 없는 혼돈의 파편입니다.",imageUrl:"https://i.ibb.co/yc1tdHTK/Gemini-Generated-Image-8b42tr8b42tr8b42.png" },

    // 일반/잡화 (Etc)
    { item: "그림자 박쥐의 날개", type: 'Etc', droppedBy: ["그림자 박쥐"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "얇고 질긴 가죽 재질의 날개입니다.",imageUrl:"https://i.ibb.co/BVXbvgHb/Gemini-Generated-Image-ghag9wghag9wghag.png" },
    { item: "지옥 딱정벌레의 껍질", type: 'Etc', droppedBy: ["지옥 딱정벌레"], chance: 0.05, minLvl: 10, rarity: ItemRarity.MAGIC, description: "열기에 강한 내성을 가진 단단한 외골격입니다.",imageUrl:"https://i.ibb.co/L7LGNqn/Gemini-Generated-Image-btddc9btddc9btdd.png" },
    { item: "마족의 굽은 뿔", type: 'Etc', droppedBy: ["하급 임프", "마계 경비병"], chance: 0.02, minLvl: 20, rarity: ItemRarity.MAGIC, description: "마족의 머리에서 자라난 투박한 뿔 조각입니다.",imageUrl:"https://i.ibb.co/XxZb4jFG/Gemini-Generated-Image-c8jiplc8jiplc8ji.png" },
    { item: "심연의 검은 이끼", type: 'Etc', chance: 0.01, minLvl: 50, rarity: ItemRarity.RARE, description: "빛이 없는 곳에서 마력을 먹고 자라는 이끼입니다.",imageUrl:"https://i.ibb.co/5hy1zsWS/Gemini-Generated-Image-db3pidb3pidb3pid.png" },
    { item: "영혼의 촛대", type: 'Etc', droppedBy: ["영혼 약탈자", "고통의 유령"], chance: 0.03, minLvl: 100, rarity: ItemRarity.EPIC, description: "영혼의 불꽃을 담아두는 기괴한 형태의 촛대입니다.",imageUrl:"https://i.ibb.co/YBF9QcW0/Gemini-Generated-Image-arvxu1arvxu1arvx.png" },
    { item: "뒤틀린 차원의 문고리", type: 'Etc', droppedBy: ["차원을 찢는 리바이어던", "무(無)의 파편"], chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, description: "공간의 인과율이 뒤틀린 수수께끼의 금속 물체입니다.",imageUrl:"https://i.ibb.co/MxzfzLp0/Gemini-Generated-Image-z2j3u4z2j3u4z2j3.png" },

    // 소모품 (Consumable)
    { item: "심연의 열매", type: 'Consumable', chance: 0.08, minLvl: 1, rarity: ItemRarity.MAGIC, options: ["HP 300 회복", "DEF -5% (3턴)"], description: "달콤하지만 신체를 일시적으로 무르게 만드는 열매입니다.",imageUrl:"https://i.ibb.co/TMmTLyQL/Gemini-Generated-Image-67qc8j67qc8j67qc.png"},
    { item: "말린 지옥지렁이", type: 'Consumable', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, options: ["HP 50 회복"], description: "마계의 흔한 비상식량입니다. 맛은 끔찍합니다.",imageUrl:"https://i.ibb.co/9kSdNKqg/Gemini-Generated-Image-m27fkum27fkum27f.png" },
    { item: "죄악의 성수", type: 'Consumable', chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, options: ["MP 2000 회복"], description: "마력을 폭발시키지만 영혼을 타락시키는 불길한 액체입니다.",imageUrl:"https://i.ibb.co/9kbHy7vt/Gemini-Generated-Image-k58daek58daek58d.png" },
    { item: "망각의 가루", type: 'Consumable', chance: 0.01, minLvl: 120, rarity: ItemRarity.UNIQUE, options: ["상태이상 해제(공포, 혼란)", "INT +1(영구)"], description: "정신적인 고통을 잊게 해주는 마약 성분의 가루입니다.",imageUrl:"https://i.ibb.co/mYRZ5qc/Gemini-Generated-Image-pghcpupghcpupghc.png" },

    // 장비류 (Equipment)
    { item: "그림자 추적자의 장화", type: 'Feet', droppedBy: ["그림자 추적자"], chance: 0.04, minLvl: 40, rarity: ItemRarity.RARE, stats: { agi: 30, def: 10 }, options: ["물리 회피율 +5%", "암흑계 속성 저항 +10%"], description: "어둠 속에서 발소리를 지워주는 가죽 장화입니다.",imageUrl:"https://i.ibb.co/0VFxz4Tp/Gemini-Generated-Image-efo3y8efo3y8efo3.png" },
    { item: "심연의 가고일 건틀릿", type: 'Hand', droppedBy: ["심연의 가고일"], chance: 0.03, minLvl: 70, rarity: ItemRarity.RARE, stats: { str: 35, def: 20 }, options: ["물리 공격력 +8%", "강철계 속성 저항 +5%"], description: "가고일의 피부처럼 딱딱하게 굳은 석제 장갑입니다.",imageUrl:"https://i.ibb.co/WWwRqjBn/Gemini-Generated-Image-5wz6k25wz6k25wz6.png" },
    { item: "타락한 기사의 투구", type: 'Head', droppedBy: ["타락한 기사"], chance: 0.025, minLvl: 110, rarity: ItemRarity.EPIC, stats: { def: 55, wis: 20 }, options: ["상태이상 저항 +15%", "물리 회피율 +5%"], description: "주인을 잃고 증오만 남은 기사의 투구입니다.",imageUrl:"https://i.ibb.co/vxMZRcHX/Gemini-Generated-Image-kex2z5kex2z5kex2.png" },
    { item: "서큐버스의 유혹 펜던트", type: 'Accessory', droppedBy: ["굶주린 서큐버스"], chance: 0.02, minLvl: 130, rarity: ItemRarity.EPIC, stats: { int: 40, wis: 30, ctrl: 20 }, options: ["물리 회피율 +10%", "MP +25%"], description: "상대의 이성을 마비시키는 서큐버스의 장신구입니다.",imageUrl:"https://i.ibb.co/wrBKgCsN/Gemini-Generated-Image-aaobg4aaobg4aaob.png" },
    { item: "제너럴의 부러진 검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["마계 제너럴들의 분신", "마계 대장군"], chance: 0.015, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { str: 110, agi: 50 }, options: ["모든 속성 피해 +15%", "암흑계 피해 +20%"], description: "제너럴이 사용하던 검의 파편을 다시 이어 붙인 무기입니다.",imageUrl:"https://i.ibb.co/gLvCJ3sC/Gemini-Generated-Image-6nhxsm6nhxsm6nhx.png" },
    { item: "심연의 통곡 스태프", type: 'Weapon', weaponType: 'Staff', droppedBy: ["암흑 사제", "심연의 기사단장"], chance: 0.01, minLvl: 200, rarity: ItemRarity.LEGENDARY, stats: { int: 160, wis: 90, ctrl: 40 }, options: ["마법 공격력 +30%", "모든 속성 저항 +5%", "MP +10%"], description: "심연의 원혼들이 내지르는 비명이 마력이 되어 흐르는 지팡이입니다.",imageUrl:"https://i.ibb.co/QFr20Y3B/Gemini-Generated-Image-41np8m41np8m41np.png" },
    { item: "마인 후작의 인장 반지", type: 'Accessory', droppedBy: ["마인 대공의 환영", "죄악의 전도사"], chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { str: 40, int: 40, def: 40, agi: 40, wis: 40, ctrl: 40 }, options: ["모든 능력치 +15%"], description: "제국의 귀족임을 증명하는 고귀한 인장 반지입니다.",imageUrl:"https://i.ibb.co/j9Y4q9p5/Gemini-Generated-Image-es5frxes5frxes5f.png" },
    { item: "공허의 그림자 망토", type: 'Body', droppedBy: ["공허의 루시퍼 파편", "검은 구원자"], chance: 0.005, minLvl: 200, rarity: ItemRarity.LEGENDARY, stats: { def: 120, agi: 100, wis: 80 }, options: ["모든 속성 저항 +15%", "물리 회피율 +20%", "암흑계 속성 부여"], description: "실체가 없는 공허의 기운으로 짠 신비로운 망토입니다.",imageUrl:"https://i.ibb.co/4ZQLzVX3/Gemini-Generated-Image-jk2zlejk2zlejk2z.png" }
];

export const MAGYE_MONSTER_LOOT: Record<string, MagyeLootEntry[]> = {
    "임페리얼 제국": MAGYE_LOOT
};