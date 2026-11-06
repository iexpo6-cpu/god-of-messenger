import { Character, Item, ItemRarity } from '../types';
import { ENHANCEMENT_CAPS, ENHANCEMENT_CONFIG } from '../constants';
import { calculateItemCPDelta, gainProfessionExp } from '../utils';

/**
 * 대장장이 숙련도에 따라 장비 옵션 퍼센트 수치를 보정하는 함수
 * 신화 장비의 경우 숙련도의 가중치를 더욱 크게 반영합니다.
 */
export const applyBlacksmithMasteryToOptions = (
    options: string[],
    rarity: ItemRarity | string,
    masteryLevel: number
): string[] => {
    if (!options || options.length === 0) return options;
    const level = Math.max(1, masteryLevel);

    const isMythic = rarity === ItemRarity.MYTHTIC || rarity === 'MYTHTIC' || rarity === 'MYTHIC';

    // 일반 등급: 레벨당 +2.5% 증폭
    // 신화 등급: 레벨당 +8.0% 증폭 (대장장이 숙련도 가중치 대폭 강화!)
    const multiplier = isMythic
        ? 1 + (level * 0.08)
        : 1 + (level * 0.025);

    return options.map(opt => {
        return opt.replace(/(\+\d+(?:\.\d+)?)(%)/g, (_, valStr, unit) => {
            const val = parseFloat(valStr.replace('+', ''));
            const newVal = Math.round(val * multiplier);
            return `+${newVal}${unit}`;
        });
    });
};


export interface BatchItemEnhanceResult {
    success: boolean;
    destroyed: boolean;
    attempts: number;
    startEnhancement: number;
    finalEnhancement: number;
    goldSpent: number;
    ironSpent: number;
    manaSpent: number;
    unlockedOption?: string;
    lostOption?: string;
    updatedCharacter: Character;
    message: string;
    oldCP: number;
    newCP: number;
    stopReason: 'success' | 'destroyed' | 'max_level' | 'no_resources' | 'max_attempts';
}

export interface BatchOptionEnhanceResult {
    success: boolean;
    attempts: number;
    optionIndex: number;
    oldOptionText: string;
    newOptionText: string;
    startLevel: number;
    finalLevel: number;
    goldSpent: number;
    manaSpent: number;
    updatedCharacter: Character;
    message: string;
    oldCP: number;
    newCP: number;
    stopReason: 'success' | 'max_level' | 'no_resources' | 'max_attempts';
}

export const getItemEnhanceCost = (item: Item) => {
    const currentEnh = item.enhancement || 0;

    // 장비 등급별 철광석 배율 (기존 대비 10배)
    const rarityIronMult: Record<string, number> = {
        [ItemRarity.NORMAL]: 20,
        [ItemRarity.MAGIC]: 40,
        [ItemRarity.RARE]: 60,
        [ItemRarity.EPIC]: 100,
        [ItemRarity.UNIQUE]: 150,
        [ItemRarity.LEGENDARY]: 250,
        [ItemRarity.MYTHTIC]: 400,
        NORMAL: 20,
        MAGIC: 40,
        RARE: 60,
        EPIC: 100,
        UNIQUE: 150,
        LEGENDARY: 250,
        MYTHTIC: 400,
        MYTHIC: 400
    };
    const ironCost = (currentEnh + 1) * (rarityIronMult[item.rarity] || 50);

    // 장비 등급별 골드 배율 (기존 대비 10배: 기본 1,000G 단위)
    const rarityGoldMult: Record<string, number> = {
        [ItemRarity.NORMAL]: 1,
        [ItemRarity.MAGIC]: 2,
        [ItemRarity.RARE]: 5,
        [ItemRarity.EPIC]: 10,
        [ItemRarity.UNIQUE]: 25,
        [ItemRarity.LEGENDARY]: 60,
        [ItemRarity.MYTHTIC]: 150,
        NORMAL: 1,
        MAGIC: 2,
        RARE: 5,
        EPIC: 10,
        UNIQUE: 25,
        LEGENDARY: 60,
        MYTHTIC: 150,
        MYTHIC: 150
    };
    const goldCost = (currentEnh + 1) * 1000 * (rarityGoldMult[item.rarity] || 1);

    // 유니크 이상 등급부터 마정석 포함 (에픽 이하는 0개, 기존 대비 10배)
    let manaCost = 0;
    if (item.rarity === ItemRarity.UNIQUE || (item.rarity as any) === 'UNIQUE') {
        manaCost = (currentEnh + 1) * 10;
    } else if (item.rarity === ItemRarity.LEGENDARY || (item.rarity as any) === 'LEGENDARY') {
        manaCost = (currentEnh + 1) * 20;
    } else if (item.rarity === ItemRarity.MYTHTIC || (item.rarity as any) === 'MYTHTIC' || (item.rarity as any) === 'MYTHIC') {
        manaCost = (currentEnh + 1) * 40;
    }

    return { iron: ironCost, gold: goldCost, mana: manaCost };
};

