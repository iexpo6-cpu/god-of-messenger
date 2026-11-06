
import { ClassTier, SkillType, SkillTarget, WeaponType, BuffConfig } from '../types';
import { getTierBuffScale } from './skillBuffScaleService';

export const ATTACK_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.5,
    [ClassTier.FIRST]: 1.0,
    [ClassTier.SECOND]: 5.0,
    [ClassTier.LAST]: 20.0,
    [ClassTier.FINAL]: 100.0,
};

export const PASSIVE_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.1,
    [ClassTier.FIRST]: 0.1,
    [ClassTier.SECOND]: 0.2,
    [ClassTier.LAST]: 0.5,
    [ClassTier.FINAL]: 1.0,
};

export const PASSIVE_LABEL_MAP: Record<string, string> = {
    'CritChance': '치명타율',
    'CritDamage': '치명타 피해량',
    'CritDmgResist': '치명타 피해 감소',
    'EleAtk': '속성 피해',
    'EleRes': '속성 저항',
    'StatusResist': '상태이상 저항',
    'ManaShield': '마나 쉴드',
    'Acc': '물리명중률',
    'MAcc': '마법명중률',
    'Eva': '물리회피율',
    'MEva': '마법회피율'
};

/**
 * [부활 회복 비율 상한선]
 * 라스트 클래스: 단일 최대 50%, 광역 최대 25%
 * 파이널 클래스: 단일 최대 100%, 광역 최대 50%
 */
export const getResurrectionCap = (tier: string | ClassTier, isAoE: boolean = false): number => {
    const tierStr = String(tier || '').toUpperCase();
    if (tierStr.includes('FINAL') || tierStr.includes('4') || tierStr.includes('파이널')) {
        return isAoE ? 50 : 100;
    }
    return isAoE ? 25 : 50;
};
export const getBaseResurrectionRecovery = getResurrectionCap;

/**
 * 스킬의 effectFormula를 생성하는 공통 서비스
 */
