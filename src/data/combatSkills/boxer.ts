import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const BOXER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.BOXER]: {
        learnedPassive: {
            name: '주먹 단련',
            description: '[보유 효과] 민첩(AGI) +3, 힘(STR) +3, 명중률 +2%',
            statBonus: { agi: 3, str: 3, accRate: 0.02 }
        },
        equippedPassive: {
            name: '인파이팅 스탭',
            description: '[장착 효과] 공격속도 및 회피율 +4%, 치명타 +3%, 명중률 +5%',
            statBonus: { evaRate: 0.04, critRate: 0.03, accRate: 0.05 }
        },
        equippedActive: {
            name: '원투 스트레이트',
            description: '빠른 잽에 이은 묵직한 오른손 스트레이트를 적의 턱에 꽂아넣습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 35,
            powerRatio: 135,
            tier: ClassTier.FIRST,
            icon: 'HandMetal',
            shinryokuType: '신체강화계'
        }
    },
    // 2차
    [CombatStyle.MARTIAL_ARTIST]: {
        learnedPassive: {
            name: '기혈 순환',
            description: '[보유 효과] 체력(HP) +120, 마력(MP) +60, 명중률 +4%',
            statBonus: { maxHp: 120, maxMp: 60, accRate: 0.04 }
        },
        equippedPassive: {
            name: '투기 방출',
            description: '[장착 효과] 물리 공격력 +12%, 치명타 확률 +6%, 명중률 +8%',
            statBonus: { pAtkRate: 0.12, critRate: 0.06, accRate: 0.08 }
        },
        equippedActive: {
            name: '호포 연타',
            description: '호랑이의 포효와 같은 기합과 함께 정권 연타를 퍼붓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 230,
            tier: ClassTier.SECOND,
            icon: 'Flame',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.PUGILIST]: {
        learnedPassive: {
            name: '단련된 굳은살',
            description: '[보유 효과] 물리 공격력 +1.5%, 힘 +4, 명중률 +4%',
            statBonus: { pAtkRate: 0.015, str: 4, accRate: 0.04 }
        },
        equippedPassive: {
            name: '체중 실린 펀치',
            description: '[장착 효과] 물리 공격력 +14%, 치명타 피해 +12%, 명중률 +8%',
            statBonus: { pAtkRate: 0.14, critDmg: 12, accRate: 0.08 }
        },
        equippedActive: {
            name: '바디블로우 어퍼컷',
            description: '복부에 묵직한 바디를 꽂아 넣고 턱을 들어 올리는 치명적인 콤보를 칩니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 200,
            powerRatio: 250,
            tier: ClassTier.SECOND,
            icon: 'HandMetal',
            shinryokuType: '신체강화계'
        }
    },
    // 3차
    [CombatStyle.COMBATANT]: {
        learnedPassive: {
            name: '무투의 극',
            description: '[보유 효과] 회피율 +2%, 민첩 +6, 명중률 +6%',
            statBonus: { evaRate: 0.02, agi: 6, accRate: 0.06 }
        },
        equippedPassive: {
            name: '흐르는 공방',
            description: '[장착 효과] 회피율 +10%, 물리 공격력 +16%, 명중률 +12%',
            statBonus: { evaRate: 0.1, pAtkRate: 0.16, accRate: 0.12 }
        },
        equippedActive: {
            name: '유운 신권 연타',
            description: '물 흐르는 듯한 체술로 적의 사각을 파고들어 연속 권격을 꽂습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 750,
            tier: ClassTier.LAST,
            icon: 'Wind',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.COMBO_MASTER]: {
        learnedPassive: {
            name: '초고속 연타 감각',
            description: '[보유 효과] 민첩 +8, 명중률 +6%',
            statBonus: { agi: 8, accRate: 0.06 }
        },
        equippedPassive: {
            name: '무한 연격태세',
            description: '[장착 효과] 민첩 +20%, 치명타 확률 +8%, 명중률 +12%',
            statBonus: { agiRate: 0.2, critRate: 0.08, accRate: 0.12 }
        },
        equippedActive: {
            name: '백열 권타 난무',
            description: '눈에 보이지 않는 광속의 주먹으로 수십 방의 연타를 퍼붓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.FIGHTER]: {
        learnedPassive: {
            name: '투사의 맷집',
            description: '[보유 효과] 물리 공격력 +1.5%, 물리 방어력 +1.5%, 체력 +150, 명중률 +6%',
            statBonus: { pAtkRate: 0.015, pDefRate: 0.015, maxHp: 150, accRate: 0.06 }
        },
        equippedPassive: {
            name: '카운터 펀치',
            description: '[장착 효과] 물리 공격력 +18%, 받는 피해 8% 감소, 명중률 +12%',
            statBonus: { pAtkRate: 0.18, damageReduction: 0.08, accRate: 0.12 }
        },
        equippedActive: {
            name: '필살 크로스 카운터',
            description: '적의 공격을 비껴내며 안면에 치명적인 혼신의 카운터를 꽂습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 780,
            tier: ClassTier.LAST,
            icon: 'Shield',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.FIST_SAINT]: {
        learnedPassive: {
            name: '권성의 기공',
            description: '[보유 효과] 물리 공격력 +2.5%, 힘 +8, 명중률 +6%',
            statBonus: { pAtkRate: 0.025, str: 8, accRate: 0.06 }
        },
        equippedPassive: {
            name: '기공 파동권',
            description: '[장착 효과] 물리 공격력 +22%, 치명타 확률 +10%, 명중률 +12%',
            statBonus: { pAtkRate: 0.22, critRate: 0.1, accRate: 0.12 }
        },
        equippedActive: {
            name: '패왕 파동정권',
            description: '권신에 응축된 기공 충격파를 발사하여 적의 장기를 뒤흔듭니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 850,
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '광휘계'
        }
    },
    // 4차
    [CombatStyle.WAR_GOD]: {
        learnedPassive: {
            name: '무신의 정점',
            description: '[보유 효과] 힘 +10, 민첩 +10, 물리 공격력 +3%, 명중률 +10%',
            statBonus: { str: 10, agi: 10, pAtkRate: 0.03, accRate: 0.10 }
        },
        equippedPassive: {
            name: '신살투기',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 확률 +15%, 흡혈 +4%, 명중률 +20%',
            statBonus: { pAtkRate: 0.45, critRate: 0.15, hpAbsorbRate: 0.04, accRate: 0.20 }
        },
        equippedActive: {
            name: '무신 극의 천마파황권',
            description: '신조차 부숴버리는 무신의 절대적인 권압으로 적을 산산조각 냅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2400,
            tier: ClassTier.FINAL,
            icon: 'Zap',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.COMBO_EMPEROR]: {
        learnedPassive: {
            name: '연격의 지배',
            description: '[보유 효과] 민첩 +15, 명중률 +10%',
            statBonus: { agi: 15, accRate: 0.10 }
        },
        equippedPassive: {
            name: '광속 무한연격',
            description: '[장착 효과] 민첩 +35%, 치명타 확률 +15%, 치명타 피해 +35%, 명중률 +20%',
            statBonus: { agiRate: 0.35, critRate: 0.15, critDmg: 35, accRate: 0.20 }
        },
        equippedActive: {
            name: '무한 광속 연격포',
            description: '공간을 왜곡시키는 수천 발의 주먹으로 적의 존재를 지워버립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.FIST_GOD]: {
        learnedPassive: {
            name: '투신의 신격',
            description: '[보유 효과] 물리 공격력 +4%, 힘 +16, 명중률 +10%',
            statBonus: { pAtkRate: 0.04, str: 16, accRate: 0.10 }
        },
        equippedPassive: {
            name: '일격필살 투신경',
            description: '[장착 효과] 물리 공격력 +50%, 치명타 피해 +45%, 명중률 +20%',
            statBonus: { pAtkRate: 0.5, critDmg: 45, accRate: 0.20 }
        },
        equippedActive: {
            name: '천지파쇄 일격필살권',
            description: '대륙을 가르는 단 한 번의 정권으로 적을 완벽하게 절명시킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '대지계'
        }
    }
};
