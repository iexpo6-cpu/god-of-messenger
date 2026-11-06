import { Character } from '../types';

/**
 * 던전에서 패배 시 호출되는 공통 처리 서비스:
 * - 상태이상 및 체력/마력 자동 회복 없음 (현재 상태 유지, 최소 체력 1 보전)
 * - 던전 진행도(dungeonProgress) 초기화 및 퇴각
 */
export const handleDungeonDefeatRecovery = (character: Character): { updatedCharacter: Character; logMessage: string } => {
    const finalChar: Character = { ...character };

    // 던전 진행 상황 초기화 및 퇴각 (체력/마력 및 상태이상 그대로 유지)
    finalChar.dungeonProgress = undefined;

    const logMessage = `[던전 패배] 던전에서 패배하여 던전 밖으로 후송되었습니다.`;

    return {
        updatedCharacter: finalChar,
        logMessage
    };
};
