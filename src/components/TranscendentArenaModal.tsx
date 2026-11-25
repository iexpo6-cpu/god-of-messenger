import React, { useState, useEffect } from 'react';
import { Character, Enemy, TranscendentArenaState } from '../types';
import { X, Trophy, Sword, Shield, Crown, Sparkles, Flame, Users, AlertTriangle, Loader2 } from 'lucide-react';
import {
    TRANSCENDENT_ARENA_CHEERS,
    generateTranscendentArenaOpponents,
    getTranscendentRoundMeta
} from '../transcendentArena';
import ChallengeLobbyCanvas, { ChallengeLobbyNpc } from './ChallengeLobbyCanvas';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    embedded?: boolean;
}

const TranscendentArenaModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle, embedded = false }) => {
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
        <div className={embedded ? 'w-full h-full flex-1 flex flex-col animate-in fade-in' : 'fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in'}>
            <div className={embedded ? 'w-full h-full flex-1 bg-gradient-to-b from-indigo-950 via-slate-950 to-amber-950/30 border border-amber-400/60 rounded-2xl overflow-hidden flex flex-col' : 'w-full max-w-4xl bg-gradient-to-b from-indigo-950 via-slate-950 to-amber-950/30 border-2 border-amber-400/70 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.25)] overflow-hidden flex flex-col max-h-[92vh]'}>
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
                <div className="p-3 sm:p-4 overflow-y-auto flex-1">
                    <ChallengeLobbyCanvas
                        character={character}
                        mode="transcendent_arena"
                        title="초월 그랜드 아레나 · 만신전 대기실"
                        subtitle={
                            !hasLv2000Unit
                                ? '참전 자격 미달 (Lv.2,000 이상 필요)'
                                : !arenaState
                                    ? `${currentMonthKey} 시즌 개막 · 접수관에게 말을 걸어 참전하세요`
                                    : arenaState.currentRound === 0
                                        ? `${currentMonthKey} 시즌 만신전 제패 완료!`
                                        : arenaState.isEliminated
                                            ? `${currentMonthKey} 시즌 도전 종료`
                                            : `${roundMeta?.label || ''} 대기 중 · 예상 Lv.${roundMeta?.minLv.toLocaleString()}~${roundMeta?.maxLv.toLocaleString()}`
                        }
                        cheerText={cheer}
                        onClose={onClose}
                        heightClassName="h-[460px] sm:h-[520px]"
                        npcs={(() => {
                            const list: ChallengeLobbyNpc[] = [
                                {
                                    id: 'trans_official',
                                    name: '만신전 대심판관',
                                    role: '초월 아레나 접수 · 진행관',
                                    tx: 7,
                                    ty: 7,
                                    dir: 'down',
                                    gender: 'female',
                                    regionKey: 'shingye',
                                    kind: 'official',
                                    dialogue: !hasLv2000Unit
                                        ? `신의 거처 만신전 초월 그랜드 아레나는 주인공 또는 동료 중 최소 1명이 Lv.2,000 이상이어야 참전할 수 있습니다.\n(현재 주인공 Lv.${character.level.toLocaleString()})`
                                        : !arenaState
                                            ? `${currentMonthKey} 만신전 시즌이 개막했습니다!\n각국 초월 챔피언·수호 동료 3인·초궁극체 신수로 구성된 5인 편성과 128강 토너먼트를 치릅니다.`
                                            : arenaState.currentRound === 0
                                                ? `이번 ${currentMonthKey} 시즌 만신전을 제패하신 것을 진심으로 축하드립니다!`
                                                : arenaState.isEliminated
                                                    ? `아쉽게도 이번 시즌은 탈락하셨습니다. 다음 달 새 시즌에 다시 도전해 주세요.`
                                                    : `현재 라운드: ${roundMeta?.label || ''}\n중앙 투기링에 대기 중인 만신전 챔피언 편성에게 걸어가 결투를 신청하십시오.`,
                                    actionLabel: hasLv2000Unit && !arenaState ? '이번 달 시즌 참전하기 (128강 시작)' : undefined,
                                    onAction: hasLv2000Unit && !arenaState ? handleEnterSeason : undefined
                                }
                            ];

                            if (hasLv2000Unit && arenaState && !arenaState.isEliminated && arenaState.currentRound > 0 && roundMeta) {
                                const champLabel =
                                    arenaState.currentRound <= 2 && arenaState.defendingChampionSnapshot
                                        ? `디펜딩 챔피언 (${arenaState.defendingChampionSnapshot.name})`
                                        : '만신전 초월 챔피언';
                                list.push({
                                    id: 'trans_challenger_boss',
                                    name: champLabel,
                                    role: `${roundMeta.label} 상대 · Lv.${roundMeta.minLv.toLocaleString()}~${roundMeta.maxLv.toLocaleString()}`,
                                    tx: 12,
                                    ty: 5,
                                    dir: 'down',
                                    gender: 'male',
                                    regionKey: 'shingye',
                                    auraColor: 'rgba(251, 191, 36, 0.45)',
                                    kind: 'challenger',
                                    dialogue: `드디어 여기까지 올라왔군, ${character.name}.\n우리 만신전 5인 편성(챔피언 + 수호 동료 3인 + 초궁극체 신수)을 상대로 버틸 수 있을까?\n\n라운드: ${roundMeta.label} (예상 Lv.${roundMeta.minLv.toLocaleString()} ~ ${roundMeta.maxLv.toLocaleString()})`,
                                    actionLabel: `${roundMeta.label} 만신전 5인 결투 시작`,
                                    onAction: handleStartMatch
                                });
                                // 호위 동료 & 신수 스탠딩
                                list.push(
                                    {
                                        id: 'trans_guard_1',
                                        name: '만신전 수호 동료',
                                        role: '5인 편성 호위',
                                        tx: 10,
                                        ty: 5,
                                        dir: 'down',
                                        gender: 'female',
                                        regionKey: 'shingye',
                                        kind: 'ally',
                                        dialogue: '챔피언과 함께 우리의 힘을 보여주겠어.'
                                    },
                                    {
                                        id: 'trans_guard_2',
                                        name: '성좌의 수호기사',
                                        role: '5인 편성 호위',
                                        tx: 14,
                                        ty: 5,
                                        dir: 'down',
                                        gender: 'male',
                                        regionKey: 'shingye',
                                        kind: 'ally',
                                        dialogue: '만신전의 명예를 걸고 물러서지 않는다.'
                                    }
                                );
                            }

                            // 관객 NPC들
                            const standCoords: Array<[number, number, 'left' | 'right']> = [
                                [1, 3, 'right'], [2, 5, 'right'], [1, 7, 'right'], [2, 9, 'right'], [1, 11, 'right'], [2, 13, 'right'],
                                [21, 3, 'left'], [22, 5, 'left'], [21, 7, 'left'], [22, 9, 'left'], [21, 11, 'left'], [22, 13, 'left']
                            ];
                            standCoords.forEach(([tx, ty, dir], idx) => {
                                list.push({
                                    id: `trans_spec_${idx}`,
                                    name: `성역 관중 ${idx + 1}`,
                                    role: '만신전 관전자',
                                    tx,
                                    ty,
                                    dir,
                                    gender: idx % 2 === 0 ? 'female' : 'male',
                                    regionKey: 'shingye',
                                    kind: 'spectator',
                                    dialogue: TRANSCENDENT_ARENA_CHEERS[idx % TRANSCENDENT_ARENA_CHEERS.length]
                                });
                            });
                            return list;
                        })()}
                    />
                </div>
            </div>
        </div>
    );
};

export default TranscendentArenaModal;
