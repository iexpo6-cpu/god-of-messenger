import { Character, Companion, RelationType, CompanionRelation, Stats, HousekeeperRank, HOUSEKEEPER_RANK_CONFIG, ChefRank, CHEF_RANK_CONFIG, HouseType, JobType, isCommonCompanion, isCommonCompanionInteractionDisabled } from '../types';
import { canChefManageHouse, getCompanionChefRank, getHousekeeperRankByLevel, getYear } from '../utils';
import { isHalfSibling } from './siblingService';
import { canStartRomance } from './romanceEthicsService';

/**
 * 시간 경과에 따른 동료 간 관계 이벤트를 시뮬레이션합니다.
 * 현재 파티원(Active)과 기지 대기 인원(Inactive) 모두를 대상으로 합니다.
 */
export const processInterCompanionEvents = (character: Character, days: number): { updatedChar: Character, eventLogs: string[] } => {
    const eventLogs: string[] = [];
    const newChar = { ...character };
    
    const isBusy = (compId: string) => {
        const isBaseDispatched = newChar.base?.dispatched?.some(m => m.companionId === compId);
        const isWarDispatched = newChar.base?.dispatched?.some(m => 
            m.missionType === 'WarInvasion' && (m as any).participants?.includes(compId)
        );
        const isGroupDispatched = newChar.mercenaryData?.groupMissions?.some(m => m.memberIds?.includes(compId));
        const isLongDispatch = Object.entries(newChar.base?.assignments || {}).some(([k, v]) => v === compId && (k.startsWith('dispatch_') || k.startsWith('recruit_travel_')));
        return isBaseDispatched || isWarDispatched || isGroupDispatched || isLongDispatch;
    };

    const disableCommon = isCommonCompanionInteractionDisabled(newChar);

    // 전체 살아있는 인간형 동료 리스트 (파티 + 기지) 중 원거리 파견 인원 제외 (일반동료 상호교류 OFF 설정 시 일반동료 제외)
    const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])]
        .filter(c => !c.isMonster && !c.isDead && !isBusy(c.id) && (!disableCommon || !isCommonCompanion(c)));

    const updateInLists = (comp: Companion) => {
        const aIdx = newChar.companions.findIndex(pc => pc.id === comp.id);
        if (aIdx !== -1) newChar.companions[aIdx] = { ...comp };
        else if (newChar.inactiveCompanions) {
            const iIdx = newChar.inactiveCompanions.findIndex(pc => pc.id === comp.id);
            if (iIdx !== -1) newChar.inactiveCompanions[iIdx] = { ...comp };
        }
    };

    // 1. 주인공-동료 간의 일상 교류/대화 및 안부 서신 생성 (하루 1회 이상 확실한 교류 보장)
    if (allComps.length >= 1 && days > 0) {
        // 동료가 1명 이상이면 매일 1~2건의 안부 서신/교류 발생
        const interactionCount = Math.min(allComps.length, Math.max(1, Math.min(3, Math.floor(allComps.length / 2) + (days > 1 ? 1 : 0))));
        const shuffled = [...allComps].sort(() => 0.5 - Math.random());
        const selectedComps = shuffled.slice(0, interactionCount);

        selectedComps.forEach(comp => {
            const isPlayerLover = comp.isLover && (comp.partnerId === 'player' || !comp.partnerId || comp.partnerName === newChar.name);
            const isPlayerSpouse = comp.isSpouse && (comp.partnerId === 'player' || !comp.partnerId || comp.partnerName === newChar.name);
            const isPlayerSibling = comp.relation === RelationType.SIBLING || comp.relations?.['player']?.type === RelationType.SIBLING;
            const pRoll = Math.random();

            if (isPlayerSpouse) {
                if (pRoll < 0.5) {
                    eventLogs.push(`[배우자 일상] 배우자 '${comp.name}'이(가) 당신의 피로를 풀어주며 따뜻한 격려와 사랑을 전했습니다.`);
                } else {
                    eventLogs.push(`[배우자 서신] 배우자 '${comp.name}'이(가) 언제나 당신을 믿고 지지한다는 다정한 서신을 남겼습니다.`);
                }
            } else if (isPlayerLover) {
                if (pRoll < 0.5) {
                    eventLogs.push(`[연인 일상] 연인 '${comp.name}'이(가) 당신의 손을 살포시 쥐며 눈을 맞추고 미소를 지었습니다.`);
                } else {
                    eventLogs.push(`[연인 서신] 연인 '${comp.name}'이(가) 당신에 대한 그리움과 애정이 담긴 사랑의 편지를 보내왔습니다.`);
                }
            } else if (isPlayerSibling) {
                if (pRoll < 0.5) {
                    eventLogs.push(`[가족 일상] 형제자매 '${comp.name}'이(가) 당신의 안부를 챙기며 든든한 응원을 건넸습니다.`);
                } else {
                    eventLogs.push(`[가족 서신] 형제자매 '${comp.name}'이(가) 함께 가문을 빛내자는 다짐이 담긴 편지를 보내왔습니다.`);
                }
            } else {
                if (pRoll < 0.4) {
                    comp.affection = Math.min(100, (comp.affection || 0) + 2);
                    updateInLists(comp);
                    eventLogs.push(`[동료 대화] 동료 '${comp.name}'이(가) 당신과 즐겁게 담소를 나누며 신뢰를 쌓았습니다. (호감도 +2)`);
                } else if (pRoll < 0.7) {
                    eventLogs.push(`[동료 서신] 동료 '${comp.name}'이(가) 당신의 무운과 안녕을 기원하는 정성 어린 서신을 전했습니다.`);
                } else {
                    eventLogs.push(`[동료 일상] 동료 '${comp.name}'이(가) 여정의 추억을 이야기하며 당신과 유대를 다졌습니다.`);
                }
            }
        });
    }

    if (allComps.length < 2 || days <= 0) return { updatedChar: newChar, eventLogs };

    // 동료 간의 일상 및 상호작용
    const eventChance = Math.min(0.95, 0.70 + days * 0.15);
    if (Math.random() <= eventChance) {
        // 무작위 두 명 선택
        const idx1 = Math.floor(Math.random() * allComps.length);
        let idx2 = Math.floor(Math.random() * allComps.length);
        while (idx1 === idx2 && allComps.length > 1) idx2 = Math.floor(Math.random() * allComps.length);

        const c1 = allComps[idx1];
        const c2 = allComps[idx2];

        // 기존 관계 로드
        if (!c1.relations) c1.relations = {};
        if (!c2.relations) c2.relations = {};

        const rel1 = c1.relations[c2.id] || { targetId: c2.id, affection: 0, type: RelationType.ALLY };
        const rel2 = c2.relations[c1.id] || { targetId: c1.id, affection: 0, type: RelationType.ALLY };

        // 이벤트 결정
        const isSiblingPair = rel1.type === RelationType.SIBLING || rel2.type === RelationType.SIBLING;
        const roll = Math.random();
        const isPartyEvent = newChar.companions.some(pc => pc.id === c1.id) && newChar.companions.some(pc => pc.id === c2.id);
        const prefix = isPartyEvent ? "[파티 일상]" : "[기지 일상]";
        
        if (isSiblingPair) {
            // [형제자매 전용 상호작용]
            rel1.type = RelationType.SIBLING;
            rel2.type = RelationType.SIBLING;
            if (roll < 0.6) {
                rel1.affection = Math.min(100, rel1.affection + 6);
                rel2.affection = Math.min(100, rel2.affection + 6);
                eventLogs.push(`${prefix} ${c1.name}와(과) ${c2.name} 형제/자매가 서로를 챙겨주며 따뜻한 가족애를 나누었습니다.`);
            } else if (roll < 0.85) {
                rel1.affection = Math.min(100, rel1.affection + 4);
                rel2.affection = Math.min(100, rel2.affection + 4);
                eventLogs.push(`${isPartyEvent ? "[전투 훈련]" : "[기지 훈련]"} ${c1.name}와(과) ${c2.name} 남매/형제가 함께 수련하며 서로의 성장을 독려했습니다.`);
            } else {
                rel1.affection = Math.max(20, rel1.affection - 3);
                rel2.affection = Math.max(20, rel2.affection - 3);
                eventLogs.push(`${prefix} ${c1.name}와(과) ${c2.name} 사이에 가벼운 형제간 말다툼이 있었으나, 이내 언제 그랬냐는 듯 웃어넘겼습니다.`);
            }
        } else if (roll < 0.4) {
            // [친선] 함께 시간을 보냄
            rel1.affection = Math.min(100, rel1.affection + 5);
            rel2.affection = Math.min(100, rel2.affection + 5);
            eventLogs.push(`${prefix} ${c1.name}와(과) ${c2.name}이(가) 대화를 나누며 서로에 대해 더 알게 되었습니다.`);
            if (rel1.affection >= 50 && rel1.type === RelationType.ALLY) {
                rel1.type = RelationType.FRIEND;
                rel2.type = RelationType.FRIEND;
                eventLogs.push(`[인연] ${c1.name}와(과) ${c2.name}이(가) 이제 서로를 친구로 생각합니다.`);
            }
        } else if (roll < 0.7) {
            // [경쟁] 훈련 중 경쟁
            rel1.affection = Math.min(100, rel1.affection + 2);
            rel2.affection = Math.min(100, rel2.affection + 2);
            eventLogs.push(`${isPartyEvent ? "[전투 후기]" : "[기지 훈련]"} ${c1.name}와(과) ${c2.name}이(가) 서로의 실력을 겨루며 자극을 받았습니다.`);
            if (roll < 0.5 && rel1.type !== RelationType.RIVAL) {
                rel1.type = RelationType.RIVAL;
                rel2.type = RelationType.RIVAL;
                eventLogs.push(`[라이벌] ${c1.name}와(과) ${c2.name}이(가) 선의의 라이벌 관계가 되었습니다.`);
            }
        } else if (roll < 0.9) {
            // [갈등] 의견 충돌
            rel1.affection = Math.max(-100, rel1.affection - 10);
            rel2.affection = Math.max(-100, rel2.affection - 10);
            eventLogs.push(`${prefix} ${c1.name}와(과) ${c2.name} 사이에서 의견 차이로 인한 고성이 오갔습니다.`);
            
            // 연인 관계였으나 갈등으로 인해 호감도가 60 이하로 떨어진 경우 결별 처리
            if ((rel1.type === RelationType.LOVER || c1.partnerId === c2.id) && (rel1.affection <= 60 || rel2.affection <= 60)) {
                rel1.type = RelationType.ALLY;
                rel2.type = RelationType.ALLY;
                c1.isLover = false; c1.partnerId = undefined; c1.partnerName = undefined; c1.loverStartDate = undefined;
                c2.isLover = false; c2.partnerId = undefined; c2.partnerName = undefined; c2.loverStartDate = undefined;
                eventLogs.push(`[동료 결별] 잦은 갈등으로 애정이 식어버린 ${c1.name}와(과) ${c2.name}이(가) 연인 관계를 정리하고 동료 사이로 돌아갔습니다. (호감도 60 이하 결별)`);
            } else if (rel1.affection < -10) {
                rel1.type = RelationType.CONFLICT;
                rel2.type = RelationType.CONFLICT;
                eventLogs.push(`[불화] ${c1.name}와(과) ${c2.name}의 사이가 틀어져 '갈등' 상태가 되었습니다.`);
            }
        } else {
            // [로맨스] 이성 간 특별한 기류 (형제자매는 제외)
            const isHetero = (c1.gender !== c2.gender);
            const currentYear = getYear(character.currentDate || '2000-01-01');
            const ethicsAllowed = canStartRomance(c1, c2, currentYear);

            if (isHetero && !c1.isLover && !c2.isLover && !isSiblingPair) {
                if (!ethicsAllowed) {
                    // 미성년자와 성인 간 교류는 윤리적으로 썸/연인 불가, 대신 각별한 선후배/우정으로 승화
                    rel1.affection = Math.min(100, rel1.affection + 6);
                    rel2.affection = Math.min(100, rel2.affection + 6);
                    if (rel1.type === RelationType.ALLY) {
                        rel1.type = RelationType.FRIEND;
                        rel2.type = RelationType.FRIEND;
                        eventLogs.push(`${prefix} ${c1.name}와(과) ${c2.name}이(가) 서로를 따뜻하게 챙겨주며 든든한 동료 우정을 다졌습니다.`);
                    }
                } else if (rel1.type === RelationType.FLIRT && rel1.affection >= 80) {
                    // 썸 -> 연인 (미성년자끼리 또는 성인끼리만 가능)
                    rel1.affection = Math.min(100, rel1.affection + 20);
                    rel2.affection = Math.min(100, rel2.affection + 20);
                    rel1.type = RelationType.LOVER;
                    rel2.type = RelationType.LOVER;
                    c1.isLover = true; c1.partnerId = c2.id; c1.partnerName = c2.name; c1.loverStartDate = character.currentDate;
                    c2.isLover = true; c2.partnerId = c1.id; c2.partnerName = c1.name; c2.loverStartDate = character.currentDate;
                    eventLogs.push(`[사랑] 썸을 타던 ${c1.name}와(과) ${c2.name}이(가) 마침내 서로의 마음을 확인하고 연인이 되었습니다!`);
                } else if (rel1.type !== RelationType.LOVER && rel1.affection > 30) {
                    // 썸 발생 (미성년자끼리 또는 성인끼리만 가능)
                    rel1.affection = Math.min(100, rel1.affection + 30);
                    rel2.affection = Math.min(100, rel2.affection + 30);
                    rel1.type = RelationType.FLIRT;
                    rel2.type = RelationType.FLIRT;
                    eventLogs.push(`[썸] ${c1.name}와(과) ${c2.name} 사이에 묘한 기류가 흐르기 시작했습니다. 급격히 가까워진 두 사람은 이제 '썸'을 타는 사이입니다.`);
                }
            }
        }

        c1.relations[c2.id] = rel1;
        c2.relations[c1.id] = rel2;
        updateInLists(c1);
        updateInLists(c2);
    }

    return { updatedChar: newChar, eventLogs };
};

