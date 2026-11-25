import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Character, CityTier, DistrictType, DivineDiplomacyStatus, Quest } from '../types';
import HuntMapModal from './HuntMapModal';
import {
    buildCityTilemap,
    CITY_TILE_SIZE,
    CityNpcEntity,
    CityPortalNode,
    findPathBFS
} from '../services/cityTilemapEngine';
import {
    buildCityQuestMapEntities,
    buildRegionalDefenseEnemies,
    CityQuestMonsterEntity,
    CityQuestNpcEntity,
    classifyActiveCityQuests,
    clearExpiredQuestNotificationsState,
    getPortalQuestBadge,
    startEscortQuestState
} from '../services/cityQuestService';
import FrontlineModal from './FrontlineModal';
import MilitaryCityActionPanel from './MilitaryCityActionPanel';
import MilitaryInfiltrationModal from './MilitaryInfiltrationModal';
import RegionalAdminCanvas from './RegionalAdminCanvas';
import ActionResultModal, { ResultData } from './ActionResultModal';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    getRpgSpriteUrlByKey,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import {
    CultureAssetPart,
    getBaseBuildingSpriteUrl,
    getBuildingSpriteUrl,
    getCachedCityAssetImage,
    getCultureAssetUrl,
    getPropAssetUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    TerrainTilePart
} from '../services/cityAssetManifest';
import { getGroundTileTextures } from '../services/cityGroundTextureEngine';
import {
    ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, CornerDownLeft,
    Map as MapIcon, MessageSquare, Sparkles, ChevronUp, ChevronDown,
    ScrollText, ShieldAlert, Truck, Flame, BookOpen, Swords, AlertTriangle, X
} from 'lucide-react';

export interface CityRpgCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    tier: CityTier;
    activeDistricts: DistrictType[];
    hasBaseInCurrentLocation: boolean;
    isElfNation: boolean;
    isBeastNation: boolean;
    isDemonNation: boolean;
    canOpenTranscendentArena?: boolean;
    canOpenAbyssTower?: boolean;
    timePeriod: 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'shingye';
    timeLabel: string;
    currentTime?: string;
    backgroundImageUrl?: string;
    backgroundFallbackUrl?: string;
    backgroundRawUrl?: string;
    backgroundFilterClass?: string;
    isMythicBoss: boolean;
    bossName?: string;
    onEnterCity: (district?: DistrictType | 'Gate', openHuntMap?: boolean) => void;
    onOpenDungeon: () => void;
    onOpenMap: () => void;
    onOpenBase?: () => void;
    onOpenElfCity?: () => void;
    onOpenDemonCity?: () => void;
    onOpenBeastCity?: () => void;
    onOpenTranscendentArena?: () => void;
    onOpenAbyssTower?: () => void;
    onInspectCompanion?: (companionId: string) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string) => void;
    onStartBattle?: (enemies: any[], battleType: string, sourceId?: string) => void;
    onAction?: (action: string) => void;
    onOpenRegionalAdmin?: () => void;
}

interface TrailPoint {
    x: number;
    y: number;
    dir: SpriteDirection;
}

interface DustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

interface ActiveDialogue {
    npcName: string;
    npcRole: string;
    spriteUrl?: string;
    lines: string[];
    lineIndex: number;
    actionLabel?: string;
    onActionAfter?: () => void;
}

