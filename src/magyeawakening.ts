
import { Character, JobType, Item, ItemRarity, Stats, Companion } from './types';

export const MAGYE_AWAKENING_CONFIG = {
    REQUIRED_LEVEL: 1000,
    REQUIRED_ACCESSORY: "마계의 핵",
    REQUIRED_MATERIAL: "철혈왕의 달빛 조각",
    REQUIRED_MATERIAL_COUNT: 10,
    TARGET_JOB: JobType.MAGYE_GENERAL_11,
    SUCCESS_STAT_BOOST: 500,
};

/**
 * 일행 중 이미 제11제너럴이 있는지 확인 (유일성 체크)
 */
export const checkAnyGeneral11Exists = (character: Character) => {
    const allMembers = [
        character,
        ...character.companions,
        ...(character.inactiveCompanions || [])
    ];
    return allMembers.some(m => m.job === JobType.MAGYE_GENERAL_11);
};

/**
 * 특정 대상의 마계 제너럴 각성 자격 확인
 */
export const checkMagyeAwakeningEligibility = (character: Character, targetId: string) => {
    // 0. 유일성 확인
    if (checkAnyGeneral11Exists(character)) {
        return { allowed: false, reason: "이미 일행 중에 제11제너럴이 존재합니다. 제너럴의 자리는 유일해야 합니다." };
    }

    const isPlayer = targetId === 'player';
    const target = isPlayer ? character : [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === targetId);

    if (!target) return { allowed: false, reason: "대상을 찾을 수 없습니다." };

    // 1. 레벨 확인
    if (target.level < MAGYE_AWAKENING_CONFIG.REQUIRED_LEVEL) {
        return { allowed: false, reason: `레벨 ${MAGYE_AWAKENING_CONFIG.REQUIRED_LEVEL} 이상이어야 마신의 부름에 응할 수 있습니다. (현재: Lv.${target.level})` };
    }

    // 2. 마계의 핵 장착 확인 (Accessory 슬롯)
    const isCoreEquipped = target.equipment.accessory?.name === MAGYE_AWAKENING_CONFIG.REQUIRED_ACCESSORY;
    if (!isCoreEquipped) {
        return { allowed: false, reason: `'${MAGYE_AWAKENING_CONFIG.REQUIRED_ACCESSORY}'을(를) 장신구(Accessory) 슬롯에 장착해야 합니다.` };
    }

    // 3. 재료 확인 (철혈왕의 달빛 조각)
    const materialCount = character.inventory.filter(i => i.name === MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL).length;
    if (materialCount < MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT) {
        return { allowed: false, reason: `재료 부족: '${MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL}' ${MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT}개가 필요합니다. (현재: ${materialCount}개)` };
    }

    // 4. 퀘스트 완료 확인 (제11 제너럴 루나스 처단)
    const hasDefeatedLunas = character.memories?.some(m => m.includes("루나스 처치") || m.includes("루나스 격퇴"));
    if (!hasDefeatedLunas) {
        return { allowed: false, reason: "제11 제너럴 루나스를 처치하여 실력을 증명해야 합니다." };
    }

    return { allowed: true };
};

/**
 * 마계 제너럴 전직 수행
 */
export const performMagyeAwakening = (character: Character, targetId: string): { newChar: Character, success: boolean, message: string } => {
    const { allowed, reason } = checkMagyeAwakeningEligibility(character, targetId);
    if (!allowed) return { newChar: character, success: false, message: reason || "자격이 부족합니다." };

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    const isPlayer = targetId === 'player';
    
    // 재료 소모
    let removed = 0;
    newChar.inventory = newChar.inventory.filter(item => {
        if (item.name === MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL && removed < MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT) {
            removed++;
            return false;
        }
        return true;
    });

    const boost = MAGYE_AWAKENING_CONFIG.SUCCESS_STAT_BOOST;
    const applyAwakening = (entity: any) => {
        entity.job = MAGYE_AWAKENING_CONFIG.TARGET_JOB;
        entity.nation = "임페리얼 제국"; // 각성 시 국적 변경
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
        entity.memories.push(`[${newChar.currentDate}] 마신 임페리얼의 인정을 받아 마계의 제11 제너럴로 임명됨. 국적이 임페리얼 제국으로 귀속되었습니다.`);
    };

    let targetName = "";
    if (isPlayer) {
        targetName = newChar.name;
        applyAwakening(newChar);
    } else {
        const activeIdx = newChar.companions.findIndex(c => c.id === targetId);
        const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1;
        const targetComp = activeIdx !== -1 ? newChar.companions[activeIdx] : newChar.inactiveCompanions![inactiveIdx];
        targetName = targetComp.name;
        applyAwakening(targetComp);
    }

    return {
        newChar,
        success: true,
        message: `${targetName}은(는) 이제 마계의 제너럴로서 군림합니다.`
    };
};
