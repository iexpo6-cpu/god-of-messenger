import React, { useState, useEffect, useRef } from 'react';
import { Character, Enemy } from '../types';
import {
    X, Skull, ShieldAlert, Sparkles, Compass, Trophy, Lock, Gift,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Layers, Zap
} from 'lucide-react';
import { GridDungeonState, GridTile, revealFogOfWar, updateTileIdentifications } from '../services/gridDungeonEngine';
import { calculateFinalStats } from '../utils';
import ChallengeLobbyCanvas, { ChallengeLobbyNpc } from './ChallengeLobbyCanvas';
import {
    generateAbyssTowerFloor,
    generateAbyssTowerEnemies,
    getAbyssFloorLevel,
    getAbyssModifierForFloor,
    isAbyssBossFloor
} from '../services/abyssTowerService';

interface Props {
    isOpen: boolean;
    character: Character;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    embedded?: boolean;
}

const AbyssTowerModal: React.FC<Props> = ({ isOpen, character, onClose, onBattle, onUpdateCharacter, embedded = false }) => {
    const towerState = character.abyssTowerState;
    const unlockedCheckpoint = Math.max(1, towerState?.unlockedCheckpointFloor || 1);
    const highestFloor = towerState?.highestFloor || 0;

    const [gridState, setGridState] = useState<GridDungeonState | null>(null);
    const [selectedFloorStart, setSelectedFloorStart] = useState<number>(unlockedCheckpoint);
    const [notice, setNotice] = useState<{ title: string; desc: string } | null>(null);

    const hasLv2000Unit =
        character.level >= 2000 ||
        (character.companions || []).some(c => c.level >= 2000) ||
        (character.inactiveCompanions || []).some(c => c.level >= 2000);

    useEffect(() => {
        if (!isOpen) return;
        if (towerState?.activeGridState) {
            setGridState(towerState.activeGridState);
        } else {
            setGridState(null);
            setSelectedFloorStart(unlockedCheckpoint);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const moveRef = useRef<(dx: number, dy: number) => void>(() => {});

    useEffect(() => {
        if (!isOpen || !gridState) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                moveRef.current(0, -1);
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                moveRef.current(0, 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                moveRef.current(-1, 0);
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                moveRef.current(1, 0);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, Boolean(gridState)]);

    if (!isOpen) return null;

    const checkpointOptions: number[] = [];
    for (let f = 1; f <= unlockedCheckpoint; f += 10) {
        checkpointOptions.push(f);
    }

    const startFloor = (floorNum: number) => {
        const fresh = generateAbyssTowerFloor(floorNum);
        setGridState(fresh);
        const newChar: Character = {
            ...character,
            abyssTowerState: {
                highestFloor: Math.max(highestFloor, floorNum),
                unlockedCheckpointFloor: unlockedCheckpoint,
                totalClearedBosses: towerState?.totalClearedBosses || 0,
                currentFloor: floorNum,
                activeGridState: fresh
            }
        };
        onUpdateCharacter(newChar, `[무한 심연 탑] ${floorNum}층 (권장 Lv.${getAbyssFloorLevel(floorNum).toLocaleString()}) 탐험을 개시했습니다.`);
    };

    const handleTileAction = (tile: GridTile) => {
        if (!gridState) return;
        const { x, y } = tile;
        const px = gridState.playerPos.x;
        const py = gridState.playerPos.y;
        const dist = Math.abs(x - px) + Math.abs(y - py);
        if (tile.type === 'wall' || dist > 1) return;

        let nextState: GridDungeonState = JSON.parse(JSON.stringify(gridState));
        nextState.playerPos = { x, y };
        revealFogOfWar(nextState.tiles, x, y, nextState.torchRadius || 2.0);
        updateTileIdentifications(nextState.tiles, x, y);
        const target = nextState.tiles[y][x];

        // 1. 보물 상자
        if (target.content === 'chest' && !target.isCleared) {
            target.isCleared = true;
            const floorLv = getAbyssFloorLevel(nextState.currentFloor);
            const goldReward = Math.floor(floorLv * 250);
            const manaReward = Math.floor(15 + nextState.currentFloor * 2);
            const newChar: Character = {
                ...character,
                money: (character.money || 0) + goldReward,
                base: character.base ? {
                    ...character.base,
                    resources: {
                        ...character.base.resources,
                        manaCrystal: (character.base.resources.manaCrystal || 0) + manaReward
                    }
                } : character.base,
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            };
            setGridState(nextState);
            setNotice({ title: '심연 보물 상자 발견', desc: `골드 +${goldReward.toLocaleString()}G, 마정석 +${manaReward}개 획득!` });
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] 심연 상자에서 ${goldReward.toLocaleString()}G와 마정석 ${manaReward}개를 획득했습니다.`);
            return;
        }

        // 2. 제단
        if (target.content === 'shrine' && !target.isCleared) {
            target.isCleared = true;
            const playerFinal = calculateFinalStats(character).finalStats;
            const healedCompanions = (character.companions || []).map((c) => {
                if (c.isDead || c.stats.hp <= 0) return c;
                const cFinal = calculateFinalStats(c as any).finalStats;
                return {
                    ...c,
                    stats: {
                        ...c.stats,
                        hp: Math.max(c.stats.hp, cFinal.maxHp),
                        mp: Math.max(c.stats.mp, cFinal.maxMp)
                    }
                };
            });
            const newChar: Character = {
                ...character,
                stats: {
                    ...character.stats,
                    hp: Math.max(character.stats.hp, playerFinal.maxHp),
                    mp: Math.max(character.stats.mp, playerFinal.maxMp)
                },
                companions: healedCompanions,
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            };
            setGridState(nextState);
            setNotice({ title: '심연 공명 제단', desc: `최종 능력치 기준 HP/MP가 100% 회복되었습니다! (HP ${playerFinal.maxHp.toLocaleString()})` });
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] 제단의 기운으로 최종 능력치 기준 체력과 마력을 100% 회복했습니다.`);
            return;
        }

        // 3. 룬스톤
        if (target.content === 'rune_stone' && !target.isCleared) {
            target.isCleared = true;
            nextState.activeRunesCount += 1;
            const newChar: Character = {
                ...character,
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            };
            setGridState(nextState);
            setNotice({
                title: '봉인 룬석 활성화',
                desc: `심연 룬석 (${nextState.activeRunesCount}/${nextState.totalRunesRequired}) 해제 완료!`
            });
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] 봉인 룬석을 해제했습니다.`);
            return;
        }

        // 4. 전투 (적 / 중간보스 / 차원 수호자 보스)
        if ((target.content === 'enemy' || target.content === 'miniboss' || target.content === 'boss') && !target.isCleared) {
            const isBossBattle = target.content === 'boss';
            if (isBossBattle && nextState.activeRunesCount < nextState.totalRunesRequired) {
                setNotice({
                    title: '보스 봉인 결계',
                    desc: `룬석을 모두 활성화해야 차원 수호자에게 도전할 수 있습니다. (${nextState.activeRunesCount}/${nextState.totalRunesRequired})`
                });
                return;
            }
            // 전투 승리 시에만 useGame.ts에서 클리어/보스 계단 전환 처리 (패배·도주 악용 방지)
            const newChar: Character = {
                ...character,
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    pendingTilePos: { x, y },
                    activeGridState: nextState
                }
            };
            setGridState(nextState);
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] ${isBossBattle ? '차원 수호자' : '심연의 적'}과 교전에 돌입합니다!`);
            const enemies = generateAbyssTowerEnemies(nextState.currentFloor, isBossBattle);
            onBattle(enemies, isBossBattle ? 'abyss_tower_boss' : 'abyss_tower_mob');
            return;
        }

        // 5. 다음 층 이동 계단
        if (target.type === 'stairs') {
            if (isAbyssBossFloor(nextState.currentFloor) && !nextState.bossDefeated) {
                setNotice({
                    title: '차원 수호자 봉인',
                    desc: `${nextState.currentFloor}층 차원 수호자를 격파해야 다음 층으로 올라갈 수 있습니다.`
                });
                return;
            }
            const nextFloor = nextState.currentFloor + 1;
            startFloor(nextFloor);
            return;
        }

        // 일반 이동
        setGridState(nextState);
        onUpdateCharacter(
            {
                ...character,
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            },
            ''
        );
    };

    const moveByDelta = (dx: number, dy: number) => {
        if (!gridState) return;
        const nx = gridState.playerPos.x + dx;
        const ny = gridState.playerPos.y + dy;
        if (ny < 0 || ny >= gridState.height || nx < 0 || nx >= gridState.width) return;
        handleTileAction(gridState.tiles[ny][nx]);
    };
    moveRef.current = moveByDelta;

    const currentFloor = gridState?.currentFloor || selectedFloorStart;
    const modifier = getAbyssModifierForFloor(currentFloor);
    const floorLevel = getAbyssFloorLevel(currentFloor);

    return (
        <div className={embedded ? 'w-full h-full flex-1 flex flex-col animate-in fade-in' : 'fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in'}>
            <div className={embedded ? 'w-full h-full flex-1 bg-gradient-to-b from-slate-950 via-red-950/20 to-black border border-red-600/50 rounded-2xl overflow-hidden flex flex-col' : 'w-full max-w-4xl bg-gradient-to-b from-slate-950 via-red-950/20 to-black border-2 border-red-600/60 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col max-h-[92vh]'}>
                {/* Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/80 via-slate-950 to-black border-b border-red-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/50 text-red-400">
                            <Layers size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-black text-red-200 font-cinzel">무한 심연 탑</h2>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700/60">
                                    마계 임페리얼
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                최고 도달: <span className="text-amber-300 font-bold">{highestFloor}층</span> · 체크포인트: <span className="text-cyan-300 font-bold">{unlockedCheckpoint}층</span>
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

                {/* Body */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4">
                    {!gridState ? (
                        <ChallengeLobbyCanvas
                            character={character}
                            mode="abyss_tower"
                            title="무한 심연 탑 · 1층 로비"
                            subtitle={
                                hasLv2000Unit
                                    ? `선택된 체크포인트: ${selectedFloorStart}층 (권장 Lv.${getAbyssFloorLevel(selectedFloorStart).toLocaleString()})`
                                    : '입장 조건: 주인공 또는 동료 Lv.2,000 이상'
                            }
                            cheerText={
                                hasLv2000Unit
                                    ? '심연 차원문 앞의 차원 수호자 환영에게 걸어가 도전을 시작하십시오.'
                                    : '1층부터 Lv.2,000 이상의 초월 몬스터가 출현합니다. 전력을 더 연마하세요.'
                            }
                            onClose={onClose}
                            heightClassName="h-[460px] sm:h-[520px]"
                            headerExtra={
                                hasLv2000Unit ? (
                                    <div className="flex flex-wrap items-center gap-1">
                                        {checkpointOptions.map((cp) => (
                                            <button
                                                key={cp}
                                                onClick={() => setSelectedFloorStart(cp)}
                                                className={`px-2 py-1 rounded-lg border text-[11px] font-black transition-all cursor-pointer ${
                                                    selectedFloorStart === cp
                                                        ? 'bg-red-600/40 border-red-400 text-white'
                                                        : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                {cp}층
                                            </button>
                                        ))}
                                    </div>
                                ) : undefined
                            }
                            npcs={(() => {
                                const bossFloor = Math.ceil(selectedFloorStart / 10) * 10;
                                const list: ChallengeLobbyNpc[] = [
                                    {
                                        id: 'abyss_boss_echo',
                                        name: `차원 수호자 환영 (${selectedFloorStart}층)`,
                                        role: `다음 심연 보스 · 권장 Lv.${getAbyssFloorLevel(selectedFloorStart).toLocaleString()}`,
                                        tx: 12,
                                        ty: 5,
                                        dir: 'down',
                                        gender: 'male',
                                        regionKey: 'magye',
                                        auraColor: 'rgba(239, 68, 68, 0.45)',
                                        kind: 'boss',
                                        dialogue: hasLv2000Unit
                                            ? `어리석은 침입자여... ${selectedFloorStart}층부터 ${bossFloor}층의 차원 수호자까지 살아남을 수 있을 것인가?\n\n• 10층마다 적 레벨 +100 상승 (날짜 경과 없음)\n• 매 10층 보스 격파 시 체크포인트 해금 & 초월 희귀 재료 획득`
                                            : `감히 심연의 문턱을 넘으려 하다니...\n주인공 또는 동료 중 최소 1명이 Lv.2,000을 달성해야 심연에 발을 들일 수 있다.`,
                                        actionLabel: hasLv2000Unit ? `${selectedFloorStart}층 심연 진입하기` : undefined,
                                        onAction: hasLv2000Unit ? () => startFloor(selectedFloorStart) : undefined
                                    },
                                    {
                                        id: 'abyss_guide',
                                        name: '심연의 문지기 벨페고르',
                                        role: '탑 안내자 · 체크포인트 관리',
                                        tx: 9,
                                        ty: 7,
                                        dir: 'down',
                                        gender: 'male',
                                        regionKey: 'magye',
                                        kind: 'official',
                                        dialogue: `무한 심연 탑 1층 로비에 오신 것을 환영합니다.\n현재 최고 도달: ${highestFloor}층 / 해금 체크포인트: ${unlockedCheckpoint}층.\n상단 바에서 해금된 체크포인트 층을 선택한 뒤 차원 수호자 환영에게 도전을 거세요.`,
                                        actionLabel: hasLv2000Unit ? `${selectedFloorStart}층 바로 진입` : undefined,
                                        onAction: hasLv2000Unit ? () => startFloor(selectedFloorStart) : undefined
                                    }
                                ];

                                const spectatorLines = [
                                    '10층마다 나오는 차원 수호자는 정말 끔찍하더군...',
                                    '오늘도 누군가 심연에서 돌아오지 못했어.',
                                    '체크포인트만 뚫어두면 언제든 이어서 등반할 수 있지.',
                                    '초월 성소 재료를 모으려면 10층 단위로 공략해야 해.',
                                    '긴장되는군... 내 차례는 언제쯤 올까.',
                                    '마계 임페리얼에서도 가장 위험한 곳이야.'
                                ];
                                const standCoords: Array<[number, number, 'left' | 'right']> = [
                                    [4, 4, 'right'], [4, 7, 'right'], [4, 10, 'right'],
                                    [19, 4, 'left'], [19, 7, 'left'], [19, 10, 'left'],
                                    [7, 11, 'up'], [16, 11, 'up']
                                ];
                                standCoords.forEach(([tx, ty, dir], idx) => {
                                    list.push({
                                        id: `abyss_spec_${idx}`,
                                        name: idx % 2 === 0 ? `마계 도전자 ${idx + 1}` : `심연 감시자 ${idx + 1}`,
                                        role: '탑 1층 대기자',
                                        tx,
                                        ty,
                                        dir,
                                        gender: idx % 2 === 0 ? 'male' : 'female',
                                        regionKey: 'magye',
                                        kind: 'spectator',
                                        canPatrol: true,
                                        dialogue: spectatorLines[idx % spectatorLines.length]
                                    });
                                });
                                return list;
                            })()}
                        />
                    ) : (
                        <div className="space-y-3">
                            {/* Floor Status Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <span className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-600/60 text-xs font-black text-red-200">
                                        {currentFloor}F · 권장 Lv.{floorLevel.toLocaleString()}
                                    </span>
                                    {isAbyssBossFloor(currentFloor) && (
                                        <span className="px-2 py-1 rounded-lg bg-amber-950 border border-amber-500/60 text-[11px] font-black text-amber-300">
                                            차원 수호자 보스층 (룬석 {gridState.activeRunesCount}/{gridState.totalRunesRequired})
                                        </span>
                                    )}
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${modifier.badgeClass}`}>
                                    <Zap size={12} />
                                    <span>{modifier.name}</span>
                                </div>
                            </div>

                            {notice && (
                                <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 flex items-center justify-between">
                                    <span><strong className="text-amber-300">[{notice.title}]</strong> {notice.desc}</span>
                                    <button onClick={() => setNotice(null)} className="text-amber-400 hover:text-white ml-2 cursor-pointer">확인</button>
                                </div>
                            )}

                            {/* 2D Grid */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <div
                                    className="grid gap-1 p-2 rounded-2xl bg-slate-950 border border-slate-800"
                                    style={{ gridTemplateColumns: `repeat(${gridState.width}, minmax(0, 1fr))` }}
                                >
                                    {gridState.tiles.flat().map((tile) => {
                                        const isPlayer = gridState.playerPos.x === tile.x && gridState.playerPos.y === tile.y;
                                        const isAdjacent = Math.abs(tile.x - gridState.playerPos.x) + Math.abs(tile.y - gridState.playerPos.y) === 1;
                                        const isWall = tile.type === 'wall';

                                        let cellBg = isWall ? 'bg-slate-900/90 border-slate-900' : 'bg-slate-800/70 border-slate-700/60';
                                        let icon: React.ReactNode = null;

                                        if (!tile.isRevealed) {
                                            cellBg = 'bg-black/95 border-slate-900/60';
                                        } else if (isPlayer) {
                                            cellBg = 'bg-cyan-600/40 border-cyan-400 ring-1 ring-cyan-400';
                                            icon = <span className="text-sm select-none">🧙</span>;
                                        } else if (tile.type === 'stairs') {
                                            cellBg = 'bg-emerald-950/90 border-emerald-400 animate-pulse';
                                            icon = <span className="text-xs sm:text-sm select-none" title="다음 층 계단">🪜</span>;
                                        } else if (!tile.isCleared && !tile.isIdentified && tile.content) {
                                            cellBg = 'bg-slate-800/80 border-amber-500/50';
                                            icon = <span className="text-xs font-black text-amber-300 select-none">?</span>;
                                        } else if (!tile.isCleared && tile.content === 'boss') {
                                            cellBg = 'bg-red-900/70 border-red-400 animate-pulse';
                                            icon = <Skull size={13} className="text-red-300" />;
                                        } else if (!tile.isCleared && (tile.content === 'enemy' || tile.content === 'miniboss')) {
                                            cellBg = 'bg-rose-950/70 border-rose-500/70';
                                            icon = <ShieldAlert size={12} className="text-rose-300" />;
                                        } else if (!tile.isCleared && tile.content === 'chest') {
                                            cellBg = 'bg-amber-950/70 border-amber-500/70';
                                            icon = <Gift size={12} className="text-amber-300" />;
                                        } else if (!tile.isCleared && tile.content === 'rune_stone') {
                                            cellBg = 'bg-indigo-950/70 border-indigo-400';
                                            icon = <Lock size={12} className="text-indigo-300" />;
                                        } else if (!tile.isCleared && tile.content === 'shrine') {
                                            cellBg = 'bg-teal-950/70 border-teal-400';
                                            icon = <Trophy size={12} className="text-teal-300" />;
                                        }

                                        return (
                                            <button
                                                key={`${tile.x}-${tile.y}`}
                                                type="button"
                                                onClick={() => handleTileAction(tile)}
                                                disabled={!isAdjacent || isWall}
                                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center transition-all ${cellBg} ${isAdjacent && !isWall ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {icon}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="grid grid-cols-3 gap-1.5 w-32">
                                        <div />
                                        <button onClick={() => moveByDelta(0, -1)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer flex justify-center"><ChevronUp size={16} /></button>
                                        <div />
                                        <button onClick={() => moveByDelta(-1, 0)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer flex justify-center"><ChevronLeft size={16} /></button>
                                        <button onClick={() => moveByDelta(0, 1)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer flex justify-center"><ChevronDown size={16} /></button>
                                        <button onClick={() => moveByDelta(1, 0)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer flex justify-center"><ChevronRight size={16} /></button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setGridState(null);
                                            if (towerState) {
                                                onUpdateCharacter(
                                                    { ...character, abyssTowerState: { ...towerState, activeGridState: undefined } },
                                                    '[무한 심연 탑] 탐험을 일시 중단하고 입구로 복귀했습니다.'
                                                );
                                            }
                                        }}
                                        className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"
                                    >
                                        입구(체크포인트 선택)로 복귀
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AbyssTowerModal;
