
import React, { useState } from 'react';
import { Character, Companion } from '../types';
import { Heart, X, CheckCircle, AlertTriangle, Coins, Gem, Crown, Clock, HeartCrack, Flame } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    targetCompanion: Companion;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

interface DivorceProps {
    companion: Companion;
    onClose: () => void;
    onConfirm: () => void;
}

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

// Calculate months between two YYYY-MM-DD dates
const calculateMonthsDiff = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const years = end.getFullYear() - start.getFullYear();
        const months = end.getMonth() - start.getMonth();
        return Math.max(0, (years * 12) + months);
    } catch {
        return 0;
    }
};

// Check Marriage Eligibility
export const checkMarriageConditions = (companion: Companion, currentDate: string): { allowed: boolean, reason?: string } => {
    if (!companion.isLover) return { allowed: false, reason: "연인 관계가 아닙니다." };
    if (companion.isSpouse) return { allowed: false, reason: "이미 결혼한 상태입니다." };
    
    // Prerequisite: Affection 100, Loyalty 100
    if (companion.affection < 100 || companion.loyalty < 100) {
        return { allowed: false, reason: "호감도와 충성도가 부족합니다. (필요: 100/100)" };
    }

    // Cooldown Check (1 Month)
    if (companion.lastMarriageAttemptDate) {
        const monthsSince = calculateMonthsDiff(companion.lastMarriageAttemptDate, currentDate);
        if (monthsSince < 1) {
            return { allowed: false, reason: "청혼 실패 후 1달이 지나야 재시도할 수 있습니다." };
        }
    }

    return { allowed: true };
};

// ------------------------------------------------------------------
// COMPONENTS
// ------------------------------------------------------------------

