import React, { useState, useEffect, useMemo } from 'react';
import { Character, Enemy } from '../types';
import { 
    X, Sword, Shield, Clock, Calendar, Sun, ChevronRight, Skull, Crown, Heart, Loader2, 
    CheckCircle2, LogOut, Trophy, Sparkles, Coffee, Zap, Gift, 
    Compass, Flame, ShieldAlert, ArrowRight, Check, HelpCircle, Gamepad2, Map,
    ChevronUp, ChevronDown, ChevronLeft, Lock, Key
} from 'lucide-react';
import { NATION_THEMES, getMonsterInfo } from '../monsterfield';
import { generateProceduralEnemy, calculateFinalStats } from '../utils';
import { generateBossMonster, getBossByLocation, SEASONAL_BOSSES } from '../bossMonsters';
import { advanceGameTime } from '../services/gameTimeService';
import { handleDungeonDefeatRecovery } from '../services/dungeonDefeatService';
import { RescueGratitudeModal, RescuedPersonInfo } from './RescueGratitudeModal';
import { createRescuedPersonData } from '../services/rescuePersonService';
import DungeonRpgCanvas, { resolveDungeonAssetUrl, DungeonFloatingText } from './DungeonRpgCanvas';
import { resolveEntityRpgSprite } from '../services/rpgSpriteManifest';
import { 
    GridDungeonState, 
    GridTile, 
    generateGridDungeonFloor, 
    revealFogOfWar,
    updateTileIdentifications,
    stepDungeonMonsterPatrol,
    FloorCacheData 
} from '../services/gridDungeonEngine';

export type DungeonNodeType = 'Combat' | 'MiniBoss' | 'Rest' | 'Treasure' | 'Event' | 'Boss';

export interface DungeonBranchNode {
    id: string;
    floor: number;
    slotIndex: number;
    type: DungeonNodeType;
    name: string;
    subtitle: string;
    description: string;
    isCompleted: boolean;
    isCurrent: boolean;
    nextIds: string[];
    treasureData?: {
        gold: number;
        manaStone: number;
        gems?: number;
    };
    eventData?: {
        title: string;
        optionA: { label: string; desc: string; type: 'heal' | 'fullHeal' | 'exp' };
        optionB: { label: string; desc: string; type: 'manaStone' | 'exp' | 'stat' };
    };
}

interface Props {
    isOpen: boolean;
    character: Character;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const DungeonModal: React.FC<Props> = ({ isOpen, character, onClose, onBattle, onUpdateCharacter }) => {
    const [gridState, setGridState] = useState<GridDungeonState | null>(null);
    const [selectedTile, setSelectedTile] = useState<GridTile | null>(null);
    const [rescuedModalInfo, setRescuedModalInfo] = useState<RescuedPersonInfo | null>(null);
    const [eventNotice, setEventNotice] = useState<{ title: string; desc: string; items?: { label: string; value: string }[] } | null>(null);
    const [dayChangeNotice, setDayChangeNotice] = useState<string | null>(null);
    const [floatingNotice, setFloatingNotice] = useState<DungeonFloatingText | null>(null);
    const [gimmickToast, setGimmickToast] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'rpg' | 'classic'>(() => {
        try {
            const saved = localStorage.getItem('shinryoku_dungeon_view_mode');
            return saved === 'classic' ? 'classic' : 'rpg';
        } catch {
            return 'rpg';
        }
    });
    const toggleViewMode = (mode: 'rpg' | 'classic') => {
        setViewMode(mode);
        try {
            localStorage.setItem('shinryoku_dungeon_view_mode', mode);
        } catch {}
    };

    const nation = character.currentLocation?.nation || character.nation;
    const currentCity = character.currentLocation?.city || "Unknown";
    const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 3;
    const bossInfo = getBossByLocation(nation, currentCity, currentMonth);

    const isSeasonalBoss = Boolean(bossInfo?.name && (
        bossInfo.name === "천제 환웅" || 
        bossInfo.name === "태양신 아마테라스" || 
        bossInfo.name === "황제 공손헌원" || 
        bossInfo.name === "태양신 라" || 
        bossInfo.name === "엘클" ||
        Object.values(SEASONAL_BOSSES).some(sb => sb.name === bossInfo.name)
    ));

    useEffect(() => {
        if (isOpen) {
            initOrLoadGridDungeon();
        }
    }, [isOpen, nation, currentCity, currentMonth]);

    const initOrLoadGridDungeon = () => {
        // 체력 0 이하: 퇴각 처리
        if (character.stats.hp <= 0) {
            const { updatedCharacter, logMessage } = handleDungeonDefeatRecovery(character);
            onUpdateCharacter(updatedCharacter, logMessage);
            onClose();
            return;
        }

        const city = character.currentLocation?.city || "알 수 없는 도시";
        const isAlreadyCleared = character.clearedDungeonsByCity && character.clearedDungeonsByCity[city] === character.currentDate;
        if (isAlreadyCleared && !character.dungeonProgress?.gridDungeon) {
            setGridState(null);
            return;
        }

        // 기존 진행 중인 격자 던전 데이터가 있다면 복원
        const obsList = (character.base?.layout || []).filter(f => f.type === 'explorer_observatory' && !f.underConstruction);
        const obsMaxLv = obsList.reduce((acc, f) => Math.max(acc, f.level || 1), 0);
        const torchBonus = Number((obsMaxLv * 0.5).toFixed(1));
        const isCityScouted = Boolean(character.scoutedDungeons?.includes(city));

        if (character.dungeonProgress?.gridDungeon && character.dungeonProgress.gridDungeon.width >= 21) {
            const saved = character.dungeonProgress.gridDungeon as GridDungeonState;
            const baseTorch = saved.dungeonType === 'mythic' ? 3.5 : 3.8;
            const updatedTorchRadius = Math.max(saved.torchRadius, Number((baseTorch + torchBonus).toFixed(1)));
            const restoredTiles = saved.tiles.map(row => row.map(tile => ({
                ...tile,
                isRevealed: isCityScouted ? true : tile.isRevealed
            })));
            revealFogOfWar(restoredTiles, saved.playerPos.x, saved.playerPos.y, updatedTorchRadius);
            const patchedSaved: GridDungeonState = {
                ...saved,
                torchRadius: updatedTorchRadius,
                tiles: restoredTiles
            };
            setGridState(patchedSaved);
            const playerTile = restoredTiles[patchedSaved.playerPos.y]?.[patchedSaved.playerPos.x] || null;
            setSelectedTile(playerTile);
            return;
        }

        // 신규 격자 던전 1층 생성
        changeDungeonFloor(0, true);
    };

    const changeDungeonFloor = (targetFloor: number, isInitial: boolean = false) => {
        if (!isInitial && !gridState) return;
        const currentFloor = gridState?.currentFloor ?? 0;
        const currentCache: Record<number, FloorCacheData> = {
            ...(gridState?.floorCache || {})
        };

        // 1. 현재 층 상태를 cache에 저장 (초기 진입이 아닐 때)
        if (!isInitial && gridState) {
            currentCache[currentFloor] = {
                tiles: gridState.tiles.map(row => row.map(tile => ({ ...tile }))),
                playerPos: { ...gridState.playerPos },
                width: gridState.width,
                height: gridState.height
            };
        }

        // 2. 목표 층이 이미 캐시에 있는지 확인
        if (!isInitial && currentCache[targetFloor]) {
            const cached = currentCache[targetFloor];
            const restoredTiles = cached.tiles.map(row => row.map(tile => ({ ...tile })));

            let newPlayerPos = { ...cached.playerPos };
            if (targetFloor > currentFloor) {
                // 아래층으로 내려감 -> 대상 층의 stairs_up 또는 entrance 위치로 배치
                for (let y = 0; y < cached.height; y++) {
                    for (let x = 0; x < cached.width; x++) {
                        if (restoredTiles[y][x].type === 'stairs_up' || restoredTiles[y][x].type === 'entrance') {
                            newPlayerPos = { x, y };
                            break;
                        }
                    }
                }
            } else {
                // 위층으로 올라감 -> 대상 층의 stairs 위치로 배치
                for (let y = 0; y < cached.height; y++) {
                    for (let x = 0; x < cached.width; x++) {
                        if (restoredTiles[y][x].type === 'stairs') {
                            newPlayerPos = { x, y };
                            break;
                        }
                    }
                }
            }

            revealFogOfWar(restoredTiles, newPlayerPos.x, newPlayerPos.y, gridState!.torchRadius);
            const isCityScouted = Boolean(character.scoutedDungeons?.includes(city));
            if (isCityScouted) {
                for (let y = 0; y < cached.height; y++) {
                    for (let x = 0; x < cached.width; x++) {
                        restoredTiles[y][x].isRevealed = true;
                        restoredTiles[y][x].isIdentified = true;
                    }
                }
            }
            updateTileIdentifications(restoredTiles, newPlayerPos.x, newPlayerPos.y);

            const updatedGrid: GridDungeonState = {
                ...gridState!,
                currentFloor: targetFloor,
                width: cached.width,
                height: cached.height,
                playerPos: newPlayerPos,
                tiles: restoredTiles,
                floorCache: currentCache
            };

            const logMsg = targetFloor < currentFloor
                ? `[미궁 귀환] 계단을 통해 지하 ${targetFloor + 1}층으로 다시 올라왔습니다.`
                : `[미궁 복귀] 계단을 통해 지하 ${targetFloor + 1}층으로 내려왔습니다.`;

            setGridState(updatedGrid);
            setSelectedTile(restoredTiles[newPlayerPos.y][newPlayerPos.x]);
            syncGridToCharacter(updatedGrid, character, logMsg);
        } else {
            // 신규 층 생성
            const obsList = (character.base?.layout || []).filter(f => f.type === 'explorer_observatory' && !f.underConstruction);
            const obsMaxLv = obsList.reduce((acc, f) => Math.max(acc, f.level || 1), 0);
            const torchBonus = Number((obsMaxLv * 0.5).toFixed(1));
            const isCityScouted = Boolean(character.scoutedDungeons?.includes(currentCity));
            const newDungeon = generateGridDungeonFloor(nation, currentCity, targetFloor, isSeasonalBoss, bossInfo?.name, {
                torchBonus,
                isScouted: isCityScouted
            });
            newDungeon.activeRunesCount = gridState?.activeRunesCount || 0;
            newDungeon.totalRunesRequired = isSeasonalBoss ? 3 : 0;
            newDungeon.floorCache = currentCache;

            const logMsg = targetFloor === 0
                ? `[미궁 탐험] ${currentCity}의 ${isSeasonalBoss ? '시즌 신화 광활 미궁(5층 심연)' : '지하 미궁(3층)'}에 진입했습니다.`
                : `[미궁 심층 진입] 지하 ${targetFloor + 1}층으로 계단을 내려왔습니다.`;

            setGridState(newDungeon);
            setSelectedTile(newDungeon.tiles[newDungeon.playerPos.y][newDungeon.playerPos.x]);
            syncGridToCharacter(newDungeon, character, logMsg);
        }
    };

    /**
     * 타일 이동 로직 (인접 타일 탭 또는 방향키)
     */
    const handleMoveToTile = (targetX: number, targetY: number) => {
        if (!gridState) return;
        const { width, height, playerPos, tiles } = gridState;

        // 범위 검사
        if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) return;

        // 벽 검사
        const targetTile = tiles[targetY][targetX];
        if (targetTile.type === 'wall') {
            return;
        }

        // 인접성 검사 (맨해튼 거리 1 또는 대각선 1)
        const dx = Math.abs(targetX - playerPos.x);
        const dy = Math.abs(targetY - playerPos.y);
        if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
            // 인접하지 않은 타일은 정보 선택만 수행
            setSelectedTile(targetTile);
            return;
        }

