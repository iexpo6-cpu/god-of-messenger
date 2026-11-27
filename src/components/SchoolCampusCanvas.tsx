import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, ClubType, CombatStyle, JobType, SchoolTier, SimpleStudent, WeaponType } from '../types';
import { drawCanvasNightOverlay, isNightTime } from '../utils/canvasNightOverlay';
import { SCHOOL_CONFIG, WEAPON_TYPE_KOREAN } from '../constants';
import { addMasteryExp, generateDefaultVisualUrl, generateName, getWeaponTypeFromItem } from '../utils';
import { processTimeSkip } from '../services/timeEngine';
import { chatWithStudent } from '../services/geminiService';
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
import ClubModal from './ClubModal';
import { ArrowLeft, BookOpen, DoorOpen, GraduationCap, MessageCircle, Swords, UserPlus, X } from 'lucide-react';

const resolveAcademyTileCulture = (cultureKey: string): string => {
    if (cultureKey.startsWith('shingye')) return 'europe';
    if (cultureKey.startsWith('magye') || cultureKey === 'abyssalon') return 'northern_europe';
    if (cultureKey === 'sylvanar') return 'tropical';
    if (cultureKey === 'feraldia') return 'africa';
    if (cultureKey === 'japan') return 'japan';
    if (cultureKey === 'china') return 'china';
    if (cultureKey === 'korea' || cultureKey === 'asia') return 'east_asia';
    if (cultureKey === 'northern_europe') return 'northern_europe';
    if (cultureKey === 'middle_east' || cultureKey === 'north_africa' || cultureKey === 'central_asia') return 'desert';
    if (cultureKey === 'africa' || cultureKey === 'west_africa' || cultureKey === 'south_africa') return 'africa';
    if (cultureKey === 'south_america' || cultureKey === 'southeast_asia' || cultureKey === 'south_asia' || cultureKey === 'oceania') return 'tropical';
    return 'europe';
};

const resolveAcademyBuildingFolder = (cultureKey: string): string => {
    if (cultureKey.startsWith('shingye')) return 'shingye';
    if (cultureKey.startsWith('magye') || cultureKey === 'abyssalon') return 'magye';
    if (cultureKey === 'sylvanar') return 'sylvanar';
    if (cultureKey === 'feraldia') return 'feraldia';
    if (cultureKey === 'korea' || cultureKey === 'japan' || cultureKey === 'china' || cultureKey === 'asia') return 'east_asia';
    if (cultureKey === 'middle_east' || cultureKey === 'africa' || cultureKey === 'north_africa' || cultureKey === 'west_africa' || cultureKey === 'south_africa' || cultureKey === 'central_asia' || cultureKey === 'south_america' || cultureKey === 'southeast_asia' || cultureKey === 'south_asia' || cultureKey === 'oceania') return 'desert';
    return 'europe';
};

const getAcademyAssetUrl = (relPath: string): string => `./assets/visuals/academy/${relPath}`;

interface DivineBookDef {
    id: string;
    propKey: string;
    title: string;
    category: string;
    desc: string;
    ctrlGain: number;
    statKey: 'wis' | 'int' | 'str';
    statGain: number;
    expGain: number;
    hpCost?: number;
    daysElapsed: number;
}

const ACADEMY_DIVINE_BOOKS: DivineBookDef[] = [
    {
        id: 'book_magic_theory',
        propKey: 'bookshelf',
        title: '기초 마법 이론서',
        category: '정규 마법 이론',
        desc: '마력 회로의 구조와 정밀한 마법 제어를 위한 필수 이론서입니다. (3일 경과)',
        ctrlGain: 1,
        statKey: 'int',
        statGain: 2,
        expGain: 50,
        daysElapsed: 3,
    },
    {
        id: 'book_history',
        propKey: 'bookshelf',
        title: '대륙 및 신계 역사서',
        category: '역사 · 전략 연구',
        desc: '과거 신계와 인간 제국의 흥망성쇠를 기록한 고전 역사서입니다. (3일 경과)',
        ctrlGain: 1,
        statKey: 'wis',
        statGain: 2,
        expGain: 50,
        daysElapsed: 3,
    },
    {
        id: 'book_sun',
        propKey: 'book_sun',
        title: '태양과 광휘의 신력서',
        category: '신력 제어 · 광휘',
        desc: '태양신의 빛처럼 신력을 흔들림 없이 제어(CTRL)하는 원리를 담은 성전입니다. (3일 경과)',
        ctrlGain: 2,
        statKey: 'wis',
        statGain: 1,
        expGain: 55,
        daysElapsed: 3,
    },
    {
        id: 'book_element',
        propKey: 'book_element',
        title: '심해·성화의 신력 비전',
        category: '신력 제어 · 원소',
        desc: '물과 불의 상반된 기운을 정교하게 제어(CTRL)하는 비법이 기록되어 있습니다. (3일 경과)',
        ctrlGain: 2,
        statKey: 'str',
        statGain: 1,
        expGain: 55,
        daysElapsed: 3,
    },
    {
        id: 'book_abyss',
        propKey: 'book_abyss',
        title: '금서: 심연과 공허의 신력론',
        category: '금지된 서고',
        desc: '금기시된 공허의 신력을 다루는 위험한 고서. 체력이 소모되지만 제어력(CTRL)이 크게 상승합니다. (3일 경과)',
        ctrlGain: 4,
        statKey: 'int',
        statGain: 2,
        expGain: 90,
        hpCost: 15,
        daysElapsed: 3,
    },
];

type ClassroomSubjectType = 'Combat' | 'Magic' | 'Divine' | 'Strategy' | 'Physical' | 'Weapon';

const CLASSROOM_SUBJECT_ROOMS: Array<{
    type: ClassroomSubjectType;
    title: string;
    statLabel: string;
    mpCost: number;
    tx: number;
    ty: number;
}> = [
    { type: 'Combat', title: '전투학실', statLabel: 'STR / AGI', mpCost: 15, tx: 1.8, ty: 1.7 },
    { type: 'Magic', title: '마법학실', statLabel: 'INT', mpCost: 20, tx: 7.3, ty: 1.7 },
    { type: 'Divine', title: '신력학실', statLabel: 'CTRL', mpCost: 20, tx: 12.8, ty: 1.7 },
    { type: 'Strategy', title: '전략학실', statLabel: 'WIS', mpCost: 15, tx: 1.8, ty: 6.7 },
    { type: 'Physical', title: '체력학실', statLabel: 'DEF / HP', mpCost: 15, tx: 7.3, ty: 6.7 },
    { type: 'Weapon', title: '무기학실', statLabel: '무기 숙련', mpCost: 15, tx: 12.8, ty: 6.7 },
];

const DORM_ROOM_DOORS: Array<{
    id: string;
    gender: '남성' | '여성';
    grade: 1 | 2 | 3;
    label: string;
    tx: number;
    ty: number;
}> = [
    { id: 'dorm_m_1', gender: '남성', grade: 1, label: '남자 1학년실', tx: 2.1, ty: 2.0 },
    { id: 'dorm_m_2', gender: '남성', grade: 2, label: '남자 2학년실', tx: 7.6, ty: 2.0 },
    { id: 'dorm_m_3', gender: '남성', grade: 3, label: '남자 3학년실', tx: 13.1, ty: 2.0 },
    { id: 'dorm_f_1', gender: '여성', grade: 1, label: '여자 1학년실', tx: 2.1, ty: 6.8 },
    { id: 'dorm_f_2', gender: '여성', grade: 2, label: '여자 2학년실', tx: 7.6, ty: 6.8 },
    { id: 'dorm_f_3', gender: '여성', grade: 3, label: '여자 3학년실', tx: 13.1, ty: 6.8 },
];

const CLUB_DESK_SPECS: Array<{ club: ClubType; title: string; desc: string; benefits: string[]; tx: number; ty: number }> = [
    { club: ClubType.MELEE, title: '근접 무기부실', desc: '도검·창·대검 등 근접 무기의 극의를 연마하는 동아리입니다.', benefits: ['STR +1', '근접 무기 숙련 보너스'], tx: 2.0, ty: 1.8 },
    { club: ClubType.RANGED, title: '원거리 무기부실', desc: '활·석궁 등 정밀 사격과 민첩성을 단련하는 동아리입니다.', benefits: ['AGI +1', '원거리 무기 숙련 보너스'], tx: 7.5, ty: 1.8 },
    { club: ClubType.MAGIC_ENG, title: '마법 공학부실', desc: '마법 도구와 신력 증폭 장치를 연구하는 지성의 산실입니다.', benefits: ['INT +1', '마법 무기 숙련 보너스'], tx: 13.0, ty: 1.8 },
    { club: ClubType.COUNCIL, title: '학생회실', desc: '학원의 행정과 예산, 축제를 총괄하는 대표 기구입니다.', benefits: ['학교 평판 상승폭 증가', '학생회 물자 보급'], tx: 3.0, ty: 6.8 },
    { club: ClubType.DISCIPLINARY, title: '선도부실', desc: '교내 질서와 치안을 유지하고 불량배를 단속하는 수호대입니다.', benefits: ['평판 하락 방지', '순찰 전리품 수급'], tx: 12.2, ty: 6.8 },
];

const getInteriorPartitionType = (
    activeRoom: string | null,
    activeClubRoom: ClubType | null,
    activeDormRoom: { gender: '남성' | '여성'; grade: 1 | 2 | 3; label: string } | null,
    c: number,
    r: number
): 'wall' | 'doorway' | null => {
    if (c <= 0 || c >= 17 || r <= 0 || r >= 12) return null;

    if (activeRoom === 'Classroom' || (activeRoom === 'Dormitory' && !activeDormRoom)) {
        // 상단 3개 방 (c: 1..4, 6..10, 12..16 / r: 1..3, 전면 벽 r: 4)
        if ((c === 5 || c === 11) && r >= 1 && r <= 4) return 'wall';
        if (r === 4) {
            if (c === 3 || c === 8 || c === 9 || c === 14) return 'doorway';
            return 'wall';
        }
        // 하단 3개 방 (c: 1..4, 6..10, 12..16 / r: 7..8, 상단 벽 r: 6, 하단 벽 r: 9)
        if ((c === 5 || c === 11) && r >= 6 && r <= 9) return 'wall';
        if (r === 6 || r === 9) {
            if (c === 3 || c === 8 || c === 9 || c === 14) return 'doorway';
            return 'wall';
        }
    }

    if (activeRoom === 'Club' && !activeClubRoom) {
        // 상단 3개 동아리실
        if ((c === 5 || c === 11) && r >= 1 && r <= 4) return 'wall';
        if (r === 4) {
            if (c === 3 || c === 8 || c === 9 || c === 14) return 'doorway';
            return 'wall';
        }
        // 하단 2개 동아리실 (학생회실 c:1..6, 선도부실 c:11..16, 중앙 복도 c:8..9)
        if ((c === 7 || c === 10) && r >= 6 && r <= 9) return 'wall';
        if ((r === 6 || r === 9) && (c <= 7 || c >= 10)) {
            if (c === 4 || c === 13) return 'doorway';
            return 'wall';
        }
    }

    return null;
};

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
    canBondAndSpar?: boolean;
    isTeacher?: boolean;
    npcLevel?: number;
    combatStyle?: CombatStyle;
}

