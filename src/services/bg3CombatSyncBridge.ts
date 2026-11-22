/**
 * BG3 통합 전투 ↔ 정규 전투 엔진(useGame.ts / utils.ts / CombatUtils / CombatShieldService / BuffDiminishingManager)
 * 100% 패리티 SSOT(Single Source of Truth) 브릿지 모듈
 *
 * - 모든 버프/디버프/보호막/상태이상을 `unit.sourceEntity.statusEffects`에 정규 포맷(ActiveStatus)으로 기록
 * - `calculateFinalStats` / `calculateDerivedStats` / `calculateDamage`가 100% 실시간으로 버프/디버프를 반영
 * - `useGame.ts`와 동일한 레벨 성장(`getTierBuffScale`), 기운 조화/상충 점감(`applyBuffWithDiminishingPriority`),
 *   지속 턴(`getSkillStatusDuration`), 회복 공식(`(WIS+INT)*4`), 부활(`RESURRECTION`), 마나 쉴드(`CombatShieldService`),
 *   도트 피해(`calculateDotDamage`), 디버프 저항(`calculateDebuffSuccessRate`), 턴 패시브(`processTurnStart`, `processPassiveTurnEffects`),
 *   신화/마계 피격/타격 옵션(`ABSORB`, `DEMONIZE`, `CURSE_SPREAD`, `REFLECT`, `processEquipmentOnHit`)을 완벽히 실행합니다.
 */

import {
    ActiveStatus,
    Character,
    ClassTier,
    Companion,
    Enemy,
    Item,
    MagyeOptionType,
    MythicOptionType,
    Skill,
    SkillType,
    Stats
} from '../types';
import { STATUS_AILMENTS_DATA, STATUS_AILMENTS_LIST } from '../constants';
import {
    applyConsumableEffect,
    calculateDamage,
    calculateDebuffSuccessRate,
    calculateDerivedStats,
    calculateFinalStats
} from '../utils';
import { getTierBuffScale } from './skillBuffScaleService';
import {
    applyBuffWithDiminishingPriority,
    refreshBuffDiminishingStatus,
    resolveSkillShinryokuType
} from './buffDiminishingManager';
import { CombatShieldService } from './combatShieldService';
import * as CombatUtils from './combatUtils';
import { calculateDotDamage } from './dotDamageService';
import { filterDebuffsForCleanse, isDebuffStatus } from './statusCleanseService';
import { processEquipmentOnHit } from './equipmentAilmentService';
import { formatKoreanNumber } from './numberFormatService';
import { isRealTimeElixir } from './elixirService';
import { elixirRealtimeService } from './elixirRealtimeService';
import {
    applyBuffMassCleanse,
    applyDebuffDefenseShatter,
    getEchoAftershockDamage,
    getFocusFusionDamageMultiplier,
    isSkillAuraErosion,
    isSkillAuraTranscend
} from './aoeSkillEnhanceService';
import { Bg3ActiveBuff, Bg3StatusEffect, Bg3Unit } from './bg3ArenaEngine';

export { getFocusFusionDamageMultiplier, getEchoAftershockDamage };

const normalizeStatKey = (raw: string): string | null => {
    const s = raw.trim().toLowerCase();
    if (!s) return null;
    if (s.includes('물리공격') || s.includes('물리 공격') || s.includes('p.atk') || s.includes('patk') || s === '물공') return 'P.Atk';
    if (s.includes('마법공격') || s.includes('마법 공격') || s.includes('m.atk') || s.includes('matk') || s === '마공' || s.includes('주문력')) return 'M.Atk';
    if (s.includes('물리방어') || s.includes('물리 방어') || s.includes('p.def') || s.includes('pdef') || s === '물방') return 'P.Def';
    if (s.includes('마법방어') || s.includes('마법 방어') || s.includes('m.def') || s.includes('mdef') || s === '마방') return 'M.Def';
    if (s.includes('공격력') || s === 'atk') return 'P.Atk';
    if (s.includes('방어력') || s === 'def' || s === '방어') return 'DEF';
    if (s.includes('근력') || s.includes('힘') || s === 'str') return 'STR';
    if (s.includes('지능') || s === 'int') return 'INT';
    if (s.includes('지혜') || s === 'wis') return 'WIS';
    if (s.includes('민첩') || s.includes('속도') || s === 'agi') return 'AGI';
    if (s.includes('통제') || s.includes('제어') || s === 'ctrl') return 'CTRL';
    if (s.includes('치명') || s.includes('크리') || s === 'crit') return 'Crit';
    if (s.includes('명중') || s === 'acc') return 'Acc';
    if (s.includes('회피') || s === 'eva') return 'Eva';
    if (s.includes('모든 스탯') || s.includes('전체 스탯') || s.includes('올스탯')) return 'ALL';
    return null;
};

