import { Character, WorldNewsItem } from '../types';
import { processTimeSkip } from './timeEngine';
import { calculateFinalStats } from '../utils';
import { executeDistributedMilestones } from './timeMilestoneEngine';
import { addWakingFatigue, reduceRestFatigue } from './fatigueService';
import { checkAndCompleteBaseConstructions } from './baseConstructionService';
import { advanceCombatTrainingTime } from './trainingService';
import { advanceChildAcademyTime } from './childAcademyService';
import { checkAndGenerateMonthlyWorldNews } from './worldNewsService';

export interface AdvanceTimeResult {
    updatedCharacter: Character;
    daysPassed: number;
    minutesPassed: number;
    logMessage?: string;
    systemLogs?: string[];
    logs?: string[];
    dailyReport?: any;
    toastNotice?: string;
    hasBufferedReport?: boolean;
    worldNews?: WorldNewsItem[];
}

/**
 * 분 단위의 시간을 한글 표준 표기로 변환합니다.
 * 규칙: 최소 1분, 24시간 초과 시 "1일 2시간", "1일 2시간 30분" 등으로 표기.
 */
export function formatDuration(totalMinutes: number): string {
    const minutes = Math.max(1, Math.round(totalMinutes));
    const days = Math.floor(minutes / 1440);
    const remainingMinutesAfterDays = minutes % 1440;
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const mins = remainingMinutesAfterDays % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}분`);

    return parts.join(' ');
}

/**
 * 날짜와 시간을 포맷팅하여 반환합니다.
 * 예: 2000년 3월 2일 08시 20분
 */
export function formatDateTime(dateStr?: string, timeStr?: string): string {
    const date = dateStr || '2000-03-02';
    const time = timeStr || '08:00';
    
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 ${pad(hour)}시 ${pad(minute)}분`;
}

/**
 * '2000-03-05' -> '3월 5일' 변환
 */
export function formatMonthDay(dateStr?: string): string {
    if (!dateStr) return '새로운 날';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return `${m}월 ${d}일`;
    }
    return dateStr;
}

/**
 * 시간대를 5가지로 구분하여 반환합니다. (새벽, 아침, 낮, 저녁, 밤)
 */
export function getTimeOfDay(timeStr?: string): { label: string; period: 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' } {
    const time = timeStr || '08:00';
    const hour = parseInt(time.split(':')[0], 10) || 8;

    if (hour >= 0 && hour < 6) {
        return { label: '새벽', period: 'dawn' };
    } else if (hour >= 6 && hour < 11) {
        return { label: '아침', period: 'morning' };
    } else if (hour >= 11 && hour < 17) {
        return { label: '낮', period: 'afternoon' };
    } else if (hour >= 17 && hour < 22) {
        return { label: '저녁', period: 'sunset' };
    } else {
        return { label: '밤', period: 'night' };
    }
}

/**
 * 사용자가 정한 엄격한 휴식 회복 기준:
 * 1) 2시간 이하: 전투불능 아닌 모든 플레이어 및 동료 20% 회복, 상태이상 해제 X
 * 2) 2시간 초과 ~ 4시간 이하: 전투불능 아닌 모든 플레이어 및 동료 50% 회복, 상태이상 해제 X
 * 3) 4시간 초과 ~ 8시간 미만: 전투불능 아닌 모든 플레이어 및 동료 80% 회복, 상태이상 해제 X
 * 4) 8시간 이상 ~ 12시간 미만: 전투불능 동료 포함 모든 플레이어 및 동료 80% 회복, 상태이상 해제 O
 * 5) 12시간 이상: 모든 플레이어 및 동료 100% 완전 회복 (전투불능 부활), 상태이상 해제 O
 * ※ 반드시 휴식 버튼을 눌러야만 회복됨 (단순 이동이나 수색 등에서는 자동 회복 불가)
 */
