
import React from 'react';
import { Stats } from '../types';
import { SHINRYOKU_TYPES_LIST } from '../constants';
import { X, Sword, ShieldCheck, Sparkles, Info, Flame, Zap, Snowflake, Mountain, Droplets, Hammer, Sun, Moon, Leaf, Wind, Star, Eclipse, Activity } from 'lucide-react';

interface Props {
  name: string;
  stats: Stats;
  elementalStats: Record<string, { atk: number; res: number }>;
  onClose: () => void;
}

const SHINRYOKU_ICONS: Record<string, any> = {
    '화염계': Flame,
    '광휘계': Star,
    '전격계': Zap,
    '빙결계': Snowflake,
    '대지계': Mountain,
    '암흑계': Eclipse,
    '무기강화계': Sword,
    '신체강화계': Activity,
    '해수계': Droplets,
    '질풍계': Wind,
    '강철계': Hammer,
    '태양계': Sun,
    '월광계': Moon,
    '초화계': Leaf
};

const ElementalStatsModal: React.FC<Props> = ({ name, stats, elementalStats, onClose }) => {
  // 제어(CTRL)에 의한 보너스 수치 계산
  const ctrlBonus = Math.min(1.0, stats.ctrl / 10000);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in pointer-events-auto">
      <div className="bg-slate-900 border border-indigo-500 w-full max-w-2xl rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-indigo-900/50 bg-indigo-950/30 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white font-cinzel uppercase tracking-widest">Elemental Matrix</h3>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">{name}'s Power Profile</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            {/* 공식 및 보너스 요약 */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-1 text-center md:text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter flex items-center gap-1 justify-center md:justify-start">
                        <Info size={12} className="text-indigo-400"/> 기본 곱셈 연산
                    </p>
                    <p className="text-xs text-slate-300 font-mono">1.0 (기본) + CTRL / 10,000(최대 1))</p>
                </div>
                <div className="bg-indigo-900/20 px-6 py-2 rounded-xl border border-indigo-500/30 text-center">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-0.5">CTRL 보너스</p>
                    <p className="text-xl font-mono font-bold text-indigo-200">+{ctrlBonus.toFixed(2)}</p>
                </div>
            </div>

            {/* 속성 데이터 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attack Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-900/30">
                        <Sword size={16} className="text-red-500"/>
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">피해량</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {SHINRYOKU_TYPES_LIST.map(type => {
                            const Icon = SHINRYOKU_ICONS[type] || Sparkles;
                            const val = elementalStats[type]?.atk || 1.0;
                            return (
                                <div key={`atk-${type}`} className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-white/5 transition-colors hover:bg-red-900/10">
                                    <div className="flex items-center gap-3">
                                        <Icon size={14} className="text-slate-500"/>
                                        <span className="text-xs text-slate-300 font-medium">{type}</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-red-400">x{val.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Resistance Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-900/30">
                        <ShieldCheck size={16} className="text-blue-500"/>
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider">저항력</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {SHINRYOKU_TYPES_LIST.map(type => {
                            const Icon = SHINRYOKU_ICONS[type] || Sparkles;
                            const val = elementalStats[type]?.res || 1.0;
                            return (
                                <div key={`res-${type}`} className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-white/5 transition-colors hover:bg-blue-900/10">
                                    <div className="flex items-center gap-3">
                                        <Icon size={14} className="text-slate-500"/>
                                        <span className="text-xs text-slate-300 font-medium">{type}</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-blue-400">x{val.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 leading-relaxed italic text-center">
                    * 최종 속성 수치는 제어(CTRL) 보너스와 장착 중인 장비/타이틀의 보너스가 합산된 결과입니다.<br/>
                    * 전투 시 가해지는 데미지는 [공격자의 해당속성 피해 / 방어자의 해당속성 저항] 비율에 의해 증폭되거나 감쇄됩니다.
                </p>
            </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-white/5 text-center">
            <button 
                onClick={onClose}
                className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95"
            >
                매트릭스 분석 종료
            </button>
        </div>
      </div>
    </div>
  );
};

export default ElementalStatsModal;
