import React from 'react';
import { Character } from '../types';
import { calculateFinalStats } from '../utils';

interface CanvasCharacterHudProps {
    character: Character;
    className?: string;
}

export const CanvasCharacterHud: React.FC<CanvasCharacterHudProps> = ({ character, className = '' }) => {
    const { finalStats } = calculateFinalStats(character);
    const hp = Math.max(0, Math.round(character.stats.hp ?? 0));
    const maxHp = Math.max(1, Math.round(finalStats.maxHp || character.stats.maxHp || 100));
    const mp = Math.max(0, Math.round(character.stats.mp ?? 0));
    const maxMp = Math.max(1, Math.round(finalStats.maxMp || character.stats.maxMp || 50));
    const exp = Math.max(0, Math.round(character.currentExp ?? 0));
    const maxExp = Math.max(1, Math.round(character.maxExp || 100));
    const fatigue = Math.max(0, Math.min(100, Math.round(character.fatigue ?? 0)));
    const statusEffects = (character.statusEffects || []).filter(Boolean);

    const hpPct = Math.min(100, (hp / maxHp) * 100);
    const mpPct = Math.min(100, (mp / maxMp) * 100);
    const expPct = Math.min(100, (exp / maxExp) * 100);

    return (
        <div
            className={`px-2.5 py-2 rounded-xl bg-slate-950/88 border border-slate-700/80 shadow-lg backdrop-blur-sm text-[10px] text-slate-200 space-y-1.5 pointer-events-none select-none w-[268px] ${className}`}
        >
            <div className="flex items-center justify-between gap-1.5 font-black">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300">
                        Lv.{character.level}
                    </span>
                    <span className="text-slate-300 font-bold truncate">{character.age || '?'}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-bold">
                    <span className="text-yellow-300">{(character.money || 0).toLocaleString()}G</span>
                    <span className={fatigue >= 80 ? 'text-rose-400' : fatigue >= 50 ? 'text-amber-300' : 'text-emerald-300'}>
                        피로 {fatigue}%
                    </span>
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[9px] font-bold text-rose-300 shrink-0">HP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-rose-600 to-red-400" style={{ width: `${hpPct}%` }} />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-slate-300 min-w-[78px] text-right shrink-0">
                        {hp}/{maxHp}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[9px] font-bold text-sky-300 shrink-0">MP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${mpPct}%` }} />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-slate-300 min-w-[78px] text-right shrink-0">
                        {mp}/{maxMp}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[9px] font-bold text-emerald-300 shrink-0">EXP</span>
                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-lime-400" style={{ width: `${expPct}%` }} />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-slate-400 min-w-[78px] text-right shrink-0">
                        {exp}/{maxExp}
                    </span>
                </div>
            </div>

            {statusEffects.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5 border-t border-slate-800/80">
                    {statusEffects.slice(0, 4).map((eff: any, idx: number) => (
                        <span
                            key={eff.id || `${eff.type}_${idx}`}
                            className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-rose-200 text-[9px] font-bold"
                        >
                            ⚠ {eff.name || eff.type}
                            {eff.duration ? ` (${eff.duration})` : ''}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
