
import { Character, Companion, JobType, MilitaryRank, DiplomaticStatus, DivineDiplomacyStatus, ResultData, ClassTier, MercenaryRank, RelationType, Enemy, DispatchMission, Item, ItemRarity, SimpleStudent, Stats, BlacksmithRank, Quest, BattleRole, DailyReportData, CriticalAlert, WorldNewsItem, WeaponType, SkillType, DeceasedAlertInfo, isCommonCompanion, isCommonCompanionInteractionDisabled, SocialAppointment } from '../types';
import { addDays, getYear, calculateAgeFromYear, updateSocialNetworkGrowth, checkAndApplyLevelUp, generateClassmates, extractSurname, generateNameWithSurname, generateEnemyStats, getTierByLevel, generateCompanionStats, generateName, calculateFinalStats, generateProceduralEnemy, getBaseDailyFoodConsumption, getRequiredExp, getStatPointsPerLevel, addMasteryExp, getPersonLocation } from '../utils';
import { processInterCompanionEvents, processCohousingEvents, removeBondSkillsBetween, cleanInvalidBondSkills, checkCompanionCouplesBreakup } from './relationService';
import { updateNationalDiplomacy } from './diplomacyService';
import { triggerTempleDefense, calculateTempleMajesty } from '../templedefensesystem';
import { isMessengerJob } from '../messengerofgodvisual';
import { checkForMagyeRevolt } from '../magyeInternalWarSystem';
import { checkForDivineInvasion } from '../Magyedivinewarsystem';
import { START_DATE, MILITARY_RANK_ORDER, MILITARY_RANK_THRESHOLD, MAGYE_LEADERS,INITIAL_BASE, NATION_DATA, NATION_NAMES, SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES, WORLD_GEOGRAPHY, MINE_SPECIALIZATIONS, WEAPON_TYPE_KOREAN } from '../constants';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { processSchoolAdvancement, processSchoolDailyEvents, processClassmatesGrowth } from './SchooltimeEngine';
import { processMercenaryDailyEvents } from './MercenaryTimeEngine';
import { processMilitaryDailyEvents } from './MilitaryTimeEngine';
import { processDivineDailyEvents } from './DivineTimeEngine'; // [NEW]
import { processNaturalDeath } from './deathTimeEngine'; // [NEW]
import { checkTitleUnlocks, TITLES } from '../titles'; 
import { processNpcLifeEvents } from './npcLifeEngine'; // [NEW]
import { checkTimeEngineCompanionClassLiberation } from './companionGrowthService';
import { getReducedMpCostOnLevelUp } from './skillMpService';
import { NATION_LEADERS } from '../worldData';
import { NATION_THEMES, HUNT_LEVEL_BANDS, getMonsterPoolForBand } from '../monsterfield';

import { INSTANT_DUNGEON_BOSS_TEMPLATES, generateInstantDungeonBoss } from '../data/instantDungeonBoss';
import { INSTANT_DUNGEON_MONSTER_TEMPLATES, generateInstantDungeonMonster } from '../data/instantDungeonMonster';
import { checkAndGenerateMonthlyWorldNews } from './worldNewsService';
import { generateBlackMarketInventory } from '../ItemData';
import { resolveIncidentConflicts, registerAmbush } from './incidentQueue';
import { sanitizeCharacterStudentJobs, sanitizeCharacterStudentJobsWithLogs } from './npcJobSanitizer';
import { getCombatTrainingEfficiencyBonus, getUnifiedCombatTrainingData, syncUnifiedCombatTrainingToCharacter } from './trainingService';
import { checkAndTriggerBurnoutEvent, checkAndTriggerJealousyEvent, checkAndTriggerDateEvent, checkAndTriggerBaseEvent, checkAndTriggerBreakupEvent } from './relationshipEventService';
import { processBreederAutoCare } from './monsterGrowth';
import { syncAllSiblingRelations } from './siblingService';
import { processOneDayFullMilestone } from './timeMilestoneEngine';
export * from './unifiedTimeEngineManager';

/**
 * 국가 지도자 교체 시뮬레이션
 */
