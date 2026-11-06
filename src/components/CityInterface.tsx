import React, { useState, useEffect } from 'react';
import { Character, CityTier, DistrictType, Item, Enemy, JobType, DiplomaticStatus, WantedRank, Quest, SocialAppointment } from '../types';
import { NATION_INFO, DISTRICT_CONFIG, TIER_DISTRICTS, WORLD_GEOGRAPHY, TEMPLE_MESSENGER_MAP, MAGYE_LEADERS, INFAMY_CONFIG, MAGYE_DOMINION_MAP } from '../constants';
import { generateEnemyStats } from '../utils';
import { SHOP_INVENTORY, NATION_SPECIFIC_ITEMS, getCityScroll } from '../ItemData';
import { getMonsterInfo, NATION_THEMES, HUNT_LEVEL_BANDS } from '../monsterfield';
import { 
    X, Building2, Store, Users, Shield, TowerControl, Tent, Crown, Home, Sword, 
    MapPin, AlertTriangle, Coins, Key, BookOpen, Skull, Sparkles, CloudSun, Ghost, 
    ScrollText, Medal, Sun, Landmark, Trees, PawPrint, Gavel, Trophy, Flame, 
    CheckCircle, Ghost as GhostIcon, ShieldAlert, TrendingUp, UserCheck, ChevronRight, 
    Compass, Award, ShieldCheck, Sparkle, Globe, Eye, Truck, ShoppingBag, Calendar, Heart, Moon, Clock
} from 'lucide-react';
import ShopModal from './ShopModal';
import SchoolModal from './SchoolModal';
import AuctionModal from './AuctionModal';
import ActionResultModal, { ResultData } from './ActionResultModal';
import HuntMapModal from './HuntMapModal';
import DungeonModal from './DungeonModal';
import InstantDungeonModal from './InstantDungeonModal';
import MercenaryGuildModal from './MercenaryGuildModal'; 
import MilitaryModal from './MilitaryModal'; 
import DivineAwakeningModal from './DivineAwakeningModal'; 
import TempleManagementModal from './TempleManagementModal'; 
import MagyeDominionModal from './MagyeDominionModal';
import ElfCityModal from './ElfCityModal'; 
import BeastCityModal from './BeastCityModal'; 
import DemonCityModal from './DemonCityModal'; 
import GrandArenaModal from './GrandArenaModal'; 
import FrontlineModal from './FrontlineModal';
import BackAlleyModal from './BackAlleyModal';
import { ProphetModal } from './ProphetModal';
import MagyeAwakeningModal from './MagyeAwakeningModal';
import MagyePromoteModal from './MagyePromoteModal';
import { SEASONAL_BOSS_CONFIG } from '../bossMonsters';
import MagyeWarModal from './MagyeWarModal';
import { generateWantedEncounter } from '../wantedEnemies';
import KingMeetingModal from './KingMeetingModal';
import RegionalManagementModal from './RegionalManagementModal';
import PotentialBreakthroughModal from './PotentialBreakthroughModal';
import { BlackMarketModal } from './BlackMarketModal';
import { AppointmentEncounterModal } from './AppointmentEncounterModal';
import { processInnRest } from '../services/timeEngine';
import { getDailyRandomEncounters } from '../services/randomEncounterService';
import RandomEncounterModal from './RandomEncounterModal';
import CondolenceModal from './CondolenceModal';
import { InnModal } from './InnModal';
import { Companion } from '../types';
import FacilityClosedModal from './FacilityClosedModal';
import { getFacilityOperatingState, StandardFacilityType } from '../services/facilityOperatingService';
import EternalRivalModal from './EternalRivalModal';
import { createRivalEnemies } from '../services/npcLifeEngine';
import { getValidRivalLocation, hasFoughtRivalThisMonth, recordRivalDuel } from '../services/rivalLocationService';

interface Props {
    character: Character;
    onClose: () => void;
    onAction: (action: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
    onOpenDungeon?: () => void;
    initialDistrict?: DistrictType | 'Gate';
    initialOpenHuntMap?: boolean;
    initialBandId?: string;
    initialOpenInstantDungeonId?: string;
}

const CityInterface: React.FC<Props> = ({ 
    character, 
    onClose, 
    onAction, 
    onUpdateCharacter, 
    onBattle, 
    onOpenDungeon,
    initialDistrict,
    initialOpenHuntMap,
    initialBandId,
    initialOpenInstantDungeonId
}) => {
    const loc = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };
    
    const isMagye = loc.region === '마계' || loc.nation === '임페리얼 제국';
    const isShingye = loc.region === '신계';
    const isElfNation = loc.nation === '미르탈 숲연합';
    const isBeastNation = loc.nation === '레오니스 투기국'; 
    const isDemonNation = loc.nation === '네크로디움 제국'; 
    
