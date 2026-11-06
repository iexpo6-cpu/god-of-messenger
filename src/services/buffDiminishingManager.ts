import { ActiveStatus } from '../types';

/**
 * 버프 및 디버프 스탯 카테고리 정보
 */
export interface BuffCategoryInfo {
    categoryKey: string;
    categoryLabel: string;
    value: number;
    isDebuff: boolean;
}

const YANG_KEYWORDS = ['태양', '광휘', '전격', '화염', '초화', '해수', '불', '물', '번개', '뇌전', '신성', '빛'];
const YIN_KEYWORDS = ['월광', '대지', '빙결', '질풍', '암흑', '강철', '얼음', '바람', '어둠'];
const MU_KEYWORDS = ['무기강화', '신체강화', '무속성', '무'];

/**
 * 신력 계통을 양의 기운, 음의 기운, 무의 기운으로 분류합니다.
 * - 양의 기운: 태양, 광휘, 전격, 화염, 초화, 해수
 * - 음의 기운: 월광, 대지, 빙결, 질풍, 암흑, 강철
 * - 무의 기운: 무기강화계, 신체강화계 (및 미지정/무속성)
 */
export const getShinryokuAuraType = (shinryokuType?: string): '양' | '음' | '무' => {
    if (!shinryokuType) return '무';
    const clean = shinryokuType.replace(/계$/, '').trim();
    if (!clean || MU_KEYWORDS.some(k => clean.includes(k))) return '무';
    if (YANG_KEYWORDS.some(k => clean.includes(k))) return '양';
    if (YIN_KEYWORDS.some(k => clean.includes(k))) return '음';
    return '무';
};

/**
 * 기운의 한글 명칭을 반환합니다.
 */
export const getAuraDisplayLabel = (shinryokuType?: string): string => {
    const aura = getShinryokuAuraType(shinryokuType);
    if (aura === '양') return '양의 기운';
    if (aura === '음') return '음의 기운';
    return '무의 기운';
};

/**
 * 스킬의 신력 속성을 결정합니다.
 * 스킬에 속성이 설정되어 있지 않거나 무속성이면 시전자(캐릭터/동료/적)의 고유 속성을 자동으로 부여합니다.
 */
export const resolveSkillShinryokuType = (
    skill?: { shinryokuType?: string; name?: string; description?: string; effectFormula?: string } | null,
    casterShinryokuType?: string
): string => {
    if (skill?.shinryokuType && skill.shinryokuType.trim() && skill.shinryokuType.trim() !== '무속성') {
        return skill.shinryokuType.trim();
    }
    if (casterShinryokuType && casterShinryokuType.trim()) {
        return casterShinryokuType.trim();
    }
    if (skill?.shinryokuType && skill.shinryokuType.trim()) {
        return skill.shinryokuType.trim();
    }
    return '무속성';
};

/**
 * 스킬 기운과 대상 기운의 호환 여부를 판정합니다.
 * - 버프 스킬: 같은 기운(양↔양, 음↔음)이거나 무의 기운일 때 100% 그룹(true), 다른 기운일 때 50% 그룹(false)
 * - 디버프 스킬: 서로 상충되는 기운(양↔음, 음↔양)이거나 무의 기운일 때 100% 그룹(true), 같은 기운일 때 50% 그룹(false)
 */
export const isAuraFullPowerGroup = (
    skillShinryokuType?: string,
    targetShinryokuType?: string,
    isDebuff: boolean = false
): boolean => {
    const skillAura = getShinryokuAuraType(skillShinryokuType);
    const targetAura = getShinryokuAuraType(targetShinryokuType);

    // 무의 기운은 버프와 디버프 모두 어디든 100% 호환
    if (skillAura === '무' || targetAura === '무') {
        return true;
    }

    if (!isDebuff) {
        // 버프: 같은 기운일 때 100% 그룹
        return skillAura === targetAura;
    } else {
        // 디버프: 서로 상충되는 다른 기운일 때 100% 그룹
        return skillAura !== targetAura;
    }
};

