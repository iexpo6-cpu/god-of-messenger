
import React from 'react';
import { Trophy, Sword, Users, X, Crown, Medal, Skull, GitBranch } from 'lucide-react';
import { Character, TournamentState } from '../types';

interface Props {
    tournament: TournamentState;
    onClose: () => void;
    onStartMatch: () => void;
}

const TournamentModal: React.FC<Props> = ({ tournament, onClose, onStartMatch }) => {
    const isWinner = tournament.currentRound === 0;
    const isEliminated = !tournament.isActive && tournament.currentRound > 0;

    // Helper to calculate round name
    const getRoundName = (round: number) => {
        if (round === 1 || round === 2) return "결승전";
        if (round === 4) return "4강 준결승";
        if (round === 8) return "8강";
        return `${round}강`;
    };

    // Render Bracket Tree
    const renderBracket = () => {
        const matches = tournament.bracket || [];
        const roundMatches = matches.filter(m => m.round === tournament.currentRound).slice(0, 4);

        return (
            <div className="w-full space-y-4">
                <div className="text-center text-amber-400 text-sm font-bold mb-3 flex items-center justify-center">
                    <GitBranch size={16} className="mr-2"/> 대진표 (진행: {tournament.currentRound === 2 ? '결승전' : `${tournament.currentRound}강`})
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roundMatches.map((match, idx) => {
                        const isPlayerMatch = match.id === 1 || (tournament.currentRound <= 16 && match.id === 17) || (tournament.currentRound <= 8 && match.id === 25) || (tournament.currentRound <= 4 && match.id === 29) || (tournament.currentRound <= 2 && match.id === 31);
                        
                        return (
                            <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${isPlayerMatch ? 'bg-indigo-900/40 border-indigo-500 shadow-md' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                                <div className="text-right flex-1 pr-2 truncate">
                                    <span className={`text-xs font-bold ${isPlayerMatch ? 'text-blue-300' : 'text-slate-400'}`}>{match.p1}</span>
                                </div>
                                <div className="px-2 text-slate-500 font-mono text-xs">VS</div>
                                <div className="text-left flex-1 pl-2 truncate">
                                    <span className={`text-xs font-bold ${isPlayerMatch ? 'text-red-300' : 'text-slate-400'}`}>{match.p2}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {tournament.currentRound > 8 && (
                    <p className="text-center text-xs text-slate-500 mt-1">...외 {tournament.currentRound / 2 - 4}경기 진행 중</p>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 border border-amber-500/80 w-full max-w-xl rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 p-4 sm:p-5 border-b border-amber-500/30 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="text-amber-400" size={22}/>
                            <h2 className="text-lg sm:text-xl font-bold text-white">토너먼트 대진</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-amber-400 font-medium">{tournament.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 flex flex-col items-center space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                    {isEliminated ? (
                        <div className="text-center py-8">
                            <Skull size={64} className="mx-auto text-red-500 mb-4 animate-pulse" />
                            <h3 className="text-2xl sm:text-3xl font-bold text-red-500 mb-2">탈락</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                아쉽게도 이번 경기에서 패배하여 탈락했습니다.<br/>
                                <span className="text-xs text-slate-500 mt-2 block">실력을 갈고닦아 다음 대회에 도전하세요.</span>
                            </p>
                            <button 
                                onClick={onClose}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-colors text-sm"
                            >
                                닫기
                            </button>
                        </div>
                    ) : !isWinner ? (
                        <>
                            <div className="text-center">
                                <span className="text-xs text-slate-500 tracking-wider mb-1 block">현재 라운드</span>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1 animate-pulse">{getRoundName(tournament.currentRound)}</h3>
                                <p className="text-sm text-slate-400">
                                    상대: <span className="text-red-400 font-bold">{tournament.opponentName || "미정"}</span>
                                </p>
                            </div>
                            
                            {/* Bracket Visualization */}
                            {renderBracket()}

                            <div className="w-full bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 flex items-center justify-between mt-auto">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-900/40 border border-blue-500 flex items-center justify-center mb-1.5">
                                        <Users className="text-blue-400" size={18}/>
                                    </div>
                                    <span className="text-xs font-bold text-blue-300">나</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-slate-500 font-mono mb-0.5">VS</span>
                                    <Sword className="text-red-500 animate-pulse" size={26}/>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-900/40 border border-red-500 flex items-center justify-center mb-1.5">
                                        <Users className="text-red-400" size={18}/>
                                    </div>
                                    <span className="text-xs font-bold text-red-300 truncate max-w-[90px] text-center">{tournament.opponentName || "상대"}</span>
                                </div>
                            </div>

                            <button 
                                onClick={onStartMatch}
                                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center transition-all transform active:scale-95"
                            >
                                <Sword className="mr-2" size={18}/> 경기 시작
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <Crown size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                            <h3 className="text-2xl sm:text-3xl font-bold text-amber-300 mb-2">최종 우승!</h3>
                            <p className="text-sm text-amber-100 mb-6">
                                토너먼트 우승을 진심으로 축하합니다!<br/>
                                <span className="text-xs text-slate-400 mt-2 block">영예로운 승리와 함께 보상이 지급되었습니다.</span>
                            </p>
                            <div className="flex justify-center gap-3 text-xs sm:text-sm bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
                                <span className="text-green-400 flex items-center"><Medal size={16} className="mr-1"/> 경험치 +{tournament.reward?.exp}</span>
                                <span className="text-amber-400 flex items-center"><Medal size={16} className="mr-1"/> 골드 +{tournament.reward?.gold}</span>
                            </div>
                            <button onClick={onClose} className="mt-6 px-6 py-2.5 border border-slate-600 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-sm">닫기</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TournamentModal;