    // 마계 리더 여부 판단
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);

    // 전쟁 상태 판정 로직
    const nationRelation = character.militaryData?.diplomacy?.[loc.nation];
    const isWarState = nationRelation?.status === DiplomaticStatus.WAR;
    const isVassalOwner = nationRelation?.status === DiplomaticStatus.VASSAL_OWNER;
    const isVassalSubject = nationRelation?.status === DiplomaticStatus.VASSAL_SUBJECT;
    const isRaidOccupationClaimedToday = nationRelation?.lastRaidOccupationDate === (character.currentDate || '2000-01-01');

    // 수도 판정
    let tier: CityTier = 'City';
    const regionData = WORLD_GEOGRAPHY[loc.region];
    if (regionData && regionData[loc.nation] && regionData[loc.nation].capital === loc.city) {
        tier = 'Capital';
    } else {
        if (loc.city && ['부산', '오사카', '상하이', '뉴욕', 'LA', '시드니', '런던', '베를린', '파리'].includes(loc.city)) tier = 'City';
        else tier = 'Town';
    }
    const isCapital = tier === 'Capital';

    const [currentDistrict, setCurrentDistrict] = useState<DistrictType | 'Gate'>(
        initialDistrict || (isShingye || isElfNation || isBeastNation || isDemonNation ? 'Outskirts' : 'Gate')
    );
    const [entered, setEntered] = useState(
        initialDistrict ? true : (isShingye || isElfNation || isBeastNation || isDemonNation)
    );
    
    // Modal states
    const [activeShop, setActiveShop] = useState<'General' | 'Weapon' | 'Armor' | null>(null);
    const [isSchoolOpen, setIsSchoolOpen] = useState(false);
    const [isAuctionOpen, setIsAuctionOpen] = useState(false);
    const [isHuntMapOpen, setIsHuntMapOpen] = useState(!!initialOpenHuntMap && !initialOpenInstantDungeonId);
    const [isDungeonOpen, setIsDungeonOpen] = useState(false);
    const [isInstantDungeonOpen, setIsInstantDungeonOpen] = useState(!!initialOpenInstantDungeonId);
    const [selectedInstantDungeonId, setSelectedInstantDungeonId] = useState<string | null>(initialOpenInstantDungeonId || null);
    const [isMercenaryGuildOpen, setIsMercenaryGuildOpen] = useState(false); 
    const [isMilitaryModalOpen, setIsMilitaryModalOpen] = useState(false);
    const [isDivineAwakeningOpen, setIsDivineAwakeningOpen] = useState(false);
    const [isTempleManagementOpen, setIsTempleManagementOpen] = useState(false); 
    const [isHallOfTrialsOpen, setIsHallOfTrialsOpen] = useState(false);
    const [isMagyeDominionOpen, setIsMagyeDominionOpen] = useState(false);
    const [isElfCityOpen, setIsElfCityOpen] = useState(false); 
    const [isBeastCityOpen, setIsBeastCityOpen] = useState(false);
    const [isDemonCityOpen, setIsDemonCityOpen] = useState(false);
    const [isGrandArenaOpen, setIsGrandArenaOpen] = useState(false); 
    const [isFrontlineOpen, setIsFrontlineOpen] = useState(false);
    const [isBackAlleyOpen, setIsBackAlleyOpen] = useState(false);
    const [isProphetOpen, setIsProphetOpen] = useState(false);
    const [isMagyeAwakeningOpen, setIsMagyeAwakeningOpen] = useState(false);
    const [isMagyePromoteOpen, setIsMagyePromoteOpen] = useState(false);
    const [isEternalRivalModalOpen, setIsEternalRivalModalOpen] = useState(false);
    const [isMagyeWarOpen, setIsMagyeWarOpen] = useState(false);
    const [isKingMeetingOpen, setIsKingMeetingOpen] = useState(false);
    const [isRegionalManagementOpen, setIsRegionalManagementOpen] = useState(false);
    const [isBlackMarketOpen, setIsBlackMarketOpen] = useState(false);
    const [isCondolenceModalOpen, setIsCondolenceModalOpen] = useState(false);
    const [isInnOpen, setIsInnOpen] = useState(false);
    const [isFacilityClosedOpen, setIsFacilityClosedOpen] = useState(false);
    const [closedFacilityType, setClosedFacilityType] = useState<StandardFacilityType>('Commercial');
    const [selectedAppointment, setSelectedAppointment] = useState<SocialAppointment | null>(null);
    const [selectedRandomNpc, setSelectedRandomNpc] = useState<Companion | null>(null);

    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

    useEffect(() => {
        if (initialOpenInstantDungeonId) {
            setIsInstantDungeonOpen(true);
            setSelectedInstantDungeonId(initialOpenInstantDungeonId);
            setIsHuntMapOpen(false);
        } else if (initialOpenHuntMap !== undefined) {
            setIsHuntMapOpen(!!initialOpenHuntMap);
        }
    }, [initialOpenHuntMap, initialOpenInstantDungeonId]);

    const clearExpiredNotifications = () => {
        const newChar = { ...character };
        if (newChar.mercenaryData) {
            newChar.mercenaryData.expiredQuestNotifications = [];
        }
        if (newChar.militaryData) {
            newChar.militaryData.expiredMissionNotifications = [];
        }
        onUpdateCharacter(newChar, "만료된 퀘스트 알림을 확인했습니다.");
    };

    const handleOpenFacilityWithCheck = (facilityType: StandardFacilityType, onOpen: () => void) => {
        const opState = getFacilityOperatingState(facilityType, character.currentTime);
        if (!opState.isOpen) {
            setClosedFacilityType(facilityType);
            setIsFacilityClosedOpen(true);
            return;
        }
        onOpen();
    };

    const getInfamyStage = (val: number = 0) => {
        const { STAGES } = INFAMY_CONFIG;
        if (val >= STAGES.CALAMITY.threshold) return STAGES.CALAMITY;
        if (val >= STAGES.DISASTER.threshold) return STAGES.DISASTER;
        if (val >= STAGES.WANTED.threshold) return STAGES.WANTED;
        if (val >= STAGES.CRIMINAL.threshold) return STAGES.CRIMINAL;
        if (val >= STAGES.SUSPECT.threshold) return STAGES.SUSPECT;
        return STAGES.NONE;
    };

    const hasMagyeWarAccess = isMagyeLeader && isMagye;
    const infamyStage = getInfamyStage(character.infamy || 0);
    const isWanted = infamyStage.rank !== WantedRank.NONE;

    const nationConf = NATION_INFO[loc.nation] || { 
        name: loc.nation, rulerRace: "Human", politics: "Kingdom", 
        religion: "Unknown", militaryRank: "C", magicTech: "Low", tolerance: "Mid" 
    };

    const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 1;
    const isArenaSeason = currentMonth === 12 && (tier === 'Capital' || tier === 'City');
    const isMercenary = character.job === JobType.MERCENARY;

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    const hasMilitaryAccess = (character.job === JobType.SOLDIER && character.nation === loc.nation) || 
        allComps.some(c => c.job === JobType.SOLDIER && c.nation === loc.nation);

    // 지역 관리 권한 확인
    const isRegionalAuthority = (() => {
        if (!character.militaryData) return false;
        const city = loc.city;
        const playerIsCmdr = character.militaryData.regionalAppointments?.[city] === 'player';
        const playerIsVice = character.militaryData.regionalViceAppointments?.[city] === 'player';
        if (playerIsCmdr || playerIsVice) return true;

        const compIsCmdr = character.companions.some(c => character.militaryData?.regionalAppointments?.[city] === c.id);
        const compIsVice = character.companions.some(c => character.militaryData?.regionalViceAppointments?.[city] === c.id);
        return compIsCmdr || compIsVice;
    })();

    const hasImperialNationality = character.nation === "임페리얼 제국" || 
        allComps.some(c => c.nation === "임페리얼 제국");

    // 마계 지배권 확인
    const requiredDominionJob = MAGYE_DOMINION_MAP[loc.city || ''];
    let activeDominator: any = null;
    if (requiredDominionJob) {
        if (character.job === requiredDominionJob) activeDominator = character;
        else activeDominator = allComps.find(c => c.id === (requiredDominionJob as any)) || null;
        if (!activeDominator) activeDominator = allComps.find(c => c.job === requiredDominionJob) || null;
    }
    const canManageDominion = !!activeDominator && isMagye;

    let availableDistricts: (DistrictType | 'Gate')[] = [];
    if (isMagye) {
        availableDistricts = ['Outskirts', 'Imperial'];
    } else if (isShingye) {
        availableDistricts = ['Outskirts', 'Imperial'];
    } else if (isElfNation || isBeastNation || isDemonNation) {
        availableDistricts = ['Outskirts', 'Commercial', 'Residential', 'Academic']; 
    } else {
        availableDistricts = TIER_DISTRICTS[tier];
    }

    const isRejected = !isMagye && !isShingye && !isElfNation && !isBeastNation && !isDemonNation && nationConf.tolerance === 'Xenophobic' && character.race !== nationConf.rulerRace;
    
    // 통행료 계산
    let entryFee = 0;
    const today = character.currentDate || "";
    const isTollPaidToday = character.lastTollPaidDate === today && character.paidTollsToday?.includes(loc.city);

    if (!isVassalOwner && !isTollPaidToday) {
        if (!isMagye && !isShingye && !isElfNation && !isBeastNation && !isDemonNation && character.nation !== loc.nation) {
            entryFee = nationConf.tolerance === 'Low' && character.race !== nationConf.rulerRace ? 500 : 
                       nationConf.tolerance === 'Mid' && character.race !== nationConf.rulerRace ? 100 : 50; 
            
            if (isVassalSubject) entryFee *= 10;
        }
    }

    const hasEmpirePass = character.inventory.some(i => i.name === "제국의 통행증");
    const isAtAbode = loc.city === '신의 거처' && loc.nation === '신의 성소';
    const canSeeDivineBtn = isAtAbode && (
        character.level >= 500 || 
        character.companions.some(c => c.level >= 500) ||
        (character.inactiveCompanions || []).some(c => c.level >= 500)
    );

    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[loc.city || ''];
    let activeMessenger: any = null;
    if (character.job === requiredMessengerJob) {
        activeMessenger = character;
    } else {
        activeMessenger = allComps.find(c => c.id === (requiredMessengerJob as any)) || null;
        if (!activeMessenger) activeMessenger = allComps.find(c => c.job === requiredMessengerJob) || null;
    }

    const canManageTemple = !!activeMessenger && loc.city !== '신의 거처';
    const seasonalConfig = SEASONAL_BOSS_CONFIG[currentMonth];
    const isSeasonalEvent = Array.isArray(seasonalConfig) && seasonalConfig.some(config => config.nation === loc.nation && config.city === loc.city);

    const getShopDisplayItems = () => {
        if (!activeShop) return [];
        const baseItems = activeShop === 'General' ? SHOP_INVENTORY[tier].general : 
                          activeShop === 'Weapon' ? SHOP_INVENTORY[tier].weapon : 
                          SHOP_INVENTORY[tier].armor;
        
        let dynamicItems = [...baseItems];
        if (activeShop === 'General') {
            const cityScroll = getCityScroll(loc.nation, loc.city);
            dynamicItems.push(cityScroll);
        }

        const nationItems = NATION_SPECIFIC_ITEMS[loc.nation] || [];
        let filteredNationItems: Item[] = [];
        if (activeShop === 'General') {
            filteredNationItems = nationItems.filter(i => i.type === 'Consumable' || i.type === 'Etc');
        } else if (activeShop === 'Weapon') {
            filteredNationItems = nationItems.filter(i => i.type === 'Weapon' || i.type === 'SubWeapon');
        } else if (activeShop === 'Armor') {
            filteredNationItems = nationItems.filter(i => ['Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(i.type));
        }
        
        const allItems = [...dynamicItems, ...filteredNationItems];

        return allItems.map(item => {
            const stockKey = `${item.name}_${loc.city}_${activeShop}`;
            if (character.shopStock && character.shopStock[stockKey] !== undefined) {
                return { ...item, stock: character.shopStock[stockKey] };
            }
            return item;
        });
    };

    const handleEnterCity = () => {
        if (isWarState) {
            setResultData({
                type: 'warning',
                title: isMagyeLeader ? '적국 도시에 접근' : '전쟁 중 진입 불가',
                message: isMagyeLeader 
                    ? '제국의 지배자여, 인간들은 당신을 침략자로 규정하고 성문을 굳게 걸어 잠갔습니다.\n무력으로 전선을 돌파해야 합니다.'
                    : '적국과의 전쟁으로 인해 성문이 굳게 닫혀 있습니다.\n거점을 습격하여 점유율을 확보해야 합니다.',
                items: [{ label: '상태', after: '교전 중' }]
            });
            return;
        }
        if (character.wantedClearanceCity === loc.city) {
            const newChar = { ...character, wantedClearanceCity: undefined };
            onUpdateCharacter(newChar, `[도시 진입] 이전에 성문을 돌파했으므로 경비병들이 길을 열어줍니다.`);
            setEntered(true);
            setCurrentDistrict('Commercial');
            return;
        }

        if (isWanted) {
            const spawnChance = infamyStage.spawnChance || 0;
            if (Math.random() < spawnChance) {
                const enemies = generateWantedEncounter(loc.nation, character.level, character.infamy || 0);
                const isHunter = enemies[0].name.includes('HUNTER');
                
                setResultData({
                    type: 'destroy',
                    title: isHunter ? '현상금 사냥꾼 급습!' : '국가 토벌대 조우!',
                    message: isHunter 
                        ? '사냥꾼: "네놈의 목에 걸린 금화 냄새가 여기까지 나는군! 조용히 따라오시지."' 
                        : '경비병: "잠깐! 네놈의 얼굴, 수배 전단에서 봤다! 네놈이 바로 그 현상수배범이군!"',
                    items: [
                        { label: '위험 등급', after: infamyStage.label },
                        { label: '적군 구성', after: isHunter ? '현상금 사냥꾼' : '국가 정예 토벌대' }
                    ]
                });
                setConfirmAction(() => () => {
                    if (onBattle) {
                        onBattle(enemies, 'wanted_battle');
                        onClose();
                    }
                });
                return;
            }
        }

        if (loc.nation === "임페리얼 제국") {
            if (hasEmpirePass || hasImperialNationality || isMagyeLeader) {
                setEntered(true);
                setCurrentDistrict('Outskirts');
                const logMsg = isMagyeLeader ? `[제국 진입] 지배자의 위엄 앞에 경비병들이 길을 비켜줍니다.` : (hasImperialNationality ? `[제국 진입] 일행 중 제국 국적자가 포함되어 있어 검문 없이 통과합니다.` : `[제국 진입] 제국의 통행증을 제시하여 검문을 통과했습니다.`);
                onUpdateCharacter(character, logMsg);
                return;
            }
            onAction("[BOSS_START] 문지기 케르베로스");
            onClose(); 
            return;
        }
        
        if (isRejected) {
            setResultData({ type: 'warning', title: '입장 거부', message: '경비병: "이 도시에는 네놈 같은 종족이 들어올 수 없다! 당장 꺼져라!"', items: [{ label: '이유', after: '종족 차별' }] });
            return;
        }
        if (character.money < entryFee) {
            setResultData({ type: 'warning', title: '입장 불가', message: `경비병: "통행료가 부족하군. ${entryFee}G를 내지 못하면 들어갈 수 없다."`, items: [{ label: '부족 금액', after: `${entryFee - character.money} G` }] });
            return;
        }
        
        if (entryFee > 0) {
            const todayStr = character.currentDate || "";
            let paidCities = [...(character.paidTollsToday || [])];
            if (character.lastTollPaidDate !== todayStr) {
                paidCities = [];
            }
            if (!paidCities.includes(loc.city)) {
                paidCities.push(loc.city);
            }

            const newChar = { 
                ...character, 
                money: character.money - entryFee,
                paidTollsToday: paidCities,
                lastTollPaidDate: todayStr
            };
            onUpdateCharacter(newChar, `[시스템] 도시 입장료 ${entryFee}G 지불 (속국 가중치 적용)`);
        }
        setEntered(true);
        setCurrentDistrict(isElfNation || isBeastNation || isDemonNation ? 'Residential' : 'Commercial'); 
    };

    const handleRaid = () => {
        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        const currentNation = loc.nation; // 습격한 대상 적국
        let isQuestUpdated = false;

        if (newChar.militaryData?.diplomacy?.[currentNation]) {
            const rel = newChar.militaryData.diplomacy[currentNation];
            const currentOccupation = rel.occupation || 0;

            if (newChar.militaryData.activeMissions) {
                newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.map(m => {
                    if (m.type === 'MilitaryAttackShare' && (m.currentAmount || 0) < (m.targetAmount || 1)) {
                        const questNation = m.targetNation || m.location?.nation;
                        const reqShare = m.requiredTotalShare || ((m.initialShare || 0) + (m.targetShare || 5));
                        
                        // 습격한 대상 국가가 퀘스트 지정 적국과 일치하고, 목표 점유율을 충족한 경우에만 완료 가능
                        if (questNation === currentNation && currentOccupation >= reqShare) {
                            isQuestUpdated = true;
                            return {
                                ...m,
                                currentAmount: m.targetAmount || 1
                            };
                        }
                    }
                    return m;
                });
            }
        }

        if (isQuestUpdated) {
            onUpdateCharacter(newChar, `[거점 습격] ${currentNation} 거점 습격으로 목표 점유율을 충족했습니다! (전선 공세 퀘스트 완수 가능)`);
        }

        onAction('[전쟁 습격] 거점 기습');
        onClose();
    };

    const handleDistrictAction = (action: string) => {
        onAction(`[도시 활동] (${loc.city} - ${DISTRICT_CONFIG[currentDistrict as DistrictType]?.label || currentDistrict}) ${action}`);
    };

    const handleStartEscortQuest = (quest: Quest) => {
        const newChar = { ...character };
        let updated = false;

        if (newChar.militaryData?.activeMissions) {
            const missionIdx = newChar.militaryData.activeMissions.findIndex(q => q.id === quest.id);
            if (missionIdx !== -1) {
                newChar.militaryData.activeMissions[missionIdx] = { 
                    ...newChar.militaryData.activeMissions[missionIdx], 
                    isEscortStarted: true 
                };
                updated = true;
            }
        }
        
        if (!updated && newChar.mercenaryData?.activeQuests) {
            const questIdx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === quest.id);
            if (questIdx !== -1) {
                newChar.mercenaryData.activeQuests[questIdx] = { 
                    ...newChar.mercenaryData.activeQuests[questIdx], 
                    isEscortStarted: true 
                };
                updated = true;
            }
        }
        
        if (updated) {
            const targetName = quest.type === 'EscortKing' ? '국왕 폐하' :
                               quest.type === 'EscortNoble' ? '귀족' :
                               quest.type === 'MercenaryEscort' ? '상단 및 호송 대열' : '군사 호송 물류대';
            const logMsg = `[호송/호위 시작] ${quest.title} - 목적지 ${quest.destination?.city || '지정 도시'}까지 이동 시작`;
            onUpdateCharacter(newChar, logMsg);
            setResultData({
                type: 'success',
                title: `🛡️ ${quest.title} 출발`,
                message: `${targetName}이(가) 호위 대열에 합류했습니다. 지도(M)를 열어 목적지 [${quest.destination?.city || '목적지'}]로 이동하십시오!\n이동 중 몬스터 및 습격자의 기습에 주의하십시오.`,
                items: [
                    { label: '목적지 도시', after: quest.destination?.city || '알 수 없음' },
                    { label: '목적지 국가', after: quest.destination?.nation || '자국' },
                    { label: '예상 보상', after: `${(quest.rewardGold || 0).toLocaleString()}G / ${(quest.rewardExp || 0).toLocaleString()}EXP` }
                ]
            });
        } else {
            setResultData({
                type: 'warning',
                title: '오류 발생',
                message: '해당 호위 임무 데이터를 찾을 수 없습니다. 퀘스트 목록을 확인해주세요.',
                items: [{ label: '퀘스트 ID', after: quest.id }]
            });
        }
    };

    const handleInnRest = () => {
        const cost = 50;
        if (character.money < cost) {
            setResultData({
                type: 'warning',
                title: '골드 부족',
                message: '여관에서 하룻밤을 묵기 위해서는 50G가 필요합니다.',
                items: [{ label: '현재 골드', after: `${(character.money || 0).toLocaleString()} G` }, { label: '필요 골드', after: '50 G' }]
            });
            return;
        }

        const charWithMoneyDeducted = { ...character, money: character.money - cost };
        const { updatedCharacter, systemLogs } = processInnRest(charWithMoneyDeducted);
        const lastLog = systemLogs[0] || "[여관 휴식] 여관에서 편안한 휴식을 취했습니다.";
        
        onUpdateCharacter(updatedCharacter, lastLog);
        
        setResultData({
            type: 'success',
            title: '여관 휴식 완료',
            message: lastLog.replace('[여관 휴식] ', ''),
            items: [
                { label: '소모 골드', after: `-${cost} G` },
                { label: 'HP/MP 회복', after: '100%' },
                { label: '상태이상', after: '모두 해제' },
                { label: '경과 날짜', after: '+1일' }
            ]
        });
    };

    const handleRegionalDefenseBattle = (quest: any) => {
        if (!onBattle) return;
        
        const avgLevel = quest.level || character.level;
        const enemies: Enemy[] = [];
        const enemyCount = 3 + Math.floor(Math.random() * 3);
        
        const questNation = quest.location?.nation || quest.destination?.nation || loc.nation;
        const theme = NATION_THEMES[questNation] || NATION_THEMES[loc.nation] || NATION_THEMES["default"];
        const band = HUNT_LEVEL_BANDS.find(b => avgLevel >= b.levelRange[0] && avgLevel <= b.levelRange[1]) || HUNT_LEVEL_BANDS[0];
        const monsterPool = theme.monsters[band.id] || theme.monsters["beginner"];

        const defaultMonsterNameOrInfo = monsterPool[Math.floor(Math.random() * monsterPool.length)];
        const baseMonsterName = quest.targetName || (typeof defaultMonsterNameOrInfo === 'string' ? defaultMonsterNameOrInfo : defaultMonsterNameOrInfo.name);
        const monsterInfo = getMonsterInfo(baseMonsterName);

        for (let i = 0; i < enemyCount; i++) {
            const stats = generateEnemyStats(avgLevel, 'normal');
            enemies.push({
                name: `${baseMonsterName} ${String.fromCharCode(65 + i)}`,
                level: avgLevel,
                hp: stats.maxHp,
                maxHp: stats.maxHp,
                stats: stats,
                statusEffects: [],
                visualUrl: monsterInfo.visualUrl,
                shinryokuType: "무속성"
            });
        }
        
        const eliteBandIdx = Math.min(HUNT_LEVEL_BANDS.indexOf(band) + 1, HUNT_LEVEL_BANDS.length - 1);
        const eliteBand = HUNT_LEVEL_BANDS[eliteBandIdx];
        const elitePool = theme.monsters[eliteBand.id] || monsterPool;
        const defaultBossNameOrInfo = elitePool[Math.floor(Math.random() * elitePool.length)];
        const bossName = quest.targetName ? `${quest.targetName} 우두머리` : (typeof defaultBossNameOrInfo === 'string' ? defaultBossNameOrInfo : defaultBossNameOrInfo.name);
        const bossInfo = getMonsterInfo(bossName);

        const bossStats = generateEnemyStats(avgLevel + 5, 'elite');
        enemies.push({
            name: `${bossName} (대장)`,
            level: avgLevel + 5,
            hp: bossStats.maxHp,
            maxHp: bossStats.maxHp,
            stats: bossStats,
            statusEffects: [],
            visualUrl: bossInfo.visualUrl,
            shinryokuType: "무기강화계"
        });

        const battleType = quest.type === 'MilitaryRegionalDefense' ? 'military_regional_defense' : 'emergency_rescue';
        onBattle(enemies, battleType, quest.id);
        onClose();
    };

    const handleEnterField = (bandId: string, minLvl: number, maxLvl: number) => {
        setIsHuntMapOpen(false);
        onClose();
        onUpdateCharacter({ ...character, lastHuntingBandId: bandId }, '');
        const targetLevel = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
        onAction(`[전투 돌입] 사냥터 탐색 (지역: ${bandId}, 권장레벨: ${targetLevel})`);
    };

    const handleBuyItem = (item: Item, unitPrice: number, quantity: number = 1) => {
        const totalCost = unitPrice * quantity;
        if (character.money < totalCost) {
            setResultData({ type: 'warning', title: '구매 실패', message: '골드가 부족합니다.', items: [{ label: '필요 골드', after: `${totalCost.toLocaleString()} G` }] });
            return;
        }

        const newShopStock = { ...(character.shopStock || {}) };
        if (item.stock !== undefined) {
            const stockKey = `${item.name}_${loc.city}_${activeShop}`;
            newShopStock[stockKey] = Math.max(0, (character.shopStock?.[stockKey] ?? item.stock) - quantity);
        }

        const newChar = { 
            ...character, 
            money: character.money - totalCost, 
            inventory: [...character.inventory, ...Array(quantity).fill(item)],
            shopStock: newShopStock
        };
        onUpdateCharacter(newChar, `[상점 구매] ${item.name} x${quantity} 구매 (-${totalCost}G)`);
    };

    const handleSellItem = (itemIndices: number[], unitPrice: number, quantity: number = 1) => {
        if (!itemIndices || itemIndices.length === 0) return;
        const item = character.inventory[itemIndices[0]];
        if (!item) return;

        const totalEarned = unitPrice * quantity;
        const newInventory = character.inventory.filter((_, idx) => !itemIndices.includes(idx));

        const newChar = {
            ...character,
            money: character.money + totalEarned,
            inventory: newInventory
        };
        onUpdateCharacter(newChar, `[상점 판매] ${item.name} x${quantity} 판매 완료 (+${totalEarned.toLocaleString()} G)`);
    };

    const handleOpenAuction = () => {
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
    };

    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'Gate': return Building2;
            case 'Store': return Store;
            case 'Home': return Home;
            case 'Sword': return Sword;
            case 'Shield': return Shield;
            case 'Tent': return Tent;
            case 'Users': return Users;
            case 'Crown': return Crown;
            case 'BookOpen': return BookOpen;
            default: return MapPin;
        }
    };

    const handleModalClose = () => { setResultData(null); setConfirmAction(null); };

    // Get Theme Styles
    const getThemeConfig = () => {
        if (isCapital) {
            return {
                containerBorder: 'border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.25)]',
                bgGradient: 'bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/30',
                headerBg: 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 border-amber-500/40',
                accentColor: 'text-amber-400',
                accentBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                districtActive: 'bg-gradient-to-r from-amber-500/20 to-transparent text-amber-300 border-amber-400',
                tag: '👑 제국 수도 (Capital)',
                tagClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
            };
        }
        if (isMagye) {
            return {
                containerBorder: 'border-red-600/60 shadow-[0_0_50px_rgba(220,38,38,0.3)]',
                bgGradient: 'bg-gradient-to-b from-slate-950 via-red-950/20 to-black',
                headerBg: 'bg-gradient-to-r from-red-950/80 via-slate-950 to-black border-red-800/50',
                accentColor: 'text-red-400',
                accentBg: 'bg-red-500/10 border-red-500/30 text-red-300',
                districtActive: 'bg-gradient-to-r from-red-500/20 to-transparent text-red-300 border-red-500',
                tag: '💀 마계 제국령',
                tagClass: 'bg-red-950/60 text-red-400 border-red-800 animate-pulse'
            };
        }
        if (isShingye) {
            return {
                containerBorder: 'border-amber-400/60 shadow-[0_0_50px_rgba(251,191,36,0.3)]',
                bgGradient: 'bg-gradient-to-b from-indigo-950 via-slate-950 to-amber-950/30',
                headerBg: 'bg-gradient-to-r from-indigo-950/80 via-slate-950 to-amber-950/40 border-amber-500/40',
                accentColor: 'text-amber-300',
                accentBg: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
                districtActive: 'bg-gradient-to-r from-amber-400/20 to-transparent text-amber-300 border-amber-400',
                tag: '✨ 신계 성역',
                tagClass: 'bg-amber-950/60 text-amber-300 border-amber-500/50'
            };
        }
        if (isElfNation) {
            return {
                containerBorder: 'border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]',
                bgGradient: 'bg-gradient-to-b from-emerald-950/30 via-slate-950 to-slate-950',
                headerBg: 'bg-gradient-to-r from-emerald-950/70 via-slate-950 to-slate-950 border-emerald-700/50',
                accentColor: 'text-emerald-400',
                accentBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                districtActive: 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-300 border-emerald-500',
                tag: '🌿 엘프 연맹',
                tagClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
            };
        }
        if (isBeastNation) {
            return {
                containerBorder: 'border-orange-500/60 shadow-[0_0_40px_rgba(249,115,22,0.2)]',
                bgGradient: 'bg-gradient-to-b from-orange-950/30 via-slate-950 to-slate-950',
                headerBg: 'bg-gradient-to-r from-orange-950/70 via-slate-950 to-slate-950 border-orange-700/50',
                accentColor: 'text-orange-400',
                accentBg: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
                districtActive: 'bg-gradient-to-r from-orange-500/20 to-transparent text-orange-300 border-orange-500',
                tag: '🐾 수인 투기국',
                tagClass: 'bg-orange-950/60 text-orange-300 border-orange-700'
            };
        }
        if (isDemonNation) {
            return {
                containerBorder: 'border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.2)]',
                bgGradient: 'bg-gradient-to-b from-purple-950/30 via-slate-950 to-slate-950',
                headerBg: 'bg-gradient-to-r from-purple-950/70 via-slate-950 to-slate-950 border-purple-700/50',
                accentColor: 'text-purple-400',
                accentBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
                districtActive: 'bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border-purple-500',
                tag: '🔮 마인 제국',
                tagClass: 'bg-purple-950/60 text-purple-300 border-purple-700'
            };
        }
        return {
            containerBorder: 'border-slate-700/80 shadow-[0_0_40px_rgba(0,0,0,0.6)]',
            bgGradient: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
            headerBg: 'bg-slate-950 border-slate-800',
            accentColor: 'text-cyan-400',
            accentBg: 'bg-slate-800 border-slate-700 text-slate-300',
            districtActive: 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-300 border-cyan-400',
            tag: tier === 'City' ? '🏙️ 대도시' : '🏡 소도시/마을',
            tagClass: 'bg-slate-800 text-slate-300 border-slate-700'
        };
    };

    const theme = getThemeConfig();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
            {/* Modal Dialogs */}
            {resultData && (
                <ActionResultModal 
                    key="action-result-modal"
                    data={resultData} 
                    onClose={handleModalClose} 
                    onContinue={confirmAction ? () => { confirmAction(); handleModalClose(); } : undefined} 
                />
            )}
            
            {activeShop && (
                <ShopModal 
                    key="shop-modal"
                    title={activeShop === 'General' ? "잡화점" : activeShop === 'Weapon' ? "무기점" : "방어구점"} 
                    items={getShopDisplayItems()} 
                    character={character} 
                    onBuy={handleBuyItem} 
                    onClose={() => setActiveShop(null)} 
                    onSell={handleSellItem}
                />
            )}
            {isSchoolOpen && <SchoolModal key="school-modal" character={character} onClose={() => setIsSchoolOpen(false)} onUpdateCharacter={onUpdateCharacter} onAction={onAction} onBattle={onBattle} />}
            {isAuctionOpen && <AuctionModal key="auction-modal" character={character} onClose={() => setIsAuctionOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {isHuntMapOpen && (
                <HuntMapModal 
                    key="hunt-map-modal"
                    isOpen={isHuntMapOpen} 
                    character={character} 
                    onClose={() => setIsHuntMapOpen(false)} 
                    onEnterField={handleEnterField} 
                    initialBandId={initialBandId || character.lastHuntingBandId}
                />
            )}
            {isDungeonOpen && onBattle && (
                <DungeonModal 
                    key="dungeon-modal"
                    isOpen={isDungeonOpen} 
                    character={character} 
                    onClose={() => setIsDungeonOpen(false)} 
                    onBattle={(enemy) => onBattle(enemy, 'dungeon')} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isInstantDungeonOpen && selectedInstantDungeonId && onBattle && (
                <InstantDungeonModal
                    key="instant-dungeon-modal"
                    isOpen={isInstantDungeonOpen}
                    character={character}
                    dungeon={character.instantDungeons?.find(d => d.id === selectedInstantDungeonId)!}
                    onClose={() => {
                        setIsInstantDungeonOpen(false);
                        setSelectedInstantDungeonId(null);
                    }}
                    onBattle={(enemy, type) => onBattle(enemy, type)}
                    onUpdateCharacter={onUpdateCharacter}
                    onClear={(dungeonId) => {
                        const newChar = { ...character };
                        if (newChar.instantDungeons) {
                            newChar.instantDungeons = newChar.instantDungeons.filter(d => d.id !== dungeonId);
                        }
                        onUpdateCharacter(newChar, `[던전 정복] 인스턴트 던전이 소멸했습니다.`);
                    }}
                />
            )}
            {isMercenaryGuildOpen && (
                <MercenaryGuildModal
                    key="mercenary-guild-modal"
                    character={character}
                    onClose={() => setIsMercenaryGuildOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction}
                />
            )}
            {isMilitaryModalOpen && (
                <MilitaryModal
                    key="military-modal"
                    character={character}
                    onClose={() => setIsMilitaryModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction}
                />
            )}
            {isDivineAwakeningOpen && (
                <DivineAwakeningModal 
                    key="divine-awakening-modal"
                    character={character} 
                    onClose={() => setIsDivineAwakeningOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isHallOfTrialsOpen && (
                <PotentialBreakthroughModal
                    key="potential-breakthrough-modal"
                    isOpen={isHallOfTrialsOpen}
                    character={character}
                    isHallOfTrials={true}
                    initialTab="final_trial"
                    onClose={() => setIsHallOfTrialsOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source) => {
                        if (onBattle) {
                            onBattle(enemy, type, source);
                            onClose();
                        }
                    }}
                />
            )}
            {isTempleManagementOpen && (
                <TempleManagementModal 
                    key="temple-management-modal"
                    character={character} 
                    onClose={() => setIsTempleManagementOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                    onAction={onAction}
                    onBattle={(enemy, type) => onBattle!(enemy, type || 'normal')} 
                />
            )}
            {isMagyeDominionOpen && (
                <MagyeDominionModal
                    key="magye-dominion-modal"
                    character={character}
                    onClose={() => setIsMagyeDominionOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isElfCityOpen && (
                <ElfCityModal 
                    key="elf-city-modal"
                    character={character} 
                    onClose={() => setIsElfCityOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isBeastCityOpen && (
                <BeastCityModal
                    key="beast-city-modal"
                    character={character}
                    onClose={() => setIsBeastCityOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isDemonCityOpen && (
                <DemonCityModal
                    key="demon-city-modal"
                    character={character}
                    onClose={() => setIsDemonCityOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isGrandArenaOpen && (
                <GrandArenaModal
                    key="grand-arena-modal"
                    character={character}
                    onClose={() => setIsGrandArenaOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy) => onBattle!(enemy, 'arena')}
                />
            )}
            {isFrontlineOpen && loc.nation && (
                <FrontlineModal 
                    key="frontline-modal"
                    character={character}
                    targetNation={loc.nation}
                    onClose={() => setIsFrontlineOpen(false)}
                    onAttack={() => {
                        setIsFrontlineOpen(false);
                        onClose();
                        onUpdateCharacter(character, `[군사 작전] ${loc.nation} 전선 돌파 작전을 개시합니다.`);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isBackAlleyOpen && (
                <BackAlleyModal 
                    key="back-alley-modal"
                    character={character}
                    onClose={() => setIsBackAlleyOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={onBattle!}
                />
            )}
            {isFacilityClosedOpen && (
                <FacilityClosedModal
                    key="facility-closed-modal"
                    isOpen={isFacilityClosedOpen}
                    onClose={() => setIsFacilityClosedOpen(false)}
                    facilityType={closedFacilityType}
                    currentTime={character.currentTime}
                    onGoToBackAlley={() => {
                        setIsFacilityClosedOpen(false);
                        setIsBackAlleyOpen(true);
                    }}
                />
            )}
            {isProphetOpen && (
                <ProphetModal 
                    key="prophet-modal"
                    character={character}
                    onClose={() => setIsProphetOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isMagyeAwakeningOpen && (
                <MagyeAwakeningModal
                    key="magye-awakening-modal"
                    character={character}
                    onClose={() => setIsMagyeAwakeningOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isMagyePromoteOpen && (
                <MagyePromoteModal 
                    key="magye-promote-modal"
                    character={character}
                    onClose={() => setIsMagyePromoteOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isRegionalManagementOpen && (
                <RegionalManagementModal
                    key="regional-management-modal"
                    character={character}
                    onClose={() => setIsRegionalManagementOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isMagyeWarOpen && (
                <MagyeWarModal 
                    key="magye-war-modal"
                    character={character}
                    onClose={() => setIsMagyeWarOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, city, nation) => onBattle!(enemy, type, source, city, nation)}
                    onAction={onAction}
                />
            )}
            {isKingMeetingOpen && (
                <KingMeetingModal
                    key="king-meeting-modal"
                    character={character}
                    onClose={() => setIsKingMeetingOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onAction={onAction}
                />
            )}
            {isBlackMarketOpen && (
                <BlackMarketModal
                    key="black-market-modal"
                    character={character}
                    onClose={() => setIsBlackMarketOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {selectedAppointment && (
                <AppointmentEncounterModal
                    key="appointment-encounter-modal"
                    isOpen={true}
                    character={character}
                    appointment={selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onUpdateCharacter={(updater) => {
                        if (typeof updater === 'function') {
                            const updated = updater(character);
                            onUpdateCharacter(updated, '인연과의 약속 상호작용');
                        } else {
                            onUpdateCharacter(updater, '인연과의 약속 상호작용');
                        }
                    }}
                    onBattle={(enemy, type, source) => {
                        setSelectedAppointment(null);
                        onClose();
                        if (onBattle) {
                            onBattle(enemy, type, source);
                        }
                    }}
                />
            )}
            {selectedRandomNpc && (
                <RandomEncounterModal
                    key="random-encounter-modal"
                    character={character}
                    npc={selectedRandomNpc}
                    onClose={() => setSelectedRandomNpc(null)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source) => {
                        setSelectedRandomNpc(null);
                        onClose();
                        if (onBattle) {
                            onBattle(enemy, type, source);
                        }
                    }}
                />
            )}
            {isCondolenceModalOpen && (
                <CondolenceModal 
                    key="condolence-modal"
                    character={character}
                    currentLocation={loc}
                    onClose={() => setIsCondolenceModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isInnOpen && (
                <InnModal 
                    key="inn-modal"
                    character={character}
                    onClose={() => setIsInnOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isEternalRivalModalOpen && (
                <EternalRivalModal 
                    key="eternal-rival-modal"
                    character={character}
                    onClose={() => setIsEternalRivalModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={onBattle}
                />
            )}

            {/* Main City Container */}
            <div className={`w-full max-w-6xl h-[92vh] max-h-[880px] rounded-2xl border ${theme.containerBorder} ${theme.bgGradient} shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300`}>
                
                {/* WANTED Ribbon Overlay */}
                {isWanted && (
                    <div className="absolute top-16 right-8 z-30 pointer-events-none rotate-12 opacity-85 animate-pulse">
                        <div className="bg-red-600 border-2 border-red-900 text-white font-black text-xs sm:text-sm px-4 py-1 rounded shadow-[0_0_20px_rgba(220,38,38,0.8)] tracking-widest flex items-center gap-1.5">
                            <Skull size={16} />
                            <span>WANTED : {infamyStage.label}</span>
                        </div>
                    </div>
                )}

                {/* Capital City Glow Aura Accent */}
                {isCapital && (
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                )}

                {/* HEADER SECTION */}
                <div className={`px-4 sm:px-6 py-3.5 border-b shrink-0 z-20 flex justify-between items-center ${theme.headerBg} backdrop-blur-md relative`}>
                    
                    {/* Left: Location & City Crest */}
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                            isCapital 
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                                : isMagye 
                                ? 'bg-red-950 border-red-800 text-red-500' 
                                : isShingye 
                                ? 'bg-indigo-950 border-amber-500/40 text-amber-300' 
                                : 'bg-slate-900 border-slate-800 text-cyan-400'
                        }`}>
                            {isCapital ? <Crown size={22} className="animate-pulse" /> : 
                             isMagye ? <Skull size={22} className="animate-pulse" /> : 
                             isShingye ? <CloudSun size={22} /> : 
                             isElfNation ? <Trees size={22} /> : 
                             isBeastNation ? <PawPrint size={22} /> : 
                             isDemonNation ? <Ghost size={22} /> : 
                             <Building2 size={22} />}
                        </div>

                        <div>
                            {/* Breadcrumb Path */}
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span>{loc.region}</span>
                                <ChevronRight size={12} className="text-slate-600" />
                                <span className={theme.accentColor}>{loc.nation}</span>
                            </div>

                            {/* City Title with Badges */}
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <h2 className="text-lg sm:text-2xl font-black font-cinzel text-slate-100 tracking-wide flex items-center gap-2">
                                    {loc.city}
                                </h2>
                                
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border tracking-wider ${theme.tagClass}`}>
                                    {isVassalSubject ? '👑 우리의 종주국' : 
                                     isVassalOwner ? '⚔️ 우리의 속국' : 
                                     theme.tag}
                                </span>

                                {isCapital && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                                        <Sparkle size={10} className="text-amber-400" />
                                        <span>국왕/통치자 직할지</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Info & Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Gold Display Pill */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 shadow-inner">
                            <Coins size={15} className="text-amber-400 shrink-0" />
                            <div className="flex flex-col text-right leading-none">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">보유 골드</span>
                                <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                                    {(character.money || 0).toLocaleString()} <span className="text-[10px] font-normal text-amber-500">G</span>
                                </span>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-xl bg-slate-900/80 hover:bg-red-950/60 border border-slate-800 hover:border-red-700 text-slate-400 hover:text-red-300 transition-all active:scale-95 shadow-md"
                            title="도시 나가기"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* GATE / ENTRY VIEW (When not entered yet) */}
                {!entered ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 relative overflow-y-auto custom-scrollbar">
                        {/* Background Visual Pattern */}
                        <div className="max-w-xl w-full bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col items-center">
                            
                            {/* Gate Icon Embellishment */}
                            <div className={`p-5 rounded-3xl border mb-6 relative ${
                                isCapital 
                                    ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-500/50 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]' 
                                    : isWarState 
                                    ? 'bg-red-950/80 border-red-600 text-red-500 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.3)]' 
                                    : isWanted 
                                    ? 'bg-red-950/80 border-red-600 text-red-500 animate-bounce' 
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}>
                                {isWanted ? <Skull size={56} className="text-red-500" /> : 
                                 isWarState ? <Flame size={56} className="text-red-500 animate-pulse" /> : 
                                 isVassalSubject ? <Skull size={56} className="text-red-400" /> : 
                                 isCapital ? <Crown size={56} className="text-amber-400 animate-pulse" /> : 
                                 <Building2 size={56} className="text-slate-300" />}
                            </div>

                            {/* Gate Sub-Title */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    isCapital ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                                }`}>
                                    {isCapital ? 'IMPERIAL CAPITAL GATE' : 'CITY CHECKPOINT'}
                                </span>
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-black text-slate-100 font-cinzel mb-3">
                                {loc.city} {isWanted ? '경비 검문소' : isWarState ? '전선 교전 구역' : isVassalSubject ? '조공 창구' : isCapital ? '황금 대성문' : '중앙 성문'}
                            </h3>

                            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-6 font-medium">
                                {isWanted 
                                    ? "경비병: \"네놈... 어디서 많이 본 얼굴이군. 수배 전단과 일치한다! 잠시 멈춰라!\"" 
                                    : isWarState 
                                    ? (isMagyeLeader ? "제국의 지배자여, 인간들이 당신을 침략자로 규정하고 성문을 굳게 걸어 잠갔습니다." : `${character.nation}과의 전쟁으로 인해 삼엄한 경계 태세가 발령되었습니다.`) 
                                    : isVassalSubject 
                                    ? `패전의 대가로 ${loc.nation}의 엄격한 감시와 통제를 받고 있습니다.` 
                                    : isCapital 
                                    ? `제국의 영광과 위엄이 깃든 수도 ${loc.city}의 관문입니다. 입국 심사 및 통행 검문이 이루어집니다.`
                                    : `${nationConf.name}의 통행 규정에 따라 검문이 진행됩니다.`}
                            </p>

                            {/* Info Status Box */}
                            {isWanted && (
                                <div className="w-full bg-red-950/60 border border-red-500/60 p-3.5 rounded-2xl mb-6 flex items-center gap-3 text-left">
                                    <ShieldAlert size={24} className="text-red-400 shrink-0" />
                                    <div>
                                        <div className="text-xs font-black text-red-200">지명수배 상태 진입 경고</div>
                                        <div className="text-[11px] text-red-300/80">현재 {infamyStage.label} 등급으로 수배 중입니다. 진입 시 토벌대와의 전투가 벌어질 수 있습니다.</div>
                                    </div>
                                </div>
                            )}

                            {/* Entry Fee Box */}
                            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-8 flex items-center justify-between">
                                <div className="text-left">
                                    <span className="text-[10px] text-slate-400 uppercase font-mono block">통행 요금 규정</span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-200">
                                        {isTollPaidToday ? '금일 기지불 완료' : isVassalOwner ? '종주국 면제 특권' : entryFee > 0 ? `${entryFee.toLocaleString()} G` : '무료 개방'}
                                    </span>
                                </div>
                                <div>
                                    {isTollPaidToday || isVassalOwner || entryFee === 0 ? (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                            <CheckCircle size={14} /> 무료 통과 가능
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                            <Coins size={14} /> {entryFee}G 납부 필요
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <button 
                                    onClick={onClose} 
                                    className="flex-1 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs sm:text-sm transition-all active:scale-95"
                                >
                                    발길 돌리기
                                </button>

                                {isWarState ? (
                                    <button 
                                        onClick={handleRaid} 
                                        className="flex-1 py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Sword size={18} /> {isRaidOccupationClaimedToday ? '거점 습격 개시 (오늘 점유율 획득 완료)' : '거점 습격 개시'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleEnterCity} 
                                        className={`flex-1 py-3 px-6 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                            isWanted 
                                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40' 
                                                : isCapital 
                                                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 shadow-amber-900/40' 
                                                : isTollPaidToday 
                                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40' 
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                                        }`}
                                    >
                                        <Key size={18} /> 
                                        {isWanted ? '강행 돌파 시도' : isTollPaidToday ? '도시 입장하기 (무료)' : isCapital ? '수도 성문 입장' : '도시 입장하기'}
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                ) : (
                    /* ENTERED CITY VIEW: SPLIT NAVIGATION + ACTION CARDS */
                    <div className="flex flex-1 overflow-hidden">
                        
                        {/* LEFT: DISTRICTS NAVIGATION (SIDEBAR) */}
                        <div className="w-20 md:w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col overflow-y-auto custom-scrollbar shrink-0 z-10">
                            
                            {/* District Header (Desktop) */}
                            <div className="hidden md:flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Compass size={14} className={theme.accentColor} />
                                <span>구역 / 지구 선택</span>
                            </div>

                            {/* District Buttons List */}
                            <div className="p-2 space-y-1">
                                {availableDistricts.map(dKey => {
                                    if (dKey === 'Gate') return null;
                                    const config = DISTRICT_CONFIG[dKey as DistrictType];
                                    if (!config) return null;
                                    const Icon = getIcon(config.icon);
                                    
                                    let label = config.label;
                                    if (isMagye && dKey === 'Outskirts') label = '심연의 경계';
                                    if (isMagye && dKey === 'Imperial') label = '마신황의 궁궐';
                                    if (isShingye && dKey === 'Outskirts') label = '성스러운 필드';
                                    if (isShingye && dKey === 'Imperial') label = '신의 사자의 신전';
                                    if (isElfNation && dKey === 'Residential') label = '엘프 거주구';
                                    if (isElfNation && dKey === 'Academic') label = '세계수 서당';
                                    if (isBeastNation && dKey === 'Residential') label = '수인 거주구';
                                    if (isBeastNation && dKey === 'Academic') label = '투사의 연무장';
                                    if (isDemonNation && dKey === 'Residential') label = '마인 거주구'; 
                                    if (isDemonNation && dKey === 'Academic') label = '제국 흑마법 학술원'; 
                                    if (isCapital && dKey === 'Imperial') label = '황궁 및 왕립 행정청';

                                    const isSelected = currentDistrict === dKey;

                                    return (
                                        <button 
                                            key={dKey} 
                                            onClick={() => setCurrentDistrict(dKey as DistrictType)} 
                                            className={`w-full p-3 rounded-xl flex md:flex-row flex-col items-center md:items-start text-center md:text-left transition-all border group ${
                                                isSelected 
                                                    ? `${theme.districtActive} bg-slate-900 border-l-4 shadow-md` 
                                                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 mb-1 md:mb-0 md:mr-3 transition-colors ${
                                                isSelected 
                                                    ? 'bg-slate-950 text-amber-400 shadow-inner' 
                                                    : 'bg-slate-900/80 text-slate-400 group-hover:text-slate-200'
                                            }`}>
                                                <Icon size={18} />
                                            </div>

                                            <div className="hidden md:block overflow-hidden">
                                                <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                                                    <span>{label}</span>
                                                    {isSelected && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                    {isMagye ? '제국의 위엄이 서린 곳' : 
                                                     isShingye ? '신성한 기운이 깃든 구역' : 
                                                     isElfNation && dKey === 'Commercial' ? '자연의 보물 거래소' : 
                                                     isBeastNation && dKey === 'Commercial' ? '전투 장비와 수육 거래' : 
                                                     isDemonNation && dKey === 'Commercial' ? '마정석과 계약 거래' : 
                                                     isCapital && dKey === 'Imperial' ? '수도 최고 행정기관' :
                                                     config.desc}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT: DISTRICT CONTENT & ACTION CARDS */}
                        <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar relative">
                            <div className="max-w-4xl mx-auto space-y-6">

                                {/* 🔥 영원의 라이벌 현지 감지 카운터 카드 */}
                                {(() => {
                                    const activeRival = [...(character.socialNetwork || []), ...(character.schoolData?.classmates || [])].find(
                                        n => n && n.isEternalRival && !n.isPurged && !n.isDead
                                    );
                                    if (!activeRival) return null;

                                    const validLoc = getValidRivalLocation(activeRival.rivalData?.currentLocation, activeRival.nation);
                                    if (activeRival.rivalData && activeRival.rivalData.currentLocation !== validLoc.formatted) {
                                        activeRival.rivalData.currentLocation = validLoc.formatted;
                                    }

                                    const rivalNationName = validLoc.nation;
                                    const rivalCityName = validLoc.city;
                                    const isRivalAtCurrentLocation = (rivalNationName === loc.nation && rivalCityName === loc.city);

                                    if (!isRivalAtCurrentLocation) return null;

                                    const hasFoughtThisMonth = hasFoughtRivalThisMonth(activeRival.rivalData, character.currentDate);

                                    const handleInitiateRivalBattle = () => {
                                        if (!onBattle || hasFoughtThisMonth) return;
                                        recordRivalDuel(activeRival, character.currentDate);
                                        const enemies = createRivalEnemies(activeRival);

                                        // 35% 확률로 라이벌에게 먼저 선제 기습당함
                                        const isAmbushedFirst = Math.random() < 0.35;
                                        if (isAmbushedFirst) {
                                            alert(`⚡ [숙적의 선제 기습!]\n영원의 라이벌 '${activeRival.name}'이(가) 당신의 방문을 눈치채고 선제 기습을 감행했습니다!`);
                                        }

                                        onBattle(enemies, 'relation_battle', activeRival.id, loc.city, loc.nation);
                                    };

                                    return (
                                        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-amber-950/80 to-slate-900 border-2 border-red-500/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md animate-in fade-in duration-300">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-2xl bg-red-900/60 border-2 border-amber-400 overflow-hidden flex-shrink-0 shadow-lg flex items-center justify-center">
                                                    {activeRival.visualUrl ? (
                                                        <img src={activeRival.visualUrl} alt={activeRival.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Sword className="w-6 h-6 text-amber-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white animate-pulse shadow">
                                                            🔥 영원의 라이벌 조우!
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-400">
                                                            Lv.{activeRival.level} {activeRival.job || "투사"}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-base font-black text-white mt-0.5">
                                                        {activeRival.name}
                                                    </h4>
                                                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                                                        당신의 숙적이 현재 이 도시(<strong className="text-amber-300">{loc.nation} {loc.city}</strong>)에 머무르고 있습니다!
                                                        {hasFoughtThisMonth && <span className="text-amber-400 font-bold ml-1">(이번 달 결투 완료)</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                                <button
                                                    onClick={() => setIsEternalRivalModalOpen(true)}
                                                    className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                                >
                                                    <Eye size={14} /> 정보 보기
                                                </button>
                                                {hasFoughtThisMonth ? (
                                                    <button
                                                        disabled
                                                        className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400 opacity-80 cursor-not-allowed flex items-center gap-1.5"
                                                    >
                                                        <Sword size={14} className="text-slate-500" /> 이번 달 결투 완료
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleInitiateRivalBattle}
                                                        disabled={!onBattle}
                                                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-xs font-black text-white shadow-lg flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                                                    >
                                                        <Sword size={14} /> 결투 신청하기
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* Current District Hero Banner */}
                                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
                                    <div className="flex items-center gap-3.5">
                                        <div className={`p-3 rounded-2xl border ${
                                            isCapital 
                                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                                                : 'bg-slate-900 border-slate-800 text-indigo-400'
                                        }`}>
                                            {React.createElement(getIcon(DISTRICT_CONFIG[currentDistrict as DistrictType]?.icon || 'Tent'), { 
                                                size: 24, 
                                                className: isCapital ? 'text-amber-400' : (DISTRICT_CONFIG[currentDistrict as DistrictType]?.color || 'text-amber-400')
                                            })}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <span>DISTRICT FACILITIES</span>
                                                <span className="text-slate-600">•</span>
                                                <span className={theme.accentColor}>{loc.city}</span>
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-black text-slate-100 font-cinzel">
                                                {isMagye && currentDistrict === 'Outskirts' ? '심연의 경계' : 
                                                 isMagye && currentDistrict === 'Imperial' ? '마신황의 궁궐' :
                                                 isShingye && currentDistrict === 'Outskirts' ? '성스러운 필드' :
                                                 isShingye && currentDistrict === 'Imperial' ? '신의 사자의 신전' :
                                                 isElfNation && currentDistrict === 'Residential' ? '비밀의 숲 거주지' :
                                                 isElfNation && currentDistrict === 'Academic' ? '세계수 서당' :
                                                 isBeastNation && currentDistrict === 'Residential' ? '투사의 쉼터' :
                                                 isBeastNation && currentDistrict === 'Academic' ? '투사의 연무장' :
                                                 isDemonNation && currentDistrict === 'Residential' ? '계약자의 전당' : 
                                                 isDemonNation && currentDistrict === 'Academic' ? '흑마법 학술원' :
                                                 isCapital && currentDistrict === 'Imperial' ? '황궁 및 왕립 행정청' :
                                                 DISTRICT_CONFIG[currentDistrict as DistrictType]?.label}
                                            </h3>
                                        </div>
                                    </div>

                                    {isCapital && (
                                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
                                            <Crown size={14} className="text-amber-400" />
                                            <span>수도 최고 구역</span>
                                        </div>
                                    )}
                                </div>

                                 {/* ACTION CARDS GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* ACTIVE EMERGENCY & REGIONAL DEFENSE QUEST CARDS (긴급 퀘스트 및 지역 방위 - 현재 도시 전용) */}
                                    {(() => {
                                        const allActive = [
                                            ...(character.mercenaryData?.activeQuests || []),
                                            ...(character.militaryData?.activeMissions || [])
                                        ];
                                        const emergencyQuests = allActive.filter(q => {
                                            if (!q.isEmergency && q.type !== 'MilitaryRegionalDefense') return false;

                                            // 현재 도시 일치 여부 엄격 검사
                                            if (q.location?.city) {
                                                return q.location.city === loc.city;
                                            }
                                            if (q.destination?.city) {
                                                return q.destination.city === loc.city;
                                            }
                                            if (q.type === 'MilitaryRegionalDefense' && q.targetName) {
                                                return q.targetName === loc.city;
                                            }
                                            if (q.title && q.title.includes(loc.city)) return true;
                                            if (q.details && q.details.includes(loc.city)) return true;
                                            if (q.goal && q.goal.includes(loc.city)) return true;

                                            return false;
                                        });

                                        if (emergencyQuests.length === 0) return null;

                                        return emergencyQuests.map(q => (
                                            <button 
                                                key={q.id}
                                                onClick={() => handleRegionalDefenseBattle(q)}
                                                className="bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 border-2 border-red-500 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_35px_rgba(239,68,68,0.45)] hover:border-red-400 active:scale-[0.99] animate-pulse"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-red-900/80 rounded-xl border border-red-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                        <ShieldAlert size={28} className="text-red-400" />
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-white px-3 py-1 rounded-full bg-red-600 border border-red-400 animate-bounce">
                                                            긴급 사태 발생
                                                        </span>
                                                        <span className="text-[10px] text-red-300/80 mt-1 font-mono font-bold">
                                                            목표: {q.goal || '적 격퇴 및 방위'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <h4 className="text-xl font-black text-white mb-1 group-hover:text-red-300 transition-colors flex items-center gap-2">
                                                    <span>🚨 {q.title} - 즉시 출격</span>
                                                </h4>
                                                <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed font-medium">
                                                    {q.details || q.goal} (클릭하여 전투에 돌입하고 구호 작전을 시작합니다)
                                                </p>
                                            </button>
                                        ));
                                    })()}

                                    {/* ACTIVE ESCORT QUEST CARDS (호송/호위 의뢰) */}
                                    {(() => {
                                        const allActive = [
                                            ...(character.mercenaryData?.activeQuests || []),
                                            ...(character.militaryData?.activeMissions || [])
                                        ];
                                        const activeEscorts = allActive.filter(q => 
                                            q.type === 'MercenaryEscort' || 
                                            q.type === 'MilitaryEscort' || 
                                            q.type === 'EscortNoble' || 
                                            q.type === 'EscortKing'
                                        );

                                        if (activeEscorts.length === 0) return null;

                                        return activeEscorts.map(q => {
                                            if (!q.isEscortStarted) {
                                                return (
                                                    <button 
                                                        key={q.id}
                                                        onClick={() => handleStartEscortQuest(q)}
                                                        className="bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 border-2 border-blue-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:border-blue-300 active:scale-[0.99]"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="p-3 bg-blue-900/80 rounded-xl border border-blue-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                                <Truck size={26} className="text-blue-300 animate-pulse" />
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-black text-blue-200 px-3 py-1 rounded-full bg-blue-950 border border-blue-500 animate-pulse">
                                                                    호송 준비 완료
                                                                </span>
                                                                <span className="text-[10px] text-blue-300/80 mt-1 font-mono font-bold">
                                                                    목적지: {q.destination?.city || '지정 도시'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <h4 className="text-xl font-black text-white mb-1 group-hover:text-blue-300 transition-colors flex items-center gap-2">
                                                            <span>🛡️ {q.title} - 호송/호위 출발</span>
                                                        </h4>
                                                        <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                                                            {q.goal} (클릭하여 대열을 정비하고 호송 출발)
                                                        </p>
                                                    </button>
                                                );
                                            } else {
                                                return (
                                                    <div 
                                                        key={q.id}
                                                        className="bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-950 border border-blue-500/50 p-5 rounded-2xl text-left col-span-1 md:col-span-2 shadow-md flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="p-3 bg-blue-950 rounded-xl border border-blue-600/50 text-blue-400 shrink-0">
                                                                <Truck size={24} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className="text-[10px] font-black text-cyan-300 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                                                                        호송 진행 중
                                                                    </span>
                                                                    <span className="text-xs text-slate-400 font-mono">
                                                                        목적지: <strong className="text-amber-300">{q.destination?.city}</strong>
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-base font-black text-white">
                                                                    🚚 {q.title}
                                                                </h4>
                                                                <p className="text-xs text-slate-300 mt-0.5">
                                                                    세계 지도(M)를 열어 목적지 도시 [{q.destination?.city}]로 이동하십시오!
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        });
                                    })()}

                                    {/* ACTIVE INSTRUCTOR QUEST CARD (학교 파견/임시 교관) */}
                                    {(() => {
                                        const instructorQuests = [
                                            ...(character.mercenaryData?.activeQuests || []),
                                            ...(character.militaryData?.activeMissions || [])
                                        ].filter(q => q.type === 'TemporaryInstructor' && (
                                            (q.location?.city && q.location.city === loc.city) ||
                                            (q.schoolName && q.schoolName.includes(loc.city)) ||
                                            (q.title && q.title.includes(loc.city)) ||
                                            (q.details && q.details.includes(loc.city))
                                        ));

                                        if (instructorQuests.length === 0) return null;

                                        return instructorQuests.map(instQuest => (
                                            <button 
                                                key={instQuest.id}
                                                onClick={() => setIsSchoolOpen(true)}
                                                className="bg-gradient-to-br from-cyan-950 via-slate-950 to-indigo-950 border-2 border-cyan-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:border-cyan-300 active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-cyan-900/80 rounded-xl border border-cyan-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                        <BookOpen size={26} className="text-cyan-300 animate-pulse" />
                                                    </div>
                                                    <span className="text-xs font-bold text-cyan-300 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-700 animate-pulse">
                                                        학교 파견 교관
                                                    </span>
                                                </div>
                                                <h4 className="text-xl font-black text-white mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                    <span>🎓 {instQuest.title || '학교 특별 강의 출강'}</span>
                                                </h4>
                                                <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed font-medium">
                                                    {instQuest.details || `${instQuest.schoolName || '지역 학교'}를 방문하여 학생들에게 실전 지식을 전수합니다. (클릭하여 입장)`}
                                                </p>
                                            </button>
                                        ));
                                    })()}
                                    
                                    {/* 1. WAR STATE FRONTLINE BANNER */}
                                    {isWarState && (
                                        <button 
                                            onClick={() => setIsFrontlineOpen(true)}
                                            className="bg-gradient-to-br from-red-950 via-red-900 to-slate-950 border-2 border-red-500 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(220,38,38,0.35)] hover:border-red-400 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-red-900/80 rounded-xl border border-red-500/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <Flame size={28} className="text-red-400 animate-pulse" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-red-600 text-white px-2.5 py-0.5 rounded-full font-black animate-bounce mb-1">FRONT MISSION</span>
                                                    <span className="text-xs text-red-300 font-mono font-bold">점유율: {nationRelation?.occupation || 0}%</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-1.5 font-cinzel group-hover:text-red-300 transition-colors">전선 상황실</h4>
                                            <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed font-medium">전쟁 중인 {loc.nation}의 전선 상황을 확인하고 부대를 파견하거나 직접 타격하여 영토를 확보하십시오.</p>
                                        </button>
                                    )}

                                    {/* 2. REGIONAL AUTHORITY BANNER */}
                                    {isRegionalAuthority && currentDistrict === 'Military' && (
                                        <button 
                                            onClick={() => setIsRegionalManagementOpen(true)}
                                            className="bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 border-2 border-blue-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:border-blue-300 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-blue-900/80 rounded-xl border border-blue-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <TowerControl size={28} className="text-blue-400 animate-pulse" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-black animate-bounce mb-1">GOVERNMENT</span>
                                                    <span className="text-xs text-blue-300 font-mono font-bold">통치 권한 활성화</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-1.5 font-cinzel group-hover:text-blue-300 transition-colors">지역 통치 관리</h4>
                                            <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed font-medium">이 도시의 지배자로서 치안과 민심을 관리하고 주둔 부대를 지휘·운영하십시오.</p>
                                        </button>
                                    )}

                                    {/* 3. GRAND ARENA (DECEMBER) */}
                                    {currentDistrict === 'Mercenary' && isArenaSeason && isMercenary && (
                                        <button 
                                            onClick={() => setIsGrandArenaOpen(true)}
                                            className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-2 border-indigo-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:border-indigo-300 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-indigo-900/80 rounded-xl border border-indigo-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <Trophy size={28} className="text-amber-400 animate-pulse" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black animate-bounce mb-1">ANNUAL EVENT</span>
                                                    <span className="text-xs text-indigo-300 font-mono font-bold">12월 정기 대회</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-1.5 font-cinzel group-hover:text-amber-300 transition-colors">그랜드 아레나 챔피언십</h4>
                                            <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed font-medium">전 세계 용병들의 정점. 올해 최고의 용병을 가리는 랭킹 토너먼트가 개최되었습니다! 승리하여 전설이 되십시오.</p>
                                        </button>
                                    )}

                                    {/* 3.5. ACTIVE BLACK MARKET IN CURRENT CITY */}
                                    {character.activeBlackMarket && 
                                     character.activeBlackMarket.city === loc.city && 
                                     character.activeBlackMarket.nation === loc.nation && 
                                     currentDistrict === 'Residential' && (
                                        <button 
                                            onClick={() => setIsBlackMarketOpen(true)}
                                            className="bg-gradient-to-br from-violet-950 via-purple-950 to-slate-950 border-2 border-purple-500 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:border-purple-300 active:scale-[0.99] animate-pulse"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-purple-900/80 rounded-xl border border-purple-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <ShoppingBag size={28} className="text-purple-300 animate-bounce" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-black animate-pulse mb-1">SECRET MARKET</span>
                                                    <span className="text-xs text-purple-300 font-mono font-bold">이번 달 한정 개장</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-1.5 font-cinzel group-hover:text-purple-300 transition-colors flex items-center gap-2">
                                                <span>비밀 특별상점</span>
                                                <Sparkles size={18} className="text-amber-400" />
                                            </h4>
                                            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-medium">
                                                소문으로만 전해지던 특별상점이 현재 이 도시에 열렸습니다. 각지의 희귀한 특산품과 한정 수량의 특수 자원을 거래할 수 있습니다.
                                            </p>
                                        </button>
                                    )}

                                    {/* 4. RACIAL EXCLUSIVE FACILITIES */}
                                    {isElfNation && currentDistrict === 'Residential' && (
                                        <>
                                            <button 
                                                onClick={() => setIsElfCityOpen(true)}
                                                className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 border border-emerald-600/70 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:border-emerald-400 active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-500/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                        <Trees size={24} className="text-emerald-400 animate-pulse" />
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700">엘프 고유 시설</span>
                                                </div>
                                                <h4 className="text-lg font-black text-emerald-100 mb-1">엘프 교류소</h4>
                                                <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed font-medium">엘프 일족과 신뢰를 쌓고 숲의 수호자를 동료로 영입하거나 자연의 축복을 받습니다.</p>
                                            </button>

                                            <button 
                                                onClick={() => setIsCondolenceModalOpen(true)}
                                                className="bg-slate-900/90 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/60 p-5 rounded-2xl text-left transition-all group shadow-md col-span-1 md:col-span-2 active:scale-[0.98] flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                                                        <Trees size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800">조문 및 추모</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-emerald-300 transition-colors">세계수 영혼의 안식원 (조문림)</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">자연의 품으로 돌아간 엘프 일족과 숲의 인연들의 넋을 기리고 헌화와 추모를 올립니다.</p>
                                                </div>
                                            </button>
                                        </>
                                    )}

                                    {isBeastNation && currentDistrict === 'Residential' && (
                                        <>
                                            <button 
                                                onClick={() => setIsBeastCityOpen(true)}
                                                className="bg-gradient-to-br from-orange-950 via-amber-950 to-slate-950 border border-orange-600/70 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:border-orange-400 active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-orange-900/80 rounded-xl border border-orange-500/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                        <PawPrint size={24} className="text-orange-400 animate-pulse" />
                                                    </div>
                                                    <span className="text-xs font-bold text-orange-400 px-2.5 py-1 rounded-full bg-orange-950 border border-orange-700">수인 고유 시설</span>
                                                </div>
                                                <h4 className="text-lg font-black text-orange-100 mb-1">수인 투기광장</h4>
                                                <p className="text-xs sm:text-sm text-orange-200/80 leading-relaxed font-medium">야성적인 수인들과 실력을 겨루고 그들을 파티로 영입하거나 전설적인 육체 강화 기술을 전수받습니다.</p>
                                            </button>

                                            <button 
                                                onClick={() => setIsCondolenceModalOpen(true)}
                                                className="bg-slate-900/90 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/60 p-5 rounded-2xl text-left transition-all group shadow-md col-span-1 md:col-span-2 active:scale-[0.98] flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                                                        <PawPrint size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800">조문 및 추모</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-amber-300 transition-colors">전사의 영혼 묘원 (조문소)</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">명예로운 결투와 사냥 끝에 쓰러진 수인 투사들의 영혼을 기리고 조문을 올립니다.</p>
                                                </div>
                                            </button>
                                        </>
                                    )}

                                    {isDemonNation && currentDistrict === 'Residential' && (
                                        <>
                                            <button 
                                                onClick={() => setIsDemonCityOpen(true)}
                                                className="bg-gradient-to-br from-purple-950 via-fuchsia-950 to-slate-950 border border-purple-600/70 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:border-purple-400 active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-purple-900/80 rounded-xl border border-purple-500/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                        <Gavel size={24} className="text-purple-400 animate-pulse" />
                                                    </div>
                                                    <span className="text-xs font-bold text-purple-400 px-2.5 py-1 rounded-full bg-purple-950 border border-purple-700">마인 고유 시설</span>
                                                </div>
                                                <h4 className="text-lg font-black text-purple-100 mb-1">마인 계약소</h4>
                                                <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed font-medium">철저한 이익과 약속의 땅. 마인들과 계약하여 마정석을 대량으로 수급하거나 어둠의 비기를 거래합니다.</p>
                                            </button>

                                            <button 
                                                onClick={() => setIsCondolenceModalOpen(true)}
                                                className="bg-slate-900/90 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/60 p-5 rounded-2xl text-left transition-all group shadow-md col-span-1 md:col-span-2 active:scale-[0.98] flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:scale-105 transition-transform">
                                                        <Gavel size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-purple-300 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800">조문 및 추모</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-purple-300 transition-colors">심연의 영혼 안식처 (조문소)</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">모든 계약과 마도의 사슬을 벗어나 영면에 든 마인 영혼들의 묘비를 찾고 조문합니다.</p>
                                                </div>
                                            </button>
                                        </>
                                    )}

                                    {/* 5. SHINGYE TEMPLE & DIVINE PROMOTION & HALL OF TRIALS */}
                                    {isShingye && currentDistrict === 'Imperial' && (
                                        <button 
                                            onClick={() => setIsHallOfTrialsOpen(true)}
                                            className="bg-gradient-to-br from-rose-950 via-purple-950 to-slate-950 border-2 border-rose-500/80 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(244,63,94,0.35)] hover:border-rose-400 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-rose-900/80 rounded-xl border border-rose-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <Flame size={24} className="text-rose-400 animate-pulse" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-bold text-rose-300 px-2.5 py-1 rounded-full bg-rose-950 border border-rose-700">
                                                        1:1 진검승부
                                                    </span>
                                                    <span className="text-[10px] text-amber-300 font-bold mt-1">신의 거처 직속 시련</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-rose-100 mb-1 font-cinzel group-hover:text-rose-300 transition-colors">
                                                시련의 전당
                                            </h4>
                                            <p className="text-xs sm:text-sm text-rose-200/80 leading-relaxed font-medium">
                                                신성한 신력의 환영과 신의 사자 모형을 상대로 한계를 시험하는 1:1 진검승부의 전당입니다. 각 클래스 시련을 통과하여 돌파 자격을 획득하십시오.
                                            </p>
                                        </button>
                                    )}

                                    {isShingye && currentDistrict === 'Imperial' && canManageTemple && (
                                        <button 
                                            onClick={() => setIsTempleManagementOpen(true)}
                                            className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-2 border-indigo-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:border-indigo-300 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-indigo-900/80 rounded-xl border border-indigo-400/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <Landmark size={24} className="text-indigo-400 animate-pulse" />
                                                </div>
                                                <span className="text-xs font-bold text-indigo-300 px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-700">성전 최고 통제</span>
                                            </div>
                                            <h4 className="text-xl font-black text-indigo-100 mb-1 font-cinzel">성전 관리 시스템</h4>
                                            <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed font-medium">신의 사자로서 성전의 안보, 인사, 시설을 직접 통제하고 신탁을 수행합니다.</p>
                                        </button>
                                    )}

                                    {isShingye && currentDistrict === 'Imperial' && canSeeDivineBtn && (
                                        <button 
                                            onClick={() => setIsDivineAwakeningOpen(true)}
                                            className="bg-gradient-to-br from-amber-950 via-yellow-950 to-slate-950 border-2 border-amber-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_30px_rgba(245,158,11,0.35)] hover:border-amber-300 active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-amber-900/80 rounded-xl border border-amber-500/50 mb-3 group-hover:scale-105 transition-transform shadow-lg">
                                                    <Sun size={24} className="text-amber-400 animate-pulse" />
                                                </div>
                                                <span className="text-xs font-bold text-amber-300 px-2.5 py-1 rounded-full bg-amber-950 border border-amber-700 animate-pulse">DIVINE RITUAL</span>
                                            </div>
                                            <h4 className="text-xl font-black text-amber-100 mb-1 font-cinzel">신의 사자 임명 의식</h4>
                                            <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed font-medium">신의 사자의 권능을 완벽히 다루는 자를 위한 신성한 의식입니다. 자격을 갖춘 자만이 신의 사자로 거듭날 수 있습니다.</p>
                                        </button>
                                    )}

                                    {/* 6. CAPITAL ROYAL COURT (국왕 알현) - LUXURY REDESIGN FOR CAPITAL */}
                                    {currentDistrict === 'RoyalCourt' && !isMagye && !isShingye && isCapital && (
                                        <button 
                                            onClick={() => setIsKingMeetingOpen(true)}
                                            className="bg-gradient-to-br from-amber-950/90 via-slate-950 to-amber-950/60 border-2 border-amber-400 p-6 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:border-amber-300 active:scale-[0.99] relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                                            
                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="p-3.5 bg-amber-500/20 rounded-2xl border border-amber-400/50 mb-3 group-hover:scale-110 transition-transform shadow-xl">
                                                    <Crown size={32} className="text-amber-400 animate-pulse" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 px-3 py-1 rounded-full font-black tracking-widest shadow-md">
                                                        ROYAL COURT
                                                    </span>
                                                    <span className="text-xs text-amber-300/80 font-mono mt-1">수도 국왕 직속</span>
                                                </div>
                                            </div>
                                            <h4 className="text-2xl font-black text-white mb-1.5 font-cinzel group-hover:text-amber-300 transition-colors">
                                                국왕 대면 알현실
                                            </h4>
                                            <p className="text-xs sm:text-sm text-amber-100/80 leading-relaxed font-medium">
                                                {loc.nation}의 최고 통치자를 직접 알현합니다. 국가적 공적과 명성에 따라 특별한 칭호, 영지 칙령, 왕실 보급품 혜택을 하사받습니다.
                                            </p>
                                        </button>
                                    )}

                                    {/* 7. MAGYE AWAKENING & WAR COMMAND */}
                                    {currentDistrict === 'Imperial' && isMagye && loc.city === '임페리얼' && (
                                        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
                                            <button 
                                                onClick={() => setIsMagyeAwakeningOpen(true)}
                                                className="bg-gradient-to-br from-red-950 via-red-900 to-black border-2 border-red-500 p-6 rounded-2xl text-left transition-all group shadow-[0_0_35px_rgba(220,38,38,0.4)] hover:border-red-400 active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3.5 bg-red-900/80 rounded-2xl border border-red-500/50 mb-3 group-hover:scale-110 transition-transform shadow-xl">
                                                        <Skull size={32} className="text-white animate-pulse" />
                                                    </div>
                                                    <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-black">DEMONIC RITUAL</span>
                                                </div>
                                                <h4 className="text-2xl font-black text-white mb-1.5 font-cinzel group-hover:text-red-400 transition-colors">마신 알현</h4>
                                                <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed font-medium">제국의 정점이자 모든 마물의 주인, 마신 임페리얼을 마주합니다. 자격을 증명하여 마계의 제너럴로 거듭나십시오.</p>
                                            </button>

                                            {isMagyeLeader && (
                                                <button 
                                                    onClick={() => setIsMagyePromoteOpen(true)}
                                                    className="bg-gradient-to-br from-amber-950 via-amber-900 to-black border-2 border-amber-500 p-6 rounded-2xl text-left transition-all group shadow-[0_0_35px_rgba(217,119,6,0.3)] hover:border-amber-400 active:scale-[0.99]"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-3.5 bg-amber-900/80 rounded-2xl border border-amber-500/50 mb-3 group-hover:scale-110 transition-transform shadow-xl">
                                                            <TrendingUp size={32} className="text-white" />
                                                        </div>
                                                        <span className="text-[10px] bg-amber-600 text-white px-3 py-1 rounded-full font-black">PROMOTION</span>
                                                    </div>
                                                    <h4 className="text-2xl font-black text-white mb-1.5 font-cinzel group-hover:text-amber-400 transition-colors">제너럴 서열 승급</h4>
                                                    <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed font-medium">상위 제너럴을 처단한 기록이 있다면, 그 자리를 찬탈하고 서열을 올릴 수 있습니다.</p>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {currentDistrict === 'Imperial' && isMagye && (
                                        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
                                            {hasMagyeWarAccess && (
                                                <button 
                                                    onClick={() => setIsMagyeWarOpen(true)}
                                                    className="bg-gradient-to-br from-red-950 via-red-900 to-black border-2 border-red-500 p-6 rounded-2xl text-left transition-all group shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:border-red-400 active:scale-[0.99]"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-3.5 bg-red-800 rounded-2xl border border-red-400/50 mb-3 group-hover:scale-110 transition-transform shadow-xl">
                                                            <Sword size={32} className="text-white animate-pulse" />
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] bg-red-600 text-white px-2.5 py-0.5 rounded-full font-black animate-bounce">WAR COMMAND</span>
                                                            <span className="text-[9px] text-red-300 mt-1 font-black uppercase tracking-widest">인간계 정벌 사령부</span>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-2xl font-black text-white mb-1.5 font-cinzel group-hover:text-red-400 transition-colors">제국 총사령부</h4>
                                                    <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed font-medium">마계의 군단을 지휘하여 인간계 국가들을 굴복시키십시오. 제국의 깃발을 전 세계에 꽂을 시간입니다.</p>
                                                </button>
                                            )}

                                            {canManageDominion && (
                                                <button 
                                                    onClick={() => setIsMagyeDominionOpen(true)}
                                                    className="bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 border-2 border-purple-500 p-6 rounded-2xl text-left transition-all group shadow-[0_0_35px_rgba(168,85,247,0.3)] hover:border-purple-400 active:scale-[0.99]"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-3.5 bg-purple-900 rounded-2xl border border-purple-400/50 mb-3 group-hover:scale-110 transition-transform shadow-xl">
                                                            <TowerControl size={32} className="text-white animate-pulse" />
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-black animate-bounce">DOMINION CONTROL</span>
                                                            <span className="text-[9px] text-purple-300 mt-1 uppercase font-black tracking-widest">{activeDominator?.job}</span>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-2xl font-black text-white mb-1.5 font-cinzel group-hover:text-purple-400 transition-colors">도시 통치 관리</h4>
                                                    <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed font-medium">지배자로서 도시의 공포와 타락을 관리하고 심연의 자원을 정제하십시오. 당신의 칙령은 곧 법입니다.</p>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* 8. COMMERCIAL DISTRICT SHOPS */}
                                    {currentDistrict === 'Commercial' && !isMagye && !isShingye && (() => {
                                        const commercialState = getFacilityOperatingState('Commercial', character.currentTime);
                                        return (
                                        <>
                                            {!commercialState.isOpen && (
                                                <div className="col-span-1 md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                                                            <Moon size={18} className="animate-pulse" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-rose-400 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-700/60">
                                                                    {commercialState.statusLabel}
                                                                </span>
                                                                <span className="text-xs text-slate-300 font-bold">
                                                                    심야 상점 폐쇄 (08:00~20:00 정상 영업)
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-purple-200/80 mt-0.5">
                                                                심야에는 일반 상점이 쉬고, 뒷골목 특별상점에서 잠재력 각성 영약, 만병통치약, 대량의 마정석 및 마석을 판매합니다.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsBackAlleyOpen(true)}
                                                        className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
                                                    >
                                                        <Sparkles size={13} />
                                                        <span>뒷골목 특별상점 바로가기</span>
                                                    </button>
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => handleOpenFacilityWithCheck('Commercial', () => setActiveShop('General'))} 
                                                className={`border p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98] ${
                                                    commercialState.isOpen 
                                                        ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-amber-500/50' 
                                                        : 'bg-slate-950/80 border-slate-900 opacity-80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                                                        <Store size={22} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!commercialState.isOpen && (
                                                            <span className="text-[9px] font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                                                                {commercialState.statusLabel}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black text-amber-400 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800">소모품·귀환서</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-amber-400 transition-colors">잡화점</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">회복 물약, 음식, 도시 귀환 주문서 등 모험 필수품을 구매합니다.</p>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleOpenFacilityWithCheck('Commercial', () => setActiveShop('Weapon'))} 
                                                className={`border p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98] ${
                                                    commercialState.isOpen 
                                                        ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-red-500/50' 
                                                        : 'bg-slate-950/80 border-slate-900 opacity-80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 group-hover:scale-105 transition-transform">
                                                        <Sword size={22} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!commercialState.isOpen && (
                                                            <span className="text-[9px] font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                                                                {commercialState.statusLabel}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black text-red-400 px-2 py-0.5 rounded-md bg-red-950/60 border border-red-800">무기·보조장비</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-red-400 transition-colors">무기점</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">검, 활, 완드 등 전투력을 극대화할 강력한 무기를 구매합니다.</p>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleOpenFacilityWithCheck('Commercial', () => setActiveShop('Armor'))} 
                                                className={`border p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98] ${
                                                    commercialState.isOpen 
                                                        ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-blue-500/50' 
                                                        : 'bg-slate-950/80 border-slate-900 opacity-80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 group-hover:scale-105 transition-transform">
                                                        <Shield size={22} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!commercialState.isOpen && (
                                                            <span className="text-[9px] font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                                                                {commercialState.statusLabel}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black text-blue-400 px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800">방어구·장신구</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-blue-400 transition-colors">방어구점</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">투구, 갑옷, 장갑, 부츠, 장신구 등 신체를 보호할 방어구를 구매합니다.</p>
                                                </div>
                                            </button>

                                            {(tier === 'City' || tier === 'Capital') && (
                                                <button 
                                                    onClick={() => handleOpenFacilityWithCheck('Commercial', handleOpenAuction)} 
                                                    className={`border p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98] ${
                                                        commercialState.isOpen 
                                                            ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-950 hover:bg-purple-900/30 border-purple-500/40 hover:border-purple-400' 
                                                            : 'bg-slate-950/80 border-slate-900 opacity-80'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 group-hover:scale-105 transition-transform">
                                                            <Gavel size={22} />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {!commercialState.isOpen && (
                                                                <span className="text-[9px] font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                                                                    {commercialState.statusLabel}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-black text-purple-300 px-2 py-0.5 rounded-md bg-purple-950 border border-purple-600 animate-pulse">월간 희귀 경매</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base sm:text-lg font-black text-white mb-1 group-hover:text-purple-300 transition-colors">왕립 경매장</h4>
                                                        <p className="text-xs text-purple-200/80 leading-relaxed">희귀 유물과 강력한 전설 장비를 입찰 및 경매합니다. (월 1회 이용)</p>
                                                    </div>
                                                </button>
                                            )}
                                        </>
                                        );
                                    })()}

                                    {/* 9. MERCENARY GUILD */}
                                    {currentDistrict === 'Mercenary' && (() => {
                                        const mercState = getFacilityOperatingState('Mercenary', character.currentTime);
                                        return (
                                        <button 
                                            onClick={() => handleOpenFacilityWithCheck('Mercenary', () => setIsMercenaryGuildOpen(true))}
                                            className={`p-6 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-md active:scale-[0.99] border ${
                                                mercState.isOpen 
                                                    ? 'bg-slate-900/90 hover:bg-red-950/40 border-slate-800 hover:border-red-500/60' 
                                                    : 'bg-slate-950/80 border-slate-900 opacity-80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-red-950/80 rounded-xl border border-red-500/40 text-red-400 group-hover:scale-105 transition-transform">
                                                    <ScrollText size={24} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {!mercState.isOpen && (
                                                        <span className="text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800">
                                                            {mercState.statusLabel}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-black text-red-400 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-700">의뢰 수주소</span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-100 mb-1 group-hover:text-red-300 transition-colors flex items-center gap-2">
                                                <span>용병 길드 지부 방문</span>
                                            </h4>
                                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">용병으로 등록하거나 등급별 몬스터 토벌, 호위 의뢰, 랭킹 승급전을 수주합니다.</p>
                                        </button>
                                        );
                                    })()}

                                    {/* 10. MILITARY HEADQUARTERS */}
                                    {currentDistrict === 'Military' && !isMagye && !isShingye && !isBeastNation && (() => {
                                        const milState = getFacilityOperatingState('Military', character.currentTime);
                                        return (
                                        <button 
                                            onClick={() => handleOpenFacilityWithCheck('Military', () => setIsMilitaryModalOpen(true))}
                                            className={`p-6 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 border shadow-md active:scale-[0.99] ${
                                                hasMilitaryAccess 
                                                    ? 'bg-slate-900/90 border-blue-500/60 hover:bg-blue-950/40 hover:border-blue-400' 
                                                    : 'bg-slate-900/90 border-slate-800 hover:bg-blue-950/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-blue-950/80 rounded-xl border border-blue-500/40 text-blue-400 group-hover:scale-105 transition-transform">
                                                    <Medal size={24} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {!milState.isOpen && (
                                                        <span className="text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800">
                                                            {milState.statusLabel}
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${hasMilitaryAccess ? 'bg-blue-950 text-blue-300 border-blue-600' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                        {hasMilitaryAccess ? '군 지휘관 권한' : '입대 및 안내'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-100 mb-1 group-hover:text-blue-300 transition-colors flex items-center gap-2">
                                                <span>{hasMilitaryAccess ? '군 사령부 및 작전실' : '국가 공식군 주둔지'}</span>
                                            </h4>
                                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                                {hasMilitaryAccess 
                                                    ? '배속된 부대를 지휘하거나 국가 군사 작전 보고를 받고 국경 방위 임무를 수행합니다.' 
                                                    : '국가 공식군에 입대하여 신분 상승을 꾀하거나 군사 훈련 정보를 확인합니다.'}
                                            </p>
                                        </button>
                                        );
                                    })()}

                                    {/* 11. GENERAL IMPERIAL AUDIENCE */}
                                    {currentDistrict === 'Imperial' && !canSeeDivineBtn && !isMagye && !isCapital && (
                                        <button 
                                            onClick={() => handleDistrictAction(isShingye ? "신의 사자 알현 신청" : "알현 신청")} 
                                            className={`p-6 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 border shadow-md active:scale-[0.99] ${
                                                isShingye ? 'bg-amber-950/40 border-amber-500/60 hover:bg-amber-900/40' : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-amber-950/80 rounded-xl border border-amber-500/40 text-amber-400 group-hover:scale-105 transition-transform">
                                                    <Crown size={24} />
                                                </div>
                                                <span className="text-xs font-black text-amber-300 px-2.5 py-1 rounded-full bg-amber-950 border border-amber-700">행정·알현</span>
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-1 group-hover:text-amber-300 transition-colors">
                                                {isShingye ? '신의 사자 알현실' : '영주 관저 및 행정청'}
                                            </h4>
                                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                                {isShingye ? '해당 성전을 관장하는 신의 사자를 알현합니다.' : '지역 통치자를 만나거나 국가 행정 민원 업무를 봅니다.'}
                                            </p>
                                        </button>
                                    )}

                                    {/* 12. OUTSKIRTS HUNTING & DUNGEONS */}
                                    {currentDistrict === 'Outskirts' && (
                                        <>
                                            <button 
                                                onClick={() => setIsHuntMapOpen(true)} 
                                                className="bg-slate-900/90 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/60 p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                                                        <Compass size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800">필드 탐색</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors">
                                                        {isMagye ? '심연 탐색' : isShingye ? '신성 구역 탐색' : isBeastNation ? '야생 평원 탐색' : isDemonNation ? '암흑 필드 탐색' : '야생 필드 탐색'}
                                                    </h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">
                                                        {isMagye ? '마계의 위험한 생물들을 사냥합니다.' : isShingye ? '신성한 필드에서 시련을 겪습니다.' : isBeastNation ? '사바나의 포식자들과 겨룹니다.' : isDemonNation ? '제국 외곽의 위험한 마물들을 처단합니다.' : '도시 인근의 몬스터 서식지를 탐색하여 사냥합니다.'}
                                                    </p>
                                                </div>
                                            </button>
                                            
                                            {(() => {
                                                const isDungeonClearedToday = character.clearedDungeonsByCity && character.clearedDungeonsByCity[loc.city] === character.currentDate;
                                                return (
                                                    <button 
                                                        onClick={() => {
                                                            if (onOpenDungeon) {
                                                                onOpenDungeon();
                                                            } else {
                                                                setIsDungeonOpen(true);
                                                            }
                                                        }} 
                                                        className={`p-5 rounded-2xl text-left transition-all group shadow-lg border flex flex-col justify-between active:scale-[0.98] ${
                                                            isDungeonClearedToday
                                                                ? 'bg-slate-900/60 border-emerald-900/50 hover:border-emerald-500/50'
                                                                : isSeasonalEvent 
                                                                ? 'bg-gradient-to-br from-amber-950 via-amber-900 to-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse' 
                                                                : isMagye 
                                                                ? 'bg-red-950/80 border-red-600 hover:bg-red-900/80' 
                                                                : isShingye 
                                                                ? 'bg-indigo-950/80 border-indigo-500 hover:bg-indigo-900/80' 
                                                                : 'bg-slate-900/90 border-slate-800 hover:border-red-500/60 hover:bg-red-950/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className={`p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
                                                                isDungeonClearedToday
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                                                            }`}>
                                                                {isDungeonClearedToday ? <CheckCircle size={22} /> : <Skull size={22} />}
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                                isDungeonClearedToday
                                                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                                                    : 'text-red-400 bg-red-950/60 border-red-800'
                                                            }`}>
                                                                {isDungeonClearedToday 
                                                                    ? '오늘 정복 완료' 
                                                                    : isSeasonalEvent ? '시즌 보스 레이드' : '보스 던전'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-base sm:text-lg font-black mb-1 transition-colors flex items-center gap-1.5 ${
                                                                isDungeonClearedToday ? 'text-slate-300 group-hover:text-emerald-300' : 'text-white group-hover:text-amber-300'
                                                            }`}>
                                                                {isSeasonalEvent ? <><Sparkles size={18} className="text-amber-300" /> 차원의 틈새 (시즌)</> : 
                                                                 isMagye ? '지옥의 나락 (Raid)' : 
                                                                 isShingye ? '신성 던전 (Raid)' : 
                                                                 '심연의 유적 던전'}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                                                {isDungeonClearedToday
                                                                    ? '오늘 이 도시의 던전 보스를 격퇴했습니다. 내일 다시 도전할 수 있습니다.'
                                                                    : isSeasonalEvent ? `${currentMonth}월 한정 특별 강림 보스에 도전합니다!` : '강력한 보스와 수호자가 잠든 고대 유적을 공략합니다.'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })()}

                                            {/* INSTANT DUNGEONS */}
                                            {character.instantDungeons?.filter(d => d.city === loc.city).map(dungeon => (
                                                <button 
                                                    key={dungeon.id}
                                                    onClick={() => {
                                                        setSelectedInstantDungeonId(dungeon.id);
                                                        setIsInstantDungeonOpen(true);
                                                    }}
                                                    className="p-5 rounded-2xl text-left transition-all group shadow-lg border border-purple-500/60 bg-purple-950/40 hover:bg-purple-900/50 col-span-1 md:col-span-2 active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <GhostIcon className="text-purple-400 animate-pulse" size={20}/>
                                                            <h4 className="text-base font-black text-purple-200 group-hover:text-purple-100">
                                                                {dungeon.name}
                                                            </h4>
                                                        </div>
                                                        <span className="text-[10px] font-black text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-700 font-mono">
                                                            Lv.{dungeon.level}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-purple-200/80 leading-relaxed">{dungeon.description}</p>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* 13. ACADEMIC DISTRICT */}
                                    {currentDistrict === 'Academic' && !isShingye && (() => {
                                        // 1. 현재 도시의 교육 기관 명칭 계산
                                        let localSchoolName = `${loc.city} 레귤러스 학교`;
                                        if (isElfNation) localSchoolName = '세계수 서당';
                                        else if (isBeastNation) localSchoolName = '투사의 연무장';
                                        else if (isDemonNation) localSchoolName = '제국 흑마법 학술원';
                                        else if (isCapital) localSchoolName = `${loc.city} 고급 레귤러스 학교`;

                                        // 2. 임시 교관 퀘스트 확인 (해당 도시의 학교 대상 퀘스트인지 확인)
                                        const instructorQuest = [
                                            ...(character.mercenaryData?.activeQuests || []),
                                            ...(character.militaryData?.activeMissions || [])
                                        ].find(q => q.type === 'TemporaryInstructor' && (
                                            (q.location?.city && q.location.city === loc.city) ||
                                            (q.schoolName && q.schoolName.includes(loc.city)) ||
                                            (q.title && q.title.includes(loc.city)) ||
                                            (q.details && q.details.includes(loc.city))
                                        ));
                                        const isInstructorQuest = Boolean(instructorQuest);

                                        // 3. 학생 신분 및 본교 재학 여부 확인
                                        const isStudent = character.job === JobType.STUDENT && !character.schoolData?.isGraduated;
                                        const isEnrolledHere = isStudent && character.schoolData && (
                                            character.schoolData.schoolName?.includes(loc.city) || 
                                            (character.schoolData.schoolLocation as any)?.city === loc.city ||
                                            character.schoolData.schoolName === localSchoolName
                                        );

                                        // 클릭 시 처리 핸들러
                                        const handleSchoolClick = () => {
                                            handleOpenFacilityWithCheck('Academic', () => {
                                                if (isInstructorQuest) {
                                                    setIsSchoolOpen(true);
                                                    return;
                                                }

                                                if (isStudent) {
                                                    if (isEnrolledHere) {
                                                        setIsSchoolOpen(true);
                                                    } else {
                                                        setResultData({
                                                            type: 'warning',
                                                            title: '타 지역 학교 방문',
                                                            message: `현재 귀하는 '${character.schoolData?.schoolName || '소속 학교'}'에 재학 중입니다.\n\n정규 수업 수강 및 학교 시설 이용은 소속 본교가 위치한 지역에서만 가능합니다.`,
                                                            items: [
                                                                { label: '현재 위치', after: `${loc.nation} ${loc.city}` },
                                                                { label: '소속 학교', after: character.schoolData?.schoolName || '본교' }
                                                            ]
                                                        });
                                                    }
                                                    return;
                                                }

                                                // 학생도 아니고 교관 퀘스트도 없는 경우 (일반인/졸업생/타 직업)
                                                setResultData({
                                                    type: 'info',
                                                    title: `${localSchoolName} 안내`,
                                                    message: `현재 귀하는 재학생 신분이 아니므로 정규 학사 수업에 참여할 수 없습니다.\n\n용병 길드 또는 군 사령부에서 '학교 파견 교관' 임무를 수주하면 특별 교관으로 초빙되어 학생들에게 실전 강의를 진행하고 보상을 획득할 수 있습니다.`,
                                                    items: [
                                                        { label: '교육 기관', after: localSchoolName },
                                                        { label: '현재 신분', after: character.schoolData?.isGraduated ? '졸업생' : (character.job || '일반인') },
                                                        { label: '교관 출강', after: '용병 길드 및 군사 의뢰 수주 필요' }
                                                    ]
                                                });
                                            });
                                        };

                                        // UI 표시 정보 설정
                                        let displayTitle = localSchoolName;
                                        let badgeText = '교육 기관';
                                        let descriptionText = `${loc.city}의 미래 인재들을 양성하는 교육 기관입니다.`;

                                        if (isInstructorQuest) {
                                            displayTitle = instructorQuest.schoolName || `${localSchoolName} (파견 교관)`;
                                            badgeText = '파견 교관 임무';
                                            descriptionText = `${loc.city} 지역 학교에 특별 교관으로 방문하여 학생들에게 실전 지식과 무예를 지도합니다. (클릭하여 강의실 입장)`;
                                        } else if (isStudent) {
                                            if (isEnrolledHere) {
                                                displayTitle = character.schoolData?.schoolName || localSchoolName;
                                                badgeText = '본교 재학생';
                                                descriptionText = `자신의 학교를 방문하여 수업을 듣고 동기들과 교류합니다. (${character.schoolData?.grade}학년 ${character.schoolData?.classNumber}반)`;
                                            } else {
                                                displayTitle = localSchoolName;
                                                badgeText = '타 지역 학교';
                                                descriptionText = `${loc.nation} ${loc.city}의 교육 기관입니다. 본인의 소속 학교(${character.schoolData?.schoolName})가 아닌 타 지역 학교입니다.`;
                                            }
                                        } else {
                                            displayTitle = localSchoolName;
                                            badgeText = character.schoolData?.isGraduated ? '모교 출신' : '교육 기관';
                                            descriptionText = `${loc.city}의 미래 인재들을 양성하는 교육 기관입니다. (현재 재학생 신분이 아니며, 용병 길드나 군 사령부에서 '학교 파견 교관' 의뢰 수주 시 특별 강의를 진행할 수 있습니다.)`;
                                        }

                                        return (
                                            <button 
                                                onClick={handleSchoolClick}
                                                className="bg-slate-900/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/60 p-6 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-md active:scale-[0.99]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-3 bg-cyan-950/80 rounded-xl border border-cyan-500/40 text-cyan-400 group-hover:scale-105 transition-transform">
                                                        <BookOpen size={24} />
                                                    </div>
                                                    <span className="text-xs font-black text-cyan-300 px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-700">{badgeText}</span>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-100 mb-1 group-hover:text-cyan-300 transition-colors">
                                                    {displayTitle}
                                                </h4>
                                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                                    {descriptionText}
                                                </p>
                                            </button>
                                        );
                                    })()}

                                    {/* APPOINTED SOCIAL CHARACTERS IN RESIDENTIAL DISTRICT (거주구역 약속된 인물과의 만남) */}
                                    {currentDistrict === 'Residential' && (() => {
                                        const isWithinOneHour = (time1: string | undefined, time2: string | undefined): boolean => {
                                            if (!time1 || !time2) return true;
                                            const [h1, m1] = time1.split(':').map(Number);
                                            const [h2, m2] = time2.split(':').map(Number);
                                            const min1 = h1 * 60 + m1;
                                            const min2 = h2 * 60 + m2;
                                            return Math.abs(min1 - min2) <= 60;
                                        };
                                        const cityAppointments = (character.socialAppointments || []).filter(
                                            appt => appt.status === 'pending' && 
                                                    appt.location.nation === loc.nation && 
                                                    appt.location.city === loc.city &&
                                                    appt.appointmentDate === character.currentDate
                                        );

                                        if (cityAppointments.length === 0) return null;

                                        return cityAppointments.map(appt => {
                                            const isTimeValid = isWithinOneHour(appt.appointmentTime, character.currentTime);
                                            const handleApptClick = () => {
                                                if (!isTimeValid) {
                                                    setResultData({
                                                        type: 'failure',
                                                        title: '약속 시간 불일치',
                                                        message: '약속 시간에 맞춰 방문해 주십시오. (약속 시각 전후 1시간 내에만 참석이 가능합니다.)',
                                                        items: [
                                                            { label: '약속 대상', after: appt.targetName },
                                                            { label: '약속 시각', after: appt.appointmentTime || '시간 지정 없음' },
                                                            { label: '현재 시각', after: character.currentTime || '08:00' }
                                                        ]
                                                    });
                                                    return;
                                                }
                                                setSelectedAppointment(appt);
                                            };
                                            return (
                                            <button
                                                key={appt.id}
                                                onClick={handleApptClick}
                                                className={`bg-gradient-to-r ${isTimeValid ? 'from-indigo-950/90 via-purple-950/90 to-slate-950 border-indigo-400 hover:border-pink-400 shadow-[0_0_25px_rgba(99,102,241,0.35)]' : 'from-slate-900 via-slate-950 to-slate-950 border-slate-800 opacity-60'} border-2 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 active:scale-[0.99] relative overflow-hidden`}
                                            >
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-12 h-12 rounded-full border-2 ${isTimeValid ? 'border-indigo-400' : 'border-slate-700'} overflow-hidden bg-slate-800 flex items-center justify-center shrink-0`}>
                                                            {appt.targetVisualUrl ? (
                                                                <img src={appt.targetVisualUrl} alt={appt.targetName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <span className="text-xl">👤</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${isTimeValid ? 'text-indigo-300 bg-indigo-950 border-indigo-700' : 'text-slate-500 bg-slate-950 border-slate-800'}`}>
                                                                    <Calendar size={12} /> {appt.type === 'duel' ? '결투 약속' : '만남 약속'}
                                                                </span>
                                                                <span className="text-[11px] text-pink-400 font-bold flex items-center gap-1">
                                                                    <Heart size={11} className="fill-current" /> {appt.themeName || (appt.note ? '약속 있음' : '거주구역 약속')}
                                                                </span>
                                                                <span className="text-[10px] text-amber-400 font-mono bg-slate-950/60 px-1.5 py-0.5 rounded border border-amber-900/40">
                                                                    🕒 약속 시간: {appt.appointmentTime || '12:00'}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-lg font-black text-white mt-1 group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                                                                <span>{appt.targetName}와의 약속 장소</span>
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {isTimeValid ? (
                                                            <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-600/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse shadow-md">
                                                                만남 진행하기 <ChevronRight size={14} />
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-500 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                                                                시간 대기 중 <Clock size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-medium">
                                                    {appt.note || (isTimeValid 
                                                        ? `${appt.targetName}님이 거주구역 약속 장소에서 기다리고 있습니다. 대화를 나누거나 선물을 전하고 결투 또는 동료 영입을 진행하십시오.`
                                                        : `${appt.targetName}님과의 약속 시간(${appt.appointmentTime || '시간 미지정'})에 다시 방문해 주십시오. (현재 시간: ${character.currentTime || '08:00'})`
                                                    )}
                                                </p>
                                            </button>
                                            );
                                        });
                                    })()}

                                    {/* RANDOM ENCOUNTER WITH PAST CONNECTIONS IN RESIDENTIAL DISTRICT (거주구역 우연한 인연과의 조우) */}
                                    {currentDistrict === 'Residential' && (() => {
                                        const randomNpcs = getDailyRandomEncounters(character, loc);
                                        if (randomNpcs.length === 0) return null;

                                        return randomNpcs.map(npc => (
                                            <button
                                                key={`encounter_${npc.id}`}
                                                onClick={() => setSelectedRandomNpc(npc)}
                                                className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-purple-950/90 border-2 border-purple-500/80 hover:border-pink-400 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-[0_0_20px_rgba(168,85,247,0.25)] active:scale-[0.99] relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-12 h-12 rounded-full border-2 border-purple-400 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
                                                            <span className="text-xl">👤</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-purple-300 px-2 py-0.5 rounded-md bg-purple-950 border border-purple-700 flex items-center gap-1">
                                                                    <Sparkles size={12} /> 우연한 조우
                                                                </span>
                                                                <span className="text-[11px] text-pink-400 font-bold flex items-center gap-1">
                                                                    <Heart size={11} className="fill-current" /> 과거 인연
                                                                </span>
                                                            </div>
                                                            <h4 className="text-lg font-black text-white mt-1 group-hover:text-purple-200 transition-colors flex items-center gap-2">
                                                                <span>길가에서 만난 {npc.name}</span>
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-600/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse shadow-md">
                                                            대화 나누기 <ChevronRight size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-medium">
                                                    {loc.city} 거주지구를 거닐던 중, 오랫동안 알고 지낸 {npc.name}님을 우연히 발견했습니다. 가까이 다가가 반갑게 인사를 건넬 수 있습니다.
                                                </p>
                                            </button>
                                        ));
                                    })()}

                                    {/* 14. RESIDENTIAL DISTRICT (INN, QUESTS, BACK ALLEY) */}
                                    {currentDistrict === 'Residential' && !isMagye && !isShingye && !isElfNation && !isBeastNation && !isDemonNation && (
                                        <>

                                            {/* Inn Modal Button */}
                                            <button 
                                                onClick={() => setIsInnOpen(true)} 
                                                className="bg-slate-900/90 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/60 p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                                                        <Home size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800">객실·소문·선술집</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-amber-400 transition-colors">여관 방문</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">등급별 객실 투숙, 동료와 휴식, 지역 보스 소문 청취 및 술집 방랑 인물과의 만남을 이용합니다.</p>
                                                </div>
                                            </button>

                                            {/* Back Alley Exploration */}
                                            <button 
                                                onClick={() => setIsBackAlleyOpen(true)} 
                                                className="bg-slate-900/90 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/60 p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 group-hover:scale-105 transition-transform">
                                                        <Eye size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-red-400 px-2 py-0.5 rounded-md bg-red-950/60 border border-red-800">특별상점·정보</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-red-400 transition-colors">어두운 뒷골목</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">은밀한 특별상점 거래상과 불법 결투장, 비밀 정보를 탐색합니다.</p>
                                                </div>
                                            </button>

                                            {/* Prophet Savas (Potential Appraisal) */}
                                            <button 
                                                onClick={() => setIsProphetOpen(true)} 
                                                className="bg-slate-900/90 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/60 p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:scale-105 transition-transform">
                                                        <Sparkles size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800">1,000G / 마정석 5개</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-indigo-400 transition-colors">예언가 사바스</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">골드와 마정석을 바쳐 예언가에게 동료의 숨겨진 한계 포텐셜을 감정(Reveal)받습니다.</p>
                                                </div>
                                            </button>

                                            {/* National Memorial Hall (Condolence & Mourning Facility) */}
                                            <button 
                                                onClick={() => setIsCondolenceModalOpen(true)} 
                                                className="bg-slate-900/90 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/60 p-5 rounded-2xl text-left transition-all group shadow-md flex flex-col justify-between active:scale-[0.98]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 group-hover:scale-105 transition-transform">
                                                        <Landmark size={22} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800">조문 및 추모</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors">{loc.nation} 국립 추모원</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">{loc.nation} 출신으로 세상을 떠난 소중한 인연들과 전사자들의 넋을 기리고 조문(헌화, 묵념, 묘비명)을 올립니다.</p>
                                                </div>
                                            </button>

                                            {/* Regional Defense Quests */}
                                            {character.militaryData?.activeMissions?.filter(q => q.type === 'MilitaryRegionalDefense' && q.targetName === loc.city).map(q => (
                                                <button 
                                                    key={q.id}
                                                    onClick={() => handleRegionalDefenseBattle(q)}
                                                    className="bg-gradient-to-br from-red-950 to-slate-950 border-2 border-red-500 p-5 rounded-2xl text-left transition-all group col-span-1 md:col-span-2 shadow-lg animate-pulse active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldAlert size={22} className="text-red-500" />
                                                            <h4 className="text-base sm:text-lg font-black text-white group-hover:text-red-300">{q.title} 출격</h4>
                                                        </div>
                                                        <span className="text-xs font-black text-red-300 bg-red-950 px-2.5 py-0.5 rounded border border-red-700">긴급 군사 임무</span>
                                                    </div>
                                                    <p className="text-xs text-red-200/80">{q.goal} - 즉시 방위 전투를 시작합니다.</p>
                                                </button>
                                            ))}

                                            {/* Expired Quest Notice */}
                                            {((character.mercenaryData?.expiredQuestNotifications?.length || 0) > 0 || (character.militaryData?.expiredMissionNotifications?.length || 0) > 0) && (
                                                <div className="bg-red-950/80 border border-red-700/80 p-4 rounded-2xl mb-2 col-span-1 md:col-span-2 shadow-lg">
                                                    <h4 className="text-red-200 font-bold mb-2 flex items-center text-xs sm:text-sm">
                                                        <AlertTriangle size={18} className="mr-2 text-red-400" /> 만료된 퀘스트 알림
                                                    </h4>
                                                    {character.mercenaryData?.expiredQuestNotifications?.map((n, i) => (
                                                        <p key={i} className="text-xs text-red-300 mb-1">- {n}</p>
                                                    ))}
                                                    {character.militaryData?.expiredMissionNotifications?.map((n, i) => (
                                                        <p key={i} className="text-xs text-red-300 mb-1">- {n}</p>
                                                    ))}
                                                    <button onClick={clearExpiredNotifications} className="mt-2 text-[11px] text-red-400 font-bold underline hover:text-red-300">알림 모두 지우기</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {/* Empty District Notice */}
                                    {(isMagye || isShingye) && currentDistrict !== 'Outskirts' && currentDistrict !== 'Imperial' && currentDistrict !== 'Academic' && (
                                        <div className="col-span-1 md:col-span-2 py-16 text-center opacity-40">
                                            <GhostIcon size={48} className="mx-auto mb-3 text-slate-500"/>
                                            <p className="text-sm text-slate-400 font-medium">이 구역에는 이용 가능한 일반 편의 시설이 존재하지 않습니다.</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                    </div>
                )}



            </div>
        </div>
    );
};

export default CityInterface;
