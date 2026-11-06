
import { ItemRarity, Stats, WeaponType } from './types';

export interface AmericaLootEntry {
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
    elementalType?: string;
}

// --- 북아메리카 (미국, 캐나다) ---
const NORTH_AMERICA_LOOT: AmericaLootEntry[] = [
    { item: "자유의 여신상 파편", type: 'Etc', droppedBy: ["자유의 심판자", "무너진 고층빌딩의 영령"], chance: 0.05, minLvl: 151, rarity: ItemRarity.EPIC, description: "신성한 횃불의 조각입니다.", imageUrl:"https://i.ibb.co/3tSSZV9/Kakao-Talk-20260212-174106789-10.png" },
    { item: "마법공학 실리콘 칩", type: 'Etc', droppedBy: ["실리콘 밸리의 마수", "마법공학 드론"], chance: 0.1, minLvl: 61, rarity: ItemRarity.RARE, description: "정밀한 마력 연산 칩입니다.",imageUrl:"https://i.ibb.co/jP0DfNmV/Kakao-Talk-20260212-174106789-09.png" },
    { item: "에이리언 합금 조각", type: 'Etc', droppedBy: ["그레이 에이리언 환영", "51구역의 생체 병기"], chance: 0.01, minLvl: 101, rarity: ItemRarity.UNIQUE, description: "지구상에 존재하지 않는 미지의 금속 합금.",imageUrl:"https://i.ibb.co/d4z7Jgnb/Kakao-Talk-20260212-174106789-08.png" },
    { item: "모스맨의 날개 가루", type: 'Etc', droppedBy: ["포인트 플레전트의 모스맨"], chance: 0.05, minLvl: 81, rarity: ItemRarity.MAGIC, description: "불길한 예감을 불러일으키는 검은 날개 가루.",imageUrl:"https://i.ibb.co/DD61m2j9/Kakao-Talk-20260212-174106789-06.png" },
    { item: "메이플 시럽", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 50 회복"], description: "캐나다 단풍나무에서 추출한 달콤한 시럽입니다.",imageUrl:"https://i.ibb.co/ZRWFkNdg/Kakao-Talk-20260212-174106789-13.png" },
    { item: "카우보이 모자", type: 'Head', chance: 0.1, minLvl: 20, rarity: ItemRarity.MAGIC, stats: { agi: 5, ctrl: 5 }, description: "개척 시대의 정취가 느껴지는 튼튼한 모자.",imageUrl:"https://i.ibb.co/93bwfcrK/Kakao-Talk-20260212-174106789-19.png" },
    { item: "실리콘 밸리의 핵", type: 'Accessory', droppedBy: ["마법공학의 폭주 핵"], chance: 0.05, minLvl: 150, rarity: ItemRarity.EPIC, stats: { int: 40, ctrl: 30 }, options: ["마법 공격력 +12%"], description: "엄청난 연산 능력을 가진 마법공학의 결정체.",imageUrl:"https://i.ibb.co/wFWrYCNy/Kakao-Talk-20260212-174106789-16.png"},
    { item: "치즈 버거", type: 'Consumable', chance: 0.08, minLvl: 5, rarity: ItemRarity.NORMAL, options: ["HP 100 회복"], description: "열량이 높은 미국의 대표적인 음식입니다.",imageUrl:"https://i.ibb.co/RpZrGpCy/Kakao-Talk-20260212-174106789-12.png" },
    { item: "뉴욕의 은빛 트럼펫", type: 'Accessory', droppedBy: ["할리우드 팬텀", "무너진 고층빌딩의 영령"], chance: 0.03, minLvl: 120, rarity: ItemRarity.RARE, stats: { wis: 30, ctrl: 20 }, options: ["마법 공격력 +10%"], description: "재즈의 혼이 담긴 트럼펫. 선율로 아군의 사기를 높입니다.",imageUrl:"https://i.ibb.co/nMw0gdk3/Kakao-Talk-20260212-174106789-07.png" },
    { item: "웬디고의 얼어붙은 심장", type: 'Accessory', droppedBy: ["혹한의 웬디고 로드", "굶주린 스킨워커"], chance: 0.02, minLvl: 160, rarity: ItemRarity.UNIQUE, stats: { str: 50, def: -20 }, options: ["물리 공격력 +25%", "빙결계 속성 부여"], description: "결코 녹지 않는 한기를 품은 웬디고의 심장." ,imageUrl:"https://i.ibb.co/MxLjrDRb/Kakao-Talk-20260212-174106789-15.png"},
    { item: "51구역의 보안 칩", type: 'Etc', droppedBy: ["51구역의 생체 병기", "에이리언 환영"], chance: 0.12, minLvl: 90, rarity: ItemRarity.RARE, description: "최첨단 보안 시설의 출입 권한이 담긴 칩입니다.",imageUrl:"https://i.ibb.co/Xr0tLQ1y/Kakao-Talk-20260212-174106789-09.png" },
    { item: "할리우드의 화려한 가면", type: 'Head', droppedBy: ["할리우드 팬텀"], chance: 0.03, minLvl: 110, rarity: ItemRarity.EPIC, stats: { ctrl: 40, wis: 20 }, options: ["상태이상 저항 +20%", "월광계 속성 부여"], description: "수많은 페르소나를 간직한 화려한 연극용 가면.",imageUrl:"https://i.ibb.co/3ystK5MV/Kakao-Talk-20260212-174106789-18.png" },
    { item: "텍사스 롱혼 가죽 갑옷", type: 'Body', chance: 0.1, minLvl: 40, rarity: ItemRarity.RARE, stats: { def: 35, str: 10 }, options: ["물리 방어력 +15%"], description: "거대한 뿔을 가진 황소의 가죽으로 만든 튼튼한 갑옷.",imageUrl:"https://i.ibb.co/QvWJtYWF/Kakao-Talk-20260212-174106789-20.png" },
    { item: "골드러시의 황금 곡괭이", type: 'Weapon', weaponType: 'Blunt', chance: 0.04, minLvl: 50, rarity: ItemRarity.RARE, stats: { str: 40 }, options: ["물리 공격력 +15%", "대지계 속성 부여"], description: "일확천금의 꿈이 깃든 황금빛 곡괭이입니다.",imageUrl:"https://i.ibb.co/k22YN371/Kakao-Talk-20260212-174106789-25.png" },
    { item: "실리콘밸리의 AI 모듈", type: 'SubWeapon', weaponType: 'Orb', droppedBy: ["마법공학 드론", "실리콘 밸리의 마수"], chance: 0.03, minLvl: 140, rarity: ItemRarity.UNIQUE, stats: { int: 80, ctrl: 40 }, options: ["MP +20%", "물리 명중률 +15%"], description: "자아를 가진 것처럼 실시간으로 전투를 연산하는 모듈.",imageUrl:"https://i.ibb.co/Y4CnSr11/Kakao-Talk-20260212-174106789-23.png"},
    { item: "전뇌 공간의 파편", type: 'Etc', droppedBy: ["마법공학 드론", "불량 섹터 경비봇"], chance: 0.2, minLvl: 30, rarity: ItemRarity.MAGIC, description: "가상 세계의 데이터가 실체화된 기묘한 파편입니다.",imageUrl:"https://i.ibb.co/t5d2m47/Kakao-Talk-20260212-174106789-04.png"},
    { item: "월스트리트의 비정한 넥타이", type: 'Accessory', droppedBy: ["월 스트리트 골렘"], chance: 0.05, minLvl: 100, rarity: ItemRarity.EPIC, stats: { wis: 40, ctrl: 40 }, options: ["WIS +10%", "상태이상 저항 +10%"], description: "차갑고 냉혹한 자본의 기운이 느껴지는 넥타이입니다.",imageUrl:"https://i.ibb.co/DDYPp317/Kakao-Talk-20260212-174106789-03.png"},
    { item: "루시모어의 바위 심장", type: 'Etc', droppedBy: ["러시모어 거신"], chance: 0.1, minLvl: 100, rarity: ItemRarity.UNIQUE, description: "거대한 석상의 가슴 깊은 곳에서 추출한 단단한 바위 핵입니다.",imageUrl:"https://i.ibb.co/8LgRvfDC/Kakao-Talk-20260212-174106789-02.png" },
    { item: "51구역의 블랙박스", type: 'Accessory', droppedBy: ["51구역의 생체 병기"], chance: 0.02, minLvl: 120, rarity: ItemRarity.UNIQUE, stats: { int: 100, ctrl: 50 }, options: ["물리 명중률 +30%", "전격계 속성 부여"], description: "해석 불가능한 외계의 데이터가 기록된 장치입니다.",imageUrl:"https://i.ibb.co/3GVq7Sp/Kakao-Talk-20260212-174106789-14.png" },
    { item: "알카트라즈의 끊어진 쇠사슬", type: 'Weapon', weaponType: 'Blunt', droppedBy: ["폭주족 구울"], chance: 0.07, minLvl: 70, rarity: ItemRarity.RARE, stats: { str: 45, def: 15 }, options: ["치명타 확률 +10%", "물리 공격력 +8%"], description: "절대로 탈출할 수 없는 감옥에서 쓰이던 묵직한 사슬입니다.",imageUrl:"https://i.ibb.co/YFNQKqWg/Kakao-Talk-20260212-174106789-24.png" },
    { item: "옐로스톤의 유황석", type: 'Etc', chance: 0.05, minLvl: 50, rarity: ItemRarity.MAGIC, description: "화산 지대의 열기를 머금은 노란색 광석입니다.",imageUrl:"https://i.ibb.co/vxBQMp0d/Kakao-Talk-20260212-174106789-05.png" },
    { item: "뉴욕 피자의 정수", type: 'Consumable', chance: 0.05, minLvl: 1, rarity: ItemRarity.RARE, options: ["HP 300 회복", "STR +5% (5턴)"], description: "대도시의 활기가 느껴지는 가장 완벽한 한 조각입니다.",imageUrl:"https://i.ibb.co/JjCznwS1/Kakao-Talk-20260212-174106789-11.png" },
    { item: "그랜드 캐니언의 모래시계", type: 'Accessory', chance: 0.03, minLvl: 100, rarity: ItemRarity.EPIC, stats: { wis: 60, ctrl: 30 }, options: ["물리 공격력 +10%", "대지계 속성 부여"], description: "억겁의 세월이 담긴 협곡의 모래로 만든 시계입니다.",imageUrl:"https://i.ibb.co/zhfnyvHq/Kakao-Talk-20260212-174106789-01.png"},
    { item: "나이아가라의 물안개 보주", type: 'SubWeapon', weaponType: 'Orb', chance: 0.04, minLvl: 110, rarity: ItemRarity.RARE, stats: { int: 50, wis: 50 }, options: ["해수계 속성 부여", "마법 방어력 +10%"], description: "거대한 폭포의 정기가 서린 투명한 구슬입니다.",imageUrl:"https://i.ibb.co/x8YCGwY7/Kakao-Talk-20260212-174106789-22.png" },
    { item: "백악관의 정의로운 깃펜", type: 'Etc', droppedBy: ["리버티 가디언"], chance: 0.03, minLvl: 150, rarity: ItemRarity.UNIQUE, description: "역사를 기록하고 법을 집행하던 신성한 깃펜입니다.",imageUrl:"https://i.ibb.co/hxVMnPVG/Kakao-Talk-20260212-174106789.png" }
];

// --- 라틴 아메리카 (멕시코, 브라질, 아르헨티나) ---
const LATIN_AMERICA_LOOT: AmericaLootEntry[] = [
    { item: "아즈텍 황금 달력", type: 'Etc', droppedBy: ["마야의 태양 제사장", "아즈텍 보병의 원혼"], chance: 0.01, minLvl: 121, rarity: ItemRarity.UNIQUE, description: "태양의 주기를 기록한 황금 유물.",imageUrl:"https://i.ibb.co/gFbRrS5q/Kakao-Talk-20260212-180039818-24.png" },
    { item: "아마존 비취 원석", type: 'Etc', droppedBy: ["비취 석상 전사", "비취 드래곤"], chance: 0.015, minLvl: 81, rarity: ItemRarity.RARE, description: "영롱한 초록빛을 띠는 아마존의 보석.",imageUrl:"https://i.ibb.co/QZF5k76/Kakao-Talk-20260212-180039818-23.png" },
    { item: "재규어 가죽", type: 'Etc', droppedBy: ["야생 재규어", "정글의 군주 재규어맨"], chance: 0.015, minLvl: 31, rarity: ItemRarity.MAGIC, description: "매우 질기고 문늬가 아름다운 가죽.",imageUrl:"https://i.ibb.co/8LgSx6p9/Kakao-Talk-20260212-180039818-22.png" },
    { item: "잉카의 태양 석판", type: 'Etc', droppedBy: ["잉카의 황금 골렘", "심연의 잉카 군주"], chance: 0.02, minLvl: 151, rarity: ItemRarity.EPIC, description: "태양의 힘을 저장하는 고대의 기술이 담긴 석판.",imageUrl:"https://i.ibb.co/ccNCP1NG/Kakao-Talk-20260212-180039818-21.png"},
    { item: "정글의 토템", type: 'Accessory', chance: 0.08, minLvl: 50, rarity: ItemRarity.RARE, stats: { wis: 20, def: 10 }, options: ["물리 방어력 +10%", "마법 방어력 +10%"], description: "부족의 수호령이 깃든 나무 조각상입니다.",imageUrl:"https://i.ibb.co/zHmL1mL9/Kakao-Talk-20260212-180039818-20.png" },
    { item: "코코아 콩", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "신의 음식이라 불리는 초콜릿의 원료입니다.",imageUrl:"https://i.ibb.co/zTGS9ZpW/Kakao-Talk-20260212-180039818-19.png" },
    { item: "마테차 잎", type: 'Consumable', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, options: ["MP 50 회복"], description: "활력을 불어넣어 주는 남미의 전통 찻잎입니다.",imageUrl:"https://i.ibb.co/5h7QyShf/Kakao-Talk-20260212-180039818-18.png" },
    { item: "케찰코아틀의 비늘", type: 'Etc', droppedBy: ["날개 달린 뱀 케찰코아틀"], chance: 0.01, minLvl: 200, rarity: ItemRarity.LEGENDARY, description: "바람과 대지의 신, 케찰코아틀의 영롱한 비늘." ,imageUrl:"https://i.ibb.co/Z6vd2y7r/Kakao-Talk-20260212-180039818-17.png"},
    { item: "츄파카브라의 날카로운 이빨", type: 'Etc', droppedBy: ["츄파카브라"], chance: 0.05, minLvl: 40, rarity: ItemRarity.MAGIC, description: "가축의 피를 빨아먹는 괴수의 날카로운 이빨입니다.",imageUrl:"https://i.ibb.co/rGYsZY1c/Kakao-Talk-20260212-180039818-16.png" },
    { item: "마야의 흑요석 제례검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["마야의 태양 제사장"], chance: 0.06, minLvl: 130, rarity: ItemRarity.RARE, stats: { str: 60, agi: 30 }, options: ["치명타율 +15%", "화염계 속성 부여"], description: "흑요석 날이 촘촘히 박힌 고대 마야의 전투검.",imageUrl:"https://i.ibb.co/YTQs6WR3/Kakao-Talk-20260212-180039818-15.png" },
    { item: "잉카의 황금 태양 원반", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["잉카의 황금 골렘"], chance: 0.04, minLvl: 160, rarity: ItemRarity.UNIQUE, stats: { def: 100, hp: 1000 }, options: ["물리 방어력 +20%", "태양계 속성 부여"], description: "태양신의 권능이 상징된 찬란한 황금 원반 방패.",imageUrl:"https://i.ibb.co/7xVm6R7x/Kakao-Talk-20260212-180039818-14.png" },
    { item: "아마존의 맹독 가루", type: 'Consumable', droppedBy: ["정글 독개구리", "거대 아마존 비단뱀"], chance: 0.15, minLvl: 20, rarity: ItemRarity.MAGIC, options: ["적 전체 중독 부여"], description: "아마존의 치명적인 생물들에게서 추출한 맹독 가루.",imageUrl:"https://i.ibb.co/FqnDm48v/Kakao-Talk-20260212-180039818-13.png" },
    { item: "안데스 콘도르의 깃털", type: 'Etc', droppedBy: ["안데스 독수리"], chance: 0.1, minLvl: 30, rarity: ItemRarity.NORMAL, description: "높은 산맥을 가로지르는 콘도르의 거대한 날개 깃털.",imageUrl:"https://i.ibb.co/M5xzkBdk/Kakao-Talk-20260212-180039818-12.png" },
    { item: "나스카 라인 지팡이", type: 'Weapon', weaponType: 'Staff', chance: 0.001, minLvl: 150, rarity: ItemRarity.LEGENDARY, stats: { int: 150, wis: 80 }, options: ["마법 공격력 +30%", "질풍계 속성 부여", "물리 회피율 +10%"], description: "지상에 그려진 거대 기하학 문양의 기운이 서린 신비한 지팡이.",imageUrl:"https://i.ibb.co/kn5Y0S8/Kakao-Talk-20260212-180039818-11.png" },
    { item: "라 플라타의 은빛 보주", type: 'SubWeapon', weaponType: 'Orb', chance: 0.03, minLvl: 70, rarity: ItemRarity.RARE, stats: { int: 45, wis: 45 }, options: ["해수계 속성 부여"], description: "은의 강이라 불리는 라 플라타 강의 정기가 깃든 보주.",imageUrl:"https://i.ibb.co/zTTvvQVX/Kakao-Talk-20260212-180039818-10.png" },
    { item: "마야의 흑요석 심장", type: 'Etc', droppedBy: ["마야의 태양 제사장"], chance: 0.03, minLvl: 150, rarity: ItemRarity.UNIQUE, description: "검은 광채를 내뿜는 고대 제사장의 심장석입니다.",imageUrl:"https://i.ibb.co/mF4bVRFb/Kakao-Talk-20260212-180039818-09.png" },
    { item: "아마존 정글의 독꽃", type: 'Consumable', chance: 0.1, minLvl: 40, rarity: ItemRarity.RARE, options: ["중독 상태이상 부여 (50%)"], description: "아름답지만 치명적인 향기를 내뿜는 정글의 포식 식물입니다.",imageUrl:"https://i.ibb.co/m5w3kxDw/Kakao-Talk-20260212-180039818-08.png" },
    { item: "파치아마마의 축복받은 흙", type: 'Etc', chance: 0.05, minLvl: 60, rarity: ItemRarity.MAGIC, description: "대지 모신 파치아마마의 축복이 깃든 풍요로운 흙입니다.",imageUrl:"https://i.ibb.co/sJXfKDcK/Kakao-Talk-20260212-180039818-07.png" },
    { item: "잉카의 태양 마스크", type: 'Head', droppedBy: ["잉카의 황금 골렘", "심연의 잉카 군주"], chance: 0.03, minLvl: 210, rarity: ItemRarity.EPIC, stats: { def: 60, wis: 40, ctrl: 40 }, options: ["태양계 속성 피해 +25%", "광휘계 속성 저항 +30%"], description: "황금으로 벼려진 태양신의 얼굴 형상입니다.", imageUrl:"https://i.ibb.co/HfG2S9ZZ/Kakao-Talk-20260212-180039818.png" },
    { item: "리오의 삼바 깃털 관", type: 'Head', droppedBy: ["삼바 댄서 팬텀"], chance: 0.06, minLvl: 90, rarity: ItemRarity.RARE, stats: { agi: 30, ctrl: 20 }, options: ["물리 회피율 +15%", "마법 회피율 +15%"], description: "축제의 열기가 담긴 화려한 깃털 장식입니다.",imageUrl:"https://i.ibb.co/tTgkZVcX/Kakao-Talk-20260212-180039818-06.png" },
    { item: "안데스 산맥의 콘도르 발톱", type: 'Weapon', weaponType: 'Knuckle', droppedBy: ["안데스 독수리", "안데스 콘도르 로드"], chance: 0.08, minLvl: 110, rarity: ItemRarity.RARE, stats: { str: 55, agi: 35 }, options: ["물리 공격력 +12%", "출혈 유발 +15%"], description: "하늘의 제왕 콘도르의 거대한 발톱을 가공한 무기입니다.",imageUrl:"https://i.ibb.co/fGYHzhNs/Kakao-Talk-20260212-180039818-05.png" },
    { item: "나스카 지상화의 마력 결정", type: 'Accessory', chance: 0.02, minLvl: 140, rarity: ItemRarity.UNIQUE, stats: { wis: 80, ctrl: 80 }, options: ["마법 공격력 +35%", "상태이상 저항 +15%"], description: "광활한 대지에 새겨진 문양에서 추출한 고밀도 마력 결정입니다.",imageUrl:"https://i.ibb.co/4g0nT96B/Kakao-Talk-20260212-180039818-04.png" },
    { item: "카리브해 해적의 보물지도", type: 'Etc', droppedBy: ["카리브해 해적 좀비"], chance: 0.12, minLvl: 50, rarity: ItemRarity.RARE, description: "전설적인 해적이 남긴 숨겨진 보물창고의 위치가 적힌 지도입니다.",imageUrl:"https://i.ibb.co/1YJ5CJk2/Kakao-Talk-20260212-180039818-03.png" },
    { item: "탱고의 핏빛 장미", type: 'Accessory', droppedBy: ["탱고 쉐도우 블레이드"], chance: 0.05, minLvl: 100, rarity: ItemRarity.EPIC, stats: { agi: 50, ctrl: 30 }, options: ["치명타 피해 +30%", "암흑계 속성 부여"], description: "그림자 무희가 남긴, 결코 시들지 않는 핏빛 장미입니다.",imageUrl:"https://i.ibb.co/PsvdjKfK/Kakao-Talk-20260212-180039818-02.png" },
    { item: "엘 도라도의 황금 가루", type: 'Etc', chance: 0.01, minLvl: 200, rarity: ItemRarity.LEGENDARY, description: "황금의 도시 엘 도라도에서 흘러나온 태초의 황금 가루입니다.",imageUrl:"https://i.ibb.co/VWTR5tv8/Kakao-Talk-20260212-180039818-01.png" }
];

export const AMERICA_MONSTER_LOOT: Record<string, AmericaLootEntry[]> = {
    "미국": NORTH_AMERICA_LOOT,
    "캐나다": NORTH_AMERICA_LOOT,
    "멕시코": LATIN_AMERICA_LOOT,
    "브라질": LATIN_AMERICA_LOOT,
    "아르헨티나": LATIN_AMERICA_LOOT
};
