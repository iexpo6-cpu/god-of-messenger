import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Award, Coins, Sparkles, AlertCircle, Shield, User, ChevronRight, 
    Info, Flame, Swords, ShieldAlert, Heart, Zap, Sparkle, CircleDollarSign,
    Compass, Crown, Star
} from 'lucide-react';
import { Item, ItemRarity, CombatStyle } from '../types';
import { getItemDisplayImageUrl } from '../ItemData';
import { COMBAT_STYLE_CONFIG, COMBAT_STYLE_TIER_REQUIREMENTS } from '../constants';
import { isBossDetailedLoot, getBossDetailedLootInfo, isBossAnyDrop } from '../services/bossLootService';
import { isEquipmentItem } from '../services/bossLootBoostService';

export interface SkillState {
    name: string;
    level: number;
    currentMastery: number;
}

export interface WeaponMasteryState {
    type: string;
    level: number;
    currentExp: number;
}

export interface ParticipantState {
    id: string;
    name: string;
    level: number;
    currentExp: number;
    requiredExp: number;
    visualUrl?: string;
    targetCombatStyle?: string;
    combatStyle?: string;
    combatStyleProgress?: Record<string, { exp: number; monsterKills: number; bossKills: number }>;
    skills?: SkillState[];
    weaponMastery?: WeaponMasteryState[];
}

export interface CombatResultModalProps {
    data: {
        initialStates: ParticipantState[];
        finalStates: ParticipantState[];
        accumulatedExp: number;
        accumulatedGold: number;
        accumulatedLoot: Item[];
        isVictory: boolean;
        expMultiplier?: number;
        goldMultiplier?: number;
        expBonus?: number;
        goldBonus?: number;
        activeExpBuffs?: string[];
        activeGoldBuffs?: string[];
    } | null;
    onClose: () => void;
    onContinueBattle?: () => void;
}

const WEAPON_TYPE_KOREAN: Record<string, string> = {
    Sword: '검',
    Spear: '창',
    Blunt: '둔기',
    Axe: '도끼',
    Knuckle: '너클',
    Bow: '활',
    Crossbow: '석궁',
    Thrown: '투척무기',
    Firearm: '총기',
    Heavy: '중화기',
    Staff: '지팡이',
    Energy: '에너지체',
    Grimoire: '마도서',
    Shield: '방패',
    Orb: '보주',
    SubSword: '단검'
};