export const getOptionRarityMultiplier = (rarity: ItemRarity | string): number => {
    switch (rarity) {
        case ItemRarity.NORMAL:
        case 'NORMAL':
        case ItemRarity.MAGIC:
        case 'MAGIC':
            return 1;
        case ItemRarity.RARE:
        case 'RARE':
            return 2;
        case ItemRarity.EPIC:
        case 'EPIC':
            return 3;
        case ItemRarity.UNIQUE:
        case 'UNIQUE':
            return 4;
        case ItemRarity.LEGENDARY:
        case 'LEGENDARY':
            return 5;
        case ItemRarity.MYTHTIC:
        case 'MYTHTIC':
        case 'MYTHIC':
            return 10;
        default:
            return 1;
    }
};

export const getOptionRerollCost = (item: Item, lockedCount: number = 0) => {
    const optionCount = item.secondaryOptions?.length || 0;
    const mult = getOptionRarityMultiplier(item.rarity);
    const lockCostPerOption = 50 * mult;
    const baseManaCost = 20 * optionCount * mult;
    const userLockCost = lockedCount * lockCostPerOption;
    const totalManaCost = baseManaCost + userLockCost;
    return {
        mult,
        lockCostPerOption,
        baseManaCost,
        userLockCost,
        totalManaCost
    };
};

export const getOptionEnhanceCost = (item: Item, currentLevel: number = 1) => {
    const mult = getOptionRarityMultiplier(item.rarity);
    const goldCost = 5000 * currentLevel * mult;
    const manaCost = 5 * currentLevel * mult;
    return {
        mult,
        goldCost,
        manaCost
    };
};

export const getItemEnhanceRate = (item: Item, bonusRate: number = 0) => {
    const currentEnh = item.enhancement || 0;
    let baseRate = ENHANCEMENT_CONFIG.baseSuccess(currentEnh + 1);
    const penalty = (currentEnh + 1) * 2;
    const rarityMod = ENHANCEMENT_CONFIG.rarityMod[item.rarity] || 0;
    const pityBonus = (item.failureCount || 0) * 2;
    let finalSuccessRate = baseRate - penalty + rarityMod + pityBonus + bonusRate;
    if ((item.failureCount || 0) >= 5) finalSuccessRate = 100;
    return Math.max(1, Math.min(100, finalSuccessRate));
};

const SECONDARY_OPTION_POOL: Record<number, string[]> = {
    5: ["물리 공격력 +3%", "마법 공격력 +3%", "치명타 확률 +2%", "치명타 피해량 +3%", "모든 속성 피해 +3%", "모든 속성 저항 +3%"],
    8: ["치명타 확률 +5%", "치명타 피해량 +5%", "물리 공격력 +5%", "마법 공격력 +5%", "모든 속성 피해 +5%", "모든 속성 저항 +5%"],
    10: ["최종 능력치 +5%", "치명타 확률 +8%", "치명타 피해량 +8%", "물리 공격력 +8%", "마법 공격력 +8%", "모든 속성 피해 +8%", "모든 속성 저항 +5%"],
    15: ["상태이상 저항 +10%", "물리 공격력 +10%", "마법 공격력 +10%", "모든 속성 저항 +10%", "치명타 피해량 +10%", "모든 속성 피해 +10%"],
    20: ["최종 능력치 +13%", "치명타 피해량 +15%", "모든 속성 피해 +15%", "모든 속성 저항 +15%", "물리 공격력 +15%", "마법 공격력 +15%"]
};