const isAttackSkillWithBuff = (skill?: Skill | null): boolean => {
    if (!skill) return false;
    if (skill.type !== SkillType.PHYSICAL && skill.type !== SkillType.MAGIC) return false;
    if (Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0) return true;
    const f = skill.effectFormula || '';
    return /\[버프:|BUFF:|MANA_SHIELD|마나\s*쉴드|HP\s*회복|MP\s*회복|RESURRECT|부활/i.test(f);
};

/**
 * 스킬이 부활 스킬인지 판별 (buffEffects.RESURRECTION 및 effectFormula/description 모두 지원)
 */
export const isBg3ResurrectionSkill = (skill?: Skill | null): boolean => {
    if (!skill) return false;
    if (CombatUtils.isResurrectionSkill(skill)) return true;
    if (Array.isArray(skill.buffEffects) && skill.buffEffects.some(ef => ef.type === 'RESURRECTION')) {
        return true;
    }
    const text = `${skill.effectFormula || ''} ${skill.description || ''}`;
    return /RESURRECT|부활/i.test(text);
};

/**
 * 부활 스킬의 HP 회복 비율(%) 추출
 */
export const getBg3ResurrectionPercent = (skill?: Skill | null): number => {
    if (!skill) return 50;
    const resEf = Array.isArray(skill.buffEffects)
        ? skill.buffEffects.find(ef => ef.type === 'RESURRECTION')
        : undefined;
    if (resEf && typeof resEf.value === 'number' && resEf.value > 0) {
        return Math.min(100, resEf.value);
    }
    const formula = `${skill.effectFormula || ''} ${skill.description || ''}`;
    const m1 = formula.match(/RESURRECT\s*[:\s]*(\d+(?:\.\d+)?)\s*%/i);
    if (m1) return Math.min(100, Math.max(10, parseFloat(m1[1])));
    const m2 = formula.match(/부활\s*(?:HP)?\s*[:\s]*(\d+(?:\.\d+)?)\s*%/i);
    if (m2) return Math.min(100, Math.max(10, parseFloat(m2[1])));
    return 50;
};

/**
 * 유닛의 sourceEntity.statusEffects에서 총 보호막량 계산
 */
export const getEntityTotalShield = (entity: any): number => {
    if (!entity || !Array.isArray(entity.statusEffects)) return 0;
    return (entity.statusEffects as ActiveStatus[]).reduce((sum, e: any) => {
        if (!e) return sum;
        const isShield =
            e.name?.includes('마나 쉴드') ||
            e.name?.includes('보호막') ||
            e.name?.includes('쉴드') ||
            e.name?.includes('Shield') ||
            e.name?.includes('Barrier') ||
            (e.effect && (e.effect.includes('보호막') || e.effect.includes('피해를 흡수')));
        return isShield ? sum + Math.max(0, Number(e.val || 0)) : sum;
    }, 0);
};

/**
 * SSOT 핵심 동기화: `unit.sourceEntity` (및 `statusEffects`) → `Bg3Unit` 전체 필드 동기화
 * - `calculateFinalStats`를 호출하여 STR/INT/AGI/WIS/DEF/CTRL, maxHp, maxMp를 즉시 최신화
 * - `unit.activeBuffs`, `unit.activeStatuses`, `unit.shieldHp`를 `sourceEntity.statusEffects`와 1:1 일치시킴
 * - `calculateDamage`가 이미 `sourceEntity.statusEffects`를 반영하므로, UI용 `activeBuffs`의 `atkMult/defMult`는 1로 유지해 이중 증폭을 방지
 */
export const syncUnitFromSourceEntity = (unit: Bg3Unit): Bg3Unit => {
    const entity = unit.sourceEntity as any;
    if (!entity) return unit;

    if (!Array.isArray(entity.statusEffects)) {
        entity.statusEffects = [];
    }
    refreshBuffDiminishingStatus(entity.statusEffects, entity.shinryokuType);

    // HP/MP sourceEntity 동기화
    if (entity.stats) {
        entity.stats.hp = Math.max(0, Math.floor(unit.hp));
        entity.stats.mp = Math.max(0, Math.floor(unit.mp));
    }
    if ('hp' in entity && !('companions' in entity)) {
        entity.hp = Math.max(0, Math.floor(unit.hp));
    }
    if ('isDead' in entity) {
        entity.isDead = unit.hp <= 0;
    }

    // 최종 스탯 실시간 재계산
    let finalStats: Stats | null = null;
    try {
        if ('stats' in entity || 'equipment' in entity) {
            finalStats = calculateFinalStats(entity).finalStats;
        }
    } catch {
        finalStats = null;
    }

    const totalShield = getEntityTotalShield(entity);
    const nextActiveBuffs: Bg3ActiveBuff[] = [];
    const nextActiveStatuses: Bg3StatusEffect[] = [];

    for (const st of entity.statusEffects as ActiveStatus[]) {
        if (!st || !st.name) continue;
        const turns = typeof st.duration === 'number' ? st.duration : 1;
        const debuffFlag = isDebuffStatus(st);
        const isAilment = STATUS_AILMENTS_LIST.includes(st.name);

        if (debuffFlag || isAilment) {
            const isDot = ['화상', '출혈', '중독', '소멸', '흡정', '지속 전장 결계'].includes(st.name);
            const isCc = ['기절', '빙결', '마비', '수면', '소멸', '감전', '속박', '혼란', '침묵', '공포', '신력 브레이크'].includes(st.name);
            nextActiveStatuses.push({
                name: st.name,
                kind: isCc ? 'cc' : isDot ? 'dot' : 'debuff',
                turns,
                color: isCc ? '#38bdf8' : isDot ? '#f97316' : '#ef4444'
            });
        } else {
            const isShield = st.name.includes('마나 쉴드') || st.name.includes('보호막') || st.name.includes('쉴드');
            const isZone = st.name.includes('결계');
            const dimTag = typeof st.diminishedRate === 'number' && st.diminishedRate < 100
                ? ` (${st.diminishedRate}% 적용)`
                : '';
            nextActiveBuffs.push({
                name: st.name,
                atkMult: 1, // calculateDamage가 sourceEntity.statusEffects에서 직접 계산하므로 중복 배율 방지
                defMult: 1,
                turns,
                color: isShield ? '#38bdf8' : isZone ? '#34d399' : '#facc15',
                icon: st.icon || (isShield ? '🛡️' : isZone ? '🌿' : '✨'),
                imageUrl: st.imageUrl,
                effectSummary: `${st.effect || st.name}${dimTag}`
            });
        }
    }

    const nextMaxHp = Math.max(unit.maxHp, finalStats?.maxHp || unit.maxHp);
    const nextMaxMp = Math.max(unit.maxMp, finalStats?.maxMp || unit.maxMp);

    return {
        ...unit,
        maxHp: nextMaxHp,
        maxMp: nextMaxMp,
        hp: Math.min(nextMaxHp, Math.max(0, unit.hp)),
        mp: Math.min(nextMaxMp, Math.max(0, unit.mp)),
        str: finalStats?.str ?? unit.str,
        int: finalStats?.int ?? unit.int,
        agi: finalStats?.agi ?? unit.agi,
        wis: finalStats?.wis ?? unit.wis,
        def: finalStats?.def ?? unit.def,
        ctrl: finalStats?.ctrl ?? unit.ctrl,
        shieldHp: totalShield,
        maxShieldHp: Math.max(unit.maxShieldHp || 0, totalShield),
        activeBuffs: nextActiveBuffs,
        activeStatuses: nextActiveStatuses
    };
};

/**
 * 전투 개시 시 패시브 마나 쉴드 등 자동 부여 (`CombatUtils.applyCombatStartPassives`)
 */
export const applyBg3CombatStartPassives = (units: Bg3Unit[]): { units: Bg3Unit[]; logs: string[] } => {
    const logs: string[] = [];
    const nextUnits = units.map(u => {
        if (!u.sourceEntity) return u;
        try {
            const res = CombatUtils.applyCombatStartPassives(u.sourceEntity as any);
            if (res.activeEffects) {
                (u.sourceEntity as any).statusEffects = res.activeEffects;
            }
            if (res.log && res.log.trim()) {
                res.log.trim().split('\n').forEach(l => l.trim() && logs.push(l.trim()));
            }
        } catch {
            // ignore
        }
        return syncUnitFromSourceEntity(u);
    });
    return { units: nextUnits, logs };
};

export interface Bg3BuffApplyResult {
    unit: Bg3Unit;
    logs: string[];
    healAmount: number;
    mpGain: number;
    shieldGain: number;
    revived: boolean;
    buffApplied: boolean;
}

/**
 * `useGame.ts`의 `applyStatBuff` + `RESURRECTION` 100% 정규 구현
 * - 죽은 아군에게 부활 스킬 시전 시 즉시 부활(`alive=true`, `sourceEntity.isDead=false`, HP 회복)
 * - 복합 스킬(부활+버프/힐, 공격+버프) 모두 독립적으로 정상 작동
 * - `sourceEntity.statusEffects`에 표준 포맷 기록 + 기운 조화/상충 점감(`applyBuffWithDiminishingPriority`)
 */
export const applyBg3SkillBuffs = (
    casterUnit: Bg3Unit,
    targetUnit: Bg3Unit,
    skill: Skill,
    isAoe: boolean
): Bg3BuffApplyResult => {
    const logs: string[] = [];
    let workingUnit = { ...targetUnit };
    const target = workingUnit.sourceEntity as any;
    const caster = casterUnit.sourceEntity as any;

    let healAmount = 0;
    let mpGain = 0;
    let shieldGain = 0;
    let revived = false;
    let buffApplied = false;

    if (!target) {
        return { unit: workingUnit, logs, healAmount, mpGain, shieldGain, revived, buffApplied };
    }
    if (!Array.isArray(target.statusEffects)) target.statusEffects = [];

    // 1. 부활 처리 (독립적으로 최우선 수행 — 전투불능 대상도 반드시 처리!)
    const isRes = isBg3ResurrectionSkill(skill);
    if (isRes && workingUnit.team === 'ally' && (workingUnit.hp <= 0 || target.isDead)) {
        const percent = getBg3ResurrectionPercent(skill);
        const targetFinal = calculateFinalStats(target).finalStats;
        const maxHpVal = Math.max(workingUnit.maxHp || 100, targetFinal.maxHp || 100);
        const revivedHp = Math.max(1, Math.floor(maxHpVal * (percent / 100)));

        target.isDead = false;
        if (target.stats) target.stats.hp = revivedHp;
        workingUnit.hp = revivedHp;
        workingUnit.maxHp = maxHpVal;
        healAmount += revivedHp;
        revived = true;
        buffApplied = true;
        logs.push(`✨ ${workingUnit.name}이(가) [${skill.name}] 효과로 부활했습니다! (HP ${percent}% / +${formatKoreanNumber(revivedHp)})`);
    }

    // 전투불능 상태 그대로면 일반 버프/회복은 적용하지 않음 (useGame.ts:3160 정규 규칙)
    if (workingUnit.hp <= 0) {
        return { unit: syncUnitFromSourceEntity(workingUnit), logs, healAmount, mpGain, shieldGain, revived, buffApplied };
    }

    const formula = skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '';
    const hasBuffEffects = Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0;
    if (!formula && !hasBuffEffects) {
        return { unit: syncUnitFromSourceEntity(workingUnit), logs, healAmount, mpGain, shieldGain, revived, buffApplied };
    }

    const duration = CombatUtils.getSkillStatusDuration(skill, undefined, true);
    const skillLevel = skill.level || 1;
    const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND || (skill as any).tier === '인연' || (skill as any).tier === '인연스킬')
        ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
        : skill.tier;

    const isAttackWithBuff = isAttackSkillWithBuff(skill) || skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
    const baseBuffScale = getTierBuffScale(effectiveTier);
    const buffScaleBonus = (skill.finalEnhanceData?.buffScaleBonus || 0) || (skill.finalEnhanceData?.debuffScaleBonus || 0) || (() => {
        const m = formula.match(/(?:버프|디버프) (?:비율 )?계수 증가 \+(\d+(?:\.\d+)?)%/);
        return m ? parseFloat(m[1]) : 0;
    })();
    const buffScale = (isAttackWithBuff ? baseBuffScale * 0.5 : baseBuffScale) + buffScaleBonus;
    const buffLevelGrowth = Math.max(0, skillLevel - 1) * buffScale;

    const appliedList: { stat: string; val: number; text: string }[] = [];
    const casterFinal = caster ? calculateFinalStats(caster).finalStats : (target.stats || {});
    const targetFinal = calculateFinalStats(target).finalStats;

    if (hasBuffEffects) {
        for (const ef of skill.buffEffects!) {
            if (ef.type === 'STAT_BOOST') {
                const stat = ef.targetStat || 'STR';
                const val = (ef.value || 10) + buffLevelGrowth;
                const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                appliedList.push({ stat, val, text: `${stat} +${formatted}%` });
            } else if (ef.type === 'HP_RECOV') {
                const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
                const totalPercent = (ef.value || 10) + buffLevelGrowth;
                const isPoisoned = Array.isArray(target.statusEffects) && target.statusEffects.some((e: ActiveStatus) => e.name === '중독');
                const baseHeal = Math.max(10, Math.floor((sumWisInt * 4) * (totalPercent / 100)));
                const healVal = isPoisoned ? Math.max(5, Math.floor(baseHeal * 0.5)) : baseHeal;
                const maxHpVal = Math.max(workingUnit.maxHp, targetFinal.maxHp || 0, workingUnit.hp);
                const newHp = workingUnit.hp + healVal;
                let overheal = 0;
                if (newHp > maxHpVal) {
                    overheal = newHp - maxHpVal;
                    workingUnit.hp = maxHpVal;
                } else {
                    workingUnit.hp = newHp;
                }
                if (target.stats) target.stats.hp = workingUnit.hp;
                healAmount += healVal - overheal;

                const hasOverhealShield = Boolean(
                    skill.finalEnhanceData?.overhealShield ||
                    formula.includes('초과 치유 마나 보호막')
                );
                if (hasOverhealShield && overheal > 0) {
                    const existingShield = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
                    if (existingShield) {
                        existingShield.val = (existingShield.val || 0) + overheal;
                        existingShield.duration = duration;
                        existingShield.effect = `피해를 흡수하는 마법 보호막 (${existingShield.val})`;
                    } else {
                        target.statusEffects.push({
                            name: '마나 쉴드',
                            duration,
                            effect: `피해를 흡수하는 마법 보호막 (${overheal})`,
                            val: overheal,
                            isPassive: false,
                            imageUrl: skill.imageUrl,
                            icon: skill.icon || (skill as any).iconName
                        } as any);
                    }
                    shieldGain += overheal;
                    logs.push(`💚 ${workingUnit.name} HP +${formatKoreanNumber(healVal - overheal)} (초과 치유 +${formatKoreanNumber(overheal)} 마나 보호막 전환)`);
                } else {
                    logs.push(`💚 ${workingUnit.name} HP +${formatKoreanNumber(healVal)} 회복! (WIS+INT 비례)`);
                }
                buffApplied = true;
            } else if (ef.type === 'MP_RECOV') {
                const isCaster = workingUnit.id === casterUnit.id;
                if (isAoe && isCaster) {
                    // 광역 MP 회복 시 시전자 제외 (무한 자가 수급 방지)
                } else {
                    const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
                    const totalPercent = (ef.value || 10) + buffLevelGrowth;
                    const recovMp = Math.max(5, Math.floor(sumWisInt * (totalPercent / 100)));
                    const maxMpVal = Math.max(workingUnit.maxMp, targetFinal.maxMp || 0, workingUnit.mp);
                    workingUnit.mp = Math.min(maxMpVal, workingUnit.mp + recovMp);
                    if (target.stats) target.stats.mp = workingUnit.mp;
                    mpGain += recovMp;
                    logs.push(`🔷 ${workingUnit.name} MP +${formatKoreanNumber(recovMp)} 회복!`);
                    buffApplied = true;
                }
            } else if (ef.type === 'ELEMENTAL_DMG_BOOST') {
                const el = ef.targetElement || '속성';
                const val = (ef.value || 10) + buffLevelGrowth;
                const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                appliedList.push({ stat: `${el} 피해`, val, text: `${el} 피해 +${formatted}%` });
            } else if (ef.type === 'ELEMENTAL_RES_BOOST') {
                const el = ef.targetElement || '속성';
                const val = (ef.value || 10) + buffLevelGrowth;
                const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                appliedList.push({ stat: `${el} 저항`, val, text: `${el} 저항 +${formatted}%` });
            } else if (ef.type === 'MANA_SHIELD') {
                const ratio = (ef.value || 20) + buffLevelGrowth;
                const shieldAmount = Math.max(50, Math.floor((casterFinal.maxMp || casterUnit.maxMp || 100) * (ratio / 100)));
                const existing = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
                if (existing) {
                    existing.val = Math.max(existing.val || 0, shieldAmount);
                    existing.duration = duration;
                    (existing as any).isPassive = false;
                    existing.effect = `피해를 흡수하는 마법 보호막 (${existing.val})`;
                    if (skill.imageUrl) existing.imageUrl = skill.imageUrl;
                    if (skill.icon || (skill as any).iconName) existing.icon = skill.icon || (skill as any).iconName;
                } else {
                    target.statusEffects.push({
                        name: '마나 쉴드',
                        duration,
                        effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`,
                        val: shieldAmount,
                        isPassive: false,
                        imageUrl: skill.imageUrl,
                        icon: skill.icon || (skill as any).iconName
                    } as any);
                }
                shieldGain += shieldAmount;
                logs.push(`🛡️ ${workingUnit.name} 마나 쉴드 생성 (+${formatKoreanNumber(shieldAmount)})`);
                buffApplied = true;
            } else if (ef.type === 'CLEANSE') {
                const ailmentsToRemove = ef.ailments || (ef.ailment ? [ef.ailment] : []);
                if (ailmentsToRemove.length > 0 && target.statusEffects) {
                    const before = target.statusEffects.length;
                    target.statusEffects = filterDebuffsForCleanse(target.statusEffects, ailmentsToRemove);
                    if (target.statusEffects.length < before) {
                        logs.push(`✨ ${workingUnit.name} 상태이상 해제 (${ailmentsToRemove.join(', ')})`);
                        buffApplied = true;
                    }
                }
            }
        }
    } else {
        // Formula 기반 파싱 (구형 스킬 및 커스텀 수식 지원)
        if (formula.includes('BUFF:ATK_UP')) {
            const val = +(20 + buffLevelGrowth).toFixed(1);
            appliedList.push({ stat: 'P.Atk', val, text: `P.Atk +${val}%` });
            appliedList.push({ stat: 'M.Atk', val, text: `M.Atk +${val}%` });
        }
        if (formula.includes('BUFF:DEF_UP')) {
            const val = +(20 + buffLevelGrowth).toFixed(1);
            appliedList.push({ stat: 'DEF', val, text: `DEF +${val}%` });
        }
        if (formula.includes('BUFF:AGI_UP')) {
            const val = +(20 + buffLevelGrowth).toFixed(1);
            appliedList.push({ stat: 'AGI', val, text: `AGI +${val}%` });
        }
        if (formula.includes('BUFF:ALL_UP')) {
            const val = +(15 + buffLevelGrowth).toFixed(1);
            ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'].forEach(st => {
                appliedList.push({ stat: st, val, text: `${st} +${val}%` });
            });
        }

        // 마나 쉴드 수식
        const shieldMatch = formula.match(/(?:MANA_SHIELD|마나\s*쉴드)\s*[:\s]*(\d+)?%?/i);
        if (shieldMatch || /MANA_SHIELD|마나\s*쉴드/i.test(formula)) {
            const baseVal = (shieldMatch && shieldMatch[1]) ? parseInt(shieldMatch[1], 10) : (skill.powerRatio || 20);
            const ratio = +(baseVal + buffLevelGrowth).toFixed(1);
            const shieldAmount = Math.max(50, Math.floor((casterFinal.maxMp || casterUnit.maxMp || 100) * (ratio / 100)));
            const existing = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
            if (existing) {
                existing.val = Math.max(existing.val || 0, shieldAmount);
                existing.duration = duration;
                (existing as any).isPassive = false;
                existing.effect = `피해를 흡수하는 마법 보호막 (${existing.val})`;
            } else {
                target.statusEffects.push({
                    name: '마나 쉴드',
                    duration,
                    effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`,
                    val: shieldAmount,
                    isPassive: false,
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName
                } as any);
            }
            shieldGain += shieldAmount;
            logs.push(`🛡️ ${workingUnit.name} 마나 쉴드 생성 (+${formatKoreanNumber(shieldAmount)})`);
            buffApplied = true;
        }

        // HP 회복 수식 폴백
        const hpHealMatch = formula.match(/(?:HP\s*회복|HP_RECOV|체력\s*회복|치유)\s*[:+]?\s*(\d+(?:\.\d+)?)%?/i);
        if (hpHealMatch && !isRes) {
            const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
            const totalPercent = parseFloat(hpHealMatch[1]) + buffLevelGrowth;
            const healVal = Math.max(10, Math.floor((sumWisInt * 4) * (totalPercent / 100)));
            const maxHpVal = Math.max(workingUnit.maxHp, targetFinal.maxHp || 0, workingUnit.hp);
            workingUnit.hp = Math.min(maxHpVal, workingUnit.hp + healVal);
            if (target.stats) target.stats.hp = workingUnit.hp;
            healAmount += healVal;
            logs.push(`💚 ${workingUnit.name} HP +${formatKoreanNumber(healVal)} 회복!`);
            buffApplied = true;
        }

        // 스탯 증가 % 추출 (공격+버프 복합 스킬은 [버프: ...] 블록만 추출)
        let targetFormulaForBuff = formula;
        if (isAttackWithBuff) {
            const buffBlockMatch = formula.match(/\[버프:\s*([^\]]+)\]/i);
            targetFormulaForBuff = buffBlockMatch ? buffBlockMatch[1] : '';
        }
        const cleanFormula = targetFormulaForBuff
            .replace(/\[성공률:[^\]]*\]/g, '')
            .replace(/\(\d+턴\)/g, '')
            .replace(/\(Lv당\+[^\)]*\)/g, '');
        const clauses = cleanFormula.split(/[,;\n\[\]]+/);
        for (const rawClause of clauses) {
            const clause = rawClause.trim();
            if (!clause || /MANA_SHIELD|회복|해제|RESURRECT|부활/i.test(clause)) continue;
            const m = clause.match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:증가|상승|up))?/i);
            if (m) {
                const stat = normalizeStatKey(m[1]);
                if (stat === 'ALL') {
                    const totalVal = Math.abs(parseFloat(m[2])) + buffLevelGrowth;
                    const fmt = Number.isInteger(totalVal) ? totalVal : parseFloat(totalVal.toFixed(1));
                    ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'].forEach(st => {
                        appliedList.push({ stat: st, val: totalVal, text: `${st} +${fmt}%` });
                    });
                } else if (stat) {
                    const totalVal = Math.abs(parseFloat(m[2])) + buffLevelGrowth;
                    const fmt = Number.isInteger(totalVal) ? totalVal : parseFloat(totalVal.toFixed(1));
                    appliedList.push({ stat, val: totalVal, text: `${stat} +${fmt}%` });
                }
            }
        }
    }

    // 광역 정화 옵션 (aoeSkillEnhanceService.applyBuffMassCleanse 정규 연동)
    const massCleanseLog = applyBuffMassCleanse(skill, target);
    if (massCleanseLog) {
        logs.push(`✨ ${massCleanseLog}`);
        buffApplied = true;
    }

    // 스탯 버프 SSOT 적용 (기운 조화/상충 점감 자동 적용!)
    if (appliedList.length > 0) {
        const desc = appliedList.map(a => a.text).join(', ');
        const skillElem = resolveSkillShinryokuType(skill, caster?.shinryokuType);
        const { effectDesc, logNote } = applyBuffWithDiminishingPriority(
            target,
            skill.name,
            desc,
            duration,
            appliedList[0].val,
            {
                imageUrl: skill.imageUrl,
                icon: skill.icon || (skill as any).iconName,
                skillElement: skillElem,
                forceFullAura: isSkillAuraTranscend(skill)
            }
        );
        logs.push(`✨ ${workingUnit.name} ← [${skill.name}] (${effectDesc}, ${duration}턴)${logNote}`);
        buffApplied = true;
    }

    // 지속 회복 결계 (체력/마나)
    if (skill.finalEnhanceData?.buffZoneType || formula.includes('지속 회복 결계') || (skill.type === SkillType.BUFF && skill.finalEnhanceData?.isBattlefieldZone)) {
        const zoneType = skill.finalEnhanceData?.buffZoneType || (formula.includes('MP') ? 'MP' : 'HP');
        const zoneName = zoneType === 'MP' ? '지속 마력 결계' : '지속 치유 결계';
        const effectDesc = zoneType === 'MP' ? '매 턴 MP 15% 회복' : '매 턴 HP 15% 회복';
        const zoneDuration = Math.floor(Math.random() * 2) + 2;
        target.statusEffects = target.statusEffects.filter((e: any) => e.name !== '지속 치유 결계' && e.name !== '지속 마력 결계');
        target.statusEffects.push({
            name: zoneName,
            duration: zoneDuration,
            effect: effectDesc,
            val: 15,
            imageUrl: skill.imageUrl,
            icon: skill.icon || (skill as any).iconName
        });
        logs.push(`🌿 ${workingUnit.name}에게 [${zoneName}] 형성! (${zoneDuration}턴간 ${effectDesc})`);
        buffApplied = true;
    }

    return {
        unit: syncUnitFromSourceEntity(workingUnit),
        logs,
        healAmount,
        mpGain,
        shieldGain,
        revived,
        buffApplied
    };
};

