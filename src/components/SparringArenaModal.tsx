import React, { useState, useMemo } from 'react';
import { 
  X, Swords, Shield, Heart, Trophy, User, Users, Sparkles, 
  Flame, Award, Target, ChevronRight, Play, FastForward, 
  RotateCcw, CheckCircle, Info, Zap, AlertCircle, TrendingUp,
  UserCheck, Dumbbell, Star, MessageSquare
} from 'lucide-react';
import { Character, Companion, BattleRole, SecondaryBattleRole, Skill, SkillType } from '../types';
import { calculateFinalStats, getActorDerivedStats } from '../utils';
import { advanceGameTime } from '../services/gameTimeService';
import { prepareSparringMatch } from '../services/sparringCombatService';
import { SECONDARY_ROLES_BY_PARENT, SECONDARY_ROLE_INFOS, canTrainSecondaryRole } from '../services/roleBonusService';

interface SparringArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onUpdateCharacter: (newChar: Character, logMsg: string, dailyReport?: any) => void;
  instanceId?: string;
  facilityLevel?: number;
  onBattle?: (enemy: any, type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
}

interface SparringCombatState {
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  opponentHp: number;
  opponentMaxHp: number;
  opponentMp: number;
  opponentMaxMp: number;
  turn: number;
  logs: { text: string; type: 'player' | 'opponent' | 'system' | 'crit' | 'skill' }[];
  isFinished: boolean;
  winner: 'player' | 'opponent' | null;
  round: number;
}

