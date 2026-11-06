
import { Character, JobType, Enemy, MagyeRevolt, ClassTier, Companion, Stats } from './types';
import { MAGYE_LEADERS } from './constants';
import { generateEnemyStats } from './utils';
import { SEASONAL_BOSSES } from './mythicbossmonsters';

/**
 * 마계 제너럴 서열 정의 (1위가 가장 강함, 11위가 가장 약함)
 * 1위부터 11위까지 순차적으로 정의됩니다.
 */
export const GENERAL_HIERARCHY: JobType[] = [
    JobType.MAGYE_GENERAL_1,
    JobType.MAGYE_GENERAL_2,
    JobType.MAGYE_GENERAL_3,
    JobType.MAGYE_GENERAL_4,
    JobType.MAGYE_GENERAL_5,
    JobType.MAGYE_GENERAL_6,
    JobType.MAGYE_GENERAL_7,
    JobType.MAGYE_GENERAL_8,
    JobType.MAGYE_GENERAL_9,
    JobType.MAGYE_GENERAL_10,
    JobType.MAGYE_GENERAL_11,
];

/**
 * [NEW] 제너럴 직업별 mythicbossmonsters.ts 보스 키 매핑
 */
export const GENERAL_TO_BOSS_KEY: Partial<Record<JobType, string>> = {
    [JobType.MAGYE_GENERAL_1]: "제로",
    [JobType.MAGYE_GENERAL_2]: "루시엔",
    [JobType.MAGYE_GENERAL_3]: "아포리아",
    [JobType.MAGYE_GENERAL_4]: "바르칼론",
    [JobType.MAGYE_GENERAL_5]: "아자르",
    [JobType.MAGYE_GENERAL_6]: "카르니발",
    [JobType.MAGYE_GENERAL_7]: "이그니스",
    [JobType.MAGYE_GENERAL_8]: "몰드릭",
    [JobType.MAGYE_GENERAL_9]: "스콜라",
    [JobType.MAGYE_GENERAL_10]: "카이로스",
    [JobType.MAGYE_GENERAL_11]: "루나스",
    [JobType.DEMON_GOD]: "임페리얼",
};

/**
 * 하극상을 일으킬 수 있는 후보 제너럴들을 추출합니다.
 */
export const getRevoltCandidates = (character: Character): { name: string, job: JobType, rankIdx: number }[] => {
    const playerJob = character.job;
    const playerRankIdx = GENERAL_HIERARCHY.indexOf(playerJob as JobType);
    
    // 플레이어가 마신(Demon God)인 경우 모든 제너럴이 하극상 가능
    // 플레이어가 제너럴인 경우 자신보다 낮은 서열(index가 더 큰 서열)이 하극상 가능
    let candidates: JobType[] = [];
    if (playerJob === JobType.DEMON_GOD) {
        candidates = [...GENERAL_HIERARCHY];
    } else if (playerRankIdx !== -1) {
        // 자신보다 낮은 순위(index상 뒤에 있는) 제너럴들이 반란군 후보
        candidates = GENERAL_HIERARCHY.slice(playerRankIdx + 1);
    } else {
        return []; // 마계 지배자가 아님
    }

    // 일행 중에 있는 제너럴은 반란에서 제외 (플레이어에게 귀속된 상태)
    const partyMemberJobs = [
        ...character.companions.map(c => c.job),
        ...(character.inactiveCompanions || []).map(c => c.job)
    ];

    const finalCandidates: { name: string, job: JobType, rankIdx: number }[] = [];
    
    candidates.forEach(job => {
        if (!partyMemberJobs.includes(job)) {
            const bossKey = GENERAL_TO_BOSS_KEY[job];
            const bossData = SEASONAL_BOSSES[bossKey];
          
            if (bossData) {
                finalCandidates.push({
                    name: bossData.name,
                    job: job,
                    rankIdx: GENERAL_HIERARCHY.indexOf(job)
                });
            }
        }
    });

    return finalCandidates;
};

/**
 * 반란군 적 부대를 생성합니다.
 */
