import React from 'react';
import { Character, BaseData, JobType } from '../../types';
import { FACILITIES_INFO } from '../../constants';
import { Briefcase, X, UserCheck, UserMinus, Hammer, Lock, AlertCircle, Home, Compass, ShieldAlert, GraduationCap, ArrowRightLeft } from 'lucide-react';

export interface ResidentFacilityAssignmentInfo {
    instanceId: string;
    facilityId: string;
    facilityName: string;
    displayName: string;
    level: number;
    isMulti: boolean;
}

export interface ResidentHouseDutyInfo {
    houseId: string;
    houseName: string;
    role: 'chef' | 'housekeeper';
    label: string;
}

export interface ResidentDutySummary {
    facilityAssignments: ResidentFacilityAssignmentInfo[];
    houseDuties: ResidentHouseDutyInfo[];
    dispatchDuties: string[];
    trainingDuties: string[];
    isBusyWithWork: boolean;
    canAssignToFacility: boolean;
}

const MULTI_ASSIGN_FACILITIES = ['farm', 'mine', 'alchemy', 'cooking', 'lab', 'workshop'];

export const isMultiAssignFacility = (facilityType: string): boolean => {
    return MULTI_ASSIGN_FACILITIES.includes(facilityType);
};

export const getFacilityDisplayName = (base: BaseData | undefined, instanceIdOrType: string): {
    instanceId: string;
    facilityId: string;
    facilityName: string;
    displayName: string;
    level: number;
    isMulti: boolean;
} | null => {
    if (!base) return null;
    const layout = base.layout || [];
    const instance = layout.find(inst => inst.id === instanceIdOrType) || layout.find(inst => inst.type === instanceIdOrType);
    const facilityId = instance ? instance.type : instanceIdOrType;
    const facInfo = FACILITIES_INFO.find(f => f.id === facilityId);
    if (!facInfo) return null;

    const sameTypeInstances = layout.filter(inst => inst.type === facilityId);
    const typeIndex = instance ? sameTypeInstances.findIndex(inst => inst.id === instance.id) : 0;
    const suffix = !facInfo.isUnique && sameTypeInstances.length > 0 && typeIndex >= 0 ? ` ${typeIndex + 1}` : '';

    return {
        instanceId: instance ? instance.id : instanceIdOrType,
        facilityId: facInfo.id,
        facilityName: facInfo.name,
        displayName: `${facInfo.name}${suffix}`,
        level: instance?.level || 1,
        isMulti: isMultiAssignFacility(facInfo.id)
    };
};