export function applyRestHealing(character: Character, hours: number, days: number = 0): { updatedCharacter: Character; logDesc: string } {
    const charCopy: Character = { ...character };
    const totalHours = days > 0 ? days * 24 : hours;

    // [중요] 휴식에 따른 피로도 감소(1시간 당 10)를 체력/마력 회복보다 먼저 적용
    // 피로도를 먼저 차감해야 과로(피로도 100) 디버프가 해제된 온전한 100% 최대 능력치 기준으로 회복됩니다.
    const { updatedCharacter: restedFatigueChar, reducedFatigue } = reduceRestFatigue(charCopy, totalHours);
    charCopy.fatigue = restedFatigueChar.fatigue;

    // 동료들의 피로도도 1시간 당 10씩 차감
    if (charCopy.companions) {
        charCopy.companions = charCopy.companions.map(c => {
            if (typeof c.fatigue === 'number') {
                const reduceAmount = totalHours * 10;
                return { ...c, fatigue: Math.max(0, Number((c.fatigue - reduceAmount).toFixed(1))) };
            }
            return c;
        });
    }
    if (charCopy.inactiveCompanions) {
        charCopy.inactiveCompanions = charCopy.inactiveCompanions.map(c => {
            if (typeof c.fatigue === 'number') {
                const reduceAmount = totalHours * 10;
                return { ...c, fatigue: Math.max(0, Number((c.fatigue - reduceAmount).toFixed(1))) };
            }
            return c;
        });
    }

    let healRatio = 0.2;
    let clearStatus = false;
    let reviveFainted = false;

    if (totalHours >= 12) {
        healRatio = 1.0;
        clearStatus = true;
        reviveFainted = true;
    } else if (totalHours >= 8) {
        healRatio = 0.8;
        clearStatus = true;
        reviveFainted = true;
    } else if (totalHours > 4) {
        healRatio = 0.8;
        clearStatus = false;
        reviveFainted = false;
    } else if (totalHours > 2) {
        healRatio = 0.5;
        clearStatus = false;
        reviveFainted = false;
    } else {
        healRatio = 0.2;
        clearStatus = false;
        reviveFainted = false;
    }

    const healEntity = (entity: any) => {
        if (!entity || !entity.stats) return;
        const { finalStats } = calculateFinalStats(entity);
        const maxHp = finalStats.maxHp;
        const maxMp = finalStats.maxMp;

        const isFainted = (entity.stats.hp || 0) <= 0;
        if (isFainted && !reviveFainted) {
            return;
        }

        if (clearStatus) {
            entity.statusEffects = [];
        }

        if (healRatio >= 1.0) {
            entity.stats.hp = maxHp;
            entity.stats.mp = maxMp;
        } else {
            const addHp = Math.floor(maxHp * healRatio);
            const addMp = Math.floor(maxMp * healRatio);
            entity.stats.hp = Math.min(maxHp, (entity.stats.hp || 0) + addHp);
            entity.stats.mp = Math.min(maxMp, (entity.stats.mp || 0) + addMp);
        }
    };

    healEntity(charCopy);

    if (charCopy.companions) {
        charCopy.companions.forEach(c => healEntity(c));
    }
    if (charCopy.inactiveCompanions) {
        charCopy.inactiveCompanions.forEach(c => healEntity(c));
    }

    const percentText = Math.round(healRatio * 100);
    const logDesc = totalHours >= 12
        ? `[휴식 완료] 12시간 이상 충분한 휴식으로 모든 파티원의 체력과 마력이 100% 회복되고 상태이상이 해제되었으며, 피로도가 ${reducedFatigue} 감소했습니다. (현재 피로도: ${charCopy.fatigue}/100)`
        : totalHours >= 8 
        ? `[휴식 완료] ${totalHours}시간 휴식으로 전투불능 동료를 포함한 파티원의 체력과 마력이 ${percentText}% 회복되고 상태이상이 해제되었으며, 피로도가 ${reducedFatigue} 감소했습니다. (현재 피로도: ${charCopy.fatigue}/100)`
        : `[휴식 완료] ${totalHours}시간 휴식으로 전투불능이 아닌 파티원의 체력과 마력이 ${percentText}% 회복되고 피로도가 ${reducedFatigue} 감소했습니다. (현재 피로도: ${charCopy.fatigue}/100)`;

    return { updatedCharacter: charCopy, logDesc };
}

/**
 * 여러 날의 일일 결산 보고서를 1개의 종합 보고서로 병합합니다.
 */
