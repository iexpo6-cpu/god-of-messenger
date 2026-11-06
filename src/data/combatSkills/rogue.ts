import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const ROGUE_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.ROGUE]: {
        learnedPassive: {
            name: '은밀한 발걸음',
            description: '[보유 효과] 회피율 +10%, 민첩(AGI) +6, 명중률 +4%',
            statBonus: { evaRate: 0.10, agi: 6, accRate: 0.04 }
        },
        equippedPassive: {
            name: '기습의 기회',
            description: '[장착 효과] 회피율 +10%, 치명타 확률 +5%, 치명타 피해 +10%, 명중률 +5%',
            statBonus: { evaRate: 0.10, critRate: 0.05, critDmg: 10, accRate: 0.05 }
        },
        equippedActive: {
            name: '급소 기습',
            description: '그림자 속에서 불시에 튀어나와 적의 약점을 찌릅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 40,
            powerRatio: 150,
            tier: ClassTier.FIRST,
            icon: 'EyeOff',
            shinryokuType: '암흑계'
        }
    },
    // 2차
    [CombatStyle.ASSASSIN]: {
        learnedPassive: {
            name: '살기의 제어',
            description: '[보유 효과] 회피율 +12%, 치명타 확률 +1.5%, 민첩(AGI) +8, 명중률 +4%',
            statBonus: { evaRate: 0.12, critRate: 0.015, agi: 8, accRate: 0.04 }
        },
        equippedPassive: {
            name: '맹독과 암습',
            description: '[장착 효과] 회피율 +15%, 치명타 확률 +10%, 치명타 피해 +20%, 명중률 +8%',
            statBonus: { evaRate: 0.15, critRate: 0.1, critDmg: 20, accRate: 0.08 }
        },
        equippedActive: {
            name: '절명 섀도우 스트라이크',
            description: '적의 시야에서 사라진 뒤 뒤통수에서 치명적인 절명격을 내리꽂습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 210,
            powerRatio: 260,
            tier: ClassTier.SECOND,
            icon: 'Skull',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.NINJA]: {
        learnedPassive: {
            name: '인술과 비도',
            description: '[보유 효과] 회피율 +12%, 민첩 +8, 암흑계 속성 피해 +2%, 명중률 +4%',
            statBonus: { evaRate: 0.12, agi: 8, accRate: 0.04 }
        },
        equippedPassive: {
            name: '환영 수리검술',
            description: '[장착 효과] 회피율 +18%, 민첩 +12%, 치명타 확률 +6%, 명중률 +8%',
            statBonus: { evaRate: 0.18, agiRate: 0.12, critRate: 0.06, accRate: 0.08 }
        },
        equippedActive: {
            name: '수리검 선풍난무',
            description: '사방으로 무수한 수리검을 던져 넓은 범위의 적을 공격합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 190,
            powerRatio: 130, // 2차 AoE (100~150)
            tier: ClassTier.SECOND,
            icon: 'Crosshair',
            shinryokuType: '질풍계'
        }
    },
    // 3차
    [CombatStyle.SHADOW_BLADE]: {
        learnedPassive: {
            name: '그림자 검기',
            description: '[보유 효과] 회피율 +15%, 치명타 확률 +2%, 암흑 속성 공격력 +2%, 명중률 +6%',
            statBonus: { evaRate: 0.15, critRate: 0.02, accRate: 0.06 }
        },
        equippedPassive: {
            name: '그림자 융합참',
            description: '[장착 효과] 회피율 +20%, 물리 공격력 +20%, 치명타 피해 +25%, 명중률 +12%',
            statBonus: { evaRate: 0.20, pAtkRate: 0.2, critDmg: 25, accRate: 0.12 }
        },
        equippedActive: {
            name: '암영 섬격난무',
            description: '그림자 속에서 나타나 연속으로 적의 급소를 베어냅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Sword',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.TRUE_ASSASSIN]: {
        learnedPassive: {
            name: '암살자의 혈청',
            description: '[보유 효과] 회피율 +15%, 치명타 확률 +2.5%, 치명타 피해 +8%, 명중률 +6%',
            statBonus: { evaRate: 0.15, critRate: 0.025, critDmg: 8, accRate: 0.06 }
        },
        equippedPassive: {
            name: '극독 암살술',
            description: '[장착 효과] 회피율 +20%, 물리 공격력 +22%, 치명타 확률 +12%, 명중률 +12%',
            statBonus: { evaRate: 0.20, pAtkRate: 0.22, critRate: 0.12, accRate: 0.12 }
        },
        equippedActive: {
            name: '심장 적출 단검술',
            description: '급소만을 노려 적의 숨통을 단번에 끊어놓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 900,
            tier: ClassTier.LAST,
            icon: 'Skull',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.SHURIKEN_MASTER]: {
        learnedPassive: {
            name: '비도 투척의 달인',
            description: '[보유 효과] 회피율 +15%, 민첩 +10, 명중률 +6%',
            statBonus: { evaRate: 0.15, agi: 10, accRate: 0.06 }
        },
        equippedPassive: {
            name: '만화경 수리검',
            description: '[장착 효과] 회피율 +25%, 민첩 +20%, 명중률 +12%',
            statBonus: { evaRate: 0.25, agiRate: 0.2, accRate: 0.12 }
        },
        equippedActive: {
            name: '천화난무 수리검 폭풍',
            description: '하늘을 뒤덮는 수리검을 투척해 모든 적을 벌집으로 만듭니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 630,
            powerRatio: 420, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Crosshair',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.BOMB_NINJA]: {
        learnedPassive: {
            name: '화약 제조술',
            description: '[보유 효과] 회피율 +15%, 물리/마법 공격력 +1.5%, 화염 속성 피해 +2%, 물리/마법 명중률 +6%',
            statBonus: { evaRate: 0.15, pAtkRate: 0.015, mAtkRate: 0.015, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '폭약 연쇄 반응',
            description: '[장착 효과] 회피율 +20%, 물리 공격력 +20%, 화염 속성 피해 +15%, 물리/마법 명중률 +12%',
            statBonus: { evaRate: 0.20, pAtkRate: 0.2, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '폭렬 분진 폭탄진',
            description: '사방에 특수 폭탄을 투척해 연쇄적인 광역 대폭발을 일으킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 450, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Bomb',
            shinryokuType: '화염계'
        }
    },
    // 4차
    [CombatStyle.DEATH_REAPER]: {
        learnedPassive: {
            name: '사신의 낙인',
            description: '[보유 효과] 회피율 +20%, 치명타 피해 +12%, 민첩 +20, 명중률 +12%',
            statBonus: { evaRate: 0.20, critDmg: 12, agi: 20, accRate: 0.12 }
        },
        equippedPassive: {
            name: '사신의 낫질',
            description: '[장착 효과] 회피율 +30%, 물리 공격력 +35%, 치명타 확률 +20%, 치명타 피해 +50%, 명중률 +20%',
            statBonus: { evaRate: 0.30, pAtkRate: 0.35, critRate: 0.2, critDmg: 50, accRate: 0.20 }
        },
        equippedActive: {
            name: '명부 영혼 수확령',
            description: '저승의 문을 열어 적의 영혼을 강제로 수확하는 사신의 절대참격을 내립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Ghost',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.SHADOW_LORD]: {
        learnedPassive: {
            name: '군주의 그림자',
            description: '[보유 효과] 회피율 +20%, 치명타 확률 +5%, 암흑 속성 공격력 +3%, 명중률 +12%',
            statBonus: { evaRate: 0.20, critRate: 0.05, accRate: 0.12 }
        },
        equippedPassive: {
            name: '암흑 군세 소환',
            description: '[장착 효과] 회피율 +30%, 물리 공격력 +45%, 암흑 속성 피해 +30%, 명중률 +20%',
            statBonus: { evaRate: 0.30, pAtkRate: 0.45, accRate: 0.20 }
        },
        equippedActive: {
            name: '심연의 그림자 군단격',
            description: '그림자 속에서 수천 의 칼날을 솟구치게 하여 적을 난도질합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.SHURIKEN_KING]: {
        learnedPassive: {
            name: '수리검왕의 위엄',
            description: '[보유 효과] 회피율 +20%, 민첩 +20, 명중률 +12%',
            statBonus: { evaRate: 0.20, agi: 20, accRate: 0.12 }
        },
        equippedPassive: {
            name: '무한 비도 폭풍',
            description: '[장착 효과] 회피율 +35%, 민첩 +40%, 명중률 +20%',
            statBonus: { evaRate: 0.35, agiRate: 0.4, accRate: 0.20 }
        },
        equippedActive: {
            name: '천멸 환영 비도 폭풍',
            description: '전장을 뒤덮는 수억 개의 비도로 모든 적을 순식간에 소멸시킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2450,
            powerRatio: 2200, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.EXPLOSIVE_DESTROYER]: {
        learnedPassive: {
            name: '대폭발의 미학',
            description: '[보유 효과] 회피율 +20%, 물리/마법 공격력 +4%, 화염 속성 공격력 +3%, 명중률 +12%',
            statBonus: { evaRate: 0.20, pAtkRate: 0.04, mAtkRate: 0.04, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedPassive: {
            name: '절대 멸망 폭쇄',
            description: '[장착 효과] 회피율 +30%, 물리/마법 공격력 +35%, 화염 속성 피해 +35%, 명중률 +20%',
            statBonus: { evaRate: 0.30, pAtkRate: 0.35, mAtkRate: 0.35, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '종말의 연쇄 대폭멸',
            description: '전장 전체를 집어삼키는 핵폭발급 연쇄 폭탄으로 지형 자체를 지워버립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2250, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Bomb',
            shinryokuType: '화염계'
        }
    }
};
