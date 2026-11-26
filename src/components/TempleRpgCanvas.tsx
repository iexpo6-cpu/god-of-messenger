import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, Enemy, JobType, TemplePersonnel } from '../types';
import { drawCanvasNightOverlay } from '../utils/canvasNightOverlay';
import { TEMPLE_MESSENGER_MAP, MAGYE_LEADERS } from '../constants';
import { DIVINE_REALM_BOSSES, getBossByLocation } from '../bossMonsters';
import { BASE_TILE_SIZE, resolveDecorationSpriteUrl } from '../services/baseTilemapEngine';
import {
    BuildingSpriteKind,
    CityCultureKey,
    getBuildingSpriteUrl,
    getCachedCityAssetImage,
    getCultureAssetUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    resolveCityCultureKey,
    TerrainTilePart
} from '../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import { calculateTempleMajesty } from '../templedefensesystem';
import TempleManagementModal, { TempleTab } from './TempleManagementModal';
import TempleReceptionModal from './TempleReceptionModal';
import DivineAwakeningModal from './DivineAwakeningModal';
import {
    Compass,
    Crown,
    DoorOpen,
    Lock,
    MessageSquare,
    Sparkles,
    X
} from 'lucide-react';

const COLS = 140;
const ROWS = 110;
const TILE = BASE_TILE_SIZE; // 48px -> 6720 x 5280 px

const MESSENGER_JOBS = new Set<JobType>([
    JobType.SOLAR_MESSENGER,
    JobType.MOONLIGHT_MESSENGER,
    JobType.FIRE_MESSENGER,
    JobType.SEA_MESSENGER,
    JobType.ICE_MESSENGER,
    JobType.ELECTRIC_MESSENGER,
    JobType.GALE_MESSENGER,
    JobType.EARTH_MESSENGER,
    JobType.VOID_MESSENGER,
    JobType.RADIANT_MESSENGER,
    JobType.STEEL_MESSENGER,
    JobType.DARK_MESSENGER,
    JobType.NATURE_MESSENGER
]);

type TempleActionKind =
    | { kind: 'temple_tab'; tab: TempleTab; fullManagement?: boolean }
    | { kind: 'awakening' };

interface TempleBuilding {
    id: string;
    name: string;
    subtitle: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    doorTx: number;
    doorTy: number;
    accent: string;
    iconLabel: string;
    spriteKind: BuildingSpriteKind;
    action: TempleActionKind;
    extraActions?: { label: string; action: TempleActionKind }[];
}

interface TempleDeco {
    tx: number;
    ty: number;
    pack: string;
    part: string;
    scale?: number;
}

interface TempleNpc {
    id: string;
    name: string;
    role: string;
    tx: number;
    ty: number;
    homeTx: number;
    homeTy: number;
    dir: SpriteDirection;
    gender: RpgSpriteGenderKey;
    spriteUrl: string;
    monsterVisualUrl?: string;
    bubbleTone?: 'praise' | 'hostile' | 'neutral';
    patrolRadius: number;
    reverenceLine: string;
    dialogue: string;
    action?: TempleActionKind;
    isGuardian?: boolean;
}

interface TempleRpgCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string, targetCity?: string, targetNation?: string) => void;
}

const ELEMENTAL_TEMPLE_NPC_NAMES: Record<
    string,
    { priest: string; steward: string; envoy: string; smith: string; researcher: string; acolytes: [string, string] }
> = {
    shingye_sun: { priest: '태양 대사제 헬리오스', steward: '여명 시종장 아우로라', envoy: '태양 외교관 솔라리스', smith: '홍염 대장장이 이그니스', researcher: '일광 연구관 라온', acolytes: ['여명의 성녀', '태양의 시녀'] },
    shingye_moon: { priest: '월광 대사제 녹티스', steward: '은월 시종장 셀레네', envoy: '월영 외교관 루나', smith: '성월 대장장이 아르테', researcher: '초승 연구관 미라', acolytes: ['은월의 성녀', '별빛의 시녀'] },
    shingye_flame: { priest: '화염 대사제 이프리트', steward: '작열 시종장 플라메아', envoy: '불꽃 외교관 피닉스', smith: '용광 대장장이 볼칸', researcher: '열화 연구관 블레이즈', acolytes: ['성화의 성녀', '불꽃의 시녀'] },
    shingye_ocean: { priest: '해수 대사제 포세이아', steward: '파도 시종장 네레이드', envoy: '심해 외교관 마린', smith: '산호 대장장이 트리톤', researcher: '유수 연구관 아쿠아', acolytes: ['해류의 성녀', '물결의 시녀'] },
    shingye_ice: { priest: '빙결 대사제 보레아', steward: '설원 시종장 글라시아', envoy: '서리 외교관 프로스트', smith: '빙정 대장장이 크리오', researcher: '만년설 연구관 스노우', acolytes: ['빙설의 성녀', '서리의 시녀'] },
    shingye_thunder: { priest: '전격 대사제 라이진', steward: '뇌광 시종장 에레나', envoy: '섬광 외교관 볼트', smith: '천둥 대장장이 토르', researcher: '자전 연구관 아크', acolytes: ['뇌명의 성녀', '전광의 시녀'] },
    shingye_wind: { priest: '질풍 대사제 제피르', steward: '미풍 시종장 실피아', envoy: '창공 외교관 아네모', smith: '돌풍 대장장이 가일', researcher: '기류 연구관 스카이', acolytes: ['산들 성녀', '질풍의 시녀'] },
    shingye_earth: { priest: '지령 대사제 테라', steward: '대지 시종장 가이아', envoy: '암반 외교관 그란', smith: '거석 대장장이 아틀라스', researcher: '지맥 연구관 페트라', acolytes: ['대지의 성녀', '옥토의 시녀'] },
    shingye_steel: { priest: '강철 대사제 페룸', steward: '백금 시종장 크롬', envoy: '철벽 외교관 아이기스', smith: '신철 대장장이 헤파이스', researcher: '합금 연구관 티탄', acolytes: ['강철의 성녀', '백금의 시녀'] },
    shingye_flora: { priest: '초화 대사제 실바', steward: '신록 시종장 플로라', envoy: '화원 외교관 드라이아드', smith: '목령 대장장이 로즈', researcher: '생명 연구관 블룸', acolytes: ['화원의 성녀', '신록의 시녀'] },
    shingye_light: { priest: '광휘 대사제 세라핌', steward: '성광 시종장 루미에', envoy: '천광 외교관 아우리엘', smith: '광명 대장장이 루멘', researcher: '섬광 연구관 글로리', acolytes: ['찬양의 성녀', '빛의 시녀'] },
    shingye_abyss: { priest: '암연 대사제 에레보스', steward: '칠흑 시종장 닉스', envoy: '심연 외교관 움브라', smith: '흑요 대장장이 카론', researcher: '암영 연구관 셰도우', acolytes: ['암연의 성녀', '그림자 시녀'] },
    shingye_void: { priest: '무의 대사제 니힐', steward: '공허 시종장 아스트라', envoy: '허무 외교관 보이드', smith: '무형 대장장이 제로', researcher: '성운 연구관 에테르', acolytes: ['공허의 성녀', '별무리의 시녀'] },
    default: { priest: '대사제 세라핌', steward: '접견 시종장 루미에', envoy: '신계 외교관 아우리엘', smith: '성물 대장장이 볼칸', researcher: '신력 연구관 에테르', acolytes: ['찬양의 성녀', '빛의 시녀'] }
};

