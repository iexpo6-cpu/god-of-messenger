import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const ENERGIZER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.ENERGIZER]: {
        learnedPassive: {
            name: '에너지 유도',
            description: '[보유 효과] 마나(MP) +80, 마법 공격력 +1%, 물리/마법 명중률 +2%',
            statBonus: { maxMp: 80, mAtkRate: 0.01, accRate: 0.02, mAccRate: 0.02 }
        },
        equippedPassive: {
            name: '에너지 증폭기',
            description: '[장착 효과] 물리/마법 공격력 +5%, 치명타 확률 +3%, 물리/마법 명중률 +5%',
            statBonus: { pAtkRate: 0.05, mAtkRate: 0.05, critRate: 0.03, accRate: 0.05, mAccRate: 0.05 }
        },
        equippedActive: {
            name: '에너지 펄스',
            description: '집중된 에너지 펄스를 발사하여 적을 타격합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 40,
            powerRatio: 140,
            tier: ClassTier.FIRST,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    // 2차
    [CombatStyle.ENERGY_BLADER]: {
        learnedPassive: {
            name: '에너지 검신',
            description: '[보유 효과] 물리/마법 공격력 +1%, 민첩 +4, 물리/마법 명중률 +4%',
            statBonus: { pAtkRate: 0.01, mAtkRate: 0.01, agi: 4, accRate: 0.04, mAccRate: 0.04 }
        },
        equippedPassive: {
            name: '광선검 가속',
            description: '[장착 효과] 물리 공격력 +12%, 민첩 +8%, 명중률 +8%',
            statBonus: { pAtkRate: 0.12, agiRate: 0.08, accRate: 0.08 }
        },
        equippedActive: {
            name: '플라즈마 슬래시',
            description: '초고온 에너지 칼날로 적을 순식간에 양단합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 190,
            powerRatio: 240,
            tier: ClassTier.SECOND,
            icon: 'Sword',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.ENERGY_SHOOTER]: {
        learnedPassive: {
            name: '에너지 집속 사격',
            description: '[보유 효과] 마법 공격력 +1.5%, 물리/마법 명중률 +4%',
            statBonus: { mAtkRate: 0.015, accRate: 0.04, mAccRate: 0.04 }
        },
        equippedPassive: {
            name: '빔 건 콘덴서',
            description: '[장착 효과] 마법 공격력 +14%, 치명타 피해 +10%, 물리/마법 명중률 +8%',
            statBonus: { mAtkRate: 0.14, critDmg: 10, accRate: 0.08, mAccRate: 0.08 }
        },
        equippedActive: {
            name: '집속 에너지 볼트',
            description: '고출력 에너지 탄환을 연사하여 적을 꿰뚫습니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 200,
            powerRatio: 250,
            tier: ClassTier.SECOND,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.ENERGY_CORE]: {
        learnedPassive: {
            name: '체내 원자로',
            description: '[보유 효과] 체력 +100, 마나 +100, 물리/마법 명중률 +4%',
            statBonus: { maxHp: 100, maxMp: 100, accRate: 0.04, mAccRate: 0.04 }
        },
        equippedPassive: {
            name: '에너지 배리어',
            description: '[장착 효과] 방어력 +12%, 받는 피해 6% 감소, 물리/마법 명중률 +8%',
            statBonus: { pDefRate: 0.12, mDefRate: 0.12, damageReduction: 0.06, accRate: 0.08, mAccRate: 0.08 }
        },
        equippedActive: {
            name: '코어 과충전 방출',
            description: '체내 에너지를 폭발시켜 주변 적에게 충격파를 가합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 200,
            powerRatio: 230,
            tier: ClassTier.SECOND,
            icon: 'Shield',
            shinryokuType: '전격계'
        }
    },
    // 3차
    [CombatStyle.PLASMA_SWORD]: {
        learnedPassive: {
            name: '초고온 플라즈마',
            description: '[보유 효과] 물리 공격력 +2%, 치명타 피해 +6%, 명중률 +6%',
            statBonus: { pAtkRate: 0.02, critDmg: 6, accRate: 0.06 }
        },
        equippedPassive: {
            name: '플라즈마 과열참',
            description: '[장착 효과] 물리 공격력 +20%, 치명타 피해 +20%, 명중률 +12%',
            statBonus: { pAtkRate: 0.2, critDmg: 20, accRate: 0.12 }
        },
        equippedActive: {
            name: '초열 플라즈마 십자단',
            description: '수만 도의 플라즈마 칼날로 적을 십자로 베어 녹여버립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 630,
            powerRatio: 820,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.ENERGY_KNIGHT]: {
        learnedPassive: {
            name: '에너지 아머',
            description: '[보유 효과] 물리/마법 방어력 +2%, 체력 +180, 물리/마법 명중률 +6%',
            statBonus: { pDefRate: 0.02, mDefRate: 0.02, maxHp: 180, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '포톤 실드 장벽',
            description: '[장착 효과] 방어력 +22%, 받는 피해 10% 감소, 물리/마법 명중률 +12%',
            statBonus: { pDefRate: 0.22, mDefRate: 0.22, damageReduction: 0.1, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '포톤 배쉬 & 버스트',
            description: '빛의 방패로 적을 짓이기고 영거리에서 광자 에너지를 터뜨립니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 760,
            tier: ClassTier.LAST,
            icon: 'ShieldCheck',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.LASER_SHOOTER]: {
        learnedPassive: {
            name: '광학 렌즈 정렬',
            description: '[보유 효과] 물리/마법 명중률 +6%, 치명타 확률 +1.5%',
            statBonus: { accRate: 0.06, mAccRate: 0.06, critRate: 0.015 }
        },
        equippedPassive: {
            name: '고에너지 집광경',
            description: '[장착 효과] 마법 공격력 +22%, 치명타 피해 +25%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.22, critDmg: 25, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '하이퍼 레이저 캐논',
            description: '극도로 집중된 레이저 빔을 발사하여 일직선상의 목표를 관통합니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 900,
            tier: ClassTier.LAST,
            icon: 'Target',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.BEAM_CASTER]: {
        learnedPassive: {
            name: '광선 확산술',
            description: '[보유 효과] 마법 공격력 +2%, 지능 +6, 물리/마법 명중률 +6%',
            statBonus: { mAtkRate: 0.02, int: 6, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '프리즘 확산포',
            description: '[장착 효과] 마법 공격력 +20%, 광역 피해 증폭 +15%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.2, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '프리즘 빔 스톰',
            description: '프리즘을 통해 수백 갈래로 굴절된 빔을 사방으로 난사합니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 450, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Sparkles',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.ENERGY_MAGE]: {
        learnedPassive: {
            name: '순수 에너지학',
            description: '[보유 효과] 마력 +200, 마법 공격력 +2%, 물리/마법 명중률 +6%',
            statBonus: { maxMp: 200, mAtkRate: 0.02, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '에너지 장악장',
            description: '[장착 효과] 마법 공격력 +22%, 치명타 확률 +8%, 물리/마법 명중률 +12%',
            statBonus: { mAtkRate: 0.22, critRate: 0.08, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '양자 에너지 폭풍',
            description: '양자 단위의 에너지를 폭발시켜 전장에 광역 붕괴를 일으킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 630,
            powerRatio: 430, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '전격계'
        }
    },
    [CombatStyle.OVERDRIVER]: {
        learnedPassive: {
            name: '리미터 해제',
            description: '[보유 효과] 물리/마법 공격력 +2.5%, 치명타 피해 +8%, 물리/마법 명중률 +6%',
            statBonus: { pAtkRate: 0.025, mAtkRate: 0.025, critDmg: 8, accRate: 0.06, mAccRate: 0.06 }
        },
        equippedPassive: {
            name: '오버드라이브 가속',
            description: '[장착 효과] 공격력 +28%, 방어력 -8%, 물리/마법 명중률 +12%',
            statBonus: { pAtkRate: 0.28, mAtkRate: 0.28, pDefRate: -0.08, accRate: 0.12, mAccRate: 0.12 }
        },
        equippedActive: {
            name: '한계돌파 오버드라이브 버스트',
            description: '신체 리미터를 해제하고 모든 에너지를 한순간에 쏟아붓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 705,
            powerRatio: 880,
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '신체강화계'
        }
    },
    // 4차
    [CombatStyle.PLASMA_LORD]: {
        learnedPassive: {
            name: '플라즈마의 군주',
            description: '[보유 효과] 물리 공격력 +3.5%, 민첩 +15, 명중률 +10%',
            statBonus: { pAtkRate: 0.035, agi: 15, accRate: 0.10 }
        },
        equippedPassive: {
            name: '궁극 플라즈마 제어',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 피해 +45%, 명중률 +20%',
            statBonus: { pAtkRate: 0.45, critDmg: 45, accRate: 0.20 }
        },
        equippedActive: {
            name: '초신성 플라즈마 대절단',
            description: '초신성의 열기를 품은 궁극의 플라즈마 참격으로 적을 원자 단위로 분해합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2450,
            tier: ClassTier.FINAL,
            icon: 'Zap',
            shinryokuType: '태양계'
        }
    },
    [CombatStyle.LASER_MASTER]: {
        learnedPassive: {
            name: '광선학의 정점',
            description: '[보유 효과] 물리/마법 명중률 +10%, 마법 공격력 +3.5%, 치명타 +3%',
            statBonus: { accRate: 0.10, mAccRate: 0.10, mAtkRate: 0.035, critRate: 0.03 }
        },
        equippedPassive: {
            name: '반물질 레이저 광선',
            description: '[장착 효과] 마법 공격력 +48%, 치명타 피해 +55%, 물리/마법 명중률 +20%',
            statBonus: { mAtkRate: 0.48, critDmg: 55, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '반물질 궤도 레이저 섬멸포',
            description: '위성 궤도에서 내리꽂히는 반물질 레이저로 목표 지역과 적을 소멸시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'single',
            mpCost: 2450,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Target',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.BEAM_LORD]: {
        learnedPassive: {
            name: '빔 로드의 권능',
            description: '[보유 효과] 마법 공격력 +4%, 지능 +16, 물리/마법 명중률 +10%',
            statBonus: { mAtkRate: 0.04, int: 16, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '절대 빔 매트릭스',
            description: '[장착 효과] 마법 공격력 +45%, 광역 피해 증폭 +30%, 물리/마법 명중률 +20%',
            statBonus: { mAtkRate: 0.45, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '천멸 옴니 빔 카타스트로피',
            description: '전 공간을 채우는 전방위 빔 격자망을 전개해 모든 적을 일시에 증발시킵니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2250, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '광휘계'
        }
    },
    [CombatStyle.ENERGY_MASTER]: {
        learnedPassive: {
            name: '에너지의 지배',
            description: '[보유 효과] 마법 공격력 +4%, 마나 +400, 물리/마법 명중률 +10%',
            statBonus: { mAtkRate: 0.04, maxMp: 400, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '무한 에너지 생성로',
            description: '[장착 효과] 마법 공격력 +50%, 치명타 확률 +15%, 물리/마법 명중률 +20%',
            statBonus: { mAtkRate: 0.5, critRate: 0.15, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '빅뱅 에너지 폭쇄',
            description: '우주 탄생의 에너지를 응축 폭발시켜 전 차원을 뒤흔듭니다.',
            type: SkillType.MAGIC,
            targetType: 'aoe',
            mpCost: 2550,
            powerRatio: 2200, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '태양계'
        }
    },
    [CombatStyle.OVERLORD]: {
        learnedPassive: {
            name: '오버로드의 절대패기',
            description: '[보유 효과] 전체 공격력 +4%, 모든 스탯 +10, 물리/마법 명중률 +10%',
            statBonus: { pAtkRate: 0.04, mAtkRate: 0.04, str: 10, int: 10, agi: 10, wis: 10, def: 10, ctrl: 10, accRate: 0.10, mAccRate: 0.10 }
        },
        equippedPassive: {
            name: '군림하는 절대자',
            description: '[장착 효과] 공격력 +55%, 치명타 확률 +15%, 치명타 피해 +50%, 물리/마법 명중률 +20%',
            statBonus: { pAtkRate: 0.55, mAtkRate: 0.55, critRate: 0.15, critDmg: 50, accRate: 0.20, mAccRate: 0.20 }
        },
        equippedActive: {
            name: '절대 지배 오버로드 제네시스',
            description: '차원의 정점에 선 오버로드의 힘으로 적의 존재 자체를 영구 소거합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2500,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '신체강화계'
        }
    }
};
