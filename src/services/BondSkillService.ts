import { ActiveStatus, BondSkill, Character, Companion, Enemy, SkillType } from '../types';

// 신력계통 시너지 매핑 테이블
export const SYNERGY_MAP: Record<string, string[]> = {
    '태양계': ['태양계', '광휘계', '화염계'],
    '광휘계': ['광휘계', '태양계', '전격계'],
    '월광계': ['월광계', '암흑계', '무기강화계'],
    '암흑계': ['암흑계', '월광계', '신체강화계'],
    '대지계': ['대지계', '초화계', '빙결계'],
    '초화계': ['초화계', '대지계', '질풍계'],
    '화염계': ['화염계', '태양계', '질풍계'],
    '해수계': ['해수계', '빙결계', '전격계'],
    '질풍계': ['질풍계', '화염계', '초화계'],
    '전격계': ['전격계', '해수계', '빙결계'],
    '빙결계': ['빙결계', '전격계', '해수계', '대지계'],
    '무기강화계': ['무기강화계', '신체강화계', '월광계'],
    '신체강화계': ['신체강화계', '무기강화계', '암흑계']
};

export const checkElementSynergy = (elem1?: string, elem2?: string): boolean => {
    if (!elem1 || !elem2 || elem1 === '무속성' || elem2 === '무속성') return false;
    const clean1 = elem1.trim();
    const clean2 = elem2.trim();
    if (clean1 === clean2) return true;
    const list1 = SYNERGY_MAP[clean1] || [];
    const list2 = SYNERGY_MAP[clean2] || [];
    return list1.includes(clean2) || list2.includes(clean1);
};

export const checkBondSkillSynergy = (
    usedSkill: BondSkill,
    character?: Character,
    companion?: Companion
): boolean => {
    if (usedSkill.hasSynergy !== undefined) return usedSkill.hasSynergy;
    const elem1 = character?.shinryokuType || '무속성';
    const elem2 = companion?.shinryokuType || '무속성';
    return checkElementSynergy(elem1, elem2);
};

/**
 * 일반 스킬 및 인연 스킬 사용 시 시전자와 인연 대상자 양측의 마력이 충분한지 검사합니다.
 */
export const checkSkillParticipantsMp = (
    skill: any,
    player?: Character,
    caster?: Character | Companion | null
): { isAllowed: boolean; reason?: string } => {
    if (!skill) return { isAllowed: false };
    const cost = Math.max(0, skill.mpCost || 0);
    if (cost <= 0) return { isAllowed: true };

    if (skill.isBondSkill && player) {
        const sourceActor = skill.sourceId
            ? player.companions?.find(c => c.id === skill.sourceId)
            : player;
        const partnerComp = skill.companionId
            ? player.companions?.find(c => c.id === skill.companionId)
            : null;

        if (!sourceActor || (sourceActor.stats?.mp || 0) < cost) {
            return {
                isAllowed: false,
                reason: `${sourceActor?.name || '시전자'}의 마력이 부족하여 인연 스킬을 사용할 수 없습니다.`
            };
        }
        if (!partnerComp || (partnerComp.stats?.mp || 0) < cost) {
            return {
                isAllowed: false,
                reason: `${partnerComp?.name || '인연 동료'}의 마력이 부족하여 인연 스킬을 사용할 수 없습니다.`
            };
        }
        return { isAllowed: true };
    }

    const activeCaster = caster || player;
    if (!activeCaster || (activeCaster.stats?.mp || 0) < cost) {
        return {
            isAllowed: false,
            reason: `${activeCaster?.name || '시전자'}의 마력이 부족하여 스킬을 사용할 수 없습니다.`
        };
    }
    return { isAllowed: true };
};

/**
 * 일반 스킬 또는 인연 스킬 발동 시 백엔드 엔진(useGame)으로 전달할 표준 액션 문자열을 생성합니다.
 */
export const buildSkillActionCommand = (
    skill: any,
    casterName: string,
    isCompanion: boolean,
    targetName?: string,
    buffTarget?: string
): string => {
    const buffSuffix = buffTarget ? ` [버프 대상: ${buffTarget}]` : '';
    if (skill?.isBondSkill) {
        const tName = targetName || skill.targetType || 'single';
        return `[인연 스킬] ${skill.id || skill.name} (대상: ${tName})${buffSuffix}`;
    }
    if (isCompanion) {
        const targetPart = targetName ? ` (대상: ${targetName})` : '';
        return `[동료 지시: ${casterName}] 스킬 사용: ${skill.name}${targetPart}${buffSuffix}`;
    }
    const tName = targetName || skill?.targetType || 'single';
    return `[스킬 사용] ${skill.name} (대상: ${tName})${buffSuffix}`;
};

/**
 * 스탯 키를 게임 내 표준 영어 명칭으로 정규화합니다.
 */
