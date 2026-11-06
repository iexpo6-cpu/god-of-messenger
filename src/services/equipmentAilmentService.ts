import { STATUS_AILMENTS_DATA, STATUS_AILMENTS_LIST } from '../constants';
import { calculateStatusChance } from '../utils';
import { Stats, ActiveStatus } from '../types';
import { calculateDotDamage } from './dotDamageService';

export interface EquipmentAilmentProc {
    ailment: string;
    chance: number;
    sourceItemName?: string;
}

/**
 * 장비 및 옵션 목록에서 [부가 효과: ...] 및 상태이상 관련 보조 옵션을 파싱합니다.
 * 숫자가 없는 경우 (예: [부가 효과: 출혈]) 기본 발동 확률(35%)을 부여하며,
 * '확률 50% 증가', '100% 확률로', '+10%' 등의 수치가 있을 경우 해당 확률을 반영합니다.
 */
export const parseEquipmentAilments = (options: string[]): EquipmentAilmentProc[] => {
    const procs: Map<string, { chance: number; sources: string[] }> = new Map();

    options.forEach(opt => {
        if (!opt || typeof opt !== 'string') return;
        const clean = opt.trim();

        // 1. [부가 효과: 상태이상명] 또는 [부가효과: 상태이상명] 형태
        const tagMatch = clean.match(/\[부가\s*효과:\s*([^\]]+)\]/);
        if (tagMatch) {
            const inner = tagMatch[1].trim();
            // inner에서 알려진 상태이상 찾기
            const matchedAilment = STATUS_AILMENTS_LIST.find(a => inner.includes(a));
            if (matchedAilment) {
                // 확률 수치 검색 (예: 확률 50% 증가, 100% 확률로, 30% 등)
                let chance = 35; // 숫자 없는 기본 형태의 발동 확률 (35%)
                const percentMatch = clean.match(/(\d+)\s*%/);
                if (percentMatch) {
                    const parsedPercent = parseInt(percentMatch[1], 10);
                    if (!isNaN(parsedPercent) && parsedPercent > 0) {
                        chance = parsedPercent;
                    }
                }

                const current = procs.get(matchedAilment) || { chance: 0, sources: [] };
                current.chance = Math.min(100, current.chance + chance);
                current.sources.push(clean);
                procs.set(matchedAilment, current);
                return;
            }
        }

        // 2. 상태이상 유발 / 부여 형태 (예: '출혈 유발 +10%', '빙결 부여 20%')
        for (const ailment of STATUS_AILMENTS_LIST) {
            if (clean.includes(ailment) && (clean.includes('유발') || clean.includes('부여') || clean.includes('확률'))) {
                let chance = 35;
                const percentMatch = clean.match(/(\d+)\s*%/);
                if (percentMatch) {
                    const parsedPercent = parseInt(percentMatch[1], 10);
                    if (!isNaN(parsedPercent) && parsedPercent > 0) {
                        chance = parsedPercent;
                    }
                }
                const current = procs.get(ailment) || { chance: 0, sources: [] };
                current.chance = Math.min(100, current.chance + chance);
                current.sources.push(clean);
                procs.set(ailment, current);
                break;
            }
        }
    });

    return Array.from(procs.entries()).map(([ailment, data]) => ({
        ailment,
        chance: data.chance,
        sourceItemName: data.sources[0]
    }));
};

/**
 * 공격자의 착용 장비(무기, 보조무기, 방어구 등)에서 부가 효과 옵션을 수집하여 반환합니다.
 */
export const getAttackerAilmentProcs = (attacker: any): EquipmentAilmentProc[] => {
    if (!attacker) return [];
    const allOptions: string[] = [];

    // 착용 장비 옵션 수집
    if (attacker.equipment && typeof attacker.equipment === 'object') {
        Object.values(attacker.equipment).forEach((item: any) => {
            if (!item) return;
            if (Array.isArray(item.secondaryOptions)) allOptions.push(...item.secondaryOptions);
            if (Array.isArray(item.options)) allOptions.push(...item.options);
            if (Array.isArray(item.effects)) allOptions.push(...item.effects);
        });
    }

    // 몬스터/보스 자체의 보조 옵션
    if (Array.isArray(attacker.secondaryOptions)) allOptions.push(...attacker.secondaryOptions);
    if (Array.isArray(attacker.options)) allOptions.push(...attacker.options);

    return parseEquipmentAilments(allOptions);
};

/**
 * 전투 타격 시(일반 공격 및 스킬 타격) 착용 무기/장비의 부가 효과를 판정하여 대상에게 상태이상을 부여합니다.
 */
export const processEquipmentOnHit = (
    attacker: any,
    target: any,
    damageResult?: any
): string => {
    if (!attacker || !target) return '';
    // 빗맞힘(Miss)이거나 피해가 0 이하인 경우 타격 미발생 처리
    if (damageResult) {
        if (damageResult.isMiss) return '';
        if (typeof damageResult.damage === 'number' && damageResult.damage <= 0) return '';
    }
    // 대상이 이미 쓰러진 경우 적용 안 함
    if (target.hp !== undefined && target.hp <= 0) return '';
    if (target.isDead) return '';

    const procs = getAttackerAilmentProcs(attacker);
    if (procs.length === 0) return '';

    const logs: string[] = [];
    const targetStats = (target.stats || { ctrl: 10 }) as Stats;

    procs.forEach(({ ailment, chance }) => {
        // 대상의 제어력(CTRL) 저항을 반영한 최종 발동 확률 계산
        const finalChance = calculateStatusChance(chance, targetStats);
        const roll = Math.random() * 100;

        if (roll < finalChance) {
            if (!target.statusEffects) {
                target.statusEffects = [];
            }

            // 상태이상 지속 턴수
            let duration = 3;
            if (['빙결', '속박', '소멸', '혼란', '감전'].includes(ailment)) {
                duration = 2;
            }

            // 지속 피해(DoT) 수치 계산 (대상의 통제력 저항 반영)
            const targetMaxHp = target.stats?.maxHp || target.maxHp || 100;
            const dotVal = calculateDotDamage(ailment, targetMaxHp, targetStats, attacker.stats);

            const ailmentData = STATUS_AILMENTS_DATA[ailment];
            const effectDesc = ailmentData?.desc || '상태이상';

            const existingIdx = target.statusEffects.findIndex((s: ActiveStatus) => s.name === ailment);
            if (existingIdx >= 0) {
                target.statusEffects[existingIdx].duration = Math.max(target.statusEffects[existingIdx].duration, duration);
                if (dotVal > (target.statusEffects[existingIdx].val || 0)) {
                    target.statusEffects[existingIdx].val = dotVal;
                }
            } else {
                target.statusEffects.push({
                    name: ailment,
                    duration,
                    effect: effectDesc,
                    val: dotVal
                });
            }

            logs.push(`\n[시스템] ${attacker.name}의 장비 부가 효과 발동! ${target.name}에게 [${ailment}] 상태이상 부여 (${duration}턴)`);
        }
    });

    return logs.join('');
};
