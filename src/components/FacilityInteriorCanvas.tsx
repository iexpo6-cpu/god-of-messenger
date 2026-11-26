import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Character } from '../types';
import {
    BASE_TILE_SIZE,
    BaseFacilityNode,
    BaseFarmMonsterEntity,
    BaseResidentEntity,
    FLOOR_TILE_MAP
} from '../services/baseTilemapEngine';
import {
    generateFacilityInteriorMap,
    InteriorPropKind,
    InteriorPropNode,
    InteriorWallTheme
} from '../services/facilityInteriorEngine';
import {
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    TerrainTilePart
} from '../services/cityAssetManifest';
import {
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    DoorOpen,
    PawPrint,
    Sparkles,
    Users,
    X,
    Zap
} from 'lucide-react';
import FarmInteriorPanel from './base/FarmInteriorPanel';
import MineInteriorPanel from './base/MineInteriorPanel';
import HousingInteriorPanel from './base/HousingInteriorPanel';
import ResidentQuickCard from './base/ResidentQuickCard';
import BlacksmithModal from './BlacksmithModal';
import { AlchemyCraftModal } from './AlchemyCraftModal';
import WorkshopModal from './WorkshopModal';
import DispatchModal from './DispatchModal';

interface FacilityInteriorCanvasProps {
    character: Character;
    facility: BaseFacilityNode;
    onExitToBase: () => void;
    onOpenBaseModal: (initialSubModal?: string) => void;
    onInspectCompanion?: (companionId: string) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string, dailyReport?: any) => void;
    onSwitchFacilityInstance?: (newInstanceId: string) => void;
}

const DIR_ROW_MAP: Record<SpriteDirection, number> = {
    down: 0,
    left: 1,
    right: 2,
    up: 3
};

const WALL_PALETTE: Record<InteriorWallTheme, { top: string; face: string; trim: string }> = {
    stone_palace: { top: '#334155', face: '#475569', trim: '#f59e0b' },
    warm_wood: { top: '#451a03', face: '#78350f', trim: '#d97706' },
    cave_rock: { top: '#1c1917', face: '#44403c', trim: '#78716c' },
    garden_fence: { top: '#3f6212', face: '#713f12', trim: '#a16207' },
    arcane_stone: { top: '#1e1b4b', face: '#312e81', trim: '#38bdf8' },
    sacred_marble: { top: '#cbd5e1', face: '#f8fafc', trim: '#eab308' },
    obsidian_tech: { top: '#0f172a', face: '#2e1065', trim: '#c084fc' },
    dojo_wood: { top: '#431407', face: '#9a3412', trim: '#fdba74' }
};