export const DivorceModal: React.FC<DivorceProps> = ({ companion, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)] flex flex-col relative overflow-hidden">
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-b from-red-950/80 to-slate-900 text-center shrink-0 border-b border-red-900/50">
                    <HeartCrack size={64} className="mx-auto text-red-500 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold text-red-500 font-cinzel">Divorce Confirmation</h2>
                    <p className="text-red-300 text-sm font-bold mt-2">이혼 합의서</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-slate-300 text-lg font-bold">
                            정말 <span className="text-white">{companion.name}</span>와(과) 이혼하시겠습니까?
                        </p>
                        <p className="text-slate-500 text-xs">
                            법적인 부부 관계가 해소되며, 돌이킬 수 없습니다.
                        </p>
                    </div>

                    <div className="bg-red-950/30 p-4 rounded-xl border border-red-900/50 space-y-3">
                        <div className="flex items-center text-sm text-red-300 font-bold border-b border-red-900/50 pb-2 mb-2">
                            <AlertTriangle size={16} className="mr-2"/> 불이익 경고
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>관계 상태</span>
                            <span className="text-red-400 font-bold">부부 → 남남</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>호감도 (Affection)</span>
                            <span className="text-red-400 font-bold">-50 하락</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>충성도 (Loyalty)</span>
                            <span className="text-red-400 font-bold">-50 하락</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors border border-slate-700"
                    >
                        취소 (생각해봄)
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center group"
                    >
                        <HeartCrack size={18} className="mr-2 group-hover:scale-110 transition-transform"/> 이혼 확정
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MarriageModal: React.FC<Props> = ({ character, targetCompanion, onClose, onUpdateCharacter }) => {
    const [goldInvestment, setGoldInvestment] = useState(0);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProposing, setIsProposing] = useState(false);

    // Safety Check
    if (!character) {
        return null;
    }

    const currentDate = character.currentDate || '2000-01-01';
    
    // Calculate Stats
    // If loverStartDate is missing, assume 0 months (fresh lover)
    const monthsTogether = targetCompanion.loverStartDate 
        ? calculateMonthsDiff(targetCompanion.loverStartDate, currentDate) 
        : 0;
    
    const baseRate = 50;
    const timeBonus = monthsTogether; // 1% per month
    const goldBonus = Math.floor(goldInvestment / 5000); // 1% per 5000G
    
    const totalSuccessRate = Math.min(100, baseRate + timeBonus + goldBonus);
    
    // Max gold player can invest based on current money
    const maxAffordableGold = Math.floor(character.money / 5000) * 5000;
    // Cap gold investment to reach 100%
    const goldNeededForMax = Math.max(0, (100 - baseRate - timeBonus) * 5000);
    const sliderMax = Math.min(maxAffordableGold, goldNeededForMax);

    const handlePropose = () => {
        if (character.money < goldInvestment) {
            alert("골드가 부족합니다.");
            return;
        }

        setIsProposing(true);
        const roll = Math.random() * 100;
        const success = roll < totalSuccessRate;

        // Clone Character & Companion
        const newChar = { ...character };
        newChar.money -= goldInvestment;
        
        let newComps = [...newChar.companions];
        let compIndex = newComps.findIndex(c => c.id === targetCompanion.id);
        
        // Check inactive if not in party
        let isInactive = false;
        if (compIndex === -1) {
            newComps = [...(newChar.inactiveCompanions || [])];
            compIndex = newComps.findIndex(c => c.id === targetCompanion.id);
            isInactive = true;
        }

        if (compIndex === -1) {
            alert("Error: Companion not found.");
            onClose();
            return;
        }

        if (success) {
            newComps[compIndex] = {
                ...newComps[compIndex],
                isSpouse: true,
                classType: `배우자 (${newComps[compIndex].classType || '동료'})`, // Title update
                loyalty: 100, // Lock at max
                affection: 100 // Lock at max
            };
            
            // [NEW] 기억 기록 (Memories)
            const memoryEntry = `[${currentDate}] 플레이어(${newChar.name})의 청혼을 수락하여 부부가 됨.`;
            if (!newComps[compIndex].memories) newComps[compIndex].memories = [];
            newComps[compIndex].memories!.push(memoryEntry);

            if (!newChar.memories) newChar.memories = [];
            newChar.memories.push(`[${currentDate}] ${targetCompanion.name}와(과) 결혼하여 정식으로 부부가 됨.`);

            // Log Update
            const logMsg = `[시스템] 축하합니다! ${targetCompanion.name}와(과) 결혼하여 부부가 되었습니다. (소모: ${goldInvestment}G)`;
            
            // Result Data
            setResultData({
                type: 'success',
                title: '청혼 성공!',
                message: `${targetCompanion.name}이(가) 당신의 마음을 받아들였습니다.\n두 사람은 평생을 함께할 것을 맹세했습니다.`,
                items: [
                    { label: '관계', before: '연인', after: '부부 (Spouse)' },
                    { label: '성공 확률', after: `${totalSuccessRate}%` }
                ]
            });

            // Apply updates
            if (isInactive) newChar.inactiveCompanions = newComps;
            else newChar.companions = newComps;
            
            onUpdateCharacter(newChar, logMsg);

        } else {
            // Failure Logic
            newComps[compIndex] = {
                ...newComps[compIndex],
                lastMarriageAttemptDate: currentDate
            };

            const logMsg = `[시스템] 청혼 실패... ${targetCompanion.name}은(는) 아직 준비가 되지 않은 것 같습니다. (소모: ${goldInvestment}G)`;
            
            setResultData({
                type: 'failure',
                title: '청혼 거절...',
                message: `${targetCompanion.name}이(가) 망설이며 거절했습니다.\n"아직은... 조금 더 시간이 필요해요."\n(1달 후 재시도 가능)`,
                items: [
                    { label: '결과', after: '실패' },
                    { label: '재시도 가능', after: '1개월 후' }
                ]
            });

            // Apply updates
            if (isInactive) newChar.inactiveCompanions = newComps;
            else newChar.companions = newComps;
            
            onUpdateCharacter(newChar, logMsg);
        }
        setIsProposing(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
            {resultData ? (
                <ActionResultModal 
                    data={resultData} 
                    onClose={() => { setResultData(null); onClose(); }} 
                />
            ) : (
                <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col relative overflow-hidden max-h-[90vh]">
                    {/* Header */}
                    <div className="p-6 border-b border-pink-900/50 bg-gradient-to-r from-pink-900/20 to-slate-900 text-center shrink-0">
                        <Gem size={48} className="mx-auto text-pink-400 mb-2 animate-pulse"/>
                        <h2 className="text-2xl font-bold text-white font-cinzel">Marriage Proposal</h2>
                        <p className="text-pink-300 text-sm font-bold mt-1">To. {targetCompanion.name}</p>
                    </div>

                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Status Check */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">현재 관계</span>
                                <span className="text-pink-400 font-bold flex items-center"><Heart size={12} className="mr-1 fill-pink-400"/> 연인 (Lover)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">교제 기간</span>
                                <span className="text-white font-mono">{monthsTogether}개월 (+{timeBonus}%)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">기본 성공률</span>
                                <span className="text-white font-mono">{baseRate}%</span>
                            </div>
                        </div>

                        {/* Investment Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-amber-400 font-bold text-sm flex items-center">
                                    <Coins size={16} className="mr-2"/> 결혼 자금 투자
                                </label>
                                <span className="text-xs text-slate-500">5,000G 당 +1%</span>
                            </div>
                            
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-2">
                                <div className="text-center text-2xl font-bold text-amber-300 font-mono mb-2">
                                    {goldInvestment.toLocaleString()} G
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={sliderMax} 
                                    step="5000"
                                    value={goldInvestment}
                                    onChange={(e) => setGoldInvestment(parseInt(e.target.value))}
                                    className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                                <div className="text-right text-xs text-green-400 mt-1">
                                    확률 보너스: +{goldBonus}%
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">보유 골드: {character.money.toLocaleString()} G</p>
                        </div>

                        {/* Total Probability */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                            <span className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Total Success Rate</span>
                            <div className={`text-4xl font-bold font-mono ${totalSuccessRate >= 80 ? 'text-green-400' : totalSuccessRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {totalSuccessRate}%
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3 shrink-0">
                        <button onClick={onClose} className="flex-1 py-3 text-slate-400 hover:text-white bg-slate-800 rounded-lg font-bold transition-colors">
                            취소
                        </button>
                        <button 
                            onClick={handlePropose}
                            disabled={isProposing}
                            className="flex-[2] py-3 bg-gradient-to-r from-pink-700 to-rose-600 hover:from-pink-600 hover:to-rose-500 text-white rounded-lg font-bold shadow-lg shadow-pink-900/20 flex items-center justify-center transition-all transform hover:scale-105"
                        >
                            <Crown size={20} className="mr-2"/> 청혼하기 (Propose)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
