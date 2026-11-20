import { ActiveStatus, Character, Enemy } from '../types';
import { SHINRYOKU_AFFINITY } from '../constants';

export const SHINRYOKU_BREAK_STATUS_NAME = '신력 브레이크';
export const MAX_SHINRYOKU_SHIELD_UPGRADE_LEVEL = 5;

export const getAllyMaxBreakGauge = (character?: Pick<Character, 'base'> | null): number => {
    const bonus = Math.max(0, Math.min(MAX_SHINRYOKU_SHIELD_UPGRADE_LEVEL, character?.base?.shinryokuShieldLevel || 0));
    return 4 + bonus;
};

export const getEnemyMaxBreakGauge = (enemy?: Partial<Enemy> | null): number => {
    if (!enemy) return 3;
    const name = enemy.name || '';
    const isEliteOrBoss =
        Boolean((enemy as any).isBoss) ||
        /\[보스\]|\[BOSS\]|\[차원 수호자\]|\[심연 .* 보스\]|\[초월 아레나\]|\[디펜딩 챔피언|\[만신전|\[성전 사자\]|\[국가 지도자\]|\[태초|\[절대신/i.test(name);
    return isEliteOrBoss ? 5 : 3;
};

export const isShinryokuWeaknessHit = (attackerType?: string, defenderType?: string): boolean => {
    if (!attackerType || !defenderType) return false;
    return Boolean(SHINRYOKU_AFFINITY[attackerType]?.strong?.includes(defenderType));
};

export const isUnitShinryokuBroken = (statusEffects?: ActiveStatus[]): boolean => {
    return Boolean(statusEffects?.some(s => s.name === SHINRYOKU_BREAK_STATUS_NAME));
};

export const getShinryokuShieldUpgradeCost = (currentLevel: number) => {
    const nextLv = Math.max(1, currentLevel + 1);
    return {
        nextLv,
        gold: 150000 * nextLv * nextLv,
        manaCrystal: 20 * nextLv,
        iron: 60 * nextLv,
        stone: 60 * nextLv
    };
};

export const applyShinryokuBreakHit = (
    target: { name?: string; breakGauge?: number; maxBreakGauge?: number; statusEffects?: ActiveStatus[] },
    shieldDamage: number,
    defaultMax: number
): { triggeredBreak: boolean; log: string } => {
    if (shieldDamage <= 0) return { triggeredBreak: false, log: '' };
    const maxGauge = Math.max(1, target.maxBreakGauge ?? defaultMax);
    target.maxBreakGauge = maxGauge;

    if (!target.statusEffects) target.statusEffects = [];
    if (isUnitShinryokuBroken(target.statusEffects)) {
        return { triggeredBreak: false, log: '' };
    }

    const currentGauge = target.breakGauge ?? maxGauge;
    const nextGauge = Math.max(0, currentGauge - shieldDamage);
    target.breakGauge = nextGauge;

    if (nextGauge <= 0) {
        target.statusEffects.push({
            name: SHINRYOKU_BREAK_STATUS_NAME,
            effect: '신력 실드 붕괴 (1턴 행동불가 · 받는 피해 1.5배)',
            duration: 1,
            val: 50
        });
        return {
            triggeredBreak: true,
            log: `\n💥 [신력 브레이크!] ${target.name || '대상'}의 신력 실드가 붕괴되었습니다! (1턴 행동불가 · 받는 피해 1.5배)`
        };
    }

    return {
        triggeredBreak: false,
        log: ` (🛡️실드 -${shieldDamage} ➔ ${nextGauge}/${maxGauge})`
    };
};

export const recoverAllyBreakGauge = (
    ally: { name?: string; breakGauge?: number; maxBreakGauge?: number; statusEffects?: ActiveStatus[] },
    amount: number,
    defaultMax: number
): number => {
    if (amount <= 0) return 0;
    const maxGauge = Math.max(1, ally.maxBreakGauge ?? defaultMax);
    ally.maxBreakGauge = maxGauge;
    if (isUnitShinryokuBroken(ally.statusEffects)) return 0;
    const prev = ally.breakGauge ?? maxGauge;
    const next = Math.min(maxGauge, prev + amount);
    ally.breakGauge = next;
    return next - prev;
};
