
import { ItemRarity, Stats, WeaponType } from './types';

export interface BeastLootEntry {
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

export const BEAST_MONSTER_LOOT: Record<string, BeastLootEntry[]> = {
    "레오니스 투기국": [
        // --- 일반 재료 및 기타 (Etc) ---
        { item: "야수의 거친 털", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "매우 질기고 튼튼한 짐승의 털입니다.",imageUrl:"https://i.ibb.co/yF4TD0gJ/Gemini-Generated-Image-d5usjod5usjod5us.png" },
        { item: "투기장의 징표", type: 'Etc', droppedBy: ["수인 훈련생", "투기장 마물"], chance: 0.05, minLvl: 11, rarity: ItemRarity.MAGIC, description: "레오니스 투기장에서 사용되는 구리 동전입니다.",imageUrl:"https://i.ibb.co/6cRY0p01/Gemini-Generated-Image-xf56jsxf56jsxf56.png" },
        { item: "바위 뱀의 허물", type: 'Etc', droppedBy: ["바위 뱀"], chance: 0.1, minLvl: 20, rarity: ItemRarity.NORMAL, description: "바위처럼 딱딱하게 굳은 뱀의 허물입니다. 방어구 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/B2r6hz44/Gemini-Generated-Image-y28jjyy28jjyy28j.png" },
        { item: "하이에나의 뼈", type: 'Etc', droppedBy: ["야생 하이에나", "들개"], chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "단단하게 잘 마른 짐승의 뼈입니다.",imageUrl:"https://i.ibb.co/YSqvRfL/Gemini-Generated-Image-uu2jg9uu2jg9uu2j.png"},
        { item: "베헤모스의 가죽 조각", type: 'Etc', droppedBy: ["대평원의 군주 베헤모스"], chance: 0.02, minLvl: 101, rarity: ItemRarity.EPIC, description: "강철보다 단단한 거대 괴수의 가죽입니다.",imageUrl:"https://i.ibb.co/RTSkjn9v/Gemini-Generated-Image-8neqoz8neqoz8neq.png" },
        { item: "사자왕의 황금 갈기", type: 'Etc', droppedBy: ["황금 갈기 사자왕"], chance: 0.01, minLvl: 121, rarity: ItemRarity.UNIQUE, description: "왕의 위엄이 서린 눈부신 금색 털입니다.",imageUrl:"https://i.ibb.co/TDjCLZN7/Gemini-Generated-Image-vjqet3vjqet3vjqe.png" },
        { item: "그리폰의 깃털", type: 'Etc', droppedBy: ["강철 발톱 그리폰"], chance: 0.1, minLvl: 60, rarity: ItemRarity.RARE, description: "강철 같은 광택이 나는 그리폰의 날개 깃털입니다.",imageUrl:"https://i.ibb.co/FkJJ1DGn/Gemini-Generated-Image-mlhot4mlhot4mlho.png" },
        { item: "투기장의 핏빛 모래", type: 'Etc', droppedBy: ["투기장 마물"], chance: 0.05, minLvl: 30, rarity: ItemRarity.MAGIC, description: "수많은 투사들의 피가 스며든 붉은 모래입니다. 불길한 기운이 감돕니다.",imageUrl:"https://i.ibb.co/ym6wBhbs/Gemini-Generated-Image-y67j3y67j3y67j3y.png" },
        // --- 소모품 (Consumable) ---
        { item: "사바나의 고기", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 50 회복"], description: "야생의 에너지가 넘치는 신선한 고기입니다." ,imageUrl:"https://i.ibb.co/NcDZkPV/Gemini-Generated-Image-rq3p8qrq3p8qrq3p.png"},
        { item: "건조된 짐승 심장", type: 'Consumable', chance: 0.05, minLvl: 40, rarity: ItemRarity.RARE, options: ["STR +10 (5턴)"], description: "강한 생명력이 응축된 심장입니다. 먹으면 힘이 솟구칩니다.",imageUrl:"https://i.ibb.co/TqYGSKzW/Gemini-Generated-Image-iexlwoiexlwoiexl.png" },
        { item: "투사의 강장제", type: 'Consumable', chance: 0.05, minLvl: 20, rarity: ItemRarity.MAGIC, options: ["MP 100 회복", "AGI +5% (3턴)"], description: "수인들이 전투 전 마시는 자극적인 약물입니다.",imageUrl:"https://i.ibb.co/nqSyVqvR/Gemini-Generated-Image-qwa0zqqwa0zqqwa0.png" },

        // --- 무기 (Weapon) ---
        { item: "켄타우로스의 롱보우", type: 'Weapon', weaponType: 'Bow', droppedBy: ["거대 켄타우로스"], chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, stats: { agi: 40, str: 10 }, options: ["물리 명중률 +10%", "STR +5%"], description: "켄타우로스 전사들이 사용하는 거대한 장궁입니다.", imageUrl: "https://i.ibb.co/DPJRYJsY/Gemini-Generated-Image-t7sfcet7sfcet7sf.png" },
        { item: "오크의 거대 도끼", type: 'Weapon', weaponType: 'Axe', droppedBy: ["전투 오크"], chance: 0.05, minLvl: 40, rarity: ItemRarity.RARE, stats: { str: 55, def: -10 }, options: ["치명타율 +20%"], description: "투박하지만 엄청난 파괴력을 지닌 오크의 양손 도끼입니다.", imageUrl: "https://i.ibb.co/wGHGRqx/Gemini-Generated-Image-41uiv841uiv841ui.png" },
        { item: "무신의 부서진 건틀릿", type: 'Weapon', weaponType: 'Knuckle', droppedBy: ["무신 골렘", "태초의 무신"], chance: 0.02, minLvl: 151, rarity: ItemRarity.UNIQUE, stats: { str: 150, def: 80 }, options: ["물리 방어력 +15%", "신체강화계 속성 부여"], description: "전설적인 무투가가 사용했던 무거운 건틀릿.", imageUrl: "https://i.ibb.co/0yks6cXY/Gemini-Generated-Image-t7i8mit7i8mit7i8.png" },
        { item: "대족장의 뼈 지팡이", type: 'Weapon', weaponType: 'Staff', droppedBy: ["수인 대족장"], chance: 0.03, minLvl: 90, rarity: ItemRarity.EPIC, stats: { int: 80, wis: 60, ctrl: 40 }, options: ["마법 공격력 +20%", "신체강화계 속성 부여"], description: "역대 대족장들의 신력이 깃든 상징적인 지팡이입니다.", imageUrl: "https://i.ibb.co/Kpg666Hs/Gemini-Generated-Image-s1pqrms1pqrms1pq.png" },

        // --- 방어구 및 보조장비 (Armor / SubWeapon) ---
        { item: "그리폰 가죽 장화", type: 'Feet', droppedBy: ["강철 발톱 그리폰"], chance: 0.03, minLvl: 70, rarity: ItemRarity.UNIQUE, stats: { agi: 50, def: 20 }, options: ["물리 회피율 +10%", "AGI +10%"], description: "바람을 타고 달리는 듯한 가벼움을 주는 가죽 장화입니다.", imageUrl: "https://i.ibb.co/jP5LyJjT/Gemini-Generated-Image-e8k8rve8k8rve8k8.png" },
        { item: "투기장의 철벽 방패", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["투기장 마물", "전투 오크"], chance: 0.05, minLvl: 45, rarity: ItemRarity.RARE, stats: { def: 60, hp: 300 }, options: ["물리 방어력 +15%", "HP +5%"], description: "수많은 타격을 견뎌낸 흔적이 있는 낡은 철제 방패입니다.", imageUrl: "https://i.ibb.co/39xBLBjW/Gemini-Generated-Image-dwvrivdwvrivdwvr.png" },
        { item: "키메라의 가시 흉갑", type: 'Body', droppedBy: ["키메라"], chance: 0.04, minLvl: 85, rarity: ItemRarity.EPIC, stats: { def: 100, str: 30 }, options: ["상태이상 저항 +10%", "물리 방어력 +20%"], description: "키메라의 단단한 비늘과 독가시를 엮어 만든 기괴한 갑옷입니다.", imageUrl: "https://i.ibb.co/KjZKmzdN/Gemini-Generated-Image-tra7i1tra7i1tra7.png" },
        // --- 장신구 (Accessory) ---
        { item: "투사장의 피묻은 붕대", type: 'Accessory', droppedBy: ["투사장 펜릴의 분신"], chance: 0.08, minLvl: 81, rarity: ItemRarity.RARE, stats: { str: 30, def: 20 }, options: ["물리 공격력 +5%"], description: "수많은 승리를 거둔 투사장의 붕대.",imageUrl:"https://i.ibb.co/LdgcZTt0/Gemini-Generated-Image-6xgdoy6xgdoy6xgd.png" },
        { item: "펜릴의 송곳니 목걸이", type: 'Accessory', droppedBy: ["투사장 펜릴의 분신", "전설의 펜리르"], chance: 0.02, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { str: 50, agi: 50, ctrl: 30 }, options: ["치명타 확률 +15%", "상태이상 저항 +5%"], description: "늑대왕 펜릴의 기운이 느껴지는 위협적인 목걸이입니다.", imageUrl: "https://i.ibb.co/s8dNWGs/Gemini-Generated-Image-riqaw4riqaw4riqa.png" },
        { item: "사바나의 이빨 반지", type: 'Accessory', chance: 0.05, minLvl: 10, rarity: ItemRarity.MAGIC, stats: { str: 5 }, options: ["AGI +5"], description: "들개의 이빨을 엮어 만든 거친 반지입니다.",imageUrl:"https://i.ibb.co/TDySWtFT/Gemini-Generated-Image-tpvrnwtpvrnwtpvr.png" },
        { item: "무신 골렘의 동력핵", type: 'Accessory', droppedBy: ["무신 골렘"], chance: 0.02, minLvl: 110, rarity: ItemRarity.EPIC, stats: { def: 60, ctrl: 60, maxMp: 500 }, options: ["상태이상 저항 +20%", "DEF +10%"], description: "기계 골렘의 가슴에서 추출한 요동치는 마력 코어입니다.",imageUrl:"https://i.ibb.co/ZCq83wp/Gemini-Generated-Image-ul9w0hul9w0hul9w.png" }
    ]
};
