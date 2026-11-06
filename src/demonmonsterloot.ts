import { ItemRarity, Stats, WeaponType } from './types';

export interface DemonLootEntry {
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

export const DEMON_MONSTER_LOOT: Record<string, DemonLootEntry[]> = {
    "네크로디움 제국": [
        // --- 기존 아이템 (훼손 금지) ---
        { item: "그림자 파편", type: 'Etc', droppedBy: ["그림자 쥐", "그림자 추적자"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "응축된 어둠의 조각입니다.",imageUrl:"https://i.ibb.co/N6yKnn8z/Gemini-Generated-Image-ue82bcue82bcue82.png" },
        { item: "제국 의회 인장", type: 'Etc', droppedBy: ["네크로디움 초병", "제국 군단장"], chance: 0.05, minLvl: 11, rarity: ItemRarity.MAGIC, description: "네크로디움 제국의 공식 인장입니다. 권위가 느껴집니다.",imageUrl:"https://i.ibb.co/spN9Z9H7/Gemini-Generated-Image-esqngvesqngvesqn.png" },
        { item: "계약의 양피지", type: 'Etc', droppedBy: ["영혼 계약자", "제국 흑마법사"], chance: 0.03, minLvl: 31, rarity: ItemRarity.RARE, description: "마인들과의 거래에 사용되는 신비로운 종이입니다.",imageUrl:"https://i.ibb.co/chPY92sr/Gemini-Generated-Image-n9jexen9jexen9je.png" },
        { item: "마인 귀족의 안광", type: 'Accessory', droppedBy: ["고위 마인 귀족", "마인 대공의 환영"], chance: 0.02, minLvl: 101, rarity: ItemRarity.EPIC, stats: { int: 45, ctrl: 30 }, options: ["마법 공격력 +15%", "암흑계 속성 부여"], description: "고위 마인의 눈에서 추출한 강력한 마력석.",imageUrl:"https://i.ibb.co/xKs3jkw4/Gemini-Generated-Image-467biy467biy467b.png" },
        { item: "네크로디움 흑철 검", type: 'Weapon', weaponType: 'Sword', chance: 0.02, minLvl: 50, rarity: ItemRarity.RARE, stats: { str: 40, int: 20 }, options: ["물리 공격력 +10%", "암흑계 속성 부여"], description: "제국에서 제련된 검은 철로 만든 검.",imageUrl:"https://i.ibb.co/qLBByrfq/Gemini-Generated-Image-1t91bm1t91bm1t91.png" },
        { item: "심연의 제국 갑주", type: 'Body', droppedBy: ["네크로디움 중갑 기사", "제국 군단장"], chance: 0.01, minLvl: 151, rarity: ItemRarity.UNIQUE, stats: { def: 120, wis: 40 }, options: ["마법 방어력 +20%", "상태이상 저항 +15%"], description: "제국 정예 기사들이 착용하는 견고한 갑옷.",imageUrl:"https://i.ibb.co/xtz62MxZ/Gemini-Generated-Image-4ucll54ucll54ucl.png" },
        { item: "제국 금화", type: 'Etc', chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "마인 제국에서 통용되는 묵직한 금화입니다.",imageUrl:"https://i.ibb.co/3m1Y2skt/Gemini-Generated-Image-ufcgliufcgliufcg.png" },
        { item: "마력의 정수", type: "Etc", chance: 0.01, minLvl:100, rarity: ItemRarity.UNIQUE, description: "강력한 마력의 정수이다.", imageUrl: "https://i.ibb.co/jkV1CtJy/Kakao-Talk-20260105-221438797-03.png"},
        { item: "어둠의 비기 서적", type: 'Etc', droppedBy: ["제국 흑마법사", "리치 로드"], chance: 0.01, minLvl: 121, rarity: ItemRarity.UNIQUE, description: "제국 외부로 유출이 금지된 어둠의 마법 서적입니다.",imageUrl:"https://i.ibb.co/3ypqCkTS/Gemini-Generated-Image-nabmagnabmagnabm.png" },

        // --- 신규 추가 아이템 ---
        
        // 하급 재료 및 소모품
        { item: "마인의 뾰족한 귀", type: 'Etc', droppedBy: ["제국 하급 부역자", "하급 마인 병사"], chance: 0.1, minLvl: 1, rarity: ItemRarity.NORMAL, description: "마인족 특유의 길고 뾰족한 귀입니다. 약재로 쓰이기도 합니다.",imageUrl:"https://i.ibb.co/wZkSr596/Gemini-Generated-Image-iks2cjiks2cjiks2.png"},
        { item: "부패한 마력 가루", type: 'Etc', droppedBy: ["어둠의 찌꺼기 슬라임"], chance: 0.1, minLvl: 5, rarity: ItemRarity.NORMAL, description: "마력이 오염되어 검게 변한 가루입니다.",imageUrl:"https://i.ibb.co/DHJZ4TvB/Gemini-Generated-Image-1fo35v1fo35v1fo3.png"},
        { item: "마인의 자색 포션", type: 'Consumable', chance: 0.05, minLvl: 10, rarity: ItemRarity.MAGIC, options: ["MP 200 회복", "일시적 INT +3% (5턴)"], description: "마인들이 즐겨 마시는 자극적인 마나 회복제입니다.", imageUrl: "https://i.ibb.co/RkcDV4Cd/Gemini-Generated-Image-6yihv76yihv76yih.png" },
        { item: "영혼의 파편", type: 'Etc', droppedBy: ["영혼 계약자", "고대 마인의 원혼"], chance: 0.02, minLvl: 40, rarity: ItemRarity.RARE, description: "부서진 영혼의 조각. 차가운 한기가 서려 있습니다.",imageUrl:"https://i.ibb.co/vvQ1NXvq/Gemini-Generated-Image-wdg6utwdg6utwdg6.png" },

        // 중급 장비 및 장신구
        { item: "네크로디움 흑철 방패", type: 'SubWeapon', weaponType: 'Shield', droppedBy: ["네크로디움 초병"], chance: 0.05, minLvl: 30, rarity: ItemRarity.MAGIC, stats: { def: 25 }, options: ["물리 방어력 +5%", "암흑계 저항 +10%"], description: "제국의 철광석으로 만든 보급형 방패입니다.",imageUrl:"https://i.ibb.co/VpDksp6j/Gemini-Generated-Image-t1owa8t1owa8t1ow.png" },
        { item: "심연의 추적자 장화", type: 'Feet', droppedBy: ["그림자 추적자", "그림자 밀수꾼"], chance: 0.04, minLvl: 60, rarity: ItemRarity.RARE, stats: { agi: 35, def: 10 }, options: ["회피율 +5%", "이동 속도 증가"], description: "어둠 속에서 소리 없이 움직이게 돕는 장화입니다.",imageUrl:"https://i.ibb.co/MrwvB0z/Gemini-Generated-Image-5h4m995h4m995h4m.png" },
        { item: "망자의 한 서린 목걸이", type: 'Accessory', droppedBy: ["고대 마인의 원혼"], chance: 0.03, minLvl: 80, rarity: ItemRarity.RARE, stats: { wis: 40, ctrl: 20 }, options: ["상태이상 저항 +15%", "마법 방어력 +10%"], description: "죽은 자들의 속삭임이 들리는 듯한 목걸이입니다.",imageUrl:"https://i.ibb.co/v6BWZYz9/Gemini-Generated-Image-oftct9oftct9oftc.png" },

        // 상급 및 레전더리 장비
        { 
            item: "영혼 약탈자의 낫", 
            type: 'Weapon', 
            weaponType: 'Spear', 
            droppedBy: ["어둠의 처형자", "심연의 아수라"], 
            chance: 0.01, 
            minLvl: 150, 
            rarity: ItemRarity.EPIC, 
            stats: { str: 95, int: 60 }, 
            options: ["HP +20%", "상태이상 부여 [출혈]", "암흑계 속성 부여"], 
            description: "희생자의 영혼을 직접 수확하기 위해 고안된 거대한 낫입니다.",
            imageUrl:"https://i.ibb.co/DP8Dq3Np/Gemini-Generated-Image-jo8knqjo8knqjo8k.png" 
        },
        { 
            item: "제국 사령관의 붉은 망토", 
            type: 'Body', 
            droppedBy: ["제국 군단장", "마인 대공의 환영"], 
            chance: 0.01, 
            minLvl: 150, 
            rarity: ItemRarity.UNIQUE, 
            stats: { def: 100, wis: 50, ctrl: 50 }, 
            options: ["물리 방어력 +25%", "최종 능력치 +5%"], 
            description: "제국의 고위 장성만이 착용할 수 있는 핏빛 망토입니다.",
            imageUrl:"https://i.ibb.co/67s3nfjB/Gemini-Generated-Image-vv1c79vv1c79vv1c.png"
        },
        { 
            item: "검은 태양의 펜던트", 
            type: 'Accessory', 
            droppedBy: ["심연의 군주 베리알의 환영", "제국의 시조 마인"], 
            chance: 0.001, 
            minLvl: 200, 
            rarity: ItemRarity.LEGENDARY, 
            stats: { int: 150, ctrl: 100, wis: 80 }, 
            options: ["마법 공격력 +30%", "물리 공격력 +25%", "상태이상 저항 +20%"], 
            description: "마계의 검은 태양 에너지를 봉인한 전설적인 장신구입니다.",
            imageUrl: "https://i.ibb.co/QFc1BXnz/Gemini-Generated-Image-h22p48h22p48h22p.png"
        },
        { 
            item: "명계의 지배자 반지", 
            type: 'Accessory', 
            droppedBy: ["제국의 시조 마인", "태초의 어둠의 잔영"], 
            chance: 0.003, 
            minLvl: 200, 
            rarity: ItemRarity.LEGENDARY, 
            stats: { str: 100, int: 100, wis: 100, ctrl: 150 }, 
            options: ["최종 능력치 +15%", "상태이상 저항 +20%"], 
            description: "죽음의 영역을 다스리는 자의 권위가 서린 반지입니다.",
            imageUrl:"https://i.ibb.co/Y7BH2yRY/Gemini-Generated-Image-hz1iu1hz1iu1hz1i.png" 
        },

        // 기타 특수 아이템
        { item: "심연의 흑철괴", type: 'Etc', droppedBy: ["네크로디움 중갑 기사"], chance: 0.01, minLvl: 120, rarity: ItemRarity.UNIQUE, description: "제국에서 가장 단단한 금속인 흑철을 정제한 덩어리입니다.",imageUrl:"https://i.ibb.co/Z1fyrsLF/Gemini-Generated-Image-vevaa2vevaa2veva.png" }
    ]
};