export const normalizeStatKey = (raw: string): string | null => {
    if (!raw) return null;
    const clean = raw.toLowerCase().trim();
    if (clean.includes('patk') || clean.includes('p.atk') || clean.includes('물리공격력') || clean.includes('물리 공격력') || clean.includes('물공') || clean.includes('물리공격')) return 'P.Atk';
    if (clean.includes('matk') || clean.includes('m.atk') || clean.includes('마법공격력') || clean.includes('마법 공격력') || clean.includes('마공') || clean.includes('마법공격')) return 'M.Atk';
    if (clean.includes('pdef') || clean.includes('p.def') || clean.includes('물리방어력') || clean.includes('물리 방어력') || clean.includes('물방') || clean.includes('물리방어')) return 'P.Def';
    if (clean.includes('mdef') || clean.includes('m.def') || clean.includes('마법방어력') || clean.includes('마법 방어력') || clean.includes('마방') || clean.includes('마법방어')) return 'M.Def';
    if (clean.includes('p.acc') || clean.includes('acc') || clean.includes('물리명중률') || clean.includes('물리 명중률') || clean.includes('물리명중') || clean.includes('명중률') || clean.includes('명중')) return 'Acc';
    if (clean.includes('m.acc') || clean.includes('macc') || clean.includes('마법명중률') || clean.includes('마법 명중률') || clean.includes('마법명중')) return 'MAcc';
    if (clean.includes('p.eva') || clean.includes('eva') || clean.includes('물리회피율') || clean.includes('물리 회피율') || clean.includes('물리회피') || clean.includes('회피율') || clean.includes('회피')) return 'Eva';
    if (clean.includes('m.eva') || clean.includes('meva') || clean.includes('마법회피율') || clean.includes('마법 회피율') || clean.includes('마법회피')) return 'MEva';
    if (clean.includes('maxhp') || clean.includes('최대hp') || clean.includes('최대 hp') || clean.includes('체력') || (clean.includes('hp') && !clean.includes('회복') && !clean.includes('피해'))) return 'MaxHP';
    if (clean.includes('maxmp') || clean.includes('최대mp') || clean.includes('최대 mp') || (clean.includes('mp') && !clean.includes('회복') && !clean.includes('마나 쉴드') && !clean.includes('소모'))) return 'MaxMP';
    if (clean.includes('str') || clean.includes('힘') || clean.includes('근력')) return 'STR';
    if (clean.includes('int') || clean.includes('지능')) return 'INT';
    if (clean.includes('wis') || clean.includes('지혜') || clean.includes('정신') || clean.includes('신앙')) return 'WIS';
    if (clean.includes('def') || clean.includes('방어') || clean.includes('방어력')) return 'DEF';
    if (clean.includes('agi') || clean.includes('민첩') || clean.includes('순발력') || clean.includes('속도')) return 'AGI';
    if (clean.includes('ctrl') || clean.includes('제어') || clean.includes('통제')) return 'CTRL';
    if (clean.includes('atk') || clean.includes('공격력') || clean.includes('공격')) return 'ATK';

    return null;
};

/**
 * 스킬의 effectFormula 로부터 버프/디버프 내역을 동적으로 추출하여 문자열로 변환합니다.
 */
export const parseSkillFormulaToEffectDescription = (
    formula: string | undefined, 
    level: number = 1,
    isDebuff: boolean = false
): string => {
    if (!formula) return "";
    const skillLevel = level || 1;
    const appliedList: { stat: string; val: number; text: string }[] = [];

    // Preset BUFF tags
    if (!isDebuff) {
        if (formula.includes('BUFF:ATK_UP')) {
            const val = 20 + skillLevel;
            appliedList.push({ stat: 'P.Atk', val, text: `P.Atk +${val}%` });
            appliedList.push({ stat: 'M.Atk', val, text: `M.Atk +${val}%` });
        }
        if (formula.includes('BUFF:DEF_UP')) {
            const val = 20 + skillLevel;
            appliedList.push({ stat: 'DEF', val, text: `DEF +${val}%` });
        }
        if (formula.includes('BUFF:AGI_UP')) {
            const val = 20 + skillLevel;
            appliedList.push({ stat: 'AGI', val, text: `AGI +${val}%` });
        }
        if (formula.includes('BUFF:ALL_UP')) {
            const val = 15 + skillLevel;
            ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'].forEach(st => {
                appliedList.push({ stat: st, val, text: `${st} +${val}%` });
            });
        }
    }

    const cleanFormula = formula
        .replace(/\[성공률:[^\]]*\]/g, '')
        .replace(/\(\d+턴\)/g, '')
        .replace(/\(Lv당\+[^\)]*\)/g, '');

    const clauses = cleanFormula.split(/[,;\n\[\]]+/);
    for (const rawClause of clauses) {
        const clause = rawClause.trim();
        if (!clause || clause.includes('MANA_SHIELD') || clause.includes('회복') || clause.includes('해제') || clause.includes('RESURRECT')) continue;

        if (isDebuff) {
            const match = clause.replace(/^Debuff:\s*/i, '').match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:감소|하락|down))?/i);
            if (match) {
                const rawStat = match[1];
                const num = parseFloat(match[2]);
                const stat = normalizeStatKey(rawStat);
                if (stat) {
                    const totalValue = Math.abs(num) + skillLevel;
                    appliedList.push({ stat, val: totalValue, text: `${stat} -${totalValue}%` });
                }
            }
        } else {
            const match = clause.match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:증가|상승|up))?/i);
            if (match) {
                const rawStat = match[1];
                const num = parseFloat(match[2]);
                const stat = normalizeStatKey(rawStat);
                if (stat) {
                    const totalValue = Math.abs(num) + skillLevel;
                    appliedList.push({ stat, val: totalValue, text: `${stat} +${totalValue}%` });
                }
            }
        }
    }

    return appliedList.map(a => a.text).join(', ');
};

