import { Character, Companion, Stats, Item, ItemRarity, Skill, SkillType, Enemy, DerivedStats, ClassTier, ActiveStatus, WeaponType } from '../types';
import { SELL_PRICES, SHINRYOKU_AFFINITY, BASE_MONSTERS, MONSTER_PREFIXES, SHINRYOKU_TYPES_LIST, NATION_NAMES, HUMANOID_CLASSES, ENEMY_SKILL_POOL, WEAPON_KEYWORDS, WEAPON_MASTERY_CONFIG, WEAPON_MASTERY_MAX_LEVEL, NATION_DATA } from '../constants';

// Helper to determine Weapon Type from Item
export const getWeaponTypeFromItem = (item: Item): WeaponType | undefined => {
    if (!item) return undefined;
    // 1. Explicitly set
    if (item.weaponType) return item.weaponType;
    
    // 2. Determine from Keywords
    const name = (item.name || "").toLowerCase();
    for (const [type, keywords] of Object.entries(WEAPON_KEYWORDS)) {
        if ((keywords as string[]).some(k => name.includes(k))) {
            return type as WeaponType;
        }
    }
    
    // 3. Fallback for generic 'Weapon' types if unclassifiable
    if (item.type === 'Weapon' || item.type === 'SubWeapon') {
        if (name.includes('지팡이') || name.includes('스태프')) return 'Staff';
        if (name.includes('활')) return 'Bow';
        if (name.includes('검')) return 'Sword';
    }
    
    return undefined;
};

// Helper to calculate enhanced stat value
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

// Specific Stat Patterns for robust parsing
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

