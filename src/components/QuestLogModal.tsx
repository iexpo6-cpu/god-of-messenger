
import React, { useState, useEffect, useRef } from 'react';
import { Character, Quest, MercenaryRank } from '../types';
import { X, ScrollText, CheckCircle, Clock, Skull, Truck, Zap, Target, Shield, Compass, Trees,Sun,Text,Coins, Award, Trash2, Medal, Package, Eye, Search, Heart, Move } from 'lucide-react';

interface Props {
    character: Character;
    onClose: () => void;
    onCompleteQuest: (questId: string) => void;
    onAbandonQuest: (questId: string) => void;
    onToggleTrack: (questId: string) => void;
}

const QuestLogModal: React.FC<Props> = ({ character, onClose, onCompleteQuest, onAbandonQuest, onToggleTrack }) => {
    // Mobile viewport detection
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 640;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Dragging state
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            const width = Math.min(672, window.innerWidth - 32);
            const height = Math.min(window.innerHeight * 0.82, 680);
            const x = Math.max(10, Math.floor((window.innerWidth - width) / 2));
            const y = Math.max(10, Math.floor((window.innerHeight - height) / 2));
            return { x, y };
        }
        return { x: 100, y: 60 };
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMobile) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
            return;
        }
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        startPos.current = { ...position };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isMobile) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
            return;
        }
        setIsDragging(true);
        const touch = e.touches[0];
        dragStart.current = { x: touch.clientX, y: touch.clientY };
        startPos.current = { ...position };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 320, startPos.current.x + dx)),
                y: Math.max(0, Math.min(window.innerHeight - 150, startPos.current.y + dy))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - dragStart.current.x;
            const dy = touch.clientY - dragStart.current.y;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 320, startPos.current.x + dx)),
                y: Math.max(0, Math.min(window.innerHeight - 150, startPos.current.y + dy))
            });
        };

        const handleTouchEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    // Unify mercenary and military quests
    const mercenaryQuests = character.mercenaryData?.activeQuests || [];
    const militaryMissions = character.militaryData?.activeMissions || [];
    
    const trackedQuestIds = character.trackedQuestIds || [];

    const allActiveQuests = [
        ...mercenaryQuests.map(q => ({ ...q, category: 'Mercenary' })),
        ...militaryMissions.map(m => ({ ...m, category: 'Military' }))
    ];

    const getQuestIcon = (type: string, category: string) => {
        if (category === 'Military') {
            switch(type) {
                case 'Subjugation': return <Skull className="text-red-500" size={20}/>;
                case 'MilitaryPatrol': return <Compass className="text-blue-400" size={20}/>;
                case 'MilitaryDefense': return <Shield className="text-blue-400" size={20}/>;
                case 'MilitaryEscort': return <Truck className="text-blue-400" size={20}/>;
                case 'MilitarySupply': return <Package className="text-amber-400" size={20}/>;
                case 'MilitaryRecon': return <Eye className="text-indigo-400" size={20}/>;
                default: return <Shield className="text-blue-400" size={20}/>;
            }
        }
        switch(type) {
            case 'Subjugation': return <Skull className="text-red-500" size={20}/>;
            case 'Collection': return <Coins className="text-amber-400" size={20}/>;
            case 'Investigation': return <Search className="text-indigo-400" size={20}/>;
            case 'Rescue': return <Heart className="text-pink-500" size={20}/>;
            case 'MercenaryEscort': return <Truck className="text-blue-400" size={20}/>;
            case 'DivineOracle': return <Sun className="text-white-500" size={20}/>;
            case 'DemonContract': return <Text className="text-red-500" size={20}/>;
            case 'RacialNatureProtection': return <Trees className="text-green-500" size={20}/>;
            case 'BeastArenaBattle': return <Zap className="text-white-500" size={20}/>;
            default: return <ScrollText className="text-slate-400" size={20}/>;
        }
    };

    return (
        <div className={isMobile ? "fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200" : "fixed inset-0 z-[100] pointer-events-none"}>
            {/* Desktop backdrop (transparent pointer catcher only on click outside if desired) */}
            {!isMobile && (
                <div 
                    onClick={onClose} 
                    className="absolute inset-0 bg-black/50 pointer-events-auto backdrop-blur-[2px]" 
                />
            )}

            <div 
                style={!isMobile ? {
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '672px',
                    maxHeight: '82vh'
                } : undefined}
                className={`bg-slate-900 border border-red-500/50 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden pointer-events-auto ${
                    isDragging ? 'opacity-95 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : ''
                }`}
            >
                {/* Header (Draggable Handle) */}
                <div 
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0 cursor-move select-none gap-2"
                >
                    <div className="flex items-center min-w-0">
                        <ScrollText size={26} className="text-red-400 mr-2.5 sm:mr-3 shrink-0" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-bold text-white font-cinzel truncate">의뢰 및 임무 일지</h2>
                                {!isMobile && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                        <Move size={10} /> 드래그 이동 가능
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate">현재 수행 중인 모든 임무 목록입니다. (총 {allActiveQuests.length}개)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0"
                        aria-label="닫기"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 custom-scrollbar">
                    {allActiveQuests.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {allActiveQuests.map((quest) => {
                                let current = quest.currentAmount || 0;
                                const target = quest.targetAmount || 1;
                                const targetName = quest.targetName || "대상";

                                // [NEW] 아이템 수집 퀘스트의 경우 인벤토리에서 현재 수량 파악
                                if ((quest.type === 'Collection' || quest.type === 'MilitarySupply') && targetName) {
                                    current = character.inventory.reduce((acc, item) => {
                                        if (item.name === targetName) return acc + (item.stock || 1);
                                        return acc;
                                    }, 0);
                                }

                                 // [NEW] 전선 점유율 확보 퀘스트의 경우 외교 점유율 수치 실시간 검증
                                 let shareInfoText = '';
                                 if (quest.type === 'MilitaryAttackShare') {
                                     const diplomacyMap = character.militaryData?.diplomacy || {};
                                     const targetNat = quest.targetNation || quest.location?.nation || '';
                                     const cleanTarget = targetNat.trim();
                                     const matchedKey = Object.keys(diplomacyMap).find(n => {
                                         const cleanN = n.trim();
                                         return cleanN === cleanTarget || 
                                                cleanN.includes(cleanTarget) || 
                                                cleanTarget.includes(cleanN) ||
                                                cleanN.replace(/\s+/g, '').includes(cleanTarget.replace(/\s+/g, '')) ||
                                                cleanTarget.replace(/\s+/g, '').includes(cleanN.replace(/\s+/g, ''));
                                     });
                                     const relOccupation = matchedKey ? (diplomacyMap[matchedKey]?.occupation || 0) : 0;
                                     const reqShare = quest.requiredTotalShare !== undefined ? quest.requiredTotalShare : ((quest.initialShare || 0) + (quest.targetShare || 5));
                                     shareInfoText = `${targetNat || '적국'} 전선 점유율: ${relOccupation}% (목표: ${reqShare}%)`;

                                     if (relOccupation >= reqShare || (quest.currentAmount || 0) >= target) {
                                         current = target;
                                     }
                                 }

                                 // [NEW] 외교 사절단 호위 퀘스트의 경우 목적지 도시 도착 여부 실시간 판정
                                 if (quest.type === 'MilitaryDiplomaticEscort') {
                                     const destCity = (quest.destination?.city || quest.targetCity || '').trim();
                                     const curCity = (character.currentLocation?.city || '').trim();
                                     const isAtDest = destCity && curCity && (destCity === curCity || curCity.includes(destCity) || destCity.includes(curCity));
                                     
                                     if (isAtDest || (quest.currentAmount || 0) >= target) {
                                         current = target;
                                         shareInfoText = `목적지 (${quest.destination?.nation || ''} ${destCity}) 도착 완료 (보고 가능)`;
                                     } else {
                                         shareInfoText = `호위 목적지: ${quest.destination?.nation || ''} ${destCity} (현재 위치: ${curCity || '알 수 없음'})`;
                                     }
                                 }

                                 // [NEW] 던전 실종 군인 및 용병 실종자 구출 의뢰의 경우 구체적인 대상 도시 던전 안내
                                 if (quest.type === 'MilitaryDungeonSearch' || quest.type === 'Rescue' || quest.type === 'MercenaryDungeonSearch') {
                                     const targetCity = (quest.targetCity || quest.location?.city || '').trim();
                                     const curCity = (character.currentLocation?.city || '').trim();
                                     const isSameCity = targetCity && curCity && (targetCity === curCity || curCity.includes(targetCity) || targetCity.includes(curCity));
                                     if (current < target) {
                                         shareInfoText = `수색 구역: [${targetCity || '지정'} 던전] ${isSameCity ? '(현재 도시에서 던전 진입 필요)' : `(${targetCity || '목표 도시'}로 이동 필요)`}`;
                                     }
                                 }

                                 const isReady = current >= target;
                                 const progressPercent = Math.min(100, (current / target) * 100);
                                 const isMilitary = quest.category === 'Military';

                                 return (
                                     <div key={quest.id} className={`bg-slate-950 p-4 sm:p-5 rounded-xl border transition-all ${isReady ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : isMilitary ? 'border-blue-900/50' : 'border-slate-800'}`}>
                                         <div className="flex justify-between items-start mb-3 gap-2 flex-wrap sm:flex-nowrap">
                                             <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                 <div className={`p-2 rounded-lg border shrink-0 ${isMilitary ? 'bg-blue-950/30 border-blue-900' : 'bg-slate-900 border-slate-800'}`}>
                                                     {getQuestIcon(quest.type, quest.category)}
                                                 </div>
                                                 <div className="min-w-0">
                                                     <h3 className={`font-bold flex items-center gap-2 flex-wrap text-sm sm:text-base ${isMilitary ? 'text-blue-300' : 'text-slate-100'}`}>
                                                         {quest.isEmergency && <span className="bg-red-900/50 text-red-400 border border-red-500/50 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">긴급</span>}
                                                         <span className="truncate">{quest.title}</span>
                                                     </h3>
                                                     <p className="text-[10px] text-slate-500 uppercase tracking-widest">{quest.category} • {quest.rank} Rank</p>
                                                 </div>
                                             </div>
                                             <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start">
                                                 {!isReady && (
                                                     <button 
                                                         onClick={() => onToggleTrack(quest.id)}
                                                         className={`text-[10px] px-2 py-1 rounded border transition-all font-bold flex items-center gap-1 ${trackedQuestIds.includes(quest.id) ? 'bg-indigo-900/40 text-indigo-400 border-indigo-500' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'}`}
                                                         title={trackedQuestIds.includes(quest.id) ? "추적 해제" : "추적 시작"}
                                                     >
                                                         <Eye size={10} />
                                                         {trackedQuestIds.includes(quest.id) ? "추적 중" : "추적"}
                                                     </button>
                                                 )}
                                                 {!isReady && (
                                                     <button 
                                                         onClick={() => onAbandonQuest(quest.id)}
                                                         className="text-[10px] bg-slate-900 hover:bg-red-900/30 text-red-500 px-2 py-1 rounded border border-red-900/30 transition-all font-bold"
                                                     >
                                                         포기
                                                     </button>
                                                 )}
                                                 {isReady ? (
                                                     <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-1 rounded border border-green-500 animate-pulse font-bold">완료 가능</span>
                                                 ) : (
                                                     <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded border border-slate-800 flex items-center">
                                                         <Clock size={10} className="mr-1"/> 진행 중
                                                     </span>
                                                 )}
                                             </div>
                                         </div>

                                         <p className="text-xs text-slate-400 mb-4 bg-slate-900/50 p-3 rounded italic border-l-2 border-slate-700">
                                             "{quest.goal}"
                                         </p>

                                         {/* Progress Bar */}
                                         {quest.targetAmount && quest.targetAmount > 0 && (
                                             <div className="mb-4">
                                                 <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                                                     <span className="uppercase font-bold text-indigo-400">
                                                         {shareInfoText || `${targetName} (${current} / ${target})`}
                                                     </span>
                                                     <span className="font-bold">{Math.floor(progressPercent)}%</span>
                                                 </div>
                                                 <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                     <div 
                                                         className={`h-full transition-all duration-500 ${isReady ? 'bg-green-500' : isMilitary ? 'bg-blue-600' : 'bg-red-500'}`}
                                                         style={{ width: `${progressPercent}%` }}
                                                     ></div>
                                                 </div>
                                             </div>
                                         )}

                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-900 flex-wrap gap-2">
                                            <div className="flex gap-3 sm:gap-4">
                                                {quest.rewardGold > 0 && (
                                                    <div className="flex items-center text-amber-400 text-xs font-mono font-bold">
                                                        <Coins size={14} className="mr-1.5"/> {quest.rewardGold.toLocaleString()} G
                                                    </div>
                                                )}
                                                <div className="flex items-center text-indigo-400 text-xs font-mono font-bold">
                                                    <Zap size={14} className="mr-1.5"/> {quest.rewardExp.toLocaleString()} EXP
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => onCompleteQuest(quest.id)}
                                                disabled={!isReady}
                                                className={`px-5 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-lg ${isReady ? 'bg-green-700 hover:bg-green-600 text-white transform hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                                            >
                                                보고 및 보상 수령
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-20">
                            <ScrollText size={64} className="mb-4" />
                            <p className="text-lg font-cinzel">수행 중인 임무 없음</p>
                            <p className="text-sm mt-2">길드 게시판이나 군 사령부에서 명령을 수령하세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestLogModal;

