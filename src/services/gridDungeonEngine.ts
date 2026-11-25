export type GridTileType = 'wall' | 'floor' | 'entrance' | 'stairs' | 'stairs_up' | 'boss_door';
export type GridContentType = 'enemy' | 'miniboss' | 'boss' | 'chest' | 'shrine' | 'rune_stone';
export type GridPropType =
    | 'pillar'
    | 'crate'
    | 'bones'
    | 'crystal'
    | 'carpet'
    | 'gargoyle'
    | 'prison'
    | 'bookshelf'
    | 'altar'
    | 'campfire'
    | 'spike_trap'
    | 'lever'
    | 'merchant'
    | 'rescue_survivor';
export type GridZoneType = 'fire' | 'water' | 'ice' | 'poison' | 'holy' | 'thunder';
export type GridRoomRole = 'start' | 'boss' | 'shrine' | 'rune' | 'treasure' | 'storage' | 'normal';
export type GridEnemyVariant = 'shadow' | 'wraith' | 'golem' | 'mimic';

export interface GridTile {
    x: number;
    y: number;
    type: GridTileType;
    content?: GridContentType;
    propType?: GridPropType;
    zoneType?: GridZoneType;
    roomRole?: GridRoomRole;
    enemyVariant?: GridEnemyVariant;
    hasCarpet?: boolean;
    name?: string;
    description?: string;
    isRevealed: boolean;
    isCleared?: boolean;
    isIdentified?: boolean; // 밝혀진 타일은 즉시 고유 오브젝트 이미지로 노출
    isAlerted?: boolean;    // 플레이어가 2칸 이내 접근 시 몬스터 경계(!) 상태
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
 * 절차적 미궁 방 및 광폭 복도 굴착 + 테마 룸 인테리어(석주 열주, 보급통, 유골, 마력 수정, 6종 원소 장판) 배치
 */
export const generateGridDungeonFloor = (
    nation: string,
    city: string,
    floor: number,
    isMythic: boolean,
    bossName?: string,
    options?: { torchBonus?: number; isScouted?: boolean }
): GridDungeonState => {
    const maxFloors = isMythic ? 5 : 3;
    const isFinalFloor = floor === maxFloors - 1;

    // 광활한 미궁 스케일 확장 (일반 21x21, 보스층 23x23 / 신화 25x25)
    const width = isMythic ? 25 : (isFinalFloor ? 23 : 21);
    const height = isMythic ? 25 : (isFinalFloor ? 23 : 21);

    const tiles = createEmptyGrid(width, height);

    interface Room {
        x: number;
        y: number;
        w: number;
        h: number;
        cx: number;
        cy: number;
        role: GridRoomRole;
    }

    const rooms: Room[] = [];
    // 3x3 섹터 그리드 기반으로 맵 전역에 7~9개의 큼직한 방을 고르게 배치 (절대 방 2개로 끝나지 않음!)
    const gridCols = 3;
    const gridRows = 3;
    const cellW = Math.floor((width - 2) / gridCols);
    const cellH = Math.floor((height - 2) / gridRows);

    for (let gy = 0; gy < gridRows; gy++) {
        for (let gx = 0; gx < gridCols; gx++) {
            // 중간 섹터 중 1개만 확률적으로 생략해 자연스러운 비대칭 미궁 구조 형성
            if (rooms.length >= 3 && gx === 1 && gy === 1 && !isFinalFloor && Math.random() < 0.35) {
                continue;
            }
            const isStartSector = gx === 0 && gy === 0;
            const isEndSector = gx === gridCols - 1 && gy === gridRows - 1;
            const minW = isEndSector && isFinalFloor ? 5 : 4;
            const maxW = Math.min(cellW - 1, isEndSector && isFinalFloor ? 6 : 5);
            const rw = Math.max(3, minW + Math.floor(Math.random() * Math.max(1, maxW - minW + 1)));
            const rh = Math.max(3, minW + Math.floor(Math.random() * Math.max(1, maxW - minW + 1)));

            const baseX = 1 + gx * cellW;
            const baseY = 1 + gy * cellH;
            const slackX = Math.max(0, cellW - rw - 1);
            const slackY = Math.max(0, cellH - rh - 1);
            const rx = Math.min(width - rw - 1, baseX + Math.floor(Math.random() * (slackX + 1)));
            const ry = Math.min(height - rh - 1, baseY + Math.floor(Math.random() * (slackY + 1)));

            const role: GridRoomRole = isStartSector ? 'start' : (isEndSector && isFinalFloor ? 'boss' : 'normal');
            const rm: Room = {
                x: rx,
                y: ry,
                w: rw,
                h: rh,
                cx: Math.floor(rx + rw / 2),
                cy: Math.floor(ry + rh / 2),
                role
            };
            rooms.push(rm);

            for (let y = ry; y < ry + rh; y++) {
                for (let x = rx; x < rx + rw; x++) {
                    tiles[y][x].type = 'floor';
                    tiles[y][x].roomRole = role;
                }
            }
        }
    }

    // 2. 방과 방 사이를 광폭 회랑(2칸 폭 복도 + 순환 통로)으로 시원하게 연결
    for (let i = 0; i < rooms.length - 1; i++) {
        let { cx: x1, cy: y1 } = rooms[i];
        let { cx: x2, cy: y2 } = rooms[i + 1];
        const isGrandCorridor = i % 2 === 0 || isMythic;

        while (x1 !== x2) {
            tiles[y1][x1].type = 'floor';
            if (isGrandCorridor && y1 + 1 < height - 1) {
                tiles[y1 + 1][x1].type = 'floor';
            }
            x1 += x1 < x2 ? 1 : -1;
        }
        while (y1 !== y2) {
            tiles[y1][x1].type = 'floor';
            if (isGrandCorridor && x1 + 1 < width - 1) {
                tiles[y1][x1 + 1].type = 'floor';
            }
            y1 += y1 < y2 ? 1 : -1;
        }
    }
    // 첫 방과 중간 방, 중간 방과 끝 방을 추가 연결해 갈림길 탐험 재미 부여
    if (rooms.length >= 6) {
        const extraPairs = [[0, 3], [1, 4], [2, rooms.length - 1]];
        for (const [aIdx, bIdx] of extraPairs) {
            if (!rooms[aIdx] || !rooms[bIdx]) continue;
            let { cx: x1, cy: y1 } = rooms[aIdx];
            let { cx: x2, cy: y2 } = rooms[bIdx];
            while (y1 !== y2) {
                tiles[y1][x1].type = 'floor';
                y1 += y1 < y2 ? 1 : -1;
            }
            while (x1 !== x2) {
                tiles[y1][x1].type = 'floor';
                x1 += x1 < x2 ? 1 : -1;
            }
        }
    }

    // 3. 입구(Entrance)와 계단(Stairs) 또는 보스 알현실 배치
    const startRoom = rooms[0];
    const endRoom = rooms[rooms.length - 1];
    endRoom.role = isFinalFloor ? 'boss' : 'normal';

    const playerPos = { x: startRoom.cx, y: startRoom.cy };
    if (floor === 0) {
        tiles[startRoom.cy][startRoom.cx].type = 'entrance';
        tiles[startRoom.cy][startRoom.cx].name = '1층 미궁 입구 (지상 출구)';
        tiles[startRoom.cy][startRoom.cx].description = '던전 밖 지상으로 안전하게 퇴각할 수 있는 고대 석조 아치 관문입니다.';
        tiles[startRoom.cy][startRoom.cx].isIdentified = true;
    } else {
        tiles[startRoom.cy][startRoom.cx].type = 'stairs_up';
        tiles[startRoom.cy][startRoom.cx].name = `지하 ${floor}층으로 올라가는 계단`;
        tiles[startRoom.cy][startRoom.cx].description = `이전 층(지하 ${floor}층)으로 다시 돌아갈 수 있는 횃불 오르막 계단입니다.`;
        tiles[startRoom.cy][startRoom.cx].isIdentified = true;
    }

    if (isFinalFloor) {
        tiles[endRoom.cy][endRoom.cx].type = 'boss_door';
        tiles[endRoom.cy][endRoom.cx].content = 'boss';
        tiles[endRoom.cy][endRoom.cx].roomRole = 'boss';
        tiles[endRoom.cy][endRoom.cx].name = bossName ? `[심연의 왕좌] ${bossName}` : '심연의 보스 왕좌';
        tiles[endRoom.cy][endRoom.cx].description = '거대한 고대 마법진과 석주 열주 너머에서 미궁의 지배자가 기다리는 결전 제단입니다.';
        tiles[endRoom.cy][endRoom.cx].isIdentified = true;
    } else {
        tiles[endRoom.cy][endRoom.cx].type = 'stairs';
        tiles[endRoom.cy][endRoom.cx].name = `지하 ${floor + 2}층으로 향하는 나선 계단`;
        tiles[endRoom.cy][endRoom.cx].description = '더 깊은 심연으로 이어지는 차가운 나선형 석조 계단입니다.';
        tiles[endRoom.cy][endRoom.cx].isIdentified = true;
    }

    // 4. 테마 룸 인테리어 (보스방에만 왕실 레드카펫 & 주요 대형 홀 모서리에만 석주/가고일 절제 배치)
    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
        const rm = rooms[rIdx];
        // 보스 알현실(또는 마지막 방) 중앙 세로열에만 royal_carpet 깔기 (어수선함 방지)
        if (rIdx === rooms.length - 1) {
            for (let cy = rm.y; cy < rm.y + rm.h; cy++) {
                const carpetTile = tiles[cy]?.[rm.cx];
                if (carpetTile && carpetTile.type === 'floor') {
                    carpetTile.hasCarpet = true;
                }
            }
        }
        // 시작 방(rIdx === 0)은 시야가 탁 트이도록 기둥을 두지 않고, 5x5 이상 대형 방이나 보스방 모서리에만 기둥/가고일 배치
        if (rIdx > 0 && (rm.w >= 5 || rm.h >= 5 || rIdx === rooms.length - 1)) {
            const corners = [
                { x: rm.x, y: rm.y },
                { x: rm.x + rm.w - 1, y: rm.y },
                { x: rm.x, y: rm.y + rm.h - 1 },
                { x: rm.x + rm.w - 1, y: rm.y + rm.h - 1 }
            ];
            for (let cIdx = 0; cIdx < corners.length; cIdx++) {
                const c = corners[cIdx];
                const ct = tiles[c.y]?.[c.x];
                if (
                    ct &&
                    ct.type === 'floor' &&
                    !ct.content &&
                    !(c.x === startRoom.cx && c.y === startRoom.cy) &&
                    !(c.x === endRoom.cx && c.y === endRoom.cy)
                ) {
                    const useGargoyle = (rIdx + cIdx) % 2 === 1;
                    ct.propType = useGargoyle ? 'gargoyle' : 'pillar';
                    ct.name = useGargoyle ? '가고일 수호 석상' : '고대 룬 석주';
                    ct.description = useGargoyle
                        ? '날개를 펼친 채 미궁의 침입자를 노려보는 고대 가고일 석상입니다.'
                        : '미궁 천장을 떠받치고 있는 고대 룬 문양의 거대한 돌기둥입니다.';
                    ct.isIdentified = true;
                }
            }
        }
    }