const processLeaderReplacement = (character: Character, allLogs: string[]) => {
    if (!character.customNationLeaders) {
        character.customNationLeaders = { ...NATION_LEADERS };
    }

    NATION_NAMES.forEach(nation => {
        // 매년 약 5~10% 확률로 지도자 교체 (수명, 정변 등)
        if (Math.random() < 0.0002) { // 일일 확률로 환산 (약 연 7%)
            const oldLeader = character.customNationLeaders![nation] || NATION_LEADERS[nation];
            const isCoup = Math.random() < 0.3; // 30% 확률로 정변, 70%는 자연 교체(수명)
            
            const leaderGender = Math.random() < 0.5 ? 'male' : 'female';
            const newName = generateName(nation, leaderGender);
            const newLeader = {
                name: newName,
                title: oldLeader.title,
                desc: isCoup ? `${nation}의 혼란을 틈타 권력을 잡은 야심가.` : `${oldLeader.name}의 뒤를 이어 ${nation}을 이끄는 새로운 지도자.`,
                appearance: oldLeader.appearance 
            };

            character.customNationLeaders![nation] = newLeader;
            
            const eventType = isCoup ? "[정변]" : "[지도자 교체]";
            allLogs.push(`${eventType} ${nation}의 지도자가 ${oldLeader.name}에서 ${newLeader.name}(으)로 교체되었습니다. 이로 인해 외교 관계가 급변할 수 있습니다.`);

            // 외교 관계 초기화 또는 급변
            if (character.militaryData?.diplomacy) {
                Object.keys(character.militaryData.diplomacy).forEach(targetNation => {
                    const rel = character.militaryData!.diplomacy![targetNation];
                    if (rel) {
                        // 긴장도 대폭 상승 및 상태 중립화 경향
                        rel.tension = Math.min(100, rel.tension + 30);
                        if (rel.status === DiplomaticStatus.ALLIANCE && Math.random() < 0.5) {
                            rel.status = DiplomaticStatus.NEUTRAL;
                            allLogs.push(`[외교] 지도자 교체 여파로 ${nation}와(과)의 동맹이 파기되고 중립 관계로 돌아섰습니다.`);
                        }
                    }
                });
            }
        }
    });
};

/**
 * 전역 타임 엔진 (Global Time Engine)
 * 시간을 흐르게 하고 그 사이 발생하는 모든 기계적 이벤트를 처리합니다.
 */
export interface TimeSkipResult {
    updatedCharacter: Character;
    systemLogs: string[];
    triggeredEvents: any[]; // 향후 확장용 (강제 팝업 등)
    dailyReport?: DailyReportData;
    worldNews?: WorldNewsItem[];
}
/**
 * 헬퍼: 성별 판별
 */
const isFemale = (g: string) => {
    if (!g) return false;
    const lower = g.trim().toLowerCase();
    return ['여성', '여자', 'female', 'woman', 'f', 'girl'].some(k => lower === k || lower.includes(k));
};

const isMale = (g: string) => {
    if (!g) return false;
    const lower = g.trim().toLowerCase();
    return ['남성', '남자', 'male', 'm', 'boy'].some(k => lower === k || lower.includes(k));
};

/**
 * 헬퍼: 개월 수 차이 계산
 */
const getMonthsDiff = (d1: string, d2: string) => {
    try {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
    } catch {
        return 0;
    }
};
// * [NEW] 인연 유대 수치 감소 시뮬레이션
// * 1년 이상 교류가 없는 인연들과의 호감도가 서서히 감소합니다.
 //*
