import { Skill, SkillType, ClassTier, SkillTarget } from '../types';

/**
 * 파이널 클래스 공격 스킬용 버프/디버프 헬퍼 및 보조 함수 모듈
 */

// 파이널 클래스 공격 스킬의 버프 한도 계산 (일반 버프의 30% 비율, AOE는 15% 비율, 레벨 비례 보너스 지원)
export const getAttackSkillBuffCap = (targetType: SkillTarget, bonusSteps: number = 0): number => {
    const isAoE = targetType === 'aoe' || (targetType as string) === 'all';
    return isAoE ? Math.round(15 + bonusSteps * 1.5) : (30 + bonusSteps * 3);
};

// 파이널 클래스 공격 스킬의 디버프 한도 계산 (단일 20%, 광역 10%, 레벨 비례 보너스 지원, 최대 90% 제한)
export const getAttackSkillDebuffCap = (targetType: SkillTarget, bonusSteps: number = 0): number => {
    const isAoE = targetType === 'aoe' || (targetType as string) === 'all';
    const rawVal = isAoE ? Math.round(10 + bonusSteps * 1) : (20 + bonusSteps * 2);
    return Math.min(90, rawVal);
};

// 스킬이 버프가 부가된 물리/마법 공격 스킬인지 확인 (물리/마법 공격 스킬과 버프 효과가 섞여있는 복합 스킬만 해당)
export const isAttackSkillWithBuff = (skill?: Partial<Skill> | null): boolean => {
    if (!skill) return false;
    if ((skill as any).isBondSkill) return false; // 인연 스킬은 전용 융합 로직을 따름

    // 0. 순수 버프, 회복, 디버프, 패시브, 소환 스킬 등 공격이 아닌 스킬은 무조건 제외
    const rawType = String(skill.type || '');
    const upperType = rawType.toUpperCase();
    if (
        skill.type === SkillType.BUFF || 
        skill.type === SkillType.HEAL || 
        skill.type === SkillType.DEBUFF || 
        skill.type === SkillType.PASSIVE ||
        skill.type === SkillType.SUMMON ||
        skill.type === SkillType.CLONE ||
        upperType === 'BUFF' ||
        upperType === 'HEAL' ||
        upperType === 'DEBUFF' ||
        upperType === 'PASSIVE' ||
        rawType === '버프' ||
        rawType === '회복' ||
        rawType === '디버프' ||
        rawType === '패시브'
    ) {
        return false;
    }

    // 1. 공격 스킬 판별: 반드시 물리 공격 또는 마법 공격 스킬이어야 함
    const isAttackType = skill.type === SkillType.PHYSICAL || 
                         skill.type === SkillType.MAGIC || 
                         upperType.includes('PHYSICAL') || 
                         upperType.includes('MAGIC') || 
                         rawType.includes('물리') || 
                         rawType.includes('마법');
    if (!isAttackType) return false;

    // 공격력(위력) 또는 공격 피해 공식이 실제로 존재하는지 확인
    const formulaStr = String(skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '');
    const hasAttackFormula = formulaStr.includes('P.Atk') || 
                             formulaStr.includes('M.Atk') || 
                             formulaStr.includes('Atk') ||
                             formulaStr.includes('공격');
    const hasPower = (typeof skill.powerRatio === 'number' && skill.powerRatio > 0) || hasAttackFormula;
    if (!hasPower) return false;

    // 2. 부가 버프 존재 판별 (아군 대상 버프 효과가 함께 섞여 있는지 확인)
    const hasBuffEffects = Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0;
    const isExplicitBuffAttack = !!(skill as any).isAttackWithBuff || (skill as any).attackSkillEffectType === 'buff' || (skill.finalEnhanceData?.addedEffect?.type === 'buff') || !!(skill.finalEnhanceData?.addedBuffSlot);
    const hasBuffInFormula = formulaStr.includes('[버프:') || 
                             formulaStr.includes('BUFF:') ||
                             formulaStr.includes('추가 버프:') ||
                             formulaStr.includes('[추가 버프:') ||
                             (formulaStr.includes('버프') && (
                                 formulaStr.includes('STR') || 
                                 formulaStr.includes('INT') || 
                                 formulaStr.includes('DEX') || 
                                 formulaStr.includes('LUK') || 
                                 formulaStr.includes('VIT') || 
                                 formulaStr.includes('WIS') || 
                                 formulaStr.includes('DEF') || 
                                 formulaStr.includes('AGI') || 
                                 formulaStr.includes('CTRL') || 
                                 formulaStr.includes('P.Atk') || 
                                 formulaStr.includes('M.Atk') || 
                                 formulaStr.includes('P.Def') || 
                                 formulaStr.includes('M.Def') || 
                                 formulaStr.includes('Acc') || 
                                 formulaStr.includes('MAcc') || 
                                 formulaStr.includes('Eva') || 
                                 formulaStr.includes('MEva') || 
                                 formulaStr.includes('피해') || 
                                 formulaStr.includes('저항') || 
                                 formulaStr.includes('회복')
                             ));

    return hasBuffEffects || isExplicitBuffAttack || hasBuffInFormula;
};

