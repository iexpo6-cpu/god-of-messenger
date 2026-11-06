import { Skill, SkillType, ClassTier, Character, Companion, BuffConfig } from '../types';
import { PASSIVE_SCALING, ATTACK_SCALING, PASSIVE_STAT_TARGETS, PASSIVE_COMBAT_TARGETS } from '../components/SkillBook';

/**
 * 스킬이 구버전 형식인지 검사하는 함수
 */
export const isLegacySkillFormat = (skill: Skill): boolean => {
    if (!skill) return false;

    // 1. 패시브 스킬
    if (skill.type === SkillType.PASSIVE) {
        if (skill.effectFormula?.includes('SPECIAL')) return false;
        // passiveEffects 슬롯 배열이 없거나 비어있는 경우 구버전
        if (!skill.passiveEffects || skill.passiveEffects.length === 0) return true;
        return false;
    }

    // 2. 버프 스킬
    if (skill.type === SkillType.BUFF) {
        // buffEffects 슬롯 배열이 없거나 비어있는 경우 구버전
        if (!skill.buffEffects || skill.buffEffects.length === 0) return true;
        return false;
    }

    // 3. 디버프 스킬
    if (skill.type === SkillType.DEBUFF) {
        // debuffEffects 슬롯 배열이 없거나 요소에 type(STAT 또는 AILMENT)속성이 누락된 경우 구버전
        if (!skill.debuffEffects || skill.debuffEffects.length === 0) return true;
        const hasMissingType = skill.debuffEffects.some(ef => !ef.type);
        if (hasMissingType) return true;
        return false;
    }

    return false;
};

/**
 * 구버전 패시브/버프/디버프 스킬을 현재 다중 슬롯 구조로 자동으로 파싱 및 정제
 */
