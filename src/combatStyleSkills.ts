import { CombatStyle, SkillType, SkillTarget, ClassTier } from './types';
import { SWORDSMAN_SKILLS } from './data/combatSkills/swordsman';
import { SPEARMAN_SKILLS } from './data/combatSkills/spearman';
import { BERSERKER_SKILLS } from './data/combatSkills/berserker';
import { BOXER_SKILLS } from './data/combatSkills/boxer';
import { ARCHER_SKILLS } from './data/combatSkills/archer';
import { ROGUE_SKILLS } from './data/combatSkills/rogue';
import { GUNNER_SKILLS } from './data/combatSkills/gunner';
import { MAGE_SKILLS } from './data/combatSkills/mage';
import { ENERGIZER_SKILLS } from './data/combatSkills/energizer';
import { SUMMONER_SKILLS } from './data/combatSkills/summoner';

export interface StyleLearnedPassive {
    name: string;
    description: string;
    statBonus?: {
        str?: number;
        int?: number;
        wis?: number;
        def?: number;
        agi?: number;
        ctrl?: number;
        maxHp?: number;
        maxMp?: number;
        pAtkRate?: number; // e.g. 0.01 = +1%
        mAtkRate?: number;
        pDefRate?: number;
        mDefRate?: number;
        critRate?: number; // e.g. 0.005 = +0.5%
        critDmg?: number;
        accRate?: number;
        mAccRate?: number;
        evaRate?: number;
        mEvaRate?: number;
        critDmgResist?: number;
    };
}

export interface StyleEquippedPassive {
    name: string;
    description: string;
    statBonus?: {
        str?: number;
        int?: number;
        wis?: number;
        def?: number;
        agi?: number;
        ctrl?: number;
        maxHp?: number;
        maxMp?: number;
        pAtkRate?: number;
        mAtkRate?: number;
        pDefRate?: number;
        mDefRate?: number;
        critRate?: number;
        critDmg?: number;
        agiRate?: number;
        accRate?: number;
        mAccRate?: number;
        evaRate?: number;
        mEvaRate?: number;
        critDmgResist?: number;
        hpAbsorbRate?: number;
        mpRegen?: number;
        damageReduction?: number;
    };
}

export interface StyleEquippedActive {
    name: string;
    description: string;
    type: SkillType;
    targetType: SkillTarget;
    mpCost: number;
    powerRatio: number; // e.g. 150 = 150%
    tier: ClassTier;
    effectFormula?: string;
    icon?: string;
    shinryokuType?: string;
}

export interface StyleSkillSet {
    learnedPassive: StyleLearnedPassive;
    equippedPassive: StyleEquippedPassive;
    equippedActive: StyleEquippedActive;
}

// 9대 루트 및 전직 계열별 스킬 데이터 통합
export const COMBAT_STYLE_SKILL_DATA: Partial<Record<CombatStyle, StyleSkillSet>> = {
    ...SWORDSMAN_SKILLS,
    ...SPEARMAN_SKILLS,
    ...BERSERKER_SKILLS,
    ...BOXER_SKILLS,
    ...ARCHER_SKILLS,
    ...ROGUE_SKILLS,
    ...GUNNER_SKILLS,
    ...MAGE_SKILLS,
    ...ENERGIZER_SKILLS,
    ...SUMMONER_SKILLS,
};

// 범용 fallback 생성 헬퍼 (누락된 세부 전직이 있을 경우 자동 생성)
export const getCombatStyleSkillSet = (style: CombatStyle, tier: number = 1): StyleSkillSet => {
    if (COMBAT_STYLE_SKILL_DATA[style]) {
        return COMBAT_STYLE_SKILL_DATA[style]!;
    }

    const tierBonusRate = tier === 1 ? 0.01 : tier === 2 ? 0.015 : tier === 3 ? 0.025 : 0.035;
    const tierStat = tier * 3;
    const equippedAtkRate = tier === 1 ? 0.06 : tier === 2 ? 0.12 : tier === 3 ? 0.22 : 0.40;
    const activePower = tier === 1 ? 140 : tier === 2 ? 250 : tier === 3 ? 750 : 2350;
    const activeMp = tier === 1 ? 40 : tier === 2 ? 190 : tier === 3 ? 630 : 2250;
    const classTier = tier === 1 ? ClassTier.FIRST : tier === 2 ? ClassTier.SECOND : tier === 3 ? ClassTier.LAST : ClassTier.FINAL;

    return {
        learnedPassive: {
            name: `${style}의 기초 연마`,
            description: `[보유 효과] 물리/마법 공격력 +${(tierBonusRate * 100).toFixed(1)}%, 주요 스탯 +${tierStat}`,
            statBonus: { pAtkRate: tierBonusRate, mAtkRate: tierBonusRate, str: tierStat, int: tierStat }
        },
        equippedPassive: {
            name: `${style}의 전투 태세`,
            description: `[장착 효과] 공격력 +${Math.round(equippedAtkRate * 100)}%, 치명타 확률 +${tier * 2}%`,
            statBonus: { pAtkRate: equippedAtkRate, mAtkRate: equippedAtkRate, critRate: tier * 0.02 }
        },
        equippedActive: {
            name: `${style} 특화 오의`,
            description: `${style}의 정수를 담은 강력한 일격으로 적을 제압합니다.`,
            type: SkillType.PHYSICAL,
            targetType: 'single',
            mpCost: activeMp,
            powerRatio: activePower,
            tier: classTier,
            icon: 'Sword'
        }
    };
};
