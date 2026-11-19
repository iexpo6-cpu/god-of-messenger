import React, { useState, useEffect } from 'react';
import { Character, Enemy, TranscendentArenaState } from '../types';
import { X, Trophy, Sword, Shield, Crown, Sparkles, Flame, Users, AlertTriangle, Loader2 } from 'lucide-react';
import {
    TRANSCENDENT_ARENA_CHEERS,
    generateTranscendentArenaOpponents,
    getTranscendentRoundMeta
} from '../transcendentArena';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
}

const TranscendentArenaModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const currentMonthKey = character.currentDate?.substring(0, 7) || '2000-03';
    const rawState = character.transcendentArenaState;
    const isCurrentMonthSeason = rawState?.seasonMonth === currentMonthKey;

    const [arenaState, setArenaState] = useState<TranscendentArenaState | null>(
        isCurrentMonthSeason ? rawState! : null
    );
    const [cheer, setCheer] = useState(TRANSCENDENT_ARENA_CHEERS[0]);
    const [isLoading, setIsLoading] = useState(false);

    const hasLv2000Unit =
        character.level >= 2000 ||
        (character.companions || []).some(c => c.level >= 2000) ||
        (character.inactiveCompanions || []).some(c => c.level >= 2000);

    useEffect(() => {
        const interval = setInterval(() => {
            setCheer(TRANSCENDENT_ARENA_CHEERS[Math.floor(Math.random() * TRANSCENDENT_ARENA_CHEERS.length)]);
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    const handleEnterSeason = () => {
        if (!hasLv2000Unit) return;
        setIsLoading(true);
        setTimeout(() => {
            const newState: TranscendentArenaState = {
                seasonMonth: currentMonthKey,
                currentRound: 128,
                isEliminated: false,
                lastParticipationMonth: currentMonthKey,
                winCount: rawState?.winCount || 0,
                defendingChampionSnapshot: rawState?.defendingChampionSnapshot
            };
            const newChar: Character = {
                ...character,
                transcendentArenaState: newState
            };
            onUpdateCharacter(
                newChar,
                `[초월 그랜드 아레나] ${currentMonthKey} 시즌 만신전 128강 토너먼트에 참전했습니다!`
            );
            setArenaState(newState);
            setIsLoading(false);
        }, 500);
    };

    const winCount = rawState?.winCount || 0;

    const handleStartMatch = () => {
        if (!arenaState || arenaState.isEliminated || arenaState.currentRound === 0) return;
        const opponents = generateTranscendentArenaOpponents(
            arenaState.currentRound,
            arenaState.defendingChampionSnapshot,
            winCount
        );
        onBattle(opponents, 'transcendent_arena');
        onClose();
    };

    const roundMeta = arenaState ? getTranscendentRoundMeta(arenaState.currentRound, winCount) : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-4xl bg-gradient-to-b from-indigo-950 via-slate-950 to-amber-950/30 border-2 border-amber-400/70 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-950/70 via-indigo-950/90 to-slate-950 border-b border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 shadow-lg">
                            <Crown size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-2xl font-black text-amber-200 font-cinzel tracking-wide">
                                    초월 그랜드 아레나
                                </h2>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    월 1회 시즌제
                                </span>
                            </div>
                            <p className="text-xs text-indigo-200/80 mt-0.5">
                                신의 거처 만신전 · 시즌 {currentMonthKey} · 누적 우승 {winCount}회
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cheer Banner */}
                <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-500/20 text-center text-xs text-amber-200/90 font-medium flex items-center justify-center gap-2">
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                    <span>{cheer}</span>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
                    {!hasLv2000Unit ? (
                        <div className="max-w-lg mx-auto py-8 px-6 rounded-2xl bg-slate-900/80 border border-red-500/40 text-center space-y-3">
                            <AlertTriangle size={40} className="text-amber-400 mx-auto" />
                            <h3 className="text-lg font-black text-white">초월자 자격 미달</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                신의 거처 만신전 <span className="text-amber-300 font-bold">초월 그랜드 아레나</span>는
                                주인공 또는 동료 중 최소 1명이 <span className="text-cyan-300 font-bold">Lv.2,000 이상</span>이어야 참전할 수 있습니다.
                            </p>
                            <div className="text-xs text-slate-400">
                                현재 주인공 레벨: <span className="text-white font-bold">Lv.{character.level.toLocaleString()}</span>
                            </div>
                        </div>
                    ) : !arenaState ? (
                        <div className="max-w-xl mx-auto py-6 px-5 rounded-2xl bg-slate-900/70 border border-amber-500/40 text-center space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
                                <Trophy size={34} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white">{currentMonthKey} 만신전 시즌 개막</h3>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    Lv.2,000 ~ 3,500+ 각국 초월 챔피언·수호 동료 3인·초궁극체 신수로 구성된 <span className="text-amber-300 font-bold">만신전 5인 편성</span>과 128강 토너먼트를 치릅니다.
                                    매월 1회 시즌제로 운영되며, 우승 시 전설 보상 및 전용 칭호가 수여됩니다.
                                </p>
                            </div>
                            {rawState?.defendingChampionSnapshot && (
                                <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200">
                                    현재 디펜딩 챔피언: <span className="font-black text-amber-300">{rawState.defendingChampionSnapshot.name}</span> (Lv.{rawState.defendingChampionSnapshot.level.toLocaleString()})
                                </div>
                            )}
                            <button
                                onClick={handleEnterSeason}
                                disabled={isLoading}
                                className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sword size={18} />}
                                <span>이번 달 시즌 참전하기 (128강 시작)</span>
                            </button>
                        </div>
                    ) : arenaState.currentRound === 0 ? (
                        <div className="max-w-xl mx-auto py-8 px-6 rounded-2xl bg-amber-950/30 border-2 border-amber-400 text-center space-y-4">
                            <Crown size={56} className="text-amber-300 mx-auto animate-bounce" />
                            <h3 className="text-2xl font-black text-amber-200">{currentMonthKey} 시즌 만신전 제패!</h3>
                            <p className="text-xs sm:text-sm text-slate-200">
                                축하합니다! 이번 달 초월 그랜드 아레나 우승을 달성하셨습니다. 다음 달 새 시즌이 열리면 다시 도전할 수 있습니다.
                            </p>
                        </div>
                    ) : arenaState.isEliminated ? (
                        <div className="max-w-xl mx-auto py-8 px-6 rounded-2xl bg-red-950/25 border border-red-500/40 text-center space-y-3">
                            <Shield size={44} className="text-red-400 mx-auto" />
                            <h3 className="text-xl font-black text-red-200">{currentMonthKey} 시즌 도전 종료</h3>
                            <p className="text-xs sm:text-sm text-slate-300">
                                만신전의 벽 앞에서 아쉽게 패배했습니다. 전력을 더욱 연마한 뒤 다음 달 새 시즌에 재도전하세요!
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-5">
                            {/* Round Steps */}
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
                                {[
                                    { round: 128, label: '128강' },
                                    { round: 64, label: '64강' },
                                    { round: 32, label: '32강' },
                                    { round: 16, label: '16강' },
                                    { round: 8, label: '8강' },
                                    { round: 4, label: '4강' },
                                    { round: 2, label: '결승' },
                                    { round: 0, label: '우승' }
                                ].map((step) => {
                                    const isCurrent = arenaState.currentRound === step.round || (arenaState.currentRound === 1 && step.round === 2);
                                    const isPassed = arenaState.currentRound < step.round;
                                    return (
                                        <div
                                            key={step.round}
                                            className={`py-2 px-1 rounded-xl border text-xs font-black transition-all ${
                                                isCurrent
                                                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                                                    : isPassed
                                                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                                                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                                            }`}
                                        >
                                            {step.label}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Match Card */}
                            {roundMeta && (
                                <div className="p-5 rounded-2xl bg-slate-900/85 border border-amber-500/40 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">CURRENT MATCH</span>
                                            <h3 className="text-xl sm:text-2xl font-black text-white">{roundMeta.label}</h3>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-xs font-bold text-indigo-200">
                                            적 예상 레벨: Lv.{roundMeta.minLv.toLocaleString()} ~ {roundMeta.maxLv.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
                                            <Crown size={18} className="text-amber-400 shrink-0" />
                                            <div>
                                                <div className="font-black text-amber-200">만신전 챔피언</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {arenaState.currentRound <= 2 && arenaState.defendingChampionSnapshot
                                                        ? `디펜딩 분신 (${arenaState.defendingChampionSnapshot.name})`
                                                        : '초월자 네임드 투사'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
                                            <Users size={18} className="text-cyan-400 shrink-0" />
                                            <div>
                                                <div className="font-black text-cyan-200">수호 동료 3인</div>
                                                <div className="text-[11px] text-slate-400">각국 초월 등급 동료단</div>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
                                            <Flame size={18} className="text-rose-400 shrink-0" />
                                            <div>
                                                <div className="font-black text-rose-200">초궁극체 신수</div>
                                                <div className="text-[11px] text-slate-400">고위 신수/마수 파트너</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStartMatch}
                                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Sword size={18} />
                                        <span>{roundMeta.label} 만신전 5인 결투 시작</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TranscendentArenaModal;
