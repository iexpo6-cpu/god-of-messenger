import { Character, CriticalAlert } from '../types';
import { START_DATE } from '../constants';
import { updateSocialNetworkGrowth } from '../utils';
import { processMercenaryDailyEvents } from './MercenaryTimeEngine';
import { processMilitaryDailyEvents } from './MilitaryTimeEngine';
import { processSchoolAdvancement, processSchoolDailyEvents, processClassmatesGrowth } from './SchooltimeEngine';
import { processNpcLifeEvents } from './npcLifeEngine';
import { processNaturalDeath } from './deathTimeEngine';
import { processDivineDailyEvents } from './DivineTimeEngine';
import { updateNationalDiplomacy } from './diplomacyService';
import { processBreederAutoCare } from './monsterGrowth';
import { checkTimeEngineCompanionClassLiberation, upgradeSocialNetworkSkillsOnGrowth } from './companionGrowthService';
import { sanitizeCharacterStudentJobsWithLogs } from './npcJobSanitizer';
import { checkAndCompleteBaseConstructions } from './baseConstructionService';
import { syncRegionDefenseTimeTick } from './territoryDefenseService';

/**
 * 마일스톤 슬롯 타입 (하루 4대 마일스톤 또는 전체)
 */
export type MilestoneType = 'midnight' | 'morning' | 'noon' | 'evening';

/**
 * 타임 엔진 실행 컨텍스트
 */
export interface TimeEngineContext {
    character: Character;
    currentDate: string;
    prevDate?: string;
    nextDate?: string;
    yearNum: number;
    monthNum: number;
    dayNum: number;
    daysPassed: number;
    milestone: MilestoneType;
    logs: string[];
    criticalAlerts: CriticalAlert[];
    options?: {
        isDungeonOrCombat?: boolean;
        activityName?: string;
        isRest?: boolean;
    };
}

/**
 * 표준 타임 엔진 모듈 규격 인터페이스
 */
export interface TimeEngineModule {
    id: string;
    name: string; // 한글 명칭
    milestone: MilestoneType | 'all';
    priority: number; // 실행 우선순위 (낮을수록 먼저 실행)
    execute: (context: TimeEngineContext) => { updatedCharacter?: Character; logs?: string[]; alerts?: CriticalAlert[] } | void;
    collectAlerts?: (context: TimeEngineContext) => CriticalAlert[];
}

/**
 * 전역 단일 타임 엔진 레지스트리 저장소
 */
const registeredModules: Map<string, TimeEngineModule> = new Map();

/**
 * 새로운 타임 엔진 모듈을 단일 레지스트리에 등록합니다.
 * 향후 새로운 타임 엔진이 추가될 경우 이 함수만 호출하면 모든 마일스톤 및 시간 경과에 자동으로 통합 연동됩니다.
 */
export function registerTimeEngineModule(module: TimeEngineModule): void {
    registeredModules.set(module.id, module);
}

/**
 * 등록된 특정 타임 엔진 모듈을 제거합니다.
 */
export function unregisterTimeEngineModule(id: string): void {
    registeredModules.delete(id);
}

/**
 * 등록된 모든 타임 엔진 모듈 목록을 반환합니다.
 */
