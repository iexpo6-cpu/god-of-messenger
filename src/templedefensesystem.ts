
import { Character, Enemy, JobType, Companion, MilitaryRank, Stats, ClassTier, SkillType } from './types';
import { NATION_LIST} from './nationalDiplomacy';
import { generateLargeArmy } from './largearmy';
import { WORLD_GEOGRAPHY, TEMPLE_MESSENGER_MAP, MILITARY_RANK_ORDER } from './constants';
import { SEASONAL_BOSSES, SEASONAL_BOSS_CONFIG } from './mythicbossmonsters';
import { generateBossMonster } from './bossMonsters';

/**
 * 신의 사자 직업군인지 확인하는 헬퍼
 */
const isMessengerJob = (job?: JobType) => {
    if (!job) return false;
    return [
        JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
        JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
        JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
        JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
        JobType.VOID_MESSENGER
    ].includes(job);
};

/**
 * 직업에 따른 성전 도시 이름을 반환하는 역매핑
 */
export const GET_CITY_BY_MESSENGER_JOB: Partial<Record<JobType, string>> = {
    [JobType.SOLAR_MESSENGER]: "태양의 사자의 성전",
    [JobType.FIRE_MESSENGER]: "화염의 사자의 성화",
    [JobType.RADIANT_MESSENGER]: "광휘의 사자의 성소",
    [JobType.MOONLIGHT_MESSENGER]: "월광의 사자의 성",
    [JobType.ELECTRIC_MESSENGER]: "전격의 사자의 성전",
    [JobType.EARTH_MESSENGER]: "지령의 사자의 궁궐",
    [JobType.GALE_MESSENGER]: "질풍의 사자의 질풍전",
    [JobType.ICE_MESSENGER]: "빙결의 사자의 빙궁",
    [JobType.SEA_MESSENGER]: "해수의 사자의 성수전",
    [JobType.STEEL_MESSENGER]: "강철의 사자의 강성",
    [JobType.DARK_MESSENGER]: "암연의 사자의 심연",
    [JobType.NATURE_MESSENGER]: "초화의 사자의 성초",
    [JobType.VOID_MESSENGER]: "무의 궁궐"
};

/**
 * 도시 이름을 기반으로 해당 도시가 속한 국가(Nation)를 찾습니다.
 */
const findNationByCity = (cityName: string): string => {
    for (const region in WORLD_GEOGRAPHY) {
        for (const nation in WORLD_GEOGRAPHY[region]) {
            if (WORLD_GEOGRAPHY[region][nation].cities.includes(cityName)) {
                return nation;
            }
        }
    }
    return "양의 기운의 성전"; // Fallback
};

/**
 * 성전 위엄도 계산 (중앙 집중화 로직)
 */
export const calculateTempleMajesty = (character: Character, templeKey?: string): number => {
    if (!character || !templeKey) return 0;
    const personnel = character.base?.templePersonnel?.[templeKey];
    if (!personnel) return 0;

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    
    const staffIds = [
        personnel.priestId,
        personnel.subPriestId,
        ...(personnel.knightIds || []),
        ...(personnel.butlerIds || []),
        ...(personnel.maidIds || [])
    ].filter(Boolean) as string[];

    const city = templeKey.split('_')[1];
    const requiredJob = city ? TEMPLE_MESSENGER_MAP[city] : undefined;

    let totalLevelSum = 0;

    staffIds.forEach(id => {
        const comp = allComps.find(c => c && c.id === id);
        if (comp) totalLevelSum += comp.level || 1;
    });

    if (character.job === requiredJob) {
        totalLevelSum += character.level || 1;
    }

    allComps.forEach(comp => {
        if (comp && comp.job === requiredJob && !staffIds.includes(comp.id)) {
            totalLevelSum += comp.level || 1;
        }
    });

    const bonusMajesty = personnel.majesty || 0;
    return (totalLevelSum * 0.1) + bonusMajesty;
};

/**
 * 보스 이름을 제너럴 직업군으로 매핑하는 헬퍼
 */
