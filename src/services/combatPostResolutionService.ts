import {
    Character,
    CombatState,
    Companion,
    ClassTier,
    DiplomaticStatus,
    DivineDiplomacyStatus,
    Enemy,
    Item,
    JobType,
    MilitaryRank,
    TournamentPostMatchData
} from '../types';
import {
    INITIAL_BASE,
    MILITARY_RANK_ORDER,
    START_DATE,
    WORLD_GEOGRAPHY
} from '../constants';
import {
    addDays,
    addMasteryExp,
    calculateRewardBonuses,
    checkAndApplyLevelUp,
    generateTournamentBracket,
    getWeaponTypeFromItem
} from '../utils';
import { DIVINE_WAR_CONSTANTS } from '../divineWarSystem';
import { NATION_RELICS } from '../nationLoreData';
import { GET_CITY_BY_MESSENGER_JOB } from '../templedefensesystem';
import { checkVassalTransition, VASSAL_DURATION_YEARS } from '../vassalsystem';
import { isMessengerJob } from '../messengerofgodvisual';
import { applySparringManualCombatResult } from './sparringCombatService';
import {
    calculateRivalAmbushVictoryExp,
    rollSuddenPostCombatEvent
} from './suddenEventService';
import { safeAddMemory } from './combatPerformanceService';

export interface PostCombatResolutionCallbacks {
    addToLog: (msg: string) => void;
    setResultModalData: (data: any) => void;
    setPendingTempleConquest: (target: string | null) => void;
    setPendingTournamentPostMatch: (data: TournamentPostMatchData | null) => void;
    setPendingRelationResolution: (data: { targetId: string; enemy: Enemy } | null) => void;
    setIsDungeonOpen: (open: boolean) => void;
}

export interface PostCombatResolutionParams {
    character: Character;
    combatState: CombatState;
    defeatedEnemies: Enemy[];
    isVictory: boolean;
    expGain: number;
    goldGain: number;
    callbacks: PostCombatResolutionCallbacks;
}

export interface PostCombatResolutionResult {
    updatedChar: Character;
    bonusExp: number;
    bonusGold: number;
    suddenEvent: any;
    /** true이면 App.tsx의 dungeon useEffect에서 중복 모달/로그가 뜨지 않도록 표시 */
    dungeonDefeatHandled?: boolean;
}

const findNationByCityLocal = (cityName: string): string => {
    if (!cityName) return '양의 기운의 성전';
    for (const region in WORLD_GEOGRAPHY) {
        for (const nation in WORLD_GEOGRAPHY[region]) {
            if (nation === cityName) return nation;
            const data = WORLD_GEOGRAPHY[region][nation];
            if (data.cities && Array.isArray(data.cities) && data.cities.includes(cityName)) {
                return nation;
            }
        }
    }
    return cityName.includes('성전') || cityName.includes('성소') || cityName.includes('성화')
        ? cityName
        : '양의 기운의 성전';
};

const getCommanderInfo = (char: Character) => {
    const loc = char.currentLocation || { nation: '대한민국', city: '서울' };
    const eligiblePlayer =
        char.job === JobType.SOLDIER && char.nation === loc.nation
            ? {
                  id: 'player',
                  name: char.name,
                  rank: char.militaryRank || MilitaryRank.PVT,
                  rankIdx: MILITARY_RANK_ORDER.indexOf(char.militaryRank || MilitaryRank.PVT)
              }
            : null;

    const eligibleCompanions = [...(char.companions || []), ...(char.inactiveCompanions || [])]
        .filter(c => c.job === JobType.SOLDIER && c.nation === loc.nation && c.militaryRank)
        .map(c => ({
            id: c.id,
            name: c.name,
            rank: c.militaryRank!,
            rankIdx: MILITARY_RANK_ORDER.indexOf(c.militaryRank!)
        }));

    const allSoldiers = [...(eligiblePlayer ? [eligiblePlayer] : []), ...eligibleCompanions];
    if (allSoldiers.length === 0) return null;
    return allSoldiers.sort((a, b) => b.rankIdx - a.rankIdx)[0];
};

const addMemoryLocal = (char: Character, content: string) => {
    safeAddMemory(char, content, char.currentDate || START_DATE);
};

const MESSENGER_JOBS: JobType[] = [
    JobType.SOLAR_MESSENGER,
    JobType.FIRE_MESSENGER,
    JobType.RADIANT_MESSENGER,
    JobType.MOONLIGHT_MESSENGER,
    JobType.ELECTRIC_MESSENGER,
    JobType.EARTH_MESSENGER,
    JobType.GALE_MESSENGER,
    JobType.ICE_MESSENGER,
    JobType.SEA_MESSENGER,
    JobType.STEEL_MESSENGER,
    JobType.DARK_MESSENGER,
    JobType.NATURE_MESSENGER,
    JobType.VOID_MESSENGER
];

/**
 * BG3 통합 전투 종료 시 useGame.ts의 모든 전투 승리/패배 이벤트 로직을 100% 빠짐없이 실행하는 통합 정산 서비스.
 * (던전 패배, 토너먼트, 그랜드 아레나, 초월 아레나, 무한 심연의 탑, 신성 국가 정벌, 성전 침공/방어,
 *  신의 반란, 마계 성전 정벌/신 살해, 전쟁 습격/방어, 현상수배/현상금, 학교 시험/대련/라이벌,
 *  클래스 승급 시련, 돌발 이벤트 보상 등을 모두 포괄합니다.)
 */
