import React, { useState, useMemo, useEffect } from 'react';
import { Character, Companion, HouseBuilding, HouseType, HousekeeperRank, HOUSEKEEPER_RANK_CONFIG, JobType, ChefRank, CHEF_RANK_CONFIG } from '../types';
import { advanceGameTime } from '../services/gameTimeService';
import { 
    X, Home, Plus, Users, Sparkles, Zap, Heart, 
    Search, LayoutGrid, List, Edit2, Check, 
    UserPlus, Building, Award, Crown, Info, RefreshCw, ArrowUpCircle,
    Wrench, ShieldCheck, Flame, AlertTriangle, Utensils, Hammer, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateTotalHousingCapacity, calculateMaxHousingCount, HOUSE_TYPE_CONFIG, getCompanionChefRank, canChefManageHouse, calculateDailyFoodConsumption, getHousekeeperRankByLevel, calculateFinalStats, HOUSEKEEPER_PROMOTION_WIS_REQ } from '../utils';
import { 
    getHouseConstructionDuration, 
    calculateCompletionDateTime, 
    getConstructionRemainingTime, 
    getConstructionProgress 
} from '../services/baseConstructionService';

interface HousingModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg?: string, dailyReport?: any) => void;
    onInteractClick: (companion: Companion) => void;
    onHousingRest: () => void;
    setIsMyHomeOpen: (open: boolean) => void;
    setIsPartyModalOpen: (open: boolean) => void;
    setPartySelection: (selection: number[]) => void;
}

