import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../types';
import {
    DIRECTION_ROW_MAP,
    drawFallbackChibiSprite,
    getCachedRpgSpriteImage,
    loadRpgSpriteImage,
    resolveEntityRpgSprite,
    RpgSpriteGenderKey,
    RpgSpriteRegionKey,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import {
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    loadCityAssetImage
} from '../services/cityAssetManifest';
import { CITY_TILE_SIZE } from '../services/cityTilemapEngine';
import RegionalManagementModal from './RegionalManagementModal';
import { ArrowLeft, DoorOpen, MessageSquare, Shield, Sparkles, X } from 'lucide-react';

type AdminTab = 'overview' | 'dispatch' | 'status' | 'defense';

interface AdminNpc {
    id: string;
    name: string;
    role: string;
    tx: number;
    ty: number;
    gender: RpgSpriteGenderKey;
    spriteUrl: string;
    regionKey: RpgSpriteRegionKey;
    dialogue: string;
    opensTab?: AdminTab;
    badgeColor: string;
}

interface AdminProp {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    label?: string;
    opensTab?: AdminTab;
}

interface RegionalAdminCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    isCapital: boolean;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
    onClose: () => void;
}

const RegionalAdminCanvas: React.FC<RegionalAdminCanvasProps> = ({
    character,
    region,
    nation,
    city,
    isCapital,
    onUpdateCharacter,
    onClose
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cols = isCapital ? 22 : 18;
    const rows = isCapital ? 15 : 13;

    const [activeModalTab, setActiveModalTab] = useState<AdminTab | null>(null);
    const [selectedNpc, setSelectedNpc] = useState<AdminNpc | null>(null);
    const [nearbyNpc, setNearbyNpc] = useState<AdminNpc | null>(null);
    const [, setAssetTick] = useState(0);

    const playerSprite = useMemo(
        () => resolveEntityRpgSprite(character, region, nation),
        [character, region, nation]
    );

    const playerRef = useRef({
        x: Math.floor(cols / 2) * CITY_TILE_SIZE + CITY_TILE_SIZE / 2,
        y: (rows - 2.2) * CITY_TILE_SIZE,
        dir: 'up' as SpriteDirection,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());

    const adminProps = useMemo<AdminProp[]>(() => {
        const cx = Math.floor(cols / 2);
        if (isCapital) {
            return [
                { key: 'command_table', tx: cx - 1, ty: 2.0, w: 3, h: 2, label: '🗺️ 수도 작전·예산 탁자', opensTab: 'overview' },
                { key: 'royal_heraldic_stand', tx: 2.0, ty: 1.8, w: 1.6, h: 2.0 },
                { key: 'royal_heraldic_stand', tx: cols - 3.6, ty: 1.8, w: 1.6, h: 2.0 },
                { key: 'royal_brazier', tx: cx - 3.2, ty: 2.1, w: 1.4, h: 1.6 },
                { key: 'royal_brazier', tx: cx + 2.8, ty: 2.1, w: 1.4, h: 1.6 },
                { key: 'royal_pillar', tx: 5.5, ty: 4.5, w: 1.3, h: 2.0 },
                { key: 'royal_pillar', tx: cols - 6.8, ty: 4.5, w: 1.3, h: 2.0 },
                { key: 'royal_pillar', tx: 5.5, ty: 8.5, w: 1.3, h: 2.0 },
                { key: 'royal_pillar', tx: cols - 6.8, ty: 8.5, w: 1.3, h: 2.0 },
                { key: 'tactics_board', tx: 2.0, ty: 4.8, w: 2.2, h: 1.8, label: '🛡️ 방위·요격 보드', opensTab: 'defense' },
                { key: 'mil_dispatch_desk', tx: cols - 4.4, ty: 4.8, w: 2.4, h: 1.8, label: '📋 파견 명령대', opensTab: 'dispatch' },
                { key: 'treasure_chest', tx: 2.2, ty: 8.6, w: 1.6, h: 1.5, label: '💰 수도 국고', opensTab: 'overview' },
                { key: 'bookshelf', tx: cols - 4.2, ty: 8.4, w: 2.0, h: 1.8, label: '📊 파견 현황 서가', opensTab: 'status' },
                { key: 'house_potted_plant', tx: cx - 2.6, ty: rows - 3.0, w: 1.3, h: 1.5 },
                { key: 'house_potted_plant', tx: cx + 2.3, ty: rows - 3.0, w: 1.3, h: 1.5 }
            ];
        }
        return [
            { key: 'mil_command_podium', tx: cx - 1, ty: 2.0, w: 3, h: 1.8, label: '🗺️ 행정 총괄 데스크', opensTab: 'overview' },
            { key: 'notice_board', tx: 2.0, ty: 4.4, w: 2.2, h: 1.8, label: '🛡️ 방위·요격 공고', opensTab: 'defense' },
            { key: 'mil_dispatch_desk', tx: cols - 4.4, ty: 4.4, w: 2.2, h: 1.8, label: '📋 파견 접수대', opensTab: 'dispatch' },
            { key: 'bookshelf', tx: 2.0, ty: 1.8, w: 1.8, h: 1.8 },
            { key: 'bookshelf', tx: cols - 3.8, ty: 1.8, w: 1.8, h: 1.8, label: '📊 파견 기록대', opensTab: 'status' },
            { key: 'treasure_chest', tx: 2.2, ty: 8.0, w: 1.5, h: 1.4, label: '💰 지역 예산 금고', opensTab: 'overview' },
            { key: 'lantern_post', tx: cx - 2.5, ty: rows - 3.0, w: 1.2, h: 1.8 },
            { key: 'lantern_post', tx: cx + 2.3, ty: rows - 3.0, w: 1.2, h: 1.8 },
            { key: 'house_potted_plant', tx: cx - 3.8, ty: 2.2, w: 1.2, h: 1.4 },
            { key: 'house_potted_plant', tx: cx + 3.6, ty: 2.2, w: 1.2, h: 1.4 }
        ];
    }, [cols, rows, isCapital]);

    const adminNpcs = useMemo<AdminNpc[]>(() => {
        const make = (
            id: string,
            name: string,
            role: string,
            tx: number,
            ty: number,
            gender: RpgSpriteGenderKey,
            dialogue: string,
            badgeColor: string,
            opensTab?: AdminTab
        ): AdminNpc => {
            const sp = resolveEntityRpgSprite({ name, gender, appearance: '' } as any, region, nation);
            return {
                id,
                name,
                role,
                tx,
                ty,
                gender,
                spriteUrl: sp.url,
                regionKey: sp.regionKey,
                dialogue,
                opensTab,
                badgeColor
            };
        };

        const list: AdminNpc[] = [
            make(
                'adm_overview',
                isCapital ? '수도 총괄 행정관' : '지역 행정 총괄관',
                '지역 현황 · 예산 관리',
                Math.floor(cols / 2),
                4.2,
                'male',
                `${city} ${isCapital ? '수도 행정청' : '지역행정소'}의 세율, 민심, 치안 및 예산을 총괄하고 있습니다.`,
                '#0284c7',
                'overview'
            ),
            make(
                'adm_defense',
                isCapital ? '수도 방위 사령부관' : '주둔 방어군 부관',
                '주둔군 편성 · 비상 요격 · 진지 보강',
                4.2,
                6.2,
                'male',
                `${city}의 주둔 방어군 편성과 진지 보강, 전방 비상 요격 작전을 지휘 보좌합니다.`,
                '#dc2626',
                'defense'
            ),
            make(
                'adm_dispatch',
                '지역 파견 서기관',
                '대원 파견 명령',
                cols - 4.8,
                6.4,
                'female',
                `치안 순찰, 세무 징수, 시설 감독 등 지역 임무에 대원들을 파견할 수 있습니다.`,
                '#059669',
                'dispatch'
            ),
            make(
                'adm_status',
                '파견 현황 보고관',
                '파견 현황 · 귀환 보고',
                cols - 4.8,
                9.2,
                'female',
                `현재 ${city} 전역에 파견된 대원들의 작전 진행 현황과 복귀 일정을 보고드립니다.`,
                '#7c3aed',
                'status'
            )
        ];

        const garrisonIds: string[] = character.militaryData?.regionalGarrisons?.[city] || [];
        const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
        garrisonIds.slice(0, 4).forEach((gid, idx) => {
            const comp = allComps.find(c => c.id === gid);
            if (!comp) return;
            const sp = resolveEntityRpgSprite(comp as any, region, nation);
            const g: RpgSpriteGenderKey = comp.gender === '여성' ? 'female' : 'male';
            list.push({
                id: `garrison_${comp.id}`,
                name: comp.name,
                role: `주둔 방어군 (${comp.militaryRank || '병사'})`,
                tx: 3.5 + idx * 2.6,
                ty: rows - 4.2,
                gender: g,
                spriteUrl: sp.url,
                regionKey: sp.regionKey,
                dialogue: `${city} 방위 임무를 성실히 수행 중입니다! 언제든 비상 요격 출동 준비가 되어 있습니다.`,
                opensTab: 'defense',
                badgeColor: '#b91c1c'
            });
        });

        const dispatches: any[] = (character.militaryData as any)?.regionalDispatches?.[city] || [];
        dispatches.slice(0, 3).forEach((dp: any, idx: number) => {
            const comp = allComps.find(c => c.id === dp.memberId);
            if (!comp) return;
            const sp = resolveEntityRpgSprite(comp as any, region, nation);
            const g: RpgSpriteGenderKey = comp.gender === '여성' ? 'female' : 'male';
            list.push({
                id: `dispatch_${comp.id}`,
                name: comp.name,
                role: `지역 파견 중 (${dp.missionLabel || '행정 임무'})`,
                tx: 4.5 + idx * 3.0,
                ty: 7.8,
                gender: g,
                spriteUrl: sp.url,
                regionKey: sp.regionKey,
                dialogue: `지시하신 '${dp.missionLabel || '지역 임무'}' 파견을 진행하고 있습니다!`,
                opensTab: 'status',
                badgeColor: '#0d9488'
            });
        });

        return list;
    }, [cols, rows, isCapital, city, region, nation, character.militaryData, character.companions, character.inactiveCompanions]);

    useEffect(() => {
        loadRpgSpriteImage(playerSprite.url).then(() => setAssetTick(t => t + 1));
        adminNpcs.forEach(n => loadRpgSpriteImage(n.spriteUrl).then(() => setAssetTick(t => t + 1)));
        const tileKeys = isCapital
            ? ['royal_tile_marble', 'royal_tile_carpet', 'royal_tile_wall']
            : ['interior_tile_cobble', 'interior_tile_crimson_carpet', 'interior_tile_stone_wall'];
        tileKeys.forEach(k => loadCityAssetImage(getInteriorPropSpriteUrl(k)).then(() => setAssetTick(t => t + 1)));
        adminProps.forEach(p => loadCityAssetImage(getInteriorPropSpriteUrl(p.key)).then(() => setAssetTick(t => t + 1)));
    }, [playerSprite.url, adminNpcs, adminProps, isCapital]);

    const handleInteract = useCallback(() => {
        if (selectedNpc) {
            if (selectedNpc.opensTab) {
                const t = selectedNpc.opensTab;
                setSelectedNpc(null);
                setActiveModalTab(t);
            } else {
                setSelectedNpc(null);
            }
            return;
        }
        if (nearbyNpc) {
            setSelectedNpc(nearbyNpc);
            return;
        }
        const p = playerRef.current;
        for (const pr of adminProps) {
            if (!pr.opensTab) continue;
            const px = (pr.tx + pr.w / 2) * CITY_TILE_SIZE;
            const py = (pr.ty + pr.h / 2) * CITY_TILE_SIZE;
            if (Math.hypot(px - p.x, py - p.y) <= CITY_TILE_SIZE * 2.0) {
                setActiveModalTab(pr.opensTab);
                return;
            }
        }
    }, [selectedNpc, nearbyNpc, adminProps]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (activeModalTab) return;
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift'].includes(k)) {
                e.preventDefault();
                keysRef.current.add(k);
            } else if (k === ' ' || k === 'e' || k === 'enter') {
                e.preventDefault();
                handleInteract();
            } else if (k === 'escape') {
                onClose();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key.toLowerCase());
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [activeModalTab, handleInteract, onClose]);

    useEffect(() => {
        let rafId = 0;
        let last = performance.now();

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const p = playerRef.current;

            if (!activeModalTab && !selectedNpc) {
                let vx = 0;
                let vy = 0;
                const keys = keysRef.current;
                if (keys.has('w') || keys.has('arrowup')) vy -= 1;
                if (keys.has('s') || keys.has('arrowdown')) vy += 1;
                if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
                if (keys.has('d') || keys.has('arrowright')) vx += 1;

                const spd = (keys.has('shift') ? 210 : 145) * dt;
                if (vx !== 0 || vy !== 0) {
                    p.targetX = null;
                    p.targetY = null;
                    const len = Math.hypot(vx, vy);
                    const nx = p.x + (vx / len) * spd;
                    const ny = p.y + (vy / len) * spd;
                    p.dir = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
                    p.x = Math.max(CITY_TILE_SIZE * 1.4, Math.min((cols - 1.4) * CITY_TILE_SIZE, nx));
                    p.y = Math.max(CITY_TILE_SIZE * 1.6, Math.min((rows - 1.2) * CITY_TILE_SIZE, ny));
                    p.animTimer += dt * 7;
                    p.walkFrame = [0, 1, 2, 1][Math.floor(p.animTimer) % 4];
                } else if (p.targetX !== null && p.targetY !== null) {
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const d = Math.hypot(dx, dy);
                    if (d <= spd + 2) {
                        p.x = p.targetX;
                        p.y = p.targetY;
                        p.targetX = null;
                        p.targetY = null;
                        p.walkFrame = 1;
                    } else {
                        p.x += (dx / d) * spd;
                        p.y += (dy / d) * spd;
                        p.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                        p.animTimer += dt * 7;
                        p.walkFrame = [0, 1, 2, 1][Math.floor(p.animTimer) % 4];
                    }
                } else {
                    p.walkFrame = 1;
                }

                const exitX = Math.floor(cols / 2) * CITY_TILE_SIZE + CITY_TILE_SIZE / 2;
                if (p.y >= (rows - 1.35) * CITY_TILE_SIZE && Math.abs(p.x - exitX) <= CITY_TILE_SIZE * 1.2) {
                    onClose();
                    return;
                }
            }

            let closest: AdminNpc | null = null;
            let bestD = CITY_TILE_SIZE * 1.65;
            for (const npc of adminNpcs) {
                const nx = (npc.tx + 0.5) * CITY_TILE_SIZE;
                const ny = (npc.ty + 0.5) * CITY_TILE_SIZE;
                const d = Math.hypot(nx - p.x, ny - p.y);
                if (d <= bestD) {
                    bestD = d;
                    closest = npc;
                }
            }
            setNearbyNpc(closest);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && canvas) {
                const ts = CITY_TILE_SIZE;
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const floorImg = getCachedCityAssetImage(
                    getInteriorPropSpriteUrl(isCapital ? 'royal_tile_marble' : 'interior_tile_cobble')
                );
                const carpetImg = getCachedCityAssetImage(
                    getInteriorPropSpriteUrl(isCapital ? 'royal_tile_carpet' : 'interior_tile_crimson_carpet')
                );
                const wallImg = getCachedCityAssetImage(
                    getInteriorPropSpriteUrl(isCapital ? 'royal_tile_wall' : 'interior_tile_stone_wall')
                );

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = c * ts;
                        const y = r * ts;
                        const isWall = r === 0 || c === 0 || c === cols - 1 || (r === rows - 1 && Math.abs(c - Math.floor(cols / 2)) > 1);
                        if (isWall) {
                            if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
                                ctx.drawImage(wallImg, x, y, ts, ts);
                            } else {
                                ctx.fillStyle = isCapital ? '#451a03' : '#1e293b';
                                ctx.fillRect(x, y, ts, ts);
                            }
                        } else {
                            if (floorImg && floorImg.complete && floorImg.naturalWidth > 0) {
                                ctx.drawImage(floorImg, x, y, ts, ts);
                            } else {
                                ctx.fillStyle = isCapital
                                    ? (r + c) % 2 === 0 ? '#1e1b4b' : '#262259'
                                    : (r + c) % 2 === 0 ? '#1e293b' : '#243247';
                                ctx.fillRect(x, y, ts, ts);
                            }
                            if (Math.abs(c - Math.floor(cols / 2)) <= (isCapital ? 1 : 0) && r >= 2 && r <= rows - 2) {
                                if (carpetImg && carpetImg.complete && carpetImg.naturalWidth > 0) {
                                    ctx.drawImage(carpetImg, x, y, ts, ts);
                                } else {
                                    ctx.fillStyle = isCapital ? 'rgba(185, 28, 28, 0.72)' : 'rgba(13, 148, 136, 0.52)';
                                    ctx.fillRect(x, y, ts, ts);
                                }
                            }
                        }
                    }
                }

                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fde047';
                ctx.fillText('🚪 도시로 나가기', Math.floor(cols / 2) * ts + ts / 2, (rows - 1) * ts - 8);

                // Draw Y-sorted Props, NPCs, Player
                const drawQueue: Array<{ y: number; draw: () => void }> = [];

                adminProps.forEach(pr => {
                    const px = pr.tx * ts;
                    const py = pr.ty * ts;
                    const pw = pr.w * ts;
                    const ph = pr.h * ts;
                    drawQueue.push({
                        y: py + ph - 6,
                        draw: () => {
                            const pImg = getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                            ctx.fillStyle = 'rgba(0,0,0,0.32)';
                            ctx.beginPath();
                            ctx.ellipse(px + pw / 2, py + ph - 4, pw * 0.36, 7, 0, 0, Math.PI * 2);
                            ctx.fill();
                            if (pImg && pImg.complete && pImg.naturalWidth > 0) {
                                ctx.drawImage(pImg, px, py, pw, ph);
                            } else {
                                ctx.fillStyle = '#334155';
                                ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
                            }
                            if (pr.label) {
                                ctx.font = 'bold 9.5px sans-serif';
                                ctx.textAlign = 'center';
                                const lw = ctx.measureText(pr.label).width + 10;
                                ctx.fillStyle = 'rgba(15,23,42,0.88)';
                                ctx.beginPath();
                                ctx.roundRect(px + pw / 2 - lw / 2, py - 14, lw, 14, 4);
                                ctx.fill();
                                ctx.fillStyle = '#fde68a';
                                ctx.fillText(pr.label, px + pw / 2, py - 4);
                            }
                        }
                    });
                });

                adminNpcs.forEach(npc => {
                    const nx = (npc.tx + 0.5) * ts;
                    const ny = (npc.ty + 0.5) * ts;
                    drawQueue.push({
                        y: ny + 8,
                        draw: () => {
                            const img = getCachedRpgSpriteImage(npc.spriteUrl);
                            ctx.fillStyle = 'rgba(0,0,0,0.34)';
                            ctx.beginPath();
                            ctx.ellipse(nx, ny + 8, 12, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                            if (img && img.complete && img.naturalWidth > 0) {
                                const cw = img.naturalWidth / 3;
                                const ch = img.naturalHeight / 4;
                                ctx.drawImage(img, cw, 0, cw, ch, Math.round(nx - 22), Math.round(ny - 34), 44, 44);
                            } else {
                                drawFallbackChibiSprite(ctx, nx, ny + 8, 42, 'down', 1, npc.regionKey, npc.gender);
                            }

                            ctx.font = 'bold 10px sans-serif';
                            const tw = Math.max(60, ctx.measureText(npc.name).width + 12);
                            ctx.fillStyle = npc.badgeColor;
                            ctx.beginPath();
                            ctx.roundRect(nx - tw / 2, ny - 50, tw, 17, 4);
                            ctx.fill();
                            ctx.strokeStyle = '#fde047';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.fillText(npc.name, nx, ny - 38);
                        }
                    });
                });

                drawQueue.push({
                    y: p.y + 10,
                    draw: () => {
                        const pImg = getCachedRpgSpriteImage(playerSprite.url);
                        ctx.fillStyle = 'rgba(0,0,0,0.35)';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y + 8, 12, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        if (pImg && pImg.complete && pImg.naturalWidth > 0) {
                            const cw = pImg.naturalWidth / 3;
                            const ch = pImg.naturalHeight / 4;
                            const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                            ctx.drawImage(pImg, p.walkFrame * cw, row * ch, cw, ch, Math.round(p.x - 23), Math.round(p.y - 36), 46, 46);
                        } else {
                            drawFallbackChibiSprite(ctx, p.x, p.y + 8, 44, p.dir, p.walkFrame, playerSprite.regionKey, playerSprite.genderKey);
                        }
                    }
                });

                drawQueue.sort((a, b) => a.y - b.y);
                drawQueue.forEach(item => item.draw());
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [cols, rows, isCapital, adminProps, adminNpcs, playerSprite, activeModalTab, selectedNpc, onClose]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const wx = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const wy = ((e.clientY - rect.top) / rect.height) * canvas.height;
        const clickedNpc = adminNpcs.find(n => {
            const nx = (n.tx + 0.5) * CITY_TILE_SIZE;
            const ny = (n.ty + 0.5) * CITY_TILE_SIZE;
            return Math.hypot(nx - wx, ny - wy) <= CITY_TILE_SIZE * 0.9;
        });
        if (clickedNpc) {
            const nx = (clickedNpc.tx + 0.5) * CITY_TILE_SIZE;
            const ny = (clickedNpc.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(nx - playerRef.current.x, ny - playerRef.current.y) <= CITY_TILE_SIZE * 1.75) {
                setSelectedNpc(clickedNpc);
                return;
            }
        }
        const clickedProp = adminProps.find(pr =>
            pr.opensTab &&
            wx >= pr.tx * CITY_TILE_SIZE &&
            wx <= (pr.tx + pr.w) * CITY_TILE_SIZE &&
            wy >= pr.ty * CITY_TILE_SIZE &&
            wy <= (pr.ty + pr.h) * CITY_TILE_SIZE
        );
        if (clickedProp?.opensTab) {
            const px = (clickedProp.tx + clickedProp.w / 2) * CITY_TILE_SIZE;
            const py = (clickedProp.ty + clickedProp.h / 2) * CITY_TILE_SIZE;
            if (Math.hypot(px - playerRef.current.x, py - playerRef.current.y) <= CITY_TILE_SIZE * 2.2) {
                setActiveModalTab(clickedProp.opensTab);
                return;
            }
        }
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                    <Shield size={18} className={isCapital ? 'text-amber-400' : 'text-teal-400'} />
                    <div>
                        <div className="text-sm font-black text-white">
                            {city} {isCapital ? '수도 행정청 (총독 관저)' : '지역행정소'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            담당관/오브젝트와 상호작용하거나 하단 메뉴로 지역을 관리하세요.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                    <ArrowLeft size={14} /> 도시로 나가기
                </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center p-2 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={cols * CITY_TILE_SIZE}
                    height={rows * CITY_TILE_SIZE}
                    onClick={handleCanvasClick}
                    className="max-w-full max-h-full rounded-2xl border border-slate-700 shadow-2xl cursor-pointer object-contain"
                />

                {nearbyNpc && !selectedNpc && (
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/95 border-2 border-amber-400 text-amber-200 text-xs font-black shadow-xl flex items-center gap-1.5 animate-bounce cursor-pointer"
                    >
                        <Sparkles size={14} /> [Space / E] {nearbyNpc.name} 대화
                    </button>
                )}

                {selectedNpc && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-30 bg-slate-950/95 border border-amber-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="text-sm font-black text-white flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-amber-400" />
                                    {selectedNpc.name}
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300">{selectedNpc.role}</span>
                                </div>
                                <p className="text-xs text-slate-200 mt-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                                    &ldquo;{selectedNpc.dialogue}&rdquo;
                                </p>
                            </div>
                            <button type="button" onClick={() => setSelectedNpc(null)} className="text-slate-400 hover:text-white cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {selectedNpc.opensTab && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const tab = selectedNpc.opensTab!;
                                        setSelectedNpc(null);
                                        setActiveModalTab(tab);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer"
                                >
                                    업무 열기 ({selectedNpc.role})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedNpc(null)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-xl">
                    {[
                        { tab: 'overview' as const, label: '🗺️ 지역 현황·예산' },
                        { tab: 'defense' as const, label: '🛡️ 주둔군·요격·진지' },
                        { tab: 'dispatch' as const, label: '📋 대원 파견' },
                        { tab: 'status' as const, label: '📊 파견 현황' }
                    ].map(btn => (
                        <button
                            key={btn.tab}
                            type="button"
                            onClick={() => setActiveModalTab(btn.tab)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-[11px] font-bold text-slate-200 cursor-pointer"
                        >
                            {btn.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-[11px] font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                        <DoorOpen size={12} /> 나가기
                    </button>
                </div>
            </div>

            {activeModalTab && (
                <RegionalManagementModal
                    character={character}
                    initialTab={activeModalTab}
                    onClose={() => setActiveModalTab(null)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
        </div>
    );
};

export default RegionalAdminCanvas;
