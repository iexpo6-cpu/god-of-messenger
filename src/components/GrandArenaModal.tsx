
import React, { useState, useEffect } from 'react';
import { Character, GrandArenaState, ArenaParticipant, ArenaMatch, MercenaryRank, Enemy, ClassTier, SkillType, JobType, Stats } from '../types';
import { X, Trophy, Sword, Users, Shield, Skull, Crown, Star, GitBranch, MessageCircle, AlertTriangle, Coins, TrendingUp, UserCheck, Flame, Loader2 } from 'lucide-react';
import { ARENA_CROWD_CHEERS, generateArenaParticipant } from '../grandArena';
import ActionResultModal, { ResultData } from './ActionResultModal';
import ChallengeLobbyCanvas, { ChallengeLobbyNpc } from './ChallengeLobbyCanvas';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    embedded?: boolean;
}

const GrandArenaModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle, embedded = false }) => {
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
        <div className={embedded ? 'w-full h-full flex-1 flex flex-col animate-in fade-in relative' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in'}>
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className={embedded ? 'bg-slate-900 border border-indigo-500 w-full h-full flex-1 rounded-2xl flex flex-col overflow-hidden relative' : 'bg-slate-900 border border-indigo-500 w-full max-w-4xl h-[85vh] rounded-3xl shadow-[0_0_80px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden relative'}>
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

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-900 custom-scrollbar z-10 flex flex-col">
                    <ChallengeLobbyCanvas
                        character={character}
                        mode="grand_arena"
                        title="그랜드 아레나 · 투기장 대기실"
                        subtitle={
                            !arenaState
                                ? `${currentYear}년도 세계 랭킹 토너먼트 · 접수관에게 참가 신청하세요`
                                : arenaState.isEliminated
                                    ? `${currentYear}년도 토너먼트 탈락`
                                    : arenaState.currentRound === 0
                                        ? `${currentYear}년도 그랜드 아레나 챔피언!`
                                        : `현재 진행: ${getRoundName(arenaState.currentRound)} · 중앙 링의 랭커에게 도전하세요`
                        }
                        cheerText={cheer}
                        onClose={onClose}
                        heightClassName="h-[460px] sm:h-[520px]"
                        npcs={(() => {
                            const list: ChallengeLobbyNpc[] = [
                                {
                                    id: 'grand_official',
                                    name: '아레나 총진행관',
                                    role: '그랜드 아레나 접수 및 대진 관리',
                                    tx: 7,
                                    ty: 7,
                                    dir: 'down',
                                    gender: 'male',
                                    kind: 'official',
                                    dialogue: !arenaState
                                        ? `영광의 무대, 그랜드 아레나에 오신 것을 환영합니다!\n전 세계 실력 있는 용병들이 64강부터 결승까지 격돌합니다. 참가 신청을 하시겠습니까?`
                                        : arenaState.isEliminated
                                            ? `안타깝게도 올해 토너먼트에서 탈락하셨습니다. 내년 12월 대회에 다시 도전하십시오.`
                                            : arenaState.currentRound === 0
                                                ? `축하합니다, ${character.name} 님! 올해 그랜드 아레나의 제왕이 되셨습니다!`
                                                : `현재 라운드: ${getRoundName(arenaState.currentRound)}\n중앙 링에 대기 중인 다음 랭커 도전자에게 걸어가 결투를 시작하십시오.`,
                                    actionLabel: !arenaState ? '토너먼트 참가 신청 (64강)' : undefined,
                                    onAction: !arenaState ? handleEnterArena : undefined
                                }
                            ];

                            if (arenaState && !arenaState.isEliminated && arenaState.currentRound > 0) {
                                list.push({
                                    id: 'grand_challenger',
                                    name: `랭커 도전자 (${getRoundName(arenaState.currentRound)})`,
                                    role: `RANKER · ${getRoundName(arenaState.currentRound)} 상대`,
                                    tx: 12,
                                    ty: 5,
                                    dir: 'down',
                                    gender: 'male',
                                    auraColor: 'rgba(239, 68, 68, 0.45)',
                                    kind: 'challenger',
                                    dialogue: `호오, ${mData?.rank || 'C'}급 용병 ${character.name}인가?\n${getRoundName(arenaState.currentRound)} 무대에서 네 실력이 진짜인지 시험해 주마!\n관중들의 함성 속에서 누가 살아남을지 겨뤄보자!`,
                                    actionLabel: '경기장 입장 (결투 시작)',
                                    onAction: handleMatchStart
                                });
                            }

                            const standCoords: Array<[number, number, 'left' | 'right']> = [
                                [1, 3, 'right'], [2, 5, 'right'], [1, 7, 'right'], [2, 9, 'right'], [1, 11, 'right'], [2, 13, 'right'],
                                [21, 3, 'left'], [22, 5, 'left'], [21, 7, 'left'], [22, 9, 'left'], [21, 11, 'left'], [22, 13, 'left']
                            ];
                            standCoords.forEach(([tx, ty, dir], idx) => {
                                list.push({
                                    id: `grand_spec_${idx}`,
                                    name: `투기장 관중 ${idx + 1}`,
                                    role: '그랜드 아레나 관객',
                                    tx,
                                    ty,
                                    dir,
                                    gender: idx % 2 === 0 ? 'male' : 'female',
                                    kind: 'spectator',
                                    dialogue: ARENA_CROWD_CHEERS[idx % ARENA_CROWD_CHEERS.length]
                                });
                            });

                            return list;
                        })()}
                    />
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
