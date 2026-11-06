import { Base, Companion, Character } from '../types';
import { calculateCombatPower, calculateBaseDefenseBase } from '../utils';

export interface DefenseSquad {
    id: string;
    name: string;
    unlocked: boolean;
    leaderId?: string | null;
    memberIds: string[];
    tacticalRole: 'FRONT_LINE' | 'VANGUARD' | 'REAR_GUARD' | 'RESERVE';
    customRoleName?: string;
}

export const TACTICAL_ROLE_CONFIG: Record<DefenseSquad['tacticalRole'], { name: string; desc: string; bonusText: string; cpMultiplier: number }> = {
    FRONT_LINE: {
        name: '전방 수호 분대',
        desc: '기지 정문과 장벽을 직접 보호하며 방어력 기여 효율이 높습니다.',
        bonusText: '방어력 기여도 +20% 보너스',
        cpMultiplier: 1.2,
    },
    VANGUARD: {
        name: '기습 대응 분대',
        desc: '침입하는 적을 신속하게 포위하여 기습 공격을 차단합니다.',
        bonusText: '기습 방어 및 크리티컬 차단 +15%',
        cpMultiplier: 1.15,
    },
    REAR_GUARD: {
        name: '마법 지원 분대',
        desc: '후방에서 보호막 및 마력 탄막으로 기지 시설 피해를 최소화합니다.',
        bonusText: '시설 파손율 25% 감소',
        cpMultiplier: 1.1,
    },
    RESERVE: {
        name: '중앙 기동 분대',
        desc: '상황에 따라 기지 내 주요 지점을 기동 지원하는 수호 분대입니다.',
        bonusText: '전체 방어 분대 사기 증진 +10%',
        cpMultiplier: 1.05,
    },
};

export const DEFAULT_DEFENSE_SQUADS: DefenseSquad[] = [
    {
        id: 'squad_1',
        name: '제1 방어 분대',
        unlocked: true,
        memberIds: [],
        tacticalRole: 'FRONT_LINE',
    },
    {
        id: 'squad_2',
        name: '제2 방어 분대',
        unlocked: true,
        memberIds: [],
        tacticalRole: 'VANGUARD',
    },
    {
        id: 'squad_3',
        name: '제3 방어 분대',
        unlocked: true,
        memberIds: [],
        tacticalRole: 'REAR_GUARD',
    },
    {
        id: 'squad_4',
        name: '제4 방어 분대',
        unlocked: false,
        memberIds: [],
        tacticalRole: 'RESERVE',
    },
];

/**
 * 기지 방어 분대 목록 불러오기 (없으면 기본 생성)
 */
export const getDefenseSquads = (base?: Base): DefenseSquad[] => {
    if (!base) return DEFAULT_DEFENSE_SQUADS;
    if (!(base as any).defenseSquads || !Array.isArray((base as any).defenseSquads) || (base as any).defenseSquads.length === 0) {
        return DEFAULT_DEFENSE_SQUADS;
    }
    return (base as any).defenseSquads;
};

/**
 * 동료의 기지 방어 분대 배치 제한 여부 확인
 * (파견 중, 기지 담당자/시설 배치 중, 비전투인력 등 제외)
 */
export interface CompanionRestrictionInfo {
    isRestricted: boolean;
    type?: 'dispatched' | 'facility' | 'non_combat';
    reason?: string;
}