export interface Bg3DebuffApplyResult {
    unit: Bg3Unit;
    logs: string[];
    applied: boolean;
    resisted: boolean;
}

/**
 * `useGame.ts`의 `applyStatDebuff` + 상태이상 저항(`calculateDebuffSuccessRate`) 100% 정규 구현
 */
export const applyBg3SkillDebuffs = (
    casterUnit: Bg3Unit,
    targetUnit: Bg3Unit,
    skill: Skill
): Bg3DebuffApplyResult => {
    const logs: string[] = [];
    const target = targetUnit.sourceEntity as any;
    const caster = casterUnit.sourceEntity as any;
    if (!target || targetUnit.hp <= 0) {
        return { unit: targetUnit, logs, applied: false, resisted: false };
    }
    if (!Array.isArray(target.statusEffects)) target.statusEffects = [];

    const casterFinal = caster ? calculateFinalStats(caster).finalStats : ({ ctrl: casterUnit.ctrl } as Stats);
    const targetFinal = calculateFinalStats(target).finalStats;
    const isPureDebuff = skill.type === SkillType.DEBUFF;

    // 1. 순수 디버프 스킬은 CTRL 저항 판정
    if (isPureDebuff) {
        const successRate = calculateDebuffSuccessRate(casterFinal, targetFinal, skill.level || 1, caster?.skills, skill.name);
        const roll = Math.random() * 100;
        if (roll >= successRate) {
            logs.push(`🛡️ ${targetUnit.name}이(가) [${skill.name}] 디버프를 저항했습니다! (성공률 ${Math.round(successRate)}%)`);
            return { unit: targetUnit, logs, applied: false, resisted: true };
        }
    }

    let applied = false;
    const rawFormula = skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '';
    const duration = CombatUtils.getSkillStatusDuration(skill, undefined, true);
    const skillLevel = skill.level || 1;
    const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND)
        ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
        : skill.tier;
    const isAttackSkill = skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
    const baseDebuffScale = getTierBuffScale(effectiveTier);
    const debuffScaleBonus = (skill.finalEnhanceData?.debuffScaleBonus || 0) || (skill.finalEnhanceData?.buffScaleBonus || 0);
    const debuffScale = (isAttackSkill ? baseDebuffScale * 0.5 : baseDebuffScale) + debuffScaleBonus;
    const debuffLevelGrowth = Math.max(0, skillLevel - 1) * debuffScale;

    const appliedList: { stat: string; val: number; text: string }[] = [];

    if ((skill as any).debuffStat && (skill as any).debuffValue) {
        const stat = normalizeStatKey(String((skill as any).debuffStat));
        if (stat) {
            const totalValue = Math.min(90, +(Math.abs(Number((skill as any).debuffValue)) + debuffLevelGrowth).toFixed(1));
            appliedList.push({ stat, val: totalValue, text: `${stat} -${totalValue}%` });
        }
    }

    const cleanFormula = rawFormula
        .replace(/\[성공률:[^\]]*\]/g, '')
        .replace(/\(\d+턴\)/g, '')
        .replace(/\(Lv당\+[^\)]*\)/g, '');
    const clauses = cleanFormula.split(/[,;\n\[\]]+/);
    for (const rawClause of clauses) {
        const clause = rawClause.trim();
        if (!clause) continue;
        // 공격 스킬의 경우 명시적 감소/하락/- 표기가 있을 때만 디버프로 파싱
        if (isAttackSkill && !/감소|하락|down|-\d|디버프|Debuff/i.test(clause)) continue;
        const m = clause.replace(/^Debuff:\s*|^디버프:\s*/i, '').match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:감소|하락|down))?/i);
        if (m) {
            const stat = normalizeStatKey(m[1]);
            if (stat && !appliedList.some(a => a.stat === stat)) {
                const totalValue = Math.min(90, +(Math.abs(parseFloat(m[2])) + debuffLevelGrowth).toFixed(1));
                if (stat === 'ALL') {
                    ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'].forEach(st => {
                        appliedList.push({ stat: st, val: totalValue, text: `${st} -${totalValue}%` });
                    });
                } else {
                    appliedList.push({ stat, val: totalValue, text: `${stat} -${totalValue}%` });
                }
            }
        }
    }

    if (appliedList.length > 0) {
        const desc = appliedList.map(a => a.text).join(', ');
        const skillElem = resolveSkillShinryokuType(skill, caster?.shinryokuType);
        const { effectDesc, logNote } = applyBuffWithDiminishingPriority(
            target,
            skill.name,
            desc,
            duration,
            appliedList[0].val,
            {
                imageUrl: skill.imageUrl,
                icon: skill.icon || (skill as any).iconName,
                skillElement: skillElem,
                forceFullAura: isSkillAuraErosion(skill)
            }
        );
        logs.push(`💀 ${targetUnit.name} ← [${skill.name}] (${effectDesc}, ${duration}턴)${logNote}`);
        applied = true;
    }

    // 2. 상태이상([화상], [빙결], [기절], [출혈], [중독] 등) 적용
    const combinedText = `${rawFormula} ${skill.description || ''}`;
    const foundAilments = new Set<string>();
    for (const m of combinedText.matchAll(/\[([^\]]+?)\]/g)) {
        const token = m[1].trim();
        for (const a of STATUS_AILMENTS_LIST) {
            if (token.includes(a)) foundAilments.add(a);
        }
    }
    if (isPureDebuff && foundAilments.size === 0) {
        for (const a of STATUS_AILMENTS_LIST) {
            if (combinedText.includes(a)) foundAilments.add(a);
        }
    }

    for (const ailmentName of foundAilments) {
        // 공격 스킬의 부가 상태이상은 CTRL 기반 1/4 확률 체크 (CombatUtils.checkAndApplyAilment 규칙)
        if (isAttackSkill) {
            const baseRate = calculateDebuffSuccessRate(casterFinal, targetFinal, skill.level || 1, caster?.skills, ailmentName);
            const finalChance = Math.max(15, Math.floor(baseRate / 4));
            if (Math.random() * 100 >= finalChance) continue;
        }
        const ailmentData = STATUS_AILMENTS_DATA[ailmentName];
        const ailDuration = CombatUtils.getSkillStatusDuration(skill, ailmentName, isPureDebuff);
        let dotVal = 0;
        if (['화상', '출혈', '중독', '소멸', '흡정'].includes(ailmentName)) {
            dotVal = calculateDotDamage(ailmentName, targetFinal.maxHp || targetUnit.maxHp || 100, targetFinal);
        }
        target.statusEffects = target.statusEffects.filter((e: ActiveStatus) => e.name !== ailmentName);
        target.statusEffects.push({
            name: ailmentName,
            duration: ailDuration,
            effect: (ailmentData as any)?.desc || (ailmentData as any)?.description || ailmentName,
            val: dotVal > 0 ? dotVal : undefined,
            imageUrl: skill.imageUrl,
            icon: skill.icon || (skill as any).iconName
        });
        logs.push(`⚠️ ${targetUnit.name}에게 [${ailmentName}] 부여! (${ailDuration}턴)`);
        applied = true;
    }

    // 방어 붕괴 옵션 (aoeSkillEnhanceService.applyDebuffDefenseShatter 정규 연동)
    const shatterLog = applyDebuffDefenseShatter(skill, target);
    if (shatterLog) {
        logs.push(`💥 ${shatterLog}`);
        applied = true;
    }

    // 3. 지속 전장 결계 (공격 및 디버프 스킬 모두 지원 — useGame.ts:3051-3065 정규 연동)
    const isDebuffZone = Boolean(skill.finalEnhanceData?.isBattlefieldZone) ||
        rawFormula.includes('지속 전장 결계') ||
        rawFormula.includes('지속 전장 지대');
    if (isDebuffZone) {
        const zoneDuration = Math.floor(Math.random() * 2) + 2;
        const est = calculateDamage(caster, target, { ...skill, type: SkillType.MAGIC, powerRatio: skill.powerRatio || 100 });
        const dotVal = Math.max(10, Math.floor((est.damage || 50) * 0.20));
        target.statusEffects = target.statusEffects.filter((e: any) => e.name !== '지속 전장 결계');
        target.statusEffects.push({
            name: '지속 전장 결계',
            duration: zoneDuration,
            effect: `매 턴 신력 결계 지속 피해 (-${dotVal})`,
            val: dotVal,
            imageUrl: skill.imageUrl,
            icon: skill.icon || (skill as any).iconName
        });
        logs.push(`🔥 ${targetUnit.name}에게 [지속 전장 결계] 형성! (${zoneDuration}턴간 -${formatKoreanNumber(dotVal)})`);
        applied = true;
    }

    return {
        unit: syncUnitFromSourceEntity(targetUnit),
        logs,
        applied,
        resisted: false
    };
};