export const getResidentDutySummary = (character: Character, compId: string): ResidentDutySummary => {
    const base = character.base;
    const facilityAssignments: ResidentFacilityAssignmentInfo[] = [];
    const addedInstanceIds = new Set<string>();

    if (base) {
        // 1. 다중 배치 시설 확인 (multiAssignments)
        Object.entries(base.multiAssignments || {}).forEach(([instId, compIds]) => {
            if (Array.isArray(compIds) && compIds.includes(compId)) {
                const info = getFacilityDisplayName(base, instId);
                if (info && !addedInstanceIds.has(info.instanceId)) {
                    addedInstanceIds.add(info.instanceId);
                    facilityAssignments.push(info);
                }
            }
        });

        // 2. 단일 배치 시설 확인 (assignments)
        Object.entries(base.assignments || {}).forEach(([key, assignedId]) => {
            if (assignedId === compId && !key.includes('dispatch')) {
                const info = getFacilityDisplayName(base, key);
                if (info && !addedInstanceIds.has(info.instanceId)) {
                    addedInstanceIds.add(info.instanceId);
                    facilityAssignments.push(info);
                }
            }
        });
    }

    // 3. 숙소 전담 업무 확인 (전담 요리사 / 관리인)
    const houseDuties: ResidentHouseDutyInfo[] = [];
    (base?.houses || []).forEach(house => {
        if (house.assignedChefId === compId) {
            houseDuties.push({
                houseId: house.id,
                houseName: house.name,
                role: 'chef',
                label: `${house.name} 전담 요리사`
            });
        }
        if (house.assignedHousekeeperId === compId) {
            houseDuties.push({
                houseId: house.id,
                houseName: house.name,
                role: 'housekeeper',
                label: `${house.name} 숙소 관리인`
            });
        }
    });

    // 4. 파견 및 외부 임무 확인
    const dispatchDuties: string[] = [];
    (base?.dispatched || []).forEach(m => {
        if (m.companionId === compId) {
            if ((m as any).craftMetadata) {
                dispatchDuties.push('연금술 조제 의뢰 중');
            } else {
                dispatchDuties.push('기지 파견 임무 중');
            }
        } else if (m.missionType === 'WarInvasion' && Array.isArray((m as any).participants) && (m as any).participants.includes(compId)) {
            dispatchDuties.push('전쟁 파견 참전 중');
        }
    });

    (character.mercenaryData?.groupMissions || []).forEach(gm => {
        if (Array.isArray(gm.memberIds) && gm.memberIds.includes(compId)) {
            dispatchDuties.push('용병단 임무 파견 중');
        }
    });

    // 5. 훈련소 수련생 / 아카데미 등록 상태 확인 (표시용)
    const trainingDuties: string[] = [];
    if (base?.combatTraining?.slots?.some(s => s.companionId === compId)) {
        trainingDuties.push('실전 훈련소 수련생');
    }
    if (base?.childAcademy?.studentIds?.includes(compId)) {
        trainingDuties.push('유년 아카데미 원생');
    }
    if (base?.childAcademy?.instructorId === compId) {
        const hasAcademyFacility = facilityAssignments.some(f => f.facilityId === 'child_academy');
        if (!hasAcademyFacility) {
            trainingDuties.push('유년 아카데미 스승');
        }
    }

    const isBusyWithWork = facilityAssignments.length > 0 || houseDuties.length > 0 || dispatchDuties.length > 0;
    const canAssignToFacility = dispatchDuties.length === 0;

    return {
        facilityAssignments,
        houseDuties,
        dispatchDuties,
        trainingDuties,
        isBusyWithWork,
        canAssignToFacility
    };
};

export const checkFacilityJobRequirement = (
    comp: Character,
    facilityId: string,
    base?: BaseData
): { allowed: boolean; requiredJobLabel: string } => {
    const job = comp.job;
    const isSlave = job === JobType.SLAVE || (job as string) === '노예';

    if (facilityId === 'farm') {
        return {
            allowed: job === JobType.FARMER || isSlave,
            requiredJobLabel: '농부 또는 노예'
        };
    }
    if (facilityId === 'mine') {
        return {
            allowed: job === JobType.MINER || isSlave,
            requiredJobLabel: '광부 또는 노예'
        };
    }
    if (facilityId === 'alchemy') {
        return {
            allowed: job === JobType.ALCHEMIST,
            requiredJobLabel: '연금술사'
        };
    }
    if (facilityId === 'cooking') {
        const isHouseChef = base?.houses?.some(h => h.assignedChefId === comp.id);
        if (isHouseChef) {
            return {
                allowed: false,
                requiredJobLabel: '숙소 전담 요리사 해제 필요'
            };
        }
        return {
            allowed: job === JobType.CHEF,
            requiredJobLabel: '요리사'
        };
    }
    if (facilityId === 'monster_farm' || facilityId === 'monster_arena') {
        return {
            allowed: job === JobType.BREEDER,
            requiredJobLabel: '사육사'
        };
    }
    if (facilityId === 'lab') {
        return {
            allowed: job === JobType.RESEARCHER,
            requiredJobLabel: '학자'
        };
    }
    if (facilityId === 'workshop') {
        return {
            allowed: job === JobType.BLACKSMITH,
            requiredJobLabel: '대장장이'
        };
    }
    if (
        facilityId === 'training' ||
        facilityId === 'training_exp' ||
        facilityId === 'training_stat' ||
        facilityId === 'training_mastery' ||
        facilityId === 'training_style' ||
        facilityId === 'tactical_training' ||
        facilityId === 'combat_training'
    ) {
        return {
            allowed: job === JobType.TRAINER,
            requiredJobLabel: '트레이너'
        };
    }

    return {
        allowed: true,
        requiredJobLabel: '제한 없음'
    };
};

interface ResidentFacilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    companion: Character | null;
    character: Character;
    onAssignCompanion: (companionId: string, instanceId: string) => void;
    onUnassignHouseDuty?: (companionId: string, houseId: string, role: 'chef' | 'housekeeper') => void;
}