export const generateRevoltEnemies = (rebelName: string, rebelJob: JobType, playerLevel: number): Enemy[] => {
    const enemies: Enemy[] = [];
    
    // 1. 반란 주동자 (보스)
    // 보스 데이터에서 실제 레벨을 가져옴 (없으면 플레이어 비례)
    const bossKey = GENERAL_TO_BOSS_KEY[rebelJob];
    const bossData = SEASONAL_BOSSES[bossKey];
    const leaderLevel = bossData?.level || Math.max(playerLevel, 7000);
    
    const stats = generateEnemyStats(leaderLevel);
    
    const isDemonGod = rebelJob === JobType.DEMON_GOD || bossKey === '임페리얼' || rebelName.includes('마신') || rebelName.includes('임페리얼');
    const hpMult = isDemonGod ? 25 : 8;
    const statMult = isDemonGod ? 4.5 : 1.5;

    // 보스 보정: HP와 스탯 강화
    const bossStats: Stats = {
        ...stats,
        hp: stats.maxHp * hpMult,
        maxHp: stats.maxHp * hpMult,
        str: Math.floor(stats.str * statMult),
        int: Math.floor(stats.int * statMult),
        def: Math.floor(stats.def * statMult),
        wis: Math.floor(stats.wis * statMult),
        ctrl: Math.floor(stats.ctrl * statMult)
    };

    enemies.push({
        name: `[반역자] ${rebelName}`,
        level: leaderLevel,
        hp: bossStats.hp,
        maxHp: bossStats.maxHp,
        stats: bossStats,
        shinryokuType: bossData?.shinryokuType || '암흑계',
        statusEffects: [],
        description: `${rebelJob}의 자리를 박차고 일어난 반란의 주동자입니다. 당신의 자리를 찬탈하려 합니다.`,
        skills: bossData?.skills || []
    });

    // 2. 가담한 제국 정예병 (3인)
    for (let i = 0; i < 3; i++) {
        // 주동자 레벨의 70% 수준 정예병
        const minionLevel = Math.floor(leaderLevel * 0.5);
        const mStats = generateEnemyStats(minionLevel);
        enemies.push({
            name: `제국 반란 정예병 ${String.fromCharCode(65 + i)}`,
            level: minionLevel,
            hp: mStats.maxHp * 3,
            maxHp: mStats.maxHp * 3,
            stats: { ...mStats, hp: mStats.maxHp * 3, maxHp: mStats.maxHp * 3 },
            shinryokuType: '강철계',
            statusEffects: [],
            description: "주동자의 야욕에 동참하여 황제를 배신한 타락한 정예병입니다."
        });
    }

    return enemies;
};

/**
 * 반란 발생 여부를 체크하고 데이터를 반환합니다.
 */
export const checkForMagyeRevolt = (character: Character): MagyeRevolt | null => {
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);
    if (!isMagyeLeader || !character.magyeDominions) return null;

    // 공포도가 10,000 미만인 지배지 중 하나를 무작위 선택
    const vulnerableCities = Object.entries(character.magyeDominions)
        .filter(([_, data]) => data.fear < 10000)
        .map(([name, _]) => name);

    if (vulnerableCities.length === 0) return null;

    const targetCity = vulnerableCities[Math.floor(Math.random() * vulnerableCities.length)];
    const dominion = character.magyeDominions[targetCity];

    // 발생 확률 계산: (10000 - fear) / 10000 * 0.5% (매우 낮은 확률이지만 꾸준히 발생)
    const probability = (10000 - dominion.fear) /10000 * 0.05;
    if (Math.random() > probability) return null;

    // 반란 후보군 선정
    const candidates = getRevoltCandidates(character);
    if (candidates.length === 0) return null;

    // 후보 중 무작위로 한 명이 반란을 일으킴
    const selectedRebel = candidates[Math.floor(Math.random() * candidates.length)];

    return {
        city: targetCity,
        rebelLeaderName: selectedRebel.name,
        rebelJob: selectedRebel.job,
        rebelRankIdx: selectedRebel.rankIdx,
        enemies: generateRevoltEnemies(selectedRebel.name, selectedRebel.job, character.level)
    };
};

/**
 * 반란 패배 시 강등 로직을 처리합니다.
 */
export const handleMagyeDemotion = (character: Character, rebelRankIdx: number, city: string): Partial<Character> => {
    const update: Partial<Character> = {};
    
    // 1. 플레이어의 새로운 서열은 반란군 제너럴의 서열보다 한 단계 낮아짐 (서열 빼앗김)
    const nextRankIdx = rebelRankIdx + 1;
    
    if (nextRankIdx >= GENERAL_HIERARCHY.length) {
        // 제11제너럴보다 낮아지면 일반 무직으로 추락
        update.job = JobType.UNEMPLOYED;
        update.classTier = ClassTier.NONE;
    } else {
        update.job = GENERAL_HIERARCHY[nextRankIdx];
    }

    // 2. 지배지 데이터 초기화 (공포도, 타락도, 인사 정보)
    if (character.magyeDominions) {
        const nextDominions = { ...character.magyeDominions };
        if (nextDominions[city]) {
            nextDominions[city] = {
                ...nextDominions[city],
                fear: 0,
                corruption: 0,
                personnel: { overseerIds: [], executionerIds: [] } // 인사 정보 초기화
            };
        }
        update.magyeDominions = nextDominions;
    }

    // 3. 기지 배정 데이터(Busy 상태)에서 해당 도시 관련 인사 정보 삭제
    if (character.base?.assignments) {
        const nextAssignments = { ...character.base.assignments };
        let anyDeleted = false;
        Object.keys(nextAssignments).forEach(key => {
            // "magye_도시명_역할_ID" 형태의 키 삭제
            if (key.startsWith(`magye_${city}_`)) {
                delete nextAssignments[key];
                anyDeleted = true;
            }
        });
        
        if (anyDeleted) {
            update.base = {
                ...character.base,
                assignments: nextAssignments
            };
        }
    }

    return update;
};