export function consolidateDailyReports(reports: any[]): any {
    if (!reports || reports.length === 0) return null;
    if (reports.length === 1) return reports[0];

    const lastReport = reports[reports.length - 1];
    let totalDays = 0;
    const combinedHarvested = {
        food: 0,
        wood: 0,
        stone: 0,
        herbs: 0,
        iron: 0,
        manaStone: 0
    };
    let combinedFoodConsumed = 0;
    let combinedBaseMaintenance = 0;
    const combinedAlerts: string[] = [];
    const combinedTrainingResults: any[] = [];

    reports.forEach(rep => {
        totalDays += (rep.days || 1);
        if (rep.totalHarvested) {
            combinedHarvested.food += (rep.totalHarvested.food || 0);
            combinedHarvested.wood += (rep.totalHarvested.wood || 0);
            combinedHarvested.stone += (rep.totalHarvested.stone || 0);
            combinedHarvested.herbs += (rep.totalHarvested.herbs || 0);
            combinedHarvested.iron += (rep.totalHarvested.iron || 0);
            combinedHarvested.manaStone += (rep.totalHarvested.manaStone || 0);
        }
        combinedFoodConsumed += (rep.foodConsumed || 0);
        combinedBaseMaintenance += (rep.baseMaintenanceFee || 0);
        if (rep.criticalAlerts && Array.isArray(rep.criticalAlerts)) {
            rep.criticalAlerts.forEach((alt: string) => {
                if (!combinedAlerts.includes(alt)) combinedAlerts.push(alt);
            });
        }
        if (rep.combatTrainingResults && Array.isArray(rep.combatTrainingResults)) {
            combinedTrainingResults.push(...rep.combatTrainingResults);
        }
    });

    return {
        ...lastReport,
        days: totalDays,
        date: lastReport.date,
        totalHarvested: combinedHarvested,
        currentResources: lastReport.currentResources,
        criticalAlerts: combinedAlerts,
        foodConsumed: combinedFoodConsumed,
        baseMaintenanceFee: combinedBaseMaintenance,
        combatTrainingResults: combinedTrainingResults.length > 0 ? combinedTrainingResults : lastReport.combatTrainingResults,
        isConsolidated: true
    };
}

/**
 * 현재 시각에서 목표 시각(기본 오전 8시)까지 필요한 시간(분)을 정확하게 계산합니다.
 * - 모듈로/종료 조건 오류를 방지하며 0시간 경과 판정이나 무한 루프가 발생하지 않도록 보장합니다.
 */
export function calculateMinutesToTargetTime(
    currentTime?: string,
    targetHour: number = 8,
    targetMinute: number = 0,
    forceNextDayIfSame: boolean = true
): { minutesToAdd: number; hours: number; isNextDay: boolean; durationText: string } {
    const time = currentTime || '08:00';
    const [curHour, curMin] = time.split(':').map(Number);
    const currentTotalMin = curHour * 60 + curMin;
    const targetTotalMin = targetHour * 60 + targetMinute;

    let diffMin = targetTotalMin - currentTotalMin;
    let isNextDay = false;

    if (diffMin === 0) {
        if (forceNextDayIfSame) {
            diffMin = 1440; // 이미 8시인 경우 다음 날 오전 8시로 이동
            isNextDay = true;
        } else {
            diffMin = 0;
            isNextDay = false;
        }
    } else if (diffMin < 0) {
        diffMin += 1440;
        isNextDay = true;
    } else {
        isNextDay = false;
    }

    return {
        minutesToAdd: diffMin,
        hours: Math.round(diffMin / 60 * 10) / 10,
        isNextDay,
        durationText: formatDuration(diffMin)
    };
}

/**
 * 게임 내 시간을 전진시킵니다.
 * [완전 분산 엔진 탑재]
 * - 1분부터 7일(10080분)까지:
 *   하루 4대 마일스톤(00:00 자정 인연/일자 변경, 08:00 아침 영지 수확, 12:00 정오 용병/군사, 18:00 저녁 외교)을
 *   정확한 시간 순서대로 순차 실행하여 날짜 변경 및 일일 초기화 누락을 원천 차단합니다.
 * - 7일 초과 장기 스킵:
 *   기존 종합 TimeEngine(processTimeSkip)을 통해 안전하고 신속한 일괄 계산을 보장합니다.
 */
