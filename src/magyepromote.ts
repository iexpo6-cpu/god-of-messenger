
import { Character, JobType, Companion, Stats, ClassTier } from './types';

export const GENERAL_HIERARCHY: JobType[] = [
    JobType.MAGYE_GENERAL_11,
    JobType.MAGYE_GENERAL_10,
    JobType.MAGYE_GENERAL_9,
    JobType.MAGYE_GENERAL_8,
    JobType.MAGYE_GENERAL_7,
    JobType.MAGYE_GENERAL_6,
    JobType.MAGYE_GENERAL_5,
    JobType.MAGYE_GENERAL_4,
    JobType.MAGYE_GENERAL_3,
    JobType.MAGYE_GENERAL_2,
    JobType.MAGYE_GENERAL_1,
];

export const GENERAL_TARGET_BOSS: Partial<Record<JobType, string>> = {
    [JobType.MAGYE_GENERAL_11]: "카이로스",
    [JobType.MAGYE_GENERAL_10]: "스콜라",
    [JobType.MAGYE_GENERAL_9]: "몰드릭",
    [JobType.MAGYE_GENERAL_8]: "이그니스",
    [JobType.MAGYE_GENERAL_7]: "카르니발",
    [JobType.MAGYE_GENERAL_6]: "아자르",
    [JobType.MAGYE_GENERAL_5]: "바르칼론",
    [JobType.MAGYE_GENERAL_4]: "아포리아",
    [JobType.MAGYE_GENERAL_3]: "루시엔",
    [JobType.MAGYE_GENERAL_2]: "제로",
    [JobType.MAGYE_GENERAL_1]: "마신 임페리얼",
};

export const PROMOTE_STAT_BOOST = 200;
export const GOD_PROMOTION_STAT_BOOST = 2000; // 마신 등극 시 보너스 수치 대폭 상향

/**
 * 특정 대상의 제너럴 승급 가능 여부 확인
 */
export const checkGeneralPromotionEligibility = (character: Character, targetId: string) => {
    const isPlayer = targetId === 'player';
    const target = isPlayer ? character : [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === targetId);

    if (!target) return { allowed: false, reason: "대상을 찾을 수 없습니다." };
    
    const currentJob = target.job;
    
    // 마신(DEMON_GOD)은 이미 정점임
    if (currentJob === JobType.DEMON_GOD) {
        return { allowed: false, reason: "이미 마계의 신으로서 정점에 도달했습니다." };
    }

    const currentIndex = GENERAL_HIERARCHY.indexOf(currentJob as JobType);

    if (currentIndex === -1) {
        return { allowed: false, reason: "제너럴 직함을 보유하고 있지 않습니다." };
    }

    const isLastGeneral = currentIndex === GENERAL_HIERARCHY.length - 1;
    const nextGeneralJob = isLastGeneral ? JobType.DEMON_GOD : GENERAL_HIERARCHY[currentIndex + 1];
    const targetBossName = GENERAL_TARGET_BOSS[currentJob as JobType] || "마신 임페리얼";
    
    // 중복 서열 확인 로직
    const allMembers = [
        character,
        ...character.companions,
        ...(character.inactiveCompanions || [])
    ];

    const isJobOccupied = allMembers.some(m => {
        const mId = (m as any).id || 'player';
        return mId !== targetId && m.job === nextGeneralJob;
    });

    if (isJobOccupied) {
        return { 
            allowed: false, 
            reason: `이미 일행 중에 '${nextGeneralJob}'이(가) 존재합니다. 제너럴의 서열은 중복될 수 없습니다.` 
        };
    }

    // 마신(DEMON_GOD) 승급 시 파이널 클래스 해방 상태 필수 확인
    if (isLastGeneral) {
        const isFinalClassLiberated =
            target.classTier === ClassTier.FINAL ||
            (target.classTier as any) === 'FINAL' ||
            Boolean((target as any).finalClassName);
        if (!isFinalClassLiberated) {
            return {
                allowed: false,
                reason: "마신으로 등극하려면 파이널 클래스 해방 상태여야 합니다.",
                nextRank: 0,
                nextJob: nextGeneralJob,
                targetBossName,
                isRebellion: true
            };
        }
    }

    // 다음 서열 보스 처단 기록 확인 (memories 활용)
    const hasDefeatedNext = character.memories?.some(m => 
        m.includes(`${targetBossName} 처치`) || m.includes(`${targetBossName} 격퇴`)
    );

    if (!hasDefeatedNext) {
        return {
            allowed: false,
            reason: isLastGeneral ? `마계의 신 '마신 임페리얼'을 처단하여 실력을 증명해야 합니다.` : `제${10 - currentIndex} 제너럴 '${targetBossName}'을(를) 처단하여 실력을 증명해야 합니다.`,
            nextRank: isLastGeneral ? 0 : 10 - currentIndex,
            nextJob: nextGeneralJob,
            targetBossName,
            isRebellion: isLastGeneral
        };
    }

    return { 
        allowed: true, 
        nextRank: isLastGeneral ? 0 : 10 - currentIndex, 
        nextJob: nextGeneralJob, 
        targetBossName,
        isRebellion: isLastGeneral 
    };
};

/**
 * 제너럴 승급 수행
 */
export const performGeneralPromotion = (character: Character, targetId: string): { newChar: Character, success: boolean, message: string } => {
    const { allowed, reason, nextJob, isRebellion } = checkGeneralPromotionEligibility(character, targetId);
    if (!allowed || !nextJob) return { newChar: character, success: false, message: reason || "자격이 부족합니다." };

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    const isPlayer = targetId === 'player';

    const boost = isRebellion ? GOD_PROMOTION_STAT_BOOST : PROMOTE_STAT_BOOST;

    const applyPromotion = (entity: any) => {
        entity.job = nextJob;
        entity.nation = "임페리얼 제국"; 
        entity.stats.str += boost;
        entity.stats.int += boost;
        entity.stats.def += boost;
        entity.stats.agi += boost;
        entity.stats.wis += boost;
        entity.stats.ctrl += boost;
        entity.stats.maxHp += boost * 100;
        entity.stats.hp = entity.stats.maxHp;
        entity.stats.maxMp += boost * 100;
        entity.stats.mp = entity.stats.maxMp;
        
        if (!entity.memories) entity.memories = [];
        if (isRebellion) {
            entity.memories.push(`[${newChar.currentDate}] 마신 임페리얼을 폐위시키고 새로운 마계의 신(Demon God)으로 등극함.`);
            entity.classTier = ClassTier.FINAL;
            entity.originalVisualUrl = entity.originalVisualUrl || entity.visualUrl || entity.defaultVisualUrl;
            entity.godVisualChoice = undefined;
        } else {
            entity.memories.push(`[${newChar.currentDate}] 제너럴 서열 상승: ${nextJob}으로 임명됨.`);
        }
    };

    let targetName = "";
    if (isPlayer) {
        targetName = newChar.name;
        applyPromotion(newChar);
    } else {
        const activeIdx = newChar.companions.findIndex(c => c.id === targetId);
        const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1;
        const targetComp = activeIdx !== -1 ? newChar.companions[activeIdx] : newChar.inactiveCompanions![inactiveIdx];
        targetName = targetComp.name;
        applyPromotion(targetComp);
    }

    return {
        newChar,
        success: true,
        message: isRebellion ? `${targetName}이(가) 새로운 마계의 신으로 즉위했습니다!` : `${targetName}의 서열이 상승했습니다! 이제 ${nextJob}로서 제국을 호령합니다.`
    };
};
