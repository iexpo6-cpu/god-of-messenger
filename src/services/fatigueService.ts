import { Character, Companion } from '../types';

export const MAX_FATIGUE = 100;
export const FATIGUE_PER_WAKING_HOUR = 5; // 1시간 깨어있을 때마다 5씩 축적
export const FATIGUE_REDUCTION_PER_REST_HOUR = 10; // 1시간 휴식 당 10씩 감소

/**
 * 깨어있는 활동 시간 경과에 따른 피로도 증가
 * 1시간 당 5씩 증가 (최대 100)
 */
export function addWakingFatigue(character: Character, minutesPassed: number): Character {
    if (minutesPassed <= 0) return character;
    const charCopy = { ...character };
    
    // 자정(00:00)부터 새벽 6시(06:00) 사이에는 심야 노동 패널티로 피로도 축적률 2배 적용
    let isMidnightLabor = false;
    if (character.currentTime) {
        const hour = parseInt(character.currentTime.split(':')[0], 10);
        if (hour >= 0 && hour < 6) {
            isMidnightLabor = true;
        }
    }

    const mult = isMidnightLabor ? 2 : 1;
    const addAmount = (minutesPassed / 60) * FATIGUE_PER_WAKING_HOUR * mult;
    const currentFatigue = charCopy.fatigue || 0;
    const nextFatigue = Math.min(MAX_FATIGUE, Number((currentFatigue + addAmount).toFixed(1)));
    charCopy.fatigue = nextFatigue;
    return charCopy;
}

/**
 * 휴식 시간에 따른 피로도 감소
 * 1시간 휴식 당 10씩 감소 (최소 0)
 */
export function reduceRestFatigue(character: Character, restHours: number, restDays: number = 0): { updatedCharacter: Character; reducedFatigue: number } {
    const totalHours = restDays > 0 ? restDays * 24 : restHours;
    if (totalHours <= 0) return { updatedCharacter: character, reducedFatigue: 0 };
    
    const charCopy = { ...character };
    const currentFatigue = charCopy.fatigue || 0;
    const reduceAmount = totalHours * FATIGUE_REDUCTION_PER_REST_HOUR;
    const actualReduced = Math.min(currentFatigue, reduceAmount);
    charCopy.fatigue = Math.max(0, Number((currentFatigue - reduceAmount).toFixed(1)));
    
    return { updatedCharacter: charCopy, reducedFatigue: actualReduced };
}

/**
 * 피로회복제 사용에 따른 피로도 감소
 */
export function applyFatigueRecovery(character: Character, amount: number): { updatedCharacter: Character; reducedAmount: number } {
    const charCopy = { ...character };
    const currentFatigue = charCopy.fatigue || 0;
    const actualReduced = Math.min(currentFatigue, amount);
    charCopy.fatigue = Math.max(0, Number((currentFatigue - amount).toFixed(1)));
    return { updatedCharacter: charCopy, reducedAmount: actualReduced };
}

/**
 * 피로도 100(과로) 상태 여부 확인
 */
export function isExhausted(character?: Character | Companion | null): boolean {
    if (!character) return false;
    if ('fatigue' in character && typeof character.fatigue === 'number') {
        return character.fatigue >= MAX_FATIGUE;
    }
    return false;
}

/**
 * 피로도 상태 단계 및 색상, 라벨 정보 반환
 */
export function getFatigueStatusInfo(fatigue: number = 0): { label: string; color: string; bgColor: string; borderColor: string; isDebuffed: boolean } {
    const clamped = Math.min(MAX_FATIGUE, Math.max(0, fatigue));
    if (clamped >= 100) {
        return {
            label: '과로 (능력치 50% 감소)',
            color: 'text-red-400',
            bgColor: 'bg-red-950/80',
            borderColor: 'border-red-600',
            isDebuffed: true
        };
    }
    if (clamped >= 80) {
        return {
            label: '극심한 피로',
            color: 'text-orange-400',
            bgColor: 'bg-orange-950/80',
            borderColor: 'border-orange-600',
            isDebuffed: false
        };
    }
    if (clamped >= 50) {
        return {
            label: '피로함',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-950/80',
            borderColor: 'border-yellow-600',
            isDebuffed: false
        };
    }
    if (clamped >= 20) {
        return {
            label: '다소 피로',
            color: 'text-blue-400',
            bgColor: 'bg-blue-950/80',
            borderColor: 'border-blue-600',
            isDebuffed: false
        };
    }
    return {
        label: '상쾌함',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/80',
        borderColor: 'border-emerald-600',
        isDebuffed: false
    };
}
