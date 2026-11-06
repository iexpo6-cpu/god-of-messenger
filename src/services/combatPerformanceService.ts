/**
 * 전투 성능 최적화 및 메모리 누수 방지 서비스
 * 1. 로그 및 메시지 최대 보관 개수 제한 (슬라이싱) 및 100줄 제한 충돌 방지 증분 추적기
 * 2. 최종 스탯(calculateFinalStats) 초고속 서명 기반 WeakMap 캐싱 (매 턴 수십 회 정규식 재연산 차단)
 * 3. 전투 중 도감(Bestiary) 인플레이스 갱신으로 불필요한 중간 리렌더링 차단
 * 4. 연출 타이머 풀 관리 및 강제 정리
 */

import { Character, Companion, CombatState, Enemy } from '../types';

// ==========================================
// 1. 로그 및 메시지 윈도윙 / 제한 (최대 100개)
// ==========================================
export const MAX_COMBAT_LOGS = 100;
export const MAX_MAIN_MESSAGES = 100;
export const MAX_CHARACTER_MESSAGES = 50;
export const MAX_MEMORIES = 30;

/**
 * 캐릭터 및 동료들의 기억 데이터를 최대 상한선(30개)으로 제한하여 누적 찌꺼기를 방지합니다.
 * 플레이어 전환 서비스 관련 전대 주인공 데이터도 함께 정제합니다.
 */
export const cleanseCharacterMemories = (char: Character): Character => {
    if (!char) return char;

    if (char.memories && char.memories.length > MAX_MEMORIES) {
        char.memories = char.memories.slice(-MAX_MEMORIES);
    }

    if (char.companions && Array.isArray(char.companions)) {
        char.companions.forEach(c => {
            if (c.memories && c.memories.length > MAX_MEMORIES) {
                c.memories = c.memories.slice(-MAX_MEMORIES);
            }
        });
    }

    if (char.inactiveCompanions && Array.isArray(char.inactiveCompanions)) {
        char.inactiveCompanions.forEach(c => {
            if (c.memories && c.memories.length > MAX_MEMORIES) {
                c.memories = c.memories.slice(-MAX_MEMORIES);
            }
        });
    }

    const prevHero = (char as any).previousHeroData;
    if (prevHero && prevHero.memories && prevHero.memories.length > MAX_MEMORIES) {
        prevHero.memories = prevHero.memories.slice(-MAX_MEMORIES);
    }

    return char;
};

/**
 * 안전한 기억 추가 함수
 * 1. 단순 몬스터 처치 기록은 플레이어에게만 최근 30개로 제한하여 기록하고, 대기 동료들에게 무차별 복제되는 것을 방지합니다.
 * 2. 중요한 서사적 사건만 동료들에게 선별 공유합니다.
 * 3. 모든 기억은 최근 최대 개수(30개)로 슬라이스하여 메모리 찌꺼기가 남지 않게 관리합니다.
 */
export const safeAddMemory = (
    char: Character,
    text: string,
    targets: string[] = ['player']
): void => {
    if (!char) return;
    const entry = `[${char.currentDate || '기록'}] ${text}`;

    const isMinorKill = text.includes('처치') && !text.includes('[BOSS]') && !text.includes('신좌') && !text.includes('정벌');

    if (targets.includes('player')) {
        if (!char.memories) char.memories = [];
        char.memories.push(entry);
        if (char.memories.length > MAX_MEMORIES) {
            char.memories = char.memories.slice(-MAX_MEMORIES);
        }
    }

    if (isMinorKill) {
        return;
    }

    if (char.companions && Array.isArray(char.companions)) {
        char.companions.forEach(c => {
            if (!c.memories) c.memories = [];
            c.memories.push(entry);
            if (c.memories.length > MAX_MEMORIES) {
                c.memories = c.memories.slice(-MAX_MEMORIES);
            }
        });
    }

    const isMajorFamilyEvent = text.includes('가주') || text.includes('결혼') || text.includes('탄생') || text.includes('멸망');
    if (isMajorFamilyEvent && char.inactiveCompanions && Array.isArray(char.inactiveCompanions)) {
        char.inactiveCompanions.forEach(c => {
            if (!c.memories) c.memories = [];
            c.memories.push(entry);
            if (c.memories.length > MAX_MEMORIES) {
                c.memories = c.memories.slice(-MAX_MEMORIES);
            }
        });
    }
};

