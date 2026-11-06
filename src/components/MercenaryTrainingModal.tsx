
import React, { useState } from 'react';
import { Character, Companion, Stats, JobType } from '../types';
import { X, Dumbbell, Shield, Sword, Heart, Activity, Brain, Target, Zap, Coins, UserCheck, AlertTriangle, Loader2, Sparkles, Users, Flame, Smile, CheckCircle } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type TrainingIntensity = 'Low' | 'Medium' | 'High';

const INTENSITY_CONFIG = {
    Low: { label: '저강도 훈련', costMult: 1000, statGain: 1, success: 100, icon: Smile, color: 'text-green-400', bg: 'bg-green-950/20' },
    Medium: { label: '중강도 훈련', costMult: 3000, statGain: 2, success: 50, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-950/20' },
    High: { label: '고강도 훈련', costMult: 10000, statGain: 5, success: 25, icon: Flame, color: 'text-red-500', bg: 'bg-red-950/20' }
};

const MercenaryTrainingModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [intensity, setIntensity] = useState<TrainingIntensity>('Low');
    const [targetStat, setTargetStat] = useState<keyof Stats>('str');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const mData = character.mercenaryData;
    const currentMonth = character.currentDate?.substring(0, 7);
    const isTrainedThisMonth = mData?.lastTrainDate === currentMonth;

    // 용병단 소속 용병 필터링
    const groupMembers = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => c.job === JobType.MERCENARY && mData?.groupMembers?.includes(c.id) && !c.isDead);
    
    // 플레이어 포함
    const totalTrainees = groupMembers.length + 1;
    const totalCost = INTENSITY_CONFIG[intensity].costMult * totalTrainees;

    const handleStartTraining = () => {
        if (isTrainedThisMonth) {
            alert("용병단 훈련은 월 1회만 실시 가능합니다.");
            return;
        }

        if (character.money < totalCost) {
            setResultData({
                type: 'warning',
                title: '자금 부족',
                message: '훈련을 실시하기 위한 용병단 운영 자금이 부족합니다.',
                items: [{ label: '필요 골드', after: `${totalCost.toLocaleString()} G` }]
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            const config = INTENSITY_CONFIG[intensity];
            
            newChar.money -= totalCost;
            newChar.mercenaryData = { ...newChar.mercenaryData!, lastTrainDate: currentMonth };

            let successCount = 0;
            const successNames: string[] = [];

            const applyStat = (entity: any) => {
                const roll = Math.random() * 100;
                const isSuccess = roll < config.success;
                
                if (isSuccess) {
                    entity.stats[targetStat] += config.statGain;
                    if (targetStat === 'maxHp') entity.stats.hp += (config.statGain * 10);
                    if (targetStat === 'maxMp') entity.stats.mp += (config.statGain * 10);
                    successCount++;
                    successNames.push(entity.name);
                }

                // 고강도 훈련 리스크 (호감도 감소)
                if (intensity === 'High') {
                    const affLoss = Math.floor(Math.random() * 10) + 5;
                    if ('affection' in entity) {
                        entity.affection = Math.max(-100, entity.affection - affLoss);
                    }
                }
            };

            // 훈련 실시 (플레이어)
            applyStat(newChar);

            // 훈련 실시 (동료 리스트 업데이트)
            const updateList = (list: Companion[]) => {
                return list.map(c => {
                    if (c.job === JobType.MERCENARY && mData?.groupMembers?.includes(c.id)) {
                        const next = { ...c };
                        applyStat(next);
                        return next;
                    }
                    return c;
                });
            };

            newChar.companions = updateList(newChar.companions);
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = updateList(newChar.inactiveCompanions);
            }

            const logMsg = `[용병단 훈련] ${config.label} 실시 (${targetStat.toUpperCase()} +${config.statGain}). 총 ${totalTrainees}명 중 ${successCount}명 성공.`;
            onUpdateCharacter(newChar, logMsg);

            const successListStr = successNames.length > 0 
                ? `성공 단원: ${successNames.join(', ')}`
                : "안타깝게도 성과를 낸 단원이 없습니다.";

            setResultData({
                type: successCount > 0 ? 'levelup' : 'failure',
                title: successCount > 0 ? '훈련 성공 보고' : '훈련 성과 부족',
                message: `${config.label}을 마쳤습니다. ${successListStr}`,
                items: [
                    { label: '강화 항목', after: targetStat.toUpperCase() },
                    { label: '상승 수치', after: `+${config.statGain}` },
                    { label: '성공률 달성', after: `${successCount} / ${totalTrainees}명` },
                    { label: '소모 자금', after: `-${totalCost.toLocaleString()} G` },
                    ...(intensity === 'High' ? [{ label: '단원 호감도', after: '하락 (엄격한 훈련)' }] : [])
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); if(resultData.type !== 'warning') onClose(); }} />}

            <div className="bg-slate-900 border border-red-500/40 w-full max-w-md max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 sm:p-6 border-b border-rose-950/40 bg-gradient-to-r from-rose-955/30 via-slate-900 to-amber-955/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 mr-3">
                            <Dumbbell size={22} className="text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">용병단 합동 훈련</h2>
                            <p className="text-xs text-slate-400 mt-0.5">단원들의 신체 및 전투 능력 육성</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"><X size={20}/></button>
                </div>

                <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">
                    {isTrainedThisMonth ? (
                        <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col items-center text-center space-y-2.5">
                            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="font-bold text-white text-base">이번 달 훈련 일정 완료</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">단원들이 재정비 및 휴식을 취하고 있습니다. 다음 달에 다시 훈련을 시작할 수 있습니다.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2.5">
                                <label className="text-xs text-slate-400 font-bold px-1">훈련 강도 설정</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.entries(INTENSITY_CONFIG) as [TrainingIntensity, any][]).map(([key, cfg]) => (
                                        <button 
                                            key={key}
                                            onClick={() => setIntensity(key)}
                                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group ${intensity === key ? 'bg-rose-955/30 border-rose-500/60 ring-1 ring-rose-500/40' : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${intensity === key ? cfg.color : 'text-slate-500'}`}>
                                                    <cfg.icon size={18}/>
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold ${intensity === key ? 'text-white' : 'text-slate-300'}`}>{cfg.label}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">성공률 {cfg.success}% • 능력치 +{cfg.statGain}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono text-amber-400 font-bold">{(cfg.costMult * totalTrainees).toLocaleString()} 골드</div>
                                                <div className="text-[10px] text-slate-400">1인당 {cfg.costMult.toLocaleString()} 골드</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-xs text-slate-400 font-bold px-1">집중 훈련 항목</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { k: 'str', l: '근력', i: Sword, c: 'text-rose-400' },
                                        { k: 'int', l: '지력', i: Zap, c: 'text-purple-400' },
                                        { k: 'def', l: '방어', i: Shield, c: 'text-emerald-400' },
                                        { k: 'agi', l: '민첩', i: Activity, c: 'text-amber-400' },
                                        { k: 'wis', l: '지혜', i: Brain, c: 'text-sky-400' },
                                        { k: 'ctrl', l: '제어', i: Target, c: 'text-cyan-400' }
                                    ].map(s => (
                                        <button 
                                            key={s.k}
                                            onClick={() => setTargetStat(s.k as any)}
                                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all active:scale-95 ${targetStat === s.k ? 'bg-rose-955/40 border-rose-500/70 text-white shadow-sm' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                        >
                                            <s.i size={18} className={targetStat === s.k ? s.c : 'opacity-40'} />
                                            <span className={`text-xs font-bold ${targetStat === s.k ? 'text-white' : 'text-slate-300'}`}>{s.l}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                                <h4 className="text-xs text-slate-400 font-bold mb-2.5 flex items-center"><Users size={14} className="mr-1.5 text-rose-400"/> 참여 인원 ({totalTrainees}명)</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-rose-950/50 text-rose-300 px-2.5 py-1 rounded-md border border-rose-800/60 font-medium">나 (단장)</span>
                                    {groupMembers.map(c => (
                                        <span key={c.id} className="text-xs bg-slate-900 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 font-medium">{c.name}</span>
                                    ))}
                                </div>
                            </div>

                            {intensity === 'High' && (
                                <div className="p-3 bg-rose-955/20 border border-rose-500/40 rounded-xl flex gap-2.5 items-start">
                                    <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5"/>
                                    <p className="text-xs text-rose-300 leading-relaxed">주의: 고강도 훈련은 단원들에게 심한 피로감을 주어 호감도가 다소 하락할 수 있습니다.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-950/90 border-t border-slate-800">
                    <button 
                        onClick={handleStartTraining}
                        disabled={isTrainedThisMonth || isProcessing}
                        className={`w-full py-3 sm:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-sm ${isTrainedThisMonth ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed' : 'bg-rose-700 hover:bg-rose-600 text-white'}`}
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18}/>}
                        {isTrainedThisMonth ? '훈련 완료 상태' : '훈련 실시'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MercenaryTrainingModal;
