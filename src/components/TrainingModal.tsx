import React, { useState, useEffect } from 'react';
import { Character, Companion, Stats, WeaponType, JobType, TrainerRank, TrainerBranch, TRAINER_RANK_CONFIG } from '../types';
import { X, ArrowUpCircle, Activity, Sword, Star, Lock, User, Users, Info, Flame, Brain, Shield, Wind, Heart, Zap as Energy, Award, Sparkles, ChevronRight, Dices, UserPlus, CheckCircle2, GraduationCap, Clock } from 'lucide-react';
import { calculateFinalStats, calculateTotalTrainingLevel, getTrainerBranchMultiplier, hasActiveTrainerBranch, getTrainerRequiredExp, checkTrainerBranchRequirement } from '../utils';
import { getTrainingRates, TrainingRates, getFacilityTrainingLimitInfo } from '../services/trainingService';
import { getCompanionCP, getCompanionPureCP } from '../services/companionGrowthService';
import { PromotionMasteryProgressBar } from './PromotionMasteryProgressBar';

interface TrainingModalProps {
    character: Character;
    onClose: () => void;
    onExpTraining: (amount: number, targetId?: string) => void;
    onStatTraining: (statKey: string, targetId: string, amount: number) => void;
    onWeaponTraining: (weaponType: WeaponType, targetId: string, amount: number) => void;
    onUpdateCharacter?: (newChar: Character, logMessage?: string) => void;
    initialTab?: 'exp' | 'stat' | 'mastery' | 'trainer';
}