export const getCompanionDefenseRestriction = (
    characterOrBase: Character | Base | null | undefined,
    comp: Companion
): CompanionRestrictionInfo => {
    if (!characterOrBase || !comp) return { isRestricted: false };

    let base: Base | undefined;
    let mercenaryData: any;

    if ('base' in characterOrBase) {
        base = (characterOrBase as Character).base;
        mercenaryData = (characterOrBase as Character).mercenaryData;
    } else {
        base = characterOrBase as Base;
    }

    // 1. 파견 중 검사
    if (comp.isDispatched || (comp as any).dispatchEndTurn || comp.status === 'dispatched') {
        return { isRestricted: true, type: 'dispatched', reason: '파견 중' };
    }

    if (base?.dispatched && Array.isArray(base.dispatched)) {
        for (const m of base.dispatched) {
            if (m.companionId === comp.id || m.supportCompanionId === comp.id) {
                return { isRestricted: true, type: 'dispatched', reason: '파견 중' };
            }
            if (m.teamMembers && Array.isArray(m.teamMembers) && m.teamMembers.some((tm: any) => tm.companionId === comp.id)) {
                return { isRestricted: true, type: 'dispatched', reason: '파견 중' };
            }
            if ((m as any).participants && Array.isArray((m as any).participants) && (m as any).participants.includes(comp.id)) {
                return { isRestricted: true, type: 'dispatched', reason: '파견 중' };
            }
        }
    }

    if (mercenaryData?.groupMissions && Array.isArray(mercenaryData.groupMissions)) {
        for (const m of mercenaryData.groupMissions) {
            if (m.memberIds && Array.isArray(m.memberIds) && m.memberIds.includes(comp.id)) {
                return { isRestricted: true, type: 'dispatched', reason: '파견 중' };
            }
        }
    }

    // 2. 기지 담당자 / 시설 배치 검사
    if (base) {
        if (base.multiAssignments) {
            for (const compIds of Object.values(base.multiAssignments)) {
                if (Array.isArray(compIds) && compIds.includes(comp.id)) {
                    return { isRestricted: true, type: 'facility', reason: '담당자 배치' };
                }
            }
        }

        if (base.assignments) {
            for (const [key, assignedId] of Object.entries(base.assignments)) {
                if (assignedId === comp.id && !key.includes('dispatch')) {
                    return { isRestricted: true, type: 'facility', reason: '담당자 배치' };
                }
            }
        }

        if (base.houses && Array.isArray(base.houses)) {
            for (const house of base.houses) {
                if (house.assignedChefId === comp.id || house.assignedHousekeeperId === comp.id) {
                    return { isRestricted: true, type: 'facility', reason: '담당자 배치' };
                }
            }
        }

        if ((base as any).childAcademy?.instructorId === comp.id) {
            return { isRestricted: true, type: 'facility', reason: '담당자 배치' };
        }
    }

    // 3. 비전투인력 검사 (농부, 광부, 연금술사, 연구원, 요리사, 사육사, 하우스 키퍼, 노예, 학생 등)
    const nonCombatJobs = [
        '농부', '광부', '연금술사', '연구원', '요리사', '사육사', 
        '하우스 키퍼', '하우스키퍼', '노예', '학생', '상인', '약초꾼'
    ];

    const jobName = (comp.job || '').toString();
    const classTypeName = (comp.classType || '').toString();
    const jobTypeName = (comp.jobType || '').toString();

    const isNonCombat = nonCombatJobs.some(ncj => 
        jobName.includes(ncj) || classTypeName.includes(ncj) || jobTypeName.includes(ncj)
    ) || (comp as any).isNonCombat === true;

    if (isNonCombat) {
        return { isRestricted: true, type: 'non_combat', reason: '비전투인력' };
    }

    return { isRestricted: false };
};

/**
 * 기지 내에서 파견/담당자 배치/비전투인력 등 배치 불가 동료 ID 추출
 */
export const getDispatchedCompanionIds = (characterOrBase?: Character | Base | null): Set<string> => {
    const dispatchedIds = new Set<string>();
    if (!characterOrBase) return dispatchedIds;

    let base: Base | undefined;
    let mercenaryData: any;
    let companions: Companion[] = [];

    if ('base' in characterOrBase) {
        base = (characterOrBase as Character).base;
        mercenaryData = (characterOrBase as Character).mercenaryData;
        companions = (characterOrBase as Character).inactiveCompanions || [];
    } else {
        base = characterOrBase as Base;
    }

    // 동료 개별 제한 검사
    companions.forEach(c => {
        const restriction = getCompanionDefenseRestriction(characterOrBase, c);
        if (restriction.isRestricted) {
            dispatchedIds.add(c.id);
        }
    });

    if (base?.dispatched && Array.isArray(base.dispatched)) {
        base.dispatched.forEach(m => {
            if (m.companionId) dispatchedIds.add(m.companionId);
            if (m.supportCompanionId) dispatchedIds.add(m.supportCompanionId);
            if (m.teamMembers && Array.isArray(m.teamMembers)) {
                m.teamMembers.forEach(tm => {
                    if (tm.companionId) dispatchedIds.add(tm.companionId);
                });
            }
            if ((m as any).participants && Array.isArray((m as any).participants)) {
                (m as any).participants.forEach((pId: string) => dispatchedIds.add(pId));
            }
        });
    }

    if (mercenaryData?.groupMissions && Array.isArray(mercenaryData.groupMissions)) {
        mercenaryData.groupMissions.forEach((m: any) => {
            if (m.memberIds && Array.isArray(m.memberIds)) {
                m.memberIds.forEach((id: string) => dispatchedIds.add(id));
            }
        });
    }

    if (base) {
        if (base.multiAssignments) {
            Object.values(base.multiAssignments).forEach(ids => {
                if (Array.isArray(ids)) {
                    ids.forEach(id => dispatchedIds.add(id));
                }
            });
        }
        if (base.assignments) {
            Object.entries(base.assignments).forEach(([k, id]) => {
                if (id && !k.includes('dispatch')) dispatchedIds.add(id);
            });
        }
        if (base.houses && Array.isArray(base.houses)) {
            base.houses.forEach(h => {
                if (h.assignedChefId) dispatchedIds.add(h.assignedChefId);
                if (h.assignedHousekeeperId) dispatchedIds.add(h.assignedHousekeeperId);
            });
        }
        if ((base as any).childAcademy?.instructorId) {
            dispatchedIds.add((base as any).childAcademy.instructorId);
        }
    }

    companions.forEach(c => {
        if (c.isDispatched || (c as any).dispatchEndTurn || c.status === 'dispatched') {
            dispatchedIds.add(c.id);
        }
    });

    return dispatchedIds;
};

