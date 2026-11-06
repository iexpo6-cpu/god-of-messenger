import { ItemRarity, Stats, WeaponType } from './types';

export interface EuropeLootEntry {
    item: string;
    type: 'Etc' | 'Weapon' | 'SubWeapon' | 'Head' | 'Body' | 'Feet' | 'Hand' | 'Accessory' | 'Consumable';
    weaponType?: WeaponType;
    droppedBy?: string[]; // 비어있으면 해당 지역 공용 드랍
    chance: number;
    minLvl: number;
    rarity: ItemRarity;
    stats?: Partial<Stats>;
    options?: string[];
      imageUrl?: string;
    description: string;
}

// --- 서유럽 (영국, 네덜란드, 스위스 등) ---
const WEST_EUROPE_LOOT: EuropeLootEntry[] = [
    { item: "아서왕의 은화", type: 'Etc', droppedBy: ["안개 속 부랑자", "무너진 원탁의 기사", "아서왕의 환영"], chance: 0.1, minLvl: 11, rarity: ItemRarity.MAGIC, description: "고대 브리튼의 은화입니다.", imageUrl:"https://i.ibb.co/nM5mv8RM/Kakao-Talk-20260214-164033082-09.png" },
    { item: "증기 기관 파편", type: 'Etc', droppedBy: ["증기 핵 거신", "스팀 펑크 가고일", "낡은 태엽 인형"], chance: 0.05, minLvl: 61, rarity: ItemRarity.RARE, description: "정교한 기계 장치의 부품입니다.",imageUrl:"https://i.ibb.co/pvHgZnQk/Kakao-Talk-20260214-164033082-08.png" },
    { item: "가고일의 돌심장", type: 'Etc', droppedBy: ["스팀 펑크 가고일", "성당의 가고일 조각"], chance: 0.05, minLvl: 41, rarity: ItemRarity.RARE, description: "생명력을 불어넣던 마법의 돌 심장입니다.",imageUrl:"https://i.ibb.co/LdqKMPyb/Kakao-Talk-20260214-164033082-07.png" },
    { item: "런던의 안개 결정", type: 'Etc', chance: 0.05, minLvl: 20, rarity: ItemRarity.MAGIC, description: "기척을 숨겨주는 신비로운 안개 정수입니다.",imageUrl:"https://i.ibb.co/RpmfMzWv/Kakao-Talk-20260214-164033082-06.png" },
    { item: "잉글리시 티 잎", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["MP 50 회복"], description: "정신을 맑게 해주는 최고급 찻잎입니다.",imageUrl:"https://i.ibb.co/s9PKPXLL/Kakao-Talk-20260214-164033082-05.png" },
    { item: "스위스 정밀 기어", type: 'Etc', chance: 0.03, minLvl: 80, rarity: ItemRarity.RARE, description: "초정밀 기계 공학의 산물. 제작 재료로 쓰입니다.",imageUrl:"https://i.ibb.co/gZHFPVjt/Kakao-Talk-20260214-164033082-04.png" },
    { item: "드루이드의 약초", type: 'Consumable', chance: 0.05, minLvl: 30, rarity: ItemRarity.MAGIC, options: ["상태이상 해제(중독, 마비)"], description: "켈트 드루이드들이 사용하던 신비한 약초입니다.",imageUrl:"https://i.ibb.co/rfc0Yfc4/Kakao-Talk-20260214-164025982-29.png"},
    { item: "엑스칼리버의 파편", type: 'Weapon', weaponType: 'Sword', droppedBy: ["아서왕의 환영", "심연의 원탁 로드","성검의 수호자"], chance: 0.001, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { str: 140, wis: 70 }, options: ["물리 공격력 +20%", "광휘계 속성 부여"], description: "전설의 성검 조각입니다.",imageUrl:"https://i.ibb.co/qLNpKBRj/Kakao-Talk-20260214-164025982-28.png" },
    { item: "하이랜드 위스키", type: 'Consumable', chance: 0.02, minLvl: 20, rarity: ItemRarity.RARE, options: ["HP 200 회복", "STR +5% (3턴)"], description: "스코틀랜드의 거친 기운이 담긴 도수 높은 위스키입니다.",imageUrl:"https://i.ibb.co/chhf48pG/Kakao-Talk-20260214-164025982-27.png" },
    { item: "켈피의 고삐", type: 'Etc', droppedBy: ["스코틀랜드의 켈피", "지옥의 켈피"], chance: 0.03, minLvl: 100, rarity: ItemRarity.EPIC, description: "물가에서 서식하는 마수 켈피를 다루던 가죽 고삐입니다.",imageUrl:"https://i.ibb.co/SwVHNZ37/Kakao-Talk-20260214-164025982-26.png" },
    { item: "빅 벤의 태엽", type: 'Etc', droppedBy: ["무너진 시계탑의 지배자"], chance: 0.02, minLvl: 150, rarity: ItemRarity.UNIQUE, description: "거대한 시계탑을 움직이던 핵심 정밀 태엽입니다.",imageUrl:"https://i.ibb.co/gNxCN1P/Kakao-Talk-20260214-164025982-25.png" },
    { item: "밴시의 비명 유리병", type: 'Accessory', droppedBy: ["그림자 밴시"], chance: 0.02, minLvl: 150, rarity: ItemRarity.EPIC, stats: { int: 45, wis: 30 }, options: ["CTRL +10%"], description: "밴시의 날카로운 비명을 마법적으로 가두어 만든 병입니다.",imageUrl:"https://i.ibb.co/G38Db96b/Kakao-Talk-20260214-164025982-24.png" },
    { item: "낡은 회중시계", type: 'Accessory', chance: 0.15, minLvl: 50, rarity: ItemRarity.MAGIC, stats: { wis: 10, agi: 5 }, description: "시간의 흐름을 조금이나마 체감하게 해주는 세련된 시계입니다.",imageUrl:"https://i.ibb.co/WWn8nc5t/Kakao-Talk-20260214-164025982-23.png"},
    { item: "비행선 프로펠러 조각", type: 'Etc', droppedBy: ["차원 균열의 기계공"], chance: 0.1, minLvl: 200, rarity: ItemRarity.RARE, description: "하늘을 날던 비행선의 부서진 프로펠러 조각입니다.",imageUrl:"https://i.ibb.co/m554nNrk/Kakao-Talk-20260214-164025982-22.png" },
    { item: "기사 작위 임명장", type: 'Etc', droppedBy: ["원탁의 탈락 전사", "머리 없는 기사"], chance: 0.02, minLvl: 100, rarity: ItemRarity.UNIQUE, description: "명예로운 기사의 작위가 적힌 고대 양피지입니다.",imageUrl:"https://i.ibb.co/My7kcdKk/Kakao-Talk-20260214-164025982-21.png" },
    { item: "풍차의 천 조각", type: 'Etc', droppedBy: ["윈드밀 타이탄"], chance: 0.01, minLvl: 150, rarity: ItemRarity.RARE, description: "네덜란드의 거대 풍차 날개에 씌워져 있던 튼튼한 천입니다.",imageUrl:"https://i.ibb.co/qFnsXsXZ/Kakao-Talk-20260214-164025982-20.png" },
    { item: "셰익스피어의 펜촉", type: 'Accessory', chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { int: 60, wis: 60 }, options: ["AGI +15%"], description: "문학적 영감이 샘솟게 하는 전설적인 작가의 펜촉입니다.",imageUrl:"https://i.ibb.co/KxMRW9Ys/Kakao-Talk-20260214-164025982-19.png" },
    { item: "녹슨 톱니바퀴", type: 'Etc', droppedBy: ["낡은 태엽 인형", "녹슨 톱니 슬라임"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "오래되어 녹슬었지만 여전히 마력이 깃든 톱니바퀴입니다.",imageUrl:"https://i.ibb.co/fYJ2N9ZL/Kakao-Talk-20260214-164025982-18.png" }
];

// --- 라틴 유럽 (프랑스, 스페인, 이탈리아 등) ---
const LATIN_EUROPE_LOOT: EuropeLootEntry[] = [
    { item: "로마 백부장의 망토 조각", type: 'Etc', droppedBy: ["로마 보병의 원혼", "황금 기사단의 유령", "성기사 단장"], chance: 0.05, minLvl: 21, rarity: ItemRarity.RARE, description: "명예로운 붉은 망토 파편입니다.",imageUrl:"https://i.ibb.co/6cnGbFcw/Kakao-Talk-20260214-164025982-17.png" },
    { item: "투우사의 붉은 천", type: 'Etc', droppedBy: ["떠돌이 투우 소", "태양의 투우 마수"], chance: 0.03, minLvl: 51, rarity: ItemRarity.RARE, description: "맹수를 유인할 때 쓰던 강렬한 붉은 천.",imageUrl:"https://i.ibb.co/N2j9Rkdn/Kakao-Talk-20260214-164025982-16.png" },
    { item: "성당의 성초", type: 'Etc', droppedBy: ["성당 수호 사자", "심판의 종지기"], chance: 0.05, minLvl: 31, rarity: ItemRarity.MAGIC, description: "신성한 기운이 감도는 축복받은 초.",imageUrl:"https://i.ibb.co/vxpDPt1Z/Kakao-Talk-20260214-164025982-15.png" },
    { item: "베네치아 가면", type: 'Accessory', chance: 0.08, minLvl: 60, rarity: ItemRarity.RARE, stats: { int: 20, ctrl: 15 }, options: ["상태이상 저항 +10%"], description: "정체를 숨겨주는 화려한 카니발 가면입니다.",imageUrl:"https://i.ibb.co/4n1px4QH/Kakao-Talk-20260214-164025982-14.png" },
    { item: "성수 (Holy Water)", type: 'Consumable', chance: 0.05, minLvl: 10, rarity: ItemRarity.MAGIC, options: ["HP 100 회복"], description: "악한 기운을 정화하는 축복받은 물입니다.",imageUrl:"https://i.ibb.co/0yNzZnCW/Kakao-Talk-20260214-164025982-13.png" },
    { item: "바게트 빵", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 30 회복"], description: "겉은 바삭하고 속은 촉촉한 빵입니다.",imageUrl:"https://i.ibb.co/MyPNnn9z/Kakao-Talk-20260214-164025982-12.png" },
    { item: "로마 금화", type: 'Etc', chance: 0.05, minLvl: 5, rarity: ItemRarity.RARE, description: "고대 로마 제국의 문양이 새겨진 귀중한 금화.",imageUrl:"https://i.ibb.co/Z12gcRpB/Kakao-Talk-20260214-164025982-11.png" },
    { item: "듀란달 (모조품)", type: 'Weapon', weaponType: 'Sword', droppedBy: ["성기사 단장", "심판의 기사", "광휘의 팔라딘 나이트"], chance: 0.02, minLvl: 201, rarity: ItemRarity.UNIQUE, stats: { str: 110, agi: 40 }, options: ["물리 공격력 +15%", "신체강화계 속성 부여"], description: "롤랑의 검을 본떠 만든 명검입니다.",imageUrl:"https://i.ibb.co/jjxYHd8/Kakao-Talk-20260214-164025982-10.png" },
    { item: "다빈치의 설계도 파편", type: 'Etc', droppedBy: ["레오나르도의 기계 거미"], chance: 0.05, minLvl: 120, rarity: ItemRarity.UNIQUE, description: "천재 화가이자 발명가인 다빈치의 잃어버린 설계도 조각입니다.",imageUrl:"https://i.ibb.co/KQMxKTP/Kakao-Talk-20260214-164025982-09.png" },
    { item: "콜로세움의 모래", type: 'Etc', droppedBy: ["콜로세움의 포식자", "검투사 견습생"], chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "수많은 전사들의 피와 땀이 섞인 경기장의 모래입니다." ,imageUrl:"https://i.ibb.co/5hZFQsc0/Kakao-Talk-20260214-164025982-08.png"},
    { item: "글라디우스", type: 'Weapon', weaponType: 'Sword', droppedBy: ["로마 보병의 원혼"], chance: 0.1, minLvl: 30, rarity: ItemRarity.MAGIC, stats: { str: 15, agi: 10 }, description: "로마 군단병들이 사용하던 실용적이고 치명적인 단검입니다.",imageUrl:"https://i.ibb.co/MyV6wrTn/Kakao-Talk-20260214-164025982-07.png" },
    { item: "바티칸의 은총 십자가", type: 'Accessory', droppedBy: ["바티칸의 타락 가디언"], chance: 0.03, minLvl: 150, rarity: ItemRarity.EPIC, stats: { wis: 50, ctrl: 40 }, options: ["상태이상 저항 +15%"], description: "신의 은총이 깃든 정교한 은제 십자가입니다.",imageUrl:"https://i.ibb.co/yB8RVpWC/Kakao-Talk-20260214-164025982-06.png" },
    { item: "곤돌라의 노 조각", type: 'Etc', droppedBy: ["수로의 물귀신", "베네치아의 심해 히드라"], chance: 0.05, minLvl: 80, rarity: ItemRarity.RARE, description: "베네치아의 수로를 젓던 곤돌라의 부러진 노 조각입니다." ,imageUrl:"https://i.ibb.co/ZzkGDcG0/Kakao-Talk-20260214-164025982-05.png"},
    { item: "플라멩코 붉은 구두", type: 'Feet', chance: 0.06, minLvl: 100, rarity: ItemRarity.RARE, stats: { agi: 40, def: 10 }, options: ["물리 회피율 +10%"], description: "정열적인 춤사위의 기운이 담긴 스페인 전통 구두입니다.",imageUrl:"https://i.ibb.co/gZ2FSSs1/Kakao-Talk-20260214-164025982-04.png" },
    { item: "피의 추기경 인장", type: 'Accessory', droppedBy: ["피의 추기경"], chance: 0.04, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { int: 55, ctrl: 35 }, options: ["마법 공격력 +12%"], description: "비밀스러운 종교 조직의 권위를 상징하는 인장입니다.",imageUrl:"https://i.ibb.co/PfqMmy4/Kakao-Talk-20260214-164025982-03.png" },
    { item: "대리석 조각상 머리", type: 'Etc', droppedBy: ["성역의 수호 조각상", "대리석 가디언"], chance: 0.1, minLvl: 60, rarity: ItemRarity.MAGIC, description: "살아 움직이는 예술품에서 떨어져 나온 차가운 대리석 파편입니다.",imageUrl:"https://i.ibb.co/wmFCBVk/Kakao-Talk-20260214-164025982-02.png" },
    { item: "무적 함대의 망원경", type: 'Accessory', droppedBy: ["무적 함대의 함장", "무적 함대의 망령","성궤의 수호 천사"], chance: 0.002, minLvl: 150, rarity: ItemRarity.LEGENDARY, stats: { wis: 100, agi: 50 }, options: ["물리 명중률 +30%"], description: "수평선 너머의 적을 꿰뚫어 보게 해주는 고대 함대의 망원경입니다.",imageUrl:"https://i.ibb.co/39nYJ6kJ/Kakao-Talk-20260214-164025982-01.png" },
    { item: "포도주 슬라임의 젤리", type: 'Consumable', droppedBy: ["포도주 슬라임"], chance: 0.1, minLvl: 15, rarity: ItemRarity.NORMAL, options: ["MP 80 회복"], description: "포도주의 향취가 진하게 배어 있는 달콤한 젤리입니다.",imageUrl:"https://i.ibb.co/BV2mjDhk/Kakao-Talk-20260214-164025982.png" }
];

// --- 북유럽 (스웨덴, 노르웨이, 핀란드, 폴란드 등) ---
const NORTH_EUROPE_LOOT: EuropeLootEntry[] = [
    { item: "세계수 유그드라실의 가지", type: 'Etc', droppedBy: ["숲의 고대 트롤", "요르문간드의 분신", "서리 거인"], chance: 0.01, minLvl: 150, rarity: ItemRarity.EPIC, description: "무한한 마력이 깃든 나뭇가지입니다.", imageUrl:"https://i.ibb.co/xqjJ5Hv4/Gemini-Generated-Image-7ltpgq7ltpgq7ltp.png"},
    { item: "룬 문자가 새겨진 돌", type: 'Etc', droppedBy: ["얼음 트롤", "서리 거인", "발키리의 환영"], chance: 0.01, minLvl: 41, rarity: ItemRarity.RARE, description: "고대 북유럽의 신비한 문자가 새겨진 마석.", imageUrl:"https://i.ibb.co/TNzV1r5/Gemini-Generated-Image-141qcd141qcd141q.png" },
    { item: "발키리의 깃털 장식", type: 'Accessory', droppedBy: ["빙결의 발키리", "발키리의 환영"], chance: 0.01, minLvl: 121, rarity: ItemRarity.EPIC, stats: { agi: 30, wis: 20 }, options: ["물리 회피율 +5%", "빙결계 속성 부여"], description: "천상의 전사가 남긴 눈부신 깃털.",imageUrl:"https://i.ibb.co/6cwX6mWQ/Gemini-Generated-Image-cb0d0kcb0d0kcb0d.png" },
    { item: "서리 거인의 이빨", type: 'Etc', chance: 0.05, minLvl: 100, rarity: ItemRarity.RARE, description: "결코 녹지 않는 한기를 품은 거대한 이빨입니다.",imageUrl:"https://i.ibb.co/7xKCWFqV/Gemini-Generated-Image-u8rbaeu8rbaeu8rb.png" },
    { item: "발할라의 꿀주", type: 'Consumable', chance: 0.05, minLvl: 50, rarity: ItemRarity.RARE, options: ["일시적 STR +10% (1턴)"], description: "전사들의 사기를 북돋우는 강렬한 술입니다.",imageUrl:"https://i.ibb.co/HLBMkNBx/Gemini-Generated-Image-i326s8i326s8i326.png" },
    { item: "순백의 늑대 가죽", type: 'Etc', droppedBy: ["겨울 늑대", "스콜의 후예"], chance: 0.1, minLvl: 40, rarity: ItemRarity.MAGIC, description: "눈보라 속에서도 체온을 지켜주는 부드러운 가죽.",imageUrl:"https://i.ibb.co/dw8GjCgV/Gemini-Generated-Image-9bbvw49bbvw49bbv.png" },
    { item: "묠니르의 후예", type: 'Weapon', weaponType: 'Blunt', droppedBy: ["천둥신 토르의 분신", "서리 거인"], chance: 0.01, minLvl: 151, rarity: ItemRarity.LEGENDARY, stats: { str: 175, ctrl: 85 }, options: ["전격계 속성 부여", "물리 공격력 +15%"], description: "토르의 힘을 계승한 파괴적인 해머입니다.",imageUrl:"https://i.ibb.co/v6nCvhNZ/Gemini-Generated-Image-z63jwfz63jwfz63j.png" },
    { item: "바이킹 뿔잔", type: 'Etc', droppedBy: ["타락한 바이킹 전사", "빙결된 보병"], chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "축배를 들 때 사용하던 거친 짐승의 뿔로 만든 잔입니다.", imageUrl:"https://i.ibb.co/jZMR2btD/Gemini-Generated-Image-d5dpbpd5dpbpd5dp.png" },
    { item: "오로라 파편", type: 'Etc', droppedBy: ["세계를 덮는 한기", "혹한의 절대자"], chance: 0.02, minLvl: 140, rarity: ItemRarity.UNIQUE, description: "밤하늘의 오로라가 지상에 내려앉아 굳어진 신비로운 빛의 파편입니다.",imageUrl:"https://i.ibb.co/B5pdLDWk/Gemini-Generated-Image-g3mgw2g3mgw2g3mg.png" },
    { item: "펜리르의 송곳니", type: 'Weapon', weaponType: 'Sword', droppedBy: ["종말의 펜리르"], chance: 0.001, minLvl: 150, rarity: ItemRarity.LEGENDARY, stats: { str: 160, agi: 110 }, options: ["상태이상 저항 +10%", "물리 공격력 +30%"], description: "세계를 삼킬 늑대 펜리르의 송곳니를 제련한 검입니다.",imageUrl:"https://i.ibb.co/BKLcBbm2/Gemini-Generated-Image-sx4njjsx4njjsx4n.png" },
    { item: "프레이야의 목걸이 조각", type: 'Accessory', chance: 0.02, minLvl: 180, rarity: ItemRarity.EPIC, stats: { wis: 60, ctrl: 60 }, options: ["상태이상 저항 +20%"], description: "여신 프레이야가 지녔던 눈부신 목걸이의 일부입니다.",imageUrl:"https://i.ibb.co/ymjCTHYN/Gemini-Generated-Image-pqh2ttpqh2ttpqh2.png" },
    { item: "발키리의 은빛 방패", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["빙결의 발키리"], chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { def: 120, wis: 40 }, options: ["마법 방어력 +20%", "상태이상 저항 +10%"], description: "전사들의 영혼을 인도하는 발키리가 사용하던 방패입니다.",imageUrl:"https://i.ibb.co/PGHsMqLW/Gemini-Generated-Image-aaninfaaninfaani.png" },
    { item: "룬 술사의 두루마리", type: 'Etc', droppedBy: ["그림자 룬 술사", "룬 수호령"], chance: 0.1, minLvl: 140, rarity: ItemRarity.RARE, description: "고대 룬 마법의 비법이 적힌 오래된 가죽 두루마리입니다.",imageUrl:"https://i.ibb.co/b5xWGYV5/Gemini-Generated-Image-p1s3q6p1s3q6p1s3.png" },
    { item: "얼어붙은 연어", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 50 회복"], description: "북해의 차가운 물에서 잡아올린 신선한 연어입니다.",imageUrl:"https://i.ibb.co/ks7V2CBT/Gemini-Generated-Image-1e6qd41e6qd41e6q.png" },
    { item: "피오르드 미네랄 워터", type: 'Consumable', chance: 0.15, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["MP 40 회복"], description: "협곡의 깨끗한 빙하가 녹아 흐르는 순수한 물입니다.",imageUrl:"https://i.ibb.co/3mLvMm8F/Gemini-Generated-Image-9r9m49r9m49r9m49.png" },
    { item: "요르문간드의 독액", type: 'Etc', droppedBy: ["요르문간드의 분신", "요르문간드의 아가리"], chance: 0.04, minLvl: 200, rarity: ItemRarity.RARE, description: "대지를 휘감는 거대 뱀의 치명적인 맹독 농축액입니다.",imageUrl:"https://i.ibb.co/G4Dj54Xb/Gemini-Generated-Image-s7xrkgs7xrkgs7xr.png" },
    { item: "눈사태 조각", type: 'Etc', droppedBy: ["눈사태 조각", "서리 거인 새끼"], chance: 0.15, minLvl: 5, rarity: ItemRarity.NORMAL, description: "강한 마력에 의해 뭉쳐진 결코 녹지 않는 눈 덩어리입니다.",imageUrl:"https://i.ibb.co/spSBBdRW/Gemini-Generated-Image-951lww951lww951l.png" }
];

// --- 동유럽 (러시아, 우크라이나, 루마니아 등) ---
const EAST_EUROPE_LOOT: EuropeLootEntry[] = [
    { item: "드라큘라의 낡은 송곳니", type: 'Etc', droppedBy: ["피의 성주 드라큘라", "진조의 뱀파이어 나이트"], chance: 0.05, minLvl: 101, rarity: ItemRarity.EPIC, description: "진조 뱀파이어의 날카로운 송곳니입니다.",imageUrl:"https://i.ibb.co/LhzstfPd/Gemini-Generated-Image-qdec34qdec34qdec.png" },
    { item: "진조의 혈석", type: 'Etc', droppedBy: ["피의 성주 드라큘라"], chance: 0.03, minLvl: 251, rarity: ItemRarity.UNIQUE, description: "응고된 진조의 피가 보석처럼 변한 것.",imageUrl:"https://i.ibb.co/Q70j6YzS/Gemini-Generated-Image-fb6g77fb6g77fb6g.png" },
    { item: "차르의 황금 훈장", type: 'Accessory', droppedBy: ["타락한 차르의 친위대", "폭풍의 차르 유령"], chance: 0.05, minLvl: 101, rarity: ItemRarity.RARE, stats: { def: 20, wis: 20 }, options: ["CTRL +5%"], description: "제국의 영광을 상징하던 훈장.",imageUrl:"https://i.ibb.co/LdNrghfb/Gemini-Generated-Image-q8x2xcq8x2xcq8x2.png" },
    { item: "해바라기 씨앗", type: 'Consumable', chance: 0.15, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["HP 20 회복"], description: "고소한 맛이 일품인 영양 간식입니다.",imageUrl:"https://i.ibb.co/0RmSsbqR/Gemini-Generated-Image-92mcpk92mcpk92mc.png" },
    { item: "보드카 병", type: 'Consumable', chance: 0.1, minLvl: 20, rarity: ItemRarity.MAGIC, options: ["빙결 상태이상 해제"], description: "타오르는 갈증을 해결하고 추위를 잊게 합니다.",imageUrl:"https://i.ibb.co/XrkvY8ZB/Gemini-Generated-Image-qv1j1fqv1j1fqv1j.png"},
    { item: "곰 발톱 조각", type: 'Etc', droppedBy: ["겨울 곰", "툰드라의 군주"], chance: 0.07, minLvl: 60, rarity: ItemRarity.MAGIC, description: "매우 크고 위협적인 곰의 발톱입니다.",imageUrl:"https://i.ibb.co/1Jd7wyQk/Gemini-Generated-Image-7fg59o7fg59o7fg5.png" },
    { item: "차르의 황금 검", type: 'Weapon', weaponType: 'Sword', droppedBy: ["타락한 차르의 친위대", "폭풍의 차르 유령","슬라브의 파괴신"], chance: 0.01, minLvl: 201, rarity: ItemRarity.LEGENDARY, stats: { str: 125, wis: 85 }, options: ["최종 능력치 +10%", "강철계 속성 부여"], description: "제국의 권위를 상징하는 검입니다.",imageUrl:"https://i.ibb.co/G4By8rZt/Gemini-Generated-Image-fpoa8kfpoa8kfpoa.png"},
    { item: "바바야가의 빗자루 나무", type: 'Etc', droppedBy: ["안개 속의 바바야가"], chance: 0.08, minLvl: 110, rarity: ItemRarity.RARE, description: "깊은 숲의 마녀가 타고 다니던 비행용 빗자루의 재료입니다.",imageUrl:"https://i.ibb.co/RGMrTMKy/Gemini-Generated-Image-ajy4wsajy4wsajy4.png" },
    { item: "윈디고의 얼어붙은 뼈", type: 'Etc', droppedBy: ["영겁의 굶주림 윈디고의 팔"], chance: 0.04, minLvl: 160, rarity: ItemRarity.EPIC, description: "끝없는 허기를 느끼게 하는 저주받은 괴물의 뼈입니다.",imageUrl:"https://i.ibb.co/gMY0pHDP/Gemini-Generated-Image-7zzcyn7zzcyn7zzc.png" },
    { item: "피의 성배 파편", type: 'SubWeapon', weaponType: 'Orb', droppedBy: ["피의 성주 드라큘라"], chance: 0.02, minLvl: 140, rarity: ItemRarity.UNIQUE, stats: { int: 80, ctrl: 60 }, options: ["상태이상 저항 +15%"], description: "영원한 생명을 꿈꾸던 자들의 피를 담았던 잔의 파편입니다.",imageUrl:"https://i.ibb.co/kVfYhYXZ/Gemini-Generated-Image-4ki9v24ki9v24ki9.png" },
    { item: "러시아식 털모자(Ushanka)", type: 'Head', chance: 0.06, minLvl: 40, rarity: ItemRarity.MAGIC, stats: { def: 20, wis: 10 }, description: "살을 에는 듯한 추위를 막아주는 든든한 털모자입니다.",imageUrl:"https://i.ibb.co/whP8hwBX/Gemini-Generated-Image-4gfsc14gfsc14gfs.png" },
    { item: "마트료시카 골렘 팔", type: 'Etc', droppedBy: ["마트료시카 골렘"], chance: 0.1, minLvl: 70, rarity: ItemRarity.RARE, description: "겹겹이 쌓인 마법 구조를 가진 기괴한 골렘의 부품입니다.",imageUrl:"https://i.ibb.co/NgYdnCTh/Gemini-Generated-Image-fg6918fg6918fg69.png" },
    { item: "발랄라이카 현", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "러시아 전통 악기의 줄입니다. 질긴 마력을 품고 있습니다.",imageUrl:"https://i.ibb.co/0pjKRQWK/Gemini-Generated-Image-8hvazz8hvazz8hva.png" },
    { item: "시베리아의 푸른 얼음", type: 'Etc', droppedBy: ["상트페테르부르크의 수수께끼", "네바의 차가운 정수"], chance: 0.05, minLvl: 100, rarity: ItemRarity.RARE, description: "수만 년 동안 얼어붙어 보석처럼 변한 투명한 얼음입니다.",imageUrl:"https://i.ibb.co/r2JmpB3m/Gemini-Generated-Image-1vvaux1vvaux1vva.png" },
    { item: "코사크의 말등자", type: 'Accessory', droppedBy: ["코사크 파이어 스피릿"], chance: 0.03, minLvl: 1300, rarity: ItemRarity.UNIQUE, stats: { agi: 45, str: 35 }, options: ["AGI +10%", "물리 공격력 +8%"], description: "광활한 초원을 달리던 전사들의 기상이 담긴 등자입니다.",imageUrl:"https://i.ibb.co/qFxmC0BB/Gemini-Generated-Image-mr87yomr87yomr87.png" },
    { item: "체르노보그의 심장 파편", type: 'Etc', droppedBy: ["슬라브의 흑신 체르노보그의 심장","슬라브의 파괴신"], chance: 0.001, minLvl: 200, rarity: ItemRarity.LEGENDARY, description: "악의 신으로 추앙받던 존재의 어두운 정수가 담긴 파편입니다.",imageUrl:"https://i.ibb.co/CKS8D71j/Gemini-Generated-Image-xnwl9hxnwl9hxnwl.png" },
    { item: "피로 물든 묘비령", type: 'Etc', droppedBy: ["오래된 묘비령", "길 잃은 좀비"], chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "원한 서린 영혼들이 깃들어 붉게 변한 돌 조각입니다.",imageUrl:"https://i.ibb.co/gLq2QnDx/Gemini-Generated-Image-sxskjfsxskjfsxsk.png" }
];

// --- 지중해/기타 (그리스, 터키 등) ---
const MEDITERRANEAN_LOOT: EuropeLootEntry[] = [
    { item: "올림포스의 신주(Ambrosia)", type: 'Consumable', droppedBy: ["주신 제우스의 투영", "태양신 아폴론의 사도", "메두사의 환영"], chance: 0.01, minLvl: 201, rarity: ItemRarity.EPIC, options: ["HP 100% 회복"], description: "신의 음료라고 불리는 신비한 액체.",imageUrl:"https://i.ibb.co/6R8RcTbB/Gemini-Generated-Image-34ynvv34ynvv34yn.png" },
    { item: "메두사의 머리카락", type: 'Etc', droppedBy: ["메두사의 환영", "심연의 고르곤"], chance: 0.05, minLvl: 121, rarity: ItemRarity.RARE, description: "꿈틀거리는 뱀의 형상을 한 머리카락.",imageUrl:"https://i.ibb.co/mF4FMMff/Gemini-Generated-Image-dpbxz2dpbxz2dpbx.png" },
    { item: "올리브 가지", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "평화와 풍요를 상징하는 신성한 나무의 가지." ,imageUrl:"https://i.ibb.co/39Hp04nq/Gemini-Generated-Image-9912pt9912pt9912.png"},
    { item: "고대 도자기 파편", type: 'Etc', chance: 0.1, minLvl: 10, rarity: ItemRarity.NORMAL, description: "신화 속 장면이 그려진 낡은 도자기 조각입니다.",imageUrl:"https://i.ibb.co/bMkcPCLw/Gemini-Generated-Image-fyczsqfyczsqfycz.png" },
    { item: "히드라의 독니", type: 'Etc', droppedBy: ["지중해의 거대 히드라", "수로의 군주 히드라"], chance: 0.03, minLvl: 100, rarity: ItemRarity.EPIC, description: "치명적인 맹독이 흐르는 히드라의 이빨.",imageUrl:"https://i.ibb.co/HTsLWzGj/Gemini-Generated-Image-q999skq999skq999.png" },
    { item: "제우스의 번개 화살", type: 'Weapon', weaponType: 'Thrown', droppedBy: ["제우스의 분노의 형상"], chance: 0.001, minLvl: 251, rarity: ItemRarity.LEGENDARY, stats: { int: 180, agi: 105 }, options: ["전격계 속성 부여", "마법 공격력 +10%"], description: "하늘을 가르는 파괴적인 번개입니다.",imageUrl:"https://i.ibb.co/V019z7WV/Gemini-Generated-Image-vnkd5yvnkd5yvnkd.png"},
    { item: "미노타우로스의 뿔", type: 'Etc', droppedBy: ["미노타우로스", "미노타우로스 로드"], chance: 0.05, minLvl: 90, rarity: ItemRarity.RARE, description: "거대 미노타우로스의 머리에서 꺾은 단단한 뿔입니다.",imageUrl:"https://i.ibb.co/xSWNrZzp/Gemini-Generated-Image-plh01mplh01mplh0.png" },
    { item: "켄타우로스의 강철 편자", type: 'Etc', droppedBy: ["켄타우로스 전사", "켄타우로스 궁수"], chance: 0.08, minLvl: 50, rarity: ItemRarity.MAGIC, description: "반인반마 전사들이 대지를 딛던 강철 편자입니다.",imageUrl:"https://i.ibb.co/3myfhzWW/Gemini-Generated-Image-3vhs013vhs013vhs.png" },
    { item: "하피의 깃털 펜던트", type: 'Accessory', droppedBy: ["하피 퀸", "해안가 하피"], chance: 0.05, minLvl: 70, rarity: ItemRarity.RARE, stats: { agi: 35 }, options: ["물리 방어력 +10%"], description: "하늘을 나는 하피의 정수가 담긴 가벼운 목걸이입니다.",imageUrl:"https://i.ibb.co/Xr46841q/Gemini-Generated-Image-a2t2ida2t2ida2t2.png" },
    { item: "페가수스의 황금 발굽", type: 'Etc', droppedBy: ["페가수스의 투영"], chance: 0.02, minLvl: 150, rarity: ItemRarity.EPIC, description: "하늘을 달리는 신수 페가수스가 남긴 황금빛 발굽입니다.",imageUrl:"https://i.ibb.co/ycwnQLrM/Gemini-Generated-Image-29ecby29ecby29ec.png" },
    { item: "트로이의 목마 조각", type: 'Etc', droppedBy: ["유적의 수호 골렘"], chance: 0.05, minLvl: 110, rarity: ItemRarity.RARE, description: "전설적인 전략의 산물이었던 거대 목마의 고목 파편입니다.",imageUrl:"https://i.ibb.co/SX4r66FK/Gemini-Generated-Image-qbnx7eqbnx7eqbnx.png" },
    { item: "술탄의 보석 반지", type: 'Accessory', droppedBy: ["오스만 술탄의 인장","판도라의 상자"], chance: 0.001, minLvl: 200, rarity: ItemRarity.LEGENDARY, stats: { int: 120, ctrl: 80 }, options: ["마법 공격력 +20%"], description: "오스만 제국의 권위와 부를 상징하는 거대한 보석 반지입니다.",imageUrl:"https://i.ibb.co/23yyxytx/Gemini-Generated-Image-p3sa21p3sa21p3sa.png"},
    { item: "터키쉬 딜라이트(로쿰)", type: 'Consumable', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, options: ["MP 60 회복"], description: "달콤한 향기와 쫄깃한 식감이 일품인 지중해의 전통 과자입니다." ,imageUrl:"https://i.ibb.co/GQk2PvDg/Gemini-Generated-Image-e6yzq0e6yzq0e6yz.png"},
    { item: "에게해의 대왕 진주", type: 'Etc', droppedBy: ["바다의 재앙 카리브디스", "지중해의 거대 히드라"], chance: 0.02, minLvl: 110, rarity: ItemRarity.UNIQUE, description: "심해 깊은 곳에서 수천 년을 견뎌온 거대한 푸른 진주입니다.",imageUrl:"https://i.ibb.co/vC7dgybZ/Gemini-Generated-Image-segcngsegcngsegc.png" },
    { item: "스핑크스의 모래시계", type: 'Accessory', droppedBy: ["스핑크스(유럽지부)"], chance: 0.04, minLvl: 100, rarity: ItemRarity.EPIC, stats: { wis: 70, ctrl: 50 }, options: ["AGI +10%"], description: "운명의 수수께끼를 내는 스핑크스의 시간이 담긴 모래시계입니다.",imageUrl:"https://i.ibb.co/wh5BCXdp/Gemini-Generated-Image-yn6rftyn6rftyn6r.png" },
    { item: "오스만 예도(Yatagan)", type: 'Weapon', weaponType: 'Sword', droppedBy: ["아나톨리아 피닉스"], chance: 0.01, minLvl: 150, rarity: ItemRarity.UNIQUE, stats: { str: 90, agi: 60 }, options: ["물리 공격력 +25%", "화염계 속성 부여"], description: "아나톨리아 전사들이 사용하던 휘어진 칼날의 예리한 도검입니다.",imageUrl:"https://i.ibb.co/vvJDz3F5/Gemini-Generated-Image-s0i3nns0i3nns0i3.png" }
];

export const EUROPE_MONSTER_LOOT: Record<string, EuropeLootEntry[]> = {
    "영국": WEST_EUROPE_LOOT,
    "스코틀랜드": WEST_EUROPE_LOOT,
    "아일랜드": WEST_EUROPE_LOOT,
    "네덜란드": WEST_EUROPE_LOOT,
    "독일":WEST_EUROPE_LOOT,
    "스위스": WEST_EUROPE_LOOT,
    "스페인": LATIN_EUROPE_LOOT,
    "프랑스": LATIN_EUROPE_LOOT,
    "포르투갈": LATIN_EUROPE_LOOT,
    "이탈리아": LATIN_EUROPE_LOOT,
    "벨기에": LATIN_EUROPE_LOOT,
    "핀란드": NORTH_EUROPE_LOOT,
    "스웨덴": NORTH_EUROPE_LOOT,
    "노르웨이": NORTH_EUROPE_LOOT,
    "덴마크": NORTH_EUROPE_LOOT,
    "폴란드": NORTH_EUROPE_LOOT,
    "러시아": EAST_EUROPE_LOOT,
    "우크라이나": EAST_EUROPE_LOOT,
    "헝가리": EAST_EUROPE_LOOT,
    "체코": EAST_EUROPE_LOOT,
    "루마니아": EAST_EUROPE_LOOT,
    "오스트리아": EAST_EUROPE_LOOT,
    "터키": MEDITERRANEAN_LOOT,
    "그리스": MEDITERRANEAN_LOOT
};