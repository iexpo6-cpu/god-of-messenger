
import React, { useState, useEffect, useRef } from 'react';
import { Character, CombatState, Enemy, DivineDiplomacyStatus, Companion, ClubType, ClassTier, SkillType,Item, ItemRarity, MythicOptionType, MagyeOptionType, Skill, SkillTarget, Stats, GameResponse, ActiveStatus, SimpleStudent, Location, MercenaryRank, JobType, MilitaryRank, DiplomaticStatus, RelationType, MonsterStage, BattleRole, SecondaryBattleRole, BattlePosition, TrainerBranch, WeaponType, DailyReportData, WorldNewsItem, TournamentPostMatchData } from '../types';
import { INITIAL_CHARACTER, START_DATE, MAGYE_LEADERS, BASE_LEVEL_CONFIG, INITIAL_BASE, FACILITIES_INFO, ENHANCEMENT_CAPS, PRESET_ENEMIES, SHINRYOKU_TYPES_LIST, STATUS_AILMENTS_DATA, STATUS_AILMENTS_LIST, WEAPON_TYPE_KOREAN, SCHOOL_CONFIG, MAX_PARTY_SIZE, MILITARY_RANK_ORDER, WORLD_GEOGRAPHY, TEMPLE_MESSENGER_MAP } from '../constants';
import { calculateInventorySize, calculateRewardBonuses, getTrainerBranchMultiplier, getDropRateMultiplier, getWeaponMasteryMultiplier, getSkillMasteryMultiplier, getRequiredExp, getStatPointsPerLevel } from '../utils';
import { calculateFinalStats, calculateTotalStats, calculateItemPrice, getYear, updateSocialNetworkGrowth, calculateBuffSuccessRate, calculateAgeFromYear, addDays, determineTimePassage, migrateCompanion, checkAndApplyLevelUp, formatDate, generateProceduralEnemy, calculateDamage, calculateStatusChance, calculateDerivedStats, getActorDerivedStats, generateLoot, calculateDebuffSuccessRate, getWeaponTypeFromItem, applyConsumableEffect, generateEnemyStats, generateClassmates, generateName, generateTournamentBracket, checkAndApplyDeparture, getSaveSlotKey, optimizeSaveData, extractSurname, generateNameWithSurname, addMasteryExp, gainProfessionExp, getEffectiveBattleRole, getEffectiveSecondaryBattleRole, processCombatStyleKillProgress, getEntityAllCombatSkills, hasCombatStyleSpecialtyEquipped } from '../utils';
import { isAttackSkillWithBuff, isAttackSkillWithDebuff, extractAttackSkillBuffEffectsFromFormula } from '../utils/finalClassSkillHelper';
import { getTierBuffScale } from '../services/skillBuffScaleService';
import { initializeGameWithCharacter, sendPlayerAction, resumeGame, chatWithCompanion } from '../services/geminiService';
import * as CombatUtils from '../services/combatUtils';
import { getTrainingMonster } from '../monsters';
import { ResultData } from '../components/ActionResultModal';
import { NATION_THEMES, HUNT_LEVEL_BANDS, getMonsterInfo, getMonsterPoolForBand } from '../monsterfield';
import { getBossByLocation } from '../bossMonsters';
import { rollSuddenPostCombatEvent, calculateRivalAmbushVictoryExp } from '../services/suddenEventService';
import { processInterCompanionEvents } from '../services/relationService'; 
import { updateNationalDiplomacy } from '../services/diplomacyService';
import { generateWarEnemies } from '../warbattlesystem';
import { VASSAL_DURATION_YEARS, checkVassalTransition } from '../vassalsystem';
import { triggerTempleDefense, calculateTempleMajesty, GET_CITY_BY_MESSENGER_JOB } from '../templedefensesystem'; 
import { NATION_RELICS, NATION_HEROES  } from '../nationLoreData';
import { NATION_LIST} from '../nationalDiplomacy';
import { handleSchoolPromoteAction } from '../schoolpromote'
import { processTimeSkip, condenseSystemLogs } from '../services/timeEngine';
import { purgeDeceasedCompanions } from '../services/deathTimeEngine';
import { generateInitialDiplomacy } from '../nationalDiplomacy';
import { DIVINE_WAR_CONSTANTS } from '../divineWarSystem';
import { updateVisualUrlByJob, updateCompanionVisualUrlByJob, getVisualUrlByJob } from '../services/visualManager';
import { isMessengerJob } from '../messengerofgodvisual';
import { getCompanionCP } from '../services/companionGrowthService';
import { isRealTimeElixir } from '../services/elixirService';
import { calculateDotDamage } from '../services/dotDamageService';
import { elixirRealtimeService } from '../services/elixirRealtimeService';
import { GameStorage } from '@/storage';
import { CompanionTacticsService } from '../services/companionTacticsService';
import { MountCombatService } from '../services/mountCombatService';
import { applySparringManualCombatResult } from '../services/sparringCombatService';
import { executeBondSkillUtility, cleanUpBondSkillBuffIfBaseSkillUsed } from '../services/BondSkillService';
import { trimMainMessages, trimCombatLogs, trimCharacterMessages, safeAddMemory, cleanseCharacterMemories, applyBestiaryUpdateInPlace } from '../services/combatPerformanceService';
import { processEquipmentOnHit } from '../services/equipmentAilmentService';
import { applyBuffWithDiminishingPriority, refreshBuffDiminishingStatus, resolveSkillShinryokuType } from '../services/buffDiminishingManager';
import { getFocusFusionDamageMultiplier, getEchoAftershockDamage, isSkillAuraTranscend, isSkillAuraErosion, applyBuffMassCleanse, applyDebuffDefenseShatter } from '../services/aoeSkillEnhanceService';
import { CombatShieldService } from '../services/combatShieldService';
import { chooseEnemySkill, isEnemyAoeSkill, adjustEnemyDamageForAoe } from '../services/enemyCombatSkillService';

import { combatStateBridge } from '../services/combatStateBridge';
import { filterDebuffsForCleanse } from '../services/statusCleanseService';



const TIER_PRIORITY: Record<string, number> = {
    [ClassTier.FINAL]: 4,
    [ClassTier.LAST]: 3,
    [ClassTier.SECOND]: 2,
    [ClassTier.FIRST]: 1,
    [ClassTier.NONE]: 0
};


interface Message {
  role: 'ai' | 'user';
  text: string;
}

type ViewMode = 'normal' | 'combat' | 'creation' | 'levelup';
type ViewState = 'start' | 'creation' | 'game';

const ALLOWED_STATUS_NAMES = [
    ...STATUS_AILMENTS_LIST,
    "방어 태세",
    "마나 쉴드",
    "악마화",
    "마계의 저주",
];


/**
 * 도시 이름을 기반으로 해당 도시가 속한 국가(Nation)를 찾는 헬퍼 함수
 */
const findNationByCityLocal = (cityName: string): string => {
    if (!cityName) return "양의 기운의 성전";
    
    for (const region in WORLD_GEOGRAPHY) {
        for (const nation in WORLD_GEOGRAPHY[region]) {
            // 1. 국가 이름 자체가cityName과 일치하는지 확인
            if (nation === cityName) return nation;
            
            const data = WORLD_GEOGRAPHY[region][nation];
            // 2. 도시 리스트에 포함되어 있는지 확인
            if (data.cities && Array.isArray(data.cities) && data.cities.includes(cityName)) {
                return nation;
            }
        }
    }
    // 성전 구역 명칭일 경우 해당 명칭 그대로 유지 시도, 아니면 폴백
    return cityName.includes('성전') || cityName.includes('성소') || cityName.includes('성화') ? cityName : "양의 기운의 성전";
};

export const useGame = () => {
  const [view, setView] = useState<ViewState>('start');
  const [messages, setMessagesRaw] = useState<Message[]>([]);
  const setMessages = React.useCallback((action: React.SetStateAction<Message[]>) => {
    setMessagesRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      return trimMainMessages(next, 100);
    });
  }, []);
  const [input, setInput] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [character, setCharacter] = useState<Character>(INITIAL_CHARACTER);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("정산 및 이벤트를 계산하고 있습니다...");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isReactionBoardOpen, setIsReactionBoardOpen] = useState(false); //
   const [isCheckingInterview, setIsCheckingInterview] = useState(false);
  // UI Modal States
  const [isSkillBookOpen, setIsSkillBookOpen] = useState(false);
  const [skillBookTarget, setSkillBookTarget] = useState<Character | Companion | null>(null);
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
    const [pendingTempleConquest,setPendingTempleConquest] = useState<any | null>(null);
  const [selectedCompanionIndex, setSelectedCompanionIndex] = useState<number | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<'save' | 'load'>('save');
  const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
  const [isTacticsOpen, setIsTacticsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false); 
  const [resultModalData, setResultModalData] = useState<ResultData | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null);
  const [worldNewsList, setWorldNewsList] = useState<WorldNewsItem[] | null>(null);
  const [isBlacksmithModalOpen, setIsBlacksmithModalOpen] = useState(false);
  const [isAlchemyModalOpen, setIsAlchemyModalOpen] = useState(false);
  const [pendingRelationResolution, setPendingRelationResolution] = useState<{ targetId: string, enemy: Enemy } | null>(null);
  
  // Evolution States
  const [pendingEvolutionTier, setPendingEvolutionTier] = useState<ClassTier | null>(null);
  const [evolvingCompanionIndex, setEvolvingCompanionIndex] = useState<number | null>(null);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState(false);
  const [combatResultData, setCombatResultData] = useState<any | null>(null);
  const [pendingTournamentReward, setPendingTournamentReward] = useState<{ tournamentName: string; exp: number; gold: number } | null>(null);
  const [pendingTournamentPostMatch, setPendingTournamentPostMatch] = useState<TournamentPostMatchData | null>(null);
  const [sceneType, setSceneType] = useState<'normal' | 'combat' | 'creation' | 'levelup'>('normal');
  const [combatState, setCombatStateRaw] = useState<CombatState>({ enemies: [], turn: 0, log: [], isEnded: false });
  const setCombatState = React.useCallback((action: React.SetStateAction<CombatState>) => {
    setCombatStateRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.log && next.log.length > 100) {
        return { ...next, log: trimCombatLogs(next.log, 100) };
      }
      return next;
    });
  }, []);

  const characterRef = useRef<Character>(character);
  const combatStateRef = useRef<CombatState>(combatState);
  const lastProcessedRoundTurnRef = useRef<number>(-1);
  const lastProcessedRoundTimestampRef = useRef<number>(0);

  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  useEffect(() => {
    combatStateRef.current = combatState;
  }, [combatState]);

  useEffect(() => {
    if (pendingTournamentReward && !combatResultData && !resultModalData && sceneType === 'normal') {
      const reward = pendingTournamentReward;
      setPendingTournamentReward(null);

      setCharacter(prev => {
        const updatedChar = { ...prev, stats: { ...prev.stats } };
        const initialLevel = updatedChar.level;

        updatedChar.currentExp += reward.exp;
        
        let leveledUp = false;
        if (!updatedChar.maxExp) updatedChar.maxExp = getRequiredExp(updatedChar.level);

        while (updatedChar.currentExp >= updatedChar.maxExp) {
          leveledUp = true;
          updatedChar.currentExp -= updatedChar.maxExp;
          updatedChar.level += 1;
          updatedChar.maxExp = getRequiredExp(updatedChar.level);
          updatedChar.statPoints += getStatPointsPerLevel(updatedChar);
          if (!updatedChar.stats.maxHp) updatedChar.stats.maxHp = updatedChar.level * 20;
          if (!updatedChar.stats.maxMp) updatedChar.stats.maxMp = updatedChar.level * 20;
          updatedChar.stats.maxHp += 20;
          updatedChar.stats.maxMp += 20;
          
          const { finalStats } = calculateFinalStats(updatedChar);
          updatedChar.stats.hp = finalStats.maxHp;
          updatedChar.stats.mp = finalStats.maxMp;
        }

        setTimeout(() => {
          setResultModalData({
            type: leveledUp ? 'levelup' : 'success',
            title: '🏆 토너먼트 우승 보상 경험치 지급!',
            message: `'${reward.tournamentName}' 최종 우승 보상 경험치가 지급되었습니다.`,
            items: [
              { label: '우승 획득 경험치', after: `+${reward.exp.toLocaleString()} EXP` },
              { label: '현재 경험치', after: `${updatedChar.currentExp.toLocaleString()} / ${updatedChar.maxExp.toLocaleString()} EXP` },
              ...(leveledUp ? [{ label: '레벨 업!', after: `Lv.${initialLevel} → Lv.${updatedChar.level}` }] : [])
            ]
          });
          addToLog(`[시스템] ${reward.tournamentName} 우승 보상 경험치 +${reward.exp.toLocaleString()} EXP를 획득했습니다.`);
        }, 100);

        return updatedChar;
      });
    }
  }, [pendingTournamentReward, combatResultData, resultModalData, sceneType]);

  const prevLevelRef = useRef<number>(character.level);
  const prevNationRef = useRef<string>(character.nation);
  const justLoadedRef = useRef<boolean>(false);
  const isAutoSavingRef = useRef<boolean>(false);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auto_save_enabled') === 'true';
    }
    return false;
  });

  const handleAutoSaveEnabledChange = (val: boolean) => {
    setAutoSaveEnabled(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_save_enabled', String(val));
    }
  };

  const addMemory = (char: Character, text: string, targets: string[] = ['player']) => {
      safeAddMemory(char, text, targets);
  };

 
  /**
   * [NEW] 국적 변경 감지 및 외교 관계 자동 재설정
   */
  useEffect(() => {
    if (view !== 'game') return;
    
    if (character.nation !== prevNationRef.current) {
        prevNationRef.current = character.nation;
        const newDiplomacy = generateInitialDiplomacy(character.nation);
        
        setCharacterSafe(prev => ({
            ...prev,
            militaryData: prev.militaryData ? {
                ...prev.militaryData,
                diplomacy: newDiplomacy
            } : {
                rank: prev.militaryRank || MilitaryRank.PVT,
                enlistedDate: prev.currentDate || START_DATE,
                merit: 0,
                completedMissions: 0,
                diplomacy: newDiplomacy
            }
        }));
        
        addToLog(`[시스템] 국적이 '${character.nation}'(으)로 변경됨에 따라 국가 외교 관계가 재설정되었습니다.`);
    }
  }, [character.nation, view]);

  /**
   * [NEW] 전투 시작 시 패시브 효과 (예: 마나 쉴드) 1회 적용
   */
  useEffect(() => {
      if (sceneType === 'combat' && combatState.turn === 1 && !combatState.passivesApplied && !combatState.isEnded) {
          const nextChar = { ...character };
          let totalLog = "";
          
          const resPlayer = CombatUtils.applyCombatStartPassives(nextChar);
          nextChar.statusEffects = resPlayer.activeEffects;
          if (resPlayer.log) totalLog += resPlayer.log;
          
          nextChar.companions = nextChar.companions.map(comp => {
              const resComp = CombatUtils.applyCombatStartPassives(comp);
              if (resComp.log) totalLog += resComp.log;
              return { ...comp, statusEffects: resComp.activeEffects };
          });
          
          if (totalLog) {
              setCombatState(prev => ({ ...prev, log: [...prev.log, totalLog].filter(Boolean), passivesApplied: true }));
          } else {
              setCombatState(prev => ({ ...prev, passivesApplied: true }));
          }
          setCharacter(nextChar);
      }
  }, [sceneType, combatState.turn]);
  useEffect(() => {
    if (view !== 'game') return;
    
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);
    
    // 마계 지배자나 군인인데 외교 데이터가 없는 경우 자동 초기화
    if ((isMagyeLeader || character.job === JobType.SOLDIER) && !character.militaryData?.diplomacy) {
        setCharacterSafe(prev => {
            const next = { ...prev };
            if (!next.militaryData) {
                // 군사 데이터 객체 생성
                next.militaryData = {
                    rank: next.militaryRank || (isMagyeLeader ? MilitaryRank.GEN : MilitaryRank.PVT),
                    enlistedDate: next.currentDate || START_DATE,
                    merit: 0,
                    completedMissions: 0,
                    availableMissions: [],
                    activeMissions: []
                };
            }
            // 전 세계 국가와의 관계 초기 생성
            next.militaryData.diplomacy = generateInitialDiplomacy(next.nation);
            return next;
        });
    }
  }, [view, character.job, character.nation]);
  const addToLog = (text: string) => {
      setMessages(prev => [...prev, { role: 'ai', text }]);
  };

  // [AUTO SAVE SYSTEM] (전투 중에는 매 턴 저장을 건너뛰어 렉 차단)
  useEffect(() => {
    if (view !== 'game' || !autoSaveEnabled || messages.length === 0 || sceneType === 'combat') {
      return;
    }

    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }

    const triggerAutoSave = async () => {
      if (isAutoSavingRef.current) return;
      try {
        isAutoSavingRef.current = true;
        const key = getSaveSlotKey(0); // Slot 0 is auto-save
        const syncedChar = elixirRealtimeService.syncToCharacter(character);
        const rawSave = { timestamp: new Date().toISOString(), character: syncedChar, messages, choices, sceneType };
        const saveData = optimizeSaveData(rawSave);
        await GameStorage.set(key, saveData);
        console.log("Auto-save completed to Slot 0");
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        isAutoSavingRef.current = false;
      }
    };

    // [최적화] 연속 전투 및 전환 시 CPU 압축 부하 완화를 위해 디바운스를 2.5초로 안정화
    const timer = setTimeout(triggerAutoSave, 2500);
    return () => clearTimeout(timer);
  }, [messages, autoSaveEnabled, view]);

  useEffect(() => {
    if (view !== 'game' || !character.schoolData) return;

    if (character.level > prevLevelRef.current) {
        const levelDiff = character.level - prevLevelRef.current;
        prevLevelRef.current = character.level;

        const classmates = character.schoolData.classmates;
        const rivalIdx = classmates.findIndex(s => s.isRival);
       
      if (character.schoolData.isGraduated) return;   
        if (rivalIdx !== -1) {
            const rival = classmates[rivalIdx];
            const isRecruited = character.companions.some(c => c.id === rival.id) || 
                              (character.inactiveCompanions?.some(c => c.id === rival.id) || false);
           if (!isRecruited && Math.random() < 0.3) {
                const growthLevel = Math.floor(Math.random()*2+1);
                const updatedRival = {
                    ...rival,
                    level: rival.level + growthLevel,
                    stats: {
                        ...rival.stats,
                        str: (rival.stats.str || 10) + statBoost,
                        int: (rival.stats.int || 10) + statBoost,
                        def: (rival.stats.def || 10) + statBoost,
                        agi: (rival.stats.agi || 10) + statBoost,
                        hp: (rival.stats.hp || 100) + (growthLevel * 20)
                    }
                };

                const updatedClassmates = [...character.schoolData.classmates];
                updatedClassmates[rivalIdx] = updatedRival;
                const newChar = {
                    ...character,
                    schoolData: {
                        ...character.schoolData,
                        classmates: updatedClassmates
                    }
                };
                setCharacter(newChar);
                
                setTimeout(() => {
                    addToLog(`[시스템] **라이벌 ${updatedRival.name}**도 인근 지역에서 강력한 마물을 쓰러뜨려 **Lv.${updatedRival.level}**로 강해졌다는 소문이 들립니다!`);
                }, 1000);
            }
        }
    } else {
        prevLevelRef.current = character.level;
    }
  }, [character.level, view]);

  const filterUnknownStatus = (effects?: ActiveStatus[]): ActiveStatus[] => {
    if (!effects) return [];
    return effects.filter(s => {
        if (!s || !s.name) return false;
        const text = `${s.name} ${s.effect || ''} ${(s as any).description || ''}`.toUpperCase();
        const isElixirOrBuff = text.includes('비약') || text.includes('드롭') || text.includes('DROP') ||
                               text.includes('무기숙련') || text.includes('WEAPONMASTERY') ||
                               text.includes('스킬숙련') || text.includes('SKILLMASTERY') ||
                               text.includes('EXP') || text.includes('경험치') ||
                               text.includes('전리품') || text.includes('수련') || text.includes('축복') ||
                               text.includes('버프') || text.includes('보호') || text.includes('방어');
        const isDefined = ALLOWED_STATUS_NAMES.includes(s.name) || ALLOWED_STATUS_NAMES.some(n => s.name.includes(n));
        const hasStatChange = /[\+\-]\s*\d+/.test(s.effect || "");
        const hasDuration = typeof s.duration === 'number' && s.duration > 0;
        return isDefined || hasStatChange || isElixirOrBuff || hasDuration;
    });
  };
 const updateBestiary = (monsterName: string, isDefeated: boolean = false) => {
   // [MODIFIED] 보스나 정예 태그 제거 및 이름 뒤의 식별 알파벳(A, B, C...) 제거 로직 강화
      const cleanName = monsterName
          .replace(/\[.*?\]/g, '') // 모든 [대괄호] 태그 제거
          .replace(/\s+[A-Z]$/, '') // 이름 끝의 공백+대문자 한 글자(예: " A") 제거
          .trim();
      
      setCharacterSafe(prev => {
          const next = { ...prev };
          if (!next.bestiary) next.bestiary = {};
          
          const entry = next.bestiary[cleanName] || { encountered: false, defeatedCount: 0 };
          
          if (!entry.encountered) {
              entry.encountered = true;
          }
          
          if (isDefeated) {
              entry.defeatedCount += 1;
          }
          
          next.bestiary[cleanName] = entry;
          return next;
      });
  };

  /**
   * [NEW] 전투 계열 실전 수련 경험치 및 몬스터 처치 수 누적 처리
   */
  const applyCombatStyleExpForKill = (charState: Character, enemy: Enemy, styleExpGain?: number) => {
      const isBoss = enemy.isBoss === true || /\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]|\[사자\]|\[군주\]|\[사신\]|\[신\]/i.test(enemy.name || '');
      const styleMult = getTrainerBranchMultiplier(charState, TrainerBranch.COMBAT_STYLE);
      const defaultExp = Math.max(50, Math.floor((enemy.level || 1) * 20 + (isBoss ? 500 : 80)));
      const gain = styleExpGain !== undefined ? styleExpGain : Math.floor(defaultExp * styleMult);
      
      // 플레이어 수련 진척도 처리
      const playerRes = processCombatStyleKillProgress(charState, enemy, gain);
      if (playerRes.justCompleted && playerRes.promotedStyle) {
          addToLog(`[전투 스타일 수련] 🌟 ${charState.name}의 '${playerRes.promotedStyle}' 전직 수련 조건이 모두 달성되었습니다! 전투 스타일 훈련소에서 전직하세요!`);
      }

      // 동료 수련 진척도 처리
      if (charState.companions) {
          charState.companions.forEach(c => {
              if (c.stats.hp > 0 && !c.isDead && c.targetCombatStyle) {
                  const compRes = processCombatStyleKillProgress(c, enemy, gain);
                  if (compRes.justCompleted && compRes.promotedStyle) {
                      addToLog(`[전투 스타일 수련] 🌟 동료 ${c.name}의 '${compRes.promotedStyle}' 전직 수련 조건이 모두 달성되었습니다!`);
                  }
              }
          });
      }
  };



  /**
   * [NEW] 묘비명 패턴 (Tombstone Pattern) 구현
   * 동료가 전사하거나 영구 삭제될 때, 인물 관계망으로 데이터를 마이그레이션합니다.
   */
  const tombstoneCompanion = (char: Character, compId: string, reason: string): Character => {
    const allComps = [...char.companions, ...(char.inactiveCompanions || [])];
    const target = allComps.find(c => c.id === compId);
    if (!target) return char;

    const isPastConnection = reason === '실망하여 이탈' || reason === '호감도 하락' || reason === '아름다운 이별';

    const tombstone: SimpleStudent = {
      id: target.id,
      name: target.name,
      age: target.age,
      birthYear: target.birthYear,
      gender: target.gender,
      nation: target.nation || "Unknown",
      level: target.level,
      classType: target.classType,
      race: target.race,
      personality: target.personality || "평범함",
      appearance: target.appearance,
      stats: { ...target.stats }, // 최후의 스탯 보존
      affection: Math.max(-100, Math.min(100, target.affection ?? -1)),
      isPurged: isPastConnection ? false : true,
      purgedReason: isPastConnection ? undefined : reason,
      isPastConnection: isPastConnection ? true : undefined,
      origin: target.job || 'Companion',
      originName: isPastConnection ? '과거의 인연 (호감도 하락)' : (reason === '전사' || reason === '임무 중 전사' ? 'K.I.A (전투 중 전사)' : 'Dismissed (은퇴/해고)'),
      memories: target.memories || [],
      job: target.job,
      mercenaryRank: target.mercenaryRank,
      militaryRank: target.militaryRank,
      classTier: target.classTier,
      visualUrl: target.visualUrl
    };
    if (!char.socialNetwork) char.socialNetwork = [];
    const existingIdx = char.socialNetwork.findIndex(sn => sn.id === target.id);
    if (existingIdx !== -1) char.socialNetwork[existingIdx] = tombstone;
    else char.socialNetwork.push(tombstone);

    char.companions = (char.companions || []).filter(c => c && c.id !== compId);
    if (char.inactiveCompanions) {
       char.inactiveCompanions = (char.inactiveCompanions || []).filter(c => c && c.id !== compId);
    }

    if (reason === '전사' || reason === '임무 중 전사') {
        if (char.mercenaryData) {
            char.mercenaryData.lastDeathDate = char.currentDate;
            char.mercenaryData.lastCasualtyName = target.name;
            char.mercenaryData.lastCasualtyNation = target.nation || char.nation;
            char.mercenaryData.lastCasualtySurname = extractSurname(target.name, target.nation || char.nation);
        }
    }

    return char;
  };

  const setCharacterSafe = (update: React.SetStateAction<Character>) => {
      setCharacter(prev => {
          let next = typeof update === 'function' ? update(prev) : update;
          next = trimCharacterMessages(next);
          next = cleanseCharacterMemories(next);
          characterRef.current = next;
          combatStateBridge.saveLatestCombatCharacter(next);
          
          // [성능 최적화] 전투 진행 중일 때는 수십 명의 대기 동료 마이그레이션 및 무거운 검사를 생략하고 즉시 반환
          const isDuringCombat = combatStateRef.current && combatStateRef.current.turn > 0 && !combatStateRef.current.isEnded;
          if (isDuringCombat) {
              return next;
          }

          next.statusEffects = filterUnknownStatus(next.statusEffects);
          const currentYearVal = getYear(next.currentDate || '2000-01-01');
          next.companions = next.companions.map(c => {
              const migrated = migrateCompanion(c, undefined, undefined, currentYearVal);
              return {
                  ...migrated,
                  statusEffects: filterUnknownStatus(migrated.statusEffects)
              };
          });
          if (next.inactiveCompanions) {
              next.inactiveCompanions = next.inactiveCompanions.map(c => {
                  const migrated = migrateCompanion(c, undefined, undefined, currentYearVal);
                  return {
                      ...migrated,
                      statusEffects: filterUnknownStatus(migrated.statusEffects)
                  };
              });
          }

       
          const { updatedChar: leveledChar, leveledUp, oldLevel, leveledUpCompanions } = checkAndApplyLevelUp(next);
          if (leveledUp || leveledUpCompanions.length > 0) {
            let message = "";
            if (leveledUp) message += `${leveledChar.name}이(가) 레벨 ${oldLevel} ➔ ${leveledChar.level} 달성! (스탯 포인트 지급 및 능력치 상승)\n`;
            if (leveledUpCompanions.length > 0) message += `${leveledUpCompanions.map(c => `${c.companion.name}(Lv.${c.oldLevel} ➔ Lv.${c.companion.level})`).join(', ')} 동료 레벨업!`;
            setTimeout(() => {
                setResultModalData({
                    type: 'levelup',
                    title: "레벨업 달성!",
                    message: message.trim(),
                    items: [
                        ...(leveledUp ? [
                            { label: '플레이어 레벨', after: `Lv.${oldLevel} ➔ Lv.${leveledChar.level}` },
                            { label: '보유 스탯 포인트', after: `${leveledChar.statPoints} P` },
                            { label: '현재 경험치', after: `${leveledChar.currentExp.toLocaleString()} / ${leveledChar.maxExp.toLocaleString()} EXP` }
                        ] : []),
                        ...leveledUpCompanions.map(c => ({
                            label: `동료 ${c.companion.name}`,
                            after: `Lv.${c.oldLevel} ➔ Lv.${c.companion.level}`
                        }))
                    ]
                });
            }, 50);
          }
          const { newChar: processedChar, leftNames } = checkAndApplyDeparture(leveledChar);
          const newChar = purgeDeceasedCompanions(processedChar);
          
          if (leftNames.length > 0) {
              // 실망하여 떠난 동료도 묘비명 패턴 적용 (이탈 사유 기록)
              let finalChar = newChar;
              leftNames.forEach(name => {
                  const targetId = [...prev.companions, ...(prev.inactiveCompanions || [])].find(c => c.name === name)?.id;
                  if (targetId) {
                      finalChar = tombstoneCompanion(finalChar, targetId, '실망하여 이탈');
                  }
              });

              setTimeout(() => {
                   addToLog(`[시스템 알림] ${leftNames.join(', ')} 동료가 당신에게 실망하여 떠났습니다.`);
              }, 0);
              
              setResultModalData({ 
                    type: 'warning', 
                    title: '동료 이탈', 
                    message: `${leftNames.join(', ')} 이탈 및 인연 기록 보관`, 
                    items: [{ label: '동료', after: `${leftNames.join(', ')}` }] 
              });
              characterRef.current = finalChar;
              return finalChar;
          }
          
          characterRef.current = newChar;
          return newChar;
      });
  };

  const getMonthsDiff = (d1: string, d2: string) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
  };

  const isFemale = (g: string) => {
      if (!g) return false;
      const lower = g.trim().toLowerCase();
      return ['여성', '여자', 'female', 'woman', 'f', 'girl'].some(k => lower === k || lower.includes(k));
  };

  const isMale = (g: string) => {
      if (!g) return false;
      const lower = g.trim().toLowerCase();
      return ['남성', '남자', 'male', 'm', 'boy'].some(k => lower === k || lower.includes(k));
  };

  const processCompanionRelationships = (char: Character, newDate: string): { updatedChar: Character, eventResult: ResultData | null } => {
      let updatedChar = { ...char };
      let eventResult: ResultData | null = null;
      
      const allComps = [...updatedChar.companions, ...(updatedChar.inactiveCompanions || [])];
      const processedIds = new Set<string>();
      const currentYear = getYear(newDate);

      for (const comp of allComps) {
          if (processedIds.has(comp.id)) continue;
          
          if (comp.isSpouse && comp.partnerId && comp.partnerId !== 'player') {
              const partner = allCompanionsFind(updatedChar, comp.partnerId);
              if (partner && !processedIds.has(partner.id)) {
                  const ageNum = calculateAgeFromYear(comp.birthYear || 2000, currentYear);
                  const actualAge = parseInt(ageNum.replace(/[^0-9]/g, '')) || 0;
                  
                  if (actualAge >= 20 && actualAge <= 40 && Math.random() < 0.02) {
                      processedIds.add(comp.id);
                      processedIds.add(partner.id);

                      const childGender = Math.random() < 0.5 ? '남성' : '여성';
                      const father = isMale(comp.gender) ? comp : partner;
                      const fatherNation = father.nation || char.nation;
                      const fatherSurname = extractSurname(father.name, fatherNation);
                      const childGenderParam = childGender === '남성' ? 'male' : 'female';
                      const childName = generateNameWithSurname(fatherSurname, fatherNation, childGenderParam);
                      
                      const child: Companion = {
                          id: `child_${Math.random().toString(36).substring(7)}`,
                          name: childName,
                          age: "0세",
                          birthYear: currentYear,
                          gender: childGender,
                          race: comp.race,
                          nation: comp.nation || char.nation,
                          classType: "자녀 (Child)",
                          level: 1, currentExp: 0, maxExp: 100, statPoints: 0,
                          classTier: ClassTier.NONE,
                          stats: { hp: 50, maxHp: 50, mp: 20, maxMp: 20, str: 5, int: 5, def: 5, agi: 5, wis: 5, ctrl: 5 },
                          skills: [], equipment: {}, inventory: [], affection: 50, loyalty: 50,
                          appearance: "갓 태어난 사랑스러운 아기입니다.", personality: "순수함",
                          childData: { parentNames: [comp.name, partner.name] }
                      };
                      if (!updatedChar.inactiveCompanions) updatedChar.inactiveCompanions = [];
                      updatedChar.inactiveCompanions.push(child);
                      
                      addMemory(updatedChar, `${comp.name}와 ${partner.name} 사이에서 아이 ${childName} 탄생`);
                      
                      eventResult = {
                          type: 'levelup',
                          title: '새로운 생명의 탄생!',
                          message: `축하합니다! 동료 ${comp.name}와(과) ${partner.name} 사이에서 건강한 아이가 태어났습니다.`,
                          items: [{ label: '이름', after: childName }, { label: '성별', after: childGender }, { label: '가족', after: '자녀 추가' }]
                      };
                      break; 
                  }
              }
          }

          if (comp.isLover && comp.partnerId && comp.partnerId !== 'player' && !comp.isSpouse) {
              const partner = allCompanionsFind(updatedChar, comp.partnerId);
              if (!partner) continue;

              processedIds.add(comp.id);
              processedIds.add(partner.id);

              const months = getMonthsDiff(comp.loverStartDate || '2000-01-01', newDate);
              const roll = Math.random() * 100;

              if (roll < 1.0) {
                  updateRelationship(updatedChar, comp.id, partner.id, false, false);
                  addMemory(updatedChar, `${comp.name}와 ${partner.name} 결별`);
                  eventResult = {
                      type: 'failure',
                      title: '동료 간 결별 소식',
                      message: `${comp.name}와(과) ${partner.name}이(가) 서로의 길을 걷기로 하며 헤어졌다는 소식이 들려옵니다.`,
                      items: [{ label: '관계', before: '연인', after: '동료' }]
                  };
                  break; 
              } 
              else if (months >= 12 && roll < 6.0) { 
                  updateRelationship(updatedChar, comp.id, partner.id, true, true);
                  addMemory(updatedChar, `${comp.name}와 ${partner.name} 결혼`);
                  eventResult = {
                      type: 'levelup',
                      title: '동료 간 결혼 축보!',
                      message: `교제한 지 ${Math.floor(months/12)}년이 된 ${comp.name}와(과) ${partner.name}이(가) 정식으로 부부의 연을 맺었습니다.`,
                      items: [{ label: '관계', before: '연인', after: '부부' }]
                  };
                  break;
              }
          }
      }

      return { updatedChar, eventResult };
  };

  const allCompanionsFind = (char: Character, id: string) => {
      return [...char.companions, ...(char.inactiveCompanions || [])].find(c => c.id === id);
  };

  const updateRelationship = (char: Character, id1: string, id2: string, isLover: boolean, isSpouse: boolean) => {
      const update = (c: Companion) => {
          if (c.id === id1 || c.id === id2) {
              return { 
                  ...c, 
                  isLover, 
                  isSpouse, 
                  partnerId: isLover ? c.partnerId : undefined,
                  partnerName: isLover ? c.partnerName : undefined,
                  classType: isSpouse ? c.classType.includes('배우자') ? c.classType : `배우자 (${c.classType})` : c.classType.replace(/배우자\s*\(?|\)?\s*\(Spouse\)/g, '').trim() || "동료"
              };
          }
          return c;
      };
      char.companions = char.companions.map(update);
      if (char.inactiveCompanions) char.inactiveCompanions = char.inactiveCompanions.map(update);
  };

  useEffect(() => {
    if (view !== 'game') return;
    // 플레이어 초기 잠재력은 퍼스트 클래스 고정. 기지 잠재력 돌파소에서 돌파해야 상위 해방 모달 진입 가능
    const playerPotential: ClassTier = character.liberationPotential || (
        character.finalClassName ? ClassTier.FINAL :
        character.lastClassName ? ClassTier.LAST :
        character.secondClassName ? ClassTier.SECOND :
        ClassTier.FIRST
    );

    const TIER_ORDER: Record<ClassTier, number> = {
        [ClassTier.NONE]: 0,
        [ClassTier.F]: 0,
        [ClassTier.FIRST]: 1,
        [ClassTier.SECOND]: 2,
        [ClassTier.LAST]: 3,
        [ClassTier.FINAL]: 4,
        [ClassTier.BOND]: 5
    };

    const potRank = TIER_ORDER[playerPotential] ?? 1;

    let targetTier: ClassTier | null = null;
    if (character.level >= 30 && (!character.firstClassName || character.firstClassName === '미정')) {
        const hasTrial = Boolean(character.hasClearedFirstTrial || character.firstTrialCleared || (character.firstClassName && character.firstClassName !== '미정'));
        if (potRank >= TIER_ORDER[ClassTier.FIRST] && hasTrial) targetTier = ClassTier.FIRST;
    } else if (character.level >= 100 && character.firstClassName && (!character.secondClassName)) {
        const hasTrial = Boolean(character.hasClearedSecondTrial || character.secondTrialCleared || character.secondClassName);
        if (potRank >= TIER_ORDER[ClassTier.SECOND] && hasTrial) targetTier = ClassTier.SECOND;
    } else if (character.level >= 300 && character.secondClassName && (!character.lastClassName)) {
        const hasTrial = Boolean(character.hasClearedLastTrial || character.lastTrialCleared || character.lastClassName);
        if (potRank >= TIER_ORDER[ClassTier.LAST] && hasTrial) targetTier = ClassTier.LAST;
    } else if (character.level >= 1000 && character.lastClassName && (!character.finalClassName)) {
        const hasTrialClear = Boolean(character.hasClearedFinalTrial || character.finalTrialCleared || character.finalClassName);
        if (potRank >= TIER_ORDER[ClassTier.FINAL] && hasTrialClear) {
            targetTier = ClassTier.FINAL;
        }
    }

    if (targetTier && pendingEvolutionTier !== targetTier) setPendingEvolutionTier(targetTier);
  }, [character, view, pendingEvolutionTier]);

  useEffect(() => {
    setCharacter(prev => {
        let hasChanged = false;
        const updatedVisualUrl = getVisualUrlByJob(prev.job, prev.gender, prev.visualUrl);
        if (updatedVisualUrl !== prev.visualUrl) hasChanged = true;
        
        const updatedCompanions = prev.companions.map(c => {
            const newUrl = getVisualUrlByJob(c.job, c.gender, c.visualUrl);
            if (newUrl !== c.visualUrl) {
                hasChanged = true;
                return { ...c, visualUrl: newUrl };
            }
            return c;
        });
        
        const updatedInactive = prev.inactiveCompanions?.map(c => {
            const newUrl = getVisualUrlByJob(c.job, c.gender, c.visualUrl);
            if (newUrl !== c.visualUrl) {
                hasChanged = true;
                return { ...c, visualUrl: newUrl };
            }
            return c;
        });
        
        if (!hasChanged) return prev;
        
        return {
            ...prev,
            visualUrl: updatedVisualUrl,
            companions: updatedCompanions,
            inactiveCompanions: updatedInactive
        };
    });
  }, [character.job, JSON.stringify(character.companions.map(c => c.job)), JSON.stringify(character.inactiveCompanions?.map(c => c.job))]);

  // 이미 사망한 상태로 남아있는 동료를 이관하기 위한 처리
  useEffect(() => {
    const hasDeadCompanions = (character.companions && character.companions.some(c => c && c.isDead)) || 
                              (character.inactiveCompanions && character.inactiveCompanions.some(c => c && c.isDead));
    if (!hasDeadCompanions) return;

    setCharacter(prev => {
      const deadActive = (prev.companions || []).filter(c => c && c.isDead);
      const aliveActive = (prev.companions || []).filter(c => c && !c.isDead);
      const deadInactive = (prev.inactiveCompanions || []).filter(c => c && c.isDead);
      const aliveInactive = (prev.inactiveCompanions || []).filter(c => c && !c.isDead);

      const allNewDead = [...deadActive, ...deadInactive];
      if (allNewDead.length === 0) return prev;

      return {
        ...prev,
        companions: aliveActive,
        inactiveCompanions: aliveInactive,
        deceasedCompanions: [...(prev.deceasedCompanions || []), ...allNewDead]
      };
    });
  }, [character.companions, character.inactiveCompanions]);

  const handleAction = async (actionText: string, mpCost: number = 0, stateOverride?: Character) => {
    if (!actionText.trim()) return;
    if (actionText.trim() === '운영자 모드') { setIsDevModeOpen(true) ; setInput(''); return; }
    
    // [MODIFIED] 장기 휴식(3일 초과) 시 브라우저 렉 및 프리징을 완벽 차단하는 1번 분할 처리 기법(Chunking) 도입
    const checkSystemMessage = actionText.startsWith('[시스템]') || actionText.startsWith('[FAST_RESPONSE]') || actionText.startsWith('[기지 활동]') || actionText.startsWith('[전투 아이템 사용]') || actionText.startsWith('[아이템 사용]') || actionText.startsWith('[동료 영입]') || actionText.startsWith('[학교 생활]') || actionText.startsWith('[토너먼트]') || actionText.startsWith('[전투 돌입]') || actionText.startsWith('[SYSTEM_PASS_DAY_SPLIT]');
    if (!checkSystemMessage) {
        const potentialDays = determineTimePassage(actionText);
        if (potentialDays > 3) {
            setIsLoading(true);
            setLoadingMessage("휴식을 취하고 있습니다... (0 / " + potentialDays + "일 계산 중)");
            addToLog(`[휴식 시작] ${potentialDays}일 동안의 장기 휴식을 비동기 분할 처리로 전환하여 안전하게 계산합니다...`);
            
            let currentStep = 0;
            let currentWorkingChar = stateOverride || characterRef.current || character;
            const originalUserText = actionText;
            
            const runSplitStep = async () => {
                if (currentStep >= potentialDays) {
                    setIsLoading(false);
                    addToLog(`[휴식 완료] 총 ${potentialDays}일 동안의 모든 일일 정산이 정합성 있게 완료되었습니다.`);
                    
                    const finalSummaryText = `[시스템] ${potentialDays}일 동안의 긴 휴식을 마치고 돌아왔습니다. 기지 자원 수집과 용병 유지비 정산, 국가 군사 동향이 반영되었습니다.`;
                    setMessages(prev => [
                        ...prev,
                        { role: 'user', text: originalUserText },
                        { role: 'ai', text: finalSummaryText }
                    ]);
                    return;
                }
                
                currentStep++;
                setLoadingMessage("휴식을 취하고 있습니다... (" + currentStep + " / " + potentialDays + "일 계산 중)");
                if (currentStep % 5 === 0 || currentStep === potentialDays) {
                    addToLog(`[휴식 진행 중] ${currentStep} / ${potentialDays}일째 정산 처리 중...`);
                }
                
                const splitStepText = `[SYSTEM_PASS_DAY_SPLIT] 하루 경과 처리 (${currentStep}/${potentialDays})`;
                const nextChar = await handleAction(splitStepText, 0, currentWorkingChar);
                if (nextChar) {
                    currentWorkingChar = nextChar;
                } else {
                    currentWorkingChar = characterRef.current || character;
                }
                
                setTimeout(runSplitStep, 10);
            };
            
            setTimeout(runSplitStep, 10);
            return;
        }
    }

    if (actionText.startsWith('[군사 작전]')) {
        const nationMatch = actionText.match(/\]\s*(.+?)\s*전선/);
        const nation = nationMatch ? nationMatch[1].trim() : (character.currentLocation?.nation || character.nation);
        
        const relation = character.militaryData?.diplomacy?.[nation];
        const occ = relation?.occupation || 0;
        
        const isRaid = occ < 100;
        const enemies = generateWarEnemies(nation, character.level, isRaid, occ);
        
        const newCombatState: CombatState = { 
            enemies, 
            turn: 1, 
            log: [isRaid ? `[전선 돌파] ${nation}의 방어선을 향해 진격합니다!` : `[최종 결전] ${nation}의 수도에 진입하여 지도자를 대면합니다!`], 
            isEnded: false, 
            type: isRaid ? 'war_raid' : 'dungeon' 
        };
        // [FIX] 전술적 목표 국가 명시
        (newCombatState as any).sourceId = nation;

        setCombatState(newCombatState); 
        setSceneType('combat');
        addToLog(`[작전 명령] ${nation} 전선 타격 작전을 시작합니다.`); 
        return;
    }

    if (actionText.startsWith('[전쟁 습격]')) {
        const nation = character.currentLocation?.nation || character.nation;
        const occ = character.militaryData?.diplomacy?.[nation]?.occupation || 0;
        const enemies = generateWarEnemies(nation, character.level, true, occ);
        const newCombatState: CombatState = { 
            enemies, 
            turn: 1, 
            log: [`[전선 습격] ${nation}의 방어 거점에 대한 기습 공격을 개시합니다!`], 
            isEnded: false, 
            type: 'war_raid' 
        };
        // [FIX] 전술적 목표 국가 명시
        (newCombatState as any).sourceId = nation;

        setCombatState(newCombatState); 
        setSceneType('combat');
        addToLog(`[작전 개시] ${nation} 전선을 타격합니다.`); 
        return;
    }

    if (actionText.startsWith('[전쟁 방어]')) {
        const targetNation = actionText.split(': ')[1]?.trim();
        const occ = character.militaryData?.diplomacy?.[targetNation]?.occupation || 0;
        const enemies = generateWarEnemies(targetNation, character.level, false, occ);
        const newCombatState: CombatState = { 
            enemies, 
            turn: 1, 
            log: [`[거점 방어] 침공해온 ${targetNation}의 군대를 맞이하여 방어전을 시작합니다!`], 
            isEnded: false, 
            type: 'war_defend' 
        };
        (newCombatState as any).defenseNation = targetNation;
        // [FIX] 전술적 목표 국가 명시
        (newCombatState as any).sourceId = targetNation;
        
        setCombatState(newCombatState); 
        setSceneType('combat');
        return;
    }

    if (actionText.startsWith('[학교 생활]')) {
 const { processed, logMsg } = handleSchoolPromoteAction(actionText, character, setCharacterSafe, addMemory);
        if (processed) {
            setMessages(prev => [...prev, { role: 'user', text: actionText }, { role: 'ai', text: logMsg }]);
            setIsLoading(false);
            return;
        }
        if (processed) {
            setMessages(prev => [...prev, { role: 'user', text: actionText }, { role: 'ai', text: logMsg }]);
            setIsLoading(false);
            return; 
        }
    }

    if (actionText.includes('전투 돌입') || actionText.includes('[시험]') || actionText.includes('[토너먼트]') || actionText.includes('사냥터 탐색') || actionText.includes('(대련)') || actionText.includes('(결투)') || actionText.includes('국가 토벌대') || actionText.includes('현상금 사냥꾼') || actionText.includes('[BOSS_START] 문지기 케르베로스]')) {
        let finalEnemies: Enemy[] = [];
        let battleMsg = "";
        let isPvP = false;
        let combatContextType: 'normal' | 'exam_mid' | 'exam_final' | 'tournament' | 'dungeon' | 'arena' | 'war_raid' | 'war_defend' | 'bounty_hunt' | 'temple_defense' | 'wanted_battle' | 'divine_invasion' | 'relation_battle' | 'temple_invasion' | 'god_rebellion' | 'school_demo' | 'instant_dungeon' | 'PVP_battle' | 'magye_revolt' | 'magye_divine_war' | 'magye_rebellion' | 'relation_ambush' | 'magye_temple_invasion' | 'magye_god_slaying' | 'regional_uprising' | 'Coup' | 'emergency_rescue' = 'normal';
        let rewards: { exp: number, gold: number } | undefined = undefined;
        let relationTargetId: string | undefined = undefined;

        if (actionText.includes('국가 토벌대') || actionText.includes('현상금 사냥꾼')) {
             combatContextType = 'wanted_battle';
             battleMsg = `[긴급 상황] 당신을 체포하기 위한 추격대가 앞을 가로막습니다!`;
        }

        if (actionText.includes('사냥터 탐색')) {
            const bandIdMatch = actionText.match(/지역:\s*(\w+)/);
            const lvlMatch = actionText.match(/권장레벨:\s*(\d+)/);
            const bandId = bandIdMatch ? bandIdMatch[1] : 'beginner';
            const targetLevel = lvlMatch ? parseInt(lvlMatch[1]) : character.level;
            
            setCharacter(prev => ({ ...prev, lastHuntingBandId: bandId }));
            
            const nation = character.currentLocation?.nation || character.nation;
            const city = character.currentLocation?.city || "";
            
            const theme = NATION_THEMES[city] || NATION_THEMES[nation] || NATION_THEMES["default"];
            
            const monsterPool = getMonsterPoolForBand(theme, bandId);
            let tempEnemies: Enemy[] = [];
            const enemyCount = Math.floor(Math.random() * 4) + 1;
            for(let i=0; i<enemyCount; i++) {
                const baseEnemy = generateProceduralEnemy(targetLevel);
                const themedName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const monsterInfo = getMonsterInfo(themedName);
                baseEnemy.name = monsterInfo.name;
                baseEnemy.visualUrl = monsterInfo.visualUrl;
                if (monsterInfo.shinryokuType) {
                    baseEnemy.shinryokuType = monsterInfo.shinryokuType;
                }
                tempEnemies.push(baseEnemy);
            }
            const nameCounts: Record<string, number> = {};
            tempEnemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
            finalEnemies = tempEnemies.map((e, idx) => {
                if (nameCounts[e.name] > 1) {
                    const count = tempEnemies.slice(0, idx + 1).filter(n => n.name === e.name).length;
                    return { ...e, name: `${e.name} ${String.fromCharCode(64 + count)}` }; 
                }
                return e;
            });
            finalEnemies.forEach(e => updateBestiary(e.name, false));
            battleMsg = `[시스템] ${city || nation}의 ${theme.fieldSuffix}에서 적들과 조우했습니다!`;
        }
        else if (actionText.includes('(대련)') || actionText.includes('(결투)')) {
            isPvP = true;
            const nameMatch = actionText.match(/\[전투 돌입\]\s*(.+?)\s*\((?:대련|결투)\)/);
            let opponentName = nameMatch ? nameMatch[1].trim() : "";
            opponentName = opponentName.replace("라이벌 ", "");
            const student = character.schoolData?.classmates.find(s => s.name === opponentName);
            if (student) {
                if (student.isRival) {
                    combatContextType = 'relation_battle';
                    relationTargetId = student.id;
                }
                const pLevel = student.level;
                const growthFactor = Math.max(0, pLevel - 1) * 1.5; 
                const str = Math.floor((student.stats.str || 10) + growthFactor);
                const int = Math.floor((student.stats.int || 10) + growthFactor);
                const def = Math.floor((student.stats.def || 10) + growthFactor);
                const agi = Math.floor((student.stats.agi || 10) + growthFactor);
                const wis = Math.floor((student.stats.wis || 10) + growthFactor);
                const ctrl = Math.floor((student.stats.ctrl || 10) + growthFactor);
                const calculatedHp = (pLevel * 10) + (def * 3);
                finalEnemies = [{
                    name: student.name,
                    level: pLevel,
                    hp: calculatedHp,
                    maxHp: calculatedHp,
                    stats: { hp: calculatedHp, maxHp: calculatedHp, mp: 100 + (pLevel*10), maxMp: 100 + (pLevel*10), str, int, def, agi, wis, ctrl },
                    shinryokuType: "무속성", 
                    skills: [{ name: "강타", type: SkillType.PHYSICAL, tier: ClassTier.FIRST, mpCost: 10, level: 1, maxLevel: 1, currentMastery: 0, effectFormula: "STR*1.3", powerRatio: 130, description: "강하게 때립니다." }], 
                    statusEffects: [],
                    description: `당신의 학급 동료인 ${student.name}입니다.`
                }];
                battleMsg = `[전투 돌입] ${student.name}와(과)의 대련을 시작합니다!`;
            } 
            else {
                finalEnemies.push(generateProceduralEnemy(character.level));
                battleMsg = `[전투 돌입] 대련 상대를 찾지 못해 야생 몬스터가 난입했습니다!`;
            }
        }
        
        else if (actionText.includes('[시범 전투]')) {
            combatContextType = 'school_demo';
            const lvlMatch = actionText.match(/Lv\.(\d+)/);
            const targetLevel = lvlMatch ? parseInt(lvlMatch[1]) : 5;
            const stats = generateEnemyStats(targetLevel);
            finalEnemies = [{
                name: "훈련용 마물",
                level: targetLevel,
                hp: stats.hp,
                maxHp: stats.maxHp,
                stats: stats,
                shinryokuType: "강철계",
                statusEffects: [],
                skills: [],
                description: "강의 시범을 위해 소환된 훈련용 마물입니다."
            }];
            battleMsg = `[시스템] ${actionText} - 시범 전투를 시작합니다!`;
        }
        else if (actionText.includes('[토너먼트]')) {
            combatContextType = 'tournament';
            let tLevel = character.level;
            const isFinal = actionText.includes('결승') || actionText.includes('우승');
            const isSemiFinal = actionText.includes('준결승') || actionText.includes('4강');
            const roundMatch = actionText.match(/(\d+)강/);
            
            let currentRound = 32;
            if (isFinal) currentRound = 2;
            else if (isSemiFinal) currentRound = 4;
            else if (roundMatch) currentRound = parseInt(roundMatch[1]);
            else if (character.schoolData?.currentTournament?.currentRound) currentRound = character.schoolData.currentTournament.currentRound;

            if (currentRound === 2) tLevel += 5; 
            else if (currentRound <= 4) tLevel += 4;
            else if (currentRound <= 8) tLevel += 3; 

            const bracketOppName = character.schoolData?.currentTournament?.opponentName;
            const oppGender = Math.random() < 0.5 ? 'male' : 'female';
            let tName = bracketOppName || generateName(character.currentLocation?.nation || character.nation, oppGender);
            const stats = generateEnemyStats(tLevel);
            stats.str = Math.floor(stats.str * 1.2); stats.int = Math.floor(stats.int * 1.2); stats.def = Math.floor(stats.def * 1.2); stats.agi = Math.floor(stats.agi * 1.2); stats.wis = Math.floor(stats.wis * 1.2); stats.ctrl = Math.floor(stats.ctrl * 1.2);
            
            const roundDesc = currentRound === 2 ? '결승전 상대입니다.' : currentRound === 4 ? '4강 준결승 상대입니다.' : `${currentRound}강 상대입니다.`;
            finalEnemies = [{
                name: tName, level: tLevel, hp: stats.hp, maxHp: stats.maxHp, stats: stats,
                shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
                statusEffects: [], skills: [], description: roundDesc
            }];
            battleMsg = `[시스템] ${actionText} - ${tName} (Lv.${tLevel}) 등장!`;
            isPvP = true;
        }
  else if (actionText.includes('[시험]')) {
            if (actionText.includes('중간고사')) combatContextType = 'exam_mid';
            else if (actionText.includes('학말고사')) combatContextType = 'exam_final';
            else combatContextType = 'exam_mid'; 

            let targetLevel = character.level;
            let monsterName = "시험용 몬스터";

            if (actionText.includes('간단한')) { targetLevel = 5; monsterName = "훈련용 허수아비 MK-II"; }
            else if (actionText.includes('강화된')) { targetLevel = 15; monsterName = "강화 훈련 로봇"; }
            else if (actionText.includes('강력한')) { targetLevel = 25; monsterName = "전투 시뮬레이터 골렘"; }
            else if (actionText.includes('토너먼트')) {
                 targetLevel = Math.max(25, character.level);
                 monsterName = "강력한 전투용 로봇";
                 isPvP = true;
                 actionText += "\n[System Context: School Tournament Final. Non-lethal duel.]";
            }

            const stats = generateEnemyStats(targetLevel);
            finalEnemies = [{
                name: monsterName,
                level: targetLevel,
                hp: stats.hp,
                maxHp: stats.maxHp,
                stats: stats,
                shinryokuType: isPvP ? "무속성" : "강철계",
                statusEffects: [],
                skills: [],
                description: "시험 통과를 위해 격파해야 할 대상입니다."
            }];
            battleMsg = `[시스템] ${actionText} - ${monsterName} (Lv.${targetLevel}) 등장!`;
        }
        else {
            const lvlMatch = actionText.match(/\(Lv\.?\s*(\d+)\)/i) || actionText.match(/Lv\.?\s*(\d+)/i);
            const targetLevel = lvlMatch ? parseInt(lvlMatch[1]) : character.level;
            const enemyCount = Math.floor(Math.random() * 3) + 1;
            
            for(let i=0; i<enemyCount; i++) {
                finalEnemies.push(generateProceduralEnemy(targetLevel));
            }
            
            const nameCounts: Record<string, number> = {};
            finalEnemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
            finalEnemies = finalEnemies.map((e, idx) => {
                if (nameCounts[e.name] > 1) {
                    const count = finalEnemies.slice(0, idx + 1).filter(n => n.name === e.name).length;
                    return { ...e, name: `${e.name} ${String.fromCharCode(64 + count)}` }; 
                }
                return e;
            });
            battleMsg = `[전투 돌입] 야생의 몬스터들이 앞을 가로막습니다!`;
        }

        const newCombatState: CombatState = { 
            enemies: finalEnemies, 
            turn: 1, 
            log: [`[전투 시작] ${finalEnemies.map(e => e.name).join(', ')} 등장!`], 
            isEnded: false,
            type: combatContextType,
            rewards: rewards
        };
        
        if (relationTargetId) {
            (newCombatState as any).sourceId = relationTargetId; 
        }

        // [NEW] 전투 진입 시 도감에 조우 기록
        finalEnemies.forEach(e => updateBestiary(e.name, false));
        setCombatState(newCombatState); 
        setSceneType('combat'); 
        setMessages(prev => [...prev, { role: 'ai', text: battleMsg }]); 
        return;
    }

    if (actionText.includes('[BOSS_START] 문지기 케르베로스')) {
        const cerberus: Enemy = {
            name: "문지기 케르베로스",
            level: 300, 
            hp: 3000000,
            maxHp: 3000000,
            stats: { hp: 3000000, maxHp: 3000000, mp: 5000, maxMp: 5000, str: 8000, int: 7000, def: 15000, agi: 8000, wis: 100, ctrl: 100 },
            shinryokuType: "암흑계",
            statusEffects: [],
            skills: [
                { name: "지옥의 불꽃", type: SkillType.MAGIC, tier: ClassTier.FINAL, mpCost: 50, level: 5, maxLevel: 10, currentMastery: 0, effectFormula: "INT*2.0", powerRatio: 200, targetType: 'aoe', description: "[부가 효과: 화상] 지옥의 불을 뿜는다." },
                { name: "삼중 물어뜯기", type: SkillType.PHYSICAL, tier: ClassTier.LAST, mpCost: 30, level: 5, maxLevel: 10, currentMastery: 0, effectFormula: "STR*1.5", powerRatio: 150, targetType: 'single', description: "[부가 효과: 출혈] 세 개의 머리로 연속 공격한다." },
                { name: "공포의 포효", type: SkillType.DEBUFF, tier: ClassTier.SECOND, mpCost: 40, level: 5, maxLevel: 10, currentMastery: 0, effectFormula: "ATK -20%", powerRatio: 0, targetType: 'aoe', description: "[부가 효과: 공포] 주변을 공포에 떨게 한다." }
            ]
        };
        const newCombatState: CombatState = { enemies: [cerberus], turn: 1, log: [`[전투 시작] 거대한 지옥의 파수꾼, 케르베로스가 앞을 막아섭니다!`], isEnded: false };
         updateBestiary(cerberus.name, false);
        setCombatState(newCombatState); setSceneType('combat'); setMessages(prev => [...prev, { role: 'ai', text: `[보스전] 강력한 몬스터 기운이 느껴집니다. 건투를 빕니다!` }]); return;
    }
    const inputLower = actionText.toLowerCase();
    const isSystemMessage = actionText.startsWith('[시스템]') || actionText.startsWith('[FAST_RESPONSE]') || actionText.startsWith('[기지 활동]') || actionText.startsWith('[전투 아이템 사용]') || actionText.startsWith('[아이템 사용]') || actionText.startsWith('[동료 영입]') || actionText.startsWith('[학교 생활]') || actionText.startsWith('[토너먼트]') || actionText.startsWith('[전투 돌입]') || actionText.startsWith('[SYSTEM_PASS_DAY_SPLIT]');
    let daysPassed = 0;
    if (actionText.startsWith('[SYSTEM_PASS_DAY_SPLIT]')) {
        daysPassed = 1;
    } else if (!isSystemMessage) {
        daysPassed = determineTimePassage(actionText);
    }
    if (sceneType === 'combat') { daysPassed = 0; }
    const isRestAction = (daysPassed > 0 || /휴식|잠|수면|회복|rest|sleep/i.test(inputLower)) && sceneType !== 'combat';
    
    let currentState = stateOverride || characterRef.current || character;
    const prevDate = currentState.currentDate || START_DATE;
    const newDate = addDays(prevDate, daysPassed);
    
    const prevYear = getYear(prevDate);
    const nYear = getYear(newDate);
    
   const updateAgeForEntity = (entity: any, targetYear: number, baseYear: number) => {
        let bYear = entity.birthYear;
        if (bYear === undefined && entity.age) {
            const ageNum = parseInt(entity.age.toString().replace(/[^0-9]/g, '')) || 0;
            bYear = baseYear - ageNum;
        }
        if (bYear !== undefined) {
             return { ...entity, birthYear: bYear, age: calculateAgeFromYear(bYear, targetYear) };
        }
        return entity;
    };

    let timeAdvancedChar = currentState;
    
    
    const accumTimePassageLogs: string[] = [];

    if (daysPassed > 0 && timeAdvancedChar.socialNetwork) {
        const { updatedNetwork, growthLogs } = updateSocialNetworkGrowth(timeAdvancedChar.socialNetwork, daysPassed, nYear);
        timeAdvancedChar.socialNetwork = updatedNetwork;
        growthLogs.forEach(log => accumTimePassageLogs.push(log));
    }
  
      if (isRestAction) { 
        const { finalStats: pFinal } = calculateFinalStats(timeAdvancedChar);
        const clearAilmentsOnly = (effects: ActiveStatus[] = []) => {
            const ailments = ['중독', '화상', '출혈', '빙결', '감전', '속박', '혼란', '기절', '마비', '침묵', '소멸', '흡정', '마나 쉴드'];
            return (effects || []).filter((e: any) => {
                const isAilment = ailments.includes(e.name) || ailments.some(a => e.name?.includes(a));
                return !isAilment;
            });
        };
        timeAdvancedChar = { 
            ...timeAdvancedChar, 
            stats: { ...timeAdvancedChar.stats, hp: pFinal.maxHp, mp: pFinal.maxMp }, 
            statusEffects: clearAilmentsOnly(timeAdvancedChar.statusEffects), 
            companions: timeAdvancedChar.companions.map(c => {
                const { finalStats: cFinal } = calculateFinalStats(c);
                return { ...c, stats: { ...c.stats, hp: cFinal.maxHp, mp: cFinal.maxMp }, statusEffects: clearAilmentsOnly(c.statusEffects) };
            }), 
            inactiveCompanions: timeAdvancedChar.inactiveCompanions?.map(c => {
                const { finalStats: cFinal } = calculateFinalStats(c);
                return { ...c, stats: { ...c.stats, hp: cFinal.maxHp, mp: cFinal.maxMp }, statusEffects: clearAilmentsOnly(c.statusEffects) };
            }) 
        }; 
    }
    
    if (daysPassed > 0) {
        timeAdvancedChar = { 
            ...timeAdvancedChar, 
            currentDate: newDate, 
            ...(nYear > prevYear ? {
                ...updateAgeForEntity(timeAdvancedChar, nYear, prevYear), 
                companions: (timeAdvancedChar.companions || []).map(c => updateAgeForEntity(c, nYear, prevYear)),
                inactiveCompanions: timeAdvancedChar.inactiveCompanions?.map(c => updateAgeForEntity(c, nYear, prevYear))
            } : {})
        };
    }
    
    if (daysPassed > 0 && timeAdvancedChar.base?.dispatched && Array.isArray(timeAdvancedChar.base.dispatched)) {
        let hasDeath = false;
        const deadNames: string[] = [];
        const now = timeAdvancedChar.currentDate;
        
        timeAdvancedChar.base.urgentAlarms = [];
        
        timeAdvancedChar.base.dispatched = (timeAdvancedChar.base.dispatched || []).filter(mission => {
            if (now >= mission.expectedReturnDate) {
                if (mission.missionType === 'RecruitTravel') {
                    const comp = timeAdvancedChar.inactiveCompanions?.find(c => c.id === mission.companionId);
                    setTimeout(() => addToLog(`[시스템 알림] 먼 곳에서 온 인연 '${comp?.name || '동료'}'이(가) 기지에 도착했습니다.`), 100);
                    
                    if (timeAdvancedChar.base?.assignments) {
                        delete timeAdvancedChar.base.assignments[`dispatch_${mission.id}`];
                        Object.keys(timeAdvancedChar.base.assignments).forEach(key => {
                            if (key.includes(mission.id)) delete timeAdvancedChar.base!.assignments![key];
                        });
                    }
                    return false; 
                }
                return true; 
            }

            // 안전한 미션 판별 (기지 내부 제작/업무 및 비위험 이동은 완전 제외)
            const isSafeMission = 
                mission.companionId === 'PLAYER_SELF' ||
                mission.missionType === 'AlchemyCrafting' ||
                mission.missionType === 'Alchemy' ||
                mission.missionType === 'Blacksmithing' ||
                mission.missionType === 'RecruitTravel' ||
                mission.missionType === 'PersonalLeave' ||
                mission.missionType === 'TempleProtection' ||
                mission.missionType === 'patrol' ||
                mission.missionType === 'pacify' ||
                mission.missionType === 'festival' ||
                mission.missionType === 'invest' ||
                mission.id.startsWith('reg_miss_') ||
                mission.id.startsWith('alc_') ||
                mission.id.startsWith('bs_') ||
                mission.id.startsWith('temple_prot_');

            // 기지 내부 제작이나 안전한 업무는 항상 정상(Normal) 상태를 유지하도록 자동 보정
            if (isSafeMission) {
                mission.status = 'Normal';
                mission.dangerCounter = 0;
            }

            if (mission.status === 'Normal') { 
                if (!isSafeMission) {
                    // Check for each day if it becomes difficult
                    let becameDifficult = false;
                    for (let i = 0; i < daysPassed; i++) {
                        if (Math.random() < 0.1) {
                            becameDifficult = true;
                            break;
                        }
                    }
                    if (becameDifficult) mission.status = 'Difficult';
                }
            } 
            else {
                if (!isSafeMission) {
                    mission.dangerCounter += daysPassed;
                    if (mission.dangerCounter >= 5 && mission.status === 'Difficult') {
                        mission.status = 'Critical';
                    }
                    if (mission.dangerCounter >= 10) {
                        // Check death for each day past 10
                        let died = false;
                        const daysPast10 = Math.min(daysPassed, mission.dangerCounter - 9);
                        for (let i = 0; i < daysPast10; i++) {
                            if (Math.random() < 0.05) {
                                died = true;
                                break;
                            }
                        }
                        
                        if (died) {
                            const comp = timeAdvancedChar.inactiveCompanions?.find(c => c.id === mission.companionId);
                            if (comp) { 
                                deadNames.push(comp.name); hasDeath = true;
                                
                                const tombstonedChar = tombstoneCompanion(timeAdvancedChar, comp.id, '전사');
                                timeAdvancedChar.inactiveCompanions = tombstonedChar.inactiveCompanions;
                                timeAdvancedChar.socialNetwork = tombstonedChar.socialNetwork;

                                if (timeAdvancedChar.base?.assignments) delete timeAdvancedChar.base.assignments[`dispatch_${mission.id}`];
                                return false; 
                            }
                        }
                    }
                }
            }

            if (!isSafeMission && (mission.status === 'Difficult' || mission.status === 'Critical')) {
                const comp = [...timeAdvancedChar.companions, ...(timeAdvancedChar.inactiveCompanions || [])].find(c => c.id === mission.companionId);
                if (comp) {
                    const destCity = typeof mission.destination === 'string' ? mission.destination : (mission.destination?.city || '파견지');
                    const log = `[${now}] '${comp.name}' 대원의 미션(${destCity}) 상태가 '${mission.status}'입니다. 긴급 지원이 필요합니다.`;
                    timeAdvancedChar.base!.urgentAlarms!.push(log);
                    setTimeout(() => addToLog(`[긴급 경보] ${log}`), 150);
                }
            }

            return true;
        });
        if (hasDeath) setTimeout(() => addToLog(`[시스템 비보] 파견 중이던 ${deadNames.join(', ')} 동료가 사망했습니다...`), 200);
    }

    if (daysPassed > 0) {
        // [NEW] 일일 자원 수확 및 기지/성전 Critical 경보 시뮬레이션
        const timeSkipRes = processTimeSkip(timeAdvancedChar, daysPassed);
        timeAdvancedChar = timeSkipRes.updatedCharacter;
        if (timeSkipRes.dailyReport) {
            setDailyReport(timeSkipRes.dailyReport);
        }
        if (timeSkipRes.worldNews && timeSkipRes.worldNews.length > 0) {
            setWorldNewsList(timeSkipRes.worldNews);
        }
        if (timeSkipRes.systemLogs && timeSkipRes.systemLogs.length > 0) {
            timeSkipRes.systemLogs.forEach(sysLog => accumTimePassageLogs.push(sysLog));
        }

        const { updatedChar: companionUpdatedChar, eventLogs } = processInterCompanionEvents(timeAdvancedChar, daysPassed);
        timeAdvancedChar = companionUpdatedChar;
        eventLogs.forEach(log => accumTimePassageLogs.push(log));

        if ((timeAdvancedChar.job === JobType.SOLDIER && timeAdvancedChar.militaryData) || isMessengerJob(timeAdvancedChar.job)) {
            const { updatedChar: diplomacyUpdatedChar, events: diplomacyEvents } = updateNationalDiplomacy(timeAdvancedChar, daysPassed);
            timeAdvancedChar = diplomacyUpdatedChar;
            diplomacyEvents.forEach(evt => accumTimePassageLogs.push(evt));

            const prevMonthStr = prevDate.substring(0, 7);
            const nextMonthStr = newDate.substring(0, 7);
            if (prevMonthStr !== nextMonthStr && timeAdvancedChar.militaryData) {
                if (timeAdvancedChar.militaryData.pendingInvasions && timeAdvancedChar.militaryData.pendingInvasions.length > 0) {
                    timeAdvancedChar.militaryData.pendingInvasions.forEach(nation => {
                        if (timeAdvancedChar.militaryData?.diplomacy?.[nation]) {
                            const rel = timeAdvancedChar.militaryData.diplomacy[nation];
                            rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
                        }
                    });
                    accumTimePassageLogs.push(`[군사 패보] 지난 달 처리하지 못한 적군의 침공으로 인해 전선 점유율이 하락했습니다.`);
                    timeAdvancedChar.militaryData.pendingInvasions = [];
                }

                const diplomacy = timeAdvancedChar.militaryData.diplomacy;
                if (diplomacy) {
                }
            }
        }

        // 압축 요약 로그 일괄 출력
        const condensedLogs = condenseSystemLogs(accumTimePassageLogs, daysPassed);
        condensedLogs.forEach((sysLog, idx) => {
            setTimeout(() => addToLog(sysLog), idx * 100);
        });
    }    
        const isPartyMessenger = daysPassed > 0 && sceneType !== 'combat' && (isMessengerJob(timeAdvancedChar.job) || timeAdvancedChar.companions.some(c => isMessengerJob(c.job)) || (timeAdvancedChar.inactiveCompanions || []).some(c => isMessengerJob(c.job)));
        const lastDefenseYear = timeAdvancedChar.base?.lastTempleDefenseYear || 0;
        if (isPartyMessenger && nYear > lastDefenseYear && Math.random() < 0.1) {

            const defenseEvent = triggerTempleDefense(timeAdvancedChar);
if (defenseEvent) {

    if (!timeAdvancedChar.templeDiplomacy) {
        timeAdvancedChar.templeDiplomacy = {};
    }
    

    const sourceNation = defenseEvent.source; 
let actualNationKey = sourceNation;

const isNormalNation = NATION_LIST.includes(sourceNation);

if (sourceNation === '마계' || sourceNation === '마신') {
    actualNationKey = '임페리얼 제국';
}
    if (!timeAdvancedChar.templeDiplomacy[actualNationKey]) {
        timeAdvancedChar.templeDiplomacy[actualNationKey] = {
            status: DivineDiplomacyStatus.NEUTRAL,
            faithPoints: 0,
            influence: 0,
            tension: 0,
            tributeLevel: 0
        };
    }

    const divineRel = timeAdvancedChar.templeDiplomacy[actualNationKey];
if (isNormalNation) {
    divineRel.tension = Math.min(100, (divineRel.tension || 0) + 50);
    setTimeout(() => addToLog(`[성전 경보] ${sourceNation} 군대의 침공으로 성전 긴장도가 상승했습니다.`), 600);
}
    if (divineRel.tension >= 80 && divineRel.status !== DivineDiplomacyStatus.CORRUPTED) {
        divineRel.status = DivineDiplomacyStatus.CORRUPTED;
        setTimeout(() => addToLog(`[성전 경보] ${sourceNation}과의 관계가 극도로 악화되어 적대 상태에 돌입했습니다!`), 650);
    }

   if ((sourceNation === '마계' || sourceNation === '마신')) {
        divineRel.tension = Math.min(100, divineRel.tension + 50);
        if (divineRel.tension >= 80 && divineRel.status !== DivineDiplomacyStatus.CORRUPTED) {
            divineRel.status = DivineDiplomacyStatus.CORRUPTED;
            setTimeout(() => addToLog(`[외교 긴급] 마계의 노골적인 성전 침공으로 인해 임페리얼 제국과의 관계가 전쟁 상태로 악화되었습니다!`), 600);
        } else {
            setTimeout(() => addToLog(`[외교 보고] 성전을 노린 마계의 공세로 임페리얼 제국과의 긴장도가 상승했습니다.`), 600);
        }
    }
if (!timeAdvancedChar.divineRelations) {
    timeAdvancedChar.divineRelations = { 
        god: { affection: 0, status: '중립' }, 
        temples: {} 
    };
}

    // [MODIFIED] 성전 침공 시 관계도 하락 로직 (엘클, 절대신 엘라 대응)
    if (timeAdvancedChar.divineRelations) {
        if (sourceNation === '타 성전') {
            const bossName = defenseEvent.enemies[0].name.replace('[BOSS] ', ''); 
            const bossToCity: Record<string, string> = {
                "엘클": "태양의 사자의 성전",
                "줄리엣": "광휘의 사자의 성소",
                "라 페르난데스": "화염의 사자의 성화",
                "최원한": "월광의 사자의 성",
                "권율": "전격의 사자의 성전",
                "원지원": "지령의 사자의 궁궐",
                "블랙 스톰": "질풍의 사자의 질풍전",
                "이케 블리자더": "빙결의 사자의 빙궁",
                "오션 레이크": "해수의 사자의 성수전",
                "퍼스트 스틸스": "강철의 사자의 강성",
                "네오 다크 볼튼": "암연의 사자의 심연",
                "태스크 슈카인": "초화의 사자의 성초",
                "홍길동": "무의 궁궐"
            };

            const targetCityName = bossToCity[bossName];
            if (targetCityName) {
                const currentTemples = { ...timeAdvancedChar.divineRelations.temples };
                const targetRel = currentTemples[targetCityName] ? { ...currentTemples[targetCityName] } : { affection: 0, status: '중립' };
                
                targetRel.affection = Math.max(-100, targetRel.affection - 50);
                if (targetRel.affection <= -50) targetRel.status = '적대';

                timeAdvancedChar = {
                    ...timeAdvancedChar,
                    divineRelations: {
                        ...timeAdvancedChar.divineRelations,
                        temples: { ...currentTemples, [targetCityName]: targetRel }
                    }
                };
                setTimeout(() => addToLog(`[신성 외교] ${bossName} 사자의 침공으로 인해 해당 성전과의 친밀도가 급락했습니다. (친밀도 -50)`), 700);
            }
        } else if (sourceNation === '타락한 신성') {
            // [NEW] 타락한 신 침공 시 신과의 친밀도 하락
            const currentGodRel = { ...timeAdvancedChar.divineRelations.god };
            currentGodRel.affection = Math.max(-100, currentGodRel.affection - 50);
            if (currentGodRel.affection <= -80) currentGodRel.status = '적대';
            else if (currentGodRel.affection < 0) currentGodRel.status = '중립';

            timeAdvancedChar = {
                ...timeAdvancedChar,
                divineRelations: {
                    ...timeAdvancedChar.divineRelations,
                    god: currentGodRel
                }
            }; 
            setTimeout(() => addToLog(`[신성 파문] 타락한 절대신의 시련입니다. 신과의 유대가 약화되었습니다. (친밀도 -50)`), 700);
        }
    }

    if (timeAdvancedChar.base?.lastTempleDefenseYear !== nYear) {
        timeAdvancedChar.base = {
            ...timeAdvancedChar.base!,
            lastTempleDefenseYear: nYear
        };
        timeAdvancedChar.pendingDefenseEvent = defenseEvent;
        setTimeout(() => {
            addToLog(`[긴급] 성전 안보 시스템 가동: ${defenseEvent.log}`);
        }, 500);
    } else {
        timeAdvancedChar.pendingDefenseEvent = defenseEvent;
    }
}
}
    if (prevDate.substring(0, 7) !== newDate.substring(0, 7)) {
        const { updatedChar: companionUpdatedChar, eventResult } = processCompanionRelationships(timeAdvancedChar, newDate);
        timeAdvancedChar = companionUpdatedChar;
        if (eventResult) {
            setResultModalData(eventResult);
        }
    }

    if (timeAdvancedChar.schoolData && !timeAdvancedChar.schoolData.isGraduated) {
        const dateParts = prevDate.split('-');
        const prevYearValue = parseInt(dateParts[0]);
        const prevMonthValue = parseInt(dateParts[1]);
        
        const targetSchoolYear = (prevMonthValue < 3) ? prevYearValue : prevYearValue + 1;
        const nextMarch2 = `${targetSchoolYear}-03-02`;
        
        if (prevDate < nextMarch2 && newDate >= nextMarch2) {
            const school = timeAdvancedChar.schoolData;
            const canAdvance = school.midtermPassed && school.finalPassed;
            
            if (canAdvance) {
                if (school.grade < 3) {
                    school.grade += 1;
                    school.semester = 1;
                    school.midtermPassed = false;
                    school.finalPassed = false;
                    school.lastExamDate = undefined;
                    
                    timeAdvancedChar.level += 1;
                    timeAdvancedChar.statPoints += 10;
                    timeAdvancedChar.stats.str += 2; timeAdvancedChar.stats.int += 2; timeAdvancedChar.stats.def += 2; timeAdvancedChar.stats.agi += 2; timeAdvancedChar.stats.maxHp += 50; timeAdvancedChar.stats.hp = timeAdvancedChar.stats.maxHp;
                    
                    const schoolNation = timeAdvancedChar.currentLocation?.nation || timeAdvancedChar.nation;
                    school.classmates = generateClassmates(schoolNation, 14, school.tier, school.grade, [], 1, undefined, false, getYear(newDate));
                    
                    addToLog(`[시스템] 새 학기가 시작되었습니다. ${school.grade}학년으로 자동 진급했습니다! (Lv+1, SP+10)`);
                } else {
                    addToLog(`[시스템] 졸업 요건을 충족했습니다! 학교 행정실에서 졸업 및 진학 절차를 진행하세요.`);
                }
            } else {
                school.midtermPassed = false;
                school.finalPassed = false;
                school.lastExamDate = undefined;
                school.semester = 1;
                school.classNumber = Math.floor(Math.random() * 5) + 1;
                const schoolNation = timeAdvancedChar.currentLocation?.nation || timeAdvancedChar.nation;
                school.classmates = generateClassmates(schoolNation, 14, school.tier, school.grade, [], 1, undefined, false, getYear(newDate));

                addToLog(`[시스템] 유급 알림: 시험을 모두 통과하지 못하여 진급하지 못했습니다. 새로운 ${school.grade}학년 반에 배정됩니다.`);
                setResultModalData({ 
                    type: 'warning', 
                    title: '유급 (Retention)', 
                    message: `성적 미달로 인해 진급에 실패했습니다.\n새로운 친구들과 함께 ${school.grade}학년을 다시 시작합니다.`, 
                    items: [{ label: '현재 학년', after: `${school.grade}학년 (유급)` }] 
                });
            }
        }
    }
    
    if (daysPassed > 0 && timeAdvancedChar.base?.capturedMonsters) {
        let hungryLog = "";
        timeAdvancedChar.base.capturedMonsters = timeAdvancedChar.base.capturedMonsters.map(m => {
            let newAffection = m.affection;
            if ((m.hunger || 0) <= 0) {
                newAffection = Math.max(0, m.affection - 5);
                if (Math.random() < 0.3) hungryLog += `\n[시스템] ${m.name}이(가) 배고픔에 지쳐 호감도가 떨어졌습니다.`;
            }
            return { ...m, hunger: 0, affection: newAffection }; 
        });
        if (hungryLog) {
             setMessages(prev => [...prev, { role: 'ai', text: hungryLog }]);
        }
    }

    if (actionText.startsWith('[SYSTEM_PASS_DAY_SPLIT]')) {
        setCharacterSafe(timeAdvancedChar);
        return timeAdvancedChar as any;
    }

    if (actionText.startsWith('[전투 아이템 사용') || actionText.startsWith('[아이템 사용')) {
        let isCompanionUser = false;
        let userUnitName = "";
        const userMatch = actionText.match(/\[(?:전투\s*)?아이템\s*사용:\s*(.+?)\]/);
        if (userMatch) {
            userUnitName = userMatch[1].trim();
            isCompanionUser = true;
        }

        if (sceneType === 'combat') {
            if ((combatState as any).hasUsedItem) {
                addToLog("[시스템] 이미 이번 턴에 아이템을 사용했습니다. 한 턴에 한 번만 사용 가능합니다.");
                setIsLoading(false);
                return;
            }

            // [FIX] 행동불가는 아이템을 사용하는 당사자(시전자) 턴에서만 아이템 사용이 불가하도록 판정
            // 동료가 행동불가인 플레이어에게 상태이상 해제 아이템을 사용할 때 정상 작동하도록 보장
            let actingUserEntity: any = timeAdvancedChar;
            if (isCompanionUser && userUnitName) {
                const comp = timeAdvancedChar.companions.find(c => c.name === userUnitName);
                if (comp) actingUserEntity = comp;
            }

            const ccEffect = actingUserEntity.statusEffects?.find((eff: ActiveStatus) => 
                ["빙결", "기절", "마비", "수면", "소멸", "감전", "속박", "혼란"].includes(eff.name)
            );
            if (ccEffect) {
                addToLog(`[시스템] ${actingUserEntity.name}이(가) ${ccEffect.name} 상태이므로 행동할 수 없으며 아이템 사용이 불가능합니다.`);
                setIsLoading(false);
                return;
            }
        }

        let itemName = actionText
            .replace(/\[(?:전투\s*)?아이템\s*사용(?::\s*[^\]]+)?\]/, '')
            .trim();
        let quantity = 1;
        let targetName = "";
        
        const targetMatch = itemName.match(/\(대상:\s*(.+?)\)/);
        if (targetMatch) {
            targetName = targetMatch[1].trim();
            itemName = itemName.replace(targetMatch[0], '').trim();
        }

        const qtyMatch = itemName.match(/(.+) x(\d+)$/);
        if (qtyMatch) {
            itemName = qtyMatch[1].trim();
            quantity = parseInt(qtyMatch[2]);
        }

        const indices: number[] = [];
        timeAdvancedChar.inventory.forEach((item, idx) => {
            if (item.name === itemName && indices.length < quantity) {
                indices.push(idx);
            }
        });

        if (indices.length > 0) {
            const countToUse = indices.length;
            const item = timeAdvancedChar.inventory[indices[0]];
            const newInventory = timeAdvancedChar.inventory.filter((_, idx) => !indices.includes(idx));
            timeAdvancedChar.inventory = newInventory;

            let targetEntity: any = timeAdvancedChar;
            if (targetName && targetName !== timeAdvancedChar.name) {
                const compIdx = timeAdvancedChar.companions.findIndex(c => c.name === targetName);
                if (compIdx !== -1) {
                    targetEntity = timeAdvancedChar.companions[compIdx];
                }
            }

                 // [NEW] 포획 그물 사용 시 적군 타겟팅 대응
            let targetEnemy: Enemy | undefined;
            if (sceneType === 'combat') {
                targetEnemy = combatState.enemies.find(e => e.name === targetName || targetName.includes(e.name));
            }

            const { hpGain, mpGain, newStatusEffects, removeStatus, logMessages, isCaptured, capturedMonster} = applyConsumableEffect(targetEntity, item, targetEnemy, timeAdvancedChar.companions);
            
            // [NEW] 포획 성공 처리
            if (isCaptured && capturedMonster && sceneType === 'combat') {
                const eIdx = combatState.enemies.findIndex(e => e === targetEnemy);
                if (eIdx !== -1) {
                    const nextEnemies = [...combatState.enemies];
                    nextEnemies[eIdx] = { ...nextEnemies[eIdx], hp: 0 }; // 전장에서 제거 처리
                    
                    if (!timeAdvancedChar.base) timeAdvancedChar.base = { ...INITIAL_BASE };
                    if (!timeAdvancedChar.base.capturedMonsters) timeAdvancedChar.base.capturedMonsters = [];
                    timeAdvancedChar.base.capturedMonsters.push(capturedMonster);
                    
                    // [NEW] 테이밍 숙련도 획득
                    const { newChar: charWithExp, leveledUp } = gainProfessionExp(timeAdvancedChar, 'taming', 50);
                    const tamingLevel = timeAdvancedChar.professions?.taming.level || 1;
                    
                    const logMsg = `[시스템: 포획] ${logMessages[0]} (테이밍 숙련도 +50)`;
                    let finalLogMsg = logMsg;
                    if (leveledUp) finalLogMsg += `\n[시스템] 테이밍 전문기술 레벨이 상승했습니다! (Lv.${tamingLevel} -> Lv.${tamingLevel + 1})`;
                    
                    setCombatState(prev => ({ ...prev, enemies: nextEnemies, log: [...prev.log, finalLogMsg], hasUsedItem: true }));
                    setCharacterSafe(charWithExp);
                    setMessages(prev => [...prev, { role: 'ai', text: finalLogMsg }]);
                    setIsLoading(false);
                    return;
                }
            }

            const totalHpGain = hpGain * countToUse;
            const totalMpGain = mpGain * countToUse;

            const targetFinalStats = calculateFinalStats(targetEntity).finalStats;

            if (totalHpGain > 0) targetEntity.stats.hp = Math.min(targetFinalStats.maxHp, targetEntity.stats.hp + totalHpGain);
            if (totalMpGain > 0) targetEntity.stats.mp = Math.min(targetFinalStats.maxMp, targetEntity.stats.mp + totalMpGain);
            
            if (newStatusEffects.length > 0) {
                if (!targetEntity.statusEffects) targetEntity.statusEffects = [];
                newStatusEffects.forEach(eff => {
                    const existingIdx = targetEntity.statusEffects!.findIndex((e: ActiveStatus) =>
                        e.name === eff.name ||
                        (e.name && eff.name && e.name.replace(/\s+/g, '').includes(eff.name.replace(/\s+/g, ''))) ||
                        (e.name && eff.name && eff.name.replace(/\s+/g, '').includes(e.name.replace(/\s+/g, '')))
                    );
                    if (existingIdx >= 0) targetEntity.statusEffects![existingIdx] = eff;
                    else targetEntity.statusEffects!.push(eff);
                });
            }

            if (removeStatus.length > 0 && targetEntity.statusEffects) {
                targetEntity.statusEffects = filterDebuffsForCleanse(targetEntity.statusEffects, removeStatus);
            }

            let extraLog = "";
            if (logMessages.length > 0) extraLog = ` (${logMessages.join(', ')})`;

            const logMsg = `[시스템: ${targetEntity.name}${extraLog}] (아이템 사용: ${item.name} x${countToUse})`;
            if (sceneType === 'combat') { 
                setCombatState(prev => ({ ...prev, log: [...prev.log, logMsg], hasUsedItem: true } as any)); 
            }
            setCharacterSafe(timeAdvancedChar); setMessages(prev => [...prev, { role: 'ai', text: logMsg }]); return;
        }
    }

    const userMsg: Message = { role: 'user', text: actionText };
    const isTravel = actionText.includes('이동') || actionText.includes('출발') || actionText.includes('진입');
    if (isTravel) {
        setLoadingMessage("목적지로 이동 중이며 관련 이벤트를 계산하고 있습니다...");
    } else {
        setLoadingMessage("기지 활동 및 영지 정산 이벤트를 계산하고 있습니다...");
    }
    if (sceneType !== 'combat') {
        setMessages((prev) => [...prev, userMsg]); setInput(''); setChoices([]); setIsLoading(true);
    }
    let currentCombat = sceneType === 'combat' ? (combatStateRef.current || combatState) : undefined;
    let systemInjectedNarrative = "";
    const baseCharState = timeAdvancedChar;
    let nextCharState = { ...baseCharState, stats: { ...baseCharState.stats } };
    nextCharState.companions = baseCharState.companions.map(c => ({...c, stats: {...c.stats}, skills: [...c.skills]}));
    
    const charForReconcile: Character = sceneType === 'combat' ? baseCharState : JSON.parse(JSON.stringify(baseCharState));
    let simulationEnemies = currentCombat ? JSON.parse(JSON.stringify(currentCombat.enemies)) : [];
    let enemiesForReconcile = (sceneType !== 'combat' && currentCombat) ? JSON.parse(JSON.stringify(currentCombat.enemies)) : [];

    if (sceneType === 'combat') {
        try {
            if (currentCombat && !currentCombat.initialParticipantStates) {
            currentCombat.initialParticipantStates = createInitialParticipantStates(timeAdvancedChar);
        }
        let accumulatedExp = currentCombat?.accumulatedExp || 0;
        let accumulatedGold = currentCombat?.accumulatedGold || 0;
        let accumulatedLoot = currentCombat?.accumulatedLoot ? [...currentCombat.accumulatedLoot] : [];

        const isEnemyTurnAction = actionText.startsWith('[적 행동:') || actionText.startsWith('[적 턴:');
        const isCompanionCommand = actionText.startsWith('[동료 지시:') || actionText.startsWith('[동료 행동:') || actionText.startsWith('[동료 스킬:');
        const isTurnEndAction = actionText === '[턴 종료]' || actionText === '[라운드 종료]';
        const isPlayerSkill = !isCompanionCommand && !isEnemyTurnAction && (actionText.startsWith('[스킬 사용]') || actionText.includes('스킬 사용:'));
        const isBasicAttack = !isCompanionCommand && !isEnemyTurnAction && actionText.startsWith('[일반 공격]');
        const isDefense = !isCompanionCommand && !isEnemyTurnAction && (actionText.startsWith('[방어]') || actionText.includes('방어 태세') || actionText.includes('자신 보호'));	
        const isFlee = actionText === '도망친다' || actionText.includes('[도주]');
        const isBondSkill = actionText.startsWith('[인연 스킬]');
        const isSystemAction = actionText.startsWith('[시스템]') || actionText.startsWith('[소환수 행동:');
        
        if (isTurnEndAction) {
            const currentCombatTurn = currentCombat?.turn ?? 0;
            const now = Date.now();
            if (lastProcessedRoundTurnRef.current === currentCombatTurn || (now - lastProcessedRoundTimestampRef.current < 800)) {
                console.log("[Combat] 이미 처리된 라운드 종료 신호입니다 (중복 방지):", currentCombatTurn);
                setIsLoading(false);
                return;
            }
            lastProcessedRoundTurnRef.current = currentCombatTurn;
            lastProcessedRoundTimestampRef.current = now;
        } else if (!isTurnEndAction) {
            // 라운드 내에서 유닛 행동이 발생했거나 전투 초기화 시 라운드 종료 신호 처리 플래그 리셋
            lastProcessedRoundTurnRef.current = -1;
        }

        let totalLog = "";
        // [방어 태세 개선] 행동 주체의 이전 방어 태세는 다음 본인 턴이 돌아와 새로운 행동을 취할 때 해제
        if (!isTurnEndAction && !isSystemAction) {
            if (isCompanionCommand) {
                const compCommandMatch = actionText.match(/\[동료 (?:지시|행동|스킬):\s*(.+?)\]\s*(.+?)$/);
                if (compCommandMatch) {
                    const cName = compCommandMatch[1].trim();
                    const subCmd = compCommandMatch[2].trim();
                    const isDefCmd = subCmd === '방어 태세' || subCmd === '방어' || subCmd.startsWith('방어');
                    if (!isDefCmd) {
                        const actingComp = nextCharState.companions.find(c => c.name.trim() === cName || c.name.includes(cName) || cName.includes(c.name));
                        if (actingComp && actingComp.statusEffects?.some(e => e.name === "방어 태세")) {
                            actingComp.statusEffects = actingComp.statusEffects.filter(e => e.name !== "방어 태세");
                            totalLog += `\n[시스템] ${actingComp.name}의 방어 태세가 해제되었습니다.`;
                        }
                    }
                }
            } else if (isEnemyTurnAction) {
                const enemyMatch = actionText.match(/\[적 (?:행동|턴):\s*(.+?)\]/);
                if (enemyMatch) {
                    const eName = enemyMatch[1].trim();
                    const actingEnemy = simulationEnemies.find((e: Enemy) => e.name.trim() === eName || e.name.includes(eName) || eName.includes(e.name));
                    if (actingEnemy && actingEnemy.statusEffects?.some((e: any) => e.name === "방어 태세")) {
                        actingEnemy.statusEffects = actingEnemy.statusEffects.filter((e: any) => e.name !== "방어 태세");
                    }
                }
            } else if (!isDefense) {
                if (nextCharState.statusEffects?.some(e => e.name === "방어 태세")) {
                    nextCharState.statusEffects = nextCharState.statusEffects.filter(e => e.name !== "방어 태세");
                    totalLog += `\n[시스템] ${nextCharState.name}의 방어 태세가 해제되었습니다.`;
                }
            }
        }
        const getRewardBonuses = () => calculateRewardBonuses(nextCharState);
        let anyKill = false;
        let playerActionDone = false;
        const actedCompanions = new Set<string>(); 

        const isSpecialRealm = nextCharState.currentLocation?.region === '신계' || 
                              nextCharState.currentLocation?.region === '마계' || 
                              nextCharState.currentLocation?.nation === '임페리얼 제국';

        const isRivalCombat = currentCombat?.type === 'eternal_rival_duel' || !!currentCombat?.enemies?.some(e => e.name?.includes('영원의 라이벌') || e.name?.includes('[영원의 라이벌]') || (e as any).isRivalEscort);
        const isOneOnOne = !isRivalCombat && (['tournament', 'arena', 'exam_mid', 'exam_final', 'final_trial_battle', 'sparring_arena', 'sparring'].includes(currentCombat?.type || '') || !!currentCombat?.isOneOnOne || !!currentCombat?.enemies?.some(e => e.name?.includes('[모의 대련]')));
        const challengerCompanionId = currentCombat?.challengerCompanionId;

        // 몬스터와의 레벨 차이에 따른 획득량 보정 배율 (경험치 및 골드 공통 적용)
        const getLevelGapMultiplier = (e: Enemy) => {
            const lvl = e.level || 1;
            const activeLevel = (isOneOnOne && challengerCompanionId)
                ? (nextCharState.companions.find(c => c.id === challengerCompanionId)?.level || nextCharState.level || 1)
                : (nextCharState.level || 1);

            const diff = activeLevel - lvl; // 양수: 플레이어가 몬스터보다 고레벨, 음수: 몬스터가 플레이어보다 고레벨

            let levelGapMultiplier = 1.0;
            if (diff > 0) {
                // 플레이어가 몬스터보다 레벨이 높은 경우 (저레벨 몬스터 처치 페널티)
                if (diff <= 10) {
                    levelGapMultiplier = 1.0; // 10레벨 이하 차이: 100% 정상 지급
                } else if (diff <= 20) {
                    levelGapMultiplier = 0.95; // 11 ~ 20레벨 차이: 95% 지급
                } else if (diff <= 30) {
                    levelGapMultiplier = 0.90; // 21 ~ 30레벨 차이: 90% 지급
                } else if (diff <= 40) {
                    levelGapMultiplier = 0.75; // 31 ~ 40레벨 차이: 75% 지급
                } else if (diff <= 60) {
                    levelGapMultiplier = 0.60; // 41 ~ 60레벨 차이: 60% 지급
                } else if (diff <= 80) {
                    levelGapMultiplier = 0.50; // 61 ~ 80레벨 차이: 50% 지급
                } else if (diff <= 100) {
                    levelGapMultiplier = 0.30; // 81 ~ 100레벨 차이: 30% 지급
                } else {
                    levelGapMultiplier = 0.10; // 100레벨 초과 차이: 최소 10% 지급
                }
            } else if (diff < -30) {
                // 몬스터 레벨이 플레이어보다 30레벨 이상 과도하게 높은 경우 (비정상 폭업 방지 보정)
                const overDiff = Math.abs(diff);
                if (overDiff <= 50) {
                    levelGapMultiplier = 0.85;
                } else if (overDiff <= 80) {
                    levelGapMultiplier = 0.65;
                } else {
                    levelGapMultiplier = 0.50;
                }
            }

            // 몬스터의 레벨이 500 이상인 고위 몬스터는 레벨 차이가 크더라도 최소 50% 보장
            if (lvl >= 500) {
                levelGapMultiplier = Math.max(0.50, levelGapMultiplier);
            }

            return levelGapMultiplier;
        };

        const calculateMonsterExp = (e: Enemy) => {
            const lvl = e.level || 1;
            let mult = 20;
            if (lvl > 1000) mult = 500;
            if (lvl > 800) mult = 300;
            if (lvl > 600) mult = 200;
            else if (lvl > 500) mult = 150;
            else if (lvl > 400) mult = 125;
            else if (lvl > 300) mult = 100;
            else if (lvl > 200) mult = 75;
            else if (lvl > 100) mult = 50;

            let exp = lvl * mult;
            if (e.name.includes('[BOSS]')) exp *= 10;
            if (isSpecialRealm) exp *= 5;

            const levelGapMultiplier = getLevelGapMultiplier(e);
            let finalExp = Math.max(1, Math.floor(exp * levelGapMultiplier));

            if ((currentCombat as any)?.suddenEventType === 'rift_crystal' || (e as any).isRiftCrystal) {
                const riftMult = (currentCombat as any)?.suddenExpMultiplier || 15;
                const refExp = Math.max(finalExp, (currentCombat as any)?.baseCombatExp || finalExp);
                finalExp = Math.floor(refExp * riftMult);
            } else if ((currentCombat as any)?.suddenRewardMultiplier) {
                finalExp = Math.floor(finalExp * ((currentCombat as any).suddenRewardMultiplier || 1));
            }

            return Math.max(1, finalExp);
        };

        const calculateMonsterGold = (e: Enemy) => {
            const lvl = e.level || 1;
            const baseGold = lvl * 100;
            const levelGapMultiplier = getLevelGapMultiplier(e);
            let finalGold = Math.max(1, Math.floor(baseGold * levelGapMultiplier));

            if ((currentCombat as any)?.suddenEventType === 'rift_crystal' || (e as any).isRiftCrystal) {
                const riftMult = (currentCombat as any)?.suddenExpMultiplier || 15;
                finalGold = Math.floor(finalGold * riftMult);
            } else if ((currentCombat as any)?.suddenRewardMultiplier) {
                finalGold = Math.floor(finalGold * ((currentCombat as any).suddenRewardMultiplier || 1));
            }

            return Math.max(1, finalGold);
        };

        const generateCombatLoot = (enemy: Enemy, nation: string | undefined, charState: Character): Item[] => {
            const rolls = (currentCombat as any)?.suddenLootRolls || 1;
            const items: Item[] = [];
            for (let r = 0; r < rolls; r++) {
                items.push(...generateLoot(enemy, nation, charState));
            }
            return items;
        };

        const applyCombatStyleExpForKill = (charState: Character, enemy: Enemy) => {
            const isBoss = enemy.isBoss === true || /\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]|\[사자\]|\[군주\]|\[사신\]|\[신\]/i.test(enemy.name || '');
            const styleMult = getTrainerBranchMultiplier(charState, TrainerBranch.COMBAT_STYLE);
            const defaultExp = Math.max(20, Math.floor((enemy.level || 1) * 15 + (isBoss ? 500 : 80)));
            const suddenMult = (currentCombat as any)?.suddenRewardMultiplier || 1;
            const gain = Math.floor(defaultExp * styleMult * suddenMult);
            
            const processEntity = (entity: any) => {
                if (!entity.targetCombatStyle) return;
                const res = processCombatStyleKillProgress(entity, enemy, gain);
                if (res.justCompleted && res.promotedStyle) {
                    totalLog += `\n[전투 스타일 수련] 🌟 ${entity.name}의 '${res.promotedStyle}' 전직 수련 조건이 모두 달성되었습니다!`;
                }
            };

            const processWeaponMastery = (entity: any) => {
                if (entity.stats.hp <= 0) return;
                if ('isDead' in entity && entity.isDead) return;

                let amount = isBoss ? 2 : 1;
                if ((currentCombat as any)?.suddenEventType === 'rift_crystal' || (enemy as any).isRiftCrystal) {
                    amount = (currentCombat as any)?.suddenMasteryBonus || 50;
                } else if ((currentCombat as any)?.suddenRewardMultiplier) {
                    amount *= (currentCombat as any).suddenRewardMultiplier;
                }
                const weaponMasteryMult = getWeaponMasteryMultiplier(entity as any);
                amount = Math.round(amount * weaponMasteryMult);

                if (entity.equipment?.weapon) {
                    const wType = getWeaponTypeFromItem(entity.equipment.weapon);
                    if (wType) {
                        const res = addMasteryExp(entity as Character, wType, amount);
                        const updated = res.char as any;
                        entity.weaponMastery = updated.weaponMastery; 
                        const typeName = WEAPON_TYPE_KOREAN[wType] || wType;
                        totalLog += `\n[시스템: ${entity.name} | ${typeName} 무기숙련도 +${amount} 상승]`;
                    }
                }
                if (entity.equipment?.subWeapon) {
                    const swType = getWeaponTypeFromItem(entity.equipment.subWeapon);
                    if (swType) {
                        const res = addMasteryExp(entity as Character, swType, amount);
                        const updated = res.char as any;
                        entity.weaponMastery = updated.weaponMastery;
                        const typeName = WEAPON_TYPE_KOREAN[swType] || swType;
                        totalLog += `\n[시스템: ${entity.name} | ${typeName} 무기숙련도 +${amount} 상승]`;
                    }
                }
            };

            processEntity(charState);
            processWeaponMastery(charState);

            (charState.companions || []).forEach(comp => {
                if (comp.stats.hp > 0 && !comp.isDead) {
                    if (comp.targetCombatStyle) {
                        processEntity(comp);
                    }
                    processWeaponMastery(comp);
                }
            });
        };

        const handleEnemyKillReward = (enemy: Enemy) => {
            const curBonuses = getRewardBonuses();
            const rawExp = calculateMonsterExp(enemy); 
            const rawGold = calculateMonsterGold(enemy);
            const expMultiplier = curBonuses.expMultiplier || 1.0;
            const goldMultiplier = curBonuses.goldMultiplier || 1.0;
            const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * expMultiplier);
            const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * goldMultiplier);
            const loot = generateCombatLoot(enemy, nextCharState.currentLocation?.nation, nextCharState);
            accumulatedLoot.push(...loot);
            if (loot.length > 0) { 
                if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                    nextCharState.inventory = [...nextCharState.inventory, ...loot];
                    loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                } else {
                    totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                }
            }
            totalLog += `\n[시스템] ${enemy.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
            anyKill = true;
            applyBestiaryUpdateInPlace(nextCharState, enemy.name, true);
            applyCombatStyleExpForKill(nextCharState, enemy);
            nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
            nextCharState.currentExp += exp;
            nextCharState.companions.forEach(c => {
              if (c.stats.hp > 0 && !c.isDead) {
                c.currentExp += exp;
              }
            });
            MountCombatService.distributeKillExpToMounts(nextCharState, exp);

            const normName = enemy.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
            if (nextCharState.mercenaryData?.activeQuests) {
                nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                    if ((q.type === 'Subjugation' || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                        return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                    }
                    return q;
                });
            }
            if (nextCharState.militaryData?.activeMissions) {
                nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                    if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                        return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                    }
                    return m;
                });
            }

            grantPartyRoleMastery(false);
            addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${enemy.name} 처치`);
        };
        
        // 1. 행동 가능 여부 먼저 판정 (지속시간 감소 전)
        let playerSkipTurn = false; 
        let playerCCName = "";
        nextCharState.statusEffects?.forEach(eff => { 
            if (["빙결", "기절", "마비", "수면", "소멸"].includes(eff.name)) { playerSkipTurn = true; playerCCName = eff.name; } 
            else if (eff.name === "감전" && Math.random() < 0.75) { playerSkipTurn = true; playerCCName = "감전"; } 
            else if (eff.name === "속박" && Math.random() < 0.75) { playerSkipTurn = true; playerCCName = "속박"; } 
            else if (eff.name === "혼란" && Math.random() < 0.5) { playerSkipTurn = true; playerCCName = "혼란"; }
        });

        const processTurnStartFor = (entity: any) => {
            const res = CombatUtils.processTurnStart(entity, entity.stats, entity.statusEffects);
            entity.statusEffects = res.activeEffects;
            
            const fStats = calculateFinalStats(entity).finalStats;
            if (res.hpHeal > 0) entity.stats.hp = Math.min(fStats.maxHp, entity.stats.hp + res.hpHeal);
            if (res.mpHeal > 0) entity.stats.mp = Math.min(fStats.maxMp, entity.stats.mp + res.mpHeal);
            if (res.dmg > 0) entity.stats.hp = Math.max(0, entity.stats.hp - res.dmg);
            
            totalLog += res.log;
            return res.dmg;
        };

        const applyPassiveEffects = (entity: Character | Companion) => {
            const res = CombatUtils.processPassiveTurnEffects(entity, simulationEnemies, nextCharState);
            totalLog += res.log;
            res.damageEvents.forEach(evt => {
                const enemy = simulationEnemies[evt.targetIndex];
                if (enemy && enemy.hp > 0) {
                    enemy.hp = Math.max(0, enemy.hp - evt.amount);
                    if (enemy.hp <= 0) {
                        const curBonuses = getRewardBonuses();
                        const rawExp = calculateMonsterExp(enemy); 
                        const rawGold = calculateMonsterGold(enemy);
                        const expMultiplier = curBonuses.expMultiplier || 1.0;
                        const goldMultiplier = curBonuses.goldMultiplier || 1.0;
                        const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * expMultiplier);
                        const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * goldMultiplier);
                        const loot = generateCombatLoot(enemy, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                        if (loot.length > 0) { 
                            if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                            } else {
                                totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                            }
                        }
                        totalLog += `\n[시스템] ${enemy.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
                        anyKill = true;
                        applyBestiaryUpdateInPlace(nextCharState, enemy.name, true);
                        applyCombatStyleExpForKill(nextCharState, enemy);
                        nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                        nextCharState.currentExp += exp;
                        nextCharState.companions.forEach(c => {
                          if (c.stats.hp > 0 && !c.isDead) {
                            c.currentExp += exp;
                          }
                        });
                        MountCombatService.distributeKillExpToMounts(nextCharState, exp);

                        const normName = enemy.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                        if (nextCharState.mercenaryData?.activeQuests) {
                            nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                if ((q.type === 'Subjugation' || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                                    return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                }
                                return q;
                            });
                        }
                        if (nextCharState.militaryData?.activeMissions) {
                            nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle'|| m.type === 'MilitaryPatrol'|| m.type === 'MilitaryDefense') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                    return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                }
                                return m;
                            });
                        }
                    }
                }
            })
        };

        // 2. 라운드 종료시에만 도트 데미지 및 지속시간 감쇠 처리
        if (isTurnEndAction) {
            if (isOneOnOne) {
                if (challengerCompanionId) {
                    const chalComp = nextCharState.companions.find(c => c.id === challengerCompanionId);
                    if (chalComp && chalComp.stats.hp > 0 && !chalComp.isDead) {
                        processTurnStartFor(chalComp);
                        applyPassiveEffects(chalComp);
                    }
                } else {
                    processTurnStartFor(nextCharState);
                    applyPassiveEffects(nextCharState);
                }
            } else {
                processTurnStartFor(nextCharState);
                CombatUtils.getAllCombatantCompanions(nextCharState).forEach(comp => { if (comp.stats.hp > 0 && !comp.isDead) processTurnStartFor(comp); });
                applyPassiveEffects(nextCharState);
                CombatUtils.getAllCombatantCompanions(nextCharState).forEach(comp => { if (comp.stats.hp > 0 && !comp.isDead) applyPassiveEffects(comp); });
            }

            simulationEnemies.forEach((enemy: Enemy, idx: number) => {
                if (enemy.hp > 0) {
                    const res = CombatUtils.processTurnStart(enemy, enemy.stats, enemy.statusEffects);
                    simulationEnemies[idx].statusEffects = res.activeEffects; totalLog += res.log;
                    simulationEnemies[idx].hp = Math.max(0, enemy.hp - res.dmg);
                    if (enemy.hp <= 0) {
                        const curBonuses = getRewardBonuses();
                        const rawExp = calculateMonsterExp(enemy); 
                        const rawGold = calculateMonsterGold(enemy);
                        const expMultiplier = curBonuses.expMultiplier || 1.0;
                        const goldMultiplier = curBonuses.goldMultiplier || 1.0;
                        const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * expMultiplier);
                        const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * goldMultiplier);
                        const loot = generateCombatLoot(enemy, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                        if (loot.length > 0) { 
                            if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                            } else {
                                totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                            }
                        }
                        totalLog += `\n[시스템] ${enemy.name} 처치! (EXP +${exp}, GOLD +${gold})`;
                        applyBestiaryUpdateInPlace(nextCharState, enemy.name, true);
                        applyCombatStyleExpForKill(nextCharState, enemy);
                        anyKill = true;
                        nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                        nextCharState.currentExp += exp;
                        nextCharState.companions.forEach(c => {
                          if (c.stats.hp > 0 && !c.isDead) {
                            c.currentExp += exp;
                          }
                        });
                        MountCombatService.distributeKillExpToMounts(nextCharState, exp);
                        
                        const normName = enemy.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                        if (nextCharState.mercenaryData?.activeQuests) {
                            nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                if ((q.type === 'Subjugation' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                                    return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                }
                                return q;
                            });
                        }
                        if (nextCharState.militaryData?.activeMissions) {
                            nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                if ((m.type === 'Subjugation' || m.type === 'DivineOracle' || m.type === 'Rescue') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                    return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                }
                                return m;
                            });
                        }
                    }
                }
            });
        }
        
        if ((isPlayerSkill || isBasicAttack || isDefense || isFlee) && playerSkipTurn) { 
            totalLog += `\n[시스템] ${nextCharState.name} 행동불가 (${playerCCName}) 상태이므로 도망치거나 행동할 수 없습니다.`; 
            playerActionDone = true; 
        }

        if (isFlee && !playerSkipTurn) {
            if (isOneOnOne) {
                totalLog += `\n[시스템] 정식 결투 중에는 동료의 개입이 금지됩니다.`;
                playerActionDone = true;
            } else {
                const livingEnemies = simulationEnemies.filter((e: Enemy) => e.hp > 0);
                const avgEnemyAgi = livingEnemies.reduce((sum: number, e: any) => sum + (e.stats?.agi || 10), 0) / (livingEnemies.length || 1);
                const fleeChance = Math.min(90, Math.max(10, 50 + (nextCharState.stats.agi - avgEnemyAgi) * 0.5));
                if (Math.random() * 100 < fleeChance) {
                    totalLog += `\n[시스템] 도주 성공! 현장을 벗어납니다.`;
                    const { updatedChar: finalChar, leveledUp, oldLevel, leveledUpCompanions } = checkAndApplyLevelUp(nextCharState);
                    if (leveledUp || leveledUpCompanions.length > 0) {
                        let message = "";
                        if (leveledUp) message += `${finalChar.name}이(가) 레벨 ${oldLevel}->${finalChar.level}이(가) 되었습니다! `;
                        if (leveledUpCompanions.length > 0) message += `${leveledUpCompanions.map(c => `${c.companion.name}(${c.oldLevel}->${c.companion.level})`).join(', ')}이(가) 레벨업했습니다!`;
                        setResultModalData({
                            type: 'levelup',
                            title: "레벨업!",
                            message: message,
                            items: []
                        });
                    }
                    setSceneType('normal');
                    setCombatState(prev => ({ ...prev, isEnded: true, log: [...prev.log, `[시스템] 도주 성공!`] }));
                    setCharacterSafe(finalChar);
                    setMessages(prev => [...prev, { role: 'ai', text: "적들의 추격을 따돌리고 무사히 도망쳤습니다." }]);
                    setIsLoading(false);
                    return;
                } else {
                    totalLog += `\n[시스템] 도주 실패! 적들의 포위망을 뚫지 못했습니다.`;
                    playerActionDone = true;
                }
            }
        }

        const applyAilmentWrapper = (skill: Skill, target: any, attackerStats: Stats) => {
            const ailmentRes = CombatUtils.checkAndApplyAilment(skill, target, attackerStats);
            if (ailmentRes.log) totalLog += ailmentRes.log;
            if (ailmentRes.appliedStatus) { if(!target.statusEffects) target.statusEffects = []; const existingIdx = target.statusEffects.findIndex((s: ActiveStatus) => s.name === ailmentRes.appliedStatus!.name); if (existingIdx >= 0) { target.statusEffects[existingIdx].duration = ailmentRes.appliedStatus.duration; if (ailmentRes.appliedStatus.val && (target.statusEffects[existingIdx].val || 0) < ailmentRes.appliedStatus.val) { target.statusEffects[existingIdx].val = ailmentRes.appliedStatus.val; } } else { target.statusEffects.push(ailmentRes.appliedStatus); } }
        };

        
        const normalizeStatKey = (raw: string): string | null => {
            if (!raw) return null;
            const clean = raw.replace(/[\[\]\(\)\{\}]/g, ' ').trim().toLowerCase();
            
            // Elemental damage / res check
            const elemRegex = /(화염계|해수계|뇌전계|질풍계|대지계|신성계|암흑계|화염|해수|뇌전|질풍|대지|신성|암흑|불|물|번개|바람|빛|어둠|모든\s*속성|원소)\s*(?:속성\s*)?(피해|저항|데미지|공격력|방어력|내성)/;
            const elemMatch = clean.match(elemRegex);
            if (elemMatch) {
                let el = elemMatch[1].replace(/\s+/g, '');
                if (!el.endsWith('계') && ['화염', '해수', '뇌전', '질풍', '대지', '신성', '암흑'].includes(el)) el += '계';
                if (el === '불') el = '화염계';
                if (el === '물') el = '해수계';
                if (el === '번개') el = '뇌전계';
                if (el === '바람') el = '질풍계';
                if (el === '빛') el = '신성계';
                if (el === '어둠') el = '암흑계';
                const type = (elemMatch[2].includes('저항') || elemMatch[2].includes('방어') || elemMatch[2].includes('내성')) ? '저항' : '피해';
                return `${el} ${type}`;
            }

            if (clean.includes('patk') || clean.includes('p.atk') || clean.includes('물리공격력') || clean.includes('물리 공격력') || clean.includes('물공') || clean.includes('물리공격')) return 'P.Atk';
            if (clean.includes('matk') || clean.includes('m.atk') || clean.includes('마법공격력') || clean.includes('마법 공격력') || clean.includes('마공') || clean.includes('마법공격')) return 'M.Atk';
            if (clean.includes('pdef') || clean.includes('p.def') || clean.includes('물리방어력') || clean.includes('물리 방어력') || clean.includes('물방') || clean.includes('물리방어')) return 'P.Def';
            if (clean.includes('mdef') || clean.includes('m.def') || clean.includes('마법방어력') || clean.includes('마법 방어력') || clean.includes('마방') || clean.includes('마법방어')) return 'M.Def';
            if (clean.includes('p.acc') || clean.includes('acc') || clean.includes('물리명중률') || clean.includes('물리 명중률') || clean.includes('물리명중') || clean.includes('명중률') || clean.includes('명중')) return 'Acc';
            if (clean.includes('m.acc') || clean.includes('macc') || clean.includes('마법명중률') || clean.includes('마법 명중률') || clean.includes('마법명중')) return 'MAcc';
            if (clean.includes('p.eva') || clean.includes('eva') || clean.includes('물리회피율') || clean.includes('물리 회피율') || clean.includes('물리회피') || clean.includes('회피율') || clean.includes('회피')) return 'Eva';
            if (clean.includes('m.eva') || clean.includes('meva') || clean.includes('마법회피율') || clean.includes('마법 회피율') || clean.includes('마법회피')) return 'MEva';
            if (clean.includes('maxhp') || clean.includes('최대hp') || clean.includes('최대 hp') || clean.includes('체력') || (clean.includes('hp') && !clean.includes('회복') && !clean.includes('피해'))) return 'MaxHP';
            if (clean.includes('maxmp') || clean.includes('최대mp') || clean.includes('최대 mp') || (clean.includes('mp') && !clean.includes('회복') && !clean.includes('마나 쉴드') && !clean.includes('소모'))) return 'MaxMP';
            if (clean.includes('str') || clean.includes('힘') || clean.includes('근력')) return 'STR';
            if (clean.includes('int') || clean.includes('지능')) return 'INT';
            if (clean.includes('wis') || clean.includes('지혜') || clean.includes('정신') || clean.includes('신앙')) return 'WIS';
            if (clean.includes('def') || clean.includes('방어') || clean.includes('방어력')) return 'DEF';
            if (clean.includes('agi') || clean.includes('민첩') || clean.includes('순발력') || clean.includes('속도')) return 'AGI';
            if (clean.includes('ctrl') || clean.includes('제어') || clean.includes('통제')) return 'CTRL';
            if (clean.includes('atk') || clean.includes('공격력') || clean.includes('공격')) return 'ATK';

            return null;
        };

        const applyStatDebuff = (skill: Skill, target: any, caster?: any) => {
            const rawFormula = skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '';
            if (!rawFormula && !(skill as any).debuffStat) return;
            const duration = CombatUtils.getSkillStatusDuration(skill, undefined, true);
            const skillLevel = skill.level || 1;
            const appliedList: { stat: string; val: number; text: string }[] = [];

            const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND || (skill as any).tier === '인연' || (skill as any).tier === '인연스킬')
                ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                : skill.tier;

            const isAttackSkillWithBuffSkill = isAttackSkillWithBuff(skill) || skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
            const baseDebuffScale = getTierBuffScale(effectiveTier);
            const debuffScaleBonus = (skill.finalEnhanceData?.debuffScaleBonus || 0) || (skill.finalEnhanceData?.buffScaleBonus || 0) || (() => {
                const match = skill.effectFormula?.match(/(?:버프|디버프) (?:비율 )?계수 증가 \+(\d+(?:\.\d+)?)%/);
                return match ? parseFloat(match[1]) : 0;
            })();
            const debuffScale = (isAttackSkillWithBuffSkill ? (baseDebuffScale * 0.5) : baseDebuffScale) + debuffScaleBonus;
            const debuffLevelGrowth = Math.max(0, skillLevel - 1) * debuffScale;

            if ((skill as any).debuffStat && (skill as any).debuffValue) {
                const stat = normalizeStatKey(String((skill as any).debuffStat));
                if (stat) {
                    const rawVal = +(Math.abs(Number((skill as any).debuffValue)) + debuffLevelGrowth).toFixed(1);
                    const totalValue = Math.min(90, rawVal);
                    appliedList.push({ stat, val: totalValue, text: `${stat} -${totalValue}%` });
                }
            }

            const cleanFormula = rawFormula
                .replace(/\[성공률:[^\]]*\]/g, '')
                .replace(/\(\d+턴\)/g, '')
                .replace(/\(Lv당\+[^\)]*\)/g, '');

            const clauses = cleanFormula.split(/[,;\n\[\]]+/);
            for (const rawClause of clauses) {
                const clause = rawClause.trim();
                if (!clause) continue;
                const match = clause.replace(/^Debuff:\s*|^디버프:\s*/i, '').match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:감소|하락|down))?/i);
                if (match) {
                    const rawStat = match[1];
                    const num = parseFloat(match[2]);
                    const stat = normalizeStatKey(rawStat);
                    if (stat && !appliedList.some(a => a.stat === stat)) {
                        const rawVal = +(Math.abs(num) + debuffLevelGrowth).toFixed(1);
                        const totalValue = Math.min(90, rawVal);
                        appliedList.push({ stat, val: totalValue, text: `${stat} -${totalValue}%` });
                    }
                }
            }

            const shatterLog = applyDebuffDefenseShatter(skill, target);
            if (shatterLog) {
                totalLog += `\n[시스템] ${shatterLog}`;
            }

            if (appliedList.length > 0) {
                if (!target.statusEffects) target.statusEffects = [];
                cleanUpBondSkillBuffIfBaseSkillUsed(target, skill.name, nextCharState.bondSkills);
                const desc = appliedList.map(a => a.text).join(', ');
                const skillElem = resolveSkillShinryokuType(skill, caster?.shinryokuType || nextCharState.shinryokuType);
                const { effectDesc, logNote } = applyBuffWithDiminishingPriority(
                    target,
                    skill.name,
                    desc,
                    duration,
                    appliedList[0].val,
                    {
                        imageUrl: skill.imageUrl,
                        icon: skill.icon || (skill as any).iconName,
                        skillElement: skillElem,
                        forceFullAura: isSkillAuraErosion(skill)
                    }
                );
                totalLog += `\n[시스템] ${target.name}에게 ${skill.name} 적용 (${effectDesc})${logNote}`;
            }

            const isDebuffZone = Boolean(skill.finalEnhanceData?.isBattlefieldZone) ||
                                 Boolean(skill.effectFormula?.includes('지속 전장 결계')) ||
                                 Boolean(skill.effectFormula?.includes('지속 전장 지대'));
            if (isDebuffZone && target && (target.hp > 0 || target.stats?.hp > 0)) {
                if (!target.statusEffects) target.statusEffects = [];
                const zoneDuration = Math.floor(Math.random() * 2) + 2;
                const estResult = calculateDamage(caster || nextCharState, target, { ...skill, type: SkillType.MAGIC, powerRatio: skill.powerRatio || 100 }, nextCharState);
                const dotVal = Math.max(1, Math.floor((estResult.damage || 50) * 0.20));
                target.statusEffects = target.statusEffects.filter((e: any) => e.name !== '지속 전장 결계');
                target.statusEffects.push({
                    name: '지속 전장 결계',
                    duration: zoneDuration,
                    effect: `매 턴 신력 결계 지속 피해 (-${dotVal})`,
                    val: dotVal,
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName
                });
                totalLog += `\n[시스템] ${target.name}에게 [지속 전장 결계] 형성! (랜덤 ${zoneDuration}턴간 지속 피해 -${dotVal})`;
            }
        };

        const applyStatBuff = (skill: Skill, target: any, caster?: any) => {
            const formula = skill.effectFormula || (skill as any).formulaOverride || (skill as any).formula || '';
            if (!formula && (!Array.isArray(skill.buffEffects) || skill.buffEffects.length === 0)) return;
            const duration = CombatUtils.getSkillStatusDuration(skill, undefined, true);
            const skillLevel = skill.level || 1;
            const appliedList: { stat: string; val: number; text: string }[] = [];
            let applied = false;

            const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND || (skill as any).tier === '인연' || (skill as any).tier === '인연스킬')
                ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                : skill.tier;

            const isAttackSkillWithBuffSkill = isAttackSkillWithBuff(skill) || skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
            const baseBuffScale = getTierBuffScale(effectiveTier);
            const buffScaleBonus = (skill.finalEnhanceData?.buffScaleBonus || 0) || (skill.finalEnhanceData?.debuffScaleBonus || 0) || (() => {
                const match = skill.effectFormula?.match(/(?:버프|디버프) (?:비율 )?계수 증가 \+(\d+(?:\.\d+)?)%/);
                return match ? parseFloat(match[1]) : 0;
            })();
            const buffScale = (isAttackSkillWithBuffSkill ? (baseBuffScale * 0.5) : baseBuffScale) + buffScaleBonus;
            const buffLevelGrowth = Math.max(0, skillLevel - 1) * buffScale;

            let effectiveBuffEffects = Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0
                ? skill.buffEffects
                : [];
            if (effectiveBuffEffects.length === 0 && isAttackSkillWithBuffSkill) {
                effectiveBuffEffects = extractAttackSkillBuffEffectsFromFormula(formula, skill);
            }
            const hasBuffEffects = effectiveBuffEffects.length > 0;

            // 0. buffEffects 객체 배열이 존재하는 경우 버프 적용
            if (hasBuffEffects) {
                effectiveBuffEffects.forEach(ef => {
                    if (ef.type === 'STAT_BOOST') {
                        const stat = ef.targetStat || 'STR';
                        const val = (ef.value || 10) + buffLevelGrowth;
                        const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                        appliedList.push({ stat, val, text: `${stat} +${formatted}%` });
                    } else if (ef.type === 'HP_RECOV') {
                        const casterFinal = caster ? calculateFinalStats(caster).finalStats : (target.stats || {});
                        const targetFinal = calculateFinalStats(target).finalStats;
                        const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
                        const totalPercent = (ef.value || 10) + buffLevelGrowth;
                        const healVal = Math.max(10, Math.floor((sumWisInt * 4) * (totalPercent / 100)));
                        if (target.stats) {
                            const currentHp = target.stats.hp || 0;
                            const maxHpVal = Math.max(target.stats.maxHp || 0, targetFinal.maxHp || 0, currentHp);
                            const newHp = currentHp + healVal;
                            let overheal = 0;
                            if (newHp > maxHpVal) {
                                overheal = newHp - maxHpVal;
                                target.stats.hp = maxHpVal;
                            } else {
                                target.stats.hp = newHp;
                            }

                            const hasOverhealShield = Boolean(
                                skill.finalEnhanceData?.overhealShield ||
                                skill.effectFormula?.includes('초과 치유 마나 보호막')
                            );

                            if (hasOverhealShield && overheal > 0) {
                                if (!target.statusEffects) target.statusEffects = [];
                                const existingShield = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
                                if (existingShield) {
                                    existingShield.val = (existingShield.val || 0) + overheal;
                                    existingShield.duration = duration;
                                    existingShield.effect = `피해를 흡수하는 마법 보호막 (${existingShield.val})`;
                                } else {
                                    target.statusEffects.push({
                                        name: '마나 쉴드',
                                        duration: duration,
                                        effect: `피해를 흡수하는 마법 보호막 (${overheal})`,
                                        val: overheal,
                                        isPassive: false,
                                        imageUrl: skill.imageUrl,
                                        icon: skill.icon || (skill as any).iconName
                                    });
                                }
                                totalLog += `\n[시스템: ${target.name} HP +${healVal - overheal} 회복 (초과 치유량 +${overheal} 마나 보호막 전환)]`;
                            } else {
                                totalLog += `\n[시스템: ${target.name} HP +${healVal} 회복! (시전자 WIS·INT 합산x4: ${sumWisInt * 4} 비례)]`;
                            }
                        }
                        applied = true;
                    } else if (ef.type === 'MP_RECOV') {
                        const isAoe = skill.targetType === 'aoe' || (skill as any).buffTargetType === 'aoe';
                        const isCaster = Boolean(caster && (target === caster || target.name === caster.name));
                        if (isAoe && isCaster) {
                            // 광역 MP 회복 스킬의 경우 시전자는 회복 대상에서 제외 (무한 자가 수급 방지)
                        } else {
                            const casterFinal = caster ? calculateFinalStats(caster).finalStats : (target.stats || {});
                            const targetFinal = calculateFinalStats(target).finalStats;
                            const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
                            const totalPercent = (ef.value || 10) + buffLevelGrowth;
                            const healVal = Math.max(5, Math.floor(sumWisInt * (totalPercent / 100)));
                            if (target.stats) {
                                const maxMpVal = Math.max(target.stats.maxMp || 0, targetFinal.maxMp || 0, target.stats.mp || 0);
                                target.stats.mp = Math.min(maxMpVal, (target.stats.mp || 0) + healVal);
                            }
                            totalLog += `\n[시스템: ${target.name} MP +${healVal} 회복! (시전자 WIS·INT 합산: ${sumWisInt} 비례)]`;
                            applied = true;
                        }
                    } else if (ef.type === 'ELEMENTAL_DMG_BOOST') {
                        const el = ef.targetElement || '속성';
                        const val = (ef.value || 10) + buffLevelGrowth;
                        const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                        appliedList.push({ stat: `${el} 피해`, val, text: `${el} 피해 +${formatted}%` });
                    } else if (ef.type === 'ELEMENTAL_RES_BOOST') {
                        const el = ef.targetElement || '속성';
                        const val = (ef.value || 10) + buffLevelGrowth;
                        const formatted = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
                        appliedList.push({ stat: `${el} 저항`, val, text: `${el} 저항 +${formatted}%` });
                    } else if (ef.type === 'MANA_SHIELD') {
                        const baseValue = ef.value || 20;
                        const ratio = baseValue + buffLevelGrowth;
                        const casterFinal = caster ? calculateFinalStats(caster).finalStats : (target.stats || {});
                        const shieldAmount = Math.floor((casterFinal.maxMp || 100) * (ratio / 100));
                        
                        if (!target.statusEffects) target.statusEffects = [];
                        const existing = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
                        if (existing) {
                            existing.val = Math.max(existing.val || 0, shieldAmount);
                            existing.duration = duration;
                            (existing as any).isPassive = false;
                            existing.effect = `피해를 흡수하는 마법 보호막 (${existing.val})`;
                            if (skill.imageUrl) existing.imageUrl = skill.imageUrl;
                            if (skill.icon || (skill as any).iconName) existing.icon = skill.icon || (skill as any).iconName;
                        } else {
                            target.statusEffects.push({
                                name: '마나 쉴드',
                                duration: duration,
                                effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`,
                                val: shieldAmount,
                                isPassive: false,
                                imageUrl: skill.imageUrl,
                                icon: skill.icon || (skill as any).iconName
                            });
                        }
                        totalLog += `\n[시스템] ${target.name}의 마나 쉴드 생성 (+${shieldAmount}) / ${skill.name}`;
                        applied = true;
                    } else if (ef.type === 'CLEANSE') {
                        const ailmentsToRemove = ef.ailments || (ef.ailment ? [ef.ailment] : []);
                        if (ailmentsToRemove.length > 0 && target.statusEffects) {
                            const initialLen = target.statusEffects.length;
                            target.statusEffects = filterDebuffsForCleanse(target.statusEffects, ailmentsToRemove);
                            if (target.statusEffects.length < initialLen) {
                                totalLog += `\n[시스템] ${target.name} 상태이상 해제 (${ailmentsToRemove.join(', ')}) / ${skill.name}`;
                                applied = true;
                            }
                        }
                    } else if (ef.type === 'RESURRECTION') {
                        if (target.stats && (target.stats.hp <= 0 || target.isDead)) {
                            const targetFinal = calculateFinalStats(target).finalStats;
                            const percent = ef.value || 50;
                            target.isDead = false;
                            target.stats.hp = Math.floor((targetFinal.maxHp || 100) * (percent / 100));
                            totalLog += `\n[시스템] ${target.name}이(가) ${skill.name} 효과로 부활했습니다 (HP ${percent}%)`;
                            applied = true;
                        }
                    }
                });
            } else {
                // 1. Preset BUFF tags
                if (formula.includes('BUFF:ATK_UP')) {
                    const val = +(20 + buffLevelGrowth).toFixed(1);
                    appliedList.push({ stat: 'P.Atk', val, text: `P.Atk +${val}%` });
                    appliedList.push({ stat: 'M.Atk', val, text: `M.Atk +${val}%` });
                }
                if (formula.includes('BUFF:DEF_UP')) {
                    const val = +(20 + buffLevelGrowth).toFixed(1);
                    appliedList.push({ stat: 'DEF', val, text: `DEF +${val}%` });
                }
                if (formula.includes('BUFF:AGI_UP')) {
                    const val = +(20 + buffLevelGrowth).toFixed(1);
                    appliedList.push({ stat: 'AGI', val, text: `AGI +${val}%` });
                }
                if (formula.includes('BUFF:ALL_UP')) {
                    const val = +(15 + buffLevelGrowth).toFixed(1);
                    ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL'].forEach(st => {
                        appliedList.push({ stat: st, val, text: `${st} +${val}%` });
                    });
                }

                // 2. Mana Shield
                const shieldMatch = formula.match(/(?:MANA_SHIELD|마나\s*쉴드)\s*[:\s]*(\d+)?%?/i);
                if ((shieldMatch || formula.includes('MANA_SHIELD') || formula.includes('마나 쉴드')) && caster) {
                    const baseValue = (shieldMatch && shieldMatch[1]) ? parseInt(shieldMatch[1]) : (skill.powerRatio || 20);
                    const ratio = +(baseValue + buffLevelGrowth).toFixed(1);
                    const casterFinal = calculateFinalStats(caster).finalStats;
                    const shieldAmount = Math.floor(casterFinal.maxMp * (ratio / 100));
                    
                    if (!target.statusEffects) target.statusEffects = [];
                    const existing = target.statusEffects.find((e: ActiveStatus) => e.name === '마나 쉴드');
                    if (existing) {
                        existing.val = Math.max(existing.val || 0, shieldAmount);
                        existing.duration = duration;
                        (existing as any).isPassive = false;
                        existing.effect = `피해를 흡수하는 마법 보호막 (${existing.val})`;
                        if (skill.imageUrl) existing.imageUrl = skill.imageUrl;
                        if (skill.icon || (skill as any).iconName) existing.icon = skill.icon || (skill as any).iconName;
                    } else {
                        target.statusEffects.push({
                            name: '마나 쉴드',
                            duration: duration,
                            effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`,
                            val: shieldAmount,
                            isPassive: false,
                            imageUrl: skill.imageUrl,
                            icon: skill.icon || (skill as any).iconName
                        });
                    }
                    totalLog += `\n[시스템] ${target.name}의 마나 쉴드 생성 (+${shieldAmount}) / ${skill.name}`;
                    applied = true;
                }

                // 3. Stat Boost percentages
                // 물리/마법 공격 + 버프 복합 스킬인 경우 공격 배율(P.Atk 600% 등)이 버프로 오인되지 않도록 [버프: ...] 블록만 추출
                let targetFormulaForBuff = formula;
                if (isAttackSkillWithBuffSkill) {
                    const buffBlockMatch = formula.match(/\[버프:\s*([^\]]+)\]/i);
                    targetFormulaForBuff = buffBlockMatch ? buffBlockMatch[1] : '';
                }

                const cleanFormula = targetFormulaForBuff
                    .replace(/\[성공률:[^\]]*\]/g, '')
                    .replace(/\(\d+턴\)/g, '')
                    .replace(/\(Lv당\+[^\)]*\)/g, '');

                const clauses = cleanFormula.split(/[,;\n\[\]]+/);
                for (const rawClause of clauses) {
                    const clause = rawClause.trim();
                    if (!clause || clause.includes('MANA_SHIELD') || clause.includes('회복') || clause.includes('해제') || clause.includes('RESURRECT')) continue;

                    const match = clause.match(/([^\d%]+?)\s*([+-]?\d+(?:\.\d+)?)\s*%(?:\s*(?:증가|상승|up))?/i);
                    if (match) {
                        const rawStat = match[1];
                        const num = parseFloat(match[2]);
                        const stat = normalizeStatKey(rawStat);
                        if (stat) {
                            const totalValue = Math.abs(num) + buffLevelGrowth;
                            const formatted = Number.isInteger(totalValue) ? totalValue : parseFloat(totalValue.toFixed(1));
                            appliedList.push({ stat, val: totalValue, text: `${stat} +${formatted}%` });
                        }
                    }
                }
            }

            const cleanseLog = applyBuffMassCleanse(skill, target);
            if (cleanseLog) {
                totalLog += `\n[시스템] ${cleanseLog}`;
                applied = true;
            }

            if (appliedList.length > 0) {
                if (!target.statusEffects) target.statusEffects = [];
                cleanUpBondSkillBuffIfBaseSkillUsed(target, skill.name, nextCharState.bondSkills);
                const desc = appliedList.map(a => a.text).join(', ');
                const skillElem = resolveSkillShinryokuType(skill, caster?.shinryokuType || nextCharState.shinryokuType);
                const iconInfo = {
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName,
                    skillElement: skillElem,
                    forceFullAura: isSkillAuraTranscend(skill)
                };
                const { effectDesc, logNote } = applyBuffWithDiminishingPriority(
                    target,
                    skill.name,
                    desc,
                    duration,
                    appliedList[0].val,
                    iconInfo
                );
                totalLog += `\n[시스템] ${target.name}에게 ${skill.name} 적용 (${effectDesc})${logNote}`;
                applied = true;
            }

            if (!applied && !totalLog.includes('HP') && !totalLog.includes('MP') && !totalLog.includes('상태이상 해제') && !totalLog.includes('부활') && !totalLog.includes('마나 쉴드')) {
                totalLog += `\n[시스템] ${target.name}에게 ${skill.name} 효과 적용`;
            }

            // [지속 회복 결계 (체력/마나 회복) 부여]
            if (skill.finalEnhanceData?.buffZoneType || skill.effectFormula?.includes('지속 회복 결계') || (skill.type === SkillType.BUFF && skill.finalEnhanceData?.isBattlefieldZone)) {
                const zoneType = skill.finalEnhanceData?.buffZoneType || (skill.effectFormula?.includes('MP') ? 'MP' : 'HP');
                const zoneName = zoneType === 'MP' ? '지속 마력 결계' : '지속 치유 결계';
                const effectDesc = zoneType === 'MP' ? '매 턴 MP 15% 회복' : '매 턴 HP 15% 회복';
                const zoneDuration = Math.floor(Math.random() * 2) + 2; // 2~3턴 랜덤

                if (!target.statusEffects) target.statusEffects = [];
                target.statusEffects = target.statusEffects.filter((e: any) => e.name !== '지속 치유 결계' && e.name !== '지속 마력 결계');
                target.statusEffects.push({
                    name: zoneName,
                    duration: zoneDuration,
                    effect: effectDesc,
                    val: 15,
                    imageUrl: skill.imageUrl,
                    icon: skill.icon || (skill as any).iconName
                });
                totalLog += `\n[시스템] ${target.name}에게 [${zoneName}] 형성! (랜덤 ${zoneDuration}턴간 ${effectDesc})`;
            }
        };


        const grantPartyRoleMastery = (isVictory: boolean) => {
            const processRole = (entity: Character | Companion) => {
                if (entity.stats.hp <= 0) return;
                if ('isDead' in entity && entity.isDead) return;

                const role = entity.battleRole;
                if (!role || role === BattleRole.NONE) return;

                if (!entity.roleInactivityDays) entity.roleInactivityDays = {};
                entity.roleInactivityDays[role] = 0; // 전투 참여로 미수행 일수 리셋 (역할 숙련도 유지)

                if (isVictory) {
                    if (!entity.roleProficiency) entity.roleProficiency = {};
                    const curProf = entity.roleProficiency[role] || 0;
                    if (curProf < 100) {
                        const newProf = Math.min(100, curProf + 1);
                        entity.roleProficiency[role] = newProf;
                        totalLog += `\n[전술: ${entity.name} | [${role}] 역할 숙련도 +1 실전 상승 (${newProf}/100)]`;
                        if (curProf < 100 && newProf >= 100) {
                            totalLog += `\n[전술] ${entity.name}이(가) 실전 전투를 통해 [${role}] 역할을 완벽히 마스터(100)했습니다!`;
                        }
                    }
                }
            };

            processRole(nextCharState);
            if (!isOneOnOne) {
                nextCharState.companions.forEach(processRole);
            }
        };

        const applyPostAttackMythicOptions = (attacker: any, target: any, targetIdx: number, damageResult: any, isTargetEnemy: boolean) => {
            const attackerDerived = getActorDerivedStats(attacker);
            const targetDerived = getActorDerivedStats(target);
            
            if (attackerDerived.mythicOptions.includes(MagyeOptionType.ABSORB)) {
                const absorbAmount = Math.floor(damageResult.damage * 0.30);
                if (absorbAmount > 0) {
                    const finalMaxHp = calculateFinalStats(attacker).finalStats.maxHp;
                    attacker.stats.hp = Math.min(finalMaxHp, attacker.stats.hp + absorbAmount);
                    totalLog += `\n[시스템] 마계 옵션 '흡수' 발동! HP를 ${absorbAmount} 회복했습니다.`;
                }
            }
            if (attackerDerived.mythicOptions.includes(MagyeOptionType.DEMONIZE)) {
                const finalMaxHp = calculateFinalStats(attacker).finalStats.maxHp;
                if (!attacker.statusEffects?.some((e: any) => e.name === '악마화') && attacker.stats.hp <= finalMaxHp * 0.5) {
                    if (!attacker.statusEffects) attacker.statusEffects = [];
                    attacker.statusEffects.push({ name: '악마화', duration: 5, effect: 'P.Atk +100%, M.Atk +100%, AGI +100%' });
                    totalLog += `\n[시스템] 마계 옵션 '악마화' 발동! ${attacker.name}이(가) 악마의 힘에 잠식됩니다.`;
                }
            }
            if (attackerDerived.mythicOptions.includes(MagyeOptionType.CURSE_SPREAD)) {
                if (isTargetEnemy && targetIdx >= 0 && simulationEnemies[targetIdx]) {
                    if (!simulationEnemies[targetIdx].statusEffects) simulationEnemies[targetIdx].statusEffects = [];
                    simulationEnemies[targetIdx].statusEffects.push({ name: '마계의 저주', duration: 2, effect: 'P.Def -50%, M.Def -50%' });
                } else {
                    if (!target.statusEffects) target.statusEffects = [];
                    target.statusEffects.push({ name: '마계의 저주', duration: 1, effect: 'P.Def -50%, M.Def -50%' });
                }
                if (!attacker.statusEffects) attacker.statusEffects = [];
                attacker.statusEffects.push({ name: '저주의 반동', duration: 1, effect: 'P.Def -20%, M.Def -20%' });
                totalLog += `\n[시스템] 마계 옵션 '저주 전파' 발동! 적과 자신에게 저주가 퍼집니다.`;
            }
            if (targetDerived.mythicOptions.includes(MythicOptionType.REFLECT) || targetDerived.mythicOptions.includes(MagyeOptionType.REFLECT)) {
                const reflectDmg = Math.floor(damageResult.damage * 0.3);
                if (reflectDmg > 0) {
                    attacker.stats.hp = Math.max(0, attacker.stats.hp - reflectDmg);
                    totalLog += `\n[시스템] ${target.name}의 신화 옵션 발동! 피해의 30%를 반사했습니다. (${attacker.name} HP -${reflectDmg})`;
                }
            }

            // [장비 부가 효과 상태이상 타격 판정: 출혈, 빙결 등]
            const equipAilmentLog = processEquipmentOnHit(attacker, target, damageResult);
            if (equipAilmentLog) {
                totalLog += equipAilmentLog;
            }
        };

        const executeSkill = (skill: Skill, caster: any, targets: any[]) => {
             const isRes = CombatUtils.isResurrectionSkill(skill);
             targets.forEach(t => {
             // 1. 부활 처리 (독립적으로 수행)
        if (isRes && (t.type === 'player' || t.type === 'companion')) {
            const hpMatch = skill.effectFormula.match(/RESURRECT\s*(\d+)%/i);
            const percent = hpMatch ? parseInt(hpMatch[1]) : 50;
            const entity = t.entity;
            if (entity.stats.hp <= 0 || entity.isDead) { // 죽은 경우에만 부활 처리
                const fStats = calculateFinalStats(entity).finalStats;
                entity.isDead = false;
                entity.stats.hp = Math.floor(fStats.maxHp * (percent / 100));
                totalLog += `\n[시스템] ${entity.name}이(가) ${skill.name} 효과로 부활했습니다 (HP ${percent}%) (by ${caster.name})`;
            }
        }

        // 2. 다른 효과 처리 (독립적으로 수행하여 부활과 버프가 같이 있을 경우 둘 다 실행되도록 함)
        if (skill.type === SkillType.DEBUFF && t.type === 'enemy') {
            const casterFinalStats = (caster && ('equipment' in caster || 'equipmentOptions' in caster)) ? calculateFinalStats(caster).finalStats : (caster?.stats || caster);
            const successRate = calculateDebuffSuccessRate(casterFinalStats, t.entity.stats, skill.level || 1, caster?.skills, skill.name);
            const roll = Math.random() * 100;
            if (roll < successRate) {
                applyStatDebuff(skill, t.entity, caster);
                const ailmentMatches = skill.effectFormula.matchAll(/\[([^\]]+?)\]/g);
                for (const match of ailmentMatches) {
                    const ailmentName = match[1].trim();
                    if (STATUS_AILMENTS_LIST.includes(ailmentName)) {
                        const ailmentData = STATUS_AILMENTS_DATA[ailmentName];
                        if (!t.entity.statusEffects) t.entity.statusEffects = [];
                        let duration = 3;
                        if (["빙결", "속박", "소멸", "혼란", "감전"].includes(ailmentName)) duration = 2;
                        let dotVal = calculateDotDamage(ailmentName, t.entity.maxHp || 100, t.entity.stats, casterFinalStats);
                        t.entity.statusEffects.push({ name: ailmentName, duration: duration, effect: ailmentData.desc, val: dotVal });
                        totalLog += `\n[시스템] ${t.entity.name} 상태이상 ${ailmentName} 걸림 (by ${caster.name})`;
                    }
                }
            } else { totalLog += `\n[시스템] ${skill.name} 실패! (${t.entity.name} 저항함)`; }
        }
                
                else if (t.type === 'enemy') {
                    const result = calculateDamage(caster, t.entity, skill, nextCharState);
                    const livingEnemyCount = simulationEnemies.filter(e => e && e.hp > 0).length;
                    const focusInfo = getFocusFusionDamageMultiplier(skill, livingEnemyCount);
                    if (focusInfo.multiplier > 1.0 && !result.isMiss) {
                        result.damage = Math.max(1, Math.floor(result.damage * focusInfo.multiplier));
                    }
                    
                    if (result.isMiss) {
                        if (skill.currentMastery && skill.currentMastery > 0) {
                            skill.currentMastery -= 1;
                        }
                        const escapeName = skill.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const mReg1 = new RegExp(`\\n\\[시스템:[^\\]]*?스킬\\s*숙련도[^\\]]*?${escapeName}[^\\]]*?\\]`, 'g');
                        const mReg2 = new RegExp(`\\n\\[시스템:[^\\]]*?${escapeName}[^\\]]*?스킬\\s*숙련도[^\\]]*?\\]`, 'g');
                        totalLog = totalLog.replace(mReg1, '').replace(mReg2, '');
                        totalLog += `\n[시스템] ${skill.name}이(가) 빗나갔습니다! (${t.entity.name} 회피) (by ${caster.name})`;
                    } else {
                        const shieldRes = CombatShieldService.processShieldAbsorption(t.entity, result.damage);
                        const remainingDamage = shieldRes.remainingDamage;
                        totalLog += shieldRes.totalLog;

                        const newHp = Math.max(0, t.entity.hp - remainingDamage);
                        simulationEnemies[t.idx] = { ...t.entity, hp: newHp };
                        if (remainingDamage > 0) totalLog += `\n[시스템: ${t.entity.name} HP -${remainingDamage}]${focusInfo.logTag} (by ${caster.name})`;
                        if (result.isCrit) totalLog += " (치명타!)";
                        if (result.affinityEffect) totalLog += result.affinityEffect;
                        
                        applyPostAttackMythicOptions(caster, t.entity, t.idx, result, true);
                        
                        if (result.additionalDamage && result.additionalDamage.length > 0) {
                            result.additionalDamage.forEach(ad => {
                                const postDmgHp = Math.max(0, simulationEnemies[t.idx].hp - ad.damage);
                                simulationEnemies[t.idx] = { ...simulationEnemies[t.idx], hp: postDmgHp };
                                totalLog += `\n${ad.log}`;
                            });
                        }

                        // [신력 여진: 시전 즉시 50% 추가 폭발 타격]
                        const aftershockInfo = getEchoAftershockDamage(skill, result.damage);
                        if (aftershockInfo.hasAftershock && simulationEnemies[t.idx] && simulationEnemies[t.idx].hp > 0) {
                            const afterHp = Math.max(0, simulationEnemies[t.idx].hp - aftershockInfo.aftershockDamage);
                            simulationEnemies[t.idx] = { ...simulationEnemies[t.idx], hp: afterHp };
                            totalLog += `\n[시스템: ${t.entity.name} HP -${aftershockInfo.aftershockDamage}] [💥 신력 여진 추가 폭발!] (by ${caster.name})`;
                        }

                        const casterFinalStats = (caster && ('equipment' in caster || 'equipmentOptions' in caster)) ? calculateFinalStats(caster).finalStats : (caster?.stats || caster);
                        applyAilmentWrapper(skill, t.entity, casterFinalStats);
                        if (isAttackSkillWithDebuff(skill) && simulationEnemies[t.idx].hp > 0) {
                            applyStatDebuff(skill, t.entity, caster);
                        }

                        // [지속 전장 결계 / 장판 2~3턴 랜덤 지속 피해 부여]
                        const isZoneSkill = Boolean(skill.finalEnhanceData?.isBattlefieldZone) || 
                                            Boolean(skill.effectFormula?.includes('지속 전장 결계')) ||
                                            Boolean(skill.effectFormula?.includes('지속 전장 지대'));

                        if (isZoneSkill && simulationEnemies[t.idx] && simulationEnemies[t.idx].hp > 0) {
                            if (!simulationEnemies[t.idx].statusEffects) simulationEnemies[t.idx].statusEffects = [];
                            const zoneDuration = Math.floor(Math.random() * 2) + 2; // 2~3턴 랜덤 결정
                            const dotVal = Math.max(1, Math.floor((result.damage || 10) * 0.20)); // 원래 스킬 데미지의 20% 지속 피해

                            const existingZoneIndex = simulationEnemies[t.idx].statusEffects.findIndex((e: any) => e.name === '지속 전장 결계');
                            if (existingZoneIndex >= 0) {
                                simulationEnemies[t.idx].statusEffects[existingZoneIndex] = {
                                    name: '지속 전장 결계',
                                    duration: zoneDuration,
                                    effect: `매 턴 신력 결계 지속 피해 (-${dotVal})`,
                                    val: dotVal,
                                    imageUrl: skill.imageUrl,
                                    icon: skill.icon || (skill as any).iconName
                                };
                                totalLog += `\n[시스템] ${t.entity.name}의 [지속 전장 결계]가 갱신되었습니다! (랜덤 ${zoneDuration}턴, 매 턴 -${dotVal})`;
                            } else {
                                simulationEnemies[t.idx].statusEffects.push({
                                    name: '지속 전장 결계',
                                    duration: zoneDuration,
                                    effect: `매 턴 신력 결계 지속 피해 (-${dotVal})`,
                                    val: dotVal,
                                    imageUrl: skill.imageUrl,
                                    icon: skill.icon || (skill as any).iconName
                                });
                                totalLog += `\n[시스템] ${t.entity.name}에게 [지속 전장 결계] 형성! (랜덤 ${zoneDuration}턴간 지속 피해 -${dotVal}) (by ${caster.name})`;
                            }
                        }
                        if (simulationEnemies[t.idx].hp <= 0) {
                            const revRes = CombatShieldService.processRevivalIfLethal(simulationEnemies[t.idx], simulationEnemies[t.idx].hp);
                            if (revRes.log) totalLog += revRes.log;
                        }
                        if (simulationEnemies[t.idx].hp <= 0) {
                            const curBonuses = getRewardBonuses();
                            const rawExp = calculateMonsterExp(t.entity); 
                            const rawGold = calculateMonsterGold(t.entity);
                            const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * (curBonuses.expMultiplier || 1.0));
                            const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * (curBonuses.goldMultiplier || 1.0));
                            const loot = generateCombatLoot(t.entity, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                            if (loot.length > 0) { 
                                if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                    nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                    loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                                } else {
                                    totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                                }
                            }
                            totalLog += `\n[시스템] ${t.entity.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
                            anyKill = true;
                            applyBestiaryUpdateInPlace(nextCharState, t.entity.name, true);
                            applyCombatStyleExpForKill(nextCharState, t.entity);
                            
                            nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                            nextCharState.currentExp += exp;
                            nextCharState.companions.forEach(c => {
                              if (c.stats.hp > 0 && !c.isDead) {
                                c.currentExp += exp;
                              }
                            });
                            MountCombatService.distributeKillExpToMounts(nextCharState, exp);

                            const normName = t.entity.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                            if (nextCharState.mercenaryData?.activeQuests) {
                                nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                    if ((q.type === 'Subjugation' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                   
                                        return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                    }
                                    return q;
                                });
                            }
                            if (nextCharState.militaryData?.activeMissions) {
                                nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                             if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                 
                                        return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                    }
                                    return m;
                                });
                            }

                            grantPartyRoleMastery(false);
                            addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${t.entity.name} 처치`);

                            if (t.entity.name.includes("문지기 케르베로스")) {
                                 if (nextCharState.inventory.length < calculateInventorySize(nextCharState.stats)) {
                                     const passItem: Item = {
                                        name: "제국의 통행증",
                                        type: "Etc",
                                        rarity: ItemRarity.LEGENDARY,
                                      description: "차원 너머 제국으로 향하는 패입니다.",
                                            enhancement: 0,
                                            imageUrl:"https://i.ibb.co/3mkbNjKq/Gemini-Generated-Image-fmssddfmssddfmss.png"
                                        };
                                     nextCharState.inventory.push(passItem);
                                     totalLog += `\n[시스템 전리품 획득! 제국의 통행증]`;
                                 } else {
                                     totalLog += `\n[시스템] 가방이 가득 차 제국의 통행증을 획득하지 못했습니다.`;
                                 }
                            }
                        }
                    }
                } else if (skill.type === SkillType.BUFF || skill.type === SkillType.HEAL) {
                    const isPositive = skill.type === SkillType.HEAL || skill.description.includes('회복') || skill.effectFormula.includes('HP') || skill.effectFormula.includes('MP') || skill.effectFormula.includes('HEAL') || skill.effectFormula.includes('RECOV');
                    if (isPositive) {
                        // [MODIFIED] 전투불능인 대상은 부활 스킬의 효과를 받는 경우가 아니면 회복 대상에서 제외
                        if (t.entity.stats.hp <= 0 && !isRes) return;

                        const hasBuffEffectsHeal = Array.isArray(skill.buffEffects) && skill.buffEffects.some(ef => ef.type === 'HP_RECOV' || ef.type === 'MP_RECOV');
                        if (!hasBuffEffectsHeal) {
                            const skillLevelBonus = (skill.level || 1) * 1;
                            const casterFinal = caster ? calculateFinalStats(caster).finalStats : (t.entity.stats || {});
                            const sumWisInt = Math.max(1, (casterFinal.wis || 0) + (casterFinal.int || 0));
                            const targetFinal = calculateFinalStats(t.entity).finalStats;
                            if ((skill.effectFormula && (skill.effectFormula.includes('HP') || skill.effectFormula.includes('HEAL') || skill.effectFormula.includes('RECOV') || skill.effectFormula.includes('회복'))) || skill.type === SkillType.HEAL) {
                                const regex = /(?:HP|MaxHP|HEAL|RECOV|회복)\s*(\d+)%/i;
                                const match = skill.effectFormula ? skill.effectFormula.match(regex) : null;
                                const hpRatio = match ? parseInt(match[1]) : (skill.powerRatio || 50);
                                const healAmount = Math.max(10, Math.floor((sumWisInt * 4) * (hpRatio + skillLevelBonus) / 100));
                                totalLog += `\n[시스템: ${t.entity.name} HP +${healAmount} 회복! / ${skill.name} 사용 (시전자 WIS·INT 합산x4: ${sumWisInt * 4} 비례)](by ${caster.name})`;
                                if (t.type === 'player') {
                                    const maxHpVal = Math.max(nextCharState.stats.maxHp || 0, targetFinal.maxHp || 0, nextCharState.stats.hp || 0);
                                    nextCharState.stats.hp = Math.min(maxHpVal, nextCharState.stats.hp + healAmount);
                                } else if (t.type === 'companion') {
                                    const targetComp = (t.idx !== undefined && t.idx >= 0 && nextCharState.companions[t.idx]) ? nextCharState.companions[t.idx] : t.entity;
                                    if (targetComp && targetComp.stats) {
                                        const maxHpVal = Math.max(targetComp.stats.maxHp || 0, targetFinal.maxHp || 0, targetComp.stats.hp || 0);
                                        targetComp.stats.hp = Math.min(maxHpVal, (targetComp.stats.hp || 0) + healAmount);
                                    }
                                }
                            }
                             // MP 회복도 동일한 원칙 적용
                            if (skill.effectFormula && skill.effectFormula.includes('MP') && (skill.effectFormula.includes('회복') || skill.effectFormula.includes('RECOV'))) {
                                // [MODIFIED] AOE MP 회복 스킬의 경우 시전자는 회복 대상에서 제외 (사기 방지)
                                const isCaster = Boolean(caster && (t.entity === caster || t.entity.name === caster.name));
                                if (skill.targetType === 'aoe' && isCaster) {
                                    // AOE인 경우 시전자는 회복 대상에서 제외
                                } else {
                                    const regex = /(?:MP|MaxMP)\s*(\d+)%/i;
                                    const match = skill.effectFormula.match(regex);
                                    const mpRatio = match ? parseInt(match[1]) : (skill.powerRatio || 50);
                                    const healAmount = Math.max(5, Math.floor(sumWisInt * (mpRatio + skillLevelBonus) / 100));
                                    totalLog += `\n[시스템: ${t.entity.name} MP +${healAmount} 회복! / ${skill.name} 사용 (시전자 WIS·INT 합산: ${sumWisInt} 비례)](by ${caster.name})`;
                                    if (t.type === 'player') {
                                        const maxMpVal = Math.max(nextCharState.stats.maxMp || 0, targetFinal.maxMp || 0, nextCharState.stats.mp || 0);
                                        nextCharState.stats.mp = Math.min(maxMpVal, nextCharState.stats.mp + healAmount);
                                    } else if (t.type === 'companion') {
                                        const targetComp = (t.idx !== undefined && t.idx >= 0 && nextCharState.companions[t.idx]) ? nextCharState.companions[t.idx] : t.entity;
                                        if (targetComp && targetComp.stats) {
                                            const maxMpVal = Math.max(targetComp.stats.maxMp || 0, targetFinal.maxMp || 0, targetComp.stats.mp || 0);
                                            targetComp.stats.mp = Math.min(maxMpVal, (targetComp.stats.mp || 0) + healAmount);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (t.entity.stats.hp > 0 || isRes) {
                   if (skill.effectFormula && skill.effectFormula.includes('상태이상 해제')) {
                        const match = skill.effectFormula.match(/상태이상 해제\((.+?)\)/);
                        if (match) {
                            const targetsToRemove = match[1].split(',').map(s => s.trim());
                            const successRate = calculateBuffSuccessRate(caster.stats);
                            const roll = Math.random() * 100;
                            if (roll < successRate) {
                                targetsToRemove.forEach(ailment => {
                                    const statusList = t.entity.statusEffects || [];
                                    const hasIt = statusList.find((s: ActiveStatus) => s.name === ailment);
                                    if (hasIt) { 
                                        totalLog += `\n[시스템: ${t.entity.name} 상태이상 해제 ${ailment} / ${skill.name} 사용](by ${caster.name})`; 
                                        // [FIX] 로컬 시뮬레이션 상에서 실제 statusEffects 배열에서 해제된 상태이상을 제거합니다.
                                        t.entity.statusEffects = filterDebuffsForCleanse(statusList, [ailment]);
                                    }
                                });
                            }
                        }
                    }
                    }
                    applyStatBuff(skill, t.entity, caster);
                }
            });
        };
      if (actionText.startsWith('[방어]')) {
            if (!playerSkipTurn) {
                if (!nextCharState.statusEffects) nextCharState.statusEffects = [];
                nextCharState.statusEffects = nextCharState.statusEffects.filter(e => e.name !== "방어 태세");
                nextCharState.statusEffects.push({
                    name: "방어 태세",
                    duration: 1,
                    effect: "받는 물리 및 마법 피해 50% 감소"
                });
                totalLog += `\n[시스템] ${nextCharState.name}이(가) 방어 자세를 취하며 적의 공세에 대비합니다.`;
                playerActionDone = true;
            }
        } else if (actionText.startsWith('[소환수 행동:')) {
            const summonMatch = actionText.match(/\[소환수 행동:\s*(.+?)\]\s*(?:스킬 사용:\s*(.+?)|일반 공격|공격)?\s*\(대상:\s*(.+?)(?:,\s*피해:\s*(\d+))?\)/);
            if (summonMatch) {
                const sName = summonMatch[1].trim();
                const skillOrActionName = summonMatch[2] ? summonMatch[2].trim() : '일반 공격';
                const targetEnemyName = summonMatch[3].trim();
                const customDmg = summonMatch[4] ? parseInt(summonMatch[4], 10) : 0;

                const isAoe = targetEnemyName === '전체 대상' || targetEnemyName === '전체';
                const targetEnemies = isAoe 
                    ? simulationEnemies.filter((e: Enemy) => e.hp > 0)
                    : [simulationEnemies.find((e: Enemy) => e.name === targetEnemyName && e.hp > 0) || simulationEnemies.find((e: Enemy) => e.hp > 0)].filter((e): e is Enemy => Boolean(e));

                if (targetEnemies.length > 0) {
                    targetEnemies.forEach((targetEnemy: Enemy) => {
                        const finalDmg = customDmg > 0 ? customDmg : Math.max(10, Math.floor(nextCharState.level * 10));
                        targetEnemy.hp = Math.max(0, targetEnemy.hp - finalDmg);
                        
                        const actionDesc = skillOrActionName !== '일반 공격' ? `스킬 [${skillOrActionName}]` : '일반 공격';
                        totalLog += `\n[시스템] 소환수 ${sName}이(가) ${targetEnemy.name}에게 ${actionDesc}(으)로 ${finalDmg}의 피해를 입혔습니다!`;

                        if (targetEnemy.hp <= 0) {
                            const curBonuses = getRewardBonuses();
                            const rawExp = calculateMonsterExp(targetEnemy);
                            const rawGold = calculateMonsterGold(targetEnemy);
                            const expMultiplier = curBonuses.expMultiplier || 1.0;
                            const goldMultiplier = curBonuses.goldMultiplier || 1.0;
                            const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * expMultiplier);
                            const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * goldMultiplier);
                            const loot = generateCombatLoot(targetEnemy, nextCharState.currentLocation?.nation, nextCharState);
                            accumulatedLoot.push(...loot);
                            if (loot.length > 0) {
                                if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                    nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                    loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; });
                                } else {
                                    totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                                }
                            }
                            totalLog += `\n[시스템] ${targetEnemy.name} 처치! (EXP +${exp}, GOLD +${gold})`;
                            anyKill = true;
                            applyBestiaryUpdateInPlace(nextCharState, targetEnemy.name, true);
                            applyCombatStyleExpForKill(nextCharState, targetEnemy);
                            nextCharState.money += gold;
                            accumulatedExp += exp;
                            accumulatedGold += gold;
                            nextCharState.currentExp += exp;
                            nextCharState.companions.forEach(c => {
                                if (c.stats.hp > 0 && !c.isDead) c.currentExp += exp;
                            });
                            MountCombatService.distributeKillExpToMounts(nextCharState, exp);
                        }
                    });
                }
            }
            playerActionDone = true;
        } else if (isCompanionCommand) {
            const commandMatch = actionText.match(/\[동료 (?:지시|행동|스킬):\s*(.+?)\]\s*(.+?)$/);
            let isChallenger = false;
            let companionIdx = -1;
            if (commandMatch) {
                const companionName = commandMatch[1].trim();
                companionIdx = nextCharState.companions.findIndex(c => c.name.trim() === companionName || c.name.includes(companionName) || companionName.includes(c.name));
                if (challengerCompanionId && companionIdx >= 0 && nextCharState.companions[companionIdx].id === challengerCompanionId) {
                    isChallenger = true;
                }
            }

            if (isOneOnOne && !isChallenger) {
                totalLog += `\n[시스템] 정식 결투 중에는 동료의 개입이 금지됩니다.`;
            } else {
                if (commandMatch) {
                    const companionName = commandMatch[1].trim(); 
                    const subCommand = commandMatch[2].trim();
                    const companionIdx = nextCharState.companions.findIndex(c => c.name.trim() === companionName || c.name.includes(companionName) || companionName.includes(c.name));
                    
                    if (companionIdx >= 0) {
                        const companion = nextCharState.companions[companionIdx]; 
                        
                        // 동료 행동불능 체크
                        let skipTurn = false; let ccName = ""; 
                        companion.statusEffects?.forEach(eff => { 
                            if (["빙결", "기절", "마비", "수면", "소멸"].includes(eff.name)) { skipTurn = true; ccName = eff.name; } 
                            else if (eff.name === "감전" && Math.random() < 0.75) { skipTurn = true; ccName = "감전"; } 
                            else if (eff.name === "속박" && Math.random() < 0.75) { skipTurn = true; ccName = "속박"; } 
                            else if (eff.name === "혼란" && Math.random() < 0.5) { skipTurn = true; ccName = "혼란"; } 
                        });

                        if (skipTurn) {
                            totalLog += `\n[시스템] ${companion.name} 행동불가 (${ccName})`;
                        } else {
                            actedCompanions.add(companion.id);
                            
                            if (subCommand === '방어 태세' || subCommand === '방어' || subCommand.startsWith('방어')) {
                                if (!companion.statusEffects) companion.statusEffects = [];
                                companion.statusEffects = companion.statusEffects.filter(e => e.name !== "방어 태세");
                                companion.statusEffects.push({
                                    name: "방어 태세",
                                    duration: 1,
                                    effect: "받는 물리 및 마법 피해 50% 감소"
                                });
                                totalLog += `\n[시스템] ${companion.name}이(가) 방패를 세우고 방어 태세를 갖춥니다.`;
                            } else if (subCommand.startsWith('일반 공격') || subCommand.startsWith('공격')) {
                                const targetMatch = subCommand.match(/(?:대상:\s*(.+?)\)?$)/);
                                const targetNameRaw = targetMatch ? targetMatch[1].trim() : null;
                                let target = targetNameRaw ? simulationEnemies.find(e => e.hp > 0 && (e.name === targetNameRaw || e.name.includes(targetNameRaw))) : null;
                                if (!target) {
                                    const living = simulationEnemies.filter(e => e.hp > 0);
                                    if (living.length > 0) target = living[Math.floor(Math.random() * living.length)];
                                }
                                if (target) {
                                    const compDerived = getActorDerivedStats(companion);
                                    const result = calculateDamage(companion, target, undefined, nextCharState);
                                    const targetIdx = simulationEnemies.indexOf(target);
                                    if (targetIdx >= 0) {
                                        if (result.isMiss) {
                                            totalLog += `\n[시스템] ${target.name}이(가) ${companion.name}의 공격을 회피했습니다! (MISS)`;
                                        } else {
                                            const attackCount = compDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK) ? 2 : 1;
                                            for (let i = 0; i < attackCount; i++) {
                                                const currentResult = i === 0 ? result : calculateDamage(companion, target, undefined, nextCharState);
                                                if (currentResult.isMiss) {
                                                    totalLog += `\n[시스템] ${target.name}이(가) ${companion.name}의 ${i+1}차 공격을 회피했습니다! (MISS)`;
                                                    continue;
                                                }
                                                 const newHp = Math.max(0, simulationEnemies[targetIdx].hp - currentResult.damage);
                                                simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: newHp };
                                                totalLog += `\n[시스템: ${target.name} HP -${currentResult.damage}] (by ${companion.name}${attackCount > 1 ? ` ${i+1}타` : ''})`;
                                                if (currentResult.isCrit) totalLog += " (치명타!)";
                                                applyPostAttackMythicOptions(companion, target, targetIdx, currentResult, true);
                                            }
                                            if (simulationEnemies[targetIdx].hp <= 0) {
                                                const revRes = CombatShieldService.processRevivalIfLethal(simulationEnemies[targetIdx], simulationEnemies[targetIdx].hp);
                                                if (revRes.log) totalLog += revRes.log;
                                            }
                                            if (simulationEnemies[targetIdx].hp <= 0 && target.hp > 0) {
                                                const curBonuses = getRewardBonuses();
                                                const rawExp = calculateMonsterExp(target); 
                                                const rawGold = calculateMonsterGold(target); 
                                                const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * (curBonuses.expMultiplier || 1.0));
                                                const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * (curBonuses.goldMultiplier || 1.0));
                                                const loot = generateCombatLoot(target, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                                                if (loot.length > 0) { 
                                                    if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                                        nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                                        loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                                                    } else {
                                                        totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                                                    }
                                                }
                                                totalLog += `\n[시스템] ${target.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
                                                anyKill = true;
                                                applyBestiaryUpdateInPlace(nextCharState, target.name, true);
                                                applyCombatStyleExpForKill(nextCharState, target);
                                                nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                                                nextCharState.currentExp += exp;
                                                nextCharState.companions.forEach(c => {
                                                  if (c.stats.hp > 0 && !c.isDead) {
                                                    c.currentExp += exp;
                                                  }
                                                });
                                                MountCombatService.distributeKillExpToMounts(nextCharState, exp);

                                                const normName = target.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                                                if (nextCharState.mercenaryData?.activeQuests) {
                                                    nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                                        if ((q.type === 'Subjugation' || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                                                            return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                                        }
                                                        return q;
                                                    });
                                                }
                                                if (nextCharState.militaryData?.activeMissions) {
                                                    nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                                        if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle' || m.type === 'BountyHunt' || m.type === 'MilitaryPatrol' || m.type === 'MilitaryDefense') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                                            return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                                        }
                                                        return m;
                                                    });
                                                }
                                                grantPartyRoleMastery(false);
                                                addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${target.name} 처치`);
                                            }
                                        }
                                    }
                                }
                            } else {
                                const skillNameMatch = subCommand.match(/(?:스킬 사용:\s*)?(.+?)(?:\s*\(대상:|\s*\[버프|$)/);
                                const cleanSubCommand = subCommand.replace(/\s*\[버프\s*대상:[^\]]*\]/gi, '').trim();
                                const targetMatch = cleanSubCommand.match(/(?:대상|Target):\s*(.+?)(?:\)\s*$|$)/i);
                                
                                if (skillNameMatch) {
                                    const skillName = skillNameMatch[1].trim(); 
                                    const targetNameRaw = targetMatch ? targetMatch[1].trim() : null;
                                    const compBondSkills = nextCharState.bondSkills?.filter(bs => bs.sourceId === companion.id || bs.companionId === companion.id) || [];
                                    const allCompSkills = getEntityAllCombatSkills(companion, compBondSkills);
                                    let skill = allCompSkills.find(s => s.name.trim() === skillName);
                                    if (!skill) {
                                        skill = allCompSkills.find(s => s.name.trim().includes(skillName) || skillName.includes(s.name.trim()));
                                    }
                                    if (!skill && companion.skills) {
                                        skill = companion.skills.find(s => s.name.trim() === skillName || s.name.trim().includes(skillName) || skillName.includes(s.name.trim()));
                                    }
                                    if (!skill && compBondSkills.length > 0) {
                                        skill = compBondSkills.find(s => s.name.trim() === skillName || s.id === skillName);
                                    }

                                    if (skill) {
                                        if (companion.stats.mp < skill.mpCost) { 
                                            totalLog += `\n[시스템] ${companion.name}의 마나가 부족하여 스킬을 사용할 수 없습니다.`; 
                                        } else {
                                            companion.stats.mp -= skill.mpCost;
                                            const skillMasteryMult = getSkillMasteryMultiplier(companion);
                                            const skillGain = Math.round(1 * skillMasteryMult);
                                            skill.currentMastery = (skill.currentMastery || 0) + skillGain;
                                            totalLog += `\n[시스템: ${companion.name} MP -${skill.mpCost}]`; 
                                            totalLog += `\n[시스템: ${companion.name} 스킬숙련도 ${skill.name} +${skillGain}]`;
                                            let targets: any[] = [];
                                            
                                            // 혼란 체크: 동료가 혼란 상태일 경우 타겟 변경
                                            let finalTargetName = targetNameRaw;
                                            if (companion.statusEffects?.some(e => e.name === "혼란") && Math.random() < 0.3) {
                                                const allies = [nextCharState.name, ...nextCharState.companions.map(c => c.name)];
                                                finalTargetName = allies[Math.floor(Math.random() * allies.length)];
                                                totalLog += `\n[시스템] ${companion.name}이(가) 혼란에 빠져 대상을 오인했습니다!`;
                                            }

                                            const isSupport = CompanionTacticsService.isSupportSkill(skill);
                                            const isAoe = CompanionTacticsService.isAoeTarget(finalTargetName, skill);

                                            if (isAoe) {
                                                if (isSupport) {
                                                    const isRes = CombatUtils.isResurrectionSkill(skill);
                                                    if (nextCharState.stats.hp > 0 || isRes) targets.push({ type: 'player', entity: nextCharState });
                                                    nextCharState.companions.forEach((c, i) => {
                                                        if (c.stats.hp > 0 || isRes) targets.push({ type: 'companion', idx: i, entity: c });
                                                    });
                                                } else {
                                                    simulationEnemies.forEach((e: Enemy, i: number) => { if (e.hp > 0) targets.push({ type: 'enemy', idx: i, entity: e }); });
                                                }
                                            } else if (!isSupport && (skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC || String(skill.type).includes('물리') || String(skill.type).includes('마법'))) {
                                                // 물리/마법 공격 스킬(공격+버프 복합 포함)은 반드시 적을 타겟팅
                                                let enemyIdx = -1;
                                                if (finalTargetName && finalTargetName !== '적군' && finalTargetName !== 'self' && finalTargetName !== '자신') {
                                                    const safeTargetName = finalTargetName.replace(/\)\s*$/, '').trim();
                                                    enemyIdx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0 && (e.name === safeTargetName || e.name.includes(safeTargetName) || safeTargetName.includes(e.name)));
                                                }
                                                if (enemyIdx < 0) {
                                                    enemyIdx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0);
                                                }
                                                if (enemyIdx >= 0) {
                                                    targets.push({ type: 'enemy', idx: enemyIdx, entity: simulationEnemies[enemyIdx] });
                                                }
                                            } else if (finalTargetName === 'self' || (!finalTargetName && (skill.targetType === 'self' || skill.targetType === 'ally' || skill.type === SkillType.BUFF))) {
                                                targets.push({ type: 'companion', idx: companionIdx, entity: companion });
                                            } else if (finalTargetName) {
                                                if (!isSupport) {
                                                    // 공격 및 디버프 스킬은 반드시 적을 타겟팅
                                                    let enemyIdx = -1;
                                                    if (finalTargetName !== '적군') {
                                                        const safeTargetName = finalTargetName.replace(/\)\s*$/, '').trim();
                                                        enemyIdx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0 && (e.name === safeTargetName || e.name.includes(safeTargetName) || safeTargetName.includes(e.name)));
                                                    }
                                                    if (enemyIdx < 0) {
                                                        enemyIdx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0);
                                                    }
                                                    if (enemyIdx >= 0) {
                                                        targets.push({ type: 'enemy', idx: enemyIdx, entity: simulationEnemies[enemyIdx] });
                                                    } else {
                                                        targets.push({ type: 'companion', idx: companionIdx, entity: companion });
                                                    }
                                                } else {
                                                    // 지원/회복 스킬
                                                    const safeTargetName = finalTargetName.replace(/\)\s*$/, '').trim();
                                                    const normPlayerName = nextCharState.name.replace(/\(자신\)/g, '').trim();
                                                    const normTarget = safeTargetName.replace(/\(자신\)/g, '').trim();

                                                    if (normTarget === normPlayerName || normTarget === 'player' || normTarget === '플레이어' || normTarget === '자신') {
                                                        targets.push({ type: 'player', entity: nextCharState });
                                                    } else {
                                                        const allyIdx = nextCharState.companions.findIndex(c => {
                                                            const normC = c.name.replace(/\(자신\)/g, '').trim();
                                                            return normC === normTarget || normC.includes(normTarget) || normTarget.includes(normC);
                                                        });
                                                        if (allyIdx >= 0) {
                                                            targets.push({ type: 'companion', idx: allyIdx, entity: nextCharState.companions[allyIdx] });
                                                        } else if (normTarget.includes(companion.name) || companion.name.includes(normTarget)) {
                                                            targets.push({ type: 'companion', idx: companionIdx, entity: companion });
                                                        } else {
                                                            targets.push({ type: 'player', entity: nextCharState });
                                                        }
                                                    }
                                                }
                                            } else {
                                                if (!isSupport) {
                                                    const livingEnemyIdx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0);
                                                    if (livingEnemyIdx >= 0) {
                                                        targets.push({ type: 'enemy', idx: livingEnemyIdx, entity: simulationEnemies[livingEnemyIdx] });
                                                    } else {
                                                        targets.push({ type: 'companion', idx: companionIdx, entity: companion });
                                                    }
                                                } else {
                                                    targets.push({ type: 'companion', idx: companionIdx, entity: companion });
                                                }
                                            }
                                            executeSkill(skill, companion, targets);

                                            // 동료가 공격 + 부가 버프 복합 스킬을 사용한 경우 아군에게 부가 버프 효과 적용
                                            if (isAttackSkillWithBuff(skill) && skill.type !== SkillType.BUFF && skill.type !== SkillType.HEAL) {
                                                if (skill.targetType === 'aoe' || isAoe) {
                                                    if (nextCharState.stats.hp > 0 && !nextCharState.isDead) {
                                                        applyStatBuff(skill, nextCharState, companion);
                                                    }
                                                    nextCharState.companions?.forEach(c => {
                                                        if (c.stats?.hp > 0 && !c.isDead) {
                                                            applyStatBuff(skill, c, companion);
                                                        }
                                                    });
                                                } else {
                                                    const buffMatch = subCommand.match(/\[버프\s*대상:\s*(.+?)\]/i) || subCommand.match(/버프:\s*(.+?)(?:\)|\]|$)/i);
                                                    const buffTargetName = buffMatch ? buffMatch[1].trim() : "";
                                                    let buffTargetEntity: any = companion;
                                                    if (buffTargetName) {
                                                        if (buffTargetName === nextCharState.name || buffTargetName === 'player' || buffTargetName === '플레이어') {
                                                            buffTargetEntity = nextCharState;
                                                        } else if (buffTargetName === 'self' || buffTargetName === '자신' || buffTargetName === companion.name) {
                                                            buffTargetEntity = companion;
                                                        } else {
                                                            const foundComp = nextCharState.companions?.find(c => c.name === buffTargetName);
                                                            if (foundComp) buffTargetEntity = foundComp;
                                                        }
                                                    }
                                                    applyStatBuff(skill, buffTargetEntity, companion);
                                                }
                                            }
                                        }
                                    } else {
                                        // 스킬을 찾지 못한 경우 일반 공격 fallback
                                        const livingEnemies = simulationEnemies.filter((e: Enemy) => e.hp > 0);
                                        const targetEnemy = livingEnemies[0];
                                        if (targetEnemy) {
                                            totalLog += `\n[시스템] ${companion.name}의 일반 공격`;
                                            const result = calculateDamage(companion, targetEnemy, undefined, nextCharState);
                                            targetEnemy.hp = Math.max(0, targetEnemy.hp - result.damage);
                                            totalLog += `\n[시스템: ${targetEnemy.name} HP -${result.damage}]`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            playerActionDone = true;
        } else if (isEnemyTurnAction) {
            const enemyTurnMatch = actionText.match(/\[적 (?:행동|턴):\s*(.+?)\]/);
            const actingEnemyName = enemyTurnMatch ? enemyTurnMatch[1].trim() : null;
            const enemy = actingEnemyName ? simulationEnemies.find(e => e.hp > 0 && (e.name === actingEnemyName || e.name.includes(actingEnemyName))) : simulationEnemies.find(e => e.hp > 0);
            
            if (enemy && enemy.hp > 0) {
                let skipTurn = false; let ccName = ""; 
                enemy.statusEffects?.forEach(eff => { 
                    if (["빙결", "기절", "마비", "수면", "소멸"].includes(eff.name)) { skipTurn = true; ccName = eff.name; } 
                    else if (eff.name === "감전" && Math.random() < 0.75) { skipTurn = true; ccName = "감전"; } 
                    else if (eff.name === "속박" && Math.random() < 0.75) { skipTurn = true; ccName = "속박"; } 
                    else if (eff.name === "혼란" && Math.random() < 0.5) { skipTurn = true; ccName = "혼란"; } 
                });
                
                if (skipTurn) { 
                    totalLog += `\n[시스템] ${enemy.name} 행동불가 (${ccName})`; 
                } else if (((currentCombat as any)?.suddenEventType === 'rift_crystal' || (enemy as any).isRiftCrystal) && (currentCombat?.turn || 1) >= 3 && Math.random() < 0.20) {
                    const fleeMsg = `[시스템] 🌌 ${enemy.name}이(가) 불안정하게 요동치더니 차원의 균열 너머로 도망쳤습니다!`;
                    setSceneType('normal');
                    setCombatState(prev => ({ ...prev, isEnded: true, log: [...prev.log, fleeMsg] }));
                    setCharacterSafe(nextCharState);
                    setMessages(prev => [...prev, { role: 'ai', text: fleeMsg }]);
                    setIsLoading(false);
                    return;
                } else {
                    let possibleTargets: { type: 'player' | 'companion' | 'enemy', ref: any }[] = [];
                    if (isOneOnOne) {
                        if (challengerCompanionId) {
                            const chalComp = nextCharState.companions.find(c => c.id === challengerCompanionId);
                            if (chalComp && chalComp.stats.hp > 0 && !chalComp.isDead) {
                                possibleTargets = [{ type: 'companion', ref: chalComp }];
                            }
                        } else {
                            if (nextCharState.stats.hp > 0 && !nextCharState.isDead) {
                                possibleTargets = [{ type: 'player', ref: nextCharState }];
                            }
                        }
                    } else {
                        if (nextCharState.stats.hp > 0 && !nextCharState.isDead) {
                            possibleTargets.push({ type: 'player', ref: nextCharState });
                        }
                        const livingCompanions = nextCharState.companions.filter(c => c.stats.hp > 0 && !c.isDead);
                        livingCompanions.forEach(c => possibleTargets.push({ type: 'companion', ref: c }));
                    }
                    
                    // 혼란 체크: 적군끼리 공격
                    if (enemy.statusEffects?.some(e => e.name === "혼란") && Math.random() < 0.3) {
                       const otherEnemies = simulationEnemies.filter(e => e.hp > 0 && e.name !== enemy.name);
                       if (otherEnemies.length > 0) {
                           possibleTargets = otherEnemies.map(e => ({ type: 'enemy', ref: e }));
                           totalLog += `\n[시스템] ${enemy.name}이(가) 혼란에 빠져 아군을 공격합니다!`;
                       }
                    }

                    if (possibleTargets.length > 0) {
                        const targetWeights = possibleTargets.map(t => {
                            const role = getEffectiveBattleRole(t.ref);
                            const pos = (t.ref as any).battlePosition as BattlePosition || { row: 1, col: 1 };
                            
                            let baseWeight = 3;
                            if (role === BattleRole.TANKER) baseWeight = 6;
                            else if (role === BattleRole.DEALER) baseWeight = 3;
                            else if (role === BattleRole.SUPPORTER) baseWeight = 1;

                            let rowMultiplier = 1.0;
                            if (pos.row === 0) rowMultiplier = 1.5;
                            else if (pos.row === 1) rowMultiplier = 1.0;
                            else if (pos.row === 2) rowMultiplier = 0.5;
                            
                            return baseWeight * rowMultiplier;
                        });

                        const totalWeight = targetWeights.reduce((sum, w) => sum + w, 0);
                        let random = Math.random() * totalWeight;
                        let targetSelectionIdx = 0;
                        for (let i = 0; i < targetWeights.length; i++) {
                            if (random < targetWeights[i]) {
                                targetSelectionIdx = i;
                                break;
                            }
                            random -= targetWeights[i];
                        }

                        const targetObj = possibleTargets[targetSelectionIdx]; 
                        const targetEntity = targetObj.ref as any;
                        if (targetEntity) {
                            let damageResult: { damage: number, isCrit: boolean, isMiss: boolean, affinityEffect: string, additionalDamage: { damage: number, log: string }[], attackerMythicOptions: (MythicOptionType | MagyeOptionType)[], targetMythicOptions: (MythicOptionType | MagyeOptionType)[] } = { damage: 0, isCrit: false, isMiss: false, affinityEffect: "", additionalDamage: [], attackerMythicOptions: [], targetMythicOptions: [] };
                            
                            // actionText에서 지정된 스킬 파싱
                            let matchedSkill = null;
                            const activeEnemySkills = (enemy.skills || []).filter(s => s.type !== SkillType.PASSIVE);
                            const skillMatch = actionText.match(/스킬:\s*(.+?)(?:\s*\(|$)/);
                            const isExplicitNormalAttack = actionText.includes('일반 공격') || actionText.includes('턴 진행');

                            if (skillMatch && activeEnemySkills.length > 0) {
                                const specifiedSkillName = skillMatch[1].trim();
                                matchedSkill = activeEnemySkills.find(s => s.name === specifiedSkillName);
                            } else if (!isExplicitNormalAttack && activeEnemySkills.length > 0) {
                                // actionText에 명시적 일반 공격 지정이 없는 백엔드 직접 판정의 경우
                                // 보스나 시련이라 하더라도 무조건 스킬이 아니라 50% 확률로 랜덤 결정
                                const skillProb = (enemy.isBoss || currentCombat?.type === 'final_trial_battle') ? 0.5 : 0.3;
                                if (Math.random() < skillProb) {
                                    matchedSkill = chooseEnemySkill(activeEnemySkills, enemy.isBoss);
                                }
                            }

                            // 공격 스킬 여부 우선 판별 (물리, 마법, 또는 피해 배율을 가진 직접 타격 스킬)
                            const isAttackSkill = matchedSkill && (
                                matchedSkill.type === SkillType.PHYSICAL || 
                                matchedSkill.type === SkillType.MAGIC || 
                                ((matchedSkill.powerRatio || 0) > 0 && matchedSkill.type !== SkillType.BUFF && matchedSkill.type !== SkillType.HEAL)
                            );

                            // 버프 또는 자가 회복 스킬 여부 확인 (공격 스킬이 아닐 때만 적용)
                            const isBuffOrHeal = matchedSkill && !isAttackSkill && (
                                matchedSkill.type === SkillType.BUFF || 
                                matchedSkill.type === SkillType.HEAL || 
                                matchedSkill.targetType === 'self' || 
                                matchedSkill.targetType === 'ally' || 
                                (matchedSkill.effectFormula && (matchedSkill.effectFormula.includes('BUFF') || matchedSkill.effectFormula.includes('RECOV') || matchedSkill.effectFormula.includes('HEAL') || matchedSkill.effectFormula.includes('회복')))
                            );

                            const isDebuff = matchedSkill && !isAttackSkill && (
                                matchedSkill.type === SkillType.DEBUFF ||
                                (matchedSkill.effectFormula && matchedSkill.effectFormula.toLowerCase().includes('debuff:'))
                            );

                            if (matchedSkill && isBuffOrHeal) {
                                totalLog += `\n[시스템] ${enemy.name}의 강화/보조 스킬 발동: ${matchedSkill.name}!`;
                                const buffTargets = matchedSkill.targetType === 'aoe' 
                                    ? simulationEnemies.filter(e => e.hp > 0)
                                    : [enemy];

                                buffTargets.forEach(tgt => {
                                    if (matchedSkill.effectFormula?.includes('RECOV') || matchedSkill.effectFormula?.includes('HEAL') || matchedSkill.type === SkillType.HEAL) {
                                        const enemyFinal = calculateFinalStats(enemy).finalStats;
                                        const sumWisInt = Math.max(1, (enemyFinal.wis || 0) + (enemyFinal.int || 0));
                                        const ratio = (matchedSkill.powerRatio && matchedSkill.powerRatio > 5) ? (matchedSkill.powerRatio / 100) : (matchedSkill.powerRatio || 0.5);
                                        const healAmount = Math.max(50, Math.round((sumWisInt * 4) * ratio));
                                        tgt.hp = Math.min(tgt.maxHp, tgt.hp + healAmount);
                                        totalLog += `\n[시스템] ${tgt.name}이(가) 체력을 ${healAmount} 회복했습니다! (${tgt.hp}/${tgt.maxHp})`;
                                    }
                                    const res = CombatUtils.checkAndApplyAilment(matchedSkill, tgt, enemy.stats || { ctrl: 10 } as Stats);
                                    if (res.log) totalLog += res.log;
                                    if (res.appliedStatus) {
                                        if (!tgt.statusEffects) tgt.statusEffects = [];
                                        tgt.statusEffects.push(res.appliedStatus);
                                    }
                                    applyStatBuff(matchedSkill, tgt, enemy);
                                });
                            } else if (matchedSkill && isDebuff) {
                                totalLog += `\n[시스템] ${enemy.name}의 약화/디버프 스킬 발동: ${matchedSkill.name}!`;
                                const debuffTargets = matchedSkill.targetType === 'aoe'
                                    ? possibleTargets.filter(t => (t.ref as any)?.stats?.hp > 0 || (t.type === 'player' && nextCharState.stats.hp > 0))
                                    : [targetObj];

                                debuffTargets.forEach(tObj => {
                                    const tgt = tObj.ref as any;
                                    if (tgt) {
                                        const successRate = calculateDebuffSuccessRate(enemy.stats || { ctrl: 10 } as Stats, tgt.stats || { ctrl: 10 } as Stats, matchedSkill.level || 1);
                                        const roll = Math.random() * 100;
                                        if (roll < successRate) {
                                            applyStatDebuff(matchedSkill, tgt, enemy);
                                            const res = CombatUtils.checkAndApplyAilment(matchedSkill, tgt, enemy.stats || { ctrl: 10 } as Stats);
                                            if (res.log) totalLog += res.log;
                                            if (res.appliedStatus) {
                                                if (!tgt.statusEffects) tgt.statusEffects = [];
                                                tgt.statusEffects.push(res.appliedStatus);
                                            }
                                        } else {
                                            totalLog += `\n[시스템] ${tgt.name}이(가) ${enemy.name}의 ${matchedSkill.name} 효과를 저항했습니다! (RESIST)`;
                                        }
                                    }
                                });
                            } else {
                                const isEnemyAoeAttack = !!matchedSkill && isEnemyAoeSkill(matchedSkill);
                                const targetsToAttack = isEnemyAoeAttack ? possibleTargets : [targetObj];

                                if (isEnemyAoeAttack) {
                                    totalLog += `\n[시스템] ${enemy.name}의 광역 스킬 발동: ${matchedSkill.name}! 전원의 아군을 타격합니다!`;
                                } else if (matchedSkill) {
                                    totalLog += `\n[시스템] ${enemy.name}의 스킬 발동: ${matchedSkill.name}!`;
                                } else {
                                    totalLog += `\n[시스템] ${enemy.name}의 일반 공격!`;
                                }

                                if (!isBuffOrHeal && !isDebuff) {
                                    targetsToAttack.forEach(tObj => {
                                        const curTarget = tObj.ref as any;
                                        if (!curTarget || curTarget.hp <= 0 || (curTarget.stats && curTarget.stats.hp <= 0)) return;

                                        const curDamageResult = calculateDamage(enemy, curTarget, matchedSkill || undefined, nextCharState);
                                        if (matchedSkill) {
                                            const res = CombatUtils.checkAndApplyAilment(matchedSkill, curTarget, enemy.stats || { ctrl: 10 } as Stats);
                                            if (res.log) totalLog += res.log;
                                            if (res.appliedStatus) { if (!curTarget.statusEffects) curTarget.statusEffects = []; curTarget.statusEffects.push(res.appliedStatus); }
                                            if (matchedSkill.effectFormula && matchedSkill.effectFormula.includes('-')) {
                                                applyStatDebuff(matchedSkill, curTarget, enemy);
                                            }
                                        }

                                        if (curDamageResult.isMiss) {
                                            totalLog += `\n[시스템] ${curTarget.name}이(가) ${enemy.name}의 공격을 회피했습니다!`;
                                        } else {
                                            let dmg = adjustEnemyDamageForAoe(curDamageResult.damage, isEnemyAoeAttack);
                                            if ((curDamageResult as any).isNullified) {
                                                dmg = 0;
                                                totalLog += `\n[시스템] ${curTarget.name}의 신화 옵션 발동! 피해를 무효화했습니다.`;
                                            }

                                            const shieldRes = CombatShieldService.processShieldAbsorption(curTarget, dmg);
                                            dmg = shieldRes.remainingDamage;
                                            totalLog += shieldRes.totalLog;

                                            if (tObj.type === 'player') {
                                                nextCharState.stats.hp = Math.max(0, nextCharState.stats.hp - dmg);
                                                if (dmg > 0) totalLog += `\n[시스템: ${nextCharState.name} HP -${dmg}] (by ${enemy.name})`;
                                            } else if (tObj.type === 'companion') {
                                                const cIdx = nextCharState.companions.findIndex(c => c.id === (curTarget as Companion).id);
                                                if (cIdx >= 0) {
                                                    nextCharState.companions[cIdx].stats.hp = Math.max(0, nextCharState.companions[cIdx].stats.hp - dmg);
                                                    if (dmg > 0) totalLog += `\n[시스템: ${nextCharState.companions[cIdx].name} HP -${dmg}] (by ${enemy.name})`;
                                                }
                                            } else if (tObj.type === 'enemy') {
                                                curTarget.hp = Math.max(0, curTarget.hp - dmg);
                                                if (dmg > 0) totalLog += `\n[시스템: ${curTarget.name} HP -${dmg}] (by ${enemy.name})`;
                                            }

                                            if (curDamageResult.isCrit) totalLog += " (치명타!)";
                                            if (curDamageResult.affinityEffect) totalLog += curDamageResult.affinityEffect;

                                            applyPostAttackMythicOptions(enemy, curTarget, -1, curDamageResult, false);
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            playerActionDone = true;
        } else if (isBondSkill) {
            const bsIdMatch = actionText.match(/\[인연 스킬\]\s*([^\s(]+)/);
            const targetMatch = actionText.match(/\(대상:\s*(.+?)\)/);
            
            if (bsIdMatch) {
                const bsId = bsIdMatch[1].trim();
                const usedSkill = nextCharState.bondSkills?.find(s => s.id === bsId || s.name === bsId);
                if (usedSkill) {
                    const companion = nextCharState.companions.find(c => c.id === usedSkill.companionId);
                    const sourceComp = usedSkill.sourceId ? nextCharState.companions.find(c => c.id === usedSkill.sourceId) : null;
                    const player = nextCharState;
                    const cost = Math.max(0, usedSkill.mpCost || mpCost || 0);

                    // 1. 전투불능 체크 (플레이어가 참여한 인연 스킬일 때만 플레이어 전투불능 검사)
                    if (!sourceComp && (player.stats.hp <= 0 || player.isDead)) {
                        setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${player.name}이(가) 전투불능 상태라 인연 스킬을 사용할 수 없습니다.` }]);
                        setIsLoading(false);
                        return;
                    }
                    if (!companion || companion.stats.hp <= 0 || companion.isDead) {
                        setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${companion?.name || '동료'}가 전투불능 상태라 인연 스킬을 사용할 수 없습니다.` }]);
                        setIsLoading(false);
                        return;
                    }
                    if (sourceComp && (sourceComp.stats.hp <= 0 || sourceComp.isDead)) {
                        setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${sourceComp.name}이(가) 전투불능 상태라 인연 스킬을 사용할 수 없습니다.` }]);
                        setIsLoading(false);
                        return;
                    }

                    // 2. 마력 체크
                    const sourceEntity = sourceComp || player;
                    if ((sourceEntity.stats.mp || 0) < cost) {
                        setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${sourceEntity.name}의 마력이 부족하여 인연 스킬을 사용할 수 없습니다.` }]);
                        setIsLoading(false);
                        return;
                    }
                    if ((companion.stats.mp || 0) < cost) {
                        setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${companion.name}의 마력이 부족하여 인연 스킬을 사용할 수 없습니다.` }]);
                        setIsLoading(false);
                        return;
                    }

                    // 3. 마력 소모 (시전자 및 인연인 양측 차감)
                    const playerDerived = getActorDerivedStats(nextCharState);
                    const compDerived = getActorDerivedStats(companion);
                    const sourceDerived = sourceComp ? getActorDerivedStats(sourceComp) : playerDerived;
                    
                    const sourceInfMana = (sourceDerived.mythicOptions.includes(MythicOptionType.INFINITE_MANA) || sourceDerived.mythicOptions.includes(MagyeOptionType.INFINITE_MANA)) && sourceEntity.stats.hp <= calculateFinalStats(sourceEntity).finalStats.maxHp * 0.5;
                    const compInfMana = (compDerived.mythicOptions.includes(MythicOptionType.INFINITE_MANA) || compDerived.mythicOptions.includes(MagyeOptionType.INFINITE_MANA)) && companion.stats.hp <= calculateFinalStats(companion).finalStats.maxHp * 0.5;
                    
                    const sourceCost = sourceInfMana ? 0 : cost;
                    const compCost = compInfMana ? 0 : cost;

                    sourceEntity.stats.mp = Math.max(0, (sourceEntity.stats.mp || 0) - sourceCost);
                    companion.stats.mp = Math.max(0, (companion.stats.mp || 0) - compCost);

                    totalLog += `\n[인연 스킬 발동!] ${usedSkill.name}!! (${sourceEntity.name} 마력 -${sourceCost}, ${companion.name} 마력 -${compCost})`;
                    totalLog += `\n[시스템: ${player.name} 인연스킬 숙련도 ${usedSkill.name} +1]`;
                    CombatUtils.updateBondSkillMastery(nextCharState, usedSkill.name);
                    
                    // [NEW] Mythic Option: MANA_SHIELD (마나쉴드 자동 생성)
                    if (playerDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                        const shieldAmount = Math.floor(calculateFinalStats(nextCharState).finalStats.maxMp * 0.1);
                        if (!nextCharState.statusEffects) nextCharState.statusEffects = [];
                        const existingShield = nextCharState.statusEffects.find(e => e.name === '마나 쉴드');
                        if (!existingShield) {
                            nextCharState.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                            totalLog += `\n[시스템] ${nextCharState.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                        }
                    }
                    
                    // 동료도 마나쉴드 적용
                    if (compDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                        const shieldAmount = Math.floor(calculateFinalStats(companion).finalStats.maxMp * 0.1);
                        if (!companion.statusEffects) companion.statusEffects = [];
                        const existingShield = companion.statusEffects.find(e => e.name === '마나 쉴드');
                        if (!existingShield) {
                            companion.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                            totalLog += `\n[시스템] ${companion.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                        }
                    }
                    
                    // 4. 행동 완료 처리 (플레이어 및 참여 동료 모두)
                    playerActionDone = true;
                    actedCompanions.add(usedSkill.companionId);
                    if (usedSkill.sourceId) {
                        actedCompanions.add(usedSkill.sourceId);
                    }
                    
                    (nextCharState as any)._resetBondGaugeId = usedSkill.id;

                    // [NEW] 융합 유형 판별
                    const t1 = (usedSkill as any).playerSkillType;
                    const t2 = (usedSkill as any).companionSkillType;
                    const isAttackType = (t: any) => {
                        if (!t) return true;
                        const s = String(t).trim();
                        return s === 'PHYSICAL' || s === 'MAGIC' || s === 'HEAL' || s === 'SUMMON' || s === 'CLONE' ||
                               s === '물리 공격' || s === '마법 공격' || s === '물리공격' || s === '마법공격' ||
                               s === '회복' || s === '소환' || s === '분신' || s === '공격' || s === '물리' || s === '마법';
                    };
                    const isBuffType = (t: any) => {
                        if (!t) return false;
                        const s = String(t).trim();
                        return s === 'BUFF' || s === '버프';
                    };
                    const isDebuffType = (t: any) => {
                        if (!t) return false;
                        const s = String(t).trim();
                        return s === 'DEBUFF' || s === '디버프';
                    };

                    const isAttackBuffCombo = (isAttackType(t1) && isBuffType(t2)) || (isBuffType(t1) && isAttackType(t2));
                    const isAttackDebuffCombo = (isAttackType(t1) && isDebuffType(t2)) || (isDebuffType(t1) && isAttackType(t2));
                    const isBuffBuffCombo = isBuffType(t1) && isBuffType(t2);
                    const isDebuffDebuffCombo = isDebuffType(t1) && isDebuffType(t2);

                    const addCombatStatusEffect = (target: any, name: string, effect: string, duration: number) => {
                        if (!target.statusEffects) target.statusEffects = [];
                        const clean = (n: string) => n ? n.replace(/\(융합\)/g, "").replace(/의\s*(신성\s*공명|저주\s*각인|투지|약화)/g, "").trim() : "";
                        const baseNew = clean(name);
                        const existingIdx = target.statusEffects.findIndex((e: any) => e && clean(e.name) === baseNew);
                        if (existingIdx >= 0) {
                            target.statusEffects[existingIdx] = {
                                ...target.statusEffects[existingIdx],
                                name: name,
                                duration: duration,
                                effect: effect
                            };
                        } else {
                            target.statusEffects.push({ name, duration, effect, val: 0 });
                        }
                    };

                    if (isBuffBuffCombo) {
                        // 버프 + 버프: 아군 전원 강화 (피해 없음) - BondSkillService 연동
                        const res = executeBondSkillUtility(usedSkill, nextCharState, companion, sourceComp, simulationEnemies, targetMatch, addCombatStatusEffect);
                        totalLog += res.log;
                    } else if (isDebuffDebuffCombo) {
                        // 디버프 + 디버프: 적 전원 무력화 (피해 없음) - BondSkillService 연동
                        const res = executeBondSkillUtility(usedSkill, nextCharState, companion, sourceComp, simulationEnemies, targetMatch, addCombatStatusEffect);
                        totalLog += res.log;
                    } else {
                        // 대미지 가하는 유형 (공격+공격, 공격+버프, 공격+디버프)
                        if (usedSkill.targetType === 'single' && targetMatch) {
                            const targetName = targetMatch[1].trim();
                            const enemyIdx = simulationEnemies.findIndex(e => e.name === targetName && e.hp > 0);
                            if (enemyIdx !== -1) {
                                const enemy = simulationEnemies[enemyIdx];
                                const result = calculateDamage(nextCharState, enemy, usedSkill, nextCharState);
                                const newHp = Math.max(0, enemy.hp - result.damage);
                                simulationEnemies[enemyIdx] = { ...enemy, hp: newHp };
                                totalLog += `\n[시스템: ${enemy.name} HP -${result.damage}]`;
                                
                                applyPostAttackMythicOptions(nextCharState, enemy, enemyIdx, result, true);
                                if (result.isCrit) totalLog += " (치명타!)";
                                if (result.isMiss) totalLog += " (빗나감!)";

                                if (newHp <= 0 && enemy.hp > 0) {
                                    handleEnemyKillReward(enemy);
                                }
                            } else {
                                totalLog += `\n[시스템] ${targetName}을(를) 찾을 수 없습니다.`;
                            }
                        } else {
                            // AoE or no target specified
                            simulationEnemies.forEach((enemy, idx) => {
                                if (enemy.hp <= 0) return;
                                const result = calculateDamage(nextCharState, enemy, usedSkill, nextCharState);
                                const newHp = Math.max(0, enemy.hp - result.damage);
                                simulationEnemies[idx] = { ...enemy, hp: newHp };
                                totalLog += `\n[시스템: ${enemy.name} HP -${result.damage}]`;
                                
                                applyPostAttackMythicOptions(nextCharState, enemy, idx, result, true);
                                if (result.isCrit) totalLog += " (치명타!)";
                                if (result.isMiss) totalLog += " (빗나감!)";

                                if (newHp <= 0) {
                                    handleEnemyKillReward(enemy);
                                }
                            });
                        }

                        // 추가적인 유틸 효과 부여 - BondSkillService 연동
                        const res = executeBondSkillUtility(usedSkill, nextCharState, companion, sourceComp, simulationEnemies, targetMatch, addCombatStatusEffect);
                        totalLog += res.log;
                    }

                    if (!playerActionDone) {
                        const livingEnemies = simulationEnemies.filter((e: Enemy) => e.hp > 0);
                        if (livingEnemies.length > 0) {
                            const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                            const result = calculateDamage(nextCharState, target, undefined, nextCharState);
                            const targetIdx = simulationEnemies.indexOf(target);
                            if (targetIdx >= 0) {
                                if (result.isMiss) {
                                    totalLog += `\n[시스템] ${target.name}이(가) ${nextCharState.name}의 공격을 회피했습니다! (MISS)`;
                                } else {
                                    const playerDerived = getActorDerivedStats(nextCharState);
                                    const attackCount = playerDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK) ? 2 : 1;
                                    
                                    for (let i = 0; i < attackCount; i++) {
                                        const currentResult = i === 0 ? result : calculateDamage(nextCharState, target, undefined, nextCharState);
                                        if (currentResult.isMiss) {
                                            totalLog += `\n[시스템] ${target.name}이(가) ${nextCharState.name}의 ${i+1}차 공격을 회피했습니다! (MISS)`;
                                            continue;
                                        }
                                        const newHp = Math.max(0, simulationEnemies[targetIdx].hp - currentResult.damage);
                                        simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: newHp };
                                        totalLog += `\n[일반 공격] ${nextCharState.name}이(가) ${target.name}을(를) 공격!${attackCount > 1 ? ` (${i+1}타)` : ''}`;
                                        totalLog += `\n[시스템: ${target.name} HP -${currentResult.damage}]`;
                                        if (currentResult.isCrit) totalLog += " (치명타!)";
                                        
                                        applyPostAttackMythicOptions(nextCharState, target, targetIdx, currentResult, true);

                                        if (currentResult.additionalDamage && currentResult.additionalDamage.length > 0) {
                                            currentResult.additionalDamage.forEach(ad => {
                                                const postDmgHp = Math.max(0, simulationEnemies[targetIdx].hp - ad.damage);
                                                simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: postDmgHp };
                                                totalLog += `\n${ad.log}`;
                                            });
                                        }
                                    }
                                    
                                    // [NEW] Mythic Option: MANA_SHIELD (마나쉴드 자동 생성)
                                    if (playerDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                                        const shieldAmount = Math.floor(calculateFinalStats(nextCharState).finalStats.maxMp * 0.1);
                                        if (!nextCharState.statusEffects) nextCharState.statusEffects = [];
                                        const existingShield = nextCharState.statusEffects.find(e => e.name === '마나 쉴드');
                                        if (!existingShield) {
                                            nextCharState.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                                            totalLog += `\n[시스템] ${nextCharState.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                                        }
                                    }
                                }
                            }
                            playerActionDone = true;
                        }
                    }
                }
            }
        }
        
        else if (isPlayerSkill && !playerSkipTurn) {
            const skillNameMatch = actionText.match(/\[스킬 사용\]\s*(.+?)\s*\((?:대상|Target):/i) || actionText.match(/\[스킬 사용\]\s*(.+?)\s*\(/) || actionText.match(/스킬 사용:\s*(.+)/);
            if (skillNameMatch) {
                const sName = skillNameMatch[1].trim(); 
                const allPlayerSkills = getEntityAllCombatSkills(nextCharState);
                let usedSkill = allPlayerSkills.find(s => s.name === sName || s.name.trim() === sName);
                if (!usedSkill) {
                    usedSkill = allPlayerSkills.find(s => actionText.includes(`[스킬 사용] ${s.name}`));
                }
                if (usedSkill) {
                    const playerDerived = getActorDerivedStats(nextCharState);
                    const actualCost = ((playerDerived.mythicOptions.includes(MythicOptionType.INFINITE_MANA) || playerDerived.mythicOptions.includes(MagyeOptionType.INFINITE_MANA)) && nextCharState.stats.hp <= calculateFinalStats(nextCharState).finalStats.maxHp * 0.5) ? 0 : usedSkill.mpCost;
                    
                    if (nextCharState.stats.mp < actualCost) { setMessages(prev => [...prev, { role: 'ai', text: "[시스템] 마나가 부족하여 스킬을 사용할 수 없습니다." }]); setIsLoading(false); return; }
                    
                    // [NEW] Mythic Option: MANA_SHIELD (마나쉴드 자동 생성)
                    if (playerDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                        const shieldAmount = Math.floor(calculateFinalStats(nextCharState).finalStats.maxMp * 0.1);
                        if (!nextCharState.statusEffects) nextCharState.statusEffects = [];
                        const existingShield = nextCharState.statusEffects.find(e => e.name === '마나 쉴드');
                        if (existingShield) {
                            existingShield.val = Math.max(existingShield.val || 0, shieldAmount);
                        } else {
                            nextCharState.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                        }
                        totalLog += `\n[시스템] ${nextCharState.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                    }

                    nextCharState.stats.mp -= actualCost;
                    const skillMasteryMult = getSkillMasteryMultiplier(nextCharState);
                    const skillGain = Math.round(1 * skillMasteryMult);
                    usedSkill.currentMastery = (usedSkill.currentMastery || 0) + skillGain;
                    totalLog += `\n[시스템: ${nextCharState.name} MP -${actualCost}]`; totalLog += `\n[시스템: ${nextCharState.name} 스킬숙련도 ${usedSkill.name} +${skillGain}]`;
                    const cleanActionForTarget = actionText.replace(/\s*\[버프\s*대상:[^\]]*\]/gi, '').trim();
                    let targetName = ""; const targetMatch = cleanActionForTarget.match(/(?:대상|Target):\s*(.+?)(?:\)\s*$|$)/i); if (targetMatch) targetName = targetMatch[1].trim();
                    let targets: any[] = [];
                    const isRes = CombatUtils.isResurrectionSkill(usedSkill);
                    const isOffensiveSkill = usedSkill.type === SkillType.PHYSICAL || usedSkill.type === SkillType.MAGIC || String(usedSkill.type).includes('물리') || String(usedSkill.type).includes('마법');
                    const isPositive = !isOffensiveSkill && (usedSkill.type === SkillType.BUFF || usedSkill.type === SkillType.HEAL || usedSkill.description.includes('회복'));
                    if (usedSkill.targetType === 'aoe') {
                        if (isPositive) {
                            // [MODIFIED] 부활 스킬이면 전원, 아니면 생존자만
                            if (nextCharState.stats.hp > 0 || isRes) targets.push({ type: 'player', entity: nextCharState });
                            nextCharState.companions.forEach((c, i) => {
                                if (c.stats.hp > 0 || isRes) targets.push({ type: 'companion', idx: i, entity: c });
                            });
                        } else {
                            simulationEnemies.forEach((e: Enemy, i: number) => { if (e.hp > 0) targets.push({ type: 'enemy', idx: i, entity: e }); });
                        }
                    } else if (!isOffensiveSkill && (usedSkill.targetType === 'self' || targetName === 'self' || targetName === '자신' || targetName === nextCharState.name)) {
                        targets.push({ type: 'player', entity: nextCharState });
                    } else if (!isOffensiveSkill && (usedSkill.targetType === 'ally' || (usedSkill.targetType === 'single' && (usedSkill.type === SkillType.BUFF || usedSkill.type === SkillType.HEAL)))) {
                        if (targetName === nextCharState.name || targetName === 'self' || targetName === '자신' || !targetName) {
                            targets.push({ type: 'player', entity: nextCharState });
                        } else {
                            const idx = nextCharState.companions.findIndex(c => c.name === targetName);
                            if (idx >= 0) targets.push({ type: 'companion', idx: idx, entity: nextCharState.companions[idx] });
                            else targets.push({ type: 'player', entity: nextCharState });
                        }
                    } else { 
                        const idx = simulationEnemies.findIndex((e: Enemy) => e.hp > 0 && (e.name === targetName || targetName.includes(e.name) || e.name.includes(targetName))); 
                        if (idx >= 0 && simulationEnemies[idx].hp > 0) targets.push({ type: 'enemy', idx: idx, entity: simulationEnemies[idx] });
                        else {
                            const livingEnemy = simulationEnemies.find((e: Enemy) => e.hp > 0);
                            if (livingEnemy) {
                                const livingIdx = simulationEnemies.indexOf(livingEnemy);
                                targets.push({ type: 'enemy', idx: livingIdx, entity: livingEnemy });
                            }
                        }
                    }
                    executeSkill(usedSkill, nextCharState, targets);
                    
                    // [NEW] 공격 + 부가 버프 스킬 시 지정된 버프 대상 아군에게 버프 효과 추가 적용
                    if (isAttackSkillWithBuff(usedSkill) && usedSkill.type !== SkillType.BUFF && usedSkill.type !== SkillType.HEAL) {
                        if (usedSkill.targetType === 'aoe') {
                            applyStatBuff(usedSkill, nextCharState, nextCharState);
                            nextCharState.companions?.forEach(c => {
                                if (c.stats?.hp > 0 && !c.isDead) {
                                    applyStatBuff(usedSkill, c, nextCharState);
                                }
                            });
                        } else {
                            const buffMatch = actionText.match(/\[버프\s*대상:\s*(.+?)\]/i) || actionText.match(/버프:\s*(.+?)(?:\)|\]|$)/i);
                            const buffTargetName = buffMatch ? buffMatch[1].trim() : "";
                            let buffTargetEntity: any = nextCharState;
                            if (buffTargetName && buffTargetName !== nextCharState.name && buffTargetName !== 'self' && buffTargetName !== '자신') {
                                const foundComp = nextCharState.companions?.find(c => c.name === buffTargetName);
                                if (foundComp) buffTargetEntity = foundComp;
                            }
                            applyStatBuff(usedSkill, buffTargetEntity, nextCharState);
                        }
                    }
                    
                    // [NEW] Mythic Option: DOUBLE_ATTACK (이중 공격 - 스킬 사용 시 2타는 일반 공격)
                    if (playerDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK)) {
                        const enemyTargets = targets.filter(t => t.type === 'enemy' && t.entity.hp > 0);
                        if (enemyTargets.length > 0) {
                            const target = enemyTargets[0].entity;
                            const targetIdx = enemyTargets[0].idx;
                            const result = calculateDamage(nextCharState, target, undefined, nextCharState);
                            if (result.isMiss) {
                                totalLog += `\n[시스템] ${target.name}이(가) ${nextCharState.name}의 이중 공격(2타)을 회피했습니다! (MISS)`;
                            } else {
                                const newHp = Math.max(0, simulationEnemies[targetIdx].hp - result.damage);
                                simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: newHp };
                                totalLog += `\n[이중 공격] ${nextCharState.name}이(가) ${target.name}을(를) 추가 공격! (2타)`;
                                totalLog += `\n[시스템: ${target.name} HP -${result.damage}]`;
                                if (result.isCrit) totalLog += " (치명타!)";
                            }
                        }
                    }
                    
                    playerActionDone = true;
                }
            }
        } else if (actionText.startsWith('[일반 공격]') && !playerSkipTurn) {
            const targetMatch = actionText.match(/공격\]\s*(.+?)(?:\s*공격)?$/);
            if (targetMatch) {
                const targetName = targetMatch[1].trim(); const idx = simulationEnemies.findIndex((e: Enemy) => e.name === targetName || targetName.includes(e.name));
                if (idx >= 0 && simulationEnemies[idx].hp > 0) {
                    const enemy = simulationEnemies[idx]; const result = calculateDamage(nextCharState, enemy, undefined, nextCharState); 
                    
                    if (result.isMiss) {
                        totalLog += `\n[시스템] ${enemy.name}이(가) ${nextCharState.name}의 공격을 회피했습니다! (MISS)`;
                    } else {
                        const playerDerived = getActorDerivedStats(nextCharState);
                        const attackCount = playerDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK) ? 2 : 1;
                        
                        for (let i = 0; i < attackCount; i++) {
                            const currentResult = i === 0 ? result : calculateDamage(nextCharState, enemy, undefined, nextCharState);
                            if (currentResult.isMiss) {
                                totalLog += `\n[시스템] ${enemy.name}이(가) ${nextCharState.name}의 ${i+1}차 공격을 회피했습니다! (MISS)`;
                                continue;
                            }
                            const newHp = Math.max(0, simulationEnemies[idx].hp - currentResult.damage);
                            simulationEnemies[idx] = { ...simulationEnemies[idx], hp: newHp };
                            totalLog += `\n[시스템: ${enemy.name} HP -${currentResult.damage}] (by ${nextCharState.name}${attackCount > 1 ? ` ${i+1}타` : ''})`;
                            if (currentResult.isCrit) totalLog += " (치명타!)";
                            
                            applyPostAttackMythicOptions(nextCharState, enemy, idx, currentResult, true);
                            
                            if (currentResult.additionalDamage && currentResult.additionalDamage.length > 0) {
                                currentResult.additionalDamage.forEach(ad => {
                                    const postDmgHp = Math.max(0, simulationEnemies[idx].hp - ad.damage);
                                    simulationEnemies[idx].hp = postDmgHp;
                                    totalLog += `\n${ad.log}`;
                                });
                            }
                        }
                        
                        // [NEW] Mythic Option: MANA_SHIELD (마나쉴드 자동 생성)
                        if (playerDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                            const shieldAmount = Math.floor(calculateFinalStats(nextCharState).finalStats.maxMp * 0.1);
                            if (!nextCharState.statusEffects) nextCharState.statusEffects = [];
                            const existingShield = nextCharState.statusEffects.find(e => e.name === '마나 쉴드');
                            if (!existingShield) {
                                nextCharState.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                                totalLog += `\n[시스템] ${nextCharState.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                            }
                        }
                        if (simulationEnemies[idx].hp <= 0) {
                            const revRes = CombatShieldService.processRevivalIfLethal(simulationEnemies[idx], simulationEnemies[idx].hp);
                            if (revRes.log) totalLog += revRes.log;
                        }

                        if (simulationEnemies[idx].hp <= 0) {
                            const curBonuses = getRewardBonuses();
                            const rawExp = calculateMonsterExp(enemy); 
                            const rawGold = calculateMonsterGold(enemy);
                            const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * (curBonuses.expMultiplier || 1.0));
                            const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * (curBonuses.goldMultiplier || 1.0));
                            const loot = generateCombatLoot(enemy, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                            if (loot.length > 0) { 
                                if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                    nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                    loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                                } else {
                                    totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                                }
                            }
                            totalLog += `\n[시스템] ${enemy.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
                            anyKill = true;
                            applyBestiaryUpdateInPlace(nextCharState, enemy.name, true);
                            applyCombatStyleExpForKill(nextCharState, enemy);
                            
                            nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                            nextCharState.currentExp += exp;
                            nextCharState.companions.forEach(c => {
                              if (c.stats.hp > 0 && !c.isDead) {
                                c.currentExp += exp;
                              }
                            });
                            MountCombatService.distributeKillExpToMounts(nextCharState, exp);

                            const normName = enemy.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                            if (nextCharState.mercenaryData?.activeQuests) {
                                nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                    if ((q.type === 'Subjugation' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                            
                                        return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                    }
                                    return q;
                                });
                            }
                            if (nextCharState.militaryData?.activeMissions) {
                                nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                    if ((m.type === 'Subjugation' || m.type === 'DivineOracle' || m.type === 'BountyHunt') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                            
                                        return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                    }
                                    return m;
                                });
                            }

                            grantPartyRoleMastery(false);
                            addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${enemy.name} 처치`);

                            if (enemy.name.includes("문지기 케르베로스")) {
                                 if (nextCharState.inventory.length < calculateInventorySize(nextCharState.stats)) {
                                     const passItem: Item = {
                                        name: "제국의 통행증",
                                        type: "Etc",
                                        rarity: ItemRarity.LEGENDARY,
                                        description: "임페리얼 제국 출입 허가증",
			    imageUrl:"https://i.ibb.co/3mkbNjKq/Gemini-Generated-Image-fmssddfmssddfmss.png",
                                        enhancement: 0
                                    };
                                    nextCharState.inventory.push(passItem);
                                    totalLog += `\n[시스템 전리품 획득! 제국의 통행증]`;
                                 } else {
                                     totalLog += `\n[시스템] 가방이 가득 차 제국의 통행증을 획득하지 못했습니다.`;
                                 }
                            }
                        }
                    }
                    playerActionDone = true;
                }
            }
        }
        else if (isDefense && !playerSkipTurn) {
            totalLog += `\n[시스템] ${nextCharState.name}이(가) 방어 태세를 취해 피해를 줄일 준비를 합니다.`;
            playerActionDone = true;
        }
        else if (isSystemAction) {
            // [시스템] 액션은 전투 로그에만 기록하고 턴 소모를 하지 않거나(또는 AI 응답 무시)
            totalLog += `\n${actionText}`;
            playerActionDone = false; 
        }

        // [NEW] 탈것 몬스터 전투 참여 로직 (플레이어 또는 동료 행동 후 해당 탈것 공격/스킬 지원)
        if (!isOneOnOne && (playerActionDone || isCompanionCommand)) {
            let activeMount: Companion | undefined;
            let riderName = '';

            if (playerActionDone) {
                activeMount = MountCombatService.getActiveMount(nextCharState, nextCharState);
                riderName = nextCharState.name;
            } else if (isCompanionCommand) {
                const compCommandMatch = actionText.match(/\[동료 (?:지시|행동|스킬):\s*(.+?)\]\s*(.+?)$/);
                const compName = compCommandMatch ? compCommandMatch[1].trim() : null;
                const actingComp = compName ? nextCharState.companions.find(c => c.name === compName) : null;
                if (actingComp) {
                    activeMount = MountCombatService.getActiveMount(actingComp, nextCharState);
                    riderName = actingComp.name;
                }
            }

            if (activeMount) {
                const mountResult = MountCombatService.executeMountCombatAction({
                    mount: activeMount,
                    riderName,
                    simulationEnemies,
                    nextCharState,
                    executeSkill,
                    getRewardBonuses,
                    calculateMonsterExp,
                    calculateMonsterGold,
                    generateLoot,
                    onEnemyKilled: (target, exp, gold, loot) => {
                        nextCharState.money += gold;
                        accumulatedExp += exp;
                        accumulatedGold += gold;
                        nextCharState.currentExp += exp;
                        nextCharState.companions.forEach(c => {
                            if (c.stats.hp > 0 && !c.isDead) c.currentExp += exp;
                        });
                        MountCombatService.distributeKillExpToMounts(nextCharState, exp);
                        accumulatedLoot.push(...loot);
                        if (loot.length > 0) {
                            if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; });
                            } else {
                                totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                            }
                        }
                        totalLog += `\n[시스템] ${target.name} 처치! (EXP +${exp}, GOLD +${gold})`;
                        anyKill = true;
                        applyBestiaryUpdateInPlace(nextCharState, target.name, true);
                        applyCombatStyleExpForKill(nextCharState, target);

                        const normName = target.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                        if (nextCharState.mercenaryData?.activeQuests) {
                            nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                if ((q.type === 'Subjugation' || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol' || q.type === 'MilitaryDefense' || q.type === 'DivineOracle' || q.type === 'DemonContract' || q.type === 'RacialNatureProtection' || q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                                    return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                }
                                return q;
                            });
                        }
                        if (nextCharState.militaryData?.activeMissions) {
                            nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle' || m.type === 'BountyHunt' || m.type === 'MilitaryPatrol' || m.type === 'MilitaryDefense') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                    return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                }
                                return m;
                            });
                        }
                        grantPartyRoleMastery(false);
                        addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${target.name} 처치`);
                    }
                });

                if (mountResult.log) {
                    totalLog += mountResult.log;
                }
                if (mountResult.anyKill) {
                    anyKill = true;
                }
            }
        }


        if (false && !isOneOnOne && (playerActionDone || isCompanionCommand) && (nextCharState.companions.length > 0 || nextCharState.mountedMonster || nextCharState.companions.some(c => c.mountedMonster))) {
            CombatUtils.getAllCombatantCompanions(nextCharState).forEach(comp => {
                if (actedCompanions.has(comp.id)) return; 
                if (comp.stats.hp > 0 && !comp.isDead) {
                    const compDerived = getActorDerivedStats(comp);
                    // [NEW] 탈것인 경우 주인의 상태 확인
                    if (comp.isMountedAsMount) {
                        const owner = nextCharState.companions.find(c => c.mountedMonsterId === comp.id);
                        if (owner && (owner.stats.hp <= 0 || owner.isDead)) {
                            totalLog += `\n[시스템] ${comp.name}은(는) 주인이 전투불능 상태라 행동할 수 없습니다.`;
                            return;
                        }
                    }
                    let skipTurn = false; let ccName = ""; comp.statusEffects?.forEach(eff => { if (["빙결", "기절", "마비", "수면", "소멸"].includes(eff.name)) { skipTurn = true; ccName = eff.name; } else if (eff.name === "감전" && Math.random() < 0.75) { skipTurn = true; ccName = "감전"; } else if (eff.name === "속박" && Math.random() < 0.75) { skipTurn = true; ccName = "속박"; } else if (eff.name === "혼란" && Math.random() < 0.5) { skipTurn = true; ccName = "혼란"; } });
                    if (skipTurn) { totalLog += `\n[시스템] ${comp.name} 행동불가 (${ccName})`; return; }
                    
                  const livingEnemies = simulationEnemies.filter((e: Enemy) => e.hp > 0);
                    if (livingEnemies.length > 0) {
                        // [MODIFIED] 전술(Tactics)에 따른 스킬 사용 여부 및 풀 구성 로직 고도화
                        let shouldAutoSkill = false;
                        if (comp.currentTactics === "스킬 제한") {
                            shouldAutoSkill = false;
                        } else if (comp.currentTactics === "스킬 위주") {
                            shouldAutoSkill = true; // MP가 허용하는 한 무조건 스킬 사용
                             } else if (comp.currentTactics === "방어 태세") {
                            shouldAutoSkill = false;
                        } else {
                            shouldAutoSkill = Math.random() < 0.5; // 기본 50%
                        }

                        let usableSkills = getEntityAllCombatSkills(comp).filter(s => s.mpCost <= comp.stats.mp && s.type !== SkillType.PASSIVE);
                        
                        // [NEW] "공격 집중" 전술 시 공격 스킬만 필터링
                        if (comp.currentTactics === "공격 집중") {
                            usableSkills = usableSkills.filter(s => s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC);
                        }

                        // [NEW] 중복 버프 방지: 이미 적용된 버프 스킬은 사용 대상에서 제외
                        usableSkills = usableSkills.filter(s => {
                            if (s.type === SkillType.BUFF) {
                                const alreadyHas = comp.statusEffects?.some(eff => eff.name === s.name || eff.name.includes(s.name));
                                return !alreadyHas;
                            }
                            return true;
                        });

                        const isConfused = comp.statusEffects?.some(e => e.name === "혼란");

                        if (shouldAutoSkill && usableSkills.length > 0) {
                            // [MODIFIED] 마나 사정에 맞게 가장 높은 티어의 스킬부터 우선 사용
                            const sortedByTier = [...usableSkills].sort((a, b) => {
                                const pA = TIER_PRIORITY[a.tier] || 0;
                                const pB = TIER_PRIORITY[b.tier] || 0;
                                if (pB !== pA) return pB - pA;
                                return (b.powerRatio || 0) - (a.powerRatio || 0); // 티어 같으면 파워 순
                            });

                            const highestTierVal = TIER_PRIORITY[sortedByTier[0].tier] || 0;
                            const bestTierPool = sortedByTier.filter(s => (TIER_PRIORITY[s.tier] || 0) === highestTierVal);

                            // 전술에 따른 스킬 선택 우선순위 (가장 높은 티어 내에서)
                            let selectedSkill = bestTierPool[Math.floor(Math.random() * bestTierPool.length)];
                            
                            const partyNeeds = CompanionTacticsService.evaluatePartyNeeds(nextCharState, nextCharState.companions || []);
                            const resurrectionSkill = bestTierPool.find(s => CombatUtils.isResurrectionSkill(s) || (s as any).buffEffects?.some((ef: any) => ef.type === 'RESURRECTION'));
                            
                            if (partyNeeds.deadAllies.length > 0 && resurrectionSkill) {
                                selectedSkill = resurrectionSkill;
                            } else if (comp.currentTactics === "힐/지원 집중") {
                                const hpThresh = (comp.tacticsHpThreshold !== undefined ? comp.tacticsHpThreshold : 80) / 100;
                                const mpThresh = (comp.tacticsMpThreshold !== undefined ? comp.tacticsMpThreshold : 50) / 100;

                                // 아군 체력 및 마나 상황 확인
                                const partyNeeds = CompanionTacticsService.evaluatePartyNeeds(nextCharState, nextCharState.companions || []);
                                const lowestHpRatio = partyNeeds.lowestHpRatio;
                                const lowestMpRatio = partyNeeds.lowestMpRatio;

                                if (lowestHpRatio <= hpThresh) {
                                    const healSkill = bestTierPool.find(s => s.effectFormula?.includes('HP') || s.type === SkillType.HEAL || (s as any).buffEffects?.some((ef: any) => ef.type === 'HP_RECOV'));
                                    if (healSkill) selectedSkill = healSkill;
                                } else if (lowestMpRatio <= mpThresh) {
                                    const mpSkill = bestTierPool.find(s => s.effectFormula?.includes('MP') || (s as any).buffEffects?.some((ef: any) => ef.type === 'MP_RECOV'));
                                    if (mpSkill) selectedSkill = mpSkill;
                                } else {
                                    const buffSkill = bestTierPool.find(s => s.type === SkillType.BUFF);
                                    if (buffSkill) selectedSkill = buffSkill;
                                }
                            } else if (comp.currentTactics === "공격 집중") {
                                const offensive = [...bestTierPool]
                                    .filter(s => s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC)
                                    .sort((a, b) => (b.powerRatio || 0) - (a.powerRatio || 0))[0];
                                if (offensive) selectedSkill = offensive;
                            } else if (comp.currentTactics === "스킬 위주") {
                                const powerful = [...bestTierPool].sort((a, b) => (b.powerRatio || 0) - (a.powerRatio || 0))[0];
                                if (powerful) selectedSkill = powerful;
                            }

                            // MP 소모 및 로그 기록
                            const compInfMana = (compDerived.mythicOptions.includes(MythicOptionType.INFINITE_MANA) || compDerived.mythicOptions.includes(MagyeOptionType.INFINITE_MANA)) && comp.stats.hp <= calculateFinalStats(comp).finalStats.maxHp * 0.5;
                            const actualCost = compInfMana ? 0 : selectedSkill.mpCost;
                            
                            comp.stats.mp -= actualCost;
                            selectedSkill.currentMastery = (selectedSkill.currentMastery || 0) + 1;
                            totalLog += `\n[시스템: ${comp.name} MP -${actualCost}]`;
                            totalLog += `\n[시스템: ${comp.name} 스킬 숙련도 +1 증가 ${selectedSkill.name}]`;
                            totalLog += `\n[시스템: ${comp.name} 스킬 발동: ${selectedSkill.name} (${selectedSkill.tier})]`;

                            let targets: any[] = [];
                             const isRes = CombatUtils.isResurrectionSkill(selectedSkill);
                            const isPositive = selectedSkill.type === SkillType.BUFF || selectedSkill.effectFormula.includes('HP');
let targetEntity: any = null;
let targetType: 'player' | 'companion' | 'enemy' = 'enemy';
let targetIdx = -1;

                            if (selectedSkill.targetType === 'aoe') {
                                if (isPositive) {
                            // [MODIFIED] 부활 스킬이면 전원, 아니면 생존자만
                            if (nextCharState.stats.hp > 0 || isRes) targets.push({ type: 'player', entity: nextCharState });
                            nextCharState.companions.forEach((c, i) => {
                                if (c.stats.hp > 0 || isRes) targets.push({ type: 'companion', idx: i, entity: c });
                            });
                        } else {
                            simulationEnemies.forEach((e: Enemy, i: number) => { if (e.hp > 0) targets.push({ type: 'enemy', idx: i, entity: e }); });
                        }
                            } else {
                                // 싱글 타겟팅
                                let targetEntity: any = null;
                                let targetType: 'player' | 'companion' | 'enemy' = 'enemy';
                                let targetIdx = -1;

                             if (isPositive) {
                                    // [MODIFIED] 부활 스킬인지 일반 버프/힐인지 확인하여 타겟 필터링
                                    const isResurrection = CombatUtils.isResurrectionSkill(selectedSkill);
                                    
                                    const allies = [
                                        { type: 'player', entity: nextCharState },
                                        ...nextCharState.companions.map((c, i) => ({ type: 'companion', entity: c, idx: i }))
                                    ].filter(a => {
                                        // 부활 스킬은 오직 죽은 아군만, 일반 스킬은 살아있는 아군만 타겟팅
                                        return isResurrection ? a.entity.stats.hp <= 0 : a.entity.stats.hp > 0;
                                    });

                                    if (allies.length > 0) {
                                        const pick = allies[Math.floor(Math.random() * allies.length)];
                                        targetEntity = pick.entity;
                                        targetType = pick.type as any;
                                        targetIdx = (pick as any).idx ?? -1;
                                    } else {
                                        // 유효한 타겟이 없는 경우 (예: 부활 스킬인데 아무도 안 죽었거나, 힐 스킬인데 아무도 안 살았을 때)
                                        // 일반 공격으로 전환 시도
                                        targets = [];
                                        const enemyPick = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                                        const enemyIdx = simulationEnemies.indexOf(enemyPick);
                                        targets.push({ type: 'enemy', entity: enemyPick, idx: enemyIdx });
                                    }
                                } else {
                                    // 공격/디버프: 무작위 적
                                    targetIdx = simulationEnemies.indexOf(livingEnemies[Math.floor(Math.random() * livingEnemies.length)]);
                                    targetEntity = simulationEnemies[targetIdx];
                                    targetType = 'enemy';
                                }

                                // [NEW] 타겟이 확정되었을 때만 추가 (위의 필터링 결과 반영)
                                if (targetEntity && targets.length === 0) {
                                    // 혼란 체크 (생존자 타겟팅 시에만 발생하도록 조건 추가)
                                    if (isConfused && Math.random() < 0.4 && targetEntity.stats?.hp > 0) {
                                        totalLog += `\n[시스템] ${comp.name}이(가) 혼란에 빠져 엉뚱한 대상을 조준했습니다!`;
                                        if (targetType === 'enemy') {
                                            const allies = [{ type: 'player', entity: nextCharState }, ...nextCharState.companions.map((c, i) => ({ type: 'companion', entity: c, idx: i }))].filter(a => a.entity.stats.hp > 0);
                                            if (allies.length > 0) {
                                                const pick = allies[Math.floor(Math.random() * allies.length)];
                                                targetEntity = pick.entity;
                                                targetType = pick.type as any;
                                                targetIdx = (pick as any).idx ?? -1;
                                            }
                                        } else {
                                            targetIdx = simulationEnemies.indexOf(livingEnemies[Math.floor(Math.random() * livingEnemies.length)]);
                                            targetEntity = simulationEnemies[targetIdx];
                                            targetType = 'enemy';
                                        }
                                }
                                targets.push({ type: targetType, entity: targetEntity, idx: targetIdx });
                            }
                            }
                            executeSkill(selectedSkill, comp, targets);
                            
                            // [NEW] Mythic Option: DOUBLE_ATTACK (이중 공격 - 스킬 사용 시 2타는 일반 공격)
                            if (compDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK)) {
                                const enemyTargets = targets.filter(t => t.type === 'enemy' && t.entity.hp > 0);
                                if (enemyTargets.length > 0) {
                                    const target = enemyTargets[0].entity;
                                    const targetIdx = enemyTargets[0].idx;
                                    const result = calculateDamage(comp, target, undefined, nextCharState);
                                    if (result.isMiss) {
                                        totalLog += `\n[시스템] ${target.name}이(가) ${comp.name}의 이중 공격(2타)을 회피했습니다! (MISS)`;
                                    } else {
                                        const newHp = Math.max(0, simulationEnemies[targetIdx].hp - result.damage);
                                        simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: newHp };
                                        totalLog += `\n[이중 공격] ${comp.name}이(가) ${target.name}을(를) 추가 공격! (2타)`;
                                        totalLog += `\n[시스템: ${target.name} HP -${result.damage}]`;
                                        if (result.isCrit) totalLog += " (치명타!)";
                                    }
                                }
                            }
                        } else {
                               // 전술이 방어 태세인 경우 자동으로 방어
                            if (comp.currentTactics === "방어 태세") {
                                if (!comp.statusEffects) comp.statusEffects = [];
                                comp.statusEffects.push({
                                    name: "방어 태세",
                                    duration: 1,
                                    effect: "받는 물리 및 마법 피해 50% 감소"
                                });
                                totalLog += `\n[시스템] ${comp.name}이(가) 방어 자세를 취합니다.`;
                                return;
                            }
                            // 일반 공격
                            let target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                            
                            // 혼란 체크: 아군을 공격할 수 있음
                            if (isConfused && Math.random() < 0.3) {
                                const allies = [nextCharState.name, ...nextCharState.companions.map(c => c.name)];
                                const redirectedName = allies[Math.floor(Math.random() * allies.length)];
                                totalLog += `\n[시스템] ${comp.name}이(가) 혼란에 빠져 아군을 공격합니다!`;
                                
                                // 아군 데미지 처리
                                let redirectedTarget: any = null;
                                if (redirectedName === nextCharState.name) redirectedTarget = nextCharState;
                                else redirectedTarget = nextCharState.companions.find(c => c.name === redirectedName);

                                if (redirectedTarget) {
                                    const result = calculateDamage(comp, redirectedTarget, undefined, nextCharState);
                                    redirectedTarget.stats.hp = Math.max(0, redirectedTarget.stats.hp - result.damage);
                                    totalLog += `\n[시스템: ${redirectedName} HP -${result.damage}] (by ${comp.name})`;
                                    applyPostAttackMythicOptions(comp, redirectedTarget, -1, result, false);
                                    return; 
                                }
                            }
                        
                        const result = calculateDamage(comp, target, undefined, nextCharState); const targetIdx = simulationEnemies.indexOf(target);
                        if (targetIdx >= 0) {
                            if (result.isMiss) {
                                totalLog += `\n[시스템] ${target.name}이(가) ${comp.name}의 공격을 회피했습니다! (MISS)`;
                            } else {
                                const attackCount = compDerived.mythicOptions.includes(MythicOptionType.DOUBLE_ATTACK) ? 2 : 1;
                                
                                for (let i = 0; i < attackCount; i++) {
                                    const currentResult = i === 0 ? result : calculateDamage(comp, target, undefined, nextCharState);
                                    if (currentResult.isMiss) {
                                        totalLog += `\n[시스템] ${target.name}이(가) ${comp.name}의 ${i+1}차 공격을 회피했습니다! (MISS)`;
                                        continue;
                                    }
                                    const newHp = Math.max(0, simulationEnemies[targetIdx].hp - currentResult.damage);
                                    simulationEnemies[targetIdx] = { ...simulationEnemies[targetIdx], hp: newHp };
                                    totalLog += `\n[시스템: ${target.name} HP -${currentResult.damage}] (by ${comp.name}${attackCount > 1 ? ` ${i+1}타` : ''})`;
                                    if (currentResult.isCrit) totalLog += " (치명타!)";
                                    
                                    applyPostAttackMythicOptions(comp, target, targetIdx, currentResult, true);
                                    
                                    if (currentResult.additionalDamage && currentResult.additionalDamage.length > 0) {
                                        currentResult.additionalDamage.forEach(ad => {
                                            const postDmgHp = Math.max(0, simulationEnemies[targetIdx].hp - ad.damage);
                                            simulationEnemies[targetIdx].hp = postDmgHp;
                                            totalLog += `\n${ad.log}`;
                                        });
                                    }
                                }
                                
                                // [NEW] Mythic Option: MANA_SHIELD (마나쉴드 자동 생성)
                                if (compDerived.mythicOptions.includes(MythicOptionType.MANA_SHIELD)) {
                                    const shieldAmount = Math.floor(calculateFinalStats(comp).finalStats.maxMp * 0.1);
                                    if (!comp.statusEffects) comp.statusEffects = [];
                                    const existingShield = comp.statusEffects.find(e => e.name === '마나 쉴드');
                                    if (!existingShield) {
                                        comp.statusEffects.push({ name: '마나 쉴드', effect: `피해를 흡수하는 마법 보호막 (${shieldAmount})`, duration: 3, val: shieldAmount });
                                        totalLog += `\n[시스템] ${comp.name}의 신화 옵션 발동! 마나 쉴드가 생성되었습니다. (+${shieldAmount})`;
                                    }
                                }
                                if (simulationEnemies[targetIdx].hp <= 0) {
                                    const revRes = CombatShieldService.processRevivalIfLethal(simulationEnemies[targetIdx], simulationEnemies[targetIdx].hp);
                                    if (revRes.log) totalLog += revRes.log;
                                }

                                if (simulationEnemies[targetIdx].hp <= 0 && target.hp > 0) { 
                                    const curBonuses = getRewardBonuses();
                                    const rawExp = calculateMonsterExp(target); 
                                    const rawGold = calculateMonsterGold(target); 
                                    const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * (curBonuses.expMultiplier || 1.0));
                                    const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * (curBonuses.goldMultiplier || 1.0));
                                    const loot = generateCombatLoot(target, nextCharState.currentLocation?.nation, nextCharState); accumulatedLoot.push(...loot);
                                    if (loot.length > 0) { 
                                        if (nextCharState.inventory.length + loot.length <= calculateInventorySize(nextCharState.stats)) {
                                            nextCharState.inventory = [...nextCharState.inventory, ...loot];
                                            loot.forEach(item => { totalLog += `\n[시스템 전리품 획득! ${item.name}]`; }); 
                                        } else {
                                            totalLog += `\n[시스템] 가방이 가득 차 전리품을 획득하지 못했습니다.`;
                                        }
                                    }
                                    totalLog += `\n[시스템] ${target.name} 처치! (EXP +${exp}, GOLD +${gold})`; 
                                    anyKill = true;
                                    applyBestiaryUpdateInPlace(nextCharState, target.name, true);
                                applyCombatStyleExpForKill(nextCharState, target);
                                    nextCharState.money += gold; accumulatedExp += exp; accumulatedGold += gold; 
                                    nextCharState.currentExp += exp;
                                    nextCharState.companions.forEach(c => {
                                      if (c.stats.hp > 0 && !c.isDead) {
                                        c.currentExp += exp;
                                      }
                                    });
                                    MountCombatService.distributeKillExpToMounts(nextCharState, exp);

                                    const normName = target.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                                    if (nextCharState.mercenaryData?.activeQuests) {
                                        nextCharState.mercenaryData.activeQuests = nextCharState.mercenaryData.activeQuests.map(q => {
                                            if ((q.type === 'Subjugation' || q.type === 'Rescue' || q.type === 'BountyHunt' || q.type === 'MilitaryPatrol'|| q.type === 'MilitaryDefense' || q.type === 'DivineOracle'|| q.type === 'DemonContract' || q.type === 'RacialNatureProtection'|| q.type === 'BeastArenaBattle') && q.targetName && (normName.includes(q.targetName) || q.targetName.includes(normName))) {
                    
                                                return { ...q, currentAmount: (q.currentAmount || 0) + 1 };
                                            }
                                            return q;
                                        });
                                    }
                                    if (nextCharState.militaryData?.activeMissions) {
                                        nextCharState.militaryData.activeMissions = nextCharState.militaryData.activeMissions.map(m => {
                                            if ((m.type === 'Subjugation' || m.type === 'Rescue' || m.type === 'DivineOracle' || m.type === 'BountyHunt') && m.targetName && (normName.includes(m.targetName) || m.targetName.includes(normName))) {
                                    
                                                return { ...m, currentAmount: (m.currentAmount || 0) + 1 };
                                            }
                                            return m;
                                        });
                                    }

                                    grantPartyRoleMastery(false);
                                    addMemory(nextCharState, `${nextCharState.currentLocation?.city}에서 ${target.name} 처치`);

                                    if (target.name.includes("문지기 케르베로스")) {
                                         if (nextCharState.inventory.length < calculateInventorySize(nextCharState.stats)) {
                                             const passItem: Item = {
                                                name: "제국의 통행증",
                                                type: "Etc",
                                                rarity: ItemRarity.LEGENDARY,
                                                description: "임페리얼 제국에 출입할 수 있는 권한을 증명하는 패입니다.",
				imageUrl:"https://i.ibb.co/3mkbNjKq/Gemini-Generated-Image-fmssddfmssddfmss.png",
                                                enhancement: 0
                                            };
                                            nextCharState.inventory.push(passItem);
                                            totalLog += `\n[시스템 전리품 획득! 제국의 통행증]`;
                                         } else {
                                             totalLog += `\n[시스템] 가방이 가득 차 제국의 통행증을 획득하지 못했습니다.`;
                                         }
                                    }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        try {
            const livingEnemies = simulationEnemies.filter((e: Enemy) => e.hp > 0);
            if (false && livingEnemies.length > 0) {
                 livingEnemies.forEach((enemy: Enemy) => {
                     let skipTurn = false; let ccName = ""; enemy.statusEffects?.forEach(eff => { if (eff.name === "빙결") { skipTurn = true; ccName = "빙결"; } if (eff.name === "감전" && Math.random() < 0.5) { skipTurn = true; ccName = "감전"; } if (eff.name === "속박" && Math.random() < 0.25) { skipTurn = true; ccName = "속박"; } });
                     if (skipTurn) { totalLog += `\n[시스템] ${enemy.name} 행동불가 (${ccName})`; return; }
                     
                     let possibleTargets: { type: 'player' | 'companion' | 'enemy', ref: any }[] = [];
                     if (isOneOnOne) {
                         if (challengerCompanionId) {
                             const chalComp = nextCharState.companions.find(c => c.id === challengerCompanionId);
                             if (chalComp && chalComp.stats.hp > 0 && !chalComp.isDead) {
                                 possibleTargets = [{ type: 'companion', ref: chalComp }];
                             }
                         } else {
                             if (nextCharState.stats.hp > 0 && !nextCharState.isDead) {
                                 possibleTargets = [{ type: 'player', ref: nextCharState }];
                             }
                         }
                     } else {
                         if (nextCharState.stats.hp > 0 && !nextCharState.isDead) {
                             possibleTargets.push({ type: 'player', ref: nextCharState });
                         }
                         const livingCompanions = nextCharState.companions.filter(c => c.stats.hp > 0 && !c.isDead);
                         livingCompanions.forEach(c => possibleTargets.push({ type: 'companion', ref: c }));
                     }
                     
                     // 혼란 체크: 적군끼리 공격
                     if (enemy.statusEffects?.some(e => e.name === "혼란") && Math.random() < 0.3) {
                        const otherEnemies = simulationEnemies.filter(e => e.hp > 0 && e.name !== enemy.name);
                        if (otherEnemies.length > 0) {
                            possibleTargets = otherEnemies.map(e => ({ type: 'enemy', ref: e }));
                            totalLog += `\n[시스템] ${enemy.name}이(가) 혼란에 빠져 아군을 공격합니다!`;
                        }
                     }

                     if (possibleTargets.length > 0) {
                         // [MODIFIED] 전술 포지션/역할에 따른 가중치 타겟팅 적용 (역할 가중치 * 위치 가중치)
                         const targetWeights = possibleTargets.map(t => {
                             const role = getEffectiveBattleRole(t.ref);
                             const pos = (t.ref as any).battlePosition as BattlePosition || { row: 1, col: 1 };
                             
                             let baseWeight = 3;
                             if (role === BattleRole.TANKER) baseWeight = 6;
                             else if (role === BattleRole.DEALER) baseWeight = 3;
                             else if (role === BattleRole.SUPPORTER) baseWeight = 1;

                             let rowMultiplier = 1.0;
                             if (pos.row === 0) rowMultiplier = 1.5;      // 전열: 1.5배 타겟팅 확률
                             else if (pos.row === 1) rowMultiplier = 1.0; // 중열: 1.0배
                             else if (pos.row === 2) rowMultiplier = 0.5; // 후열: 0.5배
                             
                             return baseWeight * rowMultiplier;
                         });

                         const totalWeight = targetWeights.reduce((sum, w) => sum + w, 0);
                         let random = Math.random() * totalWeight;
                         let targetSelectionIdx = 0;
                         for (let i = 0; i < targetWeights.length; i++) {
                             if (random < targetWeights[i]) {
                                 targetSelectionIdx = i;
                                 break;
                             }
                             random -= targetWeights[i];
                         }

                         const targetObj = possibleTargets[targetSelectionIdx]; 
                         const targetEntity = targetObj.ref as any;
                         if (targetEntity) {
                             let damageResult: { damage: number, isCrit: boolean, isMiss: boolean, affinityEffect: string, additionalDamage: { damage: number, log: string }[], attackerMythicOptions: (MythicOptionType | MagyeOptionType)[], targetMythicOptions: (MythicOptionType | MagyeOptionType)[] } = { damage: 0, isCrit: false, isMiss: false, affinityEffect: "", additionalDamage: [], attackerMythicOptions: [], targetMythicOptions: [] };
                             const activeEnemySkills = (enemy.skills || []).filter(s => s.type !== SkillType.PASSIVE);
                             const skill = (Math.random() < 0.25 && activeEnemySkills.length > 0) ? activeEnemySkills[Math.floor(Math.random() * activeEnemySkills.length)] : undefined;
                             const isBuffOrHeal = skill && (
                                 skill.type === SkillType.BUFF || 
                                 skill.type === SkillType.HEAL || 
                                 skill.targetType === 'self' || 
                                 skill.targetType === 'ally' || 
                                 (skill.effectFormula && (skill.effectFormula.includes('BUFF') || skill.effectFormula.includes('RECOV') || skill.effectFormula.includes('HEAL') || skill.effectFormula.includes('증가') || skill.effectFormula.includes('회복')))
                             );

                             const isDebuff = skill && (
                                 skill.type === SkillType.DEBUFF ||
                                 (skill.effectFormula && skill.effectFormula.toLowerCase().includes('debuff:'))
                             );

                             if (skill && isBuffOrHeal) {
                                 totalLog += `\n[시스템] ${enemy.name}의 보조/버프 스킬 발동: ${skill.name}!`;
                                 const buffTargets = skill.targetType === 'aoe'
                                     ? simulationEnemies.filter(e => e.hp > 0)
                                     : [enemy];

                                 buffTargets.forEach(tgt => {
                                     if (skill.effectFormula?.includes('RECOV') || skill.effectFormula?.includes('HEAL') || skill.type === SkillType.HEAL) {
                                         const enemyFinal = calculateFinalStats(enemy).finalStats;
                                         const sumWisInt = Math.max(1, (enemyFinal.wis || 0) + (enemyFinal.int || 0));
                                         const ratio = (skill.powerRatio && skill.powerRatio > 5) ? (skill.powerRatio / 100) : (skill.powerRatio || 0.5);
                                         const healAmount = Math.max(50, Math.round((sumWisInt * 4) * ratio));
                                         tgt.hp = Math.min(tgt.maxHp, tgt.hp + healAmount);
                                         totalLog += `\n[시스템] ${tgt.name}이(가) 체력을 ${healAmount} 회복했습니다!`;
                                     }
                                     const res = CombatUtils.checkAndApplyAilment(skill, tgt, enemy.stats || { ctrl: 10 } as Stats);
                                     if (res.log) totalLog += res.log;
                                     if (res.appliedStatus) {
                                         if (!tgt.statusEffects) tgt.statusEffects = [];
                                         tgt.statusEffects.push(res.appliedStatus);
                                     }
                                     applyStatBuff(skill, tgt, enemy);
                                 });
                             } else if (skill && isDebuff) {
                                 totalLog += `\n[시스템] ${enemy.name}의 약화/디버프 스킬 발동: ${skill.name}!`;
                                 const debuffTargets = skill.targetType === 'aoe'
                                     ? possibleTargets.filter(t => (t.ref as any)?.stats?.hp > 0 || (t.type === 'player' && nextCharState.stats.hp > 0))
                                     : [targetObj];

                                 debuffTargets.forEach(tObj => {
                                     const tgt = tObj.ref as any;
                                     if (tgt) {
                                         const successRate = calculateDebuffSuccessRate(enemy.stats || { ctrl: 10 } as Stats, tgt.stats || { ctrl: 10 } as Stats, skill.level || 1);
                                         const roll = Math.random() * 100;
                                         if (roll < successRate) {
                                             applyStatDebuff(skill, tgt, enemy);
                                             const res = CombatUtils.checkAndApplyAilment(skill, tgt, enemy.stats || { ctrl: 10 } as Stats);
                                             if (res.log) totalLog += res.log;
                                             if (res.appliedStatus) {
                                                 if (!tgt.statusEffects) tgt.statusEffects = [];
                                                 tgt.statusEffects.push(res.appliedStatus);
                                             }
                                         } else {
                                             totalLog += `\n[시스템] ${tgt.name}이(가) ${enemy.name}의 ${skill.name} 효과를 저항했습니다! (RESIST)`;
                                         }
                                     }
                                 });
                             } else if (skill) {
                                 totalLog += `\n[시스템] ${enemy.name}의 스킬 발동: ${skill.name}!`; 
                                 damageResult = calculateDamage(enemy, targetEntity, skill, nextCharState);
                                 const res = CombatUtils.checkAndApplyAilment(skill, targetEntity, enemy.stats || { ctrl: 10 } as Stats);
                                 if (res.log) totalLog += res.log;
                                 if (res.appliedStatus) { if(!targetEntity.statusEffects) targetEntity.statusEffects = []; targetEntity.statusEffects.push(res.appliedStatus); }
                                 if (skill.effectFormula && skill.effectFormula.includes('-')) {
                                     applyStatDebuff(skill, targetEntity, enemy);
                                 }
                             } else { 
                                 damageResult = calculateDamage(enemy, targetEntity, undefined, nextCharState); 
                             }
                             
                             if (!isBuffOrHeal && !isDebuff) {
                                 if (damageResult.isMiss) {
                                     totalLog += `\n[시스템] ${targetEntity.name}이(가) ${enemy.name}의 공격을 회피했습니다! (MISS)`;
                                 } else {
                                     let dmg = damageResult.damage;

                                     // [NEW] Mythic Option: NULLIFY (피해 무효화)
                                     if (damageResult.targetMythicOptions.includes(MythicOptionType.NULLIFY) && Math.random() < 0.2) {
                                         dmg = 0;
                                         totalLog += `\n[시스템] ${targetEntity.name}의 신화 옵션 발동! 피해를 무효화했습니다.`;
                                     }

                                 const shieldRes = CombatShieldService.processShieldAbsorption(targetEntity, dmg);
                                 dmg = shieldRes.remainingDamage;
                                 totalLog += shieldRes.totalLog;

                                 if (targetObj.type === 'player') { nextCharState.stats.hp = Math.max(0, nextCharState.stats.hp - dmg); if (dmg > 0) totalLog += `\n[시스템: ${nextCharState.name} HP -${dmg}] (by ${enemy.name})`; } 
                                 else if (targetObj.type === 'companion') { const cIdx = nextCharState.companions.findIndex(c => c.id === (targetEntity as Companion).id); if (cIdx >= 0) { nextCharState.companions[cIdx].stats.hp = Math.max(0, nextCharState.companions[cIdx].stats.hp - dmg); if (dmg > 0) totalLog += `\n[시스템: ${nextCharState.companions[cIdx].name} HP -${dmg}] (by ${enemy.name})`; } }
                                 else if (targetObj.type === 'enemy') { targetEntity.hp = Math.max(0, targetEntity.hp - dmg); if (dmg > 0) totalLog += `\n[시스템: ${targetEntity.name} HP -${dmg}] (by ${enemy.name})`; }
                                 if (damageResult.isCrit) totalLog += " (치명타!)";
                                 if (damageResult.affinityEffect) totalLog += damageResult.affinityEffect;
                                 applyPostAttackMythicOptions(enemy, targetEntity, -1, damageResult, false);
                                 }
                             }
                         }
                     }
                 });
            }
        } catch (e) { console.error("Combat simulation error:", e); }

        // [NEW] Mythic Option: UNDEAD (사망 방지)
        const playerDerived = getActorDerivedStats(nextCharState);
        if (nextCharState.stats.hp <= 0 && (playerDerived.mythicOptions.includes(MythicOptionType.UNDEAD) || playerDerived.mythicOptions.includes(MagyeOptionType.UNDEAD)) && !(nextCharState as any)._undeadUsed) {
            nextCharState.stats.hp = calculateFinalStats(nextCharState).finalStats.maxHp;
            (nextCharState as any)._undeadUsed = true;
            totalLog += `\n[시스템] ${nextCharState.name}의 사망 방지 옵션 발동! 죽음의 문턱에서 부활했습니다!`;
        }
        nextCharState.companions.forEach(comp => {
            const compDerived = getActorDerivedStats(comp);
            if (comp.stats.hp <= 0 && (compDerived.mythicOptions.includes(MythicOptionType.UNDEAD) || compDerived.mythicOptions.includes(MagyeOptionType.UNDEAD)) && !(comp as any)._undeadUsed) {
                comp.stats.hp = calculateFinalStats(comp).finalStats.maxHp;
                (comp as any)._undeadUsed = true;
                totalLog += `\n[시스템] ${comp.name}의 사망 방지 옵션 발동! 죽음의 문턱에서 부활했습니다!`;
            }
        });

        if (
            simulationEnemies.length > 0 &&
            simulationEnemies.every((e: Enemy) => e.hp <= 0) &&
            nextCharState.stats.hp > 0 &&
            (currentCombat as any)?.suddenEventType === 'rival_ambush' &&
            !(currentCombat as any)?._rivalBonusGranted
        ) {
            (currentCombat as any)._rivalBonusGranted = true;
            const lvCount = (currentCombat as any)?.suddenLevelUpCount || (Math.floor(Math.random() * 3) + 1);
            const rivalBonusExp = calculateRivalAmbushVictoryExp(nextCharState.level || 1, lvCount);
            accumulatedExp += rivalBonusExp;
            nextCharState.currentExp += rivalBonusExp;
            nextCharState.companions.forEach(c => {
                if (c.stats.hp > 0 && !c.isDead) {
                    c.currentExp += rivalBonusExp;
                }
            });
            totalLog += `\n[시스템] ⚔️ 기습 난입한 숙적을 격퇴하여 즉시 ${lvCount}레벨업 분량의 폭풍 경험치(+${rivalBonusExp.toLocaleString()} EXP)를 획득했습니다!`;
        }

        systemInjectedNarrative += totalLog;

        let { updatedChar: finalChar, leveledUp, oldLevel, leveledUpCompanions } = checkAndApplyLevelUp(nextCharState);
        let finalEnemies = simulationEnemies;
        
        const challengerComp = challengerCompanionId ? finalChar.companions.find(c => c.id === challengerCompanionId) : null;
        let isEnded = false;
        if (isOneOnOne && challengerComp) {
            isEnded = finalEnemies.every((e: Enemy) => e.hp <= 0) || (challengerComp.stats.hp <= 0 || challengerComp.isDead);
        } else {
            isEnded = finalEnemies.every((e: Enemy) => e.hp <= 0) || finalChar.stats.hp <= 0;
        }

        const isCritOccurred = totalLog.includes("(치명타!)");
        const bondGaugeIncrease = isCritOccurred ? 10 : 5;

        // 이번 턴의 메인 행동 주체(Actor) 판별
        let activeActorId: string | 'player' | null = null;
        let activeActorName: string | null = null;

        if (isCompanionCommand) {
            const compCommandMatch = actionText.match(/\[동료 (?:지시|행동|스킬):\s*(.+?)\]/);
            if (compCommandMatch) {
                const compName = compCommandMatch[1].trim();
                activeActorName = compName;
                const foundComp = finalChar.companions.find(c => c.name === compName);
                if (foundComp) {
                    activeActorId = foundComp.id;
                }
            }
        } else if (isPlayerSkill || isBasicAttack || isDefense || isBondSkill) {
            activeActorId = 'player';
            activeActorName = finalChar.name;
        }

        const newBondGauges = { ...(finalChar.bondGauges || {}) };
        // Update gauge for all bond skills involving active companions ONLY when their turn is used
        finalChar.bondSkills?.forEach(bs => {
            // Check if both participants are active (player is always active, check companions)
            const sourceComp = bs.sourceId ? finalChar.companions.find(c => c.id === bs.sourceId) : null;
            const targetComp = finalChar.companions.find(c => c.id === bs.companionId);
            
            const isSourceActive = !sourceComp || (sourceComp.stats.hp > 0 && !sourceComp.isDead);
            const isTargetActive = targetComp && (targetComp.stats.hp > 0 && !targetComp.isDead);
            
            if (isSourceActive && isTargetActive) {
                // 관련 구성원 중 한 명인지 체크
                const isPlayerInvolved = !bs.sourceId || bs.sourceId === 'player';
                const isCompanionInvolved = bs.companionId === activeActorId || bs.sourceId === activeActorId;
                
                const isNameInvolved = Boolean(activeActorName && (
                    bs.companionName === activeActorName || 
                    bs.sourceName === activeActorName ||
                    (isPlayerInvolved && activeActorName === finalChar.name)
                ));

                const isActorInvolved = (activeActorId === 'player' && isPlayerInvolved) || isCompanionInvolved || isNameInvolved;

                if (isActorInvolved) {
                    const currentGauge = newBondGauges[bs.id] || 0;
                    newBondGauges[bs.id] = Math.min(100, currentGauge + bondGaugeIncrease);
                }
            }
        });
        
        // Reset gauge if a bond skill was used
        if ((finalChar as any)._resetBondGaugeId) {
            newBondGauges[(finalChar as any)._resetBondGaugeId] = 0;
            delete (finalChar as any)._resetBondGaugeId;
        }
        
        finalChar.bondGauges = newBondGauges;

        const isRoundEnd = actionText === '[턴 종료]' || actionText === '[라운드 종료]';

        const decrementTurnStatus = (entity: any) => {
            if (!entity.statusEffects || entity.statusEffects.length === 0) return;
            const newEffects: ActiveStatus[] = [];
            entity.statusEffects.forEach((originalEffect: ActiveStatus) => {
                const effect = { ...originalEffect };
                if (typeof effect.duration !== 'number') {
                    const parsed = parseInt(String(effect.duration).replace(/[^0-9]/g, ''));
                    effect.duration = isNaN(parsed) ? 0 : parsed;
                }

                const isPassiveShield = effect.name === '마나 쉴드 (패시브)' || (effect.name === '마나 쉴드' && (Boolean((effect as any).isPassive) || (typeof effect.duration === 'number' && effect.duration >= 900)));
                const isDefenseStance = effect.name === '방어 태세' || effect.name === '방어';
                if (effect.duration > 0 && !isPassiveShield && !isDefenseStance) {
                    if (!isRealTimeElixir(effect)) {
                        effect.duration = effect.duration - 1;
                    }
                }

                if (effect.duration <= 0 && !isDefenseStance) {
                    totalLog += `\n[시스템] ${entity.name}의 ${effect.name} 버프/효과 지속시간이 종료되었습니다.`;
                } else {
                    newEffects.push(effect);
                }
            });
            entity.statusEffects = refreshBuffDiminishingStatus(newEffects);
        };

        if (isRoundEnd) {
            // [NEW] 턴 종료 시 MP 회복 및 역할별 효과 적용 (서포터/2차역할/올라운더)
            const recoverMpPerTurn = (entity: any) => {
                if (entity.stats.hp <= 0 || entity.isDead) return;
                const fStats = calculateFinalStats(entity).finalStats;
                const role = getEffectiveBattleRole(entity);
                const secRole = getEffectiveSecondaryBattleRole(entity);
                
                let recoverRate = 0;
                let roleLabel = '';
                if (secRole && secRole !== SecondaryBattleRole.NONE) {
                    if (secRole === SecondaryBattleRole.HEALER || secRole === SecondaryBattleRole.BUFFER || secRole === SecondaryBattleRole.DEBUFFER) {
                        recoverRate = 0.015; // 2차 서포터(힐러/버퍼/디버퍼): 매 라운드 1.5%
                        roleLabel = secRole;
                    } else if (secRole === SecondaryBattleRole.ALLROUNDER) {
                        recoverRate = 0.005; // 올라운더: 매 라운드 0.5%
                        roleLabel = '올라운더';
                    }
                } else if (role === BattleRole.SUPPORTER) {
                    recoverRate = 0.01; // 기본 서포터: 매 라운드 1%
                    roleLabel = '서포터';
                } else if (role === BattleRole.ALLROUNDER) {
                    recoverRate = 0.005;
                    roleLabel = '올라운더';
                }
                
                if (recoverRate > 0) {
                    const recoverAmount = Math.max(1, Math.floor(fStats.maxMp * recoverRate));
                    entity.stats.mp = Math.min(fStats.maxMp, entity.stats.mp + recoverAmount);
                    totalLog += `\n[시스템] ${entity.name} (${roleLabel} 효과) MP +${recoverAmount} 회복`;
                }
            };

            if (isOneOnOne) {
                if (challengerCompanionId) {
                    const cComp = finalChar.companions.find(c => c.id === challengerCompanionId);
                    if (cComp) recoverMpPerTurn(cComp);
                } else {
                    recoverMpPerTurn(finalChar);
                }
            } else {
                recoverMpPerTurn(finalChar);
                const processed = new Set<string>();
                finalChar.companions.forEach(c => {
                    if (!processed.has(c.id)) {
                        processed.add(c.id);
                        recoverMpPerTurn(c);
                    }
                });
            }

            totalLog += `\n[시스템] 라운드가 종료되었습니다.`;
        } else if (isEnded) {
            // [FIX] 전투 마지막 라운드 종료 처리
            if (isOneOnOne) {
                if (challengerCompanionId) {
                    const cComp = finalChar.companions.find(c => c.id === challengerCompanionId);
                    if (cComp) decrementTurnStatus(cComp);
                } else {
                    decrementTurnStatus(finalChar);
                }
            } else {
                decrementTurnStatus(finalChar);
                finalChar.companions?.forEach(c => decrementTurnStatus(c));
            }
        }

        const localLogs = totalLog.split('\n').filter(l => l.trim().startsWith('['));
        const localNarrative = CombatUtils.generateLocalCombatNarrative(actionText, localLogs, currentCombat?.type);

        setCombatState(prev => {
            const nextCombatState = {
                ...prev,
                enemies: finalEnemies,
                turn: isRoundEnd ? prev.turn + 1 : prev.turn,
                log: [...prev.log, ...localLogs],
                isEnded: isEnded,
                hasUsedItem: false,
                accumulatedExp: accumulatedExp,
                accumulatedGold: accumulatedGold,
                accumulatedLoot: accumulatedLoot
            } as any;
            combatStateRef.current = nextCombatState;
            return nextCombatState;
        });
        
        if (isEnded) {
            const speedSetting = localStorage.getItem('combat_speed') || 'normal';
            const transitionDelay = speedSetting === 'fast' ? 0 : 2200;
            
            const isVictory = finalEnemies.every((e: Enemy) => e.hp <= 0);

            if ((currentCombat?.type as any) === 'sparring_arena' || finalEnemies.some((e: Enemy) => (e as any).isSparringPartner)) {
                const sparringEnemy = finalEnemies.find((e: Enemy) => (e as any).isSparringPartner) || finalEnemies[0];
                if (sparringEnemy) {
                    const sparringRes = applySparringManualCombatResult(finalChar, sparringEnemy, isVictory);
                    finalChar = sparringRes.updatedCharacter;
                    if (sparringRes.resultLog) {
                        localLogs.push(sparringRes.resultLog);
                    }
                    if (setResultModalData && sparringRes.resultModalData) {
                        setResultModalData(sparringRes.resultModalData as any);
                    }
                }
            }
            const endBonuses = calculateRewardBonuses(finalChar);
            const activeExpBuffs: string[] = [];
            const activeGoldBuffs: string[] = [];

            const collectEntityRewardBuffs = (entity: any) => {
                if (!entity) return;
                const activeEffectsList: any[] = [
                    ...(entity.statusEffects || []),
                    ...((entity as any).consumableEffects || []),
                    ...((entity as any).activeBuffs || []),
                    ...((entity as any).buffs || [])
                ];
                activeEffectsList.forEach((e: any) => {
                    if (!e) return;
                    const text = `${e?.name || ''} ${e?.effect || ''} ${e?.description || ''}`;
                    const isDropOrMastery = text.includes('드롭') || text.includes('Drop') || text.includes('무기숙련') || text.includes('WeaponMastery') || text.includes('스킬숙련') || text.includes('SkillMastery');
                    if (isDropOrMastery) return;

                    if (text.includes('경험치') || text.toUpperCase().includes('EXP')) {
                        activeExpBuffs.push(e.name || e.effect || '경험치 버프');
                    }
                    if (text.includes('골드') || text.toUpperCase().includes('GOLD')) {
                        activeGoldBuffs.push(e.name || e.effect || '골드 버프');
                    }
                });

                if (entity.equipment) {
                    Object.values(entity.equipment).forEach((itemAny: any) => {
                        const item = itemAny as Item | undefined;
                        if (!item) return;
                        const optionsList: string[] = [
                            ...(item.secondaryOptions || []),
                            ...((item as any).options || []),
                            ...((item as any).effects || [])
                        ];
                        optionsList.forEach(opt => {
                            if (!opt || typeof opt !== 'string') return;
                            const cleanOpt = opt.replace(/[\[\]\(\)]/g, ' ').toUpperCase();
                            const isDropOrMastery = cleanOpt.includes('드롭') || cleanOpt.includes('DROP') || cleanOpt.includes('무기숙련') || cleanOpt.includes('WEAPONMASTERY') || cleanOpt.includes('스킬숙련') || cleanOpt.includes('SKILLMASTERY');
                            if (isDropOrMastery) return;

                            if (cleanOpt.includes('EXP') || cleanOpt.includes('경험치')) {
                                activeExpBuffs.push(`${item.name} (${opt})`);
                            }
                            if (cleanOpt.includes('GOLD') || cleanOpt.includes('골드')) {
                                activeGoldBuffs.push(`${item.name} (${opt})`);
                            }
                        });
                    });
                }
            };

            collectEntityRewardBuffs(finalChar);
            finalChar.companions?.forEach(collectEntityRewardBuffs);

            const suddenEvent = (isVictory && !(currentCombat as any)?.suddenEventType)
                ? rollSuddenPostCombatEvent(
                    finalChar,
                    finalEnemies,
                    accumulatedExp,
                    currentCombat?.type,
                    (currentCombat as any)?.dungeonId || finalChar.dungeonProgress?.dungeonId
                  )
                : undefined;

            const resultPayload = {
                initialStates: currentCombat?.initialParticipantStates || [],
                finalStates: createInitialParticipantStates(finalChar),
                accumulatedExp: accumulatedExp,
                accumulatedGold: accumulatedGold,
                accumulatedLoot: accumulatedLoot,
                isVictory: isVictory,
                expMultiplier: endBonuses.expMultiplier || 1.0,
                goldMultiplier: endBonuses.goldMultiplier || 1.0,
                expBonus: endBonuses.expBonus || 0,
                goldBonus: endBonuses.goldBonus || 0,
                activeExpBuffs: Array.from(new Set(activeExpBuffs)),
                activeGoldBuffs: Array.from(new Set(activeGoldBuffs)),
                combatType: currentCombat?.type,
                dungeonId: (currentCombat as any)?.dungeonId || finalChar.dungeonProgress?.dungeonId,
                suddenEvent
            };

            setTimeout(() => {
                setSceneType('normal');
                if (setCombatResultData) {
                    setCombatResultData(resultPayload);
                }
            }, transitionDelay);
            const contextType = currentCombat?.type;
            // [FIX] 전술적 목표(sourceId)가 있으면 이를 우선적으로 국가 정보로 인지
            const currentNation = (currentCombat as any).sourceId || finalChar.currentLocation?.nation;

            if (finalChar.stats.hp <= 0) {
                // [추가할 부분] 플레이어 패배 시 로직
                if (contextType === 'dungeon' || (finalChar.dungeonProgress && currentCombat?.type === 'dungeon')) {
                    finalChar.dungeonProgress = undefined;
                    setResultModalData({
                        type: 'failure',
                        title: '던전 패배 및 귀환',
                        message: '던전 전투에서 패배하여 던전 밖으로 안전하게 후송 퇴각했습니다.',
                        items: [
                            { label: '던전 진행', after: '초기화' },
                            { label: '퇴각', after: '마을로 후송' }
                        ]
                    });
                }
                if (contextType === 'tournament' && finalChar.schoolData?.currentTournament) {
                    const currentRound = finalChar.schoolData.currentTournament.currentRound;
                     finalChar.schoolData.currentTournament.isActive = false;
                if (!finalChar.schoolData.tournamentHistory) finalChar.schoolData.tournamentHistory = { schoolPlacement: 32, nationalPlacement: 64, worldPlacement: 64 };

                if (finalChar.schoolData.currentTournament.key === 'high_school') finalChar.schoolData.tournamentHistory.schoolPlacement = currentRound;
                else if (finalChar.schoolData.currentTournament.key === 'high_national') finalChar.schoolData.tournamentHistory.nationalPlacement = currentRound;
                else if (finalChar.schoolData.currentTournament.key === 'high_world') finalChar.schoolData.tournamentHistory.worldPlacement = currentRound;
            
                     finalChar.schoolData.lastTournamentDate = finalChar.currentDate?.substring(0, 7);
                     setResultModalData({
                        type: 'failure',
                        title: '토너먼트 탈락',
                        message: '아쉽게도 경기에서 패배하여 토너먼트에서 탈락했습니다.\n부상을 치료하고 내년을 기약하십시오.',
                        items: [{ label: '결과', after: '탈락 (Eliminated)' }]
                     });
                 }
                 if (contextType === 'arena' && finalChar.mercenaryData?.arenaState) {
                     finalChar.mercenaryData.arenaState.isEliminated = true;
                     setResultModalData({
                        type: 'failure',
                        title: '아레나 패배',
                        message: '그랜드 아레나의 높은 벽을 실감하며 패배했습니다.\n올해의 도전은 여기서 끝입니다.',
                        items: [{ label: '상태', after: '탈락' }]
                     });
                 }

                if (contextType === 'divine_invasion') {
                    
                    const targetNation = (currentCombat as any).sourceId;
                    finalChar.infamy = (finalChar.infamy || 0) + 100;
                    const templeKey = `${character.currentLocation?.nation}_${character.currentLocation?.city}`;
                    if (finalChar.base?.templePersonnel?.[templeKey]) {
                        finalChar.base.templePersonnel[templeKey].majesty = Math.max(0, (finalChar.base.templePersonnel[templeKey].majesty || 0) - 2000);
                    }
                    setResultModalData({
                        type: 'failure',
                        title: '침략 실패',
                        message: `신의 이름으로 감행한 ${targetNation} 침략이 실패로 돌아갔습니다.\n성전의 위엄이 실추되고 당신의 악명만 높아졌습니다.`,
                        items: [
                            { label: '악명도', after: '+100' },
                            { label: '위엄도', after: '-2000' }
                        ]
                    });
                }
 // [NEW] 성전 침공 패배 로직
                if (currentCombat?.type === 'temple_invasion') {
                    const targetTemple = (currentCombat as any).sourceId;
                    const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
                    if (myTempleCity) {
                        const myTempleNation = findNationByCityLocal(myTempleCity);
                        const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                        if (finalChar.base?.templePersonnel?.[myTempleKey]) {
                            finalChar.base.templePersonnel[myTempleKey].majesty = Math.max(0, (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 2000);
                        }
                    }
                    setResultModalData({
                        type: 'failure', title: '침공 패퇴',
                        message: `${targetTemple} 침공에 실패하여 우리 측 성전의 위엄이 크게 실추되었습니다.`,
                        items: [{ label: '위엄도 변화', after: '-2000' }]
                    });
                }

                // [NEW] 신의 반란 패배 로직
                if (currentCombat?.type === 'god_rebellion') {
                    const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
                    if (myTempleCity) {
                        const myTempleNation = findNationByCityLocal(myTempleCity);
                        const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                        if (finalChar.base?.templePersonnel?.[myTempleKey]) {
                            finalChar.base.templePersonnel[myTempleKey].majesty = Math.max(0, (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 5000);
                        }
                    }
                    setResultModalData({
                        type: 'destroy', title: '반역 실패 및 신벌',
                        message: '신의 권능 앞에 무릎을 꿇었습니다. 성전은 파멸의 위기에 처했으며 당신의 위엄은 흔적도 없이 사라졌습니다.',
                        items: [{ label: '위엄도 하락', after: '-5000' }]
                    });
                }
                if (currentCombat?.type === 'temple_defense') {
                    const targetCity = (currentCombat as any).targetCity;
                    const targetNation = (currentCombat as any).targetNation || findNationByCityLocal(targetCity);
                    const templeKey = `${targetNation}_${targetCity}`;
                    
                    if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                    if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                    if (!finalChar.base.templePersonnel[templeKey]) {
                        finalChar.base.templePersonnel[templeKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                    }

                    const tp = finalChar.base.templePersonnel[templeKey];
                    tp.majesty = Math.max(0, (tp.majesty || 0) - 500); // 패배 시 500 하락
                    
                    if (tp.majesty <= 0 && isMessengerJob(finalChar.job)) { 
                        setResultModalData({
                            type: 'destroy',
                            title: '성전 함락',
                            message: `\n[성전 함락] ${targetCity}의 위엄이 바닥에 떨어졌습니다. 신께서 당신에게 부여한 사자의 직함을 거두셨습니다.`,
                            items: [
                                { label: '직업', after: '무직' },
                            ]
                        });
                        // 사자 직업 박탈 (플레이어 혹은 동료)
                        const demote = (m: any) => {
                            const jobs = [
                                JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
                                JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
                                JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
                                JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
                                JobType.VOID_MESSENGER
                            ];
                            if (m.job && jobs.includes(m.job)) {
                                m.job = JobType.UNEMPLOYED;
                                m.classTier = ClassTier.NONE;
                            }
                        };
                        
                        demote(finalChar);
                        finalChar.companions.forEach(demote);
                        if (finalChar.inactiveCompanions) {
                             finalChar.inactiveCompanions.forEach(demote);
                        }
                        addMemory(finalChar, `${targetCity} 성전 함락 및 사자 직위 박탈`);
                    } else {
                        setResultModalData({
                            type: 'destroy',
                            title: '패전',
                            message: `[성전 패전] 방어에 실패하여 성전의 위엄도가 500 하락했습니다.`,
                            items: [
                                { label: '성전위엄도', after: -500 },
                            ]
                        });
                    }
                }
                
                if (currentCombat?.type === 'wanted_battle') {
                    const escapeRoll = Math.random();
                    if (escapeRoll < 0.02) { // 2% 확률 기적적 탈출
                        finalChar.stats.hp = 1;
                        finalChar.statusEffects = [];
                        // ... 탈출 서사 및 ResultModal 설정
                    } else {
                        // 체포 및 투옥 로직
                        const currentInfamy = finalChar.infamy || 0;
                        const jailDays = currentInfamy * 40;
                        const releaseDate = addDays(finalChar.currentDate || START_DATE, jailDays);
                        
                        finalChar.currentDate = releaseDate;
                        finalChar.infamy = 0; // 악명 초기화
                        finalChar.stats.hp = finalChar.stats.maxHp;
                        finalChar.stats.mp = finalChar.stats.maxMp;
                        finalChar.statusEffects = [];
                        
                        // 동료들도 회복 및 대기 상태로
                        finalChar.companions = finalChar.companions.map(c => ({
                            ...c,
                            stats: { ...c.stats, hp: c.stats.maxHp, mp: c.stats.maxMp },
                            statusEffects: []
                        }));

                        // ResultModal에 투옥 정보 설정
                        setResultModalData({
                            type: 'destroy',
                            title: '체포 및 투옥',
                            message: `패배하여 관군에게 체포되었습니다. ${jailDays}일간 복역 후 출소했습니다.`,
                            items: [
                                { label: '수감 기간', after: `${jailDays}일` },
                                { label: '출소일', after: releaseDate },
                                { label: '악명도', before: currentInfamy, after: '0' }
                            ]
                        });
                    }
                }
 // [NEW] 마계의 성전 정벌 패배
                if (contextType === 'magye_temple_invasion' || contextType === 'magye_god_slaying') {
                    if (finalChar.magyeDominions) {
                        Object.values(finalChar.magyeDominions).forEach(dom => {
                            dom.fear = Math.max(0, dom.fear - 3000);
                        });
                    }
                    addToLog(`[패전] 신의 권능 앞에 제국군이 퇴각했습니다. 지배지의 공포도가 하락하고 반란 기운이 감돕니다.`);
                }
                // [NEW] 전쟁(공격/방어) 패배 시 점유율 하락 및 속국 전환 판정
                if (currentNation && (contextType === 'war_raid' || contextType === 'war_defend')) {
                    if (finalChar.militaryData?.diplomacy?.[currentNation]) {
                        const rel = finalChar.militaryData.diplomacy[currentNation];
                        rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
                        
                        // 즉시 속국 전환 체크
                        const transitionedRel = checkVassalTransition(rel, finalChar.currentDate);
                        finalChar.militaryData.diplomacy[currentNation] = transitionedRel;

                        if (transitionedRel.status === DiplomaticStatus.VASSAL_SUBJECT) {
                            setResultModalData({
                                type: 'destroy',
                                title: '패전 및 속국 전락',
                                message: `적군에게 완전히 패배하여 전선이 붕괴되었습니다.\n이제 조국은 ${currentNation}의 지배 아래 놓이게 되었습니다.`,
                                items: [
                                    { label: '전선 점유율', after: '-100%' },
                                    { label: '국가 상태', after: '속국 (Subject)' }
                                ]
                            });
                        } else {
                            setResultModalData({
                                type: 'failure',
                                title: '전선 패배',
                                message: `전투에서 패배하여 후퇴했습니다.\n적들이 우리 영토의 상당 부분을 장악했습니다.`,
                                items: [{ label: '점유율 변동', after: '-10% (후퇴)' }]
                            });
                        }
                    }
                }
            }
            
            if (isVictory) {
                // 실전 전투 승리로 역할 유지 및 숙련도 상승
                const processVictoryRole = (entity: Character | Companion) => {
                    const role = entity.battleRole;
                    if (!role || role === BattleRole.NONE) return;
                    if (!entity.roleInactivityDays) entity.roleInactivityDays = {};
                    entity.roleInactivityDays[role] = 0;
                    if (!entity.roleProficiency) entity.roleProficiency = {};
                    const curProf = entity.roleProficiency[role] || 0;
                    if (curProf < 100) {
                        entity.roleProficiency[role] = Math.min(100, curProf + 1);
                    }
                };
                processVictoryRole(finalChar);
                if (!isOneOnOne) {
                    finalChar.companions.forEach(processVictoryRole);
                }

            if (contextType === 'divine_invasion' && currentNation) {

                    const divineRel = finalChar.templeDiplomacy?.[currentNation];
                    const isJustConquest = (divineRel?.tension || 0) < 100;
                    if (isJustConquest) {
                        finalChar.infamy = (finalChar.infamy || 0) + 200;
                        const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
                        if (myTempleCity) {
                            const myTempleNation = findNationByCityLocal(myTempleCity);
                            const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                            if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                            if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                            if (!finalChar.base.templePersonnel[myTempleKey]) finalChar.base.templePersonnel[myTempleKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                            finalChar.base.templePersonnel[myTempleKey].majesty = Math.max(0, (finalChar.base.templePersonnel[myTempleKey].majesty || 0) - 500);
                        }
                    }
                    if (!finalChar.templeDiplomacy) finalChar.templeDiplomacy = {};
                    finalChar.templeDiplomacy[currentNation] = { status: DivineDiplomacyStatus.SUBJUGATED, faithPoints: 0, tension: 0, influence: 100, subjugatedYears: 5, subjugatedStartDate: finalChar.currentDate, subjugatedEndDate: addDays(finalChar.currentDate || '2000-01-01', 1825), tributeLevel: 1 };
                    if (finalChar.militaryData?.diplomacy?.[currentNation]) {
                        const rel = finalChar.militaryData.diplomacy[currentNation]; rel.status = DiplomaticStatus.VASSAL_OWNER; rel.occupation = 100; rel.tension = 100; rel.vassalYearsRemaining = VASSAL_DURATION_YEARS; rel.vassalStartDate = finalChar.currentDate; rel.vassalEndDate = addDays(finalChar.currentDate || '2000-01-01', 1825); rel.lastEvent = `사자의 위엄으로 ${currentNation}의 지도자를 굴복시켰습니다.`;
                    }
                    const rawGoldLoot = finalChar.level * 10000; 
                    const bonuses = calculateRewardBonuses(finalChar);
                    const goldLoot = Math.floor(rawGoldLoot * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0));
                    finalChar.money += goldLoot;
                    const relicData = NATION_RELICS[currentNation] || NATION_RELICS["대한민국"]; finalChar.inventory.push({ ...relicData, name: `[약탈됨] ${relicData.name}`, enhancement: 0 } as Item);
                    addMemory(finalChar, `${currentNation} 신성 정벌 성공 및 속국화`);
                    setResultModalData({ type: 'levelup', title: '신성 정벌 성공', message: `${currentNation}을(를) 무력으로 완전히 굴복시켰습니다.\n이제 해당 국가는 5년간 당신의 지배 아래 조공을 바칠 것입니다.\n(점령지로 이동했습니다.)${isJustConquest ? '\n(침략 행위로 인해 악명이 상승하고 성전의 위엄이 실추되었습니다.)' : ''}`, items: [ { label: '외교 상태', after: '종주국 (Owner)' }, { label: '약탈 골드', after: `+${goldLoot.toLocaleString()} G` }, { label: '획득 유물', after: relicData.name }, ...(isJustConquest ? [ { label: '악명 상승', after: '+200' }, { label: '성전 위엄도', after: '-500' } ] : []) ] });
                }

       // [NEW] 마계의 성전 정벌 승리
                if (contextType === 'magye_temple_invasion') {
                    const targetTemple = (combatState as any).sourceId;
                    // 지배지 공포도/타락도 폭등
                    if (finalChar.magyeDominions) {
                        Object.values(finalChar.magyeDominions).forEach(dom => {
                            dom.fear = Math.min(10000, dom.fear + 5000);
                            dom.corruption = Math.min(10000, dom.corruption + 2000);
                        });
                    }
                    
                    setPendingTempleConquest(targetTemple);
                    setResultModalData({
                        type: 'levelup',
                        title: '성전 정복 성공',
                        message: `신의 사자를 굴복시키고 성전을 마계의 영토로 편입했습니다.`,
                        items: [
                            { label: '공포도 상승', after: '+5000' },
                            { label: '타락도 상승', after: '+2000' }
                        ]
                    });
                    addToLog(`[승전] ${targetTemple}의 신성을 파괴하고 마계의 깃발을 꽂았습니다.`);
                }



    // [NEW] 마계의 신 살해 승리
                if (contextType === 'magye_god_slaying') {
                    finalChar.isGodDefeated = true;
                    finalChar.job = JobType.DEMON_GOD;
                    finalChar.classTier = ClassTier.FINAL;
                    
                    // 초월적 보상
                    const bonus = DIVINE_WAR_CONSTANTS.GOD_SUCCESS_STAT_BONUS;
                    finalChar.stats.str += bonus;
                    finalChar.stats.int += bonus;
                    finalChar.stats.wis += bonus;
                    finalChar.stats.def += bonus;
                    finalChar.stats.agi += bonus;
                    finalChar.stats.ctrl += bonus;
                    finalChar.stats.maxHp += bonus * 10;
                    finalChar.stats.hp = finalChar.stats.maxHp;
                    finalChar.infamy = 99999; // 세계의 적

                    if (finalChar.magyeDominions) {
                        Object.values(finalChar.magyeDominions).forEach(dom => {
                            dom.fear += 10000;
dom.corruption += 10000;
                        });
                    }

                    setResultModalData({
                        type: 'levelup',
                        title: '신좌 찬탈 (God Slayer)',
                        message: '절대신 엘라를 처단하고 스스로 마계의 신이 되었습니다. 이제 이 세계에 당신을 막을 자는 없습니다.',
                        items: [
                            { label: '변경된 직업', after: '태초의 마신' },
                            { label: '초월적 능력치', after: `+${bonus.toLocaleString()}` },
                            { label: '악명도', after: '99,999 (MAX)' }
                        ]
                    });
                    addToLog(`[종말] 절대신이 소멸했습니다. 이제 마계의 법이 곧 세계의 물리 법칙이 됩니다.`);
                }
          
               

 
                // [NEW] 토너먼트 및 아레나 승리 시 로컬 처리 및 모달 호출 (AI 미개입)
                if (contextType === 'tournament' || contextType === 'arena') {
                    setSceneType('normal');
                    
                    let resultTitle = "";
                    let resultMsg = "";
                    let resultItems: any[] = [];

                    let currentRoundLabel = "경기";
                    if (contextType === 'tournament' && finalChar.schoolData?.currentTournament) {
                        const tournament = finalChar.schoolData.currentTournament;
                        const currentRound = tournament.currentRound;
                        currentRoundLabel = currentRound === 2 ? "결승전" : `${currentRound}강`;
                        const nextRound = currentRound / 2;

                        if (nextRound >= 1) {
                            tournament.currentRound = nextRound === 1 ? 0 : nextRound;
                            if (nextRound > 1) {
                                let scope: 'School' | 'National' | 'World' = 'School';
                                if (tournament.key === 'high_school') scope = 'School';
                                if (tournament.key === 'high_national') scope = 'National';
                                if (tournament.key === 'high_world') scope = 'World';
                                
                                const schoolNation = (finalChar.schoolData?.schoolLocation as any)?.nation || finalChar.currentLocation?.nation || finalChar.nation || "대한민국";
                                const bracketData = generateTournamentBracket(schoolNation, nextRound, finalChar.name, scope);
                                tournament.opponentName = bracketData.opponentName;
                                
                                const nextRoundLabel = nextRound === 2 ? "결승전" : `${nextRound}강`;
                                resultTitle = nextRound === 2 ? "토너먼트 결승전 진출!" : "토너먼트 승리!";
                                resultMsg = `${nextRoundLabel} 진출 성공! 다음 상대는 ${tournament.opponentName}입니다.`;
                                resultItems = [{ label: '진출 단계', after: nextRoundLabel }];
                            } else {
                                // 우승 처리
                                const { exp: rawExp, gold: rawGold } = tournament.reward || { exp: 0, gold: 0 };
                                const bonuses = calculateRewardBonuses(finalChar);
                                const expMultiplier = bonuses.expMultiplier || 1.0;
                                const goldMultiplier = bonuses.goldMultiplier || 1.0;
                                const exp = Math.floor(rawExp * (1 + bonuses.expBonus / 100) * expMultiplier);
                                const gold = Math.floor(rawGold * (1 + bonuses.goldBonus / 100) * goldMultiplier);
                                
                                finalChar.money += gold;
                                finalChar.schoolData.lastTournamentDate = finalChar.currentDate?.substring(0, 7);
                                tournament.currentRound = 0;
                                tournament.isActive = false;
                                            
                                if (!finalChar.schoolData.tournamentHistory) {
                                    finalChar.schoolData.tournamentHistory = { schoolPlacement: 0, nationalPlacement: 0, worldPlacement: 0 };
                                }

                                // 우승(1위) 기록을 남긴다
                                if (tournament.key === 'high_school') finalChar.schoolData.tournamentHistory.schoolPlacement = 1;
                                else if (tournament.key === 'high_national') finalChar.schoolData.tournamentHistory.nationalPlacement = 1;
                                else if (tournament.key === 'high_world') finalChar.schoolData.tournamentHistory.worldPlacement = 1;

                                // 우승 경험치 및 상금 즉시 지급 및 레벨업 반영
                                finalChar.currentExp += exp;
                                finalChar.money += gold;
                                const initialLevel = finalChar.level;
                                const { updatedChar: leveledWinnerChar, leveledUp } = checkAndApplyLevelUp(finalChar);
                                finalChar = leveledWinnerChar;

                                resultTitle = "토너먼트 최종 우승!";
                                resultMsg = `학교의 전설이 되었습니다! 우승 경험치 +${exp.toLocaleString()} EXP와 상금 +${gold.toLocaleString()} G가 지급되었습니다.` + (leveledUp ? ` (축하합니다! Lv.${initialLevel} ➔ Lv.${finalChar.level} 레벨업!)` : '');
                                resultItems = [
                                    { label: '우승 상금', after: `+${gold.toLocaleString()} G` },
                                    { label: '우승 경험치', after: `+${exp.toLocaleString()} EXP` },
                                    ...(leveledUp ? [{ label: '레벨 업!', after: `Lv.${initialLevel} ➔ Lv.${finalChar.level}` }] : []),
                                    { label: '현재 경험치', after: `${finalChar.currentExp.toLocaleString()} / ${finalChar.maxExp.toLocaleString()} EXP` }
                                ];
                                addMemory(finalChar, `${tournament.name} 최종 우승`);
                            }
                        }
                    } 
                    else if (contextType === 'arena' && finalChar.mercenaryData?.arenaState) {
                        const arena = finalChar.mercenaryData.arenaState;
                        const currentRound = arena.currentRound;
                        currentRoundLabel = currentRound === 1 ? "결승전" : `${currentRound}강`;
                        const nextRound = currentRound / 2;

                        if (currentRound === 1) {
                            arena.currentRound = 0;
                            finalChar.mercenaryData.reputation += 1000;
                            const bonuses = calculateRewardBonuses(finalChar);
                            const arenaGold = Math.floor(500000 * (1 + bonuses.goldBonus / 100) * (bonuses.goldMultiplier || 1.0));
                            finalChar.money += arenaGold;
                            
                            resultTitle = "그랜드 아레나 우승!";
                            resultMsg = "축하합니다! 전 세계 용병들의 정점, 올해의 챔피언에 등극했습니다!";
                            resultItems = [
                                { label: '챔피언 등극', after: 'CHAMPION' },
                                { label: 'RP 상승', after: '+1000' },
                                { label: '우승 상금', after: `${arenaGold.toLocaleString()} G` }
                            ];
                        } else {
                            arena.currentRound = nextRound === 1 ? 1 : nextRound;
                            finalChar.mercenaryData.reputation += 100;
                            
                            resultTitle = "아레나 경기 승리";
                            resultMsg = `${nextRound === 1 ? '결승' : nextRound + '강'} 진출에 성공했습니다!`;
                            resultItems = [{ label: '명성 상승', after: '+100 RP' }];
                        }
                    }

                    // 토너먼트/아레나 경기 후 상대와의 인연 선택 모달 데이터 등록
                    const defeatedOpponent = finalEnemies[0] || {};
                    const opponentName = (defeatedOpponent.name || '상대 선수').replace(/^\[아레나\]\s*/, '');
                    const postMatchData: TournamentPostMatchData = {
                        tournamentType: contextType === 'tournament' ? 'school' : 'arena',
                        tournamentName: contextType === 'tournament' 
                            ? (finalChar.schoolData?.currentTournament?.name || '학교 토너먼트')
                            : '그랜드 아레나',
                        roundLabel: currentRoundLabel,
                        opponent: {
                            id: defeatedOpponent.id || `opponent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: opponentName,
                            level: defeatedOpponent.level || 10,
                            gender: (defeatedOpponent as any).gender || 'male',
                            race: (defeatedOpponent as any).race || '인간',
                            nation: (defeatedOpponent as any).nation || finalChar.currentLocation?.nation || finalChar.nation || '대한민국',
                            stats: defeatedOpponent.stats,
                            shinryokuType: defeatedOpponent.shinryokuType || '무속성',
                            combatStyle: (defeatedOpponent as any).combatStyle,
                            job: (defeatedOpponent as any).job || (contextType === 'tournament' ? JobType.STUDENT : JobType.MERCENARY),
                            mercenaryRank: (defeatedOpponent as any).mercenaryRank,
                            visualUrl: (defeatedOpponent as any).visualUrl,
                            description: defeatedOpponent.description
                        }
                    };
                    setPendingTournamentPostMatch(postMatchData);

                    setResultModalData({
                        type: 'success',
                        title: resultTitle,
                        message: resultMsg,
                        items: resultItems
                    });
                    
                    setCharacterSafe(finalChar);
                    setMessages(prev => [...prev, { role: 'ai', text: `[시스템] ${resultTitle} ${resultMsg}` }]);
                    setIsLoading(false);
                    return; // AI에게 결과를 보내지 않고 리턴
                }

                if (currentCombat?.type === 'war_defend') {
                    const defenseNation = (currentCombat as any).defenseNation;
                    if (defenseNation && finalChar.militaryData) {
                        finalChar.militaryData.pendingInvasions = finalChar.militaryData.pendingInvasions?.filter(n => n !== defenseNation);
                    }
                }
                
                if (currentCombat?.type === 'exam_mid' || currentCombat?.type === 'exam_final') {
                    if (finalChar.schoolData) {
                        const isMid = currentCombat.type === 'exam_mid';
                        if (isMid) finalChar.schoolData.midtermPassed = true;
                        else finalChar.schoolData.finalPassed = true;
                        finalChar.schoolData.lastExamDate = finalChar.currentDate?.substring(0, 7);
                        const examName = isMid ? "중간고사" : "학말고사";
                           setResultModalData({ type: 'success', title: '시험 통과!', message: '\n[시스템] 축하합니다! 시험에 합격(PASS) 하셨습니다.', items: [ { label: examName, after: '통과' } ] });
                        totalLog += `\n[시스템] 축하합니다! ${examName}에 합격(PASS) 하셨습니다.`;
                    }
                }

                if (currentCombat?.type === 'final_trial_battle' && isVictory) {
                    const challengerId = currentCombat.challengerCompanionId;
                    const trialTier: ClassTier = (currentCombat as any).trialTier || ClassTier.FINAL;
                    const tierName = trialTier === ClassTier.FIRST ? "퍼스트 클래스" :
                                     trialTier === ClassTier.SECOND ? "세컨드 클래스" :
                                     trialTier === ClassTier.LAST ? "라스트 클래스" : "파이널 클래스";

                    if (challengerId) {
                        const updateComp = (c: Companion) => {
                            if (c.id !== challengerId) return c;
                            const updated = { ...c };
                            if (trialTier === ClassTier.FIRST) {
                                updated.hasClearedFirstTrial = true;
                                updated.firstTrialCleared = true;
                            } else if (trialTier === ClassTier.SECOND) {
                                updated.hasClearedSecondTrial = true;
                                updated.secondTrialCleared = true;
                            } else if (trialTier === ClassTier.LAST) {
                                updated.hasClearedLastTrial = true;
                                updated.lastTrialCleared = true;
                            } else {
                                updated.hasClearedFinalTrial = true;
                                updated.finalTrialCleared = true;
                            }
                            return updated;
                        };

                        finalChar.companions = finalChar.companions.map(updateComp);
                        if (finalChar.inactiveCompanions) {
                            finalChar.inactiveCompanions = finalChar.inactiveCompanions.map(updateComp);
                        }

                        const targetComp = finalChar.companions.find(c => c.id === challengerId) ||
                                           finalChar.inactiveCompanions?.find(c => c.id === challengerId);
                        const compName = targetComp?.name || '커스텀 동료';

                        totalLog += `\n[시련 승보] 커스텀 동료 [${compName}]이(가) 1:1 결투에서 승리하여 ${tierName} 해방 자격을 쟁취했습니다!`;
                        setResultModalData({
                            type: 'levelup',
                            title: `${tierName} 시련 통과! [${compName}]`,
                            message: `[시련 극복] 커스텀 동료 [${compName}]이(가) 홀로 1:1 결투에서 신의 사자 모형을 격퇴하여 [${tierName}] 해방 자격을 증명했습니다!\n이제 동료 정보창의 '해방' 탭에서 즉시 클래스를 해방할 수 있습니다.`,
                            items: [
                                { label: '도전자', after: compName },
                                { label: '통과 시련', after: `${tierName} 1:1 결투` },
                                { label: '해방 자격', after: '취득 완료 (해방 가능)' }
                            ]
                        });
                    } else {
                        if (trialTier === ClassTier.FIRST) {
                            finalChar.hasClearedFirstTrial = true;
                            finalChar.firstTrialCleared = true;
                        } else if (trialTier === ClassTier.SECOND) {
                            finalChar.hasClearedSecondTrial = true;
                            finalChar.secondTrialCleared = true;
                        } else if (trialTier === ClassTier.LAST) {
                            finalChar.hasClearedLastTrial = true;
                            finalChar.lastTrialCleared = true;
                        } else {
                            finalChar.hasClearedFinalTrial = true;
                            finalChar.finalTrialCleared = true;
                        }

                        totalLog += `\n[시련 승보] ${finalChar.name}이(가) 1:1 결투에서 승리하여 ${tierName} 해방 자격을 쟁취했습니다!`;
                        setResultModalData({
                            type: 'levelup',
                            title: `${tierName} 시련 통과!`,
                            message: `[시련 극복] 1:1 사투 끝에 신의 사자 모형을 격파하고 자신의 영혼의 잠재력을 입증했습니다!\n이제 [${tierName}] 잠재력 해방을 진행할 수 있습니다.`,
                            items: [
                                { label: '도전자', after: finalChar.name },
                                { label: '통과 시련', after: `${tierName} 1:1 결투` },
                                { label: '해방 자격', after: '취득 완료 (해방 가능)' }
                            ]
                        });
                    }
                }

                // [MODIFIED] 로컬 전투 시뮬레이션 종료 시 라이벌/학생 결과 즉시 판정 로직 강화
                if (currentCombat?.type === 'tournament' || actionText.includes('(대련)') || actionText.includes('(결투)')) {
                    const opponentNameRaw = finalEnemies[0].name;
                    const opponentName = opponentNameRaw.replace(/\[.*?\]\s*/g, '').trim();
                    const student = finalChar.schoolData?.classmates.find(s => 
                        s.name === opponentName || opponentName.includes(s.name)
                    );
                    
                    if (student) {
                        if (student.isRival && isVictory) {
                            // 라이벌 승리 시 결과 선택 모달 트리거
                            setPendingRelationResolution({ targetId: student.id, enemy: finalEnemies[0] });
                        } else {
                            // 일반 학생 승리 시 호감도 즉시 반영
                            finalChar.schoolData!.classmates = finalChar.schoolData!.classmates.map(s => {
                                if (s.id === student.id) {
                                    return { 
                                        ...s, 
                                        affection: Math.min(100, s.affection + 5),
                                        respect: Math.min(100, (s.respect || 0) + 5) 
                                    }
                                }
                                return s;
                            });
                            setResultModalData({ type: 'success', title: '호감도 상승!', message: '친구와 대련하며 호감도가 상승하였습니다.', items: [ { label: '호감도', after: '+5' } ] });
                        }
                    }
                }
              
// [NEW] 성전 침공 승리 로직
                if (contextType === 'temple_invasion') {
                    const targetTemple = (currentCombat as any).sourceId;
                    const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
                    if (myTempleCity) {
                        const myTempleNation = findNationByCityLocal(myTempleCity);
                        const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                        if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                        if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                        if (!finalChar.base.templePersonnel[myTempleKey]) finalChar.base.templePersonnel[myTempleKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                        finalChar.base.templePersonnel[myTempleKey].majesty = (finalChar.base.templePersonnel[myTempleKey].majesty || 0) + 1000;
                    }
      setPendingTempleConquest((currentCombat as any).sourceId);
                    setResultModalData({
                        type: 'levelup', title: '성전 함락 성공',
                        message: `${targetTemple}을(를) 함락시켰습니다. 이제 이 성전의 자원을 약탈하거나 대원들을 끌고 올 수 있습니다.`,
                        items: [{ label: '위엄도 상승', after: '+1000' }]
                    });
                }

                // [NEW] 신의 반란 승리 로직
                if (contextType === 'god_rebellion') {
                    const myTempleCity = GET_CITY_BY_MESSENGER_JOB[finalChar.job as JobType];
                    if (myTempleCity) {
                        const myTempleNation = findNationByCityLocal(myTempleCity);
                        const myTempleKey = `${myTempleNation}_${myTempleCity}`;
                        if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                        if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                        if (!finalChar.base.templePersonnel[myTempleKey]) finalChar.base.templePersonnel[myTempleKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                        finalChar.base.templePersonnel[myTempleKey].majesty = (finalChar.base.templePersonnel[myTempleKey].majesty || 0) + 2000;
                    }
                    
                    finalChar.isGodDefeated = true;
                    const bonus = 100000;
                    finalChar.stats.str += bonus;
                    finalChar.stats.int += bonus;
                    finalChar.stats.wis += bonus;
                    finalChar.stats.def += bonus;
                    finalChar.stats.agi += bonus;
                    finalChar.stats.ctrl += bonus;
                    finalChar.stats.maxHp += bonus * 10;
                    finalChar.stats.maxMp += bonus * 10;
                    finalChar.stats.hp = finalChar.stats.maxHp;
                    finalChar.stats.mp = finalChar.stats.maxMp;

                    addMemory(finalChar, "절대신 엘라를 처단하고 신좌를 찬탈함.");

                    setResultModalData({
                        type: 'levelup', title: '★ 신좌 찬탈 대성공 ',
                        message: '절대신 엘라를 쓰러뜨리고 새로운 세계의 질서를 세웠습니다.\n당신은 이제 신의 권능을 온전히 손에 넣었습니다.',
                        items: [
                            { label: '위엄도 상승', after: '+2000' },
                            { label: '전 능력치 보너스', after: `+${bonus.toLocaleString()}` },
                            { label: '상태', after: '신으로 승격(현 신의 사자 직책은 유지)' }
                        ]
                    });
                }
                if (currentNation && (contextType === 'war_raid' || contextType === 'war_defend')) {
                    const rel = finalChar.militaryData!.diplomacy![currentNation];
                    const leaderDefeated = finalEnemies.some(e => e.name.includes('[국가 지도자]') && e.hp <= 0);

                    if (leaderDefeated) {
                        rel.status = DiplomaticStatus.VASSAL_OWNER;
                        rel.occupation = 100;
                        rel.tension = 0;
                        rel.vassalYearsRemaining = VASSAL_DURATION_YEARS;
                        rel.vassalStartDate = finalChar.currentDate; 
                        rel.vassalEndDate = addDays(finalChar.currentDate || '2000-01-01', 1825);
                        rel.lastEvent = `지도자 항복. 우리 측의 완전한 승리로 기록됩니다.`;
                        
                        setTimeout(() => {
                            addToLog(`[긴급 타전] 대첩! ${currentNation}의 지도자가 패배를 인정하고 항복을 선언했습니다. 해당 국가는 이제 우리의 속국이 되었습니다.`);
                        }, 100);
                        addMemory(finalChar, `${currentNation} 정벌 및 속국화 성공`);

                        setResultModalData({
                            type: 'levelup',
                            title: '국가 정벌 성공 (Vassalized)',
                            message: `${currentNation}의 지도자를 굴복시키고 전쟁에서 완전히 승리했습니다!\n이제 해당 국가는 5년간 우리의 지배를 받으며 조공을 바칠 것입니다.`,
                            items: [
                                { label: '대상 국가', after: currentNation },
                                { label: '외교 상태', before: '전쟁', after: '종주국 (Owner)' },
                                { label: '지배 기간', after: `${VASSAL_DURATION_YEARS}년` }
                            ]
                        });
                    } else {
                        const todayStr = finalChar.currentDate || '2000-01-01';
                        const isRaid = contextType === 'war_raid';
                        const alreadyGainedRaidOccupationToday = isRaid && rel.lastRaidOccupationDate === todayStr;

                        if (alreadyGainedRaidOccupationToday) {
                            setResultModalData({ 
                                type: 'success', 
                                title: '전투 승리!', 
                                message: '\n[시스템] 적 거점을 소탕하고 승리했습니다!\n(전선 습격 점유율은 하루에 1회만 획득할 수 있어 점유율이 추가로 상승하지 않았습니다.)', 
                                items: [ 
                                    { label: '현재 점유율', after: `${rel.occupation || 0}%` }, 
                                    { label: '점유율 변동', after: '0% (일일 1회 제한)' } 
                                ] 
                            });
                            totalLog += `\n[전보] 승전! ${currentNation} 거점 소탕 완료. (전선 습격 점유율은 하루 1회만 획득 가능하여 추가 점유율 상승은 없습니다.)`;
                        } else {
                            if (isRaid) {
                                rel.lastRaidOccupationDate = todayStr;
                            }
                            const commanderInfo = getCommanderInfo(); 
                            let occGain = 1; 
                            if (finalChar.job === JobType.DEMON_GOD) {
                                occGain = 15; // 마신: 15%
                            } else if (finalChar.job?.toString().includes('제너럴')) {
                                occGain = 10; // 제너럴: 10%
                            } else {
                                if (commanderInfo) {
                                    const rIdx = commanderInfo.rankIdx;
                                    if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG)) occGain = 5; 
                                    else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ)) occGain = 4;  
                                    else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT)) occGain = 3;  
                                    else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SSG)) occGain = 2;  
                                }
                            }
                            
                            rel.occupation = Math.min(100, (rel.occupation || 0) + occGain);
                            
                            // 즉시 속국 전환 체크 (승리 시)
                            const transitionedRel = checkVassalTransition(rel, finalChar.currentDate);
                            finalChar.militaryData!.diplomacy![currentNation] = transitionedRel;

                            setResultModalData({ type: 'success', title: '전투 승리!', message: '\n[시스템] 축하합니다! 전쟁에서 승리 하셨습니다.', items: [ { label: '현재 점유율(%)', after:  transitionedRel.occupation+'%'  } ] });
                            totalLog += `\n[전보] 승전보! ${currentNation} 전선 점유율 ${occGain}% 상승! (현재: ${transitionedRel.occupation}%)`;
                        }
                    }
                }

                if (currentCombat?.type === 'bounty_hunt') {
                    const criminalEnemy = finalEnemies.find((e: any) => e.isBountyTarget);
                    if (criminalEnemy && finalChar.mercenaryData) {
                        finalChar.mercenaryData.pendingCriminal = criminalEnemy.criminalData;
                    }
                }
                if (currentCombat?.type === 'wanted_battle') {
                    finalChar.wantedClearanceCity = character.currentLocation?.city;
                }
                if (currentCombat?.type === 'temple_defense') {
                    const source = (currentCombat as any).defenseSource; 
                    const targetCity = (currentCombat as any).targetCity;
                    const targetNation = (currentCombat as any).targetNation || findNationByCityLocal(targetCity);
                    const templeKey = `${targetNation}_${targetCity}`;

                    let majestyGain = 100; // 기본 상승치
                    if (source === '마신' || source === '타락한 신성') majestyGain = 1000;
                    else if (source === '마계' || source === '타 성전') majestyGain = 500;

                    if (!finalChar.base) finalChar.base = { ...INITIAL_BASE };
                    if (!finalChar.base.templePersonnel) finalChar.base.templePersonnel = {};
                    if (!finalChar.base.templePersonnel[templeKey]) {
                        finalChar.base.templePersonnel[templeKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                    }
                    
                    const tp = finalChar.base.templePersonnel[templeKey];
                    tp.majesty = (tp.majesty || 0) + majestyGain;
                      totalLog += `\n[성전 승보] 외적을 격퇴하여 '${targetCity}'의 위엄도가 ${majestyGain} 상승했습니다! (현재: ${tp.majesty})`;
                     setResultModalData({
                         type: 'levelup',
                         title: '침공 격퇴',
                         message: `외적을 격퇴하여 '${targetCity}'의 위엄도가 '${majestyGain}' 상승했습니다.`,
                         items: [
                             { label: '대상 국가', after: targetCity },
                             { label: '현재 위엄도', after: calculateTempleMajesty },
                         ]
                     });
                }
            }
        }


            setCharacterSafe(finalChar);
            if (isEnded) {
                setMessages(prev => [...prev, { role: 'ai', text: localNarrative }]);
            }
            setIsLoading(false);
            return; 
        } catch (combatExecError) {
            console.error('[Combat] 전투 처리 도중 예외가 발생하여 긴급 복구되었습니다:', combatExecError);
            setIsLoading(false);
            return;
        }
    }

    try {
        const { updatedChar: preSendState, leveledUp, oldLevel, leveledUpCompanions } = checkAndApplyLevelUp(nextCharState);
        if (leveledUp || leveledUpCompanions.length > 0) {
            let message = "";
            if (leveledUp) message += `${preSendState.name}이(가) 레벨 ${oldLevel}->${preSendState.level}이(가) 되었습니다! `;
            if (leveledUpCompanions.length > 0) message += `${leveledUpCompanions.map(c => `${c.companion.name}(${c.oldLevel}->${c.companion.level})`).join(', ')}이(가) 레벨업했습니다!`;
            setResultModalData({
                type: 'levelup',
                title: "레벨업!",
                message: message,
                items: []
            });
        }
        const response = await sendPlayerAction(actionText, preSendState, currentCombat);
        let nextSceneType = response.sceneType || sceneType;
        let updatedCombatState = response.combatState || { enemies: [], turn: 0, log: [], isEnded: false };
        
        if ( nextSceneType === 'combat') {
            updatedCombatState.type = combatState.type;
            updatedCombatState.rewards = combatState.rewards;
            // [FIX] Preserve important metadata to prevent data loss (e.g. targetNation during Divine Invasion)
            (updatedCombatState as any).sourceId = (combatState as any).sourceId;
            (updatedCombatState as any).defenseSource = (combatState as any).defenseSource;
            (updatedCombatState as any).targetCity = (combatState as any).targetCity;
            (updatedCombatState as any).targetNation = (combatState as any).targetNation;
        }

        let playerUpdated = false; let goldUpdated = false; let modifiedCompanionIndices = new Set<number>();
        let updatedEnemies: Enemy[] = [];
        
        let updatedCompanions: Companion[] = timeAdvancedChar.companions.map((c, i) => ({ 
            ...c, 
            stats: { ...c.stats }, 
            skills: [...c.skills], 
            statusEffects: nextCharState.companions[i]?.statusEffects || c.statusEffects 
        }));
        
        let updatedChar: Character = { 
            ...nextCharState,
            stats: {
                ...nextCharState.stats,
                hp: charForReconcile.stats.hp,
                mp: charForReconcile.stats.mp
            },
            inventory: charForReconcile.inventory
        };
        
        updatedCompanions = nextCharState.companions.map((c, i) => {
            const original = charForReconcile.companions.find(orig => orig.id === c.id) || charForReconcile.companions.find(orig => orig.name === c.name) || charForReconcile.companions[i];
            if (!original) return c;
            return {
                ...c,
                name: original.name || c.name,
                stats: {
                    ...c.stats,
                    hp: original.stats?.hp !== undefined ? original.stats.hp : c.stats.hp,
                    mp: original.stats?.mp !== undefined ? original.stats.mp : c.stats.mp
                }
            };
        });
        
        if (nextSceneType === 'combat') { 
            const incomingEnemies = updatedCombatState.enemies || [];
            updatedEnemies = CombatUtils.reconcileEnemies(enemiesForReconcile, incomingEnemies, character.level); 
        } 
        else if (nextSceneType === 'normal' && combatState.enemies.length > 0) { updatedEnemies = combatState.enemies; }

        const localLogs = systemInjectedNarrative.split('\n').filter(l => l.trim().startsWith('['));
        const aiLogs = CombatUtils.extractLogsFromNarrative(response.narrative); 
        const uniqueAiLogs = aiLogs.filter(aiLog => {
            const normalizedAi = aiLog.trim();
            return !localLogs.some(local => local.trim() === normalizedAi);
        });

        const combinedLogsForParsing = [...uniqueAiLogs];
        
        if (combinedLogsForParsing.length > 0) { 
            const parsed = CombatUtils.parseCombatDamage(combinedLogsForParsing, updatedEnemies, updatedChar, updatedCompanions); 
            updatedEnemies = parsed.updatedEnemies; 
            updatedChar = parsed.updatedChar; 
            updatedCompanions = parsed.updatedCompanions; 
            playerUpdated = parsed.playerUpdated; 
            modifiedCompanionIndices = parsed.modifiedCompanionIndices; 
            goldUpdated = parsed.goldUpdated; 
        }

        const combinedLogs = [...localLogs, ...uniqueAiLogs];
        const previousLog = combatState.log || [];
        const newUniqueLogs = combinedLogs.filter(l => !previousLog.includes(l));
        updatedCombatState.log = [...previousLog, ...newUniqueLogs];

        let finalNarrative = response.narrative; 
        if (daysPassed > 1 || getYear(prevDate) !== nYear) { finalNarrative = `[${formatDate(newDate)}]\n${finalNarrative}`; } 
        if (isRestAction && !finalNarrative.includes('회복')) { finalNarrative += "\n(휴식으로 인해 HP/MP가 회복되고 모든 상태이상이 해제되었습니다.)"; }
        
        const totalEnemiesDead = updatedEnemies.length > 0 && updatedEnemies.every(e => e.hp <= 0);
        const narrativeVictory = finalNarrative.includes("승리") || finalNarrative.includes("처치") || finalNarrative.includes("쓰러뜨렸") || finalNarrative.includes("합격") || finalNarrative.includes("우승");

        if (totalEnemiesDead || (narrativeVictory && nextSceneType === 'normal')) {
             nextSceneType = 'normal';
             updatedCombatState.isEnded = true;

             // [NEW] AI 서사 기반으로 승리 시도 로컬 라이벌 판정 수행
             if (combatState.type === 'tournament' || combatState.type === 'normal') {
                const rivalEnemy = updatedEnemies.find(e => {
                    const cleanEName = e.name.replace(/\[.*?\]\s*/g, '').trim();
                    return character.schoolData?.classmates.some(s => s.isRival && (cleanEName.includes(s.name) || s.name.includes(cleanEName)));
                });

                if (rivalEnemy) {
                    const cleanREName = rivalEnemy.name.replace(/\[.*?\]\s*/g, '').trim();
                    const rival = character.schoolData?.classmates.find(s => s.isRival && (cleanREName.includes(s.name) || s.name.includes(cleanREName)));
                    if (rival) {
                        setPendingRelationResolution({ targetId: rival.id, enemy: rivalEnemy });
                    }
                }
             }

             if (combatState.type === 'wanted_battle') {
                updatedChar.wantedClearanceCity = character.currentLocation?.city;
             }

             if (combatState.type === 'temple_defense') {
                 const source = (updatedCombatState as any).defenseSource; 
                 const targetCity = (updatedCombatState as any).targetCity;
                 const targetNation = (updatedCombatState as any).targetNation || findNationByCityLocal(targetCity);
                 const templeKey = `${targetNation}_${targetCity}`;

                 let majestyGain = 100;
                 if (source === '마신' || source === '타락한 신성') majestyGain = 1000;
                 else if (source === '마계' || source === '타 성전') majestyGain = 500;

                 if (!updatedChar.base) updatedChar.base = { ...INITIAL_BASE };
                 if (!updatedChar.base.templePersonnel) updatedChar.base.templePersonnel = {};
                 if (!updatedChar.base.templePersonnel[templeKey]) {
                     updatedChar.base.templePersonnel[templeKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                 }

                 const tp = updatedChar.base.templePersonnel[templeKey];
                 tp.majesty = (tp.majesty || 0) + majestyGain;
                 
                 addToLog(`[성전 승보] 외적을 격퇴하여 '${targetCity}'의 위엄도가 ${majestyGain} 상승했습니다! (현재: ${tp.majesty})`);
                
             }

             if (combatState.type === 'divine_invasion') {
                const targetNationName = (updatedCombatState as any).sourceId || character.currentLocation?.nation;
                if (targetNationName) {
                    if (!updatedChar.templeDiplomacy) updatedChar.templeDiplomacy = {};
                    updatedChar.templeDiplomacy[targetNationName] = {
                        status: DivineDiplomacyStatus.SUBJUGATED,
                         faithPoints: 0,
                            tension: 0,
                            influence: 100,
                            subjugatedYears: 5,
                            subjugatedStartDate: character.currentDate,
                            subjugatedEndDate: addDays(character.currentDate || '2000-01-01', 1825),
                            tributeLevel: 1
                    };
                    
                    if (updatedChar.militaryData?.diplomacy?.[targetNationName]) {
                        const rel = updatedChar.militaryData.diplomacy[targetNationName];
                        rel.status = DiplomaticStatus.VASSAL_OWNER;
                        rel.occupation = 100;
                        rel.tension = 100;
                        rel.vassalYearsRemaining = VASSAL_DURATION_YEARS;
                        rel.vassalStartDate = character.currentDate; 
                        rel.vassalEndDate = addDays(character.currentDate || '2000-01-01', 1825);
                        rel.lastEvent = `사자의 위엄으로 ${targetNationName}의 지도자를 굴복시켰습니다.`;
                    }

                    // 약탈 보상
                    const rawGoldLoot = updatedChar.level * 10000;
                    const bonuses = calculateRewardBonuses(updatedChar);
                    const goldLoot = Math.floor(rawGoldLoot * (1 + bonuses.goldBonus / 100));
                    updatedChar.money += goldLoot;
                    
                    // 국보 강탈
                    const relicData = NATION_RELICS[targetNationName] || NATION_RELICS["대한민국"];
                    if (updatedChar.inventory.length < calculateInventorySize(updatedChar.stats)) {
                        updatedChar.inventory.push({ ...relicData, name: `${relicData.name}`, enhancement: 0 } as Item);
                    } else {
                        addToLog("[시스템] 가방이 가득 차 유물을 획득하지 못했습니다.");
                    }

                    addMemory(updatedChar, `${targetNationName} 신성 정벌 성공 및 속국화`);
                    
                    setResultModalData({
                        type: 'levelup',
                        title: '신성 정벌 성공',
                        message: `${targetNationName}을(를) 무력으로 완전히 굴복시켰습니다.\n이제 해당 국가는 5년간 당신의 지배 아래 조공을 바칠 것입니다.`,
                        items: [
                            { label: '외교 상태', after: '종주국 (Owner)' },
                            { label: '약탈 골드', after: `+${goldLoot.toLocaleString()} G` },
                            { label: '획득 유물', after: relicData.name }
                        ]
                    });
                    playerUpdated = true;
                }
             }

             if (combatState.type === 'Coup') {
                const targetNation = (updatedCombatState as any).sourceId;
                const kingDefeated = updatedEnemies.some(e => e.id?.includes('king_') && e.hp <= 0);
                
                if (kingDefeated) {
                    updatedChar.job = JobType.KING;
                    if (!updatedChar.availableTitles) updatedChar.availableTitles = [];
                    
                    // 외교 상태 변경
                    if (!updatedChar.militaryData) updatedChar.militaryData = { rank: MilitaryRank.PVT, enlistedDate: character.currentDate || '2026-01-01', merit: 0, completedMissions: 0 };
                    if (!updatedChar.militaryData.diplomacy) updatedChar.militaryData.diplomacy = {};
                    updatedChar.militaryData.diplomacy[targetNation] = {
                        status: DiplomaticStatus.ALLIANCE,
                        tension: 0,
                        occupation: 100,
                        lastEvent: '쿠데타 성공으로 새로운 국왕이 등극했습니다.'
                    };
            
                    addToLog(`[혁명 성공] ${targetNation}의 정권을 장악했습니다! 이제 당신이 이 나라의 새로운 국왕입니다.`);
                    addMemory(updatedChar, `${targetNation} 쿠데타 성공 및 국왕 등극`);
            
                    setResultModalData({
                        type: 'levelup',
                        title: '쿠데타 성공 - 왕의 등극',
                        message: `${targetNation}의 구체제를 무너뜨리고 새로운 왕조를 열었습니다.\n이제 나라의 모든 권력이 당신의 손안에 있습니다.`,
                        items: [
                            { label: '새로운 직업', after: '국왕 (King)' },
                            { label: '국가 상태', after: '완전 장악' }
                        ]
                    });
                    playerUpdated = true;
                }
             }

             const currentNation = updatedChar.currentLocation?.nation;
             if (currentNation && updatedChar.militaryData?.diplomacy?.[currentNation]?.status === DiplomaticStatus.WAR) {
                 const rel = updatedChar.militaryData.diplomacy[currentNation];
                 const leaderDefeated = updatedEnemies.some(e => e.name.includes('[국가 지도자]') && e.hp <= 0);

                 if (leaderDefeated) {
                     rel.status = DiplomaticStatus.VASSAL_OWNER;
                     rel.occupation = 100;
                     rel.tension = 0;
                     rel.vassalYearsRemaining = VASSAL_DURATION_YEARS;
                     rel.vassalStartDate = updatedChar.currentDate; 
                     rel.vassalEndDate = addDays(updatedChar.currentDate || '2000-01-01', 1825);
                     rel.lastEvent = `지도복. 우리 측의 완전한 승리로 기록됩니다.`;
                     
                     addToLog(`[긴급 타전] 대첩! ${currentNation}의 지도자가 패배를 인정하고 항복을 선언했습니다. 해당 국가는 이제 우리의 속국이 되었습니다.`);
                     addMemory(updatedChar, `${currentNation} 정벌 및 속국화 성공`);

                     setResultModalData({
                         type: 'levelup',
                         title: '국가 정벌 성공 (Vassalized)',
                         message: `${currentNation}의 지도자를 굴복시키고 전쟁에서 완전히 승리했습니다!\n이제 해당 국가는 5년간 우리의 지배를 받으며 조공을 바칠 것입니다.`,
                         items: [
                             { label: '대상 국가', after: currentNation },
                             { label: '외교 상태', before: '전쟁', after: '종주국 (Owner)' },
                             { label: '지배 기간', after: `${VASSAL_DURATION_YEARS}년` }
                         ]
                     });
                 } else {
                     let occGain = 1; 
                     const commanderInfo = getCommanderInfo();
                     if (commanderInfo) {
                         const rIdx = commanderInfo.rankIdx;
                         if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG)) occGain = 10; 
                         else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ)) occGain = 5; 
                         else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT)) occGain = 3; 
                         else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SSG)) occGain = 2; 
                     }

                     rel.occupation = Math.min(100, (rel.occupation || 0) + occGain);
                     
                     // 즉시 속국 전환 체크 (승리 시)
                     const transitionedRel = checkVassalTransition(rel, updatedChar.currentDate);
                     updatedChar.militaryData!.diplomacy![currentNation] = transitionedRel;

                     // 전쟁 승전 시 공훈 및 명성 상승
                     const meritGain = 150;
                     const repGain = 100;
                     if (updatedChar.militaryData) {
                         updatedChar.militaryData.merit = (updatedChar.militaryData.merit || 0) + meritGain;
                     }
                     if (!updatedChar.mercenaryData) {
                         updatedChar.mercenaryData = { rank: MercenaryRank.F, registeredDate: updatedChar.currentDate || '2000-01-01', completedQuests: 0, reputation: 0, guildId: 'None', isGroupLeader: false, activeQuests: [], availableQuests: [] };
                     }
                     updatedChar.mercenaryData.reputation = (updatedChar.mercenaryData.reputation || 0) + repGain;

                     const updateWarComp = (c: Companion) => {
                         if (c.isDead) return c;
                         if (c.job === JobType.SOLDIER) return { ...c, merit: (c.merit || 0) + meritGain, currentExp: (c.currentExp || 0) + 500 };
                         return { ...c, reputation: (c.reputation || 0) + repGain, currentExp: (c.currentExp || 0) + 500 };
                     };
                     updatedChar.companions = updatedChar.companions.map(updateWarComp);
                     if (updatedChar.inactiveCompanions) {
                         updatedChar.inactiveCompanions = updatedChar.inactiveCompanions.map(updateWarComp);
                     }

                     addToLog(`[전보] 승전보! ${currentNation} 전선 점유율 ${occGain}% 상승! (공적 +${meritGain}, 명성 +${repGain})`);
                     
                     if (combatState.type === 'war_defend') {
                         const invadedNation = actionText.split(': ')[1]?.trim();
                         updatedChar.militaryData.pendingInvasions = updatedChar.militaryData.pendingInvasions?.filter(n => n !== invadedNation);
                     }
                 }
             }
        }

        if (updatedChar.stats.hp <= 0) { 
            nextSceneType = 'normal'; 
            updatedCombatState.isEnded = true; 

            if (combatState.type === 'divine_invasion') {
                const targetNationName = (updatedCombatState as any).sourceId;
                updatedChar.infamy = (updatedChar.infamy || 0) + 100;
                const templeKey = `${character.currentLocation?.nation}_${character.currentLocation?.city}`;
                if (updatedChar.base?.templePersonnel?.[templeKey]) {
                    updatedChar.base.templePersonnel[templeKey].majesty = Math.max(0, (updatedChar.base.templePersonnel[templeKey].majesty || 0) - 2000);
                }
                setResultModalData({
                    type: 'failure',
                    title: '침략 실패',
                    message: `신의 이름으로 감행한 ${targetNationName} 침략이 실패로 돌아갔습니다.\n성전의 위엄이 실추되고 당신의 악명만 높아졌습니다.`,
                    items: [
                        { label: '악명도', after: '+100' },
                        { label: '위엄도', after: '-2000' }
                    ]
                });
                playerUpdated = true;
            }

            if (combatState.type === 'wanted_battle') {
                const escapeRoll = Math.random();
                if (escapeRoll < 0.02) { 
                    updatedChar.stats.hp = 1;
                    updatedChar.statusEffects = [];
                    finalNarrative = `[시스템] 패배했지만, 대원들의 희생과 당신의 초인적인 생존 본능으로 적의 포위망을 뚫고 기적적으로 탈출했습니다!\n\n(체력 1로 복귀했습니다. 당분간 몸을 사리십시오.)`;
                    addMemory(updatedChar, `토벌대와의 전투 중 패배했으나 기적적으로 탈출함`);
                    setResultModalData({
                        type: 'success',
                        title: '기적적인 탈출!',
                        message: '압도적인 적의 공세 속에서 구사일생으로 도망쳤습니다.',
                        items: [{ label: '탈출 확률', after: '2% (기적)' }, { label: '상태', after: 'HP 1' }]
                    });
                } else {
                    const currentInfamy = character.infamy || 0;
                    const jailDays = currentInfamy * 40;
                    const years = Math.floor(jailDays / 365);
                    const months = Math.floor((jailDays % 365) / 30);
                    const remainingDays = jailDays % 30;

                    const releaseDate = addDays(character.currentDate || START_DATE, jailDays);
                    
                    updatedChar.currentDate = releaseDate;
                    updatedChar.infamy = 0; 
                    updatedChar.stats.hp = updatedChar.stats.maxHp;
                    updatedChar.stats.mp = updatedChar.stats.maxMp;
                    updatedChar.statusEffects = [];
                    
                    updatedCompanions = updatedCompanions.map(c => ({
                        ...c,
                        stats: { ...c.stats, hp: c.stats.maxHp, mp: c.stats.maxMp },
                        statusEffects: []
                    }));

                    finalNarrative = `[시스템] 패배 후 체포되었습니다. 당신의 악행에 대한 대가로 감옥에서 ${jailDays}일(${years}년 ${months}개월 ${remainingDays}일) 동안 복역했습니다.\n\n[출소] ${formatDate(releaseDate)}, 마침내 자유의 몸이 되었습니다. 세상은 당신을 잊었지만, 당신의 투지는 아직 살아있습니다.`;
                    addMemory(updatedChar, `${jailDays}일간의 투옥 생활 후 출소함`);

                    setResultModalData({
                        type: 'destroy',
                        title: '투옥 및 강제 노역',
                        message: `체포되어 장기간 감옥에 수감되었습니다.\n형기를 마치고 나오니 ${jailDays}일의 세월이 흘러 있었습니다.`,
                        items: [
                            { label: '수감 기간', after: `${years}년 ${months}개월 ${remainingDays}일` },
                            { label: '출소일', after: releaseDate },
                            { label: '악명도', before: currentInfamy, after: '0 (세탈됨)' }
                        ]
                    });
                }
            } else {
                if (!finalNarrative.includes("쓰러졌")) { 
                    finalNarrative += "\n\n(체력이 다하여 의식을 잃고 쓰러졌습니다... 전투 패배.)"; 
                }
                // [NEW] 일반/던전 전투 패배 시 결과 모달 표시
                if (combatState.type === 'normal' || combatState.type === 'dungeon') {
                    setResultModalData({
                        type: 'failure',
                        title: '전투 패배',
                        message: '체력이 모두 소진되어 전투에서 패배했습니다.\n의식을 잃고 쓰러진 당신을 누군가 안전한 곳으로 옮겨주었습니다.',
                        items: [
                            { label: '전투 결과', after: '패배' },
                            { label: '현재 상태', after: '의식 불명' }
                        ]
                    });
                }
            }

            if (combatState.type === 'Coup') {
                const jailDays = 3650; // 10년 투옥
                const releaseDate = addDays(character.currentDate || START_DATE, jailDays);
                
                updatedChar.currentDate = releaseDate;
                updatedChar.stats.hp = updatedChar.stats.maxHp;
                updatedChar.stats.mp = updatedChar.stats.maxMp;
                updatedChar.statusEffects = [];
                
                if (updatedChar.mercenaryData) updatedChar.mercenaryData.reputation = 0;
                if (updatedChar.militaryData) updatedChar.militaryData.merit = 0;
            
                setResultModalData({
                    type: 'destroy',
                    title: '쿠데타 실패 - 대역죄인',
                    message: `반란에 실패하여 대역죄인으로 몰렸습니다.\n지하 감옥에서 10년의 세월을 보낸 뒤에야 간신히 풀려날 수 있었습니다.`,
                    items: [
                        { label: '수감 기간', after: '10년' },
                        { label: '출소일', after: releaseDate },
                        { label: '명성/공적', after: '몰수 (0)' }
                    ]
                });
                playerUpdated = true;
            }

            if (combatState.type === 'temple_defense') {
                const targetCity = (updatedCombatState as any).targetCity;
                const targetNation = (updatedCombatState as any).targetNation || findNationByCityLocal(targetCity);
                const templeKey = `${targetNation}_${targetCity}`;
                
                if (!updatedChar.base) updatedChar.base = { ...INITIAL_BASE };
                if (!updatedChar.base.templePersonnel) updatedChar.base.templePersonnel = {};
                if (!updatedChar.base.templePersonnel[templeKey]) {
                    updatedChar.base.templePersonnel[templeKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
                }

                const tp = updatedChar.base.templePersonnel[templeKey];
                tp.majesty = Math.max(0, (tp.majesty || 0) - 500);
                
                if (tp.majesty <= 0 && isMessengerJob(updatedChar.job)) {
                    addToLog(`[성전 함락] '${targetCity}'의 위엄이 바닥에 떨어졌습니다. 신께서 당신에게 부여한 사자의 직함을 거두셨습니다.`);
                    
                    const demote = (m: any) => {
                        const jobs = [
                            JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
                            JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
                            JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
                            JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
                            JobType.VOID_MESSENGER
                        ];
                        if (m.job && jobs.includes(m.job)) {
                            m.job = JobType.UNEMPLOYED;
                            m.classTier = ClassTier.NONE;
                        }
                    };
                    
                    demote(updatedChar);
                    updatedCompanions.forEach(demote);
                    addMemory(updatedChar, `${targetCity} 성전 함락 및 사자 직위 박탈`);
                } else {
                    addToLog(`[성전 패전] 방어에 실패하여 '${targetCity}'의 위엄도가 500 하락했습니다. (현재: ${tp.majesty})`);
                }
            }

            if (combatState.type === 'tournament' && updatedChar.stats.hp <= 0 && updatedChar.schoolData?.currentTournament) {
                updatedChar.schoolData.currentTournament.isActive = false; 
                finalNarrative += "\n\n[시스템] 패배하여 토너먼트에서 탈락했습니다.";
                playerUpdated = true;
            }
            if (combatState.type === 'arena' && updatedChar.stats.hp <= 0 && updatedChar.mercenaryData?.arenaState) {
                updatedChar.mercenaryData.arenaState.isEliminated = true;
                finalNarrative += "\n\n[시스템] 패배하여 그랜드 아레나 토너먼트에서 탈락했습니다.";
                playerUpdated = true;
            }

            // [NEW] 전쟁(공격/방어) 패배 시 점유율 하락 및 속국 전환 판정
            const currentNationOnDefeat = updatedChar.currentLocation?.nation;
            if (currentNationOnDefeat && (combatState.type === 'war_raid' || combatState.type === 'war_defend')) {
                if (updatedChar.militaryData?.diplomacy?.[currentNationOnDefeat]) {
                    const rel = updatedChar.militaryData.diplomacy[currentNationOnDefeat];
                    rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
                    
                    // 즉시 속국 전환 체크
                    const transitionedRel = checkVassalTransition(rel, updatedChar.currentDate);
                    updatedChar.militaryData.diplomacy[currentNationOnDefeat] = transitionedRel;

                    if (transitionedRel.status === DiplomaticStatus.VASSAL_SUBJECT) {
                        setResultModalData({
                            type: 'destroy',
                            title: '패전 및 속국 전락',
                            message: `적군에게 완전히 패배하여 전선이 붕괴되었습니다.\n이제 조국은 ${currentNationOnDefeat}의 지배 아래 놓이게 되었습니다.`,
                            items: [
                                { label: '전선 점유율', after: '-100%' },
                                { label: '국가 상태', after: '속국 (Subject)' }
                            ]
                        });
                        playerUpdated = true;
                    }
                }
            }
        }
        

        if (nextSceneType === 'combat') { 
            const allEnemiesDeadCheck = updatedEnemies.length > 0 && updatedEnemies.every(e => e.hp <= 0); 
            if (allEnemiesDeadCheck) { 
                nextSceneType = 'normal'; 
                updatedCombatState.isEnded = true; 
            } else { 
                updatedCombatState = { ...updatedCombatState, enemies: updatedEnemies }; 
            } 
            setCombatState(updatedCombatState); 
            timeAdvancedChar = { ...updatedChar, companions: updatedCompanions }; 
        } 
        else if (nextSceneType === 'normal') { 
            // [FIX] 전투 종료 시 마나 쉴드 및 디버프 상태 효과 제거, 모든 비약/이로운 버프(경험치, 드롭률, 무기숙련도, 스킬숙련도 등)는 보존
            const clearCombatStatus = (entity: any) => {
                if (entity.statusEffects) {
                    // 보존 대상 버프 (지속시간이 남은 비약 및 이로운 버프 효과)
                    const isPreservedBuff = (e: any) => {
                        const effectText = `${e?.name || ''} ${e?.effect || ''} ${e?.description || ''}`.toUpperCase();
                        return effectText.includes('EXP') || effectText.includes('경험치') ||
                               effectText.includes('DROP') || effectText.includes('드롭') || effectText.includes('전리품') ||
                               effectText.includes('WEAPONMASTERY') || effectText.includes('무기숙련') ||
                               effectText.includes('SKILLMASTERY') || effectText.includes('스킬숙련') ||
                               effectText.includes('비약') ||
                               (typeof e.duration === 'number' && e.duration > 0 && !['마나 쉴드', '빙결', '감전', '속박', '혼란', '기절', '침묵'].includes(e.name));
                    };

                    // 전투 전용 상태 효과 (전투 종료 시 삭제 대상)
                    const isCombatOnly = (e: any) => {
                        return e.name === '마나 쉴드' || 
                               e.name === '마나 쉴드 (패시브)' ||
                                ['빙결', '감전', '속박', '혼란', '기절', '침묵'].includes(e.name);
                    };

                    entity.statusEffects = entity.statusEffects.filter((e: any) => {
                        if (isPreservedBuff(e)) return true; // 무조건 보존
                        if (isCombatOnly(e)) return false; // 삭제
                        return true; // 그 외 일반 버프 보존
                    });
                }
            };
            clearCombatStatus(updatedChar);
            updatedCompanions.forEach(clearCombatStatus);

            setCombatState({ enemies: [], turn: 0, log: [], isEnded: true }); 
            timeAdvancedChar = { ...updatedChar, companions: updatedCompanions }; 
        }
        
        setSceneType(nextSceneType); setMessages((prev) => [...prev, { role: 'ai', text: finalNarrative }]); setChoices(response.choices);
        
        if (response.characterUpdate) {
            setCharacterSafe(prev => {
                const update = response.characterUpdate || {};
                
                const finalNextDate = addDays(prev.currentDate || START_DATE, daysPassed);
                const nextYearForAge = getYear(finalNextDate);
                const finalAgeForState = calculateAgeFromYear(prev.birthYear || 2000, nextYearForAge);

                const isBuffEffect = (e: any) => {
                    const text = `${e?.name || ''} ${e?.effect || ''} ${e?.description || ''}`.toUpperCase();
                    return text.includes('비약') || text.includes('경험치') || text.includes('EXP') ||
                           text.includes('드롭') || text.includes('DROP') || text.includes('전리품') ||
                           text.includes('무기숙련') || text.includes('WEAPONMASTERY') ||
                           text.includes('스킬숙련') || text.includes('SKILLMASTERY') ||
                           text.includes('성장') || text.includes('수련') || text.includes('축복') || text.includes('버프') || text.includes('배') ||
                           (e?.duration !== undefined && e?.duration > 0 && !['마나 쉴드', '빙결', '감전', '속박', '혼란', '기절', '침묵'].includes(e?.name));
                };

                const activeBuffs = isRestAction ? [] : [
                    ...(prev.statusEffects || []),
                    ...(updatedChar.statusEffects || [])
                ].filter(isBuffEffect);

                let newStatusEffects = isRestAction ? [] : [...(updatedChar.statusEffects || prev.statusEffects || [])];
                
                if (!isRestAction && update.statusEffects) {
                    update.statusEffects.forEach((ue: any) => {
                        if (!newStatusEffects.some((m: any) => m.name === ue.name || m.effect === ue.effect)) {
                            newStatusEffects.push(ue);
                        }
                    });
                }
                
                if (!isRestAction) {
                    activeBuffs.forEach((eb: any) => {
                        if (!newStatusEffects.some((m: any) => m.name === eb.name || m.effect === eb.effect)) {
                            newStatusEffects.push(eb);
                        }
                    });
                }
                
                let newMoney = prev.money; 
                if (playerUpdated || goldUpdated) {
                    newMoney = updatedChar.money; 
                } else if (update.money !== undefined) {
                    newMoney = update.money;
                }
                
                const incomingStats = { ...prev.stats, ...(update.stats || {}) };
                if (playerUpdated || nextSceneType === 'combat') { 
                    incomingStats.hp = updatedChar.stats.hp; 
                    incomingStats.mp = updatedChar.stats.mp; 
                } else if (isRestAction) { 
                    const { finalStats: fStats } = calculateFinalStats(prev);
                    incomingStats.hp = fStats.maxHp; 
                    incomingStats.mp = fStats.maxMp; 
                }
                
                let newSkills = [...prev.skills]; 
                if (update.skills && update.skills.length > 0) { 
                    update.skills.forEach(newSkill => { 
                        const idx = newSkills.findIndex(s => s.name === newSkill.name); 
                        if (idx >= 0) { newSkills[idx] = { ...newSkills[idx], ...newSkill }; } 
                        else { newSkills.push(newSkill); } 
                    }); 
                } else if (playerUpdated || nextSceneType === 'combat') { 
                    newSkills = updatedChar.skills; 
                }
                
                // [IMPORTANT] Ensure companion names, inactive companion names, social network names, and player name are protected against AI hallucination
                const sanitizedCompanions = updatedCompanions.map(c => {
                    const originalComp = prev.companions.find(p => p.id === c.id);
                    const name = originalComp ? originalComp.name : c.name;
                    return {
                        ...c,
                        name,
                        statusEffects: isRestAction ? [] : (c.statusEffects || [])
                    };
                });

                const rawInactive = updatedChar.inactiveCompanions || prev.inactiveCompanions || [];
                const sanitizedInactiveCompanions = rawInactive.map(c => {
                    const originalComp = prev.inactiveCompanions?.find(p => p.id === c.id) || prev.companions.find(p => p.id === c.id);
                    if (originalComp) {
                        return { ...c, name: originalComp.name };
                    }
                    return c;
                });

                const rawSocial = updatedChar.socialNetwork || prev.socialNetwork || [];
                const sanitizedSocialNetwork = rawSocial.map(s => {
                    const originalSocial = prev.socialNetwork?.find(p => p.id === s.id);
                    if (originalSocial) {
                        return { ...s, name: originalSocial.name };
                    }
                    return s;
                });

                const preLevelUpChar: Character = { 
                    ...prev, 
                    ...update, 
                    name: prev.name,
                    money: newMoney, 
                    currentExp: playerUpdated ? updatedChar.currentExp : (update.currentExp !== undefined ? update.currentExp : prev.currentExp), 
                    currentDate: finalNextDate, 
                    age: finalAgeForState, 
                    stats: incomingStats, 
                    statusEffects: newStatusEffects, 
                    skills: newSkills, 
                    bondSkills: updatedChar.bondSkills || prev.bondSkills,
                    companions: sanitizedCompanions, 
                    inactiveCompanions: sanitizedInactiveCompanions,
                    socialNetwork: sanitizedSocialNetwork,
                    inventory: updatedChar.inventory,
                    weaponMastery: updatedChar.weaponMastery, 
                    infamy: updatedChar.infamy !== undefined ? updatedChar.infamy : (update.infamy !== undefined ? update.infamy : prev.infamy),
                    schoolData: updatedChar.schoolData, 
                    lastAuctionDate: updatedChar.lastAuctionDate,
                    mercenaryData: updatedChar.mercenaryData || prev.mercenaryData, 
                    job: updatedChar.job || prev.job, 
                    militaryRank: updatedChar.militaryRank || prev.militaryRank,
                    militaryData: updatedChar.militaryData || prev.militaryData, 
                    pendingDefenseEvent: preSendState.pendingDefenseEvent,
                    wantedClearanceCity: updatedChar.wantedClearanceCity,
                    
                    // [IMPORTANT] Use local state's divineRelations to prevent AI overwrite
                    divineRelations: timeAdvancedChar.divineRelations,
                    templeDiplomacy: updatedChar.templeDiplomacy,
                    dungeonProgress: updatedChar.dungeonProgress !== undefined
                        ? JSON.parse(JSON.stringify(updatedChar.dungeonProgress))
                        : (update.dungeonProgress || prev.dungeonProgress),
                    
                    memories: updatedChar.memories, 
                    base: (prev.base || update.base) ? {
                        ...INITIAL_BASE,
                        ...(prev.base || {}),
                        ...(update.base || {})
                    } : undefined
                };

                // [NEW] AI 응답 후 최종 상태 정밀 보정 (날짜 점프 대응)
                const { updatedChar: finalCalibratedChar, events: extraEvents } = updateNationalDiplomacy(preLevelUpChar, 0);
                
                if (extraEvents.length > 0) {
                    setTimeout(() => {
                        extraEvents.forEach(evt => addToLog(evt));
                    }, 500);
                }

                return finalCalibratedChar;
            });
        } else { 
             setCharacterSafe(prev => {
                const finalNextDate = addDays(prev.currentDate || START_DATE, daysPassed);
                const nextYearForAge = getYear(finalNextDate);
                const finalAgeForState = calculateAgeFromYear(prev.birthYear || 2000, nextYearForAge);
                
                const currentBaseStats = { ...prev.stats };
                if (isRestAction) {
                    const { finalStats: fStats } = calculateFinalStats(prev);
                    currentBaseStats.hp = fStats.maxHp;
                    currentBaseStats.mp = fStats.maxMp;
                }

                const postChar = { 
                    ...prev, 
                    currentDate: finalNextDate, 
                    age: finalAgeForState, 
                    companions: isRestAction
                        ? updatedCompanions.map(c => {
                            const { finalStats: cStats } = calculateFinalStats(c);
                            return { ...c, stats: { ...c.stats, hp: cStats.maxHp, mp: cStats.maxMp }, statusEffects: [] };
                          })
                        : updatedCompanions, 
                    stats: currentBaseStats,
                    weaponMastery: updatedChar.weaponMastery, 
                    currentExp: updatedChar.currentExp, 
                    money: updatedChar.money, 
                    skills: updatedChar.skills, 
                    bondSkills: updatedChar.bondSkills || prev.bondSkills,
                    inventory: updatedChar.inventory, 
                    statusEffects: isRestAction ? [] : (updatedChar.statusEffects && updatedChar.statusEffects.length > 0 ? updatedChar.statusEffects : (prev.statusEffects || [])), 
                    infamy: updatedChar.infamy, 
                    schoolData: updatedChar.schoolData, 
                    lastAuctionDate: updatedChar.lastAuctionDate, 
                    base: updatedChar.base, 
                    job: updatedChar.job, 
                    militaryRank: updatedChar.militaryRank, 
                    militaryData: updatedChar.militaryData, 
                    pendingDefenseEvent: preSendState.pendingDefenseEvent, 
                    wantedClearanceCity: updatedChar.wantedClearanceCity, 
                    memories: updatedChar.memories,
                    divineRelations: timeAdvancedChar.divineRelations,
                    templeDiplomacy: updatedChar.templeDiplomacy
                };

                // AI가 characterUpdate를 안 보냈더라도 날짜 변경에 따른 정산 수행
                const { updatedChar: finalCalibratedChar, events: extraEvents } = updateNationalDiplomacy(postChar, 0);
                if (extraEvents.length > 0) {
                    setTimeout(() => {
                        extraEvents.forEach(evt => addToLog(evt));
                    }, 500);
                }
                return finalCalibratedChar;
             });
        }
    } catch (e) { console.error("Action Error", e); setMessages((prev) => [...prev, { role: 'ai', text: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }]); }
    setIsLoading(false);
  };

  const handleCharacterSubmit = async (formData: any) => {
    setIsLoading(true);
    const level = formData.startingLevel || 1;
    const totalStatPoints = level * 10;
    const statsKeys = ['str', 'int', 'wis', 'def', 'agi', 'ctrl'];
    const distributedStats: any = { hp: 200, maxHp: 200, mp: 200, maxMp: 200 };
    statsKeys.forEach(key => distributedStats[key] = 0);
    let remaining = totalStatPoints;
    statsKeys.forEach(key => { distributedStats[key] = 1; remaining--; });
    while (remaining > 0) { const randomKey = statsKeys[Math.floor(Math.random() * statsKeys.length)]; distributedStats[randomKey]++; remaining--; }
    distributedStats.maxHp = level * 20; distributedStats.hp = level * 20; distributedStats.maxMp = level * 20; distributedStats.mp = level * 20;
    const ageNum = parseInt(formData.age.replace(/[^0-9]/g, '')) || 17;
    const currentYear = getYear(START_DATE);
    const birthYear = currentYear - ageNum;
    
    const initialJob = ageNum >= 20 ? JobType.UNEMPLOYED : JobType.STUDENT;

    const initialData = { 
      ...formData, 
      level: level, 
      stats: distributedStats, 
      currentExp: 0, 
      maxExp: calculateRequiredExp(level), 
      shinryokuType: "미개방", 
      firstClassName: "미정", 
      firstClassDescription: "", 
      statusEffects: [], 
      companions: [], 
      inactiveCompanions: [], 
      birthYear: birthYear, 
      currentDate: START_DATE, 
      job: initialJob, 
      memories: [`${START_DATE}: ${formData.nation}의 ${formData.currentLocation?.city || '어딘가'}에서 일대기를 시작함`], 
      liberationPotential: ClassTier.FIRST 
    };

    // AI API 호출을 완전히 생략하고 0초 만에 즉시 로컬 메모리에 동기화 세팅
    setCharacterSafe(prev => ({ 
        ...prev, 
        ...initialData,
        name: formData.name, 
        age: formData.age, 
        birthYear: birthYear, 
        currentDate: START_DATE, 
        gender: formData.gender, 
        race: formData.race, 
        nation: formData.nation, 
        appearance: formData.appearance, 
        personality: formData.personality, 
        level: level, 
        maxExp: calculateRequiredExp(level), 
        stats: distributedStats, 
        companions: [], 
        inactiveCompanions: [], 
        base: undefined,
        currentLocation: formData.currentLocation,
        schoolData: formData.schoolData,
        job: initialJob,
        memories: initialData.memories
    })); 

    const localNarrative = `${formData.name}님, 신의 사자 RPG에 오신 것을 정중히 환영합니다!\n\n당신은 신의 사자로서의 거룩한 소명을 부여받고, 새로운 운명을 당당히 개척하기 위해 이 땅에 강림하셨습니다. 출신지인 ${formData.nation}의 ${formData.currentLocation?.city || '지역'}에서, 영혼 깊숙이 잠재된 광활한 신력(神力)을 일깨울 위대한 서막이 지금 바로 펼쳐집니다.\n\n앞으로 마주하게 될 무수히 많은 인연들과 동료들과 동행하며, 세계를 구원할 당신만의 찬란한 전설을 아로새기십시오.`;

    setMessages([{ role: 'ai', text: localNarrative }]); 
    setChoices([]); 
    setView('game'); 
    setIsLoading(false);
  };

  const handleNewGame = () => { 
    justLoadedRef.current = true;
    setView('creation'); setCharacter(INITIAL_CHARACTER); setMessages([]); setChoices([]); 
  };

  const handleSaveLoadSlotSelection = async (slotNum: number) => {
      if (slotNum === 0 && saveLoadMode === 'save') {
          setResultModalData({
              type: 'warning',
              title: '저장 불가',
              message: '자동 저장 슬롯에는 수동으로 저장할 수 없습니다.'
          });
          return;
      }
      const key = getSaveSlotKey(slotNum);
      if (saveLoadMode === 'save') { 
          const syncedChar = elixirRealtimeService.syncToCharacter(character);
          const rawSave = { timestamp: new Date().toISOString(), character: syncedChar, messages, choices, sceneType }; 
          const saveData = optimizeSaveData(rawSave);
          await GameStorage.set(key, saveData);
          setIsSaveLoadOpen(false);
          setResultModalData({
              type: 'success',
              title: '저장 완료',
              message: `슬롯 ${slotNum}에 데이터가 성공적으로 저장되었습니다.`
          });
      } else { 
          setIsLoading(true); 
          const data = await GameStorage.get(key); 
          if (data) { 
              justLoadedRef.current = true;
              const loadedChar = purgeDeceasedCompanions(data.character);
              elixirRealtimeService.reinitializeFromCharacter(loadedChar);
              setCharacter(loadedChar); setMessages(data.messages); setChoices(data.choices || []); setSceneType(data.sceneType || 'normal');
              await resumeGame(data.messages, loadedChar); 
              setView('game'); setIsSaveLoadOpen(false); 
          } else {
              setResultModalData({
                  type: 'warning',
                  title: '불러오기 실패',
                  message: '저장된 데이터가 없습니다.'
              });
          }
          setIsLoading(false); 
      }
  };

  const resetGameToTitle = () => {
    setMessages([]);
    setChoices([]);
    setCharacter(INITIAL_CHARACTER);
    setView('start');
    setIsSkillBookOpen(false);
    setIsDevModeOpen(false);
    setSelectedCompanionIndex(null);
    setPendingEvolutionTier(null);
    setIsSaveLoadOpen(false);
    setIsBaseModalOpen(false);
    setSceneType('normal');
  };

  const handleSaveAndExit = async (slotNum: number) => {
    const key = getSaveSlotKey(slotNum);
    const syncedChar = elixirRealtimeService.syncToCharacter(character);
    const rawSave = { timestamp: new Date().toISOString(), character: syncedChar, messages, choices, sceneType }; 
    const saveData = optimizeSaveData(rawSave);
    await GameStorage.set(key, saveData);
    resetGameToTitle();
  };

  const handleExitGame = () => {
    resetGameToTitle();
  };

  const getRoundName = (round: number) => {
      if (round === 0) return "CHAMPION";
      if (round === 1) return "FINAL";
      if (round === 2) return "SEMI-FINAL";
      return `${round}강`;
  };

  const getCommanderInfo = () => {
    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const eligiblePlayer = (character.job === JobType.SOLDIER && character.nation === loc.nation) ? {
        id: 'player',
        name: character.name,
        rank: character.militaryRank || MilitaryRank.PVT,
        rankIdx: MILITARY_RANK_ORDER.indexOf(character.militaryRank || MilitaryRank.PVT)
    } : null;

    const eligibleCompanions = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => c.job === JobType.SOLDIER && c.nation === loc.nation && c.militaryRank)
        .map(c => ({
            id: c.id,
            name: c.name,
            rank: c.militaryRank!,
            rankIdx: MILITARY_RANK_ORDER.indexOf(c.militaryRank!)
        }));

    const allSoldiers = [...(eligiblePlayer ? [eligiblePlayer] : []), ...eligibleCompanions];
    if (allSoldiers.length === 0) return null;

    return allSoldiers.sort((a, b) => b.rankIdx - a.rankIdx)[0];
  };

  const isMessengerJob = (job?: JobType) => {
    if (!job) return false;
    return [
        JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
        JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
        JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
        JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
        JobType.VOID_MESSENGER
    ].includes(job);
  };

return {
    state: { view, messages, input, choices, character, isLoading, loadingMessage, isMobileMenuOpen, isSkillBookOpen, skillBookTarget, isDevModeOpen, selectedCompanionIndex, selectedCompanionId, isSaveLoadOpen, saveLoadMode, isBaseModalOpen, isTacticsOpen, pendingEvolutionTier, evolvingCompanionIndex, sceneType, combatState, isDashboardOpen, resultModalData, dailyReport, worldNewsList, isBlacksmithModalOpen, isAlchemyModalOpen, pendingRelationResolution, pendingTempleConquest, isReactionBoardOpen,isBestiaryOpen, combatResultData, autoSaveEnabled, pendingTournamentPostMatch },
    setters: { setInput, setIsLoading, setLoadingMessage, setIsMobileMenuOpen, setIsSkillBookOpen, setSkillBookTarget, setIsDevModeOpen, setSelectedCompanionIndex, setSelectedCompanionId, setIsSaveLoadOpen, setSaveLoadMode, setIsBaseModalOpen, setIsTacticsOpen, setEvolvingCompanionIndex, setCharacter: setCharacterSafe, setMessages, setPendingTempleConquest, setPendingEvolutionTier, addToLog, setIsDashboardOpen, setResultModalData, setDailyReport, setWorldNewsList, setIsBlacksmithModalOpen, setIsAlchemyModalOpen, setSceneType, setCombatState, setPendingRelationResolution,setIsReactionBoardOpen,setIsBestiaryOpen, setCombatResultData, setPendingTournamentPostMatch },
    actions: { handleAction, handleCharacterSubmit, handleNewGame, handleSaveLoadSlotSelection, handleExitGame, handleSaveAndExit, resetGameToTitle, getCommanderInfo, addMemory, handleAutoSaveEnabledChange }
  };
};
export const calculateRequiredExp = (lvl: number, stats?: Stats) => {
    return getRequiredExp(lvl);
};

export const createInitialParticipantStates = (char: Character) => {
    return [
        {
            id: 'player',
            name: char.name,
            level: char.level,
            currentExp: char.currentExp,
            requiredExp: char.maxExp || calculateRequiredExp(char.level, char.stats),
            visualUrl: char.visualUrl,
            targetCombatStyle: char.targetCombatStyle,
            combatStyle: char.combatStyle,
            combatStyleProgress: char.combatStyleProgress ? JSON.parse(JSON.stringify(char.combatStyleProgress)) : {},
            skills: char.skills ? char.skills.map((s: Skill) => ({
                name: s.name,
                level: s.level,
                currentMastery: s.currentMastery || 0
            })) : [],
            weaponMastery: char.weaponMastery ? Object.entries(char.weaponMastery).map(([type, val]) => ({
                type: type as WeaponType,
                level: val?.level || 0,
                currentExp: val?.currentExp || 0
            })) : []
        },
        ...char.companions.map((c: Companion) => ({
            id: c.id,
            name: c.name,
            level: c.level,
            currentExp: c.currentExp,
            requiredExp: c.maxExp || calculateRequiredExp(c.level, c.stats),
            visualUrl: c.visualUrl,
            targetCombatStyle: c.targetCombatStyle,
            combatStyle: c.combatStyle,
            combatStyleProgress: c.combatStyleProgress ? JSON.parse(JSON.stringify(c.combatStyleProgress)) : {},
            skills: c.skills ? c.skills.map((s: Skill) => ({
                name: s.name,
                level: s.level,
                currentMastery: s.currentMastery || 0
            })) : [],
            weaponMastery: c.weaponMastery ? Object.entries(c.weaponMastery).map(([type, val]) => ({
                type: type as WeaponType,
                level: val?.level || 0,
                currentExp: val?.currentExp || 0
            })) : []
        })),
        ...MountCombatService.getMountParticipantStates(char, calculateRequiredExp)
    ];
};
