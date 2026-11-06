import React, { memo } from 'react';
import { Crown, X, Heart, Zap, Sword, Shield, Activity, User } from 'lucide-react';
import { SkillType } from '../../types';

interface MountDetailsModalProps {
    mount: any;
    riderShinryokuType?: string;
    onClose: () => void;
}

export const MountDetailsModal = memo(({ 
    mount, 
    riderShinryokuType, 
    onClose 
}: MountDetailsModalProps) => {
    if (!mount) return null;

    const rank = mount.monsterData?.rank || mount.grade || mount.rank || 'B';
    const visualUrl = mount.monsterData?.visualUrl || mount.appearance;
    
    const characterShinryoku = riderShinryokuType || "무속성";
    const mountShinryoku = mount.shinryokuType || mount.monsterData?.shinryokuType || "무속성";
    const isShinryokuMatched = 
        characterShinryoku !== "무속성" && 
        characterShinryoku !== "미개방" && 
        characterShinryoku === mountShinryoku;

    const hpMpFactor = isShinryokuMatched ? 0.15 : 0.10;
    const otherFactor = isShinryokuMatched ? 0.10 : 0.05;

    const getRankStyling = (r: string) => {
        const uRank = r.toUpperCase();
        if (uRank === 'SSS' || uRank === '신화') {
            return { label: '신화 (SSS)', text: 'text-red-400 font-black', bg: 'bg-red-950/50 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' };
        }
        if (uRank === 'SS' || uRank === '전설') {
            return { label: '전설 (SS)', text: 'text-amber-400 font-extrabold', bg: 'bg-amber-950/50 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' };
        }
        if (uRank === 'S' || uRank === '영웅') {
            return { label: '영웅 (S)', text: 'text-purple-400 font-bold', bg: 'bg-purple-950/50 border-purple-500/50' };
        }
        if (uRank === 'A' || uRank === '희귀') {
            return { label: '희귀 (A)', text: 'text-blue-400 font-semibold', bg: 'bg-blue-950/50 border-blue-500/50' };
        }
        return { label: '일반 (B)', text: 'text-green-400', bg: 'bg-green-950/30 border-green-500/30' };
    };

    const rankStyle = getRankStyling(rank);

    const stats = mount.stats || { maxHp: 0, maxMp: 0, str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0 };
    
    const hpBonus = Math.floor((stats.maxHp || 0) * hpMpFactor);
    const mpBonus = Math.floor((stats.maxMp || 0) * hpMpFactor);
    const strBonus = Math.floor((stats.str || 0) * otherFactor);
    const intBonus = Math.floor((stats.int || 0) * otherFactor);
    const wisBonus = Math.floor((stats.wis || 0) * otherFactor);
    const defBonus = Math.floor((stats.def || 0) * otherFactor);
    const agiBonus = Math.floor((stats.agi || 0) * otherFactor);
    const ctrlBonus = Math.floor((stats.ctrl || 0) * otherFactor);

    const statItems = [
        { label: '생명력 (HP)', base: stats.maxHp || 0, bonus: hpBonus, percent: isShinryokuMatched ? '15%' : '10%', icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: '마나 (MP)', base: stats.maxMp || 0, bonus: mpBonus, percent: isShinryokuMatched ? '15%' : '10%', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: '힘 (STR)', base: stats.str || 0, bonus: strBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: Sword, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: '지력 (INT)', base: stats.int || 0, bonus: intBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: '지능 (WIS)', base: stats.wis || 0, bonus: wisBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: Activity, color: 'text-sky-500', bg: 'bg-sky-500/10' },
        { label: '방어 (DEF)', base: stats.def || 0, bonus: defBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: '민첩 (AGI)', base: stats.agi || 0, bonus: agiBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: Activity, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { label: '제어 (CTRL)', base: stats.ctrl || 0, bonus: ctrlBonus, percent: isShinryokuMatched ? '10%' : '5%', icon: User, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    ];

    const getElementBadge = (type: string = '무속성') => {
        const colors: Record<string, string> = {
            '화염계': 'bg-red-950/60 text-red-400 border-red-500/30',
            '빙결계': 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30',
            '질풍계': 'bg-green-950/60 text-green-400 border-green-500/30',
            '해수계': 'bg-blue-950/60 text-blue-400 border-blue-500/30',
            '전격계': 'bg-yellow-950/60 text-yellow-400 border-yellow-500/30',
            '강철계': 'bg-slate-900/80 text-slate-400 border-slate-700/50',
            '태양계': 'bg-orange-950/60 text-orange-400 border-orange-500/30',
            '월광계': 'bg-purple-950/60 text-purple-400 border-purple-500/30',
            '초화계': 'bg-lime-950/60 text-lime-400 border-lime-500/30',
        };
        return colors[type] || 'bg-slate-950 text-slate-400 border-slate-800';
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-3 md:p-4 overflow-hidden">
            <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 relative overflow-hidden backdrop-blur-md">
                
                {/* Top Glow bar */}
                <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shrink-0" />
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
                    <div className="flex items-center space-x-2">
                        <Crown size={18} className="text-amber-500 animate-pulse" />
                        <h3 className="font-bold text-slate-100 text-sm md:text-base">탈것 상세 정보</h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-500 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition-all touch-target-action"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-gradient-to-b from-slate-900/40 to-slate-950/80">
                    {/* Mount Basic Info Row */}
                    <div className="flex gap-4 items-stretch bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        {visualUrl && (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900 relative shadow-inner">
                                <img src={visualUrl} alt={mount.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${rankStyle.bg} ${rankStyle.text}`}>
                                        {rankStyle.label}
                                    </span>
                                    <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded border font-semibold ${getElementBadge(mount.shinryokuType)}`}>
                                        {mount.shinryokuType || '무속성'}
                                    </span>
                                </div>
                                <h4 className="text-sm md:text-base font-black text-slate-100 leading-tight mb-1">{mount.name}</h4>
                                <p className="text-xs text-amber-400 font-bold font-mono">Level {mount.level || 1}</p>
                            </div>
                            
                            {/* Compact Metadata if available */}
                            {(mount.monsterData?.disposition || mount.monsterData?.height || mount.monsterData?.weight) && (
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] md:text-[10px] text-slate-400 bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800/50 mt-1">
                                    {mount.monsterData?.disposition && (
                                        <div><span className="text-slate-500 mr-1">성향:</span> <span className="font-semibold text-slate-300">{mount.monsterData.disposition}</span></div>
                                    )}
                                    {mount.monsterData?.height && (
                                        <div><span className="text-slate-500 mr-1">신장:</span> <span className="font-semibold text-slate-300 font-mono">{mount.monsterData.height}m</span></div>
                                    )}
                                    {mount.monsterData?.weight && (
                                        <div><span className="text-slate-500 mr-1">체중:</span> <span className="font-semibold text-slate-300 font-mono">{mount.monsterData.weight}kg</span></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* mounting explanation card */}
                    <div className={`p-3 rounded-xl border shadow-sm transition-all duration-300 ${isShinryokuMatched ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-gradient-to-r from-amber-950/20 to-slate-950 border-amber-500/20'}`}>
                        <p className="text-[11px] md:text-xs text-amber-200/90 leading-relaxed">
                            ✨ <span className="font-bold text-amber-400">장착 효과:</span> 캐릭터가 탑승 시, 탈것의 <span className="text-red-400 font-bold">생명력/마나의 {isShinryokuMatched ? '15%' : '10%'}</span> 및 <span className="text-emerald-400 font-bold">기타 능력치의 {isShinryokuMatched ? '10%' : '5%'}</span>가 상시 누적 보너스로 합산됩니다.
                        </p>
                        {isShinryokuMatched && (
                            <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20 flex items-center space-x-1.5 text-emerald-400 font-bold text-[10px] md:text-xs">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>🔥 동일 신력 계통 공명 보너스 적용! (+5% 스탯 추가 혜택 적용 중)</span>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="space-y-2">
                        <h5 className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">탈것 능력치 & 환산 보너스</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {statItems.map((stat, idx) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={idx} className="bg-slate-950/80 border border-slate-800/60 p-2 md:p-2.5 rounded-lg flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors">
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-1 rounded ${stat.bg}`}>
                                                <Icon size={12} className={stat.color} />
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold">{stat.label}</span>
                                        </div>
                                        <div className="flex items-center space-x-3 text-right">
                                            <div className="text-xs font-bold font-mono text-slate-300">{stat.base}</div>
                                            {stat.bonus > 0 && (
                                                <div className="text-[10px] md:text-xs font-black font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm">
                                                    +{stat.bonus} <span className="text-[8px] font-medium opacity-80">({stat.percent})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Skills Panel if any */}
                    {mount.skills && mount.skills.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <h5 className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">보유 전술 기술</h5>
                            <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                {mount.skills.map((skill: any, idx: number) => (
                                    <div key={idx} className="bg-slate-950/50 border border-slate-800/80 p-2 md:p-2.5 rounded-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center space-x-1.5">
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-900/60 font-bold">
                                                    {skill.type === SkillType.BUFF ? '버프' : skill.type === SkillType.PASSIVE ? '패시브' : '액티브'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-200">{skill.name}</span>
                                            </div>
                                            <span className="text-[9px] text-blue-400 font-mono font-bold">
                                                MP {skill.type === SkillType.PASSIVE ? 0 : skill.mpCost}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-normal">{skill.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer with closed action */}
                <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex justify-end shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-3 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs md:text-sm rounded-lg transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95 touch-target-action"
                        style={{ minHeight: '44px' }}
                    >
                        상세 닫기
                    </button>
                </div>
            </div>
        </div>
    );
});
