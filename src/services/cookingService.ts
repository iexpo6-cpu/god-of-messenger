import { Character, Item, JobType, Stats } from '../types';
import { RECIPES, COOKED_ITEMS, consumeIngredients, Recipe } from '../recipes';
import { calculateCompletionDateTime, getConstructionRemainingTime } from './baseConstructionService';

/**
 * 요리 레시피 및 시설/요리사 숙련도에 따른 조리 소요 시간(분) 계산
 */
export function getRecipeCookingDuration(
    recipe: Recipe,
    totalCookingLevel: number = 1,
    facilityLevel: number = 1
): number {
    let baseMinutes = 20;
    if (recipe.minLevel >= 8) {
        baseMinutes = 120; // 2시간
    } else if (recipe.minLevel >= 5) {
        baseMinutes = 90; // 1시간 30분
    } else if (recipe.minLevel >= 3) {
        baseMinutes = 60; // 1시간
    } else if (recipe.minLevel >= 2) {
        baseMinutes = 35; // 35분
    } else {
        baseMinutes = 20; // 20분
    }

    // 시설 레벨 감면 (레벨당 5%, 최대 25%)
    const facilityReduction = Math.min(0.25, (facilityLevel - 1) * 0.05);
    // 요리 숙련도 감면 (레벨당 1%, 최대 35%)
    const masteryReduction = Math.min(0.35, Math.max(0, (totalCookingLevel - 1) * 0.01));

    const totalReduction = facilityReduction + masteryReduction;
    const finalMinutes = Math.max(5, Math.round(baseMinutes * (1 - totalReduction)));

    return finalMinutes;
}

/**
 * 요리 시작 (재료 차감 및 조리 대기열 등록)
 */
export function startCookingJob(
    character: Character,
    instanceId: string,
    recipeId: string
): { success: boolean; updatedCharacter?: Character; message: string; error?: string } {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) {
        return { success: false, message: '유효하지 않은 요리 레시피입니다.', error: 'RECIPE_NOT_FOUND' };
    }

    if (!character.base) {
        return { success: false, message: '기지가 활성화되지 않았습니다.', error: 'NO_BASE' };
    }

    const instance = character.base.layout?.find(inst => inst.id === instanceId);
    if (instance?.underConstruction) {
        return { success: false, message: '공사 중인 요리 시설에서는 조리할 수 없습니다.', error: 'FACILITY_UNDER_CONSTRUCTION' };
    }

    const facilityLevel = instance?.level || character.base.facilityLevels?.['cooking'] || 1;
    const assignedIds = instanceId ? (character.base.multiAssignments?.[instanceId] || []) : [];
    const chefs = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id) && (c.job === JobType.CHEF || (c.job as string) === '요리사'));

    let totalCookingLevel = character.professions?.cooking?.level || 1;
    if (chefs.length > 0) {
        totalCookingLevel = chefs.reduce((acc, c) => acc + (c.professions?.cooking?.level || 1), 0);
    }

    if (totalCookingLevel < recipe.minLevel) {
        return { success: false, message: `요리 숙련도가 부족합니다. (필요: Lv.${recipe.minLevel})`, error: 'LOW_LEVEL' };
    }

    const ownedTools = character.base.cookingTools || [];
    if (recipe.requiredTool && !ownedTools.includes(recipe.requiredTool)) {
        return { success: false, message: '필요한 조리 도구를 보유하고 있지 않습니다.', error: 'MISSING_TOOL' };
    }

    // 해당 요리 시설 인스턴스에서 이미 진행 중인 요리가 있는지 확인 (동시 1개 조리)
    const existingJobs = (character.base.cookingJobs || []).filter(job => job.instanceId === instanceId && !job.isCompleted);
    if (existingJobs.length >= 1) {
        return { success: false, message: '현재 이 주방에서 조리 중인 요리가 있습니다. 조리가 끝난 후 새 요리를 시작할 수 있습니다.', error: 'SLOT_BUSY' };
    }

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return { success: false, message: '기지 정보 오류', error: 'NO_BASE' };

    // 재료 소모
    const success = consumeIngredients(newChar, recipe.ingredients);
    if (!success) {
        return { success: false, message: '필요한 요리 재료가 부족합니다.', error: 'INSUFFICIENT_INGREDIENTS' };
    }

    const durationMinutes = getRecipeCookingDuration(recipe, totalCookingLevel, facilityLevel);
    const curDate = character.currentDate || '2000-03-02';
    const curTime = character.currentTime || '08:00';
    const { completionDate, completionTime } = calculateCompletionDateTime(curDate, curTime, durationMinutes);

    const bonusMultiplier = 1 + (totalCookingLevel - 1) * 0.05;
    const expGain = 20 + recipe.minLevel * 5;

    const newJob = {
        id: `cook_${recipe.id}_${Date.now()}`,
        instanceId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        resultItemId: recipe.resultItemId,
        bonusMultiplier,
        expGain,
        startDate: curDate,
        startTime: curTime,
        completionDate,
        completionTime,
        totalMinutes: durationMinutes,
        isCompleted: false
    };

    if (!newChar.base.cookingJobs) {
        newChar.base.cookingJobs = [];
    }
    newChar.base.cookingJobs.push(newJob);

    const durationText = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}분` : ''}`.trim() : `${durationMinutes}분`;
    const message = `[전문 주방] '${recipe.name}' 조리를 시작했습니다. (소요 시간: ${durationText}, 완료 예정: ${completionDate} ${completionTime})`;

    return {
        success: true,
        updatedCharacter: newChar,
        message
    };
}

