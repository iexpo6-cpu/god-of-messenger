
import { ArenaParticipant, MercenaryRank, ClassTier, JobType } from './types';
import { generateName, generateCompanionStats, generateLevelByRank, getTierByLevel } from './utils';
import { SHINRYOKU_TYPES_LIST } from './constants';

export const ARENA_CROWD_CHEERS = [
    "와아아아! 전장의 전설들이 모였다!",
    "저 용병의 기운이 경기장을 압도하고 있어!",
    "과연 올해의 챔피언은 누가 될 것인가?!",
    "죽음의 무도회가 시작된다!",
    "신의 사자조차 눈을 뗄 수 없는 결투로군!",
    "관중들이 미친 듯이 환호합니다!",
    "도박사들이 돈을 거느라 바빠 보이는군..."
];

export const ARENA_TITLES = [
    "검성",
    "그림자 마스터",
    "폭풍의 눈",
    "불락의 성벽",
    "심연의 파수꾼",
    "태양의 집행자",
    "번개의 화신",
    "영혼 약탈자",
    "대지의 수호자",
    "은막의 암살자",
    "천공의 집행자",
    "심연의 도살자",
    "일곱 별의 추적자",
    "무적의 금강석",
    "차원 가르는 은랑",
    "만년설의 마녀",
    "강철의 선구자",
    "피의 무희",
    "황금의 탐식자",
    "공허의 사색가",
    "전율의 뇌전술사",
    "대지의 파쇄자",
    "질풍의 자객",
    "화염의 정벌자",
    "신성한 해방자"
];

/**
 * 용병 등급별 고정 레벨 구간 정의
 */
const RANK_LEVEL_MAP: Record<MercenaryRank, { min: number, max: number }> = {
    [MercenaryRank.F]: { min: 30, max: 50 },
    [MercenaryRank.E]: { min: 51, max: 70 },
    [MercenaryRank.D]: { min: 71, max: 100 },
    [MercenaryRank.C]: { min: 101, max: 150 },
    [MercenaryRank.B]: { min: 151, max: 200 },
    [MercenaryRank.A]: { min: 201, max: 300 },
    [MercenaryRank.S]: { min: 301, max: 400 },
    [MercenaryRank.SS]: { min: 401, max: 500 },
    [MercenaryRank.SSS]: { min: 501, max: 890 },
};

/**
 * 아레나 참가자 생성 (네임드 NPC)
 * @param round 현재 라운드 (64, 32, 16, 8, 4, 2, 1)
 */
export const generateArenaParticipant = (nation: string, round: number): ArenaParticipant => {
    // 라운드에 따른 최소 등급 결정
    let rank = MercenaryRank.C;
    if (round <= 2) rank = MercenaryRank.SSS;
    else if (round <= 4) rank = MercenaryRank.SS;
    else if (round <= 8) rank = MercenaryRank.S;
    else if (round <= 16) rank = MercenaryRank.A;
    else if (round <= 32) rank = MercenaryRank.B;

    const lvlConfig = RANK_LEVEL_MAP[rank];
    const level = Math.floor(Math.random() * (lvlConfig.max - lvlConfig.min + 1)) + lvlConfig.min;
    const tier = getTierByLevel(level);
    
    const gender = Math.random() > 0.5 ? "남성" : "여성";
    const genderParam = gender === "남성" ? "male" : "female";
    
    return {
        id: `arena_npc_${Math.random().toString(36).substring(7)}`,
        name: generateName(nation, genderParam),
        title: "",
        age: `${20 + Math.floor(Math.random() * 20)}세`,
        gender,
        race: "인간",
        appearance: "아레나의 열기로 달궈진 강인한 육체와 날카로운 안광.",
        personality: "호전적",
        classType: "용병",
        job: JobType.MERCENARY,
        level: level,
        currentExp: 0,
        maxExp: level * 100,
        statPoints: 0,
        classTier: tier,
        shinryokuType: tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)] : "미개방",
        stats: generateCompanionStats(level),
        skills: [],
        equipment: {},
        inventory: [],
        affection: 0,
        loyalty: 100,
        winCount: Math.floor(Math.random() * 100),
        lossCount: Math.floor(Math.random() * 10),
        mercenaryRank: rank,
        reputation: level * 10
    };
};
