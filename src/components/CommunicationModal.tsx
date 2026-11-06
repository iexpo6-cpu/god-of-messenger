
import React, { useState } from 'react';
import { Character } from '../types';
import { X, Radio, Sword, ShieldAlert, Zap, Info, Loader2, Crown, Star, UserPlus, Lock , Boxes, Coins, Sparkles, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, Package } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onOpenBattle: () => void;
    onOpenSummon: () => void;
    onOpenItem: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const CommunicationModal: React.FC<Props> = ({ isOpen, onClose, character, onOpenBattle, onOpenSummon, onOpenItem, onUpdateCharacter }) => {
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showConfirmStep, setShowConfirmStep] = useState(false);
    
    if (!isOpen) return null;

    const isUnlocked = character.isCommunicationUnlocked;

    // 활성화 요구 사양
    const reqLevel = 100;
    const reqMoney = 1000000;
    const reqCrystal = 1000;
    
    const hasLevel = character.level >= reqLevel;
    const hasMoney = character.money >= reqMoney;
    const hasCrystal = (character.base?.resources.manaCrystal || 0) >= reqCrystal;
    const canUnlock = hasLevel && hasMoney && hasCrystal;

    const handleFinalUnlock = () => {
        if (!canUnlock) return;

        setIsUnlocking(true);
        // 즉시 반영을 위해 지연 시간 최소화
        setTimeout(() => {
            const newChar = { ...character };
            newChar.money -= reqMoney;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= reqCrystal;
            }
            newChar.isCommunicationUnlocked = true;
            onUpdateCharacter(newChar, "[시스템] 차원 교신 장치가 성공적으로 개방되었습니다. 평행 세계의 연결이 시작됩니다.");
            setIsUnlocking(false);
            setShowConfirmStep(false);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-4 font-sans animate-in fade-in">
            <div className={`bg-slate-900 w-full max-w-xl rounded-[2rem] md:rounded-[2.5rem] border ${isUnlocked ? 'border-indigo-500' : 'border-slate-700'} shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col relative overflow-hidden max-h-[95vh]`}>
                
                {/* Visual Backdrop */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${isUnlocked ? 'from-indigo-500' : 'from-slate-500'} via-transparent to-transparent`}></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                </div>

                <div className="p-3 md:p-8 border-b border-white/5 bg-slate-950 flex justify-between items-center shrink-0 relative z-10">
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg transition-colors ${isUnlocked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <Radio size={20} className={isUnlocked ? "animate-pulse" : ""} />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-2xl font-bold text-white font-cinzel tracking-wider">DIMENSION CENTER</h2>
                            <p className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${isUnlocked ? 'text-indigo-400' : 'text-slate-500'}`}>
                                {isUnlocked ? '차원 통신 채널 활성화됨' : '차원 교신 장치 오프라인'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-3 md:p-8 flex-1 flex flex-col items-center justify-start space-y-3 md:space-y-8 relative z-10 overflow-y-auto custom-scrollbar">
                    {!isUnlocked ? (
                        showConfirmStep ? (
                            <div className="text-center space-y-6 w-full animate-in zoom-in-95">
                                <div className="p-4 bg-amber-900/20 border border-amber-500/50 rounded-2xl text-amber-200">
                                    <AlertTriangle size={48} className="mx-auto mb-3 animate-bounce-short"/>
                                    <h3 className="text-xl font-bold">장치 개방 최종 확인</h3>
                                    <p className="text-xs mt-2 leading-relaxed">
                                        개방 시 <span className="text-white font-bold">1,000,000 골드</span>와 <span className="text-white font-bold">1,000 마정석</span>이 소모됩니다.<br/>
                                        한 번 개방된 차원은 다시 닫을 수 없습니다. 계속하시겠습니까?
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={() => setShowConfirmStep(false)}
                                        className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                                    >
                                        돌아가기
                                    </button>
                                    <button 
                                        onClick={handleFinalUnlock}
                                        disabled={isUnlocking}
                                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-900/40 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isUnlocking ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20}/>}
                                        개방 확정 (Execute)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-6 w-full animate-in fade-in">
                                <div className="relative">
                                    <ShieldAlert size={64} className={`${canUnlock ? 'text-indigo-500' : 'text-red-500/50'} mx-auto ${canUnlock ? 'animate-pulse' : ''}`} />
                                    <Lock size={24} className="absolute bottom-0 right-1/2 translate-x-8 text-white bg-slate-900 rounded-full p-1 border border-slate-700"/>
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">차원 장치 개방 필요</h3>
                                    <p className="text-xs text-slate-400">다른 차원의 사자들과 교신하기 위한 핵심 장치를 활성화하십시오.</p>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 w-full space-y-4 shadow-inner">
                                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-left">Activation Requirements</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-300">
                                                {hasLevel ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                레벨 (Level)
                                            </div>
                                            <span className={`font-mono font-bold ${hasLevel ? 'text-green-400' : 'text-red-400'}`}>
                                                {character.level} / {reqLevel}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-300">
                                                {hasMoney ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                골드 (Gold)
                                            </div>
                                            <span className={`font-mono font-bold ${hasMoney ? 'text-green-400' : 'text-red-400'}`}>
                                                {(character.money || 0).toLocaleString()} / {reqMoney.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-300">
                                                {hasCrystal ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                마정석 (Crystal)
                                            </div>
                                            <span className={`font-mono font-bold ${hasCrystal ? 'text-green-400' : 'text-red-400'}`}>
                                                {character.base?.resources.manaCrystal || 0} / {reqCrystal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => canUnlock && setShowConfirmStep(true)}
                                    disabled={!canUnlock}
                                    className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${canUnlock ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-900/40 animate-pulse' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                                >
                                    <Sparkles size={24} className={canUnlock ? "text-amber-300" : ""}/>
                                    {canUnlock ? '장치 활성화 가능' : '요구 사양 미달'}
                                </button>
                                
                                {!canUnlock && (
                                    <p className="text-[10px] text-red-500 font-bold animate-pulse italic">
                                        * 위의 세 가지 조건을 모두 충족해야만 버튼이 활성화됩니다.
                                    </p>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full animate-in slide-in-from-bottom-4">
                            {/* Battle Center Access */}
                            <button 
                                onClick={onOpenBattle}
                                className="p-6 bg-slate-950 border-2 border-slate-800 hover:border-red-500 rounded-3xl flex flex-col items-center gap-4 transition-all group hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                            >
                                <div className="p-4 bg-red-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Sword size={32} className="text-red-500"/>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-base font-bold text-white group-hover:text-red-400 uppercase">BATTLE</h4>
                                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-bold">차원 결투</p>
                                </div>
                            </button>

                            {/* Summon Center Access */}
                            <button 
                                onClick={onOpenSummon}
                                className="p-6 bg-slate-950 border-2 border-slate-800 hover:border-indigo-500 rounded-3xl flex flex-col items-center gap-4 transition-all group hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                            >
                                <div className="p-4 bg-indigo-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                                    <UserPlus size={32} className="text-indigo-400"/>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-base font-bold text-white group-hover:text-indigo-400 uppercase">HERO</h4>
                                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-bold">동료 소환</p>
                                </div>
                            </button>

                            {/* Item Center Access */}
                            <button 
                                onClick={onOpenItem}
                                className="p-6 bg-slate-950 border-2 border-slate-800 hover:border-amber-500 rounded-3xl flex flex-col items-center gap-4 transition-all group hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                            >
                                <div className="p-4 bg-amber-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Package size={32} className="text-amber-500"/>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-base font-bold text-white group-hover:text-amber-400 uppercase">VAULT</h4>
                                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-bold">아이템 전송</p>
                                </div>
                            </button>
                        </div>
                    )}

                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 w-full flex gap-3 items-start">
                        <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            차원 교신 시스템은 다른 평행 우주의 사자들과 소통하거나 그들의 힘을 빌리는 고차원 장치입니다.
                            배틀코드를 통해 결투를 즐기거나, 소환코드를 발급하여 영웅 및 보물을 자신의 세계로 불러올 수 있습니다.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 text-center relative z-10">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Dimensional Matrix Status: {isUnlocked ? 'Stable' : 'Offline'}</p>
                </div>
            </div>
        </div>
    );
};

export default CommunicationModal;
