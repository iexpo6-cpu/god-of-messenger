import React from 'react';
import { Character, Companion, JobType } from '../types';
import { getBreederDailyTrainingCount } from '../services/monsterTrainingLimitService';
import { Dog, X, Star, Search, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
};

const BreederMasteryModalComponent: React.FC<Props> = ({ isOpen, onClose, character, onUpdateCharacter }) => {
    if (!isOpen) return null;

    // 사육사 직업군 동료 찾기
    const assignedIds = character.base?.multiAssignments ? Object.values(character.base.multiAssignments).flat() : [];
    
    const breeders = (character.companions || []).filter(c => c.job === JobType.BREEDER);
    const inactiveBreeders = (character.inactiveCompanions || []).filter(c => c.job === JobType.BREEDER);
    const allBreeders = [...breeders, ...inactiveBreeders].sort((a, b) => {
        const lvA = a.professions?.breeding?.level || 1;
        const lvB = b.professions?.breeding?.level || 1;
        return lvB - lvA;
    });

    const getRankInfo = (level: number) => {
        if (level >= 100) return { label: '전설 사육사', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
        if (level >= 80) return { label: '명인 사육사', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
        if (level >= 60) return { label: '장인 사육사', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
        if (level >= 40) return { label: '숙련 사육사', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
        if (level >= 20) return { label: '일반 사육사', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
        return { label: '견습 사육사', color: 'text-slate-400', bg: 'bg-slate-800/30', border: 'border-slate-700/30' };
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-950 w-full max-w-2xl rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-red-500 to-amber-600 rounded-2xl text-white shadow-lg shadow-red-500/20">
                            <Dog size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">수석 사육사 명부</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">기지 내 사육사들의 숙련도와 등급을 관리합니다</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="bg-slate-800/50 hover:bg-slate-800 text-slate-400 p-2.5 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {allBreeders.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4">
                            <div className="p-6 bg-slate-900 rounded-full grayscale opacity-50">
                                <Search size={40} />
                            </div>
                            <p className="font-medium">사육사 직업을 가진 동료를 찾을 수 없습니다</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {allBreeders.map(breeder => {
                                const breeding = breeder.professions?.breeding || { level: 1, exp: 0, maxExp: 100 };
                                const level = breeding.level;
                                const rank = getRankInfo(level);
                                const isAssigned = assignedIds.includes(breeder.id);
                                
                                const expPercent = Math.min(100, (breeding.exp / (breeding.maxExp || 100)) * 100);
                                const trainingBonus = getBreederDailyTrainingCount(level);

                                return (
                                    <motion.div 
                                        key={breeder.id} 
                                        layout
                                        className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-5 flex-1">
                                            <div className="relative">
                                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-700 overflow-hidden">
                                                    {breeder.visualUrl ? <img src={breeder.visualUrl} alt="" className="w-full h-full object-cover" /> : '👨‍🌾'}
                                                </div>
                                                {isAssigned && (
                                                    <div className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full border-2 border-slate-950 shadow-sm" title="배치됨" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-extrabold text-white text-lg">{breeder.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${rank.bg} ${rank.color} ${rank.border} border`}>
                                                        {rank.label}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                                        일일 훈련 +{trainingBonus.dailyCount}회
                                                    </span>
                                                </div>
                                                
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                        <span className="text-slate-400">숙련도 Lv.{level}</span>
                                                        <span className="text-slate-500">{Math.floor(breeding.exp)} / {breeding.maxExp} EXP</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${expPercent}%` }}
                                                            className="h-full bg-gradient-to-r from-red-500 to-amber-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-6 flex flex-col items-end gap-2">
                                            {isAssigned ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
                                                    <TrendingUp size={12} />
                                                    <span className="text-[10px] font-black">배치 근무 중</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-500 font-bold px-3 py-1.5 bg-slate-800 rounded-lg">
                                                    대기 중
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer Tip */}
                <div className="p-6 bg-slate-900/80 border-t border-slate-800/50">
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed font-medium">
                        ※ 사육사는 몬스터 사육소 시설에 배치된 상태에서 부화, 관리, 훈련을 수행할 때마다 숙련도(EXP)를 획득합니다.<br/>
                        ※ 사육소 시설 개수(개당 3회) 및 사육사 인원수(최대 10명분)가 합산되어 적용되며, 몬스터 사육소 일일 훈련은 최대 100회로 제한됩니다.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export const BreederMasteryModal = React.memo(BreederMasteryModalComponent, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return false;
});

export default BreederMasteryModal;
