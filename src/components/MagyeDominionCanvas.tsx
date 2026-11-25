import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, DominionData, Enemy, JobType } from '../types';
import { MAGYE_DOMINION_MAP, MAGYE_LEADERS } from '../constants';
import { BASE_TILE_SIZE, resolveDecorationSpriteUrl } from '../services/baseTilemapEngine';
import {
    BuildingSpriteKind,
    CityCultureKey,
    getBuildingSpriteUrl,
    getCachedCityAssetImage,
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
import MagyeDominionModal, { MagyeDominionTab } from './MagyeDominionModal';
import MagyeAwakeningModal from './MagyeAwakeningModal';
import MagyePromoteModal from './MagyePromoteModal';
import MagyeWarModal from './MagyeWarModal';
import {
    Compass,
    DoorOpen,
    Flame,
    Lock,
    MessageSquare,
    Skull,
    Sparkles,
    X
} from 'lucide-react';

const COLS = 140;
const ROWS = 110;
const TILE = BASE_TILE_SIZE; // 48px -> 6720 x 5280 px

type MagyeActionKind =
    | { kind: 'dominion_tab'; tab: MagyeDominionTab }
    | { kind: 'awakening' }
    | { kind: 'promote' }
    | { kind: 'war_command' }
    | { kind: 'abyss_tower' };

interface MagyeBuilding {
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
    action: MagyeActionKind;
    extraActions?: { label: string; action: MagyeActionKind }[];
}

interface MagyeDeco {
    tx: number;
    ty: number;
    pack: string;
    part: string;
    scale?: number;
}

interface MagyeNpc {
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
    bubbleTone?: 'praise' | 'hostile' | 'neutral';
    patrolRadius: number;
    reverenceLine: string;
    dialogue: string;
    action?: MagyeActionKind;
    isBeast?: boolean;
}

interface MagyeDominionCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string, targetCity?: string, targetNation?: string) => void;
    onOpenAbyssTower?: () => void;
}

const MAGYE_BUILDINGS: MagyeBuilding[] = [
    {
        id: 'obsidian_throne',
        name: '마신황의 흑요석 왕좌',
        subtitle: '통치 총괄 · 마신 알현 · 제너럴 서열 승급',
        tx: 65,
        ty: 27,
        w: 10,
        h: 7,
        doorTx: 70,
        doorTy: 35,
        accent: '#ef4444',
        iconLabel: '👑',
        spriteKind: 'landmark',
        action: { kind: 'dominion_tab', tab: 'overview' },
        extraActions: [
            { label: '도시 통치 총괄', action: { kind: 'dominion_tab', tab: 'overview' } },
            { label: '마신 알현 (제너럴 각성)', action: { kind: 'awakening' } },
            { label: '제너럴 서열 승급', action: { kind: 'promote' } }
        ]
    },
    {
        id: 'abyss_beast_pen',
        name: '심연 마수 우리 · 변이실',
        subtitle: '마수 관리 · 마수화 변이',
        tx: 28,
        ty: 31,
        w: 8,
        h: 6,
        doorTx: 32,
        doorTy: 38,
        accent: '#a855f7',
        iconLabel: '🐉',
        spriteKind: 'special_demon',
        action: { kind: 'dominion_tab', tab: 'beast' },
        extraActions: [
            { label: '마수 군단 관리', action: { kind: 'dominion_tab', tab: 'beast' } },
            { label: '마수화 변이 실험', action: { kind: 'dominion_tab', tab: 'monsterTransform' } }
        ]
    },
    {
        id: 'war_command',
        name: '제국 총사령부 · 칙령관',
        subtitle: '공포의 칙령 · 인간계/천계 정벌',
        tx: 104,
        ty: 31,
        w: 8,
        h: 6,
        doorTx: 108,
        doorTy: 38,
        accent: '#f97316',
        iconLabel: '⚔️',
        spriteKind: 'special_base',
        action: { kind: 'dominion_tab', tab: 'decree' },
        extraActions: [
            { label: '공포의 칙령 선포', action: { kind: 'dominion_tab', tab: 'decree' } },
            { label: '제국 총사령부 (정벌 작전)', action: { kind: 'war_command' } }
        ]
    },
    {
        id: 'extraction_tower',
        name: '마력 추출 탑 · 징용광산',
        subtitle: '마력 추출 · 대규모 강제 징용 · 시설 증축',
        tx: 30,
        ty: 67,
        w: 8,
        h: 6,
        doorTx: 34,
        doorTy: 74,
        accent: '#ec4899',
        iconLabel: '🩸',
        spriteKind: 'special_abyss',
        action: { kind: 'dominion_tab', tab: 'extraction' },
        extraActions: [
            { label: '마력 추출 및 강제 징용', action: { kind: 'dominion_tab', tab: 'extraction' } },
            { label: '마계 시설 증축', action: { kind: 'dominion_tab', tab: 'facility' } }
        ]
    },
    {
        id: 'torture_overseer',
        name: '고문 · 집행 감독청',
        subtitle: '감독관 · 집행관 인사 관리',
        tx: 102,
        ty: 67,
        w: 8,
        h: 6,
        doorTx: 106,
        doorTy: 74,
        accent: '#f43f5e',
        iconLabel: '⚖️',
        spriteKind: 'house',
        action: { kind: 'dominion_tab', tab: 'personnel' }
    },
    {
        id: 'abyss_forge',
        name: '심연 무구 대장간',
        subtitle: '마계 무구 · 마왕 장비 제작',
        tx: 43,
        ty: 85,
        w: 7,
        h: 5,
        doorTx: 46,
        doorTy: 91,
        accent: '#fb7185',
        iconLabel: '🔨',
        spriteKind: 'shop',
        action: { kind: 'dominion_tab', tab: 'equipment' }
    },
    {
        id: 'abyss_rift_gate',
        name: '무한 심연 균열 포탈',
        subtitle: '차원 미궁 · 무한 심연 탑 (Lv.2,000+)',
        tx: 90,
        ty: 85,
        w: 7,
        h: 5,
        doorTx: 93,
        doorTy: 91,
        accent: '#c084fc',
        iconLabel: '🌀',
        spriteKind: 'dimensional_rift',
        action: { kind: 'abyss_tower' }
    }
];