/**
 * 기운 그룹과 동일 그룹 내 중첩 순위(1순위, 2순위, 3순위...)에 따른 실제 적용 배율을 반환합니다.
 * - 100% 그룹: 1차 100%(1.0), 2차 75%(0.75), 3차 이상 계속 50%(0.5)
 * - 50% 그룹: 1차 50%(0.5), 2차 이상 계속 25%(0.25)
 */
export const getAuraStackMultiplier = (isFullPowerGroup: boolean, rank: number): number => {
    if (isFullPowerGroup) {
        if (rank <= 1) return 1.0;
        if (rank === 2) return 0.75;
        return 0.5;
    } else {
        if (rank <= 1) return 0.5;
        return 0.25;
    }
};

const NON_SCALABLE_STATUS_NAMES = new Set([
    '화상', '출혈', '빙결', '기절', '마비', '수면', '소멸', '흡정', '중독',
    '감전', '암흑', '공포', '속박', '파열', '월침', '월암', '냉기', '혼란',
    '마나 쉴드', '마나 쉴드 (패시브)', '방어 태세', '방어',
    '지속 치유 결계', '지속 마력 결계', '지속 전장 결계',
    '악마화', '마계의 저주', '저주의 반동'
]);

/**
 * 버프 효과 텍스트에서 반감/기운 관련 꼬리표를 정리하여 순수한 원본 텍스트 반환
 */
export const getCleanEffectText = (effect: string): string => {
    if (!effect) return '';
    return effect
        .replace(/\s*\[[^\]]*(?:반감|적용|순위|중첩|조화|상충|상극|저항|기운|초월|잠식)[^\]]*\]/g, '')
        .trim();
};

/**
 * 단일 스탯 절(예: "STR +40%", "P.Def -30%")에서 카테고리와 수치를 추출
 */
