import { Enemy, SkillType, ClassTier, Stats, MilitaryRank, JobType, Companion, ItemRarity, Skill, SkillTarget } from './types';
import { generateBossMonster, getBossByLocation, DIVINE_REALM_BOSSES } from './bossMonsters';
import { SEASONAL_BOSSES } from './mythicbossmonsters';
import { generateName, generateCompanionStats, getTierByLevel, generateEnemyStats } from './utils';
import { TEMPLE_MESSENGER_MAP, SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES, NATION_DATA } from './constants';

/**
 * [NEW] 구(舊) 신성 광신도 기사단 생성
 */
export const generateRemnantKnights = (playerLevel: number): Enemy[] => {
    const enemies: Enemy[] = [];
    const avgLevel = Math.max(playerLevel + 50, 600);

    // 1. 타락한 성기사단장
    const leaderStats = generateEnemyStats(avgLevel + 50);
    enemies.push({
        name: "[잔당] 성기사단장",
        level: avgLevel + 50,
        hp: leaderStats.maxHp * 8,
        maxHp: leaderStats.maxHp * 8,
        stats: { ...leaderStats, hp: leaderStats.maxHp * 8, maxHp: leaderStats.maxHp * 8 },
        shinryokuType: "광휘계",
        statusEffects: [],
        description: "죽은 신의 부활을 믿으며 당신을 처단하려 하는 광신도들의 수장입니다.",
        skills: [
            {
                name: "최후의 순교",
                description: "[부가 효과: 소멸] 자신의 생명력을 불태워 자폭급 광선을 발사합니다.",
                type: SkillType.MAGIC,
                tier: ClassTier.FINAL,
                mpCost: 100,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "INT*10.0",
                powerRatio: 1000,
                targetType: 'aoe'
            }
        ]
    });

    // 2. 광신도 기사들
    for (let i = 0; i < 3; i++) {
        const stats = generateEnemyStats(avgLevel);
        enemies.push({
            name: `구(舊) 신성 기사 ${String.fromCharCode(65 + i)}`,
            level: avgLevel,
            hp: stats.maxHp * 3,
            maxHp: stats.maxHp * 3,
            stats: { ...stats, hp: stats.maxHp * 3, maxHp: stats.maxHp * 3 },
            shinryokuType: "강철계",
            statusEffects: [],
            description: "맹목적인 신앙으로 무장한 정예 기사입니다.",
            skills: []
        });
    }

    return enemies;
};

export const DIVINE_WAR_CONSTANTS = {
    GIFT_COST_GOLD: 10000000, // 1,000만 골드 (기존 10만G의 100배)
    GIFT_COST_CRYSTAL: 5000,  // 5,000개 마정석 (기존 50개의 100배)
    TEMPLE_INVASION_INFAMY: 500,
    GOD_REBELLION_INFAMY: 10000,
    TEMPLE_SUCCESS_MAJESTY: 1000,
    TEMPLE_FAIL_MAJESTY: -2000,
    GOD_SUCCESS_MAJESTY: 2000,
    GOD_FAIL_MAJESTY: -5000,
    GOD_SUCCESS_STAT_BONUS: 100000,
};
const allNations = Object.keys(NATION_DATA);
let manNation = allNations[Math.floor(Math.random() * allNations.length)]

const MBTI_OPTIONS = [
    "ISTJ (신중하고 성실함)",
    "ISFJ (용감하고 온화함)",
    "INFJ (통찰력 있고 신비함)",
    "INTJ (용의주도한 전략가)",
    "ISTP (만능 재주꾼)",
    "ISFP (호기심 많은 예술가)",
    "INFP (열정적인 중재자)",
    "INTP (논리적인 사색가)",
    "ESTP (모험을 즐기는 사업가)",
    "ESFP (자유로운 영혼)",
    "ENFP (재기발랄한 활동가)",
    "ENTP (뜨거운 논쟁을 즐김)",
    "ESTJ (엄격한 관리자)",
    "ESFJ (사교적인 외교관)",
    "ENFJ (정의로운 사회운동가)",
    "ENTJ (대담한 통솔자)"
];

/**
 * 성전 도시 이름과 SEASONAL_BOSSES 키 매핑
 */
