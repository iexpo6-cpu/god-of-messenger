import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const MAGE_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.MAGE]: {
        learnedPassive: {
            name: '마나 친화',
            description: '[보유 효과] 마나(MP) +100, 지능(INT) +4, 마법 명중률 +5%',
            statBonus: { maxMp: 100, int: 4, mAccRate: 0.05 }
        },
        equippedPassive: {
            name: '영창 단축',
            description: '[장착 효과] 마법 공격력 +6%, 마법 명중률 +10%',
            statBonus: { mAtkRate: 0.06, mAccRate: 0.10 }
        },
        equippedActive: {
            name: '매직 미사일 스트라이크',
            description: '순수한 마력 탄환을 응축하여 적에게 발사합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 50,
            powerRatio: 145,
            tier: ClassTier.FIRST,
            icon: 'Sparkles',
            shinryokuType: '광휘계'
        }
    },
    // 2차
    [CombatStyle.ELEMENTALIST]: {
        learnedPassive: {
            name: '원소의 이해',
            description: '[보유 효과] 마법 공격력 +1.5%, 지능(INT) +4, 마법 명중률 +7%',
            statBonus: { mAtkRate: 0.015, int: 4, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '원소 폭풍 증폭',
            description: '[장착 효과] 마법 공격력 +12%, 마법 명중률 +14%',
            statBonus: { mAtkRate: 0.12, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '파이어 & 프로스트 블래스트',
            description: '화염과 냉기를 동시에 소환해 전방에 원소 폭풍을 일으킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 210,
            powerRatio: 135, // 2차 AoE (100~150)
            tier: ClassTier.SECOND,
            icon: 'Flame',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.ARCANIST]: {
        learnedPassive: {
            name: '비전 탐구',
            description: '[보유 효과] 마력 +150, 마법 공격력 +1.5%, 마법 명중률 +7%',
            statBonus: { maxMp: 150, mAtkRate: 0.015, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '비전 마력 집중',
            description: '[장착 효과] 마법 공격력 +15%, 치명타 피해 +12%, 마법 명중률 +14%',
            statBonus: { mAtkRate: 0.15, critDmg: 12, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '아케인 스피어',
            description: '초고밀도로 압축된 비전 마력구를 발사해 적을 꿰뚫습니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 230,
            powerRatio: 250,
            tier: ClassTier.SECOND,
            icon: 'Sparkles',
            shinryokuType: '월광계'
        }
    },
    [CombatStyle.CLERIC]: {
        learnedPassive: {
            name: '치유의 은총',
            description: '[보유 효과] 체력 +120, 지혜(WIS) +4, 마법 명중률 +7%',
            statBonus: { maxHp: 120, wis: 4, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '신의 가호',
            description: '[장착 효과] 마법 방어력 +12%, 마법 명중률 +14%',
            statBonus: { mDefRate: 0.12, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '홀리 스마이트',
            description: '성스러운 빛의 둔기로 적을 내리쳐 큰 마법 피해를 입힙니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 220,
            tier: ClassTier.SECOND,
            icon: 'Sun',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.SHAMAN]: {
        learnedPassive: {
            name: '정령과의 교감',
            description: '[보유 효과] 지혜 +5, 마법 공격력 +1.2%, 마법 명중률 +7%',
            statBonus: { wis: 5, mAtkRate: 0.012, mAccRate: 0.07 }
        },
        equippedPassive: {
            name: '토템의 권능',
            description: '[장착 효과] 마법 공격력 +12%, 마법 방어력 +8%, 마법 명중률 +14%',
            statBonus: { mAtkRate: 0.12, mDefRate: 0.08, mAccRate: 0.14 }
        },
        equippedActive: {
            name: '낙뢰와 대지 강타',
            description: '하늘의 번개와 대지의 기운을 빌려 적을 강타합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 210,
            powerRatio: 240,
            tier: ClassTier.SECOND,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    // 3차
    [CombatStyle.GRAND_MAGE]: {
        learnedPassive: {
            name: '대마법의 기초',
            description: '[보유 효과] 지능 +8, 마법 공격력 +2%, 마법 명중률 +10%',
            statBonus: { int: 8, mAtkRate: 0.02, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '마도 영창 공명',
            description: '[장착 효과] 마법 공격력 +22%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.22, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '메테오 익스플로전',
            description: '우주에서 거대한 운석을 낙하시켜 전장을 불바다로 만듭니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 450, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.FROST_FLAME_MAGE]: {
        learnedPassive: {
            name: '빙염의 조화',
            description: '[보유 효과] 마법 공격력 +2.5%, 지능 +8, 마법 명중률 +10%',
            statBonus: { mAtkRate: 0.025, int: 8, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '열역학 극한',
            description: '[장착 효과] 마법 공격력 +24%, 치명타 확률 +8%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.24, critRate: 0.08, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '절대영도 화염지옥 폭풍',
            description: '극저온의 얼음과 극한의 화염을 교차 폭발시켜 적을 분쇄합니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 705,
            powerRatio: 480, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '빙결계'
        }
    },
    [CombatStyle.ARCANE_MAGE]: {
        learnedPassive: {
            name: '차원 비전술',
            description: '[보유 효과] 마법 공격력 +2%, 치명타 피해 +6%, 마법 명중률 +10%',
            statBonus: { mAtkRate: 0.02, critDmg: 6, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '비전 특이점',
            description: '[장착 효과] 마법 공격력 +22%, 치명타 피해 +25%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.22, critDmg: 25, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '아케인 블랙홀',
            description: '차원을 붕괴시키는 초고밀도 비전구를 적의 중심부에 투척합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 850,
            tier: ClassTier.LAST,
            icon: 'Sparkles',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.MAGIC_SAGE]: {
        learnedPassive: {
            name: '마도의 이치',
            description: '[보유 효과] 지혜 +10, 지능 +10, 마법 명중률 +10%',
            statBonus: { wis: 10, int: 10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '현자의 마도진',
            description: '[장착 효과] 마법 공격력 +25%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.25, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '삼라만상 지혜의 빛',
            description: '마도의 모든 비밀을 집대성한 빛으로 적을 정화합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 880,
            tier: ClassTier.LAST,
            icon: 'Sun',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.PRIEST]: {
        learnedPassive: {
            name: '성스러운 기도',
            description: '[보유 효과] 마법 방어력 +2%, 지혜 +8, 마법 명중률 +10%',
            statBonus: { mDefRate: 0.02, wis: 8, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '대천사의 은총',
            description: '[장착 효과] 마법 방어력 +20%, 마법 명중률 +20%',
            statBonus: { mDefRate: 0.2, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '대천사 심판의 빛',
            description: '하늘에서 내리는 성스러운 빛으로 적을 정화하고 치명타를 가합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 700,
            tier: ClassTier.LAST,
            icon: 'Sun',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.SPIRIT_MAGE]: {
        learnedPassive: {
            name: '정령왕의 계약',
            description: '[보유 효과] 마법 공격력 +2%, 지혜 +8, 마법 명중률 +10%',
            statBonus: { mAtkRate: 0.02, wis: 8, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '4대 정령의 가호',
            description: '[장착 효과] 마법 공격력 +20%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.2, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '4대 정령 합일 폭풍',
            description: '물, 불, 바람, 땅의 4대 정령을 동시에 소환해 전방을 휩씁니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 430, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Wind',
            shinryokuType: '초화계'
        }
    },
    [CombatStyle.MANA_MANIPULATOR]: {
        learnedPassive: {
            name: '마력 제어술',
            description: '[보유 효과] 마력 +250, 마법 공격력 +2%, 마법 명중률 +10%',
            statBonus: { maxMp: 250, mAtkRate: 0.02, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '마나 과부하',
            description: '[장착 효과] 마법 공격력 +22%, 치명타 확률 +8%, 마법 명중률 +20%',
            statBonus: { mAtkRate: 0.22, critRate: 0.08, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '마력 응축 파동포',
            description: '체내의 모든 마나를 한 점으로 짜내어 거대한 광선을 발사합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 800,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    // 4차
    [CombatStyle.ELEMENTAL_LORD]: {
        learnedPassive: {
            name: '원소의 군주',
            description: '[보유 효과] 마법 공격력 +3.5%, 지능 +15, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.035, int: 15, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '만상 원소 지배',
            description: '[장착 효과] 마법 공격력 +45%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.45, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '천지창조 원소 카타클리즘',
            description: '모든 원소의 격류를 소환하여 전장을 태초의 혼돈 상태로 되돌립니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2250, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.ELEMENTAL_SOVEREIGN]: {
        learnedPassive: {
            name: '원소 주권',
            description: '[보유 효과] 마법 공격력 +4%, 지능 +16, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.04, int: 16, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '절대 원소 융합',
            description: '[장착 효과] 마법 공격력 +50%, 치명타 확률 +15%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.5, critRate: 0.15, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '원소의 종말 아마겟돈',
            description: '하늘에서 무수한 불타는 얼음 유성을 소환해 지상 전체를 궤멸시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2550,
            powerRatio: 2300, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.ARCHMAGE]: {
        learnedPassive: {
            name: '아크메이지의 영지',
            description: '[보유 효과] 마법 공격력 +4%, 지능(INT) +15, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.04, int: 15, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '궁극 마법 회로',
            description: '[장착 효과] 마법 공격력 +50%, 치명타 피해 +50%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.5, critDmg: 50, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '태고의 비전 특이점 붕괴',
            description: '우주를 멸망시키는 태고의 비전 특이점을 소환해 적을 영구 소멸시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2480,
            tier: ClassTier.FINAL,
            icon: 'Sparkles',
            shinryokuType: '암흑계'
        }
    },
    [CombatStyle.GRAND_SAGE]: {
        learnedPassive: {
            name: '대현자의 지혜',
            description: '[보유 효과] 지혜 +16, 지능 +16, 마법 명중률 +15%',
            statBonus: { wis: 16, int: 16, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '삼라만상의 도서관',
            description: '[장착 효과] 마법 공격력 +45%, 마법 방어력 +30%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.45, mDefRate: 0.3, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '진리의 빛 심판격',
            description: '만물의 근원 진리를 구현화한 빛의 기둥으로 적을 소멸시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2420,
            tier: ClassTier.FINAL,
            icon: 'Sun',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.SAINT]: {
        learnedPassive: {
            name: '성자의 권능',
            description: '[보유 효과] 마법 방어력 +3%, 체력 +350, 지혜 +15, 마법 명중률 +15%',
            statBonus: { mDefRate: 0.03, maxHp: 350, wis: 15, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '신성 불가침',
            description: '[장착 효과] 마법 방어력 +35%, 받는 피해 20% 감소, 마법 명중률 +30%',
            statBonus: { mDefRate: 0.35, damageReduction: 0.2, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '홀리 제네시스',
            description: '태초의 창조 신성광으로 악을 불태우고 전장에 성스러운 안식을 선사합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2100,
            powerRatio: 2300,
            tier: ClassTier.FINAL,
            icon: 'Sun',
            shinryokuType: '태양계'
        }
    },
    [CombatStyle.SPIRIT_KING]: {
        learnedPassive: {
            name: '정령왕의 왕관',
            description: '[보유 효과] 마법 공격력 +3.5%, 지혜 +16, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.035, wis: 16, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '정령 군단의 강림',
            description: '[장착 효과] 마법 공격력 +45%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.45, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '정령왕의 진노 대환란',
            description: '모든 정령의 왕들을 불러내어 전장을 뒤흔드는 절대 정령 폭풍을 일으킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2450,
            powerRatio: 2200, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '초화계'
        }
    },
    [CombatStyle.MAGIC_EMPEROR]: {
        learnedPassive: {
            name: '마도황제의 패도',
            description: '[보유 효과] 마법 공격력 +4.5%, 지능 +20, 마법 명중률 +15%',
            statBonus: { mAtkRate: 0.045, int: 20, mAccRate: 0.15 }
        },
        equippedPassive: {
            name: '만마 복종',
            description: '[장착 효과] 마법 공격력 +55%, 치명타 확률 +15%, 마법 명중률 +30%',
            statBonus: { mAtkRate: 0.55, critRate: 0.15, mAccRate: 0.30 }
        },
        equippedActive: {
            name: '마황 지배 절대 소멸파',
            description: '마도의 정점에 선 황제의 권능으로 모든 차원과 법칙을 초월해 적을 분쇄합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2500,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '암흑계'
        }
    }
};
