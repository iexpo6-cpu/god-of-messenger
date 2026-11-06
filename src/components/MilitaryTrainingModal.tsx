
import React, { useState } from 'react';
import { Character, Companion, Stats, JobType, MilitaryRank } from '../types';
import { X, Dumbbell, Shield, Sword, Activity, Brain, Target, Zap, Loader2, Sparkles, Users, CheckCircle, Smile, Flame } from 'lucide-react';
import { generateDefaultVisualUrl } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    effectiveCommander: { id: string; name: string; rank: MilitaryRank; rankIdx: number };
}

type TrainingIntensity = 'Low' | 'Medium' | 'High';

const INTENSITY_CONFIG = {
    Low: { label: '저강도 훈련', costMult: 1000, statGain: 1, success: 100, icon: Smile, color: 'text-emerald-400', badgeColor: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60' },
    Medium: { label: '중강도 훈련', costMult: 3000, statGain: 2, success: 50, icon: Activity, color: 'text-sky-400', badgeColor: 'bg-sky-950/40 text-sky-300 border-sky-800/60' },
    High: { label: '고강도 훈련', costMult: 10000, statGain: 5, success: 25, icon: Flame, color: 'text-rose-400', badgeColor: 'bg-rose-950/40 text-rose-300 border-rose-800/60' }
};

const STAT_OPTIONS = [
    { k: 'str' as keyof Stats, l: '힘', i: Sword, c: 'text-rose-400' },
    { k: 'int' as keyof Stats, l: '지력', i: Zap, c: 'text-purple-400' },
    { k: 'def' as keyof Stats, l: '방어', i: Shield, c: 'text-emerald-400' },
    { k: 'agi' as keyof Stats, l: '민첩', i: Activity, c: 'text-amber-400' },
    { k: 'wis' as keyof Stats, l: '지혜', i: Brain, c: 'text-sky-400' },
    { k: 'ctrl' as keyof Stats, l: '제어', i: Target, c: 'text-cyan-400' }
];

const MilitaryTrainingModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, effectiveCommander }) => {
    const [intensity, setIntensity] = useState<TrainingIntensity>('Low');
    const [targetStat, setTargetStat] = useState<keyof Stats>('str');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const mData = character.militaryData;
    const currentMonth = character.currentDate?.substring(0, 7);
    const isTrainedThisMonth = mData?.lastTrainDate === currentMonth;
    const nation = character.currentLocation?.nation || character.nation;

    const allMilitaryComps = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => c.job === JobType.SOLDIER && c.nation === nation && !c.isDead);
    
    const isPlayerMilitaryInNation = character.job === JobType.SOLDIER && character.nation === nation;
    const totalTrainees = allMilitaryComps.length + (isPlayerMilitaryInNation ? 1 : 0);
    const totalCost = INTENSITY_CONFIG[intensity].costMult * totalTrainees;

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    const handleStartTraining = () => {
        if (isTrainedThisMonth) {
            alert("부대 훈련은 월 1회만 실시 가능합니다.");
            return;
        }

        if (character.money < totalCost) {
            setResultData({
                type: 'warning',
                title: '예산 부족',
                message: '부대 훈련을 실시하기 위한 국방 예산(골드)이 부족합니다.',
                items: [{ label: '필요 골드', after: `${totalCost.toLocaleString()} 골드` }]
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            const config = INTENSITY_CONFIG[intensity];
            
            newChar.money -= totalCost;
            newChar.militaryData = { ...newChar.militaryData!, lastTrainDate: currentMonth };

            let commanderStatBonus = 0;
            const commanderEntity = effectiveCommander.id === 'player' ? character : allComps.find(c => c.id === effectiveCommander.id);
            if (commanderEntity) {
                commanderStatBonus = Math.floor((commanderEntity.stats.ctrl + commanderEntity.stats.wis) * 0.01);
            }
            const finalSuccessRate = Math.min(100, config.success + commanderStatBonus);

            let successCount = 0;
            const successNames: string[] = [];

            const applyStat = (entity: any) => {
                const isCommander = entity.id === effectiveCommander.id || (effectiveCommander.id === 'player' && entity === newChar);
                const roll = Math.random() * 100;
                const isSuccess = isCommander || roll < finalSuccessRate;
                
                if (isSuccess) {
                    entity.stats[targetStat] += config.statGain;
                    if (targetStat === 'maxHp') entity.stats.hp += (config.statGain * 10);
                    if (targetStat === 'maxMp') entity.stats.mp += (config.statGain * 10);
                    successCount++;
                    successNames.push(entity.name);
                }

                if (intensity === 'High') {
                    const affLoss = Math.floor(Math.random() * 10) + 5; 
                    if ('affection' in entity) {
                        entity.affection = Math.max(-100, entity.affection - affLoss);
                    }
                }
            };

            if (isPlayerMilitaryInNation) applyStat(newChar);
            newChar.companions = newChar.companions.map(c => {
                if (c.job === JobType.SOLDIER && c.nation === nation) {
                    const next = { ...c };
                    applyStat(next);
                    return next;
                }
                return c;
            });
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                    if (c.job === JobType.SOLDIER && c.nation === nation) {
                        const next = { ...c };
                        applyStat(next);
                        return next;
                    }
                    return c;
                });
            }

            const statName = STAT_OPTIONS.find(s => s.k === targetStat)?.l || targetStat;
            const logMsg = `[부대 훈련] 지휘관 ${effectiveCommander.name}의 주도로 ${config.label} 실시 (${statName} +${config.statGain}). 총 ${totalTrainees}명 중 ${successCount}명 성공.`;
            onUpdateCharacter(newChar, logMsg);

            const successListStr = successNames.length > 0 
                ? `성과 우수 대원: ${successNames.join(', ')}`
                : "성과를 낸 대원이 없습니다.";

            setResultData({
                type: successCount > 0 ? 'levelup' : 'failure',
                title: '부대 합동 훈련 종료',
                message: `${config.label}를 마쳤습니다. ${successListStr}`,
                items: [
                    { label: '지휘관', after: effectiveCommander.name },
                    { label: '훈련 항목', after: statName },
                    { label: '보정 성공률', after: `${finalSuccessRate}% (보너스 +${commanderStatBonus}%)` },
                    { label: '소모 예산', after: `-${totalCost.toLocaleString()} 골드` }
                ]
            });
            setIsProcessing(false);
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); if(resultData.type !== 'warning') onClose(); }} />}

            <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg max-h-[92vh] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                            <Dumbbell size={20} />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">부대 합동 훈련</h2>
                            <p className="text-xs text-slate-400">총괄 지휘: {effectiveCommander.name} ({effectiveCommander.rank})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                    {isTrainedThisMonth ? (
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
                            <div className="w-14 h-14 rounded-full bg-sky-950/50 border border-sky-800/60 flex items-center justify-center text-sky-400">
                                <CheckCircle size={30} />
                            </div>
                            <h3 className="font-bold text-white text-base">이번 달 훈련 완료</h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                                부대원들이 휴식을 취하며 지휘관의 지침을 숙지하고 있습니다. 다음 달에 다시 훈련을 실시할 수 있습니다.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 훈련 강도 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300">훈련 강도 선택</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.entries(INTENSITY_CONFIG) as [TrainingIntensity, any][]).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        const isSelected = intensity === key;
                                        const cost = cfg.costMult * totalTrainees;
                                        return (
                                            <button 
                                                key={key}
                                                type="button"
                                                onClick={() => setIntensity(key)}
                                                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${isSelected ? 'bg-sky-950/40 border-sky-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${isSelected ? cfg.color : 'text-slate-500'}`}>
                                                        <Icon size={18}/>
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{cfg.label}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">기본 성공률 {cfg.success}% · 능력치 +{cfg.statGain}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-amber-400 font-mono">{cost.toLocaleString()} 골드</div>
                                                    <div className="text-[11px] text-slate-400">인당 {cfg.costMult.toLocaleString()} 골드</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 집중 훈련 항목 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300">강화 능력치 선택</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {STAT_OPTIONS.map(s => {
                                        const Icon = s.i;
                                        const isSelected = targetStat === s.k;
                                        return (
                                            <button 
                                                key={s.k}
                                                type="button"
                                                onClick={() => setTargetStat(s.k)}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${isSelected ? 'bg-sky-950/50 border-sky-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <Icon size={18} className={isSelected ? s.c : 'text-slate-500'} />
                                                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{s.l}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 참여 부대원 */}
                            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                    <span className="flex items-center gap-1.5"><Users size={14} className="text-sky-400"/> 참여 부대원</span>
                                    <span className="text-slate-400 font-mono">{totalTrainees}명</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                    <span className="text-xs bg-sky-950/60 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-800/60 font-bold">
                                        {effectiveCommander.name} (지휘관)
                                    </span>
                                    {allMilitaryComps.filter(c => c.id !== effectiveCommander.id).map(c => (
                                        <span key={c.id} className="text-xs bg-slate-900 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800">
                                            {c.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {intensity === 'High' && (
                                <div className="p-3 bg-rose-950/25 border border-rose-800/50 rounded-xl text-xs text-rose-300 leading-relaxed">
                                    주의: 고강도 훈련은 부대원들에게 극심한 피로를 주어 호감도가 다소 하락할 수 있습니다.
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 bg-slate-950 border-t border-slate-800">
                    <button 
                        type="button"
                        onClick={handleStartTraining}
                        disabled={isTrainedThisMonth || isProcessing}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] ${isTrainedThisMonth ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18}/>}
                        {isTrainedThisMonth ? '훈련 완료 상태' : '훈련 개시'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MilitaryTrainingModal;