const ELLA_SANCTUM_BUILDINGS: TempleBuilding[] = [
    {
        id: 'ella_awakening_altar',
        name: '절대 신 각성의 제단',
        subtitle: '절대 신 엘라의 성소 · 신의 사자 각성',
        tx: 65,
        ty: 27,
        w: 10,
        h: 7,
        doorTx: 70,
        doorTy: 35,
        accent: '#fde047',
        iconLabel: '✨',
        spriteKind: 'landmark',
        action: { kind: 'awakening' }
    }
];

const TEMPLE_BUILDINGS: TempleBuilding[] = [
    {
        id: 'grand_altar',
        name: '대신전 본전 · 신탁의 제단',
        subtitle: '신탁 선포 / 신력 권능 / 잠재력 해방 / 신의 권능',
        tx: 65,
        ty: 27,
        w: 10,
        h: 7,
        doorTx: 70,
        doorTy: 35,
        accent: '#fbbf24',
        iconLabel: '🏛️',
        spriteKind: 'landmark',
        action: { kind: 'temple_tab', tab: 'oracle' },
        extraActions: [
            { label: '신탁 선포', action: { kind: 'temple_tab', tab: 'oracle' } },
            { label: '신력 권능 축복', action: { kind: 'temple_tab', tab: 'divine_power' } },
            { label: '잠재력 해방', action: { kind: 'temple_tab', tab: 'potential_liberation' } },
            { label: '신의 권능', action: { kind: 'temple_tab', tab: 'god_power' } }
        ]
    },
    {
        id: 'guardian_sanctum',
        name: '수호수 성소',
        subtitle: '수호수 훈련 · 교감 · 강화',
        tx: 28,
        ty: 31,
        w: 8,
        h: 6,
        doorTx: 32,
        doorTy: 38,
        accent: '#34d399',
        iconLabel: '🦁',
        spriteKind: 'special_dungeon',
        action: { kind: 'temple_tab', tab: 'guardian' }
    },
    {
        id: 'knight_barracks',
        name: '성전 기사단 병영 · 집무실',
        subtitle: '기사단/집사/메이드 임명 · 신전 시설 증축',
        tx: 104,
        ty: 31,
        w: 8,
        h: 6,
        doorTx: 108,
        doorTy: 38,
        accent: '#60a5fa',
        iconLabel: '⚔️',
        spriteKind: 'special_base',
        action: { kind: 'temple_tab', tab: 'personnel' },
        extraActions: [
            { label: '인사 관리 (기사단/집사/메이드)', action: { kind: 'temple_tab', tab: 'personnel' } },
            { label: '신전 시설 증축', action: { kind: 'temple_tab', tab: 'facility' } }
        ]
    },
    {
        id: 'reception_hall',
        name: '성전 대접견실',
        subtitle: '방문자 접견 · 신도 탄원',
        tx: 30,
        ty: 67,
        w: 8,
        h: 6,
        doorTx: 34,
        doorTy: 74,
        accent: '#f472b6',
        iconLabel: '🕊️',
        spriteKind: 'house',
        action: { kind: 'temple_tab', tab: 'reception' }
    },
    {
        id: 'foreign_pavilion',
        name: '신계 의전 · 외교관',
        subtitle: '외교 업무 · 신계 관계 관리',
        tx: 102,
        ty: 67,
        w: 8,
        h: 6,
        doorTx: 106,
        doorTy: 74,
        accent: '#38bdf8',
        iconLabel: '🌐',
        spriteKind: 'special_elf',
        action: { kind: 'temple_tab', tab: 'foreign_affairs' }
    },
    {
        id: 'divine_forge',
        name: '신성 대장간 · 보물고',
        subtitle: '신전 전용 성물 장비 제작·보급 (Lv.2+)',
        tx: 43,
        ty: 85,
        w: 7,
        h: 5,
        doorTx: 46,
        doorTy: 91,
        accent: '#fb923c',
        iconLabel: '⚒️',
        spriteKind: 'shop',
        action: { kind: 'temple_tab', tab: 'equipment' }
    },
    {
        id: 'elemental_shrine',
        name: '신력 속성 성소 · 각성 제단',
        subtitle: '신력 속성 강화 · 신의 사자 각성',
        tx: 90,
        ty: 85,
        w: 7,
        h: 5,
        doorTx: 93,
        doorTy: 91,
        accent: '#c084fc',
        iconLabel: '✨',
        spriteKind: 'landmark',
        action: { kind: 'temple_tab', tab: 'divine_elemental_enhancement' },
        extraActions: [
            { label: '신력 속성 강화', action: { kind: 'temple_tab', tab: 'divine_elemental_enhancement' } },
            { label: '신의 사자 각성', action: { kind: 'awakening' } }
        ]
    }
];

const buildTempleDecorations = (): TempleDeco[] => {
    const decos: TempleDeco[] = [
        { tx: 70, ty: 60, pack: 'culture', part: 'fountain', scale: 3.4 },
        { tx: 70, ty: 38, pack: 'fantasy', part: 'rune_pad', scale: 2.2 },
        { tx: 63, ty: 35, pack: 'fantasy', part: 'obelisk', scale: 1.7 },
        { tx: 77, ty: 35, pack: 'fantasy', part: 'obelisk', scale: 1.7 },
        { tx: 63, ty: 54, pack: 'fantasy', part: 'crystal', scale: 1.5 },
        { tx: 77, ty: 54, pack: 'fantasy', part: 'crystal', scale: 1.5 },
        { tx: 63, ty: 66, pack: 'fantasy', part: 'crystal', scale: 1.5 },
        { tx: 77, ty: 66, pack: 'fantasy', part: 'crystal', scale: 1.5 }
    ];
    // 참배길 가로등 + 신성수 + 깃발 열주
    for (let ty = 42; ty <= 98; ty += 7) {
        if (Math.abs(ty - 60) <= 5 || Math.abs(ty - 74) <= 3 || Math.abs(ty - 92) <= 3) continue;
        decos.push({ tx: 66, ty, pack: 'culture', part: 'lamp', scale: 1.3 });
        decos.push({ tx: 74, ty, pack: 'culture', part: 'lamp', scale: 1.3 });
        decos.push({ tx: 64, ty, pack: 'culture', part: 'tree', scale: 1.7 });
        decos.push({ tx: 76, ty, pack: 'culture', part: 'tree', scale: 1.7 });
        decos.push({ tx: 67, ty: ty + 3, pack: 'fantasy', part: 'banner', scale: 1.25 });
        decos.push({ tx: 73, ty: ty + 3, pack: 'fantasy', part: 'banner', scale: 1.25 });
    }
    // 정원 화단 & 신성수
    for (let tx = 14; tx <= 126; tx += 12) {
        if (Math.abs(tx - 70) < 10) continue;
        decos.push({ tx, ty: 22, pack: 'culture', part: 'tree', scale: 1.8 });
        decos.push({ tx, ty: 50, pack: 'nature', part: 'flowerbed', scale: 1.4 });
        decos.push({ tx, ty: 80, pack: 'nature', part: 'flowerbed', scale: 1.4 });
        decos.push({ tx, ty: 100, pack: 'culture', part: 'tree', scale: 1.8 });
    }
    return decos;
};

const TEMPLE_DECOS = buildTempleDecorations();