const processAffectionDecay = (currentRef: Character, currentDate: string, allLogs: string[]) => {
    const DECAY_THRESHOLD_DAYS = 365; // 1년
    const DECAY_CHECK_INTERVAL = 30; // 30일마다 감소 체크

    // 현재 파티에 있거나 대기 중인 동료들의 ID 목록 (제외 대상)
    const activeCompanionIds = new Set([
        ...currentRef.companions.map(c => c.id),
        ...(currentRef.inactiveCompanions || []).map(c => c.id)
    ]);

    const decayEntity = (entity: any) => {
        // 현재 동료는 제외
        if (activeCompanionIds.has(entity.id)) return;
        if (entity.isDead || entity.isPurged) return;
        
        // 마지막 상호작용일이 없으면 START_DATE를 기준으로 함
        const lastDate = entity.lastInteractionDate || START_DATE;
        const diff = getDaysDiff(lastDate, currentDate);

        if (diff > DECAY_THRESHOLD_DAYS) {
            const extraDays = diff - DECAY_THRESHOLD_DAYS;
            // 30일 단위로 1씩 감소
            if (entity.affection < 0) return;
            if (extraDays > 0 && extraDays % DECAY_CHECK_INTERVAL === 0) {
                const prevAff = entity.affection;
                entity.affection = Math.max(0, entity.affection - 1);
                
                // 수치가 실제로 감소했고, 아주 가끔씩만 로그를 남김 (피로도 방지)
                if (prevAff > 0 && entity.affection < prevAff && Math.random() < 0.05) {
                    allLogs.push(`[인연 소원] '${entity.name}'님과의 교류가 오랫동안 끊겨 서서히 사이가 멀어지고 있습니다.`);
                }
            }
        }
    };

    // 대기 중인 동료들 및 사회적 관계망 인물들을 대상으로 수행
    if (currentRef.socialNetwork) {
        currentRef.socialNetwork.forEach(decayEntity);
    }
};
/**
 * 시스템 로그 정리 유틸리티: 서신함과 연계하여 모든 교류 및 일상 소식을 빠짐없이 보존
 */
