import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const SPEARMAN_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.SPEARMAN]: {
        learnedPassive: {
            name: '창술 연마',
            description: '[보유 효과] 물리 공격력 +1%, 명중률 +2%',
            statBonus: { pAtkRate: 0.01, accRate: 0.02 }
        },
        equippedPassive: {
            name: '사정거리 장악',
            description: '[장착 효과] 관통력 증가 및 물리 공격력 +6%, 명중률 +5%',
            statBonus: { pAtkRate: 0.06, accRate: 0.05 }
        },
        equippedActive: {
            name: '연환 찌르기',
            description: '눈에 보이지 않는 속도로 연속해서 적의 급소를 찌릅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 40,
            powerRatio: 145,
            tier: ClassTier.FIRST,
            icon: 'ArrowRight',
            shinryokuType: '무기강화계'
        }
    },
    // 2차
    [CombatStyle.LANCER]: {
        learnedPassive: {
            name: '돌파력',
            description: '[보유 효과] 힘(STR) +4, 물리 공격력 +1%, 명중률 +4%',
            statBonus: { str: 4, pAtkRate: 0.01, accRate: 0.04 }
        },
        equippedPassive: {
            name: '돌격 태세',
            description: '[장착 효과] 물리 공격력 +12%, 치명타 피해 +10%, 명중률 +8%',
            statBonus: { pAtkRate: 0.12, critDmg: 10, accRate: 0.08 }
        },
        equippedActive: {
            name: '나선 돌격창',
            description: '창 끝을 고속 회전시켜 적의 방어를 꿰뚫는 강력한 돌진 공격을 펼칩니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 250,
            tier: ClassTier.SECOND,
            icon: 'Zap',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.MAGIC_SPEARMAN]: {
        learnedPassive: {
            name: '마창의 불꽃',
            description: '[보유 효과] 마법 공격력 +1.5%, 지능(INT) +4, 물리/마법 명중률 +4%',
            statBonus: { mAtkRate: 0.015, int: 4, accRate: 0.04, mAccRate: 0.04 }
        },
        equippedPassive: {
            name: '원소 마창',
            description: '[장착 효과] 마법 공격력 +14%, 물리/마법 명중률 +8%',
            statBonus: { mAtkRate: 0.14, accRate: 0.08, mAccRate: 0.08 }
        },
        equippedActive: {
            name: '마염창 투척',
            description: '마력의 불꽃을 휘감은 투창을 던져 폭발시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 210,
            powerRatio: 130, // 2차 AoE (100~150)
            tier: ClassTier.SECOND,
            icon: 'Flame',
            shinryokuType: '화염계'
        }
    },
    // 3차
    [CombatStyle.DRAGON_KNIGHT]: {
        learnedPassive: {
            name: '용의 비늘',
            description: '[보유 효과] 물리/마법 방어력 +1.5%, 체력 +150, 명중률 +6%',
            statBonus: { pDefRate: 0.015, mDefRate: 0.015, maxHp: 150, accRate: 0.06 }
        },
        equippedPassive: {
            name: '용기사의 위압',
            description: '[장착 효과] 물리 공격력 +18%, 방어력 +12%, 명중률 +12%',
            statBonus: { pAtkRate: 0.18, pDefRate: 0.12, accRate: 0.12 }
        },
        equippedActive: {
            name: '드래곤 다이브 래피드',
            description: '높은 상공으로 도약한 뒤 용의 형상을 띤 창으로 급강하 일격을 가합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 850,
            tier: ClassTier.LAST,
            icon: 'Crosshair',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.CAVALRY_LEADER]: {
        learnedPassive: {
            name: '진형 돌파술',
            description: '[보유 효과] 물리 공격력 +2%, 민첩 +6, 명중률 +6%',
            statBonus: { pAtkRate: 0.02, agi: 6, accRate: 0.06 }
        },
        equippedPassive: {
            name: '파죽지세',
            description: '[장착 효과] 물리 공격력 +18%, 민첩 +15%, 명중률 +12%',
            statBonus: { pAtkRate: 0.18, agiRate: 0.15, accRate: 0.12 }
        },
        equippedActive: {
            name: '기마 궤멸 돌격',
            description: '초고속 돌진으로 적의 전열을 들이받아 분쇄합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 800,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '신체강화계'
        }
    },
    [CombatStyle.MAGIC_LANCER]: {
        learnedPassive: {
            name: '마창 공명',
            description: '[보유 효과] 마법/물리 공격력 +1.5%, 지능 +6, 물리/마법 명중률 +6%',
            statBonus: { mAtkRate: 0.015, pAtkRate: 0.015, int: 6, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '마력 창격 증폭',
            description: '[장착 효과] 마법 공격력 +20%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.2, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '초고밀도 마력창',
            description: '응축된 마력을 창에 깃들여 일직선으로 쏘아보냅니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Sparkles',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.ELEMENTAL_LANCER]: {
        learnedPassive: {
            name: '원소의 창기',
            description: '[보유 효과] 마법 공격력 +2%, 신력 속성 공격력 +2%, 물리/마법 명중률 +6%',
            statBonus: { mAtkRate: 0.02, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '원소 폭풍창',
            description: '[장착 효과] 마법 공격력 +18%, 신력 속성 공격력 +15%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.18, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '원소 폭풍 투창',
            description: '다양한 원소가 소용돌이치는 창을 지면에 투척해 광역 폭발을 일으킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 420, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.HOLY_KNIGHT]: {
        learnedPassive: {
            name: '신성의 가호',
            description: '[보유 효과] 방어력 +2%, 체력 +150, 명중률 +6%',
            statBonus: { pDefRate: 0.02, maxHp: 150, accRate: 0.06 }
        },
        equippedPassive: {
            name: '성광의 가시',
            description: '[장착 효과] 물리 공격력 +16%, 물리 방어력 +15%, 광휘계 속성 피해 +15%',
            statBonus: { pAtkRate: 0.16, pDefRate: 0.15, accRate: 0.12 }
        },
        equippedActive: {
            name: '성광 관통격',
            description: '신성한 빛이 흐르는 창으로 적을 꿰뚫어 치명적인 타격을 줍니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 650,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Shield',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.DARK_KNIGHT]: {
        learnedPassive: {
            name: '심연의 마력',
            description: '[보유 효과] 마법/물리 공격력 +2%, 지능 +5, 명중률 +6%',
            statBonus: { mAtkRate: 0.02, pAtkRate: 0.02, int: 5, accRate: 0.06 }
        },
        equippedPassive: {
            name: '암흑 마창술',
            description: '[장착 효과] 마법/물리 공격력 +18%, 암흑계 속성 피해 +15%',
            statBonus: { mAtkRate: 0.18, pAtkRate: 0.18, accRate: 0.12 }
        },
        equippedActive: {
            name: '심연의 마창 찌르기',
            description: '심연의 칠흑 마력을 응축시킨 창으로 적의 생명력을 흡수하는 파괴적인 일격을 가합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 660,
            powerRatio: 830,
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '월광계'
        }
    },
    // 4차
    [CombatStyle.SKY_DRAGON_KNIGHT]: {
        learnedPassive: {
            name: '천룡의 혈통',
            description: '[보유 효과] 물리 공격력 +3%, 민첩 +8, 체력 +250, 명중률 +10%',
            statBonus: { pAtkRate: 0.03, agi: 8, maxHp: 250, accRate: 0.10 }
        },
        equippedPassive: {
            name: '천공의 패자',
            description: '[장착 효과] 물리 공격력 +38%, 치명타 확률 +10%, 회피율 +8%, 명중률 +20%',
            statBonus: { pAtkRate: 0.38, critRate: 0.1, evaRate: 0.08, accRate: 0.20 }
        },
        equippedActive: {
            name: '천룡강림 극천창',
            description: '천룡의 뇌우를 부르며 전장을 관통하는 신화적 창격을 작렬합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.ASSAULT_COMMANDER]: {
        learnedPassive: {
            name: '선봉장의 카리스마',
            description: '[보유 효과] 물리 공격력 +3%, 힘 +12, 민첩 +8, 명중률 +10%',
            statBonus: { pAtkRate: 0.03, str: 12, agi: 8, accRate: 0.10 }
        },
        equippedPassive: {
            name: '총돌격 지휘',
            description: '[장착 효과] 물리 공격력 +40%, 치명타 피해 +35%, 명중률 +20%',
            statBonus: { pAtkRate: 0.4, critDmg: 35, accRate: 0.20 }
        },
        equippedActive: {
            name: '결전 진형 섬멸격',
            description: '모든 부대의 돌격력을 한 점에 집중하여 적진 전체를 산산조각 냅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2300,
            powerRatio: 2350,
            tier: ClassTier.FINAL,
            icon: 'Crosshair',
            shinryokuType: '신체강화계'
        }
    },
    [CombatStyle.DIVINE_KNIGHT]: {
        learnedPassive: {
            name: '신성한 불멸의 의지',
            description: '[보유 효과] 물리 공격력 +3.5%, 방어력 +3.5%, 체력 +300, 명중률 +10%',
            statBonus: { pAtkRate: 0.035, pDefRate: 0.035, maxHp: 300, accRate: 0.10 }
        },
        equippedPassive: {
            name: '디바인 오라',
            description: '[장착 효과] 물리 공격력 +42%, 물리 방어력 +25%, 광휘계 속성 피해 +30%, 명중률 +20%',
            statBonus: { pAtkRate: 0.42, pDefRate: 0.25, accRate: 0.20 }
        },
        equippedActive: {
            name: '천벌 디바인 심판창',
            description: '하늘에서 쏟아지는 신성한 빛의 창으로 전장의 모든 사악한 적을 궤멸시킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.MAGIC_SPEAR_KING]: {
        learnedPassive: {
            name: '마창의 지배자',
            description: '[보유 효과] 마법/물리 공격력 +3%, 지능 +15, 물리/마법 명중률 +10%',
            statBonus: { mAtkRate: 0.03, pAtkRate: 0.03, int: 15, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '만창귀환',
            description: '[장착 효과] 마법 공격력 +45%, 신력 속성 공격력 +25%, 물리/마법 명중률 +20%',
            statBonus: { mAtkRate: 0.45, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '진 무한 마창 섬멸진',
            description: '수천 개의 마력 창을 허공에 소환해 전방의 모든 적을 꿰뚫습니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '월광계'
        }
    },
    [CombatStyle.ABYSS_KNIGHT]: {
        learnedPassive: {
            name: '심연의 군주',
            description: '[보유 효과] 마법/물리 공격력 +3.5%, 지능 +12, 힘 +12, 명중률 +10%',
            statBonus: { mAtkRate: 0.035, pAtkRate: 0.035, int: 12, str: 12, accRate: 0.10 }
        },
        equippedPassive: {
            name: '칠흑의 아바타',
            description: '[장착 효과] 마법/물리 공격력 +44%, 암흑계 속성 피해 +35%, 명중률 +20%',
            statBonus: { mAtkRate: 0.44, pAtkRate: 0.44, accRate: 0.20 }
        },
        equippedActive: {
            name: '어비스 종말 섬멸창',
            description: '끝없는 심연의 마력을 개방하여 적을 소멸시키는 암흑 창격을 작렬합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2500,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.SPEAR_SAGE]: {
        learnedPassive: {
            name: '원소 창리의 해탈',
            description: '[보유 효과] 마법 공격력 +3.5%, 지능 +12, 지혜 +12, 물리/마법 명중률 +10%',
            statBonus: { mAtkRate: 0.035, int: 12, wis: 12, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '삼라만상 창기',
            description: '[장착 효과] 마법 공격력 +40%, 물리/마법 명중률 +20%',
            statBonus: { mAtkRate: 0.4, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '창의 극의 삼라원소 폭풍',
            description: '하늘과 대지의 모든 원소를 창끝에 휘감아 광역 천벌을 내립니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2150, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Sparkles',
            shinryokuType: '질풍계'
        }
    }
};
