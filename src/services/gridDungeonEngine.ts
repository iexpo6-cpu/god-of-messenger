export type GridTileType = 'wall' | 'floor' | 'entrance' | 'stairs' | 'stairs_up' | 'boss_door';
export type GridContentType = 'enemy' | 'miniboss' | 'boss' | 'chest' | 'shrine' | 'rune_stone';

export interface GridTile {
    x: number;
    y: number;
    type: GridTileType;
    content?: GridContentType;
    name?: string;
    description?: string;
    isRevealed: boolean;
    isCleared?: boolean;
    isIdentified?: boolean; // 플레이어가 근접(1칸 이내)하여 정체가 식별되었는지 여부
    // 보물 / 이벤트 데이터
    treasureData?: {
        gold: number;
        manaStone: number;
    };
    shrineData?: {
        title: string;
        buffType: 'heal' | 'manaStone' | 'exp';
        valueDesc: string;
    };
}

export interface FloorCacheData {
    tiles: GridTile[][];
    playerPos: { x: number; y: number };
    width: number;
    height: number;
}

export interface GridDungeonState {
    dungeonType: 'normal' | 'mythic';
    nation: string;
    city: string;
    currentFloor: number;
    maxFloors: number;
    width: number;
    height: number;
    playerPos: { x: number; y: number };
    tiles: GridTile[][];
    activeRunesCount: number;
    totalRunesRequired: number;
    torchRadius: number;
    bossDefeated?: boolean;
    floorCache?: Record<number, FloorCacheData>;
}

/**
 * 2D 맵 초기화 (모든 타일을 벽으로 채움)
 */
const createEmptyGrid = (width: number, height: number): GridTile[][] => {
    const grid: GridTile[][] = [];
    for (let y = 0; y < height; y++) {
        const row: GridTile[] = [];
        for (let x = 0; x < width; x++) {
            row.push({
                x,
                y,
                type: 'wall',
                isRevealed: false
            });
        }
        grid.push(row);
    }
    return grid;
};

/**
 * 절차적 미궁 방 및 복도 굴착 (BSP / Random Walk 혼합)
 */