const CITY_TO_BOSS_KEY: Record<string, string> = {
    "태양의 사자의 성전": "엘클",
    "화염의 사자의 성화": "라페르난데스",
    "광휘의 사자의 성소": "줄리엣",
    "월광의 사자의 성": "최원한",
    "전격의 사자의 성전": "권율",
    "지령의 사자의 궁궐": "원지원",
    "질풍의 사자의 질풍전": "블랙스톰",
    "빙결의 사자의 빙궁": "이케블리자더",
    "해수의 사자의 성수전": "오션레이크",
    "강철의 사자의 강성": "퍼스트스틸스",
    "암연의 사자의 심연": "네오다크볼튼",
    "초화의 사자의 성초": "태스크슈카인",
    "무의 궁궐": "홍길동"
};

/**
 * [NEW] 보스 및 성전별 신력 계통 명시적 매핑 테이블
 */
const BOSS_NAME_TO_ELEMENT: Record<string, string> = {
    "엘클": "태양계",
    "라 페르난데스": "화염계",
    "라페르난데스": "화염계",
    "줄리엣": "광휘계",
    "최원한": "월광계",
    "권율": "전격계",
    "원지원": "대지계",
    "블랙 스톰": "질풍계",
    "블랙스톰": "질풍계",
    "이케 블리자더": "빙결계",
    "이케블리자더": "빙결계",
    "오션 레이크": "해수계",
    "오션레이크": "해수계",
    "퍼스트 스틸스": "강철계",
    "퍼스트스틸스": "강철계",
    "네오 다크 볼튼": "암흑계",
    "네오다크볼튼": "암흑계",
    "태스크 슈카인": "초화계",
    "태스크슈카인": "초화계",
    "홍길동": "무의사자", // 특수 처리용 키
    // 성전 도시명 대응
    "태양의 사자의 성전": "태양계",
    "화염의 사자의 성화": "화염계",
    "광휘의 사자의 성소": "광휘계",
    "월광의 사자의 성": "월광계",
    "전격의 사자의 성전": "전격계",
    "지령의 사자의 궁궐": "대지계",
    "질풍의 사자의 질풍전": "질풍계",
    "빙결의 사자의 빙궁": "빙결계",
    "해수의 사자의 성수전": "해수계",
    "강철의 사자의 강성": "강철계",
    "암연의 사자의 심연": "암흑계",
    "초화의 사자의 성초": "초화계",
    "무의 궁궐": "무의사자"
};

/**
 * 신성 전쟁 대상(적군) 생성
 */
