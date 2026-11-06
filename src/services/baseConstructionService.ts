import { Character, FacilityInstance } from '../types';
import { addDays } from '../utils';
import { FACILITIES_INFO, FACILITY_UPGRADE_CONFIG } from '../constants';

/**
 * 시설 유형별 기본 신규 건설 소요 시간(분)
 */
const FACILITY_BASE_BUILD_TIMES: Record<string, number> = {
    housing: 180, // 2시간
    farm: 180, // 2시간
    blacksmith: 300, // 4시간
    alchemy: 300, // 4시간
    lab: 360, // 4시간
    mine: 240, // 4시간
    cooking: 240, // 4시간
    monster_farm: 600, // 8시간
    temple: 600, // 8시간
    dispatch: 240, // 3시간
    training_stat: 240, // 3시간
    training_weapon: 240, // 3시간
    training_tactics: 240, // 3시간
    child_academy: 240, // 4시간
    monster_arena: 360, // 6시간
};

/**
 * 시설 건설 또는 증축에 필요한 소요 시간(분)을 계산합니다.
 */
export function getFacilityConstructionDuration(
    facilityType: string,
    isUpgrade: boolean,
    currentLevel: number = 1
): number {
    if (!isUpgrade) {
        return FACILITY_BASE_BUILD_TIMES[facilityType] || 180;
    }
    // 레벨업 증축: 기본 2시간 + (현재 레벨 * 2시간)
    return Math.max(120, currentLevel * 240);
}

/**
 * 주택 신축 또는 증축에 필요한 소요 시간(분)을 계산합니다.
 */
export function getHouseConstructionDuration(
    houseType: string,
    isUpgrade: boolean,
    currentLevel: number = 1
): number {
    if (!isUpgrade) {
        // 신축: 1층 주택 180분(3시간), 2층 주택 360분(6시간), 빌라 720분(12시간), 아파트 1440분(24시간)
        if (houseType === 'villa') return 720;
        if (houseType === 'apartment') return 1440;
        if (houseType === 'house_2f') return 360;
        return 180;
    }
    // 증축: 기본 180분 + (현재 레벨 * 120분)
    return Math.max(180, currentLevel * 240);
}

/**
 * 기지 전체 증축에 필요한 소요 시간(분)을 계산합니다.
 */
export function getBaseUpgradeDuration(currentLevel: number): number {
    // 1->2: 12시간(720분), 2->3: 24시간(1440분), 3->4: 48시간(2880분)
    return currentLevel * 7200;
}

/**
 * 방어 시설 세부 건축물 신축에 필요한 소요 시간(분)을 계산합니다.
 * 목재 바리케이드: 60분(1시간), 석조 방벽: 120분(2시간), 강철 가시 함정: 180분(3시간), 마력 보호막 장치: 360분(6시간), 요새화 대포탑: 720분(12시간)
 */
export function getDefenseStructureConstructionDuration(structKey: string): number {
    switch (structKey) {
        case 'wooden_barricade':
            return 60; // 1시간
        case 'stone_wall':
            return 120; // 2시간
        case 'steel_spike_trap':
            return 180; // 3시간
        case 'mana_shield_generator':
            return 360; // 6시간
        case 'fortress_great_turret':
            return 720; // 12시간
        default:
            return 120;
    }
}

/**
 * 기지 부지 확장에 필요한 소요 시간(분)을 계산합니다.
 * 7x7 -> 8x8: 7200분 (5일), 8x8 -> 9x9: 14400분 (10일), 9x9 -> 10x10: 21600분 (15일)
 */
export function getBaseGridExpansionDuration(targetGridSize: number): number {
    if (targetGridSize === 8) return 7200; // 5일
    if (targetGridSize === 9) return 14400; // 10일
    if (targetGridSize >= 10) return 21600; // 15일
    return 7200;
}

/**
 * 시작 일시와 소요 분을 바탕으로 목표 완공 일시를 정확하게 계산합니다.
 */
