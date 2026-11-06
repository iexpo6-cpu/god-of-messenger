import { Character, Companion, AlchemistRank } from '../types';
import { calculateFinalStats } from '../utils';
import { ResultData } from '../components/ActionResultModal';

export interface AlchemistRankConfig {
    rank: AlchemistRank;
    label: string;
    nextRank: AlchemistRank | null;
    maxLevel: number; // 해당 등급에서의 최대 레벨 한도 (승급 전까지 도달 가능한 한계)
    reqLevel: number; // 다음 등급 승급에 필요한 연금술 레벨
    reqCtrl: number;  // 다음 등급 승급에 필요한 제어 능력치
    reqWis: number;   // 다음 등급 승급에 필요한 지혜 능력치
    bonusProduction: number; // 추가 마정석 생산량
    desc: string;
    perks: string[];
}

export const ALCHEMIST_RANK_CONFIG: Record<AlchemistRank, AlchemistRankConfig> = {
    [AlchemistRank.BEGINNER]: {
        rank: AlchemistRank.BEGINNER,
        label: '초급 연금술사',
        nextRank: AlchemistRank.INTERMEDIATE,
        maxLevel: 20,
        reqLevel: 20,
        reqCtrl: 150,
        reqWis: 150,
        bonusProduction: 1,
        desc: '기초 연금술 및 마석 추출 지식을 갖춘 입문 연금술사입니다.',
        perks: [
            '기본 마석 추출 및 마정석 생산',
            '일반 및 매직 등급 장비 분해 효율 기초 적용'
        ]
    },
    [AlchemistRank.INTERMEDIATE]: {
        rank: AlchemistRank.INTERMEDIATE,
        label: '중급 연금술사',
        nextRank: AlchemistRank.ADVANCED,
        maxLevel: 50,
        reqLevel: 50,
        reqCtrl: 350,
        reqWis: 350,
        bonusProduction: 10,
        desc: '신력 속성 조각 융합과 상위 마정석 정제에 능숙한 연금술사입니다.',
        perks: [
            '추가 마정석 생산 +10',
            '신력 속성 조각 변환 수율 15% 상승',
            '레어 및 에픽 등급 연금 조합 가능'
        ]
    },
    [AlchemistRank.ADVANCED]: {
        rank: AlchemistRank.ADVANCED,
        label: '상급 연금술사',
        nextRank: AlchemistRank.MASTER,
        maxLevel: 80,
        reqLevel: 80,
        reqCtrl: 700,
        reqWis: 700,
        bonusProduction: 20,
        desc: '에픽 및 유니크급 촉매 제작과 정밀한 연금 변환을 다루는 숙련 연금술사입니다.',
        perks: [
            '추가 마정석 생산 +20',
            '유니크 등급 연금술 및 특수 촉매 정제 가능',
            '마수 체질 변환 성공 확률 추가 보너스'
        ]
    },
    [AlchemistRank.MASTER]: {
        rank: AlchemistRank.MASTER,
        label: '최상급 연금술사',
        nextRank: AlchemistRank.GRANDMASTER,
        maxLevel: 100,
        reqLevel: 100,
        reqCtrl: 1500,
        reqWis: 1500,
        bonusProduction: 50,
        desc: '전설의 영약과 마수 변환의 심오한 비전을 꿰뚫은 마스터 연금술사입니다.',
        perks: [
            '추가 마정석 생산 +50',
            '전설 등급 연금 아이템 합성 가능',
            '신력 주입 실패율 대폭 감소'
        ]
    },
    [AlchemistRank.GRANDMASTER]: {
        rank: AlchemistRank.GRANDMASTER,
        label: '대현자',
        nextRank: null,
        maxLevel: 150,
        reqLevel: 150,
        reqCtrl: 0,
        reqWis: 0,
        bonusProduction: 100,
        desc: '만물의 이치를 연금으로 재창조하는 신화적 경지의 대현자입니다.',
        perks: [
            '추가 마정석 생산 +100 (최대)',
            '모든 연금술 제조 수율 및 성공률 극대화',
            '신화급 연금 레시피 및 마석 궁극 정제'
        ]
    }
};

/**
 * 동료의 현재 연금술사 등급을 반환합니다.
 */