export const generateDivineWarEnemies = (targetType: 'GOD' | 'TEMPLE', nation: string, city: string, playerLevel: number): Enemy[] => {
    if (targetType === 'GOD') {
        // 1. 절대신 엘라 소환 (시즌 보스 "신" 스탯 기반)
        const godBoss = generateBossMonster("신계", "신의 거처", 1);
        const ellaData = SEASONAL_BOSSES["신"];
        
        godBoss.name = "[반역] 절대신 엘라";
        godBoss.description = "신계, 인간계, 마계를 수호하는 절대신 엘라. 창조신의 본래 전능한 권능을 완벽히 개방하여 당신의 반역을 심판합니다.";
        if (ellaData) {
            godBoss.skills = ellaData.skills || godBoss.skills;
            godBoss.visualUrl = ellaData.visualUrl || godBoss.visualUrl;
            godBoss.detailedLoot = ellaData.detailedLoot;
        }

        // 절대신 스탯 극강 보정 (일반 절대신 보스 스탯의 2.5 ~ 3배 상향)
        if (godBoss.stats) {
            const enhancedStats = { ...godBoss.stats };
            enhancedStats.hp = Math.floor(enhancedStats.hp * 3.0);
            enhancedStats.maxHp = enhancedStats.hp;
            enhancedStats.str = Math.floor(enhancedStats.str * 2.5);
            enhancedStats.int = Math.floor(enhancedStats.int * 2.5);
            enhancedStats.def = Math.floor(enhancedStats.def * 2.5);
            enhancedStats.wis = Math.floor(enhancedStats.wis * 2.5);
            enhancedStats.agi = Math.floor(enhancedStats.agi * 2.0);
            enhancedStats.ctrl = Math.floor(enhancedStats.ctrl * 3.0);
            enhancedStats.mp = Math.floor(enhancedStats.mp * 2.0);
            enhancedStats.maxMp = enhancedStats.mp;
            
            godBoss.stats = enhancedStats;
            godBoss.hp = enhancedStats.hp;
            godBoss.maxHp = enhancedStats.maxHp;
        }

        return [godBoss];
    } else {
        const enemies: Enemy[] = [];

        // 1. 성전의 사자(Messenger) 확정 소환 (시즌 보스 및 성전 보스 스탯 기반)
        const messengerKey = CITY_TO_BOSS_KEY[city];
        let messenger: Enemy;

        if (messengerKey && SEASONAL_BOSSES[messengerKey]) {
            const data = SEASONAL_BOSSES[messengerKey];
            // 시즌 보스 스탯 생성기를 활용한 정통 보스 스탯 산출
            const baseBoss = generateBossMonster(nation, city);
            const bStats = baseBoss.stats ? { ...baseBoss.stats } : generateEnemyStats(data.level);
            
            const isSunOrMoon = messengerKey === '엘클' || messengerKey === '최원한' || city.includes('태양의 사자') || city.includes('월광의 사자');
            const hpMult = isSunOrMoon ? 5.0 : 2.0;
            const statMult = isSunOrMoon ? 3.8 : 1.8;
            const ctrlMult = isSunOrMoon ? 4.0 : 2.0;

            bStats.hp = Math.floor(bStats.hp * hpMult);
            bStats.maxHp = bStats.hp;
            bStats.str = Math.floor(bStats.str * statMult);
            bStats.int = Math.floor(bStats.int * statMult);
            bStats.def = Math.floor(bStats.def * statMult);
            bStats.ctrl = Math.floor(bStats.ctrl * ctrlMult);
            bStats.wis = Math.floor(bStats.wis * statMult);

            messenger = {
                id: baseBoss.id || data.id,
                name: `[성전 사자] ${data.name}`,
                level: data.level,
                hp: bStats.hp,
                maxHp: bStats.maxHp,
                stats: bStats,
                shinryokuType: data.shinryokuType,
                description: `${data.title} - 성전의 주인으로서 당신을 직접 심판하러 나섰습니다.`,
                statusEffects: [],
                skills: data.skills && data.skills.length > 0 ? data.skills : baseBoss.skills,
                visualUrl: data.visualUrl || baseBoss.visualUrl,
                detailedLoot: data.detailedLoot
            };
        } else {
            const baseBoss = generateBossMonster(nation, city);
            const isSunOrMoon = city.includes('태양의 사자') || city.includes('월광의 사자');
            const hpMult = isSunOrMoon ? 4.5 : 1.8;
            const statMult = isSunOrMoon ? 3.2 : 1.5;

            if (baseBoss.stats) {
                baseBoss.stats.hp = Math.floor(baseBoss.stats.hp * hpMult);
                baseBoss.stats.maxHp = baseBoss.stats.hp;
                baseBoss.stats.str = Math.floor(baseBoss.stats.str * statMult);
                baseBoss.stats.int = Math.floor(baseBoss.stats.int * statMult);
                baseBoss.stats.def = Math.floor(baseBoss.stats.def * statMult);
                baseBoss.hp = baseBoss.stats.hp;
                baseBoss.maxHp = baseBoss.stats.maxHp;
            }
            messenger = baseBoss;
            messenger.name = `[성전 사자] ${messenger.name.replace('[BOSS] ', '')}`;
        }
        enemies.push(messenger);

        // 2. 성전 수호수(Guardian) 추가 (신계 보스 스탯 기반)
        const templeGroup = DIVINE_REALM_BOSSES[nation];
        if (templeGroup && templeGroup[city]) {
            const gData = templeGroup[city];
            const gBaseBoss = generateBossMonster(nation, city);
            const gStats = gBaseBoss.stats ? { ...gBaseBoss.stats } : generateEnemyStats(gData.level);
            
            // 수호 영수 강화 보정
            gStats.hp = Math.floor(gStats.hp * 1.5);
            gStats.maxHp = gStats.hp;
            gStats.def = Math.floor(gStats.def * 2.0);
            gStats.wis = Math.floor(gStats.wis * 1.8);
            gStats.str = Math.floor(gStats.str * 1.5);
            gStats.int = Math.floor(gStats.int * 1.5);

            const guardian: Enemy = {
                id: gData.id || `guardian_${city}`,
                name: `[성역 수호수] ${gData.name}`,
                level: gData.level,
                hp: gStats.hp,
                maxHp: gStats.maxHp,
                stats: gStats,
                shinryokuType: gData.shinryokuType,
                description: `${gData.title} - 사자의 곁을 지키는 성전의 수호 영수입니다.`,
                statusEffects: [],
                skills: gData.skills && gData.skills.length > 0 ? gData.skills : gBaseBoss.skills,
                visualUrl: gData.visualUrl || gBaseBoss.visualUrl,
                detailedLoot: gData.detailedLoot
            };
            enemies.push(guardian);
        }

        // 3. 성전 정예 수비병 2명 추가 (고레벨 수비 호위병)
        for (let i = 0; i < 2; i++) {
            const level = Math.max(800, Math.floor((messenger.level || 1000) * 0.8));
            const baseStats = generateEnemyStats(level);
            const eliteHp = baseStats.maxHp * 80;
            const eliteStats = {
                ...baseStats,
                hp: eliteHp,
                maxHp: eliteHp,
                str: Math.floor(baseStats.str * 3),
                int: Math.floor(baseStats.int * 3),
                def: Math.floor(baseStats.def * 4),
                ctrl: Math.floor(baseStats.ctrl * 2)
            };

            enemies.push({
                name: `${city} 성역 정예병`,
                level,
                hp: eliteHp,
                maxHp: eliteHp,
                stats: eliteStats,
                shinryokuType: messenger.shinryokuType,
                statusEffects: [],
                description: "성전의 사자와 수호수를 보좌하는 최정예 전사입니다.",
                skills: []
            });
        }

        // 중복된 이름 알파벳 식별자 부여 (A, B...)
        const nameCounts: Record<string, number> = {};
        const finalEnemies = enemies.map((e) => {
            const count = enemies.filter((item) => item.name === e.name).length;
            if (count > 1) {
                nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
                return { ...e, name: `${e.name} ${String.fromCharCode(64 + nameCounts[e.name])}` };
            }
            return e;
        });

        return finalEnemies;
    }
};