/**
 * 피해 적용 + `CombatShieldService.processShieldAbsorption` + `processRevivalIfLethal` + 사망 방지 옵션
 */
export const applyBg3DamageWithShieldAndRevival = (
    targetUnit: Bg3Unit,
    rawDamage: number
): { unit: Bg3Unit; hpDamage: number; shieldAbsorbed: number; logs: string[]; revived: boolean } => {
    const logs: string[] = [];
    const target = targetUnit.sourceEntity as any;
    let working = { ...targetUnit };

    if (working.hp <= 0 || rawDamage <= 0) {
        return { unit: working, hpDamage: 0, shieldAbsorbed: 0, logs, revived: false };
    }

    let remainingDamage = Math.max(0, Math.floor(rawDamage));
    let shieldAbsorbed = 0;

    // 1. 정규 마나 쉴드 / 보호막 피해 흡수 (MP 추가 소모 없음!)
    if (target) {
        const shieldBefore = getEntityTotalShield(target);
        const shieldRes = CombatShieldService.processShieldAbsorption(target, remainingDamage);
        remainingDamage = shieldRes.remainingDamage;
        shieldAbsorbed = Math.max(0, shieldBefore - getEntityTotalShield(target));
        if (shieldRes.totalLog && shieldRes.totalLog.trim()) {
            shieldRes.totalLog.trim().split('\n').forEach(l => l.trim() && logs.push(l.trim()));
        }
    }

    // 2. 잔여 피해를 HP에 적용
    const newHp = Math.max(0, working.hp - remainingDamage);
    const hpDamage = working.hp - newHp;
    working.hp = newHp;
    if (target?.stats) target.stats.hp = newHp;
    if (target && 'hp' in target && !('companions' in target)) target.hp = newHp;

    let revived = false;

    // 3. 치사량 도달 시 불멸 환생 / 사망 방지 체크
    if (working.hp <= 0 && target) {
        const revRes = CombatShieldService.processRevivalIfLethal(target, 0);
        if (revRes.revivedHp > 0) {
            working.hp = revRes.revivedHp;
            revived = true;
            if (revRes.log.trim()) logs.push(revRes.log.trim());
        } else {
            // 장비/신화 옵션 사망 방지(UNDEAD) 1회 체크 (useGame.ts:4995-5013 — maxHp 100% 부활)
            try {
                const derived = calculateDerivedStats(target);
                const hasUndead = (derived.mythicOptions || []).some((opt: any) =>
                    opt === MythicOptionType.UNDEAD ||
                    opt === MagyeOptionType.UNDEAD ||
                    String(opt).includes('사망 방지') ||
                    String(opt).includes('불사')
                );
                if (hasUndead && !(target as any)._undeadUsed) {
                    (target as any)._undeadUsed = true;
                    const revHp = Math.max(1, Math.floor(working.maxHp));
                    working.hp = revHp;
                    if (target.stats) target.stats.hp = revHp;
                    revived = true;
                    logs.push(`✨ ${working.name}의 사망 방지(불사) 옵션 발동! 죽음의 문턱에서 HP 100%(${formatKoreanNumber(revHp)})로 부활했습니다!`);
                }
            } catch {
                // ignore
            }
        }
    }

    if (working.hp <= 0) {
        working.hp = 0;
        if (target) {
            if ('isDead' in target) target.isDead = true;
            if (target.stats) target.stats.hp = 0;
            if ('hp' in target && !('companions' in target)) target.hp = 0;
        }
    }

    return {
        unit: syncUnitFromSourceEntity(working),
        hpDamage,
        shieldAbsorbed,
        logs,
        revived
    };
};