export function getRegisteredTimeEngines(): TimeEngineModule[] {
    return Array.from(registeredModules.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * 날짜 차이(일수) 계산 헬퍼
 */
const getDaysDiff = (d1?: string, d2?: string): number => {
    if (!d1 || !d2) return 0;
    try {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
};

/**
 * 인연 유대 수치 장기 미교류 감쇄 처리
 */
const processAffectionDecay = (currentRef: Character, currentDate: string, allLogs: string[]) => {
    const DECAY_THRESHOLD_DAYS = 365;
    const DECAY_CHECK_INTERVAL = 30;

    const activeCompanionIds = new Set([
        ...(currentRef.companions || []).map(c => c.id),
        ...(currentRef.inactiveCompanions || []).map(c => c.id)
    ]);

    const decayEntity = (entity: any) => {
        if (activeCompanionIds.has(entity.id)) return;
        if (entity.isDead || entity.isPurged) return;
        
        const lastDate = entity.lastInteractionDate || START_DATE;
        const diff = getDaysDiff(lastDate, currentDate);

        if (diff > DECAY_THRESHOLD_DAYS) {
            const extraDays = diff - DECAY_THRESHOLD_DAYS;
            if (entity.affection < 0) return;
            if (extraDays > 0 && extraDays % DECAY_CHECK_INTERVAL === 0) {
                const prevAff = entity.affection;
                entity.affection = Math.max(0, entity.affection - 1);
                
                if (prevAff > 0 && entity.affection < prevAff && Math.random() < 0.05) {
                    allLogs.push(`[인연 소원] '${entity.name}'님과의 교류가 오랫동안 끊겨 서서히 사이가 멀어지고 있습니다.`);
                }
            }
        }
    };

    if (currentRef.socialNetwork) {
        currentRef.socialNetwork.forEach(decayEntity);
    }
};

/**
 * 기본 도메인 타임 엔진 모듈들을 일괄 등록합니다.
 */
function initDefaultTimeEngineModules() {
    // 1. 자정 마일스톤 (00:00) 엔진들
    registerTimeEngineModule({
        id: 'schoolAdvancementEngine',
        name: '학교 진급 시간 엔진',
        milestone: 'midnight',
        priority: 10,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            const prevYear = ctx.prevDate ? parseInt(ctx.prevDate.split('-')[0], 10) : ctx.yearNum;
            const nextYear = ctx.nextDate ? parseInt(ctx.nextDate.split('-')[0], 10) : ctx.yearNum;
            processSchoolAdvancement(
                ctx.character,
                ctx.prevDate || ctx.currentDate,
                ctx.nextDate || ctx.currentDate,
                prevYear,
                nextYear,
                tempLogs
            );
            return { logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'divineDailyEngine',
        name: '신격 시간 엔진',
        milestone: 'midnight',
        priority: 20,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            processDivineDailyEvents(ctx.character, tempLogs);
            return { logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'socialNetworkGrowthEngine',
        name: '인맥 성장 시간 엔진',
        milestone: 'midnight',
        priority: 30,
        execute: (ctx) => {
            const char = ctx.character;
            const tempLogs: string[] = [];
            if (char.socialNetwork && char.socialNetwork.length > 0) {
                const sanitizeResult = sanitizeCharacterStudentJobsWithLogs(char);
                sanitizeResult.logs.forEach(l => tempLogs.push(l));

                const prevNetwork = char.socialNetwork;
                const targetYear = ctx.nextDate ? parseInt(ctx.nextDate.split('-')[0], 10) : ctx.yearNum;
                const { updatedNetwork, growthLogs } = updateSocialNetworkGrowth(char.socialNetwork, 1, targetYear);
                upgradeSocialNetworkSkillsOnGrowth(prevNetwork, updatedNetwork);
                char.socialNetwork = updatedNetwork;
                growthLogs.forEach(l => tempLogs.push(l));

                processAffectionDecay(char, ctx.nextDate || ctx.currentDate, tempLogs);
            }
            return { updatedCharacter: char, logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'classmatesGrowthEngine',
        name: '학급 동기 성장 시간 엔진',
        milestone: 'midnight',
        priority: 40,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            const targetYear = ctx.nextDate ? parseInt(ctx.nextDate.split('-')[0], 10) : ctx.yearNum;
            processClassmatesGrowth(ctx.character, 1, targetYear, tempLogs);
            return { logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'npcLifeCycleEngine',
        name: '엔피시 생애 시간 엔진',
        milestone: 'midnight',
        priority: 50,
        execute: (ctx) => {
            const lifeRes = processNpcLifeEvents(ctx.character, 1);
            return {
                updatedCharacter: lifeRes?.updatedChar || ctx.character,
                logs: lifeRes?.lifeLogs || []
            };
        }
    });

    registerTimeEngineModule({
        id: 'naturalDeathEngine',
        name: '자연사 수명 시간 엔진',
        milestone: 'midnight',
        priority: 60,
        execute: (ctx) => {
            const deathRes = processNaturalDeath(ctx.character);
            const updated = deathRes?.updatedChar || ctx.character;
            if (deathRes?.newDeceased && deathRes.newDeceased.length > 0) {
                if (!updated.pendingDeceasedAlerts) updated.pendingDeceasedAlerts = [];
                updated.pendingDeceasedAlerts.push(...deathRes.newDeceased);
            }
            return {
                updatedCharacter: updated,
                logs: deathRes?.deathLogs || []
            };
        }
    });

    // 2. 마수 사육 시간 엔진 (매일 자정/아침 등 날짜 변경 시 1일 1회 확실하게 정산 및 서신 발송)
    registerTimeEngineModule({
        id: 'breederCareEngine',
        name: '마수 사육 시간 엔진',
        milestone: 'all',
        priority: 10,
        execute: (ctx) => {
            const char = ctx.character;
            const curDate = ctx.currentDate || char.currentDate || '2000-03-02';
            if ((char as any).lastBreederCareDate === curDate) {
                return { updatedCharacter: char, logs: [] };
            }
            const breederRes = processBreederAutoCare(char);
            const updated = breederRes?.updatedCharacter || char;
            (updated as any).lastBreederCareDate = curDate;
            return {
                updatedCharacter: updated,
                logs: breederRes?.logs || []
            };
        }
    });

    registerTimeEngineModule({
        id: 'companionLiberationEngine',
        name: '동료 클래스 해금 시간 엔진',
        milestone: 'morning',
        priority: 20,
        execute: (ctx) => {
            const char = { ...ctx.character };
            const tempLogs: string[] = [];
            if (char.companions) {
                char.companions = char.companions.map(comp => {
                    const libRes = checkTimeEngineCompanionClassLiberation(comp);
                    if (libRes.evolved && libRes.log) tempLogs.push(libRes.log);
                    return libRes.updated;
                });
            }
            if (char.inactiveCompanions) {
                char.inactiveCompanions = char.inactiveCompanions.map(comp => {
                    const libRes = checkTimeEngineCompanionClassLiberation(comp);
                    if (libRes.evolved && libRes.log) tempLogs.push(libRes.log);
                    return libRes.updated;
                });
            }
            return { updatedCharacter: char, logs: tempLogs };
        }
    });

    // 3. 정오 마일스톤 (12:00) 엔진들
    registerTimeEngineModule({
        id: 'mercenaryTimeEngine',
        name: '용병단 시간 엔진',
        milestone: 'noon',
        priority: 10,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            processMercenaryDailyEvents(ctx.character, ctx.currentDate, tempLogs);
            return { logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'militaryTimeEngine',
        name: '군사 시간 엔진',
        milestone: 'noon',
        priority: 20,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            processMilitaryDailyEvents(ctx.character, ctx.currentDate, tempLogs);
            return { logs: tempLogs };
        }
    });

    registerTimeEngineModule({
        id: 'schoolDailyEngine',
        name: '학교 일일 활동 시간 엔진',
        milestone: 'noon',
        priority: 30,
        execute: (ctx) => {
            const tempLogs: string[] = [];
            processSchoolDailyEvents(ctx.character, ctx.currentDate, ctx.monthNum, ctx.yearNum, tempLogs);
            return { logs: tempLogs };
        }
    });

    // 4. 저녁 마일스톤 (18:00) 엔진들
    registerTimeEngineModule({
        id: 'nationalDiplomacyEngine',
        name: '국가 외교 시간 엔진',
        milestone: 'evening',
        priority: 10,
        execute: (ctx) => {
            const dipRes = updateNationalDiplomacy(ctx.character, 1);
            return {
                updatedCharacter: dipRes?.updatedChar || ctx.character,
                logs: dipRes?.events || []
            };
        }
    });

    // 5. 공통 전 마일스톤 엔진: 기지 시설 건설/증축 완공 자동 검사
    registerTimeEngineModule({
        id: 'baseConstructionEngine',
        name: '기지 시설 건설 완공 시간 엔진',
        milestone: 'all',
        priority: 5,
        execute: (ctx) => {
            const checkRes = checkAndCompleteBaseConstructions(ctx.character);
            return {
                updatedCharacter: checkRes.updatedCharacter,
                logs: checkRes.logs
            };
        }
    });

    // 6. 공통 전 마일스톤 엔진: 영지 방어 진지 보강 완공 검사 및 방치된 위협 사태 위협도 폭증
    registerTimeEngineModule({
        id: 'territoryDefenseEngine',
        name: '영지 방어 시간 엔진',
        milestone: 'all',
        priority: 6,
        execute: (ctx) => {
            const syncRes = syncRegionDefenseTimeTick(ctx.character);
            return {
                updatedCharacter: syncRes.updatedCharacter,
                logs: syncRes.logs
            };
        }
    });
}

// 초기 기본 모듈 등록 실행
initDefaultTimeEngineModules();

/**
 * 특정 마일스톤에 배정된 모든 타임 엔진 모듈들을 통합 단일 파이프라인으로 순차 실행합니다.
 * 에러 격리(try-catch)가 적용되어 특정 모듈 오류 시에도 전체 시스템이 안전하게 유지됩니다.
 */
export function executeMilestoneTimeEngines(
    milestone: MilestoneType,
    context: TimeEngineContext
): { updatedCharacter: Character; logs: string[]; alerts: CriticalAlert[] } {
    let currentChar = context.character;
    const accumulatedLogs: string[] = [...context.logs];
    const accumulatedAlerts: CriticalAlert[] = [...context.criticalAlerts];

    const eligibleModules = getRegisteredTimeEngines().filter(
        mod => mod.milestone === milestone || mod.milestone === 'all'
    );

    for (const mod of eligibleModules) {
        try {
            const subCtx: TimeEngineContext = {
                ...context,
                character: currentChar,
                logs: accumulatedLogs,
                criticalAlerts: accumulatedAlerts
            };

            const result = mod.execute(subCtx);
            if (result) {
                if (result.updatedCharacter) {
                    currentChar = result.updatedCharacter;
                }
                if (result.logs && result.logs.length > 0) {
                    accumulatedLogs.push(...result.logs);
                }
                if (result.alerts && result.alerts.length > 0) {
                    accumulatedAlerts.push(...result.alerts);
                }
            }

            if (mod.collectAlerts) {
                const subAlerts = mod.collectAlerts(subCtx);
                if (subAlerts && subAlerts.length > 0) {
                    accumulatedAlerts.push(...subAlerts);
                }
            }
        } catch (err) {
            console.error(`[통합 타임 엔진 오류] 모듈 '${mod.name}' 실행 중 문제 발생:`, err);
            accumulatedLogs.push(`[시스템] '${mod.name}' 처리 중 오류가 발생했으나 안전하게 복구되었습니다.`);
        }
    }

    return {
        updatedCharacter: currentChar,
        logs: accumulatedLogs,
        alerts: accumulatedAlerts
    };
}