/**
 * 상태이상 및 버프 수치 문자열을 주어진 배율(multiplier)만큼 곱하여 증폭시킵니다.
 * 예: "물리 공격력 +25%" -> 1.8배 -> "물리 공격력 +45%"
 * 예: "방어력 -30%" -> 1.8배 -> "방어력 -54%"
 */
export const amplifyStatusEffectDescription = (desc: string, multiplier: number): string => {
    if (!desc) return desc;
    // 숫자와 부호(+ 또는 -)를 찾는 정규식
    return desc.replace(/([\+\-])\s*(\d+)/g, (match, sign, numStr) => {
        const num = parseInt(numStr, 10);
        if (isNaN(num)) return match;
        const amplified = Math.round(num * multiplier);
        return `${sign}${amplified}`;
    });
};

/**
 * 두 개 이상의 효과 설명 문자열을 깔끔하게 하나로 합칩니다.
 * 같은 스탯 항목이 있을 경우 수치를 합산하고 기타 항목은 쉼표로 연결합니다.
 */
export const combineEffectDescriptions = (...effects: (string | undefined)[]): string => {
    const statMap = new Map<string, number>();
    const otherClauses: string[] = [];

    effects.filter(Boolean).forEach(eff => {
        if (!eff) return;
        const clauses = eff.split(/,\s*/);
        clauses.forEach(clause => {
            const trimmed = clause.trim();
            if (!trimmed) return;
            const match = trimmed.match(/^([a-zA-Z가-힣\.\s]+?)\s*([+-]\s*\d+(?:\.\d+)?)\s*%?$/);
            if (match) {
                const stat = match[1].trim();
                const val = parseFloat(match[2].replace(/\s+/g, ''));
                if (!isNaN(val)) {
                    statMap.set(stat, (statMap.get(stat) || 0) + val);
                    return;
                }
            }
            if (!otherClauses.includes(trimmed)) {
                otherClauses.push(trimmed);
            }
        });
    });

    const resultList: string[] = [];
    statMap.forEach((val, stat) => {
        const sign = val >= 0 ? '+' : '';
        resultList.push(`${stat} ${sign}${val}%`);
    });
    resultList.push(...otherClauses);

    return resultList.join(', ');
};

/**
 * 인연 디버프 개별 성공 여부를 판정합니다.
 * @param rate 성공 확률 (0-100)
 */
export const checkDebuffSuccess = (rate: number): boolean => {
    return Math.random() * 100 < rate;
};

/**
 * 인연스킬 디버프 성공률을 동적으로 계산합니다.
 * 적의 제어(CTRL) 수치와 두 인연(시전자 + 파트너 동료)의 제어(CTRL) 합산을 기반으로 결정됩니다.
 */
export const calculateBondDebuffSuccessRate = (
    casterActor: Character | Companion,
    partnerComp: Companion,
    targetEnemy: Enemy,
    skillLevel: number = 1,
    baseRate: number = 80
): number => {
    const casterCtrl = casterActor.stats?.ctrl || 0;
    const partnerCtrl = partnerComp.stats?.ctrl || 0;
    const totalCasterCtrl = casterCtrl + partnerCtrl;

    const targetCtrl = targetEnemy.stats?.ctrl ?? ((targetEnemy as any).ctrl ?? 10);

    const atkBonus = totalCasterCtrl * 0.4;
    const defBonus = targetCtrl * 0.3;
    const lvlBonus = skillLevel * 1.0;

    const rate = baseRate + atkBonus - defBonus + lvlBonus;
    return Math.min(100, Math.max(5, Math.floor(rate)));
};

/**
 * 단일 스킬 객체로부터 버프/디버프 효과 정보를 결합 시점에 명확하게 추출합니다.
 */
export const extractSkillEffectInfo = (
    skill: any,
    multiplier: number = 1.0
): { name: string; effect: string; duration: number; isDebuff: boolean } | null => {
    if (!skill) return null;
    const isBuff = String(skill.type).includes('BUFF') || String(skill.type).includes('버프') || (skill.effectFormula && skill.effectFormula.includes('BUFF:'));
    const isDebuff = String(skill.type).includes('DEBUFF') || String(skill.type).includes('디버프') || (skill.effectFormula && skill.effectFormula.includes('Debuff:'));

    if (!isBuff && !isDebuff) return null;

    let effectDesc = "";
    if (skill.effectFormula) {
        effectDesc = parseSkillFormulaToEffectDescription(skill.effectFormula, skill.level || 1, isDebuff);
    }
    if (!effectDesc && skill.statusEffects && skill.statusEffects.length > 0) {
        effectDesc = skill.statusEffects.map((e: any) => e.effect).filter(Boolean).join(', ');
    }
    if (!effectDesc) {
        if (isBuff) {
            effectDesc = "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%";
        } else {
            effectDesc = "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%";
        }
    }

    if (multiplier !== 1.0) {
        effectDesc = amplifyStatusEffectDescription(effectDesc, multiplier);
    }

    return {
        name: `${skill.name} (융합)`,
        effect: effectDesc,
        duration: 3,
        isDebuff
    };
};