export const parseLegacySkillToCurrentFormat = (skill: Skill, activeTab: string = ClassTier.FIRST): Skill => {
    if (!skill) return skill;
    const updated = { ...skill };

    // 1. 패시브 스킬 최신화
    if (skill.type === SkillType.PASSIVE) {
        if (skill.effectFormula?.includes('SPECIAL')) {
            return skill;
        }

        // 이미 passiveEffects가 유효하게 구성되어 있다면 기존 설정 유지
        if (skill.passiveEffects && skill.passiveEffects.length > 0) {
            return {
                ...skill,
                powerRatio: skill.powerRatio || skill.passiveEffects.reduce((s, e) => s + (e.value || 0), 0)
            };
        }

        const parsedEffects: Array<{ category: 'STAT' | 'COMBAT'; target: string; value: number; element?: string }> = [];
        const formula = skill.effectFormula || '';

        // 정규식 매칭: [Target] +X%
        const regex = /\[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)%/g;
        let match;
        while ((match = regex.exec(formula)) !== null) {
            const rawTarget = match[1].trim();
            const val = parseFloat(match[2]);

            let category: 'STAT' | 'COMBAT' = 'STAT';
            let target = 'STR';
            let element: string | undefined = undefined;

            if (rawTarget.includes('피해') || rawTarget.includes('저항')) {
                category = 'COMBAT';
                if (rawTarget.includes('피해')) target = 'EleAtk';
                else target = 'EleRes';
                const elName = rawTarget.replace(' 피해', '').replace(' 저항', '').trim();
                if (elName) element = elName;
            } else if (PASSIVE_COMBAT_TARGETS.includes(rawTarget) || rawTarget === '마나 실드') {
                category = 'COMBAT';
                target = rawTarget === '마나 실드' ? 'ManaShield' : rawTarget;
            } else if (PASSIVE_STAT_TARGETS.includes(rawTarget)) {
                category = 'STAT';
                target = rawTarget;
            } else {
                category = 'STAT';
                target = 'STR';
            }

            parsedEffects.push({ category, target, value: Math.max(1, Math.round(val)), element });
        }

        if (parsedEffects.length === 0) {
            parsedEffects.push({ category: 'STAT', target: 'STR', value: skill.powerRatio || 5 });
        }

        updated.passiveEffects = parsedEffects;
        updated.powerRatio = parsedEffects.reduce((s, e) => s + (e.value || 0), 0);
    }

    // 2. 버프 스킬 최신화
    if (skill.type === SkillType.BUFF) {
        if (!skill.buffEffects || skill.buffEffects.length === 0) {
            const formula = skill.effectFormula || '';
            if (formula.includes('상태이상 해제') || formula.includes('CLEANSE')) {
                const match = formula.match(/상태이상\s*해제\(([^)]*)\)/);
                let ailments: string[] = [];
                if (match && match[1]) {
                    ailments = match[1].split(',').map(s => s.trim()).filter(Boolean);
                }
                if (ailments.length === 0) ailments = ['중독'];
                updated.buffEffects = [
                    { type: 'CLEANSE', ailments, value: 0 }
                ];
            } else if (formula.includes('HP') && (formula.includes('회복') || formula.includes('치유'))) {
                const match = formula.match(/(\d+)%/);
                const val = match ? parseInt(match[1]) : (skill.powerRatio || 10);
                updated.buffEffects = [
                    { type: 'HP_RECOV', value: val }
                ];
            } else if (formula.includes('MP') && formula.includes('회복')) {
                const match = formula.match(/(\d+)%/);
                const val = match ? parseInt(match[1]) : (skill.powerRatio || 10);
                updated.buffEffects = [
                    { type: 'MP_RECOV', value: val }
                ];
            } else if (formula.includes('마나 실드') || formula.includes('MANA_SHIELD')) {
                const match = formula.match(/(\d+)%/);
                const val = match ? parseInt(match[1]) : (skill.powerRatio || 10);
                updated.buffEffects = [
                    { type: 'MANA_SHIELD', value: val }
                ];
            } else if (formula.includes('RESURRECT') || formula.includes('부활')) {
                const match = formula.match(/(\d+)%/);
                const isAoE = (skill.targetType === 'aoe');
                const isFinal = String(skill.tier || '').toUpperCase().includes('FINAL') || String(skill.tier || '').toUpperCase().includes('파이널');
                const maxCap = isFinal ? (isAoE ? 50 : 100) : (isAoE ? 25 : 50);
                const val = match ? parseInt(match[1]) : (skill.powerRatio || maxCap);
                updated.buffEffects = [
                    { type: 'RESURRECTION', value: Math.min(val, maxCap) }
                ];
            } else {
                const defaultVal = skill.powerRatio || 10;
                let targetStat = 'STR';
                for (const st of ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP', 'Acc', 'MAcc', 'Eva', 'MEva']) {
                    if (formula.includes(st)) {
                        targetStat = st;
                        break;
                    }
                }
                const match = formula.match(/(\d+)%/);
                const val = match ? parseInt(match[1]) : defaultVal;
                updated.buffEffects = [
                    { type: 'STAT_BOOST', targetStat, value: val }
                ];
            }
        } else {
            updated.buffEffects = skill.buffEffects.map(ef => {
                const isCleanse = ef.type === 'CLEANSE' || Boolean(ef.ailments && ef.ailments.length > 0) || Boolean(skill.effectFormula && skill.effectFormula.includes('상태이상 해제'));
                return {
                    ...ef,
                    type: isCleanse ? 'CLEANSE' : (ef.type || 'STAT_BOOST'),
                    ailments: isCleanse ? (ef.ailments || ['중독']) : ef.ailments,
                    value: isCleanse ? 0 : (ef.value || skill.powerRatio || 10)
                };
            });
        }
    }

    // 3. 디버프 스킬 최신화
    if (skill.type === SkillType.DEBUFF) {
        if (!skill.debuffEffects || skill.debuffEffects.length === 0) {
            const defaultStat = skill.debuffStat || 'P.Atk';
            const defaultVal = skill.debuffValue || 5;
            updated.debuffEffects = [
                { type: 'STAT', stat: defaultStat, value: defaultVal }
            ];
        } else {
            updated.debuffEffects = skill.debuffEffects.map(ef => ({
                ...ef,
                type: ef.type || 'STAT',
                stat: ef.stat || skill.debuffStat || 'P.Atk',
                value: ef.type === 'AILMENT' ? 0 : (ef.value || skill.debuffValue || 5),
                ailment: ef.ailment
            }));
        }
    }

    return updated;
};

/**
 * 캐릭터 내 모든 구버전 스킬을 일괄 최신화하는 함수
 */
export const migrateAllLegacySkillsForCharacter = <T extends Character | Companion>(entity: T): { updatedEntity: T; count: number } => {
    if (!entity || !entity.skills) return { updatedEntity: entity, count: 0 };

    let count = 0;
    const updatedSkills = entity.skills.map(s => {
        if (isLegacySkillFormat(s)) {
            count++;
            return parseLegacySkillToCurrentFormat(s, s.tier || ClassTier.FIRST);
        }
        return s;
    });

    const updatedEntity = {
        ...entity,
        skills: updatedSkills
    };

    return { updatedEntity, count };
};
