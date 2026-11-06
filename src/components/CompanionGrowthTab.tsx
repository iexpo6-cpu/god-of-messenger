import React, { useState } from 'react';
import { Companion, ClassTier, MonsterStage } from '../types';
import { Zap, Settings, Target, Lock, Sparkles, AlertCircle, Plus, Minus, CheckCircle, XCircle, ArrowUpRight, ShieldCheck, Dumbbell, Flame, Heart } from 'lucide-react';
import { getCompanionCP, evolveCompanionClass, isMonsterCompanion, getMonsterCompanionStage, MONSTER_EVOLUTION_CONFIG, evolveMonsterCompanion } from '../services/companionGrowthService';

interface Props {
    companion: Companion;
    onUpdateCompanion: (updated: Companion) => void;
}

export const CompanionGrowthTab: React.FC<Props> = ({ companion, onUpdateCompanion }) => {
    const isMonster = isMonsterCompanion(companion);
    const isCustom = companion.isCustom === true || (companion as any).isCustomMonster === true || isMonster;
    const [statAllocation, setStatAllocation] = useState<Record<string, number>>({
        str: 0,
        int: 0,
        agi: 0,
        def: 0,
        wis: 0,
        ctrl: 0,
        hp: 0,
        mp: 0
    });
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    if (!isCustom) {
        return (
            <div className="space-y-6 p-4">
                <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-6 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                        <Lock size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                            성장 설정 잠금 <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-normal">일반 동료</span>
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                            일반 동료는 레벨업 시 자신의 <strong>신력 계통 및 클래스</strong>에 맞추어 스킬을 <strong>자동으로 습득</strong>하고 성장합니다.
                        </p>
                    </div>

                    <div className="w-full bg-slate-900/90 rounded-xl p-4 border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2 text-amber-400 font-bold">
                            <Sparkles size={14} className="shrink-0" />
                            <span>일반 동료 성장 방식</span>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                            <li><strong>스킬 자동 습득</strong>: 특정 레벨 도달 시 신력 및 클래스에 특화된 스킬을 자율적으로 획득합니다.</li>
                            <li><strong>자유로운 커스텀 희망 시</strong>: 연금술실험소의 <strong>[커스텀 전환]</strong> 탭을 통해 커스텀 동료로 승격하면 스탯 분배 및 성장 설정을 직접 관리할 수 있습니다.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    const growthSettings = companion.growthSettings || {
        statAutoMode: 'manual',
        classAutoMode: 'manual',
        skillAutoMode: 'manual',
        statDistribution: { hp: 1, mp: 1, str: 2, int: 2, agi: 2, def: 1, wis: 1, ctrl: 0 },
        preferredSkillType: 'physical'
    };

    const updateSettings = (newSettings: any) => {
        onUpdateCompanion({ 
            ...companion, 
            growthSettings: { 
                ...growthSettings, 
                ...newSettings 
            } 
        });
    };

    const currentStats = companion.stats || {
        str: 10, int: 10, agi: 10, def: 10, wis: 10, ctrl: 10,
        hp: 100, maxHp: 100, mp: 50, maxMp: 50
    };

    const statLabels: Record<string, { label: string; desc: string; color: string }> = {
        str: { label: '근력', desc: '물리 공격력 및 소지 중량 증가', color: 'text-red-400' },
        int: { label: '지력', desc: '마력 공격력 및 주문 위력 증가', color: 'text-blue-400' },
        agi: { label: '민첩', desc: '공격 속도, 회피율, 민첩 수치 증가', color: 'text-emerald-400' },
        def: { label: '방어력', desc: '물리/마법 피해 감소율 증가', color: 'text-amber-400' },
        wis: { label: '지혜', desc: '마법 방어력 및 치유 효과 증가', color: 'text-purple-400' },
        ctrl: { label: '제어력', desc: '상태이상 저항 및 제어 정확도 증가', color: 'text-cyan-400' },
        hp: { label: '최대 체력', desc: '생명력 최대치 10 증가', color: 'text-rose-400' },
        mp: { label: '최대 마력', desc: '마력 최대치 10 증가', color: 'text-indigo-400' }
    };

    const distributionSum = Object.values(growthSettings.statDistribution || {}).reduce((a, b) => a + b, 0);

    // 스탯 직접 투입/일괄 투입 함수
    const handleApplyManualStats = () => {
        const totalPointsToSpend = Object.values(statAllocation).reduce((a, b) => a + b, 0);
        if (totalPointsToSpend <= 0) {
            setActionMessage('분배할 포인트를 1 이상 설정해주세요.');
            return;
        }
        if (totalPointsToSpend > companion.statPoints) {
            setActionMessage('보유한 남은 스탯 포인트보다 많은 포인트를 투입할 수 없습니다.');
            return;
        }

        const newStats = { ...currentStats };
        Object.entries(statAllocation).forEach(([key, points]) => {
            if (points > 0) {
                if (key === 'hp') {
                    newStats.maxHp = (newStats.maxHp || 100) + points * 10;
                    newStats.hp = (newStats.hp || 100) + points * 10;
                } else if (key === 'mp') {
                    newStats.maxMp = (newStats.maxMp || 50) + points * 10;
                    newStats.mp = (newStats.mp || 50) + points * 10;
                } else {
                    (newStats as any)[key] = ((newStats as any)[key] || 0) + points;
                }
            }
        });

        const updatedCompanion: Companion = {
            ...companion,
            stats: newStats,
            statPoints: companion.statPoints - totalPointsToSpend
        };

        onUpdateCompanion(updatedCompanion);
        setStatAllocation({ str: 0, int: 0, agi: 0, def: 0, wis: 0, ctrl: 0, hp: 0, mp: 0 });
        setActionMessage(`스탯 포인트 ${totalPointsToSpend}포인트가 성공적으로 분배되었습니다!`);
    };

    // 설정된 비율로 자동 스탯 일괄 투자
    const handleApplyAutoDistributionOnce = () => {
        if (companion.statPoints <= 0) {
            setActionMessage('분배 가능한 남은 스탯 포인트가 없습니다.');
            return;
        }
        if (distributionSum <= 0) {
            setActionMessage('스탯 자동 분배 비중 합계가 0입니다. 비중을 정해주세요.');
            return;
        }

        const pointsToSpend = companion.statPoints;
        const distObj = growthSettings.statDistribution || {};
        const newStats = { ...currentStats };

        Object.entries(distObj).forEach(([stat, weight]) => {
            const weightNum = Number(weight) || 0;
            const amount = Math.floor((weightNum * pointsToSpend) / distributionSum);
            if (amount > 0) {
                if (stat === 'hp') {
                    newStats.maxHp = (newStats.maxHp || 100) + amount * 10;
                    newStats.hp = (newStats.hp || 100) + amount * 10;
                } else if (stat === 'mp') {
                    newStats.maxMp = (newStats.maxMp || 50) + amount * 10;
                    newStats.mp = (newStats.mp || 50) + amount * 10;
                } else if ((newStats as any)[stat] !== undefined) {
                    (newStats as any)[stat] += amount;
                }
            }
        });

        // 잔여 포인트는 가장 비중 높은 스탯에 배치
        let spent = 0;
        for (const w of Object.values(distObj)) {
            spent += Math.floor(((Number(w) || 0) * pointsToSpend) / distributionSum);
        }
        let remainder = pointsToSpend - spent;
        if (remainder > 0) {
            newStats.str = (newStats.str || 0) + remainder;
        }

        const updatedCompanion: Companion = {
            ...companion,
            stats: newStats,
            statPoints: 0
        };

        onUpdateCompanion(updatedCompanion);
        setActionMessage(`남은 ${pointsToSpend} 스탯 포인트가 비중에 따라 일괄 분배되었습니다.`);
    };

    const cp = getCompanionCP(companion);

    // ==========================================
    // 몬스터 진화 vs 휴머노이드 클래스 해방 분기
    // ==========================================
    const currentMonsterStage = getMonsterCompanionStage(companion);
    const monsterEvoConfig = MONSTER_EVOLUTION_CONFIG[currentMonsterStage];
    const targetMonsterStage = monsterEvoConfig?.next || null;

    const isMonsterLevelMet = monsterEvoConfig ? companion.level >= monsterEvoConfig.reqLevel : false;
    const isMonsterAffectionMet = monsterEvoConfig ? (companion.affection ?? 50) >= monsterEvoConfig.reqAffection : false;
    const isMonsterCpMet = monsterEvoConfig ? cp >= monsterEvoConfig.reqCp : false;
    const isMonsterAllConditionsMet = Boolean(targetMonsterStage && isMonsterLevelMet && isMonsterAffectionMet && isMonsterCpMet);

    const handleAttemptMonsterEvolution = () => {
        if (!targetMonsterStage || !monsterEvoConfig) {
            setActionMessage('이미 최고 진화 단계인 [초궁극체]에 도달했습니다.');
            return;
        }
        if (!isMonsterAllConditionsMet) {
            setActionMessage(`진화 조건이 충족되지 않았습니다. (레벨 ${monsterEvoConfig.reqLevel}, 친밀도 ${monsterEvoConfig.reqAffection}, 전투력 ${monsterEvoConfig.reqCp.toLocaleString()} 필요)`);
            return;
        }

        const evoResult = evolveMonsterCompanion(companion);
        if (evoResult.evolved) {
            onUpdateCompanion(evoResult.updated);
            setActionMessage(`축하합니다! ${companion.name}이(가) 힘을 완전히 각성하여 [${evoResult.newStage}] 단계로 진화했습니다!`);
        } else {
            setActionMessage('진화 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    // 클래스 해방 조건 체크 로직
    const currentTier = companion.classTier || ClassTier.NONE;

    const potentialRankMap: Partial<Record<ClassTier, number>> = {
        [ClassTier.NONE]: 0,
        [ClassTier.FIRST]: 1,
        [ClassTier.SECOND]: 2,
        [ClassTier.LAST]: 3,
        [ClassTier.FINAL]: 4
    };

    const companionPotential = companion.liberationPotential || ClassTier.NONE;
    const companionPotRank = potentialRankMap[companionPotential] || 0;

    let nextTierName = '';
    let targetTier: ClassTier | null = null;
    let reqLevel = 0;
    let reqCp = 0;
    let trialCleared = false;
    let trialName = '';
    let reqPotentialRank = 0;
    let reqPotentialName = '';

    if (currentTier === ClassTier.NONE) {
        targetTier = ClassTier.FIRST;
        nextTierName = '퍼스트 클래스';
        reqLevel = 30;
        reqCp = 8000;
        trialCleared = Boolean(companion.hasClearedFirstTrial || companion.firstTrialCleared);
        trialName = '제1 시련 통과';
        reqPotentialRank = 1;
        reqPotentialName = '퍼스트 클래스';
    } else if (currentTier === ClassTier.FIRST) {
        targetTier = ClassTier.SECOND;
        nextTierName = '세컨드 클래스';
        reqLevel = 100;
        reqCp = 30000;
        trialCleared = Boolean(companion.hasClearedSecondTrial || companion.secondTrialCleared);
        trialName = '제2 시련 통과';
        reqPotentialRank = 2;
        reqPotentialName = '세컨드 클래스';
    } else if (currentTier === ClassTier.SECOND) {
        targetTier = ClassTier.LAST;
        nextTierName = '라스트 클래스';
        reqLevel = 300;
        reqCp = 100000;
        trialCleared = Boolean(companion.hasClearedLastTrial || companion.lastTrialCleared);
        trialName = '제3 시련 통과';
        reqPotentialRank = 3;
        reqPotentialName = '라스트 클래스';
    } else if (currentTier === ClassTier.LAST) {
        targetTier = ClassTier.FINAL;
        nextTierName = '파이널 클래스';
        reqLevel = 1000;
        reqCp = 1000000;
        trialCleared = Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared);
        trialName = '최종 시련 통과';
        reqPotentialRank = 4;
        reqPotentialName = '파이널 클래스';
    }

    const isLevelMet = companion.level >= reqLevel;
    const isCpMet = cp >= reqCp;
    const isTrialMet = trialCleared;
    const isPotentialMet = companionPotRank >= reqPotentialRank;
    const isAllConditionsMet = targetTier !== null && isLevelMet && isCpMet && isTrialMet && isPotentialMet;

    // 자동 클래스 해방 시도 함수
    const handleAttemptClassLiberation = () => {
        if (!targetTier) {
            setActionMessage('이미 최고 단계인 파이널 클래스에 도달했습니다.');
            return;
        }
        if (!isAllConditionsMet) {
            setActionMessage(`해방 조건이 충족되지 않았습니다. (레벨 ${reqLevel}, 전투력 ${reqCp.toLocaleString()}, ${trialName}, ${reqPotentialName} 잠재력 필요)`);
            return;
        }

        // 확률적 각성 계산 (기본 확률 + CP 보너스)
        const baseChance = targetTier === ClassTier.FIRST ? 0.8 : targetTier === ClassTier.SECOND ? 0.5 : targetTier === ClassTier.LAST ? 0.3 : 0.1;
        const cpBonusMultiplier = 1.0 + Math.min(1.5, cp / reqCp);
        const finalChance = Math.min(1.0, baseChance * cpBonusMultiplier);

        if (Math.random() <= finalChance) {
            const evolveResult = evolveCompanionClass(companion, targetTier);
            if (evolveResult.evolved) {
                onUpdateCompanion(evolveResult.updated);
                setActionMessage(`축하합니다! ${companion.name}님이 수련 끝에 조건과 시련을 극복하고 ${nextTierName} 각성에 성공했습니다!`);
            } else {
                setActionMessage(`각성 시도에 실패했습니다. (성공 확률: ${(finalChance * 100).toFixed(1)}%) 다음 기회에 다시 시도해보세요.`);
            }
        } else {
            setActionMessage(`각성에 실패했습니다. (각성 성공 확률: ${(finalChance * 100).toFixed(1)}%) 잠시 후 다시 시도하세요.`);
        }
    };

    return (
        <div className="space-y-6 p-2 md:p-4 text-xs">
            {/* 알림 메시지 */}
            {actionMessage && (
                <div className="p-3 bg-indigo-950/90 border border-indigo-500/80 rounded-xl text-indigo-200 flex justify-between items-center animate-in fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" /> {actionMessage}
                    </span>
                    <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-900 rounded">닫기</button>
                </div>
            )}

            {/* 자동 성장 스위치 카드 */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-purple-900/40 space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" /> {isMonster ? '마물 동료 자동 성장 모드 설정' : '커스텀 동료 자동 성장 모드 설정'}
                    </h3>
                    <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">
                        {isMonster ? '마물 성장 관리' : '커스텀 관리'}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                        { key: 'statAutoMode', title: '스탯 자동 분배', desc: '레벨업 시 비중에 따라 스탯 자동 분배' },
                        { 
                            key: 'classAutoMode', 
                            title: isMonster ? '진화 자동 진행' : '클래스 자동 해방', 
                            desc: isMonster ? '조건 충족 시 다음 단계로 자동 진화 진행' : '조건 충족 시 확률 기반 자동 각성 시도' 
                        },
                        { 
                            key: 'skillAutoMode', 
                            title: isMonster ? '마물 스킬 자동 습득' : '스킬 자동 획득', 
                            desc: isMonster ? '진화 단계에 맞추어 마물 전용 비기 자동 습득' : '선호 스킬 유형에 맞춰 자동 습득' 
                        }
                    ].map((mode) => {
                        const isAuto = growthSettings[mode.key as keyof typeof growthSettings] === 'auto';
                        return (
                            <div key={mode.key} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-2">
                                <div>
                                    <span className="font-bold text-slate-200 block text-xs">{mode.title}</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">{mode.desc}</span>
                                </div>
                                <button
                                    onClick={() => updateSettings({ [mode.key]: isAuto ? 'manual' : 'auto' })}
                                    className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                                        isAuto 
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-950 border border-purple-400' 
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                                    }`}
                                >
                                    {isAuto ? <CheckCircle size={14} /> : null}
                                    {isAuto ? '자동 모드 작동 중' : '수동 모드'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 스탯 포인트 분배 및 비중 설정 구역 */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-800">
                    <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <Dumbbell size={16} className="text-amber-400" /> 스탯 분배 및 자동 분배 비중 설정
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            보유 스탯 포인트를 원하는 스탯에 투자하거나, 레벨업 시 자동 분배될 비율을 설정합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="bg-amber-950/80 border border-amber-600/50 text-amber-300 font-black px-3 py-1 rounded-xl text-xs flex items-center gap-1">
                            보유 스탯 포인트: {companion.statPoints} P
                        </span>
                        {companion.statPoints > 0 && (
                            <button
                                onClick={handleApplyAutoDistributionOnce}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded-xl text-xs transition-all shadow-md active:scale-95"
                            >
                                비중 비율 일괄 투자
                            </button>
                        )}
                    </div>
                </div>

                {/* 1. 자동 분배 비중 설정 (10포인트당 비중) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">자동 분배 비율 설정 (총 비중 합계)</span>
                        <span className="font-mono text-slate-400">비중 합계: <strong className="text-amber-400">{distributionSum}</strong> / 10</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {Object.entries(statLabels).map(([key, info]) => {
                            const weight = (growthSettings.statDistribution as any)?.[key] || 0;
                            const manualAlloc = statAllocation[key] || 0;
                            const statValue = (currentStats as any)[key] || (key === 'hp' ? currentStats.maxHp : key === 'mp' ? currentStats.maxMp : 0);

                            return (
                                <div key={key} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-2 hover:border-slate-700 transition-all">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-bold text-xs ${info.color}`}>{info.label}</span>
                                            <span className="font-mono text-slate-300 font-bold text-xs">{statValue}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight min-h-[24px]">{info.desc}</p>
                                    </div>

                                    {/* 비중 조절 스태퍼 */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                            <span>자동 비중</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        const currentDist = { ...(growthSettings.statDistribution || {}) };
                                                        const newDist = { ...currentDist, [key]: Math.max(0, (currentDist[key] || 0) - 1) };
                                                        updateSettings({ statDistribution: newDist });
                                                    }}
                                                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center justify-center font-bold"
                                                >
                                                    <Minus size={10} />
                                                </button>
                                                <span className="w-5 text-center font-mono font-bold text-amber-400 text-xs">{weight}</span>
                                                <button
                                                    onClick={() => {
                                                        const currentDist = { ...(growthSettings.statDistribution || {}) };
                                                        const newDist = { ...currentDist, [key]: (currentDist[key] || 0) + 1 };
                                                        const newSum = Object.values(newDist).reduce((a, b) => a + b, 0);
                                                        if (newSum <= 10) {
                                                            updateSettings({ statDistribution: newDist });
                                                        }
                                                    }}
                                                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center justify-center font-bold"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 직접 투입 포인트 설정 */}
                                        {companion.statPoints > 0 && (
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                                <span>투입 스탯</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setStatAllocation(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                                                        className="w-5 h-5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 rounded text-indigo-300 flex items-center justify-center font-bold"
                                                    >
                                                        <Minus size={10} />
                                                    </button>
                                                    <span className="w-6 text-center font-mono font-bold text-indigo-300 text-xs">{manualAlloc}</span>
                                                    <button
                                                        onClick={() => {
                                                            const currentSpent = Object.values(statAllocation).reduce((a, b) => a + b, 0);
                                                            if (currentSpent < companion.statPoints) {
                                                                setStatAllocation(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
                                                            }
                                                        }}
                                                        className="w-5 h-5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 rounded text-indigo-300 flex items-center justify-center font-bold"
                                                    >
                                                        <Plus size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 남은 수동 스탯 포인트 적용 버튼 */}
                {companion.statPoints > 0 && (
                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-slate-400">
                            설정한 투입 스탯 포인트: <strong className="text-indigo-300 font-bold font-mono">{Object.values(statAllocation).reduce((a, b) => a + b, 0)} P</strong> / {companion.statPoints} P
                        </span>
                        <button
                            onClick={handleApplyManualStats}
                            disabled={Object.values(statAllocation).reduce((a, b) => a + b, 0) <= 0}
                            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95"
                        >
                            스탯 투자 확정
                        </button>
                    </div>
                )}
            </div>

            {/* 진화 / 클래스 자동 해방 및 조건 검증 구역 */}
            {isMonster ? (
                /* 몬스터 진화 조건 및 진화 관리 구역 */
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-400" /> 진화 조건 및 진화 관리
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                현재 진화 단계와 다음 단계 진화에 필요한 레벨 및 친밀도 조건입니다.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-xl">
                            현재: {monsterEvoConfig?.label || currentMonsterStage} 단계
                        </span>
                    </div>

                    {targetMonsterStage && monsterEvoConfig ? (
                        <div className="space-y-3">
                            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-200 text-xs">다음 목표 진화 단계: <strong className="text-amber-400">{monsterEvoConfig.nextLabel}</strong></span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${isMonsterAllConditionsMet ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-red-950 text-red-300 border-red-800'}`}>
                                        {isMonsterAllConditionsMet ? '진화 조건 달성 완료' : '진화 조건 미달'}
                                    </span>
                                </div>

                                {/* 4대 조건 체크리스트 (레벨, 친밀도, 전투력, 진화 준비) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                    {/* 1. 레벨 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isMonsterLevelMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">레벨 조건</span>
                                            <span className="font-bold">Lv.{companion.level} / Lv.{monsterEvoConfig.reqLevel}</span>
                                        </div>
                                        {isMonsterLevelMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 2. 친밀도 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isMonsterAffectionMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">친밀도 조건</span>
                                            <span className="font-bold">{companion.affection ?? 50} / {monsterEvoConfig.reqAffection}</span>
                                        </div>
                                        {isMonsterAffectionMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 3. 전투력 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isMonsterCpMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">전투력 조건</span>
                                            <span className="font-bold">{cp.toLocaleString()} / {monsterEvoConfig.reqCp.toLocaleString()}</span>
                                        </div>
                                        {isMonsterCpMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 4. 진화 상태 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isMonsterAllConditionsMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">진화 상태</span>
                                            <span className="font-bold">{isMonsterAllConditionsMet ? '진화 가능' : '성장 진행 중'}</span>
                                        </div>
                                        {isMonsterAllConditionsMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>
                                </div>
                            </div>

                            {/* 진화 실행 버튼 */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-1">
                                <span className="text-[11px] text-slate-400">
                                    {isMonsterAllConditionsMet 
                                        ? '진화 조건이 충족되었습니다. 진화 버튼을 눌러 다음 단계로 각성시키세요.' 
                                        : '레벨, 친밀도, 전투력 조건을 모두 달성해야 다음 단계로 진화할 수 있습니다.'}
                                </span>
                                <button
                                    onClick={handleAttemptMonsterEvolution}
                                    disabled={!isMonsterAllConditionsMet}
                                    className="py-2.5 px-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <Sparkles size={14} /> 진화 각성 시도
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-300 font-bold text-center">
                            최고 진화 형태인 [초궁극체] 단계에 도달했습니다! (최대 Lv.2000까지 지속 성장 가능)
                        </div>
                    )}
                </div>
            ) : (
                /* 휴머노이드 클래스 자동 해방 및 조건 검증 구역 */
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-400" /> 클래스 해방 조건 및 각성 관리
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                현재 클래스 단계와 다음 클래스 해방에 필요한 자질 및 시련 조건입니다.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-xl">
                            현재: {companion.classTier || ClassTier.NONE} 단계
                        </span>
                    </div>

                    {targetTier ? (
                        <div className="space-y-3">
                            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-200 text-xs">다음 목표 클래스: <strong className="text-amber-400">{nextTierName}</strong></span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${isAllConditionsMet ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-red-950 text-red-300 border-red-800'}`}>
                                        {isAllConditionsMet ? '해방 조건 달성 완료' : '해방 조건 미달'}
                                    </span>
                                </div>

                                {/* 4대 조건 체크리스트 (레벨, 전투력, 시련, 잠재력) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                    {/* 1. 레벨 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isLevelMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">레벨 조건</span>
                                            <span className="font-bold">Lv.{companion.level} / Lv.{reqLevel}</span>
                                        </div>
                                        {isLevelMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 2. 전투력 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isCpMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">전투력 조건</span>
                                            <span className="font-bold">{cp.toLocaleString()} / {reqCp.toLocaleString()}</span>
                                        </div>
                                        {isCpMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 3. 클래스 시련 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isTrialMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">시련 달성 여부</span>
                                            <span className="font-bold">{trialName}</span>
                                        </div>
                                        {isTrialMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>

                                    {/* 4. 한계 잠재력 조건 */}
                                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${isPotentialMet ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                        <div>
                                            <span className="block text-[10px] text-slate-400">잠재 자질 조건</span>
                                            <span className="font-bold">{companionPotential} / 필요: {reqPotentialName}</span>
                                        </div>
                                        {isPotentialMet ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                                    </div>
                                </div>
                            </div>

                            {/* 클래스 해방 실행 버튼 */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-1">
                                <span className="text-[11px] text-slate-400">
                                    {isAllConditionsMet 
                                        ? '조건이 충족되었습니다. 해방을 시도하거나 자동 해방 모드로 진행할 수 있습니다.' 
                                        : '전투력, 레벨, 시련, 잠재 자질 조건을 모두 달성해야 클래스 해방이 가능합니다.'}
                                </span>
                                <button
                                    onClick={handleAttemptClassLiberation}
                                    disabled={!isAllConditionsMet}
                                    className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <Sparkles size={14} /> 클래스 해방 각성 시도
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-emerald-300 font-bold text-center">
                            최고 승계 단계인 [파이널 클래스]에 도달했습니다!
                        </div>
                    )}
                </div>
            )}

            {/* 스킬 자동 획득 선호 설정 구역 */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Zap size={16} className="text-cyan-400" /> 스킬 자동 획득 선호 유형
                </h3>
                <p className="text-[11px] text-slate-400">
                    스킬 자동 획득 모드 발동 시 우선적으로 연마하고 배우게 할 스킬 계통입니다.
                </p>
                <select 
                    value={growthSettings.preferredSkillType}
                    onChange={(e) => updateSettings({ preferredSkillType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs text-white p-3 font-bold focus:border-cyan-500 outline-none"
                >
                    <option value="physical">물리 공격 스킬</option>
                    <option value="magic">마법 공격 스킬</option>
                    <option value="buff">버프 스킬</option>
                    <option value="debuff">디버프 스킬</option>
                    <option value="passive">패시브 스킬</option>
                </select>
            </div>
        </div>
    );
};
