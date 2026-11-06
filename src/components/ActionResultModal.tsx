import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

export interface ResultData {
    type: 'success' | 'failure' | 'destroy' | 'info' | 'levelup' | 'warning';
    title: string;
    message: string;
    items?: { label: string, before?: string | number, after: string | number, color?: string, isMastery?: boolean }[];
    continueText?: string;
    cancelText?: string;
}

interface Props {
    data: ResultData | null;
    onClose: () => void;
    onContinue?: () => void;
}

const ActionResultModal: React.FC<Props> = ({ data, onClose, onContinue }) => {
    if (!data) return null;

    const config = {
        success: { 
            color: 'text-emerald-400', 
            border: 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]', 
            bg: 'from-emerald-950/40 via-slate-900/90 to-slate-950/95', 
            icon: CheckCircle2,
            accentBg: 'bg-emerald-500/10 border-emerald-500/30'
        },
        failure: { 
            color: 'text-rose-400', 
            border: 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)]', 
            bg: 'from-rose-950/40 via-slate-900/90 to-slate-950/95', 
            icon: XCircle,
            accentBg: 'bg-rose-500/10 border-rose-500/30'
        },
        destroy: { 
            color: 'text-red-500', 
            border: 'border-red-600/50 shadow-[0_0_35px_rgba(220,38,38,0.3)]', 
            bg: 'from-red-950/50 via-slate-900/95 to-slate-950', 
            icon: ShieldAlert,
            accentBg: 'bg-red-500/10 border-red-500/30'
        },
        info: { 
            color: 'text-indigo-400', 
            border: 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]', 
            bg: 'from-indigo-950/40 via-slate-900/90 to-slate-950/95', 
            icon: TrendingUp,
            accentBg: 'bg-indigo-500/10 border-indigo-500/30'
        },
        levelup: { 
            color: 'text-amber-400', 
            border: 'border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.3)]', 
            bg: 'from-amber-950/40 via-slate-900/90 to-slate-950/95', 
            icon: Sparkles,
            accentBg: 'bg-amber-500/10 border-amber-500/30'
        },
        warning: { 
            color: 'text-yellow-400', 
            border: 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]', 
            bg: 'from-yellow-950/40 via-slate-900/90 to-slate-950/95', 
            icon: AlertTriangle,
            accentBg: 'bg-yellow-500/10 border-yellow-500/30'
        },
    };

    const style = config[data.type] || config.info;
    const Icon = style.icon;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-sm bg-gradient-to-b ${style.bg} border rounded-2xl overflow-hidden shadow-2xl transition-all scale-100 ${style.border}`}>
                
                {/* Header Section */}
                <div className="p-5 sm:p-6 text-center border-b border-slate-800/80 relative overflow-hidden">
                    {/* Decorative glow in background */}
                    <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="flex justify-center mb-4">
                        <div className={`p-4 rounded-full ${style.accentBg} border flex items-center justify-center shadow-inner relative group`}>
                            {/* Outer pulsing ring */}
                            <span className="absolute inset-0 rounded-full bg-current opacity-10 animate-ping" />
                            <Icon size={40} className={`${style.color} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                        </div>
                    </div>
                    
                    <h2 className={`text-xl sm:text-2xl font-black ${style.color} tracking-tight mb-1.5`}>
                        {data.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium whitespace-pre-wrap leading-relaxed max-w-[280px] mx-auto">
                        {data.message}
                    </p>
                </div>

                {/* Items & Stats Section */}
                {data.items && data.items.length > 0 && (
                    <div className="px-5 sm:px-6 py-4 bg-slate-950/40">
                        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-3.5 space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar shadow-inner">
                            {data.items.map((item, idx) => {
                                const hasChange = item.before !== undefined;
                                const isPositive = hasChange && (Number(item.after) > Number(item.before));
                                const isValueOnly = !hasChange && typeof item.after === 'string' && (item.after.startsWith('+') || item.after.startsWith('-'));

                                return (
                                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/40 last:border-0">
                                        <span className="text-slate-400 font-bold shrink-0">{item.label}</span>
                                        <div className="flex items-center gap-1.5 font-mono text-right min-w-0">
                                            {item.before !== undefined && (
                                                <>
                                                    <span className="text-slate-500 font-semibold truncate max-w-[80px]">{item.before}</span>
                                                    <ArrowRight size={10} className="text-slate-600 shrink-0" />
                                                </>
                                            )}
                                            <span className={`font-black truncate max-w-[120px] ${
                                                item.color ? item.color :
                                                isValueOnly ? (item.after.toString().startsWith('+') ? 'text-emerald-400 text-sm' : 'text-rose-400') :
                                                hasChange ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 
                                                style.color
                                            }`}>
                                                {item.after}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer Buttons Section */}
                <div className="p-4 bg-slate-950 border-t border-slate-800/60 flex gap-2">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl font-bold transition-all active:scale-[0.98] text-xs sm:text-sm"
                    >
                        {data.cancelText || (onContinue ? '취소' : '닫기')}
                    </button>
                    {onContinue && (
                        <button 
                            onClick={onContinue}
                            className={`flex-1 py-3 px-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-[0.98] text-xs sm:text-sm ${
                                data.type === 'destroy' || data.type === 'failure' 
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-red-500/30' 
                                : data.type === 'warning'
                                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-500/30'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/30'
                            }`}
                        >
                            {data.continueText || '계속하기'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionResultModal;