/**
 * [NEW] 동료 간 연인 관계의 이별/결별 여부를 확인합니다.
 * 1. 호감도 60 이하: 애정이 식어 상호 결별
 * 2. 호감도가 높아도(60 초과): 극소 확률(0.2%~0.3%)로 성격/가치관 차이로 이별
 */
export const checkCompanionCouplesBreakup = (character: Character, days: number): { updatedChar: Character, eventLogs: string[] } => {
    let newChar = { ...character };
    const eventLogs: string[] = [];

    const updateInLists = (comp: Companion) => {
        const aIdx = newChar.companions.findIndex(pc => pc.id === comp.id);
        if (aIdx !== -1) newChar.companions[aIdx] = { ...comp };
        else if (newChar.inactiveCompanions) {
            const iIdx = newChar.inactiveCompanions.findIndex(pc => pc.id === comp.id);
            if (iIdx !== -1) newChar.inactiveCompanions[iIdx] = { ...comp };
        }
    };

    const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    const handledPair = new Set<string>();

    allComps.forEach(c1 => {
        if (!c1.isLover || !c1.partnerId || c1.partnerId === 'player') return;
        
        const c2 = allComps.find(c => c.id === c1.partnerId);
        if (!c2) return;

        const pairKey = [c1.id, c2.id].sort().join('_');
        if (handledPair.has(pairKey)) return;
        handledPair.add(pairKey);

        const rel1 = c1.relations?.[c2.id] || { targetId: c2.id, affection: 50, type: RelationType.LOVER };
        const rel2 = c2.relations?.[c1.id] || { targetId: c1.id, affection: 50, type: RelationType.LOVER };

        const aff1 = rel1.affection !== undefined ? rel1.affection : 50;
        const aff2 = rel2.affection !== undefined ? rel2.affection : 50;

        // 1. 호감도가 60 이하로 떨어진 경우 -> 결별
        if (aff1 <= 60 || aff2 <= 60) {
            rel1.type = RelationType.ALLY;
            rel2.type = RelationType.ALLY;
            if (!c1.relations) c1.relations = {};
            if (!c2.relations) c2.relations = {};
            c1.relations[c2.id] = rel1;
            c2.relations[c1.id] = rel2;

            c1.isLover = false; c1.partnerId = undefined; c1.partnerName = undefined; c1.loverStartDate = undefined;
            c2.isLover = false; c2.partnerId = undefined; c2.partnerName = undefined; c2.loverStartDate = undefined;

            updateInLists(c1);
            updateInLists(c2);
            newChar = removeBondSkillsBetween(newChar, c1.id, c2.id);
            eventLogs.push(`[동료 결별] 서로에 대한 호감도가 낮아진 ${c1.name}와(과) ${c2.name}이(가) 결국 연인 관계를 끝내고 동료 사이로 돌아갔습니다. (호감도 60 이하 결별)`);
        }
        // 2. 호감도가 60을 초과해도 극소 확률(기존의 1/20인 약 0.0125%)로 성격/가치관 차이로 이별
        else {
            const rareBreakupChance = Math.min(0.00075, 0.000125 * Math.max(1, days));
            if (Math.random() < rareBreakupChance) {
                rel1.type = RelationType.FRIEND;
                rel2.type = RelationType.FRIEND;
                if (!c1.relations) c1.relations = {};
                if (!c2.relations) c2.relations = {};
                c1.relations[c2.id] = rel1;
                c2.relations[c1.id] = rel2;

                c1.isLover = false; c1.partnerId = undefined; c1.partnerName = undefined; c1.loverStartDate = undefined;
                c2.isLover = false; c2.partnerId = undefined; c2.partnerName = undefined; c2.loverStartDate = undefined;

                updateInLists(c1);
                updateInLists(c2);
                newChar = removeBondSkillsBetween(newChar, c1.id, c2.id);
                eventLogs.push(`[동료 이별] ${c1.name}와(과) ${c2.name}이(가) 깊은 애정 속에서도 성격과 가치관의 차이를 좁히지 못하고 각자의 길을 걷기로 결심하며 연인 관계를 마침내 정리했습니다.`);
            }
        }
    });

    return { updatedChar: newChar, eventLogs };
};

