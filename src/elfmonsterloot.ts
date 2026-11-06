import { ItemRarity, Stats, WeaponType } from './types';

export interface ElfLootEntry {
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

export const ELF_MONSTER_LOOT: Record<string, ElfLootEntry[]> = {
    "미르탈 숲연합": [
        // --- 일반 재료 및 기타 (Etc) ---
        { item: "반짝이는 날개 가루", type: 'Etc', droppedBy: ["숲의 픽시", "오염된 요정"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "요정의 날개에서 떨어진 마법 가루입니다.", imageUrl: "https://i.ibb.co/M53n9xzR/Gemini-Generated-Image-mf809kmf809kmf80.png" },
        { item: "정령의 숲 이끼", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "희미한 빛을 내는 이끼. 연금술 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/ym0cx19D/Gemini-Generated-Image-7i7sll7i7sll7i7s.png" },
        { item: "세계수의 잔가지", type: 'Etc', droppedBy: ["고대 엔트", "숲의 파수꾼"], chance: 0.05, minLvl: 31, rarity: ItemRarity.RARE, description: "강인한 생명력이 깃든 나뭇가지입니다.", imageUrl: "https://i.ibb.co/gpgfX5c/Gemini-Generated-Image-qumvwsqumvwsqumv.png" },
        { item: "실바나르 은 화살", type: 'Etc', droppedBy: ["엘프 정찰병 원혼"], chance: 0.1, minLvl: 11, rarity: ItemRarity.MAGIC, description: "정교하게 세공된 엘프의 화살촉입니다.",imageUrl:"https://i.ibb.co/HDv1DkXs/Gemini-Generated-Image-f3hb3nf3hb3nf3hb.png" },
        { item: "유니콘의 뿔 조각", type: 'Etc', droppedBy: ["실바나르 유니콘"], chance: 0.03, minLvl: 61, rarity: ItemRarity.UNIQUE, description: "순수한 마력이 깃든 유니콘의 뿔 파편입니다.",imageUrl:"https://i.ibb.co/20ktb2pZ/Gemini-Generated-Image-i6oauni6oauni6oa.png" },
        { item: "가디언의 비취 핵", type: 'Etc', droppedBy: ["숲의 가디언 골렘"], chance: 0.05, minLvl: 81, rarity: ItemRarity.RARE, description: "숲의 수호 골렘을 움직이던 동력원입니다.",imageUrl:"https://i.ibb.co/NgpJ2Ffz/Gemini-Generated-Image-ea0na1ea0na1ea0n.png" },
        { item: "정령의 눈물", type: 'Etc', droppedBy: ["정령의 인도자", "타락한 상급 정령"], chance: 0.01, minLvl: 61, rarity: ItemRarity.UNIQUE, description: "순수한 마력이 결정화된 보석입니다.", imageUrl: "https://i.ibb.co/r2Cz6S6h/Gemini-Generated-Image-x8pbjkx8pbjkx8pb.png" },
        { item: "독안개 주머니", type: 'Etc', droppedBy: ["독안개 히드라"], chance: 0.1, minLvl: 70, rarity: ItemRarity.MAGIC, description: "히드라의 체내에 있던 독가스 주머니입니다.",imageUrl:"https://i.ibb.co/BVVdDy97/Gemini-Generated-Image-xpd020xpd020xpd0.png"},
        // --- 소모품 (Consumable) ---
        { item: "야생 숲의 열매", type: 'Consumable', chance: 0.15, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 30 회복"], description: "정령의 기운을 머금어 상큼하고 달콤한 열매입니다.",imageUrl:"https://i.ibb.co/FqDwvJf0/Gemini-Generated-Image-9dutum9dutum9dut.png" },
        { item: "자연의 이슬", type: 'Consumable', chance: 0.05, minLvl: 20, rarity: ItemRarity.MAGIC, options: ["MP 150 회복"], description: "새벽녘 세계수의 잎사귀에서 모은 신성한 이슬입니다.", imageUrl: "https://i.ibb.co/JwZnF2SG/Gemini-Generated-Image-i0is7oi0is7oi0is.png" },
        { item: "생명수의 샘물", type: 'Consumable', chance: 0.01, minLvl: 100, rarity: ItemRarity.EPIC, options: ["HP/MP 50% 회복","CTRL +1(영구)"], description: "세계수의 뿌리에서 솟아나는 태초의 물입니다.", imageUrl: "https://i.ibb.co/S45Cnk60/Gemini-Generated-Image-o3c1eyo3c1eyo3c1.png" },
        { item: "정령의 속삭임", type: 'Consumable', chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, options: ["일시적 WIS +10% (5턴)"], description: "마시면 정령들의 목소리가 들리며 정신이 맑아집니다.",imageUrl:"https://i.ibb.co/27YpyjVz/Gemini-Generated-Image-dfxzpidfxzpidfxz.png"},
        // --- 무기 (Weapon) ---
        { item: "엘프 장인의 잎사귀 단검", type: 'Weapon', weaponType: 'Sword', chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, stats: { agi: 25, int: 10 }, options: ["AGI +10%", "초화계 속성 부여"], description: "잎사귀처럼 가볍고 날카로운 단검입니다.", imageUrl: "https://i.ibb.co/Q35QyY2B/Gemini-Generated-Image-jyte2fjyte2fjyte.png" },
        { item: "나무 정령의 지팡이", type: 'Weapon', weaponType: 'Staff', droppedBy: ["고대 엔트", "정령의 인도자"], chance: 0.05, minLvl: 40, rarity: ItemRarity.RARE, stats: { int: 35, wis: 45 }, options: ["마법 공격력 +12%", "초화계 속성 부여"], description: "살아있는 나무로 만들어진 신비한 지팡이입니다.",imageUrl:"https://i.ibb.co/ZR7637t5/Gemini-Generated-Image-d0cxbid0cxbid0cx.png" },
        // --- 방어구 (Armor) ---
        { item: "은빛 잎사귀 투구", type: 'Head', chance: 0.05, minLvl: 30, rarity: ItemRarity.MAGIC, stats: { def: 15, wis: 5 }, description: "은빛 잎사귀를 엮어 만든 가벼운 투구입니다.",imageUrl:"https://i.ibb.co/fdkMnNF6/Gemini-Generated-Image-wd3oprwd3oprwd3o.png" },
        { item: "성역의 나비 날개 옷", type: 'Body', droppedBy: ["노래하는 나비", "정령의 인도자"], chance: 0.05, minLvl: 120, rarity: ItemRarity.UNIQUE, stats: { def: 60, agi: 40, wis: 40 }, options: ["물리 회피율 +15%", "마법 방어력 +20%"], description: "나비의 날개처럼 가볍고 환상적인 옷입니다.",imageUrl:"https://i.ibb.co/yBZKkFch/Gemini-Generated-Image-oxf0nqoxf0nqoxf0.png"},
        { item: "에테르나의 보존 신발", type: 'Feet', droppedBy: ["엘프 여왕 엘라디아의 투영"], chance: 0.001, minLvl: 201, rarity: ItemRarity.LEGENDARY, stats: { wis: 120, ctrl: 120, def: 50 }, options: ["상태이상 저항 +30%", "HP +20%", "AGI +5%"], description: "결코 시들지 않는 성역의 기운이 담긴 신발.", imageUrl: "https://i.ibb.co/219QKJfj/Gemini-Generated-Image-836wy2836wy2836w.png" },
        { item: "엘프제 실크 장갑", type: 'Hand', chance: 0.05, minLvl: 20, rarity: ItemRarity.MAGIC, stats: { def: 10, int: 10 }, description: "부드러운 실크로 제작되어 마력 전도율이 높은 장갑입니다.",imageUrl:"https://i.ibb.co/NnWx11T7/Gemini-Generated-Image-wue5piwue5piwue5.png" },

        // --- 장신구 및 보조무기 (Accessory / SubWeapon) ---
        { item: "여왕의 가호 펜던트", type: 'Accessory', droppedBy: ["엘프 여왕 엘라디아의 투영"], chance: 0.001, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { wis: 100, ctrl: 100 }, options: ["모든 상태이상 저항 +20%", "초화계 속성 부여"], description: "엘프 여왕의 마력이 깃든 신성한 장신구.", imageUrl: "https://i.ibb.co/mrYKPBxs/Gemini-Generated-Image-u2bztvu2bztvu2bz.png" },
        { item: "엘라디아의 비전서", type: 'SubWeapon', weaponType: 'Grimoire', droppedBy: ["엘프 여왕 엘라디아의 투영"], chance: 0.001, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { int: 200, wis: 150, ctrl: 100 }, options: ["마법 공격력 +40%", "MP +20%", "초화계 속성 부여"], description: "태초의 자연 마법이 기록된 엘프족의 보물.",imageUrl:"https://i.ibb.co/bg50ZYMn/Gemini-Generated-Image-a8eqgoa8eqgoa8eq.png" },
        { item: "은빛 숲의 방패", type: 'SubWeapon', weaponType: 'Shield', chance: 0.03, minLvl: 40, rarity: ItemRarity.RARE, stats: { def: 60, hp: 400 }, options: ["물리 방어력 +15%", "마법 방어력 +10%"], description: "은색 나무를 깎아 만든 가볍고 단단한 방패입니다.",imageUrl:"https://i.ibb.co/pvcmCBNQ/Gemini-Generated-Image-agcs7kagcs7kagcs.png"},
        { item: "세계수의 정수", type: 'Etc', chance: 0.001, minLvl: 200, rarity: ItemRarity.LEGENDARY, description: "신의 권능에 필적하는 태초의 생명 에너지입니다.", imageUrl: "https://i.ibb.co/v6pHyJ47/Kakao-Talk-20260105-190804166.png" }
    ]
};