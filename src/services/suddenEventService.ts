import { Character, Companion, Enemy, Item, Skill, SkillType, ClassTier, WeaponType, Stats } from '../types';
import { generateEnemyStats, getRequiredExp } from '../utils';
import { WEAPON_TYPE_KOREAN } from '../constants';
import { createRivalEnemies } from './npcLifeEngine';

export type SuddenEventType =
    | 'rift_crystal'       // 🌌 차원의 균열 / 폭주하는 신력 결정체 난입
    | 'rival_ambush'       // ⚔️ 영원의 라이벌 / 수배범 / 타락한 사자 기습 난입
    | 'ancient_blacksmith' // 🔨 떠돌이 고대 대장장이 조우
    | 'monster_frenzy';    // 🔥 몬스터 군락의 광폭화 (연쇄 토벌 보너스)

export interface SuddenEventData {
    id: string;
    type: SuddenEventType;
    title: string;
    subtitle: string;
    message: string;
    enemies?: Enemy[];
    enemyLevel?: number;
    // 차원의 균열 (신력 결정체) 전용
    expMultiplier?: number;      // 10 ~ 20배
    masteryBonus?: number;       // 무기 숙련도 경험치 대량 획득 (+40 ~ +80)
    baseCombatExp?: number;      // 직전 전투 획득 경험치 기준값
    // 라이벌/숙적 기습 전용
    levelUpCount?: number;       // 승리 시 즉시 1 ~ 3레벨업 분량 경험치
    rivalName?: string;
    // 몬스터 군락 광폭화 전용
    rewardMultiplier?: number;   // 보상 5배
    lootRollCount?: number;      // 드랍 판정 5회
    statMultiplier?: number;     // 적 스탯 2.5배
    // 공통 메타데이터 (전투 복귀용)
    originalCombatType?: string;
    dungeonId?: string;
}

/**
 * 일반 필드/던전 전투 승리 후 확률적으로 돌발 이벤트 4종 중 하나를 발생시킵니다.
 * - 차원의 균열 (폭주하는 신력 결정체 난입): 7% (5~8% 구간)
 * - 라이벌 / 수배범 / 타락한 사자 기습 난입: 5%
 * - 떠돌이 고대 대장장이 조우: 5%
 * - 몬스터 군락의 광폭화 (연쇄 토벌 보너스): 6%
 */