    // 5. 사용 가능한 바닥 타일 수집 + 최소 간격(Spacing >= 2칸) 보장 픽커!
    // 시작점(playerPos) 주변 반경 2칸 이내에는 어떤 오브젝트/몬스터도 배치하지 않아 첫 화면을 깔끔하게 유지합니다.
    const availableFloors: { x: number; y: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const distFromStart = Math.max(Math.abs(x - startRoom.cx), Math.abs(y - startRoom.cy));
            const distFromEnd = Math.max(Math.abs(x - endRoom.cx), Math.abs(y - endRoom.cy));
            if (
                tiles[y][x].type === 'floor' &&
                !tiles[y][x].propType &&
                !tiles[y][x].content &&
                distFromStart >= 2 &&
                distFromEnd >= 1
            ) {
                availableFloors.push({ x, y });
            }
        }
    }

    for (let i = availableFloors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableFloors[i], availableFloors[j]] = [availableFloors[j], availableFloors[i]];
    }

    const occupiedCoords: { x: number; y: number }[] = [
        { x: startRoom.cx, y: startRoom.cy },
        { x: endRoom.cx, y: endRoom.cy }
    ];

    // 다른 오브젝트와 최소 minDist(체비쇼프 거리) 이상 떨어진 타일을 우선 선택하여 다닥다닥 붙는 현상을 원천 차단!
    const pickSpacedTile = (minDist: number = 2): { x: number; y: number } | null => {
        for (let d = minDist; d >= 1; d--) {
            for (let i = availableFloors.length - 1; i >= 0; i--) {
                const cand = availableFloors[i];
                const tooClose = occupiedCoords.some(
                    occ => Math.max(Math.abs(occ.x - cand.x), Math.abs(occ.y - cand.y)) < d
                );
                if (!tooClose) {
                    availableFloors.splice(i, 1);
                    occupiedCoords.push(cand);
                    return cand;
                }
            }
        }
        return null;
    };

    // 신화 보스 던전 2~4층에는 봉인석 1개씩 배치
    if (isMythic && floor > 0 && floor < maxFloors - 1) {
        const p = pickSpacedTile(3);
        if (p) {
            tiles[p.y][p.x].content = 'rune_stone';
            tiles[p.y][p.x].roomRole = 'rune';
            tiles[p.y][p.x].name = `고대 신화 봉인석 [제${floor} 각인]`;
            tiles[p.y][p.x].description = '최종 보스 제단의 결계를 해제하기 위해 파괴해야 할 신성한 룬 오벨리스크입니다.';
            tiles[p.y][p.x].isIdentified = true;
        }
    }

    // 계단/보스 앞 정예 수호자(MiniBoss) 배치 (2마리, 서로 3칸 이상 간격)
    const miniBossCount = 2;
    for (let i = 0; i < miniBossCount; i++) {
        const p = pickSpacedTile(3);
        if (!p) break;
        const isGolem = i % 2 === 1;
        tiles[p.y][p.x].content = 'miniboss';
        tiles[p.y][p.x].enemyVariant = isGolem ? 'golem' : 'shadow';
        tiles[p.y][p.x].name = isGolem ? '고대 강철 골렘 수호병' : '심연의 정예 암흑기사';
        tiles[p.y][p.x].description = isGolem
            ? '코어가 붉게 빛나는 거대한 고대 유적 수호 골렘입니다.'
            : '심층으로 통하는 회랑을 수호하는 붉은 갑주의 정예 마물입니다.';
        tiles[p.y][p.x].isIdentified = true;
    }

    // 보물 상자 배치 (일반 2~3개, 신화 3~4개, 최소 3칸 간격)
    const chestCount = isMythic ? 3 : 2;
    for (let i = 0; i < chestCount; i++) {
        const p = pickSpacedTile(3);
        if (!p) break;
        tiles[p.y][p.x].content = 'chest';
        tiles[p.y][p.x].roomRole = 'treasure';
        tiles[p.y][p.x].name = '황금 보물 상자';
        tiles[p.y][p.x].description = '고대의 황금과 마정석이 가득 담긴 화려한 보물 궤짝입니다.';
        tiles[p.y][p.x].isIdentified = true;
        tiles[p.y][p.x].treasureData = {
            gold: (floor + 1) * 9000 + Math.floor(Math.random() * 6000),
            manaStone: 4 + floor * 2
        };
    }

    // 치유의 신성한 샘(Shrine) 배치 (매 층 1개 보장)
    {
        const p = pickSpacedTile(3);
        if (p) {
            tiles[p.y][p.x].content = 'shrine';
            tiles[p.y][p.x].zoneType = 'holy';
            tiles[p.y][p.x].roomRole = 'shrine';
            tiles[p.y][p.x].name = '치유의 신성한 샘';
            tiles[p.y][p.x].description = '마시면 파티 전체의 생명력과 마력이 60% 회복되는 영험한 성소입니다.';
            tiles[p.y][p.x].isIdentified = true;
            tiles[p.y][p.x].shrineData = {
                title: '신성한 샘의 가호',
                buffType: 'heal',
                valueDesc: '파티 전체 HP/MP 60% 회복'
            };
        }
    }

    // 일반 마물 심볼 배치 (넓은 맵에 최소 2~3칸 간격으로 여유롭게 배치)
    const enemyCount = isMythic ? 7 : 5;
    for (let i = 0; i < enemyCount; i++) {
        const p = pickSpacedTile(2);
        if (!p) break;
        const variant: GridEnemyVariant = i === 0 ? 'mimic' : (i % 2 === 1 ? 'wraith' : 'shadow');
        tiles[p.y][p.x].content = 'enemy';
        tiles[p.y][p.x].enemyVariant = variant;
        tiles[p.y][p.x].name =
            variant === 'mimic' ? '탐욕의 미믹 괴수' :
            variant === 'wraith' ? '창백한 영혼 사신' :
            '배회하는 그림자 마수';
        tiles[p.y][p.x].description =
            variant === 'mimic' ? '보물 상자로 위장하여 모험가를 덮치는 포악한 미믹입니다.' :
            variant === 'wraith' ? '푸른 영혼 불꽃을 두르고 미궁을 떠도는 사신 망령입니다.' :
            '미궁의 어둠 속을 살아 움직이며 침입자를 노리는 마물입니다.';
        tiles[p.y][p.x].isIdentified = true;
    }

    // 인터랙티브 프롭 10종을 각 방마다 1~2개씩만 여유 있는 간격(minDist=2)으로 배치
    const interactiveProps: { type: GridPropType; name: string; desc: string; count: number }[] = [
        {
            type: 'campfire',
            name: '모험가의 모닥불 야영지',
            desc: '따뜻한 화톳불과 솥단지가 놓인 휴식처입니다. 파티 전체 HP/MP를 45% 회복합니다.',
            count: 1
        },
        {
            type: 'merchant',
            name: '미궁 방랑 상인',
            desc: '미궁 심층에서 비약을 파는 신비한 상인입니다. 조우 시 무료 보급품(HP/MP 회복 및 골드 보너스)을 건넵니다.',
            count: 1
        },
        {
            type: 'bookshelf',
            name: '고대 마도서 서가',
            desc: '빛나는 비전 마도서가 꽂힌 책장입니다. 열람 시 고대 지식(경험치 및 마정석)을 획득합니다.',
            count: 1
        },
        {
            type: 'altar',
            name: '핏빛 혈석 제단',
            desc: '고대의 촛불과 황금 성배가 놓인 제단입니다. 생명력(HP -8%)을 바쳐 대량의 마정석과 골드를 얻습니다.',
            count: 1
        },
        {
            type: 'prison',
            name: '봉인된 지하 감옥 철창',
            desc: '자물쇠가 채워진 철창입니다. 철창을 개방하여 갇혀 있던 선대 탐험가의 보답품(골드·마정석)을 획득합니다.',
            count: 1
        },
        {
            type: 'lever',
            name: '고대 룬 제어 레버',
            desc: '푸른 룬이 새겨진 기계식 레버입니다. 당기면 현재 층의 모든 가시 함정이 해제되고 비밀 시야가 밝아집니다.',
            count: 1
        },
        {
            type: 'spike_trap',
            name: '기계식 강철 가시 함정',
            desc: '바닥에서 날카로운 강철 가시가 솟구치는 함정입니다. 밟으면 피해를 입지만 해체 부품을 회수합니다.',
            count: 2
        },
        {
            type: 'crate',
            name: '던전 보급품 오크통',
            desc: '밟으면 부서지며 숨겨진 골드나 회복약, 횃불 기름을 얻을 수 있는 보급통입니다.',
            count: 2
        },
        {
            type: 'bones',
            name: '쓰러진 탐험가의 유골',
            desc: '선대 모험가의 유품입니다. 조사 시 마정석을 얻고 현재 층의 숨겨진 방 시야를 밝혀줍니다.',
            count: 1
        },
        {
            type: 'crystal',
            name: '공명하는 마력 수정',
            desc: '순수한 마나가 응축된 크리스탈입니다. 접촉 시 파티 MP를 충전하고 주변 어둠을 영구히 밝힙니다.',
            count: 2
        }
    ];

    for (const spec of interactiveProps) {
        for (let i = 0; i < spec.count; i++) {
            const p = pickSpacedTile(2);
            if (!p) break;
            tiles[p.y][p.x].propType = spec.type;
            tiles[p.y][p.x].name = spec.name;
            tiles[p.y][p.x].description = spec.desc;
            tiles[p.y][p.x].isIdentified = true;
        }
    }

    // 6종 원소 지형 장판도 최소 2~3칸 간격을 두고 각기 다른 방/복도에 1개씩 총 6개만 깔끔하게 배치
    const zoneSpecs: { type: GridZoneType; name: string; desc: string }[] = [
        { type: 'fire', name: '용암 화염 지대', desc: '뜨거운 마그마가 솟구치는 지대입니다. 밟으면 약간의 화상을 입지만 투지가 불타올라 체력을 정화합니다.' },
        { type: 'water', name: '맑은 지하수 웅덩이', desc: '시원한 지하수가 고인 웅덩이입니다. 밟으면 갈증을 해소하여 파티 MP를 15% 회복합니다.' },
        { type: 'ice', name: '혹한의 서리 빙판', desc: '차갑게 얼어붙은 마법 빙판입니다. 냉기 마력을 흡수하여 마나를 회복합니다.' },
        { type: 'poison', name: '맹독 포자 늪지대', desc: '유독한 포자가 끓어오르는 늪입니다. 밟으면 독기에 체력이 소폭 깎이지만 독성 마정석 가루를 얻습니다.' },
        { type: 'holy', name: '고대 성역의 마법진', desc: '황금빛 축복이 깃든 성역 장판입니다. 밟으면 파티 전체 HP/MP를 20% 회복하고 주변 안개를 정화합니다.' },
        { type: 'thunder', name: '낙뢰 마력 균열', desc: '푸른 번개가 치는 대지 균열입니다. 밟으면 전격 에너지가 횃불에 공명하여 시야 반경이 확장됩니다.' }
    ];

    for (let i = 0; i < zoneSpecs.length; i++) {
        const p = pickSpacedTile(2);
        if (!p) break;
        const z = zoneSpecs[i];
        tiles[p.y][p.x].zoneType = z.type;
        tiles[p.y][p.x].name = z.name;
        tiles[p.y][p.x].description = z.desc;
        tiles[p.y][p.x].isIdentified = true;
    }

    // 6. 넓어진 21x21~25x25 맵에 맞춰 기본 횃불 시야 반경을 3.5 / 3.8로 시원하게 확장!
    const baseTorchRadius = isMythic ? 3.5 : 3.8;
    const finalTorchRadius = Number((baseTorchRadius + (options?.torchBonus || 0)).toFixed(1));
    revealFogOfWar(tiles, playerPos.x, playerPos.y, finalTorchRadius);
    if (options?.isScouted) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                tiles[y][x].isRevealed = true;
                tiles[y][x].isIdentified = true;
            }
        }
    }
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
        torchRadius: finalTorchRadius,
        bossDefeated: false
    };
};