// 공식 문자열([버프: ...] 또는 [추가 버프: ...])에서 누락된 buffEffects 배열을 복원/추출하는 헬퍼 함수
export const extractAttackSkillBuffEffectsFromFormula = (formulaStr?: string, skill?: Partial<Skill> | null): any[] => {
    const results: any[] = [];

    // 0. finalEnhanceData에 명시된 버프 슬롯 처리
    if (skill?.finalEnhanceData?.addedEffect?.type === 'buff') {
        const { stat, value } = skill.finalEnhanceData.addedEffect;
        if (stat === '체력 회복' || stat === 'HP 회복' || stat === 'HP') {
            results.push({ type: 'HP_RECOV', value: 15 });
        } else if (stat === '마나 회복' || stat === 'MP 회복' || stat === 'MP') {
            results.push({ type: 'MP_RECOV', value: 15 });
        } else {
            results.push({ type: 'STAT_BOOST', targetStat: stat, value: value || 15 });
        }
    }
    if (skill?.finalEnhanceData?.addedBuffSlot) {
        const { stat, value } = skill.finalEnhanceData.addedBuffSlot;
        if (stat === '체력 회복' || stat === 'HP 회복' || stat === 'HP') {
            results.push({ type: 'HP_RECOV', value: 15 });
        } else if (stat === '마나 회복' || stat === 'MP 회복' || stat === 'MP') {
            results.push({ type: 'MP_RECOV', value: 15 });
        } else {
            results.push({ type: 'STAT_BOOST', targetStat: stat, value: value || 15 });
        }
    }

    if (!formulaStr) return results;

    const buffMatches = Array.from(formulaStr.matchAll(/\[(?:버프|추가 버프):\s*([^\]]+)\]/gi));
    for (const match of buffMatches) {
        const content = match[1].trim();
        const parts = content.split(/,\s*/);

        for (const part of parts) {
            const cleanPart = part.replace(/\(Lv당\+[^\)]*\)/gi, '').replace(/\([^\)]*비례[^\)]*\)/gi, '').trim();
            if (!cleanPart) continue;

            // 1. HP / 체력 회복
            const hpMatch = cleanPart.match(/(?:HP|체력)\s*(?:회복|\+?\s*(\d+(?:\.\d+)?)%\s*회복|\s*(\d+(?:\.\d+)?)%)/i);
            if (hpMatch) {
                const val = parseFloat(hpMatch[1] || hpMatch[2] || '15');
                if (!results.some(r => r.type === 'HP_RECOV')) {
                    results.push({ type: 'HP_RECOV', value: isNaN(val) ? 15 : val });
                }
                continue;
            }
            // 2. MP / 마나 회복
            const mpMatch = cleanPart.match(/(?:MP|마나)\s*(?:회복|\+?\s*(\d+(?:\.\d+)?)%\s*회복|\s*(\d+(?:\.\d+)?)%)/i);
            if (mpMatch) {
                const val = parseFloat(mpMatch[1] || mpMatch[2] || '15');
                if (!results.some(r => r.type === 'MP_RECOV')) {
                    results.push({ type: 'MP_RECOV', value: isNaN(val) ? 15 : val });
                }
                continue;
            }
            // 3. 속성 피해
            const elDmgMatch = cleanPart.match(/(.+?)\s*피해\s*\+?\s*(\d+(?:\.\d+)?)%/i);
            if (elDmgMatch) {
                results.push({ type: 'ELEMENTAL_DMG_BOOST', targetElement: elDmgMatch[1].trim(), value: parseFloat(elDmgMatch[2]) });
                continue;
            }
            // 4. 속성 저항
            const elResMatch = cleanPart.match(/(.+?)\s*저항\s*\+?\s*(\d+(?:\.\d+)?)%/i);
            if (elResMatch) {
                results.push({ type: 'ELEMENTAL_RES_BOOST', targetElement: elResMatch[1].trim(), value: parseFloat(elResMatch[2]) });
                continue;
            }
            // 5. 일반 스탯 상승
            const statMatch = cleanPart.match(/([A-Za-z.가-힣\s]+?)\s*\+?\s*(\d+(?:\.\d+)?)%/);
            if (statMatch) {
                const statName = statMatch[1].trim();
                if (!results.some(r => r.type === 'STAT_BOOST' && r.targetStat === statName)) {
                    results.push({ type: 'STAT_BOOST', targetStat: statName, value: parseFloat(statMatch[2]) });
                }
            }
        }
    }
    return results;
};