/**
 * 단일 방어 분대의 전투력 및 방어력 기여도 계산 (파견 중인 동료는 제외)
 */
export const calculateSquadDefensePower = (
    squad: DefenseSquad,
    availableCompanions: Companion[],
    dispatchedCompanionIds?: Set<string>
): { totalCP: number; defenseContribution: number; assignedCount: number; leaderName?: string } => {
    if (!squad.unlocked || !squad.memberIds || squad.memberIds.length === 0) {
        return { totalCP: 0, defenseContribution: 0, assignedCount: 0 };
    }

    const assignedComps = availableCompanions.filter(c => 
        squad.memberIds.includes(c.id) && (!dispatchedCompanionIds || !dispatchedCompanionIds.has(c.id))
    );
    let rawCP = 0;
    let leaderName: string | undefined;

    assignedComps.forEach(comp => {
        const cp = calculateCombatPower(comp);
        rawCP += cp;
        if (squad.leaderId === comp.id) {
            leaderName = comp.name;
        }
    });

    // 분대장 보유 시 +10% 시너지
    const leaderBonus = squad.leaderId && assignedComps.some(c => c.id === squad.leaderId) ? 1.1 : 1.0;
    
    // 풀 분대(4인 이상) 시 +10% 추가 보너스
    const fullSquadBonus = assignedComps.length >= 4 ? 1.1 : 1.0;

    // 전술 역할 배율 적용
    const roleConfig = TACTICAL_ROLE_CONFIG[squad.tacticalRole] || TACTICAL_ROLE_CONFIG.FRONT_LINE;
    const roleMult = roleConfig.cpMultiplier;

    const totalCP = Math.floor(rawCP * leaderBonus * fullSquadBonus);

    // 방어력 기여도: 전투력의 10%에 전술 역할 배율 적용
    const defenseContribution = Math.floor(totalCP * 0.10 * roleMult);

    return {
        totalCP,
        defenseContribution,
        assignedCount: assignedComps.length,
        leaderName,
    };
};

/**
 * 기지 내 모든 방어 분대의 총 방어력 기여도 계산
 */
export const calculateTotalSquadDefenseContribution = (
    base?: Base,
    companions: Companion[] = [],
    dispatchedCompanionIds?: Set<string>
): { totalContribution: number; totalCP: number; activeSquadsCount: number; assignedCompanionsCount: number } => {
    const squads = getDefenseSquads(base);
    let totalContribution = 0;
    let totalCP = 0;
    let activeSquadsCount = 0;
    const assignedCompanionSet = new Set<string>();

    const dispatchedSet = dispatchedCompanionIds || getDispatchedCompanionIds(base);

    squads.forEach(squad => {
        if (squad.unlocked && squad.memberIds.length > 0) {
            const stats = calculateSquadDefensePower(squad, companions, dispatchedSet);
            totalContribution += stats.defenseContribution;
            totalCP += stats.totalCP;
            if (stats.assignedCount > 0) {
                activeSquadsCount++;
                squad.memberIds.forEach(id => {
                    if (!dispatchedSet.has(id)) {
                        assignedCompanionSet.add(id);
                    }
                });
            }
        }
    });

    return {
        totalContribution,
        totalCP,
        activeSquadsCount,
        assignedCompanionsCount: assignedCompanionSet.size,
    };
};

