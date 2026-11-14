
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useGame } from './hooks/useGame';
import { useElixirTimer } from './hooks/useElixirTimer';
import { GameProvider } from './context/GameContext';
import { Character, Companion, Skill, BondSkill, SkillType, DivineDiplomacyStatus, DiplomaticStatus, ClassTier,SimpleStudent, Item, ItemRarity, Stats, WeaponType, CapturedMonster, Location, Enemy, CombatState, MercenaryRank, Quest, JobType, MilitaryRank, RelationType, InterviewData, CombatStyle, TrainerBranch, BaseDefenseReportData } from './types';
import { FACILITIES_INFO, ENHANCEMENT_CAPS,START_DATE, SELL_PRICES, BASE_LEVEL_CONFIG, INITIAL_BASE, ENHANCEMENT_CONFIG, MAX_STORAGE_SIZE, MAX_PARTY_SIZE, BASE_RESIDENT_LIMIT, FACILITY_UPGRADE_CONFIG, WORLD_GEOGRAPHY, MERCENARY_RANK_SCORE, TEMPLE_MESSENGER_MAP, BASE_MONSTERS, BASE_UPGRADE_COSTS, FACILITY_CONSTRUCTION_COSTS, BASE_GRID_EXPANSION_COSTS, COMBAT_STYLE_CONFIG } from './constants';
import { calculateItemPrice, addMasteryExp, addDays, applyConsumableEffect,generateLevelByRank,generateCompanionStats, generateNameWithSurname, calculateFinalStats, getYear,generateName, getTierByLevel, generateEnemyStats, getRegionByNation, calculateInventorySize, generateDefaultVisualUrl, getRaceByNation, calculateTotalStorageCapacity, calculateTotalHousingCapacity, calculateTotalWorkshopCapacity, calculateTotalLabLevel, calculateTotalTrainingLevel, gainProfessionExp, unassignFromTraining, assignRandomCombatStyle, getFacilityTrainingLimit, getTrainerBranchMultiplier, addTrainerExpToAssignedTrainers, generateProceduralEnemy, calculateResearcherBonus, getRequiredExp, calculateItemCPDelta, findAvailableBattlePosition, checkWeaponMasteryEquipRequirement } from './utils';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithCompanion, generateInterviewQuestions } from './services/geminiService';
import CharacterSheet from './components/CharacterSheet';
import GameLog from './components/GameLog';
import { ProcessingLoadingModal } from './components/ProcessingLoadingModal';
import SceneLoadingFallback from './components/SceneLoadingFallback';
import StartScreen from './components/StartScreen';
import QuestTracker from './components/QuestTracker';
import HeaderShortcuts, { ShortcutId } from './components/HeaderShortcuts';
import type { ResultData } from './components/ActionResultModal';
import type { TrainingReportData } from './components/TrainingReportModal';
import { SuddenEventData } from './services/suddenEventService';
import { BestiaryEntry, DailyReportData } from './types';

// Lazy Loaded Modals for Bundle Code-Splitting & Memory Optimization
import {
  CharacterCreationForm, SkillBook, WeaponMasteryModal, ProfessionMasteryModal, ChefMasteryModal,
  BreederMasteryModal, DevTools, ClassEvolutionModal, CompanionStatusModal, SaveLoadModal,
  BaseModal, CombatInterface, IsolatedCombatContainer, DashboardModal, TrainingStyleModal,
  ActionResultModal, CombatResultModal, SuddenEventModal, QuantityModal, MonsterSkillBook,
  MapModal, CityInterface, CityMapBoard, DungeonModal, QuestLogModal, AppointmentListModal,
  TempleManagementModal, ElfCityModal, BeastCityModal, DemonCityModal, SocialNetworkModal,
  CriminalResolutionModal, TempleDefenseEventModal, BaseAttackModal, GodAppearanceManager,
  BaseDamageReportModal, RelationResolutionModal, TempleConquestResultModal, TournamentPostMatchModal,
  CommunicationModal, CommunicationBattleModal, CommunicationSummonModal, CommunicationItemModal,
  ReactionBoardModal, TrainingModal, TrainingReportModal, TacticalTrainingModal, DailySummaryPopup,
  ConfessionModal, WorldNewsModal, BlacksmithModal, TutorialGuideModal, AlchemyModal,
  ExitGameModal, RestModal, FamilyChroniclesModal, GameSettingsModal,
  ChoiceEventModal, TacticsModal,
  SuccessionModal, BestiaryModal, AuthModal, EternalRivalModal, DevPasswordModal, CondolenceModal,
  MailboxModal
} from './components/modals/lazyModals';
import { WarAndMagyeModalsLayer } from './components/modals/WarAndMagyeModalsLayer';
import { CombatAndTrainingModalsLayer } from './components/modals/CombatAndTrainingModalsLayer';
import { CityAndBaseModalsLayer } from './components/modals/CityAndBaseModalsLayer';

import { resetEntityStats } from './services/statResetService';
import { isNightMarketConsumable, processNightMarketConsumable } from './services/nightMarketItemService';
import { isRealTimeElixir } from './services/elixirService';
import { elixirRealtimeService } from './services/elixirRealtimeService';
import { filterDebuffsForCleanse } from './services/statusCleanseService';
import { combatStateBridge } from './services/combatStateBridge';
import { InitialAssetPreloader } from './components/InitialAssetPreloader';
import { preloadCurrentLocationAssets } from './services/imagePreloadService';
import { Send, Menu, X,MessageSquare, Save, User as UserIcon,LogOut, Calendar, Home,ShieldAlert, Library,FastForward, Clock,Flag, Sword, Grid, Map as MapIcon, Building2, ScrollText, Users2, Trash2, Radio, Skull, Users, MapPin, Eye, Sparkles, Settings, Flame, Mail, Target, Newspaper, Sun } from 'lucide-react';
import { DANGER_REPUTATION_MULT,MERCENARY_RANK_THRESHOLD } from './mercenaryRankUp';
import { applyBaseDefenseFailure } from './services/baseDefenseService';
import { generateEscortAmbushEnemies } from './services/escortAmbushService';
import { promoteNextIncident } from './services/incidentQueue';
import { getTrainingRates, executeBatchTrainingRolls, buildTrainingResultSummary } from './services/trainingService';
import { generateArenaParticipant } from './grandArena';
import { checkAndTriggerDateEvent } from './services/relationshipEventService';
import { processImmediateLevelUp } from './services/levelUpHelper';
import { processTimeSkip } from './services/timeEngine';
import { useMonthlyWorldNews } from './hooks/useMonthlyWorldNews';
import { handleMagyeDemotion } from './magyeInternalWarSystem';
import { returnMonsterToFarm, recruitMonster } from './services/monsterManager';
import { AFRICA_BOSSES, AMERICA_BOSSES, ASIA_BOSSES, DETAILED_BOSSES, DIVINE_REALM_BOSSES, EUROPE_BOSSES, FANTASY_BOSSES, SEASONAL_BOSSES, generateBossMonster } from './bossMonsters';
import { performGeneralPromotion } from './magyepromote';
import { REGIONAL_MERCENARY_GROUPS } from './worldguild';
import { generateWarEnemies } from './warbattlesystem';
import { NATION_RELICS } from './nationLoreData'; 
import { generateDivineWarEnemies, generateLootedStaff, DIVINE_WAR_CONSTANTS } from './divineWarSystem';
import { updateQuestProgress } from './services/questService';
import { performSuccession } from './services/deathTimeEngine';
import { NATION_THEMES, HUNT_LEVEL_BANDS, getMonsterPoolForBand, getMonsterInfo } from './monsterfield';
import { generateTravelMonsterAmbush } from './services/travelAmbushService';
import { getUnreadMailCount } from './services/mailboxService';
import { calculateTravelCostAndDays } from './services/travelCalculationService';
import { calculateBaseRelocationPlan, executeBaseRelocation } from './services/baseRelocationService';
import { getBaseGridExpansionDuration, calculateCompletionDateTime, getConstructionRemainingTime } from './services/baseConstructionService';
import { advanceGameTime, applyRestHealing, flushBufferedReports } from './services/gameTimeService';
import { MobileBottomNavigationBar } from './components/common/MobileBottomNavigationBar';
import { InventoryModal } from './components/InventoryModal';
import CompanionModal from './components/CompanionModal';

import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

const App: React.FC = () => {
  const { state, setters, actions } = useGame();
  const {
    view, messages, input, choices, character, isLoading, loadingMessage, isMobileMenuOpen,
    isSkillBookOpen, skillBookTarget, isDevModeOpen, selectedCompanionIndex, selectedCompanionId,
    isSaveLoadOpen, saveLoadMode, isBaseModalOpen, isTacticsOpen, isDashboardOpen,
    pendingEvolutionTier, evolvingCompanionIndex, sceneType, combatState, resultModalData, dailyReport, worldNewsList, isBlacksmithModalOpen, isAlchemyModalOpen, pendingTempleConquest,isBestiaryOpen,
    isReactionBoardOpen, combatResultData, autoSaveEnabled, pendingTournamentPostMatch // [NEW]
  } = state;
  const {
    setInput, setIsLoading, setLoadingMessage, setIsMobileMenuOpen, setIsSkillBookOpen, setSkillBookTarget,
    setIsDevModeOpen, setSelectedCompanionIndex, setSelectedCompanionId, setIsSaveLoadOpen, setSaveLoadMode,
    setIsBaseModalOpen, setIsTacticsOpen, setEvolvingCompanionIndex, setCharacter, setMessages, setPendingTempleConquest, setPendingEvolutionTier, addToLog, setIsDashboardOpen, setResultModalData, setDailyReport, setWorldNewsList, setIsBlacksmithModalOpen, setIsAlchemyModalOpen, setSceneType, setCombatState,
    setIsReactionBoardOpen,setIsBestiaryOpen, setCombatResultData, setPendingTournamentPostMatch  // [NEW]
  } = setters;

  const {
    handleAction, handleCharacterSubmit: originalHandleCharacterSubmit, handleNewGame, handleSaveLoadSlotSelection, handleExitGame, handleSaveAndExit, resetGameToTitle, handleAutoSaveEnabledChange
  } = actions;

  useElixirTimer(setCharacter, addToLog, view);
  useMonthlyWorldNews(character, view, setCharacter, setWorldNewsList);

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [baseInitialSubModal, setBaseInitialSubModal] = useState<{ type: string; instanceId?: string } | undefined>(undefined);

  const [isMonsterSkillBookOpen, setIsMonsterSkillBookOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'travel' | 'relocate'>('travel'); 
  const [isCityOpen, setIsCityOpen] = useState(false); 
  const [isLogChatOpen, setIsLogChatOpen] = useState(false); 
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isMobileFunctionsOpen, setIsMobileFunctionsOpen] = useState(false);
  const [cityInitialConfig, setCityInitialConfig] = useState<{ district?: any; openHuntMap?: boolean; initialBandId?: string; openInstantDungeonId?: string } | null>(null); 
  const [isDungeonOpen, setIsDungeonOpen] = useState(false); 
  const [isQuestLogOpen, setIsQuestLogOpen] = useState(false); 
  const [isAppointmentListOpen, setIsAppointmentListOpen] = useState(false); 
  const [isTempleManagementOpen, setIsTempleManagementOpen] = useState(false);
  const [isElfCityOpen, setIsElfCityOpen] = useState(false);
  const [isBeastCityOpen, setIsBeastCityOpen] = useState(false);
  const [isDemonCityOpen, setIsDemonCityOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [socialInitialSelectedId, setSocialInitialSelectedId] = useState<string | undefined>(undefined);
  const [mapInitialTargetLocationName, setMapInitialTargetLocationName] = useState<string | undefined>(undefined);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false); // [NEW]
  const [trainingInitialTab, setTrainingInitialTab] = useState<'exp' | 'stat' | 'mastery' | 'trainer'>('exp');
  const [trainingReportData, setTrainingReportData] = useState<TrainingReportData | null>(null); // [NEW]
  const [activeBaseDamageReport, setActiveBaseDamageReport] = useState<BaseDefenseReportData | null>(null); // [NEW] 기지 방어 실패 피해 통계 리포트 모달 데이터
  const [isChroniclesOpen, setIsChroniclesOpen] = useState(false); // [NEW]
  const [pendingCriminalResolution, setPendingCriminalResolution] = useState<any | null>(null); 
  const [pendingRelationResolution, setPendingRelationResolution] = useState<{ targetId: string, enemy: Enemy } | null>(null);
  const [resultActionContext, setResultActionContext] = useState<{ type: string, args: any[] } | null>(null);
  const [quantityModal, setQuantityModal] = useState<{ isOpen: boolean, item?: Item, indices: number[], actionType: 'sell' | 'discard' | 'use' | 'deposit' | 'withdraw' }>({ isOpen: false, indices: [], actionType: 'sell' });
  const [isWeaponMasteryOpen, setIsWeaponMasteryOpen] = useState(false);
  const [isEternalRivalOpen, setIsEternalRivalOpen] = useState(false);
  const [activeSuddenEvent, setActiveSuddenEvent] = useState<SuddenEventData | null>(null);
  const [isCondolenceModalOpen, setIsCondolenceModalOpen] = useState(false);
  const [isTutorialGuideOpen, setIsTutorialGuideOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // 전역 UI 테마 및 전투 속도 설정 상태 및 모달 표시 제어
  const [uiTheme, setUiTheme] = useState<'classic' | 'dark' | 'holy'>(() => {
    return (localStorage.getItem('ui_theme') as 'classic' | 'dark' | 'holy') || 'classic';
  });
  const [combatSpeed, setCombatSpeed] = useState<'fast' | 'normal'>(() => {
    return (localStorage.getItem('combat_speed') as 'fast' | 'normal') || 'normal';
  });
  const [defaultPlayerAuto, setDefaultPlayerAuto] = useState<boolean>(() => {
    return localStorage.getItem('default_player_auto') === 'true';
  });
  const [defaultCompanionAuto, setDefaultCompanionAuto] = useState<boolean>(() => {
    const val = localStorage.getItem('default_companion_auto');
    return val !== null ? val === 'true' : true;
  });
  const [disableSkillEffects, setDisableSkillEffects] = useState<boolean>(() => {
    return localStorage.getItem('game_disable_skill_effects') === 'true';
  });
  const [disableBackdropBlur, setDisableBackdropBlur] = useState<boolean>(() => {
    return localStorage.getItem('game_disable_backdrop_blur') === 'true';
  });
  const [disableScreenShake, setDisableScreenShake] = useState<boolean>(() => {
    return localStorage.getItem('game_disable_screen_shake') === 'true';
  });
  const [disableCommonCompanionInteraction, setDisableCommonCompanionInteraction] = useState<boolean>(() => {
    return localStorage.getItem('game_disable_common_companion_interaction') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDevPasswordModalOpen, setIsDevPasswordModalOpen] = useState(false);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);

  useEffect(() => {
    // 바디 태그에 테마 클래스 및 블러/진동 비활성화 클래스 유기적 이식
    const classes = [`theme-${uiTheme}`];
    if (disableBackdropBlur) {
      classes.push('no-backdrop-blur');
    }
    if (disableScreenShake) {
      classes.push('no-screen-shake');
    }
    document.body.className = classes.join(' ');
    localStorage.setItem('ui_theme', uiTheme);
  }, [uiTheme, disableBackdropBlur, disableScreenShake]);

  // [모바일 전용 하단 내비게이션 바 전역 브릿지] HTML 인덱스 및 외부 UI 스크립트와 100% 직통 연결
  useEffect(() => {
    (window as any).__openGameCharacter = () => setIsMobileMenuOpen(true);
    (window as any).__openGameInventory = () => setIsInventoryModalOpen(true);
    (window as any).__openGameBase = () => {
      setIsMobileMenuOpen(false);
      setIsBaseModalOpen(true);
    };
    (window as any).__openGameHunt = () => {
      setCityInitialConfig({ openHuntMap: true });
      setIsCityOpen(true);
    };
    (window as any).__openGameSkills = () => {
      setSkillBookTarget(null);
      setIsSkillBookOpen(true);
    };
    (window as any).__openGameMap = () => {
      setMapMode('travel');
      setIsMobileMenuOpen(false);
      setIsMapOpen(true);
    };
    (window as any).__openGameSave = () => {
      setSaveLoadMode('save');
      setIsSaveLoadOpen(true);
    };
    return () => {
      delete (window as any).__openGameCharacter;
      delete (window as any).__openGameInventory;
      delete (window as any).__openGameBase;
      delete (window as any).__openGameHunt;
      delete (window as any).__openGameSkills;
      delete (window as any).__openGameMap;
      delete (window as any).__openGameSave;
    };
  }, []);

  // 중요 모달 청크 백그라운드 사전 캐싱 (2초 후 비동기 프리페치로 지연 제거)
  useEffect(() => {
    const idleTimer = setTimeout(() => {
      import('./components/CityInterface');
      import('./components/combat/IsolatedCombatContainer');
      import('./components/BaseModal');
      import('./components/DungeonModal');
    }, 2000);
    return () => clearTimeout(idleTimer);
  }, []);

  // 하루 결산 완충 장치: 가벼운 상단 텍스트 알림
  const [dayChangeToast, setDayChangeToast] = useState<string | null>(null);
  const triggerDayChangeToast = (notice?: string) => {
    if (!notice) return;
    setDayChangeToast(notice);
    setTimeout(() => {
      setDayChangeToast(prev => prev === notice ? null : prev);
    }, 4500);
  };

  // 마을/기지/광장 복귀 시점: 누적된 일일 결산 종합 보고서 일괄 출력
  useEffect(() => {
    if (sceneType === 'normal' && !combatResultData && !isDungeonOpen && (character?.bufferedTimeSkipReports?.length ?? 0) > 0) {
      const { updatedCharacter, consolidatedReport } = flushBufferedReports(character);
      if (consolidatedReport) {
        setCharacter(updatedCharacter);
        setDailyReport(consolidatedReport);
        addToLog(`[종합 결산] 안전 지대로 귀환하여 그동안 누적된 일일 종합 보고서를 확인합니다.`);
        // 누적된 중요 알림/서신을 서신함(messages)에 추가
        if (consolidatedReport.criticalAlerts && consolidatedReport.criticalAlerts.length > 0) {
          consolidatedReport.criticalAlerts.forEach((alert: any) => {
            if (alert.message) {
              addToLog(alert.message);
            }
          });
        }
      }
    }
  }, [sceneType, combatResultData, isDungeonOpen, isCityOpen, isBaseModalOpen, character?.bufferedTimeSkipReports]);

  const handleCombatSpeedChange = (speed: 'fast' | 'normal') => {
    setCombatSpeed(speed);
    localStorage.setItem('combat_speed', speed);
  };

  const handleDefaultPlayerAutoChange = (val: boolean) => {
    setDefaultPlayerAuto(val);
    localStorage.setItem('default_player_auto', String(val));
  };

  const handleDefaultCompanionAutoChange = (val: boolean) => {
    setDefaultCompanionAuto(val);
    localStorage.setItem('default_companion_auto', String(val));
  };

  const handleDisableSkillEffectsChange = (val: boolean) => {
    setDisableSkillEffects(val);
    localStorage.setItem('game_disable_skill_effects', String(val));
  };

  const handleDisableBackdropBlurChange = (val: boolean) => {
    setDisableBackdropBlur(val);
    localStorage.setItem('game_disable_backdrop_blur', String(val));
  };

  const handleDisableScreenShakeChange = (val: boolean) => {
    setDisableScreenShake(val);
    localStorage.setItem('game_disable_screen_shake', String(val));
  };

  const handleDisableCommonCompanionInteractionChange = (val: boolean) => {
    setDisableCommonCompanionInteraction(val);
    localStorage.setItem('game_disable_common_companion_interaction', String(val));
    setCharacter(prev => prev ? {
      ...prev,
      systemSettings: {
        ...prev.systemSettings,
        disableCommonCompanionInteraction: val
      }
    } : prev);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  const [isProfessionMasteryOpen, setIsProfessionMasteryOpen] = useState(false);
  const [isChefMasteryOpen, setIsChefMasteryOpen] = useState(false);
  const [isBreederMasteryOpen, setIsBreederMasteryOpen] = useState(false);
  const [isTacticalTrainingOpen, setIsTacticalTrainingOpen] = useState(false);
  const [isTrainingStyleOpen, setIsTrainingStyleOpen] = useState(false);
  const [isMountTargetModalOpen, setIsMountTargetModalOpen] = useState(false);
  const [mountMonsterId, setMountMonsterId] = useState<string | null>(null);
  const [weaponMasteryTarget, setWeaponMasteryTarget] = useState<Character | Companion | null>(null);
   const [isMagyeHeavenWarOpen, setIsMagyeHeavenWarOpen] = useState(false);
  // Communication States
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isCommunicationBattleOpen, setIsCommunicationBattleOpen] = useState(false);
  const [isCommunicationSummonOpen, setIsCommunicationSummonOpen] = useState(false);
  const [isCommunicationItemOpen, setIsCommunicationItemOpen] = useState(false);
  const [isClassNameModalOpen, setIsClassNameModalOpen] = useState(false);
  const [isNameChangeModalOpen, setIsNameChangeModalOpen] = useState(false);
  const [nameChangeTargetId, setNameChangeTargetId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [classNameTargetId, setClassNameTargetId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassTier, setSelectedClassTier] = useState<ClassTier>(ClassTier.FIRST);
  const [weddingGiftData, setWeddingGiftData] = useState<{ p1: string, p2: string, type: 'companion' | 'npc', outcome: string } | null>(null);
  const [latestRankUp, setLatestRankUp] = useState<{ profession: string, level: number } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [restModalInitialDays, setRestModalInitialDays] = useState(1);

  const nationThemeClass = useMemo(() => {
    if (!character.currentLocation) return '';
    const nation = character.currentLocation.nation;
    if (nation.includes('화염')) return 'bg-red-950/10 shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]';
    if (nation.includes('해수')) return 'bg-blue-950/10 shadow-[inset_0_0_100px_rgba(59,130,246,0.1)]';
    if (nation.includes('질풍')) return 'bg-green-950/10 shadow-[inset_0_0_100px_rgba(34,197,94,0.1)]';
    if (nation.includes('전격')) return 'bg-yellow-950/10 shadow-[inset_0_0_100px_rgba(234,179,8,0.1)]';
    if (nation.includes('빙결')) return 'bg-cyan-950/10 shadow-[inset_0_0_100px_rgba(103,232,249,0.1)]';
    if (nation.includes('광휘')) return 'bg-amber-950/10 shadow-[inset_0_0_100px_rgba(252,211,77,0.1)]';
    if (nation.includes('마계')) return 'bg-purple-950/20 shadow-[inset_0_0_100px_rgba(168,85,247,0.1)]';
    if (nation.includes('신계')) return 'bg-white/5 shadow-[inset_0_0_100px_rgba(255,255,255,0.05)]';
    return '';
  }, [character.currentLocation?.nation]);

  // 지역 이동 시 해당 지역 마물/보스 비주얼 백그라운드 선제 로딩 (0ms 대기 최적화)
  useEffect(() => {
    if (character?.currentLocation?.nation) {
      preloadCurrentLocationAssets(character.currentLocation.nation, character.currentLocation.city);
    }
  }, [character?.currentLocation?.nation, character?.currentLocation?.city]);

  const handleRankUpEffect = (leveledUp: boolean, profession: string, level: number) => {
    if (leveledUp) {
        const profNames: Record<string, string> = {
            cooking: '요리', mining: '채광', farming: '농사', research: '연구', alchemy: '연금술', crafting: '제작', taming: '테이밍'
        };
        setLatestRankUp({ profession: profNames[profession] || profession, level });
        setTimeout(() => setLatestRankUp(null), 3000);
    }
  };
  // [NEW] 인터뷰 자동 발생 체크용 상태
  const [isCheckingInterview, setIsCheckingInterview] = useState(false);

  const [mailboxFilterTick, setMailboxFilterTick] = useState(0);
  useEffect(() => {
    const handleFilterChange = () => setMailboxFilterTick(prev => prev + 1);
    window.addEventListener('mailbox_filter_changed', handleFilterChange);
    return () => window.removeEventListener('mailbox_filter_changed', handleFilterChange);
  }, []);

  // [NEW] 서신함 읽지 않은 메일 수 실시간 계산
  const unreadMailCount = useMemo(() => getUnreadMailCount(messages), [messages, isMailboxOpen, isSettingsOpen, mailboxFilterTick]);

  // [NEW] 상점 재고 연간 초기화 로직
  useEffect(() => {
    if (!character.currentDate) return;
    const currentYear = getYear(character.currentDate);
    if (character.lastShopResetYear !== currentYear) {
        setCharacter(prev => ({
            ...prev,
            lastShopResetYear: currentYear,
            shopStock: {} // 모든 상점 재고 초기화
        }));
        addToLog(`[시스템] 새해가 밝았습니다. 전 대륙의 상점 재고가 충전되었습니다.`);
    }
  }, [character.currentDate, character.lastShopResetYear]);

  // [NEW] 인연 만난 연도(metYear) 자동 할당 로직
  useEffect(() => {
    if (sceneType === 'combat' || !character.currentDate) return;
    const currentYear = getYear(character.currentDate);
    let needsUpdate = false;
    
    const updateComps = (comps: Companion[]) => {
        return comps.map(c => {
            if (c.metYear === undefined) {
                needsUpdate = true;
                return { ...c, metYear: currentYear };
            }
            return c;
        });
    };

    const updateNpcs = (npcs: any[]) => {
        return npcs.map(n => {
            if (n.metYear === undefined) {
                needsUpdate = true;
                return { ...n, metYear: currentYear };
            }
            return n;
        });
    };

    const newCompanions = updateComps(character.companions);
    const newInactive = character.inactiveCompanions ? updateComps(character.inactiveCompanions) : undefined;
    const newSocial = character.socialNetwork ? updateNpcs(character.socialNetwork) : undefined;

    if (needsUpdate) {
        setCharacter(prev => ({
            ...prev,
            companions: newCompanions,
            inactiveCompanions: newInactive,
            socialNetwork: newSocial
        }));
    }
  }, [character.companions, character.inactiveCompanions, character.socialNetwork, character.currentDate]);

  useEffect(() => {
    if (character.pendingAmbush) {
        // [순차 발생] 기지 방어 이벤트가 진행/대기 중이거나 전투가 진행 중이면 인연 습격을 큐로 이동
        if (character.pendingBaseAttackEvent || (combatState && !combatState.isEnded) || sceneType === 'combat') {
            setCharacter(prev => {
                const next = { ...prev };
                if (!next.queuedAmbushes) next.queuedAmbushes = [];
                if (next.pendingAmbush) {
                    next.queuedAmbushes.push(next.pendingAmbush);
                    next.queuedAmbush = next.queuedAmbushes[0];
                    next.pendingAmbush = undefined;
                }
                return next;
            });
            return;
        }
        const ambush = character.pendingAmbush;
        const newChar = { ...character, pendingAmbush: undefined };
        setCharacter(newChar);
        handleBattleTrigger(ambush.enemies, 'relation_battle', ambush.sourceId);
        
        setResultModalData({
            type: 'warning',
            title: ambush.title || '기습 발생!',
            message: ambush.message || '누군가 당신을 기습했습니다!',
            items: [{ label: '습격자', after: ambush.enemies[0]?.name || '적' }]
        });
    }
  }, [character.pendingAmbush, character.pendingBaseAttackEvent, combatState?.isEnded, sceneType]);

  // [NEW] 전투 종료 또는 평상시 복귀 시 대기 중인 습격/결투/기지방어 이벤트 순차 승격 처리
  useEffect(() => {
    if (sceneType === 'normal' && (!combatState || combatState.isEnded) && !combatResultData) {
      const hasQueued = (character.queuedAmbushes && character.queuedAmbushes.length > 0) || character.queuedAmbush || character.queuedBaseAttackEvent;
      const hasActive = character.pendingAmbush || character.pendingBaseAttackEvent;
      if (hasQueued && !hasActive) {
        const timer = setTimeout(() => {
          setCharacter(prev => promoteNextIncident(prev));
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [sceneType, combatState?.isEnded, combatResultData, character.queuedAmbushes, character.queuedAmbush, character.queuedBaseAttackEvent, character.pendingAmbush, character.pendingBaseAttackEvent]);

// [NEW] 승계 처리 핸들러 (비기 전수 포함)
  const handleSelectSuccessor = (successor: Companion, inheritedSkill?: Skill) => {
    const nextCharacter = performSuccession(character, successor, inheritedSkill);
    setCharacter(nextCharacter);
    addToLog(`[가문 승계] 전대 가주의 의지를 이어받아 ${successor.name}이(가) 새로운 가주로 즉위했습니다.${inheritedSkill ? ` 가문의 비기 '${inheritedSkill.name}'이(가) 전수되었습니다.` : ""}`);
  };
   const handleWeddingGiftConfirm = (quantity: number) => {
      if (!weddingGiftData) return;
      const totalGold = quantity * 50000;
      const newChar = { ...character };
      newChar.money -= totalGold;

      const boost = 10 * quantity;
      const updateAff = (id: string) => {
          if (weddingGiftData.type === 'companion') {
              const comp = [...newChar.companions, ...(newChar.inactiveCompanions || [])].find(c => c.id === id);
              if (comp) comp.affection = Math.min(100, comp.affection + boost);
          } else {
              const npc = newChar.socialNetwork?.find(n => n.id === id);
              if (npc) npc.affection = Math.min(100, npc.affection + boost);
          }
      };

      updateAff(weddingGiftData.p1);
      updateAff(weddingGiftData.p2);

      const logMsg = `[가문 경사] 축의금 ${totalGold.toLocaleString()}G를 전달하여 가문의 위엄을 보이고 유대를 강화했습니다.`;
      if (!newChar.memories) newChar.memories = [];
      newChar.memories.push(`[${newChar.currentDate}] 결혼 축의금 ${totalGold.toLocaleString()}G 전달.`);

      handleUpdateCharacter(newChar, logMsg);
      setResultModalData({
          type: 'success',
          title: '축의금 전달 완료',
          message: weddingGiftData.outcome,
          items: [
              { label: '소모 골드', after: `${totalGold.toLocaleString()} G` },
              { label: '호감도 보너스', after: `+${boost}` }
          ]
      });
      setWeddingGiftData(null);
  };

  // [NEW] 도감 기록 가능 여부 확인 헬퍼 명단 (메모이제이션)
  const officialMonsterNames = useMemo(() => {
    const names = new Set<string>();
    
    // 1. 베이스 몬스터
    BASE_MONSTERS.forEach(m => names.add(m.name));
    
    // 2. 지역별 테마 마물
    Object.values(NATION_THEMES).forEach(theme => {
        Object.values(theme.monsters).forEach(list => {
            if (Array.isArray(list)) list.forEach(name => names.add(typeof name === 'string' ? name : name.name));
        });
    });

    // 3. 모든 보스 데이터
    const processBossSource = (source: any) => {
        if (!source) return;
        Object.values(source).forEach((data: any) => {
            if (data.name) names.add(data.name);
            else {
                Object.values(data).forEach((cityData: any) => {
                    if (cityData.name) names.add(cityData.name);
                });
            }
        });
    };
    processBossSource(DETAILED_BOSSES);
    processBossSource(EUROPE_BOSSES);
    processBossSource(AMERICA_BOSSES);
    processBossSource(ASIA_BOSSES);
    processBossSource(AFRICA_BOSSES);
    processBossSource(FANTASY_BOSSES);
    processBossSource(DIVINE_REALM_BOSSES);
    processBossSource(SEASONAL_BOSSES);

    return names;
  }, []);

  // [NEW] 도감 업데이트 가능 여부 체크 함수
  const isOfficialMonster = (enemyName: string): boolean => {
      const cleanName = enemyName.replace(/\[.*?\]/g, '').replace(/\s+[A-Z]$/, '').trim();
      return officialMonsterNames.has(cleanName);
  };

  const handleChoiceEventResolve = (updatedChar: Character, outcomeText: string, selectedIdx: number) => {
      const originalEvent = character.pendingChoiceEvent;
      const selectedOption = originalEvent?.options[selectedIdx];
      
      const finalChar = { ...updatedChar };
      finalChar.pendingChoiceEvent = undefined; // 이벤트 완료 후 클리어
 // [NEW] 축의금 전달 분기 처리
      if (selectedOption?.action === 'give_wedding_gift') {
          const meta = JSON.parse(selectedOption.callbackId);
          setWeddingGiftData({ ...meta, outcome: selectedOption.outcome });
           setCharacter(finalChar);
          return; // 실제 정산은 WeddingGiftConfirm에서 수행
      }

      if (selectedOption?.action === 'no_wedding_gift') {
          const meta = JSON.parse(selectedOption.callbackId);
          const updateAff = (id: string, amount: number) => {
              if (meta.type === 'companion') {
                  const comp = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === id);
                  if (comp) comp.affection = Math.min(100, Math.max(-100, comp.affection + amount));
              } else {
                  const npc = finalChar.socialNetwork?.find(n => n.id === id);
                  if (npc) npc.affection = Math.min(100, Math.max(-100, (npc.affection || 0) + amount));
              }
          };
          updateAff(meta.p1, -20);
          updateAff(meta.p2, -20);
           setCharacter(finalChar);
      }

      // [NEW] 인맥 추천 영입 로직 처리
      if (selectedOption?.action === 'join_guild' && selectedOption.callbackId.includes('recommendation_hire')) {
          const meta = JSON.parse(selectedOption.callbackId);
          const targetId = meta.targetId;
          const recommenderId = meta.recommenderId;

          // 1. 추천인 호감도/충성도 상승
          const recommender = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === recommenderId);
          if (recommender) {
              recommender.affection = Math.min(100, recommender.affection + 10);
              recommender.loyalty = Math.min(100, recommender.loyalty + 15);
          }

          // 2. 피추천인(targetId) 소속 전환 (Social -> Inactive Companion)
          const targetNpc = finalChar.socialNetwork?.find(n => n.id === targetId);
          if (targetNpc) {
              const currentYear = getYear(finalChar.currentDate || '2000-01-01');
              const level = targetNpc.level || 1;
              const stats = generateCompanionStats(level);
              const tier = getTierByLevel(level);

              const newCompanion: Companion = {
                  ...targetNpc,
                  classType: targetNpc.classType || "모험가",
                  job: targetNpc.job || JobType.MERCENARY,
                  level,
                  currentExp: 0,
                  maxExp: level * 100,
                  statPoints: 0,
                  classTier: tier,
                  stats: { ...stats, ...targetNpc.stats },
                  skills: targetNpc.skills || [],
                  equipment: {},
                  inventory: [],
                  chatHistory: [], 
                  affection: 50, // 추천으로 들어왔으므로 기본 호감도 높음
                  loyalty: 70
              };

              if (!finalChar.inactiveCompanions) finalChar.inactiveCompanions = [];
              finalChar.inactiveCompanions.push(newCompanion);
              finalChar.socialNetwork = finalChar.socialNetwork?.filter(n => n.id !== targetId);
          }
          
          setCharacter(finalChar);
          addToLog(`[가문 영입] '${recommender?.name}'의 추천으로 실력자 '${targetNpc?.name}'이(가) 가문에 합류했습니다.`);
          setResultModalData({
              type: 'success',
              title: '인맥 영입 성공',
              message: outcomeText,
              items: [
                  { label: '합류 대원', after: targetNpc?.name || '동료' },
                  { label: '추천인 보너스', after: 'Loyalty +15' }
              ]
          });
          return;
      }

    // [NEW] 용병단장 전용 이벤트 분기 처리
      if (selectedOption?.action === 'mercenary_internal_conflict') {
          const meta = JSON.parse(selectedOption.callbackId);
          const updateAff = (id: string, amount: number) => {
              const comp = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === id);
              if (comp) comp.affection = Math.min(100, Math.max(-100, comp.affection + amount));
          };
          const removeConflict = (id1: string, id2: string) => {
              const c1 = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === id1);
              const c2 = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === id2);
              if (c1?.relations?.[id2]) delete c1.relations[id2];
              if (c2?.relations?.[id1]) delete c2.relations[id1];
          };

          if (meta.type === 'punish') {
              updateAff(meta.p1, -20); updateAff(meta.p2, -20);
          } else if (meta.type === 'feast') {
              finalChar.money -= 10000;
              if (Math.random() < 0.7) {
                  removeConflict(meta.p1, meta.p2);
                  updateAff(meta.p1, 10); updateAff(meta.p2, 10);
              }
          } else if (meta.type === 'duel') {
              const winnerId = Math.random() < 0.5 ? meta.p1 : meta.p2;
              const loserId = winnerId === meta.p1 ? meta.p2 : meta.p1;
              const winner = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === winnerId);
              const loser = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === loserId);
              if (winner) winner.stats.str += 1;
              if (loser) loser.stats.hp = Math.max(1, Math.floor(loser.stats.hp * 0.5));
          }
      }

      if (selectedOption?.action === 'mercenary_rival_sabotage') {
          const meta = JSON.parse(selectedOption.callbackId);
          if (meta.type === 'retaliate') {
              const enemies = generateWarEnemies(finalChar.currentLocation?.nation || finalChar.nation, finalChar.level, true, 50);
              handleBattleTrigger(enemies, 'normal', meta.name);
          } else if (meta.type === 'report') {
              if (finalChar.mercenaryData) finalChar.mercenaryData.reputation = Math.max(0, finalChar.mercenaryData.reputation - 200);
          } else if (meta.type === 'endure') {
              finalChar.currentDate = addDays(finalChar.currentDate || START_DATE, 3);
              finalChar.companions.forEach(c => c.loyalty = Math.max(0, c.loyalty - 10));
          }
      }

      if (selectedOption?.action === 'mercenary_rising_star') {
          const meta = JSON.parse(selectedOption.callbackId);
          if (meta.type === 'bonus') {
              finalChar.money -= 50000;
              const comp = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === meta.targetId);
              if (comp) comp.loyalty = 100;
          } else if (meta.type === 'persuade') {
              const comp = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === meta.targetId);
              if (comp && Math.random() * 100 > comp.affection) {
                  // 설득 실패: 이탈
                  finalChar.companions = finalChar.companions.filter(c => c.id !== meta.targetId);
                  if (finalChar.inactiveCompanions) finalChar.inactiveCompanions = finalChar.inactiveCompanions.filter(c => c.id !== meta.targetId);
              }
          } else if (meta.type === 'release') {
              const comp = [...finalChar.companions, ...(finalChar.inactiveCompanions || [])].find(c => c.id === meta.targetId);
              if (comp) {
                  if (!finalChar.socialNetwork) finalChar.socialNetwork = [];
                  finalChar.socialNetwork.push(assignRandomCombatStyle({ ...comp, job: JobType.UNEMPLOYED, isPastConnection: true }, false) as any);
                  finalChar.companions = finalChar.companions.filter(c => c.id !== meta.targetId);
                  if (finalChar.inactiveCompanions) finalChar.inactiveCompanions = finalChar.inactiveCompanions.filter(c => c.id !== meta.targetId);
              }
          }
      }

      if (selectedOption?.action === 'mercenary_shady_deal') {
          if (selectedOption.callbackId === 'accept') {
              finalChar.money += 200000;
              finalChar.infamy = (finalChar.infamy || 0) + 100;
              finalChar.companions.forEach(c => {
                  if (c.personality?.includes('정의') || c.personality?.includes('성실')) c.loyalty = Math.max(0, c.loyalty - 30);
              });
          } else if (selectedOption.callbackId === 'report') {
              if (finalChar.militaryData) finalChar.militaryData.merit += 20;
              finalChar.infamy = Math.max(0, (finalChar.infamy || 0) - 20);
          } else if (selectedOption.callbackId === 'refuse') {
              if (finalChar.mercenaryData) finalChar.mercenaryData.reputation += 50;
              finalChar.companions.forEach(c => c.loyalty = Math.min(100, c.loyalty + 10));
          }
      }

     if (selectedOption?.action === 'mercenary_fallen_family') {
          if (selectedOption.callbackId === 'generous') {
              finalChar.money -= 50000;
              if (finalChar.mercenaryData) finalChar.mercenaryData.reputation += 100;
              finalChar.companions.forEach(c => c.loyalty = Math.min(100, c.loyalty + 20));
          } else if (selectedOption.callbackId.includes('recruit')) {
              // [MODIFIED] Parse JSON metadata and generate sibling name and MBTI personality
              let meta = { name: "전우", nation: "대한민국", surname: "" };
              try {
                  meta = JSON.parse(selectedOption.callbackId);
              } catch(e) {}

              const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];
              const gender = Math.random() > 0.5 ? "남성" : "여성";
              const genderParam = gender === "남성" ? "male" : "female";
              const siblingName = generateNameWithSurname(meta.surname, meta.nation, genderParam);

              const trainee: Companion = {
                  id: `trainee_${Date.now()}`,
                  name: siblingName,
                  age: "15세", gender, race: "인간", level: 1, currentExp: 0, maxExp: 100, statPoints: 0,
                  classTier: ClassTier.NONE, job: JobType.UNEMPLOYED, appearance: `전사한 ${meta.name}의 유지를 잇기 위해 용병단에 들어온 동생입니다.`,
                  personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)], 
                  stats: generateCompanionStats(1), skills: [], equipment: {}, inventory: [],
                  affection: 80, loyalty: 100, classType: "수습 단원"
              };
              if (!finalChar.inactiveCompanions) finalChar.inactiveCompanions = [];
              finalChar.inactiveCompanions.push(trainee);
          } else if (selectedOption.callbackId === 'basic') {
              finalChar.companions.forEach(c => c.loyalty = Math.max(0, c.loyalty - 10));
          }
      }
      // [FIX] 가입 및 스카우트 제안 수락 처리 - 기존 소속 정리 로직 최적화
      if (selectedOption?.action === 'join_guild') {
          const guildInfo = JSON.parse(selectedOption.callbackId);
          if (finalChar.mercenaryData) {
              // 1. 기존 용병단 데이터 완전 초기화 (탈퇴 및 리더십 포기)
              finalChar.mercenaryData.isGroupLeader = false;
              finalChar.mercenaryData.groupName = undefined;
               finalChar.mercenaryData.isViceCaptain = false;
              finalChar.mercenaryData.groupMembers = [];
              finalChar.mercenaryData.groupMissions = [];
              
              // 2. 새 소속 정보 등록
              finalChar.mercenaryData.guildId = guildInfo.city; // 해당 도시 지부로 소속 변경
              finalChar.mercenaryData.joinedGroupId = guildInfo.guildId;
              if (guildInfo.bonusGold) finalChar.money += guildInfo.bonusGold;
          }
          
          // [NEW] 가입한 용병단의 단장과 부단장을 인연(socialNetwork)으로 등록
          let foundGroup: any = null;
          for (const cityKey in REGIONAL_MERCENARY_GROUPS) {
              const group = REGIONAL_MERCENARY_GROUPS[cityKey].find(g => g.id === guildInfo.guildId);
              if (group) {
                  foundGroup = group;
                  break;
              }
          }

          if (foundGroup) {
              if (!finalChar.socialNetwork) finalChar.socialNetwork = [];
              const currentYear = getYear(finalChar.currentDate || '2000-01-01');
              const capRank = foundGroup.size === 'Large' ? MercenaryRank.S : MercenaryRank.A;
              const viceRank = foundGroup.size === 'Large' ? MercenaryRank.A : MercenaryRank.B;
              const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

              const createBond = (id: string, name: string, rank: MercenaryRank, roleTitle: string): SimpleStudent => {
                  const level = generateLevelByRank(rank);
                  const stats = generateCompanionStats(level);
                  const gender = Math.random() > 0.5 ? "남성" : "여성";
                  const randomAgeNum = 30 + Math.floor(Math.random() * 10);
                  return {
                      id: id,
                      name: name,
                      age: `${randomAgeNum}세`,
                      birthYear: currentYear - randomAgeNum,
                      gender: gender,
                      race: foundGroup.race,
                      nation: foundGroup.nation,
                      level: level,
                      classType: "용병",
                      personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                      appearance: `${foundGroup.name}의 ${roleTitle}입니다.`,
                      stats: { ...stats },
                      affection: 10,
                      job: JobType.MERCENARY,
                      mercenaryRank: rank,
                      reputation: MERCENARY_RANK_THRESHOLD[rank],
                      isStaticRank: true,
                      visualUrl: generateDefaultVisualUrl(name, foundGroup.nation, foundGroup.race, gender)
                  };
              };

              const capId = `faction_core_${foundGroup.id}_Captain`;
              const viceId = `faction_core_${foundGroup.id}_Vice`;
              
              const captainBond = createBond(capId, foundGroup.captain || "무명의 단장", capRank, "단장");
              const viceCaptainBond = createBond(viceId, foundGroup.viceCaptain || "무명의 부단장", viceRank, "부단장");

              [captainBond, viceCaptainBond].forEach(bond => {
                  if (!finalChar.socialNetwork!.some(sn => sn.id === bond.id)) {
                      finalChar.socialNetwork!.push(bond);
                  }
              });
          }
          // 3. 위치 정보 자동 업데이트 (스카우트 수락 시 해당 도시로 이동 처리)
          if (guildInfo.nation && guildInfo.city) {
              let region = "아시아";
              for (const r in WORLD_GEOGRAPHY) {
                  if (WORLD_GEOGRAPHY[r][guildInfo.nation]) {
                      region = r; break;
                  }
              }
              finalChar.currentLocation = { region, nation: guildInfo.nation, city: guildInfo.city };
          }
      }
    // [NEW] 용병단 동반 탈퇴 처리
      if (selectedOption?.action === 'leave_group_with_loyalists') {
          const groupId = selectedOption.callbackId;
          if (finalChar.mercenaryData) {
              finalChar.mercenaryData.joinedGroupId = undefined;
              finalChar.mercenaryData.isViceCaptain = false;
          }
          
          // 임시 동료(임시 고용된 단원들)를 정식 동료로 전환 시도
          let stayCount = 0;
          const processList = (list: Companion[]) => {
              return list.map(c => {
                  if (c.isTemporary && c.factionId === groupId) {
                      const chance = (c.affection + c.loyalty) * 0.5;
                      if (Math.random() * 100 < chance) {
                          stayCount++;
                          return { ...c, isTemporary: false, factionId: undefined };
                      }
                      return null; // 남기로 결정
                  }
                  return c;
              }).filter(c => c !== null) as Companion[];
          };

          finalChar.companions = processList(finalChar.companions);
          if (finalChar.inactiveCompanions) {
              finalChar.inactiveCompanions = processList(finalChar.inactiveCompanions);
          }
          
          // 단장과의 관계 파탄
          const capId = `faction_core_${groupId}_Captain`;
          if (finalChar.socialNetwork) {
              const cap = finalChar.socialNetwork.find(n => n.id === capId);
              if (cap) {
                  cap.affection = -100;
                  cap.tension = 100;
              }
          }
          
          addToLog(`[용병단 독립] 당신을 따르는 ${stayCount}명의 대원들과 함께 자유의 몸이 되었습니다.`);
      }

      if (selectedOption?.action === 'affection_gain' && selectedOption.text.includes('3일')) {
          finalChar.currentDate = addDays(finalChar.currentDate || START_DATE, 3);
      }

      // 4. 멘토링 시간 경과 처리
      if (selectedOption?.action === 'affection_gain' && selectedOption.text.includes('3일')) {
          finalChar.currentDate = addDays(finalChar.currentDate || START_DATE, 3);
      }
// [NEW] 비호 국가 이벤트 분기 처리
      if (selectedOption?.action === 'divine_bless_festival') {
          const nation = selectedOption.callbackId;
          const relic = NATION_RELICS[nation] || NATION_RELICS["대한민국"];
          if (relic) {
              finalChar.inventory.push({ ...relic, enhancement: 0 } as Item);
          }
          finalChar.faith = Math.max(0, finalChar.faith - 5000);
      }

      if (selectedOption?.action === 'divine_show_power') {
          const nation = selectedOption.callbackId;
          const templeKey = `${character.currentLocation?.nation}_${character.currentLocation?.city}`;
          if (finalChar.base?.templePersonnel?.[templeKey]) {
              finalChar.base.templePersonnel[templeKey].majesty = (finalChar.base.templePersonnel[templeKey].majesty || 0) + 1000;
          }
          finalChar.infamy = (finalChar.infamy || 0) + 50;
      }

      if (selectedOption?.action === 'divine_send_army') {
          const meta = JSON.parse(selectedOption.callbackId);
          const enemies = generateWarEnemies(meta.enemy, finalChar.level, false, 0);
          handleBattleTrigger(enemies, 'temple_defense', meta.nation);
      }

      if (selectedOption?.action === 'divine_warn_leader') {
          const meta = JSON.parse(selectedOption.callbackId);
          const successChance = Math.min(90, (finalChar.level / 10) + 20);
          if (Math.random() * 100 < successChance) {
              finalChar.templeDiplomacy![meta.nation].tension = 0;
              addToLog(`[신성 위엄] 당신의 경고에 겁을 먹은 ${meta.enemy}의 군대가 침공을 철회하고 물러갔습니다.`);
          } else {
              const enemies = generateWarEnemies(meta.enemy, finalChar.level, false, 0);
              handleBattleTrigger(enemies, 'temple_defense', meta.nation);
          }
      }

      if (selectedOption?.action === 'divine_withdraw_protection') {
          const nation = selectedOption.callbackId;
          finalChar.templeDiplomacy![nation].status = DivineDiplomacyStatus.NEUTRAL;
          finalChar.infamy = (finalChar.infamy || 0) + 200;
      }

      if (selectedOption?.action === 'divine_preach') {
          finalChar.faith = (finalChar.faith || 0) + 1000;
      }

      if (selectedOption?.action === 'divine_charity') {
          const nation = selectedOption.callbackId;
          finalChar.money = Math.max(0, finalChar.money - 100000);
          const templeKey = `${character.currentLocation?.nation}_${character.currentLocation?.city}`;
          if (finalChar.base?.templePersonnel?.[templeKey]) {
              finalChar.base.templePersonnel[templeKey].majesty = (finalChar.base.templePersonnel[templeKey].majesty || 0) + 2000;
          }
      }

      if (selectedOption?.action === 'divine_purge') {
          const nation = selectedOption.callbackId;
          finalChar.faith = (finalChar.faith || 0) + 500;
          finalChar.infamy = (finalChar.infamy || 0) + 100;
          finalChar.templeDiplomacy![nation].tension = Math.max(0, finalChar.templeDiplomacy![nation].tension - 20);
      }

      if (selectedOption?.action === 'divine_reeducate') {
          const nation = selectedOption.callbackId;
          finalChar.templeDiplomacy![nation].influence = Math.min(100, finalChar.templeDiplomacy![nation].influence + 15);
          finalChar.currentDate = addDays(finalChar.currentDate || START_DATE, 10);
      }
      
      // [NEW] 민중 봉기 전투 트리거 로직
      if (selectedOption?.action === 'regional_uprising_fight') {
          const data = JSON.parse(selectedOption.callbackId);
          const city = data.city;
          const level = finalChar.level + 10;
          const stats = generateEnemyStats(level);
          
          const enemies: Enemy[] = [
              {
                  name: `[반란군] 분노한 민병대장`,
                  level,
                  hp: stats.maxHp * 3,
                  maxHp: stats.maxHp * 3,
                  stats: { ...stats, hp: stats.maxHp * 3, maxHp: stats.maxHp * 3 },
                  shinryokuType: "무기강화계",
                  description: "가혹한 통치에 반발하여 일어난 주민들의 리더입니다.",
                  statusEffects: [],
                  skills: []
              },
              {
                  name: `[반란군] 성난 주민 A`,
                  level: level - 5,
                  hp: stats.maxHp,
                  maxHp: stats.maxHp,
                  stats,
                  shinryokuType: "무속성",
                  description: "농기구를 든 성난 주민입니다.",
                  statusEffects: [],
                  skills: []
              }
          ];

          handleBattleTrigger(enemies, 'regional_uprising', city);
          setCharacter(finalChar);
          return;
      }

         // [NEW] 신성 교리 논쟁 처리
      if (selectedOption?.action === 'divine_dispute_logic') {
          const targetTemple = selectedOption.callbackId;
          const successChance = (finalChar.stats.wis + finalChar.stats.ctrl) * 0.1;
          const roll = Math.random() * 100;
          
          if (roll < successChance) {
              if (!finalChar.divineRelations) finalChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
              finalChar.divineRelations.temples[targetTemple] = { affection: 100, status: '동맹' };
              finalChar.faith = (finalChar.faith || 0) + 10000;
              addToLog(`[교리 승리] ${targetTemple}의 사자가 당신의 논리에 감복했습니다. 두 성전은 이제 혈맹입니다!`);
          } else {
              if (!finalChar.divineRelations) finalChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
              finalChar.divineRelations.temples[targetTemple] = { affection: -50, status: '적대' };
              addToLog(`[교리 패배] 당신의 주장은 비웃음만 샀습니다. ${targetTemple}과의 관계가 급격히 악화되었습니다.`);
          }
      }

      if (selectedOption?.action === 'divine_dispute_battle') {
          const targetTemple = selectedOption.callbackId;
          let nation = "신계";
          for (const r in WORLD_GEOGRAPHY) {
              for (const n in WORLD_GEOGRAPHY[r]) {
                  if (WORLD_GEOGRAPHY[r][n].cities.includes(targetTemple)) { nation = n; break; }
              }
          }
          const enemies = generateDivineWarEnemies('TEMPLE', nation, targetTemple, finalChar.level);
          handleBattleTrigger(enemies, 'temple_invasion', targetTemple, targetTemple, nation);
      }

      // [NEW] 신을 죽인 자의 신앙 (Slayer Cult) 처리
      if (selectedOption?.action === 'divine_slayer_cult_blood') {
          finalChar.infamy = Math.max(0, (finalChar.infamy || 0) - 500);
          finalChar.faith = (finalChar.faith || 0) + 100000;
          addToLog(`[피의 세탁] 광신도들의 맹목적인 믿음이 당신의 죄악을 신성으로 덮어버렸습니다.`);
      }

      if (selectedOption?.action === 'divine_slayer_cult_power') {
          const bonus = 50;
          finalChar.stats.str += bonus; finalChar.stats.int += bonus; finalChar.stats.def += bonus;
          finalChar.stats.agi += bonus; finalChar.stats.wis += bonus; finalChar.stats.ctrl += bonus;
          finalChar.stats.maxHp += 2000; finalChar.stats.hp = finalChar.stats.maxHp;
          addToLog(`[절대 지배] 수많은 이들의 경외심이 당신의 육체를 초월적인 경지로 끌어올립니다.`);
      }
      setCharacter(finalChar);
      addToLog(`[운명의 선택] ${outcomeText}`);
      setResultModalData({
          type: 'info',
          title: '선택의 결과',
          message: outcomeText,
          items: []
      });
  };




   // [MODIFIED] 인터뷰 자동 발생 로직 - 백그라운드 사전 생성 로직 추가
  useEffect(() => {
      if (view !== 'game' || isCheckingInterview) return;

      const currentMonth = character.currentDate?.substring(0, 7);
      if (character.lastInterviewRequestMonth === currentMonth) return;

      const rep = character.mercenaryData?.reputation || 0;
      const merit = character.militaryData?.merit || 0;
      
      if (rep < 1000 && merit < 1000) return;

      const probability = Math.max(rep, merit) / 10000000000000;
      const roll = Math.random() * 100;

      if (roll < probability) {
          handleTriggerInterviewRequest(currentMonth);
      }
  }, [character.currentDate]);

  const handleTriggerInterviewRequest = async (monthStr?: string) => {
      const nation = character.currentLocation?.nation || character.nation;
      const reporterGender = Math.random() < 0.5 ? 'male' : 'female';
      const reporterName = generateName(nation, reporterGender);
      const mediaList = ["제국 일보", "차원 전보", "시티 연합 뉴스", "월드 매거진", "모험가 저널", "성역 타임즈"];
      const media = mediaList[Math.floor(Math.random() * mediaList.length)];
      const interviewId = `int_${Date.now()}`;
      
      const skeleton: InterviewData = {
          id: interviewId,
          interviewer: reporterName,
          interviewerTitle: media,
          topic: "신흥 강자와의 조우",
          questions: [] // 초기엔 비워둠
      };

      // 1. 즉시 스테이트에 초대장(Skeleton) 추가 (함수형 업데이트로 데이터 유실 방지)
      setCharacter(prev => ({
          ...prev,
          pendingInterviews: [...(prev.pendingInterviews || []), skeleton],
          lastInterviewRequestMonth: monthStr
      }));
      
      addToLog(`[시스템 알림] ${media}의 '${reporterName}' 기자가 인터뷰를 희망하고 있습니다. '세상의 소리' 게시판에서 내용을 확인하십시오.`);

      // 2. 백그라운드에서 질문지 생성 시작
      try {
          // 호출 시점의 character 스냅샷을 사용하되, 결과는 최신 상태에 머지함
          const fullInterviewData = await generateInterviewQuestions(character, skeleton);
          
          // 3. 비동기 완료 후 함수형 업데이트를 통해 '질문지'만 최신 상태에 주입
          setCharacter(prev => {
              if (!prev.pendingInterviews) return prev;
              const nextInterviews = prev.pendingInterviews.map(inv => 
                  inv.id === interviewId ? fullInterviewData : inv
              );
              return { ...prev, pendingInterviews: nextInterviews };
          });
          
          console.log(`인터뷰 준비가 완료됐습니다.: ${interviewId}`);
      } catch (e) {
          console.error("Background interview generation failed", e);
      }
  };

   // [NEW] 마계 하극상 전투 종료 체크
  
  // [NEW] 마계 반역 트리거 리스너 (이벤트 방식으로 폴링 제거)
  useEffect(() => {
    const handleRebellionTrigger = () => {
      const boss = generateBossMonster("임페리얼 제국", "임페리얼", 12);
      boss.name = "[폐위 대상] 마신 임페리얼";
      handleBattleTrigger(boss, 'magye_rebellion', '임페리얼 제국');
    };
    window.addEventListener('start_magye_rebellion', handleRebellionTrigger);
    return () => window.removeEventListener('start_magye_rebellion', handleRebellionTrigger);
  }, []);

  // [NEW] Bestiary Defeat Sync Effect
    useEffect(() => {
        if (combatState.isEnded && sceneType === 'normal' && combatState.enemies && combatState.enemies.length > 0) {
            const deadEnemies = combatState.enemies.filter(e => e.hp <= 0);
            if (deadEnemies.length > 0) {
                setCharacter(prev => {
                    const next = { ...prev };
                    if (!next.bestiary) next.bestiary = {};
                    const newBestiary = { ...next.bestiary };
                    let changed = false;

                    deadEnemies.forEach(enemy => {
                        const cleanName = enemy.name.replace(/\[.*?\]/g, '').replace(/\s+[A-Z]$/, '').trim();
                        // [MODIFIED] 공식 명단에 있는 경우에만 기록
                        if (isOfficialMonster(enemy.name)) {
                            if (!newBestiary[cleanName]) {
                                newBestiary[cleanName] = { encountered: true, defeatedCount: 1 };
                                changed = true;
                            } else {
                                newBestiary[cleanName] = {
                                    ...newBestiary[cleanName],
                                    encountered: true,
                                    defeatedCount: (newBestiary[cleanName].defeatedCount || 0) + 1
                                };
                                changed = true;
                            }
                        }
                        // [NEW] 퀘스트 진행도 업데이트
                        const { updatedCharacter: updatedPlayer, completedQuests: playerCompleted } = updateQuestProgress(next, 1);
                        Object.assign(next, updatedPlayer);
                        playerCompleted.forEach(q => addToLog(`[퀘스트 완료] ${q.title}을(를) 완료했습니다!`));

                        next.companions.forEach((comp, idx) => {
                            const { updatedCharacter: updatedComp, completedQuests: compCompleted } = updateQuestProgress(comp, 1);
                            next.companions[idx] = updatedComp as Companion;
                            compCompleted.forEach(q => addToLog(`[퀘스트 완료] ${comp.name}의 ${q.title}을(를) 완료했습니다!`));
                        });
                    });

                    if (changed) {
                        next.bestiary = newBestiary;
                        return next;
                    }
                    return prev;
                });
            }
        }
    }, [combatState.isEnded, sceneType]);
    
  // [NEW] 마계 반역 전투 종료 체크
  useEffect(() => {
      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'magye_rebellion') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const newChar = { ...character };
          
          if (isVictory) {
              const promotionResult = performGeneralPromotion(character, 'player');
              if (promotionResult.success) {
                  const finalChar = promotionResult.newChar;
                  // 마신 등극 시 모든 지배지 공포도 증가
                  if (finalChar.magyeDominions) {
                      Object.keys(finalChar.magyeDominions).forEach(city => {
                          finalChar.magyeDominions![city].fear = 1000;
                      });
                  }
                  setCharacter(finalChar);
                  addToLog(`[옥좌 찬탈] 마신 임페리얼을 폐위시키고 새로운 마계의 신이 되었습니다!`);
                  setResultModalData({
                      type: 'levelup',
                      title: '새로운 마신의 시대',
                      message: '제국 역사상 유례없는 반역이 성공했습니다. 이제 당신이 마계의 법이자 신입니다.',
                      items: [
                          { label: '변경된 직업', after: JobType.DEMON_GOD },
                          { label: '전 지배지 공포도', after: '1000 (최대)' }
                      ]
                  });
              }
          } else {
              // 패배 시 무직으로 추락 및 마계 추방
              newChar.job = JobType.UNEMPLOYED;
              newChar.militaryRank = undefined;
              newChar.classTier = ClassTier.NONE;
              newChar.magyeDominions = undefined; // 모든 영토 상실
              
              // 위치를 본국으로 강제 이동 시뮬레이션
              newChar.currentLocation = { region: '아시아', nation: '대한민국', city: '서울' };
              
              setCharacter(newChar);
              addToLog(`[반역 패배] 마신의 권능 앞에 무릎을 꿇었습니다. 지위를 박탈당하고 제국에서 추방되었습니다...`);
              setResultModalData({
                  type: 'destroy',
                  title: '지위 박탈 및 추방',
                  message: '반역의 대가는 혹독했습니다. 모든 명예와 영토를 잃고 인간계로 쫓겨났습니다.',
                  items: [
                      { label: '현재 상태', after: '무직 (추방됨)' },
                      { label: '거주지', after: '대한민국, 서울' }
                  ]
              });
          }
          setCombatState(prev => ({ ...prev, type: undefined }));
      }
  }, [sceneType, combatState.isEnded, combatState.type]);
  
  // [NEW] 지역 방위 및 긴급 퀘스트 전투 종료 체크
  useEffect(() => {
      if (sceneType === 'normal' && combatState.isEnded && (combatState.type === 'military_regional_defense' || combatState.type === 'emergency_rescue')) {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const questId = (combatState as any).sourceId;
          const newChar = { ...character };
          
          if (isVictory) {
              let quest: Quest | undefined = undefined;
              let isMilitary = false;

              if (newChar.militaryData?.activeMissions) {
                  const mIdx = newChar.militaryData.activeMissions.findIndex(q => q.id === questId);
                  if (mIdx !== -1) {
                      quest = newChar.militaryData.activeMissions[mIdx];
                      newChar.militaryData.activeMissions.splice(mIdx, 1);
                      isMilitary = true;
                  }
              }
              if (!quest && newChar.mercenaryData?.activeQuests) {
                  const qIdx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === questId);
                  if (qIdx !== -1) {
                      quest = newChar.mercenaryData.activeQuests[qIdx];
                      newChar.mercenaryData.activeQuests.splice(qIdx, 1);
                      newChar.mercenaryData.completedQuests = (newChar.mercenaryData.completedQuests || 0) + 1;
                      newChar.mercenaryData.reputation = (newChar.mercenaryData.reputation || 0) + 30;
                  }
              }

              if (quest) {
                  newChar.money += (quest.rewardGold || 0);
                  if (isMilitary && newChar.militaryData) {
                      newChar.militaryData.merit += (quest.rewardMerit || 0);
                  }
                  if (quest.rewardExp) {
                      newChar.currentExp = (newChar.currentExp || 0) + quest.rewardExp;
                  }

                  let rescueMsg = '';
                  if (quest.isEmergency && quest.civilianToRescue) {
                      const civilian = quest.civilianToRescue;
                      if (!newChar.socialNetwork) newChar.socialNetwork = [];
                      newChar.socialNetwork.push(assignRandomCombatStyle(civilian, false));
                      rescueMsg = `\n[민간인 구조] 위기에 처했던 ${civilian.name}을(를) 무사히 구출했습니다!`;
                  }

                  addToLog(`[임무 완수] ${quest.title}을(를) 성공적으로 완수했습니다! 보상: ${(quest.rewardGold || 0).toLocaleString()}G${rescueMsg}`);
                  
                  setResultModalData({
                      type: 'success',
                      title: '임무 완수 성공',
                      message: `${quest.title} 임무를 완수하여 위기를 극복했습니다.${rescueMsg}`,
                      items: [
                          { label: '획득 골드', after: `+${(quest.rewardGold || 0).toLocaleString()} G` },
                          { label: '획득 경험치', after: `+${(quest.rewardExp || 0).toLocaleString()} EXP` }
                      ]
                  });
              }
          } else {
              addToLog(`[임무 실패] 적의 습격을 막아내지 못하고 후퇴했습니다...`);
              setResultModalData({
                  type: 'destroy',
                  title: '임무 실패',
                  message: '적의 강력한 공세에 밀려 후퇴했습니다. 전열을 재정비하십시오.',
                  items: []
              });
          }
          
          const leveledChar = processImmediateLevelUp(newChar, (m) => setResultModalData(m));
          setCharacter(leveledChar);
          setCombatState(prev => ({ ...prev, type: undefined }));
      }
  }, [sceneType, combatState.isEnded, combatState.type]);

 // [NEW] 민중 봉기 전투 종료 체크
  useEffect(() => {
      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'regional_uprising') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const city = (combatState as any).sourceId;
          const newChar = { ...character };
          
          if (isVictory) {
              if (newChar.militaryData?.regionStats?.[city]) {
                  const rStats = newChar.militaryData.regionStats[city];
                  rStats.security = Math.min(100, rStats.security + 20);
                  rStats.sentiment = Math.max(0, rStats.sentiment - 30);
                  const infamyGain = 50;
                  newChar.infamy = (newChar.infamy || 0) + infamyGain;

                  // [NEW] 동료 관리자들의 악명도 함께 상승
                  const cmdrId = newChar.militaryData.regionalAppointments?.[city];
                  const viceId = newChar.militaryData.regionalViceAppointments?.[city];
                  const applyCompanionInfamy = (id: string | undefined) => {
                      if (!id || id === 'player') return;
                      const c = newChar.companions.find(comp => comp.id === id) || 
                                newChar.inactiveCompanions?.find(comp => comp.id === id);
                      if (c) c.infamy = (c.infamy || 0) + infamyGain;
                  };
                  applyCompanionInfamy(cmdrId);
                  applyCompanionInfamy(viceId);
                  
                  addToLog(`[봉기 진압] 무력으로 주민들을 굴복시켰습니다. 치안은 회복되었으나 민심은 흉흉하기 짝이 없습니다. (악명 +${infamyGain})`);
                  setResultModalData({
                      type: 'warning',
                      title: '봉기 무력 진압 완료',
                      message: '피의 진압으로 질서를 되찾았습니다. 주민들은 당신과 지휘부 인원들을 공포의 대상으로 여깁니다.',
                      items: [
                          { label: '치안도 상승', after: '+20%' },
                          { label: '민심 하락', after: '-30%' },
                          { label: '악명 상승', after: `+${infamyGain}` }
                      ]
                  });
              }
          } else {
              if (newChar.militaryData?.regionStats?.[city]) {
                  newChar.militaryData.regionStats[city].budget = 0;
                  addToLog(`[진압 실패] 반란군에게 패배하여 지역 금고를 약탈당했습니다! 지역 예산이 0원이 되었습니다.`);
                  setResultModalData({
                      type: 'destroy',
                      title: '지휘부 함락 및 약탈',
                      message: '분노한 주민들에게 패배했습니다. 지역 관저가 약탈당하고 모든 예산을 잃었습니다.',
                      items: [{ label: '지역 예산', after: '0 G (전액 약탈)' }]
                  });
              }
          }
          setCharacter(newChar);
          setCombatState(prev => ({ ...prev, type: undefined }));
      }
  }, [sceneType, combatState.isEnded, combatState.type]);


    useEffect(() => {
          if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'school_demo') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const newChar = { ...character };
          
          if (isVictory && newChar.pendingSchoolQuest) {
              const questData = newChar.pendingSchoolQuest;
              const statGains = questData.statGains;
              
              // 1. 퀘스트 완료 처리
              if (newChar.mercenaryData?.activeQuests) {
                  const qIdx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === questData.questId);
                  if (qIdx !== -1) {
                      newChar.mercenaryData.activeQuests.splice(qIdx, 1);
                      newChar.mercenaryData.completedQuests = (newChar.mercenaryData.completedQuests || 0) + 1;
                  }
              } else if (newChar.militaryData?.activeMissions) {
                  const mIdx = newChar.militaryData.activeMissions.findIndex(q => q.id === questData.questId);
                  if (mIdx !== -1) {
                      newChar.militaryData.activeMissions.splice(mIdx, 1);
                      newChar.militaryData.completedMissions = (newChar.militaryData.completedMissions || 0) + 1;
                  }
              }
              
              // 2. 학생들 능력치 및 호감도 상승
              if (questData.studentsToTeach) {
                  const updatedStudents = questData.studentsToTeach.map(s => {
                      const gain = statGains || { str: 0, int: 0, def: 0, agi: 0, hp: 0 };
                      const updated = {
                          ...s,
                          stats: {
                              ...s.stats,
                              str: (s.stats.str || 10) + (gain.str || 0),
                              int: (s.stats.int || 10) + (gain.int || 0),
                              def: (s.stats.def || 10) + (gain.def || 0),
                              agi: (s.stats.agi || 10) + (gain.agi || 0),
                              hp: (s.stats.hp || 100) + (gain.hp || 0)
                          },
                          affection: Math.min(100, (s.affection || 0) + 10) // 시범 전투 승리 시 호감도 대폭 상승
                      };
                      
                      // 인물 관계망 업데이트
                      if (!newChar.socialNetwork) {
                          newChar.socialNetwork = [];
                      }
                      const snIdx = newChar.socialNetwork.findIndex(sn => sn.id === s.id);
                      if (snIdx !== -1) {
                          newChar.socialNetwork[snIdx] = assignRandomCombatStyle({ ...newChar.socialNetwork[snIdx], ...updated, isPastConnection: true }, false);
                      } else {
                          newChar.socialNetwork.push(assignRandomCombatStyle({ ...updated, isPastConnection: true, metYear: getYear(newChar.currentDate || '2000-01-01') }, true));
                      }
                      return updated;
                  });
                  
                  // 만약 플레이어가 같은 학교의 학생이라면 학급 친구들 데이터도 업데이트
                  if (newChar.schoolData?.schoolName === questData.schoolName && newChar.schoolData?.classmates) {
                      newChar.schoolData.classmates = newChar.schoolData.classmates.map(c => {
                          const updated = updatedStudents.find(s => s.id === c.id);
                          return updated ? { ...c, ...updated } : c;
                      });
                  }
              }
              
              // 3. 보상 지급
              newChar.money += questData.rewards.gold;
              newChar.currentExp += questData.rewards.exp;
              
              addToLog(`[시범 전투 승리] ${questData.schoolName}의 학생들 앞에서 완벽한 시범을 보였습니다!`);
              setResultModalData({
                  type: 'levelup',
                  title: '시범 전투 및 강의 완료',
                  message: `${questData.schoolName}의 임시 교관 임무를 성공적으로 마쳤습니다. 학생들의 실력이 크게 향상되었고 당신을 우러러봅니다.`,
                  items: [
                      { label: '획득 골드', after: `+${questData.rewards.gold} G` },
                      { label: '획득 경험치', after: `+${questData.rewards.exp} EXP` },
                      { label: '학생 호감도', after: '+10' }
                  ]
              });
          } else if (!isVictory && newChar.pendingSchoolQuest) {
              const questData = newChar.pendingSchoolQuest;
              addToLog(`[시범 전투 패배] ${questData.schoolName}의 학생들 앞에서 체면을 구겼습니다... 강의는 실패로 돌아갔습니다.`);
              setResultModalData({
                  type: 'destroy',
                  title: '시범 전투 실패',
                  message: '훈련용 마물에게 패배하여 학생들에게 실망을 안겨주었습니다. 임무 보상을 받을 수 없습니다.',
                  items: [
                      { label: '임무 결과', after: '실패' },
                      { label: '학생 호감도', after: '-5' }
                  ]
              });
              
              // 패배 시 호감도 깎기
              if (questData.studentsToTeach) {
                  const updatedStudents = questData.studentsToTeach.map(s => {
                      const updated = {
                          ...s,
                          affection: Math.max(0, (s.affection || 0) - 5)
                      };
                      
                      // 인물 관계망 업데이트
                      if (!newChar.socialNetwork) {
                          newChar.socialNetwork = [];
                      }
                      const snIdx = newChar.socialNetwork.findIndex(sn => sn.id === s.id);
                      if (snIdx !== -1) {
                          newChar.socialNetwork[snIdx] = assignRandomCombatStyle({ ...newChar.socialNetwork[snIdx], ...updated, isPastConnection: true }, false);
                      } else {
                          newChar.socialNetwork.push(assignRandomCombatStyle({ ...updated, isPastConnection: true, metYear: getYear(newChar.currentDate || '2000-01-01') }, true));
                      }
                      return updated;
                  });
                  
                  // 만약 플레이어가 같은 학교의 학생이라면 학급 친구들 데이터도 업데이트
                  if (newChar.schoolData?.schoolName === questData.schoolName && newChar.schoolData?.classmates) {
                      newChar.schoolData.classmates = newChar.schoolData.classmates.map(c => {
                          const updated = updatedStudents.find(s => s.id === c.id);
                          return updated ? { ...c, ...updated } : c;
                      });
                  }
              }
          }
          
          newChar.pendingSchoolQuest = undefined;
          const leveledChar = processImmediateLevelUp(newChar, (m) => setResultModalData(m));
          setCharacter(leveledChar);
          setCombatState(prev => ({ ...prev, type: undefined }));
      }

      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'magye_divine_war') {
        const isVictory = combatState.enemies.every(e => e.hp <= 0);
        const city = (combatState as any).targetCity;
        const newChar = { ...character };
        
        if (isVictory) {
            // 승리 보상: 공포/타락 폭등
            if (newChar.magyeDominions?.[city]) {
                const dom = newChar.magyeDominions[city];
                dom.fear = Math.min(10000, dom.fear + 5000);
                dom.corruption = Math.min(10000, dom.corruption + 2000);
            }
            addToLog(`[승전보] 신의 사자를 굴복시켰습니다! ${city}의 주민들은 당신의 무력 앞에 절망하며 전율합니다.`);
            setResultModalData({
                type: 'levelup',
                title: '신의 정벌 격퇴',
                message: '감히 제국의 권능에 도전한 신의 사자를 물리쳤습니다. 지배력이 상상을 초월할 정도로 강화되었습니다.',
                items: [
                    { label: '공포도 상승', after: '+5000' },
                    { label: '타락도 상승', after: '+2000' }
                ]
            });
        } else {
            // 패배 페널티: 공포/타락 급락
            if (newChar.magyeDominions?.[city]) {
                const dom = newChar.magyeDominions[city];
                dom.fear = Math.max(0, dom.fear - 8000);
                dom.corruption = Math.max(0, dom.corruption - 4000);
            }
            addToLog(`[패보] 신의 심판에 무릎을 꿇었습니다... ${city}의 타락한 기운이 정화되고 주민들이 희망을 품기 시작했습니다.`);
            setResultModalData({
                type: 'destroy',
                title: '신의 정화 (Cleansed)',
                message: '신성한 권능 앞에 제국의 지배력이 무너졌습니다. 도시의 타락한 기운이 대부분 소멸했습니다.',
                items: [
                    { label: '공포도 하락', after: '-8000' },
                    { label: '타락도 하락', after: '-4000' }
                ]
            });
        } setCharacter(newChar);
      setCombatState(prev => ({ ...prev, type: undefined }));}
      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'base_defense') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          
          if (isVictory) {
              const newChar = { ...character };
              newChar.fame = (newChar.fame || 0) + 100;
              if (newChar.mercenaryData) {
                  newChar.mercenaryData = {
                      ...newChar.mercenaryData,
                      reputation: (newChar.mercenaryData.reputation || 0) + 100
                  };
              }
              addToLog(`[기지 방어 성공] 직접 나서서 기지를 습격한 적들을 모두 처치했습니다! (명성 +100)`);
              setResultModalData({
                  type: 'levelup',
                  title: '기지 방어 성공',
                  message: '당신의 활약으로 기지가 무사히 지켜졌습니다.',
                  items: [
                      { label: '명성 상승', after: '+100' }
                  ]
              });
              setCharacter(promoteNextIncident(newChar));
          } else {
              const enemyPower = (combatState as any).enemyPower || 1000;
              const { updatedCharacter, report, summaryLog } = applyBaseDefenseFailure(
                  character,
                  combatState.enemies,
                  enemyPower,
                  'direct'
              );
              addToLog(`[기지 방어 실패] 적들의 공세에 기지가 피해를 입었습니다.`);
              addToLog(summaryLog);

              setActiveBaseDamageReport(report);
              setCharacter(promoteNextIncident(updatedCharacter));
          }
          setCombatState(prev => ({ ...prev, isEnded: false, type: 'normal' }));
      }

      // [NEW] 전쟁 습격 (국가 침공 방어전 military_defense) 전투 종료 체크
      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'military_defense') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const targetNation = (combatState as any).targetNation || (combatState as any).sourceId?.replace(' 침공군', '') || '침략국';
          const newChar = { ...character };

          if (!newChar.militaryData) {
              newChar.militaryData = { rank: MilitaryRank.PVT, merit: 0, activeMissions: [], completedMissions: 0, enlistedDate: character.currentDate || START_DATE };
          }
          if (!newChar.militaryData.diplomacy) {
              newChar.militaryData.diplomacy = {};
          }
          if (!newChar.militaryData.diplomacy[targetNation]) {
              newChar.militaryData.diplomacy[targetNation] = { status: DiplomaticStatus.WAR, tension: 100, occupation: 0 };
          }

          const rel = { ...newChar.militaryData.diplomacy[targetNation] };
          const prevOcc = rel.occupation || 0;

          if (isVictory) {
              const occGain = 15;
              const newOcc = Math.min(100, prevOcc + occGain);
              rel.occupation = newOcc;
              newChar.militaryData.diplomacy[targetNation] = rel;
              const meritGain = 150;
              const repGain = 100;
              
              newChar.militaryData.merit = (newChar.militaryData.merit || 0) + meritGain;
              
              if (!newChar.mercenaryData) {
                  newChar.mercenaryData = {
                      rank: MercenaryRank.F,
                      registeredDate: character.currentDate || START_DATE,
                      completedQuests: 0,
                      reputation: 0,
                      guildId: 'None',
                      isGroupLeader: false,
                      activeQuests: [],
                      availableQuests: []
                  };
              }
              newChar.mercenaryData.reputation = (newChar.mercenaryData.reputation || 0) + repGain;
              newChar.fame = (newChar.fame || 0) + repGain;

              const updateDefenseCompanion = (c: Companion) => {
                  if (c.isDead) return c;
                  if (c.job === JobType.SOLDIER) {
                      return { ...c, merit: (c.merit || 0) + meritGain, currentExp: (c.currentExp || 0) + 500 };
                  } else {
                      return { ...c, reputation: (c.reputation || 0) + repGain, currentExp: (c.currentExp || 0) + 500 };
                  }
              };

              newChar.companions = newChar.companions.map(updateDefenseCompanion);
              if (newChar.inactiveCompanions) {
                  newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateDefenseCompanion);
              }

              addToLog(`[전선 승전보] ${targetNation} 침공군과의 방어전에서 승리했습니다! (전선 점유율: ${prevOcc}% ➔ ${newOcc}%, 군사 공적 +${meritGain}, 명성 +${repGain})`);
              setResultModalData({
                  type: 'levelup',
                  title: '⚔️ [전쟁 방어전 승리] 전선 사수 성공!',
                  message: `${targetNation} 정예 침공 부대의 공격을 성공적으로 격퇴했습니다. 전선 점유율, 군사 공적 및 명성이 상승했습니다.`,
                  items: [
                      { label: '전선 점유율', before: `${prevOcc}%`, after: `${newOcc}% (+${occGain}%)` },
                      { label: '군사 공적', after: `+${meritGain}` },
                      { label: '명성치 획득', after: `+${repGain} RP` },
                      { label: '참전 동료', after: '공적/명성 상승' }
                  ]
              });
          } else {
              const occLoss = 20;
              const newOcc = Math.max(-100, prevOcc - occLoss);
              rel.occupation = newOcc;
              newChar.militaryData.diplomacy[targetNation] = rel;
              if (newChar.mercenaryData) {
                  newChar.mercenaryData.reputation = Math.max(0, (newChar.mercenaryData.reputation || 0) - 30);
              }

              addToLog(`[전선 패보] ${targetNation} 침공군에게 패배하여 전선 방어선이 무너졌습니다! (전선 점유율: ${prevOcc}% ➔ ${newOcc}%)`);
              setResultModalData({
                  type: 'destroy',
                  title: '💥 [전쟁 방어전 패배] 전선 붕괴!',
                  message: `${targetNation} 침공군의 강력한 공세에 밀려 패배했습니다. 적군의 전선 지배력이 확대되고 점유율이 급격히 떨어졌습니다.`,
                  items: [
                      { label: '전선 점유율', before: `${prevOcc}%`, after: `${newOcc}% (-${occLoss}%)` },
                      { label: '침공 세력', after: `${targetNation}` },
                      { label: '명성 손실', after: '-30' }
                  ]
              });
          }

          setCharacter(newChar);
          setCombatState(prev => ({ ...prev, isEnded: false, type: 'normal' }));
      }

      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'magye_revolt') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
            const city = (combatState as any).targetCity || (combatState as any).sourceId; // 도시 정보 우선 참조
          const rebelRankIdx = combatState.rebelRankIdx !== undefined ? combatState.rebelRankIdx : 10;
          
          if (isVictory) {
              const newChar = { ...character };
              if (newChar.magyeDominions?.[city]) {
                  newChar.magyeDominions[city].fear = newChar.magyeDominions[city].fear + 300;
                  newChar.magyeDominions[city].corruption = newChar.magyeDominions[city].corruption + 150;
              }
              addToLog(`[반란 진압] 제너럴이 직접 반역자를 처단했습니다! 도시의 공포가 극에 달합니다.`);
              setResultModalData({
                  type: 'levelup',
                  title: '하극상 진압 성공',
                  message: '지배자의 압도적인 위력 앞에 반역자들은 비명을 지르며 스러졌습니다.',
                  items: [
                      { label: '공포도 상승', after: '+300' },
                      { label: '타락도 상승', after: '+150' }
                  ]
              });
          } else {
              // [MODIFIED] 패배 시 도시 정보를 포함하여 강등 로직 호출 (수치 초기화 및 인사 해제 포함)
              const demotionUpdate = handleMagyeDemotion(character, rebelRankIdx, city);
              const newChar = { ...character, ...demotionUpdate };
              addToLog(`[찬탈 당함] ${city}의 반란군에게 패배하여 지위를 잃고 쫓겨났습니다... 지배지의 통치권이 초기화되었습니다.`);
              setResultModalData({
                  type: 'destroy',
                  title: '지위 박탈 및 통치권 상실',
                  message: '전투에서 패배하여 서열의 자리를 빼앗겼습니다. 해당 도시의 통치 수치가 초기화되고 배치된 인원들이 해산되었습니다.',
                  items: [
                      { label: '변경된 직업', after: newChar.job },
                      { label: '지배지 수치', after: '0 (초기화)' }
                  ]
              });
                setCharacter(newChar);
          }
             setCombatState(prev => ({ ...prev, type: undefined }));} 
  
        // [NEW] 던전 전투 종료 체크
        if (sceneType === 'normal' && combatState.isEnded && (combatState.type === 'dungeon' || combatState.type === 'instant_dungeon')) {
            const isVictory = combatState.enemies.every(e => e.hp <= 0);
            if (isVictory) {
                const newChar = { ...character };
                if (newChar.dungeonProgress) {
                    const dp = newChar.dungeonProgress;
                    let currentNode = null;
                    if (dp.currentNodeId && dp.nodes && dp.nodes.length > 0) {
                        currentNode = dp.nodes.find((n: any) => n.id === dp.currentNodeId);
                    }
                    if (!currentNode && dp.currentIndex !== undefined && dp.nodes && dp.nodes[dp.currentIndex]) {
                        currentNode = dp.nodes[dp.currentIndex];
                    }
                    
                    if (currentNode) {
                        currentNode.isCompleted = true;
                        currentNode.isCurrent = false;
                        if (!dp.selectedPath) dp.selectedPath = [];
                        if (!dp.selectedPath.includes(currentNode.id)) {
                            dp.selectedPath.push(currentNode.id);
                        }
                    }

                    const isGridBoss = dp.gridDungeon
                        ? (Boolean(dp.gridDungeon.bossDefeated) || (typeof dp.currentNodeId === 'string' && dp.currentNodeId.startsWith('boss_')))
                        : false;
                    const isBossNode = dp.gridDungeon
                        ? isGridBoss
                        : (currentNode?.type === 'Boss' || (dp.nodes && dp.nodes.length > 0 && dp.nodes.every((n: any) => n.isCompleted)));
                    
                    if (!isBossNode) {
                        if (combatState.type === 'dungeon') {
                            setIsDungeonOpen(true);
                        }
                        addToLog(`[던전] 구역 소탕 완료! 다음 탐색 루트를 선택할 수 있습니다.`);
                        setCharacter(newChar);
                    } else {
                        // 보스 처치 시 던전 모달을 닫고 자동 퇴장
                        if (combatState.type === 'dungeon') {
                            setIsDungeonOpen(false);
                        }
                        addToLog(`[던전 정복] 던전의 모든 위협을 제거하고 보스를 격퇴했습니다!`);

                        // [MODIFIED] 보스 처치 시 해당 도시 던전 클리어 기록 (오늘 다시 입장 불가)
                        const city = newChar.currentLocation?.city || "알 수 없는 도시";
                        if (!newChar.clearedDungeonsByCity) newChar.clearedDungeonsByCity = {};
                        newChar.clearedDungeonsByCity[city] = newChar.currentDate || START_DATE;
                        
                        const finalChar = { ...newChar };
                        
                        // [NEW] 인스턴트 던전일 경우 즉시 보상 지급 및 소멸 처리
                        if (combatState.type === 'instant_dungeon' && finalChar.instantDungeons && dp.dungeonId) {
                            const dungeonId = dp.dungeonId;
                            const dungeonIndex = finalChar.instantDungeons.findIndex(d => d.id === dungeonId);
                            
                            if (dungeonIndex !== -1) {
                                const dungeon = finalChar.instantDungeons[dungeonIndex];
                                
                                // 전리품 지급
                                if (dungeon.loot && dungeon.loot.length > 0) {
                                    finalChar.inventory.push(...dungeon.loot);
                                    addToLog(`[전리품 획득] ${dungeon.loot.map(i => i.name).join(', ')}을(를) 획득했습니다.`);
                                    
                                    // 결과 모달에 전리품 정보 추가
                                    setTimeout(() => {
                                        setResultModalData({
                                            type: 'levelup',
                                            title: '던전 정복 및 전리품 획득',
                                            message: `${dungeon.name}의 보스를 처치하고 전리품을 획득했습니다.`,
                                            items: [
                                                ...dungeon.loot.map(i => ({ label: '획득', after: i.name })),
                                            ]
                                        });
                                    }, 500);
                                } else {
                                     setTimeout(() => {
                                        setResultModalData({
                                            type: 'levelup',
                                            title: '던전 정복 성공',
                                            message: `${dungeon.name}의 보스를 처치했습니다.`,
                                            items: []
                                        });
                                    }, 500);
                                }
                                
                                // 던전 목록에서 제거
                                finalChar.instantDungeons.splice(dungeonIndex, 1);
                                finalChar.dungeonProgress = undefined;
                                addToLog(`[던전 소멸] ${dungeon.name}이(가) 붕괴되어 사라졌습니다.`);
                            }
                        } else {
                            // 일반 던전 보스 클리어 시 던전 진행도 초기화 및 자동 나가기
                            finalChar.dungeonProgress = undefined;
                            setTimeout(() => {
                                setResultModalData({
                                    type: 'levelup',
                                    title: '던전 정복 성공',
                                    message: `보스를 처치하고 던전을 완전히 정복했습니다.`,
                                    items: []
                                });
                            }, 500);
                        }
                        setCharacter(finalChar);
                    }
                }
            } else {
                addToLog(`[던전 실패] 전투에서 패배하여 던전 밖으로 안전하게 후송 퇴각했습니다.`);
                
                // 패배 시 던전 진행도만 초기화 (1일 경과 및 자동 회복 없음)
                const newChar = { ...character };
                newChar.dungeonProgress = undefined;

                setTimeout(() => {
                    setResultModalData({
                        type: 'failure',
                        title: '던전 공략 실패',
                        message: `전투에서 패배하여 던전 공략이 중단되고 던전 밖으로 후송되었습니다.`,
                        items: [
                            { label: '던전 진행', after: '초기화' },
                            { label: '퇴각', after: '마을로 후송' }
                        ]
                    });
                }, 500);

                setCharacter(newChar);
            }
            setCombatState(prev => ({ ...prev, type: undefined }));
        }

        // [NEW] 인연 전투(relation_battle) 패배 로직 추가
        if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'relation_battle') {
            const isVictory = combatState.enemies.every(e => e.hp <= 0);
            if (!isVictory) {
                const targetId = (combatState as any).sourceId;
                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                let targetName = "상대";
                let resultItems: any[] = [];
                let deathTriggered = false;

                const findAndApplyLoss = (list: any[]) => {
                    if (!list) return;
                    const idx = list.findIndex(npc => npc.id === targetId);
                    if (idx !== -1) {
                        const npc = list[idx];
                        targetName = npc.name;
                        
                        // 패널티 계산
                        const isRival = npc.isRival;
                        const oldAff = npc.affection;
                        const newAff = Math.max(-100, oldAff - 20);
                        npc.affection = newAff;

                        if (isRival) {
                            const oldRes = npc.respect || 0;
                            const oldTen = npc.tension || 0;
                            npc.respect = Math.max(0, oldRes - 20);
                            npc.tension = Math.min(100, oldTen + 30);
                            resultItems.push({ label: '존중도 하락', after: '-20' });
                            resultItems.push({ label: '긴장도 상승', after: '+30' });
                        }
                        
                        resultItems.push({ label: '호감도 하락', before: oldAff, after: newAff });

                        // 사망 조건 체크: 호감도가 -100인 상태에서 패배 시
                        if (newAff <= -100) {
                            deathTriggered = true;
                        }
                    }
                };

                if (newChar.schoolData?.classmates) findAndApplyLoss(newChar.schoolData.classmates);
                if (newChar.socialNetwork) findAndApplyLoss(newChar.socialNetwork);
                if (newChar.base?.templeVisitors) {
                    Object.values(newChar.base.templeVisitors).forEach((list: any) => findAndApplyLoss(list));
                }

                if (deathTriggered) {
                    newChar.isDead = true;
                    addToLog(`[비극] ${targetName}이(가) 당신의 숨통을 완전히 끊어버렸습니다. 가문의 역사가 여기서 멈춥니다...`);
                } else {
                    addToLog(`[전투 패배] ${targetName}에게 처절하게 패배했습니다. 관계가 돌이킬 수 없이 악화됩니다.`);
                    setResultModalData({
                        type: 'failure',
                        title: '인연 대결 패배',
                        message: `전투에서 참패했습니다. ${targetName}은(는) 당신을 한심하다는 듯 내려다보고 떠났습니다.`,
                        items: resultItems
                    });
                }
                setCharacter(promoteNextIncident(newChar));
            }
            setCombatState(prev => ({ ...prev, type: undefined }));
        }
    }, [sceneType, combatState.isEnded, combatState.type]); // 의존성 배열 유지
    
  const handleInterviewFinished = (data: InterviewData, rewards: { merit: number, rep: number, infamy: number }) => {
      const newChar = { ...character };
      
      // 인터뷰 목록에서 제거
      newChar.pendingInterviews = (newChar.pendingInterviews || []).filter(i => i.id !== data.id);
      newChar.lastInterviewDate = character.currentDate;
      
      // [MODIFIED] 인터뷰 수락 보상: 100골드 * (공적 혹은 명성치)
      const currentHighestValue = Math.max(newChar.mercenaryData?.reputation || 0, newChar.militaryData?.merit || 0);
      const goldReward = currentHighestValue;
      newChar.money += goldReward;

      // 능력치 및 악명 업데이트
      if (newChar.mercenaryData) newChar.mercenaryData.reputation = Math.max(0, newChar.mercenaryData.reputation + rewards.rep);
      if (newChar.militaryData) newChar.militaryData.merit = Math.max(0, newChar.militaryData.merit + rewards.merit);
      newChar.infamy = Math.max(0, (newChar.infamy || 0) + rewards.infamy);

      // 업적 기록
      if (!newChar.memories) newChar.memories = [];
      newChar.memories.push(`[${character.currentDate}] ${data.interviewer}와의 인터뷰 '${data.topic}' 완료. (출연료 수령)`);
      
      setResultModalData({
        type: 'levelup',
        title: '인터뷰 종료 및 정산',
        message: '당신의 목소리가 세계 곳곳으로 보도되었습니다.\n언론사에서 보낸 출연료와 평판 보너스가 지급되었습니다.',
        items: [
          { label: '인터뷰 출연료', after: `+${goldReward.toLocaleString()} G` },
          ...(rewards.rep !== 0 ? [{ label: '명성치(RP) 변동', after: (rewards.rep > 0 ? '+' : '') + rewards.rep }] : []),
          ...(rewards.merit !== 0 ? [{ label: '공적치(Merit) 변동', after: (rewards.merit > 0 ? '+' : '') + rewards.merit }] : []),
          ...(rewards.infamy !== 0 ? [{ label: '악명도(Infamy) 변동', after: (rewards.infamy > 0 ? '+' : '') + rewards.infamy }] : [])
        ]
      });
  };

  useEffect(() => {
    const pending = character.mercenaryData?.pendingCriminal;
    if (pending) {
        setPendingCriminalResolution(pending);
        const newChar = { ...character };
        newChar.mercenaryData = { ...newChar.mercenaryData!, pendingCriminal: undefined };
        setCharacter(newChar);
    }
  }, [character.mercenaryData?.pendingCriminal]);

  // [NEW] 인연 전투 종료 체크
useEffect(() => {
    if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'relation_battle') {
        const targetId = (combatState as any).sourceId;
        const enemy = combatState.enemies[0];
        const isVictory = enemy && enemy.hp <= 0;
         

        if (targetId && isVictory) {
            const newChar = { ...character };
                   // [NEW] 뜬소문 추적 전투인 경우 아이템 획득 처리
            const activeRumor = newChar.mercenaryData?.activeRumor;
            if (activeRumor && targetId.startsWith('rumor_merc_')) {
                const rumoredItem = { ...activeRumor.item };
                newChar.inventory.push(rumoredItem);
                if (newChar.mercenaryData) newChar.mercenaryData.activeRumor = undefined;
                
                addToLog(`[소문 실체 확인] 용병 '${enemy.name.replace('[용병] ', '')}'을(를) 쓰러뜨리고 소문 속의 보물 '${rumoredItem.name}'을(를) 탈취했습니다!`);
                
                // 결과 모달에 아이템 획득 정보 추가 노출을 위해 수동 트리거
                setTimeout(() => {
                    setResultModalData({
                        type: 'levelup',
                        title: '보물 확보 성공!',
                        message: `치열한 경쟁 끝에 소문으로만 듣던 유물을 손에 넣었습니다.`,
                        items: [
                            { label: '획득 아이템', after: rumoredItem.name },
                            { label: '등급', after: rumoredItem.rarity }
                        ]
                    });
                }, 100);
            }
            // 1. 사회적 관계망에서 대상 탐색
            const socialIdx = newChar.socialNetwork?.findIndex(n => n.id === targetId) ?? -1;
            
            if (socialIdx !== -1) {
                const target = newChar.socialNetwork![socialIdx];
                
                // 2. 명성 보상 지급 (용병 명성 경쟁 승리)
                let repGain = 0;
                if (target.job === JobType.MERCENARY || target.name.includes('용병')) {
                    repGain = Math.floor((target.level/2) + (target.infamy || 0) * 0.1);
                    if (newChar.mercenaryData) {
                        newChar.mercenaryData.reputation += repGain;
                    }
                    addToLog(`[명성 획득] '${target.name}'과의 대결에서 승리하여 명성이 ${repGain} 상승했습니다.`);
                }

                // 3. 인연 정산 모달 호출
                setPendingRelationResolution({ targetId, enemy });
                setCharacter(newChar);
            }
         // 3. 인연 정산 모달 호출
                setPendingRelationResolution({ targetId, enemy });
                setCharacter(promoteNextIncident(newChar));
        }

    }
  }, [sceneType, combatState.isEnded, combatState.type]);

  // [NEW] 클래스 시련 및 최후의 시련 전투 종료 체크 (플레이어 및 커스텀 동료 1:1 지원 - 퍼스트, 세컨드, 라스트, 파이널)
  useEffect(() => {
      if (sceneType === 'normal' && combatState.isEnded && combatState.type === 'final_trial_battle') {
          const isVictory = combatState.enemies.every(e => e.hp <= 0);
          const challengerId = combatState.challengerCompanionId;
          const trialTier: ClassTier = combatState.trialTier || ClassTier.FINAL;
          const tierName = trialTier === ClassTier.FIRST ? "퍼스트 클래스" :
                           trialTier === ClassTier.SECOND ? "세컨드 클래스" :
                           trialTier === ClassTier.LAST ? "라스트 클래스" : "파이널 클래스";

          if (isVictory) {
              if (challengerId) {
                  // 커스텀 동료의 시련 승리
                  const compName = (character.companions || []).find(c => c.id === challengerId)?.name || 
                                   character.inactiveCompanions?.find(c => c.id === challengerId)?.name || '커스텀 동료';
                  
                  setCharacter(prev => {
                      const updateComp = (c: Companion) => {
                          if (c.id !== challengerId) return c;
                          if (trialTier === ClassTier.FIRST) {
                              return { ...c, hasClearedFirstTrial: true, firstTrialCleared: true };
                          } else if (trialTier === ClassTier.SECOND) {
                              return { ...c, hasClearedSecondTrial: true, secondTrialCleared: true };
                          } else if (trialTier === ClassTier.LAST) {
                              return { ...c, hasClearedLastTrial: true, lastTrialCleared: true };
                          } else {
                              return { ...c, hasClearedFinalTrial: true, finalTrialCleared: true };
                          }
                      };
                      return {
                          ...prev,
                          companions: prev.companions.map(updateComp),
                          inactiveCompanions: prev.inactiveCompanions ? prev.inactiveCompanions.map(updateComp) : prev.inactiveCompanions
                      };
                  });

                  addToLog(`[${tierName} 시련 통과] 커스텀 동료 [${compName}]이(가) 1:1 진검승부에서 승리했습니다! 이제 ${tierName} 해방 자격을 획득했습니다.`);
                  setTimeout(() => {
                      setResultModalData({
                          type: 'levelup',
                          title: `${tierName} 시련 극복! [${compName}]`,
                          message: `커스텀 동료 [${compName}] 대원이 플레이어의 지원 없이 홀로 1:1로 신의 사자 모형을 격파했습니다!\n이제 [${tierName} 잠재력 해방] 자격을 획득했습니다.`,
                          items: [
                              { label: '도전자', after: compName },
                              { label: `${tierName} 시련`, after: '통과 완료' },
                              { label: '해방 자격', after: '획득' }
                          ]
                      });
                  }, 300);
              } else {
                  // 플레이어의 시련 승리
                  setCharacter(prev => {
                      if (trialTier === ClassTier.FIRST) {
                          return { ...prev, hasClearedFirstTrial: true, firstTrialCleared: true };
                      } else if (trialTier === ClassTier.SECOND) {
                          return { ...prev, hasClearedSecondTrial: true, secondTrialCleared: true };
                      } else if (trialTier === ClassTier.LAST) {
                          return { ...prev, hasClearedLastTrial: true, lastTrialCleared: true };
                      } else {
                          return { ...prev, hasClearedFinalTrial: true, finalTrialCleared: true };
                      }
                  });

                  addToLog(`[${tierName} 시련 통과] 1:1 진검승부에서 승리하여 ${tierName} 시험을 완수했습니다! 이제 ${tierName} 해방 자격을 획득했습니다.`);
                  setTimeout(() => {
                      setResultModalData({
                          type: 'levelup',
                          title: `${tierName} 시련 극복!`,
                          message: `사투 끝에 1:1 진검승부에서 마침내 승리했습니다!\n자신의 영혼 한계를 증명하였으며, 이제 [${tierName}] 잠재력 해방 자격을 획득했습니다.`,
                          items: [
                              { label: `${tierName} 시련`, after: '통과 완료' },
                              { label: '클래스 해방', after: '자격 획득' }
                          ]
                      });
                  }, 300);
              }
          } else {
              const compName = challengerId ? ((character.companions || []).find(c => c.id === challengerId)?.name || '커스텀 동료') : '플레이어';
              addToLog(`[${tierName} 시련 실패] [${compName}]이(가) 1:1 대결에서 쓰러졌습니다... 전열을 가다듬고 다시 도전하세요.`);
          }
          // 처리 완료 후 전투 타입 초기화하여 중복 실행 방지
          setCombatState(prev => ({ ...prev, type: undefined }));
      }
  }, [sceneType, combatState.isEnded, combatState.type, character.hasClearedFinalTrial, character.hasClearedFirstTrial, character.hasClearedSecondTrial, character.hasClearedLastTrial]);
  const handleCompleteQuest = (questId: string) => {
      let foundQuest: Quest | null = null;
      let isMilitary = false;
      let isOracle = false;

      let nextMercenaryData = character.mercenaryData;
      if (nextMercenaryData?.activeQuests) {
          const idx = nextMercenaryData.activeQuests.findIndex(q => q.id === questId);
          if (idx !== -1) {
              foundQuest = nextMercenaryData.activeQuests[idx];
              nextMercenaryData = {
                  ...nextMercenaryData,
                  activeQuests: nextMercenaryData.activeQuests.filter((_, i) => i !== idx)
              };
          }
      }

      let nextMilitaryData = character.militaryData;
      if (!foundQuest && nextMilitaryData?.activeMissions) {
          const idx = nextMilitaryData.activeMissions.findIndex(q => q.id === questId);
          if (idx !== -1) {
              foundQuest = nextMilitaryData.activeMissions[idx];
              nextMilitaryData = {
                  ...nextMilitaryData,
                  activeMissions: nextMilitaryData.activeMissions.filter((_, i) => i !== idx)
              };
              isMilitary = true;
              if (foundQuest.type === 'DivineOracle') isOracle = true;
          }
      }

      if (!foundQuest) return;
      
      const quest = foundQuest;

      const newChar: Character = {
          ...character,
          mercenaryData: nextMercenaryData,
          militaryData: nextMilitaryData,
          trackedQuestIds: Array.isArray(character.trackedQuestIds)
              ? character.trackedQuestIds.filter(id => id !== questId)
              : character.trackedQuestIds
      };
      
      if (isOracle) {
          newChar.money += quest.rewardGold;
          newChar.currentExp += Math.floor(quest.rewardExp * 0.5); 
          newChar.faith = (newChar.faith || 0) + (quest.rewardFaith || 20);

          if (quest.templeKey && newChar.base?.templePersonnel?.[quest.templeKey]) {
              const tp = newChar.base.templePersonnel[quest.templeKey];
              const personnelIds = [tp.priestId, tp.subPriestId, ...(tp.knightIds || []), ...(tp.butlerIds || []), ...(tp.maidIds || [])].filter(Boolean) as string[];
              
              const expPerPerson = Math.floor(quest.rewardExp / (personnelIds.length || 1));
              const cityKey = quest.templeKey.split('_')[1];
              const requiredJob = TEMPLE_MESSENGER_MAP[cityKey];

              newChar.companions = newChar.companions.map(c => {
                  let added = 0;
                  if (personnelIds.includes(c.id)) added += expPerPerson;
                  if (requiredJob && newChar.job !== requiredJob && c.job === requiredJob) added += quest.rewardExp;
                  return added > 0 ? { ...c, currentExp: c.currentExp + added } : c;
              });

              if (newChar.inactiveCompanions) {
                  newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                      let added = 0;
                      if (personnelIds.includes(c.id)) added += expPerPerson;
                      if (requiredJob && newChar.job !== requiredJob && c.job === requiredJob) added += quest.rewardExp;
                      return added > 0 ? { ...c, currentExp: c.currentExp + added } : c;
                  });
              }
          }

          const logMsg = `[시스템] 신성 신탁 완료: ${quest.title} (보상: ${quest.rewardGold.toLocaleString()}G, 신앙심 +${quest.rewardFaith}, 성전 전체 경험치 분배 완료)`;
          handleUpdateCharacter(newChar, logMsg);
          // [FIX] setResultModalData -> setResultModalData
          setResultModalData({
              type: 'levelup',
              title: '신탁 완수',
              message: `'${quest.title}' 작전을 훌륭히 수행했습니다.\n신의 은총이 성전 전체에 내립니다.`,
              items: [
                  { label: '획득 골드', after: `${quest.rewardGold.toLocaleString()} G` },
                  { label: '신앙심 상승', after: `+${quest.rewardFaith}` },
                  { label: '성전원 경험치', after: `분배됨` }
              ]
          });
      } else {
          newChar.money += quest.rewardGold;
          newChar.currentExp += quest.rewardExp;
          
          let meritGain = 0;
          let repGain = 0;

          if (isMilitary) {
              meritGain = quest.rewardMerit || Math.floor(quest.rewardExp / 200);
              if (newChar.militaryData) {
                  newChar.militaryRank = newChar.militaryRank || MilitaryRank.PVT;
                  newChar.militaryData = {
                      ...newChar.militaryData,
                      merit: (newChar.militaryData.merit || 0) + meritGain,
                      completedMissions: (newChar.militaryData.completedMissions || 0) + 1
                  };
              }
          } else {
              const dangerMult = DANGER_REPUTATION_MULT[quest.danger] || 1;
              const rankScore = MERCENARY_RANK_SCORE[quest.rank as MercenaryRank] || 1;
              repGain = Math.floor(rankScore * 2.4 * dangerMult);
                            
              if (quest.rewardElfRep) {
                  newChar.elfReputation = Math.min(100, (newChar.elfReputation || 0) + quest.rewardElfRep);
              }
              if (quest.rewardBeastRep) {
                  newChar.beastReputation = Math.min(100, (newChar.beastReputation || 0) + quest.rewardBeastRep);
              }
              if (quest.rewardDemonRep) {
                  newChar.demonReputation = Math.min(100, (newChar.demonReputation || 0) + quest.rewardDemonRep);
              }

              // 일반 용병 명성치 및 완료한 퀘스트 수 항상 상승
              const currentMerc = newChar.mercenaryData || {
                  rank: MercenaryRank.F,
                  registeredDate: character.currentDate || START_DATE,
                  completedQuests: 0,
                  reputation: 0,
                  guildId: 'None',
                  isGroupLeader: false,
                  activeQuests: [],
                  availableQuests: []
              };
              newChar.mercenaryData = {
                  ...currentMerc,
                  reputation: (currentMerc.reputation || 0) + repGain,
                  completedQuests: (currentMerc.completedQuests || 0) + 1
              };

              // [NEW] 마인 계약 시 마정석 추가 획득 (마인 평판 반영)
              if (quest.type === 'DemonContract') {
                  const currentRep = newChar.demonReputation || 0;
                  const bonusCrystals = Math.floor(currentRep / 10) * 5; // 평판 10당 5개
                  const crystalGain = 10 + Math.max(0, bonusCrystals);
                  if (newChar.base) {
                      newChar.base = {
                          ...newChar.base,
                          resources: {
                              ...newChar.base.resources,
                              manaCrystal: newChar.base.resources.manaCrystal + crystalGain
                          }
                      };
                  }
              }
          }
       // [ADDED] 동료들에게도 보상 분배 (공훈 및 명성)
          const updateCompanionReward = (c: Companion) => {
              if (c.isDead) return c;
              if (isMilitary && c.job === JobType.SOLDIER) {
                  return { ...c, merit: (c.merit || 0) + meritGain, currentExp: (c.currentExp || 0) + quest.rewardExp };
              }
              if (!isMilitary) {
                  const compRepGain = (c.job === JobType.MERCENARY || c.job === JobType.SOLDIER) ? repGain : Math.floor(repGain * 0.5);
                  return { ...c, reputation: (c.reputation || 0) + compRepGain, currentExp: (c.currentExp || 0) + quest.rewardExp };
              }
              return c;
          };

          newChar.companions = newChar.companions.map(updateCompanionReward);
          
          let logMsg = `[시스템] ${isMilitary ? '군사 임무' : '용병 의뢰'} 완료: ${quest.title} (보상: ${quest.rewardGold.toLocaleString()}G, ${quest.rewardExp.toLocaleString()}EXP${isMilitary ? `, 공훈 +${meritGain}` : `, 명성 +${repGain}`} 수령)`;
          
          // [NEW] 국왕 의뢰 성공 시 호감도 증가
          if (quest.id.startsWith('king_')) {
              const idParts = quest.id.split('_');
              const questNation = idParts[1];
              if (questNation) {
                  newChar.nationalFavorability = {
                      ...(newChar.nationalFavorability || {}),
                      [questNation]: Math.min(1000, (newChar.nationalFavorability?.[questNation] || 0) + 20)
                  };
                  logMsg += `\n[국왕의 신임] ${questNation} 국왕과의 호감도가 상승했습니다! (+20)`;
              }
          }

          // 아이템 수집 퀘스트 완료 시 대상 아이템만 정확히 소모 (기존 일반/장비 아이템 보존)
          if ((quest.type === 'Collection' || quest.type === 'MilitarySupply') && quest.targetName) {
              let remaining = quest.targetAmount || 0;
              const nextInventory: Item[] = [];
              for (const item of newChar.inventory) {
                  if (item.name === quest.targetName && remaining > 0) {
                      const stock = item.stock !== undefined ? item.stock : 1;
                      const consume = Math.min(stock, remaining);
                      remaining -= consume;
                      const leftover = stock - consume;
                      if (leftover > 0) {
                          nextInventory.push(item.stock !== undefined ? { ...item, stock: leftover } : item);
                      }
                  } else {
                      nextInventory.push(item);
                  }
              }
              newChar.inventory = nextInventory;
          }

          // [NEW] 긴급 퀘스트 완료 시 민간인 구조 처리
          let emergencyMsg = '';
          if (quest.isEmergency && quest.civilianToRescue) {
              const civilian = quest.civilianToRescue;
              if (!newChar.socialNetwork) newChar.socialNetwork = [];
              newChar.socialNetwork.push(assignRandomCombatStyle(civilian, false));
              emergencyMsg = `\n[민간인 구조] ${civilian.nation}의 ${civilian.appearance}인 '${civilian.name}'을(를) 무사히 구출했습니다! 깊은 감사를 표하며 인연을 맺었습니다.`;
              logMsg += emergencyMsg;
          }

          handleUpdateCharacter(newChar, logMsg);
          
          // [FIX] setResultModalData -> setResultModalData
          setResultModalData({
              type: 'success',
              title: '임무 완료 보상',
              message: `'${quest.title}' 임무를 성공적으로 완수했습니다!${emergencyMsg}`,
              items: [
                  { label: '획득 골드', after: `+${quest.rewardGold.toLocaleString()} G` },
                  { label: '획득 경험치', after: `+${quest.rewardExp.toLocaleString()} EXP` },
                  ...(isMilitary ? [{ label: '공훈치 획득', after: `+${meritGain} Merit` }] : [{ label: '명성치 획득', after: `+${repGain} RP` }])
              ]
          });
      }
  };

  const handleAbandonQuest = (questId: string) => {
      const newChar = { ...character };
      let abandoned = false;

      if (Array.isArray(newChar.mercenaryData?.activeQuests)) {
          const filtered = newChar.mercenaryData.activeQuests.filter(q => q && q.id !== questId);
          if (filtered.length !== newChar.mercenaryData.activeQuests.length) {
              newChar.mercenaryData.activeQuests = filtered;
              abandoned = true;
          }
      }
      
      if (!abandoned && Array.isArray(newChar.militaryData?.activeMissions)) {
           const filtered = newChar.militaryData.activeMissions.filter(q => q && q.id !== questId);
           if (filtered.length !== newChar.militaryData.activeMissions.length) {
               newChar.militaryData.activeMissions = filtered;
               abandoned = true;
           }
      }

      if (abandoned) {
          // 추적 목록에서도 제거
          if (Array.isArray(newChar.trackedQuestIds)) {
              newChar.trackedQuestIds = newChar.trackedQuestIds.filter(id => id !== questId);
          }
          
          handleUpdateCharacter(newChar, `[시스템] 수행 중인 의뢰를 포기했습니다.`);
          // [FIX] setResultModalData -> setResultModalData
          setResultModalData({
              type: 'info',
              title: '의뢰 포기 완료',
              message: `수행 중이던 의뢰/명령을 포기했습니다.`,
              items: [{ label: '상태', after: '삭제됨' }]
          });
      }
  };

  const handleToggleTrack = (questId: string) => {
    const currentTracked = character.trackedQuestIds || [];
    const isTracked = currentTracked.includes(questId);
    
    let newTracked: string[];
    if (isTracked) {
      newTracked = currentTracked.filter(id => id !== questId);
      addToLog(`[시스템] 퀘스트 추적을 해제했습니다.`);
    } else {
      newTracked = [...currentTracked, questId];
      addToLog(`[시스템] 퀘스트를 추적 목록에 추가했습니다.`);
    }
    
    setCharacter({
      ...character,
      trackedQuestIds: newTracked
    });
  };

  const handleCustomCharacterSubmit = (formData: any) => {
      let startLoc: Location = formData.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };
      if (!formData.currentLocation) {
          for (const [region, nations] of Object.entries(WORLD_GEOGRAPHY)) {
              if (nations[formData.nation]) {
                  startLoc = {
                      region: region,
                      nation: formData.nation,
                      city: nations[formData.nation].capital
                  };
                  break;
              }
          }
      }
      const enrichedData = { ...formData, currentLocation: startLoc };
      originalHandleCharacterSubmit(enrichedData);
      setIsTutorialGuideOpen(true);
  };

 const handleTravel = (destination: Location, cost: number, days: number, totalMinutes?: number) => {
      if (mapMode === "relocate") {
          handleRelocateBase(destination, totalMinutes);
          return;
      }

      const travelCalc = calculateTravelCostAndDays(character.currentLocation, destination, character);
      const minutesToAdvance = travelCalc.totalMinutes > 0 ? travelCalc.totalMinutes : Math.max(1, (days || 1) * 1440);
      const actualDays = Math.floor(minutesToAdvance / 1440);

      if (actualDays < 1) {
          // 당일 이동 (시간/분 단위 이동): 즉각 완료 및 시간 전진
          setIsMapOpen(false);
          const timeResult = advanceGameTime(character, minutesToAdvance, {
              activityName: destination.city + " 이동"
          });
          if (timeResult.dailyReport) setDailyReport(timeResult.dailyReport);
          if (timeResult.toastNotice) triggerDayChangeToast(timeResult.toastNotice);
          if (timeResult.worldNews && timeResult.worldNews.length > 0) {
              setWorldNewsList(timeResult.worldNews);
          }
          if (timeResult.systemLogs && timeResult.systemLogs.length > 0) {
              timeResult.systemLogs.forEach(l => addToLog(l));
          }
          const newChar = { ...timeResult.updatedCharacter };
          newChar.money -= cost;
          newChar.currentLocation = destination;

          // 호위 퀘스트 완료 체크
          const allQuests = [...(newChar.mercenaryData?.activeQuests || []), ...(newChar.militaryData?.activeMissions || [])];
          const startedEscort = allQuests.find(q => (q.type === "EscortKing" || q.type === "EscortNoble" || q.type === "MercenaryEscort" || q.type === "MilitaryEscort" || q.type === "MilitaryDiplomaticEscort") && q.isEscortStarted && q.destination && q.destination.city === destination.city);
          
          let questCompletedMessage = "";
          if (startedEscort) {
              if (Array.isArray(newChar.mercenaryData?.activeQuests)) {
                  newChar.mercenaryData.activeQuests = newChar.mercenaryData.activeQuests.filter(q => q && q.id !== startedEscort.id);
                  newChar.mercenaryData.completedQuests = (newChar.mercenaryData.completedQuests || 0) + 1;
                  newChar.mercenaryData.reputation = (newChar.mercenaryData.reputation || 0) + 23;
              }
              if (Array.isArray(newChar.militaryData?.activeMissions)) {
                  newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.filter(q => q && q.id !== startedEscort.id);
                  if (startedEscort.rewardMerit) {
                      newChar.militaryData.merit = (newChar.militaryData.merit || 0) + startedEscort.rewardMerit;
                  }
              }
              newChar.money += (startedEscort.rewardGold || 0);
              if (startedEscort.rewardExp) {
                  newChar.currentExp = (newChar.currentExp || 0) + startedEscort.rewardExp;
              }
              const thankYouMessage = startedEscort.type === "EscortKing" 
                  ? "\n국왕: '수고했다. 그대의 호위 덕분에 무사히 도착할 수 있었다. 여기 약속된 보상을 받도록.'"
                  : startedEscort.type === "EscortNoble"
                  ? "\n귀족: '정말 고맙네. 자네의 뛰어난 무력 덕분에 무사히 도착했군. 여기 약속한 보상일세.'"
                  : startedEscort.type === "MercenaryEscort"
                  ? "\n의뢰인/상단주: '무사히 도착했군요! 생명을 걸고 지켜주셔서 고맙습니다. 약속한 보상입니다.'"
                  : startedEscort.type === "MilitaryDiplomaticEscort"
                  ? "\n외교 사절단장: '무사히 목적지에 도달했습니다. 훌륭한 호위 덕분에 국가 간 회담을 성공적으로 시작할 수 있게 되었습니다. 군 본부에 보고하여 공훈을 올리겠습니다.'"
                  : "\n군 지휘관: '목적지 도착 완료! 대열과 물류를 완벽히 지켜내었군. 수고 많았다!'";
              questCompletedMessage = "\n[퀘스트 완료] " + startedEscort.title + "을(를) 성공적으로 완수했습니다!\n보상: " + (startedEscort.rewardGold || 0).toLocaleString() + "G, EXP +" + (startedEscort.rewardExp || 0).toLocaleString() + thankYouMessage;
              addToLog(questCompletedMessage);
          }

          setCharacter(newChar);
          if (timeResult.logMessage) addToLog(timeResult.logMessage);
          if (timeResult.toastNotice) triggerDayChangeToast(timeResult.toastNotice);
          addToLog("[시스템] " + destination.city + "에 도착했습니다. (여정 소요: " + travelCalc.durationText + ", 비용: " + cost.toLocaleString() + "G)");

          setResultModalData({
              type: "info",
              title: "이동 완료",
              message: destination.city + "에 무사히 도착했습니다." + questCompletedMessage,
              items: [
                  { label: "도착지", after: destination.nation + ", " + destination.city },
                  { label: "소요 시간", after: travelCalc.durationText },
                  { label: "현재 일시", after: (newChar.currentDate || "2000-03-02") + " " + (newChar.currentTime || "08:00") },
                  { label: "비용", after: cost.toLocaleString() + "G" }
              ]
          });
          return;
      }

      setIsLoading(true);
      setLoadingMessage("목적지(" + destination.city + ")로 이동하고 있습니다... (" + travelCalc.durationText + " 소요)");
      setIsMapOpen(false);

      let currentStep = 0;
      const progressDays = Math.max(1, actualDays);
      const intervalDelay = Math.max(25, Math.min(150, 750 / progressDays));

      const timer = setInterval(() => {
          currentStep++;
          if (currentStep <= progressDays) {
              setLoadingMessage("목적지(" + destination.city + ")로 이동하고 있습니다... (" + currentStep + " / " + progressDays + "일 계산 중)");
          }

          if (currentStep >= progressDays) {
              clearInterval(timer);

              setTimeout(() => {
                  const timeResult = advanceGameTime(character, minutesToAdvance, {
                      activityName: destination.city + " 장거리 이동"
                  });
                  if (timeResult.dailyReport) setDailyReport(timeResult.dailyReport);
                  if (timeResult.toastNotice) triggerDayChangeToast(timeResult.toastNotice);
                  if (timeResult.worldNews && timeResult.worldNews.length > 0) {
                      setWorldNewsList(timeResult.worldNews);
                  }
                  if (timeResult.systemLogs && timeResult.systemLogs.length > 0) {
                      timeResult.systemLogs.forEach(l => addToLog(l));
                  }
                  const newChar = { ...timeResult.updatedCharacter };
                  newChar.money -= cost;
                  newChar.currentLocation = destination;

                  let travelAmbushOccurred = false;
                  // 1. 호위 퀘스트 중 기습 발생 확률 체크
                  const allActiveQuests = [...(newChar.mercenaryData?.activeQuests || []), ...(newChar.militaryData?.activeMissions || [])];
                  const activeEscort = allActiveQuests.find(q => (q.type === "EscortKing" || q.type === "EscortNoble" || q.type === "MercenaryEscort" || q.type === "MilitaryEscort" || q.type === "MilitaryDiplomaticEscort") && q.isEscortStarted);
                  if (activeEscort && Math.random() < 0.35) {
                      travelAmbushOccurred = true;
                      const ambushData = generateEscortAmbushEnemies(activeEscort, newChar);
                      
                      // timeEngine에서 발생한 인연/용병 습격이 있다면 큐로 이전하여 둘 다 순차 발생 보장
                      if (newChar.pendingAmbush) {
                          if (!newChar.queuedAmbushes) newChar.queuedAmbushes = [];
                          newChar.queuedAmbushes.push(newChar.pendingAmbush);
                          newChar.queuedAmbush = newChar.queuedAmbushes[0];
                          delete newChar.pendingAmbush;
                          addToLog(`[연속 위기] 호위 대상 습격과 함께 결투/인연의 추격이 동시에 포착되었습니다!`);
                      }

                      handleBattleTrigger(ambushData.enemies, 'normal', activeEscort.id);
                      setResultModalData({
                          type: 'warning',
                          title: ambushData.title,
                          message: ambushData.message,
                          items: [{ label: '적 세력', after: ambushData.enemyGroupLabel }]
                      });
                  }

                  // [NEW] 2. 일반 여정 중 야생 몬스터 습격 이벤트 (다양한 레벨 대역 몬스터 출현, 최대 레벨 300)
                  if (days > 0) {
                      const ambushChance = Math.min(0.60, 0.20 + (days * 0.05));
                      if (Math.random() < ambushChance) {
                          const ambushResult = generateTravelMonsterAmbush(newChar, destination, days);
                          addToLog(ambushResult.logMessage);

                          if (travelAmbushOccurred || (newChar.pendingBaseAttackEvent || newChar.queuedBaseAttackEvent)) {
                              // 이미 호위 습격 등이 발생한 상태라면 몬스터 습격을 큐에 등록하여 순차 발생
                              if (!newChar.queuedAmbushes) newChar.queuedAmbushes = [];
                              newChar.queuedAmbushes.push({
                                  enemies: ambushResult.enemies,
                                  sourceId: 'travel_monster_ambush',
                                  title: ambushResult.title,
                                  message: ambushResult.description
                              });
                              newChar.queuedAmbush = newChar.queuedAmbushes[0];
                          } else {
                              travelAmbushOccurred = true;
                              // timeEngine에서 발생한 인연/용병 습격이 이미 있다면 큐에 보관하여 몬스터 전투 후 연속 발생
                              if (newChar.pendingAmbush) {
                                  if (!newChar.queuedAmbushes) newChar.queuedAmbushes = [];
                                  newChar.queuedAmbushes.push(newChar.pendingAmbush);
                                  newChar.queuedAmbush = newChar.queuedAmbushes[0];
                                  delete newChar.pendingAmbush;
                                  addToLog(`[연속 조우] 야생 몬스터의 습격과 함께 결투/인연의 추격이 동시에 발생했습니다!`);
                              }

                              handleBattleTrigger(ambushResult.enemies, 'normal', 'travel_monster_ambush');

                              setResultModalData({
                                  type: 'warning',
                                  title: ambushResult.title,
                                  message: ambushResult.description,
                                  items: [
                                      { label: '여정 경로', after: `${ambushResult.originCity} ➔ ${ambushResult.destinationCity}` },
                                      { label: '출현 필드', after: `${ambushResult.bandName} (Lv.${ambushResult.minLvl} ~ Lv.${ambushResult.maxLvl})` },
                                      { label: '출현 몬스터', after: ambushResult.enemies.map(e => `Lv.${e.level} ${e.name}`).join(', ') },
                                      { label: '시간 경과', after: `${days}일` }
                                  ]
                              });
                          }
                      }
                  }

                  // [NEW] 호위 퀘스트 완료 체크
                  const allQuests = [...(newChar.mercenaryData?.activeQuests || []), ...(newChar.militaryData?.activeMissions || [])];
                  const startedEscort = allQuests.find(q => (q.type === 'EscortKing' || q.type === 'EscortNoble' || q.type === 'MercenaryEscort' || q.type === 'MilitaryEscort' || q.type === 'MilitaryDiplomaticEscort') && q.isEscortStarted && q.destination && q.destination.city === destination.city);
                  
                  let questCompletedMessage = "";
                  if (startedEscort) {
                      // 퀘스트 완료 처리
                      if (Array.isArray(newChar.mercenaryData?.activeQuests)) {
                          newChar.mercenaryData.activeQuests = newChar.mercenaryData.activeQuests.filter(q => q && q.id !== startedEscort.id);
                          newChar.mercenaryData.completedQuests = (newChar.mercenaryData.completedQuests || 0) + 1;
                          newChar.mercenaryData.reputation = (newChar.mercenaryData.reputation || 0) + 23;
                      }
                      if (Array.isArray(newChar.militaryData?.activeMissions)) {
                          newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.filter(q => q && q.id !== startedEscort.id);
                          if (startedEscort.rewardMerit) {
                              newChar.militaryData.merit = (newChar.militaryData.merit || 0) + startedEscort.rewardMerit;
                          }
                      }
                      newChar.money += (startedEscort.rewardGold || 0);
                      if (startedEscort.rewardExp) {
                          newChar.currentExp = (newChar.currentExp || 0) + startedEscort.rewardExp;
                      }

                      const thankYouMessage = startedEscort.type === 'EscortKing' 
                          ? "\n국왕: '수고했다. 그대의 호위 덕분에 무사히 도착할 수 있었다. 여기 약속된 보상을 받도록.'"
                          : startedEscort.type === 'EscortNoble'
                          ? "\n귀족: '정말 고맙네. 자네의 뛰어난 무력 덕분에 무사히 도착했군. 여기 약속한 보상일세.'"
                          : startedEscort.type === 'MercenaryEscort'
                          ? "\n의뢰인/상단주: '무사히 도착했군요! 생명을 걸고 지켜주셔서 고맙습니다. 약속한 보상입니다.'"
                          : startedEscort.type === 'MilitaryDiplomaticEscort'
                          ? "\n외교 사절단장: '무사히 목적지에 도달했습니다. 훌륭한 호위 덕분에 국가 간 회담을 성공적으로 시작할 수 있게 되었습니다. 군 본부에 보고하여 공훈을 올리겠습니다.'"
                          : "\n군 지휘관: '목적지 도착 완료! 대열과 물류를 완벽히 지켜내었군. 수고 많았다!'";

                      questCompletedMessage = `\n[퀘스트 완료] ${startedEscort.title}을(를) 성공적으로 완수했습니다!\n보상: ${(startedEscort.rewardGold || 0).toLocaleString()}G, EXP +${(startedEscort.rewardExp || 0).toLocaleString()}${thankYouMessage}`;
                      addToLog(questCompletedMessage);
                  }

                  setCharacter(newChar);
                  if (timeResult.logMessage) addToLog(timeResult.logMessage);
                  addToLog(`[시스템] ${destination.city}에 도착했습니다. (여정 소요: ${travelCalc.durationText}, 비용: ${cost.toLocaleString()}골드)`);
                  
                  // 기습이 발생하지 않았을 때만 이동 완료 모달을 띄움
                  if (!travelAmbushOccurred && !newChar.pendingAmbush) {
                      setResultModalData({
                          type: 'info',
                          title: '이동 완료',
                          message: `${destination.city}에 무사히 도착했습니다.${questCompletedMessage}`,
                          items: [
                              { label: '도착지', after: `${destination.nation}, ${destination.city}` },
                              { label: '소요 시간', after: travelCalc.durationText },
                              { label: '현재 일시', after: `${newChar.currentDate || '2000-03-02'} ${newChar.currentTime || '08:00'}` },
                              { label: '비용', after: `${cost.toLocaleString()}골드` }
                          ]
                      });
                  }
                  setIsLoading(false);
              }, 550);
          }
      }, intervalDelay);
  };

  const handleRelocateBase = (destination: Location, explicitMinutes?: number) => {
      const plan = calculateBaseRelocationPlan(character, destination, explicitMinutes);
      if (!plan.canAfford) {
          setResultModalData({
              type: 'warning',
              title: '이사 자원 부족',
              message: '기지 이사에 필요한 자원이 부족합니다.',
              items: plan.missingResources.map(m => ({ label: '부족', after: m }))
          });
          return;
      }
      setResultModalData({
          type: 'warning',
          title: '기지 이사 확인',
          message: `${destination.nation} ${destination.city}(으)로 기지를 옮기시겠습니까?\n이동에는 ${plan.durationText}이 소요되며 다음 자원이 소모됩니다.`,
          items: [
              { label: '소요 시간', after: plan.durationText },
              { label: '필요 골드', after: `${plan.costs.gold.toLocaleString()}G` },
              { label: '필요 목재', after: `${plan.costs.wood}개` },
              { label: '필요 석재', after: `${plan.costs.stone}개` },
              { label: '필요 식량', after: `${plan.costs.food}개` }
          ]
      });
      setResultActionContext({
          type: 'relocate_confirm',
          args: [destination, plan.totalMinutes, plan.costs]
      });
  };

  const handleOpenBase = () => {
      if (sceneType === 'combat') {
          alert("전투 중에는 기지에 진입할 수 없습니다.");
          return;
      }
      if (!character.base) { setIsBaseModalOpen(true); return; }
      const baseLoc = character.base.location;
      if (baseLoc) {
          if (character.currentLocation?.city !== baseLoc.city || character.currentLocation?.nation !== baseLoc.nation) {
              setResultModalData({ type: 'warning', title: '기지 진입 불가', message: `기지는 현재 '${baseLoc.city}'에 위치해 있습니다.\n현재 위치: ${character.currentLocation?.city}`, items: [{ label: '위치', before: character.currentLocation?.city, after: baseLoc.city }] });
              return;
          }
      }
      setIsBaseModalOpen(true);
  };

  const handleBattleTrigger = (enemy: Enemy | Enemy[], combatType: CombatState['type'] = 'normal', defenseSource?: string, targetCity?: string, targetNation?: string, rebelRankIdx?: number) => {
      const enemies = Array.isArray(enemy) ? enemy : [enemy];
       // [BESTIARY FIX] Register encounter on battle start
      setCharacter(prev => {
          const next = { ...prev };
          if (!next.bestiary) next.bestiary = {};
          const newBestiary = { ...next.bestiary };
          let changed = false;

          enemies.forEach(e => {
            // [MODIFIED] 공식 마물인 경우에만 도감 기록 시도
              if (isOfficialMonster(e.name)) {
              const cleanName = e.name.replace(/\[.*?\]/g, '').replace(/\s+[A-Z]$/, '').trim();
              if (!newBestiary[cleanName]) {
                  newBestiary[cleanName] = { encountered: true, defeatedCount: 0 };
                  changed = true;
              } else if (!newBestiary[cleanName].encountered) {
                  newBestiary[cleanName] = { ...newBestiary[cleanName], encountered: true };
                  changed = true;
             }
              }
          });

          if (changed) {
              next.bestiary = newBestiary;
              return next;
          }
          return prev;
      });
      let finalType = combatType;
      // [FIX] 전술적 목표(defenseSource/targetNation)가 인자로 들어온 경우, 물리적 위치보다 이를 우선적으로 사용
         let finalSource = defenseSource || targetNation;

      // 1. 신성 정벌(divine_invasion) 감지 시 로컬 스냅샷 강제 적용
      
          if (enemies.some(e => e.name?.includes('[반역]'))) {
          if (finalType === 'normal' || !finalType) finalType = 'god_rebellion';}
          
          if (enemies.some(e => e.name?.includes('[성전 사자]'))) {
          if (finalType === 'normal' || !finalType) finalType = 'temple_invasion';
            if (!finalSource) {
              const messengerName = enemies.find(e => e.name?.includes('[성전 사자]'))?.name || "";
              // "[성전 사자] 엘클" 형태에서 이름만 추출하거나, 전달받은 도시명이 있다면 사용
              finalSource = targetCity || messengerName.replace('[성전 사자] ', '').trim();
          }
          }
      if (enemies.some(e => e.name?.includes('[국가 지도자]'))) {
          if (finalType === 'normal' || !finalType) finalType = 'divine_invasion';

          // 인자로 받은 국가가 있다면 로컬 위치 정보를 즉시 동기화 (AI 응답 대기 없이)
          if (targetNation) {
              finalSource = targetNation;
              let targetRegion = "아시아";
              let targetCap = targetCity || "";
              
              for (const r in WORLD_GEOGRAPHY) {
                  if (WORLD_GEOGRAPHY[r][targetNation]) {
                      targetRegion = r;
                      if (!targetCap) targetCap = WORLD_GEOGRAPHY[r][targetNation].capital;
                      break;
                  }
              }

              // [CRITICAL] 리액트 상태를 즉시 업데이트하여 엔진이 혼동하지 않게 함
              setCharacter(prev => ({
                  ...prev,
                  currentLocation: { region: targetRegion, nation: targetNation, city: targetCap }
              }));
          }
      }


      // 2. 인연 전투(relation_battle) 및 영원의 라이벌 결투 자동 감지
      if (finalType === 'eternal_rival_duel' || enemies.some(e => e.name?.includes('[영원의 라이벌]'))) {
          finalType = 'eternal_rival_duel';
      } else if (finalType === 'normal' && enemies.length === 1 && !enemies[0].name.includes('[') && !enemies[0].name.includes(']')) {
          const enemyName = enemies[0].name;
          const isKnownBond = character.schoolData?.classmates?.some(s => s.name === enemyName) || 
                             character.clubData?.clubMembers?.some(m => m.name === enemyName);
          if (isKnownBond) {
              finalType = 'relation_battle';
              if (!finalSource) {
                  const bond = character.schoolData?.classmates?.find(s => s.name === enemyName) || 
                               character.clubData?.clubMembers?.find(m => m.name === enemyName);
                  finalSource = bond?.id;
              }
          }
      }

      const newCombatState: CombatState = { 
          enemies: enemies, 
          turn: 1, 
          log: [`[전투 시작] 강력한 적들과 조우했습니다!`], 
          isEnded: false, 
          type: finalType,
          rewards: enemies.some(e => e.name && e.name.includes('[BOSS]')) ? { exp: 50000, gold: 100000 } : undefined,
           rebelRankIdx: rebelRankIdx
      };
      
      if (finalType === 'temple_defense') {
          (newCombatState as any).defenseSource = finalSource;
          (newCombatState as any).targetCity = targetCity;
          (newCombatState as any).targetNation = targetNation;
      }
      
      // [NEW] 마계 반란 시 타겟 도시 명시적 저장
      if (finalType === 'magye_revolt' && targetCity) {
          (newCombatState as any).targetCity = targetCity;
      }
         if (finalType === 'magye_divine_war' && targetCity) {
          (newCombatState as any).targetCity = targetCity;
      }
      if (finalSource) {
          (newCombatState as any).sourceId = finalSource;
      }
      if (finalType === 'final_trial_battle') {
          newCombatState.isOneOnOne = true;
          const trialTier: ClassTier = (enemy as any).trialTier || ClassTier.FINAL;
          newCombatState.trialTier = trialTier;
          const tierName = trialTier === ClassTier.FIRST ? "퍼스트 클래스 시련" :
                           trialTier === ClassTier.SECOND ? "세컨드 클래스 시련" :
                           trialTier === ClassTier.LAST ? "라스트 클래스 시련" : "최후의 시련";

          if (finalSource && finalSource !== '최후의 시련' && finalSource !== 'player') {
              const comp = character.companions.find(c => c.id === finalSource) ||
                           (character.inactiveCompanions ? character.inactiveCompanions.find(c => c.id === finalSource) : null);
              if (comp) {
                  newCombatState.challengerCompanionId = comp.id;
                  newCombatState.log = [`[${tierName}] 커스텀 동료 [${comp.name}]의 1:1 해방 결투가 시작되었습니다! 플레이어와 다른 동료는 개입할 수 없습니다.`];
              } else {
                  newCombatState.log = [`[${tierName}] 1:1 해방 결투가 시작되었습니다! 동료는 이 신성한 시험에 개입할 수 없습니다.`];
              }
          } else {
              newCombatState.log = [`[${tierName}] 플레이어의 1:1 해방 결투가 시작되었습니다! 동료는 이 신성한 시험에 개입할 수 없습니다.`];
          }
      }

      if (finalType === 'sparring_arena') {
          newCombatState.isOneOnOne = true;
          const partnerName = enemies[0]?.name ? enemies[0].name.replace('[모의 대련] ', '') : '대련 상대';
          newCombatState.log = [`[모의 대련] ${character.name}와(과) ${partnerName}의 실전 1:1 모의 대련이 시작되었습니다! 플레이어와 동료 1인의 단독 대결입니다.`];
      }

      if (finalType === 'eternal_rival_duel' || enemies.some(e => e.name?.includes('영원의 라이벌') || e.name?.includes('[영원의 라이벌]'))) {
          newCombatState.isOneOnOne = false;
      }

      setCombatState(newCombatState);
      setSceneType('combat');
      setIsCityOpen(false); 
      setIsTempleManagementOpen(false);
      setIsSocialOpen(false);
      setIsBaseModalOpen(false);
      if (finalType !== 'dungeon') {
          setIsDungeonOpen(false);
      } else {
          setIsDungeonOpen(true);
          addToLog(`[전투 돌입] 던전의 어둠 속에서 몬스터와 조우했습니다! (Type: Dungeon Battle)`);
      }
  };

  const handleUpdateCharacter = (newChar: Character, logMsg?: string | string[], dailyReport?: any) => {
      let leveledChar = processImmediateLevelUp(newChar, (modalData) => {
          setResultModalData(modalData);
      });

      // 호감도 보정 및 이탈 검사 (이상치 감지 시에만 수행하여 매 걸음/시간 갱신 시 CPU 렉 방지)
      const needsSanitization = Boolean(
          (leveledChar.companions && leveledChar.companions.some(c => c && (c.affection !== undefined && (c.affection > 100 || c.affection < 0 || ((c.affection || 0) + (c.loyalty || 0)) <= -100)))) ||
          (leveledChar.inactiveCompanions && leveledChar.inactiveCompanions.some(c => c && (c.affection !== undefined && (c.affection > 100 || c.affection < 0 || ((c.affection || 0) + (c.loyalty || 0)) <= -100)))) ||
          (leveledChar.socialNetwork && leveledChar.socialNetwork.some(n => n && (n.affection !== undefined && (n.affection > 100 || n.affection < -100))))
      );

      const departureLogs: string[] = [];
      const departedIds = new Set<string>();
      const departedCompanions: Companion[] = [];

      if (needsSanitization) {
          if (leveledChar.companions) {
              leveledChar.companions = leveledChar.companions.map(c => ({
                  ...c,
                  affection: Math.min(100, Math.max(-100, c.affection ?? 0))
              }));
          }
          if (leveledChar.inactiveCompanions) {
              leveledChar.inactiveCompanions = leveledChar.inactiveCompanions.map(c => ({
                  ...c,
                  affection: Math.min(100, Math.max(-100, c.affection ?? 0))
              }));
          }
          if (leveledChar.socialNetwork) {
              leveledChar.socialNetwork = leveledChar.socialNetwork.map(n => ({
                  ...n,
                  affection: Math.min(100, Math.max(-100, n.affection ?? 0))
              }));
          }

          const filterDeparting = (list: Companion[] | undefined) => {
              if (!list) return [];
              return list.filter(c => {
                  if ((c.affection !== undefined && c.affection < 0) || ((c.affection || 0) + (c.loyalty || 0)) <= -100) {
                      departureLogs.push(`[시스템] ${c.name}의 호감도가 0 미만으로 떨어져 파티를 떠났으며, 과거의 인연으로 등록되었습니다.`);
                      departedIds.add(c.id);
                      departedCompanions.push(c);
                      return false;
                  }
                  return true;
              });
          };

          leveledChar = {
              ...leveledChar,
              companions: filterDeparting(leveledChar.companions),
              inactiveCompanions: filterDeparting(leveledChar.inactiveCompanions)
          };
      }

      if (departedCompanions.length > 0) {
          if (!leveledChar.socialNetwork) leveledChar.socialNetwork = [];
          const currentYear = getYear(leveledChar.currentDate || '2000-01-01');
          departedCompanions.forEach(c => {
              const socialEntry: any = {
                  ...c,
                  origin: c.job || 'Companion',
                  originName: '과거의 인연 (호감도 하락)',
                  isPastConnection: true,
                  isPurged: false,
                  affection: Math.max(-100, Math.min(100, c.affection ?? -1)),
              };
              if (socialEntry.birthYear) {
                  socialEntry.age = `${currentYear - socialEntry.birthYear}세`;
              }
              const existingIdx = leveledChar.socialNetwork!.findIndex(n => n.id === c.id);
              if (existingIdx !== -1) {
                  leveledChar.socialNetwork![existingIdx] = {
                      ...leveledChar.socialNetwork![existingIdx],
                      ...socialEntry,
                  };
              } else {
                  leveledChar.socialNetwork!.push(socialEntry);
              }
          });

          if (leveledChar.base) {
              const newBase = { ...leveledChar.base };
              if (newBase.dispatched) {
                  newBase.dispatched = newBase.dispatched.filter(d => !departedIds.has(d.companionId));
              }
              if (newBase.assignments) {
                  const newAssignments = { ...newBase.assignments };
                  for (const key in newAssignments) {
                      if (departedIds.has(newAssignments[key])) {
                          delete newAssignments[key];
                      }
                  }
                  newBase.assignments = newAssignments;
              }
              if (newBase.multiAssignments) {
                  const newMulti = { ...newBase.multiAssignments };
                  for (const key in newMulti) {
                      newMulti[key] = newMulti[key].filter(id => !departedIds.has(id));
                  }
                  newBase.multiAssignments = newMulti;
              }
              if (newBase.houseAssignments) {
                  const newHouse = { ...newBase.houseAssignments };
                  for (const key in newHouse) {
                      if (departedIds.has(key)) {
                          delete newHouse[key];
                      }
                  }
                  newBase.houseAssignments = newHouse;
              }
              leveledChar.base = newBase;
          }
          if (Array.isArray(leveledChar.bondSkills)) {
              leveledChar.bondSkills = leveledChar.bondSkills.filter(
                  s => s && !departedIds.has(s.sourceId || '') && !departedIds.has(s.companionId || '')
              );
          }

          setResultModalData({
              type: 'warning',
              title: '동료 이탈 (과거의 인연 등록)',
              message: `${departedCompanions.map(c => c.name).join(', ')}의 호감도가 0 미만으로 떨어져 파티를 떠났습니다.\n인물 관계망의 '과거의 인연'으로 등록되었습니다.`,
              items: departedCompanions.map(c => ({
                  label: c.name,
                  after: `호감도 ${c.affection ?? 0} (이탈)`
              }))
          });
      }

      setCharacter(leveledChar);
      if (dailyReport) {
          setDailyReport(dailyReport);
      }
      if (logMsg) {
          if (Array.isArray(logMsg)) {
              logMsg.forEach(l => { if (l) addToLog(l); });
          } else {
              addToLog(logMsg);
          }
      }
      departureLogs.forEach(log => addToLog(log));
  };

  const findCompanionRef = (char: Character, id: string): Companion | null => {
    const direct = char.companions.find(c => c.id === id);
    if (direct) return direct;
    if (char.mountedMonster?.id === id) return char.mountedMonster;
    for (const c of char.companions) {
      if (c.mountedMonster?.id === id) return c.mountedMonster;
    }
    return null;
  };

  const handleSelectCompanion = (id: string | null) => {
    if (id === null) {
      setSelectedCompanionIndex(null);
      setSelectedCompanionId(null);
      return;
    }
    const index = character.companions.findIndex(c => c.id === id);
    if (index !== -1) {
      setSelectedCompanionIndex(index);
      setSelectedCompanionId(id);
    }
  };

  const handleSelectMountedMonster = (id: string) => {
    setSelectedCompanionIndex(null);
    setSelectedCompanionId(id);
  };

  const handleCompanionEquip = (itemIndex: number) => {
      if (!selectedCompanionId) return;
      const item = character.inventory[itemIndex]; if (!item) return;
      const updatedChar = { ...character }; 
      const comp = findCompanionRef(updatedChar, selectedCompanionId);
      if (!comp) return;

      const isMythicItem = item.rarity === ItemRarity.MYTHTIC || (item as any).isMythic || String(item.rarity || '').includes('신화');
      if (isMythicItem) {
          const isLevelMet = (comp.level || 1) >= 1000;
          const isPotentialLocked = Boolean((comp as any).isPotentialLocked);
          const isFinalMet = comp.classTier === ClassTier.FINAL || comp.hasClearedFinalTrial || comp.finalTrialCleared;
          if (!isLevelMet || (!isFinalMet && !isPotentialLocked)) {
              setResultModalData({
                  type: 'warning',
                  title: '신화 장비 착용 불가',
                  message: `${comp.name} 대원은 아직 신화 장비를 다룰 수 없습니다. 레벨 1000 이상이면서 파이널 클래스를 해방했거나, 잠재력 제한을 설정해야 합니다.`,
                  items: [
                      { label: '요구 레벨', after: `1000 이상 (현재 레벨 ${comp.level || 1})` },
                      { label: '요구 자격', after: isPotentialLocked ? '잠재력 제한 완료 (착용 가능)' : `파이널 클래스 해방 또는 잠재력 제한 (현재 ${comp.classTier || '미개방'})` }
                  ]
              });
              return;
          }
      }

      const masteryCheck = checkWeaponMasteryEquipRequirement(item, comp);
      if (!masteryCheck.allowed) {
          setResultModalData({
              type: 'warning',
              title: '무기 숙련도 부족',
              message: `${comp.name} 대원의 [${masteryCheck.weaponTypeLabel || '해당 무기'}] 숙련도가 부족하여 장착할 수 없습니다. (전설 무기: 숙련도 50 이상 / 신화 무기: 숙련도 100 이상 필요)`,
              items: [
                  { label: '무기 종류', after: masteryCheck.weaponTypeLabel || '무기' },
                  { label: '요구 숙련도', after: `Lv.${masteryCheck.required} 이상 (현재 Lv.${masteryCheck.current})` }
              ]
          });
          return;
      }

      const newInventory = [...updatedChar.inventory];
      const newEquipment = { ...comp.equipment };
      
      let slotKey: keyof typeof newEquipment | null = null;
      const t = item.type ? item.type.toLowerCase() : "";
      if (t.includes('sub') || t.includes('보조') || t.includes('방패')) slotKey = 'subWeapon';
      else if (t.includes('weapon') || t.includes('무기')) slotKey = 'weapon';
      else if (t.includes('head') || t.includes('머리') || t.includes('투구') || t.includes('모자')) slotKey = 'head';
      else if (t.includes('body') || t.includes('몸') || t.includes('갑옷') || t.includes('상의') || t.includes('하의') || t.includes('의복')) slotKey = 'body';
      else if (t.includes('hand') || t.includes('손') || t.includes('장갑')) slotKey = 'hand';
      else if (t.includes('feet') || t.includes('발') || t.includes('신발') || t.includes('부츠')) slotKey = 'feet';
      else if (t.includes('accessory') || t.includes('악세') || t.includes('장신구') || t.includes('반지') || t.includes('목걸이')) slotKey = 'accessory';
      
      if (slotKey) { 
          const currentEquip = newEquipment[slotKey]; 
          if (currentEquip) newInventory.push(currentEquip); 
          newEquipment[slotKey] = item; 
          newInventory.splice(itemIndex, 1); 
          updatedChar.inventory = newInventory;
          comp.equipment = newEquipment;

          handleUpdateCharacter(updatedChar, `[시스템] ${comp.name}에게 ${item.name}을(를) 장착시켰습니다.`);
          setResultModalData({ type: 'success', title: '장비 장착 완료', message: `${comp.name} 대원이 새로운 장비를 착용했습니다.`, items: [{ label: '장비명', after: item.name }] });
      } else { alert("동료가 착용할 수 없는 부위입니다."); }
  };

  const handleCompanionUnequip = (slot: string) => {
      if (!selectedCompanionId) return;
      const updatedChar = { ...character };
      const comp = findCompanionRef(updatedChar, selectedCompanionId);
      if (!comp) return;

      // [NEW] Handle dismounting monster
      if (slot === 'mount' && comp.mountedMonster) {
          const monster = comp.mountedMonster;
          monster.isMountedAsMount = false;
          comp.mountedMonster = undefined;
          comp.mountedMonsterId = undefined;
          
          if (updatedChar.companions.length < MAX_PARTY_SIZE) {
              updatedChar.companions = [...updatedChar.companions, monster];
              handleUpdateCharacter(updatedChar, `[탈것] ${monster.name}을(를) 동료 목록으로 복귀시켰습니다.`);
          } else {
              updatedChar.inactiveCompanions = [...(updatedChar.inactiveCompanions || []), monster];
              handleUpdateCharacter(updatedChar, `[탈것] 동료 칸이 가득 차 ${monster.name}을(를) 대기소로 보냈습니다.`);
          }
          return;
      }

      if (updatedChar.inventory.length >= calculateInventorySize(updatedChar.stats)) { return alert(`인벤토리가 가득 찼습니다.`); }
      
      const newEquipment = { ...comp.equipment };
      const item = newEquipment[slot as keyof typeof newEquipment];
      if (item) { 
          updatedChar.inventory = [...updatedChar.inventory, item]; 
          delete newEquipment[slot as keyof typeof newEquipment]; 
          comp.equipment = newEquipment;
          handleUpdateCharacter(updatedChar, `[시스템] ${comp.name}의 ${item.name} 장비를 해제했습니다.`);
      }
  };

  const handleMountMonster = (monsterId: string, targetId: string) => {
      const updatedChar = { ...character };
      const monster = updatedChar.companions.find(c => c.id === monsterId);
      if (!monster) return;

      if (targetId !== 'player') {
          const target = updatedChar.companions.find(c => c.id === targetId);
          if (target && target.isMonster) {
              alert("몬스터는 탈것을 장착할 수 없습니다.");
              return;
          }
      }

      // 1. Handle the previous mount of the target to prevent data loss
      let oldMount: Companion | undefined;
      if (targetId === 'player') {
          if (updatedChar.mountedMonster) {
              oldMount = { ...updatedChar.mountedMonster, isMountedAsMount: false };
              updatedChar.mountedMonster = undefined;
              updatedChar.mountedMonsterId = undefined;
          }
      } else {
          updatedChar.companions = updatedChar.companions.map(c => {
              if (c.id === targetId) {
                  if (c.mountedMonster) {
                      oldMount = { ...c.mountedMonster, isMountedAsMount: false };
                  }
                  return { ...c, mountedMonsterId: undefined, mountedMonster: undefined };
              }
              return c;
          });
      }

      // 2. Remove the NEW mount from active companions list
      updatedChar.companions = updatedChar.companions.filter(c => c.id !== monsterId);

      // 3. If there was an old mount, add it back to companions
      if (oldMount) {
          updatedChar.companions.push(oldMount);
      }

      // 4. Set the new mount
      const monsterToMount = { ...monster, isMountedAsMount: true };
      if (targetId === 'player') {
          updatedChar.mountedMonster = monsterToMount;
          updatedChar.mountedMonsterId = monsterId;
      } else {
          updatedChar.companions = updatedChar.companions.map(c => {
              if (c.id === targetId) {
                  return { ...c, mountedMonsterId: monsterId, mountedMonster: monsterToMount };
              }
              return c;
          });
      }

      // 5. Ensure party size limit after swapping
      if (updatedChar.companions.length > MAX_PARTY_SIZE) {
          const overflow = updatedChar.companions.pop();
          if (overflow) {
              if (!updatedChar.inactiveCompanions) updatedChar.inactiveCompanions = [];
              updatedChar.inactiveCompanions.push(overflow);
          }
      }

      handleUpdateCharacter(updatedChar, `[탈것] ${monster.name}을(를) ${targetId === 'player' ? '플레이어' : '동료'}의 탈것으로 장착했습니다.`);
      setIsMountTargetModalOpen(false);
      setMountMonsterId(null);
      
      setResultModalData({
          type: 'success',
          title: '탈것 장착',
          message: `${monster.name}을(를) ${targetId === 'player' ? '플레이어' : '동료'}의 탈것으로 장착했습니다.`,
          items: [{ label: '효과', after: '능력치 10% 증가' }]
      });
  };

  const handleCompanionGift = (itemIndex: number, amount: number = 1) => {
      if (!selectedCompanionId) return;
      const item = character.inventory[itemIndex]; if (!item) return;
      const updatedChar = { ...character }; 
      const comp = findCompanionRef(updatedChar, selectedCompanionId);
      if (!comp) return;
      
      const targetName = item.name;
      let removedCount = 0;

      const newInventory = [...updatedChar.inventory];
      
      for (let i = newInventory.length - 1; i >= 0; i--) {
          if (removedCount >= amount) break;
          if (newInventory[i].name === targetName) {
              const currentQty = newInventory[i].quantity || 1;
              const need = amount - removedCount;
              if (currentQty > need) {
                  newInventory[i] = {
                      ...newInventory[i],
                      quantity: currentQty - need
                  };
                  removedCount += need;
              } else {
                  removedCount += currentQty;
                  newInventory.splice(i, 1);
              }
          }
      }
      if (removedCount <= 0) return;

      updatedChar.inventory = newInventory;

      const rarityGains: Record<string, number> = { 
          [ItemRarity.NORMAL]: 1, 
          [ItemRarity.MAGIC]: 2, 
          [ItemRarity.RARE]: 5, 
          [ItemRarity.EPIC]: 10, 
          [ItemRarity.UNIQUE]: 20, 
          [ItemRarity.LEGENDARY]: 30, 
          [ItemRarity.MYTHTIC]: 50 
      };
      const gainPerItem = rarityGains[item.rarity] || 1;
      const totalGain = gainPerItem * removedCount;
      
      comp.affection = Math.min(100, comp.affection + totalGain);
      comp.loyalty = Math.min(100, comp.loyalty + Math.floor(totalGain / 2));

      handleUpdateCharacter(updatedChar, `[시스템] ${comp.name}에게 ${item.name} ${removedCount}개를 선물했습니다. (호감도 +${totalGain})`);
      setResultModalData({ 
          type: 'success', 
          title: '선물 성공!', 
          message: `${comp.name}: "세상에, 제게 ${removedCount > 1 ? `${removedCount}개나 ` : ''}주시는 건가요? 정말 감사합니다!"`, 
          items: [{ label: '선물', after: `${item.name} x${removedCount}` }, { label: '호감도', after: `+${totalGain}` }] 
      });
  };

  const handleCompanionIncreaseStat = (statKey: string, amount: number) => {
    if (!selectedCompanionId) return;
    const updatedChar = { ...character };
    const comp = findCompanionRef(updatedChar, selectedCompanionId);
    if (!comp || comp.statPoints < amount) return;

    comp.statPoints -= amount;
    if (statKey === 'maxHp') {
      comp.stats.maxHp += amount * 10;
      comp.stats.hp += amount * 10;
    } else if (statKey === 'maxMp') {
      comp.stats.maxMp += amount * 10;
      comp.stats.mp += amount * 10;
    } else (comp.stats as any)[statKey] += amount;

    handleUpdateCharacter(updatedChar, `[시스템] ${comp.name}의 ${statKey} 스탯이 ${amount}만큼 상승했습니다.`);
  };

  const handleStatTraining = (statKey: string, targetId: string, amount: number = 1) => {
      const trainLevel = calculateTotalTrainingLevel(character.base, 'training_stat');
      const limit = getFacilityTrainingLimit(character, 'training_stat');
      const todayCount = character.base?.dailyCounts?.['training_stat'] || 0;
      if (todayCount + amount > limit && character.base?.lastDailyReset === character.currentDate) { setResultModalData({ type: 'failure', title: '훈련 제한 (일일)', message: `오늘의 훈련 횟수를 모두 소진했습니다. (총 ${limit}회)`, items: [ { label: '가능 시기', after: '내일' } ] }); return; }
      const costGold = Math.floor(Math.max(1000, 50000 - trainLevel * 5000) * amount); const costFood = 1 * amount; 
      const missing = []; if ((character.money || 0) < costGold) missing.push(`골드 ${(costGold - (character.money || 0)).toLocaleString()}G`); if ((character.base?.resources.food || 0) < costFood) missing.push(`식량 ${costFood - (character.base?.resources.food || 0)}`);
      if (missing.length > 0) { setResultModalData({ type: 'warning', title: '자원 부족', message: '훈련에 필요한 자원이 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) }); return; }
      let targetEntity: Character | Companion | undefined; let isPlayer = false; let compIndex = -1; let isInactive = false;
      if (targetId === 'player') { targetEntity = character; isPlayer = true; } 
      else { compIndex = character.companions.findIndex(c => c.id === targetId); if (compIndex >= 0) { targetEntity = character.companions[compIndex]; } else { compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1; if (compIndex >= 0) { targetEntity = character.inactiveCompanions![compIndex]; isInactive = true; } } }
      if (!targetEntity) return;

      const rates = getTrainingRates(character, 'training_stat');
      const rollRes = executeBatchTrainingRolls(amount, rates);

      const isHpMp = (statKey === 'maxHp' || statKey === 'maxMp');
      const greatGainUnit = isHpMp ? 20 : 2;
      const successGainUnit = isHpMp ? 10 : 1;
      const baseGainTotal = (rollRes.greatSuccessCount * greatGainUnit) + (rollRes.successCount * successGainUnit);
      const statMult = getTrainerBranchMultiplier(character, TrainerBranch.STAT);
      const totalGain = Math.round(baseGainTotal * statMult);

      const summary = buildTrainingResultSummary(rollRes, amount, statMult, '스탯 분과');

      let newChar = { ...character };
      if (!newChar.base!.dailyCounts) newChar.base!.dailyCounts = {};
      if (newChar.base!.lastDailyReset !== character.currentDate) { newChar.base!.dailyCounts = { 'training_stat': amount }; newChar.base!.lastDailyReset = character.currentDate; } 
      else { newChar.base!.dailyCounts['training_stat'] = (newChar.base!.dailyCounts['training_stat'] || 0) + amount; }
      newChar.base = { ...newChar.base!, resources: { ...newChar.base!.resources, food: newChar.base!.resources.food - costFood } };
      newChar.money -= costGold;
      
      const updateEntityStats = (entity: Character | Companion) => { 
          if (statKey === 'maxHp') {
              return { ...entity, stats: { ...entity.stats, maxHp: (entity.stats.maxHp || 0) + totalGain } };
          } else if (statKey === 'maxMp') {
              return { ...entity, stats: { ...entity.stats, maxMp: (entity.stats.maxMp || 0) + totalGain } };
          } else {
              const currentVal = entity.stats[statKey as keyof Stats] || 0; 
              return { ...entity, stats: { ...entity.stats, [statKey]: currentVal + totalGain } }; 
          }
      };

      if (totalGain > 0) {
          if (isPlayer) { const updated = updateEntityStats(newChar); newChar.stats = updated.stats; } 
          else if (isInactive) { const newInactive = [...(newChar.inactiveCompanions || [])]; newInactive[compIndex] = updateEntityStats(newInactive[compIndex]) as Companion; newChar.inactiveCompanions = newInactive; } 
          else { const newComps = [...newChar.companions]; newComps[compIndex] = updateEntityStats(newComps[compIndex]) as Companion; newChar.companions = newComps; }
      }
      
      newChar = addTrainerExpToAssignedTrainers(newChar, 'training_stat', amount);

      const statMinutesToAdvance = Math.max(1, Math.round((amount / Math.max(1, limit)) * 60));
      const timeRes = advanceGameTime(newChar, statMinutesToAdvance, { activityName: "스탯 훈련" });
      newChar = timeRes.updatedCharacter;

      const gainText = `+${totalGain}`;
      const remaining = limit - newChar.base!.dailyCounts['training_stat'];
      const logSummary = amount > 1 ? `${summary.title} (대성공 ${rollRes.greatSuccessCount}회, 성공 ${rollRes.successCount}회, 실패 ${rollRes.failCount}회, ${statKey.toUpperCase()} ${gainText}, 소모: ${costGold.toLocaleString()}G, 식량 ${costFood}개). 남은 횟수: ${remaining}` : `${summary.title} (${statKey.toUpperCase()} ${gainText}, 소모: ${costGold.toLocaleString()}G, 식량 ${costFood}개). 남은 횟수: ${remaining}`;
      handleUpdateCharacter(newChar, `[시스템] ${targetEntity.name}의 ${statKey.toUpperCase()} 스탯 훈련 결과: ${logSummary}`, timeRes.dailyReport);
      
      setTrainingReportData({
          type: 'stat',
          targetName: targetEntity.name,
          trainingCount: amount,
          baseGain: `+${baseGainTotal} ${statKey.toUpperCase()}`,
          trainerMultiplier: statMult,
          hasTrainerBonus: statMult > 1,
          trainerBranchName: '스탯 분과',
          finalGainText: `${statKey.toUpperCase()} +${totalGain}`,
          details: [
              { label: '소모 시간', value: statMinutesToAdvance >= 60 ? `+${Math.floor(statMinutesToAdvance / 60)}시간${statMinutesToAdvance % 60 > 0 ? ` ${statMinutesToAdvance % 60}분` : ''}` : `+${statMinutesToAdvance}분`, color: 'text-indigo-400 font-bold' },
              { label: '훈련 스탯 항목', value: statKey.toUpperCase(), color: 'text-amber-300' },
              { label: '담당 트레이너', value: `${rates.trainerLabel}${rates.trainerName !== '미배치' ? ` (${rates.trainerName})` : ''}`, color: rates.trainerRank ? 'text-emerald-400' : 'text-slate-400' },
              { label: '훈련 판정 결과', value: amount > 1 ? `대성공 ${rollRes.greatSuccessCount}회 / 성공 ${rollRes.successCount}회 / 실패 ${rollRes.failCount}회` : summary.title, color: (rollRes.totalSuccesses > 0) ? (rollRes.greatSuccessCount > 0 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-400' },
              { label: '기본 훈련 획득량', value: `+${baseGainTotal}` },
              { label: '트레이너 배율 보너스', value: statMult > 1 ? `×${statMult}배 (적용됨)` : '×1배 (미적용)', color: statMult > 1 ? 'text-emerald-400' : 'text-slate-400' },
              { label: '최종 스탯 상승량', value: `+${totalGain}`, color: 'text-amber-400 font-bold' }
          ],
          resourcesSpent: [
              { name: '골드', amount: `${costGold.toLocaleString()}G` },
              { name: '식량', amount: `${costFood}개` }
          ],
          remainingCount: remaining
      });
      setResultActionContext(null); 
  };

  const handleWeaponTraining = (weaponType: WeaponType, targetId: string, amount: number = 1) => {
      const trainLevel = calculateTotalTrainingLevel(character.base, 'training_mastery');
      const limit = getFacilityTrainingLimit(character, 'training_mastery');
      const todayCount = character.base?.dailyCounts?.['training_mastery'] || 0;
      if (todayCount + amount > limit && character.base?.lastDailyReset === character.currentDate) { setResultModalData({ type: 'failure', title: '훈련 제한 (일일)', message: '오늘의 훈련 횟수를 모두 소진했습니다.', items: [ { label: '가능 시기', after: '내일' } ] }); return; }
      const costGold = Math.floor(Math.max(1000, 10000 - trainLevel * 1000) * amount);
      const costFood = 1 * amount;
      const costIron = 1 * amount;
      const missing = [];
      if ((character.money || 0) < costGold) missing.push(`골드 ${(costGold - (character.money || 0)).toLocaleString()}G`);
      if ((character.base?.resources.food || 0) < costFood) missing.push(`식량 ${costFood - (character.base?.resources.food || 0)}`);
      if ((character.base?.resources.iron || 0) < costIron) missing.push(`철광석 ${costIron - (character.base?.resources.iron || 0)}`);
      if (missing.length > 0) { setResultModalData({ type: 'warning', title: '자원 부족', message: '훈련에 필요한 자원이 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) }); return; }
      let targetEntity: Character | Companion | undefined; let isPlayer = false; let compIndex = -1; let isInactive = false;
      if (targetId === 'player') { targetEntity = character; isPlayer = true; } 
      else { compIndex = character.companions.findIndex(c => c.id === targetId); if (compIndex >= 0) { targetEntity = character.companions[compIndex]; } else { compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1; if (compIndex >= 0) { targetEntity = character.inactiveCompanions![compIndex]; isInactive = true; } } }
      if (!targetEntity) return;

      const rates = getTrainingRates(character, 'training_mastery');
      const rollRes = executeBatchTrainingRolls(amount, rates);

      const baseExpGain = (rollRes.greatSuccessCount * 10) + (rollRes.successCount * 5);
      const masteryMult = getTrainerBranchMultiplier(character, TrainerBranch.WEAPON_MASTERY);
      const expGain = Math.round(baseExpGain * masteryMult);

      const summary = buildTrainingResultSummary(rollRes, amount, masteryMult, '무기숙련도 분과');

      let newChar = { ...character };
      if (!newChar.base!.dailyCounts) newChar.base!.dailyCounts = {};
      if (newChar.base!.lastDailyReset !== character.currentDate) { newChar.base!.dailyCounts = { 'training_mastery': amount }; newChar.base!.lastDailyReset = character.currentDate; } 
      else { newChar.base!.dailyCounts['training_mastery'] = (newChar.base!.dailyCounts['training_mastery'] || 0) + amount; }
      newChar.base = { ...newChar.base!, resources: { ...newChar.base!.resources, food: newChar.base!.resources.food - costFood, iron: newChar.base!.resources.iron - costIron } };
      newChar.money -= costGold;
      let masteryRes: { leveledUp: boolean; oldLevel: number; newLevel: number } | null = null;
      if (expGain > 0) {
          const res = addMasteryExp(targetEntity, weaponType, expGain);
          masteryRes = res;
          const updatedEntity = res.char as any;
          if (isPlayer) { newChar.weaponMastery = updatedEntity.weaponMastery; } 
          else if (isInactive) { const newInactive = [...(newChar.inactiveCompanions || [])]; newInactive[compIndex] = { ...newInactive[compIndex], weaponMastery: updatedEntity.weaponMastery }; newChar.inactiveCompanions = newInactive; } 
          else { const newComps = [...newChar.companions]; newComps[compIndex] = { ...newComps[compIndex], weaponMastery: updatedEntity.weaponMastery }; newChar.companions = newComps; }
      }
      newChar = addTrainerExpToAssignedTrainers(newChar, 'training_mastery', amount);
      const trainMinutesW = Math.max(1, Math.round((amount / Math.max(1, limit)) * 60));
      const timeResW = advanceGameTime(newChar, trainMinutesW, { activityName: "무기 숙련도 훈련" });
      newChar = timeResW.updatedCharacter;

      const remaining = limit - newChar.base!.dailyCounts['training_mastery'];
      const levelUpSuffix = masteryRes?.leveledUp ? ` [숙련도 Lv.${masteryRes.oldLevel} ➔ Lv.${masteryRes.newLevel} 레벨업!]` : (masteryRes ? ` (현재: Lv.${masteryRes.newLevel})` : '');
      const logSummary = amount > 1 ? `${summary.title} (대성공 ${rollRes.greatSuccessCount}회, 성공 ${rollRes.successCount}회, 실패 ${rollRes.failCount}회, EXP +${expGain}, 소모: ${costGold.toLocaleString()}G, 식량 ${costFood}개, 철광석 ${costIron}개).${levelUpSuffix} 남은 횟수: ${remaining}` : `${summary.title} (EXP +${expGain}, 소모: ${costGold.toLocaleString()}G, 식량 ${costFood}개, 철광석 ${costIron}개).${levelUpSuffix} 남은 횟수: ${remaining}`;
      handleUpdateCharacter(newChar, `[시스템] ${targetEntity.name}의 ${weaponType} 무기 훈련 결과: ${logSummary}`, timeResW.dailyReport);
      
      setTrainingReportData({
          type: 'mastery',
          targetName: targetEntity.name,
          trainingCount: amount,
          baseGain: `+${baseExpGain} EXP`,
          trainerMultiplier: masteryMult,
          hasTrainerBonus: masteryMult > 1,
          trainerBranchName: '무기숙련도 분과',
          finalGainText: masteryRes?.leveledUp 
              ? `${weaponType} 숙련도 +${expGain} EXP (Lv.${masteryRes.oldLevel} ➔ Lv.${masteryRes.newLevel} 레벨업!)` 
              : `${weaponType} 숙련도 +${expGain} EXP${masteryRes ? ` (현재: Lv.${masteryRes.newLevel})` : ''}`,
          details: [
              { label: '소모 시간', value: trainMinutesW >= 60 ? `+${Math.floor(trainMinutesW / 60)}시간${trainMinutesW % 60 > 0 ? ` ${trainMinutesW % 60}분` : ''}` : `+${trainMinutesW}분`, color: 'text-indigo-400 font-bold' },
              { label: '훈련 무기 종류', value: weaponType, color: 'text-red-300' },
              { label: '담당 트레이너', value: `${rates.trainerLabel}${rates.trainerName !== '미배치' ? ` (${rates.trainerName})` : ''}`, color: rates.trainerRank ? 'text-emerald-400' : 'text-slate-400' },
              { label: '훈련 판정 결과', value: amount > 1 ? `대성공 ${rollRes.greatSuccessCount}회 / 성공 ${rollRes.successCount}회 / 실패 ${rollRes.failCount}회` : summary.title, color: (rollRes.totalSuccesses > 0) ? (rollRes.greatSuccessCount > 0 ? 'text-emerald-400' : 'text-blue-400') : 'text-slate-400' },
              { label: '기본 획득 경험치', value: `+${baseExpGain} EXP` },
              { label: '트레이너 배율 보너스', value: masteryMult > 1 ? `×${masteryMult}배 (적용됨)` : '×1배 (미적용)', color: masteryMult > 1 ? 'text-emerald-400' : 'text-slate-400' },
              { label: '최종 숙련도 획득', value: `+${expGain} EXP`, color: 'text-red-400 font-bold' }
          ],
          resourcesSpent: [
              { name: '골드', amount: `${costGold.toLocaleString()}G` },
              { name: '식량', amount: `${costFood}개` },
              { name: '철광석', amount: `${costIron}개` }
          ],
          remainingCount: remaining
      });
      setResultActionContext(null); 
  };

  const handleExpTraining = (amount: number = 1, targetId?: string) => {
      const trainLevel = calculateTotalTrainingLevel(character.base, 'training_exp');
      const limit = getFacilityTrainingLimit(character, 'training_exp');
      const todayCount = character.base?.dailyCounts?.['training_exp'] || 0;
      if (todayCount + amount > limit && character.base?.lastDailyReset === character.currentDate) { setResultModalData({ type: 'failure', title: '훈련 제한 (일일)', message: '오늘의 훈련 횟수를 모두 소진했습니다.', items: [ { label: '가능 시기', after: '내일' } ] }); return; }
      const costGold = Math.floor(Math.max(1000, 10000 - trainLevel * 1000) * amount);
      const foodCost = 1 * amount;
      const missing = [];
      if ((character.money || 0) < costGold) missing.push(`골드 ${(costGold - (character.money || 0)).toLocaleString()}G`);
      if ((character.base?.resources.food || 0) < foodCost) missing.push(`식량 ${foodCost - (character.base?.resources.food || 0)}`);
      if (missing.length > 0) { setResultModalData({ type: 'warning', title: '자원 부족', message: '훈련에 필요한 자원이 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) }); return; }
      
      const rates = getTrainingRates(character, 'training_exp');
      const rollRes = executeBatchTrainingRolls(amount, rates);

      const baseExpUnit = (character.level * 10) + 200;
      const trainBonusUnit = trainLevel * 500;
      const fullUnitExp = baseExpUnit + trainBonusUnit;

      const greatGainUnit = Math.floor(fullUnitExp * 1.5);
      const successGainUnit = fullUnitExp;
      const baseExpGain = (rollRes.greatSuccessCount * greatGainUnit) + (rollRes.successCount * successGainUnit);

      const expMult = getTrainerBranchMultiplier(character, TrainerBranch.EXP);
      const totalExp = Math.round(baseExpGain * expMult);

      const summary = buildTrainingResultSummary(rollRes, amount, expMult, '경험치 분과');

      let newChar = { ...character };
      if (!newChar.base!.dailyCounts) newChar.base!.dailyCounts = {};
      if (newChar.base!.lastDailyReset !== character.currentDate) { newChar.base!.dailyCounts = { 'training_exp': amount }; newChar.base!.lastDailyReset = character.currentDate; } 
      else { newChar.base!.dailyCounts['training_exp'] = (newChar.base!.dailyCounts['training_exp'] || 0) + amount; }
      
      let targetName = newChar.name;
      const effectiveTargetId = targetId || 'player';
      if (totalExp > 0) {
          if (effectiveTargetId === 'player' || effectiveTargetId === newChar.name) {
              newChar.currentExp += totalExp;
              targetName = newChar.name;
          } else {
              const compIdx = newChar.companions.findIndex(c => c.id === effectiveTargetId);
              if (compIdx !== -1) {
                  newChar.companions = [...newChar.companions];
                  newChar.companions[compIdx] = { ...newChar.companions[compIdx], currentExp: newChar.companions[compIdx].currentExp + totalExp };
                  targetName = newChar.companions[compIdx].name;
              } else if (newChar.inactiveCompanions) {
                  const inactIdx = newChar.inactiveCompanions.findIndex(c => c.id === effectiveTargetId);
                  if (inactIdx !== -1) {
                      newChar.inactiveCompanions = [...newChar.inactiveCompanions];
                      newChar.inactiveCompanions[inactIdx] = { ...newChar.inactiveCompanions[inactIdx], currentExp: newChar.inactiveCompanions[inactIdx].currentExp + totalExp };
                      targetName = newChar.inactiveCompanions[inactIdx].name;
                  }
              }
          }
      } else {
          if (effectiveTargetId !== 'player' && effectiveTargetId !== newChar.name) {
              const comp = newChar.companions.find(c => c.id === effectiveTargetId) || newChar.inactiveCompanions?.find(c => c.id === effectiveTargetId);
              if (comp) targetName = comp.name;
          }
      }

      newChar.base = { ...newChar.base!, resources: { ...newChar.base!.resources, food: newChar.base!.resources.food - foodCost } };
      newChar.money -= costGold;
      newChar = addTrainerExpToAssignedTrainers(newChar, 'training_exp', amount);

      const expMinutesToAdvance = Math.max(1, Math.round((amount / Math.max(1, limit)) * 60));
      const expTimeRes = advanceGameTime(newChar, expMinutesToAdvance, { activityName: "경험치 훈련" });
      newChar = expTimeRes.updatedCharacter;

      const remaining = limit - newChar.base!.dailyCounts['training_exp'];
      const logSummary = amount > 1 ? `${summary.title} (대성공 ${rollRes.greatSuccessCount}회, 성공 ${rollRes.successCount}회, 실패 ${rollRes.failCount}회, EXP +${totalExp}, 소모: ${costGold.toLocaleString()}G, 식량 -${foodCost}개). 남은 횟수: ${remaining}` : `${summary.title} (EXP +${totalExp}, 소모: ${costGold.toLocaleString()}G, 식량 -${foodCost}개). 남은 횟수: ${remaining}`;
      handleUpdateCharacter(newChar, `[시스템: ${targetName}] 경험치 훈련 결과: ${logSummary}`, expTimeRes.dailyReport);
      
      setTrainingReportData({
          type: 'exp',
          targetName: targetName,
          trainingCount: amount,
          baseGain: `+${baseExpGain.toLocaleString()} EXP`,
          trainerMultiplier: expMult,
          hasTrainerBonus: expMult > 1,
          trainerBranchName: '경험치 분과',
          finalGainText: `+${totalExp.toLocaleString()} EXP`,
          details: [
              { label: '소모 시간', value: expMinutesToAdvance >= 60 ? `+${Math.floor(expMinutesToAdvance / 60)}시간${expMinutesToAdvance % 60 > 0 ? ` ${expMinutesToAdvance % 60}분` : ''}` : `+${expMinutesToAdvance}분`, color: 'text-indigo-400 font-bold' },
              { label: '훈련 대상', value: targetName },
              { label: '담당 트레이너', value: `${rates.trainerLabel}${rates.trainerName !== '미배치' ? ` (${rates.trainerName})` : ''}`, color: rates.trainerRank ? 'text-emerald-400' : 'text-slate-400' },
              { label: '훈련 판정 결과', value: amount > 1 ? `대성공 ${rollRes.greatSuccessCount}회 / 성공 ${rollRes.successCount}회 / 실패 ${rollRes.failCount}회` : summary.title, color: (rollRes.totalSuccesses > 0) ? (rollRes.greatSuccessCount > 0 ? 'text-emerald-400' : 'text-indigo-400') : 'text-slate-400' },
              { label: '기본 획득 경험치', value: `+${baseExpGain.toLocaleString()} EXP` },
              { label: '트레이너 배율 보너스', value: expMult > 1 ? `×${expMult}배 (적용됨)` : '×1배 (미적용)', color: expMult > 1 ? 'text-emerald-400' : 'text-slate-400' },
              { label: '최종 획득 경험치', value: `+${totalExp.toLocaleString()} EXP`, color: 'text-indigo-400 font-bold' }
          ],
          resourcesSpent: [
              { name: '골드', amount: `${costGold.toLocaleString()}G` },
              { name: '식량', amount: `${foodCost}개` }
          ],
          remainingCount: remaining
      });
      setResultActionContext(null);
  };

  const handleUpdateCombatStyle = (targetId: string, newStyle: CombatStyle) => {
      const isPlayer = targetId === 'player';
      const isInactive = (character.inactiveCompanions || []).some(c => c.id === targetId);
      const compIndex = isPlayer ? -1 : isInactive ? character.inactiveCompanions!.findIndex(c => c.id === targetId) : character.companions.findIndex(c => c.id === targetId);
      const targetEntity = isPlayer ? character : isInactive ? character.inactiveCompanions![compIndex] : character.companions[compIndex];
      
      if (!targetEntity) return;
      if (!isPlayer && !(targetEntity as Companion).isCustom) {
          setResultModalData({ type: 'warning', title: '변경 불가', message: '일반 동료는 고유 전투 계열을 유지하여 변경할 수 없습니다.', items: [] });
          return;
      }

      const styleConfig = COMBAT_STYLE_CONFIG[newStyle];
      let newChar = { ...character };
      if (isPlayer) {
          newChar.targetCombatStyle = newStyle;
      } else if (isInactive) {
          const newInactive = [...(newChar.inactiveCompanions || [])];
          newInactive[compIndex] = { ...newInactive[compIndex], targetCombatStyle: newStyle };
          newChar.inactiveCompanions = newInactive;
      } else {
          const newComps = [...newChar.companions];
          newComps[compIndex] = { ...newComps[compIndex], targetCombatStyle: newStyle };
          newChar.companions = newComps;
      }
      setCharacter(newChar);
      addToLog(`[시스템] ${targetEntity.name}의 전투 계열 수련 목표가 '${styleConfig?.label || newStyle}'(으)로 지정되었습니다.`);
  };

  const handlePromoteCombatStyle = (targetId: string, newStyle: CombatStyle) => {
      const isPlayer = targetId === 'player';
      const isInactive = (character.inactiveCompanions || []).some(c => c.id === targetId);
      const compIndex = isPlayer ? -1 : isInactive ? character.inactiveCompanions!.findIndex(c => c.id === targetId) : character.companions.findIndex(c => c.id === targetId);
      const targetEntity = isPlayer ? character : isInactive ? character.inactiveCompanions![compIndex] : character.companions[compIndex];
      
      if (!targetEntity) return;

      const styleConfig = COMBAT_STYLE_CONFIG[newStyle];
      let newChar = { ...character };
      
      const updateEntity = (e: any) => {
          if (!e.unlockedCombatStyles) e.unlockedCombatStyles = [];
          if (!e.unlockedCombatStyles.includes(newStyle)) {
              e.unlockedCombatStyles.push(newStyle);
          }
          // 상위로 승급하면서 루트, 부모도 자동 해금됨
          let cur = styleConfig;
          while(cur && cur.parentStyle) {
              if (!e.unlockedCombatStyles.includes(cur.parentStyle)) e.unlockedCombatStyles.push(cur.parentStyle);
              cur = COMBAT_STYLE_CONFIG[cur.parentStyle];
          }
          if (cur && cur.rootStyle && !e.unlockedCombatStyles.includes(cur.rootStyle)) {
              e.unlockedCombatStyles.push(cur.rootStyle);
          }
          e.combatStyle = newStyle;
          // 승급 시 진행도는 초기화
          if (e.combatStyleProgress && e.combatStyleProgress[newStyle]) {
              e.combatStyleProgress[newStyle] = { exp: 0, monsterKills: 0, bossKills: 0 };
          }
          e.targetCombatStyle = undefined;
          return e;
      };

      if (isPlayer) {
          newChar = updateEntity(newChar);
      } else if (isInactive) {
          const newInactive = [...(newChar.inactiveCompanions || [])];
          newInactive[compIndex] = updateEntity({ ...newInactive[compIndex] });
          newChar.inactiveCompanions = newInactive;
      } else {
          const newComps = [...newChar.companions];
          newComps[compIndex] = updateEntity({ ...newComps[compIndex] });
          newChar.companions = newComps;
      }
      setCharacter(newChar);
      addToLog(`[시스템] 🎉 ${targetEntity.name}이(가) 전투 계열 '${styleConfig?.label || newStyle}'(으)로 승급 및 장착 완료했습니다!`);
      setResultModalData({
          type: 'info',
          title: '전투 계열 승급/변경 완료',
          message: `${targetEntity.name}이(가) 전투 계열을 변경하였습니다.`,
          items: [
              { label: '대상', after: targetEntity.name },
              { label: '전투 계열', after: styleConfig?.label || newStyle },
              { label: '특화 무기', after: styleConfig?.specialtyText || '-' }
          ]
      });
  };

  const handleResultContinue = async () => {
      if (!resultActionContext) return;
      const { type, args } = resultActionContext;
      
      if (type === 'logout') {
          try {
              await signOut(auth);
              setResultModalData({
                  type: 'success',
                  title: '로그아웃 완료',
                  message: '안전하게 로그아웃되었습니다. 클라우드 기능이 비활성화됩니다.',
                  items: []
              });
              setResultActionContext(null);
          } catch (e: any) {
              setResultModalData({
                  type: 'failure',
                  title: '로그아웃 실패',
                  message: e.message,
                  items: []
              });
          }
          return;
      }

      if (type === 'clear_logs') {
          setMessages([]);
          addToLog("[시스템] 대화 기록과 인공지능 세션이 초기화되었습니다.");
          setResultModalData({
              type: 'success',
              title: '삭제 완료',
              message: '모든 대화 기록과 인공지능 세션이 성공적으로 초기화되었습니다.',
              items: []
          });
          setResultActionContext(null);
          return;
      }

      if (type === 'enhance') handleItemEnhancement(args[0]);
      if (type === 'skill_research') handleSkillResearch(args[0], args[1]);
      if (type === 'skill_break') handleSkillLimitBreak(args[0], args[1]);
      if (type === 'stat_train') handleStatTraining(args[0], args[1], args[2]);
      if (type === 'relocate_confirm') {
          const destination = args[0] as Location;
          const totalMinutes = args[1] as number;
          const costs = args[2] as { gold: number, wood: number, stone: number, food: number };
          const relocationResult = executeBaseRelocation(character, destination, totalMinutes, costs);
          if (relocationResult.dailyReport) setDailyReport(relocationResult.dailyReport);
          if (relocationResult.toastNotice) triggerDayChangeToast(relocationResult.toastNotice);
          relocationResult.systemLogs.forEach(log => addToLog(log));
          setCharacter(relocationResult.updatedCharacter);
          setIsMapOpen(false);
          setMapMode('travel');
          setResultActionContext(null);
          setResultModalData({
              type: 'success',
              title: '기지 이사 완료',
              message: `${destination.nation} ${destination.city}에 도착했습니다. 기지가 새로운 지역에 성공적으로 정착했으며, 여정 동안 충분한 휴식을 취하여 파티원 전원의 체력과 마력이 회복되었습니다.`,
              items: [
                  { label: '도착지', after: `${destination.nation}, ${destination.city}` },
                  { label: '소요 시간', after: relocationResult.durationText },
                  { label: '회복 상태', after: 'HP/MP 100%' }
              ]
          });
          return;
      }
  };

  const handleLearnSkill = async (skillData: any, tier: string) => {
      const normalizeTier = (t: string): ClassTier => {
        if (t === ClassTier.NONE || !t) return ClassTier.NONE;
        if (Object.values(ClassTier).includes(t as ClassTier)) return t as ClassTier;
        const lower = t.toLowerCase();
        if (lower.includes('final') || lower.includes('파이널')) return ClassTier.FINAL;
        if (lower.includes('last') || lower.includes('라스트')) return ClassTier.LAST;
        if (lower.includes('second') || lower.includes('세컨드')) return ClassTier.SECOND;
        return ClassTier.FIRST;
      };
      
      const nextTier = normalizeTier(tier);
      
      // [NEW] 클래스 해방 체크
      const classTierOrder: Record<ClassTier, number> = {
        [ClassTier.NONE]: 0,
        [ClassTier.F]: 1,
        [ClassTier.FIRST]: 2,
        [ClassTier.SECOND]: 3,
        [ClassTier.LAST]: 4,
        [ClassTier.FINAL]: 5,
        [ClassTier.BOND]: 6,
      };

      const newChar = { ...character };
      let targetEntity: Character | Companion | undefined;
      let compIndex = -1;

      if (skillBookTarget && 'id' in skillBookTarget) {
          compIndex = newChar.companions.findIndex(c => c.id === (skillBookTarget as Companion).id);
          if (compIndex >= 0) {
              targetEntity = newChar.companions[compIndex];
          }
      } else {
          targetEntity = newChar;
      }

      const assignedElement = skillData.shinryokuType || targetEntity?.shinryokuType || (character as any).shinryokuType || '무속성';

      const newSkill: Skill = { 
          name: skillData.name, 
          type: skillData.type || SkillType.PHYSICAL, 
          tier: nextTier, 
          targetType: skillData.targetType || 'single', 
          description: skillData.description || "새로 습득한 스킬", 
          effectFormula: skillData.formulaOverride || skillData.effectFormula || "", 
          mpCost: skillData.mpCost || 10, 
          level: 1, 
          maxLevel: 10, 
          currentMastery: 0, 
          powerRatio: skillData.powerRatio,
          shinryokuType: assignedElement,
          icon: skillData.icon,
          imageUrl: skillData.imageUrl,
          isSummonSkill: skillData.isSummonSkill,
          summonData: skillData.summonData,
          buffType: skillData.buffType,
          buffEffects: skillData.buffEffects,
          debuffEffects: skillData.debuffEffects,
          passiveEffects: skillData.passiveEffects,
          isAttackWithDebuff: skillData.isAttackWithDebuff,
          debuffStat: skillData.debuffStat,
          debuffValue: skillData.debuffValue,
          finalSkillSlot: skillData.finalSkillSlot
      } as any;

      if (targetEntity) {
          // [NEW] 클래스 해방 체크
          if (classTierOrder[nextTier] > classTierOrder[targetEntity.classTier]) {
              setResultModalData({ type: 'warning', title: '스킬 습득 불가', message: `${targetEntity.name}은(는) 아직 해당 클래스를 해방하지 않았습니다.`, items: [] });
              return;
          }

          // [NEW] 패시브 스킬 개수 제한 검증
          if (newSkill.type === SkillType.PASSIVE) {
              const currentTierPassives = (targetEntity.skills || []).filter(s => {
                  const sTier = normalizeTier(s.tier);
                  return sTier === nextTier && s.type === SkillType.PASSIVE;
              }).length;
              
              let maxPassives: number | null = null;
              if (nextTier === ClassTier.FIRST || nextTier === ClassTier.SECOND) maxPassives = 2;
              else if (nextTier === ClassTier.LAST) maxPassives = 3;
              else if (nextTier === ClassTier.FINAL) maxPassives = null;
              
              if (maxPassives !== null && currentTierPassives >= maxPassives) {
                  setResultModalData({ 
                      type: 'warning', 
                      title: '패시브 스킬 한도 초과', 
                      message: `${nextTier} 클래스에서는 패시브 스킬을 최대 ${maxPassives}개까지만 배울 수 있습니다. (현재: ${currentTierPassives}/${maxPassives}개)`, 
                      items: [] 
                  });
                  return;
              }
          }

          // [NEW] 타속성 신력 조각 소모 처리 (필요 개수만큼 플레이어 자원에서 차감)
          if (skillData.consumedShard) {
              const shardElem = skillData.consumedShard;
              const cleanKey = shardElem.trim();
              const shortKey = cleanKey.endsWith('계') ? cleanKey.slice(0, -1) : cleanKey;
              let remaining = (skillData.consumedShardCount && skillData.consumedShardCount > 0) ? skillData.consumedShardCount : 1;

              // 1. base.elementalShards 차감
              if (newChar.base?.elementalShards) {
                  const currentShards = { ...newChar.base.elementalShards };
                  const targetKey = (currentShards[cleanKey] || 0) > 0 ? cleanKey : shortKey;
                  const avail = currentShards[targetKey] || 0;
                  if (avail > 0) {
                      const deduct = Math.min(avail, remaining);
                      currentShards[targetKey] -= deduct;
                      remaining -= deduct;
                      newChar.base = { ...newChar.base, elementalShards: currentShards };
                  }
              }

              // 2. 인벤토리 차감
              if (remaining > 0 && newChar.inventory) {
                  let updatedInv = [...newChar.inventory];
                  for (let i = 0; i < updatedInv.length && remaining > 0; i++) {
                      const item = updatedInv[i];
                      if (!item) continue;
                      const name = item.name || '';
                      if (name === `${cleanKey} 조각` || name === `${shortKey} 조각` || name === cleanKey || name === shortKey) {
                          const qty = item.quantity || 1;
                          if (qty <= remaining) {
                              remaining -= qty;
                              updatedInv[i] = null as any;
                          } else {
                              updatedInv[i] = { ...item, quantity: qty - remaining };
                              remaining = 0;
                          }
                      }
                  }
                  newChar.inventory = updatedInv.filter(Boolean);
              }
          }

          // [MODIFIED] 스킬 습득 전 "Full HP/MP" 상태 체크
          const { finalStats: oldFinal } = calculateFinalStats(targetEntity);
          const wasFullHp = targetEntity.stats.hp >= oldFinal.maxHp;
          const wasFullMp = targetEntity.stats.mp >= oldFinal.maxMp;

          // 스킬 추가
          targetEntity.skills = [...targetEntity.skills, newSkill];

          // 스킬 습득 후 "Full HP/MP" 상태 유지
          const { finalStats: newFinal } = calculateFinalStats(targetEntity);
          if (wasFullHp) targetEntity.stats.hp = newFinal.maxHp;
          if (wasFullMp) targetEntity.stats.mp = newFinal.maxMp;

          // [NEW] 스킬 창작/연구 습득 시 연구 전문기술 경험치 획득
          const researchGain = 40 + (nextTier === ClassTier.FINAL ? 60 : nextTier === ClassTier.LAST ? 40 : nextTier === ClassTier.SECOND ? 25 : 15);
          const { newChar: charWithProfExp, leveledUp: profLeveledUp, newLevel } = gainProfessionExp(newChar, 'research', researchGain);
          handleRankUpEffect(profLeveledUp, 'research', newLevel);
          if (profLeveledUp) addToLog(`[시스템] 스킬 연구를 통해 연구 전문기술 레벨이 상승했습니다! (Lv.${newLevel - 1} -> Lv.${newLevel})`);

          if (compIndex >= 0) {
              charWithProfExp.companions[compIndex] = targetEntity as Companion;
              setSkillBookTarget(charWithProfExp.companions[compIndex]);
          }
          setCharacter(charWithProfExp);
      }
  };

  const handleClassNameChange = () => {
    if (!newClassName.trim() || !classNameTargetId) return;
    
    const newChar = { ...character };
    const updateEntity = (entity: any) => {
      if (entity.id === classNameTargetId || (classNameTargetId === 'player' && entity === newChar)) {
        if (selectedClassTier === ClassTier.FIRST) entity.firstClassName = newClassName;
        else if (selectedClassTier === ClassTier.SECOND) entity.secondClassName = newClassName;
        else if (selectedClassTier === ClassTier.LAST) entity.lastClassName = newClassName;
        else if (selectedClassTier === ClassTier.FINAL) entity.finalClassName = newClassName;
      }
    };

    if (classNameTargetId === 'player') updateEntity(newChar);
    else {
      newChar.companions = newChar.companions.map(c => {
        if (c.id === classNameTargetId) {
          const newC = { ...c };
          updateEntity(newC);
          return newC;
        }
        return c;
      });
      if (newChar.inactiveCompanions) {
        newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
          if (c.id === classNameTargetId) {
            const newC = { ...c };
            updateEntity(newC);
            return newC;
          }
          return c;
        });
      }
    }

    setCharacter(newChar);
    setIsClassNameModalOpen(false);
    setNewClassName('');
    addToLog(`[시스템] 클래스명이 '${newClassName}'(으)로 변경되었습니다.`);
  };

  const handleNameChange = () => {
    if (!newName.trim() || !nameChangeTargetId) return;
    
    const newChar = { ...character };
    if (nameChangeTargetId === 'player') {
      newChar.name = newName;
    } else {
      newChar.companions = newChar.companions.map(c => {
        if (c.id === nameChangeTargetId) {
          return { ...c, name: newName };
        }
        return c;
      });
      if (newChar.inactiveCompanions) {
        newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
          if (c.id === nameChangeTargetId) {
            return { ...c, name: newName };
          }
          return c;
        });
      }
    }
    setCharacter(newChar);
    setIsNameChangeModalOpen(false);
    setNewName('');
    addToLog(`[시스템] 이름이 '${newName}'(으)로 변경되었습니다.`);
  };

  const executeBatchItemAction = (actionType: 'sell' | 'discard' | 'use' | 'deposit' | 'withdraw', item: Item, indices: number[]) => {
      const count = indices.length;
      const hasLocked = indices.some(idx => character.inventory[idx]?.locked);
      if (hasLocked && (actionType === 'sell' || actionType === 'discard')) {
          alert("잠금 상태인 아이템이 포함되어 있어 판매하거나 버릴 수 없습니다.");
          return;
      }
      if (actionType === 'sell') {
          let totalPrice = 0;
          indices.forEach(idx => { if (character.inventory[idx]) totalPrice += calculateItemPrice(character.inventory[idx]); });
          const newInventory = character.inventory.filter((_, idx) => !indices.includes(idx));
          const newMoney = character.money + totalPrice;
          setCharacter(prev => ({ ...prev, inventory: newInventory, money: newMoney }));
          addToLog(`[시스템] ${item.name} ${count > 1 ? `x${count} ` : ''}판매 완료. (+${totalPrice.toLocaleString()} G)`);
      } else if (actionType === 'discard') {
          const newInventory = character.inventory.filter((_, idx) => !indices.includes(idx));
          setCharacter(prev => ({ ...prev, inventory: newInventory }));
          addToLog(`[시스템] ${item.name} ${count > 1 ? `x${count} ` : ''}을(를) 버렸습니다.`);
      } else if (actionType === 'use') {
          // [NEW] Dimension Scroll Logic
          if (item.secondaryOptions) {
              const scrollOption = item.secondaryOptions.find(opt => opt.includes('으로 차원이동 주문서'));
              if (scrollOption) {
                  const match = scrollOption.match(/\['(.*?)', '(.*?)' 으로 차원이동 주문서\]/);
                  if (match) {
                      const targetNation = match[1];
                      const targetCity = match[2];
                      
                      const newChar = { ...character };
                      newChar.currentLocation = { 
                          nation: targetNation, 
                          city: targetCity,
                          region: getRegionByNation(targetNation)
                      };
                      
                      const targetIdx = indices[0];
                      let newInventory = [...newChar.inventory];
                      if (targetIdx !== undefined && newInventory[targetIdx] && (newInventory[targetIdx].quantity || 1) > 1) {
                          newInventory[targetIdx] = {
                              ...newInventory[targetIdx],
                              quantity: (newInventory[targetIdx].quantity || 1) - 1
                          };
                      } else {
                          newInventory = newInventory.filter((_, idx) => !indices.includes(idx));
                      }
                      newChar.inventory = newInventory;
                      
                      setCharacter(newChar);
                      addToLog(`[시스템] 차원이동 주문서를 사용하여 ${targetNation}의 ${targetCity}(으)로 이동했습니다.`);
                      return;
                  }
              }

              // [NEW] Base Teleport Scroll Logic
              const baseScrollOption = item.secondaryOptions.find(opt => opt.includes("['기지' 로 차원이동 주문서]"));
              if (baseScrollOption) {
                  if (!character.base || !character.base.location) {
                      addToLog(`[시스템] 기지가 건설되지 않았거나 위치를 알 수 없습니다.`);
                      return;
                  }
                  
                  const newChar = { ...character };
                  newChar.currentLocation = { ...character.base.location };
                  
                  const targetIdx = indices[0];
                  let newInventory = [...newChar.inventory];
                  if (targetIdx !== undefined && newInventory[targetIdx] && (newInventory[targetIdx].quantity || 1) > 1) {
                      newInventory[targetIdx] = {
                          ...newInventory[targetIdx],
                          quantity: (newInventory[targetIdx].quantity || 1) - 1
                      };
                  } else {
                      newInventory = newInventory.filter((_, idx) => !indices.includes(idx));
                  }
                  newChar.inventory = newInventory;
                  
                  setCharacter(newChar);
                  addToLog(`[시스템] 차원이동 주문서를 사용하여 기지(${character.base.location.nation} ${character.base.location.city})로 이동했습니다.`);
                  return;
              }
          }

          const targetCompId = selectedCompanionIndex !== null ? character.companions[selectedCompanionIndex]?.id : null;
          const newChar = { ...character };
          
          let targetEntity: any = newChar;
          if (targetCompId) {
              const compIdx = newChar.companions.findIndex(c => c.id === targetCompId);
              if (compIdx !== -1) targetEntity = newChar.companions[compIdx];
          }

          // [NEW] 심야 암시장 전용 아이템 사용 처리 (잠재력 각성수, 만병통치약, 마정석/마석 보따리, 마력 정수 병, 고대 보물함)
          if (isNightMarketConsumable(item)) {
              const { updatedChar, logMsg } = processNightMarketConsumable(character, item, indices);
              setCharacter(updatedChar);
              addToLog(logMsg);
              return;
          }

          const { hpGain, mpGain, fatigueReduction, newStatusEffects, removeStatus, logMessages,lvlGain, permStatGains, isResetFirstSkills, isResetSecondSkills, isResetLastSkills, isResetFinalSkills, isResetAllSkills, isResetStats, isChangeClassName, isChangeName, isCaptured, capturedMonster } = applyConsumableEffect(targetEntity, item, undefined, newChar.companions);
          
          // [MODIFIED] 전투불능 대상에 대한 아이템 사용 제한 로직 (아이템 소모 방지)
          if (targetEntity.stats.hp <= 0 && logMessages.includes("전투 불능 상태인 대상에게는 사용할 수 없는 아이템입니다.")) {
              addToLog(`[시스템] ${logMessages[0]}`);
              return; 
          }

          // [NEW] 몬스터 포획 처리
          if (isCaptured && capturedMonster) {
            if (!newChar.base) {
              addToLog(`[시스템] 몬스터 사육소가 없어 포획한 몬스터를 수용할 수 없습니다.`);
              return;
            }
            if (!newChar.base.capturedMonsters) newChar.base.capturedMonsters = [];
            newChar.base.capturedMonsters.push(capturedMonster);
            
            // [NEW] 테이밍 숙련도 획득
            const { newChar: charWithExp, leveledUp, newLevel } = gainProfessionExp(newChar, 'taming', 50);
            handleRankUpEffect(leveledUp, 'taming', newLevel);
            const tamingLevel = character.professions?.taming?.level || 1;
            
            addToLog(`[시스템] ${capturedMonster.name} 포획에 성공했습니다! 기지 사육소로 이송되었습니다. (테이밍 숙련도 +50)`);
            if (leveledUp) addToLog(`[시스템] 테이밍 전문기술 레벨이 상승했습니다! (Lv.${tamingLevel} -> Lv.${tamingLevel + 1})`);
            
            // Update newChar with exp gain
            Object.assign(newChar, charWithExp);
          }

          // [NEW] 특수 주문서 효과 처리
          if (isChangeClassName) {
            setClassNameTargetId(targetCompId || 'player');
            setIsClassNameModalOpen(true);
          }
          if (isChangeName) {
            setNameChangeTargetId(targetCompId || 'player');
            setIsNameChangeModalOpen(true);
          }

          if (isResetFirstSkills) {
            targetEntity.skills = targetEntity.skills.filter((s: Skill) => s.tier !== ClassTier.FIRST);
            addToLog(`[시스템: ${targetEntity.name}] 퍼스트 클래스 스킬이 초기화되었습니다.`);
          }

          if (isResetSecondSkills) {
            targetEntity.skills = targetEntity.skills.filter((s: Skill) => s.tier !== ClassTier.SECOND);
            addToLog(`[시스템: ${targetEntity.name}] 세컨드 클래스 스킬이 초기화되었습니다.`);
          }

          if (isResetLastSkills) {
            targetEntity.skills = targetEntity.skills.filter((s: Skill) => s.tier !== ClassTier.LAST);
            addToLog(`[시스템: ${targetEntity.name}] 라스트 클래스 스킬이 초기화되었습니다.`);
          }

          if (isResetFinalSkills) {
            targetEntity.skills = targetEntity.skills.filter((s: Skill) => s.tier !== ClassTier.FINAL);
            addToLog(`[시스템: ${targetEntity.name}] 파이널 클래스 스킬이 초기화되었습니다.`);
          }

          if (isResetAllSkills) {
            targetEntity.skills = targetEntity.skills.filter((s: Skill) => s.tier === ClassTier.NONE);
            addToLog(`[시스템: ${targetEntity.name}] 모든 클래스 스킬이 초기화되었습니다.`);
          }

          if (isResetStats) {
            const totalPoints = resetEntityStats(targetEntity);
            addToLog(`[시스템: ${targetEntity.name}] 스탯 포인트 초기화 완료! (기본 스탯/HP/MP 초기화 및 ${totalPoints} 포인트 지급)`);
          }
  // [NEW] 레벨 상승 처리
          if (lvlGain > 0) {
              for (let i = 0; i < (lvlGain * count); i++) {
                  targetEntity.level += 1;
                  
                  targetEntity.statPoints += 10;
                  targetEntity.stats.maxHp += 20;
                  targetEntity.stats.maxMp += 20;
                  targetEntity.maxExp = getRequiredExp(targetEntity.level);
              }
          }

          // [NEW] 영구 능력치 상승 처리
          if (permStatGains) {
              Object.entries(permStatGains).forEach(([stat, val]) => {
                  const amount = (val as number) * count;
                  const key = stat as keyof Stats;
                  targetEntity.stats[key] += amount;
                  if (key === 'maxHp') targetEntity.stats.hp += amount;
                  if (key === 'maxMp') targetEntity.stats.mp += amount;
              });
          }

          const totalHp = hpGain * count; const totalMp = mpGain * count;
          
          if (fatigueReduction && fatigueReduction > 0) {
              const totalReduction = fatigueReduction * count;
              newChar.fatigue = Math.max(0, Number(((newChar.fatigue || 0) - totalReduction).toFixed(1)));
              addToLog(`[시스템] 피로회복제를 복용하여 피로도가 ${totalReduction} 감소했습니다. (현재 피로도: ${newChar.fatigue}/100)`);
          }
          
          const targetFinalStats = calculateFinalStats(targetEntity).finalStats;

          if (totalHp > 0) targetEntity.stats.hp = Math.min(targetFinalStats.maxHp, targetEntity.stats.hp + totalHp);
          if (totalMp > 0) targetEntity.stats.mp = Math.min(targetFinalStats.maxMp, targetEntity.stats.mp + totalMp);
          
          if (newStatusEffects.length > 0) {
              if (!targetEntity.statusEffects) targetEntity.statusEffects = [];
              const entityId = targetCompId || 'player';
              newStatusEffects.forEach(newEff => {
                  const existingIdx = targetEntity.statusEffects!.findIndex((e: any) => 
                      e.name === newEff.name || 
                      (e.name && newEff.name && e.name.replace(/\s+/g, '').includes(newEff.name.replace(/\s+/g, ''))) ||
                      (e.name && newEff.name && newEff.name.replace(/\s+/g, '').includes(e.name.replace(/\s+/g, '')))
                  );
                  if (existingIdx >= 0) targetEntity.statusEffects![existingIdx] = newEff;
                  else targetEntity.statusEffects!.push(newEff);

                  if (isRealTimeElixir(newEff)) {
                      elixirRealtimeService.registerOrRefreshElixir(entityId, newEff);
                  }
              });
          }
          if (removeStatus.length > 0 && targetEntity.statusEffects) {
              targetEntity.statusEffects = filterDebuffsForCleanse(targetEntity.statusEffects, removeStatus);
          }
          
          const newInventory = newChar.inventory.filter((_, idx) => !indices.includes(idx));
          newChar.inventory = newInventory;
          setCharacter(newChar);
          
          let finalLog = `[시스템: ${targetEntity.name}] ${item.name} x${count} 사용.`;
          if (logMessages.length > 0) { finalLog += ` (${logMessages.join(', ')})`; }
          addToLog(finalLog);
      } else if (actionType === 'deposit') {
          const newChar = { ...character };
          const inv = [...newChar.inventory];
          const storage = [...(newChar.base?.storage || [])];
          
          const itemsToMove = indices.map(idx => inv[idx]);
          const remainingInv = inv.filter((_, idx) => !indices.includes(idx));
          
          newChar.inventory = remainingInv;
          newChar.base = { ...newChar.base!, storage: [...storage, ...itemsToMove] };
          setCharacter(newChar);
          addToLog(`[시스템] ${item.name} x${count} 보관 완료.`);
      } else if (actionType === 'withdraw') {
          const newChar = { ...character };
          const inv = [...newChar.inventory];
          const storage = [...(newChar.base?.storage || [])];
          
          const itemsToMove = indices.map(idx => storage[idx]);
          const remainingStorage = storage.filter((_, idx) => !indices.includes(idx));
          
          newChar.inventory = [...inv, ...itemsToMove];
          newChar.base = { ...newChar.base!, storage: remainingStorage };
          setCharacter(newChar);
          addToLog(`[시스템] ${item.name} x${count} 꺼내기 완료.`);
      }
  };

  const handleQuantityConfirm = (quantity: number) => {
      const { item, indices, actionType } = quantityModal;
      if (!item) return;
      const indicesToProcess = indices.slice(0, quantity);
      executeBatchItemAction(actionType, item, indicesToProcess);
      setQuantityModal({ ...quantityModal, isOpen: false });
  };

   const handleItemAction = (actionType: 'use' | 'sell' | 'discard' | 'equip' | 'sell_all' | 'deposit' | 'withdraw', item: Item, index: number | number[]) => {
       const indices = Array.isArray(index) ? index : [index];
       const primaryIndex = indices[0];
       const hasLocked = indices.some(idx => character.inventory[idx]?.locked);
       if (hasLocked && (actionType === 'sell' || actionType === 'discard' || actionType === 'sell_all')) {
           alert("잠금 상태인 아이템이 포함되어 있어 판매하거나 버릴 수 없습니다.");
           return;
       }
       if (actionType === 'use') { 
           if (item.name.includes('포획 그물') && combatState && combatState.type !== 'normal') {
               addToLog(`[시스템] 포획 그물은 일반 전투(Normal)에서만 사용할 수 있습니다.`);
               return;
           }
           if (indices.length > 1) { setQuantityModal({ isOpen: true, item, indices, actionType: 'use' }); } else { executeBatchItemAction('use', item, indices); } 
       } 
       else if (actionType === 'equip') { handleEquipItem(primaryIndex); } 
       else if (actionType === 'sell') { if (indices.length > 1) { setQuantityModal({ isOpen: true, item, indices, actionType: 'sell' }); } else { executeBatchItemAction('sell', item, indices); } } 
       else if (actionType === 'sell_all') { if (confirm(`${item.name} ${indices.length}개를 모두 판매하시겠습니까?`)) { executeBatchItemAction('sell', item, indices); } } 
       else if (actionType === 'discard') { if (indices.length > 1) { setQuantityModal({ isOpen: true, item, indices, actionType: 'discard' }); } else { executeBatchItemAction('discard', item, indices); } }
       else if (actionType === 'deposit') { if (indices.length > 1) { setQuantityModal({ isOpen: true, item, indices, actionType: 'deposit' }); } else { executeBatchItemAction('deposit', item, indices); } }
       else if (actionType === 'withdraw') { if (indices.length > 1) { setQuantityModal({ isOpen: true, item, indices, actionType: 'withdraw' }); } else { executeBatchItemAction('withdraw', item, indices); } }
   };

  const handleToggleItemLock = (itemIndex: number | number[]) => {
      const indices = Array.isArray(itemIndex) ? itemIndex : [itemIndex];
      setCharacter(prev => {
          const newInventory = [...prev.inventory];
          if (indices.length === 0) return prev;

          const primaryIdx = indices[0];
          const targetItem = newInventory[primaryIdx];
          if (!targetItem) return prev;

          const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
          const isStackable = !equipTypes.includes(targetItem.type);

          let targetIndices = [...indices];
          if (isStackable) {
              targetIndices = newInventory
                  .map((it, idx) => (it.name === targetItem.name && it.rarity === targetItem.rarity && it.type === targetItem.type) ? idx : -1)
                  .filter(idx => idx !== -1);
          }

          const isLocked = !targetItem.locked;
          targetIndices.forEach(idx => {
              if (newInventory[idx]) {
                  newInventory[idx] = {
                      ...newInventory[idx],
                      locked: isLocked
                  };
              }
          });

          addToLog(`[시스템] ${targetItem.name}${targetIndices.length > 1 ? ` (${targetIndices.length}개)` : ''}을(를) ${isLocked ? '잠금' : '잠금 해제'} 처리했습니다.`);
          return { ...prev, inventory: newInventory };
      });
  };

  const handleToggleItemFavorite = (itemIndex: number | number[]) => {
      const indices = Array.isArray(itemIndex) ? itemIndex : [itemIndex];
      setCharacter(prev => {
          const newInventory = [...prev.inventory];
          if (indices.length === 0) return prev;

          const primaryIdx = indices[0];
          const targetItem = newInventory[primaryIdx];
          if (!targetItem) return prev;

          const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
          const isStackable = !equipTypes.includes(targetItem.type);

          let targetIndices = [...indices];
          if (isStackable) {
              targetIndices = newInventory
                  .map((it, idx) => (it.name === targetItem.name && it.rarity === targetItem.rarity && it.type === targetItem.type) ? idx : -1)
                  .filter(idx => idx !== -1);
          }

          const isFav = !targetItem.favorite;
          targetIndices.forEach(idx => {
              if (newInventory[idx]) {
                  newInventory[idx] = {
                      ...newInventory[idx],
                      favorite: isFav
                  };
              }
          });

          addToLog(`[시스템] ${targetItem.name}${targetIndices.length > 1 ? ` (${targetIndices.length}개)` : ''}을(를) 즐겨찾기 ${isFav ? '등록' : '해제'}했습니다.`);
          return { ...prev, inventory: newInventory };
      });
  };

  const handleToggleFavoriteCompanion = (companionId: string) => {
      setCharacter(prev => {
          const isCompanion = prev.companions.some(c => c.id === companionId);
          if (isCompanion) {
              const updatedCompanions = prev.companions.map(c => {
                  if (c.id === companionId) {
                      const isFav = !c.favorite;
                      addToLog(`[시스템] 동료 ${c.name}을(를) 즐겨찾기 ${isFav ? '등록' : '해제'}했습니다.`);
                      return { ...c, favorite: isFav };
                  }
                  return c;
              });
              return { ...prev, companions: updatedCompanions };
          }
          const isInactive = (prev.inactiveCompanions || []).some(c => c.id === companionId);
          if (isInactive) {
              const updatedInactive = (prev.inactiveCompanions || []).map(c => {
                  if (c.id === companionId) {
                      const isFav = !c.favorite;
                      addToLog(`[시스템] 대기 중인 동료 ${c.name}을(를) 즐겨찾기 ${isFav ? '등록' : '해제'}했습니다.`);
                      return { ...c, favorite: isFav };
                  }
                  return c;
              });
              return { ...prev, inactiveCompanions: updatedInactive };
          }
          return prev;
      });
  };


  const handleAutoSellItems = (maxRarity: ItemRarity, categories: string[]) => {
      const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
      const consumTypes = ['Consumable', '소비', '물약', '음식', '소모품'];
      
      const rarityPriority: Record<ItemRarity, number> = {
          [ItemRarity.NORMAL]: 1,
          [ItemRarity.MAGIC]: 2,
          [ItemRarity.RARE]: 3,
          [ItemRarity.EPIC]: 4,
          [ItemRarity.UNIQUE]: 5,
          [ItemRarity.LEGENDARY]: 6,
          [ItemRarity.MYTHTIC]: 7,
      };

      const maxPriority = rarityPriority[maxRarity] || 1;

      let soldCount = 0;
      let totalEarned = 0;
      const indicesToSell: number[] = [];

      character.inventory.forEach((item, index) => {
          if (item.locked) return;

          const itemPriority = rarityPriority[item.rarity] || 1;
          if (itemPriority > maxPriority) return;

          let matchesCategory = false;
          if (categories.includes('equip') && equipTypes.includes(item.type)) {
              matchesCategory = true;
          }
          if (categories.includes('consumable') && consumTypes.includes(item.type)) {
              matchesCategory = true;
          }
          if (categories.includes('etc') && !equipTypes.includes(item.type) && !consumTypes.includes(item.type)) {
              matchesCategory = true;
          }

          if (matchesCategory) {
              indicesToSell.push(index);
              totalEarned += calculateItemPrice(item);
              soldCount++;
          }
      });

      if (indicesToSell.length === 0) {
          return;
      }

      const newInventory = character.inventory.filter((_, idx) => !indicesToSell.includes(idx));
      const newMoney = character.money + totalEarned;
      setCharacter(prev => ({ ...prev, inventory: newInventory, money: newMoney }));
      addToLog(`[시스템] 일괄 판매를 통해 아이템 ${soldCount}개를 판매했습니다. (+${totalEarned.toLocaleString()} G)`);
  };

  const handleEquipItem = (itemIndex: number) => {
      const item = character.inventory[itemIndex]; if (!item) return;

      const isMythicItem = item.rarity === ItemRarity.MYTHTIC || (item as any).isMythic || String(item.rarity || '').includes('신화');
      if (isMythicItem) {
          const isLevelMet = (character.level || 1) >= 1000;
          const isPotentialLocked = Boolean((character as any).isPotentialLocked);
          const isFinalMet = character.classTier === ClassTier.FINAL || character.hasClearedFinalTrial || character.finalTrialCleared;
          if (!isLevelMet || (!isFinalMet && !isPotentialLocked)) {
              setResultModalData({
                  type: 'warning',
                  title: '신화 장비 착용 불가',
                  message: '신화 등급 장비는 레벨 1000 이상이면서 파이널 클래스를 해방했거나, 잠재력 제한을 설정한 자만 착용할 수 있습니다.',
                  items: [
                      { label: '요구 레벨', after: `1000 이상 (현재 레벨 ${character.level || 1})` },
                      { label: '요구 자격', after: isPotentialLocked ? '잠재력 제한 완료 (착용 가능)' : `파이널 클래스 해방 또는 잠재력 제한 (현재 ${character.classTier || '미개방'})` }
                  ]
              });
              return;
          }
      }

      const masteryCheck = checkWeaponMasteryEquipRequirement(item, character);
      if (!masteryCheck.allowed) {
          setResultModalData({
              type: 'warning',
              title: '무기 숙련도 부족',
              message: `[${masteryCheck.weaponTypeLabel || '해당 무기'}] 숙련도가 부족하여 장착할 수 없습니다. (전설 무기: 숙련도 50 이상 / 신화 무기: 숙련도 100 이상 필요)`,
              items: [
                  { label: '무기 종류', after: masteryCheck.weaponTypeLabel || '무기' },
                  { label: '요구 숙련도', after: `Lv.${masteryCheck.required} 이상 (현재 Lv.${masteryCheck.current})` }
              ]
          });
          return;
      }

      const updatedChar = { ...character }; const newInventory = [...updatedChar.inventory]; const newEquipment = { ...updatedChar.equipment };
      let slotKey: 'weapon' | 'subWeapon' | 'head' | 'body' | 'feet' | 'hand' | 'accessory' | null = null;
      const t = item.type ? item.type.toLowerCase() : "";
      if (t.includes('sub') || t.includes('보조') || t.includes('방패')) slotKey = 'subWeapon';
      else if (t.includes('weapon') || t.includes('무기')) slotKey = 'weapon';
      else if (t.includes('head') || t.includes('머리') || t.includes('투구') || t.includes('모자')) slotKey = 'head';
      else if (t.includes('body') || t.includes('몸') || t.includes('갑옷') || t.includes('상의') || t.includes('하의') || t.includes('의복')) slotKey = 'body';
      else if (t.includes('hand') || t.includes('손') || t.includes('장갑')) slotKey = 'hand';
      else if (t.includes('feet') || t.includes('발') || t.includes('신발') || t.includes('부츠')) slotKey = 'feet';
      else if (t.includes('accessory') || t.includes('악세') || t.includes('장신구') || t.includes('반지') || t.includes('목걸이')) slotKey = 'accessory';
      
      if (slotKey) { 
          const currentEquip = newEquipment[slotKey]; 
          if (currentEquip) newInventory.push(currentEquip); 
          newEquipment[slotKey] = item; 
          newInventory.splice(itemIndex, 1); 
          updatedChar.inventory = newInventory; 
          updatedChar.equipment = newEquipment; 



          setCharacter(updatedChar); 
      } 
      else { alert("장착할 수 없는 아이템입니다."); }
  };

  const handleUnequipItem = (slot: string) => {
      const updatedChar = { ...character };
      
      // [NEW] Handle mount unequip
      if (slot === 'mount') {
          if (updatedChar.mountedMonster) {
              const monster = updatedChar.mountedMonster;
              
              monster.isMountedAsMount = false;
              updatedChar.mountedMonsterId = undefined;
              updatedChar.mountedMonster = undefined;
              
              if (updatedChar.companions.length >= MAX_PARTY_SIZE) {
                  if (!updatedChar.inactiveCompanions) updatedChar.inactiveCompanions = [];
                  updatedChar.inactiveCompanions.push(monster);
                  setResultModalData({
                      type: 'success',
                      title: '탈것 해제',
                      message: `${monster.name}을(를) 탈것에서 해제했습니다. 파티가 가득 차서 대기실로 이동했습니다.`,
                      items: [{ label: '상태', after: '대기실로 복귀' }]
                  });
              } else {
                  updatedChar.companions.push(monster);
                  setResultModalData({
                      type: 'success',
                      title: '탈것 해제',
                      message: `${monster.name}을(를) 탈것에서 해제했습니다.`,
                      items: [{ label: '상태', after: '동료 목록으로 복귀' }]
                  });
              }
              
              handleUpdateCharacter(updatedChar, `[탈것] ${monster.name}을(를) 장착 해제했습니다.`);
          }
          return;
      }

      if (updatedChar.inventory.length >= calculateInventorySize(updatedChar.stats)) { 
          setResultModalData({
              type: 'warning',
              title: '인벤토리 가득 참',
              message: '인벤토리가 가득 차서 장비를 해제할 수 없습니다.',
              items: []
          });
          return; 
      }
      
      // [MODIFIED] 해제 전 "Full HP/MP" 상태 체크
      const { finalStats: oldFinal } = calculateFinalStats(updatedChar);
      const wasFullHp = updatedChar.stats.hp >= oldFinal.maxHp;
      const wasFullMp = updatedChar.stats.mp >= oldFinal.maxMp;

      const newEquipment = { ...updatedChar.equipment };
      const item = newEquipment[slot as keyof typeof newEquipment];
      if (item) { 
          updatedChar.inventory = [...updatedChar.inventory, item]; 
          delete newEquipment[slot as keyof typeof newEquipment]; 
          updatedChar.equipment = newEquipment; 

            // [MODIFIED] 해제 후 현재 HP/MP가 새로운 최대치를 초과하지 않도록 보정 (Math.min 적용)
          const { finalStats: newFinal } = calculateFinalStats(updatedChar);
          updatedChar.stats.hp = Math.min(updatedChar.stats.hp, newFinal.maxHp);
          updatedChar.stats.mp = Math.min(updatedChar.stats.mp, newFinal.maxMp);

          setCharacter(updatedChar); 
          setResultModalData({
              type: 'success',
              title: '장비 해제',
              message: `${item.name}을(를) 해제했습니다.`,
              items: [{ label: '장착 부위', after: slot }]
          });
      }
  };

  useEffect(() => {
    if (character.base && character.base.level === 5 && character.base.gridSize < 7) {
      setCharacter(prev => {
        if (!prev.base || prev.base.level !== 5 || prev.base.gridSize >= 7) return prev;
        return {
          ...prev,
          base: {
            ...prev.base,
            gridSize: 7
          }
        };
      });
      addToLog("[시스템] 기지 부지 면적이 Lv.5 사양(7x7)으로 자동 조정되었습니다.");
    }
  }, [character.base?.level, character.base?.gridSize]);

  const handleBasePurchase = () => {
      // [MODIFIED] Check age requirement (17+)
      const ageNum = parseInt(character.age.replace(/[^0-9]/g, '')) || 0;
      if (ageNum < 17) {
          alert("기지 건설은 만 17세 이상부터 가능합니다.");
          return;
      }
      
      const cost = BASE_LEVEL_CONFIG[0].cost;
      if (character.money < cost) return alert("골드가 부족합니다.");
      const newChar = { ...character, money: character.money - cost, base: { ...INITIAL_BASE, location: character.currentLocation } };
      setCharacter(newChar); addToLog(`[시스템] ${character.currentLocation?.city}에 기지를 건설했습니다!`);
  };

  const handleBaseUpgrade = () => {
      if (!character.base) return;
      const nextLevel = character.base.level + 1;
      const config = BASE_LEVEL_CONFIG[nextLevel];
      if (!config) return alert("더 이상 업그레이드할 수 없습니다.");
      
      const resCost = BASE_UPGRADE_COSTS[nextLevel];
      if (resCost) {
          const res = character.base.resources;
          if (res.food < resCost.food || res.wood < resCost.wood || res.stone < resCost.stone || res.iron < resCost.iron || res.manaCrystal < resCost.manaCrystal) {
              return alert("자원이 부족합니다.");
          }
      }

      if (character.money < config.cost) return alert("골드가 부족합니다.");
      if (character.level < config.requiredLevel) return alert("레벨이 부족합니다.");
      
      setCharacter(prev => {
          if (!prev.base) return prev;
          const nextRes = { ...prev.base.resources };
          if (resCost) {
              nextRes.food -= resCost.food;
              nextRes.wood -= resCost.wood;
              nextRes.stone -= resCost.stone;
              nextRes.iron -= resCost.iron;
              nextRes.manaCrystal -= resCost.manaCrystal;
          }

          return {
              ...prev,
              money: prev.money - config.cost,
              base: {
                  ...prev.base,
                  level: nextLevel,
                  gridSize: config.gridSize,
                  resources: nextRes
              }
          };
      });
      addToLog(`[시스템] 기지가 Lv.${nextLevel} (${config.description})로 업그레이드되었습니다. (부지 면적 확장)`);
  };

  const handleExpandGrid = () => {
      if (!character.base || character.base.level < 5) return;
      
      const currentSize = character.base.gridSize || 3;
      
      // [NEW] Lv.5인데 부지가 7x7 미만인 경우 무료 복구 로직
      if (character.base.level === 5 && currentSize < 7) {
          setCharacter(prev => {
              if (!prev.base) return prev;
              return {
                  ...prev,
                  base: {
                      ...prev.base,
                      gridSize: 7
                  }
              };
          });
          addToLog("[시스템] 기지 부지 면적이 Lv.5 사양(7x7)으로 복구되었습니다.");
          return;
      }

      const nextSize = currentSize + 1;
      if (nextSize > 10) return alert("더 이상 부지를 확장할 수 없습니다.");
      
      const cost = BASE_GRID_EXPANSION_COSTS[nextSize];
      if (!cost) return;
      
      const res = character.base.resources;
      if (character.money < cost.gold ||
          res.food < cost.food ||
          res.wood < cost.wood ||
          res.stone < cost.stone ||
          res.iron < cost.iron ||
          res.manaCrystal < cost.manaCrystal) {
          return alert("자원이 부족합니다.");
      }
      
      const durationMinutes = getBaseGridExpansionDuration(nextSize);
      const { completionDate, completionTime } = calculateCompletionDateTime(
          character.currentDate || '2000-03-02',
          character.currentTime || '08:00',
          durationMinutes
      );

      setCharacter(prev => {
          if (!prev.base) return prev;
          const nextRes = { ...prev.base.resources };
          nextRes.food -= cost.food;
          nextRes.wood -= cost.wood;
          nextRes.stone -= cost.stone;
          nextRes.iron -= cost.iron;
          nextRes.manaCrystal -= cost.manaCrystal;

          return {
              ...prev,
              money: prev.money - cost.gold,
              base: {
                  ...prev.base,
                  resources: nextRes,
                  gridExpansionUnderConstruction: true,
                  targetGridSize: nextSize,
                  gridExpansionStartDate: prev.currentDate || '2000-03-02',
                  gridExpansionStartTime: prev.currentTime || '08:00',
                  gridExpansionCompletionDate: completionDate,
                  gridExpansionCompletionTime: completionTime,
                  gridExpansionTotalMinutes: durationMinutes
              }
          };
      });
      const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
      addToLog(`[기지] 부지 ${nextSize}x${nextSize} 확장 공사를 시작했습니다! (소요 시간: ${rem.text}, 완공 예정: ${completionDate} ${completionTime})`);
  };

  const handleReturnToFarm = () => {
      if (selectedCompanionIndex === null) return;
      const comp = character.companions[selectedCompanionIndex];
      
      const isGuardian = comp.classType === "성전 수호자"; 
      const newChar = { ...character };
      const newInventory = [...newChar.inventory]; 
      Object.values(comp.equipment).forEach(item => { if (item) newInventory.push(item); });

      if (isGuardian) {
          const bossName = comp.name.replace('[수호수] ', '').trim();
          const guardianId = `${bossName}_${character.currentLocation?.nation}`;
          
          if (!newChar.base) newChar.base = { ...INITIAL_BASE };
          if (!newChar.base.guardianData) newChar.base.guardianData = {};
          
          newChar.base.guardianData[guardianId] = {
              level: comp.level,
              stats: { ...comp.stats },
              affection: comp.affection,
              trainCount: (newChar.base.guardianData[guardianId] as any)?.trainCount || 0
          };

          const newCompanions = [...newChar.companions];
          newCompanions.splice(selectedCompanionIndex, 1);
          newChar.companions = newCompanions;
          newChar.inventory = newInventory;
          
          setCharacter(newChar);
          setSelectedCompanionIndex(null);
          addToLog(`[시스템] 수호수 ${comp.name}을(를) 성전으로 돌려보냈습니다. (성장 정보 동기화 완료)`);
      } else {
          if (!comp.isMonster && comp.race !== '몬스터' && !comp.monsterData) { alert("이 동료는 몬스터가 아닙니다."); return; }
          const baseMonsterData = comp.monsterData || { id: comp.id, name: comp.name, hp: comp.stats.hp, maxHp: comp.stats.maxHp, level: comp.level, stats: comp.stats, shinryokuType: comp.shinryokuType, skills: comp.skills, statusEffects: [], rank: 'C', affection: comp.affection, isTamed: true, capturedDate: character.currentDate || 'Unknown', stage: comp.classType as any, nickname: undefined, trainingLog: undefined } as CapturedMonster;
          const updatedMonster: CapturedMonster = { ...baseMonsterData, id: comp.id, nickname: comp.name !== baseMonsterData.name ? comp.name : baseMonsterData.nickname, level: comp.level, currentExp: comp.currentExp, maxExp: comp.maxExp, stats: comp.stats, hp: comp.stats.hp, maxHp: comp.stats.maxHp, affection: comp.affection, skills: comp.skills, trainingLog: baseMonsterData.trainingLog || { str:0, int:0, def:0, agi:0, magic:0 } };
          const newCompanions = [...newChar.companions]; newCompanions.splice(selectedCompanionIndex, 1);
          const newBase = { ...newChar.base! }; if (!newBase.capturedMonsters) newBase.capturedMonsters = []; newBase.capturedMonsters.push(updatedMonster);
          newChar.inventory = newInventory;
          newChar.companions = newCompanions;
          newChar.base = newBase;
          setCharacter(newChar);
          setSelectedCompanionIndex(null);
          addToLog(`[시스템] ${comp.name}을(를) 몬스터 사육소로 되돌려 보냈습니다.`);
      }
  };
const handleEquipTitle = (targetId: string, titleId: string | undefined) => {
    const newChar = { ...character };
    if (targetId === 'player') {
      newChar.equippedTitleId = titleId;
    } else {
      const updateComp = (c: Companion) => {
        if (c.id === targetId) {
          if (c.isMonster && titleId) {
             alert("몬스터는 칭호를 장착할 수 없습니다.");
             return c;
          }
          return { ...c, equippedTitleId: titleId };
        }
        return c;
      };
      newChar.companions = newChar.companions.map(updateComp);
      if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateComp);
    }
    setCharacter(newChar);
  };

  // ... rest of component logic (useEffect for ambush etc)

  const handleFacilityUpgrade = (facilityOrInstanceId: string) => {
      if (!character.base) return;
      
      // Check if it's an instance ID or a facility type
      const instance = character.base.layout?.find(inst => inst.id === facilityOrInstanceId);
      const facilityId = instance ? instance.type : facilityOrInstanceId;
      
      const currentLevel = instance ? instance.level : (character.base.facilityLevels?.[facilityId] || 1);
      const nextLevel = currentLevel + 1;
      const config = FACILITY_UPGRADE_CONFIG[facilityId];
      if (!config) return;
      if (nextLevel > config.maxLevel) return alert("이미 최대 레벨입니다.");
      
      const woodCost = config.woodCost * currentLevel; 
      const stoneCost = config.stoneCost * currentLevel; 
      const goldCost = config.goldCost * currentLevel; 
      const foodCost = config.foodCost * currentLevel; 
      const manaCost = config.manaCost * currentLevel;
      
      const res = character.base.resources; 
      const missing = [];
      if (res.wood < woodCost) missing.push(`목재 ${woodCost - res.wood}`);
      if (res.stone < stoneCost) missing.push(`석재 ${stoneCost - res.stone}`);
      if (character.money < goldCost) missing.push(`골드 ${goldCost - character.money}`);
      if (res.food < foodCost) missing.push(`식량 ${foodCost - res.food}`);
      if (res.manaCrystal < manaCost) missing.push(`마정석 ${manaCost - res.manaCrystal}`);
      
      if (missing.length > 0) { 
          setResultModalData({ 
              type: 'warning', 
              title: '자원 부족', 
              message: '시설 업그레이드에 필요한 자원이 부족합니다.', 
              items: missing.map(m => ({ label: '부족', after: m })) 
          }); 
          return; 
      }
      
      const newChar = { ...character }; 
      const newBase = { ...newChar.base! }; 
      newBase.resources = { 
          ...newBase.resources, 
          wood: newBase.resources.wood - woodCost, 
          stone: newBase.resources.stone - stoneCost, 
          food: newBase.resources.food - foodCost, 
          manaCrystal: newBase.resources.manaCrystal - manaCost 
      }; 
      newChar.money -= goldCost;
      
      if (!newBase.facilityLevels) newBase.facilityLevels = {}; 
      newBase.facilityLevels[facilityId] = nextLevel;
      
      // Sync with layout instances
      if (newBase.layout) {
          newBase.layout = newBase.layout.map(inst => {
              if (instance) {
                  // If we upgraded a specific instance
                  return inst.id === facilityOrInstanceId ? { ...inst, level: nextLevel } : inst;
              } else {
                  // If we upgraded a facility type globally
                  return inst.type === facilityId ? { ...inst, level: nextLevel } : inst;
              }
          });
      }

      newChar.base = newBase; 
      setCharacter(newChar);
      
      const facilityName = FACILITIES_INFO.find(f => f.id === facilityId)?.name || facilityId;
      addToLog(`[시스템] ${facilityName} 시설이 Lv.${nextLevel}로 업그레이드되었습니다.`);
      setResultModalData({ 
          type: 'success', 
          title: '시설 업그레이드 완료!', 
          message: `${facilityName}의 기능이 향상되었습니다.`, 
          items: [ { label: '레벨', before: `Lv.${currentLevel}`, after: `Lv.${nextLevel}` } ] 
      });
  };

  const handleItemEnhancement = (itemIndex: number) => {
      const item = character.inventory[itemIndex]; if (!item) return;
      const currentEnh = item.enhancement || 0; const maxEnh = ENHANCEMENT_CAPS[item.rarity] || 5;
      if (currentEnh >= maxEnh) return alert("이미 최대 강화 수치입니다.");
      const ironCost = (currentEnh + 1) * 5; const rarityMult: Record<string, number> = { [ItemRarity.NORMAL]: 1, [ItemRarity.MAGIC]: 2, [ItemRarity.RARE]: 5, [ItemRarity.EPIC]: 10, [ItemRarity.UNIQUE]: 20, [ItemRarity.LEGENDARY]: 50 };
      const goldCost = (currentEnh + 1) * 100 * (rarityMult[item.rarity] || 1);
      const needsManaCrystal = currentEnh >= 10; let manaCost = needsManaCrystal ? (currentEnh + 1) : 0;
      if (item.rarity === ItemRarity.LEGENDARY && currentEnh >= 10) manaCost *= 2; 
      const missing = []; if ((character.base?.resources.iron || 0) < ironCost) missing.push(`철광석 ${ironCost - (character.base?.resources.iron || 0)}개`); if ((character.money || 0) < goldCost) missing.push(`골드 ${(goldCost - (character.money || 0)).toLocaleString()}G`); if (needsManaCrystal && (character.base?.resources.manaCrystal || 0) < manaCost) missing.push(`마정석 ${manaCost - (character.base?.resources.manaCrystal || 0)}개`);
      if (missing.length > 0) { setResultModalData({ type: 'warning', title: '재료 부족', message: '강화에 필요한 재료가 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) }); return; }
      let baseRate = ENHANCEMENT_CONFIG.baseSuccess(currentEnh + 1); 
      const workshopInstances = character.base?.layout?.filter(inst => inst.type === 'workshop') || [];
      const totalWorkshopLevel = calculateTotalWorkshopCapacity(character.base);
      const bestWorkshop = workshopInstances.sort((a, b) => b.level - a.level)[0];
      const assigneeId = bestWorkshop ? character.base?.assignments?.[bestWorkshop.id] : character.base?.assignments?.['workshop'];
      const assignee = character.inactiveCompanions?.find(c => c.id === assigneeId);
      const workerStats = assignee ? calculateFinalStats(assignee).finalStats : { ctrl: 0 } as Stats; 
      
      // [NEW] 제작소 총 레벨에 따른 강화 확률 보너스 (레벨당 0.5%)
      const workshopRateBonus = totalWorkshopLevel * 0.5;
      if (assignee) baseRate += (workerStats.ctrl || 0) * 0.01;
      baseRate += workshopRateBonus;
      const penalty = (currentEnh + 1) * 2; const rarityMod = ENHANCEMENT_CONFIG.rarityMod[item.rarity] || 0; const pityBonus = (item.failureCount || 0) * 2;
      let finalSuccessRate = baseRate - penalty + rarityMod + pityBonus ; if ((item.failureCount || 0) >= 5) finalSuccessRate = 100; finalSuccessRate = Math.max(1, Math.min(100, finalSuccessRate));
      const roll = Math.random() * 100; const success = roll < finalSuccessRate;
      const newInventory = [...character.inventory]; let msg = ""; let resultData: ResultData;
      if (success) {
          const nextLevel = currentEnh + 1; let updatedItem = { ...item, enhancement: nextLevel, failureCount: 0 };
          if (!updatedItem.stats || Object.keys(updatedItem.stats).length === 0) { const possibleStats = ['str', 'int', 'def', 'agi', 'wis', 'ctrl']; const randomStat = possibleStats[Math.floor(Math.random() * possibleStats.length)]; updatedItem.stats = { [randomStat]: 1 }; }
          let unlockMsg = ""; const newSecondaryOptions = [...(updatedItem.secondaryOptions || [])];
          if (nextLevel === 5) { const opts = ["물리 공격력 +3%", "마법 공격력 +3%", "물리 방어력 +3%", "마법 방어력 +3%"]; const selected = opts[Math.floor(Math.random() * opts.length)]; newSecondaryOptions.push(selected); unlockMsg = selected; }
          else if (nextLevel === 8) { newSecondaryOptions.push("치명타 확률 +2%"); unlockMsg = "치명타 +2%"; }
          else if (nextLevel === 10) { newSecondaryOptions.push("최종 능력치 +5%"); unlockMsg = "능력치 +5%"; }
          else if (nextLevel === 15) { newSecondaryOptions.push("상태이상 +5%"); unlockMsg = "상태이상 +5%"; }
          else if (nextLevel === 20) { newSecondaryOptions.push("최종 능력치 +13%"); unlockMsg = "능력치 +13%"; }
          updatedItem.secondaryOptions = unlockMsg ? [...(updatedItem.secondaryOptions || []), unlockMsg] : updatedItem.secondaryOptions; newInventory[itemIndex] = updatedItem;
          msg = `[시스템] ${item.name} 강화 성공! (+${nextLevel})`;
          const cpDelta = calculateItemCPDelta(item, updatedItem, character);
          const cpSign = cpDelta.diff >= 0 ? `+${cpDelta.diff.toLocaleString()}` : `${cpDelta.diff.toLocaleString()}`;
          resultData = { 
              type: 'success', 
              title: '장비 강화 성공!', 
              message: `${item.name}의 성능이 향상되었습니다.`, 
              items: [ 
                  { label: '강화 수치', before: `+${currentEnh}`, after: `+${nextLevel}` },
                  { label: '전투력 변동', before: `${cpDelta.oldCP.toLocaleString()}`, after: `${cpDelta.newCP.toLocaleString()} (${cpSign})`, color: cpDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400' }
              ] 
          };
          if (unlockMsg) resultData.items.push({ label: '옵션 개방', after: unlockMsg });
          setResultActionContext({ type: 'enhance', args: [itemIndex] });
      } else {
          const safetyZone = ENHANCEMENT_CONFIG.safetyZone[item.rarity]; const canBreak = currentEnh >= 6; let resultType = "fail"; if (canBreak) { const destructionRate = ENHANCEMENT_CONFIG.destructionRate(currentEnh); if (Math.random() * 100 < destructionRate) resultType = "destroy"; else resultType = "downgrade"; } else if (currentEnh >= safetyZone) resultType = "downgrade"; else resultType = "safe_fail";
          if (resultType === "destroy") { 
              newInventory.splice(itemIndex, 1); 
              msg = `[시스템] 대실패! ${item.name}이(가) 파괴되었습니다...`; 
              const cpDelta = calculateItemCPDelta(item, null, character);
              resultData = { 
                  type: 'destroy', 
                  title: '장비 파괴...', 
                  message: '강화 대실패로 인해 장비가 소멸했습니다.', 
                  items: [ 
                      { label: '결과', after: '파괴됨' },
                      { label: '전투력 변동', before: `${cpDelta.oldCP.toLocaleString()}`, after: `0 (${cpDelta.diff.toLocaleString()})`, color: 'text-red-500' }
                  ] 
              }; 
              setResultActionContext(null); 
          } 
          else if (resultType === "downgrade") { 
              const newLevel = Math.max(0, currentEnh - 1); 
              let downgradedOptions = [...(item.secondaryOptions || [])]; 
              const milestones = [5, 8, 10, 15, 20]; 
              let lostOpt = ""; 
              if (milestones.includes(currentEnh)) lostOpt = downgradedOptions.pop() || ""; 
              const downgradedItem = { ...item, enhancement: newLevel, secondaryOptions: downgradedOptions, failureCount: (item.failureCount || 0) + 1 };
              newInventory[itemIndex] = downgradedItem; 
              msg = `[시스템] 강화 실패... 수치 하락 (+${currentEnh} -> +${newLevel})`; 
              const cpDelta = calculateItemCPDelta(item, downgradedItem, character);
              const cpSign = cpDelta.diff >= 0 ? `+${cpDelta.diff.toLocaleString()}` : `${cpDelta.diff.toLocaleString()}`;
              resultData = { 
                  type: 'failure', 
                  title: '강화 실패 (수치 하락)', 
                  message: '강화에 실패하여 수치가 떨어졌습니다.', 
                  items: [ 
                      { label: '강화 수치', before: `+${currentEnh}`, after: `+${newLevel}` },
                      { label: '전투력 변동', before: `${cpDelta.oldCP.toLocaleString()}`, after: `${cpDelta.newCP.toLocaleString()} (${cpSign})`, color: cpDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400' }
                  ] 
              }; 
              if (lostOpt) resultData.items.push({ label: '옵션 소실', after: lostOpt }); 
              setResultActionContext({ type: 'enhance', args: [itemIndex] }); 
          } 
          else { 
              newInventory[itemIndex] = { ...item, failureCount: (item.failureCount || 0) + 1 }; 
              msg = `[시스템] 강화 실패... (안전 구간 유지)`; 
              resultData = { 
                  type: 'failure', 
                  title: '강화 실패', 
                  message: '강화에 실패했지만 수치는 유지되었습니다.', 
                  items: [ 
                      { label: '강화 수치', before: `+${currentEnh}`, after: `+${currentEnh}` },
                      { label: '전투력 변동', after: '변동 없음', color: 'text-slate-400' }
                  ] 
              }; 
              setResultActionContext({ type: 'enhance', args: [itemIndex] }); 
          }
      }
      const newChar = { ...character, inventory: newInventory, money: character.money - goldCost, base: { ...character.base!, resources: { ...character.base!.resources, iron: character.base!.resources.iron - ironCost, manaCrystal: character.base!.resources.manaCrystal - manaCost } } };
      setCharacter(newChar); addToLog(msg); setResultModalData(resultData); 
  };
  const handleSkillResearch = (skillIndex: number, targetId: string) => {
      const labLevel = calculateTotalLabLevel(character.base);
      const researcherBonus = calculateResearcherBonus(character);
      let targetEntity: Character | Companion | undefined;
      let isPlayer = false;
      let compIndex = -1;
      let isInactive = false;
      let isBond = false;

      if (targetId === 'player') { targetEntity = character; isPlayer = true; } 
      else if (targetId === 'bond') { targetEntity = character; isBond = true; }
      else { 
          compIndex = character.companions.findIndex(c => c.id === targetId); 
          if (compIndex >= 0) { targetEntity = character.companions[compIndex]; } 
          else { 
              compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1; 
              if (compIndex >= 0) { targetEntity = character.inactiveCompanions![compIndex]; isInactive = true; } 
          } 
      }
      if (!targetEntity) return;

      const skill = isBond ? (targetEntity as Character).bondSkills?.[skillIndex] : targetEntity.skills[skillIndex];
      if (!skill) return;

      const currentMastery = skill.currentMastery || 0;
      const requiredMastery = 20 * (skill.level + 4);
      
      const tierMultipliers: Record<string, number> = {
          [ClassTier.NONE]: 1,
          [ClassTier.FIRST]: 3,
          [ClassTier.SECOND]: 5,
          [ClassTier.LAST]: 10,
          [ClassTier.FINAL]: 50,
          [ClassTier.BOND]: 150
      };
      const tierMult = tierMultipliers[skill.tier] || 1;
      const totalDiscountRate = Math.min(0.85, (labLevel * 0.05) + researcherBonus.costDiscount);
      const discountMultiplier = Math.max(0.15, 1 - totalDiscountRate);

      const goldCost = Math.max(1, Math.floor(Math.max(1, skill.level) * 400 * tierMult * discountMultiplier));
      const manaCost = Math.max(1, Math.floor(Math.max(1, skill.level) * 1 * tierMult * discountMultiplier));

      const totalMana = character.base?.resources?.manaCrystal || 0;
      if (character.money < goldCost || totalMana < manaCost) {
          alert("자원이 부족합니다. (마정석 부족)");
          return;
      }

      const newChar = { ...character };
      newChar.money -= goldCost;

      const curCrystal = Math.max(0, (newChar.base?.resources?.manaCrystal || 0) - manaCost);
      newChar.base = { 
          ...newChar.base!, 
          resources: { 
              ...newChar.base!.resources, 
              manaCrystal: curCrystal
          } 
      };

      // [NEW] 연구 전문기술 및 대성공 로직 (연구원 보너스 포함)
      const greatSuccessRate = Math.min(60, 5 + researcherBonus.greatSuccessBonus);
      const isGreatSuccess = Math.random() * 100 < greatSuccessRate;

      let gainAmt = 10 + Math.floor(Math.random() * 11); // 10~20 증가
      if (isGreatSuccess) gainAmt *= 2;

      let nextMastery = currentMastery + gainAmt;
      let nextLevel = skill.level;
      let leveledUp = false;

      if (nextMastery >= requiredMastery) {
          if (nextLevel < (skill.maxLevel || 10)) {
              nextLevel += 1;
              nextMastery -= requiredMastery;
              leveledUp = true;
          } else {
              nextMastery = requiredMastery; // Maxed
          }
      }

      const updatedSkill = { ...skill, level: nextLevel, currentMastery: nextMastery };
      
      if (isBond) {
          const newBondSkills = [...(newChar.bondSkills || [])];
          newBondSkills[skillIndex] = updatedSkill as BondSkill;
          newChar.bondSkills = newBondSkills;
      } else {
          const newSkills = [...targetEntity.skills];
          newSkills[skillIndex] = updatedSkill;
          if (isPlayer) { newChar.skills = newSkills; }
          else if (isInactive) { 
              const newInactive = [...(newChar.inactiveCompanions || [])];
              newInactive[compIndex] = { ...newInactive[compIndex], skills: newSkills };
              newChar.inactiveCompanions = newInactive;
          } else {
              const newComps = [...newChar.companions];
              newComps[compIndex] = { ...newComps[compIndex], skills: newSkills };
              newChar.companions = newComps;
          }
      }

      // 연구소 담당 연구원들에게 숙련도 EXP 부여
      const labInst = newChar.base?.layout?.find(inst => inst.type === 'lab');
      if (labInst) {
          const assignedIds: string[] = [];
          if (newChar.base?.assignments?.[labInst.id]) assignedIds.push(newChar.base.assignments[labInst.id]);
          if (newChar.base?.multiAssignments?.[labInst.id]) {
              newChar.base.multiAssignments[labInst.id].forEach(id => { if (!assignedIds.includes(id)) assignedIds.push(id); });
          }

          const expAmount = 20 + skill.level * 5;
          const grantExpToObj = (obj: Character | Companion) => {
              if (!obj.professions) obj.professions = {};
              if (!obj.professions.research) obj.professions.research = { level: 1, exp: 0, maxExp: 100 };
              let res = obj.professions.research;
              res.exp += expAmount;
              while (res.exp >= res.maxExp) {
                  res.exp -= res.maxExp;
                  res.level += 1;
                  res.maxExp = Math.floor(res.maxExp * 1.3);
                  addToLog(`[연구소] ${obj.name} 연구원의 연구 숙련도 레벨이 상승했습니다! (Lv.${res.level - 1} -> Lv.${res.level})`);
              }
          };

          grantExpToObj(newChar);
          if (newChar.inactiveCompanions) {
              newChar.inactiveCompanions.forEach(c => {
                  if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
              });
          }
          if (newChar.companions) {
              newChar.companions.forEach(c => {
                  if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
              });
          }
      }

      // [NEW] 연구 전문기술 숙련도 획득
      const { newChar: charWithProfExp, leveledUp: profLeveledUp, newLevel } = gainProfessionExp(newChar, 'research', 15 + skill.level * 3);
      handleRankUpEffect(profLeveledUp, 'research', newLevel);
      setCharacter(charWithProfExp);
      
      if (leveledUp) {
          addToLog(`[시스템] ${targetEntity.name}의 ${skill.name} 연마 완료! 레벨 업! (Lv.${skill.level} -> Lv.${nextLevel})`);
          if (isGreatSuccess) addToLog(`[시스템] 연구 대성공! 숙련도가 대폭 상승했습니다.`);
          setResultModalData({
              type: 'levelup',
              title: isGreatSuccess ? '연구 대성공! & 스킬 레벨 업!' : '스킬 레벨 업!',
              message: isGreatSuccess ? `연구 대성공으로 숙련도가 대폭 올라 레벨이 상승했습니다!` : `${skill.name}의 숙련도가 정점에 도달하여 레벨이 상승했습니다.`,
              items: [
                  { label: '레벨', before: `Lv.${skill.level}`, after: `Lv.${nextLevel}` },
                  { label: '남은 숙련도', after: `${nextMastery}` },
                  { label: '연구 숙련도', after: `+${15 + skill.level * 3}` }
              ]
          });
      } else {
          addToLog(`[시스템] ${targetEntity.name}의 ${skill.name} 연마 완료! (숙련도: ${currentMastery} -> ${nextMastery} / ${requiredMastery})`);
          if (isGreatSuccess) addToLog(`[시스템] 연구 대성공! 숙련도가 대폭 상승했습니다.`);
          setResultModalData({
              type: isGreatSuccess ? 'success' : 'success',
              title: isGreatSuccess ? '연구 대성공!' : '스킬 연마 완료',
              message: isGreatSuccess ? `연구 대성공으로 숙련도가 2배로 상승했습니다!` : `${skill.name}의 숙련도가 향상되었습니다.`,
              items: [
                  { label: '숙련도', before: `${currentMastery}`, after: `${nextMastery}` },
                  { label: '목표 숙련도', after: `${requiredMastery}` },
                  { label: '연구 숙련도', after: `+${15 + skill.level * 3}` }
              ]
          });
      }
      if (profLeveledUp) addToLog(`[시스템] 연구 전문기술 레벨이 상승했습니다! (Lv.${newLevel - 1} -> Lv.${newLevel})`);
  };

  const handleSkillLimitBreak = (skillIndex: number, targetId: string) => {
      const labLevel = calculateTotalLabLevel(character.base);
      const researcherBonus = calculateResearcherBonus(character);

      let targetEntity: Character | Companion | undefined;
      let isPlayer = false;
      let compIndex = -1;
      let isInactive = false;
      let isBond = false;

      if (targetId === 'player') { targetEntity = character; isPlayer = true; } 
      else if (targetId === 'bond') { targetEntity = character; isBond = true; }
      else { 
          compIndex = character.companions.findIndex(c => c.id === targetId); 
          if (compIndex >= 0) { targetEntity = character.companions[compIndex]; } 
          else { 
              compIndex = character.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1; 
              if (compIndex >= 0) { targetEntity = character.inactiveCompanions![compIndex]; isInactive = true; } 
          } 
      }
      if (!targetEntity) return;

      const skill = isBond ? (targetEntity as Character).bondSkills?.[skillIndex] : targetEntity.skills[skillIndex];
      if (!skill) return;

      const maxLevel = skill.maxLevel || 10;
      const tierMultipliers: Record<string, number> = {
          [ClassTier.NONE]: 1,
          [ClassTier.FIRST]: 3,
          [ClassTier.SECOND]: 5,
          [ClassTier.LAST]: 10,
          [ClassTier.FINAL]: 50,
          [ClassTier.BOND]: 150
      };
      const tierMult = tierMultipliers[skill.tier] || 1;
      const totalDiscountRate = Math.min(0.85, (labLevel * 0.05) + researcherBonus.costDiscount);
      const discountMultiplier = Math.max(0.15, 1 - totalDiscountRate);

      const goldCost = Math.max(1, Math.floor((4000 + 2000 * maxLevel) * tierMult * discountMultiplier));
      const manaCost = Math.max(1, Math.floor((5 + maxLevel) * tierMult * discountMultiplier));

      const totalMana = character.base?.resources?.manaCrystal || 0;
      if (character.money < goldCost || totalMana < manaCost) {
          alert("자원이 부족합니다. (마정석 부족)");
          return;
      }

      const successRate = Math.min(95, 30 + (labLevel * 5) + researcherBonus.limitBreakBonus);
      const success = Math.random() * 100 < successRate;

      const newChar = { ...character };
      newChar.money -= goldCost;

      const curCrystal = Math.max(0, (newChar.base?.resources?.manaCrystal || 0) - manaCost);
      newChar.base = { 
          ...newChar.base!, 
          resources: { 
              ...newChar.base!.resources, 
              manaCrystal: curCrystal
          } 
      };

      // 연구소 담당 연구원들에게 숙련도 EXP 부여
      const labInst = newChar.base?.layout?.find(inst => inst.type === 'lab');
      if (labInst) {
          const assignedIds: string[] = [];
          if (newChar.base?.assignments?.[labInst.id]) assignedIds.push(newChar.base.assignments[labInst.id]);
          if (newChar.base?.multiAssignments?.[labInst.id]) {
              newChar.base.multiAssignments[labInst.id].forEach(id => { if (!assignedIds.includes(id)) assignedIds.push(id); });
          }

          const expAmount = 50 + skill.level * 10;
          const grantExpToObj = (obj: Character | Companion) => {
              if (!obj.professions) obj.professions = {};
              if (!obj.professions.research) obj.professions.research = { level: 1, exp: 0, maxExp: 100 };
              let res = obj.professions.research;
              res.exp += expAmount;
              while (res.exp >= res.maxExp) {
                  res.exp -= res.maxExp;
                  res.level += 1;
                  res.maxExp = Math.floor(res.maxExp * 1.3);
                  addToLog(`[연구소] ${obj.name} 연구원의 연구 숙련도 레벨이 상승했습니다! (Lv.${res.level - 1} -> Lv.${res.level})`);
              }
          };

          grantExpToObj(newChar);
          if (newChar.inactiveCompanions) {
              newChar.inactiveCompanions.forEach(c => {
                  if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
              });
          }
          if (newChar.companions) {
              newChar.companions.forEach(c => {
                  if (assignedIds.includes(c.id) && (c.job === JobType.RESEARCHER || (c.job as string) === '연구원')) grantExpToObj(c);
              });
          }
      }

      // [NEW] 연구 전문기술 숙련도 획득
      const { newChar: charWithLimitProfExp, leveledUp: limitProfLeveledUp, newLevel: limitProfNewLevel } = gainProfessionExp(newChar, 'research', 30 + maxLevel * 5);
      handleRankUpEffect(limitProfLeveledUp, 'research', limitProfNewLevel);
      if (limitProfLeveledUp) addToLog(`[시스템] 연구 전문기술 레벨이 상승했습니다! (Lv.${limitProfNewLevel - 1} -> Lv.${limitProfNewLevel})`);

      if (success) {
          const updatedSkill = { ...skill, maxLevel: maxLevel + 1 };
          if (isBond) {
              const newBondSkills = [...(newChar.bondSkills || [])];
              newBondSkills[skillIndex] = updatedSkill as BondSkill;
              newChar.bondSkills = newBondSkills;
          } else {
              const newSkills = [...targetEntity.skills];
              newSkills[skillIndex] = updatedSkill;
              if (isPlayer) { newChar.skills = newSkills; }
              else if (isInactive) { 
                  const newInactive = [...(newChar.inactiveCompanions || [])];
                  newInactive[compIndex] = { ...newInactive[compIndex], skills: newSkills };
                  newChar.inactiveCompanions = newInactive;
              } else {
                  const newComps = [...newChar.companions];
                  newComps[compIndex] = { ...newComps[compIndex], skills: newSkills };
                  newChar.companions = newComps;
              }
          }

          // [NEW] 연구 전문기술 숙련도 획득 (성공 시)
          const { newChar: charWithProfExp, leveledUp: profLeveledUp, newLevel } = gainProfessionExp(newChar, 'research', 100 + skill.level * 10);
          handleRankUpEffect(profLeveledUp, 'research', newLevel);
          newChar.professions = charWithProfExp.professions;

          addToLog(`[시스템] ${targetEntity.name}의 ${skill.name} 한계 돌파 성공! (최대 Lv.${maxLevel} -> Lv.${maxLevel + 1})`);
          setResultModalData({
              type: 'success',
              title: '한계 돌파 성공',
              message: `${skill.name}의 잠재력이 개방되었습니다.`,
              items: [
                  { label: '최대 레벨', before: `Lv.${maxLevel}`, after: `Lv.${maxLevel + 1}` },
                  { label: '연구 숙련도', after: `+${100 + skill.level * 10}` }
              ]
          });
          if (profLeveledUp) addToLog(`[시스템] 연구 전문기술 레벨이 상승했습니다!`);
      } else {
          addToLog(`[시스템] ${targetEntity.name}의 ${skill.name} 한계 돌파 실패...`);
          setResultModalData({
              type: 'failure',
              title: '한계 돌파 실패',
              message: '마나의 흐름이 불안정하여 한계 돌파에 실패했습니다.',
              items: [{ label: '결과', after: '변화 없음' }]
          });
      }
      setCharacter(newChar);
  };

  const handleCompanionMove = (index: number, toBase: boolean) => {
      let newChar = { ...character };
      if (toBase) {
          const comp = newChar.companions[index];
          if (!comp) return;
          
          if (comp.isMonster || comp.monsterData) {
              const result = returnMonsterToFarm(character, comp.id, 'party');
              if (result.success) {
                  setCharacter(result.newCharacter);
                  addToLog(result.message);
              } else {
                  alert(result.message);
              }
              return;
          }

          const housingCapacity = calculateTotalHousingCapacity(newChar.base, newChar.inactiveCompanions || []);
          const currentResidents = newChar.inactiveCompanions?.length || 0;
          
          if (currentResidents >= housingCapacity) { 
              alert(`기지(숙소) 정원이 꽉 찼습니다. (최대 ${housingCapacity}명)`); 
              return; 
          }
      } else {
          if (newChar.companions.length >= MAX_PARTY_SIZE) { 
              alert(`파티 인원은 최대 ${MAX_PARTY_SIZE}명입니다.`); 
              return; 
          }
      }

      const companions = [...newChar.companions]; 
      const inactive = [...(newChar.inactiveCompanions || [])];
      let movedName = ""; 
      
      if (toBase) { 
          const comp = companions[index]; 
          movedName = comp.name; 
          companions.splice(index, 1); 
          inactive.push(comp); 
      } else { 
          const comp = inactive[index]; 
          movedName = comp.name; 
          inactive.splice(index, 1); 
          if (comp) {
              comp.battlePosition = findAvailableBattlePosition(newChar, comp.battleRole);
              companions.push(comp); 
              newChar = unassignFromTraining(newChar, comp.id);
          }
      }
      
      newChar.companions = companions; 
      newChar.inactiveCompanions = inactive; 
      setCharacter(newChar);
      addToLog(`[시스템] ${movedName} 동료가 ${toBase ? '기지로 입주' : '파티에 합류'}했습니다.`);
  };

  const handleAssignment = (companionId: string, instanceId: string) => {
      const newChar = { ...character }; 
      const base = { ...newChar.base! }; 
      const assignments = { ...(base.assignments || {}) };
      const multiAssignments = { ...(base.multiAssignments || {}) };
      
      const instance = base.layout.find(inst => inst.id === instanceId);
      const isFarm = instance?.type === 'farm';
      const isMine = instance?.type === 'mine';
      const isAlchemy = instance?.type === 'alchemy';
      const isKitchen = instance?.type === 'cooking';
      const isLab = instance?.type === 'lab';
      const isWorkshop = instance?.type === 'workshop';
      const isMulti = isFarm || isMine || isAlchemy || isKitchen || isLab || isWorkshop;
      
      if (isMulti) {
          const facilityLevel = instance?.level || 1;
          const currentList = multiAssignments[instanceId] || [];
          
          if (!companionId) {
              // [Clear all assigned to this instance]
              currentList.forEach(id => {
                  Object.keys(assignments).forEach(key => { if (assignments[key] === id) delete assignments[key]; });
              });
              delete multiAssignments[instanceId];
              delete assignments[instanceId];
              addToLog(`[시스템] 시설의 모든 담당자가 해제되었습니다.`);
          } else {
              if (currentList.includes(companionId)) {
                  // Toggle off
                  multiAssignments[instanceId] = currentList.filter(id => id !== companionId);
                  if (assignments[instanceId] === companionId) {
                      delete assignments[instanceId];
                      if (multiAssignments[instanceId].length > 0) {
                          assignments[instanceId] = multiAssignments[instanceId][0];
                      }
                  }
                  addToLog(`[시스템] 담당자가 시설에서 해제되었습니다.`);
              } else {
                  // Check if companion is already assigned as a housing chef
                  const isHouseChef = base.houses?.some(h => h.assignedChefId === companionId);
                  if (isKitchen && isHouseChef) {
                      const compName = character.inactiveCompanions?.find(c => c.id === companionId)?.name || "해당 동료";
                      addToLog(`[시스템] ${compName} 동료는 이미 숙소 전담 요리사로 배정되어 있어 요리시설 담당자로 배치할 수 없습니다.`);
                      alert(`${compName} 동료는 이미 숙소 전담 요리사로 배정되어 있어 요리시설 담당자로 배치할 수 없습니다.`);
                      return;
                  }

                  // Add
                  if (currentList.length < facilityLevel) {
                      // Check if already assigned elsewhere
                      Object.keys(assignments).forEach(id => { if (assignments[id] === companionId) delete assignments[id]; }); 
                      Object.keys(multiAssignments).forEach(id => {
                          if (multiAssignments[id].includes(companionId)) {
                              multiAssignments[id] = multiAssignments[id].filter(cId => cId !== companionId);
                          }
                      });
                      
                      multiAssignments[instanceId] = [...currentList, companionId];
                      assignments[instanceId] = companionId;
                      const compName = character.inactiveCompanions?.find(c => c.id === companionId)?.name || "Unknown"; 
                      addToLog(`[시스템] ${compName} 동료가 시설에 추가 배치되었습니다. (${multiAssignments[instanceId].length}/${facilityLevel})`);
                  } else {
                      addToLog(`[시스템] 이 시설(Lv.${facilityLevel})에는 최대 ${facilityLevel}명까지 배치할 수 있습니다.`);
                      return;
                  }
              }
          }
          base.assignments = assignments;
          base.multiAssignments = multiAssignments;
          newChar.base = base;
          const unassignedChar = unassignFromTraining(newChar, companionId || "");
          setCharacter(unassignedChar);
          return;
      }

      if (!companionId) { 
          delete assignments[instanceId]; 
          addToLog(`[시스템] 시설(ID: ${instanceId})의 담당자가 해제되었습니다.`); 
      } 
      else { 
          // One companion can only be assigned to one facility
          Object.keys(assignments).forEach(id => { if (assignments[id] === companionId) delete assignments[id]; }); 
          Object.keys(multiAssignments).forEach(id => {
              if (multiAssignments[id].includes(companionId)) {
                  multiAssignments[id] = multiAssignments[id].filter(cId => cId !== companionId);
              }
          });

          assignments[instanceId] = companionId; 
          const compName = character.inactiveCompanions?.find(c => c.id === companionId)?.name || "Unknown"; 
          addToLog(`[시스템] ${compName} 동료가 시설(ID: ${instanceId})에 배치되었습니다.`); 
          // [NEW] 훈련소에서 자동 해제
          newChar.base = { ...base, assignments, multiAssignments };
          const unassignedChar = unassignFromTraining(newChar, companionId);
          setCharacter(unassignedChar);
          return;
      }
      base.assignments = assignments; 
      base.multiAssignments = multiAssignments;
      base.characterUpdate = null; // Reset temp update
      newChar.base = base; 
      setCharacter(newChar);
  };

  // [NEW] Rest Modal and Execution Handlers
  const handleOpenRestModal = (initialDays: number = 1) => {
      if (isLoading || sceneType === 'combat') return;
      setRestModalInitialDays(initialDays);
      setIsRestModalOpen(true);
  };

  const handleExecuteRest = (days: number, hours?: number) => {
      if (isLoading || sceneType === 'combat') return;

      if (hours && hours > 0) {
          setIsLoading(true);
          setLoadingMessage(`${hours}시간 동안 휴식을 취하고 있습니다...`);
          setIsRestModalOpen(false);

          setTimeout(() => {
              // 1. 시간 전진 (오전 8시 기준 일일 결산)
              const result = advanceGameTime(character, hours * 60, {
                  activityName: `${hours}시간 휴식`
              });
              if (result.dailyReport) setDailyReport(result.dailyReport);
              if (result.toastNotice) triggerDayChangeToast(result.toastNotice);
              if (result.worldNews && result.worldNews.length > 0) {
                  setWorldNewsList(result.worldNews);
              }
              if (result.systemLogs && result.systemLogs.length > 0) {
                  result.systemLogs.forEach(l => addToLog(l));
              }

              // 2. 엄격한 사용자 지정 휴식 회복 공식 적용
              const { updatedCharacter: healedChar, logDesc } = applyRestHealing(result.updatedCharacter, hours, 0);

              setCharacter(healedChar);
              if (result.logMessage) addToLog(result.logMessage);
              addToLog(logDesc);
              setIsLoading(false);
              setLoadingMessage('');
          }, 350);
          return;
      }

      if (days < 1) return;

      setIsLoading(true);
      const periodLabel = days === 1 ? '하루' : days === 7 ? '일주일' : days === 30 ? '한 달' : `${days}일`;
      setLoadingMessage(`휴식을 취하고 있습니다... (0 / ${days}일 계산 중)`);
      setIsRestModalOpen(false);

      let currentStep = 0;
      const intervalDelay = Math.max(25, Math.min(150, 750 / days));

      const timer = setInterval(() => {
          currentStep++;
          if (currentStep <= days) {
              setLoadingMessage(`휴식을 취하고 있습니다... (${currentStep} / ${days}일 계산 중)`);
          }
          
          if (currentStep >= days) {
              clearInterval(timer);
              
              setTimeout(() => {
                  // 오전 8시 기준 days일 시간 전진 (일일 결산 발동)
                  const result = advanceGameTime(character, days * 1440, {
                      activityName: `${periodLabel} 휴식`
                  });
                  if (result.dailyReport) setDailyReport(result.dailyReport);
                  if (result.toastNotice) triggerDayChangeToast(result.toastNotice);
                  if (result.worldNews && result.worldNews.length > 0) {
                      setWorldNewsList(result.worldNews);
                  }
                  if (result.systemLogs && result.systemLogs.length > 0) {
                      result.systemLogs.forEach(l => addToLog(l));
                  }

                  // 12시간 이상 휴식이므로 100% 완전 회복 및 상태이상 해제
                  const { updatedCharacter: healedChar, logDesc } = applyRestHealing(result.updatedCharacter, 0, days);

                  setCharacter(healedChar);
                  if (result.logMessage) addToLog(result.logMessage);
                  addToLog(logDesc);
                  addToLog(`[휴식 완료] ${periodLabel} 동안 평화롭게 안식을 취했습니다. (날짜: ${healedChar.currentDate || ''})`);

                  setIsLoading(false);
                  setLoadingMessage('');
              }, 400);
          }
      }, intervalDelay);
  };

  const handleRestLong = (days: number) => handleOpenRestModal(days);

  // [NEW] DevTools Password Prompt
  const handleOpenDevMode = () => {
    setIsDevPasswordModalOpen(true);
  };

  const handleDevPasswordConfirm = (password: string): boolean => {
    if (password === "엘클" || password === "dpfzmf") {
      setIsDevModeOpen(true);
      return true;
    }
    return false;
  };
  const handleStorageAction = (action: 'deposit' | 'withdraw', index: number | number[]) => {
      const indices = Array.isArray(index) ? index : [index];
      const count = indices.length;
      if (count === 0) return;

      const newChar = { ...character };
      const inv = [...newChar.inventory];
      const storage = [...(newChar.base?.storage || [])];
      
      const maxStorage = calculateTotalStorageCapacity(newChar.base, character.inactiveCompanions || []);

      let itemName = "";
      if (action === 'deposit') {
          if (storage.length + count > maxStorage) return alert(`기지 창고 정원을 초과합니다. (잔여: ${maxStorage - storage.length})`);
          const itemsToMove = indices.map(idx => inv[idx]);
          itemName = itemsToMove[0].name;
          const remainingInv = inv.filter((_, idx) => !indices.includes(idx));
          newChar.inventory = remainingInv;
          newChar.base = { ...newChar.base!, storage: [...storage, ...itemsToMove] };
      } else {
          const maxInv = calculateInventorySize(newChar.stats);
          if (inv.length + count > maxInv) return alert(`개인 인벤토리 정원을 초과합니다. (잔여: ${maxInv - inv.length})`);
          const itemsToMove = indices.map(idx => storage[idx]);
          itemName = itemsToMove[0].name;
          const remainingStorage = storage.filter((_, idx) => !indices.includes(idx));
          newChar.inventory = [...inv, ...itemsToMove];
          newChar.base = { ...newChar.base!, storage: remainingStorage };
      }
      
      setCharacter(newChar);
      addToLog(`[시스템] ${itemName} x${count} ${action === 'deposit' ? '보관' : '꺼내기'} 완료.`);
  };

  const handleIncreaseStat = (key: string, label: string, amount: number) => {
        if (character.statPoints >= amount) { 
            const next = { ...character }; 
            


            next.statPoints -= amount; 
            if (key === 'maxHp' || key === 'maxMp') { 
                next.stats[key as keyof Stats] += (amount * 10); 
                if (key === 'maxHp') next.stats.hp += (amount * 10); 
                if (key === 'maxMp') next.stats.mp += (amount * 10); 
            } else { 
                next.stats[key as keyof Stats] += amount; 
            } 


            setCharacter(next); 
        } 
  };


  const handleHostParty = (selectedCompanionIndices: number[]) => {
      const companionCount = selectedCompanionIndices.length; if (companionCount === 0) return alert("동료를 선택해주세요.");
      const foodCost = companionCount; const goldCost = companionCount * 5000;
      const missing = []; if ((character.base?.resources.food || 0) < foodCost) missing.push(`식량 ${foodCost - (character.base?.resources.food || 0)}`); if ((character.money || 0) < goldCost) missing.push(`골드 ${(goldCost - (character.money || 0)).toLocaleString()}G`);
      if (missing.length > 0) { 
          setResultModalData({ type: 'warning', title: '자원 부족', message: '파티 개최에 필요한 자원이 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) }); return; }
      
      const timeRes = advanceGameTime(character, 360, { activityName: "파티 주최" });
      const newChar = { ...timeRes.updatedCharacter };
      if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
          timeRes.systemLogs.forEach(l => addToLog(l));
      }
      if (timeRes.toastNotice) triggerDayChangeToast(timeRes.toastNotice);

      const healAllRest = (entity: any) => {
          if (!entity || !entity.stats) return entity;
          const fStats = calculateFinalStats(entity).finalStats;
          return {
              ...entity,
              stats: {
                  ...entity.stats,
                  hp: fStats.maxHp,
                  mp: fStats.maxMp
              }
          };
      };
      newChar.stats.hp = calculateFinalStats(newChar).finalStats.maxHp;
      newChar.stats.mp = calculateFinalStats(newChar).finalStats.maxMp;
      newChar.companions = newChar.companions.map(healAllRest);
      newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(healAllRest);
      newChar.money -= goldCost; newChar.base = { ...newChar.base!, resources: { ...newChar.base!.resources, food: newChar.base!.resources.food - foodCost } };
      const newInactive = [...(newChar.inactiveCompanions || [])]; let names: string[] = [];
      
      // Update affection with player
      selectedCompanionIndices.forEach(idx => { if (newInactive[idx]) { newInactive[idx] = { ...newInactive[idx], affection: Math.min(100, newInactive[idx].affection + 2) }; names.push(newInactive[idx].name); } });
      
      // [NEW] Increase inter-companion affection between participating members
      for(let i=0; i<selectedCompanionIndices.length; i++) {
          for(let j=0; j<selectedCompanionIndices.length; j++) {
              if (i === j) continue;
              const idx1 = selectedCompanionIndices[i];
              const idx2 = selectedCompanionIndices[j];
              const c1 = newInactive[idx1];
              const c2 = newInactive[idx2];
              
              if (!c1.relations) c1.relations = {};
              if (!c1.relations[c2.id]) {
                  c1.relations[c2.id] = { targetId: c2.id, affection: 0, type: RelationType.ALLY };
              }
              c1.relations[c2.id].affection = Math.min(100, c1.relations[c2.id].affection + 2);
          }
      }
      
      newChar.inactiveCompanions = newInactive; setCharacter(newChar); addToLog(`[시스템] 파티를 즐기며 6시간이 지났습니다. (${names.join(', ')} 호감도 상승, 동료 간 유대 강화, 소모: ${goldCost}G, 식량 ${foodCost})`);
      setResultModalData({ type: 'success', title: '파티 성공!', message: '즐거운 시간을 보내고 파티를 마감했습니다.', items: [ { label: '호감도', after: '+2 (전원)' }, { label: '소모 시간', after: '+6시간' } ] });
  };

  const handleInteraction = (companionId: string, choice: string) => {
      let targetComp: Companion | undefined; let isInactive = false; let compIndex = -1;
      compIndex = character.inactiveCompanions?.findIndex(c => c.id === companionId) ?? -1;
      if (compIndex >= 0) { targetComp = character.inactiveCompanions![compIndex]; isInactive = true; }
      if (!targetComp) return;
      
      const timeRes = advanceGameTime(character, 60, { activityName: choice });
      const newChar = { ...timeRes.updatedCharacter };
      if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
          timeRes.systemLogs.forEach(l => addToLog(l));
      }
      if (timeRes.toastNotice) triggerDayChangeToast(timeRes.toastNotice);

      const healAllRestInteraction = (entity: any) => {
          if (!entity || !entity.stats) return entity;
          const fStats = calculateFinalStats(entity).finalStats;
          return {
              ...entity,
              stats: {
                  ...entity.stats,
                  hp: fStats.maxHp,
                  mp: fStats.maxMp
              }
          };
      };
      newChar.stats.hp = calculateFinalStats(newChar).finalStats.maxHp;
      newChar.stats.mp = calculateFinalStats(newChar).finalStats.maxMp;
      newChar.companions = newChar.companions.map(healAllRestInteraction);
      newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(healAllRestInteraction);
      let logMsg = ""; let affectChange = 1;
      if (choice === '함께 밤을 보내기') { affectChange = 2; logMsg = `[시스템] ${targetComp.name}와(과) 함께 오붓하고 뜨거운 밤을 보냈습니다. (시간 +1시간)`; setResultModalData({ type: 'success', title: '특별한 시간', message: '서로의 마음을 확인하며 깊은 밤을 보냈습니다.', items: [ { label: '호감도', after: '+2' }, { label: '소모 시간', after: '+1시간' } ] }); } 
      else { logMsg = `[시스템] ${targetComp.name}와(과) ${choice} 시간을 보내며 1시간이 지났습니다.`; 
      setResultModalData({ type: 'info', title: '교류 완료', message: `${targetComp.name}와(과) 즐거운 시간을 보냈습니다.`, items: [ { label: '호감도', after: '+1' }, { label: '소모 시간', after: '+1시간' } ] }); }
      if (isInactive) { const newInactive = [...(newChar.inactiveCompanions || [])]; newInactive[compIndex] = { ...newInactive[compIndex], affection: Math.min(100, newInactive[compIndex].affection + affectChange) }; newChar.inactiveCompanions = newInactive; }
      setCharacter(newChar); addToLog(logMsg);
  };
  
  const handleDivorce = () => {
        if (selectedCompanionIndex === null) return;
        const newComps = [...character.companions]; const comp = newComps[selectedCompanionIndex]; if (!comp || !comp.isSpouse) return;
        comp.isSpouse = false; comp.isLover = false; comp.affection = Math.max(-100, comp.affection - 50); comp.loyalty = Math.max(-100, comp.loyalty - 50);
        comp.classType = comp.classType.replace(/배우자\s*\(?|\)?\s*\(Spouse\)/g, '').trim() || "동료";
        
        const newBondSkills = (character.bondSkills || []).filter(bs => 
            !(bs.companionId === comp.id && bs.sourceId === undefined) && 
            !(bs.sourceId === comp.id && bs.companionId === undefined)
        );
        
        setCharacter({ ...character, companions: newComps, bondSkills: newBondSkills }); addToLog(`[시스템] ${comp.name}와(과) 이혼했습니다. 관계가 정리되었습니다.`);
        setResultModalData({ type: 'failure', title: '이혼 완료', message: `${comp.name}와(과) 법적인 부부 관계를 청산했습니다.`, items: [ { label: '관계', after: '남남' }, { label: '호감도/충성도', after: '-50' } ] });
  };

  const handleClearLogs = () => {
      setResultModalData({
          type: 'warning',
          title: '대화 기록 삭제',
          message: '그동안의 모든 대화 기록을 삭제하시겠습니까?\n삭제 시 인공지능의 기억과 대화 세션도 초기화됩니다.',
          items: [
              { label: '대화 기록', after: '전체 초기화' },
              { label: 'AI 기억 세션', after: '초기화' }
          ],
          continueText: '삭제하기',
          cancelText: '취소'
      });
      setResultActionContext({ type: 'clear_logs', args: [] });
  };
    const handleOpenCommunication = () => {
    setIsCommunicationOpen(true);
  };

const handleStartPvpBattle = (enemies: Enemy[], code: string) => {
      const newCombatState: CombatState = {
          enemies: enemies,
          turn: 1,
          log: [`[차원 결투] 배틀코드를 통해 소환된 강력한 적들과의 대결이 시작됩니다!`],
          isEnded: false,
          type: 'PVP_battle' 
      };
      (newCombatState as any).sourceId = "BATTLE_CODE_PVP";
      (newCombatState as any).battleCode = code;

      setCombatState(newCombatState);
      setSceneType('combat');
      addToLog(`[시스템] 배틀코드를 파싱하여 결투를 시작합니다.`);
  };

  // [NEW] Local Rest Handler
  const handleRestLocal = () => handleOpenRestModal(1);

  const handleRecallMonsterFromFarm = (monsterId: string) => {
    const result = recruitMonster(character, monsterId);
    if (result.success) {
      setCharacter(result.newCharacter);
      addToLog(result.message);
    } else {
      setResultModalData({ type: 'failure', title: '소집 실패', message: result.message, items: [] });
    }
  };

  const handleReturnMonsterToFarm = (companionId: string) => {
    const result = returnMonsterToFarm(character, companionId, 'party');
    if (result.success) {
      setCharacter(result.newCharacter);
      addToLog(result.message);
    } else {
      setResultModalData({ type: 'failure', title: '복귀 실패', message: result.message, items: [] });
    }
  };

  const handlePartWays = (mode: 'temporary' | 'permanent' | 'beautiful') => {
      if (selectedCompanionIndex === null && !selectedCompanionId) return;
      const comp = (selectedCompanionId ? findCompanionRef(character, selectedCompanionId) : null) || (selectedCompanionIndex !== null ? character.companions[selectedCompanionIndex] : null);
      if (!comp) return;
      const newChar = { ...character };
      
      // Remove from active party & inactive
      newChar.companions = newChar.companions.filter(c => c.id !== comp.id);
      if (newChar.inactiveCompanions) {
          newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== comp.id);
      }

      if (mode === 'temporary') {
          if (!character.base) {
              setResultModalData({
                  type: 'failure',
                  title: '대기명단 이동 불가',
                  message: '기지가 아직 건설되지 않았습니다.\n기지가 없는 상태에서는 동료를 대기명단(숙소)으로 보낼 수 없습니다. 먼저 기지를 건설해야 잠시 이별이 가능합니다.',
                  items: []
              });
              return;
          }
          if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
          newChar.inactiveCompanions.push(comp);
          addToLog(`[시스템] ${comp.name}와(과) 잠시 이별했습니다. 기지(숙소)에서 다시 만날 수 있습니다.`);
      } else if (mode === 'permanent') {
          addToLog(`[시스템] ${comp.name}와(과) 영원히 작별했습니다.`);
      } else if (mode === 'beautiful') {
          // Beautiful Farewell: Move to Social Network as a Past Bond
          if (!newChar.socialNetwork) newChar.socialNetwork = [];
          
          const currentYear = getYear(newChar.currentDate || '2000-01-01');
          const socialEntry: any = {
              ...comp,
              origin: comp.job || 'Companion',
              originName: '과거의 인연 (아름다운 이별)',
              isPastConnection: true,
          };
          
          if (socialEntry.birthYear) {
              socialEntry.age = `${currentYear - socialEntry.birthYear}세`;
          }

          const existingIdx = newChar.socialNetwork.findIndex(n => n.id === comp.id);
          if (existingIdx !== -1) {
              newChar.socialNetwork[existingIdx] = socialEntry;
          } else {
              newChar.socialNetwork.push(socialEntry);
          }

          addToLog(`[시스템] ${comp.name}와(과) 아름다운 이별을 고했습니다. 그는 이제 당신의 소중한 기억 속 인연으로 남습니다.`);
          
          setResultModalData({
              type: 'success',
              title: '아름다운 이별',
              message: `${comp.name}: "당신과 함께한 시간은 제 인생 최고의 영광이었습니다. 어디에 있든 당신의 앞날을 축복하겠습니다."`,
              items: [
                  { label: '관계', after: '과거의 인연' },
                  { label: '기록', after: '인물 관계망에 등록됨' }
              ]
          });
      }
      
      setCharacter(newChar);
      setSelectedCompanionIndex(null);
      setSelectedCompanionId(null);
  };

  const handleConfessionRespond = (accepted: boolean) => {
    const companionId = character.pendingConfessionCompanionId;
    if (!companionId) return;

    const newChar = { ...character };
    delete newChar.pendingConfessionCompanionId;

    const comp = [...newChar.companions, ...(newChar.inactiveCompanions || [])].find(c => c.id === companionId);
    
    if (comp) {
      if (accepted) {
          comp.isLover = true;
          comp.partnerId = 'player';
          comp.partnerName = newChar.name;
          comp.loverStartDate = newChar.currentDate;
          
          if (!comp.relations) comp.relations = {};
          comp.relations['player'] = { targetId: 'player', affection: 100, type: 'lover' as any };
          
          if (!comp.memories) comp.memories = [];
          comp.memories.push(`[${newChar.currentDate}] 플레이어와 연인이 됨.`);
          
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: `[경사] ${comp.name}의 고백을 받아들여 연인이 되었습니다!`, timestamp: Date.now(), isActionLog: true }]);
          addToLog(`[시스템] ${comp.name}와(과) 연인이 되었습니다!`);
      } else {
          comp.affection = Math.max(0, comp.affection - 20);
          if (!comp.memories) comp.memories = [];
          comp.memories.push(`[${newChar.currentDate}] 플레이어에게 고백했으나 거절당함.`);
          
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: `[아쉬움] ${comp.name}의 고백을 거절했습니다. 조금 서먹해질 것 같습니다... (호감도 하락)`, timestamp: Date.now(), isActionLog: true }]);
          addToLog(`[시스템] ${comp.name}의 고백을 거절했습니다. 호감도가 하락합니다.`);
      }
    }

    setCharacter(newChar);
  };

  const handleShortcutAction = (id: ShortcutId) => {
    switch (id) {
      case 'character':
        setIsMobileMenuOpen(true);
        break;
      case 'rest':
        handleOpenRestModal(1);
        break;
      case 'mailbox':
        setIsMailboxOpen(true);
        break;
      case 'base':
        handleOpenBase();
        break;
      case 'dimension':
        handleOpenCommunication();
        break;
      case 'bestiary':
        setIsBestiaryOpen?.(true);
        break;
      case 'rival':
        setIsEternalRivalOpen(true);
        break;
      case 'quest':
        setIsQuestLogOpen(true);
        break;
      case 'map':
        setMapMode('travel');
        setIsMapOpen(true);
        break;
      case 'tactics':
        setIsTacticsOpen(true);
        break;
      case 'dashboard':
        setIsDashboardOpen(true);
        break;
      case 'operator':
        handleOpenDevMode();
        break;
      case 'loc_base':
        if (character.base?.location) {
          const travelInfo = calculateTravelCostAndDays(character.currentLocation, character.base.location, character);
          if (travelInfo.isSameLocation) {
            handleOpenBase();
          } else {
            if (character.money < travelInfo.cost) {
              alert(`골드가 부족합니다. (필요: ${travelInfo.cost.toLocaleString()}골드)`);
              return;
            }
            handleTravel(character.base.location, travelInfo.cost, travelInfo.days);
          }
        } else {
          setIsBaseModalOpen(true);
        }
        break;
      case 'loc_capital':
        if (character.currentLocation?.nation) {
          let targetCap = '서울';
          for (const r in WORLD_GEOGRAPHY) {
            if (WORLD_GEOGRAPHY[r][character.currentLocation.nation]) {
              targetCap = WORLD_GEOGRAPHY[r][character.currentLocation.nation].capital;
              break;
            }
          }
          const capLoc = { 
            region: character.currentLocation.region, 
            nation: character.currentLocation.nation, 
            city: targetCap 
          };
          const travelInfo = calculateTravelCostAndDays(character.currentLocation, capLoc, character);
          if (travelInfo.isSameLocation) {
            alert('이미 현재 국가의 수도에 체류 중입니다.');
          } else {
            if (character.money < travelInfo.cost) {
              alert(`골드가 부족합니다. (필요: ${travelInfo.cost.toLocaleString()}골드)`);
              return;
            }
            handleTravel(capLoc, travelInfo.cost, travelInfo.days);
          }
        }
        break;
      case 'loc_dungeon':
        setIsDungeonOpen(true);
        break;
      case 'loc_hunt':
        setCityInitialConfig({ openHuntMap: true });
        setIsCityOpen(true);
        break;
      default:
        if (id.startsWith('facility_')) {
          const fid = id.replace('facility_', '');
          if (fid === 'training_exp') {
            setTrainingInitialTab('exp');
            setIsTrainingModalOpen(true);
          } else if (fid === 'training_stat') {
            setTrainingInitialTab('stat');
            setIsTrainingModalOpen(true);
          } else if (fid === 'training_mastery') {
            setTrainingInitialTab('mastery');
            setIsTrainingModalOpen(true);
          } else if (fid === 'training_style') {
            setIsTrainingStyleOpen(true);
          } else if (fid === 'tactical_training') {
            setIsTacticalTrainingOpen(true);
          } else {
            setBaseInitialSubModal({ type: fid === 'cooking' ? 'kitchen' : fid });
            setIsBaseModalOpen(true);
          }
          return;
        }
        break;
      case 'saveload':
        setSaveLoadMode('save');
        setIsSaveLoadOpen(true);
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
      case 'exit':
        setIsExitModalOpen(true);
        break;
    }
  };

  const handleActionWithTime = (actionText: string, ...rest: any[]) => {
    if (actionText === "[라운드 종료]") {
      const baseChar = combatStateBridge.getLatestCombatCharacter() || character;
      const res = advanceGameTime(baseChar, 1, { isDungeonOrCombat: true, activityName: "전투 1라운드 경과" });
      if (res.toastNotice) {
        triggerDayChangeToast(res.toastNotice);
      }
      if (res.systemLogs && res.systemLogs.length > 0) {
        res.systemLogs.forEach(l => addToLog(l));
      }
      const reconciled = combatStateBridge.reconcileWithLatestCombatState(res.updatedCharacter);
      setCharacter(reconciled);
      return handleAction(actionText, rest[0], reconciled);
    }
    return handleAction(actionText, ...rest);
  };

  return (
    <GameProvider character={character} combatState={combatState} setCharacter={setCharacter} setCombatState={setCombatState} handleAction={handleActionWithTime}>
      <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* 하루 결산 완충 장치: 가벼운 상단 텍스트 알림 배너 */}
      <AnimatePresence>
        {dayChangeToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border border-amber-500/70 rounded-full shadow-[0_4px_30px_rgba(245,158,11,0.4)] text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 pointer-events-none backdrop-blur-md whitespace-nowrap tracking-wide"
          >
            <Sun size={17} className="text-amber-400 animate-spin-slow shrink-0" />
            <span>{dayChangeToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <Suspense fallback={<SceneLoadingFallback mode="general" title="대륙의 서사를 불러오는 중..." />}>
      <SaveLoadModal 
        isOpen={isSaveLoadOpen} 
        mode={saveLoadMode} 
        onClose={() => setIsSaveLoadOpen(false)} 
        onSelectSlot={handleSaveLoadSlotSelection} 
        currentUser={currentUser}
        setResultModalData={setResultModalData}
        activeCharacter={character}
      />
      <ActionResultModal data={resultModalData} onClose={() => { setResultModalData(null); setResultActionContext(null); }} onContinue={resultActionContext ? handleResultContinue : undefined} />
      <CombatAndTrainingModalsLayer
        character={character}
        setCharacter={setCharacter}
        sceneType={sceneType}
        combatResultData={combatResultData}
        setCombatResultData={setCombatResultData}
        activeSuddenEvent={activeSuddenEvent}
        setActiveSuddenEvent={setActiveSuddenEvent}
        advanceGameTime={advanceGameTime}
        addToLog={addToLog}
        setCityInitialConfig={setCityInitialConfig}
        setIsCityOpen={setIsCityOpen}
        isDungeonOpen={isDungeonOpen}
        setIsDungeonOpen={setIsDungeonOpen}
        handleUpdateCharacter={handleUpdateCharacter}
        setResultModalData={setResultModalData}
        setCombatState={setCombatState}
        setSceneType={setSceneType}
        handleBattleTrigger={handleBattleTrigger}
        isTacticsOpen={isTacticsOpen}
        setIsTacticsOpen={setIsTacticsOpen}
        isTrainingModalOpen={isTrainingModalOpen}
        setIsTrainingModalOpen={setIsTrainingModalOpen}
        handleExpTraining={handleExpTraining}
        handleStatTraining={handleStatTraining}
        handleWeaponTraining={handleWeaponTraining}
        trainingInitialTab={trainingInitialTab}
        trainingReportData={trainingReportData}
        setTrainingReportData={setTrainingReportData}
        isTrainingStyleOpen={isTrainingStyleOpen}
        setIsTrainingStyleOpen={setIsTrainingStyleOpen}
        handleUpdateCombatStyle={handleUpdateCombatStyle}
        handlePromoteCombatStyle={handlePromoteCombatStyle}
        isTacticalTrainingOpen={isTacticalTrainingOpen}
        setIsTacticalTrainingOpen={setIsTacticalTrainingOpen}
        isBestiaryOpen={isBestiaryOpen}
        setIsBestiaryOpen={setIsBestiaryOpen}
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode}
        onSuccess={(mode) => {
          if (mode === 'login') {
            setResultModalData({
              type: 'success',
              title: '로그인 성공',
              message: '차원의 문이 열렸습니다.\n이제 모든 기기에서 당신의 여정을 이어갈 수 있습니다.',
              items: []
            });
          } else {
            setResultModalData({
              type: 'success',
              title: '회원가입 성공',
              message: '성좌에 당신을 위한 계정이 마련되었습니다.\n이제 모든 기기에서 당신의 기록을 안전하게 보관할 수 있습니다.',
              items: []
            });
          }
        }}
      />
      {isQuestLogOpen && <QuestLogModal character={character} onClose={() => setIsQuestLogOpen(false)} onCompleteQuest={handleCompleteQuest} onAbandonQuest={handleAbandonQuest} onToggleTrack={handleToggleTrack} />}
      <AppointmentListModal character={character} isOpen={isAppointmentListOpen} onClose={() => setIsAppointmentListOpen(false)} onUpdateCharacter={handleUpdateCharacter} />
    {isReactionBoardOpen && <ReactionBoardModal character={character} onUpdateCharacter={handleUpdateCharacter} onClose={() => setIsReactionBoardOpen(false )}  />}
   {character.isDead && (
        <SuccessionModal 
          character={character} 
          onSelectSuccessor={handleSelectSuccessor} 
          onGameOver={handleExitGame} 
        />
      )}
        {isChroniclesOpen && <FamilyChroniclesModal character={character} onClose={() => setIsChroniclesOpen(false)} />}
  <QuantityModal isOpen={quantityModal.isOpen} title={quantityModal.actionType === 'sell' ? '아이템 판매' : quantityModal.actionType === 'discard' ? '아이템 버리기' : quantityModal.actionType === 'use' ? '아이템 사용' : quantityModal.actionType === 'deposit' ? '아이템 보관' : '아이템 꺼내기'} itemName={quantityModal.item?.name || ''} maxQuantity={quantityModal.indices.length} pricePerUnit={quantityModal.item ? calculateItemPrice(quantityModal.item) : 0} onConfirm={handleQuantityConfirm} onClose={() => setQuantityModal({...quantityModal, isOpen: false})} actionType={quantityModal.actionType} />
      <QuantityModal 
    isOpen={!!weddingGiftData} 
    title="축의금 전달" 
    itemName="축의금 (단위: 50,000 G)" 
    maxQuantity={Math.floor(character.money / 50000)} 
    pricePerUnit={50000} 
    onConfirm={handleWeddingGiftConfirm} 
    onClose={() => setWeddingGiftData(null)} 
    actionType="sell" 
  />
      {evolvingCompanionIndex !== null && character.companions[evolvingCompanionIndex] && (
        <ClassEvolutionModal 
          tier={character.companions[evolvingCompanionIndex].classTier === ClassTier.NONE ? ClassTier.FIRST : character.companions[evolvingCompanionIndex].classTier === ClassTier.FIRST ? ClassTier.SECOND : character.companions[evolvingCompanionIndex].classTier === ClassTier.SECOND ? ClassTier.LAST : ClassTier.FINAL} 
          onClose={() => setEvolvingCompanionIndex(null)}
          onSubmit={async (name, desc, type) => { 
            const comp = character.companions[evolvingCompanionIndex]; 
            const newComps = [...character.companions]; 
            const tier = comp.classTier === ClassTier.NONE ? ClassTier.FIRST : comp.classTier === ClassTier.FIRST ? ClassTier.SECOND : comp.classTier === ClassTier.SECOND ? ClassTier.LAST : ClassTier.FINAL; 
            newComps[evolvingCompanionIndex] = { 
              ...comp, 
              classTier: tier, 
              shinryokuType: type || comp.shinryokuType, 
              firstClassName: tier === ClassTier.FIRST ? name : comp.firstClassName, 
              secondClassName: tier === ClassTier.SECOND ? name : comp.secondClassName, 
              lastClassName: tier === ClassTier.LAST ? name : comp.lastClassName, 
              finalClassName: tier === ClassTier.FINAL ? name : comp.finalClassName 
            }; 
            setCharacter({ ...character, companions: newComps }); 
            setEvolvingCompanionIndex(null); 
            addToLog(`[시스템] ${comp.name} 전직 완료! (${tier} -> ${name})`); 
          }} 
        />
      )}
      {pendingEvolutionTier && (
        <ClassEvolutionModal 
          tier={pendingEvolutionTier} 
          onClose={() => setPendingEvolutionTier(null)}
          onSubmit={async (name, desc, type) => { 
            const updatedChar = { ...character }; 
            if (pendingEvolutionTier === ClassTier.FIRST) { 
              updatedChar.firstClassName = name; 
              updatedChar.firstClassDescription = desc; 
              updatedChar.shinryokuType = type || "미개방"; 
              updatedChar.classTier = ClassTier.FIRST; 
            } else if (pendingEvolutionTier === ClassTier.SECOND) { 
              updatedChar.secondClassName = name; 
              updatedChar.secondClassDescription = desc; 
              updatedChar.classTier = ClassTier.SECOND; 
            } else if (pendingEvolutionTier === ClassTier.LAST) { 
              updatedChar.lastClassName = name; 
              updatedChar.lastClassDescription = desc; 
              updatedChar.classTier = ClassTier.LAST; 
            } else if (pendingEvolutionTier === ClassTier.FINAL) { 
              updatedChar.finalClassName = name; 
              updatedChar.finalClassDescription = desc; 
              updatedChar.classTier = ClassTier.FINAL; 
            } 
            setCharacter(updatedChar); 
            setPendingEvolutionTier(null); 
            const action = `[전직 수행] ${pendingEvolutionTier} 클래스 전직. 이름: ${name}, 설명: ${desc}${type ? `, 계통: ${type}` : ''} (스킬 생성 금지)`; 
            await handleAction(action, 0, updatedChar); 
          }} 
        />
      )}
      {isMonsterSkillBookOpen && skillBookTarget && 'id' in skillBookTarget && (
        <MonsterSkillBook 
          isOpen={isMonsterSkillBookOpen} 
          onClose={() => { setIsMonsterSkillBookOpen(false); setSkillBookTarget(null); }} 
          monster={skillBookTarget as Companion} 
          character={character}
          onUpdateCharacter={handleUpdateCharacter}
          onUpdateCompanion={(updated) => { setSkillBookTarget(updated); }}
        />
      )}
      <CityAndBaseModalsLayer
        character={character}
        setCharacter={setCharacter}
        sceneType={sceneType}
        isMapOpen={isMapOpen}
        setIsMapOpen={setIsMapOpen}
        mapMode={mapMode}
        setMapMode={setMapMode}
        mapInitialTargetLocationName={mapInitialTargetLocationName}
        setMapInitialTargetLocationName={setMapInitialTargetLocationName}
        handleTravel={handleTravel}
        isCityOpen={isCityOpen}
        setIsCityOpen={setIsCityOpen}
        cityInitialConfig={cityInitialConfig}
        setCityInitialConfig={setCityInitialConfig}
        handleAction={handleAction}
        handleUpdateCharacter={handleUpdateCharacter}
        handleBattleTrigger={handleBattleTrigger}
        setIsDungeonOpen={setIsDungeonOpen}
        isBaseModalOpen={isBaseModalOpen}
        setIsBaseModalOpen={setIsBaseModalOpen}
        baseInitialSubModal={baseInitialSubModal}
        setBaseInitialSubModal={setBaseInitialSubModal}
        handleBaseUpgrade={handleBaseUpgrade}
        handleBasePurchase={handleBasePurchase}
        handleCompanionMove={handleCompanionMove}
        handleAssignment={handleAssignment}
        handleItemAction={handleItemAction}
        setTrainingInitialTab={setTrainingInitialTab}
        setIsTrainingModalOpen={setIsTrainingModalOpen}
        setIsTacticalTrainingOpen={setIsTacticalTrainingOpen}
        setIsTrainingStyleOpen={setIsTrainingStyleOpen}
        handleExpTraining={handleExpTraining}
        handleSkillResearch={handleSkillResearch}
        handleSkillLimitBreak={handleSkillLimitBreak}
        handleItemEnhancement={handleItemEnhancement}
        handleHostParty={handleHostParty}
        handleInteraction={handleInteraction}
        handleFacilityUpgrade={handleFacilityUpgrade}
        handleExpandGrid={handleExpandGrid}
        handleRecallMonsterFromFarm={handleRecallMonsterFromFarm}
        handleReturnMonsterToFarm={handleReturnMonsterToFarm}
        setIsProfessionMasteryOpen={setIsProfessionMasteryOpen}
        setIsChefMasteryOpen={setIsChefMasteryOpen}
        setIsBreederMasteryOpen={setIsBreederMasteryOpen}
        setActiveBaseDamageReport={setActiveBaseDamageReport}
        isTempleManagementOpen={isTempleManagementOpen}
        setIsTempleManagementOpen={setIsTempleManagementOpen}
        isElfCityOpen={isElfCityOpen}
        setIsElfCityOpen={setIsElfCityOpen}
        isBeastCityOpen={isBeastCityOpen}
        setIsBeastCityOpen={setIsBeastCityOpen}
        isDemonCityOpen={isDemonCityOpen}
        setIsDemonCityOpen={setIsDemonCityOpen}
        activeBaseDamageReport={activeBaseDamageReport}
        addToLog={addToLog}
        isBlacksmithModalOpen={isBlacksmithModalOpen}
        setIsBlacksmithModalOpen={setIsBlacksmithModalOpen}
        isAlchemyModalOpen={isAlchemyModalOpen}
        setIsAlchemyModalOpen={setIsAlchemyModalOpen}
        isRestModalOpen={isRestModalOpen}
        setIsRestModalOpen={setIsRestModalOpen}
        handleExecuteRest={handleExecuteRest}
        restModalInitialDays={restModalInitialDays}
      /> 

      {selectedCompanionId && findCompanionRef(character, selectedCompanionId) && (
        <CompanionStatusModal 
          character={character} 
          companion={findCompanionRef(character, selectedCompanionId)!} 
          playerInventory={character.inventory} 
          onClose={() => { setSelectedCompanionIndex(null); setSelectedCompanionId(null); }} 
          onIncreaseStat={handleCompanionIncreaseStat} 
          onOpenSkillBook={() => { 
            const comp = findCompanionRef(character, selectedCompanionId)!; 
            setSkillBookTarget(comp); 
            if (comp.isMonster || comp.monsterData) setIsMonsterSkillBookOpen(true); 
            else setIsSkillBookOpen(true); 
          }} 
          onOpenWeaponMastery={() => { 
            setWeaponMasteryTarget(findCompanionRef(character, selectedCompanionId)!); 
            setIsWeaponMasteryOpen(true); 
          }} 
          onEvolveClass={() => {
            const comp = findCompanionRef(character, selectedCompanionId)!;
            const idx = character.companions.findIndex(c => c.id === comp.id);
            if (idx !== -1) setEvolvingCompanionIndex(idx);
          }} 
          onBattle={handleBattleTrigger}
          onEquipItem={handleCompanionEquip} 
          onUnequipItem={handleCompanionUnequip} 
          onUseItem={(item, idx) => handleItemAction('use', item, idx)} 
          onChat={async (text) => { 
            const comp = findCompanionRef(character, selectedCompanionId)!; 
            const reply = await chatWithCompanion(comp, text, character); 
            const updatedChar = { ...character };
            const c = findCompanionRef(updatedChar, selectedCompanionId)!;
            const newHistory = [...(c.chatHistory || []), { role: 'user' as const, text }, { role: 'companion' as const, text: reply }]; 
            const affMatch = reply.match(/\[AFF([+-]\d+)\]/); 
            const loyMatch = reply.match(/\[LOY([+-]\d+)\]/); 
            if (affMatch) c.affection = Math.max(-100, Math.min(100, c.affection + parseInt(affMatch[1]))); 
            if (loyMatch) c.loyalty = Math.max(-100, Math.min(100, c.loyalty + parseInt(loyMatch[1]))); 
            const cleanReply = reply.replace(/\[(AFF|LOY)[+-]\d+\]/g, '').trim(); 
            newHistory[newHistory.length - 1].text = cleanReply; 
            c.chatHistory = newHistory; 
            handleUpdateCharacter(updatedChar);
            return cleanReply; 
          }} 
          onPartWays={handlePartWays} 
          onReturnToFarm={handleReturnToFarm} 
          onMount={() => {
            setMountMonsterId(selectedCompanionId);
            setIsMountTargetModalOpen(true);
          }}
          onUpdateCharacter={handleUpdateCharacter} 
          onGiftItem={handleCompanionGift} 
          onConfess={async () => { 
            const comp = findCompanionRef(character, selectedCompanionId)!;
            await handleAction(`[동료 고백] 대상: ${comp.name}`); 
            return undefined; 
          }} 
          onClearChat={() => { 
            const updatedChar = { ...character };
            const c = findCompanionRef(updatedChar, selectedCompanionId)!;
            c.chatHistory = []; 
            handleUpdateCharacter(updatedChar);
          }} 
          onDate={() => {
            const comp = findCompanionRef(character, selectedCompanionId)!;
            const updatedChar = { ...character };
            checkAndTriggerDateEvent(updatedChar, comp.id);
            handleUpdateCharacter(updatedChar);
            setSelectedCompanionId(null);
            setSelectedCompanionIndex(null);
          }} 
          onBreakUp={() => {
            const comp = findCompanionRef(character, selectedCompanionId)!;
            handleAction(`[동료 이별] 대상: ${comp.name} (연인 관계 종료)`);
          }} 
          onDivorce={handleDivorce}
          onEquipTitle={(cid, tid) => handleEquipTitle(cid, tid)} 
        />
      )}
      {isDashboardOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300"><DashboardModal character={character} onClose={() => setIsDashboardOpen(false)} onUseItem={(item, idx) => handleItemAction('use', item, idx)} onEquipItem={handleEquipItem} onUnequipItem={handleUnequipItem} onSellItem={(item, idx) => handleItemAction('sell', item, idx)} onDiscardItem={(item, idx) => handleItemAction('discard', item, idx)} onSelectCompanion={handleSelectCompanion} onSelectMountedMonster={handleSelectMountedMonster} onIncreaseStat={handleIncreaseStat} onEquipTitle={(tid) => handleEquipTitle('player', tid)} /></div>}
      {isWeaponMasteryOpen && <WeaponMasteryModal character={weaponMasteryTarget || character} onClose={() => { setIsWeaponMasteryOpen(false); setWeaponMasteryTarget(null); }} />}
      {isProfessionMasteryOpen && <ProfessionMasteryModal isOpen={isProfessionMasteryOpen} onClose={() => setIsProfessionMasteryOpen(false)} character={character} />}
      {isChefMasteryOpen && <ChefMasteryModal isOpen={isChefMasteryOpen} onClose={() => setIsChefMasteryOpen(false)} character={character} onUpdateCharacter={handleUpdateCharacter} />}
      {isBreederMasteryOpen && <BreederMasteryModal isOpen={isBreederMasteryOpen} onClose={() => setIsBreederMasteryOpen(false)} character={character} onUpdateCharacter={handleUpdateCharacter} />}
      {isSettingsOpen && (
        <GameSettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          uiTheme={uiTheme} 
          onChangeTheme={(t) => setUiTheme(t)} 
          combatSpeed={combatSpeed}
          onChangeCombatSpeed={handleCombatSpeedChange}
          defaultPlayerAuto={defaultPlayerAuto}
          onChangeDefaultPlayerAuto={handleDefaultPlayerAutoChange}
          defaultCompanionAuto={defaultCompanionAuto}
          onChangeDefaultCompanionAuto={handleDefaultCompanionAutoChange}
          autoSaveEnabled={autoSaveEnabled}
          onChangeAutoSaveEnabled={handleAutoSaveEnabledChange}
          disableSkillEffects={disableSkillEffects}
          onChangeDisableSkillEffects={handleDisableSkillEffectsChange}
          disableBackdropBlur={disableBackdropBlur}
          onChangeDisableBackdropBlur={handleDisableBackdropBlurChange}
          disableScreenShake={disableScreenShake}
          onChangeDisableScreenShake={handleDisableScreenShakeChange}
          disableCommonCompanionInteraction={disableCommonCompanionInteraction}
          onChangeDisableCommonCompanionInteraction={handleDisableCommonCompanionInteractionChange}
        />
      )}
      <DevTools isOpen={isDevModeOpen} onClose={() => setIsDevModeOpen(false)} character={character} onUpdate={(newChar) => setCharacter(newChar)} />
      <DevPasswordModal isOpen={isDevPasswordModalOpen} onConfirm={handleDevPasswordConfirm} onClose={() => setIsDevPasswordModalOpen(false)} />
      
      {/* Mobile quick action menu popover/modal */}
      {isMobileQuickMenuOpen && (
        <div 
          className="fixed inset-0 z-[1050] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsMobileQuickMenuOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-amber-500 flex items-center gap-2 text-sm">
                <Grid size={16} />
                모험 관리 메뉴
              </h3>
              <button 
                onClick={() => setIsMobileQuickMenuOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
              {/* 몬스터 도감 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setIsBestiaryOpen?.(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-red-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-red-950/20 flex items-center justify-center border border-red-900/30 text-slate-400 group-hover:text-red-400">
                  <Skull size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">몬스터 도감</span>
              </button>

              {/* 영원의 라이벌 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setIsEternalRivalOpen(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-red-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-red-950/20 flex items-center justify-center border border-red-900/30 text-red-400 group-hover:text-red-200">
                  <Flame size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">영원의 라이벌</span>
              </button>

              {/* 의뢰 일지 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setIsQuestLogOpen(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400 group-hover:text-amber-400">
                  <ScrollText size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">의뢰 일지</span>
              </button>



              {/* 지도 / 이동 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setMapMode('travel'); setIsMapOpen(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-blue-950/20 flex items-center justify-center border border-blue-900/30 text-slate-400 group-hover:text-blue-400">
                  <MapIcon size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">지도 / 이동</span>
              </button>

              {/* 종합 관리 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setIsDashboardOpen(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-amber-950/20 flex items-center justify-center border border-amber-900/30 text-slate-400 group-hover:text-amber-500">
                  <Grid size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">종합 관리</span>
              </button>

              {/* 게임 설정 및 테마 */}
              <button 
                onClick={() => { setIsMobileQuickMenuOpen(false); setIsSettingsOpen(true); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group col-span-2 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-950/20 flex items-center justify-center border border-indigo-900/30 text-slate-400 group-hover:text-indigo-400 mx-auto">
                  <Settings size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-200">게임 설정 및 테마</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isSkillBookOpen && (
        <SkillBook 
          isOpen={isSkillBookOpen} 
          onClose={() => { setIsSkillBookOpen(false); setSkillBookTarget(null); }} 
          character={skillBookTarget || character} 
          playerCharacter={character}
          onLearnSkill={handleLearnSkill} 
          onUpdateCharacter={(updatedEntity: any) => {
            if (skillBookTarget && 'id' in skillBookTarget) {
              // 동료 대상일 경우: 전달된 엔티티가 동일한 id를 가진 동료일 때만 동료 슬롯 갱신 (플레이어 캐릭터로 덮어씌워지는 오류 방지)
              if (updatedEntity && 'id' in updatedEntity && updatedEntity.id === (skillBookTarget as Companion).id) {
                const newChar = { ...character };
                let compIndex = newChar.companions.findIndex(c => c.id === (skillBookTarget as Companion).id);
                if (compIndex >= 0) {
                  newChar.companions[compIndex] = updatedEntity;
                  setSkillBookTarget(updatedEntity);
                } else {
                  let inactiveIndex = (newChar.inactiveCompanions || []).findIndex(c => c.id === (skillBookTarget as Companion).id);
                  if (inactiveIndex >= 0) {
                    newChar.inactiveCompanions![inactiveIndex] = updatedEntity;
                    setSkillBookTarget(updatedEntity);
                  }
                }
                setCharacter(newChar);
              }
            } else {
              setCharacter(updatedEntity);
            }
          }} 
        />
      )}
      {isSocialOpen && (
        <SocialNetworkModal 
          character={character} 
          onUpdateCharacter={handleUpdateCharacter} 
          onClose={() => {
              setIsSocialOpen(false);
              setSocialInitialSelectedId(undefined);
          }} 
          initialSelectedId={socialInitialSelectedId}
          onBattle={handleBattleTrigger} 
          onTimeSkip={(newChar, days, logMsg) => {
              const { updatedCharacter, dailyReport: newReport, worldNews: newNews } = processTimeSkip(newChar, days);
              if (newReport) setDailyReport(newReport);
              if (newNews) setWorldNewsList(newNews);
              handleUpdateCharacter(updatedCharacter, logMsg);
          }}
        />
      )} 
      
      {isMountTargetModalOpen && mountMonsterId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-indigo-500 rounded-xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center shrink-0">
                      <Sword className="mr-2 text-indigo-400" size={20}/> 탈것 장착 대상 선택
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 shrink-0">
                      이 몬스터를 누구의 탈것으로 장착하시겠습니까?
                  </p>
                  <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1">
                      <button 
                          onClick={() => handleMountMonster(mountMonsterId, 'player')}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-white rounded-lg border border-slate-700 flex items-center justify-between px-4 transition-colors"
                      >
                          <span className="font-bold">플레이어</span>
                          <UserIcon size={16} className="text-slate-500"/>
                      </button>
                      {(character.companions || []).filter(c => c && c.id !== mountMonsterId && !c.mountedMonsterId).map(comp => (
                          <button 
                              key={comp.id}
                              onClick={() => handleMountMonster(mountMonsterId, comp.id)}
                              className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-white rounded-lg border border-slate-700 flex items-center justify-between px-4 transition-colors"
                          >
                              <span className="font-bold">{comp.name}</span>
                              <Users size={16} className="text-slate-500"/>
                          </button>
                      ))}
                  </div>
                  <button 
                      onClick={() => { setIsMountTargetModalOpen(false); setMountMonsterId(null); }}
                      className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors shrink-0 font-medium text-sm"
                  >
                      취소
                  </button>
              </div>
          </div>
      )}

      {pendingCriminalResolution && (
          <CriminalResolutionModal 
              character={character} 
              criminal={pendingCriminalResolution} 
              onClose={() => setPendingCriminalResolution(null)} 
              onUpdateCharacter={handleUpdateCharacter} 
          />
      )}


      {/* [NEW] 클래스명 변경 모달 */}
      {isClassNameModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <ScrollText className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100 italic serif">클래스명 변경</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">변경할 클래스 단계</label>
                <div className="grid grid-cols-2 gap-2">
                  {[ClassTier.FIRST, ClassTier.SECOND, ClassTier.LAST, ClassTier.FINAL].map(tier => (
                    <button
                      key={tier}
                      onClick={() => setSelectedClassTier(tier)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        selectedClassTier === tier 
                          ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">새로운 클래스명</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="새로운 이름을 입력하세요"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => setIsClassNameModalOpen(false)}
                className="py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleClassNameChange}
                disabled={!newClassName.trim()}
                className="py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
              >
                변경 적용
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* [NEW] 이름 변경 모달 */}
      {isNameChangeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <UserIcon className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100 italic serif">이름 변경</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">새로운 이름</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="새로운 이름을 입력하세요"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => setIsNameChangeModalOpen(false)}
                className="py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleNameChange}
                disabled={!newName.trim()}
                className="py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
              >
                변경 적용
              </button>
            </div>
          </motion.div>
        </div>
      )}

  {pendingTempleConquest && (
          <TempleConquestResultModal
              character={character}
              targetTempleName={pendingTempleConquest}
              onClose={() => setPendingTempleConquest(null)}
              onUpdateCharacter={handleUpdateCharacter}
          />
      )}

      {pendingRelationResolution && (
          <RelationResolutionModal
              character={character}
              targetId={pendingRelationResolution.targetId}
              enemy={pendingRelationResolution.enemy}
              onClose={() => setPendingRelationResolution(null)}
              onUpdateCharacter={handleUpdateCharacter}
          />
      )}

      {pendingTournamentPostMatch && (
          <TournamentPostMatchModal
              data={pendingTournamentPostMatch}
              character={character}
              onClose={() => setPendingTournamentPostMatch(null)}
              onUpdateCharacter={(newChar, logMsg) => {
                  handleUpdateCharacter(newChar);
                  if (logMsg) {
                      setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${logMsg}` }]);
                  }
                  setPendingTournamentPostMatch(null);
              }}
          />
      )}

      {character.pendingDefenseEvent && (
          <TempleDefenseEventModal 
            character={character}
            event={character.pendingDefenseEvent as any}
            onClose={() => {
                const newChar = { ...character, pendingDefenseEvent: undefined };
                setCharacter(newChar);
            }}
            onUpdateCharacter={handleUpdateCharacter}
            onBattle={(enemy, type, source, targetCity, targetNation) => {
                handleBattleTrigger(enemy, type as any, source, targetCity, targetNation);
                const newChar = { ...character, pendingDefenseEvent: undefined };
                setCharacter(newChar);
            }}
          />
      )}
      


      <WarAndMagyeModalsLayer
        character={character}
        setCharacter={setCharacter}
        handleUpdateCharacter={handleUpdateCharacter}
        handleBattleTrigger={handleBattleTrigger}
        setResultModalData={setResultModalData}
        isMagyeHeavenWarOpen={isMagyeHeavenWarOpen}
        setIsMagyeHeavenWarOpen={setIsMagyeHeavenWarOpen}
      />

      {/* [NEW] Choice Event Modal */}
      {character.pendingChoiceEvent && (
          <ChoiceEventModal 
            character={character}
            event={character.pendingChoiceEvent}
            onResolve={handleChoiceEventResolve}
          />
      )}
      
  {/* ... existing modals */}
      {latestRankUp && (
          <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none"
          >
              <div className="bg-gradient-to-b from-amber-400 to-amber-600 p-8 md:p-12 rounded-full shadow-[0_0_100px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center animate-bounce border-4 border-white/40">
                  <Sparkles size={64} className="text-white mb-2 drop-shadow-lg" />
                  <h2 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl italic tracking-tighter">RANK UP!</h2>
                  <div className="bg-black/60 px-6 py-2 rounded-full mt-4 border border-white/20 backdrop-blur-md">
                      <span className="text-amber-200 text-xl font-bold">{latestRankUp.profession} Lv.{latestRankUp.level} 달성!</span>
                  </div>
              </div>
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
              />
          </motion.div>
      )}

      {isEternalRivalOpen && (
          <EternalRivalModal
            character={character}
            onClose={() => setIsEternalRivalOpen(false)}
            onUpdateCharacter={handleUpdateCharacter}
            onBattle={handleBattleTrigger}
          />
      )}
  {view === 'start' && (
      <StartScreen 
        onNewGame={handleNewGame} 
        onContinue={() => { setSaveLoadMode('load'); setIsSaveLoadOpen(true); }} 
        currentUser={currentUser}
        onOpenAuth={(mode) => { 
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onLogout={() => {
          setResultModalData({
            type: 'warning',
            title: '로그아웃 확인',
            message: '정말로 로그아웃 하시겠습니까?\n로그아웃하면 클라우드 저장 기능을 사용할 수 없습니다.',
            items: []
          });
          setResultActionContext({ type: 'logout', args: [] });
        }}
      />
  )}
      {view === 'creation' && <CharacterCreationForm onSubmit={handleCustomCharacterSubmit} isLoading={isLoading} />}
      {view === 'game' && (
        <>
            <div className="flex flex-1 overflow-hidden relative">
                {sceneType !== 'combat' && (
                    <div className={`fixed inset-0 z-[100] md:static md:bg-transparent md:z-auto transition-all duration-300 md:block ${isMobileMenuOpen ? 'visible bg-black/80' : 'invisible md:visible pointer-events-none md:pointer-events-auto'}`} onClick={(e) => { if (window.innerWidth < 768 && isMobileMenuOpen) { setIsMobileMenuOpen(false); } }}>
                        <div className={`h-full w-80 md:w-80 flex flex-col relative bg-slate-900 border-r border-slate-700 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)} 
                                className="absolute top-2.5 right-2.5 md:hidden text-slate-200 hover:text-white bg-slate-800/95 hover:bg-slate-700 p-2.5 rounded-full z-[110] shadow-2xl border border-slate-600 active:scale-95 cursor-pointer"
                                title="닫기"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex-1 overflow-hidden">
                               <CharacterSheet character={character} onOpenSkillBook={() => { setSkillBookTarget(null); setIsSkillBookOpen(true); }} onOpenWeaponMastery={() => { setWeaponMasteryTarget(null); setIsWeaponMasteryOpen(true); }} onOpenProfessionMastery={() => setIsProfessionMasteryOpen(true)} onIncreaseStat={handleIncreaseStat} onUseItem={(item, idx) => handleItemAction('use', item, idx as number)} onUnequipItem={handleUnequipItem} onSellItem={(item, idx, isAll) => {
                                         if (isAll) {
                                             executeBatchItemAction('sell', item, idx as number[]);
                                         } else {
                                             handleItemAction('sell', item, idx as number);
                                         }
                                     }} onDiscardItem={(item, idx) => handleItemAction('discard', item, idx as number)} onToggleItemLock={handleToggleItemLock} onToggleItemFavorite={handleToggleItemFavorite} onAutoSellItems={handleAutoSellItems} onSelectCompanion={(idx) => {
                                     const comp = character.companions[idx];
                                     if (comp) {
                                         handleSelectCompanion(comp.id);
                                     }
                                  }} inactiveCompanions={character.inactiveCompanions} onRejoinCompanion={(idx) => { const c = character.inactiveCompanions![idx]; const ni = [...character.inactiveCompanions!]; ni.splice(idx, 1); let updatedChar: Character = {...character, companions: [...character.companions, c], inactiveCompanions: ni}; updatedChar = unassignFromTraining(updatedChar, c.id); setCharacter(updatedChar); addToLog(`[시스템] ${c.name} 동료가 재합류했습니다.`); }} onPermanentlyDismissCompanion={(idx) => { const c = character.inactiveCompanions![idx]; const ni = [...character.inactiveCompanions!]; ni.splice(idx, 1); let updatedChar: Character = {...character, inactiveCompanions: ni}; updatedChar = unassignFromTraining(updatedChar, c.id); setCharacter(updatedChar); addToLog(`[시스템] ${c.name} 동료를 영구적으로 삭제했습니다.`); }} onEquipItem={handleEquipItem} onToggleFavoriteCompanion={handleToggleFavoriteCompanion} onDismissCompanion={(idx) => { const comp = character.companions[idx]; if (!comp) return; if (!character.base) { setResultModalData({ type: 'failure', title: '대기명단 이동 불가', message: '기지가 아직 건설되지 않았습니다.\n기지가 없는 상태에서는 동료를 대기명단(숙소)으로 보낼 수 없습니다. 먼저 기지를 건설해야 잠시 이별이 가능합니다.', items: [] }); return; } const newChar = { ...character }; newChar.companions = newChar.companions.filter((_, i) => i !== idx); if (!newChar.inactiveCompanions) newChar.inactiveCompanions = []; newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== comp.id); newChar.inactiveCompanions.push(comp); setCharacter(newChar); addToLog("[시스템] " + comp.name + "와(과) 잠시 이별했습니다. 기지(숙소)에서 다시 만날 수 있습니다."); }} onUpdateCharacter={setCharacter} onOpenSocial={() => setIsSocialOpen(true)} onOpenChronicles={() => setIsChroniclesOpen(true)} />
                            </div>
                        </div>
                    </div>
                )}
<div className="flex-1 flex flex-col bg-slate-900 relative w-full overflow-hidden">
                    {sceneType !== 'combat' && (
                        <>
                            {/* Unified Top-Right Buttons (기능 & 메뉴 & HeaderShortcuts) */}
                            <div className="absolute top-3.5 right-2 sm:top-5 sm:right-4 z-40 flex flex-col items-end gap-1.5 sm:gap-2">
                                {/* Top Row: 기능 & 메뉴 버튼 */}
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    {/* 1. 기능 드롭다운 버튼 */}
                                    <div className="relative">
                                    <button 
                                        onClick={() => setIsMobileFunctionsOpen(!isMobileFunctionsOpen)} 
                                        className={`relative px-3 sm:px-3.5 py-2.5 sm:py-3 h-10 sm:h-11 border rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 cursor-pointer select-none ${isMobileFunctionsOpen ? 'bg-amber-600 border-amber-500 text-slate-950 font-black' : 'bg-slate-900/90 border-slate-700 text-slate-100 hover:border-amber-500 hover:text-amber-400'}`}
                                        title="기능 메뉴"
                                    >
                                        <Grid size={16} />
                                        <span>기능</span>
                                        {unreadMailCount > 0 && (
                                            <span className="bg-red-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black min-w-[17px] text-center leading-tight shadow-md">
                                                {unreadMailCount > 99 ? '99+' : unreadMailCount}
                                            </span>
                                        )}
                                    </button>

                                    {isMobileFunctionsOpen && (
                                        <>
                                            {/* Transparent Backdrop Overlay */}
                                            <div className="fixed inset-0 z-40" onClick={() => setIsMobileFunctionsOpen(false)} />
                                            
                                            {/* Functions Dropdown Menu Items */}
                                            <div className="absolute right-0 mt-2 w-72 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
                                                <div className="text-[10px] text-slate-500 font-bold px-1.5 pb-2 border-b border-slate-900 mb-2 flex items-center justify-between">
                                                    <span>신의 사자 기능</span>
                                                    <span className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">선택</span>
                                                </div>

                                                {/* 모바일 전용: 캐릭터 정보 버튼 */}
                                                <div className="md:hidden mb-2">
                                                    <button 
                                                        onClick={() => { setIsMobileMenuOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="w-full p-2.5 text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer shadow-sm"
                                                    >
                                                        <UserIcon size={14} className="text-amber-400 shrink-0" />
                                                        <span>내 정보 (캐릭터 상세)</span>
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* 1. 휴식 */}
                                                    <button 
                                                        onClick={() => { handleOpenRestModal(1); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-indigo-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Clock size={14} className="text-indigo-400 shrink-0" />
                                                        <span>휴식</span>
                                                    </button>

                                                    {/* 2. 서신함 */}
                                                    <button 
                                                        onClick={() => { setIsMailboxOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-amber-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/50 rounded-xl flex items-center justify-between transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Mail size={14} className="text-amber-400 shrink-0" />
                                                            <span>서신함</span>
                                                        </div>
                                                        {unreadMailCount > 0 ? (
                                                            <span className="bg-amber-500 text-slate-950 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black">
                                                                {unreadMailCount}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 font-mono">0</span>
                                                        )}
                                                    </button>

                                                    {/* 3. 기지 */}
                                                    <button 
                                                        onClick={() => { handleOpenBase(); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-emerald-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Home size={14} className="text-emerald-400 shrink-0" />
                                                        <span>기지</span>
                                                    </button>

                                                    {/* 4. 차원 */}
                                                    <button 
                                                        onClick={() => { handleOpenCommunication(); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-blue-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-blue-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Radio size={14} className="text-blue-400 shrink-0" />
                                                        <span>차원</span>
                                                    </button>

                                                    {/* 5. 도감 */}
                                                    <button 
                                                        onClick={() => { setIsBestiaryOpen?.(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-red-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-red-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Skull size={14} className="text-red-400 shrink-0" />
                                                        <span>도감</span>
                                                    </button>

                                                    {/* 6. 라이벌 */}
                                                    <button 
                                                        onClick={() => { setIsEternalRivalOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-rose-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-rose-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Flame size={14} className="text-rose-400 shrink-0" />
                                                        <span>라이벌</span>
                                                    </button>

                                                    {/* 7. 퀘스트 */}
                                                    <button 
                                                        onClick={() => { setIsQuestLogOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-amber-500 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <ScrollText size={14} className="text-amber-500 shrink-0" />
                                                        <span>퀘스트</span>
                                                    </button>

                                                    {/* 8. 지도 */}
                                                    <button 
                                                        onClick={() => { setMapMode('travel'); setIsMapOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-teal-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-teal-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <MapIcon size={14} className="text-teal-400 shrink-0" />
                                                        <span>지도</span>
                                                    </button>

                                                    {/* 9. 전술 */}
                                                    <button 
                                                        onClick={() => { setIsTacticsOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-purple-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-purple-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Target size={14} className="text-purple-400 shrink-0" />
                                                        <span>전술</span>
                                                    </button>

                                                    {/* 10. 약속 */}
                                                    <button 
                                                        onClick={() => { setIsAppointmentListOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-pink-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-pink-500/50 rounded-xl flex items-center justify-between transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Calendar size={14} className="text-pink-400 shrink-0" />
                                                            <span>약속</span>
                                                        </div>
                                                        {((character.socialAppointments || []).filter(a => a.status === 'pending').length > 0) && (
                                                            <span className="bg-pink-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black shrink-0">
                                                                {(character.socialAppointments || []).filter(a => a.status === 'pending').length}
                                                            </span>
                                                        )}
                                                    </button>

                                                    {/* 11. 기사 */}
                                                    <button 
                                                        onClick={() => { setIsReactionBoardOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                        className="p-2.5 text-slate-300 hover:text-sky-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-sky-500/50 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                    >
                                                        <Newspaper size={14} className="text-sky-400 shrink-0" />
                                                        <span>기사</span>
                                                    </button>
                                                </div>

                                                {/* 9. 종합관리 (Spans full width) */}
                                                <button 
                                                    onClick={() => { setIsDashboardOpen(true); setIsMobileFunctionsOpen(false); }} 
                                                    className="w-full mt-2 p-2.5 text-slate-300 hover:text-cyan-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-cyan-500/50 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs font-bold cursor-pointer" 
                                                >
                                                    <Grid size={14} className="text-cyan-400 shrink-0" />
                                                    <span>종합관리</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 2. 메뉴 드롭다운 버튼 */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsTopMenuOpen(!isTopMenuOpen)} 
                                        className="px-3 sm:px-3.5 py-2.5 sm:py-3 h-10 sm:h-11 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 text-slate-100 hover:text-amber-400 rounded-xl transition-all shadow-lg backdrop-blur-sm flex items-center gap-1.5 font-bold text-xs sm:text-sm cursor-pointer select-none"
                                    >
                                        <Menu size={16} className="text-amber-500" />
                                        <span>메뉴</span>
                                    </button>

                                    {isTopMenuOpen && (
                                        <>
                                            {/* Transparent Backdrop Overlay */}
                                            <div className="fixed inset-0 z-40" onClick={() => setIsTopMenuOpen(false)} />
                                            
                                            {/* Dropdown Menu Items */}
                                            <div className="absolute right-0 mt-2 w-48 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                                {/* 1. 운영자 (Operator) */}
                                                <button 
                                                    onClick={() => { setIsTopMenuOpen(false); handleOpenDevMode(); }} 
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                >
                                                    <ShieldAlert size={14} className="text-red-400 shrink-0" />
                                                    <span>운영자</span>
                                                </button>

                                                {/* 2. 저장/로드 (Save/Load) */}
                                                <button 
                                                    onClick={() => { setIsTopMenuOpen(false); setSaveLoadMode('save'); setIsSaveLoadOpen(true); }} 
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                >
                                                    <Save size={14} className="text-amber-400 shrink-0" />
                                                    <span>저장/로드</span>
                                                </button>

                                                {/* 3. 게임 설정 및 테마 */}
                                                <button 
                                                    onClick={() => { setIsTopMenuOpen(false); setIsSettingsOpen(true); }} 
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                >
                                                    <Settings size={14} className="text-indigo-400 shrink-0 animate-spin-slow" />
                                                    <span>게임 설정 및 테마</span>
                                                </button>

                                                {/* Divider */}
                                                <div className="border-t border-slate-800/85 my-1" />

                                                {/* 4. 종료 (Exit/Quit) */}
                                                <button 
                                                    onClick={() => { setIsTopMenuOpen(false); setIsExitModalOpen(true); }} 
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                >
                                                    <LogOut size={14} className="shrink-0" />
                                                    <span>종료</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Row (메뉴 버튼 하단): 바로가기 바 (Header Shortcuts) */}
                            <HeaderShortcuts 
                                unreadMailCount={unreadMailCount} 
                                onAction={handleShortcutAction} 
                            />
                        </div>
                    </>
                    )}

                    {/* [상시 퀘스트 트래커] 전투 중(combat)이나 도시 시설(CityInterface) 진입 시에도 최상단 플로팅으로 상시 표시 */}
                    <QuestTracker character={character} onToggleTrack={handleToggleTrack} />
                    {sceneType === 'combat' ? (
                        <Suspense fallback={<SceneLoadingFallback mode="combat" title="전투 전장 진입 중..." fullScreen={false} />}>
                            <IsolatedCombatContainer 
                                combatState={combatState} 
                                player={character} 
                                onAction={handleActionWithTime} 
                                isLoading={isLoading} 
                                narrative={messages[messages.length - 1]?.role === 'ai' ? messages[messages.length - 1].text : undefined} 
                                onUpdateCharacter={handleUpdateCharacter} 
                            />
                        </Suspense>
                    ) : (
                        <div className="flex-1 flex flex-col relative min-h-0 w-full overflow-hidden">
                            {/* City Map Board as the main visual viewport */}
                            <CityMapBoard 
                                character={character}
                                onEnterCity={(district, openHuntMap) => {
                                    setCityInitialConfig({ district, openHuntMap });
                                    setIsCityOpen(true);
                                }}
                                onOpenDungeon={() => setIsDungeonOpen(true)}
                                onOpenMap={() => {
                                    setMapMode('travel');
                                    setIsMapOpen(true);
                                }}
                                onOpenBase={() => setIsBaseModalOpen(true)}
                                onOpenElfCity={() => setIsElfCityOpen(true)}
                                onOpenDemonCity={() => setIsDemonCityOpen(true)}
                                onOpenBeastCity={() => setIsBeastCityOpen(true)}
                                onTravel={handleTravel}
                                onUpdateCharacter={handleUpdateCharacter}
                                onStartBattle={(enemies, type, source) => handleBattleTrigger(enemies, type as any, source)}
                            />

                             {/* Collapsible, Toggleable Floating Log Chat Overlay */}
                            <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 z-40 flex flex-col items-start gap-2">
                                {isLogChatOpen ? (
                                    <motion.div 
                                        drag
                                        dragMomentum={false}
                                        dragElastic={0.05}
                                        className="w-[92vw] xs:w-[340px] sm:w-[420px] h-[280px] sm:h-[380px] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden select-none cursor-grab active:cursor-grabbing backdrop-blur-md"
                                    >
                                        {/* Header */}
                                        <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                                                <span className="text-[11px] font-black text-slate-200 truncate">실시간 로그</span>
                                                <span className="text-[8px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-mono shrink-0">
                                                    {messages.length}건
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* 서신함 버튼 */}
                                                <button 
                                                    onClick={() => setIsMailboxOpen(true)} 
                                                    className="px-2 py-0.5 bg-amber-950/40 hover:bg-amber-900 text-amber-400 hover:text-white border border-amber-850/40 rounded-md text-[9px] font-black transition-colors flex items-center gap-1 cursor-pointer"
                                                    title="서신함 열기"
                                                >
                                                    <Mail size={9} />
                                                    <span>서신함</span>
                                                </button>
                                                {/* 로그 삭제 버튼 */}
                                                <button 
                                                    onClick={handleClearLogs} 
                                                    className="px-2 py-0.5 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-850/40 rounded-md text-[9px] font-black transition-colors flex items-center gap-1 cursor-pointer"
                                                    title="로그 비우기"
                                                >
                                                    <Trash2 size={9} />
                                                    <span>로그삭제</span>
                                                </button>
                                                {/* 닫기 버튼 */}
                                                <button 
                                                    onClick={() => setIsLogChatOpen(false)} 
                                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                                    title="로그 대화창 최소화"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Logs Area */}
                                        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-950/45 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                                            <GameLog messages={messages} isLoading={isLoading} />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button 
                                        onClick={() => setIsLogChatOpen(true)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-900/95 hover:bg-slate-850 text-amber-300 hover:text-amber-200 font-bold text-[11px] sm:text-xs rounded-full shadow-lg transition-all active:scale-95 border border-amber-500/40 cursor-pointer select-none backdrop-blur-sm"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span>실시간 로그</span>
                                        {messages.length > 0 && (
                                            <span className="bg-amber-950/80 text-amber-400 text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-amber-800/60">
                                                {messages.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {sceneType !== 'combat' && choices.length > 0 && (
                        <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 z-20 flex flex-wrap gap-2 items-center justify-center">
                            {choices.map((choice, idx) => {
                                const safeChoice = typeof choice === 'object' && choice !== null && (choice as any).text 
                                    ? String((choice as any).text) 
                                    : (typeof choice === 'string' ? choice : String(choice || ""));
                                return (
                                    <button key={idx} onClick={() => handleAction(safeChoice)} disabled={isLoading} className="px-4 py-1.5 bg-slate-800 hover:bg-amber-900/40 text-slate-200 border border-slate-700 hover:border-amber-500/50 rounded-full text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50">{safeChoice}</button>
                                );
                            })}
                        </div>
                    )}
                <CommunicationModal 
                    isOpen={isCommunicationOpen} 
                    onClose={() => setIsCommunicationOpen(false)} 
                    character={character} 
                    onOpenBattle={() => setIsCommunicationBattleOpen(true)}
                    onOpenSummon={() => setIsCommunicationSummonOpen(true)}
                    onOpenItem={() => setIsCommunicationItemOpen(true)}
                    onUpdateCharacter={handleUpdateCharacter}
                />
                <CommunicationBattleModal 
                    isOpen={isCommunicationBattleOpen}
                    onClose={() => setIsCommunicationBattleOpen(false)}
                    character={character}
                    onStartBattle={handleStartPvpBattle}
                    onUpdateCharacter={handleUpdateCharacter}
                />
                <CommunicationSummonModal 
                    isOpen={isCommunicationSummonOpen}
                    onClose={() => setIsCommunicationSummonOpen(false)}
                    character={character}
                    onUpdateCharacter={handleUpdateCharacter}
                />
                <CommunicationItemModal
                    isOpen={isCommunicationItemOpen}
                    onClose={() => setIsCommunicationItemOpen(false)}
                    character={character}
                    onUpdateCharacter={handleUpdateCharacter}
                />
                {character.pendingConfessionCompanionId && (
                    <ConfessionModal
                        key="confession-modal"
                        character={character}
                        companionId={character.pendingConfessionCompanionId}
                        onRespond={handleConfessionRespond}
                    />
                )}
                <TutorialGuideModal
                    key="tutorial-guide-modal"
                    isOpen={isTutorialGuideOpen}
                    onClose={() => setIsTutorialGuideOpen(false)}
                    character={character}
                    onOpenCity={() => setIsCityOpen(true)}
                />
                {dailyReport && (
                    <DailySummaryPopup 
                        key="daily-summary-popup"
                        report={dailyReport} 
                        character={character}
                        onClose={() => setDailyReport(null)} 
                        onOpenBase={() => {
                            const isAtBase = !character.base?.location || (
                                character.currentLocation?.city === character.base.location.city &&
                                (!character.base.location.nation || !character.currentLocation?.nation || character.currentLocation.nation === character.base.location.nation)
                            );
                            if (!isAtBase) {
                                const baseLoc = character.base?.location 
                                    ? `${character.base.location.nation || ''} ${character.base.location.city}`.trim() 
                                    : '기지';
                                setResultModalData({
                                    type: 'warning',
                                    title: '기지 방문 필요',
                                    message: `현재 위치가 기지(${baseLoc})가 아닙니다.\n\n영지 및 파견 관리를 이용하거나 시설을 직접 관리하려면 기지가 위치한 도시로 직접 이동해야 합니다.`,
                                    items: [
                                        { label: '현재 위치', after: `${character.currentLocation?.nation || ''} ${character.currentLocation?.city || ''}`.trim() || '알 수 없음' },
                                        { label: '기지 위치', after: baseLoc }
                                    ]
                                });
                                return;
                            }
                            setIsBaseModalOpen(true);
                        }} 
                        onOpenBlacksmith={() => {
                            const isAtBase = !character.base?.location || (
                                character.currentLocation?.city === character.base.location.city &&
                                (!character.base.location.nation || !character.currentLocation?.nation || character.currentLocation.nation === character.base.location.nation)
                            );
                            if (!isAtBase) {
                                const baseLoc = character.base?.location 
                                    ? `${character.base.location.nation || ''} ${character.base.location.city}`.trim() 
                                    : '기지';
                                setResultModalData({
                                    type: 'warning',
                                    title: '기지 방문 필요',
                                    message: `현재 위치가 기지(${baseLoc})가 아닙니다.\n\n완성된 장비를 수령하거나 대장간을 이용하려면 기지가 위치한 도시로 직접 이동해야 합니다.`,
                                    items: [
                                        { label: '현재 위치', after: `${character.currentLocation?.nation || ''} ${character.currentLocation?.city || ''}`.trim() || '알 수 없음' },
                                        { label: '기지 위치', after: baseLoc }
                                    ]
                                });
                                return;
                            }
                            setIsBlacksmithModalOpen(true);
                        }}
                        onOpenAlchemy={() => {
                            const isAtBase = !character.base?.location || (
                                character.currentLocation?.city === character.base.location.city &&
                                (!character.base.location.nation || !character.currentLocation?.nation || character.currentLocation.nation === character.base.location.nation)
                            );
                            if (!isAtBase) {
                                const baseLoc = character.base?.location 
                                    ? `${character.base.location.nation || ''} ${character.base.location.city}`.trim() 
                                    : '기지';
                                setResultModalData({
                                    type: 'warning',
                                    title: '기지 방문 필요',
                                    message: `현재 위치가 기지(${baseLoc})가 아닙니다.\n\n완성된 시약 및 포션을 수령하거나 연금술실을 이용하려면 기지가 위치한 도시로 직접 이동해야 합니다.`,
                                    items: [
                                        { label: '현재 위치', after: `${character.currentLocation?.nation || ''} ${character.currentLocation?.city || ''}`.trim() || '알 수 없음' },
                                        { label: '기지 위치', after: baseLoc }
                                    ]
                                });
                                return;
                            }
                            setIsAlchemyModalOpen(true);
                        }}
                        onOpenCondolence={() => setIsCondolenceModalOpen(true)}
                    />
                )}
                {worldNewsList && (
                    <WorldNewsModal 
                        key="world-news-modal"
                        newsList={worldNewsList} 
                        onClose={() => setWorldNewsList(null)} 
                        onOpenDungeon={() => setIsDungeonOpen(true)} 
                        onOpenMap={() => setIsMapOpen(true)} 
                    />
                )}
                {isCondolenceModalOpen && (
                    <CondolenceModal
                        key="condolence-modal"
                        character={character}
                        onClose={() => setIsCondolenceModalOpen(false)}
                        onUpdateCharacter={handleUpdateCharacter}
                    />
                )}
                <MailboxModal
                    isOpen={isMailboxOpen}
                    onClose={() => setIsMailboxOpen(false)}
                    messages={messages}
                    currentDate={character.currentDate || START_DATE}
                    character={character}
                    onSelectCompanion={(compKey) => {
                        setSelectedCompanionId(compKey);
                    }}
                    onOpenSocial={(targetPersonId) => {
                        setSocialInitialSelectedId(targetPersonId);
                        setIsSocialOpen(true);
                    }}
                    onOpenMap={(locationName) => {
                        setMapInitialTargetLocationName(locationName);
                        setIsMapOpen(true);
                    }}
                />

                {/* [모바일 전용 가방 모달] 가방 탭 클릭 시 독립적으로 팝업 */}
                {isInventoryModalOpen && (
                    <InventoryModal
                        character={character}
                        onClose={() => setIsInventoryModalOpen(false)}
                        onUseItem={(item, idx) => handleItemAction('use', item, idx as number)}
                        onEquipItem={handleEquipItem}
                        onSellClick={(item, idxs, isAll) => {
                            if (isAll) {
                                executeBatchItemAction('sell', item, idxs);
                            } else {
                                handleItemAction('sell', item, idxs[0]);
                            }
                        }}
                        onDiscardClick={(item, idxs) => {
                            if (idxs.length > 1) {
                                executeBatchItemAction('discard', item, idxs);
                            } else {
                                handleItemAction('discard', item, idxs[0]);
                            }
                        }}
                        onToggleLock={handleToggleItemLock}
                        onToggleFavorite={handleToggleItemFavorite}
                        onAutoSell={handleAutoSellItems}
                        onUpdateCharacter={setCharacter}
                    />
                )}

                {/* [모바일 전용] 엄지손가락 하단 7대 고정 탭 바 (오직 CityMapBoard 메인 화면에서만 노출, 접기/펼치기 지원) */}
                {view === 'game' && 
                 sceneType !== 'combat' && 
                 !isCityOpen && 
                 !isDungeonOpen && 
                 !isMapOpen && 
                 !isMobileMenuOpen && 
                 !isBaseModalOpen && 
                 !isCompanionModalOpen && 
                 !isSaveLoadOpen && 
                 !isSkillBookOpen && 
                 !isDevModeOpen && 
                 !isInventoryModalOpen && 
                 !isSettingsOpen && (
                    <MobileBottomNavigationBar
                        sceneType={sceneType}
                        onOpenCharacter={() => setIsMobileMenuOpen(true)}
                        onOpenInventory={() => setIsInventoryModalOpen(true)}
                        onOpenBase={() => setIsBaseModalOpen(true)}
                        onOpenCompanion={() => setIsCompanionModalOpen(true)}
                        onOpenHunt={() => {
                            setCityInitialConfig({ openHuntMap: true });
                            setIsCityOpen(true);
                        }}
                        onOpenMap={() => {
                            setMapMode('travel');
                            setIsMobileMenuOpen(false);
                            setIsMapOpen(true);
                        }}
                        onSave={() => {
                            setSaveLoadMode('save');
                            setIsSaveLoadOpen(true);
                        }}
                    />
                )}

                {/* [모바일 전용 및 전역] 동료 관리 모달 */}
                {isCompanionModalOpen && (
                    <CompanionModal
                        character={character}
                        inactiveCompanions={character.inactiveCompanions}
                        onClose={() => setIsCompanionModalOpen(false)}
                        onSelectCompanion={(idx) => {
                            const comp = character.companions[idx];
                            if (comp) {
                                setIsCompanionModalOpen(false);
                                handleSelectCompanion(comp.id);
                            }
                        }}
                        onRejoinCompanion={(idx) => {
                            const c = character.inactiveCompanions![idx];
                            const ni = [...character.inactiveCompanions!];
                            ni.splice(idx, 1);
                            let updatedChar: Character = {...character, companions: [...character.companions, c], inactiveCompanions: ni};
                            updatedChar = unassignFromTraining(updatedChar, c.id);
                            setCharacter(updatedChar);
                            addToLog(`[시스템] ${c.name} 동료가 재합류했습니다.`);
                        }}
                        onPermanentlyDismissCompanion={(idx) => {
                            const c = character.inactiveCompanions![idx];
                            const ni = [...character.inactiveCompanions!];
                            ni.splice(idx, 1);
                            let updatedChar: Character = {...character, inactiveCompanions: ni};
                            updatedChar = unassignFromTraining(updatedChar, c.id);
                            setCharacter(updatedChar);
                            addToLog(`[시스템] ${c.name} 동료를 영구적으로 삭제했습니다.`);
                        }}
                        onDismissCompanion={(idx) => {
                            const comp = character.companions[idx];
                            if (!comp) return;
                            if (!character.base) {
                                setResultModalData({ type: 'failure', title: '대기명단 이동 불가', message: '기지가 아직 건설되지 않았습니다.\n기지가 없는 상태에서는 동료를 대기명단(숙소)으로 보낼 수 없습니다. 먼저 기지를 건설해야 잠시 이별이 가능합니다.', items: [] });
                                return;
                            }
                            const newChar = { ...character };
                            newChar.companions = newChar.companions.filter((_, i) => i !== idx);
                            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                            newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== comp.id);
                            newChar.inactiveCompanions.push(comp);
                            setCharacter(newChar);
                            addToLog("[시스템] " + comp.name + "와(과) 잠시 이별했습니다. 기지(숙소)에서 다시 만날 수 있습니다.");
                        }}
                        onUpdateCharacter={setCharacter}
                        onZoom={() => {}}
                        onToggleFavoriteCompanion={handleToggleFavoriteCompanion}
                    />
                )}
                </div>
            </div>
        </>
      )}
      <ExitGameModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        character={character}
        onExitWithoutSave={() => {
          setIsExitModalOpen(false);
          resetGameToTitle();
        }}
        onExitWithSave={async (slotNum) => {
          await handleSaveAndExit(slotNum);
          setIsExitModalOpen(false);
        }}
      />
      <ProcessingLoadingModal isOpen={isLoading} message={loadingMessage} />
      <GodAppearanceManager character={character} onUpdateCharacter={handleUpdateCharacter} />
      <InitialAssetPreloader />
      </Suspense>
    </div>
    </GameProvider>
  );
};

export default App;