const buildMagyeDecorations = (): MagyeDeco[] => {
    const decos: MagyeDeco[] = [
        { tx: 70, ty: 60, pack: 'culture', part: 'fountain', scale: 3.4 },
        { tx: 70, ty: 38, pack: 'fantasy', part: 'rune_pad', scale: 2.2 },
        { tx: 63, ty: 35, pack: 'fantasy', part: 'obelisk', scale: 1.7 },
        { tx: 77, ty: 35, pack: 'fantasy', part: 'obelisk', scale: 1.7 },
        { tx: 63, ty: 54, pack: 'fantasy', part: 'brazier', scale: 1.5 },
        { tx: 77, ty: 54, pack: 'fantasy', part: 'brazier', scale: 1.5 },
        { tx: 63, ty: 66, pack: 'fantasy', part: 'brazier', scale: 1.5 },
        { tx: 77, ty: 66, pack: 'fantasy', part: 'brazier', scale: 1.5 }
    ];
    for (let ty = 42; ty <= 98; ty += 7) {
        if (Math.abs(ty - 60) <= 5 || Math.abs(ty - 74) <= 3 || Math.abs(ty - 92) <= 3) continue;
        decos.push({ tx: 66, ty, pack: 'culture', part: 'lamp', scale: 1.3 });
        decos.push({ tx: 74, ty, pack: 'culture', part: 'lamp', scale: 1.3 });
        decos.push({ tx: 64, ty, pack: 'culture', part: 'tree', scale: 1.7 });
        decos.push({ tx: 76, ty, pack: 'culture', part: 'tree', scale: 1.7 });
        decos.push({ tx: 67, ty: ty + 3, pack: 'fantasy', part: 'banner', scale: 1.25 });
        decos.push({ tx: 73, ty: ty + 3, pack: 'fantasy', part: 'banner', scale: 1.25 });
    }
    for (let tx = 14; tx <= 126; tx += 12) {
        if (Math.abs(tx - 70) < 10) continue;
        decos.push({ tx, ty: 22, pack: 'culture', part: 'tree', scale: 1.8 });
        decos.push({ tx, ty: 50, pack: 'nature', part: 'boulders', scale: 1.4 });
        decos.push({ tx, ty: 80, pack: 'fantasy', part: 'crystal', scale: 1.4 });
        decos.push({ tx, ty: 100, pack: 'culture', part: 'tree', scale: 1.8 });
    }
    return decos;
};