// 단일 타격 + 아군 버프가 섞인 스킬로서 전투 시 이중 타겟(적 공격 대상 + 아군 버프 대상) 지정이 필요한지 판별
export const requiresDualTargetSelection = (skill?: Partial<Skill> | null): boolean => {
    if (!skill) return false;
    if ((skill as any).isBondSkill) return false;
    const targetType = String(skill.targetType || 'single');
    // 광역 스킬이나 자신 대상 스킬은 개별 대상을 둘 다 고르는 이중 타겟 모달이 불필요
    if (targetType === 'aoe' || targetType === 'all' || targetType === 'self') return false;

    // 오직 물리/마법 공격 스킬과 버프 스킬이 섞여있는 복합 스킬만 이중 타겟 모달 필요
    return isAttackSkillWithBuff(skill);
};

// 공격 스킬의 부가 버프 개수에 따른 추가 마나 소모량 계산 (버프 슬롯당 MP 소모량 극대화: 슬롯당 +150% MP)
export const calculateAttackSkillMpCost = (baseMpCost: number, buffEffectCount: number): number => {
    if (buffEffectCount <= 0) return baseMpCost;
    const mpMultiplier = 1 + (buffEffectCount * 1.5);
    return Math.floor(baseMpCost * mpMultiplier);
};

// 공격 스킬 부가 버프의 스킬 레벨당 상승 수치 (0.5%)
export const ATTACK_SKILL_BUFF_LEVEL_GROWTH = 0.5;

// 버프가 부가된 공격 스킬의 레벨당 공격력 계수 (파이널 클래스 기준 기존 100%의 절반인 50%)
export const ATTACK_SKILL_WITH_BUFF_DAMAGE_SCALE = 50.0;

// 공격 스킬에 부가 가능한 스탯 디버프 목록 및 순수 한글 명칭
export const ATTACK_DEBUFF_OPTIONS = [
    { key: 'P.Atk', name: '물리 공격력 감소' },
    { key: 'M.Atk', name: '마법 공격력 감소' },
    { key: 'P.Def', name: '물리 방어력 감소' },
    { key: 'M.Def', name: '마법 방어력 감소' },
    { key: 'Acc', name: '물리 명중률 감소' },
    { key: 'MAcc', name: '마법 명중률 감소' },
    { key: 'Eva', name: '물리 회피율 감소' },
    { key: 'MEva', name: '마법 회피율 감소' },
];

export const getAttackDebuffKoreanName = (key: string): string => {
    const found = ATTACK_DEBUFF_OPTIONS.find(o => o.key === key);
    return found ? found.name : key;
};

// 스킬이 디버프가 부가된 물리/마법 공격 스킬인지 확인
export const isAttackSkillWithDebuff = (skill?: Partial<Skill> | null): boolean => {
    if (!skill) return false;
    const formulaStr = String(skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '');
    return formulaStr.includes('디버프') || formulaStr.includes('Debuff') || !!(skill as any).isAttackWithDebuff || !!(skill as any).debuffStat;
};

// 공격 스킬 내 버프 효과 목록 요약 문자열 생성
export const formatAttackSkillBuffSummary = (buffEffects: any[]): string => {
    if (!buffEffects || buffEffects.length === 0) return '';
    const parts: string[] = [];

    buffEffects.forEach(ef => {
        if (ef.type === 'STAT_BOOST') {
            const statName = ef.targetStat || '스탯';
            parts.push(`${statName} +${ef.value}%(Lv당+0.5%)`);
        } else if (ef.type === 'ELEMENTAL_DMG_BOOST') {
            parts.push(`${ef.targetElement || '속성'} 피해 +${ef.value}%(Lv당+0.5%)`);
        } else if (ef.type === 'ELEMENTAL_RES_BOOST') {
            parts.push(`${ef.targetElement || '속성'} 저항 +${ef.value}%(Lv당+0.5%)`);
        } else if (ef.type === 'HP_RECOV') {
            parts.push(`HP +${ef.value}% 회복(WIS·INT합산x4 비례, Lv당+0.5%)`);
        } else if (ef.type === 'MP_RECOV') {
            parts.push(`MP +${ef.value}% 회복(WIS·INT합산 비례, Lv당+0.5%)`);
        }
    });

    return parts.length > 0 ? parts.join(', ') : '';
};

