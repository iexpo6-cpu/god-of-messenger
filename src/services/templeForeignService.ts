import { Character, Companion, Item, ItemRarity, JobType, DiplomaticStatus, ClassTier, NationRelation, DivineDiplomacyStatus, DivineRelation } from '../types';
import { generateName, generateCompanionStats, getTierByLevel, addDays } from '../utils';
import { NATION_INFO, SHINRYOKU_TYPES_LIST } from '../constants';
import { NATION_RELICS, NATION_HEROES, DEFAULT_HERO } from '../nationLoreData';

/**
 * 사자의 비호 의식 수행 로직
 */
export const processDivineProtection = (character: Character, nationName: string): { newChar: Character, result: any } => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return { newChar, result: null };

    const templeCity = character.currentLocation?.city || "Unknown";
    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    
    if (!newChar.templeDiplomacy) newChar.templeDiplomacy = {};
    if (!newChar.templeDiplomacy[nationName]) {
        newChar.templeDiplomacy[nationName] = { status: DivineDiplomacyStatus.NEUTRAL, faithPoints: 100, influence: 10, tributeLevel: 0, tension: 0 };
    }

    const rel = newChar.templeDiplomacy[nationName];
    rel.status = DivineDiplomacyStatus.BLESSED;
    rel.protectionYears = 5;
    rel.protectionStartDate = character.currentDate;
    rel.protectionEndDate = addDays(character.currentDate || '2000-01-01', 1825);
    
    rel.faithPoints = Math.min(1000, rel.faithPoints + 200);
    rel.influence = Math.min(100, rel.influence + 30);

    const isMagye = nationName === "임페리얼 제국" || nationName === "네크로디움 제국";
    
    // 비호 성공 시 성전 위엄도 상승
    const majestyGain = isMagye ? -1000 : 100;
    
    if (newChar.base.templePersonnel?.[templeKey]) {
        newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + majestyGain;
    }
    
    // 비호 의식 소모량
    newChar.faith = Math.max(0, (newChar.faith || 0) - 50000);

    let rewardMsg = "";
    let rewardItem: Item | null = null;
    let rewardHero: Companion | null = null;

    const roll = Math.random();
    // 20% 확률로 성물 기증
    if (roll < 0.2) {
        const relicData = NATION_RELICS[nationName] || NATION_RELICS["대한민국"];
        rewardItem = { ...relicData, enhancement: 0, secondaryOptions: ["최종 능력치 +10%"] } as Item;
        newChar.inventory.push(rewardItem);
        rewardMsg = `${nationName}에서 감사의 표시로 성물 '${rewardItem.name}'을(를) 기증했습니다.`;
    }

    return { 
        newChar, 
        result: { majestyChange: majestyGain, rewardMsg, rewardItem, rewardHero, type: 'protection' } 
    };
};

/**
 * 사자의 신성 정벌 성공 처리
 */
export const processDivineInvasion = (character: Character, nationName: string): { newChar: Character, result: any } => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return { newChar, result: null };

    const templeCity = character.currentLocation?.city || "Unknown";
    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    
    if (!newChar.templeDiplomacy) newChar.templeDiplomacy = {};
    const rel = newChar.templeDiplomacy[nationName] || { status: DivineDiplomacyStatus.NEUTRAL, faithPoints: 0, influence: 0, tributeLevel: 0, tension: 0 };
    
    rel.status = DivineDiplomacyStatus.SUBJUGATED;
    rel.subjugatedYears = 5;
    rel.subjugatedStartDate = character.currentDate;
    rel.subjugatedEndDate = addDays(character.currentDate || '2000-01-01', 1825);
    
    rel.influence = 100;
    rel.tributeLevel = 1;
    newChar.templeDiplomacy[nationName] = rel;

    const goldLoot = character.level * 10000;
    newChar.money += goldLoot;

    const relicData = NATION_RELICS[nationName] || NATION_RELICS["대한민국"];
    const lootedItem = { ...relicData, name: `${relicData.name}`, enhancement: 0} as Item;
    newChar.inventory.push(lootedItem);

    return {
        newChar,
        result: { goldLoot, majestyChange: 0, lootedItem, type: 'invasion' }
    };
};