function drawProceduralInteriorProp(ctx: CanvasRenderingContext2D, prop: InteriorPropNode, nowMs: number) {
    const px = prop.tileX * BASE_TILE_SIZE;
    const py = prop.tileY * BASE_TILE_SIZE;
    const pw = prop.tileW * BASE_TILE_SIZE;
    const ph = prop.tileH * BASE_TILE_SIZE;
    const cx = px + pw / 2;
    const cy = py + ph / 2;

    // Optional custom PNG override (customSpriteUrl for houses, spriteKey for crop/ore stages, or kind fallback)
    const pngUrl = prop.customSpriteUrl || getInteriorPropSpriteUrl(prop.spriteKey || prop.kind);
    const cachedPng = getCachedCityAssetImage(pngUrl);
    if (cachedPng && cachedPng.complete && cachedPng.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(cachedPng, px - 4, py - 8, pw + 8, ph + 10);
        if (prop.kind === 'crop_plot') {
            if (prop.isWatered) {
                ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
                ctx.beginPath();
                ctx.arc(px + pw - 8, py + 8, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            if (prop.accentColor === '#fbbf24') {
                const pulse = 0.65 + 0.35 * Math.sin(nowMs / 240);
                ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
            }
        }
        return;
    }

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(cx, py + ph - 6, pw * 0.42, Math.max(6, ph * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.65 + 0.35 * Math.sin(nowMs / 360);

    switch (prop.kind) {
        case 'crop_plot': {
            const isPlowedOrPlanted = prop.cropStage !== 'empty';
            ctx.fillStyle = isPlowedOrPlanted ? '#452710' : '#785c3a';
            ctx.fillRect(px + 4, py + 5, pw - 8, ph - 10);
            ctx.strokeStyle = prop.cropStage === 'ready' ? '#facc15' : isPlowedOrPlanted ? '#78350f' : '#57432a';
            ctx.lineWidth = prop.cropStage === 'ready' ? 2.5 : 2;
            ctx.strokeRect(px + 4, py + 5, pw - 8, ph - 10);

            if (isPlowedOrPlanted) {
                // 이랑(밭고랑) 줄 표현
                ctx.strokeStyle = 'rgba(0,0,0,0.28)';
                ctx.lineWidth = 1.5;
                for (let ry = py + 12; ry < py + ph - 10; ry += 10) {
                    ctx.beginPath();
                    ctx.moveTo(px + 8, ry);
                    ctx.lineTo(px + pw - 8, ry);
                    ctx.stroke();
                }
            }

            if (prop.cropStage === 'growing') {
                ctx.fillStyle = '#4ade80';
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(px + 16 + i * ((pw - 32) / 3), cy - 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                // 성장률 프로그레스 바
                const pct = Math.max(0, Math.min(100, prop.growthProgress || 0));
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                ctx.fillRect(px + 8, py + ph - 12, pw - 16, 4);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(px + 8, py + ph - 12, ((pw - 16) * pct) / 100, 4);
            } else if (prop.cropStage === 'ready') {
                ctx.fillStyle = '#a3e635';
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(px + 16 + i * ((pw - 32) / 3), cy - 2, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
                ctx.beginPath();
                ctx.arc(cx, py + 12, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            if (prop.isWatered && prop.cropStage !== 'empty') {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(px + pw - 12, py + 12, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 'ore_vein': {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(px + 10, py + ph - 8);
            ctx.lineTo(px + 14, py + 12);
            ctx.lineTo(cx + 4, py + 6);
            ctx.lineTo(px + pw - 8, py + ph - 10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(cx - 8, cy - 6, 6, 6);
            ctx.fillRect(cx + 4, cy + 2, 5, 5);
            break;
        }
        case 'bed': {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px + 6, py + 6, pw - 12, ph - 12);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(px + 10, py + 9, pw - 20, 10);
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(px + 9, py + 19, pw - 18, ph - 28);
            break;
        }
        case 'alchemy_cauldron':
        case 'cooking_hearth': {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(cx, cy + 4, Math.min(pw, ph) * 0.34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = prop.kind === 'alchemy_cauldron' ? `rgba(168, 85, 247, ${pulse})` : `rgba(251, 146, 60, ${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy + 2, Math.min(pw, ph) * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'forge_furnace':
        case 'fireplace': {
            ctx.fillStyle = '#475569';
            ctx.fillRect(px + 6, py + 6, pw - 12, ph - 12);
            ctx.fillStyle = `rgba(249, 115, 22, ${pulse})`;
            ctx.fillRect(cx - 10, cy - 4, 20, 16);
            break;
        }
        case 'anvil': {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 14, cy + 6, 28, 12);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(cx - 18, cy - 8, 36, 14);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(cx - 22, cy - 10, 44, 6);
            break;
        }
        case 'transcend_altar':
        case 'awakening_altar':
        case 'shield_core':
        case 'arcane_core':
        case 'transform_pod':
        case 'vfx_prism': {
            ctx.strokeStyle = prop.accentColor || '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.min(pw, ph) * 0.38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = prop.accentColor || '#38bdf8';
            ctx.globalAlpha = 0.25 + 0.35 * pulse;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.min(pw, ph) * 0.26, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
        }
        case 'sparring_ring': {
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
            ctx.fillRect(px + 8, py + 8, pw - 16, ph - 16);
            break;
        }
        case 'training_dummy': {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 3, py + 12, 6, ph - 18);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(cx - 14, cy - 4, 28, 7);
            ctx.beginPath();
            ctx.arc(cx, py + 14, 8, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'crate':
        case 'treasure_chest': {
            ctx.fillStyle = prop.kind === 'treasure_chest' ? '#b45309' : '#92400e';
            ctx.fillRect(px + 8, py + 8, pw - 16, ph - 16);
            ctx.strokeStyle = prop.kind === 'treasure_chest' ? '#facc15' : '#451a03';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 8, py + 8, pw - 16, ph - 16);
            break;
        }
        case 'mana_pillar':
        case 'element_pillar':
        case 'job_monolith': {
            ctx.fillStyle = '#475569';
            ctx.fillRect(cx - 10, py + 12, 20, ph - 16);
            ctx.fillStyle = prop.kind === 'element_pillar' ? `rgba(250, 204, 21, ${pulse})` : `rgba(56, 189, 248, ${pulse})`;
            ctx.beginPath();
            ctx.moveTo(cx, py + 4);
            ctx.lineTo(cx + 8, py + 16);
            ctx.lineTo(cx, py + 24);
            ctx.lineTo(cx - 8, py + 16);
            ctx.closePath();
            ctx.fill();
            break;
        }
        case 'lantern_post': {
            ctx.fillStyle = '#334155';
            ctx.fillRect(cx - 2, py + 14, 4, ph - 18);
            ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, py + 12, 7, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'watering_well': {
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(cx, cy + 2, Math.min(pw, ph) * 0.34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(cx, cy + 2, Math.min(pw, ph) * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'minecart': {
            ctx.fillStyle = '#334155';
            ctx.fillRect(px + 10, py + 12, pw - 20, ph - 22);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + 16, py + 16, 12, 10);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(px + 32, py + 18, 10, 8);
            break;
        }
        case 'weapon_rack': {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px + 6, cy - 4, pw - 12, 6);
            ctx.fillStyle = '#cbd5e1';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(px + 12 + i * 11, py + 8, 3, ph - 16);
            }
            break;
        }
        case 'archery_target': {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'barbell_rack': {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(px + 8, cy - 2, pw - 16, 4);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px + 6, cy - 10, 7, 20);
            ctx.fillRect(px + pw - 13, cy - 10, 7, 20);
            break;
        }
        case 'school_desk':
        case 'dining_table':
        case 'command_table':
        case 'merchant_counter':
        case 'prep_counter':
        case 'blueprint_desk':
        case 'scale_desk': {
            ctx.fillStyle = prop.kind === 'command_table' ? '#1e3a8a' : '#92400e';
            ctx.fillRect(px + 6, py + 10, pw - 12, ph - 18);
            ctx.strokeStyle = prop.accentColor || '#d97706';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 6, py + 10, pw - 12, ph - 18);
            if (prop.kind === 'command_table' || prop.kind === 'blueprint_desk') {
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(px + 14, py + 16, pw - 28, ph - 30);
            }
            break;
        }
        case 'bookshelf':
        case 'potion_shelf': {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px + 6, py + 4, pw - 12, ph - 10);
            ctx.fillStyle = prop.kind === 'potion_shelf' ? '#a855f7' : '#ef4444';
            ctx.fillRect(px + 10, py + 10, 8, 8);
            ctx.fillStyle = prop.kind === 'potion_shelf' ? '#38bdf8' : '#3b82f6';
            ctx.fillRect(px + 22, py + 10, 8, 8);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(px + 14, py + 24, 10, 8);
            break;
        }
        case 'watchtower_ballista': {
            ctx.fillStyle = '#475569';
            ctx.fillRect(px + 8, py + 10, pw - 16, ph - 16);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 14, cy);
            ctx.quadraticCurveTo(cx, py + 6, cx + 14, cy);
            ctx.stroke();
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 2, py + 6, 4, ph - 14);
            break;
        }
        case 'telescope': {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 10, py + ph - 8);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + 10, py + ph - 8);
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.save();
            ctx.translate(cx, cy - 4);
            ctx.rotate(-0.45);
            ctx.fillRect(-16, -5, 34, 10);
            ctx.restore();
            break;
        }
        default: {
            ctx.fillStyle = '#334155';
            ctx.fillRect(px + 6, py + 8, pw - 12, ph - 16);
            ctx.strokeStyle = prop.accentColor || '#f59e0b';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 6, py + 8, pw - 12, ph - 16);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(prop.label.slice(0, 6), cx, cy + 4);
            break;
        }
    }

    if (prop.interactive) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + 0.45 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
        ctx.setLineDash([]);
    }
}

const FacilityInteriorCanvas: React.FC<FacilityInteriorCanvasProps> = ({
    character,
    facility,
    onExitToBase,
    onOpenBaseModal,
    onInspectCompanion,
    onUpdateCharacter,
    onSwitchFacilityInstance
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 600 });
    const prevNearbyLabelRef = useRef<string | null>(null);

    const [selectedResident, setSelectedResident] = useState<BaseResidentEntity | null>(null);
    const [selectedMonster, setSelectedMonster] = useState<BaseFarmMonsterEntity | null>(null);
    const [selectedFarmPlot, setSelectedFarmPlot] = useState<number | null>(null);
    const [selectedMineZoneId, setSelectedMineZoneId] = useState<string | null>(null);
    const [commissionBlacksmithId, setCommissionBlacksmithId] = useState<string | null>(null);
    const [commissionAlchemistId, setCommissionAlchemistId] = useState<string | null>(null);
    const [openDirectSubModal, setOpenDirectSubModal] = useState<'workshop' | 'dispatch' | null>(null);
    const [activeHouseId, setActiveHouseId] = useState<string>('');
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);

    const mapData = useMemo(
        () => generateFacilityInteriorMap(character, facility, activeHouseId),
        [character, facility, activeHouseId]
    );
    const loc = character.base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, loc.region, loc.nation).url,
        [character, loc.region, loc.nation]
    );

    const residentsRef = useRef<BaseResidentEntity[]>(mapData.residents);
    const monstersRef = useRef<BaseFarmMonsterEntity[]>(mapData.monsters);

    useEffect(() => {
        residentsRef.current = mapData.residents.map(r => ({ ...r }));
        monstersRef.current = mapData.monsters.map(m => ({ ...m }));
    }, [mapData]);

    useEffect(() => {
        playerRef.current.x = mapData.spawnPos.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
        playerRef.current.y = mapData.spawnPos.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        playerRef.current.moving = false;
        exitCooldownRef.current = Date.now() + 700;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeHouseId, facility.instanceId]);

    // Preload character, resident, monster, terrain, and optional interior prop PNGs
    useEffect(() => {
        const spriteUrls = new Set<string>([playerSpriteUrl, ...mapData.residents.map(r => r.spriteUrl)]);
        spriteUrls.forEach(url => {
            loadRpgSpriteImage(url);
        });
        (['ground', 'road', 'plaza', 'royal_road'] as TerrainTilePart[]).forEach(p => {
            loadCityAssetImage(getTerrainTileUrl(mapData.cultureKey, p));
        });
        const propUrls = new Set<string>();
        mapData.props.forEach(p => {
            propUrls.add(p.customSpriteUrl || getInteriorPropSpriteUrl(p.spriteKey || p.kind));
        });
        propUrls.forEach(url => {
            loadCityAssetImage(url);
        });
        mapData.monsters.forEach(m => {
            if (m.visualUrl) {
                loadCityAssetImage(m.visualUrl);
            }
        });
    }, [playerSpriteUrl, mapData]);

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
        x: mapData.spawnPos.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2,
        y: mapData.spawnPos.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2,
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

    const findNearestInteractable = useCallback(() => {
        const p = playerRef.current;
        let bestRes: BaseResidentEntity | null = null;
        let bestResD = BASE_TILE_SIZE * 1.45;
        for (const r of residentsRef.current) {
            const d = Math.hypot(r.px - p.x, r.py - p.y);
            if (d < bestResD) {
                bestResD = d;
                bestRes = r;
            }
        }
        if (bestRes) return { kind: 'resident' as const, resident: bestRes };

        let bestMon: BaseFarmMonsterEntity | null = null;
        let bestMonD = BASE_TILE_SIZE * 1.45;
        for (const m of monstersRef.current) {
            const d = Math.hypot(m.px - p.x, m.py - p.y);
            if (d < bestMonD) {
                bestMonD = d;
                bestMon = m;
            }
        }
        if (bestMon) return { kind: 'monster' as const, monster: bestMon };

        let bestProp: InteriorPropNode | null = null;
        let bestPropD = BASE_TILE_SIZE * 2.1;
        for (const pr of mapData.props) {
            if (!pr.interactive) continue;
            const px = (pr.tileX + pr.tileW / 2) * BASE_TILE_SIZE;
            const py = (pr.tileY + pr.tileH / 2) * BASE_TILE_SIZE;
            const d = Math.hypot(px - p.x, py - p.y);
            if (d < bestPropD) {
                bestPropD = d;
                bestProp = pr;
            }
        }
        if (bestProp) return { kind: 'prop' as const, prop: bestProp };
        return null;
    }, [mapData.props]);

    const openStationModal = useCallback(
        (subModal?: string) => {
            if ((subModal === 'workshop' || subModal === 'blacksmith') && onUpdateCharacter) {
                setOpenDirectSubModal('workshop');
                return;
            }
            if (subModal === 'dispatch' && onUpdateCharacter) {
                setOpenDirectSubModal('dispatch');
                return;
            }
            onOpenBaseModal(subModal);
        },
        [onOpenBaseModal, onUpdateCharacter]
    );

    const handleInteract = useCallback(() => {
        const target = findNearestInteractable();
        if (!target) return;
        if (target.kind === 'resident') {
            setSelectedResident(target.resident);
            setSelectedMonster(null);
        } else if (target.kind === 'monster') {
            setSelectedMonster(target.monster);
            setSelectedResident(null);
        } else if (typeof target.prop.plotIndex === 'number') {
            setSelectedFarmPlot(target.prop.plotIndex);
            setSelectedMineZoneId(null);
            setSelectedResident(null);
            setSelectedMonster(null);
        } else if (target.prop.mineZoneId) {
            setSelectedMineZoneId(target.prop.mineZoneId);
            setSelectedFarmPlot(null);
            setSelectedResident(null);
            setSelectedMonster(null);
        } else if (target.prop.houseId) {
            exitCooldownRef.current = Date.now() + 700;
            setSelectedResident(null);
            setSelectedMonster(null);
            setActiveHouseId(target.prop.houseId);
        } else {
            openStationModal(target.prop.actionSubModal);
        }
    }, [findNearestInteractable, openStationModal]);

    useEffect(() => {
        const mapMoveKey = (e: KeyboardEvent): string | null => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') return 'w';
            if (e.code === 'KeyS' || e.code === 'ArrowDown') return 's';
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') return 'a';
            if (e.code === 'KeyD' || e.code === 'ArrowRight') return 'd';
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) return k;
            return null;
        };
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const mv = mapMoveKey(e);
            if (mv) {
                e.preventDefault();
                if (e.repeat) return;
                keysRef.current.add(mv);
                playerRef.current.targetX = null;
                playerRef.current.targetY = null;
                return;
            }
            const k = e.key.toLowerCase();
            if (k === ' ' || k === 'enter' || k === 'e' || e.code === 'KeyE' || e.code === 'Space') {
                e.preventDefault();
                if (!e.repeat) handleInteract();
            } else if (k === 'escape') {
                if (selectedResident || selectedMonster || selectedFarmPlot !== null) {
                    setSelectedResident(null);
                    setSelectedMonster(null);
                    setSelectedFarmPlot(null);
                } else {
                    onExitToBase();
                }
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            const mv = mapMoveKey(e);
            if (mv) keysRef.current.delete(mv);
            keysRef.current.delete(e.key.toLowerCase());
        };
        const onBlur = () => {
            keysRef.current.clear();
            dpadRef.current = null;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [handleInteract, onExitToBase, selectedResident, selectedMonster]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const wx = e.clientX - rect.left + cameraRef.current.x;
        const wy = e.clientY - rect.top + cameraRef.current.y;

        for (const r of residentsRef.current) {
            if (Math.hypot(wx - r.px, wy - (r.py - 14)) <= 26) {
                setSelectedResident(r);
                setSelectedMonster(null);
                return;
            }
        }
        for (const m of monstersRef.current) {
            if (Math.hypot(wx - m.px, wy - m.py) <= 26) {
                setSelectedMonster(m);
                setSelectedResident(null);
                return;
            }
        }
        for (const pr of mapData.props) {
            if (!pr.interactive) continue;
            const fx = pr.tileX * BASE_TILE_SIZE;
            const fy = pr.tileY * BASE_TILE_SIZE;
            const fw = pr.tileW * BASE_TILE_SIZE;
            const fh = pr.tileH * BASE_TILE_SIZE;
            if (wx >= fx && wx <= fx + fw && wy >= fy - 14 && wy <= fy + fh) {
                if (typeof pr.plotIndex === 'number') {
                    setSelectedFarmPlot(pr.plotIndex);
                    setSelectedMineZoneId(null);
                    setSelectedResident(null);
                    setSelectedMonster(null);
                } else if (pr.mineZoneId) {
                    setSelectedMineZoneId(pr.mineZoneId);
                    setSelectedFarmPlot(null);
                    setSelectedResident(null);
                    setSelectedMonster(null);
                } else if (pr.houseId) {
                    exitCooldownRef.current = Date.now() + 700;
                    setSelectedResident(null);
                    setSelectedMonster(null);
                    setActiveHouseId(pr.houseId);
                } else {
                    openStationModal(pr.actionSubModal);
                }
                return;
            }
        }
        const gx = mapData.exitGate.x * BASE_TILE_SIZE;
        const gy = mapData.exitGate.y * BASE_TILE_SIZE;
        if (wx >= gx && wx <= gx + mapData.exitGate.w * BASE_TILE_SIZE && wy >= gy - 12) {
            onExitToBase();
            return;
        }

        setSelectedResident(null);
        setSelectedMonster(null);
        // 모바일(768px 미만)에서는 터치 이동을 제한하고 D-패드로만 이동
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return;
        }
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;

        const isBlocked = (px: number, py: number) => {
            const tx = Math.floor(px / BASE_TILE_SIZE);
            const ty = Math.floor(py / BASE_TILE_SIZE);
            if (tx < 0 || ty < 0 || tx >= mapData.cols || ty >= mapData.rows) return true;
            return mapData.solidSet.has(`${tx},${ty}`);
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
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
                const prevX = p.x;
                const prevY = p.y;
                const nx = p.x + (vx / len) * step;
                const ny = p.y + (vy / len) * step;
                if (!isBlocked(nx, p.y)) p.x = Math.max(BASE_TILE_SIZE, Math.min((mapData.cols - 1) * BASE_TILE_SIZE, nx));
                if (!isBlocked(p.x, ny)) p.y = Math.max(BASE_TILE_SIZE, Math.min((mapData.rows - 1) * BASE_TILE_SIZE, ny));
                if (isClickMoving && Math.hypot(p.x - prevX, p.y - prevY) < 0.25) {
                    p.targetX = null;
                    p.targetY = null;
                }
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

            const ptx = Math.floor(p.x / BASE_TILE_SIZE);
            const pty = Math.floor(p.y / BASE_TILE_SIZE);
            const isInsideHouseRoom =
                (facility.facilityType === 'housing' || facility.facilityType === 'home' || facility.facilityType === 'my_home') &&
                Boolean(activeHouseId);
            if (
                Date.now() > exitCooldownRef.current &&
                pty >= mapData.exitGate.y &&
                ptx >= mapData.exitGate.x &&
                ptx < mapData.exitGate.x + mapData.exitGate.w
            ) {
                if (isInsideHouseRoom) {
                    exitCooldownRef.current = Date.now() + 700;
                    setActiveHouseId('');
                } else {
                    onExitToBase();
                }
                return;
            }

            residentsRef.current.forEach(r => {
                if (r.isSleeping) {
                    r.walkFrame = 1;
                    return;
                }
                r.wanderTimer -= dt;
                if (r.targetPx !== null && r.targetPy !== null) {
                    const dx = r.targetPx - r.px;
                    const dy = r.targetPy - r.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        r.targetPx = null;
                        r.targetPy = null;
                        r.walkFrame = 1;
                    } else {
                        const spd = 44;
                        const nx = r.px + (dx / dist) * spd * dt;
                        const ny = r.py + (dy / dist) * spd * dt;
                        if (!isBlocked(nx, ny)) {
                            r.px = nx;
                            r.py = ny;
                        } else {
                            r.targetPx = null;
                            r.targetPy = null;
                        }
                        r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                        r.animTimer += dt;
                        if (r.animTimer >= 0.22) {
                            r.animTimer = 0;
                            r.walkFrame = (r.walkFrame + 1) % 3;
                        }
                    }
                } else if (r.wanderTimer <= 0) {
                    r.wanderTimer = 2.6 + Math.random() * 3.8;
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 36 + Math.random() * 88;
                    r.targetPx = r.homePx + Math.cos(angle) * radius;
                    r.targetPy = r.homePy + Math.sin(angle) * radius;
                }
            });

            monstersRef.current.forEach(m => {
                m.bobPhase += dt * 3.4;
                m.wanderTimer -= dt;
                if (m.targetPx !== null && m.targetPy !== null) {
                    const dx = m.targetPx - m.px;
                    const dy = m.targetPy - m.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        m.targetPx = null;
                        m.targetPy = null;
                    } else {
                        const spd = 38;
                        m.px = Math.max(m.minPx, Math.min(m.maxPx, m.px + (dx / dist) * spd * dt));
                        m.py = Math.max(m.minPy, Math.min(m.maxPy, m.py + (dy / dist) * spd * dt));
                        m.dir = dx >= 0 ? 'right' : 'left';
                    }
                } else if (m.wanderTimer <= 0) {
                    m.wanderTimer = 1.6 + Math.random() * 2.5;
                    m.targetPx = m.minPx + Math.random() * Math.max(10, m.maxPx - m.minPx);
                    m.targetPy = m.minPy + Math.random() * Math.max(10, m.maxPy - m.minPy);
                }
            });

            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                const near = findNearestInteractable();
                let nextLabel: string | null = null;
                if (near) {
                    if (near.kind === 'resident') nextLabel = `${near.resident.name} (${near.resident.role})`;
                    else if (near.kind === 'monster') nextLabel = `🐾 ${near.monster.name} Lv.${near.monster.level}`;
                    else nextLabel = `⚙️ ${near.prop.label}`;
                }
                if (prevNearbyLabelRef.current !== nextLabel) {
                    prevNearbyLabelRef.current = nextLabel;
                    setNearbyLabel(nextLabel);
                }
            }

            const mapW = mapData.cols * BASE_TILE_SIZE;
            const mapH = mapData.rows * BASE_TILE_SIZE;
            const camX =
                mapW <= viewportSize.w
                    ? -(viewportSize.w - mapW) / 2
                    : Math.max(0, Math.min(mapW - viewportSize.w, p.x - viewportSize.w / 2));
            const camY =
                mapH <= viewportSize.h
                    ? -(viewportSize.h - mapH) / 2
                    : Math.max(0, Math.min(mapH - viewportSize.h, p.y - viewportSize.h / 2));
            cameraRef.current = { x: Math.round(camX), y: Math.round(camY) };

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, viewportSize.w, viewportSize.h);
                ctx.save();
                ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

                const wallColors = WALL_PALETTE[mapData.blueprint.wallTheme];
                const floorDef = FLOOR_TILE_MAP[mapData.floorTile];
                const accentDef = mapData.accentFloorTile ? FLOOR_TILE_MAP[mapData.accentFloorTile] : null;
                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'road'));
                const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'plaza'));
                const royalImg = getCachedCityAssetImage(getTerrainTileUrl(mapData.cultureKey, 'royal_road'));

                const cx = Math.floor(mapData.cols / 2);

                for (let r = 0; r < mapData.rows; r++) {
                    for (let c = 0; c < mapData.cols; c++) {
                        const x = c * BASE_TILE_SIZE;
                        const y = r * BASE_TILE_SIZE;
                        const isGate =
                            r === mapData.exitGate.y &&
                            c >= mapData.exitGate.x &&
                            c < mapData.exitGate.x + mapData.exitGate.w;
                        const isWall = r === 0 || c === 0 || c === mapData.cols - 1 || (r === mapData.rows - 1 && !isGate);

                        if (isWall) {
                            ctx.fillStyle = wallColors.top;
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            ctx.fillStyle = wallColors.face;
                            ctx.fillRect(x + 2, y + 6, BASE_TILE_SIZE - 4, BASE_TILE_SIZE - 10);
                            ctx.fillStyle = wallColors.trim;
                            ctx.fillRect(x, y + BASE_TILE_SIZE - 4, BASE_TILE_SIZE, 2);
                            continue;
                        }

                        const isCenterAisle = Math.abs(c - cx) <= 1 && r >= 2;
                        const activeTile = isCenterAisle && accentDef ? mapData.accentFloorTile : mapData.floorTile;
                        if (activeTile === 'default' && groundImg?.complete && groundImg.naturalWidth > 0) {
                            ctx.drawImage(groundImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else if (activeTile === 'stone_road' && roadImg?.complete && roadImg.naturalWidth > 0) {
                            ctx.drawImage(roadImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else if (activeTile === 'plaza' && plazaImg?.complete && plazaImg.naturalWidth > 0) {
                            ctx.drawImage(plazaImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else if (activeTile === 'royal_marble' && royalImg?.complete && royalImg.naturalWidth > 0) {
                            ctx.drawImage(royalImg, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        } else if (activeTile === 'garden') {
                            ctx.fillStyle = (r * 7 + c * 13) % 5 === 0 ? '#497a2f' : '#3f6e28';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            if ((r * 3 + c * 5) % 4 === 0) {
                                ctx.fillStyle = '#65a30d';
                                ctx.fillRect(x + 10, y + 14, 2, 5);
                                ctx.fillRect(x + 14, y + 12, 2, 6);
                                ctx.fillRect(x + 28, y + 30, 2, 5);
                            }
                        } else if (activeTile === 'dirt_road') {
                            ctx.fillStyle = (r * 5 + c * 11) % 3 === 0 ? '#6e4422' : '#7b4f2a';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                            if ((r + c) % 2 === 0) {
                                ctx.fillStyle = '#926239';
                                ctx.fillRect(x + 8, y + 10, 4, 3);
                                ctx.fillRect(x + 30, y + 28, 5, 3);
                            }
                        } else {
                            const f = (isCenterAisle && accentDef) || floorDef;
                            ctx.fillStyle = (r + c) % 2 === 0 ? f.color : f.accentColor;
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }

                        if (isGate) {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
                            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
                        }
                    }
                }

                // Draw props
                mapData.props.forEach(pr => {
                    drawProceduralInteriorProp(ctx, pr, now);
                    if (pr.interactive) {
                        const cxp = (pr.tileX + pr.tileW / 2) * BASE_TILE_SIZE;
                        const fyp = pr.tileY * BASE_TILE_SIZE;
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        const tw = Math.max(60, ctx.measureText(pr.label).width + 12);
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                        ctx.fillRect(cxp - tw / 2, fyp - 16, tw, 15);
                        ctx.strokeStyle = pr.accentColor || '#f59e0b';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(cxp - tw / 2, fyp - 16, tw, 15);
                        ctx.fillStyle = '#fef3c7';
                        ctx.fillText(pr.label, cxp, fyp - 5);
                    }
                });

                // Exit Gate label
                const gx = (mapData.exitGate.x + mapData.exitGate.w / 2) * BASE_TILE_SIZE;
                const gy = mapData.exitGate.y * BASE_TILE_SIZE;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(gx - 56, gy - 18, 112, 16);
                ctx.fillStyle = '#fde68a';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🚪 기지 마당 출구', gx, gy - 6);

                // Sort & draw actors
                type DrawActor =
                    | { kind: 'player'; y: number }
                    | { kind: 'resident'; y: number; r: BaseResidentEntity }
                    | { kind: 'monster'; y: number; m: BaseFarmMonsterEntity };
                const actors: DrawActor[] = [{ kind: 'player', y: p.y }];
                residentsRef.current.forEach(r => actors.push({ kind: 'resident', y: r.py, r }));
                monstersRef.current.forEach(m => actors.push({ kind: 'monster', y: m.py, m }));
                actors.sort((a, b) => a.y - b.y);

                actors.forEach(act => {
                    if (act.kind === 'monster') {
                        const m = act.m;
                        const bob = Math.sin(m.bobPhase) * 2.5;
                        const img = m.visualUrl ? getCachedCityAssetImage(m.visualUrl) : null;
                        ctx.fillStyle = 'rgba(0,0,0,0.28)';
                        ctx.beginPath();
                        ctx.ellipse(m.px, m.py + 12, 14, 6, 0, 0, Math.PI * 2);
                        ctx.fill();
                        if (img && img.complete && img.naturalWidth > 0) {
                            ctx.save();
                            ctx.translate(m.px, m.py + bob);
                            if (m.dir === 'left') ctx.scale(-1, 1);
                            ctx.drawImage(img, -20, -24, 40, 40);
                            ctx.restore();
                        } else {
                            ctx.font = '22px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('🐉', m.px, m.py + 6 + bob);
                        }
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                        ctx.fillRect(m.px - 34, m.py + 14, 68, 13);
                        ctx.fillStyle = '#86efac';
                        ctx.fillText(m.name, m.px, m.py + 24);
                        return;
                    }

                    const isPlayer = act.kind === 'player';
                    const ax = isPlayer ? p.x : act.r.px;
                    const ay = isPlayer ? p.y : act.r.py;
                    const dir = isPlayer ? p.dir : act.r.dir;
                    const frame = isPlayer ? p.walkFrame : act.r.walkFrame;
                    const url = isPlayer ? playerSpriteUrl : act.r.spriteUrl;
                    const sheet = getCachedRpgSpriteImage(url);

                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.ellipse(ax, ay + 12, 12, 5, 0, 0, Math.PI * 2);
                    ctx.fill();

                    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
                        const fw = Math.floor(sheet.naturalWidth / 3);
                        const fh = Math.floor(sheet.naturalHeight / 4);
                        const row = DIR_ROW_MAP[dir] ?? 0;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(sheet, frame * fw, row * fh, fw, fh, ax - 20, ay - 30, 40, 44);
                    } else {
                        ctx.fillStyle = isPlayer ? '#facc15' : '#38bdf8';
                        ctx.beginPath();
                        ctx.arc(ax, ay - 6, 11, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    const nameStr = isPlayer ? character.name : act.r.name;
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const nw = Math.max(44, ctx.measureText(nameStr).width + 10);
                    ctx.fillStyle = isPlayer ? 'rgba(180, 83, 9, 0.92)' : 'rgba(15, 23, 42, 0.85)';
                    ctx.fillRect(ax - nw / 2, ay + 14, nw, 13);
                    ctx.fillStyle = isPlayer ? '#fef08a' : '#e2e8f0';
                    ctx.fillText(nameStr, ax, ay + 24);

                    if (!isPlayer && act.r.activityBubble) {
                        const distToPlayer = Math.hypot(act.r.px - p.x, act.r.py - p.y);
                        const idxHash = act.r.name.charCodeAt(0) || 0;
                        const showTurn = (Math.floor(now / 3600) + idxHash) % 3 === 0;
                        if (distToPlayer <= 150 || act.r.isSleeping || showTurn) {
                            ctx.font = '10px sans-serif';
                            const bw = Math.max(54, ctx.measureText(act.r.activityBubble).width + 12);
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
                            ctx.fillRect(ax - bw / 2, ay - 46, bw, 15);
                            ctx.fillStyle = '#bae6fd';
                            ctx.fillText(act.r.activityBubble, ax, ay - 35);
                        }
                    }
                });

                // 야간/석양 조명 오버레이
                const [chStr] = (character.currentTime || '08:00').split(':');
                const chHour = parseInt(chStr, 10) || 8;
                if (chHour >= 20 || chHour < 5) {
                    ctx.fillStyle = 'rgba(10, 14, 38, 0.34)';
                    ctx.fillRect(0, 0, interiorMap.cols * BASE_TILE_SIZE, interiorMap.rows * BASE_TILE_SIZE);
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const g = ctx.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y - 6, 95);
                    g.addColorStop(0, 'rgba(254, 243, 199, 0.24)');
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 6, 95, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (chHour >= 17 && chHour < 20) {
                    ctx.fillStyle = 'rgba(190, 60, 40, 0.12)';
                    ctx.fillRect(0, 0, interiorMap.cols * BASE_TILE_SIZE, interiorMap.rows * BASE_TILE_SIZE);
                }

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [mapData, viewportSize, playerSpriteUrl, character.name, findNearestInteractable, onExitToBase]);

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
            <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-xl">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                            <span>{facility.iconText} {mapData.blueprint.title}</span>
                            <span className="text-amber-400">Lv.{facility.level}</span>
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/40">
                                실내 {mapData.cols}×{mapData.rows}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>배치 인원 {mapData.residents.length}명</span>
                            {mapData.monsters.length > 0 && <span>몬스터 {mapData.monsters.length}마리</span>}
                            <span>작업대를 클릭하거나 다가가서 [Space]를 누르세요</span>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => openStationModal(mapData.blueprint.defaultSubModal)}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-white flex items-center gap-1.5 shadow-lg"
                    >
                        <Zap size={13} /> 빠른 기능 열기
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (
                                (facility.facilityType === 'housing' ||
                                    facility.facilityType === 'home' ||
                                    facility.facilityType === 'my_home') &&
                                activeHouseId
                            ) {
                                exitCooldownRef.current = Date.now() + 700;
                                setActiveHouseId('');
                            } else {
                                onExitToBase();
                            }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-700/90 hover:bg-amber-600 border border-amber-400/50 text-white flex items-center gap-1.5 shadow-lg"
                    >
                        <DoorOpen size={13} />{' '}
                        {(facility.facilityType === 'housing' ||
                            facility.facilityType === 'home' ||
                            facility.facilityType === 'my_home') &&
                        activeHouseId
                            ? '숙소 단지로'
                            : '기지 마당으로'}
                    </button>
                </div>
            </div>

            {facility.facilityType === 'farm' && facility.instanceId && onUpdateCharacter && (
                <FarmInteriorPanel
                    character={character}
                    instanceId={facility.instanceId}
                    selectedPlot={selectedFarmPlot}
                    onSelectPlot={setSelectedFarmPlot}
                    onSwitchFarmInstance={newId => {
                        setSelectedFarmPlot(null);
                        onSwitchFacilityInstance?.(newId);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {facility.facilityType === 'mine' && facility.instanceId && onUpdateCharacter && (
                <MineInteriorPanel
                    character={character}
                    instanceId={facility.instanceId}
                    selectedZoneId={selectedMineZoneId}
                    onSelectZoneId={setSelectedMineZoneId}
                    onSwitchMineInstance={newId => {
                        setSelectedMineZoneId(null);
                        onSwitchFacilityInstance?.(newId);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {(facility.facilityType === 'housing' || facility.facilityType === 'home' || facility.facilityType === 'my_home') &&
                onUpdateCharacter && (
                    <HousingInteriorPanel
                        character={character}
                        cultureKey={mapData.cultureKey}
                        activeHouseId={activeHouseId}
                        onSelectHouseId={setActiveHouseId}
                        onOpenHousingModal={() => onOpenBaseModal('housing')}
                        onOpenMyHomeModal={() => onOpenBaseModal('my_home')}
                        onUpdateCharacter={onUpdateCharacter}
                    />
                )}

            {nearbyLabel && !selectedResident && !selectedMonster && selectedFarmPlot === null && !selectedMineZoneId && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="px-4 py-2 rounded-full bg-slate-950/95 border border-amber-400/70 text-amber-200 text-xs font-black shadow-2xl hover:bg-amber-950/80 transition-all"
                    >
                        [Space / 터치] {nearbyLabel}
                    </button>
                </div>
            )}

            {/* Mobile D-Pad */}
            <div className="absolute bottom-4 right-4 z-20 grid grid-cols-3 gap-1.5 w-36 h-36 sm:w-40 sm:h-40 opacity-85">
                <div />
                <button
                    type="button"
                    onTouchStart={() => (dpadRef.current = 'up')}
                    onTouchEnd={() => (dpadRef.current = null)}
                    className="bg-slate-900/90 border border-slate-600 rounded-xl flex items-center justify-center text-white"
                >
                    <ArrowUp size={22} />
                </button>
                <div />
                <button
                    type="button"
                    onTouchStart={() => (dpadRef.current = 'left')}
                    onTouchEnd={() => (dpadRef.current = null)}
                    className="bg-slate-900/90 border border-slate-600 rounded-xl flex items-center justify-center text-white"
                >
                    <ArrowLeft size={22} />
                </button>
                <div />
                <button
                    type="button"
                    onTouchStart={() => (dpadRef.current = 'right')}
                    onTouchEnd={() => (dpadRef.current = null)}
                    className="bg-slate-900/90 border border-slate-600 rounded-xl flex items-center justify-center text-white"
                >
                    <ArrowRight size={22} />
                </button>
                <div />
                <button
                    type="button"
                    onTouchStart={() => (dpadRef.current = 'down')}
                    onTouchEnd={() => (dpadRef.current = null)}
                    className="bg-slate-900/90 border border-slate-600 rounded-xl flex items-center justify-center text-white"
                >
                    <ArrowDown size={22} />
                </button>
                <div />
            </div>

            {selectedResident && (
                <ResidentQuickCard
                    resident={selectedResident}
                    character={character}
                    facilityType={facility.facilityType}
                    onCommissionBlacksmith={id => setCommissionBlacksmithId(id)}
                    onCommissionAlchemist={id => setCommissionAlchemistId(id)}
                    onUpdateCharacter={onUpdateCharacter}
                    onInspectCompanion={onInspectCompanion}
                    onClose={() => setSelectedResident(null)}
                />
            )}

            {commissionBlacksmithId && onUpdateCharacter && (
                <BlacksmithModal
                    character={character}
                    initialBlacksmithId={commissionBlacksmithId}
                    onClose={() => setCommissionBlacksmithId(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {commissionAlchemistId && onUpdateCharacter && (
                <AlchemyCraftModal
                    character={character}
                    initialAlchemistId={commissionAlchemistId}
                    onClose={() => setCommissionAlchemistId(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {openDirectSubModal === 'workshop' && onUpdateCharacter && (
                <WorkshopModal
                    character={character}
                    instanceId={facility.instanceId}
                    onClose={() => setOpenDirectSubModal(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {openDirectSubModal === 'dispatch' && onUpdateCharacter && (
                <DispatchModal
                    character={character}
                    instanceId={facility.instanceId}
                    onClose={() => setOpenDirectSubModal(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {selectedMonster && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {selectedMonster.visualUrl && (
                                <img
                                    src={selectedMonster.visualUrl}
                                    alt={selectedMonster.name}
                                    className="w-14 h-14 rounded-xl object-cover border border-emerald-500/50"
                                />
                            )}
                            <div>
                                <div className="text-sm font-black text-emerald-200 flex items-center gap-1.5">
                                    <PawPrint size={14} className="text-emerald-400" />
                                    {selectedMonster.name}
                                </div>
                                <div className="text-xs text-slate-300 mt-1 space-x-3">
                                    <span>Lv.{selectedMonster.level}</span>
                                    <span>포만감 {selectedMonster.hunger}%</span>
                                    <span>친밀도 {selectedMonster.affection}</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedMonster(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedMonster(null);
                                onOpenBaseModal('monster_farm');
                            }}
                            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
                        >
                            몬스터 사육소 관리 열기
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedMonster(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacilityInteriorCanvas;
