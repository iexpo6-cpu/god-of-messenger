
import { Character, CapturedMonster, Companion, ClassTier, Stats, JobType, MonsterStage } from '../types';
import { MAX_PARTY_SIZE } from '../constants';
import { calculateTotalHousingCapacity, calculateTotalMonsterCapacity } from '../utils';

export const recruitMonster = (
    character: Character, 
    monsterId: string
): { success: boolean, newCharacter: Character, message: string, type: 'party' | 'base' | 'fail' } => {
    const newChar = { ...character };
    
    // Deep copy for safety
    if (newChar.base) newChar.base = { ...newChar.base };
    if (newChar.base?.capturedMonsters) newChar.base.capturedMonsters = [...newChar.base.capturedMonsters];
    newChar.companions = [...newChar.companions];
    newChar.inactiveCompanions = [...(newChar.inactiveCompanions || [])];

    const monsterIdx = newChar.base?.capturedMonsters?.findIndex(m => m.id === monsterId);
    if (monsterIdx === undefined || monsterIdx === -1) {
        return { success: false, newCharacter: character, message: "몬스터를 찾을 수 없습니다.", type: 'fail' };
    }

    const monster = newChar.base!.capturedMonsters[monsterIdx];

    // Check Capacity
    const partyFull = newChar.companions.length >= MAX_PARTY_SIZE;
    
    // Housing Capacity Check using utility function
    const housingCapacity = calculateTotalHousingCapacity(newChar.base, newChar.inactiveCompanions);
    const baseFull = newChar.inactiveCompanions.length >= housingCapacity;

    if (partyFull && baseFull) {
        return { success: false, newCharacter: character, message: "파티와 기지(숙소)가 모두 가득 찼습니다.", type: 'fail' };
    }

    // Remove from Farm
    newChar.base!.capturedMonsters.splice(monsterIdx, 1);

    // Create Companion Object
    // Explicitly set race to "몬스터" and isMonster to true to ensure proper UI handling
    const newCompanion: Companion = {
        id: monster.id,
        name: monster.nickname || monster.name,
        age: "알 수 없음",
        gender: "알 수 없음",
        race: "몬스터", // Explicitly set
        nation: "없음",
        appearance: monster.appearance || "길들여진 몬스터",
        personality: monster.disposition || "중립",
        classType: monster.stage || "몬스터",
        job: JobType.UNEMPLOYED, 
        level: monster.level || 1,
        currentExp: monster.currentExp || 0,
        maxExp: monster.maxExp || 100,
        statPoints: monster.statPoints || 0,
        classTier: ClassTier.NONE,
        shinryokuType: monster.shinryokuType,
        stats: monster.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 },
        skills: monster.skills || [],
        statusEffects: [],
        equipment: {},
        inventory: [],
        affection: monster.affection,
        loyalty: 50,
        isMonster: true, // Explicitly flag
        isCustom: false,
        isCustomMonster: false,
        monsterData: monster // Backup original data for return
    };

    let type: 'party' | 'base' = 'party';

    if (!partyFull) {
        newChar.companions.push(newCompanion);
    } else {
        newChar.inactiveCompanions.push(newCompanion);
        type = 'base';
    }

    const locationName = type === 'party' ? "파티" : "기지(대기)";
    const message = `[시스템] ${newCompanion.name}을(를) ${locationName} 동료로 영입했습니다!`;

    return { success: true, newCharacter: newChar, message, type };
};