/**
 * 성전 약탈 시 납치할 인재 생성
 */
export const generateLootedStaff = (templeId: string, playerLevel: number): Companion => {
    const role = Math.random() < 0.5 ? "집사" : "메이드";
    const level = Math.floor(Math.random() * 100) + 150; // 고레벨 인재 납치
    const nations = allNations;
    const randomNation = nations[Math.floor(Math.random() * nations.length)];
    const gender = role === "집사" ? "남성" : "여성";
    const genderParam = gender === "남성" ? "male" : "female";
    const name = generateName(randomNation, genderParam); 

    // [MODIFIED] 명시적 매핑 테이블을 사용하여 신력 계통 결정
    let targetType = "광휘계"; // 기본 폴백

    // 1. 매핑 테이블에서 먼저 검색
    if (BOSS_NAME_TO_ELEMENT[templeId]) {
        targetType = BOSS_NAME_TO_ELEMENT[templeId];
    } else {
        // 2. 검색 실패 시 CITY_TO_BOSS_KEY를 한 번 더 거쳐서 확인
        const bossKey = CITY_TO_BOSS_KEY[templeId];
        if (bossKey && BOSS_NAME_TO_ELEMENT[bossKey]) {
            targetType = BOSS_NAME_TO_ELEMENT[bossKey];
        } else {
            // 3. 마지막 수단으로 문자열 포함 여부 체크
            const detected = SHINRYOKU_TYPES_LIST.find(t => 
                templeId.includes(t.replace('계', ''))
            );
            if (detected) targetType = detected;
        }
    }

    // 4. 홍길동/무의 궁궐 특수 분기 (무기/신체강화계 랜덤)
    if (targetType === "무의사자") {
        targetType = Math.random() < 0.5 ? "무기강화계" : "신체강화계";
    }
    
    return {
        id: `looted_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: name,
        age: "20세",
        gender: role === "집사" ? "남성" : "여성",
        race: "인간",
        appearance: `본래 ${templeId} 소속이었으나 전쟁 후 강제로 끌려온 ${role}입니다.`,
        personality: MBTI_OPTIONS[Math.floor(Math.random() * MBTI_OPTIONS.length)],
        classType: role,
        job: JobType.SLAVE,
        level: level,
        nation: randomNation,
        currentExp: 0,
        maxExp: level * 100,
        statPoints: 0,
        classTier: getTierByLevel(level),
        shinryokuType: targetType,
        stats: generateCompanionStats(level),
        skills: [],
        equipment: {},
        inventory: [],
        affection: -50,
        loyalty: 5,
        memories: [`${templeId} 침공 당시 당신에게 납치됨.`]
    };
};