const TempleRpgCanvas: React.FC<TempleRpgCanvasProps> = ({
    character,
    region,
    nation,
    city,
    onExitToCity,
    onUpdateCharacter,
    onAction,
    onBattle
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapRef = useRef<HTMLCanvasElement | null>(null);
    const scaledImgCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const minimapBgCacheRef = useRef<HTMLCanvasElement | null>(null);

    const [activeTempleTab, setActiveTempleTab] = useState<TempleTab | null>(null);
    const [templeModalFullMode, setTempleModalFullMode] = useState(false);
    const [isAwakeningOpen, setIsAwakeningOpen] = useState(false);
    const [isReceptionInteriorOpen, setIsReceptionInteriorOpen] = useState(false);
    const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
    const [selectedBuildingMenu, setSelectedBuildingMenu] = useState<TempleBuilding | null>(null);
    const [selectedNpc, setSelectedNpc] = useState<TempleNpc | null>(null);
    const [authAlert, setAuthAlert] = useState<string | null>(null);
    const [nearbyBuilding, setNearbyBuilding] = useState<TempleBuilding | null>(null);
    const [nearbyNpc, setNearbyNpc] = useState<TempleNpc | null>(null);
    const prevNearBIdRef = useRef<string | null>(null);
    const prevNearNIdRef = useRef<string | null>(null);

    const cultureKey: CityCultureKey = useMemo(
        () => resolveCityCultureKey(region, nation, city),
        [region, nation, city]
    );

    const templeKey = `${nation}_${city || 'Default'}`;
    const templeLevel = character.base?.facilityLevels?.[`temple_size_${templeKey}`] || 1;
    const majestyValue = useMemo(() => calculateTempleMajesty(character, templeKey), [character, templeKey]);

    const allComps = useMemo(
        () => [...character.companions, ...(character.inactiveCompanions || [])],
        [character.companions, character.inactiveCompanions]
    );
    const isEllaSanctum = city === '신의 거처';
    const activeBuildings = isEllaSanctum ? ELLA_SANCTUM_BUILDINGS : TEMPLE_BUILDINGS;
    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[city || ''];
    const activeMessenger = useMemo(() => {
        if (!requiredMessengerJob) return null;
        if (character.job === requiredMessengerJob) return character;
        return allComps.find(c => c.job === requiredMessengerJob) || null;
    }, [character, allComps, requiredMessengerJob]);

    const hasTempleAuth = isEllaSanctum
        ? (MESSENGER_JOBS.has(character.job) || !!character.isGodDefeated)
        : !!activeMessenger;
    const isPlayerTempleOwner = isEllaSanctum
        ? MESSENGER_JOBS.has(character.job)
        : (!!requiredMessengerJob && character.job === requiredMessengerJob);
    const isMagyeEnemy = !isPlayerTempleOwner && !activeMessenger && (MAGYE_LEADERS.includes(character.job) || (character.race || '').includes('마족'));
    const praisedTarget = isPlayerTempleOwner
        ? `${character.name} 사자님`
        : activeMessenger
            ? `${activeMessenger.name} 사자님`
            : null;
    const bubbleTone: 'praise' | 'hostile' | 'neutral' = praisedTarget ? 'praise' : isMagyeEnemy ? 'hostile' : 'neutral';
    const honorificTitle = isPlayerTempleOwner ? `${character.name} 사자님` : `${character.name}님`;

    const divineBoss = DIVINE_REALM_BOSSES[nation]?.[city || '태양의 사자의 성전'];
    const guardianBoss = divineBoss || getBossByLocation(nation, city || '태양의 사자의 성전');

    const playerSprite = useMemo(
        () => resolveEntityRpgSprite(character, region, nation),
        [character, region, nation]
    );

    const personnel: TemplePersonnel = character.base?.templePersonnel?.[templeKey] || {
        knightIds: [],
        butlerIds: [],
        maidIds: []
    };

    const visitors = character.base?.templeVisitors?.[templeKey] || [];

    const npcs = useMemo<TempleNpc[]>(() => {
        const list: TempleNpc[] = [];
        const elemNames = ELEMENTAL_TEMPLE_NPC_NAMES[cultureKey] || ELEMENTAL_TEMPLE_NPC_NAMES.default;

        // 절대 신 엘라의 신전('신의 거처'): 통치권 얘기 없이 절대신 찬양 NPC만 배치 (신 처단 시 텅 빈 공간)
        if (isEllaSanctum) {
            if (character.isGodDefeated) return [];
            const ellaPraiseList: Array<[string, string, string, number, number, RpgSpriteGenderKey]> = [
                ['ella_priest_1', '엘라 대사제 아우렐리온', '절대 신전 수석 사제', 70, 39, 'male'],
                ['ella_priest_2', '엘라의 성녀 세레스티아', '영원의 성녀', 65, 42, 'female'],
                ['ella_priest_3', '성광의 대천사 가브리엘', '엘라 근위 천사', 75, 42, 'male'],
                ['ella_guard_1', '절대 신전 수호기사', 66, 95, 'male'],
                ['ella_guard_2', '절대 신전 수호기사', 74, 95, 'male'],
                ['ella_guard_3', '성역 수호천사', 66, 52, 'female'],
                ['ella_guard_4', '성역 수호천사', 74, 52, 'female'],
                ['ella_pilgrim_1', '찬양의 성녀', 58, 56, 'female'],
                ['ella_pilgrim_2', '빛의 사제', 82, 56, 'male'],
                ['ella_pilgrim_3', '신계의 순례자', 62, 72, 'male'],
                ['ella_pilgrim_4', '신계의 순례자', 78, 72, 'female'],
                ['ella_pilgrim_5', '찬양대원', 70, 82, 'female']
            ];
            ellaPraiseList.forEach(([id, name, role, tx, ty, g], idx) => {
                const spr = resolveEntityRpgSprite({ name, gender: g } as any, '신계', nation);
                const lines = [
                    '절대 신 엘라님의 무한한 은총이 온 세상에 깃들기를!',
                    '태초의 창조주 엘라님의 영원한 빛을 찬양합니다!',
                    '이 성스러운 땅은 오직 절대 신 엘라님의 성역입니다.'
                ];
                list.push({
                    id,
                    name,
                    role,
                    tx,
                    ty,
                    homeTx: tx,
                    homeTy: ty,
                    dir: 'down',
                    gender: g,
                    spriteUrl: spr.url,
                    bubbleTone: 'praise',
                    patrolRadius: 1.8,
                    reverenceLine: lines[idx % lines.length],
                    dialogue: '절대 신 엘라님의 뜻 아래 모든 차원이 조화를 이루고 있습니다. 각성의 제단에서 신의 축복을 마주하십시오.'
                });
            });
            return list;
        }

        const targetLabel = praisedTarget || `${requiredMessengerJob || '이 성전'}님`;
        const addUnit = (
            id: string,
            name: string,
            role: string,
            tx: number,
            ty: number,
            gender: RpgSpriteGenderKey,
            reverenceLine: string,
            dialogue: string,
            action?: TempleActionKind,
            isGuardian = false,
            monsterVisualUrl?: string
        ) => {
            const spr = resolveEntityRpgSprite({ name, gender } as any, '신계', nation);
            const finalLine =
                bubbleTone === 'hostile'
                    ? `⚔️ 감히 마계의 자가 신성한 성전에 발을 들이느냐!`
                    : bubbleTone === 'neutral'
                        ? `이곳은 ${requiredMessengerJob || '절대 신 엘라'}의 성역입니다.`
                        : reverenceLine;
            const finalDialogue =
                bubbleTone === 'hostile'
                    ? `당장 물러가라! ${isEllaSanctum ? '절대 신 엘라의 성전' : city}은 마계의 자가 발을 들일 곳이 아니다!`
                    : bubbleTone === 'neutral'
                        ? `이곳은 ${requiredMessengerJob || '절대 신 엘라'}의 성역입니다. 해당 직책을 지닌 분만 관리할 수 있습니다.`
                        : dialogue;
            list.push({
                id,
                name,
                role,
                tx,
                ty,
                homeTx: tx,
                homeTy: ty,
                dir: 'down',
                gender,
                spriteUrl: spr.url,
                monsterVisualUrl,
                bubbleTone,
                patrolRadius: isGuardian ? 1.4 : 2.2,
                reverenceLine: finalLine,
                dialogue: finalDialogue,
                action,
                isGuardian
            });
        };

        addUnit(
            'temple_high_priest',
            elemNames.priest,
            '성전 총괄 대사제',
            70,
            39,
            'male',
            `위대하신 ${targetLabel}, 성전의 모든 권능이 기다립니다!`,
            `${targetLabel}, 오늘도 찬란한 성광이 성전을 감싸고 있습니다. 성전 관리 본부 전체 업무를 보시겠습니까?`,
            { kind: 'temple_tab', tab: 'guardian', fullManagement: true }
        );
        addUnit(
            'temple_guardian_avatar',
            guardianBoss.name,
            '성전 수호수',
            32,
            40,
            'male',
            `크르릉... ${targetLabel}께 경의를 표합니다.`,
            `${targetLabel}의 기운이 온 성역에 가득합니다. 수호수 성소에서 저를 단련하실 수 있습니다.`,
            { kind: 'temple_tab', tab: 'guardian' },
            true,
            guardianBoss.visualUrl
        );
        addUnit(
            'temple_reception_steward',
            elemNames.steward,
            '대접견실 총괄',
            34,
            76,
            'female',
            `${targetLabel}, 수많은 순례자가 알현을 청하고 있습니다!`,
            `${targetLabel}의 명성을 듣고 찾아온 방문객들을 접견실에서 맞이하시겠습니까?`,
            { kind: 'temple_tab', tab: 'reception' }
        );
        addUnit(
            'temple_foreign_envoy',
            elemNames.envoy,
            '대외 의전 총괄',
            106,
            76,
            'female',
            `${targetLabel}, 타 성전 및 국가의 사절이 대기 중입니다.`,
            `${targetLabel}의 외교적 결단에 신계의 판도가 움직입니다.`,
            { kind: 'temple_tab', tab: 'foreign_affairs' }
        );

        // 성전 접견실 명단 갱신 방문객 NPC 실제 배치
        visitors.slice(0, 8).forEach((v, idx) => {
            const vtx = 30 + (idx % 4) * 2.2;
            const vty = 77.5 + Math.floor(idx / 4) * 2.2;
            addUnit(
                `visitor_${v.id}`,
                v.name,
                `접견객 (${v.occupation || v.origin || '방문자'})`,
                vtx,
                vty,
                v.gender === '여성' ? 'female' : 'male',
                `${targetLabel}을(를) 뵙고자 먼 길을 찾아왔습니다!`,
                v.wish || `${targetLabel}께 청원할 일이 있어 접견실에 머물고 있습니다.`,
                { kind: 'temple_tab', tab: 'reception' }
            );
        });

        const knightSpawns = [
            [67, 52], [73, 52], [105, 41], [111, 41], [67, 74], [73, 74]
        ];
        personnel.knightIds.slice(0, 6).forEach((kid, idx) => {
            const comp = allComps.find(c => c.id === kid);
            if (!comp) return;
            const [sx, sy] = knightSpawns[idx % knightSpawns.length];
            addUnit(
                `knight_${comp.id}`,
                comp.name,
                '임명 성전기사',
                sx,
                sy,
                comp.gender === '여성' ? 'female' : 'male',
                `충성! ${honorificTitle}의 검이 되겠습니다!`,
                `${honorificTitle}, 성전 방어 및 순찰에 이상 없습니다!`,
                { kind: 'temple_tab', tab: 'personnel' }
            );
        });

        const staffSpawns = [
            [66, 62], [74, 62], [46, 93], [93, 93]
        ];
        [...personnel.butlerIds, ...personnel.maidIds].slice(0, 4).forEach((sid, idx) => {
            const comp = allComps.find(c => c.id === sid);
            if (!comp) return;
            const [sx, sy] = staffSpawns[idx % staffSpawns.length];
            addUnit(
                `staff_${comp.id}`,
                comp.name,
                personnel.butlerIds.includes(sid) ? '신전 집사' : '신전 메이드',
                sx,
                sy,
                comp.gender === '여성' ? 'female' : 'male',
                `${honorificTitle}, 정성을 다해 보필하겠습니다!`,
                `${honorificTitle}의 성전이 날로 번영하고 있습니다.`,
                { kind: 'temple_tab', tab: 'facility' }
            );
        });

        const defaultGuards: Array<[string, string, number, number, RpgSpriteGenderKey]> = [
            ['guard_1', '성전 근위기사', 66, 95, 'male'],
            ['guard_2', '성전 근위기사', 74, 95, 'male'],
            ['guard_3', '성전 수호병', 66, 44, 'male'],
            ['guard_4', '성전 수호병', 74, 44, 'male'],
            ['acolyte_1', elemNames.acolytes[0], 58, 56, 'female'],
            ['acolyte_2', elemNames.acolytes[1], 82, 56, 'female'],
            ['smith_npc', elemNames.smith, 46, 93, 'male'],
            ['element_npc', elemNames.researcher, 93, 93, 'female']
        ];
        defaultGuards.forEach(([id, role, gx, gy, g]) => {
            addUnit(
                id,
                role,
                '신전 소속',
                gx,
                gy,
                g,
                `${honorificTitle}의 위엄에 경배드립니다!`,
                `온 신계가 ${honorificTitle}의 성스러운 행보를 우러러보고 있습니다.`
            );
        });

        return list;
    }, [nation, city, cultureKey, isEllaSanctum, character.isGodDefeated, requiredMessengerJob, praisedTarget, bubbleTone, guardianBoss.name, guardianBoss.visualUrl, visitors, personnel.knightIds, personnel.butlerIds, personnel.maidIds, allComps]);

    const npcRuntimeRef = useRef<TempleNpc[]>([]);
    useEffect(() => {
        npcRuntimeRef.current = npcs.map(n => ({ ...n }));
    }, [npcs]);

    const playerRef = useRef({
        x: 70 * TILE + TILE / 2,
        y: 98 * TILE + TILE / 2,
        dir: 'up' as SpriteDirection,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());

    const modalOpenRef = useRef(false);
    const hasOverlayOpen = !!(activeTempleTab || isAwakeningOpen || isReceptionInteriorOpen || isReceptionModalOpen || selectedBuildingMenu || selectedNpc || authAlert);
    useEffect(() => {
        modalOpenRef.current = hasOverlayOpen;
        if (hasOverlayOpen) {
            keysRef.current.clear();
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;
        }
    }, [hasOverlayOpen]);

    // 에셋 일괄 사전 로드 (스프라이트와 지형/건물/조경 분리 로드)
    useEffect(() => {
        if (playerSprite.url) loadRpgSpriteImage(playerSprite.url);
        npcs.forEach(n => {
            if (n.spriteUrl) loadRpgSpriteImage(n.spriteUrl);
        });
        const assetUrls = new Set<string>([
            ...(guardianBoss.visualUrl ? [guardianBoss.visualUrl] : []),
            ...(['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).map(p => getTerrainTileUrl(cultureKey, p)),
            ...TEMPLE_BUILDINGS.map(b => getBuildingSpriteUrl(cultureKey, b.spriteKind)),
            ...TEMPLE_DECOS.map(d => resolveDecorationSpriteUrl(cultureKey, d.pack, d.part))
        ]);
        assetUrls.forEach(u => {
            if (u) loadCityAssetImage(u);
        });
    }, [playerSprite.url, npcs, cultureKey]);

    const drawScaledImg = (
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        cacheKey: string,
        dx: number,
        dy: number,
        dw: number,
        dh: number
    ) => {
        const w = Math.max(1, Math.round(dw));
        const h = Math.max(1, Math.round(dh));
        const key = `${cacheKey}|${w}x${h}`;
        let cached = scaledImgCacheRef.current.get(key);
        if (!cached) {
            cached = document.createElement('canvas');
            cached.width = w;
            cached.height = h;
            const cctx = cached.getContext('2d');
            if (cctx) {
                cctx.imageSmoothingEnabled = true;
                cctx.imageSmoothingQuality = 'medium';
                cctx.drawImage(img, 0, 0, w, h);
            }
            if (scaledImgCacheRef.current.size > 160) scaledImgCacheRef.current.clear();
            scaledImgCacheRef.current.set(key, cached);
        }
        ctx.drawImage(cached, Math.round(dx), Math.round(dy));
    };

    const getTempleActionLockReason = useCallback((action: TempleActionKind): string | null => {
        if (action.kind !== 'temple_tab') return null;
        if (action.tab === 'equipment' && templeLevel < 2) {
            return `성전 집무실 Lv.2 이상 업그레이드 후 이용할 수 있습니다. (현재 Lv.${templeLevel})`;
        }
        if (
            (action.tab === 'divine_power' ||
                action.tab === 'divine_elemental_enhancement' ||
                action.tab === 'potential_liberation') &&
            templeLevel < 3
        ) {
            return `성전 집무실 Lv.3 달성 후 이용할 수 있습니다. (현재 Lv.${templeLevel})`;
        }
        if (action.tab === 'god_power' && !character.isGodDefeated) {
            return '태초의 신을 처단한 후 해금되는 권능입니다.';
        }
        if (action.tab === 'oracle' && character.isGodDefeated) {
            return '태초의 신이 소멸하여 더 이상 신탁을 수령할 수 없습니다.';
        }
        return null;
    }, [templeLevel, character.isGodDefeated]);

    const triggerAction = useCallback((action: TempleActionKind) => {
        if (isEllaSanctum && action.kind === 'awakening') {
            setIsAwakeningOpen(true);
            return;
        }
        if (!hasTempleAuth) {
            setAuthAlert(
                `이 성전은 [신의 사자] 직업을 보유한 본인 또는 담당 동료가 있어야 관리할 수 있습니다.\n(현재: 관람 모드 — 건물과 경외 NPC만 둘러볼 수 있습니다.)`
            );
            return;
        }
        const lockReason = getTempleActionLockReason(action);
        if (lockReason) {
            setAuthAlert(lockReason);
            return;
        }
        if (action.kind === 'awakening') setIsAwakeningOpen(true);
        else if (action.tab === 'reception' && !action.fullManagement) setIsReceptionInteriorOpen(true);
        else {
            setTempleModalFullMode(Boolean(action.fullManagement));
            setActiveTempleTab(action.tab);
        }
    }, [isEllaSanctum, hasTempleAuth, getTempleActionLockReason]);

    const interactNearest = useCallback(() => {
        const p = playerRef.current;
        let bestB: TempleBuilding | null = null;
        let bestBD = TILE * 3.0;
        for (const b of activeBuildings) {
            const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
            if (d < bestBD) {
                bestBD = d;
                bestB = b;
            }
        }
        if (bestB) {
            if (bestB.extraActions && bestB.extraActions.length > 0) setSelectedBuildingMenu(bestB);
            else triggerAction(bestB.action);
            return;
        }
        let bestN: TempleNpc | null = null;
        let bestND = TILE * 2.2;
        for (const n of npcRuntimeRef.current) {
            const d = Math.hypot(p.x - (n.tx * TILE + TILE / 2), p.y - (n.ty * TILE + TILE / 2));
            if (d < bestND) {
                bestND = d;
                bestN = n;
            }
        }
        if (bestN) setSelectedNpc(bestN);
    }, [triggerAction]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (modalOpenRef.current) return;
            const k = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
                e.preventDefault();
                keysRef.current.add(k);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
            } else if (k === ' ' || k === 'enter') {
                e.preventDefault();
                interactNearest();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [interactNearest]);

    const warpToZone = (b: TempleBuilding) => {
        playerRef.current.x = b.doorTx * TILE + TILE / 2;
        playerRef.current.y = (b.doorTy + 1) * TILE + TILE / 2;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
    };

    const isBlocked = (wx: number, wy: number) => {
        const tx = Math.floor(wx / TILE);
        const ty = Math.floor(wy / TILE);
        if (tx < 3 || tx >= COLS - 3 || ty < 4 || ty >= ROWS - 3) return true;
        if (Math.hypot(tx - 70, ty - 60) < 2.2) return true;
        for (const b of activeBuildings) {
            if (tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h) return true;
        }
        return false;
    };

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();

        const particles = Array.from({ length: 48 }, (_, i) => ({
            x: ((i * 7919) % (COLS * TILE)),
            y: ((i * 4129) % (ROWS * TILE)),
            speed: 16 + (i % 5) * 5,
            r: 2 + (i % 2)
        }));

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;

            const canvas = canvasRef.current;
            if (canvas) {
                if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                    canvas.width = canvas.clientWidth;
                    canvas.height = canvas.clientHeight;
                }
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const p = playerRef.current;
                    const speed = 340;
                    let dx = 0;
                    let dy = 0;
                    if (!modalOpenRef.current) {
                        const ks = keysRef.current;
                        if (ks.has('w') || ks.has('arrowup')) dy -= 1;
                        if (ks.has('s') || ks.has('arrowdown')) dy += 1;
                        if (ks.has('a') || ks.has('arrowleft')) dx -= 1;
                        if (ks.has('d') || ks.has('arrowright')) dx += 1;
                        if (dx === 0 && dy === 0 && p.targetX !== null && p.targetY !== null) {
                            const tdx = p.targetX - p.x;
                            const tdy = p.targetY - p.y;
                            const dist = Math.hypot(tdx, tdy);
                            if (dist < 10) {
                                p.targetX = null;
                                p.targetY = null;
                            } else {
                                dx = tdx / dist;
                                dy = tdy / dist;
                            }
                        }
                    }

                    if (dx !== 0 || dy !== 0) {
                        const len = Math.hypot(dx, dy);
                        dx /= len;
                        dy /= len;
                        const nx = p.x + dx * speed * dt;
                        const ny = p.y + dy * speed * dt;
                        if (!isBlocked(nx, p.y)) p.x = nx;
                        if (!isBlocked(p.x, ny)) p.y = ny;
                        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                        p.animTimer += dt;
                        if (p.animTimer > 0.14) {
                            p.animTimer = 0;
                            p.walkFrame = (p.walkFrame + 1) % 3;
                        }
                    } else {
                        p.walkFrame = 1;
                    }

                    let nearB: TempleBuilding | null = null;
                    let nearBD = TILE * 3.0;
                    for (const b of activeBuildings) {
                        const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
                        if (d < nearBD) {
                            nearBD = d;
                            nearB = b;
                        }
                    }
                    if (prevNearBIdRef.current !== (nearB?.id || null)) {
                        prevNearBIdRef.current = nearB?.id || null;
                        setNearbyBuilding(nearB);
                    }

                    let nearN: TempleNpc | null = null;
                    let nearND = TILE * 2.2;
                    npcRuntimeRef.current.forEach((n, idx) => {
                        const nx = n.tx * TILE + TILE / 2;
                        const ny = n.ty * TILE + TILE / 2;
                        const distToP = Math.hypot(p.x - nx, p.y - ny);
                        if (distToP < TILE * 4.0) {
                            const pdx = p.x - nx;
                            const pdy = p.y - ny;
                            n.dir = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? 'right' : 'left') : (pdy > 0 ? 'down' : 'up');
                        } else {
                            const ang = now * 0.0005 + idx * 1.7;
                            n.tx = n.homeTx + Math.cos(ang) * (n.patrolRadius * 0.45);
                            n.ty = n.homeTy + Math.sin(ang * 0.7) * (n.patrolRadius * 0.35);
                        }
                        if (distToP < nearND) {
                            nearND = distToP;
                            nearN = n;
                        }
                    });
                    if (prevNearNIdRef.current !== (nearN?.id || null)) {
                        prevNearNIdRef.current = nearN?.id || null;
                        setNearbyNpc(nearN);
                    }

                    const camX = Math.max(0, Math.min(COLS * TILE - canvas.width, p.x - canvas.width / 2));
                    const camY = Math.max(0, Math.min(ROWS * TILE - canvas.height, p.y - canvas.height / 2));

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    ctx.translate(-camX, -camY);

                    // 1. 기존 신계 지형 타일 텍스처로 고속 렌더링
                    const groundImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
                    const roadImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
                    const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'plaza'));
                    const royalImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'royal_road'));
                    const wallImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
                    const waterImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'water'));

                    const startTx = Math.max(0, Math.floor(camX / TILE) - 1);
                    const endTx = Math.min(COLS - 1, Math.ceil((camX + canvas.width) / TILE) + 1);
                    const startTy = Math.max(0, Math.floor(camY / TILE) - 1);
                    const endTy = Math.min(ROWS - 1, Math.ceil((camY + canvas.height) / TILE) + 1);

                    for (let ty = startTy; ty <= endTy; ty++) {
                        for (let tx = startTx; tx <= endTx; tx++) {
                            const x = tx * TILE;
                            const y = ty * TILE;
                            const isBorder = tx < 3 || tx >= COLS - 3 || ty < 4 || ty >= ROWS - 3;
                            const isRoyal = tx >= 68 && tx <= 72 && ty >= 34 && ty <= 104;
                            const isCrossRoad =
                                (ty >= 36 && ty <= 40 && tx >= 32 && tx <= 108) ||
                                (ty >= 72 && ty <= 76 && tx >= 34 && tx <= 106) ||
                                (ty >= 90 && ty <= 94 && tx >= 46 && tx <= 94);
                            const isPlaza = Math.hypot(tx - 70, ty - 60) < 9 || Math.hypot(tx - 70, ty - 38) < 7;
                            const isWaterRing = Math.hypot(tx - 70, ty - 60) >= 9 && Math.hypot(tx - 70, ty - 60) < 11 && Math.abs(tx - 70) > 2 && Math.abs(ty - 60) > 2;

                            if (isBorder) {
                                if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) drawScaledImg(ctx, wallImg, `wall_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#334155'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isWaterRing) {
                                if (waterImg && waterImg.complete && waterImg.naturalWidth > 0) drawScaledImg(ctx, waterImg, `water_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#0284c7'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isRoyal) {
                                if (royalImg && royalImg.complete && royalImg.naturalWidth > 0) drawScaledImg(ctx, royalImg, `royal_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#fde68a'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isPlaza) {
                                if (plazaImg && plazaImg.complete && plazaImg.naturalWidth > 0) drawScaledImg(ctx, plazaImg, `plaza_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#fef3c7'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isCrossRoad) {
                                if (roadImg && roadImg.complete && roadImg.naturalWidth > 0) drawScaledImg(ctx, roadImg, `road_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, y, TILE, TILE); }
                            } else {
                                if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) drawScaledImg(ctx, groundImg, `ground_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#14532d'; ctx.fillRect(x, y, TILE, TILE); }
                            }
                        }
                    }

                    // 2. 조경/성물 오브젝트 렌더링
                    TEMPLE_DECOS.forEach(d => {
                        const dx = d.tx * TILE;
                        const dy = d.ty * TILE;
                        if (dx < camX - 180 || dx > camX + canvas.width + 180 || dy < camY - 180 || dy > camY + canvas.height + 180) return;
                        const url = resolveDecorationSpriteUrl(cultureKey, d.pack, d.part);
                        const img = getCachedCityAssetImage(url);
                        const sc = d.scale || 1.2;
                        const dw = TILE * sc;
                        const dh = TILE * sc;
                        if (img && img.complete && img.naturalWidth > 0) {
                            drawScaledImg(ctx, img, `deco_${url}`, dx + TILE / 2 - dw / 2, dy + TILE - dh, dw, dh);
                        }
                    });

                    // 3. 웅장한 신전 건물 (절대 신 엘라의 신전은 각성의 제단만 배치)
                    activeBuildings.forEach(b => {
                        const bx = b.tx * TILE;
                        const by = b.ty * TILE;
                        const bw = b.w * TILE;
                        const bh = b.h * TILE;
                        if (bx + bw < camX - 120 || bx > camX + canvas.width + 120 || by + bh < camY - 120 || by > camY + canvas.height + 120) return;

                        // 대리석 기단
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
                        ctx.fillRect(bx + 8, by + bh - 14, bw - 16, 20);

                        const bUrl = getBuildingSpriteUrl(cultureKey, b.spriteKind);
                        const bImg = getCachedCityAssetImage(bUrl);
                        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                            drawScaledImg(ctx, bImg, `bld_${bUrl}`, bx - 12, by - 24, bw + 24, bh + 28);
                        } else {
                            ctx.fillStyle = '#f8fafc';
                            ctx.fillRect(bx, by, bw, bh);
                            ctx.strokeStyle = b.accent;
                            ctx.lineWidth = 3;
                            ctx.strokeRect(bx, by, bw, bh);
                        }

                        ctx.font = 'bold 13px sans-serif';
                        const label = `${b.iconLabel} ${b.name}`;
                        const tw = ctx.measureText(label).width + 22;
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                        ctx.fillRect(bx + bw / 2 - tw / 2, by - 36, tw, 24);
                        ctx.strokeStyle = b.accent;
                        ctx.lineWidth = 1.6;
                        ctx.strokeRect(bx + bw / 2 - tw / 2, by - 36, tw, 24);
                        ctx.fillStyle = '#fef3c7';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, bx + bw / 2, by - 19);
                    });

                    // 4. NPC 및 경외 말풍선 (CityRpgCanvas 방식의 정확한 naturalWidth 체크)
                    npcRuntimeRef.current.forEach(n => {
                        const nx = n.tx * TILE + TILE / 2;
                        const ny = n.ty * TILE + TILE / 2;
                        if (nx < camX - 90 || nx > camX + canvas.width + 90 || ny < camY - 90 || ny > camY + canvas.height + 90) return;

                        const mImg = n.monsterVisualUrl ? getCachedCityAssetImage(n.monsterVisualUrl) : null;
                        if (mImg && mImg.complete && mImg.naturalWidth > 0) {
                            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
                            ctx.beginPath();
                            ctx.ellipse(nx, ny + 22, 34, 12, 0, 0, Math.PI * 2);
                            ctx.fill();
                            drawScaledImg(ctx, mImg, `guardian_${n.monsterVisualUrl}`, nx - 44, ny - 54, 88, 88);
                        } else {
                            const spr = getCachedRpgSpriteImage(n.spriteUrl);
                            const drawSize = n.isGuardian ? 64 : 48;
                            if (spr && spr.complete && spr.naturalWidth > 0) {
                                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                                ctx.beginPath();
                                ctx.ellipse(nx, ny + 18, 13, 5, 0, 0, Math.PI * 2);
                                ctx.fill();
                                const cellW = spr.naturalWidth / 3;
                                const cellH = spr.naturalHeight / 4;
                                const row = DIRECTION_ROW_MAP[n.dir] ?? 0;
                                ctx.drawImage(spr, cellW, row * cellH, cellW, cellH, nx - drawSize / 2, ny - drawSize / 2 - 4, drawSize, drawSize);
                            } else {
                                drawFallbackChibiSprite(ctx, nx, ny + 18, drawSize, n.dir, 1, 'shingye', n.gender);
                            }
                        }

                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const ntw = ctx.measureText(n.name).width + 12;
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
                        ctx.fillRect(nx - ntw / 2, ny + 22, ntw, 16);
                        ctx.fillStyle = n.isGuardian ? '#6ee7b7' : '#fde68a';
                        ctx.fillText(n.name, nx, ny + 34);

                        const distToP = Math.hypot(p.x - nx, p.y - ny);
                        if (distToP < TILE * 3.8) {
                            const prefix = n.bubbleTone === 'hostile' ? '⚔️ ' : n.bubbleTone === 'neutral' ? '💬 ' : '👑 ';
                            const bubble = `${prefix}${n.reverenceLine}`;
                            ctx.font = 'bold 11px sans-serif';
                            const btw = ctx.measureText(bubble).width + 18;
                            ctx.fillStyle = n.bubbleTone === 'hostile' ? 'rgba(127, 29, 29, 0.94)' : n.bubbleTone === 'neutral' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(30, 27, 75, 0.94)';
                            ctx.fillRect(nx - btw / 2, ny - 54, btw, 22);
                            ctx.strokeStyle = n.bubbleTone === 'hostile' ? '#ef4444' : n.bubbleTone === 'neutral' ? '#64748b' : '#fbbf24';
                            ctx.lineWidth = 1.4;
                            ctx.strokeRect(nx - btw / 2, ny - 54, btw, 22);
                            ctx.fillStyle = n.bubbleTone === 'hostile' ? '#fee2e2' : '#fef3c7';
                            ctx.fillText(bubble, nx, ny - 39);
                        }
                    });

                    // 5. 플레이어 렌더링
                    const pspr = getCachedRpgSpriteImage(playerSprite.url);
                    if (pspr && pspr.complete && pspr.naturalWidth > 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.36)';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + 18, 13, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const cellW = pspr.naturalWidth / 3;
                        const cellH = pspr.naturalHeight / 4;
                        const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                        const col = Math.max(0, Math.min(2, p.walkFrame));
                        ctx.drawImage(pspr, col * cellW, row * cellH, cellW, cellH, p.x - 24, p.y - 28, 48, 48);
                    } else {
                        drawFallbackChibiSprite(ctx, p.x, p.y + 18, 46, p.dir, p.walkFrame, 'shingye', playerSprite.genderKey);
                    }
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    const ptw = ctx.measureText(honorificTitle).width + 14;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                    ctx.fillRect(p.x - ptw / 2, p.y + 22, ptw, 17);
                    ctx.fillStyle = '#fde047';
                    ctx.fillText(honorificTitle, p.x, p.y + 35);

                    // 6. 상승하는 금빛 성광 파티클
                    particles.forEach(pt => {
                        pt.y -= pt.speed * dt;
                        if (pt.y < 0) pt.y = ROWS * TILE;
                        if (pt.x >= camX && pt.x <= camX + canvas.width && pt.y >= camY && pt.y <= camY + canvas.height) {
                            ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });

                    drawCanvasNightOverlay(ctx, camX, camY, canvas.width, canvas.height, character.currentTime, {
                        playerLight: { x: p.x, y: p.y - 6, radius: 105 }
                    });
                    ctx.restore();

                    // 7. 우상단 미니맵 (배경 오프스크린 캐시로 무렉 처리)
                    const mm = minimapRef.current;
                    if (mm) {
                        const mctx = mm.getContext('2d');
                        if (mctx) {
                            if (!minimapBgCacheRef.current) {
                                const bg = document.createElement('canvas');
                                bg.width = mm.width;
                                bg.height = mm.height;
                                const bctx = bg.getContext('2d');
                                if (bctx) {
                                    const sx = mm.width / COLS;
                                    const sy = mm.height / ROWS;
                                    bctx.fillStyle = '#0f172a';
                                    bctx.fillRect(0, 0, mm.width, mm.height);
                                    bctx.fillStyle = '#14532d';
                                    bctx.fillRect(3 * sx, 4 * sy, (COLS - 6) * sx, (ROWS - 7) * sy);
                                    bctx.fillStyle = '#fde68a';
                                    bctx.fillRect(68 * sx, 34 * sy, 5 * sx, 70 * sy);
                                    bctx.fillRect(32 * sx, 36 * sy, 76 * sx, 5 * sy);
                                    bctx.fillRect(34 * sx, 72 * sy, 72 * sx, 5 * sy);
                                    activeBuildings.forEach(b => {
                                        bctx.fillStyle = b.accent;
                                        bctx.fillRect(b.tx * sx, b.ty * sy, b.w * sx, b.h * sy);
                                    });
                                }
                                minimapBgCacheRef.current = bg;
                            }
                            mctx.drawImage(minimapBgCacheRef.current, 0, 0);
                            const sx = mm.width / COLS;
                            const sy = mm.height / ROWS;
                            mctx.fillStyle = '#ffffff';
                            mctx.beginPath();
                            mctx.arc((p.x / TILE) * sx, (p.y / TILE) * sy, 3.5, 0, Math.PI * 2);
                            mctx.fill();
                        }
                    }
                }
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [playerSprite.url, honorificTitle, cultureKey, activeBuildings]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (modalOpenRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const p = playerRef.current;
        const camX = Math.max(0, Math.min(COLS * TILE - canvas.width, p.x - canvas.width / 2));
        const camY = Math.max(0, Math.min(ROWS * TILE - canvas.height, p.y - canvas.height / 2));
        const wx = e.clientX - rect.left + camX;
        const wy = e.clientY - rect.top + camY;

        for (const b of activeBuildings) {
            if (wx >= b.tx * TILE && wx <= (b.tx + b.w) * TILE && wy >= b.ty * TILE && wy <= (b.ty + b.h) * TILE) {
                const d = Math.hypot(p.x - (b.doorTx * TILE + TILE / 2), p.y - (b.doorTy * TILE + TILE / 2));
                if (d < TILE * 4.5) {
                    if (b.extraActions && b.extraActions.length > 0) setSelectedBuildingMenu(b);
                    else triggerAction(b.action);
                    return;
                }
                p.targetX = b.doorTx * TILE + TILE / 2;
                p.targetY = (b.doorTy + 1) * TILE + TILE / 2;
                return;
            }
        }
        for (const n of npcRuntimeRef.current) {
            const nx = n.tx * TILE + TILE / 2;
            const ny = n.ty * TILE + TILE / 2;
            if (Math.hypot(wx - nx, wy - ny) < TILE * 0.9) {
                setSelectedNpc(n);
                return;
            }
        }
        p.targetX = wx;
        p.targetY = wy;
    };

    return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-full block cursor-pointer"
            />

            {/* 상단 HUD */}
            <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
                <div className="bg-slate-950/90 border border-amber-500/50 rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-3">
                    <Crown size={18} className="text-amber-400" />
                    <div>
                        <div className="text-xs font-black text-amber-200">{isEllaSanctum ? '절대 신 엘라의 신전' : (city || '신의 사자의 성전')}</div>
                        {!isEllaSanctum && (
                            <div className="text-[10px] text-slate-400">
                                신전 Lv.{templeLevel} · 위엄도 {majestyValue.toLocaleString()} · {region}
                            </div>
                        )}
                    </div>
                    {!isEllaSanctum && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hasTempleAuth ? 'bg-amber-950/80 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-600 text-slate-400'}`}>
                            {hasTempleAuth ? '👑 성전 통치권 보유' : '👁️ 관람 모드'}
                        </span>
                    )}
                </div>
                <button
                    onClick={onExitToCity}
                    className="bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                    <DoorOpen size={14} /> 성전 밖으로
                </button>
            </div>

            {/* 우상단 미니맵 */}
            <div className="absolute top-3 right-3 z-20 bg-slate-950/90 border border-amber-500/40 rounded-xl p-2 shadow-xl">
                <div className="text-[10px] font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span>성역 미니맵 (140×110)</span>
                    <Compass size={11} />
                </div>
                <canvas ref={minimapRef} width={168} height={132} className="rounded border border-slate-800 block" />
            </div>

            {/* 좌측 빠른 워프 바 */}
            <div className="absolute left-3 top-20 z-20 flex flex-col gap-1.5 max-h-[65vh] overflow-y-auto">
                {activeBuildings.map(b => (
                    <button
                        key={b.id}
                        onClick={() => warpToZone(b)}
                        className="bg-slate-950/85 hover:bg-amber-950/80 border border-amber-500/35 hover:border-amber-400 text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-100 shadow flex items-center gap-1.5 transition-all"
                    >
                        <span>{b.iconLabel}</span>
                        <span className="truncate max-w-[140px]">{b.name}</span>
                    </button>
                ))}
            </div>

            {/* 하단 상호작용 프롬프트 */}
            {(nearbyBuilding || nearbyNpc) && !hasOverlayOpen && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={interactNearest}
                        className="bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-full shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center gap-2 animate-bounce"
                    >
                        <Sparkles size={15} />
                        {nearbyBuilding
                            ? `${nearbyBuilding.iconLabel} ${nearbyBuilding.name} 입장 (Space)`
                            : `💬 ${nearbyNpc?.name} 대화하기 (Space)`}
                    </button>
                </div>
            )}

            {/* 복합 건물 기능 선택 팝업 */}
            {selectedBuildingMenu && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-amber-300">{selectedBuildingMenu.iconLabel} {selectedBuildingMenu.name}</h3>
                                <p className="text-xs text-slate-400">{selectedBuildingMenu.subtitle}</p>
                            </div>
                            <button onClick={() => setSelectedBuildingMenu(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {selectedBuildingMenu.extraActions?.map((act, idx) => {
                                const lockMsg = getTempleActionLockReason(act.action);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedBuildingMenu(null);
                                            triggerAction(act.action);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-bold flex items-center justify-between ${
                                            lockMsg
                                                ? 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-rose-500/40'
                                                : 'bg-slate-950 hover:bg-amber-950/60 border-amber-500/30 hover:border-amber-400 text-amber-100'
                                        }`}
                                    >
                                        <span>{act.label}</span>
                                        {lockMsg ? <Lock size={14} className="text-rose-400" /> : <Sparkles size={14} className="text-amber-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* NPC 대화 창 */}
            {selectedNpc && (
                <div className="fixed inset-0 z-50 bg-black/65 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs text-amber-400 font-bold">{selectedNpc.role}</div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <MessageSquare size={16} className="text-amber-400" />
                                    {selectedNpc.name}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedNpc(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                            "{selectedNpc.dialogue}"
                        </p>
                        <div className="flex justify-end gap-2">
                            {selectedNpc.action && (
                                <button
                                    onClick={() => {
                                        const act = selectedNpc.action!;
                                        setSelectedNpc(null);
                                        triggerAction(act);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs"
                                >
                                    해당 성전 관리 열기
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedNpc(null)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 권한 안내 팝업 */}
            {authAlert && (
                <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-center">
                        <Lock size={34} className="text-rose-400 mx-auto" />
                        <h3 className="text-base font-black text-white">관리 권한 필요</h3>
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{authAlert}</p>
                        <button onClick={() => setAuthAlert(null)} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs">
                            확인
                        </button>
                    </div>
                </div>
            )}

            {activeTempleTab && (
                <TempleManagementModal
                    character={character}
                    initialTab={activeTempleTab}
                    singleTabOnly={!templeModalFullMode}
                    onClose={() => {
                        setActiveTempleTab(null);
                        setTempleModalFullMode(false);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction}
                    onBattle={onBattle}
                />
            )}

            {isAwakeningOpen && (
                <DivineAwakeningModal
                    character={character}
                    onClose={() => setIsAwakeningOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {/* 성전 대접견실 실내 맵 */}
            {isReceptionInteriorOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/95 flex flex-col p-4 sm:p-6">
                    <div className="max-w-5xl w-full mx-auto flex-1 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-5 py-4 bg-slate-950/90 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-amber-200">🕊️ {city} 대접견실 (실내)</h3>
                                <p className="text-xs text-slate-400">
                                    명단 갱신을 누르면 방문객 NPC들이 접견실에 입장합니다. ({visitors.length}명 대기 중)
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsReceptionModalOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-lg"
                                >
                                    📋 접견 명단 갱신 / 응대
                                </button>
                                <button
                                    onClick={() => setIsReceptionInteriorOpen(false)}
                                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                                >
                                    <DoorOpen size={14} /> 접견실 밖으로
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto relative">
                            <div className="max-w-3xl mx-auto mb-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-amber-300">접견 총괄 시종장</div>
                                    <div className="text-sm font-black text-white">
                                        {(ELEMENTAL_TEMPLE_NPC_NAMES[cultureKey] || ELEMENTAL_TEMPLE_NPC_NAMES.default).steward}
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-0.5">
                                        "방문객 명단을 갱신하시려면 우측 버튼을 눌러주십시오."
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsReceptionModalOpen(true)}
                                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold shrink-0"
                                >
                                    명단 관리 열기
                                </button>
                            </div>

                            {visitors.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 text-sm">
                                    현재 접견실에 대기 중인 방문객이 없습니다.<br />
                                    상단의 <strong className="text-amber-300">[접견 명단 갱신 / 응대]</strong> 버튼을 눌러 방문객을 맞이하세요.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {visitors.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setIsReceptionModalOpen(true)}
                                            className="p-4 rounded-2xl bg-slate-950/85 hover:bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all flex flex-col gap-1.5 shadow-lg"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-amber-200">{v.name}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 font-bold">
                                                    {v.occupation || v.origin || '방문자'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 line-clamp-2">
                                                "{v.wish || '성전의 사자님께 알현을 청합니다.'}"
                                            </p>
                                            <span className="text-[10px] text-amber-400 font-bold mt-1">클릭하여 응대하기 →</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isReceptionModalOpen && (
                <TempleReceptionModal
                    character={character}
                    templeCity={city}
                    onClose={() => setIsReceptionModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction}
                    onBattle={(enemy, type) => onBattle?.(enemy, type || 'normal', 'reception')}
                />
            )}
        </div>
    );
};

export default TempleRpgCanvas;
