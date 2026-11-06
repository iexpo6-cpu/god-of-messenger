import React, { useState, memo } from 'react';
import { ActiveStatus, Skill, SkillType } from '../../types';
import { Skull, Sword, Shield, Zap, Sparkles, Wind, X, Flame, Heart, AlertCircle, ArrowUpCircle, Package, Hammer, Sun, Moon, Leaf, Droplets, Activity } from 'lucide-react';
import { STATUS_AILMENTS_LIST } from '../../constants';
import { isRealTimeElixir } from '../../services/elixirService';

const BASE_ICONS = [
  { name: 'Sword', icon: Sword },
  { name: 'Zap', icon: Zap },
  { name: 'Shield', icon: Shield },
  { name: 'Skull', icon: Skull },
  { name: 'Flame', icon: Flame },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'Waves', icon: Droplets },
  { name: 'Wind', icon: Wind },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
];

interface CombatStatusBadgeProps {
    status: ActiveStatus;
    skills?: Skill[];
}

export const CombatStatusBadge = memo(({ status, skills }: CombatStatusBadgeProps) => {
    const [show, setShow] = useState(false);
    
    if (!status.name || status.name === 'None') return null;
    
    if (['휴식', '완전 회복', '수면', '잠'].some(k => status.name.includes(k))) return null;
    const isDebuff = STATUS_AILMENTS_LIST.includes(status.name);
    
    const matchedSkill = status.imageUrl ? null : skills?.find(s => {
        if (!s) return false;
        if (s.name === status.name || status.name.includes(s.name) || s.name.includes(status.name)) return true;
        if (status.effect && (s.name.includes(status.effect) || status.effect.includes(s.name))) return true;
        if (s.description && status.name.length >= 2 && s.description.includes(status.name)) return true;
        return false;
    });

    const thumbnailImg = status.imageUrl || matchedSkill?.imageUrl;
    const thumbnailIcon = status.icon || matchedSkill?.icon || (matchedSkill as any)?.iconName;

    const getStatusIcon = (name: string) => {
        if (thumbnailImg) {
            return <img src={thumbnailImg} alt={name} className="w-full h-full object-cover rounded-xs" referrerPolicy="no-referrer" />;
        }
        if (thumbnailIcon) {
            const found = BASE_ICONS.find(bi => bi.name === thumbnailIcon);
            if (found) {
                const IconComp = found.icon;
                return <IconComp size={10} />;
            }
        }
        if (matchedSkill) {
            const DefaultIcon = matchedSkill.type === SkillType.PHYSICAL ? Sword : matchedSkill.type === SkillType.MAGIC ? Zap : matchedSkill.type === SkillType.BUFF ? Shield : matchedSkill.type === SkillType.DEBUFF ? Skull : Sparkles;
            return <DefaultIcon size={10} />;
        }
        if (name.includes('중독')) return <Skull size={10} />;
        if (name.includes('빙결')) return <Droplets size={10} className="text-cyan-300" />;
        if (name.includes('화상')) return <Flame size={10} className="text-orange-400" />;
        if (name.includes('감전')) return <Zap size={10} className="text-yellow-300" />;
        if (name.includes('출혈')) return <Droplets size={10} className="text-red-500" />;
        if (name.includes('침묵')) return <X size={10} className="text-slate-400" />;
        if (name.includes('속박')) return <Wind size={10} className="text-slate-500" />;
        if (name.includes('기절') || name.includes('마비')) return <Activity size={10} className="text-yellow-500" />;
        
        if (name.includes('드롭') || name.includes('전리품') || name.includes('Drop')) return <Package size={10} className="text-amber-400" />;
        if (name.includes('무기') || name.includes('Weapon')) return <Hammer size={10} className="text-orange-400" />;
        if (name.includes('스킬') || name.includes('Skill')) return <Zap size={10} className="text-indigo-400" />;
        if (name.includes('경험치') || name.includes('EXP')) return <Sparkles size={10} className="text-yellow-400" />;
        if (name.includes('비약')) return <Sparkles size={10} className="text-purple-400" />;
        if (name.includes('공격')) return <Sword size={10} />;
        if (name.includes('방어') || name.includes('호신')) return <Shield size={10} />;
        if (name.includes('가속') || name.includes('속도')) return <Zap size={10} />;
        if (name.includes('재생') || name.includes('회복')) return <Heart size={10} />;
        if (name.includes('마나 쉴드')) return <Shield size={10} className="text-indigo-400" />;
        
        return isDebuff ? <AlertCircle size={10} /> : <ArrowUpCircle size={10} />;
    };

    let border = 'border-slate-700';
    let bg = 'bg-slate-800/80';
    let text = 'text-slate-300';
    
    const isDiminished = Boolean(
        status.isDiminished || 
        status.effect?.includes('반감') || 
        status.name?.includes('반감')
    );

    if (isDebuff) {
        border = 'border-red-500/40';
        bg = 'bg-red-950/40';
        text = 'text-red-300';
        if (['빙결','속박','감전'].includes(status.name)) { 
            border = 'border-purple-500/40'; bg = 'bg-purple-950/40'; text = 'text-purple-300';
        }
    } else if (isDiminished) {
        border = 'border-amber-500/70';
        bg = 'bg-amber-950/50';
        text = 'text-amber-300';
    } else {
        border = 'border-blue-500/40';
        bg = 'bg-blue-950/40';
        text = 'text-blue-300';
        if (status.effect?.includes('HP') || status.effect?.includes('MP') || status.name.includes('재생')) { 
            border = 'border-green-500/40'; bg = 'bg-green-950/40'; text = 'text-green-300'; 
        }
    }

    const isElixir = isRealTimeElixir(status);
    const durationDisplay = status.duration && status.duration > 0 
        ? (isElixir ? `${Math.ceil(Number(status.duration) / 60)}m` : status.duration)
        : '';

    return (
        <div className="relative inline-block z-30 group shrink-0">
             <button 
                onClick={(e) => { e.stopPropagation(); setShow(!show); }} 
                onMouseEnter={() => !show && setShow(true)} 
                onMouseLeave={() => setShow(false)} 
                className={`relative w-5 h-5 md:w-6 md:h-6 rounded border flex items-center justify-center transition-all hover:scale-105 shadow-sm overflow-hidden ${border} ${bg} ${text}`}
             >
                 {getStatusIcon(status.name)}
                 {isDiminished && (
                     <span className="absolute -top-0.5 -left-0.5 bg-amber-600 text-[6px] md:text-[7px] px-0.5 rounded-br font-bold text-white z-10 shadow leading-none border-b border-r border-amber-400">
                         반감
                     </span>
                 )}
                 {durationDisplay && (
                     <span className="absolute -bottom-0.5 -right-0.5 bg-slate-950/90 text-[7px] md:text-[8px] px-0.5 py-0.2 rounded-tl border-t border-l border-slate-700/80 min-w-[10px] text-center font-mono font-bold leading-none text-amber-300 z-10 shadow">
                         {durationDisplay}
                     </span>
                 )}
             </button>
             {show && (
                 <div className={`absolute bottom-full mb-1 w-36 md:w-44 bg-slate-950 p-2 rounded-lg border z-[100] shadow-2xl left-1/2 -translate-x-1/2 ${border}`}>
                     <div className={`font-bold mb-1 border-b pb-1 ${text} border-slate-800 text-[10px] md:text-xs flex items-center justify-between gap-1`}>
                          <div className="flex items-center gap-1 min-w-0">
                              {thumbnailImg && <img src={thumbnailImg} alt="" className="w-3.5 h-3.5 rounded object-cover shrink-0" referrerPolicy="no-referrer" />}
                              <span className="truncate">{status.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                              {isDiminished ? (
                                  <span className="px-1 py-0.2 text-[7px] md:text-[8px] bg-amber-900/80 text-amber-300 border border-amber-500/50 rounded font-bold">
                                      {status.diminishedRate || 50}% 반감
                                  </span>
                              ) : status.rank === 1 ? (
                                  <span className="px-1 py-0.2 text-[7px] md:text-[8px] bg-blue-900/80 text-blue-300 border border-blue-500/50 rounded font-bold">
                                      최고 수치
                                  </span>
                              ) : null}
                              {durationDisplay && <span className="text-slate-400">{isElixir ? durationDisplay : `${durationDisplay}턴`}</span>}
                          </div>
                     </div>
                     <div className="text-slate-300 leading-tight break-keep text-[9px] md:text-[10px]">{status.effect}</div>
                     {isDiminished ? (
                         <div className="mt-1 text-[8px] md:text-[9px] text-amber-300 bg-amber-950/60 p-1 rounded border border-amber-700/50 font-medium leading-tight">
                             동일 스탯 중첩으로 {status.diminishedRate || 50}% 반감 적용 중 (가장 수치가 높은 버프가 100% 우선 적용)
                         </div>
                     ) : status.rank === 1 ? (
                         <div className="mt-1 text-[8px] md:text-[9px] text-blue-300 bg-blue-950/60 p-1 rounded border border-blue-700/50 font-medium leading-tight">
                             동일 스탯 계열 중 최고 수치로 100% 온전 적용 중
                         </div>
                     ) : null}
                 </div>
             )}
         </div>
     );
});
