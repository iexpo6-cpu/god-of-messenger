import React, { useState, useMemo, useEffect } from 'react';
import { Character, CapturedMonster, Enemy, Item, MonsterStage, Stats, Skill, ClassTier, SkillType, Companion, ItemRarity, JobType } from '../types';
import { 
  X, Dog, Crosshair, Heart, Trash2, Shield, Sword, AlertCircle, RefreshCw, Egg, CheckCircle, 
  AlertTriangle, ArrowUpCircle, Sparkles, Zap, Activity, Brain, Utensils, Ruler, Weight, Clock, 
  Play, Edit, User, Info, Target, UserPlus, ArrowLeft, ChevronRight, Sparkle, Gauge, Compass
} from 'lucide-react';
import { generateProceduralEnemy, generateHatchedMonster, addDays, calculateTotalMonsterCapacity, calculateTotalIncubatorCapacity, calculateFinalStats, gainProfessionExp, getStatPointsPerLevel } from '../utils';
import { generateMonsterEvolution, generateMonsterSkills } from '../services/geminiService';
import { recruitMonster } from '../services/monsterManager';
import { advanceGameTime } from '../services/gameTimeService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import MonsterEvolutionModal from './MonsterEvolutionModal';
import { SHINRYOKU_TYPES_LIST, MAX_PARTY_SIZE } from '../constants';
import { getMonsterInfo } from '../monsterfield';
import { useActionCooldown } from '../hooks/useActionCooldown';
import { calculateMonsterFarmTrainingLimit, getMonsterFarmTrainingLimitInfo } from '../services/monsterTrainingLimitService';

const getBreederTitle = (level: number) => {
    if (level >= 100) return '전설 사육사';
    if (level >= 80) return '명인 사육사';
    if (level >= 60) return '장인 사육사';
    if (level >= 40) return '숙련 사육사';
    if (level >= 20) return '일반 사육사';
    return '견습 사육사';
};

interface Props {
  character: Character;
  instanceId?: string;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string, dailyReport?: any) => void;
  onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
  onOpenMastery?: () => void;
}

