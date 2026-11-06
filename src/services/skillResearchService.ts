import { Character, Companion, Skill, BondSkill, ClassTier, JobType } from '../types';
import { calculateTotalLabLevel, calculateResearcherBonus, gainProfessionExp } from '../utils';
import { advanceGameTime } from './gameTimeService';
import { getReducedMpCostOnLevelUp } from './skillMpService';

export interface SkillResearchExecutionResult {
    updatedCharacter: Character;
    success: boolean;
    leveledUp: boolean;
    isGreatSuccess: boolean;
    minutesPassed: number;
    logMessage: string;
    resultData?: {
        type: 'success' | 'warning' | 'levelup';
        title: string;
        message: string;
        items: { label: string; before?: string; after: string }[];
    };
}

/**
 * 연구원의 숙련도 및 연구소 레벨에 따른 소요 시간 단축 비율을 계산합니다.
 * - 스킬 연마: 기본 5분 -> 최대 1분까지 단축 가능
 * - 한계 돌파: 기본 15분 -> 최대 2분까지 단축 가능
 */
export function calculateSkillResearchTimeReduction(character: Character): {
    reductionRate: number; // 0.0 ~ 0.95
    researchMinutes: number; // 기본 5분 -> 최소 1분
    limitBreakMinutes: number; // 기본 15분 -> 최소 2분
} {
    const labLevel = calculateTotalLabLevel(character.base);
    const researcherBonus = calculateResearcherBonus(character);

    // 연구원 할인율 및 연구소 레벨에 비례하여 시간 단축 (최대 1분/2분까지 도달 가능)
    const rawReduction = (researcherBonus.costDiscount * 1.5) + (Math.max(0, labLevel - 1) * 0.1);
    const reductionRate = Math.min(0.95, Math.max(0, rawReduction));

    const researchMinutes = Math.max(1, Math.round(5 * (1 - reductionRate)));
    const limitBreakMinutes = Math.max(2, Math.round(15 * (1 - reductionRate)));

    return {
        reductionRate,
        researchMinutes,
        limitBreakMinutes
    };
}

/**
 * 스킬 연구(연마)를 수행하고 소요 시간을 경과시킵니다 (기본 30분, 숙련도에 따라 단축).
 */