export const CombatResultModal: React.FC<CombatResultModalProps> = ({ data, onClose, onContinueBattle }) => {
    const [progressValues, setProgressValues] = useState<Record<string, number>>({});
    const [animateText, setAnimateText] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [selectedParticipantTab, setSelectedParticipantTab] = useState<'combatStyle' | 'weapon' | 'skills'>('combatStyle');

    useEffect(() => {
        if (data) {
            const timer = setTimeout(() => {
                setAnimateText(true);
                const values: Record<string, number> = {};
                data.finalStates.forEach((state) => {
                    const pct = Math.min(100, Math.max(0, (state.currentExp / state.requiredExp) * 100));
                    values[state.id] = pct;
                });
                setProgressValues(values);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setProgressValues({});
            setAnimateText(false);
            setSelectedItem(null);
        }
    }, [data]);

    if (!data) return null;

    const { isVictory, accumulatedExp, accumulatedGold, accumulatedLoot, initialStates, finalStates, expMultiplier = 1.0, goldMultiplier = 1.0, expBonus = 0, goldBonus = 0, activeExpBuffs = [], activeGoldBuffs = [] } = data;

    const getInitialState = (id: string) => {
        return initialStates.find(s => s.id === id);
    };

    // Rarity colors for combat cards
    const getRarityColor = (rarity?: ItemRarity) => {
        switch (rarity) {
            case ItemRarity.MYTHTIC: return 'border-red-500/50 bg-red-950/20 text-red-400 hover:border-red-400';
            case ItemRarity.LEGENDARY: return 'border-amber-500/50 bg-amber-950/20 text-amber-400 hover:border-amber-400';
            case ItemRarity.EPIC: return 'border-purple-500/50 bg-purple-950/20 text-purple-400 hover:border-purple-400';
            case ItemRarity.RARE: return 'border-blue-500/50 bg-blue-950/20 text-blue-400 hover:border-blue-400';
            default: return 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-600';
        }
    };

    const isBossSpecialLoot = (item: any) => {
        if (!item) return false;
        if (isBossDetailedLoot(item)) return true;
        if (isBossAnyDrop(item)) return true;
        return (
            item.rarity === ItemRarity.MYTHTIC || 
            item.rarity === ItemRarity.LEGENDARY || 
            item.isBossLoot === true ||
            item.isSpecial === true ||
            (item.name && (
                item.name.includes('보스') || 
                item.name.includes('영혼석') || 
                item.name.includes('정수') || 
                item.name.includes('신의 사자') ||
                item.name.includes('유물')
            ))
        );
    };

    // Item Type Translator
    const getTypeName = (type: string) => {
        const mapping: Record<string, string> = {
            Weapon: '무기',
            SubWeapon: '보조 무기',
            Head: '머리 방어구',
            Body: '상체 방어구',
            Feet: '신발',
            Hand: '장갑',
            Accessory: '장신구',
            Consumable: '소모품',
            Etc: '재료 및 기타'
        };
        return mapping[type] || type;
    };

    // Stat name Korean translation
    const getStatName = (key: string) => {
        const mapping: Record<string, string> = {
            hp: '체력',
            maxHp: '최대 체력',
            mp: '마나',
            maxMp: '최대 마나',
            str: '힘',
            int: '지능',
            wis: '지혜',
            def: '방어력',
            agi: '민첩',
            ctrl: '제어력'
        };
        return mapping[key] || key;
    };

    // Rarity text & style helpers for detail modal
    const getRarityDetails = (rarity?: ItemRarity) => {
        switch (rarity) {
            case ItemRarity.MYTHTIC: 
                return { 
                    text: '신화', 
                    colorClass: 'text-red-400', 
                    bgClass: 'bg-red-950/40 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                };
            case ItemRarity.LEGENDARY: 
                return { 
                    text: '전설', 
                    colorClass: 'text-amber-400', 
                    bgClass: 'bg-amber-950/40 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
                };
            case ItemRarity.EPIC: 
                return { 
                    text: '에픽', 
                    colorClass: 'text-purple-400', 
                    bgClass: 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]' 
                };
            case ItemRarity.RARE: 
                return { 
                    text: '레어', 
                    colorClass: 'text-blue-400', 
                    bgClass: 'bg-blue-950/40 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                };
            default: 
                return { 
                    text: '일반', 
                    colorClass: 'text-slate-300', 
                    bgClass: 'bg-slate-900/60 border-slate-800' 
                };
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`relative w-full max-w-lg bg-slate-950 border ${
                        isVictory ? 'border-emerald-500/30 shadow-emerald-950/20' : 'border-rose-950 shadow-rose-950/20'
                    } rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in duration-200`}
                >
                    {/* Header Decorative Background */}
                    <div className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b ${
                        isVictory ? 'from-emerald-950/40 to-transparent' : 'from-rose-950/40 to-transparent'
                    } pointer-events-none`} />

                    {/* Header */}
                    <div className="relative p-5 pb-3 flex items-center justify-between border-b border-slate-800/60 z-10 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${
                                isVictory ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                            }`}>
                                <Award size={20} className={isVictory ? "animate-pulse" : ""} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100 tracking-tight">전투 결과 보고서</h2>
                                <p className="text-xs text-slate-400">결투 및 대치 성과 내역</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-1.5 hover:bg-slate-900/80 rounded-lg text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 z-10 scrollbar-thin">
                        
                        {/* Battle Outcome Header Banner */}
                        <motion.div 
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`p-5 rounded-2xl border text-center ${
                                isVictory 
                                ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' 
                                : 'bg-rose-950/30 border-rose-500/20 text-rose-300'
                            }`}
                        >
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-slate-950/80 border border-slate-800">
                                {isVictory ? <Sparkles size={12} className="text-yellow-400" /> : <AlertCircle size={12} />}
                                {isVictory ? 'Victory' : 'Defeat'}
                            </div>
                            <h3 className="text-2xl font-black tracking-widest uppercase">
                                {isVictory ? '전 투 승 리' : '전 투 패 배'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {isVictory ? '모든 적을 격퇴하고 승리를 거머쥐었습니다!' : '체력이 소진되어 퇴각을 감행했습니다.'}
                            </p>
                        </motion.div>

                        {/* Gold & Base Exp Summary Card */}
                        {isVictory && (
                            <motion.div 
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex flex-col gap-3"
                            >
                                {/* Gold Card */}
                                <div className="bg-slate-900/60 border border-slate-800/75 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-amber-950/50 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                                <Coins size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    획득 골드 {(goldMultiplier > 1.0 || goldBonus > 0) ? '(골드 보너스/버프 적용됨)' : ''}
                                                </p>
                                                <p className="text-base font-bold text-amber-400">+{accumulatedGold.toLocaleString()}G</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {goldMultiplier > 1.0 && (
                                                <span className="text-[10px] bg-amber-950/90 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse shadow-sm">
                                                    <Sparkles size={11} className="text-amber-400" />
                                                    골드 버프 x{goldMultiplier}배
                                                </span>
                                            )}
                                            {goldBonus > 0 && (
                                                <span className="text-[10px] bg-amber-950/90 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-bold">
                                                    +{goldBonus}% 보너스
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {activeGoldBuffs.length > 0 && (
                                        <div className="pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[11px] text-amber-300">
                                            <span className="text-slate-400 font-medium text-[10px]">활성 보너스:</span>
                                            {activeGoldBuffs.map((buff, bIdx) => (
                                                <span key={`active-gold-buff-${bIdx}-${buff}`} className="bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-200 font-semibold text-[10px]">
                                                    💰 {buff}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Exp Card */}
                                <div className="bg-slate-900/60 border border-slate-800/75 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                                <Award size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    획득 총 EXP {(expMultiplier > 1.0 || expBonus > 0) ? '(경험치 보너스/버프 적용됨)' : ''}
                                                </p>
                                                <p className="text-base font-bold text-indigo-400">+{accumulatedExp.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {expMultiplier > 1.0 && (
                                                <span className="text-[10px] bg-purple-950/90 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse shadow-sm">
                                                    <Sparkles size={11} className="text-purple-400" />
                                                    경험치 버프 x{expMultiplier}배
                                                </span>
                                            )}
                                            {expBonus > 0 && (
                                                <span className="text-[10px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-bold">
                                                    +{expBonus}% 보너스
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {activeExpBuffs.length > 0 && (
                                        <div className="pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[11px] text-purple-300">
                                            <span className="text-slate-400 font-medium text-[10px]">활성 보너스:</span>
                                            {activeExpBuffs.map((buff, bIdx) => (
                                                <span key={`active-exp-buff-${bIdx}-${buff}`} className="bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded text-purple-200 font-semibold text-[10px]">
                                                    ✨ {buff}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Experience Progress List */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center pl-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">성장 및 경험치 획득 현황</h4>
                                <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-semibold animate-pulse">
                                    <Info size={11} /> 캐릭터 클릭 시 스킬/무기 숙련도 변화 확인
                                </span>
                            </div>
                            
                            <div className="space-y-3">
                                {finalStates.map((fState, index) => {
                                    const iState = getInitialState(fState.id) || fState;
                                    const hasLeveledUp = fState.level > iState.level;
                                    
                                    const initialPct = (iState.currentExp / iState.requiredExp) * 100;
                                    const finalPct = (fState.currentExp / fState.requiredExp) * 100;
                                    
                                    return (
                                        <motion.div 
                                            key={`${fState.id}-${index}`}
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.25 + index * 0.05 }}
                                            className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-3.5 transition-all relative overflow-hidden"
                                        >
                                            {/* Glow overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 pointer-events-none" />

                                            {/* Header */}
                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-indigo-400 flex items-center justify-center font-bold overflow-hidden border border-slate-700">
                                                        {fState.visualUrl ? (
                                                            <img src={fState.visualUrl} className="w-full h-full object-cover" alt={fState.name} referrerPolicy="no-referrer" />
                                                        ) : (
                                                            fState.id === 'player' ? <User size={16} /> : <Shield size={16} />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-sm text-slate-100">{fState.name}</span>
                                                    {fState.id === 'player' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-blue-400 font-semibold">리더</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-slate-400">Lv.{iState.level}</span>
                                                    {hasLeveledUp && (
                                                        <>
                                                            <ChevronRight size={12} className="text-slate-600" />
                                                            <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
                                                                Lv.{fState.level} 
                                                                <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1 rounded animate-bounce">UP</span>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Improved Progress Bar Container */}
                                            <div className="space-y-1.5 relative z-10">
                                                <div className="relative h-3 w-full bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden p-0.5 flex items-center">
                                                    {/* 1. Base EXP */}
                                                    {!hasLeveledUp && initialPct > 0 && (
                                                        <div 
                                                            className="h-full bg-slate-700 rounded-l-full transition-all shrink-0 z-10"
                                                            style={{ width: `${initialPct}%` }}
                                                        />
                                                    )}

                                                    {/* 2. Gained EXP */}
                                                    {hasLeveledUp ? (
                                                        <motion.div 
                                                            initial={{ width: `${initialPct}%` }}
                                                            animate={{ width: '100%' }}
                                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                                            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse"
                                                        />
                                                    ) : (
                                                        <motion.div 
                                                            initial={{ width: '0%' }}
                                                            animate={{ 
                                                                width: `${Math.max(0, (progressValues[fState.id] !== undefined ? progressValues[fState.id] : finalPct) - initialPct)}%` 
                                                            }}
                                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 border-l-2 border-white rounded-r-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse shrink-0"
                                                        />
                                                    )}
                                                </div>
                                                
                                                {/* EXP Details Text Comparison */}
                                                <div className="flex justify-between items-center text-[10px] px-0.5">
                                                    <div className="flex items-center gap-1.5 font-medium flex-wrap">
                                                        {hasLeveledUp ? (
                                                             <>
                                                                <span className="text-slate-400">이전: Lv.{iState.level} ({iState.currentExp}/{iState.requiredExp})</span>
                                                                <span className="text-slate-500">➔</span>
                                                                <span className="text-amber-300 font-bold">이후: Lv.{fState.level} ({fState.currentExp}/{fState.requiredExp} EXP)</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-slate-500">이전: {iState.currentExp}/{iState.requiredExp} ({Math.round(initialPct)}%)</span>
                                                                <span className="text-slate-600">➔</span>
                                                                <span className="text-slate-200 font-bold">이후: {fState.currentExp}/{fState.requiredExp} ({Math.round(progressValues[fState.id] !== undefined ? progressValues[fState.id] : finalPct)}%)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-emerald-400 font-extrabold bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            +{isVictory ? accumulatedExp.toLocaleString() : '0'} EXP
                                                            {expMultiplier > 1.0 && (
                                                                <span className="text-[9px] text-purple-300 font-bold"> (x{expMultiplier}배)</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 목표 전투 계열 수련 요약 카드 */}
                                                {(() => {
                                                    const targetStyle = fState.targetCombatStyle || iState.targetCombatStyle;
                                                    const fProgMap = fState.combatStyleProgress || {};
                                                    const iProgMap = iState.combatStyleProgress || {};
                                                    const fProg = (targetStyle && fProgMap[targetStyle]) || { exp: 0, monsterKills: 0, bossKills: 0 };
                                                    const iProg = (targetStyle && iProgMap[targetStyle]) || { exp: 0, monsterKills: 0, bossKills: 0 };
                                                    const expGained = Math.max(0, Number((fProg.exp - iProg.exp).toFixed(1)));
                                                    const killsGained = Math.max(0, (fProg.monsterKills || 0) - (iProg.monsterKills || 0));

                                                    const styleConfig = targetStyle ? COMBAT_STYLE_CONFIG[targetStyle as CombatStyle] : null;
                                                    const tier = styleConfig ? styleConfig.tier : 1;
                                                    const tierReq = COMBAT_STYLE_TIER_REQUIREMENTS[tier] || COMBAT_STYLE_TIER_REQUIREMENTS[1];
                                                    const reqExp = tierReq.reqExp;

                                                    const initialExpPct = Math.min(100, Math.max(0, (iProg.exp / reqExp) * 100));
                                                    const finalExpPct = Math.min(100, Math.max(0, (fProg.exp / reqExp) * 100));
                                                    const gainedExpPct = Math.min(100 - initialExpPct, Math.max(0, (expGained / reqExp) * 100));

                                                    if (targetStyle) {
                                                        return (
                                                            <div className="mt-2 pt-2 border-t border-slate-800/80 bg-indigo-950/30 -mx-1 px-3 py-2.5 rounded-lg border border-indigo-500/30 flex flex-col gap-2">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Zap size={14} className="text-amber-400 shrink-0" />
                                                                        <span className="text-[11px] font-bold text-slate-300">목표 계열:</span>
                                                                        <span className="text-[11px] font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                                                                            {targetStyle} ({tier}차)
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded flex items-center gap-1 ${
                                                                            expGained > 0 
                                                                                ? 'bg-amber-500/25 border border-amber-500/50 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse' 
                                                                                : 'bg-slate-800/80 border border-slate-700 text-slate-400'
                                                                        }`}>
                                                                            <Sparkles size={11} className={expGained > 0 ? 'text-amber-400' : 'text-slate-500'} />
                                                                            {expGained > 0 ? `+${expGained.toLocaleString()} 수련 EXP` : '+0 수련 EXP'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* 목표 수련 경험치 달성 % 게이지 및 시각적 변화 */}
                                                                <div className="space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800/90">
                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-slate-400 font-medium">
                                                                            수련 목표 달성률 ({tier}차 목표)
                                                                        </span>
                                                                        <span className="font-extrabold text-amber-300 font-mono">
                                                                            {finalExpPct.toFixed(1)}% <span className="text-slate-400 font-normal">({Number(fProg.exp.toFixed(1)).toLocaleString()} / {reqExp.toLocaleString()} EXP)</span>
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* 게이지 바: 기존(Indigo) + 이번 획득량(Amber Glow) */}
                                                                    <div className="relative h-2.5 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden flex items-center p-0.5">
                                                                        {initialExpPct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-indigo-600 rounded-l-full shrink-0"
                                                                                style={{ width: `${initialExpPct}%` }}
                                                                            />
                                                                        )}
                                                                        {expGained > 0 && (
                                                                            <motion.div 
                                                                                initial={{ width: '0%' }}
                                                                                animate={{ width: `${gainedExpPct}%` }}
                                                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                                                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-r-full shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse shrink-0"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="text-slate-500">누적:</span> 
                                                                        <span className="font-semibold text-slate-400">{Number(iProg.exp.toFixed(1)).toLocaleString()}</span>
                                                                        <span className="text-slate-600">➔</span>
                                                                        <span className="font-bold text-indigo-200">{Number(fProg.exp.toFixed(1)).toLocaleString()} EXP</span>
                                                                    </span>
                                                                    <span className="text-slate-400 font-medium">
                                                                        처치: <strong className="text-slate-200">{fProg.monsterKills || 0}</strong>/{tierReq.reqKills}마리
                                                                        {killsGained > 0 && <span className="text-emerald-400 ml-0.5 font-bold">(+{killsGained})</span>}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="mt-2 pt-1.5 border-t border-slate-800/40 flex justify-between items-center text-[10px] text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <AlertCircle size={11} className="text-slate-600" />
                                                                목표 전투 계열: <span className="text-slate-400">미설정</span>
                                                            </span>
                                                            <span className="text-[9px] text-slate-600">훈련소에서 목표 설정 가능</span>
                                                        </div>
                                                    );
                                                })()}

                                                {/* [NEW] 별도의 확인 액션 버튼 영역 */}
                                                <div className="pt-2 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedParticipantId(fState.id);
                                                            setSelectedParticipantTab('combatStyle');
                                                        }}
                                                        className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-950/60 to-indigo-950/60 hover:from-amber-900/80 hover:to-indigo-900/80 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                                                    >
                                                        <Zap size={13} className="text-amber-400 shrink-0" />
                                                        <span>목표 계열 수련 분석</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedParticipantId(fState.id);
                                                            setSelectedParticipantTab('weapon');
                                                        }}
                                                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500/40 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                                                    >
                                                        <Swords size={13} className="text-indigo-400 shrink-0" />
                                                        <span>스킬 / 숙련도 분석</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Loot Grid */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pl-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-amber-400" /> 수확한 전리품 목록
                                </h4>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Info size={11} /> 클릭 시 장비 세부정보 확인
                                </span>
                            </div>
                            
                            {accumulatedLoot.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                                    <p className="text-xs text-slate-500 font-medium">이번 전투에서 획득한 전리품이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {accumulatedLoot.map((item, idx) => {
                                        const imageUrl = getItemDisplayImageUrl(item);
                                        const isDetailed = isBossDetailedLoot(item);
                                        const bossMeta = getBossDetailedLootInfo(item);
                                        const isSpecial = isDetailed || isBossSpecialLoot(item);
                                        return (
                                        <motion.div
                                            key={`${item.id || item.name}-${idx}`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ 
                                                opacity: 1, 
                                                scale: 1,
                                                ...(isDetailed ? {
                                                    boxShadow: [
                                                        '0 0 10px rgba(245, 158, 11, 0.45), inset 0 0 8px rgba(245, 158, 11, 0.25)',
                                                        '0 0 24px rgba(251, 191, 36, 0.85), inset 0 0 16px rgba(251, 191, 36, 0.4)',
                                                        '0 0 10px rgba(245, 158, 11, 0.45), inset 0 0 8px rgba(245, 158, 11, 0.25)'
                                                    ]
                                                } : {})
                                            }}
                                            transition={{ 
                                                delay: 0.4 + Math.min(idx * 0.05, 0.4),
                                                ...(isDetailed ? {
                                                    boxShadow: {
                                                        repeat: Infinity,
                                                        duration: 2.2,
                                                        ease: 'easeInOut'
                                                    }
                                                } : {})
                                            }}
                                            onClick={() => setSelectedItem(item)}
                                            className={`border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-95 hover:shadow-xl transition-all group relative overflow-hidden ${
                                                isDetailed 
                                                ? 'border-2 border-amber-400 bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-900/50 ring-1 ring-amber-300/50' 
                                                : isSpecial 
                                                ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-red-950/30 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-1 ring-amber-500/20' 
                                                : getRarityColor(item.rarity)
                                            }`}
                                        >
                                            {/* [DetailedLoot 특별 효과 1] 대각선으로 부드럽게 흐르는 섬광 빔 스윕 효과 */}
                                            {isDetailed && (
                                                <motion.div
                                                    className="absolute inset-0 w-2/3 h-full bg-gradient-to-r from-transparent via-amber-200/25 to-transparent skew-x-[-25deg] pointer-events-none z-10"
                                                    initial={{ x: '-150%' }}
                                                    animate={{ x: '350%' }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        repeatType: 'loop',
                                                        duration: 2.4,
                                                        ease: 'easeInOut',
                                                        repeatDelay: 0.6
                                                    }}
                                                />
                                            )}

                                            {/* [DetailedLoot 특별 효과 2] 연속 반짝이는 별빛 파티클 1 (우상단) */}
                                            {isDetailed && (
                                                <motion.div
                                                    className="absolute -top-1 -right-1 text-amber-300 z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                                                    animate={{
                                                        scale: [0.8, 1.4, 0.8],
                                                        rotate: [0, 90, 180],
                                                        opacity: [0.6, 1, 0.6]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 1.8,
                                                        ease: 'easeInOut'
                                                    }}
                                                >
                                                    <Sparkles size={16} className="text-amber-300 fill-amber-300/30" />
                                                </motion.div>
                                            )}

                                            {/* [DetailedLoot 특별 효과 3] 연속 반짝이는 별빛 파티클 2 (좌상단) */}
                                            {isDetailed && (
                                                <motion.div
                                                    className="absolute top-1 left-1 text-yellow-200 z-20 pointer-events-none drop-shadow-[0_0_6px_rgba(253,224,71,0.8)]"
                                                    animate={{
                                                        scale: [0.6, 1.3, 0.6],
                                                        opacity: [0.3, 1, 0.3],
                                                        rotate: [0, -90, -180]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 2.2,
                                                        delay: 0.5,
                                                        ease: 'easeInOut'
                                                    }}
                                                >
                                                    <Sparkle size={11} className="text-yellow-200 fill-yellow-200/40" />
                                                </motion.div>
                                            )}

                                            {/* [DetailedLoot 특별 효과 4] 연속 반짝이는 별빛 파티클 3 (우하단) */}
                                            {isDetailed && (
                                                <motion.div
                                                    className="absolute bottom-1 right-2 text-amber-400 z-20 pointer-events-none drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                                                    animate={{
                                                        scale: [0.7, 1.3, 0.7],
                                                        opacity: [0.4, 1, 0.4]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 2.0,
                                                        delay: 1.0,
                                                        ease: 'easeInOut'
                                                    }}
                                                >
                                                    <Sparkles size={12} className="text-amber-400" />
                                                </motion.div>
                                            )}

                                            {/* 일반 보스 특수 전리품 광원 */}
                                            {!isDetailed && isSpecial && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent pointer-events-none animate-pulse" />
                                            )}
                                            {!isDetailed && isSpecial && (
                                                <div className="absolute -right-0.5 -top-0.5 text-amber-400 animate-pulse z-10">
                                                    <Sparkles size={13} />
                                                </div>
                                            )}

                                            {/* 전리품 이미지 박스: DetailedLoot일 때 회전 방사형 아우라 및 황금 테두리 */}
                                            <div className={`w-11 h-11 rounded-lg bg-slate-950 border flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-1 relative transition-colors ${
                                                isDetailed 
                                                ? 'border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.7)] group-hover:border-amber-200' 
                                                : isSpecial 
                                                ? 'border-amber-400/60 group-hover:border-amber-400' 
                                                : 'border-slate-700/80 group-hover:border-amber-500/60'
                                            }`}>
                                                {isDetailed && (
                                                    <motion.div
                                                        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/40 via-yellow-500/15 to-transparent pointer-events-none"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                                                    />
                                                )}
                                                <img 
                                                    src={imageUrl} 
                                                    alt={item.name} 
                                                    referrerPolicy="no-referrer"
                                                    className="w-full h-full object-contain drop-shadow relative z-10"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                        const fallback = document.getElementById(`loot-fallback-${idx}`);
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                                <div id={`loot-fallback-${idx}`} className="hidden items-center justify-center w-full h-full text-slate-400 relative z-10">
                                                    {item.type === 'Weapon' ? <Swords size={18} className="text-amber-400" /> :
                                                     item.type === 'SubWeapon' || item.type === 'Body' || item.type === 'Head' ? <Shield size={18} className="text-blue-400" /> :
                                                     item.type === 'Consumable' ? <Heart size={18} className="text-rose-400" /> :
                                                     <Sparkles size={18} className="text-purple-400" />}
                                                </div>
                                            </div>

                                            {/* 우측 아이템 정보 */}
                                            <div className="flex flex-col flex-1 min-w-0 justify-center">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span className={`text-[10px] truncate ${isDetailed ? 'text-amber-300 font-bold' : 'text-slate-400 font-semibold'}`}>
                                                            {getTypeName(item.type) || '아이템'}
                                                        </span>
                                                        {isDetailed && (
                                                            <span className="text-[9px] bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-200 border border-amber-400/60 font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0 shadow-sm animate-pulse">
                                                                <Crown size={9} className="text-amber-300" />
                                                                <span>{bossMeta?.bossName ? `${bossMeta.bossName} 전리품` : '보스 고유 전리품'}</span>
                                                            </span>
                                                        )}
                                                        {isEquipmentItem(item) && item.bossBoost && item.bossBoost.isBoosted && (
                                                            <span className="text-[9px] bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-400/70 font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0 shadow-sm animate-pulse">
                                                                <Sparkles size={9} className="text-amber-300" />
                                                                <span>부스트 {item.bossBoost.multiplier?.toFixed(item.bossBoost.multiplier % 1 === 0 ? 1 : 2)}배</span>
                                                            </span>
                                                        )}
                                                        {isEquipmentItem(item) && item.bossBoost && !item.bossBoost.isBoosted && (
                                                            <span className="text-[9px] bg-slate-900/80 text-slate-400 border border-slate-700 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                                                기본 전리품
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${
                                                        isDetailed 
                                                        ? 'bg-amber-950/90 border-amber-400/70 text-amber-300' 
                                                        : 'bg-slate-950/80 border-slate-800 text-slate-300'
                                                    }`}>
                                                        {item.rarity || '일반'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                                    <span className={`text-xs truncate transition-colors flex items-center gap-1 ${
                                                        isDetailed 
                                                        ? 'font-black text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover:text-white' 
                                                        : 'font-extrabold text-slate-100 group-hover:text-white'
                                                    }`}>
                                                        {isDetailed && (
                                                            <Sparkles size={11} className="text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                                                        )}
                                                        <span className="truncate">{item.name}</span>
                                                    </span>
                                                    {((item as any).amount || item.stock) && (((item as any).amount || item.stock || 0) > 1) && (
                                                        <span className="text-indigo-400 font-black text-xs shrink-0">
                                                            x{((item as any).amount || item.stock)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 shrink-0 z-10 flex flex-col sm:flex-row gap-2">
                        {onContinueBattle && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onContinueBattle();
                                }}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <Compass size={18} className="text-slate-950 shrink-0" />
                                <span>전투 계속하기</span>
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer text-center whitespace-nowrap ${
                                isVictory 
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white' 
                                : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-slate-200'
                            }`}
                        >
                            확인
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Sub-Modal: Item Detail Viewer (Fully Mobile-Optimized) */}
            <AnimatePresence>
                {selectedItem && (() => {
                    const isDetailedItem = isBossDetailedLoot(selectedItem);
                    const detailBossMeta = getBossDetailedLootInfo(selectedItem);
                    return (
                    <motion.div 
                        key={`item-detail-backdrop-${selectedItem.id || selectedItem.name}`} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
                    >
                        <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />
                        <motion.div
                            key={`item-detail-modal-${selectedItem.id || selectedItem.name}`}
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`relative w-full max-w-sm rounded-2xl bg-[#090d16] border p-5 flex flex-col space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto ${
                                isDetailedItem
                                ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-950/40 via-[#090d16] to-[#090d16] shadow-[0_0_35px_rgba(251,191,36,0.45)] ring-1 ring-amber-300/40'
                                : getRarityDetails(selectedItem.rarity).bgClass
                            }`}
                        >
                            {/* Decorative aura */}
                            <div className={`absolute top-0 left-0 right-0 h-36 pointer-events-none ${
                                isDetailedItem
                                ? 'bg-gradient-to-b from-amber-500/25 via-yellow-500/10 to-transparent'
                                : 'bg-gradient-to-b from-indigo-950/20 to-transparent'
                            }`} />

                            {/* 보스 고유 전리품 전용 특별 배너 */}
                            {isDetailedItem && (
                                <div className="relative z-10 bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-amber-950/90 border border-amber-400/80 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/70 flex items-center justify-center shrink-0">
                                            <Crown size={16} className="text-amber-300" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1">
                                                <Sparkles size={11} className="text-amber-400" />
                                                <span>보스 고유 특별 전리품</span>
                                            </div>
                                            <div className="text-xs font-black text-amber-100 truncate">
                                                {detailBossMeta?.bossName 
                                                    ? `${detailBossMeta.bossName}${detailBossMeta.bossTitle ? ` - ${detailBossMeta.bossTitle}` : ''}` 
                                                    : '수호 보스 처치 전리품'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-amber-200 bg-amber-950/90 border border-amber-400/60 px-2 py-0.5 rounded-md shrink-0 shadow-sm">
                                        보물
                                    </span>
                                </div>
                            )}

                            {/* 보스 전리품 부스트 여부 및 배율 카드 */}
                            {isEquipmentItem(selectedItem) && selectedItem.bossBoost && (
                                <div className={`relative z-10 rounded-xl p-2.5 flex items-center justify-between gap-2 border ${
                                    selectedItem.bossBoost.isBoosted
                                        ? 'bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                                        : 'bg-slate-900/80 border-slate-700/80'
                                }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                            selectedItem.bossBoost.isBoosted
                                                ? 'bg-amber-500/20 text-amber-300'
                                                : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            <Sparkles size={14} className={selectedItem.bossBoost.isBoosted ? 'animate-pulse text-amber-300' : ''} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-[10px] font-extrabold ${
                                                selectedItem.bossBoost.isBoosted ? 'text-amber-300' : 'text-slate-400'
                                            }`}>
                                                {selectedItem.bossBoost.isBoosted ? '보스 전리품 부스트 성공' : '보스 전리품 부스트 미적용'}
                                            </span>
                                            <span className={`text-xs font-black truncate ${
                                                selectedItem.bossBoost.isBoosted ? 'text-amber-100' : 'text-slate-300'
                                            }`}>
                                                {selectedItem.bossBoost.isBoosted
                                                    ? `기본 능력치 ${selectedItem.bossBoost.multiplier?.toFixed(selectedItem.bossBoost.multiplier % 1 === 0 ? 1 : 2)}배 증폭 적용`
                                                    : '기본 1.0배 일반 능력치 적용'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 font-mono shadow-sm border ${
                                        selectedItem.bossBoost.isBoosted
                                            ? 'bg-amber-900/80 border-amber-400/70 text-amber-200'
                                            : 'bg-slate-950 border-slate-700 text-slate-400'
                                    }`}>
                                        {selectedItem.bossBoost.isBoosted
                                            ? `${selectedItem.bossBoost.multiplier?.toFixed(selectedItem.bossBoost.multiplier % 1 === 0 ? 1 : 2)}배`
                                            : '1.0배'}
                                    </span>
                                </div>
                            )}

                            {/* Detail Header with Compact Item Image */}
                            <div className="relative flex justify-between items-start z-10">
                                <div className="flex items-start gap-2.5 flex-1 pr-2">
                                    {/* Compact Item Image Box */}
                                    <div className={`w-10 h-10 rounded-xl bg-slate-950/90 border p-1 flex items-center justify-center shrink-0 shadow-md relative overflow-hidden group mt-0.5 ${
                                        isDetailedItem ? 'border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'border-slate-800/90'
                                    }`}>
                                        <img 
                                            src={getItemDisplayImageUrl(selectedItem)} 
                                            alt={selectedItem.name} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-contain drop-shadow"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLElement).style.display = 'none';
                                                const fallback = document.getElementById(`detail-fallback-icon-${selectedItem.name}`);
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                        <div id={`detail-fallback-icon-${selectedItem.name}`} className="hidden items-center justify-center w-full h-full text-slate-400">
                                            {selectedItem.type === 'Weapon' ? <Swords size={18} className="text-amber-400" /> :
                                             selectedItem.type === 'SubWeapon' || selectedItem.type === 'Body' || selectedItem.type === 'Head' ? <Shield size={18} className="text-blue-400" /> :
                                             selectedItem.type === 'Consumable' ? <Heart size={18} className="text-rose-400" /> :
                                             <Sparkles size={18} className="text-purple-400" />}
                                        </div>
                                    </div>

                                    <div className="space-y-0.5 flex-1 overflow-hidden">
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-900 text-[9px] font-bold border border-slate-800 text-slate-400">
                                            {getTypeName(selectedItem.type)}
                                            {selectedItem.weaponType && ` (${selectedItem.weaponType})`}
                                        </span>
                                        <h3 className={`text-sm sm:text-base font-black flex items-center gap-1.5 flex-wrap tracking-tight ${
                                            isDetailedItem ? 'text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'text-slate-100'
                                        }`}>
                                            {selectedItem.name}
                                            {selectedItem.enhancement !== undefined && selectedItem.enhancement > 0 && (
                                                <span className="text-amber-400">+{selectedItem.enhancement}</span>
                                            )}
                                        </h3>
                                        <p className={`text-xs font-semibold ${getRarityDetails(selectedItem.rarity).colorClass}`}>
                                            {getRarityDetails(selectedItem.rarity).text}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800/80 cursor-pointer shrink-0 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Details Body */}
                            <div className="relative space-y-4 z-10 flex-1">
                                {/* Item Requirement & Info Pill */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {selectedItem.minLvl !== undefined && selectedItem.minLvl > 0 && (
                                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex flex-col">
                                            <span className="text-[9px] text-slate-500 font-semibold">착용 제한 레벨</span>
                                            <span className="text-slate-200 font-bold">Lv. {selectedItem.minLvl} 이상</span>
                                        </div>
                                    )}
                                    {selectedItem.elementalType && (
                                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex flex-col">
                                            <span className="text-[9px] text-slate-500 font-semibold">속성 성질</span>
                                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                                                <Flame size={12} className="text-orange-500 shrink-0" /> {selectedItem.elementalType}
                                            </span>
                                        </div>
                                    )}
                                    {selectedItem.divineLevel !== undefined && selectedItem.divineLevel > 0 && (
                                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex flex-col">
                                            <span className="text-[9px] text-slate-500 font-semibold">신격 등급</span>
                                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                <Sparkles size={12} className="text-emerald-400 animate-pulse" /> {selectedItem.divineLevel}성
                                            </span>
                                        </div>
                                    )}
                                    {selectedItem.price !== undefined && (
                                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex flex-col">
                                            <span className="text-[9px] text-slate-500 font-semibold">기본 가치</span>
                                            <span className="text-amber-500 font-bold flex items-center gap-1">
                                                <CircleDollarSign size={12} className="text-amber-500" /> {selectedItem.price.toLocaleString()}G
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Item stats */}
                                {selectedItem.stats && Object.keys(selectedItem.stats).length > 0 && (
                                    <div className="space-y-2 bg-slate-950/60 border border-slate-800/50 rounded-xl p-3">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">부여 기본 능력치</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                            {Object.entries(selectedItem.stats).map(([key, val], sIdx) => {
                                                if (val === undefined || val === null || val === 0) return null;
                                                return (
                                                    <div key={`item-stat-${selectedItem.name}-${key}-${sIdx}`} className="flex justify-between items-center border-b border-slate-900 pb-1">
                                                        <span className="text-slate-400">{getStatName(key)}</span>
                                                        <span className="text-emerald-400 font-bold">+{val}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Special Mythic Options */}
                                {selectedItem.mythicOption && (
                                    <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 space-y-1">
                                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <Sparkle size={11} className="animate-pulse" /> 신화 고유 특별 옵션
                                        </div>
                                        <p className="text-xs text-red-200 leading-relaxed font-semibold">
                                            {selectedItem.mythicOption}
                                        </p>
                                    </div>
                                )}

                                {/* Secondary Options */}
                                {selectedItem.secondaryOptions && selectedItem.secondaryOptions.length > 0 && (
                                    <div className="space-y-2 bg-slate-950/60 border border-slate-800/50 rounded-xl p-3">
                                        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest pl-1">무작위 보조 옵션</div>
                                        <ul className="text-xs space-y-1 list-none pl-1">
                                            {selectedItem.secondaryOptions.map((opt, i) => (
                                                <li key={`item-sec-opt-${selectedItem.name}-${i}-${opt}`} className="text-indigo-200 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                                                    {opt}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Lore Description */}
                                <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-3.5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 text-slate-900 transform translate-x-2 -translate-y-2 scale-150 select-none">
                                        "
                                    </div>
                                    <p className="text-xs text-slate-400 italic leading-relaxed text-center font-medium">
                                        "{selectedItem.description || '이 아이템은 특별한 설명이 전해지지 않습니다.'}"
                                    </p>
                                </div>
                            </div>

                            {/* Detail Footer */}
                            <div className="relative pt-2 z-10">
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                                >
                                    상세 창 닫기
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Sub-Modal: Skill & Weapon Mastery Detail Analyzer (Fully Mobile-Optimized as a Bottom Sheet on Mobile) */}
            <AnimatePresence>
                {selectedParticipantId && (() => {
                    const fState = finalStates.find(s => s.id === selectedParticipantId);
                    const iState = getInitialState(selectedParticipantId) || fState;
                    
                    if (!fState || !iState) return null;
                    
                    // 1. Weapon mastery differences
                    const weaponMasteryDiff = fState.weaponMastery?.map((fWM, wmIdx) => {
                        const iWM = iState.weaponMastery?.find(w => w.type === fWM.type);
                        const hasLevelUp = iWM ? fWM.level > iWM.level : false;
                        const expGained = iWM ? (hasLevelUp ? fWM.currentExp : (fWM.currentExp - iWM.currentExp)) : fWM.currentExp;
                        const hasExpGained = expGained > 0 || hasLevelUp;
                        
                        return {
                            type: fWM.type,
                            koreanName: WEAPON_TYPE_KOREAN[fWM.type] || fWM.type,
                            initialLvl: iWM?.level || 0,
                            finalLvl: fWM.level,
                            initialExp: iWM?.currentExp || 0,
                            finalExp: fWM.currentExp,
                            expGained: Math.max(0, expGained),
                            hasLevelUp,
                            hasExpGained,
                            key: `wm-diff-${fState.id}-${fWM.type}-${wmIdx}`
                        };
                    }) || [];

                    // 2. Skill mastery differences
                    const skillsDiff = fState.skills?.map((fSkill, skIdx) => {
                        const iSkill = iState.skills?.find(s => s.name === fSkill.name);
                        const hasLevelUp = iSkill ? fSkill.level > iSkill.level : false;
                        const masteryGained = iSkill ? (hasLevelUp ? fSkill.currentMastery : (fSkill.currentMastery - iSkill.currentMastery)) : fSkill.currentMastery;
                        const hasMasteryGained = masteryGained > 0 || hasLevelUp;
                        
                        return {
                            name: fSkill.name,
                            initialLvl: iSkill?.level || 1,
                            finalLvl: fSkill.level,
                            initialMastery: iSkill?.currentMastery || 0,
                            finalMastery: fSkill.currentMastery,
                            masteryGained: Math.max(0, masteryGained),
                            hasLevelUp,
                            hasMasteryGained,
                            key: `sk-diff-${fState.id}-${fSkill.name}-${skIdx}`
                        };
                    }) || [];

                    return (
                        <motion.div 
                            key={`participant-mastery-modal-backdrop-${fState.id}`} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
                        >
                            {/* Dark translucent backdrop hit area to close */}
                            <div className="absolute inset-0" onClick={() => setSelectedParticipantId(null)} />

                            {/* Modal Box */}
                            <motion.div
                                key={`participant-mastery-modal-box-${fState.id}`}
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                                className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-950 border border-slate-800 p-5 flex flex-col space-y-4 shadow-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden z-10"
                            >
                                {/* Header Drag Bar for Mobile Visual Cue */}
                                <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto shrink-0 sm:hidden mb-1" />

                                {/* Header Backdrop Decorative Glow */}
                                <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none" />

                                {/* Header */}
                                <div className="relative flex justify-between items-center z-10 pb-2 border-b border-slate-800/60 shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                            <Swords size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-slate-100">{fState.name} 전투 숙련도 분석</h3>
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Skill & Weapon Growth</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedParticipantId(null)}
                                        className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-slate-800 cursor-pointer shrink-0 transition-all active:scale-95"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Scrollable Contents */}
                                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin z-10 pb-4">
                                    
                                    {/* 3-Tab Navigator */}
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipantTab('combatStyle')}
                                            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                selectedParticipantTab === 'combatStyle'
                                                    ? 'bg-amber-500 text-slate-950 shadow-md'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <Zap size={13} className={selectedParticipantTab === 'combatStyle' ? 'text-slate-950' : 'text-amber-400'} />
                                            <span>목표 계열 수련</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipantTab('weapon')}
                                            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                selectedParticipantTab === 'weapon'
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <Swords size={13} className={selectedParticipantTab === 'weapon' ? 'text-white' : 'text-indigo-400'} />
                                            <span>무기 숙련도</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipantTab('skills')}
                                            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                selectedParticipantTab === 'skills'
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <Sparkle size={13} className={selectedParticipantTab === 'skills' ? 'text-white' : 'text-emerald-400'} />
                                            <span>스킬 숙련도</span>
                                        </button>
                                    </div>

                                    {/* TAB 1: 목표 전투 계열 수련 분석 */}
                                    {selectedParticipantTab === 'combatStyle' && (() => {
                                        const targetStyle = fState.targetCombatStyle || iState.targetCombatStyle;
                                        const fProgMap = fState.combatStyleProgress || {};
                                        const iProgMap = iState.combatStyleProgress || {};
                                        const fProg = (targetStyle && fProgMap[targetStyle]) || { exp: 0, monsterKills: 0, bossKills: 0 };
                                        const iProg = (targetStyle && iProgMap[targetStyle]) || { exp: 0, monsterKills: 0, bossKills: 0 };
                                        const expGained = Math.max(0, Number((fProg.exp - iProg.exp).toFixed(1)));
                                        const killsGained = Math.max(0, (fProg.monsterKills || 0) - (iProg.monsterKills || 0));
                                        const bossKillsGained = Math.max(0, (fProg.bossKills || 0) - (iProg.bossKills || 0));

                                        // 수련 중인 전체 계열 목록
                                        const allStyles: string[] = [];
                                        if (targetStyle) allStyles.push(targetStyle);
                                        Object.keys(fProgMap).forEach(k => { if (!allStyles.includes(k)) allStyles.push(k); });
                                        Object.keys(iProgMap).forEach(k => { if (!allStyles.includes(k)) allStyles.push(k); });

                                        return (
                                            <div className="space-y-3">
                                                {targetStyle ? (
                                                    <div className="bg-gradient-to-br from-amber-950/40 via-indigo-950/30 to-slate-900/60 border border-amber-500/40 rounded-2xl p-4 space-y-3.5 shadow-lg relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-300 pointer-events-none">
                                                            <Zap size={72} />
                                                        </div>

                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                                                                        현재 설정된 목표 계열
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                                                                    {targetStyle}
                                                                </h4>
                                                            </div>

                                                            <div className="text-right">
                                                                <span className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm ${
                                                                    expGained > 0
                                                                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 animate-pulse'
                                                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                                }`}>
                                                                    <Sparkles size={13} className={expGained > 0 ? 'text-amber-400' : 'text-slate-500'} />
                                                                    +{expGained.toLocaleString()} 수련 EXP
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* EXP Gauge */}
                                                        {(() => {
                                                            const styleConfig = targetStyle ? COMBAT_STYLE_CONFIG[targetStyle as CombatStyle] : null;
                                                            const tier = styleConfig ? styleConfig.tier : 1;
                                                            const tierReq = COMBAT_STYLE_TIER_REQUIREMENTS[tier] || COMBAT_STYLE_TIER_REQUIREMENTS[1];
                                                            const reqExp = tierReq.reqExp;

                                                            const initialExpPct = Math.min(100, Math.max(0, (iProg.exp / reqExp) * 100));
                                                            const finalExpPct = Math.min(100, Math.max(0, (fProg.exp / reqExp) * 100));
                                                            const gainedExpPct = Math.min(100 - initialExpPct, Math.max(0, (expGained / reqExp) * 100));

                                                            return (
                                                                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                                                    <div className="flex justify-between items-center text-xs font-bold">
                                                                        <span className="text-slate-400">전투계열 수련 목표 달성도 ({tier}차 목표)</span>
                                                                        <span className="text-amber-300 font-mono font-black text-sm">
                                                                            {finalExpPct.toFixed(1)}% 달성
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* 게이지 바: 기존(Indigo) + 이번 획득량(Amber Glow) */}
                                                                    <div className="relative h-3 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5 flex items-center">
                                                                        {initialExpPct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-indigo-600 rounded-l-full shrink-0"
                                                                                style={{ width: `${initialExpPct}%` }}
                                                                            />
                                                                        )}
                                                                        {expGained > 0 && (
                                                                            <motion.div 
                                                                                initial={{ width: '0%' }}
                                                                                animate={{ width: `${gainedExpPct}%` }}
                                                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                                                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-r-full shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse shrink-0"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="flex justify-between items-center text-[11px] pt-0.5">
                                                                        <span className="text-slate-400">
                                                                            누적 EXP: <strong className="text-slate-100">{Number(fProg.exp.toFixed(1)).toLocaleString()}</strong> / {reqExp.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-indigo-300 font-bold">
                                                                            이전: {Number(iProg.exp.toFixed(1)).toLocaleString()} ➔ <strong className="text-amber-300">+{expGained.toLocaleString()} EXP</strong>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Kill Stats */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl text-center">
                                                                <span className="text-[10px] text-slate-400 block mb-0.5">몬스터 처치 카운트</span>
                                                                <span className="text-sm font-black text-slate-200">
                                                                    {fProg.monsterKills || 0}마리
                                                                    {killsGained > 0 && <span className="text-emerald-400 text-xs ml-1 font-bold">(+{killsGained})</span>}
                                                                </span>
                                                            </div>
                                                            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl text-center">
                                                                <span className="text-[10px] text-slate-400 block mb-0.5">보스 처치 카운트</span>
                                                                <span className="text-sm font-black text-slate-200">
                                                                    {fProg.bossKills || 0}회
                                                                    {bossKillsGained > 0 && <span className="text-amber-400 text-xs ml-1 font-bold">(+{bossKillsGained})</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 p-5 space-y-2">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                                                            <AlertCircle size={20} />
                                                        </div>
                                                        <h4 className="text-sm font-bold text-slate-200">설정된 목표 전투 계열이 없습니다</h4>
                                                        <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                                            훈련소 메뉴에서 목표 전투 계열을 지정하면, 전투 시 전용 수련 경험치와 몬스터 처치 기록이 누적됩니다.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* 모든 수련 계열 현황 목록 */}
                                                {allStyles.length > 0 && (
                                                    <div className="space-y-2 pt-1">
                                                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                                                            전체 전투 계열 수련 현황 ({allStyles.length})
                                                        </h5>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {allStyles.map((styleName) => {
                                                                const prog = fProgMap[styleName] || { exp: 0, monsterKills: 0, bossKills: 0 };
                                                                const isCurrent = styleName === targetStyle;
                                                                return (
                                                                    <div 
                                                                        key={`style-prog-${styleName}`}
                                                                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                                                                            isCurrent 
                                                                                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' 
                                                                                : 'bg-slate-900/40 border-slate-800 text-slate-300'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                                                                            <span className="font-bold">{styleName}</span>
                                                                            {isCurrent && (
                                                                                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                                                                    목표
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="font-bold text-slate-100">{Number(prog.exp.toFixed(1)).toLocaleString()} EXP</span>
                                                                            <span className="text-[10px] text-slate-500 ml-1.5">({prog.monsterKills || 0}킬)</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* TAB 2: 무기 숙련도 섹션 */}
                                    {selectedParticipantTab === 'weapon' && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between pl-1">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Swords size={13} className="text-indigo-400" /> 무기 숙련도 변화 ({weaponMasteryDiff.length})
                                                </h4>
                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-700 inline-block border border-slate-600"></span>기존</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block border border-indigo-300 shadow-[0_0_4px_rgba(99,102,241,0.8)]"></span>새로 획득(+)</span>
                                                </div>
                                            </div>
                                            
                                            {weaponMasteryDiff.length === 0 ? (
                                                <div className="text-center py-5 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 text-xs text-slate-500">
                                                    아직 연마된 무기 숙련도가 없습니다.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {weaponMasteryDiff.map((wm) => {
                                                        const reqExp = (wm.finalLvl + 4) * 10;
                                                        const finalPct = wm.finalLvl >= 100 ? 100 : Math.min(100, Math.round((wm.finalExp / reqExp) * 100));
                                                        
                                                        // 기존 경험치 퍼센티지 vs 이번 성장분 퍼센티지 계산
                                                        const baseExp = wm.hasLevelUp ? 0 : Math.max(0, wm.finalExp - wm.expGained);
                                                        const basePct = wm.finalLvl >= 100 ? (wm.hasExpGained ? Math.max(0, 100 - Math.round((wm.expGained / reqExp) * 100)) : 100) : Math.min(100, Math.round((baseExp / reqExp) * 100));
                                                        const growthPct = Math.min(100 - basePct, Math.max(0, finalPct - basePct));

                                                        return (
                                                            <div 
                                                                key={wm.key} 
                                                                className={`p-3 rounded-xl border text-xs flex flex-col space-y-2.5 transition-all ${
                                                                    wm.hasExpGained 
                                                                        ? 'bg-indigo-950/25 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.08)]' 
                                                                        : 'bg-slate-900/30 border-slate-900/40'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-slate-200">{wm.koreanName}</span>
                                                                    <div className="flex items-center gap-1.5 font-semibold">
                                                                        <span className="text-slate-500">Lv.{wm.initialLvl}</span>
                                                                        {wm.hasLevelUp && (
                                                                            <>
                                                                                <ChevronRight size={10} className="text-slate-600" />
                                                                                <span className="font-black text-indigo-400 flex items-center gap-0.5 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[10px]">
                                                                                    Lv.{wm.finalLvl} <span className="text-[8px] bg-indigo-500 text-white px-1 rounded font-black animate-pulse">UP</span>
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* EXP Progress Gauge */}
                                                                <div className="space-y-1.5">
                                                                    <div className="relative h-3 w-full bg-slate-950/90 border border-slate-800/90 rounded-full overflow-hidden p-0.5 flex items-center">
                                                                        {/* 1) 기존(이전) 숙련도 양: 명확한 다크 슬레이트 회색 */}
                                                                        {basePct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-slate-700 rounded-l-full transition-all shrink-0"
                                                                                style={{ width: `${basePct}%` }}
                                                                                title={`기존 숙련도: ${baseExp}`}
                                                                            />
                                                                        )}
                                                                        {/* 2) 이번 전투에서 새로 획득한 양 */}
                                                                        {wm.hasExpGained && growthPct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.95)] border-l-2 border-white animate-pulse rounded-r-full transition-all shrink-0"
                                                                                style={{ width: `${growthPct}%` }}
                                                                                title={`새로 획득: +${wm.expGained}`}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                                                        <span>
                                                                            {wm.hasExpGained ? (
                                                                                <>기존 <strong className="text-slate-300">{baseExp}</strong> ➔ 최종 <strong className="text-slate-100">{wm.finalExp}</strong> / {wm.finalLvl >= 100 ? 'MAX' : reqExp} ({finalPct}%)</>
                                                                            ) : (
                                                                                <>숙련도: <strong className="text-slate-300">{wm.finalExp}</strong> / {wm.finalLvl >= 100 ? 'MAX' : reqExp} ({finalPct}%)</>
                                                                            )}
                                                                        </span>
                                                                        {wm.hasExpGained ? (
                                                                            <span className="text-indigo-400 font-bold flex items-center gap-1 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                                                +{wm.expGained} EXP {wm.hasLevelUp ? `(Lv.${wm.initialLvl}➔Lv.${wm.finalLvl})` : ''}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-600 font-medium bg-slate-900/50 px-1.5 py-0.5 rounded">변화 없음</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 3: 스킬 숙련도 섹션 */}
                                    {selectedParticipantTab === 'skills' && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between pl-1">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Sparkle size={13} className="text-emerald-500" /> 스킬 숙련도 변화 ({skillsDiff.length})
                                                </h4>
                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-700 inline-block border border-slate-600"></span>기존</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block border border-emerald-300 shadow-[0_0_4px_rgba(52,211,153,0.8)]"></span>새로 획득(+)</span>
                                                </div>
                                            </div>
                                            
                                            {skillsDiff.length === 0 ? (
                                                <div className="text-center py-5 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 text-xs text-slate-500">
                                                    아직 습득한 스킬이 없습니다.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {skillsDiff.map((sk) => {
                                                        const reqMastery = 20 * (sk.finalLvl + 4);
                                                        const finalPct = Math.min(100, Math.round((sk.finalMastery / reqMastery) * 100));
                                                        
                                                        // 기존 숙련도 퍼센티지 vs 이번 성장분 퍼센티지 계산
                                                        const baseMastery = sk.hasLevelUp ? 0 : Math.max(0, sk.finalMastery - sk.masteryGained);
                                                        const basePct = Math.min(100, Math.round((baseMastery / reqMastery) * 100));
                                                        const growthPct = Math.min(100 - basePct, Math.max(0, finalPct - basePct));

                                                        return (
                                                            <div 
                                                                key={sk.key} 
                                                                className={`p-3 rounded-xl border text-xs flex flex-col space-y-2.5 transition-all ${
                                                                    sk.hasMasteryGained
                                                                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                                                                        : 'bg-slate-900/30 border-slate-900/40'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-slate-200">{sk.name}</span>
                                                                    <div className="flex items-center gap-1.5 font-semibold">
                                                                        <span className="text-slate-500">Lv.{sk.initialLvl}</span>
                                                                        {sk.hasLevelUp && (
                                                                            <>
                                                                                <ChevronRight size={10} className="text-slate-600" />
                                                                                <span className="font-black text-emerald-400 flex items-center gap-0.5 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                                                                                    Lv.{sk.finalLvl} <span className="text-[8px] bg-emerald-500 text-slate-950 px-1 rounded font-black animate-pulse">UP</span>
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Mastery Gauge */}
                                                                <div className="space-y-1.5">
                                                                    <div className="relative h-3 w-full bg-slate-950/90 border border-slate-800/90 rounded-full overflow-hidden p-0.5 flex items-center">
                                                                        {/* 1) 기존(이전) 스킬 숙련도 양: 명확한 다크 슬레이트 회색 */}
                                                                        {basePct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-slate-700 rounded-l-full transition-all shrink-0"
                                                                                style={{ width: `${basePct}%` }}
                                                                                title={`기존 숙련도: ${baseMastery}`}
                                                                            />
                                                                        )}
                                                                        {/* 2) 이번 전투에서 새로 획득한 양 */}
                                                                        {sk.hasMasteryGained && growthPct > 0 && (
                                                                            <div 
                                                                                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.95)] border-l-2 border-white animate-pulse rounded-r-full transition-all shrink-0"
                                                                                style={{ width: `${growthPct}%` }}
                                                                                title={`새로 획득: +${sk.masteryGained}`}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                                                        <span>
                                                                            {sk.hasMasteryGained ? (
                                                                                <>기존 <strong className="text-slate-300">{baseMastery}</strong> ➔ 최종 <strong className="text-slate-100">{sk.finalMastery}</strong> / {reqMastery} ({finalPct}%)</>
                                                                            ) : (
                                                                                <>숙련도: <strong className="text-slate-300">{sk.finalMastery}</strong> / {reqMastery} ({finalPct}%)</>
                                                                            )}
                                                                        </span>
                                                                        {sk.hasMasteryGained ? (
                                                                            <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                                                +{sk.masteryGained} EXP {sk.hasLevelUp ? `(Lv.${sk.initialLvl}➔Lv.${sk.finalLvl})` : ''}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-600 font-medium bg-slate-900/50 px-1.5 py-0.5 rounded">변화 없음</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>

                                {/* Footer close button */}
                                <div className="relative pt-2 shrink-0 z-10">
                                    <button
                                        onClick={() => setSelectedParticipantId(null)}
                                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-sm rounded-xl transition-all cursor-pointer text-center active:scale-95 shadow-md"
                                    >
                                        상세 분석 완료
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </>
    );
};