export const SparringArenaModal: React.FC<SparringArenaModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  instanceId,
  facilityLevel: propLevel,
  onBattle
}) => {
  // Facility Level Calculation
  const layoutInst = instanceId ? character.base?.layout?.find(i => i.id === instanceId) : null;
  const facilityLevel = propLevel || layoutInst?.level || character.base?.facilityLevels?.['sparring_arena'] || 1;

  // Supervisor / Instructor
  const instructorId = instanceId ? character.base?.assignments?.[instanceId] : undefined;
  const allCompanions = useMemo(() => {
    const list = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    return list.filter(c => !c.isDead && !c.isMonster);
  }, [character.companions, character.inactiveCompanions]);

  const instructor = allCompanions.find(c => c.id === instructorId);
  const instructorBonus = useMemo(() => {
    if (!instructor) return 0;
    const stats = calculateFinalStats(instructor).finalStats;
    const sum = (stats.str + stats.int + stats.agi + stats.wis + stats.def + (stats.ctrl || 0));
    return Math.min(50, Math.floor(sum / 200) + facilityLevel * 3); // +10% ~ +50%
  }, [instructor, facilityLevel]);

  // Built Sparring Arenas & Daily Limit Calculation
  const sparringArenas = useMemo(() => {
    return character.base?.layout?.filter(i => i.type === 'sparring_arena') || [];
  }, [character.base?.layout]);
  const arenaCount = sparringArenas.length > 0 ? sparringArenas.length : 1;

  // Daily Sparring Limit (Sums limit for each built sparring arena)
  const maxDailySparrings = useMemo(() => {
    if (sparringArenas.length > 0) {
      return sparringArenas.reduce((sum, inst) => sum + (3 + (inst.level || 1) * 2), 0);
    }
    return 3 + facilityLevel * 2;
  }, [sparringArenas, facilityLevel]);

  const dailyUsed = character.base?.dailyCounts?.['sparring_arena'] || 0;
  const remainingDaily = Math.max(0, maxDailySparrings - dailyUsed);

  // Filter & Selection States
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'party' | 'base'>('all');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPlayerRole, setSelectedPlayerRole] = useState<BattleRole | SecondaryBattleRole>(
    (character.battleRole as BattleRole) || BattleRole.DEALER
  );
  const [selectedPartnerRole, setSelectedPartnerRole] = useState<BattleRole | SecondaryBattleRole>(BattleRole.DEALER);
  const [playerRoleCategory, setPlayerRoleCategory] = useState<'primary' | 'secondary'>('primary');
  const [partnerRoleCategory, setPartnerRoleCategory] = useState<'primary' | 'secondary'>('primary');

  // Active Sparring Mode State
  const [activeTab, setActiveTab] = useState<'select' | 'battle' | 'result' | 'batch_result'>('select');
  const [combatState, setCombatState] = useState<SparringCombatState | null>(null);
  const [lastResult, setLastResult] = useState<{
    winner: 'player' | 'opponent';
    opponent: Companion;
    playerRoleGain: number;
    partnerRoleGain: number;
    partnerRole: BattleRole | SecondaryBattleRole;
    affectionGain: number;
    expGain: number;
    partnerQuote: string;
    timeMinutes?: number;
  } | null>(null);
  const [batchResult, setBatchResult] = useState<{
    totalRounds: number;
    wins: number;
    losses: number;
    opponent: Companion;
    playerRoleGain: number;
    partnerRoleGain: number;
    partnerRole: BattleRole;
    affectionGain: number;
    expGain: number;
    foodSpent: number;
    timeMinutes?: number;
  } | null>(null);

  // 훈련 횟수 사용자 지정 상태 (기본값: 1회)
  const [customTrainCount, setCustomTrainCount] = useState<number>(1);

  // Filtered partners
  const eligiblePartners = useMemo(() => {
    return allCompanions.filter(c => {
      if (partnerFilter === 'party') return character.companions.some(p => p.id === c.id);
      if (partnerFilter === 'base') return (character.inactiveCompanions || []).some(b => b.id === c.id);
      return true;
    });
  }, [allCompanions, partnerFilter, character.companions, character.inactiveCompanions]);

  const selectedPartner = useMemo(() => {
    return allCompanions.find(c => c.id === selectedPartnerId) || eligiblePartners[0] || null;
  }, [allCompanions, selectedPartnerId, eligiblePartners]);

  // Sync default selected partner role when partner changes
  React.useEffect(() => {
    if (selectedPartner) {
      setSelectedPartnerRole((selectedPartner.battleRole as BattleRole) || BattleRole.DEALER);
    }
  }, [selectedPartner?.id]);

  // Stats calculation
  const playerStats = useMemo(() => calculateFinalStats(character).finalStats, [character]);
  const playerDerived = useMemo(() => getActorDerivedStats(character), [character]);

  const partnerStats = useMemo(() => {
    if (!selectedPartner) return null;
    return calculateFinalStats(selectedPartner).finalStats;
  }, [selectedPartner]);

  const partnerDerived = useMemo(() => {
    if (!selectedPartner) return null;
    const compWithRole = { ...selectedPartner, battleRole: selectedPartnerRole };
    return getActorDerivedStats(compWithRole);
  }, [selectedPartner, selectedPartnerRole]);

  // Dialogue generator based on affection & win/loss
  const getSparringQuote = (partner: Companion, won: boolean): string => {
    const name = partner.name;
    const affection = partner.affection || 0;

    if (won) {
      if (affection >= 80) {
        return `"${character.name}님, 정말 눈부신 검로였습니다! 당신의 강인함에 다시 한번 마음을 빼앗겼어요."`;
      } else if (affection >= 40) {
        return `"대단한 실력이십니다! 제 약점을 정확히 꿰뚫어 보셨네요. 함께 대련하며 많은 것을 배웠습니다."`;
      } else {
        return `"크윽... 제 실력이 아직 부족했군요. 다음엔 호락호락하게 지지 않겠습니다!"`;
      }
    } else {
      if (affection >= 80) {
        return `"다치신 곳은 없으신가요, ${character.name}님? 당신과 칼을 맞대는 매 순간이 제겐 최고의 행복입니다."`;
      } else if (affection >= 40) {
        return `"좋은 승부였습니다! 다음 대련에서는 ${character.name}님의 더 날카로운 한 수를 기대할게요."`;
      } else {
        return `"후후, 이번엔 제 승리군요. 하지만 당신의 집중력은 정말 위협적이었습니다."`;
      }
    }
  };

  // Start Sparring Combat
  const handleStartCombat = (quickMode: boolean = false) => {
    if (!selectedPartner) return;
    if (remainingDaily <= 0) {
      alert('오늘의 모의 대련 횟수를 모두 소진하였습니다. (내일 초기화)');
      return;
    }
    const foodAvailable = character.base?.resources?.food || 0;
    if (foodAvailable < 3) {
      alert('대련을 위한 기지 식량이 부족합니다. (최소 3개 필요)');
      return;
    }

    const pMaxHp = playerStats.maxHp || (character.stats?.hp || 100);
    const pMaxMp = playerStats.maxMp || (character.stats?.mp || 50);
    const oMaxHp = partnerStats?.maxHp || (selectedPartner.stats?.hp || 100);
    const oMaxMp = partnerStats?.maxMp || (selectedPartner.stats?.mp || 50);

    const initialCombat: SparringCombatState = {
      playerHp: pMaxHp,
      playerMaxHp: pMaxHp,
      playerMp: pMaxMp,
      playerMaxMp: pMaxMp,
      opponentHp: oMaxHp,
      opponentMaxHp: oMaxHp,
      opponentMp: oMaxMp,
      opponentMaxMp: oMaxMp,
      turn: 1,
      logs: [
        { text: `⚔️ [전술 모의 대련 개시] ${character.name} VS ${selectedPartner.name}`, type: 'system' },
        { text: `💡 플레이어 수련 전술: [${selectedPlayerRole}] | 상대 지정 역할: [${selectedPartnerRole}]`, type: 'system' }
      ],
      isFinished: false,
      winner: null,
      round: 1
    };

    if (quickMode) {
      resolveQuickCombat(initialCombat, selectedPartner);
    } else {
      if (onBattle) {
        const { updatedCharacter, enemy } = prepareSparringMatch(
          character,
          selectedPartner,
          selectedPlayerRole,
          selectedPartnerRole
        );
        onUpdateCharacter(updatedCharacter, `[모의 대련] ${selectedPartner.name}와의 실전 1:1 턴제 모의 대련에 돌입합니다.`);
        onClose();
        onBattle(enemy, 'sparring_arena', selectedPartner.id);
        return;
      }
      setCombatState(initialCombat);
      setActiveTab('battle');
    }
  };

  // Execute one turn of Interactive Combat
  const executeCombatTurn = (action: 'attack' | 'skill' | 'guard', chosenSkill?: Skill) => {
    if (!combatState || combatState.isFinished || !selectedPartner) return;

    const nextState = { ...combatState };
    const logs = [...nextState.logs];

    // --- Player Action Phase ---
    let playerDmg = 0;
    let isCrit = Math.random() * 100 < (playerDerived.critChance || 5);
    const critMult = isCrit ? (playerDerived.critDamage || 1.5) : 1.0;

    if (action === 'guard') {
      nextState.playerMp = Math.min(nextState.playerMaxMp, nextState.playerMp + 15);
      logs.push({ text: `🛡️ ${character.name}이(가) 전술적 수비 태세를 갖추며 마력을 15 회복합니다.`, type: 'player' });
    } else if (action === 'skill' && chosenSkill) {
      if (nextState.playerMp < chosenSkill.mpCost) {
        logs.push({ text: `⚠️ 마력이 부족하여 일반 공격으로 전환합니다!`, type: 'system' });
        const raw = Math.max(10, playerDerived.pAtk * 0.9 - (partnerDerived?.pDef || 10) * 0.5);
        playerDmg = Math.floor(raw * critMult * (0.9 + Math.random() * 0.2));
        nextState.opponentHp = Math.max(0, nextState.opponentHp - playerDmg);
        logs.push({ 
          text: `🗡️ ${character.name}의 일반 타격! ${selectedPartner.name}에게 ${playerDmg}의 피해를 입혔습니다.${isCrit ? ' 💥 [치명타!]' : ''}`, 
          type: isCrit ? 'crit' : 'player' 
        });
      } else {
        nextState.playerMp -= chosenSkill.mpCost;
        const skillRatio = chosenSkill.powerRatio || 1.5;
        const raw = Math.max(20, (chosenSkill.type === SkillType.MAGIC ? playerDerived.mAtk : playerDerived.pAtk) * skillRatio - (partnerDerived?.pDef || 10) * 0.4);
        playerDmg = Math.floor(raw * critMult * (0.95 + Math.random() * 0.15));
        nextState.opponentHp = Math.max(0, nextState.opponentHp - playerDmg);
        logs.push({ 
          text: `⚡ ${character.name}의 스킬 [${chosenSkill.name}] 발동! ${selectedPartner.name}에게 ${playerDmg}의 전술 피해!${isCrit ? ' 💥 [강타!]' : ''}`, 
          type: 'skill' 
        });
      }
    } else {
      // Basic Attack
      const raw = Math.max(10, playerDerived.pAtk - (partnerDerived?.pDef || 10) * 0.5);
      playerDmg = Math.floor(raw * critMult * (0.9 + Math.random() * 0.2));
      nextState.opponentHp = Math.max(0, nextState.opponentHp - playerDmg);
      logs.push({ 
        text: `🗡️ ${character.name}의 공격! ${selectedPartner.name}에게 ${playerDmg}의 피해를 입혔습니다.${isCrit ? ' 💥 [치명타!]' : ''}`, 
        type: isCrit ? 'crit' : 'player' 
      });
    }

    // Check Opponent Defeat
    if (nextState.opponentHp <= 0) {
      logs.push({ text: `🏆 ${selectedPartner.name}이(가) 무기를 거두며 패배를 인정했습니다!`, type: 'system' });
      nextState.isFinished = true;
      nextState.winner = 'player';
      nextState.logs = logs;
      setCombatState(nextState);
      finalizeSparringMatch('player', selectedPartner, logs);
      return;
    }

    // --- Opponent Counter-Action Phase ---
    const oppSkills = (selectedPartner.skills || []).filter(s => s.type !== SkillType.PASSIVE);
    const oppCanSkill = oppSkills.length > 0 && nextState.opponentMp >= 20 && Math.random() < 0.45;
    let oppDmg = 0;
    const oppCrit = Math.random() * 100 < (partnerDerived?.critChance || 5);
    const oppCritMult = oppCrit ? 1.5 : 1.0;
    const guardReduction = action === 'guard' ? 0.45 : 1.0;

    if (oppCanSkill) {
      const oppSkill = oppSkills[Math.floor(Math.random() * oppSkills.length)];
      nextState.opponentMp = Math.max(0, nextState.opponentMp - (oppSkill.mpCost || 20));
      const raw = Math.max(15, (partnerDerived?.pAtk || 20) * 1.3 - playerDerived.pDef * 0.4);
      oppDmg = Math.floor(raw * oppCritMult * guardReduction * (0.9 + Math.random() * 0.2));
      nextState.playerHp = Math.max(0, nextState.playerHp - oppDmg);
      logs.push({ 
        text: `🌀 ${selectedPartner.name}의 전술기 [${oppSkill.name}]! ${character.name}에게 ${oppDmg} 피해.${action === 'guard' ? ' (방어로 피해 경감)' : ''}`, 
        type: 'opponent' 
      });
    } else {
      const raw = Math.max(10, (partnerDerived?.pAtk || 20) - playerDerived.pDef * 0.5);
      oppDmg = Math.floor(raw * oppCritMult * guardReduction * (0.9 + Math.random() * 0.2));
      nextState.playerHp = Math.max(0, nextState.playerHp - oppDmg);
      logs.push({ 
        text: `⚔️ ${selectedPartner.name}의 반격! ${character.name}에게 ${oppDmg} 피해.${oppCrit ? ' 💥 [치명타!]' : ''}`, 
        type: 'opponent' 
      });
    }

    // Check Player Defeat
    if (nextState.playerHp <= 0) {
      logs.push({ text: `🏳️ 모의 대련에서 ${selectedPartner.name}의 한 수에 제압당했습니다.`, type: 'system' });
      nextState.isFinished = true;
      nextState.winner = 'opponent';
      nextState.logs = logs;
      setCombatState(nextState);
      finalizeSparringMatch('opponent', selectedPartner, logs);
      return;
    }

    // Advance turn
    nextState.turn += 1;
    nextState.logs = logs;
    setCombatState(nextState);
  };

  // Quick Combat Resolution (Instant Simulation)
  const resolveQuickCombat = (initial: SparringCombatState, partner: Companion) => {
    let state = { ...initial };
    let logs = [...state.logs];

    const pAtk = playerDerived.pAtk;
    const pDef = playerDerived.pDef;
    const oAtk = partnerDerived?.pAtk || 30;
    const oDef = partnerDerived?.pDef || 20;

    for (let round = 1; round <= 10; round++) {
      // Player turn
      const pDamage = Math.floor(Math.max(15, pAtk - oDef * 0.4) * (0.9 + Math.random() * 0.3));
      state.opponentHp = Math.max(0, state.opponentHp - pDamage);
      logs.push({ text: `[${round}합] ${character.name}의 공격 ➔ ${partner.name}에게 ${pDamage} 피해 (남은 체력: ${state.opponentHp})`, type: 'player' });

      if (state.opponentHp <= 0) {
        state.winner = 'player';
        state.isFinished = true;
        break;
      }

      // Partner turn
      const oDamage = Math.floor(Math.max(12, oAtk - pDef * 0.4) * (0.9 + Math.random() * 0.3));
      state.playerHp = Math.max(0, state.playerHp - oDamage);
      logs.push({ text: `[${round}합] ${partner.name}의 반격 ➔ ${character.name}에게 ${oDamage} 피해 (남은 체력: ${state.playerHp})`, type: 'opponent' });

      if (state.playerHp <= 0) {
        state.winner = 'opponent';
        state.isFinished = true;
        break;
      }
    }

    if (!state.winner) {
      // Tie breaker based on remaining HP percentage
      const pRatio = state.playerHp / state.playerMaxHp;
      const oRatio = state.opponentHp / state.opponentMaxHp;
      state.winner = pRatio >= oRatio ? 'player' : 'opponent';
      logs.push({ text: `⏱️ 10합의 치열한 공방 끝에 판정으로 [${state.winner === 'player' ? character.name : partner.name}]의 우세승!`, type: 'system' });
    }

    state.logs = logs;
    setCombatState(state);
    finalizeSparringMatch(state.winner, partner, logs);
  };

  // Finalize Match Rewards and Character State Update
  const finalizeSparringMatch = (winner: 'player' | 'opponent', partner: Companion, combatLogs: any[]) => {
    const isPlayerWin = winner === 'player';

    // Reward multipliers
    const facilityMultiplier = 1 + (facilityLevel - 1) * 0.2; // Lv.1 = 1.0, Lv.5 = 1.8
    const supervisorMult = 1 + (instructorBonus / 100); // 1.0 ~ 1.5

    // Tactical Proficiency Gain (전술 숙련도 경험치)
    const baseRoleGain = isPlayerWin ? 4 : 2;
    const calcPlayerGain = Math.round(baseRoleGain * facilityMultiplier * supervisorMult);
    const isPlayerSecondary = Object.values(SecondaryBattleRole).includes(selectedPlayerRole as any);
    const playerRoleGain = isPlayerSecondary ? Math.max(1, Math.floor(calcPlayerGain / 3)) : calcPlayerGain;

    const partnerRole = selectedPartnerRole || (partner.battleRole as BattleRole) || BattleRole.DEALER;
    const isPartnerSecondary = Object.values(SecondaryBattleRole).includes(partnerRole as any);
    const calcPartnerGain = Math.round((isPlayerWin ? 3 : 4) * facilityMultiplier * supervisorMult);
    const partnerRoleGain = isPartnerSecondary ? Math.max(1, Math.floor(calcPartnerGain / 3)) : calcPartnerGain;

    // Affection Gain (호감도 획득)
    const affectionGain = isPlayerWin ? (3 + Math.floor(facilityLevel / 2)) : 2;

    // Reduced EXP Gain (전투 경험치: 기존 대비 1/5 이하로 대폭 하향 조정)
    const expGain = Math.max(1, Math.floor((character.level * 2 + 15) * facilityMultiplier));

    // Quote
    const quote = getSparringQuote(partner, isPlayerWin);

    // Character State Cloning
    const newChar: Character = JSON.parse(JSON.stringify(character));

    // Deduct food & increment daily counter
    if (newChar.base?.resources) {
      newChar.base.resources.food = Math.max(0, (newChar.base.resources.food || 0) - 3);
    }
    if (!newChar.base) (newChar as any).base = {};
    if (!newChar.base.dailyCounts) newChar.base.dailyCounts = {};
    newChar.base.dailyCounts['sparring_arena'] = (newChar.base.dailyCounts['sparring_arena'] || 0) + 1;

    // Update Player Role Proficiency
    if (isPlayerSecondary) {
      if (!newChar.secondaryRoleProficiency) newChar.secondaryRoleProficiency = {};
      const currPlayerProf = newChar.secondaryRoleProficiency[selectedPlayerRole as SecondaryBattleRole] || 0;
      newChar.secondaryRoleProficiency[selectedPlayerRole as SecondaryBattleRole] = Math.min(100, currPlayerProf + playerRoleGain);
    } else {
      if (!newChar.roleProficiency) newChar.roleProficiency = {};
      const currPlayerProf = newChar.roleProficiency[selectedPlayerRole as BattleRole] || 0;
      newChar.roleProficiency[selectedPlayerRole as BattleRole] = Math.min(100, currPlayerProf + playerRoleGain);
      if (!newChar.roleInactivityDays) newChar.roleInactivityDays = {};
      newChar.roleInactivityDays[selectedPlayerRole as BattleRole] = 0;
    }

    // Update Player EXP
    newChar.currentExp = (newChar.currentExp || 0) + expGain;

    // Update Companion Affection & Role Proficiency
    const updateComp = (c: Companion) => {
      c.affection = Math.min(100, (c.affection || 0) + affectionGain);
      if (isPartnerSecondary) {
        if (!c.secondaryRoleProficiency) c.secondaryRoleProficiency = {};
        const curr = c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] || 0;
        c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] = Math.min(100, curr + partnerRoleGain);
      } else {
        if (!c.roleProficiency) c.roleProficiency = {};
        const curr = c.roleProficiency[partnerRole as BattleRole] || 0;
        c.roleProficiency[partnerRole as BattleRole] = Math.min(100, curr + partnerRoleGain);
        if (!c.roleInactivityDays) c.roleInactivityDays = {};
        c.roleInactivityDays[partnerRole as BattleRole] = 0;
      }
      c.currentExp = (c.currentExp || 0) + Math.floor(expGain * 0.8);
    };

    let updatedCompIndex = newChar.companions.findIndex(c => c.id === partner.id);
    if (updatedCompIndex !== -1) {
      updateComp(newChar.companions[updatedCompIndex]);
    } else if (newChar.inactiveCompanions) {
      const inCompIdx = newChar.inactiveCompanions.findIndex(c => c.id === partner.id);
      if (inCompIdx !== -1) {
        updateComp(newChar.inactiveCompanions[inCompIdx]);
      }
    }

    setLastResult({
      winner,
      opponent: partner,
      playerRoleGain,
      partnerRoleGain,
      partnerRole,
      affectionGain,
      expGain,
      partnerQuote: quote,
      timeMinutes: Math.max(1, Math.floor((1 / Math.max(1, maxDailySparrings)) * 60))
    });

    const timeMinutes = Math.max(1, Math.floor((1 / Math.max(1, maxDailySparrings)) * 60));
    const timeRes = advanceGameTime(newChar, timeMinutes, { activityName: "모의 대련" });
    const finalChar = timeRes.updatedCharacter;

    const resultMsg = `[전술 모의 대련] ${partner.name}과의 실전 대련 완료 (${isPlayerWin ? '승리' : '패배'})! (시간 +${timeMinutes}분) [${selectedPlayerRole}] 숙련도 +${playerRoleGain}, [${partnerRole}] 숙련도 +${partnerRoleGain}, 호감도 +${affectionGain}`;
    onUpdateCharacter(finalChar, resultMsg, timeRes.dailyReport);
    setActiveTab('result');
  };

  // 모의 대련장 연속 훈련 처리 핸들러 (사용자 지정 횟수 지원)
  const handleBatchSparring = (countToTrain?: number) => {
    if (!selectedPartner) return;
    if (remainingDaily <= 0) {
      alert('오늘의 모의 대련 횟수를 모두 소진하였습니다. (내일 초기화)');
      return;
    }
    const foodAvailable = character.base?.resources?.food || 0;
    const maxPossible = Math.min(remainingDaily, Math.floor(foodAvailable / 3));
    if (maxPossible <= 0) {
      alert('대련을 위한 기지 식량이 부족합니다. (대련 1회당 기지 식량 3개 필요)');
      return;
    }

    const targetCount = countToTrain !== undefined ? countToTrain : customTrainCount;
    const actualCount = Math.max(1, Math.min(targetCount, maxPossible));

    const facilityMultiplier = 1 + (facilityLevel - 1) * 0.2;
    const supervisorMult = 1 + (instructorBonus / 100);

    let wins = 0;
    let losses = 0;
    let totalPlayerRoleGain = 0;
    let totalPartnerRoleGain = 0;
    let totalAffectionGain = 0;
    let totalExpGain = 0;

    const pAtk = playerDerived.pAtk;
    const pDef = playerDerived.pDef;
    const oAtk = partnerDerived?.pAtk || 30;
    const oDef = partnerDerived?.pDef || 20;

    const pMaxHp = playerStats.maxHp || (character.stats?.hp || 100);
    const oMaxHp = partnerStats?.maxHp || (selectedPartner.stats?.hp || 100);

    for (let i = 0; i < actualCount; i++) {
      let pHp = pMaxHp;
      let oHp = oMaxHp;
      let isWin = false;

      for (let round = 1; round <= 10; round++) {
        const pDamage = Math.floor(Math.max(15, pAtk - oDef * 0.4) * (0.9 + Math.random() * 0.3));
        oHp = Math.max(0, oHp - pDamage);
        if (oHp <= 0) {
          isWin = true;
          break;
        }
        const oDamage = Math.floor(Math.max(12, oAtk - pDef * 0.4) * (0.9 + Math.random() * 0.3));
        pHp = Math.max(0, pHp - oDamage);
        if (pHp <= 0) {
          isWin = false;
          break;
        }
      }

      if (pHp > 0 && oHp > 0) {
        isWin = (pHp / pMaxHp) >= (oHp / oMaxHp);
      }

      if (isWin) {
        wins++;
      } else {
        losses++;
      }

      const baseRoleGain = isWin ? 4 : 2;
      const rawPRoleGain = Math.round(baseRoleGain * facilityMultiplier * supervisorMult);
      const rawORoleGain = Math.round((isWin ? 3 : 4) * facilityMultiplier * supervisorMult);

      const isPlayerSec = Object.values(SecondaryBattleRole).includes(selectedPlayerRole as any);
      const partnerRole = selectedPartnerRole || (selectedPartner.battleRole as BattleRole) || BattleRole.DEALER;
      const isPartnerSec = Object.values(SecondaryBattleRole).includes(partnerRole as any);

      // 연속 대련 시 2차 세부역할은 1/5 보정(20% 수준)으로 난이도 상승
      const pRoleGain = isPlayerSec ? Math.max(1, Math.floor(rawPRoleGain / 5)) : rawPRoleGain;
      const oRoleGain = isPartnerSec ? Math.max(1, Math.floor(rawORoleGain / 5)) : rawORoleGain;

      const affGain = isWin ? (3 + Math.floor(facilityLevel / 2)) : 2;
      const eGain = Math.max(1, Math.floor((character.level * 2 + 15) * facilityMultiplier));

      totalPlayerRoleGain += pRoleGain;
      totalPartnerRoleGain += oRoleGain;
      totalAffectionGain += affGain;
      totalExpGain += eGain;
    }

    const foodSpent = actualCount * 3;
    const newChar: Character = JSON.parse(JSON.stringify(character));

    if (newChar.base?.resources) {
      newChar.base.resources.food = Math.max(0, (newChar.base.resources.food || 0) - foodSpent);
    }
    if (!newChar.base) (newChar as any).base = {};
    if (!newChar.base.dailyCounts) newChar.base.dailyCounts = {};
    newChar.base.dailyCounts['sparring_arena'] = (newChar.base.dailyCounts['sparring_arena'] || 0) + actualCount;

    const isPlayerSecondary = Object.values(SecondaryBattleRole).includes(selectedPlayerRole as any);
    if (isPlayerSecondary) {
      if (!newChar.secondaryRoleProficiency) newChar.secondaryRoleProficiency = {};
      const currPlayerProf = newChar.secondaryRoleProficiency[selectedPlayerRole as SecondaryBattleRole] || 0;
      newChar.secondaryRoleProficiency[selectedPlayerRole as SecondaryBattleRole] = Math.min(100, currPlayerProf + totalPlayerRoleGain);
    } else {
      if (!newChar.roleProficiency) newChar.roleProficiency = {};
      const currPlayerProf = newChar.roleProficiency[selectedPlayerRole as BattleRole] || 0;
      newChar.roleProficiency[selectedPlayerRole as BattleRole] = Math.min(100, currPlayerProf + totalPlayerRoleGain);
      if (!newChar.roleInactivityDays) newChar.roleInactivityDays = {};
      newChar.roleInactivityDays[selectedPlayerRole as BattleRole] = 0;
    }

    newChar.currentExp = (newChar.currentExp || 0) + totalExpGain;

    const partnerRole = selectedPartnerRole || (selectedPartner.battleRole as BattleRole) || BattleRole.DEALER;
    const isPartnerSecondary = Object.values(SecondaryBattleRole).includes(partnerRole as any);
    const updateComp = (c: Companion) => {
      c.affection = Math.min(100, (c.affection || 0) + totalAffectionGain);
      if (isPartnerSecondary) {
        if (!c.secondaryRoleProficiency) c.secondaryRoleProficiency = {};
        const curr = c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] || 0;
        c.secondaryRoleProficiency[partnerRole as SecondaryBattleRole] = Math.min(100, curr + totalPartnerRoleGain);
      } else {
        if (!c.roleProficiency) c.roleProficiency = {};
        const curr = c.roleProficiency[partnerRole as BattleRole] || 0;
        c.roleProficiency[partnerRole as BattleRole] = Math.min(100, curr + totalPartnerRoleGain);
        if (!c.roleInactivityDays) c.roleInactivityDays = {};
        c.roleInactivityDays[partnerRole as BattleRole] = 0;
      }
      c.currentExp = (c.currentExp || 0) + Math.floor(totalExpGain * 0.8);
    };

    let updatedCompIndex = newChar.companions.findIndex(c => c.id === selectedPartner.id);
    if (updatedCompIndex !== -1) {
      updateComp(newChar.companions[updatedCompIndex]);
    } else if (newChar.inactiveCompanions) {
      const inCompIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedPartner.id);
      if (inCompIdx !== -1) {
        updateComp(newChar.inactiveCompanions[inCompIdx]);
      }
    }

    setBatchResult({
      totalRounds: actualCount,
      wins,
      losses,
      opponent: selectedPartner,
      playerRoleGain: totalPlayerRoleGain,
      partnerRoleGain: totalPartnerRoleGain,
      partnerRole,
      affectionGain: totalAffectionGain,
      expGain: totalExpGain,
      foodSpent,
      timeMinutes: Math.max(1, Math.floor((actualCount / Math.max(1, maxDailySparrings)) * 60))
    });

    const timeMinutes = Math.max(1, Math.floor((actualCount / Math.max(1, maxDailySparrings)) * 60));
    const timeRes = advanceGameTime(newChar, timeMinutes, { activityName: "모의 대련 연속 훈련" });
    const finalChar = timeRes.updatedCharacter;

    const resultMsg = `[모의 대련 훈련] ${selectedPartner.name}과 총 ${actualCount}회 훈련 완료 (${wins}승 ${losses}패)! (시간 +${timeMinutes}분) [${selectedPlayerRole}] 숙련도 +${totalPlayerRoleGain}, [${partnerRole}] 숙련도 +${totalPartnerRoleGain}, 호감도 +${totalAffectionGain}, 경험치 +${totalExpGain}`;
    onUpdateCharacter(finalChar, resultMsg, timeRes.dailyReport);
    setActiveTab('batch_result');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 font-sans animate-in fade-in">
      <div 
        id="sparring-arena-container"
        className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950">
              <Swords size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-100 flex items-center gap-1.5">
                  전술 모의 대련장
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-300 font-mono font-bold">
                  Lv.{facilityLevel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                동료들과의 1:1 실전 대련을 통해 전술 숙련도를 연마하고 유대감을 쌓습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Daily Usage Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono">
              <Dumbbell size={14} className="text-amber-400" />
              <span className="text-slate-400">일일 대련:</span>
              <span className={`font-bold ${remainingDaily > 0 ? 'text-amber-300' : 'text-red-400'}`}>
                {remainingDaily}/{maxDailySparrings}
              </span>
              {arenaCount > 1 && (
                <span className="text-[10px] text-amber-400 bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded ml-1 font-bold">
                  대련장 {arenaCount}개
                </span>
              )}
            </div>

            {selectedPartner && remainingDaily > 1 && activeTab === 'select' && (
              <button
                onClick={() => handleBatchSparring()}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-950/40 active:scale-95 animate-pulse"
                title="설정된 횟수만큼 현재 동료와 연속 모의 대련을 진행합니다."
              >
                <Sparkles size={13} />
                <span>연속 훈련</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Facility Info Bar: Instructor & Bonuses */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <UserCheck size={15} className="text-amber-400" />
              <span className="text-slate-400">수석 교관:</span>
              <span className="font-bold text-amber-200">
                {instructor ? `${instructor.name} (Lv.${instructor.level})` : '미배치 (기지 인원배치)'}
              </span>
            </div>

            {instructorBonus > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/40 text-amber-300 font-semibold text-[10px]">
                숙련도 획득 +{instructorBonus}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>보유 대련장: <strong className="text-amber-300">{arenaCount}개</strong></span>
            <span className="hidden sm:inline">•</span>
            <span>소모: 식량 3개</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-emerald-400">승리 시 호감도 +3~5</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">
          {/* TAB 1: Select Partner & Setup */}
          {activeTab === 'select' && (
            <div className="space-y-4">
              {/* Top Selector: Player Training Role */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Target size={15} className="text-amber-400" />
                    나의 집중 수련 전술 역할 선택
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setPlayerRoleCategory('primary')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${playerRoleCategory === 'primary' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      1차 역할
                    </button>
                    <button
                      onClick={() => setPlayerRoleCategory('secondary')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${playerRoleCategory === 'secondary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      2차 세부역할 (1/3 보정)
                    </button>
                  </div>
                </div>

                {playerRoleCategory === 'primary' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: BattleRole.DEALER, icon: Swords, color: 'text-red-400', border: 'border-red-500/50 bg-red-950/30' },
                      { role: BattleRole.TANKER, icon: Shield, color: 'text-blue-400', border: 'border-blue-500/50 bg-blue-950/30' },
                      { role: BattleRole.SUPPORTER, icon: Heart, color: 'text-emerald-400', border: 'border-emerald-500/50 bg-emerald-950/30' }
                    ].map(r => {
                      const isSelected = selectedPlayerRole === r.role;
                      const Icon = r.icon;
                      const currentProf = character.roleProficiency?.[r.role] || 0;
                      return (
                        <button
                          key={r.role}
                          onClick={() => setSelectedPlayerRole(r.role)}
                          className={`min-h-[44px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            isSelected 
                              ? `${r.border} ring-2 ring-amber-400 text-white` 
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Icon size={15} className={r.color} />
                            <span>{r.role}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            숙련도 {currentProf}/100
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {Object.values(SecondaryBattleRole).filter(sr => sr !== SecondaryBattleRole.NONE && sr !== SecondaryBattleRole.ALLROUNDER).map(secRole => {
                      const canTrain = canTrainSecondaryRole(character, secRole);
                      const isSelected = selectedPlayerRole === secRole;
                      const currentProf = character.secondaryRoleProficiency?.[secRole] || 0;
                      return (
                        <button
                          key={secRole}
                          disabled={!canTrain}
                          onClick={() => setSelectedPlayerRole(secRole)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all text-center ${
                            isSelected
                              ? 'bg-indigo-950/80 border-indigo-400 text-white ring-2 ring-indigo-400'
                              : canTrain
                              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-[11px] font-bold">{secRole}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {canTrain ? `숙련도 ${currentProf}/100` : '1차 미달성'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Partner List Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users size={15} className="text-amber-400" />
                    대련 상대 동료 선택 ({eligiblePartners.length}명)
                  </span>

                  {/* Filter Tabs */}
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    {(['all', 'party', 'base'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setPartnerFilter(f)}
                        className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                          partnerFilter === f ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f === 'all' ? '전체' : f === 'party' ? '파티 동행' : '기지 거주'}
                      </button>
                    ))}
                  </div>
                </div>

                {eligiblePartners.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Users size={36} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">대련 가능한 동료가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[38vh] overflow-y-auto custom-scrollbar pr-1">
                    {eligiblePartners.map(partner => {
                      const isSelected = (selectedPartner?.id === partner.id);
                      const partnerRole = partner.battleRole || BattleRole.DEALER;
                      const partnerProf = partner.roleProficiency?.[partnerRole] || 0;
                      const aff = partner.affection || 0;

                      return (
                        <div
                          key={partner.id}
                          onClick={() => setSelectedPartnerId(partner.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50' 
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar or Initial */}
                            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-300 text-sm overflow-hidden shrink-0">
                              {partner.visualUrl ? (
                                <img src={partner.visualUrl} alt={partner.name} className="w-full h-full object-cover" />
                              ) : (
                                partner.name.charAt(0)
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-100 text-xs truncate">{partner.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono">
                                  Lv.{partner.level}
                                </span>
                                {partner.combatStyle && (
                                  <span className="text-[9px] px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                                    {partner.combatStyle}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 text-pink-400">
                                  <Heart size={11} className="fill-pink-500/40" />
                                  호감도 {aff}
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-300 font-mono">
                                  {partnerRole} ({partnerProf}/100)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isSelected ? (
                              <CheckCircle size={20} className="text-amber-400" />
                            ) : (
                              <ChevronRight size={18} className="text-slate-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Partner Battle Role Selection Section */}
              {selectedPartner && (
                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Shield size={15} className="text-amber-400" />
                      대련 동료 [{selectedPartner.name}] 전투 역할 지정
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setPartnerRoleCategory('primary')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${partnerRoleCategory === 'primary' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        1차 역할
                      </button>
                      <button
                        onClick={() => setPartnerRoleCategory('secondary')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${partnerRoleCategory === 'secondary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        2차 세부역할 (1/3 보정)
                      </button>
                    </div>
                  </div>

                  {partnerRoleCategory === 'primary' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { role: BattleRole.DEALER, icon: Swords, color: 'text-red-400', border: 'border-red-500/50 bg-red-950/30' },
                        { role: BattleRole.TANKER, icon: Shield, color: 'text-blue-400', border: 'border-blue-500/50 bg-blue-950/30' },
                        { role: BattleRole.SUPPORTER, icon: Heart, color: 'text-emerald-400', border: 'border-emerald-500/50 bg-emerald-950/30' }
                      ].map(r => {
                        const isSelected = selectedPartnerRole === r.role;
                        const Icon = r.icon;
                        const currentProf = selectedPartner.roleProficiency?.[r.role] || 0;
                        return (
                          <button
                            key={r.role}
                            onClick={() => setSelectedPartnerRole(r.role)}
                            className={`min-h-[44px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              isSelected 
                                ? `${r.border} ring-2 ring-amber-400 text-white` 
                                : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Icon size={15} className={r.color} />
                              <span>{r.role}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              숙련도 {currentProf}/100
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {Object.values(SecondaryBattleRole).filter(sr => sr !== SecondaryBattleRole.NONE && sr !== SecondaryBattleRole.ALLROUNDER).map(secRole => {
                        const canTrain = canTrainSecondaryRole(selectedPartner, secRole);
                        const isSelected = selectedPartnerRole === secRole;
                        const currentProf = selectedPartner.secondaryRoleProficiency?.[secRole] || 0;
                        return (
                          <button
                            key={secRole}
                            disabled={!canTrain}
                            onClick={() => setSelectedPartnerRole(secRole)}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all text-center ${
                              isSelected
                                ? 'bg-indigo-950/80 border-indigo-400 text-white ring-2 ring-indigo-400'
                                : canTrain
                                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[11px] font-bold">{secRole}</span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {canTrain ? `숙련도 ${currentProf}/100` : '1차 미달성'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Match Buttons */}
              {selectedPartner && (
                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => handleStartCombat(false)}
                      disabled={remainingDaily <= 0}
                      className={`flex-1 min-h-[46px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 ${
                        remainingDaily > 0 
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-950' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Play size={16} />
                      <span>실전 1:1 턴제 모의 대련 (수동 조작)</span>
                    </button>

                    <button
                      onClick={() => handleStartCombat(true)}
                      disabled={remainingDaily <= 0}
                      className={`min-h-[46px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-amber-500/40 bg-slate-900 hover:bg-amber-950/40 text-amber-300 active:scale-98 ${
                        remainingDaily <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <FastForward size={16} />
                      <span>전술 쾌속 대련 (1회 즉시 완료)</span>
                    </button>
                  </div>

                  {/* 훈련 횟수 설정 및 연속 훈련 컨트롤러 */}
                  {(() => {
                    const foodAvailable = character.base?.resources?.food || 0;
                    const maxPossible = Math.min(remainingDaily, Math.floor(foodAvailable / 3));
                    const effectiveCount = Math.max(1, Math.min(customTrainCount, Math.max(1, maxPossible)));
                    const foodNeeded = effectiveCount * 3;

                    return (
                      <div className="flex flex-col gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                            <Sparkles size={15} className="text-amber-400" />
                            <span>연속 훈련 횟수 설정</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              (진행 가능: 최대 <strong className="text-amber-300 font-bold">{maxPossible}회</strong> / 보유 식량 {foodAvailable}개)
                            </span>
                          </div>

                          {/* 증감 및 프리셋 컨트롤러 */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCustomTrainCount(prev => Math.max(1, prev - 1))}
                              disabled={effectiveCount <= 1 || maxPossible <= 0}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center border border-slate-700"
                            >
                              -
                            </button>

                            <div className="px-2.5 py-1 bg-slate-950 border border-amber-500/40 rounded-lg min-w-[50px] text-center">
                              <span className="font-mono font-black text-amber-300 text-xs">
                                {maxPossible > 0 ? `${effectiveCount}회` : '0회'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setCustomTrainCount(prev => Math.min(maxPossible, prev + 1))}
                              disabled={effectiveCount >= maxPossible || maxPossible <= 0}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center border border-slate-700"
                            >
                              +
                            </button>

                            <button
                              type="button"
                              onClick={() => setCustomTrainCount(1)}
                              disabled={maxPossible < 1}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                effectiveCount === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              1회
                            </button>

                            {maxPossible >= 3 && (
                              <button
                                type="button"
                                onClick={() => setCustomTrainCount(3)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                  effectiveCount === 3 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                3회
                              </button>
                            )}

                            {maxPossible >= 5 && (
                              <button
                                type="button"
                                onClick={() => setCustomTrainCount(5)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                  effectiveCount === 5 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                5회
                              </button>
                            )}

                            {maxPossible >= 10 && (
                              <button
                                type="button"
                                onClick={() => setCustomTrainCount(10)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                  effectiveCount === 10 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                10회
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setCustomTrainCount(maxPossible)}
                              disabled={maxPossible <= 0}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                effectiveCount === maxPossible && maxPossible > 0 ? 'bg-purple-900/60 text-purple-200 border-purple-500/60' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              최대
                            </button>
                          </div>
                        </div>

                        {/* 연속 훈련 시작 버튼 */}
                        <button
                          onClick={() => handleBatchSparring(effectiveCount)}
                          disabled={maxPossible <= 0 || effectiveCount <= 0}
                          className={`w-full min-h-[46px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 ${
                            maxPossible > 0
                              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:via-indigo-500 hover:to-amber-500 text-white shadow-purple-950/50'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                          title="설정한 횟수만큼 현재 동료와 연속 모의 대련을 진행합니다."
                        >
                          <Sparkles size={16} />
                          <span>
                            {maxPossible > 0 
                              ? `모의 대련 ${effectiveCount}회 연속 훈련 시작 (식량 ${foodNeeded}개 소모)` 
                              : '모의 대련 진행 불가 (잔여 횟수 또는 식량 부족)'}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Interactive Sparring Combat Screen */}
          {activeTab === 'battle' && combatState && selectedPartner && (
            <div className="space-y-4">
              {/* Battle Arena Stage Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                {/* Player Status Card */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-cyan-300 flex items-center gap-1.5">
                      <User size={15} />
                      {character.name} (플레이어)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono">
                      {selectedPlayerRole}
                    </span>
                  </div>

                  {/* HP Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">체력 (HP)</span>
                      <span className="font-mono text-cyan-300">{combatState.playerHp} / {combatState.playerMaxHp}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (combatState.playerHp / combatState.playerMaxHp) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* MP Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">마력 (MP)</span>
                      <span className="font-mono text-purple-300">{combatState.playerMp} / {combatState.playerMaxMp}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (combatState.playerMp / combatState.playerMaxMp) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Opponent Status Card */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-rose-300 flex items-center gap-1.5">
                      <Swords size={15} />
                      {selectedPartner.name} (대련 상대)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 font-mono">
                      {selectedPartnerRole}
                    </span>
                  </div>

                  {/* HP Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">체력 (HP)</span>
                      <span className="font-mono text-rose-300">{combatState.opponentHp} / {combatState.opponentMaxHp}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (combatState.opponentHp / combatState.opponentMaxHp) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* MP Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">마력 (MP)</span>
                      <span className="font-mono text-purple-300">{combatState.opponentMp} / {combatState.opponentMaxMp}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (combatState.opponentMp / combatState.opponentMaxMp) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Combat Log Viewer */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 h-44 overflow-y-auto custom-scrollbar space-y-1.5 text-xs font-mono">
                {combatState.logs.map((log, idx) => (
                  <div 
                    key={idx}
                    className={`leading-relaxed ${
                      log.type === 'player' ? 'text-cyan-300' :
                      log.type === 'opponent' ? 'text-rose-300' :
                      log.type === 'skill' ? 'text-amber-300 font-bold' :
                      log.type === 'crit' ? 'text-yellow-400 font-black' :
                      'text-slate-400'
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
              </div>

              {/* Combat Action Controls */}
              {!combatState.isFinished && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => executeCombatTurn('attack')}
                      className="min-h-[44px] py-2.5 px-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
                    >
                      <Swords size={15} />
                      <span>일반 공격</span>
                    </button>

                    <button
                      onClick={() => executeCombatTurn('guard')}
                      className="min-h-[44px] py-2.5 px-3 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
                    >
                      <Shield size={15} />
                      <span>수비 & 마력회복</span>
                    </button>

                    {/* Available Skills Button dropdown or quick action */}
                    {(character.skills || []).filter(s => s.type !== SkillType.PASSIVE).slice(0, 2).map((sk, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => executeCombatTurn('skill', sk)}
                        className="min-h-[44px] py-2.5 px-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow truncate"
                        title={sk.description}
                      >
                        <Zap size={14} className="text-yellow-300 shrink-0" />
                        <span className="truncate">{sk.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Auto Fast-forward remaining combat */}
                  <button
                    onClick={() => resolveQuickCombat(combatState, selectedPartner)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FastForward size={14} />
                    <span>남은 대련 자동 진행 및 즉시 종료</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Results & Rewards Summary Screen */}
          {activeTab === 'result' && lastResult && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-950">
                <Trophy size={36} className="animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-amber-200">
                  {lastResult.winner === 'player' ? '🎉 모의 대련 승리!' : '⚔️ 뜻깊은 모의 대련 완료'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  동료 {lastResult.opponent.name}과의 대련을 통해 전술적 통찰과 상호 유대를 다졌습니다.
                </p>
              </div>

              {/* Dialogue Quote Bubble */}
              <div className="max-w-lg mx-auto bg-slate-900 p-4 rounded-xl border border-amber-500/30 text-xs text-amber-100 italic leading-relaxed shadow-inner">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1 justify-center not-italic">
                  <MessageSquare size={14} />
                  <span>{lastResult.opponent.name}의 대련 소감</span>
                </div>
                {lastResult.partnerQuote}
              </div>

              {/* Elapsed Time Badge */}
              <div className="my-4 text-center">
                <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-300">
                  소모 시간: {lastResult.timeMinutes && lastResult.timeMinutes >= 60 ? `+${Math.floor(lastResult.timeMinutes / 60)}시간${lastResult.timeMinutes % 60 > 0 ? ` ${lastResult.timeMinutes % 60}분` : ''}` : `+${lastResult.timeMinutes}분`}
                </span>
              </div>

              {/* Rewards Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto text-left">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">내 전술 숙련도</span>
                  <span className="text-sm font-bold text-amber-400">+{lastResult.playerRoleGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">[{selectedPlayerRole}]</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">동료 전술 숙련도</span>
                  <span className="text-sm font-bold text-cyan-400">+{lastResult.partnerRoleGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">[{lastResult.partnerRole || lastResult.opponent.battleRole || '딜러'}]</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">동료 호감도</span>
                  <span className="text-sm font-bold text-pink-400">+{lastResult.affectionGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">유대감 상승</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">전투 경험치</span>
                  <span className="text-sm font-bold text-emerald-400">+{lastResult.expGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">경험치</span>
                </div>
              </div>

              {/* Bottom Return Buttons */}
              <div className="pt-3 max-w-sm mx-auto flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('select');
                    setCombatState(null);
                  }}
                  className="flex-1 min-h-[44px] py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw size={15} />
                  <span>대련 상대 다시 선택</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 min-h-[44px] py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                >
                  <CheckCircle size={15} />
                  <span>대련장 나가기</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Batch Training Summary Screen */}
          {activeTab === 'batch_result' && batchResult && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950">
                <Sparkles size={36} className="animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-indigo-200">
                  모의 대련 연속 훈련 완료!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  동료 {batchResult.opponent.name}과 총 <strong className="text-amber-300 font-bold">{batchResult.totalRounds}회</strong> 연속 대련 훈련을 성공적으로 마쳤습니다.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-purple-800/60 text-xs">
                  <span className="text-emerald-400 font-bold">{batchResult.wins}승</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-rose-400 font-bold">{batchResult.losses}패</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300 font-bold">식량 {batchResult.foodSpent}개 소모</span>
                </div>
              </div>

              {/* Elapsed Time Badge */}
              <div className="my-4 text-center">
                <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-300">
                  소모 시간: {batchResult.timeMinutes && batchResult.timeMinutes >= 60 ? `+${Math.floor(batchResult.timeMinutes / 60)}시간${batchResult.timeMinutes % 60 > 0 ? ` ${batchResult.timeMinutes % 60}분` : ''}` : `+${batchResult.timeMinutes}분`}
                </span>
              </div>

              {/* Rewards Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto text-left">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">내 전술 숙련도 누적</span>
                  <span className="text-base font-black text-amber-400">+{batchResult.playerRoleGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">[{selectedPlayerRole}]</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">동료 전술 숙련도 누적</span>
                  <span className="text-base font-black text-cyan-400">+{batchResult.partnerRoleGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">[{batchResult.partnerRole}]</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">동료 호감도 누적</span>
                  <span className="text-base font-black text-pink-400">+{batchResult.affectionGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">유대감 상승</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block">전투 경험치 누적</span>
                  <span className="text-base font-black text-emerald-400">+{batchResult.expGain}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">경험치</span>
                </div>
              </div>

              {/* Bottom Return Buttons */}
              <div className="pt-3 max-w-sm mx-auto flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('select');
                    setCombatState(null);
                  }}
                  className="flex-1 min-h-[44px] py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw size={15} />
                  <span>대련 상대 다시 선택</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 min-h-[44px] py-3 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                >
                  <CheckCircle size={15} />
                  <span>대련장 나가기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SparringArenaModal;