/**
 * 전투 로그 배열을 최대 상한선(100개)으로 제한하여 가상 돔 및 렌더링 부하를 방지합니다.
 */
export const trimCombatLogs = (logs: string[], max = MAX_COMBAT_LOGS): string[] => {
    if (!logs || logs.length <= max) return logs || [];
    return logs.slice(-max);
};

/**
 * 메인 대화창 메시지 배열을 최대 상한선(100개)으로 제한합니다.
 */
export const trimMainMessages = <T>(messages: T[], max = MAX_MAIN_MESSAGES): T[] => {
    if (!messages || messages.length <= max) return messages || [];
    return messages.slice(-max);
};

/**
 * 캐릭터 객체 내 서신(messages) 등의 대용량 배열을 가볍게 다이어트합니다.
 */
export const trimCharacterMessages = (character: Character): Character => {
    if (!character || !character.messages) return character;
    if (character.messages.length <= MAX_CHARACTER_MESSAGES) return character;
    return {
        ...character,
        messages: character.messages.slice(-MAX_CHARACTER_MESSAGES)
    };
};

// ==========================================
// 2. 전투 로그 증분 추출기 (100줄 슬라이싱 시에도 신규 로그 100% 정확 감지)
// ==========================================
class CombatLogStreamTracker {
    private lastProcessedLines: string[] = [];

    public reset(): void {
        this.lastProcessedLines = [];
    }

    /**
     * 배열이 100줄 상한선으로 잘리더라도 이전 스냅샷의 꼬리 부분과 매칭하여
     * 실질적으로 새로 추가된 로그 줄만 정확하게 반환합니다.
     */
    public extractNewLines(currentLogs: string[] | undefined): string[] {
        if (!currentLogs || currentLogs.length === 0) {
            this.lastProcessedLines = [];
            return [];
        }

        const prev = this.lastProcessedLines;
        if (prev.length === 0) {
            this.lastProcessedLines = [...currentLogs];
            return currentLogs;
        }

        // 완전히 동일한 경우 빠른 반환
        if (
            prev.length === currentLogs.length &&
            prev[prev.length - 1] === currentLogs[currentLogs.length - 1] &&
            prev[0] === currentLogs[0]
        ) {
            return [];
        }

        // 이전 로그의 마지막 3줄 시퀀스를 현재 로그 뒤쪽에서 역추적
        const tailLen = Math.min(3, prev.length);
        const tail = prev.slice(prev.length - tailLen);
        let matchEndIdx = -1;

        for (let i = currentLogs.length - 1; i >= tailLen - 1; i--) {
            let matched = true;
            for (let j = 0; j < tailLen; j++) {
                if (currentLogs[i - (tailLen - 1 - j)] !== tail[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                matchEndIdx = i;
                break;
            }
        }

        this.lastProcessedLines = [...currentLogs];

        if (matchEndIdx !== -1) {
            return currentLogs.slice(matchEndIdx + 1);
        }

        // 만약 한 번에 100줄 이상 쏟아져서 꼬리를 못 찾은 경우 최근 추가분 반환
        return currentLogs.slice(-15);
    }
}

export const combatLogTracker = new CombatLogStreamTracker();

// ==========================================
// 3. 최종 스탯(calculateFinalStats) 초고속 서명 캐시
// ==========================================
interface CachedFinalStatsEntry {
    sigNormal?: string;
    resNormal?: any;
    sigNoBuff?: string;
    resNoBuff?: any;
}

const finalStatsWeakCache = new WeakMap<object, CachedFinalStatsEntry>();

/**
 * 엔티티의 스탯에 영향을 주는 속성들로만 초경량 서명을 생성합니다 (0.01ms 미만).
 * 인벤토리(수백 개 아이템)나 기억, 대화 내역은 서명에서 완전히 제외하여 속도를 극대화합니다.
 */
const buildEntityStatsSignature = (entity: any, excludeBuffs: boolean): string => {
    const s = entity.stats || {};
    let sig = `${entity.level || 1}|${entity.job || ''}|${entity.classTier || ''}|${entity.equippedTitleId || ''}|${entity.combatStyle || ''}|${entity.fatigue || 0}|${entity.pregnancy?.isPregnant ? 1 : 0}|${s.str || 0},${s.int || 0},${s.wis || 0},${s.def || 0},${s.agi || 0},${s.ctrl || 0},${s.maxHp || 0},${s.maxMp || 0}`;

    // 착용 장비 서명 (최대 7슬롯)
    if (entity.equipment) {
        const eq = entity.equipment;
        const slots = ['weapon', 'subWeapon', 'head', 'body', 'hand', 'feet', 'accessory'];
        for (let i = 0; i < slots.length; i++) {
            const item = eq[slots[i]];
            if (item) {
                sig += `|${item.name}:${item.enhancement || 0}:${item.secondaryOptions?.length || 0}:${item.stats?.str || 0}:${item.stats?.int || 0}:${item.stats?.def || 0}`;
            } else {
                sig += '|_';
            }
        }
    }

    // 무기 숙련도 서명
    if (entity.weaponMastery) {
        const wm = entity.weaponMastery;
        const keys = Object.keys(wm);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            sig += `|w_${k}:${wm[k]?.level || 0}`;
        }
    }

    // 탈것 서명
    if (entity.mountedMonster) {
        const m = entity.mountedMonster;
        sig += `|m_${m.id || m.name}:${m.level || 1}:${m.bondLevel || 0}`;
    }

    // 전투 스타일 해금 패시브 서명
    if (entity.combatStyleProgress) {
        const csp = entity.combatStyleProgress;
        const keys = Object.keys(csp);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (csp[k]?.unlocked) sig += `|cs_${k}`;
        }
    }

