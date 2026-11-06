import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { throttleFloatingItems } from '../../services/combatLagOptimizer';

export interface FloatingFeedbackItem {
    id: string;
    text: string;
    type: 'damage' | 'heal' | 'crit' | 'buff' | 'debuff' | 'miss';
    rawText?: string;
}

interface FloatingFeedbackOverlayProps {
    items?: FloatingFeedbackItem[];
}

export const FloatingFeedbackOverlay: React.FC<FloatingFeedbackOverlayProps> = memo(({ items }) => {
    // 동시 애니메이션 노드를 최대 4~5개로 엄격히 제한하여 GPU/CPU 프레임 드랍 원천 방지
    const optimizedItems = useMemo(() => {
        return throttleFloatingItems(items, 4);
    }, [items]);

    if (!optimizedItems || optimizedItems.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-[60] flex items-center justify-center overflow-visible">
            <AnimatePresence>
                {optimizedItems.map(item => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10, scale: 0.7 }}
                        animate={{ opacity: 1, y: -20, scale: [0.7, 1.15, 1.0] }}
                        exit={{ opacity: 0, y: -35, scale: 0.85 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        title={item.rawText || item.text}
                        className={`absolute font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none whitespace-nowrap pointer-events-auto cursor-help ${
                            item.type === 'damage' ? 'text-red-400 text-xs md:text-base' :
                            item.type === 'crit' ? 'text-amber-300 text-sm md:text-lg font-black' :
                            item.type === 'heal' ? 'text-emerald-300 text-xs md:text-base font-bold' :
                            item.type === 'buff' ? 'text-cyan-300 text-[9px] md:text-xs font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-400/60 shadow-md' :
                            item.type === 'miss' ? 'text-slate-400 text-xs md:text-base font-black tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-600/50 shadow-md' :
                            'text-purple-300 text-[9px] md:text-xs font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-purple-400/60 shadow-md'
                        }`}
                    >
                        {item.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
});
