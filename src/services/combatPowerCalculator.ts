import { BattleRole, ClassTier, CombatStyle, SecondaryBattleRole } from '../types';
import { resolveEntityClassTier, CLASS_TIER_DEFENSE_TABLE } from './classTierDefenseService';
import { COMBAT_STYLE_CONFIG } from '../constants';

/**
 * 전투력 밸런싱 엔진 (Combat Power Calculator)
 * 
 * [설계 방침]
 * 1. 기초 6대 능력치(근력, 민첩, 지능, 지혜, 방어, 제어력): 1포인트당 2점 적용 (제어력도 2점)
 * 2. 치명타율(5%), 치명타피해량(1.4배), 명중률(85%)의 기본치 초과 증가분만 전투력에 정직하게 반영 (기본치 상태에서는 0점)
 * 3. 점감 기준선(소프트캡) 완전 제거: 인위적인 수치 꺾임 없이 정직한 선형 비례 산정.
 * 4. 각 포지션(딜러, 탱커, 서포터, 역할없음) 간 동등하고 공평한 가치 분배
 * 5. 서포터의 경우 버프 및 디버프 스킬의 비율(%)을 정밀 추출하여 기술 전투력 점수에 적극 반영
 * 6. 클래스 해방에 따른 방어력 곱연산(+45% ~ +200%) 제거 및 확정 정수 보너스(+1,000 / +3,000 / +10,000 / +100,000) 유지.
 * 7. 최고 무기 숙련도(Lv당 50점, 최대 5,000점) 및 전투 스타일 차수 보너스 유지.
 */

export interface CombatPowerFactors {
    hp: number;
    mp: number;
    str: number;
    agi: number;
    int: number;
    wis: number;
    def: number;
    ctrl: number;
    pAtk: number;
    mAtk: number;
    pDef: number;
    mDef: number;
    critChance: number;
    critDamage: number;
    critDmgResist: number;
    statusResist: number;
    accuracy: number;
    mAccuracy: number;
    evasion: number;
    mEvasion: number;
    battleRole?: BattleRole | string;
    secondaryBattleRole?: SecondaryBattleRole | string;
    classTier?: ClassTier | string;
    weaponMastery?: any;
    combatStyle?: any;
    unlockedCombatStyles?: any[];
    target?: any;
    skills?: any[];
    elementalDmgScore?: number;
    elementalResScore?: number;
    passiveSkillScore?: number;
}

/**
 * 버프/디버프/지원 스킬에서 유효 비율(%)을 추출하는 헬퍼 함수
 */
export const extractSupportSkillRatio = (sk: any): number => {
    if (!sk) return 0;
    let maxRatio = 0;
    const level = sk.level || 1;

    // 1. buffEffects 배열 검사
    if (Array.isArray(sk.buffEffects) && sk.buffEffects.length > 0) {
        let sumValue = 0;
        sk.buffEffects.forEach((ef: any) => {
            if (ef && typeof ef.value === 'number') {
                sumValue += ef.value;
            }
        });
        if (sumValue > maxRatio) maxRatio = sumValue;
    }

    // 2. debuffStatValue 검사
    if (typeof sk.debuffStatValue === 'number' && sk.debuffStatValue > maxRatio) {
        maxRatio = sk.debuffStatValue;
    }

    // 3. powerRatio 검사
    if (typeof sk.powerRatio === 'number') {
        let pRatio = sk.powerRatio;
        if (pRatio > 0 && pRatio < 10) pRatio *= 100;
        if (pRatio > maxRatio) maxRatio = pRatio;
    }

    // 4. effectFormula 및 description 문자열 파싱 (예: "STR +25%", "[DEF -30%]", "HP +40% 회복")
    const formula = String(sk.effectFormula || '') + ' ' + String(sk.description || '');
    if (formula) {
        const percentMatches = formula.matchAll(/([+-]?\d+(?:\.\d+)?)\s*%/g);
        for (const m of percentMatches) {
            const val = Math.abs(parseFloat(m[1]));
            if (val > 0 && val <= 500) {
                if (val > maxRatio) {
                    maxRatio = val;
                }
            }
        }
    }

    // 레벨에 따른 스케일링 (레벨당 약 1.5% 추가 보너스)
    if (maxRatio > 0 && level > 1) {
        maxRatio += (level - 1) * 1.5;
    }

    return maxRatio;
};