/**
 * 기본 장비 강화: 성공할 때까지(또는 파괴/자원 부족/최대 달성 시까지) 자동으로 연속 강화 시도
 */
export const executeBatchItemEnhanceUntilSuccess = (
    character: Character,
    itemIndex: number,
    masterySuccessBonus: number = 0,
    maxAllowedAttempts: number = 100
): BatchItemEnhanceResult => {
    let currentChar = JSON.parse(JSON.stringify(character)) as Character;
    const initialItem = currentChar.inventory[itemIndex];

    if (!initialItem) {
        return {
            success: false,
            destroyed: false,
            attempts: 0,
            startEnhancement: 0,
            finalEnhancement: 0,
            goldSpent: 0,
            ironSpent: 0,
            manaSpent: 0,
            updatedCharacter: currentChar,
            message: '대상을 찾을 수 없습니다.',
            oldCP: 0,
            newCP: 0,
            stopReason: 'no_resources'
        };
    }

    const startEnhancement = initialItem.enhancement || 0;
    const initialCP = calculateItemCPDelta(initialItem, initialItem, currentChar).oldCP;
    const maxEnh = ENHANCEMENT_CAPS[initialItem.rarity] || 5;

    let attempts = 0;
    let totalGold = 0;
    let totalIron = 0;
    let totalMana = 0;
    let isSuccess = false;
    let isDestroyed = false;
    let stopReason: BatchItemEnhanceResult['stopReason'] = 'max_attempts';
    let unlockedOpt = '';
    let lostOpt = '';

    while (attempts < maxAllowedAttempts) {
        const currentItem = currentChar.inventory[itemIndex];
        if (!currentItem) {
            isDestroyed = true;
            stopReason = 'destroyed';
            break;
        }

        const currentEnh = currentItem.enhancement || 0;
        if (currentEnh >= maxEnh) {
            stopReason = 'max_level';
            break;
        }

        // 비용 계산
        const cost = getItemEnhanceCost(currentItem);
        const currentRes = currentChar.base?.resources;
        const hasIron = (currentRes?.iron || 0) >= cost.iron;
        const hasGold = currentChar.money >= cost.gold;
        const hasMana = (currentRes?.manaCrystal || 0) >= cost.mana;

        if (!hasIron || !hasGold || !hasMana) {
            stopReason = 'no_resources';
            break;
        }

        // 자원 차감
        attempts++;
        totalGold += cost.gold;
        totalIron += cost.iron;
        totalMana += cost.mana;

        currentChar.money -= cost.gold;
        if (currentChar.base?.resources) {
            currentChar.base.resources.iron = (currentChar.base.resources.iron || 0) - cost.iron;
            currentChar.base.resources.manaCrystal = (currentChar.base.resources.manaCrystal || 0) - cost.mana;
        }

        // 확률 계산
        const effectiveRate = getItemEnhanceRate(currentItem, 0) + masterySuccessBonus;
        const roll = Math.random() * 100;
        const success = roll < effectiveRate;

        if (success) {
            const nextLevel = currentEnh + 1;
            gainProfessionExp(currentChar, 'crafting', 10 + currentEnh * 2);
            let updatedItem: Item = { ...currentItem, enhancement: nextLevel, failureCount: 0 };

            if (!updatedItem.stats || Object.keys(updatedItem.stats).length === 0) {
                const possibleStats = ['str', 'int', 'def', 'agi', 'wis', 'ctrl'];
                const randomStat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
                updatedItem.stats = { [randomStat]: 1 };
            }

            const newSecondaryOptions = [...(updatedItem.secondaryOptions || [])];
            const pool = SECONDARY_OPTION_POOL[nextLevel];
            if (pool && pool.length > 0) {
                const availableOptions = pool.filter(option => !newSecondaryOptions.includes(option));
                if (availableOptions.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableOptions.length);
                    unlockedOpt = availableOptions[randomIndex];
                    newSecondaryOptions.push(unlockedOpt);
                }
            }

            updatedItem.secondaryOptions = newSecondaryOptions;
            currentChar.inventory[itemIndex] = updatedItem;

            isSuccess = true;
            stopReason = 'success';
            break; // 1회 성공했으므로 연속 루프 종료!
        } else {
            // 실패 처리
            const safetyZone = ENHANCEMENT_CONFIG.safetyZone[currentItem.rarity];
            const canBreak = currentEnh >= 6;
            let resultType: 'failure' | 'destroy' = "failure";

            if (canBreak) {
                const destructionRate = ENHANCEMENT_CONFIG.destructionRate(currentEnh);
                if (Math.random() * 100 < destructionRate) {
                    resultType = "destroy";
                }
            }

            if (resultType === "destroy") {
                currentChar.inventory.splice(itemIndex, 1);
                isDestroyed = true;
                stopReason = 'destroyed';
                break; // 파괴되었으므로 중단
            } else {
                let nextInventoryOptions = [...(currentItem.secondaryOptions || [])];
                if (currentEnh >= safetyZone && canBreak) {
                    const newLevel = Math.max(0, currentEnh - 1);
                    const milestones = [5, 8, 10, 15, 20];
                    if (milestones.includes(currentEnh)) {
                        lostOpt = nextInventoryOptions.pop() || "";
                    }
                    currentChar.inventory[itemIndex] = {
                        ...currentItem,
                        enhancement: newLevel,
                        secondaryOptions: nextInventoryOptions,
                        failureCount: (currentItem.failureCount || 0) + 1
                    };
                } else {
                    currentChar.inventory[itemIndex] = {
                        ...currentItem,
                        failureCount: (currentItem.failureCount || 0) + 1
                    };
                }
            }
        }
    }

    const finalItem = currentChar.inventory[itemIndex];
    const finalEnhancement = finalItem ? (finalItem.enhancement || 0) : 0;
    const finalCP = finalItem ? calculateItemCPDelta(finalItem, finalItem, currentChar).oldCP : 0;

    let message = '';
    if (isSuccess) {
        message = `[연속 강화 성공] 총 ${attempts}회 시도 끝에 +${finalEnhancement} 달성 성공! (소모: 골드 ${totalGold.toLocaleString()}G, 철광석 ${totalIron}개, 마정석 ${totalMana}개)`;
    } else if (isDestroyed) {
        message = `[연속 강화 파괴] ${attempts}회차 강화 도중 장비가 파괴되었습니다. (소모: 골드 ${totalGold.toLocaleString()}G, 철광석 ${totalIron}개, 마정석 ${totalMana}개)`;
    } else if (stopReason === 'no_resources') {
        if (attempts === 0) {
            message = `[연속 강화 중단] 강화에 필요한 재료가 부족합니다.`;
        } else {
            message = `[연속 강화 소진] 보유 재료가 모두 소진되어 연속 강화를 중단했습니다. (${attempts}회 시도, 소모: 골드 ${totalGold.toLocaleString()}G, 철광석 ${totalIron}개, 마정석 ${totalMana}개)`;
        }
    } else {
        message = `[연속 강화 종료] 총 ${attempts}회 시도 완료.`;
    }

    return {
        success: isSuccess,
        destroyed: isDestroyed,
        attempts,
        startEnhancement,
        finalEnhancement,
        goldSpent: totalGold,
        ironSpent: totalIron,
        manaSpent: totalMana,
        unlockedOption: unlockedOpt,
        lostOption: lostOpt,
        updatedCharacter: currentChar,
        message,
        oldCP: initialCP,
        newCP: finalCP,
        stopReason
    };
};