export const rollSuddenPostCombatEvent = (
    character: Character,
    defeatedEnemies: Enemy[],
    accumulatedExp: number,
    originalCombatType?: string,
    dungeonId?: string
): SuddenEventData | undefined => {
    const validTypes = ['normal', 'dungeon', 'instant_dungeon', undefined];
    if (!validTypes.includes(originalCombatType)) {
        return undefined;
    }

    const roll = Math.random() * 100;
    const avgEnemyLevel = defeatedEnemies.length > 0
        ? Math.max(1, Math.round(defeatedEnemies.reduce((sum, e) => sum + (e.level || character.level || 1), 0) / defeatedEnemies.length))
        : Math.max(1, character.level || 1);

    // 1. 「차원의 균열 / 폭주하는 신력 결정체 난입」 (7% 확률: 0 ~ 7)
    if (roll < 7) {
        const expMult = Math.floor(Math.random() * 11) + 10; // 10 ~ 20배
        const masteryBonus = Math.floor(Math.random() * 41) + 40; // +40 ~ +80 숙련도 EXP
        const crystalLevel = Math.max(avgEnemyLevel, character.level || 1);
        const rawStats = generateEnemyStats(crystalLevel, 'normal');

        // 공격력은 약한 대신(30%) 적당한 체력을 지닌 결정체
        const crystalHp = Math.max(500, Math.floor(rawStats.maxHp * 1.2));
        const crystalStats: Stats = {
            ...rawStats,
            hp: crystalHp,
            maxHp: crystalHp,
            str: Math.max(5, Math.floor(rawStats.str * 0.3)),
            int: Math.max(5, Math.floor(rawStats.int * 0.3)),
            agi: Math.max(10, Math.floor(rawStats.agi * 0.85))
        };

        const crystalEnemy: Enemy = {
            id: `rift_crystal_${Date.now()}`,
            name: '[폭주하는 신력 결정체]',
            level: crystalLevel,
            hp: crystalHp,
            maxHp: crystalHp,
            stats: crystalStats,
            statusEffects: [],
            shinryokuType: '신성계',
            visualUrl: 'https://i.ibb.co/vxqKL0G/crystal-monster.png',
            description: '차원의 균열에서 뿜어져 나온 고밀도의 순수 신력 덩어리입니다. 공격성은 낮으나 불안정하여 언제 차원 너머로 소멸할지 모릅니다.',
            skills: [
                {
                    name: '신력 파동 방출',
                    type: SkillType.MAGIC,
                    tier: ClassTier.FIRST,
                    mpCost: 10,
                    level: 1,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'M.Atk 80%',
                    powerRatio: 80,
                    description: '불안정한 신력 파동을 방출합니다.'
                }
            ]
        };
        (crystalEnemy as any).isRiftCrystal = true;

        return {
            id: `sudden_rift_${Date.now()}`,
            type: 'rift_crystal',
            title: '차원의 균열: 신력 결정체 출현!',
            subtitle: '폭풍 경험치 · 무기 숙련도 대량 획득 찬스',
            message: '전투의 여파로 공간이 일그러지며 [폭주하는 신력 결정체]가 나타났습니다!',
            enemies: [crystalEnemy],
            enemyLevel: crystalLevel,
            expMultiplier: expMult,
            masteryBonus,
            baseCombatExp: Math.max(accumulatedExp, crystalLevel * 500),
            originalCombatType,
            dungeonId
        };
    }

    // 2. ⚔️ 「라이벌 / 수배범 / 타락한 사자의 기습 난입」 (5% 확률: 7 ~ 12)
    if (roll < 12) {
        const levelUpCount = Math.floor(Math.random() * 3) + 1; // 1 ~ 3회분 레벨업 경험치
        const playerLevel = Math.max(1, character.level || 1);

        const allNpcs = [
            ...(character.socialNetwork || []),
            ...(character.schoolData?.classmates || [])
        ];
        const activeEternalRival = allNpcs.find(n => n.isEternalRival && !n.isPurged && !n.isDead);
        const isEternalRivalDead = Boolean(character.hasEternalRivalDied);

        let ambushEnemies: Enemy[] = [];
        let rivalName = '';
        let message = '';

        if (activeEternalRival && !isEternalRivalDead) {
            // 플레이어 레벨과 비슷하게 맞춘 영원의 라이벌 난입
            const scaledRival = {
                ...activeEternalRival,
                level: Math.max(activeEternalRival.level || 1, playerLevel)
            };
            ambushEnemies = createRivalEnemies(scaledRival);
            rivalName = activeEternalRival.name;
            message = `전투가 끝난 직후 강렬한 투기가 사방을 짓누릅니다! 당신의 뒤를 쫓던 영원의 라이벌 [${rivalName}](Lv.${scaledRival.level})이(가) 기습 결투를 걸어왔습니다!`;
        } else {
            // 영원의 라이벌이 없거나 사망한 경우: 수배범 또는 타락한 사자 난입
            const isFallenMessenger = Math.random() < 0.5;
            rivalName = isFallenMessenger ? '[타락한 사자] 카르마' : '[특급 수배범] 블러드 팬텀';
            const enemyStats = generateEnemyStats(playerLevel, 'elite');
            const hp = Math.max(1000, Math.floor(enemyStats.maxHp * 1.8));
            ambushEnemies = [
                {
                    id: `rival_ambush_${Date.now()}`,
                    name: rivalName,
                    level: playerLevel,
                    hp,
                    maxHp: hp,
                    stats: { ...enemyStats, hp, maxHp: hp },
                    statusEffects: [],
                    isBoss: true,
                    shinryokuType: isFallenMessenger ? '암흑계' : '무기강화계',
                    description: isFallenMessenger
                        ? '신성을 버리고 타락하여 강자들의 영혼을 사냥하는 타락한 사자입니다.'
                        : '대륙 전역에 막대한 현상금이 걸린 악명 높은 특급 수배범입니다.',
                    skills: [
                        {
                            name: isFallenMessenger ? '타락한 신벌의 일격' : '암살자의 급소 베기',
                            type: isFallenMessenger ? SkillType.MAGIC : SkillType.PHYSICAL,
                            tier: ClassTier.SECOND,
                            mpCost: 30,
                            level: 5,
                            maxLevel: 10,
                            currentMastery: 0,
                            effectFormula: isFallenMessenger ? 'M.Atk 220%' : 'P.Atk 220%',
                            powerRatio: 220,
                            description: '치명적인 기습 일격을 가합니다.'
                        }
                    ]
                }
            ];
            message = `피 냄새를 맡고 당신과 비슷한 경지에 오른 강적 ${rivalName}(Lv.${playerLevel})이(가) 기습을 감행했습니다!`;
        }

        return {
            id: `sudden_rival_${Date.now()}`,
            type: 'rival_ambush',
            title: '숙적의 기습 난입!',
            subtitle: `승리 시 즉시 레벨업 ${levelUpCount}회분 경험치 확정 획득`,
            message,
            enemies: ambushEnemies,
            enemyLevel: playerLevel,
            levelUpCount,
            rivalName,
            originalCombatType,
            dungeonId
        };
    }

    // 3. 🔨 「떠돌이 고대 대장장이 조우」 (5% 확률: 12 ~ 17)
    if (roll < 17) {
        return {
            id: `sudden_blacksmith_${Date.now()}`,
            type: 'ancient_blacksmith',
            title: '떠돌이 고대 대장장이와의 조우',
            subtitle: '무료 +1~+3 안전 강화 또는 스킬/무기숙련도 즉시 +1레벨 전수',
            message: '전투가 끝난 자리에 신비로운 화염을 두른 노인이 나타났습니다.\n"자네가 든 무기에 내 불꽃을 한 번 불어넣어 주지. 아니면 자네들의 무예에 깃든 막힌 혈을 뚫어주던가!"',
            originalCombatType,
            dungeonId
        };
    }

    // 4. 🔥 「몬스터 군락의 광폭화 (연쇄 토벌 보너스)」 (6% 확률: 17 ~ 23)
    if (roll < 23 && defeatedEnemies.length > 0) {
        const statMult = 2.5;
        const rewardMult = 5;

        const frenzyEnemies: Enemy[] = defeatedEnemies.map((orig, idx) => {
            const baseName = (orig.name || '몬스터').replace(/\s+[A-Z]$/, '').replace(/^\[광폭화\]\s*|^\[군락 우두머리\]\s*/, '');
            const isLeader = idx === 0;
            const prefix = isLeader ? '[군락 우두머리]' : '[광폭화]';
            const lvl = orig.level || avgEnemyLevel;
            const origStats = orig.stats || generateEnemyStats(lvl, isLeader ? 'elite' : 'normal');
            const newMaxHp = Math.max(300, Math.floor((orig.maxHp || origStats.maxHp || 300) * statMult * (isLeader ? 1.2 : 1.0)));

            const scaledStats: Stats = {
                hp: newMaxHp,
                maxHp: newMaxHp,
                mp: Math.floor((origStats.mp || 100) * statMult),
                maxMp: Math.floor((origStats.maxMp || 100) * statMult),
                str: Math.max(10, Math.floor((origStats.str || 10) * statMult)),
                int: Math.max(10, Math.floor((origStats.int || 10) * statMult)),
                def: Math.max(10, Math.floor((origStats.def || 10) * statMult)),
                agi: Math.max(10, Math.floor((origStats.agi || 10) * statMult)),
                wis: Math.max(10, Math.floor((origStats.wis || 10) * statMult)),
                ctrl: Math.max(10, Math.floor((origStats.ctrl || 10) * statMult))
            };

            return {
                ...orig,
                id: `frenzy_${idx}_${Date.now()}`,
                name: `${prefix} ${baseName}${defeatedEnemies.length > 1 && !isLeader ? ` ${String.fromCharCode(64 + idx)}` : ''}`,
                level: lvl,
                hp: newMaxHp,
                maxHp: newMaxHp,
                stats: scaledStats,
                isBoss: isLeader || orig.isBoss,
                statusEffects: [
                    {
                        name: '군락의 광폭화',
                        duration: 99,
                        effect: '모든 능력치 및 생명력 2.5배 폭증'
                    }
                ]
            };
        });

        return {
            id: `sudden_frenzy_${Date.now()}`,
            type: 'monster_frenzy',
            title: '몬스터 군락의 광폭화!',
            subtitle: '하드코어 연쇄 토벌 (보상 5배 / 적 스탯 2.5배)',
            message: '피 냄새를 맡고 우두머리가 무리를 이끌고 몰려옵니다! (보상 5배 / 적 스탯 2.5배)',
            enemies: frenzyEnemies,
            enemyLevel: avgEnemyLevel,
            rewardMultiplier: rewardMult,
            lootRollCount: rewardMult,
            statMultiplier: statMult,
            originalCombatType,
            dungeonId
        };
    }

    return undefined;
};