/**
 * [NEW] 같은 집에 거주하는 거주민 간 교류 확률 증대, 미배치 노숙자 불만, 청결도 감소 시뮬레이션
 */
export const processCohousingEvents = (character: Character, days: number): { updatedChar: Character, eventLogs: string[], foodConsumed: number } => {
    const eventLogs: string[] = [];
    const newChar = { ...character };
    let foodConsumed = 0;
    if (!newChar.base || days <= 0) return { updatedChar: newChar, eventLogs, foodConsumed: 0 };

    const houseAssignments = newChar.base.houseAssignments || {};
    const houses = newChar.base.houses || [];
    const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);

    const updateInLists = (comp: Companion) => {
        const aIdx = newChar.companions.findIndex(pc => pc.id === comp.id);
        if (aIdx !== -1) newChar.companions[aIdx] = { ...comp };
        else if (newChar.inactiveCompanions) {
            const iIdx = newChar.inactiveCompanions.findIndex(pc => pc.id === comp.id);
            if (iIdx !== -1) newChar.inactiveCompanions[iIdx] = { ...comp };
        }
    };

    // 1. 주택별 거주 동료 그룹화 및 미배치 동료 추적
    const residentsByHouse: Record<string, Companion[]> = {};
    const validHouseIds = new Set(houses.map(h => h.id));

    allComps.forEach(comp => {
        const assignedHouseId = houseAssignments[comp.id];
        if (assignedHouseId && validHouseIds.has(assignedHouseId)) {
            if (!residentsByHouse[assignedHouseId]) residentsByHouse[assignedHouseId] = [];
            residentsByHouse[assignedHouseId].push(comp);
        } else {
            // [요구사항] 거주 공간이 없는 미배치 대기 동료(inactive)에만 호감도/충성도 하락 적용 (현재 파티 동료는 노숙 불만 적용 안 됨)
            const isInactive = (newChar.inactiveCompanions || []).some(ic => ic.id === comp.id);
            if (isInactive) {
                const oldAff = comp.affection || 50;
                const oldFaith = comp.faith || 50;
                const penalty = Math.max(1, Math.floor(days * 1.5));

                comp.affection = Math.max(0, oldAff - penalty);
                comp.faith = Math.max(0, oldFaith - penalty);
                if (comp.loyalty !== undefined) {
                    comp.loyalty = Math.max(0, comp.loyalty - penalty);
                }
                updateInLists(comp);

                if (Math.random() < 0.3) {
                    eventLogs.push(`[노숙 불만] 지정된 주택이 없는 대기 동료 ${comp.name}이(가) 열악한 환경에 불만을 품어 호감도(-${penalty})와 충성도(-${penalty})가 하락했습니다.`);
                }
            }
        }
    });

    // 2. 주택 청결도, 전담 요리사 관리 및 초호화 주택 효과
    const hungryCompanions: Companion[] = [];

    houses.forEach(house => {
        const residents = residentsByHouse[house.id] || [];
        const assignedHK = house.assignedHousekeeperId ? allComps.find(c => c.id === house.assignedHousekeeperId) : null;
        
        // --- 2-1. 하우스키퍼 청결도 및 경험치 처리 ---
        if (assignedHK) {
            // [담당 하우스키퍼가 있는 경우]: 자동 청소 수행하여 청결도 100% 유지
            house.cleanliness = 100;

            // 하우스키퍼 숙련도(EXP) 부여 및 자동 승급 처리
            const prevRank = assignedHK.housekeeperRank || HousekeeperRank.BEGINNER;
            let level = assignedHK.housekeeperLevel || 1;
            const gainedExp = Math.max(5, 10 * days);
            let exp = (assignedHK.housekeeperExp || 0) + gainedExp;

            while (exp >= 100 && level < 100) {
                exp -= 100;
                level++;
            }

            const newRank = getHousekeeperRankByLevel(level);
            if (newRank !== prevRank) {
                eventLogs.push(`[하우스키퍼 승급] '${house.name}'을(를) 성실히 관리한 ${assignedHK.name}의 직급이 [${HOUSEKEEPER_RANK_CONFIG[newRank]?.label || newRank}]으로 승급했습니다!`);
            }

            assignedHK.housekeeperRank = newRank;
            assignedHK.housekeeperExp = exp;
            assignedHK.housekeeperLevel = level;
            updateInLists(assignedHK);

            if (Math.random() < 0.2) {
                eventLogs.push(`[자동 청소] 담당 하우스키퍼 ${assignedHK.name}이(가) '${house.name}'을(를) 깨끗하게 청소하여 청결도 100%를 유지 중입니다.`);
            }
        } else {
            // [하우스키퍼가 없는 경우]: 매일 청결도 자연 감소
            let currentCleanliness = house.cleanliness !== undefined ? house.cleanliness : 100;
            const decayPerDay = 4;
            currentCleanliness = Math.max(0, currentCleanliness - (decayPerDay * days));
            house.cleanliness = currentCleanliness;

            // 청결도가 낮을 때 호감도/충성도 하락
            if (currentCleanliness < 40 && residents.length > 0) {
                residents.forEach(comp => {
                    comp.affection = Math.max(0, (comp.affection || 50) - 1);
                    comp.faith = Math.max(0, (comp.faith || 50) - 1);
                    if (comp.loyalty !== undefined) {
                        comp.loyalty = Math.max(0, comp.loyalty - 1);
                    }
                    updateInLists(comp);
                });
                eventLogs.push(`[서신] '${house.name}' 숙소의 청결도가 매우 낮습니다(${currentCleanliness}%). 거주 대원들의 만족도가 떨어지고 있으니 하우스키퍼를 배치하거나 청소를 진행해주세요.`);
            }
        }

        // --- 2-2. 전담 요리사 확인 및 식량 면제 처리 ---
        const assignedChef = house.assignedChefId ? allComps.find(c => c.id === house.assignedChefId) : null;
        let isChefActive = false;

        if (assignedChef) {
            const check = canChefManageHouse(assignedChef, house.type);
            if (check.allowed) {
                isChefActive = true;
                // 전담 요리사 요리 숙련도 경험치 획득
                if (!assignedChef.professions) assignedChef.professions = {};
                if (!assignedChef.professions.cooking) assignedChef.professions.cooking = { level: 1, exp: 0, maxExp: 100 };

                const mastery = assignedChef.professions.cooking;
                const oldRankInfo = getCompanionChefRank(assignedChef);
                mastery.exp += Math.max(10, 15 * days);
                while (mastery.exp >= mastery.maxExp) {
                    mastery.exp -= mastery.maxExp;
                    mastery.level += 1;
                    mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                }
                const newRankInfo = getCompanionChefRank(assignedChef);
                if (newRankInfo.rank !== oldRankInfo.rank) {
                    eventLogs.push(`[요리사 승급] '${house.name}'의 식사를 도맡은 ${assignedChef.name}의 요리 등급이 [${newRankInfo.label}]으로 승급했습니다! (Lv.${mastery.level})`);
                }
                updateInLists(assignedChef);

                if (residents.length > 0 && Math.random() < 0.15) {
                    eventLogs.push(`[전담 요리] '${house.name}'의 전담 요리사 ${assignedChef.name}이(가) 특식을 준비하여 거주자 ${residents.length}명의 식량이 절약되었습니다.`);
                }
            }
        }

        // 전담 요리사가 없는 주택의 거주자들은 일반 식량 필요 대상
        if (!isChefActive && residents.length > 0) {
            residents.forEach(r => hungryCompanions.push(r));
        }

        // 초호화 주택 (LUXURY) 효과
        if (house.type === 'luxury_house') {
            residents.forEach(comp => {
                const oldFaith = comp.faith || 50;
                comp.faith = Math.min(100, oldFaith + Math.max(1, Math.floor(days * 2)));
                if (comp.loyalty !== undefined) {
                    comp.loyalty = Math.min(100, comp.loyalty + Math.max(1, Math.floor(days * 2)));
                }
                updateInLists(comp);
                
                if (days >= 1 && Math.random() < 0.4) {
                    eventLogs.push(`[초호화 주택] '${house.name}'의 우수한 시설 덕에 ${comp.name}의 충성도와 호감도가 최고치로 상승했습니다!`);
                }
            });
        }
    });

    // --- 2-3. 일일 식량 소비 및 요리 시설 감면, 식량 부족 패널티 처리 ---
    if (newChar.base.resources && hungryCompanions.length > 0) {
        // 요리 시설에 배치된 요리사 확인
        const cookingFacility = newChar.base.layout?.find((inst: any) => inst.type === 'cooking');
        let hasFacilityChef = false;
        if (cookingFacility) {
            const workerIds: string[] = newChar.base.multiAssignments?.[cookingFacility.id] || (newChar.base.assignments?.[cookingFacility.id] ? [newChar.base.assignments[cookingFacility.id]] : []);
            const facilityWorkers = allComps.filter(c => workerIds.includes(c.id));
            const facilityChef = facilityWorkers.find(w => w.job === JobType.CHEF || (w.job as string) === '요리사' || (w.professions?.cooking?.level || 0) > 0);
            if (facilityChef) {
                hasFacilityChef = true;
                // 요리 시설 요리사 경험치 부여
                if (!facilityChef.professions) facilityChef.professions = {};
                if (!facilityChef.professions.cooking) facilityChef.professions.cooking = { level: 1, exp: 0, maxExp: 100 };
                facilityChef.professions.cooking.exp += Math.max(5, 10 * days);
                while (facilityChef.professions.cooking.exp >= facilityChef.professions.cooking.maxExp) {
                    facilityChef.professions.cooking.exp -= facilityChef.professions.cooking.maxExp;
                    facilityChef.professions.cooking.level += 1;
                    facilityChef.professions.cooking.maxExp = Math.floor(facilityChef.professions.cooking.maxExp * 1.2);
                }
                updateInLists(facilityChef);
            }
        }

        // 기본 1인당 1일 1식량 소모, 요리 시설 요리사 담당 시 50% 반감
        const dailyRatePerPerson = hasFacilityChef ? 0.5 : 1.0;
        const totalDailyNeed = Math.ceil(hungryCompanions.length * dailyRatePerPerson);
        const totalFoodRequired = totalDailyNeed * days;

        const currentFood = newChar.base.resources.food || 0;

        if (currentFood >= totalFoodRequired) {
            foodConsumed = totalFoodRequired;
            newChar.base.resources.food = Math.max(0, currentFood - totalFoodRequired);
        } else {
            foodConsumed = currentFood;
            // 식량 부족 발생!
            newChar.base.resources.food = 0;
            const starvationPenalty = Math.max(2, Math.floor(days * 2));
            
            hungryCompanions.forEach(comp => {
                const oldAff = comp.affection || 50;
                const oldFaith = comp.faith || 50;
                const oldLoyalty = comp.loyalty !== undefined ? comp.loyalty : 50;

                comp.affection = Math.max(0, oldAff - starvationPenalty);
                comp.faith = Math.max(0, oldFaith - starvationPenalty);
                comp.loyalty = Math.max(0, oldLoyalty - starvationPenalty);
                updateInLists(comp);
            });

            eventLogs.push(`[⚠️ 식량 부족] 기지의 식량이 고갈되어 숙소 거주 동료(${hungryCompanions.length}명)가 굶주렸습니다! 호감도(-${starvationPenalty})와 충성도(-${starvationPenalty})가 하락했습니다. (농장 수확 또는 식량 확보 필요)`);
        }
    }

    // 3. 같은 집에 사는 동료 간 교류 확률 증대
    const disableCommonCohouse = isCommonCompanionInteractionDisabled(newChar);
    Object.entries(residentsByHouse).forEach(([houseId, residents]) => {
        if (residents.length < 2) return;
        const houseObj = houses.find(h => h.id === houseId);
        const houseName = houseObj?.name || "공동 주택";

        const cohouseChance = Math.min(0.85, 0.35 + (residents.length * 0.05));
        if (Math.random() < cohouseChance) {
            const idx1 = Math.floor(Math.random() * residents.length);
            let idx2 = Math.floor(Math.random() * residents.length);
            while (idx1 === idx2) idx2 = Math.floor(Math.random() * residents.length);

            const c1 = residents[idx1];
            const c2 = residents[idx2];

            // 일반동료 상호교류 OFF 설정 시 일반동료 간 교류 스킵
            if (disableCommonCohouse && (isCommonCompanion(c1) || isCommonCompanion(c2))) {
                return;
            }

            if (!c1.relations) c1.relations = {};
            if (!c2.relations) c2.relations = {};

            const rel1 = c1.relations[c2.id] || { targetId: c2.id, affection: 0, type: RelationType.ALLY };
            const rel2 = c2.relations[c1.id] || { targetId: c1.id, affection: 0, type: RelationType.ALLY };

            const roll = Math.random();
            const isSibling = rel1.type === RelationType.SIBLING || rel2.type === RelationType.SIBLING;

            if (isSibling) {
                rel1.type = RelationType.SIBLING;
                rel2.type = RelationType.SIBLING;
                rel1.affection = Math.min(100, rel1.affection + 6);
                rel2.affection = Math.min(100, rel2.affection + 6);
                eventLogs.push(`[한지붕 가족] '${houseName}'에서 함께 생활하는 ${c1.name}와(과) ${c2.name} 남매/형제가 오순도순 이야기를 나누며 돈독한 정을 쌓았습니다.`);
            } else if (roll < 0.6) {
                rel1.affection = Math.min(100, rel1.affection + 8);
                rel2.affection = Math.min(100, rel2.affection + 8);
                eventLogs.push(`[동거 교류] '${houseName}'에서 함께 지내는 ${c1.name}와(과) ${c2.name}이(가) 일상을 공유하며 깊은 친밀감을 다졌습니다.`);
                if (rel1.affection >= 40 && rel1.type === RelationType.ALLY) {
                    rel1.type = RelationType.FRIEND;
                    rel2.type = RelationType.FRIEND;
                    eventLogs.push(`[주택 인연] 같은 집에 사는 ${c1.name}와(과) ${c2.name}이(가) 다정한 친구가 되었습니다.`);
                }
            } else if (roll < 0.85) {
                if (rel1.type === RelationType.CONFLICT) {
                    rel1.type = RelationType.ALLY;
                    rel2.type = RelationType.ALLY;
                    rel1.affection = 10;
                    rel2.affection = 10;
                    eventLogs.push(`[동거 화해] '${houseName}'에서 한솥밥을 먹으며 ${c1.name}와(과) ${c2.name}의 갈등이 해소되었습니다.`);
                } else {
                    rel1.affection = Math.min(100, rel1.affection + 4);
                    rel2.affection = Math.min(100, rel2.affection + 4);
                    eventLogs.push(`[주택 일상] ${c1.name}와(과) ${c2.name}이(가) 거실에서 오손도손 담소를 나누었습니다.`);
                }
            } else {
                if (c1.gender !== c2.gender && !c1.isLover && !c2.isLover && !isSibling) {
                    const currentYear = getYear(character.currentDate || '2000-01-01');
                    if (!canStartRomance(c1, c2, currentYear)) {
                        // 미성년자 <-> 성인 간에는 썸 기류 대신 따뜻한 동거 가족/동료 일상
                        rel1.affection = Math.min(100, rel1.affection + 6);
                        rel2.affection = Math.min(100, rel2.affection + 6);
                        eventLogs.push(`[주택 일상] 같은 집에 사는 ${c1.name}와(과) ${c2.name}이(가) 서로를 따뜻하게 챙겨주며 정을 쌓았습니다.`);
                    } else {
                        rel1.affection = Math.min(100, rel1.affection + 15);
                        rel2.affection = Math.min(100, rel2.affection + 15);
                        if (rel1.type !== RelationType.LOVER) {
                            rel1.type = RelationType.FLIRT;
                            rel2.type = RelationType.FLIRT;
                            eventLogs.push(`[한지붕 썸] 같은 집에 거주하는 ${c1.name}와(과) ${c2.name} 사이에 묘한 핑크빛 기류가 감돕니다!`);
                        }
                    }
                }
            }

            c1.relations[c2.id] = rel1;
            c2.relations[c1.id] = rel2;

            updateInLists(c1);
            updateInLists(c2);
        }
    });

    return { updatedChar: newChar, eventLogs, foodConsumed };
};

