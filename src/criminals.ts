
import { ClassTier, SkillType, Skill, Enemy, Stats, ItemRarity, Criminal } from './types';
import { generateEnemyStats, generateName, generateDefaultVisualUrl } from './utils';
import { SHINRYOKU_TYPES_LIST } from './constants';

const CRIMINAL_TITLES = [
    "피에 젖은", "배신자", "그림자 속의", "광기의", "탐욕스러운", "무자비한", "잔혹한", 
    "떠돌이", "무법자", "타락한", "공포의", "심연의", "저주받은", "사악한"
];

const CRIMINAL_CLASS_SUFFIXES = [
    "도살자", "암살자", "탈영병", "약탈자", "살인마", "파괴자", "흑마법사", "자객", "괴한"
];

const CRIMINAL_DESCRIPTIONS = [
    "국가 기밀을 탈취하고 도주 중인 위험인물입니다.",
    "무고한 상단들을 습격하여 막대한 피해를 입혔습니다.",
    "금지된 신력을 남용하여 민간인들에게 해를 끼쳤습니다.",
    "동료를 배신하고 성물을 훔쳐 달아난 대역죄인입니다.",
    "도시의 치안을 어지럽히고 경비병들을 살해한 극악무도한 자입니다.",
    "자신의 이익을 위해 타국의 스파이 노릇을 한 배신자입니다.",
    "어린아이를 강간하고 괴롭혔습니다.",
    "도시를 약탈하고, 불태웠습니다.",
    "선량한 시민을 살인하고 도망쳤습니다."
];

/**
 * 특정 국가에 맞는 랜덤 범죄자 명단 생성
 */

export const generateRegionalBlacklist = (nation: string, playerLevel: number, count: number = 3, currentYear: number = 2000): Criminal[] => {
    const blacklist: Criminal[] = [];

    for (let i = 0; i < count; i++) {
        const id = `crm_${nation}_${Math.random().toString(36).substring(7)}`;
        const gender = Math.random() > 0.5 ? "남성" : "여성"; 
        const genderParam = gender === "남성" ? "male" : "female";
        const name = generateName(nation, genderParam);
        const titlePrefix = CRIMINAL_TITLES[Math.floor(Math.random() * CRIMINAL_TITLES.length)];
        const classSuffix = CRIMINAL_CLASS_SUFFIXES[Math.floor(Math.random() * CRIMINAL_CLASS_SUFFIXES.length)];
        const title = `${titlePrefix} ${classSuffix}`;
        const infamy = 1 + Math.floor(Math.random() * 1000); 
        const level = Math.floor(Math.min(500,Math.max(1, Math.floor(Math.random() * 26) + (infamy/2))));
        
         
        
        const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
        const description = CRIMINAL_DESCRIPTIONS[Math.floor(Math.random() * CRIMINAL_DESCRIPTIONS.length)];
        
        const rewardGold = level * 100 + infamy * 100;
        const rewardExp = level * 10 + infamy * 20;
        const rewardReputation = Math.floor(infamy / 10);

        const ageNum = 20 + Math.floor(Math.random() * 40);

        blacklist.push({
            id,
            name,
            title,
            nation,
            gender, 
            infamy,
            level,
            shinryokuType: type,
            classType: classSuffix,
            description,
            rewardGold,
            rewardExp,
            rewardReputation,
            visualUrl: generateDefaultVisualUrl(name, nation, '인간', gender),
            birthYear: currentYear - ageNum,
            skills: [
                {
                    name: "악의 일격",
                    description: "적의 급소를 노리는 비열한 공격입니다.",
                    type: SkillType.PHYSICAL,
                    tier: ClassTier.SECOND,
                    mpCost: 20,
                    level: 5,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: "STR*3.0",
                    powerRatio: 300,
                    targetType: 'single'
                }
            ]
        });
    }

    return blacklist;
};

/**
 * 전 세계를 무대로 활동하는 대역죄인 명단 생성
 */