export const extractClauseCategoryAndValue = (clause: string): BuffCategoryInfo | null => {
    if (!clause) return null;
    const cleanEffect = getCleanEffectText(clause);

    // 1. 속성 피해 / 속성 공격력
    const elemTypes = [
        { key: '화염', label: '화염계 속성 피해' },
        { key: '빙결', label: '빙결계 속성 피해' },
        { key: '전격', label: '전격계 속성 피해' },
        { key: '뇌전', label: '뇌전계 속성 피해' },
        { key: '질풍', label: '질풍계 속성 피해' },
        { key: '광휘', label: '광휘계 속성 피해' },
        { key: '신성', label: '신성계 속성 피해' },
        { key: '암흑', label: '암흑계 속성 피해' },
        { key: '대지', label: '대지계 속성 피해' },
        { key: '해수', label: '해수계 속성 피해' },
        { key: '월광', label: '월광계 속성 피해' },
        { key: '강철', label: '강철계 속성 피해' },
        { key: '초화', label: '초화계 속성 피해' },
        { key: '무기강화', label: '무기강화계 속성 피해' },
        { key: '신체강화', label: '신체강화계 속성 피해' },
        { key: '태양', label: '태양계 속성 피해' },
    ];
    for (const elem of elemTypes) {
        const regex = new RegExp(`(?:${elem.key}|${elem.key}계|${elem.key}속성)\\s*(?:피해|공격력|데미지|추가\\s*피해)?\\s*([+-]\\d+(?:\\.\\d+)?)%`, 'i');
        const match = cleanEffect.match(regex);
        if (match && !cleanEffect.includes('저항') && !cleanEffect.includes('내성')) {
            const val = parseFloat(match[1]);
            return {
                categoryKey: `elem_atk_${elem.key}`,
                categoryLabel: elem.label,
                value: Math.abs(val),
                isDebuff: val < 0
            };
        }
    }

    // 2. 속성 저항 / 속성 방어
    for (const elem of elemTypes) {
        const regex = new RegExp(`(?:${elem.key}|${elem.key}계|${elem.key}속성)\\s*(?:저항|내성|방어|속성\\s*저항)\\s*([+-]\\d+(?:\\.\\d+)?)%`, 'i');
        const match = cleanEffect.match(regex);
        if (match) {
            const val = parseFloat(match[1]);
            return {
                categoryKey: `elem_res_${elem.key}`,
                categoryLabel: elem.label.replace('피해', '저항'),
                value: Math.abs(val),
                isDebuff: val < 0
            };
        }
    }

    // 모든 속성 피해 / 저항
    const allDmgMatch = cleanEffect.match(/(?:모든\s*속성|전체\s*속성|원소)\s*(?:피해|데미지|공격력)\s*([+-]\d+(?:\.\d+)?)%/i);
    if (allDmgMatch) {
        const val = parseFloat(allDmgMatch[1]);
        return {
            categoryKey: 'all_elem_dmg',
            categoryLabel: '모든 속성 피해',
            value: Math.abs(val),
            isDebuff: val < 0
        };
    }
    const allResMatch = cleanEffect.match(/(?:모든\s*속성|전체\s*속성|원소)\s*(?:저항|내성|방어)\s*([+-]\d+(?:\.\d+)?)%/i);
    if (allResMatch) {
        const val = parseFloat(allResMatch[1]);
        return {
            categoryKey: 'all_elem_res',
            categoryLabel: '모든 속성 저항',
            value: Math.abs(val),
            isDebuff: val < 0
        };
    }

    // 3. 주요 스탯별 매핑
    const statPatterns: { keys: string[]; categoryKey: string; categoryLabel: string }[] = [
        {
            keys: ['물리공격력', '물리 공격력', '물리 피해', 'P.Atk', 'P.ATK', '물공'],
            categoryKey: 'p_atk',
            categoryLabel: '물리 공격력'
        },
        {
            keys: ['마법공격력', '마법 공격력', '마법 피해', 'M.Atk', 'M.ATK', '마공', '주문력'],
            categoryKey: 'm_atk',
            categoryLabel: '마법 공격력'
        },
        {
            keys: ['공격력', 'ATK', '데미지'],
            categoryKey: 'both_atk',
            categoryLabel: '공격력'
        },
        {
            keys: ['물리방어력', '물리 방어력', 'P.Def', 'P.DEF', '물방'],
            categoryKey: 'p_def',
            categoryLabel: '물리 방어력'
        },
        {
            keys: ['마법방어력', '마법 방어력', 'M.Def', 'M.DEF', '마방'],
            categoryKey: 'm_def',
            categoryLabel: '마법 방어력'
        },
        {
            keys: ['방어력', 'DEF', '방어'],
            categoryKey: 'def',
            categoryLabel: '방어력'
        },
        {
            keys: ['민첩', 'AGI', '행동력', '속도'],
            categoryKey: 'agi',
            categoryLabel: '민첩'
        },
        {
            keys: ['마법회피율', '마법 회피율', 'MEva', 'M.Eva'],
            categoryKey: 'm_eva',
            categoryLabel: '마법 회피율'
        },
        {
            keys: ['회피율', '회피', 'Eva', 'EVA', 'P.Eva', '물리회피율', '물리 회피율'],
            categoryKey: 'eva',
            categoryLabel: '회피율'
        },
        {
            keys: ['마법명중률', '마법 명중률', 'MAcc', 'M.Acc'],
            categoryKey: 'm_acc',
            categoryLabel: '마법 명중률'
        },
        {
            keys: ['명중률', '명중', 'Acc', 'ACC', 'P.Acc', '물리명중률', '물리 명중률'],
            categoryKey: 'acc',
            categoryLabel: '명중률'
        },
        {
            keys: ['치명타율', '치명타', '크리티컬', 'Crit', 'CRIT'],
            categoryKey: 'crit',
            categoryLabel: '치명타율'
        },
        {
            keys: ['근력', 'STR', '힘'],
            categoryKey: 'str',
            categoryLabel: '근력'
        },
        {
            keys: ['지능', 'INT'],
            categoryKey: 'int',
            categoryLabel: '지능'
        },
        {
            keys: ['지혜', 'WIS', '정신력'],
            categoryKey: 'wis',
            categoryLabel: '지혜'
        },
        {
            keys: ['제어', 'CTRL', '통제'],
            categoryKey: 'ctrl',
            categoryLabel: '제어력'
        },
        {
            keys: ['최대 체력', 'MaxHP', '최대HP', '체력', 'HP', '생명력'],
            categoryKey: 'hp',
            categoryLabel: '최대 체력'
        },
        {
            keys: ['최대 마나', 'MaxMP', '최대MP', '마나', '마력', 'MP'],
            categoryKey: 'mp',
            categoryLabel: '최대 마나'
        }
    ];

    for (const pattern of statPatterns) {
        for (const k of pattern.keys) {
            const escaped = k.replace('.', '\\.');
            const regex = new RegExp(`(?:^|[^a-zA-Z가-힣])${escaped}\\s*([+-]\\d+(?:\\.\\d+)?)%`, 'i');
            const match = cleanEffect.match(regex);
            if (match) {
                const val = parseFloat(match[1]);
                return {
                    categoryKey: pattern.categoryKey,
                    categoryLabel: pattern.categoryLabel,
                    value: Math.abs(val),
                    isDebuff: val < 0
                };
            }
        }
    }

    return null;
};