const BOSS_NAME_TO_GENERAL_JOB: Record<string, JobType> = {
    "루시퍼": JobType.MAGYE_GENERAL_1,
    "레비아탄": JobType.MAGYE_GENERAL_2,
    "사탄": JobType.MAGYE_GENERAL_3,
    "벨페고르": JobType.MAGYE_GENERAL_4,
    "마몬": JobType.MAGYE_GENERAL_5,
    "벨제부브": JobType.MAGYE_GENERAL_6,
    "아스모데우스": JobType.MAGYE_GENERAL_7,
    "포보스": JobType.MAGYE_GENERAL_8,
    "데이모스": JobType.MAGYE_GENERAL_9,
    "아포피스": JobType.MAGYE_GENERAL_10,
    "제로": JobType.MAGYE_GENERAL_11,
};

/**
 * 성전 침공 이벤트 트리거 및 적군 구성
 */
export const triggerTempleDefense = (character: Character): { enemies: Enemy[], log: string, source: string, targetNation: string, targetCity: string } | null => {
    if (!character) return null;
    const allMembers = [character, ...(character.companions || []), ...(character.inactiveCompanions || [])];
    const messenger = allMembers.find(m => m && isMessengerJob(m.job));
    if (!messenger || !messenger.job || !isMessengerJob(messenger.job)) {
        return null;
    }
    
    let targetCity = GET_CITY_BY_MESSENGER_JOB[messenger.job as JobType];
    if (!targetCity) {
        return null;
    }
    
    const targetNation = findNationByCity(targetCity) || character.nation || "임페리얼 제국";
    const templeKey = `${targetNation}_${targetCity}`;
    const totalMajesty = calculateTempleMajesty(character, templeKey);

    if (totalMajesty > 10000) return null;

    let enemies: Enemy[] = [];
    let log = "";
    let source = "";

    const roll = Math.random();
    const existingJobs = allMembers.map(m => m?.job).filter(Boolean) as JobType[];
    const nationsWithAllyCommander = allMembers
        .filter(m => m && m.job === JobType.SOLDIER && m.militaryRank === MilitaryRank.GEN)
        .map(m => m.nation);

    if (totalMajesty <= 2000) {
        const validInvaderNations = NATION_LIST.filter(n => !nationsWithAllyCommander.includes(n));
        if (validInvaderNations.length === 0) return null;

        const targetInvaderNation = validInvaderNations[Math.floor(Math.random() * validInvaderNations.length)];
        
        // [NEW] 인물 관계망에서 적국 지휘관 탐색
        let specialOpponent: any = null;
        if (character.socialNetwork && Array.isArray(character.socialNetwork)) {
            const highRankOrder = [MilitaryRank.MAJ, MilitaryRank.LTC, MilitaryRank.COL, MilitaryRank.BG, MilitaryRank.MG, MilitaryRank.LG, MilitaryRank.GEN];
            const potentials = character.socialNetwork.filter(n => 
                n &&
                n.nation === targetInvaderNation && 
                n.militaryRank && 
                highRankOrder.includes(n.militaryRank as MilitaryRank) &&
                !n.isPurged
            );
            if (potentials.length > 0) {
                specialOpponent = potentials[Math.floor(Math.random() * potentials.length)];
            }
        }

        enemies = generateLargeArmy(targetInvaderNation, character.level);
        source = targetInvaderNation;

        // [NEW] 인연 NPC가 지휘관으로 등장할 경우 교체 로직
        if (specialOpponent) {
            const sStats = specialOpponent.stats as Stats;
            const bondEnemy: Enemy = {
                name: `[지휘관] ${specialOpponent.name} (${specialOpponent.militaryRank})`,
                level: specialOpponent.level,
                hp: (sStats.maxHp || specialOpponent.level * 100) * 5,
                maxHp: (sStats.maxHp || specialOpponent.level * 100) * 5,
                stats: { 
                    ...sStats, 
                    hp: (sStats.maxHp || specialOpponent.level * 100) * 5, 
                    maxHp: (sStats.maxHp || specialOpponent.level * 100) * 5,
                    str: Math.floor(sStats.str * 1.5),
                    def: Math.floor(sStats.def * 1.5)
                },
                statusEffects: [],
                shinryokuType: specialOpponent.shinryokuType || '무속성',
                description: `당신의 과거 인연이었던 ${specialOpponent.name}이(가) ${targetInvaderNation}의 정벌군 지휘관으로서 성전을 포위했습니다! "사자여, 당신과의 인연은 소중하나 조국의 명예가 우선이다. 무기를 들어라!"`,
                skills: specialOpponent.skills || [
                    {
                        name: "국가의 결단",
                        description: "과거의 정을 끊어내는 무자비한 일격.",
                        type: SkillType.PHYSICAL,
                        tier: ClassTier.LAST,
                        mpCost: 40,
                        level: 10,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: "STR*4.0",
                        powerRatio: 400,
                        targetType: 'single'
                    }
                ]
            };
            // 첫 번째 적(기존 리더)을 인연 NPC로 교체
            enemies[0] = bondEnemy;
            log = `[숙명의 재회] 성전의 낮은 위엄을 틈타 ${targetInvaderNation}의 군대가 들이닥쳤습니다! 지휘관은 놀랍게도 당신의 옛 인연인 '${specialOpponent.name}'입니다!`;
        } else {
            log = `[성전 비상] 위엄이 낮은 '${targetCity}'에 ${targetInvaderNation}의 대규모 군대가 침공했습니다!`;
        }
    } 
    else if (totalMajesty <= 5000) {
        if (roll < 0.5) {
            const generalKeys = ["제로", "루시엔", "아포리아", "바르칼론", "아자르", "카르니발", "이그니스", "몰드릭", "스콜라", "카이로스", "루나스"];
            const validGenerals = generalKeys.filter(key => {
                const job = BOSS_NAME_TO_GENERAL_JOB[key];
                return !job || !existingJobs.includes(job);
            });

            if (validGenerals.length === 0) return null;

            const selected = validGenerals[Math.floor(Math.random() * validGenerals.length)];
            const bossData = SEASONAL_BOSSES[selected];
            enemies = [generateBossMonster("임페리얼 제국", selected, 12)];
            enemies[0].name = `[침공] ${bossData.name}`;
            source = "마계";
            log = `[성전 습격] 마계의 제너럴 '${bossData.name}'이(가) '${targetCity}'의 권능을 빼앗기 위해 강림했습니다!`;
        } else {
            const allMessengerBosses: any[] = [];
            for (let m = 1; m <= 12; m++) {
                SEASONAL_BOSS_CONFIG[m].forEach(c => {
                    const job = TEMPLE_MESSENGER_MAP[c.city];
                    if (job && !existingJobs.includes(job)) {
                        allMessengerBosses.push({ ...c, month: m, job });
                    }
                });
            }

            if (allMessengerBosses.length > 0) {
                const targetBoss = allMessengerBosses[Math.floor(Math.random() * allMessengerBosses.length)];
                enemies = [generateBossMonster(targetBoss.nation, targetBoss.city, targetBoss.month)];
                source = "타 성전";
                log = `[성전 전쟁] 다른 세력의 사자 '${enemies[0].name.replace('[BOSS] ', '')}'이(가) '${targetCity}'을(를) 공격하여 영역 다툼을 시작했습니다!`;
            } else {
                const validNations = NATION_LIST.filter(n => !nationsWithAllyCommander.includes(n));
                if (validNations.length === 0) return null;
                const targetInvaderNation = validNations[Math.floor(Math.random() * validNations.length)];
                enemies = generateLargeArmy(targetInvaderNation, character.level);
                source = targetInvaderNation;
                log = `[성전 비상] '${targetCity}'에 ${targetInvaderNation}의 정예 군대가 침공했습니다!`;
            }
        }
    } 
    else {
        if (roll < 0.05 && !character.isGodDefeated) {
            enemies = [generateBossMonster("신의 성소", "신의 거처", 1)];
            enemies[0].name = "[타락] 절대신 엘라";
            source = "타락한 신성";
            log = `[성전 종말] '${targetCity}'의 높은 위엄이 타락한 절대신의 질투를 불렀습니다!`;
        } else {
            if (existingJobs.includes(JobType.DEMON_GOD)) return null;

            enemies = [generateBossMonster("임페리얼 제국", "임페리얼", 12)];
            enemies[0].name = "[마신] 임페리얼";
            source = "마신";
            log = `[성전 결전] 마신 임페리얼이 '${targetCity}'을(를) 직접 파괴하기 위해 모습을 드러냈습니다!`;
        }
    }

    return { enemies, log, source, targetNation, targetCity };
};
