import React, { memo } from 'react';
import { Enemy, Skill } from '../../types';
import { Skull, Mountain, Eclipse, Sun, Moon, Leaf, Wind, Hammer, Droplets, Star, Flame, Zap, Snowflake, Activity, Sword } from 'lucide-react';
import { SHINRYOKU_AFFINITY, SHINRYOKU_UI_CONFIG } from '../../constants';
import { HealthBar } from './HealthBar';
import { CombatStatusBadge } from './CombatStatusBadge';
import { FloatingFeedbackOverlay, FloatingFeedbackItem } from './FloatingFeedbackOverlay';
import { getMonsterInfo } from '../../monsterfield';

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

interface EnemyCardProps {
    enemy: Enemy;
    onClick?: () => void;
    selectable?: boolean;
    playerType?: string;
    floatingTexts?: FloatingFeedbackItem[];
    isHit?: boolean;
    skills?: Skill[];
}

const EnemyCardComponent = ({ 
    enemy, 
    onClick, 
    selectable, 
    playerType, 
    floatingTexts, 
    isHit, 
    skills 
}: EnemyCardProps) => {
    const isBoss = enemy.isBoss || enemy.name.includes('보스') || enemy.name.includes('BOSS') || (enemy.level && enemy.level >= 50);
    const isLowHp = enemy.hp > 0 && enemy.maxHp > 0 && (enemy.hp / enemy.maxHp) <= 0.2;
    const isBossEnraged = isBoss && isLowHp;
    const TypeIcon = enemy.shinryokuType ? SHINRYOKU_ICONS[enemy.shinryokuType] : null;
    const effectiveVisualUrl = enemy.visualUrl || (enemy.name ? getMonsterInfo(enemy.name).visualUrl : undefined);
    
    let affinityBadge = null;
    if (playerType && enemy.shinryokuType) {
        const playerAffinity = SHINRYOKU_AFFINITY[playerType];
        const strongList = playerAffinity?.strong || [];
        const weakList = playerAffinity?.weak || [];
        if (strongList.includes(enemy.shinryokuType)) {
            affinityBadge = (
                <span className="absolute top-0 left-0 bg-green-500 text-slate-950 text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-br z-20 shadow-md">
                    약점
                </span>
            );
        } else if (weakList.includes(enemy.shinryokuType)) {
            affinityBadge = (
                <span className="absolute top-0 left-0 bg-red-500 text-white text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-br z-20 shadow-md">
                    저항
                </span>
            );
        }
    }

    return (
        <div 
            onClick={enemy.hp > 0 ? onClick : undefined}
            className={`bg-slate-900/90 border p-1 sm:p-1.5 md:p-2 rounded-lg md:rounded-xl flex flex-col items-center justify-between relative transition-all shadow-md group ${
                enemy.hp <= 0 
                    ? 'border-slate-800 opacity-50 grayscale' 
                    : isBossEnraged
                    ? 'border-red-600 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                    : isBoss 
                    ? 'border-amber-500/60 shadow-amber-950/20' 
                    : 'border-red-900/40 hover:border-red-500/50'
            } ${selectable ? 'cursor-pointer ring-2 ring-amber-400 scale-[1.02]' : ''} ${isHit && enemy.hp > 0 ? 'animate-shake !bg-red-950/60 !border-red-500' : ''}`}
        >
            <FloatingFeedbackOverlay items={floatingTexts} />
            {affinityBadge}
            {isBoss && enemy.hp > 0 && (
                <span className={`absolute top-0 right-0 ${isBossEnraged ? 'bg-red-600 text-white' : 'bg-amber-600 text-slate-900'} text-[7px] sm:text-[8px] md:text-[10px] px-1.5 py-0.2 md:px-2 md:py-0.5 rounded-bl font-black z-20 shadow-md`}>
                    {isBossEnraged ? '보스 [위기]' : '보스'}
                </span>
            )}
            {enemy.hp <= 0 && <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-lg md:rounded-xl"><Skull size={isBoss ? 28 : 20} className="text-slate-500 md:size-8" /></div>}
            {selectable && <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-900 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-md">대상</div>}
            
            {enemy.statusEffects && enemy.statusEffects.length > 0 && (
                <div className="absolute -top-1.5 left-0 right-0 flex flex-wrap justify-center gap-0.5 z-30 px-0.5">
                    {enemy.statusEffects.map((s, i) => <CombatStatusBadge key={i} status={s} skills={skills} />)}
                </div>
            )}

            <div className="mb-0.5 md:mb-1.5 relative w-full flex flex-col items-center mt-0.5">
                {effectiveVisualUrl ? (
                    <div className={`${isBoss ? 'w-14 h-14 sm:w-20 sm:h-20 md:w-32 md:h-32' : 'w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24'} mb-0.5 md:mb-1 rounded-md md:rounded-lg overflow-hidden border border-slate-700 bg-black/40 relative shadow-inner`}>
                        <img 
                            src={effectiveVisualUrl} 
                            alt={enemy.name} 
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105" 
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        {TypeIcon && (
                            <div className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 p-0.5 bg-black/60 rounded-full border border-white/10">
                                <TypeIcon size={isBoss ? 11 : 9} className="text-slate-200 md:size-3.5" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`${isBoss ? 'h-14 sm:h-20 md:h-32' : 'h-12 sm:h-16 md:h-24'} flex items-center justify-center`}>
                        {TypeIcon ? (
                            <div className="relative">
                                <Skull size={isBoss ? 28 : 20} className="text-red-500 opacity-50 md:size-8" />
                                <TypeIcon size={isBoss ? 16 : 12} className="absolute inset-0 m-auto text-slate-200 drop-shadow-md md:size-5" />
                            </div>
                        ) : (
                            <Skull size={isBoss ? 28 : 20} className="text-red-500 opacity-80 md:size-8" />
                        )}
                    </div>
                )}
            </div>

            <div className="text-center mb-0.5 md:mb-1.5 w-full">
                <h3 className="font-bold text-slate-200 text-[8.5px] sm:text-[9.5px] md:text-xs leading-tight line-clamp-1 md:line-clamp-2">{enemy.name}</h3>
                <div className="flex justify-center items-center gap-0.5 md:gap-1 mt-0.5 flex-wrap">
                    <span className="text-[7px] md:text-[8px] text-slate-500 bg-slate-950 px-1 py-0.2 md:py-0.5 rounded border border-slate-800">
                        Lv.{enemy.level || '?'}
                    </span>
                    {enemy.shinryokuType && (() => {
                        const eElemCfg = SHINRYOKU_UI_CONFIG[enemy.shinryokuType] || SHINRYOKU_UI_CONFIG.default;
                        return (
                            <span className={`text-[7px] md:text-[8.5px] font-bold px-1.5 py-0.2 md:py-0.5 rounded border ${eElemCfg.bg} ${eElemCfg.text} ${eElemCfg.border} whitespace-nowrap shadow-sm`}>
                                속성: {enemy.shinryokuType}
                            </span>
                        );
                    })()}
                </div>
            </div>

            <div className="w-full">
                <HealthBar 
                    current={enemy.hp} 
                    max={enemy.maxHp} 
                    shield={enemy.statusEffects?.filter(s => s.name === '마나 쉴드' || s.name === '마나 쉴드 (패시브)').reduce((acc, curr) => acc + (curr.val || 0), 0) || 0}
                    label="HP"
                />
            </div>
        </div>
    );
};

const areEnemyCardPropsEqual = (prev: EnemyCardProps, next: EnemyCardProps): boolean => {
    if (prev.enemy.hp !== next.enemy.hp) return false;
    if (prev.enemy.maxHp !== next.enemy.maxHp) return false;
    if (prev.selectable !== next.selectable) return false;
    if (prev.isHit !== next.isHit) return false;
    if (prev.playerType !== next.playerType) return false;
    if (prev.enemy.name !== next.enemy.name) return false;
    if (prev.enemy.level !== next.enemy.level) return false;
    if (prev.enemy.shinryokuType !== next.enemy.shinryokuType) return false;

    // 상태이상 비교
    const prevStatusLen = prev.enemy.statusEffects?.length || 0;
    const nextStatusLen = next.enemy.statusEffects?.length || 0;
    if (prevStatusLen !== nextStatusLen) return false;
    if (prevStatusLen > 0) {
        for (let i = 0; i < prevStatusLen; i++) {
            const p = prev.enemy.statusEffects![i];
            const n = next.enemy.statusEffects![i];
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

export const EnemyCard = memo(EnemyCardComponent, areEnemyCardPropsEqual);
