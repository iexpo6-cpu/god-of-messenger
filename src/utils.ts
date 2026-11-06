
import LZString from 'lz-string';
import { Character, Companion, Stats, Item, ItemRarity, MythicOptionType, MagyeOptionType, Skill, BondSkill, SkillType, Enemy, DerivedStats, ClassTier, ActiveStatus, WeaponType, SimpleStudent,BlacksmithRank, AlchemistRank, TrainerRank, TrainerBranch, TRAINER_RANK_CONFIG, CapturedMonster, MonsterStage, SchoolTier, TournamentMatch, MercenaryRank, JobType, MilitaryRank, RelationType, BattlePosition, CombatStyle, BattleRole, SecondaryBattleRole, CombatStyleProgressData, HousekeeperRank, HOUSEKEEPER_RANK_CONFIG, HouseType, HouseBuilding, ChefRank, CHEF_RANK_CONFIG, Location, GameLocation } from './types';
import { SELL_PRICES, SHINRYOKU_AFFINITY, BASE_MONSTERS,MILITARY_RANK_ORDER, MONSTER_PREFIXES, SHINRYOKU_TYPES_LIST, NATION_NAMES, HUMANOID_CLASSES, ENEMY_SKILL_POOL, WEAPON_KEYWORDS, WEAPON_MASTERY_CONFIG, WEAPON_MASTERY_MAX_LEVEL, NATION_DATA, WORLD_GEOGRAPHY, MILITARY_RANK_THRESHOLD, STATUS_AILMENTS_DATA, STATUS_AILMENTS_LIST, COMBAT_STYLE_SPECIALTIES, COMBAT_STYLE_CONFIG, COMBAT_STYLE_TIER_REQUIREMENTS, CombatStyleTrainingReq, WEAPON_TYPE_KOREAN, getHumanoidClassByTier } from './constants';
import { getCombatStyleSkillSet, COMBAT_STYLE_SKILL_DATA } from './combatStyleSkills';
import { WORLD_LOOT_TABLES, findItemDataInWorldTables, getChanceByRarity } from './monsterLootTable';
import { getReputationRangeByRank, MERCENARY_RANK_THRESHOLD } from './mercenaryRankUp';
import { TITLES } from './titles';
import { ITEM_PREFIXES, ITEM_MATERIALS, OPTION_TEMPLATES, RARITY_VALUE_RANGE } from './itemPools';
import { RARITY_CONFIG } from './components/WorkshopModal';
import { getMonsterInfo } from './monsterfield';
import { DIVINE_MONSTER_IMAGE_MAP } from './divinemonsterfield';
import { DIVINE_MONSTER_LOOT } from './divinemonsterloot';
import { CHARACTER_PRESETS } from './appearance';
import { processAutomaticGrowth, ensureLiberationPotential, checkAndInitializeLiberationEligibility, TIER_RANK } from './services/companionGrowthService';
import { handleCookedFoodConsumption } from './recipes';
import { areSiblings, isHalfSibling } from './services/siblingService';
import { isMythicSeasonalBoss } from './mythicbossmonsters';
import { elixirRealtimeService } from './services/elixirRealtimeService';
import { isAttackSkillWithBuff } from './utils/finalClassSkillHelper';
import { calculateDotDamage } from './services/dotDamageService';
import { getCachedFinalStats } from './services/combatPerformanceService';
import { processBossDetailedLoot, ensureBossLootProcessed } from './services/bossLootBoostService';
import { calculateBossSetEffects } from './services/bossSetEffectService';
import { calculateControlPenetration, calculateControlResistance, getEffectiveDefenseWithControl, adjustDebuffRateWithControl } from './services/controlCombatService';
import { refreshBuffDiminishingStatus } from './services/buffDiminishingManager';
import { getLevelUpMpReductionBonus } from './services/aoeSkillEnhanceService';
import { calculateMountFinalStatBonus } from './services/mountStatService';
import { calculateClassTierStatBonus, getDerivedDefenseMultiplierForClassTier } from './services/classTierDefenseService';
import { computeRefinedCombatPower } from './services/combatPowerCalculator';

/**
 * [NEW] 로컬 아이템 이름 생성기
 */
export const generateLocalItemName = (category: string, subType: string, rarity: ItemRarity): string => {
    const prefixes = ITEM_PREFIXES[rarity];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    const materials = ITEM_MATERIALS[category] || ITEM_MATERIALS["Weapon"];
    const material = materials[Math.floor(Math.random() * materials.length)];
    
    return `${prefix} ${material} ${subType}`;
};

/**
 * [NEW] 전문기술 숙련도 획득 처리
 */
export const gainProfessionExp = (character: Character, profession: keyof NonNullable<Character['professions']>, amount: number): { newChar: Character, leveledUp: boolean, oldLevel: number, newLevel: number } => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.professions) {
        newChar.professions = {
            cooking: { level: 1, exp: 0, maxExp: 100 },
            mining: { level: 1, exp: 0, maxExp: 100 },
            farming: { level: 1, exp: 0, maxExp: 100 },
            research: { level: 1, exp: 0, maxExp: 100 },
            alchemy: { level: 1, exp: 0, maxExp: 100 },
            crafting: { level: 1, exp: 0, maxExp: 100 },
            taming: { level: 1, exp: 0, maxExp: 100 },
            breeding: { level: 1, exp: 0, maxExp: 100 },
        };
    }
    if (!newChar.professions[profession]) {
        newChar.professions[profession] = { level: 1, exp: 0, maxExp: 100 };
    }

    const mastery = newChar.professions[profession];
    const oldLevel = mastery.level || 1;
    if (!mastery.maxExp || mastery.maxExp <= 0) mastery.maxExp = 100;
    mastery.exp = (mastery.exp || 0) + amount;
    let leveledUp = false;

    while (mastery.exp >= mastery.maxExp) {
        mastery.exp -= mastery.maxExp;
        mastery.level = (mastery.level || 1) + 1;
        mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
        leveledUp = true;
    }

    return { newChar, leveledUp, oldLevel, newLevel: mastery.level };
};

/**
 * [NEW] 종합 전투력(Combat Power) 계산기
 * 기본 스탯 외에 물리/마법 공격력, 물리/마법 방어력, 치명타율, 치명타 피해량, 상태이상 저항, 명중/회피 등 파생 전투 스탯을 종합 반영합니다.
 */
export const calculateCombatPower = (target: Character | Companion): number => {
    if (!target) return 0;
    try {
        const { finalStats: fs } = calculateFinalStats(target, { excludeTemporaryBuffs: true });
        const equipment = (target as any).equipment;
        const skills = (target as any).skills;
        const shinryokuType = (target as any).shinryokuType;
        const affection = (target as any).affection;
        const bondBonus = typeof getBondBonus === 'function' ? getBondBonus(target as any) : 0;
        const combatStyle = (target as any).combatStyle;
        const elementalDamageBoosts = (target as any).base?.elementalDamageBoosts;
        const elementalResistanceBoosts = (target as any).base?.elementalResistanceBoosts;
        const battleRole = (target as any).battleRole;
        const battlePosition = (target as any).battlePosition;

        // 무기 및 보조무기 숙련도 분석
        let weaponInfo: { level: number, type: WeaponType } | undefined = undefined;
        let subWeaponInfo: { level: number, type: WeaponType } | undefined = undefined;
        let elementalSynergy = false;

        if (equipment) {
            if (equipment.weapon) {
                const wElement = equipment.weapon.elementalType || (typeof extractElementalType === 'function' ? extractElementalType(equipment.weapon.secondaryOptions || []) : '');
                if (shinryokuType && wElement === shinryokuType) {
                    elementalSynergy = true;
                }
                const wType = typeof getWeaponTypeFromItem === 'function' ? getWeaponTypeFromItem(equipment.weapon) : undefined;
                const wm = (target as any).weaponMastery;
                if (wType && wm && wm[wType]) {
                    weaponInfo = { level: wm[wType].level, type: wType };
                }
            }
            if (equipment.subWeapon) {
                const subType = typeof getWeaponTypeFromItem === 'function' ? getWeaponTypeFromItem(equipment.subWeapon) : undefined;
                const wm = (target as any).weaponMastery;
                if (subType && wm && wm[subType]) {
                    subWeaponInfo = { level: wm[subType].level, type: subType };
                }
            }
        }

        // 전투력은 순수 기본 전투 능력을 반영해야 하므로 일시적인 버프스킬/상태이상(statusEffects)은 빈 배열로 제외
        const derived = calculateDerivedStats(
            fs,
            [],
            weaponInfo,
            subWeaponInfo,
            elementalSynergy,
            skills,
            equipment,
            shinryokuType,
            affection,
            bondBonus,
            elementalDamageBoosts,
            elementalResistanceBoosts,
            battlePosition,
            combatStyle,
            battleRole
        );

        const hp = fs.maxHp || (target as any).stats?.hp || 100;
        const mp = fs.maxMp || (target as any).stats?.mp || 50;
        const str = fs.str || (target as any).stats?.str || 10;
        const agi = fs.agi || (target as any).stats?.agi || 10;
        const int = fs.int || (target as any).stats?.int || 10;
        const wis = fs.wis || (target as any).stats?.wis || 10;
        const def = fs.def || (target as any).stats?.def || 10;
        const ctrl = fs.ctrl || (target as any).stats?.ctrl || 10;

        // 1. 속성 피해 및 속성 저항 종합 전투력 반영
        let elementalDmgScore = 0;
        let elementalResScore = 0;
        if (derived && derived.elemental) {
            if (shinryokuType && derived.elemental[shinryokuType]) {
                const myAtkRatio = Math.max(0, (derived.elemental[shinryokuType].atk || 1.0) - 1.0);
                elementalDmgScore = Math.floor(myAtkRatio * 3000 + Math.max(derived.pAtk, derived.mAtk) * 0.15 * myAtkRatio);
            }
            Object.values(derived.elemental).forEach((el: any) => {
                if (el && typeof el.res === 'number') {
                    const resRatio = Math.max(0, el.res - 1.0);
                    elementalResScore += Math.floor(resRatio * 2000);
                }
            });
        }

        // 2. 패시브 스킬 및 패시브 버프 고유 전투력 점수 반영 (순수 전투력 계산 시에도 온전히 포함)
        let passiveSkillScore = 0;
        if (skills && Array.isArray(skills)) {
            skills.forEach((skill: any) => {
                if (!skill) return;
                const isPassive = skill.type === SkillType.PASSIVE || 
                    String(skill.type).toUpperCase() === 'PASSIVE' || 
                    String(skill.type) === '패시브' || 
                    Boolean(skill.isPassive) ||
                    (typeof skill.effectFormula === 'string' && skill.effectFormula.includes('+%'));
                
                if (isPassive) {
                    const level = skill.level || 1;
                    let tierMultiplier = 1;
                    if (skill.tier === ClassTier.FIRST) tierMultiplier = 1.2;
                    else if (skill.tier === ClassTier.SECOND) tierMultiplier = 1.5;
                    else if (skill.tier === ClassTier.LAST) tierMultiplier = 2.0;
                    else if (skill.tier === ClassTier.FINAL) tierMultiplier = 2.8;

                    let skillBase = (150 + level * 50) * tierMultiplier;

                    if (skill.finalEnhanceData?.passiveScaleBonus) {
                        skillBase += (skill.finalEnhanceData.passiveScaleBonus * level * 20);
                    }
                    if (skill.finalEnhanceData?.passiveCombatSlot) {
                        skillBase += 300;
                    }
                    if (skill.finalEnhanceData?.passiveElementalResonance) {
                        skillBase += 400;
                    }

                    passiveSkillScore += Math.floor(skillBase);
                }
            });
        }

        // 2-1. 전투 계열 고유 패시브 스킬 점수 산출 및 순수 전투력 반영
        // 1) 현재 장착 중인 전투 계열 장착 패시브 (Equipped Passive)
        if (combatStyle && COMBAT_STYLE_CONFIG[combatStyle as CombatStyle]) {
            const styleTier = COMBAT_STYLE_CONFIG[combatStyle as CombatStyle]?.tier || 1;
            const skillSet = getCombatStyleSkillSet(combatStyle as CombatStyle, styleTier);
            if (skillSet?.equippedPassive) {
                const eqTierBase = styleTier === 4 ? 8000 : styleTier === 3 ? 3000 : styleTier === 2 ? 1200 : 400;
                let eqBonusScore = 0;
                const b = skillSet.equippedPassive.statBonus;
                if (b) {
                    if (b.str) eqBonusScore += b.str * 2;
                    if (b.int) eqBonusScore += b.int * 2;
                    if (b.wis) eqBonusScore += b.wis * 2;
                    if (b.def) eqBonusScore += b.def * 2;
                    if (b.agi) eqBonusScore += b.agi * 2;
                    if (b.ctrl) eqBonusScore += b.ctrl * 2;
                    if (b.maxHp) eqBonusScore += b.maxHp * 0.15;
                    if (b.maxMp) eqBonusScore += b.maxMp * 0.15;
                    if (b.pAtkRate) eqBonusScore += b.pAtkRate * 2000;
                    if (b.mAtkRate) eqBonusScore += b.mAtkRate * 2000;
                    if (b.pDefRate) eqBonusScore += b.pDefRate * 2000;
                    if (b.mDefRate) eqBonusScore += b.mDefRate * 2000;
                    if (b.critRate) eqBonusScore += b.critRate * 5000;
                    if (b.critDmg) eqBonusScore += b.critDmg * 1500;
                    if (b.accRate) eqBonusScore += b.accRate * 1500;
                    if (b.mAccRate) eqBonusScore += b.mAccRate * 1500;
                    if (b.evaRate) eqBonusScore += b.evaRate * 1000;
                    if (b.mEvaRate) eqBonusScore += b.mEvaRate * 1000;
                }
                passiveSkillScore += Math.floor(eqTierBase + eqBonusScore);
            }
        }

        // 2) 해금된 모든 전투 계열의 보유 패시브 (Learned Passive) 누적 반영
        const unlockedStylesList = getUnlockedCombatStylesList(target as any);
        unlockedStylesList.forEach((st) => {
            if (COMBAT_STYLE_CONFIG[st as CombatStyle]) {
                const stTier = COMBAT_STYLE_CONFIG[st as CombatStyle]?.tier || 1;
                const stSet = getCombatStyleSkillSet(st as CombatStyle, stTier);
                if (stSet?.learnedPassive) {
                    const lpTierBase = stTier === 4 ? 5000 : stTier === 3 ? 2000 : stTier === 2 ? 800 : 300;
                    let lpBonusScore = 0;
                    const b = stSet.learnedPassive.statBonus;
                    if (b) {
                        if (b.str) lpBonusScore += b.str * 2;
                        if (b.int) lpBonusScore += b.int * 2;
                        if (b.wis) lpBonusScore += b.wis * 2;
                        if (b.def) lpBonusScore += b.def * 2;
                        if (b.agi) lpBonusScore += b.agi * 2;
                        if (b.ctrl) lpBonusScore += b.ctrl * 2;
                        if (b.maxHp) lpBonusScore += b.maxHp * 0.15;
                        if (b.maxMp) lpBonusScore += b.maxMp * 0.15;
                        if (b.pAtkRate) lpBonusScore += b.pAtkRate * 1500;
                        if (b.mAtkRate) lpBonusScore += b.mAtkRate * 1500;
                        if (b.pDefRate) lpBonusScore += b.pDefRate * 1500;
                        if (b.mDefRate) lpBonusScore += b.mDefRate * 1500;
                        if (b.critRate) lpBonusScore += b.critRate * 4000;
                        if (b.critDmg) lpBonusScore += b.critDmg * 1200;
                        if (b.accRate) lpBonusScore += b.accRate * 1200;
                        if (b.mAccRate) lpBonusScore += b.mAccRate * 1200;
                        if (b.evaRate) lpBonusScore += b.evaRate * 800;
                        if (b.mEvaRate) lpBonusScore += b.mEvaRate * 800;
                    }
                    passiveSkillScore += Math.floor(lpTierBase + lpBonusScore);
                }
            }
        });

        // 3. 전투력 밸런싱 엔진 위임 호출 (3번 공방 점감곡선 + 4번 기존 파생스탯 프리미엄 상향)
        return computeRefinedCombatPower({
            hp,
            mp,
            str,
            agi,
            int,
            wis,
            def,
            ctrl,
            pAtk: derived.pAtk,
            mAtk: derived.mAtk,
            pDef: derived.pDef,
            mDef: derived.mDef,
            critChance: derived.critChance,
            critDamage: derived.critDamage,
            critDmgResist: derived.critDmgResist,
            statusResist: derived.statusResist,
            accuracy: derived.accuracy,
            mAccuracy: derived.mAccuracy,
            evasion: derived.evasion,
            mEvasion: derived.mEvasion,
            elementalDmgScore,
            elementalResScore,
            passiveSkillScore,
            battleRole,
            secondaryBattleRole: (target as any).secondaryBattleRole,
            weaponMastery: (target as any).weaponMastery,
            combatStyle,
            unlockedCombatStyles: (target as any).unlockedCombatStyles,
            target,
            skills
        });
    } catch (e) {
        const stats = (target as any).stats || {};
        const hp = stats.hp || 100;
        const mp = stats.mp || 50;
        const str = stats.str || 10;
        const agi = stats.agi || 10;
        const int = stats.int || 10;
        const wis = stats.wis || 10;
        const def = stats.def || 10;
        const ctrl = stats.ctrl || 10;
        let classTierBonus = 0;
        const tier = (target as any).classTier;
        if (tier === ClassTier.FIRST) classTierBonus = 2000;
        else if (tier === ClassTier.SECOND) classTierBonus = 8000;
        else if (tier === ClassTier.LAST) classTierBonus = 25000;
        else if (tier === ClassTier.FINAL) classTierBonus = 80000;
        return Math.floor(hp * 0.25 + mp * 0.25 + (str + agi + int + wis + def) * 2 + ctrl * 1) + classTierBonus;
    }
};

/**
 * [NEW] 장비 슬롯 키 매핑 헬퍼
 */
export const getEquipmentSlotType = (itemType: string): string | null => {
    if (!itemType) return null;
    const t = itemType.trim().toLowerCase();
    if (['무기', 'weapon', 'sword', 'bow', 'staff', 'dagger', 'blunt', 'spear', 'wand', 'axe'].includes(t) || ['무기', 'Weapon'].includes(itemType)) return 'weapon';
    if (['보조무기', 'subweapon', 'shield', '방패', 'subsword'].includes(t) || ['보조무기', 'SubWeapon'].includes(itemType)) return 'subWeapon';
    if (['머리', 'head', '투구', '모자', 'helmet', 'hat', 'circlet'].includes(t) || ['머리', 'Head', '투구', '모자'].includes(itemType)) return 'head';
    if (['상의/하의', 'body', '갑옷', '상의', '하의', 'armor', 'robe', 'clothes', 'suit'].includes(t) || ['상의/하의', 'Body', '갑옷', '상의', '하의'].includes(itemType)) return 'body';
    if (['장갑', 'hand', 'glove', 'gloves', 'gauntlet'].includes(t) || ['장갑', 'Hand'].includes(itemType)) return 'hand';
    if (['신발', 'feet', 'boots', 'shoes'].includes(t) || ['신발', 'Feet'].includes(itemType)) return 'feet';
    if (['장신구', 'accessory', '반지', '목걸이', 'ring', 'necklace', 'earring', 'belt'].includes(t) || ['장신구', 'Accessory', '반지', '목걸이'].includes(itemType)) return 'accessory';
    return null;
};

export interface ItemCombatPowerInfo {
    itemCP: number;             // 아이템 자체의 독립 전투력
    contributionCP?: number;    // 현재 착용 중일 때 캐릭터에 기여하는 전투력 (미착용 시 대비)
    diffCP?: number;            // 미착용 상태에서 현재 장비 슬롯에 착용 시 캐릭터 총 전투력 변동 (+ / -)
    newCP?: number;             // 착용 시 예상 총 전투력
    currentCP?: number;         // 캐릭터 현재 총 전투력
    isEquipped?: boolean;       // 캐릭터가 현재 착용 중인지 여부
    equippedItem?: Item | null; // 현재 해당 슬롯에 장착되어 있는 기존 장비
}

/**
 * [NEW] 아이템의 전투력 및 캐릭터 장착 시 전투력 변동 계산
 */
export const calculateItemCombatPowerContribution = (item: Item, character?: Character | null): ItemCombatPowerInfo => {
    if (!item) return { itemCP: 0 };

    const slot = getEquipmentSlotType(item.type);

    // 1. 단독 아이템 전투력 (Baseline Dummy Character를 통한 실제 엔진 기반 계산)
    const baseDummy: any = {
        stats: { hp: 500, mp: 200, str: 20, agi: 20, int: 20, wis: 20, def: 20, ctrl: 20 },
        equipment: {},
        skills: []
    };
    const baseCP = calculateCombatPower(baseDummy);
    const dummyWithItem: any = {
        ...baseDummy,
        equipment: { [slot || 'weapon']: item }
    };
    const itemCP = Math.max(1, calculateCombatPower(dummyWithItem) - baseCP);

    // 2. 캐릭터가 주어지지 않았거나 장착 불가능한 아이템(소비품/재료 등)인 경우
    if (!character || !slot) {
        return { itemCP };
    }

    try {
        const currentCP = calculateCombatPower(character);
        const equippedItem = (character.equipment as any)?.[slot] as Item | undefined;
        
        const isEquipped = !!(equippedItem && (
            equippedItem === item || 
            (equippedItem.id && item.id && equippedItem.id === item.id) ||
            (equippedItem.name === item.name && equippedItem.enhancement === item.enhancement && equippedItem.rarity === item.rarity)
        ));

        if (isEquipped) {
            // 현재 착용 중: 해당 슬롯을 비웠을 때와의 차이 = 기여 전투력
            const charWithoutItem = {
                ...character,
                equipment: {
                    ...character.equipment,
                    [slot]: undefined
                }
            };
            const cpWithout = calculateCombatPower(charWithoutItem);
            const contributionCP = Math.max(0, currentCP - cpWithout);
            return {
                itemCP,
                contributionCP,
                diffCP: 0,
                newCP: currentCP,
                currentCP,
                isEquipped: true,
                equippedItem: equippedItem || null
            };
        } else {
            // 미착용 상태: 해당 슬롯에 이 아이템을 장착할 때의 변동치
            const charWithItem = {
                ...character,
                equipment: {
                    ...character.equipment,
                    [slot]: item
                }
            };
            const newCP = calculateCombatPower(charWithItem);
            const diffCP = newCP - currentCP;
            return {
                itemCP,
                diffCP,
                newCP,
                currentCP,
                isEquipped: false,
                equippedItem: equippedItem || null
            };
        }
    } catch (e) {
        return { itemCP };
    }
};

/**
 * [NEW] 아이템 강화, 옵션 리롤, 옵션 강화 전/후 전투력 차이 계산
 */
export const calculateItemCPDelta = (
    oldItem: Item | null | undefined, 
    newItem: Item | null | undefined, 
    character?: Character | null
): { 
    beforeCP: number; 
    afterCP: number; 
    diffCP: number;
    oldCP: number;
    newCP: number;
    diff: number;
} => {
    let beforeCP = 0;
    let afterCP = 0;

    const slot = getEquipmentSlotType(oldItem?.type || newItem?.type || '');

    if (character && slot) {
        try {
            // 캐릭터 장착 시뮬레이션
            const charBefore = {
                ...character,
                equipment: {
                    ...character.equipment,
                    ...(oldItem ? { [slot]: oldItem } : {})
                }
            };
            if (!oldItem && character.equipment) {
                const eq = { ...character.equipment };
                delete (eq as any)[slot];
                charBefore.equipment = eq;
            }

            const charAfter = {
                ...character,
                equipment: {
                    ...character.equipment,
                    ...(newItem ? { [slot]: newItem } : {})
                }
            };
            if (!newItem && character.equipment) {
                const eq = { ...character.equipment };
                delete (eq as any)[slot];
                charAfter.equipment = eq;
            }

            beforeCP = calculateCombatPower(charBefore);
            afterCP = calculateCombatPower(charAfter);
            const diffCP = afterCP - beforeCP;
            return {
                beforeCP,
                afterCP,
                diffCP,
                oldCP: beforeCP,
                newCP: afterCP,
                diff: diffCP
            };
        } catch (e) {
            // fallback to itemCP
        }
    }

    const beforeInfo = oldItem ? calculateItemCombatPowerContribution(oldItem) : { itemCP: 0, baseStatsCP: 0, optionsCP: 0, enhancementCP: 0 };
    const afterInfo = newItem ? calculateItemCombatPowerContribution(newItem) : { itemCP: 0, baseStatsCP: 0, optionsCP: 0, enhancementCP: 0 };
    beforeCP = beforeInfo.itemCP;
    afterCP = afterInfo.itemCP;
    const diffCP = afterCP - beforeCP;
    return {
        beforeCP,
        afterCP,
        diffCP,
        oldCP: beforeCP,
        newCP: afterCP,
        diff: diffCP
    };
};

/**
 * [NEW] 플레이어 인벤토리 크기 계산기
 */
export const calculateInventorySize = (stats: Stats): number => {
    return 100 + Math.floor((stats.str || 0) * 0.05);
};

/**
 * [NEW] 기지 창고 총 용량 계산기
 * 모든 창고 시설의 레벨 합산 및 배치된 인원의 STR 보너스 합산
 */
export const calculateTotalStorageCapacity = (base: any, inactiveCompanions: Companion[]): number => {
    if (!base) return 500;
    const storageInstances = base.layout?.filter((inst: any) => 
        inst.type === 'storage' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const storageLv = storageInstances.reduce((sum: number, inst: any) => sum + (inst.level || 0), 0);
    
    let totalStrBonus = 0;
    storageInstances.forEach((inst: any) => {
        const assigneeId = base.assignments?.[inst.id];
        const assignee = inactiveCompanions?.find(c => c.id === assigneeId);
        if (assignee) {
            const workerStats = calculateFinalStats(assignee).finalStats;
            totalStrBonus += workerStats.str;
        }
    });

    // 기본 500 + (총 레벨 * 100) + 총 STR 보너스
    return 500 + (storageLv * 100) + totalStrBonus;
};

/**
 * [NEW] 동료가 바빠질 때(배치, 파견, 활성 파티 합류 등) 전투 훈련소 목록에서 자동으로 제거하는 헬퍼
 */
export const unassignFromTraining = (character: Character, companionId: string): Character => {
    const newChar = { ...character };
    if (!newChar.base || !newChar.base.combatTraining) return newChar;

    const combatTraining = { ...newChar.base.combatTraining };
    let changed = false;

    Object.keys(combatTraining).forEach(instId => {
        const data = combatTraining[instId];
        if (data && data.trainees && data.trainees.some(t => t.companionId === companionId)) {
            combatTraining[instId] = {
                ...data,
                trainees: data.trainees.filter(t => t.companionId !== companionId)
            };
            changed = true;
        }
    });

    if (changed) {
        newChar.base = {
            ...newChar.base,
            combatTraining
        };
    }
    return newChar;
};

/**
 * [NEW] 기지 전투 훈련소 목록을 정리하여 파티(Active Companions)에 속해 있거나 대기명단에 없는 동료들을 자동으로 제외
 */
export const sanitizeCombatTrainingTrainees = (character: Character): Character => {
    if (!character.base || !character.base.combatTraining) return character;

    const activeIds = new Set((character.companions || []).map(c => c.id));
    const inactiveIds = new Set((character.inactiveCompanions || []).map(c => c.id));

    let changed = false;
    const combatTraining = { ...character.base.combatTraining };

    Object.keys(combatTraining).forEach(instId => {
        const data = combatTraining[instId];
        if (data && data.trainees && data.trainees.length > 0) {
            const filteredTrainees = data.trainees.filter(t => {
                // 대기명단(inactiveCompanions)에 존재하고, 활성 파티(companions)에 없어야 함
                return inactiveIds.has(t.companionId) && !activeIds.has(t.companionId);
            });
            if (filteredTrainees.length !== data.trainees.length) {
                combatTraining[instId] = {
                    ...data,
                    trainees: filteredTrainees
                };
                changed = true;
            }
        }
    });

    if (changed) {
        return {
            ...character,
            base: {
                ...character.base,
                combatTraining
            }
        };
    }
    return character;
};

/**
 * [NEW] 주택 종류별 정보 및 건설 비용/효과 설정
 */
export const HOUSE_TYPE_CONFIG: Record<HouseType, {
    type: HouseType;
    name: string;
    capacity: number;
    cost: { gold: number; wood: number; stone: number; iron?: number; manaStone?: number };
    description: string;
    specialEffect?: string;
}> = {
    [HouseType.MY_HOME]: {
        type: HouseType.MY_HOME,
        name: "나의 집",
        capacity: 4,
        cost: { gold: 0, wood: 0, stone: 0 },
        description: "기지 첫 보금자리. 주인공 및 가족/연인이 함께 거주합니다.",
    },
    [HouseType.HOUSE_1F]: {
        type: HouseType.HOUSE_1F,
        name: "1층 주택",
        capacity: 2,
        cost: { gold: 500, wood: 10, stone: 10 },
        description: "2인이 편안하게 거주할 수 있는 아담한 단층 주택.",
    },
    [HouseType.HOUSE_2F]: {
        type: HouseType.HOUSE_2F,
        name: "2층 주택",
        capacity: 4,
        cost: { gold: 1500, wood: 30, stone: 30 },
        description: "4인이 넉넉히 주거할 수 있는 깔끔한 2층 주택.",
    },
    [HouseType.VILLA]: {
        type: HouseType.VILLA,
        name: "빌라",
        capacity: 10,
        cost: { gold: 50000, wood: 1000, stone: 1000 },
        description: "10인이 정답게 어우러져 생활하는 쾌적한 빌라.",
    },
    [HouseType.APARTMENT]: {
        type: HouseType.APARTMENT,
        name: "아파트",
        capacity: 50,
        cost: { gold: 200000, wood: 3000, stone: 3000, iron: 1000 },
        description: "50인까지 많은 인원을 편안히 수용하는 대형 공동 아파트.",
    },
    [HouseType.LUXURY]: {
        type: HouseType.LUXURY,
        name: "초호화 주택",
        capacity: 10,
        cost: { gold: 500000, wood: 5000, stone: 5000, manaStone: 1000 },
        description: "10인이 거주하는 웅장하고 최첨단 편의시설을 갖춘 대저택.",
        specialEffect: "최고급 시설 효과로 거주자의 충성도와 호감도가 지속 최대 상승!",
    },
};

/**
 * [NEW] 건설 가능한 최대 주택 수 계산기
 * 공식: (숙소 레벨 * 5 * 숙소 갯수) + (담당 하우스키퍼의 숙련계수)
 */
export const calculateMaxHousingCount = (base: any, inactiveCompanions: Companion[] = []): { maxCount: number; housingLv: number; housingCount: number; housekeeperCoef: number; housekeeperName?: string; housekeeperRank?: string } => {
    if (!base) return { maxCount: 5, housingLv: 1, housingCount: 1, housekeeperCoef: 0 };

    const housingInstances = base.layout?.filter((inst: any) => inst.type === 'housing') || [];
    const housingLv = housingInstances.reduce((sum: number, inst: any) => sum + (inst.level || 1), 0) || 1;
    const housingCount = Math.max(1, housingInstances.length);

    let housekeeperCoef = 0;
    let housekeeperName: string | undefined = undefined;
    let housekeeperRankStr: string | undefined = undefined;

    const allComps = inactiveCompanions || [];
    // 1. 숙소 시설 담당자 중 하우스키퍼
    housingInstances.forEach((inst: any) => {
        const assigneeId = base.assignments?.[inst.id];
        const assignee = allComps.find(c => c.id === assigneeId);
        if (assignee && (assignee.job === JobType.HOUSEKEEPER || (assignee.job as string) === '하우스 키퍼' || (assignee.job as string) === '하우스키퍼' || assignee.job === JobType.SLAVE || (assignee.job as string) === '노예')) {
            const rank = assignee.housekeeperRank || HousekeeperRank.BEGINNER;
            const cfg = HOUSEKEEPER_RANK_CONFIG[rank];
            if (cfg && cfg.coef > housekeeperCoef) {
                housekeeperCoef = cfg.coef;
                housekeeperName = assignee.name;
                housekeeperRankStr = rank;
            }
        }
    });

    // 2. 전체 대기/파티 동료 중 하우스키퍼
    if (housekeeperCoef === 0) {
        const housekeepers = allComps.filter(c => c.job === JobType.HOUSEKEEPER || (c.job as string) === '하우스 키퍼' || (c.job as string) === '하우스키퍼' || c.job === JobType.SLAVE || (c.job as string) === '노예');
        housekeepers.forEach(hk => {
            const rank = hk.housekeeperRank || HousekeeperRank.BEGINNER;
            const cfg = HOUSEKEEPER_RANK_CONFIG[rank];
            if (cfg && cfg.coef > housekeeperCoef) {
                housekeeperCoef = cfg.coef;
                housekeeperName = hk.name;
                housekeeperRankStr = rank;
            }
        });
    }

    const baseHousingLimit = housingLv * 5 * housingCount;
    const maxCount = baseHousingLimit + housekeeperCoef;

    return {
        maxCount,
        housingLv,
        housingCount,
        housekeeperCoef,
        housekeeperName,
        housekeeperRank: housekeeperRankStr
    };
};

/**
 * [NEW] 기지 숙소 총 용량(수용 인원) 계산기
 * 모든 주택 건물들(base.houses)의 수용 인원 합산
 */
export const calculateTotalHousingCapacity = (base: any, companions: Companion[] = []): number => {
    if (!base) return 20;

    if (base.houses && Array.isArray(base.houses) && base.houses.length > 0) {
        return base.houses.reduce((sum: number, house: any) => {
            if (house.underConstruction && (!house.level || house.level === 0)) {
                return sum;
            }
            let houseCap = house.capacity || 2;
            if (house.assignedHousekeeperId) {
                const hk = companions.find(c => c.id === house.assignedHousekeeperId);
                if (hk && (hk.job === JobType.HOUSEKEEPER || (hk.job as string) === '하우스 키퍼' || (hk.job as string) === '하우스키퍼' || hk.job === JobType.SLAVE || (hk.job as string) === '노예')) {
                    const rank = hk.housekeeperRank || HousekeeperRank.BEGINNER;
                    const cfg = HOUSEKEEPER_RANK_CONFIG[rank];
                    if (cfg) {
                        houseCap += cfg.coef;
                    }
                }
            }
            return sum + houseCap;
        }, 0);
    }

    const housingInstances = base.layout?.filter((inst: any) => 
        inst.type === 'housing' && (!inst.underConstruction || (inst.level || 0) > 0)
    ) || [];
    const housingLv = housingInstances.reduce((sum: number, inst: any) => sum + (inst.level || 0), 0) || 1;
    return 20 * housingLv;
};

/**
 * [NEW] 기지 몬스터 사육소 총 수용량 계산기
 */
export const calculateTotalMonsterCapacity = (base: any): number => {
    if (!base) return 0;
    const monsterFarmInstances = base.layout?.filter((inst: any) => 
        inst.type === 'monster_farm' && (!inst.underConstruction || (inst.level || 0) > 0)
    ) || [];
    const totalFacilityLevel = monsterFarmInstances.reduce((sum: number, inst: any) => sum + (inst.level || 0), 0);
    return totalFacilityLevel * 4;
};

/**
 * [NEW] 기지 인큐베이터(알) 총 수용량 계산기
 */
export const calculateTotalIncubatorCapacity = (base: any, inactiveCompanions: Companion[]): number => {
    if (!base) return 0;
    const monsterFarmInstances = base.layout?.filter((inst: any) => 
        inst.type === 'monster_farm' && (!inst.underConstruction || (inst.level || 0) > 0)
    ) || [];
    const totalFacilityLevel = monsterFarmInstances.reduce((sum: number, inst: any) => sum + (inst.level || 0), 0);
    
    let totalCtrlBonus = 0;
    monsterFarmInstances.forEach((inst: any) => {
        const assigneeId = base.assignments?.[inst.id];
        const assignee = inactiveCompanions?.find(c => c.id === assigneeId);
        if (assignee) {
            const workerStats = calculateFinalStats(assignee).finalStats;
            totalCtrlBonus += Math.floor(workerStats.ctrl * 0.01);
        }
    });

    return Math.floor(totalFacilityLevel * 1 + totalCtrlBonus);
};

/**
 * [NEW] 기지 파견소 총 수용량 계산기
 * 모든 파견소 시설의 레벨 합산 및 배치된 인원의 WIS 보너스 합산
 */
export const calculateTotalDispatchCapacity = (base: any, inactiveCompanions: Companion[]): number => {
    if (!base) return 1;
    const dispatchInstances = base.layout?.filter((inst: any) => inst.type === 'dispatch') || [];
    const totalFacilityLevel = dispatchInstances.reduce((sum: number, inst: any) => sum + inst.level, 0) || 1;
    
    let totalWisBonus = 0;
    dispatchInstances.forEach((inst: any) => {
        const assigneeId = base.assignments?.[inst.id];
        const assignee = inactiveCompanions?.find(c => c.id === assigneeId);
        if (assignee) {
            const workerStats = calculateFinalStats(assignee).finalStats;
            totalWisBonus += Math.floor(workerStats.wis * 0.1);
        }
    });

    return (totalFacilityLevel * 1) + totalWisBonus;
};

/**
 * [NEW] 기지 연금술 실험실 총 생산량 및 비용 계산기
 */
export const getProfessionRank = (level: number): string => {
    if (level < 10) return '초급';
    if (level < 30) return '중급';
    if (level < 50) return '고급';
    if (level < 80) return '장인';
    if (level < 100) return '대성';
    return '신화';
};

/**
 * [NEW] 연금술 숙련도 레벨에 따른 AlchemistRank Enum 변환 (AlchemyModal 기준)
 */
export const getAlchemistRankFromLevel = (level: number): AlchemistRank => {
    if (level >= 100) return AlchemistRank.GRANDMASTER;
    if (level >= 80) return AlchemistRank.MASTER;
    if (level >= 50) return AlchemistRank.ADVANCED;
    if (level >= 20) return AlchemistRank.INTERMEDIATE;
    return AlchemistRank.BEGINNER;
};

/**
 * [NEW] 연금술 숙련도 레벨에 따른 등급 명칭 변환 (AlchemyModal 기준)
 */
export const getAlchemyRankLabel = (level: number): string => {
    if (level >= 100) return '대현자';
    if (level >= 80) return '최상급 연금술사';
    if (level >= 50) return '고급(상급) 연금술사';
    if (level >= 20) return '중급 연금술사';
    return '초급 연금술사';
};

export const calculateTotalAlchemyProduction = (base: any, inactiveCompanions: Companion[]) => {
    if (!base) return { yield: 0, costIron: 0, costManaStone: 0, labCount: 0 };
    const alchemyInstances = base.layout?.filter((inst: any) => inst.type === 'alchemy') || [];
    
    let totalYield = 0;
    let totalCostIron = 0;
    let totalCostManaStone = 0;

    alchemyInstances.forEach((inst: any) => {
        const alcLv = inst.level || 1;
        const workerIds = base.multiAssignments?.[inst.id] || [];
        const workers = inactiveCompanions?.filter(c => workerIds.includes(c.id)) || [];
        
        totalCostIron += 1 * alcLv;
        totalCostManaStone += 1 * alcLv;

        let masteryYieldBonus = 0;

        workers.forEach(worker => {
            if (worker.job === '연금술사') {
                const alchemyLevel = worker.professions?.alchemy?.level || 1;
                masteryYieldBonus += alchemyLevel + 1; // 연금술사 수(+1) + 숙련도 레벨
            }
        });
        
        const finalYieldAmt = Math.max(1, alcLv + masteryYieldBonus);

        totalYield += finalYieldAmt;
    });

    return { yield: totalYield, costIron: totalCostIron, costManaStone: totalCostManaStone, labCount: alchemyInstances.length };
};

/**
 * [NEW] 기지 제작소 총 의뢰 수용량 계산기
 * 모든 제작소 시설의 레벨 합산
 */
export const calculateTotalWorkshopCapacity = (base: any): number => {
    if (!base) return 1;
    const workshopInstances = base.layout?.filter((inst: any) => 
        inst && (inst.type === 'workshop' || inst.id?.includes('workshop')) && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const layoutMax = workshopInstances.reduce((max: number, inst: any) => Math.max(max, Number(inst.level) || 0), 0);
    const layoutSum = workshopInstances.reduce((sum: number, inst: any) => sum + (Number(inst.level) || 0), 0);
    const dictLevel = Number(base.facilityLevels?.['workshop']) || Number(base.facilityLevels?.['제작소']) || 0;
    return Math.max(1, layoutMax, layoutSum, dictLevel);
};

/**
 * [NEW] 기지 연구소 총 레벨 계산기
 * 모든 연구소 시설의 레벨 합산 및 facilityLevels/base.level 완벽 연동
 */
export const calculateTotalLabLevel = (base: any): number => {
    if (!base) return 1;
    
    // 1. Check all layout instances
    const labInstances = base.layout?.filter((inst: any) => 
        inst && (
            inst.type === 'lab' || 
            inst.type === 'research_lab' || 
            inst.type === 'researchLab' || 
            inst.type === 'skill_lab' ||
            inst.type === 'skillLab' ||
            inst.id?.includes('lab') || 
            inst.id?.includes('research')
        ) && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    
    const layoutMax = labInstances.reduce((max: number, inst: any) => Math.max(max, Number(inst.level) || 0), 0);
    const layoutSum = labInstances.reduce((sum: number, inst: any) => sum + (Number(inst.level) || 0), 0);
    
    // 2. Check facilityLevels dictionary
    const dictLevels = [
        base.facilityLevels?.['lab'],
        base.facilityLevels?.['research_lab'],
        base.facilityLevels?.['researchLab'],
        base.facilityLevels?.['skill_lab'],
        base.facilityLevels?.['skillLab'],
        base.facilityLevels?.['연구소'],
        base.facilityLevels?.['스킬 연구소'],
        base.facilityLevels?.['기지 연구소']
    ].map(v => Number(v)).filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    const dictMax = dictLevels.length > 0 ? Math.max(...dictLevels) : 0;
    
    // 3. Fallback to base.level
    const baseLevel = typeof base.level === 'number' && !isNaN(base.level) ? base.level : 0;
    
    return Math.max(1, layoutMax, layoutSum, dictMax, baseLevel);
};

/**
 * [NEW] 기지 훈련장 총 레벨 계산기 (타입별)
 */
export const calculateTotalTrainingLevel = (base: any, type: 'training_exp' | 'training_stat' | 'training_mastery'): number => {
    if (!base) return 0;
    const instances = base.layout?.filter((inst: any) => 
        inst.type === type && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const totalLevel = instances.reduce((sum: number, inst: any) => sum + (inst.level || 0), 0);
    return totalLevel;
};

/**
 * [NEW] 동료의 요리사 등급 정보 조회
 */
export const getCompanionChefRank = (comp: Companion): { rank: ChefRank; level: number; label: string; config: typeof CHEF_RANK_CONFIG[ChefRank] } => {
    const level = comp.professions?.cooking?.level || (comp.job === JobType.CHEF || (comp.job as string) === '요리사' ? 1 : 1);
    let rank = ChefRank.APPRENTICE;
    if (level >= 100) rank = ChefRank.LEGEND;
    else if (level >= 80) rank = ChefRank.MASTER;
    else if (level >= 60) rank = ChefRank.ARTISAN;
    else if (level >= 40) rank = ChefRank.SKILLED;
    else if (level >= 20) rank = ChefRank.NORMAL;
    
    return {
        rank,
        level,
        label: CHEF_RANK_CONFIG[rank].label,
        config: CHEF_RANK_CONFIG[rank]
    };
};

/**
 * [NEW] 요리사의 숙소 전담 배치 가능 여부 판정
 * 견습, 일반 -> 1층 주택
 * 숙련, 장인 -> 2층 주택
 * 명인 -> 빌라
 * 전설 -> 아파트
 */
export const canChefManageHouse = (comp: Companion, houseType: HouseType): { allowed: boolean; reason?: string } => {
    const isChef = comp.job === JobType.CHEF || (comp.job as string) === '요리사' || !!comp.professions?.cooking;
    if (!isChef) {
        return { allowed: false, reason: '요리사 직업 또는 요리 숙련도를 보유한 동료만 전담 배치할 수 있습니다.' };
    }
    const chefInfo = getCompanionChefRank(comp);
    const allowed = chefInfo.config.allowedHouses.includes(houseType);
    if (!allowed) {
        let requiredTitle = '숙련 요리사';
        if (houseType === HouseType.APARTMENT) requiredTitle = '전설 요리사';
        else if (houseType === HouseType.VILLA || houseType === HouseType.LUXURY) requiredTitle = '명인 요리사';
        else if (houseType === HouseType.HOUSE_2F) requiredTitle = '숙련 요리사';

        return {
            allowed: false,
            reason: `해당 주택은 [${requiredTitle}] 이상의 등급이 필요합니다. (현재: ${chefInfo.label} Lv.${chefInfo.level})`
        };
    }
    return { allowed: true };
};

/**
 * [NEW] 기지 일일 식량 소모량 계산기
 * - 거주자 총 인원수 기반
 * - 전담 요리사가 배치된 주택의 거주자는 식량 소모 0
 * - 요리시설에 요리사가 담당으로 배치되어 있다면 전체 식량 소모량 50% 절반 감소
 */
export const calculateDailyFoodConsumption = (base: any, allCompanions: Companion[]) => {
    if (!base) return { totalResidents: 0, exemptResidents: 0, hungryResidents: 0, hasFacilityChef: false, dailyFoodNeed: 0 };

    const houses: HouseBuilding[] = base.houses || [];
    const houseAssignments: Record<string, string> = base.houseAssignments || {};
    const validHouseIds = new Set(houses.map(h => h.id));

    const allValidComps = allCompanions.filter(c => !c.isMonster && !c.isDead);
    let totalResidents = 0;
    let exemptResidents = 0;
    let hungryResidents = 0;

    houses.forEach(house => {
        const residents = allValidComps.filter(c => houseAssignments[c.id] === house.id);
        if (residents.length === 0) return;

        totalResidents += residents.length;
        
        // 전담 요리사 확인 (등급 충족 요리사인지 검증)
        const chef = house.assignedChefId ? allValidComps.find(c => c.id === house.assignedChefId) : undefined;
        const isChefValid = chef && canChefManageHouse(chef, house.type).allowed;

        if (isChefValid) {
            exemptResidents += residents.length;
        } else {
            hungryResidents += residents.length;
        }
    });

    // 요리 시설에 요리사 배치 여부 확인
    const cookingInstances = base.layout?.filter((inst: any) => inst.type === 'cooking') || [];
    let hasFacilityChef = false;
    cookingInstances.forEach((inst: any) => {
        const workerIds: string[] = base.multiAssignments?.[inst.id] || (base.assignments?.[inst.id] ? [base.assignments[inst.id]] : []);
        const workers = allValidComps.filter(c => workerIds.includes(c.id));
        const chefWorker = workers.find(w => w.job === JobType.CHEF || (w.job as string) === '요리사' || (w.professions?.cooking?.level || 0) > 0);
        if (chefWorker) {
            hasFacilityChef = true;
        }
    });

    const dailyFoodNeed = hasFacilityChef ? Math.ceil(hungryResidents * 0.5) : hungryResidents;

    return {
        totalResidents,
        exemptResidents,
        hungryResidents,
        hasFacilityChef,
        dailyFoodNeed
    };
};

export const getBaseDailyFoodConsumption = calculateDailyFoodConsumption;

export interface ProfessionRankConfig {
    rankLevel: number; // 요구 레벨
    reqStr?: number;   // 농부/광부 필요 STR
    reqWis?: number;   // 하우스키퍼 필요 WIS
    label: string;
    bg: string;
    color: string;
}

export const FARMER_RANK_CONFIGS: ProfessionRankConfig[] = [
    { rankLevel: 1, reqStr: 0, label: '견습 농부', color: 'text-slate-400', bg: 'bg-slate-700/30' },
    { rankLevel: 10, reqStr: 30, label: '일반 농부', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { rankLevel: 20, reqStr: 60, label: '숙련 농부', color: 'text-green-400', bg: 'bg-green-400/10' },
    { rankLevel: 50, reqStr: 120, label: '장인 농부', color: 'text-red-400', bg: 'bg-red-400/10' },
    { rankLevel: 80, reqStr: 250, label: '명인 농부', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { rankLevel: 100, reqStr: 500, label: '전설 농부', color: 'text-amber-400', bg: 'bg-amber-400/10' },
];

export const MINER_RANK_CONFIGS: ProfessionRankConfig[] = [
    { rankLevel: 1, reqStr: 0, label: '견습 광부', color: 'text-slate-400', bg: 'bg-slate-700/30' },
    { rankLevel: 10, reqStr: 40, label: '일반 광부', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { rankLevel: 20, reqStr: 80, label: '숙련 광부', color: 'text-green-400', bg: 'bg-green-400/10' },
    { rankLevel: 50, reqStr: 150, label: '장인 광부', color: 'text-red-400', bg: 'bg-red-400/10' },
    { rankLevel: 80, reqStr: 300, label: '명인 광부', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { rankLevel: 100, reqStr: 600, label: '전설 광부', color: 'text-amber-400', bg: 'bg-amber-400/10' },
];

export const HOUSEKEEPER_PROMOTION_WIS_REQ: Record<HousekeeperRank, number> = {
    [HousekeeperRank.BEGINNER]: 0,
    [HousekeeperRank.INTERMEDIATE]: 50,    // 중급: WIS 50 이상 (Lv.21 이상)
    [HousekeeperRank.ADVANCED]: 120,       // 고급: WIS 120 이상 (Lv.41 이상)
    [HousekeeperRank.SUPERIOR]: 250,       // 최고급: WIS 250 이상 (Lv.61 이상)
    [HousekeeperRank.PROFESSIONAL]: 500,   // 전문: WIS 500 이상 (Lv.81 이상)
    [HousekeeperRank.MASTER]: 1000,        // 마스터: WIS 1000 이상 (Lv.91 이상)
    [HousekeeperRank.LEGEND]: 2000         // 레전드: WIS 2000 이상 (Lv.100)
};

export const getHousekeeperRankByLevel = (level: number): HousekeeperRank => {
    if (level >= 100) return HousekeeperRank.LEGEND;
    if (level >= 91) return HousekeeperRank.MASTER;
    if (level >= 81) return HousekeeperRank.PROFESSIONAL;
    if (level >= 61) return HousekeeperRank.SUPERIOR;
    if (level >= 41) return HousekeeperRank.ADVANCED;
    if (level >= 21) return HousekeeperRank.INTERMEDIATE;
    return HousekeeperRank.BEGINNER;
};

/**
 * [NEW] 신화 장비 특별 옵션 설명 생성기
 */
export const getMythicOptionDescription = (type: MythicOptionType): string => {
    switch (type) {
        case MythicOptionType.DEF_IGNORE: 
            return "상대의 물리 및 마법 방어력을 완전히 무시합니다. (스킬 포함)";
        case MythicOptionType.EVA_IGNORE: 
            return "상대의 물리 및 마법 회피율을 무시하고 모든 공격이 무조건 명중합니다.";
        case MythicOptionType.REFLECT: 
            return "받은 피해의 30%를 상대에게 되돌려줍니다. (리턴)";
        case MythicOptionType.UNDEAD: 
            return "전투 중 사망 시 1회에 한해 체력을 100% 회복하며 부활합니다. (불사)";
        case MythicOptionType.NULLIFY: 
            return "20% 확률로 받은 피해를 0으로 처리하거나 3초간 무적 상태가 됩니다.";
        case MythicOptionType.MANA_SHIELD: 
            return "공격 시 또는 피격 시 최대 마나의 10%에 해당하는 보호막을 생성합니다.";
        case MythicOptionType.DOUBLE_ATTACK: 
            return "일반 공격 시 2회 연속 공격하며, 스킬 사용 시에도 일반 공격이 추가로 발동됩니다.";
        case MythicOptionType.INFINITE_MANA: 
            return "자신의 HP가 50% 이하일 때 스킬 사용 시 마나를 소모하지 않습니다.";
        default: 
            return "";
    }
};

export const getRandomMythicOption = (): MythicOptionType => {
    const options = Object.values(MythicOptionType);
    return options[Math.floor(Math.random() * options.length)];
};

/**
 * [NEW] 마계 장비 특별 옵션 설명 생성기
 */
export const getMagyeOptionDescription = (type: MagyeOptionType): string => {
    switch (type) {
        case MagyeOptionType.REFLECT: 
            return "받은 피해의 30%를 상대에게 되돌려줍니다.";
        case MagyeOptionType.UNDEAD: 
            return "전투 중 사망 시 1회에 한해 체력을 100% 회복하며 부활합니다.";
        case MagyeOptionType.NULLIFY: 
            return "20% 확률로 받은 피해를 0으로 처리하거나 3초간 무적 상태가 됩니다.";
        case MagyeOptionType.INFINITE_MANA: 
            return "자신의 HP가 50% 이하일 때 스킬 사용 시 마나를 소모하지 않습니다.";
        case MagyeOptionType.ABSORB:
            return "공격 시 입힌 피해의 30%를 자신의 HP로 회복합니다.";
        case MagyeOptionType.DEMONIZE:
            return "현재 HP가 50% 이하일 때 '악마 상태' 버프(5턴)에 돌입하여 물리/마법 공격력과 AGI가 2배 증가합니다.";
        case MagyeOptionType.CURSE_SPREAD:
            return "공격 시 적에게 강력한 디버프(2턴, 물리/마법 방어력 대폭 감소)를 부여하고, 자신에게도 약한 디버프(2턴)가 지속됩니다.";
        case MagyeOptionType.INSTANT_DEATH:
            return "1% 확률로 공격 시 적을 즉사시킵니다.";
        default: 
            return "";
    }
};

export const getSpecialOptionDescription = (type: MythicOptionType | MagyeOptionType): string => {
    if (Object.values(MythicOptionType).includes(type as MythicOptionType)) {
        return getMythicOptionDescription(type as MythicOptionType);
    }
    return getMagyeOptionDescription(type as MagyeOptionType);
};

export const getRandomMagyeOption = (): MagyeOptionType => {
    const options = Object.values(MagyeOptionType);
    return options[Math.floor(Math.random() * options.length)];
};

export const getBondBonus = (character: Character, target?: Companion): number => {
    if (!character || !character.companions) return 0;
    const currentYear = character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 0;
    
    // If target is provided, calculate bonus for that companion
    if (target) {
        if (target.isMonster || target.isDead) return 0;
        let bonusSum = 0;
        let maxOtherBonus = 0;
        
        // 1. Relationship with Player
        const metYear = target.metYear || currentYear;
        const yearsKnown = Math.max(0, currentYear - metYear);
        
        let playerBonus = 0;
        if (target.isSpouse && target.partnerId === 'player') {
            playerBonus = yearsKnown >= 20 ? 0.20 : 0.15;
        } else if (target.isLover && target.partnerId === 'player') {
            playerBonus = 0.10;
        } else if (target.relation === RelationType.SIBLING || areSiblings(character, target, character)) {
            const aff = target.affection !== undefined ? target.affection : 75;
            if (aff > 30) {
                const isHalf = isHalfSibling(character, target, character);
                playerBonus = isHalf ? 0.025 : 0.06;
            }
        } else if (target.affection >= 80) {
            if (yearsKnown >= 20) playerBonus = 0.10;
            else if (yearsKnown >= 10) playerBonus = 0.05;
        } else if (target.respect !== undefined && target.respect >= 70) {
            playerBonus = 0.05;
        }
        
        bonusSum += playerBonus;
        
        // 2. Relationship with other active companions
        character.companions.forEach(c2 => {
            if (c2.id === target.id || c2.isMonster || c2.isDead) return;
            
            let c2Bonus = 0;
            const rel = target.relations ? target.relations[c2.id] : undefined;
            if (rel) {
                const relMetYear = rel.metYear || currentYear;
                const relYearsKnown = Math.max(0, currentYear - relMetYear);
                
                if (rel.type === RelationType.SPOUSE) {
                    c2Bonus = relYearsKnown >= 20 ? 0.20 : 0.15;
                } else if (rel.type === RelationType.LOVER) {
                    c2Bonus = 0.10;
                } else if (rel.type === RelationType.SIBLING || areSiblings(target, c2, character)) {
                    const aff = rel.affection !== undefined ? rel.affection : 75;
                    if (aff > 30) {
                        const isHalf = rel.isHalf || isHalfSibling(target, c2, character);
                        c2Bonus = isHalf ? 0.025 : 0.06;
                    }
                } else if (rel.affection >= 80) {
                    if (relYearsKnown >= 20) c2Bonus = 0.10;
                    else if (relYearsKnown >= 10) c2Bonus = 0.05;
                }
            } else if (areSiblings(target, c2, character)) {
                const isHalf = isHalfSibling(target, c2, character);
                c2Bonus = isHalf ? 0.025 : 0.06;
            }
            
            if (c2Bonus > maxOtherBonus) maxOtherBonus = c2Bonus;
        });
        
        return bonusSum + maxOtherBonus;
    }
    
    // If no target, calculate for the player
    let maxCompBonus = 0;
    character.companions.forEach(c => {
        if (c.isMonster || c.isDead) return;
        
        let bonus = 0;
        const metYear = c.metYear || currentYear;
        const yearsKnown = Math.max(0, currentYear - metYear);
        
        if (c.isSpouse && c.partnerId === 'player') {
            bonus = yearsKnown >= 20 ? 0.20 : 0.15;
        } else if (c.isLover && c.partnerId === 'player') {
            bonus = 0.10;
        } else if (c.relation === RelationType.SIBLING || areSiblings(character, c, character)) {
            const aff = c.affection !== undefined ? c.affection : 75;
            if (aff > 30) {
                const isHalf = isHalfSibling(character, c, character);
                bonus = isHalf ? 0.025 : 0.06;
            }
        } else if (c.affection >= 80) {
            if (yearsKnown >= 20) bonus = 0.10;
            else if (yearsKnown >= 10) bonus = 0.05;
        } else if (c.respect !== undefined && c.respect >= 70) {
            bonus = 0.05;
        }
        
        if (bonus > maxCompBonus) maxCompBonus = bonus;
    });
    return maxCompBonus;
};

/**
 * [NEW] 로컬 스킬 생성기
 */
export const generateLocalSkillSuggestion = (character: Character, tier: ClassTier): {
    name: string;
    description: string;
    type: string;
    powerRatio: number;
    mpCost: number;
    effectFormula: string;
    targetType: string;
} => {
    const types = [SkillType.PHYSICAL, SkillType.MAGIC];
    const type = types[Math.floor(Math.random() * types.length)];
    const targetType = Math.random() > 0.5 ? 'single' : 'aoe';
    const powerRatio = tier === ClassTier.NONE ? (targetType === 'aoe' ? 40 : 90) : 100;
    const name = `${character.name}의 ${type === SkillType.PHYSICAL ? '강타' : '섬광'}`;
    const description = "기본적인 기술입니다.";
    const mpCost = 10;
    const effectFormula = `(${type === SkillType.PHYSICAL ? 'P.Atk' : 'M.Atk'} * ${powerRatio/100})`;
    
    return {
        name,
        description,
        type,
        powerRatio,
        mpCost,
        effectFormula,
        targetType
    };
};

/**
 * [NEW] 로컬 아이템 옵션 생성기
 */
export const generateLocalOptions = (rarity: ItemRarity, count: number, category: string): string[] => {
    const options: string[] = [];
    const range = RARITY_VALUE_RANGE[rarity];
    
    // 카테고리에 따른 가중치 풀 구성
    let mainPool = [...OPTION_TEMPLATES.COMMON];
    if (category === 'Weapon') mainPool = [...mainPool, ...OPTION_TEMPLATES.OFFENSIVE];
    else if (category === 'Armor' || category === 'SubWeapon') mainPool = [...mainPool, ...OPTION_TEMPLATES.DEFENSIVE];
    else if (category === 'Accessory') mainPool = [...mainPool, ...OPTION_TEMPLATES.OFFENSIVE, ...OPTION_TEMPLATES.DEFENSIVE];

    // 고등급일수록 특별 옵션 추가
    if (rarity === ItemRarity.EPIC || rarity === ItemRarity.UNIQUE || rarity === ItemRarity.LEGENDARY || rarity === ItemRarity.MYTHTIC) {
        mainPool = [...mainPool, ...OPTION_TEMPLATES.SPECIAL];
    }

    const usedTemplates = new Set<string>();

    for (let i = 0; i < count; i++) {
        let template = "";
        let retry = 0;
        do {
            template = mainPool[Math.floor(Math.random() * mainPool.length)];
            retry++;
        } while (usedTemplates.has(template) && retry < 10);
        
        usedTemplates.add(template);

        // 수치 결정 (정수형 스탯은 수치 크게, 퍼센트는 범위 내)
        let finalOpt = template;
        if (template.includes('{v}')) {
            const isPercent = template.includes('%');
            const value = isPercent 
    ? Math.floor(Math.random() * (range.max - range.min + 1) + range.min)
    : Math.floor(Math.random() * (range.max * 2) + range.min * 5);
            finalOpt = finalOpt.replace('{v}', value.toString());
        }

        // 속성 결정
        if (finalOpt.includes('{type}')) {
            const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            finalOpt = finalOpt.replace('{type}', type.replace('계', ''));
        }

        options.push(finalOpt);
    }

    return options;
};

/**
 * [NEW] 로컬 기본 스탯 생성기
 */
export const generateLocalBaseStats = (category: string, subType: string, rarity: ItemRarity, smithCoef: number = 1, mastery: number = 0): Partial<Stats> => {
    const range = RARITY_CONFIG[rarity];
    // 기본 수치 = 등급 최소치 * 2 * 대장장이 계수 + 랜덤 보너스
    const baseVal = Math.floor(range.multiplier * smithCoef + Math.floor(mastery / 1000));
    const stats: Partial<Stats> = {};

    if (category === 'Weapon') {
        if (subType.includes('활') || subType.includes('단검') || subType.includes('총')) stats.agi = baseVal;
        else if (subType.includes('지팡이') || subType.includes('마법')) stats.int = baseVal;
        else stats.str = baseVal;
    } else if (category === 'SubWeapon') {
        if (subType.includes('방패')) stats.def = baseVal;
        else if (subType.includes('보주')) { stats.int = Math.ceil(baseVal / 2); stats.wis = Math.ceil(baseVal / 2); }
        else stats.agi = baseVal;
    } else if (category === 'Armor') {
        stats.def = baseVal;
        if (Math.random() < 0.3) stats.hp = baseVal * 10;
    } else if (category === 'Accessory') {
        const roll = Math.random();
        if (roll < 0.25) stats.str = baseVal;
        else if (roll < 0.5) stats.int = baseVal;
        else if (roll < 0.75) stats.agi = baseVal;
        else stats.wis = baseVal;
    }

    return stats;
};

/**
 * [NEW] NPC를 위한 자동 스킬 생성 헬퍼
 */
export const generateNpcSkills = (level: number, element: string, tier: ClassTier): Skill[] => {
    const skills: Skill[] = [];
    const pool = [...(ENEMY_SKILL_POOL[element] || []), ...(ENEMY_SKILL_POOL['일반'] || [])];
    
    // 티어별 스킬 개수
    let skillCount = 1;
    if (tier === ClassTier.SECOND) skillCount = 2;
    if (tier === ClassTier.LAST) skillCount = 3;
    if (tier === ClassTier.FINAL) skillCount = 4;

    for (let i = 0; i < skillCount; i++) {
        const template = pool[Math.floor(Math.random() * pool.length)];
        if (!template) continue;

        skills.push({
            name: template.name || "비기",
            description: template.description || "강력한 공격",
            type: template.type || SkillType.PHYSICAL,
            tier: tier,
            mpCost: template.mpCost || 10,
            level: Math.floor(level / 10) + 1,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: template.effectFormula || "P.Atk*1.5",
            powerRatio: template.powerRatio || 150,
            targetType: template.targetType || 'single'
        });
    }
    return skills;
};
/**
 * [NEW] 아이템 옵션 문자열 배열에서 신력 속성을 추출합니다.
 * "무기강화계 속성 부여" 또는 "화염 속성 부여" 등의 패턴을 분석합니다.
 */
export const extractElementalType = (options: string[]): string | undefined => {
    if (!options || options.length === 0) return undefined;
    
    const found = options.find(opt => opt.includes('속성 부여') || opt.includes('속성부여'));
    if (found) {
        // SHINRYOKU_TYPES_LIST에서 '계'를 뗀 이름이 포함되어 있는지 확인
        const matched = SHINRYOKU_TYPES_LIST.find(type => found.includes(type.replace('계', '')));
        if (matched) return matched;

        // 예외 케이스 처리
        if (found.includes('무의사자')) return '무의사자';
    }
    return undefined;
};

export const getRegionByNation = (nation: string): string => {
    for (const [region, nations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nations[nation]) return region;
    }
    return "기타";
};

export const updateSocialNetworkGrowth = (network: SimpleStudent[], days: number, currentYear: number): { updatedNetwork: SimpleStudent[], growthLogs: string[] } => {
    if (!network || !Array.isArray(network) || network.length === 0 || days <= 0) return { updatedNetwork: Array.isArray(network) ? network : [], growthLogs: [] };

    const growthLogs: string[] = [];
    const M_RANK_ORDER = [
        MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C,
        MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
    ];

    const updatedNetwork = network.map(person => {
        const updated = { ...person } as any;

        // 1. 나이 업데이트 (birthYear 기준)
        if (updated.birthYear) {
            updated.age = (currentYear - updated.birthYear) + "세";
        }

        // 2. 레벨 및 스탯 성장 로직
        const growthChance = (days / 30) * 0.3;
        if (Math.random() < growthChance) {
            const levelGain = Math.floor(Math.random() * 1) + 1;
            updated.level += levelGain;

            // 전투계열 및 무기 숙련도 성장
            assignRandomCombatStyle(updated);

            const statGain = 2 * levelGain;
            if (updated.stats) {
                const style = updated.combatStyle || '';
                const isMage = /(마법|아크메이지|원소|위저드|성직|사제)/.test(style);
                const isRogue = /(궁수|도적|거너|암살자|건슬링어|닌자)/.test(style);

                updated.stats = {
                    ...updated.stats,
                    str: (updated.stats.str || 10) + (isMage ? 0 : isRogue ? 1 : statGain),
                    int: (updated.stats.int || 10) + (isMage ? statGain : 0),
                    def: (updated.stats.def || 10) + (isMage ? 1 : 1),
                    agi: (updated.stats.agi || 10) + (isRogue ? statGain : 1),
                    hp: (updated.stats.hp || 100) + (levelGain * 20)
                };
            }
        }
  // [NEW] 3. 사회 진출 및 직업 획득 로직
        if (updated.job === JobType.UNEMPLOYED || !updated.job) {
            const jobAcquireChance = (days / 30) * 0.05; // 매달 5% 확률로 취업 시도
            if (Math.random() < jobAcquireChance && (currentYear-updated.birthYear) >=20 ) {
                const s = updated.stats;
                const combatPotential = (s.str || 0) + (s.int || 0) + (s.def || 0) + (s.agi || 0);

                if (combatPotential < 150) {
                    // 전투 능력이 낮으면 기술직(대장장이)으로 전향
                    updated.job = JobType.BLACKSMITH;
                    updated.blacksmithRank = BlacksmithRank.BEGINNER;
                    updated.blacksmithMastery = 0;
                    growthLogs.push(`[소식] 과거의 인연 [${updated.name}]이(가) 뛰어난 손재주를 인정받아 대장장이 수습생으로 취업했다는 전갈이 왔습니다.`);
                } else {
                    // 전투 능력이 높으면 군인 혹은 용병으로 진출
                    const roll = Math.random();
                    if (roll < 0.5) {
                        updated.job = JobType.SOLDIER;
                        updated.militaryRank = MilitaryRank.PVT;
                        updated.merit = 0;
                        growthLogs.push(`[소식] 옛 인연 [${updated.name}]이(가) [${updated.nation}] 국방군에 자원입대하여 이등병으로 군 복무를 시작했습니다.`);
                    } else {
                        updated.job = JobType.MERCENARY;
                        updated.mercenaryRank = MercenaryRank.F;
                        updated.reputation = 0;
                        growthLogs.push(`[소식] [${updated.name}]이(가) 자신의 무력을 믿고 용병 길드에 등록하여 정식 용병으로서의 삶을 선택했습니다.`);
                    }
                }
                updated.isStaticRank = false; // 직업을 가졌으므로 이제 계급 변동 시뮬레이션 대상이 됨
            }
        }
        // 2-1. 신력 각성 및 클래스 해방 자동화
        // 관계망 인물들도 동료와 동일하게 레벨별 잠재력 판별 및 전투력 기반 일일 확률을 거쳐 각성합니다.
        const SHINRYOKU_MAP: Record<string, string> = {
            '태양': '광휘계',
            '화염': '화염계',
            '광휘': '광휘계',
            '월광': '암흑계',
            '전격': '전격계',
            '지령': '대지계',
            '질풍': '질풍계',
            '빙결': '빙결계',
            '해수': '해수계',
            '강철': '대지계',
            '암연': '암흑계',
            '초화': '초화계',
            '무': '일반'
        };

        // 기존에 이미 클래스 해방(FIRST 이상) 상태이나 신력계통이 누락된 과거인연 보정
        if (updated.classTier && updated.classTier !== ClassTier.NONE) {
            const isValidCurrentShinryoku = updated.shinryokuType &&
                updated.shinryokuType !== '미개방' &&
                updated.shinryokuType !== '무속성' &&
                updated.shinryokuType !== '없음' &&
                updated.shinryokuType !== 'None' &&
                updated.shinryokuType !== '일반' &&
                updated.shinryokuType !== '무' &&
                SHINRYOKU_TYPES_LIST.includes(updated.shinryokuType);
            
            if (!isValidCurrentShinryoku) {
                updated.shinryokuType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                const appropriateClass = getHumanoidClassByTier(updated.shinryokuType, updated.classTier, updated.combatStyle);
                updated.classType = appropriateClass;
                if (!updated.firstClassName) updated.firstClassName = getHumanoidClassByTier(updated.shinryokuType, ClassTier.FIRST, updated.combatStyle);
                if (updated.classTier === ClassTier.SECOND && !updated.secondClassName) updated.secondClassName = appropriateClass;
                if (updated.classTier === ClassTier.LAST && !updated.lastClassName) updated.lastClassName = appropriateClass;
                if (updated.classTier === ClassTier.FINAL && !updated.finalClassName) updated.finalClassName = appropriateClass;
            }
        }

        for (let d = 0; d < days; d++) {
            const currentTier = updated.classTier || ClassTier.NONE;
            if (currentTier === ClassTier.FINAL) break;

            const level = updated.level || 1;

            // 1. 전투력 계산
            const cp = calculateCombatPower(updated);

            // 2. 포텐셜 보장 및 자질 체크
            ensureLiberationPotential(updated);
            checkAndInitializeLiberationEligibility(updated, cp);

            // 0.001% (0.00001) 확률로 기존 포텐 한 단계 업그레이드!
            if (updated.liberationPotential !== ClassTier.FINAL && Math.random() < 0.00001) {
                const prevPot = updated.liberationPotential || ClassTier.NONE;
                let nextPot = ClassTier.NONE;
                if (prevPot === ClassTier.NONE) nextPot = ClassTier.FIRST;
                else if (prevPot === ClassTier.FIRST) nextPot = ClassTier.SECOND;
                else if (prevPot === ClassTier.SECOND) nextPot = ClassTier.LAST;
                else if (prevPot === ClassTier.LAST) nextPot = ClassTier.FINAL;

                updated.liberationPotential = nextPot;
                checkAndInitializeLiberationEligibility(updated, cp);
                growthLogs.push(`[소식] 옛 인연 [${updated.name}]이(가) 숨겨진 재능의 그릇을 한 단계 한계 돌파하여 새로운 잠재력(${nextPot})을 개화했다는 기분 좋은 소문이 들립니다!`);
            }

            const eligibility = updated.liberationEligibility || {};

            let nextTier: ClassTier | null = null;
            let baseChance = 0;
            let isEligible = false;
            let reqCp = 5000;

            if (currentTier === ClassTier.NONE && level >= 30 && cp >= 5000) {
                nextTier = ClassTier.FIRST;
                isEligible = eligibility.first === true;
                baseChance = 0.01; // 1%
                reqCp = 5000;
            } else if (currentTier === ClassTier.FIRST && level >= 100 && cp >= 25000) {
                nextTier = ClassTier.SECOND;
                isEligible = eligibility.second === true;
                baseChance = 0.004; // 0.4%
                reqCp = 25000;
            } else if (currentTier === ClassTier.SECOND && level >= 500 && cp >= 70000) {
                nextTier = ClassTier.LAST;
                isEligible = eligibility.last === true;
                baseChance = 0.001; // 0.1%
                reqCp = 70000;
            } else if (currentTier === ClassTier.LAST && level >= 1000 && cp >= 200000) {
                nextTier = ClassTier.FINAL;
                isEligible = eligibility.final === true;
                baseChance = 0.0001; // 0.01%
                reqCp = 200000;
            }

            if (nextTier && isEligible) {
                // 전투력 보너스 반영
                const refCp = reqCp;
                const cpBonusMultiplier = 1.0 + Math.min(1.5, cp / refCp);
                const finalChance = baseChance * cpBonusMultiplier;

                if (Math.random() < finalChance) {
                    // 신력 속성 배정: 없거나 '미개방', '무속성', '없음', 'None', '일반', '무' 등 유효하지 않은 모든 경우 랜덤 설정
                    const isValidShinryoku = updated.shinryokuType && 
                        updated.shinryokuType !== '미개방' && 
                        updated.shinryokuType !== '무속성' && 
                        updated.shinryokuType !== '없음' && 
                        updated.shinryokuType !== 'None' && 
                        updated.shinryokuType !== '일반' && 
                        updated.shinryokuType !== '무' &&
                        SHINRYOKU_TYPES_LIST.includes(updated.shinryokuType);

                    if (!isValidShinryoku) {
                        updated.shinryokuType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                    }

                    const shinryoku = updated.shinryokuType;
                    // 티어, 전투 계열, 신력 계통에 맞추어 정확한 클래스명 결정
                    const chosenClassName = getHumanoidClassByTier(shinryoku, nextTier, updated.combatStyle);

                    updated.classTier = nextTier;
                    updated.classType = chosenClassName;
                    if (nextTier === ClassTier.FIRST) {
                        updated.firstClassName = chosenClassName;
                        updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
                    } else if (nextTier === ClassTier.SECOND) {
                        if (!updated.firstClassName) {
                            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
                            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
                        }
                        updated.secondClassName = chosenClassName;
                        updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
                    } else if (nextTier === ClassTier.LAST) {
                        if (!updated.firstClassName) {
                            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
                            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
                        }
                        if (!updated.secondClassName) {
                            updated.secondClassName = getHumanoidClassByTier(shinryoku, ClassTier.SECOND, updated.combatStyle);
                            updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
                        }
                        updated.lastClassName = chosenClassName;
                        updated.lastClassDescription = `${shinryoku} 계통의 3차 클래스 극의`;
                    } else if (nextTier === ClassTier.FINAL) {
                        if (!updated.firstClassName) {
                            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
                            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
                        }
                        if (!updated.secondClassName) {
                            updated.secondClassName = getHumanoidClassByTier(shinryoku, ClassTier.SECOND, updated.combatStyle);
                            updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
                        }
                        if (!updated.lastClassName) {
                            updated.lastClassName = getHumanoidClassByTier(shinryoku, ClassTier.LAST, updated.combatStyle);
                            updated.lastClassDescription = `${shinryoku} 계통의 3차 클래스 극의`;
                        }
                        updated.finalClassName = chosenClassName;
                        updated.finalClassDescription = `${shinryoku} 계통의 궁극 클래스 도달`;
                    }
                    updated.skills = generateNpcSkills(updated.level, updated.shinryokuType, nextTier);

                    growthLogs.push(`[소식] 옛 인연 [${updated.name}]이(가) 스스로 ${shinryoku}의 신력을 각성하고 ${nextTier} 클래스 '${chosenClassName}'(으)로 승급했다는 소문이 들려옵니다! (전투력: ${cp.toLocaleString()})`);
                    break; // 승급 성공했으므로 루프 중지
                }
            }
        }

   // 3. 직업별 특수 성장 (군인/용병) 및 입신양명 로그 생성
        // [MODIFIED] isStaticRank가 true인 경우 계급 자동 변동 시뮬레이션 스킵
        if (!updated.isStaticRank) {
            if (updated.job === JobType.SOLDIER) {
                const prevRank = updated.militaryRank || MilitaryRank.PVT;
                const meritGain = Math.floor(days * (Math.random()));
                updated.merit = (updated.merit || 0) + meritGain;
                
                let nextRank = prevRank;
                for (const r of MILITARY_RANK_ORDER) {
                    if (updated.merit >= MILITARY_RANK_THRESHOLD[r]) {
                        nextRank = r;
                    } else {
                        break;
                    }
                }
                
                // [MODIFIED] 계급 강등 방지: 새로 계산된 계급이 기존보다 높을 때만 업데이트
                if (MILITARY_RANK_ORDER.indexOf(nextRank) > MILITARY_RANK_ORDER.indexOf(prevRank)) {
                    updated.militaryRank = nextRank;
                    const baseClass = updated.classType?.split(' (')[0] || "군인";
                    updated.classType = `${baseClass} (${nextRank})`;
                    growthLogs.push(`[입신양명] 예전에 알고 지내던 [${updated.name}]이(가) [${updated.nation}]의 ${nextRank}(으)로 임관했다는 소식이 들립니다.`);
                }
            }

            if (updated.job === JobType.MERCENARY) {
                const prevRank = updated.mercenaryRank || MercenaryRank.F;
                const repGain = Math.floor((days*2) * (Math.random()));
                updated.reputation = (updated.reputation || 0) + repGain;
                
                let nextRank = prevRank;
                for (const r of M_RANK_ORDER) {
                    if (updated.reputation >= MERCENARY_RANK_THRESHOLD[r]) {
                        nextRank = r;
                    } else {
                        break;
                    }
                }
                
                // [MODIFIED] 계급 강등 방지: 새로 계산된 계급이 기존보다 높을 때만 업데이트
                if (M_RANK_ORDER.indexOf(nextRank) > M_RANK_ORDER.indexOf(prevRank)) {
                    updated.mercenaryRank = nextRank;
                    growthLogs.push(`[입신양명] 명성을 쌓던 옛 친구 [${updated.name}]이(가) [${nextRank}]급 용병으로 승급하며 전 세계에 이름을 떨치고 있습니다.`);
                }
            }
        }

        return updated as SimpleStudent;
    });

    return { updatedNetwork, growthLogs };
};

/**
 * [NEW] 이미지 최적화 (리사이징 및 압축)
 * Firestore 1MB 제한을 고려하여 이미지를 최적화합니다.
 */
export const optimizeImage = async (dataUrl: string, maxWidth: number = 512, maxHeight: number = 512, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // CORS 이슈 방지
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 비율 유지하며 리사이징
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            
            // WebP로 압축 (투명도 유지 및 고압축)
            const optimizedDataUrl = canvas.toDataURL('image/webp', quality);
            resolve(optimizedDataUrl);
        };
        img.onerror = (err) => reject(err);
    });
};

/**
 * [MODIFIED] 소환코드 생성 (영입용) - 무기 숙련도 및 전직 상세 기록 포함
 */
export const generateSummonCode = (character: Character, targetId: string): string => {
    try {
        let source: any;
        if (targetId === 'player') {
            source = character;
        } else {
            source = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === targetId);
        }

        if (!source) return "";

        const snapshot = {
            v: 3, // version up with all updated systems
            id: `summon_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            n: source.name,
            l: source.level,
            a: source.age,
            g: source.gender,
            r: source.race,
            nt: source.nation,
            ap: source.appearance,
            ps: source.personality,
            ct: source.classType || "모험가",
            t: source.shinryokuType,
            // [NEW / ADDED COMPANION FIELDS]
            vis: source.visualUrl,
            hs: source.hairStyle,
            eq: source.equipment || {},
            ctac: source.currentTactics,
            tsf: source.tacticsSkillFocus,
            psn: source.preferredSkillName,
            thp: source.tacticsHpThreshold,
            tmp: source.tacticsMpThreshold,
            bp: source.battlePosition,
            br: source.battleRole,
            mm: source.mountedMonster || null,
            // 전직 상세 기록 보존
            c1n: source.firstClassName,
            c1d: source.firstClassDescription,
            c2n: source.secondClassName,
            c2d: source.secondClassDescription,
            cln: source.lastClassName,
            cld: source.lastClassDescription,
            cfn: source.finalClassName,
            cfd: source.finalClassDescription,
            // 무기 숙련도 보존
            wm: source.weaponMastery,
            s: source.stats,
            sk: source.skills.map((s: Skill) => ({
                n: s.name,
                t: s.type,
                ti: s.tier,
                lv: s.level,
                ml: s.maxLevel,
                cm: s.currentMastery,
                r: s.powerRatio,
                m: s.mpCost,
                f: s.effectFormula,
                tr: s.targetType,
                d: s.description,
                // [NEW / ADDED FIELDS]
                st: s.shinryokuType,
                b: s.isBondSkill,
                css: s.isCombatStyleSkill,
                cssrc: s.combatStyleSource,
                i: s.imageUrl || s.icon,
                il: s.illustrationUrl,
                vid: s.videoUrl,
                vt: s.vfxTheme,
                vc: s.vfxColor,
                vs: s.vfxShape,
                buff: s.buffType,
                ail: s.statusEffects,
                iss: s.isSummonSkill,
                sd: s.summonData,
                fa: s.frameAnimation
            })),
            // [NEW] 새로운 전투 계열 및 시스템 추가 데이터
            cs: source.combatStyle,
            tcs: source.targetCombatStyle,
            csp: source.combatStyleProgress,
            rp: source.roleProficiency,
            mr: source.mercenaryRank,
            rep: source.reputation,
            inf: source.infamy,
            bsr: source.blacksmithRank,
            bsm: source.blacksmithMastery,
            trr: source.trainerRank,
            trb: source.trainerBranch,
            trl: source.trainerLevel,
            tre: source.trainerExp,
            prof: source.professions,
            at: source.availableTitles,
            et: source.equippedTitleId
        };
        return compressDataSync(snapshot);
    } catch (e) {
        console.error("Summon code generation failed", e);
        return "";
    }
};

/**
 * [MODIFIED] 소환코드 해석 (영입용) - 무기 숙련도 및 전직 상세 기록 복구 (압축/구형 호환)
 */
export const parseSummonCode = (code: string): { companion: Companion, id: string } => {
    try {
        const data = decompressDataSync(code);
        
        const level = data.l || 1;
        
        const companion: Companion = {
            id: `summoned_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            name: data.n,
            age: data.a,
            gender: data.g,
            race: data.r,
            nation: data.nt,
            appearance: data.ap,
            personality: data.ps,
            classType: data.ct,
            job: JobType.UNEMPLOYED,
            level: level,
            currentExp: 0,
            maxExp: getRequiredExp(level),
            statPoints: 0,
            classTier: getTierByLevel(level),
            shinryokuType: data.t,
            // 전직 상세 기록 복구
            firstClassName: data.c1n,
            firstClassDescription: data.c1d,
            secondClassName: data.c2n,
            secondClassDescription: data.c2d,
            lastClassName: data.cln,
            lastClassDescription: data.cld,
            finalClassName: data.cfn,
            finalClassDescription: data.cfd,
            // 무기 숙련도 복구
            weaponMastery: data.wm || {},
            stats: data.s,
            skills: data.sk.map((s: any) => ({
                name: s.n,
                type: s.t,
                tier: s.ti || ClassTier.FIRST,
                level: s.lv || 1,
                maxLevel: s.ml || 10,
                currentMastery: s.cm || 0,
                powerRatio: s.r,
                mpCost: s.m,
                effectFormula: s.f,
                targetType: s.tr,
                description: s.d,
                // [NEW / ADDED FIELDS RESTORATION]
                shinryokuType: s.st,
                isBondSkill: s.b,
                isCombatStyleSkill: s.css,
                combatStyleSource: s.cssrc,
                imageUrl: s.i,
                icon: s.i,
                illustrationUrl: s.il,
                videoUrl: s.vid,
                vfxTheme: s.vt,
                vfxColor: s.vc,
                vfxShape: s.vs,
                buffType: s.buff,
                statusEffects: s.ail,
                isSummonSkill: s.iss,
                summonData: s.sd,
                frameAnimation: s.fa
            })),
            equipment: data.eq || {},
            inventory: [],
            affection: 30,
            loyalty: 30,
            isTemporary: false,
            // [NEW] 새로운 시스템 복구
            visualUrl: data.vis || (typeof generateDefaultVisualUrl === 'function' ? generateDefaultVisualUrl(data.n || '차원영입자', '제국', '인간', data.g || '남') : undefined),
            hairStyle: data.hs,
            currentTactics: data.ctac,
            tacticsSkillFocus: data.tsf,
            preferredSkillName: data.psn,
            tacticsHpThreshold: data.thp,
            tacticsMpThreshold: data.tmp,
            battlePosition: data.bp,
            battleRole: data.br,
            mountedMonster: data.mm || undefined,
            combatStyle: data.cs,
            targetCombatStyle: data.tcs,
            combatStyleProgress: data.csp || {},
            roleProficiency: data.rp || {},
            mercenaryRank: data.mr,
            reputation: data.rep || 0,
            infamy: data.inf || 0,
            blacksmithRank: data.bsr,
            blacksmithMastery: data.bsm || 0,
            trainerRank: data.trr,
            trainerBranch: data.trb,
            trainerLevel: data.trl || (data.trr && TRAINER_RANK_CONFIG[data.trr as TrainerRank]?.reqLevel) || 1,
            trainerExp: data.tre || 0,
            professions: data.prof || {},
            availableTitles: data.at || [],
            equippedTitleId: data.et
        };

        return { companion, id: data.id || `unknown_${Date.now()}` };
    } catch (e) {
        throw new Error("유효하지 않은 소환코드입니다.");
    }
};
/**
 * [NEW] 배틀코드용 데이터 추출 및 직렬화 (탈것, 장비, 최종스탯, 스킬 이펙트, 컷신 비디오, 일러스트, VFX 포함)
 */
export const generateBattleCode = (character: Character): string => {
    try {
        const playerFinal = calculateFinalStats(character).finalStats;
        const playerMount = character.mountedMonster || (character.mountedMonsterId ? (character.companions.find(c => c.id === character.mountedMonsterId) || character.base?.capturedMonsters?.find((m: any) => m.id === character.mountedMonsterId)) : undefined);

        const snapshot = {
            ver: 3, // version up with mount & equip & full stats
            id: `battle_${Date.now()}_${Math.random().toString(36).substring(7)}`, // 고유 ID
            n: character.name,
            l: character.level,
            t: character.shinryokuType,
            j: character.job,
            g: character.gender,
            vis: character.visualUrl,
            cs: character.combatStyle,
            s: playerFinal, // 장비, 탈것, 칭호, 신성력 등 완제품 최종 스탯
            eq: character.equipment || {}, // 장비 및 신화 옵션
            mm: playerMount ? {
                n: playerMount.name,
                l: playerMount.level,
                vis: playerMount.visualUrl,
                s: playerMount.stats,
                t: playerMount.shinryokuType
            } : null,
            sk: (character.skills || []).map(s => ({
                n: s.name,
                t: s.type,
                ti: s.tier,
                r: s.powerRatio,
                m: s.mpCost,
                f: s.effectFormula,
                tr: s.targetType,
                d: s.description,
                i: s.imageUrl || s.icon,
                il: s.illustrationUrl,
                vid: s.videoUrl,
                vt: s.vfxTheme,
                vc: s.vfxColor,
                b: s.isBondSkill,
                buff: s.buffType,
                ail: s.statusEffects,
                // [NEW / ADDED FIELDS]
                st: s.shinryokuType,
                vs: s.vfxShape,
                css: s.isCombatStyleSkill,
                cssrc: s.combatStyleSource,
                iss: s.isSummonSkill,
                sd: s.summonData,
                fa: s.frameAnimation
            })),
            p: (character.companions || []).filter(c => !c.isDead && !c.name.includes('[수호수]')).map(c => {
                const compFinal = calculateFinalStats(c).finalStats;
                const compMount = c.mountedMonster;
                return {
                    n: c.name,
                    l: c.level,
                    t: c.shinryokuType,
                    j: c.job,
                    g: c.gender,
                    vis: c.visualUrl,
                    cs: c.combatStyle,
                    s: compFinal,
                    eq: c.equipment || {},
                    mm: compMount ? { n: compMount.name, l: compMount.level, vis: compMount.visualUrl, s: compMount.stats, t: compMount.shinryokuType } : null,
                    sk: (c.skills || []).map(sk => ({
                        n: sk.name,
                        t: sk.type,
                        ti: sk.tier,
                        r: sk.powerRatio,
                        m: sk.mpCost,
                        f: sk.effectFormula,
                        tr: sk.targetType,
                        d: sk.description,
                        i: sk.imageUrl || sk.icon,
                        il: sk.illustrationUrl,
                        vid: sk.videoUrl,
                        vt: sk.vfxTheme,
                        vc: sk.vfxColor,
                        b: sk.isBondSkill,
                        buff: sk.buffType,
                        ail: sk.statusEffects,
                        // [NEW / ADDED FIELDS]
                        st: sk.shinryokuType,
                        vs: sk.vfxShape,
                        css: sk.isCombatStyleSkill,
                        cssrc: sk.combatStyleSource,
                        iss: sk.isSummonSkill,
                        sd: sk.summonData,
                        fa: sk.frameAnimation
                    }))
                };
            })
        };
        return compressDataSync(snapshot);
    } catch (e) {
        console.error("Battle code generation failed", e);
        return "";
    }
};

/**
 * [NEW] 배틀코드를 Enemy 배열로 변환 - 탈것, 장비 효과, 스킬 효과, 패시브 분리 및 VFX 완벽 복원 (압축/구형 호환)
 */
export const parseBattleCode = (code: string): { enemies: Enemy[], id: string } => {
    try {
        const data = decompressDataSync(code);
        const enemies: Enemy[] = [];

        // 1. 플레이어 캐릭터를 보스로 변환
        const bossVisual = data.vis || data.v || data.visualUrl || generateDefaultVisualUrl(data.n || '차원도전자', '제국', '인간', data.g || '남');
        
        // 스킬 분류 (패시브 스킬 분리 & 액티브 스킬 복원)
        const allBossSkills = data.sk || [];
        const passiveSkills: Skill[] = [];
        const activeSkills: Skill[] = [];

        allBossSkills.forEach((s: any) => {
            const skillObj: Skill = {
                id: `pvp_skill_${s.n}`,
                name: s.n,
                type: s.t || SkillType.PHYSICAL,
                tier: s.ti || ClassTier.FINAL,
                powerRatio: s.r !== undefined ? s.r : (s.t === SkillType.BUFF ? 0 : 1.5),
                mpCost: s.m || 0,
                effectFormula: s.f || (s.t === SkillType.BUFF ? 'BUFF:ATK_UP' : '1.0 * ATK'),
                targetType: s.tr || (s.t === SkillType.BUFF ? 'self' : 'single'),
                level: 10,
                maxLevel: 10,
                currentMastery: 100,
                description: s.d || "차원 도전자로부터 전승된 고유 기술",
                imageUrl: s.i,
                icon: s.i,
                illustrationUrl: s.il,
                videoUrl: s.vid || s.vu,
                vfxTheme: s.vt,
                vfxColor: s.vc,
                isBondSkill: s.b,
                buffType: s.buff,
                statusEffects: s.ail,
                // [NEW / ADDED FIELDS RESTORATION]
                shinryokuType: s.st,
                vfxShape: s.vs,
                isCombatStyleSkill: s.css,
                combatStyleSource: s.cssrc,
                isSummonSkill: s.iss,
                summonData: s.sd,
                frameAnimation: s.fa
            };

            if (s.t === SkillType.PASSIVE || s.type === SkillType.PASSIVE) {
                passiveSkills.push(skillObj);
            } else {
                activeSkills.push(skillObj);
            }
        });

        const bossStats = { ...(data.s || {}) };
        const bossHp = bossStats.maxHp || bossStats.hp || 1000;
        bossStats.maxHp = bossHp;
        bossStats.hp = bossHp;

        // 패시브 스킬 효과 사전 반영 (스탯 보너스)
        passiveSkills.forEach(ps => {
            if (ps.effectFormula?.includes('ATK') || ps.name.includes('공격') || ps.name.includes('근력')) {
                bossStats.atk = Math.round((bossStats.atk || 50) * 1.15);
            }
            if (ps.effectFormula?.includes('DEF') || ps.name.includes('방어') || ps.name.includes('체력')) {
                bossStats.def = Math.round((bossStats.def || 50) * 1.15);
                bossStats.maxHp = Math.round(bossStats.maxHp * 1.1);
                bossStats.hp = bossStats.maxHp;
            }
        });

        const bossName = data.mm ? `[PVP] ${data.n} (탑승: ${data.mm.n})` : `[PVP] ${data.n}`;

        enemies.push({
            id: `pvp_boss_${Date.now()}`,
            name: bossName,
            level: data.l,
            hp: bossStats.maxHp,
            maxHp: bossStats.maxHp,
            stats: bossStats,
            shinryokuType: data.t || '무기강화계',
            statusEffects: [],
            isBoss: true,
            job: data.j,
            gender: data.g,
            combatStyle: data.cs,
            visualUrl: bossVisual,
            equipment: data.eq || {},
            passiveSkills: passiveSkills,
            description: `Lv.${data.l} ${data.t || '능력자'} (${data.j || '도전자'}).${data.mm ? ` 탈것 [${data.mm.n}]에 탑승한 상태입니다.` : ''}`,
            skills: activeSkills // 패시브 스킬이 배제된 액티브/버프 스킬만 등록
        });

        // 1-1. 탈것이 있는 경우 탈것을 보스의 소환수로 파티에 참전
        if (data.mm) {
            enemies.push({
                id: `pvp_mount_${Date.now()}`,
                name: `[탑승수] ${data.mm.n}`,
                level: data.mm.l || data.l,
                hp: data.mm.s?.maxHp || 1200,
                maxHp: data.mm.s?.maxHp || 1200,
                stats: { ...(data.mm.s || {}), maxHp: data.mm.s?.maxHp || 1200, hp: data.mm.s?.maxHp || 1200 },
                shinryokuType: data.mm.t || data.t || '야수계',
                statusEffects: [],
                visualUrl: data.mm.vis || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=400',
                description: `${data.n}의 전용 탑승 몬스터입니다.`,
                skills: [{
                    id: `mount_atk_${Date.now()}`,
                    name: '맹렬한 돌진',
                    type: SkillType.PHYSICAL,
                    tier: ClassTier.SECOND,
                    powerRatio: 1.3,
                    mpCost: 0,
                    effectFormula: '1.2 * ATK',
                    targetType: 'single',
                    level: 5,
                    maxLevel: 10,
                    currentMastery: 50,
                    description: '전방으로 돌진하여 강한 타격을 입힙니다.'
                }]
            });
        }

        // 2. 동료들을 정예병으로 변환
        (data.p || []).forEach((c: any) => {
            const compVisual = c.vis || c.v || c.visualUrl || generateDefaultVisualUrl(c.n || '동료', '제국', '인간', c.g || '남');
            
            const compPassiveSkills: Skill[] = [];
            const compActiveSkills: Skill[] = [];

            (c.sk || []).forEach((sk: any) => {
                const skillObj: Skill = {
                    id: `pvp_comp_skill_${sk.n}`,
                    name: sk.n,
                    type: sk.t || SkillType.PHYSICAL,
                    tier: sk.ti || ClassTier.SECOND,
                    powerRatio: sk.r !== undefined ? sk.r : (sk.t === SkillType.BUFF ? 0 : 1.2),
                    mpCost: sk.m || 0,
                    effectFormula: sk.f || (sk.t === SkillType.BUFF ? 'BUFF:ATK_UP' : '1.0 * ATK'),
                    targetType: sk.tr || (sk.t === SkillType.BUFF ? 'self' : 'single'),
                    level: 5,
                    maxLevel: 10,
                    currentMastery: 50,
                    description: sk.d || "차원 동료의 지원 기술",
                    imageUrl: sk.i,
                    icon: sk.i,
                    illustrationUrl: sk.il,
                    videoUrl: sk.vid || sk.vu,
                    vfxTheme: sk.vt,
                    vfxColor: sk.vc,
                    isBondSkill: sk.b,
                    buffType: sk.buff,
                    statusEffects: sk.ail,
                    // [NEW / ADDED FIELDS RESTORATION]
                    shinryokuType: sk.st,
                    vfxShape: sk.vs,
                    isCombatStyleSkill: sk.css,
                    combatStyleSource: sk.cssrc,
                    isSummonSkill: sk.iss,
                    summonData: sk.sd,
                    frameAnimation: sk.fa
                };

                if (sk.t === SkillType.PASSIVE || sk.type === SkillType.PASSIVE) {
                    compPassiveSkills.push(skillObj);
                } else {
                    compActiveSkills.push(skillObj);
                }
            });

            const compStats = { ...(c.s || {}) };
            const compHp = compStats.maxHp || compStats.hp || 800;
            compStats.maxHp = compHp;
            compStats.hp = compHp;

            enemies.push({
                id: `pvp_comp_${c.n}_${Date.now()}`,
                name: `${c.n}`,
                level: c.l,
                hp: compStats.maxHp,
                maxHp: compStats.maxHp,
                stats: compStats,
                shinryokuType: c.t || '화염계',
                statusEffects: [],
                job: c.j,
                gender: c.g,
                combatStyle: c.cs,
                visualUrl: compVisual,
                equipment: c.eq || {},
                passiveSkills: compPassiveSkills,
                description: `${data.n}의 호위 동료 (${c.j || '호위무사'})입니다.`,
                skills: compActiveSkills // 패시브 제외 액티브/버프 스킬만 포함
            });
        });

        return { enemies, id: data.id || `unknown_${Date.now()}` };
    } catch (e) {
        console.error("Invalid battle code", e);
        throw new Error("유효하지 않은 배틀코드입니다.");
    }
};

const MBTI_POOL = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

const APPEARANCE_POOL = {
    M: [
        "안경을 쓴 지적인 분위기의 학생", 
        "운동으로 다져진 탄탄한 체격의 소년", 
        "장난기 가득한 개구쟁이 얼굴의 남학생", 
        "깔끔하고 단정한 모범생 스타일", 
        "조금은 거친 반항아적 매력의 학생",
        "차분하고 명상적인 분위기의 소년",
        "항상 책을 들고 다니는 학구적인 모습"
    ],
    F: [
        "긴 생머리에 청순한 인상의 학생", 
        "숏컷이 잘 어울리는 활기찬 소녀", 
        "섬세하고 우아한 분위기의 여학생", 
        "발랄한 장식이 돋보이는 외모의 소녀", 
        "안경 뒤로 날카로운 눈매의 수재",
        "조용하지만 단단한 의지가 느껴지는 인상",
        "예술가적인 감수성이 엿보이는 신비로운 모습"
    ]
};

export const getDaysDiff = (d1: string, d2: string): number => {
    try {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = date2.getTime() - date1.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
};

export const getRaceByNation = (nation: string): string => {
    if (nation === "미르탈 숲연합") return "엘프";
    if (nation === "레오니스 투기국") return "수인";
    if (nation === "네크로디움 제국" || nation === "임페리얼 제국") return "마인";
    return "인간";
};

export const getSavePrefix = (): string => {
    const key = process.env.API_KEY || 'default';
    const suffix = key.length > 8 ? key.substring(key.length - 8) : 'anon';
    return `shinryoku_${suffix}`;
};

export const getSaveSlotKey = (slot: number): string => {
    return `${getSavePrefix()}_save_${slot}`;
};

export const extractSurname = (fullName: string, nation: string): string => {
    const nationData = NATION_DATA[nation] || NATION_DATA["대한민국"];
    const order = nationData.order;
    const surnames = nationData.surnames;
    
    if (order === 'SN') {
        const sortedSurnames = [...surnames].sort((a, b) => b.length - a.length);
        for (const s of sortedSurnames) {
            if (fullName.startsWith(s)) return s;
        }
        return fullName[0] || ""; 
    } else {
        const parts = fullName.trim().split(/\s+/);
        return parts[parts.length - 1] || "";
    }
};

export const generateNameWithSurname = (surname: string, nation: string, gender?: 'male' | 'female' | 'neutral'): string => {
    const nationData = NATION_DATA[nation] || NATION_DATA["대한민국"];
    const namesObj = nationData.names;
    const order = nationData.order;
    
    let pool: string[] = [];
    if (gender && namesObj[gender] && namesObj[gender].length > 0) {
        pool = namesObj[gender];
    } else {
        pool = [...namesObj.male, ...namesObj.female, ...namesObj.neutral];
    }
    
    const n = pool[Math.floor(Math.random() * pool.length)];
    return order === 'SN' ? `${surname}${n}` : `${n} ${surname}`;
};

export const generateMilitaryLevelByRank = (rank: MilitaryRank): number => {
    let min = 1, max = 30;
    switch (rank) {
        case MilitaryRank.PVT: case MilitaryRank.PFC: min = 1; max = 30; break;
        case MilitaryRank.CPL: case MilitaryRank.SGT: min = 30; max = 50; break;
        case MilitaryRank.SSG: min = 51; max = 70; break;
        case MilitaryRank.SFC: min = 71; max = 90; break;
        case MilitaryRank.MSG: min = 91; max = 110; break;
        case MilitaryRank.WSG: min = 111; max = 140; break;
        case MilitaryRank.SLT: case MilitaryRank.FLT: min = 141; max = 180; break;
        case MilitaryRank.CPT: min = 181; max = 220; break;
        case MilitaryRank.MAJ: min = 221; max = 260; break;
        case MilitaryRank.LTC: min = 261; max = 300; break;
        case MilitaryRank.COL: min = 301; max = 350; break;
        case MilitaryRank.BG: min = 351; max = 400; break;
        case MilitaryRank.MG: min = 401; max = 450; break;
        case MilitaryRank.LG: min = 451; max = 500; break;
        case MilitaryRank.GEN: min = 501; max = 800; break;
        default: min = 1; max = 30;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateLevelByRank = (rank: MercenaryRank): number => {
    let min = 1, max = 30;
    switch (rank) {
        case MercenaryRank.F: case MercenaryRank.E: case MercenaryRank.D: min = 1; max = 30; break;
        case MercenaryRank.C: min = 31; max = 60; break;
        case MercenaryRank.B: min = 61; max = 100; break;
        case MercenaryRank.A: min = 101; max = 200; break;
        case MercenaryRank.S: min = 201; max = 300; break;
        case MercenaryRank.SS: min = 301; max = 500; break;
        case MercenaryRank.SSS: min = 501; max = 700; break;
        default: min = 1; max = 30;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getTierByLevel = (level: number): ClassTier => {
    if (level >= 1000) return ClassTier.FINAL;
    if (level >= 300) return ClassTier.LAST;
    if (level >= 100) return ClassTier.SECOND;
    if (level >= 30) return ClassTier.FIRST;
    return ClassTier.NONE;
};

export const getStatPointsPerLevel = (entity: { level: number; classTier?: ClassTier; firstClassName?: string; secondClassName?: string; lastClassName?: string; finalClassName?: string }): number => {
    if (entity.level < 30) return 5;
    const tier = entity.classTier || getTierByLevel(entity.level);
    if (tier === ClassTier.FINAL || !!entity.finalClassName || entity.level >= 1000) return 50;
    if (tier === ClassTier.LAST || !!entity.lastClassName || entity.level >= 300) return 30;
    if (tier === ClassTier.SECOND || !!entity.secondClassName || entity.level >= 100) return 20;
    if (tier === ClassTier.FIRST || !!entity.firstClassName || entity.level >= 30) return 10;
    return 5;
};

export const generateName = (nation: string, gender?: 'male' | 'female' | 'neutral'): string => {
    const nationData = NATION_DATA[nation] || NATION_DATA["대한민국"];
    const surnames = nationData.surnames;
    const namesObj = nationData.names;
    const order = nationData.order;
    
    let pool: string[] = [];
    if (gender && namesObj[gender] && namesObj[gender].length > 0) {
        pool = namesObj[gender];
    } else {
        pool = [...namesObj.male, ...namesObj.female, ...namesObj.neutral];
    }
    
    const s = surnames[Math.floor(Math.random() * surnames.length)];
    const n = pool[Math.floor(Math.random() * pool.length)];
    return order === 'SN' ? `${s}${n}` : `${n} ${s}`;
};
export const generateClassmates = (
    schoolNation: string, 
    totalCount: number, 
    tier?: SchoolTier, 
    grade?: number, 
    persistedStudents: SimpleStudent[] = [], 
    playerClassNumber: number = 1,
    existingRival?: any,
    noRival: boolean = false,
    currentYear: number = 2000
): SimpleStudent[] => {
    const students: SimpleStudent[] = [];
    const allNations = Object.keys(NATION_DATA);

    const updatedPersisted = persistedStudents.map(student => {
        const nextStudent = { ...student };
        nextStudent.level += 1;
        
        // birthYear 기반 나이 계산
        if (nextStudent.birthYear) {
            nextStudent.age = (currentYear - nextStudent.birthYear) + "세";
        } else {
            const ageNum = parseInt(nextStudent.age.replace(/[^0-9]/g, '')) + 1;
            nextStudent.age = ageNum + "세";
            nextStudent.birthYear = currentYear - ageNum;
        }

        if (nextStudent.stats) {
            nextStudent.stats.str = (nextStudent.stats.str || 0) + 5;
            nextStudent.stats.int = (nextStudent.stats.int || 0) + 5;
            nextStudent.stats.def = (nextStudent.stats.def || 0) + 5;
            nextStudent.stats.agi = (nextStudent.stats.agi || 0) + 5;
            nextStudent.stats.hp = (nextStudent.stats.hp || 100) + 100;
        }

        const staysInSameClass = Math.random() < 0.3;
        nextStudent.classNumber = staysInSameClass 
            ? playerClassNumber 
            : Math.floor(Math.random() * 5) + 1;

        return nextStudent;
    });

    students.push(...updatedPersisted);

    let baseStatMin = 5;
    let baseStatMax = 10;
    let baseAgeNum = 11;
    
    if (tier === 'Elementary' || tier === '초급') { baseStatMin = 1; baseStatMax = 5; baseAgeNum = 11; }
    else if (tier === 'Middle' || tier === '중급') { baseStatMin = 10; baseStatMax = 20; baseAgeNum = 14; }
    else if (tier === 'High' || tier === '고급') { baseStatMin = 30; baseStatMax = 40; baseAgeNum = 17; }
    else if (tier === 'University') { baseStatMin = 50; baseStatMax = 120; baseAgeNum = 20; }

    const gradeBonus = (grade || 1) * 5;
    baseStatMin += gradeBonus;
    baseStatMax += gradeBonus;

    const rivalIndex = (existingRival || noRival) ? -1 : Math.floor(Math.random() * totalCount);

    const remainingCount = Math.max(0, totalCount - updatedPersisted.length);

    for(let i = 0; i < remainingCount; i++) {
        let studentNation = schoolNation;
        if (Math.random() < 0.2) {
            studentNation = allNations[Math.floor(Math.random() * allNations.length)];
        }

        let level = 1;
        const jitter = Math.floor(Math.random() * 5) - 2;

        if (tier === 'Elementary' || tier === '초급') {
            level = Math.floor(Math.random() * 5) + 1 + jitter;
        } else if (tier === 'Middle' || tier === '중급') {
            const base = grade === 1 ? 6 : grade === 2 ? 10 : 13;
            level = base + Math.floor(Math.random() * 4) + jitter;
        } else if (tier === 'High' || tier === '고급') {
            const base = grade === 1 ? 16 : grade === 2 ? 21 : 26;
            level = base + Math.floor(Math.random() * 5) + jitter;
        } else if (tier === 'University') {
            level = 30 + Math.floor(Math.random() * 15) + jitter;
        }
        level = Math.max(1, level);

        const ageNum = baseAgeNum + (grade ? grade - 1 : Math.floor(Math.random() * 3));
        const finalAge = ageNum + "세";
        const finalBirthYear = currentYear - ageNum;
        
        const isRival = i === rivalIndex;
        
        const gender = Math.random() > 0.5 ? '남성' : '여성';
        const genderKey = gender === '남성' ? 'M' : 'F';
        const genderParam = gender === '남성' ? 'male' : 'female';
        
        const fullName = generateName(studentNation, genderParam);
        
        const personality = MBTI_POOL[Math.floor(Math.random() * MBTI_POOL.length)];
        const appearance = APPEARANCE_POOL[genderKey][Math.floor(Math.random() * APPEARANCE_POOL[genderKey].length)];
        const race = getRaceByNation(studentNation);

        // generateCompanionStats 기반 스탯 생성
        const companionBaseStats = generateCompanionStats(level);
        if (isRival) {
            companionBaseStats.str += 10;
            companionBaseStats.int += 10;
            companionBaseStats.def += 10;
            companionBaseStats.agi += 10;
            companionBaseStats.wis = (companionBaseStats.wis || 10) + 10;
            companionBaseStats.ctrl = (companionBaseStats.ctrl || 10) + 10;
            companionBaseStats.hp += 100;
            companionBaseStats.maxHp = (companionBaseStats.maxHp || companionBaseStats.hp) + 100;
            companionBaseStats.mp += 50;
            companionBaseStats.maxMp = (companionBaseStats.maxMp || companionBaseStats.mp) + 50;
        }

        students.push(assignRandomCombatStyle({
            id: `student_${Date.now()}_new_${i}_${Math.floor(Math.random()*1000)}`,
            name: fullName,
            age: finalAge,
            birthYear: finalBirthYear,
            gender: gender,
            nation: studentNation,
            level: level,
            classType:"학생",
            job:JobType.STUDENT,
            personality: personality,
            appearance: appearance,
            stats: companionBaseStats,
            affection: 0,
            respect: isRival ? 10 : undefined,
            tension: isRival ? 50 : undefined,
            isRival: isRival,
            // @ts-ignore
            race: race,
            visualUrl: generateDefaultVisualUrl(fullName, studentNation, race, gender),
            classNumber: playerClassNumber 
        }, true) as any);
    }
    if (existingRival) {
        students.push({ ...existingRival, isRival: true });
    }
    return students;
};

export const generateTournamentBracket = (currentNation: string, totalParticipants: number, playerName: string, scope: 'School' | 'National' | 'World' = 'School'): { matches: TournamentMatch[], opponentName: string } => {
    const matches: TournamentMatch[] = [];
    const startRound = totalParticipants;
    const targetNation = currentNation && NATION_DATA[currentNation] ? currentNation : "대한민국";
    
    const getOpp = (): string => {
        if (scope === 'World') {
            const nations = Object.keys(NATION_DATA);
            const rndNation = nations[Math.floor(Math.random() * nations.length)];
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const name = generateName(rndNation, gender);
            return `${name} [${rndNation} 대표]`;
        } else if (scope === 'National') {
            let cities: string[] = [];
            for (const region in WORLD_GEOGRAPHY) {
                if (WORLD_GEOGRAPHY[region][targetNation]) {
                    cities = WORLD_GEOGRAPHY[region][targetNation].cities;
                    break;
                }
            }
            if (cities.length === 0) cities = ['수도', '동부', '서부', '남부', '북부'];
            const rndCity = cities[Math.floor(Math.random() * cities.length)];
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const name = generateName(targetNation, gender);
            return `${name} [${rndCity} 대표]`;
        } else {
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            return generateName(targetNation, gender);
        }
    };

    if (startRound >= 64) {
        matches.push({ id: 100, round: 64, p1: playerName, p2: getOpp() });
        for (let i = 101; i <= 131; i++) matches.push({ id: i, round: 64, p1: getOpp(), p2: getOpp() });
    }
    if (startRound >= 32) {
        matches.push({ id: 1, round: 32, p1: startRound >= 64 ? 'Winner 100' : playerName, p2: getOpp() });
        for (let i = 2; i <= 16; i++) matches.push({ id: i, round: 32, p1: getOpp(), p2: getOpp() });
    }
    if (startRound >= 16) {
        matches.push({ id: 17, round: 16, p1: startRound >= 32 ? 'Winner 1' : playerName, p2: getOpp() });
        for (let i = 18; i <= 24; i++) matches.push({ id: i, round: 16, p1: getOpp(), p2: getOpp() });
    }
    if (startRound >= 8) {
        matches.push({ id: 25, round: 8, p1: startRound >= 16 ? 'Winner 17' : playerName, p2: getOpp() });
        for (let i = 26; i <= 28; i++) matches.push({ id: i, round: 8, p1: getOpp(), p2: getOpp() });
    }
    if (startRound >= 4) {
        matches.push({ id: 29, round: 4, p1: startRound >= 8 ? 'Winner 25' : playerName, p2: getOpp() });
        matches.push({ id: 30, round: 4, p1: getOpp(), p2: getOpp() });
    }
    matches.push({ id: 31, round: 2, p1: startRound >= 4 ? 'Winner 29' : playerName, p2: getOpp() });

    let opponentName = "무명";
    if (startRound === 64) opponentName = matches.find(m => m.round === 64 && (m.p1 === playerName || m.id === 100))?.p2 || getOpp();
    else if (startRound === 32) opponentName = matches.find(m => m.round === 32 && (m.p1 === playerName || m.p1 === 'Winner 100' || m.id === 1))?.p2 || getOpp();
    else if (startRound === 16) opponentName = matches.find(m => m.round === 16 && (m.p1 === playerName || m.p1.includes('Winner')))?.p2 || getOpp();
    else if (startRound === 8) opponentName = matches.find(m => m.round === 8 && (m.p1 === playerName || m.p1.includes('Winner')))?.p2 || getOpp();
    else if (startRound === 4) opponentName = matches.find(m => m.round === 4 && (m.p1 === playerName || m.p1.includes('Winner')))?.p2 || getOpp();
    else if (startRound === 2) opponentName = matches.find(m => m.round === 2)?.p2 || getOpp();

    return { matches, opponentName };
};

export const getWeaponTypeFromItem = (item: Item): WeaponType | undefined => {
    if (!item) return undefined;
    if (item.weaponType) return item.weaponType;
    const name = (item.name || "").toLowerCase();
    for (const [type, keywords] of Object.entries(WEAPON_KEYWORDS)) {
        if ((keywords as string[]).some(k => name.includes(k))) {
            return type as WeaponType;
        }
    }
    if (item.type === 'Weapon' || item.type === 'SubWeapon') {
        if (name.includes('지팡이') || name.includes('스태프')) return 'Staff';
        if (name.includes('활')) return 'Bow';
        if (name.includes('검')) return 'Sword';
    }
    return undefined;
};

// [NEW] 전투 계열 특화 무기 확인 함수
export const isSpecializedWeapon = (combatStyle?: CombatStyle, weaponType?: WeaponType): boolean => {
    if (!combatStyle || !weaponType) return false;
    const specialties = COMBAT_STYLE_SPECIALTIES[combatStyle];
    return specialties ? specialties.includes(weaponType) : false;
};

// [NEW] 전투 계열 특화 무기 장착 여부 확인 (주무기 또는 보조무기)
export const hasCombatStyleSpecialtyEquipped = (combatStyle?: CombatStyle, equipment?: { weapon?: Item; subWeapon?: Item }): boolean => {
    if (!combatStyle || !equipment) return false;
    const wType = equipment.weapon ? getWeaponTypeFromItem(equipment.weapon) : undefined;
    const subType = equipment.subWeapon ? getWeaponTypeFromItem(equipment.subWeapon) : undefined;
    return isSpecializedWeapon(combatStyle, wType) || isSpecializedWeapon(combatStyle, subType);
};

/**
 * [NEW] 전투계열 액티브 스킬 사용 가능 여부 (특화 무기 착용 검사)
 */
export const checkSkillWeaponRequirement = (
    actor: Character | Companion,
    skill: Skill
): { isAllowed: boolean; requiredWeapons?: string[]; reason?: string } => {
    if (!skill || skill.type === SkillType.PASSIVE) {
        return { isAllowed: true };
    }

    const isCombatStyleSkill = !!(skill.isCombatStyleSkill || skill.combatStyleSource || (skill.id && skill.id.startsWith('combat_style_')));
    if (!isCombatStyleSkill) {
        return { isAllowed: true };
    }

    // 출처 전투 계열 확인
    const styleKey = (skill.combatStyleSource || (actor as any).combatStyle) as CombatStyle;
    if (!styleKey) {
        return { isAllowed: true };
    }

    const requiredWeaponTypes = COMBAT_STYLE_SPECIALTIES[styleKey];
    if (!requiredWeaponTypes || requiredWeaponTypes.length === 0) {
        return { isAllowed: true };
    }

    const equipment = actor.equipment;
    const isEquipped = hasCombatStyleSpecialtyEquipped(styleKey, equipment);

    if (!isEquipped) {
        const weaponNamesInKorean = requiredWeaponTypes
            .map(wt => (WEAPON_TYPE_KOREAN as any)[wt] || wt)
            .join(', ');
        const styleLabel = COMBAT_STYLE_CONFIG[styleKey]?.label || styleKey;
        return {
            isAllowed: false,
            requiredWeapons: requiredWeaponTypes,
            reason: `[${styleLabel}] 특화 무기(${weaponNamesInKorean})를 착용해야만 사용할 수 있습니다.`
        };
    }

    return { isAllowed: true };
};

export const getCombatStyleBonusPercent = (tier: number): number => {
    switch (tier) {
        case 1: return 10;
        case 2: return 20;
        case 3: return 35;
        case 4: return 50;
        default: return 10;
    }
};

export const getEnhancedStatValue = (baseVal: number, enhancementLevel: number = 0, statKey: string): number => {
    const safeBase = Number(baseVal) || 0;
    if (enhancementLevel === 0) return safeBase;
    let multiplier = 1.0;
    if (statKey === 'def' || statKey === 'mDef') {
        multiplier = 1 + (enhancementLevel * 0.05);
    } else {
        multiplier = 1 + (enhancementLevel * 0.06);
    }
    const flatBonus = enhancementLevel * 1; 
    return Math.floor(safeBase * multiplier + flatBonus);
};

const STAT_PATTERNS: Record<string, keyof Stats> = {
    'STR': 'str', '힘': 'str', 'STRENGTH': 'str',
    'INT': 'int', '지력': 'int', 'INTELLIGENCE': 'int',
    'WIS': 'wis', '지능': 'wis', 'WISDOM': 'wis',
    'DEF': 'def', '방어': 'def', '방어력': 'def', 'DEFENSE': 'def',
    'AGI': 'agi', '민첩': 'agi', 'AGILITY': 'agi',
    'CTRL': 'ctrl', '제어': 'ctrl', '제어력': 'ctrl', 'CONTROL': 'ctrl',
    'HP': 'maxHp', 'MAXHP': 'maxHp', '체력': 'maxHp', '생명력': 'maxHp', 'MAX HP': 'maxHp',
    'MP': 'maxMp', 'MAXMP': 'maxMp', '마나': 'maxMp', '마력': 'maxMp', 'MAX MP': 'maxMp'
};

export const getDropRateMultiplier = (character?: Character | Companion): number => {
    let dropMultiplier = 1.0;
    if (!character) return dropMultiplier;

    const processItem = (it: Item | undefined) => {
        if (!it) return;
        const optionsList: string[] = [
            ...(it.secondaryOptions || []),
            ...((it as any).options || []),
            ...((it as any).effects || []),
            it.description || ''
        ];

        optionsList.forEach(opt => {
            if (!opt || typeof opt !== 'string') return;
            const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
            if (cleanOpt.includes('DROP') || cleanOpt.includes('드롭') || cleanOpt.includes('전리품')) {
                const match = cleanOpt.match(/(?:DROP|드롭률|드롭|전리품)\s*(?:획득량|획득|RATE)?\s*[:+ ]\s*([+-]?\d+(?:\.\d+)?)\s*%/i)
                           || cleanOpt.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:DROP|드롭률|드롭|전리품)/i);
                if (match) {
                    const pctVal = 1 + parseFloat(match[1]) / 100;
                    if (pctVal > 1.0) dropMultiplier = Math.max(dropMultiplier, pctVal);
                } else {
                    const multMatch = cleanOpt.match(/(?:DROP|드롭률|드롭|전리품)\s*X\s*(\d+(?:\.\d+)?)/i)
                                   || cleanOpt.match(/(?:DROP|드롭률|드롭|전리품)\s*(\d+(?:\.\d+)?)\s*배/i)
                                   || cleanOpt.match(/(\d+(?:\.\d+)?)\s*배/i);
                    if (multMatch) {
                        const val = parseFloat(multMatch[1]);
                        if (val > 1.0) dropMultiplier = Math.max(dropMultiplier, val);
                    }
                }
            }
        });
    };

    // 1. 장비 옵션 체크 (플레이어 / 동료)
    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach(processItem);
    } else if ((character as any).equipment) {
        Object.values((character as any).equipment).forEach(processItem);
    }

    if ('companions' in character && Array.isArray((character as any).companions)) {
        (character as any).companions.forEach((comp: any) => {
            if (comp && comp.equipment) {
                Object.values(comp.equipment).forEach(processItem);
            }
            if (comp && Array.isArray(comp.statusEffects)) {
                comp.statusEffects.forEach((eff: any) => {
                    if (!eff) return;
                    const effText = `${eff.name || ''} ${eff.effect || ''} ${eff.description || ''}`;
                    if (effText.includes('Drop') || effText.includes('드롭') || effText.includes('전리품')) {
                        const match = effText.match(/(?:Drop|드롭률|드롭|전리품)\s*x?\s*(\d+(?:\.\d+)?)/i)
                                   || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
                        if (match) {
                            const val = parseFloat(match[1]);
                            if (val > 1.0) dropMultiplier = Math.max(dropMultiplier, val);
                        } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                            dropMultiplier = Math.max(dropMultiplier, eff.val);
                        }
                    }
                });
            }
        });
    }

    const activeEffectsList: any[] = [
        ...(character.statusEffects || []),
        ...((character as any).consumableEffects || []),
        ...((character as any).activeBuffs || []),
        ...((character as any).buffs || [])
    ];

    activeEffectsList.forEach(eff => {
        if (!eff) return;
        const effText = `${eff.name || ''} ${eff.effect || ''} ${eff.description || ''}`;
        if (effText.includes('Drop') || effText.includes('드롭') || effText.includes('전리품')) {
            const match = effText.match(/(?:Drop|드롭률|드롭|전리품)\s*x?\s*(\d+(?:\.\d+)?)/i)
                       || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
            if (match) {
                const val = parseFloat(match[1]);
                if (val > 1.0) dropMultiplier = Math.max(dropMultiplier, val);
            } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                dropMultiplier = Math.max(dropMultiplier, eff.val);
            }
        }
    });

    return dropMultiplier;
};

export const getWeaponMasteryMultiplier = (character?: Character | Companion): number => {
    let mult = 1.0;
    if (!character) return mult;

    const processItem = (it: Item | undefined) => {
        if (!it) return;
        const optionsList: string[] = [
            ...(it.secondaryOptions || []),
            ...((it as any).options || []),
            ...((it as any).effects || []),
            it.description || ''
        ];

        optionsList.forEach(opt => {
            if (!opt || typeof opt !== 'string') return;
            const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
            if (cleanOpt.includes('WEAPONMASTERY') || cleanOpt.includes('무기숙련') || cleanOpt.includes('무기 숙련')) {
                const match = cleanOpt.match(/(?:WEAPONMASTERY|무기숙련도|무기숙련)\s*(?:획득량|획득)?\s*[:+ ]\s*([+-]?\d+(?:\.\d+)?)\s*%/i)
                           || cleanOpt.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:WEAPONMASTERY|무기숙련도|무기숙련)/i);
                if (match) {
                    const pctVal = 1 + parseFloat(match[1]) / 100;
                    if (pctVal > 1.0) mult = Math.max(mult, pctVal);
                } else {
                    const multMatch = cleanOpt.match(/(?:WEAPONMASTERY|무기숙련도|무기숙련)\s*X\s*(\d+(?:\.\d+)?)/i)
                                   || cleanOpt.match(/(?:WEAPONMASTERY|무기숙련도|무기숙련)\s*(\d+(?:\.\d+)?)\s*배/i)
                                   || cleanOpt.match(/(\d+(?:\.\d+)?)\s*배/i);
                    if (multMatch) {
                        const val = parseFloat(multMatch[1]);
                        if (val > 1.0) mult = Math.max(mult, val);
                    }
                }
            }
        });
    };

    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach(processItem);
    } else if ((character as any).equipment) {
        Object.values((character as any).equipment).forEach(processItem);
    }

    const activeEffectsList: any[] = [
        ...(character.statusEffects || []),
        ...((character as any).consumableEffects || []),
        ...((character as any).activeBuffs || []),
        ...((character as any).buffs || [])
    ];

    activeEffectsList.forEach(eff => {
        if (!eff) return;
        const effText = `${eff.name || ''} ${eff.effect || ''} ${eff.description || ''}`;
        if (effText.includes('WeaponMastery') || effText.includes('무기숙련') || effText.includes('무기 숙련')) {
            const match = effText.match(/(?:WeaponMastery|무기숙련도|무기숙련)\s*x?\s*(\d+(?:\.\d+)?)/i)
                       || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
            if (match) {
                const val = parseFloat(match[1]);
                if (val > 1.0) mult = Math.max(mult, val);
            } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                mult = Math.max(mult, eff.val);
            }
        }
    });

    return mult;
};

export const getSkillMasteryMultiplier = (character?: Character | Companion): number => {
    let mult = 1.0;
    if (!character) return mult;

    const processItem = (it: Item | undefined) => {
        if (!it) return;
        const optionsList: string[] = [
            ...(it.secondaryOptions || []),
            ...((it as any).options || []),
            ...((it as any).effects || []),
            it.description || ''
        ];

        optionsList.forEach(opt => {
            if (!opt || typeof opt !== 'string') return;
            const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
            if (cleanOpt.includes('SKILLMASTERY') || cleanOpt.includes('스킬숙련') || cleanOpt.includes('스킬 숙련')) {
                const match = cleanOpt.match(/(?:SKILLMASTERY|스킬숙련도|스킬숙련)\s*(?:획득량|획득)?\s*[:+ ]\s*([+-]?\d+(?:\.\d+)?)\s*%/i)
                           || cleanOpt.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:SKILLMASTERY|스킬숙련도|스킬숙련)/i);
                if (match) {
                    const pctVal = 1 + parseFloat(match[1]) / 100;
                    if (pctVal > 1.0) mult = Math.max(mult, pctVal);
                } else {
                    const multMatch = cleanOpt.match(/(?:SKILLMASTERY|스킬숙련도|스킬숙련)\s*X\s*(\d+(?:\.\d+)?)/i)
                                   || cleanOpt.match(/(?:SKILLMASTERY|스킬숙련도|스킬숙련)\s*(\d+(?:\.\d+)?)\s*배/i)
                                   || cleanOpt.match(/(\d+(?:\.\d+)?)\s*배/i);
                    if (multMatch) {
                        const val = parseFloat(multMatch[1]);
                        if (val > 1.0) mult = Math.max(mult, val);
                    }
                }
            }
        });
    };

    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach(processItem);
    } else if ((character as any).equipment) {
        Object.values((character as any).equipment).forEach(processItem);
    }

    const activeEffectsList: any[] = [
        ...(character.statusEffects || []),
        ...((character as any).consumableEffects || []),
        ...((character as any).activeBuffs || []),
        ...((character as any).buffs || [])
    ];

    activeEffectsList.forEach(eff => {
        if (!eff) return;
        const effText = `${eff.name || ''} ${eff.effect || ''} ${eff.description || ''}`;
        if (effText.includes('SkillMastery') || effText.includes('스킬숙련') || effText.includes('스킬 숙련')) {
            const match = effText.match(/(?:SkillMastery|스킬숙련도|스킬숙련)\s*x?\s*(\d+(?:\.\d+)?)/i)
                       || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
            if (match) {
                const val = parseFloat(match[1]);
                if (val > 1.0) mult = Math.max(mult, val);
            } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                mult = Math.max(mult, eff.val);
            }
        }
    });

    // 잠재력 제한 동료 보너스: 스킬 숙련도 획득량 2배
    if ((character as any)?.isPotentialLocked) {
        mult *= 2.0;
    }

    return mult;
};

export const calculateRewardBonuses = (character: Character | Companion): { goldBonus: number, expBonus: number, expMultiplier: number, goldMultiplier: number } => {
    let goldBonus = 0;
    let expBonus = 0;
    let expMultiplier = 1.0;
    let goldMultiplier = 1.0;

    if (!character) return { goldBonus, expBonus, expMultiplier, goldMultiplier };

    const processItem = (it: Item | undefined) => {
        if (!it) return;
        const optionsList: string[] = [
            ...(it.secondaryOptions || []),
            ...((it as any).options || []),
            ...((it as any).effects || []),
            it.description || ''
        ];

        optionsList.forEach(opt => {
            if (!opt || typeof opt !== 'string') return;
            const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();

            // Ignore drop rate or mastery options
            const isDropOrMastery = cleanOpt.includes("드롭") || cleanOpt.includes("DROP") ||
                                   cleanOpt.includes("무기숙련") || cleanOpt.includes("WEAPONMASTERY") ||
                                   cleanOpt.includes("스킬숙련") || cleanOpt.includes("SKILLMASTERY");
            if (isDropOrMastery) return;

            // EXP options
            if (cleanOpt.includes("EXP") || cleanOpt.includes("경험치")) {
                const pctMatch = cleanOpt.match(/(?:EXP|경험치)\s*(?:획득량|획득|GAIN)?\s*[:+ ]\s*([+-]?\d+(?:\.\d+)?)\s*%/i)
                              || cleanOpt.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:EXP|경험치)/i);
                if (pctMatch) {
                    expBonus += parseFloat(pctMatch[1]);
                } else {
                    const multMatch = cleanOpt.match(/(?:EXP|경험치)\s*X\s*(\d+(?:\.\d+)?)/i)
                                   || cleanOpt.match(/(?:EXP|경험치)\s*(\d+(?:\.\d+)?)\s*배/i);
                    if (multMatch) {
                        const val = parseFloat(multMatch[1]);
                        if (val > 1.0 && val > expMultiplier) expMultiplier = val;
                    }
                }
            }

            // GOLD options
            if (cleanOpt.includes("GOLD") || cleanOpt.includes("골드")) {
                const pctMatch = cleanOpt.match(/(?:GOLD|골드)\s*(?:획득량|획득|GAIN)?\s*[:+ ]\s*([+-]?\d+(?:\.\d+)?)\s*%/i)
                              || cleanOpt.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:GOLD|골드)/i);
                if (pctMatch) {
                    goldBonus += parseFloat(pctMatch[1]);
                } else {
                    const multMatch = cleanOpt.match(/(?:GOLD|골드)\s*X\s*(\d+(?:\.\d+)?)/i)
                                   || cleanOpt.match(/(?:GOLD|골드)\s*(\d+(?:\.\d+)?)\s*배/i);
                    if (multMatch) {
                        const val = parseFloat(multMatch[1]);
                        if (val > 1.0 && val > goldMultiplier) goldMultiplier = val;
                    }
                }
            }
        });
    };

    // 1. 장비 옵션 체크 (플레이어 + 동료 장비 포함)
    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach(processItem);
    } else if ((character as any).equipment) {
        Object.values((character as any).equipment).forEach(processItem);
    }

    if ('companions' in character && Array.isArray((character as any).companions)) {
        (character as any).companions.forEach((comp: any) => {
            if (comp && comp.equipment) {
                Object.values(comp.equipment).forEach(processItem);
            }
        });
    }

    // 2. 상태 효과 / 비약 버프(ConsumableEffects / ActiveBuffs) 체크
    const activeEffectsList: any[] = [
        ...(character.statusEffects || []),
        ...((character as any).consumableEffects || []),
        ...((character as any).activeBuffs || []),
        ...((character as any).buffs || [])
    ];

    if ('companions' in character && Array.isArray((character as any).companions)) {
        (character as any).companions.forEach((comp: any) => {
            if (comp && Array.isArray(comp.statusEffects)) {
                activeEffectsList.push(...comp.statusEffects);
            }
        });
    }

    activeEffectsList.forEach(eff => {
        if (!eff) return;

        const effText = `${eff.name || ''} ${eff.effect || ''} ${eff.val || ''} ${eff.description || ''}`;

        // EXP 전용 효과인지 판별
        const isExpRelated = (effText.includes('EXP') || effText.includes('경험치')) && 
                             !effText.includes('드롭') && !effText.includes('Drop') && 
                             !effText.includes('무기숙련') && !effText.includes('WeaponMastery') && 
                             !effText.includes('스킬숙련') && !effText.includes('SkillMastery');

        if (isExpRelated) {
            const pctMatch = effText.match(/(?:EXP|경험치)\s*(?:획득량|획득|GAIN)?\s*[:+ ]\s*([+-]?\d+)\s*%/i)
                          || effText.match(/([+-]?\d+)\s*%\s*(?:EXP|경험치)/i);
            if (pctMatch) {
                expBonus += parseInt(pctMatch[1]);
            } else {
                const multMatch = effText.match(/(?:EXP|경험치)\s*X\s*(\d+(?:\.\d+)?)/i) 
                               || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
                if (multMatch) {
                    const val = parseFloat(multMatch[1]);
                    if (val > 1.0 && val > expMultiplier) {
                        expMultiplier = val;
                    }
                } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                    if (eff.val > expMultiplier) {
                        expMultiplier = eff.val;
                    }
                }
            }
        }

        // 골드 전용 효과 판별
        const isGoldRelated = (effText.includes('GOLD') || effText.includes('골드')) &&
                              !effText.includes('드롭') && !effText.includes('Drop') &&
                              !effText.includes('무기숙련') && !effText.includes('WeaponMastery') &&
                              !effText.includes('스킬숙련') && !effText.includes('SkillMastery');

        if (isGoldRelated) {
            const pctMatch = effText.match(/(?:GOLD|골드)\s*(?:획득량|획득|GAIN)?\s*[:+ ]\s*([+-]?\d+)\s*%/i)
                          || effText.match(/([+-]?\d+)\s*%\s*(?:GOLD|골드)/i);
            if (pctMatch) {
                goldBonus += parseInt(pctMatch[1]);
            } else {
                const multMatch = effText.match(/(?:GOLD|골드)\s*X\s*(\d+(?:\.\d+)?)/i) 
                               || effText.match(/(\d+(?:\.\d+)?)\s*배/i);
                if (multMatch) {
                    const val = parseFloat(multMatch[1]);
                    if (val > 1.0 && val > goldMultiplier) {
                        goldMultiplier = val;
                    }
                } else if (typeof eff.val === 'number' && eff.val > 1.0) {
                    if (eff.val > goldMultiplier) {
                        goldMultiplier = eff.val;
                    }
                }
            }
        }
    });

    return { goldBonus, expBonus, expMultiplier, goldMultiplier };
};

export const calculateTotalStats = (character: Character | Companion | Enemy): { total: Stats, bonus: Partial<Stats> } => {
    const defaultStats: Stats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
    
    if (!character) {
        return { total: defaultStats, bonus: {} };
    }

    let baseStats: Stats = { ...defaultStats };
    
    if ('stats' in character && character.stats) {
        baseStats = { ...character.stats };
    }
    
    // [FIX] Character나 Companion은 stats 내의 hp/mp가 원본이므로 top-level 속성을 무시함 (Enemy만 사용)
    if (!('equipment' in character)) {
        if ('hp' in character && typeof character.hp === 'number') {
            baseStats.hp = character.hp;
        }
        if ('maxHp' in character && typeof character.maxHp === 'number') {
            baseStats.maxHp = character.maxHp;
        }
    }
    
    (Object.keys(defaultStats) as Array<keyof Stats>).forEach(key => {
        if (baseStats[key] === undefined || isNaN(Number(baseStats[key]))) {
            baseStats[key] = defaultStats[key];
        } else {
            baseStats[key] = Number(baseStats[key]);
        }
    });

    const bonusStats: any = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, hp: 0, mp: 0, maxHp: 0, maxMp: 0 };
    
    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach((item) => {
            const it = item as Item | undefined;
            if (it) {
                if (it.stats) {
                    const enhancementLevel = it.enhancement || 0;
                    Object.entries(it.stats).forEach(([key, val]) => {
                        const numVal = Number(val);
                        if (!isNaN(numVal)) {
                            const finalVal = getEnhancedStatValue(numVal, enhancementLevel, key);
                            const effectiveKey = (key === 'hp' ? 'maxHp' : key === 'mp' ? 'maxMp' : key) as keyof Stats;
                            bonusStats[effectiveKey] = (bonusStats[effectiveKey] || 0) + finalVal;
                            (baseStats as any)[effectiveKey] = ((baseStats as any)[effectiveKey] || 0) + finalVal;
                        }
                    });
                }

                if (it.secondaryOptions) {
                    it.secondaryOptions.forEach(opt => {
                        const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
                        
                        if (cleanOpt.includes("물리") || cleanOpt.includes("마법") || cleanOpt.includes("PHYSICAL") || cleanOpt.includes("MAGIC")) return;

                        const allStatFlatMatch = cleanOpt.match(/(?:ALL|모든|전체)\s*(?:STATS?|스탯|능력치)(?:\s*[:+ ]\s*|\s+)([+-]?\d+)(?!\s*%)/i);
                        if (allStatFlatMatch) {
                            const val = parseInt(allStatFlatMatch[1]);
                            if (!isNaN(val)) {
                                const allKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
                                allKeys.forEach(k => {
                                    bonusStats[k] = (bonusStats[k] || 0) + val;
                                    (baseStats as any)[k] = ((baseStats as any)[k] || 0) + val;
                                });
                            }
                        }

                        for (const [pattern, statKey] of Object.entries(STAT_PATTERNS)) {
                            const regex = new RegExp(
  `(?:^|\\s)${pattern.replace(/\s+/g, '\\s*')}(?:\\s*[:+ ]\\s*|\\s+)([+-]?\\d+)(?![\\d%])`,
  'i'
);
                            const match = cleanOpt.match(regex);
                            if (match) {
                                const val = parseInt(match[1]);
                                if (!isNaN(val)) {
                                    bonusStats[statKey] = (bonusStats[statKey] || 0) + val;
                                    (baseStats as any)[statKey] = ((baseStats as any)[statKey] || 0) + val;
                                }
                            }
                        }
                    });
                }
            }
        });
    }

    return { total: baseStats, bonus: bonusStats };
};

/**
 * [NEW] 역할 숙련도 100 달성 여부를 검증하여 유효한 전투 역할을 반환합니다.
 * 숙련도 100 미만일 경우 '역할없음' (BattleRole.NONE)으로 처리됩니다.
 */
export const getEffectiveBattleRole = (entity: any): BattleRole => {
    if (!entity) return BattleRole.NONE;
    const role = entity.battleRole;
    if (!role || role === BattleRole.NONE) return BattleRole.NONE;
    if (role === BattleRole.ALLROUNDER) {
        const dealerProf = entity.roleProficiency?.[BattleRole.DEALER] || 0;
        const tankerProf = entity.roleProficiency?.[BattleRole.TANKER] || 0;
        const supporterProf = entity.roleProficiency?.[BattleRole.SUPPORTER] || 0;
        const allProf = entity.roleProficiency?.[BattleRole.ALLROUNDER] || 0;
        if ((dealerProf >= 100 && tankerProf >= 100 && supporterProf >= 100) || allProf >= 100) {
            return BattleRole.ALLROUNDER;
        }
        return BattleRole.NONE;
    }
    const prof = entity.roleProficiency?.[role] || 0;
    if (prof >= 100) return role;
    return BattleRole.NONE;
};

export const getEffectiveSecondaryBattleRole = (entity: any): SecondaryBattleRole => {
    if (!entity) return SecondaryBattleRole.NONE;
    const secRole = entity.secondaryBattleRole;
    if (!secRole || secRole === SecondaryBattleRole.NONE) return SecondaryBattleRole.NONE;
    if (secRole === SecondaryBattleRole.ALLROUNDER) {
        const dealerProf = entity.roleProficiency?.[BattleRole.DEALER] || 0;
        const tankerProf = entity.roleProficiency?.[BattleRole.TANKER] || 0;
        const supporterProf = entity.roleProficiency?.[BattleRole.SUPPORTER] || 0;
        if (dealerProf >= 100 && tankerProf >= 100 && supporterProf >= 100) {
            return SecondaryBattleRole.ALLROUNDER;
        }
        return SecondaryBattleRole.NONE;
    }
    const prof = entity.secondaryRoleProficiency?.[secRole] || 0;
    if (prof >= 100) return secRole;
    return SecondaryBattleRole.NONE;
};

/**
 * 버프 효과 중첩 시 50% 반감 적용 계산 함수
 * 동일 스탯 계열의 여러 양수 버프가 중첩될 때 수치가 높은 순으로 정렬하여:
 * 1번째: 100% (val * 1.0)
 * 2번째 이상: 50% (val * 0.5, 원본 수치의 50%만 반영)
 * (음수 디버프는 감쇠 없이 100% 온전히 합산)
 */
export const calculateDiminishingBuffSum = (values: number[]): number => {
    if (!values || values.length === 0) return 0;
    const positives = values.filter(v => v > 0);
    const negatives = values.filter(v => v < 0);
    const positiveTotal = positives.reduce((sum, v) => sum + v, 0);
    const negativeTotal = negatives.reduce((sum, v) => sum + v, 0);
    const isDecimal = negatives.length > 0 && negatives.every(v => Math.abs(v) <= 2.5);
    const cappedNegativeTotal = Math.max(isDecimal ? -0.9 : -90, negativeTotal);
    return positiveTotal + cappedNegativeTotal;
};

export const calculateFinalStats = (character: Character | Companion | Enemy, options?: { excludeTemporaryBuffs?: boolean }): { finalStats: Stats, baseTotal: Stats, buffBonus: Partial<Stats>, passiveBonus?: Partial<Stats>, equipPercentBonus: Partial<Stats>, mountBonus: Partial<Stats>, combatStyleBonus: Partial<Stats>, activeSets?: { name: string; count: number; description: string }[] } => {
    return getCachedFinalStats(character, options, () => {
    const { total: baseTotal, bonus: flatEquipBonus} = calculateTotalStats(character);
    const finalStats = { ...baseTotal };
    const buffBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    const passiveBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    const equipPercentBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    const mountBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    const combatStyleBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    
    let allStatMultiplier = 0;

    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach((item: Item | undefined) => {
            if (item && item.secondaryOptions) {
                item.secondaryOptions.forEach(opt => {
                    const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
                    const allStatMatch = cleanOpt.match(/(?:최종|전체|모든|ALL|FINAL|TOTAL)\s*(?:능력치|스탯|STATS?|ATTRIBUTES?)(?:\s*[:+ ]\s*|\s+)?([+-]?\d+(?:\.\d+)?)%/i);
                    if (allStatMatch) {
                        allStatMultiplier += parseFloat(allStatMatch[1]);
                    }
                    const statPercentRegex = /(STR|INT|WIS|DEF|AGI|CTRL|HP|MP|MAXHP|최대 MP|최대 HP|MAXMP)\s*([+-]?\d+(?:\.\d+)?)%/i;
const statMatch = cleanOpt.match(statPercentRegex);

if (statMatch) {
    const raw = statMatch[1].toUpperCase();

let key: keyof Stats | undefined;

if (raw === "STR") key = "str";
else if (raw === "INT") key = "int";
else if (raw === "WIS") key = "wis";
else if (raw === "DEF") key = "def";
else if (raw === "AGI") key = "agi";
else if (raw === "CTRL") key = "ctrl";
else if (raw === "HP" || raw === "MAXHP" || raw === "최대 HP") key = "maxHp";
else if (raw === "MP" || raw === "MAXMP" || raw === "최대 MP") key = "maxMp";
 if (key) {
    const percent = parseFloat(statMatch[2]);
    const baseVal = baseTotal[key] || 0;
    const added = Math.floor(baseVal * (percent / 100));

    equipPercentBonus[key] = (equipPercentBonus[key] || 0) + added;
    finalStats[key] += added;
}
}
                });
            }
        });
    }

    if (allStatMultiplier > 0) {
        const factor = allStatMultiplier / 100;
        const keys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
        keys.forEach(k => {
            const added = Math.max(1, Math.floor(baseTotal[k] * factor)); 
            equipPercentBonus[k] = (equipPercentBonus[k] || 0) + added;
            finalStats[k] += added;
        });
    }

    // [NEW] 탈것(몬스터) 장착 보너스 적용 (능력치의 10% / 동일 신력 계통 매칭 시 +5% 추가 공명 보너스)
    let mount: any = null;
    if ('mountedMonster' in character && character.mountedMonster) {
        mount = character.mountedMonster;
    } else if ('mountedMonsterId' in character && character.mountedMonsterId) {
        if ((character as any).base?.capturedMonsters) {
            mount = (character as any).base.capturedMonsters.find((m: any) => m.id === character.mountedMonsterId);
        }
        if (!mount && (character as any).companions) {
            mount = (character as any).companions.find((c: any) => c.id === character.mountedMonsterId);
        }
    }
    
    if (mount && mount.stats) {
        const bonusResult = calculateMountFinalStatBonus(character as any, mount, calculateFinalStats as any);
        Object.entries(bonusResult.mountBonus).forEach(([key, val]) => {
            const k = key as keyof Stats;
            if (typeof val === 'number') {
                mountBonus[k] = (mountBonus[k] || 0) + val;
                finalStats[k] = (finalStats[k] || 0) + val;
            }
        });
    }

    // [MODIFIED] 패시브 스킬을 상태 이상(액티브 버프)보다 먼저 적용하며, finalStats를 기준으로 계산 (복리 적용)
    if ('skills' in character && character.skills) {
        let equippedWeaponTypes: string[] = [];
        if ('equipment' in character && character.equipment) {
            if (character.equipment.weapon) {
                const type = getWeaponTypeFromItem(character.equipment.weapon);
                if (type) equippedWeaponTypes.push(type);
            }
            if (character.equipment.subWeapon) {
                const type = getWeaponTypeFromItem(character.equipment.subWeapon);
                if (type) equippedWeaponTypes.push(type);
            }
        }
        if ((character as any).weaponMastery) {
            Object.keys((character as any).weaponMastery).forEach(wmKey => {
                if (!equippedWeaponTypes.includes(wmKey)) equippedWeaponTypes.push(wmKey);
            });
        }

        const hasNoEquip = !('equipment' in character) || !character.equipment || !character.equipment.weapon;

        character.skills.forEach(skill => {
            const isPassive = skill.type === SkillType.PASSIVE || 
                String(skill.type).toUpperCase() === 'PASSIVE' || 
                String(skill.type) === '패시브' || 
                Boolean((skill as any).isPassive);

            if (isPassive && skill.effectFormula) {
                // 패시브 스킬 무기 착용 조건 확인 (공통 COND 태그)
                const globalCondMatch = skill.effectFormula.match(/\[COND:\s*(.+?)\]/);
                const skillCondition = globalCondMatch ? globalCondMatch[1].trim() : undefined;
                if (skillCondition && !equippedWeaponTypes.includes(skillCondition) && !hasNoEquip) {
                    return; // 착용 조건 미달 시 패시브 스킬 미적용 (단, 장비 미착용 상태 순수 스탯 계산 시에는 패시브 스킬 인정)
                }

                const regex = /\[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)/g;
                let match;
                while ((match = regex.exec(skill.effectFormula)) !== null) {
                    const target = match[1]; 
                    const basePercent = parseFloat(match[2]);
                    const scalePercent = parseFloat(match[3]);

                    let key: keyof Stats | undefined;
                    const upperTarget = target.toUpperCase();
                    if (upperTarget === 'STR') key = 'str'; 
                    else if (upperTarget === 'INT') key = 'int';
                    else if (upperTarget === 'WIS') key = 'wis';
                    else if (upperTarget === 'DEF') key = 'def';
                    else if (upperTarget === 'AGI') key = 'agi';
                    else if (upperTarget === 'CTRL') key = 'ctrl';
                    else if (upperTarget === 'MAXHP' || upperTarget === 'HP') key = 'maxHp';
                    else if (upperTarget === 'MAXMP' || upperTarget === 'MP') key = 'maxMp';

                    if (key) {
                        const level = skill.level || 1;
                        const totalPercent = basePercent + (scalePercent * level);
                        const baseVal = baseTotal[key] || 0;
                        const bonus = Math.floor(baseVal * (totalPercent / 100));

                        if (bonus > 0) {
                            passiveBonus[key] = (passiveBonus[key] || 0) + bonus;
                            finalStats[key] = (finalStats[key] || 0) + bonus;
                        }
                    }
                }
            }
        });
    }
    
    // [NEW] 칭호 보너스 적용
    if (character.equippedTitleId && TITLES[character.equippedTitleId]) {
      const title = TITLES[character.equippedTitleId];
      if (title.stats) {
        Object.entries(title.stats).forEach(([k, v]) => {
          const key = k as keyof Stats;
          finalStats[key] += Number(v);
        });
      }
      if (title.statMultipliers) {
        Object.entries(title.statMultipliers).forEach(([k, v]) => {
          const key = k as keyof Stats;
          const bonus = Math.floor((baseTotal[key] || 0) * Number(v));
          finalStats[key] += bonus;
        });
      }
    }
    // [NEW] 전투 계열 보너스 적용
    const combatStyle = (character as any).combatStyle;
    if (combatStyle && COMBAT_STYLE_CONFIG[combatStyle]) {
        const styleInfo = COMBAT_STYLE_CONFIG[combatStyle];
        if (styleInfo.bonuses) {
            const keys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
            keys.forEach(k => {
                if (styleInfo.bonuses[k]) {
                    const bonus = Math.floor(baseTotal[k] * styleInfo.bonuses[k]);
                    combatStyleBonus[k] = (combatStyleBonus[k] || 0) + bonus;
                    finalStats[k] += bonus;
                }
            });
        }
    }

    // [NEW] 전투 계열 습득 보유 패시브 (Learned Passives) 누적 적용
    const unlockedStyles = getUnlockedCombatStylesList(character as any);
    unlockedStyles.forEach(style => {
        const styleSkillSet = getCombatStyleSkillSet(style, COMBAT_STYLE_CONFIG[style]?.tier || 1);
        if (styleSkillSet?.learnedPassive?.statBonus) {
            const bonus = styleSkillSet.learnedPassive.statBonus;
            if (bonus.str) { finalStats.str += bonus.str; combatStyleBonus.str = (combatStyleBonus.str || 0) + bonus.str; }
            if (bonus.int) { finalStats.int += bonus.int; combatStyleBonus.int = (combatStyleBonus.int || 0) + bonus.int; }
            if (bonus.wis) { finalStats.wis += bonus.wis; combatStyleBonus.wis = (combatStyleBonus.wis || 0) + bonus.wis; }
            if (bonus.def) { finalStats.def += bonus.def; combatStyleBonus.def = (combatStyleBonus.def || 0) + bonus.def; }
            if (bonus.agi) { finalStats.agi += bonus.agi; combatStyleBonus.agi = (combatStyleBonus.agi || 0) + bonus.agi; }
            if (bonus.ctrl) { finalStats.ctrl += bonus.ctrl; combatStyleBonus.ctrl = (combatStyleBonus.ctrl || 0) + bonus.ctrl; }
            if (bonus.maxHp) { finalStats.maxHp += bonus.maxHp; finalStats.hp += bonus.maxHp; combatStyleBonus.maxHp = (combatStyleBonus.maxHp || 0) + bonus.maxHp; }
            if (bonus.maxMp) { finalStats.maxMp += bonus.maxMp; finalStats.mp += bonus.maxMp; combatStyleBonus.maxMp = (combatStyleBonus.maxMp || 0) + bonus.maxMp; }
        }
    });

    // [NEW] 클래스 해방 단계에 따른 방어력 및 최대 체력 보정 (1번, 2번 개선책)
    const classDefenseBonus = calculateClassTierStatBonus(character, baseTotal.def, baseTotal.maxHp, (character as any).skills);
    if (classDefenseBonus.addedDef > 0) {
        finalStats.def += classDefenseBonus.addedDef;
    }
    if (classDefenseBonus.addedHp > 0) {
        finalStats.maxHp += classDefenseBonus.addedHp;
        finalStats.hp += classDefenseBonus.addedHp;
    }

    // [MODIFIED] 액티브 상태 이상 및 버프(statusEffects)를 합연산 방식으로 적용 (복리 방지)
    if (!options?.excludeTemporaryBuffs && character.statusEffects) {
        refreshBuffDiminishingStatus(character.statusEffects, (character as any).shinryokuType);
        const statConfig: { aliases: string[]; key: keyof Stats }[] = [
            { aliases: ['MaxHP', '최대 HP', '최대HP', 'HP', '체력'], key: 'maxHp' },
            { aliases: ['MaxMP', '최대 MP', '최대MP', 'MP', '마력'], key: 'maxMp' },
            { aliases: ['STR', '힘', '근력'], key: 'str' },
            { aliases: ['INT', '지능'], key: 'int' },
            { aliases: ['WIS', '지혜', '정신', '신앙'], key: 'wis' },
            { aliases: ['DEF', '방어', '방어력'], key: 'def' },
            { aliases: ['AGI', '민첩', '순발력', '속도'], key: 'agi' },
            { aliases: ['CTRL', '제어', '통제'], key: 'ctrl' },
        ];

        // 버프 적용 전 기준 스탯 스냅샷 (합연산 기준값)
        const statBaseBeforeBuffs: Record<keyof Stats, number> = {
            str: finalStats.str || 0,
            int: finalStats.int || 0,
            wis: finalStats.wis || 0,
            def: finalStats.def || 0,
            agi: finalStats.agi || 0,
            ctrl: finalStats.ctrl || 0,
            maxHp: finalStats.maxHp || 0,
            maxMp: finalStats.maxMp || 0,
            hp: finalStats.hp || 0,
            mp: finalStats.mp || 0
        };

        const percentBonusMap: Partial<Record<keyof Stats, number[]>> = {};
        const totalFlatBonus: Partial<Record<keyof Stats, number>> = {};

        character.statusEffects.forEach(effect => {
            const effectStr = effect.effect || "";
            statConfig.forEach(({ aliases, key }) => {
                for (const alias of aliases) {
                    const percentRegex = new RegExp(`(?:^|[^a-zA-Z가-힣])${alias.replace('.', '\\.')}\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
                    const percentMatch = effectStr.match(percentRegex);
                    if (percentMatch) {
                        const percent = parseFloat(percentMatch[1]);
                        if (!percentBonusMap[key]) percentBonusMap[key] = [];
                        percentBonusMap[key]!.push(percent);
                        break;
                    } else {
                        const flatRegex = new RegExp(`(?:^|[^a-zA-Z가-힣])${alias.replace('.', '\\.')}\\s*([+-]?\\d+)(?!%|\\s*%)`, 'i');
                        const flatMatch = effectStr.match(flatRegex);
                        if (flatMatch) {
                            const flatVal = parseInt(flatMatch[1]);
                            totalFlatBonus[key] = (totalFlatBonus[key] || 0) + flatVal;
                            break;
                        }
                    }
                }
            });
        });

        // 합산된 퍼센트(동일 스탯 버프 중첩 시 50% 반감 점감 적용) 및 고정치를 기준 스탯에 합연산으로 일괄 적용
        statConfig.forEach(({ key }) => {
            const totalPercent = calculateDiminishingBuffSum(percentBonusMap[key] || []);
            const totalFlat = totalFlatBonus[key] || 0;
            const baseVal = statBaseBeforeBuffs[key] || 0;
            const percentBonus = Math.floor(baseVal * (totalPercent / 100));
            const combinedBonus = percentBonus + totalFlat;

            if (combinedBonus !== 0) {
                buffBonus[key] = (buffBonus[key] || 0) + combinedBonus;
                finalStats[key] = Math.max(1, (finalStats[key] || 0) + combinedBonus);
            }
        });
    }

    // [NEW] 임신 중 디버프 (모든 능력치 70% 감소) - 최종 스탯의 70%로 만듦 (30% 감소)
    if ('pregnancy' in character && character.pregnancy?.isPregnant) {
        const statKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
        statKeys.forEach(key => {
            if (finalStats[key]) {
                finalStats[key] = Math.floor(finalStats[key] * 0.7);
            }
        });
    }

    // [NEW] 피로도 80% 이상 서서히 능력치 감소 디버프 (80%에서 0% 감소 시작 ~ 100%에서 50% 감소)
    const currentFatigue = ('fatigue' in character && typeof (character as any).fatigue === 'number') ? (character as any).fatigue : 0;
    if (currentFatigue >= 80) {
        const clampedFatigue = Math.min(100, currentFatigue);
        const penaltyRatio = ((clampedFatigue - 80) / 20) * 0.5; // 80 -> 0, 100 -> 0.5 (50% 감소)
        const mult = 1 - penaltyRatio;
        const statKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
        statKeys.forEach(key => {
            if (finalStats[key]) {
                finalStats[key] = Math.max(1, Math.floor(finalStats[key] * mult));
            }
        });
    }

    // [MODIFIED] 보스 전리품 세트 효과 및 보스부스트 증폭 계산 (services/bossSetEffectService)
    const setResults = calculateBossSetEffects(character);
    const setKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp', 'hp', 'mp'];
    setKeys.forEach(k => {
        if (setResults.statBonus[k]) {
            finalStats[k] = (finalStats[k] || 0) + setResults.statBonus[k];
        }
    });
    if (setResults.finalStatMultiplier > 1.0) {
        setKeys.forEach(k => {
            finalStats[k] = Math.floor((finalStats[k] || 0) * setResults.finalStatMultiplier);
        });
    }
    const activeSets = setResults.activeSets;

    return { finalStats, baseTotal, buffBonus, passiveBonus, equipPercentBonus, mountBonus, combatStyleBonus, activeSets };
    });
};

export const calculateItemPrice = (item: Item): number => {
    if (!item) return 0;
    if (item.price !== undefined && item.price > 0) {
        return item.price;
    }
    const basePrice = SELL_PRICES[item.rarity] || 10;
    const enhance = item.enhancement || 0;
    const enhanceMult = 1 + (enhance * 0.5);
    const type = item.type ? (item.type || "").toLowerCase() : "";
    
    let typeMult = 1.0;
    if (type.includes('weapon') || type.includes('무기')) typeMult = 1.5;
    if (type.includes('accessory') || type.includes('장신구')) typeMult = 2.0;

    return Math.floor(basePrice * enhanceMult * typeMult);
};

export const calculateDerivedStats = (
    stats: Stats, 
    statusEffects: ActiveStatus[] = [], 
    weaponMastery?: { level: number, type: WeaponType },
    subMastery?: { level: number, type: WeaponType },
    elementalSynergy: boolean = false,
    skills?: Skill[],
    equipment?: any,
    shinryokuType?: string, // [NEW] 캐릭터의 속성 정보 추가
    affection?: number, // [NEW]
    bondBonus?: number, // [NEW]
    elementalDamageBoosts?: Record<string, number>, // [NEW]
    elementalResistanceBoosts?: Record<string, number>, // [NEW]
    battlePosition?: BattlePosition, // [NEW] 위치 기반 보너스
    combatStyle?: CombatStyle, // [NEW] 전투 계열
    battleRole?: BattleRole, // [NEW] 전투 역할 보너스
    secondaryBattleRole?: SecondaryBattleRole // [NEW] 2차 전투 역할 보너스
): DerivedStats => {
    const s = (key: keyof Stats) => Number(stats[key]) || 0;
        const ctrl = s('ctrl');
    let modPAtk = 1.0;
    let modMAtk = 1.0;
    // [NEW] 클래스 해방 단계에 따른 전투 중 물리/마법 방어력 계수 보정
    const classDefMultiplier = getDerivedDefenseMultiplierForClassTier({ shinryokuType }, skills);
    let modPDef = 1.0 + classDefMultiplier;
    let modMDef = 1.0 + classDefMultiplier;
    let modAgi = 1.0;
    let modCrit = 0; 
    let modResist = 0; 
    
    let bonusAcc = 0;
    let bonusEva = 0;
    let bonusMAcc = 0;
    let bonusMEva = 0;
    let bonusCritDmg = 0;
    let bonusCritDmgResist = 0;
    let bonusCritResist = 0;

    // [NEW] 장비 파싱용 수치
    let flatPAtk = 0;
    let flatMAtk = 0;
    let flatPDef = 0;
    let flatMDef = 0;

    // [NEW] 전투 계열 특화 무기 장착 시 물리 및 마법 공격력 증가 & 2~4차 특화 보너스 적용
    let combatStyleBonusApplied = false;
    let combatStyleBonusValue = 0;
    
    // 2~4차 특화 속성용 임시 변수
    let styleBonuses: any = {};

    if (combatStyle) {
        const styleInfo = COMBAT_STYLE_CONFIG[combatStyle];
        const styleSkillSet = getCombatStyleSkillSet(combatStyle, styleInfo?.tier || 1);

        // 1) 전투 계열 장착 전용 패시브 (Equipped Passive) 상시 적용
        if (styleSkillSet?.equippedPassive?.statBonus) {
            const eqBonus = styleSkillSet.equippedPassive.statBonus;
            if (eqBonus.pAtkRate) modPAtk += eqBonus.pAtkRate;
            if (eqBonus.mAtkRate) modMAtk += eqBonus.mAtkRate;
            if (eqBonus.pDefRate) modPDef += eqBonus.pDefRate;
            if (eqBonus.mDefRate) modMDef += eqBonus.mDefRate;
            if (eqBonus.agiRate) modAgi += eqBonus.agiRate;
            if (eqBonus.critRate) modCrit += (eqBonus.critRate * 100);
            if (eqBonus.critDmg) bonusCritDmg += eqBonus.critDmg;
            if (eqBonus.critDmgResist) bonusCritDmgResist += eqBonus.critDmgResist;
            if (eqBonus.accRate) bonusAcc += (eqBonus.accRate * 100);
            if (eqBonus.mAccRate) bonusMAcc += (eqBonus.mAccRate * 100);
            if (eqBonus.evaRate) bonusEva += (eqBonus.evaRate * 100);
            if (eqBonus.mEvaRate) bonusMEva += (eqBonus.mEvaRate * 100);
        }

        // 1-1) 해금된 전투 계열의 보유 패시브 (Learned Passive) 비율 및 명중 보너스 상시 적용
        const stylesToApply = combatStyle ? [combatStyle] : [];
        stylesToApply.forEach(st => {
            const stInfo = COMBAT_STYLE_CONFIG[st];
            const stSet = getCombatStyleSkillSet(st, stInfo?.tier || 1);
            if (stSet?.learnedPassive?.statBonus) {
                const lpBonus = stSet.learnedPassive.statBonus;
                if (lpBonus.pAtkRate) modPAtk += lpBonus.pAtkRate;
                if (lpBonus.mAtkRate) modMAtk += lpBonus.mAtkRate;
                if (lpBonus.pDefRate) modPDef += lpBonus.pDefRate;
                if (lpBonus.mDefRate) modMDef += lpBonus.mDefRate;
                if (lpBonus.critRate) modCrit += (lpBonus.critRate * 100);
                if (lpBonus.critDmg) bonusCritDmg += lpBonus.critDmg;
                if (lpBonus.critDmgResist) bonusCritDmgResist += lpBonus.critDmgResist;
                if (lpBonus.accRate) bonusAcc += (lpBonus.accRate * 100);
                if (lpBonus.mAccRate) bonusMAcc += (lpBonus.mAccRate * 100);
                if (lpBonus.evaRate) bonusEva += (lpBonus.evaRate * 100);
                if (lpBonus.mEvaRate) bonusMEva += (lpBonus.mEvaRate * 100);
            }
        });

        // 1-2) 도적 계열 전용 회피율 패시브 특화 증대
        if (styleInfo && (styleInfo.rootStyle === CombatStyle.ROGUE || combatStyle === CombatStyle.ROGUE)) {
            const rogueTier = styleInfo.tier || 1;
            const extraRogueEva = 15 + (rogueTier * 5); // 1차: +20%, 2차: +25%, 3차: +30%, 4차: +35%
            bonusEva += extraRogueEva;
            bonusMEva += extraRogueEva;
        }

        // 2) 특화 무기 장착 시 추가 시너지 및 승급 보너스 적용
        if (equipment && hasCombatStyleSpecialtyEquipped(combatStyle, equipment)) {
            if (styleInfo) {
                switch(styleInfo.tier) {
                    case 1: combatStyleBonusValue = 0.10; break;
                    case 2: combatStyleBonusValue = 0.20; break;
                    case 3: combatStyleBonusValue = 0.35; break;
                    case 4: combatStyleBonusValue = 0.50; break;
                    default: combatStyleBonusValue = 0.10; break;
                }
                modPAtk += combatStyleBonusValue;
                modMAtk += combatStyleBonusValue;
                combatStyleBonusApplied = true;
                
                if (styleInfo.bonuses) {
                    styleBonuses = styleInfo.bonuses as any;
                    if (styleBonuses.pAtk) modPAtk += styleBonuses.pAtk;
                    if (styleBonuses.mAtk) modMAtk += styleBonuses.mAtk;
                    if (styleBonuses.pDef) modPDef += styleBonuses.pDef;
                    if (styleBonuses.mDef) modMDef += styleBonuses.mDef;
                    if (styleBonuses.agi) modAgi += styleBonuses.agi;
                    if (styleBonuses.crit !== undefined) {
                        const critVal = styleBonuses.crit < 1 ? styleBonuses.crit * 100 : styleBonuses.crit;
                        modCrit += critVal;
                    }
                    if (styleBonuses.critDmg !== undefined) {
                        const critDmgVal = styleBonuses.critDmg >= 1 ? styleBonuses.critDmg : styleBonuses.critDmg * 100;
                        bonusCritDmg += critDmgVal;
                    }
                    if (styleBonuses.critDmgResist !== undefined) {
                        const resistVal = styleBonuses.critDmgResist >= 1 ? styleBonuses.critDmgResist : styleBonuses.critDmgResist * 100;
                        bonusCritDmgResist += resistVal;
                    }
                    if (styleBonuses.acc !== undefined) {
                        const accVal = Math.abs(styleBonuses.acc) <= 1 ? styleBonuses.acc * 100 : styleBonuses.acc;
                        bonusAcc += accVal;
                    }
                    if (styleBonuses.eva !== undefined) {
                        const evaVal = Math.abs(styleBonuses.eva) <= 1 ? styleBonuses.eva * 100 : styleBonuses.eva;
                        bonusEva += evaVal;
                    }
                    if (styleBonuses.mAcc !== undefined) {
                        const mAccVal = Math.abs(styleBonuses.mAcc) <= 1 ? styleBonuses.mAcc * 100 : styleBonuses.mAcc;
                        bonusMAcc += mAccVal;
                    }
                    if (styleBonuses.mEva !== undefined) {
                        const mEvaVal = Math.abs(styleBonuses.mEva) <= 1 ? styleBonuses.mEva * 100 : styleBonuses.mEva;
                        bonusMEva += mEvaVal;
                    }
                    if (styleBonuses.resist) modResist += styleBonuses.resist;
                }
            }
        }
    }

    // [NEW] Affection bonus
    if (affection !== undefined) {
        // 100 affection = 5% bonus to Atk
        const affectionBonus = Math.floor(affection / 100) * 0.05;
        modPAtk += affectionBonus;
        modMAtk += affectionBonus;
    }

    // [NEW] Bond bonus
    if (bondBonus !== undefined) {
        modPAtk += bondBonus;
        modMAtk += bondBonus;
    }

 // [NEW] 속성 Atk/Res 초기값 및 CTRL 보정치 계산 (기본 1.0 + Math.min(1, CTRL/10000))
    const ctrlBonusScale = Math.min(1, ctrl / 10000);
    const elementalBase = 1.0 + ctrlBonusScale;
    
    const elemental: Record<string, { atk: number; res: number }> = {};
    SHINRYOKU_TYPES_LIST.forEach(type => {
        const dmgBoost = elementalDamageBoosts?.[type] || 0;
        const resBoost = elementalResistanceBoosts?.[type] || 0;
        
        let styleAtkBonus = 0;
        let styleResBonus = 0;
        if (styleBonuses['atk_' + type]) styleAtkBonus += styleBonuses['atk_' + type];
        if (styleBonuses['res_' + type]) styleResBonus += styleBonuses['res_' + type];

        const shortType = type.replace('계', '');
        if (styleBonuses['atk_' + shortType]) styleAtkBonus += styleBonuses['atk_' + shortType];
        if (styleBonuses['res_' + shortType]) styleResBonus += styleBonuses['res_' + shortType];
        
        if ((styleBonuses['atk_원소'] || styleBonuses['atk_모든속성']) && ['불', '물', '바람', '대지', '화염계', '해수계', '질풍계', '대지계'].includes(type)) {
            styleAtkBonus += (styleBonuses['atk_원소'] || 0);
        }
        if ((styleBonuses['res_원소'] || styleBonuses['res_모든속성']) && ['불', '물', '바람', '대지', '화염계', '해수계', '질풍계', '대지계'].includes(type)) {
            styleResBonus += (styleBonuses['res_원소'] || 0);
        }

        if (styleBonuses['atk_모든속성']) styleAtkBonus += styleBonuses['atk_모든속성'];
        if (styleBonuses['res_모든속성']) styleResBonus += styleBonuses['res_모든속성'];
        
        elemental[type] = { 
            atk: elementalBase + dmgBoost + styleAtkBonus, 
            res: elementalBase + resBoost + styleResBonus 
        };
    });

    if (shinryokuType && styleBonuses.shinryoku_atk && elemental[shinryokuType]) {
        elemental[shinryokuType].atk += styleBonuses.shinryoku_atk;
    }
    if (shinryokuType && styleBonuses.shinryoku_res && elemental[shinryokuType]) {
        elemental[shinryokuType].res += styleBonuses.shinryoku_res;
    }

    // [MODIFIED] 보스 전리품 세트 효과 및 보스부스트 증폭 연동 (services/bossSetEffectService)
    if (equipment) {
        const setEffects = calculateBossSetEffects({ equipment } as any);
        if (setEffects.pAtkPercent > 0) modPAtk += (setEffects.pAtkPercent / 100);
        if (setEffects.mAtkPercent > 0) modMAtk += (setEffects.mAtkPercent / 100);
        if (setEffects.pDefPercent > 0) modPDef += (setEffects.pDefPercent / 100);
        if (setEffects.mDefPercent > 0) modMDef += (setEffects.mDefPercent / 100);
        if (setEffects.critChanceBonus > 0) modCrit += setEffects.critChanceBonus;
        if (setEffects.statusResistBonus > 0) modResist += setEffects.statusResistBonus;
        if (setEffects.accuracyBonus > 0) { bonusAcc += setEffects.accuracyBonus; bonusMAcc += setEffects.accuracyBonus; }
        if (setEffects.evasionBonus > 0) { bonusEva += setEffects.evasionBonus; bonusMEva += setEffects.evasionBonus; }

        Object.entries(setEffects.elementalAtkBonus).forEach(([type, boost]) => {
            if (type === '모든속성') {
                Object.keys(elemental).forEach(t => { elemental[t].atk += boost; });
            } else if (elemental[type]) {
                elemental[type].atk += boost;
            }
        });
        Object.entries(setEffects.elementalResBonus).forEach(([type, boost]) => {
            if (type === '모든속성') {
                Object.keys(elemental).forEach(t => { elemental[t].res += boost; });
            } else if (elemental[type]) {
                elemental[type].res += boost;
            }
        });
    }

    const mythicOptions: (MythicOptionType | MagyeOptionType)[] = [];
    if (equipment && (equipment as any).mythicOptions && Array.isArray((equipment as any).mythicOptions)) {
        mythicOptions.push(...(equipment as any).mythicOptions);
    }
    if (equipment && (equipment as any).mythicOption) {
        mythicOptions.push((equipment as any).mythicOption);
    }
    if (statusEffects && Array.isArray(statusEffects)) {
        statusEffects.forEach((st: any) => {
            if (st && st.mythicOptions && Array.isArray(st.mythicOptions)) {
                mythicOptions.push(...st.mythicOptions);
            }
        });
    }
    if (equipment) {
        Object.values(equipment).forEach((item: any) => {
            if (item && item.mythicOption) {
                mythicOptions.push(item.mythicOption);
            }
            if (item && item.secondaryOptions) {
                item.secondaryOptions.forEach((opt: string) => {
                    const match = opt.match(/([+-]?\d+(?:\.\d+)?)\s*(%?)/);
                    const upper = opt.toUpperCase();
                    // 공백 제거 버전 (인식 정확도)
                    const clean = opt.replace(/\s+/g, '').toUpperCase();
                    
                    if (match) {
                        const val = parseFloat(match[1]);
                        const floatVal = parseFloat(match[1]);
                        const isPercent = match[2] === '%';

                        // [NEW] 물리/마법 공격력 및 방어력 파싱 로직 추가
                        if (clean.includes("물리공격력") || clean.includes("PHYSICALATTACK")) {
                            if (isPercent) modPAtk += (floatVal / 100); else flatPAtk += floatVal;
                        }
                        else if (clean.includes("마법공격력") || clean.includes("MAGICATTACK")) {
                            if (isPercent) modMAtk += (floatVal / 100); else flatMAtk += floatVal;
                        }
                        else if (clean.includes("물리방어력") || clean.includes("PHYSICALDEFENSE")) {
                            if (isPercent) modPDef += (floatVal / 100); else flatPDef += floatVal;
                        }
                        else if (clean.includes("마법방어력") || clean.includes("MAGICDEFENSE")) {
                            if (isPercent) modMDef += (floatVal / 100); else flatMDef += floatVal;
                        }
                        else if (clean.includes("치명타율") || clean.includes("CRITICALCHANCE")) {
                            modCrit += floatVal; // e.g. +5% -> 5% 추가
                        }
                        else if (clean.includes("상태이상저항") || clean.includes("STATUSRESIST")) {
                            modResist += floatVal;
                        }

                        // [NEW] 모든 속성 통합 파싱 로직 추가
                        if (upper.includes("모든 속성") || upper.includes("전체 속성") || upper.includes("ALL ATTR") || upper.includes("ALL ELEMENT")) {
                            if (upper.includes("피해") || upper.includes("ATTACK") || upper.includes("ATK")) {
                                 SHINRYOKU_TYPES_LIST.forEach(t => elemental[t].atk += floatVal / 100);
                            } else if (upper.includes("저항") || upper.includes("RESIST") || upper.includes("RES")) {
                                 SHINRYOKU_TYPES_LIST.forEach(t => elemental[t].res += floatVal / 100);
                            }
                        }
                        if (upper.includes("물리 명중률") || upper.includes("PHYSICAL ACCURACY") || clean.includes("물리명중률") || clean.includes("PHYSICALACCURACY")) bonusAcc += floatVal;
                        else if (upper.includes("물리 회피율") || upper.includes("PHYSICAL EVASION") || clean.includes("물리회피율") || clean.includes("PHYSICALEVASION")) bonusEva += floatVal;
                        else if (upper.includes("마법 명중률") || upper.includes("MAGIC ACCURACY") || clean.includes("마법명중률") || clean.includes("MAGICACCURACY")) bonusMAcc += floatVal;
                        else if (upper.includes("마법 회피율") || upper.includes("MAGIC EVASION") || clean.includes("마법회피율") || clean.includes("MAGICEVASION")) bonusMEva += floatVal;
                        else if (upper.includes("치명타 피해 감소") || upper.includes("CRITICAL DAMAGE REDUCTION")) bonusCritDmgResist += floatVal;
                        else if (upper.includes("치명타 저항") || upper.includes("CRITICAL RESIST") || upper.includes("CRIT RESIST") || clean.includes("치명타저항")) bonusCritResist += floatVal;
                        else if (upper.includes("치명타 피해") || upper.includes("CRITICAL DAMAGE")) bonusCritDmg += floatVal;
                         // [MODIFIED] 속성 피해/저항 장비 보너스 파싱 - 퍼센트 단위 정규화 적용
                        SHINRYOKU_TYPES_LIST.forEach(type => {
                            const typeName = type.replace('계', '');
                            if (upper.includes(typeName) && upper.includes("피해")) {
                                elemental[type].atk += floatVal / 100;
                            } else if (upper.includes(typeName) && upper.includes("저항")) {
                                elemental[type].res += floatVal / 100;
                            }
                        });
                    }
                });
            }
        });
    }


    const rawModPAtkList: number[] = [];
    const rawModMAtkList: number[] = [];
    const rawModPDefList: number[] = [];
    const rawModMDefList: number[] = [];
    const rawModAgiList: number[] = [];
    const rawModCritList: number[] = [];
    const rawBonusAccList: number[] = [];
    const rawBonusMAccList: number[] = [];
    const rawBonusEvaList: number[] = [];
    const rawBonusMEvaList: number[] = [];
    const elementalAtkMap: Record<string, number[]> = {};
    const elementalResMap: Record<string, number[]> = {};

    if (statusEffects && statusEffects.length > 0) {
        refreshBuffDiminishingStatus(statusEffects, shinryokuType);
    }

    statusEffects.forEach(effect => {
        if (effect.name === "감전") { modPDef *= 0.85; modMDef *= 0.85; }
        if (effect.name === "빙결") { modPDef *= 0.95; modMDef *= 0.95; }
        if (effect.name === "암흑") { modAgi *= 0.85; }
        if (effect.name === "공포") { modPAtk *= 0.8; modMAtk *= 0.8; modCrit -= 10; }
        if (effect.name === "속박") { modPDef *= 0.8; modMDef *= 0.8; }
        if (effect.name === "소멸") { modPAtk *= 0.8; modMAtk *= 0.8; modPDef *= 0.75; modMDef *= 0.75; }
        if (effect.name === "파열") { modPDef *= 0.7; modMDef *= 0.7; }
        if (effect.name === "월침") { modPDef *= 0.8; modMDef *= 0.8; modCrit -= 20; }
        if (effect.name === "월암") { modPAtk *= 0.7; modMAtk *= 0.7; modAgi *= 0.7; }
        if (effect.name === "냉기") { modAgi *= 0.5; }
        
        const effectStr = effect.effect || "";
        const buffs = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'];
        buffs.forEach(stat => {
            const regex = new RegExp(`${stat}\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
            const match = effectStr.match(regex);
            if (match) {
                const val = parseFloat(match[1]) / 100;
                if (stat === 'STR') rawModPAtkList.push(val);
                if (stat === 'INT') rawModMAtkList.push(val);
                if (stat === 'DEF') { rawModPDefList.push(val); rawModMDefList.push(val); }
                if (stat === 'AGI') { rawModAgiList.push(val); rawModPAtkList.push(val * 0.3); }
                if (stat === 'WIS') { rawModMDefList.push(val); rawModMAtkList.push(val * 0.2); }
                if (stat === 'CTRL') rawModCritList.push(val * 10);
            }
        });

        const derivedBuffs = [
            { key: 'P.Atk', var: 'modPAtk' },
            { key: 'M.Atk', var: 'modMAtk' },
            { key: 'P.Def', var: 'modPDef' },
            { key: 'M.Def', var: 'modMDef' },
            { key: 'Acc', var: 'bonusAcc' },
            { key: 'P.Acc', var: 'bonusAcc' },
            { key: 'MAcc', var: 'bonusMAcc' },
            { key: 'M.Acc', var: 'bonusMAcc' },
            { key: 'Eva', var: 'bonusEva' },
            { key: 'P.Eva', var: 'bonusEva' },
            { key: 'MEva', var: 'bonusMEva' },
            { key: 'M.Eva', var: 'bonusMEva' },
            { key: '물리공격력', var: 'modPAtk' },
            { key: '마법공격력', var: 'modMAtk' },
            { key: '물리방어력', var: 'modPDef' },
            { key: '마법방어력', var: 'modMDef' },
            { key: '물리 공격력', var: 'modPAtk' },
            { key: '마법 공격력', var: 'modMAtk' },
            { key: '물리 방어력', var: 'modPDef' },
            { key: '마법 방어력', var: 'modMDef' },
            { key: '물리명중률', var: 'bonusAcc' },
            { key: '마법명중률', var: 'bonusMAcc' },
            { key: '물리회피율', var: 'bonusEva' },
            { key: '마법회피율', var: 'bonusMEva' },
            { key: '물리 명중률', var: 'bonusAcc' },
            { key: '마법 명중률', var: 'bonusMAcc' },
            { key: '물리 회피율', var: 'bonusEva' },
            { key: '마법 회피율', var: 'bonusMEva' },
            { key: 'ATK', var: 'bothAtk' },
            { key: '공격력', var: 'bothAtk' }
        ];

        derivedBuffs.forEach(db => {
            const regex = new RegExp(`(?:^|[^a-zA-Z가-힣])${db.key.replace('.', '\\.')}\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
            const match = effectStr.match(regex);
            if (match) {
                const val = parseFloat(match[1]);
                if (db.var === 'modPAtk') rawModPAtkList.push(val / 100);
                else if (db.var === 'modMAtk') rawModMAtkList.push(val / 100);
                else if (db.var === 'bothAtk') { rawModPAtkList.push(val / 100); rawModMAtkList.push(val / 100); }
                else if (db.var === 'modPDef') rawModPDefList.push(val / 100);
                else if (db.var === 'modMDef') rawModMDefList.push(val / 100);
                else if (db.var === 'bonusAcc') rawBonusAccList.push(val);
                else if (db.var === 'bonusMAcc') rawBonusMAccList.push(val);
                else if (db.var === 'bonusEva') rawBonusEvaList.push(val);
                else if (db.var === 'bonusMEva') rawBonusMEvaList.push(val);
            }
        });

        // [NEW] 속성 피해/저항 버프 파싱
        SHINRYOKU_TYPES_LIST.forEach(type => {
            const shortType = type.replace('계', '');
            if (effectStr.includes(type) || effectStr.includes(shortType)) {
                const resRegex = new RegExp(`(?:${type}|${shortType})\\s*(?:저항|내성|방어|속성\\s*저항)\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
                const resMatch = effectStr.match(resRegex);
                if (resMatch) {
                    if (!elementalResMap[type]) elementalResMap[type] = [];
                    elementalResMap[type].push(parseFloat(resMatch[1]) / 100);
                }
                const dmgRegex = new RegExp(`(?:${type}|${shortType})\\s*(?:피해|공격력|데미지|속성\\s*피해)?\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
                const dmgMatch = effectStr.match(dmgRegex);
                if (dmgMatch && !resMatch) {
                    if (!elementalAtkMap[type]) elementalAtkMap[type] = [];
                    elementalAtkMap[type].push(parseFloat(dmgMatch[1]) / 100);
                }
            }
        });

        // 모든 속성 버프
        const allDmgMatch = effectStr.match(/(?:모든\s*속성|전체\s*속성|원소)\s*(?:피해|데미지|공격력)?\s*([+-]\d+(\\.\\d+)?)%/i);
        if (allDmgMatch) {
            const val = parseFloat(allDmgMatch[1]) / 100;
            SHINRYOKU_TYPES_LIST.forEach(t => { 
                if (!elementalAtkMap[t]) elementalAtkMap[t] = [];
                elementalAtkMap[t].push(val); 
            });
        }
        const allResMatch = effectStr.match(/(?:모든\s*속성|전체\s*속성|원소)\s*(?:저항|내성|방어)\s*([+-]\d+(\\.\\d+)?)%/i);
        if (allResMatch) {
            const val = parseFloat(allResMatch[1]) / 100;
            SHINRYOKU_TYPES_LIST.forEach(t => { 
                if (!elementalResMap[t]) elementalResMap[t] = [];
                elementalResMap[t].push(val); 
            });
        }
    });

    // 동일 스탯/계열 버프 중첩 시 50% 반감 점감 적용 합산
    modPAtk += calculateDiminishingBuffSum(rawModPAtkList);
    modMAtk += calculateDiminishingBuffSum(rawModMAtkList);
    modPDef += calculateDiminishingBuffSum(rawModPDefList);
    modMDef += calculateDiminishingBuffSum(rawModMDefList);
    modAgi += calculateDiminishingBuffSum(rawModAgiList);
    modCrit += calculateDiminishingBuffSum(rawModCritList);
    bonusAcc += calculateDiminishingBuffSum(rawBonusAccList);
    bonusMAcc += calculateDiminishingBuffSum(rawBonusMAccList);
    bonusEva += calculateDiminishingBuffSum(rawBonusEvaList);
    bonusMEva += calculateDiminishingBuffSum(rawBonusMEvaList);

    SHINRYOKU_TYPES_LIST.forEach(t => {
        if (elemental[t]) {
            if (elementalAtkMap[t]) elemental[t].atk += calculateDiminishingBuffSum(elementalAtkMap[t]);
            if (elementalResMap[t]) elemental[t].res += calculateDiminishingBuffSum(elementalResMap[t]);
        }
    });

    if (weaponMastery && weaponMastery.level > 0) {
        const atkBonus = weaponMastery.level * 0.005; 
        const criterionBonus = weaponMastery.level * 0.1;
        const accMasteryBonus = Math.min(100, weaponMastery.level * 1); // 레벨당 1%, 최대 100%
        const magicTypes: WeaponType[] = ['Staff', 'Energy', 'Grimoire'];
        if (magicTypes.includes(weaponMastery.type)) {
            modMAtk += atkBonus;
            bonusMAcc += accMasteryBonus;
        } else {
            modPAtk += atkBonus;
            bonusAcc += accMasteryBonus;
        }
        modCrit += criterionBonus;
    }

    if (subMastery && subMastery.level > 0) {
        const level = subMastery.level;
        const subAccMasteryBonus = Math.min(100, level * 1); // 레벨당 1%, 최대 100%
        if (subMastery.type === 'Shield') {
            modPDef += (level * 0.005);
            modMDef += (level * 0.005);
            bonusAcc += subAccMasteryBonus;
            bonusMAcc += subAccMasteryBonus;
        } else if (subMastery.type === 'Orb') {
            modMDef += (level * 0.005);
            modCrit += (level * 0.1); 
            bonusMAcc += subAccMasteryBonus;
        } else if (subMastery.type === 'SubSword') {
            modPAtk += (level * 0.005);
            modCrit += (level * 0.1); 
            bonusAcc += subAccMasteryBonus;
        }
    }

    if (elementalSynergy) {
        const weapon = equipment?.weapon;
        const resMult = 0.5 + (weapon?.divineLevel || 0) * 0.01; // 배율 보정 (기본 1.5배이므로 0.5 더함)
        modPAtk += resMult;
        modMAtk += resMult;
    }

    if (skills) {
        // [MODIFIED] Collect all equipped weapon types
        let equippedWeaponTypes: string[] = [];
        if (equipment) {
            if (equipment.weapon) {
                const type = getWeaponTypeFromItem(equipment.weapon);
                if (type) equippedWeaponTypes.push(type);
            }
            if (equipment.subWeapon) {
                const type = getWeaponTypeFromItem(equipment.subWeapon);
                if (type) equippedWeaponTypes.push(type);
            }
        }
        if (weaponMastery?.type && !equippedWeaponTypes.includes(weaponMastery.type)) {
            equippedWeaponTypes.push(weaponMastery.type);
        }
        if (subMastery?.type && !equippedWeaponTypes.includes(subMastery.type)) {
            equippedWeaponTypes.push(subMastery.type);
        }
        const hasNoEquip = !equipment || (!equipment.weapon && !equipment.subWeapon);

        skills.forEach(skill => {
            const isPassive = skill.type === SkillType.PASSIVE || 
                String(skill.type).toUpperCase() === 'PASSIVE' || 
                String(skill.type) === '패시브' || 
                Boolean((skill as any).isPassive);

            if (isPassive) {
                const formula = skill.effectFormula || ""; 
                const skillName = skill.name || "";
                const skillDesc = skill.description || "";
                const level = skill.level || 1;
                
                const passiveScaleAdd = skill.finalEnhanceData?.passiveScaleBonus || 0;
                
                if (formula.includes('ENHANCE_ATK')) {
                    const boost = 0.5 + (level * (0.01 + (passiveScaleAdd / 100)));
                    modPAtk += boost;
                    modMAtk += boost;
                }
                if (formula.includes('ENHANCE_DEF')) {
                    const boost = 0.5 + (level * (0.01 + (passiveScaleAdd / 100)));
                    modPDef += boost;
                    modMDef += boost;
                }
                if (formula.includes('STEEL_IRON')) {
                    const boost = 50 + (level * (0.1 + (passiveScaleAdd / 10)));
                    modResist += boost;
                }

                // 1. 패시브 전투 슬롯 보너스
                if (skill.finalEnhanceData?.passiveCombatSlot) {
                    const csStat = String(skill.finalEnhanceData.passiveCombatSlot.stat || '');
                    if (csStat.includes('치명타율')) modCrit += 5;
                    else if (csStat.includes('명중률')) { bonusAcc += 5; bonusMAcc += 5; }
                    else if (csStat.includes('회피율')) { bonusEva += 5; bonusMEva += 5; }
                    else if (csStat.includes('상태이상 저항')) modResist += 5;
                    else if (csStat.includes('치명타 피해량')) bonusCritDmg += 15;
                }

                // 2. 신력 및 속성 공명 보너스 (선택한 신력 계통별 적용)
                if (skill.finalEnhanceData?.passiveElementalResonance) {
                    const elData = skill.finalEnhanceData.passiveElementalResonance;
                    const targetEl = elData.element || '모든 속성';
                    const typeStr = elData.type || '속성 피해';
                    const boostVal = (elData.value || 10) / 100;

                    const isAll = targetEl === '모든 속성' || !targetEl;
                    const isAtk = typeStr.includes('피해') || typeStr.includes('&');
                    const isRes = typeStr.includes('저항') || typeStr.includes('&');

                    SHINRYOKU_TYPES_LIST.forEach(t => {
                        if (isAll || t === targetEl || t.includes(targetEl.replace('계',''))) {
                            if (elemental[t]) {
                                if (isAtk) elemental[t].atk += boostVal;
                                if (isRes) elemental[t].res += boostVal;
                            }
                        }
                    });
                }

                // 3. 수치 한계 돌파 시 기본 스탯 보정 (모든 패시브에 대한 보편 적용)
                if (passiveScaleAdd > 0) {
                    const baseScaleBoost = (passiveScaleAdd * level) / 100;
                    modPAtk += baseScaleBoost;
                    modMAtk += baseScaleBoost;
                    modPDef += baseScaleBoost;
                    modMDef += baseScaleBoost;
                }

                // 4. 신력특수개방 계열 스킬 (번개효과, 열기효과, 재생효과 등) 전용 보너스 반영
                const isShinryokuSpecial = skillName.includes('신력') || skillDesc.includes('신력') ||
                    skillName.includes('번개') || skillName.includes('열기') || skillName.includes('재생') ||
                    skillName.includes('독성') || skillName.includes('빙결') || skillName.includes('신성') || skillName.includes('암흑') ||
                    skillDesc.includes('번개효과') || skillDesc.includes('열기효과') || skillDesc.includes('재생효과');

                if (isShinryokuSpecial && passiveScaleAdd > 0) {
                    const specBoost = (passiveScaleAdd * level) / 100;
                    if (skillName.includes('번개') || skillName.includes('뇌전') || skillDesc.includes('번개')) {
                        if (elemental['뇌전계']) { elemental['뇌전계'].atk += specBoost; elemental['뇌전계'].res += specBoost; }
                    }
                    if (skillName.includes('열기') || skillName.includes('화염') || skillDesc.includes('열기')) {
                        if (elemental['화염계']) { elemental['화염계'].atk += specBoost; elemental['화염계'].res += specBoost; }
                    }
                    if (skillName.includes('빙결') || skillName.includes('냉기') || skillDesc.includes('빙결')) {
                        if (elemental['빙설계']) { elemental['빙설계'].atk += specBoost; elemental['빙설계'].res += specBoost; }
                    }
                    if (skillName.includes('독성') || skillName.includes('암흑') || skillDesc.includes('독성')) {
                        if (elemental['암흑계']) { elemental['암흑계'].atk += specBoost; elemental['암흑계'].res += specBoost; }
                    }
                }

                // 5. 정규식 공식 파싱
                const regex = /\[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)% (?: \(\+(\d+(?:\.\d+)?)% per Lv\))?(?: \[COND: (.+)\])?/g;
                let match;
                while ((match = regex.exec(formula)) !== null) {
                    const target = match[1];
                    const basePercent = parseFloat(match[2]);
                    const scalePercent = match[3] ? parseFloat(match[3]) : 1;
                    const condition = match[4];
                    
                    if (!condition || equippedWeaponTypes.includes(condition) || skill.finalEnhanceData?.passiveConditional || hasNoEquip) {
                        const totalPercent = basePercent + ((scalePercent + passiveScaleAdd) * level);
                        
                        // 특정 속성 선택형 패시브 체크
                        const matchedType = SHINRYOKU_TYPES_LIST.find(t => target.includes(t.replace('계','')));
                        if (matchedType) {
                            if (target.includes('저항') || target.includes('Res')) {
                                elemental[matchedType].res += totalPercent / 100;
                            } else if (target.includes('피해') || target.includes('Atk')) {
                                elemental[matchedType].atk += totalPercent / 100;
                            }
                        } else {
                            // 일반 전투 스탯
                            if (target === 'CritChance' || target === '치명타율') modCrit += totalPercent;
                            else if (target === 'StatusResist'|| target === '상태이상 저항' || target === '상태이상저항') modResist += totalPercent;
                            else if (target === 'CritDmgResist' || target === '치명타 피해 감소') bonusCritDmgResist += totalPercent;
                            else if (target === 'CritResist' || target === '치명타 저항' || target === '치명타저항') bonusCritResist += totalPercent;
                            else if (target === 'CritDamage' || target === '치명타 피해량') bonusCritDmg += totalPercent;
                            else if (target === 'Acc' || target === '물리명중률' || target === '물리 명중률' || target === 'P.Acc') bonusAcc += totalPercent;
                            else if (target === 'MAcc' || target === '마법명중률' || target === '마법 명중률' || target === 'M.Acc') bonusMAcc += totalPercent;
                            else if (target === 'Eva' || target === '물리회피율' || target === '물리 회피율' || target === 'P.Eva') bonusEva += totalPercent;
                            else if (target === 'MEva' || target === '마법회피율' || target === '마법 회피율' || target === 'M.Eva') bonusMEva += totalPercent;
                            else if (target === 'P.Atk' || target === 'PAtk' || target === '물리공격력' || target === '물리 공격력' || target === '공격력') modPAtk += totalPercent / 100;
                            else if (target === 'M.Atk' || target === 'MAtk' || target === '마법공격력' || target === '마법 공격력') modMAtk += totalPercent / 100;
                            else if (target === 'P.Def' || target === 'PDef' || target === '물리방어력' || target === '물리 방어력' || target === '방어력') modPDef += totalPercent / 100;
                            else if (target === 'M.Def' || target === 'MDef' || target === '마법방어력' || target === '마법 방어력') modMDef += totalPercent / 100;
                        }
                    }
                }
            }
        });
    }


    // [NEW] 전투 역할 기반 보너스 적용 (1차, 2차 세부 역할, 올라운더)
    if (secondaryBattleRole && secondaryBattleRole !== SecondaryBattleRole.NONE) {
        if (secondaryBattleRole === SecondaryBattleRole.PHYSICAL_DEALER) {
            modPAtk += 0.10;
            bonusAcc += 10;
        } else if (secondaryBattleRole === SecondaryBattleRole.MAGIC_DEALER) {
            modMAtk += 0.10;
            bonusMAcc += 10;
        } else if (secondaryBattleRole === SecondaryBattleRole.PURE_TANKER) {
            modPDef += 0.12;
            modMDef += 0.12;
        } else if (secondaryBattleRole === SecondaryBattleRole.DEALING_TANKER) {
            modPDef += 0.06;
            modMDef += 0.06;
            modPAtk += 0.06;
            bonusAcc += 6;
        } else if (secondaryBattleRole === SecondaryBattleRole.SAVE_TANKER) {
            modPDef += 0.08;
            modMDef += 0.08;
            modResist += 8;
        } else if (secondaryBattleRole === SecondaryBattleRole.HEALER) {
            // 회복 효과 +8% (스킬 회복량 계산 시 반영)
        } else if (secondaryBattleRole === SecondaryBattleRole.BUFFER) {
            modPAtk += 0.02; // 동료 물공/마공 +2% 지원
            modMAtk += 0.02;
        } else if (secondaryBattleRole === SecondaryBattleRole.DEBUFFER) {
            bonusMAcc += 8; // 마법 명중 및 제어 적중 보정
        } else if (secondaryBattleRole === SecondaryBattleRole.ALLROUNDER) {
            modPAtk += 0.04;
            modMAtk += 0.04;
            modPDef += 0.04;
            modMDef += 0.04;
            bonusAcc += 4;
            bonusMAcc += 4;
        }
    } else if (battleRole) {
        if (battleRole === BattleRole.DEALER) { // 딜러
            modPAtk += 0.08; // 공격력 +8%
            modMAtk += 0.08;
            bonusAcc += 8;   // 명중률 +8%
            bonusMAcc += 8;
        } else if (battleRole === BattleRole.TANKER) { // 탱커
            modPDef += 0.10; // 물리 방어력 +10%
            modMDef += 0.10; // 마법 방어력 +10%
        } else if (battleRole === BattleRole.ALLROUNDER) { // 올라운더
            modPAtk += 0.04;
            modMAtk += 0.04;
            modPDef += 0.04;
            modMDef += 0.04;
            bonusAcc += 4;
            bonusMAcc += 4;
        } else if (battleRole === BattleRole.SUPPORTER) { // 서포터
            // MP 회복량 1%는 라운드 종료 시 MP 회복 로직에서 처리
        }
    }

    const agi = s('agi') * modAgi;
   
    const str = s('str');
    const int = s('int');
    const wis = s('wis');
    const def = s('def');

    // 최종 파생 스탯 계산 (Base + Flat) * Multiplier
    const pAtk = ((str * 1.0) + (agi * 0.3) + flatPAtk) * modPAtk;
    const mAtk = ((int * 1.0) + (wis * 0.3) + flatMAtk) * modMAtk;
    const pDef = (def * 0.8 + flatPDef) * modPDef;
    const mDef = ((def * 0.4) + (wis * 0.4) + flatMDef) * modMDef;
    
    // [NEW] 치명타 피해량 계산 로직 구현
    // 기본: 1.4 + (CTRL / 1,000,000) * 1.1. CTRL 100만 도달 시 최대 2.5배.
    const statCritDamage = Math.min(2.5, 1.4 + (ctrl / 1000000) * 1.1);
    // 장비 보너스 합산 (예: 치명타 피해량 +20% -> 0.2 더함)
    const critDamage = statCritDamage + (bonusCritDmg / 100);
    const baseCrit = 5 + (ctrl * 0.000001) + (agi * 0.000001);
    const criterionChance = Math.min(100, Math.max(0, baseCrit + modCrit));
    
    const statusResist = Math.min(100, (ctrl / (ctrl + 10000)) * 100 + modResist);

    const comprehensiveBonus = ((stats.str + stats.int + stats.wis + stats.def + stats.agi + stats.ctrl) / 6) * 0.005;
    
    // 기초 명중률 및 회피율 스탯
    const baseAcc = 85 + (stats.agi * 0.01) + (stats.str * 0.005) + comprehensiveBonus;
    const baseEva = (stats.agi * 0.0075) + (stats.wis * 0.0035);
    const baseMAcc = 85 + (stats.wis * 0.01) + (stats.int * 0.005) + comprehensiveBonus;
    const baseMEva = (stats.wis * 0.0075) + (stats.agi * 0.0035);

    // 곱연산 배율 적용 (기초 스탯 × (1 + 명중/회피 보너스% / 100))
    const accuracy = Math.max(1, baseAcc * (1 + (bonusAcc / 100)));
    const evasion = Math.max(0, baseEva * (1 + (bonusEva / 100)));
    const mAccuracy = Math.max(1, baseMAcc * (1 + (bonusMAcc / 100)));
    const mEvasion = Math.max(0, baseMEva * (1 + (bonusMEva / 100)));
    const critDmgResist = Math.min(95, bonusCritDmgResist); // [NEW] 치명타 피해 감소 (장비 및 특화 등 옵션 전용)
    const critResist = Math.min(100, Math.max(0, bonusCritResist)); // [NEW] 치명타 저항

    return {
        pAtk: isNaN(pAtk) ? 0 : pAtk,
        mAtk: isNaN(mAtk) ? 0 : mAtk,
        pDef: isNaN(pDef) ? 0 : pDef,
        mDef: isNaN(mDef) ? 0 : mDef,
        critChance: isNaN(criterionChance) ? 0 : criterionChance,
        critDamage: isNaN(critDamage) ? 1.4 : critDamage,
        critDmgResist: isNaN(critDmgResist) ? 0 : critDmgResist,
        critResist: isNaN(critResist) ? 0 : critResist,
        statusResist: isNaN(statusResist) ? 0 : statusResist,
        accuracy: isNaN(accuracy) ? 95 : accuracy,
        evasion: isNaN(evasion) ? 0 : evasion,
        mAccuracy: isNaN(mAccuracy) ? 95 : mAccuracy, // [NEW]
        mEvasion: isNaN(mEvasion) ? 0 : mEvasion, 
        elemental, // [NEW] 반환값에 속성 데이터 포함      // [NEW]
        mythicOptions, // [NEW]
        combatStyleBonus: combatStyleBonusApplied, // [NEW]
        ctrlPenetration: calculateControlPenetration(ctrl),
        ctrlResist: calculateControlResistance(ctrl)
    };
};

export const calculateDebuffSuccessRate = (attackerStats: Stats | any, targetStats: Stats | any, skillLevel: number = 1, attackerSkills?: Skill[], ailmentName?: string): number => {
    // 장비 최종 능력치(finalStats) 자동 추출
    let realAttackerStats: Stats = attackerStats;
    if (attackerStats) {
        if ('equipment' in attackerStats || 'equipmentOptions' in attackerStats) {
            try {
                realAttackerStats = calculateFinalStats(attackerStats).finalStats;
            } catch {
                realAttackerStats = attackerStats.stats || attackerStats;
            }
        } else if ('stats' in attackerStats && attackerStats.stats) {
            realAttackerStats = attackerStats.stats;
        }
    }

    let realTargetStats: Stats = targetStats;
    if (targetStats) {
        if ('equipment' in targetStats || 'equipmentOptions' in targetStats) {
            try {
                realTargetStats = calculateFinalStats(targetStats).finalStats;
            } catch {
                realTargetStats = targetStats.stats || targetStats;
            }
        } else if ('stats' in targetStats && targetStats.stats) {
            realTargetStats = targetStats.stats;
        }
    }

    if (attackerSkills && ailmentName === '빙결') {
        const hasIceDeep = attackerSkills.some(s => s.type === SkillType.PASSIVE && (s.effectFormula || "").includes('ICE_DEEP'));
        if (hasIceDeep) {
            return 100;
        }
    }

    const base = 70;
    const atkCtrl = Math.max(0, realAttackerStats?.ctrl || 0);
    const defCtrl = Math.max(0, realTargetStats?.ctrl || 0);
    const lvlBonus = (skillLevel || 1) * 0.5;
    
    // 1. 공격자 통제력(장비 최종 스탯) 보너스 곡선: 최대 +30%
    const atkBonus = 30 * (atkCtrl / (atkCtrl + 500));

    // 2. 대상 통제력 저항 하강 곡선: 단순 뺄셈이 아닌 점감 하강 곡선 적용
    // 적 통제력이 시전자 대비 압도적일 경우 점진적으로 0%까지 수렴
    const effectiveAtk = atkCtrl * 1.5 + 300;
    const resistRate = defCtrl / (defCtrl + effectiveAtk);
    
    // 저항율에 따라 성공률이 부드러운 하강 곡선을 그림
    const rawRate = (base + atkBonus + lvlBonus) * (1 - resistRate);
    
    return adjustDebuffRateWithControl(rawRate, atkCtrl, defCtrl);
};
export const calculateStatusChance = (baseChance: number, targetStats: Stats): number => {
    const resist = (targetStats.ctrl / (targetStats.ctrl + 10000)) * 100;
    const finalChance = baseChance * (100 - resist) / 100;
    return Math.max(0, Math.min(100, finalChance));
};

const ATTACK_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.5,
    [ClassTier.FIRST]: 1.0,
    [ClassTier.SECOND]: 5.0,
    [ClassTier.LAST]: 20.0,
    [ClassTier.FINAL]: 100.0,
};

export const getActorDerivedStats = (actor: Character | Companion | Enemy): DerivedStats => {
    const finalStats = calculateFinalStats(actor).finalStats;
    const role = getEffectiveBattleRole(actor);
    const secRole = getEffectiveSecondaryBattleRole(actor);
    let masteryInfo: { level: number, type: WeaponType } | undefined;
    let subMasteryInfo: { level: number, type: WeaponType } | undefined;

    if ('equipment' in actor && 'weaponMastery' in actor) {
        const weapon = actor.equipment?.weapon;
        const subWeapon = actor.equipment?.subWeapon;
        if (weapon) {
            const wType = getWeaponTypeFromItem(weapon);
            if (wType && actor.weaponMastery?.[wType]) {
                masteryInfo = { level: actor.weaponMastery[wType]!.level, type: wType };
            }
        }
        if (subWeapon) {
            const subType = getWeaponTypeFromItem(subWeapon);
            if (subType && actor.weaponMastery?.[subType]) {
                subMasteryInfo = { level: actor.weaponMastery[subType]!.level, type: subType };
            }
        }
    }

    return calculateDerivedStats(
        finalStats,
        actor.statusEffects || [],
        masteryInfo,
        subMasteryInfo,
        false,
        'skills' in actor ? actor.skills : undefined,
        'equipment' in actor ? actor.equipment : undefined,
        (actor as any).shinryokuType,
        (actor as any).affection,
        undefined,
        (actor as any).base?.elementalDamageBoosts,
        (actor as any).base?.elementalResistanceBoosts,
        (actor as any).battlePosition, // [NEW]
        (actor as any).combatStyle, // [NEW] 전투 계열
        role, // [NEW] 전투 역할 보너스
        secRole // [NEW] 2차 전투 역할 보너스
    );
};

export const calculateDamage = (
    attacker: Character | Companion | Enemy,
    target: Character | Companion | Enemy,
    skill?: Skill,
    character?: Character
): { damage: number, isCrit: boolean, isMiss: boolean, isNullified?: boolean, affinityEffect: string, additionalDamage: { damage: number, log: string }[], attackerMythicOptions: (MythicOptionType | MagyeOptionType)[], targetMythicOptions: (MythicOptionType | MagyeOptionType)[] } => {
    try {
        const atkStats = calculateTotalStats(attacker).total;
        const defStats = calculateTotalStats(target).total;
        
        let masteryInfo: { level: number, type: WeaponType } | undefined;
        let subMasteryInfo: { level: number, type: WeaponType } | undefined;
        let elementalSynergy = false;

        const atkEquip = 'equipment' in attacker ? attacker.equipment : undefined;
        const atkSkills = 'skills' in attacker ? attacker.skills : undefined;

        if ('equipment' in attacker && 'weaponMastery' in attacker) {
            const weapon = attacker.equipment?.weapon;
            const subWeapon = attacker.equipment?.subWeapon;
            if (weapon) {
                const wType = getWeaponTypeFromItem(weapon);
                if (wType && attacker.weaponMastery?.[wType]) {
                    masteryInfo = { level: attacker.weaponMastery[wType]!.level, type: wType };
                }
                if (weapon.elementalType && (attacker as any).shinryokuType === weapon.elementalType) {
                    elementalSynergy = true;
                }
            }
            if (subWeapon) {
                const subType = getWeaponTypeFromItem(subWeapon);
                if (subType && attacker.weaponMastery?.[subType]) {
                    subMasteryInfo = { level: attacker.weaponMastery[subType]!.level, type: subType };
                }
            }
        }

        const atkFinal = calculateFinalStats(attacker).finalStats;
        const defFinal = calculateFinalStats(target).finalStats;
        const levelDiff = attacker.level - target.level;
        const bonusPerLevel = 1;     // 레벨 1당 2%
        const maxBonus = 10;         // 최대 20%

        let levelBonus = levelDiff * bonusPerLevel;

        // 상한/하한 제한
        levelBonus = Math.max(-5, Math.min(maxBonus, levelBonus));

        // [MODIFIED] 인연 버프 및 호감도 보너스 계산
        const affection = ('affection' in attacker) ? (attacker as Companion).affection : undefined;
        let bondBonus: number | undefined;
        if ('companions' in attacker) {
            bondBonus = getBondBonus(attacker as Character);
        } else if ('affection' in attacker && character) {
            bondBonus = getBondBonus(character, attacker as Companion);
        }

        const atkDerived = calculateDerivedStats(
            atkFinal, 
            attacker.statusEffects || [], 
            masteryInfo, 
            subMasteryInfo, 
            elementalSynergy, 
            atkSkills, 
            atkEquip,
            (attacker as any).shinryokuType,
            affection,
            bondBonus,
            (attacker as any).base?.elementalDamageBoosts,
            (attacker as any).base?.elementalResistanceBoosts,
            (attacker as any).battlePosition,
            (attacker as any).combatStyle
        );
        const defDerived = calculateDerivedStats(
            defFinal, 
            target.statusEffects || [], 
            undefined, undefined, false, 
            'skills' in target ? target.skills : undefined, 
            'equipment' in target ? target.equipment : undefined,
            (target as any).shinryokuType,
            undefined,
            undefined,
            (target as any).base?.elementalDamageBoosts,
            (target as any).base?.elementalResistanceBoosts,
            (target as any).battlePosition,
            (target as any).combatStyle
        );

           // [MODIFIED] 마법 스킬인 경우 마법 전용 명중률과 회피율 사용
        let hitChance = 95;
        const hasEvaIgnore = atkDerived.mythicOptions.includes(MythicOptionType.EVA_IGNORE);
        
        if (hasEvaIgnore) {
            hitChance = 100;
        } else if (skill && skill.type === SkillType.MAGIC) {
            hitChance = Math.max(5, Math.min(98, (atkDerived.mAccuracy - defDerived.mEvasion) + levelBonus));
        } else {
            hitChance = Math.max(5, Math.min(98, (atkDerived.accuracy - defDerived.evasion) + levelBonus));
        }
        const isHit = hasEvaIgnore || Math.random() * 100 < hitChance;

        if (!isHit) {
            return { 
                damage: 0, 
                isCrit: false, 
                isMiss: true, 
                affinityEffect: "", 
                additionalDamage: [],
                attackerMythicOptions: atkDerived.mythicOptions,
                targetMythicOptions: defDerived.mythicOptions
            };
        }

        const getStat = (s: Stats, key: keyof Stats) => Number(s[key]) || 0;
        const str = getStat(atkFinal, 'str');
        const agi = getStat(atkFinal, 'agi');
        const ctrl = getStat(atkFinal, 'ctrl');

        let atkType = (attacker as any).shinryokuType || "무속성";
        if (skill) {
            atkType = skill.shinryokuType || (attacker as any).shinryokuType || "무속성";
        }
        const defType = (target as any).shinryokuType || "무속성";
          let elementalMult = 1.0;
        let affinityMult = 1.0;
        let affinityEffect = "";
         // 1. 공격자의 해당 속성 Atk 수치
    const atkAtkVal = atkDerived.elemental[atkType]?.atk || 1.0;
    // 2. 피격자의 해당 속성 Res 수치
    const defResVal = defDerived.elemental[atkType]?.res || 1.0;
    // 3. 속성 배율 산출
    elementalMult = atkAtkVal / defResVal;
        // 4. 상성 보너스 (기존 로직 유지)
    if (SHINRYOKU_AFFINITY[atkType]) {
        if (SHINRYOKU_AFFINITY[atkType].strong.includes(defType)) { elementalMult *= 1.5; affinityEffect = ` (상성 유리: ${atkType})`; }
        else if (SHINRYOKU_AFFINITY[atkType].weak.includes(defType)) { elementalMult *= 0.5; affinityEffect = ` (상성 불리: ${atkType})`; }
    }


        if (atkSkills) {
            atkSkills.forEach(s => {
                const formula = s.effectFormula || "";
                if (s.type === SkillType.PASSIVE && formula.includes('RADIANT_JUDGE') && defType === '암흑계') {
                    const isFinal = s.tier === ClassTier.FINAL;
                    const bonus = isFinal ? 0.5 : 0.25;
                    const lvlBonus = (s.level || 1) * 0.001;
                    affinityMult += (bonus + lvlBonus);
                }
            });
        }

        // 방어자의 치명타 저항(critResist)으로 공격자의 치명타 확률 차감 (최대 100%, 최소 5% 치명타율 보장)
        const targetCritResist = Math.min(100, Math.max(0, (target as any).critResist !== undefined ? (target as any).critResist : (defDerived.critResist || 0)));
        const finalCritChance = Math.max(5, atkDerived.critChance - targetCritResist);
        const isCrit = Math.random() * 100 < finalCritChance;
        let cliffMult = 1.0;
        if (isCrit) {
            const targetCritDmgResist = (target as any).critDmgResist !== undefined ? (target as any).critDmgResist : (defDerived.critDmgResist || 0);
            const resistFactor = Math.min(1.0, targetCritDmgResist / 100);
            // 최종 치명타 배율 = 1.0 + ((공격자의 치명타 피해량 - 1.0) * (1 - 방어자의 치명타 피해 감소율))
            cliffMult = 1.0 + ((atkDerived.critDamage - 1.0) * (1 - resistFactor));
            cliffMult = Math.max(1.0, cliffMult); // 최소 1.0배 보장
        }
        
        const randomMult = 0.95 + Math.random() * 0.1;
        const ctrlAmp = (ctrl / 100);

        if (atkType === '암흑계' && target.statusEffects?.some(e => e.name === "암흑")) {
            affinityMult *= 1.2;
        }

        // [NEW] 통합된 외교/상성/속성 배율 적용
        const finalMult = elementalMult * affinityMult;

        // [NEW] Mythic Option: NULLIFY (피해 무효화)
        // 20% 확률로 피해 0 처리 (기존 10%에서 상향)
        if (defDerived.mythicOptions.includes(MythicOptionType.NULLIFY) || defDerived.mythicOptions.includes(MagyeOptionType.NULLIFY)) {
            if (Math.random() < 0.2) {
                return { 
                    damage: 0, 
                    isCrit: false, 
                    isMiss: false, 
                    isNullified: true,
                    affinityEffect: " (피해 무효화!)", 
                    additionalDamage: [],
                    attackerMythicOptions: atkDerived.mythicOptions,
                    targetMythicOptions: defDerived.mythicOptions
                };
            }
        }

        // [NEW] Magye Option: INSTANT_DEATH (즉사)
        if (atkDerived.mythicOptions.includes(MagyeOptionType.INSTANT_DEATH)) {
            if (Math.random() < 0.01) { // 1% chance
                return { 
                    damage: target.stats?.hp || (target as any).hp || 999999, 
                    isCrit: true, 
                    isMiss: false, 
                    affinityEffect: " (즉사 발동!)", 
                    additionalDamage: [],
                    attackerMythicOptions: atkDerived.mythicOptions,
                    targetMythicOptions: defDerived.mythicOptions
                };
            }
        }

        let damage = 0;
        const additionalDamage: { damage: number, log: string }[] = [];

        const hasDefIgnore = atkDerived.mythicOptions.includes(MythicOptionType.DEF_IGNORE);

        if (!skill || skill.type === SkillType.PHYSICAL) {
            if (!skill) {
                const basePower = atkDerived.pAtk;
                const attackTerm = basePower * cliffMult * finalMult * randomMult;
                const targetDef = hasDefIgnore ? 0 : getEffectiveDefenseWithControl(defDerived.pDef, ctrl, Number(defFinal.ctrl) || 0).effectiveDef;
                damage = attackTerm - targetDef;
            } else {
                const effectiveAtk = Math.max(1, atkDerived.pAtk);
                let targetDef = hasDefIgnore ? 0 : getEffectiveDefenseWithControl(defDerived.pDef, ctrl, Number(defFinal.ctrl) || 0).effectiveDef;
                
                // 특수 방어 관통 적용
                const armorPenPercent = (skill.finalEnhanceData?.armorPenetration || 0) || (() => {
                    const match = skill.effectFormula?.match(/특수 방어 관통 \+(\d+)%/);
                    return match ? parseInt(match[1]) : 0;
                })();
                if (armorPenPercent > 0 && targetDef > 0) {
                    targetDef = Math.max(0, targetDef * (1 - armorPenPercent / 100));
                }

                // [분모 완충 공식] (공격력 * 2) / (공격력 + 방어력) -> 방어력이 압도적으로 높으면 최소 1데미지까지 감소
                const defRatio = hasDefIgnore ? 2.0 : Math.min(2.0, (effectiveAtk * 2) / (effectiveAtk + targetDef));

                let basePower = atkDerived.pAtk;
                const effectiveTier = ((skill as any).isBondSkill || skill.tier === ClassTier.BOND || (skill.tier as any) === '인연' || (skill.tier as any) === '인연스킬')
                    ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                    : skill.tier;
                const scaleBonus = (skill.finalEnhanceData?.levelScaleBonus || 0) || (() => {
                    const match = skill.effectFormula?.match(/계수 한계 돌파 \+(\d+)%/);
                    return match ? parseInt(match[1]) : 0;
                })();
                const baseScale = (effectiveTier ? (ATTACK_SCALING[effectiveTier] || 1.0) : 1.0) + scaleBonus;
                const scale = isAttackSkillWithBuff(skill) ? (baseScale * 0.5) : baseScale;
                let ratio = ((skill.powerRatio || 100) + ((skill.level || 1) * scale)) / 100;

               // [NEW] 몬스터 및 보스 스킬 데미지 계수 리밸런싱
                const isMonsterAttacker = ('isMonster' in attacker) || ('specialLoot' in attacker) || ('title' in attacker) || (!('companions' in attacker) && !('job' in attacker));
                if (isMonsterAttacker && !(skill as any).isBondSkill) {
                    const isSeasonMonster = isMythicSeasonalBoss(attacker);
                    const isBossMonster = isSeasonMonster || Boolean((attacker as any).isBoss || (attacker as any).isBossMonster || (attacker as any).bossData || ('specialLoot' in attacker) || ('title' in attacker && (attacker as any).title) || (attacker.name && String(attacker.name).includes('[BOSS]')));
                    const isAoeSkill = skill.targetType === 'aoe' || (skill as any).isAoe || Boolean(skill.description?.includes('전체') || skill.description?.includes('모든 적'));

                    let maxCap = 1.8;
                    if (isSeasonMonster) {
                        maxCap = isAoeSkill ? 2.0 : 3.0; // 시즌 몬스터: 최고 단일기 300 (3.0), AOE 기술 200 (2.0)
                    } else if (isBossMonster) {
                        maxCap = isAoeSkill ? 1.5 : 2.5; // 보스 몬스터: 평타 대비 최고 단일기 250 (2.5), AOE 기술 150 (1.5)
                    } else {
                        maxCap = isAoeSkill ? 1.0 : 1.8; // 일반 몬스터: 평타 대비 최고 단일기 180 (1.8), AOE 기술 100 (1.0)
                    }

                    ratio = Math.min(maxCap, ratio);
                }


                // [NEW] Bond Skill Calculation
                if ((skill as any).isBondSkill) {
                    const bs = skill as BondSkill;
                    const playerChar = ('companions' in attacker) ? (attacker as Character) : character;
                    const comp = playerChar?.companions?.find(c => c.id === bs.companionId || c.name === bs.companionName) || 
                                 (!('companions' in attacker) && !('isMonster' in attacker) ? (attacker as Companion) : undefined);
                    
                    if (playerChar && comp) {
                        let playerDerived = atkDerived;
                        if (!('companions' in attacker)) {
                            const playerFinal = calculateFinalStats(playerChar).finalStats;
                            playerDerived = calculateDerivedStats(
                                playerFinal,
                                playerChar.statusEffects || [],
                                undefined, undefined, false,
                                playerChar.skills,
                                playerChar.equipment,
                                playerChar.shinryokuType,
                                undefined, undefined,
                                playerChar.base?.elementalDamageBoosts,
                                playerChar.base?.elementalResistanceBoosts,
                                playerChar.battlePosition,
                                playerChar.combatStyle
                            );
                        }
                        
                        let compDerived = atkDerived;
                        if ('companions' in attacker) {
                            const compFinal = calculateFinalStats(comp).finalStats;
                            compDerived = calculateDerivedStats(
                                compFinal,
                                comp.statusEffects || [],
                                undefined, undefined, false,
                                comp.skills,
                                comp.equipment,
                                comp.shinryokuType,
                                undefined, undefined,
                                comp.base?.elementalDamageBoosts,
                                comp.base?.elementalResistanceBoosts,
                                comp.battlePosition,
                                comp.combatStyle
                            );
                        }
                        
                        const pAtk = playerDerived.pAtk;
                        const mAtk = playerDerived.mAtk;
                        const cpAtk = compDerived.pAtk;
                        const cmAtk = compDerived.mAtk;
                        
                        const pStat = bs.playerSkillType === SkillType.PHYSICAL ? pAtk : mAtk;
                        const cStat = bs.companionSkillType === SkillType.PHYSICAL ? cpAtk : cmAtk;
                        
                        basePower = 1;
                        ratio = (pStat + cStat) * (bs.powerRatio / 200);
                    }
                }
                
                let statusMult = 1.0;
                if (attacker.statusEffects?.some(e => e.name === "공포" || e.name === "소멸")) statusMult *= 0.8;

                const rawDamage = (basePower * statusMult * ratio + ctrlAmp) * cliffMult * finalMult * defRatio;
                damage = rawDamage * randomMult;
            }

        } else if (skill.type === SkillType.MAGIC) {
            const effectiveAtk = Math.max(1, atkDerived.mAtk);
            let targetDef = hasDefIgnore ? 0 : getEffectiveDefenseWithControl(defDerived.mDef, ctrl, Number(defFinal.ctrl) || 0).effectiveDef;
            
            // 특수 방어 관통 적용
            const armorPenPercent = (skill.finalEnhanceData?.armorPenetration || 0) || (() => {
                const match = skill.effectFormula?.match(/특수 방어 관통 \+(\d+)%/);
                return match ? parseInt(match[1]) : 0;
            })();
            if (armorPenPercent > 0 && targetDef > 0) {
                targetDef = Math.max(0, targetDef * (1 - armorPenPercent / 100));
            }

            // [분모 완충 공식] (마법 공격력 * 2) / (마법 공격력 + 마법 방어력) -> 마방이 압도적이면 최소 1데미지까지 감소
            const defRatio = hasDefIgnore ? 2.0 : Math.min(2.0, (effectiveAtk * 2) / (effectiveAtk + targetDef));

            let basePower = atkDerived.mAtk; 
            const effectiveTier = ((skill as any).isBondSkill || skill.tier === ClassTier.BOND || (skill.tier as any) === '인연' || (skill.tier as any) === '인연스킬')
                ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                : skill.tier;
            const scaleBonus = (skill.finalEnhanceData?.levelScaleBonus || 0) || (() => {
                const match = skill.effectFormula?.match(/계수 한계 돌파 \+(\d+)%/);
                return match ? parseInt(match[1]) : 0;
            })();
            const baseScale = (effectiveTier ? (ATTACK_SCALING[effectiveTier] || 1.0) : 1.0) + scaleBonus;
            const scale = isAttackSkillWithBuff(skill) ? (baseScale * 0.5) : baseScale;
            let ratio = ((skill.powerRatio || 100) + ((skill.level || 1) * scale)) / 100;

            // [NEW] 몬스터 및 보스 스킬 데미지 계수 리밸런싱 (마법)
            const isMonsterAttacker = ('isMonster' in attacker) || ('specialLoot' in attacker) || ('title' in attacker) || (!('companions' in attacker) && !('job' in attacker));
            if (isMonsterAttacker && !(skill as any).isBondSkill) {
                const isSeasonMonster = isMythicSeasonalBoss(attacker);
                const isBossMonster = isSeasonMonster || Boolean((attacker as any).isBoss || (attacker as any).isBossMonster || (attacker as any).bossData || ('specialLoot' in attacker) || ('title' in attacker && (attacker as any).title) || (attacker.name && String(attacker.name).includes('[BOSS]')));
                const isAoeSkill = skill.targetType === 'aoe' || (skill as any).isAoe || Boolean(skill.description?.includes('전체') || skill.description?.includes('모든 적'));

                let maxCap = 1.8;
                if (isSeasonMonster) {
                    maxCap = isAoeSkill ? 2.0 : 3.0; // 시즌 몬스터: 최고 단일기 300 (3.0), AOE 기술 200 (2.0)
                } else if (isBossMonster) {
                    maxCap = isAoeSkill ? 1.5 : 2.5; // 보스 몬스터: 평타 대비 최고 단일기 250 (2.5), AOE 기술 150 (1.5)
                } else {
                    maxCap = isAoeSkill ? 1.0 : 1.8; // 일반 몬스터: 평타 대비 최고 단일기 180 (1.8), AOE 기술 100 (1.0)
                }

                ratio = Math.min(maxCap, ratio);
            }

            // [NEW] Bond Skill Calculation
            if ((skill as any).isBondSkill) {
                const bs = skill as BondSkill;
                const playerChar = ('companions' in attacker) ? (attacker as Character) : character;
                const comp = playerChar?.companions?.find(c => c.id === bs.companionId || c.name === bs.companionName) || 
                             (!('companions' in attacker) && !('isMonster' in attacker) ? (attacker as Companion) : undefined);
                
                if (playerChar && comp) {
                    let playerDerived = atkDerived;
                    if (!('companions' in attacker)) {
                        const playerFinal = calculateFinalStats(playerChar).finalStats;
                        playerDerived = calculateDerivedStats(
                            playerFinal,
                            playerChar.statusEffects || [],
                            undefined, undefined, false,
                            playerChar.skills,
                            playerChar.equipment,
                            playerChar.shinryokuType,
                            undefined, undefined,
                            playerChar.base?.elementalDamageBoosts,
                            playerChar.base?.elementalResistanceBoosts,
                            playerChar.battlePosition,
                            playerChar.combatStyle
                        );
                    }
                    
                    let compDerived = atkDerived;
                    if ('companions' in attacker) {
                        const compFinal = calculateFinalStats(comp).finalStats;
                        compDerived = calculateDerivedStats(
                            compFinal,
                            comp.statusEffects || [],
                            undefined, undefined, false,
                            comp.skills,
                            comp.equipment,
                            comp.shinryokuType,
                            undefined, undefined,
                            comp.base?.elementalDamageBoosts,
                            comp.base?.elementalResistanceBoosts,
                            comp.battlePosition,
                            comp.combatStyle
                        );
                    }
                    
                    const pAtk = playerDerived.pAtk;
                    const mAtk = playerDerived.mAtk;
                    const cpAtk = compDerived.pAtk;
                    const cmAtk = compDerived.mAtk;
                    
                    const pStat = bs.playerSkillType === SkillType.PHYSICAL ? pAtk : mAtk;
                    const cStat = bs.companionSkillType === SkillType.PHYSICAL ? cpAtk : cmAtk;
                    
                    basePower = 1;
                    ratio = (pStat + cStat) * (bs.powerRatio / 200);
                }
            }

            const rawDamage = (basePower * ratio + ctrlAmp) * cliffMult * finalMult * defRatio;
            damage = rawDamage * randomMult;
        } else {
            damage = 0;
        }

        // [신력 특수 패시브 추가 피해: 스킬 이름이 아닌 effectFormula(적용 공식) 코드를 바탕으로 정확히 인식]
        if (atkSkills && (!skill || skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC)) {
            atkSkills.forEach(s => {
                if (s.type === SkillType.PASSIVE || (s.type as any) === '패시브') {
                    const level = s.level || 1;
                    const formula = s.effectFormula || "";
                    
                    if (formula.includes('ELEC_THUNDER')) {
                        const ratio = 0.20 + (level * 0.01);
                        const extraDmgVal = (atkDerived.pAtk + (atkFinal.agi || 0)) * ratio;
                        const finalExtra = Math.max(1, Math.floor(extraDmgVal));
                        additionalDamage.push({
                            damage: finalExtra,
                            log: `[시스템 ${target.name} HP -${finalExtra} / 패시브 스킬 ${s.name} 낙뢰효과 추가피해]`
                        });
                    }

                    if (formula.includes('EARTH_QUAKE')) {
                        const ratio = 0.20 + (level * 0.01);
                        const extraDmgVal = ((atkFinal.def || 0) + (atkFinal.str || 0)) * ratio;
                        const finalExtra = Math.max(1, Math.floor(extraDmgVal));
                        additionalDamage.push({
                            damage: finalExtra,
                            log: `[시스템 ${target.name} HP -${finalExtra} / 패시브 스킬 ${s.name} 지진효과 추가피해]`
                        });
                    }

                    if (formula.includes('WIND_GUST')) {
                        const ratio = 0.20 + (level * 0.01);
                        const extraDmgVal = ((atkFinal.agi || 0) + (atkFinal.ctrl || 0)) * ratio;
                        const finalExtra = Math.max(1, Math.floor(extraDmgVal));
                        additionalDamage.push({
                            damage: finalExtra,
                            log: `[시스템 ${target.name} HP -${finalExtra} / 패시브 스킬 ${s.name} 돌풍효과 추가피해]`
                        });
                    }

                    if (formula.includes('DARK_ABSORB')) {
                        const ratio = 0.20 + (level * 0.01);
                        const extraDmgVal = ((atkFinal.int || 0) + (atkFinal.ctrl || 0)) * ratio;
                        const finalExtra = Math.max(1, Math.floor(extraDmgVal));
                        additionalDamage.push({
                            damage: finalExtra,
                            log: `[시스템 ${target.name} HP -${finalExtra} / 패시브 스킬 ${s.name} 흡수효과 피해]`
                        });
                        additionalDamage.push({
                            damage: 0,
                            log: `[시스템 ${attacker.name} HP +${finalExtra} / 패시브 스킬 ${s.name} 흡수효과 흡수]`
                        });
                    }

                    if (formula.includes('WATER_WAVE')) {
                        const ratio = 0.20 + (level * 0.01);
                        const extraDmgVal = ((atkFinal.wis || 0) + (atkFinal.int || 0)) * ratio;
                        const finalExtra = Math.max(1, Math.floor(extraDmgVal));
                        additionalDamage.push({
                            damage: finalExtra,
                            log: `[시스템 ${target.name} HP -${finalExtra} / 패시브 스킬 ${s.name} 파도효과 추가피해]`
                        });
                    }
                }
            });
        }

        if ((!skill || skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC)) {
            damage = Math.max(1, Math.floor(damage));
        } else {
            damage = 0;
        }
        
        if (isNaN(damage)) damage = 0;
   // [MODIFIED] 방어 태세 감쇄 효과 적용 로직 추가
        if (target.statusEffects?.some(e => e.name === "방어 태세")) {
            damage = Math.floor(damage * 0.5);
        }
        return { damage: Math.floor(damage), isCrit, isMiss: false, affinityEffect, additionalDamage, attackerMythicOptions: atkDerived.mythicOptions, targetMythicOptions: defDerived.mythicOptions };
    } catch (e) {
        console.error("Damage Calculation Error:", e);
        return { damage: 0, isCrit: false, isMiss: false, affinityEffect: "", additionalDamage: [], attackerMythicOptions: [], targetMythicOptions: [] };
    }
};

export const getYear = (dateStr: string): number => {
    try {
        if (!dateStr) return 2000;
        return parseInt(dateStr.split('-')[0]);
    } catch {
        return 2000;
    }
};

export const addDays = (dateStr: string, days: number): string => {
    try {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    } catch {
        return dateStr;
    }
};

export const diffDays = (d1: string, d2: string): number => {
    try {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = date2.getTime() - date1.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
};

export const formatDate = (dateStr: string): string => {
    return dateStr;
};

/**
 * 전투 및 UI에서 큰 숫자를 간결하고 직관적인 한글 단위(만, 억, 조 등)로 축약 포맷팅합니다.
 * 1만 미만: 9,500
 * 1만 ~ 1억 미만: 4,520만 (또는 소수가 있는 경우 4.5만)
 * 1억 ~ 1조 미만: 1.25억, 125.4억
 * 1조 이상: 3.45조
 */
export const formatCompactKorean = (val: number): string => {
    if (isNaN(val) || val === null || val === undefined) return '0';
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    
    let result = '';
    if (absVal < 10000) {
        result = Math.floor(absVal).toLocaleString();
    } else if (absVal < 100000000) { // 1억 미만
        const man = absVal / 10000;
        if (absVal < 100000) { // 1만 ~ 10만 미만 (소수점 1자리)
            result = `${man.toFixed(1).replace(/\.0$/, '')}만`;
        } else { // 10만 이상 ~ 1억 미만
            const rounded = Math.floor(man);
            result = `${rounded.toLocaleString()}만`;
        }
    } else if (absVal < 1000000000000) { // 1조 미만 (1억 이상)
        const eok = absVal / 100000000;
        if (absVal < 10000000000) { // 1억 ~ 100억 미만: 소수점 최대 2자리 (예: 1.25억)
            result = `${eok.toFixed(2).replace(/\.?0+$/, '')}억`;
        } else { // 100억 이상 (예: 125.4억)
            result = `${eok.toFixed(1).replace(/\.?0+$/, '')}억`;
        }
    } else if (absVal < 10000000000000000) { // 1경 미만 (1조 이상)
        const jo = absVal / 1000000000000;
        if (absVal < 100000000000000) { // 1조 ~ 100조 미만
            result = `${jo.toFixed(2).replace(/\.?0+$/, '')}조`;
        } else {
            result = `${jo.toFixed(1).replace(/\.?0+$/, '')}조`;
        }
    } else if (absVal < 100000000000000000000) { // 1해 미만 (1경 이상)
        const gyeong = absVal / 10000000000000000;
        if (absVal < 1000000000000000000) { // 1경 ~ 100경 미만
            result = `${gyeong.toFixed(2).replace(/\.?0+$/, '')}경`;
        } else {
            result = `${gyeong.toFixed(1).replace(/\.?0+$/, '')}경`;
        }
    } else { // 1해 이상
        const hae = absVal / 100000000000000000000;
        result = `${hae.toFixed(2).replace(/\.?0+$/, '')}해`;
    }
    
    return isNegative ? `-${result}` : result;
};

export const calculateAgeFromYear = (birthYear: number, currentYear: number): string => {
    return `${currentYear - birthYear}세`;
};

export const calculateBaseDefenseBase = (base: any, companions: any[] = []): number => {
    if (!base) return 0;
    let defense = (base.level || 1) * 100;
    
    // Sum up defense from all defense facilities in layout
    const defenseFacilities = base.layout?.filter((inst: any) => inst.type === 'defense' && !inst.underConstruction && (inst.level || 0) > 0) || [];
    
    defenseFacilities.forEach((inst: any) => {
        const level = inst.level || 1;
        defense += level * 500;
        
        const managerId = base.assignments?.[inst.id];
        if (managerId && Array.isArray(companions)) {
            const manager = companions.find(c => c.id === managerId);
            if (manager) {
                const { finalStats } = calculateFinalStats(manager);
                const totalStats = (finalStats.str || 0) + (finalStats.int || 0) + (finalStats.def || 0) + (finalStats.agi || 0) + (finalStats.wis || 0) + (finalStats.ctrl || 0);
                defense += Math.floor(totalStats * 0.5);
            }
        }
    });

    // 방어 시설 건축 보너스 추가 (완공된 시설만 적용)
    if (base.defenseStructures && Array.isArray(base.defenseStructures)) {
        base.defenseStructures.forEach((struct: any) => {
            if (!struct.underConstruction) {
                defense += struct.defense || 0;
            }
        });
    }

    return defense;
};

export const calculateBaseDefense = (base: any, companions: any[] = []): number => {
    if (!base) return 0;
    const structureDefense = calculateBaseDefenseBase(base, companions);
    
    // 방어 분대 방어력 기여도 계산
    let squadContribution = 0;
    if (base.defenseSquads && Array.isArray(base.defenseSquads)) {
        const roleMultipliers: Record<string, number> = {
            FRONT_LINE: 1.2,
            VANGUARD: 1.15,
            REAR_GUARD: 1.1,
            RESERVE: 1.05
        };

        base.defenseSquads.forEach((squad: any) => {
            if (squad.unlocked && squad.memberIds && squad.memberIds.length > 0) {
                const assignedComps = Array.isArray(companions) ? companions.filter(c => squad.memberIds.includes(c.id)) : [];
                let rawCP = 0;
                assignedComps.forEach(comp => {
                    rawCP += calculateCombatPower(comp);
                });
                const leaderBonus = squad.leaderId && assignedComps.some(c => c.id === squad.leaderId) ? 1.1 : 1.0;
                const fullSquadBonus = assignedComps.length >= 4 ? 1.1 : 1.0;
                const roleMult = roleMultipliers[squad.tacticalRole] || 1.2;

                const totalCP = Math.floor(rawCP * leaderBonus * fullSquadBonus);
                const defContrib = Math.floor(totalCP * 0.10 * roleMult);
                squadContribution += defContrib;
            }
        });
    }

    return structureDefense + squadContribution;
};

export const determineTimePassage = (actionText: string): number => {
    const text = actionText.replace(/\s+/g, '');
    let daysPassed = 0;

    const dayMatch = text.match(/(\d+)일/);
    if (dayMatch) daysPassed += parseInt(dayMatch[1]);

    const weekMatch = text.match(/(\d+)주/);
    if (weekMatch) daysPassed += parseInt(weekMatch[1]) * 7;

    const monthMatch = text.match(/(\d+)(달|개월)/);
    if (monthMatch) daysPassed += parseInt(monthMatch[1]) * 30;

    const yearMatch = text.match(/(\d+)년/);
    if (yearMatch) daysPassed += parseInt(yearMatch[1]) * 365;

    if (text.includes('하루')) daysPassed += 1;
    if (text.includes('이틀')) daysPassed += 2;
    if (text.includes('사흘')) daysPassed += 3;
    if (text.includes('나흘')) daysPassed += 4;
    if (text.includes('일주일')) daysPassed += 7;
    if (text.includes('보름')) daysPassed += 15;
    if (text.includes('한달')) daysPassed += 30;
    if (text.includes('두달')) daysPassed += 60;
    if (text.includes('반년')) daysPassed += 180;
    if (text.includes('일년')) daysPassed += 365;

    if (daysPassed === 0) {
        const lower = text.toLowerCase();
        if (lower.includes('휴식') || lower.includes('잠') || lower.includes('수면') || lower.includes('회복') || lower.includes('자러')) return 1;
        if (lower.includes('여행') || lower.includes('이동')) return 1;
        if (lower.includes('수련') || lower.includes('훈련')) return 1;
        if (lower.includes('연구')) return 1;
        if (lower.includes('제작')) return 1;
    }

    return daysPassed;
}

export const generateEnemyStats = (level: number, type: 'normal' | 'elite' | 'boss' = 'normal'): Stats => {
    
    const lvl = level || 1;
    let tierMultiplier = 1;
    if (lvl > 10000) tierMultiplier = 250;
    else if (lvl > 8500) tierMultiplier = 200;
    else if (lvl > 7000) tierMultiplier = 150;
    else if (lvl > 6000) tierMultiplier = 120;
    else if (lvl > 5000) tierMultiplier = 100;
    else if (lvl > 3000) tierMultiplier = 90;
    else if (lvl > 2500) tierMultiplier = 80;
    else if (lvl > 1500) tierMultiplier = 65;
    else if (lvl > 1000) tierMultiplier = 60;
    else if (lvl > 850) tierMultiplier = 55;
    else if (lvl > 700) tierMultiplier = 50;
    else if (lvl > 650) tierMultiplier = 45;
    else if (lvl > 600) tierMultiplier = 40;
    else if (lvl > 550) tierMultiplier = 35;
    else if (lvl > 500) tierMultiplier = 30;
    else if (lvl > 480) tierMultiplier = 25;
    else if (lvl > 450) tierMultiplier = 20;
    else if (lvl > 420) tierMultiplier = 19;
    else if (lvl > 400) tierMultiplier = 17.5;
    else if (lvl > 350) tierMultiplier = 15;
    else if (lvl > 300) tierMultiplier = 13;
    else if (lvl > 250) tierMultiplier = 11;
    else if (lvl > 200) tierMultiplier = 10;
    else if (lvl > 175) tierMultiplier = 9;
    else if (lvl > 150) tierMultiplier = 8;
    else if (lvl > 125) tierMultiplier = 7;
    else if (lvl > 100) tierMultiplier = 6.5;
    else if (lvl > 80) tierMultiplier = 6;
    else if (lvl > 60) tierMultiplier = 5.5;
    else if (lvl > 50) tierMultiplier = 5;
    else if (lvl > 40) tierMultiplier = 4;
    else if (lvl > 30) tierMultiplier = 3;
    else if (lvl > 20) tierMultiplier = 2;
    else if (lvl > 10) tierMultiplier = 1.5;

    let typeMultiplier = 1;
    if (type === 'elite') typeMultiplier = 2;
    if (type === 'boss') typeMultiplier = 4;

    const statMultiplier = (Math.floor(Math.random() * 5) + 10) * typeMultiplier; 
    const totalStatPoints = lvl * (statMultiplier*tierMultiplier/2);
  
    const statsArray = [0, 0, 0, 0, 0, 0]; 
    for (let i = 0; i < totalStatPoints; i++) {
        const rnd = Math.floor(Math.random() * 6);
        statsArray[rnd]++;
    }
    
    const str = Math.max(1, statsArray[0]);
    const int = Math.max(1, statsArray[1]);
    const wis = Math.max(1, statsArray[2]);
    const def = Math.max(1, statsArray[3]);
    const agi = Math.max(1, statsArray[4]);
    const ctrl = Math.max(1, statsArray[5]);

   
    const hpMultiplier = Math.floor(Math.random() * 10) + 20;
    const baseHp = 4*(lvl * hpMultiplier) + (totalStatPoints * 2);
    let calculatedHp = Math.floor(baseHp * tierMultiplier);
    
    // 저렙구간 몬스터의 HP수치 보정 (레벨 100 미만일 때 부드럽게 스케일링하여 초반 전투 피로도 감소)
    if (lvl < 100) {
        const lowLevelScale = 0.3 + 0.4 * (lvl / 100);
        calculatedHp = Math.floor(calculatedHp * lowLevelScale);
    }

    const calculatedMp = lvl * 20;

    return {
        hp: calculatedHp,
        maxHp: calculatedHp,
        mp: calculatedMp,
        maxMp: calculatedMp,
        str,
        int,
        wis,
        def,
        agi,
        ctrl
    };
};

export const generateProceduralEnemy = (playerLevel: number, monsterName?: string): Enemy => {
    let baseMonster = BASE_MONSTERS.find(m => m.name === monsterName);
    if (!baseMonster) {
        // 전투용 몬스터만 필터링하여 무작위로 선택 (가축 제외)
        const combatMonsters = BASE_MONSTERS.filter(m => m.shinryokuType !== "가축");
        baseMonster = combatMonsters.length > 0 
            ? combatMonsters[Math.floor(Math.random() * combatMonsters.length)]
            : BASE_MONSTERS[0];
    }
    
    const prefix = MONSTER_PREFIXES[Math.floor(Math.random() * MONSTER_PREFIXES.length)];
    const level = Math.max(1,playerLevel);
    const baseStats = generateEnemyStats(level);
    
    if (prefix.statMod.all) {
        Object.keys(baseStats).forEach(k => {
            if (k !== 'hp' && k !== 'maxHp' && k !== 'mp' && k !== 'maxMp') {
                baseStats[k as keyof Stats] = Math.floor(baseStats[k as keyof Stats] * prefix.statMod.all!);
            }
        });
    } else {
        if (prefix.statMod.str) baseStats.str = Math.floor(baseStats.str * prefix.statMod.str);
        if (prefix.statMod.int) baseStats.int = Math.floor(baseStats.int * prefix.statMod.int);
        if (prefix.statMod.wis) baseStats.wis = Math.floor(baseStats.wis * prefix.statMod.wis);
        if (prefix.statMod.def) baseStats.def = Math.floor(baseStats.def * prefix.statMod.def);
        if (prefix.statMod.agi) baseStats.agi = Math.floor(baseStats.agi * prefix.statMod.agi);
        if (prefix.statMod.ctrl) baseStats.ctrl = Math.floor(baseStats.ctrl * prefix.statMod.ctrl);
    }

    baseStats.maxHp = Math.floor(baseStats.maxHp * prefix.hpMod);
    baseStats.hp = baseStats.maxHp;
    if (prefix.statMod.mp) {
        baseStats.maxMp = Math.floor(baseStats.maxMp * prefix.statMod.mp);
        baseStats.mp = baseStats.maxMp;
    }

    const finalName = monsterName || baseMonster.name || "슬라임";
    const monsterInfo = getMonsterInfo(finalName);
    let type = monsterInfo.shinryokuType || baseMonster.shinryokuType || SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
    if (type === "가축") {
        type = monsterInfo.shinryokuType || SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
    }

    // divine 몬스터 체력 10배 적용
    const isDivineMonster = Boolean(
        (typeof DIVINE_MONSTER_IMAGE_MAP !== 'undefined' && DIVINE_MONSTER_IMAGE_MAP[finalName]) ||
        (typeof DIVINE_MONSTER_LOOT !== 'undefined' && DIVINE_MONSTER_LOOT[finalName]) ||
        finalName.includes("신성") || finalName.includes("성소") || finalName.includes("디바인") ||
        finalName.includes("Divine") || finalName.includes("천사") || finalName.includes("메타트론") ||
        finalName.includes("엘라핌") || finalName.includes("성휘") || finalName.includes("신수")
    );

    if (isDivineMonster) {
        baseStats.maxHp = Math.floor(baseStats.maxHp * 10);
        baseStats.hp = baseStats.maxHp;
    }

    return {
        name: `${finalName}`,
        level: level,
        hp: baseStats.hp,
        maxHp: baseStats.maxHp,
        stats: baseStats,
        statusEffects: [],
        shinryokuType: type,
        description: `${finalName}입니다.`,
        skills: baseMonster.skills || [],
        visualUrl: monsterInfo.visualUrl
    };
};



export const generateHumanoidEnemy = (playerLevel: number): Enemy => {
    const races = ["인간", "엘프", "수인", "드워프", "마인"];
    const race = races[Math.floor(Math.random() * races.length)];
    const nationKeys = Object.keys(NATION_NAMES);
    const nation = nationKeys[Math.floor(Math.random() * nationKeys.length)];
    const nameList = NATION_NAMES[nation] || NATION_NAMES["대한민국"];
    const name = nameList[Math.floor(Math.random() * nameList.length)];
    const level = Math.max(1, playerLevel + Math.floor(Math.random() * 4) - 1);
    const stats = generateEnemyStats(level);
    const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
    
    let tier = ClassTier.FIRST;
    let tierIdx = 0;
    if (level >= 30) { tier = ClassTier.FIRST; tierIdx = 0; }
    if (level >= 100) { tier = ClassTier.SECOND; tierIdx = 1; }
    if (level >= 200) { tier = ClassTier.LAST; tierIdx = 2; }
    if (level >= 500) { tier = ClassTier.FINAL; tierIdx = 3; }

    const classOptions = HUMANOID_CLASSES[type] || HUMANOID_CLASSES['무기강화계'];
    const classIdx = Math.min(classOptions.length - 1, tierIdx);
    const className = classOptions[classIdx];

    const skillPool = [...(ENEMY_SKILL_POOL[type] || []), ...(ENEMY_SKILL_POOL['일반'] || [])];
    const numSkills = Math.floor(level / 20) + 1;
    const skills: Skill[] = [];
    
    for (let i = 0; i < numSkills; i++) {
        if (skillPool.length === 0) break;
        const sIdx = Math.floor(Math.random() * skillPool.length);
        const s = skillPool[sIdx];
        skills.push({
            name: s.name!,
            description: s.description || "강력한 공격",
            type: s.type || SkillType.PHYSICAL,
            tier: tier, 
            mpCost: s.mpCost || 10,
            level: Math.floor(level / 10) + 1,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: s.effectFormula || "STR*1.5",
            powerRatio: s.powerRatio || 100,
            targetType: s.targetType || 'single'
        });
    }

    return {
        name: `${race} ${className} ${name}`,
        level: level,
        hp: stats.hp,
        maxHp: stats.maxHp,
        stats: stats,
        statusEffects: [],
        shinryokuType: type,
        description: `${nation} 출신의 ${race} ${className}입니다.`,
        skills: skills,
    };
};

export const generateLoot = (enemy: Enemy, nation?: string, character?: Character): Item[] => {
    const drops: Item[] = [];
    const droppedNames = new Set<string>();
    
    const dropMultiplier = getDropRateMultiplier(character);
    
    // [MODIFIED] 보스 등의 고유/부스트된 전리품 정보(detailedLoot)가 있는 경우, 명시된 확률(chance) 또는 등급별 확률에 따라 롤링
    if (enemy.detailedLoot) {
        const loots = Array.isArray(enemy.detailedLoot) ? enemy.detailedLoot : [enemy.detailedLoot];
        loots.forEach(item => {
            if (item) {
                const itemChance = (typeof (item as any).chance === 'number' ? (item as any).chance : getChanceByRarity(item.rarity)) * dropMultiplier;
                if (Math.random() <= itemChance) {
                    try {
                        const processedItem = processBossDetailedLoot(item, findItemDataInWorldTables);
                        drops.push(processedItem);
                        droppedNames.add(processedItem.name);
                    } catch (e) {
                        drops.push({ ...item });
                        droppedNames.add(item.name);
                    }
                }
            }
        });
    }

    let foundPrimaryLoot = false;
    const lowerName = (enemy.name || "").toLowerCase();
    const enemyId = enemy.id; // ✅ Enemy에 고유 ID가 있다고 가정
    
    if (nation && WORLD_LOOT_TABLES[nation]) {
        const regionalTable = WORLD_LOOT_TABLES[nation];
        regionalTable.forEach((entry: any) => {
            const finalChance = entry.chance * dropMultiplier;
            if ((enemy.level || 1) >= entry.minLvl && Math.random() < finalChance) {
                // ✅ 기존 이름 기반 로직 유지 + ID 존재 시 우선 체크
                let isDroppedByThisEnemy = true;
                if (entry.droppedBy && entry.droppedBy.length > 0) {
                    if (enemyId) {
                        isDroppedByThisEnemy = entry.droppedBy.includes(enemyId);
                    } else {
                        isDroppedByThisEnemy = entry.droppedBy.some((name: string) =>
                            name && lowerName.includes(name.toLowerCase())
                        );
                    }
                }

                if (isDroppedByThisEnemy) {
                    const itemName = entry.item || entry.name;
                    // 이미 보장 보스 전리품(detailedLoot)으로 드롭되었다면 중복 생성 스킵
                    if (!droppedNames.has(itemName)) {
                        const secondaryOptions = entry.secondaryOptions || entry.options || [];
                        const newItem: Item = {
                            name: itemName,
                            type: entry.type,
                            weaponType: entry.weaponType,
                            // [MODIFIED] 옵션을 분석하여 자동으로 속성 설정
                            elementalType: entry.elementalType || extractElementalType(secondaryOptions),
                            rarity: entry.rarity,
                            description: entry.description,
                            stats: entry.stats || {},
                            secondaryOptions: secondaryOptions,
                            enhancement: 0,
                            imageUrl: entry.imageUrl,
                            mythicOption: entry.mythicOption || undefined
                        };
                        const processedDrop = ensureBossLootProcessed(newItem, findItemDataInWorldTables, enemy);
                        drops.push(processedDrop);
                        droppedNames.add(itemName);
                    }
                }
            }
        });
    }

    // [MODIFIED] 지역 전리품 획득 여부와 관계없이 공통 전리품 테이블 체크
    // 단, nation이 존재하면 이미 regionalTable에 genericLoot가 포함되어 있으므로 중복 체크 방지
    let tableKey = 'generic';
    const isBoss = (enemyId && (enemyId.startsWith('boss_') || enemyId.startsWith('instant_'))) || lowerName.includes('보스') || lowerName.includes('boss');

    if (lowerName.includes('늑대') || lowerName.includes('wolf')) tableKey = 'beast';
    else if (lowerName.includes('슬라임') || lowerName.includes('slime')) tableKey = 'slime';
    else if (lowerName.includes('고블린') || lowerName.includes('goblin')) tableKey = 'goblin';
    else if (lowerName.includes('오크') || lowerName.includes('orc')) tableKey = 'orc';
    else if (lowerName.includes('스켈레톤') || lowerName.includes('skeleton') || lowerName.includes('해골') || lowerName.includes('좀비') || lowerName.includes('zombie')) tableKey = 'undead';
    
    const tablesToProcess = [tableKey];
    if (isBoss && tableKey !== 'boss') tablesToProcess.push('boss');

    tablesToProcess.forEach(key => {
        const table = WORLD_LOOT_TABLES[key];

        // nation이 있고 key가 'generic'이면 이미 위에서 체크했으므로 스킵
        if (table && !(nation && key === 'generic')) {
            table.forEach(entry => {
            const finalChance = entry.chance * dropMultiplier;
            if ((enemy.level || 1) >= entry.minLvl && Math.random() < finalChance) {
                let equipStats: Partial<Stats> = {};
                if (entry.type === 'Equipment' || entry.type === 'Weapon' || entry.type === 'Body' || entry.type === 'Accessory') {
                    const statKeys = ['str', 'int', 'def', 'agi', 'wis', 'ctrl'];
                    const mainStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                    equipStats[mainStat as keyof Stats] = Math.floor((enemy.level || 1) * 0.5) + 1;
                }

                let finalType: Item['type'];
                let wType: WeaponType | undefined;
                let elType: string | undefined;

                const itemName = entry.item || entry.name;
                if (entry.type === 'Equipment') {
                    if (itemName.includes('검') || itemName.includes('창') || itemName.includes('도끼')) finalType = 'Weapon';
                    else if (itemName.includes('방패') || itemName.includes('보주') || itemName.includes('보조무기')) finalType = 'SubWeapon';
                    else if (itemName.includes('갑옷') || itemName.includes('로브')) finalType = 'Body';
                    else if (itemName.includes('장갑')) finalType = 'Hand';
                    else if (itemName.includes('신발') || itemName.includes('부츠')) finalType = 'Feet';
                    else if (itemName.includes('장신구') || itemName.includes('반지') || itemName.includes('목걸이')) finalType = 'Accessory';
                    else {
                        const slots = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'] as const;
                        finalType = slots[Math.floor(Math.random() * slots.length)];
                    }
                } else {
                    finalType = entry.type;
                }

                const tempItem: Item = { name: itemName, type: finalType, rarity: entry.rarity || ItemRarity.NORMAL, description: '', enhancement: 0 };
                wType = getWeaponTypeFromItem(tempItem);

                const secondaryOptions = entry.secondaryOptions || entry.options || [];
                elType = entry.elementalType || extractElementalType(secondaryOptions);

                if (finalType === 'Weapon' || finalType === 'SubWeapon') {
                    if (!elType && Math.random() < 0.3) {
                        elType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                    }
                }

                if (!drops.some(d => d.name === itemName)) {
                    const tempBossDrop: Item = {
                        name: itemName,
                        type: finalType,
                        weaponType: wType,
                        elementalType: elType,
                        rarity: entry.rarity || ItemRarity.NORMAL,
                        description: entry.description || `${enemy.name}에게서 얻은 ${itemName}입니다.${elType ? ` [${elType}]` : ''}`,
                        stats: Object.keys(equipStats).length > 0 ? equipStats : undefined,
                        enhancement: 0,
                        secondaryOptions:secondaryOptions,
                        imageUrl: entry.imageUrl,
                        mythicOption: entry.mythicOption || undefined
                    };
                    const finalBossDrop = ensureBossLootProcessed(tempBossDrop, findItemDataInWorldTables, enemy);
                    drops.push(finalBossDrop);
                }
            }
            });
        }
    });

    const eggChance = 0.01 * dropMultiplier;
    if (Math.random() < eggChance) {
        let rank = 'C';
        const lvl = enemy.level || 1;
        if (lvl > 250) rank = 'SS';
        else if (lvl > 200) rank = 'S';
        else if (lvl > 150) rank = 'A';
        else if (lvl > 100) rank = 'B';
        
        if (Math.random() < 0.1) {
             if (rank === 'C') rank = 'B';
             else if (rank === 'B') rank = 'A';
             else if (rank === 'A') rank = 'S';
             else if (rank === 'S') rank = 'SS';
             else if (rank === 'SS') rank = 'SSS';
        }

        drops.push({
            name: `${rank}등급 몬스터 알`,
            type: 'Etc',
            rarity: rank === 'SSS' ? ItemRarity.LEGENDARY : rank === 'SS' ? ItemRarity.UNIQUE : rank === 'S' ? ItemRarity.EPIC : rank === 'A' ? ItemRarity.RARE : rank === 'B' ? ItemRarity.MAGIC : ItemRarity.NORMAL,
            description: `미지의 몬스터가 잠들어 있는 알입니다. (등급: ${rank})`,
            imageUrl: rank === 'SSS' ? "https://i.ibb.co/jv7bSzRm/Gemini-Generated-Image-6qnybq6qnybq6qny.png" : rank === 'SS' ? "https://i.ibb.co/1kf25Qp/Gemini-Generated-Image-3plb8i3plb8i3plb.png" : rank === 'S' ? "https://i.ibb.co/M570N0mF/Gemini-Generated-Image-6fkojd6fkojd6fko.png" : 
            rank === 'A'? "https://i.ibb.co/3ymr285G/Gemini-Generated-Image-uprbi2uprbi2uprb.png" : rank === 'B'? "https://i.ibb.co/WvmwscKc/Gemini-Generated-Image-o0eqp2o0eqp2o0eq.png" : "https://i.ibb.co/Z6sv5bk5/Gemini-Generated-Image-d7nxord7nxord7nx.png",
            enhancement: 0
        });
    }

    return drops;
};

const NATION_TO_CONTINENT: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    Object.entries(WORLD_GEOGRAPHY).forEach(([region, data]) => {
        Object.keys(data).forEach(nationName => {
            map[nationName] = region;
        });
    });
    return map;
})();

export const generateDefaultVisualUrl = (name: string, nation: string, race: string, gender: string): string => {
    let category = NATION_TO_CONTINENT[nation] || '기타';
    if (race === '엘프') category = '엘프';
    else if (race === '수인') category = '수인';
    else if (race === '마인') category = '마계';
    else if (race === '천족') category = '신계';
    
    let presets = CHARACTER_PRESETS[category as keyof typeof CHARACTER_PRESETS] || CHARACTER_PRESETS['기타'];
    
    const isMale = gender === '남성' || gender === '남';
    const genderFilter = isMale ? '_m' : '_f';
    
    let filteredPresets = presets.filter(p => p.id.includes(genderFilter));
    if (filteredPresets.length === 0) {
        filteredPresets = presets;
    }
    
    let hash = 0;
    const safeName = name || 'Unknown';
    for (let i = 0; i < safeName.length; i++) {
        hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % filteredPresets.length;
    
    const preset = filteredPresets[index];
    if (!preset) return CHARACTER_PRESETS['기타'][0].url;
    
    const urlParts = preset.url.split('/');
    if (urlParts.includes('seed')) {
        const seedIndex = urlParts.indexOf('seed') + 1;
        urlParts[seedIndex] = `${urlParts[seedIndex]}_${encodeURIComponent(safeName)}`;
        return urlParts.join('/');
    }
    
    return preset.url;
};

export const generateCompanionStats = (level: number): Stats => {
     const lvl = level || 1;
       let tierMultiplier = 1;
         if (lvl > 10000) tierMultiplier = 20;
         else if (lvl > 7000) tierMultiplier = 17;
         else if (lvl > 5000) tierMultiplier = 15;
         else if (lvl > 2500) tierMultiplier = 13;
         else if (lvl > 1500) tierMultiplier = 11;
         else if (lvl > 1000) tierMultiplier = 10;
         else if (lvl > 850) tierMultiplier = 6.5;
          else if (lvl > 700) tierMultiplier = 6;
        else if (lvl > 600) tierMultiplier = 5.5;
    else if (lvl > 500) tierMultiplier = 5;
    else if (lvl > 400) tierMultiplier = 4.5;
    else if (lvl > 300) tierMultiplier = 4;
    else if (lvl > 200) tierMultiplier = 3.5;
    else if (lvl > 100) tierMultiplier = 3;
    else if (lvl > 50) tierMultiplier = 2.5;
    else if (lvl > 30) tierMultiplier = 2;
    else if (lvl > 10) tierMultiplier = 1.5;

       const statMultiplier = Math.floor(Math.random() * 16) + 10; 
    const totalStatPoints = lvl * (statMultiplier*tierMultiplier);
  
    const statsArray = [0, 0, 0, 0, 0, 0]; 
    for (let i = 0; i < totalStatPoints; i++) {
        const rnd = Math.floor(Math.random() * 6);
        statsArray[rnd]++;
    }
    
    const str = Math.max(1, statsArray[0]);
    const int = Math.max(1, statsArray[1]);
    const wis = Math.max(1, statsArray[2]);
    const def = Math.max(1, statsArray[3]);
    const agi = Math.max(1, statsArray[4]);
    const ctrl = Math.max(1, statsArray[5]);

   
    const hpMultiplier = Math.floor(Math.random() * 10) + 20;
    const baseHp = (lvl * 20) + (totalStatPoints * 1/2);
    const calculatedHp = Math.floor(baseHp * tierMultiplier);
    const calculatedMp = lvl * 20;

    return {
        hp: calculatedHp,
        maxHp: calculatedHp,
        mp: calculatedMp,
        maxMp: calculatedMp,
        str,
        int,
        wis,
        def,
        agi,
        ctrl
    };
};

export const getPeerAge = (playerAgeStr: string) => {
    const ageNum = parseInt(playerAgeStr.replace(/[^0-9]/g, ''));
    if (isNaN(ageNum)) return `${Math.floor(Math.random() * 10) + 20}세`; 
    if (ageNum >= 11 && ageNum <= 13) return `${Math.floor(Math.random() * 3) + 11}세`;
    if (ageNum >= 14 && ageNum <= 16) return `${Math.floor(Math.random() * 3) + 14}세`;
    if (ageNum >= 17 && ageNum <= 19) return `${Math.floor(Math.random() * 3) + 17}세`;
    return `${Math.floor(Math.random() * 15) + 20}세`;
};

export const getRequiredExp = (lvl: number) => {
    if (lvl < 30) return lvl * 100;
    if (lvl < 100) return lvl * 200; 
    if (lvl < 200) return lvl * 500; 
    if (lvl < 300) return lvl * 1000;
    if (lvl < 400) return lvl * 1500;
    if (lvl < 500) return lvl * 2000;
    if (lvl < 600) return lvl * 3000;
    if (lvl < 700) return lvl * 4000;
    if (lvl < 800) return lvl * 5000;
    if (lvl < 900) return lvl * 6000;
    if (lvl < 1000) return lvl * 7500;
    if (lvl < 1500) return lvl * 10000;
    if (lvl < 2000) return lvl * 15000;
    if (lvl < 2500) return lvl * 20000;
    if (lvl < 3000) return lvl * 30000;
    if (lvl < 5000) return lvl * 50000;
    return lvl * 100000;
};

export const migrateCompanion = (comp: any, baseLevel?: number, playerAgeStr?: string, currentYear?: number): Companion => {
    let level = comp.level || 1;
    if (baseLevel && (level === 1 || !comp.level)) level = Math.max(1, Math.floor(Math.random() * baseLevel) + 1);
    
    let stats = comp.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
    const baseKeys = ['str', 'int', 'wis', 'def', 'agi', 'ctrl'];
    let currentTotalPoints = baseKeys.reduce((sum, key) => sum + (stats[key] || 0), 0) + Math.floor((stats.maxHp || 100) / 10) + Math.floor((stats.maxMp || 50) / 10);
    const targetTotalPoints = level * 10;
    if (currentTotalPoints < targetTotalPoints) {
        let diff = targetTotalPoints - currentTotalPoints;
        while(diff > 0) {
            const roll = Math.random();
            if (roll < 0.7) { const rKey = baseKeys[Math.floor(Math.random() * baseKeys.length)]; stats[rKey] = (stats[rKey] || 0) + 1; } 
            else if (roll < 0.85) { stats.maxHp = (stats.maxHp || 0) + 10; stats.hp = stats.maxHp; } 
            else { stats.maxMp = (stats.maxMp || 0) + 10; stats.mp = stats.maxMp; }
            diff--;
        }
    }

    if (!stats.maxHp || stats.maxHp < 100) { stats.maxHp = Math.max(100, level * 200); stats.hp = stats.maxHp; }
    if (!stats.maxMp || stats.maxMp < 50) { stats.maxMp = Math.max(50, level * 200); stats.mp = stats.maxMp; }

    const genders = ["남성", "여성"];
    const finalGender = comp.gender && comp.gender !== "알 수 없음" ? comp.gender : genders[Math.floor(Math.random() * genders.length)];
    const modernNations = Object.keys(NATION_DATA);
    let finalNation = comp.nation;
    if (!finalNation || finalNation === "알 수 없음" || finalNation === "국적 불명") { 
        finalNation = "대한민국"; 
    }

    let finalRace = comp.race || "인간";
    if (finalRace.length > 10 || finalRace.includes("\n") || finalRace.includes(",")) finalRace = "인간"; 

    let finalName = comp.name;
    const isDefaultName = !finalName || finalName === "이름 없음" || finalName === "Unknown";
    if (isDefaultName) { 
        const genderParam = finalGender === "남성" ? "male" : "female";
        finalName = generateName(finalNation, genderParam);
    }

    const currentYr = currentYear || 2000;
    let finalAgeStr = (comp.age && comp.age !== "알 수 없음") ? comp.age : (playerAgeStr ? getPeerAge(playerAgeStr) : `${Math.floor(Math.random() * 10) + 20}세`);
    const ageNum = parseInt(finalAgeStr.replace(/[^0-9]/g, '')) || 20;
    
    // birthYear와 age 간의 연도 불일치 자동 동기화
    let finalBirthYear = currentYr - ageNum;
    finalAgeStr = `${ageNum}세`;

    const mercenaryRank = comp.mercenaryRank || MercenaryRank.F;
    const reputationRange = getReputationRangeByRank(mercenaryRank);
    const reputation = comp.reputation || Math.floor(Math.random() * (reputationRange.max - reputationRange.min + 1)) + reputationRange.min;

    let finalClassTier = comp.classTier || ClassTier.NONE;
    if (!comp.isCustom) {
        if (level < 30 && finalClassTier !== ClassTier.NONE && finalClassTier !== ClassTier.F) {
            finalClassTier = ClassTier.NONE;
        } else if (level < 100 && (finalClassTier === ClassTier.SECOND || finalClassTier === ClassTier.LAST || finalClassTier === ClassTier.FINAL)) {
            finalClassTier = ClassTier.FIRST;
        } else if (level < 300 && (finalClassTier === ClassTier.LAST || finalClassTier === ClassTier.FINAL)) {
            finalClassTier = ClassTier.SECOND;
        } else if (level < 1000 && finalClassTier === ClassTier.FINAL) {
            finalClassTier = ClassTier.LAST;
        }
    }

    const res: Companion = {
        ...comp, 
        id: comp.id || Math.random().toString(36).substring(2, 9), 
        name: finalName, 
        stats: stats, 
        skills: comp.skills || [], 
        statusEffects: comp.statusEffects || [], 
        equipment: comp.equipment || {}, 
        inventory: comp.inventory || [], 
        weaponMastery: comp.weaponMastery || {}, 
        statPoints: comp.statPoints ?? 0, 
        currentExp: comp.currentExp || 0, 
        maxExp: getRequiredExp(level), 
        classTier: finalClassTier, 
        level: level, 
        age: finalAgeStr, 
        birthYear: finalBirthYear, 
        gender: finalGender, 
        race: finalRace, 
        nation: finalNation, 
        appearance: comp.appearance && comp.appearance !== "정보 없음" ? comp.appearance : "평범한 복장을 하고 있다.", 
        personality: comp.personality && comp.personality !== "알 수 없음" ? comp.personality : "신중함 (ISTJ)", 
        classType: comp.classType || "동료", 
        affection: comp.affection || 50, 
        loyalty: 50, 
        chatHistory: comp.chatHistory || [], 
        isLover: comp.isLover || false, 
        breakupWarning: comp.breakupWarning || false, 
        isDead: comp.isDead || false, 
        isCustom: comp.isCustom ?? false,
        combatStyle: comp.combatStyle,
        currentTactics: comp.currentTactics || "자유 행동",
        mercenaryRank: mercenaryRank,
        reputation: reputation
    };
    return assignRandomCombatStyle(res, false, true);
};

export const checkAndApplyLevelUp = (char: Character): { updatedChar: Character, leveledUp: boolean, oldLevel: number, leveledUpCompanions: { companion: Companion, oldLevel: number }[] } => {
    let updatedChar = { ...char };
    let leveledUp = false;
    let oldLevel = char.level;
      // [NEW] 스킬 숙련도 레벨업 체크 로직 통합
    const processSkillLevelUp = (entity: any) => {
        if (!entity.skills) return;
        entity.skills.forEach((skill: any) => {
            if (skill.type === SkillType.PASSIVE && skill.effectFormula?.includes('SPECIAL')) return;
            
            const required = 20 * (skill.level + 4);
            while (skill.currentMastery >= required) {
                if (skill.level < (skill.maxLevel || 10)) {
                    skill.currentMastery -= required;
                    skill.level += 1;
                    // MP 소모 감소 (클래스 티어별 차등 감소: 퍼스트 10, 세컨드 20, 라스트 50, 파이널 100 + 스킬 강화 보너스)
                    const bonusMpReduction = getLevelUpMpReductionBonus(skill);
                    if (skill.type !== SkillType.DEBUFF) {
                        const tier = skill.tier || skill.baseTier || skill.minClassTier;
                        let reduction = 10;
                        if (tier === ClassTier.FINAL || tier === '파이널 클래스' || tier === 'FINAL') reduction = 100;
                        else if (tier === ClassTier.LAST || tier === '라스트 클래스' || tier === 'LAST') reduction = 50;
                        else if (tier === ClassTier.SECOND || tier === '세컨드 클래스' || tier === 'SECOND') reduction = 20;
                        else if (tier === ClassTier.FIRST || tier === '퍼스트 클래스' || tier === 'FIRST') reduction = 10;
                        skill.mpCost = Math.max(1, (skill.mpCost || 10) - (reduction + bonusMpReduction));
                    } else if (bonusMpReduction > 0) {
                        skill.mpCost = Math.max(1, (skill.mpCost || 10) - bonusMpReduction);
                    }
                } else {
                    skill.currentMastery = required;
                    break;
                }
            }
        });
    };

    processSkillLevelUp(updatedChar);
    if (!updatedChar.stats.maxHp) updatedChar.stats.maxHp = updatedChar.level * 20;
    if (!updatedChar.stats.maxMp) updatedChar.stats.maxMp = updatedChar.level * 20;

    updatedChar.maxExp = getRequiredExp(updatedChar.level);

    while (updatedChar.currentExp >= updatedChar.maxExp) {
        leveledUp = true;
        updatedChar.currentExp -= updatedChar.maxExp;
        updatedChar.level += 1;
        updatedChar.maxExp = getRequiredExp(updatedChar.level);
        updatedChar.statPoints += getStatPointsPerLevel(updatedChar);
        updatedChar.stats.maxHp += 20;
        updatedChar.stats.maxMp += 20;
        
        const { finalStats } = calculateFinalStats(updatedChar);
        updatedChar.stats.hp = finalStats.maxHp;
        updatedChar.stats.mp = finalStats.maxMp;
    }

    const applyLevelUpToCompanions = (comps: Companion[]) => {
        const leveledUpCompanions: { companion: Companion, oldLevel: number }[] = [];
        const updatedComps = comps.map(comp => {
            let c = { ...comp };
            const oldLevel = c.level;
            processSkillLevelUp(c); // 동료 스킬 체크
            if (!c.stats.maxHp) c.stats.maxHp = c.level * 20;
            if (!c.stats.maxMp) c.stats.maxMp = c.level * 20;
            
            c.maxExp = getRequiredExp(c.level);

            let leveled = false;
            while (c.currentExp >= c.maxExp) {
                leveled = true;
                c.currentExp -= c.maxExp;
                c.level += 1;
                c.maxExp = getRequiredExp(c.level);
                c.statPoints += getStatPointsPerLevel(c);
                c.stats.maxHp += 20;
                c.stats.maxMp += 20;
                
                const { finalStats: compFinal } = calculateFinalStats(c);
                c.stats.hp = compFinal.maxHp;
                c.stats.mp = compFinal.maxMp;
                
                // [FIX] 하위 호환성 및 스탯 복리 방지를 위해 탑레벨 hp/mp 제거
                delete (c as any).hp;
                delete (c as any).maxHp;
                delete (c as any).mp;
                delete (c as any).maxMp;
            }
            
            if (leveled) leveledUpCompanions.push({ companion: c, oldLevel });

            // [NEW] 레벨업 시점 또는 마일스톤 도달 시 자동 성장(스킬 습득 등) 처리
            c = processAutomaticGrowth(c);

            return c;
        });
        return { updatedComps, leveledUpCompanions };
    };
    
    const compResult = applyLevelUpToCompanions(updatedChar.companions);
    updatedChar.companions = compResult.updatedComps;
    const leveledUpCompanions = [...compResult.leveledUpCompanions];

    if (updatedChar.inactiveCompanions) {
        const inactiveCompResult = applyLevelUpToCompanions(updatedChar.inactiveCompanions);
        updatedChar.inactiveCompanions = inactiveCompResult.updatedComps;
        leveledUpCompanions.push(...inactiveCompResult.leveledUpCompanions);
    }

    // [NEW] 장착된 탈것 몬스터 레벨업 체크
    if (updatedChar.mountedMonster) {
        const mountResult = applyLevelUpToCompanions([updatedChar.mountedMonster]);
        updatedChar.mountedMonster = mountResult.updatedComps[0];
        leveledUpCompanions.push(...mountResult.leveledUpCompanions);
    }
    if (updatedChar.companions) {
        updatedChar.companions = updatedChar.companions.map(c => {
            if (c.mountedMonster) {
                const cMountResult = applyLevelUpToCompanions([c.mountedMonster]);
                leveledUpCompanions.push(...cMountResult.leveledUpCompanions);
                return { ...c, mountedMonster: cMountResult.updatedComps[0] };
            }
            return c;
        });
    }

    if (updatedChar.base?.capturedMonsters) {
        updatedChar.base.capturedMonsters = updatedChar.base.capturedMonsters.map(monster => {
            let m = { ...monster };
            if (!m.maxExp) m.maxExp = (m.level || 1) * 100;
            let monsterLeveled = false;
            while ((m.currentExp || 0) >= (m.maxExp || 100)) {
                monsterLeveled = true;
                m.currentExp = (m.currentExp || 0) - (m.maxExp || 100);
                m.level = (m.level || 1) + 1;
                m.maxExp = (m.level || 1) * 100;
                m.statPoints = (m.statPoints || 0) + getStatPointsPerLevel({ ...m, level: m.level || 1 });
            }
            if (monsterLeveled) {
                const currentMaxHp = m.stats?.maxHp || m.maxHp || 100;
                const currentMaxMp = m.stats?.maxMp || 50;
                const hpGain = 10 + Math.floor((m.stats?.str || 1) * 2);
                const mpGain = 5 + Math.floor((m.stats?.int || 1) * 1.5);
                const newMaxHp = currentMaxHp + hpGain;
                const newMaxMp = currentMaxMp + mpGain;
                m.maxHp = newMaxHp;
                m.hp = newMaxHp;
                if (m.stats) {
                    m.stats = {
                        ...m.stats,
                        maxHp: newMaxHp,
                        hp: newMaxHp,
                        maxMp: newMaxMp,
                        mp: newMaxMp
                    };
                }
            }
            return m;
        });
    }

    return { updatedChar, leveledUp, oldLevel, leveledUpCompanions };
};


export const calculateBuffSuccessRate = (stats: Stats): number => {
    const ctrl = stats.ctrl || 0;
    const wis = stats.wis || 0;
    return Math.min(100, Math.floor(50 + (ctrl * 0.5) + (wis * 0.2)));
};

export const addMasteryExp = (char: Character | Companion, weaponType: WeaponType, amount: number = 1): { 
    char: Character | Companion, 
    leveledUp: boolean, 
    levelsGained: number,
    oldLevel: number,
    newLevel: number
} => {
    let updatedChar = { 
        ...char, 
        weaponMastery: { ...(char.weaponMastery || {}) } 
    };
    
    const current = { ...(updatedChar.weaponMastery[weaponType] || { level: 0, currentExp: 0 }) };
    const oldLevel = current.level;
    
    if (current.level >= WEAPON_MASTERY_MAX_LEVEL) {
        return { char: updatedChar, leveledUp: false, levelsGained: 0, oldLevel, newLevel: current.level };
    }

    current.currentExp += amount;
    let leveledUp = false;
    let levelsGained = 0;

    while (current.level < WEAPON_MASTERY_MAX_LEVEL) {
        const requiredExp = (current.level + 4) * 10;
        if (current.currentExp >= requiredExp) {
            current.level += 1;
            current.currentExp -= requiredExp;
            leveledUp = true;
            levelsGained += 1;
        } else {
            break;
        }
    }

    if (current.level >= WEAPON_MASTERY_MAX_LEVEL) {
        current.level = WEAPON_MASTERY_MAX_LEVEL;
        current.currentExp = 0;
    }

    updatedChar.weaponMastery[weaponType] = current;
    return { char: updatedChar, leveledUp, levelsGained, oldLevel, newLevel: current.level };
};

/**
 * 레벨에 따른 몬스터 진화 단계를 반환합니다.
 */
export const getMonsterStageByLevel = (level: number): MonsterStage => {
    if (level >= 1000) return MonsterStage.SUPER_ULTIMATE;
    if (level >= 500) return MonsterStage.ULTIMATE;
    if (level >= 200) return MonsterStage.PERFECT;
    if (level >= 100) return MonsterStage.ADULT;
    if (level >= 30) return MonsterStage.CHILD;
    return MonsterStage.BABY;
};

export const applyConsumableEffect = (char: Character | Companion, item: Item, targetEnemy?: Enemy, allCompanions?: Companion[]): { 
    hpGain: number, 
    mpGain: number, 
    fatigueReduction?: number,
    newStatusEffects: ActiveStatus[], 
    removeStatus: string[], 
    logMessages: string[], 
    isCaptured?: boolean, 
    capturedMonster?: CapturedMonster, 
    lvlGain: number, 
    permStatGains: Partial<Stats>,
    isResetFirstSkills?: boolean,
    isResetSecondSkills?: boolean,
    isResetLastSkills?: boolean,
    isResetFinalSkills?: boolean,
    isResetAllSkills?: boolean,
    isResetStats?: boolean,
    isChangeClassName?: boolean,
    isChangeName?: boolean
} => {
    const combinedText = (item.name || "") + " " + (item.description || "") + " " + (item.secondaryOptions || []).join(" ");
    const resurrectionKeywords = ["부활", "되살리기", "재생생명", "Resurrection", "피닉스", "소생", "부활약"];
    const isResurrectionItem = resurrectionKeywords.some(k => combinedText.includes(k));

    if (char.stats.hp <= 0 && !isResurrectionItem) {
        return {
            hpGain: 0,
            mpGain: 0,
            newStatusEffects: [],
            removeStatus: [],
            lvlGain: 0,
            permStatGains: {},
            logMessages: ["전투 불능 상태인 대상에게는 사용할 수 없는 아이템입니다."]
        };
    }

    let hpGain = 0;
    let mpGain = 0;
    let lvlGain = 0;
    const permStatGains: Partial<Stats> = {};
    const newStatusEffects: ActiveStatus[] = [];
    const removeStatus: string[] = [];
    const logMessages: string[] = [];

    // [NEW] 특수 주문서 효과 감지
    let isResetFirstSkills = false;
    let isResetSecondSkills = false;
    let isResetLastSkills = false;
    let isResetFinalSkills = false;
    let isResetAllSkills = false;
    let isResetStats = false;
    let isChangeClassName = false;
    let isChangeName = false;

    if (item.secondaryOptions?.some(opt => opt.includes('[이름 변경]'))) {
        isChangeName = true;
        logMessages.push("이름 변경 주문서 사용");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[클래스명 변경 주문서]'))) {
        isChangeClassName = true;
        logMessages.push("클래스명 변경 주문서 사용");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[퍼스트 클래스 스킬 초기화]'))) {
        isResetFirstSkills = true;
        logMessages.push("퍼스트 클래스 스킬 초기화");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[세컨드 클래스 스킬 초기화]'))) {
        isResetSecondSkills = true;
        logMessages.push("세컨드 클래스 스킬 초기화");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[라스트 클래스 스킬 초기화]'))) {
        isResetLastSkills = true;
        logMessages.push("라스트 클래스 스킬 초기화");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[파이널 클래스 스킬 초기화]'))) {
        isResetFinalSkills = true;
        logMessages.push("파이널 클래스 스킬 초기화");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[각 클래스 별 스킬 초기화]'))) {
        isResetAllSkills = true;
        logMessages.push("모든 클래스 스킬 초기화");
    }
    if (item.secondaryOptions?.some(opt => opt.includes('[스탯 포인트 초기화]'))) {
        isResetStats = true;
        logMessages.push("스탯 포인트 초기화");
    }

    // [NEW] 레벨 상승 및 영구 능력치 상승 감지
    const lvlMatch = combinedText.match(/레벨\s*[+]\s*(\d+)/);
    if (lvlMatch) {
        lvlGain = parseInt(lvlMatch[1]);
        logMessages.push(`레벨 +${lvlGain} 상승`);
    }

    const statNameMap: Record<string, keyof Stats> = {
        '힘': 'str', 'STR': 'str',
        '지력': 'int', 'INT': 'int',
        '지능': 'wis', 'WIS': 'wis',
        '방어': 'def', 'DEF': 'def',
        '민첩': 'agi', 'AGI': 'agi',
        '제어': 'ctrl', 'CTRL': 'ctrl',
        'MaxHP': 'maxHp', '체력': 'maxHp',
        'MaxMP': 'maxMp', '마나': 'maxMp'
    };

    Object.entries(statNameMap).forEach(([name, key]) => {
        const regex = new RegExp(`(${name})\\s*[+]\\s*(\\d+)\\s*\\(영구\\)`, 'i');
        const match = combinedText.match(regex);
        if (match) {
            const val = parseInt(match[2]);
            permStatGains[key] = (permStatGains[key] || 0) + val;
            logMessages.push(`${name} +${val} (영구 상승)`);
        }
    });

    // [NEW] 몬스터 포획 로직
    const captureOption = item.secondaryOptions?.find(opt => opt.includes('몬스터 포획'));
    if (captureOption && targetEnemy) {
        const maxLvlMatch = captureOption.match(/\((\d+)\)/);
        const maxLvl = maxLvlMatch ? parseInt(maxLvlMatch[1]) : 0;
        
        // 사육소 보유 여부 확인 (기지 데이터가 있는 Character만 가능)
        const base = (char as any).base;
        const hasFarm = base?.facilities?.includes('monster_farm') || (base?.facilityLevels && base.facilityLevels['monster_farm'] > 0);
        
        if (!hasFarm) {
            return { hpGain: 0, mpGain: 0, newStatusEffects: [], removeStatus: [], lvlGain: 0, permStatGains: {}, logMessages: ["몬스터 포획에 실패했습니다. 기지에 몬스터 사육소가 필요합니다."] };
        }
        
        if (targetEnemy.level > maxLvl) {
            return { hpGain: 0, mpGain: 0, newStatusEffects: [], removeStatus: [], lvlGain: 0, permStatGains: {}, logMessages: [`포획 실패! ${targetEnemy.name}의 레벨이 그물의 한계를 넘습니다.`] };
        }
        
        // [사용자 요청] 포획 가능 HP 임계값 계산: (10% + (플레이어 레벨 - 몬스터 레벨) * 0.1%), 최소 10%
        const hpThresholdPercent = Math.max(0.1, 0.1 + (char.level - targetEnemy.level) * 0.001);
        if (targetEnemy.hp > targetEnemy.maxHp * hpThresholdPercent) {
            const thresholdDisplay = (hpThresholdPercent * 100).toFixed(1);
            return { hpGain: 0, mpGain: 0, newStatusEffects: [], removeStatus: [], lvlGain: 0, permStatGains: {}, logMessages: [`포획 실패! ${targetEnemy.name}의 기운이 너무 강합니다. (체력 ${thresholdDisplay}% 이하일 때 가능)`] };
        }

        // [사용자 요청] 포획 성공률 계산: (포획그물 제한 레벨 - 몬스터 레벨)%, 최대 100%
        // [NEW] 테이밍 숙련도 보너스: 레벨당 1% 추가
        const tamingLevel = (char as any).professions?.taming?.level || 1;
        const tamingBonus = tamingLevel; 
        
        // [NEW] 사육사(Breeder) 보너스 추가: 활성 동료 사육사들의 숙련 레벨 합산
        let breederBonus = 0;
        const activeCompanions = allCompanions || (char as any).companions || [];
        if (Array.isArray(activeCompanions)) {
            const breeders = activeCompanions.filter(c => c.job === JobType.BREEDER);
            breederBonus = breeders.reduce((sum, b) => sum + (b.professions?.breeding?.level || 1), 0);
            
            // 만약 사용자가 플레이어(Character) 본인이고 사육사라면, 
            // 플레이어는 companions 리스트에 없으므로 따로 추가
            const isCompanion = (char as any).id && activeCompanions.some(c => c.id === (char as any).id);
            if (!isCompanion && (char as any).job === JobType.BREEDER) {
                breederBonus += (char as any).professions?.breeding?.level || 1;
            }
        }

        const successRate = Math.min(100, (maxLvl - targetEnemy.level) + tamingBonus + breederBonus);
        const roll = Math.random() * 100;
        
        if (roll > successRate) {
            const breederBonusStr = breederBonus > 0 ? ` (사육사 보너스 +${breederBonus}%)` : '';
            return { hpGain: 0, mpGain: 0, newStatusEffects: [], removeStatus: [], lvlGain: 0, permStatGains: {}, logMessages: [`포획 실패! ${targetEnemy.name}이(가) 그물을 빠져나갔습니다. (성공률: ${successRate.toFixed(1)}%${breederBonusStr})`] };
        }
        
        // 성공! CapturedMonster 객체 생성
        const capturedMaxHp = Math.max(1, Math.floor(targetEnemy.maxHp / 10));
        const capturedStats = targetEnemy.stats ? {
            hp: capturedMaxHp,
            maxHp: capturedMaxHp,
            mp: Math.max(1, Math.floor((targetEnemy.stats.mp || 10))),
            maxMp: Math.max(1, Math.floor((targetEnemy.stats.maxMp || 10))),
            str: Math.max(1, Math.floor((targetEnemy.stats.str || 1))),
            int: Math.max(1, Math.floor((targetEnemy.stats.int || 1))),
            def: Math.max(1, Math.floor((targetEnemy.stats.def || 1))),
            wis: Math.max(1, Math.floor((targetEnemy.stats.wis || 1))),
            agi: Math.max(1, Math.floor((targetEnemy.stats.agi || 1))),
            ctrl: Math.max(1, Math.floor((targetEnemy.stats.ctrl || 1)))
        } : undefined;

        const captured: CapturedMonster = {
            ...targetEnemy,
            id: `captured_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            hp: capturedMaxHp,
            maxHp: capturedMaxHp,
            stats: capturedStats,
            rank: 'C',
            affection: 10,
            isTamed: false,
            capturedDate: (char as any).currentDate || 'Unknown',
            stage: getMonsterStageByLevel(targetEnemy.level),
            hunger: 50,
            cleanliness: 50,
            trainingLog: { str: 0, int: 0, def: 0, agi: 0, magic: 0 },
            currentExp: 0,
            maxExp: (targetEnemy.level || 1) * 100,
            statPoints: 0
        };
        
        return { 
            hpGain: 0, mpGain: 0, newStatusEffects: [], removeStatus: [], lvlGain: 0, permStatGains: {},
            logMessages: [`포획 성공! ${targetEnemy.name}을(를) 사육소로 전송했습니다.`],
            isCaptured: true,
            capturedMonster: captured,
            isResetFirstSkills,
            isResetSecondSkills,
            isResetLastSkills,
            isResetFinalSkills,
            isResetAllSkills,
            isResetStats,
            isChangeClassName
        };
    }
    
    // [NEW] 적에게 상태이상 부여 로직 추가 (사용자 요청 사항)
    if (targetEnemy) {
        item.secondaryOptions?.forEach(opt => {
            // 패턴 예: "감전 상태이상 부여(50%)"
            const statusGrantMatch = opt.match(/(.+?)\s*상태이상\s*부여\s*\((\d+)%\)/);
            if (statusGrantMatch) {
                const ailmentName = statusGrantMatch[1].trim();
                const baseChance = parseInt(statusGrantMatch[2]);
                
                if (STATUS_AILMENTS_LIST.includes(ailmentName)) {
                    // 적의 저항력 고려
                    const finalChance = calculateStatusChance(baseChance, targetEnemy.stats || { ctrl: 10 } as Stats);
                    const roll = Math.random() * 100;
                    
                    if (roll < finalChance) {
                        const ailmentData = STATUS_AILMENTS_DATA[ailmentName];
                        let duration = 3;
                        if (["빙결", "속박", "소멸", "혼란", "감전", "중독"].includes(ailmentName)) duration = 2;
                        
                        let val = calculateDotDamage(ailmentName, targetEnemy.maxHp, targetEnemy.stats, char.stats);

                        targetEnemy.statusEffects.push({
                            name: ailmentName,
                            duration,
                            effect: ailmentData.desc,
                            val
                        });
                        logMessages.push(`${targetEnemy.name}에게 ${ailmentName} 상태이상을 부여했습니다!`);
                    } else {
                        logMessages.push(`${targetEnemy.name}이(가) ${ailmentName}에 저항했습니다.`);
                    }
                }
            }
        });
    }

    const targetFinalStats = calculateFinalStats(char).finalStats;
    const finalMaxHp = Math.max(1, targetFinalStats?.maxHp || char.stats?.maxHp || 100);
    const finalMaxMp = Math.max(1, targetFinalStats?.maxMp || char.stats?.maxMp || 100);

    const hpMpFullMatch = combinedText.match(/HP\s*\/\s*MP\s*(완전|100%)\s*회복/i);
    if (hpMpFullMatch) {
        hpGain = finalMaxHp;
        mpGain = finalMaxMp;
    } else {
        const hpMpPercentMatch = combinedText.match(/HP\s*\/\s*MP\s*(\d+)%\s*회복/i);
        if (hpMpPercentMatch) {
            const percent = parseInt(hpMpPercentMatch[1]);
            hpGain += Math.floor(finalMaxHp * (percent / 100));
            mpGain += Math.floor(finalMaxMp * (percent / 100));
        }
    }

    const hpFullMatch = combinedText.match(/HP\s*(완전|100%)\s*회복/i);
    if (hpFullMatch) {
        hpGain = finalMaxHp;
    } else if (!hpMpFullMatch) {
        const hpPercentMatch = combinedText.match(/(?:^|[^/])HP\s*(\d+)%\s*회복/i);
        if (hpPercentMatch) {
            const percent = parseInt(hpPercentMatch[1]);
            hpGain += Math.floor(finalMaxHp * (percent / 100));
        }
        const hpFlatMatch = combinedText.match(/HP\s*(\d+)\s*회복/i);
        if (hpFlatMatch) hpGain += parseInt(hpFlatMatch[1]);
    }

    const mpFullMatch = combinedText.match(/MP\s*(완전|100%)\s*회복/i);
    if (mpFullMatch) {
        mpGain = finalMaxMp;
    } else if (!hpMpFullMatch) {
        const mpPercentMatch = combinedText.match(/(?:^|[^/])MP\s*(\d+)%\s*회복/i);
        if (mpPercentMatch) {
            const percent = parseInt(mpPercentMatch[1]);
            mpGain += Math.floor(finalMaxMp * (percent / 100));
        }
        const mpFlatMatch = combinedText.match(/MP\s*(\d+)\s*회복/i);
        if (mpFlatMatch) mpGain += parseInt(mpFlatMatch[1]);
    }

    const itemName = item.name || '';

    // [NEW] 피로도 회복(감소) 효과 처리
    let fatigueReduction = 0;
    const fatigueMatch = combinedText.match(/피로도\s*(-?\d+)\s*(?:감소|회복)/);
    if (fatigueMatch) {
        fatigueReduction = Math.abs(parseInt(fatigueMatch[1]));
        logMessages.push(`피로도 -${fatigueReduction} 감소`);
    } else if (itemName.includes('피로회복제') || itemName.includes('피로 회복제') || itemName.includes('피로 포션')) {
        if (itemName.includes('궁극') || itemName.includes('신화') || itemName.includes('최상급')) {
            fatigueReduction = 100;
        } else if (itemName.includes('특급') || itemName.includes('유니크')) {
            fatigueReduction = 85;
        } else if (itemName.includes('상급') || itemName.includes('에픽')) {
            fatigueReduction = 70;
        } else if (itemName.includes('강력한') || itemName.includes('중급') || itemName.includes('레어')) {
            fatigueReduction = 50;
        } else if (itemName.includes('하급') || itemName.includes('매직')) {
            fatigueReduction = 35;
        } else {
            fatigueReduction = 20;
        }
        logMessages.push(`피로도 -${fatigueReduction} 감소`);
    }

    if (itemName.includes('엘릭서') && !itemName.includes('파워')) { hpGain = Math.floor(finalMaxHp * 0.5); mpGain = Math.floor(finalMaxMp * 0.5); } 
    if (itemName.includes('파워 엘릭서')) { hpGain = finalMaxHp; mpGain = finalMaxMp; } 
    if (itemName.includes('신의 약')) { hpGain = finalMaxHp; mpGain = finalMaxMp; removeStatus.push('ALL'); }
    if (itemName.includes('만병통치약')) { removeStatus.push('ALL'); }

    if (hpGain === 0 && mpGain === 0 && (itemName.includes('포션') || itemName.includes('체력') || itemName.includes('마나'))) {
        if (itemName.includes('체력') || itemName.includes('HP') || itemName.includes('포션')) hpGain = Math.floor(finalMaxHp * 0.3) + 50;
        if (itemName.includes('마나') || itemName.includes('MP')) mpGain = Math.floor(finalMaxMp * 0.3) + 30;
    }
       // [NEW] 중독 상태일 때 회복 효율 감소 적용
    const isPoisoned = char.statusEffects?.some(s => s.name === "중독");
    if (isPoisoned && hpGain > 0) {
        hpGain = Math.floor(hpGain * 0.5);
        logMessages.push("(중독 상태로 인해 회복 효율 감소)");
    }

 // "해독제" 특수 처리 및 중독 우선 제거
    if (item.name.includes("해독제")) {
        removeStatus.push("중독");
    }
    const cureMatch = combinedText.match(/상태이상 해제\s*\((.+?)\)/);
    if (cureMatch) {
        const targets = cureMatch[1].split(',').map(s => s.trim());
        targets.forEach(t => removeStatus.push(t));
    }
    if (combinedText.includes('모든 상태이상 해제')) removeStatus.push('ALL');

    // 버프 옵션 매핑 정의 (공백이 있거나 없어도 매칭되도록 유연한 정규식 패턴과 대응 표준 코드)
    const buffOptionDefinitions: { pattern: RegExp, code: string, korName: string, isAllStats?: boolean }[] = [
        { pattern: /(?:물리\s*공격력|P\.Atk)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'P.Atk', korName: '물리 공격력' },
        { pattern: /(?:마법\s*공격력|M\.Atk)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'M.Atk', korName: '마법 공격력' },
        { pattern: /(?:물리\s*방어력|P\.Def)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'P.Def', korName: '물리 방어력' },
        { pattern: /(?:마법\s*방어력|M\.Def)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'M.Def', korName: '마법 방어력' },
        { pattern: /(?:치명타율|치명타|CritChance)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'CritChance', korName: '치명타율' },
        { pattern: /(?:상태이상\s*저항률|상태이상\s*저항|StatusResist)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'StatusResist', korName: '상태이상 저항' },
        { pattern: /(?:물리\s*명중률|물리\s*명중|P\.Acc|Acc)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'Acc', korName: '물리 명중' },
        { pattern: /(?:마법\s*명중률|마법\s*명중|M\.Acc|MAcc)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'MAcc', korName: '마법 명중' },
        { pattern: /(?:물리\s*회피율|물리\s*회피|P\.Eva|Eva)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'Eva', korName: '물리 회피' },
        { pattern: /(?:마법\s*회피율|마법\s*회피|M\.Eva|MEva)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'MEva', korName: '마법 회피' },
        { pattern: /(?:모든\s*스탯|전체\s*스탯|전\s*스탯)\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'ALL_STATS', korName: '모든 스탯', isAllStats: true },
        { pattern: /\bSTR\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'STR', korName: 'STR' },
        { pattern: /\bINT\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'INT', korName: 'INT' },
        { pattern: /\bWIS\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'WIS', korName: 'WIS' },
        { pattern: /\bDEF\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'DEF', korName: 'DEF' },
        { pattern: /\bAGI\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'AGI', korName: 'AGI' },
        { pattern: /\bCTRL\s*([+-]?\d+(?:\.\d+)?)\s*%/i, code: 'CTRL', korName: 'CTRL' }
    ];

    const buffMap = new Map<string, { val: number, korName: string }>();
    const textsToScan = [
        ...(item.secondaryOptions || []),
        item.description || "",
        item.name || ""
    ];

    textsToScan.forEach(text => {
        buffOptionDefinitions.forEach(def => {
            const match = text.match(def.pattern);
            if (match) {
                const val = parseFloat(match[1]);
                if (def.isAllStats) {
                    const allStatsList: { code: string, kor: string }[] = [
                        { code: 'STR', kor: 'STR' },
                        { code: 'INT', kor: 'INT' },
                        { code: 'WIS', kor: 'WIS' },
                        { code: 'DEF', kor: 'DEF' },
                        { code: 'AGI', kor: 'AGI' },
                        { code: 'CTRL', kor: 'CTRL' }
                    ];
                    allStatsList.forEach(st => {
                        buffMap.set(st.code, { val, korName: st.kor });
                    });
                } else {
                    buffMap.set(def.code, { val, korName: def.korName });
                }
            }
        });
    });

    if (buffMap.size > 0) {
        const effectParts: string[] = [];
        const korParts: string[] = [];
        buffMap.forEach(({ val, korName }, code) => {
            effectParts.push(`${code} +${val}%`);
            korParts.push(`${korName} +${val}%`);
        });

        const duration = (item.duration && item.duration <= 50) ? item.duration : (combinedText.includes("15턴") ? 15 : combinedText.includes("5턴") ? 5 : 10);
        newStatusEffects.push({
            name: item.name,
            duration,
            effect: effectParts.join(', ')
        });
        logMessages.push(`${item.name} 효과 적용: ${korParts.join(', ')} (${duration}턴)`);
    }

    // [NEW] 속성 저항 / 방어 소모품(포션/주문서) 효과 처리
    const eleResMatch = combinedText.match(/((?:화염|빙결|전격|대지|광휘|암흑|해수|질풍|강철|태양|월광|초화|모든\s*속성|전체\s*속성)\s*(?:속성\s*)?(?:저항|내성|방어))\s*\+?(\d+)%/i);
    if (eleResMatch && buffMap.size === 0) {
        const textLabel = eleResMatch[1].trim();
        const val = parseInt(eleResMatch[2]);
        const duration = (item.duration && item.duration <= 50) ? item.duration : (combinedText.includes("15턴") ? 15 : combinedText.includes("5턴") ? 5 : 10);
        newStatusEffects.push({
            name: item.name,
            duration,
            effect: `${textLabel} +${val}%`
        });
        logMessages.push(`${item.name} 효과 적용: ${textLabel} +${val}% (${duration}턴)`);
    }

    let elixirDuration = (item.duration && item.duration >= 60) ? item.duration : 600;
    if (!item.duration || item.duration < 60) {
        if (combinedText.includes("1시간") || combinedText.includes("60분") || combinedText.includes("3600초")) {
            elixirDuration = 3600;
        } else if (combinedText.includes("30분") || combinedText.includes("3600초" /* fallback */) || combinedText.includes("1800초")) {
            elixirDuration = 1800;
        }
    }
    const elixirDurLabel = elixirDuration >= 3600 ? `${Math.floor(elixirDuration / 3600)}시간` : `${Math.floor(elixirDuration / 60)}분`;

    const expPotionMultMap: Record<string, number> = {
        'Normal': 1.2, 'Magic': 1.4, 'Rare': 1.5, 'Epic': 1.8, 'Unique': 2.0, 'Legendary': 3.0, 'Mythic': 5.0,
        [ItemRarity.NORMAL]: 1.2, [ItemRarity.MAGIC]: 1.4, [ItemRarity.RARE]: 1.5, [ItemRarity.EPIC]: 1.8, [ItemRarity.UNIQUE]: 2.0, [ItemRarity.LEGENDARY]: 3.0, [ItemRarity.MYTHTIC]: 5.0
    };
    
    let expVal = 0;
    const isExpPotion = (combinedText.includes("경험치") || combinedText.toUpperCase().includes("EXP")) && 
                        !combinedText.includes("드롭") && !combinedText.includes("Drop") && 
                        !combinedText.includes("무기숙련") && !combinedText.includes("WeaponMastery") && 
                        !combinedText.includes("스킬숙련") && !combinedText.includes("SkillMastery");
    
    if (isExpPotion) {
        const multMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*배/) || combinedText.match(/(?:EXP|exp)\s*x?\s*(\d+(?:\.\d+)?)/i);
        if (multMatch) {
            expVal = parseFloat(multMatch[1]);
        } else {
            expVal = expPotionMultMap[item.rarity] || 1.5;
        }
    }

    if (expVal > 1) {
        newStatusEffects.push({
            name: "경험치 비약",
            duration: elixirDuration,
            effect: `EXP x${expVal}`
        });
        logMessages.push(`${item.name} 효과 적용: 경험치 획득량 ${expVal}배 (${elixirDurLabel})`);
    }

    // 골드 비약 감지
    let goldVal = 0;
    const isGoldPotion = (combinedText.includes("골드") || combinedText.toUpperCase().includes("GOLD")) && 
                        !combinedText.includes("드롭") && !combinedText.includes("Drop") && 
                        !combinedText.includes("무기숙련") && !combinedText.includes("WeaponMastery") && 
                        !combinedText.includes("스킬숙련") && !combinedText.includes("SkillMastery");
    
    if (isGoldPotion) {
        const multMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*배/) || combinedText.match(/(?:GOLD|gold)\s*x?\s*(\d+(?:\.\d+)?)/i);
        if (multMatch) {
            goldVal = parseFloat(multMatch[1]);
        } else {
            goldVal = expPotionMultMap[item.rarity] || 1.5;
        }
    }

    if (goldVal > 1) {
        newStatusEffects.push({
            name: "골드 비약",
            duration: elixirDuration,
            effect: `GOLD x${goldVal}`
        });
        logMessages.push(`${item.name} 효과 적용: 골드 획득량 ${goldVal}배 (${elixirDurLabel})`);
    }

    // 드롭률 비약 감지
    let dropVal = 0;
    const dropMatch = combinedText.match(/드롭률\s*(\d+(?:\.\d+)?)\s*배/) || combinedText.match(/(?:Drop|drop)\s*x?\s*(\d+(?:\.\d+)?)/i);
    if (dropMatch) {
        dropVal = parseFloat(dropMatch[1]);
    } else if (item.name && item.name.includes("드롭률")) {
        const dropRarityMult: Record<string, number> = {
            'Normal': 1.2, 'Magic': 1.5, 'Rare': 2.0, 'Unique': 3.0, 'Epic': 4.0, 'Legendary': 5.0, 'Mythic': 5.0,
            [ItemRarity.NORMAL]: 1.2, [ItemRarity.MAGIC]: 1.5, [ItemRarity.RARE]: 2.0, [ItemRarity.UNIQUE]: 3.0, [ItemRarity.EPIC]: 4.0, [ItemRarity.LEGENDARY]: 5.0, [ItemRarity.MYTHTIC]: 5.0
        };
        dropVal = dropRarityMult[item.rarity] || 1.5;
    }
    if (dropVal > 1) {
        newStatusEffects.push({
            name: "드롭률 비약",
            duration: elixirDuration,
            effect: `Drop x${dropVal}`
        });
        logMessages.push(`${item.name} 효과 적용: 전리품 드롭률 ${dropVal}배 (${elixirDurLabel})`);
    }

    // 무기숙련도 비약 감지
    let weaponVal = 0;
    const weaponMatch = combinedText.match(/무기숙련도\s*(\d+(?:\.\d+)?)\s*배/) || combinedText.match(/(?:WeaponMastery|weapon_mastery)\s*x?\s*(\d+(?:\.\d+)?)/i);
    if (weaponMatch) {
        weaponVal = parseFloat(weaponMatch[1]);
    } else if (item.name && item.name.includes("무기숙련도")) {
        const weaponRarityMult: Record<string, number> = {
            'Normal': 1.0, 'Magic': 1.0, 'Rare': 2.0, 'Epic': 3.0, 'Unique': 4.0, 'Legendary': 5.0, 'Mythic': 5.0,
            [ItemRarity.NORMAL]: 1.0, [ItemRarity.MAGIC]: 1.0, [ItemRarity.RARE]: 2.0, [ItemRarity.EPIC]: 3.0, [ItemRarity.UNIQUE]: 4.0, [ItemRarity.LEGENDARY]: 5.0, [ItemRarity.MYTHTIC]: 5.0
        };
        weaponVal = weaponRarityMult[item.rarity] || 1.0;
    }
    if (weaponVal > 1) {
        newStatusEffects.push({
            name: "무기숙련도 비약",
            duration: elixirDuration,
            effect: `WeaponMastery x${weaponVal}`
        });
        logMessages.push(`${item.name} 효과 적용: 전투 시 획득 무기숙련도 ${weaponVal}배 (${elixirDurLabel})`);
    }

    // 스킬숙련도 비약 감지
    let skillVal = 0;
    const skillMatch = combinedText.match(/스킬숙련도\s*(\d+(?:\.\d+)?)\s*배/) || combinedText.match(/(?:SkillMastery|skill_mastery)\s*x?\s*(\d+(?:\.\d+)?)/i);
    if (skillMatch) {
        skillVal = parseFloat(skillMatch[1]);
    } else if (item.name && item.name.includes("스킬숙련도")) {
        const skillRarityMult: Record<string, number> = {
            'Normal': 1.0, 'Magic': 1.0, 'Rare': 2.0, 'Epic': 3.0, 'Unique': 4.0, 'Legendary': 5.0, 'Mythic': 5.0,
            [ItemRarity.NORMAL]: 1.0, [ItemRarity.MAGIC]: 1.0, [ItemRarity.RARE]: 2.0, [ItemRarity.EPIC]: 3.0, [ItemRarity.UNIQUE]: 4.0, [ItemRarity.LEGENDARY]: 5.0, [ItemRarity.MYTHTIC]: 5.0
        };
        skillVal = skillRarityMult[item.rarity] || 1.0;
    }
    if (skillVal > 1) {
        newStatusEffects.push({
            name: "스킬숙련도 비약",
            duration: elixirDuration,
            effect: `SkillMastery x${skillVal}`
        });
        logMessages.push(`${item.name} 효과 적용: 전투 시 획득 스킬숙련도 ${skillVal}배 (${elixirDurLabel})`);
    }

    if (isResurrectionItem && char.isDead) {
        char.isDead = false;
        logMessages.push(`${char.name}이(가) 기적처럼 부활했습니다!`);
    }

    if (hpGain > 0) logMessages.push(`HP +${hpGain} 회복`);
    if (mpGain > 0) logMessages.push(`MP +${mpGain} 회복`);
    if (removeStatus.length > 0) {
        const displayStatus = removeStatus.map(s => s === 'ALL' ? '모든 상태이상' : s);
        logMessages.push(`상태이상 해제: ${displayStatus.join(', ')}`);
    }

    // 요리(음식) 아이템 섭취 처리 (모든 요리의 스탯 증가는 일시적 버프)
    const foodResult = handleCookedFoodConsumption(item);
    if (foodResult.isFood) {
        hpGain += foodResult.hpGain;
        mpGain += foodResult.mpGain;
        newStatusEffects.push(...foodResult.newStatusEffects);
        logMessages.push(...foodResult.logMessages);
    }

    return { 
        hpGain, 
        mpGain, 
        fatigueReduction,
        newStatusEffects, 
        removeStatus, 
        lvlGain, 
        permStatGains, 
        logMessages,
        isResetFirstSkills,
        isResetSecondSkills,
        isResetLastSkills,
        isResetFinalSkills,
        isResetAllSkills,
        isResetStats,
        isChangeClassName,
        isChangeName
    };
};

export const generateHatchedMonster = (rank: 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS', currentDate: string, facilityLevel: number): CapturedMonster => {
    const monster = generateProceduralEnemy(10);
    
    const rankMult = { 'C': 1, 'B': 1.2, 'A': 1.5, 'S': 2, 'SS': 3, 'SSS': 5 }[rank];
    monster.maxHp = Math.max(1, Math.floor((monster.maxHp * rankMult) / 10));
    monster.hp = monster.maxHp;
    if (monster.stats) {
        monster.stats.maxHp = monster.maxHp;
        monster.stats.hp = monster.hp;
        monster.stats.mp = Math.max(1, Math.floor((monster.stats.mp * rankMult)));
        monster.stats.maxMp = Math.max(1, Math.floor((monster.stats.maxMp * rankMult)));
        monster.stats.str = Math.max(1, Math.floor((monster.stats.str * rankMult)));
        monster.stats.int = Math.max(1, Math.floor((monster.stats.int * rankMult)));
        monster.stats.def = Math.max(1, Math.floor((monster.stats.def * rankMult)));
        monster.stats.agi = Math.max(1, Math.floor((monster.stats.agi * rankMult)));
        monster.stats.ctrl = Math.max(1, Math.floor((monster.stats.ctrl * rankMult)));
        monster.stats.wis = Math.max(1, Math.floor((monster.stats.wis * rankMult)));
    }

    const baseHeight = Math.floor(Math.random() * 200) + 50; 
    const height = Math.floor(baseHeight * rankMult);
    const baseWeight = Math.floor(Math.random() * 100) + 5;
    const weight = Math.floor(baseWeight * rankMult * (height / 100));

    const dispositions: ('온순' | '중립' | '공격적')[] = ['온순', '중립', '공격적'];
    const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];

    const productions = [
        "마력의 구슬", "고급 가죽", "신선한 우유", "황금 깃털", "약초 잎사귀", "속성 파편"
    ];
    let production = productions[Math.floor(Math.random() * productions.length)];
    if (monster.shinryokuType === '초화계' && Math.random() < 0.5) production = "약초 잎사귀";
    if (monster.shinryokuType === '전격계' && Math.random() < 0.5) production = "마력의 구슬";
    
    return {
        ...monster,
        id: Math.random().toString(36).substring(7),
        rank: rank,
        affection: 20,
        isTamed: true,
        capturedDate: currentDate,
        disposition: disposition,
        production: production,
        stage: getMonsterStageByLevel(monster.level),
        hunger: 100,
        cleanliness: 100,
        trainingLog: { str: 0, int: 0, def: 0, agi: 0, magic: 0 },
        evolutionReady: false,
        currentExp: 0,
        maxExp: 100 * 10,
        height: height,
        weight: weight,
        isCustomMonster: false
    };
};

export const checkAndApplyDeparture = (char: Character): { newChar: Character, leftNames: string[] } => {
    let newChar = { ...char };
    const leftNames: string[] = [];
    const departedComps: Companion[] = [];
    
    const remainingCompanions = [];
    for (const comp of newChar.companions) {
        if ((comp.affection !== undefined && comp.affection < 0) || ((comp.affection || 0) + (comp.loyalty || 0)) <= -100) {
            leftNames.push(comp.name);
            departedComps.push(comp);
        } else {
            remainingCompanions.push(comp);
        }
    }
    
    const remainingInactive = [];
    if (newChar.inactiveCompanions) {
        for (const comp of newChar.inactiveCompanions) {
            if ((comp.affection !== undefined && comp.affection < 0) || ((comp.affection || 0) + (comp.loyalty || 0)) <= -100) {
                leftNames.push(comp.name);
                departedComps.push(comp);
            } else {
                remainingInactive.push(comp);
            }
        }
    }
    
    if (leftNames.length > 0) {
        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        const currentYear = getYear(newChar.currentDate || '2000-01-01');
        departedComps.forEach(comp => {
            const socialEntry: any = {
                ...comp,
                origin: comp.job || 'Companion',
                originName: '과거의 인연 (호감도 하락)',
                isPastConnection: true,
                isPurged: false,
                affection: Math.max(-100, Math.min(100, comp.affection ?? -1)),
            };
            if (socialEntry.birthYear) {
                socialEntry.age = `${currentYear - socialEntry.birthYear}세`;
            }
            const existingIdx = newChar.socialNetwork!.findIndex(n => n.id === comp.id);
            if (existingIdx !== -1) {
                newChar.socialNetwork![existingIdx] = {
                    ...newChar.socialNetwork![existingIdx],
                    ...socialEntry,
                };
            } else {
                newChar.socialNetwork!.push(socialEntry);
            }
        });

        newChar = {
            ...newChar,
            companions: remainingCompanions,
            inactiveCompanions: remainingInactive
        };
    }
    
    return { newChar, leftNames };
};

/**
 * [NEW] 데이터 초고압축 함수 (LZ-String Base64 활용) - 초경량 동기 압축
 */
export const compressDataSync = (data: any): string => {
    try {
        const json = typeof data === 'string' ? data : JSON.stringify(data);
        const compressed = LZString.compressToBase64(json);
        return "LZ:" + compressed;
    } catch (e) {
        console.error("compressDataSync failed, falling back to base64", e);
        return btoa(unescape(encodeURIComponent(typeof data === 'string' ? data : JSON.stringify(data))));
    }
};

/**
 * [NEW] 데이터 복원 함수 (LZ-String, Deflate v3, Gzip v2, Base64, JSON 등 모든 포맷 동기 복원)
 */
export const decompressDataSync = (code: string): any => {
    if (!code || typeof code !== 'string') {
        throw new Error("유효하지 않은 데이터 코드입니다.");
    }
    const trimmed = code.trim();

    // 1. LZ: 접두사 포맷
    if (trimmed.startsWith('LZ:')) {
        const payload = trimmed.substring(3);
        const decompressed = LZString.decompressFromBase64(payload);
        if (decompressed) {
            return JSON.parse(decompressed);
        }
    }

    // 2. 접두사 없는 순수 LZ-String Base64 시도
    try {
        const decompressed = LZString.decompressFromBase64(trimmed);
        if (decompressed && (decompressed.startsWith('{') || decompressed.startsWith('['))) {
            return JSON.parse(decompressed);
        }
    } catch (e) {
        // 계속 진행
    }

    // 3. 평문 JSON인 경우
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            // 계속 진행
        }
    }

    // 4. 구형 URI-encoded Base64 형식
    try {
        const decoded = decodeURIComponent(escape(atob(trimmed)));
        if (decoded && (decoded.startsWith('{') || decoded.startsWith('['))) {
            return JSON.parse(decoded);
        }
    } catch (e) {
        // 계속 진행
    }

    // 5. 일반 atob Base64 형식
    try {
        const decoded = atob(trimmed);
        if (decoded && (decoded.startsWith('{') || decoded.startsWith('['))) {
            return JSON.parse(decoded);
        }
    } catch (e) {
        // 계속 진행
    }

    throw new Error("코드 데이터를 복원할 수 없습니다. 올바른 형식인지 확인해주세요.");
};

/**
 * [NEW] 비동기 데이터 초고속 압축 함수 (Web Streams API CompressionStream 'deflate' v3 포맷)
 * 네이티브 브라우저 C++ 가속을 통해 대용량 세이브도 0.01초 이내로 즉시 압축
 */
export const compressData = async (data: any): Promise<string> => {
    try {
        const json = typeof data === 'string' ? data : JSON.stringify(data);
        if (typeof CompressionStream !== 'undefined') {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);
            const stream = new Blob([bytes]).stream();
            const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
            const response = new Response(compressedStream);
            const buffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(buffer);
            
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize) as any);
            }
            return "v3:" + btoa(binary);
        }
    } catch (e) {
        console.warn("Native CompressionStream failed, falling back to LZ-String", e);
    }
    return compressDataSync(data);
};

/**
 * [NEW] 비동기 데이터 해제 함수 (DecompressionStream v3/v2 및 LZString/Base64 전체 호환)
 */
export const decompressData = async (code: string): Promise<any> => {
    const trimmed = code.trim();
    if (trimmed.startsWith('v3:')) {
        try {
            const base64 = trimmed.substring(3);
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const stream = new Blob([bytes]).stream();
            const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
            const response = new Response(decompressedStream);
            const json = await response.text();
            return JSON.parse(json);
        } catch (e) {
            console.error("v3 deflate decompression failed, trying sync", e);
        }
    } else if (trimmed.startsWith('v2:')) {
        try {
            const base64 = trimmed.substring(3);
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const stream = new Blob([bytes]).stream();
            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
            const response = new Response(decompressedStream);
            const json = await response.text();
            return JSON.parse(json);
        } catch (e) {
            console.error("v2 gzip decompression failed, trying sync", e);
        }
    }
    return decompressDataSync(code);
};

/**
 * [NEW] 세이브 데이터 정제 및 최적화 함수
 * - 기본값(preserveMedia: true): 스킬 영상, 썸네일, 일러스트 등 모든 커스텀 미디어를 100% 온전히 보존
 * - 수천 개 이상 비대해진 AI 대화 내역과 연표 로그만 최신 100개로 정리하여 데이터 용량을 최적화
 * - 내보내기 시 사용자가 미디어 제외를 선택한 경우(preserveMedia: false)에만 미디어를 걸러냄
 */
export const optimizeSaveData = (rawData: any, options: { preserveMedia?: boolean } = { preserveMedia: true }): any => {
    if (!rawData) return null;
    
    let data: any;
    try {
        data = JSON.parse(JSON.stringify(rawData));
    } catch (e) {
        return rawData;
    }

    const preserveMedia = options?.preserveMedia !== false;

    // 1. 중첩된 saveCode 제거 (최상위, 캐릭터, 동료)
    if (data.saveCode) delete data.saveCode;
    if (data.character?.saveCode) delete data.character.saveCode;

    // 2. 메시지 내역(AI 채팅 기록) 최신 100개 보존 (수천 개 누적으로 인한 수십 MB 비대화 방지)
    if (Array.isArray(data.messages) && data.messages.length > 100) {
        data.messages = data.messages.slice(-100);
    }

    // 3. 캐릭터 로그 & 세계사 기록 최신 100개 보존 및 실시간 비약 지속시간 동기화
    if (data.character) {
        try {
            data.character = elixirRealtimeService.syncToCharacter(data.character);
        } catch (_) {}
        if (Array.isArray(data.character.logs) && data.character.logs.length > 100) {
            data.character.logs = data.character.logs.slice(-100);
        }
        if (Array.isArray(data.character.worldHistory) && data.character.worldHistory.length > 100) {
            data.character.worldHistory = data.character.worldHistory.slice(-100);
        }
        if (data.character.schoolData?.history && Array.isArray(data.character.schoolData.history) && data.character.schoolData.history.length > 50) {
            data.character.schoolData.history = data.character.schoolData.history.slice(-50);
        }

        // 4. 미디어 처리: preserveMedia가 false일 때만 미디어를 제외 (초경량 텍스트 모드)
        const sanitizeMediaUrl = (url?: string): string | undefined => {
            if (!url) return url;
            if (!preserveMedia) {
                // 초경량 모드: 텍스트에 포함된 인라인 Data URL 제외
                if (typeof url === 'string' && url.startsWith('data:')) {
                    return '';
                }
            }
            return url;
        };

        if (data.character.visualUrl) data.character.visualUrl = sanitizeMediaUrl(data.character.visualUrl);
        if (data.character.bgmUrl) data.character.bgmUrl = sanitizeMediaUrl(data.character.bgmUrl);

        // 스킬 미디어 보존 검사
        if (Array.isArray(data.character.skills)) {
            data.character.skills.forEach((s: any) => {
                if (s.videoUrl) s.videoUrl = sanitizeMediaUrl(s.videoUrl);
                if (s.illustrationUrl) s.illustrationUrl = sanitizeMediaUrl(s.illustrationUrl);
                if (s.imageUrl) s.imageUrl = sanitizeMediaUrl(s.imageUrl);
            });
        }
        if (Array.isArray(data.character.bondSkills)) {
            data.character.bondSkills.forEach((s: any) => {
                if (s.videoUrl) s.videoUrl = sanitizeMediaUrl(s.videoUrl);
                if (s.illustrationUrl) s.illustrationUrl = sanitizeMediaUrl(s.illustrationUrl);
                if (s.imageUrl) s.imageUrl = sanitizeMediaUrl(s.imageUrl);
            });
        }

        // 동료들의 로그 및 미디어 보존 검사
        const cleanCompanion = (c: any) => {
            if (!c) return;
            if (c.saveCode) delete c.saveCode;
            if (Array.isArray(c.logs) && c.logs.length > 50) {
                c.logs = c.logs.slice(-50);
            }
            if (c.visualUrl) c.visualUrl = sanitizeMediaUrl(c.visualUrl);
            if (Array.isArray(c.skills)) {
                c.skills.forEach((s: any) => {
                    if (s.videoUrl) s.videoUrl = sanitizeMediaUrl(s.videoUrl);
                    if (s.illustrationUrl) s.illustrationUrl = sanitizeMediaUrl(s.illustrationUrl);
                    if (s.imageUrl) s.imageUrl = sanitizeMediaUrl(s.imageUrl);
                });
            }
        };

        if (Array.isArray(data.character.companions)) {
            data.character.companions.forEach(cleanCompanion);
        }
        if (Array.isArray(data.character.inactiveCompanions)) {
            data.character.inactiveCompanions.forEach(cleanCompanion);
        }
    }

    return data;
};


export const getCombatStyleBonusDetails = (combatStyle: CombatStyle): { bonusTextList: string[], fullDesc: string } => {
    const styleInfo = COMBAT_STYLE_CONFIG[combatStyle];
    if (!styleInfo) return { bonusTextList: ['기본 공격력/마법력 +10%'], fullDesc: '특화 무기 장착 시 기본 공격력/마법력 +10%' };

    const tier = styleInfo.tier || 1;
    const baseAtkBonus = getCombatStyleBonusPercent(tier);
    const bonusTextList: string[] = [`특화 무기 장착 시 기본 공격력/마법력 +${baseAtkBonus}%`];

    const b = styleInfo.bonuses || {};
    let addedCustomBonus = false;

    if (b.pAtk) { bonusTextList.push(`물리공격력 +${Math.round(b.pAtk * 100)}%`); addedCustomBonus = true; }
    if (b.mAtk) { bonusTextList.push(`마법공격력 +${Math.round(b.mAtk * 100)}%`); addedCustomBonus = true; }
    if (b.pDef) { bonusTextList.push(`물리방어력 +${Math.round(b.pDef * 100)}%`); addedCustomBonus = true; }
    if (b.mDef) { bonusTextList.push(`마법방어력 +${Math.round(b.mDef * 100)}%`); addedCustomBonus = true; }
    if (b.agi) { bonusTextList.push(`민첩성 +${Math.round(b.agi * 100)}%`); addedCustomBonus = true; }
    if (b.crit !== undefined) {
        const critVal = b.crit >= 1 ? b.crit : Math.round(b.crit * 100);
        bonusTextList.push(`치명타 확률 +${critVal}%`);
        addedCustomBonus = true;
    }
    if (b.critDmg !== undefined) {
        const critDmgVal = b.critDmg >= 1 ? b.critDmg : Math.round(b.critDmg * 100);
        bonusTextList.push(`치명타 피해량 +${critDmgVal}%`);
        addedCustomBonus = true;
    }
    if (b.critDmgResist !== undefined) {
        const resistVal = b.critDmgResist >= 1 ? b.critDmgResist : Math.round(b.critDmgResist * 100);
        bonusTextList.push(`치명타 피해 감소 +${resistVal}%`);
        addedCustomBonus = true;
    }
    if (b.eva !== undefined) {
        const evaVal = b.eva >= 1 ? b.eva : Math.round(b.eva * 100);
        bonusTextList.push(`회피율 +${evaVal}%`);
        addedCustomBonus = true;
    }
    if (b.acc !== undefined) {
        const accVal = b.acc >= 1 ? b.acc : Math.round(b.acc * 100);
        bonusTextList.push(`명중률 +${accVal}%`);
        addedCustomBonus = true;
    }
    if (b.mAcc !== undefined) {
        const mAccVal = b.mAcc >= 1 ? b.mAcc : Math.round(b.mAcc * 100);
        bonusTextList.push(`마법 명중률 +${mAccVal}%`);
        addedCustomBonus = true;
    }
    if (b.mEva !== undefined) {
        const mEvaVal = b.mEva >= 1 ? b.mEva : Math.round(b.mEva * 100);
        bonusTextList.push(`마법 회피율 +${mEvaVal}%`);
        addedCustomBonus = true;
    }
    if (b.resist !== undefined) {
        const resVal = b.resist >= 1 ? b.resist : Math.round(b.resist * 100);
        bonusTextList.push(`상태이상 저항 +${resVal}%`);
        addedCustomBonus = true;
    }
    if (b.maxHp) { bonusTextList.push(`최대 생명력 +${Math.round(b.maxHp * 100)}%`); addedCustomBonus = true; }
    if (b.maxMp) { bonusTextList.push(`최대 마나 +${Math.round(b.maxMp * 100)}%`); addedCustomBonus = true; }
    if (b.shinryoku_atk) { bonusTextList.push(`신력계통 속성 피해 +${Math.round(b.shinryoku_atk * 100)}%`); addedCustomBonus = true; }
    if (b.shinryoku_res) { bonusTextList.push(`신력계통 속성 저항 +${Math.round(b.shinryoku_res * 100)}%`); addedCustomBonus = true; }

    Object.keys(b).forEach(k => {
        if (k.startsWith('atk_')) {
            const elemName = k.replace('atk_', '');
            const val = b[k] >= 1 ? b[k] : Math.round(b[k] * 100);
            bonusTextList.push(`${elemName} 속성 피해 +${val}%`);
            addedCustomBonus = true;
        } else if (k.startsWith('res_')) {
            const elemName = k.replace('res_', '');
            const val = b[k] >= 1 ? b[k] : Math.round(b[k] * 100);
            bonusTextList.push(`${elemName} 속성 저항 +${val}%`);
            addedCustomBonus = true;
        }
    });

    return {
        bonusTextList,
        fullDesc: bonusTextList.join(', ')
    };
};

export const assignRandomCombatStyle = (companion: any, forceAssign: boolean = false, isNewRecruit: boolean = false): any => {
    if (!companion) return companion;
    if (!companion.level) companion.level = 1;

    // 레벨 30 이하인 캐릭터는 전투 계열을 가지지 않음
    if (companion.level <= 30) {
        companion.combatStyle = undefined;
        if (!companion.weaponMastery) companion.weaponMastery = {};
        return companion;
    }

    // 이미 전투 계열이 명시되어 있는 동료인 경우, 계열을 임의로 변경하지 않고 기존 전투 계열을 유훈 보존
    if (companion.combatStyle && COMBAT_STYLE_CONFIG[companion.combatStyle as CombatStyle]) {
        if (!companion.weaponMastery) companion.weaponMastery = {};

        // [중요] 기존 동료는 레벨에 맞추어 무기 숙련도가 자동 조정되지 않음!
        // 오직 신규 생성/영입 시점(isNewRecruit === true)에만 레벨에 맞춘 초기 숙련도 설정
        // 단, 기존 무기 숙련도 데이터가 이미 존재하고 양의 값(> 0)을 가진 경우에는 보정하지 않음
        const hasExistingMastery = companion.weaponMastery && Object.values(companion.weaponMastery).some((m: any) => m && m.level > 0);
        if (isNewRecruit && !hasExistingMastery) {
            const styleConfig = COMBAT_STYLE_CONFIG[companion.combatStyle as CombatStyle];
            const level = companion.level;
            let targetTier = 1;
            if (level <= 100) targetTier = 1;
            else if (level <= 300) targetTier = 2;
            else if (level <= 500) targetTier = 3;
            else targetTier = 4;

            let targetMasteryLevel = 10;
            if (targetTier === 1) targetMasteryLevel = 10 + Math.floor(Math.min(1, Math.max(0, (level - 1) / 99)) * 19);
            else if (targetTier === 2) targetMasteryLevel = 30 + Math.floor(Math.min(1, Math.max(0, (level - 101) / 199)) * 29);
            else if (targetTier === 3) targetMasteryLevel = 60 + Math.floor(Math.min(1, Math.max(0, (level - 301) / 199)) * 39);
            else targetMasteryLevel = 100;

            if (styleConfig && styleConfig.weapons && Array.isArray(styleConfig.weapons)) {
                styleConfig.weapons.forEach((weaponStr: string) => {
                    const currentVal = companion.weaponMastery[weaponStr]?.level || 0;
                    if (currentVal < targetMasteryLevel) {
                        companion.weaponMastery[weaponStr] = {
                            level: targetMasteryLevel,
                            currentExp: 0
                        };
                    }
                });
            }
        }
        return companion;
    }

    // 전투 계열이 존재하지 않는 동료는 자동으로 전투 계열을 지정하지 않음 (forceAssign이 true일 때만 지정)
    if (!companion.combatStyle && !forceAssign) {
        if (!companion.weaponMastery) companion.weaponMastery = {};
        return companion;
    }

    const level = companion.level;
    let targetTier = 1;
    if (level <= 100) targetTier = 1;
    else if (level <= 300) targetTier = 2;
    else if (level <= 500) targetTier = 3;
    else targetTier = 4;

    let matchingStyles = Object.values(COMBAT_STYLE_CONFIG).filter(s => s.tier === targetTier);
    if (matchingStyles.length === 0) {
        matchingStyles = Object.values(COMBAT_STYLE_CONFIG).filter(s => s.tier === 1);
    }
    const styleConfig = matchingStyles[Math.floor(Math.random() * matchingStyles.length)] || COMBAT_STYLE_CONFIG[CombatStyle.SWORDSMAN];
    companion.combatStyle = styleConfig.style;

    if (!companion.weaponMastery) {
        companion.weaponMastery = {};
    }

    // 신규 생성/영입 시점에만 초기 무기 숙련도 설정
    // 단, 기존 무기 숙련도 데이터가 이미 존재하고 양의 값(> 0)을 가진 경우에는 보정하지 않음
    const hasExistingMastery = companion.weaponMastery && Object.values(companion.weaponMastery).some((m: any) => m && m.level > 0);
    if (isNewRecruit && !hasExistingMastery) {
        let targetMasteryLevel = 10;
        if (targetTier === 1) targetMasteryLevel = 10 + Math.floor(Math.min(1, Math.max(0, (level - 1) / 99)) * 19);
        else if (targetTier === 2) targetMasteryLevel = 30 + Math.floor(Math.min(1, Math.max(0, (level - 101) / 199)) * 29);
        else if (targetTier === 3) targetMasteryLevel = 60 + Math.floor(Math.min(1, Math.max(0, (level - 301) / 199)) * 39);
        else targetMasteryLevel = 100;

        if (styleConfig && styleConfig.weapons && Array.isArray(styleConfig.weapons)) {
            styleConfig.weapons.forEach((weaponStr: string) => {
                const currentVal = companion.weaponMastery[weaponStr]?.level || 0;
                if (currentVal < targetMasteryLevel) {
                    companion.weaponMastery[weaponStr] = {
                        level: targetMasteryLevel,
                        currentExp: 0
                    };
                }
            });
        }
    }

    return companion;
};

// [NEW] 파티에 새로운 동료가 합류할 때 비어있는 진형(BattlePosition)을 자동 탐색하여 할당하는 함수
export const findAvailableBattlePosition = (character: Character, preferredRole?: BattleRole): BattlePosition => {
    const occupied = new Set<string>();
    
    // 플레이어의 위치 등록
    const playerPos = character.battlePosition || { row: 1, col: 1 };
    occupied.add(`${playerPos.row}-${playerPos.col}`);

    // 기존 파티원 동료들의 위치 등록
    (character.companions || []).forEach(c => {
        if (c.battlePosition) {
            occupied.add(`${c.battlePosition.row}-${c.battlePosition.col}`);
        }
    });

    // 역할에 따른 선호 순서 정의
    // TANKER: 전열(0) -> 중열(1) -> 후열(2)
    // DEALER / NONE: 중열(1) -> 전열(0) -> 후열(2)
    // SUPPORTER: 후열(2) -> 중열(1) -> 전열(0)
    let rowOrder = [1, 0, 2];
    if (preferredRole === BattleRole.TANKER) {
        rowOrder = [0, 1, 2];
    } else if (preferredRole === BattleRole.SUPPORTER) {
        rowOrder = [2, 1, 0];
    }

    const colOrder = [1, 0, 2]; // 중앙 열(1) 우선, 그 다음 좌(0), 우(2)

    for (const r of rowOrder) {
        for (const c of colOrder) {
            if (!occupied.has(`${r}-${c}`)) {
                return { row: r, col: c };
            }
        }
    }

    // 모든 자리가 찼을 경우 기본값 반환
    return { row: 1, col: 1 };
};

// [NEW] 캐릭터/동료의 해금된 전투 계열 목록 계산
export const getUnlockedCombatStylesList = (entity: Character | Companion): CombatStyle[] => {
    if (!entity) return [];
    const list = new Set<CombatStyle>(entity.unlockedCombatStyles || []);
    if (entity.combatStyle) {
        list.add(entity.combatStyle);
        // 장착 중인 계열의 상위/루트 계열들도 자동 해금으로 인정
        let cur = COMBAT_STYLE_CONFIG[entity.combatStyle];
        while (cur && cur.parentStyle) {
            list.add(cur.parentStyle);
            cur = COMBAT_STYLE_CONFIG[cur.parentStyle];
        }
        if (cur && cur.rootStyle) {
            list.add(cur.rootStyle);
        }
    }
    return Array.from(list);
};

// [NEW] 엔티티가 현재 장착한 전투 계열의 고유 액티브 스킬 객체 생성/조회
export const getCombatStyleActiveSkill = (entity: Character | Companion): Skill | null => {
    if (!entity || !entity.combatStyle) return null;
    const style = entity.combatStyle;
    const tier = COMBAT_STYLE_CONFIG[style]?.tier || 1;
    const skillSet = getCombatStyleSkillSet(style, tier);
    if (!skillSet || !skillSet.equippedActive) return null;

    const active = skillSet.equippedActive;
    return {
        id: `combat_style_${style}`,
        name: active.name,
        description: active.description,
        tier: active.tier,
        type: active.type,
        targetType: active.targetType,
        mpCost: active.mpCost,
        baseMpCost: active.mpCost,
        level: Math.max(1, Math.min(10, Math.floor((entity.level || 1) / 10))),
        maxLevel: 10,
        currentMastery: 100,
        effectFormula: active.effectFormula || 'STYLE_ACTIVE',
        powerRatio: active.powerRatio,
        isCombatStyleSkill: true,
        combatStyleSource: style,
        icon: active.icon || 'Sword',
        shinryokuType: active.shinryokuType
    };
};

// [NEW] 기본 스킬 + 전투 계열 전용 액티브 스킬을 포함한 총 사용 가능 스킬 목록
export const getEntityAllCombatSkills = (entity: Character | Companion, additionalSkills: Skill[] = []): Skill[] => {
    const baseSkills = [...(entity.skills || [])];
    const styleSkill = getCombatStyleActiveSkill(entity);
    if (styleSkill && !baseSkills.some(s => s.name === styleSkill.name)) {
        baseSkills.push(styleSkill);
    }
    return [...baseSkills, ...additionalSkills];
};

// 스킬의 신력 속성 반환 헬퍼 함수
export const getSkillElement = (skill: Skill | null | undefined, fallback?: string): string => {
    if (!skill) return fallback || '무속성';
    return skill.shinryokuType || fallback || '무속성';
};

// 스킬 전투 위력(강도) 수치 계산기 (자동 전투 시 최강 스킬 우선 선별용)
export const getSkillCombatPower = (skill: Skill): number => {
    if (!skill) return 0;
    
    // 1. 클래스 티어 가중치
    let tierScore = 0;
    switch (skill.tier) {
        case ClassTier.BOND:
            tierScore = 800;
            break;
        case ClassTier.FINAL:
            tierScore = 600;
            break;
        case ClassTier.LAST:
            tierScore = 450;
            break;
        case ClassTier.SECOND:
            tierScore = 300;
            break;
        case ClassTier.FIRST:
            tierScore = 150;
            break;
        default:
            tierScore = 50;
            break;
    }

    // 2. 위력 계수 (powerRatio: 120~300% 또는 1.2~3.0)
    let ratio = skill.powerRatio || 0;
    if (ratio > 0 && ratio < 10) {
        ratio = ratio * 100;
    }

    // 3. effectFormula 파싱 (STR*2.5, INT*3.0 등)
    let formulaScore = 0;
    if (skill.effectFormula) {
        const matches = skill.effectFormula.match(/[\*\^]\s*([\d\.]+)/g);
        if (matches) {
            matches.forEach(m => {
                const num = parseFloat(m.replace(/[\*\^\s]/g, ''));
                if (!isNaN(num)) {
                    formulaScore = Math.max(formulaScore, num * 100);
                }
            });
        }
    }

    // 4. 광역 스킬 가중치
    const aoeBonus = skill.targetType === 'aoe' ? 50 : 0;

    // 5. MP 소모량 가중치
    const mpWeight = (skill.mpCost || 0) * 2;

    // 6. 스킬 레벨 및 숙련도
    const levelWeight = (skill.level || 1) * 5 + (skill.currentMastery || 0) * 0.05;

    return Math.max(ratio, formulaScore) * 2 + tierScore + mpWeight + aoeBonus + levelWeight;
};

export interface CombatStyleStatusResult {
    style: CombatStyle;
    config: typeof COMBAT_STYLE_CONFIG[CombatStyle];
    isUnlocked: boolean;
    isCurrent: boolean;
    isTarget: boolean;
    meetsLevel: boolean;
    meetsMastery: boolean;
    meetsParent: boolean;
    meetsAllPrerequisites: boolean;
    currentExp: number;
    reqExp: number;
    currentKills: number;
    reqKills: number;
    currentBossKills: number;
    reqBossKills: number;
    isProgressComplete: boolean;
    canPromote: boolean;
    progressPercent: number;
}

// [NEW] 전투 계열 전직/수련 가능 상태 판별기
export const getCombatStyleUnlockStatus = (entity: Character | Companion, targetStyle: CombatStyle): CombatStyleStatusResult => {
    const config = COMBAT_STYLE_CONFIG[targetStyle] || COMBAT_STYLE_CONFIG[CombatStyle.SWORDSMAN];
    const unlockedList = getUnlockedCombatStylesList(entity);
    const isUnlocked = unlockedList.includes(targetStyle);
    const isCurrent = entity.combatStyle === targetStyle;
    const isTarget = entity.targetCombatStyle === targetStyle;

    const level = entity.level || 1;
    const minLevel = config.tier === 1 ? 1 : config.tier === 2 ? 100 : config.tier === 3 ? 300 : 500;
    const meetsLevel = level >= minLevel;

    // 무기 숙련도 검사
    const masteryObj = entity.weaponMastery || {};
    let maxSpecialtyMastery = 0;
    if (config.weapons && config.weapons.length > 0) {
        config.weapons.forEach(w => {
            const lv = masteryObj[w]?.level || 0;
            if (lv > maxSpecialtyMastery) maxSpecialtyMastery = lv;
        });
    }
    const meetsMastery = maxSpecialtyMastery >= config.minMastery;

    // 선행 직업 전직 이수 검사
    let meetsParent = false;
    if (config.tier === 1) {
        meetsParent = true;
    } else if (config.tier === 2) {
        meetsParent = unlockedList.includes(config.rootStyle) || (config.parentStyle ? unlockedList.includes(config.parentStyle) : false);
    } else {
        meetsParent = config.parentStyle ? unlockedList.includes(config.parentStyle) : unlockedList.includes(config.rootStyle);
    }

    const meetsAllPrerequisites = meetsLevel && meetsMastery && meetsParent;

    const tierReq = COMBAT_STYLE_TIER_REQUIREMENTS[config.tier] || COMBAT_STYLE_TIER_REQUIREMENTS[1];
    const progressData = (entity.combatStyleProgress && entity.combatStyleProgress[targetStyle]) || { exp: 0, monsterKills: 0, bossKills: 0 };

    const currentExp = progressData.exp || 0;
    const reqExp = tierReq.reqExp;
    const currentKills = progressData.monsterKills || 0;
    const reqKills = tierReq.reqKills;
    const currentBossKills = progressData.bossKills || 0;
    const reqBossKills = tierReq.reqBossKills;

    const expRatio = Math.min(1, currentExp / reqExp);
    const killRatio = Math.min(1, currentKills / reqKills);
    const bossRatio = reqBossKills > 0 ? Math.min(1, currentBossKills / reqBossKills) : 1;

    const progressPercent = Math.floor(((expRatio + killRatio + bossRatio) / (reqBossKills > 0 ? 3 : 2)) * 100);
    const isProgressComplete = currentExp >= reqExp && currentKills >= reqKills && currentBossKills >= reqBossKills;
    const canPromote = meetsAllPrerequisites && isProgressComplete && !isUnlocked;

    return {
        style: targetStyle,
        config,
        isUnlocked,
        isCurrent,
        isTarget,
        meetsLevel,
        meetsMastery,
        meetsParent,
        meetsAllPrerequisites,
        currentExp,
        reqExp,
        currentKills,
        reqKills,
        currentBossKills,
        reqBossKills,
        isProgressComplete,
        canPromote,
        progressPercent
    };
};

// [NEW] 전투 승리/적 처치 시 전투 계열 수련 경험치 및 처치 퀘스트 누적
export const processCombatStyleKillProgress = (
    entity: Character | Companion,
    enemy: Enemy,
    styleExp: number
): { entity: Character | Companion; promotedStyle?: CombatStyle; justCompleted?: boolean } => {
    if (!entity || !entity.targetCombatStyle) return { entity };
    const target = entity.targetCombatStyle;
    
    // 수련 대상 전투 계열의 특화 무기를 착용해야만 수련 경험치 및 처치수가 누적됨
    if (!hasCombatStyleSpecialtyEquipped(target, entity.equipment)) {
        return { entity };
    }

    const config = COMBAT_STYLE_CONFIG[target];
    if (!config) return { entity };

    const tierReq = COMBAT_STYLE_TIER_REQUIREMENTS[config.tier] || COMBAT_STYLE_TIER_REQUIREMENTS[1];
    const enemyLevel = enemy.level || 1;
    const isBoss = enemy.isBoss === true || /\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]|\[사자\]|\[군주\]|\[사신\]|\[신\]/i.test(enemy.name);

    if (!entity.combatStyleProgress) {
        entity.combatStyleProgress = {};
    }
    const cur = entity.combatStyleProgress[target] || { exp: 0, monsterKills: 0, bossKills: 0 };
    
    // 수련 EXP 누적
    const newExp = cur.exp + styleExp;
    
    // 몬스터 처치 레벨 조건 충족 시 카운트
    let newKills = cur.monsterKills;
    if (enemyLevel >= tierReq.minMonsterLevel) {
        newKills += 1;
    }
    
    // 보스 처치 수 카운트
    let newBossKills = cur.bossKills;
    if (isBoss) {
        newBossKills += 1;
    }

    const wasComplete = cur.exp >= tierReq.reqExp && cur.monsterKills >= tierReq.reqKills && cur.bossKills >= tierReq.reqBossKills;
    const isNowComplete = newExp >= tierReq.reqExp && newKills >= tierReq.reqKills && newBossKills >= tierReq.reqBossKills;

    entity.combatStyleProgress[target] = {
        exp: newExp,
        monsterKills: newKills,
        bossKills: newBossKills
    };

    return {
        entity,
        promotedStyle: isNowComplete ? target : undefined,
        justCompleted: !wasComplete && isNowComplete
    };
};

/**
 * [NEW] 훈련소 시설별 일일 훈련 가능 횟수 계산
 * 공식: 트레이너 등급별 가산치 합산 (최대 10명분 누적, 일일 최대 1,000회)
 * 트레이너 효과: 견습(+1) ➔ 초급(+5) ➔ 중급(+10) ➔ 고급(+15) ➔ 숙련(+25) ➔ 전문(+50) ➔ 마스터(+75) ➔ 레전드(+100회)
 */
export const getFacilityTrainingLimit = (character: Character, facilityType: string): number => {
    const instances = character.base?.layout?.filter(inst => 
        inst.type === facilityType && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    if (instances.length === 0) return 0;

    const facilityBonus = instances.length * 1;

    const allActors: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    const seenIds = new Set<string>();
    const trainerBonuses: number[] = [];

    const addTrainer = (actor: Character | Companion | undefined, key: string) => {
        if (!actor || seenIds.has(key)) return;
        if ((actor as any).isDead || (actor as any).isMonster || (actor as any).monsterData) return;
        if (actor.job !== JobType.TRAINER) return;

        seenIds.add(key);
        const rank = (actor as any).trainerRank || (actor as any).trainerProfile?.rank || TrainerRank.APPRENTICE;
        const rankCfg = TRAINER_RANK_CONFIG[rank as TrainerRank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
        trainerBonuses.push(rankCfg.dailyCount);
    };

    instances.forEach(inst => {
        const assignedIds: string[] = [
            ...(character.base?.multiAssignments?.[inst.id] || []),
            ...(character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id] as string] : [])
        ];
        assignedIds.forEach(assigneeId => {
            if (!assigneeId) return;
            const trainer = assigneeId === 'player' ? character : allActors.find(c => ('id' in c ? c.id : 'player') === assigneeId);
            addTrainer(trainer, assigneeId);
        });
    });

    trainerBonuses.sort((a, b) => b - a);
    const trainerBonus = trainerBonuses.slice(0, 10).reduce((sum, v) => sum + v, 0);
    return Math.min(1000, Math.max(0, facilityBonus + trainerBonus));
};

/**
 * [NEW] 해당 분과의 활성화된 트레이너(숙련 이상) 존재 여부 확인
 */
export const getActiveTrainerBranchCount = (character: Character, branch: TrainerBranch): number => {
    if (!character || !character.base) return 0;

    let targetTypes: string[] = [];
    if (branch === TrainerBranch.EXP) targetTypes = ['training_exp', 'training'];
    else if (branch === TrainerBranch.STAT) targetTypes = ['training_stat'];
    else if (branch === TrainerBranch.WEAPON_MASTERY) targetTypes = ['training_mastery'];
    else if (branch === TrainerBranch.TACTICAL) targetTypes = ['tactical_training'];
    else if (branch === TrainerBranch.COMBAT_STYLE) targetTypes = ['training_style', 'combat_style_training'];

    if (targetTypes.length === 0) return 0;

    const layout = character.base.layout || [];
    const instances = layout.filter(inst => 
        inst && targetTypes.includes(inst.type) && !inst.underConstruction && (inst.level ?? 1) >= 0
    );

    const allComps: (Character | Companion)[] = [
        character,
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    const norm = (s: any) => (s ? String(s).replace(/\s+/g, '').toLowerCase() : '');
    const targetBranchNorm = norm(branch);

    const assignedBranchTrainers = new Set<string>();

    const checkActor = (actor: any): boolean => {
        if (!actor) return false;
        const isTrainer = actor.job === JobType.TRAINER || actor.job === '트레이너';
        if (!isTrainer) return false;

        const actorBranch = actor.trainerBranch;
        if (!actorBranch) return false;

        const actorBranchNorm = norm(actorBranch);
        if (!actorBranchNorm) return false;

        if (actorBranchNorm === targetBranchNorm) return true;

        if (branch === TrainerBranch.EXP && (actorBranchNorm.includes('경험치') || actorBranchNorm.includes('exp'))) return true;
        if (branch === TrainerBranch.STAT && (actorBranchNorm.includes('스탯') || actorBranchNorm.includes('stat'))) return true;
        if (branch === TrainerBranch.WEAPON_MASTERY && (actorBranchNorm.includes('무기') || actorBranchNorm.includes('숙련') || actorBranchNorm.includes('mastery'))) return true;
        if (branch === TrainerBranch.TACTICAL && (actorBranchNorm.includes('전술') || actorBranchNorm.includes('tactical'))) return true;
        if (branch === TrainerBranch.COMBAT_STYLE && (actorBranchNorm.includes('전투') || actorBranchNorm.includes('스타일') || actorBranchNorm.includes('style'))) return true;

        return false;
    };

    instances.forEach(inst => {
        const assignedIds: string[] = [
            ...(character.base?.multiAssignments?.[inst.id] || []),
            ...(character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id] as string] : []),
            ...(character.base?.assignments?.[inst.type] ? [character.base.assignments[inst.type] as string] : [])
        ];

        assignedIds.forEach(id => {
            if (!id) return;
            const actor = id === 'player' ? character : allComps.find(c => ('id' in c ? c.id : 'player') === id);
            if (checkActor(actor)) {
                const actorKey = id === 'player' ? 'player' : ((actor as any).id || actor.name);
                assignedBranchTrainers.add(actorKey);
            }
        });
    });

    targetTypes.forEach(tType => {
        const directAssigneeId = character.base?.assignments?.[tType];
        if (directAssigneeId) {
            const actor = directAssigneeId === 'player' ? character : allComps.find(c => ('id' in c ? c.id : 'player') === directAssigneeId);
            if (checkActor(actor)) {
                const actorKey = directAssigneeId === 'player' ? 'player' : ((actor as any).id || actor.name);
                assignedBranchTrainers.add(actorKey);
            }
        }
    });

    return assignedBranchTrainers.size;
};

export const hasActiveTrainerBranch = (character: Character, branch: TrainerBranch): boolean => {
    return getActiveTrainerBranchCount(character, branch) > 0;
};

/**
 * [NEW] 해당 분과의 훈련 배율 획득 (트레이너 1명 시 2배, 2명 시 2.1배, 3명 시 2.2배 ... 인원당 +0.1배)
 */
export const getTrainerBranchMultiplier = (character: Character, branch: TrainerBranch): number => {
    const count = getActiveTrainerBranchCount(character, branch);
    if (count <= 0) return 1;
    const multiplier = 2 + (count - 1) * 0.1;
    return Number(multiplier.toFixed(2));
};

/**
 * [NEW] 트레이너 분과별 승급 조건 검증 함수
 */
export const checkTrainerBranchRequirement = (actor: any): { met: boolean; reason: string } => {
    if (!actor) return { met: true, reason: '' };
    const branch = actor.trainerBranch as TrainerBranch;
    if (!branch) return { met: true, reason: '' };

    const stats = calculateFinalStats(actor).finalStats;

    switch (branch) {
        case TrainerBranch.EXP: {
            // 경험치 트레이너: 일정 CTRL (30 이상)
            const reqCtrl = 300;
            const met = (stats.ctrl || 0) >= reqCtrl;
            return {
                met,
                reason: met ? `통제(CTRL ${stats.ctrl}/${reqCtrl}) 충족` : `통제(CTRL) 스탯 ${reqCtrl} 이상 필요 (현재 ${stats.ctrl || 0})`
            };
        }
        case TrainerBranch.STAT: {
            // 스탯 트레이너: 올 스탯 (STR, AGI, INT, WIS, CTRL 500 이상)
            const reqStat = 500;
            const failedStats: string[] = [];
            if ((stats.str || 0) < reqStat) failedStats.push(`STR(${stats.str || 0})`);
            if ((stats.agi || 0) < reqStat) failedStats.push(`AGI(${stats.agi || 0})`);
            if ((stats.int || 0) < reqStat) failedStats.push(`INT(${stats.int || 0})`);
            if ((stats.wis || 0) < reqStat) failedStats.push(`WIS(${stats.wis || 0})`);
            if ((stats.ctrl || 0) < reqStat) failedStats.push(`CTRL(${stats.ctrl || 0})`);

            const met = failedStats.length === 0;
            return {
                met,
                reason: met ? `올 스탯(${reqStat} 이상) 충족` : `올 스탯 ${reqStat} 이상 필요 (부족: ${failedStats.join(', ')})`
            };
        }
        case TrainerBranch.WEAPON_MASTERY: {
            // 무기숙련도 트레이너: 최소 한 무기 숙련도 100 이상
            const weaponMasteries = actor.weaponMastery || {};
            const maxMastery = Math.max(0, ...Object.values(weaponMasteries).map((v: any) => typeof v === 'number' ? v : (v?.level || 0)));
            const met = maxMastery >= 100;
            return {
                met,
                reason: met ? `무기 숙련도(${maxMastery}/100) 충족` : `최소 한 가지 무기 숙련도 100 이상 필요 (현재 최고: ${maxMastery})`
            };
        }
        case TrainerBranch.TACTICAL: {
            // 전술 트레이너: 최소 한 역할 숙련도 100 이상
            const roleMasteries = actor.roleMastery || actor.tacticalMastery || {};
            const maxRole = Math.max(0, ...Object.values(roleMasteries).map((v: any) => typeof v === 'number' ? v : (v?.level || 0)));
            const met = maxRole >= 100;
            return {
                met,
                reason: met ? `역할 숙련도(${maxRole}/100) 충족` : `최소 한 가지 역할 숙련도 100 이상 필요 (현재 최고: ${maxRole})`
            };
        }
        case TrainerBranch.COMBAT_STYLE: {
            // 전투스타일 트레이너: 최소 4차 전투계열 (CombatStyle tier 4) 보유
            const unlockedStyles = getUnlockedCombatStylesList(actor);
            const hasTier4Style = unlockedStyles.some(style => {
                const config = COMBAT_STYLE_CONFIG[style];
                return config && config.tier === 4;
            });
            return {
                met: hasTier4Style,
                reason: hasTier4Style ? '4차 전투계열 보유 충족' : '최소 4차 전투계열 보유 필요'
            };
        }
        default:
            return { met: true, reason: '' };
    }
};
export const getTrainerRequiredExp = (level: number): number => {
    return Math.floor(100 * Math.pow(1.06, Math.max(0, level - 1)));
};

/**
 * [NEW] 훈련 완료 시 해당 시설에 배치된 트레이너에게 숙련도 경험치 지급 및 레벨업 처리
 */
export const addTrainerExpToAssignedTrainers = (character: Character, facilityType: string, trainingCount: number = 1): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    const instances = newChar.base?.layout?.filter(inst => inst.type === facilityType) || [];
    if (instances.length === 0) return newChar;

    // 훈련 1회당 숙련도 2 EXP 획득 (10회 일괄 훈련 시 20 EXP)
    const expGain = Math.max(1, Math.floor(trainingCount * 2));

    instances.forEach(inst => {
        const assigneeId = newChar.base?.assignments?.[inst.id];
        if (!assigneeId) return;

        let target: any = null;
        if (assigneeId === 'player' && newChar.job === JobType.TRAINER) {
            target = newChar;
        } else {
            target = (newChar.companions || []).find(c => c.id === assigneeId) || (newChar.inactiveCompanions || []).find(c => c.id === assigneeId);
        }

        if (target && target.job === JobType.TRAINER) {
            const currentRank = target.trainerRank || TrainerRank.APPRENTICE;
            const rankCfg = TRAINER_RANK_CONFIG[currentRank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
            
            // 기존 데이터 보정: trainerLevel이 없으면 현재 랭크의 기본 요구 레벨로 세팅
            target.trainerLevel = target.trainerLevel || rankCfg.reqLevel || 1;
            target.trainerExp = (target.trainerExp || 0) + expGain;

            let reqExp = getTrainerRequiredExp(target.trainerLevel);
            while (target.trainerLevel < 100 && target.trainerExp >= reqExp) {
                target.trainerExp -= reqExp;
                target.trainerLevel += 1;
                reqExp = getTrainerRequiredExp(target.trainerLevel);
            }

            if (target.trainerLevel >= 100) {
                target.trainerLevel = 100;
                target.trainerExp = 0;
            }
            target.trainerMaxExp = reqExp;
        }
    });

    return newChar;
};

// ==================== [NEW] RESEARCHER SYSTEM UTILS ====================

export const RESEARCHER_TIER_NAMES: Record<number, string> = {
    1: '견습 연구원',
    2: '일반 연구원',
    3: '전문 연구원',
    4: '마스터 연구원',
    5: '전설의 연구원'
};

export const getResearcherTierByLevel = (level: number): number => {
    if (level >= 81) return 5;
    if (level >= 61) return 4;
    if (level >= 41) return 3;
    if (level >= 21) return 2;
    return 1;
};

export const getResearcherRankTitle = (level: number, tier?: number): string => {
    const currentTier = tier || getResearcherTierByLevel(level);
    return RESEARCHER_TIER_NAMES[currentTier] || '견습 연구원';
};

export const getNextResearcherPromotionLevel = (currentTier: number): number | null => {
    if (currentTier >= 5) return null;
    if (currentTier === 1) return 21;
    if (currentTier === 2) return 41;
    if (currentTier === 3) return 61;
    if (currentTier === 4) return 81;
    return null;
};

export const RESEARCHER_PROMOTION_WIS_REQ: Record<number, number> = {
    2: 100,  // 일반 연구원: WIS 100 이상
    3: 500,  // 전문 연구원: WIS 500 이상
    4: 1000, // 마스터 연구원: WIS 1000 이상
    5: 2000  // 전설의 연구원: WIS 2000 이상
};

export const getNextResearcherPromotionWisReq = (currentTier: number): number | null => {
    const nextTier = currentTier + 1;
    return RESEARCHER_PROMOTION_WIS_REQ[nextTier] || null;
};

export interface ResearcherBonus {
    costDiscount: number; // 0 ~ 0.65 (비용 할인율: 플레이어 숙련도 + 동료 연구원)
    greatSuccessBonus: number; // +% (대성공 확률 추가: 플레이어 숙련도 + 동료 연구원)
    limitBreakBonus: number; // +% (한계돌파 성공 확률 추가: 플레이어 숙련도 + 동료 연구원)
    researcherCount: number;
    assignedResearchers: Companion[];
    highestLevel: number;
    highestTier: number;
    rankTitle: string;
    countBonus: {
        costDiscount: number;
        greatSuccessBonus: number;
        limitBreakBonus: number;
    };
    playerMastery: {
        level: number;
        costDiscount: number;
        greatSuccessBonus: number;
        limitBreakBonus: number;
    };
}

export const calculateResearcherBonus = (character: Character, labInstanceId?: string): ResearcherBonus => {
    // 1. 플레이어 본인의 연구 전문기술 숙련도 계산 (상시 적용)
    const playerResearchLevel = character.professions?.research?.level || 1;
    // 레벨당 비용 0.6% 할인 (최대 30%)
    const playerCostDiscount = Math.min(0.30, Math.max(0, (playerResearchLevel - 1) * 0.006));
    // 레벨당 대성공 확률 +0.8% (최대 30%)
    const playerGreatSuccessBonus = Math.min(30, Math.max(0, (playerResearchLevel - 1) * 0.8));
    // 레벨당 한계돌파 확률 +0.6% (최대 25%)
    const playerLimitBreakBonus = Math.min(25, Math.max(0, (playerResearchLevel - 1) * 0.6));

    const playerMasteryData = {
        level: playerResearchLevel,
        costDiscount: playerCostDiscount,
        greatSuccessBonus: playerGreatSuccessBonus,
        limitBreakBonus: playerLimitBreakBonus
    };

    const defaultBonus: ResearcherBonus = {
        costDiscount: playerCostDiscount,
        greatSuccessBonus: playerGreatSuccessBonus,
        limitBreakBonus: playerLimitBreakBonus,
        researcherCount: 0,
        assignedResearchers: [],
        highestLevel: 0,
        highestTier: 0,
        rankTitle: '담당 연구원 미배치',
        countBonus: { costDiscount: 0, greatSuccessBonus: 0, limitBreakBonus: 0 },
        playerMastery: playerMasteryData
    };

    const base = character.base;
    if (!base) return defaultBonus;

    const labInst = labInstanceId 
        ? base.layout?.find(inst => inst.id === labInstanceId)
        : base.layout?.find(inst => inst.type === 'lab');

    if (!labInst) return { ...defaultBonus, rankTitle: '연구소 없음' };

    const assignedIds: string[] = [];
    if (base.assignments?.[labInst.id]) {
        assignedIds.push(base.assignments[labInst.id]);
    }
    if (base.multiAssignments?.[labInst.id]) {
        base.multiAssignments[labInst.id].forEach(id => {
            if (!assignedIds.includes(id)) assignedIds.push(id);
        });
    }

    const allComps = [...(character.inactiveCompanions || []), ...(character.companions || [])];
    const researchers: Companion[] = [];

    // 동료 연구원만 필터링 (플레이어는 동료 연구원이 아니므로 제외)
    if (assignedIds.length > 0) {
        assignedIds.forEach(id => {
            if (id !== 'player') {
                const comp = allComps.find(c => c.id === id);
                if (comp && (comp.job === JobType.RESEARCHER || (comp.job as string) === '연구원')) {
                    if (!researchers.some(r => r.id === comp.id)) researchers.push(comp);
                }
            }
        });
    } else {
        // 배치 목록이 없을 경우 직업이 연구원인 동료 자동 포함
        allComps.forEach(comp => {
            if (comp.job === JobType.RESEARCHER || (comp.job as string) === '연구원') {
                if (!researchers.some(r => r.id === comp.id)) researchers.push(comp);
            }
        });
    }

    // 동료 연구원이 없는 경우: 플레이어 자체 연구 숙련도만 적용
    if (researchers.length === 0) {
        return defaultBonus;
    }

    // 동료 연구원 등급/레벨 순으로 정렬 (1위 = 동료 수석 연구원)
    const sortedResearchers = [...researchers].sort((a, b) => {
        const aLvl = a.professions?.research?.level || 1;
        const bLvl = b.professions?.research?.level || 1;
        const aTier = a.researcherTier || getResearcherTierByLevel(aLvl);
        const bTier = b.researcherTier || getResearcherTierByLevel(bLvl);
        if (bTier !== aTier) return bTier - aTier;
        return bLvl - aLvl;
    });

    const leadRes = sortedResearchers[0];
    const highestLevel = leadRes.professions?.research?.level || 1;
    const highestTier = leadRes.researcherTier || getResearcherTierByLevel(highestLevel);

    // 2명 이상일 때 각 부연구원의 등급/레벨에 따른 추가 보정 계산
    let countCostDiscount = 0;
    let countGreatSuccess = 0;
    let countLimitBreak = 0;

    if (sortedResearchers.length >= 2) {
        for (let i = 1; i < sortedResearchers.length; i++) {
            const assistant = sortedResearchers[i];
            const aLvl = assistant.professions?.research?.level || 1;
            const aTier = assistant.researcherTier || getResearcherTierByLevel(aLvl);

            // 각 연구원 등급(Tier) 및 숙련 레벨에 따른 추가 보정 (Tier당 비용 -2%, 대성공 +2%, 한계돌파 +1.5%)
            countCostDiscount += (aTier * 0.02) + (aLvl * 0.001);
            countGreatSuccess += (aTier * 2.0) + (aLvl * 0.1);
            countLimitBreak += (aTier * 1.5) + (aLvl * 0.08);
        }
    }

    // 주 연구원 기본 효과
    const leadCostDiscount = (highestLevel * 0.004) + (highestTier * 0.03);
    const leadGreatSuccess = (highestLevel * 0.5) + (highestTier * 4);
    const leadLimitBreak = (highestLevel * 0.35) + (highestTier * 3);

    // 동료 연구원 효과 합산
    const companionCostDiscount = leadCostDiscount + countCostDiscount;
    const companionGreatSuccess = leadGreatSuccess + countGreatSuccess;
    const companionLimitBreak = leadLimitBreak + countLimitBreak;

    // 총합: 플레이어 숙련도 + 동료 연구원 (비용 최대 65%, 대성공 최대 60%, 돌파 최대 50%)
    const costDiscount = Math.min(0.65, playerCostDiscount + companionCostDiscount);
    const greatSuccessBonus = Math.min(60, playerGreatSuccessBonus + companionGreatSuccess);
    const limitBreakBonus = Math.min(50, playerLimitBreakBonus + companionLimitBreak);

    const rankTitle = getResearcherRankTitle(highestLevel, highestTier);

    return {
        costDiscount,
        greatSuccessBonus,
        limitBreakBonus,
        researcherCount: researchers.length,
        assignedResearchers: researchers,
        highestLevel,
        highestTier,
        rankTitle,
        countBonus: {
            costDiscount: countCostDiscount,
            greatSuccessBonus: countGreatSuccess,
            limitBreakBonus: countLimitBreak
        },
        playerMastery: playerMasteryData
    };
};

/**
 * [NEW] 인물(NPC / 동료 / 과거 인연 / 성전 방문자 등)의 현재 위치(Location) 조회/결정 함수
 */
export const getPersonLocation = (person: any, character: Character): GameLocation => {
    if (!person) {
        return character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    }

    // 1. 파티에 포함된 활성 동료인 경우 -> 플레이어와 항상 동일한 위치
    const isActiveCompanion = (character.companions || []).some(c => c.id === person.id);
    if (isActiveCompanion && character.currentLocation) {
        return character.currentLocation;
    }

    // 1-5. 대기 중인 동료인 경우 -> 파견지 또는 기지 위치
    const isInactiveCompanion = (character.inactiveCompanions || []).some(c => c.id === person.id);
    if (isInactiveCompanion) {
        const dispatchMission = character.base?.dispatched?.find(d => d.companionId === person.id);
        if (dispatchMission && dispatchMission.destination) {
            return dispatchMission.destination;
        }
        if (character.base?.location) {
            return character.base.location;
        }
    }

    // 2. 과거 인연(isPastConnection) 또는 socialNetwork에 등록된 지인 여부 확인
    // 과거 인연이나 지인은 학교에 얽매이지 않고 자기 고유의 거주지/도시를 가짐
    const isInSocialNetwork = (character.socialNetwork || []).some(n => n.id === person.id);
    const isPast = Boolean(
        person.isPastConnection || 
        isInSocialNetwork ||
        !character.schoolData?.enrolled
    );

    // 3. 순수하게 현재 학교/동아리에 함께 재학 중인 동급생인 경우 -> 플레이어 학교/도시
    if ((person.origin === 'School' || person.origin === 'Club') && !isPast && character.schoolData?.enrolled) {
        const charNation = character.nation || '대한민국';
        const charCity = character.currentLocation?.city || '서울';
        return {
            region: character.currentLocation?.region || '아시아',
            nation: charNation,
            city: charCity
        };
    }

    // 4. 성전 출신 인물
    if (person.origin === 'Temple') {
        if (person.originName && person.originName.includes('양의 기운')) {
            return { region: '신계', nation: '양의 기운의 성전', city: '태양의 사자의 성전' };
        }
        if (person.originName && person.originName.includes('음의 기운')) {
            return { region: '신계', nation: '음의 기운의 성전', city: '월광의 사자의 성' };
        }
        return { region: '신계', nation: '신의 성소', city: '신의 거처' };
    }

    // 5. 결정론적 해시 계산 (ID/이름 기반) - 난수 고정으로 항상 일관된 위치 유지
    const seedStr = String(person.id || person.name || 'default');
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) % 10000000;
    }
    hash = Math.abs(hash);

    // 6. 인물의 국적(nation) 정규화 및 결정
    let targetNation = person.nation || person.originNation;

    // 국적 별칭 정규화 (WORLD_GEOGRAPHY 키 매핑)
    const nationAliasMap: Record<string, string> = {
        '엘프국': '미르탈 숲연합',
        '수인국': '레오니스 투기국',
        '마족국': '네크로디움 제국',
        '남아프리카공화국': '남아공',
        '영국': '영국',
        '스코틀랜드': '스코틀랜드'
    };

    if (targetNation && nationAliasMap[targetNation]) {
        targetNation = nationAliasMap[targetNation];
    }

    // 국적이 없거나 '기타'인 경우 종족 및 해시 기반으로 현실적인 출신국 배정
    if (!targetNation || targetNation === '기타') {
        const race = person.race;
        if (race === 'Elf' || race === '엘프') targetNation = '미르탈 숲연합';
        else if (race === 'Beast' || race === '수인') targetNation = '레오니스 투기국';
        else if (race === 'Demon' || race === '마족') targetNation = '임페리얼 제국';
        else if (race === 'Celestial' || race === 'Angel') targetNation = '신의 성소';
        else if (person.currentLocation?.nation && person.currentLocation.nation !== '기타') {
            targetNation = person.currentLocation.nation;
        } else {
            // 다국적 인물 풀에서 고르게 분배
            const fallbackNations = ['대한민국', '일본', '미국', '영국', '독일', '프랑스', '중국', '호주', '캐나다', '스페인', '이탈리아', '러시아'];
            targetNation = fallbackNations[hash % fallbackNations.length];
        }
    }

    // 7. 일정 적은 확률 (15%)로 해외/타국 도시 체류 (유학, 방랑, 모험, 외교/파견 등)
    const isAbroad = (hash % 100) < 15;

    if (isAbroad) {
        const foreignLocations: GameLocation[] = [];
        for (const [regionName, nations] of Object.entries(WORLD_GEOGRAPHY)) {
            for (const [natName, natData] of Object.entries(nations)) {
                if (natName !== targetNation) {
                    const cities = natData.cities && natData.cities.length > 0 ? natData.cities : [natData.capital || '수도'];
                    cities.forEach(city => {
                        foreignLocations.push({
                            region: regionName,
                            nation: natName,
                            city: city
                        });
                    });
                }
            }
        }

        if (foreignLocations.length > 0) {
            const foreignIndex = Math.floor(hash / 100) % foreignLocations.length;
            return foreignLocations[foreignIndex];
        }
    }

    // 8. 기본 (85%): 본인 국적(targetNation)의 다양한 도시에 고르게 거주
    for (const [regionName, nations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nations[targetNation]) {
            const nationData = nations[targetNation];
            const cities = nationData.cities && nationData.cities.length > 0 
                ? nationData.cities 
                : [nationData.capital || '수도'];

            const cityIndex = Math.floor(hash / 7) % cities.length;
            const assignedCity = cities[cityIndex];

            return {
                region: regionName,
                nation: targetNation,
                city: assignedCity
            };
        }
    }

    // 9. 폴백
    return {
        region: character.currentLocation?.region || '아시아',
        nation: targetNation,
        city: '수도'
    };
};

