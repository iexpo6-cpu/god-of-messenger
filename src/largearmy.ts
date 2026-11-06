import { Enemy, SkillType, ClassTier, Stats } from './types';
import { generateEnemyStats, generateName } from './utils';
import { SHINRYOKU_TYPES_LIST } from './constants';
import { NATION_LEADERS, DEFAULT_LEADER } from './worldData';

/**
 * 대규모 침공 군대 생성
 * 리더: 1200~1500, 대장군: 1000~1250, 정예병사: 800~1000 고정 레벨링
 */
export const generateLargeArmy = (nation: string, playerLevel?: number): Enemy[] => {
    const enemies: Enemy[] = [];
    
    // 1. 군대 지도자 (Leader) - 보스급 (1200~1500 레벨)
    const leaderInfo = NATION_LEADERS[nation] || DEFAULT_LEADER;
    const leaderLevel = Math.floor(Math.random() * 301) + 1200;
    const leaderStats = generateEnemyStats(leaderLevel);
    
    enemies.push({
        name: `[군대 지도자] ${leaderInfo.name}`,
        level: leaderLevel,
        hp: leaderStats.maxHp * 8,
        maxHp: leaderStats.maxHp * 8,
        stats: { 
            ...leaderStats, 
            hp: leaderStats.maxHp * 8, 
            maxHp: leaderStats.maxHp * 8, 
            str: Math.floor(leaderStats.str * 1.5) 
        },
        shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
        description: `${nation}의 군대를 직접 통솔하는 지도자입니다.`,
        statusEffects: [],
        skills: [{
            name: "총공격 명령",
            description: "전 군의 사기를 고취시켜 공격력을 폭발시킵니다.",
            type: SkillType.BUFF,
            tier: ClassTier.LAST,
            mpCost: 50,
            level: 10,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: "STR +50%, AGI +30%",
            targetType: 'aoe'
        }]
    });

    // 2. 대장군 (General) - 부보스급 (1000~1250 레벨)
    const generalLevel = Math.floor(Math.random() * 251) + 1000;
    const generalStats = generateEnemyStats(generalLevel);
    const generalGender = Math.random() < 0.5 ? 'male' : 'female';
    enemies.push({
        name: `[대장군] ${generateName(nation, generalGender)}`,
        level: generalLevel,
        hp: generalStats.maxHp * 4,
        maxHp: generalStats.maxHp * 4,
        stats: { 
            ...generalStats, 
            hp: generalStats.maxHp * 4, 
            maxHp: generalStats.maxHp * 4 
        },
        shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
        description: "수많은 전장을 누빈 백전노장입니다. 지휘 능력이 탁월합니다.",
        statusEffects: [],
        skills: [{
            name: "전술적 압박",
            description: "적의 방어 진형을 무너뜨리고 큰 피해를 입깁니다.",
            type: SkillType.PHYSICAL,
            tier: ClassTier.LAST,
            mpCost: 20,
            level: 5,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: "STR*3.0, DEF -20%",
            powerRatio: 300,
            targetType: 'single'
        }]
    });

    // 3. 정예 병사들 (Soldiers) - 3인 (800~1000 레벨)
    for (let i = 0; i < 3; i++) {
        const solLevel = Math.floor(Math.random() * 201) + 800;
        const solStats = generateEnemyStats(solLevel);
        enemies.push({
            name: `${nation} 정예 근위병 ${String.fromCharCode(65 + i)}`,
            level: solLevel,
            hp: Math.floor(solStats.maxHp * 1.5),
            maxHp: Math.floor(solStats.maxHp * 1.5),
            stats: { 
                ...solStats, 
                hp: Math.floor(solStats.maxHp * 1.5), 
                maxHp: Math.floor(solStats.maxHp * 1.5) 
            },
            shinryokuType: "강철계",
            description: "국가의 정예 훈련을 수료한 강력한 병사입니다.",
            statusEffects: [],
            skills: []
        });
    }

    return enemies;
};