/**
 * 고대 대장장이의 무료 장비 강화 (+1 ~ +3, 비용/실패 패널티 없음) 적용 헬퍼
 */
export const applyAncientBlacksmithEnhance = (
    item: Item
): { updatedItem: Item; gain: number; oldEnh: number; newEnh: number; unlockedOptions: string[] } => {
    const oldEnh = item.enhancement || 0;
    // +1 ~ +3 랜덤 결정 (1: 45%, 2: 35%, 3: 20%)
    const r = Math.random() * 100;
    const gain = r < 20 ? 3 : r < 55 ? 2 : 1;
    const newEnh = oldEnh + gain;

    const updatedItem: Item = {
        ...item,
        enhancement: newEnh,
        failureCount: 0
    };

    if (!updatedItem.stats || Object.keys(updatedItem.stats).length === 0) {
        updatedItem.stats = { str: 5, int: 5 };
    }

    const unlockedOptions: string[] = [];
    const newSecondaryOptions = [...(updatedItem.secondaryOptions || [])];

    for (let lv = oldEnh + 1; lv <= newEnh; lv++) {
        if (lv === 5) {
            const opts = ['물리 공격력 +3%', '마법 공격력 +3%', '물리 방어력 +3%', '마법 방어력 +3%'];
            const picked = opts[Math.floor(Math.random() * opts.length)];
            newSecondaryOptions.push(picked);
            unlockedOptions.push(picked);
        } else if (lv === 8) {
            newSecondaryOptions.push('치명타 확률 +2%');
            unlockedOptions.push('치명타 확률 +2%');
        } else if (lv === 10) {
            newSecondaryOptions.push('최종 능력치 +5%');
            unlockedOptions.push('최종 능력치 +5%');
        } else if (lv === 15) {
            newSecondaryOptions.push('상태이상 +5%');
            unlockedOptions.push('상태이상 +5%');
        } else if (lv === 20) {
            newSecondaryOptions.push('최종 능력치 +13%');
            unlockedOptions.push('최종 능력치 +13%');
        }
    }

    updatedItem.secondaryOptions = newSecondaryOptions;
    return { updatedItem, gain, oldEnh, newEnh, unlockedOptions };
};