export const generateEffectFormula = (params: {
    type: SkillType;
    tier: ClassTier;
    powerRatio?: number;
    targetType?: SkillTarget;
    ailment?: string; // 공격 스킬의 부가 상태이상
    // 버프 관련
    buffEffects?: BuffConfig[];
    // 디버프 관련
    debuffSubType?: 'STAT' | 'AILMENT' | 'BOTH';
    debuffStatType?: string;
    debuffStatValue?: number;
    debuffAilments?: string[];
    // 패시브 관련
    passiveCategory?: 'STAT' | 'COMBAT' | 'SPECIAL';
    passiveTarget?: string;
    passiveHasCondition?: boolean;
    passiveWeaponCondition?: WeaponType;
    selectedPassiveElement?: string;
    specialPassiveCode?: string;
    // 성공률 계산을 위한 참조 (선택적)
    successRate?: number;
}): string => {
    const { 
        type, tier, powerRatio = 100, targetType, ailment, 
        buffEffects = [], 
        debuffSubType, debuffStatType, debuffStatValue, debuffAilments = [],
        passiveCategory, passiveTarget, passiveHasCondition, passiveWeaponCondition, selectedPassiveElement, specialPassiveCode,
        successRate
    } = params;
    const tierStr = String(tier || '').toUpperCase();

    // 1. 패시브 스킬
    if (type === SkillType.PASSIVE) {
        if (passiveCategory === 'SPECIAL' && specialPassiveCode) {
            return `PASSIVE: [SPECIAL:${specialPassiveCode}]`;
        }

        const isCond = passiveHasCondition;
        const bonusMult = isCond ? 1.2 : 1.0;
        const isAccOrEva = passiveTarget && ['Acc', 'MAcc', 'Eva', 'MEva', '물리명중률', '마법명중률', '물리회피율', '마법회피율'].includes(passiveTarget);
        const targetMult = isAccOrEva ? 1.5 : 1.0;
        let base = 0;
        const scale = PASSIVE_SCALING[tier] || 0.1;

        if (passiveCategory === 'STAT') {
            if (tier === ClassTier.FIRST) base = 5;
            else if (tier === ClassTier.SECOND) base = 10;
            else if (tier === ClassTier.LAST) base = 20;
            else if (tier === ClassTier.FINAL) base = 30;
        } else {
            if (tier === ClassTier.SECOND) base = 5;
            else if (tier === ClassTier.LAST) base = 10;
            else if (tier === ClassTier.FINAL) base = 20;
        }

        base = Math.floor(base * bonusMult * targetMult);
        const finalScale = parseFloat((scale * bonusMult * targetMult).toFixed(2));
        const condStr = passiveHasCondition ? ` [COND: ${passiveWeaponCondition}]` : '';
        
        let targetLabel = passiveCategory === 'COMBAT' ? (PASSIVE_LABEL_MAP[passiveTarget || ''] || passiveTarget) : passiveTarget;
        if (passiveTarget === 'EleAtk') targetLabel = `${selectedPassiveElement} 피해`;
        if (passiveTarget === 'EleRes') targetLabel = `${selectedPassiveElement} 저항`;
        if (passiveTarget === 'ManaShield') return `PASSIVE: [MANA_SHIELD] ${base}% (+${finalScale}% per Lv)`;

        return `PASSIVE: [${targetLabel}] +${base}% (+${finalScale}% per Lv)${condStr}`;
    }

    // 2. 디버프 스킬
    if (type === SkillType.DEBUFF) {
        const parts = [];
        if (debuffSubType === 'STAT' || debuffSubType === 'BOTH') {
            parts.push(`[${debuffStatType} -${debuffStatValue}%]`);
        }
        if (debuffSubType === 'AILMENT' || debuffSubType === 'BOTH') {
            if (debuffAilments.length > 0) parts.push(`[${debuffAilments.join(', ')}]`);
        }
        const tierStr = String(tier || '').toUpperCase();
        let turns = 2;
        if (tierStr.includes('FINAL') || tierStr.includes('4') || tierStr.includes('파이널')) turns = 5;
        else if (tierStr.includes('LAST') || tierStr.includes('3') || tierStr.includes('라스트')) turns = 4;
        else if (tierStr.includes('SECOND') || tierStr.includes('2') || tierStr.includes('세컨드')) turns = 3;

        const rateStr = successRate !== undefined ? ` (성공률: ~${successRate}%)` : '';
        return `Debuff: ${parts.join(' ')} (${turns}턴)${rateStr}`;
    }

    // 3. 버프 스킬
    if (type === SkillType.BUFF) {
        const scaleVal = getTierBuffScale(tier);

        const parts = buffEffects.map(ef => {
            if (ef.type === 'STAT_BOOST') return `${ef.targetStat} ${ef.value}% 증가(Lv당+${scaleVal}%)`;
            if (ef.type === 'ELEMENTAL_DMG_BOOST') return `${ef.targetElement || '속성'} 피해 ${ef.value}% 증가(Lv당+${scaleVal}%)`;
            if (ef.type === 'ELEMENTAL_RES_BOOST') return `${ef.targetElement || '속성'} 저항 ${ef.value}% 증가(Lv당+${scaleVal}%)`;
            if (ef.type === 'HP_RECOV') return `HP +${ef.value}% 회복(WIS·INT합산x4 비례, Lv당+${scaleVal}%)`;
            if (ef.type === 'MP_RECOV') return `MP +${ef.value}% 회복(WIS·INT합산 비례, Lv당+${scaleVal}%)`;
            if (ef.type === 'CLEANSE') return `상태이상 해제(${ef.ailments?.join(',') || '없음'})`;
            if (ef.type === 'RESURRECTION') return `RESURRECT ${ef.value}%`;
            if (ef.type === 'MANA_SHIELD') return `MANA_SHIELD ${ef.value}%`;
            return '';
        });
        let turns = 2;
        if (tierStr.includes('FINAL') || tierStr.includes('4') || tierStr.includes('파이널')) turns = 5;
        else if (tierStr.includes('LAST') || tierStr.includes('3') || tierStr.includes('라스트')) turns = 4;
        else if (tierStr.includes('SECOND') || tierStr.includes('2') || tierStr.includes('세컨드')) turns = 3;

        const durationText = (buffEffects.some(ef => ef.type === 'RESURRECTION')) ? '' : ` (${turns}턴)`;
        const rateStr = successRate !== undefined ? ` [성공률: ${successRate}%]` : '';
        return `${parts.join(', ')}${durationText}${rateStr}`;
    }

    // 4. 공격 스킬 (물리/마법)
    const mainStatLabel = type === SkillType.PHYSICAL ? 'P.Atk' : 
                        type === SkillType.MAGIC ? 'M.Atk' : 'Atk';

    const scale = ATTACK_SCALING[tier] || 1.0;
    const baseFormula = `(${mainStatLabel} * (${powerRatio} + (Lv * ${scale}))%)`;
    
    if (ailment) return `${baseFormula} + [${ailment} 부여]`;
    return baseFormula;
};
