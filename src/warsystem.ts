
import { DiplomaticStatus, NationRelation } from './types';

/**
 * 전선 상황에 따른 텍스트 브리핑 반환
 */
export const getOccupationStatusText = (occupation: number): { label: string; color: string; desc: string } => {
    if (occupation >= 100) return { label: "완전 점령", color: "text-blue-500", desc: "해당 국가를 완전히 굴복시켰습니다. 영토가 병합되었습니다." };
    if (occupation >= 70) return { label: "압도적 우세", color: "text-cyan-400", desc: "적의 수도 근처까지 진격했습니다. 승리가 눈앞입니다." };
    if (occupation >= 30) return { label: "전선 전진", color: "text-blue-300", desc: "아군이 전선을 밀어내며 유리한 고지를 점했습니다." };
    if (occupation > -30 && occupation < 30) return { label: "팽팽한 대치", color: "text-slate-400", desc: "양측의 전력이 팽팽히 맞서 일진일퇴를 반복 중입니다." };
    if (occupation <= -100) return { label: "수도 함락", color: "text-red-600", desc: "조국이 멸망했습니다. 패배의 쓴잔을 들이킵니다." };
    if (occupation <= -70) return { label: "절대 위기", color: "text-red-500", desc: "최후의 방어선이 무너지고 있습니다. 수도 방어전이 시급합니다." };
    return { label: "전선 후퇴", color: "text-orange-400", desc: "적의 거센 공세에 밀려 전선이 후퇴하고 있습니다." };
};

/**
 * 전투 결과에 따른 점유율 변동 계산 (지휘관 능력치 반영)
 */
export const calculateOccupationChange = (
    isVictory: boolean, 
    playerLevel: number, 
    commanderStats: { wis: number; ctrl: number }
): number => {
    const baseChange = isVictory ? 5 : -10; // 패배 페널티가 더 큼
    const levelBonus = playerLevel * 0.01;
    const strategyBonus = (commanderStats.wis + commanderStats.ctrl) * 0.005;
    
    let finalChange = baseChange + (isVictory ? (levelBonus + strategyBonus) : -(levelBonus + strategyBonus));
    
    // 최소/최대 변동폭 제한
    return parseFloat(finalChange.toFixed(2));
};

/**
 * 전선 진격에 필요한 군수 물자 요구량 계산
 */
export const getAdvancementCost = (occupation: number) => {
    // 점유율이 높을수록(적지 깊숙이 갈수록) 보급이 힘들어짐
    const difficulty = Math.max(1, (occupation + 100) / 40);
    return {
        gold: Math.floor(20000 * difficulty),
        food: Math.floor(50 * difficulty),
        iron: Math.floor(30 * difficulty)
    };
};