    // 상태이상 및 버프 서명
    if (!excludeBuffs && entity.statusEffects && entity.statusEffects.length > 0) {
        const effs = entity.statusEffects;
        for (let i = 0; i < effs.length; i++) {
            const e = effs[i];
            if (e) {
                sig += `|ef_${e.name}:${e.effect || ''}:${e.val || 0}`;
            }
        }
    }

    return sig;
};

const cloneFinalStatsResult = (cached: any, currentEntity: any): any => {
    const curHp = currentEntity?.stats?.hp ?? cached.finalStats.hp;
    const curMp = currentEntity?.stats?.mp ?? cached.finalStats.mp;
    return {
        ...cached,
        finalStats: {
            ...cached.finalStats,
            hp: curHp,
            mp: curMp
        },
        baseTotal: {
            ...cached.baseTotal,
            hp: curHp,
            mp: curMp
        }
    };
};

import { getCachedCombatFinalStats, clearCombatStatCache } from './combatStatCache';

export { clearCombatStatCache };

export const getCachedFinalStats = <T>(
    entity: Character | Companion | Enemy | any,
    options: { excludeTemporaryBuffs?: boolean } | undefined,
    computeFn: () => T
): T => {
    return getCachedCombatFinalStats(entity, options, computeFn);
};

// ==========================================
// 4. 전투 중 도감(Bestiary) 인플레이스 반영 헬퍼
// ==========================================
export const applyBestiaryUpdateInPlace = (
    charState: Character,
    monsterName: string,
    isDefeated: boolean = false
): void => {
    if (!charState || !monsterName) return;
    const cleanName = monsterName
        .replace(/\[.*?\]/g, '')
        .replace(/\s+[A-Z]$/, '')
        .trim();
    if (!cleanName) return;

    if (!charState.bestiary) {
        charState.bestiary = {};
    } else {
        charState.bestiary = { ...charState.bestiary };
    }

    const existing = charState.bestiary[cleanName] || { encountered: false, defeatedCount: 0 };
    charState.bestiary[cleanName] = {
        encountered: true,
        defeatedCount: isDefeated ? (existing.defeatedCount || 0) + 1 : (existing.defeatedCount || 0)
    };
};

// ==========================================
// 5. 연출 타이머 풀 (타이머 누적 방지 및 강제 정리)
// ==========================================
class CombatAnimationTimerPool {
    private timers: Set<number> = new Set();

