import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, CityTier, Item } from '../types';
import { SHOP_INVENTORY, NATION_SPECIFIC_ITEMS, getCityScroll } from '../ItemData';
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
import { getFacilityOperatingState, isNightMarketActive, parseHour } from '../services/facilityOperatingService';
import { NATION_LEADERS } from '../worldData';
import { generateDefaultVisualUrl, generateName } from '../utils';
import ShopModal from './ShopModal';
import AuctionModal from './AuctionModal';
import BackAlleyModal from './BackAlleyModal';
import { ProphetModal } from './ProphetModal';
import CondolenceModal from './CondolenceModal';
import { InnModal } from './InnModal';
import { BlackMarketModal } from './BlackMarketModal';
import KingMeetingModal from './KingMeetingModal';
import FacilityClosedModal from './FacilityClosedModal';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, DoorOpen, Lock, MessageSquare, Sparkles, X } from 'lucide-react';

export type VisualDistrictKind = 'Commercial' | 'Residential' | 'RoyalCourt';

type BuildingId =
    | 'general_shop'
    | 'weapon_shop'
    | 'armor_shop'
    | 'auction_house'
    | 'inn'
    | 'back_alley'
    | 'prophet_savas'
    | 'memorial'
    | 'royal_court';

interface DistrictBuildingNode {
    id: BuildingId;
    label: string;
    subLabel: string;
    icon: string;
    roofColor: string;
    wallColor: string;
    accentColor: string;
    tileX: number;
    tileY: number;
    tileW: number;
    tileH: number;
}

interface MemorialGraveNode {
    id: string;
    name: string;
    subtitle: string;
    epitaph: string;
    isKnown: boolean;
    tx: number;
    ty: number;
}

interface DistrictNpcNode {
    id: string;
    name: string;
    role: string;
    dialogue: string;
    actionLabel?: string;
    serviceBuildingId?: BuildingId;
    innSection?: 'lodging' | 'boss_rumors' | 'wanderer' | 'drink';
    opensBlackMarket?: boolean;
    opensKingMeeting?: boolean;
    spriteUrl: string;
    px: number;
    py: number;
    homePx: number;
    homePy: number;
    dir: SpriteDirection;
    walkFrame: number;
    animTimer: number;
    wanderTimer: number;
    targetPx: number | null;
    targetPy: number | null;
    stationary?: boolean;
}

interface DistrictRpgCanvasProps {
    character: Character;
    district: VisualDistrictKind;
    region: string;
    nation: string;
    city: string;
    tier: CityTier;
    onExitToCity: () => void;
    onUpdateCharacter: (updatedChar: Character, logMessage: any, dailyReport?: any) => void;
    onBattle?: (enemies: any[], battleType: string, sourceId?: string) => void;
    onAction?: (action: string) => void;
}

const STREET_COLS = 24;
const STREET_ROWS = 14;
const INTERIOR_COLS = 18;
const INTERIOR_ROWS = 12;
const ROYAL_COLS = 22;
const ROYAL_ROWS = 16;

function getRegionalNamePool(region: string, nation: string): {
    citizenNames: [string, string, string, string];
    visitorNames: [string, string, string, string];
    flavorTag: string;
} {
    if (nation.includes('대한민국') || region.includes('아시아')) {
        return {
            citizenNames: ['민수', '지은', '철호', '서연'],
            visitorNames: ['상인 박씨', '무사 태현', '유랑객 현우', '수집가 미라'],
            flavorTag: nation || region
        };
    }
    if (region.includes('마계') || nation.includes('마계') || nation.includes('아비스')) {
        return {
            citizenNames: ['카인', '리아', '베르단', '노아'],
            visitorNames: ['마족 상인 자르', '암흑 기사 벨', '수집가 릴리스', '전령 모로스'],
            flavorTag: '마계'
        };
    }
    if (region.includes('신계') || nation.includes('성전')) {
        return {
            citizenNames: ['엘렌', '루카', '세라핌', '이안'],
            visitorNames: ['순례자 요한', '성전 기사 테오', '천계 서기관 아벨', '수호자 클라라'],
            flavorTag: '신계'
        };
    }
    if (nation.includes('엘프') || nation.includes('실바나르')) {
        return {
            citizenNames: ['아린', '실피', '에렌델', '리안'],
            visitorNames: ['숲의 방랑자 케일', '궁수 실비아', '약초상 로렌', '현자 파인'],
            flavorTag: '실바나르'
        };
    }
    if (nation.includes('수인') || nation.includes('페랄디아')) {
        return {
            citizenNames: ['가온', '루루', '바우', '미오'],
            visitorNames: ['사냥꾼 레오', '상인 티거', '방랑자 울프', '연금술사 네코'],
            flavorTag: '페랄디아'
        };
    }
    return {
        citizenNames: ['토마스', '릴리', '베른', '로안'],
        visitorNames: ['귀족 알프레드', '용병 카렌', '상단주 마르코', '학자 에드워드'],
        flavorTag: nation || '제국'
    };
}

function getNightAlpha(currentTime?: string): { isNight: boolean; isSunset: boolean; alpha: number } {
    const h = parseHour(currentTime);
    if (h >= 20 || h < 5) {
        const isDeep = h >= 0 && h < 5;
        return { isNight: true, isSunset: false, alpha: isDeep ? 0.50 : 0.44 };
    }
    if (h >= 17 && h < 20) {
        return { isNight: false, isSunset: true, alpha: 0.22 };
    }
    return { isNight: false, isSunset: false, alpha: 0 };
}