/**
 * 인연스킬 객체로부터 결합된 원본 스킬들의 실제 버프/디버프 상태이상 효과를 동적으로 분석하여 구출해 냅니다.
 */
export const getDynamicEffects = (
    usedSkill: BondSkill,
    targetCategory: 'buff' | 'debuff' = 'buff'
): { name: string; effect: string; duration: number; isDebuff: boolean }[] => {
    const list: { name: string; effect: string; duration: number; isDebuff: boolean }[] = [];

    // 0. 결합 시점에 확정 저장된 버프/디버프 목록이 있다면 최우선 채택!
    if (targetCategory === 'buff' && usedSkill.fusedBuffEffects && usedSkill.fusedBuffEffects.length > 0) {
        return usedSkill.fusedBuffEffects.map(b => ({
            name: b.name,
            effect: b.effect,
            duration: b.duration || 3,
            isDebuff: false
        }));
    }
    if (targetCategory === 'debuff' && usedSkill.fusedDebuffEffects && usedSkill.fusedDebuffEffects.length > 0) {
        return usedSkill.fusedDebuffEffects.map(d => ({
            name: d.name,
            effect: d.effect,
            duration: d.duration || 3,
            isDebuff: true
        }));
    }

    const isBuffType = (t: any) => {
        if (!t) return false;
        const s = String(t).trim();
        return s === 'BUFF' || s === '버프';
    };
    const isDebuffType = (t: any) => {
        if (!t) return false;
        const s = String(t).trim();
        return s === 'DEBUFF' || s === '디버프';
    };

    // effectFormula 분할
    const formulas = usedSkill.effectFormula ? usedSkill.effectFormula.split('+') : [];
    const playerFormula = formulas[0] ? formulas[0].trim() : "";
    const companionFormula = formulas[1] ? formulas[1].trim() : "";

    // 1. 플레이어 스킬 효과 구출
    let playerEffectsList: { name: string; effect: string; duration: number; isDebuff: boolean }[] = [];
    if (usedSkill.playerSkillEffects && usedSkill.playerSkillEffects.length > 0) {
        usedSkill.playerSkillEffects.forEach(eff => {
            if (eff && eff.name && eff.effect) {
                const isDebuff = isDebuffType(usedSkill.playerSkillType);
                playerEffectsList.push({
                    name: eff.name.includes('(융합)') ? eff.name : `${eff.name} (융합)`,
                    effect: eff.effect,
                    duration: eff.duration || 3,
                    isDebuff
                });
            }
        });
    }
    if (playerEffectsList.length === 0 && (isBuffType(usedSkill.playerSkillType) || isDebuffType(usedSkill.playerSkillType))) {
        const isDebuff = isDebuffType(usedSkill.playerSkillType);
        let desc = playerFormula ? parseSkillFormulaToEffectDescription(playerFormula, 1, isDebuff) : "";
        if (!desc) {
            desc = isDebuff
                ? "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%"
                : "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%";
        }
        playerEffectsList.push({
            name: `${usedSkill.playerSkillName} (융합)`,
            effect: desc,
            duration: 3,
            isDebuff
        });
    }

    // 2. 동료 스킬 효과 구출
    let companionEffectsList: { name: string; effect: string; duration: number; isDebuff: boolean }[] = [];
    if (usedSkill.companionSkillEffects && usedSkill.companionSkillEffects.length > 0) {
        usedSkill.companionSkillEffects.forEach(eff => {
            if (eff && eff.name && eff.effect) {
                const isDebuff = isDebuffType(usedSkill.companionSkillType);
                companionEffectsList.push({
                    name: eff.name.includes('(융합)') ? eff.name : `${eff.name} (융합)`,
                    effect: eff.effect,
                    duration: eff.duration || 3,
                    isDebuff
                });
            }
        });
    }
    if (companionEffectsList.length === 0 && (isBuffType(usedSkill.companionSkillType) || isDebuffType(usedSkill.companionSkillType))) {
        const isDebuff = isDebuffType(usedSkill.companionSkillType);
        let desc = companionFormula ? parseSkillFormulaToEffectDescription(companionFormula, 1, isDebuff) : "";
        if (!desc) {
            desc = isDebuff
                ? "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%"
                : "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%";
        }
        companionEffectsList.push({
            name: `${usedSkill.companionSkillName} (융합)`,
            effect: desc,
            duration: 3,
            isDebuff
        });
    }

    if (targetCategory === 'buff') {
        list.push(...playerEffectsList.filter(e => !e.isDebuff), ...companionEffectsList.filter(e => !e.isDebuff));
    } else {
        list.push(...playerEffectsList.filter(e => e.isDebuff), ...companionEffectsList.filter(e => e.isDebuff));
    }

    return list;
};

/**
 * 원본 스킬 효과들로부터 유효한 상태 효과를 결합 및 증폭하여 반환합니다.
 * 효과가 비어있는 경우 디폴트 효과를 반환합니다.
 * combineIntoSingle이 true일 경우(버프+버프, 디버프+디버프) 모든 효과를 하나로 통합하여 인연스킬 단일 버프/디버프로 반환합니다.
 */