/**
 * 시야 반경(Fog of War) 공개 계산
 * 혁신안 4: 시야에 들어온 모든 타일은 ?로 가리지 않고 즉시 고유 오브젝트 이미지로 노출!
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
            if (dist <= radius + 0.35) {
                const nx = px + dx;
                const ny = py + dy;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                    tiles[ny][nx].isRevealed = true;
                    tiles[ny][nx].isIdentified = true;
                }
            }
        }
    }
};

/**
 * 밝혀진 타일 전체 즉시 식별 및 플레이어 2칸 이내 몬스터 경계(!) 상태 업데이트
 */
export const updateTileIdentifications = (
    tiles: GridTile[][],
    px: number,
    py: number
): void => {
    const h = tiles.length;
    const w = tiles[0].length;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const tile = tiles[y][x];
            if (tile.isRevealed) {
                tile.isIdentified = true;
            }
            if ((tile.content === 'enemy' || tile.content === 'miniboss') && !tile.isCleared) {
                const dist = Math.max(Math.abs(x - px), Math.abs(y - py));
                tile.isAlerted = dist <= 2;
            } else {
                tile.isAlerted = false;
            }
        }
    }
};

/**
 * 혁신안 4: 플레이어 이동 시 일반 마물(enemy) 턴제 배회(Patrol) 및 경계 업데이트
 */