export const returnMonsterToFarm = (
    character: Character,
    companionId: string,
    source: 'party' | 'base'
): { success: boolean, newCharacter: Character, message: string } => {
    const newChar = { ...character };
    
    // Deep copy for safety
    if (newChar.base) newChar.base = { ...newChar.base };
    if (newChar.base?.capturedMonsters) newChar.base.capturedMonsters = [...newChar.base.capturedMonsters];
    newChar.companions = [...newChar.companions];
    newChar.inactiveCompanions = [...(newChar.inactiveCompanions || [])];

    let comp: Companion | undefined;
    let compIdx: number = -1;

    if (source === 'party') {
        compIdx = newChar.companions.findIndex(c => c.id === companionId);
        comp = newChar.companions[compIdx];
    } else {
        compIdx = newChar.inactiveCompanions.findIndex(c => c.id === companionId);
        comp = newChar.inactiveCompanions[compIdx];
    }

    if (!comp || compIdx === -1) {
        return { success: false, newCharacter: character, message: "동료를 찾을 수 없습니다." };
    }

    if (!comp.isMonster && comp.race !== '몬스터' && !comp.monsterData) {
        return { success: false, newCharacter: character, message: "이 동료는 몬스터가 아닙니다." };
    }

    // Prepare Monster Data
    const baseMonsterData = comp.monsterData || {
        id: comp.id,
        name: comp.name,
        hp: comp.stats.hp,
        maxHp: comp.stats.maxHp,
        level: comp.level,
        stats: comp.stats,
        shinryokuType: comp.shinryokuType,
        skills: comp.skills,
        statusEffects: [],
        rank: 'C',
        affection: comp.affection,
        isTamed: true,
        capturedDate: character.currentDate || 'Unknown',
        stage: comp.classType as any,
        nickname: undefined,
        trainingLog: undefined
    } as CapturedMonster;

    const compAny = comp as any;
    const updatedMonster: CapturedMonster = {
        ...baseMonsterData,
        id: comp.id,
        name: comp.name || baseMonsterData.name,
        nickname: compAny.nickname || (comp.name !== baseMonsterData.name ? comp.name : baseMonsterData.nickname),
        stage: compAny.monsterStage || (comp.classType as any) || baseMonsterData.stage || MonsterStage.ADULT,
        appearance: comp.appearance || baseMonsterData.appearance,
        rank: compAny.rank || baseMonsterData.rank || 'B',
        level: comp.level || baseMonsterData.level || 1,
        currentExp: comp.currentExp || compAny.exp || 0,
        maxExp: comp.maxExp || 100,
        stats: comp.stats || baseMonsterData.stats,
        hp: comp.stats?.hp || baseMonsterData.stats?.hp,
        maxHp: comp.stats?.maxHp || baseMonsterData.stats?.maxHp,
        affection: comp.affection !== undefined ? comp.affection : baseMonsterData.affection,
        skills: comp.skills || baseMonsterData.skills || [],
        trainingLog: baseMonsterData.trainingLog || { str: 0, int: 0, def: 0, agi: 0, magic: 0 }
    };

    // Remove from source
    if (source === 'party') {
        newChar.companions.splice(compIdx, 1);
    } else {
        newChar.inactiveCompanions.splice(compIdx, 1);
    }

    // Add to Farm
    if (!newChar.base) {
        return { success: false, newCharacter: character, message: "기지가 존재하지 않습니다." };
    }

    if (!newChar.base.capturedMonsters) newChar.base.capturedMonsters = [];

    const existingFarmIdx = newChar.base.capturedMonsters.findIndex(m => m.id === updatedMonster.id);
    if (existingFarmIdx !== -1) {
        newChar.base.capturedMonsters[existingFarmIdx] = updatedMonster;
    } else {
        // Check Monster Farm Capacity only if it's a new monster being added
        const farmCapacity = calculateTotalMonsterCapacity(newChar.base);
        const currentMonsterCount = newChar.base.capturedMonsters.filter(m => m.stage !== MonsterStage.EGG).length;
        
        if (currentMonsterCount >= farmCapacity) {
            return { success: false, newCharacter: character, message: "몬스터 사육소의 수용량이 가득 찼습니다." };
        }
        newChar.base.capturedMonsters.push(updatedMonster);
    }

    // Return equipment to inventory
    const newInventory = [...newChar.inventory];
    if (comp.equipment) {
        Object.values(comp.equipment).forEach(item => {
            if (item) newInventory.push(item);
        });
    }
    newChar.inventory = newInventory;

    return {
        success: true,
        newCharacter: newChar,
        message: `[시스템] ${comp.name}을(를) 몬스터 사육소로 되돌려 보냈습니다.`
    };
};
