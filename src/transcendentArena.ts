import { ClassTier, Enemy, JobType, MercenaryRank, SkillType, Stats, TranscendentArenaState } from './types';
import { SHINRYOKU_TYPES_LIST } from './constants';
import { DIVINE_MONSTER_IMAGE_MAP } from './divinemonsterfield';
import { generateCompanionStats, generateDefaultVisualUrl, generateName, getRaceByNation, getTierByLevel } from './utils';

export const TRANSCENDENT_ARENA_CHEERS = [
    "신의 거처 만신전이 초월자들의 격돌로 진동합니다!",
    "신계와 인간계의 경계를 넘은 자들만의 성전, 초월 그랜드 아레나!",
    "전 세계 각국의 최강자 5인 편성이 맞붙는 만신전 결투가 시작됩니다!",
    "이번 달 만신전의 패자는 누가 될 것인가?!",
    "별빛과 신력이 투기장 상공을 수놓고 있습니다!"
];

export const TRANSCENDENT_ARENA_CHAMPION_TITLES = [
    "만신전의 패자",
    "성좌의 집행자",
    "초월 투신",
    "신계 무투제왕",
    "차원 투기왕"
];

const SUFFIX_COMPANION_TITLES = [
    "만신전 수호기사",
    "성역의 대마도사",
    "천상의 검희",
    "태초의 성자",
    "별빛의 저격수",
    "심연의 검귀"
];

const TRANSCENDENT_NATION_POOL = [
    '대한민국', '일본', '중국', '영국', '프랑스', '독일', '이탈리아', '스페인',
    '러시아', '노르웨이', '스웨덴', '스위스', '오스트리아', '그리스', '폴란드',
    '미국', '캐나다', '브라질', '이집트', '인도', '태국', '터키',
    '미르탈 숲연합', '레오니스 투기국', '네크로디움 제국'
];

const GUARDIAN_BEAST_TEMPLATES = [
    { name: "초궁극체 백호황", imgKey: "성소 가디언" },
    { name: "초궁극체 성좌룡 바하무트", imgKey: "수호 천사" },
    { name: "초궁극체 심연봉황", imgKey: "빛의 인도자" },
    { name: "초궁극체 천공 기린", imgKey: "신성한 사슴" },
    { name: "초궁극체 영겁의 펜리르", imgKey: "성소의 집행관" }
];

export const getTranscendentRoundMeta = (round: number, winCount: number = 0) => {
    const w = Math.max(0, winCount || 0);
    const lvBonus = w * 120;
    const hpWinMult = 1 + w * 0.45;
    const statWinMult = 1 + w * 0.25;

    let base = { label: '결승전', minLv: 3100, maxLv: 3500, hpMult: 32000, statMult: 19.0 };
    if (round >= 128) base = { label: '128강전', minLv: 2000, maxLv: 2150, hpMult: 7000, statMult: 8.5 };
    else if (round >= 64) base = { label: '64강전', minLv: 2150, maxLv: 2300, hpMult: 9500, statMult: 10.0 };
    else if (round >= 32) base = { label: '32강전', minLv: 2300, maxLv: 2500, hpMult: 12500, statMult: 11.5 };
    else if (round >= 16) base = { label: '16강전', minLv: 2500, maxLv: 2700, hpMult: 16000, statMult: 13.0 };
    else if (round >= 8) base = { label: '8강전', minLv: 2700, maxLv: 2900, hpMult: 20000, statMult: 14.5 };
    else if (round >= 4) base = { label: '4강전', minLv: 2900, maxLv: 3100, hpMult: 25000, statMult: 16.5 };

    return {
        label: base.label,
        minLv: base.minLv + lvBonus,
        maxLv: base.maxLv + lvBonus,
        hpMult: Math.round(base.hpMult * hpWinMult),
        statMult: Number((base.statMult * statWinMult).toFixed(2))
    };
};

const buildScaledArenaStats = (level: number, hpMult: number, statMult: number): Stats => {
    const base = generateCompanionStats(level);
    const maxHp = Math.floor(base.maxHp * hpMult);
    const maxMp = Math.floor(base.maxMp * 6);
    return {
        ...base,
        hp: maxHp,
        maxHp,
        mp: maxMp,
        maxMp,
        str: Math.floor(base.str * statMult),
        int: Math.floor(base.int * statMult),
        def: Math.floor(base.def * (statMult * 1.15)),
        agi: Math.floor(base.agi * statMult),
        wis: Math.floor(base.wis * statMult),
        ctrl: Math.floor(base.ctrl * (statMult * 1.4))
    };
};

