import React, { useEffect } from 'react';
import { Character, ChoiceEvent, Stats } from '../types';
import { Sparkles, Sword, Heart, HeartCrack, Star, ChevronRight, Coins, HandCoins, Skull, UserPlus, TrendingUp, Medal, Home, Flame } from 'lucide-react';
import { processRelationshipChoiceAction } from '../services/relationshipEventService';

interface Props {
    character: Character;
    event: ChoiceEvent;
    onResolve: (updatedChar: Character, outcomeText: string, selectedIdx: number) => void;
}

const ChoiceEventModal: React.FC<Props> = ({ character, event, onResolve }) => {

    // Determine Theme styling
    const getThemeConfig = () => {
        const title = event.title || '';
        const actions = event.options.map(o => o.action).join(' ');
        
        if (title.includes('이별') || title.includes('결별') || actions.includes('breakup')) {
            return {
                badge: '이별의 기로 • Breakup Event',
                badgeBg: 'bg-purple-950/90 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
                border: 'border-purple-500/60 shadow-[0_0_50px_rgba(168,85,247,0.25)]',
                headerBg: 'from-purple-950/90 via-slate-900 to-indigo-950/90',
                iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
                Icon: HeartCrack,
            };
        }
        if (title.includes('질투') || title.includes('연인') || title.includes('데이트') || title.includes('권태기') || actions.includes('jealousy') || actions.includes('date') || actions.includes('burnout')) {
            return {
                badge: '인연 & 연애 이벤트',
                badgeBg: 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
                border: 'border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.25)]',
                headerBg: 'from-rose-950/90 via-slate-900 to-pink-950/90',
                iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
                Icon: Heart,
            };
        }
        if (title.includes('기지') || title.includes('소동') || actions.includes('base_event')) {
            return {
                badge: '기지 거주 동료 이벤트',
                badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                border: 'border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.2)]',
                headerBg: 'from-emerald-950/90 via-slate-900 to-teal-950/90',
                iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
                Icon: Home,
            };
        }
        if (title.includes('용병') || title.includes('진압') || title.includes('대련') || title.includes('전투') || actions.includes('fight') || actions.includes('military')) {
            return {
                badge: '전투 & 군사 선택',
                badgeBg: 'bg-red-950/90 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
                border: 'border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.25)]',
                headerBg: 'from-red-950/90 via-slate-900 to-rose-950/90',
                iconBg: 'bg-red-500/20 text-red-400 border-red-500/50',
                Icon: Sword,
            };
        }
        return {
            badge: '운명의 순간 • Choice Event',
            badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
            border: 'border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.25)]',
            headerBg: 'from-amber-950/90 via-slate-900 to-amber-950/90',
            iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
            Icon: Sparkles,
        };
    };

    const theme = getThemeConfig();

    const handleOptionSelect = (idx: number) => {
        const option = event.options[idx];
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.pendingChoiceEvent = undefined;

        // Apply Logic based on action
        if (option.action === 'stats_gain') {
            const boost = 2;
            const keys: (keyof Stats)[] = ['str', 'agi', 'def'];
            keys.forEach(k => newChar.stats[k] += boost);
            if (newChar.schoolData) {
                newChar.schoolData.reputation -= 10;
                newChar.schoolData.classmates.forEach(s => {
                    if (s.id === option.callbackId) s.affection = Math.max(-100, s.affection - 40);
                });
            }
        } 
        else if (option.action === 'affection_gain') {
            if (newChar.schoolData) {
                newChar.schoolData.reputation += 10;
                newChar.schoolData.classmates.forEach(s => {
                    if (s.id === option.callbackId) s.affection = Math.min(100, s.affection + 30);
                });
            }
        }
        else if (option.action === 'mercenary_wisdom' || option.action === 'military_discipline') {
            newChar.hasMetLegendaryGraduate = true;
            const boost = 5;
            const keys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl'];
            keys.forEach(k => newChar.stats[k] += boost);
            newChar.stats.maxHp += 200;
            newChar.stats.hp = newChar.stats.maxHp;
            
            if (option.action === 'mercenary_wisdom' && newChar.mercenaryData) {
                newChar.mercenaryData.reputation += 10;
            } else if (newChar.militaryData) {
                newChar.militaryData.merit += 10;
            }
            
            if (newChar.pendingInstructors) {
                const chosenOne = newChar.pendingInstructors.find(i => i.id === option.callbackId);
                if (chosenOne) {
                    if (!newChar.socialNetwork) newChar.socialNetwork = [];
                    if (!newChar.socialNetwork.some(sn => sn.id === chosenOne.id)) {
                        newChar.socialNetwork.push(chosenOne);
                    }
                }
                newChar.pendingInstructors = undefined;
            }
        }
        else if (option.action === 'regional_petition_resolve') {
            const data = JSON.parse(option.callbackId);
            if (newChar.militaryData?.regionStats?.[data.city]) {
                const rStats = newChar.militaryData.regionStats[data.city];
                rStats.budget -= (data.cost || 0);
                rStats.sentiment = Math.min(100, rStats.sentiment + (data.val || 0));
            }
        }
        else if (option.action === 'regional_petition_ignore') {
            const data = JSON.parse(option.callbackId);
            if (newChar.militaryData?.regionStats?.[data.city]) {
                const rStats = newChar.militaryData.regionStats[data.city];
                rStats.sentiment = Math.max(0, rStats.sentiment + (data.val || -10));
                newChar.infamy = (newChar.infamy || 0) + (data.infamy || 5);
            }
        }
        else if (option.action === 'regional_uprising_resolve') {
            const data = JSON.parse(option.callbackId);
            if (newChar.militaryData?.regionStats?.[data.city]) {
                const rStats = newChar.militaryData.regionStats[data.city];
                rStats.budget = Math.max(0, rStats.budget - data.cost);
                rStats.sentiment = Math.min(100, rStats.sentiment + data.sentimentGain);
            }
        }
        else if (
            option.action.startsWith('jealousy_') ||
            option.action.startsWith('date_') ||
            option.action.startsWith('burnout_') ||
            option.action.startsWith('base_event_') ||
            option.action.startsWith('breakup_')
        ) {
            const processedChar = processRelationshipChoiceAction(newChar, option.action, option.callbackId);
            Object.assign(newChar, processedChar);
        }
        onResolve(newChar, option.outcome, idx);
    };

    // Number key shortcuts (1 ~ N)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const keyNum = parseInt(e.key, 10);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= event.options.length) {
                handleOptionSelect(keyNum - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [event]);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
            
            {/* Modal Container */}
            <div className={`relative w-full max-w-xl bg-slate-950 border ${theme.border} rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300`}>
                
                {/* Background Ambient Glow Accents */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header Section */}
                <div className={`relative bg-gradient-to-r ${theme.headerBg} p-5 sm:p-6 border-b border-slate-800 flex items-start gap-4`}>
                    <div className={`p-3 rounded-2xl ${theme.iconBg} border shrink-0 shadow-lg flex items-center justify-center`}>
                        <theme.Icon className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`inline-block text-[11px] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-md border ${theme.badgeBg} shadow-sm mb-1.5`}>
                            {theme.badge}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-50 tracking-tight leading-snug drop-shadow-md">
                            {event.title}
                        </h3>
                    </div>
                </div>

                {/* Event Description Card */}
                <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-slate-800/80 text-sm sm:text-base leading-relaxed text-slate-200 font-medium whitespace-pre-wrap max-h-[220px] overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-950/70 p-4 sm:p-5 rounded-xl border border-slate-800/90 shadow-inner">
                        {event.description}
                    </div>
                </div>

                {/* Options List */}
                <div className="p-4 sm:p-6 space-y-3 bg-slate-950 max-h-[340px] overflow-y-auto custom-scrollbar">
                    {event.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            className="w-full group text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/70 hover:bg-gradient-to-r hover:from-slate-900 hover:to-slate-850 transition-all duration-200 flex items-center justify-between shadow-lg hover:shadow-amber-500/10 active:scale-[0.99] relative overflow-hidden"
                        >
                            {/* Left highlight bar on hover */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start gap-3.5 pr-2 min-w-0">
                                {/* Number Badge */}
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:scale-105 transition-all shadow-md">
                                    {idx + 1}
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <p className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors leading-snug">
                                        {opt.text}
                                    </p>
                                    
                                    {/* Action Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        {opt.action.includes('stats') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                                <TrendingUp size={11}/> 능력치 대폭 상승
                                            </span>
                                        )}
                                        {opt.action.includes('affection') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1">
                                                <Heart size={11}/> 인연 및 평판 강화
                                            </span>
                                        )}
                                        {opt.action.includes('mercenary') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                                <Sword size={11}/> 용병의 투지
                                            </span>
                                        )}
                                        {opt.action.includes('military') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                                                <Medal size={11}/> 군인의 명예
                                            </span>
                                        )}
                                        {opt.action === 'join_guild' && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                                                <UserPlus size={11}/> 새로운 소속 이적
                                            </span>
                                        )}
                                        {opt.action.includes('uprising_resolve') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                                                <HandCoins size={11}/> 평화적 수습
                                            </span>
                                        )}
                                        {opt.action.includes('uprising_fight') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                                <Sword size={11}/> 무력 진압
                                            </span>
                                        )}
                                        {opt.action.includes('petition_resolve') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                                                <Coins size={11}/> 민심 수습
                                            </span>
                                        )}
                                        {opt.action.includes('petition_ignore') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                                <Skull size={11}/> 민원 묵살
                                            </span>
                                        )}
                                        {opt.action.startsWith('breakup_') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                                                <HeartCrack size={11}/> 이별의 기로
                                            </span>
                                        )}
                                        {opt.action.startsWith('jealousy_') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1">
                                                <Heart size={11}/> 질투 대응
                                            </span>
                                        )}
                                        {opt.action.startsWith('date_') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-500/30 font-bold flex items-center gap-1">
                                                <Sparkles size={11}/> 달콤한 데이트
                                            </span>
                                        )}
                                        {opt.action.startsWith('burnout_') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                                                <Flame size={11}/> 권태기 시련
                                            </span>
                                        )}
                                        {opt.action.startsWith('base_event_') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                                <Home size={11}/> 기지 동료 교류
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" size={20} />
                        </button>
                    ))}
                </div>

                {/* Footer Bar */}
                <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800/80 text-center flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                        선택에 따라 스탯, 골드, 명성 및 동료 호감도에 즉시 영향을 줍니다.
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono hidden sm:inline-block">
                        [숫자키 1~{event.options.length} 지원]
                    </span>
                </div>

            </div>
        </div>
    );
};

export default ChoiceEventModal;
