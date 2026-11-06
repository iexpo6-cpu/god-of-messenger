
import { Enemy, Character, Companion, ActiveStatus, Skill, ClassTier, Stats, Item, ItemRarity, SkillType, WeaponType } from '../types';
import { STATUS_AILMENTS_DATA, PRESET_ENEMIES, SHINRYOKU_TYPES_LIST, STATUS_AILMENTS_LIST, WEAPON_TYPE_KOREAN } from '../constants';
import { calculateInventorySize } from '../utils';
import { calculateDamage, generateEnemyStats, calculateStatusChance, calculateDerivedStats, calculateDebuffSuccessRate, addMasteryExp, getWeaponTypeFromItem, calculateFinalStats, calculateTotalStats, extractElementalType, getBondBonus, calculateRewardBonuses } from '../utils';
import { findItemDataInWorldTables, WORLD_LOOT_TABLES } from '../monsterLootTable';
import { getBossByLocation } from '../bossMonsters';
import { isRealTimeElixir } from './elixirService';
import { getReducedMpCostOnLevelUp } from './skillMpService';
import { calculateDotDamage } from './dotDamageService';
import { formatKoreanNumber, parseKoreanNumber } from './numberFormatService';
import { refreshBuffDiminishingStatus } from './buffDiminishingManager';
/**
 * 스킬이 부활(Resurrection) 스킬인지 확인합니다.
 */
export const isResurrectionSkill = (skill: Skill | null): boolean => {
    if (!skill || !skill.effectFormula) return false;
    return skill.effectFormula.includes('RESURRECT') || skill.effectFormula.includes('부활');
};

export const updateBondSkillMastery = (char: Character | Companion, skillName: string): boolean => {
    if (!('bondSkills' in char) || !char.bondSkills) return false;
    const skill = char.bondSkills.find(s => s.name.trim() === skillName);
    if (skill) {
        const gain = (char as any)?.isPotentialLocked ? 2 : 1;
        skill.currentMastery = (skill.currentMastery || 0) + gain;
        const requiredMastery = 20 * (skill.level + 4);
        if (skill.currentMastery >= requiredMastery) {
            if (skill.level < (skill.maxLevel || 10)) {
                skill.level += 1;
                skill.currentMastery = 0;
                skill.powerRatio = (skill.powerRatio || 100) + 2000;
                if (skill.type !== SkillType.DEBUFF) {
                    const baseMp = skill.baseMpCost || skill.mpCost || 10;
                    skill.mpCost = Math.round(baseMp * (1 + (skill.level - 1) * 0.1));
                }
            } else {
                skill.currentMastery = requiredMastery;
            }
        }
        return true;
    }
    return false;
};

export const getAllCombatantCompanions = (char: Character): Companion[] => {
    const companions = [...char.companions];
    if (char.mountedMonster) {
        companions.push(char.mountedMonster);
    }
    char.companions.forEach(c => {
        if (c.mountedMonster) {
            companions.push(c.mountedMonster);
        }
    });
    return companions;
};

/**
 * [NEW] 부활 효과 외에 다른 효과(회복, 스탯 증가 등)가 포함된 복합 스킬인지 확인합니다.
 */
export const isMixedResurrectionSkill = (skill: Skill | null): boolean => {
    if (!skill || !skill.effectFormula) return false;
    const formula = skill.effectFormula;
    const hasRes = formula.includes('RESURRECT');
    // 부활 외에 +, 회복, 증가, RECOV 등의 키워드가 있는지 확인
    const hasOther = formula.includes('+') || 
                     formula.includes('회복') || 
                     formula.includes('증가') ||
                     formula.includes('RECOV');
    return hasRes && hasOther;
};