const RANK_CONFIG: Record<string, { color: string, bg: string, border: string, limit: number }> = {
    'C': { color: 'text-slate-400', bg: 'bg-slate-800/60', border: 'border-slate-700', limit: 0 },
    'B': { color: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-700/50', limit: 1 },
    'A': { color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-700/50', limit: 2 },
    'S': { color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-700/50', limit: 3 },
    'SS': { color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-700/50', limit: 4 },
    'SSS': { color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-700/50', limit: 5 }
};

const STAGE_THRESHOLDS = {
    [MonsterStage.EGG]: { maxLvl: 0, next: MonsterStage.BABY },
    [MonsterStage.BABY]: { maxLvl: 30, next: MonsterStage.CHILD },
    [MonsterStage.CHILD]: { maxLvl: 70, next: MonsterStage.ADULT },
    [MonsterStage.ADULT]: { maxLvl: 200, next: MonsterStage.PERFECT },
    [MonsterStage.PERFECT]: { maxLvl: 500, next: MonsterStage.ULTIMATE },
    [MonsterStage.ULTIMATE]: { maxLvl: 1000, next: MonsterStage.SUPER_ULTIMATE },
    [MonsterStage.SUPER_ULTIMATE]: { maxLvl: 2000, next: null }
};

const FEED_CLEAN_LIMIT = 20;
const TRAIN_LIMIT_BASE = 5;

const MonsterFarmModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateCharacter, onFacilityUpgrade, onOpenMastery }) => {
  const { executeWithCooldown } = useActionCooldown(250);
  const [activeTab, setActiveTab] = useState<'list' | 'incubator'>('list');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionModalData, setEvolutionModalData] = useState<{
    prevMonster: any;
    nextMonster: any;
  } | null>(null);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [isActionLocked, setIsActionLocked] = useState(false);

  // 몬스터 커스텀 스킬 창조 모달 상태
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false);
  const [skillStageTarget, setSkillStageTarget] = useState<MonsterStage | null>(null);
  const [skillNameInput, setSkillNameInput] = useState("");
  const [skillDescInput, setSkillDescInput] = useState("");
  const [skillTargetType, setSkillTargetType] = useState<'single' | 'aoe'>('single');
  const [skillDamageType, setSkillDamageType] = useState<'physical' | 'magical'>('physical');

  // 진화 단계 및 필요 레벨 도움말 모달
  const [showEvolutionHelp, setShowEvolutionHelp] = useState(false);
  const [selectedTrainTimes, setSelectedTrainTimes] = useState<number>(1);
  const [selectedCareTimes, setSelectedCareTimes] = useState<number>(1);

  // 시간대 확인 (주간: 06:00 ~ 21:59, 심야: 22:00 ~ 05:59)
  const timeStr = character.currentTime || '08:00';
  const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
  const isLateNight = currentHour >= 22 || currentHour < 6;

  const {
    monsterFarmInstances,
    currentInstance,
    facilityLevel,
    totalFacilityLevel,
    assignedBreederIds,
    activeBreeders,
    totalBreedingLevel,
    breederBonus,
    trainingEffectBonus,
    totalStrBonus,
    totalCtrlBonus,
    monsterTrainingLimitInfo,
    dailyTrainingLimit,
    dailyFeedLimit,
    dailyCleanLimit,
    trainCount,
    feedCount,
    cleanCount,
    incubatorCapacity,
    capacity,
    currentCount,
    selectedMonster,
  } = useMemo(() => {
    const monsterFarmInstances = character.base?.layout?.filter(inst => inst.type === 'monster_farm' || inst.type === 'monster_ranch') || [];
    const currentInstance = character.base?.layout?.find(inst => inst.id === instanceId);
    const facilityLevel = currentInstance ? currentInstance.level : (character.base?.facilityLevels?.['monster_farm'] || 1);
    const totalFacilityLevel = monsterFarmInstances.reduce((sum, inst) => sum + inst.level, 0) || 1;
    
    // Find assigned breeders across all monster farms
    const assignedBreederIds: string[] = [];
    monsterFarmInstances.forEach(inst => {
        const ids = character.base?.multiAssignments?.[inst.id] || (character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id]] : []);
        ids.forEach(id => {
            if (!assignedBreederIds.includes(id)) assignedBreederIds.push(id);
        });
    });
    const allCompanions = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    const activeBreeders = allCompanions.filter(c => assignedBreederIds.includes(c.id) && c.job === JobType.BREEDER);
    const totalBreedingLevel = activeBreeders.reduce((sum, b) => sum + (b.professions?.breeding?.level || 1), 0) || (character.professions?.breeding?.level || 1);
    
    const breederBonus = 1 + (totalBreedingLevel * 0.05); // 5% bonus per level
    const trainingEffectBonus = 1 + (totalBreedingLevel * 0.1); // 10% bonus per level for training specifically
    
    let totalStrBonus = 0;
    let totalCtrlBonus = 0;
    monsterFarmInstances.forEach(inst => {
        const aIds = character.base?.multiAssignments?.[inst.id] || (character.base?.assignments?.[inst.id] ? [character.base.assignments[inst.id]] : []);
        aIds.forEach(aId => {
            const a = character.inactiveCompanions?.find(c => c.id === aId);
            if (a) {
                totalStrBonus += Math.floor(a.stats.str * 0.01);
                totalCtrlBonus += Math.floor(a.stats.ctrl * 0.01);
            }
        });
    });

    const monsterTrainingLimitInfo = getMonsterFarmTrainingLimitInfo(character);
    const dailyTrainingLimit = monsterTrainingLimitInfo.totalLimit;
    const dailyFeedLimit = Math.floor(FEED_CLEAN_LIMIT * monsterFarmInstances.length * (1 + totalBreedingLevel * 0.02));
    const dailyCleanLimit = Math.floor(FEED_CLEAN_LIMIT * monsterFarmInstances.length * (1 + totalBreedingLevel * 0.02));
    
    const trainCount = character.base?.dailyCounts?.['monster_train'] || 0;
    const feedCount = character.base?.dailyCounts?.['monster_feed'] || 0;
    const cleanCount = character.base?.dailyCounts?.['monster_clean'] || 0;

    const incubatorCapacity = calculateTotalIncubatorCapacity(character.base, character.inactiveCompanions || []);
    const capacity = calculateTotalMonsterCapacity(character.base);
    const currentCount = character.base?.capturedMonsters?.filter(m => m.stage !== MonsterStage.EGG).length || 0;

    const selectedMonster = character.base?.capturedMonsters?.find(m => m.id === selectedMonsterId);

    return {
      monsterFarmInstances,
      currentInstance,
      facilityLevel,
      totalFacilityLevel,
      assignedBreederIds,
      activeBreeders,
      totalBreedingLevel,
      breederBonus,
      trainingEffectBonus,
      totalStrBonus,
      totalCtrlBonus,
      monsterTrainingLimitInfo,
      dailyTrainingLimit,
      dailyFeedLimit,
      dailyCleanLimit,
      trainCount,
      feedCount,
      cleanCount,
      incubatorCapacity,
      capacity,
      currentCount,
      selectedMonster,
    };
  }, [character, instanceId, selectedMonsterId]);

  const [selectedBreederId, setSelectedBreederId] = useState<string>('');
  const [selectedDedicatedStat, setSelectedDedicatedStat] = useState<string>('str');

  useEffect(() => {
    if (selectedMonster) {
      setSelectedBreederId(selectedMonster.assignedBreederId || '');
      setSelectedDedicatedStat(selectedMonster.dedicatedTrainingStat || 'str');
    } else {
      setSelectedBreederId('');
      setSelectedDedicatedStat('str');
    }
  }, [selectedMonster?.id, selectedMonster?.assignedBreederId, selectedMonster?.dedicatedTrainingStat]);

  // Helper to gain breeding exp for assigned breeders
  const gainBreedingExp = (char: Character, exp: number): { newChar: Character, log: string } => {
      const newChar = { ...char };
      let logs: string[] = [];
      const assignedIds = newChar.base?.multiAssignments?.[instanceId!] || (newChar.base?.assignments?.[instanceId!] ? [newChar.base.assignments[instanceId!]] : []);
      
      if (activeBreeders.length > 0) {
          newChar.inactiveCompanions = newChar.inactiveCompanions?.map(comp => {
              if (assignedIds.includes(comp.id) && comp.job === JobType.BREEDER) {
                  const c = { ...comp };
                  if (!c.professions) c.professions = {};
                  if (!c.professions.breeding) c.professions.breeding = { level: 1, exp: 0, maxExp: 100 };
                  
                  const oldLevel = c.professions.breeding.level;
                  c.professions.breeding.exp += exp;
                  while (c.professions.breeding.exp >= c.professions.breeding.maxExp) {
                      c.professions.breeding.exp -= c.professions.breeding.maxExp;
                      c.professions.breeding.level += 1;
                      c.professions.breeding.maxExp = Math.floor(c.professions.breeding.maxExp * 1.2);
                  }
                  if (c.professions.breeding.level > oldLevel) {
                      logs.push(`${c.name}의 사육 숙련도가 상승했습니다! (Lv.${oldLevel} -> Lv.${c.professions.breeding.level})`);
                  }
                  return c;
              }
              return comp;
          });
          return { newChar, log: logs.join('\n') };
      } else {
          const result = gainProfessionExp(newChar, 'breeding', exp);
          if (result.leveledUp) {
              logs.push(`주인공의 사육 숙련도가 상승했습니다! (Lv.${result.oldLevel} -> Lv.${result.newLevel})`);
          }
          return { newChar: result.newChar, log: logs.join('\n') };
      }
  };

  const updateMonster = (id: string, updates: Partial<CapturedMonster>, logMsg?: string, actionType?: 'train' | 'feed' | 'clean') => {
      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      if (!newChar.base) return;
      if (!newChar.base.capturedMonsters) return;
      
      const idx = newChar.base.capturedMonsters.findIndex(m => m.id === id);
      if (idx === -1) return;
      
      newChar.base.capturedMonsters[idx] = { ...newChar.base.capturedMonsters[idx], ...updates };
      
      if (actionType) {
          if (!newChar.base.dailyCounts) newChar.base.dailyCounts = {};
          const key = `monster_${actionType}`;
          newChar.base.dailyCounts[key] = (newChar.base.dailyCounts[key] || 0) + 1;
      }

      onUpdateCharacter(newChar, logMsg || '');
  };

  const checkLevelUp = (monster: CapturedMonster): CapturedMonster => {
      let m = { ...monster };
      if (!m.maxExp) m.maxExp = (m.level || 1) * 100;
      
      let leveledUp = false;
      while ((m.currentExp || 0) >= (m.maxExp || 100)) {
          m.currentExp = (m.currentExp || 0) - (m.maxExp || 100);
          m.level = (m.level || 1) + 1;
          m.maxExp = Math.floor(m.maxExp * 1.2);
          m.statPoints = (m.statPoints || 0) + getStatPointsPerLevel({ ...m, level: m.level || 1 });
          leveledUp = true;
      }

      if (leveledUp) {
          const currentMaxHp = m.stats?.maxHp || m.maxHp || 100;
          const currentMaxMp = m.stats?.maxMp || 50;
          const hpGain = 10 + Math.floor((m.stats?.str || 1) * 2);
          const mpGain = 5 + Math.floor((m.stats?.int || 1) * 1.5);
          const newMaxHp = currentMaxHp + hpGain;
          const newMaxMp = currentMaxMp + mpGain;

          m.maxHp = newMaxHp;
          m.hp = newMaxHp;
          if (m.stats) {
              m.stats = {
                  ...m.stats,
                  maxHp: newMaxHp,
                  hp: newMaxHp,
                  maxMp: newMaxMp,
                  mp: newMaxMp
              };
          }
      }

      return m;
  };

  const handleHarvest = executeWithCooldown(() => {
      if (!selectedMonster || !selectedMonster.production) return;
      
      const harvestBonus = Math.floor(totalBreedingLevel / 10);
      const harvestAmount = 1 + harvestBonus;

      const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
      const newItem: Item = {
          name: selectedMonster.production,
          type: 'Etc',
          rarity: ItemRarity.NORMAL,
          description: `${selectedMonster.production}입니다.`,
          id: Date.now().toString(),
          stock: harvestAmount
      };
      if (!newCharBase.inventory) newCharBase.inventory = [];
      newCharBase.inventory.push(newItem);
      
      const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 20);
      
      let logMsg = `[시스템] ${selectedMonster.name}에게서 ${selectedMonster.production}을(를) ${harvestAmount}개 수확했습니다.`;
      if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

      onUpdateCharacter(newChar, logMsg);

      setResultData({ 
          type: 'success', 
          title: '수확 완료', 
          message: `${selectedMonster.production}을(를) ${harvestAmount}개 얻었습니다. (사육 보너스: +${harvestBonus})`, 
          items: [{ label: '획득', after: `${selectedMonster.production} x${harvestAmount}` }] 
      });
  });

  const handleSlaughter = executeWithCooldown(() => {
      if (!selectedMonster || !selectedMonster.slaughterProduct) return;
      
      const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
      if (!newCharBase.base) return;
      if (!newCharBase.base.capturedMonsters) newCharBase.base.capturedMonsters = [];
      
      const newItem: Item = {
          name: selectedMonster.slaughterProduct,
          type: 'Etc',
          rarity: ItemRarity.NORMAL,
          description: `${selectedMonster.slaughterProduct}입니다.`,
          id: Date.now().toString(),
          stock: 1
      };
      if (!newCharBase.inventory) newCharBase.inventory = [];
      newCharBase.inventory.push(newItem);
      
      newCharBase.base.capturedMonsters = newCharBase.base.capturedMonsters.filter(m => m.id !== selectedMonster.id);
      
      const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 10);
      
      let logMsg = `[시스템] ${selectedMonster.name}을(를) 도축하여 ${selectedMonster.slaughterProduct}을(를) 얻었습니다.`;
      if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

      onUpdateCharacter(newChar, logMsg);
      setSelectedMonsterId(null);
      setResultData({ type: 'info', title: '도축 완료', message: `${selectedMonster.slaughterProduct}을(를) 얻었습니다.`, items: [{ label: '획득', after: selectedMonster.slaughterProduct }] });
  });

  const handleDistributeStat = (statName: keyof Stats) => {
      if (!selectedMonster) return;
      const currentPoints = selectedMonster.statPoints || 0;
      if (currentPoints <= 0) {
          alert('분배 가능한 스탯 포인트가 없습니다.');
          return;
      }

      const updatedMonsters = (character.base?.capturedMonsters || []).map(m => {
          if (m.id === selectedMonster.id) {
              const currentStats = m.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, def: 10, wis: 10, agi: 10, ctrl: 10 };
              const currentVal = (currentStats[statName] || 0) as number;
              return {
                  ...m,
                  statPoints: currentPoints - 1,
                  stats: {
                      ...currentStats,
                      [statName]: currentVal + 1,
                      ...(statName === 'str' ? { maxHp: (currentStats.maxHp || 100) + 10, hp: (currentStats.hp || 100) + 10 } : {}),
                      ...(statName === 'int' ? { maxMp: (currentStats.maxMp || 50) + 5, mp: (currentStats.mp || 50) + 5 } : {})
                  }
              };
          }
          return m;
      });

      const updatedChar = {
          ...character,
          base: {
              ...character.base!,
              capturedMonsters: updatedMonsters
          }
      };

      onUpdateCharacter(updatedChar, `[사육소] ${selectedMonster.name} 스탯 분배 (${statName.toUpperCase()} +1)`);
  };

  const handleCreateMonsterStageSkill = () => {
      if (!selectedMonster || !skillStageTarget || !skillNameInput.trim()) return;

      let baseRatio = 150;
      if (skillStageTarget === MonsterStage.ADULT) baseRatio = 250;
      else if (skillStageTarget === MonsterStage.PERFECT) baseRatio = 500;
      else if (skillStageTarget === MonsterStage.ULTIMATE) baseRatio = 1500;
      else if (skillStageTarget === MonsterStage.SUPER_ULTIMATE) baseRatio = 3000;

      const finalPowerRatio = skillTargetType === 'aoe' ? Math.floor(baseRatio / 2) : baseRatio;

      const newSkill: Skill = {
          id: `m_skill_${Date.now()}`,
          name: skillNameInput.trim(),
          description: skillDescInput.trim() || `${skillStageTarget} 단계 전용 특화 기술입니다.`,
          powerRatio: finalPowerRatio,
          mpCost: Math.floor(finalPowerRatio * 0.08) + 10,
          targetType: skillTargetType,
          type: (skillDamageType === 'magical' ? SkillType.MAGIC : SkillType.PHYSICAL) as SkillType,
          minClassTier: "1",
          tier: ClassTier.FIRST,
          level: 1,
          maxLevel: 10,
          currentMastery: 0,
          effectFormula: ''
      };

      const updatedMonsters = (character.base?.capturedMonsters || []).map(m => {
          if (m.id === selectedMonster.id) {
              const currentSkills = m.skills || [];
              const stageRecord = m.stageSkillsCreated || {};
              return {
                  ...m,
                  skills: [...currentSkills, newSkill],
                  stageSkillsCreated: { ...stageRecord, [skillStageTarget]: true }
              };
          }
          return m;
      });

      const updatedChar = {
          ...character,
          base: {
              ...character.base!,
              capturedMonsters: updatedMonsters
          }
      };

      onUpdateCharacter(updatedChar, `[사육소] ${selectedMonster.name}의 ${skillStageTarget} 단계 스킬 [${newSkill.name}] (PowerRatio: ${finalPowerRatio}%) 창조 완료`);
      setShowCreateSkillModal(false);
      setSkillNameInput('');
      setSkillDescInput('');
  };

  const handleFeed = executeWithCooldown(() => {
      if (!selectedMonster) return;
      const maxPossibleDaily = Math.max(0, dailyFeedLimit - feedCount);
      if (maxPossibleDaily <= 0) {
          setResultData({ type: 'warning', title: '횟수 제한', message: '오늘의 먹이주기 횟수를 모두 소진했습니다.', items: [{ label: '제한', after: `${dailyFeedLimit}회` }] });
          return;
      }
      const availableFood = character.base?.resources.food || 0;
      if (availableFood < 1) {
          setResultData({ type: 'warning', title: '식량 부족', message: '몬스터에게 줄 식량이 부족합니다.', items: [{ label: '부족', after: '식량 1개 이상 필요' }] });
          return;
      }
      
      const feedTimesToExecute = Math.min(selectedCareTimes, Math.min(maxPossibleDaily, availableFood));
      if (feedTimesToExecute <= 0) return;

      const hungerGain = 30 * feedTimesToExecute;
      const newHunger = Math.min(100, (selectedMonster.hunger || 0) + hungerGain);
      const affectionGain = 2 * feedTimesToExecute;
      const newAffection = Math.min(100, (selectedMonster.affection || 0) + affectionGain);
      const expGain = 50 * feedTimesToExecute;
      
      let updatedMonster: CapturedMonster = { 
          ...selectedMonster,
          hunger: newHunger,
          affection: newAffection,
          currentExp: (selectedMonster.currentExp || 0) + expGain
      };
      
      updatedMonster = checkLevelUp(updatedMonster);

      const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
      if (!newCharBase.base) return;
      newCharBase.base.resources.food = Math.max(0, (newCharBase.base.resources.food || 0) - feedTimesToExecute);
      
      if (!newCharBase.base.dailyCounts) newCharBase.base.dailyCounts = {};
      newCharBase.base.dailyCounts['monster_feed'] = (newCharBase.base.dailyCounts['monster_feed'] || 0) + feedTimesToExecute;
      
      if (!newCharBase.base.capturedMonsters) newCharBase.base.capturedMonsters = [];
      const idx = newCharBase.base.capturedMonsters.findIndex(m => m.id === selectedMonster.id);
      if (idx !== -1) {
          newCharBase.base.capturedMonsters[idx] = updatedMonster;
      }

      const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 10 * feedTimesToExecute);

      let logMsg = `[시스템] ${selectedMonster.name}에게 먹이를 ${feedTimesToExecute}회 주었습니다. (식량 -${feedTimesToExecute}개, 포만감 +${Math.min(100 - (selectedMonster.hunger || 0), hungerGain)}%)`;
      if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

      onUpdateCharacter(newChar, logMsg);

      setResultData({
          type: 'success',
          title: '먹이 주기 완료',
          message: `${selectedMonster.name}에게 먹이를 ${feedTimesToExecute}회 주어 기력을 보충했습니다.`,
          items: [
              { label: '진행 횟수', after: `${feedTimesToExecute}회` },
              { label: '소모 식량', after: `-${feedTimesToExecute}개` },
              { label: '현재 포만감', after: `${newHunger}%` },
              { label: '친밀도', after: `${newAffection}% (+${affectionGain}%)` }
          ]
      });
  });

  const handleClean = executeWithCooldown(() => {
      if (!selectedMonster) return;
      const maxPossibleDaily = Math.max(0, dailyCleanLimit - cleanCount);
      if (maxPossibleDaily <= 0) {
          setResultData({ type: 'warning', title: '횟수 제한', message: '오늘의 청소하기 횟수를 모두 소진했습니다.', items: [{ label: '제한', after: `${dailyCleanLimit}회` }] });
          return;
      }
      
      const cleanTimesToExecute = Math.min(selectedCareTimes, maxPossibleDaily);
      if (cleanTimesToExecute <= 0) return;

      const newCleanliness = 100;
      const affectionGain = 1 * cleanTimesToExecute;
      const newAffection = Math.min(100, (selectedMonster.affection || 0) + affectionGain);

      const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
      if (!newCharBase.base || !newCharBase.base.capturedMonsters) return;
      const idx = newCharBase.base.capturedMonsters.findIndex(m => m.id === selectedMonster.id);
      if (idx === -1) return;

      newCharBase.base.capturedMonsters[idx] = { ...newCharBase.base.capturedMonsters[idx], cleanliness: newCleanliness, affection: newAffection };
      if (!newCharBase.base.dailyCounts) newCharBase.base.dailyCounts = {};
      newCharBase.base.dailyCounts['monster_clean'] = (newCharBase.base.dailyCounts['monster_clean'] || 0) + cleanTimesToExecute;

      const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 5 * cleanTimesToExecute);

      let logMsg = `[시스템] ${selectedMonster.name}의 주변을 ${cleanTimesToExecute}회 청소했습니다. (청결도 100%, 친밀도 +${affectionGain}%)`;
      if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

      onUpdateCharacter(newChar, logMsg);

      setResultData({
          type: 'success',
          title: '청소 완료',
          message: `${selectedMonster.name}의 사육장을 ${cleanTimesToExecute}회 정돈하여 쾌적하게 만들었습니다.`,
          items: [
              { label: '진행 횟수', after: `${cleanTimesToExecute}회` },
              { label: '청결도', after: '100%' },
              { label: '친밀도', after: `${newAffection}% (+${affectionGain}%)` }
          ]
      });
  });

  const handleTraining = executeWithCooldown((type: 'STR' | 'INT' | 'DEF' | 'AGI' | 'HP' | 'MP' | 'WIS' | 'CTRL') => {
      if (!selectedMonster) return;
      
      if (isLateNight) {
          setResultData({
              type: 'warning',
              title: '야간 휴식 시간',
              message: '심야 시간대(22:00 ~ 06:00)에는 몬스터의 수면과 안정을 위해 훈련을 진행할 수 없습니다. 주간 시간대에 이용해 주세요.',
              items: [
                  { label: '현재 시각', after: timeStr },
                  { label: '훈련 가능 시간', after: '06:00 ~ 22:00 (주간)' }
              ]
          });
          return;
      }

      if (dailyTrainingLimit <= 0) {
          setResultData({
              type: 'warning',
              title: '사육소 필요',
              message: '몬스터 훈련을 진행하려면 기지에 몬스터 사육소가 건설되어 있어야 합니다.',
              items: [{ label: '건설 상태', after: '미건설 (사육소 필요)' }]
          });
          return;
      }

      const maxPossibleTimes = Math.max(0, dailyTrainingLimit - trainCount);
      if (maxPossibleTimes <= 0) {
          setResultData({
              type: 'warning',
              title: '훈련 제한',
              message: '오늘의 몬스터 사육소 훈련 횟수를 모두 소진했습니다. 자정에 초기화됩니다.',
              items: [{ label: '진행 횟수', after: `${trainCount} / ${dailyTrainingLimit}회 (일일 최대 100회)` }]
          });
          return;
      }

      // 사육사 숙련레벨에 따른 1회당 포만감 소모량 감면 (기본 20, 최소 5까지 절감)
      const hungerReductionDiscount = Math.min(15, Math.floor(totalBreedingLevel * 0.3));
      const hungerCostPerTrain = Math.max(5, 20 - hungerReductionDiscount);

      const maxByHunger = Math.floor((selectedMonster.hunger || 0) / hungerCostPerTrain);
      const trainTimesToExecute = Math.min(selectedTrainTimes, Math.min(maxPossibleTimes, maxByHunger));

      if (trainTimesToExecute <= 0) {
          if (maxByHunger <= 0) {
              setResultData({
                  type: 'warning',
                  title: '기력 부족',
                  message: `${selectedMonster.name}이(가) 너무 배가 고파 훈련을 수행할 수 없습니다.`,
                  items: [
                      { label: '현재 포만감', after: `${selectedMonster.hunger}%` },
                      { label: '1회 필요 포만감', after: `${hungerCostPerTrain}% (사육사 감면 -${hungerReductionDiscount}%)` }
                  ]
              });
              return;
          }
          return;
      }
      
      // 랭크별 훈련 보너스 계수 (S: 2배, SS: 3배, SSS: 5배)
      let rankMultiplier = 1;
      const monsterRank = selectedMonster.rank || 'C';
      if (monsterRank === 'SSS') rankMultiplier = 5;
      else if (monsterRank === 'SS') rankMultiplier = 3;
      else if (monsterRank === 'S') rankMultiplier = 2;
      
      const isDedicatedStat = selectedMonster.assignedBreederId && selectedMonster.dedicatedTrainingStat === type.toLowerCase();
      const dedicatedMultiplier = isDedicatedStat ? 1.5 : 1;

      const baseGain = 2 * rankMultiplier;
      const finalGain = Math.max(1, Math.floor(baseGain * trainingEffectBonus * dedicatedMultiplier));
      
      const statKey = type.toLowerCase() as keyof Stats;
      const currentStat = selectedMonster.stats?.[statKey] || 1;
      
      const trainingLog = selectedMonster.trainingLog ? { ...selectedMonster.trainingLog } : { str: 0, int: 0, def: 0, agi: 0, magic: 0 };
      if (['str','int','def','agi'].includes(statKey)) {
          trainingLog[statKey as keyof typeof trainingLog] += trainTimesToExecute;
      }

      const defaultStats: Stats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
      const newStats = { ...defaultStats, ...(selectedMonster.stats || {}) };
      
      const singleGain = (type === 'HP' || type === 'MP') ? finalGain * 10 : finalGain;
      const totalGain = singleGain * trainTimesToExecute;

      // @ts-ignore
      newStats[statKey] = currentStat + totalGain;
      if (statKey === 'hp') {
          newStats.maxHp = (newStats.maxHp || 100) + totalGain;
          newStats.hp = (newStats.hp || 100) + totalGain;
      }
      if (statKey === 'mp') {
          newStats.maxMp = (newStats.maxMp || 50) + totalGain;
          newStats.mp = (newStats.mp || 50) + totalGain;
      }

      const totalHungerCost = hungerCostPerTrain * trainTimesToExecute;

      let updatedMonster: CapturedMonster = {
          ...selectedMonster,
          stats: newStats,
          trainingLog: trainingLog,
          hunger: (selectedMonster.hunger || 0) - totalHungerCost,
          currentExp: (selectedMonster.currentExp || 0) + (100 * trainTimesToExecute)
      };
      
      updatedMonster = checkLevelUp(updatedMonster);
      
      const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
      if (!newCharBase.base || !newCharBase.base.capturedMonsters) return;
      const idx = newCharBase.base.capturedMonsters.findIndex(m => m.id === selectedMonster.id);
      if (idx === -1) return;

      newCharBase.base.capturedMonsters[idx] = updatedMonster;
      if (!newCharBase.base.dailyCounts) newCharBase.base.dailyCounts = {};
      newCharBase.base.dailyCounts['monster_train'] = (newCharBase.base.dailyCounts['monster_train'] || 0) + trainTimesToExecute;

      const { newChar: charWithExp, log: breedingLog } = gainBreedingExp(newCharBase, 30 * trainTimesToExecute);

      const singleMinutes = Math.max(1, Math.floor(60 / Math.max(1, dailyTrainingLimit)));
      const totalMinutes = singleMinutes * trainTimesToExecute;
      const timeRes = advanceGameTime(charWithExp, totalMinutes, { activityName: "몬스터 사육 훈련" });
      const finalChar = timeRes.updatedCharacter;

      const typeNames: Record<string, string> = {
          STR: '공격',
          DEF: '방어',
          INT: '지능',
          AGI: '민첩',
          HP: '체력',
          MP: '마나',
          WIS: '지혜',
          CTRL: '통제'
      };
      const typeKorean = typeNames[type] || type;

      const rankText = rankMultiplier > 1 ? ` (${monsterRank}랭크 ${rankMultiplier}배 보너스)` : '';
      const dedicatedText = isDedicatedStat ? ` [전담 사육사 ${selectedMonster.assignedBreederName || ''} 지도 1.5배 보너스]` : '';
      let logMsg = `[시스템] ${selectedMonster.name} ${typeKorean} 훈련 ${trainTimesToExecute}회 완료 (시간 +${totalMinutes}분, 스탯 +${totalGain}, 포만감 -${totalHungerCost}%, 사육사 보너스${rankText}${dedicatedText} 적용)`;
      if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

      onUpdateCharacter(finalChar, logMsg, timeRes.dailyReport);

      const itemsList = [
          { label: '훈련 횟수', after: `${trainTimesToExecute}회 진행` },
          { label: '소모 포만감', after: `-${totalHungerCost}% (1회당 ${hungerCostPerTrain}%, 감면 -${hungerReductionDiscount}%)` },
          { label: '소모 시간', after: totalMinutes >= 60 ? `+${Math.floor(totalMinutes / 60)}시간${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}분` : ''}` : `+${totalMinutes}분` },
          { label: '스탯 상승치', after: `+${totalGain}` },
          { label: '사육 보너스', after: `+${Math.floor((trainingEffectBonus - 1) * 100)}%` }
      ];
      if (isDedicatedStat) {
          itemsList.push({ label: '전담 사육사 특혜', after: `${selectedMonster.assignedBreederName || '사육사'} 전담 1.5배` });
      }
      if (rankMultiplier > 1) {
          itemsList.push({ label: '랭크 특혜', after: `${monsterRank}랭크 (${rankMultiplier}배)` });
      }

      setResultData({
          type: 'success',
          title: '훈련 완료',
          message: `${selectedMonster.name}의 ${typeKorean} 훈련을 ${trainTimesToExecute}회 진행하여 능력치가 상승했습니다.`,
          items: itemsList
      });
  });

  const handleSaveDedicatedBreeder = (breederId: string, statKey: string) => {
    if (!selectedMonster) return;
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base?.capturedMonsters) return;
    const idx = newChar.base.capturedMonsters.findIndex(m => m.id === selectedMonster.id);
    if (idx === -1) return;

    if (!breederId) {
      newChar.base.capturedMonsters[idx].assignedBreederId = undefined;
      newChar.base.capturedMonsters[idx].assignedBreederName = undefined;
      newChar.base.capturedMonsters[idx].dedicatedTrainingStat = undefined;
      onUpdateCharacter(newChar, `[몬스터 사육소] ${selectedMonster.name}의 전담 사육사 배정이 해제되었습니다.`);
      setResultData({
        type: 'info',
        title: '전담 사육 해제',
        message: `${selectedMonster.name}의 전담 사육사 배정이 해제되었습니다.`
      });
      return;
    }

    const breederComp = activeBreeders.find(b => b.id === breederId);
    const breederName = breederComp ? breederComp.name : '사육사';

    // 1:1 전담 유지: 다른 몬스터에 배정되어 있던 경우 해제
    newChar.base.capturedMonsters.forEach(m => {
      if (m.id !== selectedMonster.id && m.assignedBreederId === breederId) {
        m.assignedBreederId = undefined;
        m.assignedBreederName = undefined;
      }
    });

    newChar.base.capturedMonsters[idx].assignedBreederId = breederId;
    newChar.base.capturedMonsters[idx].assignedBreederName = breederName;
    newChar.base.capturedMonsters[idx].dedicatedTrainingStat = statKey as any;

    const statKoreanMap: Record<string, string> = {
      str: '공격력(STR)',
      def: '방어력(DEF)',
      int: '지능(INT)',
      agi: '민첩(AGI)',
      wis: '지혜(WIS)',
      ctrl: '통제력(CTRL)',
      hp: '최대 체력(HP)',
      mp: '최대 마나(MP)'
    };
    const statKr = statKoreanMap[statKey] || statKey.toUpperCase();

    onUpdateCharacter(newChar, `[몬스터 사육소] ${selectedMonster.name}에게 전담 사육사 [${breederName}] 배정 완료 (성장 지정 능력치: ${statKr})`);
    setResultData({
      type: 'success',
      title: '전담 사육사 배정 완료',
      message: `${selectedMonster.name}의 훈련을 사육사 [${breederName}]에게 전담하도록 배정했습니다.`,
      items: [
        { label: '전담 사육사', after: breederName },
        { label: '성장 지정 능력치', after: statKr },
        { label: '육성 혜택', after: '매일 자정 자동 집중 성장 및 훈련 시 1.5배 보너스' }
      ]
    });
  };

  const handleDedicatedInstantTrain = () => {
    if (!selectedMonster || !selectedMonster.assignedBreederId || !selectedMonster.dedicatedTrainingStat) return;
    const statKey = selectedMonster.dedicatedTrainingStat;
    const typeUpperMap: Record<string, 'STR' | 'INT' | 'DEF' | 'AGI' | 'HP' | 'MP' | 'WIS' | 'CTRL'> = {
      str: 'STR',
      def: 'DEF',
      int: 'INT',
      agi: 'AGI',
      wis: 'WIS',
      ctrl: 'CTRL',
      hp: 'HP',
      mp: 'MP'
    };
    const statType = typeUpperMap[statKey] || 'STR';
    handleTraining(statType);
  };

  const generateCoolEvolvedSkill = (monsterName: string, shinryoku: string, stage: string): Skill => {
      const isFire = /화염|불|염|용|드래곤|레드|버닝/i.test(monsterName) || /화염|불/i.test(shinryoku || '');
      const isIce = /빙결|얼음|빙|청|아이스|프로스트/i.test(monsterName) || /빙결|수/i.test(shinryoku || '');
      const isLightning = /뇌전|전기|번개|뇌|라이트닝|볼트/i.test(monsterName) || /뇌전|전기/i.test(shinryoku || '');
      const isDark = /암흑|어둠|흑|마|데몬|골드|사망/i.test(monsterName) || /암흑|어둠/i.test(shinryoku || '');
      const isHoly = /신성|빛|백|엔젤|아크|세이크리드/i.test(monsterName) || /신성|빛/i.test(shinryoku || '');

      let name = '';
      let description = '';
      let powerRatio = 180;
      let mpCost = 30;
      let targetType: 'single' | 'aoe' = 'single';

      if (stage === MonsterStage.CHILD) { // 성장기
          targetType = 'single';
          powerRatio = 150;
          mpCost = 15;
          name = '야성의 성장 일격';
          description = '성장기에 도달하여 한층 강해진 육체로 적을 타격합니다.';
      } else if (stage === MonsterStage.ADULT) { // 성숙기
          targetType = 'single';
          powerRatio = 250;
          mpCost = 25;
          if (isFire) {
              name = '화염 폭렬발톱';
              description = '응축된 화염 기운을 발톱에 모아 적을 강하게 베어 가르는 기술입니다.';
          } else if (isIce) {
              name = '빙하 송곳파동';
              description = '날카로운 얼음 송곳을 연속으로 생성하여 적의 방어를 꿰뚫습니다.';
          } else if (isLightning) {
              name = '전광 뇌격참';
              description = '빛의 속도로 적에게 접근하여 뇌전의 충격을 가하는 번개 공격입니다.';
          } else if (isDark) {
              name = '암흑 파동탄';
              description = '음침한 암흑 마력을 구체로 모아 적에게 던져 정신과 육체에 타격을 줍니다.';
          } else if (isHoly) {
              name = '성광 섬광포';
              description = '신성한 눈부신 빛의 파동을 방출하여 흑마력을 태우는 정화 기술입니다.';
          } else {
              name = '야수의 맹습';
              description = '성숙해진 육체의 강력한 근력을 바탕으로 적을 강타하는 포효 공격입니다.';
          }
      } else if (stage === MonsterStage.PERFECT) { // 완전체
          targetType = 'aoe';
          powerRatio = targetType === 'aoe' ? 250 : 500;
          mpCost = 45;
          if (isFire) {
              name = '연옥의 지옥화염탄';
              description = '지옥의 열기를 소환하여 넓은 범위의 적들을 한 번에 태워버리는 완전체 비기입니다.';
          } else if (isIce) {
              name = '절대영도 블리자드';
              description = '주위 온도를 절대영도로 떨어뜨려 적 전체를 빙결시키고 파쇄합니다.';
          } else if (isLightning) {
              name = '천둥번개 뇌신의 징벌';
              description = '하늘에서 무수한 뇌전을 내리쳐 대지를 초토화시키는 광범위 뇌격입니다.';
          } else if (isDark) {
              name = '심연의 멸망 파동';
              description = '심연의 문을 열어 불길한 마력을 방출해 전체 적의 생명력을 갉아먹습니다.';
          } else if (isHoly) {
              name = '대천사의 심판 광휘';
              description = '거대한 빛의 기둥을 내리쬐어 악한 존재들을 단숨에 소멸시키는 신성 공격입니다.';
          } else {
              name = '대지의 진동 폭풍';
              description = '대지를 강력하게 강타하여 강력한 충격파로 적 전체를 뒤흔드는 난무 스킬입니다.';
          }
      } else if (stage === MonsterStage.ULTIMATE) { // 궁극체
          targetType = 'aoe';
          powerRatio = targetType === 'aoe' ? 750 : 1500;
          mpCost = 65;
          if (isFire) {
              name = '초신성 초용왕 강림포';
              description = '태양의 핵에 필적하는 초고열 에너지로 전장을 순식간에 재로 만드는 궁극의 필살기입니다.';
          } else if (isIce) {
              name = '만년빙경 만물소멸 해일';
              description = '시공간마저 동결시키는 만년의 빙룡 마력으로 시야 내의 모든 존재를 깨부숩니다.';
          } else if (isLightning) {
              name = '신뢰의 멸세 창공포';
              description = '신들의 뇌전을 하나로 응축시켜 일직선상의 모든 차원을 꿰뚫어 버리는 최강 뇌격입니다.';
          } else if (isDark) {
              name = '종말의 허무 구체';
              description = '모든 것을 삼키는 블랙홀 형태의 암흑 마력을 생성하여 존재 자체를 소멸시킵니다.';
          } else if (isHoly) {
              name = '창세의 구원 신성강림';
              description = '신성한 최고위 광휘로 전장을 물들여 흉악한 무리를 가차 없이 창세의 빛으로 안식시킵니다.';
          } else {
              name = '천공 파쇄 제왕격';
              description = '궁극의 육체와 정령의 힘이 결합하여 공간을 비틀어 버리는 압도적 강타입니다.';
          }
      } else { // 초궁극체 등
          targetType = 'aoe';
          powerRatio = targetType === 'aoe' ? 1500 : 3000;
          mpCost = 90;
          name = `${stage} 신위 강림`;
          description = '차원의 경계를 허물고 초월적인 권능을 행사하여 모든 적을 압도하는 신화급 기술입니다.';
      }

      return {
          id: `skill-evolve-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name,
          description,
          type: SkillType.MAGIC,
          targetType,
          mpCost,
          powerRatio,
          level: 1,
          maxLevel: 10,
          currentMastery: 0,
          tier: ClassTier.NONE,
          effectFormula: `${powerRatio}% 피해`
      };
  };

  const handleEvolve = () => {
      if (!selectedMonster || isActionLocked) return;
      setIsActionLocked(true);
      setTimeout(() => setIsActionLocked(false), 500);
      const stageConfig = STAGE_THRESHOLDS[selectedMonster.stage || MonsterStage.BABY];
      if (!stageConfig || !stageConfig.next) return;
      
      const cleanBaseName = selectedMonster.name.replace(/유아기|성숙기|완전체|궁극체|초월체/g, '').trim();
      const nextName = `${stageConfig.next} ${cleanBaseName || selectedMonster.name}`;

      const newSkill = generateCoolEvolvedSkill(selectedMonster.name, selectedMonster.shinryokuType || '', stageConfig.next);
      const newSkills: Skill[] = [newSkill];

      const newStats: Stats = { ...selectedMonster.stats! };
      Object.keys(newStats).forEach(k => {
          // @ts-ignore
          newStats[k] = Math.floor(newStats[k] * 1.5);
      });
      newStats.hp = newStats.maxHp; 
      newStats.mp = newStats.maxMp;

      const ranks = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
      const currentRankIdx = ranks.indexOf(selectedMonster.rank);
      const nextRank = currentRankIdx < ranks.length - 1 ? ranks[currentRankIdx + 1] : selectedMonster.rank;

      const existingSkills = selectedMonster.skills || [];
      const updatedSkills = [...existingSkills, ...newSkills];
      const isUrlString = (str?: string) => Boolean(str && (str.startsWith('http') || str.startsWith('/') || str.startsWith('data:')));
      const actualVisualUrl = selectedMonster.visualUrl || (isUrlString(selectedMonster.appearance) ? selectedMonster.appearance : '') || getMonsterInfo(selectedMonster.name)?.visualUrl || '';
      const textDesc = selectedMonster.appearance && !isUrlString(selectedMonster.appearance)
          ? selectedMonster.appearance
          : `${nextName}의 당당한 모습입니다.`;

      updateMonster(selectedMonster.id, {
          name: nextName,
          appearance: textDesc,
          visualUrl: actualVisualUrl,
          stage: stageConfig.next,
          rank: nextRank as any,
          stats: newStats,
          skills: updatedSkills
      }, `[시스템] ${selectedMonster.name} 진화! -> ${nextName} (${stageConfig.next})`);
      
      setEvolutionModalData({
          prevMonster: {
              name: selectedMonster.name,
              stage: selectedMonster.stage,
              appearance: actualVisualUrl,
              stats: selectedMonster.stats,
              rank: selectedMonster.rank
          },
          nextMonster: {
              name: nextName,
              stage: stageConfig.next,
              appearance: actualVisualUrl,
              stats: newStats,
              rank: nextRank,
              skills: newSkills
          }
      });
  };

  const handleRecruit = () => {
      if (!selectedMonster || isActionLocked) return;
      setIsActionLocked(true);
      setTimeout(() => setIsActionLocked(false), 500);
      
      const result = recruitMonster(character, selectedMonster.id);
      
      if (!result.success) {
          setResultData({ type: 'warning', title: '영입 실패', message: result.message, items: [] });
          return;
      }

      onUpdateCharacter(result.newCharacter, result.message);
      setSelectedMonsterId(null);
      setResultData({
          type: 'success',
          title: '동료 영입 성공!',
          message: `${selectedMonster.name}이(가) ${result.type === 'party' ? '파티' : '기지(대기)'}에 합류했습니다.`,
          items: [
              { label: '배치', after: result.type === 'party' ? `파티 (${result.newCharacter.companions.length}/${MAX_PARTY_SIZE})` : '기지 (대기)' }
          ]
      });
  };

  const openRenameModal = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedMonster) {
          setRenameInput(selectedMonster.nickname || selectedMonster.name);
          setShowRenameModal(true);
      }
  };

  const confirmRename = () => {
      if (selectedMonster && renameInput.trim() !== "") {
          updateMonster(selectedMonster.id, { nickname: renameInput }, `[시스템] 몬스터 이름을 변경했습니다: ${renameInput}`);
          setShowRenameModal(false);
      }
  };

  const openReleaseModal = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedMonster) {
          setShowReleaseModal(true);
      }
  };

  const confirmRelease = () => {
      if (!selectedMonster) return;

      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      if (!newChar.base || !newChar.base.capturedMonsters) return;
      
      newChar.base.capturedMonsters = newChar.base.capturedMonsters.filter(m => m.id !== selectedMonster.id);
      
      setShowReleaseModal(false);
      setSelectedMonsterId(null); 
      onUpdateCharacter(newChar, `[시스템] ${selectedMonster.name}을(를) 자연으로 방생했습니다.`);
      
      setResultData({
          type: 'info',
          title: '방생 완료',
          message: `${selectedMonster.name}이(가) 자연으로 돌아갔습니다.`,
          items: []
      });
  };

  const handleInventoryEggToIncubator = (itemIndex: number) => {
      const item = character.inventory[itemIndex];
      if (!item) return;
      const eggsInIncubator = character.base?.capturedMonsters?.filter(m => m.stage === MonsterStage.EGG).length || 0;
      if (eggsInIncubator >= incubatorCapacity) {
          setResultData({
              type: 'warning',
              title: '인큐베이터 가득 참',
              message: '더 이상 알을 넣을 자리가 없습니다.',
              items: [{ label: '최대 수용량', after: `${incubatorCapacity}개` }]
          });
          return;
      }
      const hatchDate = addDays(character.currentDate || '2000-01-01', 7);
      const newEgg: CapturedMonster = {
          name: item.name, id: Math.random().toString(36).substring(7), stage: MonsterStage.EGG, hatchDueDate: hatchDate, rank: 'C', 
          hp: 1, maxHp: 1, stats: { hp:1, maxHp:1, mp:1, maxMp:1, str:1, int:1, def:1, wis:1, agi:1, ctrl:1 }, affection: 0, isTamed: true, capturedDate: character.currentDate || '', statusEffects: [], level: 0, description: "부화를 기다리는 알입니다."
      };
      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      if (!newChar.inventory) newChar.inventory = [];
      newChar.inventory.splice(itemIndex, 1);
      if (!newChar.base) return;
      if (!newChar.base.capturedMonsters) newChar.base.capturedMonsters = [];
      newChar.base.capturedMonsters.push(newEgg);
      onUpdateCharacter(newChar, `[시스템] ${item.name}을(를) 인큐베이터에 넣었습니다. (부화 예정일: ${hatchDate})`);
  };

  const handleHatchEgg = (monsterId: string, instant: boolean = false) => {
      const egg = character.base?.capturedMonsters?.find(m => m.id === monsterId);
      if (!egg) return;
      
      if (!instant && character.currentDate! < (egg.hatchDueDate || '9999-12-31')) {
          setResultData({
              type: 'info',
              title: '부화 준비 중',
              message: '아직 알을 깨고 나올 시기가 아닙니다.',
              items: [{ label: '부화 예정일', after: egg.hatchDueDate || '정보 없음' }]
          });
          return;
      }

      if (instant) {
          if ((character.base?.resources.manaCrystal || 0) < 5) {
              setResultData({
                  type: 'warning',
                  title: '자원 부족',
                  message: '즉시 부화에 필요한 마정석이 부족합니다.',
                  items: [{ label: '부족', after: '마정석 5개' }]
              });
              return;
          }
          const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
          newCharBase.base!.resources.manaCrystal -= 5;
          let rank: any = 'C';
          if (egg.name.includes('SSS등급')) rank = 'SSS';
          else if (egg.name.includes('SS등급')) rank = 'SS';
          else if (egg.name.includes('S등급')) rank = 'S';
          else if (egg.name.includes('A등급')) rank = 'A';
          else if (egg.name.includes('B등급')) rank = 'B';
          const hatched = generateHatchedMonster(rank, character.currentDate || '', totalFacilityLevel);
          hatched.id = egg.id;
          const idx = newCharBase.base!.capturedMonsters.findIndex(m => m.id === egg.id);
          newCharBase.base!.capturedMonsters[idx] = hatched;
          
          const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 50);
          
          let logMsg = `[시스템] 알이 부화했습니다! ${hatched.name} 탄생!`;
          if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

          onUpdateCharacter(newChar, logMsg);
          setResultData({ type: 'success', title: '부화 성공!', message: `알을 깨고 ${hatched.name}이(가) 태어났습니다!`, items: [{ label: '등급', after: hatched.rank }] });
      } else {
          let rank: any = 'C';
          if (egg.name.includes('SSS등급')) rank = 'SSS';
          else if (egg.name.includes('SS등급')) rank = 'SS';
          else if (egg.name.includes('S등급')) rank = 'S';
          else if (egg.name.includes('A등급')) rank = 'A';
          else if (egg.name.includes('B등급')) rank = 'B';
          const hatched = generateHatchedMonster(rank, character.currentDate || '', totalFacilityLevel);
          hatched.id = egg.id;
          
          const newCharBase = JSON.parse(JSON.stringify(character)) as Character;
          const idx = newCharBase.base!.capturedMonsters.findIndex(m => m.id === egg.id);
          newCharBase.base!.capturedMonsters[idx] = hatched;

          const { newChar, log: breedingLog } = gainBreedingExp(newCharBase, 100);
          
          let logMsg = `[시스템] 알이 부화했습니다! ${hatched.name} 탄생!`;
          if (breedingLog) logMsg += `\n[시스템] ${breedingLog}`;

          onUpdateCharacter(newChar, logMsg);
          setResultData({ type: 'success', title: '부화 성공!', message: `알을 깨고 ${hatched.name}이(가) 태어났습니다!`, items: [{ label: '등급', after: hatched.rank }] });
      }
  };

  // Helper for checking monster status/placement
  const getMonsterPlacement = (monsterId: string) => {
    if (character.mountedMonsterId === monsterId) {
      return { label: '탈것 장착 중', icon: '🐎', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (character.companions.some(c => c.id === monsterId)) {
      return { label: '파티 출전 중', icon: '⚔️', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    if (character.inactiveCompanions?.some(c => c.id === monsterId)) {
      return { label: '기지 대기 중', icon: '🏠', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
    return { label: '사육소 보관', icon: '🐾', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  const renderDetailView = () => {
      if (!selectedMonster) return null;
      const stageInfo = STAGE_THRESHOLDS[selectedMonster.stage || MonsterStage.BABY];
      const canEvolve = stageInfo && (selectedMonster.level || 1) >= stageInfo.maxLvl;
      const expPercent = Math.min(100, ((selectedMonster.currentExp || 0) / (selectedMonster.maxExp || 100)) * 100);
      const displayName = selectedMonster.nickname ? `${selectedMonster.nickname}` : selectedMonster.name;
      const rankCfg = RANK_CONFIG[selectedMonster.rank] || RANK_CONFIG['C'];
      const placement = getMonsterPlacement(selectedMonster.id);

      return (
          <div className="flex flex-col h-full bg-slate-950">
              {/* 상단 액션 헤더 */}
              <div className="p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 shrink-0">
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedMonsterId(null)} 
                        className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                          <ArrowLeft size={16} />
                          <span className="hidden sm:inline">목록으로</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-slate-100 text-sm sm:text-base">{displayName}</h3>
                          {selectedMonster.nickname && (
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">({selectedMonster.name})</span>
                          )}
                          <button 
                            onClick={openRenameModal} 
                            className="text-slate-400 hover:text-amber-400 p-1 bg-slate-800 rounded border border-slate-700 transition-colors"
                            title="이름 변경"
                          >
                              <Edit size={13} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowEvolutionHelp(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-300 hover:bg-amber-900/60 transition-colors flex items-center gap-1 text-xs font-bold"
                        title="진화 도움말"
                      >
                          <Info size={14}/>
                          <span>진화 도움말</span>
                      </button>
                      <button 
                        onClick={openReleaseModal} 
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 transition-colors flex items-center gap-1 text-xs font-bold" 
                        title="방생하기"
                      >
                          <Trash2 size={14}/>
                          <span className="hidden sm:inline">방생</span>
                      </button>
                  </div>
              </div>
              
              {/* 스크롤 본문 */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5 custom-scrollbar">
                  
                  {/* 메인 몬스터 카드로 요약 정보 노출 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl space-y-4">
                      {/* 몬스터 프로필 & 이미지 헤더 */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-slate-800/80 pb-4">
                          {/* 몬스터 이미지 아바타 Box */}
                          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 border-2 ${rankCfg.border} overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-2xl relative group`}>
                              {selectedMonster.visualUrl || getMonsterInfo(selectedMonster.name)?.visualUrl ? (
                                  <img 
                                      src={selectedMonster.visualUrl || getMonsterInfo(selectedMonster.name)?.visualUrl} 
                                      alt={selectedMonster.name} 
                                      className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-110"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                          const fb = document.getElementById(`farm-detail-img-fb-${selectedMonster.id}`);
                                          if (fb) fb.style.display = 'flex';
                                      }}
                                  />
                              ) : null}
                              <div id={`farm-detail-img-fb-${selectedMonster.id}`} className={`${selectedMonster.visualUrl || getMonsterInfo(selectedMonster.name)?.visualUrl ? 'hidden' : 'flex'} flex-col items-center justify-center w-full h-full text-amber-400 bg-amber-950/30`}>
                                  <Dog size={32} />
                              </div>
                          </div>

                          <div className="flex-1 w-full space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                      {/* 랭크 */}
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${rankCfg.color} ${rankCfg.bg} ${rankCfg.border}`}>
                                          {selectedMonster.rank} Rank
                                      </span>
                                      {/* 성장 단계 */}
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                          {selectedMonster.stage || MonsterStage.BABY}
                                      </span>
                                      {/* 속성 */}
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                                          {selectedMonster.shinryokuType || '무속성'}
                                      </span>
                                  </div>

                                  {/* 배치 상태 표시 */}
                                  <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${placement.color}`}>
                                      <span>{placement.icon}</span>
                                      <span>{placement.label}</span>
                                  </div>
                              </div>

                              <div className="pt-1">
                                  <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2 flex-wrap">
                                      <span>{selectedMonster.nickname || selectedMonster.name}</span>
                                      {selectedMonster.nickname && <span className="text-xs font-normal text-slate-400">({selectedMonster.name})</span>}
                                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">Lv.{selectedMonster.level || 1}</span>
                                  </h2>
                              </div>
                          </div>
                      </div>

                      {/* 외형 정보 / 신장 / 체중 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">외형 특성</span>
                              <p className="text-xs text-slate-300 italic">
                                  "{(() => {
                                      const isUrl = (s?: string) => Boolean(s && (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:')));
                                      const appText = selectedMonster.appearance && !isUrl(selectedMonster.appearance) ? selectedMonster.appearance : '';
                                      const descText = selectedMonster.description && !isUrl(selectedMonster.description) ? selectedMonster.description : '';
                                      return appText || descText || '특이 외형 정보 없음';
                                  })()}"
                              </p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-center gap-1">
                              <div className="flex justify-between items-center text-xs text-slate-400">
                                  <span className="flex items-center gap-1 text-[11px]"><Ruler size={13} className="text-slate-500"/> 신장</span>
                                  <span className="font-bold text-slate-200">{selectedMonster.height || '?'} cm</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-400">
                                  <span className="flex items-center gap-1 text-[11px]"><Weight size={13} className="text-slate-500"/> 체중</span>
                                  <span className="font-bold text-slate-200">{selectedMonster.weight || '?'} kg</span>
                              </div>
                          </div>
                      </div>

                      {/* 레벨 & EXP 프로그레스 바 */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-amber-400 flex items-center gap-1">
                                  <Sparkles size={14} /> Lv.{selectedMonster.level || 1}
                                  <span className="text-[10px] text-slate-500 font-normal">(최대 Lv.{stageInfo?.maxLvl || '?'})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                  EXP: {selectedMonster.currentExp || 0} / {selectedMonster.maxExp || 100} ({expPercent.toFixed(1)}%)
                              </span>
                          </div>
                          <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300" 
                                style={{ width: `${expPercent}%` }}
                              />
                          </div>

                          {/* 🌟 진화 필요 레벨 안내 영역 */}
                          {stageInfo?.next ? (
                            <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs ${
                              canEvolve 
                                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-sm' 
                                : 'bg-slate-900/70 border-slate-800 text-slate-300'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className={canEvolve ? "text-amber-400 animate-pulse" : "text-slate-400"} />
                                <span className="font-bold">다음 진화 단계: <span className="text-amber-300 font-black">{stageInfo.next}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-slate-300">
                                  진화 필요 조건: <strong className={canEvolve ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>Lv.{stageInfo.maxLvl} 이상</strong>
                                </span>
                                {canEvolve ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold animate-pulse">
                                    진화 가능!
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    (Lv.{(stageInfo.maxLvl - (selectedMonster.level || 1))} 필요)
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300 text-xs flex items-center justify-between font-bold">
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-purple-400" />
                                <span>최종 진화 단계에 도달했습니다.</span>
                              </div>
                              <span className="text-[10px] text-purple-400 font-mono">최대 성장 Lv.2000</span>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* ⚔️ 전투 능력치 상세 카드 */}
                  <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Gauge size={14} className="text-rose-400" />
                              <span>전투 능력치</span>
                          </h4>
                          {(selectedMonster.statPoints || 0) > 0 && (
                              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full animate-pulse">
                                  남은 스탯 포인트: {selectedMonster.statPoints}
                              </span>
                          )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                              { l: 'HP', k: 'maxHp', i: Heart, c: 'text-red-400', bg: 'bg-red-950/20 border-red-900/30' }, 
                              { l: 'MP', k: 'maxMp', i: Zap, c: 'text-blue-400', bg: 'bg-blue-950/20 border-blue-900/30' },
                              { l: 'STR (공격)', k: 'str', i: Sword, c: 'text-rose-400', bg: 'bg-rose-950/20 border-rose-900/30', statKey: 'str' },
                              { l: 'INT (지능)', k: 'int', i: Brain, c: 'text-purple-400', bg: 'bg-purple-950/20 border-purple-900/30', statKey: 'int' },
                              { l: 'DEF (방어)', k: 'def', i: Shield, c: 'text-slate-300', bg: 'bg-slate-900/50 border-slate-800', statKey: 'def' },
                              { l: 'WIS (지혜)', k: 'wis', i: Brain, c: 'text-cyan-400', bg: 'bg-cyan-950/20 border-cyan-900/30', statKey: 'wis' },
                              { l: 'AGI (민첩)', k: 'agi', i: Activity, c: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-900/30', statKey: 'agi' },
                              { l: 'CTRL (통제)', k: 'ctrl', i: User, c: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-900/30', statKey: 'ctrl' },
                          ].map(s => (
                              <div key={s.l} className={`p-2.5 rounded-xl border flex items-center justify-between ${s.bg}`}>
                                  <div className="flex items-center gap-1.5">
                                      <s.i size={15} className={s.c} />
                                      <span className="text-[11px] font-bold text-slate-300">{s.l}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-sm font-black text-slate-100">
                                          {selectedMonster.stats?.[s.k as keyof Stats] || 0}
                                      </span>
                                      {s.statKey && (selectedMonster.statPoints || 0) > 0 && (
                                          <button
                                              onClick={() => handleDistributeStat(s.statKey as keyof Stats)}
                                              className="w-5 h-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded flex items-center justify-center transition-transform active:scale-90"
                                              title={`${s.l} 1 증가`}
                                          >
                                              +
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* 📜 보유 스킬 목록 & 단계별 스킬 창조 */}
                  <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkle size={14} className="text-indigo-400" />
                              <span>보유 스킬 ({selectedMonster.skills?.length || 0})</span>
                          </h4>

                          {/* 몬스터 스킬 창조 가능 단계 버튼 목록 */}
                          {(() => {
                              const stages = [MonsterStage.CHILD, MonsterStage.ADULT, MonsterStage.PERFECT, MonsterStage.ULTIMATE, MonsterStage.SUPER_ULTIMATE];
                              const currentStageIdx = stages.indexOf(selectedMonster.stage || MonsterStage.BABY);
                              const availableStages = stages.filter((st, idx) => idx <= currentStageIdx);
                              const stageSkillsCreated = selectedMonster.stageSkillsCreated || {};

                              return (
                                  <div className="flex gap-1 flex-wrap">
                                      {availableStages.map(st => {
                                          const created = !!stageSkillsCreated[st];
                                          return (
                                              <button
                                                  key={st}
                                                  disabled={created}
                                                  onClick={() => {
                                                      setSkillStageTarget(st);
                                                      setSkillNameInput(`${selectedMonster.name}의 ${st} 비기`);
                                                      setShowCreateSkillModal(true);
                                                  }}
                                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                                      created 
                                                          ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                          : 'bg-indigo-900/60 border-indigo-500/60 text-indigo-300 hover:bg-indigo-700 hover:text-white'
                                                  }`}
                                              >
                                                  {st} {created ? '(창조완료)' : '+ 스킬생성'}
                                              </button>
                                          );
                                      })}
                                  </div>
                              );
                          })()}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedMonster.skills && selectedMonster.skills.length > 0 ? (
                              selectedMonster.skills.map((s, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => setViewingSkill(s)}
                                    className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs flex justify-between items-center hover:bg-indigo-950/30 hover:border-indigo-500/50 transition-all group active:scale-98 text-left"
                                  >
                                      <div className="flex flex-col">
                                          <span className="text-slate-200 font-bold group-hover:text-indigo-300 transition-colors">{s.name}</span>
                                          <span className="text-[10px] text-slate-500">{s.type} | Power: {s.powerRatio}% | MP {(s.type === SkillType.PASSIVE || (s.type as string) === '패시브') ? 0 : (s.mpCost || 0)}</span>
                                      </div>
                                      <Info size={16} className="text-slate-600 group-hover:text-indigo-400 shrink-0 ml-2"/>
                                  </button>
                              ))
                          ) : (
                              <p className="text-xs text-slate-600 col-span-full py-2 text-center bg-slate-950/50 rounded-xl border border-slate-800/50">
                                  습득한 스킬이 없습니다. 위 단계별 스킬생성 버튼으로 전용 스킬을 창조해보세요.
                              </p>
                          )}
                      </div>
                  </div>

                  {/* 🍖 케어 상태 게이지 (포만감, 청결도, 친밀도) */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Activity size={14} className="text-emerald-400" />
                              <span>사육 케어 상태</span>
                          </h4>
                          {selectedMonster.shinryokuType !== '가축' && (
                              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                  <span className="text-[11px] font-bold text-slate-400 px-2">케어 횟수</span>
                                  {[1, 3, 5, 10].map((times) => (
                                      <button
                                          key={times}
                                          type="button"
                                          onClick={() => setSelectedCareTimes(times)}
                                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                              selectedCareTimes === times
                                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                                                  : 'text-slate-400 hover:text-slate-200'
                                          }`}
                                      >
                                          {times}회
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div className="space-y-2.5">
                          <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                  <span className="text-orange-300 flex items-center gap-1"><Utensils size={12}/> 포만감</span>
                                  <span className="font-mono text-slate-200">{selectedMonster.hunger || 0}%</span>
                              </div>
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                  <div className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all" style={{ width: `${selectedMonster.hunger || 0}%` }}></div>
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                  <span className="text-cyan-300 flex items-center gap-1"><Sparkles size={12}/> 청결도</span>
                                  <span className="font-mono text-slate-200">{selectedMonster.cleanliness || 0}%</span>
                              </div>
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                  <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 transition-all" style={{ width: `${selectedMonster.cleanliness || 0}%` }}></div>
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                  <span className="text-rose-300 flex items-center gap-1"><Heart size={12}/> 친밀도</span>
                                  <span className="font-mono text-slate-200">{selectedMonster.affection || 0}%</span>
                              </div>
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                  <div className="h-full bg-gradient-to-r from-rose-600 to-pink-400 transition-all" style={{ width: `${selectedMonster.affection || 0}%` }}></div>
                              </div>
                          </div>
                      </div>

                      {/* 케어 액션 버튼 (44px 터치 영역) 및 남은 횟수 표기 */}
                      <div className="pt-2">
                          {selectedMonster.shinryokuType === '가축' ? (
                              <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    onClick={handleHarvest} 
                                    className="min-h-[44px] py-2.5 px-3 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-xl flex items-center justify-center gap-2 text-emerald-200 text-xs font-bold transition-all active:scale-95 shadow-md"
                                  >
                                      <Egg size={18} className="text-emerald-400"/>
                                      <span>수확하기</span>
                                  </button>
                                  <button 
                                    onClick={handleSlaughter} 
                                    className="min-h-[44px] py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/50 rounded-xl flex items-center justify-center gap-2 text-rose-200 text-xs font-bold transition-all active:scale-95 shadow-md"
                                  >
                                      <Trash2 size={18} className="text-rose-400"/>
                                      <span>도축하기</span>
                                  </button>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <button 
                                    onClick={handleFeed} 
                                    className="min-h-[52px] py-2.5 px-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl flex flex-col items-center justify-center gap-1 text-amber-200 transition-all active:scale-95 shadow-md"
                                  >
                                      <div className="flex items-center gap-2 text-xs font-bold">
                                          <Utensils size={16} className="text-amber-400"/>
                                          <span>먹이 주기 ({selectedCareTimes}회)</span>
                                      </div>
                                      <span className={`text-[10px] font-medium ${feedCount >= dailyFeedLimit ? 'text-red-400' : 'text-amber-400/80'}`}>
                                          남은 횟수: {Math.max(0, dailyFeedLimit - feedCount)} / {dailyFeedLimit} (보유 식량: {character.base?.resources.food || 0}개)
                                      </span>
                                  </button>
                                  <button 
                                    onClick={handleClean} 
                                    className="min-h-[52px] py-2.5 px-3 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-700/50 rounded-xl flex flex-col items-center justify-center gap-1 text-blue-200 transition-all active:scale-95 shadow-md"
                                  >
                                      <div className="flex items-center gap-2 text-xs font-bold">
                                          <Sparkles size={16} className="text-blue-400"/>
                                          <span>청소하기 ({selectedCareTimes}회)</span>
                                      </div>
                                      <span className={`text-[10px] font-medium ${cleanCount >= dailyCleanLimit ? 'text-red-400' : 'text-blue-400/80'}`}>
                                          남은 횟수: {Math.max(0, dailyCleanLimit - cleanCount)} / {dailyCleanLimit}
                                      </span>
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* 🐾 사육사 1:1 전담 훈련 지정 */}
                  {selectedMonster.shinryokuType !== '가축' && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3.5 shadow-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                              <div>
                                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <User size={15} className="text-amber-400" />
                                      <span>사육사 1:1 전담 훈련 지정</span>
                                  </h4>
                                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                                      사육사에게 이 몬스터의 훈련을 전담시켜 지정 능력치를 집중 성장시킵니다. (매일 자정 자동 성장 & 특별 지도)
                                  </p>
                              </div>
                              {selectedMonster.assignedBreederId && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shrink-0 self-start sm:self-auto flex items-center gap-1">
                                      <Sparkles size={11} className="text-emerald-400 animate-spin" />
                                      <span>전담 훈련 진행 중</span>
                                  </span>
                              )}
                          </div>

                          {activeBreeders.length === 0 ? (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                                  <span>현재 기지 몬스터 사육소에 배치된 사육사가 없습니다. 기지 시설에서 사육사를 배치하면 전담 훈련을 맡길 수 있습니다.</span>
                              </div>
                          ) : (
                              <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {/* 사육사 선택 */}
                                      <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                              <span>담당 사육사 선택</span>
                                          </label>
                                          <select
                                              value={selectedBreederId}
                                              onChange={(e) => setSelectedBreederId(e.target.value)}
                                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                          >
                                              <option value="">-- 전담 사육사 없음 (미배정) --</option>
                                              {activeBreeders.map(b => {
                                                  const level = b.professions?.breeding?.level || 1;
                                                  const title = getBreederTitle(level);
                                                  const isBusy = character.base?.capturedMonsters?.some(m => m.id !== selectedMonster.id && m.assignedBreederId === b.id);
                                                  const busyMonster = isBusy ? character.base?.capturedMonsters?.find(m => m.id !== selectedMonster.id && m.assignedBreederId === b.id) : null;
                                                  return (
                                                      <option key={b.id} value={b.id}>
                                                          {b.name} (Lv.{level} {title}){isBusy ? ` [${busyMonster?.nickname || busyMonster?.name} 전담 중]` : ''}
                                                      </option>
                                                  );
                                              })}
                                          </select>
                                      </div>

                                      {/* 지정 능력치 선택 */}
                                      <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                              <span>성장 지정 능력치</span>
                                          </label>
                                          <select
                                              value={selectedDedicatedStat}
                                              onChange={(e) => setSelectedDedicatedStat(e.target.value)}
                                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                          >
                                              <option value="str">공격력 (STR)</option>
                                              <option value="def">방어력 (DEF)</option>
                                              <option value="int">지능 (INT)</option>
                                              <option value="agi">민첩 (AGI)</option>
                                              <option value="wis">지혜 (WIS)</option>
                                              <option value="ctrl">통제력 (CTRL)</option>
                                              <option value="hp">최대 체력 (HP x10)</option>
                                              <option value="mp">최대 마나 (MP x10)</option>
                                          </select>
                                      </div>
                                  </div>

                                  {/* 현재 전담 상태 배너 및 배정 버튼 */}
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                                      {selectedMonster.assignedBreederId ? (
                                          <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-800/40 px-3 py-2 rounded-xl flex-1">
                                              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                              <span>
                                                  <strong className="text-white">{selectedMonster.assignedBreederName || '사육사'}</strong> 전담 지도 중 ➔ 지정 스탯: <strong className="text-amber-300">{(selectedMonster.dedicatedTrainingStat || 'str').toUpperCase()}</strong> (매일 자정 자동 성장)
                                              </span>
                                          </div>
                                      ) : (
                                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl flex-1">
                                              <Info size={14} className="text-slate-500 shrink-0" />
                                              <span>현재 전담 사육사가 배정되어 있지 않습니다.</span>
                                          </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                          {selectedMonster.assignedBreederId && (
                                              <button
                                                  type="button"
                                                  onClick={() => handleSaveDedicatedBreeder('', 'str')}
                                                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                                              >
                                                  전담 해제
                                              </button>
                                          )}
                                          <button
                                              type="button"
                                              onClick={() => handleSaveDedicatedBreeder(selectedBreederId, selectedDedicatedStat)}
                                              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                          >
                                              <UserPlus size={14} />
                                              <span>전담 배정 설정</span>
                                          </button>
                                      </div>
                                  </div>

                                  {/* 전담 특별 지도 바로가기 버튼 */}
                                  {selectedMonster.assignedBreederId && selectedMonster.dedicatedTrainingStat && (
                                      <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
                                          <div className="text-[11px] text-slate-300">
                                              <span className="font-bold text-amber-400">💡 전담 사육사 1:1 특별 지도:</span> 전담 사육사가 {selectedMonster.name}에게 1.5배 보너스 집중 지도를 즉시 실시합니다.
                                          </div>
                                          <button
                                              type="button"
                                              disabled={isLateNight}
                                              onClick={handleDedicatedInstantTrain}
                                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                                                  isLateNight
                                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                                              }`}
                                          >
                                              <Play size={13} />
                                              <span>전담 특별 지도 (1회)</span>
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  )}

                  {/* 🏋️ 스탯 강화 훈련 */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                      {/* Late Night Notice Banner */}
                      {isLateNight && (
                          <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-300 font-bold shadow-md">
                              <span className="text-base shrink-0">🌙</span>
                              <span>현재는 심야 시간대({timeStr})입니다. 몬스터들의 야간 휴식 및 수면을 위해 훈련은 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</span>
                          </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sword size={14} className="text-amber-400" />
                              <span>스탯 강화 훈련</span>
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                  <span className="text-[11px] font-bold text-slate-400 px-1.5">훈련 횟수</span>
                                  {[1, 5, 10, 20, 50, 100].map((times) => (
                                      <button
                                          key={times}
                                          type="button"
                                          onClick={() => setSelectedTrainTimes(times)}
                                          className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                                              selectedTrainTimes === times
                                                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                                                  : 'text-slate-400 hover:text-slate-200'
                                          }`}
                                      >
                                          {times}회
                                      </button>
                                  ))}
                              </div>
                              <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-slate-800 text-orange-400 border border-slate-700">
                                  소모 포만감: 1회당 -{Math.max(5, 20 - Math.min(15, Math.floor(totalBreedingLevel * 0.3)))}% {totalBreedingLevel > 1 ? `(사육사 Lv.${totalBreedingLevel} 감면)` : ''}
                              </span>
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${dailyTrainingLimit === 0 ? 'bg-amber-950/60 text-amber-300 border-amber-600' : trainCount >= dailyTrainingLimit ? 'bg-red-900/50 text-red-300 border-red-500' : 'bg-slate-800 text-amber-400 border-slate-700'}`}>
                                  {dailyTrainingLimit === 0 
                                      ? '사육사 필요 (0회)' 
                                      : `남은 횟수: ${Math.max(0, dailyTrainingLimit - trainCount)} / ${dailyTrainingLimit}회`}
                              </span>
                          </div>
                      </div>

                      {/* 사육소 개수 및 사육사 인원수 누적 훈련 상한 안내 바 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-amber-400 font-bold">🐾 사육소 훈련 한도:</span>
                              <span>
                                  사육소 {monsterTrainingLimitInfo.facilityCount}동 (+{monsterTrainingLimitInfo.facilityBonus}회)
                                  {monsterTrainingLimitInfo.effectiveBreederCount > 0 && (
                                      <> + 사육사 {monsterTrainingLimitInfo.effectiveBreederCount}명 (+{monsterTrainingLimitInfo.breederBonus}회)</>
                                  )}
                                  ➔ 일일 최대 {dailyTrainingLimit}회 / 100회
                              </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                              (사육소당 3회 적용, 사육사 최대 10명분 누적, 일일 최대 100회)
                          </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button 
                            onClick={() => handleTraining('HP')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-red-950/30 border-red-800/40 hover:bg-red-900/40'
                            }`}
                          >
                              <Heart size={16} className={`${isLateNight ? 'text-slate-600' : 'text-red-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>체력 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('MP')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-950/30 border-blue-800/40 hover:bg-blue-900/40'
                            }`}
                          >
                              <Zap size={16} className={`${isLateNight ? 'text-slate-600' : 'text-blue-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>마나 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('STR')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-rose-950/30 border-rose-800/40 hover:bg-rose-900/40'
                            }`}
                          >
                              <Sword size={16} className={`${isLateNight ? 'text-slate-600' : 'text-rose-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>공격 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('DEF')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50'
                            }`}
                          >
                              <Shield size={16} className={`${isLateNight ? 'text-slate-600' : 'text-slate-300'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>방어 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('INT')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-purple-950/30 border-purple-800/40 hover:bg-purple-900/40'
                            }`}
                          >
                              <Brain size={16} className={`${isLateNight ? 'text-slate-600' : 'text-purple-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>지능 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('WIS')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-cyan-950/30 border-cyan-800/40 hover:bg-cyan-900/40'
                            }`}
                          >
                              <Compass size={16} className={`${isLateNight ? 'text-slate-600' : 'text-cyan-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>지혜 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('AGI')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-amber-950/30 border-amber-800/40 hover:bg-amber-900/40'
                            }`}
                          >
                              <Activity size={16} className={`${isLateNight ? 'text-slate-600' : 'text-amber-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>민첩 훈련</span>
                          </button>
                          <button 
                            onClick={() => handleTraining('CTRL')} 
                            disabled={isLateNight}
                            className={`min-h-[44px] p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                isLateNight
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-emerald-950/30 border-emerald-800/40 hover:bg-emerald-900/40'
                            }`}
                          >
                              <User size={16} className={`${isLateNight ? 'text-slate-600' : 'text-emerald-400'} mb-0.5`}/>
                              <span className={`text-xs font-bold ${isLateNight ? 'text-slate-500' : 'text-slate-200'}`}>통제 훈련</span>
                          </button>
                      </div>
                  </div>

                  {/* 🌟 진화 가능 안내 버튼 */}
                  {canEvolve && (
                      <button 
                        onClick={handleEvolve}
                        disabled={isEvolving}
                        className="w-full min-h-[48px] py-3.5 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-sm rounded-xl shadow-xl shadow-amber-950/50 animate-pulse disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-amber-400/40"
                      >
                          <Sparkles size={18} />
                          <span>{isEvolving ? "진화 마력 집중 중..." : "진화 실행"}</span>
                      </button>
                  )}
                  
                  {/* 🤝 동료 영입 버튼 */}
                  <div className="pt-2 border-t border-slate-800">
                      <button 
                        onClick={handleRecruit}
                        className="w-full min-h-[48px] py-3 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 hover:from-blue-800/80 hover:to-indigo-800/80 border border-blue-500/40 text-blue-100 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-lg active:scale-98 gap-2"
                      >
                          <UserPlus size={18} className="text-blue-400" />
                          <span>동료로 영입하기</span>
                      </button>
                      <p className="text-[11px] text-slate-500 text-center mt-1.5">
                          * 메인 파티가 가득 찰 경우 기지 대기 동료 목록으로 합류합니다.
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in zoom-in-95">
        {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
        
        {/* 이름 변경 모달 */}
        {showRenameModal && (
            <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xs shadow-2xl space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Edit size={16} className="text-amber-400"/>
                        <span>몬스터 이름 변경</span>
                    </h3>
                    <input 
                        type="text" 
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                        placeholder="새로운 이름을 입력하세요"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setShowRenameModal(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 text-xs font-bold">취소</button>
                        <button onClick={confirmRename} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-500 text-xs font-bold">변경</button>
                    </div>
                </div>
            </div>
        )}

        {/* 방생 확인 모달 */}
        {showReleaseModal && selectedMonster && (
            <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-5 w-full max-w-xs shadow-2xl space-y-4">
                    <div className="flex flex-col items-center text-center">
                        <AlertTriangle size={40} className="text-rose-500 mb-2"/>
                        <h3 className="text-base font-bold text-white mb-1">정말 방생하시겠습니까?</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="text-amber-400 font-bold">{selectedMonster.nickname || selectedMonster.name}</span>을(를) 자연으로 돌려보냅니다.<br/>
                            <span className="text-rose-400">방생된 몬스터는 영구적으로 사라집니다.</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowReleaseModal(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-xs font-bold">취소</button>
                        <button onClick={confirmRelease} className="flex-1 py-2.5 bg-rose-700 text-white rounded-xl hover:bg-rose-600 text-xs font-bold shadow-lg">방생하기</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* 스킬 상세 모달 */}
        {viewingSkill && (
            <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-indigo-500/60 rounded-2xl p-5 w-full max-w-xs sm:max-w-sm shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-indigo-900/50 pb-2">
                        <div>
                            <h3 className="text-base font-bold text-white">{viewingSkill.name}</h3>
                            <div className="flex gap-1.5 mt-1">
                                <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700/50">{viewingSkill.type}</span>
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{viewingSkill.targetType || 'Single'}</span>
                            </div>
                        </div>
                        <button onClick={() => setViewingSkill(null)} className="text-slate-400 hover:text-white p-1"><X size={18}/></button>
                    </div>
                    
                    <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">소모 MP</span>
                                <span className="font-mono text-blue-400 font-bold">{(viewingSkill.type === SkillType.PASSIVE || (viewingSkill.type as string) === '패시브') ? 0 : viewingSkill.mpCost}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">위력 배율</span>
                                <span className="font-mono text-rose-400 font-bold">{viewingSkill.powerRatio || 100}%</span>
                            </div>
                        </div>
                        
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">스킬 설명</span>
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed">
                                {viewingSkill.description}
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={() => setViewingSkill(null)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors">닫기</button>
                </div>
            </div>
        )}

        {/* 상단 통합 헤더 및 탭 */}
        {!selectedMonster && (
            <div className="shrink-0 bg-slate-900 border-b border-slate-800">
                <div className="p-3 sm:p-4 flex justify-between items-center border-b border-slate-800/60">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Dog size={22} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                                몬스터 사육소
                                <span className="text-xs font-bold text-amber-400/90 font-mono">Lv.{facilityLevel}</span>
                            </h2>
                            <p className="text-[11px] text-slate-400">포획한 몬스터 육성, 훈련 및 부화 관리 시설</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowEvolutionHelp(true)}
                            className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-amber-700/50 shadow-md active:scale-95"
                        >
                            <Info size={14} />
                            <span>진화 도움말</span>
                        </button>
                        {onFacilityUpgrade && facilityLevel < 5 && (
                            <button 
                                onClick={() => onFacilityUpgrade('monster_farm', instanceId)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-md active:scale-95"
                            >
                                <ArrowUpCircle size={14} />
                                <span className="hidden sm:inline">시설 레벨업</span>
                            </button>
                        )}
                        {onOpenMastery && (
                            <button
                                onClick={onOpenMastery}
                                className="px-2.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-indigo-700/50 shadow-md active:scale-95"
                            >
                                <User size={14} />
                                <span className="hidden sm:inline">사육 숙련도</span>
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 탭 구분 바 */}
                <div className="flex bg-slate-950 p-1.5 gap-1.5">
                    <button 
                      onClick={() => setActiveTab('list')} 
                      className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'list' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                        <Dog size={16} />
                        <span>보유 몬스터 ({currentCount}/{capacity})</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('incubator')} 
                      className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'incubator' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                        <Egg size={16} />
                        <span>부화실 ({character.base?.capturedMonsters?.filter(m => m.stage === MonsterStage.EGG).length || 0}/{incubatorCapacity})</span>
                    </button>
                </div>

                {/* 사육사 전담배치 자동 관리 상태 배너 */}
                <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {activeBreeders.length > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                            <span className="flex h-2 w-2 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>전담 사육사 상주 중 ({activeBreeders.map(b => b.name).join(', ')}): 매일 자동 먹이 급여 및 청결도 100% 자동 관리</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium">
                            <span className="h-2 w-2 rounded-full bg-amber-500/80 shrink-0"></span>
                            <span>사육사 미배치: 기지에서 사육사를 배치하면 매일 자정 자동 먹이 급여 및 청결도 관리가 진행됩니다.</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 메인 뷰 컨테이너 */}
        <div className="flex-1 overflow-hidden relative">
            {selectedMonster ? renderDetailView() : (
                <div className="h-full overflow-y-auto p-3 sm:p-5 custom-scrollbar">
                    {/* 🐾 보유 몬스터 카드형 그리드 목록 */}
                    {activeTab === 'list' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {character.base?.capturedMonsters?.filter(m => m.stage !== MonsterStage.EGG).map((monster) => {
                                    const rankCfg = RANK_CONFIG[monster.rank] || RANK_CONFIG['C'];
                                    const placement = getMonsterPlacement(monster.id);
                                    const monsterVisual = monster.visualUrl || getMonsterInfo(monster.name)?.visualUrl;
                                    
                                    return (
                                        <div 
                                            key={monster.id} 
                                            onClick={() => setSelectedMonsterId(monster.id)}
                                            className="group bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-950/20 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 active:scale-98"
                                        >
                                            {/* 상단 헤더: 이미지, 이름, 랭크, 배치 상태 */}
                                            <div className="space-y-2">
                                                <div className="flex items-start gap-3">
                                                    {/* 몬스터 아바타 섬네일 */}
                                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-950 border ${rankCfg.border} overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-md relative group-hover:scale-105 transition-transform`}>
                                                        {monsterVisual ? (
                                                            <img 
                                                                src={monsterVisual} 
                                                                alt={monster.name} 
                                                                className="w-full h-full object-cover rounded-lg"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => {
                                                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                                                    const fb = document.getElementById(`farm-list-img-fb-${monster.id}`);
                                                                    if (fb) fb.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div id={`farm-list-img-fb-${monster.id}`} className={`${monsterVisual ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-amber-400 bg-amber-950/20`}>
                                                            <Dog size={22} />
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-start justify-between gap-1">
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="font-bold text-slate-100 text-xs sm:text-sm group-hover:text-amber-300 transition-colors truncate">
                                                                    {monster.nickname ? monster.nickname : monster.name}
                                                                </h3>
                                                                {monster.nickname && (
                                                                    <p className="text-[10px] text-slate-500 truncate">({monster.name})</p>
                                                                )}
                                                            </div>

                                                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border shrink-0 ${rankCfg.color} ${rankCfg.bg} ${rankCfg.border}`}>
                                                                {monster.rank} Rank
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                                            <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                                                {monster.stage || MonsterStage.BABY}
                                                            </span>

                                                            {/* 배치 상태 표시 Badge */}
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${placement.color}`}>
                                                                <span>{placement.icon}</span>
                                                                <span>{placement.label}</span>
                                                            </span>

                                                            {/* 전담 사육사 배정 Badge */}
                                                            {monster.assignedBreederId && monster.dedicatedTrainingStat && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/40 bg-emerald-950/50 text-emerald-300 flex items-center gap-1">
                                                                    <span>🐾</span>
                                                                    <span>{monster.assignedBreederName || '사육사'} 전담 ({(monster.dedicatedTrainingStat).toUpperCase()})</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 주요 스탯 아이콘 요약 바 */}
                                            <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px]">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-500 font-bold">LEVEL</span>
                                                    <span className="font-mono font-bold text-amber-400">Lv.{monster.level || 1}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-500 font-bold">STR</span>
                                                    <span className="font-mono font-bold text-rose-400">{monster.stats?.str || 0}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-500 font-bold">DEF</span>
                                                    <span className="font-mono font-bold text-slate-300">{monster.stats?.def || 0}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-500 font-bold">AGI</span>
                                                    <span className="font-mono font-bold text-amber-300">{monster.stats?.agi || 0}</span>
                                                </div>
                                            </div>

                                            {/* 미니 상태 게이지 바 */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><Utensils size={10} className="text-orange-400"/> 포만감 {monster.hunger || 0}%</span>
                                                    <span className="flex items-center gap-1"><Heart size={10} className="text-rose-400"/> 친밀도 {monster.affection || 0}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${monster.hunger || 0}%` }}></div>
                                                </div>
                                            </div>

                                            {/* 하단 관리 안내 버튼 */}
                                            <div className="pt-1 flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-300 font-bold border-t border-slate-800/60">
                                                <span>상세 보기 & 관리</span>
                                                <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {currentCount === 0 && (
                                <div className="py-20 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                                    <Dog size={48} className="mx-auto text-slate-700" />
                                    <p className="text-sm font-bold text-slate-500">사육소에 보유 중인 몬스터가 없습니다.</p>
                                    <p className="text-xs text-slate-600">던전 탐험이나 야외 전투에서 몬스터를 포획하거나 알을 부화시켜보세요.</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* 🥚 부화실 탭 */}
                    {activeTab === 'incubator' && (
                        <div className="space-y-5">
                            {/* 인큐베이터 관리 카드 */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                    <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                                        <Egg size={18}/>
                                        <span>인큐베이터 보유 슬롯</span>
                                    </h4>
                                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                        {character.base?.capturedMonsters?.filter(m => m.stage === MonsterStage.EGG).length || 0} / {incubatorCapacity} 슬롯
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {character.base?.capturedMonsters?.filter(m => m.stage === MonsterStage.EGG).map((egg) => {
                                        const isReady = character.currentDate! >= (egg.hatchDueDate || '9999-12-31');
                                        return (
                                            <div key={egg.id} className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 flex flex-col justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                                                        {egg.visualUrl ? (
                                                            <img src={egg.visualUrl} alt={egg.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <Egg size={24} className="text-amber-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5 truncate">
                                                            <span>{egg.name}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 flex items-center mt-1">
                                                            <Clock size={13} className="mr-1 text-slate-500 shrink-0"/>
                                                            <span className="truncate">부화 예정: {egg.hatchDueDate}</span>
                                                        </div>
                                                        <div className="mt-1">
                                                            {isReady ? (
                                                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                                                  <CheckCircle size={13} /> 즉시 부화 가능!
                                                              </span>
                                                            ) : (
                                                              <span className="text-xs text-slate-500">(부화 진행 중)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {!isReady && (
                                                        <button 
                                                          onClick={() => handleHatchEgg(egg.id, true)} 
                                                          className="flex-1 py-2 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 text-xs font-bold rounded-xl border border-purple-700/50 transition-all active:scale-95"
                                                        >
                                                            즉시 부화 (마정석 5)
                                                        </button>
                                                    )}
                                                    <button 
                                                      onClick={() => handleHatchEgg(egg.id, false)} 
                                                      disabled={!isReady} 
                                                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                                        isReady 
                                                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950' 
                                                          : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                                      }`}
                                                    >
                                                        부화시키기
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {character.base?.capturedMonsters?.filter(m => m.stage === MonsterStage.EGG).length === 0 && (
                                        <div className="col-span-full py-8 text-center text-slate-600 text-xs bg-slate-950/50 rounded-xl border border-slate-800/50">
                                            인큐베이터에 보관된 알이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 인벤토리 알 목록 카드 */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                <h4 className="text-sm font-black text-slate-300">소지품(인벤토리) 보관 중인 알</h4>
                                <div className="space-y-2">
                                    {character.inventory.map((item, idx) => {
                                        if (!item.name.includes('알') || item.type !== 'Etc') return null;
                                        return (
                                            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Egg size={16} className="text-amber-400" />
                                                    <span className="text-slate-200 font-bold text-xs sm:text-sm">{item.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleInventoryEggToIncubator(idx)} 
                                                    className="px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-700/50 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                >
                                                    인큐베이터 등록
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {!character.inventory.some(i => i.name.includes('알') && i.type === 'Etc') && (
                                        <p className="text-center text-slate-600 py-6 text-xs bg-slate-950/50 rounded-xl border border-slate-800/50">
                                            보유 중인 알 아이템이 없습니다.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {evolutionModalData && (
            <MonsterEvolutionModal
                prevMonster={evolutionModalData.prevMonster}
                nextMonster={evolutionModalData.nextMonster}
                onClose={() => setEvolutionModalData(null)}
            />
        )}

        {showCreateSkillModal && skillStageTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <Sparkle className="text-indigo-400" size={18} />
                            <h3 className="font-black text-slate-100 text-sm sm:text-base">
                                {skillStageTarget} 단계 스킬 창조
                            </h3>
                        </div>
                        <button 
                            onClick={() => setShowCreateSkillModal(false)}
                            className="text-slate-400 hover:text-white p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        {/* PowerRatio 안내 */}
                        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1 text-slate-300">
                            <div className="font-bold text-indigo-300">단계별 PowerRatio 스케일링 규칙</div>
                            <div>- {skillStageTarget} 기본 PowerRatio: <span className="font-mono font-bold text-amber-400">{skillStageTarget === MonsterStage.CHILD ? 150 : skillStageTarget === MonsterStage.ADULT ? 250 : skillStageTarget === MonsterStage.PERFECT ? 500 : skillStageTarget === MonsterStage.ULTIMATE ? 1500 : 3000}%</span></div>
                            <div>- 범위 공격(AOE) 선택 시: <span className="font-mono font-bold text-amber-400">{skillTargetType === 'aoe' ? '50% 감쇄 (AOE 적용)' : '단일 타겟 (100%)'}</span></div>
                            <div>- 최종 위력: <span className="font-mono font-bold text-emerald-400">{skillTargetType === 'aoe' ? Math.floor((skillStageTarget === MonsterStage.CHILD ? 150 : skillStageTarget === MonsterStage.ADULT ? 250 : skillStageTarget === MonsterStage.PERFECT ? 500 : skillStageTarget === MonsterStage.ULTIMATE ? 1500 : 3000) / 2) : (skillStageTarget === MonsterStage.CHILD ? 150 : skillStageTarget === MonsterStage.ADULT ? 250 : skillStageTarget === MonsterStage.PERFECT ? 500 : skillStageTarget === MonsterStage.ULTIMATE ? 1500 : 3000)}%</span></div>
                        </div>

                        {/* 스킬 이름 */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-300">스킬 이름</label>
                            <input
                                type="text"
                                value={skillNameInput}
                                onChange={e => setSkillNameInput(e.target.value)}
                                placeholder="스킬 이름을 입력하세요..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* 스킬 설명 */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-300">스킬 설명</label>
                            <textarea
                                value={skillDescInput}
                                onChange={e => setSkillDescInput(e.target.value)}
                                placeholder="스킬 효과 및 상세 설명을 적어주세요..."
                                rows={2}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-indigo-500 resize-none"
                            />
                        </div>

                        {/* 공격 범위 선택 */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-300">공격 범위</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSkillTargetType('single')}
                                    className={`py-2 rounded-lg font-bold border transition-all ${skillTargetType === 'single' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                                >
                                    단일 타겟 (100%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSkillTargetType('aoe')}
                                    className={`py-2 rounded-lg font-bold border transition-all ${skillTargetType === 'aoe' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                                >
                                    범위 공격 (50% 감쇄)
                                </button>
                            </div>
                        </div>

                        {/* 공격 속성 선택 */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-300">공격 속성</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSkillDamageType('physical')}
                                    className={`py-2 rounded-lg font-bold border transition-all ${skillDamageType === 'physical' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                                >
                                    물리 공격
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSkillDamageType('magical')}
                                    className={`py-2 rounded-lg font-bold border transition-all ${skillDamageType === 'magical' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                                >
                                    마법 공격
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCreateSkillModal(false)}
                            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-xs"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateMonsterStageSkill}
                            disabled={!skillNameInput.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition-all text-xs shadow-lg shadow-indigo-950"
                        >
                            스킬 창조 완료
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 📖 진화 단계 및 필요 레벨 안내 모달 */}
        {showEvolutionHelp && (
            <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
                <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-amber-950/20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles size={20} className="text-amber-400" />
                            <h3 className="text-base sm:text-lg font-black text-amber-100">몬스터 진화 단계 및 필요 레벨 안내</h3>
                        </div>
                        <button 
                            onClick={() => setShowEvolutionHelp(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto custom-scrollbar space-y-3.5 flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                            몬스터는 훈련과 전투를 통해 경험치를 쌓아 레벨을 올리면 상위 단계로 <strong className="text-amber-300">진화</strong>할 수 있습니다. 진화 시 모든 기본 능력치가 대폭 상승(1.5배)하고, 랭크 승급 및 상위 전용 스킬이 개방됩니다.
                        </p>

                        <div className="space-y-2.5">
                            {[
                                { stage: '알', icon: '🥚', req: '부화 대기', next: '유아기', desc: '부화기에 보관 후 시간 경과 시 유아기로 부화', color: 'border-slate-700 bg-slate-950/60 text-slate-300' },
                                { stage: '유아기', icon: '🐾', req: 'Lv.30 달성', next: '성장기', desc: '최초 성장 단계로 진화하여 야성의 기본 스킬 습득', color: 'border-blue-900/60 bg-blue-950/20 text-blue-200' },
                                { stage: '성장기', icon: '🐺', req: 'Lv.70 달성', next: '성숙기', desc: '본격적인 전투체로 진화하며 속성 공격 스킬 개방', color: 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' },
                                { stage: '성숙기', icon: '🦁', req: 'Lv.200 달성', next: '완전체', desc: '강력한 브레스 및 범위 공격 스킬을 보유한 완전체로 진화', color: 'border-purple-900/60 bg-purple-950/20 text-purple-200' },
                                { stage: '완전체', icon: '🐉', req: 'Lv.500 달성', next: '궁극체', desc: '고대 마수의 힘을 완전히 각성한 궁극체로 진화', color: 'border-amber-900/60 bg-amber-950/20 text-amber-200' },
                                { stage: '궁극체', icon: '⚡', req: 'Lv.1000 달성', next: '초궁극체', desc: '차원의 한계를 돌파하는 신화적인 초궁극체로 진화', color: 'border-rose-900/60 bg-rose-950/20 text-rose-200' },
                                { stage: '초궁극체', icon: '👑', req: '최종 단계', next: '없음', desc: '최종 도달 형태 (최대 Lv.2000까지 지속 성장 가능)', color: 'border-yellow-600/60 bg-yellow-950/30 text-yellow-100' },
                            ].map((item, i) => (
                                <div key={i} className={`p-3 rounded-xl border flex flex-col gap-1 ${item.color}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{item.icon}</span>
                                            <span className="text-xs font-black text-white">{item.stage}</span>
                                            {item.next !== '없음' && (
                                                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                                                    → {item.next}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-amber-300">
                                            {item.req}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300/90 pl-6">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
                        <button
                            onClick={() => setShowEvolutionHelp(false)}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg active:scale-98"
                        >
                            확인 및 닫기
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default React.memo(MonsterFarmModal);
