
import React, { useState, useMemo } from 'react';
import { Character, JobType, Companion, Stats } from '../types';
import { X, Skull, Flame, ShieldAlert, CheckCircle, Info, Lock, Loader2, Sparkles, Crown, Zap, Sword, AlertTriangle, Users, ChevronRight, TrendingUp, Trophy } from 'lucide-react';
import { checkGeneralPromotionEligibility, performGeneralPromotion, PROMOTE_STAT_BOOST } from '../magyepromote';
import ActionResultModal, { ResultData } from './ActionResultModal';
import AppearanceChoiceModal from './AppearanceChoiceModal';
import { getDivineOrDemonJobVisualUrl } from '../services/visualManager';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MagyePromoteModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    // 모든 마계 리더급(마신 + 제너럴) 인원 추출
    const allCandidates = useMemo(() => {
        const candidates = [
            { id: 'player', name: `${character.name} (나)`, level: character.level, job: character.job, entity: character },
            ...character.companions.map(c => ({ id: c.id, name: c.name, level: c.level, job: c.job, entity: c })),
            ...(character.inactiveCompanions || []).map(c => ({ id: c.id, name: c.name, level: c.level, job: c.job, entity: c }))
        ].filter(p => p.job && (p.job.toString().includes("제너럴") || p.job === JobType.DEMON_GOD));
        return candidates;
    }, [character]);

    // 초기 선택 대상 설정: 플레이어가 마신이면 첫 번째 제너럴 동료를, 아니면 플레이어를 선택
    const initialTargetId = useMemo(() => {
        if (character.job === JobType.DEMON_GOD) {
            const firstGeneral = allCandidates.find(p => p.id !== 'player');
            return firstGeneral ? firstGeneral.id : 'player';
        }
        return 'player';
    }, [allCandidates, character.job]);

    const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [pendingVisualModal, setPendingVisualModal] = useState<{
        resultChar: Character;
        targetName: string;
        jobTitle: string;
        currentVisualUrl: string;
        newVisualUrl: string;
        origVisual: string;
    } | null>(null);

    const { allowed, reason, nextRank, nextJob, targetBossName, isRebellion } = checkGeneralPromotionEligibility(character, selectedTargetId);
    const selectedTarget = allCandidates.find(p => p.id === selectedTargetId);

    const finalizePromotion = (newChar: Character, chosenVisualUrl: string, origVisual?: string) => {
        const isPlayer = selectedTargetId === 'player';
        const targetEntity = selectedTarget?.entity as any;
        const baseVisual = origVisual || targetEntity?.visualUrl || targetEntity?.defaultVisualUrl || '';

        if (isPlayer) {
            newChar.visualUrl = chosenVisualUrl;
            newChar.originalVisualUrl = newChar.originalVisualUrl || baseVisual;
        } else {
            const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
            const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === selectedTargetId) ?? -1;
            const targetComp = activeIdx !== -1 ? newChar.companions[activeIdx] : (newChar.inactiveCompanions ? newChar.inactiveCompanions[inactiveIdx] : null);
            if (targetComp) {
                targetComp.visualUrl = chosenVisualUrl;
                targetComp.originalVisualUrl = targetComp.originalVisualUrl || baseVisual;
            }
        }

        onUpdateCharacter(newChar, `[제너럴 승급] ${selectedTarget?.name}의 서열이 상승했습니다. 제국의 위엄이 강화됩니다.`);
        setResultData({
            type: 'levelup',
            title: isRebellion ? '새로운 마신의 탄생' : '서열 찬탈 성공',
            message: isRebellion 
                ? `${selectedTarget?.name}이(가) 마신 임페리얼의 자리를 빼앗고 새로운 신이 되었습니다!`
                : `${selectedTarget?.name}이(가) 상위 제너럴을 꺾고 그 자리를 차지했습니다.`,
            items: [
                { label: '현재 보직', after: nextJob! },
                { label: '국적 확인', after: '임페리얼 제국' },
                ...(nextJob === JobType.DEMON_GOD ? [{ label: '외형 상태', after: chosenVisualUrl === baseVisual ? '기존 외형 유지' : '마신 외형 적용' }] : []),
                { label: '능력치 보너스', after: `All Stats +${isRebellion ? 2000 : PROMOTE_STAT_BOOST}` }
            ]
        });
    };

    const handlePromote = () => {
        if (!allowed || !selectedTarget) return;

        setIsProcessing(true);
        setTimeout(() => {
            const result = performGeneralPromotion(character, selectedTargetId);
            setIsProcessing(false);
            if (result.success) {
                const targetEntity = selectedTarget?.entity as any;
                const currentVisual = targetEntity?.visualUrl || targetEntity?.defaultVisualUrl || '';

                if (nextJob === JobType.DEMON_GOD) {
                    const newVisual = getDivineOrDemonJobVisualUrl(JobType.DEMON_GOD, targetEntity?.gender || '남성');
                    if (newVisual) {
                        setPendingVisualModal({
                            resultChar: result.newChar,
                            targetName: selectedTarget.name,
                            jobTitle: '마신',
                            currentVisualUrl: currentVisual,
                            newVisualUrl: newVisual,
                            origVisual: targetEntity?.originalVisualUrl || currentVisual
                        });
                        return;
                    }
                }

                finalizePromotion(result.newChar, currentVisual);
            } else {
                alert(result.message);
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}
            {pendingVisualModal && (
                <AppearanceChoiceModal
                    isOpen={true}
                    onClose={() => {
                        finalizePromotion(pendingVisualModal.resultChar, pendingVisualModal.currentVisualUrl, pendingVisualModal.origVisual);
                        setPendingVisualModal(null);
                    }}
                    targetName={pendingVisualModal.targetName}
                    jobTitle={pendingVisualModal.jobTitle}
                    isDemonGod={true}
                    currentVisualUrl={pendingVisualModal.currentVisualUrl}
                    newVisualUrl={pendingVisualModal.newVisualUrl}
                    onConfirm={(selectedVisual) => {
                        finalizePromotion(pendingVisualModal.resultChar, selectedVisual, pendingVisualModal.origVisual);
                        setPendingVisualModal(null);
                    }}
                />
            )}

            <div className="bg-slate-900 border-2 border-amber-600 w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden relative">
                
                {/* Visual Backdrop */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute bottom-0 right-0 p-20"><Trophy size={300} className="text-amber-600" /></div>
                </div>

                <div className="p-8 border-b border-amber-900/50 bg-amber-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-600 rounded-2xl shadow-lg">
                            <Crown size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel">GENERAL PROMOTION</h2>
                            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">제너럴 서열 상승 및 승급 심사</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden flex flex-col md:flex-row z-10">
                    {/* Left: General List */}
                    <div className="w-full md:w-80 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Users size={14} className="mr-2"/> 제국 지배층 명단
                        </h3>
                        <div className="space-y-2">
                            {allCandidates.map(p => {
                                const isGod = p.job === JobType.DEMON_GOD;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedTargetId(p.id)}
                                        className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedTargetId === p.id ? 'bg-amber-900/40 border-amber-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-bold text-sm text-slate-200">{p.name}</span>
                                            {isGod ? <Flame size={14} className="text-red-500 animate-pulse"/> : <Crown size={14} className="text-amber-500"/>}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{p.job}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Promotion Details */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        {selectedTarget ? (
                            <div className="space-y-8 animate-in slide-in-from-right-4">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-full bg-amber-900/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                                        {selectedTarget.job === JobType.DEMON_GOD ? <Flame size={40} className="text-red-500 animate-pulse"/> : <Crown size={40} className="text-amber-500" />}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{selectedTarget.name}</h3>
                                    <p className="text-sm text-amber-400 font-bold uppercase tracking-widest">{selectedTarget.job}</p>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-inner">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={16} className="text-amber-500"/> Promotion Criteria
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-2xl border border-slate-800 relative group overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-400">목표 서열</span>
                                                <span className="text-sm font-black text-amber-400">
                                                    {selectedTarget.job === JobType.DEMON_GOD ? "최고 정점" : (nextJob === JobType.DEMON_GOD ? "마신" : `제${nextRank} 제너럴`)}
                                                </span>
                                            </div>
                                            {(nextJob === JobType.DEMON_GOD || selectedTarget.job === JobType.MAGYE_GENERAL_1) && (
                                                <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                                                    <span className="text-xs text-slate-400">파이널 클래스 해방</span>
                                                    {(() => {
                                                        const isFinalLiberated =
                                                            selectedTarget.entity.classTier === '파이널 클래스' ||
                                                            (selectedTarget.entity.classTier as any) === 'FINAL' ||
                                                            Boolean((selectedTarget.entity as any).finalClassName);
                                                        return (
                                                            <span className={`text-sm font-black ${isFinalLiberated ? 'text-green-400' : 'text-red-500'}`}>
                                                                {isFinalLiberated ? '해방 완료 ✓' : `미해방 (${selectedTarget.entity.classTier || '미해방'}) ✗`}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                                                <span className="text-xs text-slate-400">처단해야 할 보스</span>
                                                <span className={`text-sm font-black ${allowed ? 'text-green-400' : 'text-red-500'}`}>
                                                    {selectedTarget.job === JobType.DEMON_GOD ? "-" : (targetBossName || '최고 서열')}
                                                </span>
                                            </div>
                                            {allowed && <div className="absolute -right-2 top-1/2 -translate-y-1/2 rotate-12 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={80} className="text-green-500"/></div>}
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                                            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5"/>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-300 font-bold">승급 보너스</p>
                                                <p className="text-[9px] text-slate-500 leading-relaxed">승급 성공 시 전 능력치와 생명력이 대폭 상승하며 마계 내의 영향력이 증대됩니다.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!allowed ? (
                                    <div className="p-4 bg-red-950/20 border border-red-600/30 rounded-2xl flex items-start gap-3 text-red-300">
                                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold leading-relaxed">{reason}</p>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handlePromote}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-900/40 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={28}/> : <Crown size={28} className="animate-bounce-short" />}
                                        {selectedTarget.name} 승급 수행
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-50">
                                <Crown size={64} className="mb-4" />
                                <p>좌측에서 승급을 진행할 인원을 선택하십시오.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-white/5 text-center shrink-0 relative z-10">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">Imperial Hierarchy Command</p>
                </div>
            </div>
        </div>
    );
};

export default MagyePromoteModal;
