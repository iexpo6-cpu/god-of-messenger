import { Enemy, ClassTier, SkillType, Stats } from './types';
import { NATION_LEADERS, DEFAULT_LEADER } from './worldData';
import { generateEnemyStats } from './utils';
import { SHINRYOKU_TYPES_LIST } from './constants';

/**
 * 전선 점유율 100% 도달 시 등장하는 국가 지도자 보스 생성
 */
export const generateNationalLeader = (nation: string, playerLevel?: number): Enemy => {
    const leaderInfo = NATION_LEADERS[nation] || DEFAULT_LEADER;
    // 절대 레벨 1500 적용
    const level = 2500; 
    const stats = generateEnemyStats(level);

    // 지도자 보정: HP 10배, 공격/방어 2배
    const bossStats: Stats = {
        ...stats,
        hp: stats.maxHp * 1000,
        maxHp: stats.maxHp * 1000,
        str: stats.str * 3,
        int: stats.int * 3,
        def: stats.def * 3,
        ctrl: stats.ctrl * 3
    };

    return {
        name: `[국가 지도자] ${leaderInfo.title} ${leaderInfo.name}`,
        level: level,
        hp: bossStats.hp,
        maxHp: bossStats.maxHp,
        stats: bossStats,
        shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
        description: `${leaderInfo.desc} ${leaderInfo.appearance}`,
        statusEffects: [],
        skills: [
            {
                name: "국가의 위엄",
                description: "전 군의 사기를 높이고 적의 의지를 꺾습니다.",
                type: SkillType.DEBUFF,
                tier: ClassTier.FINAL,
                mpCost: 100,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "ALL_STATS -30%",
                targetType: 'aoe'
            },
            {
                name: "최종 결전의 일격",
                description: "조국의 명운을 건 강력한 공격입니다.",
                type: SkillType.PHYSICAL,
                tier: ClassTier.FINAL,
                mpCost: 50,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "STR*15.0",
                powerRatio: 1500,
                targetType: 'single'
            }
        ]
    };
};