
import { Enemy, SkillType, ClassTier, Stats } from './types';
import { generateEnemyStats, generateName } from './utils';
import { SHINRYOKU_TYPES_LIST, MILITARY_RANK_ORDER } from './constants';

const BOUNTY_HUNTER_TITLES = [
    "전설적인", "냉혹한", "그림자", "피의", "추격하는", "노련한", "어둠의", "무자비한"
];

/**
 * 지명수배 상태일 때 도시 진입 시 발생하는 적군 생성
 * @param nation 현재 국가
 * @param playerLevel 플레이어 레벨
 * @param infamyScore 플레이어 악명도
 */
export const generateWantedEncounter = (nation: string, playerLevel: number, infamyScore: number): Enemy[] => {
    const enemies: Enemy[] = [];
    const roll = Math.random();
    
    // 악명도에 따른 레벨 보정 (최대 +30)
    const levelOffset = Math.floor(infamyScore / 2);
    const baseLevel = levelOffset + Math.floor(Math.random()*200);

    if (roll < 0.6) {
        // --- 국가 토벌대 (Suppression Squad) ---
        // 특징: 높은 체력과 방어력, 조직적인 전투
        const count = 3;
        for (let i = 0; i < count; i++) {
            const isCommander = i === 0;
            const level = baseLevel + (isCommander ? 10 : 0);
            const stats = generateEnemyStats(level);
            
            enemies.push({
                name: isCommander ? `[토벌대장] ${nation} 정예 기사` : `[토벌대] ${nation} 수비병`,
                level,
                hp: stats.maxHp * (isCommander ? 5 : 2),
                maxHp: stats.maxHp * (isCommander ? 5 : 2),
                stats: { 
                    ...stats, 
                    def: Math.floor(stats.def * 1.5),
                    str: Math.floor(stats.str * 1.2)
                },
                statusEffects: [],
                shinryokuType: isCommander ? "강철계" : "무기강화계",
                description: isCommander ? "국가의 명령을 받고 현상수배범을 생포하러 온 베테랑 기사입니다." : "잘 훈련된 국가 정규군 병사입니다.",
                skills: [
                    {
                        name: "국가적 제압",
                        description: "법의 이름으로 대상을 무력화합니다.",
                        type: SkillType.PHYSICAL,
                        tier: ClassTier.SECOND,
                        mpCost: 15,
                        level: 5,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: isCommander ? "STR*3.5, AGI -20%" : "STR*2.0",
                        powerRatio: isCommander ? 350 : 200,
                        targetType: 'single'
                    }
                ]
            });
        }
    } else {
        // --- 현상금 사냥꾼 (Bounty Hunters) ---
        // 특징: 높은 공격력과 민첩성, 변칙적인 기술, 고유 가명 사용
        const count = 2;
        for (let i = 0; i < count; i++) {
            const level = baseLevel + 5;
            const stats = generateEnemyStats(level);
            const title = BOUNTY_HUNTER_TITLES[Math.floor(Math.random() * BOUNTY_HUNTER_TITLES.length)];
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const name = generateName(nation, gender);
            
            enemies.push({
                name: `[HUNTER] ${title} ${name}`,
                level,
                hp: stats.maxHp * 3,
                maxHp: stats.maxHp * 3,
                stats: { 
                    ...stats, 
                    agi: Math.floor(stats.agi * 1.6),
                    ctrl: Math.floor(stats.ctrl * 1.4)
                },
                statusEffects: [],
                shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
                description: "현상금을 노리고 당신의 뒤를 쫓아온 전문 사냥꾼입니다.",
                skills: [
                    {
                        name: "치명적 암습",
                        description: "[부가 효과: 출혈] 적의 급소를 정확히 노립니다.",
                        type: SkillType.PHYSICAL,
                        tier: ClassTier.SECOND,
                        mpCost: 25,
                        level: 8,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: "AGI*4.5",
                        powerRatio: 450,
                        targetType: 'single'
                    },
                    {
                        name: "사냥꾼의 덫",
                        description: "[부가 효과: 속박] 대상을 꼼짝 못하게 묶습니다.",
                        type: SkillType.DEBUFF,
                        tier: ClassTier.FIRST,
                        mpCost: 30,
                        level: 5,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: "AGI -30%, Stun(1T)",
                        targetType: 'single'
                    }
                ]
            });
        }
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

    return finalEnemies;
};