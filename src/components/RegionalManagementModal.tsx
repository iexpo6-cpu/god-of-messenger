import React, { useState, useMemo, useEffect } from 'react';
import { Character, RegionalStats, Companion, JobType, DispatchMission, MilitaryRank, SimpleStudent } from '../types';
import { 
    X, TowerControl, Shield, Heart, Coins, Users, Loader2, 
    ChevronRight, Info, CheckCircle, Gavel, HandCoins, ArrowDown, 
    Lock, Crown, AlertTriangle, Clock, UserCheck, Building2, MapPin,
    ShieldAlert, Swords, Castle, Sparkles, Plus, Trash2, Mail, Eye, Bell, Flame
} from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { addDays, generateName, generateCompanionStats, generateMilitaryLevelByRank, getYear, generateDefaultVisualUrl, getRaceByNation, assignRandomCombatStyle } from '../utils';
import { INITIAL_BASE, WORLD_GEOGRAPHY, MILITARY_RANK_THRESHOLD } from '@/constants';
import { 
    checkRegionalDefenseAuthority, 
    getRegionDefenseData, 
    recalculateDefensePower, 
    getDefenseRating, 
    calculateMemberDefensePower,
    FORTIFICATION_CONFIG,
    DISPATCH_SEVERITY_CONFIG,
    RegionDefenseData,
    calculateFortificationCompletion,
    getFortificationRemainingTime,
    getDispatchRemainingTime,
    generateThreatEventAndMail,
    startDefenseDispatch,
    completeDefenseDispatch,
    syncRegionDefenseTimeTick,
    calculateDispatchFailChance,
    TerritoryThreatEvent,
    FortificationConstruction,
    DefenseDispatch
} from '../services/territoryDefenseService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type TabType = 'overview' | 'dispatch' | 'status' | 'defense';

const RegionalManagementModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // 세율 및 예산 인출 관련 로컬 상태
    const [localTaxRate, setLocalTaxRate] = useState<number>(10);
    const [withdrawAmount, setWithdrawAmount] = useState<number>(0);

    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const city = loc.city;
    const nation = loc.nation;

    // --- 0. 지역 대장/부대장 미임명 시 자동 생성/임명 처리 (MilitaryFacilityModal과 동일한 로직) ---
    useEffect(() => {
        if (!character.currentLocation) return;
        
        const currentNation = character.currentLocation.nation;
        const currentRegion = character.currentLocation.region;
        const nationCities = WORLD_GEOGRAPHY[currentRegion]?.[currentNation]?.cities || [];
        
        if (nationCities.length === 0) return;

        let needsUpdate = false;
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        
        const cYear = getYear(newChar.currentDate || '2000-01-01');
        const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        if (!newChar.militaryData) {
            newChar.militaryData = { rank: (newChar.militaryRank || MilitaryRank.PVT), enlistedDate: newChar.currentDate || '2000-01-01', merit: 0, completedMissions: 0, availableMissions: [], activeMissions: [] };
        }
        if (!newChar.militaryData.regionalAppointments) newChar.militaryData.regionalAppointments = {};
        if (!newChar.militaryData.regionalViceAppointments) newChar.militaryData.regionalViceAppointments = {};

        nationCities.forEach(cityName => {
            if (!newChar.militaryData!.regionalAppointments![cityName]) {
                const isCapital = WORLD_GEOGRAPHY[currentRegion]?.[currentNation]?.capital === cityName;
                const rRank = isCapital ? MilitaryRank.COL : [MilitaryRank.MAJ, MilitaryRank.LTC][Math.floor(Math.random() * 2)];
                const level = generateMilitaryLevelByRank(rRank);
                const id = `npc_auto_cmdr_${cityName}_${currentNation}`;
                
                const gender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = gender === "남성" ? "male" : "female";
                const name = generateName(currentNation, genderParam);
                const race = getRaceByNation(currentNation);
                const npc: SimpleStudent = assignRandomCombatStyle({
                    id, name, age: `${35 + Math.floor(Math.random() * 15)}세`,
                    birthYear: cYear - (35 + Math.floor(Math.random() * 15)), gender,
                    race: race, nation: currentNation, level, classType: "군인",
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${cityName}의 안보를 책임지는 노련한 지휘관입니다.`,
                    stats: generateCompanionStats(level), affection: 0, job: JobType.SOLDIER,
                    militaryRank: rRank, merit: MILITARY_RANK_THRESHOLD[rRank], isStaticRank: true, origin: "군대", originName: `${cityName} 지휘부`,
                    visualUrl: generateDefaultVisualUrl(name, currentNation, race, gender)
                }, true);
                newChar.socialNetwork!.push(npc);
                newChar.militaryData!.regionalAppointments![cityName] = id;
                needsUpdate = true;
            }

            if (!newChar.militaryData!.regionalViceAppointments![cityName]) {
                const rRank = [MilitaryRank.SLT, MilitaryRank.FLT, MilitaryRank.CPT][Math.floor(Math.random() * 3)];
                const level = generateMilitaryLevelByRank(rRank);
                const id = `npc_auto_vice_${cityName}_${currentNation}`;
                
                const gender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = gender === "남성" ? "male" : "female";
                const name = generateName(currentNation, genderParam);
                const race = getRaceByNation(currentNation);
                const npc: SimpleStudent = assignRandomCombatStyle({
                    id, name, age: `${24 + Math.floor(Math.random() * 10)}세`,
                    birthYear: cYear - (24 + Math.floor(Math.random() * 10)), gender,
                    race: race, nation: currentNation, level, classType: "군인",
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${cityName} 지휘부를 보좌하는 유능한 장교입니다.`,
                    stats: generateCompanionStats(level), affection: 0, job: JobType.SOLDIER,
                    militaryRank: rRank, merit: MILITARY_RANK_THRESHOLD[rRank], isStaticRank: true, origin: "군대", originName: `${cityName} 지휘부`,
                    visualUrl: generateDefaultVisualUrl(name, currentNation, race, gender)
                }, true);
                newChar.socialNetwork!.push(npc);
                newChar.militaryData!.regionalViceAppointments![cityName] = id;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            onUpdateCharacter(newChar, "");
        }
    }, [character.currentLocation?.nation, character.currentLocation?.region]);

    // 전체 인물 풀 (동료 + 비활성 동료 + 군사 소셜 인맥)
    const allPersons = useMemo(() => {
        const comps = [...character.companions, ...(character.inactiveCompanions || [])];
        const socials = character.socialNetwork || [];
        return [...comps, ...socials];
    }, [character.companions, character.inactiveCompanions, character.socialNetwork]);

    // --- 1. 권한 및 보직 데이터 확인 ---
    const mData = character.militaryData;
    const cityCommanderId = mData?.regionalAppointments?.[city];
    const cityViceId = mData?.regionalViceAppointments?.[city];

    const authorityLevel = useMemo(() => {
        if (cityCommanderId === 'player') return 2;
        if (cityViceId === 'player') return 1;
        if (character.companions.some(c => c.id === cityCommanderId)) return 2;
        if (character.companions.some(c => c.id === cityViceId)) return 1;
        return 0;
    }, [character, cityCommanderId, cityViceId]);

    // 대장 및 부대장 정보 도출 (전체 인물 풀에서 정확히 조회)
    const commanderInfo = useMemo(() => {
        if (!cityCommanderId) return { name: '미임명 (부재 중)', type: 'none', rank: '-', isPlayer: false };
        if (cityCommanderId === 'player') return { name: character.name, type: 'player', rank: character.militaryRank || '최고 지휘관', isPlayer: true };
        const found = allPersons.find(c => c.id === cityCommanderId);
        if (found) return { name: found.name, type: 'person', rank: found.militaryRank || '군인', isPlayer: false };
        return { name: '알 수 없음', type: 'none', rank: '-', isPlayer: false };
    }, [cityCommanderId, character, allPersons]);

    const viceCommanderInfo = useMemo(() => {
        if (!cityViceId) return { name: '미임명 (부재 중)', type: 'none', rank: '-', isPlayer: false };
        if (cityViceId === 'player') return { name: character.name, type: 'player', rank: character.militaryRank || '지휘관', isPlayer: true };
        const found = allPersons.find(c => c.id === cityViceId);
        if (found) return { name: found.name, type: 'person', rank: found.militaryRank || '군인', isPlayer: false };
        return { name: '알 수 없음', type: 'none', rank: '-', isPlayer: false };
    }, [cityViceId, character, allPersons]);

    // --- 2. 지역 수치 데이터 ---
    const stats = useMemo(() => {
        const existing = character.militaryData?.regionStats?.[city];
        if (existing) return existing;
        return { budget: 50000, security: 50, sentiment: 50, taxRate: 10 } as RegionalStats;
    }, [character.militaryData, city]);

    // 초기 세율 로드
    useEffect(() => {
        if (stats.taxRate !== undefined) setLocalTaxRate(stats.taxRate);
    }, [stats.taxRate]);

    // --- 3. 파견 가능 부대원 필터링 ---
    // 조건: 군인 직업 필수, 파견/시설배치/그룹미션 미수행자, [추가] 현재 지역의 국가와 일치하는 국적만 허용
    // [중요 조건 추가]: 해당 지역 대장 및 다른 모든 지역 대장/부대장 제외
    const availableSoldiers = useMemo(() => {
        const party = character.companions.filter(c => c.job === JobType.SOLDIER && !c.isDead && (!c.nation || c.nation === nation));
        const base = (character.inactiveCompanions || []).filter(c => c.job === JobType.SOLDIER && !c.isDead && (!c.nation || c.nation === nation));
        const all = [...party, ...base];
        
        // 모든 지역의 지역대장 및 지역부대장 ID 집합 생성 (해당 지역대장 + 다른 지역대장 모두 포함)
        const assignedRegionalLeaderIds = new Set<string>();
        if (character.militaryData?.regionalAppointments) {
            Object.values(character.militaryData.regionalAppointments).forEach(id => {
                if (id && id !== 'player') assignedRegionalLeaderIds.add(id);
            });
        }
        if (character.militaryData?.regionalViceAppointments) {
            Object.values(character.militaryData.regionalViceAppointments).forEach(id => {
                if (id && id !== 'player') assignedRegionalLeaderIds.add(id);
            });
        }

        return all.filter(c => {
            // 0. 지역대장 또는 지역부대장으로 임명되어 있는 대원은 제외
            if (assignedRegionalLeaderIds.has(c.id)) return false;

            // 1. 기본 파견 확인
            const isBaseDispatched = character.base?.dispatched?.some(d => d.companionId === c.id);
            // 2. 다인 파견(전쟁) 참가 여부 확인
            const isWarDispatched = character.base?.dispatched?.some(d => d.missionType === 'WarInvasion' && (d as any).participants?.includes(c.id));
            // 3. 시설 배치 확인
            const isAssigned = Object.values(character.base?.assignments || {}).includes(c.id);
            // 4. 용병단 그룹 미션 확인
            const isGroupBusy = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(c.id));
            // 5. 성전 인력 배치 확인
            const isTempleBusy = Object.values(character.base?.templePersonnel || {}).some(tp => 
                tp.priestId === c.id || tp.subPriestId === c.id || tp.knightIds.includes(c.id) || tp.butlerIds.includes(c.id) || tp.maidIds.includes(c.id)
            );

            return !isBaseDispatched && !isWarDispatched && !isAssigned && !isGroupBusy && !isTempleBusy;
        });
    }, [character, nation]);

    const activeRegionalDispatches = useMemo(() => {
        return character.base?.dispatched?.filter(d => 
            d.missionType === 'RegionalSecurity' || d.missionType === 'RegionalSentiment'
        ) || [];
    }, [character.base?.dispatched]);

    const MISSION_TYPES = {
        RegionalSecurity: { 
            label: '치안 순찰', 
            icon: Shield, 
            color: 'text-blue-400', 
            reqAuthority: 2, 
            days: 7,
            cost: 3000,
            desc: '도시 내 우범 지대를 순찰하고 범죄를 소탕하여 치안 지수를 높입니다.',
            stat: 'security'
        },
        RegionalSentiment: { 
            label: '민생 지원', 
            icon: Heart, 
            color: 'text-pink-400', 
            reqAuthority: 1, 
            days: 5,
            cost: 2000,
            desc: '주민 구호 및 공공사업을 시행하여 주민 민심 지수를 향상시킵니다.',
            stat: 'sentiment'
        }
    };

    // --- 영지 방어 체계 데이터 및 권한 ---
    const defenseAuthority = useMemo(() => {
        return checkRegionalDefenseAuthority(character, city, authorityLevel);
    }, [character, city, authorityLevel]);

    const defenseData = useMemo(() => {
        return getRegionDefenseData(character, city);
    }, [character, city]);

    const currentDefensePower = useMemo(() => {
        return recalculateDefensePower(defenseData, allPersons as any);
    }, [defenseData, allPersons]);

    const defenseRating = useMemo(() => {
        return getDefenseRating(currentDefensePower);
    }, [currentDefensePower]);

    // 방어 주둔군 배치 가능 대원 (군인 및 용병)
    const availableGarrisonSoldiers = useMemo(() => {
        const party = character.companions.filter(c => (c.job === JobType.SOLDIER || c.job === JobType.MERCENARY) && !c.isDead);
        const base = (character.inactiveCompanions || []).filter(c => (c.job === JobType.SOLDIER || c.job === JobType.MERCENARY) && !c.isDead);
        const all = [...party, ...base];
        return all.filter(c => {
            const isBaseDispatched = character.base?.dispatched?.some(d => d.companionId === c.id);
            const isWarDispatched = character.base?.dispatched?.some(d => d.missionType === 'WarInvasion' && (d as any).participants?.includes(c.id));
            const isAssigned = Object.values(character.base?.assignments || {}).includes(c.id);
            const isGroupBusy = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(c.id));
            return !isBaseDispatched && !isWarDispatched && !isAssigned && !isGroupBusy;
        });
    }, [character]);

    // 주둔 방어군 편성 토글 (배치 / 해제)
    const handleToggleGarrison = (memberId: string) => {
        if (!defenseAuthority.canCommand) {
            alert(defenseAuthority.reason || '영지 방어 최고 지휘권이 없습니다.');
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.militaryData) {
            newChar.militaryData = { rank: character.militaryRank || MilitaryRank.PVT, enlistedDate: character.currentDate || '', merit: 0, completedMissions: 0 };
        }
        if (!(newChar.militaryData as any).regionDefense) {
            (newChar.militaryData as any).regionDefense = {};
        }

        const currentDef: RegionDefenseData = (newChar.militaryData as any).regionDefense[city] || { ...defenseData };
        if (currentDef.activeDispatch) {
            alert('현재 주둔 방어군이 전방 비상 요격 작전에 파견 중이므로 편성을 변경할 수 없습니다.');
            return;
        }

        const isAlreadyIn = currentDef.garrisonIds.includes(memberId);
        const member = allPersons.find(p => p.id === memberId);
        const memberName = member ? member.name : '대원';

        if (isAlreadyIn) {
            currentDef.garrisonIds = currentDef.garrisonIds.filter(id => id !== memberId);
            currentDef.defensePower = recalculateDefensePower(currentDef, allPersons as any);
            (newChar.militaryData as any).regionDefense[city] = currentDef;
            onUpdateCharacter(newChar, `[영지 방어] ${city} 주둔 방어군에서 ${memberName} 대원을 해제했습니다.`);
        } else {
            if (currentDef.garrisonIds.length >= 4) {
                alert('주둔 방어군은 최대 4명까지 편성할 수 있습니다.');
                return;
            }
            currentDef.garrisonIds.push(memberId);
            currentDef.defensePower = recalculateDefensePower(currentDef, allPersons as any);
            (newChar.militaryData as any).regionDefense[city] = currentDef;
            onUpdateCharacter(newChar, `[영지 방어] ${city} 주둔 방어군에 ${memberName} 대원을 배치했습니다.`);
        }
    };

    // 진지 보강 공사 남은 시간 및 진행 상태 계산
    const constructionInfo = useMemo(() => {
        if (!defenseData.construction) return null;
        return getFortificationRemainingTime(
            character.currentDate,
            character.currentTime,
            defenseData.construction.completionDate,
            defenseData.construction.completionTime,
            defenseData.construction.durationMinutes
        );
    }, [defenseData.construction, character.currentDate, character.currentTime]);

    // 비상 요격 파견 작전 남은 시간 및 진행 상태 계산
    const dispatchInfo = useMemo(() => {
        if (!defenseData.activeDispatch) return null;
        return getDispatchRemainingTime(
            character.currentDate,
            character.currentTime,
            defenseData.activeDispatch.returnDate,
            defenseData.activeDispatch.returnTime,
            defenseData.activeDispatch.durationMinutes
        );
    }, [defenseData.activeDispatch, character.currentDate, character.currentTime]);

    // 방어 진지 보강 착공 (시간 소요, 시작 시간 및 완공 시간 계산)
    const handleUpgradeFortification = () => {
        if (!defenseAuthority.canCommand) return;
        if (defenseData.construction) {
            alert('이미 진지 보강 공사가 진행 중입니다.');
            return;
        }

        const nextLevel = (defenseData.fortificationLevel || 1) + 1;
        if (nextLevel > 5) {
            alert('이미 최고 등급의 요새 진지를 구축했습니다.');
            return;
        }

        const nextInfo = FORTIFICATION_CONFIG[nextLevel];
        const cost = nextInfo.cost;
        if (stats.budget < cost) {
            alert(`진지 보강에 필요한 지역 예산(${cost.toLocaleString()} 골드)이 부족합니다.`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const currentStats = newChar.militaryData!.regionStats?.[city] || { ...stats };
            currentStats.budget -= cost;

            if (!newChar.militaryData!.regionStats) newChar.militaryData!.regionStats = {};
            newChar.militaryData!.regionStats[city] = currentStats;

            if (!(newChar.militaryData as any).regionDefense) {
                (newChar.militaryData as any).regionDefense = {};
            }

            const currentDef: RegionDefenseData = (newChar.militaryData as any).regionDefense[city] || { ...defenseData };
            const startDate = newChar.currentDate || '2000-03-02';
            const startTime = newChar.currentTime || '08:00';
            const { completionDate, completionTime } = calculateFortificationCompletion(startDate, startTime, nextInfo.durationMinutes);

            currentDef.construction = {
                targetLevel: nextLevel,
                targetLabel: nextInfo.label,
                cost,
                startDate,
                startTime,
                completionDate,
                completionTime,
                durationMinutes: nextInfo.durationMinutes
            };

            (newChar.militaryData as any).regionDefense[city] = currentDef;

            onUpdateCharacter(newChar, `[영지 방어] ${city} 방어 진지 보강 공사 착공: '${nextInfo.label}' (완공 예정: ${completionDate} ${completionTime})`);

            setResultData({
                type: 'success',
                title: '진지 보강 공사 착공',
                message: `${city}의 방어 진지 보강 공사가 시작되었습니다. 공사 기간 동안 인부와 방어 시설이 구축됩니다.`,
                items: [
                    { label: '목표 진지', after: nextInfo.label },
                    { label: '착공 시각', after: `${startDate} ${startTime}` },
                    { label: '완공 예정', after: `${completionDate} ${completionTime}` },
                    { label: '소모 예산', after: `-${cost.toLocaleString()} G` }
                ]
            });
            setIsProcessing(false);
        }, 900);
    };

    // 진지 보강 공사 완공 승인
    const handleClaimFortificationCompletion = () => {
        if (!defenseAuthority.canCommand || !defenseData.construction) return;
        if (constructionInfo && !constructionInfo.isCompleted) {
            alert(`아직 공사가 진행 중입니다. (남은 시간: ${constructionInfo.text})`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            if (!(newChar.militaryData as any).regionDefense) {
                (newChar.militaryData as any).regionDefense = {};
            }

            const currentDef: RegionDefenseData = (newChar.militaryData as any).regionDefense[city] || { ...defenseData };
            const targetLevel = currentDef.construction?.targetLevel || (currentDef.fortificationLevel + 1);
            const nextInfo = FORTIFICATION_CONFIG[targetLevel];

            currentDef.fortificationLevel = targetLevel;
            currentDef.construction = undefined;
            currentDef.threatLevel = Math.max(0, currentDef.threatLevel - 15);
            currentDef.defensePower = recalculateDefensePower(currentDef, allPersons as any);

            // 치안 상승
            if (newChar.militaryData?.regionStats?.[city]) {
                newChar.militaryData.regionStats[city].security = Math.min(100, newChar.militaryData.regionStats[city].security + 6);
            }

            (newChar.militaryData as any).regionDefense[city] = currentDef;

            onUpdateCharacter(newChar, `[영지 방어] ${city} 방어 진지 보강 공사가 완료되어 '${nextInfo.label}'이(가) 준공되었습니다.`);

            setResultData({
                type: 'success',
                title: '방어 진지 준공 승인',
                message: `${city}의 수비 시설이 성공적으로 완공되어 영지 방어력과 치안이 크게 강화되었습니다.`,
                items: [
                    { label: '준공 진지', after: nextInfo.label },
                    { label: '방어력 증가', after: `+${nextInfo.defenseBonus}` },
                    { label: '위협도 완화', after: '-15%' },
                    { label: '치안 상승', after: '+6%' }
                ]
            });
            setIsProcessing(false);
        }, 800);
    };

    // 외곽 척후 정찰 및 위협 수색 (긴급 위협 이벤트 발생 및 서신 발송 - 한 달에 한 번만 가능)
    const handleTriggerThreatInvestigation = () => {
        if (!defenseAuthority.canCommand) return;
        if (defenseData.activeThreatEvent) {
            alert(`이미 도시 외곽에 미해결 긴급 사태('${defenseData.activeThreatEvent.title}')가 발생해 있습니다. 즉시 비상 요격을 지휘해 주십시오.`);
            return;
        }

        const currentYearMonth = (character.currentDate || '2000-03-02').slice(0, 7);
        if (defenseData.lastScoutMonth === currentYearMonth) {
            alert(`외곽 척후 수색은 한 달에 한 번만 진행할 수 있습니다.\n이번 달(${currentYearMonth})은 이미 척후 수색을 완료했습니다. 다음 달에 다시 수색해 주십시오.`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            if (!(newChar.militaryData as any).regionDefense) {
                (newChar.militaryData as any).regionDefense = {};
            }

            const currentDef: RegionDefenseData = (newChar.militaryData as any).regionDefense[city] || { ...defenseData };
            const { event, mailText } = generateThreatEventAndMail(newChar, city);
            currentDef.activeThreatEvent = event;
            currentDef.lastScoutMonth = currentYearMonth; // 이번 달 척후 수색 완료 기록
            (newChar.militaryData as any).regionDefense[city] = currentDef;

            onUpdateCharacter(newChar, `[영지 서신] ${city} 외곽에 긴급 위협 사태('${event.title}')가 발생하여 서신이 도착했습니다.`);

            setResultData({
                type: 'warning',
                title: '외곽 긴급 사태 포착',
                message: `외곽 척후대의 정찰 결과 비상 위협이 감지되었습니다. 가문 서신함에 상세 긴급 서신이 전달되었습니다. (외곽 척후 수색은 월 1회 가능합니다)`,
                items: [
                    { label: '사태 명칭', after: event.title },
                    { label: '위협 등급', after: event.severity },
                    { label: '권장 전투력', after: `${event.recommendedPower?.toLocaleString() || 1000}` },
                    { label: '방치 시 위험', after: `매일 위협도 +${event.threatIncreasePerDay}%` },
                    { label: '서신 수신', after: '가문 서신함 도착' }
                ]
            });
            setIsProcessing(false);
        }, 900);
    };

    // 비상 요격 작전 (출동 시 즉시 해결이 아니라 주둔군이 수일간 전방 파견 상태가 됨 - 권장 전투력 미달 시 실패 및 전사 위험)
    const handleEmergencySortie = () => {
        if (!defenseAuthority.canCommand) return;
        if (defenseData.activeDispatch) {
            alert('이미 주둔 방어군이 전방 비상 요격 작전에 파견 중입니다. 복귀 완료 후 다음 출동이 가능합니다.');
            return;
        }
        if (!defenseData.activeThreatEvent) {
            alert('현재 도시 외곽에 발생한 긴급 위협 사태가 없습니다. 새로운 위협이 발생했을 때만 출동 가능합니다.');
            return;
        }
        if (defenseData.garrisonIds.length === 0) {
            alert('비상 요격을 지휘할 주둔 방어군이 최소 1명 이상 필요합니다.');
            return;
        }

        const activeEvent = defenseData.activeThreatEvent!;
        const recPower = activeEvent.recommendedPower || 60000;
        const actualPower = currentDefensePower;
        const failChance = calculateDispatchFailChance(actualPower, recPower);

        if (failChance > 0) {
            const confirmed = window.confirm(
                `[작전 경고] 현재 주둔 방어군 전력(${actualPower.toLocaleString()})이 권장 전투력(${recPower.toLocaleString()})보다 낮습니다!\n\n` +
                `작전 실패 확률이 ${failChance}% 존재하며, 작전 실패 시 출동한 주둔 방어군 대원은 전원 전사(사망) 처리됩니다.\n\n` +
                `정말로 비상 요격 출동 명령을 내리시겠습니까?`
            );
            if (!confirmed) return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            if (!(newChar.militaryData as any).regionDefense) {
                (newChar.militaryData as any).regionDefense = {};
            }
            const currentDef: RegionDefenseData = (newChar.militaryData as any).regionDefense[city] || { ...defenseData };

            // 파견 작전 생성 및 출정 서신 발송
            const { dispatch, mailText } = startDefenseDispatch(
                newChar,
                city,
                activeEvent,
                currentDef.garrisonIds,
                currentDefensePower
            );

            currentDef.activeDispatch = dispatch;
            (newChar.militaryData as any).regionDefense[city] = currentDef;

            onUpdateCharacter(
                newChar,
                `[영지 방어] ${city} 주둔 방어군 ${dispatch.garrisonIds.length}명이 '${activeEvent.title}' 토벌을 위해 ${dispatch.durationDays}일간의 파견 작전에 출격했습니다.`
            );

            setResultData({
                type: (dispatch.failChance || 0) > 0 ? 'warning' : 'success',
                title: '비상 요격 부대 출동 및 파견',
                message: `${city} 주둔 방어군이 긴급 위협 사태 토벌을 위해 전방 작전지로 출격했습니다. 작전 기간(${dispatch.durationDays}일) 동안 파견 상태로 유지되며, 토벌 완료 후 대원들과 함께 군공 및 보상을 획득합니다.`,
                items: [
                    { label: '토벌 목표', after: dispatch.threatTitle },
                    { label: '위협 등급', after: dispatch.threatSeverity },
                    { label: '권장 전투력', after: `${dispatch.recommendedPower?.toLocaleString() || recPower.toLocaleString()}` },
                    { label: '부대 전력', after: `${dispatch.actualPower?.toLocaleString()} ${(dispatch.failChance || 0) > 0 ? `(실패 위험 ${dispatch.failChance}%)` : '(승리 확실)'}` },
                    { label: '출동 병력', after: `주둔 방어군 ${dispatch.garrisonIds.length}명` },
                    { label: '파견 기간', after: `${dispatch.durationDays}일간 전방 작전` },
                    { label: '복귀 예정', after: `${dispatch.returnDate} ${dispatch.returnTime}` },
                    { label: '완료 보상', after: `소지금 +${dispatch.rewardGold.toLocaleString()} 골드, 사령관 군공 +${dispatch.rewardMerit}점, 파견 대원 각자 군공 +${dispatch.memberMerit}점` }
                ]
            });
            setIsProcessing(false);
        }, 900);
    };

    // 비상 요격 파견 완료 및 승전/패배 정산
    const handleClaimDispatchCompletion = () => {
        if (!defenseAuthority.canCommand || !defenseData.activeDispatch) return;
        if (dispatchInfo && !dispatchInfo.isCompleted) {
            alert(`아직 주둔 방어군이 전방에서 작전 수행 중입니다. (남은 시간: ${dispatchInfo.text})`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const currentDispatch = defenseData.activeDispatch!;
            const completeRes = completeDefenseDispatch(character, city, currentDispatch);
            const { updatedCharacter, rewardSummary } = completeRes;

            // 작전 실패 및 전사 판정인 경우
            if (rewardSummary.isFailed) {
                const deadNames = rewardSummary.casualties && rewardSummary.casualties.length > 0 
                    ? rewardSummary.casualties.join(', ') 
                    : '출동 대원 전원';

                onUpdateCharacter(
                    updatedCharacter,
                    `[영지 비보] ${city} 주둔 방어군이 '${currentDispatch.threatTitle}' 요격 작전에서 패배하고 전원 전사했습니다... (전사: ${deadNames})`
                );

                setResultData({
                    type: 'destroy',
                    title: '작전 실패 및 대원 전사',
                    message: `${city} 주둔 방어군이 권장 전투력 열세로 인해 '${currentDispatch.threatTitle}' 토벌에 실패하고 적의 맹공에 전원 전사하였습니다... 도시 위협도가 폭증하고 치안이 악화되었습니다.`,
                    items: [
                        { label: '작전 결과', after: '패배 및 전멸' },
                        { label: '전사 대원', after: deadNames },
                        { label: '도시 위협도', after: '+20% 폭증 (위협 지속)' },
                        { label: '치안 하락', after: '-20%' },
                        { label: '민심 하락', after: '-15%' },
                        { label: '획득 보상', after: '없음 (작전 실패)' }
                    ]
                });
                setIsProcessing(false);
                return;
            }

            // 성공 승전인 경우
            const creditedCount = rewardSummary.creditedMembers?.length || currentDispatch.garrisonIds.length;

            onUpdateCharacter(
                updatedCharacter,
                `[영지 승전] ${city} 주둔 방어군이 '${currentDispatch.threatTitle}' 토벌을 완수하고 무사 복귀했습니다! (보상: +${rewardSummary.gold.toLocaleString()} 골드, 사령관 군공 +${rewardSummary.merit}점, 파견 대원 각자 군공 +${rewardSummary.memberMerit}점)`
            );

            setResultData({
                type: 'success',
                title: '비상 파견 작전 완수 및 부대 복귀',
                message: `${city} 주둔 방어군이 수일간의 전방 격전 끝에 위협을 완전히 소탕하고 무사히 영지로 복귀했습니다!`,
                items: [
                    { label: '격퇴 사태', after: currentDispatch.threatTitle },
                    { label: '도시 위협도', after: `-${rewardSummary.threatReduction}% 완화` },
                    { label: '개인 소지금', after: `+${rewardSummary.gold.toLocaleString()} 골드` },
                    { label: '영지 지원 예산', after: `+${rewardSummary.budget.toLocaleString()} G` },
                    { label: '사령관 군공', after: `+${rewardSummary.merit}점` },
                    { label: '파견 대원 군공', after: `각자 군공 +${rewardSummary.memberMerit}점 (${creditedCount}명 수여 완료)` }
                ]
            });
            setIsProcessing(false);
        }, 800);
    };

    // 세율 적용 핸들러
    const handleApplyTaxRate = () => {
        if (authorityLevel < 2) return;
        
        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const currentStats = newChar.militaryData!.regionStats?.[city] || { ...stats };
            
            const oldRate = currentStats.taxRate || 10;
            const newRate = localTaxRate;
            
            // 민심 하락 로직: 15% 초과 시 초과분만큼 민심 하락
            let sentimentLoss = 0;
            if (newRate > 15) {
                sentimentLoss = Math.floor((newRate - 15) * 1.5);
            }
            
            currentStats.taxRate = newRate;
            currentStats.sentiment = Math.max(0, currentStats.sentiment - sentimentLoss);
            
            if (!newChar.militaryData!.regionStats) newChar.militaryData!.regionStats = {};
            newChar.militaryData!.regionStats[city] = currentStats;

            onUpdateCharacter(newChar, `[세율 정책] ${city}의 세율을 ${newRate}%로 변경했습니다.${sentimentLoss > 0 ? ` (민심 하락: -${sentimentLoss}%)` : ''}`);
            
            setResultData({
                type: sentimentLoss > 5 ? 'warning' : 'success',
                title: '세율 정책 공포 완료',
                message: `${city}의 조세 세율이 ${newRate}%로 조정되었습니다.`,
                items: [
                    { label: '이전 세율', before: `${oldRate}%`, after: `${newRate}%` },
                    { label: '민심 영향', after: sentimentLoss > 0 ? `-${sentimentLoss}% 하락` : '변동 없음' }
                ]
            });
            setIsProcessing(false);
        }, 800);
    };

    // 예산 인출 핸들러
    const handleWithdrawBudget = () => {
        if (authorityLevel < 2) return;
        if (withdrawAmount <= 0) return;
        if (withdrawAmount > stats.budget) {
            alert("지역 예산이 부족합니다.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const currentStats = newChar.militaryData!.regionStats?.[city] || { ...stats };

            const penaltyUnit = Math.floor(withdrawAmount / 10000);
            const sentimentLoss = Math.max(5, penaltyUnit * 2);
            const infamyGain = penaltyUnit * 5;

            currentStats.budget -= withdrawAmount;
            currentStats.sentiment = Math.max(0, currentStats.sentiment - sentimentLoss);
            newChar.money += withdrawAmount;
            newChar.infamy = (newChar.infamy || 0) + infamyGain;
            
            const updateCompanionAdminInfamy = (compId: string | undefined) => {
                if (!compId || compId === 'player') return;
                
                const activeIdx = newChar.companions.findIndex(c => c.id === compId);
                if (activeIdx !== -1) {
                    newChar.companions[activeIdx].infamy = (newChar.companions[activeIdx].infamy || 0) + infamyGain;
                    return;
                }
                
                if (newChar.inactiveCompanions) {
                    const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === compId);
                    if (inactiveIdx !== -1) {
                        newChar.inactiveCompanions[inactiveIdx].infamy = (newChar.inactiveCompanions[inactiveIdx].infamy || 0) + infamyGain;
                    }
                }
            };

            updateCompanionAdminInfamy(cityCommanderId);
            updateCompanionAdminInfamy(cityViceId);
            
            if (!newChar.militaryData!.regionStats) newChar.militaryData!.regionStats = {};
            newChar.militaryData!.regionStats[city] = currentStats;

            onUpdateCharacter(newChar, `[예산 인출] ${city} 지역 예산에서 ${withdrawAmount.toLocaleString()}골드를 인출했습니다. (민심 -${sentimentLoss}%, 악명 +${infamyGain})`);
            
            setResultData({
                type: 'destroy',
                title: '지역 예산 사적 인출',
                message: `공금을 개인 자산으로 인출했습니다. 불법 횡령 소문으로 주민 민심이 악화되고 악명이 상승합니다.`,
                items: [
                    { label: '획득 골드', after: `+${withdrawAmount.toLocaleString()} G` },
                    { label: '민심 하락', after: `-${sentimentLoss}%` },
                    { label: '악명 상승', after: `+${infamyGain}` }
                ]
            });
            setWithdrawAmount(0);
            setIsProcessing(false);
        }, 1200);
    };

    // 임무 하달 핸들러
    const handleDispatch = (type: keyof typeof MISSION_TYPES) => {
        if (!selectedMemberId) return;
        const member = availableSoldiers.find(m => m.id === selectedMemberId);
        if (!member) return;

        const config = MISSION_TYPES[type];
        
        if (authorityLevel < config.reqAuthority) {
            alert(`해당 임무는 지역대장 이상의 권한이 필요합니다.`);
            return;
        }

        if (stats.budget < config.cost) {
            alert("지역 보유 예산이 부족합니다.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const returnDate = addDays(character.currentDate || '2000-01-01', config.days);
            
            const newMission: DispatchMission = {
                id: `reg_miss_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                companionId: selectedMemberId,
                destination: { region: "Unknown", nation: member.nation || "Unknown", city: city },
                startTime: character.currentDate || '',
                durationMonths: 0,
                expectedReturnDate: returnDate,
                status: 'Normal',
                dangerCounter: 0,
                successRate: 100,
                missionType: type
            };

            const activeIdx = newChar.companions.findIndex(c => c.id === selectedMemberId);
            if (activeIdx !== -1) {
                const [target] = newChar.companions.splice(activeIdx, 1);
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(target);
            }

            if (!newChar.base) newChar.base = { ...INITIAL_BASE };
            if (!newChar.base.dispatched) newChar.base.dispatched = [];
            newChar.base.dispatched.push(newMission);

            if (!newChar.militaryData!.regionStats) newChar.militaryData!.regionStats = {};
            newChar.militaryData!.regionStats[city] = { ...stats, budget: stats.budget - config.cost };

            onUpdateCharacter(newChar, `[지역 파견] ${member.name} 대원을 ${city} ${config.label} 임무에 파견했습니다.`);
            
            setResultData({
                type: 'info',
                title: '시정 임무 파견 완료',
                message: `${member.name} 대원이 명령을 하달받고 ${city} ${config.label} 업무에 투입되었습니다.`,
                items: [
                    { label: '담당 대원', after: member.name },
                    { label: '하달 임무', after: config.label },
                    { label: '소모 예산', after: `-${config.cost.toLocaleString()} G` },
                    { label: '복귀 예정', after: returnDate }
                ]
            });
            
            setSelectedMemberId(null);
            setIsProcessing(false);
            setActiveTab('status');
        }, 1000);
    };

    // 임무 완료 처리 핸들러
    const handleCompleteMission = (mission: DispatchMission) => {
        const member = allPersons.find(c => c.id === mission.companionId);
        if (!member) return;

        const config = MISSION_TYPES[mission.missionType as keyof typeof MISSION_TYPES];
        if (!config) return;

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            
            let boost = 1;
            if (mission.missionType === 'RegionalSecurity') {
                boost = Math.floor((member.stats.str + member.stats.def) * 0.05) + 2;
            } else {
                boost = Math.floor((member.stats.wis + member.stats.ctrl) * 0.05) + 2;
            }

            const currentStats = newChar.militaryData!.regionStats![city] || { ...stats };
            if (config.stat === 'security') currentStats.security = Math.min(100, currentStats.security + boost);
            else currentStats.sentiment = Math.min(100, currentStats.sentiment + boost);
            newChar.militaryData!.regionStats![city] = currentStats;

            newChar.base!.dispatched = newChar.base!.dispatched?.filter(d => d.id !== mission.id);

            onUpdateCharacter(newChar, `[시정 완료] ${member.name} 대원이 ${city} ${config.label} 임무를 성과 있게 마치고 복귀했습니다. (${config.stat === 'security' ? '치안' : '민심'} +${boost}%)`);
            
            setResultData({
                type: 'success',
                title: '시정 임무 보고 완료',
                message: `${member.name} 대원이 임무를 완료하고 시정 공헌 결과를 보고했습니다.`,
                items: [
                    { label: '수행 대원', after: member.name },
                    { label: '수행 임무', after: config.label },
                    { label: '지수 상승', after: `+${boost}%` },
                    { label: '현재 지수', after: `${config.stat === 'security' ? currentStats.security : currentStats.sentiment}%` }
                ]
            });
            setIsProcessing(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            <div className="bg-slate-950 border border-blue-500/40 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[92vh] sm:h-[85vh] shadow-2xl flex flex-col overflow-hidden relative text-slate-200">
                
                {/* 헤더 (어디 지역인지, 담당자가 누구인지 명확히 표시) */}
                <div className="p-4 sm:p-5 border-b border-blue-900/40 bg-slate-900/90 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-500/30 text-blue-400 shrink-0">
                            <TowerControl size={26} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-700/50 flex items-center gap-1">
                                    <MapPin size={10} /> {nation}
                                </span>
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                    <Building2 size={12} /> {city}
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                                {city} 지역 통치 관리 사령부
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">내 통치 권한</span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                                authorityLevel === 2 
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50' 
                                    : authorityLevel === 1 
                                    ? 'bg-blue-950/80 text-blue-300 border border-blue-600/50' 
                                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                            }`}>
                                {authorityLevel === 2 ? '지역대장 (최고 권한)' : authorityLevel === 1 ? '지역부대장 (행정 권한)' : '권한 없음 (열람)'}
                            </span>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                            title="닫기"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* 담당 지역 관리자 현황 바너 (지역대장 & 지역부대장 명시) */}
                <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        <Crown size={14} className="text-amber-400 shrink-0" />
                        <span className="text-slate-400 text-[11px]">지역대장:</span>
                        <span className="font-bold text-white truncate">{commanderInfo.name}</span>
                        <span className="text-[10px] text-amber-400/80 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40 ml-auto shrink-0">
                            {commanderInfo.rank}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-blue-500/20">
                        <UserCheck size={14} className="text-blue-400 shrink-0" />
                        <span className="text-slate-400 text-[11px]">지역부대장:</span>
                        <span className="font-bold text-white truncate">{viceCommanderInfo.name}</span>
                        <span className="text-[10px] text-blue-400/80 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-800/40 ml-auto shrink-0">
                            {viceCommanderInfo.rank}
                        </span>
                    </div>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'overview' 
                                ? 'text-blue-400 border-blue-500 bg-slate-900/80' 
                                : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <Building2 size={14} />
                        <span>통치 개요 및 지표</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('dispatch')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'dispatch' 
                                ? 'text-blue-400 border-blue-500 bg-slate-900/80' 
                                : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <Users size={14} />
                        <span>임무 하달</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('status')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 relative flex items-center justify-center gap-1.5 ${
                            activeTab === 'status' 
                                ? 'text-blue-400 border-blue-500 bg-slate-900/80' 
                                : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <Clock size={14} />
                        <span>파견 현황</span>
                        {activeRegionalDispatches.length > 0 && (
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse ml-0.5"></span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('defense')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 relative flex items-center justify-center gap-1.5 ${
                            activeTab === 'defense' 
                                ? 'text-amber-400 border-amber-500 bg-slate-900/80' 
                                : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <ShieldAlert size={14} />
                        <span>영지 방어</span>
                        {defenseData.threatLevel >= 50 && (
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse ml-0.5"></span>
                        )}
                    </button>
                </div>

                {/* 모달 본문 바디 (모바일 터치 및 스크롤 최적화) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/40 custom-scrollbar">
                    
                    {/* 1. 통치 개요 및 세율/예산 탭 */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
                            
                            {/* 3대 통치 지표 수치 카드 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center shadow-md">
                                    <div className="flex items-center gap-2 sm:block sm:mb-2">
                                        <Coins size={24} className="text-amber-400 sm:mx-auto" />
                                        <span className="text-xs text-slate-400 font-bold">지역 보유 예산</span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                                        {stats.budget.toLocaleString()} G
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-blue-500/30 flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center shadow-md">
                                    <div className="flex items-center gap-2 sm:block sm:mb-2">
                                        <Shield size={24} className="text-blue-400 sm:mx-auto" />
                                        <span className="text-xs text-slate-400 font-bold">치안 확립 지수</span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-mono font-black text-blue-400">
                                        {stats.security}%
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-pink-500/30 flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center shadow-md">
                                    <div className="flex items-center gap-2 sm:block sm:mb-2">
                                        <Heart size={24} className="text-pink-400 sm:mx-auto" />
                                        <span className="text-xs text-slate-400 font-bold">주민 민심 지수</span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-mono font-black text-pink-400">
                                        {stats.sentiment}%
                                    </div>
                                </div>
                            </div>

                            {/* 조세 정책 및 국고 인출 패널 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                
                                {/* 세율 조정 패널 */}
                                <div className={`bg-slate-950 p-5 rounded-2xl border border-blue-900/40 space-y-4 ${authorityLevel < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                        <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                                            <Gavel size={16} /> 조세 및 세율 정책
                                        </h4>
                                        <span className="text-[10px] font-bold bg-amber-950/80 text-amber-400 px-2 py-0.5 rounded border border-amber-800/60">
                                            지역대장 전용
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-slate-400 font-bold">적용 세율</span>
                                            <span className={`text-2xl font-black font-mono ${localTaxRate > 20 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {localTaxRate}%
                                            </span>
                                        </div>

                                        <input 
                                            type="range" min="5" max="50" step="1" 
                                            value={localTaxRate} 
                                            onChange={(e) => setLocalTaxRate(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />

                                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                                            <p className="flex items-start gap-1">
                                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5"/>
                                                <span>세율이 높을수록 예산 축적 속도가 빨라지지만, **15% 초과 시 초과 비율에 따라 주민 민심이 즉시 하락**합니다.</span>
                                            </p>
                                        </div>

                                        <button 
                                            onClick={handleApplyTaxRate}
                                            disabled={localTaxRate === stats.taxRate || authorityLevel < 2}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                        >
                                            <CheckCircle size={14}/> 세율 정책 공포
                                        </button>
                                    </div>
                                </div>

                                {/* 예산 인출 패널 */}
                                <div className={`bg-slate-950 p-5 rounded-2xl border border-amber-900/40 space-y-4 ${authorityLevel < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                        <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                                            <HandCoins size={16} /> 지역 예산 인출
                                        </h4>
                                        <span className="text-[10px] font-bold bg-amber-950/80 text-amber-400 px-2 py-0.5 rounded border border-amber-800/60">
                                            지역대장 전용
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-slate-400 font-bold">인출 희망 금액</span>
                                            <span className="text-xl font-black font-mono text-amber-400">
                                                {withdrawAmount.toLocaleString()} G
                                            </span>
                                        </div>

                                        <input 
                                            type="range" min="0" max={stats.budget} step="5000" 
                                            value={withdrawAmount} 
                                            onChange={(e) => setWithdrawAmount(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />

                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button onClick={() => setWithdrawAmount(0)} className="py-1 bg-slate-900 text-[10px] text-slate-400 rounded border border-slate-800 font-bold hover:text-white">초기화</button>
                                            <button onClick={() => setWithdrawAmount(Math.floor(stats.budget * 0.25))} className="py-1 bg-slate-900 text-[10px] text-slate-400 rounded border border-slate-800 font-bold hover:text-white">25%</button>
                                            <button onClick={() => setWithdrawAmount(Math.floor(stats.budget * 0.5))} className="py-1 bg-slate-900 text-[10px] text-slate-400 rounded border border-slate-800 font-bold hover:text-white">50%</button>
                                            <button onClick={() => setWithdrawAmount(stats.budget)} className="py-1 bg-slate-900 text-[10px] text-slate-400 rounded border border-slate-800 font-bold hover:text-white">전액</button>
                                        </div>

                                        <div className="p-3 bg-red-950/30 rounded-xl border border-red-900/40 text-[11px] text-red-300">
                                            <p className="flex items-start gap-1">
                                                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5"/>
                                                <span>지역 예산을 개인 사유재산으로 인출 시 **민심이 감소**하며 불법 횡령으로 간주되어 **악명**이 상승합니다.</span>
                                            </p>
                                        </div>

                                        <button 
                                            onClick={handleWithdrawBudget}
                                            disabled={withdrawAmount <= 0 || authorityLevel < 2}
                                            className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                        >
                                            <ArrowDown size={14}/> 개인 금고로 인출
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. 임무 하달 탭 (부대원 선택 + 시정 임무 하달) */}
                    {activeTab === 'dispatch' && (
                        <div className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* 좌측: 파견 가능 부대원 목록 */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Users size={14} /> 파견 가능 부대원 (가용 군인)
                                        </h3>
                                        <span className="text-[10px] text-slate-400">
                                            총 {availableSoldiers.length}명 대기 중
                                        </span>
                                    </div>

                                    <div className="p-2 bg-slate-950/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                                        <Info size={13} className="text-blue-400 shrink-0"/>
                                        <span>해당 지역 및 다른 지역의 지역대장/부대장은 임무 하달 대상에서 자동 제외됩니다.</span>
                                    </div>

                                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                                        {availableSoldiers.map(m => (
                                            <button 
                                                key={m.id}
                                                onClick={() => setSelectedMemberId(m.id)}
                                                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                                                    selectedMemberId === m.id 
                                                        ? 'bg-blue-950/80 border-blue-500 ring-1 ring-blue-500 shadow-lg' 
                                                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                        selectedMemberId === m.id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                                                    }`}>
                                                        {m.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{m.name}</div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {m.militaryRank || '군인'} • 레벨 {m.level}
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedMemberId === m.id && (
                                                    <CheckCircle size={18} className="text-blue-400 animate-in zoom-in"/>
                                                )}
                                            </button>
                                        ))}

                                        {availableSoldiers.length === 0 && (
                                            <div className="py-12 text-center text-slate-500 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                                                <Users size={28} className="mx-auto mb-2 opacity-30"/>
                                                <p className="text-xs font-bold text-slate-400">임무에 하달 가능한 부대원이 없습니다.</p>
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    (지역대장/부대장으로 임명되었거나 이미 다른 파견/시설 업무를 수행 중입니다)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 우측: 시정 명령 선택 및 하달 */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider px-1">
                                        시정 명령 선택 및 하달
                                    </h3>

                                    <div className="space-y-3">
                                        {(Object.entries(MISSION_TYPES) as [keyof typeof MISSION_TYPES, any][]).map(([key, cfg]) => {
                                            const isLocked = authorityLevel < cfg.reqAuthority;
                                            return (
                                                <button 
                                                    key={key}
                                                    disabled={!selectedMemberId || isLocked}
                                                    onClick={() => handleDispatch(key)}
                                                    className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col gap-2.5 ${
                                                        isLocked 
                                                            ? 'bg-slate-950 border-slate-900 opacity-40 grayscale' 
                                                            : !selectedMemberId 
                                                            ? 'bg-slate-950 border-slate-800 opacity-60' 
                                                            : 'bg-slate-950 border-slate-800 hover:border-blue-500 shadow-md active:scale-[0.99]'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-2 rounded-lg bg-slate-900 ${isLocked ? 'text-slate-600' : cfg.color}`}>
                                                                <cfg.icon size={18}/>
                                                            </div>
                                                            <span className={`font-bold text-sm ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                        {isLocked ? (
                                                            <span className="text-[10px] text-red-400 flex items-center gap-1 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                                                                <Lock size={10} /> 지역대장 권한 필요
                                                            </span>
                                                        ) : (
                                                            <ChevronRight size={16} className="text-slate-600"/>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        {cfg.desc}
                                                    </p>

                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                                                        <span className="text-amber-400 font-bold flex items-center gap-1">
                                                            <Coins size={12}/> 소모 예산: {cfg.cost.toLocaleString()} G
                                                        </span>
                                                        <span className="text-blue-400 font-bold flex items-center gap-1">
                                                            <Clock size={12}/> {cfg.days}일 소요
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {!selectedMemberId && availableSoldiers.length > 0 && (
                                            <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-900/30 text-center text-xs text-blue-300">
                                                👈 왼쪽에서 임무를 하달할 부대원을 먼저 선택해주세요.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. 파견 진행 현황 탭 */}
                    {activeTab === 'status' && (
                        <div className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider px-1">
                                현재 진행 중인 시정 임무 현황
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeRegionalDispatches.map(m => {
                                    const comp = allPersons.find(c => c.id === m.companionId);
                                    const isDone = character.currentDate! >= m.expectedReturnDate;
                                    const config = MISSION_TYPES[m.missionType as keyof typeof MISSION_TYPES];
                                    
                                    return (
                                        <div 
                                            key={m.id} 
                                            className={`p-4 rounded-xl border transition-all ${
                                                isDone 
                                                    ? 'border-blue-500/60 bg-blue-950/30 shadow-md' 
                                                    : 'border-slate-800 bg-slate-950'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${config.color}`}>
                                                        <config.icon size={18}/>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-base">
                                                            {comp?.name || '부대원'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {config.label} 수행 중
                                                        </div>
                                                    </div>
                                                </div>
                                                {isDone ? (
                                                    <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                                                        복귀 완료
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                                        <Clock size={10} /> 진행 중 ({m.expectedReturnDate} 복귀)
                                                    </span>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => handleCompleteMission(m)} 
                                                disabled={!isDone || isProcessing}
                                                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                                                    isDone 
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]' 
                                                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                }`}
                                            >
                                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15}/>}
                                                {isDone ? '보고 수령 및 부대원 복귀' : '임무 진행 중...'}
                                            </button>
                                        </div>
                                    );
                                })}

                                {activeRegionalDispatches.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-slate-500 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                                        <Clock size={36} className="mx-auto mb-2 opacity-20"/>
                                        <p className="text-xs text-slate-400 font-bold">진행 중인 지역 관리 시정 파견이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 4. 영지 방어 탭 (지역대장 급 이상 전용) */}
                    {activeTab === 'defense' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
                            
                            {/* 권한 부족 시 잠금 안내 화면 */}
                            {!defenseAuthority.canCommand ? (
                                <div className="bg-slate-950 border border-amber-600/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-950/50 border border-amber-600/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                                        <Lock size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg sm:text-xl font-black text-white">
                                            영지 방어 사령부 지휘권 제한
                                        </h3>
                                        <p className="text-xs sm:text-sm text-amber-400 font-bold">
                                            {defenseAuthority.reason || '영지 방어 최고 지휘권은 지역대장 급 이상에게만 부여됩니다.'}
                                        </p>
                                    </div>
                                    <div className="max-w-md mx-auto bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-2">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                            <span className="text-slate-400 font-medium">현재 내 계급</span>
                                            <span className="font-bold text-white">{character.militaryRank || '일반 군인'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                            <span className="text-slate-400 font-medium">필요 지휘권</span>
                                            <span className="font-bold text-amber-400">지역대장 임명 또는 대령 이상</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                                            도시의 방어군을 주둔시키고 방어 진지를 구축하는 최고 방어 권한은 지역대장에게 일임되어 있습니다. 계급을 진급하거나 지역대장으로 임명된 후 지휘할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* 상단 4대 방어 지표 카드 */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                                        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-blue-500/30 flex flex-col justify-between shadow-md">
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                                                <Shield size={14} className="text-blue-400" />
                                                <span>총 방어력</span>
                                            </div>
                                            <div className="my-1.5">
                                                <span className="text-lg sm:text-2xl font-mono font-black text-white">
                                                    {currentDefensePower.toLocaleString()}
                                                </span>
                                            </div>
                                            <span className={`text-[11px] font-bold ${defenseRating.color}`}>
                                                {defenseRating.label}
                                            </span>
                                        </div>

                                        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-rose-500/30 flex flex-col justify-between shadow-md">
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                                                <AlertTriangle size={14} className="text-rose-400" />
                                                <span>도시 위협도</span>
                                            </div>
                                            <div className="my-1.5">
                                                <span className="text-lg sm:text-2xl font-mono font-black text-rose-400">
                                                    {defenseData.threatLevel}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-300 ${
                                                        defenseData.threatLevel >= 70 ? 'bg-rose-500' :
                                                        defenseData.threatLevel >= 40 ? 'bg-amber-400' : 'bg-emerald-400'
                                                    }`}
                                                    style={{ width: `${Math.min(100, defenseData.threatLevel)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between shadow-md">
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                                                <Castle size={14} className="text-amber-400" />
                                                <span>방어 진지</span>
                                            </div>
                                            <div className="my-1.5">
                                                <span className="text-base sm:text-xl font-bold text-amber-300 truncate block">
                                                    {FORTIFICATION_CONFIG[defenseData.fortificationLevel]?.label || '목책 바리케이드'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                진지 등급 {defenseData.fortificationLevel}단계
                                            </span>
                                        </div>

                                        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between shadow-md">
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                                                <Users size={14} className="text-emerald-400" />
                                                <span>주둔 병력</span>
                                            </div>
                                            <div className="my-1.5">
                                                <span className="text-lg sm:text-2xl font-mono font-black text-emerald-300">
                                                    {defenseData.garrisonIds.length} <span className="text-xs text-slate-400">/ 4명</span>
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-emerald-400/80">
                                                최대 4인 편성
                                            </span>
                                        </div>
                                    </div>

                                    {/* 비상 요격 작전 카드: 파견 진행 중 / 사태 발생 / 평온 상태 3단계 분기 */}
                                    {defenseData.activeDispatch ? (
                                        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-amber-900/60 border border-amber-500/60 text-amber-300 animate-pulse">
                                                        <Swords size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 tracking-wider">
                                                                비상 요격 파견 작전 수행 중
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/50">
                                                                위협 등급: {defenseData.activeDispatch.threatSeverity}
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-600/50">
                                                                파견 기간: {defenseData.activeDispatch.durationDays}일간 전방 토벌
                                                            </span>
                                                        </div>
                                                        <h4 className="text-base sm:text-lg font-black text-white mt-1">
                                                            {defenseData.activeDispatch.threatTitle}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-600/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
                                                    <Mail size={14} className="text-amber-400 shrink-0" />
                                                    <span>출정 서신 발송 완료</span>
                                                </div>
                                            </div>

                                            {/* 일정 및 진척도 게이지 바 */}
                                            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30 space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <Clock size={14} className="text-amber-400 shrink-0" />
                                                        <span>
                                                            출동: <strong className="text-slate-100 font-mono">{defenseData.activeDispatch.departureDate} {defenseData.activeDispatch.departureTime}</strong>
                                                        </span>
                                                        <span className="text-slate-500">|</span>
                                                        <span>
                                                            복귀 예정: <strong className="text-amber-300 font-mono">{defenseData.activeDispatch.returnDate} {defenseData.activeDispatch.returnTime}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="font-bold">
                                                        <span className="text-slate-400 text-[11px] mr-1.5">작전 상태:</span>
                                                        <span className={`font-mono ${dispatchInfo?.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                                                            {dispatchInfo?.text || '작전 수행 중'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px] text-slate-400">
                                                        <span>작전 완수 진척도</span>
                                                        <span className="font-mono text-amber-300 font-bold">{dispatchInfo?.progressPercent || 0}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                                                        <div 
                                                            className={`h-full transition-all duration-500 rounded-full ${
                                                                dispatchInfo?.isCompleted 
                                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                                                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400'
                                                            }`}
                                                            style={{ width: `${dispatchInfo?.progressPercent || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 파견 보상 미리보기 카드 */}
                                            <div className="bg-black/40 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                                <span className="text-[11px] text-slate-400 font-bold block">
                                                    토벌 완수 시 획득 파견 보상
                                                </span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-[10px] text-slate-400 block">개인 소지금</span>
                                                        <span className="font-mono font-bold text-amber-400">
                                                            +{defenseData.activeDispatch.rewardGold.toLocaleString()} 골드
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-[10px] text-slate-400 block">영지 예산 지원</span>
                                                        <span className="font-mono font-bold text-emerald-400">
                                                            +{defenseData.activeDispatch.rewardBudget.toLocaleString()} G
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-[10px] text-slate-400 block">사령관 군공</span>
                                                        <span className="font-mono font-bold text-blue-400">
                                                            +{defenseData.activeDispatch.rewardMerit}점
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-[10px] text-slate-400 block">파견 대원 군공</span>
                                                        <span className="font-mono font-bold text-teal-400 block truncate">
                                                            각자 +{defenseData.activeDispatch.memberMerit || defenseData.activeDispatch.rewardMerit}점
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 하단 제어 버튼 */}
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                                                <span className="text-xs text-slate-400">
                                                    주둔 방어군 {defenseData.activeDispatch.garrisonIds.length}명이 전방 작전지에서 토벌 중입니다. 복귀 완료 시 보상을 일괄 정산받을 수 있습니다.
                                                </span>

                                                {dispatchInfo?.isCompleted ? (
                                                    <button
                                                        onClick={handleClaimDispatchCompletion}
                                                        disabled={isProcessing}
                                                        className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-950/60 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 animate-pulse"
                                                    >
                                                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                        <span>토벌 완수 및 부대 복귀 보고 접수 (보상 수령)</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={true}
                                                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-slate-900 text-amber-300 border border-amber-600/40 cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                                                    >
                                                        <Clock size={15} className="animate-spin text-amber-400" />
                                                        <span>전방 작전 수행 중 ({dispatchInfo?.text || '복귀 대기'})</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : defenseData.activeThreatEvent ? (
                                        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-rose-950/70 border-2 border-red-500/70 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-red-500/30">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-red-900/60 border border-red-500/60 text-red-300 animate-pulse">
                                                        <Flame size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white tracking-wider">
                                                                비상 사태 발생
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700/50">
                                                                위협 등급: {defenseData.activeThreatEvent.severity}
                                                            </span>
                                                            {defenseData.activeThreatEvent.daysIgnored > 0 && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/50">
                                                                    방치 {defenseData.activeThreatEvent.daysIgnored}일차
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-base sm:text-lg font-black text-white mt-1">
                                                            {defenseData.activeThreatEvent.title}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-600/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                    <Mail size={14} className="text-amber-400 shrink-0" />
                                                    <span>가문 서신함에 긴급 서신 도착</span>
                                                </div>
                                            </div>

                                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-red-900/40">
                                                {defenseData.activeThreatEvent.description}
                                            </p>

                                            {/* 권장 전투력 및 실패 위험도 현황 */}
                                            {(() => {
                                                const recPower = defenseData.activeThreatEvent.recommendedPower || 60000;
                                                const actualPower = currentDefensePower;
                                                const failChance = calculateDispatchFailChance(actualPower, recPower);
                                                const isUnderpowered = failChance > 0;
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/60 p-3 rounded-xl border border-red-900/50 text-xs">
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block font-medium">권장 전투력</span>
                                                                <span className="font-mono font-bold text-amber-300 text-sm">{recPower.toLocaleString()}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block font-medium">현재 주둔 전력</span>
                                                                <span className={`font-mono font-bold text-sm ${isUnderpowered ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {actualPower.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block font-medium">작전 성공률</span>
                                                                <span className={`font-mono font-bold text-sm ${isUnderpowered ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                                    {100 - failChance}%
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block font-medium">실패 위험도</span>
                                                                <span className={`font-mono font-bold text-sm ${isUnderpowered ? 'text-rose-400' : 'text-slate-400'}`}>
                                                                    {failChance > 0 ? `${failChance}% (전사 위험)` : '0% (안전)'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {isUnderpowered && (
                                                            <div className="p-2.5 bg-rose-950/70 border border-rose-600/60 rounded-xl text-xs flex items-center gap-2 text-rose-300">
                                                                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                                                                <span>
                                                                    <strong>전력 부족 경고:</strong> 주둔 방어군 전력이 권장 전투력보다 낮아 <strong>실패 확률 {failChance}%</strong>가 존재합니다. 실패 시 <strong>출동 대원 전원이 전사(사망)</strong>하므로 주의하십시오.
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                                                <div className="text-xs text-rose-300 flex items-center gap-1.5">
                                                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                                                    <span className="font-medium">
                                                        신속히 해결하지 않으면 매일 도시 위협도가 <strong className="font-bold text-white">+{defenseData.activeThreatEvent.threatIncreasePerDay}%</strong>씩 폭증하고 치안이 붕괴됩니다!
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={handleEmergencySortie}
                                                    disabled={defenseData.garrisonIds.length === 0 || isProcessing}
                                                    className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xl flex items-center justify-center gap-2 shrink-0 ${
                                                        defenseData.garrisonIds.length > 0 && !isProcessing
                                                            ? 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-red-950/50'
                                                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
                                                    <span>비상 요격 출동 명령 ({DISPATCH_SEVERITY_CONFIG[defenseData.activeThreatEvent.severity]?.durationDays || 3}일간 전방 파견)</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="space-y-1 text-center sm:text-left">
                                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                                    <Shield size={18} className="text-emerald-400" />
                                                    <h4 className="text-sm sm:text-base font-bold text-white">
                                                        비상 요격 및 위협 소탕 작전
                                                    </h4>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                                                        도시 평온 (사태 없음)
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                                                    현재 도시 외곽에 발생한 긴급 침공이나 약탈 사태가 없습니다. 비상 위협 사태가 발생하여 서신이 도착했을 때만 요격 출동이 가능합니다.
                                                </p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
                                                {(() => {
                                                    const curYearMonth = (character.currentDate || '2000-03-02').slice(0, 7);
                                                    const isScoutedThisMonth = defenseData.lastScoutMonth === curYearMonth;
                                                    return (
                                                        <button
                                                            onClick={handleTriggerThreatInvestigation}
                                                            disabled={isProcessing || isScoutedThisMonth}
                                                            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                                                isScoutedThisMonth
                                                                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
                                                            }`}
                                                            title={isScoutedThisMonth ? '이번 달 척후 수색을 이미 완료했습니다. (다음 달에 다시 가능)' : '도시 외곽에 잠복한 마물이나 도적 무리를 척후대를 통해 정찰 및 수색합니다. (월 1회 가능)'}
                                                        >
                                                            <Eye size={14} className={isScoutedThisMonth ? 'text-slate-500' : 'text-amber-400'} />
                                                            <span>{isScoutedThisMonth ? '외곽 척후 수색 (이번 달 완료)' : '외곽 척후 수색 (월 1회)'}</span>
                                                        </button>
                                                    );
                                                })()}
                                                <button
                                                    disabled={true}
                                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed flex items-center justify-center gap-1.5"
                                                >
                                                    <Swords size={14} />
                                                    <span>출동 대기 (사태 없음)</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 방어 진지 보강 및 주둔군 편성 2단 레이아웃 */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                        
                                        {/* 방어 진지 보강 패널 (시간 소요, 시작 시간, 남은 시간 계산) */}
                                        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 lg:col-span-1 shadow-md">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                                                <Castle size={18} className="text-amber-400" />
                                                <h4 className="text-sm font-bold text-white">방어 진지 구축 및 보강</h4>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                                    <span className="text-[11px] text-slate-400 block font-medium">현재 진지</span>
                                                    <span className="text-xs font-bold text-amber-300 mt-0.5 block">
                                                        {FORTIFICATION_CONFIG[defenseData.fortificationLevel]?.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-1">
                                                        기본 방어력 보너스: +{FORTIFICATION_CONFIG[defenseData.fortificationLevel]?.defenseBonus}점
                                                    </span>
                                                </div>

                                                {/* 진행 중인 보강 공사가 있는 경우 */}
                                                {defenseData.construction ? (
                                                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/40 space-y-2.5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-amber-300 flex items-center gap-1">
                                                                <Clock size={13} className="text-amber-400 animate-spin" />
                                                                공사 진행 중
                                                            </span>
                                                            <span className="font-mono text-[11px] text-slate-300">
                                                                {defenseData.construction.targetLabel}
                                                            </span>
                                                        </div>

                                                        {/* 진행률 게이지 */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                                <span>공사 진척도</span>
                                                                <span className="font-mono text-amber-300 font-bold">{constructionInfo?.progressPercent || 0}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                                                <div 
                                                                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-500 rounded-full"
                                                                    style={{ width: `${constructionInfo?.progressPercent || 0}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 시작 시간 및 완공 시간 */}
                                                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                                                            <div className="flex justify-between text-slate-400">
                                                                <span>시작 시간</span>
                                                                <span className="font-mono text-slate-200">
                                                                    {defenseData.construction.startDate} {defenseData.construction.startTime}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-slate-400">
                                                                <span>완공 예정</span>
                                                                <span className="font-mono text-slate-200">
                                                                    {defenseData.construction.completionDate} {defenseData.construction.completionTime}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between font-bold pt-1 border-t border-slate-800/80">
                                                                <span className="text-amber-400">남은 시간</span>
                                                                <span className={`font-mono ${constructionInfo?.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                                                                    {constructionInfo?.text || '계산 중'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 준공 완료 승인 버튼 */}
                                                        {constructionInfo?.isCompleted ? (
                                                            <button
                                                                onClick={handleClaimFortificationCompletion}
                                                                disabled={isProcessing}
                                                                className="w-full py-2.5 rounded-xl font-bold text-xs mt-1 transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 active:scale-95"
                                                            >
                                                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                                <span>진지 보강 준공 승인</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled={true}
                                                                className="w-full py-2 rounded-xl font-medium text-xs bg-slate-950 text-slate-500 border border-slate-800 cursor-not-allowed flex items-center justify-center gap-1.5"
                                                            >
                                                                <Clock size={13} />
                                                                <span>시공 진행 중 ({constructionInfo?.text})</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : defenseData.fortificationLevel < 5 ? (
                                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">다음 등급</span>
                                                            <span className="font-bold text-white">
                                                                {FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">소모 예산</span>
                                                            <span className="font-mono font-bold text-amber-400">
                                                                {FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.cost.toLocaleString()} G
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">추가 방어력</span>
                                                            <span className="font-bold text-emerald-400">
                                                                +{FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.defenseBonus}점
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">공사 소요 시간</span>
                                                            <span className="font-bold text-slate-300">
                                                                {Math.floor(FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.durationMinutes / 60)}시간
                                                            </span>
                                                        </div>

                                                        <button
                                                            onClick={handleUpgradeFortification}
                                                            disabled={stats.budget < FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.cost || isProcessing}
                                                            className={`w-full py-2.5 rounded-xl font-bold text-xs mt-2 transition-all flex items-center justify-center gap-1.5 ${
                                                                stats.budget >= FORTIFICATION_CONFIG[defenseData.fortificationLevel + 1]?.cost && !isProcessing
                                                                    ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
                                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Castle size={14} />}
                                                            <span>진지 보강 공사 착공</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-950/20 border border-emerald-600/40 p-3 rounded-xl text-center text-xs text-emerald-300 font-bold">
                                                        최고 등급 진지 구축 완료 (불가침 요새)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 주둔 방어군 편성 및 대원 배치 패널 */}
                                        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2 shadow-md">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert size={18} className="text-blue-400" />
                                                    <h4 className="text-sm font-bold text-white">주둔 방어군 편성</h4>
                                                </div>
                                                <span className="text-xs font-mono text-slate-400">
                                                    {defenseData.garrisonIds.length} / 4 슬롯 배치됨
                                                </span>
                                            </div>

                                            {/* 파견 작전 진행 중일 때 안내 배너 */}
                                            {defenseData.activeDispatch && (
                                                <div className="bg-amber-950/40 border border-amber-600/50 p-2.5 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                                                    <Clock size={15} className="text-amber-400 shrink-0 animate-spin" />
                                                    <span>
                                                        주둔 방어군이 전방 비상 요격 작전({defenseData.activeDispatch.threatTitle})에 파견 중입니다. 부대 복귀 전까지는 편성을 변경할 수 없습니다.
                                                    </span>
                                                </div>
                                            )}

                                            {/* 편성된 주둔군 슬롯 카드 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {[0, 1, 2, 3].map(slotIdx => {
                                                    const assignedId = defenseData.garrisonIds[slotIdx];
                                                    const member = assignedId ? allPersons.find(p => p.id === assignedId) : null;
                                                    const isMemberDispatched = Boolean(defenseData.activeDispatch && defenseData.activeDispatch.garrisonIds.includes(assignedId || ''));

                                                    if (member) {
                                                        const pScore = calculateMemberDefensePower(member);
                                                        return (
                                                            <div 
                                                                key={`garrison_slot_${slotIdx}`}
                                                                className={`bg-slate-900 p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                                    isMemberDispatched ? 'border-amber-500/50 shadow-amber-950/20' : 'border-blue-500/40'
                                                                }`}
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-white text-xs truncate">
                                                                            {member.name}
                                                                        </span>
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                                                                            Lv.{member.level}
                                                                        </span>
                                                                        {isMemberDispatched && (
                                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/60 font-bold">
                                                                                작전 파견 중
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                                                                        기여 방어력: +{pScore.toLocaleString()}점
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    disabled={Boolean(defenseData.activeDispatch)}
                                                                    onClick={() => handleToggleGarrison(member.id)}
                                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                                                        defenseData.activeDispatch
                                                                            ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                                                                            : 'bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 active:scale-95'
                                                                    }`}
                                                                >
                                                                    {defenseData.activeDispatch ? '파견 중' : '해제'}
                                                                </button>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div 
                                                            key={`garrison_slot_empty_${slotIdx}`}
                                                            className="bg-slate-900/40 p-3 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-xs"
                                                        >
                                                            <span>빈 주둔 슬롯 (편성 가능)</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 배치 가능한 군인 및 용병 목록 */}
                                            <div className="pt-2">
                                                <h5 className="text-xs font-bold text-slate-300 mb-2">
                                                    배치 가능 대원 (군인 및 용병)
                                                </h5>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                                    {availableGarrisonSoldiers.map(soldier => {
                                                        const isAssigned = defenseData.garrisonIds.includes(soldier.id);
                                                        const pScore = calculateMemberDefensePower(soldier);
                                                        const isDispatched = Boolean(defenseData.activeDispatch);

                                                        return (
                                                            <div 
                                                                key={`avail_soldier_${soldier.id}`}
                                                                className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-white text-xs truncate">
                                                                            {soldier.name}
                                                                        </span>
                                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                                                                            {soldier.job}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                        방어력 기여 +{pScore}점
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    disabled={isDispatched || (!isAssigned && defenseData.garrisonIds.length >= 4)}
                                                                    onClick={() => handleToggleGarrison(soldier.id)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95 ${
                                                                        isDispatched
                                                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                                            : isAssigned
                                                                            ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300 hover:bg-rose-900'
                                                                            : defenseData.garrisonIds.length >= 4
                                                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                                    }`}
                                                                >
                                                                    {isDispatched ? '파견 중' : isAssigned ? '해제' : '주둔 배치'}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                    {availableGarrisonSoldiers.length === 0 && (
                                                        <div className="col-span-full py-6 text-center text-slate-500 text-xs">
                                                            현재 주둔 가능한 군인 및 용병 대원이 없습니다.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 하단 푸터 바 */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start text-xs">
                        <div className="flex items-center text-amber-400 font-mono bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-600/30">
                            <Coins size={13} className="mr-1.5"/> 예산: {stats.budget.toLocaleString()} G
                        </div>
                        <div className="flex items-center text-blue-300 font-mono bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-600/30">
                            <Gavel size={13} className="mr-1.5"/> 세율: {stats.taxRate || 10}%
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
                    >
                        닫기
                    </button>
                </div>

                {/* 처리 중 스피너 오버레이 */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 z-[180] flex flex-col items-center justify-center backdrop-blur-xs">
                        <Loader2 size={40} className="animate-spin text-blue-400 mb-3" />
                        <p className="text-white text-xs font-bold tracking-wider animate-pulse">
                            시정 명령 처리 중...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionalManagementModal;