export function executeSkillResearch(
    character: Character,
    skillIndex: number,
    targetId: string,
    options?: { skipTimeAdvance?: boolean }
): SkillResearchExecutionResult {
    const labLevel = calculateTotalLabLevel(character.base);
    const researcherBonus = calculateResearcherBonus(character);
    const { researchMinutes } = calculateSkillResearchTimeReduction(character);

    let targetEntity: Character | Companion | undefined;
    let isPlayer = false;
    let compIndex = -1;
    let isInactive = false;
    let isBond = false;

    if (targetId === 'player') {
        targetEntity = character;
        isPlayer = true;
    } else if (targetId === 'bond') {
        targetEntity = character;
        isBond = true;
    } else {
        compIndex = character.companions.findIndex(c => c.id === targetId);
        if (compIndex >= 0) {
            targetEntity = character.companions[compIndex];
        } else {
            compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1;
            if (compIndex >= 0) {
                targetEntity = character.inactiveCompanions![compIndex];
                isInactive = true;
            }
        }
    }

    if (!targetEntity) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '연구 대상을 찾을 수 없습니다.' };
    }

    const skill = isBond ? (targetEntity as Character).bondSkills?.[skillIndex] : targetEntity.skills[skillIndex];
    if (!skill) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '연구할 스킬을 찾을 수 없습니다.' };
    }

    const currentMastery = skill.currentMastery || 0;
    const requiredMastery = 20 * (skill.level + 4);

    const tierMultipliers: Record<string, number> = {
        [ClassTier.NONE]: 1,
        [ClassTier.FIRST]: 3,
        [ClassTier.SECOND]: 5,
        [ClassTier.LAST]: 10,
        [ClassTier.FINAL]: 50,
        [ClassTier.BOND]: 150
    };
    const tierMult = tierMultipliers[skill.tier] || 1;
    const totalDiscountRate = Math.min(0.85, (labLevel * 0.05) + researcherBonus.costDiscount);
    const discountMultiplier = Math.max(0.15, 1 - totalDiscountRate);

    const goldCost = Math.max(1, Math.floor(Math.max(1, skill.level) * 400 * tierMult * discountMultiplier));
    const manaCost = Math.max(1, Math.floor(Math.max(1, skill.level) * 1 * tierMult * discountMultiplier));

    const totalMana = character.base?.resources?.manaCrystal || 0;
    if (character.money < goldCost || totalMana < manaCost) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '연구에 필요한 골드 또는 마정석이 부족합니다.' };
    }

    const newChar: Character = { ...character };

    newChar.money -= goldCost;
    const curCrystal = Math.max(0, (newChar.base?.resources?.manaCrystal || 0) - manaCost);
    newChar.base = {
        ...newChar.base!,
        resources: {
            ...newChar.base!.resources,
            manaCrystal: curCrystal
        }
    };

    const greatSuccessRate = Math.min(60, 5 + researcherBonus.greatSuccessBonus);
    const isGreatSuccess = Math.random() * 100 < greatSuccessRate;
    const isPotentialLockedBonus = !isPlayer && !isBond && !!(targetEntity as any)?.isPotentialLocked;

    let gainAmt = 10 + Math.floor(Math.random() * 11); // 10~20
    if (isGreatSuccess) gainAmt *= 2;
    if (isPotentialLockedBonus) gainAmt *= 2;

    let nextMastery = currentMastery + gainAmt;
    let nextLevel = skill.level;
    let leveledUp = false;

    if (nextMastery >= requiredMastery) {
        if (nextLevel < (skill.maxLevel || 10)) {
            nextLevel += 1;
            nextMastery -= requiredMastery;
            leveledUp = true;
        } else {
            nextMastery = requiredMastery;
        }
    }

    let nextMpCost = skill.mpCost;
    if (leveledUp) {
        if (!isBond && skill.type !== '패시브' && (skill.type as any) !== 'PASSIVE') {
            nextMpCost = getReducedMpCostOnLevelUp({
                tier: skill.tier,
                baseTier: (skill as any).baseTier,
                minClassTier: (skill as any).minClassTier,
                mpCost: skill.mpCost,
                type: skill.type
            });
        }
    }

    const updatedSkill = { ...skill, level: nextLevel, currentMastery: nextMastery, mpCost: nextMpCost };

    if (isBond) {
        const newBondSkills = [...(newChar.bondSkills || [])];
        newBondSkills[skillIndex] = updatedSkill as BondSkill;
        newChar.bondSkills = newBondSkills;
    } else {
        const newSkills = [...targetEntity.skills];
        newSkills[skillIndex] = updatedSkill;
        if (isPlayer) {
            newChar.skills = newSkills;
        } else if (isInactive) {
            const newInactive = [...(newChar.inactiveCompanions || [])];
            newInactive[compIndex] = { ...newInactive[compIndex], skills: newSkills };
            newChar.inactiveCompanions = newInactive;
        } else {
            const newComps = [...newChar.companions];
            newComps[compIndex] = { ...newComps[compIndex], skills: newSkills };
            newChar.companions = newComps;
        }
    }

    // 연구원 경험치 부여
    const labInst = newChar.base?.layout?.find(inst => inst.type === 'lab');
    if (labInst) {
        const assignedIds: string[] = [];
        if (newChar.base?.assignments?.[labInst.id]) assignedIds.push(newChar.base.assignments[labInst.id]);
        if (newChar.base?.multiAssignments?.[labInst.id]) {
            newChar.base.multiAssignments[labInst.id].forEach(id => { if (!assignedIds.includes(id)) assignedIds.push(id); });
        }

        const expAmount = 20 + skill.level * 5;
        const grantExpToObj = (obj: Character | Companion) => {
            if (!obj.professions) obj.professions = {};
            if (!obj.professions.research) obj.professions.research = { level: 1, exp: 0, maxExp: 100 };
            const res = obj.professions.research;
            res.exp += expAmount;
            while (res.exp >= res.maxExp) {
                res.exp -= res.maxExp;
                res.level += 1;
                res.maxExp = Math.floor(res.maxExp * 1.3);
            }
        };

        grantExpToObj(newChar);
        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions.forEach(c => {
                if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
            });
        }
        if (newChar.companions) {
            newChar.companions.forEach(c => {
                if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
            });
        }
    }

    const { newChar: charWithProfExp } = gainProfessionExp(newChar, 'research', 15 + skill.level * 3);

    // skipTimeAdvance가 true인 경우(다회 일괄 연마 등) 실제 시간 경과는 마지막에 1회만 일괄 처리
    const finalChar = options?.skipTimeAdvance
        ? charWithProfExp
        : advanceGameTime(charWithProfExp, researchMinutes, { activityName: '스킬 연구' }).updatedCharacter;

    const bonusTag = isPotentialLockedBonus ? ' [잠재력 제한 특화: 연구량 2배]' : '';
    const logMsg = leveledUp
        ? `[스킬 연구] ${targetEntity.name}의 [${skill.name}] 연마 완료! 레벨 업 (Lv.${skill.level} -> Lv.${nextLevel}, ${researchMinutes}분 소요)${bonusTag}`
        : `[스킬 연구] ${targetEntity.name}의 [${skill.name}] 연마 완료 (숙련도 ${currentMastery} -> ${nextMastery}, +${gainAmt}${bonusTag}, ${researchMinutes}분 소요)`;

    const resultItems: { label: string; before?: string; after?: string }[] = [
        { label: '레벨', before: `Lv.${skill.level}`, after: `Lv.${nextLevel}` },
        { label: '숙련도', before: `${currentMastery}`, after: `${nextMastery} / ${requiredMastery}` },
        { label: '소요 시간', after: `${researchMinutes}분` }
    ];
    if (isPotentialLockedBonus) {
        resultItems.push({ label: '잠재력 제한 특화', after: '연구량 2배 보너스 적용' });
    }

    return {
        updatedCharacter: finalChar,
        success: true,
        leveledUp,
        isGreatSuccess,
        minutesPassed: researchMinutes,
        logMessage: logMsg,
        resultData: {
            type: leveledUp ? 'levelup' : 'success',
            title: leveledUp ? '스킬 레벨 업!' : (isGreatSuccess ? '연구 대성공!' : '스킬 연마 완료'),
            message: leveledUp
                ? `${skill.name}의 숙련도가 정점에 도달하여 레벨이 상승했습니다! (${researchMinutes}분 소요)`
                : `${skill.name}의 숙련도가 향상되었습니다. (${researchMinutes}분 소요)`,
            items: resultItems
        }
    };
}