/**
 * 플레이어의 중재/합동 훈련 시도 로직
 */
export const mediateCompanionRelation = (
    character: Character,
    compId1: string,
    compId2: string,
    actionType: 'RECONCILE' | 'JOINT_TRAIN'
): { success: boolean, chance: number, log: string } => {
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    const c1 = allComps.find(c => c.id === compId1);
    const c2 = allComps.find(c => c.id === compId2);
    
    if (!c1 || !c2) return { success: false, chance: 0, log: "동료를 찾을 수 없습니다." };

    // 성공 확률 계산: (WIS + CTRL) * 0.1 + 30%
    const playerStats = character.stats;
    const baseChance = 30;
    const statBonus = (playerStats.wis + playerStats.ctrl) * 0.1;
    const finalChance = Math.min(95, Math.max(10, Math.floor(baseChance + statBonus)));

    const roll = Math.random() * 100;
    const isSuccess = roll < finalChance;

    if (isSuccess) {
        if (actionType === 'RECONCILE') {
            return { success: true, chance: finalChance, log: `${c1.name}와(과) ${c2.name}의 오해를 풀어주고 화해시켰습니다. (갈등 해소)` };
        } else {
            return { success: true, chance: finalChance, log: `${c1.name}와(과) ${c2.name}이(가) 서로의 기술을 교류하며 실력을 키웠습니다. (동료애 상승)` };
        }
    } else {
        return { success: false, chance: finalChance, log: `당신의 중재에도 불구하고 두 사람 사이의 앙금이 여전히 남아있습니다.` };
    }
};