/**
 * 버프 효과 텍스트에서 대표 스탯 카테고리와 수치를 추출
 */
export const extractBuffCategoryAndValue = (status: ActiveStatus): BuffCategoryInfo | null => {
    if (!status || !status.effect) return null;
    const cleanEffect = status.originalEffect || getCleanEffectText(status.effect);
    const clauses = cleanEffect.split(',').map(c => c.trim()).filter(Boolean);
    for (const clause of clauses) {
        const info = extractClauseCategoryAndValue(clause);
        if (info) return info;
    }
    return extractClauseCategoryAndValue(cleanEffect);
};

interface ClauseEntry {
    statusIndex: number;
    clauseIndex: number;
    rawClause: string;
    info: BuffCategoryInfo;
    isFullPower: boolean;
    multiplier: number;
    rank: number;
    effectiveValue: number;
}

/**
 * 상태이상 목록 전체를 스탯 카테고리 및 기운(100% 그룹 / 50% 그룹)별로 분리하여
 *- 같은 기운 버프(또는 상극 기운 디버프, 무의 기운): 1차 100%, 2차 75%, 3차 이상 50%
 * - 다른 기운 버프(또는 같은 기운 디버프): 1차 50%, 2차 이상 25%
 * 로 서로 별도 적용 및 계산합니다.
 */
