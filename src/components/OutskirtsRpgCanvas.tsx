import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, Enemy } from '../types';
import {
    getHuntBandsForLocation,
    getMonsterInfo,
    getMonsterPoolForBand,
    HuntZoneInfo,
    NATION_THEMES
} from '../monsterfield';
import { generateEnemyStats } from '../utils';
import {
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    resolveCityCultureKey,
    TerrainTilePart
} from '../services/cityAssetManifest';
import {
    DIRECTION_ROW_MAP,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import { CITY_TILE_SIZE } from '../services/cityTilemapEngine';
import { parseHour } from '../services/facilityOperatingService';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, DoorOpen, Footprints, Skull, Sword, X } from 'lucide-react';

interface OutskirtsRpgCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onEnterField: (bandId: string, minLvl: number, maxLvl: number) => void;
    onStartBattle?: (enemies: Enemy[], battleType: string, sourceId?: string) => void;
}

interface PlacedHuntZone {
    zone: HuntZoneInfo;
    tx: number;
    ty: number;
    color: string;
}

interface FieldMonsterNode {
    id: string;
    name: string;
    level: number;
    isElite: boolean;
    visualUrl?: string;
    shinryokuType: string;
    px: number;
    py: number;
    homePx: number;
    homePy: number;
    targetPx: number | null;
    targetPy: number | null;
    wanderTimer: number;
    dir: 'left' | 'right';
    respawnTimer: number; // > 0 means defeated & waiting to respawn
}

interface FieldPropNode {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    kind: 'tree' | 'rock' | 'nest' | 'camp' | 'pillar' | 'rift';
}

const HUB_COLS = 24;
const HUB_ROWS = 16;
const FIELD_COLS = 28;
const FIELD_ROWS = 18;

const DIFFICULTY_COLORS = [
    '#22c55e',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#f43f5e'
];

export function getRegionalHuntStyle(region: string, nation: string, zoneId?: string) {
    if (zoneId === 'abyss' || zoneId === 'mythic') {
        return {
            tileKey: 'hunt_tile_abyss',
            groundA: '#1e1b4b',
            groundB: '#312e81',
            trail: '#4c1d95',
            wall: '#0f172a',
            treeKind: 'rift' as const,
            rockKind: 'rock' as const,
            accent: '#c084fc',
            label: '차원 균열 지대'
        };
    }
    if (region === '마계' || nation.includes('임페리얼') || nation.includes('마계')) {
        return {
            tileKey: 'hunt_tile_magye',
            groundA: '#27171a',
            groundB: '#3b1d22',
            trail: '#451a03',
            wall: '#18181b',
            treeKind: 'rift' as const,
            rockKind: 'rock' as const,
            accent: '#ef4444',
            label: '심연 마계령'
        };
    }
    if (region === '신계' || nation.includes('신계') || nation.includes('성전')) {
        return {
            tileKey: 'hunt_tile_divine',
            groundA: '#312e81',
            groundB: '#3730a3',
            trail: '#fef3c7',
            wall: '#475569',
            treeKind: 'pillar' as const,
            rockKind: 'pillar' as const,
            accent: '#fbbf24',
            label: '성역 신계령'
        };
    }
    if (nation.includes('엘프') || nation.includes('숲') || nation.includes('실바나르')) {
        return {
            tileKey: 'hunt_tile_elf',
            groundA: '#064e3b',
            groundB: '#065f46',
            trail: '#78350f',
            wall: '#022c22',
            treeKind: 'tree' as const,
            rockKind: 'rock' as const,
            accent: '#34d399',
            label: '엘프 세계수 숲'
        };
    }
    if (nation.includes('레오니스') || nation.includes('수인') || region === '아프리카') {
        return {
            tileKey: 'hunt_tile_savanna',
            groundA: '#78350f',
            groundB: '#92400e',
            trail: '#b45309',
            wall: '#451a03',
            treeKind: 'tree' as const,
            rockKind: 'rock' as const,
            accent: '#fb923c',
            label: '야수 대평원'
        };
    }
    if (['대한민국', '일본', '중국', '아시아', '태국', '베트남', '인도'].includes(nation)) {
        return {
            tileKey: 'hunt_tile_asia',
            groundA: '#14532d',
            groundB: '#166534',
            trail: '#57534e',
            wall: '#1e293b',
            treeKind: 'tree' as const,
            rockKind: 'rock' as const,
            accent: '#818cf8',
            label: '동방 영맥지대'
        };
    }
    return {
        tileKey: 'hunt_tile_grass',
        groundA: '#166534',
        groundB: '#15803d',
        trail: '#78716c',
        wall: '#1e293b',
        treeKind: 'tree' as const,
        rockKind: 'rock' as const,
        accent: '#4ade80',
        label: '야외 변경 지대'
    };
}

