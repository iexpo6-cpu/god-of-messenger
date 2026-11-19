import { ClassTier, Enemy, SkillType } from '../types';
import { SHINRYOKU_TYPES_LIST } from '../constants';
import { generateProceduralEnemy } from '../utils';
import { GridDungeonState, generateGridDungeonFloor, revealFogOfWar, updateTileIdentifications } from './gridDungeonEngine';

export interface AbyssModifier {
    id: string;
    name: string;
    description: string;
    badgeClass: string;
}

export const ABYSS_MODIFIERS: AbyssModifier[] = [
    {
        id: 'abyss_resonance',
        name: '심연 신력 공명',
        description: '차원의 균열이 신력을 증폭시킵니다. 전투 중 신력 스킬 위력이 극대화됩니다.',
        badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/60'
    },
    {
        id: 'crimson_frenzy',
        name: '진홍빛 광기',
        description: '심연의 적들이 광폭화하여 공격력이 상승하지만 방어가 취약해집니다.',
        badgeClass: 'bg-red-950/80 text-red-300 border-red-500/60'
    },
    {
        id: 'erosion_fog',
        name: '차원 침식 안개',
        description: '짙은 심연 안개가 치유 효율을 저하시킵니다. 속전속결이 유리합니다.',
        badgeClass: 'bg-slate-900/90 text-amber-300 border-amber-500/60'
    },
    {
        id: 'void_overload',
        name: '공허 과부하',
        description: '마력과 치명타 기운이 요동쳐 폭발적인 교전이 벌어집니다.',
        badgeClass: 'bg-indigo-950/80 text-cyan-300 border-cyan-500/60'
    }
];

const ABYSS_MONSTER_NAMES = [
    '심연 균열 감시자',
    '차원의 악몽 기사',
    '공허의 마신 장군',
    '태초의 핏빛 집행관',
    '망각의 심연 사신',
    '혼돈의 마도 골렘'
];

const ABYSS_BOSS_NAMES = [
    '차원 수호자 아바돈',
    '심연 군주 벨리알',
    '균열의 패왕 말레우스',
    '태초 마신 바알제불',
    '공허의 대제 타나토스'
];

/**
 * 1층 = Lv.2,000, 10층마다 +100 Lv 상승 (100층 = Lv.3,000)
 */
export const getAbyssFloorLevel = (floor: number): number => {
    const safeFloor = Math.max(1, Math.floor(floor));
    return 2000 + Math.floor((safeFloor - 1) / 10) * 100;
};

export const getAbyssModifierForFloor = (floor: number): AbyssModifier => {
    const blockIdx = Math.floor(Math.max(0, floor - 1) / 5);
    return ABYSS_MODIFIERS[blockIdx % ABYSS_MODIFIERS.length];
};

export const isAbyssBossFloor = (floor: number): boolean => Math.max(1, floor) % 10 === 0;

/**
 * 무한 심연 탑 전용 2D 격자 층 생성
 */
export const generateAbyssTowerFloor = (floor: number): GridDungeonState => {
    const isBoss = isAbyssBossFloor(floor);
    const state = generateGridDungeonFloor(
        '마계',
        '임페리얼',
        isBoss ? 4 : 1,
        true,
        isBoss ? '차원 수호자' : undefined
    );
    revealFogOfWar(state.tiles, state.playerPos.x, state.playerPos.y, state.torchRadius || 2.0);
    updateTileIdentifications(state.tiles, state.playerPos.x, state.playerPos.y);
    return {
        ...state,
        currentFloor: floor,
        maxFloors: floor + 10,
        bossDefeated: false
    };
};

/**
 * 층수(Lv.2,000~3,500+)에 맞는 심연 탑 몬스터 / 차원 수호자 보스 생성
 */
export const generateAbyssTowerEnemies = (floor: number, isBossEncounter: boolean): Enemy[] => {
    const baseLv = getAbyssFloorLevel(floor);
    const modifier = getAbyssModifierForFloor(floor);

    if (isBossEncounter) {
        const bossLv = baseLv + 50;
        const bossName = ABYSS_BOSS_NAMES[Math.floor((floor / 10)) % ABYSS_BOSS_NAMES.length];
        const shinryoku = SHINRYOKU_TYPES_LIST[floor % SHINRYOKU_TYPES_LIST.length] || '어둠';
        const baseEnemy = generateProceduralEnemy(bossLv, `[차원 수호자] ${bossName}`, {
            region: '마계',
            nation: '임페리얼 제국',
            isBoss: true
        });
        const hpScale = 12 + Math.floor(floor / 10) * 1.5;
        const statScale = 2.8 + Math.floor(floor / 10) * 0.25;
        const maxHp = Math.floor(baseEnemy.maxHp * hpScale);

        return [
            {
                ...baseEnemy,
                name: `[심연 ${floor}F 보스] ${bossName}`,
                level: bossLv,
                hp: maxHp,
                maxHp,
                shinryokuType: shinryoku,
                description: `무한 심연 탑 ${floor}층을 수호하는 차원 수호자입니다. (${modifier.name})`,
                stats: {
                    ...baseEnemy.stats,
                    hp: maxHp,
                    maxHp,
                    str: Math.floor(baseEnemy.stats.str * statScale),
                    int: Math.floor(baseEnemy.stats.int * statScale),
                    def: Math.floor(baseEnemy.stats.def * (statScale * 1.05)),
                    agi: Math.floor(baseEnemy.stats.agi * statScale),
                    wis: Math.floor(baseEnemy.stats.wis * statScale),
                    ctrl: Math.floor(baseEnemy.stats.ctrl * (statScale * 1.2))
                },
                skills: [
                    ...(baseEnemy.skills || []),
                    {
                        name: '차원 붕괴 파동',
                        description: '심연의 균열을 열어 적 전체에 거대한 어둠 피해를 입힙니다.',
                        type: SkillType.MAGIC,
                        tier: ClassTier.FINAL,
                        mpCost: 50,
                        level: 10,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: 'INT*3.0',
                        powerRatio: 300,
                        targetType: 'all'
                    }
                ]
            }
        ];
    }

    const mobCount = Math.min(3, 1 + Math.floor(Math.random() * 2));
    const enemies: Enemy[] = [];
    for (let i = 0; i < mobCount; i++) {
        const mobLv = baseLv + (i * 15);
        const mobName = ABYSS_MONSTER_NAMES[(floor + i) % ABYSS_MONSTER_NAMES.length];
        const enemy = generateProceduralEnemy(mobLv, `[심연 ${floor}F] ${mobName}`, {
            region: '마계',
            nation: '임페리얼 제국',
            isBoss: false
        });
        const maxHp = Math.floor(enemy.maxHp * 3.5);
        enemies.push({
            ...enemy,
            hp: maxHp,
            maxHp,
            stats: {
                ...enemy.stats,
                hp: maxHp,
                maxHp,
                str: Math.floor(enemy.stats.str * 1.9),
                int: Math.floor(enemy.stats.int * 1.9),
                def: Math.floor(enemy.stats.def * 1.8),
                agi: Math.floor(enemy.stats.agi * 1.8),
                ctrl: Math.floor(enemy.stats.ctrl * 2.0)
            }
        });
    }
    return enemies;
};
