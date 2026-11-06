import { Character, DailyReportData, Companion, Item, ItemRarity, DeceasedAlertInfo, JobType, CriticalAlert, Enemy, WeaponType, SkillType, BattleRole, Quest, SocialAppointment, SimpleStudent, MilitaryRank, MercenaryRank, DispatchMission, BlacksmithRank } from '../types';
import { formatMonthDay } from './gameTimeService';
import { executeMilestoneTimeEngines } from './unifiedTimeEngineManager';
import { processMercenaryDailyEvents } from './MercenaryTimeEngine';
import { processMilitaryDailyEvents } from './MilitaryTimeEngine';
import { processSchoolAdvancement, processSchoolDailyEvents, processClassmatesGrowth } from './SchooltimeEngine';
import { processNpcLifeEvents, createRivalEnemies } from './npcLifeEngine';
import { processNaturalDeath } from './deathTimeEngine';
import { updateNationalDiplomacy } from './diplomacyService';
import { checkForMagyeRevolt } from '../magyeInternalWarSystem';
import { checkForDivineInvasion } from '../Magyedivinewarsystem';
import { triggerTempleDefense, calculateTempleMajesty } from '../templedefensesystem';
import { isMessengerJob } from '../messengerofgodvisual';
import { NATION_NAMES, START_DATE, WORLD_GEOGRAPHY, WEAPON_TYPE_KOREAN, MINE_SPECIALIZATIONS, INITIAL_BASE } from '../constants';
import { NATION_LEADERS } from '../worldData';
import { NATION_THEMES, HUNT_LEVEL_BANDS, getMonsterPoolForBand } from '../monsterfield';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { addDays, generateName, getBaseDailyFoodConsumption, getYear, calculateAgeFromYear, calculateFinalStats, generateCompanionStats, updateSocialNetworkGrowth, generateProceduralEnemy, getRequiredExp, getStatPointsPerLevel, addMasteryExp, getPersonLocation, generateEnemyStats } from '../utils';
import { processInterCompanionEvents, processCohousingEvents, cleanInvalidBondSkills, checkCompanionCouplesBreakup } from './relationService';
import { checkAndTriggerBurnoutEvent, checkAndTriggerJealousyEvent, checkAndTriggerDateEvent, checkAndTriggerBaseEvent, checkAndTriggerBreakupEvent } from './relationshipEventService';
import { syncAllSiblingRelations } from './siblingService';
import { processDivineDailyEvents } from './DivineTimeEngine';
import { processBreederAutoCare } from './monsterGrowth';
import { advanceChildAcademyTraining } from './childAcademyService';
import { generateBlackMarketInventory } from '../ItemData';
import { getCombatTrainingEfficiencyBonus, getUnifiedCombatTrainingData, syncUnifiedCombatTrainingToCharacter } from './trainingService';
import { getReducedMpCostOnLevelUp } from './skillMpService';
import { sanitizeCharacterStudentJobsWithLogs } from './npcJobSanitizer';
import { checkTitleUnlocks, TITLES } from '../titles';
import { checkTimeEngineCompanionClassLiberation } from './companionGrowthService';
import { generateInstantDungeonBoss } from '../data/instantDungeonBoss';
import { generateInstantDungeonMonster } from '../data/instantDungeonMonster';
import { resolveIncidentConflicts, registerAmbush } from './incidentQueue';

export type MilestoneType = 'midnight' | 'morning' | 'noon' | 'evening';

export interface MilestoneDef {
    type: MilestoneType;
    minute: number; // 0, 480, 720, 1080
    timeLabel: string;
    title: string;
}

export interface MilestoneOccurrence {
    type: MilestoneType;
    minute: number;
    dayIndex: number;
    timeLabel: string;
    title: string;
}

export function isLastDayOfMonth(dateStr: string): boolean {
    if (!dateStr || !dateStr.includes('-')) return false;
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return false;
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const lastDay = new Date(year, month, 0).getDate();
    return day === lastDay;
}

export const MILESTONES: MilestoneDef[] = [
    { type: 'midnight', minute: 0, timeLabel: '00:00', title: '자정 인연 및 일자 변경' },
    { type: 'morning', minute: 480, timeLabel: '08:00', title: '아침 영지 결산 및 자원 수확' },
    { type: 'noon', minute: 720, timeLabel: '12:00', title: '정오 용병단 및 군사 동향' },
    { type: 'evening', minute: 1080, timeLabel: '18:00', title: '저녁 세계 외교 및 정세' }
];

export function getPassedMilestones(startMinutes: number, minutesToAdd: number): MilestoneOccurrence[] {
    const passed: MilestoneOccurrence[] = [];
    const endMinutes = startMinutes + minutesToAdd;

    for (let m = startMinutes + 1; m <= endMinutes; m++) {
        const modM = ((m % 1440) + 1440) % 1440;
        const matched = MILESTONES.find(ms => ms.minute === modM);
        if (matched) {
            const dayIndex = Math.floor(m / 1440);
            passed.push({
                type: matched.type,
                minute: m,
                dayIndex,
                timeLabel: matched.timeLabel,
                title: matched.title
            });
        }
    }

    return passed;
}

/**
 * 1. [00:00 자정] 마일스톤:
 * - 날짜 1일 증가 및 일일 초기화 (기지 일일 카운트, 긴급 알람, 일일 상점 등)
 * - 학교 진급/졸업 판정
 * - 임신 및 출산 예정일 체크
 * - 약속 기한 검사
 * - 동료 교류 시뮬레이션 (대화, 동거, 썸/연인, 결별, 데이트/질투/번아웃 이벤트)
 * - 신의 사자 일일 이벤트
 * - 인연/학생 성장, NPC 생애 주기, 노화/자연사
 * - 암시장 재고 갱신
 * - 야간 기습 및 라이벌 결투 체크
 */
const isRomanceLog = (msg: string) => /연인|연애|사랑|데이트|질투|고백|결혼|썸|권태기|짝사랑|이별|약혼|\[연인 서신\]|\[연인\]/i.test(msg);

const extractAlertTitle = (msg: string, fallbackTitle: string = "종합 소식"): string => {
    if (!msg) return fallbackTitle;
    const match = msg.match(/^\[(.*?)\]/);
    if (match && match[1]) {
        return match[1].trim();
    }
    const anyMatch = msg.match(/\[(.*?)\]/);
    if (anyMatch && anyMatch[1]) {
        return anyMatch[1].trim();
    }
    return fallbackTitle;
};

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