/**
 * 공격 직후 신화/마계 옵션(`ABSORB`, `DEMONIZE`, `CURSE_SPREAD`, `REFLECT`) 및 장비 타격 상태이상(`processEquipmentOnHit`) 실행
 */
export const applyBg3PostAttackHooks = (
    attackerUnit: Bg3Unit,
    targetUnit: Bg3Unit,
    damageResult: any
): { attacker: Bg3Unit; target: Bg3Unit; logs: string[] } => {
    const logs: string[] = [];
    let attacker = { ...attackerUnit };
    let target = { ...targetUnit };
    const atkEntity = attacker.sourceEntity as any;
    const tgtEntity = target.sourceEntity as any;

    if (!atkEntity || !tgtEntity || !damageResult || (damageResult.damage || 0) <= 0) {
        return { attacker, target, logs };
    }

    try {
        const atkDerived = calculateDerivedStats(atkEntity);
        const tgtDerived = calculateDerivedStats(tgtEntity);

        // 흡수 (30%)
        if (atkDerived.mythicOptions?.includes(MagyeOptionType.ABSORB)) {
            const absorb = Math.floor(damageResult.damage * 0.30);
            if (absorb > 0 && attacker.hp > 0) {
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + absorb);
                logs.push(`🩸 마계 옵션 [흡수] 발동! ${attacker.name} HP +${formatKoreanNumber(absorb)}`);
            }
        }

        // 악마화 (HP 50% 이하)
        if (atkDerived.mythicOptions?.includes(MagyeOptionType.DEMONIZE)) {
            if (!atkEntity.statusEffects?.some((e: any) => e.name === '악마화') && attacker.hp <= attacker.maxHp * 0.5) {
                if (!atkEntity.statusEffects) atkEntity.statusEffects = [];
                atkEntity.statusEffects.push({ name: '악마화', duration: 5, effect: 'P.Atk +100%, M.Atk +100%, AGI +100%' });
                logs.push(`😈 마계 옵션 [악마화] 발동! ${attacker.name}의 공격력/민첩이 폭증합니다!`);
            }
        }

        // 저주 전파
        if (atkDerived.mythicOptions?.includes(MagyeOptionType.CURSE_SPREAD)) {
            if (!tgtEntity.statusEffects) tgtEntity.statusEffects = [];
            tgtEntity.statusEffects = tgtEntity.statusEffects.filter((e: any) => e.name !== '마계의 저주');
            tgtEntity.statusEffects.push({ name: '마계의 저주', duration: 2, effect: 'P.Def -50%, M.Def -50%' });
            if (!atkEntity.statusEffects) atkEntity.statusEffects = [];
            atkEntity.statusEffects = atkEntity.statusEffects.filter((e: any) => e.name !== '저주의 반동');
            atkEntity.statusEffects.push({ name: '저주의 반동', duration: 1, effect: 'P.Def -20%, M.Def -20%' });
            logs.push(`🔮 마계 옵션 [저주 전파] 발동!`);
        }

        // 피해 반사 (30%)
        if (
            tgtDerived.mythicOptions?.includes(MythicOptionType.REFLECT) ||
            tgtDerived.mythicOptions?.includes(MagyeOptionType.REFLECT)
        ) {
            const reflectDmg = Math.floor(damageResult.damage * 0.30);
            if (reflectDmg > 0 && attacker.hp > 0) {
                const refRes = applyBg3DamageWithShieldAndRevival(attacker, reflectDmg);
                attacker = refRes.unit;
                logs.push(`🪞 ${target.name} 신화 반사 발동! ${attacker.name}에게 ${formatKoreanNumber(reflectDmg)} 피해!`);
                logs.push(...refRes.logs);
            }
        }

        // 장비 타격 부가 상태이상 (출혈, 빙결 등)
        const eqLog = processEquipmentOnHit(atkEntity, tgtEntity, damageResult);
        if (eqLog && eqLog.trim()) {
            eqLog.trim().split('\n').forEach(l => l.trim() && logs.push(l.trim()));
        }
    } catch {
        // ignore safely
    }

    return {
        attacker: syncUnitFromSourceEntity(attacker),
        target: syncUnitFromSourceEntity(target),
        logs
    };
};