/**
 * 파티 내 동료 관계 및 플레이어와의 인연에 따른 시너지 효과를 계산합니다.
 */
export const getPartySynergyBonus = (companions: Companion[], character?: Character): { atk: number, def: number, msg: string[] } => {
    let atk = 0;
    let def = 0;
    const msg: string[] = [];

    // 1. 동료간 인연 시너지
    for (let i = 0; i < companions.length; i++) {
        for (let j = i + 1; j < companions.length; j++) {
            const c1 = companions[i];
            const c2 = companions[j];
            const rel = c1.relations?.[c2.id];

            if (rel) {
                if (rel.type === RelationType.SIBLING) {
                    const aff = rel.affection !== undefined ? rel.affection : 75;
                    if (aff <= 30) {
                        msg.push(`${c1.name} & ${c2.name}: 형제간 소원함 (호감도 ${aff}/100 - 시너지 미적용)`);
                    } else {
                        const isHalf = rel.isHalf || isHalfSibling(c1, c2);
                        if (isHalf) {
                            atk += 0.025; def += 0.025;
                            msg.push(`${c1.name} & ${c2.name}: 이복/이부 형제 (공방+2.5%)`);
                        } else {
                            atk += 0.06; def += 0.06;
                            msg.push(`${c1.name} & ${c2.name}: 친형제의 우애 (공방+6%)`);
                        }
                    }
                } else if (rel.type === RelationType.BEST_FRIEND || rel.type === RelationType.SPOUSE) {
                    atk += 0.05; def += 0.05;
                    msg.push(`${c1.name} & ${c2.name}: 깊은 유대 (공방+5%)`);
                } else if (rel.type === RelationType.LOVER) {
                    atk += 0.08;
                    msg.push(`${c1.name} & ${c2.name}: 연인의 힘 (공격+8%)`);
                } else if (rel.type === RelationType.RIVAL) {
                    atk += 0.10; def -= 0.05;
                    msg.push(`${c1.name} & ${c2.name}: 라이벌 의식 (공격+10%, 방어-5%)`);
                } else if (rel.type === RelationType.CONFLICT) {
                    def -= 0.10;
                    msg.push(`${c1.name} & ${c2.name}: 불협화음 (방어-10%)`);
                }
            }
        }
    }

    // 2. 플레이어 <-> 동료 형제 시너지 (character 정보 제공 시)
    if (character) {
        for (const c of companions) {
            if (c.relation === RelationType.SIBLING) {
                const aff = c.affection !== undefined ? c.affection : 75;
                if (aff <= 30) {
                    msg.push(`${character.name} & ${c.name}: 형제간 소원함 (호감도 ${aff}/100 - 시너지 미적용)`);
                } else {
                    const isHalf = isHalfSibling(character, c, character);
                    if (isHalf) {
                        atk += 0.025; def += 0.025;
                        msg.push(`${character.name} & ${c.name}: 플레이어 이복/이부 형제 (공방+2.5%)`);
                    } else {
                        atk += 0.06; def += 0.06;
                        msg.push(`${character.name} & ${c.name}: 플레이어 친형제 우애 (공방+6%)`);
                    }
                }
            }
        }
    }

    return { atk, def, msg };
};

