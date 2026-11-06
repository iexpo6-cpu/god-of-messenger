import React from 'react';
import { Character, Companion, CombatStyle } from '../types';
import { COMBAT_STYLE_CONFIG } from '../constants';
import { Sword, Sparkles, CheckCircle, Lock, Award, ChevronRight } from 'lucide-react';

interface PromotionMasteryProgressBarProps {
    target: Character | Companion;
    compact?: boolean;
}

export const PromotionMasteryProgressBar: React.FC<PromotionMasteryProgressBarProps> = ({ target, compact = false }) => {
    const level = target.level || 1;
    const styleConfig = target.combatStyle ? COMBAT_STYLE_CONFIG[target.combatStyle as CombatStyle] : null;
    // 전투 계열의 Tier (1, 2, 3, 4)를 기준으로 엄격히 판정 (전투 계열이 없으면 1차 기본 계열로 취급)
    const tier = styleConfig ? (styleConfig.tier as 1 | 2 | 3 | 4) : 1;

    // Calculate current highest mastery
    let relevantWeapons = styleConfig ? styleConfig.weapons : [];
    let currentMastery = 0;

    if (target.weaponMastery) {
        if (relevantWeapons.length > 0) {
            currentMastery = Math.max(0, ...relevantWeapons.map(w => target.weaponMastery?.[w]?.level || 0));
        }
        if (currentMastery === 0) {
            currentMastery = Math.max(0, ...Object.values(target.weaponMastery).map(m => (m as any)?.level || 0));
        }
    }

    // Tier configuration details (전투계열 Tier 기준 전직 목표)
    let tierRangeText = '';
    let nextTierName = '';
    let targetMastery = 30;
    let targetLevel = 101;
    let minMasteryForTier = 10;
    let maxMasteryForTier = 29;

    if (tier === 1) {
        tierRangeText = '1차 전직 계열 (2차 전직 목표: 숙련도 Lv.30 / 레벨 Lv.101)';
        nextTierName = '2차 전직';
        minMasteryForTier = 10;
        maxMasteryForTier = 29;
        targetMastery = 30;
        targetLevel = 101;
    } else if (tier === 2) {
        tierRangeText = '2차 전직 계열 (3차 전직 목표: 숙련도 Lv.60 / 레벨 Lv.301)';
        nextTierName = '3차 전직';
        minMasteryForTier = 30;
        maxMasteryForTier = 59;
        targetMastery = 60;
        targetLevel = 301;
    } else if (tier === 3) {
        tierRangeText = '3차 전직 계열 (4차 전직 목표: 숙련도 Lv.100 / 레벨 Lv.501)';
        nextTierName = '4차 전직';
        minMasteryForTier = 60;
        maxMasteryForTier = 99;
        targetMastery = 100;
        targetLevel = 501;
    } else {
        tierRangeText = '4차 전직 완료 (숙련도 Lv.100 정점 달성)';
        nextTierName = '최종 정점';
        minMasteryForTier = 100;
        maxMasteryForTier = 100;
        targetMastery = 100;
        targetLevel = 501;
    }

    const masteryPercent = tier === 4 ? Math.min(100, Math.floor((currentMastery / 100) * 1000) / 10) : Math.min(100, Math.max(0, Math.floor((currentMastery / targetMastery) * 1000) / 10));
    const levelPercent = tier === 4 ? 100 : Math.min(100, Math.max(0, Math.floor((level / targetLevel) * 1000) / 10));

    const isMasteryReady = currentMastery >= targetMastery;
    const isLevelReady = level >= targetLevel;
    const isPromotionReady = tier < 4 && isMasteryReady && isLevelReady;

    if (compact) {
        return (
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                        <Award size={13} className="text-amber-400" />
                        {tier}차 전투계열 숙련도
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        {styleConfig?.label || '기본 계열'} ({tier}차)
                    </span>
                </div>

                <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-400">
                            {tier === 4 ? '특화 숙련도:' : `다음 전직(${nextTierName}) 숙련도:`} <strong className="text-amber-300">Lv.{Math.floor(currentMastery)} / Lv.{targetMastery}</strong>
                        </span>
                        <span className="font-extrabold text-amber-400">{masteryPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
                        <div
                            className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            style={{ width: `${masteryPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-amber-900/40 shadow-lg space-y-3">
            {/* Header with Tier Badge and Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                        <Award size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-100">
                                {target.name}의 전투 계열 & 무기 숙련도
                            </h4>
                            <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md">
                                {tier}차 전직 계열
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            현재 계열: <strong className="text-amber-300">{styleConfig?.label || '기본 계열'}</strong> ({styleConfig?.specialtyText || '특화무기'})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">
                        🎯 {tierRangeText}
                    </span>
                </div>
            </div>

            {/* Progress Bars Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* 1. 무기 숙련도 달성률 */}
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1 text-[11px]">
                            <Sword size={13} className="text-red-400" />
                            {tier === 4 ? '최종 무기 숙련도 달성률' : `다음 전직(${nextTierName}) 무기 숙련도`}
                        </span>
                        <span className="font-extrabold text-xs text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
                            {masteryPercent}%
                        </span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5 relative">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                isMasteryReady
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            }`}
                            style={{ width: `${masteryPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>현재 특화 숙련도: <strong className="text-slate-200">Lv.{Math.floor(currentMastery)}</strong></span>
                        <span>{tier === 4 ? '정점 Lv.100' : `전직 목표: Lv.${targetMastery}`}</span>
                    </div>
                </div>

                {/* 2. 캐릭터 레벨 달성률 */}
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1 text-[11px]">
                            <Sparkles size={13} className="text-indigo-400" />
                            {tier === 4 ? '캐릭터 최고 레벨' : `다음 전직(${nextTierName}) 요구 레벨`}
                        </span>
                        <span className="font-extrabold text-xs text-indigo-300 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]">
                            {levelPercent}%
                        </span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5 relative">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                isLevelReady
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                    : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                            }`}
                            style={{ width: `${levelPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>현재 레벨: <strong className="text-slate-200">Lv.{level}</strong></span>
                        <span>{tier === 4 ? '최고 레벨 구간' : `전직 목표: Lv.${targetLevel}`}</span>
                    </div>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div className="pt-0.5">
                {tier === 4 ? (
                    <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-200 shadow-inner">
                        <span className="flex items-center gap-1.5 font-bold">
                            <Award size={15} className="text-amber-400 animate-bounce" />
                            전설의 4차 전투 계열 정점에 도달했습니다.
                        </span>
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded">
                            MAX TIER
                        </span>
                    </div>
                ) : isPromotionReady ? (
                    <div className="bg-emerald-950/70 border border-emerald-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                        <span className="flex items-center gap-1.5 font-bold">
                            <CheckCircle size={15} className="text-emerald-400 animate-pulse" />
                            {nextTierName} 전직 조건 충족! 영지 내 [전투 스타일 훈련소]에서 승급(전직)할 수 있습니다.
                        </span>
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            전직 가능 <ChevronRight size={12} />
                        </span>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
                        <span className="flex items-center gap-1.5 font-medium">
                            <Lock size={13} className="text-amber-500/80 shrink-0" />
                            {nextTierName}까지 요구: 숙련도 Lv.{targetMastery} (현재 Lv.{Math.floor(currentMastery)}) & 레벨 Lv.{targetLevel} (현재 Lv.{level})
                        </span>
                        <span className="text-[10px] text-amber-400/90 font-bold shrink-0">
                            필요: 숙련도 {isMasteryReady ? '달성 완료' : `+${targetMastery - Math.floor(currentMastery)}`}, 레벨 {isLevelReady ? '달성 완료' : `+${Math.max(0, targetLevel - level)}`}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