export const mergeAndAmplifyEffects = (
    usedSkill: BondSkill,
    defaultName: string,
    defaultEffect: string,
    defaultDuration: number,
    multiplier: number = 1.0,
    targetCategory: 'buff' | 'debuff' = 'buff',
    combineIntoSingle: boolean = false
): { name: string; effect: string; duration: number }[] => {
    // 1. 결합 시점에 확정 저장된 fusedBuffEffects / fusedDebuffEffects가 있다면:
    // 이미 BondSkillBookModal에서 (A+B) 합산 및 신력 조화(1.25배) 계산이 완벽하게 완료된 수치이므로,
    // 이중 증폭 없이 모달과 100% 동일한 수치 그대로 인연스킬 단일 버프로 적용!
    if (targetCategory === 'buff' && usedSkill.fusedBuffEffects && usedSkill.fusedBuffEffects.length > 0) {
        const primary = usedSkill.fusedBuffEffects[0];
        const unifiedName = usedSkill.name.includes('(융합)') ? usedSkill.name : `${usedSkill.name} (융합)`;
        return [{
            name: unifiedName,
            effect: primary.effect,
            duration: primary.duration || defaultDuration
        }];
    }
    if (targetCategory === 'debuff' && usedSkill.fusedDebuffEffects && usedSkill.fusedDebuffEffects.length > 0) {
        const primary = usedSkill.fusedDebuffEffects[0];
        const unifiedName = usedSkill.name.includes('(융합)') ? usedSkill.name : `${usedSkill.name} (융합)`;
        return [{
            name: unifiedName,
            effect: primary.effect,
            duration: primary.duration || defaultDuration
        }];
    }

    const list: { name: string; effect: string; duration: number }[] = [];
    const dynamicEffects = getDynamicEffects(usedSkill, targetCategory);

    // 버프+버프 또는 디버프+디버프일 때: 두 효과를 하나의 인연스킬 버프로 완벽 통합!
    if (combineIntoSingle) {
        let combinedDesc = "";
        if (dynamicEffects.length > 0) {
            combinedDesc = combineEffectDescriptions(...dynamicEffects.map(e => e.effect));
        }
        if (!combinedDesc) {
            combinedDesc = defaultEffect;
        }
        const ampEffect = amplifyStatusEffectDescription(combinedDesc, multiplier);
        const unifiedName = usedSkill.name.includes('(융합)') ? usedSkill.name : `${usedSkill.name} (융합)`;
        return [{
            name: unifiedName,
            effect: ampEffect,
            duration: defaultDuration
        }];
    }

    const seenNames = new Set<string>();
    dynamicEffects.forEach(eff => {
        if (!eff || !eff.name) return;
        const cleanName = eff.name.trim();
        if (seenNames.has(cleanName)) return;
        seenNames.add(cleanName);

        const ampEffect = amplifyStatusEffectDescription(eff.effect || '', multiplier);
        list.push({
            name: cleanName.includes('(융합)') ? cleanName : `${cleanName} (융합)`,
            effect: ampEffect,
            duration: eff.duration || defaultDuration
        });
    });

    // 만약 파싱 및 동적 추출해낸 원본 효과가 전혀 없었다면 결합된 스킬 이름을 기반으로 가호 생성
    if (list.length === 0) {
        list.push({
            name: defaultName,
            effect: amplifyStatusEffectDescription(defaultEffect, multiplier),
            duration: defaultDuration
        });
    }

    return list;
};

/**
 * 인연스킬 발동 시, 결합에 사용된 원본 스킬 A, B 및 기존 인연스킬의 상태이상을 대상에게서 사전에 깨끗이 제거합니다.
 */
export const removeOriginSkillStatuses = (target: any, skill: BondSkill) => {
    if (!target || !target.statusEffects || target.statusEffects.length === 0) return;
    const clean = (n: string) => n ? n.replace(/\(융합\)/g, "").replace(/의\s*(신성\s*공명|저주\s*각인|투지|약화)/g, "").trim() : "";
    
    const targetsToClean = [
        skill.name,
        skill.playerSkillName,
        skill.companionSkillName
    ].filter(Boolean);

    const cleanNames = new Set<string>();
    targetsToClean.forEach(t => {
        if (t) {
            cleanNames.add(t.trim());
            cleanNames.add(clean(t));
        }
    });

    if (skill.fusedBuffEffects) {
        skill.fusedBuffEffects.forEach(b => {
            if (b.name) {
                cleanNames.add(b.name.trim());
                cleanNames.add(clean(b.name));
            }
        });
    }

    if (skill.fusedDebuffEffects) {
        skill.fusedDebuffEffects.forEach(d => {
            if (d.name) {
                cleanNames.add(d.name.trim());
                cleanNames.add(clean(d.name));
            }
        });
    }

    target.statusEffects = target.statusEffects.filter((eff: any) => {
        if (!eff || !eff.name) return true;
        const effClean = clean(eff.name);
        const effRaw = eff.name.trim();

        if (cleanNames.has(effClean) || cleanNames.has(effRaw)) return false;

        // 원본 스킬명이나 인연스킬명이 포함되어 있는 경우도 상호 배타 제거
        for (const t of cleanNames) {
            if (t.length >= 2 && (effRaw.includes(t) || effClean.includes(t))) {
                return false;
            }
        }
        return true;
    });
};