/**
 * [NEW] 특정 두 대상 간(플레이어-동료 또는 동료-동료)의 인연 스킬을 삭제합니다.
 */
export const removeBondSkillsBetween = (character: Character, entityAId: string, entityBId: string): Character => {
    if (!character.bondSkills || character.bondSkills.length === 0) return character;

    const isAPlayer = entityAId === 'player';
    const isBPlayer = entityBId === 'player';

    const updatedBondSkills = character.bondSkills.filter(bs => {
        if (isAPlayer || isBPlayer) {
            const compId = isAPlayer ? entityBId : entityAId;
            const isPairWithPlayer = (
                (bs.companionId === compId && (!bs.sourceId || bs.sourceId === 'player')) ||
                (bs.sourceId === compId && (!bs.companionId || bs.companionId === 'player'))
            );
            return !isPairWithPlayer;
        } else {
            const isPairBetweenComps = (
                (bs.companionId === entityAId && bs.sourceId === entityBId) ||
                (bs.companionId === entityBId && bs.sourceId === entityAId)
            );
            return !isPairBetweenComps;
        }
    });

    if (updatedBondSkills.length !== character.bondSkills.length) {
        return {
            ...character,
            bondSkills: updatedBondSkills
        };
    }
    return character;
};

/**
 * [NEW] 연인/배우자 관계가 해제되었거나 유대 조건이 더 이상 충족되지 않는 무효 인연 스킬을 자동 정리합니다.
 */