export const HousingModal: React.FC<HousingModalProps> = ({
    isOpen,
    onClose,
    character,
    onUpdateCharacter,
    onInteractClick,
    onHousingRest,
    setIsMyHomeOpen,
    setIsPartyModalOpen,
    setPartySelection,
}) => {
    // 탭: 'houses' (주택 관리), 'residents' (거주자 목록), 'housekeepers' (하우스키퍼 관리)
    const [activeTab, setActiveTab] = useState<'houses' | 'residents' | 'housekeepers'>('houses');
    
    // 리스트 뷰 모드: 'grid' | 'list'
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // 필터 및 검색
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned' | 'party' | 'lover' | 'working'>('all');
    const [houseFilter, setHouseFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'level' | 'name' | 'hp' | 'house'>('level');
    
    // 집 이름 변경 중인 ID 및 임시 이름
    const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
    const [editingHouseName, setEditingHouseName] = useState('');

    // 특정 집에 거주자 배치 모달용 선택된 집 ID 및 필터
    const [selectedHouseForAssign, setSelectedHouseForAssign] = useState<string | null>(null);
    const [assignSearchQuery, setAssignSearchQuery] = useState('');
    const [assignFilter, setAssignFilter] = useState<'all' | 'unassigned' | 'thisHouse'>('all');
    
    // 신축 모달 열림 여부 및 선택된 주택 타입 (나의 집 제외)
    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [selectedHouseTypeToBuild, setSelectedHouseTypeToBuild] = useState<HouseType>(HouseType.HOUSE_1F);

    // 일괄 선택용 companion ID 배열
    const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);

    // 증축 확인 모달을 위한 선택된 집 ID
    const [upgradingHouseId, setUpgradingHouseId] = useState<string | null>(null);

    // 하우스키퍼별 청소 선택 대상 주택 ID 매핑
    const [selectedCleanHouses, setSelectedCleanHouses] = useState<Record<string, string>>({});

    // 보너스 지급 선택 타겟 ID
    const [bonusTargetId, setBonusTargetId] = useState<string | null>(null);

    const base = character.base;

    // [요구사항 3] 대기 동료뿐만 아니라 현재 파티 동료(ActiveCompanion)도 거주 명단에 포함
    const allCompanions = useMemo(() => {
        return [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    }, [character.companions, character.inactiveCompanions]);

    // [기지 주택 자동 초기화 / 소급 마이그레이션]
    useEffect(() => {
        if (!isOpen || !base) return;
        
        // base.houses 가 없거나 비어있을 경우 기본 세팅 생성
        if (!base.houses || base.houses.length === 0) {
            const initialHouses: HouseBuilding[] = [];
            
            // 1. 나의 집 기본 1채 (초기 4인 거주)
            initialHouses.push({
                id: 'my_home_default',
                type: HouseType.MY_HOME,
                name: '나의 집',
                capacity: 4,
                level: 1,
                cleanliness: 100,
                createdAt: character.currentDate
            });

            // 2. 기존 layout 상의 housing 시설 수만큼 1층 주택 추가
            const housingLayouts = base.layout?.filter(inst => inst.type === 'housing') || [];
            housingLayouts.forEach((inst, idx) => {
                initialHouses.push({
                    id: inst.id || `house_legacy_${idx}`,
                    type: HouseType.HOUSE_1F,
                    name: `1층 주택 ${idx + 1}호`,
                    capacity: 2,
                    level: inst.level || 1,
                    cleanliness: 100,
                    createdAt: character.currentDate
                });
            });

            onUpdateCharacter({
                ...character,
                base: {
                    ...character.base!,
                    houses: initialHouses
                }
            }, "");
        }
    }, [isOpen, base, onUpdateCharacter, character]);

    if (!isOpen) return null;

    const houseAssignments = base?.houseAssignments || {};
    const houseCustomNames = base?.houseCustomNames || {};
    const houses = base?.houses || [];

    // 최대 건설 가능 주택 수 계산 (숙소 레벨*5*개수 + 하우스키퍼 계수)
    const { maxCount, housingLv, housingCount, housekeeperCoef, housekeeperName, housekeeperRank } = calculateMaxHousingCount(base, allCompanions);

    // 총 거주 정원
    const totalCapacity = calculateTotalHousingCapacity(base, allCompanions);

    // 각 집별 거주 동료 목록
    const getResidentsOfHouse = (houseId: string) => {
        return allCompanions.filter(c => houseAssignments[c.id] === houseId);
    };

    // 개별 주택의 하우스키퍼 보너스를 포함한 실질 최대 수용 정원 계산
    const getHouseEffectiveCapacity = (house: HouseBuilding) => {
        if (house.underConstruction && (!house.level || house.level === 0)) {
            return 0;
        }
        const assignedHK = house.assignedHousekeeperId ? allCompanions.find(c => c.id === house.assignedHousekeeperId) : undefined;
        const hkRankCfg = assignedHK && (assignedHK.job === JobType.HOUSEKEEPER || (assignedHK.job as string) === '하우스 키퍼' || (assignedHK.job as string) === '하우스키퍼' || assignedHK.job === JobType.SLAVE || (assignedHK.job as string) === '노예') ? HOUSEKEEPER_RANK_CONFIG[assignedHK.housekeeperRank || HousekeeperRank.BEGINNER] : undefined;
        const hkCapacityBonus = hkRankCfg ? hkRankCfg.coef : 0;
        return house.capacity + hkCapacityBonus;
    };

    // 미배치 동료 목록 (거주 공간 없음)
    const unassignedResidents = allCompanions.filter(c => !houseAssignments[c.id] || !houses.some(h => h.id === houseAssignments[c.id]));

    // 파티원 Set
    const partyIdSet = new Set(character.companions.map(c => c.id));

    // 집 이름 구하기
    const getHouseDisplayName = (house: HouseBuilding) => {
        if (houseCustomNames[house.id]) return houseCustomNames[house.id];
        return house.name;
    };

    // 캐릭터 비주얼/썸네일 URL 가져오기
    const getCompanionAvatar = (comp: Companion) => {
        return comp.visualUrl || comp.appearance || comp.defaultVisualUrl || '';
    };

    // 업무 중 여부
    const isCompanionBusy = (comp: Companion) => {
        if (!base?.assignments) return false;
        return Object.values(base.assignments).includes(comp.id);
    };

    // [기능 1] 주택 신축 실행 (나의 집 제외)
    const handleConfirmBuildHouse = () => {
        if (!base) return;

        if (houses.length >= maxCount) {
            alert(`주택 건설 한도에 도달했습니다! (${houses.length}/${maxCount}채)\n숙소 레벨을 올리거나 담당 하우스키퍼를 배치하여 한도를 늘려주세요.`);
            return;
        }

        if (selectedHouseTypeToBuild === HouseType.MY_HOME) {
            alert("나의 집은 신축할 수 없습니다.");
            return;
        }

        const config = HOUSE_TYPE_CONFIG[selectedHouseTypeToBuild];
        if (!config) return;

        const { gold, wood, stone, iron = 0, manaStone = 0 } = config.cost;

        // 자원 부족 체크
        if (
            character.money < gold ||
            (base.resources.wood || 0) < wood ||
            (base.resources.stone || 0) < stone ||
            (base.resources.iron || 0) < iron ||
            ((base.resources as any).elementalShards?.['magic'] || 0) < manaStone
        ) {
            alert(`건설 자원이 부족합니다!\n필요 골드: ${gold.toLocaleString()}G, 목재: ${wood}, 석재: ${stone}${iron > 0 ? `, 철: ${iron}` : ''}`);
            return;
        }

        const durationMinutes = getHouseConstructionDuration(selectedHouseTypeToBuild, false, 1);
        const { completionDate, completionTime } = calculateCompletionDateTime(
            character.currentDate || '2000-03-02',
            character.currentTime || '08:00',
            durationMinutes
        );

        const newHouse: HouseBuilding = {
            id: `house_${selectedHouseTypeToBuild}_${Date.now()}`,
            type: selectedHouseTypeToBuild,
            name: `${config.name} ${houses.length + 1}호`,
            capacity: config.capacity,
            level: 0,
            cleanliness: 100,
            createdAt: character.currentDate,
            underConstruction: true,
            targetLevel: 1,
            targetType: selectedHouseTypeToBuild,
            targetCapacity: config.capacity,
            targetName: `${config.name} ${houses.length + 1}호`,
            constructionStartDate: character.currentDate || '2000-03-02',
            constructionStartTime: character.currentTime || '08:00',
            constructionCompletionDate: completionDate,
            constructionCompletionTime: completionTime,
            totalConstructionMinutes: durationMinutes
        };

        const updatedHouses = [...houses, newHouse];
        const updatedBase = {
            ...base,
            houses: updatedHouses,
            resources: {
                ...base.resources,
                wood: (base.resources.wood || 0) - wood,
                stone: (base.resources.stone || 0) - stone,
                iron: (base.resources.iron || 0) - iron,
            }
        };

        const updatedChar: Character = {
            ...character,
            money: character.money - gold,
            base: updatedBase
        };

        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
        setIsBuildModalOpen(false);
        onUpdateCharacter(updatedChar, `[주택 신축] '${config.name}' 신축 공사를 시작했습니다! (소요 시간: ${rem.text}, 완공 예정: ${completionDate} ${completionTime})`);
    };

    // [기능 2] 주택 업그레이드 (증축)
    const handleUpgradeHouse = (houseId: string) => {
        if (!base) return;
        const houseIndex = houses.findIndex(h => h.id === houseId);
        if (houseIndex === -1) return;

        const house = houses[houseIndex];
        const costGold = 5000 * house.level;
        const costWood = 10 * house.level;
        const costStone = 10 * house.level;

        if (
            character.money < costGold ||
            (base.resources.wood || 0) < costWood ||
            (base.resources.stone || 0) < costStone
        ) {
            alert(`증축 자원이 부족합니다!\n필요 골드: ${costGold.toLocaleString()}G, 목재: ${costWood}, 석재: ${costStone}`);
            return;
        }

        const isMyHome = house.id === 'my_home_default' || house.type === HouseType.MY_HOME;

        let newType = house.type;
        let baseCapBoost = 2;
        let nextLevel = house.level + 1;
        let newName = house.name;
        let logMsg = "";

        if (house.type === HouseType.HOUSE_1F) {
            baseCapBoost = 2;
            if (nextLevel >= 3) {
                newType = HouseType.HOUSE_2F;
                nextLevel = 1; // 2층 주택 Lv.1로 승격
                newName = house.name.replace("1층 주택", "2층 주택");
                if (newName === house.name) {
                    newName = `2층 주택 ${house.id.split('_').pop() || '1'}호`;
                }
                logMsg = `[주택 승격] ${house.name}이(가) 최고 수준에 도달하여 '2층 주택(Lv.1)'으로 승격되었습니다! (기본 수용 정원 4명)`;
            } else {
                logMsg = `[주택 증축] ${house.name}을(를) Lv.${nextLevel}(으)로 증축했습니다. (수용 정원 +${baseCapBoost}명)`;
            }
        } else if (house.type === HouseType.HOUSE_2F) {
            baseCapBoost = 4;
            if (nextLevel >= 3) {
                newType = HouseType.VILLA;
                nextLevel = 1; // 빌라 Lv.1로 승격
                newName = house.name.replace("2층 주택", "빌라");
                if (newName === house.name) {
                    newName = `빌라 ${house.id.split('_').pop() || '1'}호`;
                }
                logMsg = `[주택 승격] ${house.name}이(가) 최고 수준에 도달하여 '빌라(Lv.1)'(으)로 승격되었습니다! (기본 수용 정원 10명)`;
            } else {
                logMsg = `[주택 증축] ${house.name}을(를) Lv.${nextLevel}(으)로 증축했습니다. (수용 정원 +${baseCapBoost}명)`;
            }
        } else if (house.type === HouseType.VILLA) {
            baseCapBoost = 5;
            if (nextLevel >= 3) {
                newType = HouseType.APARTMENT;
                nextLevel = 1; // 아파트 Lv.1로 승격
                newName = house.name.replace("빌라", "아파트");
                if (newName === house.name) {
                    newName = `아파트 ${house.id.split('_').pop() || '1'}호`;
                }
                logMsg = `[주택 승격] ${house.name}이(가) 최고 수준에 도달하여 '아파트(Lv.1)'(으)로 승격되었습니다! (기본 수용 정원 50명)`;
            } else {
                logMsg = `[주택 증축] ${house.name}을(를) Lv.${nextLevel}(으)로 증축했습니다. (수용 정원 +${baseCapBoost}명)`;
            }
        } else if (house.type === HouseType.APARTMENT) {
            baseCapBoost = 10;
            logMsg = `[주택 증축] ${house.name}을(를) Lv.${nextLevel}(으)로 증축했습니다. (수용 정원 +${baseCapBoost}명)`;
        } else if (house.type === HouseType.LUXURY) {
            baseCapBoost = 5;
            logMsg = `[주택 증축] ${house.name}을(를) Lv.${nextLevel}(으)로 증축했습니다. (수용 정원 +${baseCapBoost}명)`;
        } else if (isMyHome) {
            baseCapBoost = 2;
            if (nextLevel >= 3) {
                newType = HouseType.LUXURY; // 나의 집 Lv 3+ 증축 시 초호화 대저택으로 전환
                newName = "나의 초호화 대저택";
                logMsg = `[나의 집 증축] 집을 Lv.${nextLevel}(으)로 증축했습니다! (초호화 대저택으로 승격되어 정원이 10명으로 확대되었습니다!)`;
            } else {
                logMsg = `[나의 집 증축] 집을 Lv.${nextLevel}(으)로 증축했습니다! (수용 정원 +2명)`;
            }
        }

        const nextTypeConfig = HOUSE_TYPE_CONFIG[newType];
        const newCapacity = (newType !== house.type) ? nextTypeConfig.capacity : (house.capacity + baseCapBoost);

        const durationMinutes = getHouseConstructionDuration(house.type, true, house.level);
        const { completionDate, completionTime } = calculateCompletionDateTime(
            character.currentDate || '2000-03-02',
            character.currentTime || '08:00',
            durationMinutes
        );

        const updatedHouse: HouseBuilding = {
            ...house,
            underConstruction: true,
            targetLevel: nextLevel,
            targetType: newType,
            targetCapacity: newCapacity,
            targetName: newName,
            constructionStartDate: character.currentDate || '2000-03-02',
            constructionStartTime: character.currentTime || '08:00',
            constructionCompletionDate: completionDate,
            constructionCompletionTime: completionTime,
            totalConstructionMinutes: durationMinutes
        };

        const updatedHouses = [...houses];
        updatedHouses[houseIndex] = updatedHouse;

        const updatedChar: Character = {
            ...character,
            money: character.money - costGold,
            base: {
                ...character.base!,
                houses: updatedHouses,
                resources: {
                    ...character.base!.resources,
                    wood: (character.base!.resources.wood || 0) - costWood,
                    stone: (character.base!.resources.stone || 0) - costStone
                }
            }
        };

        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
        setUpgradingHouseId(null);
        onUpdateCharacter(updatedChar, `[주택 증축] '${house.name}' Lv.${nextLevel} 증축 공사를 시작했습니다! (소요 시간: ${rem.text}, 완공 예정: ${completionDate} ${completionTime})`);
    };

    // [기능 3] 주택별 전담 하우스키퍼 지정 (1숙소 1하우스키퍼 보장)
    const handleAssignHousekeeper = (houseId: string, housekeeperId: string | null) => {
        if (!base) return;
        const targetHouse = houses.find(h => h.id === houseId);
        if (targetHouse && targetHouse.underConstruction && (!targetHouse.level || targetHouse.level === 0) && housekeeperId) {
            alert(`'${getHouseDisplayName(targetHouse)}'은(는) 현재 공사 중입니다.\n완공된 후에 하우스키퍼를 배치할 수 있습니다.`);
            return;
        }

        const updatedHouses = houses.map(h => {
            if (h.id === houseId) {
                return {
                    ...h,
                    assignedHousekeeperId: housekeeperId || undefined
                };
            }
            // 다른 숙소에 이미 해당 하우스키퍼가 배정되어 있었다면 해제 처리
            if (housekeeperId && h.assignedHousekeeperId === housekeeperId) {
                return {
                    ...h,
                    assignedHousekeeperId: undefined
                };
            }
            return h;
        });

        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houses: updatedHouses
            }
        };

        onUpdateCharacter(updatedChar, "");
    };

    // [기능 3-2] 주택별 전담 요리사 지정 (등급 제한 검증 및 1숙소 1요리사 보장)
    const handleAssignChef = (houseId: string, chefId: string | null) => {
        if (!base) return;

        if (chefId) {
            const targetChef = allCompanions.find(c => c.id === chefId);
            const targetHouse = houses.find(h => h.id === houseId);
            if (targetHouse && targetHouse.underConstruction && (!targetHouse.level || targetHouse.level === 0)) {
                alert(`'${getHouseDisplayName(targetHouse)}'은(는) 현재 공사 중입니다.\n완공된 후에 요리사를 배치할 수 있습니다.`);
                return;
            }
            if (targetChef && targetHouse) {
                const check = canChefManageHouse(targetChef, targetHouse.type);
                if (!check.allowed) {
                    alert(check.reason || '해당 주택에 전담 배치할 수 없는 요리사 등급입니다.');
                    return;
                }
            }
        }

        const updatedHouses = houses.map(h => {
            if (h.id === houseId) {
                return {
                    ...h,
                    assignedChefId: chefId || undefined
                };
            }
            // 다른 주택에 이미 배정되어 있었다면 해제 처리
            if (chefId && h.assignedChefId === chefId) {
                return {
                    ...h,
                    assignedChefId: undefined
                };
            }
            return h;
        });

        const newAssignments = { ...(character.base?.assignments || {}) };
        const newMultiAssignments = { ...(character.base?.multiAssignments || {}) };
        if (chefId) {
            Object.keys(newAssignments).forEach(key => {
                if (newAssignments[key] === chefId) delete newAssignments[key];
            });
            Object.keys(newMultiAssignments).forEach(key => {
                if (newMultiAssignments[key]?.includes(chefId)) {
                    newMultiAssignments[key] = newMultiAssignments[key].filter(id => id !== chefId);
                }
            });
        }

        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houses: updatedHouses,
                assignments: newAssignments,
                multiAssignments: newMultiAssignments
            }
        };

        onUpdateCharacter(updatedChar, "");
    };

    // [기능 4] 개별 하우스키퍼 1명당 1개 주택 선택 청소 (1시간 소요, timeMilestoneEngine 연동)
    const handleCleanHouseByKeeper = (keeperId: string, houseId: string) => {
        const keeper = housekeeperCompanions.find(c => c.id === keeperId);
        const house = houses.find(h => h.id === houseId);
        if (!keeper || !house) {
            alert("하우스키퍼 또는 선택한 주택을 찾을 수 없습니다.");
            return;
        }

        if (keeper.lastHousekeeperCleanDate === character.currentDate) {
            alert(`${keeper.name} 하우스키퍼는 오늘 이미 주택 청소를 완료했습니다! 내일 다시 수행할 수 있습니다.`);
            return;
        }

        const timeRes = advanceGameTime(character, 60, { activityName: "주택 청소" });
        const cleanChar = { ...timeRes.updatedCharacter };

        const houseName = getHouseDisplayName(house);

        // 1. 선택한 주택 청결도 100% 회복
        const updatedHouses = (cleanChar.base?.houses || []).map(h => {
            if (h.id === houseId) {
                return { ...h, cleanliness: 100 };
            }
            return h;
        });

        // 2. 해당 하우스키퍼 숙련도 (+40 EXP) 부여 및 오늘 청소 날짜 기록
        const updateKeeperData = (c: Companion) => {
            if (c.id === keeperId) {
                let level = c.housekeeperLevel || 1;
                let exp = (c.housekeeperExp || 0) + 40;

                while (exp >= 100 && level < 100) {
                    exp -= 100;
                    level++;
                }

                return {
                    ...c,
                    housekeeperExp: exp,
                    housekeeperLevel: level,
                    lastHousekeeperCleanDate: cleanChar.currentDate
                };
            }
            return c;
        };

        const updatedActiveCompanions = cleanChar.companions.map(updateKeeperData);
        const updatedInactiveCompanions = (cleanChar.inactiveCompanions || []).map(updateKeeperData);

        const updatedChar: Character = {
            ...cleanChar,
            companions: updatedActiveCompanions,
            inactiveCompanions: updatedInactiveCompanions,
            base: {
                ...cleanChar.base!,
                houses: updatedHouses
            }
        };

        const logMsg = `[주택 청소] ${keeper.name} 하우스키퍼가 [${houseName}] 주택을 청소하여 청결도를 100%로 복구했습니다! (소모 시간: 1시간, 숙련도 +40 Exp)`;
        onUpdateCharacter(updatedChar, logMsg, timeRes.dailyReport);
        if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
            timeRes.systemLogs.forEach(log => onUpdateCharacter(updatedChar, log));
        }
        alert(logMsg);
    };

    // [기능 5] 집 이름 변경 저장
    const handleSaveHouseName = (houseId: string) => {
        if (!editingHouseName.trim()) {
            setEditingHouseId(null);
            return;
        }
        const updatedCustomNames = {
            ...(base?.houseCustomNames || {}),
            [houseId]: editingHouseName.trim()
        };
        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houseCustomNames: updatedCustomNames
            }
        };
        onUpdateCharacter(updatedChar, "");
        setEditingHouseId(null);
    };

    // [기능 6] 거주자 집 이동 지정
    const handleAssignHouse = (companionId: string, houseId: string | null) => {
        const currentAssignments = { ...(base?.houseAssignments || {}) };
        if (houseId === null || houseId === 'unassigned') {
            delete currentAssignments[companionId];
        } else {
            const targetHouse = houses.find(h => h.id === houseId);
            if (targetHouse) {
                if (targetHouse.underConstruction && (!targetHouse.level || targetHouse.level === 0)) {
                    alert(`'${getHouseDisplayName(targetHouse)}'은(는) 현재 공사 중인 신축 주택입니다.\n완공된 후에 거주자를 배치할 수 있습니다.`);
                    return;
                }
                const currentResidents = getResidentsOfHouse(houseId);
                const isAlreadyInThisHouse = currentAssignments[companionId] === houseId;
                const maxCap = getHouseEffectiveCapacity(targetHouse);
                
                if (!isAlreadyInThisHouse && currentResidents.length >= maxCap) {
                    alert(`'${getHouseDisplayName(targetHouse)}'의 수용 인원(${maxCap}명)이 가득 차 더 이상 거주자를 배치할 수 없습니다.`);
                    return;
                }
            }
            currentAssignments[companionId] = houseId;
        }

        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houseAssignments: currentAssignments
            }
        };
        onUpdateCharacter(updatedChar, "");
    };

    // [기능 10] 개별 보너스 지급 (골드 -> 호감도/충성도)
    const handleGiveBonus = (companionId: string, goldAmount: number, affectionGain: number, loyaltyGain: number) => {
        if (character.money < goldAmount) {
            alert(`보너스를 지급하기에 골드가 부족합니다!\n현재 보유 골드: ${character.money.toLocaleString()}G / 필요 금액: ${goldAmount.toLocaleString()}G`);
            return;
        }

        const targetComp = allCompanions.find(c => c.id === companionId);
        if (!targetComp) return;

        const updateCompanionStats = (c: Companion) => {
            if (c.id === companionId) {
                return {
                    ...c,
                    affection: Math.min(100, (c.affection || 0) + affectionGain),
                    loyalty: Math.min(100, (c.loyalty || 0) + loyaltyGain)
                };
            }
            return c;
        };

        const updatedActiveCompanions = character.companions.map(updateCompanionStats);
        const updatedInactiveCompanions = (character.inactiveCompanions || []).map(updateCompanionStats);

        const updatedChar: Character = {
            ...character,
            money: character.money - goldAmount,
            companions: updatedActiveCompanions,
            inactiveCompanions: updatedInactiveCompanions
        };

        const logMsg = `[보너스 지급] '${targetComp.name}'에게 ${goldAmount.toLocaleString()}G 보너스를 지급하여 호감도 +${affectionGain}, 충성도 +${loyaltyGain} 상승했습니다.`;
        onUpdateCharacter(updatedChar, logMsg);
        setBonusTargetId(null);
    };

    // [기능 11] 일괄 보너스 지급
    const handleGiveBatchBonus = (goldAmountPerPerson: number, affectionGain: number, loyaltyGain: number) => {
        const count = selectedCompanionIds.length;
        if (count === 0) return;

        const totalGold = goldAmountPerPerson * count;
        if (character.money < totalGold) {
            alert(`일괄 보너스를 지급하기에 골드가 부족합니다!\n현재 보유 골드: ${character.money.toLocaleString()}G / 필요 총액: ${totalGold.toLocaleString()}G`);
            return;
        }

        const updateCompanionStats = (c: Companion) => {
            if (selectedCompanionIds.includes(c.id)) {
                return {
                    ...c,
                    affection: Math.min(100, (c.affection || 0) + affectionGain),
                    loyalty: Math.min(100, (c.loyalty || 0) + loyaltyGain)
                };
            }
            return c;
        };

        const updatedActiveCompanions = character.companions.map(updateCompanionStats);
        const updatedInactiveCompanions = (character.inactiveCompanions || []).map(updateCompanionStats);

        const updatedChar: Character = {
            ...character,
            money: character.money - totalGold,
            companions: updatedActiveCompanions,
            inactiveCompanions: updatedInactiveCompanions
        };

        const logMsg = `[일괄 보너스 지급] 선택된 동료 ${count}명에게 각각 ${goldAmountPerPerson.toLocaleString()}G(총 ${totalGold.toLocaleString()}G) 보너스를 지급하여 호감도 +${affectionGain}, 충성도 +${loyaltyGain} 상승했습니다.`;
        onUpdateCharacter(updatedChar, logMsg);
        setSelectedCompanionIds([]);
    };

    // [기능 7] 자동 이사 (주택 정원에 맞게 고른 분배)
    const handleAutoDistribute = () => {
        if (houses.length === 0) {
            alert("건설된 주택이 없습니다. 먼저 주택을 건설해주세요!");
            return;
        }

        const newAssignments: Record<string, string> = {};
        const houseCapacities = houses.map(h => ({
            id: h.id,
            capacity: getHouseEffectiveCapacity(h),
            count: 0
        }));

        allCompanions.forEach((comp) => {
            const target = houseCapacities.find(h => h.count < h.capacity) || houseCapacities[0];
            newAssignments[comp.id] = target.id;
            target.count++;
        });

        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houseAssignments: newAssignments
            }
        };

        onUpdateCharacter(updatedChar, `[자동 이사] 모든 거주자가 보유한 주택으로 균등하게 배치되었습니다.`);
    };

    // [기능 8] 일괄 이사
    const handleBatchAssign = (houseId: string | null) => {
        if (selectedCompanionIds.length === 0) return;
        const currentAssignments = { ...(base?.houseAssignments || {}) };
        
        if (houseId === null || houseId === 'unassigned') {
            selectedCompanionIds.forEach(id => {
                delete currentAssignments[id];
            });
        } else {
            const targetHouse = houses.find(h => h.id === houseId);
            if (targetHouse) {
                if (targetHouse.underConstruction && (!targetHouse.level || targetHouse.level === 0)) {
                    alert(`'${getHouseDisplayName(targetHouse)}'은(는) 현재 공사 중인 신축 주택입니다.\n완공된 후에 거주자를 배치할 수 있습니다.`);
                    return;
                }
                const currentResidents = getResidentsOfHouse(houseId);
                const maxCap = getHouseEffectiveCapacity(targetHouse);
                const newComers = selectedCompanionIds.filter(id => currentAssignments[id] !== houseId);
                const availableSlots = maxCap - currentResidents.length;

                if (newComers.length > availableSlots) {
                    alert(`'${getHouseDisplayName(targetHouse)}'의 여유 공간이 부족합니다.\n(남은 자리: ${Math.max(0, availableSlots)}명 / 배치 요청: ${newComers.length}명)`);
                    return;
                }
            }
            selectedCompanionIds.forEach(id => {
                currentAssignments[id] = houseId;
            });
        }

        const updatedChar: Character = {
            ...character,
            base: {
                ...character.base!,
                houseAssignments: currentAssignments
            }
        };

        setSelectedCompanionIds([]);
        onUpdateCharacter(updatedChar, `[일괄 이사] 선택한 ${selectedCompanionIds.length}명의 거주자를 배치했습니다.`);
    };

    // 거주자 필터링 & 정렬
    const filteredResidents = useMemo(() => {
        return allCompanions.filter(comp => {
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchName = comp.name.toLowerCase().includes(query);
                const matchJob = comp.job?.toLowerCase().includes(query);
                if (!matchName && !matchJob) return false;
            }

            if (statusFilter === 'assigned' && !houseAssignments[comp.id]) return false;
            if (statusFilter === 'unassigned' && !houseAssignments[comp.id]) return true;
            if (statusFilter === 'party' && !partyIdSet.has(comp.id)) return false;
            if (statusFilter === 'lover' && !comp.isLover) return false;
            if (statusFilter === 'working' && !isCompanionBusy(comp)) return false;

            if (houseFilter !== 'all') {
                if (houseFilter === 'unassigned') {
                    if (houseAssignments[comp.id]) return false;
                } else {
                    if (houseAssignments[comp.id] !== houseFilter) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'level') return b.level - a.level;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'hp') return b.stats.hp - a.stats.hp;
            if (sortBy === 'house') {
                const houseA = houseAssignments[a.id] || '';
                const houseB = houseAssignments[b.id] || '';
                return houseA.localeCompare(houseB);
            }
            return 0;
        });
    }, [allCompanions, searchQuery, statusFilter, houseFilter, sortBy, houseAssignments, partyIdSet, isCompanionBusy]);

    const toggleSelectAll = () => {
        if (selectedCompanionIds.length === filteredResidents.length) {
            setSelectedCompanionIds([]);
        } else {
            setSelectedCompanionIds(filteredResidents.map(c => c.id));
        }
    };

    const toggleSelectCompanion = (id: string) => {
        if (selectedCompanionIds.includes(id)) {
            setSelectedCompanionIds(selectedCompanionIds.filter(i => i !== id));
        } else {
            setSelectedCompanionIds([...selectedCompanionIds, id]);
        }
    };

    // 하우스키퍼 목록
    const housekeeperCompanions = useMemo(() => {
        return allCompanions.filter(c => c.job === JobType.HOUSEKEEPER || (c.job as string) === '하우스 키퍼' || (c.job as string) === '하우스키퍼' || c.job === JobType.SLAVE || (c.job as string) === '노예');
    }, [allCompanions]);

    // 요리사 목록
    const chefCompanions = useMemo(() => {
        return allCompanions.filter(c => c.job === JobType.CHEF || (c.job as string) === '요리사' || !!c.professions?.cooking);
    }, [allCompanions]);

    // 일일 기지 식량 소모 통계
    const foodStats = useMemo(() => {
        return calculateDailyFoodConsumption(base, allCompanions);
    }, [base, allCompanions]);

    // 신축 가능 주택 종류 (나의 집 제외)
    const buildableHouseTypes = [HouseType.HOUSE_1F, HouseType.HOUSE_2F, HouseType.VILLA, HouseType.APARTMENT, HouseType.LUXURY];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-slate-900 border border-amber-900/40 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
            >
                {/* Header Bar */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                            <Home size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-100">통합 주거 & 주택 단지</h2>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-mono font-bold">
                                    건설 주택 {houses.length} / {maxCount}채
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                                <span>
                                    거주 인원: <span className="text-amber-300 font-bold">{allCompanions.length}</span> / {totalCapacity}명
                                </span>
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <Utensils size={12} />
                                    일일 식량 소모: <span className="font-bold text-amber-300">{foodStats.dailyFoodNeed}</span>개/일
                                    {foodStats.exemptResidents > 0 && <span className="text-[10px] text-emerald-300 font-normal">({foodStats.exemptResidents}명 전담요리 면제)</span>}
                                    {foodStats.hasFacilityChef && <span className="text-[10px] text-amber-400 font-normal">(주방 요리사 50% 절감 중)</span>}
                                </span>
                                {unassignedResidents.length > 0 && (
                                    <span className="text-rose-400 font-medium flex items-center gap-0.5">
                                        <AlertTriangle size={12} /> (미배치/노숙 {unassignedResidents.length}명)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsBuildModalOpen(true)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 border border-amber-500/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                            title="새 주택을 건축하여 수용 정원을 확장합니다."
                        >
                            <Plus size={15} className="text-amber-300" /> 주택 신축
                        </button>
                        <button
                            onClick={handleAutoDistribute}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                            title="모든 동료를 보유 주택 정원에 맞게 자동으로 균등 배치합니다."
                        >
                            <RefreshCw size={14} className="text-cyan-400" /> 자동 이사
                        </button>
                        <button
                            onClick={() => { setPartySelection([]); setIsPartyModalOpen(true); }}
                            className="px-3 py-1.5 bg-pink-950/50 hover:bg-pink-900/60 text-pink-200 border border-pink-800/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Sparkles size={14} className="text-pink-400 fill-pink-400" /> 파티 주최
                        </button>
                        <button
                            onClick={() => setIsMyHomeOpen(true)}
                            className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 border border-rose-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Home size={14} className="text-rose-400" /> 나의 집 (가족 공간)
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Sub-Banner: Housekeeper & Housing Limit Status */}
                <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Award size={15} className="text-amber-400 shrink-0" />
                        <span>
                            건설 가능 주택 한도: <strong className="text-amber-300">{maxCount}채</strong> 
                            <span className="text-slate-500 mx-1.5">|</span>
                            숙소 기본 한도: {housingLv * 5 * housingCount}채 (레벨 {housingLv} * 5 * {housingCount}개)
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {housekeeperName ? (
                            <span className="bg-amber-950/90 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1">
                                <Crown size={13} className="text-amber-400" />
                                대표 하우스키퍼: <strong>{housekeeperName}</strong> ({housekeeperRank}) → 추가 건설 +{housekeeperCoef}채
                            </span>
                        ) : (
                            <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1">
                                <Info size={13} className="text-slate-500" />
                                하우스키퍼 미배치 (동료에게 하우스키퍼 직업을 권유하면 건설 한도 및 주택 수용량이 증대됩니다)
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Tab Navigation */}
                <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setActiveTab('houses')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'houses' 
                                ? 'bg-amber-950 text-amber-200 border border-amber-700/60 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Building size={14} /> 🏘️ 주택 건물 관리 ({houses.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('residents')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'residents' 
                                ? 'bg-amber-950 text-amber-200 border border-amber-700/60 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Users size={14} /> 👥 전체 거주자 명단 ({allCompanions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('housekeepers')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'housekeepers' 
                                ? 'bg-amber-950 text-amber-200 border border-amber-700/60 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Wrench size={14} className="text-amber-400" /> 🧹 하우스키퍼 & 요리사 관리 ({housekeeperCompanions.length + chefCompanions.length})
                        </button>
                    </div>

                    {activeTab === 'residents' && (
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-amber-900/50 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                                    title="그리드 뷰"
                                >
                                    <LayoutGrid size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-amber-900/50 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                                    title="목록 보기"
                                >
                                    <List size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {activeTab === 'houses' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {houses.map((house) => {
                                    const houseName = getHouseDisplayName(house);
                                    const residents = getResidentsOfHouse(house.id);
                                    const typeCfg = HOUSE_TYPE_CONFIG[house.type] || HOUSE_TYPE_CONFIG[HouseType.HOUSE_1F];
                                    const isEditing = editingHouseId === house.id;

                                    // 전담 하우스키퍼
                                    const assignedHK = house.assignedHousekeeperId ? allCompanions.find(c => c.id === house.assignedHousekeeperId) : undefined;
                                    const hkRankCfg = assignedHK && (assignedHK.job === JobType.HOUSEKEEPER || (assignedHK.job as string) === '하우스 키퍼' || (assignedHK.job as string) === '하우스키퍼' || assignedHK.job === JobType.SLAVE || (assignedHK.job as string) === '노예') ? HOUSEKEEPER_RANK_CONFIG[assignedHK.housekeeperRank || HousekeeperRank.BEGINNER] : undefined;
                                    const hkCapacityBonus = hkRankCfg ? hkRankCfg.coef : 0;

                                    const effectiveCapacity = house.capacity + hkCapacityBonus;
                                    const isFull = residents.length >= effectiveCapacity;
                                    const cleanliness = house.cleanliness !== undefined ? house.cleanliness : 100;

                                    return (
                                        <div 
                                            key={house.id}
                                            className="bg-slate-950/80 border border-slate-800 hover:border-amber-700/50 rounded-xl p-3 flex flex-col justify-between transition-all shadow-sm group relative overflow-hidden text-xs"
                                        >
                                            {/* Luxury house glow effect */}
                                            {house.type === HouseType.LUXURY && (
                                                <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                                            )}

                                            <div>
                                                {/* Card Header */}
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <div className="min-w-0 flex-1 pr-2">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1">
                                                                <input 
                                                                    type="text" 
                                                                    value={editingHouseName}
                                                                    onChange={e => setEditingHouseName(e.target.value)}
                                                                    placeholder="집 이름 입력"
                                                                    className="bg-slate-900 border border-amber-500 text-xs rounded px-1.5 py-0.5 text-amber-200 focus:outline-none w-full"
                                                                    autoFocus
                                                                />
                                                                <button 
                                                                    onClick={() => handleSaveHouseName(house.id)}
                                                                    className="p-1 bg-amber-600 hover:bg-amber-500 text-white rounded"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 group/title">
                                                                <h3 className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                                                                    {houseName}
                                                                </h3>
                                                                <button 
                                                                    onClick={() => { setEditingHouseId(house.id); setEditingHouseName(houseName); }}
                                                                    className="text-slate-500 hover:text-amber-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                                                    title="집 이름 수정"
                                                                >
                                                                    <Edit2 size={11} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                            {house.underConstruction ? (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/70 font-bold flex items-center gap-1 animate-pulse">
                                                                    <Hammer size={10} className="text-amber-400" /> 공사 중 (Lv.{house.targetLevel || (house.level + 1)} 목표)
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 font-medium">
                                                                    {typeCfg.name} (Lv.{house.level})
                                                                </span>
                                                            )}
                                                            {house.type === HouseType.LUXURY && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 font-bold flex items-center gap-0.5">
                                                                    <Sparkles size={9} className="text-amber-400" /> 호감MAX
                                                                </span>
                                                            )}
                                                            {(house.id === 'my_home_default' || house.type === HouseType.MY_HOME) && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                                                    가족 전용
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <div className={`text-xs font-bold ${isFull ? 'text-rose-400' : 'text-amber-300'}`}>
                                                            {residents.length} / {effectiveCapacity}명
                                                        </div>
                                                        {hkCapacityBonus > 0 && <span className="text-[10px] text-emerald-400 block font-medium">(+{hkCapacityBonus})</span>}
                                                    </div>
                                                </div>

                                                {/* Under construction progress banner */}
                                                {house.underConstruction && (() => {
                                                    const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, house.constructionCompletionDate, house.constructionCompletionTime);
                                                    const progress = getConstructionProgress(house.totalConstructionMinutes, rem.remainingMinutes);
                                                    return (
                                                        <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-2 mb-1.5">
                                                            <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold mb-1">
                                                                <span>공사 진행률 ({progress}%)</span>
                                                                <span>남은 시간: {rem.text}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                                                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Capacity progress bar */}
                                                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-1.5 border border-slate-800">
                                                    <div 
                                                        className={`h-full transition-all duration-300 ${isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`} 
                                                        style={{ width: `${Math.min(100, (residents.length / effectiveCapacity) * 100)}%` }}
                                                    />
                                                </div>

                                                {/* Cleanliness & Housekeeper Compact Row */}
                                                <div className="grid grid-cols-2 gap-1.5 mb-1.5 text-[10px]">
                                                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-1 flex items-center justify-between">
                                                        <span className="text-slate-400 flex items-center gap-1 truncate">
                                                            <Wrench size={10} className={cleanliness < 40 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'} />
                                                            청결
                                                        </span>
                                                        <span className={`font-mono font-bold ${
                                                            cleanliness >= 80 ? 'text-emerald-400' :
                                                            cleanliness >= 40 ? 'text-amber-300' : 'text-rose-400'
                                                        }`}>
                                                            {cleanliness}%
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-1.5 py-0.5 flex items-center gap-1">
                                                        <Crown size={10} className="text-amber-400 shrink-0" />
                                                        <select
                                                            value={house.assignedHousekeeperId || ''}
                                                            onChange={e => handleAssignHousekeeper(house.id, e.target.value || null)}
                                                            disabled={house.underConstruction && (!house.level || house.level === 0)}
                                                            className="w-full bg-transparent text-[10px] text-slate-300 focus:outline-none truncate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="전담 하우스키퍼 지정"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-400">{house.underConstruction && (!house.level || house.level === 0) ? '공사 중 (배치 불가)' : '키퍼 없음'}</option>
                                                            {housekeeperCompanions.map(hk => {
                                                                const assignedOtherHouse = houses.find(h => h.id !== house.id && h.assignedHousekeeperId === hk.id);
                                                                return (
                                                                    <option key={hk.id} value={hk.id} className="bg-slate-900 text-slate-200">
                                                                        {hk.name} {assignedOtherHouse ? `(${getHouseDisplayName(assignedOtherHouse)} 담당 중)` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Chef Assignment & Food Status Compact Row */}
                                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-1 mb-1.5 flex items-center justify-between gap-1.5 text-[10px]">
                                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                                        <Utensils size={10} className={house.assignedChefId ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'} />
                                                        <select
                                                            value={house.assignedChefId || ''}
                                                            onChange={e => handleAssignChef(house.id, e.target.value || null)}
                                                            disabled={house.underConstruction && (!house.level || house.level === 0)}
                                                            className="w-full bg-transparent text-[10px] text-slate-300 focus:outline-none truncate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="전담 요리사 지정 (배치 시 해당 주택 거주자 식량 소모 0)"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-400">{house.underConstruction && (!house.level || house.level === 0) ? '공사 중 (배치 불가)' : '요리사 없음 (식량 소모)'}</option>
                                                            {chefCompanions.map(chef => {
                                                                const chefRankInfo = getCompanionChefRank(chef);
                                                                const allowedCheck = canChefManageHouse(chef, house.type);
                                                                const assignedOtherHouse = houses.find(h => h.id !== house.id && h.assignedChefId === chef.id);
                                                                return (
                                                                    <option 
                                                                        key={chef.id} 
                                                                        value={chef.id} 
                                                                        disabled={!allowedCheck.allowed}
                                                                        className={`bg-slate-900 ${!allowedCheck.allowed ? 'text-slate-600' : 'text-slate-200'}`}
                                                                    >
                                                                        {chef.name} ({chefRankInfo.label} Lv.{chefRankInfo.level})
                                                                        {!allowedCheck.allowed ? ` [배치불가: ${chefRankInfo.label}]` : assignedOtherHouse ? ` (${getHouseDisplayName(assignedOtherHouse)} 담당 중)` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {house.assignedChefId && allCompanions.some(c => c.id === house.assignedChefId && canChefManageHouse(c, house.type).allowed) ? (
                                                            <span className="text-emerald-400 font-bold text-[9px] bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                                                                식량 면제
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 text-[9px] bg-amber-950/60 border border-amber-900/60 px-1.5 py-0.5 rounded font-mono">
                                                                소모 {residents.length}개/일
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Special Effect Banner */}
                                                {typeCfg.specialEffect && (
                                                    <div className="px-2 py-0.5 mb-1.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[10px] text-amber-300/90 truncate" title={typeCfg.specialEffect}>
                                                        ✨ {typeCfg.specialEffect}
                                                    </div>
                                                )}

                                                {/* Resident Avatars / Chips */}
                                                <div className="space-y-1 mb-2">
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                                                        <span>거주 동료 ({residents.length})</span>
                                                    </div>
                                                    <div className="max-h-20 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 p-1 bg-slate-900/40 rounded-lg border border-slate-800/60 min-h-[28px] items-center">
                                                        {residents.length === 0 ? (
                                                            <span className="text-[10px] text-slate-500 px-1">거주자 없음</span>
                                                        ) : (
                                                            residents.map(comp => {
                                                                const avatar = getCompanionAvatar(comp);
                                                                return (
                                                                    <div 
                                                                        key={comp.id}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 rounded-md text-[10px] text-slate-200"
                                                                    >
                                                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[8px] text-amber-300">
                                                                            {avatar ? (
                                                                                <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                                            ) : comp.name[0]}
                                                                        </div>
                                                                        <span className="truncate max-w-[65px]">{comp.name}</span>
                                                                        {comp.isLover && <Heart size={8} className="text-rose-400 fill-rose-400 shrink-0" />}
                                                                        <button
                                                                            onClick={() => handleAssignHouse(comp.id, null)}
                                                                            className="text-slate-500 hover:text-rose-400 ml-0.5"
                                                                            title="퇴거"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                                                {(house.id === 'my_home_default' || house.type === HouseType.MY_HOME) ? (
                                                    <>
                                                        <button
                                                            onClick={() => setIsMyHomeOpen(true)}
                                                            className="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-700/60 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                                        >
                                                            <Home size={12} className="text-rose-400" /> 나의 집 이동
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (house.underConstruction && (!house.level || house.level === 0)) {
                                                                    const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, house.constructionCompletionDate, house.constructionCompletionTime);
                                                                    alert(`[${house.name}] 신축 공사가 진행 중입니다.\n\n완공 전에는 거주자를 배치할 수 없습니다.\n남은 시간: ${rem.text}`);
                                                                    return;
                                                                }
                                                                setSelectedHouseForAssign(house.id);
                                                            }}
                                                            disabled={house.underConstruction && (!house.level || house.level === 0)}
                                                            className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all shrink-0 max-w-[80px] ${
                                                                house.underConstruction && (!house.level || house.level === 0)
                                                                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                                    : 'bg-slate-900 hover:bg-amber-950 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-700/60'
                                                            }`}
                                                        >
                                                            <UserPlus size={12} /> 배치
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (house.underConstruction && (!house.level || house.level === 0)) {
                                                                const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, house.constructionCompletionDate, house.constructionCompletionTime);
                                                                alert(`[${house.name}] 신축 공사가 진행 중입니다.\n\n완공 전에는 거주자를 배치할 수 없습니다.\n남은 시간: ${rem.text}`);
                                                                return;
                                                            }
                                                            setSelectedHouseForAssign(house.id);
                                                        }}
                                                        disabled={house.underConstruction && (!house.level || house.level === 0)}
                                                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                                                            house.underConstruction && (!house.level || house.level === 0)
                                                                ? 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                                : 'bg-slate-900 hover:bg-amber-950 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-700/60'
                                                        }`}
                                                    >
                                                        <UserPlus size={12} /> 배치
                                                    </button>
                                                )}

                                                {house.underConstruction ? (
                                                    <button
                                                        onClick={() => {
                                                            const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, house.constructionCompletionDate, house.constructionCompletionTime);
                                                            alert(`[${house.name}] 공사가 진행 중입니다.\n\n완공 예정: ${house.constructionCompletionDate} ${house.constructionCompletionTime}\n남은 시간: ${rem.text}`);
                                                        }}
                                                        className="py-1.5 px-2.5 bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-600/70 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0 animate-pulse"
                                                    >
                                                        <Hammer size={12} className="text-amber-400 animate-bounce" /> 공사 중
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setUpgradingHouseId(house.id)}
                                                        className="py-1.5 px-2.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                                                        title={`증축 비용: ${(5000 * house.level).toLocaleString()}골드, 목재 ${10 * house.level}, 석재 ${10 * house.level}`}
                                                    >
                                                        <ArrowUpCircle size={12} className="text-amber-400" /> 증축
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: 전체 거주자 목록 */}
                    {activeTab === 'residents' && (
                        <div className="space-y-4">
                            {/* Filter Bar */}
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                    <div className="relative min-w-[180px] flex-1 max-w-xs">
                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                                        <input 
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="이름/직업 검색..."
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>

                                    {/* Status Filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="all">전체 상태</option>
                                        <option value="assigned">주택 배치 완료</option>
                                        <option value="unassigned">미배치 (노숙/불만)</option>
                                        <option value="party">파티원</option>
                                        <option value="lover">연인</option>
                                        <option value="working">업무 중</option>
                                    </select>

                                    {/* House Filter */}
                                    <select
                                        value={houseFilter}
                                        onChange={e => setHouseFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="all">모든 주택 보기</option>
                                        <option value="unassigned">미배치 인원만</option>
                                        {houses.map((h) => (
                                            <option key={h.id} value={h.id}>{getHouseDisplayName(h)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selection & Batch Action */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium"
                                    >
                                        {selectedCompanionIds.length === filteredResidents.length ? '선택 해제' : '전체 선택'}
                                    </button>

                                    {selectedCompanionIds.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 bg-amber-950/60 border border-amber-800/80 p-1 rounded-xl">
                                            <span className="text-xs text-amber-300 font-bold px-2">
                                                {selectedCompanionIds.length}명 선택됨
                                            </span>
                                            <select
                                                onChange={e => {
                                                    if (e.target.value) {
                                                        handleBatchAssign(e.target.value === 'unassigned' ? null : e.target.value);
                                                        e.target.value = "";
                                                    }
                                                }}
                                                defaultValue=""
                                                className="bg-slate-900 border border-amber-700 text-xs text-amber-200 rounded-lg px-2 py-1 focus:outline-none"
                                            >
                                                <option value="" disabled>이동할 주택 선택...</option>
                                                <option value="unassigned">퇴거 (미배치)</option>
                                                {houses.map(h => {
                                                    const isUnderConst = h.underConstruction && (!h.level || h.level === 0);
                                                    const count = getResidentsOfHouse(h.id).length;
                                                    const cap = getHouseEffectiveCapacity(h);
                                                    const isFull = count >= cap;
                                                    return (
                                                        <option key={h.id} value={h.id} disabled={isFull || isUnderConst}>
                                                            {getHouseDisplayName(h)} {isUnderConst ? '(공사 중 - 배치 불가)' : `(${count}/${cap}명${isFull ? ' - 만실' : ''})`}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <select
                                                onChange={e => {
                                                    if (e.target.value) {
                                                        const [gold, affection, loyalty] = e.target.value.split(',').map(Number);
                                                        handleGiveBatchBonus(gold, affection, loyalty);
                                                        e.target.value = "";
                                                    }
                                                }}
                                                defaultValue=""
                                                className="bg-slate-900 border border-amber-700 text-xs text-amber-200 rounded-lg px-2 py-1 focus:outline-none"
                                            >
                                                <option value="" disabled>일괄 보너스 지급...</option>
                                                <option value="10000,2,1">기본 격려금 (각 10,000G, 호감+2, 충성+1)</option>
                                                <option value="50000,12,6">통큰 격려금 (각 50,000G, 호감+12, 충성+6)</option>
                                                <option value="100000,30,15">특별 격려금 (각 100,000G, 호감+30, 충성+15)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Residents Grid/List Display */}
                            {filteredResidents.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 text-sm bg-slate-950/40 rounded-2xl border border-slate-800">
                                    조건에 해당하는 거주자가 없습니다.
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filteredResidents.map(comp => {
                                        const currentHouseId = houseAssignments[comp.id];
                                        const currentHouse = houses.find(h => h.id === currentHouseId);
                                        const isSelected = selectedCompanionIds.includes(comp.id);
                                        const avatar = getCompanionAvatar(comp);

                                        return (
                                            <div
                                                key={comp.id}
                                                onClick={() => toggleSelectCompanion(comp.id)}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                                    isSelected 
                                                    ? 'bg-amber-950/40 border-amber-500 shadow-md' 
                                                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2.5 mb-2">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-amber-400">
                                                            {avatar ? (
                                                                <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                            ) : comp.name[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold text-xs text-slate-100 truncate">{comp.name}</span>
                                                                {comp.isLover && <Heart size={12} className="text-rose-400 fill-rose-400 shrink-0" />}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                Lv.{comp.level} | {comp.job || '무직'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] mb-2">
                                                        <span className="text-slate-400">현재 거주: </span>
                                                        <span className={currentHouse ? 'text-amber-300 font-semibold' : (partyIdSet.has(comp.id) ? 'text-slate-300 font-medium' : 'text-rose-400 font-medium')}>
                                                            {currentHouse ? getHouseDisplayName(currentHouse) : (partyIdSet.has(comp.id) ? '미배치 (파티 동행)' : '미배치 (노숙/호감도 감소)')}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-1.5 mb-2 text-[10px]">
                                                        <div className="p-1 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                                            <span className="text-slate-400 block text-[9px]">호감도</span>
                                                            <span className="text-rose-400 font-semibold">{comp.affection || 0} / 100</span>
                                                        </div>
                                                        <div className="p-1 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                                            <span className="text-slate-400 block text-[9px]">충성도</span>
                                                            <span className="text-amber-400 font-semibold">{comp.loyalty || 0} / 100</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                                    {bonusTargetId === comp.id ? (
                                                        <div className="flex flex-col gap-1 w-full bg-slate-900 p-2 border border-amber-600/50 rounded-xl">
                                                            <div className="text-[10px] text-amber-300 font-semibold mb-1 text-center">보너스 금액 선택</div>
                                                            <div className="grid grid-cols-3 gap-1">
                                                                <button
                                                                    onClick={() => handleGiveBonus(comp.id, 10000, 2, 1)}
                                                                    className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[9px] font-semibold"
                                                                >
                                                                    10,000G
                                                                    <span className="block text-[8px] text-rose-400 font-mono">호감+2</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleGiveBonus(comp.id, 50000, 12, 6)}
                                                                    className="py-1 bg-slate-800 hover:bg-amber-900/40 hover:border-amber-700 text-amber-200 border border-slate-700 rounded text-[9px] font-semibold"
                                                                >
                                                                    50,000G
                                                                    <span className="block text-[8px] text-rose-400 font-mono">호감+12</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleGiveBonus(comp.id, 100000, 30, 15)}
                                                                    className="py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 rounded text-[9px] font-bold"
                                                                >
                                                                    100,000G
                                                                    <span className="block text-[8px] text-rose-400 font-mono">호감+30</span>
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => setBonusTargetId(null)}
                                                                className="mt-1 py-0.5 text-[9px] text-slate-400 hover:text-slate-200"
                                                            >
                                                                취소
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1 w-full">
                                                            <select
                                                                value={currentHouseId || 'unassigned'}
                                                                onChange={e => handleAssignHouse(comp.id, e.target.value === 'unassigned' ? null : e.target.value)}
                                                                className="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2 py-1 flex-1 focus:outline-none focus:border-amber-500"
                                                            >
                                                                <option value="unassigned">퇴거 / 미배치 (노숙)</option>
                                                                {houses.map(h => {
                                                                    const isUnderConst = h.underConstruction && (!h.level || h.level === 0);
                                                                    const count = getResidentsOfHouse(h.id).length;
                                                                    const cap = getHouseEffectiveCapacity(h);
                                                                    const isFull = count >= cap;
                                                                    const isCurrent = currentHouseId === h.id;
                                                                    return (
                                                                        <option key={h.id} value={h.id} disabled={(isFull && !isCurrent) || isUnderConst}>
                                                                            {getHouseDisplayName(h)} {isUnderConst ? '(공사 중 - 배치 불가)' : `(${count}/${cap}명${isFull && !isCurrent ? ' - 만실' : ''})`}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                            <button
                                                                onClick={() => setBonusTargetId(comp.id)}
                                                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1 shrink-0 transition-colors"
                                                                title="보너스(골드)를 지급하여 호감도와 충성도를 올립니다"
                                                            >
                                                                보너스
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* List View Table */
                                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs text-slate-300">
                                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                                            <tr>
                                                <th className="p-3 w-10 text-center">선택</th>
                                                <th className="p-3">동료 이름</th>
                                                <th className="p-3">레벨 / 직업</th>
                                                <th className="p-3">호감 / 충성</th>
                                                <th className="p-3">현재 거주 주택</th>
                                                <th className="p-3 text-right">거주 변경 / 보너스</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {filteredResidents.map(comp => {
                                                const currentHouseId = houseAssignments[comp.id];
                                                const currentHouse = houses.find(h => h.id === currentHouseId);
                                                const isSelected = selectedCompanionIds.includes(comp.id);
                                                const avatar = getCompanionAvatar(comp);

                                                return (
                                                    <tr key={comp.id} className={isSelected ? 'bg-amber-950/30' : 'hover:bg-slate-900/50'}>
                                                        <td className="p-3 text-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectCompanion(comp.id)}
                                                                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-3 font-medium text-slate-100 flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[10px] text-amber-300">
                                                                {avatar ? (
                                                                    <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                                ) : comp.name[0]}
                                                            </div>
                                                            <span>{comp.name}</span>
                                                            {comp.isLover && <Heart size={10} className="text-rose-400 fill-rose-400" />}
                                                        </td>
                                                        <td className="p-3 text-slate-400">Lv.{comp.level} ({comp.job || '무직'})</td>
                                                        <td className="p-3 font-mono text-[11px]">
                                                            <div className="text-rose-400">♥ {comp.affection || 0} / 100</div>
                                                            <div className="text-amber-400">★ {comp.loyalty || 0} / 100</div>
                                                        </td>
                                                        <td className="p-3 font-semibold text-amber-200">
                                                            {currentHouse ? getHouseDisplayName(currentHouse) : (partyIdSet.has(comp.id) ? <span className="text-slate-400">미배치 (파티 동행)</span> : <span className="text-rose-400">미배치 (노숙)</span>)}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                                                {bonusTargetId === comp.id ? (
                                                                    <div className="flex items-center gap-1 bg-slate-900 border border-amber-600/50 p-1 rounded-lg">
                                                                        <button
                                                                            onClick={() => handleGiveBonus(comp.id, 10000, 2, 1)}
                                                                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold"
                                                                            title="호감+2, 충성+1"
                                                                        >
                                                                            10,000G
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleGiveBonus(comp.id, 50000, 12, 6)}
                                                                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-900/40 text-amber-200 rounded text-[10px] font-semibold"
                                                                            title="호감+12, 충성+6"
                                                                        >
                                                                            50,000G
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleGiveBonus(comp.id, 100000, 30, 15)}
                                                                            className="px-1.5 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-300 rounded text-[10px] font-bold"
                                                                            title="호감+30, 충성+15"
                                                                        >
                                                                            100,000G
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setBonusTargetId(null)}
                                                                            className="px-1 text-[10px] text-slate-500 hover:text-slate-300"
                                                                        >
                                                                            취소
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <select
                                                                            value={currentHouseId || 'unassigned'}
                                                                            onChange={e => handleAssignHouse(comp.id, e.target.value === 'unassigned' ? null : e.target.value)}
                                                                            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                                                                        >
                                                                            <option value="unassigned">미배치 (노숙)</option>
                                                                            {houses.map(h => {
                                                                                const isUnderConst = h.underConstruction && (!h.level || h.level === 0);
                                                                                const count = getResidentsOfHouse(h.id).length;
                                                                                const cap = getHouseEffectiveCapacity(h);
                                                                                const isFull = count >= cap;
                                                                                const isCurrent = currentHouseId === h.id;
                                                                                return (
                                                                                    <option key={h.id} value={h.id} disabled={(isFull && !isCurrent) || isUnderConst}>
                                                                                        {getHouseDisplayName(h)} {isUnderConst ? '(공사 중 - 배치 불가)' : `(${count}/${cap}명${isFull && !isCurrent ? ' - 만실' : ''})`}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                        <button
                                                                            onClick={() => setBonusTargetId(comp.id)}
                                                                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                                                                        >
                                                                            보너스
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: 하우스키퍼 & 청소 관리 (Housekeepers Tab) */}
                    {activeTab === 'housekeepers' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Section (Column span 2) */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Housekeeper List Header */}
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                        <Crown size={18} className="text-amber-400" />
                                        영지 지정 하우스키퍼 명단 ({housekeeperCompanions.length}명)
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        *하우스키퍼 1명당 하루 1회 선택한 주택을 청소할 수 있습니다. (1시간 소요)
                                    </p>
                                </div>

                                {housekeeperCompanions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                                        <Wrench size={36} className="mx-auto text-slate-600 mb-2 animate-pulse" />
                                        <p className="font-bold text-sm text-slate-300">현재 하우스키퍼 직업을 가진 동료가 없습니다.</p>
                                        <p className="text-xs text-slate-500 mt-1">동료 상태창의 [직업 권유] 메뉴를 통해 '하우스 키퍼'로 지정할 수 있습니다.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {housekeeperCompanions.map(comp => {
                                            const rank = comp.housekeeperRank || HousekeeperRank.BEGINNER;
                                            const rankCfg = HOUSEKEEPER_RANK_CONFIG[rank];
                                            const level = comp.housekeeperLevel || 1;
                                            const exp = comp.housekeeperExp || 0;
                                            const reqExp = 100;
                                            const assignedHouse = houses.find(h => h.assignedHousekeeperId === comp.id);
                                            const avatar = getCompanionAvatar(comp);

                                            // 다음 등급 요구 조건 계산 (수동 승급)
                                            const housekeeperRanksInOrder = [
                                                HousekeeperRank.BEGINNER,
                                                HousekeeperRank.INTERMEDIATE,
                                                HousekeeperRank.ADVANCED,
                                                HousekeeperRank.SUPERIOR,
                                                HousekeeperRank.PROFESSIONAL,
                                                HousekeeperRank.MASTER,
                                                HousekeeperRank.LEGEND
                                            ];
                                            const currentRankIdx = housekeeperRanksInOrder.indexOf(rank);
                                            const nextRank = currentRankIdx < housekeeperRanksInOrder.length - 1 ? housekeeperRanksInOrder[currentRankIdx + 1] : null;
                                            const nextRankCfg = nextRank ? HOUSEKEEPER_RANK_CONFIG[nextRank] : null;
                                            const reqWis = nextRank ? HOUSEKEEPER_PROMOTION_WIS_REQ[nextRank] : 0;
                                            const reqLevel = nextRank ? (
                                                nextRank === HousekeeperRank.INTERMEDIATE ? 21 :
                                                nextRank === HousekeeperRank.ADVANCED ? 41 :
                                                nextRank === HousekeeperRank.SUPERIOR ? 61 :
                                                nextRank === HousekeeperRank.PROFESSIONAL ? 81 :
                                                nextRank === HousekeeperRank.MASTER ? 91 : 100
                                            ) : 100;

                                            const compStats = calculateFinalStats(comp).finalStats;
                                            const currentWis = compStats.wis || 0;
                                            const hasLevelReq = level >= reqLevel;
                                            const hasWisReq = currentWis >= reqWis;
                                            const canPromote = nextRank !== null && hasLevelReq && hasWisReq;

                                            const isCleanedToday = comp.lastHousekeeperCleanDate === character.currentDate;
                                            const targetHouseId = selectedCleanHouses[comp.id] || assignedHouse?.id || houses[0]?.id || '';

                                            const handleHousekeeperPromote = () => {
                                                if (!nextRank || !nextRankCfg) return;
                                                if (!hasLevelReq) {
                                                    alert(`[승급 불가] 레벨 ${reqLevel} 이상이 필요합니다. (현재 Lv.${level})`);
                                                    return;
                                                }
                                                if (!hasWisReq) {
                                                    alert(`[승급 불가] 지혜(WIS) ${reqWis} 이상이 필요합니다. (현재 ${currentWis}/${reqWis})`);
                                                    return;
                                                }

                                                // 승급 진행
                                                const updatedCompanions = character.companions.map(c => {
                                                    if (c.id === comp.id) {
                                                        return { ...c, housekeeperRank: nextRank };
                                                    }
                                                    return c;
                                                });
                                                const updatedInactiveCompanions = (character.inactiveCompanions || []).map(c => {
                                                    if (c.id === comp.id) {
                                                        return { ...c, housekeeperRank: nextRank };
                                                    }
                                                    return c;
                                                });

                                                const updatedChar = {
                                                    ...character,
                                                    companions: updatedCompanions,
                                                    inactiveCompanions: updatedInactiveCompanions
                                                };

                                                onUpdateCharacter(updatedChar, `[하우스키퍼 승급] ${comp.name}이(가) [${nextRankCfg.label}] (으)로 승급했습니다!`);
                                            };

                                            return (
                                                <div key={comp.id} className="bg-slate-950/80 border border-slate-800 hover:border-amber-700/60 rounded-2xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-amber-400 text-sm">
                                                                    {avatar ? (
                                                                        <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                                    ) : comp.name[0]}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                                                        {comp.name}
                                                                        {comp.isLover && <Heart size={12} className="text-rose-400 fill-rose-400" />}
                                                                    </h4>
                                                                    <span className="text-xs text-amber-300 font-semibold bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                                                        {rankCfg?.label || rank} (Lv.{level}) (수용 보너스 +{rankCfg?.coef}채)
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <span className="text-[11px] text-slate-400 font-mono">
                                                                Exp: {exp} / {level >= 100 ? 'MAX' : reqExp}
                                                            </span>
                                                        </div>

                                                        {/* EXP Bar */}
                                                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                                                                style={{ width: `${level >= 100 ? 100 : Math.min(100, (exp / reqExp) * 100)}%` }}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            <div className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                                                                <span className="text-slate-400">지혜 스탯:</span>
                                                                <span className={`font-semibold ${nextRank ? (hasWisReq ? 'text-emerald-400' : 'text-rose-400') : 'text-amber-300'}`}>
                                                                    {currentWis} {nextRank ? `/ ${reqWis}` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                                                                <span className="text-slate-400">담당 전담 주택:</span>
                                                                <span className={assignedHouse ? 'text-amber-300 font-semibold' : 'text-slate-500'}>
                                                                    {assignedHouse ? getHouseDisplayName(assignedHouse) : '미지정'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 개별 청소 기능 */}
                                                        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-slate-300 font-semibold flex items-center gap-1">
                                                                    <Wrench size={13} className="text-amber-400" /> 청소 대상 주택 선택
                                                                </span>
                                                                {isCleanedToday ? (
                                                                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                                                        오늘 청소 완료됨
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-amber-400 font-medium">
                                                                        일일 1회 가능
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row gap-2">
                                                                <select
                                                                    value={targetHouseId}
                                                                    onChange={(e) => setSelectedCleanHouses(prev => ({ ...prev, [comp.id]: e.target.value }))}
                                                                    className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-500 truncate cursor-pointer"
                                                                >
                                                                    {houses.map(h => {
                                                                        const c = h.cleanliness !== undefined ? h.cleanliness : 100;
                                                                        return (
                                                                            <option key={h.id} value={h.id} className="bg-slate-950 text-slate-200">
                                                                                {getHouseDisplayName(h)} (청결도 {c}%)
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                                <button
                                                                    onClick={() => handleCleanHouseByKeeper(comp.id, targetHouseId)}
                                                                    disabled={isCleanedToday || !targetHouseId}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                                                                        isCleanedToday
                                                                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold active:scale-95 shadow-md shadow-amber-900/20'
                                                                    }`}
                                                                >
                                                                    <ShieldCheck size={14} />
                                                                    {isCleanedToday ? '오늘 완료됨' : '주택 청소 (1시간)'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                                                        {nextRankCfg ? (
                                                            <div className="text-[10px] text-slate-400">
                                                                다음: <span className="font-semibold text-amber-300">{nextRankCfg.label}</span>
                                                                <span className="ml-1 text-slate-500">(Lv.{reqLevel}, WIS {reqWis} 필요)</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-amber-400 font-semibold">
                                                                최고 계급 달성
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            {nextRankCfg && (
                                                                <button
                                                                    onClick={handleHousekeeperPromote}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                                                        canPromote 
                                                                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-900/30' 
                                                                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-slate-800'
                                                                    }`}
                                                                >
                                                                    <ArrowUpCircle size={14} />
                                                                    승급
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => onInteractClick(comp)}
                                                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700"
                                                            >
                                                                대화 및 상태
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Chef List Header */}
                                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                        <Utensils size={18} className="text-emerald-400" />
                                        영지 지정 전담 요리사 명단 ({chefCompanions.length}명)
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        *동료 상태 창에서 직업을 '요리사'로 권유하거나 요리 숙련도를 훈련할 수 있습니다.
                                    </p>
                                </div>

                                {chefCompanions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                                        <Utensils size={36} className="mx-auto text-slate-600 mb-2 animate-pulse" />
                                        <p className="font-bold text-sm text-slate-300">현재 요리사 직업 또는 요리 숙련도를 보유한 동료가 없습니다.</p>
                                        <p className="text-xs text-slate-500 mt-1">동료 상태창의 [직업 권유] 메뉴를 통해 '요리사'로 지정하여 숙소의 식량을 면제할 수 있습니다.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {chefCompanions.map(comp => {
                                            const chefInfo = getCompanionChefRank(comp);
                                            const assignedHouse = houses.find(h => h.assignedChefId === comp.id);
                                            const avatar = getCompanionAvatar(comp);
                                            const mastery = comp.professions?.cooking || { level: 1, exp: 0, maxExp: 100 };

                                            return (
                                                <div key={comp.id} className="bg-slate-950/80 border border-slate-800 hover:border-emerald-700/60 rounded-2xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-emerald-400 text-sm">
                                                                    {avatar ? (
                                                                        <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                                    ) : comp.name[0]}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                                                        {comp.name}
                                                                        {comp.isLover && <Heart size={12} className="text-rose-400 fill-rose-400" />}
                                                                    </h4>
                                                                    <span className="text-xs text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                                                        {chefInfo.label} (Lv.{chefInfo.level})
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <span className="text-[11px] text-slate-400 font-mono">
                                                                Exp: {mastery.exp} / {mastery.maxExp}
                                                            </span>
                                                        </div>

                                                        {/* EXP Bar */}
                                                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                                                                style={{ width: `${Math.min(100, (mastery.exp / (mastery.maxExp || 100)) * 100)}%` }}
                                                            />
                                                        </div>

                                                        <div className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-400">전담 주택:</span>
                                                                <span className={assignedHouse ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
                                                                    {assignedHouse ? getHouseDisplayName(assignedHouse) : '미지정'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[11px]">
                                                                <span className="text-slate-400">배치 가능 주택:</span>
                                                                <span className="text-slate-300 font-mono">
                                                                    {chefInfo.config.allowedHouses.length === 5 ? '모든 주택 가능' : chefInfo.config.allowedHouses.length === 1 ? '1층 주택 전용' : '2층 주택 이하'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                                                        <button
                                                            onClick={() => onInteractClick(comp)}
                                                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700"
                                                        >
                                                            대화 및 상태
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Right Section (Column span 1) */}
                            <div className="lg:col-span-1 space-y-5">
                                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                            <Award size={16} />
                                            하우스키퍼 직급 정보
                                        </h4>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            하우스키퍼는 청소 시 숙련도(Exp)를 획득하며 아래 단계로 자동 승급합니다.
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                                                    <th className="pb-2">직급</th>
                                                    <th className="pb-2 text-center">건설한도</th>
                                                    <th className="pb-2 text-right">숙련 레벨 범위</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900">
                                                {Object.values(HousekeeperRank).map((rank) => {
                                                    const cfg = HOUSEKEEPER_RANK_CONFIG[rank];
                                                    const getLevelRange = (r: HousekeeperRank) => {
                                                        if (r === HousekeeperRank.BEGINNER) return "1 ~ 20";
                                                        if (r === HousekeeperRank.INTERMEDIATE) return "21 ~ 40";
                                                        if (r === HousekeeperRank.ADVANCED) return "41 ~ 60";
                                                        if (r === HousekeeperRank.SUPERIOR) return "61 ~ 80";
                                                        if (r === HousekeeperRank.PROFESSIONAL) return "81 ~ 90";
                                                        if (r === HousekeeperRank.MASTER) return "91 ~ 99";
                                                        return "100";
                                                    };
                                                    return (
                                                        <tr key={rank} className="hover:bg-slate-900/40">
                                                            <td className="py-2.5 font-medium text-slate-200">{cfg.label}</td>
                                                            <td className="py-2.5 text-center text-amber-300 font-bold">+{cfg.coef}채</td>
                                                            <td className="py-2.5 text-right font-mono text-slate-400">
                                                                Lv. {getLevelRange(rank)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1.5">
                                        <p className="font-bold text-slate-300">💡 하우스키퍼 전담 효과</p>
                                        <p>• 각 주택에 하우스키퍼를 전담 배치하면 수용 능력이 <strong>직급 계수(건설한도)</strong>만큼 추가 보너스로 증가합니다.</p>
                                        <p>• 전담 하우스키퍼가 있는 주택은 일일 청결도가 <strong>100%</strong>로 항시 유지됩니다.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                            <Utensils size={16} />
                                            요리사 등급 및 숙소 배치 기준
                                        </h4>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            요리사는 숙소 식사 준비 시 숙련도를 획득하며 등급에 따라 배치 가능한 주택이 확장됩니다.
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                                                    <th className="pb-2">등급</th>
                                                    <th className="pb-2 text-center">요구레벨</th>
                                                    <th className="pb-2 text-right">배치 가능 숙소</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900">
                                                {Object.values(ChefRank).map((rank) => {
                                                    const cfg = CHEF_RANK_CONFIG[rank];
                                                    let allowedText = "1층 주택";
                                                    if (rank === ChefRank.SKILLED || rank === ChefRank.ARTISAN) allowedText = "2층 주택 이하";
                                                    else if (rank === ChefRank.MASTER) allowedText = "빌라 / 초호화 이하";
                                                    else if (rank === ChefRank.LEGEND) allowedText = "아파트 포함 전체";

                                                    return (
                                                        <tr key={rank} className="hover:bg-slate-900/40">
                                                            <td className="py-2 font-medium text-emerald-300">{cfg.label}</td>
                                                            <td className="py-2 text-center text-slate-300 font-mono">Lv.{cfg.minLevel}+</td>
                                                            <td className="py-2 text-right text-amber-300 text-[11px]">{allowedText}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1.5">
                                        <p className="font-bold text-emerald-300">🍳 요리사 식량 절감 규칙</p>
                                        <p>• <strong>숙소 전담 요리사</strong>: 해당 주택의 모든 거주자는 일일 식량 소모가 <strong>0개</strong>로 완전 면제됩니다.</p>
                                        <p>• <strong>요리 시설 담당 요리사</strong>: 기지 요리 시설에 요리사가 근무 중이면 전체 식량 소모량이 <strong>50% 절반</strong>으로 줄어듭니다.</p>
                                        <p>• <strong>식량 고갈 패널티</strong>: 식량이 부족해 굶주릴 경우 거주자들의 <strong>호감도와 충성도</strong>가 하락합니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 신축 주택 선택 모달 (Build Modal) */}
            <AnimatePresence>
                {isBuildModalOpen && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-amber-600/60 rounded-2xl max-w-2xl w-full p-5 shadow-2xl text-slate-100"
                        >
                            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                                    <Building size={18} /> 신규 주택 건축 지정
                                </h3>
                                <button onClick={() => setIsBuildModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 mb-4">
                                건립할 주택의 양식과 종류를 선택해주세요. (현재 건축 가능: <strong className="text-amber-300">{houses.length}/{maxCount}채</strong>)
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 mb-5">
                                {buildableHouseTypes.map((type) => {
                                    const cfg = HOUSE_TYPE_CONFIG[type];
                                    const isSelected = selectedHouseTypeToBuild === type;
                                    const { gold, wood, stone, iron = 0 } = cfg.cost;

                                    return (
                                        <div
                                            key={type}
                                            onClick={() => setSelectedHouseTypeToBuild(type)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                isSelected 
                                                ? 'bg-amber-950/60 border-amber-400 shadow-md ring-1 ring-amber-400' 
                                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-sm text-slate-100">{cfg.name}</h4>
                                                    <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-md">
                                                        {cfg.capacity}명 거주
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                                                    {cfg.description}
                                                </p>

                                                {cfg.specialEffect && (
                                                    <div className="p-1.5 mb-2 bg-amber-900/40 border border-amber-700/60 rounded-lg text-[10px] text-amber-200 font-semibold">
                                                        ✨ {cfg.specialEffect}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-1 font-mono">
                                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                                    <span>비용:</span>
                                                    {gold > 0 && <span className="text-amber-300">{gold.toLocaleString()}G</span>}
                                                    {wood > 0 && <span className="text-emerald-300">목재 {wood}</span>}
                                                    {stone > 0 && <span className="text-slate-300">석재 {stone}</span>}
                                                    {iron > 0 && <span className="text-cyan-300">철 {iron}</span>}
                                                    {gold === 0 && wood === 0 && <span className="text-emerald-400 font-bold">무료 (0G)</span>}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-amber-300/90 font-bold">
                                                    <Clock size={10} />
                                                    {(() => {
                                                        const dur = getHouseConstructionDuration(type, false, 1);
                                                        const { completionDate, completionTime } = calculateCompletionDateTime(character.currentDate || '2000-03-02', character.currentTime || '08:00', dur);
                                                        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
                                                        return <span>소요: {rem.text}</span>;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    onClick={() => setIsBuildModalOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleConfirmBuildHouse}
                                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md active:scale-95"
                                >
                                    건축하기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 특정 집 동료 배치 전용 팝업 */}
            <AnimatePresence>
                {selectedHouseForAssign && (() => {
                    const targetHouse = houses.find(h => h.id === selectedHouseForAssign);
                    if (!targetHouse) return null;

                    const targetHouseDisplayName = getHouseDisplayName(targetHouse);
                    const currentResidents = getResidentsOfHouse(selectedHouseForAssign);
                    const isUnderConstruction = targetHouse.underConstruction && (!targetHouse.level || targetHouse.level === 0);
                    const targetCapacity = getHouseEffectiveCapacity(targetHouse);
                    const isTargetFull = currentResidents.length >= targetCapacity || isUnderConstruction;

                    // 필터링된 동료 목록
                    const assignableCompanions = allCompanions.filter(comp => {
                        if (assignSearchQuery.trim()) {
                            const query = assignSearchQuery.toLowerCase();
                            const matchName = comp.name.toLowerCase().includes(query);
                            const matchJob = comp.job?.toLowerCase().includes(query);
                            if (!matchName && !matchJob) return false;
                        }

                        const isResident = houseAssignments[comp.id] === selectedHouseForAssign;
                        const isUnassigned = !houseAssignments[comp.id] || !houses.some(h => h.id === houseAssignments[comp.id]);

                        if (assignFilter === 'unassigned' && !isUnassigned) return false;
                        if (assignFilter === 'thisHouse' && !isResident) return false;

                        return true;
                    });

                    return (
                        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]"
                            >
                                {/* 모달 헤더 */}
                                <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-2.5">
                                    <div className="min-w-0 flex-1 pr-2">
                                        <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-1.5 truncate">
                                            <UserPlus size={16} className="text-amber-400 shrink-0" /> 
                                            '{targetHouseDisplayName}' 거주자 배치
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                            {isUnderConstruction ? (
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold flex items-center gap-1">
                                                    <Hammer size={12} className="animate-bounce" /> 공사 진행 중 (완공 전 입주 불가)
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400">수용 정원:</span>
                                                    <span className={`font-bold ${isTargetFull ? 'text-rose-400' : 'text-amber-300'}`}>
                                                        {currentResidents.length} / {targetCapacity}명
                                                    </span>
                                                    {isTargetFull ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                                                            만실 (입주 불가)
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-medium">
                                                            {targetCapacity - currentResidents.length}명 여유
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSelectedHouseForAssign(null);
                                            setAssignSearchQuery('');
                                            setAssignFilter('all');
                                        }} 
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                        title="닫기"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* 검색 및 빠른 필터 (모바일 최적화) */}
                                <div className="space-y-2 mb-3">
                                    <div className="relative">
                                        <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={assignSearchQuery}
                                            onChange={e => setAssignSearchQuery(e.target.value)}
                                            placeholder="동료 이름 또는 직업 검색..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                                        <button
                                            onClick={() => setAssignFilter('all')}
                                            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-[11px] ${
                                                assignFilter === 'all'
                                                ? 'bg-amber-600 text-slate-950 font-bold'
                                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            전체 ({allCompanions.length})
                                        </button>
                                        <button
                                            onClick={() => setAssignFilter('unassigned')}
                                            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-[11px] ${
                                                assignFilter === 'unassigned'
                                                ? 'bg-rose-600 text-white font-bold'
                                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            노숙자만 ({unassignedResidents.length})
                                        </button>
                                        <button
                                            onClick={() => setAssignFilter('thisHouse')}
                                            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-[11px] ${
                                                assignFilter === 'thisHouse'
                                                ? 'bg-emerald-600 text-white font-bold'
                                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            현재 주택 거주 ({currentResidents.length})
                                        </button>
                                    </div>
                                </div>

                                {/* 동료 목록 */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
                                    {assignableCompanions.length === 0 ? (
                                        <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                                            해당 조건의 동료가 없습니다.
                                        </div>
                                    ) : (
                                        assignableCompanions.map(comp => {
                                            const isResidentInThisHouse = houseAssignments[comp.id] === selectedHouseForAssign;
                                            const currentHouseId = houseAssignments[comp.id];
                                            const otherHouse = currentHouseId ? houses.find(h => h.id === currentHouseId) : null;
                                            const avatar = getCompanionAvatar(comp);
                                            const isUnassigned = !currentHouseId || !otherHouse;
                                            const isParty = partyIdSet.has(comp.id);

                                            return (
                                                <div 
                                                    key={comp.id}
                                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                                                        isResidentInThisHouse 
                                                        ? 'bg-amber-950/40 border-amber-600/70 shadow-sm' 
                                                        : isUnassigned
                                                        ? 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30'
                                                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-amber-400">
                                                            {avatar ? (
                                                                <img src={avatar} alt={comp.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                            ) : comp.name[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-xs font-bold text-slate-100 truncate">{comp.name}</span>
                                                                {comp.isLover && <Heart size={10} className="text-rose-400 fill-rose-400 shrink-0" />}
                                                                
                                                                {/* 거주 상태 배지 (현재 주택, 타 숙소 거주, 노숙 중) */}
                                                                {isResidentInThisHouse ? (
                                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold shrink-0">
                                                                        현재 주택 거주
                                                                    </span>
                                                                ) : otherHouse ? (
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-medium shrink-0 truncate max-w-[130px]">
                                                                        📍 {getHouseDisplayName(otherHouse)} 거주
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-700 text-rose-300 text-[10px] font-bold shrink-0">
                                                                        ⚠️ {isParty ? '파티 동행 (노숙)' : '노숙 중'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                                Lv.{comp.level} | {comp.job || '무직'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0">
                                                        {isResidentInThisHouse ? (
                                                            <button
                                                                onClick={() => handleAssignHouse(comp.id, null)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700 transition-all active:scale-95 min-h-[36px] flex items-center justify-center"
                                                            >
                                                                퇴거
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled={isTargetFull}
                                                                onClick={() => handleAssignHouse(comp.id, selectedHouseForAssign)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center justify-center ${
                                                                    isTargetFull
                                                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                                    : 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold shadow-sm'
                                                                }`}
                                                            >
                                                                {isTargetFull ? '정원 초과' : (otherHouse ? '이사하기' : '입주하기')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* 모달 푸터 */}
                                <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center">
                                    <span className="text-[11px] text-slate-500">
                                        현재 주택 거주: <strong className="text-slate-300">{currentResidents.length}</strong> / {targetCapacity}명
                                    </span>
                                    <button
                                        onClick={() => {
                                            setSelectedHouseForAssign(null);
                                            setAssignSearchQuery('');
                                            setAssignFilter('all');
                                        }}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl transition-all"
                                    >
                                        완료
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* 주택 증축 및 승격 확인 모달 (Upgrade Confirmation Modal) */}
            <AnimatePresence>
                {upgradingHouseId && (() => {
                    const house = houses.find(h => h.id === upgradingHouseId);
                    if (!house) return null;

                    const isMyHome = house.id === 'my_home_default' || house.type === HouseType.MY_HOME;
                    const nextLevel = house.level + 1;
                    const costGold = 5000 * house.level;
                    const costWood = 10 * house.level;
                    const costStone = 10 * house.level;

                    // 현재 플레이어의 자원량
                    const userGold = character.money;
                    const userWood = base?.resources?.wood || 0;
                    const userStone = base?.resources?.stone || 0;

                    // 충분한지 여부
                    const hasGold = userGold >= costGold;
                    const hasWood = userWood >= costWood;
                    const hasStone = userStone >= costStone;
                    const canAfford = hasGold && hasWood && hasStone;

                    // 예상 결과 계산
                    let newType = house.type;
                    let baseCapBoost = 2;
                    let nextLevelReal = nextLevel;
                    let newName = house.name;
                    let isPromotion = false;
                    let promotionTitle = "";

                    if (house.type === HouseType.HOUSE_1F) {
                        baseCapBoost = 2;
                        if (nextLevel >= 3) {
                            newType = HouseType.HOUSE_2F;
                            nextLevelReal = 1; // 2층 주택 Lv.1로 승격
                            newName = house.name.replace("1층 주택", "2층 주택");
                            if (newName === house.name) {
                                newName = `2층 주택 ${house.id.split('_').pop() || '1'}호`;
                            }
                            isPromotion = true;
                            promotionTitle = "2층 주택 Lv.1 승격";
                        }
                    } else if (house.type === HouseType.HOUSE_2F) {
                        baseCapBoost = 4;
                        if (nextLevel >= 3) {
                            newType = HouseType.VILLA;
                            nextLevelReal = 1; // 빌라 Lv.1로 승격
                            newName = house.name.replace("2층 주택", "빌라");
                            if (newName === house.name) {
                                newName = `빌라 ${house.id.split('_').pop() || '1'}호`;
                            }
                            isPromotion = true;
                            promotionTitle = "빌라 Lv.1 승격";
                        }
                    } else if (house.type === HouseType.VILLA) {
                        baseCapBoost = 5;
                        if (nextLevel >= 3) {
                            newType = HouseType.APARTMENT;
                            nextLevelReal = 1; // 아파트 Lv.1로 승격
                            newName = house.name.replace("빌라", "아파트");
                            if (newName === house.name) {
                                newName = `아파트 ${house.id.split('_').pop() || '1'}호`;
                            }
                            isPromotion = true;
                            promotionTitle = "아파트 Lv.1 승격";
                        }
                    } else if (house.type === HouseType.APARTMENT) {
                        baseCapBoost = 10;
                    } else if (house.type === HouseType.LUXURY) {
                        baseCapBoost = 5;
                    } else if (isMyHome) {
                        baseCapBoost = 2;
                        if (nextLevel >= 3) {
                            newType = HouseType.LUXURY; // 나의 집 Lv 3+ 증축 시 초호화 대저택으로 전환
                            newName = "나의 초호화 대저택";
                            isPromotion = true;
                            promotionTitle = "나의 초호화 대저택 승격";
                        }
                    }

                    const nextTypeConfig = HOUSE_TYPE_CONFIG[newType];
                    const newCapacity = (newType !== house.type) ? nextTypeConfig.capacity : (house.capacity + baseCapBoost);

                    return (
                        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl text-slate-100 animate-in fade-in duration-200"
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                    <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                                        <ArrowUpCircle size={18} className="text-amber-400" /> 주택 증축 계획 수립
                                    </h3>
                                    <button onClick={() => setUpgradingHouseId(null)} className="text-slate-400 hover:text-white">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* 대상 주택 정보 */}
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-semibold mb-1">증축 대상 주택</div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-bold text-slate-200 text-sm">{getHouseDisplayName(house)}</span>
                                            <span className="text-xs text-slate-400">현재 Lv.{house.level} (정원 {house.capacity}명)</span>
                                        </div>
                                    </div>

                                    {/* 필요한 소모 재료 */}
                                    <div>
                                        <div className="text-xs font-bold text-amber-300/90 mb-2 flex items-center gap-1">
                                            <Wrench size={12} /> 필요 재료 및 자원
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {/* 골드 */}
                                            <div className={`p-2.5 rounded-xl border text-center font-mono ${hasGold ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-rose-950/20 border-rose-800/60'}`}>
                                                <div className="text-[10px] text-slate-400 mb-0.5">골드</div>
                                                <div className={`text-xs font-bold ${hasGold ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {costGold.toLocaleString()}G
                                                </div>
                                                <div className="text-[9px] text-slate-500 mt-0.5">
                                                    보유: {userGold.toLocaleString()}G
                                                </div>
                                            </div>

                                            {/* 목재 */}
                                            <div className={`p-2.5 rounded-xl border text-center font-mono ${hasWood ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-rose-950/20 border-rose-800/60'}`}>
                                                <div className="text-[10px] text-slate-400 mb-0.5">목재</div>
                                                <div className={`text-xs font-bold ${hasWood ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {costWood}개
                                                </div>
                                                <div className="text-[9px] text-slate-500 mt-0.5">
                                                    보유: {userWood}개
                                                </div>
                                            </div>

                                            {/* 석재 */}
                                            <div className={`p-2.5 rounded-xl border text-center font-mono ${hasStone ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-rose-950/20 border-rose-800/60'}`}>
                                                <div className="text-[10px] text-slate-400 mb-0.5">석재</div>
                                                <div className={`text-xs font-bold ${hasStone ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {costStone}개
                                                </div>
                                                <div className="text-[9px] text-slate-500 mt-0.5">
                                                    보유: {userStone}개
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 증축 예상 결과 */}
                                    <div className="bg-slate-950/60 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                            <Sparkles size={12} /> 증축 시 예상되는 변화
                                        </div>
                                        <div className="space-y-1.5 text-xs text-slate-300">
                                            <div className="flex justify-between items-center">
                                                <span>건물 레벨:</span>
                                                <div className="flex items-center gap-1 font-mono font-bold">
                                                    <span className="text-slate-400">Lv.{house.level}</span>
                                                    <span className="text-slate-500">→</span>
                                                    <span className="text-amber-400">Lv.{nextLevelReal}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>수용 정원:</span>
                                                <div className="flex items-center gap-1 font-mono font-bold">
                                                    <span className="text-slate-400">{house.capacity}명</span>
                                                    <span className="text-slate-500">→</span>
                                                    <span className="text-emerald-400">{newCapacity}명</span>
                                                </div>
                                            </div>
                                            {(() => {
                                                const dur = getHouseConstructionDuration(house.type, true, house.level);
                                                const { completionDate, completionTime } = calculateCompletionDateTime(
                                                    character.currentDate || '2000-03-02',
                                                    character.currentTime || '08:00',
                                                    dur
                                                );
                                                const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                                                            <span className="flex items-center gap-1 text-slate-400">
                                                                <Clock size={11} className="text-amber-400" /> 공사 소요 시간:
                                                            </span>
                                                            <span className="font-bold text-amber-300">{rem.text}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-slate-400">완공 예정 일시:</span>
                                                            <span className="font-mono text-white font-bold">{completionDate} {completionTime}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            {isPromotion && (
                                                <div className="p-2 bg-amber-950/40 border border-amber-800/50 rounded-lg text-[11px] text-amber-300 font-medium mt-1 leading-relaxed">
                                                    🎉 <strong>최고 레벨 돌파 승격!</strong>
                                                    <div className="mt-0.5 text-slate-400">건물이 한 단계 높은 양식인 <span className="text-amber-200">'{promotionTitle}'</span>(으)로 리모델링 및 승격됩니다!</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!canAfford && (
                                        <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-[11px] text-rose-300 leading-normal">
                                            <AlertTriangle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                                            <div>
                                                일부 증축 재료가 부족하여 증축을 진행할 수 없습니다. 던전 채굴이나 상점, 탐험 등을 통해 필요한 자원을 확보하십시오.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
                                    <button
                                        onClick={() => setUpgradingHouseId(null)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!canAfford) return;
                                            handleUpgradeHouse(house.id);
                                            setUpgradingHouseId(null);
                                        }}
                                        disabled={!canAfford}
                                        className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all ${
                                            canAfford
                                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 active:scale-95'
                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        증축 시작
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default HousingModal;