/**
 * 스킬 한계 돌파를 수행하고 소요 시간을 경과시킵니다 (기본 60분, 숙련도에 따라 단축).
 */
export function executeSkillLimitBreak(
    character: Character,
    skillIndex: number,
    targetId: string
): SkillResearchExecutionResult {
    const labLevel = calculateTotalLabLevel(character.base);
    const researcherBonus = calculateResearcherBonus(character);
    const { limitBreakMinutes } = calculateSkillResearchTimeReduction(character);

    let targetEntity: Character | Companion | undefined;
    let isPlayer = false;
    let compIndex = -1;
    let isInactive = false;
    let isBond = false;

    if (targetId === 'player') {
        targetEntity = character;
        isPlayer = true;
    } else if (targetId === 'bond') {
        targetEntity = character;
        isBond = true;
    } else {
        compIndex = character.companions.findIndex(c => c.id === targetId);
        if (compIndex >= 0) {
            targetEntity = character.companions[compIndex];
        } else {
            compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1;
            if (compIndex >= 0) {
                targetEntity = character.inactiveCompanions![compIndex];
                isInactive = true;
            }
        }
    }

    if (!targetEntity) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '한계 돌파 대상을 찾을 수 없습니다.' };
    }

    const skill = isBond ? (targetEntity as Character).bondSkills?.[skillIndex] : targetEntity.skills[skillIndex];
    if (!skill) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '한계 돌파할 스킬을 찾을 수 없습니다.' };
    }

    const maxLevel = skill.maxLevel || 10;
    const tierMultipliers: Record<string, number> = {
        [ClassTier.NONE]: 1,
        [ClassTier.FIRST]: 3,
        [ClassTier.SECOND]: 5,
        [ClassTier.LAST]: 10,
        [ClassTier.FINAL]: 50,
        [ClassTier.BOND]: 150
    };
    const tierMult = tierMultipliers[skill.tier] || 1;
    const totalDiscountRate = Math.min(0.85, (labLevel * 0.05) + researcherBonus.costDiscount);
    const discountMultiplier = Math.max(0.15, 1 - totalDiscountRate);

    const goldCost = Math.max(1, Math.floor((4000 + 2000 * maxLevel) * tierMult * discountMultiplier));
    const manaCost = Math.max(1, Math.floor((5 + maxLevel) * tierMult * discountMultiplier));

    const totalMana = character.base?.resources?.manaCrystal || 0;
    if (character.money < goldCost || totalMana < manaCost) {
        return { updatedCharacter: character, success: false, leveledUp: false, isGreatSuccess: false, minutesPassed: 0, logMessage: '한계 돌파에 필요한 골드 또는 마정석이 부족합니다.' };
    }

    const newChar: Character = { ...character };

    newChar.money -= goldCost;
    const curCrystal = Math.max(0, (newChar.base?.resources?.manaCrystal || 0) - manaCost);
    newChar.base = {
        ...newChar.base!,
        resources: {
            ...newChar.base!.resources,
            manaCrystal: curCrystal
        }
    };

    const successRate = Math.min(95, 30 + (labLevel * 5) + researcherBonus.limitBreakBonus);
    const success = Math.random() * 100 < successRate;

    // 연구원 경험치 부여
    const labInst = newChar.base?.layout?.find(inst => inst.type === 'lab');
    if (labInst) {
        const assignedIds: string[] = [];
        if (newChar.base?.assignments?.[labInst.id]) assignedIds.push(newChar.base.assignments[labInst.id]);
        if (newChar.base?.multiAssignments?.[labInst.id]) {
            newChar.base.multiAssignments[labInst.id].forEach(id => { if (!assignedIds.includes(id)) assignedIds.push(id); });
        }

        const expAmount = 50 + maxLevel * 10;
        const grantExpToObj = (obj: Character | Companion) => {
            if (!obj.professions) obj.professions = {};
            if (!obj.professions.research) obj.professions.research = { level: 1, exp: 0, maxExp: 100 };
            const res = obj.professions.research;
            res.exp += expAmount;
            while (res.exp >= res.maxExp) {
                res.exp -= res.maxExp;
                res.level += 1;
                res.maxExp = Math.floor(res.maxExp * 1.3);
            }
        };

        grantExpToObj(newChar);
        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions.forEach(c => {
                if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
            });
        }
        if (newChar.companions) {
            newChar.companions.forEach(c => {
                if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
            });
        }
    }

    if (success) {
        const newMaxLevel = maxLevel + 1;
        const updatedSkill = { ...skill, maxLevel: newMaxLevel };

        if (isBond) {
            const newBondSkills = [...(newChar.bondSkills || [])];
            newBondSkills[skillIndex] = updatedSkill as BondSkill;
            newChar.bondSkills = newBondSkills;
        } else {
            const newSkills = [...targetEntity.skills];
            newSkills[skillIndex] = updatedSkill;
            if (isPlayer) {
                newChar.skills = newSkills;
            } else if (isInactive) {
                const newInactive = [...(newChar.inactiveCompanions || [])];
                newInactive[compIndex] = { ...newInactive[compIndex], skills: newSkills };
                newChar.inactiveCompanions = newInactive;
            } else {
                const newComps = [...newChar.companions];
                newComps[compIndex] = { ...newComps[compIndex], skills: newSkills };
                newChar.companions = newComps;
            }
        }

        const { newChar: charWithProfExp } = gainProfessionExp(newChar, 'research', 30 + maxLevel * 5);

        // 실제 게임 시간 전진 (기본 60분, 연구원 숙련도에 따라 단축)
        const timeRes = advanceGameTime(charWithProfExp, limitBreakMinutes, { activityName: '스킬 한계 돌파' });
        const finalChar = timeRes.updatedCharacter;

        return {
            updatedCharacter: finalChar,
            success: true,
            leveledUp: false,
            isGreatSuccess: false,
            minutesPassed: limitBreakMinutes,
            logMessage: `[스킬 연구소] ${targetEntity.name}의 [${skill.name}] 한계 돌파 성공! 최대 레벨 확장 (Lv.${maxLevel} -> Lv.${newMaxLevel}, ${limitBreakMinutes}분 소요)`,
            resultData: {
                type: 'success',
                title: '한계 돌파 성공!',
                message: `${skill.name}의 잠재력이 개방되어 최대 레벨이 확장되었습니다! (${limitBreakMinutes}분 소요)`,
                items: [
                    { label: '최대 레벨', before: `Lv.${maxLevel}`, after: `Lv.${newMaxLevel}` },
                    { label: '소요 시간', after: `${limitBreakMinutes}분` }
                ]
            }
        };
    } else {
        const { newChar: charWithProfExp } = gainProfessionExp(newChar, 'research', 10);
        // 실패 시에도 시간은 소요됨
        const timeRes = advanceGameTime(charWithProfExp, limitBreakMinutes, { activityName: '스킬 한계 돌파 시도' });
        const finalChar = timeRes.updatedCharacter;

        return {
            updatedCharacter: finalChar,
            success: false,
            leveledUp: false,
            isGreatSuccess: false,
            minutesPassed: limitBreakMinutes,
            logMessage: `[스킬 연구소] ${targetEntity.name}의 [${skill.name}] 한계 돌파에 실패했습니다. (${limitBreakMinutes}분 소요)`,
            resultData: {
                type: 'warning',
                title: '한계 돌파 실패',
                message: `마력 주입 불안정으로 한계 돌파에 실패했습니다. 자원이 소모되었습니다. (${limitBreakMinutes}분 소요)`,
                items: [
                    { label: '현재 최대 레벨', after: `Lv.${maxLevel}` },
                    { label: '소요 시간', after: `${limitBreakMinutes}분` }
                ]
            }
        };
    }
}