export function getCompanionAlchemistRank(companion: Companion): AlchemistRank {
    if (companion.alchemistRank && ALCHEMIST_RANK_CONFIG[companion.alchemistRank]) {
        return companion.alchemistRank;
    }
    const level = companion.professions?.alchemy?.level || 1;
    if (level >= 100) return AlchemistRank.GRANDMASTER;
    if (level >= 80) return AlchemistRank.MASTER;
    if (level >= 50) return AlchemistRank.ADVANCED;
    if (level >= 20) return AlchemistRank.INTERMEDIATE;
    return AlchemistRank.BEGINNER;
}

export interface AlchemistPromotionStatus {
    companion: Companion;
    currentRank: AlchemistRank;
    currentConfig: AlchemistRankConfig;
    nextRank: AlchemistRank | null;
    nextConfig: AlchemistRankConfig | null;
    currentLevel: number;
    currentExp: number;
    maxExp: number;
    currentCtrl: number;
    currentWis: number;
    reqLevel: number;
    reqCtrl: number;
    reqWis: number;
    isLevelMet: boolean;
    isCtrlMet: boolean;
    isWisMet: boolean;
    canPromote: boolean;
    shortageCtrl: number;
    shortageWis: number;
    shortageLevel: number;
}

/**
 * 특정 연금술사 동료의 승급 조건을 판별합니다.
 */
export function checkAlchemistPromotionEligibility(companion: Companion): AlchemistPromotionStatus {
    const currentRank = getCompanionAlchemistRank(companion);
    const currentConfig = ALCHEMIST_RANK_CONFIG[currentRank];
    const nextRank = currentConfig.nextRank;
    const nextConfig = nextRank ? ALCHEMIST_RANK_CONFIG[nextRank] : null;

    const mastery = companion.professions?.alchemy || { level: 1, exp: 0, maxExp: 100 };
    const currentLevel = mastery.level || 1;
    const currentExp = mastery.exp || 0;
    const maxExp = mastery.maxExp || 100;

    // 장비 및 버프가 반영된 최종 능력치 산출
    const statsResult = calculateFinalStats(companion);
    const currentCtrl = Math.floor(statsResult.finalStats?.ctrl || companion.stats?.ctrl || 0);
    const currentWis = Math.floor(statsResult.finalStats?.wis || companion.stats?.wis || 0);

    const reqLevel = currentConfig.reqLevel;
    const reqCtrl = currentConfig.reqCtrl;
    const reqWis = currentConfig.reqWis;

    const isLevelMet = currentLevel >= reqLevel;
    const isCtrlMet = currentCtrl >= reqCtrl;
    const isWisMet = currentWis >= reqWis;

    const canPromote = Boolean(nextRank && isLevelMet && isCtrlMet && isWisMet);

    const shortageLevel = Math.max(0, reqLevel - currentLevel);
    const shortageCtrl = Math.max(0, reqCtrl - currentCtrl);
    const shortageWis = Math.max(0, reqWis - currentWis);

    return {
        companion,
        currentRank,
        currentConfig,
        nextRank,
        nextConfig,
        currentLevel,
        currentExp,
        maxExp,
        currentCtrl,
        currentWis,
        reqLevel,
        reqCtrl,
        reqWis,
        isLevelMet,
        isCtrlMet,
        isWisMet,
        canPromote,
        shortageCtrl,
        shortageWis,
        shortageLevel
    };
}

/**
 * 연금술사 경험치 획득 처리 (자동 승급 방지)
 * - 해당 등급의 maxLevel에 도달하면 승급 전까지는 레벨이 올라가지 않고 경험치가 최대치에 유지됩니다.
 */
