import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const ARCHER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.ARCHER]: {
        learnedPassive: {
            name: '매의 눈',
            description: '[보유 효과] 명중률 +4%, 민첩(AGI) +3',
            statBonus: { accRate: 0.04, agi: 3 }
        },
        equippedPassive: {
            name: '원거리 저격술',
            description: '[장착 효과] 물리 공격력 +6%, 치명타 확률 +4%, 명중률 +8%',
            statBonus: { pAtkRate: 0.06, critRate: 0.04, accRate: 0.08 }
        },
        equippedActive: {
            name: '파워 샷',
            description: '활시위를 힘껏 당겨 적의 숨통을 노리는 화살을 발사합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 40,
            powerRatio: 145,
            tier: ClassTier.FIRST,
            icon: 'Target',
            shinryokuType: '무기강화계'
        }
    },
    // 2차
    [CombatStyle.BOWMAN]: {
        learnedPassive: {
            name: '곡사의 달인',
            description: '[보유 효과] 민첩(AGI) +5, 치명타 피해 +2%, 명중률 +6%',
            statBonus: { agi: 5, critDmg: 2, accRate: 0.06 }
        },
        equippedPassive: {
            name: '연속 사격술',
            description: '[장착 효과] 물리 공격력 +12%, 민첩 +6%, 명중률 +12%',
            statBonus: { pAtkRate: 0.12, agiRate: 0.06, accRate: 0.12 }
        },
        equippedActive: {
            name: '삼연발 저격',
            description: '동시에 3발의 화살을 시위에 메겨 적의 주요 혈을 꿰뚫습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 230,
            tier: ClassTier.SECOND,
            icon: 'Crosshair',
            shinryokuType: '무기강화계'
        }
    },
    [CombatStyle.CROSSBOWMAN]: {
        learnedPassive: {
            name: '직사 관통력',
            description: '[보유 효과] 물리 공격력 +1.5%, 치명타 피해 +3%, 명중률 +6%',
            statBonus: { pAtkRate: 0.015, critDmg: 3, accRate: 0.06 }
        },
        equippedPassive: {
            name: '강철 볼트 장전',
            description: '[장착 효과] 물리 공격력 +14%, 명중률 +12%',
            statBonus: { pAtkRate: 0.14, accRate: 0.12 }
        },
        equippedActive: {
            name: '헤비 볼트 관통사격',
            description: '묵직한 석궁 화살을 직사로 발사하여 갑주를 뚫어버립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 200,
            powerRatio: 260,
            tier: ClassTier.SECOND,
            icon: 'Target',
            shinryokuType: '강철계'
        }
    },
    // 3차
    [CombatStyle.MASTER_ARCHER]: {
        learnedPassive: {
            name: '명궁의 직관',
            description: '[보유 효과] 명중률 +8%, 민첩 +6',
            statBonus: { accRate: 0.08, agi: 6 }
        },
        equippedPassive: {
            name: '백보천양',
            description: '[장착 효과] 물리 공격력 +20%, 치명타 확률 +8%, 명중률 +16%',
            statBonus: { pAtkRate: 0.2, critRate: 0.08, accRate: 0.16 }
        },
        equippedActive: {
            name: '필중 흑요석 화살',
            description: '적의 심장을 정확히 노려 일격에 사살하는 명궁의 저격입니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 850,
            tier: ClassTier.LAST,
            icon: 'Crosshair',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.WIND_ARCHER]: {
        learnedPassive: {
            name: '바람의 날갯짓',
            description: '[보유 효과] 민첩 +8, 회피율 +1.5%, 명중률 +8%',
            statBonus: { agi: 8, evaRate: 0.015, accRate: 0.08 }
        },
        equippedPassive: {
            name: '돌풍의 화살비',
            description: '[장착 효과] 민첩 +20%, 명중률 +16%',
            statBonus: { agiRate: 0.2, accRate: 0.16 }
        },
        equippedActive: {
            name: '폭풍 화살 소나기',
            description: '바람과 함께 수백 발의 화살을 하늘로 쏘아 올려 광역으로 쏟아붓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 400, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Wind',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.SNIPER]: {
        learnedPassive: {
            name: '숨죽인 호흡',
            description: '[보유 효과] 치명타 확률 +2%, 치명타 피해 +6%, 명중률 +10%',
            statBonus: { critRate: 0.02, critDmg: 6, accRate: 0.10 }
        },
        equippedPassive: {
            name: '절대 저격 조준',
            description: '[장착 효과] 물리 공격력 +22%, 치명타 피해 +30%, 명중률 +20%',
            statBonus: { pAtkRate: 0.22, critDmg: 30, accRate: 0.20 }
        },
        equippedActive: {
            name: '심장 관통 저격',
            description: '모든 기척을 지우고 쏘아 보낸 볼트로 적의 급소를 꿰뚫습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 950,
            tier: ClassTier.LAST,
            icon: 'Crosshair',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.HUNTER]: {
        learnedPassive: {
            name: '사냥꾼의 지혜',
            description: '[보유 효과] 물리 공격력 +1.5%, 명중률 +8%',
            statBonus: { pAtkRate: 0.015, accRate: 0.08 }
        },
        equippedPassive: {
            name: '포식자의 덫',
            description: '[장착 효과] 물리 공격력 +18%, 치명타 확률 +8%, 명중률 +16%',
            statBonus: { pAtkRate: 0.18, critRate: 0.08, accRate: 0.16 }
        },
        equippedActive: {
            name: '특수 맹독 볼트 난사',
            description: '맹독과 폭발물이 깃든 석궁 볼트로 적을 무력화시킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 780,
            tier: ClassTier.LAST,
            icon: 'Target',
            shinryokuType: '초화계'
        }
    },
    // 4차
    [CombatStyle.DIVINE_ARCHER]: {
        learnedPassive: {
            name: '신궁의 통찰',
            description: '[보유 효과] 명중률 +12%, 치명타 확률 +2%, 민첩 +12',
            statBonus: { accRate: 0.12, critRate: 0.02, agi: 12 }
        },
        equippedPassive: {
            name: '빛의 유성우',
            description: '[장착 효과] 물리 공격력 +42%, 치명타 확률 +15%, 치명타 피해 +35%, 명중률 +25%',
            statBonus: { pAtkRate: 0.42, critRate: 0.15, critDmg: 35, accRate: 0.25 }
        },
        equippedActive: {
            name: '신벌 아스트랄 애로우',
            description: '밤하늘의 은하수를 끌어모아 만든 무수한 빛의 화살로 적을 섬멸합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2250,
            powerRatio: 2400,
            tier: ClassTier.FINAL,
            icon: 'Sparkles',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.SKY_BOW_MASTER]: {
        learnedPassive: {
            name: '천궁의 신풍',
            description: '[보유 효과] 민첩 +15, 신력 속성 공격력 +3%, 명중률 +12%',
            statBonus: { agi: 15, accRate: 0.12 }
        },
        equippedPassive: {
            name: '천상 폭풍 궁술',
            description: '[장착 효과] 민첩 +35%, 신력 속성 공격력 +30%, 명중률 +25%',
            statBonus: { agiRate: 0.35, accRate: 0.25 }
        },
        equippedActive: {
            name: '천공 멸겁 폭풍시',
            description: '하늘 전체를 뒤덮는 거대한 폭풍의 화살비를 소환해 전장을 초토화합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2450,
            powerRatio: 2150, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.SNIPER_KING]: {
        learnedPassive: {
            name: '저격왕의 시야',
            description: '[보유 효과] 치명타 확률 +3%, 치명타 피해 +12%, 명중률 +15%',
            statBonus: { critRate: 0.03, critDmg: 12, accRate: 0.15 }
        },
        equippedPassive: {
            name: '절대 필살탄환',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 피해 +60%, 명중률 +30%',
            statBonus: { pAtkRate: 0.45, critDmg: 60, accRate: 0.30 }
        },
        equippedActive: {
            name: '절망의 흑성 필살 저격',
            description: '수 킬로미터 밖에서 차원을 가르고 날아오는 단 한 발의 죽음의 화살을 날립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crosshair',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.GOD_OF_HUNT]: {
        learnedPassive: {
            name: '절대 사냥꾼의 본능',
            description: '[보유 효과] 물리 공격력 +3.5%, 민첩 +14, 명중률 +12%',
            statBonus: { pAtkRate: 0.035, agi: 14, accRate: 0.12 }
        },
        equippedPassive: {
            name: '모든 생명의 사냥',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 확률 +20%, 명중률 +25%',
            statBonus: { pAtkRate: 0.45, critRate: 0.2, accRate: 0.25 }
        },
        equippedActive: {
            name: '포식신 아포칼립스 헌트',
            description: '전장의 모든 적을 사냥감으로 선포하고 무자비한 섬멸 화살을 꽂아 넣습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '신체강화계'
        }
    }
};
