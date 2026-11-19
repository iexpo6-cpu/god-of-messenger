import React, { useState, useEffect, useRef } from 'react';
import { Character, Enemy } from '../types';
import {
    X, Skull, ShieldAlert, Sparkles, Compass, Trophy, Lock, Gift,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Layers, Zap
} from 'lucide-react';
import { GridDungeonState, GridTile, revealFogOfWar, updateTileIdentifications } from '../services/gridDungeonEngine';
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
}

const AbyssTowerModal: React.FC<Props> = ({ isOpen, character, onClose, onBattle, onUpdateCharacter }) => {
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
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            };
            if (newChar.base?.resources) {
                newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) + manaReward;
            }
            setGridState(nextState);
            setNotice({ title: '심연 보물 상자 발견', desc: `골드 +${goldReward.toLocaleString()}G, 마정석 +${manaReward}개 획득!` });
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] 심연 상자에서 ${goldReward.toLocaleString()}G와 마정석 ${manaReward}개를 획득했습니다.`);
            return;
        }

        // 2. 제단
        if (target.content === 'shrine' && !target.isCleared) {
            target.isCleared = true;
            const newChar: Character = {
                ...character,
                stats: { ...character.stats, hp: character.stats.maxHp, mp: character.stats.maxMp },
                abyssTowerState: {
                    highestFloor: Math.max(highestFloor, nextState.currentFloor),
                    unlockedCheckpointFloor: unlockedCheckpoint,
                    totalClearedBosses: towerState?.totalClearedBosses || 0,
                    currentFloor: nextState.currentFloor,
                    activeGridState: nextState
                }
            };
            setGridState(nextState);
            setNotice({ title: '심연 공명 제단', desc: '주인공의 HP/MP가 100% 회복되었습니다!' });
            onUpdateCharacter(newChar, `[무한 심연 탑 ${nextState.currentFloor}F] 제단의 기운으로 체력과 마력을 회복했습니다.`);
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
            target.isCleared = true;
            if (isBossBattle) {
                nextState.bossDefeated = true;
                target.type = 'stairs';
                target.name = `${nextState.currentFloor + 1}층으로 향하는 심연 계단`;
            }

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
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-4xl bg-gradient-to-b from-slate-950 via-red-950/20 to-black border-2 border-red-600/60 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
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
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                    {!hasLv2000Unit ? (
                        <div className="max-w-lg mx-auto py-8 px-6 rounded-2xl bg-slate-900/80 border border-red-500/40 text-center space-y-3">
                            <AlertTriangle size={40} className="text-red-400 mx-auto" />
                            <h3 className="text-lg font-black text-white">심연 입장 조건 미달</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                마계 임페리얼의 <span className="text-red-300 font-bold">무한 심연 탑</span>은
                                1층부터 <span className="text-amber-300 font-bold">Lv.2,000</span> 이상의 초월 몬스터가 출현합니다.
                                주인공 또는 동료 중 1명 이상 Lv.2,000 달성 시 입장할 수 있습니다.
                            </p>
                        </div>
                    ) : !gridState ? (
                        <div className="max-w-xl mx-auto space-y-5 py-4">
                            <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-800/40 space-y-2">
                                <h3 className="text-base font-black text-red-200 flex items-center gap-2">
                                    <Skull size={18} className="text-red-400" />
                                    <span>무한 심연 탑 등반 안내</span>
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    • 1층(Lv.2,000)부터 시작해 10층마다 적 레벨이 +100씩 상승합니다. (100층 = Lv.3,000)<br />
                                    • 매 10층의 <span className="text-amber-300 font-bold">차원 수호자</span> 격파 시 다음 10층 체크포인트와 초월 성소 희귀 재료를 획득합니다.<br />
                                    • 게임 내 날짜가 흐르지 않아 자유롭게 반복 등반할 수 있습니다.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-black text-slate-300">해금된 체크포인트 층 선택</div>
                                <div className="flex flex-wrap gap-2">
                                    {checkpointOptions.map((cp) => (
                                        <button
                                            key={cp}
                                            onClick={() => setSelectedFloorStart(cp)}
                                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                                selectedFloorStart === cp
                                                    ? 'bg-red-600/30 border-red-400 text-white shadow'
                                                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {cp}층 (Lv.{getAbyssFloorLevel(cp).toLocaleString()})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => startFloor(selectedFloorStart)}
                                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-purple-700 hover:from-red-500 hover:to-purple-600 text-white font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Compass size={18} />
                                <span>{selectedFloorStart}층 심연 진입하기</span>
                            </button>
                        </div>
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
