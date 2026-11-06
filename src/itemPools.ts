
import { ItemRarity, WeaponType } from './types';

// 등급별 수식어 (Prefix)
export const ITEM_PREFIXES: Record<ItemRarity, string[]> = {
    [ItemRarity.NORMAL]: ["낡은", "평범한", "무딘", "연습용", "조잡한", "흔한"],
    [ItemRarity.MAGIC]: ["강화된", "빛나는", "예리한", "연마된", "단단한", "우수한"],
    [ItemRarity.RARE]: ["고결한", "정교한", "찬란한", "명장의", "날카로운", "진귀한"],
    [ItemRarity.EPIC]: ["강력한", "파괴의", "고대의", "심연의", "웅장한", "불타는"],
    [ItemRarity.UNIQUE]: ["신성한", "불멸의", "절대적인", "궁극의", "해방된", "초월적인"],
    [ItemRarity.LEGENDARY]: ["전설의", "세계를 가르는", "태초의", "신화를 쓴", "영겁의"],
    [ItemRarity.MYTHTIC]: ["신의", "인과를 넘은", "창조주의", "허무를 벤", "운명의"],
};

// 재질/속성 접두사
export const ITEM_MATERIALS: Record<string, string[]> = {
    "Weapon": ["강철", "미스릴", "아다만티움", "흑철", "청동", "마력 깃든"],
    "Armor": ["가죽", "사슬", "판금", "미스릴", "은빛", "강철","아다만티움","청동"],
    "Accessory": ["금제", "은제", "비취", "보석", "수정", "루비", "사파이어"],
};

// 장비 옵션 템플릿 (수치는 생성 시 결정)
export const OPTION_TEMPLATES = {
    COMMON: [
        "STR +{v}", "INT +{v}", "DEF +{v}", "AGI +{v}", "WIS +{v}", "CTRL +{v}",
        "최대 HP +{v}", "최대 MP +{v}"
    ],
    OFFENSIVE: [
        "물리 공격력 +{v}%", "마법 공격력 +{v}%", "치명타 확률 +{v}%", "치명타 피해량 +{v}%",
        "물리 명중률 +{v}%", "마법 명중률 +{v}%", "{type} 속성 피해 +{v}%","STR +{v}%","AGI +{v}%","INT +{v}%","WIS +{v}%","CTRL +{v}%"
    ],
    DEFENSIVE: [
        "물리 방어력 +{v}%", "마법 방어력 +{v}%", "물리 회피율 +{v}%", "마법 회피율 +{v}%","DEF + {v}%","WIS +{v}%",
        "상태이상 저항 +{v}%"
    ],
    SPECIAL: [
        "{type} 속성 피해 +{v}%", "{type} 속성 저항 +{v}%", "최종 능력치 +{v}%",
        "모든 속성 저항 +{v}%", "모든 속성 피해 +{v}%","CTRL +{v}%",
        "골드 획득량 +{v}%", "경험치 획득량 +{v}%"
    ]
};

// 등급별 옵션 수치 범위 (%)
export const RARITY_VALUE_RANGE: Record<ItemRarity, { min: number, max: number }> = {
    [ItemRarity.NORMAL]: { min: 1, max: 5 },
    [ItemRarity.MAGIC]: { min: 5, max: 10 },
    [ItemRarity.RARE]: { min: 5, max: 15 },
    [ItemRarity.EPIC]: { min: 10, max: 20 },
    [ItemRarity.UNIQUE]: { min: 15, max: 25 },
    [ItemRarity.LEGENDARY]: { min: 20, max: 45 },
    [ItemRarity.MYTHTIC]: { min: 50, max: 100 },
};