export interface Bg3TurnStartResult {
    unit: Bg3Unit;
    otherUnitUpdates: Map<string, Bg3Unit>;
    logs: string[];
    skipTurn: boolean;
    skipReason?: string;
    moveLocked: boolean;
    silenced: boolean;
}

/**
 * 턴 시작 시 정규 처리:
 * - `CombatUtils.processTurnStart` (패시브 HP/MP 재생, 도트 피해, 지속 결계, 지속 턴 차감, 기운 점감 갱신)
 * - `CombatUtils.processPassiveTurnEffects` (열기/월암/냉기 광역 패시브)
 * - 확정 CC(빙결/기절/마비/수면/소멸/신력 브레이크) & 확률 CC(감전 75% / 속박 75% / 혼란 50%) & 침묵 판정
 */
export const processBg3TurnStart = (
    unit: Bg3Unit,
    allUnits: Bg3Unit[],
    playerChar?: Character
): Bg3TurnStartResult => {
    const logs: string[] = [];
    const otherUnitUpdates = new Map<string, Bg3Unit>();
    if (unit.hp <= 0 || !unit.sourceEntity) {
        return { unit, otherUnitUpdates, logs, skipTurn: true, moveLocked: false, silenced: false };
    }

    // React StrictMode 이중 호출에도 안전하도록 sourceEntity & statusEffects를 불변 복제 후 처리!
    const rawEntity = unit.sourceEntity as any;
    const prevEffects: ActiveStatus[] = Array.isArray(rawEntity.statusEffects)
        ? rawEntity.statusEffects.map((e: any) => ({ ...e }))
        : [];
    const entity: any = {
        ...rawEntity,
        stats: rawEntity.stats ? { ...rawEntity.stats } : undefined,
        statusEffects: prevEffects
    };
    let working: Bg3Unit = { ...unit, sourceEntity: entity };

    const finalStats = calculateFinalStats(entity).finalStats;

    // 1. CC / 침묵 판정 (턴 차감 전 현재 걸려있는 상태이상 기준)
    let skipTurn = false;
    let skipReason: string | undefined;
    let moveLocked = false;
    let silenced = false;

    const hardCc = prevEffects.find(e => ['빙결', '기절', '마비', '수면', '소멸', '신력 브레이크'].includes(e.name));
    if (hardCc) {
        skipTurn = true;
        skipReason = hardCc.name;
        logs.push(`❄️ ${working.name}은(는) [${hardCc.name}] 상태로 행동할 수 없습니다!`);
    } else {
        if (prevEffects.some(e => e.name === '감전') && Math.random() < 0.75) {
            skipTurn = true;
            skipReason = '감전';
            logs.push(`⚡ ${working.name}은(는) [감전] 경직으로 행동 불능!`);
        } else if (prevEffects.some(e => e.name === '혼란') && Math.random() < 0.50) {
            skipTurn = true;
            skipReason = '혼란';
            logs.push(`💫 ${working.name}은(는) [혼란]으로 턴을 허비했습니다!`);
        }
        if (prevEffects.some(e => e.name === '속박') && Math.random() < 0.75) {
            moveLocked = true;
            logs.push(`⛓️ ${working.name}은(는) [속박]으로 이동이 봉쇄되었습니다!`);
        }
        if (prevEffects.some(e => e.name === '침묵')) {
            silenced = true;
            logs.push(`🔇 ${working.name}은(는) [침묵] 상태로 스킬 시전이 봉쇄됩니다!`);
        }
    }

    // 2. CombatUtils.processTurnStart 실행 (재생 + 도트 + 턴 차감)
    try {
        const turnRes = CombatUtils.processTurnStart(entity, finalStats, prevEffects);
        entity.statusEffects = turnRes.activeEffects;
        if (turnRes.log && turnRes.log.trim()) {
            turnRes.log.trim().split('\n').forEach(l => l.trim() && logs.push(l.trim()));
        }
        if (turnRes.hpHeal > 0) {
            working.hp = Math.min(working.maxHp, working.hp + turnRes.hpHeal);
        }
        if (turnRes.mpHeal > 0) {
            working.mp = Math.min(working.maxMp, working.mp + turnRes.mpHeal);
        }
        if (turnRes.dmg > 0) {
            // 도트 피해는 보호막 흡수 후 HP 적용 (정규 시스템: 도트 피해도 치사 가능)
            const dmgRes = applyBg3DamageWithShieldAndRevival(working, turnRes.dmg);
            working = dmgRes.unit;
            logs.push(...dmgRes.logs);
            if (working.hp <= 0) {
                skipTurn = true;
                skipReason = '지속 피해로 전투불능';
            }
        }
    } catch {
        // ignore
    }

    // 3. 패시브 턴 효과 (열기/월암/냉기 광역 패시브)
    if (working.hp > 0) {
        try {
            const opponents = allUnits.filter(o => o.hp > 0 && o.team !== working.team && o.sourceEntity);
            const oppEntities = opponents.map(o => o.sourceEntity);
            const passRes = CombatUtils.processPassiveTurnEffects(entity, oppEntities, playerChar);
            if (passRes.log && passRes.log.trim()) {
                passRes.log.trim().split('\n').forEach(l => l.trim() && logs.push(l.trim()));
            }
            if (passRes.healSelfAmount > 0) {
                working.hp = Math.min(working.maxHp, working.hp + passRes.healSelfAmount);
            }
            passRes.damageEvents.forEach(ev => {
                const opp = opponents[ev.targetIndex];
                if (!opp || ev.amount <= 0) return;
                const currentOpp = otherUnitUpdates.get(opp.id) || opp;
                const dmgRes = applyBg3DamageWithShieldAndRevival(currentOpp, ev.amount);
                otherUnitUpdates.set(opp.id, dmgRes.unit);
                logs.push(...dmgRes.logs);
            });
            passRes.debuffEvents.forEach(ev => {
                const opp = opponents[ev.targetIndex];
                if (!opp || !opp.sourceEntity) return;
                const currentOpp = otherUnitUpdates.get(opp.id) || opp;
                const oppEnt = currentOpp.sourceEntity as any;
                if (!Array.isArray(oppEnt.statusEffects)) oppEnt.statusEffects = [];
                oppEnt.statusEffects = oppEnt.statusEffects.filter((e: ActiveStatus) => e.name !== ev.status.name);
                oppEnt.statusEffects.push(ev.status);
                otherUnitUpdates.set(opp.id, syncUnitFromSourceEntity(currentOpp));
            });
        } catch {
            // ignore
        }
    }

    return {
        unit: syncUnitFromSourceEntity(working),
        otherUnitUpdates,
        logs,
        skipTurn,
        skipReason,
        moveLocked,
        silenced
    };
};