const MAGYE_DECOS = buildMagyeDecorations();

const MagyeDominionCanvas: React.FC<MagyeDominionCanvasProps> = ({
    character,
    region,
    nation,
    city,
    onExitToCity,
    onUpdateCharacter,
    onAction,
    onBattle,
    onOpenAbyssTower
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapRef = useRef<HTMLCanvasElement | null>(null);
    const scaledImgCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const minimapBgCacheRef = useRef<HTMLCanvasElement | null>(null);

    const [activeDominionTab, setActiveDominionTab] = useState<MagyeDominionTab | null>(null);
    const [isAwakeningOpen, setIsAwakeningOpen] = useState(false);
    const [isPromoteOpen, setIsPromoteOpen] = useState(false);
    const [isWarOpen, setIsWarOpen] = useState(false);
    const [selectedBuildingMenu, setSelectedBuildingMenu] = useState<MagyeBuilding | null>(null);
    const [selectedNpc, setSelectedNpc] = useState<MagyeNpc | null>(null);
    const [authAlert, setAuthAlert] = useState<string | null>(null);
    const [nearbyBuilding, setNearbyBuilding] = useState<MagyeBuilding | null>(null);
    const [nearbyNpc, setNearbyNpc] = useState<MagyeNpc | null>(null);
    const prevNearBIdRef = useRef<string | null>(null);
    const prevNearNIdRef = useRef<string | null>(null);

    const cultureKey: CityCultureKey = useMemo(
        () => resolveCityCultureKey(region, nation, city),
        [region, nation, city]
    );

    const dominion: DominionData = character.magyeDominions?.[city] || {
        fear: 0,
        corruption: 0,
        facilityLevels: { harvester: 1, breeder: 1, torture: 1 },
        personnel: { overseerIds: [], executionerIds: [] }
    };

    const allComps = useMemo(
        () => [...character.companions, ...(character.inactiveCompanions || [])],
        [character.companions, character.inactiveCompanions]
    );

    const requiredDominionJob = MAGYE_DOMINION_MAP[city || ''];
    const activeDominator = useMemo(() => {
        if (!requiredDominionJob) return null;
        if (character.job === requiredDominionJob) return character;
        return allComps.find(c => c.job === requiredDominionJob) || null;
    }, [character, allComps, requiredDominionJob]);

    const isImperialCapital = city === '임페리얼';
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);
    const hasMagyeAuth = isImperialCapital
        ? (character.job === JobType.DEMON_GOD || allComps.some(c => c.job === JobType.DEMON_GOD) || isMagyeLeader)
        : !!activeDominator;
    const isPlayerDominionOwner = isImperialCapital
        ? (character.job === JobType.DEMON_GOD || isMagyeLeader)
        : (!!requiredDominionJob && character.job === requiredDominionJob);
    const isShingyeEnemy = !isPlayerDominionOwner && !activeDominator && ((character.job || '').includes('사자') || (character.race || '').includes('천사'));
    const honorificTitle = character.job === JobType.DEMON_GOD
        ? `마신 ${character.name}님`
        : isPlayerDominionOwner
            ? `${character.name} 제너럴님`
            : `${character.name}님`;
    const praisedTarget = isPlayerDominionOwner
        ? honorificTitle
        : activeDominator
            ? `${activeDominator.name}님`
            : null;
    const bubbleTone: 'praise' | 'hostile' | 'neutral' = praisedTarget ? 'praise' : isShingyeEnemy ? 'hostile' : 'neutral';

    const playerSprite = useMemo(
        () => resolveEntityRpgSprite(character, region, nation),
        [character, region, nation]
    );

    const npcs = useMemo<MagyeNpc[]>(() => {
        const list: MagyeNpc[] = [];
        const targetLabel = praisedTarget || `${requiredDominionJob || '마신황'}님`;
        const addUnit = (
            id: string,
            name: string,
            role: string,
            tx: number,
            ty: number,
            gender: RpgSpriteGenderKey,
            reverenceLine: string,
            dialogue: string,
            action?: MagyeActionKind,
            isBeast = false
        ) => {
            const spr = resolveEntityRpgSprite({ name, gender } as any, '마계', nation);
            const finalLine =
                bubbleTone === 'hostile'
                    ? `⚔️ 신계의 사자가 감히 마계 지배지에 발을 들이다니!`
                    : bubbleTone === 'neutral'
                        ? `이곳은 ${requiredDominionJob || '마신황'}의 영지입니다.`
                        : reverenceLine;
            const finalDialogue =
                bubbleTone === 'hostile'
                    ? `당장 물러나라! 신계의 자가 ${city}의 성채를 더럽히는 꼴은 두고 볼 수 없다!`
                    : bubbleTone === 'neutral'
                        ? `이곳은 ${requiredDominionJob || '마신황'}의 영지입니다. 해당 직책을 지닌 분만 통치할 수 있습니다.`
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
                bubbleTone,
                patrolRadius: isBeast ? 1.6 : 2.2,
                reverenceLine: finalLine,
                dialogue: finalDialogue,
                action,
                isBeast
            });
        };

        addUnit(
            'magye_grand_chancellor',
            '대집정관 베리알',
            '흑요석 왕좌 총괄',
            70,
            39,
            'male',
            `${targetLabel}의 어명을 받들 준비가 되어 있습니다!`,
            `${targetLabel}, 현재 공포도 ${dominion.fear} · 타락도 ${dominion.corruption}입니다. 칙령을 내리시겠습니까?`,
            { kind: 'dominion_tab', tab: 'overview' }
        );
        addUnit(
            'magye_war_marshal',
            '심연 참모총장 바알',
            '제국 총사령부 지휘관',
            108,
            40,
            'male',
            `충성! ${targetLabel}, 군단이 출진을 기다립니다!`,
            `${targetLabel}의 깃발 아래 인간계와 천계를 굴복시킬 때입니다.`,
            { kind: 'war_command' }
        );
        addUnit(
            'magye_beast_tamer',
            '마수 조련사 릴리스',
            '심연 마수 관리관',
            32,
            40,
            'female',
            `${targetLabel}의 발아래 모든 마수가 복종합니다!`,
            `${targetLabel}, 심연 마수들의 육성과 변이 실험이 순조롭게 진행 중입니다.`,
            { kind: 'dominion_tab', tab: 'beast' },
            true
        );
        addUnit(
            'magye_extractor',
            '영혼 수확자 모로크',
            '마력 추출 · 징용 감독',
            34,
            76,
            'male',
            `${targetLabel}께 영혼과 마력의 정수를 바칩니다!`,
            `수확기와 징용광산이 ${targetLabel}의 이름으로 쉼 없이 가동 중입니다.`,
            { kind: 'dominion_tab', tab: 'extraction' }
        );

        const overseerSpawns = [
            [67, 52], [73, 52], [105, 76], [108, 76]
        ];
        (dominion.personnel?.overseerIds || []).slice(0, 4).forEach((oid, idx) => {
            const comp = allComps.find(c => c.id === oid);
            if (!comp) return;
            const [sx, sy] = overseerSpawns[idx % overseerSpawns.length];
            addUnit(
                `overseer_${comp.id}`,
                comp.name,
                '마계 감독관',
                sx,
                sy,
                comp.gender === '여성' ? 'female' : 'male',
                `${honorificTitle}의 공포 정치를 집행 중입니다!`,
                `${honorificTitle}, 영지 내 반란의 기미는 즉시 분쇄하고 있습니다.`,
                { kind: 'dominion_tab', tab: 'personnel' }
            );
        });

        const execSpawns = [
            [67, 74], [73, 74], [46, 93], [93, 93]
        ];
        (dominion.personnel?.executionerIds || []).slice(0, 4).forEach((eid, idx) => {
            const comp = allComps.find(c => c.id === eid);
            if (!comp) return;
            const [sx, sy] = execSpawns[idx % execSpawns.length];
            addUnit(
                `exec_${comp.id}`,
                comp.name,
                '마계 집행관',
                sx,
                sy,
                comp.gender === '여성' ? 'female' : 'male',
                `${honorificTitle}의 적에게 자비는 없습니다!`,
                `처형 대기자와 징용 인력 통제가 완벽합니다.`,
                { kind: 'dominion_tab', tab: 'personnel' }
            );
        });

        const defaultGuards: Array<[string, string, number, number, RpgSpriteGenderKey]> = [
            ['mguard_1', '흑요석 근위기사', 66, 95, 'male'],
            ['mguard_2', '흑요석 근위기사', 74, 95, 'male'],
            ['mguard_3', '혈석 친위병', 66, 44, 'male'],
            ['mguard_4', '혈석 친위병', 74, 44, 'male'],
            ['mmaid_1', '심연 시종', 58, 56, 'female'],
            ['mmaid_2', '어둠의 서기관', 82, 56, 'female'],
            ['msmith_1', '심연 대장장이 카인', 46, 93, 'male']
        ];
        defaultGuards.forEach(([id, role, gx, gy, g]) => {
            addUnit(
                id,
                role,
                '마계 제국군',
                gx,
                gy,
                g,
                `전군 경례! ${honorificTitle}의 패업에 복종합니다!`,
                `마계 전역의 마족들이 ${honorificTitle}의 압도적 위엄을 두려워하며 우러러봅니다.`
            );
        });

        return list;
    }, [nation, city, requiredDominionJob, praisedTarget, bubbleTone, dominion.fear, dominion.corruption, dominion.personnel, allComps]);

    const npcRuntimeRef = useRef<MagyeNpc[]>([]);
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
    const hasOverlayOpen = !!(activeDominionTab || isAwakeningOpen || isPromoteOpen || isWarOpen || selectedBuildingMenu || selectedNpc || authAlert);
    useEffect(() => {
        modalOpenRef.current = hasOverlayOpen;
        if (hasOverlayOpen) {
            keysRef.current.clear();
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;
        }
    }, [hasOverlayOpen]);

    useEffect(() => {
        if (playerSprite.url) loadRpgSpriteImage(playerSprite.url);
        npcs.forEach(n => {
            if (n.spriteUrl) loadRpgSpriteImage(n.spriteUrl);
        });
        const assetUrls = new Set<string>([
            ...(['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).map(p => getTerrainTileUrl(cultureKey, p)),
            ...MAGYE_BUILDINGS.map(b => getBuildingSpriteUrl(cultureKey, b.spriteKind)),
            ...MAGYE_DECOS.map(d => resolveDecorationSpriteUrl(cultureKey, d.pack, d.part))
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

    const triggerAction = useCallback((action: MagyeActionKind) => {
        if (action.kind === 'abyss_tower') {
            if (onOpenAbyssTower) onOpenAbyssTower();
            else setAuthAlert('무한 심연 탑은 도시 메인 화면에서 입장할 수 있습니다.');
            return;
        }
        if (action.kind === 'awakening') {
            setIsAwakeningOpen(true);
            return;
        }
        if (!hasMagyeAuth) {
            setAuthAlert(
                `이 마계 지배지는 [마신] 또는 [제너럴] 직업을 보유한 본인 또는 담당 동료가 있어야 관리할 수 있습니다.\n(현재: 관람 모드 — 왕좌와 마계 병영을 둘러볼 수 있습니다.)`
            );
            return;
        }
        if (action.kind === 'promote') setIsPromoteOpen(true);
        else if (action.kind === 'war_command') setIsWarOpen(true);
        else if (action.kind === 'dominion_tab') setActiveDominionTab(action.tab);
    }, [hasMagyeAuth, onOpenAbyssTower]);

    const interactNearest = useCallback(() => {
        const p = playerRef.current;
        let bestB: MagyeBuilding | null = null;
        let bestBD = TILE * 3.0;
        for (const b of MAGYE_BUILDINGS) {
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
        let bestN: MagyeNpc | null = null;
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

    const warpToZone = (b: MagyeBuilding) => {
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
        for (const b of MAGYE_BUILDINGS) {
            if (tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h) return true;
        }
        return false;
    };

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();

        const embers = Array.from({ length: 50 }, (_, i) => ({
            x: ((i * 7919) % (COLS * TILE)),
            y: ((i * 4129) % (ROWS * TILE)),
            speed: 18 + (i % 5) * 6,
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

                    let nearB: MagyeBuilding | null = null;
                    let nearBD = TILE * 3.0;
                    for (const b of MAGYE_BUILDINGS) {
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

                    let nearN: MagyeNpc | null = null;
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
                            const ang = now * 0.0005 + idx * 1.9;
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
                                else { ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isWaterRing) {
                                if (waterImg && waterImg.complete && waterImg.naturalWidth > 0) drawScaledImg(ctx, waterImg, `water_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#991b1b'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isRoyal) {
                                if (royalImg && royalImg.complete && royalImg.naturalWidth > 0) drawScaledImg(ctx, royalImg, `royal_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#3f3f46'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isPlaza) {
                                if (plazaImg && plazaImg.complete && plazaImg.naturalWidth > 0) drawScaledImg(ctx, plazaImg, `plaza_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#27272a'; ctx.fillRect(x, y, TILE, TILE); }
                            } else if (isCrossRoad) {
                                if (roadImg && roadImg.complete && roadImg.naturalWidth > 0) drawScaledImg(ctx, roadImg, `road_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#3f3f46'; ctx.fillRect(x, y, TILE, TILE); }
                            } else {
                                if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) drawScaledImg(ctx, groundImg, `ground_${cultureKey}`, x, y, TILE, TILE);
                                else { ctx.fillStyle = '#18181b'; ctx.fillRect(x, y, TILE, TILE); }
                            }
                        }
                    }

                    MAGYE_DECOS.forEach(d => {
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

                    MAGYE_BUILDINGS.forEach(b => {
                        const bx = b.tx * TILE;
                        const by = b.ty * TILE;
                        const bw = b.w * TILE;
                        const bh = b.h * TILE;
                        if (bx + bw < camX - 120 || bx > camX + canvas.width + 120 || by + bh < camY - 120 || by > camY + canvas.height + 120) return;

                        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                        ctx.fillRect(bx + 8, by + bh - 14, bw - 16, 20);

                        const bUrl = getBuildingSpriteUrl(cultureKey, b.spriteKind);
                        const bImg = getCachedCityAssetImage(bUrl);
                        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                            drawScaledImg(ctx, bImg, `bld_${bUrl}`, bx - 12, by - 24, bw + 24, bh + 28);
                        } else {
                            ctx.fillStyle = '#18181b';
                            ctx.fillRect(bx, by, bw, bh);
                            ctx.strokeStyle = b.accent;
                            ctx.lineWidth = 3;
                            ctx.strokeRect(bx, by, bw, bh);
                        }

                        ctx.font = 'bold 13px sans-serif';
                        const label = `${b.iconLabel} ${b.name}`;
                        const tw = ctx.measureText(label).width + 22;
                        ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
                        ctx.fillRect(bx + bw / 2 - tw / 2, by - 36, tw, 24);
                        ctx.strokeStyle = b.accent;
                        ctx.lineWidth = 1.6;
                        ctx.strokeRect(bx + bw / 2 - tw / 2, by - 36, tw, 24);
                        ctx.fillStyle = '#fecaca';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, bx + bw / 2, by - 19);
                    });

                    npcRuntimeRef.current.forEach(n => {
                        const nx = n.tx * TILE + TILE / 2;
                        const ny = n.ty * TILE + TILE / 2;
                        if (nx < camX - 90 || nx > camX + canvas.width + 90 || ny < camY - 90 || ny > camY + canvas.height + 90) return;

                        const spr = getCachedRpgSpriteImage(n.spriteUrl);
                        const drawSize = n.isBeast ? 62 : 48;
                        if (spr && spr.complete && spr.naturalWidth > 0) {
                            ctx.fillStyle = 'rgba(0,0,0,0.35)';
                            ctx.beginPath();
                            ctx.ellipse(nx, ny + 18, 13, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                            const cellW = spr.naturalWidth / 3;
                            const cellH = spr.naturalHeight / 4;
                            const row = DIRECTION_ROW_MAP[n.dir] ?? 0;
                            ctx.drawImage(spr, cellW, row * cellH, cellW, cellH, nx - drawSize / 2, ny - drawSize / 2 - 4, drawSize, drawSize);
                        } else {
                            drawFallbackChibiSprite(ctx, nx, ny + 18, drawSize, n.dir, 1, 'magye', n.gender);
                        }

                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const ntw = ctx.measureText(n.name).width + 12;
                        ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
                        ctx.fillRect(nx - ntw / 2, ny + 22, ntw, 16);
                        ctx.fillStyle = n.isBeast ? '#d8b4fe' : '#fca5a5';
                        ctx.fillText(n.name, nx, ny + 34);

                        const distToP = Math.hypot(p.x - nx, p.y - ny);
                        if (distToP < TILE * 3.8) {
                            const prefix = n.bubbleTone === 'hostile' ? '⚔️ ' : n.bubbleTone === 'neutral' ? '💬 ' : '🔥 ';
                            const bubble = `${prefix}${n.reverenceLine}`;
                            ctx.font = 'bold 11px sans-serif';
                            const btw = ctx.measureText(bubble).width + 18;
                            ctx.fillStyle = n.bubbleTone === 'neutral' ? 'rgba(24, 24, 27, 0.94)' : 'rgba(69, 10, 10, 0.94)';
                            ctx.fillRect(nx - btw / 2, ny - 54, btw, 22);
                            ctx.strokeStyle = n.bubbleTone === 'neutral' ? '#71717a' : '#ef4444';
                            ctx.lineWidth = 1.4;
                            ctx.strokeRect(nx - btw / 2, ny - 54, btw, 22);
                            ctx.fillStyle = '#fee2e2';
                            ctx.fillText(bubble, nx, ny - 39);
                        }
                    });

                    const pspr = getCachedRpgSpriteImage(playerSprite.url);
                    if (pspr && pspr.complete && pspr.naturalWidth > 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.38)';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + 18, 13, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const cellW = pspr.naturalWidth / 3;
                        const cellH = pspr.naturalHeight / 4;
                        const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                        const col = Math.max(0, Math.min(2, p.walkFrame));
                        ctx.drawImage(pspr, col * cellW, row * cellH, cellW, cellH, p.x - 24, p.y - 28, 48, 48);
                    } else {
                        drawFallbackChibiSprite(ctx, p.x, p.y + 18, 46, p.dir, p.walkFrame, 'magye', playerSprite.genderKey);
                    }
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    const ptw = ctx.measureText(honorificTitle).width + 14;
                    ctx.fillStyle = 'rgba(9, 9, 11, 0.9)';
                    ctx.fillRect(p.x - ptw / 2, p.y + 22, ptw, 17);
                    ctx.fillStyle = '#fca5a5';
                    ctx.fillText(honorificTitle, p.x, p.y + 35);

                    embers.forEach(pt => {
                        pt.y -= pt.speed * dt;
                        if (pt.y < 0) pt.y = ROWS * TILE;
                        if (pt.x >= camX && pt.x <= camX + canvas.width && pt.y >= camY && pt.y <= camY + canvas.height) {
                            ctx.fillStyle = 'rgba(239, 68, 68, 0.58)';
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });

                    ctx.restore();

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
                                    bctx.fillStyle = '#09090b';
                                    bctx.fillRect(0, 0, mm.width, mm.height);
                                    bctx.fillStyle = '#1f1218';
                                    bctx.fillRect(3 * sx, 4 * sy, (COLS - 6) * sx, (ROWS - 7) * sy);
                                    bctx.fillStyle = '#52525b';
                                    bctx.fillRect(68 * sx, 34 * sy, 5 * sx, 70 * sy);
                                    bctx.fillRect(32 * sx, 36 * sy, 76 * sx, 5 * sy);
                                    bctx.fillRect(34 * sx, 72 * sy, 72 * sx, 5 * sy);
                                    MAGYE_BUILDINGS.forEach(b => {
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
    }, [playerSprite.url, honorificTitle, cultureKey]);

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

        for (const b of MAGYE_BUILDINGS) {
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
        <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-full block cursor-pointer"
            />

            {/* 상단 HUD */}
            <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
                <div className="bg-zinc-950/90 border border-red-500/50 rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-3">
                    <Skull size={18} className="text-red-400" />
                    <div>
                        <div className="text-xs font-black text-red-200">{isImperialCapital ? '마신황의 궁궐 (임페리얼)' : `${city || '제너럴'} 제너럴의 궁궐`}</div>
                        <div className="text-[10px] text-zinc-400">
                            공포도 {dominion.fear} · 타락도 {dominion.corruption} · 악명 {(character.infamy || 0).toLocaleString()}
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hasMagyeAuth ? 'bg-red-950/80 border-red-400 text-red-300' : 'bg-zinc-900 border-zinc-600 text-zinc-400'}`}>
                        {hasMagyeAuth ? '🔥 지배권 보유' : '👁️ 관람 모드'}
                    </span>
                </div>
                <button
                    onClick={onExitToCity}
                    className="bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-600 text-zinc-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                    <DoorOpen size={14} /> 지배지 밖으로
                </button>
            </div>

            {/* 우상단 미니맵 */}
            <div className="absolute top-3 right-3 z-20 bg-zinc-950/90 border border-red-500/40 rounded-xl p-2 shadow-xl">
                <div className="text-[10px] font-bold text-red-300 mb-1 flex items-center justify-between">
                    <span>마계 지배지 미니맵 (140×110)</span>
                    <Compass size={11} />
                </div>
                <canvas ref={minimapRef} width={168} height={132} className="rounded border border-zinc-800 block" />
            </div>

            {/* 좌측 빠른 워프 바 */}
            <div className="absolute left-3 top-20 z-20 flex flex-col gap-1.5 max-h-[65vh] overflow-y-auto">
                {MAGYE_BUILDINGS.map(b => (
                    <button
                        key={b.id}
                        onClick={() => warpToZone(b)}
                        className="bg-zinc-950/85 hover:bg-red-950/80 border border-red-500/35 hover:border-red-400 text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-100 shadow flex items-center gap-1.5 transition-all"
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
                        className="bg-gradient-to-r from-red-700 to-rose-600 text-white font-black text-xs px-5 py-2.5 rounded-full shadow-[0_0_25px_rgba(239,68,68,0.55)] flex items-center gap-2 animate-bounce"
                    >
                        <Flame size={15} />
                        {nearbyBuilding
                            ? `${nearbyBuilding.iconLabel} ${nearbyBuilding.name} 입장 (Space)`
                            : `💬 ${nearbyNpc?.name} 대화하기 (Space)`}
                    </button>
                </div>
            )}

            {/* 복합 건물 기능 선택 팝업 */}
            {selectedBuildingMenu && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border-2 border-red-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-red-300">{selectedBuildingMenu.iconLabel} {selectedBuildingMenu.name}</h3>
                                <p className="text-xs text-zinc-400">{selectedBuildingMenu.subtitle}</p>
                            </div>
                            <button onClick={() => setSelectedBuildingMenu(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {selectedBuildingMenu.extraActions?.map((act, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setSelectedBuildingMenu(null);
                                        triggerAction(act.action);
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-xl bg-zinc-950 hover:bg-red-950/60 border border-red-500/30 hover:border-red-400 text-sm font-bold text-red-100 flex items-center justify-between"
                                >
                                    <span>{act.label}</span>
                                    <Sparkles size={14} className="text-red-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* NPC 대화 창 */}
            {selectedNpc && (
                <div className="fixed inset-0 z-50 bg-black/65 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-zinc-900 border-2 border-red-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs text-red-400 font-bold">{selectedNpc.role}</div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <MessageSquare size={16} className="text-red-400" />
                                    {selectedNpc.name}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedNpc(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800">
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
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs"
                                >
                                    해당 통치 기능 열기
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedNpc(null)}
                                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
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
                    <div className="bg-zinc-900 border-2 border-rose-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-center">
                        <Lock size={34} className="text-rose-400 mx-auto" />
                        <h3 className="text-base font-black text-white">지배 권한 필요</h3>
                        <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{authAlert}</p>
                        <button onClick={() => setAuthAlert(null)} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs">
                            확인
                        </button>
                    </div>
                </div>
            )}

            {activeDominionTab && (
                <MagyeDominionModal
                    character={character}
                    initialTab={activeDominionTab}
                    singleTabOnly={true}
                    onClose={() => setActiveDominionTab(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isAwakeningOpen && (
                <MagyeAwakeningModal
                    character={character}
                    onClose={() => setIsAwakeningOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isPromoteOpen && (
                <MagyePromoteModal
                    character={character}
                    onClose={() => setIsPromoteOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isWarOpen && (
                <MagyeWarModal
                    character={character}
                    onClose={() => setIsWarOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, c, n) => onBattle?.(enemy, type, source, c, n)}
                    onAction={onAction}
                />
            )}
        </div>
    );
};

export default MagyeDominionCanvas;
