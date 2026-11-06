import { ItemRarity, Stats, WeaponType } from './types';

export interface AsiaLootEntry {
    item: string;
    type: 'Etc' | 'Weapon' | 'SubWeapon' | 'Head' | 'Body' | 'Feet' | 'Hand' | 'Accessory' | 'Consumable';
    weaponType?: WeaponType;
    droppedBy?: string[]; // 비어있으면 해당 지역 공용 드랍
    chance: number;
    minLvl: number;
    rarity: ItemRarity;
    stats?: Partial<Stats>;
    options?: string[];
    description: string;
    imageUrl?: string;
    elementalType?: string;
    
}

// --- 대한민국 (Korea) 전리품 확장 ---
const KOREA_LOOT: AsiaLootEntry[] = [
    { item: "산삼 뿌리", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 100 회복"], description: "영험한 기운이 서린 산삼의 뿌리입니다." ,imageUrl:"https://i.ibb.co/TMvKnYfM/Gemini-Generated-Image-th72oith72oith72.png"},
    { item: "벽조목 조각", type: 'Etc', droppedBy: ["심술궂은 도깨비", "두억시니"], chance: 0.1, minLvl: 50, rarity: ItemRarity.RARE, description: "벼락 맞은 대추나무 조각. 강한 양의 기운이 깃들어 있습니다.",imageUrl:"https://i.ibb.co/4nL2mBqs/Gemini-Generated-Image-ablvnwablvnwablv.png" },
    { item: "도깨비 방망이 조각", type: 'Etc', droppedBy: ["심술궂은 도깨비","두억시니", "산적 두목"], chance: 0.1, minLvl: 31, rarity: ItemRarity.RARE, description: "금이 쏟아질 것 같은 방망이 파편.", imageUrl:"https://i.ibb.co/GvYpZYSN/Gemini-Generated-Image-4vg2vw4vg2vw4vg2.png" },
    { item: "오색 비단", type: 'Etc', chance: 0.05, minLvl: 20, rarity: ItemRarity.MAGIC, description: "무지갯빛 광택이 나는 귀한 비단입니다.",imageUrl:"https://i.ibb.co/Z6BkFRLS/Gemini-Generated-Image-7xebn37xebn37xeb.png" },
    { item: "여우 구슬", type: 'Accessory', droppedBy: ["천 년 묵은 구미호"], chance: 0.03, minLvl: 80, rarity: ItemRarity.EPIC, stats: { int: 30, wis: 20 }, options: ["마법 공격력 +10%", "월광계 속성 부여"], description: "구미호의 정수가 담긴 신비로운 구슬.",imageUrl:"https://i.ibb.co/hF4wpZNH/Gemini-Generated-Image-hjk2xhjk2xhjk2xh.png" },
    { item: "불가사리의 쇠조각", type: 'Etc', droppedBy: ["심연의 불가사리"], chance: 0.06, minLvl: 151, rarity: ItemRarity.UNIQUE, description: "쇠를 먹는 불가사리가 남긴 단단한 금속.", imageUrl:"https://i.ibb.co/xt3qLyNS/Gemini-Generated-Image-wz7ms7wz7ms7wz7m.png" },
    { item: "두정갑 파편", type: 'Etc', droppedBy: ["타락한 화랑 유령"], chance: 0.05, minLvl: 101, rarity: ItemRarity.RARE, description: "조선 장수의 갑옷 조각입니다.", imageUrl:"https://i.ibb.co/Z1c64DsH/Gemini-Generated-Image-7yb6dk7yb6dk7yb6.png"},
    { item: "청룡의 역린검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["청룡"], chance: 0.01, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 100, agi: 80 }, options: ["물리 공격력 +20%", "해수계 속성 부여","해수계 속성 피해 +20%","STR +15%"], description: "사방신 청룡의 비늘로 제련된 검.",imageUrl:"https://i.ibb.co/ksR236f9/Gemini-Generated-Image-rub865rub865rub8.png" },
    { item: "백호의 발톱 너클", type: 'Weapon', weaponType: 'Knuckle', droppedBy: ["백호"], chance: 0.01, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 120, agi: 60 }, options: ["물리공격력 +20%","치명타 확률 +15%", "신체강화계 속성 부여"], description: "백호의 기운이 깃든 파괴적인 너클.",imageUrl:"https://i.ibb.co/wrFMHBqn/Gemini-Generated-Image-89jws089jws089jw.png" },
    { item: "해태의 수호 방패", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["신수 해태", "지옥의 해태"], chance: 0.06, minLvl: 151, rarity: ItemRarity.UNIQUE, stats: { def: 120, wis: 50 }, options: ["물리 방어력 +20%", "광휘계 속성 부여"], description: "악을 물리치는 해태의 기운이 담긴 방패.",imageUrl:"https://i.ibb.co/DgV77n9G/Gemini-Generated-Image-wy5go9wy5go9wy5g.png" },
    { item: "사인검", type: 'Weapon', weaponType: 'Sword', chance: 0.01, minLvl: 200, rarity: ItemRarity.UNIQUE, stats: { str: 80, wis: 80 }, options: ["물리공격력 +20%", "광휘계 속성 부여","광휘계 속성 피해 +15%"], description: "인년, 인월, 인일, 인시에 제련된 사악한 기운을 베는 검.",imageUrl:"https://i.ibb.co/hRPdwHMP/Gemini-Generated-Image-1lu7sk1lu7sk1lu7.png" },
     { item: "화룡의 창", type: 'Weapon', weaponType: 'Spear', chance: 0.02,  droppedBy: ["분노한 화룡"],minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { str: 80, agi: 80 }, options: ["물리공격력 +20%", "화염계 속성 부여","화염계 속성 피해 +10%"], description: "화룡의 분노가 깃든 창.",imageUrl:"https://i.ibb.co/CKN8472S/Gemini-Generated-Image-hzi6bbhzi6bbhzi6.png" },
    { item: "부서진 갓", type: 'Etc', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "선비들이 쓰던 갓의 잔해입니다. 질긴 말총으로 만들어졌습니다.", imageUrl:"https://i.ibb.co/s9RqfwJp/Gemini-Generated-Image-u31nbvu31nbvu31n.png" },
    { item: "어둑시니의 눈물", type: 'Etc', droppedBy: ["어둑시니"], chance: 0.1, minLvl: 80, rarity: ItemRarity.RARE, description: "어둠 속에서만 추출할 수 있는 차가운 결정체입니다.", imageUrl:"https://i.ibb.co/Fbp6Hd3T/Gemini-Generated-Image-tw2z9wtw2z9wtw2z.png" },
    { item: "귀면와 조각", type: 'Etc', chance: 0.05, minLvl: 40, rarity: ItemRarity.MAGIC, description: "귀신을 쫓기 위해 지붕에 올리던 기와의 파편입니다.", imageUrl:"https://i.ibb.co/bM84k7r2/Gemini-Generated-Image-xnv46axnv46axnv4.png" },
    { item: "주작의 활", type: 'Weapon', weaponType: 'Bow',  droppedBy: ["주작"],elementalType: "화염계", chance: 0.002, minLvl: 150, rarity: ItemRarity.LEGENDARY, description: "주작의 힘이 깃든 활입니다.", stats: { str: 80, agi: 120}, options: ["물리 명중률 +20%","물리 공격력 +20%"], imageUrl:"https://i.ibb.co/r262qSyJ/Gemini-Generated-Image-9uyi5s9uyi5s9uyi.png"},
    { item: "영롱한 노리개", type: 'Accessory', chance: 0.05, minLvl: 60, rarity: ItemRarity.RARE, stats: { wis: 15, ctrl: 10 }, options: ["상태이상 저항 +5%"], description: "정교한 장식이 돋보이는 전통 장신구입니다.",imageUrl:"https://i.ibb.co/k6r00nKh/Gemini-Generated-Image-139nop139nop139n.png" },
    { item: "화랑의 부러진 활", type: 'Etc', droppedBy: ["타락한 화랑 유령"], chance: 0.1, minLvl: 100, rarity: ItemRarity.RARE, description: "과거 명궁이 사용하던 활의 일부입니다. 제작 재료로 쓰입니다.", imageUrl:"https://i.ibb.co/hnS1dqb/Gemini-Generated-Image-9lqn0z9lqn0z9lqn.png" },
    { item: "해태의 앞발톱", type: 'Etc', droppedBy: ["지옥의 해태", "신수 해태"], chance: 0.1, minLvl: 150, rarity: ItemRarity.EPIC, description: "단단한 바위도 두부처럼 썰어버리는 해태의 발톱입니다.", imageUrl:"https://i.ibb.co/vrXzgj4/Gemini-Generated-Image-3ezryc3ezryc3ezr.png" },
    { item: "사령의 부적", type: 'Etc', droppedBy: ["망각의 저승사자"], chance: 0.02, minLvl: 50, rarity: ItemRarity.EPIC, description: "죽은 자를 부리거나 물리칠 때 사용되는 불길한 부적입니다.", imageUrl:"https://i.ibb.co/9kddgYft/Gemini-Generated-Image-99nbg199nbg199nb.png" },
    { item: "무령왕릉 금제 관장식", type: 'Accessory', droppedBy: ["지석묘 수호령"], chance: 0.02, minLvl: 30, rarity: ItemRarity.UNIQUE, stats: { def: 40, wis: 50, ctrl: 30 }, options: ["상태이상 저항 +15%"], description: "백제 무령왕릉에서 발견된 화려한 금제 장식입니다.",imageUrl:"https://i.ibb.co/27pCNtct/Gemini-Generated-Image-v5xzokv5xzokv5xz.png" },
    { item: "거상 김만덕의 장부", type: 'Accessory', droppedBy: ["산적 두목"], chance: 0.1, minLvl: 50, rarity: ItemRarity.RARE, stats: { wis: 20 }, options: ["WIS +20%"], description: "제주의 거상 김만덕이 남긴 상업 장부입니다.",imageUrl:"https://i.ibb.co/qYDd5mft/Gemini-Generated-Image-5ia2575ia2575ia2.png" },
    { item: "각시탈", type: 'Head', droppedBy: ["심술궂은 도깨비"], chance: 0.1, minLvl: 10, rarity: ItemRarity.MAGIC, stats: { agi: 10, def: 5 }, options: ["물리 회피율 +5%"], description: "해학적인 미소를 띤 전통 탈입니다. 기척을 숨기는 데 도움을 줍니다.",imageUrl:"https://i.ibb.co/whQn4WSN/Gemini-Generated-Image-f34kl4f34kl4f34k.png" },
    { item: "환도", type: 'Weapon', weaponType: 'Sword', chance: 0.03, minLvl: 1, rarity: ItemRarity.NORMAL, stats: { str: 5, agi: 5 }, description: "조선시대 군사들이 사용하던 표준적인 곡도입니다.",imageUrl:"https://i.ibb.co/k2Hsg3YZ/Gemini-Generated-Image-1k8zi91k8zi91k8z.png"},
    { item: "불고기 도시락", type: 'Consumable', chance: 0.05, minLvl: 1, rarity: ItemRarity.MAGIC, options: ["HP 80 회복", "STR +2% (5턴)"], description: "영양 가득하고 맛있는 한국의 고기 도시락입니다.",imageUrl:"https://i.ibb.co/TBPPcMQv/Gemini-Generated-Image-e6gy3be6gy3be6gy.png"},
    { item: "강철이의 비늘", type: 'Etc', droppedBy: ["강철이"], chance: 0.05, minLvl: 120, rarity: ItemRarity.RARE, description: "용이 되지 못한 괴물, 강철이가 남긴 단단한 비늘입니다.",imageUrl:"https://i.ibb.co/pB2Rsn5x/Gemini-Generated-Image-fohwaffohwaffohw.png"},
    { item: "천년 묵은 산삼", type: 'Consumable', chance: 0.005, minLvl: 150, rarity: ItemRarity.LEGENDARY, options: ["HP 100% 회복","MP 100% 회복","STR +1(영구)","CTRL +1(영구)","모든 스탯 +10%"], description: "전설적인 생명력을 지닌 신비로운 영약입니다.",imageUrl:"https://i.ibb.co/pvJ9Y5BW/Gemini-Generated-Image-8h7rzw8h7rzw8h7r.png"}
];

// --- 일본 (Japan) 전리품 확장 ---
const JAPAN_LOOT: AsiaLootEntry[] = [
    { item: "캇파의 등껍질", type: 'Etc', droppedBy: ["강변 캇파"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "매우 단단한 요괴의 껍질.", imageUrl:"https://i.ibb.co/QjPMvzmY/Kakao-Talk-20260212-005709136.png" },
    { item: "오니의 뿔", type: 'Etc', droppedBy: ["오니 왕"], chance: 0.02, minLvl: 101, rarity: ItemRarity.RARE, description: "강력한 힘이 깃든 붉은 뿔." ,imageUrl:"https://i.ibb.co/fVg9Ry8y/Kakao-Talk-20260212-005709136-01.png"},
    { item: "텐구의 깃털", type: 'Etc', droppedBy: ["까마귀 텐구", "다이텐구"], chance: 0.03, minLvl: 41, rarity: ItemRarity.MAGIC, description: "바람을 일으키는 텐구의 깃털.",imageUrl:"https://i.ibb.co/5m4ZG0Z/Kakao-Talk-20260212-005709136-02.png" },
    { item: "저주받은 인형", type: 'Etc', droppedBy: ["츠쿠모가미"], chance: 0.01, minLvl: 81, rarity: ItemRarity.RARE, description: "불길한 원한이 서린 인형.",imageUrl:"https://i.ibb.co/rf1BVD10/Kakao-Talk-20260212-005042893.png" },
    { item: "무라마사의 칼집", type: 'Accessory', droppedBy: ["사무라이 원혼"], chance: 0.01, minLvl: 120, rarity: ItemRarity.EPIC, stats: { str: 40, agi: 40 }, options: ["물리 공격력 +15%", "상태이상 저항 -5%"], description: "착용자를 광기로 몰아넣는 요검의 칼집." ,imageUrl:"https://i.ibb.co/Y40tz46b/Kakao-Talk-20260212-005709136-03.png"},
    { item: "텐구의 부채", type: 'Weapon', weaponType: 'Staff', droppedBy: ["다이텐구"], chance: 0.1, minLvl: 151, rarity: ItemRarity.UNIQUE, stats: { int: 100, agi: 60 }, options: ["질풍계 속성 부여", "마법 공격력 +15%"], description: "바람을 자유자재로 다루는 부채.",imageUrl:"https://i.ibb.co/tMBG9X86/Kakao-Talk-20260212-005709136-04.png" },
    { item: "쿠사나기의 검 (진품)", type: 'Weapon', weaponType: 'Sword', droppedBy: ["야마타노오로치의 환영", "스사노오의 화신"], chance: 0.002, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 180, agi: 100 }, options: ["전격계 속성 부여", "치명타율 +20%"], description: "일본 신화의 전설적인 성검.",imageUrl:"https://i.ibb.co/h1XpQ512/Kakao-Talk-20260212-005709136-05.png" },
    { item: "아메노하바키리", type: 'Weapon', weaponType: 'Sword', droppedBy: ["이자나기", "스사노오의 화신"], chance: 0.01, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 150, agi: 100 }, options: ["광휘계 속성 부여", "AGI +10%"], description: "이자나기가 스사노오에게 물려준 검.",imageUrl:"https://i.ibb.co/yBcQBsrs/Gemini-Generated-Image-frh7jvfrh7jvfrh7.png" },
    { item: "야타의 거울 (파편)", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["아마테라스의 투영"], chance: 0.02, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { def: 150, wis: 100 }, options: ["마법 방어력 +30%", "광휘계 속성 부여"], description: "진실을 비추는 신성한 거울의 조각.",imageUrl:"https://i.ibb.co/1YH8gBFN/Kakao-Talk-20260212-005709136-13.png" },
    { item: "기모노 천 조각", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "아름다운 문양이 그려진 고급 실크 조각입니다.",imageUrl:"https://i.ibb.co/CKF1F58Y/Kakao-Talk-20260212-005709136-06.png" },
    { item: "여우 가면 파편", type: 'Etc', chance: 0.15, minLvl: 20, rarity: ItemRarity.MAGIC, description: "요괴들이 쓰던 가면의 일부입니다. 영력이 조금 남아있습니다.",imageUrl:"https://i.ibb.co/svCYQd5H/Kakao-Talk-20260212-005709136-07.png" },
    { item: "사케 도자기", type: 'Etc', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "잘 구워진 도자기 병입니다. 장식용이나 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/TxMtmcNM/Kakao-Talk-20260212-005709136-08.png" },
    { item: "다도 세트", type: 'Etc', chance: 0.05, minLvl: 30, rarity: ItemRarity.RARE, description: "마음의 안정을 주는 차를 우릴 때 사용하는 도구입니다.",imageUrl:"https://i.ibb.co/KjRcQpwS/Kakao-Talk-20260212-005709136-09.png" },
    { item: "요괴의 머리카락", type: 'Etc', droppedBy: ["조로구모", "누레온나"], chance: 0.1, minLvl: 50, rarity: ItemRarity.MAGIC, description: "끊어지지 않는 질긴 마력의 머리카락입니다.",imageUrl:"https://i.ibb.co/6cgsrbJ5/Kakao-Talk-20260212-005709136-10.png" },
    { item: "수호부 오마모리", type: 'Accessory', chance: 0.08, minLvl: 45, rarity: ItemRarity.MAGIC, stats: { def: 10, wis: 10 }, options: ["상태이상 저항 +10%"], description: "신사의 축복이 담긴 작은 주머니입니다.",imageUrl:"https://i.ibb.co/JjHRvWL8/Kakao-Talk-20260212-005709136-11.png" },
    { item: "오니의 금강봉 파편", type: 'Etc', droppedBy: ["오니 왕", "아수라"], chance: 0.05, minLvl: 140, rarity: ItemRarity.EPIC, description: "오니의 무기에서 떨어진 매우 무거운 금속 덩어리입니다.",imageUrl:"https://i.ibb.co/NgWbSj2j/Kakao-Talk-20260212-005709136-12.png" },
    { item: "오니의 가죽 훈도시", type: 'Body', droppedBy: ["오니 왕"], chance: 0.04, minLvl: 90, rarity: ItemRarity.UNIQUE, stats: { str: 40, def: 50 }, options: ["물리 방어력 +10%", "STR +15%"], description: "오니 왕이 착용하던 거칠지만 믿음직한 하의입니다.",imageUrl:"https://i.ibb.co/6cQcc8Hj/Gemini-Generated-Image-m5c6wem5c6wem5c6.png" },
    { item: "게이샤의 철선", type: 'Weapon', weaponType: 'Blunt', droppedBy: ["누레온나", "조로구모"], chance: 0.1, minLvl: 60, rarity: ItemRarity.RARE, stats: { int: 35, agi: 25 }, options: ["마법 공격력 +10%", "혼란 확률 +5%"], description: "아름다운 부채 모양을 한 치명적인 강철 무기입니다.",imageUrl:"https://i.ibb.co/qFLYPbjN/Gemini-Generated-Image-lk8br6lk8br6lk8b.png" },
    { item: "금색 마네키네코", type: 'Etc', chance: 0.05, minLvl: 1, rarity: ItemRarity.RARE, description: "복을 부르는 고양이 인형입니다. 상점에 비싸게 팔 수 있습니다.",imageUrl:"https://i.ibb.co/xq1rVmqg/Gemini-Generated-Image-ydf3w2ydf3w2ydf3.png" },
    { item: "닌자의 갈고리", type: 'SubWeapon', weaponType: 'SubSword', droppedBy: ["낭인", "그림자 무사"], chance: 0.12, minLvl: 40, rarity: ItemRarity.MAGIC, stats: { agi: 20 }, options: ["회피율 +8%"], description: "지형지물을 타넘거나 적을 끌어올 때 쓰는 도구입니다.",imageUrl:"https://i.ibb.co/3msfkS8d/Gemini-Generated-Image-g8y5ykg8y5ykg8y5.png"},
    { item: "타누키의 변신 나뭇잎", type: 'Etc', droppedBy: ["사나운 타누키"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "환각을 일으키는 데 쓰이는 신비로운 나뭇잎입니다.",imageUrl:"https://i.ibb.co/9HWn92bm/Gemini-Generated-Image-j6v63qj6v63qj6v6.png" },
    { item: "쇼유 라멘", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 60 회복", "AGI +2% (5턴)"], description: "깔끔한 간장 육수가 일품인 일본식 면 요리입니다.",imageUrl:"https://i.ibb.co/hJFnqb7N/Gemini-Generated-Image-350c6k350c6k350c.png"}
];

// --- 중국 (China) 전리품 확장 ---
const CHINA_LOOT: AsiaLootEntry[] = [
    { item: "강시의 부적", type: 'Etc', droppedBy: ["하급 강시", "우두머리 강시"], chance: 0.1, minLvl: 11, rarity: ItemRarity.NORMAL, description: "강시를 봉인할 때 쓰는 종이 부적." ,imageUrl:"https://i.ibb.co/84P1wc60/Kakao-Talk-20260212-011300462-12.png"},
    { item: "기린의 비늘", type: 'Etc', droppedBy: ["화염의 기린"], chance: 0.01, minLvl: 101, rarity: ItemRarity.EPIC, description: "상서로운 짐승 기린의 황금빛 비늘.",imageUrl:"https://i.ibb.co/1YmJSDC6/Kakao-Talk-20260212-011300462-13.png" },
    { item: "병마용 파편", type: 'Etc', droppedBy: ["병마용 기사"], chance: 0.1, minLvl: 61, rarity: ItemRarity.MAGIC, description: "고대 진나라 병사의 흙 인형 조각.",imageUrl:"https://i.ibb.co/zhPnnw6J/Kakao-Talk-20260212-011300462-11.png" },
    { item: "천산설련", type: 'Consumable', chance: 0.005, minLvl: 150, rarity: ItemRarity.EPIC, options: ["모든 상태이상 해제", "HP/MP 50% 회복"], description: "만년설이 덮인 산꼭대기에서만 핀다는 전설의 꽃.", imageUrl:"https://i.ibb.co/C5LMFdGw/Kakao-Talk-20260212-011300462-10.png" },
    { item: "소림사 철선", type: 'Weapon', weaponType: 'Blunt', droppedBy: ["차원 침략자 소림승"], chance: 0.1, minLvl: 120, rarity: ItemRarity.UNIQUE, stats: { str: 50, agi: 80 }, options: ["회피율 +10%", "물리 공격력 +10%"], description: "강철로 살을 만든 부채 형태의 무기.", imageUrl:"https://i.ibb.co/wFmkB9sr/Kakao-Talk-20260212-011300462-09.png" },
    { item: "여와의 오색석", type: 'SubWeapon', weaponType: 'Orb', droppedBy: ["여와", "거대 황룡"], chance: 0.004, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { int: 200, wis: 150 }, options: ["모든 속성 저항 +30%", "최종 능력치 +10%"], description: "하늘을 수선했다는 전설의 돌." , imageUrl:"https://i.ibb.co/cS081Csd/Kakao-Talk-20260212-011300462-08.png"},
    { item: "대환단", type: 'Consumable', chance: 0.001, minLvl: 200, rarity: ItemRarity.UNIQUE, options: ["STR +1(영구), INT +1(영구)"], description: "소림사의 비전 비약. 내공을 비약적으로 상승시킵니다.",imageUrl:"https://i.ibb.co/VWTgBNf0/Kakao-Talk-20260212-011300462-07.png" },
    { item: "용맥의 돌", type: 'Etc', chance: 0.015, minLvl: 40, rarity: ItemRarity.RARE, description: "대지의 기운이 흐르는 용맥에서 채취한 바위입니다.",imageUrl:"https://i.ibb.co/23bWzHtF/Kakao-Talk-20260212-011300462-06.png" },
    { item: "오래된 경전", type: 'Etc', chance: 0.025, minLvl: 15, rarity: ItemRarity.MAGIC, description: "해석하기 어려운 한자가 가득 적힌 낡은 책입니다.",imageUrl:"https://i.ibb.co/7JX6P5fP/Kakao-Talk-20260212-011300462-05.png" },
    { item: "비단 주머니", type: 'Etc', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "화려한 자수가 놓인 작은 주머니입니다.",imageUrl:"https://i.ibb.co/mrsxSzC3/Kakao-Talk-20260212-011300462-04.png" },
    { item: "영지버섯", type: 'Consumable', chance: 0.09, minLvl: 20, rarity: ItemRarity.MAGIC, options: ["HP 500 회복"], description: "불로초로 알려진 귀한 버섯입니다.",imageUrl:"https://i.ibb.co/7JsChgk0/Kakao-Talk-20260212-011300462-03.png" },
    { item: "의천검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["공허의 무신","황제 공손헌원"], chance: 0.002, minLvl: 201, rarity: ItemRarity.LEGENDARY, stats: { str: 100, agi: 80 }, options: ["물리 공격력 +20%", "광휘계 속성 부여"], description: "조조가 가지고 있다던 두 보검 중 하나.",imageUrl:"https://i.ibb.co/Q3G9mX5T/Gemini-Generated-Image-3oa5y03oa5y03oa5.png" },
    { item: "봉황의 깃털 조각", type: 'Etc', droppedBy: ["화염의 기린", "거대 황룡"], chance: 0.08, minLvl: 160, rarity: ItemRarity.EPIC, description: "전설 속 봉황이 남긴 것으로 추정되는 뜨거운 깃털입니다." ,imageUrl:"https://i.ibb.co/prWSphps/Kakao-Talk-20260212-011300462-02.png"},
    { item: "옥황상제의 인장", type: 'Etc', droppedBy: ["황제 공손헌원"], chance: 0.01, minLvl: 250, rarity: ItemRarity.UNIQUE, description: "하늘의 권위를 상징하는 신비로운 도장입니다.",imageUrl:"https://i.ibb.co/BRqS6cc/Kakao-Talk-20260212-011300462-01.png" },
    { item: "흑풍회의 표식", type: 'Etc', droppedBy: ["흑풍회 암살자"], chance: 0.01, minLvl: 90, rarity: ItemRarity.RARE, description: "어둠의 무림 집단인 흑풍회의 소속을 증명하는 표식입니다.",imageUrl:"https://i.ibb.co/bM6ctQqX/Kakao-Talk-20260212-011300462.png" },
    { item: "청동 복숭아", type: 'Consumable', chance: 0.01, minLvl: 30, rarity: ItemRarity.MAGIC, options: ["MP 200 회복", "WIS +3% (10턴)"], description: "서왕모가 재배했다는 전설의 복숭아를 본떠 만든 영약입니다.",imageUrl:"https://i.ibb.co/sd0pGwnD/Gemini-Generated-Image-nitoi7nitoi7nito.png" },
    { item: "손오공의 긴고아", type: 'Head', droppedBy: ["사천왕의 잔영"], chance: 0.006, minLvl: 200, rarity: ItemRarity.UNIQUE, stats: { int: 50, ctrl: 70 }, options: ["상태이상 저항 +30%", "마법 방어력 +15%"], description: "제천대성의 머리를 조이던 굴레입니다. 정신 집중을 돕습니다.",imageUrl:"https://i.ibb.co/jPS6LnKv/Gemini-Generated-Image-ft1bl4ft1bl4ft1b.png" },
    { item: "소림사의 육각봉", type: 'Weapon', weaponType: 'Staff', droppedBy: ["차원 침략자 소림승", "무술 수련생 원혼"], chance: 0.05, minLvl: 40, rarity: ItemRarity.RARE, stats: { str: 35, def: 15 }, options: ["물리 방어력 +5%", "물리명중률 +25%"], description: "소림사의 승려들이 수행용으로 사용하는 단단한 나무 봉입니다.",imageUrl:"https://i.ibb.co/LXkBLTFV/Gemini-Generated-Image-gzh98wgzh98wgzh9.png" },
    { item: "만리장성의 벽돌", type: 'Etc', chance: 0.1, minLvl: 50, rarity: ItemRarity.NORMAL, description: "대륙의 기상을 담은 견고한 벽돌입니다. 방어구 강화 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/rG2SCg2V/Gemini-Generated-Image-f3speof3speof3sp.png" },
    { item: "용의 여의주 파편", type: 'SubWeapon', weaponType: 'Orb', droppedBy: ["거대 황룡"], chance: 0.02, minLvl: 180, rarity: ItemRarity.UNIQUE, stats: { int: 100, ctrl: 50 }, options: ["마법 공격력 +20%", "광휘계 속성 부여"], description: "황룡이 승천하며 남긴 여의주의 조각입니다.",imageUrl:"https://i.ibb.co/M5tSJP3k/Gemini-Generated-Image-gnyjlignyjlignyj.png" },
    { item: "딤섬 세트", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 50 회복", "MP 50 회복"], description: "다양한 속을 채운 정갈한 중국식 만두 요리입니다.",imageUrl:"https://i.ibb.co/LX7nYDzK/Gemini-Generated-Image-jewy2kjewy2kjewy.png" }
];

// --- 동남아시아 (South East Asia) 전리품 확장 ---
const SE_ASIA_LOOT: AsiaLootEntry[] = [
    { item: "정글 도마뱀의 꼬리", type: 'Etc', droppedBy: ["정글 도마뱀"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "꿈틀거리는 도마뱀 꼬리.",imageUrl:"https://i.ibb.co/rGxg0GSr/Gemini-Generated-Image-hmlsofhmlsofhmls.png" },
    { item: "나가의 비늘", type: 'Etc', droppedBy: ["나카 전사", "심연의 나가 로드"], chance: 0.05, minLvl: 31, rarity: ItemRarity.RARE, description: "단단하고 미끄러운 비늘.", imageUrl:"https://i.ibb.co/LLksqZ4/Gemini-Generated-Image-fugolafugolafugo.png" },
    { item: "아스왕의 눈알", type: 'Etc', droppedBy: ["아스왕"], chance: 0.1, minLvl: 51, rarity: ItemRarity.MAGIC, description: "기괴한 빛을 내는 흡혈귀의 눈.",imageUrl:"https://i.ibb.co/bMkB22XM/Gemini-Generated-Image-pprimnpprimnppri.png" },
    { item: "크리스 단검", type: 'Weapon', weaponType: 'Sword', chance: 0.05, minLvl: 60, rarity: ItemRarity.RARE, stats: { agi: 40, ctrl: 20 }, options: ["출혈 유발 +10%", "치명타 확률 +5%"], description: "물결 모양의 날을 가진 동남아시아의 전통 단검.",imageUrl:"https://i.ibb.co/gFf5gkm8/Gemini-Generated-Image-gdv498gdv498gdv4.png" },
    { item: "해신의 삼지창 (조각)", type: 'Weapon', weaponType: 'Spear', droppedBy: ["해신 포세이돈의 사도", "폭풍의 세이렌 퀸"], chance: 0.002, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 140, int: 100 }, options: ["해수계 속성 부여", "마법 공격력 +20%"], description: "바다의 권능 깃든 창의 파편.",imageUrl:"https://i.ibb.co/cKRZyDQ9/Gemini-Generated-Image-ic1lnric1lnric1l.png" },
     { item: "뚜어띠엔", type: 'Weapon', weaponType: 'Sword', droppedBy: ["태초의 어머니 이야라"], chance: 0.002, minLvl: 201, rarity: ItemRarity.LEGENDARY, stats: { str: 100, ctrl: 100 }, options: ["광휘계 속성 부여", "물리 공격력 +20%"], description: "베트남 건국신화의 전설의 검.",imageUrl:"https://i.ibb.co/MDYRLxHR/Gemini-Generated-Image-pchlgtpchlgtpchl.png" },
    { item: "찬드라하스", type: 'Weapon', weaponType: 'Sword', droppedBy: ["그림자 정글의 주권자"], chance: 0.002, minLvl: 201, rarity: ItemRarity.LEGENDARY, stats: { str: 80, agi: 120 }, options: ["월광계 속성 부여", "물리 회피율 +20%"], description: "나찰왕 라바나가 시바 신에게서 받은 칼. '달의 칼날'이라는 의미다.",imageUrl:"https://i.ibb.co/0jtVGvyH/Gemini-Generated-Image-45oun945oun945ou.png" },
    { item: "바즈라", type: 'Weapon', weaponType: 'Spear',  chance: 0.005, minLvl: 250, rarity: ItemRarity.LEGENDARY, stats: { str: 50, agi: 100 }, options: ["전격계 속성 부여", "물리 공격력 +25%"], description: "뇌신 인드라의 창. 태풍을 부르는 번개를 상징한다.",imageUrl:"https://i.ibb.co/PzZnTNDN/Gemini-Generated-Image-1uv1yi1uv1yi1uv1.png" },
    { item: "상아 조각", type: 'Etc', droppedBy: ["거대 코끼리 신수"], chance: 0.05, minLvl: 60, rarity: ItemRarity.RARE, description: "고귀한 코끼리의 상아에서 떼어낸 단단한 파편입니다.",imageUrl:"https://i.ibb.co/9HJVrL4S/Gemini-Generated-Image-8pes6e8pes6e8pes.png"},
    { item: "연꽃 씨앗", type: 'Etc', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "수천 년 동안 썩지 않는다고 알려진 생명력의 씨앗입니다.",imageUrl:"https://i.ibb.co/VpwDkh32/Gemini-Generated-Image-cs5bwbcs5bwbcs5b.png" },
    { item: "고무 수액", type: 'Etc', chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "정글의 나무에서 채취한 끈적하고 탄성이 있는 액체입니다.",imageUrl:"https://i.ibb.co/LDfs3WgF/Gemini-Generated-Image-6o8gzl6o8gzl6o8g.png" },
    { item: "향신료 가루", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "음식의 풍미를 높이고 약재로도 쓰이는 자극적인 향의 가루입니다.",imageUrl:"https://i.ibb.co/QFWNTYdv/Gemini-Generated-Image-95cgqb95cgqb95cg.png" },
    { item: "금색 뱅글", type: 'Accessory', chance: 0.1, minLvl: 40, rarity: ItemRarity.MAGIC, stats: { str: 5, def: 5 }, description: "전사들이 팔에 차던 투박하지만 견고한 금빛 팔찌입니다.",imageUrl:"https://i.ibb.co/fG86XzWD/Gemini-Generated-Image-o21pdgo21pdgo21p.png" },
    { item: "정글 독거미의 눈알", type: 'Etc', droppedBy: ["독거미"], chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "여러 방향을 동시에 감시하던 거미의 징그러운 눈입니다.",imageUrl:"https://i.ibb.co/zVbk4CF9/Gemini-Generated-Image-1db0fx1db0fx1db0.png" },
    { item: "코랄 히드라의 독니", type: 'Etc', droppedBy: ["코랄 히드라"], chance: 0.15, minLvl: 110, rarity: ItemRarity.EPIC, description: "산호초와 융합된 히드라의 치명적인 독니입니다.",imageUrl:"https://i.ibb.co/fYK3whT2/Gemini-Generated-Image-8oe7ms8oe7ms8oe7.png" },
    { item: "무에타이 핸드랩", type: 'Hand', chance: 0.1, minLvl: 20, rarity: ItemRarity.MAGIC, stats: { str: 10, def: 5 }, options: ["물리 공격력 +5%"], description: "낙무아이들이 손에 감던 거친 천입니다. 주먹을 보호하고 힘을 실어줍니다.",imageUrl:"https://i.ibb.co/93grwQq1/Gemini-Generated-Image-lyf2urlyf2urlyf2.png" },
    { item: "두리안 왕의 조각", type: 'Consumable', chance: 0.05, minLvl: 10, rarity: ItemRarity.NORMAL, options: ["HP 200 회복", "상태이상 저항 -10%(3턴)"], description: "지독한 냄새가 나지만 체력을 대폭 회복시켜주는 과일의 왕입니다.",imageUrl:"https://i.ibb.co/7NNR4BBc/Gemini-Generated-Image-qbs895qbs895qbs8.png" },
    { item: "앙코르와트의 석상 머리", type: 'Etc', droppedBy: ["비취 석상 전사"], chance: 0.08, minLvl: 70, rarity: ItemRarity.RARE, description: "고대 유적에서 떨어져 나온 신비로운 석상 조각입니다.",imageUrl:"https://i.ibb.co/NzhNr8F/Gemini-Generated-Image-4l2no14l2no14l2n.png"},
    { item: "황금 코끼리 조각상", type: 'Etc', chance: 0.03, minLvl: 1, rarity: ItemRarity.EPIC, description: "태국 국왕의 상징인 하얀 코끼리를 본떠 만든 황금상입니다.",imageUrl:"https://i.ibb.co/PGHh8GwZ/Gemini-Generated-Image-xi3uzvxi3uzvxi3u.png" },
    { item: "메콩강의 붉은 진흙", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "메콩강 유역의 영양분 가득한 진흙입니다. 도자기나 연금술 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/kV90WnFV/Gemini-Generated-Image-ngt5a0ngt5a0ngt5-1.png" }
];

// --- 중앙아시아 및 중동 (Central Asia / Middle East) 전리품 확장 ---
const CENTRAL_ASIA_LOOT: AsiaLootEntry[] = [
    { item: "사막 전갈의 독침", type: 'Etc', droppedBy: ["사막 전갈"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "치명적인 독이 들어있는 침.",imageUrl:"https://i.ibb.co/sp6QjGHT/Gemini-Generated-Image-61mfb761mfb761mf.png" },
    { item: "디진의 램프 파편", type: 'Etc', droppedBy: ["사막의 디진", "디진 킹"], chance: 0.01, minLvl: 61, rarity: ItemRarity.EPIC, description: "신비로운 기운이 감도는 금속 조각.",imageUrl:"https://i.ibb.co/XwwhnvF/Gemini-Generated-Image-pymuqipymuqipymu.png" },
    { item: "사막 장미", type: 'Etc', droppedBy: ["모래 정령", "공허의 오아시스 가디언"], chance: 0.05, minLvl: 31, rarity: ItemRarity.RARE, description: "모래가 굳어 만들어진 꽃 모양의 결정.",imageUrl:"https://i.ibb.co/DDSY4SrT/Gemini-Generated-Image-dgsk8udgsk8udgsk.png"},
    { item: "시미터", type: 'Weapon', weaponType: 'Sword', chance: 0.05, minLvl: 40, rarity: ItemRarity.MAGIC, stats: { str: 20, agi: 30 }, options: ["물리 공격력 +5%"], description: "사막 전사들이 즐겨 사용하는 곡선형 검.",imageUrl:"https://i.ibb.co/1fpn342q/Gemini-Generated-Image-p10pep10pep10pep.png" },
    { item: "줄피카르", type: 'Weapon', weaponType: 'Sword', chance: 0.001, minLvl: 200, rarity: ItemRarity.LEGENDARY, stats: { str: 50, agi: 130 }, options: ["물리 공격력 +15%","암흑계 속성 부여"], description: "사막 전사들 속 전설의 검." ,imageUrl:"https://i.ibb.co/0pfHLrxR/Gemini-Generated-Image-bphye4bphye4bphy.png"},
    { item: "간디바", type: 'Weapon', weaponType: 'Bow',  droppedBy: ["전설의 툴파르"],elementalType: "대지계", chance: 0.01, minLvl: 150, rarity: ItemRarity.LEGENDARY, description: "인도 전설의 활입니다.", stats: { wis: 80, agi: 120}, options: ["물리 명중률 +25%","물리 공격력 +15%"], imageUrl:"https://i.ibb.co/j94QPM59/Gemini-Generated-Image-7ot35a7ot35a7ot3.png"},
    { item: "아포피스의 혼돈 비늘", type: 'Accessory', droppedBy: ["사막의 지배자 아포피스의 분신"], chance: 0.02, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { agi: 120, ctrl: 100 }, options: ["질풍계 속성 부여", "상태이상 저항 +30%"], description: "혼돈의 뱀에게서 떨어진 비늘 장식.",imageUrl:"https://i.ibb.co/FbM2Sq4R/Gemini-Generated-Image-jxzrk4jxzrk4jxzr.png" },
    { item: "고대 양피지", type: 'Etc', chance: 0.1, minLvl: 15, rarity: ItemRarity.MAGIC, description: "메마른 사막의 유적에서 발견된 오래된 기록지입니다.",imageUrl:"https://i.ibb.co/XfHfRBSC/Gemini-Generated-Image-7pdlsx7pdlsx7pdl.png" },
    { item: "유리 모래", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "고열에 녹아 반짝이는 결정을 가진 특수한 모래입니다.",imageUrl:"https://i.ibb.co/Ps2QBnkM/Gemini-Generated-Image-4mrzit4mrzit4mrz.png" },
    { item: "푸른 라피스 라줄리", type: 'Etc', chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, description: "깊은 밤하늘을 닮은 아름다운 푸른색 원석입니다.",imageUrl:"https://i.ibb.co/nMzNPRpx/Gemini-Generated-Image-dflu00dflu00dflu.png" },
    { item: "사막 여우의 꼬리", type: 'Etc', chance: 0.15, minLvl: 5, rarity: ItemRarity.NORMAL, description: "뜨거운 열기를 견뎌내게 해주는 부드러운 털의 꼬리입니다.",imageUrl:"https://i.ibb.co/kgYHX9kN/Gemini-Generated-Image-i94wnti94wnti94w.png" },
    { item: "대추야자", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["MP 100 회복"], description: "사막의 보석이라 불리는 달콤하고 영양가 높은 열매입니다.",imageUrl:"https://i.ibb.co/4ZbxszqH/Gemini-Generated-Image-7dzogv7dzogv7dzo.png" },
    { item: "오아시스의 결정", type: 'Etc', droppedBy: ["공허의 오아시스 가디언"], chance: 0.01, minLvl: 200, rarity: ItemRarity.EPIC, description: "오아시스의 생명력이 응축된 투명한 보석입니다.",imageUrl:"https://i.ibb.co/chBSKtMJ/Gemini-Generated-Image-gfk4t1gfk4t1gfk4.png" },
    { item: "신기루의 가루", type: 'Etc', droppedBy: ["신기루 환영"], chance: 0.05, minLvl: 40, rarity: ItemRarity.MAGIC, description: "실체가 없는 존재가 남긴 환각을 유발하는 가루입니다.", imageUrl:"https://i.ibb.co/SDGCFSCQ/Gemini-Generated-Image-11ontt11ontt11on.png" },
    { item: "징기스칸의 황금 말등자", type: 'Accessory', droppedBy: ["몽골 기병대의 환영"], chance: 0.1, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { agi: 60, str: 40 }, options: ["AGI +20%", "물리 공격력 +10%"], description: "초원의 정복자 징기스칸이 사용했다는 전설의 등자입니다.",imageUrl:"https://i.ibb.co/tw9kgqkJ/Gemini-Generated-Image-378ktl378ktl378k.png" },
    { item: "사막의 푸른 장미", type: 'Etc', droppedBy: ["신기루 환영", "모래 정령"], chance: 0.1, minLvl: 40, rarity: ItemRarity.RARE, description: "사막의 신기루 속에서만 피어난다는 환상적인 장미입니다.",imageUrl:"https://i.ibb.co/NgyPZs37/Gemini-Generated-Image-uh5e2fuh5e2fuh5e.png" },
    { item: "유목민의 가죽 안장", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "거친 대륙을 달리던 유목민들의 낡았지만 튼튼한 안장입니다.",imageUrl:"https://i.ibb.co/ycS2gCb2/Gemini-Generated-Image-2we20y2we20y2we2.png" },
    { item: "페르시아 전사의 투구", type: 'Head', droppedBy: ["사막 전사", "타락한 술탄의 망령"], chance: 0.08, minLvl: 80, rarity: ItemRarity.RARE, stats: { def: 45, wis: 15 }, options: ["물리 방어력 +12%"], description: "정교한 무늬가 새겨진 페르시아식 강철 투구입니다.",imageUrl:"https://i.ibb.co/4RY72QJs/Gemini-Generated-Image-uhj7lquhj7lquhj7.png"},
    { item: "모래 바람의 망토", type: 'Body', chance: 0.05, minLvl: 50, rarity: ItemRarity.MAGIC, stats: { agi: 30, def: 10 }, options: ["암흑계 속성 저항 +10%"], description: "모래 폭풍 속에서도 몸을 보호하고 민첩하게 움직이게 돕는 망토입니다.",imageUrl:"https://i.ibb.co/tw4CPym8/Gemini-Generated-Image-tww46qtww46qtww4.png"}
];

// --- 오세아니아 (Oceania) 전리품 확장 ---
const OCEANIA_LOOT: AsiaLootEntry[] = [
    { item: "번입의 가죽", type: 'Etc', droppedBy: ["늪지의 번입", "폭풍의 번입"], chance: 0.1, minLvl: 31, rarity: ItemRarity.RARE, description: "물에 젖지 않는 기묘한 가죽.",imageUrl:"https://i.ibb.co/VW9HqpqG/Gemini-Generated-Image-5odg8e5odg8e5odg.png"},
    { item: "오팔 원석", type: 'Etc', droppedBy: ["대륙의 파괴자 골렘", "아웃백의 사냥꾼"], chance: 0.09, minLvl: 41, rarity: ItemRarity.RARE, description: "영롱한 빛을 내는 오팔 광석.",imageUrl:"https://i.ibb.co/zWjsxpGX/Gemini-Generated-Image-f3lehdf3lehdf3le.png" },
    { item: "무지개 뱀의 비늘", type: 'Etc', droppedBy: ["무지개 뱀의 환영", "태초의 어머니 이야라"], chance: 0.02, minLvl: 201, rarity: ItemRarity.EPIC, description: "세상의 모든 색이 담긴 비늘.",imageUrl:"https://i.ibb.co/WW35f3N8/Gemini-Generated-Image-f7ywnkf7ywnkf7yw.png"},
    { item: "디저리두 스태프", type: 'Weapon', weaponType: 'Staff', chance: 0.05, minLvl: 100, rarity: ItemRarity.RARE, stats: { int: 60, wis: 40 }, options: ["마법 공격력 +5%"], description: "신비로운 소리를 내는 호주 원주민의 악기이자 지팡이.",imageUrl:"https://i.ibb.co/SXfLCZy5/Gemini-Generated-Image-hu2dcshu2dcshu2d.png" },
    { item: "원주민의 투척 부메랑", type: 'Weapon', weaponType: 'Thrown', droppedBy: ["타락한 마오리 추장 유령", "부메랑 투척령"], chance: 0.05, minLvl: 81, rarity: ItemRarity.RARE, stats: { agi: 60, str: 30 }, options: ["치명타 확률 +15%", "질풍계 속성 부여"], description: "던지면 반드시 돌아오는 신비한 무기.",imageUrl:"https://i.ibb.co/CcTzS6V/Gemini-Generated-Image-yrpo59yrpo59yrpo.png" },
    { item: "대양의 심장 펜던트", type: 'Accessory', droppedBy: ["해신 포세이돈의 사도", "폭풍의 세이렌 퀸"], chance: 0.04, minLvl: 221, rarity: ItemRarity.UNIQUE, stats: { wis: 80, ctrl: 80 }, options: ["해수계 속성 부여", "상태이상 저항 +20%"], description: "바다의 정수가 응축된 보석.",imageUrl:"https://i.ibb.co/R4HpWZkY/Gemini-Generated-Image-7uimcx7uimcx7uim.png" },
    { item: "유칼립투스 잎", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "코알라가 좋아하는 독특한 향을 가진 잎사귀입니다.",imageUrl:"https://i.ibb.co/gLVFmy7Z/Gemini-Generated-Image-517zyt517zyt517z.png" },
    { item: "상어 이빨", type: 'Etc', chance: 0.1, minLvl: 15, rarity: ItemRarity.NORMAL, description: "해안가 마물들이 남긴 날카로운 이빨입니다.",imageUrl:"https://i.ibb.co/3tgcS7N/Gemini-Generated-Image-435pp2435pp2435p.png" },
    { item: "흑진주", type: 'Etc', chance: 0.05, minLvl: 70, rarity: ItemRarity.RARE, description: "깊은 바다의 어둠을 간직한 귀한 진주입니다.",imageUrl:"https://i.ibb.co/8gBK40sS/Gemini-Generated-Image-i0py67i0py67i0py.png" },
    { item: "화산재", type: 'Etc', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "화산 지대에서 채취한 비옥한 기운을 가진 재입니다.",imageUrl:"https://i.ibb.co/B2C55vFb/Gemini-Generated-Image-yt1eohyt1eohyt1e.png" },
    { item: "캥거루 힘줄", type: 'Etc', droppedBy: ["거대 캥거루"], chance: 0.1, minLvl: 25, rarity: ItemRarity.MAGIC, description: "강한 탄성을 가진 재료로, 활의 시위로 쓰기에 적합합니다.",imageUrl:"https://i.ibb.co/N2yddfb5/Gemini-Generated-Image-yt1eohyt1eohyt1e.png" },
    { item: "산호의 심장", type: 'Etc', droppedBy: ["코랄 히드라"], chance: 0.02, minLvl: 120, rarity: ItemRarity.EPIC, description: "살아 움직이는 산호초의 생명력이 담긴 핵입니다." ,imageUrl:"https://i.ibb.co/YBqQTwpk/Gemini-Generated-Image-95s18795s18795s1.png"},
    { item: "심해의 발광체", type: 'Etc', chance: 0.1, minLvl: 150, rarity: ItemRarity.RARE, description: "심해의 어둠 속에서도 밝게 빛나는 생물체 조각입니다.",imageUrl:"https://i.ibb.co/QFpk4msq/Gemini-Generated-Image-ntcmnentcmnentcm.png" },
    { item: "테부채", type: 'Weapon', weaponType: 'Sword', chance: 0.002, droppedBy: ["심연의 수룡"],minLvl: 150, rarity: ItemRarity.LEGENDARY, stats: { str: 10, agi: 200 }, options: ["물리 명중률 +15%","무기강화계 속성 부여","마법 명중률 +20%"], description: "상어 이빨로 만든 오세아니아 전통의 검." ,imageUrl:"https://i.ibb.co/SDwnHnwh/Gemini-Generated-Image-fllp9lfllp9lfllp.png"},
    { item: "캥거루 가죽 장화", type: 'Feet', droppedBy: ["거대 캥거루"], chance: 0.08, minLvl: 30, rarity: ItemRarity.MAGIC, stats: { agi: 20 }, options: ["AGI +5%"], description: "도약력이 뛰어난 캥거루의 가죽으로 만든 장화입니다.",imageUrl:"https://i.ibb.co/v6LC6g14/Gemini-Generated-Image-47dqgp47dqgp47dq.png" },
    { item: "산호초 목걸이", type: 'Accessory', chance: 0.1, minLvl: 1, rarity: ItemRarity.MAGIC, stats: { def: 5, wis: 5 }, description: "바다의 정기가 깃든 형형색색의 산호로 만든 목걸이입니다.",imageUrl:"https://i.ibb.co/N6807j0Z/Gemini-Generated-Image-7l7kge7l7kge7l7k.png" },
    { item: "화산석 단검", type: 'Weapon', weaponType: 'Sword', chance: 0.08, minLvl: 50, rarity: ItemRarity.RARE, stats: { str: 30, agi: 10 }, options: ["화염계 속성 피해 +5%"], description: "식은 용암이 굳어 만들어진 예리한 흑색 단검입니다.",imageUrl:"https://i.ibb.co/99zpzBDn/Gemini-Generated-Image-hzwy32hzwy32hzwy.png" },
    { item: "코알라의 유칼립투스 지팡이", type: 'Weapon', weaponType: 'Staff', chance: 0.05, minLvl: 40, rarity: ItemRarity.RARE, stats: { int: 40, wis: 30 }, options: ["상태 이상 저항 +10%"], description: "독특한 향기로 정신을 몽롱하게 만드는 나무 지팡이입니다.",imageUrl:"https://i.ibb.co/TMW6v5hS/Gemini-Generated-Image-nadchfnadchfnadc.png" }
];

export const ASIA_MONSTER_LOOT: Record<string, AsiaLootEntry[]> = {
    "대한민국": KOREA_LOOT,
    "북한": KOREA_LOOT,
    "일본": JAPAN_LOOT,
    "중국": CHINA_LOOT,
    "인도": SE_ASIA_LOOT,
    "태국": SE_ASIA_LOOT,
    "베트남": SE_ASIA_LOOT,
    "필리핀": SE_ASIA_LOOT,
    "인도네시아": SE_ASIA_LOOT,
    "말레이시아": SE_ASIA_LOOT,
    "싱가포르": SE_ASIA_LOOT,
    "UAE": CENTRAL_ASIA_LOOT,
    "사우디아라비아": CENTRAL_ASIA_LOOT,
    "이스라엘": CENTRAL_ASIA_LOOT,
    "이란": CENTRAL_ASIA_LOOT,
    "호주": OCEANIA_LOOT,
    "뉴질랜드": OCEANIA_LOOT
};
