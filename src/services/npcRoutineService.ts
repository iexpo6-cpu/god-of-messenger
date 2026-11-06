import { Character, Companion } from '../types';

export interface RoutineInfo {
    statusText: string;
    locationText: string;
    activityText: string;
    canJoin: boolean;
    colorClass: string;
}

/**
 * 동료의 현재 배치된 작업장명을 구합니다.
 */
export function getCompanionAssignmentName(character: Character, compId: string): string | null {
    if (!character) return null;

    // 1. 기지 일반/특수 파견 미션 체크 (dispatched)
    if (character.base?.dispatched) {
        const baseDispatched = character.base.dispatched.find(m => 
            m.companionId === compId || 
            ((m as any).participants && (m as any).participants.includes(compId))
        );
        if (baseDispatched) {
            const dest = baseDispatched.destination?.city || baseDispatched.destination?.nation || '외곽';
            const type = baseDispatched.missionType || '';
            if (type === 'PersonalLeave') return '개인 휴가';
            if (type === 'RecruitTravel') return '동료 영입 여정';
            if (type === 'WarInvasion') return `전쟁 침공 파견 (${dest})`;
            if (type === 'TempleProtection') return `신전 수호 파견 (${dest})`;
            if (type === 'Patrol') return `군대 순찰 (${dest})`;
            if (type === 'Suppression') return `군대 토벌 (${dest})`;
            if (type === 'Infiltration') return `군대 잠입 (${dest})`;
            if (type === 'Escort') return `군대 호위 (${dest})`;
            if (type === 'ScoutDispatch') return `스카우트 파견 (${dest})`;
            if (type === 'Expedition') return `원정대 파견 (${dest})`;
            return `파견 근무 (${dest})`;
        }
    }

    // 2. 용병단 단체 의뢰
    const groupDispatched = character.mercenaryData?.groupMissions?.find(m => m.memberIds?.includes(compId));
    if (groupDispatched) {
        return `용병단 의뢰 (${groupDispatched.title || '단체 의뢰'})`;
    }

    // 3. 기지 시설 단일 배정 (assignments)
    const assignmentEntry = Object.entries(character.base?.assignments || {}).find(([_, v]) => v === compId);
    if (assignmentEntry) {
        const key = assignmentEntry[0];
        const targetInst = character.base?.layout?.find(inst => inst.id === key);
        const facType = targetInst?.type || key;

        if (key.startsWith('temple_protection_')) {
            const nation = key.replace('temple_protection_', '');
            return `${nation} 수호 기사`;
        }
        if (facType === 'farm') return '농장';
        if (facType === 'mine') return '광산';
        if (facType === 'training_exp') return '경험 훈련소';
        if (facType === 'training_stat') return '스탯 훈련소';
        if (facType === 'training_mastery') return '무기숙련 훈련장';
        if (facType === 'training_style') return '전투스타일 훈련소';
        if (facType === 'tactical_training') return '전술 훈련소';
        if (facType === 'combat_training') return '전투 훈련소';
        if (facType === 'sparring_arena') return '모의 대련장';
        if (facType === 'training') return '훈련소';
        if (facType === 'blacksmith' || facType === 'workshop') return '대장간';
        if (facType === 'alchemy') return '연금술실';
        if (facType === 'lab') return '연구소';
        if (facType === 'monster_farm') return '몬스터 사육소';
        if (facType === 'child_academy') return '유년 서당';
        if (facType === 'monster_arena') return '몬스터 수련 투기장';
        if (facType === 'cooking') return '요리 시설';
        if (facType === 'dispatch') return '파견소';
        if (facType === 'housing') return '숙소';
        if (facType === 'storage') return '창고';
        if (facType === 'defense') return '기지 방어소';
        if (facType === 'back_alley') return '뒷골목';
        if (facType === 'club') return '클럽';
        if (facType === 'trade_exchange') return '물자 교류소';
        return '기지 시설';
    }

    // 4. 기지 시설 다중 배정 (multiAssignments)
    if (character.base?.multiAssignments) {
        for (const [facilityId, idList] of Object.entries(character.base.multiAssignments)) {
            if (Array.isArray(idList) && idList.includes(compId)) {
                const targetInst = character.base?.layout?.find(inst => inst.id === facilityId);
                const facType = targetInst?.type || facilityId;

                if (facType.startsWith('farm')) return '농장';
                if (facType.startsWith('mine')) return '광산';
                if (facType.startsWith('blacksmith') || facType.startsWith('workshop')) return '제작소/대장간';
                if (facType.startsWith('alchemy')) return '연금술실';
                if (facType.startsWith('cooking')) return '요리 시설';
                if (facType.startsWith('monster_farm')) return '사육소';
                if (facType.startsWith('lab')) return '연구소';
                if (facType.startsWith('training')) return '훈련소';
                if (facType.startsWith('housing') || facType === 'housing') return '숙소';
                return '기지 시설';
            }
        }
    }

    // 5. 전투 훈련소 훈련생
    if (character.base?.combatTraining) {
        for (const [instId, cTraining] of Object.entries(character.base.combatTraining)) {
            if (cTraining.trainees?.some(t => t.companionId === compId)) {
                return '전투 훈련소 수련장';
            }
        }
    }

    return null;
}

/**
 * 시간대에 따른 동료의 일과(루틴) 상태를 조회합니다.
 * - 아침(08:00 ~ 11:59): 기지 식당에서 식사 및 담소
 * - 낮(12:00 ~ 21:59): 배치된 작업장(농장, 훈련소, 대장간 등)에서 노동 및 수련
 * - 밤(22:00 ~ 다음 날 07:59): 숙소에서 취침 중 (합류 불가)
 */
export function getCompanionRoutine(character: Character, compId: string): RoutineInfo {
    const timeStr = character.currentTime || '08:00';
    const [hour] = timeStr.split(':').map(Number);

    const assignment = getCompanionAssignmentName(character, compId);

    // 1. 밤 시간대 (22:00 ~ 07:59) - 숙소에서 취침 중
    if (hour >= 22 || hour < 8) {
        return {
            statusText: '취침 중',
            locationText: '숙소',
            activityText: '숙소에서 취침 중인 상태',
            canJoin: false,
            colorClass: 'text-slate-400 bg-slate-950/40 border-slate-800'
        };
    }

    // 2. 아침 시간대 (08:00 ~ 11:59) - 기지 식당에서 식사 및 담소
    if (hour >= 8 && hour < 12) {
        return {
            statusText: '식사 중',
            locationText: '기지 식당',
            activityText: '기지 식당에서 식사 및 담소',
            canJoin: true,
            colorClass: 'text-amber-400 bg-amber-950/20 border-amber-800/50'
        };
    }

    // 3. 낮 시간대 (12:00 ~ 21:59) - 배치된 작업장에서 노동 및 수련
    const workplace = assignment || '기지 수련장';
    const isLabor = assignment ? '노동 및 수련' : '자유 훈련 및 휴식';
    return {
        statusText: assignment ? '근무 중' : '자유 활동',
        locationText: workplace,
        activityText: `${workplace}에서 ${isLabor}`,
        canJoin: true,
        colorClass: 'text-emerald-400 bg-emerald-950/20 border-emerald-800/50'
    };
}