/**
 * 유효하지 않은 인연 스킬을 정리합니다.
 * (관계가 끊어지거나, 연인 기간 1년 미만(비배우자/비10년유대), 사망 등으로 파트너가 무효화된 경우 자동 제거)
 */
export const cleanInvalidBondSkills = (character: Character): Character => {
    if (!character || !character.bondSkills || character.bondSkills.length === 0) return character;

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])].filter(c => c && !c.isDead && !c.isPurged);
    const currentYear = character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 0;
    const getYearsKnown = (comp: Companion) => Math.max(0, currentYear - (comp.metYear || currentYear));
    const getYearsTogether = (c1: Companion, c2: Companion) => Math.max(0, currentYear - Math.max(c1.metYear || currentYear, c2.metYear || currentYear));

    const getMonthsDiff = (startDate?: string, endDate?: string): number => {
        if (!startDate || !endDate) return 0;
        try {
            const [y1, m1] = startDate.split('-').map(Number);
            const [y2, m2] = endDate.split('-').map(Number);
            if (!isNaN(y1) && !isNaN(y2)) {
                return Math.max(0, (y2 - y1) * 12 + ((m2 || 1) - (m1 || 1)));
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            const years = end.getFullYear() - start.getFullYear();
            const months = end.getMonth() - start.getMonth();
            return Math.max(0, (years * 12) + months);
        } catch {
            return 0;
        }
    };

    const getLoverMonths = (c1: Companion, partner?: Companion): number => {
        const startDate = c1.loverStartDate || partner?.loverStartDate;
        if (startDate && character.currentDate) {
            return getMonthsDiff(startDate, character.currentDate);
        }
        const currYear = character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 2000;
        const met = Math.max(c1.metYear || currYear, partner?.metYear || currYear);
        return Math.max(0, (currYear - met) * 12);
    };

    const validBondSkills = (character.bondSkills || []).filter(bs => {
        const isSourcePlayer = !bs.sourceId || bs.sourceId === 'player';
        
        // 대상 동료 찾기
        const targetComp = allComps.find(c => c.id === bs.companionId || c.name === bs.companionName);
        if (!targetComp) return false;

        if (isSourcePlayer) {
            // 플레이어와의 관계 검증
            const isPlayerSpouse = Boolean(targetComp.isSpouse && (targetComp.partnerId === 'player' || (!targetComp.partnerId && !targetComp.partnerName)));
            const isPlayerLover = Boolean(targetComp.isLover && (targetComp.partnerId === 'player' || (!targetComp.partnerId && !targetComp.partnerName)));
            const isLover1Year = isPlayerLover && getLoverMonths(targetComp) >= 12;
            const hasBondBonus = targetComp.affection >= 90 && getYearsKnown(targetComp) >= 10;
            return isPlayerSpouse || isLover1Year || hasBondBonus;
        } else {
            // 동료 간의 관계 검증
            const sourceComp = allComps.find(c => c.id === bs.sourceId || c.name === bs.sourceName);
            if (!sourceComp) return false;

            const isSpouseWithEachOther = Boolean(
                (sourceComp.isSpouse && (sourceComp.partnerId === targetComp.id || sourceComp.partnerName === targetComp.name)) ||
                (targetComp.isSpouse && (targetComp.partnerId === sourceComp.id || targetComp.partnerName === sourceComp.name)) ||
                sourceComp.relations?.[targetComp.id]?.type === '배우자' ||
                targetComp.relations?.[sourceComp.id]?.type === '배우자' ||
                sourceComp.relations?.[targetComp.id]?.type === RelationType.SPOUSE ||
                targetComp.relations?.[sourceComp.id]?.type === RelationType.SPOUSE
            );

            const isLoverWithEachOther = Boolean(
                (sourceComp.isLover && (sourceComp.partnerId === targetComp.id || sourceComp.partnerName === targetComp.name)) ||
                (targetComp.isLover && (targetComp.partnerId === sourceComp.id || targetComp.partnerName === sourceComp.name)) ||
                sourceComp.relations?.[targetComp.id]?.type === '연인' ||
                targetComp.relations?.[sourceComp.id]?.type === '연인' ||
                sourceComp.relations?.[targetComp.id]?.type === RelationType.LOVER ||
                targetComp.relations?.[sourceComp.id]?.type === RelationType.LOVER
            );

            const isLover1Year = isLoverWithEachOther && getLoverMonths(sourceComp, targetComp) >= 12;
            const yearsTogether = getYearsTogether(sourceComp, targetComp);
            const has10YearsBond = yearsTogether >= 10;

            // 동료 ↔ 동료: 배우자, 1년 이상 연인, 또는 함께한 세월이 10년 이상이어야 유효
            return isSpouseWithEachOther || isLover1Year || has10YearsBond;
        }
    });

    if (validBondSkills.length !== character.bondSkills.length) {
        return {
            ...character,
            bondSkills: validBondSkills
        };
    }
    return character;
};