const DistrictRpgCanvas: React.FC<DistrictRpgCanvasProps> = ({
    character,
    district,
    region,
    nation,
    city,
    tier,
    onExitToCity,
    onUpdateCharacter,
    onBattle,
    onAction
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 580 });

    const [activeBuildingId, setActiveBuildingId] = useState<BuildingId | null>(
        district === 'RoyalCourt' ? 'royal_court' : null
    );
    const [activeShop, setActiveShop] = useState<'General' | 'Weapon' | 'Armor' | null>(null);
    const [isAuctionOpen, setIsAuctionOpen] = useState(false);
    const [isInnOpen, setIsInnOpen] = useState(false);
    const [innSection, setInnSection] = useState<'lodging' | 'boss_rumors' | 'wanderer' | 'drink'>('lodging');
    const [isBackAlleyOpen, setIsBackAlleyOpen] = useState(false);
    const [isBlackMarketOpen, setIsBlackMarketOpen] = useState(false);
    const [isProphetOpen, setIsProphetOpen] = useState(false);
    const [isCondolenceOpen, setIsCondolenceOpen] = useState(false);
    const [isKingMeetingOpen, setIsKingMeetingOpen] = useState(false);
    const [isFacilityClosedOpen, setIsFacilityClosedOpen] = useState(false);
    const [selectedNpc, setSelectedNpc] = useState<DistrictNpcNode | null>(null);
    const [selectedGrave, setSelectedGrave] = useState<MemorialGraveNode | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const nightMarketOpen = useMemo(() => isNightMarketActive(character.currentTime), [character.currentTime]);

    const cultureKey = useMemo(() => resolveCityCultureKey(region, nation, city), [region, nation, city]);
    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, region, nation).url,
        [character, region, nation]
    );
    const commercialOpState = useMemo(
        () => getFacilityOperatingState('Commercial', character.currentTime),
        [character.currentTime]
    );
    const namePool = useMemo(() => getRegionalNamePool(region, nation), [region, nation]);
    const royalCourtNames = useMemo(
        () => ({
            guardCaptain: generateName(nation, 'male'),
            chancellor: generateName(nation, 'male'),
            guardLeft: generateName(nation, 'male'),
            guardRight: generateName(nation, 'female')
        }),
        [nation]
    );

    const memorialGraves = useMemo<MemorialGraveNode[]>(() => {
        const known: { id: string; name: string; subtitle: string; epitaph: string; isLocal: boolean }[] = [];
        const seen = new Set<string>();
        const pushKnown = (id: string, name: string, subtitle: string, epitaph: string, itemNation?: string) => {
            if (!id || seen.has(id)) return;
            seen.add(id);
            known.push({ id, name, subtitle, epitaph, isLocal: !itemNation || itemNation === nation });
        };
        [...(character.companions || []), ...(character.inactiveCompanions || []), ...(character.deceasedCompanions || [])].forEach(c => {
            if (c.isDead || c.isPurged) pushKnown(c.id, c.name, '함께했던 동료', c.customEpitaph || c.purgedReason || '전장에서 스러진 영웅', c.nation);
        });
        (character.socialNetwork || []).forEach(n => {
            if (n.isDead || n.isPurged) pushKnown(n.id, n.name, n.originName || '평생의 인연', n.customEpitaph || n.purgedReason || '영원히 기억될 인연', n.nation);
        });
        (character.schoolData?.classmates || []).forEach(s => {
            if (s.isDead || s.isPurged) pushKnown(s.id, s.name, '학창 시절 학우', s.customEpitaph || s.purgedReason || '학창 시절의 벗', s.nation);
        });
        (character.clubData?.clubMembers || []).forEach(m => {
            if (m.isDead || m.isPurged) pushKnown(m.id, m.name, '동아리 부원', m.customEpitaph || m.purgedReason || '함께 땀 흘린 동료', m.nation);
        });
        known.sort((a, b) => Number(b.isLocal) - Number(a.isLocal));

        const slots: Array<{ tx: number; ty: number }> = [
            { tx: 3, ty: 6 },
            { tx: 5, ty: 6 },
            { tx: 12, ty: 6 },
            { tx: 14, ty: 6 },
            { tx: 3, ty: 8 },
            { tx: 5, ty: 8 },
            { tx: 12, ty: 8 },
            { tx: 14, ty: 8 }
        ];
        return slots.map((slot, idx) => {
            const k = known[idx];
            if (k) {
                return {
                    id: `grave_${k.id}`,
                    name: k.name,
                    subtitle: k.subtitle,
                    epitaph: k.epitaph,
                    isKnown: true,
                    tx: slot.tx,
                    ty: slot.ty
                };
            }
            return {
                id: `grave_hero_${idx}`,
                name: `${nation} 호국 영령의 비`,
                subtitle: '국립 추모원 묘비',
                epitaph: '나라와 백성을 지키다 스러진 이름 없는 영웅들을 기립니다.',
                isKnown: false,
                tx: slot.tx,
                ty: slot.ty
            };
        });
    }, [character, nation]);

    const backAlleyTargets = useMemo(() => {
        const mData = character.mercenaryData;
        const blacklist = mData?.blacklist || [];
        const trackedId = mData?.trackedCriminalId;
        const trackedCity = mData?.trackedCriminalCity;
        const trackedCriminal = trackedCity === city ? blacklist.find(c => c.id === trackedId) : undefined;

        const activeBountyQuests = [
            ...(mData?.activeQuests || []),
            ...(character.militaryData?.activeMissions || [])
        ].filter(q => q.type === 'BountyHunt' || q.id.startsWith('king_'));

        const bountyCriminals = activeBountyQuests
            .map(q =>
                blacklist.find(
                    c =>
                        (q.targetName && c.name === q.targetName) ||
                        `bounty_${c.id}` === q.id ||
                        (q.id.startsWith('king_') && q.id.includes(c.id))
                )
            )
            .filter((c): c is NonNullable<typeof c> => Boolean(c));

        const uniqueCriminals = new Map<string, (typeof blacklist)[number]>();
        if (trackedCriminal) uniqueCriminals.set(trackedCriminal.id, trackedCriminal);
        bountyCriminals.forEach(c => {
            if (!uniqueCriminals.has(c.id)) uniqueCriminals.set(c.id, c);
        });

        const rumoredContacts = (character.savedReactions || []).filter(
            r => r.category === 'Companion' && r.location === city
        );

        return {
            criminals: Array.from(uniqueCriminals.values()).slice(0, 3),
            contacts: rumoredContacts.slice(0, 3)
        };
    }, [character, city]);

    const buildings = useMemo<DistrictBuildingNode[]>(() => {
        if (district === 'Commercial') {
            return [
                {
                    id: 'general_shop',
                    label: '잡화점',
                    subLabel: '소비템 · 귀환 스크롤 · 특산품',
                    icon: '🎒',
                    roofColor: '#15803d',
                    wallColor: '#fef3c7',
                    accentColor: '#22c55e',
                    tileX: 2,
                    tileY: 3,
                    tileW: 4,
                    tileH: 3
                },
                {
                    id: 'weapon_shop',
                    label: '무기점',
                    subLabel: '검 · 창 · 지팡이 · 무기 상점',
                    icon: '⚔️',
                    roofColor: '#b91c1c',
                    wallColor: '#e2e8f0',
                    accentColor: '#ef4444',
                    tileX: 7,
                    tileY: 3,
                    tileW: 4,
                    tileH: 3
                },
                {
                    id: 'armor_shop',
                    label: '방어구점',
                    subLabel: '갑옷 · 투구 · 장신구 상점',
                    icon: '🛡️',
                    roofColor: '#1d4ed8',
                    wallColor: '#e2e8f0',
                    accentColor: '#3b82f6',
                    tileX: 13,
                    tileY: 3,
                    tileW: 4,
                    tileH: 3
                },
                {
                    id: 'auction_house',
                    label: '경매장',
                    subLabel: '월간 희귀 경매 참여',
                    icon: '🔨',
                    roofColor: '#7e22ce',
                    wallColor: '#fde68a',
                    accentColor: '#a855f7',
                    tileX: 18,
                    tileY: 3,
                    tileW: 4,
                    tileH: 3
                }
            ];
        }
        if (district === 'RoyalCourt') {
            return [
                {
                    id: 'royal_court',
                    label: `${nation} 왕궁 알현실`,
                    subLabel: '국왕 알현 · 칙령 · 왕실 하사',
                    icon: '👑',
                    roofColor: '#92400e',
                    wallColor: '#fef3c7',
                    accentColor: '#f59e0b',
                    tileX: 7,
                    tileY: 2,
                    tileW: 4,
                    tileH: 3
                }
            ];
        }
        return [
            {
                id: 'inn',
                label: '여관',
                subLabel: '객실 투숙 · 휴식 · 소문 청취',
                icon: '🍺',
                roofColor: '#b45309',
                wallColor: '#fef3c7',
                accentColor: '#f59e0b',
                tileX: 2,
                tileY: 3,
                tileW: 4,
                tileH: 3
            },
            {
                id: 'back_alley',
                label: '어두운 뒷골목',
                subLabel: '비밀 상점 · 불법 결투장 · 정보',
                icon: '🕶️',
                roofColor: '#334155',
                wallColor: '#475569',
                accentColor: '#ef4444',
                tileX: 7,
                tileY: 3,
                tileW: 4,
                tileH: 3
            },
            {
                id: 'prophet_savas',
                label: '예언가 사바스',
                subLabel: '숨겨진 한계 포텐셜 감정',
                icon: '🔮',
                roofColor: '#4338ca',
                wallColor: '#e0e7ff',
                accentColor: '#818cf8',
                tileX: 13,
                tileY: 3,
                tileW: 4,
                tileH: 3
            },
            {
                id: 'memorial',
                label: `${nation} 국립 추모원`,
                subLabel: '전사자 조문 · 헌화 · 묵념',
                icon: '🕯️',
                roofColor: '#1e293b',
                wallColor: '#cbd5e1',
                accentColor: '#38bdf8',
                tileX: 18,
                tileY: 3,
                tileW: 4,
                tileH: 3
            }
        ];
    }, [district, nation]);

    const makeNpc = useCallback(
        (
            id: string,
            name: string,
            role: string,
            dialogue: string,
            tx: number,
            ty: number,
            gender: 'male' | 'female',
            options?: {
                actionLabel?: string;
                serviceBuildingId?: BuildingId;
                innSection?: 'lodging' | 'boss_rumors' | 'wanderer' | 'drink';
                opensBlackMarket?: boolean;
                opensKingMeeting?: boolean;
                stationary?: boolean;
            }
        ): DistrictNpcNode => {
            const px = (tx + 0.5) * CITY_TILE_SIZE;
            const py = (ty + 0.5) * CITY_TILE_SIZE;
            return {
                id,
                name,
                role,
                dialogue,
                actionLabel: options?.actionLabel,
                serviceBuildingId: options?.serviceBuildingId,
                innSection: options?.innSection,
                opensBlackMarket: options?.opensBlackMarket,
                opensKingMeeting: options?.opensKingMeeting,
                spriteUrl: resolveEntityRpgSprite({ name, gender, appearance: '' } as any, region, nation).url,
                px,
                py,
                homePx: px,
                homePy: py,
                dir: 'down',
                walkFrame: 1,
                animTimer: 0,
                wanderTimer: 1.5 + Math.random() * 2,
                targetPx: null,
                targetPy: null,
                stationary: options?.stationary
            };
        },
        [region, nation]
    );

    const streetNpcs = useMemo<DistrictNpcNode[]>(() => {
        const [c1, c2, c3, c4] = namePool.citizenNames;
        if (district === 'Commercial') {
            return [
                makeNpc('st_1', `${city} 주민 ${c1}`, '지역 주민', `${city} 상업지구는 낮 동안 항상 붐비지요. 필요한 물건이 있으면 상점 안으로 들어가 보세요.`, 5, 7, 'male'),
                makeNpc('st_2', `행인 ${c2}`, '장보러 나온 주민', '오늘 물약 값이 괜찮다던데, 잡화점에 한번 들러봐야겠어요.', 10, 8, 'female'),
                makeNpc('st_3', `상객 ${c3}`, '지역 주민', '경매장에서는 가끔 엄청난 희귀템이 나온다더군요. 밤에는 문을 닫으니 서두르세요!', 15, 7, 'male'),
                makeNpc('st_4', `산책객 ${c4}`, '지역 주민', `${nation} 특산품은 이 동네 상점에서도 구할 수 있답니다.`, 19, 8, 'female')
            ];
        }
        return [
            makeNpc('res_1', `${city} 주민 ${c1}`, '거주자', '여관 안에는 각지에서 온 여행자들이 많아 재미있는 소문을 들을 수 있어요.', 5, 8, 'male'),
            makeNpc('res_2', `주민 ${c2}`, '지역 주민', '밤이 깊어지면 저기 어두운 뒷골목 쪽에서 수상한 거래가 오간다는 소문이 있어요...', 10, 7, 'female'),
            makeNpc('res_3', `노인 ${c3}`, '원주민', '사바스 님의 예언 천막은 늘 신비로운 기운이 감돌지.', 15, 8, 'male'),
            makeNpc('res_4', `참배객 ${c4}`, '시민', '추모원에 들러 나라를 지킨 분들을 기리고 오는 길입니다.', 19, 7, 'female')
        ];
    }, [district, city, nation, namePool, makeNpc]);

    const interiorNpcs = useMemo<DistrictNpcNode[]>(() => {
        if (!activeBuildingId) return [];
        const [v1, v2, v3, v4] = namePool.visitorNames;
        const [c1, c2] = namePool.citizenNames;
        switch (activeBuildingId) {
            case 'general_shop':
                return [
                    makeNpc('in_gen_host', '잡화상 미나', '잡화점 주인', '어서 오세요! 회복 물약, 귀환 스크롤, 지역 특산품까지 모두 갖추고 있습니다.', 8.5, 3.2, 'female', {
                        actionLabel: '잡화점 거래하기',
                        serviceBuildingId: 'general_shop',
                        stationary: true
                    }),
                    makeNpc('in_gen_1', v1, `${city} 단골 손님`, '원정을 떠나기 전에 포션은 넉넉히 챙겨두는 게 좋아요.', 5, 6.5, 'male'),
                    makeNpc('in_gen_2', c2, '동네 주민', '여기 귀환 스크롤 품질이 꽤 좋답니다.', 12.5, 7.2, 'female')
                ];
            case 'weapon_shop':
                return [
                    makeNpc('in_wpn_host', '대장장이 반스', '무기점 장인', '좋은 무기는 전사의 목숨을 지켜주지. 손에 맞는 병기를 골라보게.', 8.5, 3.2, 'male', {
                        actionLabel: '무기 상점 열기',
                        serviceBuildingId: 'weapon_shop',
                        stationary: true
                    }),
                    makeNpc('in_wpn_1', v2, `${namePool.flavorTag} 전사`, '새 검 한 자루 장만하러 들렀소. 벼림이 예사롭지 않군.', 4.5, 6.8, 'male'),
                    makeNpc('in_wpn_2', v3, '용병', '예산만 넉넉하면 상급 무기를 맞추고 싶은데 말이죠.', 13, 6.5, 'male')
                ];
            case 'armor_shop':
                return [
                    makeNpc('in_arm_host', '방어구 장인 엘라', '방어구점 주인', '단단한 갑옷과 투구, 그리고 빛나는 장신구까지 직접 구경해 보세요.', 8.5, 3.2, 'female', {
                        actionLabel: '방어구 상점 열기',
                        serviceBuildingId: 'armor_shop',
                        stationary: true
                    }),
                    makeNpc('in_arm_1', v1, `${city} 수비대`, '방어구 하나 차이가 생사를 가릅니다. 튼튼한 걸로 고르세요.', 5.2, 7.0, 'male'),
                    makeNpc('in_arm_2', c1, '모험가', '가벼우면서도 방어력이 높은 갑옷이 있을까요?', 12.8, 6.6, 'female')
                ];
            case 'auction_house':
                return [
                    makeNpc('in_auc_host', '수석 경매사 카일', '경매장 진행자', `${city} 경매장에 오신 것을 환영합니다! 월간 희귀 물품 경매에 참여하시겠습니까?`, 8.5, 2.8, 'male', {
                        actionLabel: '경매장 참여하기',
                        serviceBuildingId: 'auction_house',
                        stationary: true
                    }),
                    makeNpc('in_auc_1', v1, `${namePool.flavorTag} 큰손`, '이번 달 매물은 절대 양보할 수 없지. 골드를 두둑이 챙겨왔다네.', 4.2, 6.2, 'male'),
                    makeNpc('in_auc_2', v2, '무기 수집가', '희귀 무기가 나온다면 경쟁이 꽤 치열할 겁니다.', 13.2, 6.0, 'male'),
                    makeNpc('in_auc_3', v3, '유물 감정사', '보물들은 주인을 알아보는 법이죠. 좋은 안목이 필요할 겁니다.', 6.0, 8.2, 'female'),
                    makeNpc('in_auc_4', v4, `${city} 귀족 대리인`, '가문의 명예를 걸고 낙찰받으러 왔습니다.', 11.4, 8.0, 'male')
                ];
            case 'inn': {
                const currentYearMonth = (character.currentDate || '2024-01').substring(0, 7);
                const hasWandererDone = character.lastInnWandererDate === currentYearMonth;
                const innList: DistrictNpcNode[] = [
                    makeNpc('in_inn_host', '여관주인 한스', '여관 주인', `먼 길 오시느라 고생 많으셨습니다! ${city} 여관 객실에서 편히 쉬어가세요.`, 8.5, 3.0, 'male', {
                        actionLabel: '객실 투숙하기',
                        serviceBuildingId: 'inn',
                        innSection: 'lodging',
                        stationary: true
                    }),
                    makeNpc('in_inn_rumor', '정보상 리오', '보스 소문 정보상', `${region} 일대에 출몰하는 보스 몬스터 정보를 찾으십니까? 수고비만 주시면 알려드리지요.`, 3.8, 3.8, 'male', {
                        actionLabel: '보스 소문 듣기',
                        serviceBuildingId: 'inn',
                        innSection: 'boss_rumors',
                        stationary: true
                    }),
                    makeNpc('in_inn_1', v1, `${namePool.flavorTag} 상인`, '이 집 스튜와 맥주는 근방에서 최고라니까요!', 4.2, 6.2, 'male'),
                    makeNpc('in_inn_2', v2, '피곤한 용병', '오른쪽 아래 빈 술집 테이블에서 동료와 한잔 기울일 수 있더군요.', 5.5, 8.2, 'male'),
                    makeNpc('in_inn_3', v3, '음유시인', `${nation}의 영웅담을 노래로 들려드릴까요?`, 13.5, 6.0, 'female')
                ];
                if (!hasWandererDone) {
                    const genderSeed = (currentYearMonth + nation).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                    const monthlyGender: 'male' | 'female' = genderSeed % 2 === 0 ? 'male' : 'female';
                    innList.push(
                        makeNpc('in_inn_wanderer', '🍷 이달의 방랑 인물', '수수께끼의 방랑자', '여관 술집 한구석에서 모험의 열기를 간직한 채 술잔을 기울이고 있습니다. 한잔 대접하고 동료로 영입해 보세요!', 14.2, 3.8, monthlyGender, {
                            actionLabel: '방랑 인물과 대화 / 영입',
                            serviceBuildingId: 'inn',
                            innSection: 'wanderer',
                            stationary: true
                        })
                    );
                }
                return innList;
            }
            case 'back_alley': {
                const baseAlley: DistrictNpcNode[] = [
                    makeNpc('in_ba_host', '정보상 섀도우', '뒷골목 브로커', '쉿, 목소리 낮춰. 밀수품이나 수배범 정보, 은밀한 결투를 원한다면 내 쪽으로 오시지.', 8.5, 3.2, 'male', {
                        actionLabel: '뒷골목 거래 / 결투장',
                        serviceBuildingId: 'back_alley',
                        stationary: true
                    }),
                    makeNpc('in_ba_1', v2, '어둠의 용병', '실력만 있다면 이곳에선 돈 벌 기회가 넘치지.', 3.8, 6.2, 'male'),
                    makeNpc('in_ba_2', c2, '밀수꾼', '밤 10시 이후엔 더 귀한 물건들이 풀린다는 소문이야.', 13.6, 6.2, 'female')
                ];
                const contactSlots = [
                    { tx: 4.5, ty: 8.2 },
                    { tx: 6.2, ty: 7.4 },
                    { tx: 11.5, ty: 8.2 }
                ];
                backAlleyTargets.contacts.forEach((contact, idx) => {
                    const slot = contactSlots[idx % contactSlots.length];
                    baseAlley.push(
                        makeNpc(
                            `in_ba_contact_${contact.id}`,
                            `[접선] ${contact.npcName}`,
                            '뒷골목 접선 인물',
                            `"${contact.content || '드디어 만났군. 내 제안을 들어보겠나?'}" (${city} 뒷골목에서 접선 가능)`,
                            slot.tx,
                            slot.ty,
                            'female',
                            {
                                actionLabel: '인물 접선하기 (뒷골목 모달)',
                                serviceBuildingId: 'back_alley',
                                stationary: true
                            }
                        )
                    );
                });
                const criminalSlots = [
                    { tx: 13.2, ty: 8.0 },
                    { tx: 14.5, ty: 7.2 },
                    { tx: 3.2, ty: 8.4 }
                ];
                backAlleyTargets.criminals.forEach((crim, idx) => {
                    const slot = criminalSlots[idx % criminalSlots.length];
                    baseAlley.push(
                        makeNpc(
                            `in_ba_crim_${crim.id}`,
                            `🎯 [수배범] ${crim.name}`,
                            `${crim.title || '현상수배범'} (현상금 ${crim.bounty.toLocaleString()}G)`,
                            `"쳇, 여긴 어떻게 찾아낸 거지?! 순순히 잡힐 생각은 없다!" (뒷골목 모달에서 추적/교전 가능)`,
                            slot.tx,
                            slot.ty,
                            'male',
                            {
                                actionLabel: '수배범 추적 / 교전하기',
                                serviceBuildingId: 'back_alley',
                                stationary: true
                            }
                        )
                    );
                });
                return baseAlley;
            }
            case 'prophet_savas':
                return [
                    makeNpc('in_pr_host', '예언가 사바스', '신비한 예언가', '별빛의 속삭임이 들리는군요... 그대와 동료들의 숨겨진 한계를 감정해 드리겠습니다.', 8.5, 3.2, 'female', {
                        actionLabel: '한계 포텐셜 감정받기',
                        serviceBuildingId: 'prophet_savas',
                        stationary: true
                    }),
                    makeNpc('in_pr_1', c1, '견습 점성술사', '사바스 님의 예언은 한 치의 오차도 없습니다.', 5.0, 7.2, 'female')
                ];
            case 'memorial':
                return [
                    makeNpc('in_mem_host', '추모원 관리인 세라', '추모원 수호자', `${nation}을 위해 스러져간 영웅들의 넋을 기리는 성스러운 공간입니다.`, 8.5, 3.2, 'female', {
                        actionLabel: '조문 및 헌화하기',
                        serviceBuildingId: 'memorial',
                        stationary: true
                    }),
                    makeNpc('in_mem_1', v1, '노병', '옛 전우들의 이름을 떠올리며 묵념을 올리고 있었네.', 5.0, 6.8, 'male'),
                    makeNpc('in_mem_2', c2, '유가족', '편히 잠드소서... 영웅들의 희생을 잊지 않겠습니다.', 12.8, 7.0, 'female')
                ];
            case 'royal_court': {
                const leader = NATION_LEADERS[nation] || { name: `${nation} 국왕`, title: '국왕', desc: '이 나라의 통치자입니다.' };
                return [
                    makeNpc('in_rc_king', leader.name, leader.title, leader.desc || `${nation}의 번영과 안녕을 위해 애쓰는 그대를 환영하노라.`, 10.5, 4.0, 'male', {
                        actionLabel: `${leader.title} 알현하기 (왕궁 모달)`,
                        opensKingMeeting: true,
                        stationary: true
                    }),
                    makeNpc('in_rc_guard1', `근위대장 ${royalCourtNames.guardCaptain}`, '왕실 근위대', '국왕 폐하의 어전입니다. 예의를 갖추어 알현에 임하십시오.', 7.2, 5.4, 'male', { stationary: true }),
                    makeNpc('in_rc_chancellor', `왕실 재상 ${royalCourtNames.chancellor}`, '국정 보좌관', `${nation}의 공적과 명성이 자자하시더군요. 폐하께서도 기대하고 계십니다.`, 13.8, 5.4, 'male', { stationary: true }),
                    makeNpc('in_rc_guard_l', `근위병 ${royalCourtNames.guardLeft}`, '왕궁 근위병', '어전 통로를 수호하고 있습니다.', 7.8, 10.0, 'male', { stationary: true }),
                    makeNpc('in_rc_guard_r', `근위병 ${royalCourtNames.guardRight}`, '왕궁 근위병', '질서를 지켜주십시오.', 13.2, 10.0, 'female', { stationary: true })
                ];
            }
        }
    }, [activeBuildingId, namePool, royalCourtNames, city, nation, region, character.currentDate, character.lastInnWandererDate, backAlleyTargets, makeNpc]);

    const currentNpcs = activeBuildingId ? interiorNpcs : streetNpcs;
    const npcsRef = useRef<DistrictNpcNode[]>(currentNpcs);
    useEffect(() => {
        npcsRef.current = currentNpcs.map(n => ({ ...n }));
    }, [currentNpcs]);

    const activeBuilding = useMemo(
        () => buildings.find(b => b.id === activeBuildingId) || null,
        [buildings, activeBuildingId]
    );

    const solidSet = useMemo(() => {
        const set = new Set<string>();
        if (!activeBuildingId) {
            for (let x = 0; x < STREET_COLS; x++) {
                set.add(`${x},0`);
                if (x < 10 || x > 13) set.add(`${x},${STREET_ROWS - 1}`);
            }
            for (let y = 0; y < STREET_ROWS; y++) {
                set.add(`0,${y}`);
                set.add(`${STREET_COLS - 1},${y}`);
            }
            buildings.forEach(b => {
                for (let y = b.tileY; y < b.tileY + b.tileH; y++) {
                    for (let x = b.tileX; x < b.tileX + b.tileW; x++) {
                        set.add(`${x},${y}`);
                    }
                }
            });
            return set;
        }
        if (activeBuildingId === 'royal_court') {
            for (let x = 0; x < ROYAL_COLS; x++) {
                set.add(`${x},0`);
                set.add(`${x},1`);
                if (x < 9 || x > 12) set.add(`${x},${ROYAL_ROWS - 1}`);
            }
            for (let y = 0; y < ROYAL_ROWS; y++) {
                set.add(`0,${y}`);
                set.add(`${ROYAL_COLS - 1},${y}`);
            }
            // Throne dais & pillars
            for (let x = 9; x <= 12; x++) {
                set.add(`${x},2`);
                set.add(`${x},3`);
            }
            [4, 17].forEach(px => {
                [4, 8, 12].forEach(py => set.add(`${px},${py}`));
            });
            return set;
        }
        // Interior room walls & counter
        for (let x = 0; x < INTERIOR_COLS; x++) {
            set.add(`${x},0`);
            set.add(`${x},1`);
            if (x < 7 || x > 10) set.add(`${x},${INTERIOR_ROWS - 1}`);
        }
        for (let y = 0; y < INTERIOR_ROWS; y++) {
            set.add(`0,${y}`);
            set.add(`${INTERIOR_COLS - 1},${y}`);
        }
        // Counter / Altar in upper center
        for (let x = 6; x <= 11; x++) set.add(`${x},4`);
        if (activeBuildingId === 'memorial') {
            memorialGraves.forEach(g => set.add(`${g.tx},${g.ty}`));
        }
        return set;
    }, [activeBuildingId, buildings, memorialGraves]);

    const openServiceModal = useCallback(
        (id: BuildingId) => {
            setSelectedNpc(null);
            if (id === 'general_shop') setActiveShop('General');
            else if (id === 'weapon_shop') setActiveShop('Weapon');
            else if (id === 'armor_shop') setActiveShop('Armor');
            else if (id === 'auction_house') {
                const currentYearMonth = character.currentDate?.substring(0, 7);
                if (character.lastAuctionDate === currentYearMonth) {
                    setResultData({
                        type: 'info',
                        title: '경매장 이용 불가',
                        message: '이번 달은 이미 경매장을 이용하셨습니다. 다음 달에 다시 방문해주세요.',
                        items: [{ label: '가능 시기', after: '다음 달' }]
                    });
                    return;
                }
                setIsAuctionOpen(true);
            } else if (id === 'inn') setIsInnOpen(true);
            else if (id === 'back_alley') setIsBackAlleyOpen(true);
            else if (id === 'prophet_savas') setIsProphetOpen(true);
            else if (id === 'memorial') setIsCondolenceOpen(true);
        },
        [character.currentDate, character.lastAuctionDate]
    );

    const openNpcAction = useCallback(
        (npc: DistrictNpcNode) => {
            setSelectedNpc(null);
            if (npc.opensKingMeeting) {
                setIsKingMeetingOpen(true);
                return;
            }
            if (npc.opensBlackMarket) {
                setIsBlackMarketOpen(true);
                return;
            }
            if (npc.serviceBuildingId === 'inn') {
                setInnSection(npc.innSection || 'lodging');
                setIsInnOpen(true);
                return;
            }
            if (npc.serviceBuildingId) {
                openServiceModal(npc.serviceBuildingId);
            }
        },
        [openServiceModal]
    );

    const playerRef = useRef({
        x: (district === 'RoyalCourt' ? 10.5 : 12) * CITY_TILE_SIZE,
        y: (district === 'RoyalCourt' ? 13.8 : 11) * CITY_TILE_SIZE,
        dir: 'up' as SpriteDirection,
        moving: false,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const savedStreetPosRef = useRef<{ x: number; y: number } | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const dpadRef = useRef<SpriteDirection | null>(null);
    const cameraRef = useRef({ x: 0, y: 0 });
    const exitCooldownRef = useRef<number>(Date.now() + 700);

    const enterBuilding = useCallback(
        (id: BuildingId) => {
            setSelectedNpc(null);
            if (district === 'Commercial' && !commercialOpState.isOpen) {
                setIsFacilityClosedOpen(true);
                return;
            }
            savedStreetPosRef.current = { x: playerRef.current.x, y: playerRef.current.y };
            playerRef.current.x = 8.5 * CITY_TILE_SIZE;
            playerRef.current.y = 9.8 * CITY_TILE_SIZE;
            playerRef.current.dir = 'up';
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;
            exitCooldownRef.current = Date.now() + 650;
            setActiveBuildingId(id);
        },
        [district, commercialOpState.isOpen]
    );

    const exitBuildingToStreet = useCallback(() => {
        if (district === 'RoyalCourt') {
            onExitToCity();
            return;
        }
        setSelectedNpc(null);
        setSelectedGrave(null);
        setActiveBuildingId(null);
        if (savedStreetPosRef.current) {
            playerRef.current.x = savedStreetPosRef.current.x;
            playerRef.current.y = savedStreetPosRef.current.y + 12;
        } else {
            playerRef.current.x = 12 * CITY_TILE_SIZE;
            playerRef.current.y = 10 * CITY_TILE_SIZE;
        }
        playerRef.current.dir = 'down';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 650;
    }, [district, onExitToCity]);

    const getShopDisplayItems = useCallback(() => {
        if (!activeShop) return [];
        const baseItems =
            activeShop === 'General'
                ? SHOP_INVENTORY[tier].general
                : activeShop === 'Weapon'
                    ? SHOP_INVENTORY[tier].weapon
                    : SHOP_INVENTORY[tier].armor;

        const dynamicItems = [...baseItems];
        if (activeShop === 'General') {
            dynamicItems.push(getCityScroll(nation, city));
        }
        const nationItems = NATION_SPECIFIC_ITEMS[nation] || [];
        let filteredNationItems: Item[] = [];
        if (activeShop === 'General') {
            filteredNationItems = nationItems.filter(i => i.type === 'Consumable' || i.type === 'Etc');
        } else if (activeShop === 'Weapon') {
            filteredNationItems = nationItems.filter(i => i.type === 'Weapon' || i.type === 'SubWeapon');
        } else if (activeShop === 'Armor') {
            filteredNationItems = nationItems.filter(i => ['Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(i.type));
        }

        return [...dynamicItems, ...filteredNationItems].map(item => {
            const stockKey = `${item.name}_${city}_${activeShop}`;
            if (character.shopStock && character.shopStock[stockKey] !== undefined) {
                return { ...item, stock: character.shopStock[stockKey] };
            }
            return item;
        });
    }, [activeShop, tier, nation, city, character.shopStock]);

    const handleBuyItem = (item: Item, unitPrice: number, quantity: number = 1) => {
        const totalCost = unitPrice * quantity;
        if (character.money < totalCost) {
            setResultData({
                type: 'warning',
                title: '구매 실패',
                message: '골드가 부족합니다.',
                items: [{ label: '필요 골드', after: `${totalCost.toLocaleString()} G` }]
            });
            return;
        }
        const newShopStock = { ...(character.shopStock || {}) };
        if (item.stock !== undefined) {
            const stockKey = `${item.name}_${city}_${activeShop}`;
            newShopStock[stockKey] = Math.max(0, (character.shopStock?.[stockKey] ?? item.stock) - quantity);
        }
        onUpdateCharacter(
            {
                ...character,
                money: character.money - totalCost,
                inventory: [...character.inventory, ...Array(quantity).fill(item)],
                shopStock: newShopStock
            },
            `[상점 구매] ${item.name} x${quantity} 구매 (-${totalCost.toLocaleString()}G)`
        );
    };

    const handleSellItem = (itemIndices: number[], unitPrice: number, quantity: number = 1) => {
        if (!itemIndices || itemIndices.length === 0) return;
        const item = character.inventory[itemIndices[0]];
        if (!item) return;
        const totalEarned = unitPrice * quantity;
        const newInventory = character.inventory.filter((_, idx) => !itemIndices.includes(idx));
        onUpdateCharacter(
            {
                ...character,
                money: character.money + totalEarned,
                inventory: newInventory
            },
            `[상점 판매] ${item.name} x${quantity} 판매 완료 (+${totalEarned.toLocaleString()} G)`
        );
    };

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        currentNpcs.forEach(n => loadRpgSpriteImage(n.spriteUrl));
        (['ground', 'road', 'plaza', 'wall'] as TerrainTilePart[]).forEach(p => {
            loadCityAssetImage(getTerrainTileUrl(cultureKey, p));
        });
        buildings.forEach(b => loadCityAssetImage(getInteriorPropSpriteUrl(`district_${b.id}`)));
        [
            'interior_tavern_bar',
            'interior_tavern_table',
            'interior_alley_crates',
            'interior_wanted_board',
            'interior_crystal_table',
            'interior_astrolabe',
            'interior_memorial_altar',
            'interior_gravestone',
            'interior_potion_shelf',
            'interior_shop_counter',
            'interior_weapon_rack',
            'interior_anvil_brazier',
            'interior_armor_stand',
            'interior_velvet_display',
            'interior_auction_podium',
            'interior_auction_bench',
            'interior_tile_wood',
            'interior_tile_slate',
            'interior_tile_crimson_carpet',
            'interior_tile_cobble',
            'interior_tile_starry_carpet',
            'interior_tile_marble',
            'interior_tile_wood_wall',
            'interior_tile_stone_wall',
            'royal_throne_imperial',
            'royal_throne_asia',
            'royal_throne_desert',
            'royal_throne_elf',
            'royal_throne_beast',
            'royal_pillar',
            'royal_brazier',
            'royal_heraldic_stand',
            'royal_tile_marble',
            'royal_tile_carpet',
            'royal_tile_asia_floor',
            'royal_tile_desert_floor',
            'royal_tile_elf_floor',
            'royal_tile_beast_floor',
            'royal_tile_wall',
            'royal_tile_asia_wall'
        ].forEach(k => loadCityAssetImage(getInteriorPropSpriteUrl(k)));
    }, [playerSpriteUrl, currentNpcs, cultureKey, buildings]);

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

    const findNearestInteractable = useCallback(() => {
        const p = playerRef.current;
        for (const n of npcsRef.current) {
            if (Math.hypot(n.px - p.x, n.py - p.y) <= CITY_TILE_SIZE * 1.65) {
                return { kind: 'npc' as const, npc: n };
            }
        }
        if (!activeBuildingId) {
            for (const b of buildings) {
                const bx = (b.tileX + b.tileW / 2) * CITY_TILE_SIZE;
                const by = (b.tileY + b.tileH) * CITY_TILE_SIZE;
                if (Math.hypot(bx - p.x, by - p.y) <= CITY_TILE_SIZE * 1.9) {
                    return { kind: 'building' as const, building: b };
                }
            }
        } else if (activeBuildingId === 'memorial') {
            for (const g of memorialGraves) {
                const gx = (g.tx + 0.5) * CITY_TILE_SIZE;
                const gy = (g.ty + 0.5) * CITY_TILE_SIZE;
                if (Math.hypot(gx - p.x, gy - p.y) <= CITY_TILE_SIZE * 1.6) {
                    return { kind: 'grave' as const, grave: g };
                }
            }
        } else if (activeBuildingId === 'inn') {
            const tx = 14.1 * CITY_TILE_SIZE;
            const ty = 8.9 * CITY_TILE_SIZE;
            if (Math.hypot(tx - p.x, ty - p.y) <= CITY_TILE_SIZE * 1.8) {
                return { kind: 'inn_drink' as const };
            }
        } else if (activeBuildingId === 'back_alley' && nightMarketOpen) {
            const nx = 14.5 * CITY_TILE_SIZE;
            const ny = 4.2 * CITY_TILE_SIZE;
            if (Math.hypot(nx - p.x, ny - p.y) <= CITY_TILE_SIZE * 1.8) {
                return { kind: 'night_market' as const };
            }
        }
        return null;
    }, [buildings, activeBuildingId, memorialGraves, nightMarketOpen]);

    const handleInteract = useCallback(() => {
        const target = findNearestInteractable();
        if (!target) return;
        if (target.kind === 'npc') {
            setSelectedGrave(null);
            setSelectedNpc(target.npc);
        } else if (target.kind === 'grave') {
            setSelectedNpc(null);
            setSelectedGrave(target.grave);
        } else if (target.kind === 'inn_drink') {
            setSelectedNpc(null);
            setInnSection('drink');
            setIsInnOpen(true);
        } else if (target.kind === 'night_market') {
            setSelectedNpc(null);
            setIsBlackMarketOpen(true);
        } else enterBuilding(target.building.id);
    }, [findNearestInteractable, enterBuilding]);

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
                if (selectedNpc) setSelectedNpc(null);
                else if (activeBuildingId) exitBuildingToStreet();
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
    }, [handleInteract, onExitToCity, exitBuildingToStreet, activeBuildingId, selectedNpc]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cols = activeBuildingId === 'royal_court' ? ROYAL_COLS : activeBuildingId ? INTERIOR_COLS : STREET_COLS;
        const rows = activeBuildingId === 'royal_court' ? ROYAL_ROWS : activeBuildingId ? INTERIOR_ROWS : STREET_ROWS;
        const mapW = cols * CITY_TILE_SIZE;
        const mapH = rows * CITY_TILE_SIZE;
        const offsetX = mapW < viewportSize.w ? Math.floor((viewportSize.w - mapW) / 2) : -cameraRef.current.x;
        const offsetY = mapH < viewportSize.h ? Math.floor((viewportSize.h - mapH) / 2) : -cameraRef.current.y;
        const wx = e.clientX - rect.left - offsetX;
        const wy = e.clientY - rect.top - offsetY;

        for (const n of npcsRef.current) {
            if (Math.hypot(wx - n.px, wy - (n.py - 14)) <= 28) {
                setSelectedNpc(n);
                return;
            }
        }
        if (!activeBuildingId) {
            for (const b of buildings) {
                const fx = b.tileX * CITY_TILE_SIZE;
                const fy = b.tileY * CITY_TILE_SIZE;
                const fw = b.tileW * CITY_TILE_SIZE;
                const fh = b.tileH * CITY_TILE_SIZE;
                if (wx >= fx && wx <= fx + fw && wy >= fy - 16 && wy <= fy + fh) {
                    enterBuilding(b.id);
                    return;
                }
            }
            if (wx >= 10 * CITY_TILE_SIZE && wx <= 14 * CITY_TILE_SIZE && wy >= (STREET_ROWS - 1) * CITY_TILE_SIZE - 12) {
                onExitToCity();
                return;
            }
        } else {
            if (activeBuildingId === 'memorial') {
                for (const g of memorialGraves) {
                    const gx = (g.tx + 0.5) * CITY_TILE_SIZE;
                    const gy = (g.ty + 0.5) * CITY_TILE_SIZE;
                    if (Math.hypot(wx - gx, wy - gy) <= 28) {
                        setSelectedNpc(null);
                        setSelectedGrave(g);
                        return;
                    }
                }
            }
            if (activeBuildingId === 'inn') {
                const tx = 14.1 * CITY_TILE_SIZE;
                const ty = 8.9 * CITY_TILE_SIZE;
                if (Math.hypot(wx - tx, wy - ty) <= 44) {
                    setSelectedNpc(null);
                    setInnSection('drink');
                    setIsInnOpen(true);
                    return;
                }
            }
            if (activeBuildingId === 'back_alley' && nightMarketOpen) {
                const nx = 14.5 * CITY_TILE_SIZE;
                const ny = 4.2 * CITY_TILE_SIZE;
                if (Math.hypot(wx - nx, wy - ny) <= 44) {
                    setSelectedNpc(null);
                    setIsBlackMarketOpen(true);
                    return;
                }
            }
            // Clicking counter/throne opens primary service NPC
            const counterMinX = activeBuildingId === 'royal_court' ? 8 * CITY_TILE_SIZE : 6 * CITY_TILE_SIZE;
            const counterMaxX = activeBuildingId === 'royal_court' ? 14 * CITY_TILE_SIZE : 12 * CITY_TILE_SIZE;
            if (wx >= counterMinX && wx <= counterMaxX && wy >= 2.0 * CITY_TILE_SIZE && wy <= 5.2 * CITY_TILE_SIZE) {
                const host = npcsRef.current.find(n => n.serviceBuildingId || n.opensKingMeeting);
                if (host) {
                    setSelectedGrave(null);
                    setSelectedNpc(host);
                    return;
                }
            }
            const exitMinX = activeBuildingId === 'royal_court' ? 9 * CITY_TILE_SIZE : 7 * CITY_TILE_SIZE;
            const exitMaxX = activeBuildingId === 'royal_court' ? 13 * CITY_TILE_SIZE : 11 * CITY_TILE_SIZE;
            if (wx >= exitMinX && wx <= exitMaxX && wy >= (rows - 1) * CITY_TILE_SIZE - 12) {
                exitBuildingToStreet();
                return;
            }
        }
        setSelectedNpc(null);
        setSelectedGrave(null);
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;
        playerRef.current.targetX = wx;
        playerRef.current.targetY = wy;
    };

    useEffect(() => {
        let rafId = 0;
        let lastTs = performance.now();
        let labelTick = 0;

        const cols = activeBuildingId === 'royal_court' ? ROYAL_COLS : activeBuildingId ? INTERIOR_COLS : STREET_COLS;
        const rows = activeBuildingId === 'royal_court' ? ROYAL_ROWS : activeBuildingId ? INTERIOR_ROWS : STREET_ROWS;

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
            if (Date.now() > exitCooldownRef.current && pty >= rows - 1) {
                if (!activeBuildingId && ptx >= 10 && ptx <= 13) {
                    onExitToCity();
                    return;
                }
                if (activeBuildingId === 'royal_court' && ptx >= 9 && ptx <= 12) {
                    exitBuildingToStreet();
                    return;
                }
                if (activeBuildingId && activeBuildingId !== 'royal_court' && ptx >= 7 && ptx <= 10) {
                    exitBuildingToStreet();
                    return;
                }
            }

            npcsRef.current.forEach(n => {
                if (n.stationary) return;
                n.wanderTimer -= dt;
                if (n.targetPx !== null && n.targetPy !== null) {
                    const dx = n.targetPx - n.px;
                    const dy = n.targetPy - n.py;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 4) {
                        n.targetPx = null;
                        n.targetPy = null;
                        n.walkFrame = 1;
                    } else {
                        const nx = n.px + (dx / dist) * 38 * dt;
                        const ny = n.py + (dy / dist) * 38 * dt;
                        if (!isBlocked(nx, ny)) {
                            n.px = nx;
                            n.py = ny;
                        } else {
                            n.targetPx = null;
                            n.targetPy = null;
                        }
                        n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                        n.animTimer += dt;
                        if (n.animTimer >= 0.22) {
                            n.animTimer = 0;
                            n.walkFrame = (n.walkFrame + 1) % 3;
                        }
                    }
                } else if (n.wanderTimer <= 0) {
                    n.wanderTimer = 2.5 + Math.random() * 3.5;
                    const a = Math.random() * Math.PI * 2;
                    const r = 20 + Math.random() * 36;
                    n.targetPx = n.homePx + Math.cos(a) * r;
                    n.targetPy = n.homePy + Math.sin(a) * r;
                }
            });

            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                const near = findNearestInteractable();
                setNearbyLabel(
                    near
                        ? near.kind === 'npc'
                            ? `${near.npc.name} (${near.npc.role})`
                            : near.kind === 'grave'
                                ? `🪦 ${near.grave.name}`
                                : near.kind === 'inn_drink'
                                    ? '🍻 동료와 한잔 기울이기 (빈 테이블)'
                                    : near.kind === 'night_market'
                                        ? '🌙 심야 암시장 입장'
                                        : `${near.building.icon} ${near.building.label}`
                        : null
                );
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
                const plazaImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'plaza'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));

                if (!activeBuildingId) {
                    // Street Tiles
                    for (let r = 0; r < STREET_ROWS; r++) {
                        for (let c = 0; c < STREET_COLS; c++) {
                            const x = c * CITY_TILE_SIZE;
                            const y = r * CITY_TILE_SIZE;
                            const isGate = r === STREET_ROWS - 1 && c >= 10 && c <= 13;
                            const isWall = r === 0 || c === 0 || c === STREET_COLS - 1 || (r === STREET_ROWS - 1 && !isGate);
                            if (isWall) {
                                if (wallImg?.complete && wallImg.naturalWidth > 0) ctx.drawImage(wallImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                                else {
                                    ctx.fillStyle = '#334155';
                                    ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                                }
                                continue;
                            }
                            const isRoad = r >= 6 && r <= 8;
                            const isPlaza = c >= 10 && c <= 13 && r >= 6;
                            const tileImg = isPlaza ? plazaImg : isRoad ? roadImg : groundImg;
                            if (tileImg?.complete && tileImg.naturalWidth > 0) {
                                ctx.drawImage(tileImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            } else {
                                ctx.fillStyle = isRoad ? '#64748b' : '#3f6212';
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                            if (isGate) {
                                ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                        }
                    }

                    // Street Buildings
                    buildings.forEach(b => {
                        const bx = b.tileX * CITY_TILE_SIZE;
                        const by = b.tileY * CITY_TILE_SIZE;
                        const bw = b.tileW * CITY_TILE_SIZE;
                        const bh = b.tileH * CITY_TILE_SIZE;
                        const customPng = getCachedCityAssetImage(getInteriorPropSpriteUrl(`district_${b.id}`));
                        if (customPng && customPng.complete && customPng.naturalWidth > 0) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'low';
                            ctx.drawImage(customPng, bx - 6, by - 14, bw + 12, bh + 18);
                        } else {
                            ctx.fillStyle = b.wallColor;
                            ctx.fillRect(bx + 4, by + 28, bw - 8, bh - 32);
                            ctx.fillStyle = b.roofColor;
                            ctx.fillRect(bx, by, bw, 32);
                        }
                        const isClosed = district === 'Commercial' && !commercialOpState.isOpen;
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        const title = isClosed ? `🔒 ${b.label} (마감)` : `${b.icon} ${b.label}`;
                        const tw = Math.max(82, ctx.measureText(title).width + 14);
                        ctx.fillStyle = isClosed ? 'rgba(69, 10, 10, 0.92)' : 'rgba(15, 23, 42, 0.92)';
                        ctx.fillRect(bx + bw / 2 - tw / 2, by - 22, tw, 18);
                        ctx.strokeStyle = isClosed ? '#ef4444' : b.accentColor;
                        ctx.lineWidth = 1.2;
                        ctx.strokeRect(bx + bw / 2 - tw / 2, by - 22, tw, 18);
                        ctx.fillStyle = isClosed ? '#fecaca' : '#fef3c7';
                        ctx.fillText(title, bx + bw / 2, by - 9);
                    });

                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.fillRect(12 * CITY_TILE_SIZE - 56, (STREET_ROWS - 1) * CITY_TILE_SIZE - 20, 112, 18);
                    ctx.fillStyle = '#fde047';
                    ctx.fillText('🚪 도시 광장 출구', 12 * CITY_TILE_SIZE, (STREET_ROWS - 1) * CITY_TILE_SIZE - 7);
                } else {
                    // Building Interior Tiles (using d3 seamless floor/wall PNGs)
                    const isDarkInterior = activeBuildingId === 'back_alley' || activeBuildingId === 'prophet_savas';
                    const floorA = isDarkInterior ? '#1e1b2e' : activeBuildingId === 'memorial' ? '#cbd5e1' : '#78350f';
                    const floorB = isDarkInterior ? '#27233a' : activeBuildingId === 'memorial' ? '#94a3b8' : '#92400e';
                    const wallClr = isDarkInterior ? '#0f172a' : activeBuildingId === 'memorial' ? '#475569' : '#451a03';

                    const isRoyal = activeBuildingId === 'royal_court';
                    const isAsiaCulture = cultureKey === 'korea' || cultureKey === 'japan' || cultureKey === 'china' || cultureKey === 'asia';
                    const isDesertCulture = cultureKey === 'middle_east' || cultureKey === 'africa' || cultureKey === 'desert';
                    const isElfCulture = cultureKey === 'sylvanar';
                    const isBeastCulture = cultureKey === 'feraldia';

                    const floorTileKey = isRoyal
                        ? isAsiaCulture
                            ? 'royal_tile_asia_floor'
                            : isDesertCulture
                                ? 'royal_tile_desert_floor'
                                : isElfCulture
                                    ? 'royal_tile_elf_floor'
                                    : isBeastCulture
                                        ? 'royal_tile_beast_floor'
                                        : 'royal_tile_marble'
                        : activeBuildingId === 'general_shop' || activeBuildingId === 'inn'
                            ? 'interior_tile_wood'
                            : activeBuildingId === 'weapon_shop' || activeBuildingId === 'armor_shop'
                                ? 'interior_tile_slate'
                                : activeBuildingId === 'auction_house'
                                    ? 'interior_tile_crimson_carpet'
                                    : activeBuildingId === 'back_alley'
                                        ? 'interior_tile_cobble'
                                        : activeBuildingId === 'prophet_savas'
                                            ? 'interior_tile_starry_carpet'
                                            : 'interior_tile_marble';
                    const wallTileKey = isRoyal
                        ? isAsiaCulture
                            ? 'royal_tile_asia_wall'
                            : 'royal_tile_wall'
                        : activeBuildingId === 'back_alley' || activeBuildingId === 'prophet_savas' || activeBuildingId === 'memorial'
                            ? 'interior_tile_stone_wall'
                            : 'interior_tile_wood_wall';
                    const floorTileImg = getCachedCityAssetImage(getInteriorPropSpriteUrl(floorTileKey));
                    const wallTileImg = getCachedCityAssetImage(getInteriorPropSpriteUrl(wallTileKey));
                    const royalCarpetImg = isRoyal ? getCachedCityAssetImage(getInteriorPropSpriteUrl('royal_tile_carpet')) : null;

                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const x = c * CITY_TILE_SIZE;
                            const y = r * CITY_TILE_SIZE;
                            const isExit = isRoyal
                                ? r === rows - 1 && c >= 9 && c <= 12
                                : r === rows - 1 && c >= 7 && c <= 10;
                            const isWall = r <= 1 || c === 0 || c === cols - 1 || (r === rows - 1 && !isExit);
                            if (isWall) {
                                if (wallTileImg?.complete && wallTileImg.naturalWidth > 0) {
                                    ctx.drawImage(wallTileImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                                } else {
                                    ctx.fillStyle = wallClr;
                                    ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                                }
                                continue;
                            }
                            const isRoyalCarpet = isRoyal && c >= 9 && c <= 12 && r >= 4;
                            if (isRoyalCarpet && royalCarpetImg?.complete && royalCarpetImg.naturalWidth > 0) {
                                ctx.drawImage(royalCarpetImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            } else if (floorTileImg?.complete && floorTileImg.naturalWidth > 0) {
                                ctx.drawImage(floorTileImg, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            } else {
                                ctx.fillStyle = (r + c) % 2 === 0 ? floorA : floorB;
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                            if (isExit) {
                                ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                        }
                    }

                    // Carpet runner to exit (non-royal)
                    if (!isRoyal) {
                        ctx.fillStyle = activeBuilding?.accentColor ? `${activeBuilding.accentColor}33` : 'rgba(251, 191, 36, 0.2)';
                        ctx.fillRect(7.5 * CITY_TILE_SIZE, 5 * CITY_TILE_SIZE, 3 * CITY_TILE_SIZE, 6 * CITY_TILE_SIZE);
                    }

                    // Themed Interior Decorations & Props (d1/d2 PNGs with fallback)
                    const ts = CITY_TILE_SIZE;
                    const drawPropSprite = (propKey: string, tx: number, ty: number, wTiles: number, hTiles: number, bg: string, border: string, icon: string) => {
                        const px = tx * ts;
                        const py = ty * ts;
                        const pw = wTiles * ts;
                        const ph = hTiles * ts;
                        const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(propKey));
                        if (img && img.complete && img.naturalWidth > 0) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'low';
                            const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                            const dw = img.naturalWidth * scale;
                            const dh = img.naturalHeight * scale;
                            ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                            return;
                        }
                        ctx.fillStyle = 'rgba(0,0,0,0.28)';
                        ctx.fillRect(px + 4, py + ph - 4, pw - 6, 8);
                        ctx.fillStyle = bg;
                        ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
                        ctx.strokeStyle = border;
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
                        ctx.font = '18px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(icon, px + pw / 2, py + ph / 2 + 6);
                    };

                    // Center Counter / Podium / Bar / Altar / Throne
                    const centerPropKey = isRoyal
                        ? isAsiaCulture
                            ? 'royal_throne_asia'
                            : isDesertCulture
                                ? 'royal_throne_desert'
                                : isElfCulture
                                    ? 'royal_throne_elf'
                                    : isBeastCulture
                                        ? 'royal_throne_beast'
                                        : 'royal_throne_imperial'
                        : activeBuildingId === 'auction_house'
                            ? 'interior_auction_podium'
                            : activeBuildingId === 'inn'
                                ? 'interior_tavern_bar'
                                : activeBuildingId === 'back_alley'
                                    ? 'interior_alley_crates'
                                    : activeBuildingId === 'prophet_savas'
                                        ? 'interior_crystal_table'
                                        : activeBuildingId === 'memorial'
                                            ? 'interior_memorial_altar'
                                            : 'interior_shop_counter';
                    if (isRoyal) {
                        // Raised Royal Dais
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
                        ctx.fillRect(8 * ts, 1.8 * ts, 6 * ts, 2.8 * ts);
                        ctx.strokeStyle = '#fbbf24';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(8 * ts, 1.8 * ts, 6 * ts, 2.8 * ts);
                        drawPropSprite(centerPropKey, 9.2, 1.4, 3.6, 2.8, '#78350f', '#fbbf24', '👑');
                    } else {
                        drawPropSprite(centerPropKey, 7.2, 3.6, 3.6, 1.8, '#451a03', activeBuilding?.accentColor || '#f59e0b', activeBuilding?.icon || '🏪');
                    }

                    if (activeBuildingId === 'general_shop') {
                        drawPropSprite('interior_potion_shelf', 1.8, 1.8, 2.5, 2.2, '#78350f', '#22c55e', '🧪');
                        drawPropSprite('interior_potion_shelf', 13.7, 1.8, 2.5, 2.2, '#78350f', '#22c55e', '📜');
                        drawPropSprite('interior_shop_counter', 2.0, 5.4, 2.2, 1.8, '#92400e', '#fbbf24', '🧺');
                        drawPropSprite('interior_velvet_display', 13.8, 5.4, 2.2, 1.8, '#92400e', '#fbbf24', '🏺');
                    } else if (activeBuildingId === 'weapon_shop') {
                        drawPropSprite('interior_weapon_rack', 1.8, 1.8, 2.5, 2.2, '#334155', '#ef4444', '⚔️');
                        drawPropSprite('interior_weapon_rack', 13.7, 1.8, 2.5, 2.2, '#334155', '#ef4444', '🪓');
                        drawPropSprite('interior_anvil_brazier', 1.8, 5.4, 2.4, 1.9, '#1e293b', '#f97316', '🔨');
                        drawPropSprite('interior_anvil_brazier', 13.8, 5.4, 2.4, 1.9, '#7c2d12', '#fb923c', '🔥');
                    } else if (activeBuildingId === 'armor_shop') {
                        drawPropSprite('interior_armor_stand', 1.9, 1.8, 2.2, 2.3, '#1e3a8a', '#60a5fa', '🛡️');
                        drawPropSprite('interior_armor_stand', 13.9, 1.8, 2.2, 2.3, '#1e3a8a', '#60a5fa', '🪖');
                        drawPropSprite('interior_velvet_display', 1.9, 5.4, 2.4, 1.9, '#312e81', '#93c5fd', '🦺');
                        drawPropSprite('interior_velvet_display', 13.7, 5.4, 2.4, 1.9, '#312e81', '#fde047', '💍');
                    } else if (activeBuildingId === 'auction_house') {
                        drawPropSprite('interior_velvet_display', 1.8, 1.9, 2.4, 2.0, '#581c87', '#f59e0b', '💎');
                        drawPropSprite('interior_velvet_display', 13.8, 1.9, 2.4, 2.0, '#581c87', '#f59e0b', '👑');
                        drawPropSprite('interior_auction_bench', 2.4, 6.0, 3.2, 1.8, '#7f1d1d', '#fbbf24', '🪑');
                        drawPropSprite('interior_auction_bench', 12.4, 6.0, 3.2, 1.8, '#7f1d1d', '#fbbf24', '🪑');
                        drawPropSprite('interior_auction_bench', 2.4, 8.2, 3.2, 1.8, '#7f1d1d', '#fbbf24', '🪑');
                        drawPropSprite('interior_auction_bench', 12.4, 8.2, 3.2, 1.8, '#7f1d1d', '#fbbf24', '🪑');
                    } else if (activeBuildingId === 'inn') {
                        drawPropSprite('interior_tavern_bar', 1.8, 1.8, 2.6, 2.2, '#78350f', '#f59e0b', '🍺');
                        drawPropSprite('interior_alley_crates', 13.6, 2.0, 2.4, 1.9, '#7c2d12', '#fb923c', '🔥');
                        drawPropSprite('interior_tavern_table', 2.4, 5.8, 2.6, 1.9, '#92400e', '#fbbf24', '🍲');
                        drawPropSprite('interior_tavern_table', 12.8, 5.8, 2.6, 1.9, '#92400e', '#fbbf24', '🍻');
                        drawPropSprite('interior_tavern_table', 2.4, 8.0, 2.6, 1.9, '#92400e', '#fbbf24', '🎵');
                        drawPropSprite('interior_tavern_table', 12.8, 8.0, 2.6, 1.9, '#92400e', '#fbbf24', '🍻');
                        // Empty table badge for drinking with companion
                        ctx.font = 'bold 9px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = 'rgba(120, 53, 15, 0.92)';
                        ctx.fillRect(14.1 * ts - 46, 9.8 * ts, 92, 13);
                        ctx.fillStyle = '#fde68a';
                        ctx.fillText('🍻 동료와 한잔 (빈자리)', 14.1 * ts, 9.8 * ts + 10);
                    } else if (activeBuildingId === 'back_alley') {
                        drawPropSprite('interior_wanted_board', 1.8, 1.8, 2.6, 2.3, '#1e293b', '#ef4444', '📜');
                        drawPropSprite('interior_wanted_board', 13.6, 1.8, 2.6, 2.3, '#1e293b', '#ef4444', '🗝️');
                        drawPropSprite('interior_alley_crates', 1.8, 5.6, 2.4, 1.8, '#0f172a', '#dc2626', '📦');
                        drawPropSprite('interior_alley_crates', 13.8, 5.6, 2.4, 1.8, '#0f172a', '#a855f7', '🏮');
                        if (nightMarketOpen) {
                            const nmx = 14.5 * ts;
                            const nmy = 4.2 * ts;
                            const pulse = 0.65 + 0.35 * Math.sin(now * 0.006);
                            ctx.fillStyle = `rgba(168, 85, 247, ${0.35 * pulse})`;
                            ctx.beginPath();
                            ctx.arc(nmx, nmy, 28, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = '#c084fc';
                            ctx.lineWidth = 2.5;
                            ctx.stroke();
                            ctx.font = 'bold 10px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = 'rgba(59, 7, 100, 0.95)';
                            ctx.fillRect(nmx - 48, nmy + 18, 96, 14);
                            ctx.fillStyle = '#e9d5ff';
                            ctx.fillText('🌙 심야 암시장 입구', nmx, nmy + 29);
                        }
                    } else if (activeBuildingId === 'prophet_savas') {
                        drawPropSprite('interior_astrolabe', 1.8, 1.8, 2.4, 2.2, '#312e81', '#818cf8', '🔮');
                        drawPropSprite('interior_astrolabe', 13.8, 1.8, 2.4, 2.2, '#312e81', '#818cf8', '✨');
                        drawPropSprite('interior_crystal_table', 2.4, 5.8, 2.4, 2.0, '#1e1b4b', '#c084fc', '🕯️');
                        drawPropSprite('interior_crystal_table', 13.2, 5.8, 2.4, 2.0, '#1e1b4b', '#c084fc', '🕯️');
                    } else if (activeBuildingId === 'memorial') {
                        drawPropSprite('interior_memorial_altar', 1.8, 1.9, 2.4, 2.0, '#e2e8f0', '#38bdf8', '💐');
                        drawPropSprite('interior_memorial_altar', 13.8, 1.9, 2.4, 2.0, '#e2e8f0', '#38bdf8', '💐');
                        memorialGraves.forEach(g => {
                            const gx = g.tx * ts;
                            const gy = g.ty * ts;
                            drawPropSprite('interior_gravestone', g.tx - 0.15, g.ty - 0.35, 1.3, 1.45, '#94a3b8', g.isKnown ? '#38bdf8' : '#475569', g.isKnown ? '💐' : '🕯️');
                            ctx.font = 'bold 9px sans-serif';
                            ctx.textAlign = 'center';
                            const label = g.isKnown ? `🪦 ${g.name}` : '영령비';
                            const lw = Math.max(40, ctx.measureText(label).width + 8);
                            ctx.fillStyle = g.isKnown ? 'rgba(15, 23, 42, 0.92)' : 'rgba(30, 41, 59, 0.78)';
                            ctx.fillRect(gx + ts / 2 - lw / 2, gy + ts - 2, lw, 12);
                            ctx.fillStyle = g.isKnown ? '#7dd3fc' : '#cbd5e1';
                            ctx.fillText(label, gx + ts / 2, gy + ts + 7);
                        });
                    } else if (activeBuildingId === 'royal_court') {
                        // Grand Royal Court Throne Room Props
                        drawPropSprite('royal_heraldic_stand', 2.0, 2.0, 2.6, 2.5, '#78350f', '#fbbf24', '👑');
                        drawPropSprite('royal_heraldic_stand', 17.4, 2.0, 2.6, 2.5, '#78350f', '#fbbf24', '🛡️');
                        [4.0, 8.0, 12.0].forEach(py => {
                            drawPropSprite('royal_pillar', 4.0, py - 0.8, 1.6, 2.2, '#e2e8f0', '#fbbf24', '🏛️');
                            drawPropSprite('royal_pillar', 16.4, py - 0.8, 1.6, 2.2, '#e2e8f0', '#fbbf24', '🏛️');
                        });
                        [3.2, 6.8, 10.4].forEach(by => {
                            drawPropSprite('royal_brazier', 6.4, by, 1.4, 1.6, '#7c2d12', '#f59e0b', '🔥');
                            drawPropSprite('royal_brazier', 14.2, by, 1.4, 1.6, '#7c2d12', '#f59e0b', '🔥');
                        });
                    }

                    // Exit label
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    const exitCenterX = (isRoyal ? 11 : 9) * CITY_TILE_SIZE;
                    ctx.fillRect(exitCenterX - 56, (rows - 1) * CITY_TILE_SIZE - 20, 112, 18);
                    ctx.fillStyle = '#fde047';
                    ctx.fillText(isRoyal ? '🚪 왕궁 밖으로' : '🚪 거리로 나가기', exitCenterX, (rows - 1) * CITY_TILE_SIZE - 7);
                }

                // Sort & Draw Actors
                const actors = [
                    ...npcsRef.current.map(n => ({ y: n.py, isPlayer: false as const, n })),
                    { y: p.y, isPlayer: true as const, n: null as DistrictNpcNode | null }
                ].sort((a, b) => a.y - b.y);

                actors.forEach(act => {
                    const ax = Math.round(act.isPlayer ? p.x : act.n!.px);
                    const ay = Math.round(act.isPlayer ? p.y : act.n!.py);
                    const dir = act.isPlayer ? p.dir : act.n!.dir;
                    const frame = act.isPlayer ? p.walkFrame : act.n!.walkFrame;
                    const url = act.isPlayer ? playerSpriteUrl : act.n!.spriteUrl;
                    const sheet = getCachedRpgSpriteImage(url);

                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.beginPath();
                    ctx.ellipse(ax, ay + 12, 12, 5, 0, 0, Math.PI * 2);
                    ctx.fill();

                    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
                        const fw = Math.floor(sheet.naturalWidth / 3);
                        const fh = Math.floor(sheet.naturalHeight / 4);
                        const row = DIRECTION_ROW_MAP[dir] ?? 0;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(sheet, frame * fw, row * fh, fw, fh, ax - 20, ay - 30, 40, 44);
                    } else {
                        ctx.fillStyle = act.isPlayer ? '#facc15' : '#38bdf8';
                        ctx.beginPath();
                        ctx.arc(ax, ay - 6, 11, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    const npc = act.n;
                    const label = act.isPlayer
                        ? character.name
                        : npc!.opensKingMeeting
                            ? `👑 ${npc!.name}`
                            : npc!.serviceBuildingId
                                ? `★ ${npc!.name}`
                                : npc!.name;
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const nw = Math.max(44, ctx.measureText(label).width + 10);
                    ctx.fillStyle = act.isPlayer
                        ? 'rgba(180, 83, 9, 0.92)'
                        : npc?.serviceBuildingId
                            ? 'rgba(88, 28, 135, 0.92)'
                            : 'rgba(15, 23, 42, 0.85)';
                    ctx.fillRect(ax - nw / 2, ay + 14, nw, 13);
                    ctx.fillStyle = act.isPlayer ? '#fef08a' : npc?.serviceBuildingId ? '#fde68a' : '#e2e8f0';
                    ctx.fillText(label, ax, ay + 24);
                });

                // Night / Sunset Darkness Overlay + Warm Lantern Glow
                const nightInfo = getNightAlpha(character.currentTime);
                if (nightInfo.isNight) {
                    ctx.fillStyle = `rgba(10, 14, 42, ${activeBuildingId ? Math.max(0.32, nightInfo.alpha - 0.14) : nightInfo.alpha})`;
                    ctx.fillRect(0, 0, mapW, mapH);

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const drawGlow = (gx: number, gy: number, r: number, color: string) => {
                        const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, r);
                        grad.addColorStop(0, color);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(gx, gy, r, 0, Math.PI * 2);
                        ctx.fill();
                    };
                    drawGlow(p.x, p.y - 6, 92, 'rgba(254, 243, 199, 0.25)');
                    if (!activeBuildingId) {
                        buildings.forEach(b => drawGlow((b.tileX + b.tileW / 2) * CITY_TILE_SIZE, (b.tileY + b.tileH) * CITY_TILE_SIZE, 70, 'rgba(251, 191, 36, 0.18)'));
                    } else {
                        drawGlow(9 * CITY_TILE_SIZE, 3.5 * CITY_TILE_SIZE, 110, 'rgba(251, 191, 36, 0.22)');
                    }
                    ctx.restore();
                } else if (nightInfo.isSunset) {
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
        activeBuildingId,
        activeBuilding,
        buildings,
        memorialGraves,
        commercialOpState.isOpen,
        cultureKey,
        district,
        viewportSize,
        playerSpriteUrl,
        character.name,
        character.currentTime,
        solidSet,
        findNearestInteractable,
        onExitToCity,
        exitBuildingToStreet
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
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-xl">
                    <Sparkles size={15} className="text-amber-400 shrink-0" />
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                            {activeBuilding
                                ? `${activeBuilding.icon} ${city} · ${activeBuilding.label} 내부`
                                : `${city} · ${district === 'Commercial' ? '상업지구 거리' : '거주지구 거리'}`}
                            {!activeBuilding && district === 'Commercial' && !commercialOpState.isOpen && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-300">
                                    <Lock size={10} /> 영업 마감
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                            {activeBuilding
                                ? '안쪽 담당 NPC에게 말을 걸어 시설을 이용하세요 (남쪽 문으로 나가기)'
                                : '건물에 들어가거나 지역 주민과 대화해 보세요 [Space]'}
                        </div>
                    </div>
                </div>
                <div className="pointer-events-auto flex items-center gap-1.5">
                    {activeBuilding && district !== 'RoyalCourt' && (
                        <button
                            type="button"
                            onClick={exitBuildingToStreet}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-700/90 hover:bg-indigo-600 border border-indigo-400/50 text-white flex items-center gap-1.5 shadow-lg"
                        >
                            <DoorOpen size={13} /> 거리로 나가기
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

            {nearbyLabel && !selectedNpc && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <button
                        type="button"
                        onClick={handleInteract}
                        className="px-4 py-2 rounded-full bg-slate-950/95 border border-amber-400/70 text-amber-200 text-xs font-black shadow-2xl"
                    >
                        [Space / 터치] {nearbyLabel}
                    </button>
                </div>
            )}

            {/* Mobile D-Pad */}
            <div className="absolute bottom-4 right-4 z-20 md:hidden grid grid-cols-3 gap-1 w-28 h-28 opacity-85">
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

            {/* NPC Dialogue Card */}
            {selectedNpc && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {(() => {
                                const sn = character.socialNetwork?.find(s => s.id === selectedNpc.id || s.name === selectedNpc.name);
                                const cp = character.companions?.find(c => c.id === selectedNpc.id || c.name === selectedNpc.name)
                                    || character.inactiveCompanions?.find(c => c.id === selectedNpc.id || c.name === selectedNpc.name);
                                const cm = character.schoolData?.classmates?.find(c => c.id === selectedNpc.id || c.name === selectedNpc.name)
                                    || character.clubData?.clubMembers?.find(c => c.id === selectedNpc.id || c.name === selectedNpc.name);
                                const teacher = character.schoolData?.homeroomTeacher?.name === selectedNpc.name ? character.schoolData.homeroomTeacher : undefined;
                                const vUrl = (selectedNpc as any).visualUrl || sn?.visualUrl || cp?.visualUrl || cm?.visualUrl || teacher?.visualUrl || generateDefaultVisualUrl(selectedNpc.name, nation, '인간', '남성');
                                return vUrl ? (
                                    <img src={vUrl} alt={selectedNpc.name} className="w-12 h-12 rounded-xl object-cover border border-indigo-400/60 bg-slate-900 shrink-0" />
                                ) : selectedNpc.spriteUrl ? (
                                    <div
                                        className="w-12 h-12 rounded-xl border border-indigo-400/60 bg-slate-900 shrink-0"
                                        style={{ backgroundImage: `url(${selectedNpc.spriteUrl})`, backgroundSize: '300% 400%', backgroundPosition: '50% 0%', imageRendering: 'pixelated' }}
                                    />
                                ) : null;
                            })()}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-black text-white flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-indigo-400" />
                                    {selectedNpc.name}
                                    <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded">
                                        {selectedNpc.role}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-200 mt-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 leading-relaxed">
                                    "{selectedNpc.dialogue}"
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedNpc(null)} className="text-slate-400 hover:text-white p-1 shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        {(selectedNpc.serviceBuildingId || selectedNpc.opensKingMeeting || selectedNpc.opensBlackMarket) && selectedNpc.actionLabel && (
                            <button
                                type="button"
                                onClick={() => openNpcAction(selectedNpc)}
                                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black"
                            >
                                {selectedNpc.actionLabel}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setSelectedNpc(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold ml-auto"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Memorial Gravestone Card */}
            {selectedGrave && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-sky-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>🪦</span>
                                {selectedGrave.name}
                                <span className="text-[11px] font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded">
                                    {selectedGrave.subtitle}
                                </span>
                            </div>
                            <p className="text-xs text-slate-200 mt-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 leading-relaxed">
                                "{selectedGrave.epitaph}"
                            </p>
                        </div>
                        <button type="button" onClick={() => setSelectedGrave(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedGrave(null);
                                setIsCondolenceOpen(true);
                            }}
                            className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
                        >
                            💐 조문 및 헌화하기 (추모원 모달)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedGrave(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Direct District Modals */}
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            <FacilityClosedModal
                isOpen={isFacilityClosedOpen}
                facilityType="Commercial"
                currentTime={character.currentTime}
                onClose={() => setIsFacilityClosedOpen(false)}
            />
            {activeShop && (
                <ShopModal
                    title={activeShop === 'General' ? '잡화점' : activeShop === 'Weapon' ? '무기점' : '방어구점'}
                    items={getShopDisplayItems()}
                    character={character}
                    onBuy={handleBuyItem}
                    onClose={() => setActiveShop(null)}
                    onSell={handleSellItem}
                />
            )}
            {isAuctionOpen && (
                <AuctionModal
                    character={character}
                    onClose={() => setIsAuctionOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isInnOpen && (
                <InnModal
                    character={character}
                    visibleSection={innSection}
                    onClose={() => setIsInnOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isBackAlleyOpen && (
                <BackAlleyModal
                    character={character}
                    onClose={() => setIsBackAlleyOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={onBattle || (() => {})}
                />
            )}
            {isBlackMarketOpen && (
                <BlackMarketModal
                    character={character}
                    onClose={() => setIsBlackMarketOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isProphetOpen && (
                <ProphetModal
                    character={character}
                    onClose={() => setIsProphetOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isCondolenceOpen && (
                <CondolenceModal
                    character={character}
                    currentLocation={{ region, nation, city }}
                    onClose={() => setIsCondolenceOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isKingMeetingOpen && (
                <KingMeetingModal
                    character={character}
                    onClose={() => setIsKingMeetingOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction || (() => {})}
                />
            )}
        </div>
    );
};

export default DistrictRpgCanvas;