const TrainingModal: React.FC<TrainingModalProps> = ({ 
    character, 
    onClose, 
    onExpTraining, 
    onStatTraining, 
    onWeaponTraining, 
    onUpdateCharacter,
    initialTab = 'exp' 
}) => {
    const hasExpFacility = (character.base?.layout || []).some(inst => inst.type === 'training_exp' && !inst.underConstruction && (inst.level || 0) > 0);
    const hasStatFacility = (character.base?.layout || []).some(inst => inst.type === 'training_stat' && !inst.underConstruction && (inst.level || 0) > 0);
    const hasMasteryFacility = (character.base?.layout || []).some(inst => inst.type === 'training_mastery' && !inst.underConstruction && (inst.level || 0) > 0);

    const getValidInitialTab = (): 'exp' | 'stat' | 'mastery' | 'trainer' => {
        if (initialTab === 'trainer') return 'trainer';
        if (initialTab === 'exp' && hasExpFacility) return 'exp';
        if (initialTab === 'stat' && hasStatFacility) return 'stat';
        if (initialTab === 'mastery' && hasMasteryFacility) return 'mastery';
        
        if (hasExpFacility) return 'exp';
        if (hasStatFacility) return 'stat';
        if (hasMasteryFacility) return 'mastery';
        
        return 'trainer';
    };

    const [activeTab, setActiveTab] = useState<'exp' | 'stat' | 'mastery' | 'trainer'>(getValidInitialTab());
    const [targetId, setTargetId] = useState<string>('player');
    const [trainingAmount, setTrainingAmount] = useState<number>(1);
    const [selectedStat, setSelectedStat] = useState<string>('str');
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('Sword');
    const [appointingId, setAppointingId] = useState<string>('');

    // 훈련 대상 동료 검색 및 정렬 상태 추가
    const [targetSearchQuery, setTargetSearchQuery] = useState('');
    const [targetSortOption, setTargetSortOption] = useState<'default' | 'isCustom' | 'name' | 'level' | 'cp' | 'pureCp'>('default');

    const WEAPON_TYPES: WeaponType[] = [
        'Sword', 'Spear', 'Blunt', 'Axe', 'Knuckle',
        'Bow', 'Crossbow', 'Thrown', 'Firearm', 'Heavy',
        'Staff', 'Energy', 'Grimoire',
        'Shield', 'Orb', 'SubSword'
    ];

    const allTargets = (() => {
        const targets = [
            { id: 'player', name: character.name, level: character.level, stats: character.stats, isCustom: true, entity: character },
            ...character.companions.map(c => ({ id: c.id, name: c.name, level: c.level, stats: c.stats, isCustom: c.isCustom ?? false, entity: c })),
            ...(character.inactiveCompanions || []).map(c => ({ id: c.id, name: c.name, level: c.level, stats: c.stats, isCustom: c.isCustom ?? false, entity: c }))
        ];
        const seen = new Set();
        return targets.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });
    })();

    // 검색 및 정렬이 반영된 훈련 대상 목록
    const filteredAndSortedTargets = allTargets
        .filter(t => {
            if (!targetSearchQuery) return true;
            return t.name.toLowerCase().includes(targetSearchQuery.toLowerCase());
        })
        .sort((a, b) => {
            if (targetSortOption === 'isCustom') {
                const aVal = a.isCustom ? 1 : 0;
                const bVal = b.isCustom ? 1 : 0;
                return bVal - aVal;
            }
            if (targetSortOption === 'name') {
                return a.name.localeCompare(b.name, 'ko');
            }
            if (targetSortOption === 'level') {
                return b.level - a.level;
            }
            if (targetSortOption === 'cp') {
                return getCompanionCP(b.entity) - getCompanionCP(a.entity);
            }
            if (targetSortOption === 'pureCp') {
                return getCompanionPureCP(b.entity) - getCompanionPureCP(a.entity);
            }
            return 0; // 'default' (기본 순)
        });

    const currentTarget = allTargets.find(t => t.id === targetId) || allTargets[0];

    // 각 훈련소 종류별 시설 개수 및 해당 훈련소에 배치된 트레이너 기준으로 일일 훈련 가능 횟수 계산
    const expLimitInfo = getFacilityTrainingLimitInfo(character, 'training_exp');
    const statLimitInfo = getFacilityTrainingLimitInfo(character, 'training_stat');
    const masteryLimitInfo = getFacilityTrainingLimitInfo(character, 'training_mastery');

    const expLimit = expLimitInfo.totalLimit;
    const statLimit = statLimitInfo.totalLimit;
    const masteryLimit = masteryLimitInfo.totalLimit;

    const isDailyResetToday = character.base?.lastDailyReset === character.currentDate;
    const expCount = isDailyResetToday ? (character.base?.dailyCounts?.['training_exp'] || 0) : 0;
    const statCount = isDailyResetToday ? (character.base?.dailyCounts?.['training_stat'] || 0) : 0;
    const masteryCount = isDailyResetToday ? (character.base?.dailyCounts?.['training_mastery'] || 0) : 0;

    const expRemaining = Math.max(0, expLimit - expCount);
    const statRemaining = Math.max(0, statLimit - statCount);
    const masteryRemaining = Math.max(0, masteryLimit - masteryCount);

    useEffect(() => {
        const currentRemaining = activeTab === 'exp' ? expRemaining : activeTab === 'stat' ? statRemaining : activeTab === 'mastery' ? masteryRemaining : 1;
        if (currentRemaining > 0 && trainingAmount > currentRemaining) {
            setTrainingAmount(currentRemaining);
        } else if (trainingAmount < 1) {
            setTrainingAmount(1);
        }
    }, [activeTab, expRemaining, statRemaining, masteryRemaining, trainingAmount]);

    // Multipliers
    const expMult = getTrainerBranchMultiplier(character, TrainerBranch.EXP);
    const statMult = getTrainerBranchMultiplier(character, TrainerBranch.STAT);
    const masteryMult = getTrainerBranchMultiplier(character, TrainerBranch.WEAPON_MASTERY);
    const tacticalMult = getTrainerBranchMultiplier(character, TrainerBranch.TACTICAL);
    const styleMult = getTrainerBranchMultiplier(character, TrainerBranch.COMBAT_STYLE);

    // Rates calculated based on assigned/active trainer ranks
    const expRates = getTrainingRates(character, 'training_exp');
    const statRates = getTrainingRates(character, 'training_stat');
    const masteryRates = getTrainingRates(character, 'training_mastery');

    // 시간대 확인 (주간: 06:00 ~ 21:59, 심야: 22:00 ~ 05:59)
    const timeStr = character.currentTime || '08:00';
    const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isLateNight = currentHour >= 22 || currentHour < 6;
    const isCompanionTarget = targetId !== 'player';
    const isCompanionTrainingBlocked = isLateNight && isCompanionTarget;

    // All actors (player + active companions + inactive companions)
    const allActors = [
        { ...character, isPlayer: true, isCustom: true, entityId: 'player' },
        ...character.companions.map(c => ({ ...c, isPlayer: false, entityId: c.id })),
        ...(character.inactiveCompanions || []).map(c => ({ ...c, isPlayer: false, entityId: c.id }))
    ];

    // Deduplicate actors by entityId
    const seenActorIds = new Set<string>();
    const uniqueActors = allActors.filter(a => {
        if (seenActorIds.has(a.entityId)) return false;
        seenActorIds.add(a.entityId);
        return true;
    });

    const trainers = uniqueActors.filter(actor => actor.job === JobType.TRAINER && !(actor as any).isMonster && !(actor as any).monsterData);
    // 직업이 무직인 동료만 트레이너 신규 임명 대상으로 필터링 (몬스터 제외)
    const nonTrainers = uniqueActors.filter(actor => 
        !actor.isPlayer && 
        !(actor as any).isMonster &&
        !(actor as any).monsterData &&
        actor.race !== '몬스터' &&
        (!actor.job || actor.job === JobType.UNEMPLOYED || (actor.job as any) === '무직' || (actor.job as any) === 'None')
    );

    // Trainer Promotion Logic
    const handlePromoteTrainer = (actorId: string) => {
        if (!onUpdateCharacter) return;
        const newChar: Character = JSON.parse(JSON.stringify(character));
        let targetActor: any = null;

        if (actorId === 'player' || actorId === character.name) {
            targetActor = newChar;
        } else {
            targetActor = (newChar.companions || []).find(c => c.id === actorId) || (newChar.inactiveCompanions || []).find(c => c.id === actorId);
        }

        if (!targetActor || targetActor.job !== JobType.TRAINER) return;

        const currentRank = targetActor.trainerRank || TrainerRank.APPRENTICE;
        const ranks = Object.values(TrainerRank);
        const currentIndex = ranks.indexOf(currentRank);

        if (currentIndex < 0 || currentIndex >= ranks.length - 1) return;

        const nextRank = ranks[currentIndex + 1];
        const nextRankCfg = TRAINER_RANK_CONFIG[nextRank];
        const currentLevel = targetActor.trainerLevel || 1;

        if (currentLevel < nextRankCfg.reqLevel) {
            return;
        }

        // 숙련 등급 이상 승급 시 분과 조건 검증
        if (nextRankCfg.order >= 5 && targetActor.trainerBranch) {
            const check = checkTrainerBranchRequirement(targetActor);
            if (!check.met) {
                alert(`[승급 불가] ${targetActor.trainerBranch} 승급 조건 미충족:\n${check.reason}`);
                return;
            }
        }

        targetActor.trainerRank = nextRank;

        // 숙련 등급(order 5) 이상 승급 시 분과 미배정일 경우
        if (currentIndex + 1 >= 4 && !targetActor.trainerBranch) {
            if (!targetActor.isCustom) {
                const branches = Object.values(TrainerBranch);
                targetActor.trainerBranch = branches[Math.floor(Math.random() * branches.length)];
            }
        }

        onUpdateCharacter(newChar, `[트레이너] ${targetActor.name} 트레이너가 숙련 레벨 ${currentLevel}에 도달하여 '${nextRankCfg.label}'(으)로 승급하였습니다!`);
    };

    // Change Branch Logic (Custom Trainers only, 1 time selection)
    const handleChangeBranch = (actorId: string, branch: TrainerBranch) => {
        if (!onUpdateCharacter) return;
        const newChar: Character = JSON.parse(JSON.stringify(character));
        let targetActor: any = null;

        if (actorId === 'player' || actorId === character.name) {
            targetActor = newChar;
        } else {
            targetActor = (newChar.companions || []).find(c => c.id === actorId) || (newChar.inactiveCompanions || []).find(c => c.id === actorId);
        }

        if (!targetActor) return;

        if (!targetActor.isCustom) {
            alert('일반 동료 트레이너의 담당 분과는 랜덤으로 결정되며 변경할 수 없습니다.');
            return;
        }

        if (targetActor.trainerBranch) {
            alert('커스텀 동료 트레이너의 담당 분과는 이미 결정되어 더 이상 변경할 수 없습니다.');
            return;
        }

        targetActor.trainerBranch = branch;
        onUpdateCharacter(newChar, `[트레이너] ${targetActor.name} 트레이너의 담당 분과가 '${branch}'(으)로 결정되었습니다. (이후 변경 불가)`);
    };

    // Reroll Branch Logic for General Companions (Not allowed)
    const handleRerollBranch = (actorId: string) => {
        alert('일반 동료 트레이너의 담당 분과는 랜덤으로 결정되며 결정된 이후 변경할 수 없습니다.');
    };

    // Appoint Companion as Trainer
    const handleAppointTrainer = (actorId: string) => {
        if (!onUpdateCharacter) return;
        const newChar: Character = JSON.parse(JSON.stringify(character));
        let targetActor: any = null;

        if (actorId === 'player') {
            targetActor = newChar;
        } else {
            targetActor = (newChar.companions || []).find(c => c.id === actorId) || (newChar.inactiveCompanions || []).find(c => c.id === actorId);
        }

        if (!targetActor) return;
        targetActor.job = JobType.TRAINER;
        targetActor.trainerRank = TrainerRank.APPRENTICE;
        targetActor.trainerLevel = 1;
        targetActor.trainerExp = 0;
        targetActor.trainerMaxExp = getTrainerRequiredExp(1);
        if (!targetActor.isCustom && !targetActor.trainerBranch) {
            const branches = Object.values(TrainerBranch);
            targetActor.trainerBranch = branches[Math.floor(Math.random() * branches.length)];
        }
        onUpdateCharacter(newChar, `[트레이너] ${targetActor.name}이(가) 견습 트레이너로 임명되었습니다.${!targetActor.isCustom ? ` (담당 분과: ${targetActor.trainerBranch})` : ''}`);
        setAppointingId('');
    };

    const renderTargetSelector = () => (
        <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block shrink-0">훈련 대상 선택</label>
                
                {/* 검색 및 정렬 인터페이스 */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="이름 검색"
                        value={targetSearchQuery}
                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-32"
                    />
                    <select
                        value={targetSortOption}
                        onChange={(e) => setTargetSortOption(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0 cursor-pointer"
                    >
                        <option value="default">기본 순</option>
                        <option value="isCustom">커스텀 순</option>
                        <option value="name">이름 순</option>
                        <option value="level">레벨 순</option>
                        <option value="cp">전투력 순</option>
                        <option value="pureCp">순수 전투력 순</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {filteredAndSortedTargets.map(t => {
                    const totalCP = getCompanionCP(t.entity);
                    const pureCP = getCompanionPureCP(t.entity);
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTargetId(t.id)}
                            className={`flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl border transition-all text-left ${targetId === t.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0 ${targetId === t.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                {t.id === 'player' ? <User size={14}/> : <Users size={14}/>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 min-w-0">
                                    <span className="text-xs font-bold truncate block">{t.name}</span>
                                    {t.isCustom && t.id !== 'player' && (
                                        <span className="text-[8px] bg-indigo-950 text-indigo-400 px-1 rounded font-bold shrink-0">커스텀</span>
                                    )}
                                </div>
                                <div className="text-[10px] opacity-80 flex items-center gap-1 flex-wrap mt-0.5">
                                    <span className="font-semibold text-slate-300">Lv.{t.level}</span>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-amber-400 font-bold">전투력 {totalCP.toLocaleString()}</span>
                                    <span className="text-emerald-400 font-bold">(순수 {pureCP.toLocaleString()})</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
                {filteredAndSortedTargets.length === 0 && (
                    <div className="col-span-full py-6 text-center bg-slate-900/30 rounded-xl border border-slate-800/60 text-[11px] text-slate-500">
                        일치하는 동료가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );

    // 선택된 대원의 전투훈련소 수련 정보 및 누적 훈련 시간 위젯
    const combatTraineeInfo = (() => {
        if (!character.base?.combatTraining) return null;
        for (const ct of Object.values(character.base.combatTraining)) {
            const found = (ct.trainees || []).find(t => t.companionId === targetId);
            if (found) return found;
        }
        return null;
    })();

    const renderCombatTrainingNotice = () => {
        if (!combatTraineeInfo) return null;
        const accMins = combatTraineeInfo.accumulatedMinutes || 0;
        const hours = Math.floor(accMins / 60);
        const mins = accMins % 60;
        const timeProgressPct = Math.min(100, Math.round((accMins / 720) * 100));

        return (
            <div className="mb-4 bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-400 shrink-0" />
                        <span>전투훈련소 주간 수련 중 ({combatTraineeInfo.targetStat})</span>
                    </span>
                    <span className="font-bold text-amber-300 font-mono text-[11px]">
                        {hours}시간 {mins}분 / 12시간 ({timeProgressPct}%)
                    </span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                        style={{ width: `${timeProgressPct}%` }}
                    />
                </div>
                <div className="text-[10px] text-slate-400">
                    * 주간 시간(06:00 ~ 22:00) 동안 훈련 시간이 누적되며, 12시간 도달 시 능력치가 자동 상승하고 서신이 발송됩니다.
                </div>
            </div>
        );
    };

    const renderAmountSelector = (remaining: number) => {
        const currentLimitInfo = activeTab === 'exp' ? expLimitInfo : activeTab === 'stat' ? statLimitInfo : masteryLimitInfo;
        const currentTotalLimit = currentLimitInfo.totalLimit;

        return (
            <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <span className="text-xs font-bold text-slate-300">훈련 횟수 설정</span>
                    <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] text-slate-400">
                            남은 횟수: <span className="text-indigo-400 font-bold">{remaining}</span> / {currentTotalLimit}회
                        </span>
                        <span className="text-[9px] text-slate-500">
                            (훈련소 {currentLimitInfo.facilityCount}개 +{currentLimitInfo.facilityBonus}회 · 배치 트레이너 {currentLimitInfo.trainerCount}명 +{currentLimitInfo.trainerBonus}회)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setTrainingAmount(Math.max(1, trainingAmount - 1))}
                        className="w-11 h-11 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-all"
                    >-</button>
                    <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg text-center py-2">
                        <span className="text-xl font-bold font-mono text-indigo-400">{trainingAmount}</span>
                        <span className="text-xs text-slate-500 ml-1">회</span>
                    </div>
                    <button 
                        onClick={() => setTrainingAmount(Math.max(1, Math.min(remaining, trainingAmount + 1)))}
                        className="w-11 h-11 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-all"
                    >+</button>
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto">
                    {Array.from(new Set([1, 5, 10, remaining])).filter(v => v > 0 && v <= remaining).sort((a, b) => a - b).map(v => (
                        <button 
                            key={v}
                            onClick={() => setTrainingAmount(v)}
                            className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${trainingAmount === v ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                        >
                            {v === remaining ? '최대' : `${v}회`}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderRatesWidget = (rates: TrainingRates, theme: 'indigo' | 'amber' | 'red') => {
        const borderColor = theme === 'indigo' ? 'border-indigo-500/30' : theme === 'amber' ? 'border-amber-500/30' : 'border-red-500/30';
        
        return (
            <div className={`mb-4 bg-slate-900/90 border ${borderColor} rounded-2xl p-3.5 space-y-2.5`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <GraduationCap size={15} className="text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">담당 트레이너</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                        {rates.trainerLabel}{rates.trainerName !== '미배치' ? ` (${rates.trainerName})` : ''}
                    </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                    <div className="bg-slate-950/80 rounded-xl p-2 text-center border border-slate-800/80">
                        <div className="text-[10px] text-emerald-400 font-bold mb-0.5">대성공</div>
                        <div className="text-xs font-black text-white">{Math.round(rates.greatSuccessRate * 100)}%</div>
                    </div>
                    <div className="bg-slate-950/80 rounded-xl p-2 text-center border border-slate-800/80">
                        <div className="text-[10px] text-blue-400 font-bold mb-0.5">성공</div>
                        <div className="text-xs font-black text-white">{Math.round(rates.successRate * 100)}%</div>
                    </div>
                    <div className="bg-slate-950/80 rounded-xl p-2 text-center border border-slate-800/80">
                        <div className="text-[10px] text-red-400 font-bold mb-0.5">실패</div>
                        <div className="text-xs font-black text-white">{Math.round(rates.failRate * 100)}%</div>
                    </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-snug">
                    {rates.failRate === 0 ? (
                        <span className="text-emerald-400 font-bold">최고 등급 트레이너의 지도로 실패 확률이 0%입니다.</span>
                    ) : (
                        <span>트레이너의 등급이 높아질수록 실패 확률이 낮아집니다. (1회당 개별 판정)</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-950 w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-950 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                            <Star size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">기지 수련관 & 트레이너 센터</h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">기지 시설과 전담 트레이너를 통해 능력을 향상시킵니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/30 overflow-x-auto custom-scrollbar shrink-0 whitespace-nowrap">
                    <button 
                        disabled={!hasExpFacility}
                        onClick={() => { setActiveTab('exp'); setTrainingAmount(1); }}
                        className={`flex-1 min-w-[90px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 min-h-[44px] ${!hasExpFacility ? 'opacity-30 cursor-not-allowed' : activeTab === 'exp' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        <ArrowUpCircle size={15} /> 경험치 {!hasExpFacility && <Lock size={11}/>}
                        {expMult > 1 && <span className="text-[9px] bg-indigo-900 text-indigo-300 px-1 rounded">2x</span>}
                    </button>
                    <button 
                        disabled={!hasStatFacility}
                        onClick={() => { setActiveTab('stat'); setTrainingAmount(1); }}
                        className={`flex-1 min-w-[90px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 min-h-[44px] ${!hasStatFacility ? 'opacity-30 cursor-not-allowed' : activeTab === 'stat' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        <Activity size={15} /> 스탯 {!hasStatFacility && <Lock size={11}/>}
                        {statMult > 1 && <span className="text-[9px] bg-amber-900 text-amber-300 px-1 rounded">2x</span>}
                    </button>
                    <button 
                        disabled={!hasMasteryFacility}
                        onClick={() => { setActiveTab('mastery'); setTrainingAmount(1); }}
                        className={`flex-1 min-w-[90px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 min-h-[44px] ${!hasMasteryFacility ? 'opacity-30 cursor-not-allowed' : activeTab === 'mastery' ? 'border-red-500 text-red-400 bg-red-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        <Sword size={15} /> 무기 숙련도 {!hasMasteryFacility && <Lock size={11}/>}
                        {masteryMult > 1 && <span className="text-[9px] bg-red-900 text-red-300 px-1 rounded">2x</span>}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('trainer'); }}
                        className={`flex-1 min-w-[110px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 min-h-[44px] ${activeTab === 'trainer' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-emerald-300'}`}
                    >
                        <GraduationCap size={16} /> 트레이너 관리
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    {activeTab === 'exp' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {expMult > 1 && (
                                <div className="mb-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300 font-bold">
                                    <Sparkles size={16} className="text-emerald-400 shrink-0" />
                                    <span>경험치 트레이너 효과 발동 중: 경험치 획득량 {expMult}배 (인원 보너스 적용)</span>
                                </div>
                            )}

                            {!hasExpFacility ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-400 mb-2">경험 훈련장 미건설</h3>
                                    <p className="text-xs text-slate-500 max-w-xs">
                                        경험 훈련장을 건설해야 이 기능을 이용할 수 있습니다.<br/>
                                        기지 관리 메뉴에서 시설을 건설해 주세요.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {isLateNight && (
                                        <div className="mb-4 bg-indigo-950/80 border border-indigo-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-indigo-300 font-bold shadow-md">
                                            <span className="text-base shrink-0">🌙</span>
                                            <span>현재는 심야 시간대({timeStr})입니다. 동료들의 휴식과 취침을 위해 동료 훈련은 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</span>
                                        </div>
                                    )}

                                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6 mb-6 text-center">
                                        <ArrowUpCircle size={48} className="text-indigo-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-white mb-2">경험 훈련장</h3>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                                            선택한 거주민 1명이 집중 훈련하여 경험치를 획득합니다.<br/>
                                            배치된 트레이너 등급에 따라 일일 훈련 횟수가 결정됩니다.
                                        </p>
                                    </div>
                                    
                                    {renderTargetSelector()}
                                    {renderCombatTrainingNotice()}

                                    {renderAmountSelector(expRemaining)}

                                    {renderRatesWidget(expRates, 'indigo')}

                                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>훈련 대상</span>
                                            <span className="text-slate-200 font-bold">{currentTarget.name} (Lv.{currentTarget.level})</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>전투력</span>
                                            <span className="font-mono text-xs font-bold">
                                                <span className="text-amber-400">종합 {getCompanionCP(currentTarget.entity).toLocaleString()}</span>
                                                <span className="text-slate-500 mx-1">/</span>
                                                <span className="text-emerald-400">순수 {getCompanionPureCP(currentTarget.entity).toLocaleString()}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>소모 골드</span>
                                            <span className="text-amber-500 font-bold">{(Math.max(1000, 10000 - calculateTotalTrainingLevel(character.base, 'training_exp') * 1000) * trainingAmount).toLocaleString()}G</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>소모 식량</span>
                                            <span className="text-red-400 font-bold">{1 * trainingAmount}개</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>예상 획득 경험치</span>
                                            <span className="text-indigo-400 font-bold">
                                                약 {Math.round(((character.level * 10 + 200 + calculateTotalTrainingLevel(character.base, 'training_exp') * 500) * expMult) * trainingAmount)} EXP
                                                {expMult > 1 && <span className="ml-1 text-[10px] text-emerald-400 font-bold">({expMult}배 적용)</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onExpTraining(trainingAmount, targetId)}
                                        disabled={expRemaining <= 0 || trainingAmount <= 0 || isCompanionTrainingBlocked}
                                        className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] ${expRemaining > 0 && !isCompanionTrainingBlocked ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.01] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        <ArrowUpCircle size={18} /> {isCompanionTrainingBlocked ? '심야 시간 동료 훈련 불가' : '경험치 훈련 시작'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'stat' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {statMult > 1 && (
                                <div className="mb-4 bg-amber-950/60 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-300 font-bold">
                                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                                    <span>스탯 트레이너 효과 발동 중: 스탯 획득량 {statMult}배 (인원 보너스 적용)</span>
                                </div>
                            )}

                            {isLateNight && (
                                <div className="mb-4 bg-amber-950/80 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-300 font-bold shadow-md">
                                    <span className="text-base shrink-0">🌙</span>
                                    <span>현재는 심야 시간대({timeStr})입니다. 동료들의 휴식과 취침을 위해 동료 훈련은 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</span>
                                </div>
                            )}

                            {!hasStatFacility ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-400 mb-2">스탯 훈련장 미건설</h3>
                                    <p className="text-xs text-slate-500 max-w-xs">
                                        스탯 훈련장을 건설해야 이 기능을 이용할 수 있습니다.<br/>
                                        기지 관리 메뉴에서 시설을 건설해 주세요.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {renderTargetSelector()}
                                    {renderCombatTrainingNotice()}
                                    
                                    <div className="mb-6">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">훈련 스탯 선택</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { key: 'str', label: 'STR', icon: <Flame size={14}/>, color: 'text-red-400' },
                                                { key: 'int', label: 'INT', icon: <Brain size={14}/>, color: 'text-blue-400' },
                                                { key: 'def', label: 'DEF', icon: <Shield size={14}/>, color: 'text-slate-400' },
                                                { key: 'agi', label: 'AGI', icon: <Wind size={14}/>, color: 'text-green-400' },
                                                { key: 'wis', label: 'WIS', icon: <Heart size={14}/>, color: 'text-pink-400' },
                                                { key: 'ctrl', label: 'CTRL', icon: <Energy size={14}/>, color: 'text-amber-400' },
                                                { key: 'maxHp', label: 'HP', icon: <Heart size={14}/>, color: 'text-red-500' },
                                                { key: 'maxMp', label: 'MP', icon: <Energy size={14}/>, color: 'text-blue-500' }
                                            ].map(stat => (
                                                <button
                                                    key={stat.key}
                                                    onClick={() => setSelectedStat(stat.key)}
                                                    className={`flex flex-col items-center justify-center p-3 min-h-[44px] rounded-xl border transition-all ${selectedStat === stat.key ? 'bg-amber-600/20 border-amber-500 text-amber-100' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                                >
                                                    <div className={`${stat.color} mb-1`}>{stat.icon}</div>
                                                    <span className="text-xs font-bold">{stat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {renderAmountSelector(statRemaining)}

                                    {renderRatesWidget(statRates, 'amber')}

                                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>훈련 대상</span>
                                            <span className="text-slate-200 font-bold">{currentTarget.name} (Lv.{currentTarget.level})</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>전투력</span>
                                            <span className="font-mono text-xs font-bold">
                                                <span className="text-amber-400">종합 {getCompanionCP(currentTarget.entity).toLocaleString()}</span>
                                                <span className="text-slate-500 mx-1">/</span>
                                                <span className="text-emerald-400">순수 {getCompanionPureCP(currentTarget.entity).toLocaleString()}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>소모 골드</span>
                                            <span className="text-amber-500 font-bold">{(Math.max(1000, 50000 - calculateTotalTrainingLevel(character.base, 'training_stat') * 5000) * trainingAmount).toLocaleString()}G</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>상승 수치</span>
                                            <span className="text-amber-400 font-bold">
                                                {(selectedStat === 'maxHp' || selectedStat === 'maxMp') ? `+${Math.round(10 * statMult * trainingAmount)}` : `+${Math.round(1 * statMult * trainingAmount)}`}
                                                {statMult > 1 && <span className="ml-1 text-[10px] text-emerald-400 font-bold">({statMult}배 적용)</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onStatTraining(selectedStat, targetId, trainingAmount)}
                                        disabled={statRemaining <= 0 || trainingAmount <= 0 || isCompanionTrainingBlocked}
                                        className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] ${statRemaining > 0 && !isCompanionTrainingBlocked ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.01] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        <Activity size={18} /> {isCompanionTrainingBlocked ? '심야 시간 동료 훈련 불가' : '스탯 훈련 시작'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'mastery' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {masteryMult > 1 && (
                                <div className="mb-4 bg-red-950/60 border border-red-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-300 font-bold">
                                    <Sparkles size={16} className="text-red-400 shrink-0" />
                                    <span>무기숙련도 트레이너 효과 발동 중: 숙련도 획득량 {masteryMult}배 (인원 보너스 적용)</span>
                                </div>
                            )}

                            {isLateNight && (
                                <div className="mb-4 bg-red-950/80 border border-red-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-300 font-bold shadow-md">
                                    <span className="text-base shrink-0">🌙</span>
                                    <span>현재는 심야 시간대({timeStr})입니다. 동료들의 휴식과 취침을 위해 동료 훈련은 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</span>
                                </div>
                            )}

                            {!hasMasteryFacility ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-400 mb-2">무기 숙련도 훈련장 미건설</h3>
                                    <p className="text-xs text-slate-500 max-w-xs">
                                        무기 숙련도 훈련장을 건설해야 이 기능을 이용할 수 있습니다.<br/>
                                        기지 관리 메뉴에서 시설을 건설해 주세요.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {renderTargetSelector()}
                                    {renderCombatTrainingNotice()}

                                    <div className="mb-4">
                                        <PromotionMasteryProgressBar target={currentTarget.entity} compact />
                                    </div>

                                    <div className="mb-6">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">무기 타입 선택</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                            {WEAPON_TYPES.map(w => (
                                                <button
                                                    key={w}
                                                    onClick={() => setSelectedWeapon(w)}
                                                    className={`p-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${selectedWeapon === w ? 'bg-red-600/20 border-red-500 text-red-100' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                                >
                                                    {w}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {renderAmountSelector(masteryRemaining)}

                                    {renderRatesWidget(masteryRates, 'red')}

                                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>훈련 대상</span>
                                            <span className="text-slate-200 font-bold">{currentTarget.name} (Lv.{currentTarget.level})</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>전투력</span>
                                            <span className="font-mono text-xs font-bold">
                                                <span className="text-amber-400">종합 {getCompanionCP(currentTarget.entity).toLocaleString()}</span>
                                                <span className="text-slate-500 mx-1">/</span>
                                                <span className="text-emerald-400">순수 {getCompanionPureCP(currentTarget.entity).toLocaleString()}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>소모 골드</span>
                                            <span className="text-amber-500 font-bold">{(Math.max(1000, 10000 - calculateTotalTrainingLevel(character.base, 'training_mastery') * 1000) * trainingAmount).toLocaleString()}G</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>소모 식량 / 철광석</span>
                                            <span className="text-red-400 font-bold">{trainingAmount}개 / {trainingAmount}개</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>기대 숙련도</span>
                                            <span className="text-red-400 font-bold">
                                                상승 확률 존재 {masteryMult > 1 && `(획득량 ${masteryMult}배 적용)`}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onWeaponTraining(selectedWeapon, targetId, trainingAmount)}
                                        disabled={masteryRemaining <= 0 || trainingAmount <= 0 || isCompanionTrainingBlocked}
                                        className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] ${masteryRemaining > 0 && !isCompanionTrainingBlocked ? 'bg-red-600 hover:bg-red-500 text-white hover:scale-[1.01] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        <Sword size={18} /> {isCompanionTrainingBlocked ? '심야 시간 동료 훈련 불가' : '무기 숙련도 훈련 시작'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* TRAINER MANAGEMENT TAB */}
                    {activeTab === 'trainer' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            {/* Top Summary Banner */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-inner">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                        <GraduationCap size={18} />
                                        <span>분과별 트레이너 효과 현황</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">훈련소 담당 배치 시 발동 (숙련 이상)</span>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {[
                                        { label: '경험치', branch: TrainerBranch.EXP, mult: expMult, active: expMult > 1, color: 'text-indigo-400 border-indigo-500/30' },
                                        { label: '스탯', branch: TrainerBranch.STAT, mult: statMult, active: statMult > 1, color: 'text-amber-400 border-amber-500/30' },
                                        { label: '무기숙련도', branch: TrainerBranch.WEAPON_MASTERY, mult: masteryMult, active: masteryMult > 1, color: 'text-red-400 border-red-500/30' },
                                        { label: '전술', branch: TrainerBranch.TACTICAL, mult: tacticalMult, active: tacticalMult > 1, color: 'text-blue-400 border-blue-500/30' },
                                        { label: '전투스타일', branch: TrainerBranch.COMBAT_STYLE, mult: styleMult, active: styleMult > 1, color: 'text-purple-400 border-purple-500/30' }
                                    ].map(b => (
                                        <div 
                                            key={b.branch} 
                                            className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                                                b.active ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300' : 'bg-slate-950 border-slate-800/80 text-slate-500'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold mb-1">{b.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                                b.active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                                            }`}>
                                                {b.active ? `${b.mult}배 활성` : '미적용'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                                    💡 <b>일일 훈련 횟수 공식</b>: 각 훈련소 시설 개수(1개당 +1회) + 해당 훈련소에 직접 배치된 트레이너 등급 가산치 합산 (배치 트레이너 최대 10명분 누적, 일일 최대 1,000회)<br/>
                                    • 트레이너 등급 가산치: 견습(+1) ➔ 초급(+5) ➔ 중급(+10) ➔ 고급(+15) ➔ 숙련(+25) ➔ 전문(+50) ➔ 마스터(+75) ➔ 레전드(+100회)
                                </p>
                            </div>

                            {/* Active Trainers List */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Award size={14} className="text-emerald-400" />
                                    <span>현재 배치/보유 트레이너 목록 ({trainers.length}명 / 최대 10명분 누적)</span>
                                </h3>

                                {trainers.length === 0 ? (
                                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
                                        <Users size={32} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-400 font-bold">임명된 트레이너가 없습니다.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">아래 [트레이너 신규 임명] 메뉴에서 무직 동료에게 트레이너 직업을 부여하세요.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {trainers.map(t => {
                                            const currentRank = t.trainerRank || TrainerRank.APPRENTICE;
                                            const rankCfg = TRAINER_RANK_CONFIG[currentRank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
                                            const currentLevel = t.trainerLevel || rankCfg.reqLevel || 1;
                                            const currentExp = t.trainerExp || 0;
                                            const reqExp = getTrainerRequiredExp(currentLevel);

                                            const ranks = Object.values(TrainerRank);
                                            const currentIndex = ranks.indexOf(currentRank);
                                            const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
                                            const nextRankCfg = nextRank ? TRAINER_RANK_CONFIG[nextRank] : null;

                                            const branchCheck = (nextRankCfg && nextRankCfg.order >= 5 && t.trainerBranch) ? checkTrainerBranchRequirement(t) : { met: true, reason: '' };
                                            const canPromote = !!nextRankCfg && currentLevel >= nextRankCfg.reqLevel && branchCheck.met;
                                            const isSkilledOrHigher = rankCfg.order >= 5;

                                            return (
                                                <div key={t.entityId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                                                                    <GraduationCap size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                                        <span>{t.name}</span>
                                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${t.isCustom ? 'bg-indigo-900/60 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                                                                            {t.isCustom ? '커스텀' : '일반'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                                                                        <span>{rankCfg.label}</span>
                                                                        <span className="bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] text-emerald-300">숙련 레벨 {currentLevel}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-slate-400 block">일일 훈련 지원</span>
                                                                <span className="text-xs font-bold font-mono text-emerald-300">+{rankCfg.dailyCount}회</span>
                                                            </div>
                                                        </div>

                                                        {/* Level and Experience Progress */}
                                                        <div className="space-y-1 my-2">
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-slate-400 font-bold">숙련도 경험치</span>
                                                                <span className="text-slate-300 font-mono">
                                                                    {currentLevel >= 100 ? '최대 레벨 달성' : `${currentExp.toLocaleString()} / ${reqExp.toLocaleString()} (${Math.floor((currentExp / reqExp) * 100)}%)`}
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                                <div 
                                                                    className="h-full bg-emerald-500 transition-all duration-300"
                                                                    style={{ width: `${currentLevel >= 100 ? 100 : Math.min(100, (currentExp / reqExp) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        {/* Promotion Requirement Status */}
                                                        <div className="mt-2.5">
                                                            {nextRankCfg ? (
                                                                canPromote ? (
                                                                    <div className="text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-lg py-1.5 px-2.5 text-center flex items-center justify-center gap-1">
                                                                        <Sparkles size={12} className="text-emerald-400 shrink-0" />
                                                                        <span>{nextRankCfg.label} 승급 가능 (요구 숙련 레벨 {nextRankCfg.reqLevel} 달성)</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg py-1.5 px-2.5 flex flex-col gap-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">다음 승급 조건:</span>
                                                                            <span className="font-semibold text-amber-400">{nextRankCfg.label} (숙련 레벨 {nextRankCfg.reqLevel} 필요)</span>
                                                                        </div>
                                                                        {!branchCheck.met && (
                                                                            <div className="text-[9px] text-rose-400 font-medium">
                                                                                분과 조건: {branchCheck.reason}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div className="text-[10px] text-emerald-400/90 bg-emerald-950/30 border border-emerald-900/40 rounded-lg py-1.5 px-2 text-center font-bold">
                                                                    최고 등급에 도달한 트레이너입니다
                                                                </div>
                                                            )}
                                                        </div>

                                                         {/* Branch selection for SKILLED or higher */}
                                                        <div className="mt-3 pt-2 border-t border-slate-800/80">
                                                            <div className="flex items-center justify-between text-[10px] mb-1.5">
                                                                <span className="text-slate-400 font-bold">담당 분과:</span>
                                                                {isSkilledOrHigher ? (
                                                                    <span className="text-amber-400 font-bold">{t.trainerBranch || (t.isCustom ? '미정 (선택 필요)' : '랜덤 배정 대기')}</span>
                                                                ) : (
                                                                    <span className="text-slate-600 font-medium">
                                                                        {!t.isCustom && t.trainerBranch ? `랜덤 부여됨: ${t.trainerBranch}` : '숙련 등급 달성 시 활성화'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {isSkilledOrHigher && (
                                                                <div>
                                                                    {t.isCustom ? (
                                                                        t.trainerBranch ? (
                                                                            <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2 text-center text-[10px]">
                                                                                <span className="text-amber-300 font-bold">담당 분과: {t.trainerBranch}</span>
                                                                                <span className="text-slate-400 block text-[9px] mt-0.5">(플레이어 결정 완료 - 변경 불가)</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <div className="text-[10px] text-indigo-300 font-bold mb-1">담당 분과 선택 (최초 1회 결정 시 변경 불가):</div>
                                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                                                                    {Object.values(TrainerBranch).map(br => (
                                                                                        <button
                                                                                            key={br}
                                                                                            onClick={() => handleChangeBranch(t.entityId, br)}
                                                                                            className="py-1.5 px-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 rounded-lg text-[9px] font-bold transition-all active:scale-95"
                                                                                        >
                                                                                            {br.replace(' 트레이너', '')}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center text-[10px]">
                                                                            <span className="text-amber-400 font-bold">담당 분과: {t.trainerBranch || '랜덤 배정 완료'}</span>
                                                                            <span className="text-slate-500 block text-[9px] mt-0.5">(랜덤 결정 - 고정됨)</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Promote Button */}
                                                    {canPromote && (
                                                        <button
                                                             onClick={() => handlePromoteTrainer(t.entityId)}
                                                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 animate-pulse active:scale-95 transition-all min-h-[44px]"
                                                        >
                                                            <Sparkles size={14} /> {nextRankCfg?.label}(으)로 승급하기
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Appoint Trainer Section */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-5">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <UserPlus size={16} className="text-indigo-400" />
                                    <span>트레이너 신규 임명 (무직 동료 전용)</span>
                                </h3>

                                <p className="text-[10px] text-slate-500 mb-3">
                                    직업이 '무직'인 동료를 트레이너로 신규 임명할 수 있습니다. (초기 견습 등급 부여)
                                </p>

                                {nonTrainers.length === 0 ? (
                                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
                                        <p className="text-xs text-slate-400 font-bold">임명 가능한 무직 동료가 없습니다.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">새로운 동료를 영입하거나 무직 상태인 동료가 있을 때 임명할 수 있습니다.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {nonTrainers.map(actor => (
                                            <button
                                                key={actor.entityId}
                                                onClick={() => handleAppointTrainer(actor.entityId)}
                                                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex items-center justify-between text-left transition-all min-h-[44px]"
                                            >
                                                <div className="min-w-0 pr-1">
                                                    <div className="text-xs font-bold text-slate-200 truncate">{actor.name}</div>
                                                    <div className="text-[9px] text-slate-500">무직 • Lv.{actor.level}</div>
                                                </div>
                                                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2.5 py-1 rounded-lg font-bold shrink-0">
                                                    임명
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center gap-2 shrink-0">
                    <Info size={14} className="text-indigo-400 shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-tight">
                        훈련소 시설 및 트레이너 배치는 거주민 전체의 육성을 지원합니다. 모바일 환경에 최적화된 레이아웃을 제공합니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default React.memo(TrainingModal);