const CityRpgCanvas: React.FC<CityRpgCanvasProps> = ({
    character,
    region,
    nation,
    city,
    tier,
    activeDistricts,
    hasBaseInCurrentLocation,
    isElfNation,
    isBeastNation,
    isDemonNation,
    canOpenTranscendentArena,
    canOpenAbyssTower,
    timePeriod,
    timeLabel,
    currentTime = '08:00',
    backgroundImageUrl,
    backgroundFallbackUrl,
    backgroundRawUrl,
    backgroundFilterClass = '',
    isMythicBoss,
    bossName,
    onEnterCity,
    onOpenDungeon,
    onOpenMap,
    onOpenBase,
    onOpenElfCity,
    onOpenDemonCity,
    onOpenBeastCity,
    onOpenTranscendentArena,
    onOpenAbyssTower,
    onInspectCompanion,
    onUpdateCharacter,
    onStartBattle,
    onAction,
    onOpenRegionalAdmin
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 960, height: 560 });
    const [dialogue, setDialogue] = useState<ActiveDialogue | null>(null);
    const [typedChars, setTypedChars] = useState(0);
    const [nearbyLabel, setNearbyLabel] = useState<string>('');
    const [showQuickBar, setShowQuickBar] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 640 : true
    );
    const [showQuestHud, setShowQuestHud] = useState<boolean>(false);
    const [isFrontlineOpen, setIsFrontlineOpen] = useState<boolean>(false);
    const [showMilitaryOpsModal, setShowMilitaryOpsModal] = useState<boolean>(false);
    const [isInfiltrationModalOpen, setIsInfiltrationModalOpen] = useState<boolean>(false);
    const [showRegionalAdmin, setShowRegionalAdmin] = useState<boolean>(false);
    const [isHuntInfoOpen, setIsHuntInfoOpen] = useState<boolean>(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [, setSpriteTick] = useState(0);

    // 1. 현재 도시 타일맵 생성
    const mapData = useMemo(
        () =>
            buildCityTilemap({
                region,
                nation,
                city,
                tier,
                activeDistricts,
                hasBaseInCurrentLocation,
                isElfNation,
                isBeastNation,
                isDemonNation,
                canOpenTranscendentArena,
                canOpenAbyssTower,
                timeLabel,
                isMythicBoss,
                bossName,
                baseLevel: character.base?.level || 1,
                playerAge: character.age
            }),
        [
            region,
            nation,
            city,
            tier,
            activeDistricts.join(','),
            hasBaseInCurrentLocation,
            isElfNation,
            isBeastNation,
            isDemonNation,
            canOpenTranscendentArena,
            canOpenAbyssTower,
            timeLabel,
            isMythicBoss,
            bossName,
            character.base?.level,
            character.age
        ]
    );

    const playerSprite = useMemo(
        () => resolveEntityRpgSprite(character, region, nation),
        [character.rpgSpriteKey, character.customSpriteUrl, character.id, character.name, character.gender, character.race, region, nation]
    );
    const playerRegionKey: RpgSpriteRegionKey = playerSprite.regionKey;
    const playerGenderKey: RpgSpriteGenderKey = playerSprite.genderKey;
    const playerSpriteUrl = playerSprite.url;

    const isRegionalAuthority = useMemo(() => {
        if (!character.militaryData) return false;
        const playerIsCmdr = character.militaryData.regionalAppointments?.[city] === 'player';
        const playerIsVice = character.militaryData.regionalViceAppointments?.[city] === 'player';
        const compIsCmdr = (character.companions || []).some(c => character.militaryData?.regionalAppointments?.[city] === c.id);
        const compIsVice = (character.companions || []).some(c => character.militaryData?.regionalViceAppointments?.[city] === c.id);
        return playerIsCmdr || playerIsVice || compIsCmdr || compIsVice;
    }, [character.militaryData, character.companions, city]);

    // 용병단/군대 퀘스트 분류 및 맵 엔티티 생성
    const classifiedQuests = useMemo(
        () => classifyActiveCityQuests(character, city, nation),
        [character, city, nation]
    );
    const questEntities = useMemo(
        () => buildCityQuestMapEntities(classifiedQuests, city, nation, region, mapData, character.level),
        [classifiedQuests, city, nation, region, mapData, character.level]
    );

    const triggerEmergencyBattle = useCallback(
        (quest: Quest) => {
            if (!onStartBattle) {
                onEnterCity(quest.type === 'MilitaryRegionalDefense' ? 'Military' : 'Mercenary');
                return;
            }
            const { enemies, battleType } = buildRegionalDefenseEnemies(quest, character, { nation, city, region });
            onStartBattle(enemies, battleType, quest.id);
        },
        [onStartBattle, onEnterCity, character, nation, city, region]
    );

    const handleStartEscortQuest = useCallback(
        (quest: Quest) => {
            if (!onUpdateCharacter) return;
            const res = startEscortQuestState(character, quest.id);
            if (!res) {
                setResultData({
                    type: 'warning',
                    title: '오류 발생',
                    message: '해당 호위 임무 데이터를 찾을 수 없습니다. 퀘스트 목록을 확인해주세요.',
                    items: [{ label: '퀘스트 ID', after: quest.id }]
                });
                return;
            }
            const logMsg = `[호송/호위 시작] ${res.quest.title} - 목적지 ${res.quest.destination?.city || '지정 도시'}까지 이동 시작`;
            onUpdateCharacter(res.updatedChar, logMsg);
            setResultData({
                type: 'success',
                title: `🛡️ ${res.quest.title} 출발`,
                message: `${res.targetName}이(가) 호위 대열에 합류했습니다! 이제 도시 내에서 뒤를 따라오며, 지도(M)를 열어 목적지 [${res.quest.destination?.city || '목적지'}]로 이동할 수 있습니다.`,
                items: [
                    { label: '목적지 도시', after: res.quest.destination?.city || '알 수 없음' },
                    { label: '목적지 국가', after: res.quest.destination?.nation || '자국' },
                    { label: '예상 보상', after: `${(res.quest.rewardGold || 0).toLocaleString()}G / ${(res.quest.rewardExp || 0).toLocaleString()}EXP` }
                ]
            });
        },
        [character, onUpdateCharacter]
    );

    const handleClearExpiredQuests = useCallback(() => {
        if (!onUpdateCharacter) return;
        const updated = clearExpiredQuestNotificationsState(character);
        onUpdateCharacter(updated, '만료된 퀘스트 알림을 확인했습니다.');
    }, [character, onUpdateCharacter]);

    // 파티 동료(최대 4명) + 호송 중인 NPC 팔로워 스프라이트 정보
    const followers = useMemo(() => {
        const compFollowers = (character.companions || []).slice(0, 4).map((c, idx) => {
            const resolved = resolveEntityRpgSprite(c, region, nation);
            return {
                id: c.id || `comp_${idx}`,
                name: c.name,
                regionKey: resolved.regionKey,
                genderKey: resolved.genderKey,
                spriteUrl: resolved.url,
                isEscort: false,
                destinationCity: ''
            };
        });
        const escortFollowers = questEntities.questFollowers.map(qf => ({
            id: qf.id,
            name: qf.name,
            regionKey: qf.regionKey,
            genderKey: qf.genderKey,
            spriteUrl: qf.spriteUrl,
            isEscort: true,
            destinationCity: qf.destinationCity
        }));
        return [...compFollowers, ...escortFollowers];
    }, [character.companions, questEntities.questFollowers, region, nation]);

    // 필요한 스프라이트 이미지 & 고품질 도시 건물/소품 PNG 프리로드
    useEffect(() => {
        const spriteUrls = new Set<string>([
            playerSpriteUrl,
            ...followers.map(f => f.spriteUrl),
            ...mapData.npcs.map(n => getRpgSpriteUrlByKey(`${n.regionKey}_${n.gender}`)),
            ...questEntities.questNpcs.map(qn => qn.spriteUrl || getRpgSpriteUrlByKey(`${qn.regionKey}_${qn.gender}`)),
            ...questEntities.questMonsters.map(qm => qm.spriteUrl)
        ]);
        const cityAssetUrls = new Set<string>([
            ...(['landmark', 'shop', 'house', 'tree', 'fountain', 'lamp'] as CultureAssetPart[]).map(part =>
                getCultureAssetUrl(mapData.cultureKey, part)
            ),
            ...(['ground', 'road', 'plaza', 'royal_road', 'wall', 'water'] as TerrainTilePart[]).map(part =>
                getTerrainTileUrl(mapData.cultureKey, part)
            ),
            ...mapData.portals
                .filter(pt => pt.actionType !== 'world_map')
                .map(pt => {
                    const customBasePack = (character.base as any)?.customBuildingPack as string | undefined;
                    if (pt.id === 'my_base' && customBasePack) {
                        return getBaseBuildingSpriteUrl(customBasePack, character.base?.level || 1);
                    }
                    return getBuildingSpriteUrl(mapData.cultureKey, pt.spriteKind);
                }),
            ...mapData.props.map(pr => getPropAssetUrl(pr.pack, pr.part)),
            ...questEntities.questMonsters.map(qm => qm.visualUrl).filter((u): u is string => Boolean(u))
        ]);

        let mounted = true;
        spriteUrls.forEach(url => {
            loadRpgSpriteImage(url).then(() => {
                if (mounted) setSpriteTick(t => t + 1);
            });
        });
        cityAssetUrls.forEach(url => {
            loadCityAssetImage(url).then(img => {
                if (mounted && img) setSpriteTick(t => t + 1);
            });
        });
        return () => {
            mounted = false;
        };
    }, [playerSpriteUrl, followers, mapData.npcs, mapData.cultureKey, mapData.portals, mapData.props, questEntities, (character.base as any)?.customBuildingPack, character.base?.level]);

    // 2. 런타임 게임 상태 Refs (60fps 루프용)
    const keysPressedRef = useRef<Set<string>>(new Set());
    const dpadDirRef = useRef<SpriteDirection | null>(null);
    const playerRef = useRef({
        x: mapData.spawnPos.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
        y: mapData.spawnPos.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
        dir: 'down' as SpriteDirection,
        moving: false,
        animTimer: 0,
        walkFrame: 1,
        path: [] as Array<{ x: number; y: number }>,
        pendingPortal: null as CityPortalNode | null,
        pendingNpc: null as CityNpcEntity | null,
        pendingQuestNpc: null as CityQuestNpcEntity | null,
        pendingQuestMob: null as CityQuestMonsterEntity | null
    });
    const trailRef = useRef<TrailPoint[]>([]);
    const npcsRef = useRef<
        Array<
            CityNpcEntity & {
                px: number;
                py: number;
                targetX: number;
                targetY: number;
                waitTimer: number;
                walkFrame: number;
                animTimer: number;
            }
        >
    >([]);
    const questNpcsRef = useRef<CityQuestNpcEntity[]>([]);
    const questMonstersRef = useRef<CityQuestMonsterEntity[]>([]);

    useEffect(() => {
        questNpcsRef.current = questEntities.questNpcs.map(q => ({ ...q }));
        questMonstersRef.current = questEntities.questMonsters.map(m => ({ ...m }));
    }, [questEntities]);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1.5 });
    const particlesRef = useRef<DustParticle[]>([]);
    const dialogueOpenRef = useRef(false);

    useEffect(() => {
        const anyOpen = Boolean(dialogue || showMilitaryOpsModal || isFrontlineOpen || isInfiltrationModalOpen || showRegionalAdmin || isHuntInfoOpen || resultData);
        dialogueOpenRef.current = anyOpen;
        if (anyOpen) {
            keysPressedRef.current.clear();
            dpadDirRef.current = null;
        }
    }, [dialogue, showMilitaryOpsModal, isFrontlineOpen, isInfiltrationModalOpen, showRegionalAdmin, isHuntInfoOpen, resultData]);

    // 도시 전환 시 플레이어·트레일·NPC 초기화
    useEffect(() => {
        const sx = mapData.spawnPos.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
        const sy = mapData.spawnPos.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
        playerRef.current = {
            x: sx,
            y: sy,
            dir: 'down',
            moving: false,
            animTimer: 0,
            walkFrame: 1,
            path: [],
            pendingPortal: null,
            pendingNpc: null,
            pendingQuestNpc: null,
            pendingQuestMob: null
        };
        trailRef.current = Array.from({ length: 64 }, () => ({ x: sx, y: sy, dir: 'down' as SpriteDirection }));
        npcsRef.current = mapData.npcs.map(n => ({
            ...n,
            px: n.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
            py: n.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
            targetX: n.x,
            targetY: n.y,
            waitTimer: 1.2 + Math.random() * 2.5,
            walkFrame: 1,
            animTimer: 0
        }));
        setDialogue(null);
    }, [mapData]);

    // 컨테이너 리사이즈 감지
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                setCanvasSize({
                    width: Math.floor(rect.width),
                    height: Math.floor(rect.height)
                });
            }
        };
        update();
        const obs = new ResizeObserver(update);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // 포탈 실행 핸들러
    const triggerPortalAction = useCallback(
        (portal: CityPortalNode) => {
            switch (portal.actionType) {
                case 'district':
                    onEnterCity(portal.district, portal.openHuntMap);
                    break;
                case 'dungeon':
                    onOpenDungeon();
                    break;
                case 'world_map':
                    onOpenMap();
                    break;
                case 'base':
                    onOpenBase?.();
                    break;
                case 'elf_city':
                    onOpenElfCity?.();
                    break;
                case 'beast_city':
                    onOpenBeastCity?.();
                    break;
                case 'demon_city':
                    onOpenDemonCity?.();
                    break;
                case 'transcendent_arena':
                    onOpenTranscendentArena?.();
                    break;
                case 'abyss_tower':
                    onOpenAbyssTower?.();
                    break;
                case 'regional_admin':
                    if (!isRegionalAuthority) {
                        setResultData({
                            type: 'warning',
                            title: tier === 'Capital' ? '수도 행정청 출입 제한' : '지역행정소 출입 제한',
                            message: `${city}의 지역대장 또는 지역부대장 권한을 보유한 지휘관(본인 또는 직속 동료)만 입장할 수 있습니다.`,
                            items: [{ label: '현재 위치', after: `${nation} · ${city}` }]
                        });
                    } else if (onOpenRegionalAdmin) {
                        onOpenRegionalAdmin();
                    } else {
                        setShowRegionalAdmin(true);
                    }
                    break;
                case 'hunt_info':
                    setIsHuntInfoOpen(true);
                    break;
            }
        },
        [
            onEnterCity,
            onOpenDungeon,
            onOpenMap,
            onOpenBase,
            onOpenElfCity,
            onOpenBeastCity,
            onOpenDemonCity,
            onOpenTranscendentArena,
            onOpenAbyssTower
        ]
    );

    const openQuestNpcDialogue = useCallback(
        (qNpc: CityQuestNpcEntity) => {
            let actionLabel = '진행하기';
            let onActionAfter: (() => void) | undefined;
            if (qNpc.questKind === 'escort_wait' && qNpc.quest) {
                actionLabel = '🛡️ 호송/호위 출발';
                const q = qNpc.quest;
                onActionAfter = () => handleStartEscortQuest(q);
            } else if (qNpc.questKind === 'instructor') {
                actionLabel = '🎓 학원 지구 입장';
                onActionAfter = () => onEnterCity('Academic');
            } else if (qNpc.questKind === 'hunt_board') {
                actionLabel = '⚔️ 외곽 사냥터로 출격';
                onActionAfter = () => onEnterCity('Gate', true);
            } else if (qNpc.questKind === 'dungeon_guide') {
                actionLabel = '🧭 던전 입장';
                onActionAfter = () => onOpenDungeon();
            } else if (qNpc.questKind === 'war_officer') {
                if (classifiedQuests.isWarState) {
                    actionLabel = '🔥 전선 상황실 열기';
                    onActionAfter = () => setIsFrontlineOpen(true);
                } else {
                    actionLabel = '🎖️ 군사 작전 개시 (작전 패널)';
                    onActionAfter = () => setShowMilitaryOpsModal(true);
                }
            }
            setDialogue({
                npcName: qNpc.name,
                npcRole: qNpc.role,
                spriteUrl: qNpc.spriteUrl || getRpgSpriteUrlByKey(`${qNpc.regionKey}_${qNpc.gender}`),
                lines: qNpc.dialogues?.length ? qNpc.dialogues : ((qNpc as any).lines || ['무엇을 도와드릴까요?']),
                lineIndex: 0,
                actionLabel,
                onActionAfter
            });
            setTypedChars(0);
        },
        [handleStartEscortQuest, onEnterCity, onOpenDungeon, classifiedQuests.isWarState]
    );

    // 가장 가까운 상호작용 대상 찾기 (긴급 몬스터 / 퀘스트 NPC / 문·포탈 / 일반 NPC)
    const findNearbyInteractable = useCallback(() => {
        const p = playerRef.current;
        const tileX = Math.floor(p.x / CITY_TILE_SIZE);
        const tileY = Math.floor(p.y / CITY_TILE_SIZE);

        // 0. 긴급 출몰 몬스터 (1.5타일 이내)
        for (const mob of questMonstersRef.current) {
            const d = Math.hypot(mob.px - p.x, mob.py - p.y) / CITY_TILE_SIZE;
            if (d <= 1.55) {
                return { type: 'quest_mob' as const, mob };
            }
        }

        // 0.5. 퀘스트 연계 NPC (1.65타일 이내)
        for (const qNpc of questNpcsRef.current) {
            const d = Math.hypot(qNpc.px - p.x, qNpc.py - p.y) / CITY_TILE_SIZE;
            if (d <= 1.65) {
                return { type: 'quest_npc' as const, qNpc };
            }
        }

        // 1. 포탈/건물 문 (현재 타일 또는 1칸 이내)
        let closestPortal: CityPortalNode | null = null;
        let minPortalDist = 1.6;
        for (const portal of mapData.portals) {
            const dx = portal.doorX - tileX;
            const dy = portal.doorY - tileY;
            const d = Math.hypot(dx, dy);
            if (d <= minPortalDist) {
                minPortalDist = d;
                closestPortal = portal;
            }
        }
        if (closestPortal) {
            return { type: 'portal' as const, portal: closestPortal };
        }

        // 2. NPC (1.6타일 이내)
        for (const npc of npcsRef.current) {
            const d = Math.hypot(npc.px - p.x, npc.py - p.y) / CITY_TILE_SIZE;
            if (d <= 1.65) {
                return { type: 'npc' as const, npc };
            }
        }

        return null;
    }, [mapData]);

    // 상호작용 버튼 / Space / Enter 처리
    const handleInteract = useCallback(() => {
        if (dialogue) {
            const curLine = dialogue.lines[dialogue.lineIndex] || '';
            if (typedChars < curLine.length) {
                setTypedChars(curLine.length);
                return;
            }
            if (dialogue.lineIndex + 1 < dialogue.lines.length) {
                setDialogue({ ...dialogue, lineIndex: dialogue.lineIndex + 1 });
                setTypedChars(0);
            } else {
                const cb = dialogue.onActionAfter;
                setDialogue(null);
                setTypedChars(0);
                if (cb) cb();
            }
            return;
        }

        const target = findNearbyInteractable();
        if (!target) return;
        if (target.type === 'quest_mob') {
            triggerEmergencyBattle(target.mob.quest);
        } else if (target.type === 'quest_npc') {
            const p = playerRef.current;
            const dx = p.x - target.qNpc.px;
            const dy = p.y - target.qNpc.py;
            target.qNpc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
            openQuestNpcDialogue(target.qNpc);
        } else if (target.type === 'portal') {
            triggerPortalAction(target.portal);
        } else if (target.type === 'npc') {
            // NPC가 플레이어를 바라보도록 회전
            const p = playerRef.current;
            const dx = p.x - target.npc.px;
            const dy = p.y - target.npc.py;
            if (Math.abs(dx) > Math.abs(dy)) {
                target.npc.dir = dx > 0 ? 'right' : 'left';
            } else {
                target.npc.dir = dy > 0 ? 'down' : 'up';
            }
            const isBlessedNation = character.templeDiplomacy?.[nation]?.status === DivineDiplomacyStatus.BLESSED;
            const lines = isBlessedNation
                ? [
                      `✨ 위대하신 신의 사자 ${character.name}님! 우리 ${nation}을(를) 비호해 주셔서 진심으로 감사드립니다!`,
                      `온 국민이 ${character.name}님의 성스러운 가호를 우러러보며 진심으로 환영합니다.`,
                      ...(target.npc.dialogues || [])
                  ]
                : target.npc.dialogues;
            setDialogue({
                npcName: target.npc.name,
                npcRole: isBlessedNation ? `${target.npc.role} (비호국 · 우호)` : target.npc.role,
                spriteUrl: target.npc.spriteUrl,
                lines,
                lineIndex: 0
            });
            setTypedChars(0);
        }
    }, [dialogue, typedChars, findNearbyInteractable, triggerPortalAction, triggerEmergencyBattle, openQuestNpcDialogue]);

    // 타자기 텍스트 효과
    useEffect(() => {
        if (!dialogue) return;
        const curLine = dialogue.lines[dialogue.lineIndex] || '';
        if (typedChars >= curLine.length) return;
        const timer = setTimeout(() => {
            setTypedChars(c => Math.min(curLine.length, c + 2));
        }, 22);
        return () => clearTimeout(timer);
    }, [dialogue, typedChars]);

    // 키보드 입력 리스너
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (dialogueOpenRef.current && !dialogue) return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift'].includes(k)) {
                e.preventDefault();
                keysPressedRef.current.add(k);
                // 키보드 조작 시 자동 이동 경로 취소
                playerRef.current.path = [];
                playerRef.current.pendingPortal = null;
                playerRef.current.pendingNpc = null;
            } else if (k === ' ' || k === 'enter' || k === 'e') {
                e.preventDefault();
                handleInteract();
            } else if (k === 'escape' && dialogueOpenRef.current) {
                setDialogue(null);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keysPressedRef.current.delete(e.key.toLowerCase());
        };
        const onBlur = () => {
            keysPressedRef.current.clear();
            dpadDirRef.current = null;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [handleInteract]);

    // 캔버스 클릭/터치 이동 & 건물/NPC 클릭 상호작용
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dialogue) {
            handleInteract();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const zoom = cameraRef.current.zoom || 1;
        const worldX = (e.clientX - rect.left) / zoom + cameraRef.current.x;
        const worldY = (e.clientY - rect.top) / zoom + cameraRef.current.y;
        const tx = Math.floor(worldX / CITY_TILE_SIZE);
        const ty = Math.floor(worldY / CITY_TILE_SIZE);

        const p = playerRef.current;
        const start = {
            x: Math.floor(p.x / CITY_TILE_SIZE),
            y: Math.floor(p.y / CITY_TILE_SIZE)
        };

        // 0. 뒤따라오는 동료(팔로워) 클릭 체크 -> 즉시 동료 정보창 열기
        if (onInspectCompanion && followers.length > 0) {
            for (let idx = 0; idx < followers.length; idx++) {
                const trailIdx = Math.min(trailRef.current.length - 1, (idx + 1) * 10);
                const fpt = trailRef.current[trailIdx];
                if (!fpt) continue;
                if (Math.hypot(fpt.x - worldX, (fpt.y - 8) - worldY) <= CITY_TILE_SIZE * 0.72) {
                    onInspectCompanion(followers[idx].id);
                    return;
                }
            }
        }

        // 0. 긴급 출몰 몬스터 클릭 체크
        const clickedMob = questMonstersRef.current.find(
            m => Math.hypot(m.px - worldX, m.py - worldY) <= CITY_TILE_SIZE * 0.95
        );
        if (clickedMob) {
            const mtx = Math.floor(clickedMob.px / CITY_TILE_SIZE);
            const mty = Math.floor(clickedMob.py / CITY_TILE_SIZE);
            if (Math.hypot(mtx - start.x, mty - start.y) <= 1.65) {
                triggerEmergencyBattle(clickedMob.quest);
            } else {
                p.path = findPathBFS(mapData.solid, start, { x: mtx, y: mty });
                p.pendingQuestMob = clickedMob;
                p.pendingQuestNpc = null;
                p.pendingPortal = null;
                p.pendingNpc = null;
            }
            return;
        }

        // 0.5. 퀘스트 연계 NPC 클릭 체크
        const clickedQuestNpc = questNpcsRef.current.find(
            n => Math.hypot(n.px - worldX, n.py - worldY) <= CITY_TILE_SIZE * 0.85
        );
        if (clickedQuestNpc) {
            const ntx = Math.floor(clickedQuestNpc.px / CITY_TILE_SIZE);
            const nty = Math.floor(clickedQuestNpc.py / CITY_TILE_SIZE);
            if (Math.hypot(ntx - start.x, nty - start.y) <= 1.65) {
                openQuestNpcDialogue(clickedQuestNpc);
            } else {
                p.path = findPathBFS(mapData.solid, start, { x: ntx, y: nty });
                p.pendingQuestNpc = clickedQuestNpc;
                p.pendingQuestMob = null;
                p.pendingPortal = null;
                p.pendingNpc = null;
            }
            return;
        }

        // 1. 건물 영역 클릭 체크 -> 해당 건물 문 앞으로 이동 후 자동 입장
        const clickedPortal = mapData.portals.find(
            pt =>
                tx >= pt.buildingX &&
                tx < pt.buildingX + pt.buildingW &&
                ty >= pt.buildingY &&
                ty <= pt.buildingY + pt.buildingH
        );
        if (clickedPortal) {
            const path = findPathBFS(mapData.solid, start, { x: clickedPortal.doorX, y: clickedPortal.doorY });
            if (path.length === 0 && Math.hypot(clickedPortal.doorX - start.x, clickedPortal.doorY - start.y) <= 1.5) {
                triggerPortalAction(clickedPortal);
            } else {
                p.path = path;
                p.pendingPortal = clickedPortal;
                p.pendingNpc = null;
                p.pendingQuestNpc = null;
                p.pendingQuestMob = null;
            }
            return;
        }

        // 2. NPC 클릭 체크
        const clickedNpc = npcsRef.current.find(
            n => Math.hypot(n.px - worldX, n.py - worldY) <= CITY_TILE_SIZE * 0.85
        );
        if (clickedNpc) {
            const ntx = Math.floor(clickedNpc.px / CITY_TILE_SIZE);
            const nty = Math.floor(clickedNpc.py / CITY_TILE_SIZE);
            if (Math.hypot(ntx - start.x, nty - start.y) <= 1.6) {
                setDialogue({
                    npcName: clickedNpc.name,
                    npcRole: clickedNpc.role,
                    spriteUrl: clickedNpc.spriteUrl,
                    lines: clickedNpc.dialogues,
                    lineIndex: 0
                });
                setTypedChars(0);
            } else {
                p.path = findPathBFS(mapData.solid, start, { x: ntx, y: nty });
                p.pendingNpc = clickedNpc;
                p.pendingPortal = null;
                p.pendingQuestNpc = null;
                p.pendingQuestMob = null;
            }
            return;
        }

        // 3. 일반 바닥 클릭 -> 최단 경로 이동
        const path = findPathBFS(mapData.solid, start, { x: tx, y: ty });
        p.path = path;
        p.pendingPortal = null;
        p.pendingNpc = null;
        p.pendingQuestNpc = null;
        p.pendingQuestMob = null;
    };

    // 3. 메인 60fps 게임 루프 (업데이트 + 렌더링)
    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let uiSyncAccum = 0;

        const isSolidPixel = (px: number, py: number): boolean => {
            const halfW = 10;
            const halfH = 8;
            const corners = [
                [px - halfW, py - halfH],
                [px + halfW, py - halfH],
                [px - halfW, py + halfH],
                [px + halfW, py + halfH]
            ];
            for (const [cx, cy] of corners) {
                const tx = Math.floor(cx / CITY_TILE_SIZE);
                const ty = Math.floor(cy / CITY_TILE_SIZE);
                if (tx < 0 || ty < 0 || tx >= mapData.cols || ty >= mapData.rows) return true;
                if (mapData.solid[ty][tx]) return true;
            }
            return false;
        };

        const renderSprite = (
            ctx: CanvasRenderingContext2D,
            url: string,
            cx: number,
            footY: number,
            dir: SpriteDirection,
            walkFrame: number,
            rKey: RpgSpriteRegionKey,
            gKey: RpgSpriteGenderKey
        ) => {
            const img = getCachedRpgSpriteImage(url);
            const drawSize = 46;
            if (img && img.complete && img.naturalWidth > 0) {
                // 발밑 그림자
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.beginPath();
                ctx.ellipse(cx, footY - 2, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                const cellW = img.naturalWidth / 3;
                const cellH = img.naturalHeight / 4;
                const row = DIRECTION_ROW_MAP[dir] ?? 0;
                const col = Math.max(0, Math.min(2, walkFrame));
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    img,
                    col * cellW,
                    row * cellH,
                    cellW,
                    cellH,
                    Math.round(cx - drawSize / 2),
                    Math.round(footY - drawSize + 4),
                    drawSize,
                    drawSize
                );
            } else {
                drawFallbackChibiSprite(ctx, cx, footY, drawSize, dir, walkFrame, rKey, gKey);
            }
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;

            const p = playerRef.current;
            const keys = keysPressedRef.current;

            // --- A. 플레이어 이동 업데이트 ---
            if (!dialogueOpenRef.current) {
                let vx = 0;
                let vy = 0;
                if (keys.has('arrowup') || keys.has('w') || dpadDirRef.current === 'up') vy -= 1;
                if (keys.has('arrowdown') || keys.has('s') || dpadDirRef.current === 'down') vy += 1;
                if (keys.has('arrowleft') || keys.has('a') || dpadDirRef.current === 'left') vx -= 1;
                if (keys.has('arrowright') || keys.has('d') || dpadDirRef.current === 'right') vx += 1;

                const isRunning = keys.has('shift');
                const speed = (isRunning ? 225 : 148) * dt;

                if (vx !== 0 || vy !== 0) {
                    const len = Math.hypot(vx, vy);
                    vx = (vx / len) * speed;
                    vy = (vy / len) * speed;

                    if (Math.abs(vx) > Math.abs(vy)) {
                        p.dir = vx > 0 ? 'right' : 'left';
                    } else {
                        p.dir = vy > 0 ? 'down' : 'up';
                    }

                    const nextX = p.x + vx;
                    const nextY = p.y + vy;
                    let moved = false;
                    if (!isSolidPixel(nextX, p.y)) {
                        p.x = nextX;
                        moved = true;
                    }
                    if (!isSolidPixel(p.x, nextY)) {
                        p.y = nextY;
                        moved = true;
                    }
                    p.moving = moved;
                } else if (p.path.length > 0) {
                    const nextTile = p.path[0];
                    const tx = nextTile.x * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                    const ty = nextTile.y * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                    const dx = tx - p.x;
                    const dy = ty - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= speed + 1.5) {
                        p.x = tx;
                        p.y = ty;
                        p.path.shift();
                        if (p.path.length === 0) {
                            if (p.pendingQuestMob) {
                                const mob = p.pendingQuestMob;
                                p.pendingQuestMob = null;
                                triggerEmergencyBattle(mob.quest);
                            } else if (p.pendingQuestNpc) {
                                const qNpc = p.pendingQuestNpc;
                                p.pendingQuestNpc = null;
                                openQuestNpcDialogue(qNpc);
                            } else if (p.pendingPortal) {
                                const pt = p.pendingPortal;
                                p.pendingPortal = null;
                                triggerPortalAction(pt);
                            } else if (p.pendingNpc) {
                                const npc = p.pendingNpc;
                                p.pendingNpc = null;
                                setDialogue({
                                    npcName: npc.name,
                                    npcRole: npc.role,
                                    spriteUrl: npc.spriteUrl,
                                    lines: npc.dialogues,
                                    lineIndex: 0
                                });
                                setTypedChars(0);
                            }
                        }
                    } else {
                        p.x += (dx / dist) * speed;
                        p.y += (dy / dist) * speed;
                        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    }
                    p.moving = true;
                } else {
                    p.moving = false;
                }

                // 걷기 애니메이션 & 트레일 & 발자국 파티클
                if (p.moving) {
                    p.animTimer += dt * (isRunning ? 10 : 6.8);
                    const seq = [0, 1, 2, 1];
                    p.walkFrame = seq[Math.floor(p.animTimer) % 4];

                    const head = trailRef.current[0];
                    if (!head || Math.hypot(head.x - p.x, head.y - p.y) >= 4) {
                        trailRef.current.unshift({ x: p.x, y: p.y, dir: p.dir });
                        if (trailRef.current.length > 80) trailRef.current.pop();
                    }

                    if (Math.random() < 0.22) {
                        particlesRef.current.push({
                            x: p.x + (Math.random() - 0.5) * 10,
                            y: p.y + 4,
                            vx: (Math.random() - 0.5) * 14,
                            vy: -Math.random() * 12,
                            life: 0.35,
                            maxLife: 0.35
                        });
                    }
                } else {
                    p.walkFrame = 1;
                }
            } else {
                p.moving = false;
                p.walkFrame = 1;
            }

            // --- B. NPC 자율 배회 업데이트 ---
            npcsRef.current.forEach(npc => {
                if (dialogueOpenRef.current) {
                    npc.walkFrame = 1;
                    return;
                }
                const tx = npc.targetX * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                const ty = npc.targetY * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                const dx = tx - npc.px;
                const dy = ty - npc.py;
                const dist = Math.hypot(dx, dy);

                if (dist > 2) {
                    const nSpeed = 48 * dt;
                    npc.px += (dx / dist) * Math.min(dist, nSpeed);
                    npc.py += (dy / dist) * Math.min(dist, nSpeed);
                    npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    npc.animTimer += dt * 5;
                    npc.walkFrame = [0, 1, 2, 1][Math.floor(npc.animTimer) % 4];
                } else {
                    npc.walkFrame = 1;
                    npc.waitTimer -= dt;
                    if (npc.waitTimer <= 0) {
                        npc.waitTimer = 2.0 + Math.random() * 3.0;
                        const dirs = [
                            [1, 0],
                            [-1, 0],
                            [0, 1],
                            [0, -1]
                        ];
                        const [ddx, ddy] = dirs[Math.floor(Math.random() * dirs.length)];
                        const nx = npc.targetX + ddx;
                        const ny = npc.targetY + ddy;
                        if (
                            Math.abs(nx - npc.homeX) <= 2 &&
                            Math.abs(ny - npc.homeY) <= 2 &&
                            nx > 1 &&
                            nx < mapData.cols - 2 &&
                            ny > 1 &&
                            ny < mapData.rows - 2 &&
                            !mapData.solid[ny][nx] &&
                            mapData.tiles[ny][nx] !== 'door' &&
                            mapData.tiles[ny][nx] !== 'portal'
                        ) {
                            npc.targetX = nx;
                            npc.targetY = ny;
                        }
                    }
                }
            });

            // --- B-2. 긴급 출몰 몬스터 자율 배회 업데이트 ---
            questMonstersRef.current.forEach(mob => {
                if (dialogueOpenRef.current) return;
                const dist = Math.hypot(mob.targetX - mob.px, mob.targetY - mob.py);
                if (dist > 3) {
                    const mSpeed = 48 * dt;
                    const dx = mob.targetX - mob.px;
                    const dy = mob.targetY - mob.py;
                    mob.px += (dx / dist) * Math.min(mSpeed, dist);
                    mob.py += (dy / dist) * Math.min(mSpeed, dist);
                    mob.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    mob.stepPhase += dt * 7;
                } else {
                    mob.waitTicks -= dt * 60;
                    if (mob.waitTicks <= 0) {
                        const ox = (Math.random() - 0.5) * CITY_TILE_SIZE * 2.5;
                        const oy = (Math.random() - 0.5) * CITY_TILE_SIZE * 2.5;
                        const nx = Math.max(CITY_TILE_SIZE * 2, Math.min((mapData.cols - 3) * CITY_TILE_SIZE, mob.homeX + ox));
                        const ny = Math.max(CITY_TILE_SIZE * 2, Math.min((mapData.rows - 3) * CITY_TILE_SIZE, mob.homeY + oy));
                        const tx = Math.floor(nx / CITY_TILE_SIZE);
                        const ty = Math.floor(ny / CITY_TILE_SIZE);
                        if (!mapData.solid[ty]?.[tx]) {
                            mob.targetX = nx;
                            mob.targetY = ny;
                        }
                        mob.waitTicks = 45 + Math.random() * 65;
                    }
                }
            });

            // --- C. 파티클 업데이트 ---
            particlesRef.current = particlesRef.current
                .map(pt => ({ ...pt, x: pt.x + pt.vx * dt, y: pt.y + pt.vy * dt, life: pt.life - dt }))
                .filter(pt => pt.life > 0);

            // --- D. 근접 상호작용 프롬프트 주기적 동기화 ---
            uiSyncAccum += dt;
            if (uiSyncAccum >= 0.12) {
                uiSyncAccum = 0;
                const near = findNearbyInteractable();
                if (near?.type === 'quest_mob') {
                    setNearbyLabel(`[Space / E] 🚨 ${near.mob.name} 즉시 교전!`);
                } else if (near?.type === 'quest_npc') {
                    setNearbyLabel(`[Space / E] ${near.qNpc.badgeText} · ${near.qNpc.name} 대화`);
                } else if (near?.type === 'portal') {
                    setNearbyLabel(`[Space / E] ${near.portal.label} 입장`);
                } else if (near?.type === 'npc') {
                    setNearbyLabel(`[Space / E] ${near.npc.name}에게 말 걸기`);
                } else {
                    setNearbyLabel('');
                }
            }

            // --- E. 카메라 추적 (항상 캔버스 전체를 빈 여백 없이 꽉 채우는 쯔꾸르 줌) ---
            const worldW = mapData.cols * CITY_TILE_SIZE;
            const worldH = mapData.rows * CITY_TILE_SIZE;
            const viewW = canvasSize.width;
            const viewH = canvasSize.height;

            // 모바일 화면에서는 시야를 넓혀 적당한 크기로, 데스크톱에서는 1.4배로 여백 0% 보장
            const minZoom = viewW < 480 ? 0.85 : viewW < 768 ? 1.05 : 1.4;
            const zoom = Math.max(minZoom, viewW / worldW, viewH / worldH);
            cameraRef.current.zoom = zoom;
            const visibleWorldW = viewW / zoom;
            const visibleWorldH = viewH / zoom;

            const desiredCamX = Math.max(0, Math.min(Math.max(0, worldW - visibleWorldW), p.x - visibleWorldW / 2));
            const desiredCamY = Math.max(0, Math.min(Math.max(0, worldH - visibleWorldH), p.y - visibleWorldH / 2));
            cameraRef.current.x += (desiredCamX - cameraRef.current.x) * Math.min(1, dt * 10);
            cameraRef.current.y += (desiredCamY - cameraRef.current.y) * Math.min(1, dt * 10);

            // --- F. 캔버스 렌더링 ---
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                // 깔끔한 단색 다크 배경으로 초기화 (흐릿한 도시 일러스트 투과 제거)
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, viewW, viewH);

                const camX = cameraRef.current.x;
                const camY = cameraRef.current.y;
                const pal = mapData.palette;
                const ts = CITY_TILE_SIZE;
                const groundTex = getGroundTileTextures(mapData.cultureKey, pal);
                const waterFrameIdx = Math.floor(now / 360) % groundTex.waterFrames.length;

                ctx.save();
                ctx.scale(zoom, zoom);
                ctx.translate(-camX, -camY);
                ctx.imageSmoothingEnabled = false;

                // Layer 1: 고품질 AI 지형 타일 PNG 100% 선명하게 렌더링
                ctx.save();
                ctx.globalAlpha = 1;
                const aiGround = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'ground'));
                const aiRoad = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'road'));
                const aiPlaza = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'plaza'));
                const aiRoyalRoad = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'royal_road'));
                const aiWall = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'wall'));
                const aiWater = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'water'));
                const isImgReady = (img: HTMLImageElement | null): img is HTMLImageElement =>
                    Boolean(img && img.complete && img.naturalWidth > 0);

                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        const px = x * ts;
                        const py = y * ts;
                        const variantIdx = (x * 7 + y * 13) & 3;

                        if (t === 'royal_road') {
                            if (isImgReady(aiRoyalRoad)) ctx.drawImage(aiRoyalRoad, px, py, ts, ts);
                            else ctx.drawImage(groundTex.royalRoad, px, py);
                        } else if (t === 'road') {
                            if (isImgReady(aiRoad)) ctx.drawImage(aiRoad, px, py, ts, ts);
                            else ctx.drawImage(groundTex.road, px, py);
                            // 잔디와 맞닿는 경계에 자연스러운 연석 그림자/테두리
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
                            if (y > 0 && mapData.tiles[y - 1][x] === 'grass') ctx.fillRect(px, py, ts, 2);
                            if (y < mapData.rows - 1 && mapData.tiles[y + 1][x] === 'grass') ctx.fillRect(px, py + ts - 2, ts, 2);
                            if (x > 0 && mapData.tiles[y][x - 1] === 'grass') ctx.fillRect(px, py, 2, ts);
                            if (x < mapData.cols - 1 && mapData.tiles[y][x + 1] === 'grass') ctx.fillRect(px + ts - 2, py, 2, ts);
                        } else if (t === 'plaza' || t === 'fountain') {
                            if (isImgReady(aiPlaza)) ctx.drawImage(aiPlaza, px, py, ts, ts);
                            else ctx.drawImage(groundTex.plaza, px, py);
                        } else if (t === 'water') {
                            if (isImgReady(aiWater)) {
                                ctx.drawImage(aiWater, px, py, ts, ts);
                                // 살아있는 수면 반짝임 오버레이
                                const shimmer = 0.06 + Math.sin(now * 0.004 + x * 0.9 + y * 0.7) * 0.05;
                                ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, shimmer)})`;
                                ctx.fillRect(px + ((x * 9 + waterFrameIdx * 6) % 24), py + 10 + (y % 3) * 8, 10, 2);
                            } else {
                                ctx.drawImage(groundTex.waterFrames[waterFrameIdx], px, py);
                            }
                            // 연못 가장자리 석축 테두리
                            ctx.fillStyle = '#475569';
                            if (y > 0 && mapData.tiles[y - 1][x] !== 'water') ctx.fillRect(px, py, ts, 3);
                            if (y < mapData.rows - 1 && mapData.tiles[y + 1][x] !== 'water') ctx.fillRect(px, py + ts - 3, ts, 3);
                            if (x > 0 && mapData.tiles[y][x - 1] !== 'water') ctx.fillRect(px, py, 3, ts);
                            if (x < mapData.cols - 1 && mapData.tiles[y][x + 1] !== 'water') ctx.fillRect(px + ts - 3, py, 3, ts);
                        } else if (t === 'wall') {
                            if (isImgReady(aiWall)) ctx.drawImage(aiWall, px, py, ts, ts);
                            else ctx.drawImage(groundTex.wall, px, py);
                        } else if (t === 'flower') {
                            if (isImgReady(aiGround)) {
                                ctx.drawImage(aiGround, px, py, ts, ts);
                                // AI 잔디 위 작은 꽃잎 포인트
                                ctx.fillStyle = '#f472b6';
                                ctx.fillRect(px + 9, py + 11, 4, 4);
                                ctx.fillStyle = '#fde047';
                                ctx.fillRect(px + 24, py + 19, 4, 4);
                                ctx.fillStyle = '#38bdf8';
                                ctx.fillRect(px + 15, py + 28, 3, 3);
                            } else {
                                ctx.drawImage(groundTex.flower, px, py);
                            }
                        } else {
                            if (isImgReady(aiGround)) ctx.drawImage(aiGround, px, py, ts, ts);
                            else ctx.drawImage(groundTex.grassVariants[variantIdx], px, py);
                        }

                        // 중앙 분수대 디테일 (고품질 PNG가 없을 때만 기본 타일 분수 표시)
                        if (t === 'fountain') {
                            const fountainImg = getCachedCityAssetImage(getCultureAssetUrl(mapData.cultureKey, 'fountain'));
                            if (!fountainImg) {
                                ctx.fillStyle = '#64748b';
                                ctx.beginPath();
                                ctx.roundRect(px + 2, py + 4, ts - 4, ts - 8, 6);
                                ctx.fill();
                                ctx.fillStyle = pal.water2;
                                ctx.beginPath();
                                ctx.roundRect(px + 6, py + 8, ts - 12, ts - 16, 4);
                                ctx.fill();
                                ctx.fillStyle = 'rgba(255,255,255,0.65)';
                                ctx.beginPath();
                                ctx.arc(px + ts / 2, py + ts / 2 + Math.sin(now * 0.008) * 2, 4, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }
                }
                ctx.restore(); // Layer 1 alpha 복원 (건물·소품·캐릭터는 100% 선명하게)

                // 고품질 중앙 분수대 PNG가 있으면 중앙 광장에 통합 렌더링
                const customFountainImg = getCachedCityAssetImage(getCultureAssetUrl(mapData.cultureKey, 'fountain'));
                if (customFountainImg && customFountainImg.complete && customFountainImg.naturalWidth > 0) {
                    const fx = mapData.fountainCenter.x * ts;
                    const fy = mapData.fountainCenter.y * ts + ts / 2;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(customFountainImg, fx - ts * 1.15, fy - ts * 1.15, ts * 2.3, ts * 2.3);
                }

                // 클릭 목표 경로 점선 표시
                if (p.path.length > 0) {
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
                    p.path.forEach(pt => {
                        ctx.beginPath();
                        ctx.arc(pt.x * ts + ts / 2, pt.y * ts + ts / 2, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                // Layer 2: 건물 본체 + 지붕 + 간판 + 문/포탈
                const isNightLike = timePeriod === 'night' || timePeriod === 'dawn' || timePeriod === 'sunset';
                mapData.portals.forEach(pt => {
                    if (pt.actionType === 'world_map') {
                        // 남쪽 성문 아치 표시
                        const gx = pt.doorX * ts;
                        const gy = pt.doorY * ts;
                        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
                        ctx.fillRect(gx, gy, ts * 2, ts);
                        ctx.fillStyle = '#93c5fd';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('▼ 성문 / 월드맵', gx + ts, gy + 24);
                        return;
                    }

                    const bx = pt.buildingX * ts;
                    const by = pt.buildingY * ts;
                    const bw = pt.buildingW * ts;
                    const bh = pt.buildingH * ts;

                    // 건물 그림자
                    ctx.fillStyle = 'rgba(0,0,0,0.34)';
                    ctx.fillRect(bx + 6, by + bh - 4, bw, 10);

                    const customBasePack = (character.base as any)?.customBuildingPack as string | undefined;
                    const resolvedBuildingUrl =
                        pt.id === 'my_base' && customBasePack
                            ? getBaseBuildingSpriteUrl(customBasePack, character.base?.level || 1)
                            : getBuildingSpriteUrl(mapData.cultureKey, pt.spriteKind);
                    const buildingImg = getCachedCityAssetImage(resolvedBuildingUrl);
                    if (buildingImg && buildingImg.complete && buildingImg.naturalWidth > 0) {
                        // 고품질 문화권/특수 건물 PNG 렌더링 (기지 Lv.1~5는 레벨별 확대, 신계 성전은 웅장하게 추가 확대!)
                        const baseLvMatch = typeof pt.spriteKind === 'string' ? pt.spriteKind.match(/^base_lv(\d)$/) : null;
                        const extraScale =
                            pt.id === 'shingye_temple'
                                ? 1.32
                                : baseLvMatch
                                ? 1 + (Math.max(1, Math.min(5, Number(baseLvMatch[1]))) - 1) * 0.08
                                : 1;
                        const drawW = Math.round((bw + 14) * extraScale);
                        const drawH = Math.round((bh + 20) * extraScale);
                        const drawX = Math.round(bx + bw / 2 - drawW / 2);
                        const drawY = Math.round(by + bh - drawH + 4);
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(buildingImg, drawX, drawY, drawW, drawH);
                    } else {
                        // 국가별 건축 양식 & 특수 건물 전용 폴백 렌더링
                        const cKey = mapData.cultureKey;
                        const isSpecial = pt.spriteKind.startsWith('special_');

                        // 벽면
                        ctx.fillStyle =
                            pt.spriteKind === 'special_dungeon' ? '#334155' :
                            pt.spriteKind === 'special_abyss' ? '#1e1b4b' :
                            pt.spriteKind === 'special_base' ? '#1f2937' :
                            pal.buildingWall;
                        ctx.fillRect(bx + 2, by + ts * 0.68, bw - 4, bh - ts * 0.68);
                        ctx.strokeStyle = pal.buildingTrim;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(bx + 2, by + ts * 0.68, bw - 4, bh - ts * 0.68);

                        // 유럽 하프팀버 / 신계 대리석 기둥 / 마계 철제 기둥 디테일
                        if (cKey === 'europe' && !isSpecial) {
                            ctx.fillStyle = '#78350f';
                            for (let gx = bx + ts; gx < bx + bw - 8; gx += ts) {
                                ctx.fillRect(gx, by + ts * 0.68, 4, bh - ts * 0.68);
                            }
                        } else if (cKey === 'shingye') {
                            ctx.fillStyle = '#fde68a';
                            for (let gx = bx + 8; gx < bx + bw - 6; gx += ts) {
                                ctx.fillRect(gx, by + ts * 0.68, 6, bh - ts * 0.68);
                            }
                        } else if (pt.spriteKind === 'special_base') {
                            // 내 거점 성곽 요철 + 에메랄드 깃발
                            ctx.fillStyle = '#10b981';
                            ctx.fillRect(bx + 10, by - 14, 3, 18);
                            ctx.beginPath();
                            ctx.moveTo(bx + 13, by - 14);
                            ctx.lineTo(bx + 27, by - 9);
                            ctx.lineTo(bx + 13, by - 4);
                            ctx.fill();
                        }

                        // 창문 (한국/일본은 격자 창호, 밤에는 따뜻한 불빛)
                        if (pt.spriteKind !== 'special_dungeon') {
                            const winCount = Math.max(1, pt.buildingW - 1);
                            for (let i = 0; i < winCount; i++) {
                                const wx = bx + 12 + i * ts;
                                const wy = by + ts * 0.92;
                                if (Math.abs(wx + 8 - (pt.doorX * ts + ts / 2)) < 20) continue;
                                ctx.fillStyle = isNightLike ? '#fde047' : cKey === 'korea' || cKey === 'japan' ? '#fef3c7' : '#38bdf8';
                                ctx.fillRect(wx, wy, 14, 14);
                                ctx.strokeStyle = pal.buildingTrim;
                                ctx.lineWidth = 1.5;
                                ctx.strokeRect(wx, wy, 14, 14);
                                if (cKey === 'korea' || cKey === 'japan') {
                                    ctx.beginPath();
                                    ctx.moveTo(wx + 7, wy); ctx.lineTo(wx + 7, wy + 14);
                                    ctx.moveTo(wx, wy + 7); ctx.lineTo(wx + 14, wy + 7);
                                    ctx.stroke();
                                }
                            }
                        }

                        // 지붕 (국가별 고유 실루엣)
                        ctx.fillStyle = pt.roofColor;
                        if (cKey === 'korea' || cKey === 'japan' || cKey === 'china') {
                            // 동아시아 곡선 처마 기와지붕
                            ctx.beginPath();
                            ctx.moveTo(bx - 10, by + ts * 0.82);
                            ctx.quadraticCurveTo(bx + bw / 2, by + ts * 0.55, bx + bw + 10, by + ts * 0.82);
                            ctx.lineTo(bx + bw - 4, by - 4);
                            ctx.lineTo(bx + 4, by - 4);
                            ctx.closePath();
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(0,0,0,0.48)';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        } else if (cKey === 'africa') {
                            // 사막 둥근 돔 지붕
                            ctx.beginPath();
                            ctx.roundRect(bx - 2, by + ts * 0.35, bw + 4, ts * 0.52, 4);
                            ctx.fill();
                            ctx.fillStyle = '#f59e0b';
                            ctx.beginPath();
                            ctx.arc(bx + bw / 2, by + ts * 0.42, Math.min(bw * 0.28, 28), Math.PI, 0);
                            ctx.fill();
                        } else if (cKey === 'europe' || cKey === 'magye' || cKey === 'abyssalon' || pt.spriteKind === 'special_abyss') {
                            // 삼각 박공 / 고딕 첨탑 지붕
                            ctx.beginPath();
                            ctx.moveTo(bx - 6, by + ts * 0.85);
                            ctx.lineTo(bx + bw / 2, by - (pt.spriteKind === 'special_abyss' ? 22 : 10));
                            ctx.lineTo(bx + bw + 6, by + ts * 0.85);
                            ctx.closePath();
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        } else {
                            ctx.beginPath();
                            ctx.roundRect(bx - 3, by - 4, bw + 6, ts * 0.92, 6);
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }

                        // 지붕 하이라이트 띠
                        ctx.fillStyle = pt.accentColor;
                        ctx.fillRect(bx + 2, by + ts * 0.72, bw - 4, 4);

                        // 문 / 포탈 입구
                        const dx = pt.doorX * ts;
                        const dy = pt.doorY * ts;
                        if (pt.actionType === 'dungeon' || pt.actionType === 'abyss_tower') {
                            const pulse = 0.55 + Math.sin(now * 0.006) * 0.25;
                            ctx.fillStyle = `rgba(192, 132, 252, ${pulse})`;
                            ctx.beginPath();
                            ctx.ellipse(dx + ts / 2, dy + ts / 2, 14, 16, 0, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.fillStyle = '#451a03';
                            ctx.beginPath();
                            ctx.roundRect(dx + 8, dy + 4, ts - 16, ts - 6, [6, 6, 0, 0]);
                            ctx.fill();
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath();
                            ctx.arc(dx + ts - 13, dy + ts / 2 + 2, 2.2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    // 시즌 보스 / 심연 탑 포탈 글로우 오버레이 (PNG 위에도 살아있는 연출)
                    if (pt.actionType === 'dungeon' || pt.actionType === 'abyss_tower') {
                        const dx = pt.doorX * ts + ts / 2;
                        const dy = pt.doorY * ts + ts / 2;
                        const pulse = 0.28 + Math.sin(now * 0.006) * 0.16;
                        ctx.fillStyle = pt.actionType === 'abyss_tower'
                            ? `rgba(192, 132, 252, ${pulse})`
                            : isMythicBoss
                                ? `rgba(232, 121, 249, ${pulse + 0.15})`
                                : `rgba(248, 113, 113, ${pulse})`;
                        ctx.beginPath();
                        ctx.arc(dx, dy, 18, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 건물 간판 (지붕 중앙)
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    const title = `${pt.iconText} ${pt.label}`;
                    const tw = Math.min(bw + 24, ctx.measureText(title).width + 14);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
                    ctx.beginPath();
                    ctx.roundRect(bx + bw / 2 - tw / 2, by + 4, tw, 20, 6);
                    ctx.fill();
                    ctx.strokeStyle = pt.accentColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(title, bx + bw / 2, by + 18);

                    const pBadge = getPortalQuestBadge(pt, questEntities.portalBadges);
                    if (pBadge) {
                        const bobY = Math.sin(now / 190) * 3;
                        const badgeCx = bx + bw / 2;
                        const badgeCy = by - 12 + bobY;
                        ctx.beginPath();
                        ctx.arc(badgeCx, badgeCy, 11, 0, Math.PI * 2);
                        ctx.fillStyle = pBadge === 'emergency' ? '#dc2626' : '#f59e0b';
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.6;
                        ctx.stroke();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.fillText(pBadge === 'emergency' ? '!' : '!', badgeCx, badgeCy + 4);
                    }
                });

                // 바닥 위 통과 가능 소품 (화단, 마법진 등) 먼저 렌더링
                mapData.props.forEach(pr => {
                    if (!pr.walkable) return;
                    const propImg = getCachedCityAssetImage(getPropAssetUrl(pr.pack, pr.part));
                    if (!propImg || !propImg.complete || propImg.naturalWidth <= 0) return;
                    const cx = pr.x * ts + ts / 2;
                    const by = (pr.y + 1) * ts;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(propImg, cx - pr.drawW / 2, by - pr.drawH, pr.drawW, pr.drawH);
                });

                // 나무 & 가로등 & 마을 오브젝트 + 캐릭터/NPC Y-Sort 엔티티 수집
                type RenderItem = { y: number; draw: () => void };
                const ySortItems: RenderItem[] = [];

                // 입체 마을 오브젝트 소품 Y-Sort 추가
                mapData.props.forEach(pr => {
                    if (pr.walkable) return;
                    const propImg = getCachedCityAssetImage(getPropAssetUrl(pr.pack, pr.part));
                    if (!propImg || !propImg.complete || propImg.naturalWidth <= 0) return;
                    const cx = pr.x * ts + ts / 2;
                    const by = (pr.y + 1) * ts;
                    ySortItems.push({
                        y: by,
                        draw: () => {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
                            ctx.beginPath();
                            ctx.ellipse(cx, by - 3, Math.min(24, pr.drawW * 0.34), 6, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(propImg, cx - pr.drawW / 2, by - pr.drawH, pr.drawW, pr.drawH);
                        }
                    });
                });

                const treeImg = getCachedCityAssetImage(getCultureAssetUrl(mapData.cultureKey, 'tree'));
                const lampImg = getCachedCityAssetImage(getCultureAssetUrl(mapData.cultureKey, 'lamp'));

                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        const cx = x * ts + ts / 2;
                        const by = (y + 1) * ts;
                        if (t === 'tree') {
                            ySortItems.push({
                                y: by,
                                draw: () => {
                                    ctx.fillStyle = 'rgba(0,0,0,0.28)';
                                    ctx.beginPath();
                                    ctx.ellipse(cx, by - 4, 14, 6, 0, 0, Math.PI * 2);
                                    ctx.fill();
                                    if (treeImg && treeImg.complete && treeImg.naturalWidth > 0) {
                                        ctx.imageSmoothingEnabled = false;
                                        ctx.drawImage(treeImg, cx - 26, by - 52, 52, 52);
                                    } else {
                                        ctx.fillStyle = pal.treeTrunk;
                                        ctx.fillRect(cx - 5, by - 22, 10, 18);
                                        ctx.fillStyle = pal.treeLeaf1;
                                        ctx.beginPath();
                                        ctx.arc(cx, by - 30, 16, 0, Math.PI * 2);
                                        ctx.fill();
                                        ctx.fillStyle = pal.treeLeaf2;
                                        ctx.beginPath();
                                        ctx.arc(cx - 5, by - 34, 9, 0, Math.PI * 2);
                                        ctx.fill();
                                    }
                                }
                            });
                        } else if (t === 'lamp') {
                            ySortItems.push({
                                y: by,
                                draw: () => {
                                    if (lampImg && lampImg.complete && lampImg.naturalWidth > 0) {
                                        ctx.imageSmoothingEnabled = false;
                                        ctx.drawImage(lampImg, cx - 16, by - 44, 32, 44);
                                    } else {
                                        ctx.fillStyle = '#334155';
                                        ctx.fillRect(cx - 2, by - 30, 4, 28);
                                        // 한국 청사초롱 / 중국 홍등 / 마계 화로 포인트
                                        if (mapData.cultureKey === 'korea') {
                                            ctx.fillStyle = '#ef4444';
                                            ctx.fillRect(cx - 4, by - 35, 8, 5);
                                            ctx.fillStyle = '#3b82f6';
                                            ctx.fillRect(cx - 4, by - 30, 8, 4);
                                        } else if (mapData.cultureKey === 'china') {
                                            ctx.fillStyle = '#dc2626';
                                            ctx.beginPath();
                                            ctx.arc(cx, by - 32, 6, 0, Math.PI * 2);
                                            ctx.fill();
                                        } else {
                                            ctx.fillStyle = isNightLike ? '#fef08a' : '#cbd5e1';
                                            ctx.beginPath();
                                            ctx.arc(cx, by - 32, 5, 0, Math.PI * 2);
                                            ctx.fill();
                                        }
                                    }
                                }
                            });
                        }
                    }
                }

                // NPC 추가 (각 NPC의 고유 문화권 스프라이트 사용)
                npcsRef.current.forEach(npc => {
                    const npcUrl = getRpgSpriteUrlByKey(npc.spriteKey || `${npc.regionKey}_${npc.gender}`);
                    loadRpgSpriteImage(npcUrl);
                    ySortItems.push({
                        y: npc.py + 8,
                        draw: () => {
                            renderSprite(ctx, npcUrl, npc.px, npc.py + 12, npc.dir, npc.walkFrame, npc.regionKey, npc.gender);
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = 'rgba(15,23,42,0.78)';
                            const nw = ctx.measureText(npc.name).width + 10;
                            ctx.beginPath();
                            ctx.roundRect(npc.px - nw / 2, npc.py - 44, nw, 15, 4);
                            ctx.fill();
                            ctx.fillStyle = '#e2e8f0';
                            ctx.fillText(npc.name, npc.px, npc.py - 33);
                        }
                    });
                });

                // 퀘스트 연계 NPC 추가
                questNpcsRef.current.forEach(qNpc => {
                    const qNpcUrl = qNpc.spriteUrl || getRpgSpriteUrlByKey(`${qNpc.regionKey}_${qNpc.gender}`);
                    loadRpgSpriteImage(qNpcUrl);
                    ySortItems.push({
                        y: qNpc.py + 8,
                        draw: () => {
                            const bob = Math.sin(now / 220) * 2;
                            renderSprite(ctx, qNpcUrl, qNpc.px, qNpc.py + 12, qNpc.dir, 1, qNpc.regionKey, qNpc.gender);
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            const label = qNpc.badgeText;
                            const lw = ctx.measureText(label).width + 12;
                            ctx.fillStyle = qNpc.badgeColor;
                            ctx.beginPath();
                            ctx.roundRect(qNpc.px - lw / 2, qNpc.py - 50 + bob, lw, 17, 5);
                            ctx.fill();
                            ctx.strokeStyle = '#fde047';
                            ctx.lineWidth = 1.2;
                            ctx.stroke();
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(label, qNpc.px, qNpc.py - 38 + bob);
                        }
                    });
                });

                // 긴급 출몰 몬스터 추가
                questMonstersRef.current.forEach(mob => {
                    const mobImg = mob.visualUrl ? getCachedCityAssetImage(mob.visualUrl) : null;
                    ySortItems.push({
                        y: mob.py + 10,
                        draw: () => {
                            const pulseR = 22 + Math.sin(now / 150) * 3;
                            ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
                            ctx.beginPath();
                            ctx.arc(mob.px, mob.py + 6, pulseR, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
                            ctx.lineWidth = 1.5;
                            ctx.stroke();

                            if (mobImg && mobImg.complete && mobImg.naturalWidth > 0) {
                                const sz = mob.isBoss ? 54 : 44;
                                ctx.save();
                                ctx.beginPath();
                                ctx.arc(mob.px, mob.py - 6, sz / 2, 0, Math.PI * 2);
                                ctx.clip();
                                ctx.drawImage(mobImg, mob.px - sz / 2, mob.py - 6 - sz / 2, sz, sz);
                                ctx.restore();
                                ctx.strokeStyle = mob.isBoss ? '#fbbf24' : '#ef4444';
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                ctx.arc(mob.px, mob.py - 6, sz / 2, 0, Math.PI * 2);
                                ctx.stroke();
                            } else {
                                const frame = [0, 1, 2, 1][Math.floor(mob.stepPhase) % 4];
                                renderSprite(ctx, mob.spriteUrl, mob.px, mob.py + 12, mob.dir, frame, mob.regionKey, mob.genderKey);
                            }

                            const mLabel = `🚨 ${mob.name}`;
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            const mw = ctx.measureText(mLabel).width + 10;
                            ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
                            ctx.beginPath();
                            ctx.roundRect(mob.px - mw / 2, mob.py - 48, mw, 16, 4);
                            ctx.fill();
                            ctx.fillStyle = '#fecaca';
                            ctx.fillText(mLabel, mob.px, mob.py - 36);
                        }
                    });
                });

                // 파티 동료 + 호송 대상 팔로워 트레일 추가
                followers.forEach((f, idx) => {
                    const trailIdx = Math.min(trailRef.current.length - 1, (idx + 1) * 10);
                    const pt = trailRef.current[trailIdx];
                    if (!pt) return;
                    ySortItems.push({
                        y: pt.y + 8,
                        draw: () => {
                            renderSprite(
                                ctx,
                                f.spriteUrl,
                                pt.x,
                                pt.y + 12,
                                pt.dir,
                                p.moving ? p.walkFrame : 1,
                                f.regionKey,
                                f.genderKey
                            );
                            // 동료 / 호위 대상 이름표
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            const fLabel = (f as any).isEscort ? `🛡️ ${f.name}` : f.name;
                            const fw = ctx.measureText(fLabel).width + 10;
                            ctx.fillStyle = (f as any).isEscort ? 'rgba(30, 58, 138, 0.9)' : 'rgba(6, 46, 38, 0.84)';
                            ctx.beginPath();
                            ctx.roundRect(pt.x - fw / 2, pt.y - 44, fw, 15, 4);
                            ctx.fill();
                            ctx.strokeStyle = (f as any).isEscort ? 'rgba(96, 165, 250, 0.9)' : 'rgba(52, 211, 153, 0.75)';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            ctx.fillStyle = (f as any).isEscort ? '#bfdbfe' : '#a7f3d0';
                            ctx.fillText(fLabel, pt.x, pt.y - 33);
                        }
                    });
                });

                // 플레이어 추가
                ySortItems.push({
                    y: p.y + 10,
                    draw: () => {
                        renderSprite(ctx, playerSpriteUrl, p.x, p.y + 12, p.dir, p.walkFrame, playerRegionKey, playerGenderKey);
                        // 플레이어 이름표 (황금 테두리)
                        const pLabel = `${character.name}`;
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const pw = ctx.measureText(pLabel).width + 12;
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                        ctx.beginPath();
                        ctx.roundRect(p.x - pw / 2, p.y - 46, pw, 17, 5);
                        ctx.fill();
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#fde68a';
                        ctx.fillText(pLabel, p.x, p.y - 34);
                    }
                });

                // Y-Sort 실행
                ySortItems.sort((a, b) => a.y - b.y);
                ySortItems.forEach(item => item.draw());

                // 발자국 먼지 파티클
                particlesRef.current.forEach(pt => {
                    const alpha = Math.max(0, pt.life / pt.maxLife) * 0.55;
                    ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 문화권별 살아있는 환경 파티클 (벚꽃잎 / 눈송이 / 황금 빛가루 / 마계 불티·독포자 / 엘프 반딧불이)
                const cKey = mapData.cultureKey;
                const ambientColor =
                    cKey === 'korea' || cKey === 'japan' || cKey === 'shingye_flora' ? 'rgba(249, 168, 212, 0.72)' :
                    cKey === 'northern_europe' || cKey === 'shingye_ice' ? 'rgba(224, 242, 254, 0.85)' :
                    cKey === 'shingye_ocean' || cKey === 'shingye_thunder' || cKey === 'magye_necropolis' ? 'rgba(103, 232, 249, 0.78)' :
                    cKey === 'shingye_moon' || cKey === 'shingye_abyss' || cKey === 'magye_delirium' || cKey === 'abyssalon' ? 'rgba(192, 132, 252, 0.74)' :
                    cKey === 'magye_venomgarden' || cKey === 'sylvanar' ? 'rgba(110, 231, 183, 0.78)' :
                    cKey.startsWith('shingye') ? 'rgba(254, 240, 138, 0.78)' :
                    cKey.startsWith('magye') ? 'rgba(248, 113, 113, 0.72)' :
                    'rgba(254, 249, 195, 0.35)';
                ctx.fillStyle = ambientColor;
                const risesUp = (cKey.startsWith('shingye') && cKey !== 'shingye_ice' && cKey !== 'shingye_flora') || cKey.startsWith('magye') || cKey === 'abyssalon';
                for (let i = 0; i < 18; i++) {
                    const seed = i * 197.3;
                    const driftX = (seed * 13 + now * 0.018 * (1 + (i % 3) * 0.25)) % worldW;
                    const driftY = risesUp
                        ? (worldH - ((seed * 17 + now * 0.016) % worldH))
                        : ((seed * 17 + now * 0.014) % worldH);
                    const sway = Math.sin(now * 0.002 + i) * 8;
                    ctx.beginPath();
                    ctx.ellipse(driftX + sway, driftY, cKey === 'korea' || cKey === 'japan' ? 3 : 2, 1.8, (now * 0.001 + i) % Math.PI, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Layer 4: 실제 시각(00:00~23:59) 연동 시간대 대기 조명 + 햇살/노을/별빛 + 야간 가로등 광원
                const [chStr, cmStr] = (currentTime || '08:00').split(':');
                const hourFloat = (parseInt(chStr, 10) || 8) + (parseInt(cmStr, 10) || 0) / 60;

                const drawGlow = (gx: number, gy: number, r: number, color: string) => {
                    const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, r);
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(gx, gy, r, 0, Math.PI * 2);
                    ctx.fill();
                };

                if (timePeriod === 'shingye') {
                    // 신계: 성전 고유의 신성한 황금/천상 광휘 (야간에는 어둡게)
                    const holyGrad = ctx.createLinearGradient(0, 0, 0, worldH);
                    holyGrad.addColorStop(0, 'rgba(254, 240, 138, 0.14)');
                    holyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
                    holyGrad.addColorStop(1, 'rgba(251, 191, 36, 0.08)');
                    ctx.fillStyle = holyGrad;
                    ctx.fillRect(0, 0, worldW, worldH);

                    if (hourFloat >= 20 || hourFloat < 5) {
                        ctx.fillStyle = 'rgba(12, 16, 46, 0.38)';
                        ctx.fillRect(0, 0, worldW, worldH);
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        mapData.lamps.forEach(l => {
                            drawGlow(l.x * ts + ts / 2, l.y * ts + 8, 92, pal.lampGlow);
                        });
                        drawGlow(p.x, p.y - 6, 88, 'rgba(254, 243, 199, 0.24)');
                        ctx.restore();
                    }
                } else if (hourFloat >= 5 && hourFloat < 8) {
                    // 여명/일출 (05:00~07:59): 동쪽에서 퍼지는 복숭아·인디고 여명
                    const sunriseGrad = ctx.createLinearGradient(worldW, 0, 0, worldH);
                    sunriseGrad.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
                    sunriseGrad.addColorStop(0.55, 'rgba(244, 114, 182, 0.12)');
                    sunriseGrad.addColorStop(1, 'rgba(49, 46, 129, 0.20)');
                    ctx.fillStyle = sunriseGrad;
                    ctx.fillRect(0, 0, worldW, worldH);

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    mapData.lamps.forEach(l => drawGlow(l.x * ts + ts / 2, l.y * ts + 8, 64, pal.lampGlow));
                    ctx.restore();
                } else if (hourFloat >= 8 && hourFloat < 12) {
                    // 아침 (08:00~11:59): 상쾌하고 맑은 황금 아침 햇살
                    const morningGrad = ctx.createLinearGradient(0, 0, worldW, worldH);
                    morningGrad.addColorStop(0, 'rgba(254, 240, 138, 0.13)');
                    morningGrad.addColorStop(0.6, 'rgba(255, 251, 235, 0.04)');
                    morningGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
                    ctx.fillStyle = morningGrad;
                    ctx.fillRect(0, 0, worldW, worldH);
                } else if (hourFloat >= 12 && hourFloat < 17) {
                    // 한낮 (12:00~16:59): 화창하고 청명한 대낮 햇살
                    const noonGrad = ctx.createLinearGradient(0, 0, 0, worldH);
                    noonGrad.addColorStop(0, 'rgba(186, 230, 253, 0.10)');
                    noonGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
                    noonGrad.addColorStop(1, 'rgba(254, 249, 195, 0.06)');
                    ctx.fillStyle = noonGrad;
                    ctx.fillRect(0, 0, worldW, worldH);
                } else if (hourFloat >= 17 && hourFloat < 20) {
                    // 석양/노을 (17:00~19:59): 붉고 따뜻한 황혼 그라데이션 + 가로등 점등
                    const sunsetGrad = ctx.createLinearGradient(0, 0, worldW, worldH);
                    sunsetGrad.addColorStop(0, 'rgba(234, 88, 12, 0.24)');
                    sunsetGrad.addColorStop(0.5, 'rgba(190, 24, 93, 0.16)');
                    sunsetGrad.addColorStop(1, 'rgba(30, 27, 75, 0.24)');
                    ctx.fillStyle = sunsetGrad;
                    ctx.fillRect(0, 0, worldW, worldH);

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    mapData.lamps.forEach(l => drawGlow(l.x * ts + ts / 2, l.y * ts + 8, 76, pal.lampGlow));
                    drawGlow(p.x, p.y - 6, 65, 'rgba(254, 215, 170, 0.14)');
                    ctx.restore();
                } else {
                    // 밤 / 심야 (20:00~04:59): 깊은 남색 밤하늘 + 반짝이는 가로등·플레이어 등불 광원
                    const isDeepMidnight = hourFloat >= 0 && hourFloat < 5;
                    ctx.fillStyle = isDeepMidnight ? 'rgba(10, 14, 42, 0.46)' : 'rgba(12, 18, 46, 0.40)';
                    ctx.fillRect(0, 0, worldW, worldH);

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    mapData.lamps.forEach(l => {
                        drawGlow(l.x * ts + ts / 2, l.y * ts + 8, 96, pal.lampGlow);
                    });
                    drawGlow(p.x, p.y - 6, 88, 'rgba(254, 243, 199, 0.24)');
                    ctx.restore();
                }

                ctx.restore();

                // Layer 5: 우측 상단 컴팩트 미니맵 (모바일에서는 초소형 레이더로 시야 방해 최소화)
                const isMobileView = viewW < 640;
                const mmScale = isMobileView
                    ? (mapData.cols >= 34 ? 1.8 : 2.2)
                    : (mapData.cols >= 34 ? 3.2 : mapData.cols <= 22 ? 4.8 : 4);
                const mmW = Math.round(mapData.cols * mmScale);
                const mmH = Math.round(mapData.rows * mmScale);
                const mmX = viewW - mmW - (isMobileView ? 8 : 14);
                const mmY = isMobileView ? 8 : 14;
                ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
                ctx.beginPath();
                ctx.roundRect(mmX - 5, mmY - 5, mmW + 10, mmH + 10, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();

                for (let y = 0; y < mapData.rows; y++) {
                    for (let x = 0; x < mapData.cols; x++) {
                        const t = mapData.tiles[y][x];
                        if (t === 'road' || t === 'plaza') ctx.fillStyle = '#64748b';
                        else if (t === 'building_roof' || t === 'building_wall') ctx.fillStyle = '#d97706';
                        else if (t === 'door' || t === 'portal') ctx.fillStyle = '#38bdf8';
                        else if (t === 'water') ctx.fillStyle = '#2563eb';
                        else if (t === 'wall') ctx.fillStyle = '#1e293b';
                        else ctx.fillStyle = '#14532d';
                        ctx.fillRect(mmX + x * mmScale, mmY + y * mmScale, mmScale, mmScale);
                    }
                }
                // 미니맵 NPC & 플레이어 점
                ctx.fillStyle = '#4ade80';
                npcsRef.current.forEach(n => {
                    ctx.fillRect(
                        mmX + Math.floor(n.px / ts) * mmScale,
                        mmY + Math.floor(n.py / ts) * mmScale,
                        mmScale,
                        mmScale
                    );
                });
                ctx.fillStyle = '#fde047';
                ctx.fillRect(
                    mmX + Math.floor(p.x / ts) * mmScale - 1,
                    mmY + Math.floor(p.y / ts) * mmScale - 1,
                    mmScale + 2,
                    mmScale + 2
                );
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [
        mapData,
        canvasSize,
        playerSpriteUrl,
        playerRegionKey,
        playerGenderKey,
        followers,
        character.name,
        region,
        nation,
        timePeriod,
        currentTime,
        backgroundImageUrl,
        questEntities.portalBadges,
        triggerEmergencyBattle,
        openQuestNpcDialogue,
        findNearbyInteractable,
        triggerPortalAction
    ]);

    const currentDialogueText = dialogue ? (dialogue.lines?.[dialogue.lineIndex] || '').slice(0, typedChars) : '';

    return (
        <div
            ref={containerRef}
            className="relative w-full flex-1 min-h-[320px] sm:min-h-[500px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 select-none"
        >
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                className="relative z-10 block w-full h-full cursor-pointer"
            />

            {/* 조작 안내 및 도시 규모 뱃지 (좌상단) */}
            <div className="pointer-events-none absolute top-2.5 left-2.5 hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700/70 text-[10px] text-slate-300 backdrop-blur-sm z-20">
                <Compass size={12} className="text-amber-400" />
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">
                    {tier === 'Capital' ? '수도' : tier === 'City' ? '대도시' : '소도시'}
                </span>
                <span><strong className="text-white">WASD / 방향키 / 클릭</strong> 이동</span>
                <span className="text-slate-600">|</span>
                <span><strong className="text-white">Shift</strong> 달리기</span>
                <span className="text-slate-600">|</span>
                <span><strong className="text-amber-300">Space / E</strong> 상호작용</span>
        </div>

            {/* 우측 상단 군사 작전 버튼 + 접이식 진행 중 퀘스트 / 전선 / 알림 HUD */}
            {(character.militaryRank ||
                classifiedQuests.allActiveQuests.length > 0 ||
                classifiedQuests.isWarState ||
                classifiedQuests.expiredMessages.length > 0) && (
                <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end max-w-[85%] sm:max-w-xs">
                    <div className="flex items-center gap-1.5">
                        {character.militaryRank && (
                            <button
                                type="button"
                                onClick={() => setShowMilitaryOpsModal(true)}
                                className="px-2.5 py-1.5 rounded-xl border border-emerald-500/70 bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-200 text-[11px] font-black shadow-lg flex items-center gap-1 cursor-pointer backdrop-blur-md transition-all"
                            >
                                <span>🎖️ 군사 작전</span>
                            </button>
                        )}
                        {(classifiedQuests.allActiveQuests.length > 0 ||
                            classifiedQuests.isWarState ||
                            classifiedQuests.expiredMessages.length > 0) && (
                            <button
                                type="button"
                                onClick={() => setShowQuestHud(v => !v)}
                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-black shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all ${
                                    classifiedQuests.emergencyQuests.length > 0
                                        ? 'bg-red-950/95 border-red-400 text-red-100 animate-pulse'
                                        : classifiedQuests.isWarState
                                        ? 'bg-amber-950/95 border-amber-400 text-amber-100'
                                        : 'bg-slate-950/90 border-indigo-500/70 text-indigo-100 hover:border-indigo-400'
                                }`}
                            >
                                {classifiedQuests.emergencyQuests.length > 0 ? (
                                    <ShieldAlert size={13} className="text-red-400" />
                                ) : (
                                    <ScrollText size={13} className="text-amber-400" />
                                )}
                                <span>
                                    {classifiedQuests.emergencyQuests.length > 0
                                        ? `🚨 긴급 ${classifiedQuests.emergencyQuests.length} · 퀘스트 ${classifiedQuests.allActiveQuests.length}`
                                        : `📜 퀘스트 ${classifiedQuests.allActiveQuests.length}`}
                                </span>
                                {classifiedQuests.isWarState && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-[9px] text-white">교전</span>
                                )}
                                {showQuestHud ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        )}
                    </div>

                    {showQuestHud && (
                        <div className="mt-1.5 w-72 sm:w-80 max-h-[60vh] overflow-y-auto custom-scrollbar rounded-2xl bg-slate-950/95 border border-slate-700/90 p-2.5 shadow-2xl backdrop-blur-md space-y-2">
                            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
                                <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                                    <ScrollText size={12} /> 용병단·군대 퀘스트 연동
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowQuestHud(false)}
                                    className="text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
        </div>

                            {classifiedQuests.expiredMessages.length > 0 && (
                                <div className="p-2 rounded-xl bg-red-950/75 border border-red-700/70 space-y-1">
                                    <div className="text-[10.5px] font-bold text-red-200 flex items-center gap-1">
                                        <AlertTriangle size={12} className="text-red-400" /> 만료된 퀘스트 알림
        </div>
                                    {classifiedQuests.expiredMessages.map((msg, i) => (
                                        <div key={i} className="text-[10px] text-red-300 leading-snug">
                                            • {msg}
        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={handleClearExpiredQuests}
                                        className="text-[10px] font-bold text-red-300 underline hover:text-white cursor-pointer"
                                    >
                                        알림 모두 지우기
                                    </button>
        </div>
                            )}

                            {classifiedQuests.emergencyQuests.map(q => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => triggerEmergencyBattle(q)}
                                    className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-red-950 to-slate-950 border border-red-500 hover:border-red-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-[10px] text-red-300 font-black mb-0.5">
                                        <span>🚨 긴급 출격 (도시 내 몬스터 출몰)</span>
                                        <span>즉시 교전</span>
        </div>
                                    <div className="text-xs font-black text-white">{q.title}</div>
                                    <div className="text-[10px] text-red-200/80 mt-0.5 truncate">{q.goal}</div>
                                </button>
                            ))}

                            {classifiedQuests.isWarState && (
                                <button
                                    type="button"
                                    onClick={() => setIsFrontlineOpen(true)}
                                    className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-rose-950/90 to-slate-950 border border-rose-500/80 hover:border-rose-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-[10px] text-rose-300 font-black mb-0.5">
                                        <span className="flex items-center gap-1"><Flame size={11} /> 전선 상황실</span>
                                        <span>점유율 {classifiedQuests.occupation}%</span>
        </div>
                                    <div className="text-xs font-black text-white">{nation} 교전 구역 작전</div>
                                </button>
                            )}

                            {classifiedQuests.escortQuests.map(q => (
                                <div
                                    key={q.id}
                                    className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-500/60 space-y-1.5"
                                >
                                    <div className="flex items-center justify-between text-[10px] text-blue-300 font-bold">
                                        <span className="flex items-center gap-1"><Truck size={11} /> {q.isEscortStarted ? '호송 동행 중' : '호송 대기'}</span>
                                        <span>→ {q.destination?.city || '목적지'}</span>
        </div>
                                    <div className="text-xs font-black text-white">{q.title}</div>
                                    {!q.isEscortStarted ? (
                                        <button
                                            type="button"
                                            onClick={() => handleStartEscortQuest(q)}
                                            className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black cursor-pointer"
                                        >
                                            🛡️ 호송/호위 출발 (대열 합류)
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onOpenMap}
                                            className="w-full py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-black cursor-pointer"
                                        >
                                            🗺️ 세계 지도 열기 ({q.destination?.city || '목적지'})
                                        </button>
                                    )}
        </div>
                            ))}

                            {classifiedQuests.instructorQuests.map(q => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => onEnterCity('Academic')}
                                    className="w-full text-left p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/60 hover:border-cyan-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold mb-0.5">
                                        <span className="flex items-center gap-1"><BookOpen size={11} /> 학교 파견 교관</span>
                                        <span>학교 이동</span>
        </div>
                                    <div className="text-xs font-black text-white">{q.title}</div>
                                </button>
                            ))}

                            {classifiedQuests.combatAndHuntQuests.map(q => {
                                const cur = q.currentAmount || 0;
                                const tgt = q.targetAmount || 1;
                                const pct = Math.min(100, Math.round((cur / Math.max(1, tgt)) * 100));
                                return (
                                    <div key={q.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                                            <span className="flex items-center gap-1"><Swords size={11} /> {q.type === 'Collection' ? '수집' : q.type === 'BountyHunt' ? '현상수배' : '토벌'}</span>
                                            <span>{cur} / {tgt} ({pct}%)</span>
        </div>
                                        <div className="text-xs font-bold text-white truncate">{q.title}</div>
                                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onEnterCity('Gate', true)}
                                                className="flex-1 py-1 rounded-lg bg-amber-700/80 hover:bg-amber-600 text-white text-[10px] font-bold cursor-pointer"
                                            >
                                                외곽 사냥터
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onOpenDungeon}
                                                className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
                                            >
                                                던전 입장
                                            </button>
        </div>
        </div>
                                );
                            })}

                            {classifiedQuests.dungeonQuests.map(q => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={onOpenDungeon}
                                    className="w-full text-left p-2.5 rounded-xl bg-violet-950/50 border border-violet-500/50 hover:border-violet-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-[10px] text-violet-300 font-bold mb-0.5">
                                        <span>🧭 {q.type === 'Rescue' ? '실종자 구출' : '던전 수색'}</span>
                                        <span>던전 입장</span>
        </div>
                                    <div className="text-xs font-bold text-white truncate">{q.title}</div>
                                </button>
                            ))}

                            {classifiedQuests.factionOpsQuests.map(q => {
                                const isMil = q.type.startsWith('Military');
                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() =>
                                            q.type === 'MilitaryAttackShare' && classifiedQuests.isWarState
                                                ? setIsFrontlineOpen(true)
                                                : isMil
                                                ? setShowMilitaryOpsModal(true)
                                                : onEnterCity('Mercenary')
                                        }
                                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-indigo-400 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between text-[10px] text-indigo-300 font-bold mb-0.5">
                                            <span>{isMil ? '🎖️ 군사 작전' : '📜 용병 의뢰'}</span>
                                            <span>{isMil ? '군 사령부' : '용병 길드'}</span>
        </div>
                                        <div className="text-xs font-bold text-white truncate">{q.title}</div>
                                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{q.goal}</div>
                                    </button>
                                );
                            })}
        </div>
                    )}
        </div>
            )}

            {/* 근접 상호작용 플로팅 프롬프트 (모바일은 상단 중앙 고정으로 하단 패드/퀵바와 겹침 0%) */}
            {nearbyLabel && !dialogue && (
                <button
                    type="button"
                    onClick={handleInteract}
                    className="absolute top-2.5 left-1/2 -translate-x-1/2 sm:top-auto sm:bottom-20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-950/92 hover:bg-amber-950/90 border-2 border-amber-400/80 text-amber-200 text-[11px] sm:text-xs font-black shadow-xl flex items-center gap-1.5 animate-bounce cursor-pointer z-20 max-w-[72%] sm:max-w-none truncate"
                >
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{nearbyLabel}</span>
                </button>
            )}

            {/* 쯔꾸르 정통 하단 NPC 대화창 */}
            {dialogue && (
                <div
                    onClick={handleInteract}
                    className="absolute bottom-3 left-2.5 right-2.5 sm:bottom-5 sm:left-8 sm:right-8 z-30 cursor-pointer rounded-2xl border-2 border-slate-100/90 bg-gradient-to-b from-blue-950/95 via-slate-950/95 to-slate-950/98 p-3 sm:p-4 shadow-[0_0_30px_rgba(0,0,0,0.85)]"
                >
                    <div className="flex items-start gap-3">
                        {(() => {
                            const sn = character.socialNetwork?.find(s => s.name === dialogue.npcName);
                            const cp = character.companions?.find(c => c.name === dialogue.npcName);
                            const vUrl = sn?.visualUrl || cp?.visualUrl;
                            return vUrl ? (
                                <img src={vUrl} alt={dialogue.npcName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-amber-400/60 bg-slate-900 shrink-0" />
                            ) : dialogue.spriteUrl ? (
                                <div
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-amber-400/60 bg-slate-900 shrink-0"
                                    style={{ backgroundImage: `url(${dialogue.spriteUrl})`, backgroundSize: '300% 400%', backgroundPosition: '50% 0%', imageRendering: 'pixelated' }}
                                />
                            ) : null;
                        })()}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-amber-400" />
                                    <span className="text-xs sm:text-sm font-black text-amber-300">{dialogue.npcName}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                        {dialogue.npcRole}
                                    </span>
        </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    {dialogue.lineIndex + 1} / {dialogue.lines.length}
                                </span>
        </div>
                            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed min-h-[2.4rem] font-medium">
                                {currentDialogueText}
                            </p>
                            <div className="flex justify-between items-center gap-2 mt-1">
                                {dialogue.actionLabel && dialogue.onActionAfter ? (
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            const cb = dialogue.onActionAfter;
                                            setDialogue(null);
                                            setTypedChars(0);
                                            cb?.();
                                        }}
                                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black shadow cursor-pointer"
                                    >
                                        {dialogue.actionLabel}
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-amber-300/90 font-bold animate-pulse">
                                    <CornerDownLeft size={11} />
                                    <span>클릭 또는 Space / Enter 계속</span>
        </div>
        </div>
        </div>
        </div>
        </div>
            )}

            {/* 모바일 컴팩트 가상 D-Pad (좌하단) + 확인 버튼 (우하단) — 퀵바 펼침 시 자동으로 위로 이동해 겹침 방지 */}
            {!dialogue && (
                <>
                    <div className={`sm:hidden absolute left-2.5 z-20 grid grid-cols-3 gap-0.5 w-24 h-24 transition-all ${showQuickBar ? 'bottom-[74px]' : 'bottom-9'}`}>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'up'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/75 active:bg-amber-600/85 border border-slate-600/80 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowUp size={14} />
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'left'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/75 active:bg-amber-600/85 border border-slate-600/80 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowLeft size={14} />
                        </button>
                        <div className="rounded-lg bg-slate-950/50 border border-slate-800/70" />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'right'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/75 active:bg-amber-600/85 border border-slate-600/80 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowRight size={14} />
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadDirRef.current = 'down'; }}
                            onPointerUp={() => { dpadDirRef.current = null; }}
                            onPointerLeave={() => { dpadDirRef.current = null; }}
                            className="bg-slate-900/75 active:bg-amber-600/85 border border-slate-600/80 rounded-lg flex items-center justify-center text-white"
                        >
                            <ArrowDown size={14} />
                        </button>
                        <div />
        </div>

                    <button
                        type="button"
                        onClick={handleInteract}
                        className={`sm:hidden absolute right-2.5 z-20 w-12 h-12 rounded-full bg-amber-600/90 active:scale-95 border-2 border-amber-300 text-white font-black text-[11px] shadow-xl flex flex-col items-center justify-center transition-all ${showQuickBar ? 'bottom-[82px]' : 'bottom-12'}`}
                    >
                        <span>확인</span>
                    </button>
                </>
            )}

            {/* 하단 접이식 빠른 이동 퀵바 (걷지 않고 즉시 구역 진입 지원) */}
            {!dialogue && (
                <div className="absolute bottom-2 left-2 right-2 z-20 flex flex-col items-center pointer-events-none">
                    <button
                        type="button"
                        onClick={() => setShowQuickBar(v => !v)}
                        className="pointer-events-auto mb-1 px-2.5 py-0.5 rounded-lg bg-slate-950/88 border border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-amber-300 flex items-center gap-1 shadow"
                    >
                        <MapIcon size={11} className="text-amber-400" />
                        <span>빠른 이동</span>
                        {showQuickBar ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    </button>
                    {showQuickBar && (
                        <div className="pointer-events-auto max-w-full overflow-x-auto flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-950/92 border border-slate-700/80 backdrop-blur-md shadow-xl custom-scrollbar">
                            {mapData.portals.map(pt => (
                                <button
                                    key={pt.id}
                                    type="button"
                                    onClick={() => triggerPortalAction(pt)}
                                    className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/70 text-[10px] sm:text-[10.5px] font-bold text-slate-200 whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 shrink-0"
                                >
                                    <span>{pt.iconText}</span>
                                    <span>{pt.label}</span>
                                </button>
                            ))}
        </div>
                    )}
        </div>
            )}
            {isFrontlineOpen && nation && onUpdateCharacter && (
                <FrontlineModal
                    character={character}
                    targetNation={nation}
                    onClose={() => setIsFrontlineOpen(false)}
                    onAttack={() => {
                        setIsFrontlineOpen(false);
                        onUpdateCharacter(character, `[군사 작전] ${nation} 전선 돌파 작전을 개시합니다.`);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {showMilitaryOpsModal && onUpdateCharacter && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                    <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                                🎖️ {city} 군사 작전 수행 패널
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowMilitaryOpsModal(false)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                        <MilitaryCityActionPanel
                            character={character}
                            onUpdateCharacter={onUpdateCharacter}
                            onStartBattle={onStartBattle}
                            onOpenInfiltrationModal={() => {
                                setShowMilitaryOpsModal(false);
                                setIsInfiltrationModalOpen(true);
                            }}
                        />
                    </div>
                </div>
            )}

            {(() => {
                const infilQuest = (character.militaryData?.activeMissions || []).find(
                    m => m.type === 'MilitaryInfiltration' && (m.currentAmount || 0) < (m.targetAmount || 1)
                );
                if (!infilQuest || !isInfiltrationModalOpen || !onUpdateCharacter) return null;
                return (
                    <MilitaryInfiltrationModal
                        isOpen={isInfiltrationModalOpen}
                        onClose={() => setIsInfiltrationModalOpen(false)}
                        character={character}
                        quest={infilQuest}
                        onUpdateCharacter={onUpdateCharacter}
                        onStartBattle={onStartBattle}
                    />
                );
            })()}

            {showRegionalAdmin && onUpdateCharacter && (
                <RegionalAdminCanvas
                    character={character}
                    region={region}
                    nation={nation}
                    city={city}
                    isCapital={tier === 'Capital'}
                    onUpdateCharacter={onUpdateCharacter}
                    onClose={() => setShowRegionalAdmin(false)}
                />
            )}

            {resultData && (
                <ActionResultModal
                    data={resultData}
                    onClose={() => setResultData(null)}
                />
            )}

            {isHuntInfoOpen && (
                <HuntMapModal
                    isOpen={isHuntInfoOpen}
                    onClose={() => setIsHuntInfoOpen(false)}
                    character={character}
                    onEnterField={() => {}}
                    readOnlyInfoOnly={true}
                />
            )}
        </div>
    );
};

export default CityRpgCanvas;
