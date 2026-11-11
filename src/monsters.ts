
import { Enemy, ClassTier, SkillType, Stats } from './types';

// Helper to create simple stats
const createStats = (hp: number, mp: number, str: number, int: number, def: number, agi: number, wis: number, ctrl: number): Stats => ({
    hp, maxHp: hp, mp, maxMp: mp, str, int, def, agi, wis, ctrl
});

export const TRAINING_MONSTERS: Enemy[] = [
    // 초급 (Lv 1~2)
    {
        name: "훈련용 허수아비",
        level: 5,
        hp: 100,
        maxHp: 100,
        visualUrl:"https://i.ibb.co/Qs72cXb/Gemini-Generated-Image-v12w7sv12w7sv12w.png",
        stats: createStats(100, 0, 0, 0, 5, 0, 0, 0),
        shinryokuType: "무속성",
        description: "공격하지 않는 짚으로 만든 허수아비입니다. 기술 연습에 적합합니다.",
        statusEffects: [],
        skills: [] // No skills
    },
    {
        name: "나무 훈련 인형",
        level: 10,
        hp: 350,
        maxHp: 350,
        visualUrl:"https://i.ibb.co/PspM9vv3/Gemini-Generated-Image-2wyu592wyu592wyu.png",
        stats: createStats(30, 50, 8, 0, 8, 5, 0, 0),
        shinryokuType: "대지계",
        description: "기초적인 움직임을 보이는 나무 인형입니다.",
        statusEffects: [],
        skills: [
            {
                name: "휘두르기",
                description: "나무 팔을 휘두른다.",
                type: SkillType.PHYSICAL,
                tier: ClassTier.FIRST,
                mpCost: 0,
                level: 1,
                maxLevel: 1,
                currentMastery: 0,
                effectFormula: "STR*1.0",
                powerRatio: 100,
                targetType: 'single'
            }
        ]
    },
    
    // 중급 (Lv 5~10)
    {
        name: "기계식 훈련 로봇",
        level: 15,
        hp: 800,
        maxHp: 800,
        visualUrl: "https://i.ibb.co/fdss1kry/mechanical-training-robot-clean-1794397527683.jpg",
        stats: createStats(80, 200, 20, 10, 25, 15, 10, 10),
        shinryokuType: "강철계",
        description: "마법 공학으로 움직이는 단단한 훈련용 로봇입니다.",
        statusEffects: [],
        skills: [
            {
                name: "강철 타격",
                description: "단단한 몸체로 부딪친다.",
                type: SkillType.PHYSICAL,
                tier: ClassTier.FIRST,
                mpCost: 10,
                level: 1,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "STR*1.2",
                powerRatio: 120,
                targetType: 'single'
            },
            {
                name: "방어 모드",
                description: "일시적으로 방어력을 높인다.",
                type: SkillType.BUFF,
                tier: ClassTier.FIRST,
                mpCost: 20,
                level: 1,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "DEF 30% 증가(3턴)",
                powerRatio: 0,
                targetType: 'self'
            }
        ]
    },

    // 고급 (Lv 10~20)
    {
        name: "마력 깃든 스파링 골렘",
        level: 25,
        hp: 2500,
        maxHp: 2500,
        visualUrl: "https://i.ibb.co/7t8yMHMb/mana-infused-sparring-golem-1794397508197.jpg",
        stats: createStats(2500, 1000, 40, 40, 40, 30, 30, 30),
        shinryokuType: "무기강화계",
        description: "실전을 상정하여 제작된 강력한 골렘입니다.",
        statusEffects: [],
        skills: [
            {
                name: "지면 강타",
                description: "땅을 내리쳐 충격파를 발생시킨다.",
                type: SkillType.PHYSICAL,
                tier: ClassTier.SECOND,
                mpCost: 30,
                level: 5,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "STR*1.5",
                powerRatio: 150,
                targetType: 'single'
            },
            {
                name: "마력 방출",
                description: "축적된 마력을 방출한다.",
                type: SkillType.MAGIC,
                tier: ClassTier.SECOND,
                mpCost: 40,
                level: 5,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: "INT*1.5",
                powerRatio: 150,
                targetType: 'aoe'
            }
        ]
    }
];

export const getTrainingMonster = (tierLevel: number): Enemy => {
    // tierLevel: Requested Level (1, 5, 10 etc)
    // Find closest match
    let closest = TRAINING_MONSTERS[0];
    let minDiff = 9999;

    for (const mob of TRAINING_MONSTERS) {
        // Adjust stats slightly to match exact requested level if needed, or just return preset
        // Here we pick the closest preset
        const diff = Math.abs((mob.level || 1) - tierLevel);
        if (diff < minDiff) {
            minDiff = diff;
            closest = mob;
        }
    }
    
    // Create a copy to avoid mutation
    return JSON.parse(JSON.stringify(closest));
};