export const resolvePostCombatEvents = ({
    character,
    combatState,
    defeatedEnemies,
    isVictory,
    expGain,
    goldGain,
    callbacks
}: PostCombatResolutionParams): PostCombatResolutionResult => {
    let finalChar: Character = {
        ...character,
        stats: { ...character.stats },
        companions: (character.companions || []).map(c => ({ ...c, stats: { ...c.stats } }))
    };
    const {
        addToLog,
        setResultModalData,
        setPendingTempleConquest,
        setPendingTournamentPostMatch,
        setPendingRelationResolution,
        setIsDungeonOpen
    } = callbacks;

    const contextType = String(combatState?.type || '');
    const currentNation = (combatState as any)?.sourceId || finalChar.currentLocation?.nation;
    let bonusExp = 0;
    let bonusGold = 0;
    let suddenEvent: any = null;
    let dungeonDefeatHandled = false;

    // 0. 대련(sparring / sparring_arena / isSparringPartner) — 승패 공통 처리
    const isSparringBattle =
        contextType === 'sparring_arena' ||
        contextType === 'sparring' ||
        defeatedEnemies.some((e: Enemy) => Boolean((e as any).isSparringPartner));
    if (isSparringBattle) {
        const sparringEnemy =
            defeatedEnemies.find((e: Enemy) => Boolean((e as any).isSparringPartner)) || defeatedEnemies[0];
        if (sparringEnemy) {
            try {
                const sparringRes = applySparringManualCombatResult(finalChar, sparringEnemy as any, isVictory);
                if (sparringRes?.updatedCharacter) {
                    finalChar = sparringRes.updatedCharacter;
                }
                if (sparringRes?.resultLog) {
                    addToLog(sparringRes.resultLog);
                }
                if (sparringRes?.resultModalData) {
                    setResultModalData(sparringRes.resultModalData as any);
                }
            } catch {
                // ignore
            }
        }
    }

    // =========================================================================
    // A. 패배(DEFEAT) 이벤트 처리
    // =========================================================================
    if (!isVictory) {
        // A-1. 던전 / 인스턴트 던전 패배 (즉시 진행도 초기화 + 던전 모달 닫기 + 안내 모달)
        if (
            contextType === 'dungeon' ||
            contextType === 'instant_dungeon' ||
            (finalChar.dungeonProgress && (contextType === 'boss' || contextType === 'dungeon_boss'))
        ) {
            finalChar.dungeonProgress = undefined;
            setIsDungeonOpen(false);
            dungeonDefeatHandled = true;
            addToLog('[던전 실패] 전투에서 패배하여 던전 밖으로 안전하게 후송 퇴각했습니다.');
            setResultModalData({
                type: 'failure',
                title: '던전 패배 및 귀환',
                message: '던전 전투에서 패배하여 던전 밖으로 안전하게 후송 퇴각했습니다.',
                items: [
                    { label: '던전 진행', after: '초기화' },
                    { label: '퇴각', after: '마을로 후송' }
                ]
            });
        }

        // A-2. 학교 토너먼트 패배
        if (contextType === 'tournament' && finalChar.schoolData?.currentTournament) {
            const schoolData = { ...finalChar.schoolData };
            const currentTournament = { ...schoolData.currentTournament! };
            const currentRound = currentTournament.currentRound;
            currentTournament.isActive = false;
            const history = {
                schoolPlacement: 32,
                nationalPlacement: 64,
                worldPlacement: 64,
                ...(schoolData.tournamentHistory || {})
            };
            if (currentTournament.key === 'high_school') history.schoolPlacement = currentRound;
            else if (currentTournament.key === 'high_national') history.nationalPlacement = currentRound;
            else if (currentTournament.key === 'high_world') history.worldPlacement = currentRound;
            schoolData.currentTournament = currentTournament;
            schoolData.tournamentHistory = history;
            schoolData.lastTournamentDate = finalChar.currentDate?.substring(0, 7);
            finalChar.schoolData = schoolData;
            setResultModalData({
                type: 'failure',
                title: '토너먼트 탈락',
                message:
                    '아쉽게도 경기에서 패배하여 토너먼트에서 탈락했습니다.\n부상을 치료하고 내년을 기약하십시오.',
                items: [{ label: '결과', after: '탈락 (Eliminated)' }]
            });
        }

        // A-3. 그랜드 아레나 패배
        if (contextType === 'arena' && finalChar.mercenaryData?.arenaState) {
            finalChar.mercenaryData = {
                ...finalChar.mercenaryData,
                arenaState: {
                    ...finalChar.mercenaryData.arenaState,
                    isEliminated: true
                }
            };
            setResultModalData({
                type: 'failure',
                title: '아레나 패배',
                message: '그랜드 아레나의 높은 벽을 실감하며 패배했습니다.\n올해의 도전은 여기서 끝입니다.',
                items: [{ label: '상태', after: '탈락' }]
            });
        }

        // A-4. 초월 그랜드 아레나 패배
        if (contextType === 'transcendent_arena' && finalChar.transcendentArenaState) {
            finalChar.transcendentArenaState = {
                ...finalChar.transcendentArenaState,
                isEliminated: true
            };
            setResultModalData({
                type: 'failure',
                title: '초월 그랜드 아레나 패배',
                message: '만신전 초월자들의 벽을 실감하며 패배했습니다.\n다음 달 새 시즌에 다시 도전하세요.',
                items: [{ label: '상태', after: '이번 달 시즌 탈락' }]
            });
        }

        // A-5. 무한 심연의 탑 패배
        if ((contextType === 'abyss_tower_mob' || contextType === 'abyss_tower_boss') && finalChar.abyssTowerState) {
            finalChar.abyssTowerState = {
                ...finalChar.abyssTowerState,
                pendingTilePos: undefined
            };
            setResultModalData({
                type: 'failure',
                title: `심연 탑 ${finalChar.abyssTowerState.currentFloor || 1}F 교전 패퇴`,
                message: '심연의 적에게 밀려 전열을 재정비하기 위해 후퇴했습니다.',
                items: [{ label: '상태', after: '안전 구역 후퇴' }]
            });
        }

        // A-6. 신성 국가 침략 패배
        if (contextType === 'divine_invasion') {
            const targetNation = (combatState as any)?.sourceId || currentNation || '대상 국가';
            finalChar.infamy = (finalChar.infamy || 0) + 100;
            const templeKey = `${finalChar.currentLocation?.nation}_${finalChar.currentLocation?.city}`;
            if (finalChar.base?.templePersonnel?.[templeKey]) {
                finalChar.base = {
                    ...finalChar.base,
                    templePersonnel: {
                        ...finalChar.base.templePersonnel,
                        [templeKey]: {
                            ...finalChar.base.templePersonnel[templeKey],
                            majesty: Math.max(0, (finalChar.base.templePersonnel[templeKey].majesty || 0) - 2000)
                        }
                    }
                };
            }
            setResultModalData({
                type: 'failure',
                title: '침략 실패',
                message: `신의 이름으로 감행한 ${targetNation} 침략이 실패로 돌아갔습니다.\n성전의 위엄이 실추되고 당신의 악명만 높아졌습니다.`,
                items: [
                    { label: '악명도', after: '+100' },
                    { label: '위엄도', after: '-2000' }
                ]
            });
        }

        // A-7. 성전 침공 패배
        if (contextType === 'temple_invasion') {
            const targetTemple = (combatState as any)?.sourceId || '적 성전';
            const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
            if (myTempleCity) {
                const myTempleNation = findNationByCityLocal(myTempleCity);
                const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                if (finalChar.base?.templePersonnel?.[myTempleKey]) {
                    finalChar.base = {
                        ...finalChar.base,
                        templePersonnel: {
                            ...finalChar.base.templePersonnel,
                            [myTempleKey]: {
                                ...finalChar.base.templePersonnel[myTempleKey],
                                majesty: Math.max(0, (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 2000)
                            }
                        }
                    };
                }
            }
            setResultModalData({
                type: 'failure',
                title: '침공 패퇴',
                message: `${targetTemple} 침공에 실패하여 우리 측 성전의 위엄이 크게 실추되었습니다.`,
                items: [{ label: '위엄도 변화', after: '-2000' }]
            });
        }

        // A-8. 신의 반란 패배
        if (contextType === 'god_rebellion') {
            const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
            if (myTempleCity) {
                const myTempleNation = findNationByCityLocal(myTempleCity);
                const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                if (finalChar.base?.templePersonnel?.[myTempleKey]) {
                    finalChar.base = {
                        ...finalChar.base,
                        templePersonnel: {
                            ...finalChar.base.templePersonnel,
                            [myTempleKey]: {
                                ...finalChar.base.templePersonnel[myTempleKey],
                                majesty: Math.max(0, (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 5000)
                            }
                        }
                    };
                }
            }
            setResultModalData({
                type: 'destroy',
                title: '반역 실패 및 신벌',
                message:
                    '신의 권능 앞에 무릎을 꿇었습니다. 성전은 파멸의 위기에 처했으며 당신의 위엄은 흔적도 없이 사라졌습니다.',
                items: [{ label: '위엄도 하락', after: '-5000' }]
            });
        }

        // A-9. 성전 방어 패배
        if (contextType === 'temple_defense') {
            const targetCity = (combatState as any)?.targetCity || finalChar.currentLocation?.city || '';
            const targetNation = (combatState as any)?.targetNation || findNationByCityLocal(targetCity);
            const templeKey = `${targetNation}_${targetCity}`;

            if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
            if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
            if (!finalChar.base.templePersonnel[templeKey]) {
                finalChar.base.templePersonnel[templeKey] = {
                    knightIds: [],
                    butlerIds: [],
                    maidIds: [],
                    majesty: 0
                };
            }

            const tp = { ...finalChar.base.templePersonnel[templeKey] };
            tp.majesty = Math.max(0, (tp.majesty || 0) - 500);
            finalChar.base = {
                ...finalChar.base,
                templePersonnel: {
                    ...finalChar.base.templePersonnel,
                    [templeKey]: tp
                }
            };

            if (tp.majesty <= 0 && isMessengerJob(finalChar.job)) {
                setResultModalData({
                    type: 'destroy',
                    title: '성전 함락',
                    message: `\n[성전 함락] ${targetCity}의 위엄이 바닥에 떨어졌습니다. 신께서 당신에게 부여한 사자의 직함을 거두셨습니다.`,
                    items: [{ label: '직업', after: '무직' }]
                });
                const demote = (m: any) => {
                    if (m.job && MESSENGER_JOBS.includes(m.job)) {
                        m.job = JobType.UNEMPLOYED;
                        m.classTier = ClassTier.NONE;
                    }
                };
                demote(finalChar);
                finalChar.companions.forEach(demote);
                if (finalChar.inactiveCompanions) {
                    finalChar.inactiveCompanions = finalChar.inactiveCompanions.map(c => {
                        const copy = { ...c };
                        demote(copy);
                        return copy;
                    });
                }
                addMemoryLocal(finalChar, `${targetCity} 성전 함락 및 사자 직위 박탈`);
            } else {
                setResultModalData({
                    type: 'destroy',
                    title: '패전',
                    message: `[성전 패전] 방어에 실패하여 성전의 위엄도가 500 하락했습니다.`,
                    items: [{ label: '성전위엄도', after: '-500' }]
                });
            }
        }

        // A-10. 현상수배 체포전 패배 (2% 기적 탈출 / 98% 체포 및 투옥)
        if (contextType === 'wanted_battle') {
            const escapeRoll = Math.random();
            if (escapeRoll < 0.02) {
                finalChar.stats.hp = 1;
                finalChar.statusEffects = [];
                setResultModalData({
                    type: 'failure',
                    title: '기적적 탈출',
                    message: '치명상을 입었지만 관군의 포위망 틈새로 기적적으로 몸을 빼내어 도주했습니다!',
                    items: [{ label: '상태', after: '체포 회피 (HP 1)' }]
                });
            } else {
                const currentInfamy = finalChar.infamy || 0;
                const jailDays = Math.max(1, currentInfamy * 40);
                const releaseDate = addDays(finalChar.currentDate || START_DATE, jailDays);

                finalChar.currentDate = releaseDate;
                finalChar.infamy = 0;
                finalChar.stats.hp = finalChar.stats.maxHp;
                finalChar.stats.mp = finalChar.stats.maxMp;
                finalChar.statusEffects = [];

                finalChar.companions = finalChar.companions.map(c => ({
                    ...c,
                    stats: { ...c.stats, hp: c.stats.maxHp, mp: c.stats.maxMp },
                    statusEffects: []
                }));

                setResultModalData({
                    type: 'destroy',
                    title: '체포 및 투옥',
                    message: `패배하여 관군에게 체포되었습니다. ${jailDays}일간 복역 후 출소했습니다.`,
                    items: [
                        { label: '수감 기간', after: `${jailDays}일` },
                        { label: '출소일', after: releaseDate },
                        { label: '악명도', before: currentInfamy, after: '0' }
                    ]
                });
            }
        }

        // A-11. 마계 성전 정벌 / 마계 신 살해 패배
        if (contextType === 'magye_temple_invasion' || contextType === 'magye_god_slaying') {
            if (finalChar.magyeDominions) {
                const nextDom: typeof finalChar.magyeDominions = {};
                Object.entries(finalChar.magyeDominions).forEach(([k, dom]) => {
                    nextDom[k] = { ...dom, fear: Math.max(0, (dom.fear || 0) - 3000) };
                });
                finalChar.magyeDominions = nextDom;
            }
            addToLog('[패전] 신의 권능 앞에 제국군이 퇴각했습니다. 지배지의 공포도가 하락하고 반란 기운이 감돕니다.');
            setResultModalData({
                type: 'failure',
                title: '정벌 패퇴',
                message: '신의 권능 앞에 제국군이 퇴각했습니다. 모든 지배지의 공포도가 3,000 하락했습니다.',
                items: [{ label: '지배지 공포도', after: '-3,000' }]
            });
        }

        // A-12. 전쟁(습격/방어) 패배
        if (currentNation && (contextType === 'war_raid' || contextType === 'war_defend')) {
            if (finalChar.militaryData?.diplomacy?.[currentNation]) {
                const rel = { ...finalChar.militaryData.diplomacy[currentNation] };
                rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
                const transitionedRel = checkVassalTransition(rel, finalChar.currentDate);
                finalChar.militaryData = {
                    ...finalChar.militaryData,
                    diplomacy: {
                        ...finalChar.militaryData.diplomacy,
                        [currentNation]: transitionedRel
                    }
                };

                if (transitionedRel.status === DiplomaticStatus.VASSAL_SUBJECT) {
                    setResultModalData({
                        type: 'destroy',
                        title: '패전 및 속국 전락',
                        message: `적군에게 완전히 패배하여 전선이 붕괴되었습니다.\n이제 조국은 ${currentNation}의 지배 아래 놓이게 되었습니다.`,
                        items: [
                            { label: '전선 점유율', after: '-100%' },
                            { label: '국가 상태', after: '속국 (Subject)' }
                        ]
                    });
                } else {
                    setResultModalData({
                        type: 'failure',
                        title: '전선 패배',
                        message: `전투에서 패배하여 후퇴했습니다.\n적들이 우리 영토의 상당 부분을 장악했습니다.`,
                        items: [{ label: '점유율 변동', after: '-10% (후퇴)' }]
                    });
                }
            }
        }

        return { updatedChar: finalChar, bonusExp, bonusGold, suddenEvent: null, dungeonDefeatHandled };
    }

    // =========================================================================
    // B. 승리(VICTORY) 이벤트 처리
    // =========================================================================

    // B-0. 돌발 이벤트 전투 추가 보상 (숙적 기습 폭풍 경험치 / 차원 균열 결정 숙련도 보너스)
    const suddenEventType = (combatState as any)?.suddenEventType;
    if (suddenEventType === 'rival_ambush') {
        const lvCount = (combatState as any)?.suddenLevelUpCount || Math.floor(Math.random() * 3) + 1;
        const rivalBonusExp = calculateRivalAmbushVictoryExp(finalChar.level || 1, lvCount);
        bonusExp += rivalBonusExp;
        finalChar.currentExp = (finalChar.currentExp || 0) + rivalBonusExp;
        finalChar.companions = finalChar.companions.map(c =>
            c.stats.hp > 0 && !c.isDead ? { ...c, currentExp: (c.currentExp || 0) + rivalBonusExp } : c
        );
        const lvRes = checkAndApplyLevelUp(finalChar, { skipInactive: true });
        finalChar = lvRes.updatedChar;
        addToLog(
            `[시스템] ⚔️ 기습 난입한 숙적을 격퇴하여 즉시 ${lvCount}레벨업 분량의 폭풍 경험치(+${rivalBonusExp.toLocaleString()} EXP)를 획득했습니다!`
        );
    } else if (suddenEventType === 'rift_crystal' || defeatedEnemies.some((e: any) => e.isRiftCrystal)) {
        const masteryBonus = (combatState as any)?.suddenMasteryBonus || 50;
        const mainWep = finalChar.equipment?.weapon || (finalChar.equipment as any)?.Weapon;
        if (mainWep) {
            const wType = getWeaponTypeFromItem(mainWep);
            if (wType) {
                finalChar = addMasteryExp(finalChar, wType, masteryBonus).char;
            }
        }
        addToLog(`[시스템] 🌌 차원 균열 결정을 파괴하여 막대한 무기 숙련도(+${masteryBonus})를 흡수했습니다!`);
    }

    // B-1. 신성 국가 정벌 승리
    if (contextType === 'divine_invasion' && currentNation) {
        const divineRel = finalChar.templeDiplomacy?.[currentNation];
        const isJustConquest = (divineRel?.tension || 0) < 100;
        if (isJustConquest) {
            finalChar.infamy = (finalChar.infamy || 0) + 200;
            const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
            if (myTempleCity) {
                const myTempleNation = findNationByCityLocal(myTempleCity);
                const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                if (!finalChar.base.templePersonnel[myTempleKey]) {
                    finalChar.base.templePersonnel[myTempleKey] = {
                        knightIds: [],
                        butlerIds: [],
                        maidIds: [],
                        majesty: 0
                    };
                }
                finalChar.base.templePersonnel[myTempleKey].majesty = Math.max(
                    0,
                    (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 500
                );
            }
        }
        finalChar.templeDiplomacy = {
            ...(finalChar.templeDiplomacy || {}),
            [currentNation]: {
                status: DivineDiplomacyStatus.SUBJUGATED,
                faithPoints: 0,
                tension: 0,
                influence: 100,
                subjugatedYears: 5,
                subjugatedStartDate: finalChar.currentDate,
                subjugatedEndDate: addDays(finalChar.currentDate || '2000-01-01', 1825),
                tributeLevel: 1
            }
        };
        if (finalChar.militaryData?.diplomacy?.[currentNation]) {
            const rel = { ...finalChar.militaryData.diplomacy[currentNation] };
            rel.status = DiplomaticStatus.VASSAL_OWNER;
            rel.occupation = 100;
            rel.tension = 100;
            rel.vassalYearsRemaining = VASSAL_DURATION_YEARS;
            rel.vassalStartDate = finalChar.currentDate;
            rel.vassalEndDate = addDays(finalChar.currentDate || '2000-01-01', 1825);
            rel.lastEvent = `사자의 위엄으로 ${currentNation}의 지도자를 굴복시켰습니다.`;
            finalChar.militaryData = {
                ...finalChar.militaryData,
                diplomacy: {
                    ...finalChar.militaryData.diplomacy,
                    [currentNation]: rel
                }
            };
        }
        const rawGoldLoot = (finalChar.level || 1) * 10000;
        const bonuses = calculateRewardBonuses(finalChar);
        const goldLoot = Math.floor(rawGoldLoot * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0));
        finalChar.money = (finalChar.money || 0) + goldLoot;
        bonusGold += goldLoot;
        const relicData = NATION_RELICS[currentNation] || NATION_RELICS['대한민국'];
        if (relicData) {
            finalChar.inventory = [
                ...(finalChar.inventory || []),
                { ...relicData, name: `[약탈됨] ${relicData.name}`, enhancement: 0 } as Item
            ];
        }
        addMemoryLocal(finalChar, `${currentNation} 신성 정벌 성공 및 속국화`);
        setResultModalData({
            type: 'levelup',
            title: '신성 정벌 성공',
            message: `${currentNation}을(를) 무력으로 완전히 굴복시켰습니다.\n이제 해당 국가는 5년간 당신의 지배 아래 조공을 바칠 것입니다.\n(점령지로 이동했습니다.)${
                isJustConquest ? '\n(침략 행위로 인해 악명이 상승하고 성전의 위엄이 실추되었습니다.)' : ''
            }`,
            items: [
                { label: '외교 상태', after: '종주국 (Owner)' },
                { label: '약탈 골드', after: `+${goldLoot.toLocaleString()} G` },
                ...(relicData ? [{ label: '획득 유물', after: relicData.name }] : []),
                ...(isJustConquest
                    ? [
                          { label: '악명 상승', after: '+200' },
                          { label: '성전 위엄도', after: '-500' }
                      ]
                    : [])
            ]
        });
    }

    // B-2. 마계의 성전 정벌 승리
    if (contextType === 'magye_temple_invasion') {
        const targetTemple = (combatState as any)?.sourceId || '성전';
        if (finalChar.magyeDominions) {
            const nextDom: typeof finalChar.magyeDominions = {};
            Object.entries(finalChar.magyeDominions).forEach(([k, dom]) => {
                nextDom[k] = {
                    ...dom,
                    fear: Math.min(10000, (dom.fear || 0) + 5000),
                    corruption: Math.min(10000, (dom.corruption || 0) + 2000)
                };
            });
            finalChar.magyeDominions = nextDom;
        }
        setPendingTempleConquest(targetTemple);
        setResultModalData({
            type: 'levelup',
            title: '성전 정복 성공',
            message: '신의 사자를 굴복시키고 성전을 마계의 영토로 편입했습니다.',
            items: [
                { label: '공포도 상승', after: '+5000' },
                { label: '타락도 상승', after: '+2000' }
            ]
        });
        addToLog(`[승전] ${targetTemple}의 신성을 파괴하고 마계의 깃발을 꽂았습니다.`);
    }

    // B-3. 마계의 신 살해 승리
    if (contextType === 'magye_god_slaying') {
        finalChar.isGodDefeated = true;
        finalChar.job = JobType.DEMON_GOD;
        finalChar.classTier = ClassTier.FINAL;
        const bonus = DIVINE_WAR_CONSTANTS.GOD_SUCCESS_STAT_BONUS;
        finalChar.stats.str += bonus;
        finalChar.stats.int += bonus;
        finalChar.stats.wis += bonus;
        finalChar.stats.def += bonus;
        finalChar.stats.agi += bonus;
        finalChar.stats.ctrl += bonus;
        finalChar.stats.maxHp += bonus * 10;
        finalChar.stats.hp = finalChar.stats.maxHp;
        finalChar.infamy = 99999;

        if (finalChar.magyeDominions) {
            const nextDom: typeof finalChar.magyeDominions = {};
            Object.entries(finalChar.magyeDominions).forEach(([k, dom]) => {
                nextDom[k] = {
                    ...dom,
                    fear: (dom.fear || 0) + 10000,
                    corruption: (dom.corruption || 0) + 10000
                };
            });
            finalChar.magyeDominions = nextDom;
        }

        setResultModalData({
            type: 'levelup',
            title: '신좌 찬탈 (God Slayer)',
            message:
                '절대신 엘라를 처단하고 스스로 마계의 신이 되었습니다. 이제 이 세계에 당신을 막을 자는 없습니다.',
            items: [
                { label: '변경된 직업', after: '태초의 마신' },
                { label: '초월적 능력치', after: `+${bonus.toLocaleString()}` },
                { label: '악명도', after: '99,999 (MAX)' }
            ]
        });
        addToLog('[종말] 절대신이 소멸했습니다. 이제 마계의 법이 곧 세계의 물리 법칙이 됩니다.');
    }

    // B-4. 토너먼트 / 아레나 / 초월 아레나 / 무한 심연의 탑 승리
    if (
        contextType === 'tournament' ||
        contextType === 'arena' ||
        contextType === 'transcendent_arena' ||
        contextType === 'abyss_tower_mob' ||
        contextType === 'abyss_tower_boss'
    ) {
        let resultTitle = '';
        let resultMsg = '';
        let resultItems: any[] = [];
        let currentRoundLabel = '경기';

        if (contextType === 'tournament' && finalChar.schoolData?.currentTournament) {
            const schoolData = { ...finalChar.schoolData };
            const tournament = { ...schoolData.currentTournament! };
            const currentRound = tournament.currentRound;
            currentRoundLabel = currentRound === 2 ? '결승전' : `${currentRound}강`;
            const nextRound = currentRound / 2;

            if (nextRound >= 1) {
                tournament.currentRound = nextRound === 1 ? 0 : nextRound;
                if (nextRound > 1) {
                    let scope: 'School' | 'National' | 'World' = 'School';
                    if (tournament.key === 'high_school') scope = 'School';
                    if (tournament.key === 'high_national') scope = 'National';
                    if (tournament.key === 'high_world') scope = 'World';

                    const schoolNation =
                        (schoolData.schoolLocation as any)?.nation ||
                        finalChar.currentLocation?.nation ||
                        finalChar.nation ||
                        '대한민국';
                    const bracketData = generateTournamentBracket(schoolNation, nextRound, finalChar.name, scope);
                    tournament.opponentName = bracketData.opponentName;

                    const nextRoundLabel = nextRound === 2 ? '결승전' : `${nextRound}강`;
                    resultTitle = nextRound === 2 ? '토너먼트 결승전 진출!' : '토너먼트 승리!';
                    resultMsg = `${nextRoundLabel} 진출 성공! 다음 상대는 ${tournament.opponentName}입니다.`;
                    resultItems = [{ label: '진출 단계', after: nextRoundLabel }];
                } else {
                    const { exp: rawExp, gold: rawGold } = tournament.reward || { exp: 0, gold: 0 };
                    const bonuses = calculateRewardBonuses(finalChar);
                    const exp = Math.floor(rawExp * (1 + bonuses.expBonus / 100) * (bonuses.expMultiplier || 1.0));
                    const gold = Math.floor(rawGold * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0));

                    schoolData.lastTournamentDate = finalChar.currentDate?.substring(0, 7);
                    tournament.currentRound = 0;
                    tournament.isActive = false;

                    const history = {
                        schoolPlacement: 0,
                        nationalPlacement: 0,
                        worldPlacement: 0,
                        ...(schoolData.tournamentHistory || {})
                    };
                    if (tournament.key === 'high_school') history.schoolPlacement = 1;
                    else if (tournament.key === 'high_national') history.nationalPlacement = 1;
                    else if (tournament.key === 'high_world') history.worldPlacement = 1;
                    schoolData.tournamentHistory = history;

                    finalChar.currentExp = (finalChar.currentExp || 0) + exp;
                    finalChar.money = (finalChar.money || 0) + gold;
                    bonusExp += exp;
                    bonusGold += gold;
                    const initialLevel = finalChar.level;
                    schoolData.currentTournament = tournament;
                    finalChar.schoolData = schoolData;
                    const { updatedChar: leveledWinnerChar, leveledUp } = checkAndApplyLevelUp(finalChar);
                    finalChar = leveledWinnerChar;

                    resultTitle = '토너먼트 최종 우승!';
                    resultMsg =
                        `학교의 전설이 되었습니다! 우승 경험치 +${exp.toLocaleString()} EXP와 상금 +${gold.toLocaleString()} G가 지급되었습니다.` +
                        (leveledUp ? ` (축하합니다! Lv.${initialLevel} ➔ Lv.${finalChar.level} 레벨업!)` : '');
                    resultItems = [
                        { label: '우승 상금', after: `+${gold.toLocaleString()} G` },
                        { label: '우승 경험치', after: `+${exp.toLocaleString()} EXP` },
                        ...(leveledUp ? [{ label: '레벨 업!', after: `Lv.${initialLevel} ➔ Lv.${finalChar.level}` }] : []),
                        {
                            label: '현재 경험치',
                            after: `${finalChar.currentExp.toLocaleString()} / ${finalChar.maxExp.toLocaleString()} EXP`
                        }
                    ];
                    addMemoryLocal(finalChar, `${tournament.name} 최종 우승`);
                }
            }
            if (finalChar.schoolData) {
                finalChar.schoolData = { ...finalChar.schoolData, ...schoolData, currentTournament: tournament };
            }
        } else if (contextType === 'arena' && finalChar.mercenaryData?.arenaState) {
            const merc = { ...finalChar.mercenaryData };
            const arena = { ...merc.arenaState! };
            const currentRound = arena.currentRound;
            currentRoundLabel = currentRound === 1 ? '결승전' : `${currentRound}강`;
            const nextRound = currentRound / 2;

            if (currentRound === 1) {
                arena.currentRound = 0;
                merc.reputation = (merc.reputation || 0) + 1000;
                const bonuses = calculateRewardBonuses(finalChar);
                const arenaGold = Math.floor(500000 * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0));
                finalChar.money = (finalChar.money || 0) + arenaGold;
                bonusGold += arenaGold;

                resultTitle = '그랜드 아레나 우승!';
                resultMsg = '축하합니다! 전 세계 용병들의 정점, 올해의 챔피언에 등극했습니다!';
                resultItems = [
                    { label: '챔피언 등극', after: 'CHAMPION' },
                    { label: 'RP 상승', after: '+1000' },
                    { label: '우승 상금', after: `${arenaGold.toLocaleString()} G` }
                ];
            } else {
                arena.currentRound = nextRound === 1 ? 1 : nextRound;
                merc.reputation = (merc.reputation || 0) + 100;
                resultTitle = '아레나 경기 승리';
                resultMsg = `${nextRound === 1 ? '결승' : `${nextRound}강`} 진출에 성공했습니다!`;
                resultItems = [{ label: '명성 상승', after: '+100 RP' }];
            }
            merc.arenaState = arena;
            finalChar.mercenaryData = merc;
        } else if (contextType === 'transcendent_arena' && finalChar.transcendentArenaState) {
            const tArena = { ...finalChar.transcendentArenaState };
            const curRound = tArena.currentRound;
            const prevWins = tArena.winCount || 0;
            const rewardScale = 1 + prevWins * 0.5;
            const enemyAvgLv =
                defeatedEnemies.length > 0
                    ? Math.round(
                          defeatedEnemies.reduce((acc, e) => acc + (e.level || 2000), 0) / defeatedEnemies.length
                      )
                    : 2200;
            const tBonusExp = Math.round(
                (curRound <= 2 ? 18000000 : 4500000) * (1 + (enemyAvgLv - 2000) / 1000) * rewardScale
            );

            finalChar.currentExp = (finalChar.currentExp || 0) + tBonusExp;
            bonusExp += tBonusExp;
            finalChar.companions = finalChar.companions.map(c =>
                c.stats.hp > 0 && !c.isDead ? { ...c, currentExp: (c.currentExp || 0) + tBonusExp } : c
            );
            const lvRes = checkAndApplyLevelUp(finalChar, { skipInactive: true });
            finalChar = lvRes.updatedChar;

            if (curRound <= 2) {
                tArena.currentRound = 0;
                tArena.winCount = prevWins + 1;
                tArena.defendingChampionSnapshot = {
                    name: finalChar.name,
                    level: finalChar.level,
                    stats: { ...finalChar.stats },
                    shinryokuType: finalChar.shinryokuType || '빛'
                };
                const bonuses = calculateRewardBonuses(finalChar);
                const prizeGold = Math.floor(
                    15000000 * rewardScale * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0)
                );
                const manaGain = Math.round(250 * rewardScale);
                const legCrystalGain = Math.round(15 * rewardScale);
                const flowerGain = Math.round(5 * rewardScale);
                const diamondGain = Math.round(5 * rewardScale);
                finalChar.money = (finalChar.money || 0) + prizeGold;
                bonusGold += prizeGold;
                if (finalChar.base?.resources) {
                    finalChar.base = {
                        ...finalChar.base,
                        resources: {
                            ...finalChar.base.resources,
                            manaCrystal: (finalChar.base.resources.manaCrystal || 0) + manaGain,
                            legendaryCrystal: (finalChar.base.resources.legendaryCrystal || 0) + legCrystalGain,
                            shinryoku_flower: (finalChar.base.resources.shinryoku_flower || 0) + flowerGain,
                            diamond: (finalChar.base.resources.diamond || 0) + diamondGain
                        }
                    };
                }
                if (!(finalChar.availableTitles || []).includes('만신전의 패자')) {
                    finalChar.availableTitles = [...(finalChar.availableTitles || []), '만신전의 패자'];
                }
                resultTitle = `초월 그랜드 아레나 우승! (누적 ${tArena.winCount}회)`;
                resultMsg = `신의 거처 만신전의 정점에 등극했습니다! 다음 시즌부터 적들이 더욱 강해지고 보상도 ${Math.round(
                    (1 + tArena.winCount * 0.5) * 100
                )}%로 상승합니다.`;
                resultItems = [
                    { label: '칭호 / 누적 우승', after: `만신전의 패자 (${tArena.winCount}회)` },
                    { label: '초월 경험치', after: `+${tBonusExp.toLocaleString()} EXP` },
                    { label: '우승 상금', after: `+${prizeGold.toLocaleString()} G` },
                    { label: '전설 결정 / 마정석', after: `+${legCrystalGain}개 / +${manaGain}개` },
                    { label: '신력꽃 / 다이아', after: `+${flowerGain}개 / +${diamondGain}개` }
                ];
            } else {
                const nextRound = Math.max(2, curRound / 2);
                tArena.currentRound = nextRound;
                const stepGold = Math.round(2500000 * rewardScale);
                const stepMana = Math.round(30 * rewardScale);
                finalChar.money = (finalChar.money || 0) + stepGold;
                bonusGold += stepGold;
                if (finalChar.base?.resources) {
                    finalChar.base = {
                        ...finalChar.base,
                        resources: {
                            ...finalChar.base.resources,
                            manaCrystal: (finalChar.base.resources.manaCrystal || 0) + stepMana
                        }
                    };
                }
                resultTitle = '만신전 결투 승리!';
                resultMsg = `${nextRound <= 2 ? '결승전' : `${nextRound}강전`} 진출에 성공했습니다!`;
                resultItems = [
                    { label: '다음 라운드', after: nextRound <= 2 ? '결승전' : `${nextRound}강전` },
                    { label: '초월 경험치', after: `+${tBonusExp.toLocaleString()} EXP` },
                    { label: '승리 상금 / 마정석', after: `+${stepGold.toLocaleString()} G / +${stepMana}개` }
                ];
            }
            finalChar.transcendentArenaState = tArena;
        } else if ((contextType === 'abyss_tower_mob' || contextType === 'abyss_tower_boss') && finalChar.abyssTowerState) {
            const tower = { ...finalChar.abyssTowerState };
            const curFloor = tower.currentFloor || 1;
            tower.highestFloor = Math.max(tower.highestFloor || 0, curFloor);
            const floorBaseLv = 2000 + Math.floor(Math.max(0, curFloor - 1) / 10) * 100;
            const abyssExp = Math.round(floorBaseLv * (contextType === 'abyss_tower_boss' ? 7500 : 1800));

            finalChar.currentExp = (finalChar.currentExp || 0) + abyssExp;
            bonusExp += abyssExp;
            finalChar.companions = finalChar.companions.map(c =>
                c.stats.hp > 0 && !c.isDead ? { ...c, currentExp: (c.currentExp || 0) + abyssExp } : c
            );
            const lvRes = checkAndApplyLevelUp(finalChar, { skipInactive: true });
            finalChar = lvRes.updatedChar;

            if (contextType === 'abyss_tower_boss') {
                tower.totalClearedBosses = (tower.totalClearedBosses || 0) + 1;
                if (curFloor % 10 === 0) {
                    tower.unlockedCheckpointFloor = Math.max(tower.unlockedCheckpointFloor || 1, curFloor + 1);
                }
                if (tower.activeGridState?.tiles) {
                    const pPos = tower.pendingTilePos;
                    tower.activeGridState = {
                        ...tower.activeGridState,
                        bossDefeated: true,
                        tiles: tower.activeGridState.tiles.map((row: any[], ry: number) =>
                            row.map((t: any, rx: number) => {
                                const isPending = pPos && pPos.x === rx && pPos.y === ry;
                                if (isPending || t.content === 'boss' || t.type === 'boss_door') {
                                    return {
                                        ...t,
                                        isCleared: true,
                                        type: 'stairs',
                                        name: `${curFloor + 1}층으로 향하는 심연 계단`
                                    };
                                }
                                return t;
                            })
                        )
                    };
                }
                tower.pendingTilePos = undefined;
                if (finalChar.base?.resources) {
                    finalChar.base = {
                        ...finalChar.base,
                        resources: {
                            ...finalChar.base.resources,
                            manaCrystal: (finalChar.base.resources.manaCrystal || 0) + 80,
                            epicCrystal: (finalChar.base.resources.epicCrystal || 0) + 15,
                            legendaryCrystal: (finalChar.base.resources.legendaryCrystal || 0) + 5,
                            shinryoku_flower: (finalChar.base.resources.shinryoku_flower || 0) + 3,
                            diamond: (finalChar.base.resources.diamond || 0) + 3
                        }
                    };
                }
                resultTitle = `심연 탑 ${curFloor}F 차원 수호자 격파!`;
                resultMsg =
                    curFloor % 10 === 0
                        ? `체크포인트 ${curFloor + 1}층이 영구 해금되었으며 초월 재료와 막대한 경험치를 획득했습니다!`
                        : '심연의 수호자를 물리치고 풍성한 초월 재료와 경험치를 획득했습니다!';
                resultItems = [
                    { label: '최고 도달', after: `${tower.highestFloor}층` },
                    { label: '심연 경험치', after: `+${abyssExp.toLocaleString()} EXP` },
                    ...(curFloor % 10 === 0 ? [{ label: '체크포인트 해금', after: `${curFloor + 1}층` }] : []),
                    { label: '초월 재료', after: '마정석+80, 결정/신력꽃/다이아' }
                ];
            } else {
                if (tower.activeGridState?.tiles && tower.pendingTilePos) {
                    const { x: px, y: py } = tower.pendingTilePos;
                    tower.activeGridState = {
                        ...tower.activeGridState,
                        tiles: tower.activeGridState.tiles.map((row: any[], ry: number) =>
                            row.map((t: any, rx: number) => (rx === px && ry === py ? { ...t, isCleared: true } : t))
                        )
                    };
                }
                tower.pendingTilePos = undefined;
                if (finalChar.base?.resources) {
                    finalChar.base = {
                        ...finalChar.base,
                        resources: {
                            ...finalChar.base.resources,
                            manaCrystal: (finalChar.base.resources.manaCrystal || 0) + 15
                        }
                    };
                }
                resultTitle = `심연 탑 ${curFloor}F 교전 승리`;
                resultMsg = '심연의 적을 격퇴했습니다. 모달을 다시 열어 다음 타일로 이동하세요.';
                resultItems = [
                    { label: '심연 경험치', after: `+${abyssExp.toLocaleString()} EXP` },
                    { label: '전리품', after: '마정석 +15' }
                ];
            }
            finalChar.abyssTowerState = tower;
        }

        // 토너먼트/아레나 경기 후 상대와의 인연 선택 모달 데이터 등록
        if (contextType === 'tournament' || contextType === 'arena') {
            const defeatedOpponent: any = defeatedEnemies[0] || {};
            const opponentName = (defeatedOpponent.name || '상대 선수').replace(/^\[아레나\]\s*/, '');
            const postMatchData: TournamentPostMatchData = {
                tournamentType: contextType === 'tournament' ? 'school' : 'arena',
                tournamentName:
                    contextType === 'tournament'
                        ? finalChar.schoolData?.currentTournament?.name || '학교 토너먼트'
                        : '그랜드 아레나',
                roundLabel: currentRoundLabel,
                opponent: {
                    id: defeatedOpponent.id || `opponent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: opponentName,
                    level: defeatedOpponent.level || 10,
                    gender: defeatedOpponent.gender || 'male',
                    race: defeatedOpponent.race || '인간',
                    nation:
                        defeatedOpponent.nation ||
                        finalChar.currentLocation?.nation ||
                        finalChar.nation ||
                        '대한민국',
                    stats: defeatedOpponent.stats,
                    shinryokuType: defeatedOpponent.shinryokuType || '무속성',
                    combatStyle: defeatedOpponent.combatStyle,
                    job: defeatedOpponent.job || (contextType === 'tournament' ? JobType.STUDENT : JobType.MERCENARY),
                    mercenaryRank: defeatedOpponent.mercenaryRank,
                    visualUrl: defeatedOpponent.visualUrl,
                    description: defeatedOpponent.description
                }
            };
            setPendingTournamentPostMatch(postMatchData);
        }

        if (resultTitle) {
            setResultModalData({
                type: 'success',
                title: resultTitle,
                message: resultMsg,
                items: resultItems
            });
            addToLog(`[시스템] ${resultTitle} ${resultMsg}`);
        }
    }

    // B-5. 전쟁 방어전 pendingInvasions 정리
    if (contextType === 'war_defend') {
        const defenseNation = (combatState as any)?.defenseNation;
        if (defenseNation && finalChar.militaryData) {
            finalChar.militaryData = {
                ...finalChar.militaryData,
                pendingInvasions: finalChar.militaryData.pendingInvasions?.filter(n => n !== defenseNation)
            };
        }
    }

    // B-6. 학교 중간/기말고사 합격
    if ((contextType === 'exam_mid' || contextType === 'exam_final') && finalChar.schoolData) {
        const isMid = contextType === 'exam_mid';
        finalChar.schoolData = {
            ...finalChar.schoolData,
            ...(isMid ? { midtermPassed: true } : { finalPassed: true }),
            lastExamDate: finalChar.currentDate?.substring(0, 7)
        };
        const examName = isMid ? '중간고사' : '기말고사';
        setResultModalData({
            type: 'success',
            title: '시험 통과!',
            message: `\n[시스템] 축하합니다! ${examName}에 합격(PASS) 하셨습니다.`,
            items: [{ label: examName, after: '통과' }]
        });
        addToLog(`[시스템] 축하합니다! ${examName}에 합격(PASS) 하셨습니다.`);
    }

    // B-7. 클래스 승급 시련전 (`class_trial`)
    // (참고: `final_trial_battle`은 App.tsx의 전용 useEffect가 처리하므로 class_trial만 여기서 처리)
    if (contextType === 'class_trial') {
        const challengerId = (combatState as any)?.challengerCompanionId;
        const applyTrialFlag = <T extends Character | Companion>(entity: T): T => {
            const next: any = { ...entity };
            const curTier = entity.classTier;
            if (curTier === ClassTier.NONE) {
                next.hasClearedFirstTrial = true;
                next.firstTrialCleared = true;
            } else if (curTier === ClassTier.FIRST) {
                next.hasClearedSecondTrial = true;
                next.secondTrialCleared = true;
            } else if (curTier === ClassTier.SECOND) {
                next.hasClearedLastTrial = true;
                next.lastTrialCleared = true;
            } else if (curTier === ClassTier.LAST) {
                next.hasClearedFinalTrial = true;
                next.finalTrialCleared = true;
            }
            return next as T;
        };

        if (challengerId) {
            finalChar.companions = finalChar.companions.map(c => (c.id === challengerId ? applyTrialFlag(c) : c));
            if (finalChar.inactiveCompanions) {
                finalChar.inactiveCompanions = finalChar.inactiveCompanions.map(c =>
                    c.id === challengerId ? applyTrialFlag(c) : c
                );
            }
            const targetComp =
                finalChar.companions.find(c => c.id === challengerId) ||
                finalChar.inactiveCompanions?.find(c => c.id === challengerId);
            setResultModalData({
                type: 'levelup',
                title: `클래스 시련 통과! [${targetComp?.name || '동료'}]`,
                message: '1:1 시련 결투에서 승리하여 다음 클래스 해방 자격을 획득했습니다!',
                items: [{ label: '해방 자격', after: '취득 완료' }]
            });
        } else {
            finalChar = applyTrialFlag(finalChar);
            setResultModalData({
                type: 'levelup',
                title: '클래스 시련 통과!',
                message: '1:1 시련 결투에서 승리하여 다음 클래스 해방 자격을 획득했습니다!',
                items: [{ label: '해방 자격', after: '취득 완료' }]
            });
        }
    }

    // B-8. 학교 동급생/라이벌 결투 승리 판정
    if (
        (contextType === 'tournament' || contextType === 'normal' || isSparringBattle) &&
        defeatedEnemies.length > 0 &&
        finalChar.schoolData?.classmates?.length
    ) {
        const opponentNameRaw = defeatedEnemies[0].name || '';
        const opponentName = opponentNameRaw.replace(/\[.*?\]\s*/g, '').trim();
        const student = finalChar.schoolData.classmates.find(
            s => s.name === opponentName || (s.name && opponentName.includes(s.name))
        );
        if (student) {
            if (student.isRival) {
                setPendingRelationResolution({ targetId: student.id, enemy: defeatedEnemies[0] });
            } else if (!isSparringBattle) {
                finalChar.schoolData = {
                    ...finalChar.schoolData,
                    classmates: finalChar.schoolData.classmates.map(s =>
                        s.id === student.id
                            ? {
                                  ...s,
                                  affection: Math.min(100, s.affection + 5),
                                  respect: Math.min(100, (s.respect || 0) + 5)
                              }
                            : s
                    )
                };
                if (contextType !== 'tournament') {
                    setResultModalData({
                        type: 'success',
                        title: '호감도 상승!',
                        message: `${student.name}와(과) 겨루며 호감도가 상승하였습니다.`,
                        items: [{ label: '호감도', after: '+5' }]
                    });
                }
            }
        }
    }

    // B-9. 성전 침공 승리
    if (contextType === 'temple_invasion') {
        const targetTemple = (combatState as any)?.sourceId || '적 성전';
        const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
        if (myTempleCity) {
            const myTempleNation = findNationByCityLocal(myTempleCity);
            const myTempleKey = `${myTempleNation}_${myTempleCity}`;
            if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
            if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
            if (!finalChar.base.templePersonnel[myTempleKey]) {
                finalChar.base.templePersonnel[myTempleKey] = {
                    knightIds: [],
                    butlerIds: [],
                    maidIds: [],
                    majesty: 0
                };
            }
            finalChar.base.templePersonnel[myTempleKey].majesty =
                (finalChar.base.templePersonnel[myTempleKey].majesty || 0) + 1000;
        }
        setPendingTempleConquest(targetTemple);
        setResultModalData({
            type: 'levelup',
            title: '성전 함락 성공',
            message: `${targetTemple}을(를) 함락시켰습니다. 이제 이 성전의 자원을 약탈하거나 대원들을 끌고 올 수 있습니다.`,
            items: [{ label: '위엄도 상승', after: '+1000' }]
        });
    }

    // B-10. 신의 반란 승리
    if (contextType === 'god_rebellion') {
        const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
        if (myTempleCity) {
            const myTempleNation = findNationByCityLocal(myTempleCity);
            const myTempleKey = `${myTempleNation}_${myTempleCity}`;
            if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
            if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
            if (!finalChar.base.templePersonnel[myTempleKey]) {
                finalChar.base.templePersonnel[myTempleKey] = {
                    knightIds: [],
                    butlerIds: [],
                    maidIds: [],
                    majesty: 0
                };
            }
            finalChar.base.templePersonnel[myTempleKey].majesty =
                (finalChar.base.templePersonnel[myTempleKey].majesty || 0) + 2000;
        }

        finalChar.isGodDefeated = true;
        const bonus = 100000;
        finalChar.stats.str += bonus;
        finalChar.stats.int += bonus;
        finalChar.stats.wis += bonus;
        finalChar.stats.def += bonus;
        finalChar.stats.agi += bonus;
        finalChar.stats.ctrl += bonus;
        finalChar.stats.maxHp += bonus * 10;
        finalChar.stats.maxMp += bonus * 10;
        finalChar.stats.hp = finalChar.stats.maxHp;
        finalChar.stats.mp = finalChar.stats.maxMp;

        addMemoryLocal(finalChar, '절대신 엘라를 처단하고 신좌를 찬탈함.');
        setResultModalData({
            type: 'levelup',
            title: '★ 신좌 찬탈 대성공',
            message:
                '절대신 엘라를 쓰러뜨리고 새로운 세계의 질서를 세웠습니다.\n당신은 이제 신의 권능을 온전히 손에 넣었습니다.',
            items: [
                { label: '위엄도 상승', after: '+2000' },
                { label: '전 능력치 보너스', after: `+${bonus.toLocaleString()}` },
                { label: '상태', after: '신으로 승격(현 신의 사자 직책은 유지)' }
            ]
        });
    }

    // B-11. 전쟁 습격/방어 승리
    if (currentNation && (contextType === 'war_raid' || contextType === 'war_defend')) {
        if (finalChar.militaryData?.diplomacy?.[currentNation]) {
            const rel = { ...finalChar.militaryData.diplomacy[currentNation] };
            const leaderDefeated = defeatedEnemies.some(e => (e.name || '').includes('[국가 지도자]'));

            if (leaderDefeated) {
                rel.status = DiplomaticStatus.VASSAL_OWNER;
                rel.occupation = 100;
                rel.tension = 0;
                rel.vassalYearsRemaining = VASSAL_DURATION_YEARS;
                rel.vassalStartDate = finalChar.currentDate;
                rel.vassalEndDate = addDays(finalChar.currentDate || '2000-01-01', 1825);
                rel.lastEvent = '지도자 항복. 우리 측의 완전한 승리로 기록됩니다.';

                finalChar.militaryData = {
                    ...finalChar.militaryData,
                    diplomacy: {
                        ...finalChar.militaryData.diplomacy,
                        [currentNation]: rel
                    }
                };
                addToLog(
                    `[긴급 타전] 대첩! ${currentNation}의 지도자가 패배를 인정하고 항복을 선언했습니다. 해당 국가는 이제 우리의 속국이 되었습니다.`
                );
                addMemoryLocal(finalChar, `${currentNation} 정벌 및 속국화 성공`);
                setResultModalData({
                    type: 'levelup',
                    title: '국가 정벌 성공 (Vassalized)',
                    message: `${currentNation}의 지도자를 굴복시키고 전쟁에서 완전히 승리했습니다!\n이제 해당 국가는 5년간 우리의 지배를 받으며 조공을 바칠 것입니다.`,
                    items: [
                        { label: '대상 국가', after: currentNation },
                        { label: '외교 상태', before: '전쟁', after: '종주국 (Owner)' },
                        { label: '지배 기간', after: `${VASSAL_DURATION_YEARS}년` }
                    ]
                });
            } else {
                const todayStr = finalChar.currentDate || '2000-01-01';
                const isRaid = contextType === 'war_raid';
                const alreadyGainedRaidOccupationToday = isRaid && rel.lastRaidOccupationDate === todayStr;

                if (alreadyGainedRaidOccupationToday) {
                    setResultModalData({
                        type: 'success',
                        title: '전투 승리!',
                        message:
                            '\n[시스템] 적 거점을 소탕하고 승리했습니다!\n(전선 습격 점유율은 하루에 1회만 획득할 수 있어 점유율이 추가로 상승하지 않았습니다.)',
                        items: [
                            { label: '현재 점유율', after: `${rel.occupation || 0}%` },
                            { label: '점유율 변동', after: '0% (일일 1회 제한)' }
                        ]
                    });
                    addToLog(
                        `[전보] 승전! ${currentNation} 거점 소탕 완료. (전선 습격 점유율은 하루 1회만 획득 가능하여 추가 점유율 상승은 없습니다.)`
                    );
                } else {
                    if (isRaid) rel.lastRaidOccupationDate = todayStr;
                    const commanderInfo = getCommanderInfo(finalChar);
                    let occGain = 1;
                    if (finalChar.job === JobType.DEMON_GOD) {
                        occGain = 15;
                    } else if (finalChar.job?.toString().includes('제너럴')) {
                        occGain = 10;
                    } else if (commanderInfo) {
                        const rIdx = commanderInfo.rankIdx;
                        if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG)) occGain = 5;
                        else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ)) occGain = 4;
                        else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT)) occGain = 3;
                        else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SSG)) occGain = 2;
                    }

                    rel.occupation = Math.min(100, (rel.occupation || 0) + occGain);
                    const transitionedRel = checkVassalTransition(rel, finalChar.currentDate);
                    finalChar.militaryData = {
                        ...finalChar.militaryData,
                        diplomacy: {
                            ...finalChar.militaryData.diplomacy,
                            [currentNation]: transitionedRel
                        }
                    };
                    setResultModalData({
                        type: 'success',
                        title: '전투 승리!',
                        message: '\n[시스템] 축하합니다! 전쟁에서 승리 하셨습니다.',
                        items: [{ label: '현재 점유율(%)', after: `${transitionedRel.occupation}%` }]
                    });
                    addToLog(
                        `[전보] 승전보! ${currentNation} 전선 점유율 ${occGain}% 상승! (현재: ${transitionedRel.occupation}%)`
                    );
                }
            }
        }
    }

    // B-12. 현상금 사냥 승리 (포획 대상 등록)
    if (contextType === 'bounty_hunt') {
        const criminalEnemy: any =
            defeatedEnemies.find((e: any) => e.isBountyTarget || e.criminalData) || defeatedEnemies[0];
        if (criminalEnemy?.criminalData && finalChar.mercenaryData) {
            finalChar.mercenaryData = {
                ...finalChar.mercenaryData,
                pendingCriminal: criminalEnemy.criminalData
            };
        }
    }

    // B-13. 현상수배 체포전 승리 (해당 도시 수배 해제)
    if (contextType === 'wanted_battle') {
        finalChar.wantedClearanceCity = finalChar.currentLocation?.city;
    }

    // B-14. 성전 방어 승리
    if (contextType === 'temple_defense') {
        const source = (combatState as any)?.defenseSource;
        const targetCity = (combatState as any)?.targetCity || finalChar.currentLocation?.city || '';
        const targetNation = (combatState as any)?.targetNation || findNationByCityLocal(targetCity);
        const templeKey = `${targetNation}_${targetCity}`;

        let majestyGain = 100;
        if (source === '마신' || source === '타락한 신성') majestyGain = 1000;
        else if (source === '마계' || source === '타 성전') majestyGain = 500;

        if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
        if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
        if (!finalChar.base.templePersonnel[templeKey]) {
            finalChar.base.templePersonnel[templeKey] = {
                knightIds: [],
                butlerIds: [],
                maidIds: [],
                majesty: 0
            };
        }
        const tp = { ...finalChar.base.templePersonnel[templeKey] };
        tp.majesty = (tp.majesty || 0) + majestyGain;
        finalChar.base = {
            ...finalChar.base,
            templePersonnel: {
                ...finalChar.base.templePersonnel,
                [templeKey]: tp
            }
        };
        addToLog(`[성전 승보] 외적을 격퇴하여 '${targetCity}'의 위엄도가 ${majestyGain} 상승했습니다! (현재: ${tp.majesty})`);
        setResultModalData({
            type: 'levelup',
            title: '침공 격퇴',
            message: `외적을 격퇴하여 '${targetCity}'의 위엄도가 ${majestyGain} 상승했습니다.`,
            items: [
                { label: '대상 도시', after: targetCity },
                { label: '현재 위엄도', after: `${tp.majesty}` }
            ]
        });
    }

    // B-15. 일반/사냥/던전 전투 승리 후 돌발 이벤트 추첨 (이미 돌발 이벤트 전투인 경우 제외)
    if (
        !suddenEventType &&
        (!contextType || contextType === 'normal' || contextType === 'hunting' || contextType === 'dungeon')
    ) {
        try {
            suddenEvent = rollSuddenPostCombatEvent(
                finalChar,
                defeatedEnemies,
                expGain + bonusExp,
                contextType || 'normal',
                (combatState as any)?.dungeonId || finalChar.dungeonProgress?.dungeonId
            );
        } catch {
            suddenEvent = null;
        }
    }

    return {
        updatedChar: finalChar,
        bonusExp,
        bonusGold,
        suddenEvent,
        dungeonDefeatHandled
    };
};
