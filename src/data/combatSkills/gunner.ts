import { CombatStyle, SkillType, ClassTier } from '../../types';
import { StyleSkillSet } from '../../combatStyleSkills';

export const GUNNER_SKILLS: Partial<Record<CombatStyle, StyleSkillSet>> = {
    // 1차
    [CombatStyle.GUNNER]: {
        learnedPassive: {
            name: '사격 제원 계산',
            description: '[보유 효과] 명중률 +4%, 물리 공격력 +1%',
            statBonus: { accRate: 0.04, pAtkRate: 0.01 }
        },
        equippedPassive: {
            name: '정밀 격발',
            description: '[장착 효과] 물리 공격력 +7%, 치명타 확률 +4%, 명중률 +8%',
            statBonus: { pAtkRate: 0.07, critRate: 0.04, accRate: 0.08 }
        },
        equippedActive: {
            name: '헤드샷 격발',
            description: '적의 약점을 조준하여 강력한 탄환을 발사합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 45,
            powerRatio: 155,
            tier: ClassTier.FIRST,
            icon: 'Crosshair',
            shinryokuType: '강철계'
        }
    },
    // 2차
    [CombatStyle.GUNSLINGER]: {
        learnedPassive: {
            name: '퀵 드로우',
            description: '[보유 효과] 민첩(AGI) +5, 명중률 +6%',
            statBonus: { agi: 5, accRate: 0.06 }
        },
        equippedPassive: {
            name: '스피드 로딩',
            description: '[장착 효과] 물리 공격력 +12%, 치명타 피해 +15%, 명중률 +12%',
            statBonus: { pAtkRate: 0.12, critDmg: 15, accRate: 0.12 }
        },
        equippedActive: {
            name: '패닝 난사',
            description: '리볼버 공이를 손바닥으로 고속 타격하며 폭풍 같은 연속 사격을 쏟아냅니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 200,
            powerRatio: 245,
            tier: ClassTier.SECOND,
            icon: 'Zap',
            shinryokuType: '무기강화계'
        }
    },
    [CombatStyle.HEAVY_TROOPER]: {
        learnedPassive: {
            name: '중화기 파지법',
            description: '[보유 효과] 물리 공격력 +1.5%, 물리 방어력 +1%, 명중률 +6%',
            statBonus: { pAtkRate: 0.015, pDefRate: 0.01, accRate: 0.06 }
        },
        equippedPassive: {
            name: '개틀링 탄막',
            description: '[장착 효과] 물리 공격력 +14%, 방어력 +5%, 명중률 +12%',
            statBonus: { pAtkRate: 0.14, pDefRate: 0.05, accRate: 0.12 }
        },
        equippedActive: {
            name: '개틀링 광역 난사',
            description: '헤비 머신건으로 전방의 모든 적에게 총알비를 쏟아붓습니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 210,
            powerRatio: 135, // 2차 AoE (100~150)
            tier: ClassTier.SECOND,
            icon: 'Bomb',
            shinryokuType: '강철계'
        }
    },
    // 3차
    [CombatStyle.DUAL_SHOOTER]: {
        learnedPassive: {
            name: '쌍권총 건카타',
            description: '[보유 효과] 민첩 +8, 명중률 +8%',
            statBonus: { agi: 8, accRate: 0.08 }
        },
        equippedPassive: {
            name: '아크로바틱 사격술',
            description: '[장착 효과] 민첩 +20%, 물리 공격력 +18%, 명중률 +16%',
            statBonus: { agiRate: 0.2, pAtkRate: 0.18, accRate: 0.16 }
        },
        equippedActive: {
            name: '건카타 블릿 스톰',
            description: '회전하며 양손의 쌍권총으로 춤추듯 적의 급소를 난타합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 600,
            powerRatio: 800,
            tier: ClassTier.LAST,
            icon: 'Zap',
            shinryokuType: '질풍계'
        }
    },
    [CombatStyle.GUN_SNIPER]: {
        learnedPassive: {
            name: '대구경 저격술',
            description: '[보유 효과] 치명타 확률 +2%, 치명타 피해 +6%, 명중률 +10%',
            statBonus: { critRate: 0.02, critDmg: 6, accRate: 0.10 }
        },
        equippedPassive: {
            name: '헤비 스나이핑',
            description: '[장착 효과] 물리 공격력 +22%, 치명타 피해 +30%, 명중률 +20%',
            statBonus: { pAtkRate: 0.22, critDmg: 30, accRate: 0.20 }
        },
        equippedActive: {
            name: '대물 저격포 발사',
            description: '장갑을 뚫는 초장거리 대구경 탄환으로 목표를 일격에 파괴합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 675,
            powerRatio: 920,
            tier: ClassTier.LAST,
            icon: 'Crosshair',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.ARTILLERY]: {
        learnedPassive: {
            name: '곡사 포격 제원',
            description: '[보유 효과] 물리 공격력 +2%, 명중률 +8%',
            statBonus: { pAtkRate: 0.02, accRate: 0.08 }
        },
        equippedPassive: {
            name: '화력 지원 사격',
            description: '[장착 효과] 물리 공격력 +25%, 치명타 피해 +15%, 명중률 +16%',
            statBonus: { pAtkRate: 0.25, critDmg: 15, accRate: 0.16 }
        },
        equippedActive: {
            name: '대구경 곡사포 일제 사격',
            description: '거대한 야포로 포탄을 발사하여 광범위한 지역을 잿더미로 만듭니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 675,
            powerRatio: 450, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Bomb',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.DEMOLITIONIST]: {
        learnedPassive: {
            name: '유탄 운용술',
            description: '[보유 효과] 물리 공격력 +2%, 화염 속성 공격력 +2%, 명중률 +8%',
            statBonus: { pAtkRate: 0.02, accRate: 0.08 }
        },
        equippedPassive: {
            name: '고폭탄 적재',
            description: '[장착 효과] 물리 공격력 +22%, 화염 속성 피해 +15%, 명중률 +16%',
            statBonus: { pAtkRate: 0.22, accRate: 0.16 }
        },
        equippedActive: {
            name: '클러스터 유탄 폭격',
            description: '공중에서 분열하는 확산 유탄을 발사해 넓은 전장을 초토화합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 630,
            powerRatio: 480, // 3차 AoE (300~500)
            tier: ClassTier.LAST,
            icon: 'Flame',
            shinryokuType: '화염계'
        }
    },
    // 4차
    [CombatStyle.GUN_BLADER]: {
        learnedPassive: {
            name: '건블레이드의 신기',
            description: '[보유 효과] 물리 공격력 +3.5%, 민첩 +15, 명중률 +12%',
            statBonus: { pAtkRate: 0.035, agi: 15, accRate: 0.12 }
        },
        equippedPassive: {
            name: '사격과 검무의 융합',
            description: '[장착 효과] 물리 공격력 +45%, 민첩 +35%, 치명타 +15%, 명중률 +25%',
            statBonus: { pAtkRate: 0.45, agiRate: 0.35, critRate: 0.15, accRate: 0.25 }
        },
        equippedActive: {
            name: '환영 건블레이드 난무',
            description: '총검을 휘두르며 사격과 참격을 동시에 퍼붓는 궁극의 화력을 선보입니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2300,
            powerRatio: 2400,
            tier: ClassTier.FINAL,
            icon: 'Swords',
            shinryokuType: '무기강화계'
        }
    },
    [CombatStyle.DEADEYE]: {
        learnedPassive: {
            name: '필살의 시선',
            description: '[보유 효과] 명중률 +15%, 치명타 확률 +3%, 물리 공격력 +3%',
            statBonus: { accRate: 0.15, critRate: 0.03, pAtkRate: 0.03 }
        },
        equippedPassive: {
            name: '데드아이 포커스',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 피해 +55%, 명중률 +30%',
            statBonus: { pAtkRate: 0.45, critDmg: 55, accRate: 0.30 }
        },
        equippedActive: {
            name: '라스트 불릿 아포칼립스',
            description: '세상이 멈춘 듯한 집중 상태에서 적의 심장을 완벽하게 꿰뚫는 필살탄을 발사합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: 2400,
            powerRatio: 2500,
            tier: ClassTier.FINAL,
            icon: 'Target',
            shinryokuType: '강철계'
        }
    },
    [CombatStyle.ARSENAL]: {
        learnedPassive: {
            name: '이동식 무기고',
            description: '[보유 효과] 물리 공격력 +4%, 체력 +300, 명중률 +12%',
            statBonus: { pAtkRate: 0.04, maxHp: 300, accRate: 0.12 }
        },
        equippedPassive: {
            name: '전탄 발사 매트릭스',
            description: '[장착 효과] 물리 공격력 +45%, 치명타 피해 +30%, 명중률 +25%',
            statBonus: { pAtkRate: 0.45, critDmg: 30, accRate: 0.25 }
        },
        equippedActive: {
            name: '전탄 발사 전멸 포격',
            description: '장착된 모든 중화기와 미사일을 일제히 발사하여 전 영역을 궤멸시킵니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2500,
            powerRatio: 2200, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Crown',
            shinryokuType: '화염계'
        }
    },
    [CombatStyle.DEMOLISHER]: {
        learnedPassive: {
            name: '궁극의 섬멸 폭파',
            description: '[보유 효과] 물리 공격력 +3.5%, 화염 속성 피해 +3%, 명중률 +12%',
            statBonus: { pAtkRate: 0.035, accRate: 0.12 }
        },
        equippedPassive: {
            name: '행성급 파쇄 탄두',
            description: '[장착 효과] 물리 공격력 +42%, 화염 속성 피해 +35%, 명중률 +25%',
            statBonus: { pAtkRate: 0.42, accRate: 0.25 }
        },
        equippedActive: {
            name: '종말 섬멸 벙커버스터',
            description: '모든 요새와 군대를 통째로 기화시키는 초거대 탄두를 투하합니다.',
            type: SkillType.PHYSICAL,
            targetType: 'aoe',
            mpCost: 2550,
            powerRatio: 2250, // 4차 AoE (2000~2500)
            tier: ClassTier.FINAL,
            icon: 'Bomb',
            shinryokuType: '화염계'
        }
    }
};
