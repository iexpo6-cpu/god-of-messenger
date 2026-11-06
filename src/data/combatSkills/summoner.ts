import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const SUMMONER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 2차 전직: 소환사
    [CombatStyle.SUMMONER]: {
        learnedPassive: {
            name: '소환 계약',
            description: '[보유 효과] 마나 +100, 통제 +4, 마법 명중률 +5%',
            statBonus: { maxMp: 100, ctrl: 4, mAccRate: 0.05 }
        },
        equippedPassive: {
            name: '영혼 교감',
            description: '[장착 효과] 마법 공격력 +6%, 마법 명중률 +10%, 통제 +6',
            statBonus: { mAtkRate: 0.06, mAccRate: 0.10, ctrl: 6 }
        },
        equippedActive: {
            name: '소환 탄환',
            description: '소환 마력을 응축하여 적에게 강력한 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 180,
            powerRatio: 120,
            tier: ClassTier.SECOND,
            icon: 'Zap'
        }
    },

    // 3차 전직: 정령소환사, 수환사
    [CombatStyle.ELEMENT_SUMMONER]: {
        learnedPassive: {
            name: '원소 소환 친화',
            description: '[보유 효과] 마법 공격력 +1.5%, 통제 +4, 마법 명중률 +7%',
            statBonus: { mAtkRate: 0.015, ctrl: 4, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '정령의 가호',
            description: '[장착 효과] 마법 공격력 +12%, 통제 +10, 마법 명중률 +14%',
            statBonus: { mAtkRate: 0.12, ctrl: 10, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '원소 탄도',
            description: '4대 원소 마력을 하나로 융합하여 적에게 강력한 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 510,
            powerRatio: 220,
            tier: ClassTier.LAST,
            icon: 'Zap'
        }
    },
    [CombatStyle.BEAST_SUMMONER]: {
        learnedPassive: {
            name: '야수 지배',
            description: '[보유 효과] 체력 +150, 통제 +4, 마법 명중률 +7%',
            statBonus: { maxHp: 150, ctrl: 4, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '야성의 울부짖음',
            description: '[장착 효과] 마법 공격력 +12%, 물리 방어력 +8%, 마법 명중률 +14%',
            statBonus: { mAtkRate: 0.12, pDefRate: 0.08, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '야수의 영격',
            description: '야수의 마수를 구체화하여 적을 강하게 타격하는 마법 공격입니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 540,
            powerRatio: 230,
            tier: ClassTier.LAST,
            icon: 'Zap'
        }
    },

    // 3차
    [CombatStyle.GRAND_SUMMONER]: {
        learnedPassive: {
            name: '대소환 마법진',
            description: '[보유 효과] 마법 공격력 +2.5%, 통제 +8, 마법 명중률 +10%',
            statBonus: { mAtkRate: 0.025, ctrl: 8, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '원소 군주의 결속',
            description: '[장착 효과] 마법 공격력 +25%, 통제 +18, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.25, ctrl: 18, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '정령왕의 번개',
            description: '정령왕의 신성한 마력을 방출하여 모든 적에게 광역 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 780,
            powerRatio: 650,
            tier: ClassTier.LAST,
            icon: 'Zap'
        }
    },
    [CombatStyle.BEAST_MASTER]: {
        learnedPassive: {
            name: '마수 조련의 극의',
            description: '[보유 효과] 체력 +300, 통제 +8, 마법 명중률 +10%',
            statBonus: { maxHp: 300, ctrl: 8, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '맹수군단 지배',
            description: '[장착 효과] 마법 공격력 +24%, 치명타 확률 +12%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.24, critRate: 0.12, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '마수 포효격',
            description: '고대 마수의 파동 마력을 정면에 방출하여 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 840,
            powerRatio: 750,
            tier: ClassTier.LAST,
            icon: 'Zap'
        }
    },

    // 4차
    [CombatStyle.SUMMON_KING]: {
        learnedPassive: {
            name: '환수왕의 군림',
            description: '[보유 효과] 마법 공격력 +3.5%, 통제 +15, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.035, ctrl: 15, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '환수 군주의 결의',
            description: '[장착 효과] 마법 공격력 +45%, 통제 +30, 마법 명중률 +25%',
            statBonus: { mAtkRate: 0.45, ctrl: 30, mAccRate: 0.25 }
        },
        equippedActive: {
            name: '환수왕의 섬광',
            description: '환수왕의 마력을 집중 폭발시켜 모든 적에게 광역 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2800,
            powerRatio: 2200,
            tier: ClassTier.FINAL,
            icon: 'Zap'
        }
    },
    [CombatStyle.ANCIENT_SUMMONER]: {
        learnedPassive: {
            name: '고대 원시 계약',
            description: '[보유 효과] 마법 공격력 +3.5%, 통제 +15, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.035, ctrl: 15, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '태초 소환의 경지',
            description: '[장착 효과] 마법 공격력 +42%, 마법 관통력 +20%, 마법 명중률 +25%',
            statBonus: { mAtkRate: 0.42, mAccRate: 0.25 }
        },
        equippedActive: {
            name: '태초의 성격',
            description: '태초의 고대 마력을 집중 투사하여 적에게 엄청난 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 3000,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Zap'
        }
    }
};
