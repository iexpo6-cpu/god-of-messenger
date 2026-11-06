import { Character, Companion, JobType } from '../types';

/**
 * 몬스터 수련 투기장의 일일 수련 가능 횟수 계산
 * - 시설 레벨과 시설 개수에 따라 일일 수련 가능 횟수 증가
 * - 시설 1개당 기본 2회 + 시설 레벨당 1회씩 추가 (예: Lv.1=3회, Lv.2=4회, Lv.5=7회, 2동이면 합산)
 */
export const calculateMonsterArenaDailyLimit = (character: Character): number => {
    if (!character.base?.layout) return 0;
    const instances = character.base.layout.filter(inst =>
        inst.type === 'monster_arena' &&
        !inst.underConstruction &&
        (inst.level || 0) > 0
    );
    if (instances.length === 0) return 0;

    return instances.reduce((sum, inst) => {
        const lv = inst.level || 1;
        return sum + (2 + lv);
    }, 0);
};

/**
 * 특정 몬스터 수련 투기장 시설에 직접 배치된 지도 사육사 조회
 * - 해당 시설에 직접 배치된 사육사만 지도 사육사로 인정
 * - 시설에 배치되지 않았거나 사육사가 아닌 경우 null 반환
 */
export const getAssignedArenaBreeder = (character: Character, instanceId?: string): Companion | null => {
    if (!character.base?.layout) return null;

    // 대상 투기장 인스턴스 확인
    let targetInstance = instanceId 
        ? character.base.layout.find(inst => inst.id === instanceId)
        : null;

    if (!targetInstance) {
        targetInstance = character.base.layout.find(inst => 
            inst.type === 'monster_arena' && !inst.underConstruction && (inst.level || 0) > 0
        );
    }
    if (!targetInstance) return null;

    const assignedIds = [
        ...(character.base.multiAssignments?.[targetInstance.id] || []),
        ...(character.base.assignments?.[targetInstance.id] ? [character.base.assignments[targetInstance.id]] : [])
    ].filter(Boolean) as string[];

    if (assignedIds.length === 0) return null;

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    
    // 배치된 동료 중 사육사(JobType.BREEDER) 탐색
    for (const id of assignedIds) {
        const comp = allComps.find(c => c.id === id);
        if (comp && (comp.job === JobType.BREEDER || (comp.job as string) === '사육사')) {
            return comp;
        }
    }

    return null;
};