export const condenseSystemLogs = (logs: string[], daysPassed: number = 1): string[] => {
    if (!logs || logs.length === 0) return [];

    // 1. 공백 제거 및 중복 라인 기본 정리
    const cleanLogs = Array.from(new Set(logs.map(l => l.trim()).filter(Boolean)));
    
    // 로그 수가 5개 이하이고 단기(2일 이하) 경과 시 원본 그대로 반환
    if (cleanLogs.length <= 5 && daysPassed <= 2) {
        return cleanLogs;
    }

    const criticals: string[] = [];
    const socialBondNews: string[] = []; // 과거 인연 입신양명, 승급, 전우, 소식 등
    let maintenanceTotalGold = 0;
    let maintenanceCount = 0;
    
    const growthLogs: string[] = [];
    const relationshipLogs: string[] = [];
    const dungeonNewsLogs: string[] = [];
    const diplomacyLogs: string[] = [];
    const schoolLogs: string[] = [];
    let harvestCount = 0;
    const others: string[] = [];

    let inHarvestBox = false;

    for (const log of cleanLogs) {
        // [필수 보존 1] 긴급/중대 사건 (사망, 전사, 비보, 영면에 들었다, 침공, 선전포고, 습격, 크리티컬, 성인식, 가업 승계, 결혼, 출산, 임신, 하극상, 정벌, 패보, 수호수, 영입, 탈퇴 등)
        if (
            /🚨|⚔️|⚠️|☠️|✨|🔥|비보|사망|전사|이탈|선전포고|습격|크리티컬|성인식|가업 승계|결혼|출산|신성석|자라나|영입|탈퇴|임신|하극상|정벌|패보|수호수|영면에 들었다|서신|사육사/i.test(log)
        ) {
            criticals.push(log);
            continue;
        }

        // [필수 보존 2] 과거 인연 및 입신양명 / 중요 인맥 소식
        const isSocialBondOrSuccessLog = 
            log.includes('[입신양명]') ||
            log.startsWith('[인연 소식]') ||
            log.startsWith('[인연]') ||
            log.startsWith('[과거 인연]') ||
            log.includes('[성인]') ||
            log.includes('[성인/졸업]') ||
            /입신양명|옛 인연|과거의 인연|과거에 알던|옛 친구|임관|용병으로|대장장이|군 복무|취업|승급|신력을 각성|전우의 연|지명수배|무직/i.test(log) ||
            (log.startsWith('[뒷골목 소문]') && /과거|인연|지명수배/i.test(log)) ||
            (log.startsWith('[소식]') && /인연|신력|클래스|승급|취업|임관|용병|군인|대장장이|영면에 들었다/i.test(log));

        if (isSocialBondOrSuccessLog) {
            socialBondNews.push(log);
            continue;
        }

        // [기지 자원 수확 총 결산 로그 박스 수집]
        if (log.includes('[🌾 기지 자원 수확 총 결산')) {
            harvestCount++;
            inHarvestBox = true;
            continue;
        }
        if (inHarvestBox) {
            if (log.includes('━━━━━━━━━━')) {
                inHarvestBox = false;
            }
            continue;
        }

        // [경제/유지비 합산]
        if (log.includes('[경제] 기지 시설 유지비')) {
            maintenanceCount++;
            const match = log.match(/([\d,]+)G/);
            if (match) {
                const gold = parseInt(match[1].replace(/,/g, ''), 10);
                if (!isNaN(gold)) maintenanceTotalGold += gold;
            }
            continue;
        }

        // [성장/인맥/동료 소식]
        if (log.startsWith('[성장]') || log.startsWith('[인맥]') || log.startsWith('[동료 소식]') || log.startsWith('[동료]')) {
            growthLogs.push(log);
            continue;
        }
        if (log.startsWith('[썸]') || log.startsWith('[연인]') || log.startsWith('[관계]')) {
            relationshipLogs.push(log);
            continue;
        }

        // [던전/소문/세계 정보]
        if (log.startsWith('[던전]') || log.startsWith('[소문]') || log.startsWith('[뒷골목 소문]') || log.startsWith('[길드]') || log.startsWith('[군대]')) {
            dungeonNewsLogs.push(log);
            continue;
        }

        // [외교/성전]
        if (log.startsWith('[외교]') || log.startsWith('[성전 안보]') || log.startsWith('[성전]')) {
            diplomacyLogs.push(log);
            continue;
        }

        // [학교]
        if (log.startsWith('[학교]')) {
            schoolLogs.push(log);
            continue;
        }

        others.push(log);
    }

    const condensed: string[] = [];

    // 1. 긴급/중대 알림 최상단 배치
    criticals.forEach(c => condensed.push(c));

    // 2. 과거 인연 입신양명 및 인맥 소식 (생략 없이 전체 보존)
    socialBondNews.forEach(s => condensed.push(s));

    // 3. 기지 자원 수확 통합 요약 (실제 기지 수확 로그가 존재할 때만 표시)
    if (harvestCount > 0) {
        if (daysPassed > 1) {
            condensed.push(`[🌾 기지 자원 수확] ${daysPassed}일간 기지 자원 생산 및 자동 수확 완료 (우측 하단 리포트 참조)`);
        } else {
            condensed.push(`[🌾 기지 자원 수확] 기지 자원 생산 및 자동 수확 완료 (우측 하단 리포트 참조)`);
        }
    }

    // 4. 유지비 지출 통합 요약
    if (maintenanceCount > 0) {
        if (maintenanceCount > 1 || daysPassed > 1) {
            condensed.push(`[경제] ${daysPassed}일간 기지 시설 유지비로 총 ${maintenanceTotalGold.toLocaleString()}G가 지출되었습니다.`);
        } else {
            condensed.push(`[경제] 기지 시설 유지비로 ${maintenanceTotalGold.toLocaleString()}G가 지출되었습니다.`);
        }
    }

    // 5. 동료 성장/관계 소식 (생략 없이 전체 보존)
    const allGrowthLogs = [...growthLogs, ...relationshipLogs];
    allGrowthLogs.forEach(l => condensed.push(l));

    // 6. 던전 및 세계 소식 (생략 없이 전체 보존)
    dungeonNewsLogs.forEach(l => condensed.push(l));

    // 7. 외교 동향 (생략 없이 전체 보존)
    diplomacyLogs.forEach(l => condensed.push(l));

    // 8. 학교 학업 소식 (생략 없이 전체 보존)
    schoolLogs.forEach(l => condensed.push(l));

    // 9. 기타 일반 일상 소식 (생략 없이 전체 보존)
    others.forEach(o => condensed.push(o));

    // 최종 중복 제거
    return Array.from(new Set(condensed));
};