/**
 * 개별 옵션 수치 강화: 성공할 때까지(또는 자원 부족/최대 레벨 달성 시까지) 자동으로 연속 강화 시도
 */
export const executeBatchOptionEnhanceUntilSuccess = (
    character: Character,
    itemIndex: number,
    optionIndex: number,
    bonusRate: number = 0,
    maxAllowedAttempts: number = 100
): BatchOptionEnhanceResult => {
    let currentChar = JSON.parse(JSON.stringify(character)) as Character;
    const item = currentChar.inventory[itemIndex];

    if (!item || !item.secondaryOptions || !item.secondaryOptions[optionIndex]) {
        return {
            success: false,
            attempts: 0,
            optionIndex,
            oldOptionText: '',
            newOptionText: '',
            startLevel: 0,
            finalLevel: 0,
            goldSpent: 0,
            manaSpent: 0,
            updatedCharacter: currentChar,
            message: '옵션이 유효하지 않습니다.',
            oldCP: 0,
            newCP: 0,
            stopReason: 'no_resources'
        };
    }

    const initialOptionLevels = [...(item.optionLevels || [])];
    const initialLevel = initialOptionLevels[optionIndex] || 1;
    const oldOptionText = item.secondaryOptions[optionIndex];
    const initialCP = calculateItemCPDelta(item, item, currentChar).oldCP;

    let attempts = 0;
    let totalGold = 0;
    let totalMana = 0;
    let isSuccess = false;
    let stopReason: BatchOptionEnhanceResult['stopReason'] = 'max_attempts';
    let currentItem = { ...item };
    let newOptionText = oldOptionText;

    while (attempts < maxAllowedAttempts) {
        const optionLevels = currentItem.optionLevels && currentItem.optionLevels.length > 0
            ? [...currentItem.optionLevels]
            : new Array(currentItem.secondaryOptions.length).fill(1);
        
        const currentLevel = optionLevels[optionIndex] || 1;
        const maxLevel = currentItem.optionMaxLevels?.[optionIndex] || currentChar.optionMaxLevel || 5;

        if (currentLevel >= maxLevel) {
            stopReason = 'max_level';
            break;
        }

        const { goldCost, manaCost } = getOptionEnhanceCost(currentItem, currentLevel);

        const currentRes = currentChar.base?.resources;
        if (currentChar.money < goldCost || (currentRes?.manaCrystal || 0) < manaCost) {
            stopReason = 'no_resources';
            break;
        }

        attempts++;
        totalGold += goldCost;
        totalMana += manaCost;

        currentChar.money -= goldCost;
        if (currentChar.base?.resources) {
            currentChar.base.resources.manaCrystal = (currentChar.base.resources.manaCrystal || 0) - manaCost;
        }

        const successRate = (20 - (currentLevel * 2)) + bonusRate;
        const roll = Math.random() * 100;

        if (roll < successRate) {
            // 성공!
            const nextLevel = currentLevel + 1;
            optionLevels[optionIndex] = nextLevel;

            const valMatch = oldOptionText.match(/(\d+)/);
            if (valMatch) {
                const val = parseInt(valMatch[1]);
                const newVal = Math.floor(val * 1.1) + 1;
                newOptionText = oldOptionText.replace(val.toString(), newVal.toString());
            }

            const updatedSecondary = [...(currentItem.secondaryOptions || [])];
            updatedSecondary[optionIndex] = newOptionText;

            currentItem = {
                ...currentItem,
                optionLevels,
                secondaryOptions: updatedSecondary
            };

            currentChar.inventory[itemIndex] = currentItem;
            isSuccess = true;
            stopReason = 'success';
            break; // 1회 성공했으므로 종료!
        }
    }

    const finalItem = currentChar.inventory[itemIndex] || currentItem;
    const finalLevel = finalItem.optionLevels?.[optionIndex] || initialLevel;
    const finalCP = calculateItemCPDelta(finalItem, finalItem, currentChar).oldCP;

    let message = '';
    if (isSuccess) {
        message = `[옵션 연속 강화 성공] 총 ${attempts}회 시도 끝에 옵션 레벨 ${finalLevel} 달성! (${newOptionText})`;
    } else if (stopReason === 'no_resources') {
        if (attempts === 0) {
            message = `[옵션 연속 강화 중단] 옵션 강화에 필요한 재료가 부족합니다.`;
        } else {
            message = `[옵션 연속 강화 소진] 보유 재료가 모두 소진되어 연속 강화를 중단했습니다. (${attempts}회 시도, 소모: 골드 ${totalGold.toLocaleString()}G, 마정석 ${totalMana}개)`;
        }
    } else {
        message = `[옵션 연속 강화 완료] 총 ${attempts}회 시도 완료.`;
    }

    return {
        success: isSuccess,
        attempts,
        optionIndex,
        oldOptionText,
        newOptionText: isSuccess ? newOptionText : oldOptionText,
        startLevel: initialLevel,
        finalLevel,
        goldSpent: totalGold,
        manaSpent: totalMana,
        updatedCharacter: currentChar,
        message,
        oldCP: initialCP,
        newCP: finalCP,
        stopReason
    };
};