export function processMidnightMilestone(
    character: Character,
    options?: { isDungeonOrCombat?: boolean }
): { updatedCharacter: Character; logs: string[]; dailyReport?: DailyReportData; toastNotice?: string; hasBufferedReport?: boolean } {
    let charCopy: Character = { ...character };
    const logs: string[] = [];

    const prevDate = charCopy.currentDate || '2000-03-02';
    const nextDate = addDays(prevDate, 1);
    charCopy.currentDate = nextDate;

    // 기지 일일 초기화
    if (charCopy.base) {
        charCopy.base = {
            ...charCopy.base,
            lastDailyReset: nextDate,
            dailyCounts: {},
            urgentAlarms: []
        };
    }

    const prevYear = getYear(prevDate);
    const nextYear = getYear(nextDate);

    // 1-0-1. 연도 변경 시 나이 및 연간 경제/안보 시뮬레이션
    if (prevYear !== nextYear) {
        const updateAge = (entity: any) => {
            if (entity && entity.birthYear !== undefined) {
                entity.age = calculateAgeFromYear(entity.birthYear, nextYear);
            }
        };
        updateAge(charCopy);
        (charCopy.companions || []).forEach(updateAge);
        (charCopy.inactiveCompanions || []).forEach(updateAge);
        logs.push(`[시스템] ${nextYear}년 새해가 밝았습니다. 모두가 한 살 더 나이를 먹었습니다.`);

        // 속국 이자 계산
        if (charCopy.militaryData?.diplomacy) {
            Object.keys(charCopy.militaryData.diplomacy).forEach(nation => {
                const rel = charCopy.militaryData!.diplomacy![nation];
                if (rel && rel.vassalDebt) {
                    rel.vassalDebt.gold = Math.floor(rel.vassalDebt.gold * 1.2);
                    logs.push(`[경제] ${nation}의 미납 조공에 연체 이자가 붙었습니다.`);
                }
            });
        }

        // 마계 지배지 연간 공포도 점검
        if (charCopy.magyeDominions) {
            Object.entries(charCopy.magyeDominions).forEach(([cityName, dom]: [string, any]) => {
                if (dom && dom.corruption < 1000) {
                    const decay = 1000 - dom.corruption;
                    const execCount = dom.personnel?.executionerIds?.length || 0;
                    const reduction = 1.0 - (execCount * 0.3);
                    const finalDecay = Math.floor(decay * reduction);
                    dom.fear = Math.max(0, (dom.fear || 0) - finalDecay);
                    if (finalDecay > 0) {
                        logs.push(`[마계 통치] ${cityName}의 타락도가 낮아 주민들의 공포심이 ${finalDecay}만큼 수그러들었습니다.`);
                    }
                }
            });
        }
    }

    // 1-0. 역할 숙련도 유지 및 감소 시스템 (Role Proficiency Decay)
    try {
        const processRoleProficiencyDecay = (entity: Character | Companion, isPlayer: boolean, isInActiveParty: boolean) => {
            if (!entity.roleProficiency) return;
            if (!entity.roleInactivityDays) entity.roleInactivityDays = {};

            const roles = [BattleRole.TANKER, BattleRole.DEALER, BattleRole.SUPPORTER];
            roles.forEach(role => {
                const currentProf = entity.roleProficiency?.[role] || 0;
                if (currentProf <= 0) return;

                const isCurrentlyActiveRole = isPlayer 
                    ? (entity.battleRole === role)
                    : (isInActiveParty && entity.battleRole === role);

                if (isCurrentlyActiveRole) {
                    entity.roleInactivityDays![role] = 0;
                } else {
                    const currentInactiveDays = (entity.roleInactivityDays![role] || 0) + 1;
                    entity.roleInactivityDays![role] = currentInactiveDays;

                    if (currentInactiveDays >= 30 && currentInactiveDays % 10 === 0) {
                        const newProf = Math.max(0, currentProf - 1);
                        entity.roleProficiency![role] = newProf;

                        if (currentProf >= 100 && newProf < 100) {
                            logs.push(`[⚠️ 역할 숙련도 하락] ${entity.name}의 [${role}] 역할 숙련도가 장기 미수행(${currentInactiveDays}일)으로 인해 하락했습니다! (${currentProf} ➔ ${newProf}/100 / 전술 역할 해제)`);
                            if (entity.battleRole === role) {
                                entity.battleRole = BattleRole.NONE;
                            }
                        } else if (newProf > 0 && newProf % 10 === 0) {
                            logs.push(`[역할 숙련도 하락] ${entity.name}의 [${role}] 역할 숙련도가 미수행 지속으로 ${newProf}/100으로 하락했습니다.`);
                        }
                    }
                }
            });
        };

        processRoleProficiencyDecay(charCopy, true, true);
        (charCopy.companions || []).forEach(comp => processRoleProficiencyDecay(comp, false, true));
        (charCopy.inactiveCompanions || []).forEach(comp => processRoleProficiencyDecay(comp, false, false));
    } catch (e) {
        console.error('Role proficiency decay error:', e);
    }

    // 1-1. 학교 3월 2일 진급/졸업 판정 (통합 타임 엔진 레지스트리에서 일괄 관리)
    // schoolAdvancementEngine이 midnight 슬롯 priority 10으로 실행됨

    // 1-2. 임신 및 출산 예정일 체크
    try {
        if (charCopy.pregnancy?.isPregnant && nextDate >= (charCopy.pregnancy.dueDate || '')) {
            charCopy.pregnancy.isPregnant = false;
            logs.push(`[경사] 축하합니다! 산모와 아기가 모두 건강하게 새 생명이 세상에 태어났습니다!`);
        }
        if (charCopy.companions) {
            charCopy.companions.forEach(comp => {
                if (comp.pregnancy?.isPregnant && nextDate >= (comp.pregnancy.dueDate || '')) {
                    comp.pregnancy.isPregnant = false;
                    logs.push(`[경사] 동료 '${comp.name}'이(가) 무사히 출산하여 새 생명을 맞이했습니다!`);
                }
            });
        }
    } catch (e) {
        console.error('Pregnancy check error:', e);
    }

    // 1-3. 약속 기한 검사 및 미이행 파기 처리
    try {
        if (charCopy.socialAppointments && charCopy.socialAppointments.length > 0) {
            charCopy.socialAppointments.forEach(appt => {
                if (appt.status === 'pending' && appt.appointmentDate && nextDate > appt.appointmentDate) {
                    appt.status = 'missed';
                    const targetName = appt.targetName || '인연';
                    let found = false;

                    if (charCopy.socialNetwork) {
                        const npc = charCopy.socialNetwork.find(n => n && n.id === appt.targetId);
                        if (npc) {
                            npc.affection = Math.max(-100, (npc.affection || 0) - 15);
                            found = true;
                        }
                    }
                    if (!found && charCopy.companions) {
                        const comp = [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])].find(c => c && c.id === appt.targetId);
                        if (comp) {
                            comp.affection = Math.max(-100, (comp.affection || 0) - 15);
                        }
                    }
                    logs.push(`[약속 파기] ${targetName}님과의 약속 일자(${appt.appointmentDate})가 지나 약속을 지키지 못했습니다. 호감도가 15 하락합니다.`);
                }
            });
        }
    } catch (e) {
        console.error('Appointments check error:', e);
    }

    // 1-4. [동료 교류 시뮬레이션]
    try {
        const totalComps = (charCopy.companions?.length || 0) + (charCopy.inactiveCompanions?.length || 0);
        if (totalComps > 0) {
            const { updatedChar: relChar, eventLogs: relLogs } = processInterCompanionEvents(charCopy, 1);
            charCopy = relChar;
            relLogs.forEach(l => logs.push(l));

            const { updatedChar: houseChar, eventLogs: houseLogs } = processCohousingEvents(charCopy, 1);
            charCopy = houseChar;
            houseLogs.forEach(l => logs.push(l));

            const companionBreakupRes = checkCompanionCouplesBreakup(charCopy, 1);
            charCopy = companionBreakupRes.updatedChar;
            logs.push(...companionBreakupRes.eventLogs);

            charCopy = cleanInvalidBondSkills(charCopy);
            charCopy = syncAllSiblingRelations(charCopy).updatedChar;

            if (!charCopy.pendingChoiceEvent && !options?.isDungeonOrCombat) {
                const breakupEv = checkAndTriggerBreakupEvent(charCopy);
                if (breakupEv) {
                    charCopy.pendingChoiceEvent = breakupEv;
                    logs.push(`[이별 위기] 호감도가 낮아진 연인이 당신에게 결별을 통보했습니다!`);
                } else {
                    const burnoutEv = checkAndTriggerBurnoutEvent(charCopy);
                    if (burnoutEv) {
                        charCopy.pendingChoiceEvent = burnoutEv;
                        logs.push(`[관계 시련] 장기 교제 중인 연인과의 권태기 이벤트가 발생했습니다!`);
                    } else if (Math.random() < 0.05) {
                        const jealousyEv = checkAndTriggerJealousyEvent(charCopy);
                        if (jealousyEv) {
                            charCopy.pendingChoiceEvent = jealousyEv;
                            logs.push(`[질투 소동] 두 연인 사이의 묘한 신경전과 질투 이벤트가 발생했습니다!`);
                        }
                    } else if (Math.random() < 0.15) {
                        const dateEv = checkAndTriggerDateEvent(charCopy);
                        if (dateEv) {
                            charCopy.pendingChoiceEvent = dateEv;
                            logs.push(`[달콤한 데이트] 연인이 당신과의 소중한 데이트를 제안했습니다!`);
                        }
                    } else if (Math.random() < 0.20) {
                        const baseEv = checkAndTriggerBaseEvent(charCopy);
                        if (baseEv) {
                            charCopy.pendingChoiceEvent = baseEv;
                            logs.push(`[기지 소동] 기지에 거주하는 동료들 사이에서 흥미로운 소동이 발생했습니다!`);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Companion interaction error:', e);
    }

    // 1-5. 자정 등록 타임 엔진 통합 일괄 실행 (신격, 학교 진급, 인맥 성장, 엔피시 생애, 자연사/수명 등)
    try {
        const nextParts = nextDate.split('-');
        const nextMonth = parseInt(nextParts[1], 10) || 3;
        const nextDay = parseInt(nextParts[2], 10) || 2;
        const midnightEnginesRes = executeMilestoneTimeEngines('midnight', {
            character: charCopy,
            currentDate: nextDate,
            prevDate,
            nextDate,
            yearNum: nextYear,
            monthNum: nextMonth,
            dayNum: nextDay,
            daysPassed: 1,
            milestone: 'midnight',
            logs,
            criticalAlerts: [],
            options
        });
        charCopy = midnightEnginesRes.updatedCharacter;
        if (midnightEnginesRes.logs && midnightEnginesRes.logs.length > 0) {
            logs.push(...midnightEnginesRes.logs);
        }
    } catch (e) {
        console.error('Midnight unified time engines error:', e);
    }

    // 1-6-1. 자녀 성장 시뮬레이션 (매년 3월 2일 판정)
    try {
        if (prevDate < `${prevYear}-03-02` && nextDate >= `${prevYear}-03-02`) {
            const allFamily = [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])];
            const children = allFamily.filter(c => c && (c.classType?.includes('자녀') || c.classType?.includes('Child')));

            children.forEach(child => {
                const age = nextYear - (child.birthYear || nextYear);
                const growthMultiplier = child.isBlessed ? 2 : 1;
                
                child.level += 1;
                child.stats.str += 5 * growthMultiplier; 
                child.stats.int += 5 * growthMultiplier; 
                child.stats.def += 5 * growthMultiplier; 
                child.stats.agi += 5 * growthMultiplier; 
                child.stats.ctrl += 5 * growthMultiplier;
                child.stats.maxHp += 100 * growthMultiplier; 
                child.stats.hp = child.stats.maxHp;

                if (age === 11) {
                    logs.push(`[가족] 자녀 '${child.name}'이(가) 어느덧 11세가 되어 초급 학교에 입학할 나이가 되었습니다. '나의 집'에서 진로를 상담해주십시오.`);
                } else if (age === 14) {
                    logs.push(`[가족] 자녀 '${child.name}'이(가) 중급 학교 과정에 진입할 시기입니다.`);
                } else if (age === 17) {
                    logs.push(`[가족] 자녀 '${child.name}'이(가) 고급 학교 과정에 진입했습니다. 곧 성인이 되겠군요.`);
                } else if (age === 20) {
                    logs.push(`[가족] 성인식 알림: 자녀 '${child.name}'이(가) 20세 성인이 되었습니다! 이제 정식 동료로서 모든 활동이 가능합니다.`);
                    
                    if (child.childData?.parentNames) {
                        const parents = allFamily.filter(f => child.childData?.parentNames?.includes(f.name));
                        const isPlayerParent = child.childData.parentNames.includes(charCopy.name);
                        if (isPlayerParent) parents.push(charCopy as any);

                        let inheritedMastery = 0;
                        parents.forEach(p => {
                            if (p.job === JobType.BLACKSMITH) {
                                inheritedMastery += Math.floor((p.blacksmithMastery || 0) * 0.2);
                            }
                        });

                        if (inheritedMastery > 0) {
                            child.blacksmithMastery = (child.blacksmithMastery || 0) + inheritedMastery;
                            if (!child.blacksmithRank) child.blacksmithRank = BlacksmithRank.BEGINNER;
                            logs.push(`[가업 승계] '${child.name}'이(가) 성인이 되어 부모의 기술을 이어받았습니다. (대장장이 숙련도 ${inheritedMastery} 계승)`);
                        }
                    }
                }

                if (Math.random() < 0.2) {
                    const episodes = [
                        `'${child.name}'이(가) 검술 훈련 도중 비범한 재능을 보였다는 소식입니다. (STR +10)`,
                        `'${child.name}'이(가) 고대 마법 서적을 읽으며 깊은 명상에 빠졌습니다. (INT +10)`,
                        `'${child.name}'이(가) 시장에서 부모님을 위한 작은 선물을 준비하며 호감도가 상승했습니다.`,
                        `'${child.name}'이(가) 동네 친구들과의 모의 대결에서 압승을 거두어 명성을 쌓기 시작했습니다.`
                    ];
                    const selected = episodes[Math.floor(Math.random() * episodes.length)];
                    logs.push(`[성장] ${selected}`);
                    if (selected.includes('STR')) child.stats.str += 10 * growthMultiplier;
                    if (selected.includes('INT')) child.stats.int += 10 * growthMultiplier;
                    child.affection = Math.min(100, child.affection + 5);
                }
            });

            // 동료의 자식 성장 시뮬레이션
            const companionChildren = allFamily.filter(c => c && c.classType === '동료의 자식');
            companionChildren.forEach(child => {
                const age = nextYear - (child.birthYear || nextYear);
                const growthMultiplier = child.isBlessed ? 2 : 1;
                child.level += 1;
                child.stats.str += 3 * growthMultiplier; 
                child.stats.int += 3 * growthMultiplier; 
                child.stats.def += 3 * growthMultiplier; 
                child.stats.agi += 3 * growthMultiplier; 
                child.stats.ctrl += 3 * growthMultiplier;
                child.stats.maxHp += 80 * growthMultiplier; 
                child.stats.hp = child.stats.maxHp;

                if (age === 20) {
                    logs.push(`[성장] 동료의 아이 '${child.name}'이(가) 어느덧 20세 성인이 되었습니다! 늠름한 전사의 기운이 느껴집니다.`);
                }
            });

            if (charCopy.socialNetwork) {
                charCopy.socialNetwork.forEach(npc => {
                    const isNpcChild = npc.classType?.includes('자식') || npc.childData?.parentNames;
                    if (isNpcChild && !npc.isPurged) {
                        npc.level += 1;
                        if (npc.stats) {
                            npc.stats.str = (npc.stats.str || 0) + 4;
                            npc.stats.int = (npc.stats.int || 0) + 4;
                            npc.stats.def = (npc.stats.def || 0) + 4;
                            npc.stats.agi = (npc.stats.agi || 0) + 4;
                            npc.stats.hp = (npc.stats.hp || 100) + 80;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Child growth error:', e);
    }

    // 1-7. 칭호 해금 체크
    try {
        const playerNewUnlocks = checkTitleUnlocks(charCopy, charCopy);
        if (playerNewUnlocks && playerNewUnlocks.length > 0) {
            charCopy.availableTitles = [...(charCopy.availableTitles || []), ...playerNewUnlocks];
            playerNewUnlocks.forEach(titleId => {
                const title = TITLES[titleId];
                if (title) logs.push(`[칭호 획득] 새로운 칭호 '${title.name}'을(를) 획득했습니다!`);
            });
        }
        if (charCopy.companions) {
            charCopy.companions.forEach(comp => {
                const compNewUnlocks = checkTitleUnlocks(comp, charCopy);
                if (compNewUnlocks && compNewUnlocks.length > 0) {
                    comp.availableTitles = [...(comp.availableTitles || []), ...compNewUnlocks];
                    compNewUnlocks.forEach(titleId => {
                        const title = TITLES[titleId];
                        if (title) logs.push(`[칭호 획득] 동료 '${comp.name}'이(가) 새로운 칭호 '${title.name}'을(를) 획득했습니다!`);
                    });
                }
            });
        }
    } catch (e) {
        console.error('Title unlock check error:', e);
    }

    // 1-8. 동료 잠재력/클래스 해방 각성 체크
    try {
        if (charCopy.companions) {
            charCopy.companions = charCopy.companions.map(comp => {
                const libRes = checkTimeEngineCompanionClassLiberation(comp);
                if (libRes.evolved && libRes.log) logs.push(libRes.log);
                return libRes.updated;
            });
        }
        if (charCopy.inactiveCompanions) {
            charCopy.inactiveCompanions = charCopy.inactiveCompanions.map(comp => {
                const libRes = checkTimeEngineCompanionClassLiberation(comp);
                if (libRes.evolved && libRes.log) logs.push(libRes.log);
                return libRes.updated;
            });
        }
    } catch (e) {
        console.error('Companion class liberation error:', e);
    }

    // 1-9. 매월 1일 월간 결산 (암시장 갱신, 인스턴트 던전 생성, 마계 세금)
    try {
        if (nextDate.endsWith('-01')) {
            // 암시장 갱신
            (charCopy as any).blackMarketItems = generateBlackMarketInventory();
            logs.push(`[암시장] 매월 1일 어둠의 상인들이 새로운 희귀 물품들을 입고했습니다.`);

            // 인스턴트 던전 월간 생성
            if (!charCopy.instantDungeons) charCopy.instantDungeons = [];
            const prevDungeonCount = charCopy.instantDungeons.length;
            charCopy.instantDungeons = charCopy.instantDungeons.filter(d => {
                const partsD = (d.createdAt || '').split('-');
                const partsCur = nextDate.split('-');
                if (partsD.length >= 2 && partsCur.length >= 2) {
                    const diffM = (parseInt(partsCur[0]) - parseInt(partsD[0])) * 12 + (parseInt(partsCur[1]) - parseInt(partsD[1]));
                    return diffM < 1;
                }
                return true;
            });
            if (charCopy.instantDungeons.length < prevDungeonCount) {
                logs.push(`[던전] 마력이 흩어지며 기한이 지난 일부 인스턴트 던전이 소멸했습니다.`);
            }

            const DUNGEON_GROUPS = [
                ["아시아", "오세아니아", "마계", "아비살론"],
                ["북아메리카", "남아메리카", "실바나르"],
                ["유럽", "아프리카", "페랄디아"]
            ];
            let newDungeonsCount = 0;
            DUNGEON_GROUPS.forEach(group => {
                let groupNations: { continent: string; nation: string }[] = [];
                group.forEach(continentName => {
                    if (WORLD_GEOGRAPHY[continentName]) {
                        Object.keys(WORLD_GEOGRAPHY[continentName]).forEach(nation => {
                            groupNations.push({ continent: continentName, nation });
                        });
                    }
                });
                if (groupNations.length === 0) return;
                for (let k = 0; k < 2; k++) {
                    const randomEntry = groupNations[Math.floor(Math.random() * groupNations.length)];
                    const { nation: randomNation } = randomEntry;
                    const nationData = WORLD_GEOGRAPHY[randomEntry.continent][randomNation];
                    if (!nationData || !nationData.capital) continue;
                    const allCities = [nationData.capital, ...nationData.cities];
                    const city = allCities[Math.floor(Math.random() * allCities.length)];

                    const { boss, loot } = generateInstantDungeonBoss();
                    const monsters = [];
                    for (let m = 0; m < 3; m++) {
                        const monsterLevel = Math.floor((boss.level || 500) * (0.5 + Math.random() * 0.3));
                        monsters.push(generateInstantDungeonMonster(monsterLevel));
                    }
                    const newDungeon: any = {
                        id: `inst_dungeon_${nextDate}_${city}_${k}`,
                        city,
                        nation: randomNation,
                        name: `${boss.name}의 둥지`,
                        description: `도시 외곽에서 발견된 ${boss.name}의 은신처입니다. (권장 레벨: ${boss.level})`,
                        boss,
                        monsters,
                        loot,
                        level: boss.level,
                        createdAt: nextDate.substring(0, 7)
                    };
                    if (!charCopy.instantDungeons!.find(d => d.city === city)) {
                        charCopy.instantDungeons!.push(newDungeon);
                        newDungeonsCount++;
                    }
                }
            });
            if (newDungeonsCount > 0) {
                logs.push(`[던전] 세계 각지에서 ${newDungeonsCount}개의 새로운 인스턴트 던전이 출현했습니다!`);
            }

            // 인연의 먼저 연락 및 약속 제안 (호감도 높음: 차와 담소 / 호감도 낮음: 대결 요청)
            if (charCopy.socialNetwork && charCopy.socialNetwork.length > 0) {
                const existingPendingIds = new Set(
                    (charCopy.socialAppointments || [])
                        .filter(a => a.status === 'pending')
                        .map(a => a.targetId)
                );
                const companionIds = new Set(
                    [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])].map(c => c.id)
                );

                const eligibleNetwork = (charCopy.socialNetwork || []).filter(
                    n => n && !existingPendingIds.has(n.id) && !companionIds.has(n.id) && !n.isPurged
                );

                if (eligibleNetwork.length > 0) {
                    // 고호감도 인연 서신 제안
                    const highAffectionNpcs = eligibleNetwork.filter(n => (n.affection || 0) >= 30);
                    if (highAffectionNpcs.length > 0 && Math.random() < 0.40) {
                        const selectedNpc = highAffectionNpcs[Math.floor(Math.random() * highAffectionNpcs.length)];
                        const daysOffset = Math.floor(Math.random() * 8) + 7;
                        const apptDate = addDays(nextDate, daysOffset);
                        const npcLoc = getPersonLocation(selectedNpc, charCopy);

                        const appt: SocialAppointment = {
                            id: `appt_npc_${selectedNpc.id}_${Date.now()}`,
                            targetId: selectedNpc.id,
                            targetName: selectedNpc.name,
                            targetVisualUrl: selectedNpc.visualUrl,
                            targetJob: selectedNpc.job || selectedNpc.classType,
                            targetClassType: selectedNpc.classType,
                            location: npcLoc,
                            district: 'Residential',
                            appointmentDate: apptDate,
                            type: 'meet',
                            status: 'pending',
                            locationType: 'inyeon',
                            affectionBonus: 8,
                            proposedBy: 'npc'
                        };

                        if (!charCopy.socialAppointments) charCopy.socialAppointments = [];
                        charCopy.socialAppointments.push(appt);
                        logs.push(`[인연의 서신] ${selectedNpc.name}님께서 반가운 인사와 함께 만남 약속(${apptDate}, ${npcLoc.nation} ${npcLoc.city})을 제안해 왔습니다.`);
                    }

                    // 저호감도 / 적대 인연 대결 도전 서신
                    const lowAffectionNpcs = eligibleNetwork.filter(n => (n.affection || 0) <= -30);
                    if (lowAffectionNpcs.length > 0 && Math.random() < 0.35) {
                        const selectedNpc = lowAffectionNpcs[Math.floor(Math.random() * lowAffectionNpcs.length)];
                        const daysOffset = Math.floor(Math.random() * 5) + 5;
                        const apptDate = addDays(nextDate, daysOffset);
                        const npcLoc = getPersonLocation(selectedNpc, charCopy);

                        const appt: SocialAppointment = {
                            id: `appt_npc_${selectedNpc.id}_${Date.now()}`,
                            targetId: selectedNpc.id,
                            targetName: selectedNpc.name,
                            targetVisualUrl: selectedNpc.visualUrl,
                            targetJob: selectedNpc.job || selectedNpc.classType,
                            targetClassType: selectedNpc.classType,
                            location: npcLoc,
                            district: 'Residential',
                            appointmentDate: apptDate,
                            type: 'duel',
                            status: 'pending',
                            locationType: 'inyeon',
                            affectionBonus: 0,
                            proposedBy: 'npc'
                        };

                        if (!charCopy.socialAppointments) charCopy.socialAppointments = [];
                        charCopy.socialAppointments.push(appt);
                        logs.push(`[도전장 서신] ${selectedNpc.name}님께서 당당하게 결투 약속(${apptDate}, ${npcLoc.nation} ${npcLoc.city})을 신청해 왔습니다!`);
                    }
                }
            }

            // 만료된 약속 정리 (2개월 지난 약속 삭제)
            if (charCopy.socialAppointments) {
                const twoMonthsAgoDate = addDays(prevDate, -60);
                charCopy.socialAppointments = charCopy.socialAppointments.filter(
                    appt => appt.status === 'pending' || (appt.appointmentDate && appt.appointmentDate >= twoMonthsAgoDate)
                );
            }

            // 마계 지배지 월간 생산성 시뮬레이션
            if (charCopy.magyeDominions) {
                Object.entries(charCopy.magyeDominions).forEach(([cityName, dom]: [string, any]) => {
                    if (dom?.personnel?.tormentorId) {
                        const tormentor = [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])].find(c => c.id === dom.personnel?.tormentorId);
                        if (tormentor) {
                            const fearGain = Math.floor(((tormentor.stats?.ctrl || 0) + (tormentor.stats?.int || 0)) * 0.0001);
                            dom.fear = (dom.fear || 0) + fearGain;
                            logs.push(`[마계 통치] ${cityName}의 고문관에 의해 주민들의 공포심이 ${fearGain}만큼 증가했습니다.`);
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Monthly refresh error:', e);
    }

    // 1-10. 기지 습격 이벤트 체크 (3.5%)
    try {
        if (charCopy.base && !charCopy.pendingBaseAttackEvent && !options?.isDungeonOrCombat) {
            if (Math.random() < 0.035) {
                const baseLvl = Math.max(1, charCopy.base.level || 1);
                const playerLvl = Math.min(Math.max(charCopy.level || 1, 1), 1000);
                const monsterLevel = Math.max(1, Math.floor(playerLvl * 0.9 + baseLvl * 2 + (Math.random() * 6 - 3)));
                const enemyPower = monsterLevel * 20 + Math.floor(Math.random() * 100);

                const band = HUNT_LEVEL_BANDS.find(b => monsterLevel >= b.levelRange[0] && monsterLevel <= b.levelRange[1]) || HUNT_LEVEL_BANDS[HUNT_LEVEL_BANDS.length - 1];
                const bandId = band.id;

                const baseCity = charCopy.base.location?.city || charCopy.currentLocation?.city;
                const baseNation = charCopy.base.location?.nation || charCopy.currentLocation?.nation || charCopy.nation || "대한민국";
                const theme = (baseCity && NATION_THEMES[baseCity]) || NATION_THEMES[baseNation] || NATION_THEMES["대한민국"] || NATION_THEMES["default"];
                const monsterPool = getMonsterPoolForBand(theme, bandId);
                
                const enemies = Array(Math.floor(Math.random() * 3) + 2).fill(null).map(() => {
                    const randomName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                    const finalName = typeof randomName === 'string' ? randomName : randomName.name;
                    return generateProceduralEnemy(monsterLevel, finalName);
                });

                charCopy.pendingBaseAttackEvent = {
                    enemies,
                    log: `[긴급] 기지에 정체불명의 적들이 습격해왔습니다! (적 추정 전투력: ${enemyPower})`,
                    enemyPower
                };
                logs.push(`[긴급] 기지에 적들이 습격해왔습니다! 방어 준비를 하십시오.`);
            }
        }
    } catch (e) {
        console.error('Base attack check error:', e);
    }

    // 1-10. 인연 타락 이벤트 (Past Bond Corruption)
    try {
        if (charCopy.socialNetwork && Array.isArray(charCopy.socialNetwork) && charCopy.socialNetwork.length > 0 && Math.random() < 0.02) {
            const potentialCriminals = charCopy.socialNetwork.filter(n => n && !n.isStaticRank);
            if (potentialCriminals.length > 0) {
                const target = potentialCriminals[Math.floor(Math.random() * potentialCriminals.length)];
                const infamyGain = Math.floor(Math.random() * 100) + 50;
                target.infamy = (target.infamy || 0) + infamyGain;
                if (target.infamy >= 300) {
                    logs.push(`[뒷골목 소문] 과거의 인연이었던 '${target.name}'이(가) 중죄를 저질러 지명수배되었다는 소문이 자자합니다.`);
                } else {
                    logs.push(`[뒷골목 소문] 과거에 알던 '${target.name}'이(가) 어두운 세계의 일에 손을 댔다는 흉흉한 소문이 들려옵니다.`);
                }
                target.affection = Math.max(-100, (target.affection || 0) - 10);
            }
        }
    } catch (e) {
        console.error('Bond corruption error:', e);
    }

    // 1-11. 야간 라이벌 결투 신청 및 원한 기습 판정 (registerAmbush 연동)
    let ambushAlert: string | undefined = undefined;
    if (!options?.isDungeonOrCombat && charCopy.socialNetwork && charCopy.socialNetwork.length > 0) {
        try {
            // 1) 영원의 라이벌 기습/결투 신청 (4%)
            const eternalRival = charCopy.socialNetwork.find(n => n && n.isEternalRival && !n.isPurged && !n.isDead);
            if (eternalRival && Math.random() < 0.04) {
                const enemiesList = createRivalEnemies(eternalRival);
                const messageIntro = `당신의 영원한 숙적 ${eternalRival.name}이(가) 정예 결사대 동료들을 이끌고 나타나 결투를 신청했습니다!`;

                if (eternalRival.rivalData) {
                    eternalRival.rivalData.totalDuelsCount = (eternalRival.rivalData.totalDuelsCount || 0) + 1;
                    eternalRival.rivalData.lastDuelDate = nextDate;
                }

                charCopy = registerAmbush(charCopy, {
                    enemies: enemiesList,
                    sourceId: eternalRival.id,
                    title: "🔥 영원의 라이벌 결투 신청!",
                    message: messageIntro
                });
                const ambushMsg = `[결투] 영원의 라이벌 '${eternalRival.name}'이(가) 정예 결사대 동료들과 함께 결투를 청해왔습니다!`;
                logs.push(ambushMsg);
                ambushAlert = ambushMsg;
            } else {
                // 2) 원한을 품은 과거 인연 기습 (3%)
                const potentialEnemies = charCopy.socialNetwork.filter(n => n && !n.isPurged && !n.isDead && (n.affection || 0) <= -60);
                if (potentialEnemies.length > 0 && Math.random() < 0.03) {
                    const target = potentialEnemies[Math.floor(Math.random() * potentialEnemies.length)];
                    const eStats = generateEnemyStats(target.level);
                    const finalHp = eStats.maxHp * 3;
                    const ambushEnemy: Enemy = {
                        name: `${target.name}`,
                        level: target.level,
                        hp: finalHp,
                        maxHp: finalHp,
                        stats: { ...eStats, hp: finalHp, maxHp: finalHp },
                        shinryokuType: target.shinryokuType || '무속성',
                        statusEffects: [],
                        description: `당신에게 원한을 품은 과거의 인연 ${target.name}이(가) 어둠 속에서 칼을 뽑았습니다!`,
                        skills: []
                    };

                    charCopy = registerAmbush(charCopy, {
                        enemies: [ambushEnemy],
                        sourceId: target.id,
                        title: "⚔️ 원한의 기습!",
                        message: `원한을 품은 ${target.name}이(가) 당신을 습격했습니다!`
                    });
                    const ambushMsg = `[위기] 원한을 품은 ${target.name}이(가) 당신을 습격했습니다!`;
                    logs.push(ambushMsg);
                    ambushAlert = ambushMsg;
                }
            }
        } catch (e) {
            console.error('Ambush registration error:', e);
        }
    }

    let toastNotice: string | undefined = undefined;
    if (ambushAlert) {
        toastNotice = ambushAlert;
    } else {
        const importantLog = logs.find(l => /데이트|질투|권태기|결별|연인|결혼|썸|사랑|동료|소동|입신양명|각성|승급|출산|경사|사망|전사/i.test(l));
        if (importantLog) {
            toastNotice = importantLog.length > 35 ? importantLog.substring(0, 32) + '...' : importantLog;
        }
    }

    let hasBufferedReport = false;
    let dailyReport: DailyReportData | undefined = undefined;

    const resObj = (charCopy.base?.resources || {}) as any;
    const currentRes = {
        food: resObj.food || 0,
        wood: resObj.wood || 0,
        stone: resObj.stone || 0,
        herbs: resObj.herbs || 0,
        iron: resObj.iron || 0,
        manaStone: resObj.manaStone || 0,
        manaCrystal: resObj.manaCrystal || 0
    };

    dailyReport = {
        days: 1,
        date: nextDate,
        totalHarvested: { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 },
        workerHarvestCount: 0,
        criticalAlerts: logs.map((msg, i) => {
            const isRomance = isRomanceLog(msg);
            const isRoutine = /동료 일상|동료 대화|동료 서신|동료 안부|동료 교류|기지 일상|파티 일상|가족 일상|가족 서신|배우자 일상|배우자 서신|기지 훈련|전투 훈련|자동 청소|수련|담소|유대|친밀|청결|하우스키퍼|남매|형제|자매/i.test(msg);
            const isThreat = !isRomance && !isRoutine && /기지 습격|기지 침공|성전 침공|적 침략|선전포고|전쟁 발발|신마 전쟁|반란|식량 고갈|식량 부족|사망|별세|비보|전멸|위급 상태|긴급 구조|과로 상태|탈진/i.test(msg);
            return {
                id: `alert_mid_${Date.now()}_${i}`,
                type: isRomance ? ('romance' as const) : isThreat ? ('urgent' as const) : ('info' as const),
                severity: isThreat ? ('warning' as const) : ('info' as const),
                title: extractAlertTitle(msg, "종합 소식"),
                message: msg
            };
        }),
        foodConsumed: 0,
        dailyFoodNeed: 0,
        baseMaintenanceFee: 0,
        currentResources: currentRes
    };

    if (options?.isDungeonOrCombat) {
        if (!charCopy.bufferedTimeSkipReports) charCopy.bufferedTimeSkipReports = [];
        charCopy.bufferedTimeSkipReports.push(dailyReport);
        hasBufferedReport = true;
        return { updatedCharacter: charCopy, logs, toastNotice, hasBufferedReport, dailyReport: undefined };
    }

    return { updatedCharacter: charCopy, logs, dailyReport, toastNotice, hasBufferedReport: false };
}

/**
 * timeEngine.ts와 100% 동일한 규칙으로 기지 및 파견, 제작소, 연금술의 중요 알림(CriticalAlert)을 종합 수집합니다.
 */
export function collectMilestoneCriticalAlerts(
    char: Character,
    curDate: string,
    allLogs: string[] = []
): CriticalAlert[] {
    const alerts: CriticalAlert[] = [];
    const base = char.base;

    // 1. 습격 및 침공 크리티컬 경보
    if (char.pendingBaseAttackEvent) {
        alerts.push({
            id: `base_attack_${Date.now()}`,
            type: 'urgent',
            title: '⚔️ [기지 습격] 적대 세력 침공 경보',
            message: char.pendingBaseAttackEvent.log || '기지에 적들이 습격해왔습니다! 방어 준비를 하십시오.',
            severity: 'critical'
        });
    }
    if ((char as any).pendingMagyeRevolt) {
        alerts.push({
            id: `revolt_${Date.now()}`,
            type: 'defense',
            title: '🔥 [마계 반란] 내부 반란군 봉기',
            message: (char as any).pendingMagyeRevolt.log || '마계 내부 세력이 반란을 일으켰습니다!',
            severity: 'critical'
        });
    }
    if ((char as any).pendingMagyeDivineWar) {
        alerts.push({
            id: `divine_war_${Date.now()}`,
            type: 'defense',
            title: '⚡ [신마 전쟁] 대침공 전쟁 발발',
            message: (char as any).pendingMagyeDivineWar.log || '전면적 침공 전쟁이 발발했습니다!',
            severity: 'critical'
        });
    }

    // 2. 식량 부족 및 잔여량 경고
    if (base && base.resources) {
        const allCompsForFood = [char, ...(char.companions || []), ...(char.inactiveCompanions || [])];
        const foodStats = getBaseDailyFoodConsumption(base, allCompsForFood as any);
        const dailyFoodNeed = foodStats.dailyFoodNeed;
        const currentFood = base.resources.food || 0;

        if (currentFood <= 0 && dailyFoodNeed > 0) {
            alerts.push({
                id: `food_shortage_${Date.now()}`,
                type: 'shortage',
                title: '⚠️ [식량 고갈] 기지 식량 완전 바닥남',
                message: `기지의 식량이 완전히 고갈되었습니다! (일일 필요량: ${dailyFoodNeed}개)\n숙소 거주 동료들이 굶주려 호감도와 충성도가 매일 하락 중입니다. 농장 수확이나 식량 조달이 시급합니다.`,
                severity: 'critical'
            });
        } else if (dailyFoodNeed > 0 && currentFood < dailyFoodNeed * 3) {
            const daysLeft = Math.floor(currentFood / dailyFoodNeed);
            alerts.push({
                id: `food_warning_3days_${Date.now()}`,
                type: 'shortage',
                title: '⚠️ [식량 부족 경고] 3일치 미만 잔여',
                message: `기지 식량 보유량(${currentFood.toLocaleString()}개)이 3일치 소비량(${(dailyFoodNeed * 3).toLocaleString()}개) 미만입니다!\n(약 ${daysLeft}일분 잔여, 일일 소비량: ${dailyFoodNeed}개/일) 동료들이 굶주리지 않도록 식량을 미리 비축하세요.`,
                severity: 'warning'
            });
        }
    }

    // 2-2. 말일 기지 유지비 사전 안내 및 부족 경고
    if (base && (base.resources || (base.level && base.level > 0)) && isLastDayOfMonth(curDate)) {
        const baseLevel = base.level || 1;
        const baseLevelFee = baseLevel * 10000;
        const validFacilities = (base.layout || []).filter(inst => inst && inst.type);
        const facilityCount = validFacilities.length;
        const facilityLevelsSum = validFacilities.reduce((sum, inst) => sum + (inst.level || 1), 0);
        const facilityFee = facilityCount * 1000 * facilityLevelsSum;
        const expectedMaintenance = baseLevelFee + facilityFee;

        if (expectedMaintenance > 0) {
            const playerMoney = char.money || 0;
            const isShortage = playerMoney < expectedMaintenance;
            const shortageAmount = expectedMaintenance - playerMoney;

            if (isShortage) {
                alerts.push({
                    id: `maintenance_shortage_${curDate}`,
                    type: 'shortage',
                    title: '🚨 [유지비 경고] 내일 월간 기지 유지비 부족',
                    message: `오늘은 이번 달의 말일(${curDate})입니다!\n내일(1일) 월간 기지 유지비로 총 ${expectedMaintenance.toLocaleString()}G가 정산될 예정이나, 현재 보유 골드(${playerMoney.toLocaleString()}G)가 ${shortageAmount.toLocaleString()}G 부족합니다!\n• 기지 기본 유지비: ${baseLevelFee.toLocaleString()}G (기지 레벨 ${baseLevel})\n• 시설 유지비: ${facilityFee.toLocaleString()}G (시설 ${facilityCount}개소, 총합 ${facilityLevelsSum}레벨)\n내일 원활한 정산을 위해 골드를 미리 확보해 주세요.`,
                    severity: 'critical'
                });
                if (!allLogs.some(l => l.includes('유지비 부족') || l.includes('내일(1일) 월간 기지 유지비'))) {
                    allLogs.push(`[기지 경보] 오늘(${curDate})은 말일입니다! 내일(1일) 월간 기지 유지비 ${expectedMaintenance.toLocaleString()}G가 정산될 예정이나 현재 소지 골드가 ${shortageAmount.toLocaleString()}G 부족합니다!`);
                }
            } else {
                alerts.push({
                    id: `maintenance_forecast_${curDate}`,
                    type: 'info',
                    title: '💰 [유지비 안내] 내일 월간 기지 유지비 정산 예정',
                    message: `오늘은 이번 달의 말일(${curDate})입니다.\n내일(1일) 아침 월간 기지 유지비로 총 ${expectedMaintenance.toLocaleString()}G가 소지 골드에서 자동 차감될 예정입니다.\n• 기지 기본 유지비: ${baseLevelFee.toLocaleString()}G (기지 레벨 ${baseLevel})\n• 시설 유지비: ${facilityFee.toLocaleString()}G (시설 ${facilityCount}개소, 총합 ${facilityLevelsSum}레벨)\n• 현재 보유 골드: ${playerMoney.toLocaleString()}G (정산 후 예상 잔액: ${(playerMoney - expectedMaintenance).toLocaleString()}G)`,
                    severity: 'info'
                });
                if (!allLogs.some(l => l.includes('월간 기지 유지비 정산 예정') || l.includes('내일(1일) 월간 기지 유지비'))) {
                    allLogs.push(`[기지 알림] 오늘(${curDate})은 말일입니다. 내일(1일) 월간 기지 유지비로 ${expectedMaintenance.toLocaleString()}G가 지출될 예정입니다. (현재 잔액: ${playerMoney.toLocaleString()}G)`);
                }
            }
        }
    }

    // 3. 파견 대원 위급 경고
    if (base?.dispatched && Array.isArray(base.dispatched)) {
        base.dispatched.forEach(m => {
            if (m && (m.status === 'Critical' || m.status === 'Difficult')) {
                const comp = [...(char.companions || []), ...(char.inactiveCompanions || [])].find(c => c && c.id === m.companionId);
                if (comp) {
                    const compName = comp.name;
                    const destName = typeof m.destination === 'string' ? m.destination : (m.destination?.city || '파견지');
                    alerts.push({
                        id: `dispatch_crit_${m.id}`,
                        type: 'dispatch',
                        title: `🚨 [파견 위급] ${compName} 위험 상태!`,
                        message: `[${destName}] 지역에 파견된 '${compName}' 대원의 미션 상태가 '${m.status}'입니다! 구조 및 지원이 필요합니다.`,
                        severity: 'critical'
                    });
                }
            }
        });
    }

    // 4. 파견 임무 완수 및 복귀 대기 알림 (원정 / 스카우트 등)
    if (base?.dispatched && Array.isArray(base.dispatched)) {
        const completedDispatches = base.dispatched.filter(m => {
            if (!m || m.missionType === 'Blacksmithing' || m.missionType === 'Alchemy' || m.missionType === 'AlchemyCrafting') return false;
            if (!m.expectedReturnDate || !curDate) return false;
            return curDate >= m.expectedReturnDate;
        });
        if (completedDispatches.length > 0) {
            alerts.push({
                id: `dispatch_completed_${completedDispatches.length}_${curDate}`,
                type: 'dispatch',
                title: `🚩 [파견 복귀] 파견 임무 완수 (${completedDispatches.length}건)`,
                message: `임무 기간을 마친 파견 대원(${completedDispatches.length}건)이 복귀를 기다리고 있습니다! [기지 - 인재 파견 / 사령부]에서 복귀 보고를 확인하십시오.`,
                severity: 'info'
            });
        }
    }

    // 5. 대장간 제작/강화 수령 대기 알림 (제작소 완성 장비)
    const blacksmithMissions = base?.dispatched?.filter(m => m && m.missionType === 'Blacksmithing') || [];
    const readyCrafts = blacksmithMissions.filter(m => {
        if (!m.expectedReturnDate || !curDate) return false;
        return curDate >= m.expectedReturnDate;
    });
    if (readyCrafts.length > 0) {
        alerts.push({
            id: `bs_ready_${readyCrafts.length}_${curDate}`,
            type: 'blacksmith',
            title: `⚒️ [대장간] 완성 장비 수령 대기 (${readyCrafts.length}건)`,
            message: `대장장이가 주문받은 장비 ${readyCrafts.length}건의 제작/강화를 완수했습니다! 대장간에서 수령하기 전까지 대기합니다.`,
            severity: 'info'
        });
    }

    // 6. 연금술 포션/시약 조제 수령 대기 알림 (연금술실 완성 물품)
    const alchemyMissions = base?.dispatched?.filter(m => m && (m.missionType === 'AlchemyCrafting' || m.missionType === 'Alchemy')) || [];
    const readyAlchemyCrafts = alchemyMissions.filter(m => {
        if (!m.expectedReturnDate || !curDate) return false;
        return curDate >= m.expectedReturnDate;
    });
    if (readyAlchemyCrafts.length > 0) {
        alerts.push({
            id: `alc_ready_${readyAlchemyCrafts.length}_${curDate}`,
            type: 'alchemy',
            title: `🧪 [연금술] 완성 시약/물품 수령 대기 (${readyAlchemyCrafts.length}건)`,
            message: `연금술사가 주문받은 포션/시약 ${readyAlchemyCrafts.length}건의 조제를 완수했습니다! 연금술실에서 수령하기 전까지 대기합니다.`,
            severity: 'info'
        });
    }

    // 7. 동료 간 연애 및 썸/결혼 소식 알림
    allLogs.forEach((log, idx) => {
        if (/\[사랑\]|\[연애\]|\[연애 축보\]|\[썸\]|\[한지붕 썸\]|\[인연 축보\]|\[연인\]|\[고백\]|\[결혼\]|\[혼인\]/i.test(log)) {
            const isFlirt = log.includes('[썸]') || log.includes('[한지붕 썸]');
            alerts.push({
                id: `romance_${idx}_${curDate}_${Date.now()}`,
                type: 'romance',
                title: isFlirt ? '💕 [동료 소식] 썸 기류 감지' : '💖 [동료 소식] 동료 연애 및 관계 발전',
                message: log,
                severity: 'info'
            });
        }
    });

    // 8. 고인 발생 알림 (동료 및 과거 인연 부고 소식)
    if (char.pendingDeceasedAlerts && Array.isArray(char.pendingDeceasedAlerts) && char.pendingDeceasedAlerts.length > 0) {
        char.pendingDeceasedAlerts.forEach((dec: any, idx: number) => {
            alerts.push({
                id: `deceased_${dec.id || idx}_${curDate}_${Date.now()}`,
                type: 'deceased',
                title: `🕊️ [부고 / 비보] 故 ${dec.name} 별세`,
                message: `${dec.originName ? `[${dec.originName}] ` : ''}${dec.name}님이 ${dec.reason || '세상을 떠났습니다'}.\n해당 국적([${dec.nation || '해당 국가'}]) 주거구역의 국립 추모원에서 고인의 넋을 기리고 조문할 수 있습니다.`,
                severity: 'critical',
                deceasedInfo: dec
            });
        });
    }

    return alerts;
}

/**
 * 2. [08:00 아침] 마일스톤:
 * - 4대 동맹 채굴 계약 (마정석, 목재, 석재, 철광석)
 * - 기지 자동 자원 수확 및 작업자 전문직 숙련도 보너스
 * - 파견 및 개인용무 미션 귀환 판정
 * - 사육사 전담배치 몬스터 자동 관리
 * - 퀘스트/미션 만료 체크
 * - 식량 소비 및 영지 유지비
 * - 신의 사자 성전 안보 및 위엄 체크
 * - 일일 보고서(DailyReportData) 생성
 */
export function processMorningMilestone(
    character: Character,
    options?: { isDungeonOrCombat?: boolean }
): { updatedCharacter: Character; logs: string[]; dailyReport?: DailyReportData; toastNotice?: string; hasBufferedReport?: boolean } {
    let charCopy: Character = { ...character };
    const logs: string[] = [];
    const curDate = charCopy.currentDate || '2000-03-02';

    let dailyReport: DailyReportData | undefined = undefined;
    let hasBufferedReport = false;
    let toastNotice: string | undefined = undefined;

    // 2-1. 퀘스트/미션 만료 체크
    try {
        if (charCopy.mercenaryData && Array.isArray(charCopy.mercenaryData.activeQuests)) {
            const expired = charCopy.mercenaryData.activeQuests.filter(q => q && q.expiryDate && q.expiryDate < curDate);
            if (expired.length > 0) {
                charCopy.mercenaryData.activeQuests = charCopy.mercenaryData.activeQuests.filter(q => !(q && q.expiryDate && q.expiryDate < curDate));
                logs.push(`[용병단 알림] 기한이 만료된 의뢰 ${expired.length}건이 자동 파기되었습니다.`);
            }
        }
        if (charCopy.militaryData && Array.isArray(charCopy.militaryData.activeMissions)) {
            const expired = charCopy.militaryData.activeMissions.filter(q => q && q.expiryDate && q.expiryDate < curDate);
            if (expired.length > 0) {
                charCopy.militaryData.activeMissions = charCopy.militaryData.activeMissions.filter(q => !(q && q.expiryDate && q.expiryDate < curDate));
                logs.push(`[군사 작전 알림] 작전 기한이 만료된 군사 임무 ${expired.length}건이 파기되었습니다.`);
            }
        }
    } catch (e) {
        console.error('Quest expiry check error:', e);
    }

    // 2-2. 파견 및 작업 상태 체크 (복귀 처리)
    try {
        const dispatches = (charCopy as any).dispatches;
        if (Array.isArray(dispatches) && dispatches.length > 0) {
            const remainingDispatches: any[] = [];
            dispatches.forEach((mission: any) => {
                if (mission && curDate >= (mission.expectedReturnDate || '')) {
                    const comp = [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])].find(c => c && c.id === mission.companionId);
                    if (comp) {
                        logs.push(`[파견 복귀] 파견 임무를 떠났던 '${comp.name}'이(가) 무사히 기지로 귀환했습니다.`);
                    }
                } else if (mission) {
                    remainingDispatches.push(mission);
                }
            });
            (charCopy as any).dispatches = remainingDispatches;
        }
    } catch (e) {
        console.error('Dispatch return check error:', e);
    }

    // 2-3. 아침 등록 타임 엔진 통합 일괄 실행 (사육사 몬스터 케어, 동료 클래스 해금 등)
    try {
        const morningEnginesRes = executeMilestoneTimeEngines('morning', {
            character: charCopy,
            currentDate: curDate,
            yearNum: parseInt(curDate.split('-')[0], 10) || 2000,
            monthNum: parseInt(curDate.split('-')[1], 10) || 3,
            dayNum: parseInt(curDate.split('-')[2], 10) || 2,
            daysPassed: 1,
            milestone: 'morning',
            logs,
            criticalAlerts: [],
            options
        });
        charCopy = morningEnginesRes.updatedCharacter;
        if (morningEnginesRes.logs && morningEnginesRes.logs.length > 0) {
            logs.push(...morningEnginesRes.logs);
        }
    } catch (e) {
        console.error('Morning unified time engines error:', e);
    }

    // 2-3-1. 유년 서당(영재 학당) 스승 지도 자동 훈련 일일 정산
    try {
        const academyRes = advanceChildAcademyTraining(charCopy, true);
        charCopy = academyRes.updatedCharacter;
        if (academyRes.logs.length > 0) {
            logs.push(...academyRes.logs);
        }
    } catch (e) {
        console.error('Child academy morning training error:', e);
    }

    // 2-4. 기지 정밀 자동 수확 시스템 (08:00 Morning Milestone 결산 - timeEngine과 100% 일치)
    const base = charCopy.base;
    const baseLayout = base?.layout || [];
    const allCompsForWork: any[] = [charCopy, ...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])];
    
    let totalHarvested = {
        food: 0,
        wood: 0,
        stone: 0,
        herbs: 0,
        iron: 0,
        manaStone: 0,
        manaCrystal: 0,
        silver_ore: 0,
        gold_ore: 0,
        ruby: 0,
        sapphire: 0,
        emerald: 0,
        diamond: 0,
        holy_stone: 0
    };

    let foodNeed = 20;
    let maintenance = 0;

    if (base && base.resources && (baseLayout.length > 0 || (base.level && base.level > 0))) {
        base.resources = { ...base.resources };
        const dailyHarvestLogs: string[] = [];

        // 기지 유지비 체납 상태에 따른 시설 생산 효율 산정
        let yieldMultiplier = 1.0;
        if (base.isFacilitySuspended) {
            yieldMultiplier = 0;
            dailyHarvestLogs.push(`[영지 시설 가동 중단] 기지 유지비 장기 체납(3개월 이상)으로 모든 영지 시설의 가동 및 자원 수확이 전면 중단되었습니다.`);
        } else if (base.overdueMonths === 2) {
            yieldMultiplier = 0.25;
            dailyHarvestLogs.push(`[영지 체납 2단계] 기지 유지비 2개월 연속 체납으로 시설 생산량이 25%로 급감하여 수확됩니다.`);
        } else if (base.overdueMonths === 1) {
            yieldMultiplier = 0.5;
            dailyHarvestLogs.push(`[영지 체납 1단계] 기지 유지비 체납으로 시설 생산량이 50%로 감소하여 수확됩니다.`);
        }

        // 1-1. 농장 자동 수확 (가동 중단 시 건너뜀)
        if (yieldMultiplier > 0) {
            const farmInstances = baseLayout.filter(inst => inst && inst.type === 'farm');
            farmInstances.forEach(inst => {
                const workerIds = base.multiAssignments?.[inst.id] || (base.assignments?.[inst.id] ? [base.assignments[inst.id]] : []);
                workerIds.forEach(workerId => {
                    const worker = allCompsForWork.find(c => c && c.id === workerId);
                    if (!worker) return;

                    const farmLv = inst.level || 1;
                    const workerStats = calculateFinalStats(worker).finalStats;
                    
                    const farmingMastery = worker.professions?.farming || { level: 1, exp: 0, maxExp: 100 };
                    const masteryBonus = 1 + (farmingMastery.level * 0.03); 
                    const failureChance = Math.max(0.01, 0.12 - farmingMastery.level * 0.005);

                    if (Math.random() < failureChance) {
                        dailyHarvestLogs.push(`[농장] ${worker.name}이(가) 서툴러서 '${inst.id}'의 수확에 실패했습니다.`);
                    } else {
                        const agiBonus = Math.floor(workerStats.agi * (0.01 + farmingMastery.level * 0.001));
                        const wisBonus = Math.floor(workerStats.wis * (0.02 + farmingMastery.level * 0.002));

                        const baseYield = Math.floor(Math.max(1, farmLv + agiBonus) * masteryBonus);
                        const totalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier));
                        const woodYield = Math.max(1, Math.floor(totalYield * 2));
                        const herbYield = Math.max(1, Math.floor(((farmLv * 2) + wisBonus) * masteryBonus * yieldMultiplier));

                        base.resources.food = (base.resources.food || 0) + totalYield;
                        base.resources.wood = (base.resources.wood || 0) + woodYield;
                        base.resources.stone = (base.resources.stone || 0) + totalYield;
                        base.resources.herbs = (base.resources.herbs || 0) + herbYield;

                        totalHarvested.food += totalYield;
                        totalHarvested.wood += woodYield;
                        totalHarvested.stone += totalYield;
                        totalHarvested.herbs += herbYield;

                    if (worker.job === JobType.FARMER) {
                        if (!worker.professions) worker.professions = {};
                        if (!worker.professions.farming) worker.professions.farming = { level: 1, exp: 0, maxExp: 100 };
                        
                        const mastery = worker.professions.farming;
                        const oldLevel = mastery.level;
                        mastery.exp += 15 + farmLv * 5;
                        while (mastery.exp >= mastery.maxExp) {
                            mastery.exp -= mastery.maxExp;
                            mastery.level += 1;
                            mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                        }
                        
                        if (mastery.level > oldLevel) {
                            let jobTitle = "견습 농부";
                            if (mastery.level >= 100) jobTitle = '전설 농부';
                            else if (mastery.level >= 80) jobTitle = '명인 농부';
                            else if (mastery.level >= 50) jobTitle = '장인 농부';
                            else if (mastery.level >= 20) jobTitle = '숙련 농부';
                            else if (mastery.level >= 10) jobTitle = '일반 농부';
                            
                            const baseClass = worker.finalClassName || worker.lastClassName || worker.secondClassName || worker.firstClassName;
                            worker.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                            dailyHarvestLogs.push(`[농장] ${worker.name}의 농사 숙련도가 상승했습니다! (Lv.${mastery.level}, ${jobTitle})`);
                        }
                    }

                    base.lastFarmHarvestDate = curDate;
                }
            });
        });
        }

        // 1-2. 광산 자동 채굴 (가동 중단 시 건너뜀)
        if (yieldMultiplier > 0) {
            const mineInstances = baseLayout.filter(inst => inst && inst.type === 'mine');
            mineInstances.forEach(inst => {
                const workerIds = base.multiAssignments?.[inst.id] || (base.assignments?.[inst.id] ? [base.assignments[inst.id]] : []);
                workerIds.forEach(workerId => {
                    const worker = allCompsForWork.find(c => c && c.id === workerId);
                    if (!worker) return;

                    const mineLv = inst.level || 1;
                    const workerStats = calculateFinalStats(worker).finalStats;
                    
                    const specId = base.mineSpecializations?.[inst.id] || 'general';
                    const spec = MINE_SPECIALIZATIONS.find(s => s.id === specId) || MINE_SPECIALIZATIONS[0];
                    const specBonus = spec.bonus as any;

                    const miningMastery = worker.professions?.mining || { level: 1, exp: 0, maxExp: 100 };
                    const masteryBonus = 1 + (miningMastery.level * 0.04); 
                    const gemLuckScale = 1 + (miningMastery.level * 0.02);
                    const failureChance = Math.max(0.01, 0.18 - miningMastery.level * 0.006);

                    if (Math.random() < failureChance) {
                        dailyHarvestLogs.push(`[광산] ${worker.name}이(가) 채굴 도중에 사고가 발생하여 수확에 실패했습니다.`);
                    } else {
                        const masteryYieldBonus = Math.floor(miningMastery.level * 0.5);

                        const baseStoneYield = Math.floor(((mineLv * 3) + masteryYieldBonus) * masteryBonus * (specBonus.stone || 1));
                        const baseIronYield = Math.floor(((mineLv * 2) + Math.floor(masteryYieldBonus * 0.8)) * masteryBonus * (specBonus.iron || 1));
                        const baseManaStoneYield = Math.floor(((mineLv * 2) + Math.floor(masteryYieldBonus * 0.8)) * masteryBonus * (specBonus.manaStone || 1));

                        const stoneYield = Math.max(1, Math.floor(baseStoneYield * yieldMultiplier));
                        const ironYield = Math.max(1, Math.floor(baseIronYield * yieldMultiplier));
                        const manaStoneYield = Math.max(1, Math.floor(baseManaStoneYield * yieldMultiplier));
                        
                        base.resources.stone = (base.resources.stone || 0) + stoneYield;
                        base.resources.iron = (base.resources.iron || 0) + ironYield;
                        base.resources.manaStone = (base.resources.manaStone || 0) + manaStoneYield;

                        totalHarvested.stone += stoneYield;
                        totalHarvested.iron += ironYield;
                        totalHarvested.manaStone += manaStoneYield;

                        const luck = (1 + (workerStats.wis * 0.001)) * gemLuckScale * yieldMultiplier;

                        if (Math.random() < (0.12 * (specBonus.silver_ore || 1) * luck)) {
                            base.resources.silver_ore = (base.resources.silver_ore || 0) + 1;
                            totalHarvested.silver_ore += 1;
                        }
                        if (mineLv >= 2 && Math.random() < (0.08 * (specBonus.gold_ore || 1) * luck)) {
                            base.resources.gold_ore = (base.resources.gold_ore || 0) + 1;
                            totalHarvested.gold_ore += 1;
                        }
                        if (mineLv >= 3 && Math.random() < (0.08 * (specBonus.manaCrystal || 1) * luck)) {
                            base.resources.manaCrystal = (base.resources.manaCrystal || 0) + 1;
                            totalHarvested.manaCrystal += 1;
                        }
                        if (mineLv >= 3) {
                            if (Math.random() < (0.04 * (specBonus.ruby || 1) * gemLuckScale)) {
                                base.resources.ruby = (base.resources.ruby || 0) + 1;
                                totalHarvested.ruby += 1;
                            }
                            if (Math.random() < (0.04 * (specBonus.sapphire || 1) * gemLuckScale)) {
                                base.resources.sapphire = (base.resources.sapphire || 0) + 1;
                                totalHarvested.sapphire += 1;
                            }
                            if (Math.random() < (0.04 * (specBonus.emerald || 1) * gemLuckScale)) {
                                base.resources.emerald = (base.resources.emerald || 0) + 1;
                                totalHarvested.emerald += 1;
                            }
                        }
                        if (mineLv >= 5) {
                            if (Math.random() < (0.02 * (specBonus.diamond || 1) * gemLuckScale)) {
                                base.resources.diamond = (base.resources.diamond || 0) + 1;
                                totalHarvested.diamond += 1;
                            }
                            if (base.location?.region === "신계" && Math.random() < (0.05 * gemLuckScale)) {
                                base.resources.holy_stone = (base.resources.holy_stone || 0) + 1;
                                totalHarvested.holy_stone += 1;
                                dailyHarvestLogs.push(`[광산] ${worker.name}이(가) 신성한 기운이 담긴 '신성석'을 발견했습니다!`);
                            }
                        }

                        if (worker.job === JobType.MINER) {
                            if (!worker.professions) worker.professions = {};
                            if (!worker.professions.mining) worker.professions.mining = { level: 1, exp: 0, maxExp: 100 };
                            
                            const mastery = worker.professions.mining;
                            const oldLevel = mastery.level;
                            mastery.exp += 20 + mineLv * 6;
                            while (mastery.exp >= mastery.maxExp) {
                                mastery.exp -= mastery.maxExp;
                                mastery.level += 1;
                                mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                            }
                            
                            if (mastery.level > oldLevel) {
                                let jobTitle = "견습 광부";
                                if (mastery.level >= 100) jobTitle = '전설 광부';
                                else if (mastery.level >= 80) jobTitle = '명인 광부';
                                else if (mastery.level >= 50) jobTitle = '장인 광부';
                                else if (mastery.level >= 20) jobTitle = '숙련 광부';
                                else if (mastery.level >= 10) jobTitle = '일반 광부';
                                
                                const baseClass = worker.finalClassName || worker.lastClassName || worker.secondClassName || worker.firstClassName;
                                worker.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                                dailyHarvestLogs.push(`[광산] ${worker.name}의 채굴 숙련도가 상승했습니다! (Lv.${mastery.level}, ${jobTitle})`);
                            }
                        }

                        base.lastMineDate = curDate;
                    }
                });
            });
        }

        // 1-3. 연금술 실험실 자동 생산 (마정석 - 가동 중단 시 건너뜀)
        if (yieldMultiplier > 0) {
            const alchemyInstances = baseLayout.filter(inst => inst && inst.type === 'alchemy');
            alchemyInstances.forEach(inst => {
            const workerIds = base.multiAssignments?.[inst.id] || (base.assignments?.[inst.id] ? [base.assignments[inst.id]] : []);
            workerIds.forEach(workerId => {
                const worker = allCompsForWork.find(c => c && c.id === workerId);
                if (!worker) return;

                const alcLv = inst.level || 1;
                const costIron = 1 * alcLv;
                const costManaStone = 1 * alcLv;

                if (base.resources.iron >= costIron && (base.resources.manaStone || 0) >= costManaStone) {
                    base.resources.iron -= costIron;
                    base.resources.manaStone = (base.resources.manaStone || 0) - costManaStone;
                    const workerStats = calculateFinalStats(worker).finalStats;
                    
                    const alchemyMastery = worker.professions?.alchemy || { level: 1, exp: 0, maxExp: 100 };
                    const masteryBonus = 1 + (alchemyMastery.level * 0.05); 
                    const failureChance = Math.max(0.01, 0.2 - alchemyMastery.level * 0.005);

                    if (Math.random() < failureChance) {
                        dailyHarvestLogs.push(`[연금술] ${worker.name}이(가) 실험 중 폭발을 일으켜 마정석 합성에 실패했습니다.`);
                    } else {
                        const wisBonus = Math.floor(workerStats.wis * (0.01 + alchemyMastery.level * 0.001) * 2);
                        const intBonus = Math.floor(workerStats.int * (0.01 + alchemyMastery.level * 0.001) * 2);
                        const ctrlBonus = Math.floor((workerStats.ctrl || 0) * (0.01 + alchemyMastery.level * 0.001) * 2);
                        
                        const yieldAmt = Math.floor(Math.max(1, alcLv + wisBonus + intBonus + ctrlBonus) * masteryBonus);
                        base.resources.manaCrystal = (base.resources.manaCrystal || 0) + yieldAmt;
                        totalHarvested.manaCrystal += yieldAmt;

                        if (worker.job === "연금술사") {
                            if (!worker.professions) worker.professions = {};
                            if (!worker.professions.alchemy) worker.professions.alchemy = { level: 1, exp: 0, maxExp: 100 };
                            
                            const mastery = worker.professions.alchemy;
                            const oldLevel = mastery.level;
                            mastery.exp += 30 + alcLv * 10;
                            while (mastery.exp >= mastery.maxExp) {
                                mastery.exp -= mastery.maxExp;
                                mastery.level += 1;
                                mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                            }
                            
                            if (mastery.level > oldLevel) {
                                let jobTitle = "견습 연금술사";
                                if (mastery.level >= 100) jobTitle = '전설 연금술사';
                                else if (mastery.level >= 80) jobTitle = '명인 연금술사';
                                else if (mastery.level >= 50) jobTitle = '장인 연금술사';
                                else if (mastery.level >= 20) jobTitle = '숙련 연금술사';
                                else if (mastery.level >= 10) jobTitle = '일반 연금술사';
                                
                                const baseClass = worker.finalClassName || worker.lastClassName || worker.secondClassName || worker.firstClassName;
                                worker.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                                dailyHarvestLogs.push(`[연금술] ${worker.name}의 연금술 숙련도가 상승했습니다! (Lv.${mastery.level}, ${jobTitle})`);
                            }
                        }
                        base.lastAlchemyProductionDate = curDate;
                    }
                } else {
                    dailyHarvestLogs.push(`[연금술] 재료 부족 (철광석, 마력석)으로 '${inst.id}'의 자동 합성을 중단합니다.`);
                }
            });
        });
        }

        // 1-4. 4대 동맹 계약 일일 공급
        if (charCopy.demonMiningContractEndDate && curDate <= charCopy.demonMiningContractEndDate) {
            const crystals = charCopy.demonMiningDailySupply || 30;
            base.resources.manaCrystal = (base.resources.manaCrystal || 0) + crystals;
            totalHarvested.manaCrystal += crystals;
        }
        if (charCopy.elfWoodContractEndDate && curDate <= charCopy.elfWoodContractEndDate) {
            const supplyWood = charCopy.elfWoodDailySupply || 30;
            base.resources.wood = (base.resources.wood || 0) + supplyWood;
            totalHarvested.wood += supplyWood;
        }
        if (charCopy.beastStoneContractEndDate && curDate <= charCopy.beastStoneContractEndDate) {
            const supplyStone = charCopy.beastStoneDailySupply || 30;
            base.resources.stone = (base.resources.stone || 0) + supplyStone;
            totalHarvested.stone += supplyStone;
        }
        if (charCopy.beastIronContractEndDate && curDate <= charCopy.beastIronContractEndDate) {
            const supplyIron = charCopy.beastIronDailySupply || 30;
            base.resources.iron = (base.resources.iron || 0) + supplyIron;
            totalHarvested.iron += supplyIron;
        }

        if (dailyHarvestLogs.length > 0) logs.push(...dailyHarvestLogs);

        const foodCalc = getBaseDailyFoodConsumption ? getBaseDailyFoodConsumption(base, charCopy.inactiveCompanions || []) : { dailyFoodNeed: 20 };
        foodNeed = typeof foodCalc === 'number' ? foodCalc : (foodCalc?.dailyFoodNeed || 20);
        base.resources.food = Math.max(0, base.resources.food - foodNeed);
        const currentMonth = curDate.slice(0, 7);
        const isMonthStart = curDate.endsWith('-01');

        if (isMonthStart && base.lastMaintenanceMonth !== currentMonth) {
            base.lastMaintenanceMonth = currentMonth;
            const baseLevel = base.level || 1;
            const baseLevelFee = baseLevel * 10000;
            const validFacilities = (base.layout || []).filter(inst => inst && inst.type);
            const facilityCount = validFacilities.length;
            const facilityLevelsSum = validFacilities.reduce((sum, inst) => sum + (inst.level || 1), 0);
            const facilityFee = facilityCount * 1000 * facilityLevelsSum;
            maintenance = baseLevelFee + facilityFee;

            if ((charCopy.money || 0) >= maintenance) {
                // 정상 완납
                charCopy.money -= maintenance;
                if (base.overdueMonths && base.overdueMonths > 0) {
                    logs.push(`[영지 정상화] 기지 유지비가 정상 완납되어 모든 체납 페널티가 해제되고 기지가 완전 정상화되었습니다.`);
                }
                base.overdueMonths = 0;
                base.unpaidMaintenance = 0;
                base.isFacilitySuspended = false;
                logs.push(`[경제] 기지 시설 유지비(월간 정산)로 ${maintenance.toLocaleString()}G가 지출되었습니다. (기지 레벨: ${baseLevelFee.toLocaleString()}G, 시설 ${facilityCount}개: ${facilityFee.toLocaleString()}G)`);
            } else {
                // 골드 부족: 즉시 강제 마이너스 차감 대신 체납 유예 및 단계별 조치
                base.overdueMonths = (base.overdueMonths || 0) + 1;
                base.unpaidMaintenance = (base.unpaidMaintenance || 0) + maintenance;
                const overdue = base.overdueMonths;

                if (overdue === 1) {
                    // 경고 1단계: 생산량 50% 감소
                    logs.push(`[영지 체납 경고 1단계] 골드 부족으로 기지 유지비(${maintenance.toLocaleString()}G)가 미납되었습니다. 유지비 지불이 유예되었으나 다음 달까지 영지 시설 생산량이 50%로 감소합니다.`);
                } else if (overdue === 2) {
                    // 경고 2단계: 생산량 25% 급감 및 동료 충성도/사기 5 하락
                    const allComps = (charCopy.companions || []).concat(charCopy.inactiveCompanions || []);
                    allComps.forEach(c => {
                        c.loyalty = Math.max(0, (c.loyalty || 50) - 5);
                    });
                    logs.push(`[영지 체납 경고 2단계] 기지 유지비 2개월 연속 체납! 시설 생산량이 25%로 급감하며 동료들의 충성도와 사기가 5 하락했습니다.`);
                } else {
                    // 체납 3단계: 모든 시설 가동 일시 전면 중단
                    base.isFacilitySuspended = true;
                    const allComps = (charCopy.companions || []).concat(charCopy.inactiveCompanions || []);
                    allComps.forEach(c => {
                        c.loyalty = Math.max(0, (c.loyalty || 50) - 10);
                    });
                    logs.push(`[영지 시설 가동 중단] 기지 유지비 장기 체납(${overdue}개월)으로 인해 기지 내 모든 시설 가동이 전면 중단되었습니다! 미납금을 완납할 때까지 자원 수확 및 시설 이용이 정지됩니다.`);
                }
            }
        } else {
            maintenance = 0;
        }

        logs.push(`[영지 결산] 영지 자원 수확 완료: 식량 +${totalHarvested.food}, 목재 +${totalHarvested.wood}, 석재 +${totalHarvested.stone}, 철광석 +${totalHarvested.iron}`);
        toastNotice = `[영지 결산] 아침 자원 수확이 완료되었습니다.`;

        // [삭제됨] 전투 훈련소 수련 정산은 아침 마일스톤 방식에서 12시간 실시간 훈련 방식으로 대체되었습니다.

        if (dailyHarvestLogs.length > 0) {
            logs.push(...dailyHarvestLogs);
        }
    }

    // 2-4-1. 기지 중요 알림(대장간 제작소 완제품, 연금술 포션 조제, 파견 복귀/위급, 식량 부족 등) 종합 수집
    const criticalAlerts = collectMilestoneCriticalAlerts(charCopy, curDate, logs);

    const readyCraftCount = (charCopy.base?.dispatched || []).filter(m => m && m.missionType === 'Blacksmithing' && m.expectedReturnDate && curDate >= m.expectedReturnDate).length;
    const readyAlcCount = (charCopy.base?.dispatched || []).filter(m => m && (m.missionType === 'AlchemyCrafting' || m.missionType === 'Alchemy') && m.expectedReturnDate && curDate >= m.expectedReturnDate).length;
    const returnMissionCount = (charCopy.base?.dispatched || []).filter(m => m && m.expectedReturnDate && curDate >= m.expectedReturnDate && m.missionType !== 'Blacksmithing' && m.missionType !== 'AlchemyCrafting' && m.missionType !== 'Alchemy').length;

    if (readyCraftCount > 0 && !logs.some(l => l.includes('[대장간]') && l.includes('수령을 대기'))) {
        logs.push(`[대장간] 장비 ${readyCraftCount}건의 제작/강화가 완료되어 수령을 대기하고 있습니다.`);
    }
    if (readyAlcCount > 0 && !logs.some(l => l.includes('[연금술]') && l.includes('수령을 대기'))) {
        logs.push(`[연금술] 연금술 물품 ${readyAlcCount}건의 조제가 완료되어 수령을 대기하고 있습니다.`);
    }
    if (returnMissionCount > 0 && !logs.some(l => l.includes('[인재 파견]') && l.includes('복귀'))) {
        logs.push(`[인재 파견] 파견 대원 ${returnMissionCount}건이 복귀를 대기하고 있습니다.`);
    }

    // 토스트 알림에 완제품/조제 완료 및 복귀 최우선 반영 (유지비 부족 경고 발생 시 최상위 알림)
    const shortageAlert = criticalAlerts.find(a => a.id?.startsWith('maintenance_shortage_'));
    const forecastAlert = criticalAlerts.find(a => a.id?.startsWith('maintenance_forecast_'));

    if (shortageAlert) {
        toastNotice = shortageAlert.title;
    } else if (readyCraftCount > 0) {
        toastNotice = `⚒️ [대장간] 완성 장비 수령 대기 (${readyCraftCount}건)`;
    } else if (readyAlcCount > 0) {
        toastNotice = `🧪 [연금술] 완성 물품/약품 수령 대기 (${readyAlcCount}건)`;
    } else if (returnMissionCount > 0) {
        toastNotice = `🚩 [인재 파견] 파견 복귀 완료 (${returnMissionCount}건)`;
    } else if (forecastAlert) {
        toastNotice = forecastAlert.title;
    }

    const baseLevel = charCopy.base?.level || 0;
    const hasHarvest = totalHarvested.food > 0 || totalHarvested.wood > 0 || totalHarvested.stone > 0 || totalHarvested.herbs > 0 || totalHarvested.iron > 0 || totalHarvested.manaStone > 0 || totalHarvested.manaCrystal > 0;

    if (baseLevel > 0 || criticalAlerts.length > 0 || hasHarvest) {
        dailyReport = {
            days: 1,
            date: curDate,
            totalHarvested: { ...totalHarvested },
            workerHarvestCount: baseLayout.length,
            criticalAlerts,
            foodConsumed: foodNeed,
            dailyFoodNeed: foodNeed,
            baseMaintenanceFee: maintenance,
            currentResources: charCopy.base?.resources ? { ...charCopy.base.resources } : undefined
        };
    }

    // 2-5. 신의 사자: 성전 안보 및 위엄 체크
    try {
        if (isMessengerJob(charCopy.job || JobType.UNEMPLOYED)) {
            const defRes = triggerTempleDefense(charCopy);
            if (defRes?.log) logs.push(defRes.log);
        }
    } catch (e) {
        console.error('Temple security error:', e);
    }

    if (options?.isDungeonOrCombat) {
        if (!charCopy.bufferedTimeSkipReports) charCopy.bufferedTimeSkipReports = [];
        if (dailyReport) {
            charCopy.bufferedTimeSkipReports.push(dailyReport);
            hasBufferedReport = true;
        }
        return { updatedCharacter: charCopy, logs, toastNotice, hasBufferedReport, dailyReport: undefined };
    }

    return { updatedCharacter: charCopy, logs, dailyReport, toastNotice, hasBufferedReport: false };
}

/**
 * 3. [12:00 정오] 마일스톤:
 * - 용병단 신규 의뢰 발생, 랭크/평판 변동, 첩보
 * - 군사 시스템 일일 보급 및 급여 수령, 전선 동향
 * - 학교 일일 활동
 */
export function processNoonMilestone(
    character: Character,
    options?: { isDungeonOrCombat?: boolean }
): { updatedCharacter: Character; logs: string[]; dailyReport?: DailyReportData; toastNotice?: string; hasBufferedReport?: boolean } {
    let charCopy: Character = { ...character };
    const logs: string[] = [];

    const curDate = charCopy.currentDate || '2000-03-02';
    const parts = curDate.split('-');
    const yearNum = parseInt(parts[0], 10) || 2000;
    const monthNum = parseInt(parts[1], 10) || 3;

    try {
        const noonEnginesRes = executeMilestoneTimeEngines('noon', {
            character: charCopy,
            currentDate: curDate,
            yearNum,
            monthNum,
            dayNum: parseInt(parts[2], 10) || 2,
            daysPassed: 1,
            milestone: 'noon',
            logs,
            criticalAlerts: [],
            options
        });
        charCopy = noonEnginesRes.updatedCharacter;
        if (noonEnginesRes.logs && noonEnginesRes.logs.length > 0) {
            logs.push(...noonEnginesRes.logs);
        }
    } catch (e) {
        console.error('Noon milestone unified time engines error:', e);
    }

    let toastNotice: string | undefined = undefined;
    const meaningfulLog = logs.find(l => /첩보|의뢰|급여|승급|진급|발견|표창/i.test(l));
    if (meaningfulLog) {
        toastNotice = meaningfulLog.length > 35 ? meaningfulLog.substring(0, 32) + '...' : meaningfulLog;
    }

    let hasBufferedReport = false;
    let dailyReport: DailyReportData | undefined = undefined;

    if (logs.length > 0) {
        const resObj = (charCopy.base?.resources || {}) as any;
        const currentRes = {
            food: resObj.food || 0,
            wood: resObj.wood || 0,
            stone: resObj.stone || 0,
            herbs: resObj.herbs || 0,
            iron: resObj.iron || 0,
            manaStone: resObj.manaStone || 0,
            manaCrystal: resObj.manaCrystal || 0
        };

        dailyReport = {
            days: 1,
            date: curDate,
            totalHarvested: { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 },
            workerHarvestCount: 0,
            criticalAlerts: logs.map((msg, i) => ({
                id: `alert_noon_${Date.now()}_${i}`,
                type: 'urgent' as const,
                severity: 'info' as const,
                title: extractAlertTitle(msg, "정오 소식"),
                message: msg
            })),
            foodConsumed: 0,
            dailyFoodNeed: 0,
            baseMaintenanceFee: 0,
            currentResources: currentRes
        };

        if (options?.isDungeonOrCombat) {
            if (!charCopy.bufferedTimeSkipReports) charCopy.bufferedTimeSkipReports = [];
            charCopy.bufferedTimeSkipReports.push(dailyReport);
            hasBufferedReport = true;
            dailyReport = undefined;
        }
    }

    return { updatedCharacter: charCopy, logs, dailyReport, toastNotice, hasBufferedReport };
}

/**
 * 4. [18:00 저녁] 마일스톤:
 * - 전 세계 국가 외교 관계 변동 (전쟁, 동맹, 지도자 교체)
 * - 마계/신계 동향 및 전쟁 안보
 */
export function processEveningMilestone(
    character: Character,
    options?: { isDungeonOrCombat?: boolean }
): { updatedCharacter: Character; logs: string[]; dailyReport?: DailyReportData; toastNotice?: string; hasBufferedReport?: boolean } {
    let charCopy: Character = { ...character };
    const logs: string[] = [];
    const curDate = charCopy.currentDate || '2000-03-02';

    try {
        const eveningEnginesRes = executeMilestoneTimeEngines('evening', {
            character: charCopy,
            currentDate: curDate,
            yearNum: parseInt(curDate.split('-')[0], 10) || 2000,
            monthNum: parseInt(curDate.split('-')[1], 10) || 3,
            dayNum: parseInt(curDate.split('-')[2], 10) || 2,
            daysPassed: 1,
            milestone: 'evening',
            logs,
            criticalAlerts: [],
            options
        });
        charCopy = eveningEnginesRes.updatedCharacter;
        if (eveningEnginesRes.logs && eveningEnginesRes.logs.length > 0) {
            logs.push(...eveningEnginesRes.logs);
        }

        checkForMagyeRevolt(charCopy);
        checkForDivineInvasion(charCopy);

        if (!charCopy.customNationLeaders) {
            charCopy.customNationLeaders = { ...NATION_LEADERS };
        }
        NATION_NAMES.forEach(nation => {
            if (Math.random() < 0.0005) {
                const oldLeader = charCopy.customNationLeaders![nation] || NATION_LEADERS[nation];
                const leaderGender = Math.random() < 0.5 ? 'male' : 'female';
                const newName = generateName(nation, leaderGender);
                charCopy.customNationLeaders![nation] = {
                    name: newName,
                    title: oldLeader?.title || '지도자',
                    desc: `${oldLeader?.name || '선대'}의 뒤를 이어 ${nation}을 이끄는 새로운 지도자.`,
                    appearance: oldLeader?.appearance
                };
                logs.push(`[외교 뉴스] ${nation}의 새로운 지도자로 '${newName}'이(가) 취임했습니다.`);
            }
        });
    } catch (e) {
        console.error('Evening milestone diplomacy error:', e);
    }

    let toastNotice: string | undefined = undefined;
    const meaningfulLog = logs.find(l => /외교|전쟁|선전포고|지도자|동맹|정변/i.test(l));
    if (meaningfulLog) {
        toastNotice = meaningfulLog.length > 35 ? meaningfulLog.substring(0, 32) + '...' : meaningfulLog;
    }

    let hasBufferedReport = false;
    let dailyReport: DailyReportData | undefined = undefined;

    if (logs.length > 0) {
        const resObj = (charCopy.base?.resources || {}) as any;
        const currentRes = {
            food: resObj.food || 0,
            wood: resObj.wood || 0,
            stone: resObj.stone || 0,
            herbs: resObj.herbs || 0,
            iron: resObj.iron || 0,
            manaStone: resObj.manaStone || 0,
            manaCrystal: resObj.manaCrystal || 0
        };

        dailyReport = {
            days: 1,
            date: curDate,
            totalHarvested: { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 },
            workerHarvestCount: 0,
            criticalAlerts: logs.map((msg, i) => {
                const isThreat = /선전포고|전쟁|침공|기습|습격|재앙/i.test(msg);
                return {
                    id: `alert_eve_${Date.now()}_${i}`,
                    type: isThreat ? ('urgent' as const) : ('info' as const),
                    severity: isThreat ? ('warning' as const) : ('info' as const),
                    title: extractAlertTitle(msg, "저녁 외교 동향"),
                    message: msg
                };
            }),
            foodConsumed: 0,
            dailyFoodNeed: 0,
            baseMaintenanceFee: 0,
            currentResources: currentRes
        };

        if (options?.isDungeonOrCombat) {
            if (!charCopy.bufferedTimeSkipReports) charCopy.bufferedTimeSkipReports = [];
            charCopy.bufferedTimeSkipReports.push(dailyReport);
            hasBufferedReport = true;
            dailyReport = undefined;
        }
    }

    return { updatedCharacter: charCopy, logs, dailyReport, toastNotice, hasBufferedReport };
}

/**
 * 마일스톤 분산 엔진 총괄 실행
 */
export function executeDistributedMilestones(
    character: Character,
    currentMinutes: number,
    minutesToAdd: number,
    options?: { isDungeonOrCombat?: boolean }
): {
    updatedCharacter: Character;
    logs: string[];
    toastNotice?: string;
    dailyReport?: DailyReportData;
    hasBufferedReport?: boolean;
    midnightsCount: number;
} {
    const passed = getPassedMilestones(currentMinutes, minutesToAdd);
    let activeChar = { ...character };
    const allLogs: string[] = [];
    let lastToast: string | undefined = undefined;
    const collectedReports: DailyReportData[] = [];
    let anyBuffered = false;
    let midnightsCount = 0;

    for (const ms of passed) {
        try {
            let res: any = null;
            if (ms.type === 'midnight') {
                midnightsCount++;
                res = processMidnightMilestone(activeChar, options);
            } else if (ms.type === 'morning') {
                res = processMorningMilestone(activeChar, options);
            } else if (ms.type === 'noon') {
                res = processNoonMilestone(activeChar, options);
            } else if (ms.type === 'evening') {
                res = processEveningMilestone(activeChar, options);
            }

            if (res) {
                activeChar = res.updatedCharacter;
                if (res.logs && res.logs.length > 0) allLogs.push(...res.logs);
                if (res.dailyReport) collectedReports.push(res.dailyReport);
                if (res.hasBufferedReport) anyBuffered = true;
                if (res.toastNotice) lastToast = res.toastNotice;
            }
        } catch (err) {
            console.error(`Milestone ${ms.type} error:`, err);
        }
    }

    // 사건 큐 충돌 안전 해결 (기지 방어 및 인연 기습 동시 발생 시 큐로 정렬)
    try {
        activeChar = resolveIncidentConflicts(activeChar);
    } catch (e) {
        console.error('Resolve incident conflicts error:', e);
    }

    let finalDailyReport: DailyReportData | undefined = undefined;
    if (collectedReports.length === 1) {
        finalDailyReport = collectedReports[0];
    } else if (collectedReports.length > 1) {
        // 여러 아침 마일스톤 결산 보고서 병합
        const last = collectedReports[collectedReports.length - 1];
        let totalFood = 0;
        let totalWood = 0;
        let totalStone = 0;
        let totalHerbs = 0;
        let totalIron = 0;
        let totalManaStone = 0;
        let totalManaCrystal = 0;
        let foodConsumed = 0;
        let baseMaintenance = 0;
        const allAlerts: CriticalAlert[] = [];

        collectedReports.forEach(r => {
            if (r.totalHarvested) {
                totalFood += (r.totalHarvested.food || 0);
                totalWood += (r.totalHarvested.wood || 0);
                totalStone += (r.totalHarvested.stone || 0);
                totalHerbs += (r.totalHarvested.herbs || 0);
                totalIron += (r.totalHarvested.iron || 0);
                totalManaStone += (r.totalHarvested.manaStone || 0);
                totalManaCrystal += (r.totalHarvested.manaCrystal || 0);
            }
            foodConsumed += (r.foodConsumed || 0);
            baseMaintenance += (r.baseMaintenanceFee || 0);
            if (r.criticalAlerts && Array.isArray(r.criticalAlerts)) {
                r.criticalAlerts.forEach(a => {
                    if (!allAlerts.some(existing => existing.id === a.id || existing.message === a.message)) {
                        allAlerts.push(a);
                    }
                });
            }
        });

        finalDailyReport = {
            ...last,
            days: collectedReports.length,
            totalHarvested: {
                food: totalFood,
                wood: totalWood,
                stone: totalStone,
                herbs: totalHerbs,
                iron: totalIron,
                manaStone: totalManaStone,
                manaCrystal: totalManaCrystal
            },
            foodConsumed,
            baseMaintenanceFee: baseMaintenance,
            criticalAlerts: allAlerts
        };
    }

    // 기지 완제품 수령 대기(대장간 제작소 장비, 연금술 포션 조제) 및 파견 복귀 종합 검사
    const curDate = activeChar.currentDate || '';
    const globalAlerts = collectMilestoneCriticalAlerts(activeChar, curDate, allLogs);
    const readyCraftCount = (activeChar.base?.dispatched || []).filter(m => m && m.missionType === 'Blacksmithing' && m.expectedReturnDate && curDate >= m.expectedReturnDate).length;
    const readyAlcCount = (activeChar.base?.dispatched || []).filter(m => m && (m.missionType === 'AlchemyCrafting' || m.missionType === 'Alchemy') && m.expectedReturnDate && curDate >= m.expectedReturnDate).length;
    const returnMissionCount = (activeChar.base?.dispatched || []).filter(m => m && m.expectedReturnDate && curDate >= m.expectedReturnDate && m.missionType !== 'Blacksmithing' && m.missionType !== 'AlchemyCrafting' && m.missionType !== 'Alchemy').length;

    if (readyCraftCount > 0 && !allLogs.some(l => l.includes('[대장간]') && l.includes('수령을 대기'))) {
        allLogs.push(`[대장간] 장비 ${readyCraftCount}건의 제작/강화가 완료되어 수령을 대기하고 있습니다.`);
    }
    if (readyAlcCount > 0 && !allLogs.some(l => l.includes('[연금술]') && l.includes('수령을 대기'))) {
        allLogs.push(`[연금술] 연금술 물품 ${readyAlcCount}건의 조제가 완료되어 수령을 대기하고 있습니다.`);
    }
    if (returnMissionCount > 0 && !allLogs.some(l => l.includes('[인재 파견]') && l.includes('복귀'))) {
        allLogs.push(`[인재 파견] 파견 대원 ${returnMissionCount}건이 복귀를 대기하고 있습니다.`);
    }

    if (readyCraftCount > 0 || readyAlcCount > 0 || returnMissionCount > 0) {
        if (!lastToast) {
            if (readyCraftCount > 0) {
                lastToast = `⚒️ [대장간] 완성 장비 수령 대기 (${readyCraftCount}건)`;
            } else if (readyAlcCount > 0) {
                lastToast = `🧪 [연금술] 완성 물품/약품 수령 대기 (${readyAlcCount}건)`;
            } else if (returnMissionCount > 0) {
                lastToast = `🚩 [인재 파견] 파견 복귀 완료 (${returnMissionCount}건)`;
            }
        }
    }

    if (!finalDailyReport && (readyCraftCount > 0 || readyAlcCount > 0 || returnMissionCount > 0 || globalAlerts.length > 0)) {
        finalDailyReport = {
            days: 1,
            date: curDate,
            totalHarvested: { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 },
            workerHarvestCount: 0,
            criticalAlerts: globalAlerts,
            foodConsumed: 0,
            dailyFoodNeed: 0,
            baseMaintenanceFee: 0,
            currentResources: activeChar.base?.resources ? { ...activeChar.base.resources } : undefined
        };
    } else if (finalDailyReport) {
        const existingIds = new Set((finalDailyReport.criticalAlerts || []).map(a => a.id));
        globalAlerts.forEach(a => {
            if (!existingIds.has(a.id)) {
                if (!finalDailyReport!.criticalAlerts) finalDailyReport!.criticalAlerts = [];
                finalDailyReport!.criticalAlerts.push(a);
            }
        });
    }

    if (finalDailyReport && activeChar.pendingDeceasedAlerts && activeChar.pendingDeceasedAlerts.length > 0) {
        finalDailyReport.deceasedList = [...activeChar.pendingDeceasedAlerts];
        // 결산 보고서에 반영 완료 후 알림 대기열 정리
        activeChar.pendingDeceasedAlerts = [];
    }

    return {
        updatedCharacter: activeChar,
        logs: allLogs,
        toastNotice: lastToast,
        dailyReport: finalDailyReport,
        hasBufferedReport: anyBuffered,
        midnightsCount
    };
}

/**
 * 1일 전체 마일스톤 시뮬레이션 (자정 -> 아침 -> 정오 -> 저녁 순차 가동)
 * 타임 엔진과 타임 마일스톤 엔진의 완벽한 단일 진실 공급원(SSOT)
 */
export function processOneDayFullMilestone(
    character: Character,
    options?: { isDungeonOrCombat?: boolean }
): {
    updatedCharacter: Character;
    logs: string[];
    dailyReport?: DailyReportData;
    toastNotice?: string;
    hasBufferedReport?: boolean;
} {
    let activeChar = { ...character };
    const allLogs: string[] = [];
    const collectedReports: DailyReportData[] = [];
    let lastToast: string | undefined = undefined;
    let anyBuffered = false;

    // 1. 자정 마일스톤 (00:00)
    const midRes = processMidnightMilestone(activeChar, options);
    activeChar = midRes.updatedCharacter;
    if (midRes.logs && midRes.logs.length > 0) allLogs.push(...midRes.logs);
    if (midRes.dailyReport) collectedReports.push(midRes.dailyReport);
    if (midRes.hasBufferedReport) anyBuffered = true;
    if (midRes.toastNotice) lastToast = midRes.toastNotice;

    // 2. 아침 마일스톤 (08:00)
    const mornRes = processMorningMilestone(activeChar, options);
    activeChar = mornRes.updatedCharacter;
    if (mornRes.logs && mornRes.logs.length > 0) allLogs.push(...mornRes.logs);
    if (mornRes.dailyReport) collectedReports.push(mornRes.dailyReport);
    if (mornRes.hasBufferedReport) anyBuffered = true;
    if (mornRes.toastNotice) lastToast = mornRes.toastNotice;

    // 3. 정오 마일스톤 (12:00)
    const noonRes = processNoonMilestone(activeChar, options);
    activeChar = noonRes.updatedCharacter;
    if (noonRes.logs && noonRes.logs.length > 0) allLogs.push(...noonRes.logs);
    if (noonRes.dailyReport) collectedReports.push(noonRes.dailyReport);
    if (noonRes.hasBufferedReport) anyBuffered = true;
    if (noonRes.toastNotice) lastToast = noonRes.toastNotice;

    // 4. 저녁 마일스톤 (18:00)
    const eveRes = processEveningMilestone(activeChar, options);
    activeChar = eveRes.updatedCharacter;
    if (eveRes.logs && eveRes.logs.length > 0) allLogs.push(...eveRes.logs);
    if (eveRes.dailyReport) collectedReports.push(eveRes.dailyReport);
    if (eveRes.hasBufferedReport) anyBuffered = true;
    if (eveRes.toastNotice) lastToast = eveRes.toastNotice;

    // 사건 큐 충돌 해결
    activeChar = resolveIncidentConflicts(activeChar);

    // 중요 알림 및 완성품 종합 점검
    const curDate = activeChar.currentDate || '';
    const globalAlerts = collectMilestoneCriticalAlerts(activeChar, curDate, allLogs);

    // 아침 마일스톤 보고서를 메인 일일 보고서로 우선 취합
    let mainDailyReport = collectedReports.find(r => r.workerHarvestCount > 0 || (r.totalHarvested && (r.totalHarvested.food > 0 || r.totalHarvested.wood > 0 || r.totalHarvested.iron > 0)));
    if (!mainDailyReport && collectedReports.length > 0) {
        mainDailyReport = collectedReports[0];
    }

    if (mainDailyReport) {
        const existingIds = new Set((mainDailyReport.criticalAlerts || []).map(a => a.id));
        globalAlerts.forEach(a => {
            if (!existingIds.has(a.id)) {
                if (!mainDailyReport!.criticalAlerts) mainDailyReport!.criticalAlerts = [];
                mainDailyReport!.criticalAlerts.push(a);
            }
        });
    } else if (globalAlerts.length > 0) {
        mainDailyReport = {
            days: 1,
            date: curDate,
            totalHarvested: { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 },
            workerHarvestCount: 0,
            criticalAlerts: globalAlerts,
            foodConsumed: 0,
            dailyFoodNeed: 0,
            baseMaintenanceFee: 0,
            currentResources: activeChar.base?.resources ? { ...activeChar.base.resources } : undefined
        };
    }

    if (mainDailyReport && activeChar.pendingDeceasedAlerts && activeChar.pendingDeceasedAlerts.length > 0) {
        mainDailyReport.deceasedList = [...activeChar.pendingDeceasedAlerts];
        activeChar.pendingDeceasedAlerts = [];
    }

    return {
        updatedCharacter: activeChar,
        logs: allLogs,
        dailyReport: mainDailyReport,
        toastNotice: lastToast,
        hasBufferedReport: anyBuffered
    };
}