/**
 * 며칠이 지났을 때 발생하는 로컬 시뮬레이션 총괄
 */
export const processTimeSkip = (character: Character, days: number): TimeSkipResult => {
    if (days <= 0) return { updatedCharacter: character, systemLogs: [], triggeredEvents: [] };

    let currentChar = JSON.parse(JSON.stringify(character)) as Character;
    const allSystemLogs: string[] = [];
    const collectedDailyReports: DailyReportData[] = [];
    const worldNews: WorldNewsItem[] = [];

    for (let i = 0; i < days; i++) {
        const dayRes = processOneDayFullMilestone(currentChar);
        currentChar = dayRes.updatedCharacter;
        if (dayRes.logs && dayRes.logs.length > 0) {
            allSystemLogs.push(...dayRes.logs);
        }
        if (dayRes.dailyReport) {
            collectedDailyReports.push(dayRes.dailyReport);
        }

        // 플레이어 사망 시 승계 처리를 위해 조기 종료
        if (currentChar.isDead) {
            break;
        }
    }

    // 세계 정세 뉴스 추출
    allSystemLogs.forEach((log, idx) => {
        if (/\[외교\]|\[선전포고\]|\[성전\]|\[군대\]|\[찬탈\]|\[정세\]|\[국가\]|\[외교 뉴스\]|\[국방 정보\]|\[전보\]|\[던전\]|\[암시장\]/i.test(log)) {
            const isWar = log.includes('전쟁') || log.includes('선전포고') || log.includes('성전');
            const isDungeon = log.includes('던전');
            worldNews.push({
                id: `news_${Date.now()}_${idx}`,
                category: isDungeon ? 'dungeon' : isWar ? 'war' : 'diplomacy',
                title: log.length > 20 ? log.substring(0, 18) + '...' : log,
                date: currentChar.currentDate || '',
                message: log
            });
        }
    });

    // 월 변경 시 월간 세계 정세 & 던전 & 암시장 종합 뉴스 정산
    const monthlyNewsRes = checkAndGenerateMonthlyWorldNews(currentChar, character.currentDate, allSystemLogs);
    if (monthlyNewsRes.news && monthlyNewsRes.news.length > 0) {
        currentChar = monthlyNewsRes.updatedCharacter;
        worldNews.push(...monthlyNewsRes.news);
    }

    // 다일치 일일 보고서 종합 병합
    let consolidatedReport: DailyReportData | undefined = undefined;
    if (collectedDailyReports.length === 1) {
        consolidatedReport = collectedDailyReports[0];
    } else if (collectedDailyReports.length > 1) {
        const last = collectedDailyReports[collectedDailyReports.length - 1];
        let totalFood = 0;
        let totalWood = 0;
        let totalStone = 0;
        let totalHerbs = 0;
        let totalIron = 0;
        let totalManaStone = 0;
        let totalManaCrystal = 0;
        let totalFoodConsumed = 0;
        let totalMaintenance = 0;
        const allAlerts: CriticalAlert[] = [];
        const allDeceased: DeceasedAlertInfo[] = [];

        collectedDailyReports.forEach(r => {
            if (r.totalHarvested) {
                totalFood += (r.totalHarvested.food || 0);
                totalWood += (r.totalHarvested.wood || 0);
                totalStone += (r.totalHarvested.stone || 0);
                totalHerbs += (r.totalHarvested.herbs || 0);
                totalIron += (r.totalHarvested.iron || 0);
                totalManaStone += (r.totalHarvested.manaStone || 0);
                totalManaCrystal += (r.totalHarvested.manaCrystal || 0);
            }
            totalFoodConsumed += (r.foodConsumed || 0);
            totalMaintenance += (r.baseMaintenanceFee || 0);
            if (r.criticalAlerts && Array.isArray(r.criticalAlerts)) {
                r.criticalAlerts.forEach(a => {
                    if (!allAlerts.some(existing => existing.id === a.id || existing.message === a.message)) {
                        allAlerts.push(a);
                    }
                });
            }
            if (r.deceasedList && Array.isArray(r.deceasedList)) {
                r.deceasedList.forEach(d => {
                    if (!allDeceased.some(existing => existing.name === d.name)) {
                        allDeceased.push(d);
                    }
                });
            }
        });

        consolidatedReport = {
            ...last,
            days,
            totalHarvested: {
                food: totalFood,
                wood: totalWood,
                stone: totalStone,
                herbs: totalHerbs,
                iron: totalIron,
                manaStone: totalManaStone,
                manaCrystal: totalManaCrystal
            },
            foodConsumed: totalFoodConsumed,
            baseMaintenanceFee: totalMaintenance,
            criticalAlerts: allAlerts,
            deceasedList: allDeceased.length > 0 ? allDeceased : undefined
        };
    }

    return {
        updatedCharacter: currentChar,
        systemLogs: condenseSystemLogs(allSystemLogs, days),
        triggeredEvents: [],
        dailyReport: consolidatedReport,
        worldNews: worldNews.length > 0 ? worldNews : undefined
    };
};

