
import React, { useState } from 'react';
import { Character, JobType, Companion } from '../types';
import { X, Skull, Flame, ShieldAlert, CheckCircle, Lock, Loader2, Sparkles, Crown, Zap, Sword, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { checkMagyeAwakeningEligibility, performMagyeAwakening, MAGYE_AWAKENING_CONFIG, checkAnyGeneral11Exists } from '../magyeawakening';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MagyeAwakeningModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedTargetId, setSelectedTargetId] = useState<string>('player');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const allPotentials = [
        { id: 'player', name: `${character.name} (나)`, level: character.level, shinryoku: character.shinryokuType, job: character.job, entity: character },
        ...character.companions.map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c })),
        ...(character.inactiveCompanions || []).map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c }))
    ];

    const currentGeneralExists = checkAnyGeneral11Exists(character);
    const { allowed, reason } = checkMagyeAwakeningEligibility(character, selectedTargetId);
    const selectedTarget = allPotentials.find(p => p.id === selectedTargetId);

    const handleAwaken = () => {
        if (!allowed || !selectedTarget) return;

        setIsProcessing(true);
        setTimeout(() => {
            const result = performMagyeAwakening(character, selectedTargetId);
            if (result.success) {
                onUpdateCharacter(result.newChar, `[마계 각성] ${selectedTarget.name}가 제11제너럴로 임명되었습니다.`);
                setResultData({
                    type: 'levelup',
                    title: '제너럴의 탄생',
                    message: `${selectedTarget.name}의 영혼이 마신 임페리얼의 권능에 의해 재편되었습니다.`,
                    items: [
                        { label: '변경된 직업', after: MAGYE_AWAKENING_CONFIG.TARGET_JOB },
                        { label: '능력치 대폭 상승', after: `All Stats +${MAGYE_AWAKENING_CONFIG.SUCCESS_STAT_BOOST}` }
                    ]
                });
            } else {
                alert(result.message);
            }
            setIsProcessing(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}

            <div className="bg-slate-950 border-2 border-red-600 w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.4)] flex flex-col overflow-hidden relative">
                
                {/* Visual Backdrop */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600 rounded-full blur-[150px] animate-pulse"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                </div>

                <div className="p-8 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-600 rounded-2xl shadow-lg animate-pulse">
                            <Skull size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white font-cinzel tracking-tighter">IMPERIAL AWAKENING</h2>
                            <p className="text-sm text-red-400 font-bold uppercase tracking-widest">제11제너럴 각성 의식</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row z-10">
                    {/* Left: Target Selection */}
                    <div className="w-full md:w-72 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Users size={14} className="mr-2"/> 각성 대상 선택
                        </h3>
                        <div className="space-y-2">
                            {allPotentials.map(p => {
                                const isGeneral = p.job && p.job.toString().includes("제너럴");
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedTargetId(p.id)}
                                        disabled={isGeneral}
                                        className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedTargetId === p.id ? 'bg-red-900/40 border-red-500 shadow-lg' : isGeneral ? 'opacity-40 border-amber-900/50 grayscale' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-bold text-sm text-slate-200">{p.name}</span>
                                            {isGeneral && <Crown size={14} className="text-amber-500"/>}
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[9px] text-red-500 font-bold">Lv.{p.level}</span>
                                            <span className="text-[9px] text-slate-500">{p.shinryoku}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Requirements and Action */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        {selectedTarget && (
                            <div className="space-y-8 animate-in slide-in-from-right-4">
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-white mb-2">{selectedTarget.name}</h3>
                                    <p className="text-sm text-slate-400 italic">"마신 임페리얼의 그늘 아래 새로운 지배자로 거듭나겠습니까?"</p>
                                </div>

                                <div className="bg-slate-900/80 p-6 rounded-3xl border border-red-900/30 space-y-4 shadow-inner">
                                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                                        <Zap size={16}/> Trial Requirements
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-400">
                                                {selectedTarget.level >= MAGYE_AWAKENING_CONFIG.REQUIRED_LEVEL ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                레벨 (Level)
                                            </div>
                                            <span className={`font-mono font-bold ${selectedTarget.level >= MAGYE_AWAKENING_CONFIG.REQUIRED_LEVEL ? 'text-green-400' : 'text-red-400'}`}>
                                                {selectedTarget.level} / {MAGYE_AWAKENING_CONFIG.REQUIRED_LEVEL}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-400">
                                                {selectedTarget.entity.equipment.accessory?.name === MAGYE_AWAKENING_CONFIG.REQUIRED_ACCESSORY ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                전용 장신구 장착
                                            </div>
                                            <span className={`text-xs font-bold ${selectedTarget.entity.equipment.accessory?.name === MAGYE_AWAKENING_CONFIG.REQUIRED_ACCESSORY ? 'text-green-400' : 'text-slate-600'}`}>
                                                {MAGYE_AWAKENING_CONFIG.REQUIRED_ACCESSORY}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-400">
                                                {character.inventory.filter(i => i.name === MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL).length >= MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                제너럴의 정수 재료
                                            </div>
                                            <span className={`font-mono font-bold ${character.inventory.filter(i => i.name === MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL).length >= MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT ? 'text-green-400' : 'text-red-400'}`}>
                                                {character.inventory.filter(i => i.name === MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL).length} / {MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL_COUNT}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center text-slate-400">
                                                {character.memories?.some(m => m.includes("루나스 처치")) ? <CheckCircle size={16} className="text-green-500 mr-2"/> : <AlertTriangle size={16} className="text-red-500 mr-2"/>}
                                                서열 11위 루나스 처단
                                            </div>
                                            <span className={`text-xs font-bold ${character.memories?.some(m => m.includes("루나스 처치")) ? 'text-green-400' : 'text-red-500'}`}>
                                                {character.memories?.some(m => m.includes("루나스 처치")) ? '달성' : '미달성'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!allowed ? (
                                    <div className="p-4 bg-red-950/20 border border-red-600/30 rounded-2xl flex items-start gap-3 text-red-300">
                                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold leading-relaxed">{reason}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl text-center">
                                            <Sparkles className="text-indigo-400 mx-auto mb-2 animate-pulse" />
                                            <p className="text-sm font-bold text-white">제너럴의 빈 자리가 확인되었습니다.</p>
                                            <p className="text-[10px] text-slate-500 mt-1">의식 개시 시 대상의 모든 능력치가 폭발적으로 상승합니다.</p>
                                        </div>
                                        <button 
                                            onClick={handleAwaken}
                                            disabled={isProcessing}
                                            className="w-full py-6 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black text-xl rounded-3xl shadow-[0_0_40px_rgba(220,38,38,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4"
                                        >
                                            {isProcessing ? <Loader2 className="animate-spin" size={28}/> : <Flame size={28} className="animate-pulse" />}
                                            의식 거행 (General Awakening)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-white/5 text-center shrink-0 relative z-10">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">Imperial Sanctum of the Demon God</p>
                </div>
            </div>
        </div>
    );
};

export default MagyeAwakeningModal;
