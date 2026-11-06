/**
 * 전투 유닛 상태 관리 및 파생 스탯 단일화 캐시 서비스
 * 
 * 엔티티 ID 기반으로 캐시를 관리하여 React 불변 객체 재생성 시에도
 * 장비, 버프, 기본 스탯이 변경되지 않는 한 O(1)로 즉시 반환합니다.
 * 대규모 전투(플레이어 + 아군 동료 최대 9명 vs 다수 적군)에서
 * 매 턴 및 매 데미지 틱마다 발생하던 고비용 정규식/루프 연산을 완전히 차단합니다.
 */

import { Character, Companion, Enemy, Stats } from '../types';

export interface CachedFinalStatsEntry {
    sigNormal?: string;
    resNormal?: any;
    sigNoBuff?: string;
    resNoBuff?: any;
}

// 1. 엔티티 고유 ID 기반 캐시 (객체 참조가 바뀌어도 ID와 상태 서명이 같으면 100% 적중)
const entityIdStatCache = new Map<string, CachedFinalStatsEntry>();

// 2. 최대 캐시 항목 수 제한 (메모리 누수 방지용 LRU 유사 제어)
const MAX_CACHE_ENTRIES = 120;

/**
 * 엔티티의 고유 식별자 키를 추출합니다.
 */
export const getEntityCacheKey = (entity: any): string => {
    if (!entity) return 'unknown';
    if (entity.id) return `id_${entity.id}`;
    if (entity.unitType === 'player' || entity.isPlayer) return 'player';
    if (entity.name) return `name_${entity.name}`;
    return 'anonymous';
};

/**
 * 엔티티의 파생 스탯에 영향을 주는 핵심 속성들로만 초경량 서명을 생성합니다.
 * 현재 체력(HP)과 마나(MP)는 서명에서 제외하여 매 틱/피격 시 불필요한 재계산을 차단합니다.
 */
export const buildCombatStatsSignature = (entity: any, excludeBuffs: boolean): string => {
    if (!entity) return '';
    const s = entity.stats || {};
    
    // 기본 스탯 및 직업/특성 서명
    let sig = `${entity.level || 1}|${entity.job || ''}|${entity.classTier || ''}|${entity.equippedTitleId || ''}|${entity.combatStyle || ''}|${entity.fatigue || 0}|${entity.pregnancy?.isPregnant ? 1 : 0}|${s.str || 0},${s.int || 0},${s.wis || 0},${s.def || 0},${s.agi || 0},${s.ctrl || 0},${s.maxHp || 0},${s.maxMp || 0}`;

    // 착용 장비 서명 (핵심 슬롯만 경량 직렬화)
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

    // 전투 스타일 서명
    if (entity.combatStyleProgress) {
        const csp = entity.combatStyleProgress;
        const keys = Object.keys(csp);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (csp[k]?.unlocked) sig += `|cs_${k}`;
        }
    }

    // 상태이상 및 버프/디버프 서명
    if (!excludeBuffs && entity.statusEffects && entity.statusEffects.length > 0) {
        const effs = entity.statusEffects;
        for (let i = 0; i < effs.length; i++) {
            const e = effs[i];
            if (e) {
                sig += `|ef_${e.name}:${e.effect || ''}:${e.val || 0}:${e.duration || 0}`;
            }
        }
    }

    return sig;
};

/**
 * 캐시된 결과 객체에 현재 엔티티의 실시간 HP/MP를 얕은 복사로 즉각 주입합니다.
 */
const injectLiveHpMp = (cached: any, currentEntity: any): any => {
    if (!cached || !cached.finalStats) return cached;
    const curHp = currentEntity?.stats?.hp ?? cached.finalStats.hp;
    const curMp = currentEntity?.stats?.mp ?? cached.finalStats.mp;
    return {
        ...cached,
        finalStats: {
            ...cached.finalStats,
            hp: curHp,
            mp: curMp
        },
        baseTotal: cached.baseTotal ? {
            ...cached.baseTotal,
            hp: curHp,
            mp: curMp
        } : cached.baseTotal
    };
};

/**
 * 엔티티 ID 기반 초고속 파생 스탯 캐시 조회 및 실행
 */
export const getCachedCombatFinalStats = <T>(
    entity: Character | Companion | Enemy | any,
    options: { excludeTemporaryBuffs?: boolean } | undefined,
    computeFn: () => T
): T => {
    if (!entity || typeof entity !== 'object') {
        return computeFn();
    }

    const key = getEntityCacheKey(entity);
    const excludeBuffs = Boolean(options?.excludeTemporaryBuffs);
    const sig = buildCombatStatsSignature(entity, excludeBuffs);

    let entry = entityIdStatCache.get(key);

    if (entry) {
        if (excludeBuffs && entry.sigNoBuff === sig && entry.resNoBuff) {
            return injectLiveHpMp(entry.resNoBuff, entity);
        }
        if (!excludeBuffs && entry.sigNormal === sig && entry.resNormal) {
            return injectLiveHpMp(entry.resNormal, entity);
        }
    } else {
        if (entityIdStatCache.size >= MAX_CACHE_ENTRIES) {
            // 오래된 캐시 정리
            const firstKey = entityIdStatCache.keys().next().value;
            if (firstKey) entityIdStatCache.delete(firstKey);
        }
        entry = {};
        entityIdStatCache.set(key, entry);
    }

    // 캐시 미스 시 실제 계산 수행
    const computed = computeFn();

    if (excludeBuffs) {
        entry.sigNoBuff = sig;
        entry.resNoBuff = computed;
    } else {
        entry.sigNormal = sig;
        entry.resNormal = computed;
    }

    return injectLiveHpMp(computed, entity);
};

/**
 * 특정 엔티티의 스탯 캐시를 명시적으로 무효화합니다 (장비 교체, 클래스 승급 등).
 */
export const invalidateCombatEntityCache = (entityId: string): void => {
    entityIdStatCache.delete(`id_${entityId}`);
    entityIdStatCache.delete(`name_${entityId}`);
    if (entityId === 'player') entityIdStatCache.delete('player');
};

/**
 * 전투 종료 또는 새로운 전투 시작 시 캐시 전체를 안전하게 정리합니다.
 */
export const clearCombatStatCache = (): void => {
    entityIdStatCache.clear();
};
