
import { Character, JobType, Enemy, MagyeDivineWar } from './types';
import { MAGYE_LEADERS, TEMPLE_MESSENGER_MAP } from './constants';
import { generateBossMonster, SEASONAL_BOSSES } from './bossMonsters';
import { generateLargeArmy } from './largearmy';

export const MAGYE_DIVINE_WAR_CONFIG = {
    MESSENGER_THRESHOLD: 15000,
    ELLA_THRESHOLD: 100000,
};

/**
 * 신의 사자 직업군과 보스 키 매핑
 */
const MESSENGER_JOB_TO_BOSS_KEY: Partial<Record<JobType, string>> = {
    [JobType.SOLAR_MESSENGER]: "엘클",
    [JobType.FIRE_MESSENGER]: "라페르난데스",
    [JobType.RADIANT_MESSENGER]: "줄리엣",
    [JobType.MOONLIGHT_MESSENGER]: "최원한",
    [JobType.ELECTRIC_MESSENGER]: "권율",
    [JobType.EARTH_MESSENGER]: "원지원",
    [JobType.GALE_MESSENGER]: "블랙스톰",
    [JobType.ICE_MESSENGER]: "이케블리자더",
    [JobType.SEA_MESSENGER]: "오션레이크",
    [JobType.STEEL_MESSENGER]: "퍼스트스틸스",
    [JobType.DARK_MESSENGER]: "네오다크볼튼",
    [JobType.NATURE_MESSENGER]: "태스크슈카인",
    [JobType.VOID_MESSENGER]: "홍길동"
};

/**
 * 특정 마계 도시의 '혼돈 지수(공포+타락)'를 체크하여 신성 침공 여부를 결정합니다.
 */
export const checkForDivineInvasion = (character: Character): MagyeDivineWar | null => {
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);
    if (!isMagyeLeader || !character.magyeDominions) return null;

    // 모든 지배지 중 점수가 가장 높은 곳을 타겟으로 선정
    const cities = Object.entries(character.magyeDominions);
    if (cities.length === 0) return null;

    // 점수 순 정렬 (내림차순)
    const sortedDominions = cities
        .map(([name, data]) => ({ name, data, score: data.fear + data.corruption }))
        .sort((a, b) => b.score - a.score);

    const target = sortedDominions[0];
    
    // 트리거 체크 (최소 1.5만 점)
    if (target.score < MAGYE_DIVINE_WAR_CONFIG.MESSENGER_THRESHOLD) return null;

    // 발생 확률 시뮬레이션
    const baseChance = target.score >= MAGYE_DIVINE_WAR_CONFIG.ELLA_THRESHOLD ? 0.05 : 0.01;
    if (Math.random() > baseChance) return null;

    let type: MagyeDivineWar['type'] = 'MESSENGER_JUDGMENT';
    let invaderName = "신의 사자";
    let enemies: Enemy[] = [];

    // [MODIFIED] 절대신이 처단된 상태(isGodDefeated)라면 엘라 강림은 생략하고 사자 침공으로 처리
    if (target.score >= MAGYE_DIVINE_WAR_CONFIG.ELLA_THRESHOLD && !character.isGodDefeated) {
        // 10만 이상: 절대신 엘라 강림
        type = 'DIVINE_PUNISHMENT';
        const ella = generateBossMonster("신의 성소", "신의 거처", 1);
        ella.name = "[심판] 절대신 엘라";
        invaderName = "절대신 엘라";
        enemies = [ella];
    } else {
        // 1.5만 이상: 랜덤 신의 사자 침공
        // [MODIFIED] 동료 중에 있는 신의 사자 직업은 침공 후보에서 제외
        const allGroupMembers = [character, ...character.companions, ...(character.inactiveCompanions || [])];
        const existingMessengerJobs = allGroupMembers
            .map(m => m.job)
            .filter(job => job && Object.values(MESSENGER_JOB_TO_BOSS_KEY).includes(MESSENGER_JOB_TO_BOSS_KEY[job as JobType]!));

        // 전체 사자 후보 중 현재 일행에 없는 사자들만 필터링
        const potentialInvaders = Object.entries(MESSENGER_JOB_TO_BOSS_KEY)
            .filter(([job, _]) => !existingMessengerJobs.includes(job as JobType))
            .map(([_, bossKey]) => bossKey);

        if (potentialInvaders.length === 0) return null; // 모든 사자가 아군이면 침공 안함

        const selectedBossKey = potentialInvaders[Math.floor(Math.random() * potentialInvaders.length)];
        const bossData = SEASONAL_BOSSES[selectedBossKey];
        
        if (!bossData) return null;

        // 보스 몬스터 생성 (레벨 보정)
        const messenger = generateBossMonster("신계", "성전", 12); // 기본 툴 활용
        messenger.name = `[징벌] ${bossData.name}`;
        messenger.level = bossData.level;
        messenger.shinryokuType = bossData.shinryokuType;
        messenger.skills = bossData.skills;
        messenger.visualUrl = bossData.visualUrl;
        messenger.description = `${bossData.title} - 지배자의 죄악을 징벌하기 위해 강림했습니다.`;
        
        invaderName = bossData.name;
        
        // 사자와 함께 정예 천사 군단 생성
        const minions = generateLargeArmy("신의 성소", character.level).slice(0, 2);
        enemies = [messenger, ...minions];
    }
    // 중복된 이름 처리 (A, B...)
    const nameCounts: Record<string, number> = {};
    const finalEnemies = enemies.map((e) => {
        const sameNameCount = enemies.filter((item) => item.name === e.name).length;
        if (sameNameCount > 1) {
            nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
            return { ...e, name: `${e.name} ${String.fromCharCode(64 + nameCounts[e.name])}` };
        }
        return e;
    });

    return {
        city: target.name,
        type,
        invaderName,
        enemies: finalEnemies,
        chaosScore: target.score
    };
};