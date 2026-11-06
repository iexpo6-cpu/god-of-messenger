import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const BERSERKER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.BERSERKER]: {
        learnedPassive: {
            name: '광기의 불씨',
            description: '[보유 효과] 물리 공격력 +1.2%, 힘(STR) +4, 명중률 +5%',
            statBonus: { pAtkRate: 0.012, str: 4, accRate: 0.05 }
        },
        equippedPassive: {
            name: '광폭화 본능',
            description: '[장착 효과] 물리 공격력 +8%, 치명타 피해 +8%, 명중률 +10%',
            statBonus: { pAtkRate: 0.08, critDmg: 8, accRate: 0.10 }
        },
        equippedActive: {
            name: '난도 광타',
            description: '이성을 잃은 무자비한 궤적으로 적을 내려찍습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 50,
            powerRatio: 155,
            tier: ClassTier.FIRST,
            icon: 'Axe',
            shinryokuType: '신체강화계'
        }
    },
    // 2차
    [CombatStyle.AXE_WARRIOR]: {
        learnedPassive: {
            name: '도끼 다루기',
            description: '[보유 효과] 물리 공격력 +1.5%, 치명타 피해 +3%, 명중률 +7%',
            statBonus: { pAtkRate: 0.015, critDmg: 3, accRate: 0.07 }
        },
        equippedPassive: {
            name: '도끼날의 무게',
            description: '[장착 효과] 물리 공격력 +14%, 치명타 피해 +10%, 명중률 +14%',
            statBonus: { pAtkRate: 0.14, critDmg: 10, accRate: 0.14 }
        },
        equippedActive: {
            name: '와일드 휠스핀',
            description: '거대한 도끼를 회전시켜 적의 뼈와 살을 분리합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 210,
            powerRatio: 240,
            tier: ClassTier.SECOND,
            icon: 'RotateCw',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.DESTROYER]: {
        learnedPassive: {
            name: '파괴 본능',
            description: '[보유 효과] 힘(STR) +5, 물리 공격력 +1.5%, 명중률 +7%',
            statBonus: { str: 5, pAtkRate: 0.015, accRate: 0.07 }
        },
        equippedPassive: {
            name: '갑주 분쇄',
            description: '[장착 효과] 물리 공격력 +15%, 치명타 확률 +5%, 명중률 +14%',
            statBonus: { pAtkRate: 0.15, critRate: 0.05, accRate: 0.14 }
        },
        equippedActive: {
            name: '지진 분쇄타',
            description: '무거운 둔기로 지면을 내려쳐 적에게 치명적인 뇌진탕을 유발합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 230,
            powerRatio: 260,
            tier: ClassTier.SECOND,
            icon: 'Hammer',
            shinryokuType: '대지계'
        }
    },
    // 3차
    [CombatStyle.EXECUTIONER]: {
        learnedPassive: {
            name: '처형인의 시선',
            description: '[보유 효과] 물리 공격력 +2%, 치명타 피해 +6%, 명중률 +10%',
            statBonus: { pAtkRate: 0.02, critDmg: 6, accRate: 0.10 }
        },
        equippedPassive: {
            name: '단두대의 섬광',
            description: '[장착 효과] 물리 공격력 +20%, 치명타 피해 +25%, 명중률 +20%',
            statBonus: { pAtkRate: 0.2, critDmg: 25, accRate: 0.20 }
        },
        equippedActive: {
            name: '단칼 절명 처형',
            description: '적의 목을 조준해 단번에 참수하는 처형의 일격을 가합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 900,
            tier: ClassTier.LAST,
            icon: 'Skull',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.AXE_BERSERKER]: {
        learnedPassive: {
            name: '광전의 피',
            description: '[보유 효과] 물리 공격력 +2.5%, 힘 +6, 명중률 +10%',
            statBonus: { pAtkRate: 0.025, str: 6, accRate: 0.10 }
        },
        equippedPassive: {
            name: '도끼 난무 폭풍',
            description: '[장착 효과] 물리 공격력 +25%, 물리 방어력 -5%, 명중률 +20%',
            statBonus: { pAtkRate: 0.25, pDefRate: -0.05, accRate: 0.20 }
        },
        equippedActive: {
            name: '광란의 휠윈드 휩쓸기',
            description: '도끼를 광적으로 휘두르며 주변의 모든 적을 갈기갈기 찢어발깁니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 630,
            powerRatio: 450, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'RotateCw',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.SHIELD_BERSERKER]: {
        learnedPassive: {
            name: '강철 광기',
            description: '[보유 효과] 물리 방어력 +2.5%, 힘 +6, 치명타 피해 감소 +5%',
            statBonus: { pDefRate: 0.025, str: 6, critDmgResist: 5 }
        },
        equippedPassive: {
            name: '광전사의 철벽',
            description: '[장착 효과] 물리 방어력 +15%, 마법 방어력 +15%, 치명타 피해 감소 +20%, 물리 공격력 +10%',
            statBonus: { pDefRate: 0.15, mDefRate: 0.15, critDmgResist: 20, pAtkRate: 0.10 }
        },
        equippedActive: {
            name: '광전 방패 충돌격',
            description: '방패로 적의 공격을 밀쳐내며 도끼로 잔혹한 반격을 가합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 780,
            tier: ClassTier.LAST,
            icon: 'Shield',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.MACE_WARRIOR]: {
        learnedPassive: {
            name: '철퇴 충격술',
            description: '[보유 효과] 물리 공격력 +2%, 힘 +8, 명중률 +10%',
            statBonus: { pAtkRate: 0.02, str: 8, accRate: 0.10 }
        },
        equippedPassive: {
            name: '뼈마디 파쇄',
            description: '[장착 효과] 물리 공격력 +22%, 치명타 확률 +8%, 명중률 +20%',
            statBonus: { pAtkRate: 0.22, critRate: 0.08, accRate: 0.20 }
        },
        equippedActive: {
            name: '뇌진 철퇴 파쇄타',
            description: '육중한 철퇴로 적의 척추와 두개골을 강타합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Hammer',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.CRUSHER]: {
        learnedPassive: {
            name: '분쇄의 완력',
            description: '[보유 효과] 물리 공격력 +2.5%, 힘 +10, 명중률 +10%',
            statBonus: { pAtkRate: 0.025, str: 10, accRate: 0.10 }
        },
        equippedPassive: {
            name: '절대 압살',
            description: '[장착 효과] 물리 공격력 +26%, 치명타 피해 +20%, 명중률 +20%',
            statBonus: { pAtkRate: 0.26, critDmg: 20, accRate: 0.20 }
        },
        equippedActive: {
            name: '대지 분쇄 압살격',
            description: '온 체중과 힘을 실어 적을 바닥째 찌그러뜨립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 880,
            tier: ClassTier.LAST,
            icon: 'Hammer',
            shinryokuType: '대지계'
        }
    },
    // 4차
    [CombatStyle.DECAPITATOR]: {
        learnedPassive: {
            name: '절대 참수의 숙명',
            description: '[보유 효과] 물리 공격력 +3.5%, 치명타 피해 +12%, 힘 +15, 명중률 +15%',
            statBonus: { pAtkRate: 0.035, critDmg: 12, str: 15, accRate: 0.15 }
        },
        equippedPassive: {
            name: '참수의 극의',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 피해 +50%, 명중률 +30%',
            statBonus: { pAtkRate: 0.45, critDmg: 50, accRate: 0.30 }
        },
        equippedActive: {
            name: '천벌 참수 절명도',
            description: '신의 목조차 베어버리는 절대 처형의 참격을 내리꽂습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Skull',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.AXE_LORD]: {
        learnedPassive: {
            name: '도끼군주의 위엄',
            description: '[보유 효과] 물리 공격력 +3.5%, 힘(STR) +15, 명중률 +15%',
            statBonus: { pAtkRate: 0.035, str: 15, accRate: 0.15 }
        },
        equippedPassive: {
            name: '도끼 폭풍의 군주',
            description: '[장착 효과] 물리 공격력 +50%, 치명타 피해 +45%, 명중률 +30%',
            statBonus: { pAtkRate: 0.5, critDmg: 45, accRate: 0.30 }
        },
        equippedActive: {
            name: '천벌 파황 도끼비',
            description: '수많은 도끼 잔상이 하늘을 가르며 적의 모든 군세를 분쇄합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2200, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Axe',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.SHIELD_BERSERK_LORD]: {
        learnedPassive: {
            name: '불멸 광전의 요새',
            description: '[보유 효과] 물리 방어력 +4%, 체력 +350, 치명타 피해 감소 +10%',
            statBonus: { pDefRate: 0.04, maxHp: 350, critDmgResist: 10 }
        },
        equippedPassive: {
            name: '절대 수호의 광기',
            description: '[장착 효과] 물리 방어력 +35%, 마법 방어력 +35%, 치명타 피해 감소 +35%, 물리 공격력 +25%',
            statBonus: { pDefRate: 0.35, mDefRate: 0.35, critDmgResist: 35, pAtkRate: 0.25 }
        },
        equippedActive: {
            name: '천벌 요새 파황격',
            description: '수호의 장벽을 친 뒤 온몸의 광기를 실은 요새급 도끼 일격으로 적을 짓뭉갭니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2400,
            tier: ClassTier.FINAL,
            icon: 'Shield',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.DESTRUCTION_LORD]: {
        learnedPassive: {
            name: '파괴의 군림',
            description: '[보유 효과] 물리 공격력 +3.5%, 힘 +16, 명중률 +15%',
            statBonus: { pAtkRate: 0.035, str: 16, accRate: 0.15 }
        },
        equippedPassive: {
            name: '모든 방패의 종말',
            description: '[장착 효과] 물리 공격력 +48%, 치명타 확률 +15%, 명중률 +30%',
            statBonus: { pAtkRate: 0.48, critRate: 0.15, accRate: 0.30 }
        },
        equippedActive: {
            name: '멸망 파쇄 대붕괴',
            description: '전장을 통째로 가루로 만드는 괴력의 둔기 타격을 가합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2350,
            tier: ClassTier.FINAL,
            icon: 'Hammer',
            shinryokuType: '대지계'
        }
    },
    [CombatStyle.GRAND_CRUSHER]: {
        learnedPassive: {
            name: '대분쇄의 권능',
            description: '[보유 효과] 물리 공격력 +4%, 체력 +350, 명중률 +15%',
            statBonus: { pAtkRate: 0.04, maxHp: 350, accRate: 0.15 }
        },
        equippedPassive: {
            name: '지각 분쇄자',
            description: '[장착 효과] 물리 공격력 +52%, 치명타 피해 +40%, 명중률 +30%',
            statBonus: { pAtkRate: 0.52, critDmg: 40, accRate: 0.30 }
        },
        equippedActive: {
            name: '대지진 천멸 분쇄타',
            description: '지각을 뒤흔드는 궁극의 완력으로 적의 존재 자체를 납작하게 짓뭉갭니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Hammer',
            shinryokuType: '대지계'
        }
    }
};