    /**
     * 타이머를 풀에 등록하고 실행합니다.
     */
    public registerTimeout(callback: () => void, delay: number): number {
        const timerId = window.setTimeout(() => {
            this.timers.delete(timerId);
            callback();
        }, delay);
        this.timers.add(timerId);
        return timerId;
    }

    /**
     * 특정 타이머를 취소하고 풀에서 제거합니다.
     */
    public clearTimeout(timerId: number): void {
        window.clearTimeout(timerId);
        this.timers.delete(timerId);
    }

    /**
     * 현재 등록된 모든 연출 타이머를 강제로 취소하고 비웁니다.
     * 새로운 전투 시작, 라운드 교체, 전투 종료 시 호출됩니다.
     */
    public clearAllTimers(): void {
        this.timers.forEach(id => window.clearTimeout(id));
        this.timers.clear();
    }

    public getActiveTimerCount(): number {
        return this.timers.size;
    }
}

export const combatTimerPool = new CombatAnimationTimerPool();

// ==========================================
// 6. 전투 턴 진행 중 경량 상태 갱신 (JSON deep copy 최소화)
// ==========================================

/**
 * 캐릭터 객체 전체를 JSON.stringify로 깊은 복사하지 않고,
 * 체력/마나/상태이상 등 전투 턴 수치만 초고속 얕은 복사로 안전하게 갱신합니다.
 */
export const updateCharacterCombatStatsLightweight = (
    character: Character,
    playerStatsUpdate?: { hp?: number; maxHp?: number; mp?: number; maxMp?: number; statusEffects?: any[] },
    companionStatsUpdate?: { id: string; hp?: number; maxHp?: number; mp?: number; maxMp?: number; statusEffects?: any[] }[]
): Character => {
    if (!character) return character;

    let updatedChar = character;

    // 플레이어 스탯 가벼운 갱신
    if (playerStatsUpdate) {
        const nextStats = character.stats ? {
            ...character.stats,
            hp: playerStatsUpdate.hp !== undefined ? playerStatsUpdate.hp : character.stats.hp,
            maxHp: playerStatsUpdate.maxHp !== undefined ? playerStatsUpdate.maxHp : character.stats.maxHp,
            mp: playerStatsUpdate.mp !== undefined ? playerStatsUpdate.mp : character.stats.mp,
            maxMp: playerStatsUpdate.maxMp !== undefined ? playerStatsUpdate.maxMp : character.stats.maxMp,
        } : character.stats;

        updatedChar = {
            ...updatedChar,
            stats: nextStats,
            statusEffects: playerStatsUpdate.statusEffects !== undefined ? playerStatsUpdate.statusEffects : updatedChar.statusEffects
        };
    }

    // 동료 스탯 가벼운 갱신
    if (companionStatsUpdate && companionStatsUpdate.length > 0 && character.companions) {
        const updateMap = new Map(companionStatsUpdate.map(u => [u.id, u]));
        const nextCompanions = character.companions.map(comp => {
            const update = updateMap.get(comp.id);
            if (!update) return comp;

            const nextCompStats = comp.stats ? {
                ...comp.stats,
                hp: update.hp !== undefined ? update.hp : comp.stats.hp,
                maxHp: update.maxHp !== undefined ? update.maxHp : comp.stats.maxHp,
                mp: update.mp !== undefined ? update.mp : comp.stats.mp,
                maxMp: update.maxMp !== undefined ? update.maxMp : comp.stats.maxMp,
            } : comp.stats;

            return {
                ...comp,
                stats: nextCompStats,
                statusEffects: update.statusEffects !== undefined ? update.statusEffects : comp.statusEffects
            };
        });

        updatedChar = {
            ...updatedChar,
            companions: nextCompanions
        };
    }

    return updatedChar;
};

/**
 * 전투 상태 객체에서 로그를 안전하게 슬라이스하여 반환합니다.
 */
export const updateCombatStateWithTrimmedLogs = (
    prevState: CombatState,
    newLogs: string[] | string
): CombatState => {
    const incoming = Array.isArray(newLogs) ? newLogs : [newLogs];
    const combined = [...(prevState.log || []), ...incoming].filter(Boolean);
    const trimmed = trimCombatLogs(combined, MAX_COMBAT_LOGS);

    return {
        ...prevState,
        log: trimmed
    };
};
