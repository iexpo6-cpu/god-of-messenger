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
import { 
    GridDungeonState, 
    GridTile, 
    generateGridDungeonFloor, 
    revealFogOfWar,
    updateTileIdentifications,
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
        if (character.dungeonProgress?.gridDungeon) {
            const saved = character.dungeonProgress.gridDungeon as GridDungeonState;
            setGridState(saved);
            const playerTile = saved.tiles[saved.playerPos.y]?.[saved.playerPos.x] || null;
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
            const newDungeon = generateGridDungeonFloor(nation, currentCity, targetFloor, isSeasonalBoss, bossInfo?.name);
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
        // 근접(1칸) 타일 이벤트 식별
        updateTileIdentifications(newTiles, targetX, targetY);

        const newPos = { x: targetX, y: targetY };
        const updatedGrid: GridDungeonState = {
            ...gridState,
            playerPos: newPos,
            tiles: newTiles
        };

        // 타일 이벤트/오브젝트 처리
        processTileContent(updatedGrid, targetTile, activeChar);
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
            // 시즌 보스 룬석 요구조건 검사
            if (currentGrid.totalRunesRequired > 0 && currentGrid.activeRunesCount < currentGrid.totalRunesRequired) {
                setEventNotice({
                    title: '봉인된 심연의 결계',
                    desc: `강력한 고대 결계가 보스 제단을 막고 있습니다! (활성화된 룬석: ${currentGrid.activeRunesCount} / ${currentGrid.totalRunesRequired})`
                });
                setGridState(currentGrid);
                setSelectedTile(targetTile);
                return;
            }

            // 보스 전투 시작
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
            targetTile.content = undefined;
            targetTile.treasureData = undefined;
            targetTile.name = '미궁 복도';
            targetTile.description = '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.';

            const newChar = { ...activeChar };
            newChar.money = (newChar.money || 0) + gold;
            if (newChar.base?.resources) {
                newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + manaStone;
            }

            setEventNotice({
                title: '비밀 보물 상자 개봉!',
                desc: '미궁 구석에 숨겨져 있던 고대 보물 상자를 열었습니다.',
                items: [
                    { label: '골드 획득', value: `+${gold.toLocaleString()} G` },
                    { label: '마정석 획득', value: `+${manaStone} 개` }
                ]
            });

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, `[미궁 보물] 보물 상자를 열어 ${gold.toLocaleString()}G와 마정석 ${manaStone}개를 획득했습니다.`);
            return;
        }

        // 5. 성스러운 샘 (Shrine)
        if (targetTile.content === 'shrine' && !targetTile.isCleared) {
            targetTile.isCleared = true;
            targetTile.content = undefined;
            targetTile.shrineData = undefined;
            targetTile.name = '미궁 복도';
            targetTile.description = '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.';

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

            setEventNotice({
                title: '치유의 신성한 샘',
                desc: '영험한 샘물을 마셔 파티 전원의 생명력과 마력이 60% 회복되었습니다.',
                items: [{ label: 'HP/MP 회복', value: '+60%' }]
            });

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, newChar, '[미궁 성소] 신성한 샘물을 마셔 파티의 기력을 대폭 회복했습니다.');
            return;
        }

        // 6. 봉인의 룬석 (Rune Stone - 시즌 보스 전용)
        if (targetTile.content === 'rune_stone' && !targetTile.isCleared) {
            targetTile.isCleared = true;
            targetTile.content = undefined;
            targetTile.name = '미궁 복도';
            targetTile.description = '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.';
            currentGrid.activeRunesCount += 1;
            const runes = currentGrid.activeRunesCount;
            const total = currentGrid.totalRunesRequired;

            setEventNotice({
                title: '신화의 봉인석 해제!',
                desc: `고대의 룬 각인을 파괴하여 심연 결계의 힘을 약화시켰습니다! (해제된 각인: ${runes} / ${total})`
            });

            const nextGrid = updatedGridState(currentGrid);
            setGridState(nextGrid);
            setSelectedTile({ ...targetTile });
            syncGridToCharacter(nextGrid, activeChar, `[봉인 해제] 고대 신화 결계의 봉인석을 해제했습니다 (${runes}/${total})`);
            return;
        }

        // 7. 하층 계단 도달 (Stairs)
        if (targetTile.type === 'stairs') {
            changeDungeonFloor(currentFloor + 1);
            return;
        }

        // 8. 상층 계단 도달 (Stairs Up)
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

    if (!isOpen) return null;

    const playerFinalStats = useMemo(() => {
        return calculateFinalStats(character).finalStats;
    }, [character.stats, character.level, character.equippedItems, character.title]);

    const city = character.currentLocation?.city || "알 수 없는 도시";
    const isAlreadyClearedToday = character.clearedDungeonsByCity && character.clearedDungeonsByCity[city] === character.currentDate;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl flex flex-col max-h-[96vh] shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-400">
                            {isSeasonalBoss ? <Crown size={24} className="animate-pulse" /> : <Map size={24} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                                    {city} {isSeasonalBoss ? '시즌 신화 대미궁' : '지하 미궁'}
                                </h2>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isSeasonalBoss ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' : 'bg-slate-800 text-slate-300'}`}>
                                    {gridState ? `지하 ${gridState.currentFloor + 1}F / ${gridState.maxFloors}F` : '지하 미궁'}
                                </span>
                                {gridState && gridState.currentFloor > 0 && (
                                    <button
                                        onClick={() => changeDungeonFloor(gridState.currentFloor - 1)}
                                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                                        title="이전 층으로 이동"
                                    >
                                        <span>⬆️ 지하 {gridState.currentFloor}F로 복귀</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isSeasonalBoss ? `[신화 보스: ${bossInfo?.name || '신화적 존재'}] 광활한 5층 심연 미궁` : `[던전 보스: ${bossInfo?.name || '미궁 군주'}] 격자 타일 탐색`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
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
                        {/* 좌측: 격자 캔버스 뷰 */}
                        <div className="flex-1 bg-slate-950/80 p-3 sm:p-5 flex flex-col items-center justify-center overflow-auto border-b lg:border-b-0 lg:border-r border-slate-800">
                            {/* 미궁 상단 상태 바 */}
                            <div className="w-full flex justify-between items-center mb-3 px-2 text-xs font-bold text-slate-400">
                                <span className="flex items-center gap-1.5 text-amber-400">
                                    <Flame size={14} /> 횃불 시야 반경: {gridState.torchRadius}칸
                                </span>
                                {gridState.totalRunesRequired > 0 && (
                                    <span className="flex items-center gap-1.5 text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/60">
                                        <Lock size={12} /> 결계 해제 봉인석: {gridState.activeRunesCount} / {gridState.totalRunesRequired}
                                    </span>
                                )}
                            </div>

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
                                                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-slate-900/95 rounded-md border border-slate-800/60 flex items-center justify-center text-slate-700 select-none shadow-sm"
                                                >
                                                    <span className="text-[10px] opacity-40">■</span>
                                                </div>
                                            );
                                        }

                                        // 3. 이동 가능한 바닥 타일
                                        return (
                                            <button
                                                key={`${x}-${y}`}
                                                onClick={() => handleMoveToTile(x, y)}
                                                className={`
                                                    w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center transition-all relative
                                                    ${isPlayer 
                                                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/40 z-10 scale-105' 
                                                        : isSelected
                                                            ? 'border-2 border-cyan-400 bg-cyan-950/40 z-10'
                                                            : isAdjacent
                                                                ? 'bg-slate-800/80 hover:bg-slate-700 border border-slate-600/70 hover:border-slate-400 cursor-pointer'
                                                                : 'bg-slate-800/40 border border-slate-700/40'}
                                                `}
                                            >
                                                {/* 플레이어 심볼 */}
                                                {isPlayer ? (
                                                    <span className="text-base sm:text-lg animate-bounce select-none">🧙</span>
                                                ) : tile.type === 'stairs' ? (
                                                    <span className="text-cyan-300 text-xs sm:text-sm font-black select-none" title="하층 계단">🪜⬇️</span>
                                                ) : tile.type === 'stairs_up' ? (
                                                    <span className="text-amber-300 text-xs sm:text-sm font-black select-none" title="상층 계단">🪜⬆️</span>
                                                ) : tile.type === 'entrance' ? (
                                                    <span className="text-emerald-400 text-xs sm:text-sm font-bold select-none" title="1층 출구">🚪</span>
                                                ) : tile.content && !tile.isCleared && !tile.isIdentified ? (
                                                    <HelpCircle size={16} className="text-amber-400 animate-pulse drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" title="미지의 반응" />
                                                ) : tile.content === 'boss' && !tile.isCleared ? (
                                                    <Crown size={18} className="text-amber-400 animate-pulse" />
                                                ) : tile.content === 'miniboss' && !tile.isCleared ? (
                                                    <Skull size={16} className="text-rose-400" />
                                                ) : tile.content === 'enemy' && !tile.isCleared ? (
                                                    <Sword size={14} className="text-red-400" />
                                                ) : tile.content === 'chest' && !tile.isCleared ? (
                                                    <Gift size={15} className="text-yellow-400 animate-bounce" />
                                                ) : tile.content === 'shrine' && !tile.isCleared ? (
                                                    <Sparkles size={15} className="text-cyan-300" />
                                                ) : tile.content === 'rune_stone' && !tile.isCleared ? (
                                                    <Lock size={15} className="text-purple-400 animate-pulse" />
                                                ) : (
                                                    <div className="w-1 h-1 bg-slate-600 rounded-full opacity-40" />
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* 가이드 안내 문구 */}
                            <p className="text-[11px] text-slate-500 mt-3 text-center">
                                * 인접한 밝혀진 타일을 탭하거나 하단 방향키를 눌러 1칸씩 미궁을 개척하세요. (미지의 ? 기척은 1칸 이내로 접근 시 식별됩니다)
                            </p>
                        </div>

                        {/* 우측: 탐험 상태 & 정보 패널 */}
                        <div className="w-full lg:w-80 p-4 sm:p-5 flex flex-col justify-between bg-slate-900 overflow-y-auto">
                            <div className="space-y-4">
                                {/* 현재 위치 타일 정보 카드 */}
                                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        CURRENT TILE FOCUS
                                    </span>
                                    {selectedTile?.content && !selectedTile.isCleared && !selectedTile.isIdentified ? (
                                        <>
                                            <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                                                <HelpCircle size={18} className="animate-pulse text-amber-400" /> 미지의 기척 (식별 필요)
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                                어둠 속에서 정체를 알 수 없는 기척이 느껴집니다. 1칸 더 가까이 다가가면 무엇인지 식별할 수 있습니다.
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-900">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                                                    미식별 이벤트 (?)
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                                    좌표: ({selectedTile.x}, {selectedTile.y})
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                {selectedTile?.name || (selectedTile?.type === 'wall' ? '단단한 석벽' : '미궁 복도')}
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                                {selectedTile?.description || '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.'}
                                            </p>

                                            {/* 타일 상태 태그 */}
                                            {selectedTile && (
                                                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-900">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                                        좌표: ({selectedTile.x}, {selectedTile.y})
                                                    </span>
                                                    {selectedTile.isCleared && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-900">
                                                            소탕/해제 완료
                                                        </span>
                                                    )}
                                                    {selectedTile.content && !selectedTile.isCleared && selectedTile.isIdentified && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                                            식별 완료
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 계단 및 입구 인터랙션 액션 버튼 */}
                                    {selectedTile && gridState && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-900/80">
                                            {selectedTile.type === 'stairs' && (
                                                <button
                                                    onClick={() => changeDungeonFloor(gridState.currentFloor + 1)}
                                                    className="w-full py-2 px-3 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-600/80 rounded-xl text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                                                >
                                                    <span>🪜 지하 {gridState.currentFloor + 2}층으로 내려가기</span>
                                                    <ChevronRight size={14} />
                                                </button>
                                            )}
                                            {selectedTile.type === 'stairs_up' && (
                                                <button
                                                    onClick={() => changeDungeonFloor(gridState.currentFloor - 1)}
                                                    className="w-full py-2 px-3 bg-amber-900/60 hover:bg-amber-800 border border-amber-600/80 rounded-xl text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                                                >
                                                    <ChevronLeft size={14} />
                                                    <span>🪜 이전 층 (지하 {gridState.currentFloor}층)으로 올라가기</span>
                                                </button>
                                            )}
                                            {selectedTile.type === 'entrance' && (
                                                <button
                                                    onClick={handleExitDungeon}
                                                    className="w-full py-2 px-3 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/80 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                                                >
                                                    <LogOut size={14} />
                                                    <span>🚪 지상으로 던전 퇴각</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* D-Pad 한 손 방향키 및 키보드 컨트롤러 */}
                                <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-amber-400 mb-0.5">방향키(↑↓←→) / WASD 지원</span>
                                    <span className="text-[9px] text-slate-500 mb-2">클릭 또는 키보드로 이동</span>
                                    <div className="grid grid-cols-3 gap-1.5 w-36">
                                        <div />
                                        <button
                                            onClick={() => handleDPadMove(0, -1)}
                                            className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronUp size={20} />
                                        </button>
                                        <div />

                                        <button
                                            onClick={() => handleDPadMove(-1, 0)}
                                            className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="flex items-center justify-center text-slate-600 text-[10px] font-bold">
                                            MOVE
                                        </div>
                                        <button
                                            onClick={() => handleDPadMove(1, 0)}
                                            className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronRight size={20} />
                                        </button>

                                        <div />
                                        <button
                                            onClick={() => handleDPadMove(0, 1)}
                                            className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white flex items-center justify-center font-bold"
                                        >
                                            <ChevronDown size={20} />
                                        </button>
                                        <div />
                                    </div>
                                </div>
                            </div>

                            {/* 하단 파티 상태 및 퇴각 버튼 */}
                            <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-300 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
                                    <span className="flex items-center text-red-400">
                                        <Heart size={14} className="mr-1" /> {character.stats.hp}/{playerFinalStats.maxHp}
                                    </span>
                                    <span className="flex items-center text-blue-400">
                                        <Zap size={14} className="mr-1" /> {character.stats.mp}/{playerFinalStats.maxMp}
                                    </span>
                                    <span className="flex items-center text-slate-400">
                                        <Clock size={14} className="mr-1 text-amber-400" /> {character.currentTime || '12:00'}
                                    </span>
                                </div>

                                <button
                                    onClick={handleExitDungeon}
                                    className="w-full py-2.5 bg-slate-800/80 hover:bg-red-950/60 hover:border-red-800 hover:text-red-300 text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60"
                                >
                                    <LogOut size={14} /> 던전 탐험 중단 및 지상 퇴각
                                </button>
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