export function addAlchemistExperience(
    companion: Companion,
    expAmount: number
): { updatedCompanion: Companion; leveledUp: boolean; reachedCap: boolean } {
    const updated = { ...companion };
    if (!updated.professions) updated.professions = {};
    if (!updated.professions.alchemy) {
        updated.professions.alchemy = { level: 1, exp: 0, maxExp: 100 };
    }
    const mastery = { ...updated.professions.alchemy };
    const currentRank = getCompanionAlchemistRank(updated);
    const config = ALCHEMIST_RANK_CONFIG[currentRank];

    mastery.exp = (mastery.exp || 0) + expAmount;
    let leveledUp = false;
    let reachedCap = false;

    while (mastery.exp >= (mastery.maxExp || 100)) {
        // 다음 등급이 있고 현재 레벨이 해당 등급의 최대치에 도달한 경우 자동 레벨업 제한
        if (config.nextRank && mastery.level >= config.maxLevel) {
            mastery.exp = mastery.maxExp; // 경험치를 꽉 채운 상태로 유지
            reachedCap = true;
            break;
        }
        mastery.exp -= mastery.maxExp;
        mastery.level = (mastery.level || 1) + 1;
        mastery.maxExp = Math.floor((mastery.maxExp || 100) * 1.2);
        leveledUp = true;
    }

    updated.professions.alchemy = mastery;
    if (!updated.alchemistRank) {
        updated.alchemistRank = currentRank;
    }
    return { updatedCompanion: updated, leveledUp, reachedCap };
}

/**
 * 승급 버튼을 눌렀을 때의 승급 실행
 */
export function executeAlchemistPromotion(
    companionId: string,
    character: Character
): {
    success: boolean;
    message: string;
    newChar?: Character;
    resultData?: ResultData;
} {
    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    const targetComp = allComps.find(c => c.id === companionId);

    if (!targetComp) {
        return { success: false, message: '해당 연금술사를 찾을 수 없습니다.' };
    }

    const status = checkAlchemistPromotionEligibility(targetComp);
    if (!status.nextRank || !status.nextConfig) {
        return { success: false, message: '이미 연금술의 최고 경지(대현자)에 도달했습니다.' };
    }

    if (!status.canPromote) {
        const reasons: string[] = [];
        if (!status.isLevelMet) reasons.push(`연금술 레벨 ${status.shortageLevel} 부족`);
        if (!status.isCtrlMet) reasons.push(`제어(CTRL) ${status.shortageCtrl} 부족`);
        if (!status.isWisMet) reasons.push(`지혜(WIS) ${status.shortageWis} 부족`);
        return {
            success: false,
            message: `승급 조건이 충족되지 않았습니다. (${reasons.join(', ')})`
        };
    }

    const newChar: Character = JSON.parse(JSON.stringify(character));
    const nextRank = status.nextRank;
    const nextConfig = status.nextConfig;

    const updateInList = (list: Companion[]) => {
        const idx = list.findIndex(c => c.id === companionId);
        if (idx !== -1) {
            const comp = list[idx];
            if (!comp.professions) comp.professions = {};
            if (!comp.professions.alchemy) {
                comp.professions.alchemy = { level: status.currentLevel, exp: 0, maxExp: 100 };
            }
            comp.alchemistRank = nextRank;
            // 승급 시 1레벨 상승 및 다음 단계 경험치 개시
            comp.professions.alchemy.level = (comp.professions.alchemy.level || 1) + 1;
            comp.professions.alchemy.exp = 0;
            comp.professions.alchemy.maxExp = Math.floor((comp.professions.alchemy.maxExp || 100) * 1.25);
            comp.alchemistMastery = (comp.alchemistMastery || 0) + 100;
        }
    };

    if (newChar.companions) updateInList(newChar.companions);
    if (newChar.inactiveCompanions) updateInList(newChar.inactiveCompanions);

    const logMsg = `[연금술사 승급] ${targetComp.name} 대원이 [${nextConfig.label}] 등급으로 공식 승급했습니다! (제어: ${status.currentCtrl}/${status.reqCtrl}, 지혜: ${status.currentWis}/${status.reqWis})`;

    const resultData: ResultData = {
        type: 'levelup',
        title: '연금술사 승급 완료!',
        message: `${targetComp.name} 연금술사가 엄격한 자격 심사를 통과하여 [${nextConfig.label}] 등급으로 정식 승급했습니다!`,
        items: [
            { label: '연금술사', after: targetComp.name },
            { label: '승급 등급', before: status.currentConfig.label, after: nextConfig.label },
            { label: '제어(CTRL)', before: `${status.currentCtrl}`, after: `충족 (기준: ${status.reqCtrl})` },
            { label: '지혜(WIS)', before: `${status.currentWis}`, after: `충족 (기준: ${status.reqWis})` },
            { label: '추가 생산 보너스', before: `+${status.currentConfig.bonusProduction}`, after: `+${nextConfig.bonusProduction}` }
        ]
    };

    return {
        success: true,
        message: logMsg,
        newChar,
        resultData
    };
}