export const generateGridDungeonFloor = (
    nation: string,
    city: string,
    floor: number,
    isMythic: boolean,
    bossName?: string
): GridDungeonState => {
    const maxFloors = isMythic ? 5 : 3;
    const isFinalFloor = floor === maxFloors - 1;

    // 크기 결정: 신화 보스는 16x16, 일반 던전은 9x9 (보스 룸은 11x11)
    const width = isMythic ? (isFinalFloor ? 13 : 16) : (isFinalFloor ? 9 : 9);
    const height = isMythic ? (isFinalFloor ? 13 : 16) : (isFinalFloor ? 9 : 9);

    const tiles = createEmptyGrid(width, height);

    // 1. 방 리스트 생성
    interface Room {
        x: number;
        y: number;
        w: number;
        h: number;
        cx: number;
        cy: number;
    }

    const rooms: Room[] = [];
    const minRoomSize = 3;
    const maxRoomSize = isMythic ? 5 : 4;
    const targetRoomCount = isFinalFloor ? (isMythic ? 3 : 2) : (isMythic ? 8 : 4);

    for (let attempts = 0; attempts < 60 && rooms.length < targetRoomCount; attempts++) {
        const rw = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
        const rh = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
        const rx = 1 + Math.floor(Math.random() * (width - rw - 2));
        const ry = 1 + Math.floor(Math.random() * (height - rh - 2));

        // 겹침 검사
        let overlap = false;
        for (const r of rooms) {
            if (
                rx <= r.x + r.w + 1 &&
                rx + rw + 1 >= r.x &&
                ry <= r.y + r.h + 1 &&
                ry + rh + 1 >= r.y
            ) {
                overlap = true;
                break;
            }
        }

        if (!overlap) {
            rooms.push({
                x: rx,
                y: ry,
                w: rw,
                h: rh,
                cx: Math.floor(rx + rw / 2),
                cy: Math.floor(ry + rh / 2)
            });

            // 방 영역 바닥으로 굴착
            for (let y = ry; y < ry + rh; y++) {
                for (let x = rx; x < rx + rw; x++) {
                    tiles[y][x].type = 'floor';
                }
            }
        }
    }

    // 만약 방이 2개 미만으로 뚫렸다면 비상 중앙 방 생성
    if (rooms.length < 2) {
        const cx1 = 2, cy1 = 2;
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 3; x++) tiles[y][x].type = 'floor';
        }
        rooms.push({ x: 1, y: 1, w: 3, h: 3, cx: cx1, cy: cy1 });

        const cx2 = width - 3, cy2 = height - 3;
        for (let y = height - 4; y <= height - 2; y++) {
            for (let x = width - 4; x <= width - 2; x++) tiles[y][x].type = 'floor';
        }
        rooms.push({ x: width - 4, y: height - 4, w: 3, h: 3, cx: cx2, cy: cy2 });
    }

    // 2. 방과 방 사이를 복도(Corridor)로 연결
    for (let i = 0; i < rooms.length - 1; i++) {
        let { cx: x1, cy: y1 } = rooms[i];
        let { cx: x2, cy: y2 } = rooms[i + 1];

        // 가로 먼저, 세로 나중
        while (x1 !== x2) {
            tiles[y1][x1].type = 'floor';
            x1 += x1 < x2 ? 1 : -1;
        }
        while (y1 !== y2) {
            tiles[y1][x1].type = 'floor';
            y1 += y1 < y2 ? 1 : -1;
        }
    }

    // 3. 입구(Entrance)와 계단(Stairs) 또는 보스 룸 배치
    const startRoom = rooms[0];
    const endRoom = rooms[rooms.length - 1];

    const playerPos = { x: startRoom.cx, y: startRoom.cy };
    if (floor === 0) {
        tiles[startRoom.cy][startRoom.cx].type = 'entrance';
        tiles[startRoom.cy][startRoom.cx].name = '1층 미궁 입구 (지상 출구)';
        tiles[startRoom.cy][startRoom.cx].description = '던전 밖 지상으로 안전하게 퇴각할 수 있는 관문입니다.';
        tiles[startRoom.cy][startRoom.cx].isIdentified = true;
    } else {
        tiles[startRoom.cy][startRoom.cx].type = 'stairs_up';
        tiles[startRoom.cy][startRoom.cx].name = `지하 ${floor}층으로 올라가는 계단`;
        tiles[startRoom.cy][startRoom.cx].description = `이전 층(지하 ${floor}층)으로 다시 돌아갈 수 있는 오르막 석조 계단입니다.`;
        tiles[startRoom.cy][startRoom.cx].isIdentified = true;
    }

    if (isFinalFloor) {
        // 최종 보스 룸
        tiles[endRoom.cy][endRoom.cx].type = 'boss_door';
        tiles[endRoom.cy][endRoom.cx].content = 'boss';
        tiles[endRoom.cy][endRoom.cx].name = bossName ? `[심연의 제단] ${bossName}` : '심연의 보스 제단';
        tiles[endRoom.cy][endRoom.cx].description = '던전을 지배하는 최강의 존재가 기다리는 심연의 결전 구역입니다.';
        tiles[endRoom.cy][endRoom.cx].isIdentified = false;
    } else {
        // 다음 층 계단
        tiles[endRoom.cy][endRoom.cx].type = 'stairs';
        tiles[endRoom.cy][endRoom.cx].name = `지하 ${floor + 2}층으로 향하는 계단`;
        tiles[endRoom.cy][endRoom.cx].description = '더 깊은 지하 미궁으로 이어지는 차가운 석조 계단입니다.';
        tiles[endRoom.cy][endRoom.cx].isIdentified = true;
    }

    // 4. 오브젝트 및 몬스터 심볼 분배
    // 사용 가능한 바닥 타일 수집 (입구, 출구 제외)
    const availableFloors: { x: number; y: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (
                tiles[y][x].type === 'floor' &&
                !(x === startRoom.cx && y === startRoom.cy) &&
                !(x === endRoom.cx && y === endRoom.cy)
            ) {
                availableFloors.push({ x, y });
            }
        }
    }

    // 셔플 유틸
    for (let i = availableFloors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableFloors[i], availableFloors[j]] = [availableFloors[j], availableFloors[i]];
    }

    let runeCount = 0;
    // 신화 보스 던전 2~4층에는 봉인석 1개씩 배치
    if (isMythic && floor > 0 && floor < maxFloors - 1 && availableFloors.length > 0) {
        const p = availableFloors.pop()!;
        tiles[p.y][p.x].content = 'rune_stone';
        tiles[p.y][p.x].name = `고대 신화 봉인석 [제${floor} 각인]`;
        tiles[p.y][p.x].description = '최종 보스 제단의 결계를 해제하기 위해 파괴해야 할 신성한 룬석입니다.';
        tiles[p.y][p.x].isIdentified = false;
        runeCount = 1;
    }

    // 계단/보스 앞 수호자(MiniBoss) 배치
    if (!isFinalFloor && availableFloors.length > 0) {
        // endRoom 중심 근처에 미니보스 1마리
        const p = availableFloors.pop()!;
        tiles[p.y][p.x].content = 'miniboss';
        tiles[p.y][p.x].name = '미궁 정예 수호수';
        tiles[p.y][p.x].description = '하층으로 통하는 관문을 수호하는 강력한 정예 마물입니다.';
        tiles[p.y][p.x].isIdentified = false;
    }

    // 보물 상자 배치 (일반 1~2개, 신화 2~4개)
    const chestCount = isMythic ? (2 + Math.floor(Math.random() * 2)) : (1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < chestCount && availableFloors.length > 0; i++) {
        const p = availableFloors.pop()!;
        tiles[p.y][p.x].content = 'chest';
        tiles[p.y][p.x].name = '잊혀진 보물 상자';
        tiles[p.y][p.x].description = '고대의 황금과 마정석이 보관되어 있는 보물 궤짝입니다.';
        tiles[p.y][p.x].isIdentified = false;
        tiles[p.y][p.x].treasureData = {
            gold: (floor + 1) * 8000 + Math.floor(Math.random() * 5000),
            manaStone: 3 + floor * 2
        };
    }

    // 성소 / 성스러운 샘 배치
    if (Math.random() < 0.75 && availableFloors.length > 0) {
        const p = availableFloors.pop()!;
        tiles[p.y][p.x].content = 'shrine';
        tiles[p.y][p.x].name = '치유의 신성한 샘';
        tiles[p.y][p.x].description = '마시면 파티 전체의 생명력과 마력이 회복되는 영험한 샘물입니다.';
        tiles[p.y][p.x].isIdentified = false;
        tiles[p.y][p.x].shrineData = {
            title: '신성한 샘의 가호',
            buffType: 'heal',
            valueDesc: '파티 전체 HP/MP 60% 회복'
        };
    }

    // 일반 마물 심볼 배치 (일반 2~4마리, 신화 5~8마리)
    const enemyCount = isMythic ? (4 + Math.floor(Math.random() * 4)) : (2 + Math.floor(Math.random() * 2));
    for (let i = 0; i < enemyCount && availableFloors.length > 0; i++) {
        const p = availableFloors.pop()!;
        tiles[p.y][p.x].content = 'enemy';
        tiles[p.y][p.x].name = '배회하는 던전 마물';
        tiles[p.y][p.x].description = '미궁의 어둠 속을 서성이며 침입자를 감시하는 마수입니다.';
        tiles[p.y][p.x].isIdentified = false;
    }

    // 5. 플레이어 초기 시야 밝히기 (반경 1.5)
    revealFogOfWar(tiles, playerPos.x, playerPos.y, 1.5);
    updateTileIdentifications(tiles, playerPos.x, playerPos.y);

    return {
        dungeonType: isMythic ? 'mythic' : 'normal',
        nation,
        city,
        currentFloor: floor,
        maxFloors,
        width,
        height,
        playerPos,
        tiles,
        activeRunesCount: 0,
        totalRunesRequired: isMythic ? 3 : 0,
        torchRadius: isMythic ? 1.5 : 1.8,
        bossDefeated: false
    };
};

/**
 * 시야 반경(Fog of War) 공개 계산
 */
export const revealFogOfWar = (
    tiles: GridTile[][],
    px: number,
    py: number,
    radius: number
): void => {
    const rCeil = Math.ceil(radius);
    const h = tiles.length;
    const w = tiles[0].length;

    for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dx = -rCeil; dx <= rCeil; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius + 0.2) {
                const nx = px + dx;
                const ny = py + dy;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                    tiles[ny][nx].isRevealed = true;
                }
            }
        }
    }
};

/**
 * 플레이어 위치 인접(1칸 이내 8방향 및 제자리) 타일 식별 갱신
 * 플레이어에게 1칸 이내로 접근한 타일은 무엇인지 식별됨
 */
export const updateTileIdentifications = (
    tiles: GridTile[][],
    px: number,
    py: number
): void => {
    const h = tiles.length;
    const w = tiles[0].length;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                const tile = tiles[ny][nx];
                if (tile.isRevealed) {
                    tile.isIdentified = true;
                }
            }
        }
    }
};