/**
 * 일반 스킬(예: 엘리시온) 사용 시, 해당 스킬이 재료로 사용된 인연스킬(융합) 버프가 대상에게 걸려있다면 상호 배타적으로 깔끔히 제거합니다.
 */
export const cleanUpBondSkillBuffIfBaseSkillUsed = (
    target: any,
    baseSkillName: string,
    bondSkills?: BondSkill[]
) => {
    if (!target || !target.statusEffects || target.statusEffects.length === 0 || !baseSkillName) return;
    const clean = (n: string) => n ? n.replace(/\(융합\)/g, "").replace(/의\s*(신성\s*공명|저주\s*각인|투지|약화)/g, "").trim() : "";
    const cleanBase = clean(baseSkillName);

    // 1. 이름이 직접 일치하거나 (융합)이 붙은 경우 제거
    target.statusEffects = target.statusEffects.filter((eff: any) => {
        if (!eff || !eff.name) return true;
        const effClean = clean(eff.name);
        return effClean !== cleanBase;
    });

    // 2. 만약 baseSkillName이 캐릭터가 보유한 인연스킬의 재료(playerSkillName 또는 companionSkillName)라면,
    // 그 인연스킬 이름으로 부여되어 있던 융합 버프/디버프도 깔끔하게 제거!
    if (bondSkills && bondSkills.length > 0) {
        const matchingBondSkills = bondSkills.filter(bs => {
            const p = clean(bs.playerSkillName);
            const c = clean(bs.companionSkillName);
            return p === cleanBase || c === cleanBase;
        });

        if (matchingBondSkills.length > 0) {
            const bondNamesToClean = new Set<string>();
            matchingBondSkills.forEach(bs => {
                bondNamesToClean.add(clean(bs.name));
                bondNamesToClean.add(bs.name.trim());
                if (bs.fusedBuffEffects) bs.fusedBuffEffects.forEach(b => bondNamesToClean.add(clean(b.name)));
                if (bs.fusedDebuffEffects) bs.fusedDebuffEffects.forEach(d => bondNamesToClean.add(clean(d.name)));
            });

            target.statusEffects = target.statusEffects.filter((eff: any) => {
                if (!eff || !eff.name) return true;
                const effClean = clean(eff.name);
                const effRaw = eff.name.trim();
                if (bondNamesToClean.has(effClean) || bondNamesToClean.has(effRaw)) return false;
                for (const t of bondNamesToClean) {
                    if (t.length >= 2 && (effRaw.includes(t) || effClean.includes(t))) return false;
                }
                return true;
            });
        }
    }
};

/**
 * 인연스킬 발동 시, 버프와 디버프를 조건에 맞게 대상들에게 적용하고 로그 메시지를 반환합니다.
 */