/**
 * BG3 소모품 사용 (정규 `applyConsumableEffect` 100% 연동 — 회복·버프·해독·부활·몬스터 포획 지원)
 */
export const applyBg3ConsumableItem = (
    userUnit: Bg3Unit,
    item: Item,
    targetEnemyUnit?: Bg3Unit
): {
    user: Bg3Unit;
    targetEnemy?: Bg3Unit;
    logs: string[];
    isCaptured: boolean;
    capturedMonster?: Companion;
    hpGain: number;
    mpGain: number;
} => {
    const userEntity = userUnit.sourceEntity as Character | Companion;
    const enemyEntity = targetEnemyUnit?.sourceEntity as Enemy | undefined;
    const logs: string[] = [];

    if (!userEntity) {
        return { user: userUnit, targetEnemy: targetEnemyUnit, logs, isCaptured: false, hpGain: 0, mpGain: 0 };
    }

    const res = applyConsumableEffect(userEntity, item, enemyEntity);
    let nextUser = { ...userUnit };

    if (res.hpGain > 0) {
        nextUser.hp = Math.min(nextUser.maxHp, nextUser.hp + res.hpGain);
    }
    if (res.mpGain > 0) {
        nextUser.mp = Math.min(nextUser.maxMp, nextUser.mp + res.mpGain);
    }
    if (Array.isArray(res.newStatusEffects) && res.newStatusEffects.length > 0) {
        if (!Array.isArray((userEntity as any).statusEffects)) (userEntity as any).statusEffects = [];
        for (const st of res.newStatusEffects) {
            (userEntity as any).statusEffects = (userEntity as any).statusEffects.filter((e: ActiveStatus) => e.name !== st.name);
            (userEntity as any).statusEffects.push(st);
            if (isRealTimeElixir(st) && typeof (elixirRealtimeService as any).registerOrRefreshElixir === 'function') {
                try {
                    (elixirRealtimeService as any).registerOrRefreshElixir(st);
                } catch {
                    // ignore
                }
            }
        }
    }
    if (res.removeStatus && Array.isArray((userEntity as any).statusEffects)) {
        (userEntity as any).statusEffects = (userEntity as any).statusEffects.filter((e: ActiveStatus) => !isDebuffStatus(e));
    }
    if (Array.isArray(res.logMessages)) {
        logs.push(...res.logMessages);
    }

    let nextEnemy = targetEnemyUnit;
    if (res.isCaptured && nextEnemy) {
        nextEnemy = { ...nextEnemy, hp: 0 };
        if (nextEnemy.sourceEntity) {
            (nextEnemy.sourceEntity as any).hp = 0;
            if ((nextEnemy.sourceEntity as any).stats) (nextEnemy.sourceEntity as any).stats.hp = 0;
        }
    }

    return {
        user: syncUnitFromSourceEntity(nextUser),
        targetEnemy: nextEnemy,
        logs,
        isCaptured: Boolean(res.isCaptured),
        capturedMonster: res.capturedMonster,
        hpGain: res.hpGain || 0,
        mpGain: res.mpGain || 0
    };
};

