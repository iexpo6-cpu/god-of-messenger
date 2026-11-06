import React, { useState } from 'react';
import { formatCompactKorean } from '../../utils';

interface HealthBarProps {
    current: number;
    max: number;
    color?: string;
    shield?: number;
    label?: string;
    compact?: boolean;
}

export const HealthBar = ({ 
    current, 
    max, 
    color = 'bg-red-600', 
    shield = 0, 
    label, 
    compact = false 
}: HealthBarProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const safeMax = max > 0 ? max : 100;
    const safeCurrent = isNaN(current) ? 0 : Math.max(0, current);
    const safeShield = isNaN(shield) ? 0 : Math.max(0, shield);
    
    const percent = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
    const shieldPercent = Math.max(0, Math.min(100, (safeShield / safeMax) * 100));
    const ratioPercent = ((safeCurrent / safeMax) * 100).toFixed(1);

    const formattedCurrent = formatCompactKorean(safeCurrent);
    const formattedMax = formatCompactKorean(safeMax);
    const formattedShield = safeShield > 0 ? formatCompactKorean(safeShield) : null;

    const fullCurrentStr = Math.floor(safeCurrent).toLocaleString();
    const fullMaxStr = Math.floor(safeMax).toLocaleString();
    const fullShieldStr = safeShield > 0 ? Math.floor(safeShield).toLocaleString() : null;

    const titleText = `${label ? `[${label}] ` : ''}${fullCurrentStr} / ${fullMaxStr} (${ratioPercent}%)${fullShieldStr ? ` (+${fullShieldStr} 쉴드)` : ''}`;

    return (
        <div 
            className="relative w-full select-none"
            onClick={(e) => { 
                e.stopPropagation(); 
                setShowTooltip(prev => !prev); 
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title={titleText}
        >
            <div className={`${compact ? 'h-2.5 md:h-3.5' : 'h-2.5 md:h-4'} w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/80 relative shadow-inner cursor-pointer`}>
                {/* Main Gauge Fill */}
                <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${percent}%` }}></div>
                
                {/* Mana Shield Overlay */}
                {safeShield > 0 && (
                    <div 
                        className="h-full bg-cyan-400/80 transition-all duration-300 ease-out absolute top-0 left-0 opacity-80 border-r border-cyan-200 shadow-[0_0_6px_rgba(6,182,212,0.6)]" 
                        style={{ width: `${shieldPercent}%` }}
                    ></div>
                )}

                {/* Korean Compact Number Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-[6.5px] sm:text-[7.5px] md:text-[8.5px]' : 'text-[7px] md:text-[9px]'} font-mono font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none z-10 px-0.5 whitespace-nowrap overflow-hidden`}>
                    <span className="truncate flex items-center gap-0.5">
                        <span>{formattedCurrent}</span>
                        {formattedShield && <span className="text-cyan-300 font-bold">(+{formattedShield})</span>}
                        <span className="text-slate-300 font-normal">/</span>
                        <span>{formattedMax}</span>
                    </span>
                </div>
            </div>

            {/* Mobile / Desktop Detailed Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-950/95 border border-slate-700 rounded-md shadow-2xl text-[9px] md:text-[10px] text-slate-200 z-[120] pointer-events-none whitespace-nowrap backdrop-blur animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-1 font-mono">
                        <span className="font-bold text-amber-300">{label || (color.includes('blue') ? 'MP' : 'HP')}</span>
                        <span>{fullCurrentStr}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-300">{fullMaxStr}</span>
                        <span className="text-emerald-400 font-bold text-[8px] md:text-[9px]">({ratioPercent}%)</span>
                    </div>
                    {fullShieldStr && (
                        <div className="text-cyan-300 font-mono text-[8px] md:text-[9px] flex items-center gap-0.5 mt-0.5 border-t border-slate-800 pt-0.5">
                            <span>🛡️ 마나 쉴드:</span>
                            <span className="font-bold">+{fullShieldStr}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