export const executeBondSkillUtility = (
    usedSkill: BondSkill,
    nextCharState: Character,
    companion: Companion,
    sourceComp: Companion | null,
    simulationEnemies: Enemy[],
    targetMatch: RegExpMatchArray | null,
    addCombatStatusEffect: (target: any, name: string, effect: string, duration: number) => void
): { log: string } => {
    let totalLog = "";
    
    const t1 = usedSkill.playerSkillType;
    const t2 = usedSkill.companionSkillType;

    const isAttackType = (t: any) => {
        if (!t) return true;
        const s = String(t).trim();
        return s === 'PHYSICAL' || s === 'MAGIC' || s === 'HEAL' || s === 'SUMMON' || s === 'CLONE' ||
               s === '물리 공격' || s === '마법 공격' || s === '물리공격' || s === '마법공격' ||
               s === '회복' || s === '소환' || s === '분신' || s === '공격' || s === '물리' || s === '마법';
    };
    const isBuffType = (t: any) => {
        if (!t) return false;
        const s = String(t).trim();
        return s === 'BUFF' || s === '버프';
    };
    const isDebuffType = (t: any) => {
        if (!t) return false;
        const s = String(t).trim();
        return s === 'DEBUFF' || s === '디버프';
    };

    const isAttackBuffCombo = (isAttackType(t1) && isBuffType(t2)) || (isBuffType(t1) && isAttackType(t2));
    const isAttackDebuffCombo = (isAttackType(t1) && isDebuffType(t2)) || (isDebuffType(t1) && isAttackType(t2));
    const isBuffBuffCombo = isBuffType(t1) && isBuffType(t2);
    const isDebuffDebuffCombo = isDebuffType(t1) && isDebuffType(t2);

    const buffSkillName = isBuffType(t1) ? usedSkill.playerSkillName : (isBuffType(t2) ? usedSkill.companionSkillName : usedSkill.name);
    const debuffSkillName = isDebuffType(t1) ? usedSkill.playerSkillName : (isDebuffType(t2) ? usedSkill.companionSkillName : usedSkill.name);

    if (isBuffBuffCombo) {
        // [버프 + 버프] 신성 공명: 신력계통 조화 시 1.25배, 없으면 증폭배율 없음 1.0배
        // 두 영혼의 버프 스킬을 하나로 통합하여 인연스킬 전용 단일 버프로 부여
        const hasSynergy = checkBondSkillSynergy(usedSkill, nextCharState, companion);
        const multiplier = hasSynergy ? 1.25 : 1.0;
        const amplifiedBuffs = mergeAndAmplifyEffects(
            usedSkill,
            `${usedSkill.name} (융합)`,
            "물리 공격력 +28%, 마법 공격력 +28%, 물리 방어력 +22%, 마법 방어력 +22%, AGI +11%",
            4,
            multiplier,
            'buff',
            true // 단일 인연 버프로 통합!
        );

        const isAoeBuff = usedSkill.targetType === 'aoe';

        if (isAoeBuff) {
            // 광역 아군 버프: 시전자 및 모든 살아있는 아군에게 부여
            removeOriginSkillStatuses(nextCharState, usedSkill);
            amplifiedBuffs.forEach(buff => {
                addCombatStatusEffect(nextCharState, buff.name, buff.effect, buff.duration);
            });

            nextCharState.companions.forEach((c: any, cIdx: number) => {
                if (c && c.stats.hp > 0 && !c.isDead) {
                    removeOriginSkillStatuses(nextCharState.companions[cIdx], usedSkill);
                    amplifiedBuffs.forEach(buff => {
                        addCombatStatusEffect(nextCharState.companions[cIdx], buff.name, buff.effect, buff.duration);
                    });
                }
            });
        } else {
            // 단일 아군 버프: 시전자 본인에게만 부여
            const targetActor = sourceComp
                ? nextCharState.companions.find(c => c.id === sourceComp.id) || nextCharState
                : nextCharState;
            removeOriginSkillStatuses(targetActor, usedSkill);
            amplifiedBuffs.forEach(buff => {
                addCombatStatusEffect(targetActor, buff.name, buff.effect, buff.duration);
            });
        }

        const buffDetail = amplifiedBuffs.map(b => `[${b.name}: ${b.effect}]`).join(", ");
        const title = amplifiedBuffs.map(b => b.name).join(' & ');
        const synText = hasSynergy ? " (신력 조화: 증폭 배율 1.25배 적용)" : "";
        const targetScopeText = isAoeBuff ? "아군 전원에게" : "시전자에게";
        totalLog += `\n[인연 융합 가호: ${title}] 두 영혼의 가호가 합일되어 ${targetScopeText} 강력한 기운을 수여합니다!${synText}\n부여 효과: ${buffDetail}`;

    } else if (isDebuffDebuffCombo) {
        // [디버프 + 디버프] 저주 각인: 적의 제어 수치 및 두 인연(시전자 + 파트너)의 제어(CTRL) 합산으로 성공률 동적 계산
        const sourceActor = sourceComp || nextCharState;
        const hasSynergy = checkBondSkillSynergy(usedSkill, nextCharState, companion);
        const multiplier = hasSynergy ? 1.25 : 1.0;
        const amplifiedDebuffs = mergeAndAmplifyEffects(
            usedSkill,
            `${usedSkill.name} (융합)`,
            "물리 방어력 -28%, 마법 방어력 -28%, 물리 공격력 -22%, 마법 공격력 -22%, CTRL -17%",
            4,
            multiplier,
            'debuff',
            true // 단일 인연 디버프로 통합!
        );

        const isAoeDebuff = usedSkill.targetType === 'aoe';

        const applyDebuffToEnemy = (enemy: Enemy, enemyIdx: number) => {
            const successRate = calculateBondDebuffSuccessRate(sourceActor, companion, enemy, usedSkill.level || 1, 80);
            const isSuccess = checkDebuffSuccess(successRate);
            if (isSuccess) {
                removeOriginSkillStatuses(simulationEnemies[enemyIdx], usedSkill);
                amplifiedDebuffs.forEach(debuff => {
                    addCombatStatusEffect(simulationEnemies[enemyIdx], debuff.name, debuff.effect, debuff.duration);
                });
                totalLog += `\n[시스템] ${enemy.name}에게 저주 각인 부여 성공! (성공 확률 ${successRate}% 통과)`;
            } else {
                totalLog += `\n[시스템] ${enemy.name}이(가) 인연 저주에 대항하여 저항했습니다! (저주 저항 발생, 성공 확률 ${successRate}%)`;
            }
        };

        if (isAoeDebuff) {
            // 광역 디버프: 적 전원에게 개별 판정 부여
            simulationEnemies.forEach((enemy, idx) => {
                if (enemy.hp <= 0) return;
                applyDebuffToEnemy(enemy, idx);
            });
        } else {
            // 단일 디버프: 타겟팅된 적 1체에게만 부여
            let targetEnemy: Enemy | undefined;
            let targetIdx = -1;
            if (targetMatch) {
                const targetName = targetMatch[1].trim();
                targetIdx = simulationEnemies.findIndex(e => e.name === targetName && e.hp > 0);
                if (targetIdx !== -1) targetEnemy = simulationEnemies[targetIdx];
            }
            if (!targetEnemy) {
                targetIdx = simulationEnemies.findIndex(e => e.hp > 0);
                if (targetIdx !== -1) targetEnemy = simulationEnemies[targetIdx];
            }
            if (targetEnemy && targetIdx !== -1) {
                applyDebuffToEnemy(targetEnemy, targetIdx);
            }
        }

        const debuffDetail = amplifiedDebuffs.map(d => `[${d.name}: ${d.effect}]`).join(", ");
        const title = amplifiedDebuffs.map(d => d.name).join(' & ');
        const synText = hasSynergy ? " (신력 조화: 증폭 배율 1.25배 적용)" : "";
        const targetScopeText = isAoeDebuff ? "전장에 짙은 파멸의 결계가 완성되어" : "단일 대상에게 파멸의 저주가 집중되어";
        totalLog += `\n[인연 융합 저주: ${title}] ${targetScopeText} 두 영혼의 제어력이 합일된 저주가 침투합니다!${synText}\n디버프 목록: ${debuffDetail}`;

    } else if (isAttackBuffCombo) {
        // [공격 + 버프] 투지 융합: 공격 후 자신과 파트너 버프 (인연스킬 단일 버프로 완벽 통합)
        const activeBuffs = mergeAndAmplifyEffects(
            usedSkill,
            `${usedSkill.name} (융합)`,
            "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%",
            3,
            1.0,
            'buff',
            true // 단일 인연 버프로 통합!
        );

        // 시전자(시전 동료 또는 플레이어)에게 부여
        if (sourceComp) {
            const sIdx = nextCharState.companions.findIndex(c => c.id === sourceComp.id);
            if (sIdx >= 0) {
                removeOriginSkillStatuses(nextCharState.companions[sIdx], usedSkill);
                activeBuffs.forEach(buff => {
                    addCombatStatusEffect(nextCharState.companions[sIdx], buff.name, buff.effect, buff.duration);
                });
            }
        } else {
            removeOriginSkillStatuses(nextCharState, usedSkill);
            activeBuffs.forEach(buff => {
                addCombatStatusEffect(nextCharState, buff.name, buff.effect, buff.duration);
            });
        }

        // 파트너 동료에게 부여
        const cIdx = nextCharState.companions.findIndex(c => c.id === companion.id);
        if (cIdx >= 0) {
            removeOriginSkillStatuses(nextCharState.companions[cIdx], usedSkill);
            activeBuffs.forEach(buff => {
                addCombatStatusEffect(nextCharState.companions[cIdx], buff.name, buff.effect, buff.duration);
            });
        }

        const buffDetail = activeBuffs.map(b => `[${b.name}: ${b.effect}]`).join(", ");
        const title = activeBuffs.map(b => b.name).join(' & ');
        totalLog += `\n[인연 융합 버프: ${title}] 타격과 함께 결합된 ${title}의 기운이 발산됩니다!\n부여 효과: ${buffDetail}`;

    } else if (isAttackDebuffCombo) {
        // [공격 + 디버프] 약화 융합: 적 공격 후 디버프 (적 제어 수치 및 두 인연의 제어 합산 기반 성공률 동적 판정, 인연스킬 단일 디버프로 완벽 통합)
        const sourceActor = sourceComp || nextCharState;
        const activeDebuffs = mergeAndAmplifyEffects(
            usedSkill,
            `${usedSkill.name} (융합)`,
            "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%",
            3,
            1.0,
            'debuff',
            true // 단일 인연 디버프로 통합!
        );

        const applyToSingleEnemy = (enemy: Enemy, enemyIdx: number) => {
            const successRate = calculateBondDebuffSuccessRate(sourceActor, companion, enemy, usedSkill.level || 1, 65);
            const isSuccess = checkDebuffSuccess(successRate);
            if (isSuccess) {
                removeOriginSkillStatuses(simulationEnemies[enemyIdx], usedSkill);
                activeDebuffs.forEach(debuff => {
                    addCombatStatusEffect(simulationEnemies[enemyIdx], debuff.name, debuff.effect, debuff.duration);
                });
                const debuffDetail = activeDebuffs.map(d => `[${d.name}: ${d.effect}]`).join(", ");
                totalLog += `\n[시스템] ${enemy.name}에게 디버프 주입 성공! (성공 확률 ${successRate}% 통과): ${debuffDetail}`;
            } else {
                totalLog += `\n[시스템] ${enemy.name}이(가) 인연 디버프의 정신 오염에 저항했습니다! (디버프 저항, 성공 확률 ${successRate}%)`;
            }
        };

        if (usedSkill.targetType === 'single' && targetMatch) {
            const targetName = targetMatch[1].trim();
            const enemyIdx = simulationEnemies.findIndex(e => e.name === targetName && e.hp > 0);
            if (enemyIdx !== -1) {
                applyToSingleEnemy(simulationEnemies[enemyIdx], enemyIdx);
            }
        } else {
            simulationEnemies.forEach((enemy, idx) => {
                if (enemy.hp <= 0) return;
                applyToSingleEnemy(enemy, idx);
            });
        }
        const title = activeDebuffs.map(d => d.name).join(' & ');
        totalLog += `\n[인연 융합 디버프: ${title}] 공격의 충격을 틈타 융합 무력화 저주가 깊숙이 침투를 시도합니다!`;
    }

    return { log: totalLog };
};
