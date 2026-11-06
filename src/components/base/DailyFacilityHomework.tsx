import React, { useState } from 'react';
import { Character, Base, JobType } from '../../types';
import { getFacilityTrainingLimit } from '../../utils';
import { calculateMonsterFarmTrainingLimit } from '../../services/monsterTrainingLimitService';
import { calculateMonsterArenaDailyLimit } from '../../services/monsterArenaService';
import { 
    CheckCircle2, 
    Clock, 
    ArrowRight, 
    Sparkles, 
    Wheat, 
    Pickaxe, 
    Dumbbell, 
    Swords, 
    Award, 
    Dog, 
    Shield, 
    CalendarCheck,
    Lock
} from 'lucide-react';

interface DailyFacilityHomeworkProps {
    character: Character;
    base: Base;
    onNavigateToFacility: (facilityId: string) => void;
}

export interface HomeworkItem {
    id: string;
    facilityId: string;
    name: string;
    desc: string;
    icon: React.ReactNode;
    isBuilt: boolean;
    isDone: boolean;
    current: number;
    max: number;
    statusText: string;
}

export const DailyFacilityHomework: React.FC<DailyFacilityHomeworkProps> = ({
    character,
    base,
    onNavigateToFacility
}) => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const layout = base?.layout || [];
    const dailyCounts = base?.dailyCounts || {};

    // 1. 농장 (Farm)
    const farmInstances = (layout || []).filter(inst => inst && inst.type === 'farm' && !inst.underConstruction && (inst.level || 0) > 0);
    const isFarmBuilt = farmInstances.length > 0;
    const farmCompletedCount = farmInstances.filter(inst => inst && (dailyCounts[`farm_harvest_${inst.id}`] || 0) >= 1).length;
    const isFarmDone = isFarmBuilt && farmCompletedCount >= farmInstances.length;

    // 2. 광산 (Mine)
    const mineInstances = (layout || []).filter(inst => inst && inst.type === 'mine' && !inst.underConstruction && (inst.level || 0) > 0);
    const isMineBuilt = mineInstances.length > 0;
    const mineCompletedCount = mineInstances.filter(inst => inst && (dailyCounts[`mine_harvest_${inst.id}`] || 0) >= 1).length;
    const isMineDone = isMineBuilt && mineCompletedCount >= mineInstances.length;

    // 3. 스탯 훈련장
    const isStatTrainBuilt = (layout || []).some(inst => inst && (inst.type === 'training_stat' || inst.type === 'training') && !inst.underConstruction && (inst.level || 0) > 0);
    const statTrainLimit = getFacilityTrainingLimit(character, 'training_stat');
    const statTrainCount = dailyCounts['training_stat'] || 0;
    const isStatTrainDone = isStatTrainBuilt && statTrainCount >= statTrainLimit;

    // 4. 무기 숙련도 훈련장
    const isMasteryTrainBuilt = (layout || []).some(inst => inst && (inst.type === 'training_mastery' || inst.type === 'training') && !inst.underConstruction && (inst.level || 0) > 0);
    const masteryTrainLimit = getFacilityTrainingLimit(character, 'training_mastery');
    const masteryTrainCount = dailyCounts['training_mastery'] || 0;
    const isMasteryTrainDone = isMasteryTrainBuilt && masteryTrainCount >= masteryTrainLimit;

    // 5. 경험치 훈련장
    const isExpTrainBuilt = (layout || []).some(inst => inst && (inst.type === 'training_exp' || inst.type === 'training') && !inst.underConstruction && (inst.level || 0) > 0);
    const expTrainLimit = getFacilityTrainingLimit(character, 'training_exp');
    const expTrainCount = dailyCounts['training_exp'] || 0;
    const isExpTrainDone = isExpTrainBuilt && expTrainCount >= expTrainLimit;

    // 6. 몬스터 사육소 (훈련)
    const monsterFarmInstances = (layout || []).filter(inst => inst && (inst.type === 'monster_farm' || inst.type === 'monster_ranch') && !inst.underConstruction && (inst.level || 0) > 0);
    const isMonsterFarmBuilt = monsterFarmInstances.length > 0;
    
    // 사육사 숙련도 계산
    const assignedBreederIds: string[] = [];
    monsterFarmInstances.forEach(inst => {
        const ids = base?.multiAssignments?.[inst.id] || (base?.assignments?.[inst.id] ? [base.assignments[inst.id]] : []);
        ids.forEach(id => {
            if (id && !assignedBreederIds.includes(id)) assignedBreederIds.push(id);
        });
    });
    const allCompanions = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    const activeBreeders = allCompanions.filter(c => c && assignedBreederIds.includes(c.id) && c.job === JobType.BREEDER);
    const totalBreedingLevel = activeBreeders.reduce((sum, b) => sum + (b.professions?.breeding?.level || 1), 0) || (character.professions?.breeding?.level || 1);
    
    const monsterTrainLimit = isMonsterFarmBuilt 
        ? calculateMonsterFarmTrainingLimit(character)
        : 0;
    const monsterTrainCount = dailyCounts['monster_train'] || 0;
    const isMonsterTrainDone = isMonsterFarmBuilt && monsterTrainCount >= monsterTrainLimit;

    // 7. 대련장 (Sparring Arena)
    const arenaInstances = (layout || []).filter(inst => inst && inst.type === 'sparring_arena');
    const isArenaBuilt = arenaInstances.length > 0;
    const arenaLimit = isArenaBuilt 
        ? arenaInstances.reduce((sum, inst) => sum + (3 + (inst.level || 1) * 2), 0)
        : 5;
    const arenaCount = dailyCounts['sparring_arena'] || 0;
    const isArenaDone = isArenaBuilt && arenaCount >= arenaLimit;

    // 8. 몬스터 수련 투기장 (Monster Arena)
    const arenaMonsterInstances = (layout || []).filter(inst => inst && inst.type === 'monster_arena' && !inst.underConstruction && (inst.level || 0) > 0);
    const isMonsterArenaBuilt = arenaMonsterInstances.length > 0;
    const monsterArenaLimit = isMonsterArenaBuilt ? calculateMonsterArenaDailyLimit(character) : 0;
    const monsterArenaCount = dailyCounts['monster_arena'] || 0;
    const isMonsterArenaDone = isMonsterArenaBuilt && monsterArenaCount >= monsterArenaLimit;

    const homeworkList: HomeworkItem[] = [
        {
            id: 'farm',
            facilityId: 'farm',
            name: '농장 수확',
            desc: farmInstances.length > 1 ? '모든 농장의 작물과 일일 자원을 한 번에 일괄 수확합니다.' : '작물을 가꿔 일일 식량 자원을 수확합니다.',
            icon: <Wheat className="text-amber-400" size={18} />,
            isBuilt: isFarmBuilt,
            isDone: isFarmDone,
            current: farmCompletedCount,
            max: Math.max(1, farmInstances.length),
            statusText: isFarmBuilt 
                ? (isFarmDone ? '오늘 수확 완료' : `${farmCompletedCount} / ${farmInstances.length}개 수확 완료`)
                : '시설 미건설'
        },
        {
            id: 'mine',
            facilityId: 'mine',
            name: '광산 채굴',
            desc: mineInstances.length > 1 ? '모든 광산의 잔여 채굴을 한 번에 일괄 채굴합니다.' : '철광석과 마석 광맥을 하루 한 번 일일 채굴합니다.',
            icon: <Pickaxe className="text-cyan-400" size={18} />,
            isBuilt: isMineBuilt,
            isDone: isMineDone,
            current: mineCompletedCount,
            max: Math.max(1, mineInstances.length),
            statusText: isMineBuilt
                ? (isMineDone ? '오늘 채굴 완료' : `${mineCompletedCount} / ${mineInstances.length}개 채굴 완료`)
                : '시설 미건설'
        },
        {
            id: 'training_stat',
            facilityId: 'training_stat',
            name: '스탯 훈련장',
            desc: '캐릭터 및 동료의 능력치 스탯을 단련합니다.',
            icon: <Dumbbell className="text-emerald-400" size={18} />,
            isBuilt: isStatTrainBuilt,
            isDone: isStatTrainDone,
            current: statTrainCount,
            max: statTrainLimit,
            statusText: isStatTrainBuilt
                ? (isStatTrainDone ? '오늘 훈련 완료' : `${statTrainCount} / ${statTrainLimit}회 진행`)
                : '시설 미건설'
        },
        {
            id: 'training_mastery',
            facilityId: 'training_mastery',
            name: '무기 숙련도 훈련장',
            desc: '무기별 숙련 지식을 쌓아 등급을 높입니다.',
            icon: <Swords className="text-indigo-400" size={18} />,
            isBuilt: isMasteryTrainBuilt,
            isDone: isMasteryTrainDone,
            current: masteryTrainCount,
            max: masteryTrainLimit,
            statusText: isMasteryTrainBuilt
                ? (isMasteryTrainDone ? '오늘 훈련 완료' : `${masteryTrainCount} / ${masteryTrainLimit}회 진행`)
                : '시설 미건설'
        },
        {
            id: 'training_exp',
            facilityId: 'training_exp',
            name: '경험치 훈련장',
            desc: '일일 집중 수련으로 경험치를 대량 획득합니다.',
            icon: <Award className="text-purple-400" size={18} />,
            isBuilt: isExpTrainBuilt,
            isDone: isExpTrainDone,
            current: expTrainCount,
            max: expTrainLimit,
            statusText: isExpTrainBuilt
                ? (isExpTrainDone ? '오늘 훈련 완료' : `${expTrainCount} / ${expTrainLimit}회 진행`)
                : '시설 미건설'
        },
        {
            id: 'monster_farm',
            facilityId: 'monster_farm',
            name: '몬스터 사육소 훈련',
            desc: '포획한 몬스터를 훈련시켜 성장시킵니다.',
            icon: <Dog className="text-orange-400" size={18} />,
            isBuilt: isMonsterFarmBuilt,
            isDone: isMonsterTrainDone,
            current: monsterTrainCount,
            max: monsterTrainLimit,
            statusText: isMonsterFarmBuilt
                ? (isMonsterTrainDone ? '오늘 훈련 완료' : `${monsterTrainCount} / ${monsterTrainLimit}회 진행`)
                : '시설 미건설'
        },
        {
            id: 'sparring_arena',
            facilityId: 'sparring_arena',
            name: '모의 대련장',
            desc: '동료들과 횟수 지정 연속 훈련 또는 1:1 대련을 통해 실전 숙련도와 호감도를 올립니다.',
            icon: <Shield className="text-rose-400" size={18} />,
            isBuilt: isArenaBuilt,
            isDone: isArenaDone,
            current: arenaCount,
            max: arenaLimit,
            statusText: isArenaBuilt 
                ? (isArenaDone ? '오늘 대련 완료' : `${arenaCount} / ${arenaLimit}회 진행`)
                : '시설 미건설'
        },
        {
            id: 'monster_arena',
            facilityId: 'monster_arena',
            name: '몬스터 수련 투기장',
            desc: '포획한 몬스터 간 모의 대전을 펼쳐 경험치와 능력을 길러줍니다.',
            icon: <Swords className="text-amber-400" size={18} />,
            isBuilt: isMonsterArenaBuilt,
            isDone: isMonsterArenaDone,
            current: monsterArenaCount,
            max: monsterArenaLimit,
            statusText: isMonsterArenaBuilt
                ? (isMonsterArenaDone ? '오늘 수련 완료' : `${monsterArenaCount} / ${monsterArenaLimit}회 진행`)
                : '시설 미건설'
        }
    ];

    // 건설된 시설 기준 계산
    const builtHomeworks = homeworkList.filter(h => h.isBuilt);
    const completedHomeworks = builtHomeworks.filter(h => h.isDone);
    const completionRate = builtHomeworks.length > 0 
        ? Math.round((completedHomeworks.length / builtHomeworks.length) * 100) 
        : 0;

    const filteredList = homeworkList.filter(item => {
        if (filter === 'pending') return item.isBuilt && !item.isDone;
        if (filter === 'completed') return item.isBuilt && item.isDone;
        return true;
    });

    return (
        <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-indigo-500/30 shadow-xl space-y-4">
            {/* 상단 헤더 및 통계 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <CalendarCheck className="text-indigo-400 shrink-0" size={20} />
                    <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                            기지 일일 숙제 현황
                            <span className="text-[11px] font-normal text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/50">
                                완료율 {completionRate}%
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            매일 기지 시설에서 완료할 수 있는 일일 훈련 및 자원 수확 활동입니다.
                        </p>
                    </div>
                </div>

                {/* 필터버튼 */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-stretch sm:self-auto justify-center">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                            filter === 'all'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        전체 ({homeworkList.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                            filter === 'pending'
                                ? 'bg-amber-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        미완료 ({builtHomeworks.length - completedHomeworks.length})
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                            filter === 'completed'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        완료 ({completedHomeworks.length})
                    </button>
                </div>
            </div>

            {/* 전체 달성 프로그레스 바 */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                    <span className="text-slate-300 flex items-center gap-1">
                        <Sparkles size={13} className="text-amber-400" />
                        건설된 시설 숙제 진행 상황
                    </span>
                    <span className="text-indigo-400 font-mono">
                        {completedHomeworks.length} / {builtHomeworks.length} 완료
                    </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
            </div>

            {/* 숙제 그리드 리스트 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredList.map(item => {
                    return (
                        <div
                            key={item.id}
                            onClick={() => item.isBuilt && onNavigateToFacility(item.facilityId)}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                                !item.isBuilt
                                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                    : item.isDone
                                    ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/70 cursor-pointer'
                                    : 'bg-slate-900 border-amber-500/40 hover:border-amber-500/70 shadow-md cursor-pointer hover:scale-[1.01]'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                                            {item.icon}
                                        </div>
                                        <span className="font-extrabold text-xs text-white truncate">
                                            {item.name}
                                        </span>
                                    </div>

                                    {/* 상태 태그 */}
                                    {!item.isBuilt ? (
                                        <span className="text-[10px] font-bold bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1 shrink-0">
                                            <Lock size={10} /> 미건설
                                        </span>
                                    ) : item.isDone ? (
                                        <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800/60 flex items-center gap-1 shrink-0">
                                            <CheckCircle2 size={10} /> 완료
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded-md border border-amber-800/60 flex items-center gap-1 shrink-0">
                                            <Clock size={10} /> 미완료
                                        </span>
                                    )}
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono text-slate-300 font-semibold">
                                    {item.statusText}
                                </span>

                                {item.isBuilt && (
                                    <button
                                        onClick={() => onNavigateToFacility(item.facilityId)}
                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 active:scale-95 shrink-0 ${
                                            item.isDone
                                                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-sm'
                                        }`}
                                    >
                                        이동 <ArrowRight size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