const OutskirtsRpgCanvas: React.FC<OutskirtsRpgCanvasProps> = ({
    character,
    region,
    nation,
    city,
    onExitToCity,
    onEnterField,
    onStartBattle
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 580 });
    const [activeZone, setActiveZone] = useState<PlacedHuntZone | null>(null);
    const [selectedZone, setSelectedZone] = useState<PlacedHuntZone | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [aliveCount, setAliveCount] = useState<number>(0);

    const cultureKey = useMemo(() => resolveCityCultureKey(region, nation, city), [region, nation, city]);
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, region, nation).url,
        [character, region, nation]
    );
    const huntStyle = useMemo(
        () => getRegionalHuntStyle(region, nation, activeZone?.zone.id),
        [region, nation, activeZone?.zone.id]
    );

    const zones = useMemo<PlacedHuntZone[]>(() => {
        const bands = getHuntBandsForLocation(nation, region, city);
        const slots: Array<{ tx: number; ty: number }> = [
            { tx: 4, ty: 3 },
            { tx: 9, ty: 3 },
            { tx: 14, ty: 3 },
            { tx: 19, ty: 3 },
            { tx: 4, ty: 7 },
            { tx: 9, ty: 7 },
            { tx: 14, ty: 7 },
            { tx: 19, ty: 7 },
            { tx: 6, ty: 11 },
            { tx: 17, ty: 11 }
        ];
        return bands.slice(0, slots.length).map((zone, idx) => ({
            zone,
            tx: slots[idx].tx,
            ty: slots[idx].ty,
            color: DIFFICULTY_COLORS[idx % DIFFICULTY_COLORS.length]
        }));
    }, [nation, region, city]);

    const activeZoneIndex = useMemo(
        () => (activeZone ? zones.findIndex(z => z.zone.id === activeZone.zone.id) : -1),
        [activeZone, zones]
    );
    const nextZone = useMemo(
        () => (activeZoneIndex >= 0 && activeZoneIndex + 1 < zones.length ? zones[activeZoneIndex + 1] : null),
        [activeZoneIndex, zones]
    );
    const fieldDims = useMemo(() => {
        if (!activeZone) return { cols: HUB_COLS, rows: HUB_ROWS, monsterCount: 0 };
        if (activeZoneIndex <= 1) return { cols: 28, rows: 18, monsterCount: 12 };
        if (activeZoneIndex <= 4) return { cols: 34, rows: 22, monsterCount: 18 };
        if (activeZoneIndex <= 7) return { cols: 40, rows: 26, monsterCount: 24 };
        return { cols: 46, rows: 30, monsterCount: 30 };
    }, [activeZone, activeZoneIndex]);

    const fieldProps = useMemo<FieldPropNode[]>(() => {
        const tk = huntStyle.treeKind;
        const rk = huntStyle.rockKind;
        const treeKey = tk === 'rift' ? 'hunt_prop_obsidian' : tk === 'pillar' ? 'hunt_prop_ruin_pillar' : 'hunt_prop_tree';
        const spiritKey = tk === 'rift' ? 'hunt_prop_rift_stone' : 'hunt_prop_spirit_tree';
        const rockKey = rk === 'pillar' ? 'hunt_prop_ruin_pillar' : 'hunt_prop_rock';
        if (!activeZone) {
            return [
                { key: spiritKey, tx: 11, ty: 1.0, w: 2, h: 2, kind: tk },
                { key: treeKey, tx: 1.1, ty: 1.1, w: 2, h: 2, kind: tk },
                { key: treeKey, tx: 20.9, ty: 1.1, w: 2, h: 2, kind: tk },
                { key: rockKey, tx: 1.2, ty: 4.9, w: 1.6, h: 1.6, kind: rk },
                { key: rockKey, tx: 21.1, ty: 4.9, w: 1.6, h: 1.6, kind: rk },
                { key: treeKey, tx: 1.1, ty: 8.8, w: 2, h: 2, kind: tk },
                { key: treeKey, tx: 20.9, ty: 8.8, w: 2, h: 2, kind: tk },
                { key: spiritKey, tx: 2.2, ty: 11.8, w: 2, h: 2, kind: tk },
                { key: spiritKey, tx: 19.8, ty: 11.8, w: 2, h: 2, kind: tk },
                { key: 'hunt_prop_camp', tx: 9.2, ty: 10.2, w: 2, h: 2, kind: 'camp' }
            ];
        }
        const c = fieldDims.cols;
        const r = fieldDims.rows;
        const list: FieldPropNode[] = [
            { key: treeKey, tx: 2.5, ty: 2.5, w: 2, h: 2, kind: tk },
            { key: treeKey, tx: c - 5, ty: 2.5, w: 2, h: 2, kind: tk },
            { key: spiritKey, tx: Math.floor(c * 0.28), ty: Math.floor(r * 0.25), w: 2, h: 2, kind: tk },
            { key: spiritKey, tx: Math.floor(c * 0.68), ty: Math.floor(r * 0.25), w: 2, h: 2, kind: tk },
            { key: rockKey, tx: 4.0, ty: Math.floor(r * 0.55), w: 2, h: 1.8, kind: rk },
            { key: rockKey, tx: c - 6.5, ty: Math.floor(r * 0.55), w: 2, h: 1.8, kind: rk },
            { key: 'hunt_prop_nest', tx: Math.floor(c * 0.48), ty: Math.floor(r * 0.42), w: 2, h: 1.8, kind: 'nest' },
            { key: 'hunt_prop_nest', tx: 5.0, ty: r - 5, w: 2, h: 1.8, kind: 'nest' },
            { key: 'hunt_prop_nest', tx: c - 7.5, ty: r - 5, w: 2, h: 1.8, kind: 'nest' },
            { key: 'hunt_prop_camp', tx: Math.floor(c / 2) - 2, ty: r - 3.6, w: 2, h: 1.6, kind: 'camp' }
        ];
        if (c >= 34) {
            list.push(
                { key: treeKey, tx: Math.floor(c * 0.16), ty: Math.floor(r * 0.72), w: 2, h: 2, kind: tk },
                { key: treeKey, tx: Math.floor(c * 0.80), ty: Math.floor(r * 0.72), w: 2, h: 2, kind: tk },
                { key: 'hunt_prop_nest', tx: Math.floor(c * 0.34), ty: Math.floor(r * 0.68), w: 2, h: 1.8, kind: 'nest' },
                { key: 'hunt_prop_nest', tx: Math.floor(c * 0.64), ty: Math.floor(r * 0.68), w: 2, h: 1.8, kind: 'nest' }
            );
        }
        return list;
    }, [activeZone, huntStyle, fieldDims]);

    const monsterPool = useMemo(() => {
        if (!activeZone) return [];
        const theme = NATION_THEMES[city] || NATION_THEMES[nation] || NATION_THEMES[region] || NATION_THEMES['default'];
        const rawPool = getMonsterPoolForBand(theme, activeZone.zone.id);
        return rawPool.map(entry => {
            const name = typeof entry === 'string' ? entry : entry.name;
            const info = getMonsterInfo(name);
            return {
                name,
                visualUrl: info.visualUrl,
                shinryokuType: info.shinryokuType || '무속성'
            };
        });
    }, [activeZone, city, nation, region]);

    const monsterImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    useEffect(() => {
        monsterPool.forEach(m => {
            if (!m.visualUrl || monsterImgCacheRef.current.has(m.visualUrl)) return;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = m.visualUrl;
            monsterImgCacheRef.current.set(m.visualUrl, img);
        });
    }, [monsterPool]);

    const createSpawnedMonster = useCallback(
        (idx: number, slot: { tx: number; ty: number }, zone: HuntZoneInfo): FieldMonsterNode => {
            const pick = monsterPool[idx % Math.max(1, monsterPool.length)] || {
                name: '야생 마물',
                visualUrl: undefined,
                shinryokuType: '무속성'
            };
            const [minL, maxL] = zone.levelRange;
            const lvl = minL + Math.floor(Math.random() * Math.max(1, maxL - minL + 1));
            const isElite = idx % 5 === 4;
            const px = (slot.tx + 0.5) * CITY_TILE_SIZE;
            const py = (slot.ty + 0.5) * CITY_TILE_SIZE;
            return {
                id: `hm_${idx}_${Date.now()}`,
                name: isElite ? `${pick.name} (우두머리)` : pick.name,
                level: isElite ? lvl + 3 : lvl,
                isElite,
                visualUrl: pick.visualUrl,
                shinryokuType: pick.shinryokuType,
                px,
                py,
                homePx: px,
                homePy: py,
                targetPx: null,
                targetPy: null,
                wanderTimer: 0.8 + Math.random() * 2.2,
                dir: Math.random() > 0.5 ? 'left' : 'right',
                respawnTimer: 0
            };
        },
        [monsterPool]
    );

    const monsterSpawnSlots = useMemo(() => {
        if (!activeZone) return [];
        const slots: Array<{ tx: number; ty: number }> = [];
        const c = fieldDims.cols;
        const r = fieldDims.rows;
        const count = fieldDims.monsterCount;
        const gridCols = Math.ceil(Math.sqrt(count * (c / r)));
        const gridRows = Math.ceil(count / gridCols);
        for (let gy = 0; gy < gridRows && slots.length < count; gy++) {
            for (let gx = 0; gx < gridCols && slots.length < count; gx++) {
                const tx = Math.max(3, Math.min(c - 4, Math.round(3 + ((gx + 0.5) / gridCols) * (c - 6))));
                const ty = Math.max(3, Math.min(r - 4, Math.round(3 + ((gy + 0.5) / gridRows) * (r - 6))));
                // Avoid top-center next-zone portal and bottom-center entrance
                if (Math.abs(tx - Math.floor(c / 2)) <= 2 && (ty <= 3 || ty >= r - 3)) continue;
                slots.push({ tx, ty });
            }
        }
        return slots;
    }, [activeZone, fieldDims]);

    const monstersRef = useRef<FieldMonsterNode[]>([]);
    useEffect(() => {
        if (!activeZone) {
            monstersRef.current = [];
            setAliveCount(0);
            return;
        }
        monstersRef.current = monsterSpawnSlots.map((slot, idx) =>
            createSpawnedMonster(idx, slot, activeZone.zone)
        );
        setAliveCount(monsterSpawnSlots.length);
    }, [activeZone, monsterSpawnSlots, createSpawnedMonster]);

    const cols = fieldDims.cols;
    const rows = fieldDims.rows;

    const solidSet = useMemo(() => {
        const set = new Set<string>();
        const exitMin = activeZone ? Math.floor(cols / 2) - 2 : 10;
        const exitMax = activeZone ? Math.floor(cols / 2) + 1 : 13;
        for (let x = 0; x < cols; x++) {
            set.add(`${x},0`);
            if (x < exitMin || x > exitMax) set.add(`${x},${rows - 1}`);
        }
        for (let y = 0; y < rows; y++) {
            set.add(`0,${y}`);
            set.add(`${cols - 1},${y}`);
        }
        if (activeZone) {
            fieldProps.forEach(pr => {
                if (pr.kind === 'nest' || pr.kind === 'camp') return;
                for (let y = Math.floor(pr.ty); y < Math.ceil(pr.ty + pr.h - 0.3); y++) {
                    for (let x = Math.floor(pr.tx); x < Math.ceil(pr.tx + pr.w - 0.3); x++) {
                        set.add(`${x},${y}`);
                    }
                }
            });
        }
        return set;
    }, [cols, rows, activeZone, fieldProps]);

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        (['ground', 'road', 'plaza', 'wall'] as TerrainTilePart[]).forEach(p => {
            loadCityAssetImage(getTerrainTileUrl(cultureKey, p));
        });
        [
            'hunt_tile_grass',
            'hunt_tile_trail',
            'hunt_tile_asia',
            'hunt_tile_savanna',
            'hunt_tile_elf',
            'hunt_tile_magye',
            'hunt_tile_divine',
            'hunt_tile_abyss',
            'hunt_prop_tree',
            'hunt_prop_rock',
            'hunt_prop_camp',
            'hunt_prop_nest',
            'hunt_prop_spirit_tree',
            'hunt_prop_obsidian',
            'hunt_prop_ruin_pillar',
            'hunt_prop_rift_stone'
        ].forEach(k => loadCityAssetImage(getInteriorPropSpriteUrl(k)));
    }, [playerSpriteUrl, cultureKey]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 80 && height > 80) {
                    setViewportSize({ w: Math.floor(width), h: Math.floor(height) });
                }
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const playerRef = useRef({
        x: 11.5 * CITY_TILE_SIZE,
        y: 13.5 * CITY_TILE_SIZE,
        dir: 'up' as SpriteDirection,
        moving: false,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());
    const dpadRef = useRef<SpriteDirection | null>(null);
    const cameraRef = useRef({ x: 0, y: 0 });
    const exitCooldownRef = useRef<number>(Date.now() + 700);
    const battleGraceRef = useRef<number>(Date.now() + 1200);

    const enterHuntZone = useCallback((z: PlacedHuntZone) => {
        setSelectedZone(null);
        const idx = zones.findIndex(item => item.zone.id === z.zone.id);
        const nextCols = idx <= 1 ? 28 : idx <= 4 ? 34 : idx <= 7 ? 40 : 46;
        const nextRows = idx <= 1 ? 18 : idx <= 4 ? 22 : idx <= 7 ? 26 : 30;
        playerRef.current.x = Math.floor(nextCols / 2) * CITY_TILE_SIZE;
        playerRef.current.y = (nextRows - 2.4) * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
        battleGraceRef.current = Date.now() + 1400;
        try {
            sessionStorage.setItem(
                'shinryoku_outskirts_resume',
                JSON.stringify({ charId: character.id, city, zoneId: z.zone.id })
            );
        } catch {}
        setActiveZone(z);
    }, [zones, character.id, city]);

    const exitFieldToHub = useCallback(() => {
        setSelectedZone(null);
        setActiveZone(null);
        playerRef.current.x = 11.5 * CITY_TILE_SIZE;
        playerRef.current.y = 13.5 * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
        try {
            sessionStorage.setItem(
                'shinryoku_outskirts_resume',
                JSON.stringify({ charId: character.id, city, zoneId: null })
            );
        } catch {}
    }, [character.id, city]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_outskirts_resume');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.charId === character.id && parsed?.city === city && parsed?.zoneId) {
                const found = zones.find(z => z.zone.id === parsed.zoneId);
                if (found) {
                    enterHuntZone(found);
                }
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const engageMonster = useCallback(
        (m: FieldMonsterNode) => {
            if (!activeZone || m.respawnTimer > 0) return;
            m.respawnTimer = 8.5; // Respawns after 8.5s
            battleGraceRef.current = Date.now() + 1800;
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;

            if (onStartBattle) {
                const count = m.isElite ? 2 : 1 + Math.floor(Math.random() * 2);
                const enemies: Enemy[] = [];
                for (let i = 0; i < count; i++) {
                    const isBossUnit = i === 0 && m.isElite;
                    const stats = generateEnemyStats(m.level, isBossUnit ? 'elite' : 'normal');
                    enemies.push({
                        name: count > 1 ? `${m.name} ${String.fromCharCode(65 + i)}` : m.name,
                        level: m.level,
                        hp: stats.maxHp,
                        maxHp: stats.maxHp,
                        stats,
                        statusEffects: [],
                        visualUrl: m.visualUrl,
                        shinryokuType: m.shinryokuType || '무속성'
                    });
                }
                onStartBattle(enemies, 'Hunt', activeZone.zone.id);
                return;
            }
            onEnterField(activeZone.zone.id, activeZone.zone.levelRange[0], activeZone.zone.levelRange[1]);
        },
        [activeZone, onStartBattle, onEnterField]
    );

    const findNearestZone = useCallback(() => {
        if (activeZone) return null;
        const p = playerRef.current;
        for (const z of zones) {
            const zx = (z.tx + 0.5) * CITY_TILE_SIZE;
            const zy = (z.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(zx - p.x, zy - p.y) <= CITY_TILE_SIZE * 1.65) {
                return z;
            }
        }
        return null;
    }, [zones, activeZone]);

    const handleInteract = useCallback(() => {
        if (!activeZone) {
            const z = findNearestZone();
            if (z) setSelectedZone(z);
            return;
        }
        const p = playerRef.current;
        if (nextZone) {
            const nx = (cols / 2) * CITY_TILE_SIZE;
            const ny = 1.7 * CITY_TILE_SIZE;
            if (Math.hypot(nx - p.x, ny - p.y) <= CITY_TILE_SIZE * 1.8) {
                enterHuntZone(nextZone);
                return;
            }
        }
        for (const m of monstersRef.current) {
            if (m.respawnTimer <= 0 && Math.hypot(m.px - p.x, m.py - p.y) <= CITY_TILE_SIZE * 1.8) {
                engageMonster(m);
                return;
            }
        }
    }, [activeZone, nextZone, cols, findNearestZone, enterHuntZone, engageMonster]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                keysRef.current.add(k);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
            } else if (k === ' ' || k === 'enter') {
                e.preventDefault();
                handleInteract();
            } else if (k === 'escape') {
                if (selectedZone) setSelectedZone(null);
                else if (activeZone) exitFieldToHub();
                else onExitToCity();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [handleInteract, onExitToCity, exitFieldToHub, activeZone, selectedZone]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mapW = cols * CITY_TILE_SIZE;
        const mapH = rows * CITY_TILE_SIZE;
        const offsetX = mapW < viewportSize.w ? Math.floor((viewportSize.w - mapW) / 2) : -cameraRef.current.x;
        const offsetY = mapH < viewportSize.h ? Math.floor((viewportSize.h - mapH) / 2) : -cameraRef.current.y;
        const wx = e.clientX - rect.left - offsetX;
        const wy = e.clientY - rect.top - offsetY;

        if (!activeZone) {
            for (const z of zones) {
                const zx = (z.tx + 0.5) * CITY_TILE_SIZE;
                const zy = (z.ty + 0.5) * CITY_TILE_SIZE;
                if (Math.hypot(wx - zx, wy - zy) <= 36) {
                    setSelectedZone(z);
                    return;
                }
            }
            if (wx >= 10 * CITY_TILE_SIZE && wx <= 14 * CITY_TILE_SIZE && wy >= (rows - 1) * CITY_TILE_SIZE - 12) {
                onExitToCity();
                return;
            }
        } else {
            if (nextZone) {
                const nx = (cols / 2) * CITY_TILE_SIZE;
                const ny = 1.7 * CITY_TILE_SIZE;
                if (Math.hypot(wx - nx, wy - ny) <= 38) {
                    enterHuntZone(nextZone);
                    return;
                }
            }
            for (const m of monstersRef.current) {
                if (m.respawnTimer <= 0 && Math.hypot(wx - m.px, wy - m.py) <= 30) {
                    if (Math.hypot(m.px - playerRef.current.x, m.py - playerRef.current.y) <= CITY_TILE_SIZE * 2.2) {
                        engageMonster(m);
                        return;
                    }
                    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
                    playerRef.current.targetX = m.px;
                    playerRef.current.targetY = m.py;
                    return;
                }
            }
            const exitMinX = (Math.floor(cols / 2) - 2) * CITY_TILE_SIZE;
            const exitMaxX = (Math.floor(cols / 2) + 2) * CITY_TILE_SIZE;
            if (wx >= exitMinX && wx <= exitMaxX && wy >= (rows - 1) * CITY_TILE_SIZE - 12) {
                exitFieldToHub();
                return;
            }
        }
        setSelectedZone(null);
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;

        const isBlocked = (px: number, py: number) => {
            const tx = Math.floor(px / CITY_TILE_SIZE);
            const ty = Math.floor(py / CITY_TILE_SIZE);
            if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
            return solidSet.has(`${tx},${ty}`);
        };

        const loop = (now: number) => {
            const dt = Math.min(0.033, Math.max(0.001, (now - lastTs) / 1000));
            lastTs = now;

            const p = playerRef.current;
            let vx = 0;
            let vy = 0;
            const keys = keysRef.current;
            if (keys.has('arrowleft') || keys.has('a') || dpadRef.current === 'left') vx -= 1;
            if (keys.has('arrowright') || keys.has('d') || dpadRef.current === 'right') vx += 1;
            if (keys.has('arrowup') || keys.has('w') || dpadRef.current === 'up') vy -= 1;
            if (keys.has('arrowdown') || keys.has('s') || dpadRef.current === 'down') vy += 1;

            const speed = 200;
            const maxStep = speed * dt;
            let isClickMoving = false;
            let clickStepDist = maxStep;
            if (vx === 0 && vy === 0 && p.targetX !== null && p.targetY !== null) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= Math.max(4, maxStep)) {
                    if (!isBlocked(p.targetX, p.targetY)) {
                        p.x = p.targetX;
                        p.y = p.targetY;
                    }
                    p.targetX = null;
                    p.targetY = null;
                } else {
                    vx = dx / dist;
                    vy = dy / dist;
                    isClickMoving = true;
                    clickStepDist = Math.min(maxStep, dist);
                }
            }

            if (vx !== 0 || vy !== 0) {
                const len = Math.hypot(vx, vy) || 1;
                const step = isClickMoving ? clickStepDist : maxStep;
                const nx = p.x + (vx / len) * step;
                const ny = p.y + (vy / len) * step;
                if (!isBlocked(nx, p.y)) p.x = nx;
                if (!isBlocked(p.x, ny)) p.y = ny;
                p.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
                p.moving = true;
                p.animTimer += dt;
                if (p.animTimer >= 0.14) {
                    p.animTimer = 0;
                    p.walkFrame = (p.walkFrame + 1) % 3;
                }
            } else {
                p.moving = false;
                p.walkFrame = 1;
            }

            const ptx = Math.floor(p.x / CITY_TILE_SIZE);
            const pty = Math.floor(p.y / CITY_TILE_SIZE);
            const exitMin = activeZone ? Math.floor(cols / 2) - 2 : 10;
            const exitMax = activeZone ? Math.floor(cols / 2) + 1 : 13;
            if (Date.now() > exitCooldownRef.current && pty >= rows - 1 && ptx >= exitMin && ptx <= exitMax) {
                if (activeZone) exitFieldToHub();
                else onExitToCity();
                return;
            }
            if (activeZone && nextZone && Date.now() > exitCooldownRef.current) {
                const nx = (cols / 2) * CITY_TILE_SIZE;
                const ny = 1.7 * CITY_TILE_SIZE;
                if (Math.hypot(nx - p.x, ny - p.y) <= 28) {
                    enterHuntZone(nextZone);
                    return;
                }
            }

            // Update Monsters in Hunting Field (patrol + respawn + contact combat)
            if (activeZone) {
                let activeMonsters = 0;
                for (let idx = 0; idx < monstersRef.current.length; idx++) {
                    const m = monstersRef.current[idx];
                    if (m.respawnTimer > 0) {
                        m.respawnTimer = Math.max(0, m.respawnTimer - dt);
                        if (m.respawnTimer === 0) {
                            monstersRef.current[idx] = createSpawnedMonster(
                                idx,
                                monsterSpawnSlots[idx % monsterSpawnSlots.length],
                                activeZone.zone
                            );
                        }
                        continue;
                    }
                    activeMonsters++;
                    const distToPlayer = Math.hypot(m.px - p.x, m.py - p.y);
                    // Contact combat trigger!
                    if (distToPlayer <= 28 && Date.now() > battleGraceRef.current) {
                        engageMonster(m);
                        break;
                    }

                    // Patrol / light aggro chase when player is very close
                    if (distToPlayer < CITY_TILE_SIZE * 2.8 && Date.now() > battleGraceRef.current) {
                        const nx = m.px + ((p.x - m.px) / distToPlayer) * 58 * dt;
                        const ny = m.py + ((p.y - m.py) / distToPlayer) * 58 * dt;
                        if (!isBlocked(nx, ny)) {
                            m.px = nx;
                            m.py = ny;
                            m.dir = p.x < m.px ? 'left' : 'right';
                        }
                    } else {
                        m.wanderTimer -= dt;
                        if (m.targetPx !== null && m.targetPy !== null) {
                            const dx = m.targetPx - m.px;
                            const dy = m.targetPy - m.py;
                            const d = Math.hypot(dx, dy);
                            if (d < 4) {
                                m.targetPx = null;
                                m.targetPy = null;
                            } else {
                                const nx = m.px + (dx / d) * 34 * dt;
                                const ny = m.py + (dy / d) * 34 * dt;
                                if (!isBlocked(nx, ny)) {
                                    m.px = nx;
                                    m.py = ny;
                                    m.dir = dx < 0 ? 'left' : 'right';
                                } else {
                                    m.targetPx = null;
                                    m.targetPy = null;
                                }
                            }
                        } else if (m.wanderTimer <= 0) {
                            m.wanderTimer = 1.8 + Math.random() * 2.8;
                            const a = Math.random() * Math.PI * 2;
                            const r = 28 + Math.random() * 58;
                            m.targetPx = m.homePx + Math.cos(a) * r;
                            m.targetPy = m.homePy + Math.sin(a) * r;
                        }
                    }
                }
                labelTick += dt;
                if (labelTick >= 0.25) {
                    labelTick = 0;
                    setAliveCount(activeMonsters);
                    setNearbyLabel(null);
                }
            } else {
                labelTick += dt;
                if (labelTick >= 0.2) {
                    labelTick = 0;
                    const near = findNearestZone();
                    setNearbyLabel(near ? `${near.zone.name} 입장 (Lv.${near.zone.levelRange[0]}~${near.zone.levelRange[1]})` : null);
                }
            }

            const mapW = cols * CITY_TILE_SIZE;
            const mapH = rows * CITY_TILE_SIZE;
            cameraRef.current.x = Math.round(
                Math.max(0, Math.min(Math.max(0, mapW - viewportSize.w), p.x - viewportSize.w / 2))
            );
            cameraRef.current.y = Math.round(
                Math.max(0, Math.min(Math.max(0, mapH - viewportSize.h), p.y - viewportSize.h / 2))
            );

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, viewportSize.w, viewportSize.h);
                ctx.save();
                const offsetX = mapW < viewportSize.w ? Math.floor((viewportSize.w - mapW) / 2) : -cameraRef.current.x;
                const offsetY = mapH < viewportSize.h ? Math.floor((viewportSize.h - mapH) / 2) : -cameraRef.current.y;
                ctx.translate(offsetX, offsetY);

                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
                const customHuntGround = getCachedCityAssetImage(getInteriorPropSpriteUrl(huntStyle.tileKey));
                const customHuntTrail = getCachedCityAssetImage(getInteriorPropSpriteUrl('hunt_tile_trail'));

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = c * CITY_TILE_SIZE;
                        const y = r * CITY_TILE_SIZE;
                        const isGate = r === rows - 1 && c >= exitMin && c <= exitMax;
                        const isWall = r === 0 || c === 0 || c === cols - 1 || (r === rows - 1 && !isGate);
                        if (isWall) {
                            if (wallImg?.complete && wallImg.naturalWidth > 0) ctx.drawImage(wallImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            else {
                                ctx.fillStyle = huntStyle.wall;
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                            continue;
                        }
                        const isPortalPad = !activeZone && zones.some(z => Math.abs(c - z.tx) <= 1 && Math.abs(r - z.ty) <= 1 && (Math.abs(c - z.tx) + Math.abs(r - z.ty) <= 1));
                        const isHubCrossroad = !activeZone && c >= 10 && c <= 13 && r >= 10 && r <= 12;
                        const isTrail = activeZone
                            ? (c >= Math.floor(cols / 2) - 1 && c <= Math.floor(cols / 2)) ||
                              (r === Math.floor(rows / 2) && c >= 3 && c <= cols - 4)
                            : (c >= 11 && c <= 12 && r >= 4) || (r === 5 && c >= 4 && c <= 19) || (r === 9 && c >= 4 && c <= 19) || isHubCrossroad;
                        const tile = isPortalPad && roadImg?.complete && roadImg.naturalWidth > 0
                            ? roadImg
                            : isTrail && customHuntTrail?.complete && customHuntTrail.naturalWidth > 0
                                ? customHuntTrail
                                : customHuntGround?.complete && customHuntGround.naturalWidth > 0
                                    ? customHuntGround
                                    : isTrail
                                        ? roadImg
                                        : groundImg;

                        if (tile?.complete && tile.naturalWidth > 0) {
                            ctx.drawImage(tile, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        } else {
                            ctx.fillStyle = isTrail ? huntStyle.trail : (r + c) % 2 === 0 ? huntStyle.groundA : huntStyle.groundB;
                            ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        }
                        if (isGate) {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
                            ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        }
                    }
                }

                const ts = CITY_TILE_SIZE;
                // Render Environment Props (both Hub & Field)
                fieldProps.forEach(pr => {
                    const px = pr.tx * ts;
                    const py = pr.ty * ts;
                    const pw = pr.w * ts;
                    const ph = pr.h * ts;
                    if (pr.kind === 'camp') {
                        const fireGlow = ctx.createRadialGradient(px + pw / 2, py + ph / 2, 4, px + pw / 2, py + ph / 2, pw * 0.9);
                        fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
                        fireGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
                        ctx.fillStyle = fireGlow;
                        ctx.beginPath();
                        ctx.arc(px + pw / 2, py + ph / 2, pw * 0.9, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'low';
                        const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                        const dw = img.naturalWidth * scale;
                        const dh = img.naturalHeight * scale;
                        ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                    } else {
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.beginPath();
                        ctx.ellipse(px + pw / 2, py + ph - 8, pw * 0.36, 9, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.font = '28px sans-serif';
                        ctx.textAlign = 'center';
                        const emoji =
                            pr.kind === 'tree'
                                ? '🌲'
                                : pr.kind === 'rock'
                                    ? '🪨'
                                    : pr.kind === 'nest'
                                        ? '🦴'
                                        : pr.kind === 'camp'
                                            ? '🔥'
                                            : pr.kind === 'pillar'
                                                ? '🏛️'
                                                : '🌀';
                        ctx.fillText(emoji, px + pw / 2, py + ph / 2 + 10);
                    }
                });

                if (!activeZone) {
                    // Hub Zone Portals (Upgraded Arcane Shrines)
                    zones.forEach((z, idx) => {
                        const cx = (z.tx + 0.5) * ts;
                        const cy = (z.ty + 0.5) * ts;
                        const pulse = 0.65 + 0.35 * Math.sin(now * 0.004 + z.tx);

                        // Outer radial aura
                        const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
                        aura.addColorStop(0, `${z.color}66`);
                        aura.addColorStop(0.6, `${z.color}22`);
                        aura.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = aura;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
                        ctx.fill();

                        // Ground shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.42)';
                        ctx.beginPath();
                        ctx.ellipse(cx, cy + 18, 24, 9, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // Rotating outer rune ring
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate(now * 0.0012 * (idx % 2 === 0 ? 1 : -1));
                        ctx.setLineDash([5, 4]);
                        ctx.strokeStyle = `${z.color}cc`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, 26, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();

                        // Inner core circle
                        ctx.fillStyle = `${z.color}${Math.floor(pulse * 90).toString(16).padStart(2, '0')}`;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = z.color;
                        ctx.lineWidth = 2.5;
                        ctx.stroke();

                        ctx.font = '18px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(idx >= 8 ? '🌋' : idx >= 5 ? '🌀' : '⚔️', cx, cy + 6);

                        // Crisp dark-glass nameplate
                        const title = `${z.zone.name}`;
                        const lvlText = `Lv.${z.zone.levelRange[0]}~${z.zone.levelRange[1]}`;
                        ctx.font = 'bold 10px sans-serif';
                        const tw = Math.max(76, ctx.measureText(title).width + 18);
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                        ctx.beginPath();
                        ctx.roundRect(cx - tw / 2, cy - 52, tw, 27, 6);
                        ctx.fill();
                        ctx.strokeStyle = z.color;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.fillStyle = '#f8fafc';
                        ctx.fillText(title, cx, cy - 38);
                        ctx.fillStyle = '#fde047';
                        ctx.fillText(lvlText, cx, cy - 28);
                    });
                } else {

                    // Field Monsters + Respawn Rings
                    monstersRef.current.forEach(m => {
                        if (m.respawnTimer > 0) {
                            ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.arc(m.homePx, m.homePy, 16, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.font = 'bold 9px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = '#fca5a5';
                            ctx.fillText(`⏳ ${Math.ceil(m.respawnTimer)}s`, m.homePx, m.homePy + 4);
                            return;
                        }

                        const mx = Math.round(m.px);
                        const my = Math.round(m.py);
                        const bob = Math.sin(now * 0.006 + mx * 0.05) * 2;
                        ctx.fillStyle = m.isElite ? 'rgba(239, 68, 68, 0.42)' : 'rgba(0, 0, 0, 0.34)';
                        ctx.beginPath();
                        ctx.ellipse(mx, my + 12, 14, 6, 0, 0, Math.PI * 2);
                        ctx.fill();

                        const mImg = m.visualUrl ? monsterImgCacheRef.current.get(m.visualUrl) : null;
                        if (mImg && mImg.complete && mImg.naturalWidth > 0) {
                            ctx.save();
                            ctx.translate(mx, my - 4 + bob);
                            if (m.dir === 'left') ctx.scale(-1, 1);
                            ctx.drawImage(mImg, -20, -22, 40, 40);
                            ctx.restore();
                        } else {
                            ctx.fillStyle = m.isElite ? '#dc2626' : '#f97316';
                            ctx.beginPath();
                            ctx.arc(mx, my - 6 + bob, 13, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.font = '16px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('👾', mx, my - 1 + bob);
                        }

                        const mLabel = `${m.isElite ? '👑 ' : ''}${m.name} Lv.${m.level}`;
                        ctx.font = 'bold 9px sans-serif';
                        ctx.textAlign = 'center';
                        const lw = Math.max(54, ctx.measureText(mLabel).width + 8);
                        ctx.fillStyle = m.isElite ? 'rgba(127, 29, 29, 0.92)' : 'rgba(15, 23, 42, 0.88)';
                        ctx.fillRect(mx - lw / 2, my + 14, lw, 12);
                        ctx.fillStyle = m.isElite ? '#fde047' : '#fca5a5';
                        ctx.fillText(mLabel, mx, my + 23);
                    });
                }

                // Next-Zone Portal at Top Center
                if (activeZone && nextZone) {
                    const nx = (cols / 2) * ts;
                    const ny = 1.7 * ts;
                    const pulse = 0.65 + 0.35 * Math.sin(now * 0.005);
                    ctx.fillStyle = `rgba(34, 211, 238, ${0.28 * pulse})`;
                    ctx.beginPath();
                    ctx.arc(nx, ny, 26, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#22d3ee';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.font = '18px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🌀', nx, ny + 6);

                    const nextLabel = `다음 영역: ${nextZone.zone.name} (Lv.${nextZone.zone.levelRange[0]}~${nextZone.zone.levelRange[1]})`;
                    ctx.font = 'bold 10px sans-serif';
                    const ntw = Math.max(110, ctx.measureText(nextLabel).width + 14);
                    ctx.fillStyle = 'rgba(8, 51, 68, 0.94)';
                    ctx.fillRect(nx - ntw / 2, ny + 22, ntw, 15);
                    ctx.strokeStyle = '#22d3ee';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(nx - ntw / 2, ny + 22, ntw, 15);
                    ctx.fillStyle = '#a5f3fc';
                    ctx.fillText(nextLabel, nx, ny + 33);
                }

                // Exit label
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                const exitCx = (activeZone ? Math.floor(cols / 2) : 12) * ts;
                ctx.fillRect(exitCx - 56, (rows - 1) * ts - 20, 112, 18);
                ctx.fillStyle = '#fde047';
                ctx.fillText(activeZone ? '🚪 사냥터 입구로' : '🚪 도시로 귀환', exitCx, (rows - 1) * ts - 7);

                // Draw Player
                const ax = Math.round(p.x);
                const ay = Math.round(p.y);
                const sheet = getCachedRpgSpriteImage(playerSpriteUrl);
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.beginPath();
                ctx.ellipse(ax, ay + 12, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                if (sheet && sheet.complete && sheet.naturalWidth > 0) {
                    const fw = Math.floor(sheet.naturalWidth / 3);
                    const fh = Math.floor(sheet.naturalHeight / 4);
                    const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(sheet, p.walkFrame * fw, row * fh, fw, fh, ax - 20, ay - 30, 40, 44);
                } else {
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath();
                    ctx.arc(ax, ay - 6, 11, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                const nw = Math.max(44, ctx.measureText(character.name).width + 10);
                ctx.fillStyle = 'rgba(180, 83, 9, 0.92)';
                ctx.fillRect(ax - nw / 2, ay + 14, nw, 13);
                ctx.fillStyle = '#fef08a';
                ctx.fillText(character.name, ax, ay + 24);

                // Night Darkness Overlay
                const h = parseHour(character.currentTime);
                if (h >= 20 || h < 5) {
                    ctx.fillStyle = 'rgba(10, 14, 42, 0.48)';
                    ctx.fillRect(0, 0, mapW, mapH);
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const grad = ctx.createRadialGradient(p.x, p.y - 6, 6, p.x, p.y - 6, 105);
                    grad.addColorStop(0, 'rgba(254, 243, 199, 0.25)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 6, 105, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (h >= 17 && h < 20) {
                    ctx.fillStyle = 'rgba(190, 60, 40, 0.16)';
                    ctx.fillRect(0, 0, mapW, mapH);
                }

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [
        activeZone,
        nextZone,
        zones,
        fieldProps,
        monsterSpawnSlots,
        createSpawnedMonster,
        enterHuntZone,
        engageMonster,
        cultureKey,
        huntStyle,
        cols,
        rows,
        solidSet,
        viewportSize,
        playerSpriteUrl,
        character.name,
        character.currentTime,
        findNearestZone,
        onExitToCity,
        exitFieldToHub
    ]);

    return (
        <div ref={containerRef} className="relative w-full h-full flex-1 min-h-0 bg-slate-950 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                width={viewportSize.w}
                height={viewportSize.h}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-pointer"
            />

            {/* Top HUD */}
            <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 border border-emerald-500/40 rounded-xl px-3 py-1.5 shadow-xl">
                    {activeZone ? (
                        <Skull size={15} className="text-rose-400 shrink-0" />
                    ) : (
                        <Compass size={15} className="text-emerald-400 shrink-0" />
                    )}
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-emerald-200 flex items-center gap-2">
                            <span>
                                {activeZone
                                    ? `${city} · ${activeZone.zone.name} (Lv.${activeZone.zone.levelRange[0]}~${activeZone.zone.levelRange[1]})`
                                    : `${city} · 야외 사냥터 입구 (${huntStyle.label})`}
                            </span>
                            {activeZone && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-200 inline-flex items-center gap-1">
                                    <Footprints size={10} /> 서식 몬스터 {aliveCount}마리
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                            {activeZone
                                ? '필드 몬스터와 접촉하거나 클릭해 전투에 돌입하세요 (처치 시 일정 시간 후 리젠)'
                                : '사냥할 영역 포탈로 들어가서 몬스터들을 추적하세요 [Space]'}
                        </div>
                    </div>
                </div>
                <div className="pointer-events-auto flex items-center gap-1.5">
                    {activeZone && (
                        <button
                            type="button"
                            onClick={exitFieldToHub}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-700/90 hover:bg-emerald-600 border border-emerald-400/50 text-white flex items-center gap-1.5 shadow-lg"
                        >
                            <DoorOpen size={13} /> 입구로
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onExitToCity}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-700/90 hover:bg-amber-600 border border-amber-400/50 text-white flex items-center gap-1.5 shadow-lg"
                    >
                        <DoorOpen size={13} /> 도시 광장으로
                    </button>
                </div>
            </div>

            {nearbyLabel && !selectedZone && !activeZone && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="px-4 py-2 rounded-full bg-slate-950/95 border border-emerald-400/70 text-emerald-200 text-xs font-black shadow-2xl"
                    >
                        [Space / 터치] {nearbyLabel}
                    </button>
                </div>
            )}

            {/* Mobile D-Pad */}
            <div className="absolute bottom-4 right-4 z-20 grid grid-cols-3 gap-1 w-28 h-28 opacity-85">
                <div />
                <button type="button" onTouchStart={() => (dpadRef.current = 'up')} onTouchEnd={() => (dpadRef.current = null)} className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white">
                    <ArrowUp size={16} />
                </button>
                <div />
                <button type="button" onTouchStart={() => (dpadRef.current = 'left')} onTouchEnd={() => (dpadRef.current = null)} className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white">
                    <ArrowLeft size={16} />
                </button>
                <div />
                <button type="button" onTouchStart={() => (dpadRef.current = 'right')} onTouchEnd={() => (dpadRef.current = null)} className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white">
                    <ArrowRight size={16} />
                </button>
                <div />
                <button type="button" onTouchStart={() => (dpadRef.current = 'down')} onTouchEnd={() => (dpadRef.current = null)} className="bg-slate-900/90 border border-slate-600 rounded-lg flex items-center justify-center text-white">
                    <ArrowDown size={16} />
                </button>
                <div />
            </div>

            {/* Selected Hunt Zone Entry Card */}
            {selectedZone && !activeZone && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="text-sm font-black text-white flex items-center gap-1.5">
                                <Sword size={14} className="text-emerald-400" />
                                {selectedZone.zone.name}
                                <span className="text-[11px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded">
                                    Lv.{selectedZone.zone.levelRange[0]}~{selectedZone.zone.levelRange[1]}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 leading-relaxed">
                                {selectedZone.zone.description} (난이도: {selectedZone.zone.difficulty})
                            </p>
                        </div>
                        <button type="button" onClick={() => setSelectedZone(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => enterHuntZone(selectedZone)}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
                        >
                            🌿 이 사냥터 영역으로 입장
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedZone(null)}
                            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutskirtsRpgCanvas;