export function advanceGameTime(
    character: Character,
    minutesToAdd: number,
    options?: {
        isDungeonOrCombat?: boolean;
        activityName?: string;
        isRest?: boolean;
    }
): AdvanceTimeResult {
    if (minutesToAdd <= 0) {
        return { updatedCharacter: character, daysPassed: 0, minutesPassed: 0 };
    }

    const isRestActivity = Boolean(options?.isRest) || 
        (Boolean(options?.activityName) && (
            options!.activityName.includes('휴식') || 
            options!.activityName.includes('수면') || 
            options!.activityName.includes('숙면')
        ));

    let charCopy: Character = { ...character };
    const initialTime = charCopy.currentTime || '08:00';
    const [curHour, curMin] = initialTime.split(':').map(Number);

    const totalCurrentMinutes = curHour * 60 + curMin;
    const newTotalMinutes = totalCurrentMinutes + Math.round(minutesToAdd);

    const remainingMinutes = ((newTotalMinutes % 1440) + 1440) % 1440;
    const newHour = Math.floor(remainingMinutes / 60);
    const newMin = remainingMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const targetTimeStr = `${pad(newHour)}:${pad(newMin)}`;

    const formattedDuration = formatDuration(minutesToAdd);

    // 1. 7일(10080분) 초과의 대규모 시간 경과: 종합 processTimeSkip 실행 후 잔여 분 마일스톤 정산
    if (minutesToAdd > 10080) {
        const daysPassed = Math.floor(minutesToAdd / 1440);
        const remMinutes = minutesToAdd % 1440;

        const timeSkipResult = processTimeSkip(charCopy, daysPassed);
        let updatedFromSkip = timeSkipResult.updatedCharacter;

        if (remMinutes > 0) {
            const milestoneResult = executeDistributedMilestones(
                updatedFromSkip,
                totalCurrentMinutes,
                remMinutes,
                options
            );
            updatedFromSkip = milestoneResult.updatedCharacter;
        }

        updatedFromSkip.currentTime = targetTimeStr;
        // 깨어있는 활동 시간에 따른 피로도 증가 (1시간 당 5) - 휴식 시에는 피로도가 축적되지 않음
        if (!isRestActivity) {
            updatedFromSkip = addWakingFatigue(updatedFromSkip, minutesToAdd);
        }

        const systemLogs = timeSkipResult.systemLogs || [];

        // 전투훈련소 주간 훈련시간 누적 및 성장 정산
        try {
            const trainingRes = advanceCombatTrainingTime(updatedFromSkip, minutesToAdd, totalCurrentMinutes);
            updatedFromSkip = trainingRes.updatedCharacter;
            if (trainingRes.logs.length > 0) {
                systemLogs.push(...trainingRes.logs);
            }
        } catch (e) {
            console.error('Combat training progression error:', e);
        }

        // 유년 서당 주간 훈련시간(8시간 정산, 취침시간 제외) 누적 및 정산
        try {
            const academyRes = advanceChildAcademyTime(updatedFromSkip, minutesToAdd, totalCurrentMinutes);
            updatedFromSkip = academyRes.updatedCharacter;
            if (academyRes.logs.length > 0) {
                systemLogs.push(...academyRes.logs);
            }
        } catch (e) {
            console.error('Child academy training progression error:', e);
        }

        const dailyReport = timeSkipResult.dailyReport;

        const dateLabel = formatMonthDay(updatedFromSkip.currentDate);
        const toastNotice = `시간이 흘러 ${updatedFromSkip.currentDate}가 되었습니다. (${dateLabel})`;

        let worldNews = timeSkipResult.worldNews;
        const monthlyNewsRes = checkAndGenerateMonthlyWorldNews(updatedFromSkip, charCopy.currentDate, systemLogs);
        if (monthlyNewsRes.news && monthlyNewsRes.news.length > 0) {
            updatedFromSkip = monthlyNewsRes.updatedCharacter;
            worldNews = [...(worldNews || []), ...monthlyNewsRes.news];
            updatedFromSkip.pendingWorldNews = worldNews;
        }

        if (options?.isDungeonOrCombat) {
            if (!updatedFromSkip.bufferedTimeSkipReports) updatedFromSkip.bufferedTimeSkipReports = [];
            if (dailyReport) updatedFromSkip.bufferedTimeSkipReports.push(dailyReport);
            return {
                updatedCharacter: updatedFromSkip,
                daysPassed,
                minutesPassed: minutesToAdd,
                logMessage: `[시간 경과] ${options.activityName ? `${options.activityName}으로 ` : ''}${formattedDuration}이 흘렀습니다.`,
                systemLogs,
                logs: systemLogs,
                toastNotice,
                dailyReport: null,
                hasBufferedReport: true,
                worldNews: worldNews && worldNews.length > 0 ? worldNews : undefined
            };
        }

        return {
            updatedCharacter: updatedFromSkip,
            daysPassed,
            minutesPassed: minutesToAdd,
            logMessage: `[시간 경과] ${options?.activityName ? `${options?.activityName}으로 ` : ''}${formattedDuration}이 흘러 ${updatedFromSkip.currentDate} ${updatedFromSkip.currentTime}가 되었습니다.`,
            systemLogs,
            logs: systemLogs,
            toastNotice,
            dailyReport,
            hasBufferedReport: false,
            worldNews: worldNews && worldNews.length > 0 ? worldNews : undefined
        };
    }

    // 2. 사소한 시간 경과(15분 이하) 초고속 패스 (Fast Path):
    // 00:00(자정), 08:00, 12:00, 18:00 마일스톤 경계를 넘지 않고 건설 중인 시설도 없다면 초대형 검사를 건너뜀
    const isSmallTimeStep = minutesToAdd <= 15 && !isRestActivity;
    let crossesMilestone = false;
    if (isSmallTimeStep) {
        const endTotalMin = totalCurrentMinutes + Math.round(minutesToAdd);
        if (Math.floor(totalCurrentMinutes / 1440) !== Math.floor(endTotalMin / 1440)) {
            crossesMilestone = true;
        } else {
            const startMod = totalCurrentMinutes % 1440;
            const endMod = endTotalMin % 1440;
            const milestones = [480, 720, 1080];
            for (const m of milestones) {
                if (startMod < m && endMod >= m) {
                    crossesMilestone = true;
                    break;
                }
            }
        }
    }

    if (isSmallTimeStep && !crossesMilestone) {
        // 초대형 검사를 완전히 생략하고 0.0001초 만에 시간 및 미세 피로도만 갱신
        let quickChar = { ...charCopy };
        quickChar.currentTime = targetTimeStr;
        quickChar = addWakingFatigue(quickChar, minutesToAdd);

        // 던전/전투 중이 아닐 때에만 기지 훈련 및 서당 갱신 (던전 1보 1분 이동 시 CPU 렉 원천 차단)
        if (!options?.isDungeonOrCombat) {
            try {
                const trainingRes = advanceCombatTrainingTime(quickChar, minutesToAdd, totalCurrentMinutes);
                quickChar = trainingRes.updatedCharacter;
            } catch (e) {
                console.error('Fast path training progression error:', e);
            }

            try {
                const academyRes = advanceChildAcademyTime(quickChar, minutesToAdd, totalCurrentMinutes);
                quickChar = academyRes.updatedCharacter;
            } catch (e) {
                console.error('Fast path academy training error:', e);
            }
        }

        const logMsg = `[시간 경과] ${options?.activityName ? `${options?.activityName}으로 ` : ''}${formattedDuration}이 흘렀습니다. (현재: ${quickChar.currentDate || ''} ${quickChar.currentTime})`;
        return {
            updatedCharacter: quickChar,
            daysPassed: 0,
            minutesPassed: minutesToAdd,
            logMessage: logMsg,
            systemLogs: [],
            logs: []
        };
    }

    // 3. 7일(10080분) 이하의 시간 경과 (12시간 휴식, 8시 이동, 1일 휴식 등 또는 마일스톤 경계 교차 시):
    // 4대 마일스톤(자정, 아침8시, 정오, 저녁6시) 순차 엔진 가동
    const milestoneResult = executeDistributedMilestones(
        charCopy,
        totalCurrentMinutes,
        Math.round(minutesToAdd),
        options
    );

    let activeChar = milestoneResult.updatedCharacter;
    activeChar.currentTime = targetTimeStr;
    // 깨어있는 활동 시간에 따른 피로도 증가 (1시간 당 5) - 휴식 시에는 피로도가 축적되지 않음
    if (!isRestActivity) {
        activeChar = addWakingFatigue(activeChar, minutesToAdd);
    }

    // 4. 기지 본부 및 시설 완공 검사 (시간이 흘러 완공 시점에 도달했는지 확인)
    const constructionRes = checkAndCompleteBaseConstructions(activeChar);
    if (constructionRes.logs.length > 0) {
        activeChar = constructionRes.updatedCharacter;
        milestoneResult.logs.push(...constructionRes.logs);
    }

    // 전투훈련소 주간 훈련시간 누적 및 성장 정산 (시간이 흐를 때 실시간 누적)
    try {
        const trainingRes = advanceCombatTrainingTime(activeChar, minutesToAdd, totalCurrentMinutes);
        activeChar = trainingRes.updatedCharacter;
        if (trainingRes.logs.length > 0) {
            milestoneResult.logs.push(...trainingRes.logs);
        }
    } catch (e) {
        console.error('Combat training progression error:', e);
    }

    // 유년 서당 주간 훈련시간(8시간 정산, 취침시간 제외) 누적 및 정산
    try {
        const academyRes = advanceChildAcademyTime(activeChar, minutesToAdd, totalCurrentMinutes);
        activeChar = academyRes.updatedCharacter;
        if (academyRes.logs.length > 0) {
            milestoneResult.logs.push(...academyRes.logs);
        }
    } catch (e) {
        console.error('Child academy training error:', e);
    }

    const daysPassed = milestoneResult.midnightsCount || (milestoneResult.dailyReport ? 1 : 0);
    const dateLabel = formatMonthDay(activeChar.currentDate);
    const toastNotice = milestoneResult.toastNotice || (daysPassed > 0 ? `시간이 흘러 ${activeChar.currentDate}가 되었습니다. (${dateLabel})` : undefined);

    const extraLogs = milestoneResult.logs.length > 0 ? ` (${milestoneResult.logs[0]})` : '';
    const endHour = parseInt(activeChar.currentTime?.split(':')[0] || '0', 10);
    const isMidnightLabor = !isRestActivity && endHour >= 0 && endHour < 6;
    const midnightPenaltyText = isMidnightLabor ? ' (⚠️ 심야 노동 패널티: 피로도 2배 축적)' : '';
    const logMessage = `[시간 경과] ${options?.activityName ? `${options?.activityName}으로 ` : ''}${formattedDuration}이 흘렀습니다. (현재: ${activeChar.currentDate || ''} ${activeChar.currentTime})${extraLogs}${midnightPenaltyText}`;

    let worldNews: WorldNewsItem[] | undefined = undefined;
    const monthlyNewsRes = checkAndGenerateMonthlyWorldNews(activeChar, charCopy.currentDate, milestoneResult.logs);
    if (monthlyNewsRes.news && monthlyNewsRes.news.length > 0) {
        activeChar = monthlyNewsRes.updatedCharacter;
        worldNews = monthlyNewsRes.news;
        activeChar.pendingWorldNews = worldNews;
    }

    return {
        updatedCharacter: activeChar,
        daysPassed,
        minutesPassed: minutesToAdd,
        logMessage,
        systemLogs: milestoneResult.logs,
        logs: milestoneResult.logs,
        toastNotice,
        dailyReport: milestoneResult.dailyReport || null,
        hasBufferedReport: milestoneResult.hasBufferedReport || false,
        worldNews: worldNews && worldNews.length > 0 ? worldNews : undefined
    };
}

/**
 * 던전/전투/사냥을 마치고 안전 구역(마을/기지)으로 복귀했을 때 누적된 일일 보고서를 일괄 취합하여 반환합니다.
 */
export function flushBufferedReports(character: Character): { updatedCharacter: Character; consolidatedReport: any | null } {
    if (!character.bufferedTimeSkipReports || character.bufferedTimeSkipReports.length === 0) {
        return { updatedCharacter: character, consolidatedReport: null };
    }

    const charCopy: Character = { ...character };
    const reports = [...charCopy.bufferedTimeSkipReports];
    charCopy.bufferedTimeSkipReports = [];

    const consolidatedReport = consolidateDailyReports(reports);

    return {
        updatedCharacter: charCopy,
        consolidatedReport
    };
}