export const refreshBuffDiminishingStatus = (
    statusEffects: ActiveStatus[],
    targetShinryokuType?: string
): ActiveStatus[] => {
    if (!statusEffects || statusEffects.length === 0) return [];

    // 1. 각 상태효과의 원본 텍스트 보존 및 절(clause) 분해
    const statusClauses: { status: ActiveStatus; cleanEffect: string; rawClauses: string[]; entries: (ClauseEntry | null)[] }[] = statusEffects.map((status) => {
        const cleanEffect = status.originalEffect || getCleanEffectText(status.effect);
        if (!status.originalEffect && cleanEffect) {
            status.originalEffect = cleanEffect;
        }
        const rawClauses = cleanEffect.split(',').map(c => c.trim()).filter(Boolean);
        return {
            status,
            cleanEffect,
            rawClauses,
            entries: new Array(rawClauses.length).fill(null)
        };
    });

    // 2. 스탯 카테고리 + 버프/디버프 + 기운그룹(full vs half) 별로 그룹화 (서로 별도 적용)
    const groups = new Map<string, ClauseEntry[]>();

    statusClauses.forEach((sc, sIdx) => {
        const status = sc.status;
        if (NON_SCALABLE_STATUS_NAMES.has(status.name)) return;
        // 시간제 비약 등은 감쇠 제외
        if ((status as any).isRealTime || (status as any).expiresAt) return;

        sc.rawClauses.forEach((rawClause, cIdx) => {
            const info = extractClauseCategoryAndValue(rawClause);
            if (!info || info.value <= 0) return;

            const isFullPower = status.forceFullAura
                ? true
                : isAuraFullPowerGroup(status.shinryokuType, targetShinryokuType, info.isDebuff);
            const entry: ClauseEntry = {
                statusIndex: sIdx,
                clauseIndex: cIdx,
                rawClause,
                info,
                isFullPower,
                multiplier: 1.0,
                rank: 1,
                effectiveValue: info.value
            };
            sc.entries[cIdx] = entry;

            const groupKey = `${info.categoryKey}_${info.isDebuff ? 'debuff' : 'buff'}_${isFullPower ? 'full' : 'half'}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(entry);
        });
    });

    // 3. 각 그룹 내에서 수치가 높은 순서대로 내림차순 정렬 후 배율 부여
    groups.forEach((groupEntries) => {
        groupEntries.sort((a, b) => b.info.value - a.info.value);
        groupEntries.forEach((entry, idx) => {
            const rank = idx + 1;
            const mult = getAuraStackMultiplier(entry.isFullPower, rank);
            let effectiveVal = Math.round(entry.info.value * mult * 10) / 10;
            if (entry.info.isDebuff) {
                effectiveVal = Math.min(90, effectiveVal);
            }
            entry.rank = rank;
            entry.multiplier = mult;
            entry.effectiveValue = effectiveVal;
        });
    });

    // 4. 각 상태효과의 텍스트 및 메타데이터 갱신
    statusClauses.forEach((sc) => {
        const status = sc.status;
        const validEntries = sc.entries.filter((e): e is ClauseEntry => e !== null);

        if (validEntries.length === 0) {
            status.isDiminished = false;
            status.diminishedRate = undefined;
            status.rank = undefined;
            return;
        }

        // 대표 엔트리(첫 번째 스탯 절) 기준 메타데이터 설정
        const primary = validEntries[0];
        const ratePercent = Math.round(primary.multiplier * 100);
        status.rank = primary.rank;
        status.statCategory = primary.info.categoryLabel;
        status.auraGroup = primary.isFullPower ? 'full' : 'half';
        status.isDiminished = ratePercent < 100;
        status.diminishedRate = ratePercent;

        // 각 절의 수치를 실제 적용 수치로 치환
        const rebuiltClauses = sc.rawClauses.map((rawClause, cIdx) => {
            const entry = sc.entries[cIdx];
            if (!entry) return rawClause;
            const sign = entry.info.isDebuff ? '-' : '+';
            return rawClause.replace(/([+-]\d+(?:\.\d+)?)%/, `${sign}${entry.effectiveValue}%`);
        });

        const joinedClauses = rebuiltClauses.join(', ');
        const skillAuraLabel = getAuraDisplayLabel(status.shinryokuType);

        let auraTag = '';
        if (!primary.info.isDebuff) {
            // 버프 안내 태그
            if (primary.isFullPower) {
                const prefix = status.forceFullAura ? '기운 초월' : `${skillAuraLabel} 조화`;
                if (primary.rank === 1) {
                    auraTag = `[${prefix} 100% 적용]`;
                } else {
                    auraTag = `[${prefix} ${primary.rank}중첩 ${ratePercent}% 적용]`;
                }
            } else {
                if (primary.rank === 1) {
                    auraTag = `[기운 상충 50% 적용]`;
                } else {
                    auraTag = `[기운 상충 ${primary.rank}중첩 25% 적용]`;
                }
            }
        } else {
            // 디버프 안내 태그
            if (primary.isFullPower) {
                const prefix = status.forceFullAura ? '기운 잠식' : `${skillAuraLabel} 상극`;
                if (primary.rank === 1) {
                    auraTag = `[${prefix} 100% 적용]`;
                } else {
                    auraTag = `[${prefix} ${primary.rank}중첩 ${ratePercent}% 적용]`;
                }
            } else {
                if (primary.rank === 1) {
                    auraTag = `[동일 기운 저항 50% 적용]`;
                } else {
                    auraTag = `[동일 기운 저항 ${primary.rank}중첩 25% 적용]`;
                }
            }
        }

        status.effect = `${joinedClauses} ${auraTag}`;
    });

    return statusEffects;
};

/**
 * 신규 버프 또는 디버프 부여 시 실행:
 * 스킬의 신력 속성(미설정 시 시전자 속성 자동 적용)과 대상의 신력 속성을 비교하여
 * 기운 조화/상충 및 중복 단계별 적용 비율(100% / 75% / 50% / 25%)을 반영합니다.
 */
export const applyBuffWithDiminishingPriority = (
    target: { statusEffects?: ActiveStatus[]; name?: string; shinryokuType?: string },
    skillName: string,
    rawDesc: string,
    duration: number,
    val: number,
    iconInfo?: { imageUrl?: string; icon?: string; skillElement?: string; forceFullAura?: boolean }
): { effectDesc: string; logNote: string } => {
    if (!target.statusEffects) target.statusEffects = [];

    // 1. 기존 동일 스킬 효과가 있으면 제거 (재시전 시 갱신)
    const clean = (n: string) => n ? n.replace(/\(융합\)/g, "").replace(/의\s*(신성\s*공명|저주\s*각인|투지|약화)/g, "").trim() : "";
    const baseName = clean(skillName);
    target.statusEffects = target.statusEffects.filter(s => clean(s.name) !== baseName);

    // 2. 신규 상태효과 객체 생성 및 추가
    const cleanDesc = getCleanEffectText(rawDesc);
    const newStatus: ActiveStatus = {
        name: skillName,
        duration,
        effect: cleanDesc,
        val,
        imageUrl: iconInfo?.imageUrl,
        icon: iconInfo?.icon,
        originalEffect: cleanDesc,
        shinryokuType: iconInfo?.skillElement || '무속성',
        forceFullAura: iconInfo?.forceFullAura
    };
    target.statusEffects.push(newStatus);

    // 3. 대상의 신력 계통을 기준으로 전체 버프/디버프 기운 및 중첩 배율 재계산
    refreshBuffDiminishingStatus(target.statusEffects, target.shinryokuType);

    // 4. 전투 로그 안내 생성
    const finalNewStatus = target.statusEffects.find(s => clean(s.name) === baseName) || newStatus;
    const rate = finalNewStatus.diminishedRate ?? 100;
    const isFullGroup = finalNewStatus.auraGroup !== 'half';
    const rank = finalNewStatus.rank || 1;
    const isDebuff = cleanDesc.includes('-');
    const auraName = getAuraDisplayLabel(finalNewStatus.shinryokuType);

    let logNote = '';
    if (!isDebuff) {
        if (isFullGroup) {
            const prefix = finalNewStatus.forceFullAura ? '기운 초월' : `${auraName} 조화`;
            logNote = rank === 1
                ? ` [${prefix}: 100% 작동]`
                : ` [${prefix} ${rank}중첩: ${rate}% 작동]`;
        } else {
            logNote = rank === 1
                ? ` [기운 상충: 50% 감소 작동]`
                : ` [기운 상충 ${rank}중첩: 25% 감소 작동]`;
        }
    } else {
        if (isFullGroup) {
            const prefix = finalNewStatus.forceFullAura ? '기운 잠식' : `${auraName} 상극 적중`;
            logNote = rank === 1
                ? ` [${prefix}: 100% 작동]`
                : ` [${finalNewStatus.forceFullAura ? '기운 잠식' : `${auraName} 상극`} ${rank}중첩: ${rate}% 작동]`;
        } else {
            logNote = rank === 1
                ? ` [동일 기운 저항: 50% 감소 작동]`
                : ` [동일 기운 저항 ${rank}중첩: 25% 감소 작동]`;
        }
    }

    return {
        effectDesc: finalNewStatus.effect,
        logNote
    };
};

/**
 * UI 표시용 헬퍼: 특정 버프/디버프의 현재 기운 조화 및 중첩 적용 상태 반환
 */
export const getBuffDisplayInfo = (status: ActiveStatus, allStatuses?: ActiveStatus[], targetShinryokuType?: string) => {
    if (allStatuses && allStatuses.length > 0) {
        refreshBuffDiminishingStatus(allStatuses, targetShinryokuType);
    }

    const rate = status.diminishedRate ?? 100;
    const isDiminished = rate < 100;
    const rank = status.rank || 1;
    const statCategory = status.statCategory || '';
    const auraLabel = getAuraDisplayLabel(status.shinryokuType);
    const isFullGroup = status.auraGroup !== 'half';
    const isDebuff = Boolean(status.originalEffect?.includes('-') || status.effect?.includes('-'));

    let rankLabel = '';
    let tooltipDescription = '';

    if (!isDebuff) {
        if (isFullGroup) {
            if (status.forceFullAura) {
                rankLabel = rank === 1 ? '기운 초월 100%' : `초월 ${rank}중첩 ${rate}%`;
                tooltipDescription = `기운 초월 효과로 기운 차이를 무시하고 ${rank === 1 ? '100% 온전히' : `${rank}중첩으로 ${rate}%`} 적용 중입니다.`;
            } else {
                rankLabel = rank === 1 ? '기운 조화 100%' : `조화 ${rank}중첩 ${rate}%`;
                tooltipDescription = `${auraLabel}(${status.shinryokuType || '무속성'})이 대상과 조화를 이루어 ${rank === 1 ? '100% 온전히' : `${rank}중첩으로 ${rate}%`} 적용 중입니다.`;
            }
        } else {
            rankLabel = rank === 1 ? '기운 상충 50%' : `상충 ${rank}중첩 25%`;
            tooltipDescription = `${auraLabel}(${status.shinryokuType || '무속성'})이 대상의 기운과 상충되어 ${rate}%로 감소 적용 중입니다.`;
        }
    } else {
        if (isFullGroup) {
            if (status.forceFullAura) {
                rankLabel = rank === 1 ? '기운 잠식 100%' : `잠식 ${rank}중첩 ${rate}%`;
                tooltipDescription = `기운 잠식 효과로 동일 기운 내성을 뚫고 ${rank === 1 ? '100% 온전히' : `${rank}중첩으로 ${rate}%`} 약화 효과가 적용 중입니다.`;
            } else {
                rankLabel = rank === 1 ? '상극 기운 100%' : `상극 ${rank}중첩 ${rate}%`;
                tooltipDescription = `${auraLabel}(${status.shinryokuType || '무속성'})이 대상과 상극을 이루어 ${rank === 1 ? '100% 온전히' : `${rank}중첩으로 ${rate}%`} 약화 효과가 적용 중입니다.`;
            }
        } else {
            rankLabel = rank === 1 ? '동일 기운 50%' : `동일 기운 25%`;
            tooltipDescription = `${auraLabel}(${status.shinryokuType || '무속성'})이 대상과 같은 기운이어서 내성에 의해 ${rate}%만 적용 중입니다.`;
        }
    }

    return {
        isDiminished,
        rate,
        rank,
        statCategory,
        rankLabel,
        tooltipDescription
    };
};