export const generateGreatCriminals = (playerLevel: number, count: number = 3, currentYear: number = 2000): Criminal[] => {
    const blacklist: Criminal[] = [];
    const nations = ["대한민국", "미국", "중국", "일본", "인도", "영국", "프랑스", "독일", "러시아", "브라질"];

    for (let i = 0; i < count; i++) {
        const nation = nations[Math.floor(Math.random() * nations.length)];
        const id = `great_crm_${nation}_${Math.random().toString(36).substring(7)}`;
        const gender = Math.random() > 0.5 ? "남성" : "여성"; 
        const genderParam = gender === "남성" ? "male" : "female";
        const name = generateName(nation, genderParam);
        const titlePrefix = ["멸망의", "재앙의", "금지된", "신성모독의", "세계의 적", "차원 너머의"];
        const prefix = titlePrefix[Math.floor(Math.random() * titlePrefix.length)];
        const classSuffix = CRIMINAL_CLASS_SUFFIXES[Math.floor(Math.random() * CRIMINAL_CLASS_SUFFIXES.length)];
        const title = `${prefix} ${classSuffix}`;
        
        // 악명도 1000급
        const infamy = 1000 + Math.floor(Math.random() * 500); 
        // 레벨 대폭 상향 (최소 200 이상)
        const level = 500 + Math.floor(Math.random() * 300);
        
        const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
        const description = "국가 전복을 꾀하거나 인류 전체에 위협이 되는 대역죄인입니다. 전 세계 어디에나 숨어있을 수 있습니다.";
        
        const rewardGold = level * 250 + infamy * 500;
        const rewardExp = level * 50 + infamy * 50;
        const rewardReputation = Math.floor(infamy / 5);

        const ageNum = 30 + Math.floor(Math.random() * 30);

        blacklist.push({
            id,
            name,
            title,
            nation,
            gender, 
            infamy,
            level,
            shinryokuType: type,
            classType: classSuffix,
            description,
            rewardGold,
            rewardExp,
            rewardReputation,
            visualUrl: generateDefaultVisualUrl(name, nation, '인간', gender),
            birthYear: currentYear - ageNum,
            skills: [
                {
                    name: "종말의 일격",
                    description: "모든 것을 파괴하는 대역죄인의 일격입니다.",
                    type: SkillType.PHYSICAL,
                    tier: ClassTier.FINAL,
                    mpCost: 100,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: "STR*10.0",
                    powerRatio: 1000,
                    targetType: 'single'
                }
            ]
        });
    }

    return blacklist;
};
export const convertCriminalToEnemy = (criminal: Criminal): Enemy => {
    const baseStats = generateEnemyStats(criminal.level);
    
    // 악명도에 따른 추가 위압감 계수 (기본 1.0 + 악명 / 1000, 최대 2.5)
    const infamyBonus = 1.0 + Math.min(5, (criminal.infamy || 0) / 1000);

    // 수배자/범죄자 보정: 실제 캐릭터보다 훨씬 위협적으로 등장하도록 체력 35배, 공격력 3.5배, 방어 3.0배, 제어력 4.0배로 대폭 상향
    const hpMult = Math.floor(35 * infamyBonus);
    const finalHp = baseStats.maxHp * hpMult;

    const bossStats: Stats = {
        ...baseStats,
        hp: finalHp,
        maxHp: finalHp,
        mp: Math.floor(baseStats.mp * 4),
        maxMp: Math.floor(baseStats.maxMp * 4),
        str: Math.floor(baseStats.str * 3.5 * infamyBonus),
        int: Math.floor(baseStats.int * 3.5 * infamyBonus),
        def: Math.floor(baseStats.def * 3.0 * infamyBonus),
        agi: Math.floor(baseStats.agi * 2.2),
        wis: Math.floor(baseStats.wis * 2.2),
        ctrl: Math.floor(baseStats.ctrl * 4.0 * infamyBonus)
    };

    return {
        name: `[WANTED] ${criminal.name}`,
        level: criminal.level,
        hp: bossStats.hp,
        maxHp: bossStats.maxHp,
        stats: bossStats,
        shinryokuType: criminal.shinryokuType,
        description: `${criminal.title} - ${criminal.description}`,
        statusEffects: [],
        skills: criminal.skills,
        visualUrl: criminal.visualUrl
    };
};