export const ResidentFacilityModal: React.FC<ResidentFacilityModalProps> = ({
    isOpen,
    onClose,
    companion,
    character,
    onAssignCompanion,
    onUnassignHouseDuty
}) => {
    if (!isOpen || !companion || !character.base) return null;

    const base = character.base;
    const dutySummary = getResidentDutySummary(character, companion.id);
    const layout = base.layout || [];

    // 현재 거주민을 모든 시설에서 해제하는 헬퍼
    const handleUnassignCurrentFacilities = () => {
        dutySummary.facilityAssignments.forEach(fac => {
            if (fac.isMulti) {
                onAssignCompanion(companion.id, fac.instanceId);
            } else {
                onAssignCompanion('', fac.instanceId);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] sm:max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 shrink-0">
                            <Briefcase size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                                    {companion.name} 시설 배치 관리
                                </h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
                                    Lv.{companion.level}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 font-bold border border-indigo-800/60">
                                    {companion.job || '모험가'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                거주민을 배치할 기지 시설을 선택하거나 해제할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 현재 배정된 업무 상태 요약 */}
                <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">현재 배정된 업무</span>
                        {dutySummary.facilityAssignments.length > 0 && (
                            <button
                                onClick={handleUnassignCurrentFacilities}
                                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                            >
                                <UserMinus size={12} /> 시설 배치 전체 해제
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {dutySummary.facilityAssignments.map(fac => (
                            <span
                                key={fac.instanceId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 text-xs font-bold"
                            >
                                <Briefcase size={12} className="text-indigo-400" />
                                {fac.displayName} (Lv.{fac.level}) 담당
                            </span>
                        ))}
                        {dutySummary.houseDuties.map(hd => (
                            <span
                                key={`${hd.houseId}_${hd.role}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs font-bold"
                            >
                                <Home size={12} className="text-amber-400" />
                                {hd.label}
                                {onUnassignHouseDuty && (
                                    <button
                                        onClick={() => onUnassignHouseDuty(companion.id, hd.houseId, hd.role)}
                                        className="ml-1 px-1.5 py-0.5 bg-red-900/80 hover:bg-red-800 text-red-100 rounded text-[10px] font-bold"
                                    >
                                        해제
                                    </button>
                                )}
                            </span>
                        ))}
                        {dutySummary.dispatchDuties.map((dd, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-600/50 text-purple-200 text-xs font-bold"
                            >
                                <Compass size={12} className="text-purple-400" />
                                {dd}
                            </span>
                        ))}
                        {dutySummary.trainingDuties.map((td, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-600/50 text-cyan-200 text-xs font-bold"
                            >
                                <GraduationCap size={12} className="text-cyan-400" />
                                {td}
                            </span>
                        ))}
                        {!dutySummary.isBusyWithWork && dutySummary.trainingDuties.length === 0 && (
                            <span className="text-xs text-slate-500 py-0.5">
                                현재 배정된 시설 업무가 없습니다. (대기 중)
                            </span>
                        )}
                    </div>
                </div>

                {/* 시설 목록 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5">
                    {layout.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                            기지에 건설된 시설이 없습니다.
                        </div>
                    ) : (
                        layout
                            .map(instance => {
                                const facInfo = FACILITIES_INFO.find(f => f.id === instance.type);
                                if (!facInfo) return null;
                                const displayInfo = getFacilityDisplayName(base, instance.id);
                                const jobCheck = checkFacilityJobRequirement(companion, facInfo.id, base);
                                const isUnlocked = (base.level || 1) >= facInfo.minLevel;
                                const isUnderConstruction = !!instance.underConstruction;
                                const isMulti = isMultiAssignFacility(facInfo.id);
                                const facilityLevel = instance.level || 1;
                                const assignedIds = isMulti
                                    ? (base.multiAssignments?.[instance.id] || [])
                                    : (base.assignments?.[instance.id] ? [base.assignments[instance.id] as string] : []);
                                const isAssignedHere = assignedIds.includes(companion.id);

                                return {
                                    instance,
                                    facInfo,
                                    displayInfo,
                                    jobCheck,
                                    isUnlocked,
                                    isUnderConstruction,
                                    isMulti,
                                    facilityLevel,
                                    assignedIds,
                                    isAssignedHere
                                };
                            })
                            .filter((item): item is NonNullable<typeof item> => item !== null)
                            .sort((a, b) => {
                                // 1순위: 현재 이 거주민이 배치된 시설
                                if (a.isAssignedHere !== b.isAssignedHere) return a.isAssignedHere ? -1 : 1;
                                // 2순위: 직업 조건 충족 및 해금된 시설
                                const aReady = a.jobCheck.allowed && a.isUnlocked && !a.isUnderConstruction;
                                const bReady = b.jobCheck.allowed && b.isUnlocked && !b.isUnderConstruction;
                                if (aReady !== bReady) return aReady ? -1 : 1;
                                return 0;
                            })
                            .map(({
                                instance,
                                facInfo,
                                displayInfo,
                                jobCheck,
                                isUnlocked,
                                isUnderConstruction,
                                isMulti,
                                facilityLevel,
                                assignedIds,
                                isAssignedHere
                            }) => {
                                const assignedComps = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id));
                                const maxCapacity = isMulti ? facilityLevel : 1;
                                const isFull = isMulti && assignedIds.length >= maxCapacity && !isAssignedHere;
                                const canAssign = isUnlocked && !isUnderConstruction && jobCheck.allowed && !isFull && dutySummary.canAssignToFacility;

                                return (
                                    <div
                                        key={instance.id}
                                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isAssignedHere
                                                ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md shadow-indigo-950/30'
                                                : canAssign
                                                ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                                                : 'bg-slate-950/40 border-slate-900 opacity-65'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-extrabold text-xs sm:text-sm text-white">
                                                    {displayInfo?.displayName || facInfo.name}
                                                </span>
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                                    Lv.{facilityLevel}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                                    {isMulti ? `정원 ${assignedComps.length}/${maxCapacity}명` : '단일 담당'}
                                                </span>
                                                {isAssignedHere && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                                                        현재 배치됨
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                <span className="text-slate-400">
                                                    현재 담당:{' '}
                                                    <strong className={assignedComps.length > 0 ? 'text-indigo-300' : 'text-slate-500'}>
                                                        {assignedComps.length > 0
                                                            ? assignedComps.map(c => c.name).join(', ')
                                                            : '미배치'}
                                                    </strong>
                                                </span>
                                                <span className="text-slate-600">|</span>
                                                <span className={jobCheck.allowed ? 'text-emerald-400' : 'text-red-400'}>
                                                    필요 직업: {jobCheck.requiredJobLabel}
                                                </span>
                                            </div>

                                            {!isUnlocked && (
                                                <div className="text-[10px] text-red-400 flex items-center gap-1">
                                                    <Lock size={10} /> 기지 레벨 {facInfo.minLevel} 이상 필요
                                                </div>
                                            )}
                                            {isUnderConstruction && (
                                                <div className="text-[10px] text-amber-400 flex items-center gap-1">
                                                    <Hammer size={10} /> 현재 시설 공사 진행 중
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end shrink-0">
                                            {isAssignedHere ? (
                                                <button
                                                    onClick={() => {
                                                        if (isMulti) {
                                                            onAssignCompanion(companion.id, instance.id);
                                                        } else {
                                                            onAssignCompanion('', instance.id);
                                                        }
                                                    }}
                                                    className="w-full sm:w-auto px-3.5 py-2 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-600/60 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                                >
                                                    <UserMinus size={14} /> 배치 해제
                                                </button>
                                            ) : canAssign ? (
                                                <button
                                                    onClick={() => {
                                                        onAssignCompanion(companion.id, instance.id);
                                                    }}
                                                    className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                                        !isMulti && assignedComps.length > 0
                                                            ? 'bg-amber-700 hover:bg-amber-600 text-white border border-amber-500/60'
                                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50'
                                                    }`}
                                                >
                                                    {!isMulti && assignedComps.length > 0 ? (
                                                        <>
                                                            <ArrowRightLeft size={14} /> 교체 배치
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck size={14} /> 담당자 배치
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="w-full sm:w-auto text-center px-3 py-1.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl text-[11px] font-bold">
                                                    {isUnderConstruction
                                                        ? '공사 중'
                                                        : !isUnlocked
                                                        ? '미해금'
                                                        : !jobCheck.allowed
                                                        ? '직업 불일치'
                                                        : isFull
                                                        ? '정원 초과'
                                                        : '배치 불가'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>

                {/* 하단 닫기 버튼 (모바일 터치 최적화) */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs sm:text-sm transition-colors active:scale-95"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
