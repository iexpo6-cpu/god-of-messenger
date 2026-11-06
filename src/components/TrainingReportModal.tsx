import React from 'react';
import { X, CheckCircle2, TrendingUp, Sparkles, User, Award, Shield, Flame, Brain, Wind, Heart, Zap, Sword, Activity, ArrowUpCircle } from 'lucide-react';
import { TrainerBranch } from '../types';

export interface TrainingReportData {
    type: 'exp' | 'stat' | 'mastery';
    targetName: string;
    trainingCount: number;
    baseGain: number | string;
    trainerMultiplier: number;
    hasTrainerBonus: boolean;
    trainerBranchName?: string;
    finalGainText: string;
    details: {
        label: string;
        value: string;
        color?: string;
    }[];
    resourcesSpent: {
        name: string;
        amount: number | string;
    }[];
    remainingCount: number;
}

interface TrainingReportModalProps {
    data: TrainingReportData | null;
    onClose: () => void;
}

const TrainingReportModalComponent: React.FC<TrainingReportModalProps> = ({ data, onClose }) => {
    if (!data) return null;

    const isExp = data.type === 'exp';
    const isStat = data.type === 'stat';
    const isMastery = data.type === 'mastery';

    const themeColor = isExp ? 'indigo' : isStat ? 'amber' : 'red';
    const themeBg = isExp ? 'from-indigo-950/80 to-slate-900' : isStat ? 'from-amber-950/80 to-slate-900' : 'from-red-950/80 to-slate-900';
    const themeBorder = isExp ? 'border-indigo-500/40' : isStat ? 'border-amber-500/40' : 'border-red-500/40';
    const themeText = isExp ? 'text-indigo-400' : isStat ? 'text-amber-400' : 'text-red-400';

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md bg-slate-950 border ${themeBorder} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-200`}>
                
                {/* Header (Mobile Optimized) */}
                <div className={`p-4 sm:p-5 bg-gradient-to-b ${themeBg} border-b border-slate-800/80 flex items-center justify-between shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl bg-slate-900/90 border ${themeBorder} flex items-center justify-center ${themeText} shadow-inner`}>
                            {isExp ? <ArrowUpCircle size={24} /> : isStat ? <Activity size={24} /> : <Sword size={24} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                    isExp ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' :
                                    isStat ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' :
                                    'bg-red-900/60 text-red-300 border border-red-700/50'
                                }`}>
                                    {isExp ? '경험치 훈련' : isStat ? '스탯 훈련' : '무기 숙련도 훈련'}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 size={12} /> 완료
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                                훈련 결과 상세 리포트
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body - Scrollable & Mobile Optimized */}
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
                    
                    {/* Trainer Multiplier Highlight Box */}
                    {data.hasTrainerBonus ? (
                        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-md">
                            <div className="w-9 h-9 rounded-xl bg-emerald-900/50 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                                <Sparkles size={20} className="animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    <span>트레이너 효과 적용 완료</span>
                                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                                        {data.trainerMultiplier}배 보너스
                                    </span>
                                </div>
                                <p className="text-[10px] text-emerald-400/80 mt-0.5 leading-snug">
                                    배치된 숙련급 이상 트레이너의 지도 효과로 최종 획득량이 {data.trainerMultiplier || 2}배로 증폭되었습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-slate-400">
                            <TrendingUp size={16} className="text-slate-500 shrink-0" />
                            <span className="text-[11px] leading-tight">
                                일반 훈련 진행 (배치된 트레이너 분과 효과가 없거나 일반 배율 적용)
                            </span>
                        </div>
                    )}

                    {/* Final Core Gain Highlight Card */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            최종 획득 성과 ({data.trainingCount}회 훈련)
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${themeText} tracking-tight my-1`}>
                            {data.finalGainText}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2 mt-2">
                            <span>대상: <strong className="text-slate-200">{data.targetName}</strong></span>
                            <span>•</span>
                            <span>기본: <strong className="text-slate-300">{data.baseGain}</strong></span>
                            {data.hasTrainerBonus && (
                                <>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-bold">× {data.trainerMultiplier} (트레이너)</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Detailed Metric List */}
                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            상세 획득 및 변동 내역
                        </div>
                        {data.details.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0">
                                <span className="text-slate-400 font-medium">{item.label}</span>
                                <span className={`font-bold font-mono ${item.color || 'text-slate-200'}`}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Resource Consumption & Remaining */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
                            <span className="text-[10px] text-slate-500 block mb-0.5">소모된 자원</span>
                            <div className="text-xs font-bold text-red-400 truncate">
                                {data.resourcesSpent.map(r => `${r.name} ${r.amount}`).join(', ') || '없음'}
                            </div>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
                            <span className="text-[10px] text-slate-500 block mb-0.5">오늘 남은 훈련 횟수</span>
                            <div className="text-xs font-bold text-indigo-400">
                                {data.remainingCount}회 가능
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all active:scale-95 min-h-[44px] flex items-center justify-center gap-2 ${
                            isExp ? 'bg-indigo-600 hover:bg-indigo-500' :
                            isStat ? 'bg-amber-600 hover:bg-amber-500' :
                            'bg-red-600 hover:bg-red-500'
                        }`}
                    >
                        <span>확인 및 훈련 완료</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TrainingReportModal = React.memo(TrainingReportModalComponent);