const pickDistinctNations = (count: number): string[] => {
    const shuffled = [...TRANSCENDENT_NATION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

export const generateTranscendentArenaOpponents = (
    round: number,
    defendingChampion?: TranscendentArenaState['defendingChampionSnapshot'],
    winCount: number = 0
): Enemy[] => {
    const meta = getTranscendentRoundMeta(round, winCount);
    const pickLv = (offset: number = 0) =>
        Math.max(2000, meta.minLv + Math.floor(Math.random() * (meta.maxLv - meta.minLv + 1)) + offset);

    const pickShinryoku = () =>
        SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)] || '빛';

    const nations = pickDistinctNations(4);
    const isFinal = round <= 2;

    // 1. 메인 챔피언 (결승전이고 디펜딩 챔피언 스냅샷이 있으면 분신 소환)
    const champNation = nations[0];
    const champGender = Math.random() < 0.5 ? '남성' : '여성';
    const champRace = getRaceByNation(champNation);
    const champRawName = generateName(champNation, champGender === '남성' ? 'male' : 'female');
    const champLv = pickLv(40);
    const champShinryoku = isFinal && defendingChampion ? defendingChampion.shinryokuType : pickShinryoku();
    const baseScaledChamp = buildScaledArenaStats(champLv, meta.hpMult, meta.statMult);
    const champStats: Stats = isFinal && defendingChampion
        ? {
            ...baseScaledChamp,
            hp: Math.max(baseScaledChamp.maxHp, Math.floor(defendingChampion.stats.maxHp * 4500 * (1 + Math.max(0, winCount) * 0.45))),
            maxHp: Math.max(baseScaledChamp.maxHp, Math.floor(defendingChampion.stats.maxHp * 4500 * (1 + Math.max(0, winCount) * 0.45))),
            mp: Math.max(baseScaledChamp.maxMp, Math.floor((defendingChampion.stats.maxMp || 1000) * 6)),
            maxMp: Math.max(baseScaledChamp.maxMp, Math.floor((defendingChampion.stats.maxMp || 1000) * 6)),
            str: Math.max(baseScaledChamp.str, Math.floor((defendingChampion.stats.str || 0) * meta.statMult * 0.5)),
            int: Math.max(baseScaledChamp.int, Math.floor((defendingChampion.stats.int || 0) * meta.statMult * 0.5)),
            def: Math.max(baseScaledChamp.def, Math.floor((defendingChampion.stats.def || 0) * meta.statMult * 0.5)),
            agi: Math.max(baseScaledChamp.agi, Math.floor((defendingChampion.stats.agi || 0) * meta.statMult * 0.5)),
            wis: Math.max(baseScaledChamp.wis, Math.floor((defendingChampion.stats.wis || 0) * meta.statMult * 0.5)),
            ctrl: Math.max(baseScaledChamp.ctrl, Math.floor((defendingChampion.stats.ctrl || 0) * meta.statMult * 0.5)),
        }
        : baseScaledChamp;

    const champTitle = TRANSCENDENT_ARENA_CHAMPION_TITLES[Math.floor(Math.random() * TRANSCENDENT_ARENA_CHAMPION_TITLES.length)];
    const champName = isFinal && defendingChampion
        ? `[디펜딩 챔피언 분신] ${defendingChampion.name}`
        : `[초월 아레나] ${champTitle} ${champRawName}`;
    const champVisual = generateDefaultVisualUrl(champRawName, champNation, champRace, champGender);

    const mainChampion: Enemy = {
        id: `trans_champ_${Date.now()}_0`,
        name: champName,
        level: isFinal && defendingChampion ? Math.max(champLv, defendingChampion.level) : champLv,
        hp: champStats.maxHp,
        maxHp: champStats.maxHp,
        stats: champStats,
        shinryokuType: champShinryoku,
        statusEffects: [],
        description: `${champNation} 대표로 출전한 Lv.${champLv.toLocaleString()} 만신전 초월 챔피언입니다.`,
        skills: [
            {
                name: '성좌 파멸참',
                description: '만신전의 신력을 실어 전방에 막대한 피해를 입힙니다.',
                type: SkillType.PHYSICAL,
                tier: getTierByLevel(champLv),
                mpCost: 40,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: 'STR*3.5',
                powerRatio: 350,
                targetType: 'single'
            },
            {
                name: '만신전 신벌 광선',
                description: '신성 마력으로 아군 전체를 강타합니다.',
                type: SkillType.MAGIC,
                tier: getTierByLevel(champLv),
                mpCost: 60,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: 'INT*3.0',
                powerRatio: 300,
                targetType: 'aoe'
            }
        ],
        gender: champGender,
        race: champRace,
        nation: champNation,
        visualUrl: champVisual,
        job: JobType.MERCENARY,
        mercenaryRank: MercenaryRank.SSS
    } as any;

    // 2~4. 수호 동료 3인 (각기 다른 국가 + generateDefaultVisualUrl)
    const companions: Enemy[] = [1, 2, 3].map((idx) => {
        const compNation = nations[idx];
        const compGender = Math.random() < 0.5 ? '남성' : '여성';
        const compRace = getRaceByNation(compNation);
        const compRawName = generateName(compNation, compGender === '남성' ? 'male' : 'female');
        const compLv = pickLv(-30 * idx);
        const compStats = buildScaledArenaStats(compLv, meta.hpMult * 0.78, meta.statMult * 0.9);
        const compTitle = SUFFIX_COMPANION_TITLES[(idx + round) % SUFFIX_COMPANION_TITLES.length];
        const compVisual = generateDefaultVisualUrl(compRawName, compNation, compRace, compGender);

        return {
            id: `trans_comp_${Date.now()}_${idx}`,
            name: `[수호 동료] ${compTitle} ${compRawName}`,
            level: compLv,
            hp: compStats.maxHp,
            maxHp: compStats.maxHp,
            stats: compStats,
            shinryokuType: pickShinryoku(),
            statusEffects: [],
            description: `${compNation} 출신의 Lv.${compLv.toLocaleString()} 초월 수호 동료입니다.`,
            skills: [
                {
                    name: idx === 2 ? '성역 진혼곡' : '초월 연격',
                    description: '고농축 신력을 방출해 전장을 압박합니다.',
                    type: idx % 2 === 0 ? SkillType.MAGIC : SkillType.PHYSICAL,
                    tier: ClassTier.FINAL,
                    mpCost: 35,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: idx % 2 === 0 ? 'INT*2.8' : 'STR*2.8',
                    powerRatio: 280,
                    targetType: idx === 2 ? 'aoe' : 'single'
                }
            ],
            gender: compGender,
            race: compRace,
            nation: compNation,
            visualUrl: compVisual,
            job: JobType.MERCENARY,
            mercenaryRank: MercenaryRank.SSS
        } as any;
    });

    // 5. 초궁극체 신수
    const beastLv = pickLv(-10);
    const beastStats = buildScaledArenaStats(beastLv, meta.hpMult * 0.95, meta.statMult * 0.95);
    const beastTpl = GUARDIAN_BEAST_TEMPLATES[Math.floor(Math.random() * GUARDIAN_BEAST_TEMPLATES.length)];
    const guardianBeast: Enemy = {
        id: `trans_beast_${Date.now()}_4`,
        name: `[만신전 신수] ${beastTpl.name}`,
        level: beastLv,
        hp: beastStats.maxHp,
        maxHp: beastStats.maxHp,
        stats: beastStats,
        shinryokuType: pickShinryoku(),
        statusEffects: [],
        description: `만신전 5인 결투에 동행한 Lv.${beastLv.toLocaleString()} 초궁극체 신수입니다.`,
        skills: [
            {
                name: '태초의 포효',
                description: '거대한 신수의 기운으로 적 전체를 뒤흔듭니다.',
                type: SkillType.PHYSICAL,
                tier: ClassTier.FINAL,
                mpCost: 30,
                level: 10,
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: 'STR*2.7',
                powerRatio: 270,
                targetType: 'aoe'
            }
        ],
        race: '마수',
        nation: champNation,
        visualUrl: DIVINE_MONSTER_IMAGE_MAP[beastTpl.imgKey] || DIVINE_MONSTER_IMAGE_MAP['수호 천사']
    } as any;

    return [mainChampion, ...companions, guardianBeast];
};