/**
 * 고대 대장장이의 무기 숙련도 즉시 +1레벨 전수 헬퍼
 */
export const applyAncientBlacksmithMasteryLevelUp = (
    entity: Character | Companion,
    weaponType: WeaponType
): { oldLevel: number; newLevel: number; weaponName: string } => {
    const currentMastery = { ...(entity.weaponMastery || {}) };
    const entry = currentMastery[weaponType] || { level: 0, currentExp: 0 };
    const oldLevel = entry.level || 0;
    const newLevel = Math.min(100, oldLevel + 1);

    currentMastery[weaponType] = {
        level: newLevel,
        currentExp: entry.currentExp || 0
    };

    entity.weaponMastery = currentMastery;
    const weaponName = WEAPON_TYPE_KOREAN[weaponType] || weaponType;
    return { oldLevel, newLevel, weaponName };
};

/**
 * 라이벌/숙적 기습 승리 시 1~3레벨업 분량 경험치 계산 헬퍼
 */
export const calculateRivalAmbushVictoryExp = (currentLevel: number, levelUpCount: number): number => {
    let totalExp = 0;
    const count = Math.max(1, Math.min(3, levelUpCount));
    for (let i = 0; i < count; i++) {
        totalExp += getRequiredExp(currentLevel + i);
    }
    return totalExp;
};