export const extractLogsFromNarrative = (narrative: string): string[] => {
    const narrativeLogs: string[] = [];
    if (!narrative) return narrativeLogs;
    
    const lines = narrative.split('\n');
    lines.forEach(line => {
         const clean = line.replace(/[\*\_\`]/g, '').trim();
         if (/^\[/.test(clean)) {
             narrativeLogs.push(clean);
         }
    });
    return narrativeLogs;
};

export const reconcileEnemies = (prevEnemies: Enemy[], newEnemies: Enemy[], playerLevel: number): Enemy[] => {
    const mergedEnemies: Enemy[] = [...prevEnemies];
    const isInitialSpawn = prevEnemies.length === 0;
    const normalize = (name: string) => name.replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').replace(/\s+/g, '').toLowerCase().trim();
    
    newEnemies.forEach(newEnemy => {
        const newName = normalize(newEnemy.name || "Unknown");
        const existingIdx = mergedEnemies.findIndex(e => normalize(e.name) === newName && e.hp > 0);

        if (existingIdx >= 0) {
            const existing = mergedEnemies[existingIdx];
            const finalStatusEffects = existing.statusEffects;
            mergedEnemies[existingIdx] = { 
                ...existing, 
                hp: existing.hp, 
                statusEffects: finalStatusEffects 
            };
        } else if (isInitialSpawn) {
            let aiHp = typeof newEnemy.hp === 'number' ? newEnemy.hp : parseInt(newEnemy.hp as any) || 0;
            let aiMaxHp = typeof newEnemy.maxHp === 'number' ? newEnemy.maxHp : parseInt(newEnemy.maxHp as any) || aiHp || 100;
            let aiLevel = typeof newEnemy.level === 'number' ? newEnemy.level : 0;

            if (!aiLevel || aiLevel < 1) {
                aiLevel = Math.max(1, Math.floor(Math.random() * 5) + playerLevel - 2); 
            }

            if (aiMaxHp === 100 || isNaN(aiMaxHp) || aiMaxHp <= 0) {
                const statPoints = aiLevel * (Math.floor(Math.random() * 16) + 5); 
                aiMaxHp = (aiLevel * (Math.floor(Math.random() * 6) + 10)) + (statPoints * 1);
                aiHp = aiMaxHp;
            }
            
            if (isNaN(aiHp)) aiHp = aiMaxHp;
            if (aiHp <= 0) aiHp = aiMaxHp;
            
            let aiStats = newEnemy.stats;
            if (!aiStats || !aiStats.str) {
                aiStats = generateEnemyStats(aiLevel);
                aiStats.hp = aiHp;
                aiStats.maxHp = aiMaxHp;
            } else {
                aiStats.hp = aiHp;
                aiStats.maxHp = aiMaxHp;
            }

            const presetMatch = PRESET_ENEMIES.find(p => newName.includes(normalize(p.name!)));
            let aiShinryokuType = presetMatch?.shinryokuType || SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            if (aiShinryokuType === '가축') {
                aiShinryokuType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            }
            const aiSkills = presetMatch?.skills || [];

            mergedEnemies.push({
                ...newEnemy, 
                name: newEnemy.name || "Unknown Enemy", 
                hp: aiHp, 
                maxHp: aiMaxHp, 
                level: aiLevel, 
                stats: aiStats,
                shinryokuType: aiShinryokuType,
                skills: aiSkills,
                statusEffects: [] 
            });
        }
    });

    return mergedEnemies;
};

export const getSkillStatusDuration = (skill?: Skill, ailmentName?: string, forceBuffDebuff?: boolean): number => {
    if (!skill) {
        if (ailmentName && ["빙결", "속박", "소멸", "혼란", "감전", "중독"].includes(ailmentName)) return 2;
        return 2;
    }

    const tierRaw = String(skill.tier || skill.minClassTier || skill.baseTier || '').toUpperCase();
    let tierLevel = 1;

    if (tierRaw.includes('FINAL') || tierRaw.includes('파이널') || tierRaw.includes('4')) {
        tierLevel = 4;
    } else if (tierRaw.includes('LAST') || tierRaw.includes('라스트') || tierRaw.includes('3')) {
        tierLevel = 3;
    } else if (tierRaw.includes('SECOND') || tierRaw.includes('세컨드') || tierRaw.includes('2')) {
        tierLevel = 2;
    } else if (tierRaw.includes('FIRST') || tierRaw.includes('퍼스트') || tierRaw.includes('1')) {
        tierLevel = 1;
    }

    const isBuffOrDebuff = 
        forceBuffDebuff === true ||
        skill.type === SkillType.DEBUFF || 
        skill.type === SkillType.BUFF || 
        (skill.type as string) === '디버프' || 
        (skill.type as string) === '버프' ||
        (skill.buffType && (skill.buffType.includes('버프') || skill.buffType.includes('디버프'))) ||
        (skill.effectFormula && (
            skill.effectFormula.includes('BUFF') || 
            skill.effectFormula.includes('Debuff') || 
            skill.effectFormula.includes('버프') || 
            skill.effectFormula.includes('디버프') ||
            skill.effectFormula.includes('+') ||
            skill.effectFormula.includes('-')
        ));

    let baseDuration = 2;
    if (isBuffOrDebuff) {
        // 버프 및 디버프 전용 스킬 (클래스 티어별 2~5턴)
        switch (tierLevel) {
            case 4: baseDuration = 5; break;
            case 3: baseDuration = 4; break;
            case 2: baseDuration = 3; break;
            case 1:
            default: baseDuration = 2; break;
        }
    } else {
        // 일반 공격(물리/마법) 스킬의 부가 상태이상
        const isControl = ailmentName && ["빙결", "속박", "소멸", "혼란", "감전", "중독"].includes(ailmentName);
        if (tierLevel === 4) {
            baseDuration = isControl ? 3 : 3;
        } else {
            baseDuration = isControl ? 2 : 2;
        }
    }

    const hasExtension = Boolean(
        skill.finalEnhanceData?.durationExtended ||
        skill.finalEnhanceData?.debuffDurationExtended ||
        skill.effectFormula?.includes('지속 턴 수 연장')
    );

    return hasExtension ? baseDuration + 1 : baseDuration;
};

export const checkAndApplyAilment = (
    skill: Skill, 
    target: Enemy | Character | Companion, 
    attackerStats: Stats,
    attackerSkills?: Skill[]
): { log: string, appliedStatus?: ActiveStatus } => {
    let log = "";
    let appliedStatus: ActiveStatus | undefined;

    const tagMatch = skill.description ? skill.description.match(/\[부가\s*효과:\s*([^\]]+)\]/) : null;
    let ailmentToApply = tagMatch ? tagMatch[1].trim() : null;
    if (ailmentToApply) {
        const matched = STATUS_AILMENTS_LIST.find(a => ailmentToApply!.includes(a));
        if (matched) ailmentToApply = matched;
    }

    if (ailmentToApply && STATUS_AILMENTS_LIST.includes(ailmentToApply)) {
        const baseDebuffRate = calculateDebuffSuccessRate(attackerStats, target.stats || { ctrl: 10 } as Stats, skill.level || 1, attackerSkills, ailmentToApply);
        const finalChance = Math.floor(baseDebuffRate / 4); 

        const roll = Math.random() * 100;
        
        if (roll < finalChance) {
            let val = 0;
            const targetMaxHp = target.stats?.maxHp || ('maxHp' in target ? target.maxHp : 100);
            
            if (ailmentToApply === "흡정") val = Math.ceil(targetMaxHp * 0.05);
            else if (ailmentToApply === "소멸") val = Math.ceil(targetMaxHp * 0.07);
            else if (ailmentToApply === "중독") val = Math.max(1, Math.floor((attackerStats.int || 10) * 0.08));

            // 일반 공격 스킬 1~2턴 vs 디버프 전용 스킬 2~5턴(클래스 티어별)
            const duration = getSkillStatusDuration(skill, ailmentToApply);

            const ailmentData = STATUS_AILMENTS_DATA[ailmentToApply];
            
            appliedStatus = { 
                name: ailmentToApply, 
                duration: duration, 
                effect: ailmentData?.desc || "상태이상",
                val: val,
                imageUrl: skill.imageUrl,
                icon: skill.icon || (skill as any).iconName
            };
            
            log = `\n[시스템] ${target.name} 상태이상 ${ailmentToApply} 걸림 (${duration}턴)`;
        }
    }
    return { log, appliedStatus };
};

export const processTurnStart = (
    entity: Character | Companion | Enemy,
    stats: Stats, 
    statusEffects: ActiveStatus[] = []
) => {
    const entityName = entity.name;
    let log = "";
    let dmg = 0;
    let hpHeal = 0;
    let mpHeal = 0;
    const newEffects: ActiveStatus[] = [];
    
    // 최종 능력치(FinalStat) 계산하여 패시브 재생 및 도트 피해 기준 적용
    const finalStatsObj = (entity && typeof entity === 'object' && ('stats' in entity || 'equipment' in entity))
        ? calculateFinalStats(entity as any).finalStats
        : stats;
    const effectiveStats = finalStatsObj || stats;

    const pDef = Math.floor((effectiveStats.def || 0) * 0.8);

    if ('skills' in entity && entity.skills) {
        entity.skills.forEach(skill => {
            if (skill.type === SkillType.PASSIVE) {
                const formula = skill.effectFormula || "";
                let isRegen = false;
                let healPercent = 0;
                let healName = "";

                const level = skill.level || 1;

                if (formula.includes('SOLAR_REGEN') || formula.includes('LUNAR_HEAL')) {
                    healPercent = 10 + (level * 1);
                    healName = "재생효과";
                    isRegen = true;
                } else if (formula.includes('RADIANT_REGEN')) {
                    healPercent = 15 + (level * 1);
                    healName = "성역효과";
                    isRegen = true;
                } else if (formula.includes('NATURE_SYNTH')) {
                    healPercent = 20 + (level * 1);
                    healName = "광합성";
                    isRegen = true;
                } else if (formula.includes('WATER_REGEN') || formula.includes('_REGEN')) {
                    healPercent = 5 + (level * 1);
                    healName = "재생";
                    isRegen = true;
                }

                if (isRegen) {
                    const hpRecov = Math.floor((effectiveStats.maxHp || 100) * (healPercent / 100));
                    hpHeal += hpRecov;
                    log += `\n[시스템 ${entityName} HP +${formatKoreanNumber(hpRecov)} / 패시브 스킬 ${skill.name} ${healName}]`;
                    
                    if (formula.includes('SOLAR_REGEN') || formula.includes('LUNAR_HEAL') || formula.includes('RADIANT_REGEN')) {
                        const mpRecov = Math.floor((effectiveStats.maxMp || 100) * (healPercent / 100));
                        mpHeal += mpRecov;
                        log += `\n[시스템 ${entityName} MP +${formatKoreanNumber(mpRecov)} / 패시브 스킬 ${skill.name} ${healName}]`;
                    }
                }
            }
        });
    }

    statusEffects.forEach(originalEffect => {
        const effect = { ...originalEffect };
        
        if (typeof effect.duration !== 'number') {
            const parsed = parseInt(String(effect.duration).replace(/[^0-9]/g, ''));
            effect.duration = isNaN(parsed) ? 0 : parsed;
        }

        let keep = true;
        
        if (["화상", "출혈", "소멸", "흡정","중독"].includes(effect.name)) {
            let rawDamage = 0;
            if (effect.val && effect.val > 0) {
                rawDamage = effect.val;
            } else {
                rawDamage = calculateDotDamage(effect.name, effectiveStats.maxHp || 100, effectiveStats);
            }
            
            dmg += rawDamage;
            log += `\n[시스템: ${entityName} HP -${formatKoreanNumber(rawDamage)}] (${effect.name} 피해)`;
        } else if (effect.name === "지속 전장 결계") {
            let rawDamage = effect.val && effect.val > 0 ? effect.val : Math.max(10, Math.floor((effectiveStats.maxHp || 100) * 0.1));
            dmg += rawDamage;
            log += `\n[시스템: ${entityName} HP -${formatKoreanNumber(rawDamage)}] (지속 전장 결계 피해)`;
        } else if (effect.name === "지속 치유 결계") {
            const val = effect.val || 15;
            const recov = val <= 100 ? Math.max(10, Math.floor((effectiveStats.maxHp || 100) * (val / 100))) : val;
            hpHeal += recov;
            log += `\n[시스템: ${entityName} HP +${formatKoreanNumber(recov)}] (지속 치유 결계 효과)`;
        } else if (effect.name === "지속 마력 결계") {
            const val = effect.val || 15;
            const recov = val <= 100 ? Math.max(5, Math.floor((effectiveStats.maxMp || 100) * (val / 100))) : val;
            mpHeal += recov;
            log += `\n[시스템: ${entityName} MP +${formatKoreanNumber(recov)}] (지속 마력 결계 효과)`;
        }

        const isPassiveShield = effect.name === '마나 쉴드 (패시브)' || (effect.name === '마나 쉴드' && (Boolean((effect as any).isPassive) || (typeof effect.duration === 'number' && effect.duration >= 900)));
        const isDefenseStance = effect.name === '방어 태세' || effect.name === '방어';
        if (effect.duration > 0 && !isPassiveShield && !isDefenseStance) {
            if (!isRealTimeElixir(effect)) {
                effect.duration = effect.duration - 1;
            }
        }

        if (effect.duration <= 0 && !isDefenseStance) {
            log += `\n[시스템] ${entityName}의 ${effect.name} 효과가 사라졌습니다.`;
            keep = false;
        }
        
        if (keep) {
            newEffects.push(effect);
        }
    });

    refreshBuffDiminishingStatus(newEffects, (entity as any)?.shinryokuType);

    return { log, dmg, hpHeal, mpHeal, activeEffects: newEffects };
};

export const applyCombatStartPassives = (
    entity: Character | Companion | Enemy
): { log: string, activeEffects: ActiveStatus[] } => {
    let log = "";
    const activeEffects: ActiveStatus[] = [...(entity.statusEffects || [])];
    const entityName = entity.name;

    if (!('skills' in entity) || !entity.skills) return { log, activeEffects };

    const { finalStats: totalStats } = calculateFinalStats(entity);
    const level = entity.level || 1;

    entity.skills.forEach(skill => {
        if (skill.type === SkillType.PASSIVE) {
            const formula = skill.effectFormula || "";
                const skilllevel = skill.level;
            if (formula.includes('MANA_SHIELD')) {
                const match = formula.match(/MANA_SHIELD\]\s*(\d+(?:\.\d+)?)\s*%\s*\(\+(\d+(?:\.\d+)?)\s*%\s*per Lv\)/);
                let ratio = 10;
                if (match) {
                    const base = parseFloat(match[1]);
                    const scale = parseFloat(match[2]);
                    ratio = base + (scale * skilllevel);
                } else {
                    const simpleMatch = formula.match(/MANA_SHIELD\]\s*(\d+)/);
                    if (simpleMatch) ratio = parseInt(simpleMatch[1]);
                }
                
                const shieldAmount = Math.floor(totalStats.maxMp * (ratio / 100));
                
                const existing = activeEffects.find(e => e.name === '마나 쉴드 (패시브)');
                if (existing) {
                    const wasDamaged = (existing.val || 0) < shieldAmount;
                    existing.val = shieldAmount;
                    existing.duration = 999;
                    (existing as any).isPassive = true;
                    existing.effect = `피해를 흡수하는 마법 보호막 (${formatKoreanNumber(shieldAmount)})`;
                    if (wasDamaged) {
                        log += `\n[시스템] ${entityName}의 마나 쉴드 (패시브) 재충전 (+${formatKoreanNumber(shieldAmount)}) / 패시브 ${skill.name}`;
                    }
                } else {
                    activeEffects.push({
                        name: '마나 쉴드 (패시브)',
                        duration: 999,
                        effect: `피해를 흡수하는 마법 보호막 (${formatKoreanNumber(shieldAmount)})`,
                        val: shieldAmount,
                        isPassive: true
                    } as any);
                    log += `\n[시스템] ${entityName}의 마나 쉴드 (패시브) 생성 (+${formatKoreanNumber(shieldAmount)}) / 패시브 ${skill.name}`;
                }
            }
        }
    });

    return { log, activeEffects };
};

export const processPassiveTurnEffects = (
    entity: Character | Companion | Enemy,
    opponents: any[],
    character?: Character
): { log: string, damageEvents: { targetIndex: number, amount: number }[], healSelfAmount: number, debuffEvents: { targetIndex: number, status: ActiveStatus }[] } => {
    let log = "";
    const damageEvents: { targetIndex: number, amount: number }[] = [];
    const debuffEvents: { targetIndex: number, status: ActiveStatus }[] = [];
    let healSelfAmount = 0;

    if (!('skills' in entity) || !entity.skills) return { log, damageEvents, healSelfAmount, debuffEvents };

    const { finalStats: totalStats } = calculateFinalStats(entity);
    const affection = ('affection' in entity) ? (entity as Companion).affection : undefined;
    
    // [MODIFIED] 동료의 경우 character가 있으면 해당 동료의 인연 버프를 계산
    let bondBonus: number | undefined;
    if ('companions' in entity) {
        bondBonus = getBondBonus(entity as Character);
    } else if ('affection' in entity && character) {
        bondBonus = getBondBonus(character, entity as Companion);
    }

    const derived = calculateDerivedStats(
        totalStats, 
        entity.statusEffects, 
        undefined, undefined, false, 
        entity.skills, 
        'equipment' in entity ? entity.equipment : undefined,
        (entity as any).shinryokuType,
        affection,
        bondBonus,
        (entity as any).base?.elementalDamageBoosts,
        (entity as any).base?.elementalResistanceBoosts
    );

    entity.skills.forEach(skill => {
        if (skill.type === SkillType.PASSIVE) {
            const formula = skill.effectFormula || ""; 
            const level = skill.level || 1;
            
            if (formula.includes('SOLAR_HEAT') || formula.includes('FIRE_HEAT')) {
                const ratio = 0.18 + (level * 0.01);
                const baseStat = derived.pAtk + derived.mAtk;
                const dmg = Math.max(1, Math.floor(baseStat * ratio));
                
                opponents.forEach((op, idx) => {
                    if (op.hp > 0) {
                        log += `\n[시스템 ${op.name} HP -${formatKoreanNumber(dmg)} / 패시브 스킬 ${skill.name} 열기효과]`;
                        damageEvents.push({ targetIndex: idx, amount: dmg });
                    }
                });
            }

            if (formula.includes('LUNAR_DARK')) {
                const ratio = 10 + (level * 1); 
                const statusEffect: ActiveStatus = {
                    name: '월암',
                    duration: 2, 
                    effect: `STR, INT, AGI -${ratio.toFixed(1)}%`,
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName
                };
                
                opponents.forEach((op, idx) => {
                    if (op.hp > 0) {
                        const hasIt = op.statusEffects?.some((s: ActiveStatus) => s.name === '월암');
                        if (!hasIt) {
                            debuffEvents.push({ targetIndex: idx, status: statusEffect });
                            log += `\n[시스템] ${op.name}에게 월암 효과 적용`;
                        }
                    }
                });
            }

            if (formula.includes('ICE_COLD')) {
                const ratio = 25 + (level * 1);
                const statusEffect: ActiveStatus = {
                    name: '냉기',
                    duration: 2,
                    effect: `AGI -${ratio.toFixed(1)}%`,
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName
                };

                opponents.forEach((op, idx) => {
                    if (op.hp > 0) {
                        const hasIt = op.statusEffects?.some((s: ActiveStatus) => s.name === '냉기');
                        if (!hasIt) {
                            debuffEvents.push({ targetIndex: idx, status: statusEffect });
                            log += `\n[시스템] ${op.name}에게 냉기 효과 적용 (AGI 감소)`;
                        }
                    }
                });
            }
        }
    });

    return { log, damageEvents, healSelfAmount, debuffEvents };
};

/**
 * [NEW] 로컬 전투 시뮬레이션 결과를 바탕으로 전투 타입별 맞춤형 서사 텍스트를 생성합니다.
 */
export const generateLocalCombatNarrative = (action: string = "", logs: string[] = [], combatType: string = 'normal'): string => {
    if (!logs || logs.length === 0) return "전투가 소강상태에 접어들었습니다.";

    let intro = "";
    // 1. 도입부 설정 (전투 타입별)
    switch(combatType) {
        case 'dungeon':
        case 'war_raid':
            intro = "서늘한 기운이 감도는 전장 속에서, ";
            break;
        case 'tournament':
        case 'arena':
            intro = "관중들의 뜨거운 함성이 쏟아지는 가운데, ";
            break;
        case 'exam_mid':
        case 'exam_final':
            intro = "교관들의 날카로운 감시 아래 실력을 증명하듯, ";
            break;
        case 'wanted_battle':
            intro = "정의와 범죄의 갈림길에서 살기 어린 공격으로, ";
            break;
        case 'relation_battle':
            intro = "서로의 엇갈린 의지가 불꽃처럼 튀어 오르며, ";
            break;
        case 'temple_defense':
            intro = "성역의 신성한 불꽃을 지키기 위한 필사적인 투쟁으로, ";
            break;
        default:
            intro = "숨 막히는 긴장감 속에서 ";
    }

    let actionDesc = "";

    // 2. 메인 행동 묘사 (플레이어 행동 위주)
    if (action.includes('[스킬 사용]') || action.includes('[인연 스킬]')) {
        let skillName = "기술";
        if (action.includes('[인연 스킬]')) {
            const bondNameInLog = logs.find(l => l.includes('[인연 스킬 발동!]'))?.match(/\[인연 스킬 발동!\]\s*(.+?)!!/)?.[1];
            if (bondNameInLog) {
                skillName = bondNameInLog.trim();
            } else {
                const fusionTitle = logs.find(l => l.includes('[인연 융합'))?.match(/\[인연 융합 [^:]+:\s*(.+?)\]/)?.[1];
                if (fusionTitle) {
                    skillName = fusionTitle.replace(/\(융합\)/g, '').trim();
                } else {
                    const rawSkill = action.match(/\[인연 스킬\]\s*(.+?)\s*\(/)?.[1];
                    if (rawSkill && !rawSkill.startsWith('bond_')) {
                        skillName = rawSkill.trim();
                    } else {
                        skillName = "인연 스킬";
                    }
                }
            }
        } else {
            skillName = action.match(/\[스킬 사용\]\s*(.+?)\s*\(/)?.[1] || "기술";
        }
        const isBuffOrHeal = logs.some(l => l.includes('회복') || l.includes('증가') || l.includes('보호막') || l.includes('효과 적용') || l.includes('장막') || l.includes('가호')) || 
                             skillName.includes('보호') || skillName.includes('장막') || skillName.includes('회복') || skillName.includes('치유') || skillName.includes('실드') || skillName.includes('가호') || skillName.includes('강화') || skillName.includes('증폭') || skillName.includes('신성') || skillName.includes('장벽') || skillName.includes('힐') || skillName.includes('쉴드') || skillName.includes('빛') || skillName.includes('마나') || skillName.includes('체력') || skillName.includes('응원') || skillName.includes('격려') || skillName.includes('축복');
        if (isBuffOrHeal) {
            actionDesc = `당신은 **${skillName}**을(를) 시전하여 전장에 신비로운 가호와 치유의 기운을 퍼뜨립니다! `;
        } else {
            actionDesc = `당신은 **${skillName}**을(를) 시전하며 강력한 일격을 날립니다! `;
        }
    } else if (action.includes('[일반 공격]')) {
        actionDesc = `당신은 무기를 굳게 쥐고 적의 빈틈을 향해 공격을 퍼붓습니다. `;
    } else if (action.includes('[동료 지시')) {
        const compNameMatch = action.match(/\[동료 지시:\s*(.+?)\]/);
        const skillNameMatch = action.match(/스킬 사용:\s*(.+?)\s*\(/);
        
        if (compNameMatch && skillNameMatch) {
            const compName = compNameMatch[1];
            const skillName = skillNameMatch[1];
            actionDesc = `**${compName}**에게 신호를 보내자, 지시에 응한 동료가 **${skillName}**을(를) 발동하며 전장에 개입합니다! `;
        } else {
            actionDesc = `전략적인 지시를 내리며 팀의 호흡을 조절합니다. `;
        }
    } else if (action.includes('[방어]')) {
        actionDesc = `무기를 교차하여 방어 자세를 취하며 적의 맹공에 대비합니다. `;
    } else if (action.includes('[아이템 사용]')) {
        const itemNameMatch = action.match(/\[아이템 사용\]\s*(.+?)(?:\(|$)/);
        const itemName = itemNameMatch ? itemNameMatch[1].trim() : "아이템";
        actionDesc = `재빠르게 품에서 **${itemName}**을(를) 꺼내어 사용하며 전황을 정비합니다. `;
    } else if (action.includes('[도주]')) {
        actionDesc = `위험을 감지하고 신속하게 퇴로를 확보하며 물러섭니다. `;
    } else {
        actionDesc = `서로의 빈틈을 노리며 치열한 공방전이 이어집니다. `;
    }

    let narrative = intro + actionDesc;

    // 3. 동료들의 자동 행동 및 스킬 사용 묘사
    const companionActionLogs = logs.filter(l => {
        if (!(l.includes('발동'))) return false;
        const nameMatch = l.match(/\[시스템:\s*(.*?)\s+스킬\s+발동:/);
        const name = nameMatch ? nameMatch[1].trim() : "";
        return name && !action.includes(name);
    });
    if (companionActionLogs.length > 0) {
        narrative += "\n\n곁을 지키던 동료들 또한 각자의 판단으로 움직이기 시작합니다. ";
        companionActionLogs.forEach(l => {
            const nameMatch = l.match(/\[시스템:\s*(.*?)\s+스킬\s+발동:/);
            const skillMatch = l.match(/(?:발동|시전)[:\s]*(.+?)(?:\s*\(|!|$)/);
            if (nameMatch && skillMatch) {
                const name = nameMatch[1].trim();
                const skill = skillMatch[1].trim();
                narrative += `**${name}**이(가) 독자적으로 **${skill}** 기술을 펼치며 당신을 지원합니다! `;
            }
        });
    }

    // 4. 로그 파싱 및 결과 요약
    const damageDealtLogs = logs.filter(l => l.includes('HP -') && !l.includes('by') && !l.includes('피해)'));
    const damageTakenLogs = logs.filter(l => l.includes('HP -') && l.includes('by'));
    const killLogs = logs.filter(l => l.includes('처치!'));
    const statusLogs = logs.filter(l => l.includes('상태이상'));
    const dodgeLogs = logs.filter(l => l.includes('회피') || l.includes('MISS'));
    const lootLogs = logs.filter(l => l.includes('전리품 획득!'));
    const roundEndLog = logs.some(l => l.includes('라운드가 종료되었습니다'));

    let resultNarrative = "";

    // 피해 결과 묘사
    if (damageDealtLogs.length > 0) {
        const totalDmg = damageDealtLogs.reduce((sum, l) => sum + (parseInt(l.match(/HP\s*-(\d+)/)?.[1] || "0")), 0);
        if (totalDmg > 5000) resultNarrative += `\n\n이 파괴적인 연계 공격은 적의 방어선을 완전히 궤멸시킬 만큼 강력했습니다. `;
        else resultNarrative += `\n\n일행의 날카로운 협공이 적들에게 치명적인 타격을 입혔습니다. `;
    }
    if (dodgeLogs.length > 0) {
        resultNarrative += `현란한 진형 이동으로 적의 위협을 가볍게 흘려보내는 모습도 보입니다. `;
    }

    if (statusLogs.length > 0) {
        const ailments = statusLogs.map(l => l.match(/상태이상\s*(.+?)\s*걸림/)?.[1]).filter(Boolean);
        if (ailments.length > 0) {
            resultNarrative += `전장에 **${ailments.join(', ')}**의 기운이 퍼지며 전황이 유리하게 기웁니다. `;
        }
    }

    if (killLogs.length > 0) {
        const killedNames = killLogs.map(l => l.match(/\]\s*(.+?)\s*처치!/)?.[1]).filter(Boolean);
        resultNarrative += `\n\n결국 **${killedNames.join(', ')}**이(가) 비명을 지르며 쓰러집니다. `;
        
        if (combatType === 'arena' || combatType === 'tournament') {
            resultNarrative += `경기장에 엄청난 환호성이 터져 나옵니다!`;
        } else if (combatType === 'war_raid' || combatType === 'war_defend') {
            resultNarrative += `승리의 깃발이 한 걸음 더 가까워집니다.`;
        }
    }

    // 전리품 획득 묘사
    if (lootLogs.length > 0) {
        const items = lootLogs.map(l => l.match(/획득!\s*(.+?)\]/)?.[1]).filter(Boolean);
        if (items.length > 0) {
            resultNarrative += `\n\n쓰러진 적들의 유해와 소지품 사이에서 가치 있는 물건들을 발견했습니다. **${items.join(', ')}**을(를) 확보하는 데 성공했습니다! `;
        }
    }

    if (damageTakenLogs.length > 0) {
        resultNarrative += `\n\n하지만 적들의 반격 또한 만만치 않습니다. 날카로운 공격에 잠시 균형을 잃지만, 일행은 다시금 전의를 불태웁니다.`;
    }

    if (roundEndLog && !killLogs.length && !damageDealtLogs.length && !damageTakenLogs.length) {
        resultNarrative += `\n\n한 차례의 거친 공방이 지나가고 라운드가 종료되며, 다음 턴을 위한 전열을 가다듬습니다.`;
    }

    narrative += resultNarrative;

    return narrative.trim();
};

export const parseCombatDamage = (
    logs: string[],
    currentEnemies: Enemy[],
    currentUser: Character,
    currentCompanions: Companion[]
): {
    updatedEnemies: Enemy[],
    updatedChar: Character,
    updatedCompanions: Companion[],
    playerUpdated: boolean,
    modifiedCompanionIndices: Set<number>,
    goldUpdated: boolean
} => {
    let updatedEnemies = [...currentEnemies];
    let updatedChar: Character = { 
        ...currentUser, 
        stats: { ...currentUser.stats }, 
        inventory: [...currentUser.inventory],
        bondSkills: currentUser.bondSkills ? currentUser.bondSkills.map(s => ({ ...s })) : undefined,
        skills: currentUser.skills.map(s => ({ ...s }))
    };
    if (updatedChar.mercenaryData?.activeQuests) {
        updatedChar.mercenaryData.activeQuests = [...updatedChar.mercenaryData.activeQuests];
    }
    if (updatedChar.militaryData?.activeMissions) {
        updatedChar.militaryData.activeMissions = [...updatedChar.militaryData.activeMissions];
    }
    
    let updatedCompanions = currentCompanions.map(c => ({ 
        ...c, 
        stats: { ...c.stats },
        skills: c.skills.map(s => ({ ...s }))
    }));
    let playerUpdated = false;
    let goldUpdated = false;
    const modifiedCompanionIndices = new Set<number>();

    const { finalStats: playerFinalStats } = calculateFinalStats(updatedChar);
    const companionFinalStats = updatedCompanions.map(c => calculateFinalStats(c).finalStats);

   logs.forEach(logLine => {
        const killMatch = logLine.match(/\[시스템\]\s*(.+?)\s*처치!/);
        if (killMatch) {
            // [MODIFIED] 모든 접두어 태그 제거 정규식 적용
            const monsterName = killMatch[1].trim()
                .replace(/\[.*?\]/g, '') // 모든 [대괄호] 태그 제거
                .trim();
            
            // [NEW] 공백을 제거한 정규화 이름 생성
            const cleanMonsterName = monsterName.replace(/\s+/g, '');

            if (updatedChar.mercenaryData?.activeQuests) {
                updatedChar.mercenaryData.activeQuests = updatedChar.mercenaryData.activeQuests.map(q => {
                        if ((q.type === 'Subjugation'  || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName) {
                        const cleanTargetName = q.targetName.replace(/\s+/g, '');
                        // [MODIFIED] 정규화된 이름으로 포함 여부 비교
                        if (cleanMonsterName.includes(cleanTargetName) || cleanTargetName.includes(cleanMonsterName)) {
                            playerUpdated = true;
                            return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                        }
                    }
                    return q;
                });
            }

            if (updatedChar.militaryData?.activeMissions) {
                updatedChar.militaryData.activeMissions = updatedChar.militaryData.activeMissions.map(q => {
                   if ((q.type === 'Subjugation'  || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName) {
                        const cleanTargetName = q.targetName.replace(/\s+/g, '');
                        // [MODIFIED] 정규화된 이름으로 포함 여부 비교
                        if (cleanMonsterName.includes(cleanTargetName) || cleanTargetName.includes(cleanMonsterName)) {
                            playerUpdated = true;
                            return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                        }
                    }
                    return q;
                });
            }
        }

        const passiveHealMatch = logLine.match(/\[시스템\s*(.+?)\s*(HP|MP)\s*\+([-\d만억조\s,]+)\s*\/\s*패시브/);
        if (passiveHealMatch) {
            const targetName = passiveHealMatch[1].trim();
            const type = passiveHealMatch[2];
            const val = parseKoreanNumber(passiveHealMatch[3]);
            
            if (targetName === updatedChar.name) {
                if (type === 'HP') updatedChar.stats.hp = Math.min(playerFinalStats.maxHp, updatedChar.stats.hp + val);
                if (type === 'MP') updatedChar.stats.mp = Math.min(playerFinalStats.maxMp, updatedChar.stats.mp + val);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    if (type === 'HP') updatedCompanions[cIdx].stats.hp = Math.min(companionFinalStats[cIdx].maxHp, updatedCompanions[cIdx].stats.hp + val);
                    if (type === 'MP') updatedCompanions[cIdx].stats.mp = Math.min(companionFinalStats[cIdx].maxMp, updatedCompanions[cIdx].stats.mp + val);
                    modifiedCompanionIndices.add(cIdx);
                }
            }
        }

        const absorbHealMatch = logLine.match(/\[시스템\s*(.+?)\s*HP\s*\+([-\d만억조\s,]+)\s*\/\s*패시브 스킬.*흡수효과\s*흡수\]/);
        if (absorbHealMatch) {
            const targetName = absorbHealMatch[1].trim();
            const val = parseKoreanNumber(absorbHealMatch[2]);
            if (targetName === updatedChar.name) {
                updatedChar.stats.hp = Math.min(playerFinalStats.maxHp, updatedChar.stats.hp + val);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    updatedCompanions[cIdx].stats.hp = Math.min(companionFinalStats[cIdx].maxHp, updatedCompanions[cIdx].stats.hp + val);
                    modifiedCompanionIndices.add(cIdx);
                }
            }
        }
        
        const simpleHealMatch = logLine.match(/\[시스템\s*(.+?)\s*HP\s*\+([-\d만억조\s,]+)\s*회복\]/);
        if (simpleHealMatch) {
            const targetName = simpleHealMatch[1].trim();
            const val = parseKoreanNumber(simpleHealMatch[2]);
            if (targetName === updatedChar.name) {
                updatedChar.stats.hp = Math.min(playerFinalStats.maxHp, updatedChar.stats.hp + val);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    updatedCompanions[cIdx].stats.hp = Math.min(companionFinalStats[cIdx].maxHp, updatedCompanions[cIdx].stats.hp + val);
                    modifiedCompanionIndices.add(cIdx);
                }
            }
        }

        const passiveDmgMatch = logLine.match(/\[시스템\s*(.+?)\s*HP\s*-([-\d만억조\s,]+)\s*\/\s*패시브 스킬/);
        if (passiveDmgMatch) {
            let targetName = passiveDmgMatch[1].trim();
            const val = parseKoreanNumber(passiveDmgMatch[2]);
            
            const eIdx = updatedEnemies.findIndex(e => e.name === targetName);
            if (eIdx >= 0) {
                updatedEnemies[eIdx] = { ...updatedEnemies[eIdx], hp: Math.max(0, updatedEnemies[eIdx].hp - val) };
            } 
            else if (targetName === updatedChar.name) {
                updatedChar.stats.hp = Math.max(0, updatedChar.stats.hp - val);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    updatedCompanions[cIdx].stats.hp = Math.max(0, updatedCompanions[cIdx].stats.hp - val);
                    modifiedCompanionIndices.add(cIdx);
                }
            }
        }

        // [MODIFIED] 버프 인식 로직: 부활 로그 뒤에 섞여 있는 경우를 대비해 행 시작 앵커(^) 제거 및 유연한 매칭
        const buffMatch = logLine.match(/\[시스템\].*?(.+?)(?:에게|이|가).*?적용\s*\((.+?)\s*([+-]\d+)%\)(?:\s*\((\d+)턴\))?/);
        if (buffMatch) {
            const targetName = buffMatch[1].trim();
            const skillName = "신성 강화"; // 임의 명칭 혹은 추출 시도
            const statName = buffMatch[2].trim(); 
            const val = parseInt(buffMatch[3]);
            const turnMatchInLine = logLine.match(/\((\d+)턴\)/);
            const duration = buffMatch[4] ? parseInt(buffMatch[4]) : (turnMatchInLine ? parseInt(turnMatchInLine[1]) : 4);

            const newStatus: ActiveStatus = {
                name: statName + " 증가",
                duration: duration, 
                effect: `${statName} ${val > 0 ? '+' : ''}${val}%`
            };

            if (targetName === updatedChar.name) {
                if (!updatedChar.statusEffects) updatedChar.statusEffects = [];
                updatedChar.statusEffects.push(newStatus);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    if (!updatedCompanions[cIdx].statusEffects) updatedCompanions[cIdx].statusEffects = [];
                    updatedCompanions[cIdx].statusEffects!.push(newStatus);
                    modifiedCompanionIndices.add(cIdx);
                } else {
                    const eIdx = updatedEnemies.findIndex(e => e.name === targetName);
                    if (eIdx >= 0) {
                        if (!updatedEnemies[eIdx].statusEffects) updatedEnemies[eIdx].statusEffects = [];
                        updatedEnemies[eIdx].statusEffects.push(newStatus);
                    }
                }
            }
        }

        const recoveryMatch = logLine.match(/\[시스템:\s*(.+?)\s*(HP|MP)\s*\+([-\d만억조\s,]+)\s*회복!/);
        if (recoveryMatch) {
            const targetName = recoveryMatch[1].trim();
            const type = recoveryMatch[2]; 
            const val = parseKoreanNumber(recoveryMatch[3]);

            if (!isNaN(val)) {
                if (targetName === updatedChar.name) {
                    if (type === 'HP') updatedChar.stats.hp = Math.min(playerFinalStats.maxHp, updatedChar.stats.hp + val);
                    if (type === 'MP') updatedChar.stats.mp = Math.min(playerFinalStats.maxMp, updatedChar.stats.mp + val);
                    playerUpdated = true;
                } else {
                    const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                    if (cIdx >= 0) {
                        if (type === 'HP') updatedCompanions[cIdx].stats.hp = Math.min(companionFinalStats[cIdx].maxHp, updatedCompanions[cIdx].stats.hp + val);
                        if (type === 'MP') updatedCompanions[cIdx].stats.mp = Math.min(companionFinalStats[cIdx].maxMp, updatedCompanions[cIdx].stats.mp + val);
                        modifiedCompanionIndices.add(cIdx);
                    } else {
                        const eIdx = updatedEnemies.findIndex(e => e.name === targetName);
                        if (eIdx >= 0 && type === 'HP') {
                            updatedEnemies[eIdx].hp = Math.min(updatedEnemies[eIdx].maxHp, updatedEnemies[eIdx].hp + val);
                        }
                    }
                }
            }
        }

        const resurrectMatch = logLine.match(/\[시스템\]\s*(.+?)이\(가\)\s*(.+?)\s*효과로\s*부활했습니다/);
        if (resurrectMatch) {
            const targetName = resurrectMatch[1].trim();
            const hpPctMatch = logLine.match(/HP\s*(\d+)%/);
            const mpPctMatch = logLine.match(/MP\s*(\d+)%/);
            const hpPct = hpPctMatch ? parseInt(hpPctMatch[1]) : 50;
            const mpPct = mpPctMatch ? parseInt(mpPctMatch[1]) : 50;

            const applyRes = (entity: any, maxStats: Stats) => {
                entity.isDead = false;
                entity.stats.hp = Math.floor(maxStats.maxHp * (hpPct / 100));
                entity.stats.mp = Math.floor(maxStats.maxMp * (mpPct / 100));
                if (entity.statusEffects) {
                    entity.statusEffects = entity.statusEffects.filter((s: any) => 
                        !["소멸", "공포", "저주", "감전", "빙결", "속박","중독"].includes(s.name)
                    );
                }
            };

            if (targetName === updatedChar.name) {
                applyRes(updatedChar, playerFinalStats);
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    applyRes(updatedCompanions[cIdx], companionFinalStats[cIdx]);
                    modifiedCompanionIndices.add(cIdx);
                }
            }

            // [NEW] 동일 라인에 스탯 증가 수치가 있다면 추가 파싱 (복합 스킬 대응)
            const inlineBuffMatch = logLine.match(/\((.+?)\s*([+-]\d+)%\)/);
            if (inlineBuffMatch) {
                const statName = inlineBuffMatch[1].trim();
                const val = parseInt(inlineBuffMatch[2]);
                const statusEffect: ActiveStatus = {
                    name: statName + " 증가(부활)",
                    duration: 3,
                    effect: `${statName} ${val > 0 ? '+' : ''}${val}%`
                };

                if (targetName === updatedChar.name) {
                    updatedChar.statusEffects.push(statusEffect);
                } else {
                    const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                    if (cIdx >= 0) updatedCompanions[cIdx].statusEffects!.push(statusEffect);
                }
            }
        }

        // [NEW] 마나 쉴드 파싱 (남은 보호막 수치 동기화)
        const manaShieldMatch = logLine.match(/\[시스템\].*?(.+?)(?:에게|의|의).*?마나 쉴드.*?보호막[:\s+]*([-\d만억조\s,]+)/);
        if (manaShieldMatch) {
            const targetName = manaShieldMatch[1].trim();
            const val = parseKoreanNumber(manaShieldMatch[2]);
            const isPassiveLog = logLine.includes('패시브');
            const newStatus: ActiveStatus = {
                name: "마나 쉴드",
                duration: isPassiveLog ? 999 : 3,
                effect: `피해를 흡수하는 마법 보호막 (${formatKoreanNumber(val)})`,
                val: val
            };
            if (isPassiveLog) (newStatus as any).isPassive = true;

            if (targetName === updatedChar.name) {
                if (!updatedChar.statusEffects) updatedChar.statusEffects = [];
                const existing = updatedChar.statusEffects.find(e => e.name === '마나 쉴드');
                if (existing) {
                    existing.val = val; // 합산이 아니라 로그에 찍힌 남은 수치로 동기화
                    existing.effect = `피해를 흡수하는 마법 보호막 (${formatKoreanNumber(existing.val)})`;
                    if (isPassiveLog) {
                        existing.duration = 999;
                        (existing as any).isPassive = true;
                    }
                } else {
                    updatedChar.statusEffects.push(newStatus);
                }
                playerUpdated = true;
            } else {
                const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (cIdx >= 0) {
                    if (!updatedCompanions[cIdx].statusEffects) updatedCompanions[cIdx].statusEffects = [];
                    const existing = updatedCompanions[cIdx].statusEffects!.find(e => e.name === '마나 쉴드');
                    if (existing) {
                        existing.val = val;
                        existing.effect = `피해를 흡수하는 마법 보호막 (${formatKoreanNumber(existing.val)})`;
                        if (isPassiveLog) {
                            existing.duration = 999;
                            (existing as any).isPassive = true;
                        }
                    } else {
                        updatedCompanions[cIdx].statusEffects!.push(newStatus);
                    }
                    modifiedCompanionIndices.add(cIdx);
                }
            }
        }

        // [MODIFIED] 상태이상 해제 파싱 로직 강화
        if (logLine.includes('상태이상 해제') || logLine.includes('효과가 사라졌습니다')) {
            // 정규표현식 보강: '상태이상 해제(상태명)' 형태와 '상태명 효과가 사라졌습니다' 형태를 모두 지원
            // [FIX] [^\]\)]+ 를 사용하여 괄호나 대괄호에 갇히지 않고 유연하게 상태 정보를 캡처함
            const expireRegex = /(?:\[시스템:\s*|\[시스템\]\s*)(.+?)(?:\s*상태이상\s*해제\s*\(?([^\]\)]+)\)?|\s*의\s*(.+?)\s*효과가\s*사라졌습니다)/;
            const match = logLine.match(expireRegex);
            
            // 모든 상태이상 해제 케이스 별도 체크
            const isAll = logLine.includes('모든 상태이상 해제');
            
            if (match || isAll) {
                // match가 없는 경우(모든 상태이상 해제 등)에도 대상 이름 추출 시도
                const targetNameMatch = logLine.match(/(?:\[시스템:\s*|\[시스템\]\s*)(.+?)(?:\s*상태이상\s*해제|\s*모든)/);
                const targetName = (match ? match[1] : (targetNameMatch ? targetNameMatch[1] : "")).trim();
                const statusName = (match ? (match[2] || match[3] || "") : "").trim();
                
                if (targetName) {
                    const clearStatus = (list: ActiveStatus[] = []) => {
                        if (isAll) return [];
                        // [FIX] 로그에 '화상 / 스킬이름 사용' 과 같이 메타데이터가 섞여있는 경우를 위해 포함 여부(.includes)로 체크
                        return list.filter(s => {
                            if (!statusName) return true;
                            return !statusName.includes(s.name);
                        });
                    };

                    if (updatedChar.name === targetName && updatedChar.statusEffects) {
                        updatedChar.statusEffects = clearStatus(updatedChar.statusEffects);
                        playerUpdated = true;
                    }
                    
                    updatedCompanions.forEach((comp, idx) => {
                        if (comp.name === targetName && comp.statusEffects) {
                            const initialLen = comp.statusEffects.length;
                            comp.statusEffects = clearStatus(comp.statusEffects);
                            if (comp.statusEffects.length !== initialLen || isAll) modifiedCompanionIndices.add(idx);
                        }
                    });

                    updatedEnemies = updatedEnemies.map(e => {
                        if (e.name === targetName && e.statusEffects) {
                            return { ...e, statusEffects: clearStatus(e.statusEffects) };
                        }
                        return e;
                    });
                }
            }
        }



        const skillMasteryRegex = /\[시스템:\s*(.+?)\s*스킬숙련도\s*(.+?)\s*\+(\d+)\]/;
        const skillMasteryMatch = logLine.match(skillMasteryRegex);
        if (skillMasteryMatch) {
            const targetName = skillMasteryMatch[1].trim();
            const skillName = skillMasteryMatch[2].trim();
            const amount = parseInt(skillMasteryMatch[3]) || 1;
            if (targetName === updatedChar.name) {
                const skill = updatedChar.skills.find(s => s.name === skillName);
                if (skill) {
                    skill.currentMastery = (skill.currentMastery || 0) + amount;
                    let requiredMastery = 20 * (skill.level + 4);
                    while (skill.currentMastery >= requiredMastery && skill.level < (skill.maxLevel || 10)) {
                        skill.currentMastery -= requiredMastery;
                        skill.level += 1;
                        if (skill.type !== SkillType.DEBUFF) {
                            skill.mpCost = getReducedMpCostOnLevelUp(skill);
                        }
                        requiredMastery = 20 * (skill.level + 4);
                    }
                    if (skill.level >= (skill.maxLevel || 10)) {
                        skill.currentMastery = Math.min(skill.currentMastery, requiredMastery);
                    }
                    playerUpdated = true;
                }
            } 
            else {
                const compIdx = updatedCompanions.findIndex(c => c.name === targetName);
                if (compIdx >= 0) {
                    const comp = updatedCompanions[compIdx];
                    const skill = comp.skills.find(s => s.name === skillName);
                    if (skill) {
                        skill.currentMastery = (skill.currentMastery || 0) + amount;
                        let requiredMastery = 20 * (skill.level + 4);
                        while (skill.currentMastery >= requiredMastery && skill.level < (skill.maxLevel || 10)) {
                            skill.currentMastery -= requiredMastery;
                            skill.level += 1;
                            if (skill.type !== SkillType.DEBUFF) {
                                skill.mpCost = getReducedMpCostOnLevelUp(skill);
                            }
                            requiredMastery = 20 * (skill.level + 4);
                        }
                        if (skill.level >= (skill.maxLevel || 10)) {
                            skill.currentMastery = Math.min(skill.currentMastery, requiredMastery);
                        }
                        modifiedCompanionIndices.add(compIdx);
                    }
                }
            }
        }

        // [REMOVED] Log-based bond skill mastery update logic
        // It is now handled directly in useGame.ts when the skill is used.


        const masteryMatch = logLine.match(/\[시스템:\s*(.+?)\s*\|\s*(.+?)\s+무기숙련도\s*\+(\d+)\s*상승\]/);
        if (masteryMatch) {
            const targetName = masteryMatch[1].trim();
            const rawWeaponType = masteryMatch[2].trim();
            const amount = parseInt(masteryMatch[3]);
            let wType: WeaponType | undefined;
            const entry = Object.entries(WEAPON_TYPE_KOREAN).find(([k, v]) => v === rawWeaponType);
            if (entry) wType = entry[0] as WeaponType; else wType = rawWeaponType as WeaponType; 

            if (wType) {
                if (targetName === updatedChar.name) {
                    const res = addMasteryExp(updatedChar, wType, amount);
                    updatedChar = res.char as Character;
                    playerUpdated = true;
                } else {
                    const compIdx = updatedCompanions.findIndex(c => c.name === targetName);
                    if (compIdx >= 0) {
                        const res = addMasteryExp(updatedCompanions[compIdx], wType, amount);
                        updatedCompanions[compIdx] = res.char as Companion;
                        modifiedCompanionIndices.add(compIdx);
                    }
                }
            }
        }

        const hpRegexGlobal = /\[시스템[:]?\s*(.+?)\s+HP\s*([-+]?[\d만억조\s,]+)\]/i;
        const hpMatch = logLine.match(hpRegexGlobal);
        if (hpMatch && !logLine.includes('패시브') && !logLine.includes('회복!')) {
            const targetName = hpMatch[1].trim();
            const val = parseKoreanNumber(hpMatch[2]);
            if (!isNaN(val)) {
                if (targetName === updatedChar.name) {
                    updatedChar.stats.hp = Math.max(0, Math.min(playerFinalStats.maxHp, updatedChar.stats.hp + val));
                    playerUpdated = true;
                } else {
                    const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                    if (cIdx >= 0) {
                        updatedCompanions[cIdx].stats.hp = Math.max(0, Math.min(companionFinalStats[cIdx].maxHp, updatedCompanions[cIdx].stats.hp + val));
                        modifiedCompanionIndices.add(cIdx);
                    } else {
                        const eIdx = updatedEnemies.findIndex(e => e.name === targetName);
                        if (eIdx >= 0) {
                            updatedEnemies[eIdx] = { ...updatedEnemies[eIdx], hp: Math.max(0, updatedEnemies[eIdx].hp + val) };
                        }
                    }
                }
            }
        }

        const mpRegexGlobal = /\[시스템[:]?\s*(.+?)\s+MP\s*([-+]?[\d만억조\s,]+)\]/i;
        const mpMatch = logLine.match(mpRegexGlobal);
        if (mpMatch && !logLine.includes('패시브') && !logLine.includes('회복!')) {
            const targetName = mpMatch[1].trim();
            const val = parseKoreanNumber(mpMatch[2]);
            if (!isNaN(val)) {
                if (targetName === updatedChar.name) {
                    updatedChar.stats.mp = Math.max(0, Math.min(playerFinalStats.maxMp, updatedChar.stats.mp + val));
                    playerUpdated = true;
                } else {
                    const cIdx = updatedCompanions.findIndex(c => c.name === targetName);
                    if (cIdx >= 0) {
                        updatedCompanions[cIdx].stats.mp = Math.max(0, Math.min(companionFinalStats[cIdx].maxMp, updatedCompanions[cIdx].stats.mp + val));
                        modifiedCompanionIndices.add(cIdx);
                    }
                }
            }
        }

        const statusApplyMatch = logLine.match(/\[시스템\]\s*(.+?)(\s*에게)?\s*(.+?)\s*효과 적용/);
        const ailmentHangMatch = logLine.match(/\[시스템\]\s*(.+?)\s*상태이상\s*(.+?)\s*걸림/);
        
const processStatus = (tName: string, sName: string) => {
             const ailmentName = sName.replace(/\(\d+턴\)/, '').trim();
             if (ailmentName === '월암' || ailmentName === '냉기' || ailmentName === '방어 태세' || STATUS_AILMENTS_LIST.includes(ailmentName)) {
                const ailmentData = STATUS_AILMENTS_DATA[ailmentName];
                const turnMatch = logLine.match(/\((\d+)턴\)/);
                let duration = turnMatch ? parseInt(turnMatch[1]) : 2;
                if (!turnMatch) {
                    if (["빙결", "속박", "소멸", "혼란", "감전","중독"].includes(ailmentName)) duration = 2;
                }
                if (ailmentName === '방어 태세') duration = 1;

                const newStatus: ActiveStatus = {
                    name: ailmentName,
                    duration: duration, 
                    effect: ailmentName === '방어 태세' ? "받는 피해 50% 감소" : (ailmentData?.desc || "상태이상")
                };

                if (tName === updatedChar.name) {
                    if (!updatedChar.statusEffects) updatedChar.statusEffects = [];
                    const exists = updatedChar.statusEffects.find(s => s.name === ailmentName);
                    if (!exists) updatedChar.statusEffects.push(newStatus);
                    else exists.duration = duration; 
                    playerUpdated = true;
                } 
                else {
                    const cIdx = updatedCompanions.findIndex(c => c.id === tName || c.name === tName);
                    if (cIdx >= 0) {
                        if (!updatedCompanions[cIdx].statusEffects) updatedCompanions[cIdx].statusEffects = [];
                        const exists = updatedCompanions[cIdx].statusEffects!.find(s => s.name === ailmentName);
                        if (!exists) updatedCompanions[cIdx].statusEffects!.push(newStatus);
                        else exists.duration = duration;
                        modifiedCompanionIndices.add(cIdx);
                    } 
                    else {
                        const eIdx = updatedEnemies.findIndex(e => e.name === tName);
                        if (eIdx >= 0) {
                            const enemy = updatedEnemies[eIdx];
                            if (!enemy.statusEffects) enemy.statusEffects = [];
                            const exists = enemy.statusEffects.find(s => s.name === ailmentName);
                            if (!exists) enemy.statusEffects.push(newStatus);
                            else exists.duration = duration;
                            updatedEnemies[eIdx] = enemy;
                        }
                    }
                }
             }
        };

        if (statusApplyMatch) processStatus(statusApplyMatch[1].trim(), statusApplyMatch[3].trim());
        if (ailmentHangMatch) processStatus(ailmentHangMatch[1].trim(), ailmentHangMatch[2].trim());

        if (/^\[시스템\].*(EXP|경험치)/.test(logLine)) {
            const expMatch = logLine.match(/(?:EXP|경험치)\s*\+?(\d+)/i);
            if (expMatch) {
                const { expBonus, expMultiplier = 1 } = calculateRewardBonuses(updatedChar);
                const expVal = Math.floor(parseInt(expMatch[1]) * (1 + expBonus / 100) * expMultiplier);
                updatedChar.currentExp += expVal;
                updatedCompanions.forEach((c, idx) => { c.currentExp += expVal; modifiedCompanionIndices.add(idx); });
                playerUpdated = true;
            }
        }
        if (/^\[시스템\].*(GOLD|골드|G)/.test(logLine)) {
            const goldMatch = logLine.match(/(?:GOLD|골드|G)\s*\+?(\d+)/i);
            if (goldMatch) { 
                const { goldBonus } = calculateRewardBonuses(updatedChar);
                const goldVal = Math.floor(parseInt(goldMatch[1]) * (1 + goldBonus / 100));
                updatedChar.money += goldVal; 
                goldUpdated = true; 
            }
        }

        if (logLine.startsWith('[시스템 전리품 획득!')) {
            const lootMatch = logLine.match(/\[시스템 전리품 획득!\s*(.+?)\]/);
            if (lootMatch) {
                const itemName = lootMatch[1].trim();
                    // [NEW] 인벤토리 가득 참 체크
                if (updatedChar.inventory.length >= calculateInventorySize(updatedChar.stats)) {
                    return; // 획득 불가
                }
                
                let worldItemData = null;
                // [NEW] 전투 참가 몬스터들의 detailedLoot에서 먼저 아이템을 검색하여 부스트된 원본 데이터를 유지함
                if (updatedEnemies && updatedEnemies.length > 0) {
                    for (const enemy of updatedEnemies) {
                        if (enemy && enemy.detailedLoot) {
                            const lootArray = Array.isArray(enemy.detailedLoot) ? enemy.detailedLoot : [enemy.detailedLoot];
                            const found = lootArray.find(item => item && item.name === itemName);
                            if (found) {
                                try {
                                    worldItemData = JSON.parse(JSON.stringify(found));
                                } catch (e) {
                                    worldItemData = { ...found };
                                }
                                break;
                            }
                        }
                    }
                }
                
                if (!worldItemData) {
                    worldItemData = findItemDataInWorldTables ? findItemDataInWorldTables(itemName) : ((window as any).findItemDataInWorldTables ? (window as any).findItemDataInWorldTables(itemName) : null);
                }
                
                if (worldItemData) {
                    const alreadyHas = updatedChar.inventory.some(i => i.name === itemName && !['Consumable', 'Etc'].includes(i.type));
                    if (!alreadyHas || ['Consumable', 'Etc'].includes(worldItemData.type)) {
                        const secondaryOptions = worldItemData.secondaryOptions || worldItemData.options || [];
                        // [MODIFIED] 옵션을 분석하여 자동으로 속성 설정
                        let detectedElementalType: string | undefined = worldItemData.elementalType || extractElementalType(secondaryOptions);
                        
                        if (!detectedElementalType) {
                            const checkStr = (worldItemData.item || worldItemData.name || "") + " " + (secondaryOptions).join(" ") + " " + (worldItemData.description || "");
                            if (checkStr.includes('화염')) detectedElementalType = '화염계';
                            else if (checkStr.includes('빙결')) detectedElementalType = '빙결계';
                            else if (checkStr.includes('전격')) detectedElementalType = '전격계';
                            else if (checkStr.includes('암흑')) detectedElementalType = '암흑계';
                            else if (checkStr.includes('광휘')) detectedElementalType = '광휘계';
                            else if (checkStr.includes('대지')) detectedElementalType = '대지계';
                            else if (checkStr.includes('질풍')) detectedElementalType = '질풍계';
                            else if (checkStr.includes('해수')) detectedElementalType = '해수계';
                            else if (checkStr.includes('태양')) detectedElementalType = '태양계';
                            else if (checkStr.includes('월광')) detectedElementalType = '월광계';
                            else if (checkStr.includes('무기강화')) detectedElementalType = '무기강화계';
                            else if (checkStr.includes('신체강화')) detectedElementalType = '신체강화계';
                            else if (checkStr.includes('강철')) detectedElementalType = '강철계';
                            else if (checkStr.includes('초화')) detectedElementalType = '초화계';
                        }

                        updatedChar.inventory.push({
                            name: worldItemData.item || worldItemData.name,
                            type: worldItemData.type,
                            weaponType: worldItemData.weaponType,
                            elementalType: detectedElementalType,
                            rarity: worldItemData.rarity,
                            description: worldItemData.description || '전리품',
                            stats: worldItemData.stats || {},
                            secondaryOptions: secondaryOptions,
                            enhancement: 0,
                            imageUrl: worldItemData.imageUrl 
                        });
                        playerUpdated = true;
                    }
                } 
                else if (itemName === '제국의 통행증') {
                    const hasPass = updatedChar.inventory.some(i => i.name === itemName);
                    if (!hasPass) {
                        updatedChar.inventory.push({
                            name: "제국의 통행증",
                            type: "Etc",
                            rarity: ItemRarity.LEGENDARY,
                            description: "임페리얼 제국 출입 허가증",
                            enhancement: 0
                        });
                        playerUpdated = true;
                    }
                } 
            }
        }
    });

    return { updatedEnemies, updatedChar, updatedCompanions, playerUpdated, modifiedCompanionIndices, goldUpdated };
};