export const stepDungeonMonsterPatrol = (
    tiles: GridTile[][],
    playerPos: { x: number; y: number }
): void => {
    const h = tiles.length;
    const w = tiles[0]?.length || 0;
    const enemyCoords: { x: number; y: number }[] = [];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const t = tiles[y][x];
            if (t.content === 'enemy' && !t.isCleared) {
                enemyCoords.push({ x, y });
            }
        }
    }

    const dirs = [
        [0, -1], [0, 1], [-1, 0], [1, 0]
    ];

    for (const pos of enemyCoords) {
        const src = tiles[pos.y][pos.x];
        if (src.content !== 'enemy' || src.isCleared) continue;
        // 플레이어 바로 옆(1칸 이내)에 이미 붙어 있으면 자리를 지키며 경계(!) 유지
        const distToPlayer = Math.max(Math.abs(pos.x - playerPos.x), Math.abs(pos.y - playerPos.y));
        if (distToPlayer <= 1) continue;
        // 35% 확률로 인접한 빈 바닥으로 1칸 순찰 이동
        if (Math.random() > 0.35) continue;

        const shuffled = [...dirs].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of shuffled) {
            const nx = pos.x + dx;
            const ny = pos.y + dy;
            if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
            if (nx === playerPos.x && ny === playerPos.y) continue;
            const dst = tiles[ny][nx];
            if (
                dst.type === 'floor' &&
                !dst.content &&
                !dst.propType &&
                !dst.zoneType
            ) {
                dst.content = 'enemy';
                dst.isCleared = false;
                dst.name = src.name || '배회하는 그림자 마수';
                dst.description = src.description || '미궁의 어둠 속을 살아 움직이며 침입자를 노리는 마물입니다.';
                dst.isIdentified = dst.isRevealed;

                src.content = undefined;
                src.isAlerted = false;
                src.name = '미궁 복도';
                src.description = '미궁의 어두운 바닥입니다. 발걸음을 옮겨 시야를 넓힐 수 있습니다.';
                break;
            }
        }
    }

    updateTileIdentifications(tiles, playerPos.x, playerPos.y);
};

