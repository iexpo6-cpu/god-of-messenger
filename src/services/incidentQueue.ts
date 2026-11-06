import { Character, Enemy } from '../types';

export interface AmbushData {
    enemies: Enemy[];
    sourceId: string;
    title?: string;
    message?: string;
}

export interface BaseAttackData {
    enemies: Enemy[];
    log: string;
    enemyPower: number;
}

/**
 * 기지 방어 이벤트와 인연 습격 이벤트가 동시에 존재하는 경우,
 * 전투 덮어쓰기 및 증발을 방지하기 위해 기지 방어를 먼저 진행하고 인연 습격을 큐로 이동합니다.
 */
export function resolveIncidentConflicts(character: Character): Character {
    if (!character) return character;
    const newChar = { ...character };

    // 기지 방어와 인연 습격이 둘 다 존재하는 경우: 기지 방어를 우선하고 인연 습격을 대기열로 보관
    if (newChar.pendingBaseAttackEvent && newChar.pendingAmbush) {
        if (!newChar.queuedAmbushes) newChar.queuedAmbushes = [];
        newChar.queuedAmbushes.push(newChar.pendingAmbush);
        newChar.queuedAmbush = newChar.queuedAmbushes[0];
        delete newChar.pendingAmbush;
    }

    return newChar;
}

/**
 * 인연/용병 습격 등록 (기지 방어가 진행 중이거나 대기 중이거나, 이미 pendingAmbush가 있으면 큐에 저장하여 차례대로 발생하도록 함)
 */
export function registerAmbush(character: Character, ambush: AmbushData): Character {
    const newChar = { ...character };
    if (!newChar.queuedAmbushes) newChar.queuedAmbushes = [];

    if (newChar.pendingBaseAttackEvent || newChar.queuedBaseAttackEvent || newChar.pendingAmbush) {
        newChar.queuedAmbushes.push(ambush);
        newChar.queuedAmbush = newChar.queuedAmbushes[0];
    } else {
        newChar.pendingAmbush = ambush;
    }
    return newChar;
}

/**
 * 기지 습격 등록 (인연 습격이 이미 진행 중이면 큐에 저장)
 */
export function registerBaseAttack(character: Character, attack: BaseAttackData): Character {
    const newChar = { ...character };
    if (newChar.pendingAmbush || newChar.queuedAmbush || (newChar.queuedAmbushes && newChar.queuedAmbushes.length > 0)) {
        newChar.queuedBaseAttackEvent = attack;
    } else {
        newChar.pendingBaseAttackEvent = attack;
    }
    return newChar;
}

/**
 * 현재 진행 중인 이벤트(기지 방어, 일반 몬스터 습격, 또는 이전 인연 습격)가 완료되었을 때,
 * 대기 중이던 다음 이벤트를 순차적으로 승격시켜 차례대로 발생하도록 합니다.
 */
export function promoteNextIncident(character: Character): Character {
    if (!character) return character;
    const newChar = { ...character };

    // 1. 기지 방어가 없고 현재 진행 중인 기습이 없을 때 대기 중인 기습 승격
    if (!newChar.pendingBaseAttackEvent && !newChar.pendingAmbush) {
        if (newChar.queuedAmbushes && newChar.queuedAmbushes.length > 0) {
            newChar.pendingAmbush = newChar.queuedAmbushes.shift();
            newChar.queuedAmbush = newChar.queuedAmbushes.length > 0 ? newChar.queuedAmbushes[0] : undefined;
            if (newChar.queuedAmbushes.length === 0) {
                delete newChar.queuedAmbushes;
            }
        } else if (newChar.queuedAmbush) {
            newChar.pendingAmbush = newChar.queuedAmbush;
            delete newChar.queuedAmbush;
        }
    }

    // 2. 인연 습격이 끝났고 대기 중인 기지 방어가 있는 경우 승격
    if (!newChar.pendingAmbush && newChar.queuedBaseAttackEvent && !newChar.pendingBaseAttackEvent) {
        newChar.pendingBaseAttackEvent = newChar.queuedBaseAttackEvent;
        delete newChar.queuedBaseAttackEvent;
    }

    return newChar;
}
