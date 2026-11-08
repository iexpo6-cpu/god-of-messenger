import { Enemy, ClassTier, SkillType, Stats, MilitaryRank, SimpleStudent } from './types';
import { generateEnemyStats, generateProceduralEnemy, generateName } from './utils';
import { SHINRYOKU_TYPES_LIST, MILITARY_RANK_ORDER } from './constants';
import { generateNationalLeader } from './warleadersystem';

/**
 * 전쟁 상황에서의 적군(군인 또는 마물) 생성
 * 점유율(occupation)이 높아질수록 적의 스탯, 레벨, HP, 스킬 파워가 급격하게 강화됩니다.
 * (generateEnemyStats 기본 스탯을 크게 상회하는 멀티플라이어 적용)
 */
export const generateWarEnemies = (
    targetNation: string, 
    playerLevel: number, 
    isRaid: boolean, 
    occupation: number = 0, 
    socialNetwork?: SimpleStudent[]
): Enemy[] => {
    // 1. 점유율 100% (최종 레이드)
    if (occupation >= 100 && isRaid) {
        return [generateNationalLeader(targetNation, playerLevel)];
    }

    const enemies: Enemy[] = [];
    const nonHumanNations = ['임페리얼 제국', '미르탈 숲연합', '네크로디움 제국', '레오니스 투기국'];
    const isHumanNation = !nonHumanNations.includes(targetNation);

    // 2. 점유율에 따른 분대 구성 인원 및 정예도 결정
    const safeOccupation = Math.max(0, Math.min(99, occupation));
    let count = 2;
    if (safeOccupation >= 80) {
        count = 4;
    } else if (safeOccupation >= 50) {
        count = 3;
    } else if (safeOccupation >= 25) {
        count = 3;
    }

    const isEliteTier = safeOccupation >= 25;

    // 3. 점유율 기반 스탯 배율 (generateEnemyStats 기본 대비 훨씬 강력)
    // 0% 점유율: 1.3배
    // 50% 점유율: ~3.3배
    // 90% 점유율: ~5.8배
    // 99% 점유율: ~6.5배
    const occupationMultiplier = 1.3 + Math.pow(safeOccupation / 100, 1.35) * 5.2;

    // HP 보정 배율 (점유율에 따라 대폭 상승)
    const baseHpMultiplier = 1.6 + Math.pow(safeOccupation / 100, 1.4) * 6.5;

    // 점유율에 따른 레벨 보너스
    const occLevelBonus = Math.floor((safeOccupation / 100) * 1000);

    // 4. 인물 관계망에서 해당 국가의 고위 군인 탐색 (드라마틱한 재회)
    let specialOpponent: SimpleStudent | null = null;
    if (isHumanNation && socialNetwork && Math.random() < 0.35) {
        const matchingNpcs = socialNetwork.filter(n => 
            n.nation === targetNation && 
            n.militaryRank && 
            !n.isPurged
        );
        if (matchingNpcs.length > 0) {
            specialOpponent = matchingNpcs[Math.floor(Math.random() * matchingNpcs.length)];
        }
    }

    for (let i = 0; i < count; i++) {
        const baseLevel = 500 + Math.floor(Math.random() * 201) + occLevelBonus;
        const level = baseLevel + (isRaid ? 200 : 0) + (isEliteTier ? 250 : 0);

        // 기본 스탯 생성 후 점유율 배율 적용 (generateEnemyStats 상회)
        const rawStats = generateEnemyStats(level);
        const stats: Stats = {
            hp: Math.floor(rawStats.hp * occupationMultiplier * baseHpMultiplier),
            maxHp: Math.floor(rawStats.maxHp * occupationMultiplier * baseHpMultiplier),
            mp: Math.floor(rawStats.mp * occupationMultiplier),
            maxMp: Math.floor(rawStats.maxMp * occupationMultiplier),
            str: Math.floor(rawStats.str * occupationMultiplier),
            int: Math.floor(rawStats.int * occupationMultiplier),
            wis: Math.floor(rawStats.wis * occupationMultiplier),
            def: Math.floor(rawStats.def * occupationMultiplier),
            agi: Math.floor(rawStats.agi * occupationMultiplier),
            ctrl: Math.floor(rawStats.ctrl * occupationMultiplier),
        };

        if (isHumanNation) {
            // 지인 NPC 등장
            if (i === 0 && specialOpponent) {
                const s = specialOpponent;
                const sStats = s.stats as Stats;
                const friendLevel = Math.max(s.level, level + 100);
                const scaledHp = Math.floor((sStats?.maxHp || friendLevel * 120) * 3.5 * occupationMultiplier);
                
                enemies.push({
                    name: `[부대장] ${s.name} (${s.militaryRank})`,
                    level: friendLevel,
                    hp: scaledHp,
                    maxHp: scaledHp,
                    stats: {
                        hp: scaledHp,
                        maxHp: scaledHp,
                        mp: Math.floor((sStats?.mp || 200) * occupationMultiplier),
                        maxMp: Math.floor((sStats?.maxMp || 200) * occupationMultiplier),
                        str: Math.floor((sStats?.str || friendLevel * 8) * occupationMultiplier),
                        int: Math.floor((sStats?.int || friendLevel * 8) * occupationMultiplier),
                        wis: Math.floor((sStats?.wis || friendLevel * 8) * occupationMultiplier),
                        def: Math.floor((sStats?.def || friendLevel * 8) * occupationMultiplier),
                        agi: Math.floor((sStats?.agi || friendLevel * 8) * occupationMultiplier),
                        ctrl: Math.floor((sStats?.ctrl || friendLevel * 8) * occupationMultiplier),
                    },
                    statusEffects: [],
                    shinryokuType: s.shinryokuType || '무속성',
                    description: `당신과 '${s.originName}'에서 인연이 있었던 ${s.name}입니다. 점유율 ${Math.floor(safeOccupation)}%에 도달한 최후의 전선에서 당신의 거친 공세를 가로막습니다. "이 전선을 넘기기 전엔 나를 쓰러뜨려라!"`,
                    skills: [
                        {
                            name: "최후의 배수진",
                            description: "점유율 위기 상황에서 전력을 다하는 일격.",
                            type: SkillType.PHYSICAL,
                            tier: ClassTier.LAST,
                            mpCost: 30,
                            level: 10,
                            maxLevel: 10,
                            currentMastery: 0,
                            effectFormula: `STR*${(6.0 + (safeOccupation / 100) * 6.0).toFixed(1)}`,
                            powerRatio: Math.floor(500 * (1 + (safeOccupation / 100) * 1.5)),
                            targetType: 'single'
                        }
                    ]
                });
                continue;
            }

            // 계급 및 정예 부대장 설정
            const isNamedCommander = (safeOccupation >= 50 && i === 0) || (safeOccupation < 50 && isEliteTier && i === 0);
            const rankIdx = Math.min(MILITARY_RANK_ORDER.length - 1, Math.floor(level / 8));
            const rank = isNamedCommander ? MilitaryRank.COL : MILITARY_RANK_ORDER[rankIdx];
            const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const individualName = generateName(targetNation, gender);

            let prefix = `${targetNation} ${rank} 병사`;
            if (safeOccupation >= 80) {
                prefix = isNamedCommander 
                    ? `[결사 수호대장] ${targetNation} ${individualName} ${rank}`
                    : `[최종 방어 정예] ${targetNation} ${rank} 병사`;
            } else if (safeOccupation >= 50) {
                prefix = isNamedCommander 
                    ? `[중앙 수호 지휘관] ${targetNation} ${individualName} ${rank}`
                    : `[중앙 수호 정예] ${targetNation} ${rank} 병사`;
            } else if (safeOccupation >= 25) {
                prefix = isNamedCommander 
                    ? `[부대장] ${targetNation} ${individualName} ${rank}`
                    : `[전선 정예] ${targetNation} ${rank} 병사`;
            }

            const commanderHpBonus = isNamedCommander ? 3.0 : 1.4;
            const finalHp = Math.floor(stats.hp * commanderHpBonus);
            const finalMaxHp = Math.floor(stats.maxHp * commanderHpBonus);

            const skillPower = Math.floor((isNamedCommander ? 450 : 250) * (1 + (safeOccupation / 100) * 1.5));
            const strCoeff = (isNamedCommander ? 5.0 : 3.0) + (safeOccupation / 100) * 5.0;

            enemies.push({
                name: prefix,
                level,
                hp: finalHp,
                maxHp: finalMaxHp,
                stats: {
                    ...stats,
                    hp: finalHp,
                    maxHp: finalMaxHp,
                    str: Math.floor(stats.str * (isNamedCommander ? 1.4 : 1.0)),
                    def: Math.floor(stats.def * (isNamedCommander ? 1.4 : 1.0)),
                },
                statusEffects: [],
                shinryokuType: type,
                description: isNamedCommander 
                    ? `${targetNation}의 주요 거점을 사수하는 수호 지휘관 ${individualName}입니다. (전선 점유율 ${Math.floor(safeOccupation)}% 강화 수치 적용)` 
                    : `${targetNation}의 정규 수호 전사입니다. (전선 점유율 ${Math.floor(safeOccupation)}% 강화 수치 적용)`,
                skills: [
                    {
                        name: isNamedCommander ? "결사 사수의 일격" : "전선 정밀 제압",
                        description: "전선 점유율이 높아짐에 따라 더욱 강력해진 사수 일격입니다.",
                        type: SkillType.PHYSICAL,
                        tier: isNamedCommander ? ClassTier.LAST : ClassTier.SECOND,
                        mpCost: 20,
                        level: 8,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: `STR*${strCoeff.toFixed(1)}`,
                        powerRatio: skillPower,
                        targetType: isNamedCommander ? 'aoe' : 'single'
                    }
                ]
            });
        } else {
            // 마물 국가 적 생성
            const baseEnemy = generateProceduralEnemy(level);
            const isEliteMonster = (safeOccupation >= 50 && i === 0) || (isEliteTier && i === 0);
            
            const monHpBonus = (isEliteMonster ? 3.5 : 1.8) * occupationMultiplier;
            const monHp = Math.floor(baseEnemy.hp * monHpBonus);

            let monTitle = `[침략 마수] ${baseEnemy.name}`;
            if (safeOccupation >= 80) {
                monTitle = isEliteMonster ? `[최종 방어 흉폭 변종] ${baseEnemy.name}` : `[결사 수호 마수] ${baseEnemy.name}`;
            } else if (safeOccupation >= 50) {
                monTitle = isEliteMonster ? `[중앙 수호 정예 마수] ${baseEnemy.name}` : `[강화 침략 마수] ${baseEnemy.name}`;
            }

            const monStats = baseEnemy.stats ? {
                ...baseEnemy.stats,
                hp: monHp,
                maxHp: monHp,
                str: Math.floor((baseEnemy.stats.str || level * 5) * occupationMultiplier),
                int: Math.floor((baseEnemy.stats.int || level * 5) * occupationMultiplier),
                def: Math.floor((baseEnemy.stats.def || level * 5) * occupationMultiplier),
                agi: Math.floor((baseEnemy.stats.agi || level * 5) * occupationMultiplier),
            } : undefined;

            enemies.push({
                ...baseEnemy,
                name: monTitle,
                level,
                hp: monHp,
                maxHp: monHp,
                stats: monStats,
                description: `${baseEnemy.description || ''} (전선 점유율 ${Math.floor(safeOccupation)}% 강화 마수)`
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
