
import React from 'react';
import { Character, MagyeDivineWar, Enemy } from '../types';
import { X, Sparkles, CloudSun, Sword, ShieldAlert, AlertTriangle, Crown, Flame, Skull, Zap } from 'lucide-react';

interface Props {
    character: Character;
    event: MagyeDivineWar;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type: string, source: string, city: string) => void;
}

const MagyeDivineWarModal: React.FC<Props> = ({ character, event, onClose, onBattle }) => {
    const isElla = event.type === 'DIVINE_PUNISHMENT';

    const handleDefend = () => {
        onBattle(event.enemies, 'magye_divine_war', event.invaderName, event.city);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-in fade-in">
            {/* 황금빛 광원 효과 */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-400 rounded-full blur-[150px] animate-pulse"></div>
            </div>

            <div className={`bg-slate-900 border-4 w-full max-w-2xl rounded-[3rem] shadow-[0_0_150px_rgba(251,191,36,0.4)] flex flex-col overflow-hidden relative ${isElla ? 'border-amber-400' : 'border-indigo-400'}`}>
                
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-amber-950/40 to-slate-900 text-center shrink-0">
                    <div className="flex justify-center mb-4">
                        {isElla ? (
                            <div className="p-4 bg-amber-500 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce-short">
                                <Crown size={48} className="text-white" />
                            </div>
                        ) : (
                            <div className="p-4 bg-indigo-600 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.6)] animate-pulse">
                                <CloudSun size={48} className="text-white" />
                            </div>
                        )}
                    </div>
                    <h2 className="text-4xl font-black text-white font-cinzel tracking-tighter uppercase mb-2">
                        {isElla ? 'DIVINE PUNISHMENT' : 'MESSENGER JUDGMENT'}
                    </h2>
                    <p className={`text-sm font-bold uppercase tracking-widest ${isElla ? 'text-amber-400' : 'text-indigo-300'}`}>
                        {event.city}: 신성한 정벌의 시작
                    </p>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar text-center relative">
                    <div className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                        <h3 className="text-2xl font-bold text-white leading-tight">
                            도시의 {isElla ? '타락' : '가혹한 통치'}가<br/>하늘의 인내심을 넘었습니다.
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed italic">
                            "{event.city}의 비명이 차원의 틈새를 넘어 신계에 닿았습니다. <br/>
                            {event.invaderName}{isElla ? '가 직접 ' : '이(가) '} 지배자의 오만을 꺾기 위해 강림했습니다."
                        </p>
                        <div className="flex justify-center gap-4 pt-2">
                            <div className="bg-red-955/50 border border-red-900 px-4 py-2 rounded-2xl flex flex-col items-center">
                                <span className="text-[10px] text-red-400 font-bold uppercase">Chaos Score</span>
                                <span className="text-xl font-mono font-bold text-white">{event.chaosScore.toLocaleString()}</span>
                            </div>
                            <div className="bg-indigo-900/30 border border-indigo-700/50 px-4 py-2 rounded-2xl flex flex-col items-center">
                                <span className="text-[10px] text-indigo-400 font-bold uppercase">Target Area</span>
                                <span className="text-sm font-bold text-slate-200">{event.city}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={handleDefend}
                            className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 ${isElla ? 'bg-gradient-to-r from-amber-600 to-amber-400 text-slate-900 shadow-amber-900/40' : 'bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-indigo-900/40'}`}
                        >
                            <Sword size={28}/>
                            정면으로 대적하기 (Engage)
                        </button>
                        
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex gap-3 items-start text-left">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-1" />
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                <p>• 전투에서 패배할 경우, 도시의 공포도와 타락도가 <span className="text-red-400 font-bold">대량 하락(-12,000)</span>하며 지배권이 흔들립니다.</p>
                                <p>• 승리 시 신을 꺾은 지배자로 칭송받으며 <span className="text-green-400 font-bold">혼돈 지수가 폭등(+7,000)</span>합니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-white/5 text-center">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em] animate-pulse">Sacred vs Demonic War</p>
                </div>
            </div>
        </div>
    );
};

export default MagyeDivineWarModal;
