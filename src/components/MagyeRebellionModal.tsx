
import React, { useState } from 'react';
import { Character, Enemy, JobType } from '../types';
import { X, Skull, Flame, Sword, Crown, Zap, AlertTriangle, Info, Loader2, Sparkles, ChevronRight, ShieldAlert, Gavel } from 'lucide-react';
import { checkGeneralPromotionEligibility, performGeneralPromotion, PROMOTE_STAT_BOOST } from '../magyepromote';
import { generateBossMonster } from '../bossMonsters';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MagyeRebellionModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { allowed, reason, nextJob, targetBossName } = checkGeneralPromotionEligibility(character, 'player');

    const handleStartRebellion = () => {
        if (!allowed) return;

        // 반역 전투 트리거
        // Use the centralized battle triggering logic in useGame via handleAction or a custom prop
        // Here we explicitly define the battle start
        setResultData({
            type: 'warning',
            title: '최후의 반역 선포',
            message: '마신 임페리얼의 옥좌를 찬탈하기 위한 결전을 시작하시겠습니까?\n패배 시 제국에서 영구 추방되며 모든 지위를 잃게 됩니다.',
            items: [
                { label: '목표 서열', after: '마계의 신 (Demon God)' },
                { label: '처단 대상', after: '마신 임페리얼' }
            ]
        });
    };

    const confirmRebellion = () => {
        setResultData(null);
        onUpdateCharacter(character, "[마계 반역] 마신 임페리얼의 면전에서 반역을 선언했습니다! 이제 돌이킬 수 없습니다.");
        
        // 보스 몬스터 생성 (마신)
        const boss = generateBossMonster("임페리얼 제국", "임페리얼", 12);
        boss.name = "[폐위 대상] 마신 임페리얼";
        
        // 전투 팝업 트리거를 위해 CustomEvent 디스패치
        window.dispatchEvent(new CustomEvent('start_magye_rebellion'));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/95 p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} onContinue={confirmRebellion} />}

            <div className="bg-slate-950 border-4 border-red-600 w-full max-w-2xl h-[80vh] rounded-[3rem] shadow-[0_0_150px_rgba(220,38,38,0.6)] flex flex-col overflow-hidden relative">
                
                {/* Visual Background */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600 rounded-full blur-[180px] animate-pulse"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                </div>

                <div className="p-8 border-b border-red-900/50 bg-red-950/40 text-center shrink-0 z-10">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-red-600 rounded-full shadow-2xl animate-bounce-short">
                            <Skull size={48} className="text-white" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-white font-cinzel tracking-tighter uppercase mb-2">SUPREME REBELLION</h2>
                    <p className="text-sm text-red-400 font-bold uppercase tracking-widest">제국 서열 1위의 반역: 신좌 찬탈</p>
                </div>

                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8 relative z-10 text-center">
                    <div className="bg-black/60 p-8 rounded-[2.5rem] border border-red-600/30 space-y-6">
                        <h3 className="text-2xl font-bold text-white leading-tight">
                            "마계의 태양은 오직 하나여야 한다."
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed italic">
                            당신은 이제 제국의 모든 제너럴을 굽어살피는 제1 제너럴의 자리에 올랐습니다.<br/>
                            남은 적은 오직 하나, 당신에게 힘을 부여한 '마신 임페리얼' 뿐입니다.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4 pt-4">
                            <div className="bg-red-950/50 border border-red-900 px-5 py-3.5 rounded-3xl flex flex-col items-center">
                                <span className="text-[10px] text-red-400 font-bold mb-1">현재 직위</span>
                                <span className="text-base font-bold text-white">마계 제1 제너럴</span>
                            </div>
                            <div className="bg-amber-900/30 border border-amber-500/50 px-5 py-3.5 rounded-3xl flex flex-col items-center">
                                <span className="text-[10px] text-amber-500 font-bold mb-1">목표 위계</span>
                                <span className="text-base font-bold text-amber-400">마신</span>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-700 px-5 py-3.5 rounded-3xl flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 font-bold mb-1">필수 조건: 파이널 클래스</span>
                                {(() => {
                                    const isFinalLiberated =
                                        character.classTier === '파이널 클래스' ||
                                        (character.classTier as any) === 'FINAL' ||
                                        Boolean(character.finalClassName);
                                    return (
                                        <span className={`text-base font-bold ${isFinalLiberated ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isFinalLiberated ? '해방 완료 ✓' : '미해방 ✗'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!allowed ? (
                            <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-3xl flex flex-col items-center gap-2">
                                <AlertTriangle className="text-red-500" size={32}/>
                                <p className="text-sm font-bold text-red-200">{reason}</p>
                                <p className="text-[10px] text-slate-500">파이널 클래스를 해방하고 마신을 직접 찾아가 승리하여 가치를 증명해야 합니다.</p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleStartRebellion}
                                className="w-full py-6 bg-gradient-to-r from-red-800 via-red-600 to-red-800 hover:from-red-700 hover:to-red-500 text-white font-black text-2xl rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.6)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                <Sword size={32} className="group-hover:rotate-12 transition-transform" />
                                <span>반역의 기치 올리기</span>
                                <Sparkles size={24} className="text-amber-400 animate-pulse" />
                            </button>
                        )}
                        
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex gap-3 items-start text-left">
                            <Info size={16} className="text-indigo-400 shrink-0 mt-1" />
                            <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
                                <p>• 반역 도전 조건: 파이널 클래스 해방 상태 및 마신 임페리얼 처단 기록이 필요합니다.</p>
                                <p>• 반역 성공 시: 플레이어는 **마신**으로 승급하며, 마계의 절대 지배권을 획득합니다.</p>
                                <p>• 반역 패배 시: 모든 지배지와 직함을 잃고 **무직** 신분으로 전락하며 마계에서 영구 추방됩니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-red-900/50 text-center shrink-0">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.5em] animate-pulse">Ascension Through Chaos</p>
                </div>
            </div>
        </div>
    );
};

export default MagyeRebellionModal;