/**
 * 완료된 요리 수령
 */
export function claimCookedDish(
    character: Character,
    jobId: string
): {
    success: boolean;
    updatedCharacter?: Character;
    message: string;
    item?: Item;
    levelUps: { name: string; oldLevel: number; newLevel: number }[];
} {
    if (!character.base || !character.base.cookingJobs) {
        return { success: false, message: '수령할 요리 작업이 없습니다.', levelUps: [] };
    }

    const jobIndex = character.base.cookingJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
        return { success: false, message: '해당 요리 작업을 찾을 수 없습니다.', levelUps: [] };
    }

    const job = character.base.cookingJobs[jobIndex];
    const curDate = character.currentDate || '2000-03-02';
    const curTime = character.currentTime || '08:00';
    const timeCheck = getConstructionRemainingTime(curDate, curTime, job.completionDate, job.completionTime);

    if (!timeCheck.isCompleted && !job.isCompleted) {
        return {
            success: false,
            message: `아직 조리가 진행 중입니다. (남은 시간: ${timeCheck.text})`,
            levelUps: []
        };
    }

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return { success: false, message: '기지 정보 오류', levelUps: [] };

    // 요리 아이템 생성
    const rawCookedItem = COOKED_ITEMS[job.resultItemId];
    if (!rawCookedItem) {
        return { success: false, message: '완성품 아이템 정보를 찾을 수 없습니다.', levelUps: [] };
    }

    const cookedItem = JSON.parse(JSON.stringify(rawCookedItem)) as Item;
    if (cookedItem.stats) {
        Object.keys(cookedItem.stats).forEach(key => {
            if (typeof (cookedItem.stats as any)[key] === 'number') {
                (cookedItem.stats as any)[key] = Math.floor((cookedItem.stats as any)[key] * job.bonusMultiplier);
            }
        });
    }
    if (cookedItem.secondaryOptions && cookedItem.stats) {
        cookedItem.secondaryOptions = cookedItem.secondaryOptions.map(opt => {
            return opt.replace(/([A-Z]+)\s*\+(\d+)/, (_, statCode) => {
                const k = statCode.toLowerCase() as keyof Stats;
                const val = cookedItem.stats?.[k];
                return val !== undefined ? `${statCode} +${val}` : `${statCode} +${val}`;
            });
        });
    }

    if (!newChar.inventory) newChar.inventory = [];
    newChar.inventory.push({ ...cookedItem, id: Date.now().toString() });

    // 경험치 획득 및 레벨업
    const levelUps: { name: string; oldLevel: number; newLevel: number }[] = [];
    const assignedIds = job.instanceId ? (newChar.base.multiAssignments?.[job.instanceId] || []) : [];
    const chefs = (newChar.inactiveCompanions || []).filter(c => assignedIds.includes(c.id) && (c.job === JobType.CHEF || (c.job as string) === '요리사'));

    if (chefs.length > 0) {
        newChar.inactiveCompanions?.forEach(comp => {
            if (assignedIds.includes(comp.id) && (comp.job === JobType.CHEF || (comp.job as string) === '요리사')) {
                if (!comp.professions) comp.professions = {};
                if (!comp.professions.cooking) comp.professions.cooking = { level: 1, exp: 0, maxExp: 100 };
                
                const prof = comp.professions.cooking;
                const oldLv = prof.level;
                prof.exp += job.expGain;
                while (prof.exp >= prof.maxExp) {
                    prof.exp -= prof.maxExp;
                    prof.level += 1;
                    prof.maxExp = Math.floor(prof.maxExp * 1.25);
                }
                if (prof.level > oldLv) {
                    levelUps.push({ name: comp.name, oldLevel: oldLv, newLevel: prof.level });
                }
            }
        });
    } else {
        if (!newChar.professions) newChar.professions = {};
        if (!newChar.professions.cooking) newChar.professions.cooking = { level: 1, exp: 0, maxExp: 100 };
        const prof = newChar.professions.cooking;
        const oldLv = prof.level;
        prof.exp += job.expGain;
        while (prof.exp >= prof.maxExp) {
            prof.exp -= prof.maxExp;
            prof.level += 1;
            prof.maxExp = Math.floor(prof.maxExp * 1.25);
        }
        if (prof.level > oldLv) {
            levelUps.push({ name: '플레이어', oldLevel: oldLv, newLevel: prof.level });
        }
    }

    // 대기열에서 제거
    newChar.base.cookingJobs.splice(jobIndex, 1);

    const message = `[요리 완성] 갓 만든 '${job.recipeName}'을(를) 수령하여 가방에 보관했습니다!`;

    return {
        success: true,
        updatedCharacter: newChar,
        message,
        item: cookedItem,
        levelUps
    };
}

/**
 * 조리 취소
 */
export function cancelCookingJob(
    character: Character,
    jobId: string
): { success: boolean; updatedCharacter?: Character; message: string } {
    if (!character.base || !character.base.cookingJobs) {
        return { success: false, message: '취소할 요리 작업이 없습니다.' };
    }

    const jobIndex = character.base.cookingJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
        return { success: false, message: '해당 요리 작업을 찾을 수 없습니다.' };
    }

    const job = character.base.cookingJobs[jobIndex];
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base || !newChar.base.cookingJobs) return { success: false, message: '오류' };

    newChar.base.cookingJobs.splice(jobIndex, 1);
    const message = `[전문 주방] '${job.recipeName}' 조리를 취소했습니다.`;

    return {
        success: true,
        updatedCharacter: newChar,
        message
    };
}
