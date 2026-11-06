
import React from 'react';
import { Character, Quest } from '../types';
import { ScrollText, CheckCircle, Clock, Skull, Truck, Zap, Target, Shield, Compass, Trees, Sun, Text, Coins, Award, Package, Eye, Search, Heart, ChevronRight, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    character: Character;
    onToggleTrack: (questId: string) => void;
}

const QuestTracker: React.FC<Props> = ({ character, onToggleTrack }) => {
    // 모바일에서는 화면 및 메뉴를 가리지 않도록 기본 접힌 상태로 시작
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    const trackedQuestIds = character?.trackedQuestIds || [];
    if (trackedQuestIds.length === 0) return null;

    const mercenaryQuests = Array.isArray(character?.mercenaryData?.activeQuests) ? character.mercenaryData.activeQuests : [];
    const militaryMissions = Array.isArray(character?.militaryData?.activeMissions) ? character.militaryData.activeMissions : [];
    
    const allActiveQuests = [
        ...mercenaryQuests.map(q => ({ ...q, category: 'Mercenary' })),
        ...militaryMissions.map(m => ({ ...m, category: 'Military' }))
    ];

    const trackedQuests = allActiveQuests.filter(q => q && trackedQuestIds.includes(q.id));

    if (trackedQuests.length === 0) return null;

    // 완료 가능한 퀘스트가 있는지 확인
    const hasCompletedQuest = trackedQuests.some(quest => {
        let current = quest.currentAmount || 0;
        const target = quest.targetAmount || 1;
        const targetName = quest.targetName || "대상";
        if ((quest.type === 'Collection' || quest.type === 'MilitarySupply') && targetName) {
            current = (character?.inventory || []).reduce((acc, item) => {
                if (item && item.name === targetName) return acc + (item.stock || 1);
                return acc;
            }, 0);
        }
        return current >= target;
    });

    const getQuestIcon = (type: string, category: string) => {
        if (category === 'Military') {
            switch(type) {
                case 'Subjugation': return <Skull className="text-red-500" size={14}/>;
                case 'MilitaryPatrol': return <Compass className="text-blue-400" size={14}/>;
                case 'MilitaryDefense': return <Shield className="text-blue-400" size={14}/>;
                case 'MilitaryEscort': return <Truck className="text-blue-400" size={14}/>;
                case 'MilitarySupply': return <Package className="text-amber-400" size={14}/>;
                case 'MilitaryRecon': return <Eye className="text-indigo-400" size={14}/>;
                default: return <Shield className="text-blue-400" size={14}/>;
            }
        }
        switch(type) {
            case 'Subjugation': return <Skull className="text-red-500" size={14}/>;
            case 'Collection': return <Coins className="text-amber-400" size={14}/>;
            case 'Investigation': return <Search className="text-indigo-400" size={14}/>;
            case 'Rescue': return <Heart className="text-pink-500" size={14}/>;
            case 'MercenaryEscort': return <Truck className="text-blue-400" size={14}/>;
            case 'DivineOracle': return <Sun className="text-white-500" size={14}/>;
            case 'DemonContract': return <Text className="text-red-500" size={14}/>;
            case 'RacialNatureProtection': return <Trees className="text-green-500" size={14}/>;
            case 'BeastArenaBattle': return <Zap className="text-white-500" size={14}/>;
            default: return <ScrollText className="text-slate-400" size={14}/>;
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-28 right-2 md:top-20 md:right-4 z-30 w-auto max-w-[220px] sm:max-w-[240px] md:w-64 pointer-events-none"
        >
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
                {/* Header */}
                <div 
                    className={`p-2.5 md:p-3 ${!isCollapsed ? 'border-b border-slate-800' : ''} flex justify-between items-center cursor-pointer hover:bg-slate-900/50 transition-colors gap-2`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <ScrollText size={15} className="text-indigo-400 shrink-0" />
                        <span className="text-[11px] md:text-xs font-bold text-slate-200 uppercase tracking-wider font-cinzel truncate">Quest</span>
                        <span className="bg-indigo-600 text-[10px] px-1.5 py-0.2 rounded-full text-white font-bold shrink-0">
                            {trackedQuests.length}
                        </span>
                        {hasCompletedQuest && (
                            <span className="flex h-2 w-2 relative shrink-0" title="완료 가능한 의뢰 있음">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        )}
                    </div>
                    {isCollapsed ? <ChevronRight size={15} className="text-slate-500 shrink-0" /> : <ChevronDown size={15} className="text-slate-500 shrink-0" />}
                </div>

                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {trackedQuests.map(quest => {
                                    let current = quest.currentAmount || 0;
                                    const target = quest.targetAmount || 1;
                                    const targetName = quest.targetName || "대상";

                                    if ((quest.type === 'Collection' || quest.type === 'MilitarySupply') && targetName) {
                                        current = character.inventory.reduce((acc, item) => {
                                            if (item.name === targetName) return acc + (item.stock || 1);
                                            return acc;
                                        }, 0);
                                    }

                                    const isReady = current >= target;
                                    const progressPercent = Math.min(100, (current / target) * 100);

                                    return (
                                        <div key={quest.id} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-2.5 relative group">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleTrack(quest.id);
                                                }}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                                                title="추적 해제"
                                            >
                                                <X size={12} />
                                            </button>

                                            <div className="flex items-start gap-2 mb-1.5">
                                                <div className="mt-0.5">
                                                    {getQuestIcon(quest.type, quest.category)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-[11px] font-bold truncate flex items-center gap-1.5 ${isReady ? 'text-green-400' : 'text-slate-200'}`}>
                                                        {quest.isEmergency && <span className="bg-red-900/50 text-red-400 border border-red-500/50 text-[8px] px-1 py-0.5 rounded uppercase tracking-wider shrink-0">긴급</span>}
                                                        <span className="truncate">{quest.title}</span>
                                                    </h4>
                                                    <p className="text-[9px] text-slate-500 truncate italic">
                                                        {quest.goal}
                                                    </p>
                                                </div>
                                            </div>

                                            {quest.targetAmount && quest.targetAmount > 0 && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[9px] font-mono">
                                                        <span className="text-slate-400 truncate max-w-[70%]">{targetName}</span>
                                                        <span className={isReady ? 'text-green-400' : 'text-indigo-400'}>
                                                            {current}/{target}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progressPercent}%` }}
                                                            className={`h-full ${isReady ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-indigo-500'}`}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {isReady && (
                                                <div className="mt-1.5 flex items-center gap-1 text-[9px] text-green-400 font-bold animate-pulse">
                                                    <CheckCircle size={10} />
                                                    <span>완료 가능</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default QuestTracker;