export interface MultiSkillResearchExecutionResult {
    updatedCharacter: Character;
    success: boolean;
    completedCount: number;
    targetCount: number;
    leveledUp: boolean;
    levelUpCount: number;
    greatSuccessCount: number;
    totalMinutesPassed: number;
    logMessage: string;
    resultData?: {
        type: 'success' | 'warning' | 'levelup';
        title: string;
        message: string;
        items: { label: string; before?: string; after: string }[];
    };
}

/**
 * 스킬 연마를 사용자가 지정한 횟수(1~10회)만큼 연속 수행합니다.
 * 도중에 자원이 부족하거나 스킬 최대 레벨에 도달하면 안전하게 자동 중단됩니다.
 */
export function executeMultiSkillResearch(
    initialCharacter: Character,
    skillIndex: number,
    targetId: string,
    requestedCount: number = 1
): MultiSkillResearchExecutionResult {
    const targetCount = Math.max(1, Math.min(10, requestedCount));
    let currentChar = initialCharacter;
    let completedCount = 0;
    let levelUpCount = 0;
    let greatSuccessCount = 0;
    let totalMinutesPassed = 0;
    let stopReason = '';

    // 시작 전 초기 스킬 정보 스냅샷
    let initialSkill: Skill | BondSkill | undefined;
    let skillName = '스킬';
    if (targetId === 'bond') {
        initialSkill = currentChar.bondSkills?.[skillIndex];
    } else if (targetId === 'player') {
        initialSkill = currentChar.skills?.[skillIndex];
    } else {
        const comp = currentChar.companions.find(c => c.id === targetId) || currentChar.inactiveCompanions?.find(c => c.id === targetId);
        initialSkill = comp?.skills?.[skillIndex];
    }
    const initialLevel = initialSkill?.level || 1;
    const initialMastery = initialSkill?.currentMastery || 0;
    skillName = initialSkill?.name || '스킬';

    for (let i = 0; i < targetCount; i++) {
        // 이미 최대 레벨인지 체크
        let curSkill: Skill | BondSkill | undefined;
        if (targetId === 'bond') {
            curSkill = currentChar.bondSkills?.[skillIndex];
        } else if (targetId === 'player') {
            curSkill = currentChar.skills?.[skillIndex];
        } else {
            const comp = currentChar.companions.find(c => c.id === targetId) || currentChar.inactiveCompanions?.find(c => c.id === targetId);
            curSkill = comp?.skills?.[skillIndex];
        }
        if (curSkill && curSkill.level >= (curSkill.maxLevel || 10)) {
            stopReason = '최대 레벨 도달';
            break;
        }

        const res = executeSkillResearch(currentChar, skillIndex, targetId, { skipTimeAdvance: true });
        if (!res.success) {
            stopReason = res.logMessage;
            break;
        }

        currentChar = res.updatedCharacter;
        completedCount++;
        totalMinutesPassed += res.minutesPassed;
        if (res.leveledUp) levelUpCount++;
        if (res.isGreatSuccess) greatSuccessCount++;
    }

    if (completedCount === 0) {
        return {
            updatedCharacter: initialCharacter,
            success: false,
            completedCount: 0,
            targetCount,
            leveledUp: false,
            levelUpCount: 0,
            greatSuccessCount: 0,
            totalMinutesPassed: 0,
            logMessage: stopReason || '스킬 연마를 진행할 수 없습니다.',
            resultData: {
                type: 'warning',
                title: '연마 불가',
                message: stopReason || '자원이 부족하거나 이미 최대 레벨입니다.',
                items: [
                    { label: '스킬', after: skillName },
                    { label: '원인', after: stopReason || '진행 불가' }
                ]
            }
        };
    }

    // 다회 연마 완료 후 누적된 전체 경과 시간에 대해 게임 시간을 단 1회만 일괄 정산 (초경량 일괄 처리)
    if (totalMinutesPassed > 0) {
        currentChar = advanceGameTime(currentChar, totalMinutesPassed, { activityName: '스킬 연속 연구' }).updatedCharacter;
    }

    // 최종 스킬 정보 조회
    let finalSkill: Skill | BondSkill | undefined;
    if (targetId === 'bond') {
        finalSkill = currentChar.bondSkills?.[skillIndex];
    } else if (targetId === 'player') {
        finalSkill = currentChar.skills?.[skillIndex];
    } else {
        const comp = currentChar.companions.find(c => c.id === targetId) || currentChar.inactiveCompanions?.find(c => c.id === targetId);
        finalSkill = comp?.skills?.[skillIndex];
    }
    const finalLevel = finalSkill?.level || initialLevel;
    const finalMastery = finalSkill?.currentMastery || 0;
    const requiredMastery = 20 * (finalLevel + 4);

    const logMsg = levelUpCount > 0
        ? `[스킬 연구] [${skillName}] ${completedCount}회 연마 완료! 레벨 업 (Lv.${initialLevel} -> Lv.${finalLevel}, ${totalMinutesPassed}분 소요)`
        : `[스킬 연구] [${skillName}] ${completedCount}회 연마 완료 (숙련도 ${initialMastery} -> ${finalMastery}, ${totalMinutesPassed}분 소요)`;

    const totalGoldSpent = Math.max(0, (initialCharacter.money || 0) - (currentChar.money || 0));
    const initialMana = initialCharacter.base?.resources?.manaCrystal || 0;
    const currentMana = currentChar.base?.resources?.manaCrystal || 0;
    const totalManaSpent = Math.max(0, initialMana - currentMana);

    const items: { label: string; before?: string; after: string }[] = [
        { label: '연마 횟수', after: `${completedCount}회 / ${targetCount}회` },
        { label: '스킬 레벨', before: `Lv.${initialLevel}`, after: `Lv.${finalLevel}` },
        { label: '숙련도', before: `${initialMastery}`, after: `${finalMastery} / ${requiredMastery}` },
        { label: '소모 자원', after: `${totalGoldSpent.toLocaleString()}G / ${totalManaSpent}개` },
        { label: '소요 시간', after: `${totalMinutesPassed}분` }
    ];
    if (greatSuccessCount > 0) {
        items.push({ label: '연구 대성공', after: `${greatSuccessCount}회 발동` });
    }

    return {
        updatedCharacter: currentChar,
        success: true,
        completedCount,
        targetCount,
        leveledUp: levelUpCount > 0,
        levelUpCount,
        greatSuccessCount,
        totalMinutesPassed,
        logMessage: logMsg,
        resultData: {
            type: levelUpCount > 0 ? 'levelup' : 'success',
            title: levelUpCount > 0 
                ? (levelUpCount > 1 ? `스킬 ${levelUpCount}단계 레벨 업!` : '스킬 레벨 업!') 
                : (greatSuccessCount > 0 ? '연구 대성공!' : '스킬 연속 연마 완료'),
            message: levelUpCount > 0
                ? `${skillName}의 연마를 ${completedCount}회 진행하여 레벨이 상승했습니다! (${totalMinutesPassed}분 소요)`
                : `${skillName}의 연마를 ${completedCount}회 완료했습니다. (${totalMinutesPassed}분 소요)`,
            items
        }
    };
}
