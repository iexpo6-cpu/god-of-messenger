import { Character, CriticalAlert, RelationType } from '../types';
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
/**
 * [NEW] 오랫동안 교류가 끊기거나 소원해진 먼 인맥을 자연스럽게 자동 정리합니다.
 * 
 * [철저한 보호 대상 (정리 절대 금지)]:
 * 1. 플레이어 본인 및 직계 가족: 배우자(isSpouse), 연인(isLover, partnerId === 'player'), 자녀(classType 자녀/Child)
 * 2. 동료들의 가족/배우자 (동료의 소중한 인연 보존)
 * 3. 라이벌 및 영원의 라이벌 (isRival, isEternalRival)
 * 4. 영생자 및 신의 사자/마신 등 특수 인물 (isImmortal)
 * 5. 강한 유대(친구/절친: affection >= 30) 또는 숙적/원한(affection <= -30, 복수자 이벤트 대상)
 * 6. 플레이어와 직접 대화/소통한 기록(chatHistory)이나 AI 기억(memories), 조문(condolenceCount)이 있는 인물
 * 7. 약속(socialAppointments)이 대기 중인 인물
 * 
 * [자동 정리 대상]:
 * 1. 사망자 중 특별한 유대(가족/연인/라이벌/호감도 10 이상)가 없고 사망/교류 후 3년(1,095일) 이상 지난 인물
 * 2. 생존 인물 중 호감도가 5 이하(서로 거의 모르는 사이)이면서 10년(3,650일) 이상 연락이나 만남이 완전히 끊긴 먼 지인
 */
const pruneFadedSocialNetwork = (currentRef: Character, currentDate: string, allLogs: string[]) => {
    if (!currentRef.socialNetwork || currentRef.socialNetwork.length === 0) return;

    const activeCompanionIds = new Set([
        ...(currentRef.companions || []).map(c => c.id),
        ...(currentRef.inactiveCompanions || []).map(c => c.id)
    ]);

    // 동료들의 가족/배우자 ID 수집 (동료의 소중한 인연 보호)
    const protectedFamilyIds = new Set<string>();
    [...(currentRef.companions || []), ...(currentRef.inactiveCompanions || [])].forEach(c => {
        if (c.partnerId) protectedFamilyIds.add(c.partnerId);
        if (c.relations) {
            Object.entries(c.relations).forEach(([targetId, rel]) => {
                if (rel.type === RelationType.SPOUSE || rel.type === RelationType.LOVER || rel.type === RelationType.SIBLING) {
                    protectedFamilyIds.add(targetId);
                }
            });
        }
    });

    // 약속(socialAppointments)이 대기 중인 NPC 보호
    const appointmentIds = new Set(
        (currentRef.socialAppointments || [])
            .filter(a => a.status === 'pending')
            .map(a => a.targetId)
    );

    let prunedCount = 0;

    currentRef.socialNetwork = currentRef.socialNetwork.filter(entity => {
        if (!entity || !entity.id) return false;

        // 1. 현재 파티/기지 대기 동료는 절대 제외
        if (activeCompanionIds.has(entity.id)) return true;

        // 2. 플레이어의 직계 가족 / 배우자 / 연인 보호
        if ((entity as any).isSpouse || (entity as any).isLover || (entity as any).partnerId === 'player') return true;
        if (entity.classType?.includes('자녀') || entity.classType?.includes('Child')) return true;

        // 3. 동료들의 가족/배우자 보호
        if (protectedFamilyIds.has(entity.id)) return true;

        // 4. 라이벌 및 영원의 라이벌 보호
        if (entity.isRival || entity.isEternalRival) return true;

        // 5. 영생자 또는 특수 초월자 보호
        if ((entity as any).isImmortal) return true;

        // 6. 강한 호감도 (친구/절친: >= 30) 또는 강한 적대감/숙적 (<= -30) 보호
        const aff = entity.affection ?? 0;
        if (aff >= 30 || aff <= -30) return true;

        // 7. 플레이어와 직접 대화한 이력이나 조문/기억 이력이 있는 인물 보호
        if (Array.isArray(entity.chatHistory) && entity.chatHistory.length > 0) return true;
        if (Array.isArray(entity.memories) && entity.memories.length > 0) return true;
        if (entity.condolenceCount && entity.condolenceCount > 0) return true;

        // 8. 현재 약속이 잡혀있는 인물 보호
        if (appointmentIds.has(entity.id)) return true;

        const lastDate = entity.lastInteractionDate || entity.lastMentoringDate || START_DATE;
        const diffDays = getDaysDiff(lastDate, currentDate);

        // 9. 사망자 정리: 사망한 상태(isDead/isPurged)이며 특별한 유대(호감도 10 이상)가 없고 사망/교류 후 3년(1,095일) 이상 지난 경우
        if (entity.isDead || entity.isPurged) {
            if (aff < 10 && diffDays >= 1095) {
                prunedCount++;
                return false;
            }
            return true;
        }

        // 10. 생존 인물 중 "오랫동안 연이 없는 인물" 정리 (10년 기준):
        // - 호감도가 5 이하(서로 거의 모르는 사이)로 소원해짐
        // - 마지막 교류/만남으로부터 10년(3,650일) 이상 아무런 연락이 없었던 먼 인맥
        if (aff <= 5 && diffDays >= 3650) {
            prunedCount++;
            return false;
        }

        return true;
    });

    if (prunedCount > 0 && Math.random() < 0.1) {
        allLogs.push(`[인맥 정리] 세월이 흘러 교류가 완전히 끊긴 먼 인연 ${prunedCount}명과의 소식이 기억 속에서 자연스럽게 희미해졌습니다.`);
    }
};

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
        pruneFadedSocialNetwork(currentRef, currentDate, allLogs);
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
