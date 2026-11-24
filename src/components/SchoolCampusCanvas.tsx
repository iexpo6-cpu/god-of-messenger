import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, JobType, SchoolTier } from '../types';
import { SCHOOL_CONFIG } from '../constants';
import {
    getBuildingSpriteUrl,
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    getTerrainTileUrl,
    loadCityAssetImage,
    resolveCityCultureKey
} from '../services/cityAssetManifest';
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
import { CITY_TILE_SIZE } from '../services/cityTilemapEngine';
import SchoolModal, { SchoolZone } from './SchoolModal';
import { ArrowLeft, BookOpen, DoorOpen, GraduationCap, MessageCircle, X } from 'lucide-react';

interface SchoolCampusCanvasProps {
    character: Character;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    onAction?: (action: string, mpCost?: number, stateOverride?: Character) => void;
    onStartBattle?: (enemies: any, type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
}

interface SchoolBuildingSlot {
    tier: SchoolTier;
    spriteKey: 'school_elementary' | 'school_middle' | 'school_high';
    label: string;
    ageLabel: string;
    accentColor: string;
    tx: number;
    ty: number;
    tw: number;
    th: number;
}

interface CampusBuildingGate {
    zone: SchoolZone;
    label: string;
    subLabel: string;
    icon: string;
    roofColor: string;
    accentColor: string;
    tx: number;
    ty: number;
    tw: number;
    th: number;
}

interface SchoolNpcActor {
    id: string;
    name: string;
    role: string;
    tx: number;
    ty: number;
    gender: RpgSpriteGenderKey;
    dialogue: string;
    opensZone?: SchoolZone;
}

interface RoomProp {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
}

const PLAZA_COLS = 28;
const PLAZA_ROWS = 20;
const ROOM_COLS = 18;
const ROOM_ROWS = 13;

export const SchoolCampusCanvas: React.FC<SchoolCampusCanvasProps> = ({
    character,
    region,
    nation,
    city,
    onExitToCity,
    onUpdateCharacter,
    onAction,
    onStartBattle
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState({ w: 960, h: 580 });
    const [activeSchoolTier, setActiveSchoolTier] = useState<SchoolTier | null>(null);
    const [activeRoom, setActiveRoom] = useState<SchoolZone | null>(null);
    const [openModalZone, setOpenModalZone] = useState<SchoolZone | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);
    const [activeDialogue, setActiveDialogue] = useState<{ name: string; role: string; text: string; zone?: SchoolZone } | null>(null);

    const cultureKey = useMemo(() => resolveCityCultureKey(region, nation, city), [region, nation, city]);
    const spriteInfo = useMemo(
        () => resolveEntityRpgSprite(character as any, region, nation),
        [character, region, nation]
    );
    const playerSpriteUrl = spriteInfo.url;

    const isElfNation = nation.includes('미르탈') || region === '실바나르';
    const isBeastNation = nation.includes('레오니스') || region === '페랄디아';
    const isDemonNation = nation.includes('네크로디움') || region === '아비살론' || region === '마계';

    const getSchoolDisplayName = useCallback(
        (tier: SchoolTier) => {
            if (tier === 'High') {
                if (isElfNation) return '세계수 서당 (고급)';
                if (isBeastNation) return '투사의 연무장 (고급)';
                if (isDemonNation) return '제국 흑마법 학술원 (고급)';
            }
            return `${city} ${SCHOOL_CONFIG[tier].name}`;
        },
        [city, isElfNation, isBeastNation, isDemonNation]
    );

    const enrolledTier: SchoolTier | null =
        character.job === JobType.STUDENT && !character.schoolData?.isGraduated
            ? character.schoolData?.tier || 'Elementary'
            : null;

    const instructorQuest = useMemo(() => {
        const allQuests = [
            ...(character.mercenaryData?.activeQuests || []),
            ...(character.militaryData?.activeMissions || [])
        ];
        return allQuests.find(
            q =>
                (q.type === 'MercenaryInstructor' ||
                    q.type === 'MilitaryInstructor' ||
                    q.title?.includes('교관')) &&
                ((q.schoolName && q.schoolName.includes(city)) ||
                    q.targetLocation?.city === city ||
                    (!q.schoolName && !q.targetLocation))
        );
    }, [character.mercenaryData?.activeQuests, character.militaryData?.activeMissions, city]);

    const buildingSlots = useMemo<SchoolBuildingSlot[]>(
        () => [
            {
                tier: 'Elementary',
                spriteKey: 'school_elementary',
                label: getSchoolDisplayName('Elementary'),
                ageLabel: '11~13세 · 기초 학부',
                accentColor: '#4ade80',
                tx: 3,
                ty: 2.5,
                tw: 5,
                th: 5
            },
            {
                tier: 'Middle',
                spriteKey: 'school_middle',
                label: getSchoolDisplayName('Middle'),
                ageLabel: '14~16세 · 중등 학부',
                accentColor: '#38bdf8',
                tx: 11.5,
                ty: 2,
                tw: 5,
                th: 5
            },
            {
                tier: 'High',
                spriteKey: 'school_high',
                label: getSchoolDisplayName('High'),
                ageLabel: '17~19세 · 고급 아카데미',
                accentColor: '#fbbf24',
                tx: 20,
                ty: 2.5,
                tw: 5,
                th: 5
            }
        ],
        [getSchoolDisplayName]
    );

    // Diverse student NPCs outside in the School Plaza!
    const plazaStudents = useMemo<SchoolNpcActor[]>(() => {
        const classmates = character.schoolData?.classmates || [];
        const baseStudents: SchoolNpcActor[] = [
            {
                id: 'stu_elem_1',
                name: classmates[0]?.name || '초급부 한소희',
                role: '초급 레귤러스 1학년',
                tx: 5.5,
                ty: 11.5,
                gender: 'female',
                dialogue: '오늘 첫 실기 수업이라 엄청 떨려요! 기초 검술 자세부터 열심히 연습하고 있어요.'
            },
            {
                id: 'stu_elem_2',
                name: '초급부 김민준',
                role: '초급 레귤러스 3학년',
                tx: 8.5,
                ty: 13.5,
                gender: 'male',
                dialogue: '곧 중급부 진급 시험이 있어요! 도서관에서 기초 마법 이론을 더 보고 가려고요.'
            },
            {
                id: 'stu_mid_1',
                name: classmates[1]?.name || '중급부 박지훈',
                role: '중급 검술부 에이스',
                tx: 12.2,
                ty: 10.5,
                gender: 'male',
                dialogue: '중급부 연무장은 시설이 꽤 좋아요. 대련 상대가 필요하면 언제든 말 걸어주세요!'
            },
            {
                id: 'stu_mid_2',
                name: '중급부 최유진',
                role: '중급 도서부원',
                tx: 16.5,
                ty: 12.8,
                gender: 'female',
                dialogue: '요즘 레귤러스 대도서관에 고대 신력에 관한 희귀 서적이 새로 들어왔대요.'
            },
            {
                id: 'stu_high_1',
                name: classmates[2]?.name || '고급부 이서연',
                role: '고급 아카데미 수석',
                tx: 20.5,
                ty: 11.2,
                gender: 'female',
                dialogue: '고급 레귤러스에서는 졸업 후 기사단이나 용병 길드로 바로 진출할 수 있는 실전 과정을 배웁니다.'
            },
            {
                id: 'stu_high_2',
                name: '고급부 강태오',
                role: '고급부 학생회장',
                tx: 22.8,
                ty: 14.0,
                gender: 'male',
                dialogue: `${city} 레귤러스 학교 지구에 오신 걸 환영합니다. 각 학부 건물은 재학생과 파견 교관만 출입할 수 있습니다.`
            }
        ];
        return baseStudents;
    }, [character.schoolData?.classmates, city]);

    const campusDims = useMemo(() => {
        if (activeRoom) return { cols: ROOM_COLS, rows: ROOM_ROWS };
        if (!activeSchoolTier) return { cols: PLAZA_COLS, rows: PLAZA_ROWS };
        if (activeSchoolTier === 'Elementary') return { cols: 26, rows: 18 };
        if (activeSchoolTier === 'Middle') return { cols: 30, rows: 20 };
        return { cols: 34, rows: 22 };
    }, [activeSchoolTier, activeRoom]);

    // Level 2: 6 separate campus building gates
    const campusBuildings = useMemo<CampusBuildingGate[]>(() => {
        if (!activeSchoolTier || activeRoom) return [];
        const c = campusDims.cols;
        const r = campusDims.rows;
        return [
            { zone: 'Office', label: '교무실', subLabel: '담임 면담·시험·진급', icon: '📋', roofColor: '#4338ca', accentColor: '#818cf8', tx: 3, ty: 2.5, tw: 4.5, th: 3.5 },
            { zone: 'Classroom', label: '강의실', subLabel: '정규 수업·특강', icon: '🏫', roofColor: '#0369a1', accentColor: '#38bdf8', tx: Math.floor(c / 2) - 2, ty: 2.5, tw: 4.5, th: 3.5 },
            { zone: 'Library', label: '대도서관', subLabel: '고대 서적·지식 습득', icon: '📚', roofColor: '#6d28d9', accentColor: '#c084fc', tx: c - 7.5, ty: 2.5, tw: 4.5, th: 3.5 },
            { zone: 'Training', label: '실전 연무장', subLabel: '무예·마법 수련 및 대련', icon: '⚔️', roofColor: '#b91c1c', accentColor: '#f87171', tx: 3, ty: Math.floor(r * 0.56), tw: 4.5, th: 3.5 },
            { zone: 'Club', label: '동아리동', subLabel: '동아리 활동·학우 교류', icon: '🎭', roofColor: '#047857', accentColor: '#34d399', tx: Math.floor(c / 2) - 2, ty: Math.floor(r * 0.56), tw: 4.5, th: 3.5 },
            { zone: 'Dormitory', label: '학생 기숙사', subLabel: '기숙사 휴식·생활', icon: '🛏️', roofColor: '#b45309', accentColor: '#fbbf24', tx: c - 7.5, ty: Math.floor(r * 0.56), tw: 4.5, th: 3.5 }
        ];
    }, [activeSchoolTier, activeRoom, campusDims]);

    // Level 3: Room interior props & NPCs
    const roomContent = useMemo<{ props: RoomProp[]; npcs: SchoolNpcActor[] }>(() => {
        if (!activeRoom) return { props: [], npcs: [] };
        const teacherName = character.schoolData?.homeroomTeacher?.name || '담임 교사';
        const c1 = character.schoolData?.classmates?.[0]?.name || '모범생 하은';
        const c2 = character.schoolData?.classmates?.[1]?.name || '동기 준혁';
        switch (activeRoom) {
            case 'Office':
                return {
                    props: [
                        { key: 'bookshelf', tx: 2, ty: 1.8, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 14, ty: 1.8, w: 2, h: 2 },
                        { key: 'desk', tx: 8, ty: 3.2, w: 2, h: 1.8 },
                        { key: 'table', tx: 4, ty: 7, w: 2, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_teacher', name: teacherName, role: '담임 교사', tx: 9, ty: 2.7, gender: 'female', dialogue: '학업·승급 시험 및 학사 관리는 언제든 문의하세요.', opensZone: 'Office' },
                        { id: 'npc_vice', name: '학사 행정관', role: '교무처', tx: 5, ty: 6.5, gender: 'male', dialogue: '이번 달 성적표와 출석 현황이 모두 정리되어 있습니다.' }
                    ]
                };
            case 'Classroom':
                return {
                    props: [
                        { key: 'desk', tx: 8, ty: 2.2, w: 2, h: 1.8 },
                        { key: 'school_desk', tx: 4, ty: 5.5, w: 1.6, h: 1.6 },
                        { key: 'school_desk', tx: 8, ty: 5.5, w: 1.6, h: 1.6 },
                        { key: 'school_desk', tx: 12, ty: 5.5, w: 1.6, h: 1.6 },
                        { key: 'school_desk', tx: 4, ty: 8.2, w: 1.6, h: 1.6 },
                        { key: 'school_desk', tx: 8, ty: 8.2, w: 1.6, h: 1.6 },
                        { key: 'school_desk', tx: 12, ty: 8.2, w: 1.6, h: 1.6 }
                    ],
                    npcs: [
                        { id: 'npc_lect', name: teacherName, role: '강의 교관', tx: 9, ty: 1.8, gender: 'female', dialogue: '수업을 시작할 준비가 되었나요? 자리에 앉아 수업을 들으세요.', opensZone: 'Classroom' },
                        { id: 'npc_stu1', name: c1, role: '같은 반 학우', tx: 5, ty: 5.0, gender: 'female', dialogue: '오늘 필기 엄청 중요하대요! 집중해서 같이 들어요.' },
                        { id: 'npc_stu2', name: c2, role: '같은 반 학우', tx: 13, ty: 7.8, gender: 'male', dialogue: '수업 끝나고 연무장에서 한 판 붙어볼래?' }
                    ]
                };
            case 'Library':
                return {
                    props: [
                        { key: 'bookshelf', tx: 2.5, ty: 2, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 6, ty: 2, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 10, ty: 2, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 13.5, ty: 2, w: 2, h: 2 },
                        { key: 'table', tx: 5, ty: 6.8, w: 2.2, h: 1.8 },
                        { key: 'table', tx: 11, ty: 6.8, w: 2.2, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_lib', name: '수석 사서', role: '대도서관 관리자', tx: 9, ty: 4.2, gender: 'female', dialogue: '열람하고 싶은 마법·역사·전술 서적이 있다면 말씀하세요.', opensZone: 'Library' },
                        { id: 'npc_reader', name: '독서 중인 선배', role: '도서부', tx: 6, ty: 6.2, gender: 'male', dialogue: '조용히 독서하면 지혜와 마력 운용 감각이 눈에 띄게 자랍니다.' }
                    ]
                };
            case 'Training':
                return {
                    props: [
                        { key: 'training_dummy', tx: 4, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'training_dummy', tx: 9, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'training_dummy', tx: 13, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'training_dummy', tx: 4, ty: 7, w: 1.8, h: 1.8 },
                        { key: 'training_dummy', tx: 13, ty: 7, w: 1.8, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_trainer', name: '수석 무술 교관', role: '연무장 교관', tx: 9, ty: 5.5, gender: 'male', dialogue: '실전 수련과 대련을 시작하려면 말을 걸어라!', opensZone: 'Training' },
                        { id: 'npc_spar', name: '수련 중인 생도', role: '무술부', tx: 5, ty: 6.5, gender: 'female', dialogue: '오늘도 기초 체력과 무기 숙련도를 100회씩 단련하는 중이에요!' }
                    ]
                };
            case 'Club':
                return {
                    props: [
                        { key: 'table', tx: 4, ty: 3.5, w: 2.2, h: 1.8 },
                        { key: 'table', tx: 11.5, ty: 3.5, w: 2.2, h: 1.8 },
                        { key: 'bookshelf', tx: 2, ty: 1.8, w: 2, h: 2 },
                        { key: 'desk', tx: 8, ty: 7, w: 2, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_club', name: '동아리 부장', role: '학생 동아리', tx: 9, ty: 4.5, gender: 'female', dialogue: '우리 동아리에 온 걸 환영해! 함께 다양한 활동을 해보자.', opensZone: 'Club' },
                        { id: 'npc_member', name: '동아리 부원', role: '학생 동아리', tx: 5, ty: 5.5, gender: 'male', dialogue: '부원들끼리 정보도 교환하고 친해질 수 있어서 정말 좋아요.' }
                    ]
                };
            case 'Dormitory':
                return {
                    props: [
                        { key: 'bed', tx: 3, ty: 2.5, w: 2, h: 2 },
                        { key: 'bed', tx: 7.5, ty: 2.5, w: 2, h: 2 },
                        { key: 'bed', tx: 12.5, ty: 2.5, w: 2, h: 2 },
                        { key: 'table', tx: 8, ty: 6.8, w: 2.2, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_dorm', name: '기숙사 사감', role: '기숙사 관리', tx: 9, ty: 5.5, gender: 'male', dialogue: '피곤할 땐 기숙사에서 충분히 휴식을 취하고 체력을 회복하세요.', opensZone: 'Dormitory' },
                        { id: 'npc_roommate', name: c1, role: '기숙사 사생', tx: 4, ty: 4.8, gender: 'female', dialogue: '기숙사 침대가 꽤 포근해서 다음 날 수업 컨디션이 확 좋아져요!' }
                    ]
                };
        }
    }, [activeRoom, character.schoolData?.homeroomTeacher?.name, character.schoolData?.classmates]);

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_elementary'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_middle'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_high'));
        ['desk', 'school_desk', 'bookshelf', 'training_dummy', 'table', 'bed', 'hunt_prop_tree', 'hunt_prop_spirit_tree'].forEach(
            k => loadCityAssetImage(getInteriorPropSpriteUrl(k))
        );
    }, [playerSpriteUrl, cultureKey]);

    const playerRef = useRef({
        x: Math.floor(PLAZA_COLS / 2) * CITY_TILE_SIZE,
        y: (PLAZA_ROWS - 2.5) * CITY_TILE_SIZE,
        dir: 'up' as SpriteDirection,
        frame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const keysRef = useRef<Set<string>>(new Set());
    const cameraRef = useRef({ x: 0, y: 0 });
    const exitCooldownRef = useRef<number>(Date.now() + 600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setViewport({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const canEnterTier = useCallback(
        (tier: SchoolTier): { allowed: boolean; reason?: string } => {
            const isStudent = character.job === JobType.STUDENT && !character.schoolData?.isGraduated;
            const isEnrolledCity =
                isStudent &&
                Boolean(
                    character.schoolData?.schoolName?.includes(city) ||
                    (character.schoolData?.schoolLocation as any)?.city === city ||
                    character.schoolData?.schoolName === getSchoolDisplayName(tier)
                );
            if (isEnrolledCity && enrolledTier === tier) {
                return { allowed: true };
            }
            if (instructorQuest) {
                const qTier =
                    instructorQuest.schoolTier === '초급'
                        ? 'Elementary'
                        : instructorQuest.schoolTier === '중급'
                            ? 'Middle'
                            : instructorQuest.schoolTier === '고급'
                                ? 'High'
                                : null;
                if (!qTier || qTier === tier) {
                    return { allowed: true };
                }
            }
            if (isStudent && character.schoolData?.schoolName) {
                return {
                    allowed: false,
                    reason: `소속 본교(${character.schoolData.schoolName}) 재학생만 출입할 수 있습니다.`
                };
            }
            return {
                allowed: false,
                reason: `${getSchoolDisplayName(tier)} 재학생이 아니므로 출입할 수 없습니다. (레귤러스 학교 파견 교관 퀘스트 진행 시 입장 가능)`
            };
        },
        [character.job, character.schoolData, city, enrolledTier, instructorQuest, getSchoolDisplayName]
    );

    const enterSchoolCampus = useCallback(
        (tier: SchoolTier) => {
            const check = canEnterTier(tier);
            if (!check.allowed) {
                setAccessDeniedMsg(check.reason || '출입 권한이 없습니다.');
                setTimeout(() => setAccessDeniedMsg(null), 3200);
                return;
            }
            setAccessDeniedMsg(null);
            setActiveDialogue(null);
            setActiveRoom(null);
            const nextCols = tier === 'Elementary' ? 26 : tier === 'Middle' ? 30 : 34;
            const nextRows = tier === 'Elementary' ? 18 : tier === 'Middle' ? 20 : 22;
            playerRef.current.x = Math.floor(nextCols / 2) * CITY_TILE_SIZE;
            playerRef.current.y = (nextRows - 2.5) * CITY_TILE_SIZE;
            playerRef.current.dir = 'up';
            playerRef.current.targetX = null;
            playerRef.current.targetY = null;
            exitCooldownRef.current = Date.now() + 700;
            setActiveSchoolTier(tier);
        },
        [canEnterTier]
    );

    const enterRoom = useCallback((zone: SchoolZone) => {
        setActiveDialogue(null);
        playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
        playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
        setActiveRoom(zone);
    }, []);

    const exitRoomToCampus = useCallback(() => {
        if (!activeSchoolTier) return;
        const nextCols = activeSchoolTier === 'Elementary' ? 26 : activeSchoolTier === 'Middle' ? 30 : 34;
        const nextRows = activeSchoolTier === 'Elementary' ? 18 : activeSchoolTier === 'Middle' ? 20 : 22;
        setActiveDialogue(null);
        setActiveRoom(null);
        playerRef.current.x = Math.floor(nextCols / 2) * CITY_TILE_SIZE;
        playerRef.current.y = (nextRows - 2.5) * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
    }, [activeSchoolTier]);

    const exitCampusToPlaza = useCallback(() => {
        setActiveDialogue(null);
        setActiveRoom(null);
        setActiveSchoolTier(null);
        playerRef.current.x = Math.floor(PLAZA_COLS / 2) * CITY_TILE_SIZE;
        playerRef.current.y = (PLAZA_ROWS - 2.5) * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
    }, []);

    const handleInteract = useCallback(() => {
        const p = playerRef.current;
        if (!activeSchoolTier) {
            // Check Plaza Students first
            for (const stu of plazaStudents) {
                const sx = (stu.tx + 0.5) * CITY_TILE_SIZE;
                const sy = (stu.ty + 0.5) * CITY_TILE_SIZE;
                if (Math.hypot(sx - p.x, sy - p.y) <= CITY_TILE_SIZE * 1.6) {
                    setActiveDialogue({ name: stu.name, role: stu.role, text: stu.dialogue });
                    return;
                }
            }
            for (const b of buildingSlots) {
                const doorX = (b.tx + b.tw / 2) * CITY_TILE_SIZE;
                const doorY = (b.ty + b.th + 0.4) * CITY_TILE_SIZE;
                if (Math.hypot(doorX - p.x, doorY - p.y) <= CITY_TILE_SIZE * 2.0) {
                    enterSchoolCampus(b.tier);
                    return;
                }
            }
            return;
        }
        if (!activeRoom) {
            for (const b of campusBuildings) {
                const doorX = (b.tx + b.tw / 2) * CITY_TILE_SIZE;
                const doorY = (b.ty + b.th + 0.4) * CITY_TILE_SIZE;
                if (Math.hypot(doorX - p.x, doorY - p.y) <= CITY_TILE_SIZE * 2.0) {
                    enterRoom(b.zone);
                    return;
                }
            }
            return;
        }
        for (const npc of roomContent.npcs) {
            const nx = (npc.tx + 0.5) * CITY_TILE_SIZE;
            const ny = (npc.ty + 0.5) * CITY_TILE_SIZE;
            if (Math.hypot(nx - p.x, ny - p.y) <= CITY_TILE_SIZE * 1.75) {
                if (npc.opensZone) {
                    setOpenModalZone(npc.opensZone);
                } else {
                    setActiveDialogue({ name: npc.name, role: npc.role, text: npc.dialogue });
                }
                return;
            }
        }
    }, [activeSchoolTier, activeRoom, plazaStudents, buildingSlots, campusBuildings, roomContent.npcs, enterSchoolCampus, enterRoom]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (openModalZone) return;
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                keysRef.current.add(k);
            } else if (k === ' ' || k === 'enter' || k === 'e') {
                e.preventDefault();
                if (activeDialogue) setActiveDialogue(null);
                else handleInteract();
            } else if (k === 'escape') {
                if (activeDialogue) setActiveDialogue(null);
                else if (activeRoom) exitRoomToCampus();
                else if (activeSchoolTier) exitCampusToPlaza();
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
    }, [openModalZone, activeDialogue, activeRoom, activeSchoolTier, handleInteract, exitRoomToCampus, exitCampusToPlaza, onExitToCity]);

    useEffect(() => {
        let rafId = 0;
        let last = performance.now();
        let uiTick = 0;

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const p = playerRef.current;
            const cols = campusDims.cols;
            const rows = campusDims.rows;
            const ts = CITY_TILE_SIZE;

            if (!openModalZone && !activeDialogue) {
                let vx = 0;
                let vy = 0;
                const keys = keysRef.current;
                if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
                if (keys.has('arrowright') || keys.has('d')) vx += 1;
                if (keys.has('arrowup') || keys.has('w')) vy -= 1;
                if (keys.has('arrowdown') || keys.has('s')) vy += 1;

                let moving = false;
                if (vx !== 0 || vy !== 0) {
                    p.targetX = null;
                    p.targetY = null;
                    const len = Math.hypot(vx, vy);
                    p.x += (vx / len) * 200 * dt;
                    p.y += (vy / len) * 200 * dt;
                    moving = true;
                    if (Math.abs(vx) >= Math.abs(vy)) p.dir = vx < 0 ? 'left' : 'right';
                    else p.dir = vy < 0 ? 'up' : 'down';
                } else if (p.targetX !== null && p.targetY !== null) {
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const d = Math.hypot(dx, dy);
                    if (d < 6) {
                        p.targetX = null;
                        p.targetY = null;
                    } else {
                        p.x += (dx / d) * 200 * dt;
                        p.y += (dy / d) * 200 * dt;
                        moving = true;
                        if (Math.abs(dx) >= Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
                        else p.dir = dy < 0 ? 'up' : 'down';
                    }
                }

                if (moving) {
                    p.animTimer += dt;
                    if (p.animTimer >= 0.14) {
                        p.animTimer = 0;
                        p.frame = (p.frame + 1) % 3;
                    }
                } else {
                    p.frame = 1;
                }

                p.x = Math.max(ts * 1.2, Math.min((cols - 1.2) * ts, p.x));
                p.y = Math.max(ts * 1.2, Math.min((rows - 0.8) * ts, p.y));

                const exitCx = Math.floor(cols / 2) * ts;
                if (Date.now() > exitCooldownRef.current && p.y >= (rows - 1.25) * ts && Math.abs(p.x - exitCx) <= ts * 1.8) {
                    if (activeRoom) exitRoomToCampus();
                    else if (activeSchoolTier) exitCampusToPlaza();
                    else onExitToCity();
                }

                uiTick += dt;
                if (uiTick >= 0.18) {
                    uiTick = 0;
                    let found: string | null = null;
                    if (!activeSchoolTier) {
                        for (const stu of plazaStudents) {
                            const sx = (stu.tx + 0.5) * ts;
                            const sy = (stu.ty + 0.5) * ts;
                            if (Math.hypot(sx - p.x, sy - p.y) <= ts * 1.6) {
                                found = `💬 ${stu.name} 대화 (Space)`;
                                break;
                            }
                        }
                        if (!found) {
                            for (const b of buildingSlots) {
                                const dx = (b.tx + b.tw / 2) * ts;
                                const dy = (b.ty + b.th + 0.4) * ts;
                                if (Math.hypot(dx - p.x, dy - p.y) <= ts * 2.0) {
                                    found = canEnterTier(b.tier).allowed
                                        ? `🎓 ${b.label} 입장 (Space)`
                                        : `🔒 ${b.label} 출입 제한`;
                                    break;
                                }
                            }
                        }
                    } else if (!activeRoom) {
                        for (const b of campusBuildings) {
                            const dx = (b.tx + b.tw / 2) * ts;
                            const dy = (b.ty + b.th + 0.4) * ts;
                            if (Math.hypot(dx - p.x, dy - p.y) <= ts * 2.0) {
                                found = `${b.icon} ${b.label} 입장 (Space)`;
                                break;
                            }
                        }
                    } else {
                        for (const npc of roomContent.npcs) {
                            const nx = (npc.tx + 0.5) * ts;
                            const ny = (npc.ty + 0.5) * ts;
                            if (Math.hypot(nx - p.x, ny - p.y) <= ts * 1.75) {
                                found = npc.opensZone ? `📋 ${npc.name} 이용하기 (Space)` : `💬 ${npc.name} 대화 (Space)`;
                                break;
                            }
                        }
                    }
                    setNearbyLabel(found);
                }
            }

            const mapW = cols * ts;
            const mapH = rows * ts;
            cameraRef.current.x = Math.round(Math.max(0, Math.min(Math.max(0, mapW - viewport.w), p.x - viewport.w / 2)));
            cameraRef.current.y = Math.round(Math.max(0, Math.min(Math.max(0, mapH - viewport.h), p.y - viewport.h / 2)));

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, viewport.w, viewport.h);
                ctx.save();
                const offX = mapW < viewport.w ? Math.floor((viewport.w - mapW) / 2) : -cameraRef.current.x;
                const offY = mapH < viewport.h ? Math.floor((viewport.h - mapH) / 2) : -cameraRef.current.y;
                ctx.translate(offX, offY);

                const groundImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
                const roadImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
                const wallImg = getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));

                const exitMin = Math.floor(cols / 2) - 1;
                const exitMax = Math.floor(cols / 2) + 1;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = c * ts;
                        const y = r * ts;
                        const isGate = r === rows - 1 && c >= exitMin && c <= exitMax;
                        const isWall = r === 0 || c === 0 || c === cols - 1 || (r === rows - 1 && !isGate);
                        if (isWall) {
                            if (wallImg?.complete && wallImg.naturalWidth > 0) ctx.drawImage(wallImg, x, y, ts, ts);
                            else {
                                ctx.fillStyle = activeRoom ? '#475569' : activeSchoolTier === 'High' ? '#312e81' : '#334155';
                                ctx.fillRect(x, y, ts, ts);
                            }
                            continue;
                        }
                        if (activeRoom) {
                            // Indoor floor pattern (warm wood / stone by room)
                            const isTraining = activeRoom === 'Training';
                            ctx.fillStyle = isTraining
                                ? ((r + c) % 2 === 0 ? '#57534e' : '#44403c')
                                : ((r + c) % 2 === 0 ? '#6b4c35' : '#5e422d');
                            ctx.fillRect(x, y, ts, ts);
                            if (isGate) {
                                ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
                                ctx.fillRect(x, y, ts, ts);
                            }
                            continue;
                        }
                        const isRoad = !activeSchoolTier
                            ? (c >= Math.floor(cols / 2) - 1 && c <= Math.floor(cols / 2) && r >= 8) ||
                              (r >= 8 && r <= 9 && c >= 4 && c <= 23)
                            : (c >= Math.floor(cols / 2) - 1 && c <= Math.floor(cols / 2)) ||
                              (r === Math.floor(rows * 0.48) && c >= 3 && c <= cols - 4);
                        const tile = isRoad ? roadImg : groundImg;
                        if (tile?.complete && tile.naturalWidth > 0) {
                            ctx.drawImage(tile, x, y, ts, ts);
                        } else {
                            ctx.fillStyle = isRoad ? '#64748b' : (r + c) % 2 === 0 ? '#22543d' : '#276749';
                            ctx.fillRect(x, y, ts, ts);
                        }
                        if (isGate) {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
                            ctx.fillRect(x, y, ts, ts);
                        }
                    }
                }

                const drawNpcActor = (npc: SchoolNpcActor) => {
                    const nx = (npc.tx + 0.5) * ts;
                    const ny = (npc.ty + 0.5) * ts;
                    const npcSprite = resolveEntityRpgSprite({ gender: npc.gender } as any, region, nation);
                    loadRpgSpriteImage(npcSprite.url);
                    const nImg = getCachedRpgSpriteImage(npcSprite.url);
                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.beginPath();
                    ctx.ellipse(nx, ny + 8, 11, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    if (nImg && nImg.complete && nImg.naturalWidth > 0) {
                        const cw = nImg.naturalWidth / 3;
                        const ch = nImg.naturalHeight / 4;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(nImg, cw, 0, cw, ch, Math.round(nx - 21), Math.round(ny - 34), 42, 42);
                    } else {
                        drawFallbackChibiSprite(ctx, nx, ny + 8, region as RpgSpriteRegionKey, npc.gender, 'down', 1);
                    }
                    ctx.font = 'bold 10px sans-serif';
                    const tw = Math.max(58, ctx.measureText(npc.name).width + 12);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                    ctx.beginPath();
                    ctx.roundRect(nx - tw / 2, ny - 48, tw, 17, 4);
                    ctx.fill();
                    ctx.fillStyle = npc.opensZone ? '#fde047' : '#e0f2fe';
                    ctx.textAlign = 'center';
                    ctx.fillText(npc.name, nx, ny - 36);
                };

                if (!activeSchoolTier) {
                    // Level 1: 3 School Buildings + Diverse Plaza Students
                    buildingSlots.forEach(b => {
                        const bx = b.tx * ts;
                        const by = b.ty * ts;
                        const bw = b.tw * ts;
                        const bh = b.th * ts;
                        const img = getCachedCityAssetImage(getBuildingSpriteUrl(cultureKey, b.spriteKey));

                        ctx.fillStyle = 'rgba(0,0,0,0.38)';
                        ctx.beginPath();
                        ctx.ellipse(bx + bw / 2, by + bh - 8, bw * 0.42, 16, 0, 0, Math.PI * 2);
                        ctx.fill();

                        if (img && img.complete && img.naturalWidth > 0) {
                            const scale = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
                            const dw = img.naturalWidth * scale;
                            const dh = img.naturalHeight * scale;
                            ctx.drawImage(img, bx + (bw - dw) / 2, by + bh - dh, dw, dh);
                        } else {
                            ctx.fillStyle = '#1e293b';
                            ctx.fillRect(bx + 12, by + 16, bw - 24, bh - 24);
                            ctx.font = '38px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('🏫', bx + bw / 2, by + bh / 2 + 12);
                        }

                        const doorX = bx + bw / 2;
                        const doorY = by + bh + 18;
                        ctx.fillStyle = `${b.accentColor}44`;
                        ctx.beginPath();
                        ctx.arc(doorX, doorY, 16, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = b.accentColor;
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        const isEnrolled = enrolledTier === b.tier;
                        const canEnter = canEnterTier(b.tier).allowed;
                        const badge = isEnrolled ? ' [재학 중]' : canEnter ? ' [파견 교관]' : ' [출입 제한]';
                        const title = `${b.label}${badge}`;
                        ctx.font = 'bold 11px sans-serif';
                        const tw = Math.max(120, ctx.measureText(title).width + 18);
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                        ctx.beginPath();
                        ctx.roundRect(bx + bw / 2 - tw / 2, by - 30, tw, 28, 6);
                        ctx.fill();
                        ctx.strokeStyle = b.accentColor;
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                        ctx.fillStyle = '#f8fafc';
                        ctx.textAlign = 'center';
                        ctx.fillText(title, bx + bw / 2, by - 16);
                        ctx.font = '9px sans-serif';
                        ctx.fillStyle = '#cbd5e1';
                        ctx.fillText(b.ageLabel, bx + bw / 2, by - 6);
                    });

                    plazaStudents.forEach(drawNpcActor);
                } else if (!activeRoom) {
                    // Level 2: Campus Courtyard with 6 distinct Building Entrances
                    campusBuildings.forEach(b => {
                        const bx = b.tx * ts;
                        const by = b.ty * ts;
                        const bw = b.tw * ts;
                        const bh = b.th * ts;

                        ctx.fillStyle = 'rgba(0,0,0,0.35)';
                        ctx.fillRect(bx + 6, by + 10, bw - 8, bh - 4);
                        ctx.fillStyle = '#1e293b';
                        ctx.fillRect(bx, by + 22, bw, bh - 22);
                        ctx.fillStyle = b.roofColor;
                        ctx.beginPath();
                        ctx.moveTo(bx - 8, by + 24);
                        ctx.lineTo(bx + bw / 2, by - 4);
                        ctx.lineTo(bx + bw + 8, by + 24);
                        ctx.closePath();
                        ctx.fill();
                        ctx.strokeStyle = b.accentColor;
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        // Door
                        ctx.fillStyle = '#0f172a';
                        ctx.fillRect(bx + bw / 2 - 14, by + bh - 34, 28, 34);
                        ctx.strokeStyle = b.accentColor;
                        ctx.strokeRect(bx + bw / 2 - 14, by + bh - 34, 28, 34);

                        ctx.font = '26px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(b.icon, bx + bw / 2, by + 56);

                        const title = `${b.icon} ${b.label}`;
                        ctx.font = 'bold 11px sans-serif';
                        const tw = Math.max(100, ctx.measureText(title).width + 16);
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                        ctx.beginPath();
                        ctx.roundRect(bx + bw / 2 - tw / 2, by - 26, tw, 24, 5);
                        ctx.fill();
                        ctx.strokeStyle = b.accentColor;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.fillStyle = '#f8fafc';
                        ctx.fillText(title, bx + bw / 2, by - 10);
                    });
                } else {
                    // Level 3: Dedicated Room Interior Props & NPCs
                    roomContent.props.forEach(pr => {
                        const px = pr.tx * ts;
                        const py = pr.ty * ts;
                        const pw = pr.w * ts;
                        const ph = pr.h * ts;
                        const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                        if (img && img.complete && img.naturalWidth > 0) {
                            const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                            const dw = img.naturalWidth * scale;
                            const dh = img.naturalHeight * scale;
                            ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                        }
                    });
                    roomContent.npcs.forEach(drawNpcActor);
                }

                // Exit Gate Label
                const exitCx = Math.floor(cols / 2) * ts;
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fde047';
                ctx.fillText(
                    activeRoom ? '🚪 학교 교정으로' : activeSchoolTier ? '🚪 학교 광장으로' : '🚪 도시로 복귀',
                    exitCx,
                    (rows - 1) * ts - 8
                );

                // Player Sprite (3x4 slicing matching CityRpgCanvas)
                const pImg = getCachedRpgSpriteImage(playerSpriteUrl);
                const drawSize = 46;
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y - 2, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                if (pImg && pImg.complete && pImg.naturalWidth > 0) {
                    const cellW = pImg.naturalWidth / 3;
                    const cellH = pImg.naturalHeight / 4;
                    const row = DIRECTION_ROW_MAP[p.dir] ?? 0;
                    const col = Math.max(0, Math.min(2, p.frame));
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        pImg,
                        col * cellW,
                        row * cellH,
                        cellW,
                        cellH,
                        Math.round(p.x - drawSize / 2),
                        Math.round(p.y - drawSize + 4),
                        drawSize,
                        drawSize
                    );
                } else {
                    drawFallbackChibiSprite(ctx, p.x, p.y, spriteInfo.regionKey, spriteInfo.genderKey, p.dir, p.frame);
                }
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#fde047';
                ctx.textAlign = 'center';
                ctx.fillText(character.name, p.x, p.y + 14);

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [viewport, cultureKey, playerSpriteUrl, spriteInfo, activeSchoolTier, activeRoom, campusDims, buildingSlots, plazaStudents, campusBuildings, roomContent, enrolledTier, canEnterTier, openModalZone, activeDialogue, region, nation, character.name, exitRoomToCampus, exitCampusToPlaza, onExitToCity]);

    const roomTitleMap: Record<SchoolZone, string> = {
        Office: '교무실',
        Classroom: '강의실',
        Library: '대도서관',
        Training: '실전 연무장',
        Club: '동아리동',
        Dormitory: '학생 기숙사'
    };

    return (
        <div className="relative flex-1 flex flex-col w-full h-full bg-slate-950 overflow-hidden rounded-xl border border-slate-800">
            <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2.5">
                    <GraduationCap size={18} className="text-cyan-400" />
                    <div>
                        <div className="text-sm font-black text-cyan-200 flex items-center gap-2">
                            <span>
                                {activeRoom && activeSchoolTier
                                    ? `${getSchoolDisplayName(activeSchoolTier)} · ${roomTitleMap[activeRoom]}`
                                    : activeSchoolTier
                                        ? getSchoolDisplayName(activeSchoolTier)
                                        : `${city} 레귤러스 학교 지구`}
                            </span>
                            {instructorQuest && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/90 border border-amber-400/50 text-amber-300">
                                    📢 파견 교관 임무 진행 중
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {activeRoom
                                ? '실내 담당 NPC에게 말을 걸어 학사 기능을 이용하세요 (Space).'
                                : activeSchoolTier
                                    ? '각 건물(교무실·강의실·도서관·연무장·동아리동·기숙사) 입구로 들어가세요.'
                                    : '광장의 학생 NPC들과 대화하거나 초급·중급·고급 학교로 입장하세요.'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {!activeRoom &&
                        (['Elementary', 'Middle', 'High'] as SchoolTier[]).map(t => (
                            <button
                                key={t}
                                onClick={() => enterSchoolCampus(t)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    activeSchoolTier === t
                                        ? 'bg-cyan-600 text-white shadow'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                {t === 'Elementary' ? '초급' : t === 'Middle' ? '중급' : '고급'}
                            </button>
                        ))}
                    <button
                        onClick={activeRoom ? exitRoomToCampus : activeSchoolTier ? exitCampusToPlaza : onExitToCity}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                        {activeSchoolTier ? <ArrowLeft size={14} /> : <DoorOpen size={14} />}
                        {activeRoom ? '교정으로' : activeSchoolTier ? '학교 광장으로' : '도시로'}
                    </button>
                </div>
            </div>

            <div ref={containerRef} className="relative flex-1 w-full min-h-[360px]">
                <canvas
                    ref={canvasRef}
                    width={viewport.w}
                    height={viewport.h}
                    className="w-full h-full block cursor-crosshair"
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mapW = campusDims.cols * CITY_TILE_SIZE;
                        const mapH = campusDims.rows * CITY_TILE_SIZE;
                        const offX = mapW < viewport.w ? Math.floor((viewport.w - mapW) / 2) : -cameraRef.current.x;
                        const offY = mapH < viewport.h ? Math.floor((viewport.h - mapH) / 2) : -cameraRef.current.y;
                        playerRef.current.targetX = e.clientX - rect.left - offX;
                        playerRef.current.targetY = e.clientY - rect.top - offY;
                    }}
                />

                {accessDeniedMsg && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl bg-rose-950/95 border border-rose-500/70 text-rose-100 text-xs font-bold shadow-2xl">
                        🔒 {accessDeniedMsg}
                    </div>
                )}

                {nearbyLabel && !openModalZone && !activeDialogue && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                        <button
                            onClick={handleInteract}
                            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-xl cursor-pointer flex items-center gap-2"
                        >
                            <BookOpen size={15} />
                            {nearbyLabel}
                        </button>
                    </div>
                )}

                {activeDialogue && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-30 bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={15} className="text-cyan-400" />
                                <span className="text-xs font-black text-white">{activeDialogue.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{activeDialogue.role}</span>
                            </div>
                            <button onClick={() => setActiveDialogue(null)} className="text-slate-400 hover:text-white cursor-pointer">
                                <X size={15} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">&ldquo;{activeDialogue.text}&rdquo;</p>
                    </div>
                )}

                {openModalZone && activeSchoolTier && (
                    <SchoolModal
                        character={character}
                        initialZone={openModalZone}
                        targetSchoolTier={activeSchoolTier}
                        onClose={() => setOpenModalZone(null)}
                        onUpdateCharacter={(newChar, log) => onUpdateCharacter(newChar, log)}
                        onAction={(act, mp, override) => onAction?.(act, mp, override)}
                        onBattle={(enemy, type, source, targetCity, targetNation) => {
                            setOpenModalZone(null);
                            onStartBattle?.(enemy, type, source, targetCity, targetNation);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default SchoolCampusCanvas;