export function calculateCompletionDateTime(
    startDateStr?: string,
    startTimeStr?: string,
    durationMinutes: number = 120
): { completionDate: string; completionTime: string } {
    const startDate = startDateStr || '2000-03-02';
    const startTime = startTimeStr || '08:00';

    const [curHour, curMin] = startTime.split(':').map(Number);
    const startTotalMinutes = (curHour || 0) * 60 + (curMin || 0);
    const targetTotalMinutes = startTotalMinutes + Math.max(1, durationMinutes);

    const daysToAdd = Math.floor(targetTotalMinutes / 1440);
    const remainingMinutesInDay = targetTotalMinutes % 1440;

    const endHour = Math.floor(remainingMinutesInDay / 60);
    const endMin = remainingMinutesInDay % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const completionTime = `${pad(endHour)}:${pad(endMin)}`;

    const completionDate = daysToAdd > 0 ? addDays(startDate, daysToAdd) : startDate;

    return { completionDate, completionTime };
}

/**
 * 현재 일시와 완공 일시를 비교하여 남은 시간(분)과 텍스트를 반환합니다.
 * (한글만 표기: "2시간 30분", "45분", "1일 4시간" 등)
 */
export function getConstructionRemainingTime(
    currentDateStr?: string,
    currentTimeStr?: string,
    completionDateStr?: string,
    completionTimeStr?: string
): { remainingMinutes: number; text: string; isCompleted: boolean } {
    if (!completionDateStr || !completionTimeStr) {
        return { remainingMinutes: 0, text: '완공 대기', isCompleted: true };
    }

    const curDate = currentDateStr || '2000-03-02';
    const curTime = currentTimeStr || '08:00';

    try {
        const [curY, curM, curD] = curDate.split('-').map(Number);
        const [curH, curMin] = curTime.split(':').map(Number);
        const curTimestamp = new Date(curY, curM - 1, curD, curH, curMin).getTime();

        const [compY, compM, compD] = completionDateStr.split('-').map(Number);
        const [compH, compMin] = completionTimeStr.split(':').map(Number);
        const compTimestamp = new Date(compY, compM - 1, compD, compH, compMin).getTime();

        const diffMs = compTimestamp - curTimestamp;
        if (diffMs <= 0) {
            return { remainingMinutes: 0, text: '완공 완료', isCompleted: true };
        }

        const totalDiffMin = Math.ceil(diffMs / (1000 * 60));
        const days = Math.floor(totalDiffMin / 1440);
        const hours = Math.floor((totalDiffMin % 1440) / 60);
        const minutes = totalDiffMin % 60;

        let text = '';
        if (days > 0) {
            text += `${days}일 `;
        }
        if (hours > 0) {
            text += `${hours}시간 `;
        }
        if (minutes > 0 || (days === 0 && hours === 0)) {
            text += `${minutes}분`;
        }

        return {
            remainingMinutes: totalDiffMin,
            text: text.trim(),
            isCompleted: false
        };
    } catch {
        return { remainingMinutes: 0, text: '완공 완료', isCompleted: true };
    }
}

/**
 * 공사 진행률(0~100%)을 계산합니다.
 */
export function getConstructionProgress(
    totalMinutes?: number,
    remainingMinutes?: number
): number {
    if (!totalMinutes || totalMinutes <= 0) return 100;
    if (!remainingMinutes || remainingMinutes <= 0) return 100;
    const progress = Math.max(0, Math.min(100, Math.round(((totalMinutes - remainingMinutes) / totalMinutes) * 100)));
    return progress;
}

/**
 * 현재 시간 기준으로 공사가 완료된 시설 및 기지를 자동으로 완공 처리합니다.
 */