        // 시간 흐름 처리 (발걸음/1칸 이동마다 1분 흐름)
        const timeAdvance = advanceGameTime(character, 1, { isDungeonOrCombat: true, activityName: '던전 탐사' });
        let activeChar = timeAdvance.updatedCharacter;
        const dayNotice = (timeAdvance as any).dayChangeNotice || timeAdvance.toastNotice || (timeAdvance.daysPassed > 0 ? '새로운 날이 밝았습니다.' : null);
        if (timeAdvance.daysPassed > 0 && dayNotice) {
            setDayChangeNotice(dayNotice);
        }

        // 새로운 타일 맵 복사
        const newTiles = tiles.map(row => row.map(tile => ({ ...tile })));
        
        // 시야 확장 (Fog of War)
        revealFogOfWar(newTiles, targetX, targetY, gridState.torchRadius);
        // 혁신안 4: 마물 1칸 배회(Patrol) 및 경계(!) 업데이트
        stepDungeonMonsterPatrol(newTiles, { x: targetX, y: targetY });

        const newPos = { x: targetX, y: targetY };
        const updatedGrid: GridDungeonState = {
            ...gridState,
            playerPos: newPos,
            tiles: newTiles
        };

        // 타일 이벤트/오브젝트 처리
        processTileContent(updatedGrid, newTiles[targetY][targetX], activeChar);
    };

    const emitFloatingGimmick = (x: number, y: number, text: string, color: string, toastMsg: string) => {
        setFloatingNotice({
            id: `${Date.now()}_${Math.random()}`,
            x,
            y,
            text,
            color
        });
        setGimmickToast(toastMsg);
    };

    /**
     * 도착한 타일의 오브젝트 처리
     */
    const processTileContent = (
        currentGrid: GridDungeonState,
        tile: GridTile,
        activeChar: Character
    ) => {
        const { currentFloor, maxFloors, tiles, playerPos } = currentGrid;
        const targetTile = tiles[playerPos.y][playerPos.x];

        // 1. 보스 도어 / 보스 전투
        if (targetTile.content === 'boss' && !targetTile.isCleared) {
            if (currentGrid.totalRunesRequired > 0 && currentGrid.activeRunesCount < currentGrid.totalRunesRequired) {
                setEventNotice({
                    title: '봉인된 심연의 결계',
                    desc: `강력한 고대 결계가 보스 제단을 막고 있습니다! (활성화된 룬석: ${currentGrid.activeRunesCount} / ${currentGrid.totalRunesRequired})`
                });
                setGridState(currentGrid);
                setSelectedTile(targetTile);
                return;
            }
            triggerGridBattle('boss', targetTile, activeChar, currentGrid);
            return;
        }

        // 2. 정예 수호자 (MiniBoss)
        if (targetTile.content === 'miniboss' && !targetTile.isCleared) {
            triggerGridBattle('miniboss', targetTile, activeChar, currentGrid);
            return;
        }

        // 3. 일반 마물 (Enemy)
        if (targetTile.content === 'enemy' && !targetTile.isCleared) {
            triggerGridBattle('enemy', targetTile, activeChar, currentGrid);
            return;
        }

        // 4. 보물 상자 (Chest)
        if (targetTile.content === 'chest' && !targetTile.isCleared) {
            const gold = targetTile.treasureData?.gold || 10000;
            const manaStone = targetTile.treasureData?.manaStone || 5;

            targetTile.isCleared = true;
            targetTile.treasureData = undefined;
            targetTile.name = '열린 보물 상자';
            targetTile.description = '이미 보물을 모두 회수한 빈 황금 상자입니다.';

            const newChar = { ...activeChar };
            newChar.money = (newChar.money || 0) + gold;
            if (newChar.base?.resources) {
                newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + manaStone;
            }

            emitFloatingGimmick(
                playerPos.x,
                playerPos.y,
                `🎁 +${gold.toLocaleString()}G · 마정석 +${manaStone}`,
                '#fde047',
                `[보물 상자 개봉] ${gold.toLocaleString()} 골드와 마정석 ${manaStone}개를 획득했습니다!`
            );

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, `[미궁 보물] 보물 상자를 열어 ${gold.toLocaleString()}G와 마정석 ${manaStone}개를 획득했습니다.`);
            return;
        }

        // 5. 성스러운 샘 (Shrine)
        if (targetTile.content === 'shrine' && !targetTile.isCleared) {
            targetTile.isCleared = true;
            targetTile.shrineData = undefined;
            targetTile.name = '치유의 샘 (사용됨)';
            targetTile.description = '영험한 샘물을 마셔 기력을 회복한 성소입니다.';

            const pFinal = calculateFinalStats(activeChar).finalStats;
            const newChar = { ...activeChar };
            newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.6));
            newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.6));

            if (newChar.companions) {
                newChar.companions = newChar.companions.map(comp => {
                    const cFinal = calculateFinalStats(comp).finalStats;
                    return {
                        ...comp,
                        stats: {
                            ...comp.stats,
                            hp: Math.min(cFinal.maxHp, comp.stats.hp + Math.floor(cFinal.maxHp * 0.6)),
                            mp: Math.min(cFinal.maxMp, comp.stats.mp + Math.floor(cFinal.maxMp * 0.6))
                        }
                    };
                });
            }

            emitFloatingGimmick(
                playerPos.x,
                playerPos.y,
                '⛲ 파티 HP/MP +60% 회복!',
                '#67e8f9',
                '[치유의 신성한 샘] 영험한 샘물을 마셔 파티 전원의 생명력과 마력이 60% 회복되었습니다!'
            );

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, '[미궁 성소] 신성한 샘물을 마셔 파티의 기력을 대폭 회복했습니다.');
            return;
        }

        // 6. 봉인의 룬석 (Rune Stone - 시즌 보스 전용)
        if (targetTile.content === 'rune_stone' && !targetTile.isCleared) {
            targetTile.isCleared = true;
            targetTile.name = '해제된 신화 봉인석';
            targetTile.description = '고대 룬 각인이 활성화되어 결계가 약화된 오벨리스크입니다.';
            currentGrid.activeRunesCount += 1;
            const runes = currentGrid.activeRunesCount;
            const total = currentGrid.totalRunesRequired;

            emitFloatingGimmick(
                playerPos.x,
                playerPos.y,
                `🔮 봉인석 해제 (${runes}/${total})`,
                '#d8b4fe',
                `[신화의 봉인석 해제] 심연 결계의 봉인석을 활성화했습니다! (${runes} / ${total})`
            );

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, activeChar, `[봉인 해제] 고대 신화 결계의 봉인석을 해제했습니다 (${runes}/${total})`);
            return;
        }

        // 7. 혁신안 3 확장: 인터랙티브 파밍 소품 & g2/g3 신규 구조물 기믹
        if (targetTile.propType && targetTile.propType !== 'pillar' && targetTile.propType !== 'gargoyle' && !targetTile.isCleared) {
            const pFinal = calculateFinalStats(activeChar).finalStats;
            const newChar = { ...activeChar };
            let logMsg = '';

            if (targetTile.propType === 'crate') {
                targetTile.isCleared = true;
                targetTile.propType = undefined;
                targetTile.name = '부서진 보급통 잔해';
                targetTile.description = '보급품을 회수하고 남은 나무 파편입니다.';
                const bonusGold = (currentFloor + 1) * 3500 + Math.floor(Math.random() * 2500);
                const healHp = Math.floor(pFinal.maxHp * 0.15);
                newChar.money = (newChar.money || 0) + bonusGold;
                newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + healHp);
                logMsg = `[보급통 파괴] 오크통을 부수어 비상금 +${bonusGold.toLocaleString()}G와 비상 식량(HP +15%)을 획득했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `📦 +${bonusGold.toLocaleString()}G · HP +15%`, '#fdba74', logMsg);
            } else if (targetTile.propType === 'bones') {
                targetTile.isCleared = true;
                targetTile.propType = undefined;
                targetTile.name = '수습된 모험가의 유해';
                targetTile.description = '선대 탐험가의 유품을 수습하고 명복을 빌어주었습니다.';
                const bonusStone = 2 + currentFloor;
                if (newChar.base?.resources) {
                    newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + bonusStone;
                }
                for (let ry = 0; ry < currentGrid.height; ry++) {
                    for (let rx = 0; rx < currentGrid.width; rx++) {
                        const rt = tiles[ry][rx];
                        if ((rt.content === 'chest' || rt.content === 'rune_stone' || rt.content === 'shrine' || rt.type === 'stairs') && !rt.isRevealed) {
                            revealFogOfWar(tiles, rx, ry, 1.5);
                            break;
                        }
                    }
                }
                logMsg = `[유골 조사] 선대 모험가의 지도 조각으로 숨겨진 구역이 밝혀지고 마정석 +${bonusStone}개를 얻었습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `💀 마정석 +${bonusStone} · 비밀지도 개방!`, '#e2e8f0', logMsg);
            } else if (targetTile.propType === 'crystal') {
                targetTile.isCleared = true;
                targetTile.name = '공명 중인 마력 수정 (비콘)';
                targetTile.description = '마력을 방출하여 주변 어둠을 영구적으로 밝히고 있는 크리스탈입니다.';
                const mpGain = Math.floor(pFinal.maxMp * 0.35);
                newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + mpGain);
                revealFogOfWar(tiles, playerPos.x, playerPos.y, 3.2);
                logMsg = `[마력 수정 공명] 수정의 마나를 흡수하여 MP +35% 회복 및 주변 3.2칸 시야를 영구 점등했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, '💎 MP +35% · 수정 비콘 점등!', '#38bdf8', logMsg);
            } else if (targetTile.propType === 'campfire') {
                targetTile.isCleared = true;
                targetTile.name = '따뜻한 모닥불 야영지 (휴식됨)';
                targetTile.description = '모닥불 온기로 파티가 휴식을 마친 야영지입니다.';
                newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.45));
                newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.45));
                logMsg = `[🏕️ 모닥불 야영지] 따뜻한 수프와 모닥불 앞에서 휴식하여 HP/MP를 45% 회복했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, '🏕️ 야영 휴식 HP/MP +45%!', '#fed7aa', logMsg);
            } else if (targetTile.propType === 'merchant') {
                targetTile.isCleared = true;
                targetTile.name = '미궁 방랑 상인 (거래 완료)';
                targetTile.description = '탐험가에게 비약과 군자금을 건네준 신비한 방랑 상인입니다.';
                const bonusGold = (currentFloor + 1) * 5000;
                newChar.money = (newChar.money || 0) + bonusGold;
                newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.3));
                newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.3));
                logMsg = `[🏮 미궁 방랑 상인] 방랑 상인이 모험가를 응원하며 비약(HP/MP +30%)과 후원금 +${bonusGold.toLocaleString()}G를 건넸습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `🏮 상인 보급 HP/MP +30% · +${bonusGold.toLocaleString()}G`, '#e9d5ff', logMsg);
            } else if (targetTile.propType === 'bookshelf') {
                targetTile.isCleared = true;
                targetTile.name = '열람한 고대 마도서 서가';
                targetTile.description = '비전 마법서를 모두 해독한 고대 서가입니다.';
                const expGain = (currentFloor + 1) * 4500;
                const stoneGain = 3 + currentFloor;
                newChar.currentExp = (newChar.currentExp || 0) + expGain;
                if (newChar.base?.resources) {
                    newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + stoneGain;
                }
                logMsg = `[📚 고대 마도서 해독] 비전 마법서를 해독하여 경험치 +${expGain.toLocaleString()} 및 마정석 +${stoneGain}개를 획득했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `📚 EXP +${expGain.toLocaleString()} · 마정석 +${stoneGain}`, '#93c5fd', logMsg);
            } else if (targetTile.propType === 'altar') {
                targetTile.isCleared = true;
                targetTile.name = '의식을 마친 혈석 제단';
                targetTile.description = '핏빛 성배의 축복을 수렴한 고대 제단입니다.';
                const bonusGold = (currentFloor + 1) * 7500;
                const stoneGain = 4 + currentFloor * 2;
                newChar.stats.hp = Math.max(1, newChar.stats.hp - Math.floor(pFinal.maxHp * 0.08));
                newChar.money = (newChar.money || 0) + bonusGold;
                if (newChar.base?.resources) {
                    newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + stoneGain;
                }
                logMsg = `[🩸 핏빛 혈석 제단] 생명력(HP -8%)을 바쳐 황금 성배의 보화(+${bonusGold.toLocaleString()}G · 마정석 +${stoneGain})를 얻었습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `🩸 성배 공물 +${bonusGold.toLocaleString()}G · 마정석 +${stoneGain}`, '#fca5a5', logMsg);
            } else if (targetTile.propType === 'prison') {
                targetTile.isCleared = true;
                targetTile.name = '개방된 지하 감옥 철창';
                targetTile.description = '자물쇠를 부수고 내부의 유물을 회수한 철창입니다.';
                const bonusGold = (currentFloor + 1) * 6000;
                const stoneGain = 3 + currentFloor;
                newChar.money = (newChar.money || 0) + bonusGold;
                if (newChar.base?.resources) {
                    newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + stoneGain;
                }
                logMsg = `[⛓️ 감옥 철창 개방] 봉인된 철창 자물쇠를 해제하여 은닉된 보화(+${bonusGold.toLocaleString()}G · 마정석 +${stoneGain})를 회수했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `⛓️ 철창 개방 +${bonusGold.toLocaleString()}G · 마정석 +${stoneGain}`, '#cbd5e1', logMsg);
            } else if (targetTile.propType === 'lever') {
                targetTile.isCleared = true;
                targetTile.name = '작동된 고대 룬 레버';
                targetTile.description = '레버를 당겨 미궁의 함정을 해제하고 비밀 통로를 밝혔습니다.';
                let disarmed = 0;
                for (let ry = 0; ry < currentGrid.height; ry++) {
                    for (let rx = 0; rx < currentGrid.width; rx++) {
                        const rt = tiles[ry][rx];
                        if (rt.propType === 'spike_trap' && !rt.isCleared) {
                            rt.isCleared = true;
                            rt.propType = undefined;
                            disarmed++;
                        }
                        if ((rt.type === 'stairs' || rt.content === 'boss' || rt.content === 'chest') && !rt.isRevealed) {
                            revealFogOfWar(tiles, rx, ry, 2.0);
                        }
                    }
                }
                logMsg = `[⚙️ 고대 룬 레버 작동] 현재 층의 가시 함정 ${disarmed}개를 일괄 해제하고 주요 거점 시야를 개방했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `⚙️ 함정 ${disarmed}개 해제 · 비밀시야 개방!`, '#67e8f9', logMsg);
            } else if (targetTile.propType === 'spike_trap') {
                targetTile.isCleared = true;
                targetTile.propType = undefined;
                targetTile.name = '해체된 가시 함정';
                targetTile.description = '작동 후 해체된 기계식 함정 자리입니다.';
                const bonusGold = (currentFloor + 1) * 3000;
                newChar.stats.hp = Math.max(1, newChar.stats.hp - Math.floor(pFinal.maxHp * 0.06));
                newChar.money = (newChar.money || 0) + bonusGold;
                logMsg = `[🗡️ 강철 가시 함정] 가시에 스쳐 피해(HP -6%)를 입었지만 기계 부품(+${bonusGold.toLocaleString()}G)을 회수했습니다!`;
                emitFloatingGimmick(playerPos.x, playerPos.y, `🗡️ 가시 함정 HP -6% · 부품 +${bonusGold.toLocaleString()}G`, '#fda4af', logMsg);
            }

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, logMsg);
            return;
        }

        // 8. 혁신안 3: 6종 원소 지형 장판 기믹 발동 (fire, water, ice, poison, holy, thunder)
        if (targetTile.zoneType && !targetTile.isCleared) {
            targetTile.isCleared = true;
            const pFinal = calculateFinalStats(activeChar).finalStats;
            const newChar = { ...activeChar };
            let logMsg = '';

            switch (targetTile.zoneType) {
                case 'fire': {
                    const bonusGold = (currentFloor + 1) * 4000;
                    newChar.money = (newChar.money || 0) + bonusGold;
                    newChar.stats.hp = Math.max(1, newChar.stats.hp - Math.floor(pFinal.maxHp * 0.04));
                    logMsg = `[🔥 용암 화염 지대] 뜨거운 열기(HP -4%)를 견뎌내고 용암 결정(+${bonusGold.toLocaleString()}G)을 획득했습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, `🔥 화염 결정 +${bonusGold.toLocaleString()}G`, '#fb923c', logMsg);
                    break;
                }
                case 'water': {
                    newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.25));
                    logMsg = `[💧 지하수 웅덩이] 맑은 영수로 목을 축여 파티 MP가 25% 회복되었습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, '💧 맑은 영수 MP +25%', '#38bdf8', logMsg);
                    break;
                }
                case 'ice': {
                    newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.12));
                    newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.18));
                    logMsg = `[❄️ 혹한 서리 빙판] 차가운 냉기 마력을 수렴하여 HP +12%, MP +18%를 회복했습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, '❄️ 냉기 수렴 HP +12% · MP +18%', '#a5f3fc', logMsg);
                    break;
                }
                case 'poison': {
                    newChar.stats.hp = Math.max(1, newChar.stats.hp - Math.floor(pFinal.maxHp * 0.05));
                    if (newChar.base?.resources) {
                        newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + 2;
                    }
                    logMsg = `[☠️ 맹독 포자 늪] 독기(HP -5%) 속에서 희귀한 맹독 마정석 +2개를 채집했습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, '☠️ 독기 HP -5% · 마정석 +2', '#4ade80', logMsg);
                    break;
                }
                case 'holy': {
                    newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.25));
                    newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.25));
                    revealFogOfWar(tiles, playerPos.x, playerPos.y, currentGrid.torchRadius + 1.0);
                    logMsg = `[✨ 성역의 축복 장판] 황금빛 성역의 가호로 HP/MP +25% 회복 및 주변 안개가 정화되었습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, '✨ 성역 축복 HP/MP +25%', '#fde047', logMsg);
                    break;
                }
                case 'thunder': {
                    currentGrid.torchRadius = Number((currentGrid.torchRadius + 0.5).toFixed(1));
                    revealFogOfWar(tiles, playerPos.x, playerPos.y, currentGrid.torchRadius);
                    logMsg = `[⚡ 낙뢰 마력 균열] 전격 에너지가 횃불에 깃들어 현재 층 시야 반경이 +0.5칸 영구 확장되었습니다!`;
                    emitFloatingGimmick(playerPos.x, playerPos.y, '⚡ 전격 각성! 횃불 시야 +0.5칸', '#60a5fa', logMsg);
                    break;
                }
            }

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, logMsg);
            return;
        }

        // 9. 하층 계단 도달 (Stairs)
        if (targetTile.type === 'stairs') {
            changeDungeonFloor(currentFloor + 1);
            return;
        }

        // 10. 상층 계단 도달 (Stairs Up)
        if (targetTile.type === 'stairs_up') {
            changeDungeonFloor(currentFloor - 1);
            return;
        }

        // 단순 바닥 이동 완료
        setGridState(currentGrid);
        setSelectedTile(targetTile);
        syncGridToCharacter(currentGrid, activeChar);
    };

    const updatedGridState = (g: GridDungeonState): GridDungeonState => {
        return { ...g };
    };

    /**
     * 전투 진입 처리
     */
    const triggerGridBattle = (
        combatType: 'enemy' | 'miniboss' | 'boss',
        tile: GridTile,
        activeChar: Character,
        currentGrid: GridDungeonState
    ) => {
        const theme = NATION_THEMES[nation] || NATION_THEMES.default;
        const bossLevel = Math.max(5, bossInfo?.level || 100);
        let enemies: Enemy[] = [];

        if (combatType === 'boss') {
            const boss = generateBossMonster(nation, currentCity, currentMonth);
            const actualBossLevel = boss.level || bossLevel;
            const monsterPool = theme.monsters['advanced'] || ["심연의 마물"];
            const minionLevel = Math.max(1, Math.min(Math.floor(actualBossLevel * 0.55), actualBossLevel - 5));
            const minions: Enemy[] = [];
            for (let i = 0; i < 2; i++) {
                const enemy = generateProceduralEnemy(minionLevel);
                const monsterName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const minfo = getMonsterInfo(monsterName);
                enemy.name = `[보스 호위병] ${minfo.name}`;
                if (minfo.visualUrl) enemy.visualUrl = minfo.visualUrl;
                minions.push(enemy);
            }
            enemies = [boss, ...minions];
        } else if (combatType === 'miniboss') {
            const monsterPool = theme.monsters['elite'] || ["정예 마물"];
            const miniBossLevel = Math.max(1, Math.min(Math.floor(bossLevel * 0.65), bossLevel - 5));
            const miniBoss = generateProceduralEnemy(miniBossLevel);
            const miniBossName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
            const miniBossInfo = getMonsterInfo(miniBossName);
            miniBoss.name = `[정예 수호수] ${miniBossInfo.name}`;
            if (miniBossInfo.visualUrl) miniBoss.visualUrl = miniBossInfo.visualUrl;
            miniBoss.maxHp *= 3;
            miniBoss.hp = miniBoss.maxHp;

            const minionLevel = Math.max(1, Math.min(Math.floor(miniBossLevel * 0.6), miniBossLevel - 3));
            const minion = generateProceduralEnemy(minionLevel);
            const minionName = theme.monsters['intermediate'][Math.floor(Math.random() * theme.monsters['intermediate'].length)];
            const minionInfo = getMonsterInfo(minionName);
            minion.name = `[수호 파수병] ${minionInfo.name}`;
            if (minionInfo.visualUrl) minion.visualUrl = minionInfo.visualUrl;
            enemies = [miniBoss, minion];
        } else {
            const monsterPool = theme.monsters['intermediate'] || ["던전 마물"];
            const baseLevel = Math.floor(bossLevel * (0.35 + (currentGrid.currentFloor / currentGrid.maxFloors) * 0.25));
            const count = 3 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const enemy = generateProceduralEnemy(Math.max(1, baseLevel + Math.floor(Math.random() * 3)));
                const monsterName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const minfo = getMonsterInfo(monsterName);
                enemy.name = `[미궁 마물] ${minfo.name}`;
                if (minfo.visualUrl) enemy.visualUrl = minfo.visualUrl;
                enemies.push(enemy);
            }
        }

        // 이름 중복 처리
        const nameCounts: Record<string, number> = {};
        enemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
        const finalEnemies = enemies.map((e, idx) => {
            if (nameCounts[e.name] > 1) {
                const currentOccurence = enemies.slice(0, idx + 1).filter(prev => prev.name === e.name).length;
                return { ...e, name: `${e.name} ${String.fromCharCode(64 + currentOccurence)}` };
            }
            return e;
        });

        // 타일 클리어 및 일반 바닥으로 전환 처리
        const originalTileName = tile.name || '마물';
        tile.isCleared = true;
        tile.content = undefined;
        tile.name = '미궁 복도';
        tile.description = '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.';
        if (combatType === 'boss') {
            currentGrid.bossDefeated = true;
        }

        // 전투 전 인벤토리 스냅샷 저장
        const newChar = { ...activeChar };
        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.gridDungeon = currentGrid;
            newChar.dungeonProgress.currentNodeId = combatType === 'boss' ? `boss_${tile.x}_${tile.y}` : `tile_${tile.x}_${tile.y}`;
            if (combatType === 'boss') {
                newChar.dungeonProgress.bossBattlePreInventory = (newChar.inventory || []).map(i => i.name);
            }
        }

        onUpdateCharacter(newChar, `[미궁 전투] ${originalTileName}과(와) 조우하여 전투를 시작합니다.`);
        onClose();
        onBattle(finalEnemies, 'dungeon');
    };

    const syncGridToCharacter = (grid: GridDungeonState, baseChar: Character = character, log?: string) => {
        const newChar = { ...baseChar };
        if (!newChar.dungeonProgress) {
            newChar.dungeonProgress = {
                currentIndex: 0,
                nodes: [],
                nation,
                gridDungeon: grid
            };
        } else {
            newChar.dungeonProgress.gridDungeon = grid;
        }
        onUpdateCharacter(newChar, log || '');
    };

    /**
     * 던전 퇴각
     */
    const handleExitDungeon = () => {
        const newChar = { ...character };
        newChar.dungeonProgress = undefined;
        onUpdateCharacter(newChar, '[미궁 철수] 미궁 탐험을 중단하고 지상으로 안전하게 퇴각했습니다.');
        onClose();
    };

    /**
     * D-Pad 방향 이동 헬퍼
     */
    const handleDPadMove = (dx: number, dy: number) => {
        if (!gridState) return;
        const targetX = gridState.playerPos.x + dx;
        const targetY = gridState.playerPos.y + dy;
        handleMoveToTile(targetX, targetY);
    };

    // PC 키보드 방향키(↑↓←→) 및 WASD 조작 지원
    useEffect(() => {
        if (!isOpen || !gridState) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 입력창에 포커스가 있으면 키 이벤트 무시
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            // 이벤트 알림 팝업 열려 있을 때 Enter, Space, Escape로 닫기
            if (eventNotice || dayChangeNotice) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    e.preventDefault();
                    if (eventNotice) setEventNotice(null);
                    if (dayChangeNotice) setDayChangeNotice(null);
                }
                return;
            }

            if (rescuedModalInfo) return;

            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    dy = -1;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    dy = 1;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    dx = -1;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    dx = 1;
                    break;
                default:
                    return;
            }

            e.preventDefault();
            handleDPadMove(dx, dy);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, gridState, eventNotice, dayChangeNotice, rescuedModalInfo]);

    const playerFinalStats = useMemo(() => {
        return calculateFinalStats(character).finalStats;
    }, [character.stats, character.level, character.equipment, character.titles]);

    if (!isOpen) return null;

    const city = character.currentLocation?.city || "알 수 없는 도시";
    const isAlreadyClearedToday = character.clearedDungeonsByCity && character.clearedDungeonsByCity[city] === character.currentDate;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-xl sm:rounded-2xl flex flex-col h-[96dvh] sm:h-[92vh] max-h-[98dvh] shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="px-3 py-2 sm:p-4 border-b border-slate-800 flex justify-between items-center gap-2 bg-slate-950/70 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-lg sm:rounded-xl text-rose-400 shrink-0">
                            {isSeasonalBoss ? <Crown size={18} className="animate-pulse sm:w-6 sm:h-6" /> : <Map size={18} className="sm:w-6 sm:h-6" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-xl font-bold text-slate-100 truncate">
                                    {city} {isSeasonalBoss ? '시즌 신화 대미궁' : '지하 미궁'}
                                </h2>
                                <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isSeasonalBoss ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' : 'bg-slate-800 text-slate-300'}`}>
                                    {gridState ? `지하 ${gridState.currentFloor + 1}F / ${gridState.maxFloors}F` : '지하 미궁'}
                                </span>
                                {gridState && gridState.currentFloor > 0 && (
                                    <button
                                        onClick={() => changeDungeonFloor(gridState.currentFloor - 1)}
                                        className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                        title="이전 층으로 이동"
                                    >
                                        <span>⬆️ {gridState.currentFloor}F 복귀</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                                {isSeasonalBoss ? `[신화 보스: ${bossInfo?.name || '신화적 존재'}] 광활한 5층 심연 미궁` : `[던전 보스: ${bossInfo?.name || '미궁 군주'}] 격자 타일 탐색`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold font-mono text-amber-300 bg-amber-950/60 border border-amber-800/70 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-sm">
                            <Clock size={12} className="text-amber-400" />
                            <span>{character.currentTime || '12:00'}</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer" title="던전 나가기">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 오늘 이미 클리어한 경우 */}
                {isAlreadyClearedToday && !gridState ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-auto">
                        <Trophy size={48} className="text-amber-400" />
                        <h3 className="text-xl font-bold text-white">오늘의 던전 정복 완료</h3>
                        <p className="text-sm text-slate-400 max-w-md">
                            오늘 {city}의 미궁을 이미 완전히 정복했습니다. 내일 다시 도전하거나 다른 도시의 미궁을 탐험해 보세요.
                        </p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold">
                            확인 및 닫기
                        </button>
                    </div>
                ) : !gridState ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 my-auto">
                        <Loader2 size={36} className="animate-spin text-rose-500" />
                        <p className="text-slate-300 font-bold text-sm">미궁의 지형을 탐색하여 타일 지도를 구축하고 있습니다...</p>
                    </div>
                ) : (
                    /* 메인 탐험 인터페이스 */
                    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                        {/* 좌측: 쯔꾸르(RPG Maker) / 격자 캔버스 뷰 */}
                        <div className="flex-1 min-h-[48dvh] lg:min-h-0 bg-slate-950/80 p-2 sm:p-4 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
                            {/* 미궁 상단 상태 바 */}
                            <div className="w-full flex flex-wrap justify-between items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2.5 px-1 text-[11px] sm:text-xs font-bold text-slate-400 shrink-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <Flame size={13} /> 횃불 시야: {gridState.torchRadius}칸
                                    </span>
                                    {character.scoutedDungeons?.includes(currentCity) && (
                                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-1.5 py-0.5 rounded-lg">
                                            🗺️ 정찰 완료
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    {gridState.totalRunesRequired > 0 && (
                                        <span className="flex items-center gap-1 text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-900/60 text-[10px] sm:text-xs">
                                            <Lock size={11} /> 봉인석: {gridState.activeRunesCount}/{gridState.totalRunesRequired}
                                        </span>
                                    )}
                                    <div className="inline-flex bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[10px] sm:text-[11px]">
                                        <button
                                            onClick={() => toggleViewMode('rpg')}
                                            className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${viewMode === 'rpg' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            🎮 쯔꾸르 뷰
                                        </button>
                                        <button
                                            onClick={() => toggleViewMode('classic')}
                                            className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${viewMode === 'classic' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            🗺️ 격자 보드
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {gimmickToast && (
                                <div className="mb-1.5 px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-700/70 text-amber-200 text-[11px] font-bold flex items-center justify-between gap-2 animate-fade-in shrink-0">
                                    <span className="truncate">✨ {gimmickToast}</span>
                                    <button onClick={() => setGimmickToast(null)} className="text-amber-400 hover:text-white text-[10px] shrink-0 cursor-pointer">닫기</button>
                                </div>
                            )}

                            {viewMode === 'rpg' ? (
                                <div className="flex-1 min-h-0 w-full">
                                    <DungeonRpgCanvas
                                        gridState={gridState}
                                        character={character}
                                        selectedTile={selectedTile}
                                        isSeasonalBoss={isSeasonalBoss}
                                        bossName={bossInfo?.name}
                                        isPaused={Boolean(eventNotice || rescuedModalInfo)}
                                        floatingNotice={floatingNotice}
                                        onMoveToTile={handleMoveToTile}
                                        onSelectTile={(t) => setSelectedTile(t)}
                                        onTriggerFloorChange={(floor) => changeDungeonFloor(floor)}
                                        onExitDungeon={handleExitDungeon}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center overflow-auto min-h-0">
                                    {/* 격자 타일 보드 */}
                                    <div 
                                        className="inline-grid gap-1 p-2 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner max-w-full overflow-auto"
                                        style={{
                                            gridTemplateColumns: `repeat(${gridState.width}, minmax(0, 1fr))`
                                        }}
                                    >
                                        {gridState.tiles.map((row, y) =>
                                            row.map((tile, x) => {
                                                const isPlayer = gridState.playerPos.x === x && gridState.playerPos.y === y;
                                                const isAdjacent = Math.abs(x - gridState.playerPos.x) <= 1 && Math.abs(y - gridState.playerPos.y) <= 1 && !(x === gridState.playerPos.x && y === gridState.playerPos.y);
                                                const isSelected = selectedTile?.x === x && selectedTile?.y === y;

                                                // 1. 미탐색 어둠 (Fog of War)
                                                if (!tile.isRevealed) {
                                                    return (
                                                        <div 
                                                            key={`${x}-${y}`} 
                                                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-slate-950/90 rounded-md border border-slate-900 flex items-center justify-center opacity-70"
                                                        >
                                                            <div className="w-1.5 h-1.5 bg-slate-800 rounded-full opacity-30" />
                                                        </div>
                                                    );
                                                }

                                                // 2. 벽 타일
                                                if (tile.type === 'wall') {
                                                    return (
                                                        <div 
                                                            key={`${x}-${y}`} 
                                                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-slate-900/95 rounded-md border border-slate-800/60 flex items-center justify-center text-slate-700 select-none shadow-sm overflow-hidden"
                                                            style={{
                                                                backgroundImage: `url(${resolveDungeonAssetUrl(isSeasonalBoss ? 'tile_wall_mythic' : 'tile_wall_stone')})`,
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center'
                                                            }}
                                                        />
                                                    );
                                                }

                                                // 3. 이동 가능한 바닥 타일
                                                return (
                                                    <button
                                                        key={`${x}-${y}`}
                                                        onClick={() => handleMoveToTile(x, y)}
                                                        style={{
                                                            backgroundImage: `url(${resolveDungeonAssetUrl(isSeasonalBoss ? 'tile_floor_mythic' : 'tile_floor_stone')})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center'
                                                        }}
                                                        className={`
                                                            w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center transition-all relative overflow-hidden
                                                            ${isPlayer 
                                                                ? 'border-2 border-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/40 z-10 scale-105' 
                                                                : isSelected
                                                                    ? 'border-2 border-cyan-400 z-10'
                                                                    : isAdjacent
                                                                        ? 'border border-sky-400/60 hover:border-amber-300 cursor-pointer'
                                                                        : 'border border-slate-800/70'}
                                                        `}
                                                    >
                                                        {/* 플레이어 및 오브젝트 심볼 스프라이트 */}
                                                        {isPlayer ? (
                                                            <div
                                                                className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                                                                style={{
                                                                    backgroundImage: `url(${resolveEntityRpgSprite(character, character.currentLocation?.region, nation).url})`,
                                                                    backgroundSize: '300% 400%',
                                                                    backgroundPosition: '50% 0%',
                                                                    backgroundRepeat: 'no-repeat'
                                                                }}
                                                                title={character.name}
                                                            />
                                                        ) : tile.type === 'stairs' ? (
                                                            <img src={resolveDungeonAssetUrl('stairs_down')} alt="하층 계단" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" title="하층 계단" />
                                                        ) : tile.type === 'stairs_up' ? (
                                                            <img src={resolveDungeonAssetUrl('stairs_up')} alt="상층 계단" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" title="상층 계단" />
                                                        ) : tile.type === 'entrance' ? (
                                                            <img src={resolveDungeonAssetUrl('entrance_gate')} alt="1층 출구" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" title="1층 출구" />
                                                        ) : tile.content === 'boss' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('boss_throne')} alt="보스 제단" className="w-7 h-7 sm:w-8 sm:h-8 object-contain animate-pulse drop-shadow" />
                                                        ) : tile.content === 'miniboss' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('miniboss_marker')} alt="정예 수호수" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.content === 'enemy' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('enemy_marker')} alt="마물" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.content === 'chest' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('chest_closed')} alt="보물 상자" className="w-6 h-6 sm:w-7 sm:h-7 object-contain animate-bounce drop-shadow" />
                                                        ) : tile.content === 'shrine' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('shrine_fountain')} alt="성스러운 샘" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.content === 'rune_stone' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('rune_locked')} alt="봉인석" className="w-6 h-6 sm:w-7 sm:h-7 object-contain animate-pulse drop-shadow" />
                                                        ) : tile.propType === 'crate' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('barrel_crates')} alt="보급통" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.propType === 'bones' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('skeleton_bones')} alt="유골" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.propType === 'crystal' && !tile.isCleared ? (
                                                            <img src={resolveDungeonAssetUrl('crystal_cluster')} alt="마력수정" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.propType === 'pillar' ? (
                                                            <img src={resolveDungeonAssetUrl('stone_pillar')} alt="석주" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow" />
                                                        ) : tile.zoneType && !tile.isCleared ? (
                                                            <img
                                                                src={resolveDungeonAssetUrl(
                                                                    tile.zoneType === 'fire' ? 'zone_fire_lava' :
                                                                    tile.zoneType === 'water' ? 'zone_water_puddle' :
                                                                    tile.zoneType === 'ice' ? 'zone_ice_frost' :
                                                                    tile.zoneType === 'poison' ? 'zone_poison_swamp' :
                                                                    tile.zoneType === 'holy' ? 'zone_holy_sanctuary' :
                                                                    'zone_thunder_crack'
                                                                )}
                                                                alt="원소 장판"
                                                                className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow"
                                                            />
                                                        ) : (
                                                            <div className="w-1 h-1 bg-slate-400/30 rounded-full" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* 가이드 안내 문구 */}
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 sm:mt-3 text-center">
                                        * 인접 타일 탭 또는 방향키로 이동 · 오브젝트·원소 장판은 밟으면 즉시 발동!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 우측(모바일 하단): 탐험 상태 & 정보 패널 (모바일에서 맵을 가리지 않도록 최대 높이 제한 & 2열 배치) */}
                        <div className="w-full lg:w-80 shrink-0 max-h-[38dvh] lg:max-h-none p-2.5 sm:p-4 flex flex-col justify-between bg-slate-900 overflow-y-auto">
                            <div className="grid grid-cols-12 gap-2 lg:flex lg:flex-col lg:space-y-4 items-stretch">
                                {/* 현재 위치 타일 정보 카드 */}
                                <div className="col-span-7 lg:w-full bg-slate-950/70 border border-slate-800 p-2.5 sm:p-4 rounded-xl flex flex-col justify-between">
                                    <div>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            CURRENT TILE FOCUS
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {selectedTile && (
                                                <img
                                                    src={resolveDungeonAssetUrl(
                                                        selectedTile.content === 'boss' ? 'boss_throne' :
                                                        selectedTile.content === 'miniboss' ? 'miniboss_marker' :
                                                        selectedTile.content === 'enemy' ? 'enemy_marker' :
                                                        selectedTile.content === 'chest' ? (selectedTile.isCleared ? 'chest_open' : 'chest_closed') :
                                                        selectedTile.content === 'shrine' ? 'shrine_fountain' :
                                                        selectedTile.content === 'rune_stone' ? (selectedTile.isCleared ? 'rune_active' : 'rune_locked') :
                                                        selectedTile.propType === 'crate' ? 'barrel_crates' :
                                                        selectedTile.propType === 'bones' ? 'skeleton_bones' :
                                                        selectedTile.propType === 'crystal' ? 'crystal_cluster' :
                                                        selectedTile.propType === 'pillar' ? 'stone_pillar' :
                                                        selectedTile.zoneType === 'fire' ? 'zone_fire_lava' :
                                                        selectedTile.zoneType === 'water' ? 'zone_water_puddle' :
                                                        selectedTile.zoneType === 'ice' ? 'zone_ice_frost' :
                                                        selectedTile.zoneType === 'poison' ? 'zone_poison_swamp' :
                                                        selectedTile.zoneType === 'holy' ? 'zone_holy_sanctuary' :
                                                        selectedTile.zoneType === 'thunder' ? 'zone_thunder_crack' :
                                                        selectedTile.type === 'stairs' ? 'stairs_down' :
                                                        selectedTile.type === 'stairs_up' ? 'stairs_up' :
                                                        selectedTile.type === 'entrance' ? 'entrance_gate' :
                                                        selectedTile.type === 'wall' ? (isSeasonalBoss ? 'tile_wall_mythic' : 'tile_wall_stone') :
                                                        (isSeasonalBoss ? 'tile_floor_mythic' : 'tile_floor_stone')
                                                    )}
                                                    alt="타일 아이콘"
                                                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg bg-slate-900/90 border border-slate-800 p-1 shrink-0"
                                                />
                                            )}
                                            <h4 className="text-xs sm:text-base font-bold text-white truncate">
                                                {selectedTile?.name || (selectedTile?.type === 'wall' ? '단단한 석벽' : '미궁 복도')}
                                            </h4>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 leading-snug sm:leading-relaxed line-clamp-2 lg:line-clamp-none">
                                            {selectedTile?.description || '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.'}
                                        </p>
                                    </div>

                                    <div>
                                        {/* 타일 상태 태그 */}
                                        {selectedTile && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-slate-900">
                                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                                    좌표: ({selectedTile.x}, {selectedTile.y})
                                                </span>
                                                {selectedTile.isCleared && (
                                                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-900">
                                                        소탕/해제
                                                    </span>
                                                )}
                                                {selectedTile.content && !selectedTile.isCleared && selectedTile.isIdentified && (
                                                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                                        식별됨
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* 계단 및 입구 인터랙션 액션 버튼 */}
                                        {selectedTile && gridState && (selectedTile.type === 'stairs' || selectedTile.type === 'stairs_up' || selectedTile.type === 'entrance') && (
                                            <div className="mt-1.5 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-slate-900/80">
                                                {selectedTile.type === 'stairs' && (
                                                    <button
                                                        onClick={() => changeDungeonFloor(gridState.currentFloor + 1)}
                                                        className="w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-600/80 rounded-xl text-cyan-200 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg cursor-pointer"
                                                    >
                                                        <span>🪜 지하 {gridState.currentFloor + 2}F 이동</span>
                                                        <ChevronRight size={13} />
                                                    </button>
                                                )}
                                                {selectedTile.type === 'stairs_up' && (
                                                    <button
                                                        onClick={() => changeDungeonFloor(gridState.currentFloor - 1)}
                                                        className="w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-amber-900/60 hover:bg-amber-800 border border-amber-600/80 rounded-xl text-amber-200 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg cursor-pointer"
                                                    >
                                                        <ChevronLeft size={13} />
                                                        <span>🪜 지하 {gridState.currentFloor}F 복귀</span>
                                                    </button>
                                                )}
                                                {selectedTile.type === 'entrance' && (
                                                    <button
                                                        onClick={handleExitDungeon}
                                                        className="w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/80 rounded-xl text-emerald-200 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg cursor-pointer"
                                                    >
                                                        <LogOut size={13} />
                                                        <span>🚪 지상 퇴각</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* D-Pad 한 손 방향키 및 키보드 컨트롤러 */}
                                <div className="col-span-5 lg:w-full bg-slate-950/50 border border-slate-800/80 p-2 sm:p-3 rounded-xl flex flex-col items-center justify-center">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 mb-0.5 text-center">방향키 / WASD</span>
                                    <span className="text-[8px] sm:text-[9px] text-slate-500 mb-1 sm:mb-2 hidden sm:block">클릭 또는 키보드로 이동</span>
                                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-24 sm:w-36">
                                        <div />
                                        <button
                                            onClick={() => handleDPadMove(0, -1)}
                                            className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronUp size={16} className="sm:w-5 sm:h-5" />
                                        </button>
                                        <div />

                                        <button
                                            onClick={() => handleDPadMove(-1, 0)}
                                            className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
                                        </button>
                                        <div className="flex items-center justify-center text-slate-600 text-[8px] sm:text-[10px] font-bold">
                                            MOVE
                                        </div>
                                        <button
                                            onClick={() => handleDPadMove(1, 0)}
                                            className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronRight size={16} className="sm:w-5 sm:h-5" />
                                        </button>

                                        <div />
                                        <button
                                            onClick={() => handleDPadMove(0, 1)}
                                            className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronDown size={16} className="sm:w-5 sm:h-5" />
                                        </button>
                                        <div />
                                    </div>
                                </div>
                            </div>

                            {/* 하단 파티 상태 및 퇴각 버튼 */}
                            <div className="pt-2 sm:pt-4 border-t border-slate-800 space-y-1.5 sm:space-y-2.5 mt-2 sm:mt-4">
                                {/* 1. 파티 자원 바 (HP & MP를 2열 분리하여 숫자가 커져도 절대 짤리지 않음) */}
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold bg-slate-950/80 p-1.5 sm:p-2 rounded-xl border border-slate-800">
                                    <div className="flex items-center text-red-400 bg-red-950/30 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-red-900/40">
                                        <Heart size={13} className="mr-1.5 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold leading-none">체력 (HP)</span>
                                            <span className="truncate font-mono">{character.stats.hp} / {playerFinalStats.maxHp}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-blue-400 bg-blue-950/30 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-blue-900/40">
                                        <Zap size={13} className="mr-1.5 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold leading-none">마나 (MP)</span>
                                            <span className="truncate font-mono">{character.stats.mp} / {playerFinalStats.maxMp}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. 미궁 탐험 시간 & 퇴각 버튼 (모바일에서는 한 줄에 컴팩트 배치) */}
                                <div className="flex items-center gap-1.5 sm:flex-col sm:items-stretch sm:gap-2">
                                    <div className="hidden sm:flex items-center justify-between text-xs font-bold bg-slate-950/90 px-3.5 py-2 rounded-xl border border-amber-950/50 shadow-sm">
                                        <div className="flex items-center gap-1.5 text-slate-300">
                                            <Calendar size={13} className="text-slate-500 shrink-0" />
                                            <span className="text-[11px] text-slate-400 font-semibold">{character.currentDate || '1일차'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-800/60 font-mono">
                                            <Clock size={13} className="text-amber-400 shrink-0" />
                                            <span>현재 시각 {character.currentTime || '12:00'}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleExitDungeon}
                                        className="w-full py-1.5 sm:py-2.5 bg-slate-800/80 hover:bg-red-950/60 hover:border-red-800 hover:text-red-300 text-slate-400 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 cursor-pointer"
                                    >
                                        <LogOut size={13} /> 던전 탐험 중단 및 지상 퇴각
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 이벤트 / 보물 알림 모달 */}
            {eventNotice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
                        <Sparkles size={36} className="text-amber-400 mx-auto animate-bounce" />
                        <h3 className="text-lg font-bold text-white">{eventNotice.title}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{eventNotice.desc}</p>
                        {eventNotice.items && (
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                                {eventNotice.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                        <span className="text-slate-400">{it.label}</span>
                                        <span className="font-bold text-amber-400">{it.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => setEventNotice(null)}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 실종자 구출 감사 모달 */}
            {rescuedModalInfo && (
                <RescueGratitudeModal
                    rescued={rescuedModalInfo}
                    onClose={() => setRescuedModalInfo(null)}
                />
            )}
        </div>
    );
};

export default DungeonModal;