// Helper to calculate total stats including equipment (Flat Bonuses Only)
export const calculateTotalStats = (character: Character | Companion | Enemy): { total: Stats, bonus: Partial<Stats> } => {
    const defaultStats: Stats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
    
    if (!character) {
        return { total: defaultStats, bonus: {} };
    }

    // Initialize with default stats to ensure all keys exist
    let baseStats: Stats = { ...defaultStats };
    
    if ('stats' in character && character.stats) {
        baseStats = { ...character.stats };
    }

    if ('hp' in character && typeof character.hp === 'number') {
        baseStats.hp = character.hp;
    }
    if ('maxHp' in character && typeof character.maxHp === 'number') {
        baseStats.maxHp = character.maxHp;
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
                // 1. Basic Stats on Item (Fixed Properties)
                if (it.stats) {
                    const enhancementLevel = it.enhancement || 0;
                    Object.entries(it.stats).forEach(([key, val]) => {
                        const numVal = Number(val);
                        if (!isNaN(numVal)) {
                            const finalVal = getEnhancedStatValue(numVal, enhancementLevel, key);
                            bonusStats[key] = (bonusStats[key] || 0) + finalVal;
                            (baseStats as any)[key] = ((baseStats as any)[key] || 0) + finalVal;
                        }
                    });
                }

                // 2. Secondary Options (Flat Stats Only)
                if (it.secondaryOptions) {
                    it.secondaryOptions.forEach(opt => {
                        const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
                        
                        // [NEW] Check for "All Stats +N" (Flat)
                        const allStatFlatMatch = cleanOpt.match(/(?:ALL|모든|전체)\s*(?:STATS?|스탯|능력치)(?:\s*[:]\s*|\s+)([+-]?\d+)(?!\s*%)/i);
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

                        // Specific Stats
                        for (const [pattern, statKey] of Object.entries(STAT_PATTERNS)) {
                            const regex = new RegExp(`(?:^|\\s)${pattern}(?:\\s*:\\s*|\\s+)([+-]?\\d+)(?!\\s*%)`, 'i');
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

export const calculateFinalStats = (character: Character | Companion | Enemy): { finalStats: Stats, baseTotal: Stats, buffBonus: Partial<Stats>, equipPercentBonus: Partial<Stats> } => {
    // 1. Get Base + Flat Bonuses (from calculateTotalStats)
    const { total: baseTotal, bonus: flatEquipBonus} = calculateTotalStats(character);
    const finalStats = { ...baseTotal };
    const buffBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    const equipPercentBonus: Partial<Stats> = { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, maxHp: 0, maxMp: 0 };
    
    let allStatMultiplier = 0; // For "Final Stats +%" options

    // 2. Scan Equipment for "Final Stats +%" or "All Stats +%" (Secondary Options)
    if ('equipment' in character && character.equipment) {
        Object.values(character.equipment).forEach((item: Item | undefined) => {
            if (item && item.secondaryOptions) {
                item.secondaryOptions.forEach(opt => {
                    const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
                    // Match "최종 능력치 +5%", "전체 스탯 5% 증가", "All Stats +5%"
                    // Allow optional + sign
                    const allStatMatch = cleanOpt.match(/(?:최종|전체|모든|ALL|FINAL|TOTAL)\s*(?:능력치|스탯|STATS?|ATTRIBUTES?)(?:\s*[:]\s*|\s+)?([+-]?\d+)%/i);
                    if (allStatMatch) {
                        allStatMultiplier += parseInt(allStatMatch[1]);
                    }
                });
            }
        });
    }

    // 3. Apply "Final Stats +%" Multiplier (Considered Equipment Bonus)
    if (allStatMultiplier > 0) {
        const factor = allStatMultiplier / 100;
        const keys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl', 'maxHp', 'maxMp'];
        keys.forEach(k => {
            // Apply % to the Base+FlatTotal
            const added = Math.max(1, Math.floor(baseTotal[k] * factor)); 
            equipPercentBonus[k] = (equipPercentBonus[k] || 0) + added;
            finalStats[k] += added;
        });
    }

    // 4. Apply Status Effect Buffs/Debuffs (Percentage Based) -> Goes to buffBonus
    if (character.statusEffects) {
        character.statusEffects.forEach(effect => {
            const effectStr = effect.effect || "";
            const stats = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP'];
            stats.forEach(statKey => {
                const regex = new RegExp(`${statKey}\\s*([+-]\\d+)%`, 'i');
                const match = effectStr.match(regex);
                if (match) {
                    const percent = parseInt(match[1]);
                    const key = statKey.toLowerCase() as keyof Stats;
                    // Buffs scale off the Base+Equip total
                    const baseVal = baseTotal[key] || 0;
                    const bonus = Math.floor(baseVal * (percent / 100));
                    
                    buffBonus[key] = (buffBonus[key] || 0) + bonus;
                    finalStats[key] = (finalStats[key] || 0) + bonus;
                }
            });
        });
    }

    // 5. Apply Passive Skills (Stats & MaxHP/MP) -> Goes to buffBonus
    if ('skills' in character && character.skills) {
        let equippedWeaponType: string | undefined;
        if ('equipment' in character && character.equipment?.weapon) {
            equippedWeaponType = getWeaponTypeFromItem(character.equipment.weapon);
        }

        character.skills.forEach(skill => {
            if (skill.type === SkillType.PASSIVE && skill.effectFormula) {
                // Regex matches: PASSIVE: [STR] +10% (+0.2% per Lv) [COND: Sword]
                const regex = /PASSIVE: \[([a-zA-Z]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)(?: \[COND: (.+)\])?/;
                const match = skill.effectFormula.match(regex);

                if (match) {
                    const target = match[1]; 
                    const basePercent = parseFloat(match[2]);
                    const scalePercent = parseFloat(match[3]);
                    const condition = match[4];

                    let isConditionMet = true;
                    if (condition && condition !== equippedWeaponType) {
                        isConditionMet = false;
                    }

                    // Map string target to Stats key
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

                    if (isConditionMet && key) {
                        const level = skill.level || 1;
                        const totalPercent = basePercent + (scalePercent * level);
                        
                        const baseVal = baseTotal[key] || 0;
                        const bonus = Math.floor(baseVal * (totalPercent / 100));

                        if (bonus > 0) {
                            buffBonus[key] = (buffBonus[key] || 0) + bonus;
                            finalStats[key] = (finalStats[key] || 0) + bonus;
                        }
                    }
                }
            }
        });
    }

    return { finalStats, baseTotal, buffBonus, equipPercentBonus };
};

export const calculateItemPrice = (item: Item): number => {
    if (!item) return 0;
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
    equipment?: any
): DerivedStats => {
    const s = (key: keyof Stats) => Number(stats[key]) || 0;
    
    let modPAtk = 1.0;
    let modMAtk = 1.0;
    let modPDef = 1.0;
    let modMDef = 1.0;
    let modAgi = 1.0;
    let modCrit = 0; 
    let modResist = 0; 


    statusEffects.forEach(effect => {
        if (effect.name === "감전") { modPDef *= 0.85; modMDef *= 0.85; }
        if (effect.name === "빙결") { modPDef *= 0.95; modMDef *= 0.95; }
        if (effect.name === "암흑") { modAgi *= 0.85; }
        if (effect.name === "공포") { modPAtk *= 0.8; modMAtk *= 0.8; modCrit -= 10; }
        if (effect.name === "속박") { modPDef *= 0.8; }
        if (effect.name === "소멸") { modPAtk *= 0.8; modMAtk *= 0.8; modPDef *= 0.75; modMDef *= 0.75; }
        if (effect.name === "파열") { modPDef *= 0.7; }
        if (effect.name === "월침") { modPDef *= 0.8; modMDef *= 0.8; modCrit -= 20; }
        
        const effectStr = effect.effect || "";
        const buffs = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'];
        buffs.forEach(stat => {
            const regex = new RegExp(`${stat}\\s*([+-]\\d+(\\.\\d+)?)%`, 'i');
            const match = effectStr.match(regex);
            if (match) {
                const val = parseFloat(match[1]) / 100;
                if (stat === 'STR') modPAtk *= (1 + val);
                if (stat === 'INT') modMAtk *= (1 + val);
                if (stat === 'DEF') { modPDef *= (1 + val); modMDef *= (1 + val); }
                if (stat === 'AGI') { modAgi *= (1 + val); modPAtk *= (1 + (val * 0.3)); }
                if (stat === 'WIS') { modMDef *= (1 + val); modMAtk *= (1 + (val * 0.2)); }
                if (stat === 'CTRL') modCrit += (val * 10);
            }
        });

        const derivedBuffs = [
            { key: 'P.Atk', var: 'modPAtk' },
            { key: 'M.Atk', var: 'modMAtk' },
            { key: 'P.Def', var: 'modPDef' },
            { key: 'M.Def', var: 'modMDef' }
        ];

        derivedBuffs.forEach(db => {
            const regex = new RegExp(`${db.key.replace('.', '\\.')}\\s*([+-]\\d+)%`, 'i');
            const match = effectStr.match(regex);
            if (match) {
                const val = parseInt(match[1]) / 100;
                if (db.var === 'modPAtk') modPAtk *= (1 + val);
                if (db.var === 'modMAtk') modMAtk *= (1 + val);
                if (db.var === 'modPDef') modPDef *= (1 + val);
                if (db.var === 'modMDef') modMDef *= (1 + val);
            }
        });
    });

    if (weaponMastery && weaponMastery.level > 0) {
        const atkBonus = weaponMastery.level * 0.005; 
        const critBonus = weaponMastery.level * 0.1;
        const magicTypes: WeaponType[] = ['Staff', 'Energy', 'Grimoire'];
        if (magicTypes.includes(weaponMastery.type)) {
            modMAtk *= (1 + atkBonus);
        } else {
            modPAtk *= (1 + atkBonus);
        }
        modCrit += critBonus;
    }

    if (subMastery && subMastery.level > 0) {
        const level = subMastery.level;
        if (subMastery.type === 'Shield') {
            modPDef *= (1 + (level * 0.005));
            modMDef *= (1 + (level * 0.005));
        } else if (subMastery.type === 'Orb') {
            modMDef *= (1 + (level * 0.005));
            modCrit += (level * 0.1); 
        } else if (subMastery.type === 'SubSword') {
            modPAtk *= (1 + (level * 0.005));
            modCrit += (level * 0.1); 
        }
    }

    if (elementalSynergy) {
        modPAtk *= 1.5;
        modMAtk *= 1.5;
    }

    if (skills) {
        skills.forEach(skill => {
            if (skill.type === SkillType.PASSIVE) {
                const formula = skill.effectFormula;
                const level = skill.level || 1;
                
                // Special Passives Logic (Derived Stats)
                if (formula.includes('ENHANCE_ATK')) {
                    const boost = 0.5 + (level * 0.01);
                    modPAtk *= (1 + boost);
                    modMAtk *= (1 + boost);
                }
                if (formula.includes('ENHANCE_DEF')) {
                    const boost = 0.5 + (level * 0.01);
                    modPDef *= (1 + boost);
                    modMDef *= (1 + boost);
                }
                if (formula.includes('STEEL_IRON')) {
                    const boost = 50 + (level * 0.1);
                    modResist += boost;
                }

                // Custom Passives (Derived Stats only, Base Stats handled in calculateFinalStats)
                const regex = /PASSIVE: \[([a-zA-Z]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)(?: \[COND: (.+)\])?/;
                const match = formula.match(regex);
                if (match) {
                    const target = match[1];
                    const basePercent = parseFloat(match[2]);
                    const scalePercent = parseFloat(match[3]);
                    const condition = match[4];
                    
                    let isConditionMet = true;
                    if (condition && equipment?.weapon) {
                        const equippedType = getWeaponTypeFromItem(equipment.weapon);
                        if (condition !== equippedType) isConditionMet = false;
                    } else if (condition) {
                        isConditionMet = false;
                    }

                    if (isConditionMet) {
                        const totalPercent = basePercent + (scalePercent * level);

                        // Only apply Derived Stat passives here. 
                        // STR, INT, HP etc are already applied in calculateFinalStats and passed in as `stats` argument.
                        if (target === 'CritChance') modCrit += totalPercent;
                        if (target === 'StatusResist') modResist += totalPercent;
                    }
                }
            }
        });
    }

    const agi = s('agi') * modAgi;
    const ctrl = s('ctrl');
    const str = s('str');
    const int = s('int');
    const wis = s('wis');
    const def = s('def');

    const pAtk = ((str * 1.0) + (agi * 0.3)) * modPAtk;
    const mAtk = ((int * 1.3) + (wis * 0.2)) * modMAtk;
    const pDef = (def * 0.8) * modPDef;
    const mDef = ((def * 0.4) + (wis * 0.4)) * modMDef;
    const accuracy = 95 + (stats.agi * 0.1);
    const evasion = (stats.agi * 0.1);
        const mAccuracy = 95 + (stats.wis * 0.1); // [NEW] 마법 명중률
    const mEvasion = (stats.wis * 0.1);      // [NEW] 마법 회피율
    const baseCrit = 5 + (ctrl * 0.1) + (agi * 0.1);
    const critChance = Math.min(100, Math.max(0, baseCrit + modCrit));
    
    const statusResist = Math.min(100, (ctrl / (ctrl + 500)) * 100 + modResist);

    return {
        pAtk: isNaN(pAtk) ? 0 : pAtk,
        mAtk: isNaN(mAtk) ? 0 : mAtk,
        pDef: isNaN(pDef) ? 0 : pDef,
        mDef: isNaN(mDef) ? 0 : mDef,
        critChance: isNaN(critChance) ? 0 : critChance,
        statusResist: isNaN(statusResist) ? 0 : statusResist,
        accuracy: isNaN(accuracy) ? 95 : accuracy, // 추가됨
        evasion: isNaN(evasion) ? 0 : evasion, 
        mEvasion: isNaN(mEvasion) ? 0 : mEvasion,  
        mAccuracy: isNaN(mAccuracy) ? 0 : mAccuracy,       // 추가됨
    };
};
