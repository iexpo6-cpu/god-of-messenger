import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, JobType, MilitaryRank } from '../types';
import { MILITARY_RANK_ORDER } from '../constants';
import { generateName } from '../utils';
import { REGIONAL_MERCENARY_GROUPS, DEFAULT_MERCENARY_GROUPS } from '../worldguild.ts';
import {
    getCachedCityAssetImage,
    getInteriorPropSpriteUrl,
    loadCityAssetImage
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
import MercenaryGuildModal from './MercenaryGuildModal';
import MercenaryTrainingModal from './MercenaryTrainingModal';
import MercenaryFactionModal from './MercenaryFactionModal';
import MercenaryGroupModal from './MercenaryGroupModal';
import MilitaryModal from './MilitaryModal';
import MilitaryTrainingModal from './MilitaryTrainingModal';
import MilitaryFacilityModal from './MilitaryFacilityModal';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, DoorOpen, MessageSquare, Shield, Sparkles, X } from 'lucide-react';

export type FactionCompoundKind = 'Mercenary' | 'Military';
type SubRoomKind = null | 'joined_faction' | 'own_group' | 'military_command';

type MercTab = 'register' | 'board' | 'blacklist' | 'recruit' | 'promotion' | 'group' | 'join';
type MilTab = 'enlist' | 'duty' | 'war' | 'promotion' | 'recruit' | 'command';

interface CompoundNpcNode {
    id: string;
    name: string;
    role: string;
    dialogue: string;
    actionLabel: string;
    mercTab?: MercTab;
    milTab?: MilTab;
    openMercTraining?: boolean;
    openMilTraining?: boolean;
    openFactionModal?: boolean;
    openGroupModal?: boolean;
    openMilFacility?: boolean;
    enterSubRoom?: Exclude<SubRoomKind, null>;
    requiresEnlisted?: boolean;
    requiresMilitaryCommand?: boolean;
    badgeColor: string;
    spriteUrl: string;
    px: number;
    py: number;
    dir: SpriteDirection;
}

interface CompoundPropNode {
    key: string;
    tx: number;
    ty: number;
    w: number;
    h: number;
    bg: string;
    border: string;
    icon: string;
    label?: string;
    enterSubRoom?: Exclude<SubRoomKind, null>;
    lockedReason?: string;
}

interface FactionCompoundCanvasProps {
    character: Character;
    kind: FactionCompoundKind;
    region: string;
    nation: string;
    city: string;
    onExitToCity: () => void;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
    onAction?: (action: string) => void;
}

const MAIN_COLS = 24;
const MAIN_ROWS = 16;
const SUB_COLS = 18;
const SUB_ROWS = 12;

