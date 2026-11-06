import { Character, Companion, BattleRole, BattlePosition } from '../types';
import { findAvailableBattlePosition } from '../utils';

/**
 * 대기 중인 동료를 파티로 소집하거나 새로운 동료를 영입할 때,
 * 3x3 전술 진형에서 비어있는 위치를 자동으로 탐색하여 배치합니다.
 */
export const assignAvailableBattlePosition = (character: Character, companion: Companion): Companion => {
    const assignedPos = findAvailableBattlePosition(character, companion.battleRole);
    return {
        ...companion,
        battlePosition: assignedPos
    };
};

/**
 * 파티 전체의 전술 진형 배치를 검사하여,
 * 누락되었거나 중복된 위치가 있을 경우 모든 파티원이 각자 고유한 빈 슬롯에 자동 배치되도록 보정합니다.
 */
export const ensurePartyBattlePositions = (character: Character): Character => {
    const occupied = new Set<string>();
    
    // 플레이어 위치 확정
    const playerPos = character.battlePosition || { row: 1, col: 1 };
    occupied.add(`${playerPos.row}-${playerPos.col}`);

    const updatedCompanions = (character.companions || []).map(comp => {
        let pos = comp.battlePosition;
        
        // 위치가 없거나 다른 파티원과 겹치는 경우 새로운 빈 슬롯 탐색
        if (!pos || occupied.has(`${pos.row}-${pos.col}`)) {
            // 임시 캐릭터 상태로 빈 자리 계산
            const tempChar: Character = {
                ...character,
                companions: Array.from(occupied).map(key => {
                    const [r, c] = key.split('-').map(Number);
                    return { battlePosition: { row: r, col: c } } as Companion;
                })
            };
            pos = findAvailableBattlePosition(tempChar, comp.battleRole);
        }

        occupied.add(`${pos.row}-${pos.col}`);
        return {
            ...comp,
            battlePosition: pos
        };
    });

    return {
        ...character,
        battlePosition: playerPos,
        companions: updatedCompanions
    };
};
