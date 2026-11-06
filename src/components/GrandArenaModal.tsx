
import React, { useState, useEffect } from 'react';
import { Character, GrandArenaState, ArenaParticipant, ArenaMatch, MercenaryRank, Enemy, ClassTier, SkillType, JobType, Stats } from '../types';
import { X, Trophy, Sword, Users, Shield, Skull, Crown, Star, GitBranch, MessageCircle, AlertTriangle, Coins, TrendingUp, UserCheck, Flame, Loader2 } from 'lucide-react';
import { ARENA_CROWD_CHEERS, generateArenaParticipant } from '../grandArena';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
}

const GrandArenaModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const [arenaState, setArenaState] = useState<GrandArenaState | null>(character.mercenaryData?.arenaState || null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [cheer, setCheer] = useState(ARENA_CROWD_CHEERS[0]);
    const [isLoading, setIsLoading] = useState(false);

    const currentYear = parseInt(character.currentDate?.split('-')[0] || '2000');
    const mData = character.mercenaryData;

    useEffect(() => {
        const interval = setInterval(() => {
            setCheer(ARENA_CROWD_CHEERS[Math.floor(Math.random() * ARENA_CROWD_CHEERS.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleEnterArena = () => {
        if (!mData) return;
        
        setIsLoading(true);
        setTimeout(() => {
            const newState: GrandArenaState = {
                year: currentYear,
                currentRound: 64, // 64강부터 시작
                history: [],
                isEliminated: false,
                lastParticipationYear: currentYear
            };
            
            const newChar = { ...character };
            newChar.mercenaryData!.arenaState = newState;
            onUpdateCharacter(newChar, `[그랜드 아레나] ${currentYear}년도 전 세계 용병 랭킹전에 참전했습니다! (64강 진출)`);
            setArenaState(newState);
            setIsLoading(false);
        }, 1000);
    };

    const handleMatchStart = () => {
        if (!arenaState || !mData) return;

        const round = arenaState.currentRound;
        const opponent = generateArenaParticipant(character.currentLocation?.nation || '대한민국', round);
        
        // 토너먼트 라운드별 심화 보정 (결승으로 갈수록 더욱 강력한 아레나 투사)
        const roundMult = round <= 2 ? 3.5 : round <= 4 ? 3.0 : round <= 8 ? 2.5 : round <= 16 ? 2.0 : 1.6;
        const hpMultiplier = 18.0 * roundMult;
        const statMultiplier = 5 * roundMult;
        const finalHp = Math.floor(opponent.stats.maxHp * hpMultiplier);

        const arenaEnemyStats: Stats = {
            ...opponent.stats,
            hp: finalHp,
            maxHp: finalHp,
            mp: Math.floor(opponent.stats.mp * 4.0),
            maxMp: Math.floor(opponent.stats.maxMp * 4.0),
            str: Math.floor(opponent.stats.str * statMultiplier),
            int: Math.floor(opponent.stats.int * statMultiplier),
            def: Math.floor(opponent.stats.def * (statMultiplier * 1.1)),
            agi: Math.floor(opponent.stats.agi * statMultiplier),
            wis: Math.floor(opponent.stats.wis * statMultiplier),
            ctrl: Math.floor(opponent.stats.ctrl * (statMultiplier * 1.4))
        };

        const enemy: Enemy = {
            name: opponent.name,
            level: opponent.level,
            hp: finalHp,
            maxHp: finalHp,
            stats: arenaEnemyStats,
            shinryokuType: opponent.shinryokuType || '무속성',
            statusEffects: [],
            description: `${opponent.mercenaryRank}급 용병입니다. 전적: ${opponent.winCount}승 ${opponent.lossCount}패.`,
            skills: [
                {
                    name: "아레나의 일격",
                    description: "관중의 환호에 힘입은 강력한 일격.",
                    type: SkillType.PHYSICAL,
                    tier: ClassTier.FIRST,
                    mpCost: 20,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: "STR*2.5",
                    powerRatio: 250,
                    targetType: 'single'
                }
            ],
            gender: opponent.gender,
            race: opponent.race,
            nation: opponent.nation,
            visualUrl: opponent.visualUrl,
            combatStyle: opponent.combatStyle,
            mercenaryRank: opponent.mercenaryRank,
            job: JobType.MERCENARY
        } as any;

        onBattle(enemy, 'arena');
        onClose(); 
    };

    const getRoundName = (round: number) => {
        if (round === 0) return "CHAMPION (올해의 제왕)";
        if (round === 1) return "CHAMPION (올해의 제왕)";
        if (round === 2) return "결승전";
        return `${round}강전`;
    };

    const renderBracket = () => {
        if (!arenaState) return null;
        if (arenaState.currentRound === 0) return (
            <div className="w-full max-w-2xl mx-auto py-8 animate-in zoom-in">
                 <div className="bg-amber-900/20 border-2 border-amber-500 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                     <Crown size={80} className="text-amber-400 mx-auto mb-6 animate-bounce" />
                     <h3 className="text-4xl font-bold text-white font-cinzel mb-2">올해 챔피언</h3>
                     <p className="text-amber-200 text-lg">{character.name} 님은 올해의 그랜드 아레나 챔피언입니다.</p>
                 </div>
            </div>
        );

        return (
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center py-4 bg-indigo-950/30 border border-indigo-500/50 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest block mb-1">현재 진행상황</span>
                    <h3 className="text-4xl font-bold text-white font-cinzel">{getRoundName(arenaState.currentRound)}</h3>
                </div>

                <div className="grid grid-cols-6 gap-2 text-[8px] md:text-[10px] font-bold text-slate-500 text-center uppercase tracking-tighter">
                    <div className={arenaState.currentRound <= 64 ? "text-indigo-400" : ""}>64강</div>
                    <div className={arenaState.currentRound <= 32 ? "text-indigo-400" : ""}>32강</div>
                    <div className={arenaState.currentRound <= 16 ? "text-indigo-400" : ""}>16강</div>
                    <div className={arenaState.currentRound <= 8 ? "text-indigo-400" : ""}>8강</div>
                    <div className={arenaState.currentRound <= 4 ? "text-indigo-400" : ""}>4강</div>
                    <div className={arenaState.currentRound <= 2 ? "text-amber-500" : ""}>결승</div>
                </div>

                <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-1000"
                        style={{ width: `${((64 - arenaState.currentRound) / 64) * 100 + 5}%` }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border border-indigo-500 w-full max-w-4xl h-[85vh] rounded-3xl shadow-[0_0_80px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden relative">
                {/* Background Animation */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                
                {/* Cheering Crowd Banner */}
                <div className="bg-indigo-600/20 py-2 border-b border-indigo-500/30 overflow-hidden shrink-0">
                    <div className="flex whitespace-nowrap animate-marquee">
                        <span className="mx-10 text-xs font-bold text-indigo-300 italic flex items-center gap-2">
                            <MessageCircle size={14}/> {cheer}
                        </span>
                        <span className="mx-10 text-xs font-bold text-indigo-300 italic flex items-center gap-2">
                            <MessageCircle size={14}/> {cheer}
                        </span>
                    </div>
                </div>

                <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center">
                        <div className="p-3 bg-indigo-900/30 rounded-2xl border border-indigo-500/50 mr-4 shadow-lg">
                            <Trophy size={32} className="text-amber-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-wider">그랜드 아레나</h2>
                            <p className="text-xs text-indigo-400 font-bold uppercase">{currentYear}년도 세계 랭킹 토너먼트</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar z-10 flex flex-col">
                    {!arenaState ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95">
                            <div className="relative">
                                <Users size={80} className="text-slate-700 opacity-50" />
                                <Sword size={40} className="absolute -bottom-2 -right-2 text-red-500 animate-bounce" />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-2xl font-bold text-white mb-2">영광의 무대, 그랜드 아레나</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    전 세계의 실력 있는 용병들이 모여 최강자를 가리는 자리입니다.<br/>
                                    64강부터 시작하여 결승까지, 오직 실력만으로 승부하십시오.<br/>
                                    우승 시 막대한 <span className="text-amber-400 font-bold">명성(RP)</span>과 <span className="text-amber-400 font-bold">금상</span>이 수여됩니다.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm bg-slate-950 p-6 rounded-2xl border border-slate-800">
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">참가 자격</div>
                                    <div className="text-sm text-green-400 font-bold">용병 (B급 이상 권장)</div>
                                </div>
                                <div className="text-center border-l border-slate-800">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">개최 주기</div>
                                    <div className="text-sm text-blue-400 font-bold">매년 12월</div>
                                </div>
                            </div>

                            <button 
                                onClick={handleEnterArena}
                                disabled={isLoading}
                                className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-900/40 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin"/> : <Star size={20}/>}
                                <span>토너먼트 참가 신청</span>
                            </button>
                        </div>
                    ) : arenaState.isEliminated ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in">
                            <Skull size={80} className="text-red-500 opacity-50" />
                            <h3 className="text-4xl font-bold text-red-500 font-cinzel">탈락</h3>
                            <p className="text-slate-400">안타깝게도 패배하여 올해의 도전을 마쳤습니다.</p>
                            <div className="bg-slate-950 p-4 rounded-xl border border-red-900/30 text-xs text-red-300">
                                패배로 인해 명성치가 하락하고 치료비가 지출되었습니다.
                            </div>
                            <button onClick={onClose} className="px-8 py-2 bg-slate-800 text-white rounded-lg">나가기</button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col space-y-10">
                            {renderBracket()}

                            {arenaState.currentRound > 0 ? (
                                <>
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-6">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="w-24 h-24 rounded-full bg-blue-900/20 border-4 border-blue-500 flex items-center justify-center text-4xl shadow-2xl">👑</div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-white">{character.name}</div>
                                                <div className="text-xs text-blue-400 font-bold uppercase">{mData?.rank}등급 용병</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="text-slate-500 font-cinzel text-2xl font-bold mb-2">VS</div>
                                            <div className="w-16 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                        </div>

                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="w-24 h-24 rounded-full bg-red-900/20 border-4 border-red-500 flex items-center justify-center text-4xl shadow-2xl relative">
                                                👤
                                                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold animate-pulse">RANKER</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-white">매칭 대기 중...</div>
                                                <div className="text-xs text-red-400 font-bold uppercase">준비 완료</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto max-w-md mx-auto w-full">
                                        <button 
                                            onClick={handleMatchStart}
                                            className="w-full py-5 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-900/20 transition-all transform hover:scale-105 flex items-center justify-center gap-4 group"
                                        >
                                            <Sword size={24} className="group-hover:rotate-12 transition-transform" />
                                            <span className="text-xl tracking-tighter">경기장 입장</span>
                                        </button>
                                        <p className="text-[10px] text-slate-500 text-center mt-3 uppercase tracking-widest">Victory brings glory. Defeat brings shame.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10">
                                     <button onClick={onClose} className="px-10 py-3 bg-amber-700 text-white rounded-xl font-bold">영광을 뒤로하고 나가기</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-6 text-xs font-mono">
                        <div className="flex items-center text-amber-400"><Coins size={14} className="mr-1.5"/> {character.money.toLocaleString()} G</div>
                        <div className="flex items-center text-red-400"><TrendingUp size={14} className="mr-1.5"/> RP: {mData?.reputation || 0}</div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors">잠시 물러나기</button>
                </div>
            </div>
        </div>
    );
};

export default GrandArenaModal;
