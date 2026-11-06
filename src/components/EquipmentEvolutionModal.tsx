import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight, CheckCircle2, ChevronRight, Sword } from 'lucide-react';
import { Item, ItemRarity, Character } from '../types';
import { calculateItemCPDelta } from '../utils';

interface EquipmentEvolutionModalProps {
  prevItem: Item;
  nextItem: Item;
  character?: Character;
  onClose: () => void;
}

export const EquipmentEvolutionModal: React.FC<EquipmentEvolutionModalProps> = ({
  prevItem,
  nextItem,
  character,
  onClose
}) => {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 1200);
    const timer2 = setTimeout(() => setPhase(2), 3200);
    const timer3 = setTimeout(() => setPhase(3), 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const getRankCfg = (rarity: string) => {
    switch (rarity) {
      case ItemRarity.NORMAL: return { border: 'border-slate-500', text: 'text-slate-400' };
      case ItemRarity.MAGIC: return { border: 'border-green-500', text: 'text-green-400' };
      case ItemRarity.RARE: return { border: 'border-blue-500', text: 'text-blue-400' };
      case ItemRarity.EPIC: return { border: 'border-purple-500', text: 'text-purple-400' };
      case ItemRarity.UNIQUE: return { border: 'border-pink-500', text: 'text-pink-400' };
      case ItemRarity.LEGENDARY: return { border: 'border-yellow-500', text: 'text-yellow-400' };
      case ItemRarity.MYTHTIC: return { border: 'border-amber-500', text: 'text-amber-500' };
      default: return { border: 'border-slate-500', text: 'text-slate-400' };
    }
  };

  const prevRankCfg = getRankCfg(prevItem.rarity);
  const nextRankCfg = getRankCfg(nextItem.rarity);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
      {/* Background Particles & FX */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-white transition-opacity duration-500 ${phase === 2 ? 'opacity-100 z-50' : 'opacity-0 -z-10'}`} />
      </div>

      <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-sm">
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Aura */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 blur-2xl transition-all duration-700 ${phase === 1 ? 'scale-125 opacity-100' : phase === 3 ? 'scale-110 opacity-80' : 'scale-75 opacity-30'}`} />

          {/* Phase 0 & 1: Prev Item */}
          {phase < 3 && (
            <div className={`relative transition-all duration-500 flex items-center justify-center ${phase === 1 ? 'animate-pulse scale-110 filter brightness-200 contrast-200 drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]' : 'scale-100'}`}>
              <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-slate-900 border-4 ${prevRankCfg.border} flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
                <Sword size={64} className={prevRankCfg.text} />
              </div>
            </div>
          )}

          {/* Phase 3: Next Item */}
          {phase === 3 && (
            <div className="relative animate-in zoom-in duration-500 flex items-center justify-center">
              <div className={`absolute -inset-4 rounded-full border-2 ${nextRankCfg.border} animate-ping opacity-30`} />
              <div className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-slate-900 border-4 ${nextRankCfg.border} flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.5)]`}>
                <Sword size={80} className={nextRankCfg.text} />
              </div>
            </div>
          )}
        </div>

        <div className={`mt-8 sm:mt-12 w-full transition-all duration-700 ${phase === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-5 rounded-2xl shadow-2xl w-full">
            <h3 className="text-center text-xl font-bold text-white mb-6 flex items-center justify-center gap-2">
              <Sparkles className="text-indigo-400" size={24} />
              <span>장비 승급 성공!</span>
            </h3>

            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">이전 장비</span>
                <span className={`font-black text-lg ${prevRankCfg.text}`}>{prevItem.rarity}</span>
              </div>
              <ChevronRight size={24} className="text-slate-600" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase">승급 완료</span>
                <span className={`font-black text-xl ${nextRankCfg.text} animate-pulse`}>{nextItem.rarity}</span>
              </div>
            </div>

            {character && (() => {
              const cpDelta = calculateItemCPDelta(prevItem, nextItem, character);
              const isGain = cpDelta.diff >= 0;
              return (
                <div className="mb-5 bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">전투력 변동</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{cpDelta.oldCP.toLocaleString()}</span>
                    <ChevronRight size={12} className="text-slate-600" />
                    <span className={`font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cpDelta.newCP.toLocaleString()} ({isGain ? `+${cpDelta.diff.toLocaleString()}` : cpDelta.diff.toLocaleString()})
                    </span>
                  </div>
                </div>
              );
            })()}

            <button
              disabled={isConfirming}
              onClick={() => {
                if (isConfirming) return;
                setIsConfirming(true);
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-extrabold text-sm shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>확인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