/**
 * [NEW] 원정대에 함께 참가한 동료들 간의 상호 호감도(Affection)를 상승시키고 관계 변화를 시뮬레이션합니다.
 */
export const applyExpeditionCompanionBonding = (
    character: Character,
    teamMemberIds: string[],
    months: number,
    outcome: 'Great' | 'Success' | 'Failure'
): { 
    updatedChar: Character; 
    bondingLogs: string[]; 
    pairDetails: { names: string; gain: number; newAffection: number }[];
    totalGain: number;
} => {
    let newChar = { ...character };
    const bondingLogs: string[] = [];
    const pairDetails: { names: string; gain: number; newAffection: number }[] = [];

    if (!teamMemberIds || teamMemberIds.length < 2) {
        return { updatedChar: newChar, bondingLogs, pairDetails, totalGain: 0 };
    }

    const updateInLists = (comp: Companion) => {
        const aIdx = newChar.companions.findIndex(pc => pc.id === comp.id);
        if (aIdx !== -1) newChar.companions[aIdx] = { ...comp };
        else if (newChar.inactiveCompanions) {
            const iIdx = newChar.inactiveCompanions.findIndex(pc => pc.id === comp.id);
            if (iIdx !== -1) newChar.inactiveCompanions[iIdx] = { ...comp };
        }
    };

    const getComp = (id: string): Companion | undefined => {
        return newChar.companions.find(c => c.id === id) || newChar.inactiveCompanions?.find(c => c.id === id);
    };

    const baseGain = outcome === 'Great' ? 8 : outcome === 'Success' ? 5 : 3;
    const durationBonus = Math.floor(months * 2.5);
    const totalAffinityGain = Math.min(40, baseGain + durationBonus);

    const handledPairs = new Set<string>();

    for (let i = 0; i < teamMemberIds.length; i++) {
        for (let j = i + 1; j < teamMemberIds.length; j++) {
            const id1 = teamMemberIds[i];
            const id2 = teamMemberIds[j];
            const pairKey = [id1, id2].sort().join('_');
            if (handledPairs.has(pairKey)) continue;
            handledPairs.add(pairKey);

            const c1 = getComp(id1);
            const c2 = getComp(id2);
            if (!c1 || !c2 || c1.isDead || c2.isDead) continue;

            if (!c1.relations) c1.relations = {};
            if (!c2.relations) c2.relations = {};

            const rel1 = c1.relations[c2.id] || { targetId: c2.id, affection: 0, type: RelationType.ALLY };
            const rel2 = c2.relations[c1.id] || { targetId: c1.id, affection: 0, type: RelationType.ALLY };

            const isSibling = rel1.type === RelationType.SIBLING || rel2.type === RelationType.SIBLING;

            // 호감도 증가
            rel1.affection = Math.min(100, (rel1.affection || 0) + totalAffinityGain);
            rel2.affection = Math.min(100, (rel2.affection || 0) + totalAffinityGain);

            pairDetails.push({
                names: `${c1.name} & ${c2.name}`,
                gain: totalAffinityGain,
                newAffection: rel1.affection
            });

            // 호감도 상승에 따른 관계 발전 체크
            if (!isSibling) {
                if (rel1.type === RelationType.CONFLICT && rel1.affection >= 0) {
                    rel1.type = RelationType.ALLY;
                    rel2.type = RelationType.ALLY;
                    bondingLogs.push(`[원정 화해] 사선을 함께 넘나든 ${c1.name}와(과) ${c2.name}이(가) 지난 갈등을 털어내고 다시 신뢰하는 동료가 되었습니다.`);
                } else if (rel1.type === RelationType.ALLY && rel1.affection >= 50) {
                    rel1.type = RelationType.FRIEND;
                    rel2.type = RelationType.FRIEND;
                    bondingLogs.push(`[원정 우정] 긴 원정 동안 생사고락을 함께한 ${c1.name}와(과) ${c2.name}이(가) 깊은 우정을 나누는 친구가 되었습니다.`);
                } else if (rel1.type === RelationType.FRIEND && rel1.affection >= 85) {
                    rel1.type = RelationType.BEST_FRIEND;
                    rel2.type = RelationType.BEST_FRIEND;
                    bondingLogs.push(`[원정 절친] 수많은 전투를 겪으며 완벽한 호흡을 맞춘 ${c1.name}와(과) ${c2.name}이(가) 둘도 없는 절친한 동료가 되었습니다.`);
                }
            }

            c1.relations[c2.id] = rel1;
            c2.relations[c1.id] = rel2;
            updateInLists(c1);
            updateInLists(c2);
        }
    }

    return { updatedChar: newChar, bondingLogs, pairDetails, totalGain: totalAffinityGain };
};

