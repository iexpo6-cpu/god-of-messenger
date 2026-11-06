import React, { memo } from 'react';
import { ActiveStatus, Skill } from '../../types';
import { Skull, User, Flame, Star, Zap, Snowflake, Mountain, Eclipse, Sword, Activity, Droplets, Wind, Hammer, Sun, Moon, Leaf, Crown, Target } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG } from '../../constants';
import { HealthBar } from './HealthBar';
import { CombatStatusBadge } from './CombatStatusBadge';
import { FloatingFeedbackOverlay, FloatingFeedbackItem } from './FloatingFeedbackOverlay';

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

interface PartyCardProps {
    name: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    isActive: boolean;
    isPlayer?: boolean;
    onCommand?: () => void;
    onClick?: () => void;
    selectable?: boolean;
    level?: number;
    shinryokuType?: string;
    statusEffects?: ActiveStatus[];
    classType?: string;
    visualUrl?: string;
    unusableLabel?: string;
    speechBubble?: string;
    personality?: string;
    mountName?: string;
    mountVisualUrl?: string;
    onMountClick?: () => void;
    floatingTexts?: FloatingFeedbackItem[];
    isHit?: boolean;
    skills?: Skill[];
}

const PartyCardComponent = ({ 
    name, 
    hp, 
    maxHp, 
    mp, 
    maxMp, 
    isActive, 
    isPlayer, 
    onClick, 
    selectable,
    level, 
    shinryokuType, 
    statusEffects, 
    classType, 
    visualUrl, 
    unusableLabel, 
    mountName, 
    mountVisualUrl, 
    onMountClick, 
    floatingTexts, 
    isHit, 
    skills 
}: PartyCardProps) => {
    const isDead = hp <= 0;
    const isLowHp = hp > 0 && maxHp > 0 && (hp / maxHp) <= 0.25;
    const TypeIcon = shinryokuType && shinryokuType !== "미개방" ? SHINRYOKU_ICONS[shinryokuType] : null;

    return (
        <div 
            onClick={!unusableLabel ? onClick : undefined}
            className={`bg-slate-900/90 border p-1.5 sm:p-2 rounded-lg md:rounded-xl flex flex-col justify-between relative transition-all shadow-md group w-full ${
                isDead 
                    ? 'border-slate-800 opacity-60 grayscale' 
                    : isActive
                    ? 'border-amber-400 ring-2 ring-amber-400/90 shadow-[0_0_10px_rgba(251,191,36,0.35)] bg-slate-900/95'
                    : isLowHp
                    ? 'border-red-500/80 ring-1 ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                    : isPlayer 
                    ? 'border-amber-500/50 hover:border-amber-400/70 shadow-amber-950/20' 
                    : 'border-slate-700/60 hover:border-cyan-500/50 shadow-cyan-950/10'
            } ${selectable && !unusableLabel ? 'cursor-pointer ring-2 ring-emerald-400 scale-[1.02]' : ''} ${unusableLabel ? 'opacity-50 grayscale' : ''} ${selectable && isDead && !unusableLabel ? 'ring-2 ring-amber-400' : ''} ${isHit && !isDead ? 'animate-shake !bg-red-950/70 !border-red-500' : ''}`}
        >
            <FloatingFeedbackOverlay items={floatingTexts} />

            {/* Top-Right Badge: Turn Active or Player Role */}
            {isActive && !isDead ? (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[6.5px] sm:text-[7.5px] md:text-[8.5px] px-1.5 py-0.2 rounded font-black z-20 shadow-md flex items-center gap-0.5">
                    <Zap size={8} className="fill-slate-950" />
                    턴
                </span>
            ) : isPlayer ? (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[6.5px] sm:text-[7px] md:text-[8px] px-1.5 py-0.2 rounded font-black z-20 shadow-sm flex items-center gap-0.5">
                    <Crown size={8} />
                    플레이어
                </span>
            ) : null}

            {/* Top-Left Badge: Select Target / Resurrect / Crisis */}
            {selectable && !unusableLabel ? (
                <span className={`absolute -top-1.5 -left-1.5 text-slate-950 text-[6.5px] md:text-[8px] font-black px-1.5 py-0.2 rounded-full z-30 shadow-lg flex items-center gap-0.5 ${isDead ? 'bg-amber-400' : 'bg-emerald-400'}`}>
                    <Target size={8} />
                    {isDead ? '부활' : '선택'}
                </span>
            ) : !selectable && isLowHp && !isDead ? (
                <span className="absolute -top-1 -left-1 bg-red-600 text-white text-[6px] md:text-[7px] font-black px-1 py-0.2 rounded z-20 shadow-sm">
                    위기
                </span>
            ) : null}

            {/* Unusable / Inactive Filter Overlay */}
            {unusableLabel && (
                <div className="absolute inset-0 bg-black/60 z-[35] flex items-center justify-center rounded-lg border border-red-500/30">
                    <span className="text-red-400 font-bold text-[6.5px] md:text-[8.5px] bg-black/80 px-1 py-0.5 rounded border border-red-900/50">
                        {unusableLabel}
                    </span>
                </div>
            )}

            {/* KO Overlay */}
            {isDead && !unusableLabel && (
                <div className="absolute inset-0 bg-black/75 z-20 flex flex-col items-center justify-center rounded-lg">
                    {selectable ? (
                        <div className="flex flex-col items-center gap-0.5 text-amber-300 font-bold text-[7.5px] md:text-[9px]">
                            <Star size={14} className="text-amber-400" />
                            <span>부활 대상</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-0.5 text-red-500 font-black">
                            <Skull size={16} className="text-red-500 drop-shadow" />
                            <span className="text-[7px] md:text-[8px] tracking-wider leading-none">행동 불능</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Effects Badges */}
            {statusEffects && statusEffects.length > 0 && (
                <div className="absolute -top-2 left-0 right-0 flex flex-wrap justify-center gap-0.5 z-30 px-0.5">
                    {statusEffects.map((s, i) => <CombatStatusBadge key={i} status={s} skills={skills} />)}
                </div>
            )}

            {/* Header: Avatar + Identity Side-by-Side */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0 mb-1">
                {/* Visual Avatar */}
                <div className="w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-lg overflow-hidden border border-slate-700 bg-black/60 relative shrink-0 shadow-inner">
                    {visualUrl ? (
                        <img 
                            src={visualUrl} 
                            alt={name} 
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105 ${isDead ? 'grayscale' : ''}`} 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-950/80">
                            {TypeIcon ? (
                                <TypeIcon size={18} className="text-cyan-400/80" />
                            ) : (
                                <User size={18} className="text-slate-500" />
                            )}
                        </div>
                    )}
                    
                    {/* Mount Badge on bottom-left */}
                    {mountVisualUrl && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onMountClick) onMountClick();
                            }}
                            className="absolute bottom-0 left-0 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-amber-400 bg-slate-950 overflow-hidden shadow z-20 cursor-pointer hover:scale-105 transition-transform"
                            title={`장착 탈것: ${mountName}`}
                        >
                            <img 
                                src={mountVisualUrl} 
                                alt={mountName} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    )}

                    {/* Shinryoku Element Icon on bottom-right */}
                    {TypeIcon && visualUrl && (
                        <div className="absolute bottom-0 right-0 p-0.5 bg-black/80 rounded-tl border-t border-l border-white/20 shadow-sm" title={`신력 속성: ${shinryokuType}`}>
                            <TypeIcon size={9} className="text-cyan-300" />
                        </div>
                    )}
                </div>

                {/* Name & Identity */}
                <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                    <h4 className={`font-bold text-[8px] sm:text-[9px] md:text-[10px] leading-tight truncate ${
                        isPlayer ? 'text-amber-300 group-hover:text-amber-200' : 'text-slate-200 group-hover:text-cyan-200'
                    }`} title={name}>
                        {name}
                    </h4>
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap mt-0.5">
                        {level !== undefined && (
                            <span className="text-[6px] sm:text-[6.5px] md:text-[7.5px] text-slate-400 font-mono leading-none">
                                Lv.{level}
                            </span>
                        )}
                        {shinryokuType && shinryokuType !== "미개방" && (() => {
                            const elemCfg = SHINRYOKU_UI_CONFIG[shinryokuType] || SHINRYOKU_UI_CONFIG.default;
                            return (
                                <span className={`text-[5.5px] sm:text-[6px] md:text-[7px] font-bold px-1 py-0.2 rounded border ${elemCfg.bg} ${elemCfg.text} ${elemCfg.border} leading-none whitespace-nowrap`}>
                                    {shinryokuType.replace('계', '')}
                                </span>
                            );
                        })()}
                        {classType && (
                            <span className="hidden sm:inline-block text-[5.5px] sm:text-[6px] md:text-[7px] text-amber-400/80 bg-amber-950/40 border border-amber-800/30 px-1 py-0.2 rounded truncate max-w-[48px] md:max-w-[65px] leading-none" title={classType}>
                                {classType}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* HP & MP HealthBars */}
            <div className="w-full space-y-0.5">
                <HealthBar 
                    current={hp} 
                    max={maxHp} 
                    shield={statusEffects?.filter(s => s.name === '마나 쉴드' || s.name === '마나 쉴드 (패시브)').reduce((acc, curr) => acc + (curr.val || 0), 0) || 0}
                    label="HP"
                    compact
                />
                <HealthBar 
                    current={mp} 
                    max={maxMp} 
                    color="bg-blue-600" 
                    label="MP" 
                    compact
                />
            </div>
        </div>
    );
};

// 태블릿 화면 렉을 없애기 위한 정밀 변경 감지 비교자 (변경된 카드만 렌더링)
const arePartyCardPropsEqual = (prev: PartyCardProps, next: PartyCardProps): boolean => {
    if (prev.hp !== next.hp) return false;
    if (prev.maxHp !== next.maxHp) return false;
    if (prev.mp !== next.mp) return false;
    if (prev.maxMp !== next.maxMp) return false;
    if (prev.isActive !== next.isActive) return false;
    if (prev.selectable !== next.selectable) return false;
    if (prev.isHit !== next.isHit) return false;
    if (prev.unusableLabel !== next.unusableLabel) return false;
    if (prev.mountName !== next.mountName) return false;
    if (prev.mountVisualUrl !== next.mountVisualUrl) return false;
    if (prev.name !== next.name) return false;
    if (prev.level !== next.level) return false;
    if (prev.shinryokuType !== next.shinryokuType) return false;

    // 상태이상 비교
    const prevStatusLen = prev.statusEffects?.length || 0;
    const nextStatusLen = next.statusEffects?.length || 0;
    if (prevStatusLen !== nextStatusLen) return false;
    if (prevStatusLen > 0) {
        for (let i = 0; i < prevStatusLen; i++) {
            const p = prev.statusEffects![i];
            const n = next.statusEffects![i];
            if (p.name !== n.name || p.duration !== n.duration || p.val !== n.val) {
                return false;
            }
        }
    }

    // 부동 피드백 텍스트 비교
    const prevFtLen = prev.floatingTexts?.length || 0;
    const nextFtLen = next.floatingTexts?.length || 0;
    if (prevFtLen !== nextFtLen) return false;
    if (prevFtLen > 0) {
        if (prev.floatingTexts![0]?.id !== next.floatingTexts![0]?.id) return false;
    }

    return true;
};

export const PartyCard = memo(PartyCardComponent, arePartyCardPropsEqual);
