import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const SWORDSMAN_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.SWORDSMAN]: {
        learnedPassive: {
            name: '검리의 기초',
            description: '[보유 효과] 물리 공격력 +1%, 힘(STR) +3, 명중률 +2%',
            statBonus: { pAtkRate: 0.01, str: 3, accRate: 0.02 }
        },
        equippedPassive: {
            name: '검술 태세',
            description: '[장착 효과] 물리 공격력 +5%, 명중률 +5%',
            statBonus: { pAtkRate: 0.05, accRate: 0.05 }
        },
        equippedActive: {
            name: '일섬베기',
            description: '기본에 충실한 날카로운 사선베기로 적을 강타합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 40,
            powerRatio: 140,
            tier: ClassTier.FIRST,
            icon: 'Sword',
            shinryokuType: '무기강화계'
        }
    },
    // 2차
    [CombatStyle.KNIGHT]: {
        learnedPassive: {
            name: '수호의 맹세',
            description: '[보유 효과] 물리 방어력 +1.5%, 체력(HP) +100, 명중률 +4%',
            statBonus: { pDefRate: 0.015, maxHp: 100, accRate: 0.04 }
        },
        equippedPassive: {
            name: '철벽 가드',
            description: '[장착 효과] 물리/마법 방어력 +10%, 받는 피해 5% 감소, 명중률 +8%',
            statBonus: { pDefRate: 0.1, mDefRate: 0.1, damageReduction: 0.05, accRate: 0.08 }
        },
        equippedActive: {
            name: '실드 배쉬 & 가드',
            description: '방패로 적을 강하게 후려쳐 균형을 무너뜨립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 160,
            powerRatio: 240,
            tier: ClassTier.SECOND,
            icon: 'Shield',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.MAGIC_SWORDSMAN]: {
        learnedPassive: {
            name: '마도와 검의 조화',
            description: '[보유 효과] 물리/마법 공격력 +1%, 지능(INT) +3, 물리/마법 명중률 +4%',
            statBonus: { pAtkRate: 0.01, mAtkRate: 0.01, int: 3, accRate: 0.04, mAccRate: 0.04 }
        },
        equippedPassive: {
            name: '마력검 코팅',
            description: '[장착 효과] 마법 공격력 +10%, 치명타 확률 +4%, 물리/마법 명중률 +8%',
            statBonus: { mAtkRate: 0.1, critRate: 0.04, accRate: 0.08, mAccRate: 0.08 }
        },
        equippedActive: {
            name: '마력 검기 방출',
            description: '검신에 마력을 휘감아 전방으로 파동을 방출합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 260,
            tier: ClassTier.SECOND,
            icon: 'Sparkles',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.DUAL_SWORDSMAN]: {
        learnedPassive: {
            name: '쌍수의 감각',
            description: '[보유 효과] 민첩(AGI) +4, 치명타 피해 +2%, 명중률 +4%',
            statBonus: { agi: 4, critDmg: 2, accRate: 0.04 }
        },
        equippedPassive: {
            name: '질풍의 연격',
            description: '[장착 효과] 공격속도 및 민첩 +8%, 치명타 확률 +5%, 명중률 +8%',
            statBonus: { agiRate: 0.08, critRate: 0.05, accRate: 0.08 }
        },
        equippedActive: {
            name: '쌍검 십자교차참',
            description: '쌍검으로 적을 X자로 교차 베기하여 연타를 가합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 180,
            powerRatio: 270,
            tier: ClassTier.SECOND,
            icon: 'Scissors',
            shinryokuType: '질풍계'
        }
    },
    // 3차
    [CombatStyle.PALADIN]: {
        learnedPassive: {
            name: '성스러운 가호',
            description: '[보유 효과] 마법 방어력 +2%, 지혜(WIS) +5, 물리/마법 명중률 +8%',
            statBonus: { mDefRate: 0.02, wis: 5, accRate: 0.08, mAccRate: 0.08 }
        },
        equippedPassive: {
            name: '성기사의 성역',
            description: '[장착 효과] 전방 방어력 +15%, 매 턴 체력 회복 3%, 물리/마법 명중률 +16%',
            statBonus: { pDefRate: 0.15, mDefRate: 0.15, accRate: 0.16, mAccRate: 0.16 }
        },
        equippedActive: {
            name: '신성 심판의 검',
            description: '빛의 기운을 담은 거대한 성검으로 악을 단죄합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 570,
            powerRatio: 750,
            tier: ClassTier.LAST,
            icon: 'Sun',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.MAGIC_KNIGHT]: {
        learnedPassive: {
            name: '마도 검격 연마',
            description: '[보유 효과] 마법 공격력 +2%, 물리 공격력 +1%, 지능 +5, 물리/마법 명중률 +6%',
            statBonus: { mAtkRate: 0.02, pAtkRate: 0.01, int: 5, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '마력 응축 칼날',
            description: '[장착 효과] 마법 공격력 +18%, 치명타 피해 +15%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.18, critDmg: 15, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '비전 마검 연쇄참',
            description: '고밀도 마력 검기를 뿜어내 적의 신체와 영혼을 동시에 벱니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 800,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.IRONCLAD_KNIGHT]: {
        learnedPassive: {
            name: '강철 신체',
            description: '[보유 효과] 방어력(DEF) +8, 물리 방어력 +2%, 명중률 +6%',
            statBonus: { def: 8, pDefRate: 0.02, accRate: 0.06 }
        },
        equippedPassive: {
            name: '불요불굴',
            description: '[장착 효과] 물리 방어력 +25%, 받는 피해 10% 감소, 명중률 +12%',
            statBonus: { pDefRate: 0.25, damageReduction: 0.1, accRate: 0.12 }
        },
        equippedActive: {
            name: '철벽의 요새화',
            description: '방패를 지면에 박아 충격파를 일으키며 방어 태세를 굳힙니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 510,
            powerRatio: 700,
            tier: ClassTier.LAST,
            icon: 'ShieldCheck',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.BLADE_DANCER]: {
        learnedPassive: {
            name: '유려한 검무',
            description: '[보유 효과] 회피율 +1%, 치명타 확률 +1%, 명중률 +6%',
            statBonus: { evaRate: 0.01, critRate: 0.01, accRate: 0.06 }
        },
        equippedPassive: {
            name: '칼날의 왈츠',
            description: '[장착 효과] 회피율 +8%, 치명타 피해 +20%, 명중률 +12%',
            statBonus: { evaRate: 0.08, critDmg: 20, accRate: 0.12 }
        },
        equippedActive: {
            name: '화려한 검무 난무',
            description: '마치 춤을 추듯 회전하며 적을 사방에서 난도질합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Wind',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.GLADIATOR]: {
        learnedPassive: {
            name: '투사의 투기',
            description: '[보유 효과] 물리 공격력 +2%, 힘(STR) +6, 명중률 +6%',
            statBonus: { pAtkRate: 0.02, str: 6, accRate: 0.06 }
        },
        equippedPassive: {
            name: '투기 폭발',
            description: '[장착 효과] 물리 공격력 +18%, 치명타 확률 +7%, 명중률 +12%',
            statBonus: { pAtkRate: 0.18, critRate: 0.07, accRate: 0.12 }
        },
        equippedActive: {
            name: '투신의 일격',
            description: '투기를 한 점에 모아 적의 갑주를 뚫는 맹공을 꽂아넣습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 850,
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '신체강화계'
        }
    },
    // 4차
    [CombatStyle.CRUSADER]: {
        learnedPassive: {
            name: '성전의 영광',
            description: '[보유 효과] 전체 공격력 +2%, 전체 방어력 +2%, 체력 +300, 물리/마법 명중률 +12%',
            statBonus: { pAtkRate: 0.02, mAtkRate: 0.02, pDefRate: 0.02, mDefRate: 0.02, maxHp: 300, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedPassive: {
            name: '성전사의 권능',
            description: '[장착 효과] 물리/마법 방어력 +25%, 신성 추가 피해 +20%, 물리/마법 명중률 +25%',
            statBonus: { pDefRate: 0.25, mDefRate: 0.25, pAtkRate: 0.15, accRate: 0.25, mAccRate: 0.25 }
        },
        equippedActive: {
            name: '홀리 크루세이더 블레이드',
            description: '하늘에서 내리꽂히는 거대한 성스러운 빛의 기둥과 함께 적을 궤멸시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2100,
            powerRatio: 2350,
            tier: ClassTier.FINAL,
            icon: 'Zap',
            shinryokuType: '태양계'
        }
    },
    [CombatStyle.HYBRID]: {
        learnedPassive: {
            name: '마검일체의 극치',
            description: '[보유 효과] 물리/마법 공격력 +3%, 지능 +10, 힘 +10, 물리/마법 명중률 +10%',
            statBonus: { pAtkRate: 0.03, mAtkRate: 0.03, int: 10, str: 10, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '원소 마도 검성',
            description: '[장착 효과] 물리/마법 공격력 +35%, 신력 속성 공격력 +20%, 물리/마법 명중률 +20%',
            statBonus: { pAtkRate: 0.35, mAtkRate: 0.35, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '진 삼라만상 마검격',
            description: '물리 검기와 4대 원소 마법을 융합한 궁극의 마검을 투사합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2250,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Sparkles',
            shinryokuType: '태양계'
        }
    },
    [CombatStyle.GUARDIAN_KNIGHT]: {
        learnedPassive: {
            name: '수호의 금자탑',
            description: '[보유 효과] 물리/마법 방어력 +3%, 방어력(DEF) +15, 명중률 +10%',
            statBonus: { pDefRate: 0.03, mDefRate: 0.03, def: 15, accRate: 0.10 }
        },
        equippedPassive: {
            name: '절대 수호 영역',
            description: '[장착 효과] 받는 모든 피해 20% 감소, 방어력 +35%, 명중률 +20%',
            statBonus: { damageReduction: 0.2, pDefRate: 0.35, mDefRate: 0.35, accRate: 0.20 }
        },
        equippedActive: {
            name: '이지스 오브 가디언',
            description: '신화급 결계를 소환해 적의 모든 공세를 반사하고 충격파를 방출합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 1900,
            powerRatio: 2200,
            tier: ClassTier.FINAL,
            icon: 'ShieldAlert',
            shinryokuType: '대지계'
        }
    },
    [CombatStyle.SWORD_EMPEROR]: {
        learnedPassive: {
            name: '검황의 극의',
            description: '[보유 효과] 물리 공격력 +3%, 치명타 피해 +6%, 명중률 +10%',
            statBonus: { pAtkRate: 0.03, critDmg: 6, accRate: 0.10 }
        },
        equippedPassive: {
            name: '만검귀종',
            description: '[장착 효과] 물리 공격력 +35%, 치명타 확률 +12%, 치명타 피해 +40%, 명중률 +20%',
            statBonus: { pAtkRate: 0.35, critRate: 0.12, critDmg: 40, accRate: 0.20 }
        },
        equippedActive: {
            name: '천지개벽 극섬',
            description: '공간마저 베어내는 무수한 검기로 적 전체를 일도양단합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crosshair',
            shinryokuType: '무기강화계'
        }
    },
    [CombatStyle.BATTLE_KING]: {
        learnedPassive: {
            name: '투왕의 패기',
            description: '[보유 효과] 힘(STR) +12, 물리 공격력 +3%, 명중률 +10%',
            statBonus: { str: 12, pAtkRate: 0.03, accRate: 0.10 }
        },
        equippedPassive: {
            name: '패왕 투기',
            description: '[장착 효과] 물리 공격력 +40%, 피해 흡혈 5%, 명중률 +20%',
            statBonus: { pAtkRate: 0.4, hpAbsorbRate: 0.05, accRate: 0.20 }
        },
        equippedActive: {
            name: '패황 절명섬',
            description: '전장을 뒤흔드는 패왕의 검풍으로 적의 명줄을 끊습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2250,
            powerRatio: 2400,
            tier: ClassTier.FINAL,
            icon: 'Swords',
            shinryokuType: '신체강화계'
        }
    }
};