/**
 * 역할군별 맞춤형 종합/순수 전투력 산출 함수 (점감 기준선 없는 정직한 선형 산정)
 */
export const computeRefinedCombatPower = (factors: CombatPowerFactors): number => {
    const rawRole = String(factors.battleRole || '').trim();
    const secRole = String(factors.secondaryBattleRole || '').trim();
    const isDealer = rawRole === '딜러' || rawRole === BattleRole.DEALER;
    const isTanker = rawRole === '탱커' || rawRole === BattleRole.TANKER;
    const isSupporter = rawRole === '서포터' || rawRole === BattleRole.SUPPORTER ||
                        secRole === '힐러' || secRole === '버퍼' || secRole === '디버퍼' ||
                        rawRole === '올라운더' || rawRole === BattleRole.ALLROUNDER;

    // 1. 기초 6대 능력치 및 생명/마나 점수 (1포인트당 2점으로 재수정)
    let baseScore = 0;
    const str = factors.str || 0;
    const agi = factors.agi || 0;
    const int = factors.int || 0;
    const wis = factors.wis || 0;
    const def = factors.def || 0;
    const ctrl = factors.ctrl || 0;
    const hp = factors.hp || 0;
    const mp = factors.mp || 0;

    if (isSupporter) {
        // [서포터]: 지혜, 지능, 제어력에 추가 가중치(총 3.5점/포인트) 및 마나 자원 가중치 부여
        const supporterCoreStats = (int + wis + ctrl) * 3.5;
        const otherStats = (str + agi + def) * 2;
        const vitality = (hp * 0.15) + (mp * 0.3);
        baseScore = supporterCoreStats + otherStats + vitality;
    } else if (isTanker) {
        // [탱커]: 생명력(HP)을 방어의 핵심 자원으로 가중치 부여
        const allStats = (str + agi + int + wis + def + ctrl) * 2;
        const vitality = (hp * 0.3) + (mp * 0.1);
        baseScore = allStats + vitality;
    } else {
        // [딜러] 및 [역할없음]: 모든 6대 능력치 1포인트당 2점 균등 적용
        const allStats = (str + agi + int + wis + def + ctrl) * 2;
        const vitality = (hp * 0.15) + (mp * 0.15);
        baseScore = allStats + vitality;
    }

    // 2. 물리/마법 공격력 (점감 기준선 없이 정직한 선형 반영)
    const pAtk = factors.pAtk || 0;
    const mAtk = factors.mAtk || 0;
    const mainAtk = Math.max(pAtk, mAtk);
    const subAtk = Math.min(pAtk, mAtk);

    let atkScore = 0;
    if (isDealer) {
        // [딜러]: 주공격력 1.6배, 부공격력 0.4배 (과도한 2.2배 팽창 축소하여 타 포지션과 균형)
        atkScore = (mainAtk * 1.6) + (subAtk * 0.4);
    } else if (isTanker) {
        // [탱커]: 공격력 0.8배
        atkScore = (mainAtk * 0.8) + (subAtk * 0.2);
    } else if (isSupporter) {
        // [서포터]: 마법 중심 공격력 1.1배
        atkScore = (mainAtk * 1.1) + (subAtk * 0.3);
    } else {
        // [역할없음]: 기본 공격력 1.3배
        atkScore = (mainAtk * 1.3) + (subAtk * 0.3);
    }

    // 3. 클래스 해방에 따른 방어력 곱연산 계수 정규화 & 방어력 점수 (점감 기준선 없이 선형 반영)
    const resolvedTier = factors.classTier || resolveEntityClassTier(factors.target, factors.skills);
    let defMultiplier = 1.0;
    if (resolvedTier && CLASS_TIER_DEFENSE_TABLE[resolvedTier as ClassTier]) {
        defMultiplier = 1.0 + (CLASS_TIER_DEFENSE_TABLE[resolvedTier as ClassTier].defenseMultiplier || 0);
    }

    const rawPDef = factors.pDef || 0;
    const rawMDef = factors.mDef || 0;
    // 클래스 해방에 의한 방어력 곱연산(+45% ~ +200%)을 제거하여 순수 태생 방어력으로 정규화
    const normalizedPDef = rawPDef / defMultiplier;
    const normalizedMDef = rawMDef / defMultiplier;
    const avgDef = (normalizedPDef + normalizedMDef) / 2;

    let defScore = 0;
    if (isTanker) {
        // [탱커]: 순수 평균 방어력 기준 1.6배 (딜러 주공격력 1.6배와 완벽하게 대등한 계수!)
        defScore = avgDef * 1.6;
    } else if (isDealer) {
        // [딜러]: 순수 평균 방어력 기준 0.8배
        defScore = avgDef * 0.8;
    } else if (isSupporter) {
        // [서포터]: 순수 평균 방어력 기준 1.1배
        defScore = avgDef * 1.1;
    } else {
        // [역할없음]: 순수 평균 방어력 기준 1.2배
        defScore = avgDef * 1.2;
    }

    const combatStatsScore = atkScore + defScore;

    // 4. 치명타, 저항, 치명타 피해 감소 (기본치 초과 증가분만 반영)
    // 치명타율 기본 5% 초과분만 반영 (기본 5%일 때는 0점)
    const extraCritChance = Math.max(0, (factors.critChance || 0) - 5);
    // 치명타 피해량 기본 1.4배 초과분만 반영 (기본 1.4배일 때는 0점)
    const extraCritDamage = Math.max(0, (factors.critDamage || 1.4) - 1.4);
    const critDmgResist = Math.max(0, factors.critDmgResist || 0);
    const statusResist = Math.max(0, factors.statusResist || 0);

    let critScore = 0;
    let resistScore = 0;

    if (isDealer) {
        // [딜러]: 치명타 확률과 치명타 피해량 (기본치 초과분)
        critScore = (extraCritChance * 70) + (extraCritDamage * 2000) + (critDmgResist * 40);
        resistScore = statusResist * 40;
    } else if (isTanker) {
        // [탱커]: 상태이상 저항과 치명타 피해 감소에 딜러 치명타와 대등한 강력한 가중치 부여
        critScore = (extraCritChance * 35) + (extraCritDamage * 1000) + (critDmgResist * 110);
        resistScore = statusResist * 110;
    } else if (isSupporter) {
        // [서포터]: 상태이상 저항 및 수호
        critScore = (extraCritChance * 40) + (extraCritDamage * 1200) + (critDmgResist * 70);
        resistScore = statusResist * 110;
    } else {
        // [역할없음]: 기본 균형 계산
        critScore = (extraCritChance * 50) + (extraCritDamage * 1500) + (critDmgResist * 60);
        resistScore = statusResist * 70;
    }

    // 5. 명중률 및 회피율 (명중률 기본 85% 초과 증가분만 반영)
    // 물리 명중과 마법 명중 모두 기본 85%를 초과한 순수 증가분만 합산
    const extraPAcc = Math.max(0, (factors.accuracy || 85) - 85);
    const extraMAcc = Math.max(0, (factors.mAccuracy || 85) - 85);
    const extraAccuracy = extraPAcc + extraMAcc;
    const evasion = (factors.evasion || 0) + (factors.mEvasion || 0);

    let utilityScore = 0;
    if (isDealer) {
        // [딜러]: 초과 명중 1당 15점, 회피 1당 8점
        utilityScore = (extraAccuracy * 15) + (evasion * 8);
    } else if (isTanker) {
        // [탱커]: 초과 명중 1당 10점, 회피 1당 6점
        utilityScore = (extraAccuracy * 10) + (evasion * 6);
    } else if (isSupporter) {
        // [서포터]: 초과 마법 적중 15점, 회피 1당 7점
        utilityScore = (extraAccuracy * 15) + (evasion * 7);
    } else {
        // [역할없음]: 초과 명중 1당 12점, 회피 1당 7점
        utilityScore = (extraAccuracy * 12) + (evasion * 7);
    }

    // 6. 속성 피해 및 속성 저항
    const elementalScore = (factors.elementalDmgScore || 0) + (factors.elementalResScore || 0);

    // 7. 패시브 스킬 보너스
    const passiveScore = factors.passiveSkillScore || 0;

    // 8. 클래스 해방 등급별 확정 정수 전투력 가산
    // - 퍼스트 클래스: +1,000
    // - 세컨드 클래스: +3,000
    // - 라스트 클래스: +10,000
    // - 파이널 클래스: +100,000
    let classTierBonus = 0;
    if (resolvedTier === ClassTier.FINAL || resolvedTier === 'FINAL' || resolvedTier === '파이널') {
        classTierBonus = 100000;
    } else if (resolvedTier === ClassTier.LAST || resolvedTier === 'LAST' || resolvedTier === '라스트') {
        classTierBonus = 10000;
    } else if (resolvedTier === ClassTier.SECOND || resolvedTier === 'SECOND' || resolvedTier === '세컨드') {
        classTierBonus = 3000;
    } else if (resolvedTier === ClassTier.FIRST || resolvedTier === 'FIRST' || resolvedTier === '퍼스트') {
        classTierBonus = 1000;
    }

    // 9. 최고 무기 숙련도 점수 (최고 숙련도 레벨 × 50점, 최대 Lv.100 기준 5,000점)
    let maxMasteryLevel = 0;
    const wm = factors.weaponMastery || (factors.target as any)?.weaponMastery;
    if (wm && typeof wm === 'object') {
        Object.values(wm).forEach((entry: any) => {
            if (entry && typeof entry.level === 'number') {
                maxMasteryLevel = Math.max(maxMasteryLevel, entry.level);
            }
        });
    }
    const weaponMasteryScore = Math.min(100, Math.max(0, maxMasteryLevel)) * 50;

    // 10. 해방된 전투 스타일 차수 보너스 (1차 +1,000 / 2차 +2,000 / 3차 +5,000 / 4차 +20,000)
    let maxStyleTier: number = 0;
    const cStyle = factors.combatStyle || (factors.target as any)?.combatStyle;
    if (cStyle && COMBAT_STYLE_CONFIG[cStyle as CombatStyle]) {
        maxStyleTier = Math.max(maxStyleTier, COMBAT_STYLE_CONFIG[cStyle as CombatStyle].tier || 0);
    }
    const unlockedStyles = factors.unlockedCombatStyles || (factors.target as any)?.unlockedCombatStyles;
    if (Array.isArray(unlockedStyles)) {
        unlockedStyles.forEach((s: any) => {
            if (s && COMBAT_STYLE_CONFIG[s as CombatStyle]) {
                maxStyleTier = Math.max(maxStyleTier, COMBAT_STYLE_CONFIG[s as CombatStyle].tier || 0);
            }
        });
    }

    let combatStyleTierBonus = 0;
    if (maxStyleTier >= 4) {
        combatStyleTierBonus = 20000;
    } else if (maxStyleTier === 3) {
        combatStyleTierBonus = 5000;
    } else if (maxStyleTier === 2) {
        combatStyleTierBonus = 2000;
    } else if (maxStyleTier === 1) {
        combatStyleTierBonus = 1000;
    }

    // 11. 최고 스킬 위력 및 버프/디버프 배율 점수
    // [사용자 요구사항] 버프/디버프 스킬의 경우, 광역은 1/2 반영하여 가장 높은 버프 1개와 가장 높은 디버프 1개의 비율만 전투력에 반영
    let maxAtkSkillScore = 0;
    let maxBuffEffectiveRatio = 0;
    let bestBuffSkillScore = 0;
    let maxDebuffEffectiveRatio = 0;
    let bestDebuffSkillScore = 0;
    let maxGeneralUtilScore = 0;

    const skillList = factors.skills || (factors.target as any)?.skills;
    if (Array.isArray(skillList)) {
        skillList.forEach((sk: any) => {
            if (!sk) return;
            const level = sk.level || 1;
            const skType = String(sk.type || '').toUpperCase();
            
            // 광역 여부 판별 (광역 스킬은 비율을 1/2 반영하여 비교)
            const isAoE = sk.targetType === 'aoe' || sk.targetType === 'all' || sk.targetType === 'party' || 
                          String(sk.targetType).includes('광역') || String(sk.targetType).includes('전체') ||
                          String(sk.name).includes('광역');
            const aoeMultiplier = isAoE ? 0.5 : 1.0;

            const isDebuff = skType.includes('DEBUFF') || 
                             skType.includes('디버프') || 
                             Boolean(sk.debuffStatValue) || 
                             String(sk.effectFormula || '').includes('Debuff:') ||
                             String(sk.effectFormula || '').includes('-%');

            const isBuff = skType.includes('BUFF') || 
                           skType.includes('HEAL') || 
                           skType.includes('SUPPORT') || 
                           skType.includes('버프') || 
                           skType.includes('회복') || 
                           skType.includes('치유') || 
                           skType.includes('보조') ||
                           (Array.isArray(sk.buffEffects) && sk.buffEffects.length > 0) ||
                           String(sk.effectFormula || '').includes('BUFF:');

            const rawSupportRatio = extractSupportSkillRatio(sk);
            // 광역 스킬은 비율을 1/2 반영하여 평가
            const effectiveSupportRatio = rawSupportRatio * aoeMultiplier;

            const baseLevelScore = Math.floor(level * 250);
            const ratioMultiplier = isSupporter ? 45 : 30;
            const ratioScore = Math.floor(effectiveSupportRatio * ratioMultiplier);
            const totalSupportScore = baseLevelScore + ratioScore;

            if (isDebuff && !isBuff) {
                // 순수 디버프 스킬: 광역 1/2 반영한 유효 비율이 가장 높은 스킬 1개만 선정
                if (effectiveSupportRatio > maxDebuffEffectiveRatio || 
                   (effectiveSupportRatio === maxDebuffEffectiveRatio && totalSupportScore > bestDebuffSkillScore)) {
                    maxDebuffEffectiveRatio = effectiveSupportRatio;
                    bestDebuffSkillScore = totalSupportScore;
                }
            } else if (isBuff && !isDebuff) {
                // 순수 버프/치유 스킬: 광역 1/2 반영한 유효 비율이 가장 높은 스킬 1개만 선정
                if (effectiveSupportRatio > maxBuffEffectiveRatio || 
                   (effectiveSupportRatio === maxBuffEffectiveRatio && totalSupportScore > bestBuffSkillScore)) {
                    maxBuffEffectiveRatio = effectiveSupportRatio;
                    bestBuffSkillScore = totalSupportScore;
                }
            } else if (isBuff && isDebuff) {
                // 버프와 디버프 복합 효과 스킬
                if (effectiveSupportRatio > maxBuffEffectiveRatio || 
                   (effectiveSupportRatio === maxBuffEffectiveRatio && totalSupportScore > bestBuffSkillScore)) {
                    maxBuffEffectiveRatio = effectiveSupportRatio;
                    bestBuffSkillScore = totalSupportScore;
                }
                if (effectiveSupportRatio > maxDebuffEffectiveRatio || 
                   (effectiveSupportRatio === maxDebuffEffectiveRatio && totalSupportScore > bestDebuffSkillScore)) {
                    maxDebuffEffectiveRatio = effectiveSupportRatio;
                    bestDebuffSkillScore = totalSupportScore;
                }
            } else {
                let ratio = sk.powerRatio || 0;
                if (ratio > 0 && ratio < 10) {
                    ratio = ratio * 100;
                }

                if (ratio > 0) {
                    // 공격/위력형 스킬
                    const levelScaledRatio = ratio + Math.max(0, (level - 1) * 3);
                    const score = Math.max(0, Math.floor(levelScaledRatio - 100)) * 10;
                    if (score > maxAtkSkillScore) {
                        maxAtkSkillScore = score;
                    }
                } else {
                    // 기타 위력 배율 없는 보조 스킬
                    const utilScore = Math.floor(level * 250);
                    if (utilScore > maxGeneralUtilScore) {
                        maxGeneralUtilScore = utilScore;
                    }
                }
            }
        });
    }

    // 최종 스킬 점수 산출
    let maxSkillPowerScore = 0;
    if (isSupporter) {
        // 서포터: 가장 높은 버프 1개 + 가장 높은 디버프 1개의 비율 점수 반영 (공격 스킬이 더 크면 공격 스킬도 고려)
        const supportCombinedScore = bestBuffSkillScore + bestDebuffSkillScore;
        maxSkillPowerScore = Math.max(supportCombinedScore, maxAtkSkillScore, maxGeneralUtilScore);
    } else {
        // 타 역할군: 가장 높은 단일 기술 점수 반영
        maxSkillPowerScore = Math.max(maxAtkSkillScore, bestBuffSkillScore, bestDebuffSkillScore, maxGeneralUtilScore);
    }

    // 최종 총합 (점감 곡선 없는 정직한 합산)
    const totalCP = Math.floor(
        baseScore + 
        combatStatsScore + 
        critScore + 
        resistScore + 
        utilityScore + 
        elementalScore + 
        passiveScore +
        classTierBonus +
        weaponMasteryScore +
        combatStyleTierBonus +
        maxSkillPowerScore
    );

    return Math.max(1, totalCP);
};