export function checkAndCompleteBaseConstructions(character: Character): {
    updatedCharacter: Character;
    completedList: { name: string; level: number; isBaseLevel?: boolean }[];
    logs: string[];
} {
    if (!character.base) {
        return { updatedCharacter: character, completedList: [], logs: [] };
    }

    const curDate = character.currentDate || '2000-03-02';
    const curTime = character.currentTime || '08:00';

    let hasChanges = false;
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    const newBase = newChar.base!;
    const completedList: { name: string; level: number; isBaseLevel?: boolean }[] = [];
    const logs: string[] = [];

    // 1. 기지 전체 증축 완공 검사
    if (newBase.underConstruction && newBase.constructionCompletionDate && newBase.constructionCompletionTime) {
        const check = getConstructionRemainingTime(curDate, curTime, newBase.constructionCompletionDate, newBase.constructionCompletionTime);
        if (check.isCompleted) {
            hasChanges = true;
            const targetLv = newBase.targetLevel || (newBase.level + 1);
            newBase.level = targetLv;
            newBase.underConstruction = false;
            newBase.targetLevel = undefined;
            newBase.constructionStartDate = undefined;
            newBase.constructionStartTime = undefined;
            newBase.constructionCompletionDate = undefined;
            newBase.constructionCompletionTime = undefined;
            newBase.totalConstructionMinutes = undefined;

            completedList.push({ name: '기지 본부', level: targetLv, isBaseLevel: true });
            logs.push(`[기지 완공] 기지 본부 증축 공사가 성공적으로 완료되어 기지 레벨이 Lv.${targetLv}(으)로 상승했습니다!`);
        }
    }

    // 2. 배치된 개별 시설 건설 및 레벨업 완공 검사
    if (newBase.layout && Array.isArray(newBase.layout)) {
        newBase.layout = newBase.layout.map(inst => {
            if (inst.underConstruction && inst.constructionCompletionDate && inst.constructionCompletionTime) {
                const check = getConstructionRemainingTime(curDate, curTime, inst.constructionCompletionDate, inst.constructionCompletionTime);
                if (check.isCompleted) {
                    hasChanges = true;
                    const targetLv = inst.targetLevel || (inst.level + 1);
                    const facilityInfo = FACILITIES_INFO.find(f => f.id === inst.type);
                    const facilityName = facilityInfo?.name || inst.type;

                    completedList.push({ name: facilityName, level: targetLv });
                    logs.push(`[시설 완공] ${facilityName}의 공사가 모두 완료되어 정상 가동을 시작했습니다! (Lv.${targetLv})`);

                    if (!newBase.facilityLevels) newBase.facilityLevels = {};
                    newBase.facilityLevels[inst.type] = Math.max(newBase.facilityLevels[inst.type] || 1, targetLv);
                    if (!newBase.facilities) newBase.facilities = [];
                    if (!newBase.facilities.includes(inst.type)) newBase.facilities.push(inst.type);

                    return {
                        ...inst,
                        level: targetLv,
                        underConstruction: false,
                        targetLevel: undefined,
                        constructionStartDate: undefined,
                        constructionStartTime: undefined,
                        constructionCompletionDate: undefined,
                        constructionCompletionTime: undefined,
                        totalConstructionMinutes: undefined
                    };
                }
            }
            return inst;
        });
    }

    // 3. 주택(숙소) 신축 및 증축 완공 검사
    if (newBase.houses && Array.isArray(newBase.houses)) {
        newBase.houses = newBase.houses.map(house => {
            if (house.underConstruction && house.constructionCompletionDate && house.constructionCompletionTime) {
                const check = getConstructionRemainingTime(curDate, curTime, house.constructionCompletionDate, house.constructionCompletionTime);
                if (check.isCompleted) {
                    hasChanges = true;
                    const targetLv = house.targetLevel || (house.level + 1);
                    const targetType = house.targetType || house.type;
                    const targetCap = house.targetCapacity || house.capacity;
                    const targetName = house.targetName || house.name;

                    completedList.push({ name: targetName, level: targetLv });
                    const isNew = house.level === 0;
                    if (isNew) {
                        logs.push(`[주택 완공] '${targetName}' 신축 공사가 완료되어 거주민 입주가 가능해졌습니다! (수용 정원: ${targetCap}명)`);
                    } else {
                        logs.push(`[주택 완공] '${targetName}' 증축 공사가 성공적으로 완료되었습니다! (Lv.${targetLv}, 수용 정원: ${targetCap}명)`);
                    }

                    const isMyHome = house.id === 'my_home_default' || (house.type as string) === 'my_home';
                    if (isMyHome) {
                        if (!newBase.facilityLevels) newBase.facilityLevels = {};
                        newBase.facilityLevels['my_home'] = targetLv;
                        if (newBase.layout) {
                            newBase.layout = newBase.layout.map(inst => {
                                if (inst.type === 'my_home') return { ...inst, level: targetLv };
                                return inst;
                            });
                        }
                    }

                    return {
                        ...house,
                        level: targetLv,
                        type: targetType,
                        capacity: targetCap,
                        name: targetName,
                        underConstruction: false,
                        targetLevel: undefined,
                        targetType: undefined,
                        targetCapacity: undefined,
                        targetName: undefined,
                        constructionStartDate: undefined,
                        constructionStartTime: undefined,
                        constructionCompletionDate: undefined,
                        constructionCompletionTime: undefined,
                        totalConstructionMinutes: undefined
                    };
                }
            }
            return house;
        });
    }

    // 4. 기지 부지 확장 완공 검사
    if (newBase.gridExpansionUnderConstruction && newBase.gridExpansionCompletionDate && newBase.gridExpansionCompletionTime) {
        const check = getConstructionRemainingTime(curDate, curTime, newBase.gridExpansionCompletionDate, newBase.gridExpansionCompletionTime);
        if (check.isCompleted) {
            hasChanges = true;
            const targetSize = newBase.targetGridSize || ((newBase.gridSize || 7) + 1);
            newBase.gridSize = targetSize;
            newBase.gridExpansionUnderConstruction = false;
            newBase.targetGridSize = undefined;
            newBase.gridExpansionStartDate = undefined;
            newBase.gridExpansionStartTime = undefined;
            newBase.gridExpansionCompletionDate = undefined;
            newBase.gridExpansionCompletionTime = undefined;
            newBase.gridExpansionTotalMinutes = undefined;

            completedList.push({ name: `기지 부지 (${targetSize}x${targetSize})`, level: targetSize });
            logs.push(`[부지 확장 완공] 기지 부지 개간 공사가 성공적으로 완료되어 격자 부지가 ${targetSize}x${targetSize}로 확장되었습니다!`);
        }
    }

    // 5. 방어 시설 세부 건축물 완공 검사
    if (newBase.defenseStructures && Array.isArray(newBase.defenseStructures)) {
        newBase.defenseStructures = newBase.defenseStructures.map(struct => {
            if (struct.underConstruction && struct.constructionCompletionDate && struct.constructionCompletionTime) {
                const check = getConstructionRemainingTime(curDate, curTime, struct.constructionCompletionDate, struct.constructionCompletionTime);
                if (check.isCompleted) {
                    hasChanges = true;
                    completedList.push({ name: `방어 시설: ${struct.name}`, level: 1 });
                    logs.push(`[방어 시설 완공] 방어소에 '${struct.name}' 건설이 완료되어 기지 방어력이 +${struct.defense} 증가했습니다!`);

                    return {
                        ...struct,
                        underConstruction: false,
                        constructionStartDate: undefined,
                        constructionStartTime: undefined,
                        constructionCompletionDate: undefined,
                        constructionCompletionTime: undefined,
                        totalConstructionMinutes: undefined
                    };
                }
            }
            return struct;
        });
    }

    // 6. 요리 시설 조리 완료 상태 갱신 검사
    if (newBase.cookingJobs && Array.isArray(newBase.cookingJobs)) {
        newBase.cookingJobs = newBase.cookingJobs.map(job => {
            if (!job.isCompleted && job.completionDate && job.completionTime) {
                const check = getConstructionRemainingTime(curDate, curTime, job.completionDate, job.completionTime);
                if (check.isCompleted) {
                    hasChanges = true;
                    logs.push(`[요리 완성] 전문 주방에서 '${job.recipeName}' 조리가 완료되었습니다! 주방에서 갓 만든 요리를 수령하십시오.`);
                    return {
                        ...job,
                        isCompleted: true
                    };
                }
            }
            return job;
        });
    }

    if (!hasChanges) {
        return { updatedCharacter: character, completedList: [], logs: [] };
    }

    newChar.base = newBase;
    return { updatedCharacter: newChar, completedList, logs };
}