/**
 * 좌측 하단 스탯 패널용: 실시간 최종 스탯 + 파생 전투 스탯 + 순수 버프 증감치 산출
 */
export interface Bg3UnitDetailedStatsSnapshot {
    finalStats: Stats;
    baseStats: Stats;
    derived: ReturnType<typeof calculateDerivedStats>;
    statDiffs: {
        str: number;
        int: number;
        agi: number;
        wis: number;
        def: number;
        ctrl: number;
    };
}

export const getBg3UnitDetailedStats = (unit: Bg3Unit): Bg3UnitDetailedStatsSnapshot | null => {
    const entity = unit.sourceEntity as any;
    if (!entity) return null;
    try {
        const withBuffs = calculateFinalStats(entity).finalStats;
        const derived = calculateDerivedStats(entity);
        // 버프/디버프 제외한 순수 장비+기본 스탯 비교용
        const entityWithoutStatus = { ...entity, statusEffects: [] };
        const withoutBuffs = calculateFinalStats(entityWithoutStatus).finalStats;
        return {
            finalStats: withBuffs,
            baseStats: withoutBuffs,
            derived,
            statDiffs: {
                str: Math.round((withBuffs.str || 0) - (withoutBuffs.str || 0)),
                int: Math.round((withBuffs.int || 0) - (withoutBuffs.int || 0)),
                agi: Math.round((withBuffs.agi || 0) - (withoutBuffs.agi || 0)),
                wis: Math.round((withBuffs.wis || 0) - (withoutBuffs.wis || 0)),
                def: Math.round((withBuffs.def || 0) - (withoutBuffs.def || 0)),
                ctrl: Math.round((withBuffs.ctrl || 0) - (withoutBuffs.ctrl || 0))
            }
        };
    } catch {
        return null;
    }
};

/**
 * 전투 종료 시 모든 일반 상태이상/버프 1턴 감소 (패시브 보호막 및 실시간 영약/비약은 유지)
 */
export const tickPostCombatStatusEffects = (statusEffects?: ActiveStatus[]): ActiveStatus[] => {
    if (!Array.isArray(statusEffects) || statusEffects.length === 0) return [];
    const next: ActiveStatus[] = [];
    for (const st of statusEffects) {
        if (!st) continue;
        const copy = { ...st };
        const isPassiveShield =
            copy.name === '마나 쉴드 (패시브)' ||
            (copy.name === '마나 쉴드' && (Boolean((copy as any).isPassive) || (typeof copy.duration === 'number' && copy.duration >= 900)));
        if (isPassiveShield || isRealTimeElixir(copy)) {
            next.push(copy);
            continue;
        }
        const dur = typeof copy.duration === 'number' ? copy.duration : parseInt(String(copy.duration || 0), 10) || 0;
        const nextDur = dur - 1;
        if (nextDur > 0) {
            copy.duration = nextDur;
            next.push(copy);
        }
    }
    return next;
};