/**
 * 기지 기존 방어 시설 + 방어 분대 방어력 합산한 최종 기지 방어력 계산
 */
export const calculateFinalBaseDefenseWithSquads = (
    base?: Base,
    companions: Companion[] = [],
    dispatchedCompanionIds?: Set<string>
): { totalBaseDefense: number; structureDefense: number; squadDefenseContribution: number } => {
    if (!base) return { totalBaseDefense: 0, structureDefense: 0, squadDefenseContribution: 0 };

    // 기존 방어 시설 + 본부 레벨 + 건축물 포함한 기지 기본/시설 방어력
    const structureDefense = calculateBaseDefenseBase(base, companions);

    // 방어 분대 방어력 기여도
    const dispatchedSet = dispatchedCompanionIds || getDispatchedCompanionIds(base);
    const squadStats = calculateTotalSquadDefenseContribution(base, companions, dispatchedSet);
    const squadDefenseContribution = squadStats.totalContribution;

    // 최종 기지 방어력 = 시설 방어력 + 분대 기여 방어력
    const totalBaseDefense = structureDefense + squadDefenseContribution;

    return {
        totalBaseDefense,
        structureDefense,
        squadDefenseContribution,
    };
};

/**
 * 방어 분대에 동료 배치/해제 업데이트
 */
export const updateDefenseSquadAssignment = (
    character: Character,
    squadId: string,
    memberIds: string[],
    leaderId?: string | null
): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return newChar;

    const dispatchedSet = getDispatchedCompanionIds(newChar);
    // 파견 중인 동료는 분대 배치 대상에서 제외
    const validMemberIds = memberIds.filter(id => !dispatchedSet.has(id));

    const currentSquads = getDefenseSquads(newChar.base);
    
    // 다른 분대에서 이미 배치된 동료 중복 제거
    const updatedSquads = currentSquads.map(s => {
        if (s.id === squadId) {
            return {
                ...s,
                memberIds: validMemberIds,
                leaderId: leaderId !== undefined ? (validMemberIds.includes(leaderId || '') ? leaderId : validMemberIds[0] || null) : (validMemberIds.includes(s.leaderId || '') ? s.leaderId : validMemberIds[0] || null),
            };
        } else {
            // 새 배치에서 포함된 동료는 타 분대에서 자동 제거
            const filteredMembers = s.memberIds.filter(id => !validMemberIds.includes(id));
            return {
                ...s,
                memberIds: filteredMembers,
                leaderId: filteredMembers.includes(s.leaderId || '') ? s.leaderId : (filteredMembers[0] || null),
            };
        }
    });

    (newChar.base as any).defenseSquads = updatedSquads;
    return newChar;
};

/**
 * 자동 최적 방어 분대 배치 (전투력 순서대로 분대원 자동 채우기, 파견 중인 동료 제외)
 */
export const autoAssignAllDefenseSquads = (character: Character): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return newChar;

    const dispatchedSet = getDispatchedCompanionIds(newChar);
    const allComps = (newChar.inactiveCompanions || []).filter(c => !dispatchedSet.has(c.id));
    if (allComps.length === 0) return newChar;

    // 전투력 기준 내림차순 정렬
    const sortedComps = [...allComps].sort((a, b) => calculateCombatPower(b) - calculateCombatPower(a));

    const squads = getDefenseSquads(newChar.base);
    let compIndex = 0;

    const updatedSquads = squads.map(squad => {
        if (!squad.unlocked) return squad;

        const members: string[] = [];
        // 각 분대당 4명씩 자동 배치
        for (let i = 0; i < 4 && compIndex < sortedComps.length; i++) {
            members.push(sortedComps[compIndex].id);
            compIndex++;
        }

        return {
            ...squad,
            memberIds: members,
            leaderId: members[0] || null,
        };
    });

    (newChar.base as any).defenseSquads = updatedSquads;
    return newChar;
};

/**
 * 방어 분대 전체 초기화
 */
export const clearAllDefenseSquads = (character: Character): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return newChar;

    const squads = getDefenseSquads(newChar.base);
    const updatedSquads = squads.map(squad => ({
        ...squad,
        memberIds: [],
        leaderId: null,
    }));

    (newChar.base as any).defenseSquads = updatedSquads;
    return newChar;
};
