import React, { useState, useEffect, useMemo } from 'react';
import { Character, Companion, DispatchMission, Item, Location, ItemRarity, ExpeditionTeamMember, BattleRole, SecondaryBattleRole, JobType, CombatStyle, ClassTier, WeaponType } from '../types';
import { WORLD_GEOGRAPHY, SHINRYOKU_TYPES_LIST, WEAPON_TYPE_KOREAN, SHINRYOKU_AFFINITY } from '../constants';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { HUNT_LEVEL_BANDS, NATION_THEMES } from '../monsterfield';
import { getBossByLocation, isMythicSeasonalBoss } from '../bossMonsters';
import { 
    addDays, extractElementalType, calculateTotalDispatchCapacity, unassignFromTraining,
    getRaceByNation, generateNameWithSurname, generateName, generateCompanionStats, getTierByLevel,
    assignRandomCombatStyle, generateDefaultVisualUrl, addMasteryExp, calculateCombatPower, getEffectiveSecondaryBattleRole
} from '../utils';
import { isAllRounderUnlocked, SECONDARY_ROLE_INFOS } from '../services/roleBonusService';
import { 
    X, Send, MapPin, Calendar, Users, AlertTriangle, CheckCircle, Clock, Truck, 
    Shield, Sword, Heart, Coins, Utensils, User, Activity, TrendingUp, 
    ArrowRight, ArrowUpCircle, Sparkles, Compass, Flame, Skull, ShieldAlert, Award, Plus, Trash2,
    Target, Zap, Star, ChevronRight, Check, RefreshCw, Lock, HelpCircle, UserPlus, Search, ExternalLink, Info, HeartHandshake
} from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { applyExpeditionCompanionBonding } from '../services/relationService';
import { getReducedMpCostOnLevelUp } from '../services/skillMpService';

interface Props {
    character: Character;
    instanceId?: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
    onOpenExternalModal?: (modalType: string) => void;
}

export interface ExternalDispatchSystemInfo {
    isExternal: boolean;
    systemType: 'military' | 'regional' | 'war' | 'temple' | 'mercenary' | 'blacksmith' | 'alchemy' | 'personal' | 'native';
    systemName: string;
    badgeBg: string;
    badgeText: string;
    guidanceTitle: string;
    guidanceMsg: string;
    guidanceLocation: string;
}

export const getDispatchSystemInfo = (mission: DispatchMission): ExternalDispatchSystemInfo => {
    const type = mission.missionType || '';
    const id = mission.id || '';

    if (type === 'Patrol' || type === 'Suppression' || type === 'Infiltration' || type === 'Escort' || id.startsWith('mil_disp_') || id.startsWith('mil_spec_disp_') || type.startsWith('Military')) {
        return {
            isExternal: true,
            systemType: 'military',
            systemName: '군대 작전 사령부 (지휘관 관리)',
            badgeBg: 'bg-blue-950/90 text-blue-300 border-blue-600/50',
            badgeText: '군대 지휘관 작전',
            guidanceTitle: '군대 지휘관 파견 보상 안내',
            guidanceMsg: '본 파견은 군사 사령부(지휘관 관리)에서 발주된 작전 임무입니다. 파견소에서는 진행 상태 확인만 가능하며, 군사 사령부 작전실 메뉴에서 보상 및 공훈(Merit)을 수령할 수 있습니다.',
            guidanceLocation: '[도시/국가] ➔ [군사 지휘관 영역] ➔ [군 사령부 및 작전실]'
        };
    }
    if (type === 'RegionalSecurity' || type === 'RegionalSentiment' || id.startsWith('reg_disp_') || id.startsWith('reg_manage_')) {
        return {
            isExternal: true,
            systemType: 'regional',
            systemName: '영지 및 지역 통치 사령부',
            badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/50',
            badgeText: '영지/지역 통치',
            guidanceTitle: '영지 통치 파견 보상 안내',
            guidanceMsg: '본 파견은 영지 및 지역 통치 관리 메뉴에서 발주된 파견 임무입니다. 해당 통치 관리 메뉴에서 치안/민심 성과 및 보상을 수령해주시기 바랍니다.',
            guidanceLocation: '[도시/영지] ➔ [지역 통치 관리] ➔ [치안/민심 파견 현황]'
        };
    }
    if (type === 'WarInvasion' || id.startsWith('war_inv_') || id.startsWith('war_disp_')) {
        return {
            isExternal: true,
            systemType: 'war',
            systemName: '최전선 전쟁 사령부',
            badgeBg: 'bg-red-950/90 text-red-300 border-red-600/50',
            badgeText: '전쟁 침공 파견',
            guidanceTitle: '전쟁 침공 파견 보상 안내',
            guidanceMsg: '본 파견은 최전선 국가 전쟁 사령부에서 발주된 침공 파견 임무입니다. 최전선 및 전쟁 관리 메뉴에서 점령 전과 및 보상을 수령해주시기 바랍니다.',
            guidanceLocation: '[국가/최전선] ➔ [전쟁 사령부] ➔ [전쟁 침공 파견]'
        };
    }
    if (type === 'TempleProtection' || id.startsWith('temple_prot_') || id.startsWith('temple_')) {
        return {
            isExternal: true,
            systemType: 'temple',
            systemName: '신전 외교 및 수호 관리',
            badgeBg: 'bg-purple-950/90 text-purple-300 border-purple-600/50',
            badgeText: '신전 수호 파견',
            guidanceTitle: '신전 수호 파견 보상 안내',
            guidanceMsg: '본 파견은 신전 외교 및 보호 관리 메뉴에서 발주된 기사 파견 임무입니다. 신전 메뉴에서 신앙심 및 외교 성과 보상을 수령해주시기 바랍니다.',
            guidanceLocation: '[신전 본산] ➔ [신전 외교 & 보호 관리] 메뉴'
        };
    }
    if (id.startsWith('merc_') || type.includes('Mercenary') || (mission as any).isMercenary) {
        return {
            isExternal: true,
            systemType: 'mercenary',
            systemName: '용병단 길드 사령부',
            badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-600/50',
            badgeText: '용병단 파견',
            guidanceTitle: '용병단 위탁 파견 보상 안내',
            guidanceMsg: '본 파견은 용병단 길드에서 발주된 위탁 파견 임무입니다. 용병단 길드 메뉴에서 보상 및 명성치(RP)를 수령해주시기 바랍니다.',
            guidanceLocation: '[도시/길드] ➔ [용병단 길드 사령부] 메뉴'
        };
    }
    if (type === 'Blacksmithing' || id.startsWith('bs_')) {
        return {
            isExternal: true,
            systemType: 'blacksmith',
            systemName: '대장간 제련소',
            badgeBg: 'bg-orange-950/90 text-orange-300 border-orange-600/50',
            badgeText: '대장간 연마',
            guidanceTitle: '대장간 제련 보상 안내',
            guidanceMsg: '본 작업은 대장간에서 진행되는 장비 제련/연마 작업입니다. 대장간 메뉴에서 완성된 장비를 수령해주시기 바랍니다.',
            guidanceLocation: '[영지/기지] ➔ [대장간] 메뉴'
        };
    }
    if (type === 'AlchemyCrafting' || type === 'Alchemy' || id.startsWith('alc_')) {
        return {
            isExternal: true,
            systemType: 'alchemy',
            systemName: '연금술 실험실',
            badgeBg: 'bg-violet-950/90 text-violet-300 border-violet-600/50',
            badgeText: '연금술 조제',
            guidanceTitle: '연금술 조제 보상 안내',
            guidanceMsg: '본 작업은 연금술실에서 진행되는 포션 및 비약 조제 작업입니다. 연금술실 메뉴에서 완성된 아이템을 수령해주시기 바랍니다.',
            guidanceLocation: '[영지/기지] ➔ [연금술실] 메뉴'
        };
    }
    if (type === 'PersonalLeave' || type === 'RecruitTravel') {
        return {
            isExternal: true,
            systemType: 'personal',
            systemName: '동료 개인 활동',
            badgeBg: 'bg-slate-900 text-slate-300 border-slate-700',
            badgeText: type === 'PersonalLeave' ? '개인 휴가' : '동료 영입 여정',
            guidanceTitle: '동료 개인 활동 안내',
            guidanceMsg: '본 파견은 동료의 개인 휴가 또는 영입 여정 활동입니다. 파견 기간이 완료되면 자동으로 동료 상태 및 목록에 결과가 반영됩니다.',
            guidanceLocation: '자동 완료 및 동료 상세 메뉴에서 확인 가능'
        };
    }

    return {
        isExternal: false,
        systemType: 'native',
        systemName: '파견 사령부',
        badgeBg: 'bg-indigo-950/90 text-indigo-300 border-indigo-600/50',
        badgeText: type === 'ScoutDispatch' ? '스카우트' : type === 'Expedition' ? '원정대' : '일반 파견',
        guidanceTitle: '파견 보상 수령',
        guidanceMsg: '',
        guidanceLocation: '파견 사령부'
    };
};

interface TeamSlot {
    companionId: string | null;
    role: 'tanker' | 'dealer' | 'supporter' | 'allrounder' | 'none';
}

// 스카우트 가능 직업 목록 (교사, 군인, 왕실, 사자, 마신, 제너럴, 노예 등 제외)
export const SCOUTABLE_JOBS: { job: JobType; label: string; desc: string; icon: string }[] = [
    { job: JobType.FARMER, label: '농부', desc: '식량 생산 및 농지 경작 전문가', icon: '🌾' },
    { job: JobType.MINER, label: '광부', desc: '광석 채굴 및 갱도 채광 전문가', icon: '⛏️' },
    { job: JobType.BLACKSMITH, label: '대장장이', desc: '장비 제련, 강화 및 무구 제작자', icon: '🔨' },
    { job: JobType.ALCHEMIST, label: '연금술사', desc: '포션 조제, 비약 및 시약 연구가', icon: '🧪' },
    { job: JobType.CHEF, label: '요리사', desc: '음식 수급, 버프 및 연회 조리사', icon: '🍳' },
    { job: JobType.BREEDER, label: '사육사', desc: '마수 사육 및 몬스터 육성가', icon: '🐾' },
    { job: JobType.TRAINER, label: '트레이너', desc: '전술 지휘 및 단련 지도자', icon: '🏋️' },
    { job: JobType.MERCENARY, label: '용병', desc: '전투 무공 및 방어 작전 수행자', icon: '⚔️' },
    { job: JobType.UNEMPLOYED, label: '무직/일반인', desc: '특정 전공이 없이 다방면으로 발전 가능한 인재', icon: '👤' },
];

// 전술훈련소 역할 숙련도 추출 헬퍼 함수
export const getCompanionRoleProficiency = (comp?: Companion | null, role?: 'tanker' | 'dealer' | 'supporter' | 'allrounder'): number => {
    if (!comp || !role) return 0;
    if (role === 'allrounder') {
        return isAllRounderUnlocked(comp) ? 100 : Math.min(
            getCompanionRoleProficiency(comp, 'dealer'),
            getCompanionRoleProficiency(comp, 'tanker'),
            getCompanionRoleProficiency(comp, 'supporter')
        );
    }
    if (!comp.roleProficiency) return 0;
    const prof = comp.roleProficiency as Record<string, number>;
    if (role === 'tanker') {
        return prof[BattleRole.TANKER] ?? prof['tanker'] ?? prof['TANKER'] ?? prof['탱커'] ?? 0;
    } else if (role === 'dealer') {
        return prof[BattleRole.DEALER] ?? prof['dealer'] ?? prof['DEALER'] ?? prof['딜러'] ?? 0;
    } else if (role === 'supporter') {
        return prof[BattleRole.SUPPORTER] ?? prof['supporter'] ?? prof['SUPPORTER'] ?? prof['서포터'] ?? 0;
    }
    return 0;
};

// 숙련도 100 달성 여부 체크 (100 이상이어야만 해당 역할 배치 가능)
export const isRoleUnlocked = (comp?: Companion | null, role?: 'tanker' | 'dealer' | 'supporter' | 'allrounder'): boolean => {
    if (!comp || !role) return false;
    if (role === 'allrounder') return isAllRounderUnlocked(comp);
    return getCompanionRoleProficiency(comp, role) >= 100;
};

const DispatchModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateCharacter, onFacilityUpgrade, onOpenExternalModal }) => {
    const hasUrgentAlarms = character.base?.urgentAlarms && character.base.urgentAlarms.length > 0;
    const [activeTab, setActiveTab] = useState<'new' | 'expedition' | 'scout' | 'status'>(hasUrgentAlarms ? 'status' : 'new');
    const [selectedExternalNotice, setSelectedExternalNotice] = useState<{ mission: DispatchMission; systemInfo: ExternalDispatchSystemInfo } | null>(null);
    
    // Normal Dispatch State
    const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string>(Object.keys(WORLD_GEOGRAPHY)[0]);
    const [selectedNation, setSelectedNation] = useState<string>('대한민국');
    const [selectedCity, setSelectedCity] = useState<string>('서울');
    const [duration, setDuration] = useState<number>(1); // Months

    // Expedition State (원정대 파견)
    const [expRegion, setExpRegion] = useState<string>(character.currentLocation?.region || Object.keys(WORLD_GEOGRAPHY)[0]);
    const [expNation, setExpNation] = useState<string>(character.currentLocation?.nation || '대한민국');
    const [expCity, setExpCity] = useState<string>(character.currentLocation?.city || '서울');
    const [expTargetType, setExpTargetType] = useState<'dungeon' | 'hunt_zone'>('dungeon');
    const [selectedHuntBandId, setSelectedHuntBandId] = useState<string>('intermediate');
    const [expDurationMonths, setExpDurationMonths] = useState<number>(1);

    // Scout Dispatch State (인재 스카우트 파견)
    const availableScoutRegions = Object.keys(WORLD_GEOGRAPHY).filter(reg => reg !== '신계' && reg !== '마계');
    const initialScoutRegion = (character.currentLocation?.region && availableScoutRegions.includes(character.currentLocation.region))
        ? character.currentLocation.region
        : (availableScoutRegions[0] || '아시아');
    const [scoutRegion, setScoutRegion] = useState<string>(initialScoutRegion);
    const [scoutNation, setScoutNation] = useState<string>(character.currentLocation?.nation || '대한민국');
    const [scoutCity, setScoutCity] = useState<string>(character.currentLocation?.city || '서울');
    const [scoutTargetJob, setScoutTargetJob] = useState<JobType>(JobType.FARMER);
    const [scoutCompanionId, setScoutCompanionId] = useState<string | null>(null);
    const [scoutDuration, setScoutDuration] = useState<number>(1);

    // 6-Member Team Slots (기본 역할: 'none', 전술훈련소 숙련도 100 달성 시 해당 역할로 전환 가능)
    const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([
        { companionId: null, role: 'none' },
        { companionId: null, role: 'none' },
        { companionId: null, role: 'none' },
        { companionId: null, role: 'none' },
        { companionId: null, role: 'none' },
        { companionId: null, role: 'none' }
    ]);

    // Active selection slot index for modal / companion picker
    const [activeSlotPickerIndex, setActiveSlotPickerIndex] = useState<number | null>(null);

    // Support State
    const [supportingMission, setSupportingMission] = useState<DispatchMission | null>(null);
    const [selectedSupportCompanionId, setSelectedSupportCompanionId] = useState<string | null>(null);

    // Result Overlay
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // Facility Info
    const currentInstance = character.base?.layout?.find(inst => inst.id === instanceId);
    const facilityLevel = currentInstance ? currentInstance.level : (character.base?.facilityLevels?.['dispatch'] || 1);
    const assigneeId = character.base?.assignments?.['dispatch'];
    const assignee = character.inactiveCompanions?.find(c => c.id === assigneeId);
    
    // Capacity: Aggregated from all dispatch facilities + WIS bonuses
    const maxDispatch = calculateTotalDispatchCapacity(character.base, character.inactiveCompanions || []);
    
    // Filter actual dispatch / expedition / scout missions
    const allDispatched = character.base?.dispatched || [];
    const dispatchMissions = allDispatched.filter(
        m => m.missionType !== 'AlchemyCrafting' && 
             m.missionType !== 'BlacksmithCrafting' && 
             !(m as any).craftMetadata && 
             !(m as any).isSelfCraft
    );
    const currentDispatchCount = dispatchMissions.length;

    // Region/Nation/City Synchronizers for Normal Dispatch
    useEffect(() => {
        const nations = Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {});
        if (nations.length > 0) {
            setSelectedNation(nations[0]);
            const cities = WORLD_GEOGRAPHY[selectedRegion][nations[0]]?.cities || [];
            if (cities.length > 0) setSelectedCity(cities[0]);
        }
    }, [selectedRegion]);

    useEffect(() => {
        const cities = WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation]?.cities || [];
        if (cities.length > 0 && !cities.includes(selectedCity)) setSelectedCity(cities[0]);
    }, [selectedNation]);

    // Region/Nation/City Synchronizers for Expedition
    useEffect(() => {
        const nations = Object.keys(WORLD_GEOGRAPHY[expRegion] || {});
        if (nations.length > 0) {
            if (!nations.includes(expNation)) {
                setExpNation(nations[0]);
                const cities = WORLD_GEOGRAPHY[expRegion][nations[0]]?.cities || [];
                if (cities.length > 0) setExpCity(cities[0]);
            }
        }
    }, [expRegion]);

    useEffect(() => {
        const cities = WORLD_GEOGRAPHY[expRegion]?.[expNation]?.cities || [];
        if (cities.length > 0 && !cities.includes(expCity)) {
            setExpCity(cities[0]);
        }
    }, [expNation]);

    const nationTheme = (expNation && NATION_THEMES[expNation]) ? NATION_THEMES[expNation] : NATION_THEMES['default'];

    const availableHuntBands = useMemo(() => {
        if (!HUNT_LEVEL_BANDS || !Array.isArray(HUNT_LEVEL_BANDS)) return [];
        return HUNT_LEVEL_BANDS.filter(band => {
            if (band.id === 'devil' || band.id === 'divine') {
                const monsters = nationTheme?.monsters?.[band.id] || [];
                return monsters.length > 0;
            }
            return true;
        });
    }, [nationTheme]);

    // Synchronize selected hunt band with available bands for current nation
    useEffect(() => {
        const availableIds = availableHuntBands.map(b => b.id);
        if (!availableIds.includes(selectedHuntBandId)) {
            if (availableIds.length > 0) {
                setSelectedHuntBandId(availableIds[availableIds.length - 1]);
            }
        }
    }, [availableHuntBands, selectedHuntBandId]);

    // Region/Nation/City Synchronizers for Scout Dispatch
    useEffect(() => {
        const nations = Object.keys(WORLD_GEOGRAPHY[scoutRegion] || {});
        if (nations.length > 0) {
            if (!nations.includes(scoutNation)) {
                setScoutNation(nations[0]);
                const cities = WORLD_GEOGRAPHY[scoutRegion][nations[0]]?.cities || [];
                if (cities.length > 0) setScoutCity(cities[0]);
            }
        }
    }, [scoutRegion]);

    useEffect(() => {
        const cities = WORLD_GEOGRAPHY[scoutRegion]?.[scoutNation]?.cities || [];
        if (cities.length > 0 && !cities.includes(scoutCity)) {
            setScoutCity(cities[0]);
        }
    }, [scoutNation]);

    /**
     * 기지 내에서 작업 중인 모든 동료 제외:
     * 1) assignments (대장간, 연금술실, 훈련소 등 모든 시설 담당자)
     * 2) multiAssignments (복수 배치된 대장장이/연금술사 등)
     * 3) 현재 파견 또는 원정대에 참여 중인 동료들
     * 4) 사망자(isDead) 제외
     */
    const getAvailableCompanions = (excludedIds: string[] = []): Companion[] => {
        const base = character.base;
        if (!base) return [];

        // 시설 전담 배치자만 추출 (임시 파견용 dispatch_ 및 recruit_travel_ 키 제외)
        const singleAssignedIds = Object.entries(base.assignments || {})
            .filter(([key]) => !key.startsWith('dispatch_') && !key.startsWith('recruit_travel_'))
            .map(([, companionId]) => companionId);
            
        const multiAssignedIds = Object.values(base.multiAssignments || {}).flat();

        const combatTrainees = new Set(Object.values(base.combatTraining || {}).flatMap(ct => (ct.trainees || []).map(t => t.companionId)));
        const houseChefs = new Set((base.houses || []).map(h => h.assignedChefId).filter(id => id) as string[]);
        const houseHKs = new Set((base.houses || []).map(h => h.assignedHousekeeperId).filter(id => id) as string[]);

        const dispatchedIds: string[] = [];
        (base.dispatched || []).forEach(m => {
            if (m.companionId) dispatchedIds.push(m.companionId);
            if (m.supportCompanionId) dispatchedIds.push(m.supportCompanionId);
            if (m.teamMembers && Array.isArray(m.teamMembers)) {
                m.teamMembers.forEach(tm => {
                    if (tm.companionId) dispatchedIds.push(tm.companionId);
                });
            }
        });
        
        const warIds = new Set((base.dispatched || []).filter(m => m.missionType === 'WarInvasion').flatMap(m => (m as any).participants || []));
        const groupMissionsIds = new Set(character.mercenaryData?.groupMissions?.flatMap(m => m.memberIds) || []);

        const busyIds = new Set([
            ...singleAssignedIds,
            ...multiAssignedIds,
            ...dispatchedIds,
            ...Array.from(combatTrainees),
            ...Array.from(houseChefs),
            ...Array.from(houseHKs),
            ...Array.from(warIds),
            ...Array.from(groupMissionsIds),
            ...excludedIds
        ]);

        const currentYear = parseInt(character.currentDate.split('-')[0]) || 2000;

        return (character.inactiveCompanions || []).filter(c => {
            if (busyIds.has(c.id) || c.isDead) return false;
            
            // Check if child under 11
            const isChild = c.classType?.includes('자녀') || c.classType?.includes('Child');
            if (isChild) {
                const displayAge = c.birthYear !== undefined ? (currentYear - c.birthYear) + "세" : c.age;
                const age = parseInt(displayAge.replace(/[^0-9]/g, '')) || 0;
                if (age < 11) return false;
            }
            
            return true;
        });
    };

    // 파견 및 원정 기간에 따른 보상 극대화 배수 계산기
    const getDurationRewardMultiplier = (months: number): { mult: number; bonusLabel: string } => {
        if (months >= 24) return { mult: 12.0, bonusLabel: '24개월 초장기 원정 보너스 x12.0 (보상·숙련도 극대화!)' };
        if (months >= 12) return { mult: 7.0, bonusLabel: '12개월 대원정 보너스 x7.0 (보상·숙련도 대폭 상승)' };
        if (months >= 6) return { mult: 3.5, bonusLabel: '6개월 반년 원정 보너스 x3.5 (보상·숙련도 대폭 상승)' };
        if (months >= 3) return { mult: 2.0, bonusLabel: '3개월 분기 원정 보너스 x2.0 (보상 상승)' };
        if (months >= 2) return { mult: 1.4, bonusLabel: '2개월 원정 보너스 x1.4' };
        return { mult: 1.0, bonusLabel: '1개월 기본' };
    };

    // 일반 파견 비용 계산
    const getDispatchCost = () => {
        const currentRegion = character.currentLocation?.region || '아시아';
        const distanceMult = selectedRegion === currentRegion ? 1 : 3;
        const foodCost = distanceMult * duration * 10;
        const goldCost = 5000 * duration;
        return { food: foodCost, gold: goldCost };
    };

    // 일반 파견 성공률 계산
    const getSuccessRate = (comp: Companion, dest: Location, months: number) => {
        let rate = 60;
        const currentLoc = character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
        let distPenalty = 30;
        if (currentLoc.nation === dest.nation) distPenalty = 5;
        else if (currentLoc.region === dest.region) distPenalty = 15;
        rate -= distPenalty;
        const durationPenalty = months * 1; 
        rate -= durationPenalty;
        const managerBonus = assignee ? Math.floor(assignee.stats.wis * 0.2) : 0;
        rate += managerBonus;
        const avgStat = (comp.stats.str + comp.stats.int + comp.stats.agi + comp.stats.def + comp.stats.wis + comp.stats.ctrl) / 6;
        const compBonus = Math.floor((comp.level * 0.5) + (avgStat * 0.1));
        rate += compBonus;

        return {
            total: Math.min(100, Math.max(0, Math.floor(rate))),
            breakdown: { base: 60, dist: distPenalty, dur: durationPenalty, manager: managerBonus, comp: compBonus }
        };
    };

    // 현재 선택된 원정 목표 세부 정보
    const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 3;
    const currentBossData = getBossByLocation(expNation, expCity, currentMonth);

    const selectedHuntBand = (availableHuntBands && availableHuntBands.length > 0)
        ? (availableHuntBands.find(b => b.id === selectedHuntBandId) || availableHuntBands[0])
        : (HUNT_LEVEL_BANDS[2] || HUNT_LEVEL_BANDS[0]);
    const huntMonsters = nationTheme?.monsters?.[selectedHuntBand?.id || 'intermediate'] || nationTheme?.monsters?.['intermediate'] || ['마수', '변종 몬스터'];

    // 원정대 팀 멤버 및 메트릭스 계산
    const assignedTeamMembers = teamSlots
        .filter(slot => slot.companionId !== null)
        .map(slot => ({
            slot,
            companion: character.inactiveCompanions?.find(c => c.id === slot.companionId)!
        }))
        .filter(entry => entry.companion !== undefined);

    // 보스 몬스터와 원정대원 간의 신력계통 상성 판정 (유리: 1.25배, 불리: 0.75배)
    const normalizeAffinityType = (t?: string) => {
        if (!t) return '';
        const trimmed = t.trim();
        if (SHINRYOKU_AFFINITY[trimmed]) return trimmed;
        if (!trimmed.endsWith('계') && SHINRYOKU_AFFINITY[`${trimmed}계`]) return `${trimmed}계`;
        return trimmed;
    };

    const getCompanionBossAffinity = (comp?: Companion) => {
        if (!comp || expTargetType !== 'dungeon' || !currentBossData?.shinryokuType || !comp.shinryokuType) {
            return { multiplier: 1.0, status: 'normal' as const, badgeText: '' };
        }
        const bossType = normalizeAffinityType(currentBossData.shinryokuType);
        const compType = normalizeAffinityType(comp.shinryokuType);
        const affinity = SHINRYOKU_AFFINITY[compType];
        if (!affinity) return { multiplier: 1.0, status: 'normal' as const, badgeText: '' };

        if (affinity.strong.includes(bossType)) {
            return { multiplier: 1.25, status: 'strong' as const, badgeText: '상성 유리 ×1.25' };
        }
        if (affinity.weak.includes(bossType)) {
            return { multiplier: 0.75, status: 'weak' as const, badgeText: '상성 불리 ×0.75' };
        }
        return { multiplier: 1.0, status: 'normal' as const, badgeText: '' };
    };

    const getExpeditionMetrics = () => {
        const currentRegion = character.currentLocation?.region || '아시아';
        const teamCount = assignedTeamMembers.length;
        const targetReqLevel = expTargetType === 'dungeon' 
            ? (currentBossData?.level || 80) 
            : Math.floor((selectedHuntBand.levelRange[0] + selectedHuntBand.levelRange[1]) / 2);

        // 레벨 기준 사냥터의 현실적인 권장 전투력 산출
        const getHuntZoneRecommendedCP = (lvl: number) => {
            const l = Math.max(1, lvl);
            return Math.floor(l * 120 + Math.pow(l, 1.55) * 12 + 300);
        };

        const isDivineRealm = expRegion === '신계' || expNation === '신계' || (currentBossData && (currentBossData.shinryokuType === '광휘계' || currentBossData.shinryokuType === '태양계' || currentBossData.shinryokuType === '월광계' || currentBossData.name?.includes('신') || currentBossData.name?.includes('사자')));
        const isSeasonBoss = currentBossData ? (isMythicSeasonalBoss(currentBossData) || Boolean(currentBossData.id && currentBossData.id.toLowerCase().includes('mythic'))) : false;
        const baseRecommendedCP = getHuntZoneRecommendedCP(targetReqLevel);

        // 원정 목표 권장 전투력 산출 (신계 보스 / 최신화 능력치 반영: 42.0배, 일반 보스: 16.0배, 일반 사냥터: 2.0~3.5배 적용)
        let targetReqCombatPower = baseRecommendedCP;
        if (expTargetType === 'dungeon') {
            if (isDivineRealm || isSeasonBoss) {
                targetReqCombatPower = Math.floor(baseRecommendedCP * 42.0);
            } else {
                targetReqCombatPower = Math.floor(baseRecommendedCP * 16.0);
            }
        } else {
            if (isDivineRealm) {
                targetReqCombatPower = Math.floor(baseRecommendedCP * 3.5);
            } else {
                targetReqCombatPower = Math.floor(baseRecommendedCP * 2.0);
            }
        }

        let teamTotalCombatPower = 0;
        let totalTankerPower = 0;
        let totalDealerPower = 0;
        let totalSupporterPower = 0;
        let totalUnspecializedPower = 0;
        let tankerCount = 0;
        let dealerCount = 0;
        let supporterCount = 0;
        let allrounderCount = 0;
        let noneCount = 0;

        assignedTeamMembers.forEach(({ slot, companion }) => {
            const rawCP = calculateCombatPower(companion);
            const aff = getCompanionBossAffinity(companion);
            const compCP = Math.floor(rawCP * aff.multiplier);
            teamTotalCombatPower += compCP;

            const secRole = getEffectiveSecondaryBattleRole(companion);

            if (slot.role === 'tanker') {
                tankerCount++;
                totalTankerPower += compCP;
                // 딜링 탱커는 딜러 전투력에도 30% 기여
                if (secRole === SecondaryBattleRole.DEALING_TANKER) {
                    totalDealerPower += Math.floor(compCP * 0.3);
                }
            } else if (slot.role === 'dealer') {
                dealerCount++;
                totalDealerPower += compCP;
            } else if (slot.role === 'supporter') {
                supporterCount++;
                totalSupporterPower += compCP;
            } else if (slot.role === 'allrounder') {
                allrounderCount++;
                totalTankerPower += Math.floor(compCP * 0.35);
                totalDealerPower += Math.floor(compCP * 0.35);
                totalSupporterPower += Math.floor(compCP * 0.35);
            } else {
                noneCount++;
                totalUnspecializedPower += compCP;
            }
        });

        // 권장 전투력 대비 원정대 실제 전투력 비율 (Combat Power Ratio)
        const cpRatio = teamCount > 0 ? (teamTotalCombatPower / Math.max(1, targetReqCombatPower)) : 0;
        const avgTeamLevel = teamCount > 0 
            ? assignedTeamMembers.reduce((sum, m) => sum + m.companion.level, 0) / teamCount 
            : 0;

        let totalSuccessRate = 0;

        // 올라운더는 부족한 역할을 메워 삼위일체 시너지 달성에 기여
        const effectiveTankerMet = tankerCount + allrounderCount >= 1;
        const effectiveDealerMet = dealerCount + allrounderCount >= 1;
        const effectiveSupporterMet = supporterCount + allrounderCount >= 1;
        const isSynergyMet = effectiveTankerMet && effectiveDealerMet && effectiveSupporterMet && (tankerCount + dealerCount + supporterCount + allrounderCount >= 3);

        if (teamCount === 0 || teamTotalCombatPower <= 0) {
            totalSuccessRate = 0;
        } else if (expTargetType === 'dungeon') {
            // [보스 던전 토벌 성공률 산출: 권장 전투력의 35% 미만 시 0% 확정]
            if (cpRatio < 0.35) {
                totalSuccessRate = 0;
            } else {
                let baseRate = 0;
                if (cpRatio >= 1.0) {
                    baseRate = Math.min(80, 50 + Math.floor((cpRatio - 1.0) * 45));
                } else {
                    baseRate = Math.max(-100, Math.floor(50 - Math.pow(1.0 - cpRatio, 1.3) * 85));
                }

                // 전투력 달성 비율에 따른 시너지 및 관리자 기여도 보정
                const powerRatio = cpRatio < 0.5 ? 0.3 : (cpRatio < 1.0 ? 0.7 : 1.0);
                const synergyBonus = (isSynergyMet ? 15 : 0) * powerRatio;
                const fullTeamBonus = (teamCount === 6 && noneCount === 0 ? 10 : 0) * powerRatio;
                const managerBonus = assignee ? Math.floor(assignee.stats.wis * 0.1) * powerRatio : 0;
                const durationBonus = (expDurationMonths - 1) * 2;
                const distPenalty = expRegion === currentRegion ? 0 : 15;

                const calc = Math.floor(baseRate + synergyBonus + fullTeamBonus + managerBonus + durationBonus - distPenalty);
                totalSuccessRate = Math.max(0, Math.min(95, calc));
                if (cpRatio < 0.5) {
                    totalSuccessRate = Math.min(5, totalSuccessRate);
                }
            }
        } else {
            // [일반 사냥터 성공률 산출: 권장 전투력의 20% 미만 시 0% 확정]
            if (cpRatio < 0.20) {
                totalSuccessRate = 0;
            } else {
                let baseRate = 0;
                if (cpRatio >= 1.0) {
                    baseRate = Math.min(90, 70 + Math.floor((cpRatio - 1.0) * 35));
                } else {
                    baseRate = Math.max(-100, Math.floor(70 - Math.pow(1.0 - cpRatio, 1.2) * 85));
                }

                const powerRatio = cpRatio < 0.4 ? 0.4 : (cpRatio < 1.0 ? 0.8 : 1.0);
                const synergyBonus = (isSynergyMet ? 15 : 0) * powerRatio;
                const fullTeamBonus = (teamCount === 6 && noneCount === 0 ? 15 : 0) * powerRatio;
                const managerBonus = assignee ? Math.floor(assignee.stats.wis * 0.15) * powerRatio : 0;
                const durationBonus = (expDurationMonths - 1) * 3;
                const distPenalty = expRegion === currentRegion ? 0 : 12;

                const calc = Math.floor(baseRate + synergyBonus + fullTeamBonus + managerBonus + durationBonus - distPenalty);
                totalSuccessRate = Math.max(0, Math.min(99, calc));
            }
        }

        // 소모 비용
        const distanceMult = expRegion === currentRegion ? 1 : 2.5;
        const baseFoodPerMonth = 15 * Math.max(1, teamCount) * (expTargetType === 'dungeon' ? 1.5 : 1.0);
        const baseGoldPerMonth = 8000 * Math.max(1, teamCount) * (expTargetType === 'dungeon' ? 1.8 : 1.0);

        const totalCostFood = Math.floor(baseFoodPerMonth * expDurationMonths * distanceMult);
        const totalCostGold = Math.floor(baseGoldPerMonth * expDurationMonths * distanceMult);
        const totalDays = expDurationMonths * 30;

        // 서포터 드랍률 증폭
        const lootBonusPercent = supporterCount * 15 + (tankerCount >= 1 && dealerCount >= 1 && supporterCount >= 1 ? 15 : 0);

        const durationRewardInfo = getDurationRewardMultiplier(expDurationMonths);

        return {
            teamCount,
            targetReqLevel,
            targetReqCombatPower,
            teamTotalCombatPower,
            cpPercent: Math.round(cpRatio * 100),
            tankerCount,
            dealerCount,
            supporterCount,
            noneCount,
            avgTeamLevel: Math.round(avgTeamLevel),
            totalSuccessRate,
            totalCostFood,
            totalCostGold,
            totalDays,
            lootBonusPercent,
            isBalanced: tankerCount >= 1 && dealerCount >= 1 && supporterCount >= 1,
            isFullTeam: teamCount === 6 && noneCount === 0,
            durationRewardMult: durationRewardInfo.mult,
            durationBonusLabel: durationRewardInfo.bonusLabel
        };
    };

    const expeditionMetrics = getExpeditionMetrics();

    // 일반 파견 시작
    const handleDispatch = () => {
        if (!selectedCompanionId) return alert("파견할 동료를 선택해주세요.");
        if (currentDispatchCount >= maxDispatch) return alert("파견 가능 슬롯이 꽉 찼습니다.");
        
        const cost = getDispatchCost();
        if ((character.base?.resources.food || 0) < cost.food) return alert(`식량이 부족합니다. (필요: ${cost.food})`);
        if (character.money < cost.gold) return alert(`골드가 부족합니다. (필요: ${cost.gold.toLocaleString()}G)`);

        const companionIndex = character.inactiveCompanions?.findIndex(c => c.id === selectedCompanionId);
        if (companionIndex === undefined || companionIndex === -1) return;
        
        const companion = character.inactiveCompanions![companionIndex];
        const startDate = character.currentDate || '2000-01-01';
        const days = duration * 30;
        const returnDate = addDays(startDate, days);

        const dest: Location = { region: selectedRegion, nation: selectedNation, city: selectedCity };
        const successInfo = getSuccessRate(companion, dest, duration);

        const newMission: DispatchMission = {
            id: Math.random().toString(36).substring(7),
            companionId: companion.id,
            destination: dest,
            startTime: startDate,
            durationMonths: duration,
            expectedReturnDate: returnDate,
            status: 'Normal',
            dangerCounter: 0,
            rewards: { gold: 0, items: [] },
            successRate: successInfo.total,
            missionType: 'NormalDispatch'
        };

        const newChar = unassignFromTraining({ ...character }, companion.id);
        if (newChar.base) {
            newChar.base = { 
                ...newChar.base, 
                dispatched: [...(newChar.base.dispatched || []), newMission],
                resources: {
                    ...newChar.base.resources,
                    food: newChar.base.resources.food - cost.food
                },
                assignments: {
                    ...(newChar.base.assignments || {}),
                    [`dispatch_${newMission.id}`]: companion.id
                }
            };
        }
        newChar.money -= cost.gold;

        onUpdateCharacter(newChar, `[시스템] ${companion.name}을(를) ${selectedCity}(으)로 파견했습니다. (${duration}개월, 예상성공률 ${successInfo.total}%)`);
        
        setResultData({
            type: 'success',
            title: '파견 완료',
            message: `${companion.name}이(가) 긴 여정을 떠났습니다.`,
            items: [
                { label: '목적지', after: `${selectedNation} ${selectedCity}` },
                { label: '예상 성공률', after: `${successInfo.total}%` },
                { label: '소모 식량/골드', after: `${cost.food} 식량 / ${cost.gold.toLocaleString()} G` },
                { label: '복귀 예정', after: returnDate }
            ]
        });
        
        setSelectedCompanionId(null);
    };

    // 원정대 파견 시작
    const handleExpeditionDispatch = () => {
        if (assignedTeamMembers.length === 0) {
            return alert("원정대에 참가할 대원을 최소 1명 이상 편성해주세요.");
        }
        if (currentDispatchCount >= maxDispatch) {
            return alert("파견 사령부의 파견 가능 슬롯이 꽉 찼습니다.");
        }

        const metrics = getExpeditionMetrics();

        if ((character.base?.resources.food || 0) < metrics.totalCostFood) {
            return alert(`식량이 부족합니다. (필요: ${metrics.totalCostFood})`);
        }
        if (character.money < metrics.totalCostGold) {
            return alert(`골드가 부족합니다. (필요: ${metrics.totalCostGold.toLocaleString()}G)`);
        }

        const startDate = character.currentDate || '2000-01-01';
        const returnDate = addDays(startDate, metrics.totalDays);
        const missionId = 'exp_' + Math.random().toString(36).substring(7);

        const teamMembers: ExpeditionTeamMember[] = assignedTeamMembers.map(({ slot }) => ({
            companionId: slot.companionId!,
            role: slot.role,
            position: slot.role === 'tanker' ? 'front' : slot.role === 'dealer' ? 'mid' : 'back'
        }));

        const leaderId = teamMembers[0].companionId;
        const targetName = expTargetType === 'dungeon' 
            ? `${expCity} 던전 [${currentBossData?.name || '보스'}]`
            : `${expNation} 사냥터 [${selectedHuntBand.name}]`;

        const newMission: DispatchMission = {
            id: missionId,
            companionId: leaderId,
            destination: { region: expRegion, nation: expNation, city: expCity },
            startTime: startDate,
            durationMonths: expDurationMonths,
            expectedReturnDate: returnDate,
            status: 'Normal',
            dangerCounter: 0,
            rewards: { gold: 0, items: [] },
            successRate: metrics.totalSuccessRate,
            missionType: 'Expedition',
            expeditionDifficulty: expTargetType === 'dungeon' ? 'Dungeon' : selectedHuntBand.difficulty,
            expeditionTargetName: targetName,
            targetType: expTargetType,
            huntZoneId: selectedHuntBand.id,
            targetLevelRange: expTargetType === 'dungeon' ? [currentBossData?.level || 80, (currentBossData?.level || 80) + 10] : selectedHuntBand.levelRange,
            teamMembers: teamMembers
        };

        let newChar = { ...character };
        // 원정 참여 대원 훈련소 자동 해제
        teamMembers.forEach(tm => {
            newChar = unassignFromTraining(newChar, tm.companionId);
        });

        const newAssignments = { ...(newChar.base?.assignments || {}) };
        teamMembers.forEach((tm, idx) => {
            newAssignments[`dispatch_${missionId}_member_${idx}`] = tm.companionId;
        });

        if (newChar.base) {
            newChar.base = {
                ...newChar.base,
                dispatched: [...(newChar.base.dispatched || []), newMission],
                resources: {
                    ...newChar.base.resources,
                    food: newChar.base.resources.food - metrics.totalCostFood
                },
                assignments: newAssignments
            };
        }
        newChar.money -= metrics.totalCostGold;

        const memberDescriptions = teamMembers.map(tm => {
            const comp = character.inactiveCompanions?.find(c => c.id === tm.companionId);
            const roleLabel = tm.role === 'tanker' ? '탱커' : tm.role === 'dealer' ? '딜러' : '서포터';
            return `${comp?.name || '대원'}(${roleLabel})`;
        }).join(', ');

        onUpdateCharacter(
            newChar, 
            `[원정대 출진] ${targetName} (${expNation} ${expCity}) 원정대를 파견했습니다! 편성(${teamMembers.length}인, 전투력: ${metrics.teamTotalCombatPower.toLocaleString()} / 권장: ${metrics.targetReqCombatPower.toLocaleString()}): [${memberDescriptions}] / 성공률: ${metrics.totalSuccessRate}%`
        );

        setResultData({
            type: 'success',
            title: '원정대 출진 완료!',
            message: `용맹한 원정대가 [${targetName}]으로 출발했습니다!`,
            items: [
                { label: '원정 목표', after: targetName },
                { label: '목적지', after: `${expNation} ${expCity}` },
                { label: '편성 대원', after: `${teamMembers.length}명 참여` },
                { label: '원정대 전투력', after: `${metrics.teamTotalCombatPower.toLocaleString()} (권장: ${metrics.targetReqCombatPower.toLocaleString()})` },
                { label: '예상 성공률', after: `${metrics.totalSuccessRate}%` },
                { label: '소모 자원', after: `${metrics.totalCostFood} 식량 / ${metrics.totalCostGold.toLocaleString()} G` },
                { label: '복귀 예정일', after: returnDate }
            ]
        });

        // 원정대 슬롯 리셋
        setTeamSlots([
            { companionId: null, role: 'tanker' },
            { companionId: null, role: 'tanker' },
            { companionId: null, role: 'dealer' },
            { companionId: null, role: 'dealer' },
            { companionId: null, role: 'supporter' },
            { companionId: null, role: 'supporter' }
        ]);
    };

    // 스카우트 파견 예상 성공률 계산
    const getScoutSuccessRate = () => {
        const scouterComp = getAvailableCompanions().find(c => c.id === scoutCompanionId);
        if (!scouterComp) return 35;
        const scouterStatBonus = Math.floor(
            ((scouterComp.stats.wis || 10) + (scouterComp.stats.int || 10) + (scouterComp.stats.str || 10) + (scouterComp.stats.ctrl || 10) + (scouterComp.level * 2)) / 10
        );
        const facilityBonus = facilityLevel * 5;
        const durationBonus = (scoutDuration - 1) * 4;
        const baseRate = 35;
        return Math.min(92, Math.max(15, baseRate + scouterStatBonus + facilityBonus + durationBonus));
    };

    // 인재 스카우트 파견 실행
    const handleScoutDispatch = () => {
        if (!scoutCompanionId) return alert("스카우트에 파견할 담당 대원을 선택해 주십시오.");
        if (currentDispatchCount >= maxDispatch) return alert("파견 가능 슬롯이 꽉 찼습니다.");

        const goldCost = 1000 * scoutDuration;
        const foodCost = 50 * scoutDuration;

        const currentFood = character.base?.resources?.food ?? 0;

        if ((character.money || 0) < goldCost) return alert(`골드가 부족합니다. (필요: ${goldCost.toLocaleString()}G)`);
        if (currentFood < foodCost) return alert(`식량이 부족합니다. (필요: ${foodCost}, 보유: ${currentFood})`);

        const scouterComp = getAvailableCompanions().find(c => c.id === scoutCompanionId);
        const successRate = getScoutSuccessRate();
        const startDate = character.currentDate || '2000-01-01';
        const returnDate = addDays(startDate, scoutDuration * 30);

        const newMission: DispatchMission = {
            id: `scout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            companionId: scoutCompanionId,
            destination: { region: scoutRegion, nation: scoutNation, city: scoutCity },
            startTime: startDate,
            durationMonths: scoutDuration,
            expectedReturnDate: returnDate,
            status: 'Normal',
            dangerCounter: 0,
            successRate: successRate,
            missionType: 'ScoutDispatch',
            scoutTargetJob: scoutTargetJob,
            scoutTargetNation: scoutNation,
            scoutTargetCity: scoutCity
        };

        let newChar = unassignFromTraining({ ...character }, scoutCompanionId);
        newChar.money -= goldCost;
        if (newChar.base) {
            if (!newChar.base.resources) {
                newChar.base.resources = { food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0, gold: 0, manaStone: 0, herbs: 0, normalCrystal: 0 } as any;
            }
            newChar.base.resources.food -= foodCost;
            if (!newChar.base.dispatched) newChar.base.dispatched = [];
            newChar.base.dispatched.push(newMission);
            if (!newChar.base.assignments) newChar.base.assignments = {};
            newChar.base.assignments[`dispatch_${newMission.id}`] = scoutCompanionId;
        }

        onUpdateCharacter(newChar, `[인재 스카우트] ${scouterComp?.name} 대원을 ${scoutNation} ${scoutCity} (목표: ${scoutTargetJob}) 스카우트 파견했습니다.`);

        setResultData({
            type: 'success',
            title: '스카우트 파견 출진 완료',
            message: `${scouterComp?.name} 대원이 ${scoutNation} ${scoutCity}(으)로 ${scoutTargetJob} 인재 영입 스카우트 파견을 떠났습니다.`,
            items: [
                { label: '목표 직업', after: scoutTargetJob },
                { label: '탐색 지역', after: `${scoutNation} ${scoutCity}` },
                { label: '파견 기간', after: `${scoutDuration}개월` },
                { label: '예상 성공률', after: `${successRate}%` },
                { label: '소모 자원', after: `${goldCost.toLocaleString()}G / 식량 ${foodCost}` }
            ]
        });
        setScoutCompanionId(null);
    };

    // 파견 중도 복귀
    const handleRecall = (mission: DispatchMission) => {
        if (!confirm("중도 복귀 시 보상을 획득할 수 없습니다. 정말 복귀시키겠습니까?")) return;
        
        const newChar = { ...character };
        if (newChar.base) {
            newChar.base = { ...newChar.base };
            newChar.base.dispatched = newChar.base.dispatched?.filter(m => m.id !== mission.id);
            if (newChar.base.assignments) {
                const newAssignments = { ...newChar.base.assignments };
                Object.keys(newAssignments).forEach(k => {
                    if (k.includes(mission.id)) delete newAssignments[k];
                });
                newChar.base.assignments = newAssignments;
            }
        }
        
        const comp = character.inactiveCompanions?.find(c => c.id === mission.companionId);
        if (newChar.base?.urgentAlarms && comp) {
            newChar.base.urgentAlarms = newChar.base.urgentAlarms.filter(alarm => !alarm.includes(`'${comp.name}'님의 미션`));
        }
        onUpdateCharacter(newChar, `[시스템] ${mission.missionType === 'Expedition' ? '원정대' : comp?.name || '동료'}가 임무를 중단하고 기지로 복귀했습니다.`);
    };

    // 긴급 지원 처리
    const handleSupport = (mission: DispatchMission, type: 'resource' | 'personnel', supportCompanionId?: string) => {
        let newChar = { ...character };
        let logMsg = "";

        if (type === 'resource') {
            const supportCostGold = 5000;
            const supportCostFood = 20;
            
            if (character.money < supportCostGold || (character.base?.resources.food || 0) < supportCostFood) {
                return alert("지원 자원이 부족합니다. (골드 5000, 식량 20 필요)");
            }

            newChar.money -= supportCostGold;
            if (newChar.base) {
                newChar.base = { 
                    ...newChar.base,
                    resources: {
                        ...newChar.base.resources,
                        food: newChar.base.resources.food - supportCostFood
                    },
                    dispatched: newChar.base.dispatched?.map(m => 
                        m.id === mission.id ? { ...m, status: 'Normal' as const, dangerCounter: 0, successRate: Math.min(100, m.successRate + 10) } : m
                    )
                };
            }
            logMsg = `[시스템] 파견/원정 대원에게 긴급 물자를 지원하여 위기를 극복했습니다! (성공률 +10%)`;
        } else if (type === 'personnel' && supportCompanionId) {
            const comp = character.inactiveCompanions?.find(c => c.id === supportCompanionId);
            if (!comp) return;

            logMsg = `[시스템] ${comp.name} 대원을 긴급 지원군으로 급파했습니다! 위기를 돌파했습니다. (성공률 +${comp.level}%)`;
            newChar = unassignFromTraining(newChar, comp.id);
            if (newChar.base) {
                newChar.base = {
                    ...newChar.base,
                    dispatched: newChar.base.dispatched?.map(m => 
                        m.id === mission.id ? { 
                            ...m, 
                            status: 'Normal' as const, 
                            dangerCounter: 0, 
                            successRate: Math.min(100, m.successRate + comp.level),
                            supportCompanionId: comp.id,
                            supportCompanionName: comp.name,
                            supportCompanionLevel: comp.level,
                            supportDate: character.currentDate || '2000-01-01'
                        } : m
                    ),
                    assignments: {
                        ...(newChar.base.assignments || {}),
                        [`support_${mission.id}`]: comp.id,
                        [`dispatch_support_${comp.id}`]: mission.id
                    }
                };
            }
        }

        if (newChar.base?.urgentAlarms) {
            const targetComp = character.inactiveCompanions?.find(c => c.id === mission.companionId);
            if (targetComp) {
                newChar.base.urgentAlarms = newChar.base.urgentAlarms.filter(alarm => !alarm.includes(`'${targetComp.name}'님의 미션`));
            }
        }

        onUpdateCharacter(newChar, logMsg);
        setSupportingMission(null);
        setSelectedSupportCompanionId(null);
        
        setResultData({
            type: 'success',
            title: '긴급 지원 완료',
            message: logMsg,
            items: [{ label: '지원 방식', after: type === 'resource' ? '물자 지원 (골드/식량)' : '구원 대원 파견' }]
        });
    };

    const applyProficiencyGain = (
        comp: Companion, 
        xpGain: number, 
        isExpedition: boolean = false,
        durationMonths: number = 1
    ): { logText: string; summaryBadge: string; totalWepGain: number; totalSkillGain: number; wepLevelUps: number; skillLevelUps: number } => {
        let msgParts: string[] = [];
        let wepLevelUps = 0;
        let skillLevelUps = 0;
        let totalWepGain = 0;
        let totalSkillGain = 0;

        // 1. 주무기 타입 결정 (장착 무기 or 스탯/직업 기반 적합 무기 자동 보정)
        const rawWep = comp.equipment?.weapon?.weaponType;
        let wepType: WeaponType;
        if (rawWep && (rawWep as any) !== '없음') {
            wepType = rawWep as WeaponType;
        } else {
            const highInt = (comp.stats.int || 10) > (comp.stats.str || 10);
            const highAgi = (comp.stats.agi || 10) > (comp.stats.str || 10);
            if (highInt) wepType = 'Staff';
            else if (highAgi) wepType = 'Bow';
            else wepType = 'Sword';
        }

        // 2. 파견 유형 및 기간에 따른 숙련도 획득 계수 산출
        // 원정대 파견은 치열한 사투와 던전 토벌을 수행하므로 일반 파견 대비 대폭 상승 (기본 4배 이상 + 기간 비례 보너스)
        const durationProfBonus = 1.0 + (durationMonths - 1) * 0.25;
        const weaponMultiplier = isExpedition ? (0.35 * durationProfBonus) : 0.08;
        const skillMultiplier = isExpedition ? (0.25 * durationProfBonus) : 0.04;

        // 주무기 숙련도
        const weaponGain = Math.max(isExpedition ? 50 : 10, Math.floor(xpGain * weaponMultiplier));
        totalWepGain += weaponGain;
        const { char: updatedComp, levelsGained: wLvlGained } = addMasteryExp(comp, wepType, weaponGain);
        Object.assign(comp, updatedComp);
        wepLevelUps += wLvlGained;

        const wepKoreanName = WEAPON_TYPE_KOREAN[wepType] || wepType;
        let wepStr = `무기(${wepKoreanName}) +${weaponGain.toLocaleString()}`;
        if (wLvlGained > 0) {
            const curLvl = comp.weaponMastery?.[wepType]?.level || 1;
            wepStr += ` [Lv.${curLvl} 달성, +${wLvlGained} UP!]`;
        }
        msgParts.push(wepStr);

        // 보조무기(방패, 보조검, 보주 등) 착용 시 보조무기 숙련도 추가 획득
        const subWepType = comp.equipment?.subWeapon?.weaponType as WeaponType | undefined;
        if (subWepType && (subWepType as any) !== '없음' && subWepType !== wepType) {
            const subWeaponGain = Math.max(isExpedition ? 30 : 5, Math.floor(weaponGain * 0.6));
            totalWepGain += subWeaponGain;
            const { char: subUpdated, levelsGained: subLvlGained } = addMasteryExp(comp, subWepType, subWeaponGain);
            Object.assign(comp, subUpdated);
            wepLevelUps += subLvlGained;
            const subWepKorean = WEAPON_TYPE_KOREAN[subWepType] || subWepType;
            let subStr = `보조무기(${subWepKorean}) +${subWeaponGain.toLocaleString()}`;
            if (subLvlGained > 0) {
                const curSubLvl = comp.weaponMastery?.[subWepType]?.level || 1;
                subStr += ` [Lv.${curSubLvl} 달성, +${subLvlGained} UP!]`;
            }
            msgParts.push(subStr);
        }

        // 스킬 숙련도
        if (comp.skills && comp.skills.length > 0) {
            const skillGain = Math.max(isExpedition ? 30 : 8, Math.floor(xpGain * skillMultiplier));
            totalSkillGain += skillGain;
            let skilledCount = 0;
            comp.skills.forEach(skill => {
                const maxLvl = skill.maxLevel || 10;
                if (skill.level < maxLvl) {
                    skill.currentMastery = (skill.currentMastery || 0) + skillGain;
                    skilledCount++;
                    const required = 20 * (skill.level + 4);
                    while (skill.currentMastery >= required && skill.level < maxLvl) {
                        skill.currentMastery -= required;
                        skill.level += 1;
                        skillLevelUps++;
                        if (skill.type !== ('DEBUFF' as any)) {
                            skill.mpCost = getReducedMpCostOnLevelUp(skill);
                        }
                    }
                }
            });
            if (skilledCount > 0) {
                let skillStr = `스킬 숙련도(전체) +${skillGain.toLocaleString()}`;
                if (skillLevelUps > 0) {
                    skillStr += ` [스킬 레벨업 ${skillLevelUps}회!]`;
                }
                msgParts.push(skillStr);
            }
        }

        const logText = msgParts.join(", ");
        return {
            logText,
            summaryBadge: isExpedition ? `⚔️ [원정 실전특화] ${logText}` : logText,
            totalWepGain,
            totalSkillGain,
            wepLevelUps,
            skillLevelUps
        };
    };

    // 파견 및 원정대 완료 보상 수령
    const handleComplete = (mission: DispatchMission) => {
        const isExpedition = mission.missionType === 'Expedition';
        const isScout = mission.missionType === 'ScoutDispatch';
        const successRate = mission.successRate || 50;
        const roll = Math.random() * 100;

        let outcome: 'Great' | 'Success' | 'Failure' = 'Failure';
        if (roll < successRate) {
            outcome = roll < (successRate * 0.25) ? 'Great' : 'Success'; 
        }

        let newChar = { ...character };
        const rewardsItems: Item[] = [];
        let goldReward = 0;
        let totalXpGain = 0;
        let title = "";
        let msg = "";
        let resultType: ResultData['type'] = 'info';

        if (isScout) {
            const scouterComp = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === mission.companionId);
            const targetJob = mission.scoutTargetJob || JobType.FARMER;
            const targetNation = mission.scoutTargetNation || mission.destination?.nation || '대한민국';
            const targetCity = mission.scoutTargetCity || mission.destination?.city || '서울';
            const isSuccess = outcome === 'Great' || outcome === 'Success';
            const scoutDuration = mission.durationMonths || 1;
            const durationMultInfo = getDurationRewardMultiplier(scoutDuration);

            let scoutXpGain = 0;
            let scouterProfMsg = '';

            if (isSuccess) {
                resultType = 'success';
                title = outcome === 'Great' ? `[스카우트 대성공!] ${targetJob} 인재 영입` : `[스카우트 성공!] ${targetJob} 인재 영입`;

                const scouterLevel = scouterComp ? scouterComp.level : 10;
                const bonusMult = outcome === 'Great' ? 1.3 : 1.0;
                let rawScoutedLevel = Math.max(1, Math.floor((scouterLevel * (0.6 + Math.random() * 0.4) + (facilityLevel * 2)) * bonusMult));
                
                // 직업 성격에 따른 레벨 및 클래스 해방(ClassTier) 현실화 보정
                const isCivilianArtisan = [
                    JobType.FARMER, JobType.MINER, JobType.BLACKSMITH, JobType.ALCHEMIST,
                    JobType.CHEF, JobType.BREEDER, JobType.TRAINER, JobType.HOUSEKEEPER,
                    JobType.RESEARCHER, JobType.UNEMPLOYED, JobType.SLAVE, JobType.STUDENT
                ].includes(targetJob as any) || ['농부', '광부', '대장장이', '연금술사', '요리사', '사육사', '트레이너', '하우스 키퍼', '연구원', '무직', '학생', '노예'].includes(targetJob as string);

                const isMercenary = targetJob === JobType.MERCENARY || (targetJob as string) === '용병';

                let scoutedLevel = rawScoutedLevel;
                let tier = getTierByLevel(rawScoutedLevel);

                if (isCivilianArtisan) {
                    // 농부, 광부, 대장장이, 연금술사, 요리사, 사육사, 무직 등 생활/생산 직업
                    scoutedLevel = Math.max(1, Math.min(outcome === 'Great' ? 18 : 12, Math.floor(rawScoutedLevel * 0.25) + Math.floor(Math.random() * 4)));
                } else if (isMercenary) {
                    // 용병 및 하급 일반인
                    scoutedLevel = Math.max(1, Math.min(outcome === 'Great' ? 28 : 22, Math.floor(rawScoutedLevel * 0.4) + Math.floor(Math.random() * 4)));
                }

                // 기간에 따른 인재 품질 및 잠재력 극대화
                if (scoutDuration >= 12) {
                    scoutedLevel += 35;
                } else if (scoutDuration >= 6) {
                    scoutedLevel += 20;
                } else if (scoutDuration >= 3) {
                    scoutedLevel += 10;
                } else if (scoutDuration >= 2) {
                    scoutedLevel += 5;
                }

                // 레벨에 맞춰 정당하게 ClassTier 산출
                tier = getTierByLevel(scoutedLevel);

                const gender: '남성' | '여성' = Math.random() < 0.5 ? '남성' : '여성';
                const genderParam = gender === '남성' ? 'male' : 'female';
                const race = getRaceByNation(targetNation);
                const name = generateName(targetNation, genderParam);
                const stats = generateCompanionStats(scoutedLevel);

                if (scoutDuration >= 12) {
                    Object.keys(stats).forEach(k => { stats[k] = Math.floor(stats[k] * 1.4); });
                } else if (scoutDuration >= 6) {
                    Object.keys(stats).forEach(k => { stats[k] = Math.floor(stats[k] * 1.25); });
                } else if (scoutDuration >= 3) {
                    Object.keys(stats).forEach(k => { stats[k] = Math.floor(stats[k] * 1.12); });
                }

                const combatStyle = (assignRandomCombatStyle({ level: scoutedLevel } as any, true, true) as any)?.combatStyle || CombatStyle.SWORDSMAN;
                const ageNum = 18 + Math.floor(Math.random() * 25);
                const currentYear = parseInt((character.currentDate || '2000-01-01').split('-')[0]) || 2000;
                const birthYear = currentYear - ageNum;
                const visualUrl = generateDefaultVisualUrl(name, targetNation, race, gender);

                const scoutedCompanion: Companion = {
                    id: `scouted_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    name: name,
                    level: scoutedLevel,
                    classType: '전투계열',
                    currentExp: 0,
                    maxExp: scoutedLevel * 100,
                    statPoints: 0,
                    age: `${ageNum}세`,
                    birthYear: birthYear,
                    gender: gender,
                    nation: targetNation,
                    race: race,
                    job: targetJob,
                    classTier: tier,
                    combatStyle: combatStyle,
                    stats: stats,
                    skills: [],
                    equipment: {},
                    inventory: [],
                    affection: scoutDuration >= 6 ? 55 : 35,
                    loyalty: scoutDuration >= 6 ? 95 : 85,
                    appearance: scoutDuration >= 6 
                        ? `[${scoutDuration}개월 정예 수색 발굴] ${targetNation} 출신의 비범한 역량을 갖춘 ${targetJob}입니다.` 
                        : `${targetNation} 출신의 유능한 ${targetJob}입니다. 스카우트 파견을 통해 새로 영입되었습니다.`,
                    personality: '협력적',
                    visualUrl: visualUrl
                };

                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(scoutedCompanion);

                msg = `${scouterComp?.name || '파견 대원'}이(가) ${targetNation} ${targetCity}에서 ${targetJob} 인재 '${scoutedCompanion.name}'(Lv.${scoutedCompanion.level})을(를) 설득하여 성공적으로 영입하고 복귀했습니다!`;
            } else {
                resultType = 'info';
                title = `[스카우트 실패] 인재 영입 실패`;
                msg = `${scouterComp?.name || '파견 대원'}이(가) ${targetNation} ${targetCity} 지역에서 ${targetJob} 인재를 다방면으로 탐색하였으나 영입 조건을 맞추지 못해 실패하고 복귀했습니다.`;
            }

            scoutXpGain = Math.floor(scoutDuration * 2500 * durationMultInfo.mult * (outcome === "Great" ? 1.5 : (outcome === "Success" ? 1.0 : 0.5)));
            if (newChar.inactiveCompanions) {
                const scouterIdx = newChar.inactiveCompanions.findIndex(c => c.id === mission.companionId);
                if (scouterIdx >= 0) {
                    const compRef = newChar.inactiveCompanions[scouterIdx];
                    compRef.currentExp = (compRef.currentExp || 0) + scoutXpGain;
                    const profRes = applyProficiencyGain(compRef, scoutXpGain, false, scoutDuration);
                    scouterProfMsg = profRes.logText;
                    msg += ` (파견대원 경험치 +${scoutXpGain.toLocaleString()}`; 
                    if (scouterProfMsg) msg += `, ${scouterProfMsg}`; 
                    msg += `)`;
                }
            }

            if (newChar.base?.dispatched) {
                newChar.base.dispatched = newChar.base.dispatched.filter(m => m.id !== mission.id);
            }
            if (newChar.base?.assignments) {
                delete newChar.base.assignments[`dispatch_${mission.id}`];
            }

            const scoutItems = isSuccess ? [
                { label: '영입 인물', after: `${newChar.inactiveCompanions?.[newChar.inactiveCompanions.length - 1]?.name} (Lv.${newChar.inactiveCompanions?.[newChar.inactiveCompanions.length - 1]?.level})` },
                { label: '직업', after: targetJob },
                { label: '출신 지역', after: `${targetNation} ${targetCity}` },
                { label: '파견 기간', after: `${scoutDuration}개월 (${durationMultInfo.bonusLabel})` },
                { label: '파견 대원 EXP', after: `+${scoutXpGain.toLocaleString()} EXP` },
                ...(scouterProfMsg ? [{ label: '⚔️ 파견 대원 숙련도 획득', after: scouterProfMsg, color: 'text-emerald-300' }] : [])
            ] : [
                { label: '목표 직업', after: targetJob },
                { label: '탐색 지역', after: `${targetNation} ${targetCity}` },
                { label: '파견 기간', after: `${scoutDuration}개월` },
                { label: '파견 대원 EXP', after: `+${scoutXpGain.toLocaleString()} EXP (수색 경험)` },
                ...(scouterProfMsg ? [{ label: '⚔️ 파견 대원 숙련도 획득', after: scouterProfMsg, color: 'text-emerald-300' }] : []),
                { label: '결과', after: '영입 실패 (대원 복귀 완료)' }
            ];

            setResultData({
                type: resultType,
                title: title,
                message: msg,
                items: scoutItems
            });

            onUpdateCharacter(newChar, msg);
            return;
        }

        if (isExpedition) {
            // === 원정대 완료 로직 ===
            const teamMembers = mission.teamMembers || [{ companionId: mission.companionId, role: 'dealer' as const, position: 'mid' as const }];
            const targetNation = mission.destination?.nation || '대한민국';
            const targetCity = mission.destination?.city || '서울';
            const isDungeonTarget = mission.targetType === 'dungeon';
            const months = mission.durationMonths || 1;
            const durationMultInfo = getDurationRewardMultiplier(months);

            if (outcome === 'Great' || outcome === 'Success') {
                const mult = outcome === 'Great' ? 1.6 : 1.0;
                resultType = 'success';
                title = outcome === 'Great' ? `[원정 대성공!] ${mission.expeditionTargetName}` : `[원정 성공!] ${mission.expeditionTargetName}`;
                msg = outcome === 'Great' 
                    ? '원정대가 목표를 완벽하게 섬멸하고 숨겨진 고대 보물창고까지 발견했습니다!' 
                    : '원정대가 치열한 탐사 끝에 목표를 달성하고 풍성한 전리품과 함께 무사히 귀환했습니다.';

                // 골드 및 경험치 보상 (기간 비례 극대화)
                const baseGold = (isDungeonTarget ? 55000 : 38000) * months * durationMultInfo.mult * (0.9 + Math.random() * 0.4);
                goldReward = Math.floor(baseGold * mult * teamMembers.length);

                const reqLvl = mission.targetLevelRange ? mission.targetLevelRange[0] : 30;
                const baseExp = reqLvl * 4000 * months * durationMultInfo.mult;
                totalXpGain = Math.floor(baseExp * mult);

                // 전리품 아이템 추출 (기간이 길수록 획득량 대폭 증가)
                const regionalLootTable = WORLD_LOOT_TABLES[targetNation] || WORLD_LOOT_TABLES['generic'] || [];
                const baseItemCount = outcome === 'Great' ? 4 : 3;
                const durationBonusItems = Math.floor((months - 1) * 3.0 * (outcome === 'Great' ? 1.4 : 1.0));
                const itemCount = Math.min(45, baseItemCount + durationBonusItems);

                if (isDungeonTarget) {
                    // 던전 보스 전리품 우선 획득 기회 (장기 원정 시 깊은 층 토벌로 복수 드랍)
                    const currentMonthNum = parseInt((mission.startTime || '2000-03-01').split('-')[1]) || 3;
                    const boss = getBossByLocation(targetNation, targetCity, currentMonthNum);
                    
                    if (boss && boss.detailedLoot) {
                        const bossLootList = Array.isArray(boss.detailedLoot) ? boss.detailedLoot : [boss.detailedLoot];
                        if (bossLootList.length > 0) {
                            const bossLootRolls = outcome === 'Great'
                                ? (months >= 6 ? 4 : months >= 3 ? 3 : 2)
                                : (months >= 6 ? 3 : months >= 3 ? 2 : 1);
                            for (let b = 0; b < bossLootRolls; b++) {
                                const chosenBossLoot = bossLootList[Math.floor(Math.random() * bossLootList.length)];
                                rewardsItems.push({
                                    ...chosenBossLoot,
                                    description: `[${targetCity} 던전 보스 '${boss.name}' ${b + 1}차 토벌 전리품] ${chosenBossLoot.description || ''}`
                                });
                            }
                        }
                    }
                }

                // 일반/지역 전리품 드랍 - 기간 및 권장 레벨에 따른 고급 희귀도 개방
                let allowedRarities = [ItemRarity.RARE, ItemRarity.EPIC];
                if (months >= 12 || reqLvl >= 180) {
                    allowedRarities = [ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY, ItemRarity.MYTHTIC];
                } else if (months >= 6 || reqLvl >= 100) {
                    allowedRarities = [ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY];
                } else if (months >= 3 || reqLvl >= 50) {
                    allowedRarities = [ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE];
                } else if (reqLvl < 30) {
                    allowedRarities = [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE];
                }

                const pool = regionalLootTable.filter(item => allowedRarities.includes(item.rarity));
                const finalPool = pool.length > 0 ? pool : regionalLootTable;

                while (rewardsItems.length < itemCount && finalPool.length > 0) {
                    const entry = finalPool[Math.floor(Math.random() * finalPool.length)];
                    if (entry) {
                        const secOpts = entry.options || entry.secondaryOptions || [];
                        rewardsItems.push({
                            name: entry.item || entry.name,
                            type: entry.type || 'Etc',
                            weaponType: entry.weaponType,
                            elementalType: entry.elementalType || extractElementalType(secOpts),
                            rarity: entry.rarity || ItemRarity.RARE,
                            description: entry.description || `[${mission.expeditionTargetName}] 원정에서 회수한 귀중한 전리품입니다.`,
                            stats: entry.stats || {},
                            imageUrl: entry.imageUrl,
                            secondaryOptions: secOpts,
                            enhancement: 0
                        });
                    }
                }

                // 기지 마정석/마석 보너스 극대화
                let crystalGain = 0;
                let stoneGain = 0;
                if (newChar.base?.resources) {
                    crystalGain = Math.floor((isDungeonTarget ? 40 : 22) * months * durationMultInfo.mult * (outcome === 'Great' ? 2 : 1));
                    stoneGain = crystalGain * 6;
                    newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) + crystalGain;
                    newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + stoneGain;
                }

                // 원정대 참여 대원 전원(최대 6명)에게 대폭 증가된 무기/스킬 숙련도 및 경험치 분배
                let profMsgLog = '';
                const profDetailList: { name: string; msg: string }[] = [];
                if (newChar.inactiveCompanions) {
                    teamMembers.forEach(tm => {
                        const idx = newChar.inactiveCompanions!.findIndex(c => c.id === tm.companionId);
                        if (idx >= 0) {
                            const compRef = newChar.inactiveCompanions![idx];
                            compRef.currentExp = (compRef.currentExp || 0) + totalXpGain;
                            const profRes = applyProficiencyGain(compRef, totalXpGain, true, months);
                            if (profRes.logText) {
                                profMsgLog += `[${compRef.name}: ${profRes.logText}] `;
                                profDetailList.push({ name: compRef.name, msg: profRes.logText });
                            }
                        }
                    });
                }

                // 원정대 동료 상호 호감도 상승 및 관계 발전 처리
                const teamMemberIds = teamMembers.map(tm => tm.companionId);
                const bondingRes = applyExpeditionCompanionBonding(newChar, teamMemberIds, months, outcome as any);
                newChar = bondingRes.updatedChar;

                newChar.money += goldReward;
                newChar.inventory = [...newChar.inventory, ...rewardsItems];

                const itemLogStr = rewardsItems.length > 0
                    ? `전리품: ${rewardsItems.map(i => i.name).join(', ')}`
                    : '전리품 0개';

                const bondingLogStr = bondingRes.bondingLogs.length > 0
                    ? ` / 🤝 동료 유대 발전: ${bondingRes.bondingLogs.join(' ')}`
                    : ` / 🤝 대원 상호 호감도 +${bondingRes.totalGain}`;

                onUpdateCharacter(
                    newChar, 
                    `[원정 복귀] ${mission.expeditionTargetName} 완료 (${outcome})! 골드 +${goldReward.toLocaleString()}G, 대원 전원 EXP +${totalXpGain.toLocaleString()}, ${itemLogStr}${profMsgLog ? ' / ⚔️원정 숙련도 대폭 상승: ' + profMsgLog : ''}${bondingLogStr}`
                );

                const expeditionItemRows = rewardsItems.map(item => ({
                    label: `🎁 ${item.name}`,
                    after: item.rarity ? `[${item.rarity}] ${item.type || '장비'}` : '획득',
                    color: 'text-amber-300'
                }));

                const profRows = profDetailList.map(item => ({
                    label: `⚔️ [${item.name}] 숙련도 상승`,
                    after: item.msg,
                    color: 'text-emerald-300 font-bold'
                }));

                const bondingRows = bondingRes.pairDetails.slice(0, 6).map(pair => ({
                    label: `🤝 ${pair.names}`,
                    after: `호감도 +${pair.gain} (현재 ${pair.newAffection})`,
                    color: 'text-pink-300 font-medium'
                }));

                setResultData({
                    type: resultType,
                    title: title,
                    message: msg,
                    items: [
                        { label: '원정 목표', after: mission.expeditionTargetName || '던전' },
                        { label: '원정 기간', after: `${months}개월 (${durationMultInfo.bonusLabel})` },
                        { label: '획득 골드', after: `${goldReward.toLocaleString()} G` },
                        { label: '대원별 경험치', after: `+${totalXpGain.toLocaleString()} EXP (참여 대원 ${teamMembers.length}명 전원)` },
                        { label: '대원 상호 호감도', after: `참여 대원 전원 상호 호감도 +${bondingRes.totalGain} 상승`, color: 'text-pink-400 font-bold' },
                        ...(crystalGain > 0 ? [{ label: '기지 자원 보너스', after: `마정석 +${crystalGain.toLocaleString()}, 마석 +${stoneGain.toLocaleString()}` }] : []),
                        { label: '획득 전리품 수', after: `${rewardsItems.length}개` },
                        ...profRows,
                        ...bondingRows,
                        ...expeditionItemRows
                    ]
                });

            } else {
                resultType = 'failure';
                title = `[원정 실패] ${mission.expeditionTargetName}`;
                msg = '원정대가 강력한 몬스터 무리를 만나 고전 끝에 임무를 완수하지 못하고 퇴각했습니다. 다행히 대원들은 무사히 귀환했습니다.';

                // 실패 시에도 함께 사선을 넘나든 동료 간 호감도 상승
                const teamMemberIds = teamMembers.map(tm => tm.companionId);
                const bondingRes = applyExpeditionCompanionBonding(newChar, teamMemberIds, months, 'Failure');
                newChar = bondingRes.updatedChar;

                const bondingLogStr = bondingRes.bondingLogs.length > 0
                    ? ` / 🤝 동료 유대: ${bondingRes.bondingLogs.join(' ')}`
                    : ` / 🤝 대원 상호 호감도 +${bondingRes.totalGain}`;

                onUpdateCharacter(newChar, `[시스템] ${mission.expeditionTargetName} 원정대가 퇴각하여 빈손으로 복귀했습니다.${bondingLogStr}`);

                const bondingRows = bondingRes.pairDetails.slice(0, 6).map(pair => ({
                    label: `🤝 ${pair.names}`,
                    after: `호감도 +${pair.gain} (현재 ${pair.newAffection})`,
                    color: 'text-pink-300 font-medium'
                }));

                setResultData({
                    type: resultType,
                    title: title,
                    message: msg,
                    items: [
                        { label: '결과', after: '임무 실패 (보상 없음)' },
                        { label: '대원 상호 호감도', after: `고난을 함께 겪으며 호감도 +${bondingRes.totalGain} 상승`, color: 'text-pink-400 font-bold' },
                        ...bondingRows
                    ]
                });
            }

        } else {
            // === 일반 파견 완료 로직 ===
            const comp = character.inactiveCompanions?.find(c => c.id === mission.companionId);
            if (!comp) return;

            const durationMonths = mission.durationMonths || 1;
            const durationMultInfo = getDurationRewardMultiplier(durationMonths);

            if (outcome === 'Great' || outcome === 'Success') {
                const mult = outcome === 'Great' ? 1.5 : 1.0;
                resultType = 'success';
                title = outcome === 'Great' ? "파견 대성공!" : "파견 성공";
                msg = outcome === 'Great' ? `놀라운 성과를 거두었습니다! (성공률: ${successRate}%)` : `임무를 완수하고 복귀했습니다. (성공률: ${successRate}%)`;

                const baseGold = 15000 * durationMonths * durationMultInfo.mult * (0.8 + Math.random() * 0.7);
                goldReward = Math.floor(baseGold * mult);
                
                const itemCount = Math.min(30, Math.max(1, Math.floor((1 + durationMonths * 1.5) * mult)));
                const nation = mission.destination.nation;
                const regionalLootTable = WORLD_LOOT_TABLES[nation] || WORLD_LOOT_TABLES['generic'];

                let allowedRarities: ItemRarity[] = [ItemRarity.NORMAL, ItemRarity.MAGIC];
                if (durationMonths >= 24) allowedRarities = [ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY, ItemRarity.MYTHTIC];
                else if (durationMonths >= 12) allowedRarities = [ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY];
                else if (durationMonths >= 6) allowedRarities = [ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC];
                else if (durationMonths >= 3) allowedRarities = [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE];

                const pool = regionalLootTable.filter(item => allowedRarities.includes(item.rarity));
                const finalPool = pool.length > 0 ? pool : regionalLootTable;

                for (let i = 0; i < itemCount; i++) {
                    const entry = finalPool[Math.floor(Math.random() * finalPool.length)];
                    if (entry) {
                        const secOpts = entry.options || entry.secondaryOptions || [];
                        rewardsItems.push({
                            name: entry.item || entry.name,
                            type: entry.type || 'Etc',
                            weaponType: entry.weaponType,
                            elementalType: entry.elementalType || extractElementalType(secOpts),
                            rarity: entry.rarity || ItemRarity.NORMAL,
                            description: entry.description || `${nation} 지역에서 발견한 물품입니다.`,
                            stats: entry.stats || {},
                            imageUrl: entry.imageUrl,
                            secondaryOptions: secOpts,
                            enhancement: 0
                        });
                    }
                }

                const xpGain = Math.floor(durationMonths * 3000 * durationMultInfo.mult * mult);
                newChar.money += goldReward;
                newChar.inventory = [...newChar.inventory, ...rewardsItems];

                let profMsgLog = '';
                if (newChar.inactiveCompanions) {
                    const cIdx = newChar.inactiveCompanions.findIndex(c => c.id === comp.id);
                    if (cIdx >= 0) {
                        const compRef = newChar.inactiveCompanions[cIdx];
                        compRef.currentExp = (compRef.currentExp || 0) + xpGain;
                        const profRes = applyProficiencyGain(compRef, xpGain, false, durationMonths);
                        profMsgLog = profRes.logText;
                    }
                }

                const itemLogStr = rewardsItems.length > 0
                    ? `획득 아이템: ${rewardsItems.map(i => i.name).join(', ')}`
                    : '아이템 0개';

                onUpdateCharacter(newChar, `[시스템] ${comp.name} 파견 복귀 (${outcome})! (골드 +${goldReward.toLocaleString()}G, ${itemLogStr}, 경험치 +${xpGain.toLocaleString()}${profMsgLog ? ', ⚔️숙련도: ' + profMsgLog : ''})`);

                const normalItemRows = rewardsItems.map(item => ({
                    label: `🎁 ${item.name}`,
                    after: item.rarity ? `[${item.rarity}] ${item.type || '물품'}` : '획득',
                    color: 'text-amber-300'
                }));

                setResultData({
                    type: resultType,
                    title: title,
                    message: `${comp.name}이(가) 돌아왔습니다.\n${msg}`,
                    items: [
                        { label: '파견 기간', after: `${durationMonths}개월 (${durationMultInfo.bonusLabel})` },
                        { label: '획득 골드', after: `${goldReward.toLocaleString()} G` },
                        { label: '경험치', after: `+${xpGain.toLocaleString()} EXP` },
                        ...(profMsgLog ? [{ label: '⚔️ 숙련도 획득', after: profMsgLog, color: 'text-emerald-300' }] : []),
                        { label: '획득 아이템 수', after: `${rewardsItems.length}개` },
                        ...normalItemRows
                    ]
                });

            } else {
                onUpdateCharacter(newChar, `[시스템] ${comp.name} 대원이 파견 임무에 실패하여 빈손으로 복귀했습니다.`);
                setResultData({
                    type: 'failure',
                    title: '파견 실패',
                    message: `${comp.name}이(가) 목표 달성에 실패하고 지친 몸으로 돌아왔습니다.`,
                    items: [{ label: '결과', after: '보상 없음' }]
                });
            }
        }

        // 미션 및 배정 정리
        if (newChar.base?.dispatched) {
            newChar.base.dispatched = newChar.base.dispatched.filter(d => d.id !== mission.id);
            if (newChar.base.assignments) {
                const newAssignments = { ...newChar.base.assignments };
                Object.keys(newAssignments).forEach(k => {
                    if (k.includes(mission.id)) delete newAssignments[k];
                });
                newChar.base.assignments = newAssignments;
            }
        }

        if (newChar.base?.urgentAlarms) {
            newChar.base.urgentAlarms = newChar.base.urgentAlarms.filter(alarm => !alarm.includes(mission.id));
        }
    };

    // 슬롯 대원 배치 (전술훈련소 숙련도 100 달성 여부에 따라 역할 자동 결정)
    const assignCompanionToSlot = (slotIndex: number, companionId: string) => {
        const comp = character.inactiveCompanions?.find(c => c.id === companionId);
        setTeamSlots(prev => {
            const next = [...prev];
            // 이미 다른 슬롯에 배치되어 있다면 해제
            next.forEach((s, idx) => {
                if (idx !== slotIndex && s.companionId === companionId) {
                    s.companionId = null;
                    s.role = 'none';
                }
            });

            // 현재 슬롯의 역할이 tanker / dealer / supporter / allrounder인 경우, 해당 대원이 숙련도 100을 만족하는지 확인
            let assignedRole: 'tanker' | 'dealer' | 'supporter' | 'allrounder' | 'none' = 'none';
            const currentSlotRole = next[slotIndex].role;

            if (currentSlotRole !== 'none' && isRoleUnlocked(comp, currentSlotRole)) {
                assignedRole = currentSlotRole;
            } else {
                // 대원의 활성 역할 우선 반영
                if (comp?.battleRole === BattleRole.ALLROUNDER && isRoleUnlocked(comp, 'allrounder')) {
                    assignedRole = 'allrounder';
                } else if (comp?.battleRole === BattleRole.TANKER && isRoleUnlocked(comp, 'tanker')) {
                    assignedRole = 'tanker';
                } else if (comp?.battleRole === BattleRole.DEALER && isRoleUnlocked(comp, 'dealer')) {
                    assignedRole = 'dealer';
                } else if (comp?.battleRole === BattleRole.SUPPORTER && isRoleUnlocked(comp, 'supporter')) {
                    assignedRole = 'supporter';
                } else if (isRoleUnlocked(comp, 'allrounder')) {
                    assignedRole = 'allrounder';
                } else if (isRoleUnlocked(comp, 'tanker')) {
                    assignedRole = 'tanker';
                } else if (isRoleUnlocked(comp, 'dealer')) {
                    assignedRole = 'dealer';
                } else if (isRoleUnlocked(comp, 'supporter')) {
                    assignedRole = 'supporter';
                } else {
                    assignedRole = 'none'; // 전술훈련소 숙련도 100 미달 시 역할없음(미특화)으로 배치
                }
            }

            next[slotIndex] = {
                companionId,
                role: assignedRole
            };
            return next;
        });
        setActiveSlotPickerIndex(null);
    };

    // 슬롯 대원 해제
    const removeCompanionFromSlot = (slotIndex: number) => {
        setTeamSlots(prev => {
            const next = [...prev];
            next[slotIndex] = {
                companionId: null,
                role: 'none'
            };
            return next;
        });
    };

    // 슬롯 역할 변경 (대원이 있는 경우 전술훈련소 숙련도 100 달성된 역할만 순환)
    const cycleSlotRole = (slotIndex: number) => {
        const slot = teamSlots[slotIndex];
        const comp = slot.companionId ? character.inactiveCompanions?.find(c => c.id === slot.companionId) : null;

        setTeamSlots(prev => {
            const next = [...prev];
            const current = next[slotIndex].role;
            
            if (comp) {
                // 대원이 배치된 경우: 숙련도 100을 달성한 역할들 + 올라운더(해금시) + 'none'만 순환
                const availableRoles: ('none' | 'tanker' | 'dealer' | 'supporter' | 'allrounder')[] = ['none'];
                if (isRoleUnlocked(comp, 'tanker')) availableRoles.push('tanker');
                if (isRoleUnlocked(comp, 'dealer')) availableRoles.push('dealer');
                if (isRoleUnlocked(comp, 'supporter')) availableRoles.push('supporter');
                if (isRoleUnlocked(comp, 'allrounder')) availableRoles.push('allrounder');

                const currentIndex = availableRoles.indexOf(current);
                const nextRole = availableRoles[(currentIndex + 1) % availableRoles.length];
                next[slotIndex].role = nextRole;
            } else {
                // 대원이 없는 경우: 자유 순환
                const allRoles: ('none' | 'tanker' | 'dealer' | 'supporter' | 'allrounder')[] = ['none', 'tanker', 'dealer', 'supporter', 'allrounder'];
                const currentIndex = allRoles.indexOf(current);
                const nextRole = allRoles[(currentIndex + 1) % allRoles.length];
                next[slotIndex].role = nextRole;
            }
            return next;
        });
    };

    // 현재 슬롯들에 이미 배정된 동료 ID 목록
    const currentSlottedCompanionIds = teamSlots.map(s => s.companionId).filter(Boolean) as string[];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-1.5 sm:p-4 animate-in fade-in zoom-in-95">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            <div className="bg-slate-900 border border-indigo-500/80 w-full max-w-5xl h-[94vh] sm:h-[88vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
                
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="p-2 bg-indigo-950/60 border border-indigo-500/40 rounded-xl shrink-0">
                            <Truck size={22} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-white font-cinzel truncate">
                                    파견 및 원정 사령부 <span className="text-[11px] bg-indigo-900/80 text-indigo-200 border border-indigo-600/40 px-2 py-0.5 rounded ml-1">Lv.{facilityLevel}</span>
                                </h2>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                                세계 각지로 일반 정찰 파견 및 최대 6인 원정대를 출진시킵니다.
                            </p>
                        </div>
                        {onFacilityUpgrade && facilityLevel < 5 && (
                            <button 
                                onClick={() => onFacilityUpgrade('dispatch', instanceId)}
                                className="hidden sm:flex px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold items-center transition-all shadow-lg shrink-0"
                            >
                                <ArrowUpCircle size={14} className="mr-1"/> 레벨업
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors shrink-0">
                        <X size={24}/>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/60 shrink-0 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('new')} 
                        className={`flex-1 min-w-[110px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${
                            activeTab === 'new' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/90' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Send size={15} className="mr-1.5"/> 일반 정찰 파견
                    </button>
                    <button 
                        onClick={() => setActiveTab('expedition')} 
                        className={`flex-1 min-w-[130px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${
                            activeTab === 'expedition' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-900/90' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Compass size={15} className="mr-1.5 text-amber-400"/> 원정대 파견 (최대 6인)
                    </button>
                    <button 
                        onClick={() => setActiveTab('scout')} 
                        className={`flex-1 min-w-[120px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${
                            activeTab === 'scout' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/90' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <UserPlus size={15} className="mr-1.5 text-cyan-400"/> 인재 스카우트
                    </button>
                    <button 
                        onClick={() => setActiveTab('status')} 
                        className={`flex-1 min-w-[120px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${
                            activeTab === 'status' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-900/90' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Clock size={15} className="mr-1.5"/> 파견 현황 ({currentDispatchCount}/{maxDispatch})
                        {hasUrgentAlarms && <span className="ml-1.5 bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">{character.base?.urgentAlarms!.length}</span>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 bg-slate-900 custom-scrollbar">
                    
                    {/* TAB 1: NEW NORMAL DISPATCH */}
                    {activeTab === 'new' && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Companion Selector */}
                                <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col h-72">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase mb-2 flex items-center justify-between">
                                        <span className="flex items-center"><Users size={16} className="mr-1.5 text-indigo-400"/> 파견 대원 선택</span>
                                        <span className="text-[11px] text-slate-500 font-normal">대기 대원 전용</span>
                                    </h3>
                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                                        {getAvailableCompanions().map(comp => (
                                            <button 
                                                key={comp.id}
                                                onClick={() => setSelectedCompanionId(comp.id)}
                                                className={`w-full p-2.5 rounded-lg border flex justify-between items-center transition-all ${
                                                    selectedCompanionId === comp.id ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="text-left flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                                        <User size={16} className="text-slate-400"/>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs sm:text-sm text-slate-200 truncate">{comp.name}</div>
                                                        <div className="text-[11px] text-slate-400">Lv.{comp.level} · {comp.classType || comp.job}</div>
                                                    </div>
                                                </div>
                                                {selectedCompanionId === comp.id ? <CheckCircle size={16} className="text-indigo-400 shrink-0"/> : null}
                                            </button>
                                        ))}
                                        {getAvailableCompanions().length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                                                <Users size={32} className="mb-2 opacity-30"/>
                                                <p>파견 가능한 대기 동료가 없습니다.</p>
                                                <p className="text-[10px] text-slate-600 mt-0.5">(기지 시설 작업 중인 동료는 제외됩니다)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Destination & Duration */}
                                <div className="space-y-4">
                                    <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase mb-2 flex items-center">
                                            <MapPin size={16} className="mr-1.5 text-indigo-400"/> 목적지 설정
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <select className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
                                                {Object.keys(WORLD_GEOGRAPHY).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <select className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={selectedNation} onChange={e => setSelectedNation(e.target.value)}>
                                                {Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {}).map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                                            {(WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation]?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase flex items-center">
                                                <Calendar size={16} className="mr-1.5 text-indigo-400"/> 파견 기간
                                            </h3>
                                            <span className="text-sm font-bold text-indigo-400 font-mono">
                                                {duration}개월 (보상 x{getDurationRewardMultiplier(duration).mult})
                                            </span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="24" 
                                            value={duration} 
                                            onChange={e => setDuration(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                            <span>1개월 (x1.0)</span>
                                            <span>6개월 (x3.5)</span>
                                            <span>12개월 (x7.0)</span>
                                            <span>24개월 (x12.0)</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5 mt-2">
                                            {[1, 3, 6, 12, 24].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setDuration(m)}
                                                    className={`py-1 rounded text-[11px] font-bold border transition-all ${
                                                        duration === m
                                                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-md'
                                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                                    }`}
                                                >
                                                    {m}개월
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary & Dispatch Action */}
                            {selectedCompanionId && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    {(() => {
                                        const comp = character.inactiveCompanions?.find(c => c.id === selectedCompanionId);
                                        if (!comp) return null;
                                        const dest: Location = { region: selectedRegion, nation: selectedNation, city: selectedCity };
                                        const success = getSuccessRate(comp, dest, duration);
                                        const cost = getDispatchCost();
                                        const hasFood = (character.base?.resources.food || 0) >= cost.food;
                                        const hasGold = character.money >= cost.gold;

                                        return (
                                            <>
                                                <div className="space-y-1 text-center sm:text-left">
                                                    <div className="text-xs text-slate-400">
                                                        파견 대원: <span className="font-bold text-white">{comp.name}</span> (Lv.{comp.level}) → <span className="text-indigo-300">{selectedNation} {selectedCity}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                                                        <span className="text-emerald-400 font-bold">예상 성공률: {success.total}%</span>
                                                        <span className="text-slate-500">|</span>
                                                        <span className={hasFood ? 'text-amber-400' : 'text-red-400 font-bold'}>소모 식량: {cost.food} (보유: {character.base?.resources.food || 0})</span>
                                                        <span className="text-slate-500">|</span>
                                                        <span className={hasGold ? 'text-yellow-400' : 'text-red-400 font-bold'}>소모 골드: {cost.gold.toLocaleString()} G</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleDispatch}
                                                    disabled={!hasFood || !hasGold || currentDispatchCount >= maxDispatch}
                                                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0"
                                                >
                                                    <Send size={16}/> 파견 시작
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: EXPEDITION DISPATCH (UP TO 6 COMPANIONS) */}
                    {activeTab === 'expedition' && (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            
                            {/* Top Grid: Destination & Target Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                                
                                {/* Location Picker (4 cols) */}
                                <div className="md:col-span-4 bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase mb-2 flex items-center">
                                            <MapPin size={15} className="mr-1.5"/> 1. 원정 지역 선택
                                        </h3>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-0.5 block">대륙/권역</label>
                                                <select 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500" 
                                                    value={expRegion} 
                                                    onChange={e => setExpRegion(e.target.value)}
                                                >
                                                    {Object.keys(WORLD_GEOGRAPHY).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-0.5 block">국가</label>
                                                    <select 
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500" 
                                                        value={expNation} 
                                                        onChange={e => setExpNation(e.target.value)}
                                                    >
                                                        {Object.keys(WORLD_GEOGRAPHY[expRegion] || {}).map(n => <option key={n} value={n}>{n}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-0.5 block">도시/거점</label>
                                                    <select 
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500" 
                                                        value={expCity} 
                                                        onChange={e => setExpCity(e.target.value)}
                                                    >
                                                        {(WORLD_GEOGRAPHY[expRegion]?.[expNation]?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration Selector */}
                                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[11px] font-bold text-slate-300 flex items-center">
                                                <Calendar size={13} className="mr-1 text-amber-400"/> 원정 기간
                                            </span>
                                            <span className="text-xs font-bold text-amber-400 font-mono">
                                                {expDurationMonths}개월 ({expeditionMetrics.durationBonusLabel})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {[1, 2, 3, 6, 12].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setExpDurationMonths(m)}
                                                    className={`py-1.5 text-xs rounded-lg font-bold border transition-all ${
                                                        expDurationMonths === m 
                                                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/40' 
                                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                                    }`}
                                                >
                                                    {m}개월
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2 p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-300/90 flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-400 shrink-0"/>
                                            <span>
                                                <strong>원정대 특권:</strong> 기간 비례 보상 극대화(골드·희귀 전리품) + 전원 <strong>무기·스킬 숙련도 대폭 획득</strong>(일반 파견 대비 4배+)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Target Selection: Dungeon vs Hunting Grounds (8 cols) */}
                                <div className="md:col-span-8 bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col">
                                    <div className="flex justify-between items-center mb-2.5">
                                        <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase flex items-center">
                                            <Target size={15} className="mr-1.5"/> 2. 원정 목표 대상 선택
                                        </h3>
                                        {/* Target Type Toggle */}
                                        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                                            <button
                                                onClick={() => setExpTargetType('dungeon')}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                                                    expTargetType === 'dungeon' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <Skull size={13}/> 도시 던전
                                            </button>
                                            <button
                                                onClick={() => setExpTargetType('hunt_zone')}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                                                    expTargetType === 'hunt_zone' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <Flame size={13}/> 사냥터 구역
                                            </button>
                                        </div>
                                    </div>

                                    {/* Target Content: DUNGEON */}
                                    {expTargetType === 'dungeon' && (
                                        <div className="flex-1 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-red-950 border border-red-500/40 text-red-400 text-[10px] font-bold rounded">
                                                            도시 던전
                                                        </span>
                                                        <h4 className="text-sm sm:text-base font-bold text-white font-cinzel">
                                                            {expCity} 던전 : [BOSS] {currentBossData?.name || '지역 수호령'}
                                                        </h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-amber-400 font-mono">
                                                            권장 Lv.{currentBossData?.level || 80}+
                                                        </div>
                                                        <div className="text-[11px] font-bold text-orange-400 font-mono">
                                                            권장 전투력 {expeditionMetrics.targetReqCombatPower.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                                                    {currentBossData?.title} - {currentBossData?.description || `${expNation} ${expCity} 지역의 핵심 던전으로 강력한 보스 몬스터가 도사리고 있습니다.`}
                                                </p>

                                                {/* Boss Special Loot Preview */}
                                                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg">
                                                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                                                        <Sparkles size={13}/> 보스 토벌 시 핵심 보상:
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                                        <span className="px-2 py-0.5 bg-amber-900/40 border border-amber-600/30 rounded text-amber-200">
                                                            {currentBossData?.specialLoot || '보스 고유 유물 & 전리품'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">대량 골드, 마정석, 대원 전원 고농축 EXP</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                                                <span>속성: <strong className="text-indigo-300">{currentBossData?.shinryokuType || '무속성'}</strong></span>
                                                <span>던전 난이도: <strong className="text-red-400">상급 (Boss Raid)</strong></span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Content: HUNTING ZONE */}
                                    {expTargetType === 'hunt_zone' && (
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 mb-2">
                                                {availableHuntBands.map(band => {
                                                    const isSelected = selectedHuntBandId === band.id;
                                                    return (
                                                        <button
                                                            key={band.id}
                                                            onClick={() => setSelectedHuntBandId(band.id)}
                                                            className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                                                                isSelected 
                                                                    ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/50' 
                                                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-white truncate">{band.name}</span>
                                                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950 text-amber-400 font-mono">
                                                                    {band.difficulty}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                Lv.{band.levelRange[0]} ~ {band.levelRange[1]}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Selected Hunt Zone Detail */}
                                            <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                <div>
                                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <Flame size={13} className="text-orange-400"/>
                                                        {expNation} [{selectedHuntBand.name}] (권장 Lv.{selectedHuntBand.levelRange[0]}~{selectedHuntBand.levelRange[1]})
                                                        <span className="text-orange-400 ml-1.5 font-mono font-bold">| 권장 전투력 {expeditionMetrics.targetReqCombatPower.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        주요 출몰: <span className="text-slate-300">{Array.isArray(huntMonsters) ? huntMonsters.slice(0, 4).map(m => typeof m === 'string' ? m : m.name).join(', ') : '지역 마수'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-emerald-400 shrink-0 font-medium">
                                                    {expNation} 특산 전리품 드랍
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 6-MEMBER TEAM FORMATION SECTION */}
                            <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-amber-400"/>
                                        <h3 className="text-xs sm:text-sm font-bold text-white uppercase">
                                            3. 원정대 진형 편성 (최대 6인)
                                        </h3>
                                        <span className="text-[11px] px-2 py-0.5 bg-amber-950 border border-amber-600/40 text-amber-300 rounded font-mono font-bold">
                                            {assignedTeamMembers.length}/6명 배치
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                        <HelpCircle size={12} className="text-amber-400"/>
                                        <span>전술훈련소 숙련도 <strong className="text-amber-300">100 달성</strong> 시에만 역할(탱/딜/서폿) 배치 가능</span>
                                    </div>
                                </div>

                                {/* 6 Slots Grid (Responsive: 2 cols on mobile, 3 cols on sm, 6 cols on lg) */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                                    {teamSlots.map((slot, index) => {
                                        const comp = slot.companionId 
                                            ? character.inactiveCompanions?.find(c => c.id === slot.companionId) 
                                            : null;

                                        const tankerUnlocked = isRoleUnlocked(comp, 'tanker');
                                        const dealerUnlocked = isRoleUnlocked(comp, 'dealer');
                                        const supporterUnlocked = isRoleUnlocked(comp, 'supporter');
                                        const allrounderUnlocked = isRoleUnlocked(comp, 'allrounder');
                                        const secRole = getEffectiveSecondaryBattleRole(comp);

                                        const roleBadge = slot.role === 'tanker' ? (
                                            <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 text-blue-400 border-blue-500/40 bg-blue-950/60">
                                                <Shield size={11} className="text-blue-400" /> 탱커
                                            </span>
                                        ) : slot.role === 'dealer' ? (
                                            <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 text-red-400 border-red-500/40 bg-red-950/60">
                                                <Sword size={11} className="text-red-400" /> 딜러
                                            </span>
                                        ) : slot.role === 'supporter' ? (
                                            <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 text-emerald-400 border-emerald-500/40 bg-emerald-950/60">
                                                <Sparkles size={11} className="text-emerald-400" /> 서포터
                                            </span>
                                        ) : slot.role === 'allrounder' ? (
                                            <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 text-yellow-300 border-yellow-500/50 bg-yellow-950/70">
                                                <Sparkles size={11} className="text-yellow-400" /> 올라운더
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 text-slate-400 border-slate-700 bg-slate-800/60">
                                                <User size={11} className="text-slate-400" /> 역할없음
                                            </span>
                                        );

                                        return (
                                            <div 
                                                key={index}
                                                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all relative ${
                                                    comp 
                                                        ? 'bg-slate-900 border-slate-700 shadow-md' 
                                                        : 'bg-slate-900/40 border-dashed border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                {/* Slot Header: Role Toggle Button */}
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => cycleSlotRole(index)}
                                                        className="hover:scale-105 active:scale-95 transition-all text-left flex items-center gap-0.5"
                                                        title="클릭하여 역할 변경 (전술훈련소 숙련도 100 달성된 역할만 순환)"
                                                    >
                                                        {roleBadge}
                                                        <RefreshCw size={9} className="text-slate-500 hover:text-white ml-0.5"/>
                                                    </button>
                                                    <span className="text-[9px] text-slate-500 font-mono">#{index + 1}</span>
                                                </div>

                                                {/* Slot Body: Companion or Add Button */}
                                                {comp ? (() => {
                                                    const rawCP = calculateCombatPower(comp);
                                                    const aff = getCompanionBossAffinity(comp);
                                                    const adjustedCP = Math.floor(rawCP * aff.multiplier);
                                                    return (
                                                    <div className="flex flex-col items-center text-center my-1">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mb-1 text-slate-300 font-bold text-xs relative">
                                                            {comp.name.substring(0, 2)}
                                                        </div>
                                                        <div className="font-bold text-xs text-white truncate max-w-[100px]">{comp.name}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Lv.{comp.level} · <span className="text-indigo-300">{comp.shinryokuType || '무속성'}</span>
                                                        </div>
                                                        {secRole !== SecondaryBattleRole.NONE && (
                                                            <div className="text-[9px] px-1.5 py-0.2 rounded border font-bold text-indigo-300 border-indigo-600/40 bg-indigo-950/60 truncate max-w-[100px] mt-0.5">
                                                                {secRole}
                                                            </div>
                                                        )}
                                                        <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                                                            aff.status === 'strong' ? 'text-emerald-400' : aff.status === 'weak' ? 'text-rose-400' : 'text-amber-400'
                                                        }`}>
                                                            전투력 {adjustedCP.toLocaleString()}
                                                        </div>
                                                        {aff.status !== 'normal' && (
                                                            <div className={`mt-0.5 text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                                                                aff.status === 'strong'
                                                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                                                    : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                                                            }`}>
                                                                {aff.badgeText}
                                                            </div>
                                                        )}

                                                        {/* Tactical Training Mini Badges */}
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className={`text-[9px] px-1 py-0.2 rounded border ${tankerUnlocked ? 'text-blue-300 border-blue-600 bg-blue-950' : 'text-slate-600 border-slate-800 bg-slate-950 opacity-40'}`} title={`탱커 숙련도: ${getCompanionRoleProficiency(comp, 'tanker')}/100`}>
                                                                🛡️
                                                            </span>
                                                            <span className={`text-[9px] px-1 py-0.2 rounded border ${dealerUnlocked ? 'text-red-300 border-red-600 bg-red-950' : 'text-slate-600 border-slate-800 bg-slate-950 opacity-40'}`} title={`딜러 숙련도: ${getCompanionRoleProficiency(comp, 'dealer')}/100`}>
                                                                ⚔️
                                                            </span>
                                                            <span className={`text-[9px] px-1 py-0.2 rounded border ${supporterUnlocked ? 'text-emerald-300 border-emerald-600 bg-emerald-950' : 'text-slate-600 border-slate-800 bg-slate-950 opacity-40'}`} title={`서포터 숙련도: ${getCompanionRoleProficiency(comp, 'supporter')}/100`}>
                                                                💖
                                                            </span>
                                                            {allrounderUnlocked && (
                                                                <span className="text-[9px] px-1 py-0.2 rounded border text-yellow-300 border-yellow-600 bg-yellow-950" title="올라운더 해금 완료">
                                                                    🌟
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Quick Remove */}
                                                        <button
                                                            onClick={() => removeCompanionFromSlot(index)}
                                                            className="mt-2 w-full py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <Trash2 size={10}/> 해제
                                                        </button>
                                                    </div>
                                                    );
                                                })() : (
                                                    <button
                                                        onClick={() => setActiveSlotPickerIndex(index)}
                                                        className="h-24 w-full flex flex-col items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-slate-800/40 rounded-lg transition-all"
                                                    >
                                                        <Plus size={20} className="mb-1 opacity-70"/>
                                                        <span className="text-[10px] font-bold">대원 배치</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Companion Picker Modal Overlay when Slot is clicked (Mobile Optimized) */}
                            {activeSlotPickerIndex !== null && (
                                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
                                    <div className="bg-slate-900 border border-amber-500/80 w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                                        <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                                            <div>
                                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                                    <Users size={16} className="text-amber-400"/> #{activeSlotPickerIndex + 1}번 슬롯 대원 선택
                                                </h4>
                                                <p className="text-[11px] text-slate-400 mt-0.5">전술훈련소 숙련도 100 달성 역할로 자동 편성됩니다.</p>
                                            </div>
                                            <button onClick={() => setActiveSlotPickerIndex(null)} className="text-slate-400 hover:text-white p-1">
                                                <X size={18}/>
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                            {getAvailableCompanions(currentSlottedCompanionIds).map(comp => {
                                                const tankerProf = getCompanionRoleProficiency(comp, 'tanker');
                                                const dealerProf = getCompanionRoleProficiency(comp, 'dealer');
                                                const supporterProf = getCompanionRoleProficiency(comp, 'supporter');
                                                const hasMasteredRole = tankerProf >= 100 || dealerProf >= 100 || supporterProf >= 100;
                                                const rawCP = calculateCombatPower(comp);
                                                const aff = getCompanionBossAffinity(comp);
                                                const adjustedCP = Math.floor(rawCP * aff.multiplier);

                                                return (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => assignCompanionToSlot(activeSlotPickerIndex, comp.id)}
                                                        className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-amber-500 hover:bg-amber-950/20 text-left flex justify-between items-center transition-all group"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                                                                {comp.name.substring(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 truncate">{comp.name}</span>
                                                                    <span className="text-[10px] text-slate-400 font-mono">Lv.{comp.level}</span>
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/70 border border-indigo-700/40 text-indigo-300 font-bold">
                                                                        {comp.shinryokuType || '무속성'}
                                                                    </span>
                                                                    <span className={`text-[10px] font-mono font-bold ${
                                                                        aff.status === 'strong' ? 'text-emerald-400' : aff.status === 'weak' ? 'text-rose-400' : 'text-amber-400'
                                                                    }`}>
                                                                        전투력 {adjustedCP.toLocaleString()}
                                                                        {aff.status !== 'normal' && (
                                                                            <span className="ml-1 text-[9px] opacity-80">
                                                                                (기본 {rawCP.toLocaleString()})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {aff.status !== 'normal' && (
                                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                                                                            aff.status === 'strong'
                                                                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                                                                : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                                                                        }`}>
                                                                            {aff.badgeText}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Proficiency Badges */}
                                                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${tankerProf >= 100 ? 'text-blue-300 border-blue-600 bg-blue-950/80 font-bold' : 'text-slate-500 border-slate-800 bg-slate-900/60'}`}>
                                                                        탱커 {tankerProf}/100
                                                                    </span>
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${dealerProf >= 100 ? 'text-red-300 border-red-600 bg-red-950/80 font-bold' : 'text-slate-500 border-slate-800 bg-slate-900/60'}`}>
                                                                        딜러 {dealerProf}/100
                                                                    </span>
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${supporterProf >= 100 ? 'text-emerald-300 border-emerald-600 bg-emerald-950/80 font-bold' : 'text-slate-500 border-slate-800 bg-slate-900/60'}`}>
                                                                        서폿 {supporterProf}/100
                                                                    </span>
                                                                    {!hasMasteredRole && (
                                                                        <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                                                                            미특화
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-amber-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                                                            선택 &rarr;
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            {getAvailableCompanions(currentSlottedCompanionIds).length === 0 && (
                                                <div className="p-8 text-center text-slate-500 text-xs">
                                                    배치 가능한 대기 동료가 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Expedition Metrics & Dispatch Button */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 flex flex-col lg:flex-row justify-between items-center gap-4">
                                <div className="space-y-1.5 w-full lg:w-auto text-center lg:text-left">
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs">
                                        <span className="font-bold text-white">
                                            목표: <span className="text-amber-300">{expTargetType === 'dungeon' ? `${expCity} 던전 (${currentBossData?.name})` : `${expNation} [${selectedHuntBand.name}]`}</span>
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-slate-300">
                                            권장 전투력: <strong className="text-orange-400 font-mono">{expeditionMetrics.targetReqCombatPower.toLocaleString()}</strong>
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-slate-300">
                                            원정대 전투력: <strong className={`font-mono ${expeditionMetrics.teamTotalCombatPower >= expeditionMetrics.targetReqCombatPower ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}`}>{expeditionMetrics.teamTotalCombatPower.toLocaleString()}</strong> ({expeditionMetrics.cpPercent}%)
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs">
                                        <span className="text-slate-300">
                                            편성: 탱커 {expeditionMetrics.tankerCount}명 / 딜러 {expeditionMetrics.dealerCount}명 / 서폿 {expeditionMetrics.supporterCount}명 {expeditionMetrics.noneCount > 0 && `/ 미특화 ${expeditionMetrics.noneCount}명`}
                                        </span>
                                        {expeditionMetrics.isBalanced && (
                                            <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-bold">
                                                삼각 편대 시너지 (+15%)
                                            </span>
                                        )}
                                        {expeditionMetrics.isFullTeam && (
                                            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                                                6인 완전체 (+15%)
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs">
                                        <span className={`font-bold ${expeditionMetrics.totalSuccessRate >= 70 ? 'text-emerald-400' : expeditionMetrics.totalSuccessRate > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                            예상 성공률: {expeditionMetrics.totalSuccessRate}%
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-amber-300 font-bold">
                                            보상/숙련도: x{expeditionMetrics.durationRewardMult}
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className={(character.base?.resources.food || 0) >= expeditionMetrics.totalCostFood ? 'text-amber-400' : 'text-red-400 font-bold'}>
                                            소모 식량: {expeditionMetrics.totalCostFood} (보유: {character.base?.resources.food || 0})
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className={character.money >= expeditionMetrics.totalCostGold ? 'text-yellow-400' : 'text-red-400 font-bold'}>
                                            소모 골드: {expeditionMetrics.totalCostGold.toLocaleString()} G
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-indigo-400">드랍률 보너스: +{expeditionMetrics.lootBonusPercent}%</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleExpeditionDispatch}
                                    disabled={
                                        assignedTeamMembers.length === 0 || 
                                        (character.base?.resources.food || 0) < expeditionMetrics.totalCostFood || 
                                        character.money < expeditionMetrics.totalCostGold || 
                                        currentDispatchCount >= maxDispatch
                                    }
                                    className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0 active:scale-95"
                                >
                                    <Compass size={18}/> 원정대 출진 ({assignedTeamMembers.length}인)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SCOUT DISPATCH (인재 스카우트) */}
                    {activeTab === 'scout' && (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-cyan-500/30">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <UserPlus size={18} className="text-cyan-400" />
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-white uppercase">인재 스카우트 파견</h3>
                                            <p className="text-[11px] text-slate-400">
                                                동료를 원하는 지역으로 파견하여 맞춤형 인재(농부, 연금술사, 대장장이, 광부 등)를 영입합니다.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                                        <span className="text-slate-400">시설 레벨:</span>
                                        <strong className="text-cyan-400 font-bold">Lv.{facilityLevel}</strong>
                                        <span className="text-[10px] text-slate-500">(성공률 +{facilityLevel * 5}%)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                    {/* 파견 대원 선택 (5열) */}
                                    <div className="lg:col-span-5 bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col h-[320px]">
                                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center justify-between shrink-0">
                                            <span className="flex items-center"><Users size={15} className="mr-1.5 text-cyan-400"/> 파견 대원 선택</span>
                                            <span className="text-[10px] text-slate-500">스탯 반영</span>
                                        </h4>
                                        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                                            {getAvailableCompanions().length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                                                    <Users size={24} className="mb-2 opacity-50"/>
                                                    파견 가능한 대기 대원이 없습니다.
                                                </div>
                                            ) : (
                                                getAvailableCompanions().map(comp => (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => setScoutCompanionId(comp.id)}
                                                        className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                                                            scoutCompanionId === comp.id 
                                                                ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/50' 
                                                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs shrink-0">
                                                                    Lv.{comp.level}
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                                        {comp.name}
                                                                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                                                            {comp.job || '용병'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                                        <span>지혜:{comp.stats.wis || 10}</span>
                                                                        <span>지능:{comp.stats.int || 10}</span>
                                                                        <span>힘:{comp.stats.str || 10}</span>
                                                                        <span>제어력:{comp.stats.ctrl || 10}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {scoutCompanionId === comp.id && (
                                                                <Check size={16} className="text-cyan-400 shrink-0" />
                                                            )}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* 영입 목표 직종 선택 (7열) */}
                                    <div className="lg:col-span-7 bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col h-[320px]">
                                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center justify-between shrink-0">
                                            <span className="flex items-center"><Target size={15} className="mr-1.5 text-cyan-400"/> 영입 목표 직종</span>
                                            <span className="text-[10px] text-amber-400">* 특수/제너럴/왕실 직종 제외</span>
                                        </h4>
                                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto custom-scrollbar pr-1">
                                            {SCOUTABLE_JOBS.map(item => (
                                                <button
                                                    key={item.job}
                                                    onClick={() => setScoutTargetJob(item.job)}
                                                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                                        scoutTargetJob === item.job
                                                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50 shadow-md'
                                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-lg">{item.icon}</span>
                                                        <span className={`text-xs font-bold ${scoutTargetJob === item.job ? 'text-cyan-300' : 'text-slate-300'}`}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                                                        {item.desc}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 하단 설정 및 출진 */}
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                                    {/* 지역 선택 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300 flex items-center">
                                            <MapPin size={14} className="mr-1 text-cyan-400"/> 스카우트 파견 지역
                                        </label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <select
                                                value={scoutRegion}
                                                onChange={(e) => setScoutRegion(e.target.value)}
                                                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                                            >
                                                {Object.keys(WORLD_GEOGRAPHY).filter(reg => reg !== '신계' && reg !== '마계').map(reg => (
                                                    <option key={reg} value={reg}>{reg}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={scoutNation}
                                                onChange={(e) => setScoutNation(e.target.value)}
                                                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                                            >
                                                {Object.keys(WORLD_GEOGRAPHY[scoutRegion] || {}).map(nat => (
                                                    <option key={nat} value={nat}>{nat}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={scoutCity}
                                                onChange={(e) => setScoutCity(e.target.value)}
                                                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                                            >
                                                {(WORLD_GEOGRAPHY[scoutRegion]?.[scoutNation]?.cities || []).map(cit => (
                                                    <option key={cit} value={cit}>{cit}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 파견 기간 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                            <span className="flex items-center"><Calendar size={14} className="mr-1 text-cyan-400"/> 파견 기간</span>
                                            <span className="text-[11px] text-cyan-400 font-bold">
                                                {scoutDuration}개월 ({getDurationRewardMultiplier(scoutDuration).bonusLabel})
                                            </span>
                                        </label>
                                        <div className="flex gap-1.5">
                                            {[1, 2, 3, 6, 12].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setScoutDuration(m)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                        scoutDuration === m 
                                                            ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200' 
                                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    {m}개월
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-cyan-400/80">
                                            💡 장기 파견일수록 최고 등급 및 고레벨/고스탯 인재 영입 확률과 파견원 획득 숙련도가 극대화됩니다.
                                        </p>
                                    </div>

                                    {/* 성공 예측 및 출진 버튼 */}
                                    <div className="space-y-2 flex flex-col justify-between">
                                        <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                            <span className="text-xs text-slate-400 flex items-center">
                                                <Sparkles size={13} className="mr-1 text-amber-400"/> 예상 영입 성공률
                                            </span>
                                            <strong className="text-sm text-emerald-400 font-bold">
                                                {getScoutSuccessRate()}%
                                            </strong>
                                        </div>
                                        <button
                                            onClick={handleScoutDispatch}
                                            disabled={!scoutCompanionId || currentDispatchCount >= maxDispatch}
                                            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                                                !scoutCompanionId || currentDispatchCount >= maxDispatch
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 shadow-cyan-950/50'
                                            }`}
                                        >
                                            <Send size={14} />
                                            <span>스카우트 파견 출진 ({(1000 * scoutDuration).toLocaleString()}G / 식량 {50 * scoutDuration})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DISPATCH STATUS & MISSIONS */}
                    {activeTab === 'status' && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {dispatchMissions.length === 0 ? (
                                <div className="text-center py-16 text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                                    <Truck size={48} className="mx-auto mb-3 opacity-30"/>
                                    <p className="text-sm font-bold text-slate-400">현재 진행 중인 파견 또는 원정 미션이 없습니다.</p>
                                    <p className="text-xs text-slate-600 mt-1">일반 정찰 파견 또는 원정대 탭에서 대원들을 출진시켜보세요.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                     {dispatchMissions.map(mission => {
                                        const sysInfo = getDispatchSystemInfo(mission);
                                        const isExpedition = mission.missionType === 'Expedition';
                                        const isScout = mission.missionType === 'ScoutDispatch';
                                        const leaderComp = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === mission.companionId);
                                        const teamMembers = mission.teamMembers || [];
                                        const isCompleted = character.currentDate ? (character.currentDate >= mission.expectedReturnDate) : false;
                                        const isUrgent = mission.status === 'Difficult' || mission.status === 'Critical';
                                        const hasSupportCompanion = Boolean(mission.supportCompanionId);

                                        return (
                                            <div 
                                                key={mission.id}
                                                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                                                    isUrgent 
                                                        ? 'bg-red-950/30 border-red-500 shadow-lg shadow-red-950/30' 
                                                        : sysInfo.isExternal
                                                            ? 'bg-slate-950/90 border-indigo-500/40'
                                                            : isScout
                                                                ? 'bg-slate-950/90 border-cyan-500/40'
                                                                : isExpedition 
                                                                    ? 'bg-slate-950/90 border-amber-500/40' 
                                                                    : 'bg-slate-950/80 border-slate-800'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <div className="space-y-1.5 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                sysInfo.isExternal
                                                                    ? sysInfo.badgeBg
                                                                    : isScout
                                                                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/40'
                                                                        : isExpedition 
                                                                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/40' 
                                                                            : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/40'
                                                            }`}>
                                                                {sysInfo.badgeText}
                                                            </span>
                                                            <h4 className="font-bold text-sm text-white truncate">
                                                                {isScout 
                                                                    ? `[인재 탐색] ${mission.scoutTargetJob || '인재'} 영입 - ${mission.scoutTargetNation || mission.destination.nation} ${mission.scoutTargetCity || mission.destination.city}`
                                                                    : (mission.expeditionTargetName || `${mission.destination.nation} ${mission.destination.city}`)
                                                                }
                                                            </h4>
                                                            {isUrgent && (
                                                                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-bold rounded animate-pulse">
                                                                    위기 발생
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 외부 파견 시스템 소속 안내 서브 텍스트 */}
                                                        {sysInfo.isExternal && (
                                                            <div className="text-[11px] text-amber-300/90 flex items-center gap-1 font-semibold">
                                                                <ExternalLink size={12} className="text-amber-400 shrink-0"/>
                                                                <span>출처: {sysInfo.systemName}</span>
                                                            </div>
                                                        )}

                                                        {/* Team Members / Companion Info */}
                                                        {isExpedition && teamMembers.length > 0 ? (
                                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 pt-0.5">
                                                                {teamMembers.map((tm, idx) => {
                                                                    const c = character.inactiveCompanions?.find(comp => comp.id === tm.companionId);
                                                                    return (
                                                                        <span key={idx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200">
                                                                            {c?.name || '대원'} <strong className="text-[10px] text-amber-400">({tm.role === 'tanker' ? '탱' : tm.role === 'dealer' ? '딜' : tm.role === 'supporter' ? '서폿' : '미특화'})</strong>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-300">
                                                                담당 대원: <strong>{leaderComp?.name || (mission as any).commanderName || '동료'}</strong> {leaderComp ? `(Lv.${leaderComp.level})` : ''}
                                                            </div>
                                                        )}

                                                        {/* Emergency Support Companion Status Display */}
                                                        {hasSupportCompanion && (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 border border-indigo-500/60 rounded-lg text-indigo-300 text-xs font-semibold">
                                                                <ShieldAlert size={13} className="text-indigo-400"/>
                                                                <span>긴급지원 급파: <strong>{mission.supportCompanionName || '지원 대원'}</strong> (Lv.{mission.supportCompanionLevel || 1})</span>
                                                                {mission.supportDate && <span className="text-[10px] text-indigo-400 font-mono">[{mission.supportDate}]</span>}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                                                            <span>출발일: {mission.startTime}</span>
                                                            <span>|</span>
                                                            <span>복귀 예정: <strong className="text-slate-200">{mission.expectedReturnDate}</strong></span>
                                                            <span>|</span>
                                                            <span>성공률: <strong className="text-emerald-400">{mission.successRate}%</strong></span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                                        {sysInfo.isExternal ? (
                                                            <>
                                                                {isUrgent && !isCompleted && !hasSupportCompanion && (
                                                                    <button
                                                                        onClick={() => setSupportingMission(mission)}
                                                                        className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-lg transition-all flex items-center gap-1.5 animate-pulse shrink-0 active:scale-95"
                                                                    >
                                                                        <AlertTriangle size={14}/> 긴급 지원
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        if (onOpenExternalModal) {
                                                                            onOpenExternalModal(sysInfo.systemType);
                                                                        }
                                                                        setSelectedExternalNotice({ mission, systemInfo: sysInfo });
                                                                    }}
                                                                    className={`px-3.5 py-2 font-bold rounded-lg text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
                                                                        isCompleted 
                                                                            ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
                                                                            : 'bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/50'
                                                                    }`}
                                                                >
                                                                    <ExternalLink size={14}/>
                                                                    {isCompleted ? `${sysInfo.badgeText} 보상 수령 (이동)` : `${sysInfo.badgeText} 현황 이동`}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRecall(mission)}
                                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] transition-all"
                                                                >
                                                                    중도 복귀
                                                                </button>
                                                            </>
                                                        ) : isCompleted ? (
                                                            <button
                                                                onClick={() => handleComplete(mission)}
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg transition-all flex items-center gap-1.5 animate-bounce"
                                                            >
                                                                <CheckCircle size={14}/> 보상 수령
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {isUrgent && (
                                                                    <button
                                                                        onClick={() => setSupportingMission(mission)}
                                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow transition-all flex items-center gap-1"
                                                                    >
                                                                        <AlertTriangle size={13}/> 긴급 지원
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRecall(mission)}
                                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all"
                                                                >
                                                                    중도 복귀
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                             {/* Emergency Support Modal (Mobile Optimized) */}
                            {supportingMission && (
                                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
                                    <div className="bg-slate-900 border border-red-500 w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                                                <AlertTriangle size={16}/> 긴급 지원 작전
                                            </h3>
                                            <button onClick={() => setSupportingMission(null)} className="text-slate-400 hover:text-white">
                                                <X size={18}/>
                                            </button>
                                        </div>

                                        <p className="text-xs text-slate-300">
                                            파견/원정 대원이 예기치 못한 위기에 봉착했습니다. 지원 방식을 선택해주세요:
                                        </p>

                                        <div className="space-y-2.5">
                                            <button
                                                onClick={() => handleSupport(supportingMission, 'resource')}
                                                className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-left flex justify-between items-center transition-all"
                                            >
                                                <div>
                                                    <div className="font-bold text-xs text-white">물자 긴급 공수</div>
                                                    <div className="text-[10px] text-slate-400">비용: 5,000G / 식량 20 (성공률 +10%)</div>
                                                </div>
                                                <Coins size={18} className="text-yellow-400"/>
                                            </button>

                                            <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl space-y-2">
                                                <div className="font-bold text-xs text-white">구원 대원 급파 (대기 동료 지원)</div>
                                                <select 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                                                    value={selectedSupportCompanionId || ''}
                                                    onChange={e => setSelectedSupportCompanionId(e.target.value)}
                                                >
                                                    <option value="">지원 대원 선택...</option>
                                                    {getAvailableCompanions().map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} (Lv.{c.level})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => selectedSupportCompanionId && handleSupport(supportingMission, 'personnel', selectedSupportCompanionId)}
                                                    disabled={!selectedSupportCompanionId}
                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg text-xs transition-all"
                                                >
                                                    구원 대원 출동
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* External Mission Guidance Modal (Mobile Optimized) */}
                            {selectedExternalNotice && (
                                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
                                    <div className="bg-slate-900 border border-indigo-500/80 w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                            <h3 className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                                                <ExternalLink size={16} className="text-indigo-400"/>
                                                {selectedExternalNotice.systemInfo.guidanceTitle}
                                            </h3>
                                            <button 
                                                onClick={() => setSelectedExternalNotice(null)} 
                                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                                            >
                                                <X size={18}/>
                                            </button>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-1.5">
                                                <div className="font-bold text-white text-xs flex flex-wrap items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedExternalNotice.systemInfo.badgeBg}`}>
                                                        {selectedExternalNotice.systemInfo.badgeText}
                                                    </span>
                                                    <span>{selectedExternalNotice.systemInfo.systemName}</span>
                                                </div>
                                                <p className="text-slate-300 leading-relaxed text-xs pt-1">
                                                    {selectedExternalNotice.systemInfo.guidanceMsg}
                                                </p>
                                            </div>

                                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                                                <div className="text-slate-400 text-[11px] font-bold">📍 수령 위치 및 경로</div>
                                                <div className="text-amber-300 text-xs font-semibold">{selectedExternalNotice.systemInfo.guidanceLocation}</div>
                                            </div>

                                            {/* 위기 발생 시 파견소 지원 버튼 */}
                                            {(selectedExternalNotice.mission.status === 'Difficult' || selectedExternalNotice.mission.status === 'Critical') &&
                                             !Boolean(selectedExternalNotice.mission.supportCompanionId) && (
                                                <div className="p-2.5 bg-red-950/40 border border-red-500/50 rounded-xl space-y-2">
                                                    <div className="text-red-300 text-[11px] font-bold flex items-center gap-1">
                                                        <AlertTriangle size={13} className="text-red-400"/>
                                                        <span>현재 위기 발생 임무! 파견소에서 긴급 지원 지원 가능</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const m = selectedExternalNotice.mission;
                                                            setSelectedExternalNotice(null);
                                                            setSupportingMission(m);
                                                        }}
                                                        className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 animate-pulse"
                                                    >
                                                        <AlertTriangle size={14}/> 긴급 지원 대원/물자 투입
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                            {onOpenExternalModal && (
                                                <button
                                                    onClick={() => {
                                                        const sysType = selectedExternalNotice.systemInfo.systemType;
                                                        setSelectedExternalNotice(null);
                                                        onOpenExternalModal(sysType);
                                                    }}
                                                    className="w-full sm:flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
                                                >
                                                    <ExternalLink size={14}/> 해당 파견 메뉴로 연결
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedExternalNotice(null)}
                                                className="w-full sm:flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95"
                                            >
                                                확인 및 닫기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DispatchModal;