const FactionCompoundCanvas: React.FC<FactionCompoundCanvasProps> = ({
    character,
    kind,
    region,
    nation,
    city,
    onExitToCity,
    onUpdateCharacter,
    onAction
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState({ w: 960, h: 580 });

    const [subRoom, setSubRoom] = useState<SubRoomKind>(null);
    const [activeMercTab, setActiveMercTab] = useState<MercTab | null>(null);
    const [activeMilTab, setActiveMilTab] = useState<MilTab | null>(null);
    const [isMercTrainingOpen, setIsMercTrainingOpen] = useState(false);
    const [isMilTrainingOpen, setIsMilTrainingOpen] = useState(false);
    const [isFactionModalOpen, setIsFactionModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isMilFacilityOpen, setIsMilFacilityOpen] = useState(false);
    const [selectedNpc, setSelectedNpc] = useState<CompoundNpcNode | null>(null);
    const [lockedNotice, setLockedNotice] = useState<string | null>(null);
    const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);

    const cols = subRoom ? SUB_COLS : MAIN_COLS;
    const rows = subRoom ? SUB_ROWS : MAIN_ROWS;

    const playerSpriteUrl = useMemo(
        () => resolveEntityRpgSprite(character as any, region, nation).url,
        [character, region, nation]
    );

    const allComps = useMemo(
        () => [...(character.companions || []), ...(character.inactiveCompanions || [])],
        [character.companions, character.inactiveCompanions]
    );
    const isEnlistedInParty = useMemo(
        () =>
            (character.job === JobType.SOLDIER && character.nation === nation) ||
            allComps.some(c => c.job === JobType.SOLDIER && c.nation === nation),
        [character.job, character.nation, nation, allComps]
    );
    const effectiveCommander = useMemo(() => {
        if (character.job === JobType.SOLDIER && character.nation === nation) {
            const rank = character.militaryRank || MilitaryRank.PVT;
            return {
                id: 'player',
                name: character.name,
                rank,
                rankIdx: Math.max(0, MILITARY_RANK_ORDER.indexOf(rank))
            };
        }
        const comp = allComps.find(c => c.job === JobType.SOLDIER && c.nation === nation);
        if (comp) {
            const rank = comp.militaryRank || MilitaryRank.PVT;
            return {
                id: comp.id,
                name: comp.name,
                rank,
                rankIdx: Math.max(0, MILITARY_RANK_ORDER.indexOf(rank))
            };
        }
        return { id: 'player', name: character.name, rank: MilitaryRank.PVT, rankIdx: 0 };
    }, [character, nation, allComps]);

    const hasMilitaryCommand = useMemo(() => {
        if (!isEnlistedInParty) return false;
        const officerIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT);
        const isRegionalCmdr =
            character.militaryData?.regionalAppointments?.[city] === 'player' ||
            character.militaryData?.regionalViceAppointments?.[city] === 'player';
        return effectiveCommander.rankIdx >= officerIdx || isRegionalCmdr;
    }, [isEnlistedInParty, effectiveCommander.rankIdx, character.militaryData, city]);

    const joinedGroup = useMemo(() => {
        const joinedGroupId = character.mercenaryData?.joinedGroupId;
        if (!joinedGroupId) return null;
        for (const cityKey in REGIONAL_MERCENARY_GROUPS) {
            const found = REGIONAL_MERCENARY_GROUPS[cityKey].find(g => g.id === joinedGroupId);
            if (found) return found;
        }
        const cityFromId = joinedGroupId.split('_')[0];
        const defaultGroups = DEFAULT_MERCENARY_GROUPS(character.nation, cityFromId);
        return defaultGroups.find(g => g.id === joinedGroupId) || null;
    }, [character.mercenaryData?.joinedGroupId, character.nation]);

    const isGroupLeader = Boolean(character.mercenaryData?.isGroupLeader);
    const ownGroupName = character.mercenaryData?.groupName || `${character.name}의 용병단`;

    const npcNames = useMemo(
        () => ({
            n1: generateName(nation, 'female'),
            n2: generateName(nation, 'male'),
            n3: generateName(nation, 'male'),
            n4: generateName(nation, 'female'),
            n5: generateName(nation, 'male'),
            n6: generateName(nation, 'female'),
            n7: generateName(nation, 'male'),
            n8: generateName(nation, 'male')
        }),
        [nation]
    );

    const npcs = useMemo<CompoundNpcNode[]>(() => {
        const make = (
            id: string,
            name: string,
            role: string,
            dialogue: string,
            actionLabel: string,
            tx: number,
            ty: number,
            gender: 'male' | 'female',
            extra: Partial<CompoundNpcNode>
        ): CompoundNpcNode => ({
            id,
            name,
            role,
            dialogue,
            actionLabel,
            badgeColor: extra.badgeColor || '#dc2626',
            spriteUrl: resolveEntityRpgSprite({ name, gender, appearance: '' } as any, region, nation).url,
            px: (tx + 0.5) * CITY_TILE_SIZE,
            py: (ty + 0.5) * CITY_TILE_SIZE,
            dir: 'down',
            ...extra
        });

        // Sub-rooms
        if (subRoom === 'joined_faction' && joinedGroup) {
            const capBond = character.socialNetwork?.find(n => n.id === `faction_core_${joinedGroup.id}_Captain`);
            const viceBond = character.socialNetwork?.find(n => n.id === `faction_core_${joinedGroup.id}_Vice`);
            const capName = capBond?.name || joinedGroup.captain || `단장 ${npcNames.n2}`;
            const viceName = viceBond?.name || joinedGroup.viceCaptain || `부단장 ${npcNames.n4}`;
            const factionBonds = (character.socialNetwork || []).filter(
                n =>
                    n.id !== `faction_core_${joinedGroup.id}_Captain` &&
                    n.id !== `faction_core_${joinedGroup.id}_Vice` &&
                    (n.factionId === joinedGroup.id || n.originName === joinedGroup.name)
            );
            const list: CompoundNpcNode[] = [
                make(
                    'jf_leader',
                    capName,
                    `${joinedGroup.name} 용병단장`,
                    `${joinedGroup.name} 본부에 오신 것을 환영하오! 단원으로서의 임무와 혜택을 확인해 보시오.`,
                    `${joinedGroup.name} 본부 관리`,
                    8.5,
                    3.2,
                    capBond?.gender === '여성' ? 'female' : 'male',
                    { openFactionModal: true, badgeColor: '#e11d48' }
                ),
                make(
                    'jf_vice',
                    viceName,
                    `${joinedGroup.name} 부단장`,
                    `${joinedGroup.name}의 실무와 보급을 총괄하고 있습니다. 필요한 게 있으면 말씀하세요.`,
                    '세력 현황 보기',
                    4.0,
                    5.8,
                    viceBond?.gender === '여성' ? 'female' : 'male',
                    { openFactionModal: true, badgeColor: '#4f46e5' }
                ),
                make(
                    'jf_trainer',
                    `교관 ${npcNames.n8}`,
                    '용병단 훈련 교관',
                    '우리 용병단의 명성에 걸맞게 실전 훈련으로 단련합시다!',
                    '용병단 훈련 시작',
                    13.8,
                    5.8,
                    'male',
                    { openMercTraining: true, badgeColor: '#ea580c' }
                )
            ];
            const memberSlots = [
                { tx: 4.5, ty: 8.2 },
                { tx: 6.2, ty: 8.8 },
                { tx: 12.6, ty: 8.2 }
            ];
            const fallbackMemberNames = [npcNames.n3, npcNames.n1, npcNames.n5];
            for (let i = 0; i < 3; i++) {
                const bond = factionBonds[i];
                const mName = bond?.name || fallbackMemberNames[i];
                const mGender: 'male' | 'female' = bond?.gender === '여성' ? 'female' : i === 1 ? 'female' : 'male';
                list.push(
                    make(
                        `jf_mem_${i}`,
                        mName,
                        `${joinedGroup.name} 단원`,
                        `${capName} 단장님과 ${viceName} 부단장님 아래에서 함께 싸우고 있습니다!`,
                        '세력 현황 보기',
                        memberSlots[i].tx,
                        memberSlots[i].ty,
                        mGender,
                        { openFactionModal: true, badgeColor: '#475569' }
                    )
                );
            }
            return list;
        }

        if (subRoom === 'own_group') {
            const memberIds = character.mercenaryData?.groupMembers || [];
            const actualGroupMembers = memberIds
                .map(id => allComps.find(c => c.id === id))
                .filter((c): c is NonNullable<typeof c> => Boolean(c));
            const viceMember = actualGroupMembers.find(c => c.isViceCaptain);

            const list: CompoundNpcNode[] = [
                make(
                    'og_staff',
                    viceMember ? viceMember.name : `참모 ${npcNames.n7}`,
                    viceMember ? `${ownGroupName} 부단장` : `${ownGroupName} 참모`,
                    `${character.name} 단장님! ${ownGroupName}의 단원 편성과 임무를 지휘하실 수 있습니다.`,
                    '용병단 지휘 / 관리',
                    8.5,
                    3.2,
                    viceMember?.gender === '여성' ? 'female' : 'male',
                    { openGroupModal: true, badgeColor: '#d97706' }
                ),
                make(
                    'og_trainer',
                    `교관 ${npcNames.n8}`,
                    '용병단 전담 교관',
                    `${ownGroupName} 단원들의 전투력을 끌어올릴 전담 훈련을 준비했습니다!`,
                    '용병단 훈련 시작',
                    13.8,
                    5.8,
                    'male',
                    { openMercTraining: true, badgeColor: '#ea580c' }
                )
            ];
            const memberSlots = [
                { tx: 4.0, ty: 5.8 },
                { tx: 4.5, ty: 8.2 },
                { tx: 6.2, ty: 8.8 },
                { tx: 12.6, ty: 8.2 },
                { tx: 13.8, ty: 8.8 }
            ];
            const displayMembers = actualGroupMembers.filter(m => m.id !== viceMember?.id).slice(0, 5);
            displayMembers.forEach((comp, idx) => {
                const slot = memberSlots[idx % memberSlots.length];
                list.push(
                    make(
                        `og_comp_${comp.id}`,
                        comp.name,
                        `${ownGroupName} 단원 (Lv.${comp.level})`,
                        `"${character.name} 단장님, 언제든 출격할 준비가 되어 있습니다!"`,
                        '용병단 현황 보기',
                        slot.tx,
                        slot.ty,
                        comp.gender === '여성' ? 'female' : 'male',
                        { openGroupModal: true, badgeColor: '#0284c7' }
                    )
                );
            });
            return list;
        }

        if (subRoom === 'military_command') {
            return [
                make(
                    'mc_cmd',
                    `참모총장 ${npcNames.n5}`,
                    '지휘 통제실 총괄',
                    `${effectiveCommander.name} (${effectiveCommander.rank}) 지휘관님, 지휘 통제 및 파견·지역 관리를 보좌하겠습니다.`,
                    '지휘 통제 열기',
                    8.5,
                    3.2,
                    'male',
                    { milTab: 'command', badgeColor: '#7c3aed' }
                ),
                make(
                    'mc_fac',
                    `시설관 ${npcNames.n4}`,
                    '군사 시설 · 파견 담당',
                    '부대 시설 운용과 일반·특수 군사 파견 명령을 집행합니다.',
                    '군사 시설 / 파견 열기',
                    4.2,
                    5.8,
                    'female',
                    { openMilFacility: true, badgeColor: '#0284c7' }
                ),
                make(
                    'mc_train',
                    `교관 ${npcNames.n8}`,
                    '지휘부 군사 훈련 교관',
                    '지휘관 직속 부대원들의 강도 높은 군사 훈련을 지시하십시오!',
                    '군사 훈련 시작',
                    13.8,
                    5.8,
                    'male',
                    { openMilTraining: true, badgeColor: '#ea580c' }
                )
            ];
        }

        // Main Compounds
        if (kind === 'Mercenary') {
            const isRegistered = Boolean(character.mercenaryData);
            return [
                make(
                    'merc_reg',
                    `접수관 ${npcNames.n1}`,
                    '용병길드 접수처',
                    isRegistered
                        ? `${character.name}님, ${city} 용병길드 지부에 오신 것을 환영합니다.`
                        : '모험가여, 용병 길드에 정식 등록하고 명성과 보상을 쌓아보시겠습니까?',
                    isRegistered ? '길드 현황 보기' : '용병 길드 등록하기',
                    11.5,
                    3.2,
                    'female',
                    { mercTab: isRegistered ? 'board' : 'register', badgeColor: '#ef4444' }
                ),
                make(
                    'merc_board',
                    `의뢰 중개인 ${npcNames.n2}`,
                    '의뢰 게시판 담당',
                    '토벌, 호위, 탐색까지 등급에 맞는 다양한 의뢰가 걸려 있습니다.',
                    '의뢰 게시판 열기',
                    15.5,
                    3.6,
                    'male',
                    { mercTab: 'board', badgeColor: '#dc2626' }
                ),
                make(
                    'merc_black',
                    `감시관 ${npcNames.n3}`,
                    '블랙리스트 관리',
                    '이 지역을 위협하는 악명 높은 현상수배범 명단을 관리하고 있습니다.',
                    '블랙리스트 확인',
                    7.5,
                    3.6,
                    'male',
                    { mercTab: 'blacklist', badgeColor: '#d97706' }
                ),
                make(
                    'merc_recruit',
                    `모집관 ${npcNames.n4}`,
                    '용병 고용 담당',
                    '함께 전장을 누빌 실력 있는 용병 동료를 소개해 드립니다.',
                    '용병 고용하기',
                    4.0,
                    5.2,
                    'female',
                    { mercTab: 'recruit', badgeColor: '#4f46e5' }
                ),
                make(
                    'merc_join',
                    `외교관 ${npcNames.n5}`,
                    '용병 세력 가입',
                    '대륙의 유력 용병 세력에 가담해 전용 혜택을 누려보세요.',
                    '세력 가입 보기',
                    4.0,
                    11.4,
                    'male',
                    { mercTab: 'join', badgeColor: '#be123c' }
                ),
                make(
                    'merc_promo',
                    `심사관 ${npcNames.n6}`,
                    '승급 심사관',
                    '충분한 명성과 실적을 쌓으셨다면 상위 용병 등급 심사를 보실 수 있습니다.',
                    '승급 심사 받기',
                    19.2,
                    5.2,
                    'female',
                    { mercTab: 'promotion', badgeColor: '#059669' }
                ),
                make(
                    'merc_group',
                    `참모 ${npcNames.n7}`,
                    '용병단 창설·관리',
                    '자신만의 용병단을 창설하거나 용병단 지휘 권한을 관리합니다.',
                    '용병단 창설/관리 열기',
                    19.2,
                    11.4,
                    'male',
                    { mercTab: 'group', badgeColor: '#b45309' }
                )
            ];
        }

        // Military Main Compound (Training Instructor moved to military_command!)
        return [
            make(
                'mil_enlist',
                `모병관 ${npcNames.n2}`,
                '국방군 모병처',
                isEnlistedInParty
                    ? `${nation} 국방군에 복무 중이시군요. 충성!`
                    : `${nation}을 수호할 용감한 인재를 모집하고 있습니다. 입대하시겠습니까?`,
                '입대 안내 / 병적 확인',
                8.2,
                11.8,
                'male',
                { milTab: 'enlist', badgeColor: '#0284c7' }
            ),
            make(
                'mil_duty',
                `작전 장교 ${npcNames.n1}`,
                '작전 게시판 담당',
                '국가 안보와 지역 치안을 위한 군사 작전 명령을 하달합니다.',
                '작전 게시판 열기',
                11.5,
                3.2,
                'female',
                { milTab: 'duty', requiresEnlisted: true, badgeColor: '#2563eb' }
            ),
            make(
                'mil_promo',
                `인사관 ${npcNames.n4}`,
                '인사 및 승급',
                '공적치를 바탕으로 장교 및 고위 계급 진급 심사를 진행합니다.',
                '인사 및 승급 열기',
                6.5,
                4.2,
                'female',
                { milTab: 'promotion', requiresEnlisted: true, badgeColor: '#0d9488' }
            ),
            make(
                'mil_war',
                `전선 정보관 ${npcNames.n3}`,
                '전선 상황실',
                '국경 전선 상황과 타국과의 전쟁·침공 현황을 브리핑합니다.',
                '전선 상황 보기',
                16.5,
                4.2,
                'male',
                { milTab: 'war', requiresEnlisted: true, badgeColor: '#e11d48' }
            ),
            make(
                'mil_recruit',
                `충원관 ${npcNames.n6}`,
                '부대원 충원 막사',
                '부대 전투력을 보강할 정예 병사와 부대원을 편성합니다.',
                '부대원 충원 열기',
                4.0,
                8.0,
                'female',
                { milTab: 'recruit', requiresEnlisted: true, badgeColor: '#4f46e5' }
            ),
            make(
                'mil_cmd_guard',
                `지휘실 위병 ${npcNames.n5}`,
                '지휘통제실 출입구',
                hasMilitaryCommand
                    ? `${effectiveCommander.name} 지휘관님, 별도의 지휘통제실로 안내해 드리겠습니다.`
                    : '소위 이상 장교 임관 또는 지역 지휘권을 보유해야 군사 지휘통제실(훈련·시설·파견)에 입장할 수 있습니다.',
                '지휘통제실 입장하기',
                19.2,
                7.6,
                'male',
                { enterSubRoom: 'military_command', requiresMilitaryCommand: true, badgeColor: '#7c3aed' }
            )
        ];
    }, [
        subRoom,
        joinedGroup,
        ownGroupName,
        kind,
        character.mercenaryData,
        character.name,
        character.companions,
        effectiveCommander,
        city,
        nation,
        region,
        npcNames,
        isEnlistedInParty,
        hasMilitaryCommand
    ]);

    const propsList = useMemo<CompoundPropNode[]>(() => {
        if (subRoom === 'joined_faction' && joinedGroup) {
            return [
                { key: 'merc_reception_desk', tx: 7.0, ty: 2.2, w: 4.0, h: 1.6, bg: '#451a03', border: '#e11d48', icon: '👑', label: `${joinedGroup.name} 단장석` },
                { key: 'merc_banner', tx: 2.2, ty: 2.2, w: 2.0, h: 2.0, bg: '#4c0519', border: '#f43f5e', icon: '🚩' },
                { key: 'merc_supply_crate', tx: 2.0, ty: 5.0, w: 2.2, h: 1.8, bg: '#78350f', border: '#fbbf24', icon: '📦', label: '보급고' },
                { key: 'merc_training_dummy', tx: 13.6, ty: 5.0, w: 2.2, h: 1.8, bg: '#78350f', border: '#f97316', icon: '🥊', label: '훈련장' },
                { key: 'merc_brazier', tx: 13.6, ty: 2.2, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' }
            ];
        }
        if (subRoom === 'own_group') {
            return [
                { key: 'merc_briefing_table', tx: 7.0, ty: 2.2, w: 4.0, h: 1.6, bg: '#451a03', border: '#f59e0b', icon: '👑', label: `${ownGroupName} 지휘탁` },
                { key: 'merc_banner', tx: 2.2, ty: 2.2, w: 2.0, h: 2.0, bg: '#78350f', border: '#fbbf24', icon: '🏴' },
                { key: 'merc_supply_crate', tx: 2.0, ty: 5.2, w: 2.2, h: 1.8, bg: '#78350f', border: '#fbbf24', icon: '📦' },
                { key: 'merc_training_dummy', tx: 13.6, ty: 5.0, w: 2.2, h: 1.8, bg: '#78350f', border: '#f97316', icon: '🥊', label: '단원 훈련장' },
                { key: 'merc_brazier', tx: 13.6, ty: 2.2, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' }
            ];
        }
        if (subRoom === 'military_command') {
            return [
                { key: 'mil_command_podium', tx: 7.2, ty: 2.0, w: 3.6, h: 1.8, bg: '#3b0764', border: '#a855f7', icon: '👑', label: '지휘관 단상' },
                { key: 'mil_dispatch_desk', tx: 2.2, ty: 5.0, w: 2.4, h: 1.8, bg: '#0c4a6e', border: '#38bdf8', icon: '📡', label: '시설 · 파견실' },
                { key: 'mil_training_dummy', tx: 13.6, ty: 5.0, w: 2.2, h: 1.8, bg: '#78350f', border: '#f97316', icon: '⚔️', label: '지휘부 연병장' },
                { key: 'mil_brazier', tx: 2.4, ty: 2.2, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' },
                { key: 'mil_brazier', tx: 13.8, ty: 2.2, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' }
            ];
        }

        if (kind === 'Mercenary') {
            const list: CompoundPropNode[] = [
                { key: 'merc_reception_desk', tx: 9.8, ty: 2.2, w: 4.2, h: 1.6, bg: '#451a03', border: '#ef4444', icon: '📜', label: '접수처' },
                { key: 'merc_bounty_board', tx: 6.2, ty: 2.0, w: 2.8, h: 1.8, bg: '#1e293b', border: '#f59e0b', icon: '🎯', label: '블랙리스트' },
                { key: 'merc_quest_board', tx: 14.6, ty: 2.0, w: 2.8, h: 1.8, bg: '#1e293b', border: '#ef4444', icon: '📋', label: '의뢰 게시판' },
                { key: 'merc_briefing_table', tx: 5.0, ty: 8.6, w: 2.6, h: 1.8, bg: '#78350f', border: '#fbbf24', icon: '🍺' },
                { key: 'merc_brazier', tx: 16.4, ty: 8.6, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' }
            ];
            if (joinedGroup) {
                list.push({
                    key: 'district_general_shop',
                    tx: 1.6,
                    ty: 7.0,
                    w: 3.0,
                    h: 2.2,
                    bg: '#4c0519',
                    border: '#f43f5e',
                    icon: '🏰',
                    label: `🏰 ${joinedGroup.name} 본부`,
                    enterSubRoom: 'joined_faction'
                });
            } else {
                list.push({ key: 'merc_banner', tx: 2.2, ty: 7.4, w: 2.0, h: 2.0, bg: '#312e81', border: '#6366f1', icon: '🚩' });
            }
            if (isGroupLeader) {
                list.push({
                    key: 'district_weapon_shop',
                    tx: 18.8,
                    ty: 7.0,
                    w: 3.0,
                    h: 2.2,
                    bg: '#78350f',
                    border: '#f59e0b',
                    icon: '👑',
                    label: `👑 ${ownGroupName} 본부`,
                    enterSubRoom: 'own_group'
                });
            } else {
                list.push({ key: 'merc_supply_crate', tx: 18.8, ty: 7.4, w: 2.4, h: 1.8, bg: '#451a03', border: '#f59e0b', icon: '📦' });
            }
            return list;
        }

        // Military Main Compound
        return [
            { key: 'mil_strategy_table', tx: 9.8, ty: 2.2, w: 4.2, h: 1.8, bg: '#1e3a8a', border: '#38bdf8', icon: '🗺️', label: '작전 본부' },
            { key: 'mil_war_board', tx: 15.2, ty: 2.0, w: 3.0, h: 1.8, bg: '#4c0519', border: '#fb7185', icon: '🔥', label: '전선 현황판' },
            { key: 'mil_barracks_rack', tx: 2.2, ty: 6.4, w: 2.2, h: 2.0, bg: '#1e293b', border: '#60a5fa', icon: '🛡️' },
            { key: 'mil_recruit_desk', tx: 6.5, ty: 10.4, w: 2.4, h: 1.6, bg: '#0c4a6e', border: '#38bdf8', icon: '🪖', label: '모병처' },
            { key: 'mil_brazier', tx: 15.0, ty: 10.2, w: 1.6, h: 1.6, bg: '#7c2d12', border: '#f59e0b', icon: '🔥' },
            {
                key: 'mil_command_podium',
                tx: 18.2,
                ty: 4.4,
                w: 3.0,
                h: 2.2,
                bg: '#3b0764',
                border: hasMilitaryCommand ? '#a855f7' : '#64748b',
                icon: '👑',
                label: hasMilitaryCommand ? '🚪 지휘통제실 입장' : '🔒 지휘통제실 (장교 전용)',
                enterSubRoom: 'military_command',
                lockedReason: hasMilitaryCommand ? undefined : '소위 이상 장교 임관 또는 지역 지휘권을 보유해야 입장할 수 있습니다.'
            }
        ];
    }, [subRoom, joinedGroup, ownGroupName, isGroupLeader, kind, hasMilitaryCommand]);

    const solidSet = useMemo(() => {
        const set = new Set<string>();
        const exitMin = subRoom ? 7 : 10;
        const exitMax = subRoom ? 10 : 13;
        for (let x = 0; x < cols; x++) {
            set.add(`${x},0`);
            set.add(`${x},1`);
            if (x < exitMin || x > exitMax) set.add(`${x},${rows - 1}`);
        }
        for (let y = 0; y < rows; y++) {
            set.add(`0,${y}`);
            set.add(`${cols - 1},${y}`);
        }
        propsList.forEach(pr => {
            for (let y = Math.floor(pr.ty); y < Math.ceil(pr.ty + pr.h - 0.3); y++) {
                for (let x = Math.floor(pr.tx); x < Math.ceil(pr.tx + pr.w - 0.3); x++) {
                    set.add(`${x},${y}`);
                }
            }
        });
        return set;
    }, [propsList, cols, rows, subRoom]);

    useEffect(() => {
        loadRpgSpriteImage(playerSpriteUrl);
        npcs.forEach(n => loadRpgSpriteImage(n.spriteUrl));
        [
            'interior_tile_slate',
            'interior_tile_wood',
            'interior_tile_stone_wall',
            'interior_tile_wood_wall',
            'merc_quest_board',
            'merc_bounty_board',
            'merc_reception_desk',
            'merc_training_dummy',
            'merc_banner',
            'merc_briefing_table',
            'merc_supply_crate',
            'merc_brazier',
            'mil_strategy_table',
            'mil_war_board',
            'mil_command_podium',
            'mil_recruit_desk',
            'mil_barracks_rack',
            'mil_training_dummy',
            'mil_dispatch_desk',
            'mil_brazier',
            'district_general_shop',
            'district_weapon_shop'
        ].forEach(k => loadCityAssetImage(getInteriorPropSpriteUrl(k)));
    }, [playerSpriteUrl, npcs]);

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
        y: 13.6 * CITY_TILE_SIZE,
        dir: 'up' as SpriteDirection,
        moving: false,
        walkFrame: 1,
        animTimer: 0,
        targetX: null as number | null,
        targetY: null as number | null
    });
    const savedMainPosRef = useRef<{ x: number; y: number } | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const dpadRef = useRef<SpriteDirection | null>(null);
    const cameraRef = useRef({ x: 0, y: 0 });
    const exitCooldownRef = useRef<number>(Date.now() + 700);

    const enterSubRoom = useCallback((room: Exclude<SubRoomKind, null>, lockedMsg?: string) => {
        if (lockedMsg) {
            setLockedNotice(lockedMsg);
            return;
        }
        setSelectedNpc(null);
        savedMainPosRef.current = { x: playerRef.current.x, y: playerRef.current.y };
        playerRef.current.x = 8.5 * CITY_TILE_SIZE;
        playerRef.current.y = 9.8 * CITY_TILE_SIZE;
        playerRef.current.dir = 'up';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 650;
        setSubRoom(room);
    }, []);

    const exitSubRoom = useCallback(() => {
        setSelectedNpc(null);
        setSubRoom(null);
        if (savedMainPosRef.current) {
            playerRef.current.x = savedMainPosRef.current.x;
            playerRef.current.y = savedMainPosRef.current.y + 10;
        } else {
            playerRef.current.x = 11.5 * CITY_TILE_SIZE;
            playerRef.current.y = 12.0 * CITY_TILE_SIZE;
        }
        playerRef.current.dir = 'down';
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
        exitCooldownRef.current = Date.now() + 650;
    }, []);

    const openNpcFunction = useCallback(
        (npc: CompoundNpcNode) => {
            setSelectedNpc(null);
            if (npc.enterSubRoom) {
                if (npc.requiresMilitaryCommand && !hasMilitaryCommand) {
                    setLockedNotice('소위 이상 장교 임관 또는 지역 지휘권을 보유해야 군사 지휘통제실에 입장할 수 있습니다.');
                    return;
                }
                enterSubRoom(npc.enterSubRoom);
                return;
            }
            if (npc.mercTab) setActiveMercTab(npc.mercTab);
            else if (npc.milTab) setActiveMilTab(npc.milTab);
            else if (npc.openMercTraining) setIsMercTrainingOpen(true);
            else if (npc.openMilTraining) setIsMilTrainingOpen(true);
            else if (npc.openFactionModal) setIsFactionModalOpen(true);
            else if (npc.openGroupModal) setIsGroupModalOpen(true);
            else if (npc.openMilFacility) setIsMilFacilityOpen(true);
        },
        [hasMilitaryCommand, enterSubRoom]
    );

    const findNearestInteractable = useCallback(() => {
        const p = playerRef.current;
        for (const n of npcs) {
            if (Math.hypot(n.px - p.x, n.py - p.y) <= CITY_TILE_SIZE * 1.7) {
                return { kind: 'npc' as const, npc: n };
            }
        }
        for (const pr of propsList) {
            if (!pr.enterSubRoom) continue;
            const px = (pr.tx + pr.w / 2) * CITY_TILE_SIZE;
            const py = (pr.ty + pr.h) * CITY_TILE_SIZE;
            if (Math.hypot(px - p.x, py - p.y) <= CITY_TILE_SIZE * 1.9) {
                return { kind: 'portal' as const, prop: pr };
            }
        }
        return null;
    }, [npcs, propsList]);

    const handleInteract = useCallback(() => {
        const near = findNearestInteractable();
        if (!near) return;
        if (near.kind === 'npc') setSelectedNpc(near.npc);
        else if (near.kind === 'portal' && near.prop.enterSubRoom) {
            enterSubRoom(near.prop.enterSubRoom, near.prop.lockedReason);
        }
    }, [findNearestInteractable, enterSubRoom]);

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
                else if (subRoom) exitSubRoom();
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
    }, [handleInteract, onExitToCity, exitSubRoom, subRoom, selectedNpc]);

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

        for (const n of npcs) {
            if (Math.hypot(wx - n.px, wy - (n.py - 14)) <= 30) {
                setSelectedNpc(n);
                return;
            }
        }
        for (const pr of propsList) {
            if (!pr.enterSubRoom) continue;
            const px = pr.tx * CITY_TILE_SIZE;
            const py = pr.ty * CITY_TILE_SIZE;
            if (wx >= px && wx <= px + pr.w * CITY_TILE_SIZE && wy >= py - 12 && wy <= py + pr.h * CITY_TILE_SIZE) {
                enterSubRoom(pr.enterSubRoom, pr.lockedReason);
                return;
            }
        }
        const exitMinX = (subRoom ? 7 : 10) * CITY_TILE_SIZE;
        const exitMaxX = (subRoom ? 11 : 14) * CITY_TILE_SIZE;
        if (wx >= exitMinX && wx <= exitMaxX && wy >= (rows - 1) * CITY_TILE_SIZE - 12) {
            if (subRoom) exitSubRoom();
            else onExitToCity();
            return;
        }
        setSelectedNpc(null);
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
            const exitMin = subRoom ? 7 : 10;
            const exitMax = subRoom ? 10 : 13;
            if (Date.now() > exitCooldownRef.current && pty >= rows - 1 && ptx >= exitMin && ptx <= exitMax) {
                if (subRoom) exitSubRoom();
                else onExitToCity();
                return;
            }

            labelTick += dt;
            if (labelTick >= 0.2) {
                labelTick = 0;
                const near = findNearestInteractable();
                setNearbyLabel(
                    near
                        ? near.kind === 'npc'
                            ? `${near.npc.name} (${near.npc.role})`
                            : near.prop.label || '입장하기'
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

                const floorTile = getCachedCityAssetImage(
                    getInteriorPropSpriteUrl(kind === 'Mercenary' ? 'interior_tile_wood' : 'interior_tile_slate')
                );
                const wallTile = getCachedCityAssetImage(getInteriorPropSpriteUrl('interior_tile_stone_wall'));

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = c * CITY_TILE_SIZE;
                        const y = r * CITY_TILE_SIZE;
                        const isExit = r === rows - 1 && c >= exitMin && c <= exitMax;
                        const isWall = r <= 1 || c === 0 || c === cols - 1 || (r === rows - 1 && !isExit);
                        if (isWall) {
                            if (wallTile?.complete && wallTile.naturalWidth > 0) ctx.drawImage(wallTile, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            else {
                                ctx.fillStyle = kind === 'Mercenary' ? '#451a03' : '#1e293b';
                                ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                            }
                            continue;
                        }
                        if (floorTile?.complete && floorTile.naturalWidth > 0) {
                            ctx.drawImage(floorTile, x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        } else {
                            ctx.fillStyle = (r + c) % 2 === 0 ? '#334155' : '#1e293b';
                            ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        }
                        if (isExit) {
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
                            ctx.fillRect(x, y, CITY_TILE_SIZE, CITY_TILE_SIZE);
                        }
                    }
                }

                // Carpet paths
                ctx.fillStyle = kind === 'Mercenary' ? 'rgba(220, 38, 38, 0.22)' : 'rgba(56, 189, 248, 0.18)';
                if (subRoom) {
                    ctx.fillRect(7.5 * CITY_TILE_SIZE, 4 * CITY_TILE_SIZE, 3 * CITY_TILE_SIZE, 7 * CITY_TILE_SIZE);
                } else {
                    ctx.fillRect(10 * CITY_TILE_SIZE, 4 * CITY_TILE_SIZE, 4 * CITY_TILE_SIZE, 11 * CITY_TILE_SIZE);
                    ctx.fillRect(4 * CITY_TILE_SIZE, 7.5 * CITY_TILE_SIZE, 16 * CITY_TILE_SIZE, 2 * CITY_TILE_SIZE);
                }

                // Props
                const ts = CITY_TILE_SIZE;
                propsList.forEach(pr => {
                    const px = pr.tx * ts;
                    const py = pr.ty * ts;
                    const pw = pr.w * ts;
                    const ph = pr.h * ts;
                    const img = getCachedCityAssetImage(getInteriorPropSpriteUrl(pr.key));
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'low';
                        const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
                        const dw = img.naturalWidth * scale;
                        const dh = img.naturalHeight * scale;
                        ctx.drawImage(img, px + (pw - dw) / 2, py + ph - dh, dw, dh);
                    } else {
                        ctx.fillStyle = 'rgba(0,0,0,0.32)';
                        ctx.fillRect(px + 4, py + ph - 4, pw - 6, 8);
                        ctx.fillStyle = pr.bg;
                        ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
                        ctx.strokeStyle = pr.border;
                        ctx.lineWidth = 1.8;
                        ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(pr.icon, px + pw / 2, py + ph / 2 + 6);
                    }
                    if (pr.label) {
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        const lw = Math.max(54, ctx.measureText(pr.label).width + 10);
                        ctx.fillStyle = pr.lockedReason ? 'rgba(69, 10, 10, 0.92)' : 'rgba(15, 23, 42, 0.92)';
                        ctx.fillRect(px + pw / 2 - lw / 2, py - 14, lw, 14);
                        ctx.fillStyle = pr.lockedReason ? '#fecaca' : '#fde68a';
                        ctx.fillText(pr.label, px + pw / 2, py - 3);
                    }
                });

                // Exit label
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                const exitCx = (subRoom ? 9 : 12) * ts;
                ctx.fillRect(exitCx - 56, (rows - 1) * ts - 20, 112, 18);
                ctx.fillStyle = '#fde047';
                ctx.fillText(subRoom ? '🚪 본부 홀로 나가기' : '🚪 도시 광장 출구', exitCx, (rows - 1) * ts - 7);

                // Sort & Draw Actors
                const actors = [
                    ...npcs.map(n => ({ y: n.py, isPlayer: false as const, n })),
                    { y: p.y, isPlayer: true as const, n: null as CompoundNpcNode | null }
                ].sort((a, b) => a.y - b.y);

                actors.forEach(act => {
                    const ax = Math.round(act.isPlayer ? p.x : act.n!.px);
                    const ay = Math.round(act.isPlayer ? p.y : act.n!.py);
                    const dir = act.isPlayer ? p.dir : act.n!.dir;
                    const frame = act.isPlayer ? p.walkFrame : 1;
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

                    const label = act.isPlayer ? character.name : `${act.n!.role}`;
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    const nw = Math.max(48, ctx.measureText(label).width + 10);
                    ctx.fillStyle = act.isPlayer ? 'rgba(180, 83, 9, 0.92)' : 'rgba(15, 23, 42, 0.9)';
                    ctx.fillRect(ax - nw / 2, ay + 14, nw, 13);
                    ctx.fillStyle = act.isPlayer ? '#fef08a' : '#e2e8f0';
                    ctx.fillText(label, ax, ay + 24);
                });

                // Night / Sunset Darkness Overlay
                const h = parseHour(character.currentTime);
                if (h >= 20 || h < 5) {
                    ctx.fillStyle = 'rgba(10, 14, 42, 0.36)';
                    ctx.fillRect(0, 0, mapW, mapH);
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const grad = ctx.createRadialGradient(p.x, p.y - 6, 6, p.x, p.y - 6, 100);
                    grad.addColorStop(0, 'rgba(254, 243, 199, 0.24)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 6, 100, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (h >= 17 && h < 20) {
                    ctx.fillStyle = 'rgba(190, 60, 40, 0.12)';
                    ctx.fillRect(0, 0, mapW, mapH);
                }

                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [kind, subRoom, cols, rows, npcs, propsList, solidSet, viewportSize, playerSpriteUrl, character.name, character.currentTime, findNearestInteractable, onExitToCity, exitSubRoom]);

    const blockedByEnlist = Boolean(selectedNpc?.requiresEnlisted && !isEnlistedInParty);
    const blockedByCommand = Boolean(selectedNpc?.requiresMilitaryCommand && !hasMilitaryCommand);

    const headerTitle =
        subRoom === 'joined_faction' && joinedGroup
            ? `${joinedGroup.name} 본부`
            : subRoom === 'own_group'
                ? `${ownGroupName} 전용 본부`
                : subRoom === 'military_command'
                    ? `${nation} 군사 지휘통제실`
                    : kind === 'Mercenary'
                        ? `${city} · 용병 길드 복합 본부`
                        : `${city} · ${nation} 군사 사령부`;

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
                    {kind === 'Mercenary' ? (
                        <Sparkles size={15} className="text-red-400 shrink-0" />
                    ) : (
                        <Shield size={15} className="text-sky-400 shrink-0" />
                    )}
                    <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-amber-200">{headerTitle}</div>
                        <div className="text-[10px] text-slate-400">
                            각 구역 담당 NPC나 건물과 상호작용하세요 [Space]
                        </div>
                    </div>
                </div>
                <div className="pointer-events-auto flex items-center gap-1.5">
                    {subRoom && (
                        <button
                            type="button"
                            onClick={exitSubRoom}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-700/90 hover:bg-indigo-600 border border-indigo-400/50 text-white flex items-center gap-1.5 shadow-lg"
                        >
                            <DoorOpen size={13} /> 본부 홀로
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

            {/* Locked Notice */}
            {lockedNotice && (
                <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4">
                    <div className="max-w-sm w-full bg-slate-950 border border-amber-500/60 rounded-2xl p-5 text-center space-y-3 shadow-2xl">
                        <div className="text-sm font-black text-amber-300">출입 권한 필요</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{lockedNotice}</p>
                        <button
                            type="button"
                            onClick={() => setLockedNotice(null)}
                            className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* NPC Dialogue Card */}
            {selectedNpc && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {(() => {
                                const sn = character.socialNetwork?.find(s => s.name === selectedNpc.name);
                                const cp = character.companions?.find(c => c.name === selectedNpc.name);
                                const vUrl = (selectedNpc as any).visualUrl || sn?.visualUrl || cp?.visualUrl;
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
                                    {blockedByEnlist
                                        ? `"이 업무는 ${nation} 국방군에 입대한 대원만 이용할 수 있습니다. 남쪽 위병소의 모병관을 통해 먼저 입대해 주십시오."`
                                        : `"${selectedNpc.dialogue}"`}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedNpc(null)} className="text-slate-400 hover:text-white p-1 shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        {blockedByEnlist ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedNpc(null);
                                    setActiveMilTab('enlist');
                                }}
                                className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
                            >
                                입대 안내 열기
                            </button>
                        ) : blockedByCommand ? (
                            <button
                                type="button"
                                onClick={() => setSelectedNpc(null)}
                                className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                                장교 임관 / 지휘권 필요
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => openNpcFunction(selectedNpc)}
                                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black"
                            >
                                {selectedNpc.actionLabel}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setSelectedNpc(null)}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Split Single-Tab & Direct Modals */}
            {activeMercTab && (
                <MercenaryGuildModal
                    character={character}
                    initialTab={activeMercTab}
                    singleTabMode={true}
                    onClose={() => setActiveMercTab(null)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction || (() => {})}
                />
            )}
            {isMercTrainingOpen && (
                <MercenaryTrainingModal
                    character={character}
                    onClose={() => setIsMercTrainingOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isFactionModalOpen && (
                <MercenaryFactionModal
                    character={character}
                    onClose={() => setIsFactionModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isGroupModalOpen && (
                <MercenaryGroupModal
                    character={character}
                    onClose={() => setIsGroupModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {activeMilTab && (
                <MilitaryModal
                    character={character}
                    initialTab={activeMilTab}
                    singleTabMode={true}
                    onClose={() => setActiveMilTab(null)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction || (() => {})}
                />
            )}
            {isMilTrainingOpen && (
                <MilitaryTrainingModal
                    character={character}
                    effectiveCommander={effectiveCommander}
                    onClose={() => setIsMilTrainingOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isMilFacilityOpen && (
                <MilitaryFacilityModal
                    character={character}
                    effectiveCommander={effectiveCommander}
                    onClose={() => setIsMilFacilityOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
        </div>
    );
};

export default FactionCompoundCanvas;