/**
 * 여관 휴식 처리 (1일 경과 + 회복 + 랜덤 이벤트)
 */
export const processInnRest = (character: Character): TimeSkipResult => {
    // 1. 1일 시간 경과 시뮬레이션 (기존 타임 엔진 작동)
    const { updatedCharacter, systemLogs, triggeredEvents, dailyReport, worldNews } = processTimeSkip(character, 1);
    
    // 2. 여관 휴식 전용 회복 효과 적용 (FinalStat 기준 HP/MP 완전 회복)
    const { finalStats: playerFinal } = calculateFinalStats(updatedCharacter);
    const restoredChar: Character = {
        ...updatedCharacter,
        stats: {
            ...updatedCharacter.stats,
            hp: playerFinal.maxHp,
            mp: playerFinal.maxMp
        },
        statusEffects: [] // 모든 상태이상 해제
    };

    if (restoredChar.companions) {
        restoredChar.companions = restoredChar.companions.map(comp => {
            const { finalStats: cFinal } = calculateFinalStats(comp);
            return {
                ...comp,
                stats: {
                    ...comp.stats,
                    hp: cFinal.maxHp,
                    mp: cFinal.maxMp
                }
            };
        });
    }

    if (restoredChar.inactiveCompanions) {
        restoredChar.inactiveCompanions = restoredChar.inactiveCompanions.map(comp => {
            const { finalStats: cFinal } = calculateFinalStats(comp);
            return {
                ...comp,
                stats: {
                    ...comp.stats,
                    hp: cFinal.maxHp,
                    mp: cFinal.maxMp
                }
            };
        });
    }

    const nextYear = getYear(restoredChar.currentDate || START_DATE);

    // 3. 여관 전용 랜덤 이벤트 (30% 확률로 일반 이벤트, 18% 확률로 특수 이벤트)
    let eventMsg = "여관에서 편안한 하룻밤을 보냈습니다. 모든 피로가 풀리고 HP와 MP가 완전히 회복되었습니다!";
    const specialRand = Math.random();

    if (specialRand < 0.18) {
        // --- [NEW] 특수 이벤트 (18% 확률) ---
        const eventTypeRand = Math.random();
        
        if (eventTypeRand < 0.4) {
            // 1) 인맥 이벤트 (새로운 인연 혹은 악연)
            const isBadRelation = Math.random() < 0.3; // 30% 확률로 악연
            const nation = NATION_NAMES[Math.floor(Math.random() * NATION_NAMES.length)];
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const name = generateName(nation, gender);
            const level = Math.max(1, restoredChar.level + (Math.floor(Math.random() * 11) - 5));
            const stats = generateCompanionStats(level);
            
            const newNpc: SimpleStudent = {
                id: `inn_npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                age: String(calculateAgeFromYear(nextYear - level - 15, nextYear)),
                birthYear: nextYear - level - 15,
                gender: gender === 'male' ? '남성' : '여성',
                race: '인간',
                nation: nation,
                level: level,
                personality: isBadRelation ? '거만함' : '사교적임',
                appearance: '여관에서 우연히 마주친 인물.',
                stats: stats,
                affection: isBadRelation ? -20 : 20,
                classType: isBadRelation ? '여관의 불량배' : '여관의 여행자',
                isPastConnection: true
            };

            if (!restoredChar.socialNetwork) restoredChar.socialNetwork = [];
            restoredChar.socialNetwork.push(newNpc);

            if (isBadRelation) {
                eventMsg = `여관 식당에서 '${name}'(와)과 시비가 붙었습니다. 험악한 분위기 속에 서로의 얼굴을 익혔습니다. (악연 등록)`;
            } else {
                eventMsg = `여관 로비에서 우연히 합석한 '${name}'(와)과 밤새 모험 이야기를 나누며 의기투합했습니다. (새로운 인연 등록)`;
            }
        } else if (eventTypeRand < 0.7) {
            // 2) 각종 소문 이벤트
            const rumors = [
                "어느 먼 대륙에서 전설적인 용사가 나타나 마왕의 군대를 물리쳤다는 소문이 들려옵니다.",
                "최근 국경 지대의 긴장감이 고조되어 조만간 큰 전쟁이 일어날지도 모른다는 흉흉한 소문이 돌고 있습니다.",
                "인근 숲에서 정체불명의 고대 유적이 발견되어 수많은 모험가들이 몰려들고 있다고 합니다.",
                "희귀한 보물을 실은 상단이 도적 떼에게 습격당해 행방이 묘연해졌다는 소식이 전해집니다.",
                "대륙 최고의 대장장이가 신의 금속을 제련하는 데 성공했다는 경이로운 소문이 퍼지고 있습니다."
            ];
            eventMsg = rumors[Math.floor(Math.random() * rumors.length)];
        } else {
            // 3) 퀘스트 이벤트 (몬스터 습격)
            const enemyLevel = Math.max(1, restoredChar.level + 2);
            const eStats = generateEnemyStats(enemyLevel);
            const ambushEnemy: Enemy = {
                name: "여관을 습격한 자객",
                level: enemyLevel,
                hp: eStats.maxHp * 2,
                maxHp: eStats.maxHp * 2,
                stats: { ...eStats, hp: eStats.maxHp * 2, maxHp: eStats.maxHp * 2 },
                statusEffects: [],
                description: "깊은 밤, 당신의 목숨을 노리고 여관 방으로 침입한 자객입니다!",
                skills: []
            };

            restoredChar.pendingAmbush = {
                enemies: [ambushEnemy],
                sourceId: 'inn_ambush',
                title: "여관의 밤습격!",
                message: "평화로운 휴식 도중, 당신을 노린 자객들이 여관 방으로 들이닥쳤습니다!"
            };
            eventMsg = "깊은 밤, 정체불명의 자객들이 당신의 방을 습격했습니다! 전투 준비를 하십시오.";
        }
    } else if (specialRand < 0.48) {
        // --- 일반 이벤트 (기존 20% -> 30% 확률) ---
        const rand = Math.random();
        if (rand < 0.3) {
            eventMsg = "여관 주인이 특별히 준비한 신선한 조식을 대접받았습니다! 기분이 매우 좋아집니다.";
        } else if (rand < 0.6) {
            eventMsg = "옆 테이블 모험가들이 나누는 대화에서 대륙의 정세에 관한 흥미로운 소문을 들었습니다.";
        } else if (rand < 0.8) {
            eventMsg = "오늘따라 침대가 유난히 편안했습니다. 깊은 잠에 들어 정신이 맑아집니다.";
        } else {
            eventMsg = "밤새 1층 술집에서 들려오는 노래 소리 때문에 잠을 조금 설쳤지만, 활기찬 아침을 맞이했습니다.";
        }
    }
    
    // 로그 최상단에 추가
    systemLogs.unshift(`[여관 휴식] ${eventMsg}`);

    return {
        updatedCharacter: restoredChar,
        systemLogs,
        triggeredEvents,
        dailyReport,
        worldNews
    };
};

/**
 * 헬퍼: 날짜 차이 계산
 */
const getDaysDiff = (d1: string, d2: string): number => {
    try {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = date2.getTime() - date1.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
};