interface RoomProp {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    interactKind?: 'attendance' | 'report' | 'divine_book' | 'club_desk' | 'club_activity' | 'subject_room' | 'enter_subject_room' | 'dorm_door';
    bookDef?: DivineBookDef;
    clubType?: ClubType;
    subjectType?: ClassroomSubjectType;
    dormDoor?: typeof DORM_ROOM_DOORS[number];
    label?: string;
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
    const npcOffsetsRef = useRef<Record<string, { dx: number; dy: number; vx: number; vy: number; timer: number; dir: SpriteDirection }>>({});
    const dpadRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);
    const savedCampusState = useMemo(() => {
        try {
            const raw = sessionStorage.getItem('shinryoku_school_campus_state');
            if (!raw) return null;
            const p = JSON.parse(raw);
            return p?.charId === character.id ? p : null;
        } catch {
            return null;
        }
    }, [character.id]);
    const [viewport, setViewport] = useState({ w: 960, h: 580 });
    const [activeSchoolTier, setActiveSchoolTier] = useState<SchoolTier | null>(() => savedCampusState?.tier || null);
    const [activeRoom, setActiveRoom] = useState<SchoolZone | null>(() => savedCampusState?.room || null);
    const [activeDormRoom, setActiveDormRoom] = useState<{ gender: '남성' | '여성'; grade: 1 | 2 | 3; label: string } | null>(() => savedCampusState?.dormRoom || null);
    const [activeClubRoom, setActiveClubRoom] = useState<ClubType | null>(() => savedCampusState?.clubRoom || null);
    const [activeClassRoomSubject, setActiveClassRoomSubject] = useState<ClassroomSubjectType | null>(() => savedCampusState?.classRoomSubject || null);
    useEffect(() => {
        try {
            sessionStorage.setItem(
                'shinryoku_school_campus_state',
                JSON.stringify({
                    charId: character.id,
                    tier: activeSchoolTier,
                    room: activeRoom,
                    dormRoom: activeDormRoom,
                    clubRoom: activeClubRoom,
                    classRoomSubject: activeClassRoomSubject
                })
            );
        } catch {}
    }, [character.id, activeSchoolTier, activeRoom, activeDormRoom, activeClubRoom, activeClassRoomSubject]);
    const [openModalZone, setOpenModalZone] = useState<SchoolZone | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
    const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);
    const [activeDialogue, setActiveDialogue] = useState<{
        id?: string;
        name: string;
        role: string;
        text: string;
        gender?: RpgSpriteGenderKey;
        zone?: SchoolZone;
        canBondAndSpar?: boolean;
        isTeacher?: boolean;
        npcLevel?: number;
        combatStyle?: CombatStyle;
    } | null>(null);
    const [showAttendanceDirect, setShowAttendanceDirect] = useState(false);
    const [showReportDirect, setShowReportDirect] = useState(false);
    const [activeDivineBook, setActiveDivineBook] = useState<DivineBookDef | null>(null);
    const [activeClubApply, setActiveClubApply] = useState<typeof CLUB_DESK_SPECS[number] | null>(null);
    const [showClubVisualModal, setShowClubVisualModal] = useState(false);
    const [activeSubjectRoom, setActiveSubjectRoom] = useState<typeof CLASSROOM_SUBJECT_ROOMS[number] | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('Sword');
    const [activityProgress, setActivityProgress] = useState<{ title: string; subtitle: string; progress: number } | null>(null);
    const [campusToast, setCampusToast] = useState<string | null>(null);
    const [aiChatMode, setAiChatMode] = useState(false);
    const [aiChatMessages, setAiChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [isAiChatLoading, setIsAiChatLoading] = useState(false);

    useEffect(() => {
        setAiChatMode(false);
        setAiChatMessages([]);
        setAiChatInput('');
        setIsAiChatLoading(false);
    }, [activeDialogue?.id, activeDialogue?.name]);

    const campusPeriodNotice = useMemo<{ kind: 'exam' | 'tournament'; badge: string; detail: string } | null>(() => {
        const sc = character.schoolData;
        if (!sc) return null;
        const dateStr = character.currentDate || '1026-01-01';
        const parts = dateStr.split('-');
        const currentMonth = parseInt(parts[1] || '1', 10) || 1;
        const currentYearMonth = `${parts[0] || '1026'}-${parts[1] || '01'}`;
        if (sc.tier === 'Elementary' && sc.grade === 3 && currentMonth === 11 && sc.lastTournamentDate !== currentYearMonth) {
            return { kind: 'tournament', badge: '⚔️ 초급부 학교 1:1 토너먼트 기간', detail: '교무실 또는 학교 메뉴에서 토너먼트에 참가하세요!' };
        }
        if (sc.tier === 'Middle' && sc.grade === 3 && currentMonth === 11 && sc.lastTournamentDate !== currentYearMonth) {
            return { kind: 'tournament', badge: '⚔️ 중급부 학교 1:1 토너먼트 기간', detail: '교무실 또는 학교 메뉴에서 토너먼트에 참가하세요!' };
        }
        if (sc.tier === 'High' && sc.grade === 3 && sc.lastTournamentDate !== currentYearMonth) {
            if (currentMonth === 5) return { kind: 'tournament', badge: '⚔️ 고급부 교내 토너먼트 기간', detail: '교무실에서 교내 토너먼트에 참가할 수 있습니다!' };
            if (currentMonth === 8) return { kind: 'tournament', badge: '🌏 고급부 국가 대항전 기간', detail: '고급부 3학년 국가 대항전 토너먼트가 열렸습니다!' };
            if (currentMonth === 12) return { kind: 'tournament', badge: '👑 세계 토너먼트 (월드컵) 기간', detail: '세계 토너먼트(월드컵)가 개막했습니다!' };
        }
        if (currentMonth === 6 && !sc.midtermPassed) {
            return { kind: 'exam', badge: '📝 중간고사 기간', detail: '교무실에서 중간고사에 응시하세요!' };
        }
        if (currentMonth === 12 && !sc.finalPassed) {
            return { kind: 'exam', badge: '🏆 기말·진급시험 기간', detail: '교무실에서 기말·진급시험에 응시하세요!' };
        }
        return null;
    }, [character.schoolData, character.currentDate]);

    const resolveNpcVisual = useCallback(
        (id: string | undefined, name: string, gender: RpgSpriteGenderKey = 'female', isTeacher?: boolean): string => {
            if (isTeacher && character.schoolData?.homeroomTeacher?.visualUrl) {
                return character.schoolData.homeroomTeacher.visualUrl;
            }
            const cm = character.schoolData?.classmates?.find(c => (id && c.id === id) || c.name === name);
            if (cm?.visualUrl) return cm.visualUrl;
            const sn = character.socialNetwork?.find(s => (id && s.id === id) || s.name === name);
            if (sn?.visualUrl) return sn.visualUrl;
            const cp = character.companions?.find(c => (id && c.id === id) || c.name === name);
            if (cp?.visualUrl) return cp.visualUrl;
            return generateDefaultVisualUrl(name, nation, character.race || '인간', gender === 'male' ? '남성' : '여성');
        },
        [character.schoolData?.homeroomTeacher, character.schoolData?.classmates, character.socialNetwork, character.companions, character.race, nation]
    );

    const cultureKey = useMemo(() => resolveCityCultureKey(region, nation, city), [region, nation, city]);
    const academyTileCulture = useMemo(() => resolveAcademyTileCulture(cultureKey), [cultureKey]);
    const academyBuildingFolder = useMemo(() => resolveAcademyBuildingFolder(cultureKey), [cultureKey]);
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

    const activeEternalRival = useMemo(
        () =>
            [...(character.socialNetwork || []), ...(character.schoolData?.classmates || [])].find(
                n => n && n.isEternalRival && !n.isPurged && !n.isDead
            ) || null,
        [character.socialNetwork, character.schoolData?.classmates]
    );

    // Diverse student NPCs outside in the School Plaza (distinct from interior room NPCs; at night students return to dorms)
    const isSchoolNight = isNightTime(character.currentTime);
    const plazaStudents = useMemo<SchoolNpcActor[]>(() => {
        const isKorean = !nation || nation.includes('한국') || nation.includes('대한') || nation.includes('조선') || nation.includes('고려');
        const rivalPlazaActor: SchoolNpcActor[] = activeEternalRival
            ? [
                  {
                      id: activeEternalRival.id || 'school_eternal_rival',
                      name: activeEternalRival.name,
                      role: '🔥 영원의 라이벌',
                      tx: 16.5,
                      ty: 10.2,
                      gender: activeEternalRival.gender === '남성' ? 'male' : 'female',
                      dialogue: `네가 이 레귤러스 학교에서 수련 중이라길래 나도 실력을 겨루러 왔다, ${character.name}!`,
                      canBondAndSpar: true,
                      npcLevel: activeEternalRival.level || Math.max(5, character.level || 5),
                      combatStyle: activeEternalRival.combatStyle || CombatStyle.SWORDSMAN
                  }
              ]
            : [];
        if (isSchoolNight) {
            return [
                {
                    id: 'stu_night_patrol',
                    name: isKorean ? '차예린' : generateName(nation),
                    role: '선도부 야간 순찰원',
                    tx: 13.5,
                    ty: 12.2,
                    gender: 'female',
                    dialogue: '밤이 깊어 모든 학우들은 기숙사로 복귀했습니다. 교무실·강의실·대도서관·연무장·동아리동은 야간 폐쇄 중이며 기숙사만 이용할 수 있습니다.'
                },
                ...rivalPlazaActor
            ];
        }
        return [
            ...rivalPlazaActor,
            {
                id: 'stu_elem_1',
                npcLevel: 4,
                name: isKorean ? '한소희' : generateName(nation),
                role: '초급 레귤러스 1학년',
                tx: 5.5,
                ty: 11.5,
                gender: 'female',
                dialogue: '오늘 첫 실기 수업이라 엄청 떨려요! 기초 검술 자세부터 열심히 연습하고 있어요.'
            },
            {
                id: 'stu_elem_2',
                npcLevel: 13,
                name: isKorean ? '김민준' : generateName(nation),
                role: '초급 레귤러스 3학년',
                tx: 8.5,
                ty: 13.5,
                gender: 'male',
                dialogue: '곧 중급부 진급 시험이 있어요! 도서관에서 기초 마법 이론을 더 보고 가려고요.'
            },
            {
                id: 'stu_mid_1',
                npcLevel: 28,
                name: isKorean ? '박지훈' : generateName(nation),
                role: '중급 검술부 에이스',
                tx: 12.2,
                ty: 10.5,
                gender: 'male',
                dialogue: '중급부 연무장은 시설이 꽤 좋아요. 대련 상대가 필요하면 언제든 말 걸어주세요!'
            },
            {
                id: 'stu_mid_2',
                npcLevel: 22,
                name: isKorean ? '최유진' : generateName(nation),
                role: '중급 도서부원',
                tx: 16.5,
                ty: 12.8,
                gender: 'female',
                dialogue: '요즘 레귤러스 대도서관에 고대 신력에 관한 희귀 서적이 새로 들어왔대요.'
            },
            {
                id: 'stu_high_1',
                npcLevel: 52,
                name: isKorean ? '이서연' : generateName(nation),
                role: '고급 아카데미 수석',
                tx: 20.5,
                ty: 11.2,
                gender: 'female',
                dialogue: '고급 레귤러스에서는 졸업 후 기사단이나 용병 길드로 바로 진출할 수 있는 실전 과정을 배웁니다.'
            },
            {
                id: 'stu_high_2',
                npcLevel: 46,
                name: isKorean ? '송시우' : generateName(nation),
                role: '고급부 안내 위원',
                tx: 22.8,
                ty: 14.0,
                gender: 'male',
                dialogue: `${city} 레귤러스 학교 지구에 오신 걸 환영합니다. 각 학부 건물은 재학생과 파견 교관만 출입할 수 있습니다.`
            }
        ];
    }, [city, nation, isSchoolNight, activeEternalRival, character.name, character.level]);

    const campusDims = useMemo(() => {
        if (activeRoom) return { cols: ROOM_COLS, rows: ROOM_ROWS };
        if (!activeSchoolTier) return { cols: PLAZA_COLS, rows: PLAZA_ROWS };
        if (activeSchoolTier === 'Elementary') return { cols: 26, rows: 18 };
        if (activeSchoolTier === 'Middle') return { cols: 30, rows: 20 };
        return { cols: 34, rows: 22 };
    }, [activeSchoolTier, activeRoom]);

    const campusStudents = useMemo<SchoolNpcActor[]>(() => {
        if (!activeSchoolTier || activeRoom) return [];
        const c = campusDims.cols;
        const r = campusDims.rows;
        const isKorean = !nation || nation.includes('한국') || nation.includes('대한') || nation.includes('조선') || nation.includes('고려');
        const tierLabel = activeSchoolTier === 'Elementary' ? '초급' : activeSchoolTier === 'Middle' ? '중급' : '고급';
        const classmates = character.schoolData?.classmates || [];
        const classNum = character.schoolData?.classNumber || 1;
        const gradeNum = character.schoolData?.grade || 1;

        const classActors: SchoolNpcActor[] = classmates.slice(0, 4).map((cm, idx) => {
            const coords = [
                { tx: Math.floor(c * 0.25), ty: Math.floor(r * 0.45) },
                { tx: Math.floor(c * 0.75), ty: Math.floor(r * 0.45) },
                { tx: Math.floor(c * 0.35), ty: Math.floor(r * 0.85) },
                { tx: Math.floor(c * 0.65), ty: Math.floor(r * 0.85) }
            ][idx];
            return {
                id: cm.id || `campus_mate_${idx}`,
                name: cm.name,
                role: `${tierLabel} ${gradeNum}학년 ${classNum}반 학우`,
                tx: coords.tx,
                ty: coords.ty,
                gender: cm.gender === '여성' ? 'female' : 'male',
                dialogue: `안녕 ${character.name}! 오늘 수업 끝나고 같이 대련이나 동아리 활동 어때?`,
                canBondAndSpar: true,
                npcLevel: Math.max(3, (character.level || 5) + (idx % 2))
            };
        });

        const extraSpecs = [
            { ko: '윤하늘', gender: 'female' as const, role: `${tierLabel} 1학년`, tx: Math.floor(c * 0.16), ty: Math.floor(r * 0.46), line: '교무실 앞 산책로가 정말 예쁘지 않나요? 잠깐 쉬어가기 좋아요!' },
            { ko: '서준혁', gender: 'male' as const, role: `${tierLabel} 2학년 검술부`, tx: Math.floor(c * 0.84), ty: Math.floor(r * 0.46), line: '실전 연무장에서 다들 열심히 훈련하고 있어! 너도 참가해볼래?' },
            { ko: '강민지', gender: 'female' as const, role: `${tierLabel} 3학년 도서부`, tx: Math.floor(c * 0.82), ty: Math.floor(r * 0.86), line: '대도서관에 신력 이론 서적이 많이 들어왔으니 꼭 들러보세요.' },
            { ko: '박시우', gender: 'male' as const, role: `${tierLabel} 2학년 학생회`, tx: Math.floor(c * 0.18), ty: Math.floor(r * 0.86), line: '동아리동에서 신규 부원을 모집하고 있어요. 관심 있으면 들러보세요!' }
        ];
        const extraActors: SchoolNpcActor[] = extraSpecs
            .filter(sp => !classActors.some(ca => ca.name === sp.ko))
            .map((sp, idx) => ({
                id: `campus_stu_${activeSchoolTier}_${idx}`,
                name: isKorean ? sp.ko : generateName(nation),
                role: sp.role,
                tx: sp.tx,
                ty: sp.ty,
                gender: sp.gender,
                dialogue: sp.line,
                canBondAndSpar: true,
                npcLevel: Math.max(3, (character.level || 5) + idx)
            }));

        return [...classActors, ...extraActors];
    }, [activeSchoolTier, activeRoom, campusDims.cols, campusDims.rows, character.schoolData?.classmates, character.schoolData?.classNumber, character.schoolData?.grade, character.level, character.name, nation]);

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
        const isKorean = !nation || nation.includes('한국') || nation.includes('대한') || nation.includes('조선') || nation.includes('고려');
        const teacherName = character.schoolData?.homeroomTeacher?.name || (isKorean ? '김서연' : generateName(nation));
        const classmates = character.schoolData?.classmates || [];
        const c1Obj = classmates[0];
        const c2Obj = classmates[1];
        const c1 = c1Obj?.name || (isKorean ? '이하은' : generateName(nation));
        const c2 = c2Obj?.name || (isKorean ? '박준혁' : generateName(nation));
        const c1Gender: RpgSpriteGenderKey = c1Obj ? (c1Obj.gender === '남성' ? 'male' : 'female') : 'female';
        const c2Gender: RpgSpriteGenderKey = c2Obj ? (c2Obj.gender === '남성' ? 'male' : 'female') : 'male';
        const playerGrade = character.schoolData?.grade || 1;
        const curTier = activeSchoolTier || 'Elementary';
        const tierLabel = curTier === 'Elementary' ? '초급부' : curTier === 'Middle' ? '중급부' : '고급부';
        const baseAge = curTier === 'Elementary' ? 11 : curTier === 'Middle' ? 14 : 17;

        switch (activeRoom) {
            case 'Office':
                return {
                    props: [
                        { key: 'bookshelf', tx: 2, ty: 1.8, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 14, ty: 1.8, w: 2, h: 2 },
                        { key: 'attendance_desk', tx: 4, ty: 4.8, w: 2, h: 1.8, interactKind: 'attendance', label: '📋 출석부 열람' },
                        { key: 'report_cabinet', tx: 12, ty: 4.8, w: 2, h: 1.8, interactKind: 'report', label: '📊 성적표 확인' },
                        { key: 'student_desk', tx: 8, ty: 3.2, w: 2, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_teacher', name: teacherName, role: '담임 교사', tx: 9, ty: 2.7, gender: 'female', dialogue: '학업 성적, 진로 상담, 승급 시험까지 무엇이든 편하게 이야기해보세요.', opensZone: 'Office', canBondAndSpar: true, isTeacher: true },
                        { id: 'npc_vice', name: isKorean ? '정우성' : generateName(nation), role: '교무처 학사 행정관', tx: 5.5, ty: 6.5, gender: 'male', dialogue: '양옆의 출석부 열람대와 성적표 보관함에서 바로 서류를 확인하실 수 있습니다.' }
                    ]
                };
            case 'Classroom': {
                if (activeClassRoomSubject) {
                    const subj = CLASSROOM_SUBJECT_ROOMS.find(s => s.type === activeClassRoomSubject) || CLASSROOM_SUBJECT_ROOMS[0];
                    const isMartial = subj.type === 'Combat' || subj.type === 'Physical' || subj.type === 'Weapon';
                    const isArcane = subj.type === 'Magic' || subj.type === 'Strategy';
                    const subjectInstructorMap: Record<string, { name: string; gender: 'male' | 'female' }> = {
                        Combat: { name: isKorean ? '이현석' : generateName(nation), gender: 'male' },
                        Magic: { name: isKorean ? '박세은' : generateName(nation), gender: 'female' },
                        Control: { name: isKorean ? '조민재' : generateName(nation), gender: 'male' },
                        Strategy: { name: isKorean ? '최다혜' : generateName(nation), gender: 'female' },
                        Physical: { name: isKorean ? '김도윤' : generateName(nation), gender: 'male' },
                        Weapon: { name: isKorean ? '윤정아' : generateName(nation), gender: 'female' },
                    };
                    const subjInst = subjectInstructorMap[subj.type] || { name: isKorean ? '이현석' : generateName(nation), gender: 'male' as const };
                    return {
                        props: [
                            { key: 'blackboard', tx: 7.8, ty: 1.4, w: 2.6, h: 1.8 },
                            {
                                key: 'lectern_podium',
                                tx: 8.1,
                                ty: 3.1,
                                w: 1.8,
                                h: 1.8,
                                interactKind: 'subject_room' as const,
                                subjectType: subj.type,
                                label: `🎓 ${subj.title} 수업 수강 (${subj.statLabel})`
                            },
                            ...(isMartial
                                ? [
                                      { key: 'weapon_rack', tx: 2.2, ty: 1.8, w: 2.0, h: 2.0 },
                                      { key: 'dummy_wood', tx: 13.6, ty: 2.0, w: 1.8, h: 1.8 }
                                  ]
                                : isArcane
                                  ? [
                                        { key: 'arcane_table', tx: 2.2, ty: 2.0, w: 2.0, h: 2.0 },
                                        { key: 'bookshelf', tx: 13.6, ty: 1.8, w: 2.0, h: 2.0 }
                                    ]
                                  : [
                                        { key: 'book_sun', tx: 2.2, ty: 2.0, w: 1.8, h: 1.8 },
                                        { key: 'arcane_table', tx: 13.6, ty: 2.0, w: 2.0, h: 2.0 }
                                    ]),
                            { key: 'student_desk', tx: 3.5, ty: 6.2, w: 1.6, h: 1.5 },
                            { key: 'student_desk', tx: 8.2, ty: 6.2, w: 1.6, h: 1.5 },
                            { key: 'student_desk', tx: 12.9, ty: 6.2, w: 1.6, h: 1.5 }
                        ],
                        npcs: (() => {
                            const subjIdx = Math.max(0, CLASSROOM_SUBJECT_ROOMS.findIndex(r => r.type === subj.type));
                            const fallbacks: [string, string][] = [
                                ['이도현', '박서윤'],
                                ['정민수', '김채원'],
                                ['오태양', '한유리'],
                                ['신지호', '배수아'],
                                ['류현성', '송지은'],
                                ['임건우', '문하은']
                            ];
                            const [fb1, fb2] = fallbacks[subjIdx % fallbacks.length];
                            const s1Idx = 2 + subjIdx * 2;
                            const s2Idx = 3 + subjIdx * 2;
                            const s1Obj = classmates[s1Idx];
                            const s2Obj = classmates[s2Idx];
                            const s1Name = s1Obj?.name || (isKorean ? fb1 : generateName(nation));
                            const s2Name = s2Obj?.name || (isKorean ? fb2 : generateName(nation));
                            const s1Gender: RpgSpriteGenderKey = s1Obj?.gender === '남성' ? 'male' : s1Obj?.gender === '여성' ? 'female' : 'male';
                            const s2Gender: RpgSpriteGenderKey = s2Obj?.gender === '남성' ? 'male' : s2Obj?.gender === '여성' ? 'female' : 'female';
                            const tierFb = activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41;
                            return [
                                {
                                    id: `npc_subj_inst_${subj.type}`,
                                    name: subjInst.name,
                                    role: `${subj.title} 담당 교관`,
                                    tx: 6.4,
                                    ty: 3.3,
                                    gender: subjInst.gender,
                                    dialogue: `${subj.title}에 잘 왔어요! 앞의 교탁(${subj.statLabel})으로 다가가면 정규 수업을 수강할 수 있습니다.`,
                                    opensZone: 'Classroom' as SchoolZone
                                },
                                {
                                    id: s1Obj?.id || `npc_subj_${subj.type}_stu1`,
                                    name: s1Name,
                                    role: `${subj.title} 수강 학우`,
                                    tx: 4.5,
                                    ty: 8.2,
                                    gender: s1Gender,
                                    dialogue: `${subj.title} 수업은 ${subj.statLabel} 성장에 정말 도움이 많이 돼요!`,
                                    canBondAndSpar: true,
                                    npcLevel: s1Obj?.level || tierFb
                                },
                                {
                                    id: s2Obj?.id || `npc_subj_${subj.type}_stu2`,
                                    name: s2Name,
                                    role: `${subj.title} 수강 학우`,
                                    tx: 13.5,
                                    ty: 8.2,
                                    gender: s2Gender,
                                    dialogue: `${subj.title} 실기 평가 전에 잠깐 실력 테스트로 대련 한 판 어때?`,
                                    canBondAndSpar: true,
                                    npcLevel: s2Obj?.level || (tierFb + 2)
                                }
                            ];
                        })()
                    };
                }
                // 기숙사 복도 안내 교관은 교무실 담임과 겹치지 않는 전임 교관 배치
                return {
                    props: [
                        ...CLASSROOM_SUBJECT_ROOMS.map((sr, idx) => ({
                            key: 'hallway_door',
                            tx: idx % 3 === 0 ? 2.1 : idx % 3 === 1 ? 7.6 : 13.1,
                            ty: idx < 3 ? 2.6 : 7.4,
                            w: 1.8,
                            h: 1.8,
                            interactKind: 'enter_subject_room' as const,
                            subjectType: sr.type,
                            label: `🚪 ${sr.title} (${sr.statLabel})`
                        }))
                    ],
                    npcs: [
                        { id: 'npc_lect', name: isKorean ? '강혜진' : generateName(nation), role: '강의실 안내 교관', tx: 9, ty: 5.0, gender: 'female', dialogue: '각 과목 강의실 문을 통해 입장한 뒤 교탁에서 수업을 수강하세요!', opensZone: 'Classroom' },
                        { id: c1Obj?.id || 'npc_stu1', name: c1, role: '같은 반 학우', tx: 5.2, ty: 10.2, gender: c1Gender, dialogue: '어느 과목 강의실로 들어갈래요? 복도 문으로 들어가면 바로 수업할 수 있어요!', canBondAndSpar: true, npcLevel: c1Obj?.level || (activeSchoolTier === 'Elementary' ? 6 : activeSchoolTier === 'Middle' ? 21 : 38) },
                        { id: c2Obj?.id || 'npc_stu2', name: c2, role: '같은 반 학우', tx: 13.2, ty: 10.2, gender: c2Gender, dialogue: '강의실 복도가 깔끔하게 정리됐네. 난 전투학실부터 들어갈 거야!', canBondAndSpar: true, npcLevel: c2Obj?.level || (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) }
                    ]
                };
            }
            case 'Library': {
                const isSenior = playerGrade < 3;
                const readerGrade = isSenior ? Math.min(3, playerGrade + 1) : Math.max(1, playerGrade - 1);
                const readerAge = baseAge + readerGrade - 1;
                const relLabel = isSenior ? '선배' : '후배';
                const readerName = isKorean ? (isSenior ? '서지민' : '윤하늘') : generateName(nation);
                return {
                    props: [
                        { key: 'bookshelf', tx: 2.2, ty: 2.0, w: 2, h: 2, interactKind: 'divine_book', bookDef: ACADEMY_DIVINE_BOOKS[0], label: '📘 기초 마법 이론서 열람' },
                        { key: 'bookshelf', tx: 6.2, ty: 2.0, w: 2, h: 2, interactKind: 'divine_book', bookDef: ACADEMY_DIVINE_BOOKS[1], label: '📜 대륙 및 신계 역사서 열람' },
                        { key: 'bookshelf', tx: 10.2, ty: 2.0, w: 2, h: 2 },
                        { key: 'bookshelf', tx: 13.8, ty: 2.0, w: 2, h: 2 },
                        { key: 'book_sun', tx: 3.2, ty: 6.2, w: 1.8, h: 1.8, interactKind: 'divine_book', bookDef: ACADEMY_DIVINE_BOOKS[2], label: '☀️ 태양 신력서 열람' },
                        { key: 'book_element', tx: 8.2, ty: 6.2, w: 1.8, h: 1.8, interactKind: 'divine_book', bookDef: ACADEMY_DIVINE_BOOKS[3], label: '🔥 원소 신력 비전 열람' },
                        { key: 'book_abyss', tx: 13.2, ty: 6.2, w: 1.8, h: 1.8, interactKind: 'divine_book', bookDef: ACADEMY_DIVINE_BOOKS[4], label: '🔮 금서: 심연 신력론 열람' }
                    ],
                    npcs: [
                        { id: 'npc_lib', name: isKorean ? '한수진' : generateName(nation), role: '대도서관 수석 사서', tx: 9, ty: 4.2, gender: 'female', dialogue: '마법 이론·역사서부터 신력 제어 비전까지, 원하는 서적을 직접 정독해보세요. (1회 정독 시 3일 경과)' },
                        {
                            id: 'npc_reader',
                            name: readerName,
                            role: `${tierLabel} ${readerGrade}학년 ${relLabel} (${readerAge}세)`,
                            tx: 6,
                            ty: 8.4,
                            gender: isSenior ? 'male' : 'female',
                            dialogue: isSenior
                                ? `안녕 후배! ${tierLabel} 도서관 서적들은 신력 제어력(CTRL)을 기르는 데 정말 큰 도움이 돼.`
                                : `선배님 안녕하세요! 저도 ${tierLabel} 마법 이론서를 보면서 열심히 공부하고 있어요!`,
                            canBondAndSpar: true,
                            npcLevel: activeSchoolTier === 'Elementary' ? (isSenior ? 14 : 5) : activeSchoolTier === 'Middle' ? (isSenior ? 29 : 19) : (isSenior ? 49 : 36)
                        }
                    ]
                };
            }
            case 'Training':
                return {
                    props: [
                        { key: 'dummy_wood', tx: 4, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'dummy_arcane', tx: 9, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'dummy_wood', tx: 13, ty: 3, w: 1.8, h: 1.8 },
                        { key: 'dummy_arcane', tx: 4, ty: 7, w: 1.8, h: 1.8 },
                        { key: 'dummy_wood', tx: 13, ty: 7, w: 1.8, h: 1.8 }
                    ],
                    npcs: [
                        { id: 'npc_trainer', name: isKorean ? '백무진' : generateName(nation), role: '수석 무술 교관', tx: 9, ty: 5.5, gender: 'male', dialogue: '실전 수련과 대련을 시작하려면 말을 걸어라!', opensZone: 'Training' },
                        { id: 'npc_spar', name: isKorean ? '송아린' : generateName(nation), role: '무술부 생도', tx: 5, ty: 6.5, gender: 'female', dialogue: '오늘도 기초 체력과 무기 숙련도를 100회씩 단련하는 중이에요!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) }
                    ]
                };
            case 'Club': {
                const joinedClub = character.clubData?.joinedClub || ClubType.NONE;
                if (activeClubRoom) {
                    const clubSpec = CLUB_DESK_SPECS.find(c => c.club === activeClubRoom);
                    const clubNpcs: Record<string, SchoolNpcActor[]> = {
                        [ClubType.MELEE]: [
                            { id: 'npc_club_melee', name: isKorean ? '강태오' : generateName(nation), role: '근접 무기부 부장', tx: 4.5, ty: 4.5, gender: 'male', dialogue: '검과 창의 극의를 함께 수련하지 않을래? 대련도 언제든 환영이야!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3, combatStyle: CombatStyle.SWORDSMAN },
                            { id: 'npc_club_melee_2', name: isKorean ? '임지훈' : generateName(nation), role: '근접 무기부 부원', tx: 12.5, ty: 5.5, gender: 'male', dialogue: '오늘도 목검 휘두르기 500회 완료했어!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41), combatStyle: CombatStyle.SWORDSMAN },
                        ],
                        [ClubType.RANGED]: [
                            { id: 'npc_club_ranged', name: isKorean ? '신유나' : generateName(nation), role: '원거리 무기부 부장', tx: 4.5, ty: 4.5, gender: 'female', dialogue: '백발백중의 정밀 사격을 배우고 싶다면 바람의 흐름을 읽어!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3, combatStyle: CombatStyle.ARCHER },
                            { id: 'npc_club_ranged_2', name: isKorean ? '한별' : generateName(nation), role: '원거리 무기부 부원', tx: 12.5, ty: 5.5, gender: 'female', dialogue: '새로 맞춘 활 시위 탄성이 정말 좋네요.', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41), combatStyle: CombatStyle.ARCHER },
                        ],
                        [ClubType.MAGIC_ENG]: [
                            { id: 'npc_club_magic', name: isKorean ? '최민혁' : generateName(nation), role: '마법 공학부 부장', tx: 4.5, ty: 4.5, gender: 'male', dialogue: '신력과 마도 공학의 결합은 무궁무진해. 한 번 겨뤄볼래?', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 5, combatStyle: CombatStyle.MAGE },
                            { id: 'npc_club_magic_2', name: isKorean ? '윤서아' : generateName(nation), role: '마법 공학부 연구원', tx: 12.5, ty: 5.5, gender: 'female', dialogue: '신력 증폭 회로 효율이 어제보다 12% 올랐어요!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41), combatStyle: CombatStyle.MAGE },
                        ],
                        [ClubType.COUNCIL]: [
                            { id: 'npc_club_council', name: isKorean ? '오서현' : generateName(nation), role: '학생회장', tx: 4.5, ty: 4.5, gender: 'female', dialogue: '학교의 질서와 축제를 함께 기획할 유능한 학우가 와서 든든해.', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 7 },
                            { id: 'npc_club_council_2', name: isKorean ? '도진우' : generateName(nation), role: '학생회 부회장', tx: 12.5, ty: 5.5, gender: 'male', dialogue: '예산안 결재와 동아리 지원금 정산 중이에요.', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3 },
                        ],
                        [ClubType.DISCIPLINARY]: [
                            { id: 'npc_club_disc', name: isKorean ? '장현우' : generateName(nation), role: '선도부장', tx: 4.5, ty: 4.5, gender: 'male', dialogue: '교내 치안을 지키는 선도부다. 실력 검증 대련을 해볼 텐가?', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 7, combatStyle: CombatStyle.SPEARMAN },
                            { id: 'npc_club_disc_2', name: isKorean ? '차예린' : generateName(nation), role: '선도부원', tx: 12.5, ty: 5.5, gender: 'female', dialogue: '야간 순찰 준비 완료! 교칙 위반자는 용납하지 않아요.', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3, combatStyle: CombatStyle.SPEARMAN },
                        ],
                    };
                    return {
                        props: [
                            { key: 'bookshelf', tx: 2.2, ty: 1.8, w: 2, h: 2 },
                            { key: 'bookshelf', tx: 13.8, ty: 1.8, w: 2, h: 2 },
                            { key: 'club_desk', tx: 8.0, ty: 2.6, w: 2.2, h: 1.8, interactKind: 'club_activity', label: `🎭 ${clubSpec?.title || activeClubRoom} 활동 (ClubModal)` },
                            { key: activeClubRoom === ClubType.MELEE || activeClubRoom === ClubType.DISCIPLINARY ? 'dummy_wood' : 'dummy_arcane', tx: 3.5, ty: 7.5, w: 1.8, h: 1.8 },
                            { key: 'student_desk', tx: 12.5, ty: 7.5, w: 1.8, h: 1.6 }
                        ],
                        npcs: clubNpcs[activeClubRoom] || []
                    };
                }
                return {
                    props: [
                        ...CLUB_DESK_SPECS.map((spec, idx) => ({
                            key: 'hallway_door',
                            tx: idx === 0 ? 2.1 : idx === 1 ? 7.6 : idx === 2 ? 13.1 : idx === 3 ? 3.1 : 12.1,
                            ty: idx < 3 ? 2.6 : 7.4,
                            w: 1.8,
                            h: 1.8,
                            interactKind: 'club_desk' as const,
                            clubType: spec.club,
                            label: joinedClub === spec.club ? `🚪 ${spec.title} 입장` : `📌 ${spec.title} 가입 신청`
                        }))
                    ],
                    npcs: [
                        { id: 'npc_club_melee', name: isKorean ? '강태오' : generateName(nation), role: '근접 무기부', tx: 3.8, ty: 4.0, gender: 'male', dialogue: '검과 창의 극의를 함께 수련하지 않을래? 대련도 언제든 환영이야!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3, combatStyle: CombatStyle.SWORDSMAN },
                        { id: 'npc_club_ranged', name: isKorean ? '신유나' : generateName(nation), role: '원거리 무기부', tx: 9.5, ty: 4.0, gender: 'female', dialogue: '백발백중의 정밀 사격을 배우고 싶다면 원거리 무기부로 들어와!', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3, combatStyle: CombatStyle.ARCHER },
                        { id: 'npc_club_magic', name: isKorean ? '최민혁' : generateName(nation), role: '마법 공학부', tx: 15.0, ty: 4.0, gender: 'male', dialogue: '신력과 마도 공학의 결합은 무궁무진해. 한 번 겨뤄볼래?', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 5, combatStyle: CombatStyle.MAGE },
                        { id: 'npc_club_council', name: isKorean ? '오서현' : generateName(nation), role: '학생회', tx: 5.5, ty: 8.6, gender: 'female', dialogue: '학교의 질서와 축제를 함께 기획할 유능한 학우를 찾고 있어.', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 7, opensZone: 'Club' },
                        { id: 'npc_club_disc', name: isKorean ? '장현우' : generateName(nation), role: '선도부', tx: 14.0, ty: 8.6, gender: 'male', dialogue: '교내 치안을 지키는 선도부다. 실력 검증 대련을 해볼 텐가?', canBondAndSpar: true, npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 7, combatStyle: CombatStyle.SPEARMAN }
                    ]
                };
            }
            case 'Dormitory': {
                if (!activeDormRoom) {
                    return {
                        props: [
                            ...DORM_ROOM_DOORS.map((door, idx) => ({
                                key: 'hallway_door',
                                tx: idx % 3 === 0 ? 2.1 : idx % 3 === 1 ? 7.6 : 13.1,
                                ty: idx < 3 ? 2.6 : 7.4,
                                w: 1.8,
                                h: 1.8,
                                interactKind: 'dorm_door' as const,
                                dormDoor: door,
                                label: `🚪 ${door.label}`
                            }))
                        ],
                        npcs: [
                            { id: 'npc_dorm', name: isKorean ? '박성호' : generateName(nation), role: '기숙사 사감', tx: 9, ty: 5.0, gender: 'male', dialogue: '본인 성별과 학년에 맞는 기숙사 방으로만 입장할 수 있습니다. 타 호실 무단 출입 시 퇴실 조치됩니다.', opensZone: 'Dormitory' }
                        ]
                    };
                }
                const roomGenderKey: RpgSpriteGenderKey = activeDormRoom.gender === '남성' ? 'male' : 'female';
                const matchingClassmates = classmates.filter(
                    cm => (cm.gender === '남성' ? 'male' : 'female') === roomGenderKey
                );
                const roomClassmates = matchingClassmates.slice(0, 4).map((cm, idx) => ({
                    id: cm.id || `dorm_mate_${idx}`,
                    name: cm.name,
                    role: `${activeDormRoom.label} (${character.schoolData?.classNumber || 1}반) 동기`,
                    tx: 3.0 + (idx % 2) * 5.0,
                    ty: 4.8 + Math.floor(idx / 2) * 3.2,
                    gender: roomGenderKey,
                    dialogue: `기숙사 ${activeDormRoom.label}에서 쉬니까 컨디션이 확 살아나네! 친선 대련 한 판 어때?`,
                    canBondAndSpar: true,
                    npcLevel: cm.level || Math.max(3, character.level || 5)
                }));
                if (roomClassmates.length === 0) {
                    roomClassmates.push(
                        {
                            id: 'dorm_mate_default_1',
                            name: isKorean ? (roomGenderKey === 'male' ? '이도현' : '김채린') : generateName(nation),
                            role: `${activeDormRoom.label} 동기`,
                            tx: 3.5,
                            ty: 5.0,
                            gender: roomGenderKey,
                            dialogue: '같은 학년 기숙사 동기끼리 친하게 지내자! 대련도 언제든 환영이야.',
                            canBondAndSpar: true,
                            npcLevel: Math.max(3, character.level || 5)
                        },
                        {
                            id: 'dorm_mate_default_2',
                            name: isKorean ? (roomGenderKey === 'male' ? '정태윤' : '송지아') : generateName(nation),
                            role: `${activeDormRoom.label} 다른 반 동기`,
                            tx: 8.5,
                            ty: 5.0,
                            gender: roomGenderKey,
                            dialogue: '반은 달라도 같은 학년 기숙사잖아! 오늘 수업 어땠어?',
                            canBondAndSpar: true,
                            npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3
                        }
                    );
                }
                // 기숙사 전용 사생들 (교정/강의실 NPC와 겹치지 않음) + 야간에는 교정 학생들도 기숙사로 복귀
                const dormResidents: SchoolNpcActor[] = [
                    {
                        id: 'dorm_res_1',
                        name: isKorean ? (roomGenderKey === 'male' ? '강민재' : '윤채원') : generateName(nation),
                        role: `${activeDormRoom.label} 기숙사 사생`,
                        tx: 13.0,
                        ty: 4.8,
                        gender: roomGenderKey,
                        dialogue: isSchoolNight
                            ? '밤이 늦어서 다들 기숙사로 들어왔어. 내일 수업을 위해 푹 쉬자!'
                            : '기숙사 방이 조용해서 혼자 마력 명상하기 좋네.',
                        canBondAndSpar: true,
                        npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41)
                    },
                    {
                        id: 'dorm_res_2',
                        name: isKorean ? (roomGenderKey === 'male' ? '서준영' : '한예지') : generateName(nation),
                        role: `${activeDormRoom.label} 룸메이트`,
                        tx: 13.0,
                        ty: 8.0,
                        gender: roomGenderKey,
                        dialogue: '필요하면 침대에서 바로 휴식해! 컨디션 회복이 최고야.',
                        canBondAndSpar: true,
                        npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3
                    },
                    ...(isSchoolNight
                        ? [
                              {
                                  id: 'dorm_night_return_1',
                                  name: isKorean ? (roomGenderKey === 'male' ? '김민준' : '한소희') : generateName(nation),
                                  role: '야간 귀가 학우',
                                  tx: 6.0,
                                  ty: 8.4,
                                  gender: roomGenderKey,
                                  dialogue: '야간 통금 시간이라 교정에서 방금 기숙사로 돌아왔어. 오늘 하루도 수고했어!',
                                  canBondAndSpar: true,
                                  npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41)
                              },
                              {
                                  id: 'dorm_night_return_2',
                                  name: isKorean ? (roomGenderKey === 'male' ? '박지훈' : '최유진') : generateName(nation),
                                  role: '야간 귀가 학우',
                                  tx: 10.2,
                                  ty: 8.4,
                                  gender: roomGenderKey,
                                  dialogue: '밤에는 다른 건물들이 전부 잠겨서 기숙사에서 내일을 준비하는 게 제일 좋아.',
                                  canBondAndSpar: true,
                                  npcLevel: (activeSchoolTier === 'Elementary' ? 8 : activeSchoolTier === 'Middle' ? 23 : 41) + 3
                              }
                          ]
                        : [])
                ];
                return {
                    props: [
                        { key: 'dorm_bed', tx: 2.5, ty: 2.0, w: 1.9, h: 1.9 },
                        { key: 'dorm_bed', tx: 7.5, ty: 2.0, w: 1.9, h: 1.9 },
                        { key: 'dorm_bed', tx: 13.0, ty: 2.0, w: 1.9, h: 1.9 },
                        { key: 'student_desk', tx: 8, ty: 6.5, w: 2.0, h: 1.7 }
                    ],
                    npcs: [
                        { id: 'npc_dorm_rest', name: isKorean ? '박성호' : generateName(nation), role: '기숙사 사감', tx: 9, ty: 3.6, gender: 'male', dialogue: `${activeDormRoom.label}에서 충분히 휴식을 취하세요.`, opensZone: 'Dormitory' },
                        ...roomClassmates,
                        ...dormResidents
                    ]
                };
            }
        }
    }, [activeRoom, activeDormRoom, activeClubRoom, activeClassRoomSubject, activeSchoolTier, nation, character.schoolData?.homeroomTeacher?.name, character.schoolData?.classmates, character.schoolData?.classNumber, character.schoolData?.grade, character.level, character.clubData?.joinedClub, isSchoolNight]);

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
        loadCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_elementary'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_middle'));
        loadCityAssetImage(getBuildingSpriteUrl(cultureKey, 'school_high'));
        // Preload newly extracted d1~d13 academy tiles, buildings, and props
        loadCityAssetImage('./assets/visuals/escape_portal.png');
        ['tile_ground', 'tile_road', 'tile_floor', 'tile_carpet', 'tile_wall', 'tile_door', 'prop_tree', 'prop_lamp'].forEach(
            part => loadCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/${part}.png`))
        );
        ['Elementary', 'Middle', 'High'].forEach(
            t => loadCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_${t}.png`))
        );
        if (['shingye', 'magye', 'sylvanar', 'feraldia'].includes(academyBuildingFolder)) {
            loadCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_campus.png`));
        } else {
            ['Office', 'Classroom', 'Library', 'Training', 'Club', 'Dormitory'].forEach(
                z => loadCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_${z}.png`))
            );
        }
        [
            'attendance_desk', 'report_cabinet', 'blackboard', 'student_desk',
            'bookshelf', 'book_sun', 'book_abyss', 'book_element',
            'club_desk', 'dummy_wood', 'dummy_arcane', 'dorm_bed',
            'hallway_door', 'lectern_podium', 'weapon_rack', 'arcane_table',
            'partition_h', 'partition_v', 'partition_corner', 'partition_door'
        ].forEach(k => loadCityAssetImage(getAcademyAssetUrl(`props/${k}.png`)));
        ['desk', 'school_desk', 'bookshelf', 'training_dummy', 'table', 'bed', 'hunt_prop_tree', 'hunt_prop_spirit_tree'].forEach(
            k => loadCityAssetImage(getInteriorPropSpriteUrl(k))
        );
    }, [playerSpriteUrl, cultureKey, academyTileCulture, academyBuildingFolder]);

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
        if (isSchoolNight && zone !== 'Dormitory') {
            setActiveDialogue(null);
            setAccessDeniedMsg('🌙 야간 시간대(20:00~06:00)에는 교무실·강의실·대도서관·연무장·동아리동이 폐쇄되어 학생 기숙사만 이용할 수 있습니다.');
            return;
        }
        setAccessDeniedMsg(null);
        setActiveDialogue(null);
        setActiveDormRoom(null);
        setActiveClubRoom(null);
        playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
        playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
        setActiveRoom(zone);
    }, [isSchoolNight]);

    const exitRoomToCampus = useCallback(() => {
        if (activeRoom === 'Classroom' && activeClassRoomSubject) {
            setActiveDialogue(null);
            setActiveClassRoomSubject(null);
            playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
            playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
            playerRef.current.dir = 'up';
            exitCooldownRef.current = Date.now() + 700;
            return;
        }
        if (activeRoom === 'Dormitory' && activeDormRoom) {
            setActiveDialogue(null);
            setActiveDormRoom(null);
            playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
            playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
            playerRef.current.dir = 'up';
            exitCooldownRef.current = Date.now() + 700;
            return;
        }
        if (activeRoom === 'Club' && activeClubRoom) {
            setActiveDialogue(null);
            setActiveClubRoom(null);
            playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
            playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
            playerRef.current.dir = 'up';
            exitCooldownRef.current = Date.now() + 700;
            return;
        }
        if (!activeSchoolTier) return;
        const nextCols = activeSchoolTier === 'Elementary' ? 26 : activeSchoolTier === 'Middle' ? 30 : 34;
        const nextRows = activeSchoolTier === 'Elementary' ? 18 : activeSchoolTier === 'Middle' ? 20 : 22;
        const exitBuildingCoords: Record<string, { tx: number; ty: number; tw: number; th: number }> = {
            Office: { tx: 3, ty: 2.5, tw: 4.5, th: 3.5 },
            Classroom: { tx: Math.floor(nextCols / 2) - 2, ty: 2.5, tw: 4.5, th: 3.5 },
            Library: { tx: nextCols - 7.5, ty: 2.5, tw: 4.5, th: 3.5 },
            Training: { tx: 3, ty: Math.floor(nextRows * 0.56), tw: 4.5, th: 3.5 },
            Club: { tx: Math.floor(nextCols / 2) - 2, ty: Math.floor(nextRows * 0.56), tw: 4.5, th: 3.5 },
            Dormitory: { tx: nextCols - 7.5, ty: Math.floor(nextRows * 0.56), tw: 4.5, th: 3.5 },
            Annex: { tx: Math.floor(nextCols / 2) - 2, ty: Math.floor(nextRows * 0.34), tw: 4, th: 3 }
        };
        const exitedBldg = activeRoom ? exitBuildingCoords[activeRoom] : undefined;
        setActiveDialogue(null);
        setActiveDormRoom(null);
        setActiveClubRoom(null);
        setActiveClassRoomSubject(null);
        setActiveRoom(null);
        playerRef.current.x = exitedBldg ? (exitedBldg.tx + exitedBldg.tw / 2) * CITY_TILE_SIZE : Math.floor(nextCols / 2) * CITY_TILE_SIZE;
        playerRef.current.y = exitedBldg ? (exitedBldg.ty + exitedBldg.th + 1.35) * CITY_TILE_SIZE : (nextRows - 2.5) * CITY_TILE_SIZE;
        playerRef.current.dir = 'down';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
        }, [activeSchoolTier, activeRoom, activeDormRoom, activeClubRoom, activeClassRoomSubject]);

    const exitCampusToPlaza = useCallback(() => {
        const exitedSchool = buildingSlots.find(b => b.tier === activeSchoolTier);
        setActiveDialogue(null);
        setActiveDormRoom(null);
        setActiveClubRoom(null);
        setActiveClassRoomSubject(null);
        setActiveRoom(null);
        setActiveSchoolTier(null);
        playerRef.current.x = exitedSchool ? (exitedSchool.tx + exitedSchool.tw / 2) * CITY_TILE_SIZE : Math.floor(PLAZA_COLS / 2) * CITY_TILE_SIZE;
        playerRef.current.y = exitedSchool ? (exitedSchool.ty + exitedSchool.th + 1.0) * CITY_TILE_SIZE : (PLAZA_ROWS - 2.5) * CITY_TILE_SIZE;
        playerRef.current.dir = 'down';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 700;
    }, [activeSchoolTier, buildingSlots]);

    const handleInteract = useCallback(() => {
        const p = playerRef.current;
        if (!activeSchoolTier) {
            // Check Plaza Students first
            for (const stu of plazaStudents) {
                const off = npcOffsetsRef.current[stu.id] || { dx: 0, dy: 0 };
                const sx = (stu.tx + 0.5) * CITY_TILE_SIZE + off.dx;
                const sy = (stu.ty + 0.5) * CITY_TILE_SIZE + off.dy;
                if (Math.hypot(sx - p.x, sy - p.y) <= CITY_TILE_SIZE * 1.6) {
                    setActiveDialogue({ id: stu.id, name: stu.name, role: stu.role, text: stu.dialogue, gender: stu.gender, canBondAndSpar: true });
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
            for (const stu of campusStudents) {
                const off = npcOffsetsRef.current[stu.id] || { dx: 0, dy: 0 };
                const sx = (stu.tx + 0.5) * CITY_TILE_SIZE + off.dx;
                const sy = (stu.ty + 0.5) * CITY_TILE_SIZE + off.dy;
                if (Math.hypot(sx - p.x, sy - p.y) <= CITY_TILE_SIZE * 1.6) {
                    setActiveDialogue({
                        id: stu.id,
                        name: stu.name,
                        role: stu.role,
                        text: stu.dialogue,
                        gender: stu.gender,
                        canBondAndSpar: true,
                        npcLevel: stu.npcLevel,
                        combatStyle: stu.combatStyle
                    });
                    return;
                }
            }
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
        for (const pr of roomContent.props) {
            if (!pr.interactKind) continue;
            const px = (pr.tx + pr.w / 2) * CITY_TILE_SIZE;
            const py = (pr.ty + pr.h / 2) * CITY_TILE_SIZE;
            if (Math.hypot(px - p.x, py - p.y) <= CITY_TILE_SIZE * 1.9) {
                if (pr.interactKind === 'attendance') setShowAttendanceDirect(true);
                else if (pr.interactKind === 'report') setShowReportDirect(true);
                else if (pr.interactKind === 'divine_book' && pr.bookDef) setActiveDivineBook(pr.bookDef);
                else if (pr.interactKind === 'enter_subject_room' && pr.subjectType) {
                    const subj = CLASSROOM_SUBJECT_ROOMS.find(s => s.type === pr.subjectType);
                    setActiveClassRoomSubject(pr.subjectType);
                    playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
                    playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
                    playerRef.current.dir = 'up';
                    playerRef.current.targetX = null;
                    playerRef.current.targetY = null;
                    exitCooldownRef.current = Date.now() + 700;
                    if (subj) {
                        setCampusToast(`${subj.title}에 입장했습니다. 교탁에서 수업을 수강하세요!`);
                        setTimeout(() => setCampusToast(null), 2400);
                    }
                } else if (pr.interactKind === 'subject_room' && pr.subjectType) {
                    setActiveSubjectRoom(CLASSROOM_SUBJECT_ROOMS.find(s => s.type === pr.subjectType) || null);
                } else if (pr.interactKind === 'dorm_door' && pr.dormDoor) {
                    const myGender: '남성' | '여성' = character.gender === '남성' ? '남성' : '여성';
                    const myGrade = character.schoolData?.grade || 1;
                    if (pr.dormDoor.gender !== myGender || pr.dormDoor.grade !== myGrade) {
                        setActiveDormRoom(null);
                        setAccessDeniedMsg(`출입 금지! 본인(${myGender} ${myGrade}학년) 기숙사 방만 입장할 수 있어 퇴실 조치되었습니다.`);
                        setTimeout(() => setAccessDeniedMsg(null), 3200);
                    } else {
                        setActiveDormRoom(pr.dormDoor);
                        setCampusToast(`${pr.dormDoor.label}에 입장했습니다.`);
                        setTimeout(() => setCampusToast(null), 2200);
                    }
                } else if (pr.interactKind === 'club_desk' && pr.clubType) {
                    if (character.clubData?.joinedClub === pr.clubType) {
                        setActiveClubRoom(pr.clubType);
                        playerRef.current.x = Math.floor(ROOM_COLS / 2) * CITY_TILE_SIZE;
                        playerRef.current.y = (ROOM_ROWS - 2.2) * CITY_TILE_SIZE;
                        playerRef.current.dir = 'up';
                        setCampusToast(`${pr.clubType} 동아리실에 입장했습니다.`);
                        setTimeout(() => setCampusToast(null), 2200);
                    } else {
                        setActiveClubApply(CLUB_DESK_SPECS.find(c => c.club === pr.clubType) || null);
                    }
                } else if (pr.interactKind === 'club_activity') {
                    setShowClubVisualModal(true);
                }
                return;
            }
        }
        for (const npc of roomContent.npcs) {
            const off = npcOffsetsRef.current[npc.id] || { dx: 0, dy: 0 };
            const nx = (npc.tx + 0.5) * CITY_TILE_SIZE + off.dx;
            const ny = (npc.ty + 0.5) * CITY_TILE_SIZE + off.dy;
            if (Math.hypot(nx - p.x, ny - p.y) <= CITY_TILE_SIZE * 1.75) {
                if (npc.opensZone && !npc.canBondAndSpar) {
                    setOpenModalZone(npc.opensZone);
                } else {
                    setActiveDialogue({
                        id: npc.id,
                        name: npc.name,
                        role: npc.role,
                        text: npc.dialogue,
                        gender: npc.gender,
                        zone: npc.opensZone,
                        canBondAndSpar: npc.canBondAndSpar,
                        isTeacher: npc.isTeacher,
                        npcLevel: npc.npcLevel,
                        combatStyle: npc.combatStyle
                    });
                }
                return;
            }
        }
    }, [activeSchoolTier, activeRoom, plazaStudents, buildingSlots, campusBuildings, roomContent.npcs, roomContent.props, enterSchoolCampus, enterRoom, character.gender, character.schoolData?.grade, character.clubData?.joinedClub]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (openModalZone || showAttendanceDirect || showReportDirect || activeDivineBook || activeClubApply || showClubVisualModal || activeSubjectRoom || activityProgress) return;
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
    }, [openModalZone, showAttendanceDirect, showReportDirect, activeDivineBook, activeClubApply, showClubVisualModal, activeSubjectRoom, activityProgress, activeDialogue, activeRoom, activeSchoolTier, handleInteract, exitRoomToCampus, exitCampusToPlaza, onExitToCity]);

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

            const isBlockedByBuilding = (wx: number, wy: number) => {
                if (activeRoom && !activeClassRoomSubject) {
                    const tc = Math.floor(wx / ts);
                    const tr = Math.floor(wy / ts);
                    if (getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, tc, tr) === 'wall') {
                        return true;
                    }
                }
                const list = !activeSchoolTier ? buildingSlots : !activeRoom ? campusBuildings : [];
                for (const b of list) {
                    const x0 = (b.tx + 0.2) * ts;
                    const x1 = (b.tx + b.tw - 0.2) * ts;
                    const y0 = (b.ty + 0.4) * ts;
                    const y1 = (b.ty + b.th - 0.1) * ts;
                    if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) return true;
                }
                return false;
            };

            if (!openModalZone && !activeDialogue && !activityProgress) {
                let vx = 0;
                let vy = 0;
                const keys = keysRef.current;
                if (keys.has('arrowleft') || keys.has('a') || dpadRef.current === 'left') vx -= 1;
                if (keys.has('arrowright') || keys.has('d') || dpadRef.current === 'right') vx += 1;
                if (keys.has('arrowup') || keys.has('w') || dpadRef.current === 'up') vy -= 1;
                if (keys.has('arrowdown') || keys.has('s') || dpadRef.current === 'down') vy += 1;

                let moving = false;
                let stepX = 0;
                let stepY = 0;
                if (vx !== 0 || vy !== 0) {
                    p.targetX = null;
                    p.targetY = null;
                    const len = Math.hypot(vx, vy);
                    stepX = (vx / len) * 200 * dt;
                    stepY = (vy / len) * 200 * dt;
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
                        stepX = (dx / d) * 200 * dt;
                        stepY = (dy / d) * 200 * dt;
                        moving = true;
                        if (Math.abs(dx) >= Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
                        else p.dir = dy < 0 ? 'up' : 'down';
                    }
                }

                if (stepX !== 0 && !isBlockedByBuilding(p.x + stepX, p.y)) p.x += stepX;
                if (stepY !== 0 && !isBlockedByBuilding(p.x, p.y + stepY)) p.y += stepY;

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
                } else if (Date.now() > exitCooldownRef.current) {
                    if (!activeSchoolTier) {
                        for (const b of buildingSlots) {
                            const doorX = (b.tx + b.tw / 2) * ts;
                            const doorY = (b.ty + b.th + 0.4) * ts;
                            if (Math.hypot(p.x - doorX, p.y - doorY) <= ts * 0.72) {
                                enterSchoolCampus(b.tier);
                                break;
                            }
                        }
                    } else if (!activeRoom) {
                        for (const b of campusBuildings) {
                            const doorX = (b.tx + b.tw / 2) * ts;
                            const doorY = (b.ty + b.th + 0.4) * ts;
                            if (Math.hypot(p.x - doorX, p.y - doorY) <= ts * 0.72) {
                                enterRoom(b.zone);
                                break;
                            }
                        }
                    }
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
                        for (const stu of campusStudents) {
                            const off = npcOffsetsRef.current[stu.id] || { dx: 0, dy: 0 };
                            const sx = (stu.tx + 0.5) * ts + off.dx;
                            const sy = (stu.ty + 0.5) * ts + off.dy;
                            if (Math.hypot(sx - p.x, sy - p.y) <= ts * 1.6) {
                                found = `💬 ${stu.name} 대화 (Space)`;
                                break;
                            }
                        }
                        if (!found) {
                            for (const b of campusBuildings) {
                                const dx = (b.tx + b.tw / 2) * ts;
                                const dy = (b.ty + b.th + 0.4) * ts;
                                if (Math.hypot(dx - p.x, dy - p.y) <= ts * 2.0) {
                                    found = `${b.icon} ${b.label} 입장 (Space)`;
                                    break;
                                }
                            }
                        }
                    } else {
                        for (const pr of roomContent.props) {
                            if (!pr.interactKind || !pr.label) continue;
                            const px = (pr.tx + pr.w / 2) * ts;
                            const py = (pr.ty + pr.h / 2) * ts;
                            if (Math.hypot(px - p.x, py - p.y) <= ts * 1.9) {
                                found = `${pr.label} (Space)`;
                                break;
                            }
                        }
                        if (!found) {
                            for (const npc of roomContent.npcs) {
                                const nx = (npc.tx + 0.5) * ts;
                                const ny = (npc.ty + 0.5) * ts;
                                if (Math.hypot(nx - p.x, ny - p.y) <= ts * 1.75) {
                                    found = npc.opensZone && !npc.canBondAndSpar ? `📋 ${npc.name} 이용하기 (Space)` : `💬 ${npc.name} 대화·대련 (Space)`;
                                    break;
                                }
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

                const groundImg =
                    getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_ground.png`)) ||
                    getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'ground'));
                const roadImg =
                    getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_road.png`)) ||
                    getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'road'));
                const wallImg =
                    getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_wall.png`)) ||
                    getCachedCityAssetImage(getTerrainTileUrl(cultureKey, 'wall'));
                const floorImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_floor.png`));
                const carpetImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_carpet.png`));
                const doorImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/tile_door.png`));

                const exitMin = Math.floor(cols / 2) - 1;
                const exitMax = Math.floor(cols / 2) + 1;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = c * ts;
                        const y = r * ts;
                        const isGate = r === rows - 1 && c >= exitMin && c <= exitMax;
                        const partType =
                            activeRoom && !activeClassRoomSubject
                                ? getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, c, r)
                                : null;
                        if (partType === 'wall') {
                            const hasLeft = getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, c - 1, r) === 'wall';
                            const hasRight = getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, c + 1, r) === 'wall';
                            const hasUp = getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, c, r - 1) === 'wall';
                            const hasDown = getInteriorPartitionType(activeRoom, activeClubRoom, activeDormRoom, c, r + 1) === 'wall';
                            const isHoriz = hasLeft || hasRight;
                            const isVert = hasUp || hasDown;
                            const isCornerOrJunction = (isHoriz && isVert) || (!isHoriz && !isVert);

                            // 바닥 타일 먼저 깔고 그 위에 입체 격벽 렌더링
                            if (floorImg?.complete && floorImg.naturalWidth > 0) ctx.drawImage(floorImg, x, y, ts, ts);
                            else {
                                ctx.fillStyle = (c + r) % 2 === 0 ? '#8a5a36' : '#7c4f2e';
                                ctx.fillRect(x, y, ts, ts);
                            }

                            const partKey = isCornerOrJunction ? 'partition_corner' : isVert ? 'partition_v' : 'partition_h';
                            const partImg = getCachedCityAssetImage(getAcademyAssetUrl(`props/${partKey}.png`));
                            if (partImg?.complete && partImg.naturalWidth > 0) {
                                ctx.drawImage(partImg, x, y, ts, ts);
                            } else if (isCornerOrJunction) {
                                // 교차점/모서리 기둥 (윗면 목재 캡 + 전면 벽체)
                                ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
                                ctx.fillRect(x + 2, y + ts - 4, ts - 2, 7);
                                ctx.fillStyle = '#3b2618';
                                ctx.fillRect(x, y, ts, ts * 0.56);
                                ctx.fillStyle = '#6b4c35';
                                ctx.fillRect(x + 2, y + 2, ts - 4, ts * 0.48);
                                ctx.fillStyle = '#d6c3a5';
                                ctx.fillRect(x + 2, y + ts * 0.56, ts - 4, ts * 0.44);
                                ctx.fillStyle = '#4a3222';
                                ctx.fillRect(x, y + ts * 0.56, 4, ts * 0.44);
                                ctx.fillRect(x + ts - 4, y + ts * 0.56, 4, ts * 0.44);
                                ctx.fillRect(x, y + ts - 4, ts, 4);
                                ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
                                ctx.lineWidth = 1;
                                ctx.strokeRect(x + 1.5, y + 1.5, ts - 3, ts * 0.52);
                            } else if (isVert) {
                                // 세로 방향 격벽 (측면 단면 + 얇은 목재 기둥)
                                const wallW = Math.round(ts * 0.42);
                                const wx = x + Math.round((ts - wallW) / 2);
                                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                                ctx.fillRect(wx + wallW, y + 2, 5, ts - 2);
                                ctx.fillStyle = '#3b2618';
                                ctx.fillRect(wx, y, wallW, ts);
                                ctx.fillStyle = '#6b4c35';
                                ctx.fillRect(wx + 3, y, wallW - 6, ts);
                                ctx.fillStyle = '#8b6548';
                                ctx.fillRect(wx + 4, y, 2, ts);
                                ctx.fillStyle = '#4a3222';
                                ctx.fillRect(wx + wallW - 4, y, 3, ts);
                            } else {
                                // 가로 방향 격벽 (상단 목재 들보 + 하단 회벽 + 바닥 그림자)
                                ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
                                ctx.fillRect(x, y + ts, ts, 6);
                                ctx.fillStyle = '#3b2618';
                                ctx.fillRect(x, y, ts, ts * 0.48);
                                ctx.fillStyle = '#6b4c35';
                                ctx.fillRect(x, y + 3, ts, ts * 0.4);
                                ctx.fillStyle = '#d6c3a5';
                                ctx.fillRect(x, y + ts * 0.48, ts, ts * 0.52);
                                ctx.fillStyle = '#c4ae8c';
                                ctx.fillRect(x, y + ts * 0.48, ts, 3);
                                ctx.fillStyle = '#4a3222';
                                ctx.fillRect(x, y + ts - 4, ts, 4);
                                // 세로 목재 프레임 라인
                                ctx.fillRect(x, y + ts * 0.48, 3, ts * 0.52);
                                ctx.fillRect(x + ts - 3, y + ts * 0.48, 3, ts * 0.52);
                            }
                            continue;
                        }
                        const isWall = r === 0 || c === 0 || c === cols - 1 || (r === rows - 1 && !isGate);
                        if (isWall) {
                            if (activeRoom) {
                                // 모든 학교 실내 캔버스 외벽에 가로벽/세로벽/모서리 기둥 타일 일괄 적용
                                if (floorImg?.complete && floorImg.naturalWidth > 0) ctx.drawImage(floorImg, x, y, ts, ts);
                                else {
                                    ctx.fillStyle = activeRoom === 'Training' ? '#44403c' : '#6b4c35';
                                    ctx.fillRect(x, y, ts, ts);
                                }
                                const isCornerTile = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
                                const isVertEdge = c === 0 || c === cols - 1;
                                const outerKey = isCornerTile ? 'partition_corner' : isVertEdge ? 'partition_v' : 'partition_h';
                                const outerImg = getCachedCityAssetImage(getAcademyAssetUrl(`props/${outerKey}.png`));
                                if (outerImg?.complete && outerImg.naturalWidth > 0) {
                                    ctx.drawImage(outerImg, x, y, ts, ts);
                                } else if (wallImg?.complete && wallImg.naturalWidth > 0) {
                                    ctx.drawImage(wallImg, x, y, ts, ts);
                                } else {
                                    ctx.fillStyle = '#475569';
                                    ctx.fillRect(x, y, ts, ts);
                                }
                            } else {
                                const isLeft = c === 0;
                                const isRight = c === cols - 1;
                                const isBottom = r === rows - 1;
                                if (r === 0 && !isLeft && !isRight) {
                                    if (wallImg?.complete && wallImg.naturalWidth > 0) ctx.drawImage(wallImg, x, y, ts, ts);
                                    else {
                                        ctx.fillStyle = activeSchoolTier === 'High' ? '#312e81' : '#334155';
                                        ctx.fillRect(x, y, ts, ts);
                                    }
                                    ctx.fillStyle = '#1c1917';
                                    ctx.fillRect(x, y, ts, 6);
                                    ctx.fillStyle = '#57534e';
                                    ctx.fillRect(x, y + 6, ts, 3);
                                } else {
                                    if (groundImg?.complete && groundImg.naturalWidth > 0) ctx.drawImage(groundImg, x, y, ts, ts);
                                    else {
                                        ctx.fillStyle = '#22543d';
                                        ctx.fillRect(x, y, ts, ts);
                                    }
                                    ctx.fillStyle = '#292524';
                                    if (isLeft) {
                                        ctx.fillRect(x, y, 22, ts);
                                        ctx.fillStyle = '#57534e';
                                        ctx.fillRect(x + 20, y, 4, ts);
                                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                                        ctx.fillRect(x + 24, y, 6, ts);
                                    }
                                    if (isRight) {
                                        ctx.fillRect(x + ts - 22, y, 22, ts);
                                        ctx.fillStyle = '#57534e';
                                        ctx.fillRect(x + ts - 24, y, 4, ts);
                                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                                        ctx.fillRect(x + ts - 30, y, 6, ts);
                                    }
                                    if (isBottom) {
                                        ctx.fillRect(x, y + ts - 22, ts, 22);
                                        ctx.fillStyle = '#57534e';
                                        ctx.fillRect(x, y + ts - 25, ts, 4);
                                        ctx.fillStyle = 'rgba(0,0,0,0.35)';
                                        ctx.fillRect(x, y + ts - 29, ts, 4);
                                    }
                                    if (r === 0 && (isLeft || isRight)) {
                                        ctx.fillStyle = '#292524';
                                        ctx.fillRect(x, y, ts, ts);
                                        ctx.fillStyle = '#57534e';
                                        ctx.fillRect(isLeft ? x + ts - 4 : x, y, 4, ts);
                                        ctx.fillRect(x, y + ts - 4, ts, 4);
                                    }
                                }
                            }
                            continue;
                        }
                        if (activeRoom) {
                            const isCarpet = c >= Math.floor(cols / 2) - 1 && c <= Math.floor(cols / 2);
                            const roomTile = isCarpet && carpetImg?.complete && carpetImg.naturalWidth > 0 ? carpetImg : floorImg;
                            if (roomTile?.complete && roomTile.naturalWidth > 0) {
                                ctx.drawImage(roomTile, x, y, ts, ts);
                            } else {
                                const isTraining = activeRoom === 'Training';
                                ctx.fillStyle = isTraining
                                    ? ((r + c) % 2 === 0 ? '#57534e' : '#44403c')
                                    : ((r + c) % 2 === 0 ? '#6b4c35' : '#5e422d');
                                ctx.fillRect(x, y, ts, ts);
                            }
                            if (partType === 'doorway') {
                                const partDoorImg = getCachedCityAssetImage(getAcademyAssetUrl('props/partition_door.png'));
                                if (partDoorImg?.complete && partDoorImg.naturalWidth > 0) {
                                    ctx.drawImage(partDoorImg, x, y, ts, ts);
                                } else {
                                    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
                                    ctx.fillRect(x, y, ts, ts);
                                }
                            }
                            if (isGate) {
                                const partDoorImg = getCachedCityAssetImage(getAcademyAssetUrl('props/partition_door.png'));
                                if (c === Math.floor(cols / 2) && partDoorImg?.complete && partDoorImg.naturalWidth > 0) {
                                    ctx.drawImage(partDoorImg, x, y, ts, ts);
                                } else if (doorImg?.complete && doorImg.naturalWidth > 0) {
                                    ctx.drawImage(doorImg, x, y, ts, ts);
                                } else {
                                    ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
                                    ctx.fillRect(x, y, ts, ts);
                                }
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

                if (!activeRoom) {
                    const treeImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/prop_tree.png`));
                    const lampImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyTileCulture}/prop_lamp.png`));
                    const treeCoords = activeSchoolTier ? [{ tx: 1.3, ty: 1.3 }, { tx: cols - 2.6, ty: 1.3 }] : [{ tx: 1.5, ty: 12 }, { tx: cols - 3, ty: 12 }];
                    treeCoords.forEach(tc => {
                        if (treeImg?.complete && treeImg.naturalWidth > 0) {
                            ctx.drawImage(treeImg, tc.tx * ts, tc.ty * ts, ts * 1.5, ts * 1.5);
                        }
                    });
                    if (lampImg?.complete && lampImg.naturalWidth > 0) {
                        const lc = Math.floor(cols / 2);
                        ctx.drawImage(lampImg, (lc - 2) * ts, (rows - 3) * ts, ts * 0.9, ts * 1.3);
                        ctx.drawImage(lampImg, (lc + 1.1) * ts, (rows - 3) * ts, ts * 0.9, ts * 1.3);
                    }
                }

                const drawNpcActor = (npc: SchoolNpcActor) => {
                    const isFixedStaff = ['npc_teacher', 'npc_vice', 'npc_lib', 'npc_dorm', 'npc_dorm_rest', 'npc_trainer', 'npc_lect'].includes(npc.id);
                    let off = npcOffsetsRef.current[npc.id];
                    if (!off) {
                        off = { dx: 0, dy: 0, vx: 0, vy: 0, timer: Math.random() * 1.8, dir: 'down' };
                        npcOffsetsRef.current[npc.id] = off;
                    }
                    if (!isFixedStaff) {
                        off.timer -= dt;
                        if (off.timer <= 0) {
                            off.timer = 1.4 + Math.random() * 2.2;
                            if (Math.random() < 0.35) {
                                off.vx = 0;
                                off.vy = 0;
                            } else {
                                const ang = Math.random() * Math.PI * 2;
                                const spd = 24;
                                off.vx = Math.cos(ang) * spd;
                                off.vy = Math.sin(ang) * spd;
                            }
                        }
                        const maxR = ts * 1.15;
                        const ndx = off.dx + off.vx * dt;
                        const ndy = off.dy + off.vy * dt;
                        const candX = (npc.tx + 0.5) * ts + ndx;
                        const candY = (npc.ty + 0.5) * ts + ndy;
                        if (Math.hypot(ndx, ndy) > maxR || isBlockedByBuilding(candX, candY)) {
                            off.vx = -off.dx * 0.8;
                            off.vy = -off.dy * 0.8;
                        } else {
                            off.dx = ndx;
                            off.dy = ndy;
                        }
                        if (Math.abs(off.vx) > 2 || Math.abs(off.vy) > 2) {
                            off.dir = Math.abs(off.vx) >= Math.abs(off.vy) ? (off.vx < 0 ? 'left' : 'right') : (off.vy < 0 ? 'up' : 'down');
                        }
                    }
                    const nx = (npc.tx + 0.5) * ts + off.dx;
                    const ny = (npc.ty + 0.5) * ts + off.dy;
                    const npcSprite = resolveEntityRpgSprite({ gender: npc.gender } as any, region, nation);
                    loadRpgSpriteImage(npcSprite.url);
                    const nImg = getCachedRpgSpriteImage(npcSprite.url);
                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.beginPath();
                    ctx.ellipse(nx, ny + 8, 11, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    const isMoving = Math.abs(off.vx) > 2 || Math.abs(off.vy) > 2;
                    const frame = isMoving ? (Math.floor(Date.now() / 180) % 3) : 1;
                    const row = DIRECTION_ROW_MAP[off.dir];
                    if (nImg && nImg.complete && nImg.naturalWidth > 0) {
                        const cw = nImg.naturalWidth / 3;
                        const ch = nImg.naturalHeight / 4;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(nImg, frame * cw, row * ch, cw, ch, Math.round(nx - 21), Math.round(ny - 34), 42, 42);
                    } else {
                        drawFallbackChibiSprite(ctx, nx, ny + 8, region as RpgSpriteRegionKey, npc.gender, off.dir, frame);
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
                    buildingSlots.forEach(b => {
                        const bx = b.tx * ts;
                        const by = b.ty * ts;
                        const bw = b.tw * ts;
                        const bh = b.th * ts;
                        const isSpecialCulture = ['shingye', 'magye', 'sylvanar', 'feraldia'].includes(academyBuildingFolder);
                        const tierImg = getCachedCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_${b.tier}.png`));
                        const img =
                            (tierImg && tierImg.complete && tierImg.naturalWidth > 0 ? tierImg : null) ||
                            (isSpecialCulture
                                ? getCachedCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_campus.png`))
                                : getCachedCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_Classroom.png`))) ||
                            getCachedCityAssetImage(getBuildingSpriteUrl(cultureKey, b.spriteKey));

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
                    campusBuildings.forEach(b => {
                        const bx = b.tx * ts;
                        const by = b.ty * ts;
                        const bw = b.tw * ts;
                        const bh = b.th * ts;
                        const isSpecialCulture = ['shingye', 'magye', 'sylvanar', 'feraldia'].includes(academyBuildingFolder);
                        const bImg = isSpecialCulture
                            ? getCachedCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_campus.png`))
                            : getCachedCityAssetImage(getAcademyAssetUrl(`${academyBuildingFolder}/ext_${b.zone}.png`));

                        ctx.fillStyle = 'rgba(0,0,0,0.35)';
                        ctx.beginPath();
                        ctx.ellipse(bx + bw / 2, by + bh - 6, bw * 0.42, 14, 0, 0, Math.PI * 2);
                        ctx.fill();

                        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                            const scale = Math.min((bw + 16) / bImg.naturalWidth, (bh + 16) / bImg.naturalHeight);
                            const dw = bImg.naturalWidth * scale;
                            const dh = bImg.naturalHeight * scale;
                            ctx.drawImage(bImg, bx + (bw - dw) / 2, by + bh - dh, dw, dh);
                        } else {
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
                            ctx.fillStyle = '#0f172a';
                            ctx.fillRect(bx + bw / 2 - 14, by + bh - 34, 28, 34);
                            ctx.strokeStyle = b.accentColor;
                            ctx.strokeRect(bx + bw / 2 - 14, by + bh - 34, 28, 34);
                            ctx.font = '26px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(b.icon, bx + bw / 2, by + 56);
                        }

                        const doorX = bx + bw / 2;
                        const doorY = by + bh + 0.4 * ts;
                        const portalImg = getCachedCityAssetImage('./assets/visuals/escape_portal.png');
                        if (portalImg && portalImg.complete && portalImg.naturalWidth > 0) {
                            const pw = ts * 0.95;
                            const ph = ts * 0.72;
                            ctx.drawImage(portalImg, doorX - pw / 2, doorY - ph / 2, pw, ph);
                        } else {
                            ctx.fillStyle = `${b.accentColor}44`;
                            ctx.beginPath();
                            ctx.arc(doorX, doorY, 16, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = b.accentColor;
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }

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
                        ctx.textAlign = 'center';
                        ctx.fillText(title, bx + bw / 2, by - 10);
                        if (isSchoolNight && b.zone !== 'Dormitory') {
                            ctx.font = 'bold 9px sans-serif';
                            ctx.fillStyle = '#fca5a5';
                            ctx.fillText('🔒 야간 폐쇄 (기숙사만 이용 가능)', bx + bw / 2, by - 26);
                        }
                    });
                    if (!isSchoolNight) {
                        campusStudents.forEach(drawNpcActor);
                    }
                } else {
                    roomContent.props.forEach(pr => {
                        const px = pr.tx * ts;
                        const py = pr.ty * ts;
                        const pw = pr.w * ts;
                        const ph = pr.h * ts;
                        if (pr.key === 'tile_door') {
                            if (doorImg && doorImg.complete && doorImg.naturalWidth > 0) {
                                ctx.drawImage(doorImg, px + pw * 0.1, py, pw * 0.8, ph);
                            } else {
                                ctx.fillStyle = '#78350f';
                                ctx.fillRect(px + pw * 0.15, py + 4, pw * 0.7, ph - 4);
                                ctx.strokeStyle = '#fbbf24';
                                ctx.lineWidth = 2;
                                ctx.strokeRect(px + pw * 0.15, py + 4, pw * 0.7, ph - 4);
                                ctx.fillStyle = '#fcd34d';
                                ctx.beginPath();
                                ctx.arc(px + pw * 0.72, py + ph * 0.55, 4, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else {
                            const img =
                                getCachedCityAssetImage(getAcademyAssetUrl(`props/${pr.key}.png`)) ||
                                getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                            if (img && img.complete && img.naturalWidth > 0) {
                                const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                                const dw = img.naturalWidth * scale;
                                const dh = img.naturalHeight * scale;
                                ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                            }
                        }
                        if (pr.label && pr.interactKind) {
                            ctx.font = 'bold 9px sans-serif';
                            const lw = Math.max(76, ctx.measureText(pr.label).width + 10);
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                            ctx.beginPath();
                            ctx.roundRect(px + pw / 2 - lw / 2, py + ph + 2, lw, 15, 4);
                            ctx.fill();
                            ctx.fillStyle = '#7dd3fc';
                            ctx.textAlign = 'center';
                            ctx.fillText(pr.label, px + pw / 2, py + ph + 12);
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

                drawCanvasNightOverlay(ctx, 0, 0, mapW, mapH, character.currentTime, {
                    isIndoor: Boolean(activeRoom),
                    playerLight: { x: p.x, y: p.y - 6, radius: 110 }
                });

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [viewport, cultureKey, playerSpriteUrl, spriteInfo, activeSchoolTier, activeRoom, campusDims, buildingSlots, plazaStudents, campusBuildings, roomContent, enrolledTier, canEnterTier, openModalZone, activeDialogue, region, nation, character.name, character.currentTime, isSchoolNight, exitRoomToCampus, exitCampusToPlaza, onExitToCity]);

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

            {campusPeriodNotice && (
                <div className="w-full px-3 py-1.5 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-rose-950/80 to-amber-950/90 text-xs z-20 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 font-black animate-pulse">
                        {campusPeriodNotice.badge}
                    </span>
                    <span className="text-amber-100 font-semibold">{campusPeriodNotice.detail}</span>
                </div>
            )}

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

                {campusToast && (
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-950/95 border border-amber-500/70 text-amber-200 text-xs font-bold shadow-2xl">
                        ✨ {campusToast}
                    </div>
                )}

                {activeDialogue && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-30 bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <img
                                    src={resolveNpcVisual(activeDialogue.id, activeDialogue.name, activeDialogue.gender || 'female', activeDialogue.isTeacher)}
                                    alt={activeDialogue.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-cyan-400/60 bg-slate-800 shrink-0"
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle size={14} className="text-cyan-400" />
                                        <span className="text-xs font-black text-white">{activeDialogue.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{activeDialogue.role}</span>
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed mt-1">&ldquo;{activeDialogue.text}&rdquo;</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveDialogue(null)} className="text-slate-400 hover:text-white cursor-pointer shrink-0">
                                <X size={15} />
                            </button>
                        </div>
                        {(activeDialogue.canBondAndSpar || activeDialogue.zone) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {activeDialogue.canBondAndSpar && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const npcId = activeDialogue.id || `campus_${activeDialogue.name}`;
                                                const curDate = character.currentDate || '0001-01-01';
                                                const prevDate = ((character.schoolData as any)?.weeklyBondDates || {})[npcId];
                                                if (prevDate) {
                                                    const diffDays = Math.floor((new Date(curDate).getTime() - new Date(prevDate).getTime()) / 86400000);
                                                    if (!Number.isNaN(diffDays) && diffDays < 7) {
                                                        setCampusToast(`일주일에 한 번만 교류할 수 있습니다! (${7 - diffDays}일 후 가능)`);
                                                        setTimeout(() => setCampusToast(null), 2600);
                                                        return;
                                                    }
                                                }
                                                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                                                if (!newChar.socialNetwork) newChar.socialNetwork = [];
                                                let baseAff = 14;
                                                if (activeDialogue.isTeacher && newChar.schoolData?.homeroomTeacher) {
                                                    const ht = newChar.schoolData.homeroomTeacher;
                                                    baseAff = ht.affection || 0;
                                                    ht.affection = Math.min(100, baseAff + 5);
                                                }
                                                if (newChar.schoolData?.classmates) {
                                                    const cmIdx = newChar.schoolData.classmates.findIndex(c => c.id === npcId || c.name === activeDialogue.name);
                                                    if (cmIdx !== -1) {
                                                        baseAff = newChar.schoolData.classmates[cmIdx].affection || 0;
                                                        newChar.schoolData.classmates[cmIdx].affection = Math.min(100, baseAff + 5);
                                                    }
                                                }
                                                if (newChar.companions) {
                                                    const cpIdx = newChar.companions.findIndex(c => c.id === npcId || c.name === activeDialogue.name);
                                                    if (cpIdx !== -1) {
                                                        baseAff = (newChar.companions[cpIdx] as any).affection || baseAff;
                                                        (newChar.companions[cpIdx] as any).affection = Math.min(100, baseAff + 5);
                                                    }
                                                }
                                                const idx = newChar.socialNetwork.findIndex(n => n.id === npcId || n.name === activeDialogue.name);
                                                let finalAff = Math.min(100, baseAff + 5);
                                                const matchedCm = newChar.schoolData?.classmates?.find(c => c.id === npcId || c.name === activeDialogue.name);
                                                const matchedHt = activeDialogue.isTeacher ? newChar.schoolData?.homeroomTeacher : undefined;
                                                const sourcePerson = matchedCm || matchedHt;
                                                const tierBaseAge = activeSchoolTier === 'Elementary' ? 10 : activeSchoolTier === 'Middle' ? 13 : 16;
                                                const roleGradeMatch = activeDialogue.role?.match(/(\d)학년/);
                                                const resolvedGrade = roleGradeMatch
                                                    ? parseInt(roleGradeMatch[1], 10)
                                                    : (activeDormRoom?.grade || newChar.schoolData?.grade || 1);
                                                const expectedAge = sourcePerson?.age || (activeDialogue.isTeacher ? '32세' : `${tierBaseAge + resolvedGrade}세`);
                                                const expectedGender = sourcePerson?.gender || (activeDialogue.gender === 'male' ? '남성' : '여성');
                                                const expectedClassType = sourcePerson?.classType || (activeDialogue.isTeacher ? '교사' : JobType.STUDENT);
                                                const expectedVisual = sourcePerson?.visualUrl || resolveNpcVisual(npcId, activeDialogue.name, expectedGender === '남성' ? 'male' : 'female', activeDialogue.isTeacher);

                                                if (idx === -1) {
                                                    const newNpc: SimpleStudent = {
                                                        id: sourcePerson?.id || npcId,
                                                        name: activeDialogue.name,
                                                        age: expectedAge,
                                                        gender: expectedGender,
                                                        race: sourcePerson?.race || character.race || '인간',
                                                        nation: sourcePerson?.nation || nation,
                                                        level: sourcePerson?.level || activeDialogue.npcLevel || Math.max(3, character.level || 5),
                                                        personality: sourcePerson?.personality || '성실함',
                                                        appearance: sourcePerson?.appearance || (activeDialogue.isTeacher ? '단정한 교사 복장' : '단정한 교복'),
                                                        visualUrl: expectedVisual,
                                                        stats: sourcePerson?.stats || { str: 18, int: 18, wis: 15, agi: 16, con: 18 },
                                                        affection: finalAff,
                                                        isPastConnection: true,
                                                        classType: expectedClassType,
                                                        combatStyle: sourcePerson?.combatStyle || activeDialogue.combatStyle || CombatStyle.SWORDSMAN,
                                                    };
                                                    newChar.socialNetwork.push(newNpc);
                                                } else {
                                                    const ex = { ...newChar.socialNetwork[idx] };
                                                    finalAff = Math.min(100, (ex.affection || 0) + 5);
                                                    ex.affection = finalAff;
                                                    ex.isPastConnection = true;
                                                    ex.age = expectedAge;
                                                    ex.gender = expectedGender;
                                                    ex.classType = expectedClassType;
                                                    ex.visualUrl = expectedVisual;
                                                    newChar.socialNetwork[idx] = ex;
                                                }
                                                if (newChar.schoolData) {
                                                    (newChar.schoolData as any).weeklyBondDates = {
                                                        ...((newChar.schoolData as any).weeklyBondDates || {}),
                                                        [npcId]: curDate
                                                    };
                                                }
                                                onUpdateCharacter(newChar, `[학원 교류] ${activeDialogue.name}(${activeDialogue.role})와(과) 교류했습니다. (호감도 ${finalAff})`);
                                                setCampusToast(`${activeDialogue.name}와(과) 교류 완료! (호감도 ${finalAff})`);
                                                setTimeout(() => setCampusToast(null), 2800);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-cyan-900/70 hover:bg-cyan-800 border border-cyan-500/60 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <UserPlus size={13} /> 교류
                                        </button>
                                        {!activeDialogue.isTeacher && (
                                            <button
                                                onClick={() => {
                                                    const lv = activeDialogue.npcLevel || Math.max(4, character.level || 5);
                                                    const maxHp = Math.max(140, lv * 45);
                                                    const npcGender: RpgSpriteGenderKey = activeDialogue.gender || 'female';
                                                    const npcSprite = resolveEntityRpgSprite({ gender: npcGender } as any, region, nation);
                                                    const npcVisual = resolveNpcVisual(activeDialogue.id, activeDialogue.name, npcGender, activeDialogue.isTeacher);
                                                    const enemy = {
                                                        id: `spar_${activeDialogue.id || activeDialogue.name}`,
                                                        name: `${activeDialogue.name} (${activeDialogue.role})`,
                                                        level: lv,
                                                        hp: maxHp,
                                                        maxHp,
                                                        atk: Math.max(20, lv * 6),
                                                        def: Math.max(10, lv * 3),
                                                        spd: Math.max(12, lv * 3),
                                                        stats: { str: Math.max(15, lv * 5), int: Math.max(15, lv * 5), def: Math.max(10, lv * 3), agi: Math.max(12, lv * 3), ctrl: 10, hp: maxHp, mp: 100 },
                                                        expReward: lv * 22,
                                                        goldReward: lv * 15,
                                                        combatStyle: activeDialogue.combatStyle || CombatStyle.SWORDSMAN,
                                                        gender: npcGender === 'male' ? '남성' : '여성',
                                                        race: '인간',
                                                        nation,
                                                        visualUrl: npcVisual,
                                                        spriteUrl: npcSprite.url,
                                                        isNpc: true,
                                                        isBoss: false,
                                                    };
                                                    setActiveDialogue(null);
                                                    onStartBattle?.(enemy, 'school_demo', `[학원 대련] ${activeDialogue.name}`);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 border border-rose-500/60 text-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                            >
                                                <Swords size={13} /> 친선 대련 신청
                                            </button>
                                        )}
                                    </>
                                )}
                                {activeDialogue.isTeacher && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const rank = character.schoolData?.rank || 30;
                                                const advice = rank <= 10
                                                    ? `현재 교내 석차 ${rank}위로 최상위권이네요! 이 페이스를 유지하면 승급 시험도 무난히 통과할 수 있을 거예요.`
                                                    : rank <= 30
                                                        ? `현재 교내 석차 ${rank}위입니다. 강의실에서 부족한 능력치 수업을 듣고 도서관에서 제어력(CTRL)을 보강해보세요.`
                                                        : `현재 교내 석차 ${rank}위라 조금 더 분발이 필요해요. 강의실 수업과 도서관 독서를 병행하면 성적이 빠르게 오를 거예요!`;
                                                setActiveDialogue(prev => prev ? { ...prev, text: advice } : null);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-500/60 text-indigo-200 text-[11px] font-bold cursor-pointer"
                                        >
                                            💡 성적 조언 듣기
                                        </button>
                                        <button
                                            onClick={() => {
                                                const curMonth = (character.currentDate || '').slice(0, 7);
                                                if ((character.schoolData as any)?.lastCounselingMonth === curMonth) {
                                                    setCampusToast('담임 선생님과의 진로 상담은 한 달에 1번만 가능합니다!');
                                                    setTimeout(() => setCampusToast(null), 2600);
                                                    return;
                                                }
                                                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                                                newChar.stats.wis = (newChar.stats.wis || 10) + 1;
                                                if (newChar.schoolData) {
                                                    (newChar.schoolData as any).lastCounselingMonth = curMonth;
                                                }
                                                onUpdateCharacter(newChar, `[교무실 상담] ${activeDialogue.name} 선생님과 진로·학업 상담을 진행했습니다. (WIS +1)`);
                                                setActiveDialogue(prev => prev ? { ...prev, text: '조급해하지 말고 자신의 신력과 적성에 맞는 길을 차근차근 걸어가세요. 언제든 응원하고 있습니다.' } : null);
                                                setCampusToast('담임 선생님과 진로 상담 완료! (WIS +1)');
                                                setTimeout(() => setCampusToast(null), 2500);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200 text-[11px] font-bold cursor-pointer"
                                        >
                                            🗨️ 진로 상담 (월 1회)
                                        </button>
                                    </>
                                )}
                                {activeDialogue.zone && (
                                    <button
                                        onClick={() => {
                                            const z = activeDialogue.zone!;
                                            setActiveDialogue(null);
                                            setOpenModalZone(z);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-amber-700/70 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                        {activeDialogue.isTeacher ? '📝 교무실 열기 (시험/행정)' : '📋 시설 메뉴 열기'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setAiChatMode(v => !v)}
                                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${aiChatMode ? 'bg-fuchsia-700 border-fuchsia-400 text-white' : 'bg-fuchsia-950/70 hover:bg-fuchsia-900 border-fuchsia-500/60 text-fuchsia-200'}`}
                                >
                                    🤖 AI 대화
                                </button>
                            </div>
                        )}
                        {!activeDialogue.zone && !activeDialogue.canBondAndSpar && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                    onClick={() => setAiChatMode(v => !v)}
                                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${aiChatMode ? 'bg-fuchsia-700 border-fuchsia-400 text-white' : 'bg-fuchsia-950/70 hover:bg-fuchsia-900 border-fuchsia-500/60 text-fuchsia-200'}`}
                                >
                                    🤖 AI 대화
                                </button>
                            </div>
                        )}

                        {/* 일반 대화 주제 선택지 (교사/교직원 vs 학우 구분, 시험/토너먼트/일상) */}
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                            {((activeDialogue.isTeacher || /교사|교관|사감|사서/.test(activeDialogue.role || ''))
                                ? (campusPeriodNotice?.kind === 'exam'
                                    ? [
                                        { label: '📝 이번 시험 평가 기준이 궁금해요', reply: `필기(이론·제어)와 실전 대련 점수를 종합해 평가합니다. 기준 점수를 넘기면 다음 학년 또는 상급 과정으로 진급할 수 있어요.` },
                                        { label: '📚 시험 대비 수련 조언 부탁드려요', reply: `강의실에서 부족한 스탯 수업을 보강하고, 대도서관에서 신력 제어(CTRL)를 다듬어 두세요. 준비가 되면 교무실에서 응시하면 됩니다.` },
                                        { label: '🎓 열심히 준비해서 꼭 통과하겠습니다!', reply: `좋은 자세예요. 그동안 성실히 수련해 왔으니 본인의 실력을 믿고 차분히 시험에 임하세요.` }
                                    ]
                                    : campusPeriodNotice?.kind === 'tournament'
                                        ? [
                                            { label: '🏆 토너먼트 출전 전 조언 부탁드려요', reply: `토너먼트에서는 순간 판단과 신력 배분이 승패를 가릅니다. 무리하게 몰아붙이기보다 상대의 틈을 노리세요.` },
                                            { label: '⚔️ 실전 대비는 어떻게 할까요?', reply: `실전 연무장에서 무기 숙련도와 연계기를 점검하고, 기숙사에서 피로를 완전히 회복한 상태로 출전하는 것이 좋습니다.` },
                                            { label: '🔥 좋은 성적 내고 오겠습니다!', reply: `부상 없이 후회 없는 경기를 펼치고 오길 바랍니다. 교사로서 끝까지 응원하겠습니다.` }
                                        ]
                                        : [
                                            { label: '📚 어떤 수업을 우선 들으면 좋을까요?', reply: `본인의 전투 스타일에 맞춰 주력 스탯 강의부터 수강하되, 신력 제어(CTRL)와 체력(DEF/HP)도 균형 있게 챙기는 것을 권장합니다.` },
                                            { label: '🎓 학교 생활에서 신경 쓸 점이 있을까요?', reply: `수업과 연무장 수련도 중요하지만, 동아리 활동과 학우들과의 교류 역시 실전 감각과 명성을 키우는 좋은 밑거름이 됩니다.` },
                                            { label: '🙇 항상 지도해 주셔서 감사합니다!', reply: `별말씀을요. 궁금한 점이나 진로에 대한 고민이 생기면 언제든 편하게 찾아오세요.` }
                                        ])
                                : (campusPeriodNotice?.kind === 'exam'
                                    ? [
                                        { label: '📝 시험 준비 잘 돼가?', reply: `이번 시험은 실기랑 이론 비중이 다 높아서 긴장돼! 넌 어떻게 준비하고 있어? 교무실에서 언제든 응시할 수 있대.` },
                                        { label: '📚 시험 팁 좀 알려줘!', reply: `강의실에서 부족한 스탯 수업을 듣고, 도서관에서 신력 제어(CTRL)를 올려두면 시험 평가가 훨씬 수월할 거야!` },
                                        { label: '💪 같이 시험 통과하자!', reply: `응! 우리 둘 다 좋은 성적으로 꼭 통과해서 다음 학년으로 올라가자!` }
                                    ]
                                    : campusPeriodNotice?.kind === 'tournament'
                                        ? [
                                            { label: '⚔️ 토너먼트 우승 목표야?', reply: `당연하지! 이번 토너먼트 대진표가 꽤 쟁쟁하던데, 너랑 결승에서 만나면 정말 재밌겠다!` },
                                            { label: '🔥 컨디션은 어때?', reply: `최고조야! 연무장에서 감각을 끌어올리고 왔거든. 너도 기숙사에서 충분히 쉬고 출전해!` },
                                            { label: '🤝 서로 끝까지 힘내자!', reply: `고마워! 서로 부상 없이 최고의 경기를 치르자고!` }
                                        ]
                                        : [
                                            { label: '💬 요즘 학교 생활 어때?', reply: `매일 수업 듣고 친구들이랑 대련하다 보면 하루가 금방 가더라. 그래도 실력이 느는 게 느껴져서 뿌듯해!` },
                                            { label: '📖 추천할 만한 활동 있어?', reply: `시간 될 때 대도서관 신력 서적도 읽어보고, 동아리동에서 활동도 해봐. 의외로 보너스 효과가 쏠쏠해!` },
                                            { label: '✨ 오늘 컨디션 좋아 보이네!', reply: `하하, 고마워! 너도 얼굴빛이 좋아 보이는데, 오늘 하루도 화이팅하자!` }
                                        ])
                            ).map((choice, cIdx) => (
                                <button
                                    key={cIdx}
                                    onClick={() => setActiveDialogue(prev => prev ? { ...prev, text: choice.reply } : null)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors"
                                >
                                    {choice.label}
                                </button>
                            ))}
                        </div>

                        {/* AI 자유 대화 패널 */}
                        {aiChatMode && (
                            <div className="mt-2 pt-2 border-t border-fuchsia-500/30 space-y-2">
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 text-xs">
                                    {aiChatMessages.length === 0 && (
                                        <div className="text-[11px] text-slate-400 italic">
                                            {activeDialogue.name}에게 자유롭게 말을 걸어보세요. (AI가 성격과 현재 학사 상황을 반영해 답변합니다)
                                        </div>
                                    )}
                                    {aiChatMessages.map((m, idx) => (
                                        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600/80 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                                <span className="font-bold mr-1">{m.role === 'user' ? character.name : activeDialogue.name}:</span>
                                                {m.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const msg = aiChatInput.trim();
                                        if (!msg || isAiChatLoading) return;
                                        setAiChatInput('');
                                        const nextHist = [...aiChatMessages, { role: 'user' as const, text: msg }];
                                        setAiChatMessages(nextHist);
                                        setIsAiChatLoading(true);
                                        try {
                                            const studentObj: SimpleStudent = {
                                                id: activeDialogue.id || `campus_${activeDialogue.name}`,
                                                name: activeDialogue.name,
                                                age: activeDialogue.isTeacher ? '32세' : '18세',
                                                gender: activeDialogue.gender === 'male' ? '남성' : '여성',
                                                race: '인간',
                                                nation,
                                                level: activeDialogue.npcLevel || Math.max(3, character.level || 5),
                                                personality: '성실함',
                                                appearance: activeDialogue.isTeacher ? '단정한 교사 복장' : '단정한 교복',
                                                stats: { str: 18, int: 18, wis: 15, agi: 16, con: 18 },
                                                affection: 30,
                                                classType: activeDialogue.role,
                                                chatHistory: nextHist,
                                            };
                                            const periodCtx = campusPeriodNotice ? ` [현재 학사 일정: ${campusPeriodNotice.badge}]` : '';
                                            const reply = await chatWithStudent(studentObj, msg + periodCtx, character);
                                            setAiChatMessages(prev => [...prev, { role: 'model', text: reply }]);
                                            setActiveDialogue(prev => prev ? { ...prev, text: reply } : null);
                                        } catch {
                                            setAiChatMessages(prev => [...prev, { role: 'model', text: '음, 잠시 생각이 딴 데로 샜네. 다시 한 번 말해줄래?' }]);
                                        } finally {
                                            setIsAiChatLoading(false);
                                        }
                                    }}
                                    className="flex gap-1.5"
                                >
                                    <input
                                        type="text"
                                        value={aiChatInput}
                                        onChange={e => setAiChatInput(e.target.value)}
                                        placeholder={`${activeDialogue.name}에게 할 말을 입력하세요...`}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                                        disabled={isAiChatLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isAiChatLoading || !aiChatInput.trim()}
                                        className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                                    >
                                        {isAiChatLoading ? '답변 중...' : '전송'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {showAttendanceDirect && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-cyan-600/70 p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-cyan-300">📋 교무실 출석부 (직접 열람)</h3>
                                <button onClick={() => setShowAttendanceDirect(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">소속 학년/반</span>
                                    <span className="font-bold text-white">{character.schoolData?.grade || 1}학년 {character.schoolData?.classNumber || 1}반</span>
                                </div>
                                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">재학 및 징계</span>
                                    <span className="font-bold text-emerald-400">{character.job} · 징계 {character.schoolData?.warnings || 0}/3</span>
                                </div>
                                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">이번 달 훈련 출석</span>
                                    <span className="font-bold text-cyan-300">{character.schoolData?.lastTrainingDate === (character.currentDate || '').slice(0, 7) ? '✅ 출석 완료' : '⏳ 미완료'}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">이번 달 동아리 출석</span>
                                    <span className="font-bold text-amber-300">{character.schoolData?.lastClubActivityDate === (character.currentDate || '').slice(0, 7) ? '✅ 활동 완료' : '⏳ 미완료'}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowAttendanceDirect(false)} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold cursor-pointer">확인</button>
                        </div>
                    </div>
                )}

                {showReportDirect && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-amber-600/70 p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-amber-300">📊 교무실 성적표 (직접 열람)</h3>
                                <button onClick={() => setShowReportDirect(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between p-2.5 bg-amber-950/30 rounded-xl border border-amber-800/50">
                                    <span className="text-slate-300 font-bold">교내 석차</span>
                                    <span className="font-black text-amber-300">{character.schoolData?.rank || '-'}위</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                                        <div className="text-slate-400">중간고사</div>
                                        <div className={`font-bold ${character.schoolData?.midtermPassed ? 'text-emerald-400' : 'text-slate-500'}`}>{character.schoolData?.midtermPassed ? 'PASS' : '미응시/F'}</div>
                                    </div>
                                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                                        <div className="text-slate-400">기말고사</div>
                                        <div className={`font-bold ${character.schoolData?.finalPassed ? 'text-emerald-400' : 'text-slate-500'}`}>{character.schoolData?.finalPassed ? 'PASS' : '미응시/F'}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">학교 평판 / 동아리</span>
                                    <span className="font-bold text-indigo-300">{character.schoolData?.reputation || 0}점 · {character.clubData?.joinedClub || '없음'}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowReportDirect(false)} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer">확인</button>
                        </div>
                    </div>
                )}

                {activeDivineBook && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-purple-600/70 p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-purple-300">📖 {activeDivineBook.title}</h3>
                                <button onClick={() => setActiveDivineBook(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{activeDivineBook.desc}</p>
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                                <div className="flex justify-between"><span className="text-slate-400">분류</span><span className="text-white font-bold">{activeDivineBook.category}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">소요 시간</span><span className="text-cyan-300 font-bold">{activeDivineBook.daysElapsed || 3}일 경과</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">획득 효과</span><span className="text-amber-300 font-bold">CTRL +{activeDivineBook.ctrlGain}, {activeDivineBook.statKey.toUpperCase()} +{activeDivineBook.statGain}, EXP +{activeDivineBook.expGain}</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveDivineBook(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer">닫기</button>
                                <button
                                    onClick={() => {
                                        const bookSnap = activeDivineBook;
                                        setActiveDivineBook(null);
                                        setActivityProgress({ title: `📖 ${bookSnap.title} 정독 중...`, subtitle: '서적의 원리와 신력 제어법을 체득하고 있습니다. (3일 경과)', progress: 15 });
                                        let pct = 15;
                                        const iv = setInterval(() => {
                                            pct += 25;
                                            if (pct < 100) {
                                                setActivityProgress({ title: `📖 ${bookSnap.title} 정독 중...`, subtitle: '서적의 원리와 신력 제어법을 체득하고 있습니다. (3일 경과)', progress: pct });
                                            } else {
                                                clearInterval(iv);
                                                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                                                if (bookSnap.hpCost) {
                                                    if ((newChar.stats.hp || 0) <= bookSnap.hpCost) {
                                                        setActivityProgress(null);
                                                        setCampusToast('체력이 부족하여 금서를 읽을 수 없습니다.');
                                                        setTimeout(() => setCampusToast(null), 2500);
                                                        return;
                                                    }
                                                    newChar.stats.hp = Math.max(1, (newChar.stats.hp || 10) - bookSnap.hpCost);
                                                }
                                                newChar.stats.ctrl = (newChar.stats.ctrl || 10) + bookSnap.ctrlGain;
                                                newChar.stats[bookSnap.statKey] = (newChar.stats[bookSnap.statKey] || 10) + bookSnap.statGain;
                                                newChar.currentExp = (newChar.currentExp || 0) + bookSnap.expGain;
                                                newChar.exp = (newChar.exp || 0) + bookSnap.expGain;
                                                const timeRes = processTimeSkip(newChar, bookSnap.daysElapsed || 3);
                                                onUpdateCharacter(timeRes.updatedCharacter, `[도서관] '${bookSnap.title}' 정독 (${bookSnap.daysElapsed || 3}일 경과)! (CTRL +${bookSnap.ctrlGain}, ${bookSnap.statKey.toUpperCase()} +${bookSnap.statGain}, EXP +${bookSnap.expGain})`);
                                                setActivityProgress(null);
                                                setCampusToast(`CTRL +${bookSnap.ctrlGain}, ${bookSnap.statKey.toUpperCase()} +${bookSnap.statGain}, EXP +${bookSnap.expGain} (${bookSnap.daysElapsed || 3}일 경과)`);
                                                setTimeout(() => setCampusToast(null), 2800);
                                            }
                                        }, 240);
                                    }}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    정독하기 (3일 소요)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubjectRoom && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-sky-600/70 p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-sky-300">🏫 {activeSubjectRoom.title} 수강</h3>
                                <button onClick={() => setActiveSubjectRoom(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {activeSubjectRoom.title}에서 정규 강의를 수강합니다. 수강 시 {activeSubjectRoom.statLabel} 및 경험치(EXP +20)를 획득하며 7일이 경과합니다. (일행 전체 반영)
                            </p>
                            {activeSubjectRoom.type === 'Weapon' && (
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-[11px] font-bold text-emerald-300">훈련할 무기 종류 선택</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(Object.keys(WEAPON_TYPE_KOREAN) as WeaponType[]).map(wt => (
                                            <button
                                                key={wt}
                                                onClick={() => setSelectedWeapon(wt)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                                                    selectedWeapon === wt
                                                        ? 'bg-emerald-600 text-white border-emerald-400'
                                                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                                                }`}
                                            >
                                                {WEAPON_TYPE_KOREAN[wt]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                                <div className="flex justify-between"><span className="text-slate-400">수강 비용</span><span className="text-emerald-300 font-bold">무료 (정규 수업)</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">성장 분야</span><span className="text-amber-300 font-bold">{activeSubjectRoom.type === 'Weapon' ? `${WEAPON_TYPE_KOREAN[selectedWeapon]} 숙련도` : activeSubjectRoom.statLabel} (+7일 경과)</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveSubjectRoom(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer">닫기</button>
                                <button
                                    onClick={() => {
                                        if (character.job !== JobType.STUDENT) {
                                            setCampusToast('학생 직업일 때만 정규 수업 수강이 가능합니다.');
                                            setTimeout(() => setCampusToast(null), 2600);
                                            return;
                                        }
                                        if ((character.schoolData?.warnings || 0) >= 3) {
                                            setCampusToast('정학 상태입니다. 교무실에서 징계가 풀릴 때까지 대기하세요.');
                                            setTimeout(() => setCampusToast(null), 2600);
                                            return;
                                        }
                                        const curMonth = parseInt((character.currentDate || '0001-03-01').split('-')[1] || '3', 10);
                                        if (curMonth === 1 || curMonth === 2) {
                                            setCampusToast('현재는 겨울 방학 기간입니다. (1~2월)');
                                            setTimeout(() => setCampusToast(null), 2600);
                                            return;
                                        }
                                        const subjSnap = activeSubjectRoom;
                                        const wepSnap = selectedWeapon;
                                        setActiveSubjectRoom(null);
                                        setActivityProgress({ title: `🏫 ${subjSnap.title} 수업 진행 중...`, subtitle: '이론 강의와 실전 수련을 진행하고 있습니다. (7일 경과)', progress: 15 });
                                        let pct = 15;
                                        const iv = setInterval(() => {
                                            pct += 25;
                                            if (pct < 100) {
                                                setActivityProgress({ title: `🏫 ${subjSnap.title} 수업 진행 중...`, subtitle: '이론 강의와 실전 수련을 진행하고 있습니다. (7일 경과)', progress: pct });
                                            } else {
                                                clearInterval(iv);
                                                const { updatedCharacter, systemLogs } = processTimeSkip(character, 7);
                                                const newChar = JSON.parse(JSON.stringify(updatedCharacter)) as Character;
                                                let multiplier = 1;
                                                let expGain = 20;
                                                let eventMsg = '';
                                                const repBonus = (newChar.schoolData?.reputation || 0) >= 10 ? 1 : 0;
                                                if (repBonus > 0) eventMsg += ' (높은 평판으로 효율 증가)';
                                                if (newChar.schoolData?.homeroomTeacher && Math.random() < 0.3) {
                                                    const teacher = newChar.schoolData.homeroomTeacher;
                                                    teacher.affection = (teacher.affection || 0) + 1;
                                                    if (newChar.socialNetwork) {
                                                        const st = newChar.socialNetwork.find(n => n.id === teacher.id);
                                                        if (st) st.affection = teacher.affection;
                                                    }
                                                    eventMsg += `\n(담임 교사 ${teacher.name}의 호감도가 상승했습니다.)`;
                                                }
                                                const roll = Math.random();
                                                if (roll < 0.1) {
                                                    multiplier = 2;
                                                    eventMsg += '\n(이벤트: 교관님께 칭찬을 들어 성취감이 2배가 되었습니다!)';
                                                    if (newChar.schoolData) newChar.schoolData.reputation += 2;
                                                } else if (roll < 0.2) {
                                                    multiplier = 0;
                                                    expGain = 0;
                                                    eventMsg += '\n(이벤트: 수업 중에 졸다가 걸려 혼났습니다... 능력치 변동 없음)';
                                                    if (newChar.schoolData) newChar.schoolData.reputation -= 1;
                                                }
                                                const val = (multiplier === 2 ? 2 : 1) * multiplier + repBonus;
                                                const applyToEntity = (entity: any) => {
                                                    if (expGain > 0) {
                                                        entity.currentExp = (entity.currentExp || 0) + expGain;
                                                        if (typeof entity.exp === 'number') entity.exp += expGain;
                                                    }
                                                    if (multiplier > 0) {
                                                        if (subjSnap.type === 'Combat') { entity.stats.str += val; entity.stats.agi += val; }
                                                        else if (subjSnap.type === 'Magic') { entity.stats.int += 2 * val; }
                                                        else if (subjSnap.type === 'Divine') { entity.stats.ctrl = (entity.stats.ctrl || 10) + 2 * val; }
                                                        else if (subjSnap.type === 'Strategy') { entity.stats.wis += 2 * val; }
                                                        else if (subjSnap.type === 'Physical') { entity.stats.def += 2 * val; }
                                                        else if (subjSnap.type === 'Weapon') {
                                                            const wt = ('id' in entity) ? (entity.equipment?.weapon ? getWeaponTypeFromItem(entity.equipment.weapon) : null) : wepSnap;
                                                            if (wt) {
                                                                const res = addMasteryExp(entity, wt as WeaponType, 5 * multiplier + repBonus);
                                                                entity.weaponMastery = (res.char as any).weaponMastery;
                                                            }
                                                        }
                                                    }
                                                };
                                                applyToEntity(newChar);
                                                newChar.companions = (newChar.companions || []).map(c => {
                                                    const nc = { ...c, stats: { ...c.stats }, weaponMastery: { ...(c.weaponMastery || {}) } };
                                                    applyToEntity(nc);
                                                    return nc;
                                                });
                                                if (newChar.inactiveCompanions) {
                                                    newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                                                        const nc = { ...c, stats: { ...c.stats }, weaponMastery: { ...(c.weaponMastery || {}) } };
                                                        applyToEntity(nc);
                                                        return nc;
                                                    });
                                                }
                                                let gainText = '변동 없음';
                                                if (multiplier > 0) {
                                                    if (subjSnap.type === 'Combat') gainText = `STR +${val}, AGI +${val}`;
                                                    else if (subjSnap.type === 'Magic') gainText = `INT +${2 * val}`;
                                                    else if (subjSnap.type === 'Divine') gainText = `CTRL +${2 * val}`;
                                                    else if (subjSnap.type === 'Strategy') gainText = `WIS +${2 * val}`;
                                                    else if (subjSnap.type === 'Physical') gainText = `DEF +${2 * val}`;
                                                    else if (subjSnap.type === 'Weapon') gainText = `${WEAPON_TYPE_KOREAN[wepSnap]} 숙련도 +${5 * multiplier + repBonus}`;
                                                }
                                                if (expGain > 0) gainText += `, EXP +${expGain}`;
                                                const sysMsg = systemLogs.length > 0 ? `\n[기간 중 소식]\n${systemLogs.slice(0, 3).join('\n')}` : '';
                                                onUpdateCharacter(newChar, `[학교 생활] ${subjSnap.title} 수업 완료. (${gainText}) (일행 전체 반영됨) (1주일 경과)${eventMsg}${sysMsg}`);
                                                setActivityProgress(null);
                                                setCampusToast(`${subjSnap.title} 수강 완료! (${gainText})`);
                                                setTimeout(() => setCampusToast(null), 2800);
                                            }
                                        }, 240);
                                    }}
                                    className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    수강하기 (7일 경과)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activityProgress && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-cyan-500/70 p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
                            <div className="text-sm font-black text-cyan-300">{activityProgress.title}</div>
                            <p className="text-xs text-slate-300">{activityProgress.subtitle}</p>
                            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-200"
                                    style={{ width: `${Math.min(100, activityProgress.progress)}%` }}
                                />
                            </div>
                            <div className="text-right text-[11px] font-bold text-cyan-200">{Math.min(100, activityProgress.progress)}%</div>
                        </div>
                    </div>
                )}

                {/* Mobile D-Pad */}
                <div className="absolute bottom-4 left-4 z-20 grid grid-cols-3 gap-1.5 w-36 h-36 sm:w-40 sm:h-40 opacity-90 select-none">
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadRef.current = "up"; }}
                            onPointerUp={() => { dpadRef.current = null; }}
                            onPointerLeave={() => { dpadRef.current = null; }}
                            onPointerCancel={() => { dpadRef.current = null; }}
                            className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                        >
                            "▲"
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadRef.current = "left"; }}
                            onPointerUp={() => { dpadRef.current = null; }}
                            onPointerLeave={() => { dpadRef.current = null; }}
                            onPointerCancel={() => { dpadRef.current = null; }}
                            className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                        >
                            "◀"
                        </button>
                        <button
                            type="button"
                            onClick={handleInteract}
                            className="bg-amber-600/90 active:bg-amber-500 active:scale-95 border border-amber-300 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg"
                        >
                            확인
                        </button>
                        <button
                            type="button"
                            onPointerDown={() => { dpadRef.current = "right"; }}
                            onPointerUp={() => { dpadRef.current = null; }}
                            onPointerLeave={() => { dpadRef.current = null; }}
                            onPointerCancel={() => { dpadRef.current = null; }}
                            className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                        >
                            "▶"
                        </button>
                        <div />
                        <button
                            type="button"
                            onPointerDown={() => { dpadRef.current = "down"; }}
                            onPointerUp={() => { dpadRef.current = null; }}
                            onPointerLeave={() => { dpadRef.current = null; }}
                            onPointerCancel={() => { dpadRef.current = null; }}
                            className="bg-slate-900/85 active:bg-amber-600/85 border border-slate-600/80 rounded-xl flex items-center justify-center text-white"
                        >
                            "▼"
                        </button>
                        <div />
                    </div>

                {showClubVisualModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
                        <div className="bg-slate-900 border border-emerald-600/70 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-4 shadow-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-emerald-300">🎭 {character.clubData?.joinedClub} 동아리실</h3>
                                <button onClick={() => setShowClubVisualModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <ClubModal
                                character={character}
                                onUpdateCharacter={(newChar, log) => onUpdateCharacter(newChar, log)}
                            />
                        </div>
                    </div>
                )}

                {activeClubApply && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-slate-900 border border-emerald-600/70 p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-base font-bold text-emerald-300">🎭 {activeClubApply.title}</h3>
                                <button onClick={() => setActiveClubApply(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{activeClubApply.desc}</p>
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                                <div className="font-bold text-amber-400">동아리 혜택</div>
                                {activeClubApply.benefits.map((b, idx) => <div key={idx} className="text-slate-300">• {b}</div>)}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveClubApply(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer">닫기</button>
                                <button
                                    onClick={() => {
                                        const cur = character.clubData?.joinedClub || ClubType.NONE;
                                        if (cur === activeClubApply.club) {
                                            setCampusToast(`이미 ${activeClubApply.club} 소속입니다.`);
                                            setTimeout(() => setCampusToast(null), 2500);
                                            return;
                                        }
                                        if (cur !== ClubType.NONE && !window.confirm(`현재 '${cur}' 소속입니다. '${activeClubApply.club}'로 변경하시겠습니까?`)) return;
                                        const newChar = JSON.parse(JSON.stringify(character)) as Character;
                                        newChar.clubData = {
                                            joinedClub: activeClubApply.club,
                                            activityCount: 0,
                                            contribution: 0,
                                        };
                                        onUpdateCharacter(newChar, `[동아리동] '${activeClubApply.club}'에 정식 가입했습니다!`);
                                        setCampusToast(`'${activeClubApply.club}' 가입 완료!`);
                                        setTimeout(() => setCampusToast(null), 2800);
                                        setActiveClubApply(null);
                                    }}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    {character.clubData?.joinedClub === activeClubApply.club ? '현재 소속 중' : `${activeClubApply.club} 가입 신청`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {openModalZone && activeSchoolTier && (
                    <SchoolModal
                        character={character}
                        initialZone={openModalZone}
                        lockedZone={
                            openModalZone === 'Office' ||
                            openModalZone === 'Classroom' ||
                            openModalZone === 'Training' ||
                            openModalZone === 'Dormitory'
                                ? openModalZone
                                : undefined
                        }
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
