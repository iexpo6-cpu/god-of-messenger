import { Character, Enemy, Location, Quest } from '../types';
import { generateEscortAmbushEnemies } from './escortAmbushService';
import { generateTravelMonsterAmbush } from './travelAmbushService';

export interface TravelAmbushCheckResult {
    hasAmbush: boolean;
    ambushData?: {
        enemies: Enemy[];
        title: string;
        message: string;
        sourceId?: string;
    };
    logMessage?: string;
}

/**
 * 이동 중 (호위 임무 수행 포함) 습격 이벤트 발생 여부를 판정합니다.
 * - 이동 소요 시간이 1일 미만(몇 분~몇 시간)이어도 습격 이벤트가 발생합니다.
 * - 전체적인 습격 발생 확률이 대폭 상향되었습니다. (호위 중: 60%, 일반 이동 중: 40%)
 */
export const checkTravelAmbushEvent = (
    character: Character,
    destination: Location,
    totalMinutes: number,
    activeEscortQuest?: Quest
): TravelAmbushCheckResult => {
    // 1. 호위/호송 임무 수행 중 이동인 경우
    if (activeEscortQuest) {
        // 이동 시간이 1분 이상이기만 해도 60% 확률로 기습 발생! (1일 미만도 발생 가능)
        const rand = Math.random();
        if (rand < 0.60) {
            const escortData = generateEscortAmbushEnemies(activeEscortQuest, character);
            return {
                hasAmbush: true,
                ambushData: {
                    enemies: escortData.enemies,
                    title: escortData.title,
                    message: escortData.message,
                    sourceId: `escort_ambush_${activeEscortQuest.id}_${Date.now()}`
                },
                logMessage: `[🚨 호위 중 기습 발생!] ${destination.city}(으)로 이동하던 도중 ${escortData.enemyGroupLabel}의 기습을 받았습니다!`
            };
        }
    } else {
        // 2. 일반 이동 중 야생 몬스터 습격 (40% 확률)
        const rand = Math.random();
        if (rand < 0.40) {
            const days = Math.max(1, Math.ceil(totalMinutes / 1440));
            const monsterAmbush = generateTravelMonsterAmbush(character, destination, days);
            return {
                hasAmbush: true,
                ambushData: {
                    enemies: monsterAmbush.enemies,
                    title: monsterAmbush.title,
                    message: monsterAmbush.description,
                    sourceId: `travel_monster_ambush_${Date.now()}`
                },
                logMessage: monsterAmbush.logMessage
            };
        }
    }

    return { hasAmbush: false };
};
